/* =====================================================================
   ABS-1 — Audio Bit Spitter, portable AES/EBU + analog tone generator
   (Ward-Beck Systems, 1997|30 – 2005|38)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in "ABS1 - #Master/ABS-1 - Bit Spitter - #Engineering/"):
   - V100/abs1v103.asm (and ABS1V100/101/102/1XX.ASM, *.ERR, ABS1V100.PJT)
       INIT, MAIN, SCAN, MUX, BOUNCE, PROCESS, chng_freq, chng_lvl, DELVIS,
       REFRESH, sft_out, ext_lock, ext_freq, ext_setup, unlock, DELAY
   - abs.rpt / ABS.FIT (MAX+PLUS II 9.6, 2005-12-20, EPM7064SLC44-7): the fitted
       equations of |abs-1:100| (clocks) and |abs-2:2| (counters + serialiser);
       ABS-1.FIT / ABS-1.RPT (1997, EPM7032LC44-6); ABS.GDF / ABS-2.GDF symbol names
   - DATA/ABSDATA.ASM, DATA32/44/48.ASM, DATA3201…DATA4804.ASM, CHKLIST.MS
       (EPROM tone tables, ORG map, HEXBIN.EXE → DATAALL.BIN)
   - ABS1 SCH PG 1–4.pdf (ISS 3, 14 Oct 1998): U1 74HC4094, U3 27512 + PIC16C63A,
       U4 CS8412, U5 EPM7064, U6 CS8402A, U8 ICS9120-08 (X1 14.318 MHz), JTAG header
   - ABS-1 Manual PDF.pdf (2002|35) / ABS-1MAN.pdf (2005|38): operation, specs, and the
       front/rear panel line art used for the panel images
   - ABS1SS.CDR (CorelDRAW 5 silkscreen, 1998): drill crosshairs used to check positions
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;

/* ---------------- constants from the source ---------------- */
const FOSC = 6144000;            // PIC OSC1 = CPLD pin 20 "6M144" (sheet 2), = 24.576 MHz / 4
const FCY  = FOSC/4;             // 1.536 MHz instruction rate ("1.53MHZ" in the DELAY comment)
const EMU_T = 1.7;               // the firmware is run a little past 1 s so slow actions settle
const HOLD = 0.12;               // how long a finger holds a button — INFERRED
const LED = { // dis0 / dis1 bit → panel item (MUX, PROCESS, REFRESH comments + sheet 4)
  dis0: ['INVERT','CYCLE','B OFF','0 dBFS','(LVL lamp)','-12','OFF','-20'],
  dis1: ['400Hz','1KHz','INVALID','EXT','LOCK','32K','48K','44.1K'],
};
const DIM_BITS = 0xE8;           // bits 3,5,6,7: cleared by MUX unless mux1,2 is set ("unbrighten certain LEDs")
const KEYS = { // PORTB bit (active low) — PROCESS: btfss scan0,n
  lvl:4, srate:6, cycle:3, k1:1, invert:2, f400:0, boff:7, invalid:5 };
const KEYNAME = { lvl:'AUDIO LEVEL', srate:'SAMPLE RATE', cycle:'CYCLE', k1:'1KHz', invert:'INVERT', f400:'400Hz', boff:'OFF (B)', invalid:'INVALID' };
const PRIO = ['lvl','srate','cycle','k1','invert','f400','boff','invalid'];   // PROCESS test order
const HC = ['1K','SR0','F1','SR1','B INVERT','F0','VALIDITY','ext_en'];        // 74HC4094 Q1..Q8 (sheet 1)
const RATE_NAMES = ['48 kHz','44.1 kHz','32 kHz','11 = "spare"/stop'];
const LVL_NAMES = ['0 dBFS','−12 dBFS','−20 dBFS','OFF'];
const LVL_DBU = ['+4 dBu','−8 dBu','−16 dBu','OFF'];

/* main-loop steps, in order (MAIN) */
const STEPS = [
  ['CLRWDT · RE_INT', 'Kick the watchdog; re-write TRISA/TRISC/ADCON1/OPTION every pass'],
  ['SCAN', 'RC4 low enables the switches; read PORTB into scan0'],
  ['MUX', 'Drive dis0 (RC6 low) or dis1 (RC5 low) onto PORTB; dim LEDs unless mux1,2'],
  ['BOUNCE', 'Count 32 equal passes for a press, 192 released passes for a release'],
  ['PROCESS', 'One button acts: LVL, SRATE, CYCLE, 1k, INVERT, 400, B OFF, INVALID'],
  ['chng_freq', 'After 255 passes, write the new SR1/SR0 into hc4094'],
  ['chng_lvl', 'After 7 × 255 passes, write the new F1/F0 (un-mute)'],
  ['DELVIS', 'DELAY with DELAY2 = 1: 53 × CLRWDT loop — half of every pass'],
  ['REFRESH', 'B CYCLE timer on RC7; copy INVERT, INVALID, tone into hc4094'],
  ['SFT_OUT', 'Clock hc4094 out MSB first on RC2/RC1, strobe RC3 → 74HC4094'],
  ['ext_lock', 'EXT only: read E0/E1 (RA1/RA3) from the CS8412; lock or hunt'],
  ['ext_freq', 'EXT only: read F2/F1/F0 (RA2/RA5/RA4); pick 48/44.1/32 tables'],
  ['ext_setup', 'EXT only: pulse SEL (RC0)'],
  ['unlock', 'While hunting: count 64 passes, then re-enable the receiver (RA0 = 0)'],
  ['GOTO MAIN', ''],
];

/* ---------------- device state ---------------- */
const D = {
  power: true,
  start: null,            // null = power-on at t = 0 (INIT runs); otherwise a register snapshot
  presses: [],            // [{t, key, hold}]
  ext: { conn:false, fs:48000 },   // state at t = 0
  extEv: [],              // [{t, conn, fs}]
  lowBat: false,
  tables: 'split',        // 'split' = DATA32xx/44xx/48xx (Jan 1998|31, corrected); 'combined' = ABSDATA.ASM (7 Jan 1998|31)
  ink: 'white',
  log: [],
  autoJump: true,
};

/* ================================================================
   PIC16F73 firmware emulation (abs1v103.asm), pass by pass
   ================================================================ */
function initRegs(){
  // INIT: dis1 = 0x82, dis0 = 0x40, call lvl0, call sr48, chng counters, hc4094 bits 1,3,5,2
  const r = { dis0:0x40, dis1:0x82, hc:0, mux1:0, lght:0x10, scan0:0, scan1:0, db:0, flag:0, c1:0xff, c2:7, c3:1,
    cyc:0, cyc1:7, cycf:0, lockc:0x20, lockf:0, ra0:0, rc7:0, boff:0 };
  r.dis0 = (r.dis0 & ~0xA8) | 0x40;                              // lvl0
  r.dis1 = (r.dis1 & ~(0x80|0x20|0x08|0x10)) | 0x40; r.hc &= ~0x80; r.lockf=0; r.lockc=0x20; r.ra0=1;   // sr48
  r.flag = 0x02;                                                   // bsf chng_flag,1
  r.hc |= 0x02|0x08|0x20|0x04;                                     // SR = 11, F = 11 (stopped and muted)
  return r;
}
function cs8412(t, ra0){
  // E-code (only E0/E1 wired to RA1/RA3; E2 unconnected) and F-code (needs FCK = 6M144 through Q2)
  const e = extAt(t);
  if (!e.conn || e.fs < 30000 || e.fs > 50000) return { E0:1, E1:1, F:0, lock:false };
  let F = 0; const near=(f,tol)=>Math.abs(e.fs-f)/f <= tol;
  if (near(48000,400e-6)) F=4; else if (near(44100,400e-6)) F=5; else if (near(44056,400e-6)) F=6; else if (near(32000,400e-6)) F=7;
  else if (near(48000,.04)) F=1; else if (near(44100,.04)) F=2; else if (near(32000,.04)) F=3;
  return { E0:0, E1:0, F, lock:true };
}
function extAt(t){ let e = { conn:D.ext.conn, fs:D.ext.fs }; for (const v of D.extEv) if (v.t<=t) e={conn:v.conn, fs:v.fs}; return e; }
function scanAt(t){ let s=0xFF; for (const p of D.presses) if (t>=p.t && t<p.t+p.hold) s &= ~(1<<KEYS[p.key]); return s; }

let EMU = null, EMU_KEY = '';
function emulate(){
  const key = JSON.stringify([D.power, D.start, D.presses, D.ext, D.extEv]);
  if (key === EMU_KEY && EMU) return EMU;
  EMU_KEY = key;
  const P = [];                       // passes
  let r, t = 0;
  if (!D.power){ EMU = { P:[{t0:0,dur:EMU_T,kind:'off',r:initRegs(),hc:0x2E,lat:0,steps:[],ev:[]}], initEnd:0, off:true }; buildSegments(EMU); return EMU; }
  let initEnd = 0;
  if (!D.start){
    // RESET → CALL INIT: DELAY2 = 0xFF → 255 × (MOVWF + 53 × (CLRWDT, DECFSZ, GOTO) + DECFSZ + GOTO) + body
    const cyc = 2 + 2 + 255*215 + 2 + 60;
    initEnd = cyc / FCY;
    r = initRegs();
    P.push({ t0:0, dur:initEnd, kind:'init', r:Object.assign({}, r), hc:r.hc, lat:initEnd, steps:[], ev:['RESET → CALL INIT (35.7 ms delay, then dis0=0x40, dis1=0x42, hc4094 SR=11 F=11)'] });
    t = initEnd;
  } else { r = Object.assign({}, D.start); }
  let hcOut = r.hc;
  let idx = 0;
  while (t < EMU_T){
    const ev = [], cy = new Array(STEPS.length).fill(0);
    // MAIN: CLRWDT, CALL RE_INT
    cy[0] = 13;
    // SCAN
    r.scan0 = scanAt(t); cy[1] = 13;
    // MUX
    let phase, bright, port;
    if (!(r.mux1 & 0x80)){ phase=0; port=r.dis0; r.mux1 |= 0x80;
      if (r.mux1 & 4){ bright=1; cy[2]=17; } else { bright=0; port &= ~DIM_BITS; cy[2]=22; } }
    else { phase=1; port=r.dis1; r.mux1 &= ~0x80;
      if (r.mux1 & 4){ bright=1; r.mux1 &= ~4; cy[2]=21; }
      else { bright=0; port &= ~DIM_BITS; r.lght=(r.lght-1)&255; if (r.lght===0){ r.mux1|=4; r.lght=0x10; cy[2]=28; } else cy[2]=24; } }
    // BOUNCE
    if (!(r.mux1 & 1)){
      if (r.scan0===0xFF) cy[3]=9;
      else if (r.scan0===r.scan1){ r.db=(r.db+1)&255; cy[3]=16; if (r.db & 32){ r.mux1 |= 3; r.db=0; cy[3]=20; ev.push('BOUNCE: closure detected (dbcount bit 5 = 32 passes) → mux1,0 and mux1,1 set'); } }
      else { r.db=0; r.scan1=r.scan0; cy[3]=14; }
    } else {
      if (r.scan0===0xFF){ r.db=(r.db+1)&255; cy[3]=16; if ((r.db&64)&&(r.db&128)){ r.mux1 &= ~1; r.db=0; cy[3]=20; ev.push('BOUNCE: release confirmed (dbcount = 192) → buttons enabled again'); } }
      else { r.db=0; cy[3]=13; }
    }
    // PROCESS
    cy[4]=5;
    if (r.mux1 & 2){ r.mux1 &= ~2; cy[4]=30;
      const k = PRIO.find(n=> !(r.scan0 & (1<<KEYS[n])));
      if (k) ev.push(...processKey(r, k));
    }
    // chng_freq
    cy[5]=5;
    if (r.flag & 2){ cy[5]=7; r.c1=(r.c1-1)&255;
      if (r.c1===0){ r.c1=0xff; r.c3=(r.c3-1)&255;
        if (r.c3===0){ r.c2=7; r.flag |= 1; r.flag &= ~2; cy[5]=22;
          if (r.dis1 & 0x40){ r.hc &= ~(2|8); ev.push('chng_freq: 255 passes elapsed → SR1 SR0 = 00 (48 kHz)'); }
          else if (r.dis1 & 0x20){ r.hc &= ~2; r.hc |= 8; ev.push('chng_freq → SR1 SR0 = 10 (32 kHz)'); }
          else if (r.dis1 & 0x80){ r.hc |= 2; r.hc &= ~8; ev.push('chng_freq → SR1 SR0 = 01 (44.1 kHz)'); }
          ev.push('chng_freq sets chng_flag,0: chng_lvl now waits 7 × 255 passes');
        } } }
    // chng_lvl
    cy[6]=5;
    if (r.flag & 1){ cy[6]=7; r.c1=(r.c1-1)&255;
      if (r.c1===0){ r.c1=0xff; r.c2=(r.c2-1)&255;
        if (r.c2===0){ r.flag &= ~1; cy[6]=20;
          if (r.dis0 & 0x08){ r.hc &= ~(0x20|4); ev.push('chng_lvl: delay over → F1 F0 = 00 (0 dBFS table)'); }
          else if (r.dis0 & 0x20){ r.hc |= 0x20; r.hc &= ~4; ev.push('chng_lvl → F1 F0 = 01 (−12 dBFS table)'); }
          else if (r.dis0 & 0x80){ r.hc &= ~0x20; r.hc |= 4; ev.push('chng_lvl → F1 F0 = 10 (−20 dBFS table)'); }
          else ev.push('chng_lvl: level is OFF → F1 F0 stay 11 (OFF tables)');
        } } }
    // DELVIS
    cy[7]=225;
    // REFRESH
    cy[8]=26; const rc7was=r.rc7;
    if (!(r.dis0 & 4)){
      if (r.dis0 & 2){ cy[8]=34;
        r.rc7 = (r.cycf & 1) ? 0 : 1;
        r.cyc=(r.cyc-1)&255;
        if (r.cyc===0){ r.cyc=0xff; r.cyc1=(r.cyc1-1)&255; if (r.cyc1===0){ r.cycf = (~r.cycf)&255; r.cyc1=7; } }
      } else r.rc7 = 0;
    }
    if (r.dis0 & 1) r.hc |= 0x10; else r.hc &= ~0x10;
    if (r.dis1 & 4) r.hc |= 0x40; else r.hc &= ~0x40;
    if (r.dis1 & 1){ r.dis1 &= ~2; r.hc &= ~1; }
    if (r.dis1 & 2){ r.dis1 &= ~1; r.hc |= 1; }
    if (r.dis0 & 4){ r.dis0 &= ~3; r.rc7 = 1; }
    if (r.rc7!==rc7was && (r.dis0&2)) ev.push(`REFRESH: B CYCLE timer → RC7 (B-CYCLE) = ${r.rc7} → B ${r.rc7?'muted':'on'}`);
    // SFT_OUT
    cy[9]=92; const lat = cy.slice(0,10).reduce((a,b)=>a+b,0)/FCY;
    if (r.hc !== hcOut) ev.push(`SFT_OUT: 74HC4094 now ${bin8(r.hc)} (${hcText(r.hc)})`);
    hcOut = r.hc;
    // ext_lock / ext_freq / ext_setup / unlock
    cy[10]=5; cy[11]=5; cy[12]=5; cy[13]=5;
    if (!r.ra0){
      const cs = cs8412(t, r.ra0);
      if (!cs.E0 || !cs.E1){ cy[10]=10;
        if (!(r.dis1 & 0x10)){ r.hc |= 0x80; r.dis1 |= 0x10; r.flag |= 1; r.c1=0xff; r.c2=7; r.c3=1; cy[10]=22;
          ev.push('ext_lock: CS8412 E1/E0 not 11 → lock: ext_en = 1, LOCK lamp on, level returns after 7 × 255 passes'); }
      } else { cy[10]=28;
        if (r.dis1 & 0x10) ev.push('ext_lock: E1 E0 = 11 (no lock) → LOCK off, SR=11 F=11, ext_en = 0');
        r.dis1 &= ~(0x10|0x40|0x80|0x20); r.hc |= 2|8|0x20|4; r.hc &= ~0x80;
        r.lockc=(r.lockc-1)&255;
        if (r.lockc===0){ r.lockc=0x40; r.ra0=1; r.lockf |= 1; ev.push('ext_lock: 32 passes without lock → RA0 = 1 (receiver FCK off), lock_flag set'); }
      }
      if (!r.ra0 && (r.dis1 & 0x10)){ cy[11]=17;
        const F = cs.F, o = r.dis1 & 0xE0, oh = r.hc;
        if (F===0){ r.dis1 &= ~0xE0; r.hc |= 2; r.hc &= ~8; }
        else if (F===1||F===4){ r.dis1 = (r.dis1 & ~0xE0) | 0x40; r.hc &= ~(2|8); }
        else if (F===2||F===5||F===6){ r.dis1 = (r.dis1 & ~0xE0) | 0x80; r.hc |= 2; r.hc &= ~8; }
        else { r.dis1 = (r.dis1 & ~0xE0) | 0x20; r.hc &= ~2; r.hc |= 8; }
        if (o !== (r.dis1&0xE0) || oh!==r.hc) ev.push(`ext_freq: F2 F1 F0 = ${F.toString(2).padStart(3,'0')} → ${F===0?'out_range (44.1k tables, no rate lamp)':F===1||F===4?'ext48':F===7||F===3?'ext32':'ext44'}`);
      }
      if (!r.ra0) cy[12]=10;
    }
    if (r.lockf & 1){ cy[13]=9; r.lockc=(r.lockc-1)&255;
      if (r.lockc===0){ r.lockf=0; r.lockc=0x20; r.ra0=0; ev.push('unlock: 64 passes off → RA0 = 0, try the receiver again'); } }
    cy[14]=2;
    const dur = cy.reduce((a,b)=>a+b,0) / FCY;
    P.push({ t0:t, dur, kind:'loop', i:idx++, r:Object.assign({}, r), hc:hcOut, lat, steps:cy, ev, phase, bright, port });
    t += dur;
  }
  EMU = { P, initEnd };
  buildSegments(EMU);
  return EMU;
}
function processKey(r, k){
  const ev = [`PROCESS: scan0 bit ${KEYS[k]} low → ${KEYNAME[k]} (label ${({lvl:'lvl',srate:'srate',cycle:'cycle',k1:'freq1000',invert:'invert',f400:'freq400',boff:'b_off',invalid:'invalid'})[k]})`];
  if (k==='lvl'){
    r.hc |= 0x20|4; r.c1=0xff; r.c2=7; r.flag |= 1;
    ev.push('lvl: F0 = F1 = 1 at once (mute = OFF tables), chng_count1 = 0xFF, chng_count2 = 7, chng_flag,0 = 1');
    if (r.dis0 & 8){ r.dis0 = (r.dis0 & ~0xA8) | 0x40; ev.push('dis0 was 0 dBFS → lvl0: OFF lamp'); }
    else if (r.dis0 & 0x80){ r.dis0 = (r.dis0 & ~0xC8) | 0x20; ev.push('dis0 was −20 → lvl20: −12 lamp'); }
    else if (r.dis0 & 0x20){ r.dis0 = (r.dis0 & ~0xE0) | 0x08; ev.push('dis0 was −12 → lvl12: 0 dBFS lamp'); }
    else { r.dis0 = (r.dis0 & ~0x68) | 0x80; ev.push('dis0 was OFF → −20 lamp'); }
  } else if (k==='srate'){
    r.c1=0xff; r.c2=7; r.c3=1; r.flag |= 2; r.flag &= ~1; r.hc |= 2|8|0x20|4;
    ev.push('srate: SR1 SR0 = 11 and F1 F0 = 11 at once → the CPLD stops 256fs (spare code) and the level is OFF');
    const go48 = ()=>{ r.dis1 = (r.dis1 & ~(0x80|0x20|0x08|0x10)) | 0x40; r.hc &= ~0x80; r.lockf=0; r.lockc=0x20; r.ra0=1; ev.push('sr48: 48K lamp, ext_en = 0, RA0 = 1 (receiver off); chng_freq applies SR in 255 passes'); };
    if (r.dis1 & 8) go48();
    else if (r.dis1 & 0x40){ r.dis1 = (r.dis1 & ~(0x40|0x20|0x08|0x10)) | 0x80; r.ra0=1; ev.push('sr44: 44.1K lamp'); }
    else if (r.dis1 & 0x80){ r.dis1 = (r.dis1 & ~(0x40|0x80|0x08|0x10)) | 0x20; r.ra0=1; ev.push('sr32: 32K lamp'); }
    else if (r.dis1 & 0x20){ r.dis1 = (r.dis1 & ~(0x40|0x80|0x20)) | 0x08; r.ra0=0; r.flag &= ~3; r.lockc=0x20; ev.push('srext: EXT lamp, RA0 = 0 (receiver on), pending changes cancelled; ext_lock takes over'); }
    else go48();
  } else if (k==='k1'){ r.dis1 |= 2; r.dis1 &= ~1; ev.push('freq1000: 1KHz lamp; REFRESH sets hc4094 Q1 (1K) = 1 → EPROM A13 = 1'); }
  else if (k==='f400'){ r.dis1 &= ~2; r.dis1 |= 1; ev.push('freq400: 400Hz lamp; REFRESH clears 1K → EPROM A13 = 0'); }
  else if (k==='invert'){
    if (!(r.dis0 & 1)){ r.dis0 |= 1; r.boff |= 2; if (r.dis0 & 4) r.boff &= ~1; r.dis0 &= ~4; ev.push('inv0: INVERT lamp on, B OFF cleared; REFRESH sets B INVERT → EPROM A10 = 1 (out-of-phase tables)'); }
    else { r.dis0 &= ~1; r.boff &= ~2; ev.push('invert: INVERT lamp off → A10 = 0'); }
    ev.push('(boff_reg is written here but never read anywhere)');
  } else if (k==='invalid'){
    if (r.dis1 & 4){ r.dis1 &= ~4; ev.push('invalid: lamp off → VALIDITY = 0'); } else { r.dis1 |= 4; ev.push('val0: INVALID lamp on → hc4094 Q7 → CS8402A V pin = 1'); }
  } else if (k==='cycle'){
    if (r.dis0 & 2){ r.dis0 &= ~6; ev.push('cycle: CYCLE lamp off (and B OFF off)'); } else { r.dis0 |= 2; r.dis0 &= ~4; ev.push('on_cyc: CYCLE lamp on, B OFF cleared → REFRESH starts toggling RC7 every 7 × 255 passes'); }
  } else if (k==='boff'){
    if (r.dis0 & 4){ r.dis0 &= ~4; ev.push('b_off: lamp off → RC7 back to 0'); } else { r.dis0 |= 4; r.dis0 &= ~3; ev.push('off_b: B OFF lamp on; INVERT and CYCLE cleared; REFRESH holds RC7 = 1'); }
  }
  return ev;
}
function bin8(v){ return v.toString(2).padStart(8,'0'); }
function hcFields(hc){ return { k1:hc&1, sr0:(hc>>1)&1, f1:(hc>>2)&1, sr1:(hc>>3)&1, inv:(hc>>4)&1, f0:(hc>>5)&1, v:(hc>>6)&1, ext:(hc>>7)&1, SR:(((hc>>3)&1)<<1)|((hc>>1)&1), F:(((hc>>2)&1)<<1)|((hc>>5)&1) }; }
function hcText(hc){ const f=hcFields(hc); return `SR ${f.sr1}${f.sr0}, F ${f.f1}${f.f0}, ${f.k1?'1K':'400'}, INV ${f.inv}, V ${f.v}, ext_en ${f.ext}`; }

