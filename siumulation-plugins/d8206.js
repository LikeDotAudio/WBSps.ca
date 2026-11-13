/* =====================================================================
   D8206 — Digital Audio Reference Signal (DARS) generator, MF82 card (Ward-Beck)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all under #MF8200 #SERIES/):
   - D8206 - #Master #MF82/D8206 - #Engineering/D8206MAN.pdf (2003|36 manual), D8206MAN-rev1.rtf,
     D8206 - DARS Generator - FUNCTIONAL DESCRIPTION.WPD, testing_pro.wpd (2000|33 test procedure),
     Amendment to the D8206 Manual for Custom 016.doc
   - D8200 - #Engineering #MF82/d8200 - #d820x/pic/v105/v1.105 May15,2006/  (production PIC code, #define D8206):
       d820x.h (MODE1/MODE2 bit map, AUD_OUTPUT_ROUTE, REAL_MODE_x, PORTB/PORTC pins, BCOUNT_NUM, AES_OUTPUT_CONTROL_NUM)
       d820x.asm (main, init_modes_after_SHARC_respond, MODE_change_analize, switch_8420_modes, LED_processing)
       d820xswr.asm (SHARC_link_control, AES_output_control, jmp_input, debounce, set_ML6431_48/44,
                     set_MODE_0/7/d/f, flush8420reg, Link_to_ALTERA, Link_to_SHARC), d820xini.asm, d820xspi.asm
   - …/pic/v1.103-016/ (custom 016 48/44.1 kHz toggle build)
   - …/d820x/sharc/d820xcore.asm (D8206_beg, jumpers_analize_D8206, sample_proc_D8206, testtone_init,
       form_testtone_sampl), d820xdef.h (D8206_JMP_* bits, tt_att_val, tt_freq_val), D8206_frq.dat, D8206_vol.dat
   - D8206 - #Master #MF82/…/D8206 - #cpld/d8206.rpt (EPM7128STC100-6 pin-out, MAX+plus II 9.6, 2006|39)
   - D8206 - #Master #MF82/…/D8206 - #orig/DATA/DATA*.ASM (1998–99|31–32 EPROM tone tables)
   - D8200 - #Engineering #MF82/d8200 - #PCB/d8200-1.bom, d8200 - #GERBERS/D8200-2.SLK + .TSM (board art)
   - 8200 Series Rear Module options graphical Guides …/D8206 - rear module options.cdr + .pdf (rear art, assets/d8206-rear-*.svg)
   - D8206 - #Engineering/D8206-75 rev1.cdr, D8206TR3.cdr (converted with Inkscape to cross-check the rear art)
   Artwork: assets/d8206-board-silk-white.png and d8206-board-pads-tin.png are the D8200-2 Gerber top silk and top
   solder mask rendered at 200 dpi (2129 × 561 px = 10.64″ × 2.80″); assets/d8206-rear-*.svg (Artwork 2026|59) are the five
   rear modules as CorelDRAW vectors of "D8206 - rear module options.cdr" (2012-01-16), taken through Corel's own PDF export
   (libcdr mangles the terminal-block symbol font), same 200-dpi cells as before: black plate, white silk (MF8212RM2 photo). Anything not in the sources is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- constants from the source ---------------- */
const PIC_XTAL = 3.58e6, TCY = 4/PIC_XTAL;   // X1 "3.58" on d8200-1.bom, __CONFIG _HS_OSC
const PASS = 4/1024;          // INFERRED: Hysterisis comment "Locking time is about 4 second" = 256 readings × 4 pots
const BCOUNT = 0x1f;          // BCOUNT_NUM: debounce, passes a new jumper/lock word must stay stable
const AESON = 0x55;           // AES_OUTPUT_CONTROL_NUM: passes before shut_on_AES_output after a mode change
const SHARC_TO = 256;         // SHARC_TIMEOUT_NUM1=0x00, NUM2=0x01 → 256 passes without 0xE4 → goto WHOLE_RESET
const PWRT = 0.072;           // INFERRED: _PWRTE_ON power-up timer, PIC datasheet nominal 72 ms
const SHARC_BOOT = 0.025;     // INFERRED: ADSP-21061 EPROM (U2 27C512) boot time after RESET is released
const LOCK_T = 0.02;          // INFERRED: CS8420 PLL acquire
const VLOCK_T = 0.12;         // INFERRED: ML6431 genlock acquire on NTSC black
const WDT_T = 2.3;            // INFERRED: OPTION_REG never written → WDT prescaler 1:128 × 18 ms nominal
const FS_INT = 48000;         // OSC2 24.576 MHz = 512 × 48 kHz ("intrn256fs", "internal 48 kHz")
const SHARC_CLK = 24.576e6;   // INFERRED: SHARC-CLK pin of the CPLD fed from 24M576
const TT_MAX = 24000.0;       // jumpers_analize_D8206: f4=24000.0; f2=24000.0;//f2=22050.0;Sept 6 2005 make both 48k
const ATT = [1.0, 0.251188643150958, 0.19952623149688796, 0.158489319246, 0.125892541179, 0.1, 0.001, 0]; // tt_att_val[8]
const LVL_TXT = ['0','−12','−14','−16','−18','−20','−60','VARIABLE'];
const TT_FREQ = [1000.0, 400.0];                                   // tt_freq_val[2]
const FRQ = i=>20*Math.pow(1100, i/255);                           // D8206_frq.dat: 20 Hz … 22 000 Hz, log
const VOL = i=> i<=0 ? 0 : Math.pow(10, -(255-i)*0.3515625/20);    // D8206_vol.dat: 0, −89.3 dB … 0 dB, 0.3516 dB/step
const REF_FS = [32000, 44100, 48000, 88200, 96000];
const STEPS = [
  ['AtoD_data_preparing · AtoD', .12, 'One of the 4 pots per pass: average of 4, then Hysterisis'],
  ['Link_to_SHARC', .05, 'Pack the next nibble aaaadddd (16 per message, FRAME_CODE 0xE4 first)'],
  ['Link_to_ALTERA', .10, '4 SPI bytes each way: TO_ALTERA0..2 (+AUD_OUTPUT_ROUTE) and the SHARC mailbox byte'],
  ['SHARC_link_control', .03, 'FROM_ALTERA3 == 0xE4? reset the timeout : count to WHOLE_RESET'],
  ['jmp_input · debounce', .12, 'Read 14 jumpers (via the CPLD) and CS8420 reg 16 UNLOCK of both chips'],
  ['switch_8420_modes', .08, 'jmp_mode 7: ML6431 locked? · jmp_mode d: CH2 locked? else MODE_0_handler'],
  ['channel_status_proc', .14, 'Rebuild the channel-status blocks of CH1 and CH2'],
  ['LED_processing', .04, 'mode 0 → LED_0+LED_3 · mode 7 → LED_2 · mode d → LED_1'],
  ['flush8420reg · AES_output_control', .32, 'Write 9 regs to each CS8420 (2 forced to 0 by "TESTING"), count down the output delay'],
];
const STEP_FRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
const MODE_NAME = { 0xf:'MODE f (startup, PLLs on serial port)', 0xd:'MODE d (AES ref, SRC)', 7:'MODE 7 (video ref)', 0:'MODE 0 (internal 48 kHz)' };

/* ---------------- jumpers (manual "PROGRAMMING THE D8206"; ON reads as 0) ---------------- */
const JDOC = {
  1:['Word resolution','24 bit','20 bit'], 2:['Signal reference','Audio','Video'], 3:['Output 1','Tone','Silence'], 4:['Output 2','Tone','Silence'],
  5:['CH A frequency','1 kHz','400 Hz'], 6:['CH A level LVL2','',''], 7:['CH A level LVL1','',''], 8:['CH A level LVL0','',''],
  9:['CH B frequency','1 kHz','400 Hz'], 10:['CH B level LVL2','',''], 11:['CH B level LVL1','',''], 12:['CH B level LVL0','',''],
  13:['Fs for video ref','Reserved','48 kHz'], 14:['Monitor jack','Output 1','Output 2'],
};
const JDEF = ()=>{ const j={}; for (let i=1;i<=14;i++) j[i]=true; j[2]=false; j[13]=false; return j; };   // manual defaults

/* ---------------- device state ---------------- */
const D = {
  j: JDEF(), jPrev: null, jAt: null,
  h16: 'ext', term1: '75', rear: 'bnc1', mf82ref: true,
  aesPlug: true, fs: 48000, vidPlug: true,
  loss: null,                   // {kind:'aes'|'video', at, until}
  pot: [180, 128],              // RV1 (upper, level → code1), RV2 (lower, frequency → code2), 8-bit A/D codes
  cold: true, fw: '105', toggle: 'down', toggleAt: null,
  log: [], ver: 0, actN: 0,
};
function resetAll(){ Object.assign(D, { j:JDEF(), jPrev:null, jAt:null, h16:'ext', term1:'75', rear:'bnc1', mf82ref:true, aesPlug:true, fs:48000, vidPlug:true, loss:null, pot:[180,128], cold:true, fw:'105', toggle:'down', toggleAt:null }); D.ver++; }
const bit = on=> on?0:1;
const jAtTime = t=> (D.jAt!==null && t<D.jAt && D.jPrev) ? D.jPrev : D.j;
const lvlIdx = (j,a)=> a ? bit(j[6])*4+bit(j[7])*2+bit(j[8]) : bit(j[10])*4+bit(j[11])*2+bit(j[12]);

/* ---------------- raw inputs at time t ---------------- */
function aesAvail(t){ const src = D.h16==='ext' ? D.aesPlug : D.mf82ref; if (!src) return false; if (D.loss && D.loss.kind==='aes' && t>=D.loss.at && t<D.loss.until) return false; return true; }
const aesFs = ()=> D.h16==='ext' ? D.fs : 48000;
function sinceUp(t, avail){ if (!avail(t)) return -1; let a=-10; if (D.loss && t>=D.loss.until && D.loss.until>a && avail(D.loss.until)) a=Math.max(a,D.loss.until); return t-a; }
function ch2LockRaw(t){ return aesAvail(t) && aesFs()>=32000 && aesFs()<=96000 && sinceUp(t,aesAvail)>=LOCK_T; }
function vidAvail(t){ if (!D.vidPlug) return false; if (D.loss && D.loss.kind==='video' && t>=D.loss.at && t<D.loss.until) return false; return true; }
function mlLockRaw(t){ return vidAvail(t) && sinceUp(t,vidAvail)>=VLOCK_T; }
function inputRegs(t){ const j=jAtTime(t);
  const r1 = (0<<7)|(ch2LockRaw(t)?1<<6:0)|(mlLockRaw(t)?1<<5:0)|(bit(j[13])<<4)|(bit(j[1])<<3)|(bit(j[2])<<2)|(bit(j[3])<<1)|bit(j[4]);
  const r2 = (bit(j[5])<<7)|(bit(j[6])<<6)|(bit(j[7])<<5)|(bit(j[8])<<4)|(bit(j[9])<<3)|(bit(j[10])<<2)|(bit(j[11])<<1)|bit(j[12]);
  return [r1, r2]; }

/* ---------------- pass-by-pass simulation of the PIC + SHARC handshake ---------------- */
let cache = null;
function sched(){
  if (cache && cache.ver===D.ver) return cache;
  const start = D.cold ? 0 : -2.0;                     // warm start = powered up 2 s before the window
  const t0 = start + PWRT + 0.008;                      // first pass of main after init (init ≈ 8 ms, inferred)
  const sharcAlive = start + PWRT + 0.004 + SHARC_BOOT;
  const hang = (D.fw==='016' && D.toggleAt!==null) ? D.toggleAt : null;  // custom 016 "here goto here"
  const P = [];                                        // per-pass records
  let st = { init:true, M1:0, M2:0, deb:false, b1:0, b2:0, bc:0, jmp:0xf, real:0xf, d1:AESON, d2:AESON, on1:false, on2Int:false,
             nib:0, to:SHARC_TO, leds:[1,1,1,1], sharcRun:false, sharcStp:0, snap:{}, sharcTx:0, i2c:0 };
  const commits = [];                                  // SHARC ctrl_proc commits {t, ji, c1, c2}
  const resets = [];                                   // jumpers_analize_D8206 runs (phase resets)
  let sharcJi = null;
  const N = Math.ceil((1 - t0)/PASS) + 2;
  for (let k=0; k<N; k++){
    const t = t0 + k*PASS; if (t>1+PASS) break;
    if (hang!==null && t>=hang){ P.push(Object.assign({}, P[P.length-1]||{}, {t, hung:true, ev:[]})); continue; }
    const ev = [];
    // Link_to_SHARC: one nibble per pass
    const n = st.nib;
    if (n===4) st.snap.m1 = st.M1; if (n===6) st.snap.m2 = st.M2;
    if (n===8) st.snap.c1 = D.pot[0]; if (n===10) st.snap.c2 = D.pot[1];
    // SHARC side: decodes this nibble (ctrl_proc), commits at nibble f
    if (t>=sharcAlive){
      if (n===st.sharcStp) st.sharcStp = (n+1)&15; else st.sharcStp = 0;
      if (n===15 && st.sharcStp===0 && st.snap.m1!==undefined && st.snap.m2!==undefined){
        const ji = (st.snap.m1<<8)|st.snap.m2;
        commits.push({ t, ji, c1:st.snap.c1, c2:st.snap.c2 });
        if (!st.sharcRun){ st.sharcRun=true; st.sharcTx=0xE4; ev.push('SHARC: received FRAME_CODE 0xE4, PRODUCT_NUMBER 6 → D8206_beg; tx_buf_CTRL = 0xE4'); }
        if (sharcJi===null ? ji!==0 : ji!==sharcJi){ resets.push({ t, ji }); }   // ji_input_old starts at 0
        sharcJi = ji;
      }
    }
    st.nib = (n+1)&15;
    // Link_to_ALTERA then SHARC_link_control
    if (st.sharcTx===0xE4 && t > (commits.length? commits[0].t : 9)){
      st.to = SHARC_TO;
      if (st.init){ st.init=false; st.leds=[0,0,0,0]; ev.push('SHARC_link_control: FROM_ALTERA3 = 0xE4 → clear LEDs, SHARC_IN_INIT = 0, init_modes_after_SHARC_respond');
        // MODE_change_analize with MODE_XOR = 0xFF on MODE1/MODE2 (still 0 here: debounce was skipped during init)
        st.real = (st.M1 & 4) ? 7 : 0xd; st.jmp = st.real; ev.push(`MODE_change_analize (MODE1=0x${st.M1.toString(16).padStart(2,'0')}) → set_ML6431_48, ${st.real===7?'set_MODE_7':'set_MODE_d'}, set_24bit`); }
    } else if (!st.sharcRun){ if (--st.to<=0){ ev.push('SHARC_link_control: 256 passes without 0xE4 → goto WHOLE_RESET'); st.to=SHARC_TO; } }
    // jmp_input + debounce
    const [r1, r2] = inputRegs(t);
    if (!st.init){
      if (!st.deb){ if (r1!==st.M1 || r2!==st.M2){ st.deb=true; st.b1=r1; st.b2=r2; st.bc=BCOUNT; } }
      else if (r1!==st.b1 || r2!==st.b2){ st.deb=false; }
      else if (--st.bc===0){
        const x1 = st.b1^st.M1; st.M1=st.b1; st.M2=st.b2; st.deb=false;
        ev.push(`debounce: MODE1=0x${st.M1.toString(16).padStart(2,'0')} MODE2=0x${st.M2.toString(16).padStart(2,'0')} (MODE_XOR1=0x${x1.toString(16).padStart(2,'0')}) → MODE_change_analize`);
        if (x1 & 4){ st.real = (st.M1&4)?7:0xd; st.jmp = st.real; ev.push(`VID_AUD_XOR set → ${st.real===7?'set_MODE_7 (video)':'set_MODE_d (audio)'}`); }
        if (x1 & 8) ev.push(`W_24bit_20bit_XOR set → ${(st.M1&8)?'set_20bit':'set_24bit'} (CS8420 regs 5/6)`);
        if (x1 & 0x10) ev.push(`FS_48K_44K_XOR set → ${(st.M1&0x10)?'set_ML6431_44':'set_ML6431_48'} (both write 0x80 = 48 kHz in v1.105)`);
      }
      // switch_8420_modes (by jmp_mode) — LEDs cleared first
      let changed=false; st.i2c=0;
      const locked = st.jmp===7 ? !!(st.M1&0x20) : !!(st.M1&0x40);
      if (locked){ if (st.real!==st.jmp){ st.real=st.jmp; changed=true; } }
      else { st.i2c=1; if (st.real!==0){ st.real=0; changed=true; } }
      if (changed){ st.d1=AESON; st.d2=AESON; st.on1=false; st.on2Int=false; ev.push(`switch_8420_modes → ${st.real===0?'MODE_0_handler: set_MODE_0':(st.real===7?'set_MODE_7':'set_MODE_d')} → swm_end: shut_off_AES_output_CH1/CH2, flush8420reg`); }
      // LED_processing
      const L=[0,0,0,0];
      if (st.real===0){ L[0]=1; L[3]=1; } else if (st.real===7){ if (st.M1&0x20) L[2]=1; } else if (st.real===0xd){ if (st.M1&0x40) L[1]=1; }
      st.leds=L;
      // AES_output_control
      if (!st.on1){ if (--st.d1<=0){ st.on1=true; ev.push('AES_output_control: AES_on_delay_CH1 expired → shut_on_AES_output_CH1'); } }
      if (!st.on2Int){ if (--st.d2<=0){ st.on2Int=true; } }
    }
    P.push({ t, init:st.init, M1:st.M1, M2:st.M2, deb:st.deb, bc:st.bc, jmp:st.jmp, real:st.real, on1:st.on1, on2Int:st.on2Int, d1:st.d1,
             leds:st.leds.slice(), nib:n, sharcRun:st.sharcRun, i2c:st.i2c, ev, r1, r2 });
  }
  cache = { ver:D.ver, t0, start, P, commits, resets, sharcAlive, hang };
  return cache;
}
function passAt(t){ const S=sched(); if (t<S.t0) return null; const k=Math.min(S.P.length-1, Math.floor((t-S.t0)/PASS)); return S.P[k]; }
function commitAt(t){ const C=sched().commits; let c=null; for (const x of C){ if (x.t<=t) c=x; else break; } return c; }
function resetAt(t){ const R=sched().resets; let c=null; for (const x of R){ if (x.t<=t) c=x; else break; } return c; }

