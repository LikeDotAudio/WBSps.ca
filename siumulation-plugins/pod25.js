/* =====================================================================
   POD25 — Stereo (two-channel) analog audio silence detector (Ward-Beck Systems, 2003|36)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #POD #SERIES/POD25 - #Master/ unless noted):
   - POD25 - #Engineering/Software/v101/pod25.asm, init.asm, hysterisis.asm (V1.01, 23 Jul 2004)
       main, a_d_convsion, XLR1_data/XLR2_data/rv3_data/start_ad, process_xlr1/2 (xlr1_alarm, xlr1_signal…),
       process_data (computed goto at 0x300), process_XLR1_data/XLR2_data/RV3_data, xlr_check_timer,
       pulse_generator, period_generator, generate_tone, linear_table (0xFD), init, hysterisis/data_check/volume_change?
   - …/Software/v100/* (V1.00, 14 May 2003: SILENT_THRESHOLD 35), …/v101/INIT.$$$ (39, tried first),
     pod25v2.asm (13 May 2003 draft: no delay timer), 25v100.pjt (MPLAB 5 project), POD25*.XRF, *.ERR
   - POD25 - #Engineering/PCB/POD25iss2.net, POD25iss2.bom, POD25iss2.ECO, POD25iss2.sch (part names),
     PCB/OBSOLETE/POD25iss1.* (Issue 1)
   - POD25 - #Engineering/MANUAL/POD25MANU.doc (operator text and specifications)
   - POD25 - #Engineering/POD25 - Functional Diagram.cdr (text: "TONE (1 Khz)", "ALARM DELAY (1 or 45 SECOND)")
   - POD25 - #ARTWORK #DA #2016/POD25-FRONT&REAR-SILK (CURVE).pdf → assets/pod25-front-green.png,
     pod25-front-white.png, pod25-rear-white.png (cut with tools/silk_extract.py, 200 dpi, 1714 × 321 px)
   - POD25 - #ARTWORK #DA #2016/POD25 - #PHOTOS/POD25 Front.jpg, POD25 Rear.jpg (panel colour, parts)
   - POD25 - #Mechanical #DA #2016/POD25-FRONT ISS 1 (PANEL).pdf, POD25-REAR ISS 2 (PANEL).pdf (hole positions)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const Y = y => SIM.year(y);
const hex2 = v => '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();
const bin8 = v => (v&255).toString(2).padStart(8,'0');

/* ---------------- constants from the source and the netlist ---------------- */
const FOSC = 4.9152e6;               // X1 4.9152 (POD25iss2.bom). 25v100.pjt says Frequency=4000000 (simulator setting only)
const TCY  = 4/FOSC;                 // 813.8 ns per instruction cycle
const DUR  = 60;                     // one minute of the unit's life: long enough for the 45 s delay
const END_CYC = Math.ceil(DUR/TCY);
const VREF = 5.0;                    // ADCON1 PCFG2:0 = 000 → AN0–AN4 analog, VREF = VDD (+5V from REG1 7805)
const G_DIFF = 200/4.7;              // U1B/U3B: R6/R18 200K0 over R2,R5 / R4,R19 4K7 → 42.55 (32.6 dB)
const G_RECT = 20/1;                 // U2A/U4A precision rectifier: R9/R21 20K0 over R10/R20 1K0
const G_FULL = G_DIFF*G_RECT;        // 851 with the THRESHOLD trimmer fully clockwise
const TAU_UP = 10e-3, TAU_DN = 30e-3;// R12/R16 10K0 × C44/C45 1.0uF; discharge also through R9/R21 20K0 — INFERRED model
const BOOT_T = 0.072 + 1024*TCY;     // PWRT 72 ms + OST 1024 Tcy — INFERRED (no __CONFIG in the source)
const INIT_CYC = 77;                 // init: … goto main, counted from init.asm (approximate)
const RELAY_ON = 0.005, RELAY_OFF = 0.003; // RZ-12W-C operate / release — INFERRED
const LINEAR = (()=>{ const a=[0,0]; for(let v=1;v<=0x0B;v++) a.push(v); for(let v=0x0D;v<=0xF1;v++) a.push(v); for(let v=0xF3;v<=0xFE;v++) a.push(v); a.push(0xFE,0xFE); return a; })(); // 256 retlw values from init.asm
const FW = {
  v101:{ name:'V1.01 · pod25.asm (23 Jul 2004)', short:'V1.01', thr:40, timer:true,  year:2004 },
  v100:{ name:'V1.00 · pod25.asm (14 May 2003)', short:'V1.00', thr:35, timer:true,  year:2003 },
  v2:  { name:'draft · pod25v2.asm (13 May 2003, no delay)', short:'pod25v2', thr:35, timer:false, year:2003 },
};
const MODES = { tone:'1 kHz tone', program:'programme (speech-like)', off:'source silent' };

/* ---------------- device + scenario state ---------------- */
const DEF_INIT = () => ({ power:true, delay:0.19, mute:false,
  ch:[ {plug:true, mode:'tone', lvl:0, thr:0.5}, {plug:true, mode:'program', lvl:-4, thr:0.5} ] });
const DEF_EVENTS = () => [
  {t:6,  k:'plug', ch:0, v:false, scn:true},
  {t:22, k:'mute', v:true, scn:true},
  {t:30, k:'plug', ch:0, v:true, scn:true},
  {t:31, k:'mute', v:false, scn:true},
];
const D = { fw:'v101', off:[0.25, 0.25], init:DEF_INIT(), events:DEF_EVENTS(), log:[] };

/* settings at time t (initial values + events up to t) */
function setAt(t){
  const S = JSON.parse(JSON.stringify(D.init));
  for (const e of D.events.slice().sort((a,b)=>a.t-b.t)){ if (e.t > t) break; applyEv(S, e); }
  return S;
}
function applyEv(S, e){
  if (e.k==='power') S.power = e.v; else if (e.k==='delay') S.delay = e.v; else if (e.k==='mute') S.mute = e.v;
  else S.ch[e.ch][e.k] = e.v;
}
function powerAt(t){ return setAt(t).power; }
function lastOnBefore(t){ let on = D.init.power ? 0 : null; for (const e of D.events.slice().sort((a,b)=>a.t-b.t)){ if (e.t>t) break; if (e.k==='power') on = e.v ? e.t : null; } return on; }

/* ---------------- analog front end ---------------- */
function thrDbu(p){ return -20 - 30*p; }                       // silk: −20 dBu fully CCW … −50 dBu fully CW; linear-in-dB taper INFERRED
function kOf(p){ const vr = 0.775*Math.pow(10, thrDbu(p)/20); return (40*VREF/256) / (G_FULL*Math.SQRT2*vr/Math.PI); }   // calibrated to V1.01's code 40
function hash(n){ n = Math.imul(n|0, 2654435761)>>>0; n ^= n>>>16; n = Math.imul(n, 2246822519)>>>0; n ^= n>>>13; return (n>>>0)/4294967296; }
function progEnv(t, ch){                                       // speech-like programme: 180 ms syllables, gaps, a 1.4 s pause every 9 s — INFERRED test signal
  if ((t + ch*3.1) % 9 > 7.6) return 0;
  const k = Math.floor(t/0.18) + ch*7919; if (hash(k) < 0.18) return 0;
  return 0.25 + 0.75*hash(k+12345);
}
function vrmsIn(c, ch, t){
  if (!c.plug || c.mode==='off') return 0;
  const v = 0.775*Math.pow(10, c.lvl/20);
  return c.mode==='tone' ? v : v*progEnv(t, ch);
}
function detTarget(S, ch, t, off){ const c=S.ch[ch]; const v = kOf(c.thr)*G_FULL*Math.SQRT2*vrmsIn(c,ch,t)/Math.PI; return Math.min(5.3, v + off); }
const adcCode = v => Math.max(0, Math.min(255, Math.floor(v*256/VREF)));
function inputWave(S, ch, t){ const c=S.ch[ch]; const v=vrmsIn(c,ch,t); return v*Math.SQRT2*Math.sin(2*Math.PI*1000*t); }

/* ================================================================
   FIRMWARE EMULATION — one main-loop pass at a time, cycle-counted from the source
   ================================================================ */
function initRAM(){
  return { adf: 0x0C, data_mode:0, xlr1:0, xlr2:0, rv3:0, signal:3, ti:0, cmp_res:0, l_data:0, r_data:0, cmp_dif:0, cmp_thr:1,
    l_counter:1, r_counter:1, l_counter1:0, r_counter1:0, xlr1_0:0, xlr2_0:0, period2:2, pulse1:0, pulse2:5,
    a1:0, a2:0, at:0, timer1:0, timer2:8, xlr_timer:0, portb:0, portc:0, chs:2, adres:0, w:0 };
}
let P_op=0, P_dv=0, P_ad=0;   // per-pass record scratch
/* Runs main once. Returns cycles. T (optional) collects [routine, what happened, cycles]. */
function pass(R, M, cyc0, T){
  const fw = FW[D.fw]; let c = 0; P_op=0; P_dv=NaN; P_ad=0;
  const seg = (r,d,n)=>{ c+=n; if (T) T.push([r,d,n]); };
  seg('clrwdt','watchdog cleared (config bits unknown)',1);
  /* ---- a_d_convsion (conversion always finished: 9.5 TAD at Fosc/2 ≈ 3.9 µs, less than one pass) ---- */
  { let n=2, d; R.data_mode=0;
    if (R.adf & 8){ n+=10; R.adf &= ~8; const ch=R.chs, t=(cyc0+c+n-4)*TCY;
      let v; if (ch===2) v = M.S.delay*VREF; else v = detAt(M, ch, t);
      R.adres = adcCode(v); P_op = 1 | (ch<<2); P_dv = v; P_ad = R.adres;
      d = `start_ad: bsf ADCON0,GO on ${['RA0 (XLR1)','RA1 (XLR2)','RA2 (RV3 delay)'][ch]} — samples ${v.toFixed(3)} V`; }
    else if (R.adf & 1){ n+=23; R.xlr1=R.adres; R.chs=1; R.adf=(R.adf&~0x27)|0x02|0x08|0xC0; R.data_mode=2; P_op=2; P_ad=R.adres; d=`XLR1_data: ADRES ${hex2(R.adres)} → xlr1; next RA1, data_mode=2`; }
    else if (R.adf & 2){ n+=25; R.xlr2=R.adres; R.chs=2; R.adf=(R.adf&~0x07)|0x04|0x08|0xE0; R.data_mode=3; P_op=2|(1<<2); P_ad=R.adres; d=`XLR2_data: ADRES ${hex2(R.adres)} → xlr2; next RA2, data_mode=3`; }
    else if (R.adf & 4){ n+=25; R.rv3=R.adres; R.chs=0; R.adf=(R.adf&~0x07)|0x01|0x08|0x80; R.data_mode=1; P_op=2|(2<<2); P_ad=R.adres; d=`rv3_data: ADRES ${hex2(R.adres)} → rv3; next RA0, data_mode=1`; }
    else { n+=13; d='no flag set → return'; }
    seg('a_d_convsion', d, n); }
  /* ---- movlw 3 / movwf pclath / call process_data / clrf pclath ---- */
  { let n=5, d;
    if (!(R.adf & 0x80)){ n+=3; d='a_d_flag,7 clear → return'; }
    else { R.adf &= ~0x80; n+=10;
      if (R.data_mode===1){ if (fw.timer){ n+=13; R.at = LINEAR[R.rv3]; d=`process_RV3_data: call linear_table(rv3=${R.rv3}) → alarm_threshold = ${R.at}`; } else { n+=2; d='process_RV3_data: return (pod25v2: the delay pot is ignored)'; } }
      else { const ch=R.data_mode-2, x0 = ch? R.xlr2_0 : R.xlr1_0, good = x0 >= fw.thr, bit=1<<ch;
        if (!fw.timer){ n+=8; if (good) R.signal|=bit; else R.signal&=~bit; d=`process_XLR${ch+1}_data: xlr${ch+1}_0=${x0} ${good?'≥':'<'} ${fw.thr} → signal,${ch}=${good?1:0} (no delay)`; }
        else if (good){ n+=10; R.signal|=bit; if(ch) R.a2=0; else R.a1=0; R.portb &= ~(ch?0x40:0x80); d=`process_XLR${ch+1}_data: xlr${ch+1}_0=${x0} ≥ SILENT_THRESHOLD ${fw.thr} → xlr${ch+1}_signal_good: signal,${ch}=1, clrf xlr${ch+1}_alarm_data`; }
        else if (!(R.xlr_timer & bit)){ n+=7; d=`process_XLR${ch+1}_data: xlr${ch+1}_0=${x0} < ${fw.thr} (silent), xlr_timer,${ch} clear → return`; }
        else { n+=15; R.xlr_timer &= ~bit; let a = ((ch?R.a2:R.a1)+1)&255; if (ch) R.a2=a; else R.a1=a;
          const fire = a > R.at; if (fire) R.signal &= ~bit; R.portb |= (ch?0x40:0x80); P_op |= ch?64:32;
          d=`process_XLR${ch+1}_data: silent + tick → incf xlr${ch+1}_alarm_data = ${a}${fire?` > alarm_threshold ${R.at} → bcf signal,${ch}`:` (≤ ${R.at})`}; bsf PORTB,${ch?6:7}`; } } }
    seg('process_data', d, n); }
  /* ---- hysterisis ---- */
  { let n=2, d;
    if (!(R.adf & 0x40)){ n+=3; d='a_d_flag,6 clear → return'; }
    else { R.adf &= ~0x40; n+=9; const two = !!(R.adf & 0x20); n += two?4:3; R.cmp_res = 0;
      const x = two? R.xlr2 : R.xlr1, ld = two? R.r_data : R.l_data;
      if (ld >= x){ n+=8; R.cmp_dif = (ld-x)&255; } else { n+=9; R.cmp_dif = (x-ld)&255; }
      let upd=false;
      if (R.cmp_dif > R.cmp_thr){ n+=12; if (two) R.r_counter=1; else R.l_counter=1; upd=true; d=`${two?'xlr2':'xlr1'}_data1: |Δ|=${R.cmp_dif} > 1 → ${two?'r':'l'}_update_sharc`; }
      else { const cnt = two? R.r_counter : R.l_counter;
        if (cnt===0){ n+=8; d=`${two?'xlr2':'xlr1'}_data1: |Δ|=${R.cmp_dif} ≤ 1 and counter locked → keep ${two?'xlr2':'xlr1'}_0`; }
        else { let c1 = ((two? R.r_counter1 : R.l_counter1) - 1)&255; if (two) R.r_counter1=c1; else R.l_counter1=c1;
          if (c1!==0){ n+=15; } else { n+=17; if (two) R.r_counter--; else R.l_counter--; } upd=true; d=`${two?'xlr2':'xlr1'}_data1: |Δ|=${R.cmp_dif} ≤ 1, not locked yet → update`; } }
      if (upd){ R.cmp_res = two?2:1; if (two) R.r_data = x; else R.l_data = x; }
      if (R.cmp_res & 1){ n+=6; R.xlr1_0 = R.xlr1; } else if (R.cmp_res & 2){ n+=9; R.xlr2_0 = R.xlr2; } else n+=6;
      if (upd) P_op |= 128;
      d += upd? ` · volume_change? → ${two?'xlr2_0':'xlr1_0'} = ${x}` : ''; }
    seg('hysterisis', d, n); }
  /* ---- process_xlr1 / process_xlr2 ---- */
  for (const ch of [0,1]){
    let n=2, d; const me=1<<ch, other=1<<(1-ch);
    const sigB = ch?0x08:0x02, alB = ch?0x04:0x01, rel = ch?0x02:0x04;
    if (!(R.signal & me)){ n+=10; R.portb = (R.portb & ~sigB) | alB; R.portc |= rel|0x01; R.ti |= 2; d=`xlr${ch+1}_alarm: PRESENCE ${ch+1} off, ALARM ${ch+1} on, REL${ch+1} + REL3 on, tone_interrupt,1 = 1`; }
    else { R.portb = (R.portb | sigB) & ~alB; R.portc &= ~rel;
      if (R.signal & other){ n+=15; R.portc &= ~0x01; R.ti &= ~0x0A; R.portb &= ~0x10; d=`xlr${ch+1}_signal: both good → REL3 off, tone off (RB4 = 0)`; }
      else { n+=10; d=`xlr${ch+1}_signal: PRESENCE ${ch+1} on, REL${ch+1} off (other channel still in alarm)`; } }
    seg('process_xlr'+(ch+1), d, n); }
  /* ---- pulse_generator / period_generator / generate_tone ---- */
  { let n=2, d;
    if (!(R.ti & 2)){ n+=3; d='alarm off → return'; }
    else { R.pulse1 = (R.pulse1-1)&255;
      if (R.pulse1){ n+=5; d=`pulse1 = ${R.pulse1}`; }
      else { R.pulse2 = (R.pulse2-1)&255; if (R.pulse2){ n+=7; d=`pulse1 wrapped, pulse2 = ${R.pulse2}`; } else { n+=12; R.pulse2=5; R.ti ^= 8; d=`pulse2 = 0 → xorwf tone_interrupt,bit3 → beep ${R.ti&8?'ON':'OFF'}`; } } }
    seg('pulse_generator', d, n); }
  { let n=2, d;
    if (!(R.ti & 8)){ n+=3; d='beep gate (bit 3) off → return'; }
    else { R.period2 = (R.period2-1)&255; if (R.period2){ n+=5; d=`period2 = ${R.period2}`; } else { n+=9; R.period2 = 2; R.ti |= 1; d='period2 = 0 → reload TONE_CONSTANT 2, tone_interrupt,0 = 1'; } }
    seg('period_generator', d, n); }
  { let n=2, d;
    if (!(R.ti & 1)){ n+=3; d='no edge due → return'; }
    else { R.ti &= ~1; if (R.ti & 4){ n+=10; R.ti &= ~4; R.portb &= ~0x10; d='falling_edge: RB4 = 0'; } else { n+=12; R.ti |= 4; R.portb |= 0x10; d='rising_edge: RB4 = 1'; } }
    seg('generate_tone', d, n); }
  if (fw.timer){ let n=2, d; R.timer1 = (R.timer1-1)&255;
    if (R.timer1){ n+=3; d=`timer1 = ${R.timer1}`; }
    else { R.timer2 = (R.timer2-1)&255; if (R.timer2){ n+=5; d=`timer1 wrapped, timer2 = ${R.timer2}`; } else { n+=10; R.timer2 = 8; R.xlr_timer |= 3; P_op |= 16; d='timer2 = 0 → TICK: xlr_timer bits 0,1 = 1 (every 2048 passes)'; } }
    seg('xlr_check_timer', d, n); }
  seg('goto main','',2);
  return c;
}
/* detector capacitor C44/C45 voltage at time t (advanced lazily at each ADC sample) */
function detAt(M, ch, t){
  const A = M.A; const dt = Math.max(0, t - A.t[ch]); const tg = detTarget(M.S, ch, t, D.off[ch]);
  const tau = tg > A.v[ch] ? TAU_UP : TAU_DN; A.v[ch] = tg + (A.v[ch]-tg)*Math.exp(-dt/tau); A.t[ch] = t; return A.v[ch];
}