function passAt(t){
  const P = emulate().P; let lo=0, hi=P.length-1;
  while (lo<hi){ const m=(lo+hi+1)>>1; if (P[m].t0<=t) lo=m; else hi=m-1; }
  return P[lo];
}
function passIndexAt(t){ const P=emulate().P; let lo=0, hi=P.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (P[m].t0<=t) lo=m; else hi=m-1; } return lo; }
function stepAt(t){
  const p = passAt(t); if (p.kind!=='loop') return { pass:p, step:-1 };
  let c = (t - p.t0)*FCY, k=0; for (; k<p.steps.length-1; k++){ if (c < p.steps[k]) break; c -= p.steps[k]; }
  return { pass:p, step:k };
}
/* effective outputs at time t: 74HC4094 outputs change at the RC3 strobe inside SFT_OUT */
function hcAt(t){ const P=emulate().P; const i=passIndexAt(t); const p=P[i]; if (p.kind==='off') return 0x2E; if (t < p.t0 + (p.lat||0) && i>0) return P[i-1].hc; return p.hc; }
function rc7At(t){ const p=passAt(t); return p.r.rc7; }
function regsAt(t){ return passAt(t).r; }
function settled(){ const P=emulate().P; return P[P.length-1].r; }
function settledHc(){ const P=emulate().P; return P[P.length-1].hc; }

/* ================================================================
   CPLD (abs.rpt) + EPROM (DATA*.ASM) model
   ================================================================ */
/* |abs-1:100| clock mux: 256fs = 25M576/2 (SR 00), 33M868/3 (SR 01), 25M576/3 (SR 10), EXTREF (ext_en, SR≠11) */
function clockOf(hc, t){
  const f = hcFields(hc);
  if (!D.power) return { fs:0, src:'unit off' };
  if (f.ext){ if (f.SR===3) return { fs:0, src:'EXTREF gated off (SR = 11)' }; const e=extAt(t); return { fs:e.fs, src:'EXTREF = CS8412 MCK (256 fs)' }; }
  if (f.SR===3) return { fs:0, src:'none: SR = 11, ext_en = 0 → 256fs held high' };
  return [ {fs:48000, src:'24.576 MHz ÷ 2 (TFF :56) = 12.288 MHz'}, {fs:44100, src:'33.8688 MHz ÷ 3 (a1:a0 counter) = 11.2896 MHz'}, {fs:32000, src:'24.576 MHz ÷ 3 (a1:a0 counter) = 8.192 MHz'} ][f.SR];
}
/* |abs-2:2| sample counter sa0..sa6: TFFs clocked by q6, async clear :49 (_LC058) */
function clr49(v, sr0, sr1, k){ const b=i=>(v>>i)&1;
  return !!((b(5)&&!sr0&&sr1&&k)||(b(4)&&b(6)&&!sr0&&sr1)||(b(2)&&b(3)&&b(5)&&sr0&&!sr1&&k)||(b(4)&&b(5)&&b(6)&&sr0&&!sr1)||(b(3)&&b(4)&&b(5)&&b(6)&&!sr1)||(b(4)&&b(5)&&!sr0&&k)); }
function saNext(v, f){ let n=(v+1)&127; if (clr49(n, f.sr0, f.sr1, f.k1)) n=0; return n; }
const MOD = {}; function modN(f){ const key=f.sr0+''+f.sr1+f.k1; if (MOD[key]) return MOD[key]; let v=0,n=0; do { v=saNext(v,f); n++; } while (v && n<200); return (MOD[key]=n); }
function saAfter(v, k, f){ const N=modN(f); let e=0; while (v>=N && e<130 && k>0){ v=saNext(v,f); k--; e++; } return v<N ? (v + k) % N : v; }

/* clock segments: where 256fs, table address or BCYCLE change */
function buildSegments(E){
  const segs = []; let cur=null, v=0, frac=0, frames=0;
  const push=(t, hc)=>{
    if (cur){ const n = Math.max(0,(t-cur.t0)*cur.fs + cur.frac0); const k=Math.floor(n); v = saAfter(cur.v0, k, cur.f); frac = n-k; frames = cur.F0 + k; cur.t1 = t; }
    const ck = clockOf(hc, t), f = hcFields(hc);
    cur = { t0:t, fs:ck.fs, src:ck.src, hc, f, v0:v, frac0:frac, F0:frames, N:modN(f) }; segs.push(cur);
  };
  push(0, E.P[0].kind==='init'? E.P[0].hc : E.P[0].hc);
  let lastHc = segs[0].hc, lastFs = segs[0].fs;
  for (const p of E.P){
    if (p.kind!=='loop') continue;
    const t = p.t0 + p.lat;
    const ck = clockOf(p.hc, t);
    if (p.hc !== lastHc || ck.fs !== lastFs){ push(t, p.hc); lastHc=p.hc; lastFs=ck.fs; }
  }
  cur.t1 = EMU_T + 1;
  E.segs = segs;
}
function segAt(t){ const S=emulate().segs; let lo=0, hi=S.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (S[m].t0<=t) lo=m; else hi=m-1; } return S[lo]; }
/* frame (sample period) at time t: index, sa, start/end time */
function frameAt(t){
  const s = segAt(t);
  if (!s.fs) return { stopped:true, seg:s };
  const n = (t - s.t0)*s.fs + s.frac0, k = Math.floor(n);
  const sa = saAfter(s.v0, k, s.f);
  const ts = s.t0 + (k - s.frac0)/s.fs;
  return { seg:s, fs:s.fs, k, sa, idx:s.F0+k, t0:ts, t1:ts+1/s.fs, frac:n-k };
}

/* EPROM tables: A(n) = round(amp · sin(2π(n+1)/N)) — matches every DATA32xx/44xx/48xx table to ±1 LSB */
const AMP = [8388607, 2097152, 838861, 0];     // 0 dBFS, −12.04 dBFS (= ¼ FS), −20 dBFS, OFF  (F1F0 = 00, 01, 10, 11)
function tableN(sr, k1){ return sr===3? 0 : [[120,48],[112,44],[80,32]][sr][k1]; }
function tableEntries(sr, k1, F, inv){
  const N = tableN(sr,k1); if (!N) return 0;
  if (F===3){ // OFF tables: several are a sample short in the sources
    if (sr===0 && !k1) return 119; if (sr===1 && !k1) return 111; return N; }
  if (D.tables==='combined'){ if (sr===2 && !k1 && F===1 && !inv) return 79; if (sr===1 && !k1 && F===0 && inv) return 111; }
  return N;
}
function tableBase(f){ return (f.sr1<<15)|(f.sr0<<14)|(f.k1<<13)|(f.f1<<12)|(f.f0<<11)|(f.inv<<10); }
function straight(sr, k1, F, n){
  const N=tableN(sr,k1), amp=AMP[F];
  let v = Math.round(amp*Math.sin(2*Math.PI*(n+1)/N));
  if (D.tables==='combined'){
    if (sr===2 && k1 && F<2 && n===9) v = Math.round(amp*Math.sin(2*Math.PI*9/N));      // sample 10 repeats sample 9 (40960/41984, 43008/44032)
    if (sr===1 && k1 && F===2 && n===10) v = Math.round(-0.4*8388607);                   // −0.4 FS spike in the "−20 dBFS" table (28672/29696)
  }
  return v;
}
/* 24-bit word stored for sample n: bytes 0–3 ("SAMPLE A" in the sources), bytes 4–7 ("SAMPLE B") */
function eprWord(f, n, hi){
  const sr=f.SR, N=tableN(sr,f.k1); if (!N) return null;
  const ent = tableEntries(sr, f.k1, f.F, f.inv); if (n >= ent) return null;   // unprogrammed
  if (f.F===3) return 0;
  if (hi && f.inv) return straight(sr, f.k1, f.F, N-1-n);    // B[n] = A[N−1−n]: time-reversed
  return straight(sr, f.k1, f.F, n);
}
function eprByte(addr){
  const hc = ((addr>>13)&1) | (((addr>>14)&1)<<1) | (((addr>>12)&1)<<2) | (((addr>>15)&1)<<3) | (((addr>>10)&1)<<4) | (((addr>>11)&1)<<5);
  const f = hcFields(hc); const n=(addr>>3)&127, hi=(addr>>2)&1, b=addr&3;
  const w = eprWord(f, n, hi); if (w===null) return 0xFF;       // erased EPROM — INFERRED fill
  if (b===0) return 0; const u = w<0? w+(1<<24) : w; return (u >> (8*(b-1))) & 255;
}
/* what goes out at time t: AES A = bytes 4–7 (q6 = 1, first half of the frame), AES B = bytes 0–3 */
function outSample(t, side){
  if (!D.power) return null;
  const F = frameAt(t); if (F.stopped) return null;
  const f = F.seg.f; const hi = side===0 ? 1 : 0;
  if (side===1 && rc7At(t)) return 0;           // BCYCLE clears the serialiser while q6 = 0
  const w = eprWord(f, F.sa, hi); const v = w===null ? -1 : w;
  return v / 8388608;
}
function levelDb(f){ return f.F===3 ? null : [0, -12.04, -20][f.F]; }

/* ---------------- CPLD bit-level model of one frame (abs.rpt equations) ----------------
   half-step j = 0..255 within the frame; frame starts where q6 rises (count 64), so
   c = (64 + (j>>1)) & 127, 128FS = j & 1 (low then high). */
function cpldFrame(bytes8, bcycle, prevBytes){
  const st = { sr:0, L48:0, L47:0, L45:1 }; let prev = null; const out = [];
  for (let pass=0; pass<2; pass++){
    const by = pass? bytes8 : (prevBytes||bytes8);
    for (let j=0;j<256;j++){
      const F = j&1, c = (64 + (j>>1)) & 127, b=i=>(c>>i)&1;
      const q0=b(0),q1=b(1),q2=b(2),q3=b(3),q4=b(4),q5=b(5),q6=b(6);
      const SCLK = (!q3 || (F && !(q0&&q1&&q2))) ? 1 : 0;
      const q45 = q4&&q5;
      if (q45){ st.L48=0; st.L47=0; st.L45=1; }
      let SCLKA = (SCLK && st.L45) ? 0 : 1;
      const srclk = ((!q2||SCLK)&&(!q3||SCLK)&&(q1||q2||q3)) ? 1 : 0;
      const x010 = (!st.L47 && q4 && !q5 && SCLKA) ? 0 : 1;
      const l45c = (st.L47 && SCLKA) ? 1 : 0;
      let load = false;
      if (prev){
        if (srclk && !prev.srclk){ if (!(q2||q3)){ st.sr = by[(q6<<2)|(q5<<1)|q4]; load=true; } else st.sr = ((st.sr<<1)|1) & 255; }
        if (x010 && !prev.x010 && !q45){ const o=st.L48; st.L48^=1; if (o===1) st.L47^=1; }
        if (l45c && !prev.l45c && !q45) st.L45 = 0;
      }
      if (bcycle && !q6) st.sr = 0;
      SCLKA = (SCLK && st.L45) ? 0 : 1;
      if (pass) out.push({ j, c, F, q6, SCLK, SCLKA, SDATA:(st.sr>>7)&1, load, byte:(q6<<2)|(q5<<1)|q4 });
      prev = { srclk, x010, l45c };
    }
  }
  return out;
}
function frameBytes(t){
  const F = frameAt(t); if (F.stopped) return null;
  const base = tableBase(F.seg.f) | (F.sa<<3);
  return { base, bytes: [0,1,2,3,4,5,6,7].map(i=>eprByte(base|i)), F };
}

