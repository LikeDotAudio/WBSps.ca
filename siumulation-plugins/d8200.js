/* =====================================================================
   D8200 — common AES DSP platform for D8205 / D8206 / D8207 / D8208
   (Ward-Beck Systems 8200 Distribution Series, firmware by Slava Lee, 2000|33)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under #MF8200 #SERIES/D8200 - #Engineering #MF82/):
   - d8200 - #d820x/pic/v1.104/d820x.asm, d820x.h, d820xswr.asm, d820xini.asm, d820xspi.asm,
       d820xad.asm, d820xchs.asm  (main loop, MODE1/MODE2, REAL_MODE_0..f, set_MODE_x, debounce,
       Link_to_ALTERA, Link_to_SHARC, SHARC_link_control, AES_output_control, flush8420reg)
   - pic/v105/…, pic/v1.103-016, v1.104-055 (diffs for the findings), v1.104/v1.104.pjt
   - d8200 - #d820x/jumpers.txt  (LED and jumper tables per product)
   - d8200 - #d820x/sharc/d820xcore.asm, d820xdef.h, D8205_vol.dat, D8205_trm.dat, D8206_vol.dat,
       D8206_frq.dat  (ctrl_proc nibble decoder, sample_proc_D8205/6/8, test-tone generator)
   - d8200 - #d820x/altera/d8200_top.gdf (register-map note), d8200_top.rpt (pins, PIC_CLK and
       SHARC_CLK equations, JACK_OUT = s13 mux)
   - d8200 - #PCB/d8200-2.net (nets), d8200-1.bom (BOM titled D8205), d8200-2.pdf (actually a
       P-CAD PDIF export: part placement in mils), d8200 - #GERBERS/D8200-2.SLK + .TOP (board art)
   - ../D8205 - #Master #MF82/D8205 - #Engineering/D8205.pdf  (manual: jumpers, LEDs, specs)
   - ../8200 Series Rear Module options…/D8205 - rear module options.pdf  (BNC1 / BNC3 art)
   Assets: assets/d8200-board-silk-white.png, d8200-board-copper.png (rendered from the Gerbers),
           assets/d8200-rear-d8205-bnc1-black.png, d8200-rear-d8205-bnc3-black.png (cut from the PDF).
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = (w)=>`<span class="tag-inf" title="Not stated in the source${w?': '+w:''}">inferred</span>`;
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const hex = (v,n)=>'0x'+(v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bin8 = v=>(v&255).toString(2).padStart(8,'0');
const dB = a=> a<=0 ? '−∞' : (20*Math.log10(a)).toFixed(1);

/* ---------------- clocks and cycle counts ---------------- */
const OSC = 24.576e6;                 // OSC2 24.576 MHz → U4 pin 90 input_clk (d8200-2.net)
const FPIC = OSC/4;                   // PIC_CLK = two T flip-flops (_LC099, _LC025 in d8200_top.rpt) → 6.144 MHz
const TCY = 4/FPIC;                   // 0.651 µs per PIC instruction
const DELAY_CYC = 1540;               // 'delay': 256 × (3 nop + decfsz + goto) + call — comment says "1.54 mS" (true only at 4 MHz)
// Main-loop steps of v1.104 'main' with hand-counted instruction cycles (estimates, ±20 %)
const STEPS = [
  ['AtoD_data_preparing · AtoD', 85, 'Pick 1 of 4 pots, average 4 readings (Average) and apply hysteresis (Hysterisis); step the A/D (3 passes per conversion)'],
  ['Link_to_SHARC', 22, 'Put the next nibble "aaaadddd" of the 16-nibble frame (0xE4, product, MODE1, MODE2, code1–4) in TO_ALTERA3'],
  ['Link_to_ALTERA', 190, 'Four SSP exchanges, address A1:A0 = 00…11, each preceded by a 0xE4 dummy byte; byte 2 is OR-ed with AUD_OUTPUT_ROUTE'],
  ['SHARC_link_control', 12, 'FROM_ALTERA3 == 0xE4? reload the 256-pass timeout; first time: leave SHARC_IN_INIT. No 0xE4 for 256 passes → goto WHOLE_RESET'],
  ['jmp_input', 215, 'Rebuild input_reg1/2 from 14 jumpers + video LOCKED; RD_CH1/RD_CH2 MAP 0x10 (Receive Error) → lock, confidence and biphase flags'],
  ['debounce · MODE_change_analize', 14, 'A new jumper/lock pattern must be stable for BCOUNT_NUM = 0x1F passes before it is copied to MODE1/MODE2'],
  ['REFRESH_RUN_STOP', 2, 'v1.104 “Added run stop for all modes” — every line of the body is commented out; it just returns'],
  ['switch_8420_modes', 22, 'Watch the debounced lock bits and move real_mode between the REAL_MODE_x clock plans'],
  ['channel_status_proc', 30, '8-step state machine: wait EFTC/DETC, read 23 C-bytes, copy or swap, insert fs and word length, write back'],
  ['LED_processing', 34, 'Clear LED_0..3 and set them from the lock bits and real_mode'],
  ['flush8420reg', 1260, 'Write 9 shadow registers to each CS8420 every pass (18 SPI writes of 3 bytes)'],
  ['AES_output_control', 10, 'Count AES_OUTPUT_CONTROL_NUM = 0x55 passes after a mode change, then clear TXOFF (reg 3 bit 6)'],
];
const BASE_CYC = STEPS.reduce((a,s)=>a+s[1],0);
const CYC_I2C = 5500;                 // 11 × WRBYTE to the ML6431 (bit-banged I2C) — inferred estimate
const T_PWRT = 0.072;                 // PIC power-up timer (_PWRTE_ON), 72 ms typical (datasheet value)
const CYC_INIT = 10200;               // init: 2 delays, preset_chips, flush, init_channel_status (estimate)
const LOCK_T = 0.010;                 // CS8420 receiver PLL lock time — inferred
const VLOCK_T = 0.120;                // ML6431 genlock time — inferred
const SHARC_BOOT = 0.020;             // ADSP-21061 PROM boot from U2 27C512 — inferred
const SHARC_DLY = 0.001;              // SHARC 'delay' before answering — inferred (DELAY_POWER_ON not defined)
const BCOUNT = 0x1F, AESCNT = 0x55, TMO = 256;

/* ---------------- tables from the SHARC .dat files ---------------- */
const trmGain = c=> Math.pow(10, ((c-128)*15/128)/20);        // D8205_trm.dat: code 0 = −15 dB, 128 = 0 dB, 255 = +14.9 dB
const volGain = c=> c*0.01555106134974599;                     // D8205_vol.dat: linear, 0 = silence, 255 = 3.966 (+12 dB)
const d6Vol = c=> c? Math.pow(10,(-89.3+(c-1)*89.3/254)/20) : 0; // D8206_vol.dat: 0, 3.43e-5 (−89 dB) … 1.0
const d6Frq = c=> 20*Math.pow(1100, c/255);                    // D8206_frq.dat: 20 Hz … 22 kHz, log
const ATT6 = [0,-12,-14,-16,-18,-20,-60,null];                 // tt_att_val[8] (7 = pots, "variable mode")

/* ---------------- the four personalities (#define in d820x.h) ---------------- */
const PROD = {
  D8205:{num:0x05, sharc:true, ml:false, cs:'E240', what:'2-channel AES mixer / level DA with SRC', route:0xA0,
    J:['SRC ref (CLK1)','SRC ref (CLK0)','Pot mode','Remote gain','Resolution','Input 2 mono','Input 1 mono','Tone level','OUT2 src (1)','OUT2 src (0)','OUT1 src (1)','OUT1 src (0)','Level action','Monitor jack'],
    JV:[['',''],['',''],['individual L/R','stereo per input'],['disabled','remote on'],['24 bit','20 bit'],['stereo','mono'],['stereo','mono'],['−20 dBFS','−18 dBFS'],['',''],['',''],['',''],['',''],['trim ±15 dB','volume off…+12 dB'],['OUT1','OUT2']],
    LED:['Input 1 lock (AUDIO1)','Input 2 lock (AUDIO2)','Internal ref (PROC)','Errors (ERR)']},
  D8206:{num:0x06, sharc:true, ml:true, cs:'1273', what:'DARS / AES test-tone generator with word clock', route:0xA0,
    J:['Resolution','Reference','OUT1 tone','OUT2 tone','CH A freq','CH A LVL2','CH A LVL1','CH A LVL0','CH B freq','CH B LVL2','CH B LVL1','CH B LVL0','Video fs','Monitor jack'],
    JV:[['24 bit','20 bit'],['AES','video'],['tone','silence'],['tone','silence'],['1 kHz','400 Hz'],['',''],['',''],['',''],['1 kHz','400 Hz'],['',''],['',''],['',''],['48 kHz','44.1 kHz'],['OUT1','OUT2']],
    LED:['Internal (AUDIO1)','AES ref lock (AUDIO2)','Video lock (PROC)','Errors (ERR)']},
  D8207:{num:0x07, sharc:false, ml:true, cs:'3776', what:'AES sample-rate converter, AES or video reference', route:0x00,
    J:['Resolution','Dither','SRC','Reference','Video fs','—','—','—','—','—','—','—','—','Monitor jack'],
    JV:[['24 bit','20 bit'],['off','on'],['bit 0','bit 1'],['AES','video'],['48 kHz','44.1 kHz'],['',''],['',''],['',''],['',''],['',''],['',''],['',''],['',''],['(=0!)','']],
    LED:['Ref lock (AUDIO1)','Input lock (AUDIO2)','SRC to video (PROC)','Errors (ERR)']},
  D8208:{num:0x08, sharc:true, ml:false, cs:'8434', what:'1-channel adjustable-gain AES DA', route:0x70,
    J:['Output','Tone level','Pot mode','Remote gain','Resolution','Level action','Input mode','Right channel','—','—','—','—','—','Monitor jack'],
    JV:[['audio','1 kHz tone'],['−20 dBFS','−18 dBFS'],['individual L/R','stereo'],['disabled','remote on'],['24 bit','20 bit'],['trim','volume'],['stereo','mono'],['normal','inverted'],['',''],['',''],['',''],['',''],['',''],['','(=1!)']],
    LED:['Input lock (AUDIO1)','— (AUDIO2)','Internal (PROC)','Errors (ERR)']},
};
const MODE_TXT = {0:'internal 48 kHz',1:'internal 96 kHz',2:'internal 32 kHz',3:'fs from CH1, CH2 via SRC',4:'fs from CH2, CH1 via SRC',5:'fs from CH1, no SRC',6:'fs from CH2, no SRC',7:'video reference (SHARC)',8:'2 independent channels',9:'fs CH1, SRC, no SHARC',10:'fs CH2, CH1 via SRC, no SHARC',11:'video ref, CH1 via SRC',12:'2 channels, no SRC',13:'D8206 AES ref, SRC',14:'reserved',15:'start-up: internal 48 kHz, PLLs on serial port'};
const MODE_HEX = m=>'REAL_MODE_'+m.toString(16);
// TO_ALTERA0..2 written by each set_MODE_x (d820xswr.asm)
const ALT = {0:[0x00,0x44,0x02],1:[0x00,0x44,0x0A],2:[0x0F,0x44,0x02],3:[0x55,0x44,0x02],4:[0xAA,0x44,0x02],5:[0x55,0x44,0x02],6:[0xAA,0x44,0x02],7:[0xAA,0x48,0x03],8:[0x99,0x44,0x00],9:[0x55,0x44,0x02],10:[0xAA,0x44,0x02],11:[0xAA,0x48,0x03],12:[0x00,0x44,0x02],13:[0x20,0x44,0x02],15:[0x00,0x44,0x02]};

/* ---------------- device state ---------------- */
const D = {};
function reset(keepProd){
  const prod = keepProd? D.prod : 'D8205';
  Object.assign(D,{ prod,
    j0: defaultJ(prod),                     // jumper value at t=0, index 1..14 (0 = ON, 1 = OFF)
    ev: [],                                 // timed events {t,k:'in1'|'in2'|'vid'|'j',n,v}
    in1:{on:true, fs:48000, lvl:-20, err:false},   // Input 1 = main reference → CS8420 #2 (U5, "CH2")
    in2:{on:true, fs:44100, lvl:-20, err:false},   // Input 2 = main audio     → CS8420 #1 (U6, "CH1")
    vid:true, rv:[128,128], rem:[128,128], testing:true, sharcFail:false,
    frame:'MF82/10', h16:'external', term:['75','75'], log:[] });
  SIMKEY='';
}
function defaultJ(prod){ const j=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];       // manual: every jumper ON by default…
  if (prod==='D8205') j[1]=1;                 // …except H1 OFF / H2 ON = SRC to Input 1 (Default)
  if (prod==='D8208') j[14]=1;                // jumpers.txt: "JMP_14 … Should be =1 !!!"
  if (prod==='D8206'){ j[6]=1; j[7]=0; j[8]=1; j[10]=1; j[11]=0; j[12]=1; } // LVL 101 = −20 dBFS both channels (inferred choice)
  return j; }
const P = ()=>PROD[D.prod];

/* ---------------- inputs over time ---------------- */
function evVal(k, n, t, v0){ let v=v0; for (const e of D.ev) if (e.k===k && (n===undefined||e.n===n) && e.t<=t) v=e.v; return v; }
function presentAt(k,t){ return evVal(k,undefined,t, k==='vid'? D.vid : D[k].on); }
function sinceOn(k,t){ // how long the signal has been present continuously at t (Infinity if since before t=0)
  let cur = k==='vid'? D.vid : D[k].on, last = cur? -Infinity : null;
  for (const e of D.ev.filter(e=>e.k===k).sort((a,b)=>a.t-b.t)){ if (e.t>t) break; if (e.v && !cur) last=e.t; if (!e.v) last=null; cur=e.v; }
  return cur && last!==null ? t-last : -1; }
function rxLock(k,t){ return sinceOn(k,t) >= LOCK_T; }
function vidLock(t){ return sinceOn('vid',t) >= VLOCK_T; }
function jAt(t){ const j=D.j0.slice(); for (let n=1;n<=14;n++) j[n]=evVal('j',n,t,j[n]); return j; }