/* the machine: walks time, applies the scenario events, boots after power-on and runs passes */
function makeMachine(){
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  return { ev, evI:0, S:JSON.parse(JSON.stringify(D.init)), R:null, cyc:0, powered:D.init.power, bootEnd: D.init.power? Math.ceil(BOOT_T/TCY) : 0,
    A:{v:[0,0], t:[0,0]}, np:0 };
}
function cloneM(M){ return { ev:M.ev, evI:M.evI, S:JSON.parse(JSON.stringify(M.S)), R:M.R?Object.assign({},M.R):null, cyc:M.cyc, powered:M.powered, bootEnd:M.bootEnd, A:{v:M.A.v.slice(), t:M.A.t.slice()}, np:M.np }; }
function stepPass(M, T){
  for(;;){
    const tNow = M.cyc*TCY;
    while (M.evI < M.ev.length && M.ev[M.evI].t <= tNow){ const e = M.ev[M.evI++]; applyEv(M.S, e);
      if (e.k==='power'){ if (e.v && !M.powered){ M.powered=true; M.R=null; M.bootEnd = M.cyc + Math.ceil(BOOT_T/TCY); M.A.v=[0,0]; M.A.t=[tNow,tNow]; } else if (!e.v){ M.powered=false; M.R=null; } } }
    if (M.cyc >= END_CYC) return 0;
    const nextEv = M.evI < M.ev.length ? Math.max(M.cyc+1, Math.ceil(M.ev[M.evI].t/TCY)) : END_CYC;
    if (!M.powered){ M.cyc = Math.min(nextEv, END_CYC); continue; }
    if (!M.R){ if (M.cyc < M.bootEnd){ M.cyc = Math.min(M.bootEnd, nextEv); continue; } M.R = initRAM(); M.cyc += INIT_CYC; continue; }
    const n = pass(M.R, M, M.cyc, T); M.cyc += n; M.np++; return n;
  }
}
let EMU=null, EMU_KEY='';
function emulate(){
  const key = JSON.stringify([D.fw, D.off, D.init, D.events]);
  if (key===EMU_KEY && EMU) return EMU;
  const NMAX = Math.ceil(END_CYC/60)+16;
  const E = { cy:new Uint32Array(NMAX), ln:new Uint8Array(NMAX), pb:new Uint8Array(NMAX), pc:new Uint8Array(NMAX), ti:new Uint8Array(NMAX),
    sg:new Uint8Array(NMAX), x1:new Uint8Array(NMAX), x2:new Uint8Array(NMAX), a1:new Uint8Array(NMAX), a2:new Uint8Array(NMAX), at:new Uint8Array(NMAX),
    op:new Uint8Array(NMAX), ad:new Uint8Array(NMAX), dv:new Float32Array(NMAX), ck:[], n:0 };
  const M = makeMachine();
  for(;;){
    if ((M.np & 1023)===0 && (E.ck.length===0 || E.ck[E.ck.length-1].np !== M.np)) E.ck.push(cloneM(M));
    const c0 = M.cyc; const n = stepPass(M); if (!n) break;
    const i = E.n++, R = M.R; E.cy[i] = M.cyc - n; E.ln[i] = n;
    E.pb[i]=R.portb; E.pc[i]=R.portc; E.ti[i]=R.ti; E.sg[i]=R.signal; E.x1[i]=R.xlr1_0; E.x2[i]=R.xlr2_0; E.a1[i]=R.a1; E.a2[i]=R.a2; E.at[i]=R.at; E.op[i]=P_op; E.ad[i]=P_ad; E.dv[i]=P_dv;
  }
  let sum=0; for (let i=0;i<E.n;i++) sum+=E.ln[i]; E.avgPass = E.n? sum/E.n*TCY : 112*TCY;
  EMU = E; EMU_KEY = key; TRACE_CACHE = {}; return E;
}
/* re-run from the nearest checkpoint to get the routine-by-routine trace of pass i */
let TRACE_CACHE = {};
function traceRange(i0, i1){
  const E = emulate(); const out = {};
  let ck = null; for (const c of E.ck){ if (c.np <= i0) ck = c; else break; } if (!ck) return out;
  const M = cloneM(ck);
  while (M.np <= i1){ const idx = M.np; const T = idx >= i0 ? [] : null; const n = stepPass(M, T); if (!n) break; if (T){ out[idx] = { T, R:Object.assign({}, M.R), S:M.S }; } }
  return out;
}
function traceOf(i){ if (i<0) return null; if (!TRACE_CACHE[i]){ const r = traceRange(i, i); Object.assign(TRACE_CACHE, r); } return TRACE_CACHE[i]; }

/* ---------------- queries at time t ---------------- */
function idxAt(t){ const E=emulate(), tc=t/TCY; let lo=0, hi=E.n-1; if (hi<0 || E.cy[0]>tc) return -1; while(lo<hi){ const m=(lo+hi+1)>>1; if (E.cy[m]<=tc) lo=m; else hi=m-1; } return lo; }
const ZERO = { pb:0, pc:0, ti:0, sg:3, x1:0, x2:0, a1:0, a2:0, at:0 };
function outAt(t){
  const E = emulate(); const on = powerAt(t); const lon = lastOnBefore(t);
  if (!on) return Object.assign({ on:false, boot:false, i:-1, j:-1 }, ZERO);
  if (lon!==null && t < lon + BOOT_T) return Object.assign({ on:true, boot:true, i:-1, j:-1 }, ZERO);
  const i = idxAt(t); if (i<0 || E.cy[i]*TCY < (lon||0)) return Object.assign({ on:true, boot:false, init:true, i:-1, j:-1 }, ZERO);
  let j = i; if (t/TCY < E.cy[i]+E.ln[i]) j = i-1;
  if (j<0 || E.cy[j]*TCY < (lon||0)) return Object.assign({ on:true, boot:false, i, j:-1 }, ZERO);
  return { on:true, boot:false, i, j, pb:E.pb[j], pc:E.pc[j], ti:E.ti[j], sg:E.sg[j], x1:E.x1[j], x2:E.x2[j], a1:E.a1[j], a2:E.a2[j], at:E.at[j] };
}
function relayAt(t, bit){ // contact closes RELAY_ON after the coil is energised, opens RELAY_OFF after it drops
  return !!(outAt(Math.max(0,t-RELAY_ON)).pc & bit) && !!(outAt(Math.max(0,t-RELAY_OFF)).pc & bit); }
function lastSample(t, ch){ const E=emulate(); let i = idxAt(t); for (let k=0;k<12 && i>=0;k++,i--){ if ((E.op[i]&3)===1 && ((E.op[i]>>2)&3)===ch) return { i, v:E.dv[i], code:E.ad[i] }; } return null; }
function delayCode(S){ return Math.min(255, Math.floor(S.delay*256)); }
function delayEst(S){ const E=emulate(); const at = LINEAR[delayCode(S)]; const tick = 2048*E.avgPass; return { at, tick, lo:Math.max(0,(at-1))*tick, hi:at*tick }; }
function nextChange(t, test){ const E=emulate(); let i=Math.max(0, idxAt(t)); for (; i<E.n; i++) if (test(E,i)) return E.cy[i]*TCY + E.ln[i]*TCY; return null; }
function fmtS(s){ return s===null? '—' : s.toFixed(3)+' s'; }

/* ================================================================
   USER ACTIONS — each one becomes a scenario event at the playhead
   ================================================================ */
