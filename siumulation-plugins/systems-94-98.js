/* =====================================================================
   Custom Systems 1994–98 — job folder with a selector, plus the CTV RS422 relay link
   Plugin for the WBS Device Simulator (../siumulation.html)

   Folder: #CUSTOM #SYSTEMS/#Custom Systems 94-98  (read only)
   Main simulator = the most complete job in the folder, the CTV synchronous RS422
   contact-closure link (2004|37 PIC pair + 2006|39 ARX422 board). Every other job gets
   a summary card built from the recovered drawing text (DWG/PCB/CDR sidecars).

   Sources used (all inside the folder):
   - ctv422tx/txv100.asm  (= CTV RS422/ctv422tx/txv100.asm = ctv422tx_2/txv100.asm, identical)
       init, main, input, delay500, transmit/transmit0/txdataff, output_led, delay_setup,
       pbdepress1/2, set_250ms…set_0ms, delaysecondary, debounce, debounce_rel
   - ctv422tx/TXV100.$$$   earlier save of the transmitter (0xFF filler, active-low data)
   - ctv422rx/rxv100.asm   receive/receive1/shift_one…seven, rxerror1/2, translate_relay,
       output_relay, output_led, led_setup, init  (RXV100.$$$ = same code)
   - ctv422rx/rxv100-1.asm earlier receiver (synchronous slave, LEDs only, alignment code live)
   - ctv422tx/ctv422tx.pjt, *.mcp  (MPLAB project: 16F874, Frequency=4000000, MRU list)
   - ctv422tx_2/C/CTVrs422tx.c (ICC-AVR ATmega128 port, 8 Feb 2006, 4.9152 MHz)
   - CTV RS422/arx422iss1.net, arx422iss1.bom (P-CAD, ARX422-ISS1, 16 Mar 2006)
   - CTV RS422/ctv-relay pinouts (553580).doc  (DB25M relays, DB25F inputs, DB9 pin-outs)
   - CTV RS422/ARX422-silk.cdr (CorelDRAW → Inkscape plain SVG → assets/systems-94-98-arx422-front.svg / -rear.svg,
     vector in the file's pt units; Artwork 2026|59, replaces the old PNGs; live text re-anchored in the plugin)
   - SYSTEM94…SYSTEM98/*.DWG.md, *.PCB.md, 444.TXT, 447.TXT, 448.TXT, TTC/TTC.CDR, 980233/98233M0A.CDR
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: preload the CorelDRAW SVGs once, so panels that are re-rendered every frame never show them half-loaded */
const ART_PRELOAD = ["systems-94-98-arx422-front.svg", "systems-94-98-arx422-rear.svg"].map(n=>{ const i=new Image(); i.src=ASSET+n; return i; });
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const hex = v=>'0x'+((v&255).toString(16).toUpperCase().padStart(2,'0'));
const bin = v=>(v&255).toString(2).padStart(8,'0');
const us = s=>(s*1e6).toFixed(1)+' µs';
const ms = s=>(s*1e3).toFixed(1)+' ms';
const DUR = 2;

/* ---------------- constants from the source ---------------- */
const K = {
  SPBRG_TX: 21,            // txv100 init: movlw 21 / movwf SPBRG  ("Synch Mode at 56K")
  TXSTA_TX: 0xB0,          // CSRC=1 (master), TXEN=1, SYNC=1
  RCSTA_TX: 0x80,          // SPEN
  T2CON: 0x7F, PR2: 255,   // TOUTPS 1:16, TMR2ON, T2CKPS 1:16
  DELAY1: 16, DELAY2: 1,   // delay_counter1 = 16 (";17 is 825ms"), delay_counter2 = 1
  DATA_COUNT: 17,          // data_count
  TXCOUNT: 10,             // movlw 10 / movwf txcount (one data byte in ten)
  CNT_HI: 250, CNT_LO: 10, // counterHI_const × counterLO_const = 2500 bytes = 20 000 bits
  SPBRG_RX: 3,             // rxv100 init: movlw 3
  TXSTA_RX: 0x04,          // BRGH=1, SYNC=0  → asynchronous receiver
  RCSTA_RX: 0x90,          // SPEN + CREN
  RELAY_COUNT: 8,          // relay_count
};
const XTALS = { '4.9152': 4.9152e6, '4.0': 4.0e6, '3.579545': 3.579545e6 };

/* ---------------- device + scenario state ---------------- */
const D = {
  job: 'ctv',
  txX: '4.9152',           // TX crystal (BOM X1 / "56K" comment) or the .pjt's 4 MHz
  rxX: '3.579545',         // RX crystal — not in the archive; the only value at which the async receiver matches
  pol: 'inverted',         // RS422 line polarity as seen by the receiver
  ram: 'designed',         // power-up RAM model
  cable: true, txPower: true, rxPower: true,
  holdS: 0.15,
  presses: [ {t:0.080, dur:0.15, b:3} ],
  log: [],
};
function defaults(){ Object.assign(D,{txX:'4.9152',rxX:'3.579545',pol:'inverted',ram:'designed',cable:true,txPower:true,rxPower:true,holdS:0.15,presses:[{t:0.080,dur:0.15,b:3}],log:[]}); RUN=null; }

const tcyTX = ()=>4/XTALS[D.txX];
const tcyRX = ()=>4/XTALS[D.rxX];
const bitTX = ()=>4*(K.SPBRG_TX+1)/XTALS[D.txX];          // sync master: Fosc/(4(SPBRG+1))
const bitRX = ()=>16*(K.SPBRG_RX+1)/XTALS[D.rxX];         // async BRGH=1: Fosc/(16(SPBRG+1))
const tickT = ()=>tcyTX()*16*(K.PR2+1)*16;                 // TMR2IF period
const btnDown = (b,t)=>D.presses.some(p=>p.b===b && t>=p.t && t<p.t+p.dur);

/* ---------------- TX firmware steps (txv100.asm main) ---------------- */
const TXSTEPS = [
  ['clrwdt', 'Kick the watchdog'],
  ['input', 'Shift in 6 inputs (RC1 load, RA2 clock, RA4 data); 4-pass OR debounce; tx1 &= input|mask'],
  ['delay_setup', 'Delay-setup mode (dead: input_flag is never set)'],
  ['delay500', 'Count 16 TMR2IF ticks after a press, then latch tx1 → tx_send'],
  ['transmit', 'If TRMT, load TXREG: 0x00 filler or the data byte every 10th byte'],
  ['output_led', 'Shift 8 LED bits (RA3 data, RA2 clock, RA5 strobe); count 2500 bytes'],
  ['bcf portb,4 · goto main', 'Drop the end-of-burst strobe and loop'],
];
const RXSTEPS = [
  ['clrwdt', 'Kick the watchdog'],
  ['receive', 'FERR → rxerror2 · OERR → rxerror1 · RCIF → read RCREG; bit0=1 → rlf → relay_reg'],
  ['translate_relay', 'Start a 2048-pass pulse for each relay_reg bit that is 0'],
  ['output_relay', 'Shift relay bits (RC4 data, RC5 clock, RC3 strobe) → driver → relays'],
  ['output_led', 'Shift ~relay to the LED chain (RA3/RA2/RA5)'],
  ['movlw 255 · movwf relay_reg · goto main', 'Clear relay_reg and loop'],
];
const STEPCOL = ['#8a8f96','#3b82c4','#9b9b9b','#d08a2c','#1f9d55','#8e5cc4','#8a8f96'];

/* ---------------- emulation ---------------- */
let RUN = null, RUNKEY = '';
function key(){ return JSON.stringify([D.txX,D.rxX,D.pol,D.ram,D.cable,D.txPower,D.rxPower,D.presses]); }
function run(){ const k=key(); if (RUN && k===RUNKEY) return RUN; RUNKEY=k; const tx=runTX(); const line=buildLine(tx); const rx=runRX(tx,line); RUN={tx,line,rx}; return RUN; }

function runTX(){
  const T=tcyTX(), bt=bitTX(), tk=tickT(), zero=D.ram==='zero';
  const s = { im:[0xFF,0xFF,0xFF,0xFF], input_reg:0xFF, hold: zero?0x00:0xFF, mask:0xFF, tx1: zero?0x00:0xFF, tx_send: zero?0x00:0xFF,
              txc:0, delay1:K.DELAY1, delay2:K.DELAY2, data_counter: zero?0:0, txcount:K.TXCOUNT, cHI: zero?0:K.CNT_HI, cLO: zero?0:K.CNT_LO,
              cnt:[0,0,0,0,0,0], status1:0 };
  const out = { passes:[], bytes:[], leds:[{t:0, sw:s.hold, mix:0}], delays:[], bursts:[], ticks:[], rb4:[], debounced:[{t:0,v:0xFF}], maskCh:[{t:0,v:s.mask}], tick:tk, bit:bt };
  if (!D.txPower){ out.off=true; return out; }
  let t = 62*T;                     // call init (~60 cycles) then goto main
  let tmrFlag=false, tmrNext=tk, shiftEnd=0, curDelay=null, curBurst=null;
  while (t < DUR){
    const c=[1,0,5,0,0,0,3], br=['','','','','','',''];
    // ---- input
    const tIn = t + 3*T;
    if (s.txc & 2){ c[1]=5; br[1]='btfsc tx_complete,1 → return (transmitting: inputs ignored)'; }
    else {
      let cur=0xFF; for (let b=1;b<=6;b++) if (btnDown(b,tIn)) cur &= ~(1<<(b+1));
      s.im=[cur,s.im[0],s.im[1],s.im[2]];
      const ir = s.im[0]|s.im[1]|s.im[2]|s.im[3];
      if (ir!==s.input_reg) out.debounced.push({t:tIn+60*T, v:ir});
      s.input_reg=ir; s.hold=ir;
      s.tx1 &= (ir | s.mask);
      if (ir!==0xFF){
        if (!(s.txc&0x80)){ curDelay={t0:tIn+70*T, txAtStart:s.tx1, ticks:[]}; out.delays.push(curDelay); }
        s.txc |= 0x80;
      }
      const m0=s.mask;
      for (let k=0;k<6;k++){ const bit=k+2; if (!((ir>>bit)&1)) s.cnt[k]=0; s.cnt[k]=(s.cnt[k]+1)&255; if (s.cnt[k]===0) s.mask &= ~(1<<bit); }
      if (s.mask!==m0) out.maskCh.push({t:tIn+80*T, v:s.mask});
      c[1]=89; br[1]= ir!==0xFF ? `input_reg=${hex(ir)} → bsf tx_complete,7 · tx1=${hex(s.tx1)}` : 'all inputs open (input_reg=0xFF)';
    }
    // ---- delay_setup: btfss input_flag,0 / return  (input_flag never set)
    br[2]='btfss input_flag,0 → return';
    // ---- delay500
    const tD = t + (c[0]+c[1]+c[2])*T;
    if (!(s.txc&0x80)){ c[3]=5; br[3]='btfss tx_complete,7 → return'; }
    else if (!(tmrFlag || tD>=tmrNext)){ c[3]=7; br[3]='btfss pir1,tmr2if → return (waiting)'; }
    else {
      tmrFlag=false; tmrNext=tD+tk; out.ticks.push(tD); if (curDelay) curDelay.ticks.push(tD);
      s.delay1=(s.delay1-1)&255;
      if (s.delay1){ c[3]=14; br[3]=`TMR2IF: bcf · clrf TMR2 · decfsz delay1 → ${s.delay1}`; }
      else {
        s.delay1=K.DELAY1; s.delay2=(s.delay2-1)&255;
        if (s.delay2){ c[3]=18; br[3]='decfsz delay2'; }
        else {
          s.delay1=K.DELAY1; s.delay2=K.DELAY2; s.data_counter=K.DATA_COUNT; s.txc&=~0x80; s.txc|=2; s.tx_send=s.tx1;
          for (let bit=2;bit<=7;bit++) if (!((s.tx1>>bit)&1)) s.mask|=1<<bit;
          out.maskCh.push({t:tD+30*T, v:s.mask});
          s.tx1=0xFF; c[3]=44;
          const W=((s.tx_send&0xFE)^0xFF)&255;
          br[3]=`delay done: data_counter=17 · bsf tx_complete,1 · tx_send=${hex(s.tx_send)} (data byte ${hex(W)})`;
          if (curDelay){ curDelay.t1=tD+c[3]*T; curDelay.tx_send=s.tx_send; }
          curBurst={t0:null, t1:null, tx_send:s.tx_send, data:W, nBytes:0, copies:[], start:out.bytes.length}; out.bursts.push(curBurst); curDelay=null;
        }
      }
    }
    // ---- transmit
    const tT = tD + c[3]*T;
    if (!(s.txc&2)){ c[4]=5; br[4]='btfss tx_complete,1 → return'; }
    else if (tT < shiftEnd){ c[4]=10; br[4]='bank1 · btfsc txsta,1 (TRMT=0) → return'; }
    else {
      s.txc|=1; let v=0, isData=false, copy=0;
      if (s.data_counter===0){ c[4]=14; br[4]='transmit0: data_counter=0 → txdataff: TXREG=0x00'; }
      else {
        const W=((s.tx_send&0xFE)^0xFF)&255; s.txcount=(s.txcount-1)&255;
        if (s.txcount){ c[4]=18; br[4]=`transmit0: decfsz txcount → ${s.txcount} → txdataff: TXREG=0x00`; }
        else { v=W; isData=true; s.data_counter--; s.txcount=K.TXCOUNT; copy=K.DATA_COUNT-s.data_counter; c[4]=22; br[4]=`transmit0: TXREG=${hex(W)} (copy ${copy}/17) · decf data_counter → ${s.data_counter}`; }
      }
      const st=tT+8*T; shiftEnd=st+8*bt;
      const by={t0:st,t1:shiftEnd,v,data:isData,copy,n:curBurst?curBurst.nBytes:0};
      out.bytes.push(by);
      if (curBurst){ if (curBurst.t0===null) curBurst.t0=st; curBurst.t1=shiftEnd; curBurst.nBytes++; if (isData) curBurst.copies.push(by); }
    }
    // ---- output_led
    const tL = tT + c[4]*T;
    c[5]=51; br[5]=`LEDs ← input_reg_hold ${hex(s.hold)}`;
    const last=out.leds[out.leds.length-1];
    if (last.sw!==s.hold || last.mix!==(s.status1&2)) out.leds.push({t:tL+44*T, sw:s.hold, mix:s.status1&2});
    if (s.txc&1){
      s.txc&=~1; c[5]+=4; s.cHI=(s.cHI-1)&255;
      if (!s.cHI){ s.cHI=K.CNT_HI; c[5]+=4; s.cLO=(s.cLO-1)&255;
        if (!s.cLO){ s.txc&=~2; s.cHI=K.CNT_HI; s.cLO=K.CNT_LO; c[5]+=8; br[5]+=' · 2500 bytes sent: bcf tx_complete,1 · bsf portb,4';
          out.rb4.push(tL+c[5]*T); if (curBurst) curBurst.done=tL+c[5]*T; curBurst=null; }
      } else br[5]+=` · decfsz counterHI → ${s.cHI}`;
    }
    const cyc=c.reduce((a,b)=>a+b,0);
    out.passes.push({t0:t, t1:t+cyc*T, c, br, v:{input_reg:s.input_reg, hold:s.hold, mask:s.mask, tx1:s.tx1, tx_send:s.tx_send, txc:s.txc, delay1:s.delay1, data_counter:s.data_counter, txcount:s.txcount, cHI:s.cHI, cLO:s.cLO}});
    t += cyc*T;
  }
  return out;
}

/* DT line: the TX sync master shifts LSB first; between bytes the pin holds the last bit (inferred).
   The receiver sees the RS422 pair either straight or inverted. */
function buildLine(tx){
  const inv = D.pol==='inverted';
  const tr=[{t:-1, l: inv?1:0}];               // TX DT idles low after init (inferred) → receiver sees ~0
  if (!D.cable) return {tr:[{t:-1,l:1}], unplugged:true};
  let cur=tr[0].l;
  for (const by of tx.bytes){
    for (let k=0;k<8;k++){ let l=(by.v>>k)&1; if (inv) l^=1; if (l!==cur){ tr.push({t:by.t0+k*tx.bit, l}); cur=l; } }
  }
  return {tr};
}
function lineAt(line,t){ const a=line.tr; let lo=0,hi=a.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(a[m].t<=t) lo=m; else hi=m-1; } return a[lo].l; }
function nextLow(line,t){ if (lineAt(line,t)===0) return t; const a=line.tr; let lo=0,hi=a.length-1; while(lo<hi){ const m=(lo+hi)>>1; if(a[m].t<=t) lo=m+1; else hi=m; } for(let i=lo;i<a.length;i++) if(a[i].t>t && a[i].l===0) return a[i].t; return Infinity; }

/* Async receiver (PIC USART, SYNC=0, BRGH=1): level-sensitive start, centre sampling. */
function asyncFrames(line){
  const a=bitRX(), frames=[]; let tf=0;
  while (frames.length<20000){
    const ts=nextLow(line,tf); if (!isFinite(ts) || ts>DUR) break;
    if (lineAt(line, ts+0.5*a)!==0){ tf=ts+0.5*a; continue; }      // false start
    let R=0; const samp=[];
    for (let j=0;j<8;j++){ const tsm=ts+(1.5+j)*a, b=lineAt(line,tsm); samp.push(tsm); R|=b<<j; }
    const stopT=ts+9.5*a, stop=lineAt(line,stopT);
    frames.push({ts, tc:stopT, R, ferr:!stop, samp, stopT});
    tf=stopT;
  }
  return frames;
}