/* ---------------- the firmware, pass by pass ---------------- */
let SIMKEY='', SIMR=null;
function simulate(){
  const key = JSON.stringify([D.prod,D.j0,D.ev,D.in1,D.in2,D.vid,D.testing,D.sharcFail,D.rv,D.rem]);
  if (key===SIMKEY) return SIMR; SIMKEY=key;
  const p=P(), passes=[], frames=[], resets=[], inits=[];
  let t=T_PWRT, s=null, sh=null;
  const setMode=(m,why)=>{ s.real=m; if (D.prod==='D8205' && m===4){ s.tx1off = !(s.MODE1&0x80); } s.evs.push(`set_${MODE_HEX(m).replace('REAL_','')} → TO_ALTERA0..2 = ${(ALT[m]||[0,0,0]).map(v=>hex(v)).join(' ')}${why?' ('+why+')':''}`); };
  const shutOff=ch=>{ if (ch===1){ s.tx1off=true; s.c1=AESCNT; s.f1=true; } else { s.tx2off=true; s.c2=AESCNT; s.f2=true; } };
  const swmEnd=()=>{ shutOff(1); shutOff(2); s.evs.push('swm_end: shut_off_AES_output_CH1/CH2 (TXOFF, count 0x55)'); };
  const ml=(why)=>{ s.i2c=true; s.evs.push(`set_ML6431_${s.MODE_FS?'44':'48'} → 11 I2C writes to 0xB2 (byte 0x80 = 48 k in both routines)${why?' · '+why:''}`); };
  const J = n=> (n<=4? (s.MODE1>>({1:3,2:2,3:1,4:0}[n]))&1 : n===13? (s.MODE1>>4)&1 : (s.MODE2>>(12-n))&1);
  // MODE_change_analize per product
  const analyze=(x1,x2)=>{
    if (D.prod==='D8205'){
      if (x1&0x0c){ const v=s.MODE1&0x0c; setMode({0:0,4:3,8:4,12:5}[v],'H1/H2'); s.jmp=s.real; }
      if (x2&0x80) s.evs.push(J(5)? 'set_20bit: reg5/reg6 bits 5:4 = 01':'set_24bit: reg5/reg6 bits 5:4 = 00');
    } else if (D.prod==='D8208'){
      if (x2&0x80) s.evs.push(J(5)? 'set_20bit':'set_24bit');
    } else if (D.prod==='D8207'){
      let doRef=false;
      if (x1&0x02){ if (s.MODE1&0x02){ setMode(12,'SRC_ON_OFF bit = 1'); s.jmp=12; } else doRef=true; }
      else if ((x1&0x01) && !(s.MODE1&0x02)) doRef=true;
      if (doRef){ setMode((s.MODE1&0x01)?11:10,'VID_AUD'); s.jmp=s.real; }
      if (x1&0x08) s.evs.push((s.MODE1&0x08)?'set_20bit':'set_24bit');
      if (x1&0x04) s.evs.push((s.MODE1&0x04)?'set_CH1_dither_on (clears reg1 bit 3)':'set_CH1_dither_off');
      if (x2&0x80){ s.MODE_FS=(s.MODE2>>7)&1; ml('FS_48K_44K'); }
    } else if (D.prod==='D8206'){
      if (p.sharc && s.sinit) return;
      if (x1&0x10){ s.MODE_FS=(s.MODE1>>4)&1; ml('FS_48K_44K'); }
      if (x1&0x04){ setMode((s.MODE1&0x04)?7:13,'VID_AUD'); s.jmp=s.real; }
      if (x1&0x08) s.evs.push((s.MODE1&0x08)?'set_20bit':'set_24bit');
    }
  };
  const boot=(t0)=>{
    s={MODE1:0,MODE2:0,deb:false,b1:0,b2:0,bc:0,real:15,jmp:15,unl:false,tx1off:true,tx2off:true,c1:0,c2:0,f1:false,f2:false,
       sinit:p.sharc,tmo:TMO,nib:0,led:[1,1,1,1],MODE_FS:0,evs:[],i2c:false,e1:false,e2:false};
    inits.push(t0);
    s.evs.push('init: LED_0..3 on, RESET low→high (CS8420s, SHARC), SSP on, preset_chips'+(p.ml?', set_ML6431_48':''));
    if (D.prod==='D8207'){ setMode(12,'init_modes'); s.jmp=12; analyze(0xff,0xff); s.jmp=s.real; }
    else { setMode(15,'init_modes'); s.jmp=15; }
    shutOff(1); shutOff(2); s.evs.push('flush8420reg · init_channel_status');
    sh={ready: D.sharcFail||!p.sharc? Infinity : t0 + CYC_INIT*TCY + SHARC_BOOT + 16/48000, aligned:false, answer:Infinity, latch:{m1:0,m2:0}};
    return t0 + (CYC_INIT + (p.ml?CYC_I2C:0))*TCY;
  };
  t = boot(t);
  const initEv = s.evs; s.evs=[]; passes.push({i:-1,t0:T_PWRT,dur:t-T_PWRT,kind:'init',ev:initEv,real:s.real,jmp:s.jmp,MODE1:0,MODE2:0,led:[1,1,1,1],tx1:false,tx2:D.testing,sinit:s.sinit});
  let idx=0;
  while (t<1.0005 && passes.length<6000){
    s.evs=[]; s.i2c=false; let cyc=BASE_CYC + (D.prod==='D8207'? 3*DELAY_CYC : 0);
    const L1=rxLock('in2',t), L2=rxLock('in1',t), VL=p.ml && vidLock(t), Jr=jAt(t);
    // Link_to_SHARC
    let nib=null;
    if (p.sharc){ nib=s.nib; if (nib===4) sh.latch={m1:s.MODE1,m2:s.MODE2,rv:D.rv.slice(),rem:D.rem.slice()}; s.nib=(s.nib+1)&15;
      if (t>=sh.ready){ if (!sh.aligned && nib===0){ sh.aligned=true; s.evs.push('SHARC ctrl_proc aligned on nibble 0'); }
        if (sh.aligned && nib===15){ frames.push({t, m1:sh.latch.m1, m2:sh.latch.m2, rv:sh.latch.rv, rem:sh.latch.rem}); if (sh.answer===Infinity){ sh.answer=t+SHARC_DLY; s.evs.push('SHARC: received_FRAME_CODE = 0xE4, product '+hex(p.num)+' → tx_buf_CTRL = 0xE4'); } }
      } }
    // Link_to_ALTERA → FROM_ALTERA3; SHARC_link_control
    if (p.sharc){
      if (t>=sh.answer){ s.tmo=TMO;
        if (s.sinit){ s.led=[0,0,0,0]; cyc+=3*DELAY_CYC; s.sinit=false; s.evs.push('SHARC_link_control: FROM_ALTERA3 = 0xE4 → LEDs off, 3 × delay, bcf SHARC_IN_INIT');
          if (D.prod==='D8205'){ analyze(0xff,0xff); s.jmp=s.real; s.unl=true; s.evs.push('init_modes_after_SHARC_respond (MODE1 still 0 → mode 0), bsf UNLOCKED_MODE'); }
          if (D.prod==='D8206'){ analyze(0xff,0xff); s.jmp=s.real; s.evs.push('init_modes_after_SHARC_respond'); }
          if (D.prod==='D8208'){ setMode(6,'init_modes_after_SHARC_respond'); s.jmp=6; s.unl=true; }
        }
      } else { s.tmo--; if (s.tmo<=0){ const dur=cyc*TCY;
          passes.push({i:idx,t0:t,dur,kind:'reset',ev:['SHARC_timeout_cnt1/2 expired (256 passes without 0xE4) → goto WHOLE_RESET'],real:s.real,jmp:s.jmp,MODE1:s.MODE1,MODE2:s.MODE2,led:s.led.slice(),tx1:false,tx2:D.testing,sinit:true,nib});
          resets.push(t+dur); const t0=t+dur; t=boot(t0); passes.push({i:-1,t0,dur:t-t0,kind:'init',ev:s.evs.slice(),real:s.real,jmp:s.jmp,MODE1:0,MODE2:0,led:[1,1,1,1],tx1:false,tx2:D.testing,sinit:true}); idx=0; continue; } }
    }
    // jmp_input
    let J1=Jr.slice(); if (D.prod==='D8207'){ for (let n=6;n<=13;n++) J1[n]=0; } if (D.prod==='D8208'){ for (let n=9;n<=13;n++) J1[n]=0; }
    const in1=(L1?0x80:0)|(L2?0x40:0)|(VL?0x20:0)|(J1[13]<<4)|(J1[1]<<3)|(J1[2]<<2)|(J1[3]<<1)|J1[4];
    const in2=(J1[5]<<7)|(J1[6]<<6)|(J1[7]<<5)|(J1[8]<<4)|(J1[9]<<3)|(J1[10]<<2)|(J1[11]<<1)|J1[12];
    s.e1 = L1 && D.in2.err; s.e2 = L2 && D.in1.err;            // FLG_ERROR_CH1/2: confidence (bit 2) or biphase (bit 1)
    // debounce
    if (p.sharc && s.sinit) s.deb=false;
    else if (!s.deb){ if (in1!==s.MODE1 || in2!==s.MODE2){ s.deb=true; s.b1=in1; s.b2=in2; s.bc=BCOUNT; s.evs.push(`debounce: input_reg1/2 = ${hex(in1)}/${hex(in2)} ≠ MODE1/2 → bounceset, bcount = 0x1F`); } }
    else if (in1!==s.b1 || in2!==s.b2){ s.deb=false; s.evs.push('debounce: pattern changed again → start over'); }
    else if (--s.bc===0){ const x1=s.b1^s.MODE1, x2=s.b2^s.MODE2; s.MODE1=s.b1; s.MODE2=s.b2; s.evs.push(`MODE1 = ${hex(s.MODE1)}, MODE2 = ${hex(s.MODE2)} (MODE_XOR1/2 = ${hex(x1)}/${hex(x2)}) → MODE_change_analize`); analyze(x1,x2); s.deb=false; }
    const C1L=!!(s.MODE1&0x80), C2L=!!(s.MODE1&0x40), MVL=!!(s.MODE1&0x20);
    // switch_8420_modes
    if (!(p.sharc && s.sinit)){
      if (D.prod==='D8205'){
        if (!(s.MODE1&0xc0)){ if ((s.MODE2&3)!==3) shutOff(1); if (((s.MODE2>>2)&3)!==3) shutOff(2); if (!s.unl) s.evs.push('both CS8420s unlocked → UNLOCKED_MODE, outputs off'); s.unl=true; if (s.real!==0) setMode(0,'both unlocked'); }
        else if (s.unl){ s.unl=false; s.evs.push('lock back: bcf UNLOCKED_MODE, MODE_XOR1 bits 2,3 → MODE_change_analize'); analyze(0x0c,0); }
        else { const j=s.jmp;
          if (j===3){ if (C1L){ if (s.real!==3){ setMode(3,'MODE_3_handler'); swmEnd(); } } else if (s.real!==6){ setMode(6,'MODE_3_handler m3h: CH1 lost'); swmEnd(); } }
          else if (j===4){ if (C2L){ if (!C1L && !s.tx1off) setMode(4,'v1.01 turn off ch1 if loss of lock'); if (C1L && s.tx1off) setMode(4,'v1.01 ch1_on: clears TXOFF at once'); if (s.real!==4){ setMode(4,'MODE_4_handler'); swmEnd(); } } else if (s.real!==5){ setMode(5,'MODE_4_handler m4h: CH2 lost'); swmEnd(); } }
          else if (j===5){ const m=C1L?5:6; if (s.real!==m){ setMode(m,'MODE_5_handler'); swmEnd(); } }
          else if (j===6){ const m=C2L?6:5; if (s.real!==m){ setMode(m,'MODE_6_handler'); swmEnd(); } }
        }
      } else if (D.prod==='D8208'){
        if (!C2L){ if (!(s.MODE1&0x08)) shutOff(2); if (!s.unl) s.evs.push('CH2 unlocked → UNLOCKED_MODE'); s.unl=true; if (s.real!==0) setMode(0,'CH2 lost'); }
        else if (s.unl){ s.unl=false; analyze(0xff,0xff); setMode(6,'exit UNLOCKED MODE'); s.jmp=6; }
      } else if (D.prod==='D8207'){
        if (!C1L){ shutOff(1); shutOff(2); s.evs.length<3 && s.evs.push('CH1 not locked → goto swm_end (outputs off)'); }
        else { const j=s.jmp, mc=()=>{ ml('MODE_c_handler, every pass'); if (s.real!==12){ setMode(12,'MODE_c_handler'); swmEnd(); } };
          if (j===10){ if (C2L){ if (s.real!==10){ setMode(10,'MODE_a_handler'); swmEnd(); } } else mc(); }
          else if (j===11){ if (MVL){ if (s.real!==11){ setMode(11,'MODE_b_handler'); swmEnd(); } } else mc(); }
          else if (j===12) mc(); }
      } else if (D.prod==='D8206'){
        const m0=()=>{ ml('MODE_0_handler, every pass'); if (s.real!==0){ setMode(0,'MODE_0_handler'); swmEnd(); } }, j=s.jmp;
        if (j===7){ if (MVL){ if (s.real!==7){ setMode(7,'MODE_7_handler'); swmEnd(); } } else m0(); }
        else if (j===13){ if (C2L){ if (s.real!==13){ setMode(13,'MODE_d_handler'); swmEnd(); } } else m0(); }
        else if (j===0) m0();
      }
    }
    // LED_processing
    if (!(p.sharc && s.sinit)){
      const L=[0,0,0,0], r=s.real;
      if (D.prod==='D8205'){ L[0]=+C2L; L[1]=+C1L; L[3]=+(!C1L||!C2L); if (r<=2) L[2]=1; }
      if (D.prod==='D8208'){ L[3]=+s.e2; L[0]=+C2L; if (r<=2) L[2]=1; }
      if (D.prod==='D8207'){ L[1]=+C1L; L[0]=+C2L; L[3]=+(s.e1||!C1L||!C2L); if (r===10) L[0]=1; if (r===11) L[2]=1; }
      if (D.prod==='D8206'){ if (r<=2){ L[3]=1; L[0]=1; } if (r===7 && MVL) L[2]=1; if (r===13 && C2L) L[1]=1; }
      s.led=L; }
    // flush8420reg (TXOFF reaches the chips) and AES_output_control
    if (!(p.sharc && s.sinit)){
      if (s.f1 && --s.c1===0){ s.tx1off=false; s.f1=false; s.evs.push('AES_output_control: 0x55 passes done → shut_on_AES_output_CH1'); }
      if (s.f2 && --s.c2===0){ s.tx2off=false; s.f2=false; s.evs.push('AES_output_control → shut_on_AES_output_CH2'+(D.testing?' (no effect: reg 3 of chip #2 is always written as 0)':'')); }
    }
    if (s.i2c) cyc+=CYC_I2C;
    const dur=cyc*TCY;
    passes.push({i:idx,t0:t,dur,kind:'loop',ev:s.evs,real:s.real,jmp:s.jmp,MODE1:s.MODE1,MODE2:s.MODE2,in1,in2,led:s.led.slice(),tx1:!s.tx1off,tx2:D.testing?true:!s.tx2off,
      sinit:s.sinit,deb:s.deb,bc:s.bc,c1:s.f1?s.c1:0,c2:s.f2?s.c2:0,nib,i2c:s.i2c,L1,L2,VL,e1:s.e1,e2:s.e2,unl:s.unl,tmo:s.tmo});
    t+=dur; idx++;
  }
  SIMR={passes,frames,resets,inits,sharcAt: frames.length? frames[0].t+SHARC_DLY : null};
  return SIMR;
}
function passAt(t){ const ps=simulate().passes; if (t<T_PWRT) return null; let lo=0,hi=ps.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; } return ps[lo]; }
function stepAt(t){ const p=passAt(t); if (!p||p.kind!=='loop') return -1; const f=(t-p.t0)/p.dur*BASE_CYC; let a=0; for (let k=0;k<STEPS.length;k++){ a+=STEPS[k][1]; if (f<a) return k; } return STEPS.length-1; }
function frameAt(t){ const fr=simulate().frames; let r=null; for (const f of fr){ if (f.t<=t) r=f; else break; } return r; }
function ledsAt(t){ const p=passAt(t); return p? p.led : [0,0,0,0]; }

/* ---------------- audio path (sample_proc_D8205 / D8206 / D8208, D8207 hardware SRC) ---------------- */
function rateOf(k,t){ return presentAt(k,t)? D[k].fs : 0; }
function outRate(p,t){ if (!p) return 0; const r=p.real;
  if (r===0||r===15||r===12&&D.prod!=='D8207') return 48000; if (r===1) return 96000; if (r===2) return 32000;
  if (r===3||r===5) return D.in2.fs; if (r===4||r===6||r===10||r===13) return D.in1.fs; if (r===7||r===11) return 48000; if (r===12) return D.in2.fs; return 48000; }
function gains(ji, rv, rem, trimBit){
  const c1=rv[0], c2=rv[1], c3=rem[0], c4=rem[1], vol=(ji>>trimBit)&1, remote=(ji>>8)&1, mono=(ji>>9)&1;
  let f6=1,f7=1,f8,f9; const T=vol?volGain:trmGain;
  if (!remote){ f8=T(c1); f9=T(c2); } else { f6=(vol?volGain:trmGain)(c3); f7=(vol?volGain:trmGain)(c4); f8=trmGain(c1); f9=trmGain(c2); }
  if (!mono){ f6=f8*f6; f7=f9*f7; f8=f6; f9=f7; } else { const a=f8*f6, b=f9*f7; f8=a; f9=a; f6=b; f7=b; }
  return {ch1:[f6,f7], ch2:[f8,f9], vol, remote, mono};
}
function audioAt(t){
  const p=passAt(t), fr=frameAt(t), o={out:[null,null], note:'', fs:outRate(p,t)};
  const a1=Math.pow(10,D.in1.lvl/20), a2=Math.pow(10,D.in2.lvl/20);
  const sig=(amp,desc)=>({amp,desc});
  if (D.prod==='D8207'){ const L=p&&p.L1; o.out[0]=o.out[1]=L? [sig(a2,'Input 2 L via SRC'),sig(a2,'Input 2 R via SRC')] : [sig(0,'—'),sig(0,'—')]; o.note='No SHARC: the CS8420 #1 sample-rate converter does the work (REAL_MODE_a/b/c).'; return o; }
  if (!fr){ o.out=[[sig(0,'SHARC not running'),sig(0,'')],[sig(0,'SHARC not running'),sig(0,'')]]; o.note='The SHARC has not decoded a control frame yet: serial data is zero.'; return o; }
  const ji=(fr.m1<<8)|fr.m2;
  if (D.prod==='D8205'){
    const g=gains(ji, fr.rv, fr.rem, 12);
    const ch1Lock=(ji>>15)&1, ch2Lock=(ji>>14)&1, m1=(ji>>6)&1, m2=(ji>>5)&1;   // CH1 = Input 2, CH2 = Input 1
    let c1=ch1Lock? [a2,a2] : [0,0], c2=ch2Lock? [a1,a1] : [0,0];
    if (m1) c1=[c1[0],c1[0]]; if (m2) c2=[c2[0],c2[0]];
    c1=[c1[0]*g.ch1[0], c1[1]*g.ch1[1]]; c2=[c2[0]*g.ch2[0], c2[1]*g.ch2[1]];
    const tone=Math.pow(10,((ji>>4)&1? -18:-20)/20);
    const pick=r=> r===0? [sig(c1[0],'Input 2 L'),sig(c1[1],'Input 2 R')] : r===1? [sig(c2[0],'Input 1 L'),sig(c2[1],'Input 1 R')] : r===2? [sig(c1[0]+c2[0],'mix 2+1 L'),sig(c1[1]+c2[1],'mix 2+1 R')] : [sig(tone,'1 kHz tone'),sig(tone,'1 kHz tone')];
    o.out=[pick(ji&3), pick((ji>>2)&3)]; o.g=g;
    o.note=`${g.remote?'Remote on':'Internal pots'}, ${g.vol?'volume (D8205_vol.dat)':'trim (D8205_trm.dat)'}, ${g.mono?'one pot per input':'RV1 = left, RV2 = right'}.`;
  } else if (D.prod==='D8208'){
    const g=gains(ji, fr.rv, fr.rem, 6), lock=(ji>>14)&1, tone=(ji>>11)&1, mono=(ji>>5)&1, inv=(ji>>4)&1, tl=Math.pow(10,((ji>>10)&1?-18:-20)/20);
    let c=lock? [a1,a1]:[0,0]; if (mono) c=[c[0],c[0]];
    const out = tone? [sig(tl,'1 kHz tone'),sig(tl,'1 kHz tone')] : [sig(c[0]*g.ch2[0],'Input L'),sig(c[1]*g.ch2[1],'Input R'+(inv?' (inverted)':''))];
    o.out=[out,out]; o.note='All three board outputs carry CS8420 #2 (AUD_OUTPUT_ROUTE = 0x70). Remote/level extraction assumed the same as D8205 '+inf('sample_proc_D8208 not fully read');
  } else if (D.prod==='D8206'){
    const sil1=(ji>>9)&1, sil2=(ji>>8)&1;
    const ch=(lvlIdx,frqBit)=>{ if (lvlIdx===7) return sig(d6Vol(fr.rv[0]), `${Math.round(d6Frq(fr.rv[1]))} Hz (pots)`); const a=ATT6[lvlIdx]; return sig(Math.pow(10,a/20), `${frqBit?400:1000} Hz`); };
    const A=ch((ji>>4)&7,(ji>>7)&1), B=ch(ji&7,(ji>>3)&1);
    o.out=[ sil1? [sig(0,'silence'),sig(0,'silence')] : [A,B], sil2? [sig(0,'silence'),sig(0,'silence')] : [A,B] ];
    o.note='CH A → left, CH B → right; level index = LVL2·4 + LVL1·2 + LVL0 into tt_att_val[8] (7 = pots: RV1 level, RV2 frequency).';
  }
  return o;
}
function outState(t){ const p=passAt(t); return {tx1: !!(p&&p.tx1), tx2: !!(p&&p.tx2)}; }