/* ---------------- derived outputs ---------------- */
function realMode(t){ const p=passAt(t); return p? p.real : 0xf; }
function powered(t){ return t >= sched().start + PWRT; }
function vidFs(){ return (D.fw==='016' && D.toggle==='up') ? 44100 : 48000; }   // ML6431 reg 0x80 vs 0x81
function outFs(t){ const m=realMode(t); if (m===0xd) return aesFs(); if (m===7) return vidFs(); return FS_INT; }
function wcFs(t){ const m=realMode(t); return m===7 ? vidFs() : FS_INT; }    // OUT3 = CNT1 frame; CNT1 from intrn256fs in MODE d
function sharcFs(t){ return realMode(t)===7 ? vidFs() : FS_INT; }
function outClockOK(t){ const m=realMode(t); if (m===0xd) return ch2LockRaw(t); if (m===7) return mlLockRaw(t); return true; }
function params(t){
  const c=commitAt(t), r=resetAt(t); if (!c || !r) return null;
  const ji=r.ji, m2=ji&0xff, m1=ji>>8;
  const ch = a=>{ const idx = a ? (m2>>4)&7 : m2&7; const fb = a ? (m2>>7)&1 : (m2>>3)&1;
    if (idx===7) return { varMode:true, f:FRQ(c.c2), att:VOL(c.c1), idx, fb };
    return { varMode:false, f:TT_FREQ[fb], att:ATT[idx], idx, fb }; };
  return { ji, A:ch(true), B:ch(false), s1:!!(m1&2), s2:!!(m1&1), w20:!!(m1&8), resetT:r.t, codes:[c.c1,c.c2] };
}
const dB = g=> g<=0 ? -Infinity : 20*Math.log10(g);
function realFreq(f,t){ return f * sharcFs(t) / (2*TT_MAX); }    // SHARC always divides by 24000.0
function outState(t, which){   // which 1 | 2
  const p=passAt(t), pr=params(t);
  if (!powered(t) || !p) return { on:false, why:'power-up' };
  if (p.init || !pr) return { on: which===2 && p && !p.init, silent:true, why: p.init?'SHARC_IN_INIT':'SHARC has no tone parameters yet' };
  const enabled = which===1 ? p.on1 : true;        // CH2 Data Flow reg 3 is always written as 0 (TXOFF never reaches the chip)
  const silence = which===1 ? pr.s1 : pr.s2;
  return { on:enabled, silent:silence, pr, why: !enabled?'shut_off_AES_output_CH1 (delay '+p.d1+' passes)': silence?'H'+(which===1?3:4)+' OFF: SHARC writes 0 to tx_buf_CH'+which:'tone' };
}
function sampleAt(t, which, side){   // side 0 = CH A (left), 1 = CH B (right); returns −1…1
  const o=outState(t,which); if (!o.on || o.silent || !o.pr) return 0;
  const c = side? o.pr.B : o.pr.A; const f = realFreq(c.f,t);
  const n = Math.floor((t - o.pr.resetT)*sharcFs(t)) + 1;
  return Math.sin(2*Math.PI*f*n/sharcFs(t)) * c.att;
}
function monitorSrc(t){ return D.j[14] ? 1 : 2; }

/* ---------------- actions (log the real code path) ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.ver++; D.actN=(D.actN||0)+1; D.log.unshift({t:SIM.t,name,tr}); if (D.log.length>60) D.log.length=60; SIM.refresh(); }
const A = {
  jumper(k){ act(`Move H${k} to ${D.j[k]?'OFF':'ON'} (${JDOC[k][0]})`, tr=>{
    D.jPrev = Object.assign({}, D.j); D.jAt = SIM.t; D.j[k]=!D.j[k];
    if (k===14){ tr('JMP_14 is not in MODE1/MODE2: the EPM7128S reads it and routes the TRS MONITOR jack ("0=CH1 / 1=CH2")'); tr(`MONITOR now carries Output ${monitorSrc()}`); return; }
    const reg = k<=4||k===13 ? 'input_reg1' : 'input_reg2';
    tr(`jmp_input: FROM_ALTERA bit for JMP${k} → ${reg} (ON reads 0, OFF reads 1)`);
    tr(`debounce: input_reg ≠ MODE → bounceset, bcount = BCOUNT_NUM 0x1f; ${BCOUNT} stable passes (≈${(BCOUNT*PASS*1e3).toFixed(0)} ms ${'inferred timing'}) then MODE${reg.slice(-1)} updated`);
    if (k===2) tr(`MODE_change_analize: VID_AUD_XOR → ${D.j[2]?'set_MODE_d (audio reference via CS8420 #2 + SRC)':'set_MODE_7 (video reference via ML6431)'}; jmp_mode follows`);
    else if (k===1) tr(`MODE_change_analize: W_24bit_20bit_XOR → ${D.j[1]?'set_24bit':'set_20bit'} (CS8420 reg 5/6 bits 5:4); SHARC shift_right_num = ${D.j[1]?-8:-12}`);
    else if (k===13) tr(`MODE_change_analize: FS_48K_44K_XOR → ${D.j[13]?'set_ML6431_48':'set_ML6431_44'} — v1.105 writes 0x80 (“48Kshould be 80 for 48k just testing”) in both, and the SHARC uses 24000.0 for both`);
    else tr('PIC does nothing else with it: the bit rides to the SHARC in MODE nibbles 4–7 of the next Link_to_SHARC message (16 passes)');
    tr(`SHARC ctrl_proc → ji_input changed → jumpers_analize_D8206: ${k===3||k===4?`D8206_JMP_CH${k-2}_SILENCE`:k>=5&&k<=8?'tt_freq_L / tt_att_L':k>=9&&k<=12?'tt_freq_R / tt_att_R':'tt_max_freq, shift_left/right_num'} recomputed, tt_cnt_L = tt_cnt_R = 0 (“synphase channels”)`);
    if (k>=6&&k<=8 || k>=10&&k<=12){ const a=k<=8; const idx=lvlIdx(D.j,a); tr(`CH ${a?'A':'B'} level index ${idx} = ${LVL_TXT[idx]}${idx===7?' → D8206_variable_mode_CH'+(a?'A':'B')+' = 1: level from code1 (RV1), frequency from code2 (RV2)':' dBFS (tt_att_val['+idx+'] = '+ATT[idx]+')'}`); }
  }); },
  pot(i,v){ D.pot[i]=Math.max(0,Math.min(255,Math.round(v))); D.ver++; SIM.refresh(); },
  potLog(i){ act(`Turn ${i?'RV2 (lower trim, frequency)':'RV1 (upper trim, level)'} to code ${D.pot[i]}`, tr=>{
    tr(`AtoD_data_preparing: ${i?'ANAL_PIN2 B\'00000000\' = AN0':'ANAL_PIN1 B\'00001000\' = AN1'} converted every 4th pass, Average of 4, then Hysterisis (locks after 256 steady readings ≈ 4 s, ignores ±1)`);
    tr(`Link_to_SHARC nibbles ${i?'a, b (CODE2)':'8, 9 (CODE1)'} → SHARC fixed_mem(${i?'code2':'code1'})`);
    tr(i ? `sample_proc_D8206: M_D8206_frq = code2 → D8206_frq_lktb[${D.pot[1]}] = ${FRQ(D.pot[1]).toFixed(1)} Hz (used only by a channel in VARIABLE mode)` : `sample_proc_D8206: M_D8206_vol = code1 → D8206_vol_lktb[${D.pot[0]}] = ${isFinite(dB(VOL(D.pot[0])))?dB(VOL(D.pot[0])).toFixed(2)+' dBFS':'silence'} (VARIABLE channels only)`);
    tr('Both channels share code1/code2: two channels in VARIABLE mode always get the same level and frequency'); }); },
  h16(v){ act(`H16 → ${v==='ext'?'External':'Local (MF82REF)'}`, tr=>{ D.h16=v; tr(`Hardware strap: the AES reference reaching CS8420 #2 now comes from ${v==='ext'?'the rear module “AUDIO REF INPUT”':'the frame’s MF82REF reference bus'}`); tr(v==='local'&&!D.mf82ref?'This frame has no MF82REF option: CS8420 #2 sees nothing (UNLOCK)':'CS8420 #2 reg 16 bit 4 (UNLOCK) follows within a PLL acquire time'); }); },
  term1(v){ act(`TERM1 → ${v}`, tr=>{ D.term1=v; tr(`Audio reference termination ${v==='hiz'?'HiZ (loop-through)':v+' Ω'} (manual Figure 2). Not read by firmware.`); }); },
  rear(v){ act(`Rear module → ${REAR[v].name}`, tr=>{ D.rear=v; tr(REAR[v].note); }); },
  plugAes(){ act(D.aesPlug?'Unplug the AES reference':'Plug in the AES reference', tr=>{ D.aesPlug=!D.aesPlug; D.loss=null;
    tr(D.aesPlug?'CS8420 #2 PLL acquires; reg 16 bit 4 (UNLOCK) clears':'CS8420 #2 reg 16 bit 4 (UNLOCK) sets'); tr('jmp_input → input_reg1 bit 6 (CH2_8420_LOCKED) → debounce 31 passes → MODE1');
    tr(D.j[2]?'jmp_mode d: MODE_d_handler → '+(D.aesPlug?'set_MODE_d, shut_off outputs, re-enable after 85 passes':'MODE_0_handler → set_MODE_0 (internal 48 kHz), LED_0 + LED_3'):'Card is on video: only the CH2 lock bit in ji_input changes — and that alone makes jumpers_analize_D8206 reset the tone phase'); }); },
  plugVid(){ act(D.vidPlug?'Unplug the video reference':'Plug in the video reference', tr=>{ D.vidPlug=!D.vidPlug; D.loss=null;
    tr(D.vidPlug?'ML6431 genlocks to NTSC black; lock flag reaches the PIC as FROM_ALTERA1 bit 7':'ML6431 loses lock'); tr('jmp_input → input_reg1 bit 5 (ML6431_LOCKED) → debounce → MODE1');
    tr(!D.j[2]?'jmp_mode 7: MODE_7_handler → '+(D.vidPlug?'set_MODE_7, outputs re-enabled after 85 passes, LED_2 (yellow)':'MODE_0_handler: set_ML6431_48 over I²C every pass, set_MODE_0, LED_0 + LED_3'):'Card is on audio: the video lock bit only changes ji_input (tone phase reset)'); }); },
  drop(){ const kind = D.j[2]?'aes':'video'; act(`Drop the ${kind==='aes'?'AES':'video'} reference for 300 ms at the playhead`, tr=>{ D.loss={kind, at:SIM.t, until:Math.min(1.2,SIM.t+0.3)}; if(kind==='aes')D.aesPlug=true; else D.vidPlug=true;
    tr(`${kind==='aes'?'CS8420 #2 UNLOCK':'ML6431 unlock'} is seen on the next jmp_input, but MODE1 changes only after 31 stable passes`);
    tr('switch_8420_modes → MODE_0_handler: set_MODE_0, shut_off_AES_output_CH1/CH2 → LED_0 (green 1) + LED_3 (red)');
    tr('On return: debounce again, then set_MODE_'+(kind==='aes'?'d':'7')+'; AES_output_control re-enables Output 1 after 85 passes. Output 2 never mutes (flush8420reg writes reg 3 of CS8420 #2 as 0)'); }); },
  fs(v){ act('AES reference fs → '+v/1000+' kHz', tr=>{ D.fs=v; tr(`CS8420 #2 locks to ${v/1000} kHz; in MODE d both outputs follow the reference rate through the CS8420 SRCs while the SHARC still makes tone at the internal 48 kHz`); tr('Word clock (OUT3 = CNT1 frame) stays on the internal 48 kHz counter in MODE d'); }); },
  cold(v){ act(v?'Cold start at t = 0':'Card already running at t = 0', tr=>{ D.cold=v; tr(v?'init: LEDs all on, preset_chips (ML6431, CS8420s), init_modes → set_MODE_f, SHARC_IN_INIT = 1; outputs shut off until SHARC answers 0xE4':'Warm: the card powered up 2 s before the window'); }); },
  frame(v){ act(v?'Frame has the MF82REF option':'Frame without MF82REF', tr=>{ D.mf82ref=v; tr('Only matters with H16 = Local'); }); },
  fw(v){ act(`Firmware build → ${v==='016'?'v1.103-016 (custom 016)':'v1.105 (May 15 2006)'}`, tr=>{ D.fw=v; D.toggleAt=null; tr(v==='016'?'set_ML6431_48 reads PORTC,0 (the toggle): 0x80 = 48 kHz, 0x81 = 44.1 kHz; main loop restarts if the toggle moves while in MODE 7':'Both set_ML6431_48 and set_ML6431_44 write 0x80'); }); },
  toggle(){ act(`Custom 016 toggle → ${D.toggle==='down'?'UP (44.1 kHz)':'DOWN (48 kHz)'}`, tr=>{ D.toggle = D.toggle==='down'?'up':'down';
    if (D.fw!=='016'){ tr('Standard firmware: the toggle is not fitted / not read'); return; }
    const m=realMode(SIM.t); if (m===7){ D.toggleAt=SIM.t; tr('main (v1.103-016): real_mode == REAL_MODE_7 and PORTC,0 ≠ dummy_portc → goto here; here goto here'); tr(`No clrwdt in that loop: the watchdog resets the PIC after ≈${WDT_T} s ${'(inferred: OPTION_REG never written, prescaler 1:128)'}; init then programs the ML6431 with ${D.toggle==='up'?'0x81':'0x80'}`); }
    else tr('Not in MODE 7: the new position is used at the next set_ML6431_48 (video lock or reset)'); }); },
  reset(){ act('Factory defaults', tr=>{ resetAll(); tr('Manual defaults: all jumpers ON except H2 (video) and H13 (48 kHz); H16 External; TERM1 75 Ω'); }); },
};

/* ---------------- rear modules (CorelDRAW rear-module guide, 2012|45) ---------------- */
const RMG_DIR='#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/';
const REAR = {
  bnc1:{ name:'BNC1 (D8206/75)', img:'d8206-rear-bnc1.svg', w:476, h:617, note:'75 Ω BNC module: AUDIO REF INPUT, DIGITAL OUT 1-1, 1-2, 2-1, 2-2, WORD CLOCK, VIDEO REF IN.', term:'75',
    pts:[['aesin',215,102,'AUDIO REF INPUT'],['o11',278,166,'DIGITAL OUT 1-1'],['o12',215,230,'DIGITAL OUT 1-2'],['o21',278,294,'DIGITAL OUT 2-1'],['o22',215,358,'DIGITAL OUT 2-2'],['wc',278,422,'WORD CLOCK'],['vid',215,490,'VIDEO REF IN']] },
  bnc3:{ name:'BNC3 (D8206/75, MF8210 only)', img:'d8206-rear-bnc3.svg', w:487, h:617, note:'Double-width BNC module: reference loop, 4 digital outs, 3 word clocks, video ref.', term:'hiz',
    pts:[['aesin',197,197,'AUDIO REF INPUT'],['aesin',284,197,'INPUT LOOP'],['o11',197,294,'DIGITAL OUT 1-1'],['o12',284,294,'DIGITAL OUT 1-2'],['o21',197,393,'DIGITAL OUT 2-1'],['o22',284,393,'DIGITAL OUT 2-2'],['wc',197,492,'WORD CLOCK 1'],['vid',284,492,'VIDEO REF IN']] },
  tb8205p:{ name:'TB8205P (D8206/110)', img:'d8206-rear-tb8205p.svg', w:476, h:611, note:'Pluggable screw terminals, 110 Ω balanced: REF INPUT ± with passive loop, OUT 1-1…2-2 ±, WORD CLOCK 1–3, VIDEO REF IN ±.', term:'110',
    pts:[['aesin',162,132,'REF INPUT +'],['aesin',162,155,'REF INPUT −'],['o11',163,242,'DIGITAL OUT 1-1 +'],['o11',163,265,'DIGITAL OUT 1-1 −'],['o12',163,288,'DIGITAL OUT 1-2 +'],['o12',163,311,'DIGITAL OUT 1-2 −'],['o21',163,334,'DIGITAL OUT 2-1 +'],['o21',163,357,'DIGITAL OUT 2-1 −'],['o22',163,380,'DIGITAL OUT 2-2 +'],['o22',163,403,'DIGITAL OUT 2-2 −'],['wc',246,265,'WORD CLOCK 1 +'],['vid',246,311,'VIDEO REF IN +'],['wc',246,357,'WORD CLOCK 2 +'],['wc',246,403,'WORD CLOCK 3 +']] },
  tb8205p75:{ name:'TB8205P/75 (D8206/110)', img:'d8206-rear-tb8205p75.svg', w:487, h:611, note:'Screw terminals with an unbalanced BNC reference input.', term:'75',
    pts:[['aesin',237,140,'REF INPUT (BNC)'],['o11',178,242,'DIGITAL OUT 1-1 +'],['o12',178,288,'DIGITAL OUT 1-2 +'],['o21',178,334,'DIGITAL OUT 2-1 +'],['o22',178,380,'DIGITAL OUT 2-2 +'],['wc',261,265,'WORD CLOCK 1 +'],['vid',261,311,'VIDEO REF IN +'],['wc',261,357,'WORD CLOCK 2 +'],['wc',261,403,'WORD CLOCK 3 +']] },
  tb8205pv:{ name:'TB8205PV (D8206/110 video)', img:'d8206-rear-tb8205pv.svg', w:551, h:611, note:'Video BNC + audio ref screw terminals; “must be installed beside the power supply” (D8206-110_video.pdf).', term:'110',
    pts:[['vid',167,148,'VIDEO REF INPUT'],['aesin',264,131,'AUDIO REF +'],['aesin',264,154,'AUDIO REF −'],['o11',187,242,'DIG. OUT 1-1 +'],['o12',187,287,'DIG. OUT 1-2 +'],['o21',187,333,'DIG. OUT 2-1 +'],['o22',187,379,'DIG. OUT 2-2 +'],['wc',270,402,'WORD CLK 3 +']] },
};