/* AES3 subframe as the standard defines it, for the stored 24-bit word */
function aesSub(v, pre, vbit, cbit){
  let s = Math.round(v*8388608); if (s>8388607) s=8388607; if (s<0) s += 1<<24;
  const bits = new Array(32).fill(0);
  for (let b=0;b<24;b++) bits[4+b] = (s>>b)&1;
  bits[28]=vbit; bits[29]=0; bits[30]=cbit;
  let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
  return { pre, bits, raw:s };
}
function biphase(pre, bits, startLevel){
  const P = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv=[]; const inv = startLevel? 0:1; P.forEach(b=>lv.push(inv? 1-b : b));
  let cur = lv[lv.length-1];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); }
  return lv;
}

/* ================================================================
   USER ACTIONS — each one re-runs the firmware and logs its path
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
function fmtRel(d){ return (d>=0?'+':'')+SIM.fmtDur(Math.abs(d)).replace(/^/, d<0?'−':''); }

function traceAfter(t0, until){
  const P = emulate().P, out = [];
  for (let i=passIndexAt(t0); i<P.length; i++){ const p=P[i]; if (p.t0 > until) break; if (p.t0 < t0 - 1e-9) continue;
    p.ev.forEach(e=> out.push({ t:p.t0, txt:e, pass:p.i })); }
  return out;
}
function logAction(name, t, lines, extra){
  D.log.unshift({ name, t, lines, extra:extra||[] }); if (D.log.length>40) D.log.length=40;
}
function commit(){
  if (!D.power) return;
  const r = Object.assign({}, settled()); r.scan0 = 0xFF; r.scan1 = 0xFF; r.db = 0; r.mux1 &= ~3;
  const e = extAt(EMU_T);
  D.start = r; D.ext = { conn:e.conn, fs:e.fs }; D.extEv = []; D.presses = [];
  EMU_KEY = '';
}
function ensureRoom(){
  // presses late in the second are moved to a fresh second so their slow effects still fit
  if (SIM.t > 0.9){ commit(); SIM.t = 0.02; }
}
const A = {
  press(key){
    if (!D.power){ logAction(`Press ${KEYNAME[key]}`, SIM.t, [{t:SIM.t, txt:'Unit is off — nothing happens.'}]); SIM.refresh(); return; }
    ensureRoom();
    let t = SIM.t, moved = false;
    // a finger can't press again before the last press was released and debounced: start after that
    const prev = D.presses.filter(p=>p.t<=t).pop();
    if (prev){ const rel = traceAfter(prev.t, prev.t+1).find(x=>/release confirmed/.test(x.txt)); const free = rel? rel.t + 1e-3 : prev.t + 0.2;
      if (t < free){ t = free; moved = true; if (t > 0.9){ commit(); t = 0.02; } } }
    D.presses.push({ t, key, hold:HOLD }); D.presses.sort((a,b)=>a.t-b.t);
    EMU_KEY=''; emulate();
    const tr = traceAfter(t, t + 0.75);
    const lines = [].concat(moved? [{ t, txt:`(press placed at ${SIM.fmtT(t)}, after the previous button's release debounce — earlier the firmware would ignore it)` }] : [], [{ t, txt:`SCAN: PORTB bit ${KEYS[key]} (${KEYNAME[key]}) reads low while RC4 = 0 — held ${HOLD*1000|0} ms (${inf})` }]).concat(tr);
    logAction(`Press ${KEYNAME[key]}`, t, lines);
    const proc = tr.find(x=>/^PROCESS/.test(x.txt));
    if (D.autoJump && proc){ const p = passAt(proc.t); SIM.seek(Math.min(SIM.duration, p.t0 + p.dur + 1e-6)); } else SIM.refresh();
  },
  plugRef(conn){
    ensureRoom();
    const t = SIM.t, fs = extAt(t).fs; D.extEv.push({ t, conn, fs }); D.extEv.sort((a,b)=>a.t-b.t); EMU_KEY=''; emulate();
    const lines = [{ t, txt: conn? `REF IN: AES reference at ${fs/1000} kHz → CS8412 ${fs>=30000&&fs<=50000?'locks (E2–E0 = 000), MCK = 256 fs on EXTREF':'cannot lock (outside 30–50 kHz)'}` : 'REF IN unplugged → CS8412 E2–E0 = 111 (no lock)' }].concat(traceAfter(t, t+0.75));
    if (!(regsAt(t).dis1 & 8)) lines.push({ t, txt:'(The unit is not on EXT, so the firmware ignores the receiver: ext_lock returns at btfsc PORTA,0)' });
    logAction(conn? 'Plug in AES reference':'Unplug AES reference', t, lines); SIM.refresh();
  },
  refRate(fs){
    ensureRoom();
    const t=SIM.t, e=extAt(t); D.extEv.push({ t, conn:e.conn, fs }); D.extEv.sort((a,b)=>a.t-b.t); EMU_KEY=''; emulate();
    logAction(`Reference rate → ${fs/1000} kHz`, t, [{t, txt:`CS8412 frequency report (FCK = 6.144 MHz): F2–F0 = ${cs8412(t+1e-3,0).F.toString(2).padStart(3,'0')} ${inf}`}].concat(traceAfter(t,t+0.75))); SIM.refresh();
  },
  power(){
    if (D.power){ D.power=false; EMU_KEY=''; logAction('Power off', SIM.t, [{t:SIM.t, txt:'POWER switch off: PIC, CPLD and transmitters stop; settings are not stored (no EEPROM write in the code)'}]); SIM.refresh(); return; }
    D.power=true; D.start=null; D.presses=[]; D.ext={conn:extAt(EMU_T).conn, fs:D.ext.fs}; D.extEv=[]; EMU_KEY=''; emulate();
    logAction('Power on (t = 0)', 0, [{t:0, txt:'RESET → CALL INIT: DELAY with DELAY2 = 0xFF (≈ 35.7 ms at 1.536 MIPS)'}, {t:0, txt:'INIT: dis1 = 0x82 then sr48 → 48K + 1KHz lamps; dis0 = 0x40 → OFF lamp; hc4094 SR = 11, F = 11'}].concat(traceAfter(0, 0.7)));
    SIM.seek(0);
  },
  powerReplay(){ D.power=true; D.start=null; D.presses=[]; D.extEv=[]; EMU_KEY=''; logAction('Replay power-on', 0, [{t:0, txt:'Start the second from RESET (INIT runs again).'}].concat(traceAfter(0,0.7))); SIM.seek(0); },
  fresh(){ commit(); logAction('Start a fresh second from the settled state', 0, [{t:0, txt:'Registers at the end of the run become the state at t = 0; presses cleared.'}]); SIM.seek(0); },
  clear(){ D.presses=[]; D.extEv=[]; EMU_KEY=''; logAction('Clear presses in this second', SIM.t, [{t:SIM.t, txt:'Back to the state at t = 0.'}]); SIM.refresh(); },
  reset(){ Object.assign(D, { power:true, start:null, presses:[], ext:{conn:false, fs:48000}, extEv:[], lowBat:false, tables:'split', log:[] }); EMU_KEY=''; SIM.seek(0); },
};

/* ================================================================
   DRAWING: front and rear panels on the real panel artwork
   ================================================================ */
/* Panel art: page 1 of "ABS-1 Manual PDF.pdf" (2002|35), the same line art as the ABS1SS.CDR silkscreen.
   Cut at 600 dpi, callout leaders removed (tools/abs1_panel_extract.py) → 1230 × 658 (front), 1330 × 690 (rear).
   Positions below were measured on that art and agree with the ABS1SS.CDR drill crosshairs
   (scale 2.167 px per CDR px at 150 dpi; screw pitch 539 CDR px = 91.3 mm). */
const ASSET = 'siumulation-plugins/assets/';
const FP = {
  btn: { lvl:[170,155], srate:[170,375], cycle:[714,155], invert:[876,155], boff:[1036,155], k1:[714,375], f400:[876,375], invalid:[1036,375] },
  lvlLed: [[277,157,6,'OFF'],[357,157,7,'−20'],[437,157,5,'−12'],[520,157,3,'0']],      // [x,y,dis0 bit]
  rateLed:[[277,378,6,'48K'],[357,378,7,'44.1K'],[437,378,5,'32K'],[520,378,3,'EXT']],   // dis1 bit
  btnLamp:{ lvl:['dis0',4], srate:['dis1',4], cycle:['dis0',1], invert:['dis0',0], boff:['dis0',2], k1:['dis1',1], f400:['dis1',0], invalid:['dis1',2] },
  lowbat:[710,505], power:[1045,527],
  outer:'40,3 1181,3 1223,174 1223,459 1183,656 39,656 3,459 3,174',
};
const RP = { left:[213,160], right:[422,160], dc:[213,520], out:[678,467], ref:[1022,350],
  outer:'81,31 1224,31 1292,340 1224,681 80,681 13,340' };