/* ---------------- actions (each logs the code path) ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t, name, tr}); if (D.log.length>40) D.log.length=40; SIM.refresh(); }
const live = ()=> SIM.t > T_PWRT+0.002;
function firstAfter(t, pred){ const ps=simulate().passes; for (const p of ps) if (p.t0>=t && p.kind==='loop' && pred(p)) return p; return null; }
const A = {
  jumper(n){ const t=SIM.t, cur=jAt(t)[n], v=cur?0:1, pr=P();
    act(`H${n} → ${v?'OFF':'ON'} (${pr.J[n-1]}${pr.JV[n-1][v]?': '+pr.JV[n-1][v]:''})`, tr=>{
      if (live()) D.ev.push({t,k:'j',n,v}); else D.j0[n]=v;
      const pin={1:27,2:28,3:29,4:30,5:42,6:44,7:45,8:46,9:47,10:48,11:49,12:50,13:40,14:37}[n];
      tr(`H${n} centre pin → U4 EPM7128S pin ${pin} (s${n-1}); ${v?'1–2: 10K R12 pull-up rail → 1':'2–3: 10K R11 pull-down rail → 0'} ${inf('which end is ON')}`);
      if (n===14){ tr(`No firmware: d8200_top.rpt JACK_OUT = AUD_OUT2 & s13 # AUD_OUT1 & !s13 → MONITOR jack now carries OUT${v?2:1}`); return; }
      tr(`Link_to_ALTERA reads it back in FROM_ALTERA${n<=8?0:1} bit ${n<=8?n-1:n-9}; jmp_input copies it to input_reg${(n>=5&&n<=12)?2:1}`);
      if (!live()){ tr('Set before power-up: it is in MODE1/MODE2 after the first debounce.'); return; }
      const p1=firstAfter(t,p=>p.ev.some(e=>e.startsWith('debounce: input'))), p2=p1&&firstAfter(p1.t0+1e-9,p=>p.ev.some(e=>e.startsWith('MODE1 =')));
      if (p1) tr(`pass #${p1.i} @ ${SIM.fmtT(p1.t0)}: debounce sees the change, bcount = 0x1F`); else tr('debounce is suspended (SHARC_IN_INIT) or the pattern is unchanged');
      if (p2){ tr(`pass #${p2.i} @ ${SIM.fmtT(p2.t0)}: ${p2.ev.find(e=>e.startsWith('MODE1 ='))}`); p2.ev.filter(e=>!e.startsWith('MODE1')).forEach(e=>tr(e));
        if (pr.sharc){ const f=simulate().frames.find(f=>f.t>p2.t0+1e-9 && ((f.m1<<8|f.m2)===((p2.MODE1<<8)|p2.MODE2))); if (f) tr(`SHARC: nibbles 4–7 carry the new MODE1/MODE2; ctrl_proc completes the frame @ ${SIM.fmtT(f.t)} → jumpers_analize_${D.prod} / sample_proc_${D.prod} use it`); } }
    }); },
  input(k){ const t=SIM.t, now=presentAt(k,t), name=k==='in1'?'Input 1 (main reference)':'Input 2 (main audio)', chip=k==='in1'?'CS8420 #2 U5 ("CH2")':'CS8420 #1 U6 ("CH1")';
    act(`${now?'Unplug':'Plug in'} ${name}`, tr=>{ if (live()) D.ev.push({t,k,v:!now}); else D[k].on=!now;
      tr(`${name} → ${k==='in1'?'H16 → T2 → U10 75176 → C51':'T8 → U11 75176 → C47'} → ${chip} RXP`);
      tr(now? `Receiver UNLOCK at once; the next jmp_input (RD_CH, MAP 0x10, bit 4) clears ${k==='in1'?'input_reg1 bit 6':'input_reg1 bit 7'}` : `PLL lock after ~${LOCK_T*1e3} ms ${inf('CS8420 lock time')}; then jmp_input sets the lock bit`);
      if (live()){ const p=firstAfter(t+0.0005,p=>p.ev.some(e=>e.startsWith('MODE1 ='))); if (p){ tr(`pass #${p.i} @ ${SIM.fmtT(p.t0)}: debounced — ${p.ev.find(e=>e.startsWith('MODE1 ='))}`); p.ev.filter(e=>!e.startsWith('MODE1')).forEach(e=>tr(e)); } } }); },
  pull(k){ const t=SIM.t; if (!live()) SIM.seek(0.5); const t0=SIM.t; act(`Pull ${k==='in1'?'Input 1':'Input 2'} for 150 ms at ${SIM.fmtT(t0)}`, tr=>{ D.ev=D.ev.filter(e=>e.k!==k); D.ev.push({t:t0,k,v:false},{t:t0+0.15,k,v:true}); D[k].on=true;
      tr('Signal gone for 150 ms. Zoom to 100 ms and step through: lock bit → 31-pass debounce → switch_8420_modes → outputs → LEDs.'); }); },
  video(){ act(D.vid?'Remove video reference':'Connect video reference', tr=>{ D.vid=!D.vid; tr('VIDEO_IN (P1-17/P1-23, T3) → C41 → U7 ML6431 genlock; LOCKED (U7-15) → U4 pin 53 → FROM_ALTERA1 bit 7 → ML6431_LOCKED (MODE1 bit 5)'); if (!P().ml) tr(`${D.prod} does not define ML6431_EXIST, so the firmware ignores it.`); }); },
  pot(i,code){ act(`${i?'RV2':'RV1'} → code ${code}`, tr=>{ D.rv[i]=code; tr(`RV${i+1} wiper → R${i?1:2} 1K → U1 pin ${i?2:3} (AN${i?0:1}); AtoD_data_preparing reads it as ${i?'code2 (ANAL_PIN2)':'code1 (ANAL_PIN1)'} every 4th conversion`);
      tr('Average keeps the last 4 readings; Hysterisis ignores ±1 and locks after 256 equal readings (“about 4 second”)');
      tr(`Link_to_SHARC sends it as nibbles ${i?'a,b':'8,9'}; SHARC looks it up: trim ${(20*Math.log10(trmGain(code))).toFixed(1)} dB, volume ${dB(volGain(code))} dB`); }); },
  remote(i,code){ act(`Remote pot ${i?'R':'L'} → code ${code}`, tr=>{ D.rem[i]=code; tr(`P1-${i?21:19} → R${i?4:3} 1K → U1 pin ${i?7:4} (AN${i?4:2}) → code${i?4:3} → nibbles ${i?'e,f':'c,d'}`); }); },
  prod(v){ act(`Build for ${v} (#define ${v} in d820x.h)`, tr=>{ const keep={in1:D.in1,in2:D.in2,vid:D.vid,frame:D.frame}; D.prod=v; reset(true); Object.assign(D,keep);
      const pr=P(); tr(`PRODUCT_NUMBER ${hex(pr.num)}, AUD_OUTPUT_ROUTE ${hex(pr.route)}${pr.sharc?', SHARC_EXIST':''}${pr.ml?', ML6431_EXIST':''}; jumpers.txt CS = ${pr.cs}`);
      tr(pr.sharc? 'The SHARC picks its own code from received_PRODUCT_NUMBER (D8205_beg / D8206_beg / D8208_beg)':'No SHARC: the PIC never waits for 0xE4 and the CS8420 SRC carries the audio'); }); },
  testing(){ act(`${D.testing?'Remove':'Restore'} the two “MOVLW 0 ;TESTING” lines in flush8420reg`, tr=>{ D.testing=!D.testing;
      tr(D.testing? 'As archived (v1.104, v1.105): CH1 reg 2 and CH2 reg 3 are always written as 0x00 → chip #2 TXOFF can never be set' : 'As in v1.104-055: the shadow registers reach both chips; OUT2 mutes like OUT1'); }); },
  sharcFail(){ act(D.sharcFail?'Fit a programmed SHARC boot EPROM':'Simulate a blank SHARC boot EPROM (U2)', tr=>{ D.sharcFail=!D.sharcFail; tr(D.sharcFail?'The SHARC never answers 0xE4: after 256 passes SHARC_link_control does goto WHOLE_RESET, and init pulls RESET low again':'SHARC boots, decodes a 16-nibble frame and answers 0xE4'); }); },
  rate(k,fs){ act(`${k==='in1'?'Input 1':'Input 2'} sample rate → ${fs/1000} kHz`, tr=>{ D[k].fs=fs; tr('The CS8420 receiver locks 8–108 kHz; the SRC or the counters decide the output rate'); }); },
  err(k){ act(`${D[k].err?'Clear':'Inject'} confidence/biphase errors on ${k==='in1'?'Input 1':'Input 2'}`, tr=>{ D[k].err=!D[k].err; tr(`jmp_input: RD_CH${k==='in1'?2:1} MAP 0x10 bits 2/1 → FLG_ERROR_CH${k==='in1'?2:1}`); tr(D.prod==='D8205'?'LED_processing for D8205 never reads FLG_ERROR_CH1/2 — the red LED will not show it':'D8207/D8208 LED_processing light LED_3 from it'); }); },
  frame(v){ act(`Install in ${v}`, tr=>{ D.frame=v; tr(v==='MF82/10'?'BNC3 rear module (10 BNC, MF8210 only)':'BNC1 rear module (7 BNC)'); }); },
  h16(){ act(`H16 → ${D.h16==='external'?'local (frame MF82REF)':'external'}`, tr=>{ D.h16=D.h16==='external'?'local':'external'; tr(`H16 2×3 routes T2 to ${D.h16==='external'?'P1-1/P1-2 (rear AES REF INPUT)':'P1-5/P1-6 (frame reference bus)'}`); }); },
  term(i){ const o=['75','110','HiZ']; act(`Input ${i+1} termination → ${o[(o.indexOf(D.term[i])+1)%3]}`, tr=>{ D.term[i]=o[(o.indexOf(D.term[i])+1)%3]; tr(`${i?'H18':'H17'} 2×3: R${i?21:15} 75R / R${i?22:16} 110R / none — manual figure 2 (TERM1, TERM2)`); }); },
  clearEv(){ act('Clear timed events', tr=>{ D.ev=[]; tr('Jumper and input changes made during the second are removed.'); }); },
  reset(){ reset(false); SIM.seek(0); SIM.refresh(); },
};

/* ---------------- drawings ---------------- */
const BW=1280, BH=349;                                    // Gerber render: 120 dpi, X 4.18–14.82 in, Y 4.90–7.78 in
const BX = x=> (x/1000-4.18)*120, BY = y=> (7.78-y/1000)*120;
const HX = [0,9000,9100,9200,9300,9450,9550,9650,9750,9900,10000,10100,10200,10350,10450];   // H1..H14 from d8200-2.pdf (PDIF)
const LEDP = [['AUDIO1',7550,'var(--led-g)'],['AUDIO2',7450,'var(--led-g)'],['PROC',7350,'#ffd24a'],['ERR',7250,'#ff4a3a']];
const glow = `<defs><filter id="d82g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
function boardSVG(t){
  const L=ledsAt(t), J=jAt(t), au=audioAt(t), os=outState(t), p=passAt(t), st=stepAt(t);
  let s=`<svg viewBox="0 0 ${BW} ${BH+26}" style="width:100%;display:block">${glow}
    <rect x="0" y="0" width="${BW}" height="${BH}" rx="6" fill="#145a35"/>
    <image href="siumulation-plugins/assets/d8200-board-copper.png" x="0" y="0" width="${BW}" height="${BH}" opacity=".55"/>
    <image href="siumulation-plugins/assets/d8200-board-silk-white.png" x="0" y="0" width="${BW}" height="${BH}"/>`;
  // chips that are busy at the playhead
  const busy = {U1:true, U4: st===2, U5: st===4||st===10, U6: st===4||st===10, U3: !!frameAt(t), U7: p&&p.i2c};
  [['U1',6250,5925,6250+1400,5925+300,'PIC16C73 · '+(st>=0?STEPS[st][0]:'—')],['U4',9100,7300,9950,6400,'EPM7128S'],['U3',7700,7400,8800,6000,'ADSP-21061'],['U5',10380,7300,10620,6450,'CS8420 #2'],['U6',11300,7300,11540,6450,'CS8420 #1'],['U7',11250,5750,11500,5450,'ML6431']].forEach(([r,x1,y1,x2,y2,l])=>{
    const on=busy[r]; s+=`<g><title>${r} ${l}</title><rect x="${BX(Math.min(x1,x2))}" y="${BY(Math.max(y1,y2))}" width="${Math.abs(BX(x2)-BX(x1))}" height="${Math.abs(BY(y2)-BY(y1))}" fill="${on?'rgba(255,220,90,.22)':'transparent'}" stroke="${on?'#ffd84a':'transparent'}" stroke-dasharray="4 3"/></g>`; });
  // LEDs (front edge, right-angle)
  LEDP.forEach(([n,y,c],i)=>{ const on=L[i]; s+=`<g><title>${n}: ${P().LED[i]} — ${on?'ON':'off'}</title><rect x="${BX(4190)}" y="${BY(y)-5}" width="14" height="10" rx="2" fill="${on?c:'#2c332c'}" ${on?'filter="url(#d82g)"':''} stroke="#000"/></g>`; });
  // pots RV1/RV2
  [['RV1',7025,0],['RV2',6825,1]].forEach(([n,y,i])=>{ const c=D.rv[i], x=BX(4475)+8, yy=BY(y)-6, w=56;
    s+=`<g class="d82pot" data-i="${i}" style="cursor:pointer"><title>${n} multiturn (code ${c}). Click the left half to turn down, right half to turn up.</title><rect x="${x-w/2}" y="${yy-8}" width="${w}" height="16" rx="3" fill="#2a64c8" stroke="#0b2a66"/><rect x="${x-w/2+2}" y="${yy-2}" width="${(w-4)*c/255}" height="4" fill="#ffd84a"/><text x="${x}" y="${yy-10}" font-size="10" fill="#fff" text-anchor="middle">${n} ${c}</text></g>`; });
  // jumpers H1..H14
  for (let n=1;n<=14;n++){ const x=BX(HX[n])+4, y=BY(5400)+2, v=J[n], pr=P();
    s+=`<g class="d82j" data-n="${n}" style="cursor:pointer"><title>H${n} (JMP_${n}) — ${pr.J[n-1]}: ${v?'OFF':'ON'} ${pr.JV[n-1][v]||''}. Click to move.</title><rect x="${x-6}" y="${y-2}" width="12" height="40" fill="transparent"/>${[0,1,2].map(k=>`<circle cx="${x}" cy="${y+4+k*12}" r="2.4" fill="#d6c38a"/>`).join('')}<rect x="${x-5}" y="${y+(v?-1:11)}" width="10" height="22" rx="2" fill="#111" stroke="#666"/><text x="${x}" y="${y+48}" font-size="6.5" text-anchor="middle" fill="${v?'#ffb0a0':'#b9f5c9'}">${v?'OFF':'ON'}</text></g>`; }
  // H16, H17, H18
  [['H16',14275,7375,()=>D.h16==='external'?'EXT':'LOCAL','h16'],['H17',13475,7475,()=>D.term[0],'t0'],['H18',13475,6350,()=>D.term[1],'t1']].forEach(([n,x,y,f,a])=>{
    s+=`<g class="d82h" data-a="${a}" style="cursor:pointer"><title>${n}: ${n==='H16'?'reference input local/external (manual fig. 1)':'input '+(n==='H17'?1:2)+' termination 75/110/HiZ (manual fig. 2)'} — click</title><rect x="${BX(x)-4}" y="${BY(y)-4}" width="34" height="24" rx="3" fill="rgba(0,0,0,.45)" stroke="#ffd84a"/><text x="${BX(x)+13}" y="${BY(y)+12}" font-size="9.5" text-anchor="middle" fill="#ffd84a">${f()}</text></g>`; });
  // monitor jack
  const jk=J[14]?2:1, jon=jk===1?os.tx1:os.tx2;
  s+=`<g><title>MONITOR TRS jack ← T1 ← U9 75176 ← JACK_OUT (U4 pin 99): OUT${jk}</title><rect x="${BX(4190)}" y="${BY(5600)}" width="60" height="34" rx="4" fill="none" stroke="${jon?'var(--led-g)':'#999'}" stroke-width="2"/><text x="${BX(4190)+30}" y="${BY(5600)+46}" font-size="10" text-anchor="middle" fill="#fff">MON = OUT${jk}</text></g>`;
  s+=`<text x="4" y="${BH+18}" font-size="11" fill="var(--ink2)">D8200-2 top silkscreen and copper, rendered from D8200-2.SLK / .TOP (Gerber, 2013|46). Part positions from d8200-2.pdf (P-CAD PDIF). Front edge on the left, P1 edge connector on the right.</text></svg>`;
  return s;
}
// Card front edge: board Y span 7.78…4.90 in seen end-on (1″ wide per manual). Heights from the PDIF placement.
function frontSVG(t){
  const L=ledsAt(t), J=jAt(t), os=outState(t), S=110, Y=y=>14+(7.78-y/1000)*S, W=60;
  let s=`<svg viewBox="0 0 230 ${Y(4900)+40}" style="width:100%;max-width:230px">${glow}<rect x="20" y="14" width="${W}" height="${Y(4900)-14}" rx="3" fill="#1b5e33" stroke="#0e3a1f"/>`;
  LEDP.forEach(([n,y,c],i)=>{ const yy=Y(y), on=L[i]; s+=`<g><title>${P().LED[i]}</title><circle cx="${20+W/2}" cy="${yy}" r="5" fill="#0a0b0b"/><circle cx="${20+W/2}" cy="${yy}" r="3.8" fill="${on?c:'var(--led-off)'}" ${on?'filter="url(#d82g)"':''}/><text x="${W+28}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${n} · ${P().LED[i].replace(/ \(.*\)/,'')}</text></g>`; });
  [['RV1',7025,0],['RV2',6825,1]].forEach(([n,y,i])=>{ const yy=Y(y); s+=`<g class="d82pot" data-i="${i}" style="cursor:pointer"><title>${n} adjust (code ${D.rv[i]}). Click left/right half.</title><rect x="${20+W/2-12}" y="${yy-6}" width="24" height="12" rx="2" fill="#2a64c8"/><line x1="${20+W/2-5}" y1="${yy}" x2="${20+W/2+5}" y2="${yy}" stroke="#fff" stroke-width="1.6"/><text x="${W+28}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${n} ${D.rv[i]}</text></g>`; });
  const yj=Y(5425), jk=J[14]?2:1, on=jk===1?os.tx1:os.tx2;
  s+=`<g><title>MONITOR TRS (Audio Bit Buddy, manual)</title><circle cx="${20+W/2}" cy="${yj}" r="9" fill="#111" stroke="${on?'var(--led-g)':'#777'}" stroke-width="2"/><circle cx="${20+W/2}" cy="${yj}" r="3.5" fill="#000"/><text x="${W+28}" y="${yj+4}" font-size="10.5" fill="var(--ink)">MONITOR = OUT${jk}</text></g>
    <text x="2" y="${Y(4900)+16}" font-size="9.5" fill="var(--ink2)">Front edge, to scale from d8200-2.pdf</text><text x="2" y="${Y(4900)+29}" font-size="9.5" fill="var(--ink2)">placement ${'(handle not drawn)'}</text></svg>`;
  return s;
}
// Rear module: the D8205/75 guide art (BNC3 for MF82/10, BNC1 for MF82/12). BNC centres measured on the cut art.
/* BNC centres in CorelDRAW points on “D8205 - rear module options.cdr” (2012-01-16); assets/d8200-rear-bnc1/3.svg are its
   BNC1 and BNC3 modules converted with Inkscape (sheet captions removed). The earlier PNGs (d8200-rear-d8205-*.png) were cut
   from the same sheet's PDF render and stay on the “old PNG” toggle. */