/* ---------------- board (D8200-2 Gerber silk, 200 dpi) ---------------- */
const HX = [964,984,1004,1024,1054,1074,1094,1114,1144,1164,1184,1204,1234,1254];   // H1…H14 pad columns
const LEDS = [['AUDIO1','LED_0 · GREEN LED1 · internal reference','#7dff6a'],['AUDIO2','LED_1 · GREEN LED2 · audio reference lock','#7dff6a'],['PROC','LED_2 · YELLOW · video reference lock','#ffd84a'],['ERR','LED_3 · RED · errors / lost lock','#ff4a3a']];
const CHIPS = {
  pic:{x:358,y:76,w:52,h:296,t:'U1 PIC16C73A / 16F73',b:'pic'}, eprom:{x:508,y:82,w:104,h:296,t:'U2 27C512 SHARC boot EPROM',b:'eprom'},
  dsp:{x:676,y:56,w:268,h:318,t:'U3 ADSP-21061 SHARC',b:'dsp'}, cpld:{x:1066,y:156,w:140,h:148,t:'U4 EPM7128S CPLD',b:'cpld'},
  cs1:{x:1250,y:36,w:150,h:128,t:'U5 CS8420 #1 (Output 1)',b:'cs1'}, cs2:{x:1436,y:36,w:150,h:128,t:'U6 CS8420 #2 (reference in, Output 2)',b:'cs2'},
  ml:{x:1356,y:362,w:92,h:76,t:'U7 ML6431 video genlock',b:'ml'}, x1:{x:1360,y:262,w:50,h:84,t:'X1 3.58 MHz (PIC clock)',b:'pic'},
  osc:{x:974,y:16,w:92,h:76,t:'OSC2 24.576 MHz',b:'osc'}, xf:{x:1660,y:16,w:350,h:320,t:'T2–T8 pulse transformers, EL2280C drivers',b:'out'},
  p1:{x:2040,y:300,w:80,h:230,t:'P1 to rear module / MF82 backplane',b:'ref'},
};
function shuntSVG(x1,y1,x2,y2,col){ const x=Math.min(x1,x2)-11, y=Math.min(y1,y2)-11, w=Math.abs(x2-x1)+22, h=Math.abs(y2-y1)+22; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${col}" stroke="#000" stroke-width="2" opacity=".92"/>`; }
function boardSVG(t, opts){ opts=opts||{}; const p=passAt(t), L=p&&powered(t)? p.leds : [0,0,0,0], S=sched();
  let s=`<svg viewBox="-20 -10 2160 600" style="width:100%;background:var(--lane);border-radius:8px"><defs><filter id="d86g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <path d="M0,2 L2062,2 L2072,22 L2122,28 L2122,532 L2072,538 L2062,559 L0,559 Z" fill="#1f5c3a" stroke="#0d3320" stroke-width="3"/>
   <image href="${ASSET}d8206-board-pads-tin.png" x="0" y="0" width="2129" height="561"/><image href="${ASSET}d8206-board-silk-white.png" x="0" y="0" width="2129" height="561"/>`;
  // chips (hover/click)
  for (const k in CHIPS){ const c=CHIPS[k]; s+=`<rect class="d86chip" data-b="${c.b}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${opts.sel===c.b?'rgba(90,169,230,.28)':'rgba(0,0,0,0)'}" stroke="${opts.sel===c.b?'#5aa9e6':'none'}" stroke-width="4" style="cursor:pointer"><title>${c.t}</title></rect>`; }
  // LEDs
  LEDS.forEach((l,i)=>{ const y=30+i*20, on=L[i]; s+=`<g><title>${l[0]}: ${l[1]}</title><rect x="14" y="${y-8}" width="40" height="16" fill="#111"/><circle cx="12" cy="${y}" r="8" fill="${on?l[2]:'#2c332c'}" ${on?'filter="url(#d86g)"':''}/></g>`; });
  // trims
  [0,1].forEach(i=>{ const y=125+i*40, a=-150+300*D.pot[i]/255; s+=`<g class="d86pot" data-i="${i}" style="cursor:ns-resize"><title>${i?'RV2 lower trim: frequency (code2)':'RV1 upper trim: level (code1)'} — drag, scroll or click · code ${D.pot[i]}</title><rect x="30" y="${y-17}" width="160" height="34" fill="#2a4fa0" stroke="#173070" stroke-width="2" opacity=".85"/><circle cx="20" cy="${y}" r="13" fill="#d8dbe0" stroke="#555"/><line x1="${20-11*Math.cos(a*Math.PI/180)}" y1="${y-11*Math.sin(a*Math.PI/180)}" x2="${20+11*Math.cos(a*Math.PI/180)}" y2="${y+11*Math.sin(a*Math.PI/180)}" stroke="#222" stroke-width="3"/><text x="110" y="${y+7}" text-anchor="middle" font-size="20" font-weight="700" fill="#fff">${D.pot[i]}</text></g>`; });
  // monitor jack
  s+=`<g><title>MONITOR TRS jack → Output ${monitorSrc()} (H14)</title><rect x="0" y="428" width="52" height="54" fill="${monitorSrc()===1?'rgba(76,195,138,.35)':'rgba(90,169,230,.35)'}"/></g>`;
  // H1–H14 3-pin headers: OFF = shunt on top pair, ON = bottom pair (silk legend "ON / OFF")
  HX.forEach((x,i)=>{ const k=i+1, on=D.j[k]; s+=`<g class="d86j" data-k="${k}" style="cursor:pointer"><title>H${k} ${JDOC[k][0]}: ${on?'ON':'OFF'} — click to move</title><rect x="${x-12}" y="448" width="24" height="64" fill="rgba(0,0,0,0)"/>${shuntSVG(x,on?480:460,x,on?500:480,on?'#222':'#7a1f1f')}</g>`; });
  // H16 local / external (2×3), TERM1 (2×3)
  const h16Rows = D.h16==='ext' ? [65,85] : [85,105];
  s+=`<g class="d86h16" style="cursor:pointer"><title>H16 reference input: ${D.h16==='ext'?'External':'Local (MF82REF)'} — click to change</title><rect x="2004" y="52" width="50" height="66" fill="rgba(0,0,0,0)"/>${shuntSVG(2019,h16Rows[0],2019,h16Rows[1],'#222')}${shuntSVG(2039,h16Rows[0],2039,h16Rows[1],'#222')}</g>`;
  const tr = {75:45,110:65,hiz:85}[D.term1];
  s+=`<g class="d86term" style="cursor:pointer"><title>TERM1 audio reference termination: ${D.term1==='hiz'?'HiZ':D.term1+' Ω'} — click to change</title><rect x="1846" y="32" width="46" height="66" fill="rgba(0,0,0,0)"/>${shuntSVG(1859,tr,1879,tr,'#222')}</g>`;
  if (S.hang!==null && t>=S.hang) s+=`<text x="380" y="300" font-size="28" fill="#ffb43a" font-weight="700">PIC in "here goto here" — waiting for the watchdog</text>`;
  return s+`</svg>`;
}
function bindBoard(m){
  m.querySelectorAll('.d86j').forEach(g=>g.onclick=()=>A.jumper(+g.dataset.k));
  m.querySelectorAll('.d86h16').forEach(g=>g.onclick=()=>A.h16(D.h16==='ext'?'local':'ext'));
  m.querySelectorAll('.d86term').forEach(g=>g.onclick=()=>A.term1({75:'110',110:'hiz',hiz:'75'}[D.term1]));
  m.querySelectorAll('.d86pot').forEach(g=>{ const i=+g.dataset.i;
    g.onwheel=e=>{ e.preventDefault(); A.pot(i, D.pot[i]+(e.deltaY<0?3:-3)); };
    g.onclick=()=>{ A.pot(i, (D.pot[i]+16)%256); A.potLog(i); }; });
}
/* front edge drawn to scale from the same Gerber y-coordinates (card edge = 2.80″) */
function frontSVG(t){ const p=passAt(t), L=p&&powered(t)? p.leds:[0,0,0,0];
  let s=`<svg viewBox="0 0 230 600" style="width:100%;max-width:220px"><rect x="40" y="4" width="46" height="561" rx="3" fill="#1f5c3a" stroke="#0d3320" stroke-width="2"/><rect x="34" y="4" width="8" height="561" fill="#9aa0a6"/>`;
  LEDS.forEach((l,i)=>{ const y=4+30+i*20, on=L[i]; s+=`<g><title>${l[1]}</title><circle cx="40" cy="${y}" r="7" fill="${on?l[2]:'#2c332c'}" stroke="#000"/><text x="96" y="${y+4}" font-size="11" fill="var(--ink)">${['INT REF','AUDIO REF','VIDEO REF','ERROR'][i]}</text></g>`; });
  [0,1].forEach(i=>{ const y=4+125+i*40, a=-150+300*D.pot[i]/255; s+=`<g class="d86pot" data-i="${i}" style="cursor:ns-resize"><title>${i?'RV2 frequency':'RV1 level'} (10-turn) — scroll / click</title><circle cx="40" cy="${y}" r="9" fill="#d8dbe0" stroke="#555"/><line x1="${40-7*Math.cos(a*Math.PI/180)}" y1="${y-7*Math.sin(a*Math.PI/180)}" x2="${40+7*Math.cos(a*Math.PI/180)}" y2="${y+7*Math.sin(a*Math.PI/180)}" stroke="#222" stroke-width="2"/><text x="96" y="${y+4}" font-size="11" fill="var(--ink)">${i?'FREQ':'LEVEL'} · ${D.pot[i]}</text></g>`; });
  s+=`<g><title>MONITOR (TRS) → Output ${monitorSrc()}</title><circle cx="40" cy="${4+455}" r="13" fill="#111" stroke="#888" stroke-width="2"/><circle cx="40" cy="${4+455}" r="5" fill="#000"/><text x="96" y="${4+459}" font-size="11" fill="var(--ink)">MONITOR → OUT ${monitorSrc()}</text></g>`;
  return s+`<text x="4" y="590" font-size="9.5" fill="var(--ink2)">Front edge, to scale from D8200-2.SLK</text></svg>`; }
function rearSVG(t){ const R=REAR[D.rear], sc=0.62, W=R.w*sc, H=R.h*sc; const o1=outState(t,1), o2=outState(t,2), m=realMode(t);
  let s=`<svg viewBox="0 0 ${W+10} ${H+10}" style="width:100%;max-width:${Math.round(W+10)}px"><rect x="4" y="4" width="${W}" height="${H}" rx="6" fill="#17191b" stroke="#000"/><image href="${ASSET}${R.img}" x="4" y="4" width="${W}" height="${H}"/>`;
  R.pts.forEach(([k,x,y,lbl])=>{ const X=4+x*sc, Y=4+y*sc; let col='#555', cls='', tip=lbl;
    if (k==='aesin'){ const ok=aesAvail(t)&&D.h16==='ext'; col=ok?'#5aa9e6':'#444'; cls='d86aes'; tip+=` — ${D.aesPlug?'cable in':'empty'}, click to plug/unplug`; }
    else if (k==='vid'){ col=vidAvail(t)?'#ffd84a':'#444'; cls='d86vid'; tip+=` — ${D.vidPlug?'NTSC black in':'empty'}, click to plug/unplug`; }
    else if (k==='wc'){ col='#c58cff'; tip+=` — ${wcFs(t)/1000} kHz square wave`; }
    else { const o=k[1]==='1'?o1:o2; col = !o.on?'#444': o.silent?'#888':'#7dff6a'; tip+=` — ${o.on?(o.silent?'digital silence':'tone'):'off'} @ ${outFs(t)/1000} kHz`; }
    s+=`<g class="${cls}" style="cursor:${cls?'pointer':'default'}"><title>${tip}</title><circle cx="${X}" cy="${Y}" r="${k==='aesin'||k==='vid'?9:6}" fill="${col}" opacity=".85" stroke="#000"/></g>`; });
  return s+`</svg><div class="small muted" style="max-width:${Math.round(W+10)}px">CorelDRAW art: ${SIM.src(RMG_DIR+'D8206 - rear module options.cdr','D8206 - rear module options.cdr')} (2012|45), via its Corel PDF ${SIM.src(RMG_DIR+'D8206 - rear module options.pdf','export')}.</div>`; }
function bindRear(m){ m.querySelectorAll('.d86aes').forEach(g=>g.onclick=()=>A.plugAes()); m.querySelectorAll('.d86vid').forEach(g=>g.onclick=()=>A.plugVid()); }

/* ---------------- controls ---------------- */
function controlsHTML(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px">
   <label>Rear module <select id="d86rear">${Object.keys(REAR).map(k=>`<option value="${k}" ${k===D.rear?'selected':''}>${REAR[k].name}</option>`).join('')}</select></label>
   <label>AES ref fs <select id="d86fs">${REF_FS.map(f=>`<option value="${f}" ${f===D.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
   <button id="d86pa">${D.aesPlug?'Unplug':'Plug'} AES ref</button><button id="d86pv">${D.vidPlug?'Unplug':'Plug'} video ref</button>
   <button id="d86dr">Drop ${D.j[2]?'AES':'video'} ref 300 ms here</button>
   <label><input type="checkbox" id="d86cold" ${D.cold?'checked':''}> cold start at t = 0</label>
   <label><input type="checkbox" id="d86mf" ${D.mf82ref?'checked':''}> frame has MF82REF</label>
   <label>RV1 level <input type="range" id="d86r0" min="0" max="255" value="${D.pot[0]}"></label><label>RV2 freq <input type="range" id="d86r1" min="0" max="255" value="${D.pot[1]}"></label>
   <label>Firmware <select id="d86fw"><option value="105" ${D.fw==='105'?'selected':''}>v1.105 (2006)</option><option value="016" ${D.fw==='016'?'selected':''}>v1.103-016 custom</option></select></label>
   ${D.fw==='016'?`<button id="d86tg">016 toggle: ${D.toggle==='up'?'UP 44.1':'DOWN 48'}</button>`:''}
   <button id="d86rs">Factory defaults</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#d86fs')) return;
  q('#d86rear').onchange=e=>A.rear(e.target.value); q('#d86fs').onchange=e=>A.fs(+e.target.value);
  q('#d86pa').onclick=()=>A.plugAes(); q('#d86pv').onclick=()=>A.plugVid(); q('#d86dr').onclick=()=>A.drop();
  q('#d86cold').onchange=e=>A.cold(e.target.checked); q('#d86mf').onchange=e=>A.frame(e.target.checked);
  [0,1].forEach(i=>{ const el=q('#d86r'+i); el.oninput=e=>A.pot(i,+e.target.value); el.onchange=()=>A.potLog(i); });
  q('#d86fw').onchange=e=>A.fw(e.target.value); if (q('#d86tg')) q('#d86tg').onclick=()=>A.toggle(); q('#d86rs').onclick=()=>A.reset(); }
function jumperHTML(){
  const lv=a=>LVL_TXT[lvlIdx(D.j,a)];
  return `<div class="small" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:4px 8px">${Object.keys(JDOC).map(k=>{ const d=JDOC[k], on=D.j[k];
    const val = d[1]? (on?d[1]:d[2]) : (on?'ON':'OFF')+` (CH ${+k<=8?'A':'B'} = ${lv(+k<=8)} ${lv(+k<=8)==='VARIABLE'?'':'dBFS'})`;
    return `<button class="d86jb ${on?'on':''}" data-k="${k}" style="text-align:left;font-size:11.5px">H${k} ${d[0]}: <b>${val}</b></button>`; }).join('')}
   <button class="d86h16b" style="text-align:left;font-size:11.5px">H16 Ref input: <b>${D.h16==='ext'?'External':'Local (MF82REF)'}</b></button>
   <button class="d86termb" style="text-align:left;font-size:11.5px">TERM1: <b>${D.term1==='hiz'?'HiZ':D.term1+' Ω'}</b></button></div>`; }
function bindJumpers(m){ m.querySelectorAll('.d86jb').forEach(b=>b.onclick=()=>A.jumper(+b.dataset.k)); m.querySelectorAll('.d86h16b').forEach(b=>b.onclick=()=>A.h16(D.h16==='ext'?'local':'ext')); m.querySelectorAll('.d86termb').forEach(b=>b.onclick=()=>A.term1({75:'110',110:'hiz',hiz:'75'}[D.term1])); }

/* ---------------- lanes ---------------- */
function stateBar(c,X,t0,t1,y,h,f,colors,labels){ const N=400; let prev, xs=X(t0); for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, v=f(t); if(i===0){prev=v;continue;} if(v!==prev||i===N){ const xe=X(t); c.fillStyle=colors(prev); c.globalAlpha=.55; c.fillRect(xs,y+4,Math.max(1,xe-xs),h-8); c.globalAlpha=1; if(xe-xs>60){ c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(String(labels(prev)).slice(0,Math.floor((xe-xs)/6)),xs+4,y+h/2+3);} xs=xe; prev=v; } } }
function wave(c,X,t0,t1,y,h,f,col){ const W=X(t1)-X(t0), N=Math.min(1600,Math.max(200,W*2)); c.strokeStyle=col; c.lineWidth=1.2; c.beginPath(); for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, v=f(t); const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke();
  c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke(); }
function lanes(){ const css=SIM.css, S=sched(); return [
  {label:'Reference in', h:26, draw(c,X,t0,t1,y,h){ if (D.j[2]){ if (!aesAvail((t0+t1)/2)){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText('no AES reference',X(t0)+6,y+h/2+4); } SIM.pulses(c,X,t0,t1,y,h,1/aesFs(),0,0.5/aesFs(),css('--accent2'),`AES frames ${aesFs()/1000} kHz`); }
      else { if (!vidAvail((t0+t1)/2)){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText('no video',X(t0)+6,y+h/2+4); return; } const px=X(t0+1/15734.27)-X(t0); if (px>3) SIM.pulses(c,X,t0,t1,y,h,1/15734.27,0,4.7e-6,css('--warn'),'H sync'); else SIM.pulses(c,X,t0,t1,y,h,1/59.94,0,0.0005,css('--warn'),'NTSC fields 59.94 Hz'); }
      if (D.loss){ c.fillStyle=css('--bad'); c.globalAlpha=.2; c.fillRect(X(D.loss.at),y,X(D.loss.until)-X(D.loss.at),h); c.globalAlpha=1; } }},
  {label:D.j[2]?'CS8420 #2 UNLOCK (raw)':'ML6431 lock (raw)', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,D.j[2]?ch2LockRaw:mlLockRaw,v=>v?css('--accent'):css('--bad'),v=>v?'locked':'unlocked'); }},
  {label:'PIC main loop', h:28, draw(c,X,t0,t1,y,h){ const px=X(t0+PASS)-X(t0);
    if (t1<S.t0){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(t1<S.start+PWRT?'power-up timer (72 ms)':'init',X(t0)+6,y+h/2+4); return; }
    if (px<3){ stateBar(c,X,t0,t1,y,h,t=>{ const p=passAt(t); return !p?'pre':p.hung?'hung':p.init?'init':'run'; },v=>v==='hung'?css('--bad'):v==='init'?css('--warn'):v==='pre'?css('--ink2'):css('--accent'),v=>v==='hung'?'here: goto here':v==='init'?'SHARC_IN_INIT (waiting for 0xE4)':v==='pre'?'power-up / init':`passes of ${SIM.fmtDur(PASS)} (${'inferred'})`); return; }
    const k0=Math.max(0,Math.floor((t0-S.t0)/PASS)), k1=Math.floor((t1-S.t0)/PASS);
    for (let k=k0;k<=k1;k++){ const ps=S.t0+k*PASS; const pp=S.P[k]; if(!pp) continue; if (pp.hung){ c.fillStyle=css('--bad'); c.globalAlpha=.4; c.fillRect(X(ps),y+3,X(ps+PASS)-X(ps),h-6); c.globalAlpha=1; continue; }
      STEPS.forEach((s,j)=>{ const a=ps+STEP_FRAC[j]*PASS, b=a+s[1]*PASS; c.fillStyle=j%2?css('--accent2'):css('--accent'); c.globalAlpha=.7; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-.5),h-6); c.globalAlpha=1; if(X(b)-X(a)>90){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' · ')[0],X(a)+3,y+h/2+3);} }); } }},
  {label:'Link_to_SHARC nibble', h:20, draw(c,X,t0,t1,y,h){ const px=X(t0+PASS)-X(t0); if (px<10){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(`one nibble per pass · full 16-nibble message every ${SIM.fmtDur(16*PASS)}`,X(t0)+6,y+h/2+4); return; }
    const k0=Math.max(0,Math.floor((t0-S.t0)/PASS)), k1=Math.floor((t1-S.t0)/PASS); for (let k=k0;k<=k1;k++){ const pp=S.P[k]; if(!pp||pp.hung) continue; const a=S.t0+k*PASS; c.fillStyle=pp.nib<2?css('--warn'):pp.nib<8?css('--accent2'):css('--accent'); c.globalAlpha=.45; c.fillRect(X(a)+1,y+3,X(a+PASS)-X(a)-2,h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText(pp.nib.toString(16),X(a)+3,y+h/2+4); } }},
  {label:'debounce (bcount)', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>{ const p=passAt(t); return p&&p.deb?'deb':'-'; },v=>v==='deb'?css('--warn'):'transparent',v=>v==='deb'?'DEBOUNCE_ON: 31 stable passes':''); }},
  {label:'real_mode', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>powered(t)?realMode(t):-1,v=>v===0xd?css('--accent2'):v===7?css('--warn'):v===0?css('--bad'):css('--ink2'),v=>v<0?'off':MODE_NAME[v]); }},
  {label:'LEDs 1 · 2 · Y · R', h:30, draw(c,X,t0,t1,y,h){ const cols=['#3cb043','#3cb043','#e0b000','#d33a2c']; for (let i=0;i<4;i++) stateBar(c,X,t0,t1,y+i*7-1,12,t=>{ const p=passAt(t); return powered(t)&&p? p.leds[i]:0; },v=>v?cols[i]:'transparent',()=>''); }},
  {label:'Output 1 TX (CS8420 #1)', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>{ const o=outState(t,1); return !o.on?'off':o.silent?'sil':outClockOK(t)?'tone':'bad'; },v=>v==='tone'?css('--accent'):v==='sil'?css('--ink2'):v==='bad'?css('--bad'):'transparent',v=>({off:'TXOFF / delay',sil:'digital silence',tone:'tone',bad:'tone on an unlocked clock'})[v]); }},
  {label:'Output 2 TX (CS8420 #2)', h:20, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>{ const o=outState(t,2); return !o.on?'off':o.silent?'sil':outClockOK(t)?'tone':'bad'; },v=>v==='tone'?css('--accent'):v==='sil'?css('--ink2'):v==='bad'?css('--bad'):'transparent',v=>({off:'off',sil:'digital silence (never muted: reg 3 forced 0)',tone:'tone (never muted: reg 3 forced 0)',bad:'tone on an unlocked clock'})[v]); }},
  {label:'SHARC sample_proc_D8206', h:22, draw(c,X,t0,t1,y,h){ const fs=sharcFs((t0+t1)/2); if (t1<S.sharcAlive){ return; } SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.25/fs,css('--accent'),`${fs/1000} kHz samples (sampl_gn ≥ 2)`);
    c.fillStyle=css('--play'); S.resets.forEach(r=>{ if (r.t>=t0&&r.t<=t1){ c.fillRect(X(r.t)-1,y,3,h); c.font='10px sans-serif'; c.fillText('phase reset',X(r.t)+4,y+10);} }); }},
  {label:'Output 1 CH A (L)', h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,t=>sampleAt(t,1,0),css('--accent')); }},
  {label:'Output 1 CH B (R)', h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,t=>sampleAt(t,1,1),css('--accent2')); }},
  {label:'AES out frames', h:20, draw(c,X,t0,t1,y,h){ const fs=outFs((t0+t1)/2); SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.5/fs,css('--accent2'),`${fs/1000} kHz frames`); }},
  {label:'Word clock (OUT3)', h:22, draw(c,X,t0,t1,y,h){ const fs=wcFs((t0+t1)/2); SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.5/fs,'#9b59d0',`${fs/1000} kHz square${realMode((t0+t1)/2)===0xd&&aesFs()!==48000?' — NOT the reference rate':''}`); }},
];}

/* ---------------- inspector / trace ---------------- */
function meter(db){ const w=Math.max(0,Math.min(1,(db+60)/60)); return `<span style="display:inline-block;width:140px;height:10px;background:var(--chip);border:1px solid var(--line);vertical-align:middle"><span style="display:block;height:100%;width:${(w*100).toFixed(1)}%;background:${db>-0.01?'var(--bad)':db>-18.01?'var(--warn)':'var(--accent)'}"></span></span> <span class="mono">${isFinite(db)?db.toFixed(2):'−∞'} dBFS</span>`; }
function chTxt(c,t){ return c? `${realFreq(c.f,t).toFixed(c.varMode?1:2)} Hz · ${meter(dB(c.att))}${c.varMode?' <b>VAR</b>':''}` : '—'; }
function inspector(t){ const p=passAt(t), pr=params(t), m=realMode(t), o1=outState(t,1), o2=outState(t,2);
  const tm = REAR[D.rear].term, term = D.term1===tm || (tm==='hiz') ? '' : ` <span style="color:var(--warn)">— module wants ${tm==='hiz'?'HiZ':tm+' Ω'}</span>`;
  return `<table class="kv"><tr><th>Reference</th><td class="mono">H2 ${D.j[2]?'Audio':'Video'} · ${D.j[2]?`AES ${aesFs()/1000} kHz ${ch2LockRaw(t)?'locked':'UNLOCK'} (${D.h16==='ext'?'rear input':'MF82REF'})`:`video ${mlLockRaw(t)?'locked':'no lock'}`} · TERM1 ${D.term1}${term}</td></tr>
   <tr><th>PIC</th><td class="mono">${!p?'power-up/init':p.hung?'HUNG (custom 016 restart loop)':`pass ${Math.floor((t-sched().t0)/PASS)} · ${STEPS[Math.max(0,STEP_FRAC.filter(f=>f<=(((t-sched().t0)%PASS)+PASS)%PASS/PASS).length-1)][0]}`}${p&&p.init?' · SHARC_IN_INIT':''}</td></tr>
   <tr><th>MODE1 / MODE2</th><td class="mono">${p?'0x'+p.M1.toString(16).padStart(2,'0')+' / 0x'+p.M2.toString(16).padStart(2,'0'):'—'} · jmp_mode ${p?p.jmp.toString(16):'—'} · real_mode ${m.toString(16)}</td></tr>
   <tr><th>Mode</th><td>${powered(t)?MODE_NAME[m]:'off'}</td></tr>
   <tr><th>SHARC ji_input</th><td class="mono">${pr?'0x'+pr.ji.toString(16).padStart(4,'0'):'— (no jumpers_analize yet)'} · fs ${sharcFs(t)/1000} kHz · ${pr&&pr.w20?'20':'24'}-bit</td></tr>
   <tr><th>CH A</th><td>${pr?chTxt(pr.A,t):'—'}</td></tr><tr><th>CH B</th><td>${pr?chTxt(pr.B,t):'—'}</td></tr>
   <tr><th>Output 1</th><td class="mono">${o1.on?(o1.silent?'digital silence':'tone'):'off'} · ${outFs(t)/1000} kHz${outClockOK(t)?'':' · clock unlocked!'}</td></tr>
   <tr><th>Output 2</th><td class="mono">${o2.on?(o2.silent?'digital silence':'tone'):'off'} · ${outFs(t)/1000} kHz</td></tr>
   <tr><th>Word clock</th><td class="mono">${wcFs(t)/1000} kHz (CNT1 frame) · MONITOR = Output ${monitorSrc()}</td></tr>
   <tr><th>LEDs</th><td class="mono">${(p&&powered(t)?p.leds:[0,0,0,0]).map((v,i)=>(v?'●':'○')+' '+['INT','AUDIO','VIDEO','ERR'][i]).join(' · ')}</td></tr></table>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a jumper on the board (H1–H14, H16, TERM1), turn RV1/RV2, or plug and unplug references on the rear module.</div>'; }
function firmwareEvents(t){ const S=sched(); const out=[]; S.P.forEach(p=>{ if (p.ev && p.ev.length && p.t<=t) p.ev.forEach(e=>out.push([p.t,e])); }); return out.slice(-12).reverse().map(([tt,e])=>`<div><span class="muted">${tt<0?'before t = 0':SIM.fmtT(tt)}</span> ${e}</div>`).join('')||'<div class="muted">No firmware events before the playhead.</div>'; }

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML=`${card('D8206 card — D8200 platform board (Gerber silk + solder mask), click the jumpers and trims', `<div id="d86b"></div><div id="d86c"></div>`)}
   <div class="grid2"><div>${card('Front edge and rear module', `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start"><div id="d86f" style="flex:0 0 200px"></div><div id="d86r" style="flex:1;min-width:220px"></div></div>`)}${card('Jumpers (manual “Programming the D8206”)', `<div id="d86jp"></div>`)}</div>
   <div>${card('What the firmware did (your last action)', `<div id="d86tr" class="log"></div>`)}${card('Firmware events up to the playhead', `<div id="d86ev" class="log"></div>`)}${card('State at the playhead', `<div id="d86in"></div>`)}</div></div>
   ${card('Timeline — one second of the card', `<canvas id="d86tl"></canvas><p class="small muted">PIC16C73A/16F73 at 3.58 MHz (${(TCY*1e6).toFixed(3)} µs per instruction). Pass length ${SIM.fmtDur(PASS)} is ${inf} from the <span class="mono">Hysterisis</span> comment; debounce (31 passes), output delay (85 passes), SHARC timeout (256 passes) and the 16-nibble message are counts from the code. Power-up timer, SHARC boot and PLL lock times are ${inf}.</p>`)}
   ${card('Action log', `<div id="d86lg" class="log"></div>`)}`;
  let cv=-1;
  SIM.on('time',()=>{ const t=SIM.t; if (cv!==D.actN){ cv=D.actN; m.querySelector('#d86c').innerHTML=controlsHTML(); bindControls(m); } m.querySelector('#d86b').innerHTML=boardSVG(t); m.querySelector('#d86f').innerHTML=frontSVG(t); m.querySelector('#d86r').innerHTML=rearSVG(t)+`<div class="small muted">${REAR[D.rear].note}</div>`; m.querySelector('#d86jp').innerHTML=jumperHTML();
    bindBoard(m); bindRear(m); bindJumpers(m);
    m.querySelector('#d86tr').innerHTML=traceHTML(); m.querySelector('#d86ev').innerHTML=firmwareEvents(t); m.querySelector('#d86in').innerHTML=inspector(t);
    m.querySelector('#d86lg').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#d86tl'),lanes(),{labelW:170}); });
}
let lesson=0;
const pA=()=>params(0.99), oS=w=>outState(0.99,w);
const LESSONS=[
  {title:'Meet the D8206', body:`<p>The D8206 is an MF82 frame card that generates <b>DARS</b> (digital audio reference signal): AES tone or digital silence on two outputs (each with two copies on the rear module), plus a <b>word clock</b>. It locks to an AES reference, NTSC video black, or falls back to its internal 48 kHz.</p><p>Everything is set with berg jumpers <b>H1–H14</b> along the bottom of the board, <b>H16</b> (where the reference comes from) and <b>TERM1</b> (its termination). Two 10-turn trims on the front edge set level (upper, RV1) and frequency (lower, RV2) in VARIABLE mode.</p><p class="muted">The tutorial checks the state at t = 0.99 s, after the card has started and settled.</p>`, check:()=>true, auto:true},
  {title:'1 · Choose the reference', body:`<p>Out of the box H2 is OFF: the card wants <b>video</b>. Lock it to the house AES reference instead.</p><p><b>Goal:</b> H2 ON (Audio), AES reference plugged in, and the second green LED (AUDIO REF) lit.</p>`, check:()=>D.j[2]&&passAt(0.99)&&passAt(0.99).leds[1]===1, hint:'Click H2 on the board (or its button), and make sure the AES reference is plugged in on the rear module.'},
  {title:'2 · Set channel A to −20 dBFS', body:`<p>CH A level is three jumpers H6 H7 H8 (manual table). ON ON ON = 0 dBFS; OFF ON OFF = −20 dBFS.</p><p><b>Goal:</b> CH A at −20 dBFS, 1 kHz.</p>`, check:()=>{ const p=pA(); return p && p.A.idx===5 && !p.A.fb; }, hint:'Set H6 OFF, H7 ON, H8 OFF; keep H5 ON (1 kHz).'},
  {title:'3 · Channel B: 400 Hz at −18 dBFS', body:`<p>H9 picks CH B frequency (ON 1 kHz, OFF 400 Hz). H10 H11 H12 OFF ON ON = −18 dBFS.</p><p><b>Goal:</b> CH B 400 Hz at −18 dBFS.</p>`, check:()=>{ const p=pA(); return p && p.B.idx===4 && p.B.fb===1; }, hint:'H9 OFF, H10 OFF, H11 ON, H12 ON.'},
  {title:'4 · Silence on Output 2', body:`<p>H3 and H4 choose tone or digital silence for Output 1 and Output 2. The SHARC writes zeros into that output's buffer; the clock and channel status keep running, which is what a DARS is for.</p><p><b>Goal:</b> Output 1 tone, Output 2 silence.</p>`, check:()=>{ const p=pA(); return p && !p.s1 && p.s2; }, hint:'H4 OFF.'},
  {title:'5 · Monitor jack', body:`<p>The TRS jack on the front edge carries Output 1 or Output 2 (H14), for an Audio Bit Buddy™ or a quick patch.</p><p><b>Goal:</b> route Output 2 to the jack.</p>`, check:()=>!D.j[14], hint:'H14 OFF.'},
  {title:'6 · Variable level and frequency', body:`<p>Set a channel's level jumpers all OFF to get <b>VARIABLE</b>: the upper trim (RV1) sets the level, the lower (RV2) the frequency (20 Hz … 22 kHz on a log table).</p><p><b>Goal:</b> CH A variable, about 440 Hz (±10 Hz).</p>`, check:()=>{ const p=pA(); return p && p.A.varMode && Math.abs(realFreq(p.A.f,0.99)-440)<=10; }, hint:'H6, H7, H8 all OFF, then drag the “RV2 freq” slider to code ≈ 113 (445 Hz) or 112 (433 Hz).'},
  {title:'7 · 20-bit output', body:`<p>H1 OFF makes 20-bit words: the PIC calls <span class="mono">set_20bit</span> (CS8420 serial formats) and the SHARC shifts by 12 instead of 8. (testing_pro.wpd step 6 says “Set H2=Off” for 20 bits — it means H1.)</p><p><b>Goal:</b> 20-bit.</p>`, check:()=>{ const p=pA(); return p && p.w20; }, hint:'H1 OFF.'},
  {title:'8 · Lose the reference', body:`<p>Press “Drop … ref 300 ms here” with the playhead near 0.3 s. Watch the timeline: 31 passes of debounce, then <span class="mono">MODE_0_handler</span>: first green + red (testing_pro: “the reference signal is not locked”), Output 1 muted for 85 passes after each mode change. Output 2 is never muted.</p><p><b>Goal:</b> record a dropout.</p>`, check:()=>D.loss!==null, hint:'Move the playhead to about 0.3 s and press “Drop … 300 ms here”.'},
  {title:'9 · A 110 Ω installation', body:`<p>For balanced plants the D8206/110 uses screw-terminal modules. Choose <b>TB8205P</b> and terminate the reference at 110 Ω on TERM1.</p><p><b>Goal:</b> TB8205P with TERM1 = 110.</p>`, check:()=>D.rear==='tb8205p'&&D.term1==='110', hint:'Pick TB8205P in “Rear module”, then click TERM1 on the board until it reads 110.'},
  {title:'Done', body:`<p>The <b>Software</b> tab follows the PIC loop, the nibble link and the SHARC tone generator; <b>Findings</b> lists what the code really does with H13, Output 2 muting and the word clock.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — setting up a D8206 (manual D8206MAN.pdf and testing_pro.wpd)', `<ol id="d86ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="d86lz"></div>${card('State at 0.99 s', `<div id="d86in"></div>`)}</div>
   <div>${card('The card', `<div id="d86b"></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px"><div id="d86r" style="flex:1;min-width:200px"></div></div><div id="d86c"></div><div id="d86jp" style="margin-top:8px"></div>`)}${card('What the firmware did', `<div id="d86tr" class="log"></div>`)}</div></div>`;
  let cv=-1;
  const draw=()=>{ const t=SIM.t; if (cv!==D.actN){ cv=D.actN; m.querySelector('#d86c').innerHTML=controlsHTML(); bindControls(m); } m.querySelector('#d86b').innerHTML=boardSVG(t); m.querySelector('#d86r').innerHTML=rearSVG(t); m.querySelector('#d86jp').innerHTML=jumperHTML(); bindBoard(m); bindRear(m); bindJumpers(m);
    m.querySelector('#d86tr').innerHTML=traceHTML(); m.querySelector('#d86in').innerHTML=inspector(0.99);
    m.querySelector('#d86ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${(!l.auto&&l.check())?' ✓':''}</li>`).join(''); m.querySelectorAll('#d86ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i;draw();});
    const L=LESSONS[lesson], ok=L.check(); m.querySelector('#d86lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="d86pv">◀ Back</button><button id="d86nx">Next ▶</button><button id="d86r0">Restart</button></div>`;
    m.querySelector('#d86pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#d86nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#d86r0').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time',draw);
}
/* AES3 subframe at the playhead (Output 1) */
function aesBits(t){ const fs=outFs(t), n=Math.floor(t*fs), fr=n%192, pr=params(t), w20=pr&&pr.w20; const sub=[];
  for (const side of [0,1]){ const v=sampleAt(n/fs,1,side); let s=Math.round(v*8388607); if (w20) s&=~0xF; if (s<0) s+=1<<24;
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
    const cs0 = 0x01 | (fs===48000?0x04: fs===44100?0x08: fs===32000?0x0C:0x00)<<4;   // professional, fs code (AES3 byte 0)
    bits[30]= fr<8 ? (cs0>>fr)&1 : 0; let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    sub.push({pre: side?'Y':(fr===0?'Z':'X'), bits, v, raw:s}); }
  return {n, fr, fs, sub}; }
function biphase(pre,bits,startLevel){ const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=[]; const inv=startLevel?0:1; P.forEach(b=>lv.push(inv?1-b:b)); let cur=lv[lv.length-1]; for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if(bits[i]) cur=1-cur; lv.push(cur);} return lv; }
function viewSecond(m){
  m.innerHTML=`<div class="grid3">${card('Audio path', `<div id="d86s1"></div>`)}${card('Control path (PIC ↔ SHARC)', `<div id="d86s2"></div>`)}${card('Tone accuracy', `<div id="d86s3"></div>`)}</div>
   ${card('Output 1 AES3 frame at the playhead (biphase-mark, one subframe per channel)', `<canvas id="d86sc"></canvas><div id="d86bits" class="small mono" style="margin-top:6px"></div>`)}
   ${card('Tone samples around the playhead (dots = SHARC samples, line = the converted output)', `<canvas id="d86ts"></canvas>`)}`;
  SIM.on('time',()=>{ const t=SIM.t, fs=outFs(t), sfs=sharcFs(t), pr=params(t);
    const cyc = SHARC_CLK/sfs;
    m.querySelector('#d86s1').innerHTML=`<table class="kv"><tr><th>SHARC samples</th><td class="mono">${sfs.toLocaleString()} × 2 channels</td></tr><tr><th>SHARC cycles / sample</th><td class="mono">${cyc.toFixed(0)} at ${SHARC_CLK/1e6} MHz ${inf}</td></tr><tr><th>Per sample</th><td class="mono">2 × testtone_init (2 float divides) + 2 × _sinf (6-term poly)</td></tr><tr><th>AES frames out</th><td class="mono">${fs.toLocaleString()} per output (× 2 copies each)</td></tr><tr><th>Word clock</th><td class="mono">${wcFs(t).toLocaleString()} cycles</td></tr><tr><th>Channel-status blocks</th><td class="mono">${(fs/192).toFixed(1)}</td></tr></table>`;
    m.querySelector('#d86s2').innerHTML=`<table class="kv"><tr><th>PIC passes</th><td class="mono">≈${Math.round(1/PASS)} × ${SIM.fmtDur(PASS)} ${inf}</td></tr><tr><th>SHARC messages</th><td class="mono">${(1/(16*PASS)).toFixed(0)} × 16 nibbles</td></tr><tr><th>Jumper → SHARC</th><td class="mono">31 passes debounce + ≤16 passes message ≈ ${((BCOUNT+1+16)*PASS*1e3).toFixed(0)} ms worst</td></tr><tr><th>Output 1 re-enable</th><td class="mono">85 passes ≈ ${(AESON*PASS*1e3).toFixed(0)} ms</td></tr><tr><th>Lost reference → fallback</th><td class="mono">≈ ${((BCOUNT+2)*PASS*1e3).toFixed(0)} ms</td></tr><tr><th>CS8420 SPI writes</th><td class="mono">18 per pass (flush8420reg)</td></tr></table>`;
    const rows=[['Fixed 1 kHz, SHARC',1000],['Fixed 400 Hz, SHARC',400]].map(([n,f])=>`<tr><th>${n}</th><td class="mono">${realFreq(f,t).toFixed(2)} Hz at ${sfs/1000} kHz</td></tr>`).join('');
    m.querySelector('#d86s3').innerHTML=`<table class="kv">${rows}<tr><th>1999 EPROM table, 44.1 kHz 400 Hz</th><td class="mono">112 samples/cycle → 393.75 Hz</td></tr><tr><th>1999 EPROM table, 44.1 kHz 1 kHz</th><td class="mono">44 samples/cycle → 1002.27 Hz</td></tr><tr><th>Variable step</th><td class="mono">${(100*(Math.pow(1100,1/255)-1)).toFixed(2)} % freq · 0.352 dB level</td></tr></table>`;
    // scope
    const F=aesBits(t), cv=m.querySelector('#d86sc'); const {c,w}=SIM.canvas(cv,150); const lvA=biphase(F.sub[0].pre,F.sub[0].bits,0), lvB=biphase(F.sub[1].pre,F.sub[1].bits,lvA[lvA.length-1]); const lv=lvA.concat(lvB), cw=(w-20)/lv.length;
    const zones=[[0,8,SIM.css('--warn'),'preamble'],[8,16,SIM.css('--ink2'),'aux / LSBs'],[16,56,SIM.css('--accent'),'audio'],[56,64,SIM.css('--accent2'),'V U C P']];
    [0,64].forEach(off=>zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; if((b-a)*cw>30) c.fillText(lb,12+(off+a)*cw,104); }));
    c.strokeStyle=SIM.css('--ink'); c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?30:80; i?c.lineTo(x,y):c.moveTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
    c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${F.sub[0].pre}) CH A`,12,14); c.fillText('Subframe B (Y) CH B',12+64*cw,14); c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 of the channel-status block · cell ${SIM.fmtDur(1/(F.fs*128))} · ${F.fs/1000} kHz`,10,130);
    const fmt=s=>s.bits.slice(4,28).reverse().join('');
    m.querySelector('#d86bits').innerHTML=F.sub.map((s,i)=>`${i?'B':'A'}: ${s.v.toFixed(5)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} (MSB…LSB ${fmt(s)})${pr&&pr.w20?' — 20-bit: 4 LSBs zero':''} · V=0 U=0 C=${s.bits[30]} P=${s.bits[31]}`).join('<br>')+`<br><span class="muted">C bits: AES3 professional byte 0 with the fs code; the exact bytes built by <span class="mono">d820xchs.asm</span> are not traced here (${inf}).</span>`;
    // tone samples
    const cv2=m.querySelector('#d86ts'); const g=SIM.canvas(cv2,160); const span=Math.max(48,Math.round(sfs*2.5/Math.max(100,pr?realFreq(pr.A.f,t):1000))); const n0=Math.floor(t*sfs)-Math.floor(span/2);
    g.c.strokeStyle=SIM.css('--grid'); g.c.beginPath(); g.c.moveTo(0,80); g.c.lineTo(g.w,80); g.c.stroke();
    [[0,SIM.css('--accent')],[1,SIM.css('--accent2')]].forEach(([side,col])=>{ g.c.strokeStyle=col; g.c.fillStyle=col; g.c.beginPath(); for (let i=0;i<=span;i++){ const v=sampleAt((n0+i)/sfs,1,side), x=10+i/span*(g.w-20), y=80-v*70; i?g.c.lineTo(x,y):g.c.moveTo(x,y);} g.c.stroke(); for (let i=0;i<=span;i++){ const v=sampleAt((n0+i)/sfs,1,side), x=10+i/span*(g.w-20), y=80-v*70; g.c.fillRect(x-1.5,y-1.5,3,3);} });
    g.c.fillStyle=SIM.css('--ink2'); g.c.font='11px sans-serif'; g.c.fillText(`${span} samples at ${sfs/1000} kHz · green CH A, blue CH B (Output 1)`,10,154); });
}
const BLOCKS={
  ref:{x:10,y:150,w:130,h:70,t:'Rear module',s:['AES ref in · video in','4 outs · word clock'],d:'BNC1/BNC3 (D8206/75) or TB8205P / P/75 / PV (D8206/110). H16 picks the rear AES input or the frame MF82REF bus; TERM1 terminates it (75 / 110 / HiZ).'},
  cs2:{x:170,y:150,w:150,h:80,t:'CS8420 #2 (U6)',s:['receives the AES ref','SRC · transmits Output 2'],d:'"REF" chip in flush8420reg. Its receiver supplies CH2_8420_LOCKED and RMCK2 (the recovered reference clock). Its transmitter is Output 2. reg 3 is always written as 0 ("MOVLW 0 ;TESTING").'},
  ml:{x:170,y:250,w:150,h:70,t:'ML6431 (U7)',s:['NTSC genlock, I²C','reg 0x80 = 48 kHz'],d:'Video black → audio clock. Programmed by set_ML6431_48/44 over the PIC I²C pins RB6/RB7; lock flag returns as FROM_ALTERA1 bit 7. NTSC 601 (0xA2).'},
  cpld:{x:350,y:150,w:150,h:80,t:'EPM7128S (U4)',s:['clock / frame routing','SPORT ↔ CS8420s','jumper reader'],d:'TO_ALTERA0..2 choose clock sources per mode (intrn256fs, RMCK2, VIDEOFS → CNT1/CNT2, OMCK1/2); OUT3 = CNT1 frame = word clock; reads 14 jumpers and JMP_14 routes the monitor jack.'},
  dsp:{x:530,y:150,w:160,h:80,t:'ADSP-21061 (U3)',s:['sample_proc_D8206','2 × sine per sample'],d:'Generates CH A (left) and CH B (right) with a float phase counter and a 6-term sine polynomial; level from tt_att_val or D8206_vol.dat; zero for silence per output.'},
  cs1:{x:720,y:150,w:150,h:80,t:'CS8420 #1 (U5)',s:['SRC → Output 1','TXOFF works'],d:'Output 1 transmitter. Gets the tone through its SRC and outputs at the reference rate in MODE d (OMCK1 = RMCK2).'},
  out:{x:900,y:150,w:130,h:80,t:'EL2280C + T2–T8',s:['2 copies per output','75 Ω / 110 Ω'],d:'Output drivers and transformers (d8200-1.bom). Each DARS appears twice on the module (OUT 1-1, 1-2, 2-1, 2-2).'},
  pic:{x:350,y:20,w:150,h:90,t:'PIC16C73A (U1)',s:['3.58 MHz','mode switching, LEDs','SPI + I²C'],d:'Main loop: A/D, Link_to_SHARC (nibbles via the CPLD), jmp_input/debounce, switch_8420_modes, LED_processing, flush8420reg, AES_output_control. v1.105 is assembled for the PIC16F73.'},
  osc:{x:170,y:20,w:150,h:70,t:'OSC2 24.576 MHz',s:['= 512 × 48 kHz','"intrn256fs"'],d:'Internal reference: MODE 0 / MODE f, and the SHARC sample clock in MODE d.'},
  fe:{x:530,y:20,w:160,h:90,t:'Front edge',s:['4 LEDs, RV1/RV2','MONITOR TRS'],d:'LED_0 internal (green 1), LED_1 audio (green 2), LED_2 video (yellow), LED_3 error (red). RV1 = level (code1), RV2 = frequency (code2).'},
  eprom:{x:720,y:20,w:150,h:70,t:'27C512 (U2)',s:['SHARC boot image'],d:'The SHARC boots from this EPROM. No image is in the archive.'},
};
const WIRES=[['ref','cs2','AES ref'],['ref','ml','video'],['cs2','cpld','I²S + RMCK2'],['ml','cpld','VIDEOFS'],['cpld','dsp','SPORT0/1'],['dsp','cpld',''],['cpld','cs1','serial in'],['cs1','out','Out 1'],['cs2','out','Out 2'],['cpld','out','word clk'],['pic','cpld','SPI 4 bytes'],['pic','fe','LEDs'],['osc','cpld','12.288/24.576'],['eprom','dsp','boot'],['fe','pic','RV1/RV2 AN1/AN0']];
function blockSVG(sel){ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 1050 340" style="width:100%"><defs><marker id="d86a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const off=(a==='dsp'&&b==='cpld')?14:(a==='cpld'&&b==='dsp')?-14:0; y1+=off; y2+=off;
    const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y,k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; }; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1);
    s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.4" marker-end="url(#d86a)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--accent2)">${l}</text>`:''}`; });
  for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
  return s+'</svg>'; }