function runRX(tx,line){
  const T=tcyRX();
  const frames = asyncFrames(line);
  const out = { passes:[], frames, reads:[], fires:[], relays:[{t:0,v:0}], leds:[{t:0,v:0xFF}], oerr:[], ferr:[] };
  if (!D.rxPower){ out.off=true; return out; }
  const s = { relay:0, set:0, d0:[0,0,0,0,0,0], d1:[8,8,8,8,8,8], out:0xFF, relay_reg:0xFF, oerr:false };
  const fifo=[]; let qi=0; let t=70*T;   // init ends in goto rxerror1 (flush)
  while (t < DUR){
    const c=[1,0,0,42,43,4], br=['','','','','',''];
    const tR=t+2*T;
    while (qi<frames.length && frames[qi].tc<=tR){ if (fifo.length>=2){ s.oerr=true; out.oerr.push(frames[qi].tc); } else fifo.push(frames[qi]); qi++; }
    // ---- receive
    if (fifo.length && fifo[0].ferr){ const f=fifo.shift(); c[1]=10; br[1]=`btfsc rcsta,2 (FERR) → rxerror2: movf rcreg,w (${hex(f.R)} dropped)`; out.ferr.push({t:tR,f}); }
    else if (s.oerr){ fifo.length=0; s.oerr=false; c[1]=16; br[1]='btfsc rcsta,1 (OERR) → rxerror1: read rcreg ×2 · bcf/bsf rcsta,4 (CREN)'; }
    else if (fifo.length){
      const f=fifo.shift();
      if (!(f.R&1)){ c[1]=14; br[1]=`movf rcreg → rxdata0=${hex(f.R)} · btfss rxdata0,0 → return (ignored)`; out.reads.push({t:tR,f,acc:false}); }
      else { s.relay_reg=((f.R<<1)|0)&255; c[1]=20; br[1]=`rxdata0=${hex(f.R)} · bit0=1 → goto receive1 · rlf → relay_reg=${hex(s.relay_reg)}`; out.reads.push({t:tR,f,acc:true,rr:s.relay_reg}); }
    } else { c[1]=9; br[1]='btfss pir1,5 (RCIF=0) → return'; }
    // ---- translate_relay
    let ct=0; const fired=[], ended=[];
    for (let k=0;k<6;k++){
      const bit=k+2; let counting=false;
      if ((s.set>>bit)&1){ counting=true; ct+=1; }
      else if (!((s.relay_reg>>bit)&1)){ s.relay|=1<<bit; s.set|=1<<bit; s.d1[k]=K.RELAY_COUNT; counting=true; ct+=6; fired.push(k+1); }
      else ct+=5;
      if (counting){ s.d0[k]=(s.d0[k]-1)&255; ct+=3;
        if (!s.d0[k]){ s.d1[k]=(s.d1[k]-1)&255; ct+=3; if (!s.d1[k]){ s.relay&=~(1<<bit); s.set&=~(1<<bit); s.d1[k]=K.RELAY_COUNT; ct+=6; ended.push(k+1); } } }
    }
    c[2]=ct+7; s.out=(~s.relay)&255;
    br[2]= fired.length? `relay ${fired.join(',')}: bsf relay · bsf relay_set · relayN_delay1=8` : ended.length? `relay ${ended.join(',')}: delay expired → bcf relay` : `relay=${hex(s.relay)} relay_set=${hex(s.set)}`;
    const tRel = t+(c[0]+c[1]+c[2]+c[3])*T, tLed=tRel+c[4]*T;
    if (fired.length) fired.forEach(r=>out.fires.push({t:tRel, r}));
    br[3]=`8 clocks → strobe RC3: relays ${bin(s.relay>>2).slice(2)}`; br[4]=`LEDs ← ~relay ${hex(s.out)}`;
    const lr=out.relays[out.relays.length-1]; if (lr.v!==s.relay) out.relays.push({t:tRel, v:s.relay});
    const ll=out.leds[out.leds.length-1]; if (ll.v!==s.out) out.leds.push({t:tLed, v:s.out});
    s.relay_reg=0xFF;
    const cyc=c.reduce((a,b)=>a+b,0);
    out.passes.push({t0:t,t1:t+cyc*T,c,br,v:{relay:s.relay,set:s.set,relay_reg:s.relay_reg,d0:s.d0.slice(),d1:s.d1.slice(),out:s.out}});
    t+=cyc*T;
  }
  return out;
}

/* ---------------- lookups ---------------- */
function bs(arr,t,k){ k=k||'t'; let lo=0,hi=arr.length-1; if(hi<0||arr[0][k]>t) return -1; while(lo<hi){ const m=(lo+hi+1)>>1; if(arr[m][k]<=t) lo=m; else hi=m-1; } return lo; }
function passAt(ps,t){ const i=bs(ps,t,'t0'); return i<0?null:ps[i]; }
function stepIn(p,t,Tc){ if(!p) return -1; let a=p.t0; for(let i=0;i<p.c.length;i++){ a+=p.c[i]*Tc; if (t<a) return i; } return p.c.length-1; }
function txLed(t){ const R=run(); const i=bs(R.tx.leds,t); return R.tx.leds[Math.max(0,i)]; }
function rxRel(t){ const R=run(); if (R.rx.off) return 0; const i=bs(R.rx.relays,t); return R.rx.relays[Math.max(0,i)].v; }
function rxLed(t){ const R=run(); if (R.rx.off) return 0xFF; const i=bs(R.rx.leds,t); return R.rx.leds[Math.max(0,i)].v; }
function phaseAt(t){
  const R=run(); if (R.tx.off) return {k:'off', label:'TX power off'};
  for (const b of R.tx.bursts){ const end=b.done||DUR; if (b.t0!==null && t>=b.t0 && t<end) return {k:'burst', b, label:'transmitting burst'}; }
  for (const d of R.tx.delays){ const end=d.t1||DUR; if (t>=d.t0 && t<end) return {k:'delay', d, label:'delay500 counting TMR2 ticks'}; }
  return {k:'idle', label:'idle: scanning inputs'};
}
function byteAt(t){ const R=run(); const i=bs(R.tx.bytes,t,'t0'); if(i<0) return null; const b=R.tx.bytes[i]; return t<b.t1? b : null; }

/* ---------------- actions (each logs the firmware path) ---------------- */
function logA(name, trace){ D.log.unshift({name, trace, at:SIM.t}); if (D.log.length>30) D.log.pop(); }
const A = {
  press(b){
    const t=SIM.t; D.presses.push({t, dur:D.holdS, b}); D.presses.sort((x,y)=>x.t-y.t); RUN=null;
    const R=run(), tr=[]; const bit=b+1;
    tr.push(`t=${SIM.fmtT(t)}: input ${b} closed to ground (P1 pin ${b} → pin ${13+b}) for ${ms(D.holdS)}`);
    if (R.tx.off){ tr.push('TX is powered off: nothing happens.'); return logA(`Input ${b}`, tr); }
    const ph=phaseAt(t);
    if (ph.k==='burst') tr.push(`<b>Ignored while transmitting</b>: input → btfsc tx_complete,1 → return. The press ends at ${SIM.fmtT(t+D.holdS)}${t+D.holdS>(ph.b.done||DUR)?', after the burst, so it is seen late':''}.`);
    const deb=R.tx.debounced.find(e=>e.t>=t && !((e.v>>bit)&1));
    if (deb) tr.push(`input: RC1 load, 6 RA2 clocks, RA4 low on input ${b} → bcf input_reg,${bit}; OR of input_minus1…4 goes low after 4 passes (${SIM.fmtT(deb.t)})`);
    const dl=R.tx.delays.find(d=>d.t0>=t-0.001 || (d.t0<t && (d.t1||DUR)>t));
    if (dl){ tr.push(`incfsz temp,w → bsf tx_complete,7 → delay500 counts ${K.DELAY1} TMR2IF ticks of ${ms(R.tx.tick)} (T2CON=0x7F, PR2=255)`);
      if (dl.t1) tr.push(`${SIM.fmtT(dl.t1)}: delay done → tx_send=${hex(dl.tx_send)}; debounce_hold_mask |= sent bits; tx1=0xFF`); }
    const bu=R.tx.bursts.find(x=>x.t0!==null && x.t0>=t);
    if (bu){ tr.push(`transmit: 9 × 0x00 then data ${hex(bu.data)} = (tx_send & 0xFE) ^ 0xFF; 17 copies one byte in ten; ${bu.nBytes} bytes in all at ${(1/R.tx.bit/1000).toFixed(2)} kbit/s`);
      const rd=R.rx.reads.find(r=>r.t>=bu.t0 && r.acc); if (rd) tr.push(`RX ${SIM.fmtT(rd.t)}: async frame ${hex(rd.f.R)} · bit0=1 → rlf → relay_reg=${hex(rd.rr)}`);
      const fi=R.rx.fires.filter(f=>f.t>=bu.t0 && f.t<(bu.done||DUR)); tr.push(fi.length? `translate_relay: relay ${[...new Set(fi.map(f=>f.r))].join(', ')} on at ${SIM.fmtT(fi[0].t)} for 8×256 passes` : '<b>No relay operated</b> (see Software → decode).'); }
    logA(`Input ${b} at ${SIM.fmtT(t)}`, tr);
  },
  clear(){ D.presses=[]; RUN=null; logA('Clear all presses',['Scenario emptied; the pair just idles (0x00 filler is never sent without a press).']); },
  set(k,v,why){ D[k]=v; RUN=null; logA(`${k} = ${v}`, why?[why]:[]); },
  cable(){ D.cable=!D.cable; RUN=null; logA(D.cable?'Plug in the RS422 cable':'Unplug the RS422 cable', [D.cable?'TX COM → RX COM data pair connected.':'RX RS422 receiver input open: the line idles at mark (1) '+'(fail-safe level inferred); receive sees no start bits.']); },
  power(u){ const k=u==='tx'?'txPower':'rxPower'; D[k]=!D[k]; RUN=null; logA(`${u.toUpperCase()} power ${D[k]?'on':'off'}`, [D[k]?'Reset vector: call init → goto main (the whole 2 s run restarts from power-on).':'Unit dark.']); },
  reset(){ defaults(); logA('Reset scenario', ['Default: input 3 pressed for 150 ms at 80 ms; matched crystals; inverted pair.']); },
};

/* ---------------- panel drawings (real ARX422 silk + overlays) ---------------- */
const FW=617, FH=115.6;                       // panel outline in the CorelDRAW file (pt) = 8.57 × 1.61 in
const LEDX = k=>266.6+14.4*(k-1), LEDY=78.4;  // IO LED k (k=1..18), from the drill rings
const COMX = [210.8,225.2];
function ledC(x,y,on,col,title,attr){ return `<g ${attr||''}><circle cx="${x}" cy="${y}" r="3.9" fill="#0b0b0b" stroke="#555" stroke-width=".5"/><circle cx="${x}" cy="${y}" r="3" fill="${on?col:'#3a3524'}"${on?` style="filter:drop-shadow(0 0 2px ${col})"`:''}/><title>${title}</title></g>`; }
function frontSVG(u,t){
  const tx=u==='tx', pw= tx?D.txPower:D.rxPower;
  let leds=[], com=[false,false], tips=[];
  if (tx){ const L=txLed(t); for(let k=1;k<=6;k++) leds[k]=pw && !((L.sw>>(k+1))&1); com=[pw && !!L.mix, pw && !((L.sw)&1)]; }
  else { const o=rxLed(t); for(let k=1;k<=6;k++) leds[k]=pw && !((o>>(k+1))&1); }
  let s=`<svg viewBox="0 0 ${FW} ${FH}" style="width:100%;display:block;border-radius:4px">
   <rect width="${FW}" height="${FH}" fill="#151617"/>
   <image href="${ASSET}systems-94-98-arx422-front.svg" x="0" y="0" width="${FW}" height="${FH}"/>
   <g data-act="pwr-${u}" style="cursor:pointer"><rect x="46.6" y="19.5" width="36.4" height="55.4" rx="2" fill="#0d0d0d" stroke="#666" stroke-width=".6"/>
     <rect x="52" y="${pw?24:46}" width="25.6" height="24" rx="2" fill="${pw?'#5c5f63':'#2c2e30'}" stroke="#888" stroke-width=".4"/>
     <text x="64.8" y="70" text-anchor="middle" font-size="6" fill="#bbb">${pw?'I':'O'}</text><title>Power switch PWRSW (cut-out in ARX422-silk.cdr; switch type ${'inferred'}). Click to switch ${u.toUpperCase()} ${pw?'off':'on'}.</title></g>
   ${ledC(107.7,LEDY,pw,'#5dff5a','PWR (green LED in arx422iss1.bom; position = drill crosshair, inferred)')}
   ${ledC(COMX[0],LEDY,com[0],'#ffd23a', tx?'COM 1 ← LED chain bit "mix" (status1,1 slave LED; never lit in v1.00) — mapping inferred':'COM 1 — rxv100 shifts a constant 1 (off)')}
   ${ledC(COMX[1],LEDY,com[1],'#ffd23a', tx?'COM 2 ← LED chain bit "spare" (input_reg bit 0, always 1 → off) — mapping inferred':'COM 2 — rxv100 shifts a constant 1 (off)')}`;
  for (let k=1;k<=18;k++){ const on=k<=6&&leds[k]; s+=ledC(LEDX(k),LEDY,on,'#ffd23a', k<=6? (tx?`Input ${k}: lit while input_reg_hold bit ${k+1} is 0 (debounced closure)`:`Relay ${k}: lit while relay bit ${k+1} is set (output_reg = ~relay)`) : `I/O ${k}: not driven by the v1.00 PIC code (ARX422 has 16 GPI + 6 relays)`, k<=6&&tx?`data-btn="${k}" style="cursor:pointer"`:''); }
  s+=`<g fill="#f2f2f2" font-family="Arial, Helvetica, sans-serif">
    <text x="218" y="69" font-size="9.5" text-anchor="middle">COM</text>
    <text x="389.5" y="69" font-size="9.5" text-anchor="middle">INPUTS/OUTPUTS</text>
    ${[1,2].map(k=>`<text x="${COMX[k-1]}" y="96" font-size="9" text-anchor="middle">${k}</text>`).join('')}
    ${Array.from({length:18},(_,i)=>`<text x="${LEDX(i+1)}" y="96" font-size="9" text-anchor="middle">${i+1}</text>`).join('')}
    <text x="17" y="104" font-size="9.5">CONTROL INTERFACE</text>
    <text x="477" y="19.5" font-size="9.5">WARD-BECK SYSTEMS</text></g>
    <text x="${FW-6}" y="${FH-5}" font-size="7" text-anchor="end" fill="#8fd">${tx?'TX · txv100.asm':'RX · rxv100.asm'}</text></svg>`;
  return s;
}
function dsub(x0,x1,y0,y1,n,label,act,hi){
  const w=x1-x0, h=y1-y0, r=n===25?13:5, cx=(x0+x1)/2;
  let p=`<g ${act?`data-act="${act}" style="cursor:pointer"`:''}><path d="M${x0+3},${y0+3} L${x1-3},${y0+3} L${x1-9},${y1-3} L${x0+9},${y1-3}Z" fill="#2b2d30" stroke="${hi?'#4cc38a':'#9aa'}" stroke-width="${hi?1.6:.7}"/>`;
  const row1=Math.ceil(n/2), row2=n-row1, pitch=(w-24)/(row1-1);
  for(let i=0;i<row1;i++) p+=`<circle cx="${x0+12+i*pitch}" cy="${y0+h*0.38}" r="1.3" fill="#c9c9c9"/>`;
  for(let i=0;i<row2;i++) p+=`<circle cx="${x0+12+pitch/2+i*pitch}" cy="${y0+h*0.66}" r="1.3" fill="#c9c9c9"/>`;
  return p+`<title>${label}</title></g>`;
}
function rearSVG(u){
  const tx=u==='tx';
  let s=`<svg viewBox="0 0 ${FW} ${FH}" style="width:100%;display:block;border-radius:4px"><rect width="${FW}" height="${FH}" fill="#151617"/>
   <image href="${ASSET}systems-94-98-arx422-rear.svg" x="0" y="0" width="${FW}" height="${FH}"/>`;
  [[54,476],[187.2,476],[54,521],[187.2,521],[232.4,476],[365.6,476],[246.1-12.9,521],[303.2,521],[348.3,521],[419.1,521]].forEach(([x,y])=>{ s+=`<rect x="${x}" y="${y-451+25-25}" width="9" height="9" fill="#0a0a0a" stroke="#555" stroke-width=".4"/>`; });
  s+=dsub(67.5,182.7,14.3,44.9,25, tx?'P1 DB25F — transmitter inputs 1–6 on pins 1–6, ground 14–19 (ctv-relay pinouts doc). Click a remote button below to close one.':'P1 DB25 — GPI inputs (ARX422 P6 header, inferred); unused by rxv100', null, tx);
  s+=dsub(67.5,182.7,59.7,90.3,25, tx?'P2 DB25 — relay contacts on the ARX422 (unused on a transmitter)':'P2 DB25M — relay closures: relay k NC = pin 2k−1, NO = pin 2k, common = pin 12+2k (doc and arx422iss1.net agree)', null, !tx);
  s+=dsub(245.9,361.1,14.3,44.9,25,'P3 DB25 — GPI 9–16 (ARX422 P7 header, inferred)');
  s+=dsub(246.1,298.5,59.7,90.3,9, `COM1 DB9 — ${tx?'Tx Data± 2/7, Tx Clock± 3/8':'Rx Data− pin 2, Rx Data+ pin 7 (no clock)'} (doc). ${D.cable?'Cable plugged: click to unplug.':'Unplugged: click to plug in.'}`, 'cable', D.cable);
  s+=dsub(362,414.4,59.7,90.3,9,'COM2 DB9 — ARX422 J4 (USART1, TCLK/TXD jumpers); not used by the PIC pair');
  if (D.cable) s+=`<path d="M272.3,90 C272.3,108 ${tx?'250,114 230,116':'300,114 320,116'}" stroke="#c8a24a" stroke-width="3" fill="none"/>`;
  s+=`<g><rect x="489.2" y="11.7" width="89.3" height="77.8" rx="2" fill="#202224" stroke="#888" stroke-width=".6"/>
     <rect x="497" y="18" width="30" height="24" rx="2" fill="#0b0b0b" stroke="#999" stroke-width=".5"/><rect x="503" y="24" width="4" height="8" fill="#888"/><rect x="510" y="24" width="4" height="8" fill="#888"/><rect x="517" y="24" width="4" height="8" fill="#888"/>
     <circle cx="556" cy="31" r="9" fill="#0b0b0b" stroke="#999" stroke-width=".5"/><text x="556" y="62" text-anchor="middle" font-size="6.5" fill="#ddd">AC IN · FUSE</text>
     <title>ACIN (PAN356) / fuse cut-out, 1.24 × 1.08 in, split in four in the artwork. Inlet type inferred.</title></g>
   <g fill="#f2f2f2" font-family="Arial, Helvetica, sans-serif"><text x="125" y="56" font-size="9.5" text-anchor="middle">P1</text><text x="125" y="101.5" font-size="9.5" text-anchor="middle">P2</text><text x="303.5" y="56" font-size="9.5" text-anchor="middle">P3</text>
   <text x="272.3" y="106.6" font-size="9.5" text-anchor="middle">COM1</text><text x="388.2" y="106.6" font-size="9.5" text-anchor="middle">COM2</text>
   <text x="578.5" y="99" font-size="6.2" text-anchor="end">DISCONNECT POWER BEFORE SERVICING</text><text x="578.5" y="107" font-size="6.2" text-anchor="end">115VAC, 1/2A. S.B.</text></g></svg>`;
  return s;
}
function remoteSVG(t){
  let s=`<svg viewBox="0 0 330 74" style="width:100%;max-width:520px;display:block"><rect x="1" y="1" width="328" height="72" rx="8" fill="var(--panel2)" stroke="var(--line)"/>
    <text x="10" y="15" font-size="10" fill="var(--ink2)">Customer contact closures → TX P1 (DB25F) · click or keys 1–6</text>`;
  for (let b=1;b<=6;b++){ const x=32+b*45-45, on=btnDown(b,t); s+=`<g data-btn="${b}" style="cursor:pointer"><circle cx="${x}" cy="44" r="16" fill="${on?'var(--accent)':'#c9c3b4'}" stroke="var(--ink)" stroke-width="1.2"/><text x="${x}" y="49" text-anchor="middle" font-size="14" font-weight="700" fill="${on?'#fff':'#222'}">${b}</text><title>Close input ${b} for ${ms(D.holdS)} at the playhead (pin ${b} to pin ${13+b})</title></g>`; }
  return s+'</svg>';
}
function relaySVG(t){
  const v=rxRel(t);
  let s=`<svg viewBox="0 0 330 92" style="width:100%;max-width:520px;display:block"><rect x="1" y="1" width="328" height="90" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="10" y="15" font-size="10" fill="var(--ink2)">RX P2 (DB25M) relay contacts — G5V relays via ULN2803</text>`;
  for (let k=1;k<=6;k++){ const x=12+(k-1)*53, on=!!((v>>(k+1))&1);
    s+=`<g><rect x="${x}" y="22" width="48" height="64" rx="5" fill="var(--panel)" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2:1}"/>
    <text x="${x+24}" y="34" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink)">RLY ${k}</text>
    <circle cx="${x+10}" cy="70" r="2.5" fill="var(--ink)"/><text x="${x+10}" y="82" text-anchor="middle" font-size="8" fill="var(--ink2)">C ${12+2*k}</text>
    <circle cx="${x+38}" cy="48" r="2.5" fill="var(--ink)"/><text x="${x+38}" y="44" text-anchor="middle" font-size="8" fill="var(--ink2)">NC ${2*k-1}</text>
    <circle cx="${x+38}" cy="70" r="2.5" fill="var(--ink)"/><text x="${x+38}" y="82" text-anchor="middle" font-size="8" fill="var(--ink2)">NO ${2*k}</text>
    <line x1="${x+10}" y1="70" x2="${on?x+36:x+36}" y2="${on?70:49}" stroke="${on?'var(--accent)':'var(--ink)'}" stroke-width="2"/><title>Relay ${k}: ${on?'operated (C–NO closed)':'released (C–NC closed)'}</title></g>`; }
  return s+'</svg>';
}
function bindPanel(root){
  root.querySelectorAll('[data-btn]').forEach(g=>g.onclick=()=>{ A.press(+g.dataset.btn); SIM.refresh(); });
  root.querySelectorAll('[data-act]').forEach(g=>g.onclick=()=>{ const a=g.dataset.act; if (a==='cable') A.cable(); else if (a.startsWith('pwr-')) A.power(a.slice(4)); SIM.refresh(); });
}
let __bound=false;
function keys(){ if (__bound) return; __bound=true; document.addEventListener('keydown',e=>{ if(!window.__s9498Active || (e.target.matches&&e.target.matches('input,select,textarea'))) return; if (/^[1-6]$/.test(e.key)){ A.press(+e.key); SIM.refresh(); } }); }