const BNC3 = [['REF',567.7,102.2,'in1'],['LOOP',600.5,102.2,'loop'],['1-1',567.7,138.8,'o1'],['1-2',600.5,138.8,'o1'],['2-1',567.7,175.5,'o2'],['2-2',600.5,175.5,'o2'],['AUDIO',567.7,212.9,'in2'],['2-3',600.5,212.9,'o3'],['2-4',567.7,250.3,'o3'],['2-5',600.5,250.3,'o3']];
const BNC1 = [['REF',388.9,103.6,'in1'],['1-1',411.8,127.7,'o1'],['1-2',388.9,152.0,'o1'],['2-1',411.8,176.2,'o2'],['2-2',388.8,200.6,'o2'],['AUDIO',412.2,225.5,'in2'],['2-3',388.8,249.9,'o3']];
const BNC_OLD = { BNC3:[['REF',205,108],['LOOP',294,108],['1-1',205,216],['1-2',294,216],['2-1',205,321],['2-2',294,321],['AUDIO',205,428],['2-3',294,428],['2-4',205,528],['2-5',294,528]], BNC1:[['REF',235,110],['1-1',302,175],['1-2',235,240],['2-1',302,308],['2-2',235,375],['AUDIO',302,442],['2-3',235,512]] };
const REAR_VB = { BNC1:[346,64,114,210], BNC3:[524,72,130,202] };
const D8205_RO = '#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8205 - rear module options.cdr';
function rearSVG(t){
  const b3=D.frame==='MF82/10', list=b3?BNC3:BNC1, W=b3?462:474, H=598, os=outState(t), p=passAt(t);
  const o3 = P().route>>6; // D23..D22 of Altera byte 2: 00 #1, 01 #2, 10 CNT1 frame, 11 CNT2 frame (GDF note)
  const old=D.rearOld, key=b3?'BNC3':'BNC1', vb=REAR_VB[key], R=old?38:14.5, SW=old?5:2;
  let s= old? `<svg viewBox="0 0 ${W} ${H+30}" style="width:100%;max-width:340px">${glow}<rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="#e9e7e0"/><image href="siumulation-plugins/assets/d8200-rear-d8205-${b3?'bnc3':'bnc1'}-black.png" x="0" y="0" width="${W}" height="${H}"/>`
    : `<svg viewBox="${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]+12}" style="width:100%;max-width:340px">${glow}<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" rx="2" fill="#fff"/><image href="siumulation-plugins/assets/d8200-rear-${b3?'bnc3':'bnc1'}.svg" x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}"/>`;
  list.map((b,i)=>old?[b[0],BNC_OLD[key][i][1],BNC_OLD[key][i][2],b[3]]:b).forEach(([n,x,y,k])=>{
    let col='transparent', tip='', click='';
    if (k==='in1'||k==='in2'){ const on=presentAt(k,t); col=on?'#2fbf5f':'#c0392b'; tip=`${k==='in1'?'Input 1 / AES REF':'Input 2 / AES AUDIO'} — ${on?'connected, '+D[k].fs/1000+' kHz':'unplugged'}. Click to plug/unplug.`; click=`data-in="${k}"`; }
    else if (k==='o1'){ col=os.tx1?'#2fbf5f':'#888'; tip=`DIGITAL OUT ${n}: OUTPUT1 (U4-97) → U8:A → ${n==='1-1'?'T4':'T5'} — CS8420 #1 ${os.tx1?'transmitting':'TXOFF'}`; }
    else if (k==='o2'){ col=os.tx2?'#2fbf5f':'#888'; tip=`DIGITAL OUT ${n}: OUTPUT2 (U4-96) → U8:B → ${n==='2-1'?'T6':'T7'} — CS8420 #2 ${os.tx2?'transmitting':'TXOFF'}`; }
    else if (k==='o3'){ col=o3>=2?'#e3a35a':'#5aa9e6'; tip=`DIGITAL OUT ${n}: OUTPUT3 (U4-55, net WORD) → U12 → T3/T9/T10. AUD_OUTPUT_ROUTE ${hex(P().route)} → ${['CS8420 #1','CS8420 #2','frame from CNT1 (word clock)','frame from CNT2'][o3]} — see Findings`; }
    else { col='#999'; tip='INPUT LOOP (passive)'; }
    s+=`<g ${click} style="cursor:${click?'pointer':'default'}"><title>${tip}</title><circle cx="${x}" cy="${y}" r="${R}" fill="${click?'rgba(0,0,0,0)':'none'}" stroke="${col}" stroke-width="${SW}" opacity=".85" ${col.startsWith('#2f')?'filter="url(#d82g)"':''}/></g>`; });
  s+= old? `<text x="4" y="${H+18}" font-size="12" fill="var(--ink2)">D8205/75 ${b3?'BNC3':'BNC1'} — old PNG cut from “D8205 - rear module options.pdf”</text></svg>`
    : `<text x="${vb[0]+2}" y="${vb[1]+vb[3]+9}" font-size="5.5" fill="var(--ink2)">D8205/75 ${key}</text></svg>`;
  s+=`<div class="small muted">${old?'Old PNG silk.':`CorelDRAW artwork: ${key} on ${SIM.src(D8205_RO,'D8205 - rear module options.cdr')} (2012-01-16).`} <label><input type="checkbox" class="d82old" ${old?'checked':''}> old PNG</label></div>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.d82j').forEach(g=>g.onclick=()=>A.jumper(+g.dataset.n));
  root.querySelectorAll('.d82pot').forEach(g=>g.onclick=e=>{ const r=g.getBoundingClientRect(), i=+g.dataset.i, up=e.clientX>r.left+r.width/2; A.pot(i, Math.max(0,Math.min(255,D.rv[i]+(up?16:-16)))); });
  root.querySelectorAll('[data-in]').forEach(g=>g.onclick=()=>A.input(g.dataset.in));
  root.querySelectorAll('.d82old').forEach(c=>c.onchange=()=>{ D.rearOld=c.checked; SIM.refresh(); });
  root.querySelectorAll('.d82h').forEach(g=>g.onclick=()=>{ const a=g.dataset.a; if (a==='h16') A.h16(); else A.term(+a.slice(1)); });
}
function controlsHTML(){
  const opt=(arr,v)=>arr.map(([k,l])=>`<option value="${k}" ${String(k)===String(v)?'selected':''}>${l}</option>`).join('');
  const fs=[[32000,'32 kHz'],[44100,'44.1 kHz'],[48000,'48 kHz'],[96000,'96 kHz']];
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px" class="small">
   <label>Build <select data-c="prod">${opt(Object.keys(PROD).map(k=>[k,k+' · '+PROD[k].what]),D.prod)}</select></label>
   <label>Frame <select data-c="frame">${opt([['MF82/10','MF82/10 (BNC3)'],['MF82/12','MF82/12 (BNC1)']],D.frame)}</select></label>
   <label>Input 1 <select data-c="fs1">${opt(fs,D.in1.fs)}</select></label><label>Input 2 <select data-c="fs2">${opt(fs,D.in2.fs)}</select></label>
   <label>levels <input type="range" min="-40" max="0" value="${D.in1.lvl}" data-c="lvl" style="width:80px"> ${D.in1.lvl} dBFS</label>
   <label>RV1 <input type="range" min="0" max="255" value="${D.rv[0]}" data-c="rv0" style="width:90px"></label><label>RV2 <input type="range" min="0" max="255" value="${D.rv[1]}" data-c="rv1" style="width:90px"></label>
   <label>Remote L/R <input type="range" min="0" max="255" value="${D.rem[0]}" data-c="rm0" style="width:60px"><input type="range" min="0" max="255" value="${D.rem[1]}" data-c="rm1" style="width:60px"></label>
   <button data-c="p1">Pull Input 1 for 150 ms here</button><button data-c="p2">Pull Input 2 for 150 ms here</button>
   <button data-c="e1">${D.in1.err?'Clear':'Inject'} errors on Input 1</button>
   ${P().ml?`<button data-c="vid">${D.vid?'Remove':'Connect'} video ref</button>`:''}
   <button data-c="test" class="${D.testing?'':'on'}">${D.testing?'flush8420reg: TESTING lines in (as archived)':'TESTING lines removed'}</button>
   ${P().sharc?`<button data-c="sf" class="${D.sharcFail?'on':''}">${D.sharcFail?'SHARC EPROM blank':'SHARC EPROM OK'}</button>`:''}
   <button data-c="clr">Clear timed events (${D.ev.length})</button><button data-c="rst">Reset</button></div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(`[data-c="${s}"]`), on=(s,ev,f)=>{ const e=q(s); if (e) e.addEventListener(ev,f); };
  on('prod','change',e=>A.prod(e.target.value)); on('frame','change',e=>A.frame(e.target.value));
  on('fs1','change',e=>A.rate('in1',+e.target.value)); on('fs2','change',e=>A.rate('in2',+e.target.value));
  on('lvl','change',e=>{ D.in1.lvl=D.in2.lvl=+e.target.value; SIMKEY=''; act('Input levels → '+e.target.value+' dBFS', tr=>tr('Test material: L 1 kHz, R 400 Hz '+inf('signal content'))); });
  on('rv0','change',e=>A.pot(0,+e.target.value)); on('rv1','change',e=>A.pot(1,+e.target.value));
  on('rm0','change',e=>A.remote(0,+e.target.value)); on('rm1','change',e=>A.remote(1,+e.target.value));
  on('p1','click',()=>A.pull('in1')); on('p2','click',()=>A.pull('in2')); on('e1','click',()=>A.err('in1')); on('vid','click',()=>A.video());
  on('test','click',()=>A.testing()); on('sf','click',()=>A.sharcFail()); on('clr','click',()=>A.clearEv()); on('rst','click',()=>A.reset());
}

/* ---------------- AES3 scope (biphase-mark, one frame of OUT1) ---------------- */
const PRE = { Z:[1,1,1,0,1,0,0,0], Y:[1,1,1,0,0,1,0,0], X:[1,1,1,0,0,0,1,0] };
function subframe(v, word24, pre){ const bits=[0,0,0,0]; const w=word24? v : (v & ~0xF); for (let k=0;k<24;k++) bits.push((w>>k)&1); bits.push(0,0,0); let par=0; bits.forEach(b=>par^=b); bits.push(par); return {pre, bits}; }
function drawScope(cv, t){
  const {c,w,h}=SIM.canvas(cv,150), au=audioAt(t), os=outState(t), fs=au.fs||48000, n=Math.floor(t*fs);
  const ph=2*Math.PI*1000*n/fs, ampL=au.out[0]? au.out[0][0].amp : 0, ampR=au.out[0]? au.out[0][1].amp:0;
  const sL=Math.round(Math.max(-1,Math.min(1,ampL*Math.sin(ph)))*0x7FFFFF)&0xFFFFFF, sR=Math.round(Math.max(-1,Math.min(1,ampR*Math.sin(ph*0.4)))*0x7FFFFF)&0xFFFFFF;
  const J=jAt(t), w24=!J[5]||D.prod==='D8206';
  const sfs=[subframe(sL,w24,n%192===0?'Z':'X'), subframe(sR,w24,'Y')]; const cells=[]; let lv=0;
  sfs.forEach(sf=>{ PRE[sf.pre].forEach(b=>{ lv=b; cells.push(lv); }); sf.bits.slice(4).forEach(b=>{ lv^=1; cells.push(lv); if (b) lv^=1; cells.push(lv); }); });
  c.fillStyle=SIM.css('--lane'); c.fillRect(0,0,w,h); const dx=(w-20)/cells.length, ink=os.tx1?SIM.css('--accent'):SIM.css('--ink2');
  c.strokeStyle=ink; c.lineWidth=1.6; c.beginPath(); cells.forEach((v,i)=>{ const x=10+i*dx, y=v?30:70; if (i===0) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+dx,y); }); c.stroke();
  c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono');
  c.fillText(`OUT1 frame #${n%192} of block · ${fs/1000} kHz · L ${hex(sL,6)} R ${hex(sR,6)} · ${w24?'24':'20'}-bit · ${os.tx1?'TX on':'TXOFF: line idle'}`,10,96);
  c.fillText(`cell = ${SIM.fmtDur(1/(fs*128))} · frame = ${SIM.fmtDur(1/fs)} · preambles ${sfs[0].pre}/${sfs[1].pre} (8 cells each, break the biphase rule)`,10,114);
  c.fillStyle=SIM.css('--ink2'); c.fillText('Subframe A: preamble · 4 aux · 24 audio (LSB first) · V U C P   |   Subframe B …',10,134);
}