function ledStates(t){
  // returns {dis0:[8], dis1:[8]} brightness 0..1 at t (MUX duty cycle, or instantaneous at deep zoom)
  const p = passAt(t), z = { dis0:new Array(8).fill(0), dis1:new Array(8).fill(0) };
  if (!D.power || p.kind!=='loop') return z;
  const inst = SIM.win <= 0.0025;
  for (let b=0;b<8;b++){
    const dim = (DIM_BITS>>b)&1;
    if (inst){ if (p.phase===0) z.dis0[b] = (p.port>>b)&1; else z.dis1[b] = (p.port>>b)&1; }
    else { z.dis0[b] = ((p.r.dis0>>b)&1) * (dim? .55:1); z.dis1[b] = ((p.r.dis1>>b)&1) * (dim? .55:1); }
  }
  return z;
}
function frontSVG(t, opts){
  opts = opts||{};
  const L = ledStates(t), scan = D.power? scanAt(t) : 0xFF, white = D.ink==='white';
  const panel = white? '#22262a' : '#d8d6ce', lampOff = white? '#3a3f44' : '#9a9890';
  const roundLed = (x,y,v,col)=>`<circle cx="${x}" cy="${y}" r="17" fill="${v? col : (white?'#14181a':'#6d6b64')}" ${v?`opacity="${(0.35+0.65*v).toFixed(2)}" filter="url(#aglow)"`:''}/>`;
  let s = `<svg viewBox="0 0 1230 658" role="img" aria-label="ABS-1 front panel (manual line art = silkscreen)" style="width:100%;max-width:900px;display:block">
    <defs><filter id="aglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <polygon points="${FP.outer}" fill="${panel}"/>`;
  for (const k in FP.btn){ const [x,y]=FP.btn[k], down = !((scan>>KEYS[k])&1);
    s += `<rect x="${x-54}" y="${y-54}" width="108" height="108" rx="4" fill="${down?(white?'#0c0e10':'#a9a79f'):(white?'#2d3237':'#e6e4dc')}"/>`; }
  s += `<image href="${ASSET}abs1-front-${D.ink}.png" width="1230" height="658"/>`;
  for (const k in FP.btnLamp){ const [x,y]=FP.btn[k], [reg,bit]=FP.btnLamp[k], v=L[reg][bit];
    s += `<rect x="${x-21}" y="${y-10}" width="42" height="20" rx="2" fill="${v? '#ffb43a' : lampOff}" ${v?'filter="url(#aglow)"':''}/>`; }
  FP.lvlLed.forEach(([x,y,b])=> s += roundLed(x,y,L.dis0[b],'#ff4a3a'));
  FP.rateLed.forEach(([x,y,b])=> s += roundLed(x,y,L.dis1[b],'#ff4a3a'));
  s += roundLed(FP.lowbat[0], FP.lowbat[1], D.power&&D.lowBat?1:0, '#ff4a3a');
  const [px,py]=FP.power; s += `<g class="abs1-pwr" style="cursor:pointer"><rect x="${px-48}" y="${py-24}" width="96" height="48" fill="transparent"/><circle cx="${px+(D.power?14:-14)}" cy="${py}" r="15" fill="${white?'#c9ccd0':'#3b3a36'}"/></g>`;
  for (const k in FP.btn){ const [x,y]=FP.btn[k]; s += `<rect class="abs1-key" data-k="${k}" x="${x-56}" y="${y-56}" width="112" height="112" fill="transparent" style="cursor:pointer"><title>${KEYNAME[k]} (PORTB bit ${KEYS[k]})</title></rect>`; }
  if (opts.hot) s += opts.hot;
  return s + '</svg>';
}
function rearSVG(t){
  const white = D.ink==='white', panel = white? '#22262a' : '#d8d6ce', e = extAt(t), F = D.power? frameAt(t) : {stopped:true};
  let s = `<svg viewBox="0 0 1330 690" role="img" aria-label="ABS-1 rear panel" style="width:100%;max-width:900px;display:block">
    <defs><filter id="aglow2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <polygon points="${RP.outer}" fill="${panel}"/>
    <image href="${ASSET}abs1-rear-${D.ink}.png" width="1330" height="690"/>`;
  // signal halo on the AES OUTPUT when a clock runs
  if (!F.stopped) s += `<circle cx="${RP.out[0]}" cy="${RP.out[1]}" r="160" fill="none" stroke="var(--accent)" stroke-width="8" opacity=".55" filter="url(#aglow2)"><title>AES3 running at ${F.fs/1000} kHz</title></circle>`;
  const [rx,ry] = RP.ref;
  s += `<g class="abs1-ref" style="cursor:pointer"><circle cx="${rx}" cy="${ry}" r="150" fill="transparent"/>`;
  if (e.conn) s += `<circle cx="${rx}" cy="${ry}" r="104" fill="#2b2f33" stroke="#555" stroke-width="6"/><rect x="${rx-34}" y="${ry+90}" width="68" height="70" rx="10" fill="#2b2f33"/><text x="${rx}" y="${ry+10}" text-anchor="middle" font-size="34" fill="#e7e9ea">${e.fs/1000}k</text>`;
  s += `<title>${e.conn?'Click to unplug':'Click to plug in'} the AES reference</title></g></svg>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.abs1-key').forEach(g=> g.addEventListener('click', ()=>A.press(g.dataset.k)));
  const p = root.querySelector('.abs1-pwr'); if (p) p.addEventListener('click', ()=>A.power());
  const r = root.querySelector('.abs1-ref'); if (r) r.addEventListener('click', ()=>A.plugRef(!extAt(SIM.t).conn));
}
function controlsHTML(){
  const b = (k,l,key)=>`<button data-a="${k}" title="Key ${key}">${l}</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    ${b('lvl','AUDIO LEVEL','L')}${b('srate','SAMPLE RATE','S')}${b('k1','1KHz','1')}${b('f400','400Hz','4')}${b('cycle','CYCLE','C')}${b('invert','INVERT','I')}${b('boff','B OFF','O')}${b('invalid','INVALID','V')}
    <button data-a="pwr">POWER</button></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px" class="small">
    <label><input type="checkbox" data-c="ref"> AES reference plugged in</label>
    <label>at <select data-c="reffs">${[32000,44056,44100,48000,38000,52000].map(f=>`<option value="${f}">${f===44056?'44.056':f/1000} kHz</option>`).join('')}</select></label>
    <label><input type="checkbox" data-c="jump"> jump to the debounced moment after a press</label>
    <label><input type="checkbox" data-c="lowbat"> battery low</label></div>
    <div class="small muted" style="margin-top:4px">Keys: L S 1 4 C I O V. Click a button on the panel to press it at the playhead (held ${HOLD*1000|0} ms ${inf}). Click the rear REF INPUT XLR to plug or unplug a reference.</div>`;
}
function bindControls(root){
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>{ const a=b.dataset.a; if (a==='pwr') A.power(); else A.press(a); });
  const q = s=>root.querySelector(`[data-c="${s}"]`);
  if (q('ref')){ q('ref').checked = extAt(SIM.t).conn; q('ref').onchange = e=>A.plugRef(e.target.checked); }
  if (q('reffs')){ q('reffs').value = extAt(SIM.t).fs; q('reffs').onchange = e=>A.refRate(+e.target.value); }
  if (q('jump')){ q('jump').checked = D.autoJump; q('jump').onchange = e=>{ D.autoJump = e.target.checked; }; }
  if (q('lowbat')){ q('lowbat').checked = D.lowBat; q('lowbat').onchange = e=>{ D.lowBat = e.target.checked; SIM.refresh(); }; }
}
document.addEventListener('keydown', e=>{
  if (!window.__abs1Active || e.ctrlKey || e.metaKey || e.altKey || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const m = { l:'lvl', s:'srate', '1':'k1', '4':'f400', c:'cycle', i:'invert', o:'boff', v:'invalid' }[e.key.toLowerCase()];
  if (m){ A.press(m); e.preventDefault(); }
});

/* ================================================================
   TIMELINE LANES
   ================================================================ */
function digital(c, X, t0, t1, y, h, fn, col, label){
  // fn(t) → 0/1, evaluated at pass boundaries (all these signals only change inside a pass)
  const P = emulate().P; c.strokeStyle=col; c.lineWidth=1.5; c.beginPath();
  let i0 = passIndexAt(t0), last=null; const yy=v=> v? y+5 : y+h-5;
  c.moveTo(X(t0), yy(fn(t0)));
  for (let i=i0; i<P.length && P[i].t0<=t1; i++){ const tt=Math.max(t0,P[i].t0+(P[i].lat||0)); const v=fn(tt); if (v!==last && last!==null){ c.lineTo(X(tt), yy(last)); c.lineTo(X(tt), yy(v)); } last=v; }
  c.lineTo(X(t1), yy(last)); c.stroke();
  if (label){ c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(label, X(t0)+4, y+h/2+3); }
}
function segText(c, X, t0, t1, y, h, items, colFn){
  // items: [{a,b,txt}] drawn as bus segments
  c.font='10.5px '+SIM.css('--mono');
  items.forEach((it,k)=>{ const a=Math.max(t0,it.a), b=Math.min(t1,it.b); if (b<=a) return; const xa=X(a), xb=X(b);
    const cf = colFn? colFn(it,k) : [k%2? '--chip' : '--lane', 1];
    if (cf){ c.fillStyle = SIM.css(cf[0]); c.globalAlpha = cf[1]; c.fillRect(xa, y+3, Math.max(1,xb-xa-1), h-6); c.globalAlpha = 1; }
    c.strokeStyle=SIM.css('--line'); c.strokeRect(xa+.5, y+3.5, Math.max(1,xb-xa-1), h-7);
    if (xb-xa > 40){ c.fillStyle=SIM.css('--ink'); c.save(); c.beginPath(); c.rect(xa,y,xb-xa-2,h); c.clip(); c.fillText(it.txt, xa+4, y+h/2+4); c.restore(); } });
}
function hcItems(t0, t1, fmt){
  const P = emulate().P, out=[]; let cur=null;
  for (let i=Math.max(0,passIndexAt(t0)-1); i<P.length; i++){ const p=P[i]; const tt=p.t0+(p.lat||0); if (p.t0>t1) break;
    const txt = fmt(p);
    if (!cur || cur.txt!==txt){ if (cur) cur.b=tt; cur={a:tt, b:t1, txt}; out.push(cur); } }
  return out;
}
function segPulses(c,X,t0,t1,y,h,a,b,period,phase,width,col,label){
  a=Math.max(t0,a); b=Math.min(t1,b); if (b<=a) return;
  if (X(b)-X(a) < 260 && Math.abs(X(a+period)-X(a)) < 2.2){ c.fillStyle=col; c.globalAlpha=.35; c.fillRect(X(a), y+h*0.3, X(b)-X(a), h*0.4); c.globalAlpha=1; return; }
  SIM.pulses(c,X,a,b,y,h,period,phase,width,col,label);
}
function lanes(opts){
  opts = opts||{};
  const css=SIM.css, ls=[];
  ls.push({label:'PIC main loop (passes)', h:32, draw(c,X,t0,t1,y,h){
    const P=emulate().P; const avg = 1/3500; const pxPass = X(t0+avg)-X(t0);
    let shown=0;
    for (let i=passIndexAt(t0); i<P.length && P[i].t0<=t1; i++){ const p=P[i]; shown++;
      if (p.kind==='init'){ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(p.t0),y+3,X(p.t0+p.dur)-X(p.t0),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('INIT: DELAY (DELAY2 = 0xFF) ≈ 35.7 ms', Math.max(X(p.t0),X(t0))+4, y+h/2+4); continue; }
      if (p.kind==='off'){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('power off', X(t0)+4, y+h/2+4); continue; }
      if (pxPass > 90){ let tt=p.t0;
        p.steps.forEach((cy,j)=>{ const d=cy/FCY; c.fillStyle = j===7? css('--ink2') : j===9? css('--accent2') : j===4&&cy>5? css('--warn') : css('--accent');
          c.globalAlpha = j===7? .35 : (j%2? .6 : .85); c.fillRect(X(tt), y+3, Math.max(1,X(tt+d)-X(tt)-1), h-6); c.globalAlpha=1;
          const xa=Math.max(X(tt),X(t0)), xb=Math.min(X(tt+d),X(t1)); if (xb-xa > 44){ c.fillStyle= j===7? css('--ink') : '#fff'; c.font='10px sans-serif'; c.fillText(STEPS[j][0].split(' · ').pop().slice(0,14) + (xb-xa>200? ` (pass #${p.i})`:''), xa+3, y+h/2+3); }
          tt+=d; });
      } else { c.fillStyle = p.ev.length? css('--warn') : (p.i%2? css('--accent') : css('--accent2')); c.globalAlpha=.75; c.fillRect(X(p.t0), y+3, Math.max(1,X(p.t0+p.dur)-X(p.t0)-.5), h-6); c.globalAlpha=1; }
    }
    if (pxPass < 3){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${shown.toLocaleString()} passes in view · ≈${(1e6/3500).toFixed(0)} µs each (≈ 439 cycles at 1.536 MIPS) · orange = a pass where something happened`, X(t0)+6, y+h/2+4); }
  }});
  ls.push({label:'Buttons (PORTB low)', h:24, draw(c,X,t0,t1,y,h){
    c.font='10.5px sans-serif';
    D.presses.forEach(p=>{ if (p.t+p.hold<t0||p.t>t1) return; c.fillStyle=css('--warn'); c.globalAlpha=.55; c.fillRect(X(p.t), y+4, Math.max(2,X(p.t+p.hold)-X(p.t)), h-8); c.globalAlpha=1; c.fillStyle=css('--ink'); c.fillText(KEYNAME[p.key], X(p.t)+3, y+h/2+4); });
    if (!D.presses.length){ c.fillStyle=css('--ink2'); c.fillText('no presses in this second — click a panel button', X(t0)+6, y+h/2+4); }
  }});
  ls.push({label:'BOUNCE → PROCESS', h:22, draw(c,X,t0,t1,y,h){
    const P=emulate().P;
    for (let i=passIndexAt(t0); i<P.length && P[i].t0<=t1; i++){ const p=P[i]; if (!p.ev.length) continue;
      p.ev.forEach(e=>{ const col = /^PROCESS/.test(e)? css('--bad') : /^BOUNCE/.test(e)? css('--accent2') : /^chng|^ext|^unlock|^REFRESH/.test(e)? css('--warn') : css('--ink2');
        c.fillStyle=col; c.fillRect(X(p.t0)-1, y+3, 3, h-6); });
      if (X(P[Math.min(P.length-1,i+1)].t0)-X(p.t0) > 120 || (t1-t0)<0.05){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(p.ev[0].split(':')[0], X(p.t0)+4, y+h/2+4); } }
  }});
  ls.push({label:'74HC4094 (SR F tone INV V ext)', h:26, draw(c,X,t0,t1,y,h){
    segText(c,X,t0,t1,y,h, hcItems(t0,t1, p=>{ const f=hcFields(p.hc); return `SR${f.sr1}${f.sr0} F${f.f1}${f.f0} ${f.k1?'1K':'400'} I${f.inv} V${f.v} E${f.ext}`; }),
      it=> /SR11/.test(it.txt)? ['--bad',.22] : /F11/.test(it.txt)? ['--warn',.25] : ['--accent',.16]);
  }});
  ls.push({label:'chng_* delay counters', h:22, draw(c,X,t0,t1,y,h){
    segText(c,X,t0,t1,y,h, hcItems(t0,t1, p=>{ const r=p.r; return (r.flag&2)? 'chng_freq: count1 ↓ (255 passes)' : (r.flag&1)? `chng_lvl: count2 = ${r.c2}` : 'idle'; }),
      it=> it.txt==='idle'? null : ['--warn',.22]);
  }});
  ls.push({label:'RC7 B-CYCLE (B muted)', h:22, draw(c,X,t0,t1,y,h){ digital(c,X,t0,t1,y,h, t=>rc7At(t), css('--bad')); }});
  ls.push({label:'RA0 (0 = receiver on)', h:22, draw(c,X,t0,t1,y,h){ digital(c,X,t0,t1,y,h, t=>passAt(t).r.ra0, css('--accent2'), (regsAt(t0).dis1&8)?'':'not EXT: RA0 = 1'); }});
  ls.push({label:'LED mux (RC6 dis0 / RC5 dis1)', h:22, draw(c,X,t0,t1,y,h){
    const P=emulate().P; const px = X(t0+1/3500)-X(t0);
    if (px < 2){ c.fillStyle=css('--ink2'); c.font='11px '+css('--mono'); c.fillText('dis0/dis1 alternate every pass (≈1.7 kHz); round lamps lit 1 pass in 34', X(t0)+6, y+h/2+4); return; }
    for (let i=passIndexAt(t0); i<P.length && P[i].t0<=t1; i++){ const p=P[i]; if (p.kind!=='loop') continue;
      c.fillStyle = p.phase? css('--accent2') : css('--accent'); c.globalAlpha = p.bright? .95 : .35; c.fillRect(X(p.t0), y+(p.phase?h/2:3), Math.max(1,X(p.t0+p.dur)-X(p.t0)-1), h/2-3); c.globalAlpha=1; }
  }});
  ls.push({label:'CPLD 256fs source', h:24, draw(c,X,t0,t1,y,h){
    segText(c,X,t0,t1,y,h, emulate().segs.map(s=>({a:s.t0, b:s.t1, txt: s.fs? `${(s.fs/1000).toFixed(s.fs%1000?3:0)} kHz · ${s.src}` : s.src})),
      it=> /none|off|gated/.test(it.txt)? ['--bad',.22] : ['--accent2',.16]);
  }});
  ls.push({label:'sa0–sa6 (EPROM A3–A9)', h:30, draw(c,X,t0,t1,y,h){
    const pw = X(t1)-X(t0); c.strokeStyle=css('--accent'); c.lineWidth=1.2; c.beginPath(); const N=Math.min(1600, Math.max(300, pw*2));
    let dense=false;
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const F=frameAt(tt); if (F.stopped){ continue; } if ((t1-t0)/N > 3/F.fs){ dense=true; } const yy = y+h-3 - (F.sa/128)*(h-6); i? c.lineTo(X(tt),yy) : c.moveTo(X(tt),yy); }
    c.stroke();
    if (dense){ const F=frameAt((t0+t1)/2); const tx = F.stopped? 'counter stopped (no 256fs)' : `counts 0…${F.seg.N-1} at fs, wraps every ${SIM.fmtDur(F.seg.N/F.fs)} (clear :49)`; c.font='10.5px '+css('--mono'); c.fillStyle=css('--panel'); c.globalAlpha=.85; c.fillRect(X(t0)+3, y+2, c.measureText(tx).width+6, 13); c.globalAlpha=1; c.fillStyle=css('--ink'); c.fillText(tx, X(t0)+6, y+12); }
  }});
  ls.push({label:'EPROM reads (8 bytes per frame)', h:26, draw(c,X,t0,t1,y,h){
    const F0 = frameAt(t0);
    const span=t1-t0, fs = F0.fs || 48000;
    if (span*fs > (X(t1)-X(t0))/30){ const S=emulate().segs; S.forEach(s=>{ if (!s.fs || s.t1<t0 || s.t0>t1) return; segPulses(c,X,t0,t1,y,h,s.t0,s.t1,1/(8*s.fs),s.t0,0.3/(8*s.fs),css('--accent2'),'byte reads'); }); return; }
    let t=t0; let guard=0;
    while (t < t1 && guard++<400){ const F=frameAt(t); if (F.stopped){ break; } const fb=frameBytes(t);
      for (let b=0;b<8;b++){ const order=[4,5,6,7,0,1,2,3][b]; const a=F.t0 + b/(8*F.fs), e=a+1/(8*F.fs); const xa=X(a), xb=X(e);
        c.fillStyle= css(b<4? '--accent' : '--accent2'); c.globalAlpha=.2; c.fillRect(xa,y+3,xb-xa-1,h-6); c.globalAlpha=1;
        if (xb-xa>58){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`${(fb.base|order).toString(16).toUpperCase().padStart(4,'0')}:${fb.bytes[order].toString(16).toUpperCase().padStart(2,'0')}`, xa+3, y+h/2+4); } }
      t = F.t1 + 1e-12; }
  }});
  ls.push({label:'AES3 blocks (Z preamble)', h:20, draw(c,X,t0,t1,y,h){
    emulate().segs.forEach(s=>{ if (!s.fs || s.t1<t0 || s.t0>t1) return; const ph = s.t0 - ((s.F0 % 192) - s.frac0)/s.fs; segPulses(c,X,t0,t1,y,h,s.t0,s.t1,192/s.fs,ph,1/s.fs,css('--warn'),'blocks of 192 frames'); });
  }});
  ls.push({label:'CPLD pins: Q6 · SCLK · SDATA', h:40, draw(c,X,t0,t1,y,h){
    const F0=frameAt(t0); if (F0.stopped && frameAt(t1).stopped){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no clock', X(t0)+6, y+h/2+4); return; }
    const fs = F0.fs||frameAt(t1).fs; if ((t1-t0)*fs > 6){ c.fillStyle=css('--ink2'); c.font='10.5px '+css('--mono'); c.fillText(`SCLK bursts: 8 × 6.144 MHz-class pulses per byte, 64 bits per frame (zoom to ≤ 4 frames)`, X(t0)+6, y+h/2+4); return; }
    let t=t0, guard=0; const rows=[['q6',4],['SCLK',16],['SDATA',28]];
    while (t<t1 && guard++<10){ const F=frameAt(t); if (F.stopped) break; const fb=frameBytes(t); const prevB=frameBytes(F.t0-1e-9);
      const fr = cpldFrame(fb.bytes, rc7At(t), prevB?prevB.bytes:null); const hs = 1/(256*F.fs);
      rows.forEach(([nm,yo],ri)=>{ c.strokeStyle= ri===2? css('--accent') : ri===1? css('--accent2') : css('--ink2'); c.lineWidth=1.2; c.beginPath();
        fr.forEach((s,j)=>{ const v = nm==='q6'? s.q6 : nm==='SCLK'? s.SCLK : s.SDATA; const xa=X(F.t0+j*hs), xb=X(F.t0+(j+1)*hs); const yy = y+yo+(v?0:8)-4; j? c.lineTo(xa,yy):c.moveTo(xa,yy); c.lineTo(xb,yy); }); c.stroke(); });
      t = F.t1 + 1e-12; }
  }});
  [0,1].forEach(side=> ls.push({label:`AES ${side?'B (EPROM bytes 0–3)':'A (EPROM bytes 4–7)'}`, h:34, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), N=Math.min(1500, Math.max(200, pw*1.5)), col = side? css('--bad') : css('--accent');
    const f0 = hcFields(hcAt((t0+t1)/2)); const tone = f0.k1? 1000 : 400;
    if ((t1-t0)/N > 1/(6*tone)){ // envelope
      c.fillStyle=col; c.globalAlpha=.35;
      for (let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N; if (!D.power) break; const F=frameAt(tt); if (F.stopped) continue; const f=F.seg.f; if (side && rc7At(tt)) continue; const a=AMP[f.F]/8388608; const xa=X(t0+(t1-t0)*i/N); c.fillRect(xa, y+h/2-a*(h/2-3), pw/N+.6, Math.max(1,2*a*(h/2-3))); }
      c.globalAlpha=1; return; }
    c.strokeStyle=col; c.lineWidth=1.2; c.beginPath(); let pen=false;
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v=outSample(tt, side); if (v===null){ pen=false; continue; } const yy=y+h/2-v*(h/2-3); pen? c.lineTo(X(tt),yy) : c.moveTo(X(tt),yy); pen=true; }
    c.stroke();
  }}));
  ls.push({label:'Lamps: level · rate · LOCK', h:30, draw(c,X,t0,t1,y,h){
    const rows = [['dis0',0xA8|0x40,css('--bad')],['dis1',0xE8,css('--bad')],['dis1',0x10,css('--warn')]];
    const N=Math.min(700, Math.max(80,(X(t1)-X(t0))/2)), span=t1-t0;
    rows.forEach(([reg,mask,col],ri)=>{ for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; const p=passAt(tt); if (p.kind!=='loop') continue; const v = p.r[reg] & mask; if (!v) continue; c.fillStyle=col; c.globalAlpha=.8; c.fillRect(X(t0+span*i/N), y+3+ri*9, (X(t1)-X(t0))/N+.5, 7); c.globalAlpha=1; } });
    const r=regsAt((t0+t1)/2); c.fillStyle=css('--ink'); c.font='10px '+css('--mono');
    c.fillText(`${lvlLamp(r)} · ${rateLamp(r)}${(r.dis1&16)?' · LOCK':''}`, X(t1)-170, y+h-4);
  }});
  return ls;
}
function lvlLamp(r){ return r.dis0&8?'0 dBFS': r.dis0&0x20?'−12': r.dis0&0x80?'−20' : r.dis0&0x40?'OFF':'none'; }
function rateLamp(r){ const s=[]; if (r.dis1&0x40) s.push('48K'); if (r.dis1&0x80) s.push('44.1K'); if (r.dis1&0x20) s.push('32K'); if (r.dis1&8) s.push('EXT'); return s.join('+')||'no rate lamp'; }

/* ---------------- scope: one frame at the playhead ---------------- */
function drawScope(cv, el, t){
  const {c,w} = SIM.canvas(cv, 230);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  const F = D.power? frameAt(t) : {stopped:true};
  if (F.stopped){ c.fillStyle=ink2; c.font='13px sans-serif'; c.fillText('No 256fs clock at the playhead (SR = 11 or power off): the CS8402A has no MCK and sends nothing.', 10, 40); el.innerHTML=''; return; }
  const f = F.seg.f, fb = frameBytes(t), prevB = frameBytes(F.t0-1e-9);
  const vA = outSample(t,0), vB = outSample(t,1);
  const blk = F.idx % 192;
  const sA = aesSub(vA, blk===0?'Z':'X', f.v, 0), sB = aesSub(vB, 'Y', f.v, 0);
  const lvA = biphase(sA.pre, sA.bits, 0), lvB = biphase('Y', sB.bits, lvA[lvA.length-1]);
  const lv = lvA.concat(lvB), cw=(w-20)/lv.length;
  [[0,8,warn,'pre'],[8,16,ink2,'aux (4)'],[16,56,acc,'audio: 24-bit word, LSB first'],[56,64,a2,'VUCP']].forEach(([a,b,col,lb])=>[0,64].forEach(off=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw, 18, (b-a)*cw, 52); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>30) c.fillText(lb, 12+(off+a)*cw, 82); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?24:64; i? c.lineTo(x,y):c.moveTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`AES3 subframe A (${sA.pre}), standard layout`, 12, 12); c.fillText('subframe B (Y)', 12+64*cw, 12);
  // CPLD raw serial lanes
  const fr = cpldFrame(fb.bytes, rc7At(t), prevB? prevB.bytes : null); const hw=(w-20)/256;
  const rows=[['128FS',s=>s.F],['Q6 → FSYNC',s=>s.q6],['SCLK',s=>s.SCLK],['SDATA',s=>s.SDATA],['SCLKA → DAC',s=>s.SCLKA]];
  rows.forEach(([nm,fn],ri)=>{ const y0=100+ri*24; c.fillStyle=ink2; c.font='10px '+SIM.css('--mono'); c.fillText(nm, 12, y0+8);
    if (nm==='128FS'){ c.fillStyle=ink2; c.globalAlpha=.25; for (let j=0;j<256;j+=2) c.fillRect(10+(j+1)*hw, y0, hw, 14); c.globalAlpha=1; return; }
    c.strokeStyle= nm==='SDATA'? acc : nm==='SCLK'? a2 : nm==='SCLKA → DAC'? warn : ink; c.lineWidth=1.3; c.beginPath();
    fr.forEach((s,j)=>{ const v=fn(s); const x=10+j*hw, y=y0+(v?2:14); j? c.lineTo(x,y):c.moveTo(x,y); c.lineTo(x+hw,y); }); c.stroke(); });
  for (let b=0;b<8;b++){ const x=10+b*32*hw; c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(x,96); c.lineTo(x,222); c.stroke(); const byte=[4,5,6,7,0,1,2,3][b]; c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(`byte ${byte}: ${fb.bytes[byte].toString(16).toUpperCase().padStart(2,'0')}`, x+3, 226); }
  const hex = v=> (v<0? v+(1<<24): v).toString(16).toUpperCase().padStart(6,'0');
  el.innerHTML = `Frame ${F.idx.toLocaleString()} (${blk}/191 of the block) · sa = ${F.sa} of ${F.seg.N} · EPROM ${(fb.base).toString(16).toUpperCase().padStart(4,'0')}–${(fb.base|7).toString(16).toUpperCase().padStart(4,'0')} · fs ${F.fs.toLocaleString()} Hz · frame ${SIM.fmtDur(1/F.fs)}<br>
    A = bytes 4–7 → 0x${hex(sA.raw)} (${vA.toFixed(5)} FS) · B = bytes 0–3 → 0x${hex(sB.raw)} (${vB.toFixed(5)} FS)${rc7At(t)?' <b>(B cleared by B-CYCLE)</b>':''} · V = ${f.v}<br>
    <span class="muted">Lower trace is the CPLD as fitted: each EPROM byte is loaded at count 2 and shifted out <b>MSB first</b> on 8 SCLK edges, bytes in address order (LSB byte first). The AES3 trace above assumes the 24-bit word arrives as the standard wants; how the CS8402A reconciles the two is an open question (see Findings). Channel-status bits are strapped on the CS8402A and are shown as 0 (${inf}).</span>`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function traceHTML(n){
  const e = D.log[0]; if (!e) return '<div class="muted">Press a button on the panel. Every step the PIC and the CPLD take is listed here, with the time after the press.</div>';
  return `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>` + e.lines.slice(0, n||40).map(l=>`<div><span class="muted">${fmtRel(l.t-e.t)}</span> → ${l.txt}</div>`).join('');
}
function inspectorHTML(t){
  const st=stepAt(t), p=st.pass, r=p.r, hc=hcAt(t), f=hcFields(hc), F = D.power? frameAt(t) : {stopped:true}, ck=clockOf(hc,t), e=extAt(t);
  return `<table class="kv">
    <tr><th>PIC pass</th><td class="mono">${p.kind==='init'?'INIT (power-on delay)':p.kind==='off'?'off':'#'+p.i+' · '+STEPS[Math.max(0,st.step)][0]}</td></tr>
    <tr><th>dis0 / dis1</th><td class="mono">${bin8(r.dis0)} / ${bin8(r.dis1)} → ${lvlLamp(r)} · ${rateLamp(r)} · ${r.dis1&2?'1KHz':'400Hz'}${r.dis1&16?' · LOCK':''}${r.dis0&2?' · CYCLE':''}${r.dis0&1?' · INVERT':''}${r.dis0&4?' · B OFF':''}${r.dis1&4?' · INVALID':''}</td></tr>
    <tr><th>hc4094 (Q8…Q1)</th><td class="mono">${bin8(hc)} · ${hcText(hc)}</td></tr>
    <tr><th>chng_flag / counts</th><td class="mono">${bin8(r.flag).slice(6)} · c1=${r.c1} c2=${r.c2} c3=${r.c3}</td></tr>
    <tr><th>BOUNCE</th><td class="mono">scan0=${bin8(r.scan0)} dbcount=${r.db} ${r.mux1&1?'(waiting for release)':''}</td></tr>
    <tr><th>RC7 / RA0</th><td class="mono">B-CYCLE ${r.rc7} · RA0 ${r.ra0} ${r.lockf?'(hunting: receiver off)':''} · REF ${e.conn? e.fs/1000+' kHz':'none'}</td></tr>
    <tr><th>CPLD clock</th><td class="mono">${ck.fs? (ck.fs*256/1e6).toFixed(4)+' MHz 256fs · fs '+ck.fs+' Hz' : 'stopped'} — ${ck.src}</td></tr>
    <tr><th>EPROM table</th><td class="mono">${f.SR===3? 'none (A15 A14 = 11: unused upper 16 KB)' : `0x${tableBase(f).toString(16).toUpperCase().padStart(4,'0')}: ${RATE_NAMES[f.SR]} · ${f.k1?'1 kHz':'400 Hz'} · ${LVL_NAMES[f.F]} · B ${f.inv?'out of phase':'in phase'} · ${tableN(f.SR,f.k1)} samples`}</td></tr>
    <tr><th>Frame</th><td class="mono">${F.stopped? '—' : `#${F.idx.toLocaleString()} · sa ${F.sa}/${F.seg.N} · tone ${(F.fs/F.seg.N).toFixed(2)} Hz`}</td></tr>
    <tr><th>Outputs</th><td class="mono">AES: ${F.stopped?'no signal':`${levelDb(f)===null?'OFF (digital silence)':levelDb(f)+' dBFS'}${r.rc7?' · B muted':''}${f.v?' · V=1':''}`} · analog: ${F.stopped?'—':LVL_DBU[f.F]}</td></tr>
  </table>`;
}
function viewSim(m){
  window.__abs1Active = true;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — what the operator sees', `<div id="fp"></div>${controlsHTML()}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <button id="pr">Replay power-on at t = 0</button><button id="fr">Start a fresh second from the settled state</button><button id="cl">Clear presses</button><button id="rs">Reset all</button>
          <label class="small">Tables <select id="tb"><option value="split">DATA32xx/44xx/48xx (corrected, Jan 1998|31)</option><option value="combined">ABSDATA.ASM (7 Jan 1998|31, with its defects)</option></select></label>
          <label class="small">Ink <select id="ink"><option value="white">white on dark ${''}</option><option value="black">black on grey</option></select></label>
        </div>`)}
      ${card('Rear panel — click REF INPUT to plug or unplug an AES reference', `<div id="rp"></div>`)}
    </div>
    <div>
      ${card('What the firmware and the CPLD did (last action)', `<div id="trace" class="log" style="max-height:340px"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; use the transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">The PIC firmware is executed pass by pass from RESET (or from the state you started the second in) with your button presses at the times you made them. A pass is ≈ 439 instruction cycles at 1.536 MIPS (hand-counted from <span class="mono">abs1v103.asm</span>, ±2 cycles per routine), so 32 debounce passes ≈ 9 ms and the 7 × 255-pass level delay ≈ 0.52 s. Panel colours are ${inf} (the archive has no photos).</p>`)}
  <div class="grid2">
    ${card('Scope: one AES3 frame at the playhead, and the CPLD pins that made it', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
    const q=s=>m.querySelector(`[data-c="${s}"]`); if (q('ref')) q('ref').checked = extAt(t).conn;
  };
  bindControls(m);
  m.querySelector('#pr').onclick=()=>A.powerReplay();
  m.querySelector('#fr').onclick=()=>A.fresh();
  m.querySelector('#cl').onclick=()=>A.clear();
  m.querySelector('#rs').onclick=()=>A.reset();
  const tb=m.querySelector('#tb'); tb.value=D.tables; tb.onchange=e=>{ D.tables=e.target.value; SIM.refresh(); };
  const ik=m.querySelector('#ink'); ik.value=D.ink; ik.onchange=e=>{ D.ink=e.target.value; SIM.refresh(); };
  SIM.on('time', draw);
}

/* ---------------- tutorial (from ABS-1 Manual PDF.pdf) ---------------- */
const S = ()=>settled(), SH = ()=>hcFields(settledHc());
const LESSONS = [
  { title:'Meet the ABS-1', body:`<p>The ABS-1 Audio Bit Spitter is a battery-powered test-tone generator, the companion to the ABB-1 Audio Bit Buddy. It sends an <b>AES/EBU</b> digital tone from the rear XLR and the same tone as <b>balanced analog</b> on two TRS jacks.</p>
     <p>Every control is on the front panel: eight lighted push-buttons, two rows of four lamps (<b>AUDIO LEVEL</b> and <b>SAMPLE RATE</b>), a LOW BAT lamp and the POWER switch. Inside, a PIC reads the buttons and sets eight select lines. A CPLD and an EPROM then play pre-computed samples. No arithmetic happens while the tone plays.</p>
     <p class="muted">This tutorial follows the 2002|35 manual. Each press is made at the playhead and the firmware runs again, so you can scrub the timeline to watch the slow parts happen.</p>`, check:()=>true, auto:true },
  { title:'1 · Switch on: the defaults', body:`<p>The manual: <i>“When the POWER toggle switch is first turned on the unit defaults to AUDIO LEVEL – OFF, SAMPLE RATE – 48kHz, TONE – 1kHz.”</i></p><p>Click <b>Start over (power-on)</b> below, or flick POWER off and on (click the switch twice). For the first 35.7 ms <span class="mono">INIT</span> sits in <span class="mono">DELAY</span>. It then writes SR = 11 and F = 11, so the clock is stopped and the level is off. After 255 passes (≈ 74 ms) <span class="mono">chng_freq</span> switches to 48 kHz.</p><p><b>Goal:</b> OFF, 48K and 1KHz lit.</p>`, check:()=> D.power && (S().dis0&0x40) && (S().dis1&0x40) && (S().dis1&2), hint:'Click “Start over (power-on)”, or click POWER twice.' },
  { title:'2 · Choose a level', body:`<p>Press <b>AUDIO LEVEL</b>. The lamps step OFF → −20 → −12 → 0 dBFS and back to OFF. The analog jacks follow: −16 / −8 / +4 dBu.</p><p>The manual: <i>“The ABS-1 mutes the audio output when the level push button is operated.”</i> In the code, <span class="mono">lvl</span> sets F1 F0 = 11 at once, which selects the silent OFF tables. <span class="mono">chng_lvl</span> then waits 7 × 255 passes (≈ 0.52 s) before it writes the new level. Press several times quickly and the loud levels never come out.</p><p><b>Goal:</b> −20 dBFS, with the output actually at −20.</p>`, check:()=> (S().dis0&0x80) && SH().F===2, hint:'Press AUDIO LEVEL once from OFF (key L), then wait or press ▶ for half a second.' },
  { title:'3 · Full scale', body:`<p>Press AUDIO LEVEL twice more to reach <b>0 dBFS</b> (+4 dBu analog). Watch the <i>74HC4094</i> lane on the timeline: F goes to 11 on each press and only drops to 00 after the last one.</p><p><b>Goal:</b> 0 dBFS.</p>`, check:()=> (S().dis0&8) && SH().F===0, hint:'From −20: two presses (−12, then 0).' },
  { title:'4 · Tone', body:`<p>Press <b>400Hz</b>. On the next pass <span class="mono">REFRESH</span> clears hc4094 Q1 (“1K”). That is EPROM address line A13, and it also changes the CPLD's counter length from 48 to 120 samples. No delay and no mute: the next frame already reads the 400 Hz table.</p><p><b>Goal:</b> 400 Hz.</p>`, check:()=> (S().dis1&1) && !SH().k1, hint:'Key 4, or click the 400Hz button.' },
  { title:'5 · Sample rate', body:`<p>Press <b>SAMPLE RATE</b> to step 48K → 44.1K → 32K → EXT. In the code, <span class="mono">srate</span> first writes SR = 11. Sheet 1 calls that code “spare”, and the CPLD's 256fs clock simply stops, so the AES output goes silent for 255 passes (≈ 74 ms). <span class="mono">chng_freq</span> then writes the new rate, and the level comes back ≈ 0.52 s later.</p><p><b>Goal:</b> 44.1 kHz. Zoom the timeline to 100 ms to see the gap in the <i>CPLD 256fs source</i> lane.</p>`, check:()=> (S().dis1&0x80) && SH().SR===1 && !SH().ext, hint:'Press SAMPLE RATE once from 48K (key S).' },
  { title:'6 · Find left and right: CYCLE', body:`<p>The manual: B can be <i>“toggled and/or phase inverted … or turned off completely”</i>. Press <b>CYCLE</b>. <span class="mono">REFRESH</span> now flips RC7 (the B-CYCLE net into CPLD pin 1) every 7 × 255 passes (≈ 0.52 s). While RC7 is high, the CPLD clears its shift register during the B half of every frame.</p><p><b>Goal:</b> CYCLE on. Play the timeline and watch the AES B lane blink.</p>`, check:()=> (S().dis0&2), hint:'Key C.' },
  { title:'7 · INVERT', body:`<p>Press <b>INVERT</b>. It sets hc4094 Q5, which is EPROM line A10. A10 selects the “B OUT OF PHASE” copy of every table. INVERT can run together with CYCLE, but it switches B OFF off.</p><p class="muted">The out-of-phase tables are the in-phase table played backwards, so B is inverted <i>and</i> one sample late (see Findings).</p><p><b>Goal:</b> INVERT on.</p>`, check:()=> (S().dis0&1), hint:'Key I.' },
  { title:'8 · B OFF', body:`<p>Press <b>OFF</b> (CHB). <span class="mono">off_b</span> clears the CYCLE and INVERT lamps, and <span class="mono">REFRESH</span> holds RC7 high. Channel B is now digital silence, and so is the right analog jack, because the DAC is fed from the same serial data.</p><p><b>Goal:</b> B OFF on.</p>`, check:()=> (S().dis0&4) && !(S().dis0&3), hint:'Key O.' },
  { title:'9 · Send invalid', body:`<p>Press <b>INVALID</b>. hc4094 Q7 (“VALIDITY”) drives the CS8402A <b>V</b> pin, so every subframe carries V = 1: <i>“the data being sent may not be suitable for conversion”</i>. A downstream meter may still show the level, but a DAC may mute.</p><p><b>Goal:</b> INVALID on.</p>`, check:()=> (S().dis1&4) && SH().v, hint:'Key V.' },
  { title:'10 · EXT with nothing plugged in', body:`<p>Unplug any reference, then press SAMPLE RATE until <b>EXT</b> lights. With no reference, the CS8412 reports E1 E0 = 11. <span class="mono">ext_lock</span> keeps the output stopped and muted. Every 32 passes it switches the receiver's 6.144 MHz FCK off for 64 passes and then tries again (<span class="mono">unlock</span>, added in v1.01). Look at the <i>RA0</i> lane.</p><p><b>Goal:</b> EXT selected, no LOCK.</p>`, check:()=> (S().dis1&8) && !(S().dis1&0x10), hint:'Uncheck “AES reference plugged in”, then press S until EXT is lit.' },
  { title:'11 · Lock to a reference', body:`<p>Pick <b>44.1 kHz</b> as the reference rate and plug it in (click the rear REF INPUT). On the next pass <span class="mono">ext_lock</span> sets ext_en and the LOCK lamp in the SAMPLE RATE button. <span class="mono">ext_freq</span> reads F2–F0 and lights 44.1K. The CPLD's 256fs now comes from the CS8412's MCK. Try 38 kHz: the unit locks, shows no rate lamp, and plays the 44.1 kHz tables, so the tone is off-frequency, as the manual warns.</p><p><b>Goal:</b> LOCK + 44.1K.</p>`, check:()=> (S().dis1&0x10) && (S().dis1&0x80), hint:'Choose 44.1 kHz in the reference menu, tick “AES reference plugged in”.' },
  { title:'Done', body:`<p>You've used every control on the ABS-1. <b>One second</b> breaks a frame down to EPROM bytes and SCLK edges. <b>Software</b> shows the PIC loop, the CPLD counters and the live EPROM map. <b>Findings</b> lists what the design is really doing, including what the manual leaves out.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__abs1Active = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the ABS-1 (after the 2002|35 manual)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}
      <div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div>`)}
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const hot = `<g><rect x="230" y="40" width="330" height="200" fill="transparent"><title>AUDIO LEVEL lamps (dis0 bits 6,7,5,3) — dimmed by MUX to 1 pass in 34</title></rect>
    <rect x="230" y="290" width="330" height="140" fill="transparent"><title>SAMPLE RATE lamps (dis1 bits 6,7,5,3); LOCK is the lamp inside the SAMPLE RATE button</title></rect>
    <rect x="660" y="470" width="120" height="80" fill="transparent"><title>LOW BAT: driven by the power circuit on sheet 2, not by the PIC</title></rect></g>`;
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t, {hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(SIM.t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML(14);
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx]; let ok=false; try{ ok = !!L.check(); }catch(e){}
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached (checked on the settled state at the end of the run).') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (power-on)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
    const q=s=>m.querySelector(`[data-c="${s}"]`); if (q('ref')) q('ref').checked = extAt(SIM.t).conn;
  };
  bindControls(m);
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__abs1Active = true;
  m.innerHTML = `
  ${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="fp"></div><h3>Downstream: what an ABB-1 / AES meter fed from the ABS-1 shows</h3><canvas id="meter"></canvas><p class="small muted">Peak of each channel over the last 10 ms, −60…0 dBFS. The ABB-1's own scale is not in this folder, so the bar is ${inf}.</p>`)}
  </div>
  ${card('Zoom ladder at the playhead — AES A, from one second down to one frame', `<canvas id="zl"></canvas>`)}
  ${card('One frame, byte by byte (EPROM → CPLD → CS8402A)', `<div id="bytes"></div>`)}`;
  const draw = ()=>{
    const t=SIM.t, hc=hcAt(t), f=hcFields(hc), F = D.power? frameAt(t) : {stopped:true}; const fs = F.stopped? 48000 : F.fs, N = F.stopped? tableN(0,1) : F.seg.N;
    const rows = [
      ['PIC instruction cycles', '1,536,000', '651 ns', 'OSC1 = 6M144 from CPLD pin 20; Fosc/4'],
      ['PIC main-loop passes', '≈ 3,500', '≈ 286 µs', 'DELVIS alone is 225 of ≈ 439 cycles'],
      ['LED multiplex phases', '≈ 3,500', '≈ 286 µs', 'dis0 (RC6) and dis1 (RC5) alternate; round lamps lit 1 pass in 34 (≈ 102 Hz)'],
      ['Bits shifted to the 74HC4094', '≈ 28,000', '8 per pass', 'sft_out: RC2 data, RC1 clock, RC3 strobe; only changes matter'],
      ['Button debounce', '—', '≈ 9.2 ms / 55 ms', '32 passes to accept a press, 192 to accept the release (v1.02)'],
      ['Level / rate change delay', '—', '≈ 0.52 s / 74 ms + 0.52 s', 'chng_lvl 7 × 255 passes; chng_freq 255 passes'],
      ['B CYCLE toggles', '≈ 1.9', '≈ 0.52 s', 'cyc_cnt × cyc_cnt1 = 255 × 7 passes'],
      ['AES3 blocks', (fs/192).toFixed(2), SIM.fmtDur(192/fs), 'CS8402A counts 192 frames; Z preamble'],
      ['AES3 frames = sa counts', fs.toLocaleString(), SIM.fmtDur(1/fs), 'sa0–sa6 toggle on q6; one EPROM sample (8 bytes) per frame'],
      ['Tone cycles (table wraps)', (fs/N).toFixed(2), SIM.fmtDur(N/fs), `${N} samples; clear term :49 resets the counter`],
      ['EPROM byte reads', (8*fs).toLocaleString(), SIM.fmtDur(1/(8*fs)), 'A0–A2 = SB0 SB1 Q6; loaded into the shift register at count 2 of 16'],
      ['SCLK edges to CS8402A', (64*fs).toLocaleString(), 'bursts', '8 per byte in the second half of each byte (q3 = 1)'],
      ['SCLKA edges to CS4330', (38*fs).toLocaleString(), 'bursts', '19 per channel, gated by :81 :85 :108'],
      ['AES3 bit cells (biphase)', (128*fs).toLocaleString(), SIM.fmtDur(1/(128*fs)), `${(128*fs/1e6).toFixed(3)} Mbaud on the XLR`],
      ['128FS (CS8402A MCK)', (128*fs).toLocaleString(), SIM.fmtDur(1/(128*fs)), 'TFF from 256fs'],
      ['256fs (CPLD master)', (256*fs).toLocaleString(), SIM.fmtDur(1/(256*fs)), F.stopped? 'stopped' : F.seg.src],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one PIC pass, one AES block, one frame, one EPROM byte or one SCLK bit at a time.</p>`;
    const st=stepAt(t), r=st.pass.r;
    let cpl = '—';
    if (!F.stopped){ const hs = 1/(256*F.fs); const j = Math.floor((t-F.t0)/hs); const c=(64+(j>>1))&127; cpl = `count ${c} (q6=${c>>6&1}, byte ${[4,5,6,7,0,1,2,3][Math.floor(j/32)]}, bit slot ${(c&15)}) · ${(c&15)===2?'<b>loading the byte</b>':(c&8)?'shifting on SCLK':'SCLK held high, waiting'}`; }
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PIC16F73</th><td class="mono">${st.pass.kind==='loop'?'pass #'+st.pass.i+': '+STEPS[st.step][0]:st.pass.kind}<br><span class="muted">${st.step>=0?STEPS[st.step][1]:''}</span></td></tr>
      <tr><th>74HC4094</th><td class="mono">${bin8(hc)} = ${hcText(hc)}</td></tr>
      <tr><th>CPLD</th><td class="mono">${cpl}</td></tr>
      <tr><th>EPROM</th><td class="mono">${F.stopped?'idle':`table 0x${tableBase(f).toString(16).toUpperCase().padStart(4,'0')}, sample ${F.sa}`}</td></tr>
      <tr><th>CS8402A</th><td class="mono">${F.stopped?'no MCK — line idle':`frame ${F.idx%192}/191 of block · V=${f.v}`}</td></tr>
      <tr><th>Lamps</th><td class="mono">${lvlLamp(r)} · ${rateLamp(r)}${r.dis1&16?' · LOCK':''}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    const {c,w} = SIM.canvas(m.querySelector('#meter'), 66);
    [0,1].forEach(sd=>{ let pk=0; for (let i=0;i<64;i++){ const v=outSample(Math.max(0.01,t)-0.01*i/64, sd); if (v!==null) pk=Math.max(pk,Math.abs(v)); }
      const db = pk>0? 20*Math.log10(pk) : -99, segs=40, lit=Math.max(0,Math.min(segs,Math.round((db+60)/60*segs)));
      for (let s=0;s<segs;s++){ c.fillStyle = s<lit? (s>=segs-3?'#e3453a': s>=segs-10?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); c.fillRect(70+s*(w-80)/segs, 6+sd*30, (w-80)/segs-2, 22); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText((sd?'B ':'A ')+(db>-99?db.toFixed(1):'—'), 6, 21+sd*30); });
    drawLadder(m.querySelector('#zl'), t);
    if (F.stopped){ m.querySelector('#bytes').innerHTML = '<p class="muted">No clock at the playhead.</p>'; return; }
    const fb=frameBytes(t);
    m.querySelector('#bytes').innerHTML = `<table class="kv"><tr><th>Order</th><th>q6 q5 q4</th><th>EPROM address</th><th>byte</th><th>bits out on SDATA (MSB first)</th><th>meaning (table source)</th></tr>${[4,5,6,7,0,1,2,3].map((b,i)=>`<tr><td>${i+1}</td><td class="mono">${b>>2&1} ${b>>1&1} ${b&1}</td><td class="mono">0x${(fb.base|b).toString(16).toUpperCase().padStart(4,'0')}</td><td class="mono">$${fb.bytes[b].toString(16).toUpperCase().padStart(2,'0')}</td><td class="mono">${bin8(fb.bytes[b])}</td><td class="small">${['pad $00','bits 7–0 (LSB byte)','bits 15–8','bits 23–16 (MSB byte)'][b&3]} of “SAMPLE ${b<4?'A':'B'}${F.sa+1}” → AES ${b<4?'B':'A'}</td></tr>`).join('')}</table>`;
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const F = D.power? frameAt(t) : {stopped:true}; const fs = F.stopped? 48000 : F.fs, N = F.stopped? 48 : F.seg.N;
  const levels = [['1 second',1],['100 ms',0.1],['1 tone cycle',N/fs],['1 PIC pass',1/3500],['1 AES frame',1/fs]];
  const H = levels.length*44+10, {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid');
  const f = hcFields(hcAt(t)); const norm = AMP[f.F]? 8388608/AMP[f.F] : 1;
  levels.forEach(([nm,span],i)=>{ const y=8+i*44, t0=Math.max(0, Math.min(1-span, t-span/2));
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')', 6, y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('AES A, scaled to full height', 6, y+28);
    const x0=170, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30);
    c.strokeStyle=acc; c.beginPath(); const n=Math.min(900,pw); let pen=false;
    for (let k=0;k<=n;k++){ const tt=t0+span*k/n; const v=outSample(tt,0); if (v===null){ pen=false; continue; } const yy=y+17-Math.max(-1,Math.min(1,v*norm))*13; pen? c.lineTo(x0+pw*k/n,yy) : c.moveTo(x0+pw*k/n,yy); pen=true; } c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=x0+(Math.max(0,Math.min(1-ns,t-ns/2))-t0)/span*pw; c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,ns/span*pw),30); c.globalAlpha=1; } });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  panel:{x:20,y:20,w:170,h:96,t:'Front panel (sheet 4)',s:['8 lighted push-buttons','8 round lamps','LOW BAT, POWER'],d:'Eight push-buttons with built-in lamps, plus eight round lamps in two rows. All 16 lamps share PORTB as anodes; the two rows of returns go to RC6 (dis0) and RC5 (dis1). The switches share a strobe on RC4. LOW BAT is driven by the power circuit on sheet 2, not by the PIC.'},
  pic:{x:240,y:20,w:180,h:96,t:'PIC16F73 (U3, sheet 2)',s:['abs1v103.asm, no interrupts','scan · mux · debounce','writes 8 select lines'],d:'The only processor. Its clock is the CPLD\'s 6M144 output (OSC1, pin 9). It never touches an audio sample: it only decides which EPROM table plays, at what clock, and whether channel B is muted. See the Software tab.'},
  hc:{x:470,y:20,w:170,h:96,t:'74HC4094 (U1)',s:['Q1 1K · Q2 SR0 · Q3 F1','Q4 SR1 · Q5 B INVERT','Q6 F0 · Q7 VALIDITY · Q8 ext_en'],d:'An 8-bit serial-in, latched-out shift register. sft_out clocks hc4094 out MSB first on RC2/RC1 and strobes RC3. Six outputs are EPROM address lines; SR0/SR1/1K/ext_en also go to the CPLD; VALIDITY goes to the CS8402A V pin.'},
  osc:{x:20,y:170,w:170,h:80,t:'ICS9120-08 (U8)',s:['X1 14.318 MHz','→ 24.576 / 33.8688 MHz'],d:'Audio clock synthesiser on sheet 1. Its CLK1/CLK2 feed CPLD pins 43 (net 25M576 in ABS.FIT, 24M576 in ABS-1.FIT and the GDF) and 25 (33M868). Which -08 output gives which frequency is inferred from the CPLD dividers.'},
  cpld:{x:240,y:170,w:200,h:150,t:'EPM7064S CPLD (U5)',s:['clock mux: ÷2, ÷3, EXTREF','bit/byte counter q0–q6','sample counter sa0–sa6 (mod N)','shift register → SDATA','SCLK, SCLKA, 128FS, 6M144'],d:'abs.rpt (MAX+PLUS II 9.6, 20 Dec 2005|38): 34 of 64 macrocells. It makes the sample clock from the oscillators or the external reference, counts 128 half-bit slots per frame, steps the EPROM address, and turns each EPROM byte into 8 SCLK-timed bits for the CS8402A and the DAC.'},
  eprom:{x:490,y:170,w:150,h:150,t:'27512 EPROM',s:['64 KB, 48 tables of 1 KB','A0–A2 SB0 SB1 Q6','A3–A9 SA0–SA6','A10–A15 from 74HC4094'],d:'Holds every tone the unit can make: 3 rates × 2 tones × 4 levels × 2 B-phases = 48 tables of 8 bytes per sample. The upper 16 KB (SR = 11) is unused. Built from DATA/*.ASM with an unknown FCB assembler and HEXBIN.EXE → DATAALL.BIN (neither tool is archived).'},
  tx:{x:690,y:120,w:170,h:96,t:'CS8402A (U6) → T1',s:['FSYNC=Q6 SCK=SCLK','SDATA, MCK=128FS, V','→ AES OUT XLR + BNC'],d:'Crystal AES3 transmitter. Mode pins strapped on sheet 1; C and U grounded. The transformer T1 drives the XLR; R40–R42 also give an unbalanced BNC tap.'},
  dac:{x:690,y:240,w:170,h:80,t:'CS4330 DAC → op-amps',s:['SDATA, SCLKA, LRCK=Q6','→ LEFT / RIGHT TRS'],d:'The 8-pin Crystal DAC gets the same SDATA with its own gated clock SCLKA. Trimmed op-amp stages on sheet 3 drive the two balanced TRS jacks (+4 dBu at 0 dBFS).'},
  rx:{x:20,y:290,w:170,h:96,t:'REF IN → CS8412 (U4)',s:['MCK → EXTREF (pin 2)','E0 E1 F0 F1 F2 → RA','FCK = 6M144 via Q2'],d:'Crystal AES3 receiver, used only for its clock and its status pins. MCK (256 fs) becomes the CPLD\'s EXTREF. E0/E1 and F0–F2 tell the PIC "locked?" and "which rate?". FCK (6.144 MHz, needed for the frequency report) is gated by Q2 from RA0 (inferred from the wiring).'},
  pwr:{x:240,y:350,w:200,h:60,t:'Power (sheet 2/3)',s:['4×AA NiCd / 9 V adapter','LM7805 · MAX710 · MAX1044'],d:'Battery or adapter; the adapter charges the cells. MAX1044 makes the negative rail for the analog stages.'},
};
const WIRES = [['panel','pic','PORTB, RC4–RC6'],['pic','hc','RC1–RC3'],['hc','eprom','A10–A15'],['hc','cpld','SR0 SR1 1K ext_en'],['pic','cpld','RC7 B-CYCLE'],['cpld','pic','6M144 → OSC1'],['osc','cpld','24.576 / 33.8688'],['cpld','eprom','A0–A9'],['eprom','cpld','D0–D7'],['cpld','tx','SCLK SDATA Q6 128FS'],['cpld','dac','SCLKA SDATA'],['hc','tx','V'],['rx','cpld','EXTREF'],['rx','pic','E/F codes'],['pwr','cpld','']];
function viewBlock(m){
  window.__abs1Active = false; let sel='cpld';
  m.innerHTML = `${card('Block diagram (click a block)', `<div id="bd" style="max-width:1150px"></div>`)}<div class="grid2"><div>${card('Block', `<div id="bdinfo"></div>`)}</div><div>${card('Signal flow in one sentence', `<p>The <b>PIC</b> turns button presses into eight select lines. They pick one of 48 pre-computed tables in the <b>EPROM</b> and the clock for the <b>CPLD</b>. The CPLD walks through that table and serialises every byte to the <b>CS8402A</b> (AES) and the <b>CS4330</b> (analog), forever, without the PIC.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let lb=''; let s=`<svg viewBox="0 0 880 430" style="width:100%"><defs><marker id="abar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      if (WIRES.some(w=>w[0]===b&&w[1]===a)){ const L=Math.hypot(x2-x1,y2-y1)||1, ox=-(y2-y1)/L*7, oy=(x2-x1)/L*7; x1+=ox; y1+=oy; x2+=ox; y2+=oy; }
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#abar)"/>`;
      if (l && hot) lb+=`<text x="${x1+(x2-x1)*0.45+5}" y="${y1+(y2-y1)*0.45-5}" font-size="10.5" fill="var(--accent)" paint-order="stroke" stroke="var(--panel)" stroke-width="3">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s+lb+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from net and pin names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-22}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-7}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · CPLD U5', note:'EPM7064SLC44-7. Pin numbers and names from ABS.FIT / abs.rpt (2005|38); net names from sheet 1 (ISS 3). JTAG pins 7/13/32/38 go to a 10-pin header (TDI 9, TMS 5, TCK 1, TDO 3).', svg:()=>
    chip(330,50,190,'U5 EPM7064SLC44-7',[['1 GCLR','B-CYCLE (RC7)'],['2 OE2','EXTREF (CS8412 MCK)'],['43 GCLK','25M576 (24.576 MHz)'],['25','33M868'],['17','SR0'],['16','SR1'],['14','1K'],['27','EXT-EN (ext_en)'],['12…4,44','D0…D7 (EPROM)'],['7/13/32/38','TDI/TMS/TCK/TDO → JTAG']],
      [['33,41,34,36','SA0 SA1 SA2 SA3'],['37,39,40','SA4 SA5 SA6'],['28 q4','SB0 → A0'],['31 q5','SB1 → A1'],['26 q6','Q6 → A2, FSYNC, LRCK'],['24','SCLK → CS8402A SCK'],['29','SDATA'],['18','SCLKA → DAC'],['21','128FS → CS8402A MCK'],['19','256fs → DAC MCLK (inferred)'],['20','6M144 → PIC OSC1, Q2']],'MAX+PLUS II 9.6 · 34/64 LCs · abs.pof (not archived)') },
  { name:'2 · EPROM 27512', note:'Address map from sheet 1 and the ORG statements in DATA/*.ASM. Each 1 KB table = 128 samples × 8 bytes; the CPLD stops at 48/120/44/112/32/80.', svg:()=>
    chip(330,40,170,'U3 27512 (64 KB)',[['A0','SB0 (q4)'],['A1','SB1 (q5)'],['A2','Q6 (subframe)'],['A3…A9','SA0…SA6'],['A10','B-INVERT (Q5)'],['A11','F0 (Q6)'],['A12','F1 (Q3)'],['A13','1K (Q1)'],['A14','SR0 (Q2)'],['A15','SR1 (Q4)'],['CE OE','GND (always on)']],
      [['D0…D7','CPLD DATA0…7 (straight)']],'sheet 1 says U3; the PIC on sheet 2 is also U3')
    + `<text x="560" y="140" font-size="11" fill="var(--ink2)">0x0000–0x3FFF  48 kHz</text><text x="560" y="158" font-size="11" fill="var(--ink2)">0x4000–0x7FFF  44.1 kHz</text><text x="560" y="176" font-size="11" fill="var(--ink2)">0x8000–0xBFFF  32 kHz</text><text x="560" y="194" font-size="11" fill="var(--bad)">0xC000–0xFFFF  unused (SR = 11)</text>` },
  { name:'3 · PIC and the shift register', note:'PIC16C63A on the ISS 3 schematic (sheet 2), PIC16F73 in firmware v1.03. Port use from the schematic labels and abs1v103.asm.', svg:()=>
    chip(330,50,190,'U3 PIC16C63A / 16F73',[['RB0…RB7','P1-16…P1-8: buttons + lamps'],['RC4','P1-7 switch strobe'],['RC5','P1-3 dis1 return'],['RC6','P1-1 dis0 return'],['RC7','B-CYCLE'],['OSC1','6M144'],['/MCLR','+5']],
      [['RA0','Q2 / FCK gate (out)'],['RA1','E0'],['RA2','F2'],['RA3','E1'],['RA4','F0'],['RA5','F1'],['RC0','SEL'],['RC1','CLK'],['RC2','DATA'],['RC3','STRB']],'TRISA = 0x3E · TRISC = 0 · no interrupts') },
  { name:'4 · 74HC4094 select latch', note:'U1 on sheet 1. sft_out shifts hc4094 bit 7 first, so bit n lands on Q(n+1). Q1–Q6 are EPROM address lines; four of them also go to the CPLD.', svg:()=>
    chip(360,60,160,'U1 74HC4094',[['1 STR','PIC14 (RC3)'],['2 D','PIC13 (RC2)'],['3 CLK','PIC12 (RC1)'],['15 OE','+5']],[['4 Q1','1K → A13, CPLD 14'],['5 Q2','SR0 → A14, CPLD 17'],['6 Q3','F1 → A12'],['7 Q4','SR1 → A15, CPLD 16'],['14 Q5','B INVERT → A10'],['13 Q6','F0 → A11'],['12 Q7','VALIDITY → CS8402A V'],['11 Q8','ext_en → CPLD 27']],'8-bit shift register, latched outputs') },
  { name:'5 · AES output', note:'CS8402A wiring from sheet 1: series resistors R27–R30 on SCLK, SDATA, Q6 and 128FS; C, U grounded; mode pins strapped (M0 high, M1/M2 low as drawn — the serial format they select is inferred).', svg:()=>
    chip(300,50,270,'U6 CS8402A',[['7 FSYNC','Q6 (R29)'],['6 SCK','SCLK (R27)'],['8 SDATA','SDATA (R28)'],['5 MCK','128FS (R30)'],['9 V','VALIDITY'],['10 C / 11 U','GND'],['21–23 M0–M2','strapped']],[['20 TXP','C5 0.1 µ, R2 → T1'],['17 TXN','R26 → T1'],['16 /RST','+5'],['PRO, C1…C9, EM0/1','pull-ups / GND']],'AES3 transmitter')
    + `<text x="300" y="330" font-size="12" fill="var(--ink)">T1 → AES OUT XLR-3 (pins 2/3, 1 = GND)</text><text x="300" y="350" font-size="12" fill="var(--ink)">R40–R42 → bnc+ / bnc− tap</text>` },
  { name:'6 · Reference input and clocks', note:'CS8412 and ICS9120-08 from sheets 1–2. CS8412 mode pins M0/M3 to GND, M1/M2 to +5 as drawn. The ICS9120 output frequencies are inferred from the CPLD dividers.', svg:()=>
    chip(300,50,170,'U4 CS8412',[['9 RXP / 10 RXN','T2 ← REF IN XLR (R25 110 Ω)'],['13 FCK','6M144 via Q2 2N3906'],['16 SEL','RC0']],[['19 MCK','EXTREF → CPLD 2'],['6 E0','RA1'],['5 E1','RA3'],['4 E2','n.c.'],['3 F0','RA4'],['2 F1','RA5'],['27 F2','RA2']],'AES3 receiver')
    + chip(300,300,170,'U8 ICS9120-08',[['1 X1 / 8 X2','14.318 MHz X1, C8/C9 5p6']],[['5 CLK1','→ CPLD 43 (24.576)'],['6 CLK2','→ CPLD 25 (33.8688)']],'audio clock synthesiser') },
];
function viewSchem(m){
  window.__abs1Active = false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from pin and net names — not the original CAD)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The originals are <span class="mono">ABS1 SCH PG 1–4.pdf</span> (ISS 3, 14 Oct 1998|31, OrCAD), with Tango-PCB files in <span class="mono">ISS1/</span> and <span class="mono">ISS2/</span>. These sheets are a readable guide built from the fitter pin report, the schematic net labels and the firmware. Blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 470" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="880" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">ABS-1 · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function viewSoft(m){
  window.__abs1Active = true;
  m.innerHTML = `<div class="grid2">
    ${card('PIC main loop (MAIN) — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('CPLD: clock mux and counters (abs.rpt), live', `<div id="cpld"></div>`)}${card('Sample counter sa0–sa6: mod-N ring, live', `<div id="ring"></div>`)}</div></div>
  <div class="grid2">
    ${card('How the buttons did things — button → asm → hc4094 → CPLD/EPROM', `<div id="btn"></div>`)}
    ${card('EPROM map (27512), live — the table being played is lit', `<div id="map"></div>`)}
  </div>
  ${card('74HC4094 bits at the playhead', `<div id="hcb"></div>`)}`;
  const draw=()=>{
    const t=SIM.t, st=stepAt(t), hc=hcAt(t), f=hcFields(hc), F = D.power? frameAt(t) : {stopped:true};
    let s=`<svg viewBox="0 0 520 ${STEPS.length*36+70}" style="width:100%"><defs><marker id="aba2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="140" y="4" width="240" height="24" rx="12" fill="${st.pass.kind==='init'?'var(--warn)':'var(--chip)'}" stroke="var(--line)"/><text x="260" y="21" text-anchor="middle" font-size="11.5" fill="var(--ink)">RESET → CALL INIT (DELAY2 = 0xFF)</text>`;
    STEPS.forEach((p,j)=>{ const y=40+j*36, on=st.step===j, cy=st.pass.steps? st.pass.steps[j] : 0;
      s+=`<line x1="260" y1="${y-8}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#aba2)"/><rect x="30" y="${y}" width="460" height="28" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="40" y="${y+12}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}${cy?`  · ${cy} cyc`:''}</text><text x="40" y="${y+24}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[1]}</text>`; });
    const yb=40+STEPS.length*36; s+=`<path d="M490 ${yb-22} h18 V54 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#aba2)"/><text x="30" y="${yb+16}" font-size="11" fill="var(--ink2)">Pass ${st.pass.kind==='loop'?'#'+st.pass.i+' · '+Math.round(st.pass.dur*FCY)+' cycles = '+SIM.fmtDur(st.pass.dur):st.pass.kind} · events: ${st.pass.ev&&st.pass.ev.length?st.pass.ev.length:0}</text></svg>`;
    m.querySelector('#flow').innerHTML = s;
    // CPLD diagram
    const ck = clockOf(hc,t), srcIdx = f.ext? 3 : f.SR;
    const node=(x,y,w,txt,on,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="34" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+w/2}" y="${y+14}" text-anchor="middle" font-size="11" fill="${on?'#fff':'var(--ink)'}">${txt}</text><text x="${x+w/2}" y="${y+28}" text-anchor="middle" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${sub||''}</text>`;
    let c = `<svg viewBox="0 0 520 260" style="width:100%">`
      + node(6,6,120,'25M576 ÷ 2 (:56)',srcIdx===0&&ck.fs,'SR 00 → 12.288 MHz') + node(6,46,120,'33M868 ÷ 3 (a1 a0)',srcIdx===1&&ck.fs,'SR 01 → 11.29 MHz') + node(6,86,120,'25M576 ÷ 3 (a1 a0)',srcIdx===2&&ck.fs,'SR 10 → 8.192 MHz') + node(6,126,120,'EXTREF',srcIdx===3&&ck.fs,'ext_en, SR ≠ 11')
      + `<line x1="126" y1="80" x2="160" y2="80" stroke="var(--ink2)"/>` + node(160,62,90,'256fs',!!ck.fs, ck.fs? (ck.fs*256/1e6).toFixed(3)+' MHz':'held high')
      + `<line x1="250" y1="80" x2="270" y2="80" stroke="var(--ink2)"/>` + node(270,62,90,'128FS TFF',!!ck.fs,'→ CS8402A MCK')
      + `<line x1="360" y1="80" x2="380" y2="80" stroke="var(--ink2)"/>` + node(380,62,130,'q0–q6 counter',!!ck.fs,'128 counts / frame')
      + node(380,130,130,'sa0–sa6 (clk q6)',!!ck.fs, F.stopped?'held':`sa = ${F.sa} / ${F.seg.N}`) + `<line x1="445" y1="96" x2="445" y2="130" stroke="var(--ink2)"/>`
      + node(200,130,150,'LPM_SHIFTREG ×8',!!ck.fs,'load @ count 2, shift on SCLK') + `<line x1="350" y1="147" x2="380" y2="147" stroke="var(--ink2)"/>`
      + node(200,190,150,'SDATA → CS8402A / DAC',!!ck.fs && !(rc7At(t)), rc7At(t)?'B half cleared (BCYCLE & !q6)':'MSB first')
      + node(380,190,130,'SCLKA gate :81 :85 :108',!!ck.fs,'19 clocks per channel')
      + `<text x="6" y="250" font-size="10.5" fill="var(--ink2)">256fs = ${ck.src}</text></svg>`;
    m.querySelector('#cpld').innerHTML = c;
    // mod-N ring
    const N = F.stopped? tableN(f.SR===3?0:f.SR,f.k1)||48 : F.seg.N, cur = F.stopped? -1 : F.sa;
    let rg = `<svg viewBox="0 0 520 210" style="width:100%">`; const cx=110, cy=104, R=88;
    for (let k=0;k<N;k++){ const a=-Math.PI/2+2*Math.PI*k/N; rg += `<circle cx="${(cx+R*Math.cos(a)).toFixed(1)}" cy="${(cy+R*Math.sin(a)).toFixed(1)}" r="${k===cur?6:2.6}" fill="${k===cur?'var(--play)':k===0?'var(--accent2)':'var(--ink2)'}"/>`; }
    const w = F.stopped? null : eprWord(f, cur, 1);
    rg += `<text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--ink)">${cur<0?'—':cur}</text><text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="11" fill="var(--ink2)">of ${N}</text>
      <text x="230" y="30" font-size="11.5" fill="var(--ink)">Clear term :49 (_LC058) fires at:</text>
      ${[['48 kHz','1K: sa4·sa5 → 48','400: sa3·sa4·sa5·sa6 → 120'],['44.1 kHz','1K: sa2·sa3·sa5 → 44','400: sa4·sa5·sa6 → 112'],['32 kHz','1K: sa5 → 32','400: sa4·sa6 → 80']].map((r,i)=>`<text x="230" y="${54+i*40}" font-size="11" font-weight="${(!F.stopped&&f.SR===i)?700:400}" fill="${(!F.stopped&&f.SR===i)?'var(--accent)':'var(--ink2)'}">${r[0]}: ${r[1]}</text><text x="300" y="${70+i*40}" font-size="11" fill="${(!F.stopped&&f.SR===i)?'var(--accent)':'var(--ink2)'}">${r[2]}</text>`).join('')}
      <text x="230" y="186" font-size="10.5" fill="var(--ink2)">A sample word at the playhead: ${w===null?'—':'0x'+((w<0?w+(1<<24):w).toString(16).toUpperCase().padStart(6,'0'))}</text></svg>`;
    m.querySelector('#ring').innerHTML = rg;
    // buttons table
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Button</th><th>asm path</th><th>on the wire</th></tr>
      <tr><td>AUDIO LEVEL</td><td class="mono small">PROCESS → lvl / lvl0 / lvl20 / lvl12 → chng_lvl</td><td class="small">F1 F0 = 11 now (OFF tables); new F after 7 × 255 passes → A11/A12</td></tr>
      <tr><td>SAMPLE RATE</td><td class="mono small">srate → sr48 / sr44 / sr32 / srext → chng_freq → chng_lvl</td><td class="small">SR = 11 (256fs stops), F = 11; SR after 255 passes → CPLD clock and A14/A15; level after 7 × 255 more</td></tr>
      <tr><td>1KHz / 400Hz</td><td class="mono small">freq1000 / freq400 → REFRESH</td><td class="small">Q1 1K → A13 and the CPLD counter length; no delay</td></tr>
      <tr><td>CYCLE</td><td class="mono small">cycle / on_cyc → REFRESH set_cyc / cyc_con</td><td class="small">RC7 toggles every 7 × 255 passes → CPLD clears the B half</td></tr>
      <tr><td>INVERT</td><td class="mono small">invert / inv0 → REFRESH con_ref</td><td class="small">Q5 → A10: time-reversed “out of phase” tables</td></tr>
      <tr><td>OFF (CHB)</td><td class="mono small">b_off / off_b → REFRESH turn_of</td><td class="small">RC7 held at 1; CYCLE and INVERT cleared</td></tr>
      <tr><td>INVALID</td><td class="mono small">invalid / val0 → REFRESH</td><td class="small">Q7 → CS8402A V pin</td></tr>
      <tr><td>(EXT)</td><td class="mono small">ext_lock · lock · ext_freq · ext48/44/32 · out_range · unlock</td><td class="small">Q8 ext_en → CPLD uses EXTREF; SR picks the table set</td></tr></table>
      <p class="small">Only one button acts per press, in PROCESS order: LVL, SRATE, CYCLE, 1k, INVERT, 400, B OFF, INVALID. Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    // EPROM map: 64 × 1 KB blocks, A15..A10
    let mp = `<svg viewBox="0 0 520 300" style="width:100%">`; const cur10 = (!F.stopped)? (tableBase(f)>>10) : -1;
    const defect = new Set(D.tables==='combined'? [40,41,42,43,28,29,34,17] : []);
    for (let blk=0; blk<64; blk++){ const col=blk%8, row=blk>>3, x=40+col*58, y=24+row*32;
      const ff = { sr0:(blk>>4)&1, sr1:(blk>>5)&1, k1:(blk>>3)&1, f1:(blk>>2)&1, f0:(blk>>1)&1, inv:blk&1 }; const SR=(ff.sr1<<1)|ff.sr0, Fl=(ff.f1<<1)|ff.f0;
      const used = SR!==3, on = blk===cur10;
      mp += `<rect x="${x}" y="${y}" width="54" height="28" rx="3" fill="${on?'var(--play)': !used?'var(--chip)': defect.has(blk)?'var(--bad)':'var(--panel2)'}" fill-opacity="${!on&&used&&defect.has(blk)?0.35:1}" stroke="var(--line)"><title>0x${(blk<<10).toString(16).toUpperCase().padStart(4,'0')} ${used?`${RATE_NAMES[SR]} ${ff.k1?'1k':'400'} ${LVL_NAMES[Fl]} ${ff.inv?'B out':'B in'}`:'unused'}</title></rect>
        <text x="${x+27}" y="${y+12}" text-anchor="middle" font-size="9" fill="${on?'#fff':'var(--ink)'}">${used? ['48','44.1','32'][SR]+' '+(ff.k1?'1k':'400') : '—'}</text><text x="${x+27}" y="${y+23}" text-anchor="middle" font-size="9" fill="${on?'#fff':'var(--ink2)'}">${used? ['0','−12','−20','off'][Fl]+(ff.inv?' inv':'') : 'FF'}</text>`; }
    mp += `<text x="40" y="16" font-size="10.5" fill="var(--ink2)">each box = 1 KB = 128 samples × 8 bytes · rows: A15 A14 A13 · columns: A12 A11 A10</text>`;
    for (let row=0;row<8;row++) mp += `<text x="34" y="${42+row*32}" text-anchor="end" font-size="9" fill="var(--ink2)">${(row<<13).toString(16).toUpperCase().padStart(4,'0')}</text>`;
    m.querySelector('#map').innerHTML = mp + '</svg>' + `<p class="small muted">${D.tables==='combined'?'Red: tables that are wrong in ABSDATA.ASM (7 Jan 1998|31) and fixed in the split files. ':''}Grey: 0xC000–0xFFFF, never addressed while a clock runs. Which source file was actually burned is unknown — DATAALL.BIN is not archived.</p>`;
    // hc bits
    m.querySelector('#hcb').innerHTML = `<table class="kv"><tr>${HC.map((n,i)=>`<th>Q${i+1} ${n}</th>`).join('')}</tr><tr>${HC.map((n,i)=>`<td class="mono" style="${(hc>>i)&1?'color:var(--accent);font-weight:700':''}">${(hc>>i)&1}</td>`).join('')}</tr>
      <tr>${['A13 + CPLD 14','A14 + CPLD 17','A12','A15 + CPLD 16','A10','A11','CS8402A V','CPLD 27'].map(x=>`<td class="small muted">${x}</td>`).join('')}</tr></table>
      <p class="small muted">hc4094 bit n → 74HC4094 Q(n+1): sft_out shifts bit 7 first, so it ends in Q8.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__abs1Active = false;
  const li = (h, b)=>`<li><b>${h}</b> ${b}</li>`;
  m.innerHTML = card('What the ABS-1 is up to — findings from the source', `<ol>
    ${li('The PIC never makes a sample.', 'All audio is pre-computed in the 27512. The firmware only drives eight select lines through the 74HC4094 (<span class="mono">hc4094</span>), plus RC7 for B-CYCLE. The CPLD walks the table on its own. Compare the POD33, which computes every sample live in a SHARC with ToneGen, at 1 dB steps, on four outputs. The ABS-1 has 48 fixed tables and no arithmetic at all.')}
    ${li('“Mute” on a rate change is a stopped clock.', '<span class="mono">srate</span> writes SR1 SR0 = 11 at once. Sheet 1 marks that code “spare”. In <span class="mono">|abs-1:100|</span> no 256fs term covers SR = 11 without ext_en, so 256fs is held high, the CS8402A loses MCK and the AES output stops for 255 passes (≈ 74 ms). Downstream receivers lose lock. The level returns 7 × 255 passes later (≈ 0.59 s after the press). The same happens at power-on (INIT) and while EXT is unlocked. The manual only mentions muting for the LEVEL button.')}
    ${li('44.1 kHz tones are off frequency.', 'The clear term <span class="mono">:49</span> wraps the sample counter at 44 (1 kHz) and 112 (400 Hz) samples, matching DATA44*.ASM. At 44 100 Hz that gives <b>1002.27 Hz</b> and <b>393.75 Hz (−1.6 %)</b>. The manual says the tones “will be accurate at the standard sampling rates of 48, 44.1 and 32kHz”. Only 48 and 32 kHz divide exactly.')}
    ${li('“B OUT OF PHASE” is the table played backwards.', 'In every out-of-phase table, B[n] = A[N−1−n]. For A[n] = sin(2π(n+1)/N) that is −A delayed by one sample, so B sits at 180° + 360°·f/fs: 187.5° for 1 kHz at 48 kHz, 183° for 400 Hz at 48 kHz, 191.25° for 1 kHz at 32 kHz. Not a clean inversion.')}
    ${li('“−12 dBFS” is −12.04 dBFS.', 'The −12 tables peak at 2 097 152 = ¼ of full scale. −20 is 838 861 (exact) and 0 dBFS is 8 388 607. All tables fit round(amp·sin(2π(n+1)/N)) to ±1 LSB, so the simulator rebuilds them from that formula.')}
    ${li('The combined source has broken tables; the split files fix them.', '<span class="mono">ABSDATA.ASM</span> and <span class="mono">DATA32/44/48.ASM</span> (7 Jan 1998|31) have eight bad tables. 0x7000/0x7400 (44.1 kHz 1 kHz “−20 dBFS”) contain a −0.4 FS sample, so they peak at −7.96 dBFS. 0xA000–0xAC00 (32 kHz 1 kHz 0 and −12) repeat sample 9 as sample 10. 0x8800 (32 kHz 400 Hz −12) and 0x4400 (44.1 kHz 400 Hz 0 dBFS inverted) are one sample short. <span class="mono">DATA3201…DATA4804.ASM</span> (8–21 Jan 1998|31) are all correct. Which set was burned can\'t be told: <span class="mono">DATAALL.BIN</span> is missing. Switch “Tables” on the Simulator tab to hear the difference.')}
    ${li('Missing tools.', '<span class="mono">CHKLIST.MS</span> names <span class="mono">HEXBIN.EXE</span> and <span class="mono">DATAALL.BIN</span>. The table sources use Motorola <span class="mono">FCB $xx</span>, which MPASM does not accept, although <span class="mono">ABSDATA.PJT</span> is an MPLAB project. So a 68xx-style assembler (not archived) made the HEX, and HEXBIN made the EPROM image ' + inf + '. Several OFF tables are one sample short (119 of 120, 111 of 112); the counter still reads that slot, which holds whatever HEXBIN filled (0xFF → −1 LSB ' + inf + ').')}
    ${li('Bit order: an open question.', 'The fitted <span class="mono">LPM_SHIFTREG:111</span> loads DATA7 into the output stage, so each byte leaves <b>MSB first</b>. The bytes go out in address order: pad, LSB byte, middle, MSB byte. That is neither a clean MSB-first nor a clean LSB-first 24-bit word. Sheet 1 wires EPROM D0–D7 straight to CPLD DATA0–7, so either the PCB differs from the drawing, HEXBIN bit-reversed the bytes, or the CS8402A mode (M0 high, M1/M2 low) does something not captured here. The scope shows both the standard AES3 layout and the raw pins.')}
    ${li('A and B are swapped against the table comments.', 'The sample counter steps on the rising edge of q6, so a frame starts with q6 = 1, reading bytes 4–7 (“SAMPLE B” in the sources). The B-CYCLE clear (<span class="mono">BCYCLE & !q6</span>) blanks the q6 = 0 half, bytes 0–3 (“SAMPLE A”). Since the firmware uses B-CYCLE to mute channel B, the bytes labelled A must be AES channel B ' + inf + ' (it depends on the CS8402A FSYNC polarity).')}
    ${li('REFRESH comments are the wrong way round.', '<span class="mono">bcf PORTC,7 ; Turn B OFF</span> and <span class="mono">set_cyc bsf PORTC,7 ; Turn B ON</span>. But <span class="mono">turn_of</span> (the B OFF button) sets RC7 = 1, and the CPLD clears B while B-CYCLE is high. So RC7 = 1 mutes B.')}
    ${li('Dead code and leftovers.', '<span class="mono">boff_reg</span> is written by <span class="mono">invert</span> and never read. <span class="mono">BINIT EQU 0X4F</span> is unused. The interrupt vector is a bare <span class="mono">RETFIE</span>. dis0 bit 4 (the AUDIO LEVEL button\'s own lamp) is never set ' + inf + '. The INIT comment says “1kHz, 48 kHz” but <span class="mono">movlw 0x82</span> lights 44.1K + 1KHz until <span class="mono">sr48</span> runs. Every version still starts <span class="mono">; ABB-1 AUDIO BIT BUDDY</span>.')}
    ${li('Debounce history.', 'v1.00: 32 passes to press, 32 to release. v1.01: 128 / 128 (<span class="mono">btfss dbcount,7</span>). v1.02 header: “release debounce time is increased from 32 to 192”. That is relative to v1.00; press went back to 32 and release became bits 6 and 7 = 192 passes ≈ 55 ms.')}
    ${li('Lamps are dimmed by software.', 'MUX clears PORTB bits 3, 5, 6, 7 (the eight round lamps) except in one dis0 and one dis1 pass out of every 34 (<span class="mono">lght_cnt</span> = 16). Button lamps get 1 pass in 2. The round LEDs are therefore driven ≈ 17× less, probably because they are brighter parts or to save the batteries ' + inf + '.')}
    ${li('The PIC runs on the CPLD.', 'OSC1 is net 6M144 (CPLD pin 20, 24.576 MHz ÷ 4). An erased or failed CPLD means the PIC doesn\'t run either. <span class="mono">ABS1V100.PJT</span> says 4 MHz with WDT off, while the code relies on <span class="mono">CLRWDT</span>. There is no <span class="mono">__CONFIG</span> in any version.')}
    ${li('External lock logic.', '<span class="mono">ext_lock</span> treats “E0 or E1 low” as locked. Only E0/E1 are wired (E2 is n.c.), so CS8412 code 011 (slipped sample) counts as unlock and mutes, like 111 ' + inf + '. <span class="mono">out_range</span> (F = 000, e.g. 38 kHz) plays the 44.1 kHz tables with no rate lamp lit. While unlocked, v1.01+ switches the receiver\'s FCK off for 64 passes after every 32 (RA0, <span class="mono">unlock</span>).')}
    ${li('Names that drifted.', 'The 24.576 MHz input is <span class="mono">24M576</span> in ABS-1.FIT (1997|30) and the GDF, but <span class="mono">25M576</span> in ABS.FIT (2005|38). The ISS 3 schematic uses U3 for both the 27512 (sheet 1) and the PIC (sheet 2). The 1997|30 EPM7032 fit (<span class="mono">ABS-1.RPT</span>) only generated clocks; the counters and serialiser of <span class="mono">|abs-2:2|</span> appear in the EPM7064S design.')}
    ${li('There is a JTAG header.', 'Sheet 1 wires CPLD pins 7/13/32/38 to a 10-pin header in ByteBlaster order (TCK 1, TDO 3, TMS 5, TDI 9). The Engineering README says no JTAG header was identified.')}
    ${li('The DAC sees a different clock.', 'SCLKA = !(SCLK · :108). The toggle pair :81/:85 closes the gate after 3 clocks in byte 1, and byte 3 re-opens it, so the CS4330 gets 19 clocks per channel: MSB byte, pad byte, 3 bits ' + inf + ' as to why. The analog level tracks the digital one because both share SDATA.')}
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Instruction cycles per routine are hand-counted from <span class="mono">abs1v103.asm</span> (±2 each); a typical pass is ≈ 439 cycles = 286 µs.</li>
    <li>A press holds the button for ${HOLD*1000} ms ${inf}. The CS8412 locks instantly when a 30–50 kHz reference is plugged in, and its F-code follows the datasheet table ${inf}.</li>
    <li>AES channel A = EPROM bytes 4–7 ${inf}. Channel-status bits are shown as 0 ${inf}. Unprogrammed EPROM bytes read 0xFF ${inf}.</li>
    <li>Panel colours and lamp colours ${inf}: the archive has no product photos. The panel line art is the manual's drawing (same as the ABS1SS.CDR silkscreen), and positions match the CDR drill crosshairs.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>ABS1 - #Master/ABS-1 - Bit Spitter - #Engineering/V100/abs1v103.asm, ABS1V100–102.ASM, *.ERR, ABS1V100.PJT</li>
    <li>…/abs.rpt, ABS.FIT, ABS.GDF, ABS-2.GDF, ABS-1.FIT, ABS-1.RPT, ABS.ACF</li>
    <li>…/DATA/ABSDATA.ASM, DATA32/44/48.ASM, DATA3201–DATA4804.ASM, CHKLIST.MS</li>
    <li>…/ABS1 SCH PG 1–4.pdf · ABS-1 Manual PDF.pdf · ABS-1MAN.pdf · ABS1SS.CDR</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'abs1', name:`ABS-1 · Audio Bit Spitter (${SIM.year(1998)})`, duration:1,
  product:'ABS-1 Audio Bit Spitter', year:1998, family:'ABS / ABB portable test sets',
  folder:'ABS1 - #Master',
  summary:'Battery-powered AES/EBU and analog tone generator. A PIC16F73 scans eight lighted buttons and sets eight select lines. An EPM7064 CPLD clocks pre-computed 24-bit sine tables out of a 27512 EPROM into a CS8402A transmitter and a CS4330 DAC. It can lock to an external AES reference through a CS8412.',
  highlights:['Firmware executed pass by pass from RESET','CPLD equations from abs.rpt drive the EPROM address and SCLK/SDATA','Live EPROM map of all 48 tone tables','12-step operator tutorial from the manual','Rate change stops the clock; 44.1 kHz tones off by 1.6 %'],
  depth:'Full model',
  stepUnits:[
    {label:'1 PIC loop pass (≈286 µs)', period:()=>1/3500},
    {label:'1 AES frame (1 sample)', period:()=>1/(frameAt(SIM.t).fs||48000)},
    {label:'1 EPROM byte (1/8 frame)', period:()=>1/(8*(frameAt(SIM.t).fs||48000))},
    {label:'1 SCLK bit (1/64 frame)', period:()=>1/(64*(frameAt(SIM.t).fs||48000))},
    {label:'1 AES block (192 frames)', period:()=>192/(frameAt(SIM.t).fs||48000)},
    {label:'1 tone cycle', period:()=>{ const F=frameAt(SIM.t); return F.stopped? 0.001 : F.seg.N/F.fs; }},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms (level delay)'],[0.1,'100 ms (rate gap)'],[0.02,'20 ms (debounce)'],[0.0025,'2.5 ms (400 Hz cycle)'],[0.001,'1 ms (1 kHz cycle)'],[0.0006,'600 µs (2 PIC passes)'],[1/48000*3,'3 frames (62.5 µs)'],[1/48000,'1 frame (20.8 µs)'],[1/48000/8*2,'2 EPROM bytes (5.2 µs)']],
  defaultZoom:0,
  init(){ EMU_KEY=''; if (!D._demo){ D._demo = true;
    // opening state: power-on, then AUDIO LEVEL pressed once (→ −20 dBFS), settled — so the first view has a tone
    D.start=null; D.presses=[{t:0.2, key:'lvl', hold:HOLD}]; EMU_KEY=''; emulate(); commit();
    D.log=[{ name:'Opening state', t:0, lines:[{t:0, txt:'Power-on defaults (OFF, 48 kHz, 1 kHz), then AUDIO LEVEL pressed once and settled: −20 dBFS, 1 kHz, 48 kHz. “Replay power-on” shows the real start-up.'}] }]; } },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the ABS-1', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