/* ---------------- controls ---------------- */
function controlsHTML(){
  const sel=(id,opts,v)=>`<select data-set="${id}">${opts.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${l}</option>`).join('')}</select>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center" class="small">
   <label>Press length ${sel('holdS',[['0.05','50 ms'],['0.15','150 ms'],['0.4','400 ms'],['1.5','1.5 s (hold)']],String(D.holdS))}</label>
   <label>TX crystal ${sel('txX',[['4.9152','4.9152 MHz (BOM, "56K")'],['4.0','4.000 MHz (.pjt)']],D.txX)}</label>
   <label>RX crystal ${sel('rxX',[['3.579545','3.579545 MHz (matches, inferred)'],['4.9152','4.9152 MHz (same as TX)'],['4.0','4.000 MHz (.pjt)']],D.rxX)}</label>
   <label>RS422 pair ${sel('pol',[['inverted','inverted at RX (inferred)'],['straight','straight']],D.pol)}</label>
   <label>Power-up RAM ${sel('ram',[['designed','as designed (counters loaded)'],['zero','cold: all 0x00']],D.ram)}</label>
   <button data-do="cable">${D.cable?'Unplug cable':'Plug cable'}</button>
   <button data-do="clear">Clear presses</button><button data-do="reset">Reset scenario</button></div>
   <div class="small muted" style="margin-top:4px">Presses: ${D.presses.length? D.presses.map(p=>`<span class="chip">in ${p.b} @ ${(p.t*1000).toFixed(0)} ms · ${ms(p.dur)}</span>`).join(''):'none'}</div>`;
}
function bindControls(root){
  root.querySelectorAll('[data-set]').forEach(s=>s.onchange=()=>{ const k=s.dataset.set; A.set(k, k==='holdS'?+s.value:s.value, k==='rxX'?`RX async baud = ${(XTALS[s.value]/64/1000).toFixed(2)} kbit/s vs TX ${(1/bitTX()/1000).toFixed(2)} kbit/s`:''); SIM.refresh(); });
  root.querySelectorAll('[data-do]').forEach(b=>b.onclick=()=>{ A[b.dataset.do](); SIM.refresh(); });
}

/* ---------------- timeline lanes ---------------- */
function laneBars(c,X,t0,t1,y,h,rows,getSegs,col,labels){
  const rh=(h-4)/rows;
  for (let r=0;r<rows;r++){ const yy=y+2+r*rh; c.fillStyle=SIM.css('--grid'); c.fillRect(X(t0),yy+rh/2-0.5,X(t1)-X(t0),1);
    getSegs(r).forEach(([a,b])=>{ if (b<t0||a>t1) return; c.fillStyle=col; c.fillRect(X(a),yy+1,Math.max(1,X(b)-X(a)),rh-2); });
    if (labels){ c.fillStyle=SIM.css('--ink2'); c.font='9px '+SIM.css('--mono'); c.fillText(labels[r],X(t0)+2,yy+rh-2); } }
}
function changesToSegs(ch,pred){ const segs=[]; let a=null; for (let i=0;i<ch.length;i++){ const on=pred(ch[i]); if (on&&a===null) a=ch[i].t; if(!on&&a!==null){ segs.push([a,ch[i].t]); a=null; } } if (a!==null) segs.push([a,DUR]); return segs; }
function lanePasses(c,X,t0,t1,y,h,ps,Tc,names){
  const i0=Math.max(0,bs(ps,t0,'t0')), i1=bs(ps,t1,'t0'); const n=i1-i0+1, px=X(t1)-X(t0);
  if (n>px/3){ c.fillStyle=SIM.css('--accent2'); c.globalAlpha=.3; c.fillRect(X(t0),y+h*.3,px,h*.4); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`${n.toLocaleString()} passes (≈${us((t1-t0)/Math.max(1,n))} each)`,X(t0)+6,y+h/2+4); return; }
  for (let i=i0;i<=i1;i++){ const p=ps[i]; let a=p.t0; const w=X(p.t1)-X(p.t0);
    if (w>40){ p.c.forEach((cc,k)=>{ const b=a+cc*Tc; c.fillStyle=STEPCOL[k%STEPCOL.length]; c.globalAlpha=.75; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-.5),h-6); c.globalAlpha=1; if (X(b)-X(a)>46){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(names[k][0].split(' ')[0],X(a)+2,y+h/2+4);} a=b; }); }
    else { c.fillStyle=i%2?SIM.css('--accent2'):SIM.css('--accent'); c.globalAlpha=.5; c.fillRect(X(p.t0),y+4,Math.max(1,w-1),h-8); c.globalAlpha=1; } }
}
function laneBytes(c,X,t0,t1,y,h){
  const R=run(), B=R.tx.bytes, bt=R.tx.bit; const acc=SIM.css('--accent'), ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  const i0=Math.max(0,bs(B,t0,'t0')), i1=bs(B,t1,'t0'); if (i1<0) { c.fillStyle=ink2; c.font='11px sans-serif'; c.fillText('line idle (no burst)',X(t0)+6,y+h/2+4); return; }
  const n=i1-i0+1, pxB=8*bt/(t1-t0)*(X(t1)-X(t0));
  if (pxB<3){ R.tx.bursts.forEach(b=>{ if(b.t0===null) return; c.fillStyle=ink2; c.globalAlpha=.3; c.fillRect(X(b.t0),y+6,Math.max(1,X(b.t1)-X(b.t0)),h-12); c.globalAlpha=1; b.copies.forEach(cp=>{ c.fillStyle=acc; c.fillRect(X(cp.t0),y+2,Math.max(1.5,X(cp.t1)-X(cp.t0)),h-4); }); c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); if (X(b.t1)-X(b.t0)>160) c.fillText(`${b.nBytes} bytes · 17 × ${hex(b.data)} then 0x00`,X(b.t0)+40,y+h/2+4); }); return; }
  for (let i=i0;i<=i1;i++){ const b=B[i]; const xa=X(b.t0), xb=X(b.t1);
    if (pxB>90){ // bit level: CK on top half, DT on bottom
      const yC=y+3, yD=y+h/2+2, hh=h/2-6; c.strokeStyle=ink2; c.beginPath();
      for (let k=0;k<8;k++){ const a=X(b.t0+k*bt), m=X(b.t0+(k+.5)*bt), e=X(b.t0+(k+1)*bt); c.moveTo(a,yC+hh); c.lineTo(a,yC); c.lineTo(m,yC); c.lineTo(m,yC+hh); c.lineTo(e,yC+hh); } c.stroke();
      c.strokeStyle=b.data?acc:ink; c.lineWidth=2; c.beginPath(); for (let k=0;k<8;k++){ const lv=(b.v>>k)&1, yy=lv?yD:yD+hh; const a=X(b.t0+k*bt), e=X(b.t0+(k+1)*bt); if(k===0) c.moveTo(a,yy); else c.lineTo(a,yy); c.lineTo(e,yy); if (e-a>14){ c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText('b'+k+'='+lv,a+2,yD+hh+0.5);} } c.stroke(); c.lineWidth=1;
    } else { c.fillStyle=b.data?acc:SIM.css('--chip'); c.strokeStyle=ink2; c.fillRect(xa,y+4,Math.max(1,xb-xa-1),h-8); c.strokeRect(xa,y+4,Math.max(1,xb-xa-1),h-8); if (xb-xa>26){ c.fillStyle=b.data?'#fff':ink; c.font='10px '+SIM.css('--mono'); c.fillText(hex(b.v),xa+3,y+h/2+4);} }
  }
}
function laneLine(c,X,t0,t1,y,h){
  const R=run(), tr=R.line.tr; const i0=Math.max(0,bs(tr,t0)), i1=bs(tr,t1);
  if (i1-i0>(X(t1)-X(t0))/2){ c.fillStyle=SIM.css('--ink2'); c.globalAlpha=.35; c.fillRect(X(t0),y+h*.3,X(t1)-X(t0),h*.4); c.globalAlpha=1; return; }
  c.strokeStyle=SIM.css('--warn'); c.lineWidth=1.6; c.beginPath(); let lv=tr[i0].l; c.moveTo(X(t0), lv?y+4:y+h-4);
  for (let i=i0+1;i<=i1;i++){ const x=X(tr[i].t); c.lineTo(x, lv?y+4:y+h-4); lv=tr[i].l; c.lineTo(x, lv?y+4:y+h-4); } c.lineTo(X(t1), lv?y+4:y+h-4); c.stroke(); c.lineWidth=1;
  // async sample points
  const F=R.rx.frames, a=bitRX(); const j0=Math.max(0,bs(F,t0-12*a,'ts')), j1=bs(F,t1,'ts');
  if (j1>=j0 && (X(t0+a)-X(t0))>5) for (let j=j0;j<=j1;j++){ const f=F[j]; c.fillStyle=SIM.css('--bad'); [f.ts+0.5*a,...f.samp,f.stopT].forEach((tt,k)=>{ const x=X(tt); c.fillRect(x-1,y+h/2-3,2,6); }); }
}
function laneFrames(c,X,t0,t1,y,h){
  const R=run(), F=R.rx.frames; const i0=Math.max(0,bs(F,t0,'ts')), i1=bs(F,t1,'ts'); if(i1<0) return;
  for (let i=i0;i<=i1;i++){ const f=F[i]; const xa=X(f.ts), xb=X(f.tc); const acc=!f.ferr && (f.R&1);
    c.fillStyle=f.ferr?SIM.css('--bad'):acc?SIM.css('--accent'):SIM.css('--ink2'); c.fillRect(xa,y+3,Math.max(1.5,xb-xa),h-6);
    if (xb-xa>40){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText((f.ferr?'FERR ':'')+hex(f.R),xa+3,y+h/2+4); } }
}
function timelineLanes(){
  const R=run();
  return [
    {label:'Inputs 1–6 (closures)', h:44, draw:(c,X,t0,t1,y,h)=>laneBars(c,X,t0,t1,y,h,6,r=>D.presses.filter(p=>p.b===r+1).map(p=>[p.t,p.t+p.dur]),SIM.css('--warn'),['1','2','3','4','5','6'])},
    {label:'TX input_reg (debounced)', h:44, draw:(c,X,t0,t1,y,h)=>laneBars(c,X,t0,t1,y,h,6,r=>changesToSegs(R.tx.debounced,e=>!((e.v>>(r+2))&1)),SIM.css('--accent2'))},
    {label:'TX state · TMR2IF ticks', h:26, draw:(c,X,t0,t1,y,h)=>{ R.tx.delays.forEach(d=>{ c.fillStyle=SIM.css('--warn'); c.globalAlpha=.35; c.fillRect(X(d.t0),y+4,X(d.t1||DUR)-X(d.t0),h-8); c.globalAlpha=1; if (X(d.t1||DUR)-X(d.t0)>110){ c.fillStyle=SIM.css('--ink'); c.font='11px sans-serif'; c.fillText('delay500 · 16 ticks',X(d.t0)+4,y+h/2+4);} });
      R.tx.bursts.forEach(b=>{ if(b.t0===null) return; c.fillStyle=SIM.css('--accent'); c.globalAlpha=.35; c.fillRect(X(b.t0),y+4,X(b.done||DUR)-X(b.t0),h-8); c.globalAlpha=1; if (X(b.done||DUR)-X(b.t0)>110){ c.fillStyle=SIM.css('--ink'); c.font='11px sans-serif'; c.fillText(`burst · tx_send ${hex(b.tx_send)}`,X(b.t0)+4,y+h/2+4);} });
      c.fillStyle=SIM.css('--ink2'); R.tx.ticks.forEach(t=>{ if(t>=t0&&t<=t1) c.fillRect(X(t),y+1,1.5,h-2); }); }},
    {label:'TX main loop (PIC16F874)', h:24, draw:(c,X,t0,t1,y,h)=>{ if(!R.tx.off) lanePasses(c,X,t0,t1,y,h,R.tx.passes,tcyTX(),TXSTEPS); }},
    {label:'TX RC6 CK / RC7 DT', h:40, draw:laneBytes},
    {label:'RB4 end-of-burst', h:16, draw:(c,X,t0,t1,y,h)=>{ c.fillStyle=SIM.css('--bad'); R.tx.rb4.forEach(t=>{ if(t>=t0-1e-3&&t<=t1) c.fillRect(X(t),y+2,Math.max(2,X(t+3*tcyTX())-X(t)),h-4); }); }},
    {label:'RX line (after pair) · samples', h:26, draw:laneLine},
    {label:'RX USART async frames', h:22, draw:laneFrames},
    {label:'RX main loop (PIC16F874)', h:24, draw:(c,X,t0,t1,y,h)=>{ if(!R.rx.off) lanePasses(c,X,t0,t1,y,h,R.rx.passes,tcyRX(),RXSTEPS); }},
    {label:'Relays 1–6', h:44, draw:(c,X,t0,t1,y,h)=>laneBars(c,X,t0,t1,y,h,6,r=>changesToSegs(R.rx.relays,e=>(e.v>>(r+2))&1),SIM.css('--accent'),['1','2','3','4','5','6'])},
  ];
}

/* ---------------- job catalogue (summary cards) ---------------- */
const JOBS = [
 {id:'ctv', dir:'CTV RS422 (+ ctv422tx, ctv422tx_2, ctv422rx)', yr:'2004–2006', cust:'CTV (custom job 553580)', title:'Synchronous RS422 contact-closure link', files:'PIC asm ×3 versions, C port, P-CAD PCB/BOM/netlist, Gerbers, CorelDRAW silk, panel and wiring DWGs, pin-out doc', what:'Six contact closures at one end operate six relays at the other over one RS422 data pair. PIC16F874 transmitter (txv100) and receiver (rxv100), 2004|37; ATmega128 ARX422 board, 2006|39.', main:true},
 {id:'940350', dir:'SYSTEM94/940350', yr:'1995', cust:'not named', title:'Console machine-control plate', files:'2 DWG', what:'Engraved control plate: MIC 1–4, PGM 1–4 MONO, AUX 1/2, MIX MINUS, METER SEL, STUDIO. Textured beige (452C) Texcote, sand 120 grit and paint.'},
 {id:'940356', dir:'SYSTEM94/940356', yr:'1995', cust:'CBC Gander', title:'Machine-control plate + turret connector', files:'2 DWG', what:'Custom plate plus an EDAC 38-pin turret plug wiring list (LEFT/RIGHT MON, shield pin, wiring side).'},
 {id:'940443', dir:'SYSTEM94/940443', yr:'1995', cust:'not named', title:'IKR-4A rear housing', files:'3 DWG', what:'Sheet-metal housing and rear panel: punch 0.380 sq, sandblast #13, grey Texcote, AC caution label, PEM nuts, welded corners.'},
 {id:'940444', dir:'SYSTEM94/940444', yr:'1994–1995', cust:'WBZ', title:'Renaissance MkI radio console', files:'59 DWG, 3 PCB, 444.TXT', what:'A full console drawing set, listed in 444.TXT: functional, input channels 1–10, two output channels, metering and mix-minus, aux stereo selector, control-room monitor, SAS APC-88 controller, meter panel, power supply, layout, front profile and about 30 connector layouts. Modules M900–M909, M833N, M837N, M2018P.'},
 {id:'940446', dir:'SYSTEM94/940446', yr:'1995', cust:'not named', title:'Large console PCB (M901A)', files:'1 Tango-PCB ASCII', what:'Tango-PCB Plus layout with 574 components on a 15.66 × 8.96 in board. The pattern list points to an M901A-family motherboard ' + inf + '.'},
 {id:'940447', dir:'SYSTEM94/940447', yr:'1995–1999', cust:'WBZ', title:'Renaissance MkII console (16 inputs)', files:'29 DWG, 1 BAK, 447.TXT', what:'447.TXT lists functional E 940447-01-001, input channels 1–16 in four sheets, studio and control-room monitors, SAS APC-88 controller, meter panel and connector layouts P5–P78.'},
 {id:'940448', dir:'SYSTEM94/940448', yr:'1995', cust:'WBZ', title:'Renaissance MkII — console-position wiring', files:'13 DWG, 448.TXT', what:'M907 output module at console position 3, PGM1/PGM2 mix-minus, positions 3–24 wiring.'},
 {id:'940449', dir:'SYSTEM94/940449', yr:'1995', cust:'WBZ', title:'Host turret', files:'14 DWG', what:'Front panel (NEWS 1/2, SPARE 1/2, MIC ON/OFF), EDAC 38-pin wiring, PEM studs, grey Texcote.'},
 {id:'960077', dir:'SYSTEM96/960077 - CFNY', yr:'1996–2001', cust:'CFNY', title:'Renaissance MkII console', files:'47 DWG, PLT, DWK', what:'Console with headset 1/2, talkback, mic-on tally/control, timer reset; Molex 24-pin module wiring; modules M901A/C, M905A, M907–M909.'},
 {id:'960193', dir:'SYSTEM96/960193', yr:'1996', cust:'not named', title:'MCOM28 communication-assignment terminal', files:'1 file with no extension (an AutoCAD R11/12 DWG)', what:'Rack-mount assignment terminal, source/destination layout for an MCOM28 intercom.'},
 {id:'960269', dir:'SYSTEM96/960269.DWG', yr:'1996', cust:'not named', title:'Single drawing (breaker)', files:'1 DWG, loose in SYSTEM96', what:'Only "BREAKER" was recovered from the drawing; job content unknown.'},
 {id:'4x1', dir:'SYSTEM97/4X1MIXER', yr:'1997', cust:'not named', title:'Custom 4×1 mixer', files:'2 DWG', what:'Functional drawing and views: inputs 1–4, outputs 1–2, talkback, master, AC power, and a control panel with 3 meters on an umbilical control cable.'},
 {id:'970004', dir:'SYSTEM97/970004', yr:'1997', cust:'NZ Public Radio', title:'Renaissance MkII console', files:'10 DWG, AC$', what:'P1 MUSIC/VOICE L/R sums, headphone select, AUX 1/2, EQ insert, treble, meter select.'},
 {id:'970009', dir:'SYSTEM97/970009-1', yr:'1997', cust:'NZ Public Radio', title:'M907 summing/output wiring', files:'2 DWG', what:'Console summing buses PGM1–PGM4 L/R and AUX, solid-state switch, M907 summing/output module (M901C/E, M905A, M908, M909).'},
 {id:'970029', dir:'SYSTEM97/970029', yr:'1997', cust:'Ontario Jockey Club', title:'12-fader control panel + turret base', files:'4 DWG', what:'Faders 1–12, input channels 1–4 wired identically, control cable by the customer, textured brown (438C) Texcote, spot-weld notes.'},
 {id:'970038', dir:'SYSTEM97/970038', yr:'1997', cust:'not named', title:'Meter-select legend', files:'1 DWG', what:'METER SEL legend: P1 MUSIC SUM, P1 VOICE SUM, P2–P4 SUM, AUX. Same bus names as 970004, so probably the same customer ' + inf + '.'},
 {id:'970042', dir:'SYSTEM97/970042', yr:'1997–2008', cust:'not named', title:'Renaissance MkII(A) turret and monitors', files:'12 DWG, 6 BAK, 7 PDF', what:'Headset/talkback turret, console positions 23A/24, additional M905A/M905B monitors. The PDFs are 2008|41 vector re-plots.'},
 {id:'970043', dir:'SYSTEM97/970043', yr:'1997', cust:'not named', title:'Renaissance MkII panel layout', files:'1 DWG', what:'Studio 1/2 talkback, inputs 1–16 in panels 1–3, 10×1 selectors, meter selectors.'},
 {id:'970077', dir:'SYSTEM97/970077', yr:'1997', cust:'CTV Agincourt', title:'Matrix intercom backplanes', files:'13 DWG, AC$', what:'Matrix inputs/outputs, buses 1–12, matrix and buffer-amplifier backplanes, studio IFBs, terminal I/O; M8501, M8512, M8548, M924A.'},
 {id:'970081', dir:'SYSTEM97/970081', yr:'1997', cust:'CTV Agincourt / Showcase Television', title:'Intercom functional', files:'2 DWG', what:'Matrix controller with status display, matrix amplifier, M8540 power supplies, control system.'},
 {id:'970082', dir:'SYSTEM97/970082', yr:'1997', cust:'Energy 108 / CING', title:'Renaissance MkII console', files:'27 DWG', what:'Turret, talkback, mic-on, headsets, machine control, A select; modules M8205, M901–M909.'},
 {id:'970120', dir:'SYSTEM97/970120', yr:'1997', cust:'CFMX', title:'Renaissance MkII — APC-88 interface', files:'2 DWG', what:'SAS APC-88 routing-switcher controller inputs and intercom.'},
 {id:'970177', dir:'SYSTEM97/970177', yr:'1997–1999', cust:'CBC Montreal', title:'MF-7 utility frame', files:'8 DWG, WPD, BAK', what:'MF-7 frame with M702D/M703D preamps, inputs A1–A6, outputs, wiring side with NC pins.'},
 {id:'970245', dir:'SYSTEM97/970245', yr:'1997', cust:'not named', title:'4×1 mixer control and connector panels', files:'3 DWG', what:'Mechanical for MIXER (4X1): control panel, connector panel, stiffener C9659, grey Texcote. The title matches SYSTEM97/4X1MIXER ' + inf + '.'},
 {id:'970280', dir:'SYSTEM97/970280 - Ontario Jockey Club', yr:'1997', cust:'Ontario Jockey Club', title:'Turret addition', files:'4 DWG', what:'Connector panel, ident/extraction cover, beige and brown Texcote; a follow-on to 970029.'},
 {id:'980001', dir:'SYSTEM98/980001', yr:'1998', cust:'not named', title:'Meter panel / display cover', files:'2 DWG, DWK, AC$', what:'Meter panel and display cover with connector bracket, punch 0.640 sq, beige (452C).'},
 {id:'980023', dir:'SYSTEM98/980023', yr:'1998', cust:'CBC Fredericton (and CBC Ottawa)', title:'Intercom matrix and keypad codes', files:'4 DWG', what:'M8512 buffer amps, M8524 24×4 matrix amplifier, IFB outputs, program-sound inputs; keypad prefix codes limited to four characters, 18 prefixes, set up by the assignment computer.'},
 {id:'980074', dir:'SYSTEM98/980074', yr:'1998–2000', cust:'not named', title:'Announce turret', files:'2 DWG, BAK', what:'Headset amp, mic-on control/tally, talkback 1/2, 10K dual pot level control; refers to a POD 6.'},
 {id:'980100', dir:'SYSTEM98/980100', yr:'1998–1999', cust:'CBC Fredericton', title:'Crosspoint wiring to M712B matrix', files:'6 DWG, BAK', what:'Unity inputs, crosspoint in/out/loop, M712B matrix modules A1–A16 (#16 AWG supply).'},
 {id:'980167', dir:'SYSTEM98/980167', yr:'1998', cust:'not named', title:'Meter bridge with Torpey clock', files:'2 DWG', what:'Meter panel/display cover and a wiring schematic with a Torpey clock data input and tie point.'},
 {id:'980233', dir:'SYSTEM98/980233', yr:'1998', cust:'not named', title:'Custom 2-channel panel', files:'1 DWG, 1 CorelDRAW 5', what:'CHANNEL 1/2 and CAL. Both parts are modified from obsolete stock supplied by the customer (stiffener C9659).', img:'systems-94-98-980233-panel.png'},
 {id:'980385', dir:'SYSTEM98/980385', yr:'1998–2000', cust:'CJEZ Radio', title:'Renaissance MkII — position 31', files:'12 DWG, BAK', what:'External cue inputs and controls 1/2, headset amp, Torpey timer reset, console position 31.'},
 {id:'980387', dir:'SYSTEM98/980387', yr:'1998–1999', cust:'CBC Iqaluit', title:'Renaissance MkII with host panel and producer turret', files:'47 DWG, DWK, BAK', what:'Host panel, producer turret, headsets, M901–M909 modules. The drawings spell the town two ways (IQALUIT / IQUALUIT).'},
 {id:'980464', dir:'SYSTEM98/980464 - TTC', yr:'1998–1999', cust:'TTC', title:'PA paging system', files:'18 DWG', what:'St. George station paging, zone page, typical zone-feed wiring, 0.5 A auto-reset protection, relay control and contacts.'},
 {id:'980468', dir:'SYSTEM98/980468', yr:'1998', cust:'not named', title:'Turret panel', files:'1 DWG', what:'Punch 0.755 sq at two pitches, radiused corners, beige Texcote.'},
 {id:'980477', dir:'SYSTEM98/980477', yr:'1999', cust:'not named', title:'Clock/timer panel', files:'1 DWG', what:'Six 0.640 sq punches, sandblast, grey Texcote, PEM studs.'},
 {id:'ttc', dir:'SYSTEM98/TTC', yr:'1998–1999', cust:'TTC', title:'TTC-1 Iss.1 zone relay card', files:'Tango PCB, DXF, PLT, DSN/DBK schematic, CorelDRAW silk, 2 DWG', what:'1.41 × 5.21 in card, 10 components: REL1, T1 (8-pin transformer), F1/F2, D1. Connectors AUDIO IN/OUT (− + G), RELAY CTL (L H G), +70 VOLT (CH G +), RELAY CONTACTS (C NO NC). It feeds one PA zone for 980464 ' + inf + '.', img:'systems-94-98-ttc1-silk.png'},
];
function jobCard(j){
  return card(`${j.title} <span class="muted small">· ${j.id==='ctv'?'CTV RS422':j.id.toUpperCase()}</span>`, `<div class="${j.img?'grid2':''}"><div>
    <table class="kv"><tr><th>Folder</th><td class="mono small">${j.dir}</td></tr><tr><th>Years</th><td>${j.yr.split('–').map(y=>SIM.year(+y)).join(' – ')}</td></tr><tr><th>Customer</th><td>${j.cust}</td></tr><tr><th>Files</th><td>${j.files}</td></tr></table>
    <p>${j.what}</p>${j.main?'<p class="small">This is the job with code, so it gets the full simulator below.</p>':'<p class="small muted">Drawings only (no code). This summary comes from the text recovered from each DWG/PCB/CDR sidecar in the folder.</p>'}</div>
    ${j.img?`<div><img src="${ASSET}${j.img}" alt="${j.title} artwork" style="max-width:100%;max-height:340px;background:#fff;border:1px solid var(--line);border-radius:6px"><p class="small muted">Rendered from the CorelDRAW file in the job folder (Inkscape/libcdr conversion).</p></div>`:''}</div>`);
}
function jobPicker(){
  const groups={}; JOBS.forEach(j=>{ const g=j.id==='ctv'?'CTV RS422 (2004–06)':j.dir.split('/')[0]; (groups[g]=groups[g]||[]).push(j); });
  return Object.keys(groups).map(g=>`<div class="small" style="margin:3px 0"><b style="display:inline-block;min-width:150px">${g}</b>${groups[g].map(j=>`<button data-job="${j.id}" class="${D.job===j.id?'on':''}" style="margin:2px;padding:2px 7px" title="${j.title}">${j.id==='ctv'?'CTV RS422 link ★':j.id.toUpperCase()}</button>`).join('')}</div>`).join('');
}

/* ---------------- Simulator tab ---------------- */
function viewSim(m){
  window.__s9498Active=true; keys();
  const draw=()=>{
    const j=JOBS.find(x=>x.id===D.job);
    let h=card('Job selector — #Custom Systems 94-98 (38 jobs)', jobPicker()+`<p class="small muted" style="margin:6px 0 0">★ = the main simulator. Every other job opens its summary card. All of them are listed in the Findings tab.</p>`) + jobCard(j);
    if (D.job==='ctv'){ const R=run(), ph=phaseAt(SIM.t);
      h+=`<div class="grid2"><div>${card('Transmitter (TX) — txv100.asm on a PIC16F874', `<div id="ftx"></div><div style="margin-top:6px" id="rem"></div><details style="margin-top:6px"><summary class="small">Rear panel</summary><div id="rtx"></div></details>`)}</div>
        <div>${card('Receiver (RX) — rxv100.asm on a PIC16F874', `<div id="frx"></div><div style="margin-top:6px" id="rel"></div><details style="margin-top:6px" open><summary class="small">Rear panel (click COM1 to unplug or plug the link)</summary><div id="rrx"></div></details>`)}</div></div>
        ${card('Scenario controls', `<div id="ctl"></div><p class="small muted" style="margin:6px 0 0">Panels are the real ARX422 silkscreen (vector from ${SIM.src('#CUSTOM #SYSTEMS/#Custom Systems 94-98/CTV RS422/ARX422-silk.cdr','CTV RS422/ARX422-silk.cdr')} (Aug 2006), half-rack 1 RU; drill rings, cut-outs and the WBS mark from the file, legends re-anchored because libcdr loses text alignment; painted extra-fine textured WBS black). The 2004|37 PIC firmware is shown driving them; that pairing is ${inf}. The ARX422's own AVR v200 firmware is not in the archive.</p>`)}
        ${card(`Timeline — ${ph.label} <span class="small muted">(click to seek; use the zoom menu for bytes and bits)</span>`, `<canvas id="tl"></canvas>`)}
        <div class="grid2">${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}${card('At the playhead', `<div id="now"></div>`)}</div>`; }
    m.innerHTML=h;
    m.querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>{ D.job=b.dataset.job; draw(); SIM.refresh(); });
    if (D.job==='ctv'){ m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl')); }
  };
  const upd=()=>{
    if (D.job!=='ctv') return; const t=SIM.t;
    const set=(id,html)=>{ const e=m.querySelector(id); if(e){ e.innerHTML=html; bindPanel(e);} };
    set('#ftx',frontSVG('tx',t)); set('#frx',frontSVG('rx',t)); set('#rem',remoteSVG(t)); set('#rel',relaySVG(t)); set('#rtx',rearSVG('tx')); set('#rrx',rearSVG('rx'));
    const ctl=m.querySelector('#ctl'); if (ctl && ctl.dataset.k!==RUNKEY+D.holdS){ ctl.innerHTML=controlsHTML(); bindControls(ctl); ctl.dataset.k=RUNKEY+D.holdS; }
    SIM.drawLanes(m.querySelector('#tl'), timelineLanes(), {labelW:170});
    const tr=m.querySelector('#trace'); tr.innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a remote button (or press keys 1–6) to close an input at the playhead.</div>';
    m.querySelector('#now').innerHTML=nowTable(t);
    const h2=m.querySelectorAll('.card h2'); h2.forEach(e=>{ if (e.textContent.startsWith('Timeline')) e.firstChild.textContent='Timeline — '+phaseAt(t).label+' '; });
  };
  draw(); SIM.on('time',()=>{ upd(); });
}
function nowTable(t){
  const R=run(), p=passAt(R.tx.passes,t), q=passAt(R.rx.passes,t), si=stepIn(p,t,tcyTX()), ri=stepIn(q,t,tcyRX()), b=byteAt(t);
  const v=p?p.v:null, w=q?q.v:null;
  return `<table class="kv">
   <tr><th>TX pass</th><td class="mono small">${p?`${TXSTEPS[si][0]} — ${p.br[si]||TXSTEPS[si][1]}`:'—'}</td></tr>
   <tr><th>TX vars</th><td class="mono small">${v?`input_reg ${hex(v.input_reg)} · mask ${hex(v.mask)} · tx1 ${hex(v.tx1)} · tx_send ${hex(v.tx_send)} · tx_complete ${bin(v.txc)} · delay1 ${v.delay1} · data_counter ${v.data_counter} · txcount ${v.txcount} · counterHI/LO ${v.cHI}/${v.cLO}`:'—'}</td></tr>
   <tr><th>On the wire</th><td class="mono small">${b?`byte ${b.n+1} = ${hex(b.v)}${b.data?` (data copy ${b.copy}/17)`:' (filler)'} · bit ${Math.floor((t-b.t0)/R.tx.bit)}`:'no byte shifting'} · RX line ${lineAt(R.line,t)}</td></tr>
   <tr><th>RX pass</th><td class="mono small">${q?`${RXSTEPS[ri][0]} — ${q.br[ri]||RXSTEPS[ri][1]}`:'—'}</td></tr>
   <tr><th>RX vars</th><td class="mono small">${w?`relay ${bin(w.relay)} · relay_set ${bin(w.set)} · delay1 ${w.d1.join(',')} · output_reg ${hex(w.out)}`:'—'}</td></tr></table>`;
}

/* ---------------- Tutorial ---------------- */
const inBurst=t=>phaseAt(t).k==='burst';
const LESSONS = [
 {title:'1 · Meet the pair', body:`<p>CTV had six contact closures in one place that had to operate six relays somewhere else. Ward-Beck built a transmitter and a receiver joined by one RS422 pair. The only operator document in the folder is <span class="mono">ctv-relay pinouts (553580).doc</span>. It says: <b>inputs</b> on the transmitter's DB25F (pins 1–6, grounds 14–19), <b>relays</b> on the receiver's DB25M (NC/NO/common), and DB9s for the link.</p><p>Look at both panels on the right. The LEDs under INPUTS/OUTPUTS 1–6 show the inputs (TX) and the relays (RX). Scrub the timeline: the default scenario already closes input 3 at 80 ms.</p>`, check:()=>true, auto:true},
 {title:'2 · Close input 1', body:'<p>Move the playhead somewhere quiet (for example 0.1 s) and click remote button <b>1</b>, or press the <b>1</b> key. That shorts TX P1 pin 1 to ground for the press length you chose.</p><p>The TX input LED 1 lights after about 4 loop passes (≈0.5 ms). <span class="mono">input</span> ORs the last four reads (input_minus1…4) to debounce.</p>', check:()=>D.presses.some(p=>p.b===1), hint:'Click the round button "1" under the TX panel.'},
 {title:'3 · The deliberate wait', body:`<p>Nothing goes out straight away. <span class="mono">bsf tx_complete,7</span> starts <span class="mono">delay500</span>, which counts 16 TMR2 flags of 53.3 ms (T2CON 0x7F, PR2 255 at 4.9152 MHz), about 0.8 s. Any other input closed during that time is ANDed into <span class="mono">tx1</span>, so it goes out in the same command.</p><p>Put the playhead inside the orange <b>delay500</b> band on the timeline.</p>`, check:()=>phaseAt(SIM.t).k==='delay', hint:'The orange band starts just after your press.'},
 {title:'4 · The burst on the wire', body:'<p>When the delay ends, <span class="mono">transmit</span> sends 2500 bytes (20 000 bits) on RC7, clocked on RC6. Nine 0x00 fillers, then the data byte, 17 times. After that it sends only 0x00.</p><p>Put the playhead in the green burst and choose <b>Zoom window → 500 µs</b> or smaller to see individual bytes and bits.</p>', check:()=>inBurst(SIM.t) && SIM.win<=0.0031, hint:'Seek into the green band, then pick 3 ms or 500 µs in the zoom menu.'},
 {title:'5 · Relay 1 operates', body:'<p>The receiver ignores the clock pair. Its USART is set up as <b>asynchronous</b> (TXSTA = 0x04). The data byte\'s marker bit, after the pair\'s inversion, becomes the async <b>start bit</b>. The 0x00 fillers become idle "mark" (see Software).</p><p>Find the moment relay 1 closes: C–NO goes green on the relay strip and RX LED 1 lights.</p>', check:()=>!!((rxRel(SIM.t)>>2)&1), hint:'Relay 1 pulls in about 1 ms after the first data copy and holds for 8×256 receiver passes.'},
 {title:'6 · Two inputs, one command', body:'<p>Close input 2, then input 5 within the same ≈0.8 s window (move the playhead about 0.2 s between the two clicks). Both bits ride in the same data byte, so relays 2 and 5 operate together.</p>', check:()=>run().tx.bursts.some(b=>[2,3,4,5,6,7].filter(k=>!((b.tx_send>>k)&1)).length>=2), hint:'Two different buttons inside one orange band.'},
 {title:'7 · Hold a button', body:'<p>Set <b>Press length → 1.5 s (hold)</b> and close an input. <span class="mono">debounce_hold_mask</span> blocks a held input from being sent twice. But the held input still sets <span class="mono">tx_complete,7</span>, so the transmitter keeps sending <b>empty</b> bursts (data 0x01) for as long as you hold. The receiver decodes them to "no relay".</p>', check:()=>run().tx.bursts.some(b=>b.tx_send===0xFF), hint:'Choose 1.5 s, then click a button early in the run (about 0.05 s).'},
 {title:'8 · Pull the cable', body:'<p>Click <b>COM1</b> on the receiver\'s rear panel (or "Unplug cable"). The transmitter carries on exactly as before: there is no acknowledge, so it has no way to know.</p>', check:()=>!D.cable, hint:'Rear panel of the RX unit → COM1.'},
 {title:'9 · Why the crystals matter', body:`<p>Plug the cable back in and set <b>RX crystal → 4.9152 MHz</b>, the same as the transmitter. The async receiver then runs at 76.8 kbit/s against a 55.85 kbit/s stream. It samples the wrong bits, so relays drop out or the wrong ones operate. The archive does not say which crystal the receiver had. 3.579545 MHz is the value at which the code works (${inf}).</p>`, check:()=>D.cable && D.rxX!=='3.579545', hint:'Use the RX crystal menu.'},
 {title:'10 · Cold power-up', body:'<p>Set <b>Power-up RAM → cold: all 0x00</b>. <span class="mono">init</span> never loads <span class="mono">tx1</span>, <span class="mono">counterHI</span> or <span class="mono">counterLO</span>. With zeros in RAM, the first command goes out as 0xFF, which the receiver ignores, and the first burst runs for 64 006 bytes instead of 2500.</p>', check:()=>D.ram==='zero', hint:'Use the Power-up RAM menu, then scrub the timeline.'},
 {title:'Done', body:'<p>You have used every input, cable and option of the pair. <b>Software</b> traces each byte through both programs, <b>One second</b> breaks the link down to sample points, and <b>Findings</b> lists what the code is really doing, along with every other job in the folder.</p>', check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__s9498Active=true; keys(); D.job='ctv';
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — operating the CTV RS422 relay link', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the software did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The pair', `<div class="small muted">TX</div><div id="ftx"></div><div id="rem" style="margin:4px 0"></div><div class="small muted">RX</div><div id="frx"></div><div id="rel" style="margin:4px 0"></div><div id="rrx"></div><div id="ctl" style="margin-top:6px"></div>`)}${card('Timeline', `<canvas id="tl"></canvas>`)}</div></div>`;
  const draw=()=>{
    const t=SIM.t, set=(id,h)=>{ const e=m.querySelector(id); e.innerHTML=h; bindPanel(e); };
    set('#ftx',frontSVG('tx',t)); set('#frx',frontSVG('rx',t)); set('#rem',remoteSVG(t)); set('#rel',relaySVG(t)); set('#rrx',rearSVG('rx'));
    const ctl=m.querySelector('#ctl'); if (ctl.dataset.k!==RUNKEY+D.holdS+D.cable){ ctl.innerHTML=controlsHTML(); bindControls(ctl); ctl.dataset.k=RUNKEY+D.holdS+D.cable; }
    SIM.drawLanes(m.querySelector('#tl'), timelineLanes().filter((l,i)=>[0,2,4,7,9].includes(i)), {labelW:150});
    const tr=m.querySelector('#trace'); tr.innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Nothing yet.</div>';
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; SIM.seek(0); draw(); };
  };
  SIM.on('time',draw);
}