/* ---------------- timeline lanes ---------------- */
function bar(c,X,t0,t1,y,h,segs){ segs.forEach(([a,b,col,lab])=>{ if (b<t0||a>t1) return; const xa=X(Math.max(a,t0)), xb=X(Math.min(b,t1)); c.fillStyle=col; c.fillRect(xa,y+5,Math.max(1,xb-xa),h-10); if (lab && xb-xa>30){ c.fillStyle='#fff'; c.font='10.5px '+SIM.css('--sans'); c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); c.fillText(lab,xa+3,y+h/2+4); c.restore(); } }); }
function passSegs(t0,t1,f){ const ps=simulate().passes, out=[]; let cur=null;
  for (const p of ps){ const a=p.t0, b=p.t0+p.dur; if (b<t0||a>t1) continue; const [col,lab]=f(p)||[null,'']; if (cur && cur[2]===col && cur[3]===lab){ cur[1]=b; } else { if (cur) out.push(cur); cur=[a,b,col,lab]; } }
  if (cur) out.push(cur); return out.filter(s=>s[2]); }
function inSegs(k,t0,t1,lockFn){ const out=[]; const N=400, dt=(t1-t0)/N; let cur=null;
  for (let i=0;i<=N;i++){ const t=t0+i*dt, pr=presentAt(k,t), lk=lockFn(t), col=!pr?'#b3261e':lk?'#1f7a4d':'#b5651d', lab=!pr?'no signal':lk?'locked':'acquiring';
    if (cur && cur[2]===col) cur[1]=t+dt; else { if (cur) out.push(cur); cur=[t,t+dt,col,lab]; } } if (cur) out.push(cur); return out; }
function lanes(){
  const r=simulate(), pr=P(), acc=SIM.css('--accent'), acc2=SIM.css('--accent2'), warn=SIM.css('--warn'), bad=SIM.css('--bad'), ink2=SIM.css('--ink2');
  const L=[
    {label:'Input 1 (REF) → CS8420 #2', h:24, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,inSegs('in1',t0,t1,t=>rxLock('in1',t)))},
    {label:'Input 2 (AUDIO) → CS8420 #1', h:24, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,inSegs('in2',t0,t1,t=>rxLock('in2',t)))},
  ];
  if (pr.ml) L.push({label:'Video ref → ML6431', h:22, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,inSegs('vid',t0,t1,vidLock))});
  L.push(
    {label:'PIC power-up / init / passes', h:28, draw:(c,X,t0,t1,y,h)=>{ bar(c,X,t0,t1,y,h,[[0,T_PWRT,'#666','power-up timer 72 ms']]);
      const ps=r.passes.filter(p=>p.t0+p.dur>=t0 && p.t0<=t1), wpx=(X(t1)-X(t0))/Math.max(1,ps.length);
      if (wpx<2.5){ bar(c,X,t0,t1,y,h,passSegs(t0,t1,p=>p.kind==='init'?['#8a5','init']:p.kind==='reset'?[bad,'WHOLE_RESET']:[ink2, ''])); c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`${ps.length} passes (${SIM.fmtDur(BASE_CYC*TCY)}+ each)`, Math.max(X(t0),X(T_PWRT))+6, y+h/2+4); }
      else ps.forEach(p=>{ const xa=X(p.t0), xb=X(p.t0+p.dur); c.fillStyle=p.kind==='init'?'#8a5':p.kind==='reset'?bad:(p.i%2?acc2:'#3d7fb5'); c.fillRect(xa,y+5,Math.max(1,xb-xa-1),h-10);
        if (xb-xa>60 && p.kind==='loop'){ let a=p.t0; STEPS.forEach((s2,k)=>{ const d=s2[1]/BASE_CYC*BASE_CYC*TCY; const xx=X(a); c.fillStyle='rgba(255,255,255,.35)'; c.fillRect(xx,y+5,1,h-10); if (X(a+d)-xx>48){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--sans'); c.fillText(s2[0].split(' ')[0],xx+2,y+h/2+4); } a+=d; }); }
        else if (xb-xa>22){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(p.kind==='loop'?'#'+p.i:p.kind,xa+2,y+h/2+4); } }); }},
    {label:'debounce (bcount)', h:20, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,passSegs(t0,t1,p=>p.deb?[warn,'bcount '+p.bc]:null))},
    {label:'real_mode', h:26, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,passSegs(t0,t1,p=>{ const cols=['#6c4','#4a8','#4a8','#2b7bb9','#1f5f99','#a06a2c','#8a4f1d','#7a3fa0','#555','#555','#2b7bb9','#7a3fa0','#a06a2c','#1f5f99','#555','#777']; return [cols[p.real], MODE_HEX(p.real).slice(10)+': '+MODE_TXT[p.real]]; }))},
  );
  if (pr.sharc) L.push(
    {label:'SHARC (ADSP-21061)', h:24, draw:(c,X,t0,t1,y,h)=>{ const segs=[]; r.inits.forEach((ti,k)=>{ const end=(r.resets[k]!==undefined? r.resets[k] : 1.01); const ans=r.sharcAt && r.sharcAt>ti && r.sharcAt<end ? r.sharcAt : null;
        if (D.sharcFail){ segs.push([ti,end,bad,'no boot code — never answers 0xE4']); return; }
        const rdy=ti+CYC_INIT*TCY+SHARC_BOOT; segs.push([ti,rdy,'#777','PROM boot '+inf()]); segs.push([rdy, ans||end, warn, 'wait_for_FRAMECODE']); if (ans) segs.push([ans,end,acc,'sample_proc_'+D.prod+' (48 kHz SPORT IRQs)']); });
      bar(c,X,t0,t1,y,h,segs); r.frames.forEach(f=>{ if (f.t>=t0&&f.t<=t1){ c.fillStyle='#fff'; c.fillRect(X(f.t),y+3,1.5,h-6); } }); }},
    {label:'PIC→SHARC nibble (TO_ALTERA3)', h:20, draw:(c,X,t0,t1,y,h)=>{ const ps=r.passes.filter(p=>p.nib!==null&&p.nib!==undefined&&p.t0>=t0&&p.t0<=t1); const wpx=(X(t1)-X(t0))/Math.max(1,ps.length);
      if (wpx<8){ c.fillStyle=acc2; c.globalAlpha=.4; c.fillRect(X(Math.max(t0,ps[0]?ps[0].t0:t0)),y+5,X(t1)-X(Math.max(t0,ps[0]?ps[0].t0:t0)),h-10); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText('16 nibbles per frame = 16 passes ≈ '+SIM.fmtDur(16*BASE_CYC*TCY), X(t0)+6, y+h/2+4); }
      else ps.forEach(p=>{ c.fillStyle=p.nib<2?acc:p.nib===3?warn:acc2; c.fillRect(X(p.t0),y+4,Math.max(1,X(p.t0+p.dur)-X(p.t0)-1),h-8); if (wpx>16){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(p.nib.toString(16),X(p.t0)+2,y+h/2+4); } }); }});
  L.push(
    {label:'OUT1 · CS8420 #1 TX', h:20, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,passSegs(t0,t1,p=>p.tx1?[acc,'transmitting']:[bad,p.c1?'TXOFF · '+p.c1+' passes to go':'TXOFF']))},
    {label:'OUT2 · CS8420 #2 TX', h:20, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,passSegs(t0,t1,p=>p.tx2?[acc, D.testing&&p.c2?'ON (TESTING line: TXOFF never written)':'transmitting']:[bad,p.c2?'TXOFF · '+p.c2:'TXOFF']))},
  );
  ['AUDIO1','AUDIO2','PROC','ERR'].forEach((n,i)=>L.push({label:'LED '+n, h:16, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,passSegs(t0,t1,p=>p.led[i]?[[ '#3c3','#3c3','#e6b800','#e33'][i],'']:null))}));
  if (pr.ml) L.push({label:'I2C → ML6431 (11 writes)', h:18, draw:(c,X,t0,t1,y,h)=>bar(c,X,t0,t1,y,h,passSegs(t0,t1,p=>p.i2c||p.kind==='init'?[warn,'']:null))});
  L.push({label:'AES frames / 192-frame blocks', h:22, draw:(c,X,t0,t1,y,h)=>{ const fs=audioAt((t0+t1)/2).fs||48000; if ((t1-t0)*fs>3000) SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,acc2,'channel-status blocks'); else SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.5/fs,acc2,'frames'); }});
  return L;
}