function act(name, fn){
  const lines = []; const tr = s => lines.push(s);
  fn(tr);
  D.log.unshift({ t:SIM.t, name, trace:lines });
  if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function addEv(e){
  D.events = D.events.filter(x => !(x.k===e.k && x.ch===e.ch && Math.abs(x.t-e.t) < 1e-3));
  e.user = true; D.events.push(e); EMU_KEY='';
}
function consequences(tr, t, ch){
  const E = emulate(); const bit = 1<<ch;
  const o = outAt(t + 0.001);
  const nowAl = !(o.sg & bit);
  const tAl = nextChange(t, (E,i)=> !(E.sg[i] & bit)), tOk = nextChange(t, (E,i)=> !!(E.sg[i] & bit));
  if (!nowAl && tAl!==null) tr(`Emulation: ALARM ${ch+1} lights at ${fmtS(tAl)} (${(tAl-t).toFixed(3)} s after this action). Scrub or play forward to see it.`);
  else if (nowAl && tOk!==null) tr(`Emulation: PRESENCE ${ch+1} comes back at ${fmtS(tOk)} (${((tOk-t)*1000).toFixed(1)} ms after this action — recovery has no delay).`);
  else tr(`Emulation: detector ${ch+1} stays ${nowAl?'in ALARM':'in PRESENCE'} for the rest of the run.`);
}
const A = {
  plug(ch){ const t=SIM.t, S=setAt(t), v=!S.ch[ch].plug;
    act(`${v?'Plug in':'Unplug'} INPUT ${ch+1}`, tr=>{
      addEv({t, k:'plug', ch, v});
      tr(`XLR${ch+1} (NC3FD-H) pins 2/3 ${v?'get the source':'go open'} → R${ch?'15':'1'}/R${ch?'4':'2'} 4K7 + C${ch?'9':'1'}/C${ch?'4':'2'} 33µF → U${ch?3:1} (OPA2064) balanced stage, gain 42.6`);
      tr(`U${ch?3:1}B → RV${ch+1} THRESHOLD → R${ch?20:10} 1K0 → U${ch?4:2}A precision rectifier (×20, D${ch?'3/D4':'1/D2'}) → R${ch?16:12} 10K0 into C${ch?45:44} 1µF → U${ch?4:2}B follower → R${ch?22:13} → RA${ch} (pin ${ch?3:2})`);
      tr(v? `C${ch?45:44} charges (τ ≈ 10 ms ${inf}); the next ${ch?'XLR2':'XLR1'}_data reading passes SILENT_THRESHOLD ${FW[D.fw].thr} → process_XLR${ch+1}_data → xlr${ch+1}_signal_good`
           : `C${ch?45:44} discharges through R${ch?16:12}+R${ch?21:9} (τ ≈ 30 ms ${inf}); once xlr${ch+1}_0 < ${FW[D.fw].thr}, every TICK of xlr_check_timer does incf xlr${ch+1}_alarm_data until it passes alarm_threshold`);
      consequences(tr, t, ch); }); },
  mode(ch, v){ const t=SIM.t; act(`INPUT ${ch+1} source → ${MODES[v]}`, tr=>{ addEv({t, k:'mode', ch, v}); tr(v==='program'? 'Programme audio has short gaps and a 1.4 s pause every 9 s: a delay shorter than the pause gives a false alarm.' : v==='off'? 'The source plays digital silence; the cable stays in.' : 'Steady 1 kHz sine at the set level.'); consequences(tr, t, ch); }); },
  level(ch, v){ const t=SIM.t; act(`INPUT ${ch+1} level → ${v} dBu`, tr=>{ addEv({t, k:'lvl', ch, v}); const S=setAt(t); tr(`THRESHOLD ${ch+1} is set to ${thrDbu(S.ch[ch].thr).toFixed(1)} dBu ${inf}. A steady tone below it counts as silence.`); consequences(tr, t, ch); }); },
  thr(ch, v){ const t=SIM.t; v=Math.max(0,Math.min(1,v)); act(`THRESHOLD ${ch+1} trimmer → ${thrDbu(v).toFixed(1)} dBu`, tr=>{ addEv({t, k:'thr', ch, v});
      tr(`RV${ch+1} (TOCOS) is a level trim in the analog path, not read by the PIC: it scales U${ch?3:1}B's output before the rectifier (k = ${kOf(v).toFixed(3)}).`);
      tr(`The firmware compare is fixed: SILENT_THRESHOLD EQU ${FW[D.fw].thr} = ${(FW[D.fw].thr*VREF/256).toFixed(3)} V at RA${ch}.`); consequences(tr, t, ch); }); },
  delay(v){ const t=SIM.t; v=Math.max(0,Math.min(1,v)); act(`ALARM DELAY trimmer → ${Math.round(v*100)} %`, tr=>{ addEv({t, k:'delay', v}); const S=setAt(t), d=delayEst(S);
      tr(`RV3:A wiper → RA2 (pin 4) = ${(v*VREF).toFixed(2)} V. rv3_data reads ADRES = ${delayCode(S)} on the next round robin.`);
      if (FW[D.fw].timer){ tr(`process_RV3_data: call linear_table → retlw ${hex2(d.at)} → alarm_threshold = ${d.at}`);
        tr(`Delay = alarm_threshold ticks of xlr_check_timer (2048 passes ≈ ${(d.tick*1000).toFixed(1)} ms each) ≈ ${d.lo.toFixed(1)}–${d.hi.toFixed(1)} s`); }
      else tr('pod25v2.asm: process_RV3_data is just “return” — the delay pot does nothing in this draft.'); }); },
  mute(){ const t=SIM.t, v=!setAt(t).mute; act(`ALARM button ${v?'pressed in (OFF)':'released (ON)'}`, tr=>{ addEv({t, k:'mute', v});
      tr(`SW1 PHA-2UEE latching push-button sits between U6B pin 7 and R29 10R → TONE_OUTPUT. It is not wired to the PIC.`);
      tr(v? 'The firmware keeps toggling RB4; only the speaker goes quiet. LEDs and GPI relays are unaffected.' : 'Speaker reconnected: if an alarm is active the beeping is heard again.'); }); },
  power(){ const t=SIM.t, v=!powerAt(t); act(`Power ${v?'on':'off'}`, tr=>{ addEv({t, k:'power', v});
      if (v){ tr(`PWRSW1 → T3 TE70042 → D5–D8 → C28/C55 → REG1 7805 → +5V. Reset: PWRT + OST ≈ ${(BOOT_T*1000).toFixed(0)} ms ${inf}`);
        tr('init: TRISA = 0x0F, PORTB/PORTC outputs cleared, ADCON1 PCFG = 000, ADCON0 = ADON|GO on RA2, a_d_flag = 0x0C (RV3 first), signal = 0x03 (both “good”)'); }
      else tr('All LEDs off, the three relays drop: every GPI goes back to NC closed — the same state as “signal present”.'); }); },
  fw(v){ D.fw=v; EMU_KEY=''; act(`Firmware → ${FW[v].name}`, tr=>{ tr(`SILENT_THRESHOLD EQU ${FW[v].thr}${FW[v].timer?'':'; no xlr_check_timer, process_RV3_data returns at once'}`); }); },
  offset(ch, v){ D.off[ch]=v; EMU_KEY=''; act(`Detector ${ch+1} front-end offset → ${v.toFixed(2)} V (code ${adcCode(v)})`, tr=>{ tr(`${inf}: the V1.01 note says the threshold was raised “due to various offset and bias parameters of the OP-AMPS”. With no signal RA${ch} reads ≈ ${adcCode(v)}; SILENT_THRESHOLD is ${FW[D.fw].thr}.`); consequences(tr, SIM.t, ch); }); },
  clear(){ D.events = D.events.filter(e=>!e.user); EMU_KEY=''; act('Cleared your actions', tr=>tr('Back to the built-in scenario.')); },
  reset(){ D.fw='v101'; D.off=[0.25,0.25]; D.init=DEF_INIT(); D.events=DEF_EVENTS(); EMU_KEY=''; D.log=[]; SIM.seek(0); },
  blank(){ D.init=DEF_INIT(); D.events=[]; EMU_KEY=''; act('Empty scenario', tr=>tr('No scripted events: both inputs present for the whole minute. Make your own.')); },
};

/* ================================================================
   PANELS — real silkscreen, controls on the drill crosshairs
   ================================================================ */
/* Front: POD25-FRONT ISS 1 (PANEL).pdf (Apr 21/03), x from the left edge, y from the bottom, 200 px per inch:
   rocker D .505×.770 at (0.900, 0.950) → x 130–231, y 54–208; LEDs B (.130) at 1.496 / 5.385 / 5.885 / 6.885 / 7.385, y .516 → 218;
   ALARM button A (.281) at 3.960 → 792; trims C (.150) at 4.685 / 6.385 / 7.885, y .560 → 209; 9 speaker slots E .062×.750 from 2.435 at .125.
   Rear: POD25-REAR ISS 2 (PANEL).pdf (26/11/07 “changed to new style AC plug”): XLR .950 holes at 1.346 / 2.646, y .781; terminal
   cut-out .425×2.550 centred 4.941, .749; IEC detail D 1.256×1.080 centred 7.415, .703. All agree with the silk crosshairs. */
const ASSET = 'siumulation-plugins/assets/';
function trim(x, y, pos, id, tip){
  const a = (-135 + 270*pos)*Math.PI/180, dx = Math.sin(a)*12, dy = -Math.cos(a)*12;
  return `<g class="p25f" data-a="pot" data-p="${id}" style="cursor:pointer"><title>${tip} — click left/right half to turn, or use the mouse wheel</title>
    <rect x="${x-46}" y="${y-36}" width="92" height="72" fill="transparent"/>
    <circle cx="${x}" cy="${y}" r="17" fill="#0b0b0c"/><circle cx="${x}" cy="${y}" r="14" fill="#c9cbcc" stroke="#7d8083" stroke-width="2"/>
    <line x1="${x-dx}" y1="${y-dy}" x2="${x+dx}" y2="${y+dy}" stroke="#3a3c3e" stroke-width="4" stroke-linecap="round"/></g>`;
}
function led(x, y, on, col, tip){
  return `<g><title>${tip}</title><circle cx="${x}" cy="${y}" r="14" fill="#060707"/><circle cx="${x}" cy="${y}" r="10" fill="${on?col:(col==='#ff3b30'?'#3a1716':'#1c2c1c')}" ${on?'filter="url(#p25glow)"':''}/>${on?`<circle cx="${x-3}" cy="${y-3}" r="3.5" fill="#fff" opacity=".55"/>`:''}</g>`;
}
function frontSVG(t, opts){
  opts = opts||{};
  const o = outAt(t), S = setAt(t);
  const beep = o.on && !o.boot && (o.ti & 8) && !S.mute;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD25 front panel (real silkscreen)" style="width:100%;max-width:${opts.max||980}px;border-radius:8px;display:block">
    <defs><filter id="p25glow" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="8" fill="#141516"/>
    <image href="${ASSET}pod25-front-green.png" width="1714" height="321"/>
    <image href="${ASSET}pod25-front-white.png" width="1714" height="321"/>
    <g class="p25f" data-a="power" style="cursor:pointer"><title>PWRSW1 PAN256 power rocker (click)</title><rect x="130" y="54" width="101" height="154" rx="8" fill="#0b0c0d" stroke="#2d3033" stroke-width="2"/>
      <rect x="143" y="${S.power?68:128}" width="75" height="66" rx="6" fill="#1b1d20" stroke="#3a3e42"/><rect x="149" y="${S.power?74:182}" width="63" height="10" rx="3" fill="#2b2e31"/></g>
    ${led(299,218,o.on,'#b9ff5a','PWRLED green, R27 1K0 from +VA (unregulated rail)')}
    <g><title>Speaker behind 9 slots (.062 × .750). Fed from TONE_OUTPUT: RB4 → U6 → SW1 → R29 10R${beep?' — beeping now':''}</title>
      ${[0,1,2,3,4,5,6,7,8].map(k=>`<rect x="${481+25*k}" y="86" width="12.4" height="150" rx="6" fill="${beep?'#2a2412':'#050505'}" stroke="#2a2b2c"/>`).join('')}
      ${beep?`<rect x="476" y="80" width="222" height="162" rx="10" fill="none" stroke="var(--led-a)" stroke-width="3" opacity=".6"/>`:''}</g>
    <g class="p25f" data-a="mute" style="cursor:pointer"><title>ALARM push-button SW1 (PHA-2UEE, latching): out = ON, in = OFF (audible alarm disabled). Now ${S.mute?'IN — OFF':'OUT — ON'}.</title>
      <circle cx="792" cy="218" r="34" fill="transparent"/><circle cx="792" cy="218" r="28" fill="#060606" stroke="#2c2d2e" stroke-width="2"/>
      <circle cx="792" cy="${S.mute?220:218}" r="${S.mute?19:23}" fill="${S.mute?'#0d0d0e':'#1c1d1f'}" stroke="#3b3d40" stroke-width="2"/></g>
    ${trim(937,209,S.delay,'delay',`ALARM DELAY — RV3 (dual gang; A → RA2, B → RA3 unused). ADRES ≈ ${delayCode(S)} → alarm_threshold ${LINEAR[delayCode(S)]}`)}
    ${trim(1277,209,S.ch[0].thr,'thr0',`DETECTOR 1 THRESHOLD — RV1, ≈ ${thrDbu(S.ch[0].thr).toFixed(1)} dBu`)}
    ${trim(1577,209,S.ch[1].thr,'thr1',`DETECTOR 2 THRESHOLD — RV2, ≈ ${thrDbu(S.ch[1].thr).toFixed(1)} dBu`)}
    ${led(1077,218,!!(o.pb&2),'#4dff5a','PRESENCE 1 — LED1 green, RB1 (SIGNAL1) via R36 330R')}
    ${led(1177,218,!!(o.pb&1),'#ff3b30','ALARM 1 — LED2 red, RB0 (ALARM1) via R37 330R')}
    ${led(1377,218,!!(o.pb&8),'#4dff5a','PRESENCE 2 — LED3 green, RB3 (SIGNAL2) via R38 330R')}
    ${led(1477,218,!!(o.pb&4),'#ff3b30','ALARM 2 — LED4 red, RB2 (ALARM2) via R39 330R')}
    ${[50,1664].map(x=>`<circle cx="${x}" cy="161" r="11" fill="#8a8886" stroke="#444" stroke-width="2"/><path d="M${x-6} 161 h12 M${x} 155 v12" stroke="#444" stroke-width="2.5"/>`).join('')}
    ${opts.hot||''}
  </svg>`;
}
function xlr(x, y, plugged, ch){
  const scr = (sx,sy)=>`<circle cx="${sx}" cy="${sy}" r="11" fill="#9a9da0" stroke="#55585b" stroke-width="2"/><path d="M${sx-6} ${sy} h12 M${sx} ${sy-6} v12" stroke="#47494c" stroke-width="2.5"/>`;
  return `<g class="p25r" data-j="in${ch}" style="cursor:pointer"><title>INPUT ${ch+1} — XLR${ch+1} NC3FD-H, balanced, max +24 dBu. ${plugged?'Cable in (click to pull it)':'Nothing connected (click to plug in)'}</title>
    <circle cx="${x}" cy="${y}" r="93" fill="#a9acae" stroke="#6d7073" stroke-width="3"/><circle cx="${x}" cy="${y}" r="74" fill="#c4c6c8"/>
    ${plugged? `<circle cx="${x}" cy="${y}" r="70" fill="#26282b" stroke="#4a4d51" stroke-width="4"/><circle cx="${x}" cy="${y}" r="52" fill="#1a1b1d"/><circle cx="${x+50}" cy="${y-50}" r="9" fill="var(--accent)"/>`
      : `<circle cx="${x}" cy="${y}" r="62" fill="#141415"/>${[[-22,-14],[22,-14],[0,26]].map(([dx,dy])=>`<circle cx="${x+dx}" cy="${y+dy}" r="11" fill="#050505" stroke="#a08a3c" stroke-width="2"/>`).join('')}`}
    <rect x="${x-26}" y="${y-104}" width="52" height="24" rx="5" fill="#b8babd" stroke="#6d7073"/><text x="${x}" y="${y-87}" text-anchor="middle" font-size="13" fill="#555" font-family="sans-serif">PUSH</text>
    ${scr(x-75,y-95)}${scr(x+75,y+95)}</g>`;
}
function rearSVG(t){
  const o = outAt(t), S = setAt(t);
  const rel = [relayAt(t,0x04), relayAt(t,0x02), relayAt(t,0x01)];
  const names = ['OUTPUT 1 (REL1, detector 1)','OUTPUT 2 (REL2, detector 2)','OUTPUT 1+2 (REL3, either)'];
  let tb = `<rect x="733" y="107" width="255" height="85" rx="4" fill="#3fae6a" stroke="#1f6e40" stroke-width="2"/><rect x="988" y="107" width="255" height="85" rx="4" fill="#3fae6a" stroke="#1f6e40" stroke-width="2"/>`;
  for (let k=0;k<18;k++){ const x = 749 + 28.33*k; tb += `<circle cx="${x}" cy="125" r="9" fill="#d5d8da" stroke="#6b7073"/><path d="M${x-5} 125 h10" stroke="#555" stroke-width="2.5"/><rect x="${x-9}" y="150" width="18" height="30" rx="2" fill="#16502e"/>`; }
  let sw = '';
  for (let g=0; g<6; g++){ const r = g>>1, on = rel[r], x0 = 749 + 28.33*3*g;
    const xNO = x0, xNC = x0+28.33, xC = x0+56.66, yy = 300;
    sw += `<g class="p25r" data-j="tb${g}"><title>${names[r]}, pole ${(g&1)+1} (TB${g+1}): ${on?'ALARM → relay energised: NO–COM closed, NC open':'no alarm → relay released: NC–COM closed, NO open'}${o.on?'':' (unit off: relay released)'}</title>
      <rect x="${x0-12}" y="100" width="81" height="215" fill="transparent"/>
      <circle cx="${xNO}" cy="${yy}" r="4" fill="${on?'var(--bad)':'#777'}"/><circle cx="${xNC}" cy="${yy}" r="4" fill="${on?'#777':'var(--accent)'}"/><circle cx="${xC}" cy="${yy+12}" r="4" fill="#ccc"/>
      <line x1="${xC}" y1="${yy+12}" x2="${on?xNO:xNC}" y2="${yy}" stroke="${on?'var(--bad)':'var(--accent)'}" stroke-width="3"/></g>`; }
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD25 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#141516"/>
    <image href="${ASSET}pod25-rear-white.png" width="1714" height="321"/>
    ${xlr(269,156,S.ch[1].plug,1)}${xlr(529,156,S.ch[0].plug,0)}
    ${tb}${sw}
    ${[712,1263,50,1664].map(x=>`<circle cx="${x}" cy="161" r="10" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-6} 161 h12 M${x} 155 v12" stroke="#47494c" stroke-width="2"/>`).join('')}
    <g class="p25r" data-j="mains" style="cursor:pointer"><title>ACIN1 IEC inlet with fuse drawer (115 VAC, 1/2 A S.B.) → PWRSW1 → T3. Click: power ${S.power?'off':'on'}</title>
      <rect x="1357" y="33" width="251" height="216" rx="12" fill="#0b0b0c" stroke="#333" stroke-width="2"/><rect x="1372" y="52" width="62" height="178" rx="5" fill="#161516"/><rect x="1450" y="62" width="140" height="160" rx="12" fill="#050505"/>
      ${[[1486,98],[1554,98],[1520,182]].map(([x,y])=>`<rect x="${x-10}" y="${y-14}" width="20" height="28" fill="#c9cdd2"/>`).join('')}</g>
    <text x="857" y="318" font-size="11" fill="#888" font-family="sans-serif" text-anchor="middle">(contact state overlay — not on the real panel)</text>
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.p25f').forEach(g=>{
    const a = g.dataset.a;
    g.addEventListener('click', e=>{
      if (a==='power') A.power(); else if (a==='mute') A.mute();
      else if (a==='pot'){ const r=g.getBoundingClientRect(); const dir = (e.clientX-r.left) < r.width/2 ? -1 : 1; turnPot(g.dataset.p, dir); } });
    if (a==='pot') g.addEventListener('wheel', e=>{ e.preventDefault(); turnPot(g.dataset.p, e.deltaY<0?1:-1); }, {passive:false});
  });
  root.querySelectorAll('.p25r').forEach(g=> g.addEventListener('click', ()=>{ const j=g.dataset.j;
    if (j==='mains') A.power(); else if (j==='in0') A.plug(0); else if (j==='in1') A.plug(1); }));
}
function turnPot(p, dir){ const S=setAt(SIM.t);
  if (p==='delay') A.delay(Math.round((S.delay + dir/51)*510)/510);
  else { const ch = p==='thr0'?0:1; A.thr(ch, Math.round((S.ch[ch].thr + dir/30)*300)/300); } }