/* ---------------- One second, frame by frame ---------------- */
function viewSecond(m){
  window.__s9498Active=false; D.job='ctv';
  m.innerHTML=`${card('One second (here two), broken down', `<div id="ladder"></div>`)}
   <div class="grid2">${card('As the devices see it', `<div id="dev"></div>`)}${card('As the panels show it', `<div id="ftx"></div><div style="height:6px"></div><div id="frx"></div><div id="rel" style="margin-top:6px"></div>`)}</div>
   ${card('Bit-level scope at the playhead (snaps to the nearest async frame within 2 ms)', `<canvas id="scope"></canvas><p class="small muted">Top to bottom: the TX clock (RC6), TX data (RC7, LSB first, ${(1e6*bitTX()).toFixed(2)} µs per bit), the line at the RX after the pair, and the RX USART's start, data and stop sample points (${(1e6*bitRX()).toFixed(2)} µs per bit). The data byte's marker bit 0 becomes the start bit, so RX bit j is TX bit j+1, inverted.</p>`)}
   ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{
    const R=run(), t=SIM.t, bt=R.tx.bit, a=bitRX(), b0=R.tx.bursts[0];
    const txIdle=R.tx.passes[20], busyL=R.tx.passes.filter(p=>p.v.txc&2), txBusy=busyL[busyL.length>>1];
    const pi=txIdle?txIdle.t1-txIdle.t0:0, pb=txBusy?txBusy.t1-txBusy.t0:0, rp=R.rx.passes[10]?R.rx.passes[10].t1-R.rx.passes[10].t0:0;
    const rows=[
      ['TMR2IF flags (delay500 timebase)', (1/R.tx.tick).toFixed(2), ms(R.tx.tick), 'Tcy × 16 × 256 × 16; 16 of them = the ≈0.8 s wait'],
      ['TX main-loop passes, idle', pi?Math.round(1/pi).toLocaleString():'—', pi?us(pi):'', `≈${Math.round(pi/tcyTX())} instruction cycles (counted from txv100.asm) ${inf}`],
      ['TX main-loop passes, transmitting', pb?Math.round(1/pb).toLocaleString():'—', pb?us(pb):'', 'input returns at once; TRMT is polled once per pass'],
      ['RS422 bytes in a burst', b0&&b0.t0!==null?Math.round(b0.nBytes/((b0.done||DUR)-b0.t0)).toLocaleString():'—', b0&&b0.t0!==null?us(((b0.done||DUR)-b0.t0)/b0.nBytes):'', '8 bits each, plus the gap until the next pass sees TRMT'],
      ['RS422 bits (sync clock)', Math.round(1/bt).toLocaleString(), us(bt), `SPBRG 21: Fosc/(4·22) = ${(1/bt/1000).toFixed(3)} kbit/s ("56K")`],
      ['Data copies per burst', '17 in the first 170 bytes', b0&&b0.copies[1]?us(b0.copies[1].t0-b0.copies[0].t0):'', 'one byte in ten (txcount 10)'],
      ['RX async bits', Math.round(1/a).toLocaleString(), us(a), `BRGH=1, SPBRG 3: Fosc/64 = ${(1/a/1000).toFixed(3)} kbit/s (${(((1/a)/(1/bt)-1)*100).toFixed(2)} % against TX)`],
      ['RX main-loop passes', rp?Math.round(1/rp).toLocaleString():'—', rp?us(rp):'', `≈${rp?Math.round(rp/tcyRX()):0} cycles; RCREG must be read before the third frame arrives`],
      ['Relay pulse', '—', rp?ms(2048*rp):'', 'relay_count 8 × 256 passes, however long the input was held'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>where it comes from</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">The run lasts ${DUR} s because the designed wait plus the burst is longer than one second. Use the transport's Step menu to move one TMR2 tick, one loop pass, one byte or one bit at a time.</p>`;
    m.querySelector('#dev').innerHTML=nowTable(t)+`<p class="small">${phaseAt(t).label}.</p>`;
    const set=(id,h)=>{ const e=m.querySelector(id); e.innerHTML=h; bindPanel(e); }; set('#ftx',frontSVG('tx',t)); set('#frx',frontSVG('rx',t)); set('#rel',relaySVG(t));
    drawScope(m.querySelector('#scope'),t); drawLadder(m.querySelector('#zl'),t);
  };
  SIM.on('time',draw);
}
function drawScope(cv,t){
  const R=run(), bt=R.tx.bit, a=bitRX(); const span=12*Math.max(a,bt); let t0=t-span*0.25;
  // centre on the frame or data byte nearest the playhead
  const F=R.rx.frames; let best=null; { const k=bs(F,t,'ts'); [k,k+1].forEach(i=>{ if(i>=0&&i<F.length&&Math.abs(F[i].ts-t)<0.002&&(!best||Math.abs(F[i].ts-t)<Math.abs(best.ts-t))) best=F[i]; }); } if (best) t0=best.ts-1.5*bt;
  const t1=t0+span, H=200, {c,w}=SIM.canvas(cv,H), x0=110, pw=w-x0-10, X=tt=>x0+(tt-t0)/span*pw;
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), bad=SIM.css('--bad'), warn=SIM.css('--warn');
  c.font='11px '+SIM.css('--sans'); c.fillStyle=ink; ['RC6 CK (TX)','RC7 DT (TX)','line at RX','RX samples'].forEach((l,i)=>c.fillText(l,6,30+i*46));
  const B=R.tx.bytes, i0=Math.max(0,bs(B,t0,'t0')), i1=bs(B,t1,'t0');
  c.strokeStyle=ink2; c.beginPath(); c.moveTo(x0,40);
  for (let i=i0;i<=i1&&i>=0;i++){ const b=B[i]; for(let k=0;k<8;k++){ const s0=b.t0+k*bt; c.lineTo(X(s0),40); c.lineTo(X(s0),20); c.lineTo(X(s0+bt/2),20); c.lineTo(X(s0+bt/2),40); } } c.lineTo(w-10,40); c.stroke();
  // DT
  c.strokeStyle=acc; c.lineWidth=2; c.beginPath(); let lv=0; const pb=B[i0-1]; if (i0<=i1 && B[i0].t0>t0 && i0>0) lv=(B[i0-1].v>>7)&1; c.moveTo(x0, lv?66:86);
  for (let i=i0;i<=i1&&i>=0;i++){ const b=B[i]; if (b.t0<t0 && b.t1<t0) { lv=(b.v>>7)&1; continue; } for (let k=0;k<8;k++){ const nl=(b.v>>k)&1, x=X(Math.max(t0,b.t0+k*bt)); c.lineTo(x, lv?66:86); lv=nl; c.lineTo(x, lv?66:86); if (X(b.t0+(k+1)*bt)-x>18){ c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText('b'+k,x+3,96);} } } c.lineTo(w-10, lv?66:86); c.stroke();
  // line
  c.strokeStyle=warn; c.beginPath(); const tr=R.line.tr; let li=Math.max(0,bs(tr,t0)); let l=tr[li].l; c.moveTo(x0,l?112:132);
  for (let i=li+1;i<tr.length&&tr[i].t<=t1;i++){ const x=X(tr[i].t); c.lineTo(x,l?112:132); l=tr[i].l; c.lineTo(x,l?112:132); } c.lineTo(w-10,l?112:132); c.stroke(); c.lineWidth=1;
  // samples
  const j0=Math.max(0,bs(F,t0-10*a,'ts')), j1=bs(F,t1,'ts');
  for (let j=j0;j<=j1&&j>=0;j++){ const f=F[j]; const pts=[[f.ts+0.5*a,'S',0],...f.samp.map((s,k)=>[s,'d'+k,(f.R>>k)&1]),[f.stopT,'P',f.ferr?0:1]];
    pts.forEach(([tt,lab,v])=>{ const x=X(tt); if (x<x0||x>w) return; c.strokeStyle=bad; c.beginPath(); c.moveTo(x,104); c.lineTo(x,150); c.stroke(); c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(lab,x-6,164); c.fillText(String(v),x-3,178); });
    if (X(f.tc)>x0) { c.fillStyle=f.ferr?bad:acc; c.font='11px '+SIM.css('--mono'); c.fillText(`frame ${hex(f.R)}${f.ferr?' FERR':''}${!f.ferr&&(f.R&1)?' → bit0=1 accepted':!f.ferr?' → ignored':''}`, Math.max(x0,X(f.ts)), 194); } }
  const px=X(t); c.strokeStyle=SIM.css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(px,8); c.lineTo(px,H); c.stroke(); c.lineWidth=1;
}
function drawLadder(cv,t){
  const R=run(), bt=R.tx.bit; const levels=[['2 s run',DUR],['delay tick',R.tx.tick],['10-byte group',80*bt*1.1],['1 byte',8*bt],['1 bit',bt]];
  const H=levels.length*40+8, {c,w}=SIM.canvas(cv,H), x0=150, pw=w-x0-10;
  levels.forEach(([nm,span],i)=>{ const y=6+i*40, a=Math.max(0,Math.min(DUR-span,t-span/2)); c.fillStyle=SIM.css('--ink'); c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+18);
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(x0,y+2,pw,30); const X=tt=>x0+(tt-a)/span*pw;
    c.save(); c.beginPath(); c.rect(x0,y+2,pw,30); c.clip(); laneBytes(c,X,a,a+span,y+2,30); c.restore();
    c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(X(t),y); c.lineTo(X(t),y+34); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1], na=Math.max(0,Math.min(DUR-ns,t-ns/2)); c.fillStyle=SIM.css('--play'); c.globalAlpha=.15; c.fillRect(X(na),y+2,Math.max(2,ns/span*pw),30); c.globalAlpha=1; } });
}