/* ---------------- views ---------------- */
function inspector(t){
  const p=passAt(t), st=stepAt(t), au=audioAt(t), os=outState(t), fr=frameAt(t), pr=P();
  if (!p) return `<p class="mono">t &lt; 72 ms: PIC held by the power-up timer; all chips in reset. LEDs dark.</p>`;
  const o=(k)=>au.out[k]? au.out[k].map(s=>`${dB(s.amp)} dBFS <span class="muted">(${s.desc})</span>${s.amp>1?' <b style="color:var(--bad)">CLIPS (ALUSAT)</b>':''}`).join('<br>') : '—';
  return `<table class="kv">
   <tr><th>Pass</th><td class="mono">${p.kind==='loop'?'#'+p.i+' · '+(st>=0?STEPS[st][0]:''):p.kind} · ${SIM.fmtDur(p.dur)}</td></tr>
   <tr><th>real_mode / jmp_mode</th><td class="mono">${MODE_HEX(p.real)} (${MODE_TXT[p.real]}) / ${MODE_HEX(p.jmp).slice(10)}</td></tr>
   <tr><th>MODE1 / MODE2</th><td class="mono">${bin8(p.MODE1)} / ${bin8(p.MODE2)}${p.deb?' · debouncing ('+p.bc+')':''}</td></tr>
   <tr><th>Flags</th><td class="mono">${p.sinit?'SHARC_IN_INIT ':''}${p.unl?'UNLOCKED_MODE ':''}${p.e1?'FLG_ERROR_CH1 ':''}${p.e2?'FLG_ERROR_CH2 ':''}${pr.sharc&&!p.sinit?'SHARC timeout '+p.tmo:''}</td></tr>
   <tr><th>SHARC</th><td class="mono">${pr.sharc? (fr?'last frame '+SIM.fmtT(fr.t)+' · ji_input '+hex((fr.m1<<8)|fr.m2,4):'not decoding yet'):'not fitted in this build'}</td></tr>
   <tr><th>Output rate</th><td class="mono">${(au.fs/1000)} kHz ${D.prod==='D8205'&&(p.real===5||p.real===6)&&D.in1.fs!==D.in2.fs?'<b style="color:var(--warn)">no SRC: the other input slips</b>':''}</td></tr>
   <tr><th>OUT1 ${os.tx1?'●':'○'}</th><td class="mono">${os.tx1?o(0):'TXOFF'}</td></tr>
   <tr><th>OUT2 ${os.tx2?'●':'○'}</th><td class="mono">${os.tx2?o(1):'TXOFF'}</td></tr>
   <tr><th>Gain path</th><td class="small">${au.note}</td></tr>
   <tr><th>LEDs</th><td class="mono">${['AUDIO1','AUDIO2','PROC','ERR'].map((n,i)=>(p.led[i]?'●':'○')+' '+n).join(' · ')}</td></tr></table>`;
}
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a jumper (H1–H14), a pot, a BNC or a control. Each step the hardware and the PIC/SHARC code take is listed here.</div>'; }
function passEvents(t){ const p=passAt(t); return p&&p.ev.length? `<div><b>${p.kind==='loop'?'Pass #'+p.i:p.kind}</b> @ ${SIM.fmtT(p.t0)}</div>`+p.ev.map(e=>`<div>· ${e}</div>`).join('') : '<div class="muted">Nothing changed in this pass (it re-sends the same registers).</div>'; }
function viewSim(m){
  window.__d8200Active=false;
  m.innerHTML = `${card(`${D.prod} on the D8200 board at the playhead — click jumpers, pots, BNCs`, `<div id="bd"></div><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;margin-top:8px"><div id="fp" style="flex:0 0 230px"></div><div id="rp" style="flex:0 0 300px"></div><div style="flex:1;min-width:280px"><div id="insp"></div></div></div><div id="ctl"></div>`)}
   <div class="grid2">${card('What happened (last action)', `<div id="trace" class="log"></div>`)}${card('Firmware events in the pass under the playhead', `<div id="pev" class="log"></div>`)}</div>
   ${card('Timeline — one second (click to seek; zoom from the transport)', `<canvas id="tl"></canvas><p class="small muted">PIC clock 6.144 MHz (24.576 MHz ÷ 4 inside the CPLD) → ${SIM.fmtDur(TCY)} per instruction; the v1.104 loop is about ${BASE_CYC} cycles = ${SIM.fmtDur(BASE_CYC*TCY)} ${inf('hand count')}, most of it flush8420reg. Boot times of the SHARC and lock times of the CS8420/ML6431 are ${inf()}.</p>`)}
   <div class="grid2">${card('Scope at the playhead: OUT1 AES3 frame', `<canvas id="sc"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const ctl=()=>{ m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); }; ctl(); let lastKey='';
  SIM.on('time', ()=>{ const t=SIM.t;
    m.querySelector('#bd').innerHTML=boardSVG(t); m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m);
    m.querySelector('#insp').innerHTML=inspector(t); m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#pev').innerHTML=passEvents(t);
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    const k=D.prod+D.testing+D.sharcFail+D.ev.length+D.in1.err+D.vid+D.frame; if (k!==lastKey){ lastKey=k; ctl(); }
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); drawScope(m.querySelector('#sc'), t); });
}

/* ---------------- tutorial (D8205 manual) ---------------- */
let lesson=0;
const endP = ()=>{ const ps=simulate().passes; return ps[ps.length-1]; };
const LESSONS = [
  {title:'Meet the D8205 on the D8200 board', body:`<p>The <b>D8205</b> is a multifunction AES distribution amplifier: two AES inputs (32–96 kHz), level set in the digital domain by two multi-turn pots, two main outputs with several copies, a 1 kHz test tone, mono summing and sample-rate conversion. It is one personality of the shared <b>D8200</b> board: PIC16C73 + EPM7128S CPLD + ADSP-21061 SHARC + two CS8420s.</p><p>Everything is set with <b>14 Berg jumpers H1–H14</b> along the bottom edge of the board. The four LEDs and the MONITOR jack are on the front edge (left).</p><p class="muted">The board on the right is live. Click Next.</p>`, check:()=>true, auto:true},
  {title:'1 · Build it as a D8205', body:`<p>One source tree builds four products. The active <span class="mono">#define</span> in <span class="mono">d820x.h</span> picks the jumper meanings, the LED meanings and <span class="mono">PRODUCT_NUMBER</span>, which the SHARC reads to choose its own code.</p><p><b>Goal:</b> Build = D8205.</p>`, check:()=>D.prod==='D8205', hint:'Build selector → D8205.'},
  {title:'2 · Connect both inputs', body:`<p>Manual: “Typically, input 1 is used as the Main Reference Channel and input 2 as the Main Audio Channel.” On the BNC3 rear module they are <b>AES REF INPUT</b> (top) and <b>AES AUDIO INPUT</b> (#5). Watch out: the firmware calls Input 1 “CH2” and Input 2 “CH1”.</p><p><b>Goal:</b> both green LEDs (AUDIO1, AUDIO2) on at the end of the second, ERR off.</p>`, check:()=>{ const p=endP(); return p.led[0]&&p.led[1]&&!p.led[3]; }, hint:'Click the REF and AUDIO BNCs on the rear module until both rings are green.'},
  {title:'3 · Watch it boot', body:`<p>Scrub the first 300 ms. The PIC waits out its 72 ms power-up timer, lights all four LEDs, resets the chips and loads the CS8420s. Then it waits for the SHARC: every pass it sends one nibble of a 16-nibble frame, and the SHARC answers <span class="mono">0xE4</span> once it has decoded one. Only then do the LEDs show real status, and the outputs stay muted for another 0x55 = 85 passes.</p><p><b>Goal:</b> put the playhead where OUT1 first transmits.</p>`, check:()=>{ const p=passAt(SIM.t); const ps=simulate().passes; const k=ps.indexOf(p); return p&&p.tx1&&k>0&&!ps[k-1].tx1; }, hint:'Zoom to 100 ms and use step ▶ around 0.25–0.35 s, or watch the OUT1 lane turn green.'},
  {title:'4 · Choose the SRC reference', body:`<p><b>H1/H2</b>: ON ON = internal 48 kHz; ON OFF = Input 2; OFF ON = Input 1 (default); OFF OFF = no SRC. The PIC reads them into MODE1 bits 3/2 and <span class="mono">MODE_change_analize</span> calls <span class="mono">set_MODE_0/3/4/5</span>.</p><p><b>Goal:</b> lock the outputs to Input 2 (REAL_MODE_3) — output rate = Input 2's rate.</p>`, check:()=>endP().real===3, hint:'Set H1 ON and H2 OFF (click each jumper).'},
  {title:'5 · Route the outputs', body:`<p><b>H11/H12</b> pick Output 1 and <b>H9/H10</b> pick Output 2: ON ON = Input 2, ON OFF = Input 1, OFF ON = mix, OFF OFF = 1 kHz tone. These never touch the CS8420s — they travel to the SHARC as nibbles 6/7 of the control frame.</p><p><b>Goal:</b> Output 1 = Input 1, Output 2 = test tone.</p>`, check:()=>{ const j=jAt(1); return j[11]===0&&j[12]===1&&j[9]===1&&j[10]===1; }, hint:'H11 ON, H12 OFF; H9 OFF, H10 OFF.'},
  {title:'6 · Trim the level', body:`<p>With <b>H13 ON</b> the pots are trims, −15 … +15 dB (<span class="mono">D8205_trm.dat</span>, 0 dB at code 128). With H13 OFF they are volume controls, silence … +12 dB (<span class="mono">D8205_vol.dat</span>). With <b>H3 ON</b> RV1 sets the left channels and RV2 the right; with H3 OFF, RV1 sets Input 1 and RV2 sets Input 2.</p><p><b>Goal:</b> trim mode, RV1 at about +6 dB (code 175–190).</p>`, check:()=>jAt(1)[13]===0 && D.rv[0]>=175 && D.rv[0]<=190, hint:'Use the RV1 slider or click the right half of RV1 three times.'},
  {title:'7 · Send OUT2 to the monitor jack', body:`<p><b>H14</b> is read by the CPLD alone: <span class="mono">JACK_OUT = AUD_OUT2 &amp; s13 # AUD_OUT1 &amp; !s13</span>. ON = Output 1, OFF = Output 2.</p><p><b>Goal:</b> monitor jack carries OUT2.</p>`, check:()=>jAt(SIM.t)[14]===1, hint:'Click H14.'},
  {title:'8 · Lose the reference', body:`<p>Put the playhead at 0.5 s and press <b>Pull Input 1 for 150 ms</b>. Follow the chain on the timeline: lock bit → 31-pass debounce → <span class="mono">switch_8420_modes</span> falls back to another clock plan and mutes the outputs for 85 passes → LEDs.</p><p>Then press the <b>TESTING lines</b> button and compare OUT2: as archived it never mutes.</p><p><b>Goal:</b> an Input 1 dropout on the timeline.</p>`, check:()=>D.ev.some(e=>e.k==='in1'&&!e.v), hint:'Use the Pull Input 1 button in the controls.'},
  {title:'Done', body:`<p>That is the whole operator surface. The <b>Software</b> tab shows the PIC loop, the mode state machine and the SHARC pipeline; <b>Findings</b> lists what the files give away — from the two “TESTING” lines left in <span class="mono">flush8420reg</span> to a 44.1 kHz option that cannot work.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  window.__d8200Active=false;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — setting up a D8205 (from D8205.pdf, “Programming the D8205”)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div>${card('What happened', `<div id="trace" class="log"></div>`)}</div>
   <div>${card('The card', `<div id="bd"></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px"><div id="fp" style="flex:0 0 200px"></div><div id="rp" style="flex:0 0 240px"></div><div id="insp" style="flex:1;min-width:220px"></div></div><div id="ctl"></div>`)}</div></div>
   ${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  let lastKey='';
  const draw=()=>{ const t=SIM.t; m.querySelector('#bd').innerHTML=boardSVG(t); m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); m.querySelector('#insp').innerHTML=inspector(t); bindPanel(m); m.querySelector('#trace').innerHTML=traceHTML();
    const k=D.prod+D.testing+D.sharcFail+D.ev.length+D.vid; if (k!==lastKey){ lastKey=k; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); }
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i; draw();});
    const L=LESSONS[lesson], ok=L.check();
    m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
     <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#rs').onclick=()=>{A.reset();lesson=0;draw();};
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__d8200Active=false;
  const r=simulate(), loops=r.passes.filter(p=>p.kind==='loop'), fs=48000, pr=P(), i2c=loops.filter(p=>p.i2c).length;
  m.innerHTML = `<div class="grid3">
   ${card('PIC16C73 (U1)', `<table class="kv"><tr><th>Clock</th><td class="mono">PIC_CLK = 24.576 MHz ÷ 4 = 6.144 MHz (CPLD)</td></tr><tr><th>Instruction</th><td class="mono">${SIM.fmtDur(TCY)}</td></tr><tr><th>Main-loop passes</th><td class="mono">${loops.length} in this second</td></tr><tr><th>Typical pass</th><td class="mono">${BASE_CYC} cycles = ${SIM.fmtDur(BASE_CYC*TCY)} ${inf()}</td></tr><tr><th>SPI bytes to the CS8420s</th><td class="mono">${(loops.length*(18*3+2*5)).toLocaleString()} (flush8420reg 54 + 2 reads)</td></tr><tr><th>SPI bytes to the CPLD</th><td class="mono">${(loops.length*8).toLocaleString()} (4 dummies 0xE4 + 4 data)</td></tr><tr><th>I2C bursts to ML6431</th><td class="mono">${pr.ml? i2c+' passes × 11 writes':'none (no ML6431_EXIST)'}</td></tr><tr><th>Debounce window</th><td class="mono">32 passes ≈ ${SIM.fmtDur(32*BASE_CYC*TCY)}</td></tr><tr><th>Output re-enable</th><td class="mono">85 passes ≈ ${SIM.fmtDur(85*BASE_CYC*TCY)}</td></tr><tr><th>SHARC watchdog</th><td class="mono">256 passes ≈ ${SIM.fmtDur(256*BASE_CYC*TCY)}</td></tr><tr><th>Pot hysteresis lock</th><td class="mono">256 readings × 12 passes ≈ ${(3072*BASE_CYC*TCY).toFixed(1)} s (“about 4 second”)</td></tr></table>`)}
   ${card('ADSP-21061 SHARC (U3)', `<table class="kv"><tr><th>Clock</th><td class="mono">SHARC_CLK = !input_clk, 24.576 MHz</td></tr><tr><th>SPORT0/1 receive IRQs</th><td class="mono">${(2*fs).toLocaleString()} (one per frame per port)</td></tr><tr><th>Cycles per sample</th><td class="mono">${Math.round(OSC/fs)} at 48 kHz</td></tr><tr><th>sample_proc calls</th><td class="mono">${fs.toLocaleString()} (when sampl_gn ≥ 2)</td></tr><tr><th>Control frames decoded</th><td class="mono">${r.frames.length} (one per 16 PIC passes)</td></tr><tr><th>First 0xE4 answer</th><td class="mono">${r.sharcAt? SIM.fmtT(r.sharcAt):'never'}</td></tr><tr><th>Tone generator</th><td class="mono">sin(π·c·f/24000) via _sinf, 11-term polynomial</td></tr></table>`)}
   ${card('AES and clocks', `<table class="kv"><tr><th>AES frames per output</th><td class="mono">${fs.toLocaleString()} at 48 kHz</td></tr><tr><th>Biphase cells</th><td class="mono">${(128*fs).toLocaleString()} (${(128*fs/1e6).toFixed(3)} Mbaud)</td></tr><tr><th>Channel-status blocks</th><td class="mono">${fs/192} (192 frames each)</td></tr><tr><th>Counter master clock</th><td class="mono">clk24 ÷ 2 = 12.288 MHz = 256 fs (GDF note)</td></tr><tr><th>Outputs</th><td class="mono">OUTPUT1 → T4,T5 · OUTPUT2 → T6,T7 · WORD → T3,T9,T10</td></tr><tr><th>Power</th><td class="mono">+21 V 100 mA, −21 V 75 mA max (manual)</td></tr></table>`)}</div>
   ${card('Zoom ladder at the playhead', `<canvas id="ld"></canvas><p class="small muted">Each row zooms in around the playhead: second → control frame (16 passes) → one PIC pass with its steps → one AES frame → bit cells. Click the timeline in the Simulator tab to move the playhead.</p>`)}`;
  SIM.on('time', ()=>{ const cv=m.querySelector('#ld'), t=SIM.t, P1=BASE_CYC*TCY, rows=[[1,'1 s'],[16*P1,'1 control frame'],[P1,'1 PIC pass'],[1/fs,'1 AES frame'],[8/(fs*128),'8 bit cells']];
    const {c,w}=SIM.canvas(cv, rows.length*42+8);
    rows.forEach(([span,l],ri)=>{ let a=Math.max(0,t-span/2); if (a+span>1) a=1-span; const b=a+span, y=ri*42+6, X=v=>150+(v-a)/(b-a)*(w-160);
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--sans'); c.fillText(l+' ('+SIM.fmtDur(span)+')',4,y+19);
      if (ri===0){ bar(c,X,a,b,y,30,passSegs(a,b,p=>p.kind==='init'?['#8a5','init']:p.sinit?[SIM.css('--warn'),'SHARC_IN_INIT']:[SIM.css('--accent'),'running'])); }
      else if (ri===1){ simulate().passes.filter(p=>p.t0+p.dur>a&&p.t0<b).forEach(p=>{ c.fillStyle=p.nib===0?SIM.css('--accent'):SIM.css('--accent2'); c.fillRect(X(p.t0),y+4,Math.max(1,X(p.t0+p.dur)-X(p.t0)-1),26); c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); if (p.nib!==null&&p.nib!==undefined) c.fillText(p.nib.toString(16),X(p.t0)+3,y+21); }); }
      else if (ri===2){ const p=passAt(t); if (p&&p.kind==='loop'){ let q=p.t0; STEPS.forEach((s2,k)=>{ const d=s2[1]*TCY; c.fillStyle=['#3d7fb5','#1f7a4d','#7a3fa0','#b5651d','#2b7bb9','#a06a2c','#777','#1f5f99','#4a8','#e6b800','#b3261e','#555'][k]; c.fillRect(X(q),y+4,Math.max(1,X(q+d)-X(q)),26); if (X(q+d)-X(q)>60){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--sans'); c.fillText(s2[0].split(' ')[0],X(q)+2,y+21); } q+=d; }); } }
      else if (ri===3){ SIM.pulses(c,X,a,b,y,30,1/(fs*2),0,1/(fs*2)*0.95,SIM.css('--accent2'),'subframes'); }
      else SIM.pulses(c,X,a,b,y,30,1/(fs*128),0,0.5/(fs*128),SIM.css('--accent'),'cells');
      c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(X(t),y); c.lineTo(X(t),y+32); c.stroke(); }); });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rear:{x:10,y:150,w:130,h:76,t:'Rear module',s:['BNC1 / BNC3 / TB8205P','P1 EDAC 30-way'],d:'D8205/75 uses BNC1 (MF82/12) or BNC3 (MF82/10 only); /110 uses TB8205P screw terminals. Input 1 = AES REF, Input 2 = AES AUDIO (rear-module guide).'},
  inp:{x:170,y:110,w:140,h:96,t:'Input receivers',s:['H16 ref local/ext','H17/H18 75/110/HiZ','T2,T8 → U10,U11 75176'],d:'Input 1 arrives on P1-1/2 (external) or P1-5/6 (frame reference) through H16, then T2 and the U10 75176 line receiver to CS8420 #2. Input 2: P1-15/16 → T8 → U11 → CS8420 #1. H17/H18 pick R15/R21 75R or R16/R22 110R.'},
  cs:{x:340,y:110,w:150,h:96,t:'CS8420 ×2',s:['#1 U6 = "CH1" = Input 2','#2 U5 = "CH2" = Input 1','RX · SRC · TX'],d:'Each CS8420 receives, sample-rate converts and retransmits AES3. The PIC programs 9 registers per chip every pass (flush8420reg) and reads reg 0x10 (Receive Error) for lock. Note the swapped names: CH1 is Input 2.'},
  cpld:{x:520,y:110,w:150,h:96,t:'U4 EPM7128S',s:['counters CNT1/CNT2 (256 fs)','clock & frame routing','PIC ↔ SHARC mailbox'],d:'MAX+plus II design d8200_top.gdf: clock dividers (12.288 MHz, PIC_CLK 6.144 MHz), two frame counters, the OMCK/ILRCLK/OLRCLK muxes set by TO_ALTERA0..2, the jumper inputs s0..s13, the SPORT routing to the SHARC and the output muxes (OUTPUT1..3, JACK_OUT).'},
  osc:{x:520,y:10,w:150,h:62,t:'OSC2 24.576 MHz',s:['→ U4 pin 90 input_clk'],d:'Single master oscillator. SHARC_CLK = !input_clk; PIC_CLK = input_clk ÷ 4 through two toggle flip-flops.'},
  sharc:{x:700,y:110,w:150,h:96,t:'U3 ADSP-21061',s:['SPORT0 ↔ CS8420 #1','SPORT1 ↔ CS8420 #2','U2 27C512 boot PROM'],d:'Level, mono, mix and routing (sample_proc_D8205), the D8206 tone generator and the D8208 gain. Word 3 of SPORT0 carries one control byte each way to the PIC.'},
  pic:{x:340,y:250,w:150,h:96,t:'U1 PIC16C73',s:['SSP SPI to CS8420s + CPLD','AN0/1 pots, AN2/4 remote','LEDs RC7 RB0 RB1 RB2'],d:'Runs d820x.asm v1.104: jumpers, lock, mode plans, channel status, LEDs, the SHARC handshake and the delayed output enable.'},
  ml:{x:520,y:250,w:150,h:80,t:'U7 ML6431 + X1 3.58',s:['video genlock (D8206/7)','I2C on RB6/RB7'],d:'Genlocks to VIDEO_IN (P1-17/23) and gives VIDEOFS/AUDIO_CLK and LOCKED to the CPLD. X1 3.579545 MHz is its crystal (not the PIC’s).'},
  front:{x:170,y:250,w:140,h:96,t:'Front edge',s:['AUDIO1/2, PROC, ERR','RV1/RV2 5K multiturn','MONITOR TRS (T1, U9)'],d:'LEDs through R5–R8 300R. RV1 → R2 → AN1, RV2 → R1 → AN0. The MONITOR jack is fed by JACK_OUT → U9 75176 → T1.'},
  jmp:{x:10,y:270,w:130,h:76,t:'H1–H14 jumpers',s:['10K rails R11/R12','→ CPLD s0..s13'],d:'Read by the CPLD and passed to the PIC in FROM_ALTERA0/1. H14 is used by the CPLD itself for JACK_OUT.'},
  out:{x:700,y:250,w:150,h:96,t:'Output drivers',s:['OUT1 → U8:A → T4,T5','OUT2 → U8:B → T6,T7','WORD → U12 → T3,T9,T10'],d:'EL2280C buffers and PE-65612 transformers to P1. Which rear BNC gets which leg is not stated in the netlist '+'(see Findings).'},
};
const WIRES=[['rear','inp','AES in'],['inp','cs','RXP'],['cs','cpld','serial, RMCK'],['cpld','sharc','SPORTs'],['osc','cpld',''],['pic','cs','SPI'],['pic','cpld','SPI A1:A0'],['jmp','cpld','s0..s13'],['pic','front','LEDs, AN'],['pic','ml','I2C'],['ml','cpld','VIDEOFS'],['cpld','out','OUTPUT1..3'],['out','rear','to BNCs'],['cs','cpld','AUD_OUT1/2']];
function blockSVG(sel){
  const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
  let s=`<svg viewBox="0 0 870 360" style="width:100%"><defs><marker id="d82a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y,k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9);return[x+dx*k,y+dy*k];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
    s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#d82a)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
  for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
  return s+'</svg>';
}
function viewBlock(m){
  window.__d8200Active=false; let sel='cpld';
  m.innerHTML=`<div class="grid2">${card('Block diagram (d8200-2 board) — click a block', `<div id="bd"></div>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('Signal flow', `<p>AES enters on the rear module, crosses P1 to the line receivers and the two CS8420s. Their serial ports do not go to the SHARC directly: every clock and frame line passes through the CPLD, which the PIC reprograms (TO_ALTERA0..2) for each clock plan REAL_MODE_x. The SHARC processes samples on SPORT0/1 and hands them back to the CS8420 transmitters; their AES outputs return to the CPLD (AUD_OUT1/2) and leave as OUTPUT1, OUTPUT2, OUTPUT3 and JACK_OUT. The PIC never touches audio.</p>`)}</div></div>`;
  const draw=()=>{ m.querySelector('#bd').innerHTML=blockSVG(sel); m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b; draw();}); const b=BLOCKS[sel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn from net names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n_],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p}</text>${n_?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${n_}</text>`:''}`; });
  right.forEach(([p,n_],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p}</text>${n_?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${n_}</text>`:''}`; });
  return s;
}
const SHEETS=[
  {name:'1 · PIC16C73 (U1)', note:'From d8200-2.net. Pins 5 (RA3), 6 (RA4 TEST_PIN), 10 (OSC2) and 11 (RC0 = CS_SHARC in d820x.h) have no net. The PCB footprint is named PIC16C63.', svg:()=> chip(330,40,190,'U1 PIC16C73',[['2 RA0/AN0','R1 1K ← RV2 wiper'],['3 RA1/AN1','R2 1K ← RV1 wiper'],['4 RA2/AN2','R3 1K ← P1-19 remote L'],['7 RA5/AN4','R4 1K ← P1-21 remote R'],['9 OSC1','PIC_CLK ← U4-8'],['1 MCLR','+5'],['12 RC1','CS2 → U5-2'],['13 RC2','CS1 → U6-2'],['14 RC3 SCK','SCK → U5,U6, U4-35'],['15 RC4 SDI','SDI ← U5,U6, U4-100'],['16 RC5 SDO','SDO → U5,U6, U4-36'],['17 RC6','RESET → U5,U6, U3-234']],[['18 RC7 LED_0','R8 300R → AUDIO1'],['21 RB0 LED_1','R7 300R → AUDIO2'],['22 RB1 LED_2','R6 300R → PROC'],['23 RB2 LED_3','R5 300R → ERR'],['24 RB3 A1','CTL2 → U4-12'],['25 RB4 A0','CTL1 → U4-13'],['26 RB5 CS','CTL0 → U4-14'],['27 RB6 SCL','CLK31 → U7-2, R14'],['28 RB7 SDA','DATA31 → U7-1, R13'],['8, 19','GNDD'],['20','+5']],'6.144 MHz external clock, MPASM v1.104')},
  {name:'2 · EPM7128S (U4)', note:'Pin names from d8200_top.rpt (MAX+plus II), nets from d8200-2.net. 111 of 128 macrocells, 67 of 80 I/O used.', svg:()=> chip(330,30,190,'U4 EPM7128STC100-6',[['90 input_clk','OSC2 24.576 MHz'],['14 SER_CS','CTL0'],['13 SER_A0','CTL1'],['12 SER_A1','CTL2'],['35 SER_CLK','SCK'],['36 SER_DIN','SDO'],['100 SER_DOUT','SDI'],['27–30,42,44–50','H1–H12 (s0–s11)'],['40 s12','H13 (net “JACK-SEL”)'],['37 s13','H14'],['52/53/54','VIDEOFS, LOCKED, NOSIG ← U7'],['94 / 92','AUD_OUT1 ← U6-25, AUD_OUT2 ← U5-25']],[['8 PIC_CLK','→ U1 OSC1'],['7 SHARC_CLK','→ U3-98'],['16–25','SPORT1/2 RX ↔ U3'],['56–58','SPORT2 TX'],['65 / 75','RMCK1 ← U6, RMCK2 ← U5'],['67–72','ILRCLK/ISCLK/SDIN 1,2'],['77–85','OLRCLK/OSCLK/SDOUT/OMCK'],['97 OUTPUT1','net OUT1 → R40 → U8-3'],['96 OUTPUT2','net OUT2 → R31 → U8-5'],['55 OUTPUT3','net WORD → R49 → U12'],['99 JACK_OUT','AUDIO-JACK → U9-4'],['31–33','FLAG1–3']],'MAX7000S, d8200_top.gdf')},
  {name:'3 · AES in and CS8420s', note:'Input 1 path through H16 (local/external) and T2/U10; Input 2 through T8/U11. CS1/CS2 select U6/U5: firmware “CH1” is U6.', svg:()=> chip(140,60,170,'U5 CS8420 (#2, "CH2")',[['4 RXP','C51 ← U10-1 ← T2 ← H16'],['2 CS','CS2 (RC1)'],['9 RST','RESET'],['10 RMCK','RMCK2 → U4-75']],[['25 TXP','AUD_OUT2 → U4-92'],['12–14','ILRCLK2/ISCLK2/SDIN2'],['16–18','OSCLK2/OLRCLK2/SDOUT2'],['21 OMCK','OMCLK2']],'Input 1 = main reference') + chip(560,60,170,'U6 CS8420 (#1, "CH1")',[['4 RXP','C47 ← U11-1 ← T8 ← P1-15/16'],['2 CS','CS1 (RC2)'],['9 RST','RESET'],['10 RMCK','RMCK1 → U4-65']],[['25 TXP','AUD_OUT1 → U4-94'],['12–14','ILRCLK1/ISCLK1/SDIN1'],['16–18','OSCLK1/OLRCLK1/SDOUT1'],['21 OMCK','OMCLK1']],'Input 2 = main audio')
     + `<text x="40" y="300" font-size="11" fill="var(--ink)">H16 2×3: 1/2 ← P1-2/P1-1 (rear AES REF), 5/6 ← P1-6/P1-5 (frame MF82REF), 3/4 → T2, C31 · H17: R15 75R / R16 110R on T2 · H18: R21 75R / R22 110R on T8</text><text x="40" y="320" font-size="11" fill="var(--ink)">Reg map per chip (shadowed in PIC RAM): 1 Misc1, 2 Misc2, 3 Data Flow (bit 6 TXOFF), 4 Clock Flow, 5 SAI in, 6 SAO out, 9 IRQ1 mask, 17 RX error mask, 18 C-buffer control</text>`},
  {name:'4 · Front edge, pots, jumpers', note:'R11 (10K to GNDD) and R12 (10K to +5) feed the two outer rails of all fourteen H1X3 headers; the centre pins go to the CPLD.', svg:()=>{ let s=''; LEDP.forEach(([n,y],i)=>{ const yy=60+i*40; s+=`<text x="40" y="${yy+4}" font-size="11" fill="var(--accent2)">${['RC7','RB0','RB1','RB2'][i]} (U1-${[18,21,22,23][i]})</text><line x1="130" y1="${yy}" x2="170" y2="${yy}" stroke="var(--ink)"/><rect x="170" y="${yy-6}" width="34" height="12" fill="none" stroke="var(--ink)"/><text x="187" y="${yy-9}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">R${8-i} 300R</text><line x1="204" y1="${yy}" x2="240" y2="${yy}" stroke="var(--ink)"/><polygon points="240,${yy-8} 240,${yy+8} 256,${yy}" fill="none" stroke="var(--ink)"/><line x1="256" y1="${yy-8}" x2="256" y2="${yy+8}" stroke="var(--ink)"/><line x1="256" y1="${yy}" x2="290" y2="${yy}" stroke="var(--ink)"/><text x="296" y="${yy+4}" font-size="11" fill="var(--ink)">${n} (${['green','green','yellow','red'][i]}) → GNDD</text>`; });
      [['RV1','R2','AN1 (U1-3)','C2'],['RV2','R1','AN0 (U1-2)','C1']].forEach(([r,rr,an,cc],i)=>{ const yy=240+i*50; s+=`<text x="40" y="${yy+4}" font-size="11" fill="var(--ink)">+5 ─ ${r} 5K multiturn ─ GNDD; wiper → ${rr} 1K → ${an}, ${cc} 0.1 µF to GNDD</text>`; });
      for (let n=1;n<=14;n++){ const x=470+((n-1)%7)*52, y=60+Math.floor((n-1)/7)*110; s+=`<text x="${x}" y="${y-8}" font-size="10" fill="var(--ink)">H${n}</text>${[0,1,2].map(k=>`<circle cx="${x+8}" cy="${y+k*14}" r="3" fill="none" stroke="var(--ink)"/>`).join('')}<text x="${x+14}" y="${y+3}" font-size="8.5" fill="var(--ink2)">R12</text><text x="${x+14}" y="${y+17}" font-size="8.5" fill="var(--accent2)">s${n-1}</text><text x="${x+14}" y="${y+31}" font-size="8.5" fill="var(--ink2)">R11</text>`; }
      return s+`<text x="470" y="300" font-size="11" fill="var(--ink)">MONITOR: JACK_OUT (U4-99) → U9 75176 (pin 4 DI) → T1 → TRS pins 6/8</text>`; }},
  {name:'5 · Outputs, P1, power', note:'From d8200-2.net. The remote-pot resistors R3/R4 sit on the same P1-19/P1-21 nets as T9/T10 (see Findings).', svg:()=> chip(120,40,150,'U8 EL2280C',[['3 +A','OUT1 (R40)'],['5 +B','OUT2 (R31)']],[['1 A out','R32/R34 → T4,T5'],['7 B out','R26/R28 → T7,T6']],'output buffers') + chip(120,190,150,'U12 EL2280C',[['3 +A','WORD (R49)'],['5 +B','WORD (R46/R49)']],[['1 A out','R24 → T3 (P1-17/18)'],['7 B out','R47/R48 → T9,T10']],'word / frame outputs')
     + chip(560,40,170,'P1 EDAC 30/156',[['1/2, 5/6','Input 1 ext / local'],['15/16','Input 2'],['7–10','T4, T5 (OUT1)'],['11–14','T6, T7 (OUT2)'],['17/23','VIDEO_IN (T3)'],['19–22','T9, T10 + remote R3/R4']],[['29/30','VIN+ → F1'],['25/26','VIN− → F2'],['27/28','GNDD']],'edge connector')
     + `<text x="430" y="320" font-size="11" fill="var(--ink)">REG1 LM2825 (+5 V) · REG2 79L05 (−5 V for the EL2280Cs) · F1–F3 RXE050 polyfuses · C44 220 µF/35 V</text>`},
];
function viewSchem(m){
  window.__d8200Active=false; let i=0;
  m.innerHTML=card('Schematic set (redrawn from d8200-2.net, d8200_top.rpt and d820x.h — not the original P-CAD sheets)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">The original schematics (d8200-1.sch / d8200-2.sch, ACCEL/P-CAD binary) were not readable here. Blue labels are net names from the netlist.</p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();});
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 440" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="428" fill="none" stroke="var(--line)"/><text x="880" y="426" text-anchor="end" font-size="10" fill="var(--ink2)">D8200-2 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`; m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
function modeDiagram(cur){
  const N={15:[60,60],0:[60,190],4:[260,60],3:[260,190],5:[460,60],6:[460,190]};
  const E=[[15,0,'SHARC answers 0xE4 (MODE1 = 0)'],[0,4,''],[0,3,''],[4,5,'CH2 (Input 1) lost'],[3,6,'CH1 (Input 2) lost'],[5,6,'CH1 lost'],[6,5,'CH2 lost'],[4,0,'both lost'],[3,0,'']];
  let s=`<svg viewBox="0 0 600 250" style="width:100%"><defs><marker id="d82m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  E.forEach(([a,b,l])=>{ const [x1,y1]=N[a],[x2,y2]=N[b]; const dx=x2-x1, dy=y2-y1, d=Math.hypot(dx,dy), ox=dx/d*48, oy=dy/d*26; s+=`<line x1="${x1+ox}" y1="${y1+oy}" x2="${x2-ox}" y2="${y2-oy}" stroke="var(--ink2)" marker-end="url(#d82m)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="9.5" fill="var(--ink2)">${l}</text>`:''}`; });
  for (const k in N){ const [x,y]=N[k], on=+k===cur; s+=`<g><rect x="${x-48}" y="${y-22}" width="96" height="44" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">REAL_MODE_${(+k).toString(16)}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="9" fill="${on?'#fff':'var(--ink2)'}">${MODE_TXT[k].slice(0,22)}</text></g>`; }
  return s+'</svg>';
}
function viewSoft(m){
  window.__d8200Active=false;
  m.innerHTML=`<div class="grid2">${card('PIC main loop (d820x.asm v1.104) — running step highlighted', `<div id="ml"></div>`)}${card('D8205 clock-plan state machine (switch_8420_modes)', `<div id="sm"></div><p class="small muted">From mode 0 the first lock after UNLOCKED_MODE runs MODE_change_analize: H1/H2 OFF ON → mode 4, ON OFF → mode 3, OFF OFF → mode 5. Only D8205 shown; D8206 uses 7/d/0, D8207 a/b/c, D8208 6/0. Live mode highlighted for the current build.</p>`)}</div>
   <div class="grid2">${card('PIC → SHARC control frame (Link_to_SHARC / ctrl_proc)', `<div id="nf"></div>`)}${card('PIC ↔ CPLD registers (Link_to_ALTERA, d8200_top.gdf note)', `<div id="ar"></div>`)}</div>
   ${card('SHARC sample pipeline (sample_proc_D8205)', `<div id="sp"></div>`)}
   ${card('Jumpers and LEDs of this build (jumpers.txt, d820x.h)', `<div id="jt"></div>`)}`;
  SIM.on('time', ()=>{ const t=SIM.t, st=stepAt(t), p=passAt(t), pr=P(), fr=frameAt(t);
    m.querySelector('#ml').innerHTML=`<table class="kv"><tr><th>#</th><th>Routine</th><th>Cycles</th><th>What it does</th></tr>${STEPS.map((s,k)=>`<tr class="${k===st?'hl':''}"><td>${k}</td><td class="mono">${s[0]}</td><td class="mono">${s[1]}</td><td class="small">${s[2]}</td></tr>`).join('')}${D.prod==='D8207'?`<tr><td></td><td class="mono">delay ×3</td><td class="mono">${3*DELAY_CYC}</td><td class="small">#ifdef D8207 “we have a lot of spare time”</td></tr>`:''}</table><p class="small muted">Cycle counts are hand estimates ${inf()}. Steps are skipped while SHARC_IN_INIT is set (debounce, switch, LEDs, AES_output_control).</p>`;
    m.querySelector('#sm').innerHTML=modeDiagram(p?p.real:-1);
    const m1=p?p.MODE1:0, m2=p?p.MODE2:0, rv=D.rv, rem=D.rem, nibs=[[0,'FRAME_CODE hi',0xE],[1,'FRAME_CODE lo',0x4],[2,'reserved',0],[3,'PRODUCT_NUMBER',pr.num&15],[4,'MODE1 hi',m1>>4],[5,'MODE1 lo',m1&15],[6,'MODE2 hi',m2>>4],[7,'MODE2 lo',m2&15],[8,'code1 hi (RV1)',rv[0]>>4],[9,'code1 lo',rv[0]&15],[10,'code2 hi (RV2)',rv[1]>>4],[11,'code2 lo',rv[1]&15],[12,'code3 hi (remote L)',rem[0]>>4],[13,'code3 lo',rem[0]&15],[14,'code4 hi (remote R)',rem[1]>>4],[15,'code4 lo',rem[1]&15]];
    m.querySelector('#nf').innerHTML=pr.sharc? `<table class="kv"><tr><th>Byte</th><th>Field</th><th>Sent</th></tr>${nibs.map(([a,l,v])=>`<tr class="${p&&p.nib===a?'hl':''}"><td class="mono">${hex((a<<4)|v)}</td><td>${l}</td><td class="mono">a=${a.toString(16)} d=${v.toString(16)}</td></tr>`).join('')}</table><p class="small">One byte per pass in TO_ALTERA3 (SPORT0 word 3). The SHARC only accepts the nibble whose address equals CTRL_decod_stp, so it re-aligns on address 0. It answers 0xE4 once received_FRAME_CODE = 0xE4.</p>` : '<p>No SHARC in this build (D8207): Link_to_SHARC and SHARC_link_control are assembled out.</p>';
    const alt=ALT[p?p.real:15]||[0,0,0]; const b2=alt[2]|pr.route;
    m.querySelector('#ar').innerHTML=`<table class="kv"><tr><th>A1:A0</th><th>PIC writes</th><th>PIC reads</th></tr>
      <tr><td>00</td><td class="mono">TO_ALTERA0 = ${bin8(alt[0])}<br><span class="small">D0–1 CNT1 clk, D2–3 CNT2 clk, D4–5 OMCK1, D6–7 OMCK2 (00 = clk24÷2, 01 = RMCK1, 10 = RMCK2, 11 = clk24÷3)</span></td><td class="mono">FROM_ALTERA0 = JMP1..8</td></tr>
      <tr><td>01</td><td class="mono">TO_ALTERA1 = ${bin8(alt[1])}<br><span class="small">D8–15: frame source for ILRCLK1/2, OLRCLK1/2 (00 CNT1, 01 CNT2, 10 video)</span></td><td class="mono">FROM_ALTERA1 = JMP9..13, NOSIG, LOCKED</td></tr>
      <tr><td>10</td><td class="mono">TO_ALTERA2 | AUD_OUTPUT_ROUTE = ${bin8(b2)}<br><span class="small">D16–17 counter ties, D19 24 MHz (96 k), D20 OUT1 src, D21 OUT2 src, D22–23 OUT3 src</span></td><td class="mono">spare (0)</td></tr>
      <tr><td>11</td><td class="mono">TO_ALTERA3 = SHARC nibble</td><td class="mono">FROM_ALTERA3 = SHARC byte (0xE4 = ready)</td></tr></table><p class="small">Each address is preceded by a dummy 0xE4 byte “for clock pulses”.</p>`;
    const ji=fr?((fr.m1<<8)|fr.m2):0, g=fr&&D.prod==='D8205'?gains(ji,fr.rv,fr.rem,12):null;
    m.querySelector('#sp').innerHTML=`<svg viewBox="0 0 900 150" style="width:100%">${[['SPORT0_r_asserted','rx_buf_CH1 (Input 2)',20,20],['SPORT1_r_asserted','rx_buf_CH2 (Input 1)',20,90],['silence buffer?','if lock bit 15/14 = 0',190,55],['mono?','JMP6 / JMP7: (A+B)·0.5',330,55],['level f6..f9','trm/vol table[code]',470,55],['route OUT1/OUT2','0 In2 · 1 In1 · 2 mix · 3 tone',610,55],['tx_buf_CH1/2','→ CS8420 #1/#2 SAI',770,55]].map(([a,b,x,y],k)=>`<rect x="${x}" y="${y}" width="${k<2?150:120}" height="44" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="${x+8}" y="${y+18}" font-size="11.5" font-weight="700" fill="var(--ink)">${a}</text><text x="${x+8}" y="${y+34}" font-size="9.5" fill="var(--ink2)">${b}</text>`).join('')}<path d="M170 42 L190 70 M170 112 L190 85 M310 77 L330 77 M450 77 L470 77 M590 77 L610 77 M730 77 L770 77" stroke="var(--ink2)" fill="none"/></svg>
      <p class="small mono">${g? `ji_input ${hex(ji,4)} · CH1 gains ${g.ch1.map(x=>dB(x)).join('/')} dB · CH2 gains ${g.ch2.map(x=>dB(x)).join('/')} dB · OUT1 route ${ji&3} · OUT2 route ${(ji>>2)&3}` : 'Shown for D8205 once the SHARC is running.'}</p>`;
    m.querySelector('#jt').innerHTML=`<table class="kv"><tr><th>Jumper</th><th>CPLD</th><th>Firmware bit</th><th>Meaning (${D.prod})</th><th>ON (0)</th><th>OFF (1)</th><th>Now</th></tr>${pr.J.map((n,k)=>{ const N=k+1, bit=N<=4?'MODE1,'+({1:3,2:2,3:1,4:0}[N]):N===13?'MODE1,4':N===14?'CPLD only':'MODE2,'+(12-N); const v=jAt(t)[N]; return `<tr><td class="mono">H${N} / JMP_${N}</td><td class="mono">s${N-1}</td><td class="mono">${bit}</td><td>${n}</td><td>${pr.JV[k][0]}</td><td>${pr.JV[k][1]}</td><td class="mono">${v?'OFF':'ON'}</td></tr>`; }).join('')}</table>
      <p class="small">${D.prod==='D8205'?'Pairs H1/H2 (SRC), H9/H10 (OUT2) and H11/H12 (OUT1) are 2-bit fields: ON ON, ON OFF, OFF ON, OFF OFF (manual table). ':''}LEDs: ${pr.LED.map((l,i)=>`LED_${i} = ${l}`).join(' · ')}. Jumper ON = 0 matches the manual defaults; which end of the 1×3 header is “ON” is ${inf('R11/R12 rails')}.</p>`; });
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__d8200Active=false;
  const F=[
    ['Artwork '+SIM.year(2026)+': rear modules now from the CorelDRAW sheet', `The BNC1 and BNC3 panels are now vector art from ${SIM.src(D8205_RO,'D8205 - rear module options.cdr')} (2012-01-16), converted with Inkscape. The PNGs cut earlier from the same sheet's PDF are on the “old PNG” checkbox. Every BNC hotspot was re-placed on the sheet's connector centres. The D8200 folder has no artwork of its own; its rear modules are the D8205 builds'.`],
    ['The sheet numbers an input among the outputs', 'Both modules carry small silk numbers 1–8 beside the BNCs. On BNC1, “5” is the AES AUDIO INPUT, between DIGITAL OUT 2-1 and 2-3. On BNC3, 5 is again AES AUDIO INPUT and 6 is OUT 2-3. The numbers are connector positions, not output numbers.'],
    ['One sheet, two builds', `The same page draws the D8205/110 with TB8205P and TB8205P/75 pluggable screw modules (“Unbalanced Reference Input”). Its caption calls the product a “Multifunction AES/EBU Audio Distribution Amplifier”, and BNC3 is marked “*MF8210 Only”.`],
    ['Two “TESTING” lines left in the production loop', '<span class="mono">v1.104/d820xswr.asm</span> and <span class="mono">v105/…/d820xswr.asm</span>, <span class="mono">flush8420reg</span>: <span class="mono">MOVLW 0; ;TESTING</span> overwrites W just before CH1 register 2 and CH2 register 3 are sent. Chip #2 (U5, Output 2) therefore never receives TXOFF or its data-flow bits, and chip #1 always gets HOLD = 00. Output 2 cannot mute — on input loss, mode changes or during boot. v1.104-055 has no such lines. Toggle it in the Simulator.'],
    ['“Added run stop for all modes” is not there', 'The v1.104 header says revision 1.04 “Added run stop for all modes”, and <span class="mono">main</span> calls <span class="mono">REFRESH_RUN_STOP</span>. Every line of <span class="mono">refresh_run_stop</span>, <span class="mono">run_stopa/b</span> and <span class="mono">CH1/2_8420_updt_reg4a/b</span> is commented out; the call falls through to <span class="mono">ch2b_cont: return</span>.'],
    ['The 44.1 kHz option cannot work', '<span class="mono">set_ML6431_44</span> sends the same 11 bytes as <span class="mono">set_ML6431_48</span> (<span class="mono">movlw 0x80 ; 48Kshould be 80 for 48k just testing</span>) in v1.101–v1.105; only v1.103-016/016v1 send 0x81. The SHARC agrees: <span class="mono">f2=24000.0;//f2=22050.0;Sept 6 2005 make both 48k Bugs ??</span>. Yet <span class="mono">chan_status_fs_CH</span> still writes CHAN_STATUS_FS_44K into the channel status when D8206 JMP13 / D8207 JMP5 is set, so the stream would claim 44.1 kHz while running at 48 kHz.'],
    ['ML6431 rewritten every pass', 'D8207 <span class="mono">MODE_c_handler</span> and D8206 <span class="mono">MODE_0_handler</span> call set_ML6431_48/44 before checking real_mode, so 11 bit-banged I2C writes happen on every pass while the card sits in those modes — several times the normal loop length '+inf('cycle estimate')+'.'],
    ['CH1 is Input 2', 'd820x.h: “LED_0 – Lock to CH2 (First input)”, “LED_1 – Lock to CH1 (Second input)”. The code names (CH1/CH2, cs8420 #1/#2) are swapped against the manual’s Input 1/Input 2. Comments disagree as a result: d820x.h says JMP9..12 “00=input1”, jumpers.txt and the manual say Input 2; d820x.h calls JMP_6 “INPUT1”, jumpers.txt and the manual say Input 2. The code (MODE2 bit 6 → SHARC CH1 mono) follows the manual.'],
    ['D8207 SRC jumper is inverted', 'd820x.h and jumpers.txt: “JMP_3: 0=SRC off / 1=SRC on”. D8207 <span class="mono">MODE_change_analize</span> calls <span class="mono">set_MODE_c</span> (no SRC) when SRC_ON_OFF = 1 and the SRC modes a/b when it is 0.'],
    ['D8205 red LED ignores confidence errors', '<span class="mono">jmp_input</span> sets FLG_ERROR_CH1/2 from receiver-error bits 2 (confidence) and 1 (biphase), but the D8205 branch of <span class="mono">LED_processing</span> only tests the lock bits. The manual says the red LED shows lost lock “or … a confidence error”. D8207/D8208 do use the flags.'],
    ['Boot always starts in the wrong mode', 'Debounce is suspended while SHARC_IN_INIT is set, so MODE1 is still 0 when <span class="mono">init_modes_after_SHARC_respond</span> runs MODE_change_analize: D8205 starts in REAL_MODE_0 (internal), D8206 in mode d, D8207 (at init) in mode a, whatever the jumpers say. The real plan is applied ~32 passes later, and the outputs stay muted 85 passes after that.'],
    ['SHARC watchdog resets the PIC', '<span class="mono">SHARC_link_control</span>: no 0xE4 for 256 passes (≈0.32 s) → <span class="mono">goto WHOLE_RESET</span> from inside a CALL. Init pulls RESET low for the CS8420s and the SHARC, so a blank or failed boot PROM gives an endless reset loop with all four LEDs lit (the init lamp test). Try “SHARC EPROM blank”.'],
    ['v1.01 “ch1_on” defeats the output delay', 'In D8205 <span class="mono">MODE_4_handler</span> (the default reference), the v1.01 block calls <span class="mono">set_MODE_4</span> whenever CH1 is locked but CH1 reg 3 bit 6 (TXOFF) is set — and set_MODE_4 clears that bit. So the pass after any <span class="mono">swm_end</span>, Output 1 is switched back on at once instead of after the 85-pass AES_output_control delay. The fix for “Outputs not muting on d8205 when audio input is lost” (rev 1.01) also unmutes too early. Visible on the OUT1 lane after a reference dropout.'],
    ['Live SRC change is not muted', 'MODE_change_analize (called from debounce) runs set_MODE_x directly. Unlike the lock-driven path it never reaches <span class="mono">swm_end</span>, so moving H1/H2 re-clocks the CS8420s without shut_off_AES_output '+inf('a click is likely')+'.'],
    ['Mix is an unscaled sum', 'sample_proc_D8205 route 2: <span class="mono">f10=f0+f2; f11=f1+f3</span>. No −6 dB pad; with ALUSAT set the fixed-point conversion clips. Two −6 dBFS inputs at 0 dB trim already reach full scale.'],
    ['AUD_OUTPUT_ROUTE comments', 'D8205’s literal is nine digits (<span class="mono">B\'010100000\'</span> = 0xA0, harmless). For D8207 (0x00) and D8208 (0x70) the comments say OUT3 = “CNT1 frame” / “CNT2 frame”, but by the GDF register note those values select CS8420 #1 / #2.'],
    ['Rear guide vs. board outputs', 'The D8205/75 guide shows OUT 1-1, 1-2 and OUT 2-1 … 2-5. d8200-2.net wires OUTPUT1 to two transformers (T4, T5), OUTPUT2 to two (T6, T7) and OUTPUT3 — net <b>WORD</b> — to three (T3, T9, T10). With AUD_OUTPUT_ROUTE = 0xA0 the D8205 sends “frame from CNT1” to OUTPUT3, so by the firmware 2-3 … 2-5 would carry a word clock. The compiled root d8200_top.rpt only muxes AUD_OUT1/AUD_OUT2 on OUTPUT3. Open question; the Simulator marks those BNCs amber.'],
    ['Remote-pot pins double as outputs', 'd8200-2.net puts R3 (AN2) on NET00000 with T9-3 and P1-19, and R4 (AN4) on NET00019 with T10-3 and P1-21. The D8205\\R remote gain and the T9/T10 outputs cannot both be fitted '+inf('build option')+'.'],
    ['H13 net is called JACK-SEL', 'The netlist names H13’s centre net <span class="mono">JACK-SEL</span> (U4-40, s12), but the compiled CPLD uses s13 = H14 for <span class="mono">JACK_OUT</span>, and the manual and jumpers.txt both say JMP_14 selects the jack. The PIC reads s12 as JMP13 (trim/volume).'],
    ['Register-map note vs. PIC code', 'The note in d8200_top.gdf says read address 00 = “Jumpers H1..H7” and 01 = “H8..H14, NOSIG, LOCKED”. jmp_input takes JMP1–8 from FROM_ALTERA0 and JMP9–13 from FROM_ALTERA1, with LOCKED in bit 7.'],
    ['Clock comments assume 4 MHz', 'The PIC has no crystal: OSC1 is PIC_CLK from the CPLD, 24.576 MHz ÷ 4 = 6.144 MHz. X1 3.58 MHz belongs to the ML6431. The <span class="mono">delay</span> comment “Provide a 1.54mS delay” and the .pjt “Frequency=4000000” are 4 MHz figures; the real delay is about 1.0 ms.'],
    ['Which PIC?', 'README: PIC16C73A (OTP). v1.104 assembles with <span class="mono">#include "P16F73.INC"</span> and the <span class="mono">list p=16C73A</span> line commented out; the .pjt says Processor=0x673f; the netlist value is PIC16C73 on a footprint named PIC16C63. CS_SHARC (RC0, pin 11) is defined but pin 11 has no net.'],
    ['Leftovers', '<span class="mono">bsf portc,7</span> in set_MODE_7 / set_MODE_b drives LED_0 directly; <span class="mono">;bsf portb,1 ;testing</span> in set_MODE_4; <span class="mono">CALL init_channel_status</span> after the jump table in channel_status_proc can never run; the TEST LED table has no <span class="mono">lp_d_handler</span> entry, so with #define TEST modes d/e/f would show the wrong number.'],
    ['Version folders are not chronological', 'v1.104/d820xswr.asm set_MODE_7 says “was 00001010 may15/2006” while v1.105 (folder “May15,2006”) says “was 0 july24/2000”. Apart from that line and the #define (D8205 vs D8206) the two folders are identical; every d820x.asm still says “File Version 1.00”.'],
    ['Mislabelled files', '<span class="mono">d8200-2.pdf</span> is not a PDF: it is a P-CAD 2002 PDIF ASCII export (Jul 29 2013|46). It was used here for every part position. <span class="mono">d8200-1.bom</span> is titled D8205.'],
  ];
  m.innerHTML=card('What the D8200 platform is up to — findings tied to files and functions', `<ol>${F.map(([h,b])=>`<li style="margin-bottom:8px"><b>${h}.</b> ${b}</li>`).join('')}</ol>`)
   + card('Inferred in this model', `<ul class="small"><li>Main-loop cycle counts (hand estimates from the v1.104 source), so pass length ≈ ${SIM.fmtDur(BASE_CYC*TCY)}. The “about 4 second” hysteresis comment agrees with it (3072 passes ≈ ${(3072*BASE_CYC*TCY).toFixed(1)} s).</li><li>CS8420 lock time ${LOCK_T*1e3} ms, ML6431 genlock ${VLOCK_T*1e3} ms, SHARC PROM boot ${SHARC_BOOT*1e3} ms.</li><li>Jumper ON = reads 0 (matches the manual defaults against the code); the physical end of the header is not documented.</li><li>Which rear BNC is fed by which transformer.</li><li>Test signal content (L 1 kHz, R 400 Hz) and the D8208 remote-gain decoding.</li></ul>`)
   + card('Sources', `<p class="small mono">d8200 - #d820x/pic/v1.104/*.asm, *.h, v1.104.pjt · pic/v105, v1.103-016, v1.104-055 (diffs) · jumpers.txt · sharc/d820xcore.asm, d820xdef.h, *.dat · altera/d8200_top.gdf, d8200_top.rpt · d8200 - #PCB/d8200-2.net, d8200-1.bom, d8200-2.pdf (PDIF) · d8200 - #GERBERS/D8200-2.SLK, .TOP · D8205 - #Master/…/D8205.pdf · 8200 Series Rear Module options…/D8205 - rear module options.pdf</p>`);
}

/* ---------------- register ---------------- */
reset(false);
SIM.register({
  id:'d8200', product:'D8200', name:'D8200 · AES DSP platform for D8205/6/7/8 ('+SIM.year(2000)+')', year:2000,
  folder:'#MF8200 #SERIES/D8200 - #Engineering #MF82', family:'8200 Distribution Series', depth:'Full model',
  summary:'One board — PIC16C73, EPM7128S CPLD, ADSP-21061 SHARC and two CS8420s — that becomes the D8205 mixer/level DA, D8206 tone generator, D8207 SRC or D8208 level DA depending on one #define. The model runs the v1.104 PIC firmware pass by pass: jumpers, lock, clock plans, the SHARC handshake and the delayed output enable.',
  highlights:['Board drawn from the real D8200-2 Gerber silkscreen and copper','Pass-by-pass PIC v1.104 model with 31-pass debounce and 85-pass output enable','16-nibble PIC→SHARC control frame and SHARC gain/route maths from the .dat tables','Switch the build between D8205, D8206, D8207 and D8208','Findings: TESTING lines that stop Output 2 muting, a dead 44.1 kHz option, swapped CH names'],
  footnotes:[
    {text:'On the D8205 rear-module sheet, BNC position “5” is the AES AUDIO INPUT on both BNC1 and BNC3: the silk numbers count connectors, not outputs.', src:D8205_RO},
    {text:'BNC3 is marked “*MF8210 Only”; BNC1 is the MF82/12 module.', src:D8205_RO},
    {text:'The sheet captions the D8205/75 as a “Multifunction AES/EBU Audio Distribution Amplifier”.', src:D8205_RO},
    {text:'The same sheet offers a D8205/110 build on TB8205P / TB8205P/75 pluggable screw modules with an “Unbalanced Reference Input”.', src:D8205_RO},
    {text:'The D8200 folder holds no artwork of its own: its rear panels come from the D8205 rear-module sheet.', src:'#MF8200 #SERIES/D8200 - #Engineering #MF82'},
  ],
  duration:1,
  stepUnits:[ {label:'1 PIC pass (~1.23 ms)', period:()=>BASE_CYC*TCY}, {label:'1 control frame (16 passes)', period:()=>16*BASE_CYC*TCY}, {label:'1 ms', period:()=>0.001}, {label:'1 AES frame @ 48k', period:()=>1/48000}, {label:'10 ms', period:()=>0.01} ],
  zooms:[[1,'1 s (whole)'],[0.3,'300 ms'],[0.1,'100 ms'],[0.02,'20 ms (16 passes)'],[0.005,'5 ms (4 passes)'],[0.0015,'1.5 ms (1 pass)'],[0.0001,'100 µs (AES frames)']],
  defaultZoom:0,
  init(){ window.__d8200Active=false; },
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial',render:viewTut},
    {id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Software',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