document.addEventListener('keydown', e=>{
  if (!window.__pod25Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const S = setAt(SIM.t); const k = e.key.toLowerCase();
  const m = { '1':()=>A.plug(0), '2':()=>A.plug(1), a:()=>A.mute(), o:()=>A.power(), d:()=>turnPot('delay',-1), f:()=>turnPot('delay',1),
    q:()=>turnPot('thr0',-1), w:()=>turnPot('thr0',1), e:()=>turnPot('thr1',-1), r:()=>turnPot('thr1',1) };
  if (m[k]){ m[k](); e.preventDefault(); }
});
function benchHTML(){
  const S = setAt(SIM.t);
  const chRow = ch => `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px">
      <b class="small" style="min-width:60px">INPUT ${ch+1}</b>
      <button data-b="plug${ch}" class="${S.ch[ch].plug?'on':''}">${S.ch[ch].plug?'cable in':'unplugged'}</button>
      <select data-b="mode${ch}">${Object.keys(MODES).map(k=>`<option value="${k}" ${k===S.ch[ch].mode?'selected':''}>${MODES[k]}</option>`).join('')}</select>
      <label class="small">level <input type="range" min="-70" max="24" step="1" value="${S.ch[ch].lvl}" data-b="lvl${ch}"> <span class="mono">${S.ch[ch].lvl} dBu</span></label>
      <label class="small">threshold <input type="range" min="0" max="1" step="${1/300}" value="${S.ch[ch].thr}" data-b="thr${ch}"> <span class="mono">${thrDbu(S.ch[ch].thr).toFixed(1)} dBu</span></label></div>`;
  const d = delayEst(S);
  return `<div class="small muted">Settings at the playhead (${SIM.fmtT(SIM.t)}). A change is recorded as an event at the playhead, like a real operator doing it then.</div>
    ${chRow(0)}${chRow(1)}
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
      <label class="small">ALARM DELAY <input type="range" min="0" max="1" step="${1/510}" value="${S.delay}" data-b="delay"> <span class="mono">ADRES ${delayCode(S)} → ${FW[D.fw].timer? `alarm_threshold ${d.at} ≈ ${d.lo.toFixed(1)}–${d.hi.toFixed(1)} s` : 'ignored (pod25v2)'}</span></label>
      <button data-b="mute" class="${S.mute?'on':''}">ALARM button: ${S.mute?'IN (OFF)':'OUT (ON)'}</button><button data-b="power">${S.power?'Power off':'Power on'}</button></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">
      <label class="small">Firmware <select data-b="fw">${Object.keys(FW).map(k=>`<option value="${k}" ${k===D.fw?'selected':''}>${FW[k].name}</option>`).join('')}</select></label>
      ${[0,1].map(ch=>`<label class="small">offset ${ch+1} ${inf} <input type="range" min="0" max="1" step="0.01" value="${D.off[ch]}" data-b="off${ch}" style="width:90px"> <span class="mono">${D.off[ch].toFixed(2)} V = ${adcCode(D.off[ch])}</span></label>`).join('')}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button data-b="clear">Clear my actions</button><button data-b="blank">Empty scenario</button><button data-b="reset">Factory scenario</button>
      <span class="small muted">Keys: 1 / 2 plug · A alarm button · O power · D/F delay · Q/W threshold 1 · E/R threshold 2</span></div>`;
}
function bindBench(root){
  root.querySelectorAll('[data-b]').forEach(el=>{ const b = el.dataset.b;
    const ev = el.tagName==='BUTTON' ? 'click' : 'change';
    el.addEventListener(ev, ()=>{
      if (b==='plug0'||b==='plug1') A.plug(+b.slice(-1));
      else if (b.startsWith('mode')) A.mode(+b.slice(-1), el.value);
      else if (b.startsWith('lvl')) A.level(+b.slice(-1), +el.value);
      else if (b.startsWith('thr')) A.thr(+b.slice(-1), +el.value);
      else if (b==='delay') A.delay(+el.value);
      else if (b==='mute') A.mute(); else if (b==='power') A.power();
      else if (b==='fw') A.fw(el.value);
      else if (b.startsWith('off')) A.offset(+b.slice(-1), +el.value);
      else if (b==='clear') A.clear(); else if (b==='reset') A.reset(); else if (b==='blank') A.blank();
    }); });
}
function eventsHTML(){
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  const txt = e => e.k==='plug'? `INPUT ${e.ch+1} ${e.v?'plugged in':'unplugged'}` : e.k==='mute'? `ALARM button ${e.v?'in (OFF)':'out (ON)'}` : e.k==='power'? `power ${e.v?'on':'off'}` :
    e.k==='delay'? `ALARM DELAY → ${Math.round(e.v*100)} %` : e.k==='thr'? `THRESHOLD ${e.ch+1} → ${thrDbu(e.v).toFixed(1)} dBu` : e.k==='lvl'? `INPUT ${e.ch+1} level → ${e.v} dBu` : `INPUT ${e.ch+1} source → ${MODES[e.v]}`;
  return ev.length? ev.map((e,i)=>`<div><span class="mono">${e.t.toFixed(3)} s</span> ${txt(e)} ${e.scn?'<span class="muted">(scenario)</span>':''} <a href="#" data-go="${e.t}">go</a> · <a href="#" data-del="${D.events.indexOf(e)}">delete</a></div>`).join('') : '<div class="muted">No events: the settings stay as they start.</div>';
}
function bindEvents(root){
  root.querySelectorAll('[data-go]').forEach(a=>a.onclick=e=>{ e.preventDefault(); SIM.seek(+a.dataset.go); });
  root.querySelectorAll('[data-del]').forEach(a=>a.onclick=e=>{ e.preventDefault(); D.events.splice(+a.dataset.del,1); EMU_KEY=''; SIM.refresh(); });
}

/* ================================================================
   TIMELINE
   ================================================================ */
const RCOL = { 'clrwdt':'#8a8f96', 'a_d_convsion':'#2f7fc1', 'process_data':'#1f9a6a', 'hysterisis':'#7a5cc2', 'process_xlr1':'#c2763a', 'process_xlr2':'#b5543a',
  'pulse_generator':'#c2a23a', 'period_generator':'#9aa63a', 'generate_tone':'#d24b7a', 'xlr_check_timer':'#3aa6a6', 'goto main':'#6b6f75' };
function stepAt(t){
  const E = emulate(), i = idxAt(t); if (i<0) return null;
  const tc = t/TCY; if (tc >= E.cy[i]+E.ln[i]) return { i, between:true };
  const tr = traceOf(i); if (!tr) return { i };
  let c = E.cy[i]; for (let k=0;k<tr.T.length;k++){ const s = tr.T[k]; if (tc < c + s[2]) return { i, k, seg:s, tr, c0:c }; c += s[2]; }
  return { i, tr };
}
function cols(X,t0,t1){ return Math.max(40, Math.min(900, Math.floor(X(t1)-X(t0)))); }
function lanes(){
  const css = n=>SIM.css(n), E = emulate(), ls = [];
  const font = '11px '+css('--mono');
  const note = (c,X,t0,y,h,txt)=>{ c.fillStyle=css('--ink'); c.font=font; c.fillText(txt, X(t0)+6, y+h/2+4); };
  [0,1].forEach(ch=> ls.push({ label:`INPUT ${ch+1} audio (XLR${ch+1})`, h:34, draw(c,X,t0,t1,y,h){
    const span=t1-t0, N=cols(X,t0,t1); c.strokeStyle=css(ch?'--accent2':'--accent'); c.fillStyle=c.strokeStyle;
    if (span < 0.03){ c.beginPath(); let mx=0.001; for(let i=0;i<=N;i++){ const tt=t0+span*i/N; mx=Math.max(mx, vrmsIn(setAt(tt).ch[ch],ch,tt)*1.4143); }
      for(let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=inputWave(setAt(tt),ch,tt)/mx; const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); return; }
    c.globalAlpha=.6; for(let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N, S=setAt(tt); const v=vrmsIn(S.ch[ch],ch,tt); if (v<=0) continue; const db=20*Math.log10(v/0.775); const a=Math.max(0.04,(db+70)/94);
      c.fillRect(X(t0+span*i/N), y+h/2-a*(h/2-2), Math.max(1,(X(t1)-X(t0))/N+0.3), 2*a*(h/2-2)); } c.globalAlpha=1;
  }}));
  [0,1].forEach(ch=> ls.push({ label:`RA${ch}: detector ${ch+1} as the ADC samples it`, h:40, draw(c,X,t0,t1,y,h){
    const N=cols(X,t0,t1), span=t1-t0, sc = v=> y+h-3-(v/5.3)*(h-6);
    const thrV = FW[D.fw].thr*VREF/256; c.strokeStyle=css('--bad'); c.setLineDash([5,4]); c.beginPath(); c.moveTo(X(t0),sc(thrV)); c.lineTo(X(t1),sc(thrV)); c.stroke(); c.setLineDash([]);
    c.strokeStyle=css(ch?'--accent2':'--accent'); c.lineWidth=1.4; c.beginPath(); let first=true;
    for(let i=0;i<=N;i++){ const tt=t0+span*i/N; const s=lastSample(tt,ch); if(!s||!outAt(tt).on){ first=true; continue; } const yy=sc(s.v); if(first){ c.moveTo(X(tt),yy); first=false; } else c.lineTo(X(tt),yy); } c.stroke(); c.lineWidth=1;
    c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(`SILENT_THRESHOLD ${FW[D.fw].thr} = ${thrV.toFixed(3)} V`, X(t1)-190, sc(thrV)-3);
  }}));
  ls.push({ label:'ADC round robin: GO on RA2 → RA0 → RA1', h:24, draw(c,X,t0,t1,y,h){
    const i0=Math.max(0,idxAt(t0)), i1=idxAt(t1); if (i1<0) return; let n=0; for(let i=i0;i<=i1;i++) if((E.op[i]&3)===1) n++;
    if (n > 500){ note(c,X,t0,y,h,`${n.toLocaleString()} conversions in view (one every 2 passes; each channel every 6 passes ≈ ${(6*E.avgPass*1e6).toFixed(0)} µs)`); return; }
    const colr=[css('--accent'),css('--accent2'),css('--warn')]; c.font='10px '+css('--mono');
    for(let i=i0;i<=i1;i++){ if((E.op[i]&3)!==1) continue; const ch=(E.op[i]>>2)&3, a=X(E.cy[i]*TCY); c.fillStyle=colr[ch]; c.fillRect(a, y+4, Math.max(2, X((E.cy[i]+5)*TCY)-a), h-8);
      if (n<40){ c.fillStyle=css('--ink'); c.fillText(['RA0','RA1','RA2'][ch]+' '+E.ad[i], a+4, y+h/2+4); } }
  }});
  ls.push({ label:'PIC16F73 main loop (passes)', h:34, draw(c,X,t0,t1,y,h){
    const i0=Math.max(0,idxAt(t0)), i1=idxAt(t1); if (i1<0){ note(c,X,t0,y,h,'not running (off or in reset)'); return; }
    const cnt=i1-i0+1, pxPass=(X(t0+E.avgPass)-X(t0));
    if (cnt > 3000){ note(c,X,t0,y,h,`${cnt.toLocaleString()} passes in view · average ${(E.avgPass*1e6).toFixed(1)} µs = ${(E.avgPass/TCY).toFixed(1)} Tcy @ 4.9152 MHz`); return; }
    if (pxPass > 50 && cnt <= 40){ const trs = traceRange(i0, i1);
      for (let i=i0;i<=i1;i++){ const tr=trs[i]; let cc=E.cy[i]; if(!tr) continue; tr.T.forEach(s=>{ const a=X(cc*TCY), b=X((cc+s[2])*TCY); c.fillStyle=RCOL[s[0]]||'#888'; c.fillRect(a,y+3,Math.max(1,b-a-0.5),h-6);
          if (b-a > 46){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(s[0].replace('process_','p_').slice(0,Math.floor((b-a)/6.2)), a+3, y+h/2+3); } cc+=s[2]; }); }
      return; }
    for (let i=i0;i<=i1;i++){ const a=X(E.cy[i]*TCY), b=X((E.cy[i]+E.ln[i])*TCY); c.fillStyle = (E.op[i]&3)===2 ? css('--accent2') : css('--accent'); c.globalAlpha = i%2? .55:.85; c.fillRect(a,y+3,Math.max(1,b-a-0.4),h-6); }
    c.globalAlpha=1; if (pxPass>28) { c.fillStyle='#fff'; c.font='10px '+css('--mono'); for (let i=i0;i<=i1;i++){ const a=X(E.cy[i]*TCY); c.fillText(E.ln[i]+'', a+3, y+h/2+3); } }
  }});
  if (FW[D.fw].timer) ls.push({ label:'xlr1/xlr2_alarm_data vs alarm_threshold', h:44, draw(c,X,t0,t1,y,h){
    const N=cols(X,t0,t1), span=t1-t0; let mx=8; for(let i=0;i<=N;i++){ const o=outAt(t0+span*i/N); mx=Math.max(mx,o.at+4,o.a1,o.a2); }
    const sc=v=>y+h-3-(v/mx)*(h-6);
    [['at','--bad'],['a1','--accent'],['a2','--accent2']].forEach(([k,col])=>{ c.strokeStyle=css(col); if(k==='at') c.setLineDash([4,3]); c.beginPath(); for(let i=0;i<=N;i++){ const tt=t0+span*i/N, o=outAt(tt); const yy=sc(o[k]); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.setLineDash([]); });
    const i0=Math.max(0,idxAt(t0)), i1=idxAt(t1); let ticks=0; for(let i=i0;i<=i1&&i>=0;i++) if(E.op[i]&16){ ticks++; if (ticks<200){ c.fillStyle=css('--warn'); c.fillRect(X(E.cy[i]*TCY),y,1.5,6); } }
    c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(`ticks (orange, every 2048 passes): ${ticks}`, X(t0)+4, y+10);
  }});
  ls.push({ label:'LEDs: PRESENCE 1 · ALARM 1 · PRESENCE 2 · ALARM 2', h:38, draw(c,X,t0,t1,y,h){
    const N=cols(X,t0,t1), span=t1-t0, rows=[[2,'#3fbf5f'],[1,'#e3453a'],[8,'#3fbf5f'],[4,'#e3453a']], w=(X(t1)-X(t0))/N+0.5;
    for(let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N, o=outAt(tt); rows.forEach(([b,col],r)=>{ if(o.pb&b){ c.fillStyle=col; c.fillRect(X(t0+span*i/N), y+2+r*9, w, 7); } }); }
  }});
  ls.push({ label:'RB4 tone pin · beep gate (tone_interrupt,3)', h:30, draw(c,X,t0,t1,y,h){
    const span=t1-t0, N=cols(X,t0,t1), pxPass=X(t0+E.avgPass)-X(t0);
    if (pxPass < 0.8){ c.fillStyle=css('--warn'); for(let i=0;i<N;i++){ const o=outAt(t0+span*(i+.5)/N); if(o.ti&8) c.fillRect(X(t0+span*i/N), y+6, (X(t1)-X(t0))/N+0.5, h-12); } note(c,X,t0,y,h,'beep gate (≈2.9 kHz square inside each bar — zoom in)'); return; }
    c.strokeStyle=css('--warn'); c.beginPath(); const i0=Math.max(0,idxAt(t0)), i1=idxAt(t1); let lv=null;
    for(let i=i0;i<=i1&&i>=0;i++){ const v=(E.pb[i]&16)?1:0, xa=X((E.cy[i]+E.ln[i])*TCY), yy=y+h-5-v*(h-10); if(lv===null) c.moveTo(Math.max(X(t0),X(E.cy[i]*TCY)),yy); else c.lineTo(xa,y+h-5-lv*(h-10)); c.lineTo(xa,yy); lv=v; } c.stroke();
  }});
  ls.push({ label:'Speaker (after ALARM button SW1)', h:22, draw(c,X,t0,t1,y,h){
    const span=t1-t0, N=cols(X,t0,t1); c.fillStyle=css('--bad');
    for(let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N, o=outAt(tt); if((o.ti&8) && !setAt(tt).mute) c.fillRect(X(t0+span*i/N), y+5, (X(t1)-X(t0))/N+0.5, h-10); }
  }});
  ls.push({ label:'Relays (contacts): REL1 · REL2 · REL3 (1+2)', h:30, draw(c,X,t0,t1,y,h){
    const N=cols(X,t0,t1), span=t1-t0, w=(X(t1)-X(t0))/N+0.5;
    for(let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; [0x04,0x02,0x01].forEach((b,r)=>{ if(relayAt(tt,b)){ c.fillStyle=css('--bad'); c.fillRect(X(t0+span*i/N), y+2+r*9, w, 7); } }); }
  }});
  ls.push({ label:'Power / reset', h:20, draw(c,X,t0,t1,y,h){
    const N=cols(X,t0,t1), span=t1-t0, w=(X(t1)-X(t0))/N+0.5;
    for(let i=0;i<N;i++){ const o=outAt(t0+span*(i+.5)/N); c.fillStyle = !o.on? css('--grid') : o.boot? css('--warn') : css('--accent'); c.globalAlpha=.6; c.fillRect(X(t0+span*i/N), y+4, w, h-8); } c.globalAlpha=1;
  }});
  return ls;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function stateHTML(t){
  const o = outAt(t), S = setAt(t), st = stepAt(t), E = emulate();
  const s0 = lastSample(t,0), s1 = lastSample(t,1), fw = FW[D.fw];
  const rel = [relayAt(t,4),relayAt(t,2),relayAt(t,1)];
  const cnt = (a)=> fw.timer? `${a} / alarm_threshold ${o.at}` : 'n/a (no delay in pod25v2)';
  return `<table class="kv">
    <tr><th>Unit</th><td class="mono">${!o.on?'OFF':o.boot?'in reset (PWRT/OST)':'running '+fw.short}</td></tr>
    <tr><th>Main-loop pass</th><td class="mono">${st? '#'+st.i.toLocaleString()+(st.seg? ` · ${st.seg[0]} — ${st.seg[1]}`:'') : '—'}</td></tr>
    <tr><th>RA0 / RA1 last sample</th><td class="mono">${s0? s0.v.toFixed(3)+' V = '+s0.code : '—'} / ${s1? s1.v.toFixed(3)+' V = '+s1.code : '—'}</td></tr>
    <tr><th>xlr1_0 / xlr2_0 (after hysterisis)</th><td class="mono">${o.x1} / ${o.x2} · silent below ${fw.thr}</td></tr>
    <tr><th>signal</th><td class="mono">${bin8(o.sg)} → detector 1 ${o.sg&1?'GOOD':'ALARM'}, detector 2 ${o.sg&2?'GOOD':'ALARM'}</td></tr>
    <tr><th>xlr1_alarm_data</th><td class="mono">${cnt(o.a1)}</td></tr><tr><th>xlr2_alarm_data</th><td class="mono">${cnt(o.a2)}</td></tr>
    <tr><th>tone_interrupt</th><td class="mono">${bin8(o.ti)} (bit1 alarm, bit3 beep gate, bit2 RB4 phase, bit0 edge due)</td></tr>
    <tr><th>PORTB / PORTC</th><td class="mono">${bin8(o.pb)} / ${bin8(o.pc)}</td></tr>
    <tr><th>GPI relays</th><td class="mono">REL1 ${rel[0]?'ALARM':'idle'} · REL2 ${rel[1]?'ALARM':'idle'} · REL3 ${rel[2]?'ALARM':'idle'}</td></tr>
    <tr><th>Settings</th><td class="mono small">IN1 ${S.ch[0].plug?MODES[S.ch[0].mode]+' '+S.ch[0].lvl+' dBu':'unplugged'} · IN2 ${S.ch[1].plug?MODES[S.ch[1].mode]+' '+S.ch[1].lvl+' dBu':'unplugged'}<br>THR ${thrDbu(S.ch[0].thr).toFixed(1)} / ${thrDbu(S.ch[1].thr).toFixed(1)} dBu · delay ADRES ${delayCode(S)} · speaker ${S.mute?'muted':'on'}</td></tr>
  </table>`;
}
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Pull a cable, turn a trimmer or press ALARM. Each step the hardware and firmware take is listed here.</div>'; }
function viewSim(m){
  window.__pod25Active = true;
  m.innerHTML = `
  <div class="grid2">
    <div>${card('Front panel at the playhead', `<div id="fp"></div>`)}
      ${card('Rear panel — click an XLR to pull or plug the cable; the IEC inlet switches power', `<div id="rp"></div>`)}
      ${card('Bench: sources, trimmers, firmware', `<div id="bench"></div>`)}</div>
    <div>${card('What the hardware and software did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
      ${card('Scenario events', `<div id="evs" class="log"></div>`)}</div>
  </div>
  ${card('Timeline — one minute of the unit, zoomable down to single instructions (click to seek)', `<canvas id="tl"></canvas>
    <p class="small muted">Everything below the audio lanes comes from running the firmware's own logic pass by pass, with each branch's instruction cycles counted from the source (4.9152 MHz crystal, 813.8 ns per cycle). The detector voltage is an RC model of C44/C45 ${inf}. Port changes are drawn at the end of the pass that wrote them.</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    const b = m.querySelector('#bench'); if (!b.contains(document.activeElement)) { b.innerHTML = benchHTML(); bindBench(b); }
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = stateHTML(t);
    m.querySelector('#evs').innerHTML = eventsHTML(); bindEvents(m.querySelector('#evs'));
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230});
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const al = (t,ch)=>{ const o=outAt(t); return o.on && !o.boot && !!(o.pb & (ch?4:1)); };
const pr = (t,ch)=>{ const o=outAt(t); return o.on && !o.boot && !!(o.pb & (ch?8:2)); };
const LESSONS = [
  { title:'Meet the POD25', body:`<p>The POD25 watches two analog audio feeds and raises an alarm when either goes quiet, for example a dead studio line or a stalled playout. The manual calls it a “two channel (stereo) analog audio silence detector”.</p>
     <p>Front panel, left to right: power rocker and LED, a speaker grille, the <b>ALARM</b> push-button (in = audible alarm OFF), the <b>ALARM DELAY</b> trimmer (1–45 s), and for each detector a green <b>PRESENCE</b> LED, a red <b>ALARM</b> LED and a <b>THRESHOLD</b> trimmer (−20 to −50 dBu).</p>
     <p>Rear: two XLR inputs and three GPI relay outputs (detector 1, detector 2, and 1+2 “either”), each with two sets of NO / NC / COM screw terminals.</p>
     <p class="muted">This tutorial starts from an empty scenario: both inputs carry signal for the whole minute.</p>`, check:()=>true, auto:true, start:()=>{ A.blank(); SIM.seek(0.5); } },
  { title:'1 · Power and presence', body:`<p>The unit is on. After the reset delay, <span class="mono">init</span> sets both <span class="mono">signal</span> bits to “good”, so the two green PRESENCE LEDs light at once.</p><p><b>Goal:</b> both PRESENCE LEDs lit at the playhead.</p>`, check:t=>pr(t,0)&&pr(t,1), hint:'Move the playhead past 0.1 s, or press O to switch the power on.' },
  { title:'2 · Set the delay', body:`<p>The ALARM DELAY trimmer sets how long a channel must stay quiet before the alarm. The PIC reads it on RA2, looks it up in <span class="mono">linear_table</span> and counts that many “ticks” of 2048 main-loop passes.</p><p><b>Goal:</b> set about <b>10 s</b> (8–12 s). Turn the trimmer with the mouse wheel or the D/F keys and watch the estimate under the bench.</p>`, check:t=>{ const d=delayEst(setAt(t)); return d.hi>=8 && d.hi<=12; }, hint:'Press F a few times (each step ≈ 5 ADC counts ≈ 0.9 s).' },
  { title:'3 · Set detector 1 threshold', body:`<p>The THRESHOLD trimmers are analog: they set the gain ahead of the rectifier. The PIC always compares with the same number (<span class="mono">SILENT_THRESHOLD</span>). Turning clockwise makes the detector more sensitive (−50 dBu).</p><p><b>Goal:</b> set DETECTOR 1 to <b>−40 dBu</b> (±1 dB).</p>`, check:t=>Math.abs(thrDbu(setAt(t).ch[0].thr)+40)<=1, hint:'Use W (clockwise) or Q, or the slider on the bench.' },
  { title:'4 · Lose the signal', body:`<p>Pull the cable out of <b>INPUT 1</b> on the rear panel. The detector capacitor drains in a few tens of ms, then <span class="mono">process_XLR1_data</span> counts ticks. PRESENCE 1 stays green while it counts. When the count passes <span class="mono">alarm_threshold</span>, PRESENCE 1 goes out, ALARM 1 lights, REL1 and REL3 pull in and the speaker beeps.</p><p><b>Goal:</b> ALARM 1 lit at the playhead. Press <b>Play</b> or drag the time slider forward past the delay.</p>`, check:t=>al(t,0)&&!setAt(t).ch[0].plug, hint:'Click the INPUT 1 XLR (right-hand one) on the rear panel, then move the playhead about 10 s later.' },
  { title:'5 · Silence the buzzer', body:`<p>Press the <b>ALARM</b> button in (OFF). It is a latching switch in the speaker wire, not an input to the PIC: the firmware keeps beeping, but you no longer hear it. The LEDs and relays don't change.</p><p><b>Goal:</b> ALARM 1 still lit, speaker muted.</p>`, check:t=>al(t,0)&&setAt(t).mute, hint:'Click the round ALARM button or press A.' },
  { title:'6 · Read the GPI outputs', body:`<p>Look at the rear terminals. In alarm, REL1 (OUTPUT 1) and REL3 (OUTPUT 1+2) are energised: NO–COM closed, NC–COM open. A master-control system wired to the NO contacts sees a closure.</p><p class="muted">If the POD25 loses power, every relay drops and the NC contacts close: the same state as “all is well”.</p><p><b>Goal:</b> REL1 and REL3 energised at the playhead.</p>`, check:t=>relayAt(t,4)&&relayAt(t,1), hint:'Stay in the alarm from step 4.' },
  { title:'7 · Restore the signal', body:`<p>Plug INPUT 1 back in. Recovery has no delay: on the first reading above the threshold, <span class="mono">xlr1_signal_good</span> sets the signal bit and clears the counter. If INPUT 2 is fine, REL3 drops and the tone stops.</p><p>Release the ALARM button too, so the next alarm is heard.</p><p><b>Goal:</b> PRESENCE 1 lit and the ALARM button out.</p>`, check:t=>pr(t,0)&&!setAt(t).mute&&setAt(t).ch[0].plug, hint:'Click the INPUT 1 XLR again (and press A to release ALARM). Move the playhead a few ms on.' },
  { title:'8 · Too quiet is silence', body:`<p>A signal doesn't need to be absent, only below the threshold. Turn INPUT 2's source level down to <b>−45 dBu</b> while DETECTOR 2 is set to −35 dBu (the factory middle). After the delay, ALARM 2 lights even though the cable is in.</p><p><b>Goal:</b> ALARM 2 lit with INPUT 2 plugged in.</p>`, check:t=>al(t,1)&&setAt(t).ch[1].plug, hint:'Set the INPUT 2 level slider to −45 dBu, then play forward past the delay.' },
  { title:'9 · Pauses in programme', body:`<p>Real programme has pauses. Set INPUT 1 to <b>programme</b> and turn ALARM DELAY fully counter-clockwise (“1 SEC”). In the firmware the minimum is <span class="mono">alarm_threshold = 0</span>: the first quiet reading alarms, so every short gap flickers ALARM 1. That is why the delay exists.</p><p><b>Goal:</b> ALARM 1 lit while INPUT 1 plays programme with the delay at minimum.</p>`, check:t=>{ const S=setAt(t); return al(t,0)&&S.ch[0].plug&&S.ch[0].mode==='program'&&delayCode(S)<8; }, hint:'Pick “programme” for INPUT 1, press D until the delay reads ADRES 0, then play and watch the gaps.' },
  { title:'Done', body:`<p>You've used every control on the POD25. The other tabs show the same events from the inside: <b>Software</b> follows the PIC through each main-loop pass, <b>One second</b> counts what happens per second, and <b>Findings</b> lists the less obvious behaviour (the “1 kHz” tone isn't, the minimum delay isn't 1 s, and the relays fail to the “OK” state).</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod25Active = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD25 (after POD25MANU.doc)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}
      <div class="card" id="lesson"></div>${card('What the hardware and software did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div>`)}${card('Bench', `<div id="bench"></div>`)}</div></div>`;
  const hot = `<g><rect x="1030" y="120" width="480" height="130" fill="transparent"><title>DETECTOR 1 and 2: green PRESENCE, red ALARM, THRESHOLD trim</title></rect></g>`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t,{hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    const b = m.querySelector('#bench'); if (!b.contains(document.activeElement)) { b.innerHTML = benchHTML(); bindBench(b); }
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check(t);
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ lessonIdx=0; LESSONS[0].start(); };
  };
  if (lessonIdx===0 && !D.tutStarted){ D.tutStarted = true; D.init=DEF_INIT(); D.events=[]; EMU_KEY=''; SIM.seek(0.5); }
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function secondStats(s){
  const E = emulate(); const i0 = Math.max(0, idxAt(s)), i1 = idxAt(Math.min(DUR, s+1)-1e-9);
  const r = { passes:0, cyc:0, conv:[0,0,0], ticks:0, rb4:0, gate:0, inc:0, hyst:0, minP:999, maxP:0 };
  if (i1<0) return r;
  for (let i=i0;i<=i1;i++){ if (E.cy[i]*TCY < s) continue; r.passes++; r.cyc+=E.ln[i]; r.minP=Math.min(r.minP,E.ln[i]); r.maxP=Math.max(r.maxP,E.ln[i]);
    if ((E.op[i]&3)===1) r.conv[(E.op[i]>>2)&3]++; if (E.op[i]&16) r.ticks++; if (E.op[i]&96) r.inc++; if (E.op[i]&128) r.hyst++;
    if (i>0){ if ((E.pb[i]^E.pb[i-1])&16) r.rb4++; if ((E.ti[i]^E.ti[i-1])&8) r.gate++; } }
  return r;
}
function viewAnatomy(m){
  window.__pod25Active = false;
  m.innerHTML = `${card('One second, broken down (the second that holds the playhead)', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device — the pass at the playhead', `<div id="dev"></div>`)}
    ${card('As seen by the operator', `<div id="fp"></div><div id="opv" class="small" style="margin-top:6px"></div>`)}</div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas><p class="small muted">Each row zooms into the shaded part of the row above. Use the transport's Step to move one instruction cycle, one pass, one ADC round or one timer tick.</p>`)}`;
  const draw = ()=>{
    const t = SIM.t, s = Math.min(DUR-1, Math.floor(t)), E = emulate(), st = secondStats(s), fw = FW[D.fw];
    const avg = st.passes? st.cyc/st.passes*TCY : E.avgPass;
    const rows = [
      ['Instruction cycles (Fosc/4)', (FOSC/4).toLocaleString(), SIM.fmtDur(TCY), 'X1 4.9152 MHz crystal; every instruction 1 cycle, branches 2'],
      ['Main-loop passes', st.passes.toLocaleString(), SIM.fmtDur(avg), `${st.minP}–${st.maxP} cycles each (branch dependent); no interrupts (ISR at 0x004 is just RETFIE)`],
      ['ADC conversions', (st.conv[0]+st.conv[1]+st.conv[2]).toLocaleString(), SIM.fmtDur(2*avg), 'start_ad on one pass, read on the next; Fosc/2 clock, 9.5 TAD ≈ 3.9 µs'],
      ['… RA0 detector 1 / RA1 detector 2 / RA2 delay', st.conv.map(v=>v.toLocaleString()).join(' / '), SIM.fmtDur(6*avg), 'round robin RA2 → RA0 → RA1 (a_d_flag bits 2, 0, 1)'],
      ['hysterisis updates of xlr1_0 / xlr2_0', st.hyst.toLocaleString(), '', '±1 LSB dead band; locks after 256 quiet samples (l_counter1)'],
      ['xlr_check_timer TICKs', fw.timer? st.ticks.toLocaleString() : 'n/a', fw.timer? SIM.fmtDur(2048*avg):'', 'timer1 × timer2 = 256 × 8 passes; sets xlr_timer bits 0 and 1'],
      ['Silence-counter increments', fw.timer? st.inc.toLocaleString() : 'n/a', '', 'incf xlr1/2_alarm_data on a tick while that input is quiet'],
      ['RB4 tone edges', st.rb4.toLocaleString(), SIM.fmtDur(2*avg), `toggled every TONE_CONSTANT = 2 passes → ≈ ${(1/(4*avg)).toFixed(0)} Hz (the net is called 1KHZ_TONE)`],
      ['Beep gate toggles', st.gate.toLocaleString(), SIM.fmtDur(1280*avg), `pulse1 × pulse_constant = 256 × 5 passes → ≈ ${(1/(2*1280*avg)).toFixed(1)} beeps/s`],
      ['Input tone cycles', '1,000', '1 ms', 'the 1 kHz test tone; the rectifier + C44/C45 average it to a DC level'],
      ['Detector settling', '', '10 ms / 30 ms', 'R12/R16 10K × 1µF charge; + R9/R21 20K discharge ' + inf],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>in second ${s}</th><th>period</th><th>who does it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const sa = stepAt(t);
    let dev = '<p class="muted">Not running here (off or in reset).</p>';
    if (sa && sa.tr){ let cc=E.cy[sa.i]; dev = `<div class="small mono">pass #${sa.i.toLocaleString()} · starts ${SIM.fmtT(E.cy[sa.i]*TCY)} · ${E.ln[sa.i]} cycles = ${SIM.fmtDur(E.ln[sa.i]*TCY)}</div><table class="kv small">${sa.tr.T.map((s2,k)=>{ const row=`<tr class="${k===sa.k?'hl':''}"><td class="mono">${(cc-E.cy[sa.i]).toString().padStart(3,' ')}</td><td class="mono" style="color:${RCOL[s2[0]]}">${s2[0]}</td><td class="mono">${s2[2]}</td><td>${s2[1]}</td></tr>`; cc+=s2[2]; return row; }).join('')}</table>`; }
    m.querySelector('#dev').innerHTML = dev;
    m.querySelector('#fp').innerHTML = frontSVG(t,{max:620}); bindPanel(m.querySelector('#fp'));
    const o = outAt(t);
    m.querySelector('#opv').innerHTML = !o.on? 'Unit off.' : o.boot? 'Power-on reset: every LED dark for about 72 ms.' :
      `The LEDs are plain port pins, so they change at the end of a pass, within about ${Math.round(E.avgPass*1e6)} µs of the decision. A quiet input keeps its green LED during the whole count; only the unwired RB${o.pb&0xC0?'6/RB7 pins move':'6/RB7 pins would show it'}. Beeping ${o.ti&8?'(gate open now)':''} is ${setAt(t).mute?'silenced by the ALARM button':'audible'}${o.ti&2?'':' — no alarm'}.`;
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const E = emulate(), avg = E.avgPass;
  const levels = [['1 minute',60],['1 second',1],['one beep on + off',2560*avg],['10 ms',0.01],['4 tone cycles',16*avg],['1 ADC round (6 passes)',6*avg],['1 main-loop pass',avg]];
  const H = levels.length*46+10; const {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid'), warn=SIM.css('--warn'), bad=SIM.css('--bad');
  levels.forEach(([nm,span],li)=>{
    const y=8+li*46, t0=Math.max(0, Math.min(DUR-span, t-span/2)), x0=180, pw=w-x0-10, X=tt=>x0+(tt-t0)/span*pw;
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm, 6, y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(SIM.fmtDur(span), 6, y+28);
    c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,32);
    if (span >= 0.2){ // detector 1 voltage + ALARM 1 shading
      const N=Math.min(500,pw); for(let k=0;k<N;k++){ const tt=t0+span*(k+.5)/N; if (outAt(tt).pb&1){ c.fillStyle=bad; c.globalAlpha=.18; c.fillRect(x0+pw*k/N,y+2,pw/N+0.5,32); c.globalAlpha=1; } }
      c.strokeStyle=acc; c.beginPath(); let f=true; for(let k=0;k<=N;k++){ const tt=t0+span*k/N, s=lastSample(tt,0); if(!s){f=true;continue;} const yy=y+33-s.v/5.3*30; if(f){c.moveTo(X(tt),yy);f=false;} else c.lineTo(X(tt),yy); } c.stroke();
    } else if (span >= 8*avg){ // RB4
      c.strokeStyle=warn; c.beginPath(); const i0=Math.max(0,idxAt(t0)), i1=idxAt(t0+span); let first=true; for(let i=i0;i<=i1&&i>=0;i++){ const xa=X((E.cy[i]+E.ln[i])*TCY), yy=y+30-((E.pb[i]&16)?24:0); if(first){c.moveTo(x0,yy);first=false;} c.lineTo(xa,c.__ly===undefined?yy:c.__ly); c.lineTo(xa,yy); c.__ly=yy; } c.__ly=undefined; c.stroke();
      c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('RB4 (tone pin)', x0+4, y+12);
    } else { // passes and routine segments
      const i0=Math.max(0,idxAt(t0)), i1=idxAt(t0+span); const trs = (i1-i0<=8)? traceRange(i0,i1) : {};
      for(let i=i0;i<=i1&&i>=0;i++){ const tr=trs[i]; if(tr){ let cc=E.cy[i]; tr.T.forEach(s=>{ const a=X(cc*TCY), b=X((cc+s[2])*TCY); c.fillStyle=RCOL[s[0]]; c.fillRect(Math.max(x0,a),y+4,Math.max(1,Math.min(x0+pw,b)-Math.max(x0,a)-0.5),28); if(b-a>60&&a>=x0){ c.fillStyle='#fff'; c.font='10px monospace'; c.fillText(s[0].slice(0,Math.floor((b-a)/6.5)),a+2,y+21); } cc+=s[2]; }); }
        else { const a=X(E.cy[i]*TCY), b=X((E.cy[i]+E.ln[i])*TCY); c.fillStyle=(E.op[i]&3)===1?SIM.css('--accent2'):acc; c.globalAlpha=.7; c.fillRect(Math.max(x0,a),y+4,Math.max(1,b-a-1),28); c.globalAlpha=1; } }
    }
    const px=X(t); c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+36); c.stroke();
    if (li<levels.length-1){ const ns=levels[li+1][1]; const a=X(Math.max(0,Math.min(DUR-ns,t-ns/2))); c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,ns/span*pw),32); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  in1:{x:10,y:30,w:120,h:70,t:'INPUT 1',s:['XLR1 NC3FD-H','balanced'],d:'Rear XLR3(F). Pins 2/3 through R1/R2 4K7 and C1/C2 33µF/10V into virtual-earth stages: about 9.4 kΩ differential, not the 40 kΩ in the manual. Max input +24 dBu.'},
  in2:{x:10,y:290,w:120,h:70,t:'INPUT 2',s:['XLR2 NC3FD-H','balanced'],d:'Same as INPUT 1 with R15/R4, C9/C4, U3.'},
  df1:{x:150,y:30,w:140,h:70,t:'U1 OPA2064',s:['balanced → single','gain 42.6 (32.6 dB)'],d:'U1A inverts the hot leg (R3/R1 = 1). U1B sums it with the cold leg: R6 200K0 / 4K7 = 42.55. C3/C5 22p roll off RF. U1/U2/U3/U4 are OPA2064 in an NE5532 footprint.'},
  df2:{x:150,y:290,w:140,h:70,t:'U3 OPA2064',s:['balanced → single','gain 42.6'],d:'R11, R19, R18 200K0, C7/C6.'},
  th1:{x:310,y:30,w:120,h:70,t:'RV1 THRESHOLD',s:['front trim','−20 … −50 dBu'],d:'A level trim between U1B and the rectifier (bottom leg R7 110R to ground). The PIC never reads it: the threshold the operator sets is really a gain. Taper and pot value are not in the BOM (TOCOS 10-079) — the dBu scale here is '+inf+'.'},
  th2:{x:310,y:290,w:120,h:70,t:'RV2 THRESHOLD',s:['front trim'],d:'R8 110R bottom leg.'},
  rc1:{x:450,y:30,w:150,h:80,t:'U2 detector',s:['U2A rectifier ×20','R12 + C44 1µF','U2B buffer → RA0'],d:'U2A precision half-wave rectifier: R10 1K0 in, R9 20K0 feedback, D1/D2 1N4148. R12 10K0 into C44 1µF averages it (τ ≈ 10 ms). U2B follower, R13 10K0 to RA0 (pin 2). R14 is not fitted.'},
  rc2:{x:450,y:280,w:150,h:80,t:'U4 detector',s:['U4A ×20, C45','U4B → RA1'],d:'R20, R21, D3/D4, R16, C45, R22 → RA1 (pin 3). R17 not fitted.'},
  dly:{x:450,y:160,w:150,h:70,t:'RV3 ALARM DELAY',s:['dual gang','A → RA2 · B → RA3'],d:'RV3 has two sections in the schematic (RV3:A, RV3:B) between +5V and ground. Wiper A goes to RA2 and is read as rv3. Wiper B goes to RA3 (pin 5), which the firmware never converts.'},
  pic:{x:630,y:110,w:160,h:180,t:'PIC16F73 (U5)',s:['4.9152 MHz (X1)','8-bit ADC, VDD ref','MPASM V1.01','no interrupts','RB0–3 LEDs, RB4 tone','RC0–2 relays'],d:'One polling loop (main) of about 108 cycles: ADC round robin, hysterisis, silence counters, LED/relay ports and a software tone generator. alarm delay = linear_table(rv3) ticks of 2048 passes. Config bits are not in the source.'},
  led:{x:820,y:20,w:150,h:70,t:'Front LEDs',s:['PRESENCE ×2 green','ALARM ×2 red'],d:'RB1/RB3 green, RB0/RB2 red, through R36–R39 330R (added by the Issue 2 ECO, 21–22 May 2003).'},
  ton:{x:820,y:110,w:150,h:80,t:'Tone + speaker',s:['RB4 → U6 NE5532','SW1 ALARM (mute)','R29 10R → speaker'],d:'R25 750R into U6A (follower), R26/R28 20K0 make U6B an inverter; its output goes through the latching ALARM button SW1 and R29 10R to TONE_OUTPUT (H4, not fitted: wired to the speaker).'},
  rel:{x:820,y:210,w:150,h:90,t:'GPI relays',s:['RC2 → Q1 → REL1','RC1 → Q2 → REL2','RC0 → Q3 → REL3 (1+2)'],d:'2N4401 drivers with 1K0 base resistors; RZ-12W-C DPDT relays from +VA through 100R. Both poles of each relay go via H5/H6/H7 to the rear terminal board (TB1–TB6): NO / NC / COM twice per output.'},
  psu:{x:150,y:400,w:440,h:60,t:'Power',s:['IEC → PWRSW1 → T3 TE70042 → D5–D8 → C28/C55 2200µ → ±VA → 7805 → +5V'],d:'Links 1/2/3 select the T3 primary (115 V or 230 V). The op-amps and relays run from the unregulated ±VA; the PIC, RV3 and the ADC reference from REG1 7805.'},
};
const WIRES = [['in1','df1',''],['df1','th1',''],['th1','rc1',''],['rc1','pic','RA0'],['in2','df2',''],['df2','th2',''],['th2','rc2',''],['rc2','pic','RA1'],['dly','pic','RA2'],['pic','led','RB0–3'],['pic','ton','RB4'],['pic','rel','RC0–2'],['psu','pic','+5V']];
function viewBlock(m){
  window.__pod25Active = false; let sel='pic';
  m.innerHTML = `${card('Block diagram (click a block)', `<div id="bd"></div>`)}<div class="grid2"><div>${card('Block', `<div id="bdinfo"></div>`)}</div><div>
    ${card('Signal flow in one paragraph', `<p>Each balanced input is turned into a single-ended signal and amplified about 43 times. The THRESHOLD trim sets how much of it reaches a precision rectifier, which charges a 1 µF capacitor to a DC level that follows the programme loudness. The PIC samples that level about 1,800 times a second per channel. Below code ${FW[D.fw].thr} the channel counts as silent; if it stays silent for the ALARM DELAY, the PIC swaps the green LED for red, closes the relays and beeps.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2], o=outAt(SIM.t);
    let s=`<svg viewBox="0 0 990 480" style="width:100%"><defs><marker id="p25ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p25ar)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; const live = k==='led'? `${o.pb&1?'AL1 ':''}${o.pb&4?'AL2':''}` : k==='rel'? `${o.pc&7?'energised: '+bin8(o.pc).slice(5):''}` : '';
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}
        ${live?`<text x="${b.x+b.w-6}" y="${b.y+18}" text-anchor="end" font-size="10" fill="var(--bad)">${live}</text>`:''}</g>`; }
    m.querySelector('#bd').innerHTML = s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn from POD25iss2.net / .bom) ---------------- */
const K = 'var(--ink)', NETC = 'var(--accent2)';
const sw = pts => `<polyline points="${pts}" fill="none" stroke="${K}" stroke-width="1.3"/>`;
const tx = (x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||10.5}" ${o&&o.a?`text-anchor="${o.a}"`:''} fill="${(o&&o.c)||K}">${s}</text>`;
function Rh(x,y,ref,val){ return sw(`${x},${y} ${x+8},${y}`)+`<rect x="${x+8}" y="${y-5}" width="24" height="10" fill="none" stroke="${K}" stroke-width="1.3"/>`+sw(`${x+32},${y} ${x+40},${y}`)+tx(x+20,y-8,ref,{a:'middle',fs:9.5})+tx(x+20,y+16,val,{a:'middle',fs:9,c:'var(--ink2)'}); }
function Rv(x,y,ref,val){ return sw(`${x},${y} ${x},${y+8}`)+`<rect x="${x-5}" y="${y+8}" width="10" height="24" fill="none" stroke="${K}" stroke-width="1.3"/>`+sw(`${x},${y+32} ${x},${y+40}`)+tx(x+8,y+18,ref,{fs:9.5})+tx(x+8,y+29,val,{fs:9,c:'var(--ink2)'}); }
function Ch(x,y,ref,val){ return sw(`${x},${y} ${x+8},${y}`)+sw(`${x+8},${y-7} ${x+8},${y+7}`)+sw(`${x+12},${y-7} ${x+12},${y+7}`)+sw(`${x+12},${y} ${x+20},${y}`)+tx(x+10,y-10,ref,{a:'middle',fs:9.5})+tx(x+10,y+18,val,{a:'middle',fs:9,c:'var(--ink2)'}); }
function Cv(x,y,ref,val){ return sw(`${x},${y} ${x},${y+8}`)+sw(`${x-7},${y+8} ${x+7},${y+8}`)+sw(`${x-7},${y+12} ${x+7},${y+12}`)+sw(`${x},${y+12} ${x},${y+20}`)+tx(x+10,y+10,ref,{fs:9.5})+tx(x+10,y+20,val,{fs:9,c:'var(--ink2)'}); }
function OP(x,y,ref){ return `<polygon points="${x},${y-26} ${x},${y+26} ${x+52},${y}" fill="var(--panel2)" stroke="${K}" stroke-width="1.3"/>`+tx(x+4,y-9,'−',{fs:12})+tx(x+4,y+17,'+',{fs:12})+tx(x+14,y+4,ref,{fs:9.5}); }
function GND(x,y){ return sw(`${x},${y} ${x},${y+6}`)+sw(`${x-8},${y+6} ${x+8},${y+6}`)+sw(`${x-5},${y+9} ${x+5},${y+9}`)+sw(`${x-2},${y+12} ${x+2},${y+12}`); }
function DOT(x,y){ return `<circle cx="${x}" cy="${y}" r="2.6" fill="${K}"/>`; }
function DIh(x,y,ref,val){ return sw(`${x-6},${y} ${x+30},${y}`)+`<polygon points="${x+4},${y-7} ${x+4},${y+7} ${x+18},${y}" fill="var(--panel2)" stroke="${K}"/>`+sw(`${x+18},${y-7} ${x+18},${y+7}`)+tx(x+12,y-10,ref,{a:'middle',fs:9.5})+tx(x+12,y+18,val,{a:'middle',fs:9,c:'var(--ink2)'}); }
function NET(x,y,s,a){ return tx(x,y+4,s,{c:NETC,a:a||'start'}); }
function chipBox(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="${K}" stroke-width="1.4"/>${tx(x+w/2,y-14,name,{a:'middle',fs:13})}${sub?tx(x+w/2,y-2,sub,{a:'middle',fs:10,c:'var(--ink2)'}):''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; s+=sw(`${x-30},${yy} ${x},${yy}`)+tx(x+5,yy+4,p[0])+(p[1]?tx(x-34,yy+4,p[1],{a:'end',c:NETC}):''); });
  right.forEach((p,i)=>{ const yy=y+22+i*18; s+=sw(`${x+w},${yy} ${x+w+30},${yy}`)+tx(x+w-5,yy+4,p[0],{a:'end'})+(p[1]?tx(x+w+34,yy+4,p[1],{c:NETC}):''); });
  return s;
}
function sheetFrontEnd(){
  let s = '';
  s += `<rect x="20" y="80" width="56" height="180" fill="var(--panel2)" stroke="${K}"/>`+tx(48,74,'XLR1 NC3FD-H',{a:'middle',fs:11})+tx(30,114,'2')+tx(30,204,'3')+tx(30,244,'1');
  s += sw('76,110 100,110')+Rh(100,110,'R1','4K7')+Ch(140,110,'C1','33µ/10')+sw('160,110 230,110')+DOT(212,110);
  s += OP(230,122,'U1A')+sw('230,134 222,134 222,140')+GND(222,140);
  s += sw('212,110 212,62 230,62')+Rh(230,62,'R3','4K7')+sw('270,62 296,62 296,122')+sw('212,62 212,26 240,26')+Ch(240,26,'C3','22p')+sw('260,26 296,26 296,62')+DOT(296,62)+DOT(212,62)+DOT(296,122);
  s += sw('282,122 310,122')+Rh(310,122,'R5','4K7')+sw('350,122 382,122 382,200')+DOT(382,200);
  s += sw('76,200 100,200')+Rh(100,200,'R2','4K7')+Ch(140,200,'C2','33µ/10')+sw('160,200 430,200');
  s += sw('76,240 90,240 90,250')+GND(90,250);
  s += OP(430,212,'U1B')+sw('430,224 422,224 422,230')+GND(422,230);
  s += sw('406,200 406,160 420,160')+Rh(420,160,'R6','200K0')+sw('460,160 496,160 496,212')+DOT(406,200)+DOT(496,212);
  s += sw('406,160 406,124 430,124')+Ch(430,124,'C5','22p')+sw('450,124 496,124 496,160')+DOT(496,160)+DOT(406,160);
  s += sw('482,212 540,212 540,180 556,180')+NET(486,232,'NET00000');
  s += `<rect x="551" y="180" width="10" height="70" fill="none" stroke="${K}" stroke-width="1.3"/>`+sw('556,250 556,262')+Rv(556,262,'R7','110R')+GND(556,302)+tx(566,176,'RV1 THRESHOLD',{fs:10})+tx(566,190,'(TOCOS 10-079)',{fs:9,c:'var(--ink2)'});
  s += `<polygon points="561,222 571,216 571,228" fill="${K}"/>`+sw('571,222 588,222')+Rh(588,222,'R10','1K0')+sw('628,222 680,222')+DOT(650,222);
  s += OP(680,234,'U2A')+sw('680,246 672,246 672,252')+GND(672,252);
  s += sw('650,222 650,186 676,186')+DIh(676,186,'D1','1N4148')+sw('706,186 744,186 744,234')+DOT(744,234)+sw('732,234 750,234')+DIh(756,234,'D2','1N4148')+sw('786,234 800,234')+DOT(800,234);
  s += sw('800,234 800,156 760,156')+Rh(720,156,'R9','20K0')+sw('720,156 640,156 640,222')+DOT(640,222)+tx(690,268,'C10 22p ∥ D1 (out ↔ −)',{fs:9,c:'var(--ink2)'});
  s += sw('800,234 812,234')+Rh(812,234,'R12','10K0')+sw('852,234 900,234')+DOT(872,234)+sw('872,234 872,250')+Cv(872,250,'C44','1.0uF')+GND(872,270)+NET(812,262,'NET00042');
  s += OP(900,222,'U2B')+sw('952,222 962,222 962,192 892,192 892,210 900,210')+DOT(962,222);
  s += sw('962,222 972,222')+Rh(972,222,'R13','10K0')+sw('1012,222 1030,222')+NET(1034,222,'XLR1 → U5-2 RA0')+tx(1012,250,'R14 to GND: DNI',{fs:9,c:'var(--ink2)'});
  s += tx(30,330,'Channel 2 is identical: XLR2 → R15/R4 4K7, C9/C4 33µ → U3A (R11 4K7, C7 22p) → R19 → U3B (R18 200K0, C6 22p) → RV2 (R8 110R)',{fs:10.5})+tx(30,345,'→ R20 1K0 → U4A (R21 20K0, D3/D4) → R16 10K0, C45 1.0uF → U4B → R22 → net XLR2 → U5-3 RA1 (R17 DNI).',{fs:10.5});
  s += tx(30,362,'Gain hot/cold → U1B out = 200K/4K7 = 42.55; rectifier = 20K/1K = 20 → 851 at full THRESHOLD. With a sine, C44 settles at Vpk·851·k/π (half-wave mean).',{fs:10.5,c:'var(--ink2)'});
  s += tx(30,378,`V1.01 compares with 40/256 × 5 V = 0.781 V → a full-gain tone of ≈ −51.6 dBu; V1.00's 35 = 0.684 V → ≈ −52.7 dBu. The manual's sensitive end is −50 dBu.`,{fs:10.5,c:'var(--ink2)'});
  s += tx(30,394,'U1–U4 are OPA2064 placed on an NE5532N footprint (BOM ComponentName). Supplies ±VA (pins 8 / 4) and 0.1 µF decoupling C100–C109 are not drawn.',{fs:10.5,c:'var(--ink2)'});
  return s;
}
function sheetMCU(){
  return chipBox(400,60,190,'U5 PIC16F73/SOCKET',[
    ['1 MCLR','+5V'],['2 RA0/AN0','XLR1'],['3 RA1/AN1','XLR2'],['4 RA2/AN2','NET00060 ← RV3-2'],['5 RA3/AN3','NET00067 ← RV3-5'],['6 RA4','(n.c.)'],['7 RA5/AN4','(n.c.)'],['8 VSS','GNDD'],['9 OSC1','X1 4.9152 / C15 22p'],['10 OSC2','X1 / C14 22p'],['11 RC0','REL3'],['12 RC1','REL2'],['13 RC2','REL1'],['14 RC3','(n.c.)'],
  ],[
    ['28 RB7','(n.c.) — counting flag ch1'],['27 RB6','(n.c.) — counting flag ch2'],['26 RB5','(n.c.)'],['25 RB4','1KHZ_TONE → R25'],['24 RB3','SIGNAL2 → R38 → LED3'],['23 RB2','ALARM2 → R39 → LED4'],['22 RB1','SIGNAL1 → R36 → LED1'],['21 RB0','ALARM1 → R37 → LED2'],['20 VDD','+5V'],['19 VSS','GNDD'],['18…15 RC7…RC4','(n.c.)'],
  ],'28-pin DIP, socketed · MPASM V1.01')
  + `<rect x="60" y="120" width="200" height="120" fill="none" stroke="${K}"/>`+tx(160,112,'RV3 (dual gang: RV3:A, RV3:B)',{a:'middle',fs:11})
  + tx(70,145,'RV3-1 / RV3-4 → +5V',{})+tx(70,165,'RV3-3 / RV3-6 → GNDD',{})+tx(70,185,'RV3-2 wiper A → RA2 (read: rv3)',{c:NETC})+tx(70,205,'RV3-5 wiper B → RA3 (never read)',{c:'var(--bad)'})+tx(70,225,'front: ALARM DELAY 1 SEC … 45 SEC',{fs:9.5,c:'var(--ink2)'})
  + tx(60,300,'TRISA = 0x0F (RA0–RA3 in), TRISB = TRISC = 0 (all out).',{})+tx(60,318,'ADCON1 PCFG2:0 = 000 → AN0–AN4 analog, VREF = VDD (comment says “digital i/o”).',{})
  + tx(60,336,'ADCON0 ADCS1:0 = 00 → Fosc/2: TAD = 0.41 µs (datasheet minimum 1.6 µs).',{})+tx(60,354,'MCLR is tied straight to +5V; no reset circuit or ICSP header.',{});
}
function sheetOutputs(){
  let s='';
  [['SIGNAL1 (RB1)','R36','LED1','GREEN'],['ALARM1 (RB0)','R37','LED2','RED'],['SIGNAL2 (RB3)','R38','LED3','GREEN'],['ALARM2 (RB2)','R39','LED4','RED']].forEach((r,i)=>{ const y=50+i*40;
    s+=NET(30,y,r[0])+sw(`130,${y} 150,${y}`)+Rh(150,y,r[1],'330R')+sw(`190,${y} 210,${y}`)+`<polygon points="210,${y-7} 210,${y+7} 226,${y}" fill="${r[3]==='RED'?'#e3453a':'#3fbf5f'}" stroke="${K}"/>`+sw(`226,${y-7} 226,${y+7}`)+sw(`226,${y} 246,${y}`)+GND(246,y)+tx(232,y-10,`${r[2]} ${r[3]}`,{fs:9.5}); });
  s+=tx(30,220,'Issue 1 drove the LEDs straight from the pins, with LED1 red / LED2 green.',{fs:10,c:'var(--ink2)'})+tx(30,236,'ECO 21 May 2003 added R36–R39 (20K0, then 330R).',{fs:10,c:'var(--ink2)'});
  [['REL1 (RC2)','R33','Q1','REL1','R30','H6','OUTPUT 1'],['REL2 (RC1)','R34','Q2','REL2','R31','H7','OUTPUT 2'],['REL3 (RC0)','R35','Q3','REL3','R32','H5','OUTPUT 1+2']].forEach((r,i)=>{ const x=330+i*200, y=60;
    s+=NET(x,y+150,r[0])+sw(`${x},${y+140} ${x},${y+130}`)+Rv(x,y+90,r[1],'1K0')+sw(`${x},${y+90} ${x},${y+80} ${x+20},${y+80}`);
    s+=`<circle cx="${x+34}" cy="${y+80}" r="16" fill="none" stroke="${K}"/>`+sw(`${x+20},${y+70} ${x+20},${y+90}`)+sw(`${x+20},${y+74} ${x+34},${y+64} ${x+34},${y+50}`)+sw(`${x+20},${y+86} ${x+34},${y+96} ${x+34},${y+110}`)+GND(x+34,y+110)+tx(x+54,y+84,`${r[2]} 2N4401`,{fs:9.5});
    s+=`<rect x="${x+24}" y="${y+10}" width="20" height="40" fill="none" stroke="${K}"/>`+sw(`${x+24},${y+50} ${x+44},${y+10}`)+tx(x+50,y+30,`${r[3]} coil`,{fs:9.5})+tx(x+50,y+42,'RZ-12W-C',{fs:9,c:'var(--ink2)'});
    s+=sw(`${x+34},${y+10} ${x+34},${y-10}`)+Rv(x+34,y-50,r[4],'100R')+NET(x+40,y-56,'+VA');
    s+=tx(x,y+190,`2 poles: pins 4/6/8 and 9/11/13`,{fs:9.5})+tx(x,y+204,`→ ${r[5]} → rear board → ${r[6]}`,{fs:9.5,c:NETC})+tx(x,y+218,'NO / NC / COM × 2',{fs:9.5,c:'var(--ink2)'}); });
  s+=tx(330,330,'No flyback diodes appear across the relay coils in POD25iss2.net (D1–D4 are detector diodes, D5–D8 the bridge).',{fs:10,c:'var(--bad)'});
  s+=tx(330,346,'Which relay pin is COM and how H1–H3 map to TB1–TB6 are not in the archive files read here '+'(inferred: TB1/TB2 = OUTPUT 1 …).',{fs:10,c:'var(--ink2)'});
  return s;
}
function sheetTone(){
  let s='';
  s+=NET(30,120,'1KHZ_TONE (RB4, U5-25)')+sw('180,120 200,120')+Rh(200,120,'R25','750R')+sw('240,120 300,120 300,132 320,132')+DOT(300,120)+sw('300,120 300,100')+tx(306,96,'C110 DNI',{fs:9,c:'var(--ink2)'});
  s+=OP(320,120,'U6A')+sw('320,108 312,108 312,80 384,80 384,120')+DOT(384,120)+tx(330,74,'pins 1,2 joined: follower',{fs:9,c:'var(--ink2)'});
  s+=sw('372,120 400,120')+Rh(400,120,'R26','20K0')+sw('440,120 480,120')+DOT(470,120);
  s+=OP(480,132,'U6B')+sw('480,144 472,144 472,150')+GND(472,150)+sw('470,120 470,80 490,80')+Rh(490,80,'R28','20K0')+sw('530,80 546,80 546,132')+DOT(546,132);
  s+=sw('532,132 580,132')+tx(552,124,'U6-7',{fs:9});
  s+=`<circle cx="586" cy="132" r="3" fill="none" stroke="${K}"/><circle cx="626" cy="132" r="3" fill="none" stroke="${K}"/>`+sw('588,122 624,112')+tx(606,104,'SW1 PHA-2UEE',{a:'middle',fs:9.5})+tx(606,152,'ALARM: out = ON, in = OFF',{a:'middle',fs:9,c:'var(--ink2)'});
  s+=sw('629,132 650,132')+Rh(650,132,'R29','10R')+sw('690,132 730,132')+NET(700,122,'TONE_OUTPUT')+`<rect x="730" y="118" width="14" height="28" fill="none" stroke="${K}"/><polygon points="744,118 764,104 764,160 744,146" fill="none" stroke="${K}"/>`+sw('737,146 737,170')+GND(737,170)+tx(770,136,'speaker via H4 (header DNI)',{fs:9.5});
  s+=tx(30,230,'RB4 is a 0/5 V square wave: U6A buffers it, U6B (R28/R26 = 1) inverts it, so the speaker sees 0 … −5 V through 10 Ω.',{fs:10.5});
  s+=tx(30,248,'There is no coupling capacitor (C110 is not fitted). When the beep gate closes with RB4 high, the speaker sits at a DC level until the next beep '+'(inferred from the code and netlist).',{fs:10.5,c:'var(--ink2)'});
  s+=tx(30,266,'U6 is an NE5532 on ±VA. The tone rate comes from the main loop, not a timer: ≈2.9 kHz, gated about 4.5 times a second.',{fs:10.5,c:'var(--ink2)'});
  return s;
}
function sheetPower(){
  let s='';
  s+=`<rect x="30" y="80" width="70" height="80" fill="var(--panel2)" stroke="${K}"/>`+tx(65,74,'ACIN1 PAN356',{a:'middle',fs:10.5})+tx(40,104,'L (3)')+tx(40,124,'N (2)')+tx(40,144,'E (1)');
  s+=sw('100,100 140,100')+`<circle cx="146" cy="100" r="3" fill="none" stroke="${K}"/><circle cx="176" cy="100" r="3" fill="none" stroke="${K}"/>`+sw('148,94 174,86')+tx(160,80,'PWRSW1 PAN256',{a:'middle',fs:9.5})+sw('179,100 230,100');
  s+=sw('100,120 230,120')+sw('100,140 110,140 110,150')+GND(110,150);
  s+=`<rect x="230" y="80" width="90" height="100" fill="none" stroke="${K}"/>`+tx(275,74,'T3 TE70042',{a:'middle',fs:10.5})+tx(238,134,'2 primaries',{fs:9.5})+tx(238,150,'links 1 (SOT), 2, 3 (0R)',{fs:9,c:'var(--ink2)'})+tx(238,166,'115 V or 230 V',{fs:9,c:'var(--ink2)'});
  s+=sw('320,100 380,100')+sw('320,160 380,160')+`<rect x="380" y="80" width="80" height="100" fill="none" stroke="${K}" stroke-dasharray="4 3"/>`+tx(420,74,'D5–D8 1N4003',{a:'middle',fs:10})+tx(390,134,'bridge',{fs:10});
  s+=sw('460,100 560,100')+NET(564,100,'+VA')+DOT(510,100)+sw('510,100 510,112')+Cv(510,112,'C28','2200µ/25')+GND(510,132);
  s+=sw('460,160 560,160')+NET(564,160,'−VA')+DOT(530,160)+sw('530,160 530,140')+tx(536,150,'C55 2200µ/25 to GNDD',{fs:9});
  s+=sw('600,100 640,100')+`<rect x="640" y="85" width="70" height="40" fill="var(--panel2)" stroke="${K}"/>`+tx(675,109,'REG1 7805',{a:'middle',fs:10})+sw('675,125 675,140')+GND(675,140)+sw('710,100 760,100')+NET(764,100,'+5V → U5, RV3, ADC ref');
  s+=NET(560,220,'+VA')+sw('590,220 610,220')+Rh(610,220,'R27','1K0')+sw('650,220 670,220')+`<polygon points="670,213 670,227 686,220" fill="#3fbf5f" stroke="${K}"/>`+sw('686,213 686,227')+sw('686,220 700,220')+GND(700,220)+tx(640,250,'PWRLED green',{fs:9.5});
  s+=tx(30,300,'±VA (unregulated) feeds U1–U4, U6 and the relay coils; only the PIC side is regulated. 0.1 µF: C11–C13, C100–C109.',{fs:10.5});
  s+=tx(30,318,'Manual: 115 V AC 60 Hz 12 VA; 230 V AC 50 Hz 6 VA on request. Rear silk: “115 VAC, 1/2 A.S.B.”',{fs:10.5,c:'var(--ink2)'});
  return s;
}
const SHEETS = [
  { name:'1 · Input, threshold and detector', svg:sheetFrontEnd, note:'Every part and net is from POD25iss2.net / POD25iss2.bom (P-CAD 2002, 21–22 May 2003). Values in grey.' },
  { name:'2 · PIC16F73 controller', svg:sheetMCU, note:'Pin functions from the netlist and the firmware comments (XLR1 = porta,0 …). RB5–RB7, RC3–RC7, RA4/RA5 are unconnected.' },
  { name:'3 · LEDs and GPI relays', svg:sheetOutputs, note:'R30–R32 100R, R33–R35 1K0, Q1–Q3 2N4401, REL1–REL3 RZ-12W-C (RELAYG5V2 footprint). Headers H5–H7 (right angle) mate with H1–H3 on the terminal board.' },
  { name:'4 · Alarm tone', svg:sheetTone, note:'The functional diagram (POD25 - Functional Diagram.cdr) labels this “TONE (1 Khz)”; the net is 1KHZ_TONE.' },
  { name:'5 · Power supply', svg:sheetPower, note:'Links “1”, “2”, “3” are the RefDes of two 0R and one SOT resistor in the BOM.' },
];
function viewSchem(m){
  window.__pod25Active = false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from the P-CAD netlist and BOM — not the original P-CAD drawing)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original is <span class="mono">POD25 - #Engineering/PCB/POD25iss2.sch</span> (P-CAD binary). These sheets follow its netlist <span class="mono">POD25iss2.net</span> part by part; the layout is new. Blue labels are net names.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 1100 420" style="width:100%;min-width:720px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="1088" height="408" fill="none" stroke="var(--line)"/>
      <text x="1086" y="408" text-anchor="end" font-size="10" fill="var(--ink2)">POD25 ISS2 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
const RAM = [['a_d_flag',0x20,'adf'],['data_mode',0x21,'data_mode'],['xlr1',0x22,'xlr1'],['xlr2',0x23,'xlr2'],['rv3',0x24,'rv3'],['signal',0x25,'signal'],['tone_interrupt',0x26,'ti'],
  ['interrupt_pclath',0x27,null],['interrupt_temp',0x28,null],['interrupt_status',0x29,null],['flag_1',0x2A,null],['cmp_res',0x2B,'cmp_res'],['rv1',0x2C,null],['rv2',0x2D,null],['l_data',0x2E,'l_data'],['r_data',0x2F,'r_data'],
  ['cmp_dif',0x30,'cmp_dif'],['cmp_thr',0x31,'cmp_thr'],['l_counter',0x32,'l_counter'],['r_counter',0x33,'r_counter'],['l_counter1',0x34,'l_counter1'],['r_counter1',0x35,'r_counter1'],['output1',0x36,null],['output2',0x37,null],['new_data',0x38,null],
  ['xlr1_0',0x39,'xlr1_0'],['xlr2_0',0x3A,'xlr2_0'],['period1',0x3B,null],['period2',0x3C,'period2'],['pulse1',0x3D,'pulse1'],['pulse2',0x3E,'pulse2'],['xlr1_alarm_data',0x3F,'a1'],['xlr2_alarm_data',0x40,'a2'],
  ['alarm_threshold',0x41,'at'],['palarm_threshold',0x42,null],['timer1',0x43,'timer1'],['timer2',0x44,'timer2'],['xlr_timer',0x45,'xlr_timer']];
function viewSoft(m){
  window.__pod25Active = true;
  m.innerHTML = `<div class="grid2">
    ${card('PIC16F73 main loop — the routine running at the playhead is lit', `<div id="flow"></div>`)}
    <div>${card('ADC round robin (a_d_convsion, a_d_flag bits 0–3)', `<div id="adc"></div>`)}${card('Silence state per detector (process_XLRn_data + process_xlrn)', `<div id="fsm"></div>`)}</div></div>
  <div class="grid2">${card('How the controls did things — control → hardware → code', `<div id="btn"></div>`)}${card('Bank 0 RAM after the pass at the playhead (ORG 20H … res 1)', `<div id="ram" class="scroll" style="max-height:420px"></div>`)}</div>
  <div class="grid2">${card('linear_table at 0x0FD–0x1FF: RV3 code → alarm_threshold', `<canvas id="lin"></canvas><p class="small muted" id="linn"></p>`)}${card('Firmware generations in the archive', `<div id="fwv"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t, E=emulate(), st=stepAt(t), o=outAt(t), fw=FW[D.fw];
    let rows = st && st.tr ? st.tr.T : null;
    const names = ['clrwdt','a_d_convsion','process_data','hysterisis','process_xlr1','process_xlr2','pulse_generator','period_generator','generate_tone'].concat(fw.timer?['xlr_check_timer']:[]).concat(['goto main']);
    let s=`<svg viewBox="0 0 560 ${names.length*40+50}" style="width:100%"><defs><marker id="p25a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <text x="10" y="18" font-size="11" fill="var(--ink2)">${st&&st.tr? `pass #${st.i.toLocaleString()} · ${E.ln[st.i]} cycles = ${SIM.fmtDur(E.ln[st.i]*TCY)}` : 'not running at the playhead'}</text>`;
    names.forEach((nm,j)=>{ const y=30+j*40; const seg = rows? rows.find(r=>r[0]===nm) : null; const on = st && st.seg && st.seg[0]===nm;
      s+=`<rect x="10" y="${y}" width="520" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="${RCOL[nm]}" stroke-width="${on?2.5:1.2}"/>
        <text x="20" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${nm}${seg?`  · ${seg[2]} cyc`:''}</text>
        <text x="20" y="${y+27}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${seg? seg[1].slice(0,92).replace(/</g,'&lt;') : ''}</text>`;
      if (j) s+=`<line x1="270" y1="${y-8}" x2="270" y2="${y}" stroke="var(--ink2)" marker-end="url(#p25a2)"/>`; });
    s+=`<path d="M530 ${30+(names.length-1)*40+16} h18 V46 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#p25a2)"/></svg><p class="small muted">Main runs forever with no interrupts. Cycle counts per branch are counted from the source (1 per instruction, 2 for call/return/goto/retlw, skips and PCL writes).</p>`;
    m.querySelector('#flow').innerHTML = s;
    // ADC round robin
    const i = o.j; const lastOp = (()=>{ let k=st?st.i:-1; for(let n=0;n<6&&k>=0;n++,k--){ if(E.op[k]&3) return {k, op:E.op[k]}; } return null; })();
    const cur = lastOp? ((lastOp.op>>2)&3) : -1, phase = lastOp? (lastOp.op&3) : 0;
    const node=(x,y,lbl,sub,on)=>`<circle cx="${x}" cy="${y}" r="40" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-3}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${sub}</text>`;
    m.querySelector('#adc').innerHTML = `<svg viewBox="0 0 470 150" style="width:100%">${node(80,75,'RA2','rv3_data · bit 2',cur===2)}${node(235,75,'RA0','XLR1_data · bit 0',cur===0)}${node(390,75,'RA1','XLR2_data · bit 1',cur===1)}
      <path d="M120 70 H195" stroke="var(--ink2)" marker-end="url(#p25a2)"/><path d="M275 70 H350" stroke="var(--ink2)" marker-end="url(#p25a2)"/><path d="M390 115 Q235 165 80 115" fill="none" stroke="var(--ink2)" marker-end="url(#p25a2)"/>
      <text x="10" y="16" font-size="10.5" fill="var(--ink2)">Each node: one pass start_ad (bit 3 set → GO) then one pass reading ADRES. Last: ${lastOp? (phase===1?'GO on ':'read ')+['RA0','RA1','RA2'][cur]+' = '+E.ad[lastOp.k] : '—'}</text></svg>`;
    // silence FSM
    const fsm = ch=>{ const bit=1<<ch, good=!!(o.sg&bit), x0= ch?o.x2:o.x1, quiet = x0 < fw.thr, a = ch?o.a2:o.a1;
      const run = o.on && !o.boot && o.j>=0; const state = !run ? -1 : !good ? 2 : (quiet && fw.timer) ? 1 : 0;
      const box=(x,lbl,sub,k)=>`<rect x="${x}" y="22" width="130" height="46" rx="8" fill="${state===k?(k===2?'var(--bad)':k===1?'var(--warn)':'var(--accent)'):'var(--panel2)'}" stroke="var(--line)"/><text x="${x+65}" y="40" text-anchor="middle" font-size="11.5" font-weight="700" fill="${state===k?'#fff':'var(--ink)'}">${lbl}</text><text x="${x+65}" y="57" text-anchor="middle" font-size="9.5" fill="${state===k?'#fff':'var(--ink2)'}">${sub}</text>`;
      return `<svg viewBox="0 0 470 90" style="width:100%"><text x="4" y="14" font-size="11" font-weight="700" fill="var(--ink)">Detector ${ch+1}: xlr${ch+1}_0 = ${x0} (silent < ${fw.thr})</text>
        ${box(6,'PRESENCE','signal,'+ch+' = 1',0)}${box(170,'COUNTING',fw.timer?`${a} of ${o.at+1} ticks · RB${ch?6:7}=1`:'(no delay)',1)}${box(334,'ALARM','signal,'+ch+' = 0 · REL'+(ch+1),2)}
        <path d="M136 45 H168" stroke="var(--ink2)" marker-end="url(#p25a2)"/><path d="M300 45 H332" stroke="var(--ink2)" marker-end="url(#p25a2)"/><path d="M398 70 Q235 96 70 70" fill="none" stroke="var(--ink2)" marker-end="url(#p25a2)"/>
        <text x="235" y="88" text-anchor="middle" font-size="9.5" fill="var(--ink2)">one reading ≥ ${fw.thr}: xlr${ch+1}_signal_good (no hold time)</text></svg>`; };
    m.querySelector('#fsm').innerHTML = fsm(0)+fsm(1)+`<p class="small muted">The green LED stays on while COUNTING; only RB7/RB6 change, and those pins are not connected.</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Control</th><th>Hardware</th><th>Code path</th></tr>
      <tr><td>Pull / plug an XLR</td><td class="small">U1/U3 → RV1/RV2 → U2A/U4A rectifier → C44/C45 → RA0/RA1</td><td class="mono small">XLR1_data → hysterisis → process_XLR1_data → (tick) incf xlr1_alarm_data → bcf signal,0 → xlr1_alarm</td></tr>
      <tr><td>THRESHOLD trim</td><td class="small">gain ahead of the rectifier (not read by the PIC)</td><td class="mono small">— (the compare stays SILENT_THRESHOLD EQU ${fw.thr})</td></tr>
      <tr><td>ALARM DELAY trim</td><td class="small">RV3:A wiper → RA2 (RV3:B → RA3, unused)</td><td class="mono small">rv3_data → process_RV3_data → call linear_table → alarm_threshold</td></tr>
      <tr><td>ALARM button</td><td class="small">SW1 in the speaker line after U6B</td><td class="mono small">none — the PIC keeps toggling RB4</td></tr>
      <tr><td>Power rocker / IEC</td><td class="small">PWRSW1 → T3 → 7805; PWRLED on +VA</td><td class="mono small">reset → init (signal = 0x03, a_d_flag = 0x0C) → main</td></tr>
      <tr><td>GPI outputs</td><td class="small">RC2/RC1/RC0 → Q1–Q3 → REL1–REL3</td><td class="mono small">xlr1_alarm: bsf portc,2 · bsf portc,0 / xlr1_signal: bcf portc,2 (portc,0 only if both good)</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    const R = st && st.tr ? st.tr.R : null;
    m.querySelector('#ram').innerHTML = `<table class="kv small">${RAM.map(([n,a,k])=>`<tr><td class="mono">${hex2(a)}</td><td class="mono">${n}</td><td class="mono">${!k? '<span class="muted">unused</span>' : R? hex2(R[k])+' = '+R[k] : '<span class="muted">— (not running)</span>'}</td></tr>`).join('')}</table>
      <p class="small muted">init.asm reserves these with <span class="mono">ORG 20H</span> and <span class="mono">res 1</span>, which in absolute mode reserves <i>program</i> words; the labels only work as RAM addresses because their values happen to equal bank-0 file registers 0x20–0x45.</p>`;
    // linear table
    const {c,w,h} = SIM.canvas(m.querySelector('#lin'), 170); const S=setAt(t), code=delayCode(S);
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(30,10,w-40,h-30); c.strokeStyle=SIM.css('--accent'); c.beginPath(); LINEAR.forEach((v,k)=>{ const x=30+k/255*(w-40), y=h-20-v/255*(h-30); k?c.lineTo(x,y):c.moveTo(x,y); }); c.stroke();
    c.fillStyle=SIM.css('--bad'); [0x0C,0xF2].forEach(v=>{ const k=LINEAR.indexOf(v+1); const x=30+k/255*(w-40); c.fillRect(x-1,10,2,h-30); });
    const xc=30+code/255*(w-40); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(xc,10); c.lineTo(xc,h-20); c.stroke();
    c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText('rv3 0 … 255', 34, h-6); c.fillText('alarm_threshold', 34, 22);
    const d = delayEst(S);
    m.querySelector('#linn').innerHTML = `ADRES ${code} → retlw ${hex2(LINEAR[code])}: the table is the identity shifted by one, with 0x0C and 0xF2 missing (red) and 0xFE repeated at the top. Delay now ≈ ${d.lo.toFixed(2)}–${d.hi.toFixed(2)} s (tick ${SIM.fmtDur(d.tick)}).`;
    m.querySelector('#fwv').innerHTML = `<table class="kv small"><tr><th>Build</th><th>Date</th><th>What differs</th></tr>
      <tr><td class="mono">pod25v2.asm</td><td>13 May 2003|36 (XRF)</td><td>Header already says V1.00. No delay: process_XLRn_data sets/clears signal at once; process_RV3_data is “return”; Timer2-interrupt tone code commented out (threshold_set, set_int, T2CON 0x45)</td></tr>
      <tr><td class="mono">v100/pod25.asm</td><td>14 May 2003|36</td><td>Adds xlr_check_timer (2048-pass tick), xlr1/2_alarm_data counters, linear_table lookup. SILENT_THRESHOLD 35 (35 = 0.684 V; an earlier “2” is commented out)</td></tr>
      <tr><td class="mono">v101/pod25.asm</td><td>23 Jul 2004|37</td><td>Only change: SILENT_THRESHOLD 40 (INIT.$$$ shows 39 tried first), for “offset and bias parameters of the OP-AMPS”</td></tr></table>
      <p class="small muted">Both folders are duplicated under <span class="mono">POD25 - #Software/</span> byte-for-byte. The project <span class="mono">25v100.pjt</span> builds <span class="mono">POD25.ASM</span>, so pod25.asm is the shipping main file, not pod25v2.asm.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod25Active = false;
  const E = emulate(), tick = 2048*E.avgPass, fz = 1/(4*E.avgPass);
  m.innerHTML = card('What POD25 is up to — findings from the source', `<ol>
    <li><b>The alarm delay is counted in main-loop passes, not by a timer.</b> <span class="mono">xlr_check_timer</span> decrements <span class="mono">timer1</span> (256) and <span class="mono">timer2</span> (<span class="mono">time_constant</span> 8), so one “tick” is 2048 passes. The emulation counts about ${(E.avgPass/TCY).toFixed(0)} cycles per pass at 4.9152 MHz (${(E.avgPass*1e6).toFixed(1)} µs), so a tick is about ${(tick*1000).toFixed(0)} ms and the longest delay (alarm_threshold = 254) is about ${(254*tick).toFixed(1)} s. That is close to the manual's 45 s, but it moves with every branch the loop takes.</li>
    <li><b>The minimum delay is not 1 second.</b> <span class="mono">xlr_timer</span> bits are only cleared when they are used, so the first quiet reading always counts at once. With the trimmer fully counter-clockwise (rv3 = 0 → <span class="mono">linear_table</span> 0), <span class="mono">xlr1_alarm_data = 1 &gt; 0</span> raises the alarm on the first quiet reading — a few tens of ms after the detector capacitor drains. The manual and the panel say 1 SEC. Tutorial step 9 shows it.</li>
    <li><b>“1 kHz” tone is about ${(fz/1000).toFixed(1)} kHz.</b> The net is <span class="mono">1KHZ_TONE</span> and the functional diagram says “TONE (1 Khz)”, but <span class="mono">generate_tone</span> toggles RB4 every <span class="mono">TONE_CONSTANT</span> = 2 passes (period 4 passes). <span class="mono">pulse_generator</span> gates it every 1280 passes, about ${(1/(2*1280*E.avgPass)).toFixed(1)} beeps a second. The Timer2-interrupt version (<span class="mono">threshold_set</span>, <span class="mono">set_int</span>, <span class="mono">T2CON 0x45</span>, <span class="mono">PR2 = tone_constant</span>) is commented out in pod25v2.asm, and the interrupt vector at 0x004 is a bare <span class="mono">RETFIE</span>.</li>
    <li><b><span class="mono">linear_table</span> is a placeholder.</b> 256 <span class="mono">retlw</span> entries at 0x100–0x1FF that return the input minus one, except that 0x0C and 0xF2 are missing and 0xFE is repeated three times. It looks like a curve that was never filled in. The entry code (<span class="mono">org 0xfd</span>: clrf/bsf PCLATH, addwf PCL) puts the jump exactly on the page boundary.</li>
    <li><b>The THRESHOLD trimmers never reach the PIC.</b> RV1/RV2 set the gain in front of the rectifiers. The firmware compares with a fixed <span class="mono">SILENT_THRESHOLD</span> (35 in V1.00, 40 in V1.01). Full gain (851) and code 40 work out to about −51.6 dBu, which matches the manual's −50 dBu end.</li>
    <li><b>V1.01 is a one-line change.</b> SILENT_THRESHOLD 35 → 40 “due to various offset and bias parameters of the OP-AMPS”. <span class="mono">v101/INIT.$$$</span> (the MPLAB backup) shows 39 was tried first. Use the offset sliders (${inf}) to see a unit that never alarms under V1.00.</li>
    <li><b>The project builds pod25.asm, not pod25v2.asm.</b> The README calls pod25v2.asm the main file, but <span class="mono">25v100.pjt</span> lists <span class="mono">FileList=POD25.ASM</span>. pod25v2.asm (13 May 2003) is an earlier draft with no delay at all. The .pjt also still holds sections from a POD14 project (<span class="mono">POD14.ASM, EERW.ASM, SWITCH.ASM, SPI.ASM, P16C73A.INC</span>) and says <span class="mono">Frequency=4000000</span>, although X1 is 4.9152 MHz.</li>
    <li><b>The hysteresis code came from a volume control.</b> <span class="mono">hysterisis.asm</span> uses labels <span class="mono">l_update_sharc</span>/<span class="mono">r_update_sharc</span>, comments “left pot update”, and a routine called <span class="mono">volume_change?</span>. It is a ±1 LSB dead band that locks after 256 quiet samples (<span class="mono">count_data</span> = 1, <span class="mono">l_counter1</span> wraps). It also makes <span class="mono">process_data</span> work on the previous sample, because hysterisis runs after it in the loop.</li>
    <li><b>ADC set-up is outside the datasheet.</b> ADCON0's ADCS bits stay 00 (Fosc/2): TAD ≈ 0.41 µs, against a 1.6 µs minimum. <span class="mono">init</span> also sets GO and then changes CHS during that first conversion. The comment “porta is digital i/o” sits above <span class="mono">PCFG2:0 = 000</span>, which makes PORTA analog (the code is right, the comment is wrong).</li>
    <li><b>Hardware the firmware ignores.</b> RV3 is a dual-gang part (<span class="mono">RV3:A</span>, <span class="mono">RV3:B</span> in POD25iss2.sch); wiper B goes to RA3 (pin 5), which is never converted. The “counting” flags <span class="mono">bsf portb,7</span> / <span class="mono">portb,6</span> drive pins 28/27, which are not connected, so nothing on the panel shows that a channel is counting toward an alarm.</li>
    <li><b>The GPI relays fail “OK”.</b> The relays are energised in alarm (<span class="mono">bsf portc,2</span>). If the POD25 loses power or its fuse, every relay drops and the NC contacts close, which looks the same as “signal present” to whatever is watching ${inf}. No flyback diodes appear across the coils in the netlist either.</li>
    <li><b>Input impedance is lower than the manual says.</b> The manual gives 40 kΩ balanced. Each leg goes through 4K7 (R1/R2, R15/R4) and 33 µF into a virtual-earth inverting stage, about 9.4 kΩ differential.</li>
    <li><b>Small code/comment mismatches.</b> “if xlr1 &lt;= threshold then silent”, but code 40 itself counts as good. “if they are equal send alarm”, but it fires when the count exceeds alarm_threshold. Unused RAM: rv1, rv2, output1/2, new_data, period1, palarm_threshold, flag_1, interrupt_*; unused constants COUNT0–COUNT3 (“2.4 SECOND DELAY”). RAM is “allocated” with <span class="mono">ORG 20H</span> + <span class="mono">res</span>, which works only by coincidence.</li>
    <li><b>Issue 1 → Issue 2 board.</b> Issue 1 (POD25iss1) drove the LEDs straight from the port pins with the colours swapped (LED1 red, LED2 green). The Issue 2 ECO (21–22 May 2003) added R36–R39, first 20K0 then 330R. C1/C2/C4/C9 went from 68 µF to 33 µF.</li>
    <li><b>Archive housekeeping.</b> <span class="mono">Software/</span> and <span class="mono">POD25 - #Software/</span>, <span class="mono">PCB/</span> and <span class="mono">POD25 - #PCB/</span>, <span class="mono">MANUAL/</span> and <span class="mono">POD25 - #MANUAL/</span> are duplicates. <span class="mono">AMS8-M5 ISS 5 (BOTTOM PAN).dwg</span> sits in POD25's photo folder, and <span class="mono">POD24-FRONT.bak</span> in its mechanical folder. The rear photo shows an older silk (“DISCONNECT POWER BEFORE SERVICING” across the bottom) than the Jul.02/14 artwork used here. The rear panel went to Issue 2 on 26/11/07 for a “new style AC plug”.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Instruction cycles per branch are counted from the source; MPASM's real placement (page bits, the 0x300 table) does not change them. Port changes are drawn at the end of the pass. Init ≈ 77 cycles; reset = PWRT 72 ms + OST ${inf} (no __CONFIG in the source).</li>
    <li>Detector: C44/C45 charge with τ = 10 ms and discharge with τ = 30 ms towards the half-wave mean of the input × gain ${inf}. Front-end offset 0.25 V by default ${inf}. The ADC is ideal: code = ⌊V·256/5⌋.</li>
    <li>THRESHOLD trimmer: linear in dB from −20 dBu (CCW) to −50 dBu (CW), calibrated to V1.01's code 40 ${inf}; the pot value and taper are not in the BOM. RV3: wiper voltage linear with rotation ${inf}.</li>
    <li>Relay operate 5 ms / release 3 ms ${inf}. Terminal mapping TB1/TB2 = OUTPUT 1, TB3/TB4 = OUTPUT 2, TB5/TB6 = OUTPUT 1+2 ${inf} from the rear silk order.</li>
    <li>“Programme” audio is a made-up speech-like pattern with 180 ms syllables, short gaps and a 1.4 s pause every 9 s.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD25 - #Master/POD25 - #Engineering/Software/v101/pod25.asm, init.asm, hysterisis.asm, INIT.$$$, 25v100.pjt, POD25.XRF</li>
    <li>…/Software/v100/pod25.asm, init.asm, pod25v2.asm, POD25V2.XRF</li>
    <li>…/PCB/POD25iss2.net, .bom, .ECO, .sch · …/PCB/OBSOLETE/POD25iss1.*</li>
    <li>…/MANUAL/POD25MANU.doc · …/POD25 - Functional Diagram.cdr</li>
    <li>…/POD25 - #ARTWORK #DA #2016/POD25-FRONT&amp;REAR-SILK (CURVE).pdf · POD25 - #PHOTOS/POD25 Front.jpg, POD25 Rear.jpg</li>
    <li>…/POD25 - #Mechanical #DA #2016/POD25-FRONT ISS 1 (PANEL).pdf, POD25-REAR ISS 2 (PANEL).pdf</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'pod25', name:'POD25 · Stereo silence detector ('+Y(2003)+')', duration:DUR,
  product:'POD25', year:2003, family:'POD series',
  folder:'#POD #SERIES/POD25 - #Master',
  summary:'Half-rack two-channel analog silence detector: green PRESENCE and red ALARM LEDs per channel, a beeper with a mute button and three DPDT GPI relays (channel 1, channel 2, either). A PIC16F73 at 4.9152 MHz runs one polling loop that samples two rectified audio levels and the delay trimmer; this model runs that loop pass by pass, cycle-counted from the MPASM source.',
  highlights:['Firmware emulated pass by pass (≈108 cycles, counted from pod25.asm) with its own RAM variables','Front and rear panel on the real silkscreen; cables, trimmers, ALARM button and power are live','Three firmware builds: pod25v2 draft, V1.00, V1.01','The delay is 2048-pass ticks; the “1 kHz” tone is about 2.9 kHz','10-step operator tutorial from the manual'],
  depth:'Full model',
  stepUnits:[
    {label:'1 instruction cycle (813.8 ns)', period:()=>TCY},
    {label:'1 main-loop pass (≈92 µs)', period:()=>emulate().avgPass},
    {label:'1 ADC round (6 passes)', period:()=>6*emulate().avgPass},
    {label:'1 delay tick (2048 passes)', period:()=>2048*emulate().avgPass},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
    {label:'1 s', period:()=>1},
  ],
  zooms:[[60,'60 s (whole run)'],[20,'20 s'],[1,'1 s'],[0.25,'250 ms (beeps)'],[0.02,'20 ms (detector RC)'],[0.002,'2 ms (tone cycles)'],[0.0006,'600 µs (one ADC round)'],[0.0002,'200 µs (2 passes)'],[0.00004,'40 µs (routines)']],
  defaultZoom:0,
  init(){ EMU_KEY='';
    // the core's time slider is max=1; this run is 60 s long. Widen it while POD25 is active, restore it when another plugin is chosen.
    const sl = document.getElementById('tSlider'), ps = document.getElementById('pluginSel');
    if (sl){ sl.max = String(DUR); sl.step = '0.00001'; }
    if (ps && !ps.__p25){ ps.__p25 = true; ps.addEventListener('change', ()=>{ if (ps.value!=='pod25' && sl){ sl.max='1'; sl.step='0.000001'; } else if (sl){ sl.max=String(DUR); } }); }
  },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD25', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