function viewBlock(m){ let sel='dsp';
  m.innerHTML=`<div class="grid2">${card('Block diagram — D820x platform built as a D8206 (click a block)', `<div id="d86bd"></div>`)}<div>${card('Block', `<div id="d86bi"></div>`)}${card('Where it sits on the board', `<div id="d86bb"></div><p class="small muted">Chip positions read off the D8200-2 Gerber silk. Click a chip.</p>`)}</div></div>
   ${card('Signal flow per mode (set_MODE_x register comments)', `<table class="kv"><tr><th>Mode</th><th>SHARC clock</th><th>Outputs</th><th>Word clock (CNT1)</th><th>LED</th></tr>
     <tr><td>MODE d (H2 ON, AES locked)</td><td class="mono">intrn256fs 48 kHz</td><td>reference rate via SRC (OMCK1 = RMCK2, CS8420 #2 OUTC)</td><td class="mono">internal 48 kHz</td><td>green 2</td></tr>
     <tr><td>MODE 7 (H2 OFF, video locked)</td><td class="mono">RMCK2/VIDEOFS 48 kHz</td><td>video-locked 48 kHz</td><td class="mono">VIDEOFS</td><td>yellow</td></tr>
     <tr><td>MODE 0 (reference lost)</td><td class="mono">internal 48 kHz</td><td>internal 48 kHz</td><td class="mono">internal 48 kHz</td><td>green 1 + red</td></tr>
     <tr><td>MODE f (start-up)</td><td class="mono">internal</td><td>off until the SHARC answers</td><td class="mono">internal</td><td>all four on</td></tr></table><p class="small muted">CS8420 clock-flow bit meanings (OUTC, TXD, TXOFF) are read from the CS8420 register map; the routing words are copied from the code comments (${inf} where the comment is terse).</p>`)}`;
  const draw=()=>{ m.querySelector('#d86bd').innerHTML=blockSVG(sel); m.querySelector('#d86bb').innerHTML=boardSVG(SIM.t,{sel}); m.querySelectorAll('#d86bd [data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b;draw();}); m.querySelectorAll('#d86bb .d86chip').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]||BLOCKS.dsp; m.querySelector('#d86bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; }; draw(); }
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length),h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n_],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p}</text>${n_?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${n_}</text>`:''}`; });
  right.forEach(([p,n_],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p}</text>${n_?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${n_}</text>`:''}`; }); return s; }