/* ---------------- block diagram ---------------- */
const BLOCKS_PIC = {
  ins:{x:10,y:20,w:150,h:70,t:'Contact closures',s:['DB25F pins 1–6','ground 14–19'],d:'Customer buttons or tallies short an input to ground (ctv-relay pinouts doc, "Transmiter inputs, db25F").'},
  piso:{x:200,y:20,w:150,h:70,t:'Input shift register',s:['RC1 load · RA2 clk · RA4 data'],d:'The input routine pulses RC1 (load), then reads RA4 and clocks RA2 seven times: inputs 6…1, then the spare/MIX key into input2. That suggests a 74HC165-type parallel-in shift register '+inf+'.'},
  txpic:{x:390,y:20,w:180,h:110,t:'TX PIC16F874',s:['txv100.asm v1.00 (25 Mar 2004)','4.9152 MHz (inferred from "56K")','USART sync master','TMR2 53.3 ms ticks'],d:'One polled main loop, no interrupts (ORG 4: RETFIE). input → delay_setup → delay500 → transmit → output_led. 4-pass debounce, ≈0.8 s gather window, then a 2500-byte burst with 17 copies of the command.'},
  txled:{x:200,y:120,w:150,h:60,t:'LED shift chain',s:['RA3 data · RA2 clk · RA5 strobe'],d:'8 bits: switch 6…1, spare, mix. A 0 lights an LED ("bsf status1,1 ;turn on slave led" writes a 0), so the LEDs are active-low. 74HC4094-type latch '+inf+'.'},
  drv:{x:610,y:20,w:150,h:70,t:'RS422 drivers',s:['Tx Data± 7/2 · Tx Clock± 3/8'],d:'The TX DB9F carries data and clock pairs (doc). The driver part is not in the folder for the PIC unit. The ARX422 used LTC1480/DS75176 '+inf+'.'},
  cable:{x:610,y:140,w:150,h:50,t:'Cable',s:['one data pair used'],d:'The receiver DB9M has only Rx Data− (2) and Rx Data+ (7). The clock pair goes nowhere at the RX end.'},
  rcv:{x:610,y:230,w:150,h:60,t:'RS422 receiver',s:['pair inverted (inferred)'],d:'For the async receiver to idle at "mark" while the TX sends 0x00 fillers, the receiver must see the line inverted (A/B crossed somewhere) '+inf+'.'},
  rxpic:{x:390,y:220,w:180,h:110,t:'RX PIC16F874',s:['rxv100.asm v1.00','USART ASYNC (TXSTA 0x04)','SPBRG 3, BRGH=1 → Fosc/64','crystal not stated'],d:'receive → translate_relay → output_relay → output_led. A frame with bit0=1 is accepted, shifted left (rlf), and becomes relay_reg (0 = operate). Each relay then pulses for 8×256 passes.'},
  rdrv:{x:200,y:220,w:150,h:70,t:'Relay latch + driver',s:['RC4 data · RC5 clk · RC3 strobe','→ ULN2803 → G5V ×6'],d:'Eight clocks: two zeros, then relays 1–6, so relay 1 ends up on Q6 and relay 6 on Q1. The ARX422 netlist wires U1 Q6 → U2 → REL1 and Q1 → REL6, the same order.'},
  rel:{x:10,y:220,w:150,h:70,t:'Relay contacts',s:['DB25M NC 2k−1 · NO 2k','common 12+2k'],d:'From the doc and confirmed by arx422iss1.net (P2-1 REL1 NC, P2-2 REL1 NO, P2-14 REL1 common).'},
  rxled:{x:200,y:310,w:150,h:50,t:'RX LEDs',s:['output_reg = ~relay'],d:'The same 8-bit LED chain as the TX. The spare and mix bits are always 1 (off).'},
};
const WIRES_PIC=[['ins','piso','6 inputs'],['piso','txpic','RA4'],['txpic','txled',''],['txpic','drv','RC6 CK · RC7 DT'],['drv','cable',''],['cable','rcv','data pair'],['rcv','rxpic','RC7/RX'],['rxpic','rdrv','RC3-5'],['rdrv','rel',''],['rxpic','rxled','RA2/3/5']];
const BLOCKS_ARX = {
  mcu:{x:270,y:120,w:190,h:120,t:'U13 ATmega128(L)',s:['X1 4.9152 MHz','JTAG1 (PF4–PF7)','UART0 → COM1','USART1 → COM2'],d:'arx422iss1.net: CPU_RX = PE0 (pin 2), CPU_TX = PE1 (pin 3) to U8 and U10; PD2/RXD1 (pin 27) from U11; PD3/TXD1 (28) and PD5/XCK1 (30) to U12 through the TXD / TCLK links. The firmware (Software/atmel/v100, v200) folders are empty.'},
  com1:{x:520,y:30,w:200,h:80,t:'COM1 (J1 DB9)',s:['U8 LTC1480 rx: pins 2/7','U10 LTC1480 tx: pins 3/8','DE/RE ← PE4 / PE3'],d:'Pins 2 (B) and 7 (A) go to receiver U8, so the board can be the "Receiver DB9M" in the doc. Pins 3/8 carry a copy of CPU_TX.'},
  com2:{x:520,y:140,w:200,h:90,t:'COM2 (J4 DB9)',s:['U11 75176 RO → RXD1: 2/7','U12 75176 DI ← TXD1 or XCK1','TCLK = 0R fitted, TXD = SOT'],d:'U12 can send the USART1 clock (XCK1) through TCLK, but U12\'s receiver output is not connected, so the board can be a synchronous master and never a synchronous slave. That fits the AVR C port, which uses async UART0 at 57.6k.'},
  rel:{x:520,y:260,w:200,h:80,t:'Relays',s:['U1 4094 → U2 ULN2803','REL1–6 G5V → P2 DB25M','U4/U3 DNI → P8'],d:'ST/CLK/DATA on PE5/PE7/PE6 (pins 7/9/8). Q1..Q6 → REL6..REL1. A second open-collector bank (U4 4094 + U3 ULN2803 → P8) is marked DNI.'},
  leds:{x:20,y:260,w:200,h:80,t:'20 LEDs + PWR',s:['U5→U6→U7 74HC4094','DATALED PB4 · CLKLED PB3 · STLED PB5'],d:'LED1–LED20 (yellow, 330R) cascade through three 4094s. Front panel: COM 1–2 and INPUTS/OUTPUTS 1–18 = 20 LEDs, plus a green PWR LED.'},
  gpi:{x:20,y:120,w:200,h:90,t:'16 GPI',s:['GPI-1..8 → PC0–PC7','GPI-9..16 → PA7–PA0','1K series + 1K pull-up','P6 / P7 headers → rear DB25s'],d:'Each GPI has a 1K series resistor and a 1K pull-up to +5 V. Taking P6/P7 to rear P1/P3 is inferred from the panel.'},
  exp:{x:20,y:30,w:200,h:60,t:'Expansion P4 / P5',s:['STEX/CLKEX/DATAEX 1-2'],d:'PAN900 headers with strobe/clock/data on PG3/PG4/PD6 and PD7/PG0/PG1, perhaps for remote panels '+inf+'.'},
  psu:{x:270,y:30,w:190,h:60,t:'Power',s:['ACIN → PWRSW → PSU1 VAF1005','+5 V'],d:'Built-in VAF1005 supply, panel power switch, 115 VAC 1/2 A slow-blow (rear silk).'},
};
const WIRES_ARX=[['mcu','com1','UART0'],['mcu','com2','USART1'],['mcu','rel','PE5-7'],['mcu','leds','PB3-5'],['gpi','mcu','PA/PC'],['exp','mcu',''],['psu','mcu','+5 V']];
function viewBlock(m){
  window.__s9498Active=false; let set='pic', sel='txpic';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div style="margin-bottom:6px"><button data-s="pic">2004|37 PIC pair (code)</button> <button data-s="arx">2006|39 ARX422 board (netlist)</button></div><div id="bd"></div>`)}</div><div>${card('Block', `<div id="bi"></div>`)}${card('In one sentence', `<p>A held contact at one end becomes one async-compatible byte, sent 17 times inside a 20 000-bit synchronous burst. The receiver catches it as a normal UART frame and pulses the matching relay for about a third of a second.</p>`)}</div></div>`;
  const draw=()=>{
    const B=set==='pic'?BLOCKS_PIC:BLOCKS_ARX, W=set==='pic'?WIRES_PIC:WIRES_ARX; if(!B[sel]) sel=Object.keys(B)[0];
    m.querySelectorAll('[data-s]').forEach(b=>b.classList.toggle('on',b.dataset.s===set));
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 780 ${set==='pic'?370:360}" style="width:100%"><defs><marker id="ar9" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l])=>{ const P=B[a],Q=B[b]; let [x1,y1]=ctr(P),[x2,y2]=ctr(Q); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; }; [x1,y1]=clip(P,x1,y1,x2,y2); [x2,y2]=clip(Q,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ar9)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in B){ const b=B[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<h3>${B[sel].t}</h3><p>${B[sel].d}</p>`;
  };
  m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ set=b.dataset.s; sel=set==='pic'?'txpic':'mcu'; draw(); });
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=24+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${pin}</text>${net?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS=[
 {name:'1 · TX PIC16F874 (from txv100.asm)', note:'Port use comes from the code (TRISA 0x10, TRISB 0xEF, TRISC 0x3C, ADCON1 PCFG 0111 = all digital). No netlist exists in the folder for the 2004|37 TX board, so the surrounding parts are inferred.', svg:()=>
   chip(330,60,190,'PIC16F874 (TX)',[['RA4 in','PB_DATA ← input SR'],['RA2','PB/LED CLOCK (shared)'],['RC1','INPUT LOAD'],['RA3','LED DATA'],['RA5','LED STROBE'],['OSC1/2','4.9152 MHz ('+'inferred)']],[['RC6/CK','TX CLOCK → driver'],['RC7/DT','TX DATA → driver'],['RC0','serial TX enable (bsf)'],['RB4','end-of-burst strobe'],['TMR2','T2CON 0x7F, PR2 255'],['USART','TXSTA 0xB0 · SPBRG 21']],'MPASM v1.00 · 25 Mar 2004')
   +`<rect x="40" y="70" width="150" height="110" fill="none" stroke="var(--ink)"/><text x="115" y="95" text-anchor="middle" font-size="11.5" fill="var(--ink)">74HC165-type</text><text x="115" y="112" text-anchor="middle" font-size="10" fill="var(--ink2)">(inferred) IN1..6, MIX</text><text x="115" y="160" text-anchor="middle" font-size="10" fill="var(--ink2)">DB25F 1–6 / gnd 14–19</text>
     <rect x="40" y="250" width="150" height="70" fill="none" stroke="var(--ink)"/><text x="115" y="275" text-anchor="middle" font-size="11.5" fill="var(--ink)">LED latch (4094-type)</text><text x="115" y="292" text-anchor="middle" font-size="10" fill="var(--ink2)">sw6..1, spare, mix · active low</text>
     <rect x="660" y="70" width="160" height="80" fill="none" stroke="var(--ink)"/><text x="740" y="95" text-anchor="middle" font-size="11.5" fill="var(--ink)">RS422 drivers ×2</text><text x="740" y="112" text-anchor="middle" font-size="10" fill="var(--ink2)">DB9F: data 7(+)/2(−)</text><text x="740" y="127" text-anchor="middle" font-size="10" fill="var(--ink2)">clock 3(+)/8(−)</text>`},
 {name:'2 · RX PIC16F874 (from rxv100.asm)', note:'TRISC 0xC4 (RC7/RX, RC6, RC2 in; RC0, RC1, RC3–5 out), TRISB 0xFF. RC0 is cleared ("serial rx enable"), so a transceiver is held in receive. The relay latch order matches ARX422 U1→U2→REL wiring.', svg:()=>
   chip(330,60,190,'PIC16F874 (RX)',[['RC7/RX','RX DATA ← receiver'],['RC0','rx enable (bcf)'],['RA2','LED CLOCK'],['RA3','LED DATA'],['RA5','LED STROBE'],['OSC1/2','crystal not stated']],[['RC3','RELAY STROBE'],['RC4','RELAY DATA'],['RC5','RELAY CLOCK'],['USART','TXSTA 0x04 async, BRGH=1'],['RCSTA','0x90 SPEN+CREN'],['SPBRG','3 → Fosc/64']],'MPASM v1.00')
   +`<rect x="660" y="60" width="170" height="150" fill="none" stroke="var(--ink)"/><text x="745" y="82" text-anchor="middle" font-size="11.5" fill="var(--ink)">4094 → ULN2803</text>${[1,2,3,4,5,6].map(k=>`<text x="672" y="${100+k*16}" font-size="10" fill="var(--ink2)">Q${7-k} → REL${k} → NC ${2*k-1} / NO ${2*k} / C ${12+2*k}</text>`).join('')}
     <rect x="40" y="70" width="150" height="80" fill="none" stroke="var(--ink)"/><text x="115" y="95" text-anchor="middle" font-size="11.5" fill="var(--ink)">RS422 receiver</text><text x="115" y="112" text-anchor="middle" font-size="10" fill="var(--ink2)">DB9M 7 = Rx Data+</text><text x="115" y="127" text-anchor="middle" font-size="10" fill="var(--ink2)">2 = Rx Data−, 5 = gnd</text>`},
 {name:'3 · ARX422 U13 ATmega128 (netlist)', note:'Pin → net copied from arx422iss1.net (P-CAD, 14–16 Mar 2006|39). Pin functions are from the ATmega128 TQFP-64 pin-out.', svg:()=>
   chip(320,40,210,'U13 ATMEGA128(L)',[['2 PE0/RXD0','CPU_RX'],['3 PE1/TXD0','CPU_TX'],['5 PE3','U10 DE/RE'],['6 PE4','U8 DE/RE'],['7 PE5','ST (relay)'],['8 PE6','DATA (relay)'],['9 PE7','CLK (relay)'],['10 PB0','STOC'],['11 PB1','DATAOC'],['12 PB2','CLKOC'],['13 PB3','CLKLED'],['14 PB4','DATALED'],['15 PB5','STLED'],['18 PG3','STEX1'],['19 PG4','CLKEX1']],[['23/24 XTAL','X1 4.9152 MHz'],['26 PD1','U11 DE/RE'],['27 PD2/RXD1','U11 RO'],['28 PD3/TXD1','→ TXD link'],['29 PD4','U12 DE/RE'],['30 PD5/XCK1','→ TCLK link (0R)'],['31 PD6','DATAEX1'],['32 PD7','STEX2'],['33 PG0','CLKEX2'],['34 PG1','DATAEX2'],['35–42 PC0–7','GPI-1..8'],['44–51 PA7–0','GPI-9..16'],['54–57 PF7–4','JTAG1'],['20 RESET','JTAG1-6, R35 10K, C50']],'ARX422-ISS1 · arx422iss1.net')},
 {name:'4 · ARX422 RS422 ports', note:'U8/U10 are LTC1480CS8 and U11/U12 are DS75176 (BOM), all in the 75176 pin-out: 1 RO, 2 /RE, 3 DE, 4 DI, 6 A, 7 B. R22/R27/R36/R53, R41/R42/R54/R55 are 2K bias resistors.', svg:()=>
   chip(120,60,120,'U8 LTC1480',[['1 RO','CPU_RX'],['2,3 /RE DE','PE4'],['4 DI','CPU_TX']],[['6 A','J1-7'],['7 B','J1-2']],'COM1 receive')
   +chip(120,230,120,'U10 LTC1480',[['2,3 /RE DE','PE3'],['4 DI','CPU_TX']],[['6 A','J1-3'],['7 B','J1-8']],'COM1 transmit')
   +chip(560,60,120,'U11 DS75176',[['1 RO','PD2/RXD1'],['2,3 /RE DE','PD1'],['4 DI','(no net)']],[['6 A','J4-7'],['7 B','J4-2']],'COM2 receive')
   +chip(560,230,120,'U12 DS75176',[['1 RO','(no net)'],['2,3 /RE DE','PD4'],['4 DI','TCLK 0R ← XCK1 / TXD SOT ← TXD1']],[['6 A','J4-3'],['7 B','J4-8']],'COM2 transmit')},
 {name:'5 · ARX422 relays and LEDs', note:'From arx422iss1.net and the pin-out doc. U4 (4094) and U3 (ULN2803) are DNI, and so is header P8.', svg:()=>
   chip(80,60,120,'U1 74HC4094',[['1 STR','ST (PE5)'],['2 D','DATA (PE6)'],['3 CP','CLK (PE7)']],[['4 Q1','U2-1 → REL6'],['5 Q2','U2-2 → REL5'],['6 Q3','U2-3 → REL4'],['7 Q4','U2-4 → REL3'],['14 Q5','U2-5 → REL2'],['13 Q6','U2-6 → REL1']],'relay latch')
   +`<rect x="420" y="40" width="200" height="${6*24+20}" fill="none" stroke="var(--ink)"/><text x="520" y="32" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">REL1–6 G5V → P2 DB25M</text>${[1,2,3,4,5,6].map(k=>`<text x="430" y="${62+(k-1)*24}" font-size="10.5" fill="var(--ink)">REL${k}: NC→P2-${2*k-1} · NO→P2-${2*k} · C→P2-${12+2*k}</text>`).join('')}
     ${chip(80,280,120,'U5→U6→U7 4094',[['1 STR','STLED (PB5)'],['2 D','DATALED (PB4)'],['3 CP','CLKLED (PB3)']],[['Q1..Q8','LED1..LED8 (U5)'],['QS→D','U6 LED9..16'],['QS→D','U7 LED17..20']],'20 yellow LEDs, 330R')}`},
];
function viewSchem(m){
  window.__s9498Active=false; let i=0;
  m.innerHTML=card('Schematic set (redrawn from code and netlist; not the original P-CAD drawings)', `<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">The original ARX422 schematic is <span class="mono">CTV RS422/arx422iss1.sch</span> (P-CAD 2002, binary). Sheets 3–5 come from its netlist. Sheets 1–2 are built from the PIC code's port use, because the 2004|37 PIC boards have no netlist in the folder. Blue labels are nets.</p>`);
  const draw=()=>{ m.querySelector('#t2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#t2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 880 440" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="5" y="5" width="870" height="430" fill="none" stroke="var(--line)"/><text x="866" y="428" text-anchor="end" font-size="10" fill="var(--ink2)">Custom Systems 94-98 · CTV RS422 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`; m.querySelector('#shn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- Software ---------------- */
function loopSVG(steps,cur,title,branch){
  const n=steps.length, w=Math.min(150,820/n-8); let s=`<svg viewBox="0 0 840 130" style="width:100%;max-width:920px"><text x="6" y="14" font-size="12" font-weight="700" fill="var(--ink)">${title}</text>`;
  steps.forEach((st,i)=>{ const x=6+i*(w+8); const on=i===cur; s+=`<rect x="${x}" y="24" width="${w}" height="46" rx="6" fill="${on?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1}"/><text x="${x+w/2}" y="51" text-anchor="middle" font-size="10.5" font-family="var(--mono)" fill="var(--ink)">${st[0].length>20?st[0].slice(0,19)+'…':st[0]}</text>`; if(i<n-1) s+=`<line x1="${x+w}" y1="47" x2="${x+w+8}" y2="47" stroke="var(--ink2)"/>`; });
  s+=`<path d="M${6+(n-1)*(w+8)+w/2},70 L${6+(n-1)*(w+8)+w/2},86 L${6+w/2},86 L${6+w/2},72" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3"/><text x="420" y="100" text-anchor="middle" font-size="10" fill="var(--ink2)">goto main</text>`;
  s+=`<text x="6" y="122" font-size="11" font-family="var(--mono)" fill="var(--accent2)">${(branch||'').replace(/</g,'&lt;')}</text></svg>`; return s;
}
function smSVG(txc,phase){
  const st=[['IDLE','tx_complete = 0x00','input scans; LEDs follow input_reg_hold',phase==='idle'],['GATHER','bit 7 set','delay500: 16 TMR2IF ticks; tx1 keeps ANDing',phase==='delay'],['SEND','bit 1 set (bit 0 per byte)','transmit: 2500 bytes; input skipped',phase==='burst']];
  let s=`<svg viewBox="0 0 840 120" style="width:100%;max-width:920px">`;
  st.forEach(([n,b,d,on],i)=>{ const x=20+i*280; s+=`<rect x="${x}" y="20" width="220" height="70" rx="10" fill="${on?'color-mix(in srgb,var(--accent) 28%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1}"/><text x="${x+110}" y="42" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${n}</text><text x="${x+110}" y="60" text-anchor="middle" font-size="10.5" font-family="var(--mono)" fill="var(--ink2)">${b}</text><text x="${x+110}" y="78" text-anchor="middle" font-size="10" fill="var(--ink2)">${d}</text>`; if(i<2) s+=`<line x1="${x+220}" y1="55" x2="${x+280}" y2="55" stroke="var(--ink2)" marker-end="url(#ar9b)"/>`; });
  s+=`<defs><marker id="ar9b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    <text x="270" y="48" text-anchor="middle" font-size="9.5" fill="var(--ink2)">input ≠ 0xFF</text><text x="550" y="48" text-anchor="middle" font-size="9.5" fill="var(--ink2)">delay2 → 0</text>
    <path d="M690,90 L690,108 L130,108 L130,92" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3"/><text x="410" y="104" text-anchor="middle" font-size="9.5" fill="var(--ink2)">output_led: counterHI × counterLO = 2500 → bcf tx_complete,1 · pulse RB4</text>
    <text x="830" y="14" text-anchor="end" font-size="10" font-family="var(--mono)" fill="var(--accent2)">tx_complete = ${bin(txc)}</text></svg>`;
  return s;
}
function bitsRow(lbl,v,hl,note){ return `<tr><th class="small">${lbl}</th>${[7,6,5,4,3,2,1,0].map(k=>`<td class="mono" style="text-align:center;${hl&&hl(k)?'background:color-mix(in srgb,var(--accent) 25%,transparent)':''}">${(v>>k)&1}</td>`).join('')}<td class="mono small">${hex(v)} ${note||''}</td></tr>`; }
function viewSoft(m){
  window.__s9498Active=false; D.job='ctv';
  m.innerHTML=`${card('TX main loop at the playhead — txv100.asm', `<div id="txl"></div><div id="sm"></div>`)}
   ${card('RX main loop at the playhead — rxv100.asm', `<div id="rxl"></div>`)}
   <div class="grid2">${card('Decode of the last data byte before the playhead', `<div id="dec"></div>`)}${card('Burst layout (transmit / txdataff / output_led)', `<div id="frm"></div>`)}</div>
   <div class="grid2">${card('Register set-up (init)', regTable())}${card('Live variables', `<div id="vars"></div>`)}</div>
   ${card('How the protocol changed between saves', `<table class="kv small"><tr><th></th><th>TXV100.$$$ + rxv100-1.asm (earlier)</th><th>txv100.asm + rxv100.asm (v1.00 final)</th></tr>
     <tr><td>Filler byte</td><td class="mono">movlw 255 → 0xFF</td><td class="mono">movlw 0 → 0x00</td></tr>
     <tr><td>Data byte</td><td class="mono">tx_send &amp; 0xFC (active-low, bits 0–1 = 0)</td><td class="mono">(tx_send &amp; 0xFE) ^ 0xFF (active-high, bit 0 = 1 marker, bit 1 = 0)</td></tr>
     <tr><td>Copies</td><td class="mono">data_count 10</td><td class="mono">data_count 17</td></tr>
     <tr><td>Receiver USART</td><td class="mono">TXSTA 0x10 = synchronous slave, SPBRG 22, TRISC 0xFC</td><td class="mono">TXSTA 0x04 = asynchronous, BRGH=1, SPBRG 3, TRISC 0xC4</td></tr>
     <tr><td>Receiver alignment</td><td>needs a 0xFF first (rxflags,0), then shift_one…shift_seven rotate rxdata0 with bits of the next byte until bit 0 is clear</td><td>bit 0 = 1 → <span class="mono">goto receive1</span> straight away; the alignment code is still there but unreachable</td></tr>
     <tr><td>Receiver output</td><td>LEDs only (output_reg)</td><td class="mono">rlf → relay_reg → translate_relay → output_relay</td></tr>
     <tr><td>TX mask after send</td><td class="mono">btfss input_reg,k</td><td class="mono">btfss tx1,k</td></tr>
     <tr><td>End-of-burst</td><td>—</td><td class="mono">bsf portb,4 / bcf portb,4 (TRISB 0xEF)</td></tr></table>`)}
   ${card('C port that never ran — ctv422tx_2/C/CTVrs422tx.c (ICC-AVR, ATmega128, 8 Feb 2006|39)', `<p class="small">The same TX logic moved to functions: <span class="mono">INPUT_SELECT</span>, <span class="mono">DELAY_SETUP</span>, <span class="mono">UART0_translate</span> (a DO_NOTHING / CHECK_BUFFER_IS_EMPTY / SEND_DATA / DELAY_ROUTINE switch) and <span class="mono">OUTPUT_LED</span>, on async UART0 at 57 600 (55 855 actual) with an 814 µs Timer0 tick. It is unfinished; see Findings.</p>`)}`;
  const draw=()=>{
    const R=run(), t=SIM.t, p=passAt(R.tx.passes,t), q=passAt(R.rx.passes,t), si=stepIn(p,t,tcyTX()), ri=stepIn(q,t,tcyRX()), ph=phaseAt(t);
    m.querySelector('#txl').innerHTML=loopSVG(TXSTEPS,si,'TX pass'+(p?` (${us(p.t1-p.t0)})`:''),p?p.br[si]:'');
    m.querySelector('#sm').innerHTML=smSVG(p?p.v.txc:0,ph.k);
    m.querySelector('#rxl').innerHTML=loopSVG(RXSTEPS,ri,'RX pass'+(q?` (${us(q.t1-q.t0)})`:''),q?q.br[ri]:'');
    // decode
    const bys=R.tx.bytes; let bi=bs(bys,t,'t0'); while(bi>=0 && !bys[bi].data) bi--;
    if (bi<0) m.querySelector('#dec').innerHTML='<p class="muted">No data byte has been sent yet at the playhead. Seek past a burst start.</p>';
    else { const b=bys[bi]; const f=R.rx.frames.find(x=>x.ts>=b.t0-1e-7 && x.ts<b.t1); const rd=f&&R.rx.reads.find(r=>r.f===f); const fe=f&&R.rx.ferr.find(r=>r.f===f);
      const rr=rd&&rd.acc?rd.rr:null; const fired=R.rx.fires.filter(x=>x.t>=b.t0 && x.t<b.t0+0.01).map(x=>x.r);
      m.querySelector('#dec').innerHTML=`<table class="kv"><tr><th></th>${[7,6,5,4,3,2,1,0].map(k=>`<th class="mono" style="text-align:center">b${k}</th>`).join('')}<th></th></tr>
        ${bitsRow('tx_send',bys[bi]?(b.v^0xFF)|1:0,k=>k>=2,'(0 = input closed)')}
        ${bitsRow('TXREG',b.v,k=>k===0,`copy ${b.copy}/17 · (&0xFE)^0xFF`)}
        ${f?bitsRow('RX frame',f.R,k=>k===0,`${f.ferr?'FERR':''} ${D.pol} pair, async ${(1/bitRX()/1000).toFixed(2)}k`):'<tr><td colspan="10" class="small muted">No async frame started inside this byte (no start bit seen).</td></tr>'}
        ${rr!==null?bitsRow('relay_reg',rr,k=>k>=2&&!((rr>>k)&1),'after rlf (0 = operate)'):''}</table>
        <p class="small">${!f?'The receiver saw nothing, so no relay.':fe?'Framing error: <span class="mono">rxerror2</span> discards the byte.':rd&&!rd.acc?'Bit 0 is 0, so <span class="mono">btfss rxdata0,0 / return</span> ignores the frame.':rd?`Accepted. Relays operated by this copy: ${fired.length?fired.join(', '):'none (already running, or relay_reg all 1s)'}.`:'Frame not read yet.'}
        With the inverted pair and matched baud, the TX marker bit 0 becomes the async start bit, so RX bit j = NOT TX bit j+1, RX bit 7 = the next filler's bit 0 (mark), and <span class="mono">rlf</span> puts input k back on relay bit k+1.</p>`; }
    // burst layout
    const bu=R.tx.bursts.find(x=>x.t0!==null && t>=x.t0 && t<(x.done||DUR)) || R.tx.bursts.find(x=>x.t0!==null);
    const cur=byteAt(t); let fr='<svg viewBox="0 0 840 74" style="width:100%">';
    for(let g=0;g<17;g++){ for(let k=0;k<10;k++){ const idx=g*10+k, x=6+idx*3.4; const on=cur&&bu&&cur.n===idx&&t>=bu.t0&&t<(bu.done||DUR); fr+=`<rect x="${x}" y="14" width="3" height="26" fill="${on?'var(--play)':k===9?'var(--accent)':'var(--chip)'}" stroke="none"/>`; } }
    const rest = cur&&bu&&cur.n>=170; fr+=`<rect x="590" y="14" width="244" height="26" fill="${rest?'color-mix(in srgb,var(--play) 40%,var(--chip))':'var(--chip)'}" stroke="var(--line)"/><text x="712" y="31" text-anchor="middle" font-size="14" fill="var(--ink)">${bu?bu.nBytes-170:2330} × 0x00 (txdataff)</text>
      <text x="6" y="60" font-size="14" fill="var(--ink2)">bytes 1–170: 9 × 0x00 + data (green), 17 times</text><text x="834" y="60" text-anchor="end" font-size="14" fill="var(--ink2)">${bu?`burst ${hex(bu.data)} · ${bu.nBytes} bytes · ${ms((bu.done||DUR)-bu.t0)}`:'no burst yet'}</text>${cur?`<text x="420" y="10" text-anchor="middle" font-size="10" fill="var(--play)">playhead: byte ${cur.n+1}</text>`:''}</svg>`;
    m.querySelector('#frm').innerHTML=fr+`<p class="small muted">With the inverted pair, 0x00 on RC7 is a continuous "mark" at the receiver: the 2330 trailing zeros and the 9 fillers between copies make no start bits at all.</p>`;
    const v=p?p.v:{}, w=q?q.v:{d0:[],d1:[]};
    if (!p||!q){ m.querySelector('#vars').innerHTML='<p class="muted">Power-on: both PICs are still in <span class="mono">init</span>. Step forward a few µs.</p>'; return; }
    m.querySelector('#vars').innerHTML=`<table class="kv small mono"><tr><th>TX</th><td>input_reg ${hex(v.input_reg)} · input_reg_hold ${hex(v.hold)} · debounce_hold_mask ${hex(v.mask)}<br>tx1 ${hex(v.tx1)} · tx_send ${hex(v.tx_send)} · tx_complete ${bin(v.txc)}<br>delay1 ${v.delay1} · data_counter ${v.data_counter} · txcount ${v.txcount} · counterHI ${v.cHI} · counterLO ${v.cLO}</td></tr>
      <tr><th>RX</th><td>relay ${bin(w.relay)} · relay_set ${bin(w.set)} · output_reg ${hex(w.out)}<br>relayN_delay ${w.d0.join(',')}<br>relayN_delay1 ${w.d1.join(',')}</td></tr></table>`;
  };
  SIM.on('time',draw);
}
function regTable(){
  const r=[['TX SPBRG','21','sync: Fosc/(4·22) = '+(XTALS['4.9152']/88/1000).toFixed(2)+' kbit/s at 4.9152 MHz; 45.45 at 4 MHz'],['TX TXSTA','0xB0','CSRC=1 master · TXEN=1 · SYNC=1'],['TX RCSTA','0x80','SPEN (CREN/SREN off)'],['TX T2CON','0x7F','postscale 1:16 · TMR2ON · prescale 1:16'],['TX PR2','255','TMR2IF every 65 536 Tcy = 53.3 ms'],['TX TRISA/B/C','0x10 / 0xEF / 0x3C','RA4 in · RB4 out · RC2–5 in'],['RX SPBRG','3','async BRGH=1: Fosc/64'],['RX TXSTA','0x04','BRGH=1 · SYNC=0 (comment says "Synch Mode rx slave")'],['RX RCSTA','0x90','SPEN · CREN'],['RX TRISC','0xC4','RC7/RC6/RC2 in · RC3–5 relay latch out'],['both ADCON1','PCFG=0111','PORTA/E all digital']];
  return `<table class="kv small"><tr><th>Register</th><th>Value</th><th>Meaning</th></tr>${r.map(x=>`<tr><td class="mono">${x[0]}</td><td class="mono">${x[1]}</td><td>${x[2]}</td></tr>`).join('')}</table>`;
}

/* ---------------- Findings ---------------- */
function viewNotes(m){
  window.__s9498Active=false;
  m.innerHTML=card('What the CTV RS422 link is up to — findings from the source', `<ol>
   <li><b>The receiver is not synchronous.</b> rxv100.asm says "Set Uart for Synch Mode rx slave", but writes <span class="mono">TXSTA = b'00000100'</span>: SYNC=0, BRGH=1, which is the asynchronous receiver. The earlier rxv100-1.asm really was a sync slave (0x10). The pin-out doc (rev 6, July 2004|37) agrees with the final code: the receiver DB9M has only Rx Data± on pins 2/7, while the transmitter DB9F has data and clock.</li>
   <li><b>The TX marker bit is an async start bit.</b> <span class="mono">transmit0</span> sends <span class="mono">(tx_send &amp; 0xFE) ^ 0xFF</span>: bit 0 = 1, bit 1 = 0, bits 2–7 = closed inputs. Fillers are 0x00. If the receiver sees the pair inverted, the fillers are idle mark, the marker is the start bit, RX bit j = NOT TX bit j+1, and the next filler gives the stop bit. <span class="mono">btfss rxdata0,0</span> then checks the sentinel bit 1, and <span class="mono">rlf rxdata0</span> moves input k back onto relay bit k+1. This is the only reading under which the two v1.00 files work together ${inf}. Try "straight" on the Simulator tab to see it fail.</li>
   <li><b>The two crystals cannot match as written.</b> Sync master at SPBRG 21 runs at Fosc/88 and the async receiver at Fosc/64. On equal crystals the receiver is 37.5 % fast. The TX's "56K" comment and its delay comments fit 4.9152 MHz (55.85 kbit/s, 53.3 ms ticks, ≈0.8 s), which is also the crystal on the ARX422 and POD30 BOMs. The receiver only matches near 3.58 MHz (3.579545 MHz gives 55.93 kbit/s, +0.14 %) ${inf}. The MPLAB projects say <span class="mono">Frequency=4000000</span>, which matches neither.</li>
   <li><b>Dead alignment code in the receiver.</b> After <span class="mono">btfss rxdata0,0 / return</span> comes an unconditional <span class="mono">goto receive1</span>. The 0xFF-preamble test (<span class="mono">rxflags,0</span>), the second-byte read loop <span class="mono">receive0</span> and <span class="mono">shift_one … shift_seven</span> can never run. They were live in rxv100-1.asm, when bit slips were apparently the problem.</li>
   <li><b>Uninitialised RAM.</b> <span class="mono">init</span> never loads <span class="mono">counterHI</span>, <span class="mono">counterLO</span>, <span class="mono">tx1</span> or <span class="mono">count1…6</span> (TX), or <span class="mono">relay1_delay…relay6_delay</span> (RX, at 0x50). After power-up, the first burst can be anywhere from 1 to 64 006 bytes long. If RAM powers up as 0x00, the first command is all-zero, goes out as 0xFF, and the receiver ignores it. The first relay pulse can be up to 255 passes longer than later ones.</li>
   <li><b>"20 000 bits" is mostly padding.</b> counterHI_const 250 × counterLO_const 10 = 2500 bytes. Only the first 170 carry the 17 copies; the other 2330 bytes (93 %) are 0x00 that the async receiver never sees. For ≈0.4 s after every command, <span class="mono">input</span> returns at once, so presses made during the burst are lost unless they are still held when it ends.</li>
   <li><b>A held input keeps the link busy.</b> <span class="mono">debounce_hold_mask</span> stops a held input from being sent again (it clears only after 256 released passes). But <span class="mono">incfsz temp,w / bsf tx_complete,7</span> still fires on the raw input, so a held contact produces an empty burst (data 0x01) every ≈1.2 s. The receiver decodes each one to "no relay".</li>
   <li><b>The relay pulse is fixed.</b> Each relay closes for <span class="mono">relay_count</span> 8 × 256 receiver passes (≈0.36 s at 3.58 MHz ${inf}) however long the input was held. <span class="mono">relay_set</span> blocks re-triggering, so the 17 copies give redundancy, not a longer pulse.</li>
   <li><b>Delay-set-up mode is unreachable.</b> <span class="mono">main</span> has <span class="mono">;call debounce</span> and <span class="mono">;call debounce_rel</span> commented out, so <span class="mono">input_flag</span> is never set. <span class="mono">delay_setup</span>, <span class="mono">pbdepress1/2</span>, <span class="mono">set_250ms…set_0ms</span>, <span class="mono">delaysecondary</span> and the "slave LED" (status1,1) are dead. <span class="mono">set_33ms</span> and <span class="mono">set_0ms</span> do nothing. The labels promise 250/125/67/33 ms, but the code would add 4/2/1 ticks of 53 ms.</li>
   <li><b>The LEDs are active-low on the PIC hardware.</b> <span class="mono">bsf status1,1 ;turn on slave led</span> makes <span class="mono">output_led</span> shift a 0. The ARX422 drives its LEDs active-high (4094 → 330R → LED → ground), so the 2004|37 firmware was not written for the ARX422 board.</li>
   <li><b>The relay latch order carried over.</b> <span class="mono">output_relay</span> shifts two zeros, then relays 1–6, leaving relay 1 on Q6 and relay 6 on Q1. arx422iss1.net wires U1 Q6 → U2-6 → REL1 and Q1 → REL6, and P2 matches the doc pin for pin (REL1 NC = 1, NO = 2, common = 14).</li>
   <li><b>The ARX422 cannot be a sync slave.</b> COM2's U12 driver can send XCK1 (TCLK = 0R fitted, TXD = SOT), but U12's receiver output has no net. The 2006|39 board can clock out but never clock in, so its receiver role must be async, as in the doc.</li>
   <li><b>The C port was never finished.</b> CTVrs422tx.c: <span class="mono">INPUT_SELECT(PINB)</span> ignores its argument (<span class="mono">input_reg = 0xFF</span>), so no input is ever seen. <span class="mono">DELAY_ROUTINE</span> ends when <span class="mono">delay_timer != DELAY_CONSTANT+offset</span>, which is after one tick (it should be ==). It sends <span class="mono">INVERT_DATA(…) &amp; 0xFE</span> (marker 0, the opposite of the asm). COUNTERHI_CONSTANT 25 gives 2000 bits, not 20 000. ALIGNED_DATA and ALIGNMENT_MASK are unused. The port comments ("Altera 8 through 15") were copied from another product.</li>
   <li><b>Copy-paste and leftovers.</b> rxv100.asm's header reads "CTV Synchronous RS422 transmiter". rxv100.err is the MPASM warning 205 for ERRORLEVEL in column 1. <span class="mono">ERRORLEVEL -302</span> hides every bank warning. The RX init ends with <span class="mono">goto rxerror1</span> (a tail call that flushes the USART), so its <span class="mono">return</span> is dead. TX and RX both share RA2 as the clock for the input register and the LED latch. The MRU list in ctv422tx.pjt points at <span class="mono">pod21v100.asm</span> and the R2K <span class="mono">r201v201.asm</span>, the code this was started from ${inf}.</li>
   <li><b>Missing and misfiled files.</b> The README describes <span class="mono">stx422</span>, <span class="mono">arx422</span> and <span class="mono">pod30</span> variants. Their Software folders (<span class="mono">atmel/v100</span>, <span class="mono">v200/may 16</span>, <span class="mono">aug 1</span>, <span class="mono">interrupts May 16</span>, <span class="mono">no interrupts</span>, <span class="mono">july 31</span>, <span class="mono">VB Software/CTV Automation</span>, <span class="mono">altera/ams81-12/…/talkback</span>) are all empty, and so are <span class="mono">ctv422txtest</span>, <span class="mono">pod30</span> and <span class="mono">Pod30</span>. <span class="mono">CTV RS422/Untitled.bom</span> is an AMS8E-6 BOM (AK5381 ADCs). <span class="mono">ctv422rx</span> also holds a <span class="mono">ctv422tx.mcp/.mcw</span>.</li>
   <li><b>Duplicates.</b> txv100.asm exists three times (identical MD5), rxv100.asm twice, and the ARX422 board files twice. The <span class="mono">ctv422rx/arx422</span> silk CDR is an older design ("ARX 422 by Ward-Beck Systems" banner, no labels). The pin-out doc is identical to the copy in <span class="mono">#CUSTOM 55XXXX Systems/553580</span>.</li>
   <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src('#CUSTOM #SYSTEMS/#Custom Systems 94-98/CTV RS422/ARX422-silk.cdr','CTV RS422/ARX422-silk.cdr')} (16 Aug 2006).</b> Vector, white ink on WBS black; the rear outlines of P1–P3, COM1/COM2 and the AC inlet are drawn faint as cut geometry. The older ${SIM.src('#CUSTOM #SYSTEMS/#Custom Systems 94-98/ctv422rx/arx422/ARX422-silk.cdr','ctv422rx/arx422/ARX422-silk.cdr')} (13 Apr 2006) is a different face: a broken black bar, “by Ward-Beck Systems”, “ARX 422”, 2 + 18 unlabelled rings and only COM1/COM2 on the rear; the August file adds CONTROL INTERFACE, the WBS mark, COM 1 2, INPUTS/OUTPUTS 1–18 and P1/P2/P3.</li>
   <li><b>Panel artwork slips.</b> In ARX422-silk.cdr, LED 18 is drawn as a drill crosshair rather than a ring. The rear warning reads "POWERBEFORE" (no space) in both versions. libcdr dropped the text centring, so the labels here are re-anchored under the drill rings.</li>
   <li><b>Out of date range.</b> The folder is "Custom Systems 94-98", but its only code is the 2004|37–2006|39 CTV job. The 1990s jobs are drawings only.</li>
  </ol>`)
  + card('Every job in the folder (38)', `<table class="kv small"><tr><th>Job</th><th>Years</th><th>Customer</th><th>What</th><th>Files</th></tr>${JOBS.map(j=>`<tr><td class="mono"><a href="#" data-job="${j.id}">${j.id==='ctv'?'CTV RS422':j.id.toUpperCase()}</a></td><td class="mono">${j.yr.split('–').map(y=>SIM.year(+y)).join('–')}</td><td>${j.cust}</td><td>${j.title}</td><td>${j.files}</td></tr>`).join('')}</table>
    <h3>Folder-level findings</h3><ul class="small">
     <li>The README counts SYSTEM96 as three jobs. One of them is a folder (960077 CFNY), one is a file with no extension (<span class="mono">960193</span>, actually an AutoCAD R11/12 DWG), and one is a loose <span class="mono">960269.DWG</span>.</li>
     <li>Several customers span more than one job: Ontario Jockey Club (970029 and 970280 turret addition), CBC Fredericton (980023 and 980100), TTC (980464 and the TTC/ PCB folder), NZ Public Radio (970004, 970009-1 and probably 970038), and CTV Agincourt (970077 and 970081). WBZ's MkI and MkII Renaissance consoles (940444–940449) are the largest drawing sets, with drawing lists in 444.TXT, 447.TXT and 448.TXT.</li>
     <li>The drawings use one house style: textured beige 452C, brown 438C or grey Texcote vinyl, "sand 120 grit and paint", PEM hardware, and the C9659 stiffener on 970245 and 980233.</li>
     <li>980387 spells the customer's town two ways (IQALUIT / IQUALUIT). 980233 re-uses "obsolete stock provided" by the customer.</li></ul>`)
  + card('Assumptions in this simulation', `<ul class="small">
     <li>Loop-pass lengths are counted from the instructions in each routine (≈159 TX cycles idle, ≈85 while sending, ≈136 RX) ${inf}.</li>
     <li>TX DT holds its last bit between bytes, and DT idles low after init ${inf}. The RS422 pair is inverted at the receiver ${inf}. An unplugged receiver idles at mark ${inf}.</li>
     <li>The RX crystal is 3.579545 MHz by default ${inf}. The async receiver detects the start level, samples once at each bit centre, and uses a 2-deep FIFO with OERR on the third frame (PIC16F87x datasheet behaviour).</li>
     <li>The panels are the 2006|39 ARX422 artwork driving the 2004|37 PIC firmware; the LED mapping (inputs/relays 1–6 on I/O 1–6, mix/spare on COM 1/2) is ${inf}.</li>
     <li>"As designed" RAM pre-loads counterHI 250, counterLO 10, tx1 0xFF and the relay counters 0 ${inf}.</li></ul>`)
  + card('Sources (all in #CUSTOM #SYSTEMS/#Custom Systems 94-98)', `<ul class="small mono"><li>ctv422tx/txv100.asm · TXV100.$$$ · ctv422tx.pjt · tx.mcp</li><li>ctv422rx/rxv100.asm · rxv100-1.asm · RXV100.$$$ · rxv100.err · ctv422rx.pjt</li><li>ctv422tx_2/C/CTVrs422tx.c</li><li>CTV RS422/arx422iss1.net · arx422iss1.bom · ARX422-silk.cdr · ctv-relay pinouts (553580).doc · GERBERS/ · ARX422-M1/M2.dwg · arx422-wiring-iss2.dwg · arx422-TX-WD.dwg · Untitled.bom</li><li>SYSTEM94…98/**/*.md sidecars · 444.TXT · 447.TXT · 448.TXT · TTC/TTC.CDR · 980233/98233M0A.CDR</li></ul>`);
  m.querySelectorAll('[data-job]').forEach(a=>a.onclick=e=>{ e.preventDefault(); D.job=a.dataset.job; SIM.openTab('sim'); });
}

/* ---------------- register ---------------- */
SIM.register({
  footnotes: [{"text": "The April 2006 ARX422 silk is a different face: a broken black bar, “by Ward-Beck Systems”, “ARX 422” and 2 + 18 unlabelled rings.", "src": "#CUSTOM #SYSTEMS/#Custom Systems 94-98/ctv422rx/arx422/ARX422-silk.cdr"}, {"text": "The August 2006 silk adds CONTROL INTERFACE, the WBS mark, COM 1 2, INPUTS/OUTPUTS 1–18 and P1/P2/P3 on the rear.", "src": "#CUSTOM #SYSTEMS/#Custom Systems 94-98/CTV RS422/ARX422-silk.cdr"}, {"text": "LED 18 is drawn as a drill crosshair rather than a ring.", "src": "#CUSTOM #SYSTEMS/#Custom Systems 94-98/CTV RS422/ARX422-silk.cdr"}, {"text": "The rear warning reads “POWERBEFORE” with no space, in both versions of the silk.", "src": "#CUSTOM #SYSTEMS/#Custom Systems 94-98/CTV RS422/ARX422-silk.cdr"}, {"text": "The silk is live text, and libcdr drops its alignment, so the simulator re-anchors the legends under the drill rings.", "src": "#CUSTOM #SYSTEMS/#Custom Systems 94-98/CTV RS422/ARX422-silk.cdr"}, {"text": "The rear AC inlet / fuse cut-out is split into four in the artwork.", "src": "#CUSTOM #SYSTEMS/#Custom Systems 94-98/CTV RS422/ARX422-silk.cdr"}],
  id:'systems-94-98',
  name:'Custom systems 1994–98 · 37 custom jobs + CTV RS422 relay link (1994|27)',
  product:'Custom systems 1994–98', year:1994,
  family:'Obsolete products',
  folder:'#CUSTOM #SYSTEMS/#Custom Systems 94-98',
  summary:'Ward-Beck\'s custom-job drawings from 1994|27–1999|32 (Renaissance consoles for WBZ, CFNY, CBC and others, intercom matrices, turrets, a TTC PA relay card), each with a summary card. The job with code, the CTV RS422 link, is emulated pass by pass: a PIC16F874 synchronous transmitter whose bursts an asynchronous PIC receiver decodes into six relay closures.',
  highlights:['Job selector with a card for all 38 jobs','Real ARX422 silkscreen panels from CorelDRAW','txv100/rxv100 emulated pass by pass, with an async UART sampling the line','Bit-level scope: sync clock vs async start, data and stop samples','Finds the async receiver behind the "Synch Mode rx slave" comment, plus the crystal mismatch','10-step operator tutorial'],
  depth:'Full model',
  duration:DUR,
  stepUnits:[
    {label:'1 TMR2 tick (53 ms)', period:()=>tickT()},
    {label:'10 ms', period:()=>0.01},
    {label:'1 TX loop pass (idle)', period:()=>159*tcyTX()},
    {label:'1 RS422 byte', period:()=>8*bitTX()},
    {label:'1 RS422 bit', period:()=>bitTX()},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[2,'2 s (whole run)'],[1,'1 s'],[0.1,'100 ms'],[0.03,'30 ms (17 copies)'],[0.003,'3 ms (≈20 bytes)'],[0.0005,'500 µs (3 bytes)'],[0.00018,'180 µs (1 byte, bits)'],[0.00005,'50 µs (3 bits)']],
  defaultZoom:0,
  init(){ RUN=null; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the link', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