function hdr(x,y,name,k){ const on=D.j[k]; return `<g><rect x="${x}" y="${y}" width="22" height="58" fill="var(--panel2)" stroke="var(--ink)"/>${[0,1,2].map(i=>`<circle cx="${x+11}" cy="${y+10+i*19}" r="4" fill="var(--ink)"/>`).join('')}<rect x="${x+4}" y="${y+(on?22:3)}" width="14" height="33" rx="3" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="${x+11}" y="${y+72}" font-size="10" text-anchor="middle" fill="var(--ink)">H${k}</text></g>`; }
const SHEETS=[
  {name:'1 · PIC16C73A / 16F73', note:'Port pins from d820x.h (PORTB/PORTC constants, ANAL_PIN1..4 ADCON0 codes); pin numbers from the 28-pin PIC16C73A package. v1.105 includes P16F73.INC.', svg:()=>chip(330,50,200,'U1 PIC16C73A',[['RA1/AN1 (3)','RV1 level → code1'],['RA0/AN0 (2)','RV2 freq → code2'],['RA2/AN2 (4)','remote L (H15, unused)'],['RA5/AN4 (7)','remote R (H15, unused)'],['RA4 (6)','TEST_PIN'],['OSC1/2 (9,10)','X1 3.58 MHz'],['RC6 (17)','RESET all chips'],['MCLR (1)','']],[['RC7 (18)','LED_0 INT'],['RB0 (21)','LED_1 AUDIO'],['RB1 (22)','LED_2 VIDEO'],['RB2 (23)','LED_3 ERR'],['RB3/RB4 (24,25)','ALTERA_A1/A0'],['RB5 (26)','ALTERA_CS'],['RB6/RB7 (27,28)','I²C SCL/SDA → ML6431'],['RC3/4/5 (14–16)','SCK / SDI / SDO'],['RC2/RC1 (13,12)','CS_8420_CH1 / CH2'],['RC0 (11)','CS_SHARC · 016 toggle']],'d820x.h, v1.105')},
  {name:'2 · Jumper field', note:'H1–H14 are 3-pin headers along the bottom edge (silk legend ON at the bottom pair, OFF at the top pair); read by the CPLD as FROM_ALTERA0/1 bits; ON reads 0. H16 and TERM1 are 2×3 straps from the manual figures.', svg:()=>{ let s=''; for (let k=1;k<=14;k++) s+=hdr(40+(k-1)*44+(k>4?14:0)+(k>8?14:0)+(k>12?14:0),40,'H',k);
      s+=`<text x="40" y="150" font-size="11" fill="var(--ink)">FROM_ALTERA0: b0 JMP1 · b1 JMP2 · b2 JMP3 · b3 JMP4 · b4 JMP5 · b5 JMP6 · b6 JMP7 · b7 JMP8</text><text x="40" y="168" font-size="11" fill="var(--ink)">FROM_ALTERA1: b0 JMP9 · b1 JMP10 · b2 JMP11 · b3 JMP12 · b4 JMP13 · b7 ML6431 lock</text>
      <text x="40" y="196" font-size="11" fill="var(--ink2)">→ input_reg1 = CH1lock CH2lock MLlock J13 J1 J2 J3 J4 · input_reg2 = J5 … J12 → debounce → MODE1 / MODE2 → SHARC ji_input bits 15…0</text>
      <rect x="40" y="220" width="60" height="80" fill="var(--panel2)" stroke="var(--ink)"/><text x="70" y="316" text-anchor="middle" font-size="11" fill="var(--ink)">H16 ${D.h16==='ext'?'EXT':'LOCAL'}</text><text x="110" y="250" font-size="10.5" fill="var(--ink2)">rear AUDIO REF IN ↔ CS8420 #2 RX</text><text x="110" y="266" font-size="10.5" fill="var(--ink2)">frame MF82REF ↔ CS8420 #2 RX</text>
      <rect x="380" y="220" width="60" height="80" fill="var(--panel2)" stroke="var(--ink)"/><text x="410" y="316" text-anchor="middle" font-size="11" fill="var(--ink)">TERM1 ${D.term1}</text><text x="450" y="240" font-size="10.5" fill="var(--ink2)">75 Ω / 110 Ω / HiZ across the reference input</text><text x="450" y="256" font-size="10.5" fill="var(--ink2)">(D8200-2 also has TERM2, TERM3 — not in the D8206 manual)</text>`; return s; }},
  {name:'3 · SHARC, CPLD, CS8420s', note:'Parts from d8200-1.bom (U2 27C512, U3 ADSP21061, U4 EPM7128 TQFP, U5 CS8420, U7 ML6431, OSC2 24.576 MHz). Routing words from set_MODE_7/d/0/f.', svg:()=>chip(60,60,170,'U4 EPM7128S',[['SPI A1/A0/CS','PIC'],['JMP 1–14','H1–H14'],['VIDEOFS','ML6431'],['RMCK2','CS8420 #2'],['intrn256fs','OSC2']],[['SPORT0/1','SHARC'],['ILRCLK/OLRCLK','CS8420s'],['OMCK1/2','CS8420s'],['OUT3','word clock'],['JACK','MONITOR']],'d8200_top.gdf')+chip(380,60,160,'U3 ADSP-21061',[['SPORT0 RX/TX','CH1 + PIC byte'],['SPORT1 RX/TX','CH2'],['BMS','U2 27C512']],[['FLAG1/2','SPORT ISR probes'],['FLAG3','main-loop probe']],'d820xcore.asm')+chip(660,40,150,'U5 CS8420 #1',[['SDIN','tone A/B'],['CS/CCLK/CDIN','PIC SPI']],[['TXP/TXN','Output 1'],['OMCK','RMCK2 (MODE d)']],'Output 1')+chip(660,190,150,'U6 CS8420 #2',[['RXP/RXN','AES ref'],['SDIN','tone A/B']],[['TXP/TXN','Output 2'],['RMCK','to CPLD']],'reference + Output 2')},
  {name:'4 · 1999 clock CPLD (D8206 - #cpld)', note:'Pin numbers and names copied from d8206.rpt (EPM7128STC100-6, MAX+plus II 9.6, compiled 05/05/2006): 10 inputs, 18 outputs, 26 of 128 logic cells, one 8-bit LPM_COUNTER.', svg:()=>chip(330,40,220,'d8206 EPM7128STC100-6',[['94','EXT256FS'],['93','REFSEL0'],['92','REFSEL1'],['99','VIDEOFS'],['97','24M576'],['96','33M868'],['98','24/33SEL'],['2 / 1 / 100','TXDATA1/2/3']],[['63','SHARC-CLK'],['76','PIC-CLK'],['83','256FS'],['64/65/75','TXSCLK1/2/3'],['77/79/78','TXFS1/2/3'],['71/72/84','RXSCLK1/2/3'],['70/85/80','RXFS1/2/3'],['67/68/69','RXDATA1/2/3']],'redrawn from the fitter report')},
];
function viewSchem(m){ let i=0;
  m.innerHTML=card('Schematic set — redrawn from pin and net names (not the original CAD)', `<div id="d86st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="d86sh" class="scroll"></div><p id="d86sn" class="small muted"></p><p class="small muted">The original ACCEL/P-CAD schematics (<span class="mono">d8200-1.sch</span>, <span class="mono">d8206.sch</span>, <span class="mono">d8206-2.sch</span>) are binary and were not parsed; these sheets are redrawn and labelled as such.</p>`);
  const draw=()=>{ m.querySelector('#d86st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#d86st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();});
    m.querySelector('#d86sh').innerHTML=`<svg viewBox="0 0 900 360" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[i].svg()}<text x="890" y="352" text-anchor="end" font-size="10" fill="var(--ink2)">REDRAWN · D8206 · sheet ${i+1}/${SHEETS.length}</text></svg>`; m.querySelector('#d86sn').textContent=SHEETS[i].note; };
  draw(); }
function viewSoft(m){
  m.innerHTML=`<div class="grid2">${card('PIC main loop (d820x.asm, #define D8206) — the lit box runs at the playhead', `<div id="d86fl"></div>`)}<div>${card('Mode state machine (switch_8420_modes)', `<div id="d86fsm"></div>`)}${card('Link_to_SHARC message (16 nibbles aaaadddd)', `<div id="d86nb"></div>`)}</div></div>
   <div class="grid2">${card('SHARC D8206_main → sample_proc_D8206', `<div id="d86sp"></div>`)}${card('CS8420 register writes in flush8420reg (this pass)', `<div id="d86rg"></div>`)}</div>
   ${card('Tone tables (live): D8206_frq.dat and D8206_vol.dat, 256 entries each', `<canvas id="d86tb"></canvas>`)}`;
  SIM.on('time',()=>{ const t=SIM.t, S=sched(), p=passAt(t), pr=params(t), m_=realMode(t);
    const k = p&&!p.hung ? STEP_FRAC.filter(f=>f<=(((t-S.t0)%PASS)+PASS)%PASS/PASS).length-1 : -1;
    let s=`<svg viewBox="0 0 520 ${STEPS.length*40+20}" style="width:100%">`; STEPS.forEach((st,j)=>{ const y=8+j*40, on=j===k&&!!p&&!p.init; const skip = p&&p.init&&j>=4; s+=`<rect x="10" y="${y}" width="500" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" opacity="${skip?.45:1}"/><text x="20" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${st[0]}</text><text x="20" y="${y+27}" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${st[2]}</text>`; });
    m.querySelector('#d86fl').innerHTML=s+'</svg>'+(p&&p.init?'<p class="small" style="color:var(--warn)">SHARC_IN_INIT: debounce, switch_8420_modes, LED_processing and AES_output_control return at once until the SHARC answers 0xE4.</p>':'');
    const node=(x,y,lbl,sub,on)=>`<g><circle cx="${x}" cy="${y}" r="40" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-2}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+14}" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    const ar=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#d86m)"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-4}" font-size="9.5" text-anchor="middle" fill="var(--accent2)">${l}</text>`;
    m.querySelector('#d86fsm').innerHTML=`<svg viewBox="0 0 500 250" style="width:100%"><defs><marker id="d86m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${node(60,125,'MODE f','startup',powered(t)&&m_===0xf)}${node(240,50,'MODE d','AES + SRC',m_===0xd)}${node(240,200,'MODE 7','video',m_===7)}${node(430,125,'MODE 0','internal 48k',m_===0)}
      ${ar(98,108,200,62,'0xE4, H2 ON')}${ar(98,142,200,190,'0xE4, H2 OFF*')}${ar(280,62,392,108,'CH2 unlock')}${ar(392,146,282,198,'')}<text x="300" y="185" font-size="9.5" fill="var(--accent2)">video back</text>${ar(392,112,282,74,'')}<text x="318" y="108" font-size="9.5" fill="var(--accent2)">AES back</text>${ar(272,184,388,134,'')}<text x="330" y="150" font-size="9.5" fill="var(--accent2)">video lost</text>
      <text x="10" y="240" font-size="10" fill="var(--ink2)">* at start MODE1 is still 0, so the first mode is always d; the real H2 arrives 31 passes later.</text></svg>`;
    const vals=[0xE,4,0,6].concat(p?[p.M1>>4,p.M1&15,p.M2>>4,p.M2&15]:[0,0,0,0]).concat([D.pot[0]>>4,D.pot[0]&15,D.pot[1]>>4,D.pot[1]&15,0,0,0,0]);
    const names=['FRAME hi','FRAME lo','reserved','PRODUCT 6','MODE1 hi','MODE1 lo','MODE2 hi','MODE2 lo','CODE1 hi','CODE1 lo','CODE2 hi','CODE2 lo','CODE3 hi','CODE3 lo','CODE4 hi','CODE4 lo'];
    m.querySelector('#d86nb').innerHTML=`<div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:3px">${names.map((n,i)=>`<div class="small mono" style="padding:3px;border-radius:5px;border:1px solid var(--line);background:${p&&p.nib===i?'var(--accent)':'var(--panel2)'};color:${p&&p.nib===i?'#fff':'var(--ink)'}">${i.toString(16)}${vals[i].toString(16)}<br><span style="font-size:9.5px">${n}</span></div>`).join('')}</div><p class="small muted">Byte = address nibble + data nibble. The SHARC's ctrl_proc only advances when the address matches CTRL_decod_stp and commits everything at nibble f. PIC receives 0xE4 back once the SHARC is running.</p>`;
    const b=(x,y,txt,on,w)=>`<rect x="${x}" y="${y}" width="${w||150}" height="30" rx="5" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+(w||150)/2}" y="${y+19}" text-anchor="middle" font-size="10.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${txt}</text>`;
    const run = t>=S.sharcAlive && pr;
    m.querySelector('#d86sp').innerHTML=`<svg viewBox="0 0 520 250" style="width:100%">${b(10,10,'wait sampl_gn ≥ 2',run)}${b(180,10,'ctrl_proc',run)}${b(350,10,'jumpers_analize_D8206',!!(run&&S.resets.some(r=>Math.abs(r.t-t)<PASS)))}
      ${b(10,70,'CH B: '+(pr&&pr.B.varMode?'frq/vol lktb[code]':'tt_freq_R, tt_att_R'),!!run)}${b(180,70,'testtone_init (÷)',!!run)}${b(350,70,'form_testtone_sampl',!!run)}
      ${b(10,130,'CH A: '+(pr&&pr.A.varMode?'frq/vol lktb[code]':'tt_freq_L, tt_att_L'),!!run)}${b(180,130,'_sinf (6-term poly)',!!run)}${b(350,130,'fix → tx_buf_CH1, CH2',!!run)}
      ${b(10,190,'H4 OFF → tx_buf_CH2 = 0',!!(pr&&pr.s2),245)}${b(265,190,'H3 OFF → tx_buf_CH1 = 0',!!(pr&&pr.s1),245)}</svg>
      <p class="small mono">t = c·f / 24000.0; if t ≥ 2 then c −= 2·24000/f; sample = sin(t·π)·att·0x7FFFFFFF ${pr?`· A: f=${pr.A.f.toFixed(1)} att=${pr.A.att.toPrecision(4)} · B: f=${pr.B.f.toFixed(1)} att=${pr.B.att.toPrecision(4)}`:''}</p>`;
    const r3 = m_===0xd?'0x00 (+bit3 if silence)':m_===7?'0x0A':m_===0?'0x09':'0x0A';
    m.querySelector('#d86rg').innerHTML=`<table class="kv"><tr><th>MAP</th><th>CS8420 #1 (Output 1)</th><th>CS8420 #2 (ref / Output 2)</th></tr>
      <tr><td>1 Misc 1</td><td class="mono">bit3 set “dither off for 8206 dsb july 24”</td><td class="mono">same</td></tr>
      <tr><td>2 Misc 2</td><td class="mono" style="color:var(--bad)">MOVLW 0 ;TESTING → 0x00</td><td class="mono">CH2_8420reg2 (HOLD=10)</td></tr>
      <tr><td>3 Data flow</td><td class="mono">${r3}${p&&!p.on1?' | 0x40 TXOFF':''}</td><td class="mono" style="color:var(--bad)">MOVLW 0 ;TESTING → 0x00 (intended ${r3}${p&&!p.on2Int?' | TXOFF':''})</td></tr>
      <tr><td>4 Clock flow</td><td class="mono">${m_===0?'0x01':m_===0xf?'0x04':'0x00'}</td><td class="mono">${m_===0xd?'0x0D (OUTC: recovered clock)':m_===0?'0x01':m_===0xf?'0x04':'0x00'}</td></tr>
      <tr><td>5/6 Serial formats</td><td class="mono" colspan="2">${pr&&pr.w20?'set_20bit: bits 5:4 = 01':'set_24bit: bits 5:4 = 00'}</td></tr>
      <tr><td>9, 17, 18</td><td class="mono" colspan="2">interrupt mask, receive-error mask, CS buffer control</td></tr></table>`;
    const cv=m.querySelector('#d86tb'); const {c,w,h}=SIM.canvas(cv,170); const x=i=>50+i/255*(w-70);
    c.strokeStyle=SIM.css('--line'); c.strokeRect(50,10,w-70,h-35); c.font='10px monospace';
    c.strokeStyle=SIM.css('--accent'); c.beginPath(); for (let i=0;i<256;i++){ const y=10+(1-Math.log10(FRQ(i)/20)/Math.log10(1100))*(h-35)/2; i?c.lineTo(x(i),y):c.moveTo(x(i),y);} c.stroke();
    c.strokeStyle=SIM.css('--warn'); c.beginPath(); for (let i=1;i<256;i++){ const y=10+(h-35)/2+(-dB(VOL(i))/90)*(h-35)/2; i>1?c.lineTo(x(i),y):c.moveTo(x(i),y);} c.stroke();
    c.fillStyle=SIM.css('--accent'); c.fillText('top: freq 20 Hz → 22 kHz (log axis)',60,24); c.fillStyle=SIM.css('--warn'); c.fillText('bottom: level −89.3 → 0 dB (0.352 dB/step, code 0 = silence)',60,(h-35)/2+24);
    c.fillStyle=SIM.css('--ink2'); c.fillText('code 0',50,h-12); c.fillText('255',w-40,h-12);
    [[0,'RV1 '+D.pot[0],'--play'],[1,'RV2 '+D.pot[1],'--accent2']].forEach(([i,l,col])=>{ c.strokeStyle=SIM.css(col); c.beginPath(); c.moveTo(x(D.pot[i]),10); c.lineTo(x(D.pot[i]),h-25); c.stroke(); c.fillStyle=SIM.css(col); c.fillText(l,x(D.pot[i])+3,h-28-i*12); }); });
}
function viewNotes(m){
  m.innerHTML=card('What the D8206 is up to — findings', `<ol>
   <li><b>H13 (44.1 kHz for video) does nothing.</b> In v1.105 <span class="mono">set_ML6431_44</span> writes the same <span class="mono">0x80</span> as <span class="mono">set_ML6431_48</span> (“48Kshould be 80 for 48k just testing”), and the SHARC's <span class="mono">jumpers_analize_D8206</span> sets both rates to 24000.0 (“f2=22050.0;Sept 6 2005 make both 48k Bugs ??”). v1.101/1.102 had the comment “should be 81 for 44.1k”. The manual says H13 OFF = 48 kHz, ON = Reserved; the code's bit reads 0 = 48 kHz / 1 = 44.1 kHz, so the manual's default (OFF) would select 44.1 — harmless only because the feature is disabled.</li>
   <li><b>Custom 016 restarts the PIC by hanging it.</b> <span class="mono">v1.103-016</span> reads the toggle on PORTC,0 (the same pin the header calls CS_SHARC) inside <span class="mono">set_ML6431_48</span> (0x80/0x81). If the toggle moves while in MODE 7, <span class="mono">main</span> jumps to <span class="mono">here goto here</span> with no <span class="mono">clrwdt</span>, so the watchdog reboots the card. OPTION_REG is never written, so the reset takes the default WDT prescale (≈2.3 s, ${inf}). The current SHARC source still divides by 24000.0, so a 44.1 kHz video clock would give 918.75 Hz instead of 1 kHz unless the 2004 SHARC build differed (${inf}).</li>
   <li><b>Output 2 can never be muted.</b> <span class="mono">flush8420reg</span> writes reg 3 (Data Flow) of CS8420 #2 as <span class="mono">MOVLW 0 ;TESTING</span>, discarding <span class="mono">shut_off_AES_output_CH2</span>'s TXOFF bit, the per-mode routing (MODE 7's 0x0A) and the <span class="mono">temp2</span> silence source bit of <span class="mono">set_MODE_d</span>. Reg 2 of CS8420 #1 is also forced to 0. Output 1 mutes for 85 passes after each mode change; Output 2 keeps transmitting through the clock switch.</li>
   <li><b>In audio-reference mode the word clock is not locked to the reference.</b> <span class="mono">AUD_OUTPUT_ROUTE B'10100000'</span> puts CNT1's frame on OUT3; <span class="mono">set_MODE_d</span> clocks CNT1/CNT2 from “intrn256fs” and only OMCK1 from RMCK2. The AES outputs follow the reference through the SRCs, but the word clock stays on the 24.576 MHz oscillator. With a 44.1 kHz reference the word clock still runs at 48 kHz (${inf} from the routing comments).</li>
   <li><b>The two DARS are not independent.</b> The manual says “two independent reference signals”; <span class="mono">sample_proc_D8206</span> writes the same CH A and CH B samples to both <span class="mono">tx_buf_CH1</span> and <span class="mono">tx_buf_CH2</span>. Only tone/silence (H3/H4) differs per output — which is what the d820x.h header says: “2 outputs, which independently can be set to test tone signal or Audio silence”.</li>
   <li><b>VARIABLE on both channels gives identical settings.</b> Both channels read <span class="mono">code1</span> (RV1, level) and <span class="mono">code2</span> (RV2, frequency). CODE3/CODE4 (remote pots) are sent but never used by the D8206 branch.</li>
   <li><b>Any change in the lock bits resets the tone phase.</b> <span class="mono">ji_input</span> includes MODE1's lock bits (15–13), and <span class="mono">jumpers_analize_D8206</span> runs on any change and ends with <span class="mono">tt_cnt_R = tt_cnt_L = 0</span>. Plugging or unplugging the AES reference while the card is on video still makes both tones jump in phase.</li>
   <li><b>“Internal reference” only ever shows with the red LED.</b> No jumper selects internal: <span class="mono">LED_processing</span> lights LED_0 (green 1) only in MODE 0, together with LED_3. testing_pro.wpd describes exactly this (“first green on, second green off and red on … not locked”). Confidence/biphase errors (<span class="mono">FLG_ERROR_CH2</span>) are read but never shown on the D8206, although the manual's red LED promises “confidence error”.</li>
   <li><b>Start-up always goes through MODE d.</b> Debounce is skipped while <span class="mono">SHARC_IN_INIT</span>, so when the SHARC answers 0xE4, <span class="mono">init_modes_after_SHARC_respond</span> applies MODE1 = 0 (audio, 24-bit). The real jumpers arrive 31 passes later. With the default H2 = Video the card starts as MODE d, falls to MODE 0, then switches to MODE 7. LEDs are all on (init's lamp test) until the SHARC answers; if it never does, <span class="mono">SHARC_link_control</span> reboots after 256 passes.</li>
   <li><b>The SHARC tone stays at 0 Hz if <span class="mono">ji_input</span> is 0.</b> <span class="mono">jumpers_analize_D8206</span> runs only when <span class="mono">ji_input</span> differs from <span class="mono">ji_input_old</span>, which starts at 0, and <span class="mono">tt_freq_L/R</span> start at 0.0. All jumpers ON (H13 “Reserved” too) with no reference locked gives silence instead of 0 dBFS tone.</li>
   <li><b>MODE_0_handler re-programs the ML6431 every pass.</b> While a reference is missing it calls <span class="mono">set_ML6431_48</span> (11 I²C bytes) on each pass before checking <span class="mono">real_mode</span>.</li>
   <li><b>Leftovers.</b> <span class="mono">MODE_d_handler</span>'s comment says “set mode 4”; the D8207-style <span class="mono">CALL delay ×3</span> is commented out (“for D8206 we have a lot of spare time”); the <span class="mono">refresh_run_stop</span> (v1.104) body is commented out; v1.105 assembles for the PIC16F73 (<span class="mono">#include "P16F73.INC"</span>) while every document says PIC16C73A.</li>
   <li><b>Documents disagree.</b> D8206MAN-rev1.rtf promises <i>four</i> DARS and lists no H4/H14 (matching the older <span class="mono">D8206TR3.cdr</span> terminal sheet with DIGITAL OUT 1–4 and an AUDIO IN); the 2003 PDF has two outputs × two copies. The functional description says AES 22–96 kHz, the manual 32–96 kHz. testing_pro.wpd step 6 says “Set H2=Off … 20 Active bits” (should be H1). <span class="mono">D8208MAN.WPD</span> filed in the D8206 folders is the D8205 manual text.</li>
   <li><b>The 1998–99 EPROM design could not hit 44.1 kHz tones exactly.</b> <span class="mono">#orig/DATA/DATA4401.ASM</span> stores 112 samples per cycle (“400 TONE, 112 SAMPLES”): 44100/112 = 393.75 Hz; <span class="mono">DATA4404.ASM</span> uses 44 samples for “1KHZ” = 1002.27 Hz. The first stored sample (0x072D51 = 0.0561 FS) confirms one cycle per table. The 48 and 32 kHz tables are exact. A separate 1999 clock CPLD (<span class="mono">D8206 - #cpld/d8206.rpt</span>) even selects between 24.576 and 33.868 MHz (24/33SEL) — the 44.1 kHz hardware path the later firmware never used.</li>
   <li><b>Artwork 2026|59: rear modules now from ${SIM.src(RMG_DIR+'D8206 - rear module options.cdr','D8206 - rear module options.cdr')} (CorelDRAW X3, 2012-01-16).</b> BNC1, BNC3, TB8205P, TB8205P/75 and TB8205PV are its vectors (black plate, white legends) through Corel's own ${SIM.src(RMG_DIR+'D8206 - rear module options.pdf','PDF export')}, replacing the recoloured 200-dpi PNGs. The TB8205PV drawing puts the VIDEO REF. INPUT BNC half off the left edge of the plate, and only that module carries the note “This termination must be installed beside the power supply”. The engineering folder holds two generations of the same pages: ${SIM.src(E+'D8206-75 rev1.cdr','D8206-75 rev1.cdr')}, ${SIM.src(E+'D8206-110A rev1.cdr','-110A rev1')}, ${SIM.src(E+'D8206-110B rev1.cdr','-110B rev1')} and ${SIM.src(E+'D8206-110_video rev1.cdr','-110_video rev1')} (2005) over the 2000–01 originals, all stored again in D8206 - #ARCHIVE.</li>
   <li><b>Misnamed files.</b> <span class="mono">d8206.DXF</span> (1999) is a “D8205,ISSUE.1” board with LEDs AUDIO/REF/PROC/ERR and jumpers H6–H21, not the H1–H16 numbering of the manual (which matches the D8200-2 Gerbers used here). The v1.100 snapshot folder contains <span class="mono">v1.103.pjt</span>.</li>
  </ol>`)+card('Assumptions', `<ul class="small"><li>PIC pass ${SIM.fmtDur(PASS)} ${inf} from the hysteresis comment (as in the D8208 plugin); step proportions inside a pass are ${inf}.</li><li>Power-up timer 72 ms, SHARC boot ${SHARC_BOOT*1e3} ms, CS8420 lock ${LOCK_T*1e3} ms, ML6431 genlock ${VLOCK_T*1e3} ms, SHARC CLKIN 24.576 MHz, watchdog 2.3 s: ${inf}.</li><li>LED_0..3 → AUDIO1/AUDIO2/PROC/ERR silk positions ${inf} from the manual's order (green 1, green 2, yellow, red).</li><li>H1–H14 shunt position for ON/OFF ${inf} from the silk legend; H16 strap pattern ${inf} from manual Figure 1.</li><li>CS8420 #1 receiver lock (MODE1 bit 7) is modelled as always 0 ${inf}.</li><li>The board art is the 2013|46 D8200-2 re-spin (P-CAD 2002 Gerbers); the 2000–06 cards used D8200 issue 1, whose PCB is binary.</li></ul>`)
  +card('Sources', `<ul class="small mono"><li>D8206 - #Master #MF82/D8206 - #Engineering/D8206MAN.pdf · D8206MAN-rev1.rtf · testing_pro.wpd · FUNCTIONAL DESCRIPTION.WPD · Amendment … Custom 016.doc</li><li>D8200 - #Engineering #MF82/d8200 - #d820x/pic/v105/v1.105 May15,2006/*.asm, d820x.h · pic/v1.101, v1.102, v1.103-016</li><li>…/d820x/sharc/d820xcore.asm · d820xdef.h · D8206_frq.dat · D8206_vol.dat</li><li>D8206 - #Engineering/D8206 - #cpld/d8206.rpt · D8206 - #orig/DATA/DATA*.ASM · d8206.DXF</li><li>d8200 - #PCB/d8200-1.bom · d8200 - #GERBERS/D8200-2.SLK, .TSM</li><li>8200 Series Rear Module options …/D8206 - rear module options.pdf · D8206-110_video.pdf · D8206-75 rev1.cdr · D8206TR3.cdr</li></ul>`);
}

SIM.register({
  id:'d8206', name:'D8206 · DARS / AES reference tone generator (2000|33)', duration:1,
  product:'D8206', year:2000, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8206 - #Master #MF82',
  summary:'An MF82 card that makes two AES reference outputs (tone or digital silence, two copies each) and a word clock, locked to an AES reference, NTSC black or an internal 48 kHz. It is the shared D820x platform (PIC, EPM7128S, ADSP-21061, two CS8420s, ML6431) built with #define D8206.',
  highlights:['All 14 jumpers, H16 and TERM1 live on the real D8200 board silk','Pass-by-pass PIC model: debounce, mode fallback, 85-pass output delay, SHARC handshake','SHARC sine generator with the real level and frequency tables','H13 44.1 kHz is disabled in code; Output 2 can never be muted','Five rear modules from the 2012 guide, clickable'],
  footnotes:[
    {text:'Rear-module art: BNC1, BNC3, TB8205P, TB8205P/75 and TB8205PV are vectors of the 2012 CorelDRAW guide, via its Corel PDF export (libcdr renders the terminal-block symbol font as giant text).', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8206 - rear module options.cdr'},
    {text:'The TB8205PV module (video + audio reference in) must be installed beside the power supply, per the note on its page; its VIDEO REF. INPUT BNC is drawn overhanging the plate edge.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8206 - rear module options.cdr'},
    {text:'The /110 terminal page exists as two alternative pages, D8206-110A and D8206-110B (2001, rev1 2005); the 2012 guide merges them into TB8205P, TB8205P/75 and TB8205PV.', src:'#MF8200 #SERIES/D8206 - #Master #MF82/D8206 - #Engineering/D8206-110B rev1.cdr'},
    {text:'D8206TR3.cdr (2000) is the older terminal sheet with DIGITAL OUT 1–4 and an AUDIO IN, matching the rev1 manual’s four DARS rather than the two outputs × two copies of the shipped card.', src:'#MF8200 #SERIES/D8206 - #Master #MF82/D8206 - #Engineering/D8206TR3.cdr'},
    {text:'Every D8206 CDR in D8206 - #Engineering is stored a second time, same date and size, in D8206 - #ARCHIVE.', src:'#MF8200 #SERIES/D8206 - #Master #MF82/D8206 - #Engineering/D8206 - #ARCHIVE/D8206TR3.cdr'},
  ],
  depth:'Full model',
  stepUnits:[{label:'1 PIC pass (inferred)',period:()=>PASS},{label:'1 SHARC sample',period:()=>1/48000},{label:'1 ms',period:()=>0.001},{label:'16 passes (1 message)',period:()=>16*PASS}],
  zooms:[[1,'1 s (whole)'],[0.25,'250 ms'],[0.05,'50 ms'],[0.016,'16 ms (4 passes)'],[0.004,'4 ms (1 pass)'],[0.0005,'500 µs'],[0.0001,'100 µs']],
  defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
