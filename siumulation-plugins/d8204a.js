/* =====================================================================
   D8204A — 75 Ω AES/EBU reclocking DA + D/A converter (Ward-Beck Systems, 2005|38)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder "#MF8200 #SERIES/D8204A - #Master #MF82" unless noted):
   - D8204A - #Engineering/D8204A - #Software/v100/v100.asm   "D8204A AES\EBU DA V1.00 June 13, 2005"
       INIT, MAIN, READ_SWITCHES, PROCESS_SWITCHES, reference_level_table, analog_type_table,
       REFRESHSTATUS, refresh4392/shiftout4392, refresh8420_1/_2, shiftout, read8420s, shiftin
   - …/v100/V100.$$$ (MPLAB backup: one register value differs), d8204a.pjt, v100.mcp, v100.mcw
   - D8204A - #Engineering/D8204A - #PCB/OBSOLETE/ISSUE1/d8204A-ISS1.net, .pnp, .ECO
       (PIC16F874 U25, CS8427 U3, CS4392 U4, DIP SW2, X2 4.9152 MHz — the board the v100 code drives)
   - …/OBSOLETE/ISSUE2/d8204A-iss2.ECO (CS4392 and the PIC's DAC lines deleted, June 2005)
   - …/D8204A - #PCB/d8204A-ISS3.net, d8204A-iss3.bom, d8204A-iss3V1.bom, d8204A-iss3.pnp
       (shipping board: PIC16C54 U10, CS8427 U3, CS4390 U7, EL5263 U1/U2, NE5532 ×6, H1, SW1, RV1/RV2)
   - D8204A-ISS3-ASSY - #Assembly.pdf  → assets/d8204a-assy-white.png (component-side drawing)
   - ../8200 Series Rear Module options…/D8204A - rear module options.cdr (2012) → assets/d8204a-rear-bnc2/bnc4.svg (Artwork 2026|59, vectors via its Corel PDF export)
   - ../D8204 - #Master #MF82/D8204 - #Engineering/D8204AMN Issue3.doc (2006 manual, ISS3 board)
   - ../D8204 - #Master #MF82/D8204 - #Engineering/D8204AMN_UPDATE.wpd (June 14 2005 manual, DIP switch tables)
   - ../D8204 - #Master #MF82/D8204 - #Engineering/D8204AT2.CDR (rear-module text: CONFIDENCE / NO-LOCK)
   - ../D8204B - #Master #MF82/D8204B - #Software/…/v200.asm (the code v100 was copied from)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const ASSET = 'siumulation-plugins/assets/';
const hex2 = v=>v.toString(16).toUpperCase().padStart(2,'0');
const bin8 = v=>(v>>>0).toString(2).padStart(8,'0');
const db = x=>20*Math.log10(Math.max(1e-9,x));
const fmtDb = (v,u)=> v===null||!isFinite(v)? '—' : (v>=0?'+':'')+v.toFixed(1)+(u?' '+u:'');

/* ---------------- firmware constants, copied from v100.asm ---------------- */
const FW = {
  r8420: {1:0x00, 2:0x00, 3:0x95, 4:0x49, 5:0x00, 6:0x82, 9:0x00, 17:0x10},   // cs8420regNdef
  reg3off: 0xD5,                                                              // cs8420reg3off
  r4392: {1:0x80, 5:0x20, 6:0x10}, reg5start: 0x30,                           // cs4392reg1def/5def/6def, cs4392reg5start
  pconstant: 5,
};
const REG2 = [ // analog_type_table, index = (dip_switch & 0x78) >> 3
  ['left_right',0x69],['right_right',0x65],['mono_right',0x6D],['mute_right',0x61],
  ['left_left',0x6A],['right_left',0x66],['mono_left',0x6E],['mute_left',0x72],
  ['left_mono',0x6B],['right_mono',0x67],['mono_mono',0x6F],['mute_mono',0x63],
  ['left_mute',0x68],['right_mute',0x64],['mono_mute',0x6C],['mute_mute',0x60] ];
const REFS = [ // reference_level_table, index = dip_switch & 0x07
  ['reference_20dbfs',0x00,-20],['reference_18dbfs',0x02,-18],['reference_16dbfs',0x04,-16],['reference_14dbfs',0x06,-14],
  ['reference_12dbfs',0x08,-12],['reference_10dbfs',0x0A,-10],['reference_mute',0x7F,null],['reference_mute',0x7F,null] ];
/* Program addresses: worked out by counting the instruction words in v100.asm (macros expanded; ORG 0 / ORG 4H) */
const ADDR = {RESET:0x000, ISR:0x004, INIT:0x005, powerupdelay:0x027, MAIN:0x05C, pdelay:0x067, READ_SWITCHES:0x06C, PROCESS_SWITCHES:0x07E,
  reference_level_table:0x089, analog_type_table:0x0B5, left_right:0x0C7, REFRESHSTATUS:0x0F7, refresh4392:0x109, shiftout4392:0x124,
  refresh8420_1:0x14D, refresh8420_2:0x178, shiftout:0x1A3, read8420s:0x1CC, shiftin:0x1E8, END:0x208};
const REFADDR = [0x092,0x097,0x09C,0x0A1,0x0A6,0x0AB,0x0B0,0x0B0];

/* ---------------- timing (instruction cycles counted from v100.asm) ---------------- */
const XTAL = 4.9152e6;               // X2 "4.9152" on d8204A-ISS1.net (U25 OSC0/OSC1)
const XTAL_PJT = 4e6;                // d8204a.pjt [Fuses] Frequency=4000000 (MPLAB simulator setting)
const TCY = 4/XTAL;                  // 813.8 ns per instruction
const STEPS = [ // [label, cycles, what it does, colour key]
  ['clrwdt', 1, 'Kick the watchdog (only CLRWDT in the program)', 'a'],
  ['READ_SWITCHES', 21, 'Read the 8 DIP switches on RA0–RA5, RE0, RE1 into dip_switch (switch ON = pin low = bit set)', 'a'],
  ['PROCESS_SWITCHES', 35, 'Two computed GOTO tables: reference level → cs4392reg3/4, routing → cs4392reg2', 'a'],
  ['REFRESH8420_1', 863, 'SPI write, CS on RC2: MAP 1 + auto-increment, regs 1–6, 9, 17 (20 bytes) to the CS8427', 'b'],
  ['REFRESH8420_2', 863, 'Same 20 bytes to a second receiver on RC4 — there is no second receiver on this board', 'p'],
  ['READ8420s', 271, 'Both chip-selects low: MAP = 16; then read reg 16 (receiver errors) of each chip; bit 4 = UNLOCK', 'b'],
  ['REFRESHSTATUS', 21, 'lock_8420 bit 0 → green LED RD7, red LED RB0, NO-LOCK open collector RC6, TXOFF value for reg 3', 'a'],
  ['REFRESH4392', 374, 'SPI write, CS on RD0: MAP 1 + auto-increment, CS4392 regs 1–6 (8 bytes)', 'c'],
  ['pdelay', 3852, 'movlw pconstant (5) · clrf temp0 · 5 × 256 decfsz loops ≈ 3.1 ms of nothing', 'd'],
  ['goto main', 2, '', 'a'],
];
const OFF = {}; (()=>{ let a=0; STEPS.forEach(s=>{ OFF[s[0]]=a; a+=s[1]; }); OFF.total=a; })();
const PASS_CYC = OFF.total;          // 6303
const PASS = PASS_CYC*TCY;           // 5.129 ms
const INIT_CYC = 87 + 768 + 2*374 + 2*863;   // INIT words + powerupdelay + 2×REFRESH4392 + refresh8420_1/_2 (approx.)
const LOCK_T = 0.010;                // CS8427 PLL re-acquire after the signal returns — INFERRED (FILT: 4K7 + .068 µF + 6800 pF)
const DROP = 0.002;                  // length of an injected input dropout (2 ms)

/* ---------------- device state ---------------- */
const D = {
  issue: 'ISS1',                 // 'ISS1' = the board v100.asm drives; 'ISS3' = the shipping board (PIC16C54, code not archived)
  power: true,
  src: { on:true, fs:48000, lvlL:-20, lvlR:-20, fL:1000, fR:400 },
  cable: 300,                    // feet of 75 Ω coax
  eq: false,                     // SW1 (PH2AU push-on/push-off)
  dip: [0,0,0,0,0,0,0,0],        // SW2 positions #1..#8, 1 = ON (closed to ground)
  trimA: 0.5, trimB: 0.5,        // RV1 CHA, RV2 CHB (0 … 1 of rotation)
  h1: 'analog',                  // H1: 'analog' = pins 1-2 (B2+ analog) · 'alarm' = pins 2-3 (pin M = open collector)
  rear: 'BNC2',
  drops: [],                     // sim times of injected 2 ms dropouts
  log: [],
};
const DEFAULTS = JSON.stringify({issue:D.issue, src:D.src, cable:D.cable, eq:D.eq, dip:D.dip, trimA:D.trimA, trimB:D.trimB, h1:D.h1, rear:D.rear});

/* ---------------- cable + equaliser (input stage, U1 EL5263) ---------------- */
/* U1A: non-inverting ×(1+R4/R1) = ×2. U1B: inverting, R3 = 750R feedback; input from U1A via R30 110R into node NET00067,
   which feeds R5 750R; SW1 adds R13 330R + C9 1000p and R19 110R + C15 220p to the summing node (values from d8204A-iss3.bom). */
function eqGain(f, eq){
  const w=2*Math.PI*f, R30=110, R5=750, R3=750;
  let yr=1/R5, yi=0;
  if (eq) for (const [R,C] of [[330,1e-9],[110,220e-12]]){ const a=w*C, b=w*R*C, d=1+b*b; yr+=a*b/d; yi+=a/d; }
  const m=yr*yr+yi*yi; return R3/Math.hypot(R30+yr/m, -yi/m);
}
const CABLE_A = 0.30;   // dB per 100 ft at 1 MHz, √f law — INFERRED (typical 75 Ω video coax)
function cableLoss(f, ft){ return CABLE_A*Math.sqrt(f/1e6)*ft/100; }
function link(){
  const fs=D.src.fs, f1=64*fs, f0=32*fs;
  const A1=Math.pow(10,-cableLoss(f1,D.cable)/20)*eqGain(f1,D.eq), A0=Math.pow(10,-cableLoss(f0,D.cable)/20)*eqGain(f0,D.eq);
  const amp = 1.0*2*A1;            // 1 V p-p source × U1A gain 2 × U1B (T1 PE-65612 taken as 1:1 — inferred)
  const r = A1/A0;                 // high-tone / low-tone ratio → crude eye opening
  const ok = amp>=0.15 && r>=0.33, conf = amp<0.5 || r<0.55;
  return { amp, r, ok, conf, lossHi:cableLoss(f1,D.cable), boost: db(eqGain(f1,D.eq)/eqGain(f1,false)) };
}

/* ---------------- what the CS8427 sees ---------------- */
function present(t){ return D.power && D.src.on && !D.drops.some(d=>t>=d && t<d+DROP); }
function unlockedBetween(a,b){ // any unlock (or PLL re-acquire) inside (a,b]
  if (!D.power || !D.src.on || !link().ok) return true;
  return D.drops.some(d=> d < b && d+DROP+LOCK_T > a);
}
function pll(t){ return present(t) && link().ok && !D.drops.some(d=> t>=d && t<d+DROP+LOCK_T); }

/* ---------------- what the PIC firmware sees (ISS1, v100.asm) ---------------- */
const READ_OFF = OFF.READ8420s + 2+97 + 1+46 + 35;           // cycle at which aes1's reg 16 has been shifted in
const STATUS_OFF = OFF.REFRESHSTATUS + 10;                     // LED port writes inside REFRESHSTATUS
const TX_OFF = OFF.REFRESH8420_1 + 3 + 2*46 + 3*46;           // reg 3 (Data Flow Control) is the 5th byte of the burst
const readAt = p=> (p*PASS_CYC + READ_OFF)*TCY;
function fwLock(p){ return !unlockedBetween(readAt(p-1), readAt(p)); }    // reg 16 errors are latched until read
function passOf(t, off){ return Math.floor((t/TCY - off)/PASS_CYC); }
function leds(t){
  const L = link();
  if (!D.power) return {sig:0, conf:0, err:0, eq:0, alarm:0};
  if (D.issue==='ISS1'){
    const lk = fwLock(passOf(t, STATUS_OFF));
    return { sig: lk?1:0, conf: 0, err: lk?0:1, eq: D.eq?1:0, alarm: lk?0:1 };
  }
  // ISS3: PIC16C54 code is not in the archive. Pins from d8204A-ISS3.net; behaviour per D8204AMN Issue3.doc — INFERRED
  const lk = pll(t);
  return { sig: lk?1:0, conf: (lk && L.conf)?1:0, err: lk?0:1, eq: D.eq?1:0, alarm: lk?0:1 };
}
function txOn(t){ // CS8427 TXOFF bit as last written
  if (D.issue!=='ISS1') return true;
  return fwLock(passOf(t, TX_OFF) - 1);
}
function aesOut(t){ // what the 4 digital outputs carry
  if (!D.power) return {ok:false, why:'power off'};
  if (!pll(t)) return {ok:false, why: present(t)? 'receiver re-acquiring / unlocked — no recovered clock' : 'no input'};
  if (!txOn(t)) return {ok:false, why:'TXOFF set by REFRESHSTATUS (cs8420reg3off = 0xD5) — line held low'};
  return {ok:true, why:'reclocked AES3 (TXD = AES3 receiver)'};
}

/* ---------------- DAC + analog stages ---------------- */
function dipByte(){ // READ_SWITCHES: switch #6→bit0, #7→bit1, #8→bit2, #4→bit3, #5→bit4, #2→bit5, #3→bit6, #1→bit7
  const s = n=>D.dip[n-1]?1:0;
  return s(6) | s(7)<<1 | s(8)<<2 | s(4)<<3 | s(5)<<4 | s(2)<<5 | s(3)<<6 | s(1)<<7;
}
function dacRegs(){
  const dsw = dipByte(), ri = dsw & 7, ti = (dsw & 0x78) >> 3;
  return { dsw, ri, ti, reg2: REG2[ti][1], reg3: REFS[ri][1], reg4: REFS[ri][1], ref: REFS[ri], route: REG2[ti] };
}
function atapi(reg2){ const n = reg2 & 15; return { aL:(n>>3)&1, aR:(n>>2)&1, bL:(n>>1)&1, bR:n&1 }; }
function srcName(l,r){ return l&&r? 'mono (L+R)/2' : l? 'input L' : r? 'input R' : 'mute'; }
const TRIM_R = 20000;                       // RV1/RV2 "20K" (BOM, assembly); the netlist says 10K
function trimGain(x){ return db(20000/(4700 + x*TRIM_R)); }   // U6/U9: R40/R57 20K0 over R47/R64 4K7 + trim
const FACTORY = 0.5;                        // factory trim position — INFERRED (centre)
function chanOut(side){ // side 0 = A (left), 1 = B (right) → {src, dBFS, dBu, clip, mute}
  const s = D.src, aL = Math.pow(10,s.lvlL/20), aR = Math.pow(10,s.lvlR/20);
  let l, r, att=0, regNote='';
  if (D.issue==='ISS1'){ const R=dacRegs(), a=atapi(R.reg2); l = side? a.bL : a.aL; r = side? a.bR : a.aR; att = R.ref[2]===null? null : (R.ref[1]); }
  else { l = side?0:1; r = side?1:0; }
  let amp = 0;
  if (l && r) amp = Math.sqrt(aL*aL + aR*aR)/2; else if (l) amp = aL; else if (r) amp = aR;
  const mute = amp===0 || att===null;
  const dBFS = mute? null : db(amp);
  const dBu = mute? null : dBFS + 24 + trimGain(side?D.trimB:D.trimA) - trimGain(FACTORY) - att;
  return { src: srcName(l,r), l, r, dBFS, dBu, att, clip: dBu!==null && dBu > 30.5, mute };
}
function analogLive(t){ if (!D.power || !pll(t)) return false; return true; }

/* ---------------- user actions (each logs the code path) ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, name, trace:tr}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
const A = {
  plug(on){ act(on?'Connect the AES source to INPUT':'Unplug INPUT', tr=>{
    D.src.on = on;
    if (D.issue==='ISS1'){
      tr(on? 'CS8427 PLL locks to the biphase stream (≈'+LOCK_T*1e3+' ms, '+'inferred)' : 'CS8427 loses lock; reg 16 bit 4 (UNLOCK) latches and RERR goes high');
      tr('Next pass: READ8420s → global write MAP=16 to both chips, then read reg 16 of aes1: btfss temp2,4 → lock_8420 bit 0 = '+(on?1:0));
      tr('REFRESHSTATUS: '+(on? 'bsf portd,7 (green LOCK on) · bcf portb,0 (red off) · bcf portc,6 (NO-LOCK released) · movlw cs8420reg3def (0x95)':'bcf portd,7 (green off) · bsf portb,0 (red NO LOCK on) · bsf portc,6 → Q1 pulls NO_LOCK low · movlw cs8420reg3off (0xD5)'));
      tr('movwf cs8420reg13 — the CS8427 only gets it on the NEXT pass, 5th byte of REFRESH8420_1 ('+(on?'TXOFF=0, outputs run':'TXOFF=1, outputs held low')+')');
    } else {
      tr('ISS3: CS8427 RERR (pin 11) → PIC16C54 RB2; the PIC16C54 code is not archived, so the rest is '+'inferred'+' from the netlist:');
      tr(on? 'RB6 → SIGNAL green on · RB4 → ERROR red off · RB3 MUTEDAC low (CS4390 MUTEL/MUTER released) · RB7 low (ALARM open)' : 'RB4 → ERROR red on · RB3 MUTEDAC high (CS4390 muted) · RB7 → Q1 → ALARM pulled low');
    }
  });},
  eq(){ act(D.eq?'Press EQ (release: cable EQ off)':'Press EQ (latch: cable EQ on)', tr=>{
    D.eq = !D.eq; const L = link();
    tr('SW1 (PH2AU push-on/push-off) is pure hardware — no firmware involved');
    tr(D.eq? 'Pole B joins NET00067 to NET00103: R13 330R + C9 1000p and R19 110R + C15 220p now feed U1B\'s summing node' : 'The RC network is disconnected; U1B is a flat ×'+eqGain(1e6,false).toFixed(2)+' inverting stage');
    tr('Pole A grounds the EQ LED cathode (R75 330R from +5 V) → yellow EQ LED '+(D.eq?'on':'off'));
    tr(`At ${(64*D.src.fs/1e6).toFixed(2)} MHz: U1B gain ${fmtDb(db(eqGain(64*D.src.fs,D.eq)),'dB')} · RXP swing ≈ ${L.amp.toFixed(2)} V p-p (model) → ${L.ok? (L.conf?'locks, eye marginal':'locks cleanly') : 'cannot lock'}`);
  });},
  cable(ft){ D.cable = ft; SIM.refresh(); },
  dipToggle(n){ act(`DIP SW2 switch #${n} → ${D.dip[n-1]?'OFF':'ON'}`, tr=>{
    if (D.issue!=='ISS1'){ tr('There is no DIP switch on the ISS3 board (deleted in the ISS2 ECO with the CS4392). Switch to ISS1 to use it.'); return; }
    D.dip[n-1] = D.dip[n-1]?0:1;
    const pin = {1:'RE1',2:'RE0',3:'RA5',4:'RA4',5:'RA3',6:'RA2',7:'RA1',8:'RA0'}[n];
    const bit = {1:7,2:5,3:6,4:3,5:4,6:0,7:1,8:2}[n];
    const R = dacRegs();
    tr(`READ_SWITCHES (0x${ADDR.READ_SWITCHES.toString(16)}): btfss port${pin[1].toLowerCase()},${pin[2]} → dip_switch bit ${bit} = ${D.dip[n-1]} → dip_switch = ${bin8(R.dsw)}b`);
    if (bit<=2){
      tr(`PROCESS_SWITCHES: andlw 0x07 = ${R.ri} → call reference_level_table → addwf pcl,f → goto ${R.ref[0]} (0x${REFADDR[R.ri].toString(16)})`);
      tr(`cs4392reg3 = cs4392reg4 = 0x${hex2(R.reg3)} → ${R.ref[2]===null? 'volume 0x7F (= mute; the manual calls codes 6 and 7 "Reserved")' : R.reg3+' dB attenuation: '+R.ref[2]+' dBFS now gives the plant level'}`);
    } else if (bit<=6){
      tr(`PROCESS_SWITCHES: andlw 0x78 → rrf ×3 → index ${R.ti} → call analog_type_table → goto ${R.route[0]}`);
      const a = atapi(R.reg2);
      tr(`cs4392reg2 = 0x${hex2(R.reg2)} (${bin8(R.reg2)}b): ATAPI ${(R.reg2&15).toString(2).padStart(4,'0')} → A (left) = ${srcName(a.aL,a.aR)}, B (right) = ${srcName(a.bL,a.bR)}${R.reg2===0x72?' — note bit 4 is set only in this entry (see Findings)':''}`);
    } else tr('Switch #1 → dip_switch bit 7: "switch 7 reserved" — PROCESS_SWITCHES never reads it');
    tr('REFRESH4392 at the end of the same pass writes all 6 CS4392 registers (8 SPI bytes on RD0/RD1/RD2)');
  });},
  trim(side, d){ const k = side? 'trimB':'trimA'; const o=D[k]; D[k] = Math.max(0, Math.min(1, +(D[k]+d).toFixed(3)));
    act(`Turn ${side?'CHB (RV2)':'CHA (RV1)'} ${d<0?'clockwise (louder)':'counter-clockwise (quieter)'}`, tr=>{
      tr('Trimmer in series with '+(side?'R64':'R47')+' 4K7 into '+(side?'U9':'U6')+' (NE5532), feedback '+(side?'R57':'R40')+' 20K0: gain = 20K / (4K7 + R)');
      tr(`R ${(o*TRIM_R/1000).toFixed(1)}k → ${(D[k]*TRIM_R/1000).toFixed(1)}k · stage gain ${fmtDb(trimGain(o),'dB')} → ${fmtDb(trimGain(D[k]),'dB')} · no firmware involved`);
      const c = chanOut(side); tr(`${side?'R':'L'} OUT1/OUT2 now ${c.mute?'muted':fmtDb(c.dBu,'dBu')} for the ${side?D.src.lvlR:D.src.lvlL} dBFS tone`);
    }); },
  h1(){ act('Move jumper H1 to '+(D.h1==='analog'?'2–3 (ALARM)':'1–2 (analog)'), tr=>{
    D.h1 = D.h1==='analog'? 'alarm':'analog';
    tr(D.h1==='alarm'? 'Edge pin M (P1.21) now connects to ALARM: Q1 (4401) collector through R36 10R. B2+ analog (U12 → R74 30R) is disconnected.' : 'Edge pin M (P1.21) back on B2+ (U12 pin 7 via R74 30R). The open collector is parked.');
    tr(D.issue==='ISS1'? 'Q1 base is driven from RC6 via R29 4K7: REFRESHSTATUS sets RC6 when unlocked ("signal1 error open collector")' : 'Q1 base is driven from RB7 via R37 4K7 (ISS3) — '+'inferred'+' to follow NO LOCK');
    tr('Rear module text calls this terminal "ANALOG R. OUT2+/CONFIDENCE"; on this board it is the NO-LOCK tally (see Findings)');
  });},
  drop(){ act('Inject a 2 ms input dropout at the playhead', tr=>{
    D.drops.push(SIM.t); const p = passOf(SIM.t, READ_OFF)+1;
    tr(`Input missing ${SIM.fmtT(SIM.t)} … +2 ms; the CS8427 then needs ≈${LOCK_T*1e3} ms (${'inferred'}) to re-acquire`);
    if (D.issue==='ISS1'){
      tr(`reg 16 bit 4 (UNLOCK) latches; pass #${p} READ8420s sees it → REFRESHSTATUS: red on, RC6 high, cs8420reg13 = 0xD5`);
      tr(`Pass #${p+1} REFRESH8420_1 writes 0xD5 → TXOFF: the four outputs go low until the first clean read, then one more pass`);
      tr('Scrub forward from the playhead to watch the lanes "Firmware lock flag", "TXOFF" and "AES OUT1–4"');
    } else tr('ISS3: LEDs and MUTEDAC follow the receiver directly in this model ('+'inferred'+')');
  });},
  clearDrops(){ D.drops = []; SIM.refresh(); },
  setIssue(v){ act('Board issue → '+v, tr=>{ D.issue=v;
    tr(v==='ISS1'? 'ISS1 (2005|38): PIC16F874 U25 + CS8427 + CS4392 + 8-way DIP SW2. This is the board v100.asm was written for: every port pin in the code matches d8204A-ISS1.net.' :
      'ISS3 (2005–2006|38–39): PIC16C54 U10 + CS8427 + CS4390 (hardware-mode DAC). The PIC16C54 code is not in the archive; LEDs, mute and alarm are modelled from the ISS3 netlist and the Issue 3 manual.'); }); },
  power(){ act(D.power?'Pull the card':'Insert the card', tr=>{ D.power=!D.power;
    if (D.power){ tr('RESET → goto INIT: ports PORTB=0xFF (red on), PORTD=0xE6 (green on), PORTC=0x00 (CS8427 held in reset by RC7)');
      tr('powerupdelay: 256 × decfsz ≈ 0.6 ms; bsf portc,7 releases the CS8427; REFRESH4392 with cs4392reg5start 0x30 (PDN + CPEN), refresh8420_1/_2');
      tr('Then the CS4392 defaults, reg 5 = 0x20 (power up), and MAIN. ≈'+(INIT_CYC*TCY*1e3).toFixed(1)+' ms from reset (oscillator start-up not counted)'); } }); },
  reset(){ Object.assign(D, JSON.parse(DEFAULTS)); D.drops=[]; D.power=true; D.log=[]; SIM.refresh(); },
};
document.addEventListener('keydown', e=>{
  if (!window.__d8204aActive || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase();
  const m = { q:()=>A.eq(), i:()=>A.plug(!D.src.on), d:()=>A.drop(), j:()=>A.h1(), a:()=>A.trim(0,-0.05), z:()=>A.trim(0,0.05), s:()=>A.trim(1,-0.05), x:()=>A.trim(1,0.05) };
  if (/^[1-8]$/.test(k)) { A.dipToggle(+k); e.preventDefault(); return; }
  if (m[k]) { m[k](); e.preventDefault(); }
});

/* ================================================================
   DRAWING
   ================================================================ */
/* Card (component side) built on the real ISS3 assembly drawing: D8204A-ISS3-ASSY - #Assembly.pdf rendered at 150 dpi,
   cropped to the board and turned so the front edge is on the left (1565 × 410 px ≈ 10.4" × 2.7"). Overlays sit on the
   drawing's own part outlines. */
function cardSVG(t, opts){
  opts = opts||{}; const L = leds(t);
  const led=(x,y,on,col,lab)=>`<g><title>${lab}</title><rect x="${x-15}" y="${y-7}" width="30" height="14" rx="3" fill="${on?col:'#2a2f2a'}" ${on?'filter="url(#d8aglow)"':''}/></g>`;
  const trim=(x,y,side)=>{ const v = side? D.trimB : D.trimA, ang = 135 - v*270;
    return `<g class="d8a-trim" data-s="${side}" style="cursor:pointer"><title>${side?'RV2 CHB':'RV1 CHA'} 20K trim · click left/right half to turn, or use the mouse wheel</title>
      <rect x="${x-14}" y="${y-30}" width="28" height="60" fill="transparent"/>
      <circle cx="${x}" cy="${y}" r="13" fill="#2b62b8" stroke="#bcd" stroke-width="1.5"/>
      <line x1="${x}" y1="${y}" x2="${x+11*Math.sin(ang*Math.PI/180)}" y2="${y-11*Math.cos(ang*Math.PI/180)}" stroke="#fff" stroke-width="3"/></g>`; };
  const h1 = D.h1==='analog'? 1435 : 1450;
  return `<svg viewBox="0 0 1565 410" role="img" aria-label="D8204A ISS3 card, component side (real assembly drawing)" style="width:100%;border-radius:8px;display:block">
    <defs><filter id="d8aglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1565" height="410" fill="var(--bg)"/>
    <path d="M8 8 H1530 L1556 22 V392 L1530 404 H8 Z" fill="#1f5a34"/>
    <image href="${ASSET}d8204a-assy-white.png" width="1565" height="410" opacity=".88"/>
    ${led(63,297,L.sig,'var(--led-g)','SIGNAL (green) — RB6 via R32 330R')}
    ${led(63,312,L.conf,'#ffd23a','CONFIDENCE (yellow) — RB5 via R33 330R')}
    ${led(63,327,L.err,'#ff4a3a','ERROR (red) — RB4 via R34 330R')}
    ${led(148,108,L.eq,'#ffd23a','EQ (yellow) — SW1 pole A, R75 330R')}
    <g class="d8a-eq" style="cursor:pointer"><title>SW1 PH2AU — cable EQ push-on/push-off (click)</title>
      <rect x="92" y="40" width="114" height="52" fill="transparent"/>
      <rect x="${D.eq?108:96}" y="56" width="${D.eq?18:30}" height="16" fill="${D.eq?'#ffd23a':'#ccc'}" stroke="#333"/></g>
    ${trim(345,135,1)}${trim(345,210,0)}
    <g class="d8a-h1" style="cursor:pointer"><title>H1: 1-2 = pin M is B2+ analog · 2-3 = pin M is the NO-LOCK open collector (click)</title>
      <rect x="1415" y="292" width="55" height="26" fill="transparent"/>
      <rect x="${h1-4}" y="297" width="26" height="16" rx="3" fill="#111" stroke="#ffb43a" stroke-width="2"/></g>
    ${opts.hot||''}
    <text x="1540" y="214" fill="#fff" font-size="13" text-anchor="middle" transform="rotate(90 1540 214)">P1 EDAC 30-way edge → rear module</text>
  </svg>`;
}
/* ISS1 placement drawn to scale from d8204A-iss1.pnp (130 SMT parts, mil coordinates; 0.15 px/mil = same scale as the ISS3 drawing).
   Through-hole parts (SW1, RV1/RV2, T1, P1) are not in the .pnp, so they are not drawn. Board outline: taken as the ISS3 one (inferred). */
const ISS1_PNP = 'C1,K,12192.5,7075,0;C3,K,10427.5,6675,180;C4,K,10332.5,5810,180;C5,1,13308,6927,180;C6,1,13098,6579,180;C13,1,11457,6536,0;C18,1,11457,6426,0;C19,1,11457,6746,0;C22,1,10908,6369,180;C23,1,10936,6193,270;C24,K,10902.5,6580,180;C25,1,13977,6516,0;C26,1,10908,6479,180;C28,1,10946,5433,270;C29,1,13976,6636,0;C30,1,13976,6746,0;C31,1,13976,6906,0;C32,1,11718,6219,180;C33,1,12241,6138,270;C34,1,11381,5943,270;C35,1,12057,6456,0;C36,1,12886,6133,270;C37,1,8989,5472,90;C38,1,11271,5943,270;C39,1,11718,5999,180;C40,1,13336,6108,270;C41,1,12058,6314,180;C42,1,11977,6001,0;C43,1,13143,6264,180;C44,1,13067,5926,0;C45,1,11046,5943,270;C48,1,11723,5574,180;C49,1,12251,5513,270;C50,1,11161,5943,270;C51,1,11723,5339,180;C52,1,13346,5448,270;C53,1,12053,5649,180;C54,1,12052,5796,0;C55,1,11977,5341,0;C56,1,13087,5311,0;C57,1,12786,5513,270;C58,1,10011,5438,270;C59,1,8484,6042,90;C60,1,14182,6331,0;C61,1,13163,5634,180;C62,1,13867,5421,0;C63,1,9347,6721,0;C64,1,9277,5821,0;C65,1,13953,5734,180;C66,1,9523,5819,180;C67,1,13852,6091,0;C69,1,9465,7150,0;C70,1,9695,7355,270;D11,T,8713.5,6435,270;EQ,L,5050,6900,0;L3,L,4400,7175,180;L4,L,4400,7325,180;Q1,T,10200,7253.5,0;R6,1,14223,6514,180;R7,1,10893,5249,180;R8,1,10829,5432,90;R9,1,13087,7391,0;R11,1,8876,5473,270;R12,1,14222,6904,180;R14,1,14222,6634,180;R15,1,14222,6744,180;R16,1,8856,5923,270;R18,1,13597,6581,0;R20,1,5470,5550,180;R21,1,5470,5660,180;R22,1,13071,6798,270;R24,1,13092,7191,0;R25,1,11457,6646,0;R26,1,13348,6579,180;R27,1,5470,5770,180;R28,1,13481,6758,270;R29,1,9953,7209,180;R36,1,5470,5880,180;R37,1,5470,5990,180;R38,1,5470,6100,180;R39,1,11718,6329,180;R40,1,12776,6133,270;R41,1,12351,6138,270;R42,1,11541,5998,270;R43,1,11539,6242,90;R44,1,10523,7179,180;R45,1,11722,5796,0;R46,1,12287,5951,0;R47,1,12664,6132,90;R48,1,13664,6107,90;R50,1,11269,6192,90;R51,1,11718,6109,180;R52,1,13554,6107,90;R53,1,13446,6108,270;R54,1,12536,6133,270;R55,1,13684,5447,90;R56,1,11723,5684,180;R57,1,12896,5513,270;R58,1,12361,5513,270;R59,1,11379,6192,90;R60,1,11534,5642,90;R61,1,13403,6289,180;R62,1,11044,6192,90;R63,1,12317,5331,0;R64,1,12674,5512,90;R65,1,13456,5448,270;R66,1,11159,6192,90;R67,1,11723,5449,180;R68,1,13574,5447,90;R69,1,11536,5393,270;R70,1,12561,5513,270;R71,1,14183,6219,180;R72,1,13823,6404,180;R73,1,13686,5698,270;R74,1,14218,5604,180;R76,1,11717,6441,0;R77,1,13423,5634,180;R78,1,5470,6315,180;R79,1,5470,6205,180;REG1,R,8685,5855,180;REG3,R,10705,5270,90;SW2,W,5015.5,5935,180;U2,S,13275,6753,0;U5,S,12015,6155,0;U6,S,13110,6095,0;U8,S,12020,5495,0;U9,S,13120,5470,0;U11,S,13895,6245,0;U12,S,13910,5575,0;U25,Q,9312.5,6365,270'
  .split(';').map(s=>{ const [r,p,x,y,rot]=s.split(','); return {r,p,x:+x,y:+y,rot:+rot}; });
const ISS1_SIZE = {1:[18,9], K:[19,10], T:[18,15], L:[18,9], R:[39,21], S:[30,23], Q:[60,60], W:[128,46]};
const i1x = X=> 60 + (X-4400)*0.15, i1y = Y=> 10 + (7480-Y)*0.15;
function iss1SVG(t){
  const L = leds(t);
  let s = `<svg viewBox="0 0 1565 410" role="img" aria-label="D8204A ISS1 placement from the pick-and-place file" style="width:100%;border-radius:8px;display:block">
    <rect width="1565" height="410" fill="var(--bg)"/><path d="M8 8 H1530 L1556 22 V392 L1530 404 H8 Z" fill="#1f5a34"/>`;
  for (const c of ISS1_PNP){
    let [w,h] = ISS1_SIZE[c.p]; if (c.rot===90||c.rot===270) [w,h]=[h,w];
    const x=i1x(c.x), y=i1y(c.y);
    const hl = c.r==='U25'||c.r==='SW2'; const col = c.r==='U25'? '#2b62b8' : c.r[0]==='U'? '#202224' : c.r[0]==='C'? '#b9a27a' : c.r[0]==='R'? '#3a3d40' : '#555';
    if (c.r==='L3'||c.r==='L4'||c.r==='EQ'){ const on = c.r==='L4'? L.sig : c.r==='L3'? L.err : L.eq; const lc = c.r==='L4'?'var(--led-g)':c.r==='L3'?'#ff4a3a':'#ffd23a';
      s += `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" fill="${on?lc:'#2a2f2a'}" ${on?'filter="url(#d8aglow1)"':''}><title>${c.r} ${c.r==='L4'?'GREEN (RD7)':c.r==='L3'?'RED (RB0)':'YELLOW EQ'}</title></rect>`; continue; }
    if (c.r==='SW2') continue;
    s += `<rect x="${(x-w/2).toFixed(1)}" y="${(y-h/2).toFixed(1)}" width="${w}" height="${h}" fill="${col}" stroke="${hl?'#fff':'rgba(255,255,255,.35)'}" stroke-width="${hl?1.5:.6}"><title>${c.r}</title></rect>`;
    if (w>=28) s += `<text x="${x}" y="${y+4}" fill="#fff" font-size="${c.r==='U25'?11:9}" text-anchor="middle">${c.r}</text>`;
  }
  // SW2 interactive (8 positions; switch #1 end = left — orientation inferred)
  const sx=i1x(5015.5)-64, sy=i1y(5935)-23;
  s += `<rect x="${sx}" y="${sy}" width="128" height="46" rx="3" fill="#b3261e" stroke="#fff"/>`;
  for (let n=1;n<=8;n++){ const x=sx+6+(n-1)*15.2, on=D.dip[n-1];
    s += `<g class="d8a-dip" data-n="${n}" style="cursor:pointer"><title>SW2 switch #${n} (${on?'ON':'OFF'}) — click</title><rect x="${x}" y="${sy+5}" width="12" height="36" fill="#eee"/><rect x="${x+1}" y="${on?sy+6:sy+24}" width="10" height="16" fill="#222"/></g>`; }
  s += `<text x="${sx+64}" y="${sy-5}" fill="#fff" font-size="11" text-anchor="middle">SW2 · ON ↑</text>
    <text x="${i1x(9312.5)}" y="${i1y(6365)+46}" fill="#fff" font-size="11" text-anchor="middle">PIC16F874 · X2 4.9152 MHz</text>
    <text x="20" y="398" fill="#fff" font-size="12" opacity=".8">ISS1 · drawn to scale from d8204A-iss1.pnp (SMT parts only) — not the original artwork</text>
    <defs><filter id="d8aglow1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>`;
  return s;
}
/* Front edge as the operator sees it in the frame: LED and button heights taken from the assembly drawing (same y as cardSVG). */
function edgeSVG(t){
  const L = leds(t), iss1 = D.issue==='ISS1';
  const led=(y,on,col,lab)=>`<g><title>${lab}</title><circle cx="40" cy="${y}" r="9" fill="#0a0b0b"/><circle cx="40" cy="${y}" r="6.5" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#d8aglow2)"':''}/><text x="58" y="${y+4}" fill="#ccc" font-size="10">${lab.split(' ')[0]}</text></g>`;
  return `<svg viewBox="0 0 120 410" role="img" aria-label="D8204A front edge" style="height:330px;display:block;margin:auto">
    <defs><filter id="d8aglow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="10" y="4" width="100" height="402" rx="6" fill="var(--dev)"/>
    <g class="d8a-eq" style="cursor:pointer"><title>EQ push button (SW1) — click</title><rect x="26" y="${D.eq?58:52}" width="28" height="22" rx="4" fill="${D.eq?'#cfcfcf':'#e8e8e8'}" stroke="#555"/><text x="58" y="70" fill="#ccc" font-size="10">EQ</text></g>
    ${led(108,L.eq,'#ffd23a','EQ yellow')}
    ${iss1? led(297,L.sig,'var(--led-g)','LOCK green (L4)') + led(327,L.err,'#ff4a3a','NO-LOCK red (L3)')
          : led(297,L.sig,'var(--led-g)','SIGNAL green') + led(312,L.conf,'#ffd23a','CONF yellow') + led(327,L.err,'#ff4a3a','ERROR red')}
    <rect x="30" y="345" width="60" height="52" rx="5" fill="#2d3033"/><text x="60" y="376" fill="#ddd" font-size="11" text-anchor="middle" font-weight="700">D8204A</text>
  </svg>`;
}
/* Rear module: Artwork 2026|59 = the CorelDRAW vectors of "D8204A - rear module options.cdr" (2012-01-16), through Corel's own
   PDF export of it (libcdr mangles the terminal-block symbol font); cell = 220 px per inch; plate black, silk white (MF8212 rear photo). */
const RMG_DIR='#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/';
const REAR = {
  BNC2: { img:'d8204a-rear-bnc2.svg', w:568, in:[196,95], outs:[[266,168],[196,242],[266,315],[196,389]],
          term:{L:[168,[455,478,501,525,548,572]], R:[255,[420,443,465,490,512,535]]} },
  BNC4: { img:'d8204a-rear-bnc4.svg', w:572, in:[195,90], loop:[296,90], outs:[[195,203],[296,203],[195,316],[296,316]],
          term:{L:[180,[403,425,447,517,540,562]], R:[262,[403,425,447,517,540,562]]} },
};
function rearSVG(t){
  const R = REAR[D.rear], o = aesOut(t), live = analogLive(t), Lf = leds(t);
  let s = `<svg viewBox="0 0 ${R.w} 692" role="img" aria-label="D8204A ${D.rear} rear module (real artwork)" style="width:100%;max-width:440px;display:block;margin:auto;border-radius:8px">
    <rect width="${R.w}" height="692" fill="#e9e9e4"/><image href="${ASSET}${R.img}" width="${R.w}" height="692"/>`;
  s += `<g class="d8a-in" style="cursor:pointer"><title>${D.src.on?'Click to unplug':'Click to plug in'} the AES source</title><circle cx="${R.in[0]}" cy="${R.in[1]}" r="46" fill="transparent"/>
    ${D.src.on?`<circle cx="${R.in[0]}" cy="${R.in[1]}" r="26" fill="#3a74b8" opacity=".85"/><rect x="${R.in[0]-9}" y="${R.in[1]-60}" width="18" height="34" fill="#3a74b8" opacity=".85"/>`:''}
    <circle cx="${R.in[0]+36}" cy="${R.in[1]-34}" r="8" fill="${D.src.on?'var(--accent)':'#999'}"/></g>`;
  R.outs.forEach(([x,y],k)=>{ s += `<circle cx="${x}" cy="${y}" r="13" fill="${o.ok?'#4cc38a':'#7a2a22'}" opacity="${o.ok?.85:.5}"><title>DIGITAL OUT ${k+1}: ${o.why}</title></circle>`; });
  if (R.loop) s += `<text x="${R.loop[0]}" y="${R.loop[1]+60}" font-size="11" fill="#555" text-anchor="middle">(bridged loop)</text>`;
  s += `</svg>`;
  const rows = [['L OUT1 (A1±)',0,'A1'],['L OUT2 (A2±)',0,'A2'],['R OUT1 (B1±)',1,'B1'],['R OUT2 (B2±)',1,'B2']].map(([nm,sd,k])=>{ const c=chanOut(sd);
    let v = !live? 'silent' : c.mute? 'muted' : fmtDb(c.dBu,'dBu')+(c.clip?' CLIPS':'');
    if (k==='B2' && D.h1==='alarm') v = 'B2+ = NO-LOCK tally: '+(Lf.alarm?'pulled low':'open');
    return `<tr><td>${nm}</td><td class="mono" style="${c.clip?'color:var(--bad)':''}">${v}</td></tr>`; }).join('');
  s += `<div class="small muted" style="max-width:440px;margin:2px auto 0">CorelDRAW art: ${SIM.src(RMG_DIR+'D8204A - rear module options.cdr','D8204A - rear module options.cdr')} (2012|45), via its Corel PDF ${SIM.src(RMG_DIR+'D8204A - rear module options.pdf','export')}.</div>`;
  return s + `<table class="kv" style="max-width:440px;margin:6px auto 0"><tr><th>Screw terminals</th><th>at the playhead</th></tr>${rows}</table>`;
}
function bindPanel(root){
  root.querySelectorAll('.d8a-eq').forEach(g=>g.onclick=()=>A.eq());
  root.querySelectorAll('.d8a-h1').forEach(g=>g.onclick=()=>A.h1());
  root.querySelectorAll('.d8a-in').forEach(g=>g.onclick=()=>A.plug(!D.src.on));
  root.querySelectorAll('.d8a-dip').forEach(g=>g.onclick=()=>A.dipToggle(+g.dataset.n));
  root.querySelectorAll('.d8a-trim').forEach(g=>{ const sd=+g.dataset.s;
    g.onclick=e=>{ const r=g.getBoundingClientRect(); A.trim(sd, (e.clientX-r.left)/r.width<0.5? 0.05 : -0.05); };   // left half = counter-clockwise (quieter)
    g.addEventListener('wheel', e=>{ e.preventDefault(); A.trim(sd, e.deltaY<0? -0.02 : 0.02); }, {passive:false}); });
}
/* trim position convention: 0 = fully clockwise (minimum resistance, loudest). Clicking the right half turns clockwise. */

/* ---------------- SPI traffic of one pass (bit-exact from the code) ---------------- */
function spiBytes(regs13){
  const r = FW.r8420;
  const r8420 = [['ld',0x20],['ld',0x81],['ld',r[1]],['ld',r[2]],['ld',regs13],['ld',r[4]],['ld',r[5]],['ld',r[6]],['clr',0x00],['call',0x00],['ld',r[9]]]
    .concat(Array(7).fill(['call',r[9]])).concat([['ld',r[17]]]);
  return r8420;
}
function passTx(p){
  // returns transactions with absolute cycle numbers for pass p
  const base = p*PASS_CYC, tx = [], R = dacRegs();
  const reg13 = fwLock(p-1)? FW.r8420[3] : FW.reg3off;
  const seq = spiBytes(reg13);
  function write(name, cs, bus, start, list){ // start = cycle where the routine's first instruction runs
    let c = start + 1; const bits=[];   // bcf CS
    for (const [k,v] of list){ if (k==='ld') c+=2; if (k==='clr') c+=1; c+=2; for (let i=0;i<8;i++){ bits.push({c:c+i*5+3, v:(v>>(7-i))&1, o:true}); } c+=40+2; }
    tx.push({name, cs, bus, a:start, b:c+1, bits, bytes:list.map(x=>x[1])});
  }
  write('REFRESH8420_1','CS1 (RC2)','C', base+OFF.REFRESH8420_1+2, seq);
  write('REFRESH8420_2','CS2 (RC4) — nothing connected','C', base+OFF.REFRESH8420_2+2, seq.map(x=>x[0]==='ld'&&x[1]===reg13? [x[0], FW.r8420[3]] : x));
  // READ8420s
  { let c = base+OFF.READ8420s+2+1+2; const bits=[];
    for (const v of [0x20,0x10]){ c+=2+2; for (let i=0;i<8;i++) bits.push({c:c+i*5+3, v:(v>>(7-i))&1, o:true}); c+=42; }
    tx.push({name:'READ8420s (global MAP=16)', cs:'CS1+CS2', bus:'C', a:base+OFF.READ8420s+2, b:c+2, bits, bytes:[0x20,0x10]}); c+=2;
    const lk = !unlockedBetween(readAt(p-1), readAt(p)), r16 = lk? 0x00 : 0x10;
    for (const [nm,val] of [['CS1 (RC2)',r16],['CS2 (RC4) — floating',0xFF]]){ const a=c; c+=1; const bb=[];
      c+=2+2; for (let i=0;i<8;i++) bb.push({c:c+i*5+3, v:(0x21>>(7-i))&1, o:true}); c+=42;
      c+=2+1; for (let i=0;i<8;i++){ bb.push({c:c+i*4, v:(val>>(7-i))&1, o:false}); } c+=8*2+7*2+2; c+=1+2;
      tx.push({name:'READ8420s read reg 16', cs:nm, bus:'C', a, b:c, bits:bb, bytes:[0x21,val]}); }
  }
  const dac = [['ld',0x20],['ld',0x81],['ld',FW.r4392[1]],['ld',R.reg2],['ld',R.reg3],['ld',R.reg4],['ld',FW.r4392[5]],['ld',FW.r4392[6]]];
  write('REFRESH4392','DAC CS (RD0)','D', base+OFF.REFRESH4392+2, dac);
  return tx;
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css = n=>SIM.css(n), fs = D.src.fs, ls = [];
  const shade = (c,X,t0,t1,y,h,fn,col,N)=>{ N=N||400; const span=t1-t0; c.fillStyle=col; for (let i=0;i<N;i++){ const ta=t0+span*i/N, tb=t0+span*(i+1)/N; if (fn((ta+tb)/2)) c.fillRect(X(ta), y+4, X(tb)-X(ta)+0.6, h-8); } };
  ls.push({label:`AES3 input @ ${fs/1000} kHz (frames / blocks)`, h:28, draw(c,X,t0,t1,y,h){
    if (!D.src.on){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('INPUT unplugged', X(t0)+6, y+h/2+4); return; }
    const span=t1-t0; if (span < 400/fs) SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.5/fs,css('--accent'),'frames'); else SIM.pulses(c,X,t0,t1,y,h,192/fs,0,2/fs,css('--accent'),'blocks (Z preamble)');
    D.drops.forEach(d=>{ if (d+DROP<t0||d>t1) return; c.fillStyle=css('--bad'); c.globalAlpha=.55; c.fillRect(X(d),y+2,X(d+DROP)-X(d)+1,h-4); c.globalAlpha=1; });
  }});
  ls.push({label:'CS8427 PLL locked (RERR low)', h:20, draw(c,X,t0,t1,y,h){ shade(c,X,t0,t1,y,h,t=>pll(t),css('--accent')); shade(c,X,t0,t1,y,h,t=>!pll(t),css('--bad')); }});
  if (D.issue==='ISS1'){
    ls.push({label:'PIC16F874 main loop (5.13 ms pass)', h:34, draw(c,X,t0,t1,y,h){
      const p0 = Math.floor(t0/PASS), p1 = Math.floor(t1/PASS), pxPass = X(t0+PASS)-X(t0);
      const col = {a:css('--accent'), b:css('--accent2'), p:css('--warn'), c:'#8a5cc2', d:css('--grid')};
      for (let p=p0;p<=p1;p++){ const ts=p*PASS;
        if (pxPass < 6){ c.fillStyle = p%2? css('--accent'):css('--accent2'); c.globalAlpha=.6; c.fillRect(X(ts),y+4,Math.max(1,X(ts+PASS)-X(ts)-.5),h-8); c.globalAlpha=1; continue; }
        STEPS.forEach(s=>{ const a=ts+OFF[s[0]]*TCY, b=a+s[1]*TCY; c.fillStyle=col[s[3]]; c.globalAlpha=s[3]==='d'?.9:.8; c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)-.5),h-8); c.globalAlpha=1;
          if (X(b)-X(a)>64){ c.fillStyle=s[3]==='d'?css('--ink2'):'#fff'; c.font='10px sans-serif'; c.fillText(s[0], X(a)+3, y+h/2+3); } });
      }
      if (pxPass < 6){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${p1-p0+1} passes of ${(PASS*1e3).toFixed(3)} ms (6303 cycles × ${(TCY*1e9).toFixed(1)} ns)`, X(t0)+6, y+h/2+4); }
    }});
    ls.push({label:'SPI to CS8427: CCLK RC1 / CDIN RC0', h:34, draw(c,X,t0,t1,y,h){ drawSpi(c,X,t0,t1,y,h,'C'); }});
    ls.push({label:'SPI to CS4392: CCLK RD1 / CDIN RD2', h:26, draw(c,X,t0,t1,y,h){ drawSpi(c,X,t0,t1,y,h,'D'); }});
    ls.push({label:'Firmware lock flag (lock_8420 bit 0)', h:20, draw(c,X,t0,t1,y,h){ shade(c,X,t0,t1,y,h,t=>fwLock(passOf(t,READ_OFF)),css('--accent')); shade(c,X,t0,t1,y,h,t=>!fwLock(passOf(t,READ_OFF)),css('--bad')); }});
    ls.push({label:'CS8427 reg 3 TXOFF (0x95 / 0xD5)', h:20, draw(c,X,t0,t1,y,h){ shade(c,X,t0,t1,y,h,t=>!txOn(t),css('--warn')); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('orange = TXOFF', X(t0)+4, y+h/2+3); }});
  } else {
    ls.push({label:'PIC16C54 (code not archived)', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('ISS3: RC oscillator R25 4K7 / C58 27p; the program that ran here is missing — status lanes below are inferred', X(t0)+6, y+h/2+4); }});
  }
  ls.push({label:'AES OUT1–4 (U2 EL5263, 75 Ω)', h:24, draw(c,X,t0,t1,y,h){
    const span=t1-t0; shade(c,X,t0,t1,y,h,t=>!aesOut(t).ok,css('--bad'));
    if (span < 400/fs){ for (let n=Math.floor(t0*fs); n<=t1*fs; n++){ const ta=n/fs; if (!aesOut(ta).ok) continue; c.fillStyle=css('--accent'); c.fillRect(X(ta), y+5, Math.max(1,X(ta+0.9/fs)-X(ta)), h-10); } }
    else shade(c,X,t0,t1,y,h,t=>aesOut(t).ok,css('--accent'));
  }});
  ls.push({label:'I²S to DAC: OLRCK fs / OSCLK 64fs', h:22, draw(c,X,t0,t1,y,h){ if (!pll(t0)&&!pll(t1)) return; SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.5/fs,css('--accent2'),'LRCK periods'); }});
  [0,1].forEach(sd=>{ ls.push({label:`Analog ${sd?'R (B)':'L (A)'} OUT1/2 — ${chanOut(sd).src}`, h:38, draw(c,X,t0,t1,y,h){
    const ch = chanOut(sd); const pw = X(t1)-X(t0), span=t1-t0, N=Math.min(1600,Math.max(200,pw*2));
    if (ch.mute){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('muted', X(t0)+6, y+h/2+4); return; }
    const aL=Math.pow(10,D.src.lvlL/20), aR=Math.pow(10,D.src.lvlR/20), k=ch.l&&ch.r? .5:1, g=Math.pow(10,(trimGain(sd?D.trimB:D.trimA)-trimGain(FACTORY)-ch.att)/20);
    const v = t=>{ if (!analogLive(t)) return 0; const n=Math.floor(t*D.src.fs)/D.src.fs; return k*g*((ch.l?aL*Math.sin(2*Math.PI*D.src.fL*n):0)+(ch.r?aR*Math.sin(2*Math.PI*D.src.fR*n):0)); };
    const sc = (h/2-3)/0.35;
    if (span*Math.max(D.src.fL,D.src.fR) > pw/3){ c.fillStyle=sd?css('--bad'):css('--accent'); c.globalAlpha=.35; for (let i=0;i<300;i++){ const ta=t0+span*i/300; if (!analogLive(ta)) continue; const a=Math.min(h/2-2,k*g*((ch.l?aL:0)+(ch.r?aR:0))*sc); c.fillRect(X(ta), y+h/2-a, pw/300+.6, 2*a); } c.globalAlpha=1; return; }
    c.strokeStyle=sd?css('--bad'):css('--accent'); c.lineWidth=1.2; c.beginPath();
    for (let i=0;i<=N;i++){ const ta=t0+span*i/N; const yy=y+h/2 - Math.max(-h/2+2,Math.min(h/2-2,v(ta)*sc)); i?c.lineTo(X(ta),yy):c.moveTo(X(ta),yy); } c.stroke();
  }}); });
  ls.push({label: D.issue==='ISS1'? 'LEDs: LOCK green · NO LOCK red · EQ' : 'LEDs: SIGNAL · CONF · ERROR · EQ', h:34, draw(c,X,t0,t1,y,h){
    const rows = D.issue==='ISS1'? [['sig',css('--accent')],['err',css('--bad')],['eq','#d6a400']] : [['sig',css('--accent')],['conf','#d6a400'],['err',css('--bad')],['eq','#d6a400']];
    const N=Math.min(600,Math.max(60,(X(t1)-X(t0))/2)), span=t1-t0, rh=(h-6)/rows.length;
    rows.forEach(([k,col],r)=>{ c.fillStyle=col; for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; if (leds(tt)[k]) c.fillRect(X(t0+span*i/N), y+3+r*rh, (X(t1)-X(t0))/N+0.5, rh-1); } });
  }});
  ls.push({label:`NO-LOCK open collector (Q1 → H1 → pin M${D.h1==='alarm'?'':', parked'})`, h:20, draw(c,X,t0,t1,y,h){ shade(c,X,t0,t1,y,h,t=>leds(t).alarm,D.h1==='alarm'?css('--warn'):css('--grid')); }});
  return ls;
}
function drawSpi(c,X,t0,t1,y,h,bus){
  const css=n=>SIM.css(n); const p0=Math.floor(t0/PASS)-1, p1=Math.floor(t1/PASS);
  const cycPx = X(t0+TCY)-X(t0);
  for (let p=p0;p<=p1;p++){
    for (const tx of passTx(p)){ if (tx.bus!==bus) continue; const a=tx.a*TCY, b=tx.b*TCY; if (b<t0||a>t1) continue;
      const phantom = /nothing|floating/.test(tx.cs);
      c.fillStyle = phantom? css('--warn') : bus==='D'? '#8a5cc2' : css('--accent2'); c.globalAlpha = cycPx>1.2? .15 : .55;
      c.fillRect(X(a), y+3, Math.max(1,X(b)-X(a)), h-6); c.globalAlpha=1;
      if (cycPx > 1.2){
        for (const bt of tx.bits){ const ta=bt.c*TCY; if (ta<t0-5*TCY||ta>t1) continue;
          c.fillStyle = bt.o? (phantom?css('--warn'):css('--ink')) : css('--bad');
          c.fillRect(X(ta), y+4, Math.max(1,cycPx), h*0.35);                                      // CCLK high pulse (1 Tcy)
          if (cycPx>3){ c.fillStyle = bt.v? css('--accent') : css('--grid'); c.fillRect(X(ta-2*TCY), y+h*0.55, cycPx*4.6, h*0.3); }
          if (cycPx>9){ c.fillStyle=css('--ink'); c.font='9px '+css('--mono'); c.fillText(bt.v, X(ta-TCY), y+h-4); } }
      }
      if (X(b)-X(a) > 90){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`${tx.name} · ${tx.cs} · ${tx.bytes.map(hex2).join(' ').slice(0,60)}`, Math.max(X(a),X(t0))+3, y+12); }
    }
  }
}

/* ---------------- AES3 frame at the playhead ---------------- */
function aesFrame(t){
  const fs = D.src.fs, n = Math.floor(t*fs), fr = ((n%192)+192)%192, out=[];
  for (const side of [0,1]){
    const a = Math.pow(10,(side?D.src.lvlR:D.src.lvlL)/20), f = side?D.src.fR:D.src.fL;
    const v = a*Math.sin(2*Math.PI*f*n/fs); let s = Math.round(v*8388607); if (s<0) s += 1<<24;
    const bits = new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
    const cs0 = fs===48000?0x85: fs===44100?0x45: 0xC5; bits[30] = fr<8? (cs0>>fr)&1 : 0;
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side?'Y':(fr===0?'Z':'X'), bits, v, raw:s});
  }
  return {n, fr, sub:out};
}
function biphase(pre, bits, start){
  const P = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv = P.map(b=> start? 1-b : b); let cur = lv[7];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); }
  return lv;
}
function drawScope(cv, el, t){
  const {c,w} = SIM.canvas(cv, 140); const o = aesOut(t);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  if (!o.ok){ c.strokeStyle=SIM.css('--bad'); c.lineWidth=1.5; c.beginPath(); c.moveTo(10,80); c.lineTo(w-10,80); c.stroke(); c.fillStyle=ink; c.font='12px sans-serif'; c.fillText('AES OUT1: '+o.why, 12, 40); el.innerHTML=''; return; }
  const F = aesFrame(t); const lvA = biphase(F.sub[0].pre, F.sub[0].bits, 0), lvB = biphase('Y', F.sub[1].bits, lvA[lvA.length-1]);
  const lv = lvA.concat(lvB), cw=(w-20)/lv.length;
  [0,64].forEach(off=>[[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio'],[56,64,a2,'VUCP']].forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,18,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>26) c.fillText(lb, 12+(off+a)*cw, 102); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?28:78; i?c.lineTo(x,yy):c.moveTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 of block · bit cell ${SIM.fmtDur(1/(D.src.fs*128))} · ≈1.25 V p-p into 75 Ω`, 10, 124);
  el.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'} (${s.pre}) ${s.v.toFixed(4)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} · V U C P = ${s.bits[28]} ${s.bits[29]} ${s.bits[30]} ${s.bits[31]}`).join('<br>')+
    `<br><span class="muted">The CS8427 retransmits what it receives (TXD = AES3 receiver), so channel status is the source's; the source here sends professional byte 0 = 0x${D.src.fs===48000?'85':D.src.fs===44100?'45':'C5'} (${inf}).</span>`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function controlsHTML(){
  return `<div class="d8a-ctl" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:8px">
    <label class="small">Board <select data-c="issue"><option value="ISS1" ${D.issue==='ISS1'?'selected':''}>ISS1 · PIC16F874 + DIP (runs v100.asm)</option><option value="ISS3" ${D.issue==='ISS3'?'selected':''}>ISS3 · PIC16C54, shipping (code missing)</option></select></label>
    <label class="small">Rear <select data-c="rear"><option ${D.rear==='BNC2'?'selected':''}>BNC2</option><option ${D.rear==='BNC4'?'selected':''}>BNC4</option></select></label>
    <button data-c="plug">${D.src.on?'Unplug INPUT':'Plug in INPUT'}</button>
    <button data-c="eq" class="${D.eq?'on':''}">EQ ${D.eq?'on':'off'}</button>
    <button data-c="h1">H1: ${D.h1==='analog'?'1-2 analog':'2-3 alarm'}</button>
    <button data-c="drop">Inject 2 ms dropout</button><button data-c="clr">Clear dropouts</button>
    <button data-c="pwr">${D.power?'Pull card':'Insert card'}</button><button data-c="rst">Factory defaults</button>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px" class="small">
    <label>Cable <input type="range" data-c="cable" min="0" max="8000" step="50" value="${D.cable}" style="width:150px"> <b class="mono">${D.cable} ft (${Math.round(D.cable*0.3048)} m)</b></label>
    <label>fs <select data-c="fs">${[32000,44100,48000].map(f=>`<option value="${f}" ${f===D.src.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
    <label>Tone L (1 kHz) <input type="number" data-c="lvlL" min="-60" max="0" step="1" value="${D.src.lvlL}" style="width:62px"> dBFS</label>
    <label>Tone R (400 Hz) <input type="number" data-c="lvlR" min="-60" max="0" step="1" value="${D.src.lvlR}" style="width:62px"> dBFS</label>
  </div>
  <div class="small muted" style="margin-top:4px">Keys: 1–8 DIP switches · Q EQ · I input · D dropout · J jumper H1 · A/Z CHA trim · S/X CHB trim. Click a trim's right half to turn it clockwise (louder), its left half counter-clockwise; the mouse wheel works too.</div>`;
}
function bindControls(root){
  const q = s=>root.querySelectorAll(s);
  q('[data-c]').forEach(el=>{ const c=el.dataset.c;
    const map = {plug:()=>A.plug(!D.src.on), eq:()=>A.eq(), h1:()=>A.h1(), drop:()=>A.drop(), clr:()=>A.clearDrops(), pwr:()=>A.power(), rst:()=>A.reset()};
    if (map[c]) el.onclick = map[c];
    if (c==='issue') el.onchange = e=>A.setIssue(e.target.value);
    if (c==='rear') el.onchange = e=>{ D.rear=e.target.value; SIM.refresh(); };
    if (c==='cable') el.oninput = e=>A.cable(+e.target.value);
    if (c==='fs') el.onchange = e=>{ D.src.fs=+e.target.value; SIM.refresh(); };
    if (c==='lvlL'||c==='lvlR') el.onchange = e=>{ D.src[c]=Math.max(-60,Math.min(0,+e.target.value)); SIM.refresh(); };
  });
}
function renderControls(root){ const el=root.querySelector('#ctl'); if (!el) return; const f=document.activeElement; if (f && el.contains(f) && f.matches('input,select')) return; el.innerHTML=controlsHTML(); bindControls(el); }
function boardSVG(t, opts){ return D.issue==='ISS1'? iss1SVG(t) : cardSVG(t, opts); }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press EQ, flip a DIP switch, turn a trim or unplug the input. Each step the hardware and the firmware take is listed here.</div>'; }
function stepAt(t){ const c = ((t/TCY)%PASS_CYC+PASS_CYC)%PASS_CYC; let k=0; STEPS.forEach((s,i)=>{ if (c>=OFF[s[0]]) k=i; }); return {k, c:Math.floor(c), pass:Math.floor(t/PASS)}; }

function viewSim(m){
  window.__d8204aActive = true;
  m.innerHTML = `
  ${card('The card at the playhead — click the EQ button, trims, jumper H1 and (ISS1) the DIP switch', `<div id="brd"></div><div id="ctl"></div>`)}
  <div class="grid2">
    <div>${card('Rear module and front edge', `<div style="display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:10px;align-items:start"><div id="rp"></div><div id="edge"></div></div>`)}</div>
    <div>${card('What the hardware and firmware did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">Pass length is counted instruction by instruction from v100.asm (6303 cycles) at the ISS1 crystal, 4.9152 MHz. Zoom to “1 pass” and then “50 µs” to see each SPI bit: dark ticks are CCLK pulses (one 814 ns instruction wide), the bar under them is CDIN. Orange bursts go to the second receiver that is not on the board. The cable/EQ model, the PLL re-acquire time and the ISS3 behaviour are ${inf}.</p>`)}
  <div class="grid2">${card('Scope: AES OUT1 at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw = ()=>{
    const t = SIM.t, L = link(), st = stepAt(t), Lf = leds(t), o = aesOut(t), R = dacRegs(), A0 = chanOut(0), B0 = chanOut(1);
    m.querySelector('#brd').innerHTML = boardSVG(t); bindPanel(m.querySelector('#brd'));
    renderControls(m);
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#edge').innerHTML = edgeSVG(t); bindPanel(m.querySelector('#edge'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = `<table class="kv">
      <tr><th>Input / cable</th><td class="mono">${D.src.on?D.src.fs/1000+' kHz':'none'} · ${D.cable} ft · loss ${L.lossHi.toFixed(1)} dB at ${(64*D.src.fs/1e6).toFixed(2)} MHz · EQ ${D.eq?'+'+L.boost.toFixed(1)+' dB':'off'}</td></tr>
      <tr><th>RXP swing (model)</th><td class="mono">${L.amp.toFixed(3)} V p-p · eye ratio ${L.r.toFixed(2)} → ${L.ok?(L.conf?'<span style="color:var(--warn)">marginal (CONF)</span>':'clean'):'<b style="color:var(--bad)">cannot lock</b>'} ${inf}</td></tr>
      <tr><th>CS8427</th><td class="mono">${pll(t)?'locked':'<b style="color:var(--bad)">unlocked</b>'} · TX ${txOn(t)?'on (reg 3 = 0x95)':'TXOFF (reg 3 = 0xD5)'}</td></tr>
      ${D.issue==='ISS1'? `<tr><th>PIC pass / step</th><td class="mono">#${st.pass} · ${STEPS[st.k][0]} (cycle ${st.c}/6303) · lock_8420 = ${fwLock(passOf(t,READ_OFF))?'xxxxxxx1':'xxxxxxx0'}</td></tr>
      <tr><th>dip_switch</th><td class="mono">${bin8(R.dsw)}b → ${R.ref[0]} · ${R.route[0]}</td></tr>
      <tr><th>CS4392 regs 1–6</th><td class="mono">${[FW.r4392[1],R.reg2,R.reg3,R.reg4,FW.r4392[5],FW.r4392[6]].map(hex2).join(' ')}</td></tr>` : `<tr><th>PIC16C54</th><td class="mono">code not archived · RB3 MUTEDAC = ${pll(t)?0:1} ${inf}</td></tr>`}
      <tr><th>LEDs</th><td class="mono">${D.issue==='ISS1'? `LOCK ${Lf.sig?'●':'○'} · NO LOCK ${Lf.err?'●':'○'} · EQ ${Lf.eq?'●':'○'}` : `SIGNAL ${Lf.sig?'●':'○'} · CONF ${Lf.conf?'●':'○'} · ERROR ${Lf.err?'●':'○'} · EQ ${Lf.eq?'●':'○'}`}</td></tr>
      <tr><th>AES OUT1–4</th><td class="mono">${o.ok?'running':'<b style="color:var(--bad)">'+o.why+'</b>'}</td></tr>
      <tr><th>Analog L (A1, A2)</th><td class="mono">${A0.src} · ${A0.mute?'muted':fmtDb(A0.dBu,'dBu')}${A0.clip?' <b style="color:var(--bad)">CLIPS</b>':''}</td></tr>
      <tr><th>Analog R (B1, B2)</th><td class="mono">${B0.src} · ${B0.mute?'muted':fmtDb(B0.dBu,'dBu')}${D.h1==='alarm'?' (B2+ = alarm)':''}${B0.clip?' <b style="color:var(--bad)">CLIPS</b>':''}</td></tr>
    </table>`;
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (D8204AMN Issue3.doc + D8204AMN_UPDATE.wpd) ---------------- */
const LESSONS = [
  { title:'Meet the D8204A', body:`<p>The D8204A is a card for a Ward-Beck <b>MF82</b> frame. It takes one <b>AES/EBU</b> digital audio signal on 75 Ω coax and gives you <b>four</b> re-timed digital copies plus <b>two balanced analog stereo pairs</b> from a built-in D/A converter.</p>
     <p>On the front edge: a <b>cable-EQ push button</b> and status LEDs. On the board: two trimpots, <b>CHA</b> and <b>CHB</b>, for the analog level. The first board (ISS1) also has an 8-way <b>DIP switch</b> for the analog reference level and routing. The rear module (BNC2 or BNC4) carries the BNCs and screw terminals.</p>
     <p class="muted">This tutorial follows the June 2005 manual (ISS1, DIP switch) and the 2006 Issue 3 manual. Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Connect the input', body:`<p>Click the <b>INPUT</b> BNC on the rear module (or press <b>I</b>). The receiver locks within a few milliseconds and the green <b>LOCK</b> LED lights. Red <b>NO LOCK</b> means no signal, or a signal it cannot recover.</p><p><b>Goal:</b> input connected and the green LED on.</p>`, check:()=>D.src.on && leds(SIM.t).sig, hint:'Click the INPUT BNC on the rear module.' },
  { title:'2 · Long cable: switch on the EQ', body:`<p>The card recovers AES over about <b>600 m (2000 ft)</b> of coax without help. Drag the <b>Cable</b> slider to <b>4500 ft</b>. Watch the red LED (and on ISS3 the yellow CONF LED).</p><p>Then press the <b>EQ</b> button on the front edge (or <b>Q</b>). The yellow EQ LED lights and the receiver locks again. The EQ is pure hardware: one pole of the switch adds an RC network to the input amplifier.</p><p><b>Goal:</b> cable ≥ 4000 ft, EQ on, locked.</p>`, check:()=>D.cable>=4000 && D.eq && pll(SIM.t), hint:'Cable slider to 4500 ft, then click the EQ button.' },
  { title:'3 · Set the analog reference level (ISS1)', body:`<p>From the factory, a <b>−20 dBFS</b> tone gives <b>+4 dBu</b> at the analog outputs. If your plant uses −10 dBFS as its reference, set <b>SW8 SW7 SW6 = 1 0 1</b> on the DIP switch (keys <b>8</b> and <b>6</b>). The firmware reads the switches every pass and writes 10 dB of attenuation into the DAC.</p><p><b>Goal:</b> board ISS1, reference −10 dBFS.</p>`, check:()=>D.issue==='ISS1' && dacRegs().ri===5, hint:'Board = ISS1, then switches #8 and #6 ON (#7 OFF).' },
  { title:'4 · Route the left output (ISS1)', body:`<p>Switches <b>SW5 SW4</b> choose what the left analog output carries: 00 input left, 01 input right, 10 mono (L+R)/2, 11 mute. <b>SW3 SW2</b> do the same for the right output.</p><p><b>Goal:</b> left output = mono (SW5 ON, SW4 OFF).</p>`, check:()=>D.issue==='ISS1' && chanOut(0).l && chanOut(0).r, hint:'Press 5 (and make sure 4 is OFF).' },
  { title:'5 · Trim the level', body:`<p>Put the reference back to −20 dBFS (switches 6, 7, 8 OFF). Now set the <b>right</b> outputs to a house level of <b>+6 dBu</b> for the −20 dBFS tone with the <b>CHB</b> trimpot (click it, use the wheel, or <b>S/X</b>).</p><p><b>Goal:</b> R OUT within ±0.5 dB of +6 dBu.</p>`, check:()=>{ const c=chanOut(1); return !c.mute && Math.abs(c.dBu-6)<=0.5; }, hint:'Clockwise (right half of the CHB trim, or S) raises the level.' },
  { title:'6 · Use the alarm output', body:`<p>Jumper <b>H1</b> turns the R OUT2+ screw terminal into an <b>open-collector alarm</b> that pulls low when the receiver is not locked. Click H1 on the card (or <b>J</b>), then unplug the input.</p><p><b>Goal:</b> H1 on alarm and the alarm active.</p>`, check:()=>D.h1==='alarm' && leds(SIM.t).alarm, hint:'Click H1 near the edge connector, then click the INPUT BNC.' },
  { title:'7 · Watch a glitch pass through the firmware', body:`<p>Plug the input back in, choose board <b>ISS1</b>, and set the zoom to <b>50 ms</b>. Press <b>Inject 2 ms dropout</b>. Then scrub forward.</p><p>The receiver latches an UNLOCK error. On the next pass the PIC reads it, lights the red LED and sets <span class="mono">cs8420reg13 = 0xD5</span>. One pass later that byte reaches the CS8427 and switches the four digital outputs off (TXOFF) until the input has been clean for a whole pass.</p><p><b>Goal:</b> a dropout injected with the input connected.</p>`, check:()=>D.drops.length>0 && D.src.on, hint:'Click “Inject 2 ms dropout”.' },
  { title:'Done', body:`<p>You have used every control on the D8204A. <b>Software</b> shows the main loop and the registers live; <b>One second</b> breaks the second down from AES bit cells to PIC passes; <b>Findings</b> lists what the firmware and documents are really up to.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__d8204aActive = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating the D8204A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What happened', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The card', `<div id="brd"></div><div id="ctl"></div>`)}${card('Rear module · front edge', `<div style="display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:10px"><div id="rp"></div><div id="edge"></div></div>`)}</div></div>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#brd').innerHTML = boardSVG(t); bindPanel(m.querySelector('#brd')); renderControls(m);
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#edge').innerHTML = edgeSVG(t); bindPanel(m.querySelector('#edge'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, broken down ---------------- */
function viewSecond(m){
  window.__d8204aActive = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device at the playhead', `<div id="dev"></div>`)}
    ${card('As seen by the displays: the front-edge LEDs and a meter on each analog output', `<div style="display:grid;grid-template-columns:130px minmax(0,1fr);gap:10px;align-items:start"><div id="edge"></div><canvas id="meter"></canvas></div><p class="small muted">The meters show the steady output level in dBu (−20 … +30); red beyond about +30.5 dBu, where the NE5532s on the unregulated ±VA rails (≈ ±21 V from V± through D3/D4) run out of swing ${inf}.</p>`)}</div>
  ${card('Zoom ladder at the playhead: 1 s → one pass → one SPI byte → one AES frame', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t=SIM.t, fs=D.src.fs, st=stepAt(t);
    const rows = [
      ['AES3 blocks (192 frames, Z preamble)', (fs/192).toFixed(2), SIM.fmtDur(192/fs), 'CS8427 receiver; channel status passes through'],
      ['AES3 frames = samples per channel', fs.toLocaleString(), SIM.fmtDur(1/fs), 'OLRCK to the DAC; one frame per output on all four BNCs'],
      ['AES3 bit cells (biphase)', (128*fs).toLocaleString(), SIM.fmtDur(1/fs/128), `${(64*fs/1e6).toFixed(3)} MHz top tone — the frequency the cable and EQ model uses`],
      ['RMCK (256 fs) to the DAC MCLK', (256*fs).toLocaleString(), SIM.fmtDur(1/fs/256), 'Recovered master clock, CS8427 pin 10 → DAC MCLK'],
      ['OSCLK (64 fs) bit clock', (64*fs).toLocaleString(), SIM.fmtDur(1/fs/64), 'reg 6 = 0x82 → serial out master (SOMS), 64 fs (SOSF=0) per the CS8420 map '+inf],
      ['PIC instruction cycles', Math.round(1/TCY).toLocaleString(), SIM.fmtDur(TCY), '4.9152 MHz crystal ÷ 4 (the .pjt simulator setting says 4 MHz)'],
      ['Main-loop passes', (1/PASS).toFixed(1), SIM.fmtDur(PASS), '6303 cycles; 61 % of it is the pdelay loop'],
      ['SPI clocks to the CS8427 bus', Math.round(366/PASS).toLocaleString(), '', '366 CCLK per pass: 160 + 160 (phantom) + 46'],
      ['SPI clocks to the CS4392', Math.round(64/PASS).toLocaleString(), '', '8 bytes per pass: the DAC is rewritten ≈195 times a second'],
      ['Lock checks (reg 16 reads)', (1/PASS).toFixed(1), SIM.fmtDur(PASS), 'Worst-case LED reaction ≈ 1 pass; TXOFF reaction ≈ 2 passes'],
      ['Tone cycles L / R', `${D.src.fL} / ${D.src.fR}`, `${SIM.fmtDur(1/D.src.fL)} / ${SIM.fmtDur(1/D.src.fR)}`, `${(fs/D.src.fL).toFixed(1)} / ${(fs/D.src.fR).toFixed(1)} samples per cycle (test source, ${inf})`],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one pass, one SPI byte or one AES frame at a time.</p>`;
    const F = aesFrame(t), o = aesOut(t);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>Input</th><td class="mono">${present(t)? `frame ${F.n.toLocaleString()} (${F.fr}/191) · L ${F.sub[0].v.toFixed(4)} R ${F.sub[1].v.toFixed(4)}` : 'nothing on the wire'}</td></tr>
      <tr><th>CS8427</th><td class="mono">${pll(t)?'locked, retransmitting':'unlocked'} · ${txOn(t)?'TX on':'TXOFF'}</td></tr>
      <tr><th>PIC16F874</th><td class="mono">${D.issue==='ISS1'? `pass #${st.pass} · ${STEPS[st.k][0]} @ 0x${(ADDR[STEPS[st.k][0]]||ADDR[STEPS[st.k][0].toLowerCase()]||ADDR.MAIN).toString(16).padStart(3,'0')}<br><span class="muted">${STEPS[st.k][2]}</span>` : 'ISS3: PIC16C54, program not archived'}</td></tr>
      <tr><th>AES OUT1–4</th><td class="mono">${o.ok?'frame '+F.n.toLocaleString():o.why}</td></tr>
      <tr><th>DAC</th><td class="mono">${analogLive(t)? `A = ${chanOut(0).src}, B = ${chanOut(1).src}` : 'no clocks'}</td></tr></table>`;
    m.querySelector('#edge').innerHTML = edgeSVG(t); bindPanel(m.querySelector('#edge'));
    // meters
    { const {c,w} = SIM.canvas(m.querySelector('#meter'), 150); const outs=[['L OUT1',0],['L OUT2',0],['R OUT1',1],['R OUT2',1]];
      const x0=70, x1=w-10, X=v=>x0+(v+20)/50*(x1-x0);
      c.font='11px '+SIM.css('--mono'); c.fillStyle=SIM.css('--ink2'); for (let v=-20; v<=30; v+=10){ c.fillText((v>0?'+':'')+v, X(v)-8, 146); c.fillRect(X(v),8,1,128); }
      outs.forEach(([nm,sd],i)=>{ const ch=chanOut(sd), y=12+i*32; c.fillStyle=SIM.css('--ink'); c.fillText(nm, 4, y+15);
        const alarm = nm==='R OUT2' && D.h1==='alarm'; c.fillStyle=SIM.css('--chip'); c.fillRect(x0,y,x1-x0,20);
        if (alarm){ c.fillStyle=SIM.css('--warn'); c.fillText(leds(t).alarm?'ALARM low (unlocked)':'ALARM open (locked) — B2+ is the tally', x0+6, y+15); return; }
        if (!analogLive(t) || ch.mute){ c.fillStyle=SIM.css('--ink2'); c.fillText(analogLive(t)?'muted':'silent', x0+6, y+15); return; }
        const v=Math.max(-20,Math.min(30,ch.dBu)); c.fillStyle = ch.clip? SIM.css('--bad') : ch.dBu>24? SIM.css('--warn') : SIM.css('--accent'); c.fillRect(x0,y,X(v)-x0,20);
        c.fillStyle=SIM.css('--ink'); c.fillText(fmtDb(ch.dBu,'dBu'), X(v)+4>x1-70? X(v)-70 : X(v)+4, y+15); }); }
    // zoom ladder
    { const {c,w} = SIM.canvas(m.querySelector('#zl'), 190); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
      const rowsZ = [ ['1 s', 0, 1], ['1 pass', Math.floor(t/PASS)*PASS, PASS], ['REFRESH8420_1', Math.floor(t/PASS)*PASS+OFF.REFRESH8420_1*TCY, 863*TCY], ['1 SPI byte (46 cycles)', Math.floor(t/PASS)*PASS+(OFF.REFRESH8420_1+3)*TCY, 46*TCY], ['1 AES frame', Math.floor(t*fs)/fs, 1/fs] ];
      rowsZ.forEach(([nm,a,d],i)=>{ const y=10+i*36; c.fillStyle=ink; c.font='11px sans-serif'; c.fillText(nm, 6, y+14); c.fillStyle=ink2; c.fillText(SIM.fmtDur(d), 6, y+27);
        c.fillStyle=SIM.css('--chip'); c.fillRect(150,y,w-160,24); const px = 150 + (t-a)/d*(w-160);
        if (i===1){ STEPS.forEach(s=>{ const xa=150+OFF[s[0]]/PASS_CYC*(w-160), xb=150+(OFF[s[0]]+s[1])/PASS_CYC*(w-160); c.fillStyle= s[3]==='d'? SIM.css('--grid') : s[3]==='p'? SIM.css('--warn') : s[3]==='c'? '#8a5cc2' : SIM.css('--accent2'); c.fillRect(xa,y+2,xb-xa-1,20); }); }
        if (i===3){ for (let k=0;k<8;k++){ const xa=150+(4+k*5+3)/46*(w-160); c.fillStyle=ink; c.fillRect(xa,y+3,Math.max(1,(w-160)/46),9); c.fillStyle=((0x20>>(7-k))&1)?SIM.css('--accent'):SIM.css('--grid'); c.fillRect(150+(4+k*5)/46*(w-160),y+14,(w-160)*5/46-1,8); } c.fillStyle=ink2; c.fillText('first byte 0x20 = chip address 0010000 + write', w-280, y+36); }
        if (i===4){ c.fillStyle=SIM.css('--accent'); c.globalAlpha=.4; c.fillRect(150,y,(w-160)/2,24); c.globalAlpha=.25; c.fillRect(150+(w-160)/2,y,(w-160)/2,24); c.globalAlpha=1; c.fillStyle=ink; c.fillText('subframe A (L)', 156, y+16); c.fillText('subframe B (R)', 156+(w-160)/2, y+16); }
        if (px>=150 && px<=w-10){ c.fillStyle=SIM.css('--play'); c.fillRect(px-1,y-2,2,28); } }); }
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  in:   {x:20,y:150,w:110,h:56, t:'INPUT', s:'P1 A / 1 → C16', d:'Edge pins A and 1 (P1.1/P1.2). BNC on the BNC2/BNC4 rear module. 75 Ω (R9 on the transformer secondary). Spec: 0.2–7 V p-p, 30–50 kHz.'},
  t1:   {x:160,y:150,w:110,h:56, t:'T1 PE-65612', s:'AES pulse transformer', d:'Isolates the coax. Secondary: R9 75R to ground, R10 110R in series to U1A +; D1/D2 (4148 pair) clamp to the rails.'},
  u1a:  {x:300,y:150,w:110,h:56, t:'U1A EL5263', s:'×2 buffer', d:'Non-inverting, gain 1 + R4/R1 = 1 + 750/750 = 2. Output to R30 110R.'},
  eq:   {x:300,y:250,w:110,h:56, t:'SW1 + RC', s:'cable EQ', d:'SW1 PH2AU joins NET00067 to NET00103: R13 330R + C9 1000p and R19 110R + C15 220p in parallel with R5 750R. R17/C14 are a third, unpopulated (DNI) section.'},
  u1b:  {x:440,y:150,w:110,h:56, t:'U1B EL5263', s:'EQ stage, inverting', d:'Feedback R3 750R. Flat gain 750/(110+750) = −1.2 dB; with EQ ≈ +10 dB at 3 MHz. Output via R31 110R and C10 to RXP.'},
  rx:   {x:580,y:150,w:130,h:56, t:'U3 CS8427', s:'AES3 RX → TX reclock', d:'Software mode (H/S to ground). RXP/RXN in, TXP out. reg 3 = 0x95: TX data from the AES3 receiver; reg 4 = 0x49: RUN, output time base = recovered clock; reg 6 = 0x82: serial output master. RMCK, OSCLK, OLRCK, SDOUT to the DAC; RERR (pin 11) error output.'},
  drv:  {x:760,y:70,w:130,h:56, t:'U2 EL5263', s:'4 × 75 Ω drivers', d:'TXP → R11/R12 750R divider → both halves of U2 as followers → R7/R8/R15/R16 75R → OUT1–OUT4 (pins D, E, F, H). U4 + R18/20/21/27 + R22/24/28/29 (all DNI) would put four more AES outputs on the analog pins.'},
  out:  {x:920,y:70,w:110,h:56, t:'OUT1–4', s:'pins D E F H', d:'≈1.25 V p-p into 75 Ω (2.5 V p-p after the divider, halved by the 75R back-match; assumes a 5 V TXP swing — inferred). Spec: 1 V p-p terminated.'},
  dac:  {x:760,y:220,w:130,h:56, t:'DAC', s:'ISS1 CS4392 · ISS3 CS4390', d:'ISS1: CS4392 in control-port mode (M0/M1/M2 = CS/CDIN/CCLK from RD0/RD2/RD1): volume, ATAPI routing. ISS3: CS4390, hardware mode — DIF1/DIF0 and DEM1/DEM0 tied high, DIF2 low, MUTEL/MUTER from PIC RB3 (MUTEDAC).'},
  ana:  {x:920,y:220,w:130,h:56, t:'U5/U8 → U6/U9', s:'diff-amp, filter, trim', d:'U5/U8: differential → single-ended with a 2-pole filter (C29/C31 1000p, C30/C33 220p). RV1/RV2 + R47/R64 4K7 into U6/U9 with R40/R57 20K0 feedback: −1.8 … +12.6 dB.'},
  bal:  {x:1080,y:220,w:110,h:56, t:'U6/U11 · U9/U12', s:'2 balanced pairs', d:'Inverter + followers give A1±, A2±, B1±, B2± through 30R per leg (60 Ω balanced). B2+ goes through jumper H1.'},
  mcu:  {x:580,y:320,w:130,h:56, t:'PIC', s:'ISS1 16F874 · ISS3 16C54', d:'ISS1: v100.asm — bit-banged SPI to the CS8427 (RC0–RC4, RC7 reset) and CS4392 (RD0–RD2), DIP on RA0–RA5/RE0/RE1, LEDs RD7/RB0, tally RC6. ISS3: PIC16C54 on RA0–RA3/RB1–RB7; code missing.'},
  dip:  {x:420,y:350,w:120,h:46, t:'SW2 DIP ×8', s:'ISS1 only', d:'Reference level (#6–#8), left routing (#4, #5), right routing (#2, #3), #1 reserved. External pull-ups R20/R21/R27/R36/R37/R38/R78/R79 4K7.'},
  led:  {x:760,y:330,w:130,h:46, t:'LEDs', s:'front edge', d:'ISS1: L4 green (RD7), L3 red (RB0), EQ yellow (SW1). ISS3: SIGNAL (RB6), CONF (RB5), ERROR (RB4), EQ. All 330R.'},
  alm:  {x:920,y:330,w:130,h:46, t:'Q1 + H1', s:'NO-LOCK tally', d:'Q1 4401: ISS1 base from RC6 (R29 4K7), ISS3 from RB7 (R37 4K7). Collector via R36 10R to H1 pin 3; H1 pin 2 = edge pin M. Spec: 10 Ω, 60 mA, 30 V.'},
  pwr:  {x:20,y:330,w:130,h:66, t:'Power', s:'±22 V from the frame', d:'V+ (pins S/15) → F2 RXE050 → LM2596 switcher + PE-53823 → +5 V (L2/L3 ferrites → +5V, +5VA); V+ → D4 → R35 2R2 → +VA ≈ +21 V for the NE5532s; V− (P/13) → F1 → D3 → −VA; 79L05 → −5 V for the EL5263s; MC34164 reset on the PIC.'},
};
const LINKS = [['in','t1'],['t1','u1a'],['u1a','u1b'],['u1a','eq'],['eq','u1b'],['u1b','rx'],['rx','drv'],['drv','out'],['rx','dac'],['dac','ana'],['ana','bal'],['mcu','rx'],['mcu','dac'],['dip','mcu'],['mcu','led'],['mcu','alm']];
let blockSel = 'rx';
function viewBlock(m){
  window.__d8204aActive = false;
  m.innerHTML = `<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div><p class="small muted">Redrawn from d8204A-ISS3.net and d8204A-ISS1.net (net and pin names as in the netlists). Live colours follow the playhead: green = signal present.</p>`)}${card('Selected block', `<div id="bs"></div>`)}</div>`;
  const draw = ()=>{
    const t=SIM.t, lk=pll(t), o=aesOut(t);
    const live = {in:present(t), t1:present(t), u1a:present(t), u1b:present(t), eq:D.eq, rx:lk, drv:o.ok, out:o.ok, dac:analogLive(t), ana:analogLive(t), bal:analogLive(t), mcu:D.power, dip:D.issue==='ISS1', led:D.power, alm:leds(t).alarm, pwr:D.power};
    let s = `<svg viewBox="0 0 1210 410" style="width:100%" role="img" aria-label="D8204A block diagram"><defs><marker id="d8aar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink2)"/></marker></defs>`;
    LINKS.forEach(([a,b])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; const x1=A_.x+A_.w/2, y1=A_.y+A_.h/2, x2=B_.x+B_.w/2, y2=B_.y+B_.h/2;
      const dx=x2-x1, dy=y2-y1; const k = Math.min(Math.abs(B_.w/2/(dx||1e-9)), Math.abs(B_.h/2/(dy||1e-9)));
      s += `<line x1="${x1}" y1="${y1}" x2="${x2-dx*k}" y2="${y2-dy*k}" stroke="var(--ink2)" stroke-width="1.6" marker-end="url(#d8aar)"/>`; });
    for (const [k,b] of Object.entries(BLOCKS)){
      const dim = (k==='dip' && D.issue!=='ISS1');
      s += `<g class="d8a-blk" data-k="${k}" style="cursor:pointer" opacity="${dim?.45:1}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${blockSel===k?'color-mix(in srgb,var(--accent) 25%,var(--panel))':'var(--panel2)'}" stroke="${live[k]?'var(--accent)':'var(--line)'}" stroke-width="${live[k]?2.5:1.2}"/>
        <text x="${b.x+b.w/2}" y="${b.y+22}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text><text x="${b.x+b.w/2}" y="${b.y+39}" text-anchor="middle" font-size="11" fill="var(--ink2)">${b.s}</text></g>`;
    }
    s += `<text x="20" y="30" font-size="12" fill="var(--ink2)">Signal flows left → right. The PIC only configures and watches; audio never passes through it.</text></svg>`;
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('.d8a-blk').forEach(g=>g.onclick=()=>{ blockSel=g.dataset.k; draw(); });
    const b = BLOCKS[blockSel];
    m.querySelector('#bs').innerHTML = `<h3>${b.t} — ${b.s}</h3><p>${b.d}</p><p class="small muted">Live: ${live[blockSel]?'active':'idle'} at ${SIM.fmtT(t)}.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
let schSel = 0;
function viewSchem(m){
  window.__d8204aActive = false;
  const sheets = ['1 · Input, transformer and cable EQ','2 · Receiver, PIC and DAC (pin map)','3 · Analog channel A (B is identical)','4 · Edge connector P1 and outputs','5 · Power'];
  m.innerHTML = `${card('Schematic set — redrawn from the P-CAD netlists, not the original CAD drawings', `<div style="display:flex;flex-wrap:wrap;gap:6px">${sheets.map((s,i)=>`<button data-i="${i}" class="${i===schSel?'on':''}">${s}</button>`).join('')}</div>`)}<div id="sh"></div>`;
  m.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{ schSel=+b.dataset.i; m.querySelectorAll('button[data-i]').forEach(x=>x.classList.toggle('on', +x.dataset.i===schSel)); draw(); });
  const sh = m.querySelector('#sh');
  const W = (x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)" stroke-width="1.5"/>`;
  const Rr = (x,y,lab,vert)=> vert? `<rect x="${x-6}" y="${y}" width="12" height="34" fill="none" stroke="var(--ink)" stroke-width="1.5"/><text x="${x+10}" y="${y+21}" font-size="11" fill="var(--ink)">${lab}</text>` : `<rect x="${x}" y="${y-6}" width="34" height="12" fill="none" stroke="var(--ink)" stroke-width="1.5"/><text x="${x+17}" y="${y-10}" font-size="11" text-anchor="middle" fill="var(--ink)">${lab}</text>`;
  const Cc = (x,y,lab)=>`<line x1="${x}" y1="${y-8}" x2="${x}" y2="${y+8}" stroke="var(--ink)" stroke-width="2"/><line x1="${x+6}" y1="${y-8}" x2="${x+6}" y2="${y+8}" stroke="var(--ink)" stroke-width="2"/><text x="${x+3}" y="${y-12}" font-size="11" text-anchor="middle" fill="var(--ink)">${lab}</text>`;
  const Op = (x,y,lab,inv)=>`<path d="M${x} ${y-30} L${x} ${y+30} L${x+60} ${y} Z" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.5"/><text x="${x+6}" y="${y-12}" font-size="12" fill="var(--ink)">${inv?'+':'−'}</text><text x="${x+6}" y="${y+18}" font-size="12" fill="var(--ink)">${inv?'−':'+'}</text><text x="${x+30}" y="${y+46}" font-size="11" text-anchor="middle" fill="var(--ink2)">${lab}</text>`;
  const G = (x,y)=>`<path d="M${x-8} ${y} H${x+8} M${x-5} ${y+4} H${x+5} M${x-2} ${y+8} H${x+2}" stroke="var(--ink)" stroke-width="1.5"/>`;
  const T = (x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" fill="${(o&&o.c)||'var(--ink)'}" ${o&&o.a?`text-anchor="${o.a}"`:''} ${o&&o.m?'font-family="var(--mono)"':''}>${s}</text>`;
  const draw = ()=>{
    let s = '';
    if (schSel===0){
      s = `<div class="grid2">${card('Sheet 1 — input and EQ (redrawn from d8204A-ISS3.net)', `<svg viewBox="0 0 760 360" style="width:100%" role="img" aria-label="Input and EQ schematic">
        ${T(20,40,'P1.1 (A)',{m:1})}${T(20,90,'P1.2 (1) IN+',{m:1})}${W(90,36,130,36)}${W(110,86,130,86)}${Cc(112,86,'C16 0.1')}
        <rect x="130" y="26" width="60" height="70" fill="none" stroke="var(--ink)" stroke-width="1.5"/>${T(160,112,'T1 PE-65612',{a:'middle'})}
        <path d="M150 36 q8 8 0 16 q8 8 0 16 q8 8 0 16" fill="none" stroke="var(--ink)"/><path d="M170 36 q-8 8 0 16 q-8 8 0 16 q-8 8 0 16" fill="none" stroke="var(--ink)"/>
        ${W(190,40,240,40)}${Rr(240,40,'R10 110R')}${W(274,40,300,40)}${W(225,40,225,60)}${Rr(225,60,'R9 75R',1)}${G(225,98)}${T(236,112,'D1/D2 4148 clamps',{fs:10,c:'var(--ink2)'})}
        ${W(300,40,300,58)}${Op(300,70,'U1A EL5263 ×2',1)}${W(360,70,400,70)}${W(380,70,380,130)}${Rr(380,130,'R4 750R',1)}${W(380,164,380,180)}${W(300,82,290,82)}${W(290,82,290,180)}${W(290,180,380,180)}${Rr(290,190,'R1 750R',1)}${G(290,228)}
        ${Rr(400,70,'R30 110R')}${W(434,70,470,70)}${T(440,58,'NET00067',{fs:10,c:'var(--ink2)',m:1})}${Rr(470,70,'R5 750R')}${W(504,70,540,70)}
        ${W(450,70,450,150)}<circle cx="450" cy="150" r="3" fill="var(--ink)"/><line x1="450" y1="150" x2="${D.eq?470:476}" y2="${D.eq?150:136}" stroke="${D.eq?'var(--accent)':'var(--ink)'}" stroke-width="2"/><circle cx="470" cy="150" r="3" fill="var(--ink)"/>${T(430,176,'SW1 pole B '+(D.eq?'(EQ ON)':'(off)'),{fs:11,c:D.eq?'var(--accent)':'var(--ink2)'})}
        ${W(470,150,500,150)}${T(478,140,'NET00103',{fs:10,c:'var(--ink2)',m:1})}${W(500,150,500,220)}${W(500,150,520,150)}${Rr(520,150,'R13 330R')}${Cc(578,150,'C9 1000p')}${W(584,150,600,150)}
        ${W(500,220,520,220)}${Rr(520,220,'R19 110R')}${Cc(578,220,'C15 220p')}${W(584,220,600,220)}${W(500,290,520,290)}${Rr(520,290,'R17 DNI')}${Cc(578,290,'C14 DNI')}${W(500,220,500,290)}${W(584,290,600,290)}
        ${W(600,150,600,290)}${W(540,70,600,70)}${W(600,70,600,150)}${T(606,110,'U1.6 (−)',{fs:10,m:1})}
        ${W(600,70,620,70)}${Op(620,82,'U1B EL5263',0)}${W(620,94,610,94)}${W(610,94,610,104)}${G(610,104)}${W(680,82,700,82)}${W(700,82,700,30)}${W(700,30,600,30)}${W(600,30,600,70)}${Rr(630,30,'R3 750R')}
        ${W(700,82,720,82)}${T(706,104,'R31 110R → C10 → RXP (U3.4)',{fs:10,a:'start'})}
        ${T(20,330,'SW1 pole A grounds the EQ LED cathode (R75 330R from +5 V). Values from d8204A-iss3.bom; pin names from the netlist.',{fs:11,c:'var(--ink2)'})}
      </svg>`)}${card('Cable loss vs EQ — computed from these part values', `<canvas id="eqc"></canvas><p class="small muted">Curves: U1B gain with EQ off/on (from R3, R5, R30, R13/C9, R19/C15), and the loss of ${D.cable} ft of coax (√f model, ${inf}). The vertical line is the AES top tone, 64 × fs. The network mostly adds about 11 dB of broadband gain and only about 1.5 dB of tilt across the 1.5–3 MHz band, so it helps more by lifting a weak signal above the receiver threshold than by flattening it.</p>`)}</div>`;
    } else if (schSel===1){
      const iss1 = [['RC7','U3.9 RESET','bsf portc,7 releases reset'],['RC2','U3.2 AD0/CS (CS1)','refresh8420_1 / read8420s'],['RC4','— (CS2, no part)','refresh8420_2: nothing answers'],['RC1','U3.28 CCLK','pbclock macro'],['RC0','U3.27 AD1/CDIN','shiftout'],['RC3','U3.1 SDA/CDOUT','shiftin'],['RD0','U4.10 M0 (CS)','refresh4392'],['RD1','U4.8 M2 (CCLK)','clock4392 macro'],['RD2','U4.9 M1 (CDIN)','shiftout4392'],['RD7','L4 GREEN via R33','REFRESHSTATUS "signal1 lock"'],['RB0','L3 RED via R32','REFRESHSTATUS "signal1 error"'],['RC6','Q1 base via R29 → NO_LOCK','"signal1 error open collector"'],['RA0–RA5, RE0, RE1','SW2 #8…#1','READ_SWITCHES'],['RB6, RB7, RB3, MCLR','H13 (2×3 ICSP header)','PGC, PGD, PGM, VPP'],['OSC0/OSC1','X2 4.9152 MHz','—'],['RB2','— (unconnected)','INIT: bcf portb,2 ;lock']];
      const iss3 = [['RA0','U3.2 AD0/CS (net CS2)','—'],['RA2','U3.28 CCLK (SCK)','—'],['RA3','U3.27 AD1/CDIN (SDO)','—'],['RA1','U3.1 SDA/CDOUT (SDI)','—'],['RB1','U3.9 RESET','—'],['RB2','U3.11 RERR','receiver error input'],['RB3','U7.15/16 MUTER/MUTEL (MUTEDAC)','DAC mute'],['RB4','ERROR red via R34','—'],['RB5','CONF yellow via R33','—'],['RB6','SIGNAL green via R32','—'],['RB7','Q1 base via R37 → ALARM','—'],['OSC1','R25 4K7 / C58 27p (RC oscillator)','—'],['MCLR','U13 MC34164 RES','—']];
      const tb = (rows,h)=>`<table class="kv"><tr><th>PIC pin</th><th>goes to</th><th>${h}</th></tr>${rows.map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</table>`;
      s = `<div class="grid2">${card('Sheet 2a — ISS1: PIC16F874 (U25) pins, from d8204A-ISS1.net, matched to v100.asm', tb(iss1,'used in v100.asm by'))}${card('Sheet 2b — ISS3: PIC16C54 (U10) pins, from d8204A-ISS3.net', tb(iss3,'function')+`<p class="small muted">CS8427 (U3) pins on both issues: RXP 4, RXN 5, VA 6, FILT 8 (R23 4K7 + C20 .068 µF, C17 6800 pF), RMCK 10, OSCLK 16, OLRCLK 17, SDOUT 18, H/S 24 to ground (software mode), TXN 25, TXP 26. ISS3 DAC U7 CS4390: DEM0 1, DEM1 2, DIF1 19, DIF0 20 tied to its VD+ node; DIF2 12 and AMUTE 11 to ground.</p>`)}</div>`;
    } else if (schSel===2){
      s = card('Sheet 3 — analog channel A (redrawn from d8204A-ISS3.net; channel B: U8 → RV2 → U9 → U12, R55–R74)', `<svg viewBox="0 0 1000 330" style="width:100%" role="img" aria-label="Analog channel schematic">
        ${T(10,60,'DAC AOUTL+',{m:1})}${T(10,140,'DAC AOUTL−',{m:1})}${W(90,56,110,56)}${W(90,136,110,136)}${Rr(110,56,'R42 10K0')}${Rr(110,136,'R50 10K0')}
        ${W(144,56,200,56)}${W(144,136,200,136)}${T(150,190,'R39/R43/R41/R45 10K0·3K3, C29/C31 1000p, C30/C33 220p: 2-pole low-pass',{fs:10,c:'var(--ink2)'})}
        ${Op(200,96,'U5 NE5532 (diff → SE)',0)}${W(200,84,200,56)}${W(200,108,200,136)}${W(260,96,300,96)}
        ${Rr(300,96,'RV1 20K (CHA)')}${T(300,122,'now '+(D.trimA*TRIM_R/1000).toFixed(1)+'k',{fs:10,c:'var(--accent)'})}${W(334,96,360,96)}${Rr(360,96,'R47 4K7')}${W(394,96,420,96)}
        ${Op(420,108,'U6A: ×20K/(4K7+RV1)',0)}${W(420,120,410,120)}${G(410,124)}${W(480,108,520,108)}${W(420,96,420,40)}${W(420,40,520,40)}${Rr(450,40,'R40 20K0 ∥ C32 27p')}${W(520,40,520,108)}
        ${W(520,108,560,108)}${T(526,100,'= A1− via R38 30R',{fs:10})}${W(540,108,540,220)}${Rr(560,220,'R49/R52 10K0')}${Op(620,232,'U6B inverter',0)}${W(540,220,560,220)}${W(594,220,620,220)}${W(680,232,720,232)}${T(686,224,'= A1+ via R44 30R',{fs:10})}
        ${Op(760,108,'U11A follower',1)}${W(560,108,760,96)}${W(820,108,880,108)}${T(830,100,'A2− via R72 30R',{fs:10})}
        ${Op(760,262,'U11B follower',1)}${W(720,232,760,250)}${W(820,262,880,262)}${T(830,254,'A2+ via R71 30R',{fs:10})}
        ${T(10,310,'Stage gain now: '+fmtDb(trimGain(D.trimA),'dB')+' (range −1.8 … +12.6 dB with the 20K BOM part). Output impedance 2 × 30R = 60 Ω balanced, as the spec says.',{fs:11,c:'var(--ink2)'})}
      </svg>`);
    } else if (schSel===3){
      const P = [['A (P1.1)','INPUT −/shield side (T1.2)'],['1 (P1.2)','INPUT + (C16 → T1.1)'],['D (P1.7)','OUT1 via R7 75R'],['E (P1.9)','OUT2 via R8 75R'],['F (P1.11)','OUT3 via R15 75R'],['H (P1.13)','OUT4 via R16 75R'],['K (P1.17)','A1+ (R44 30R; R24 DNI)'],['9 (P1.18)','A1− (R38 30R)'],['J (P1.15)','A2+ (R71 30R; R22 DNI)'],['8 (P1.16)','A2− (R72 30R)'],['L (P1.19)','B1+ (R61 30R; R28 DNI)'],['10 (P1.20)','B1− (R55 30R)'],['M (P1.21)','H1 pin 2: B2+ (R74) or ALARM (Q1 via R36 10R)'],['11 (P1.22)','B2− (R73 30R)'],['S, 15 (P1.29/30)','V+ (+22 V) → F2'],['P, 13 (P1.25/26)','V− (−22 V) → F1'],['4, 5, 6, 7, R, 14','GNDD']];
      s = `<div class="grid2">${card('Sheet 4 — P1 EDAC 30-way edge connector (pad 2k−1 = letter, pad 2k = number)', `<table class="kv"><tr><th>Pin</th><th>Net / function</th></tr>${P.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`)}
        ${card('Digital output stage', `<p>TXP (U3.26) → R11 750R → node NET00108 ← R12 750R to ground → U2.3 and U2.5 (+). Each half of U2 is a follower (R6/R14 750R feedback) feeding two 75R back-match resistors.</p><p class="small muted">Populate U4 and the DNI resistors R18, R20, R21, R27, R22, R24, R28, R29 (the assembly drawing's “PLEASE DO NOT INSTALL” list) and TXN would drive four more 75 Ω AES outputs onto pins K, J, L and H1-pin-1 — an 8-output DA on the same PCB (${inf}: no such variant is documented here).</p>`)}</div>`;
    } else {
      s = card('Sheet 5 — power (redrawn from d8204A-ISS3.net)', `<svg viewBox="0 0 900 260" style="width:100%" role="img" aria-label="Power schematic">
        ${T(10,50,'V+ +22 V (S,15)',{m:1})}${W(130,46,170,46)}${Rr(170,46,'F2 RXE050')}${W(204,46,250,46)}${W(230,46,230,120)}<rect x="250" y="26" width="110" height="50" fill="none" stroke="var(--ink)" stroke-width="1.5"/>${T(305,56,'REG2 LM2596',{a:'middle'})}
        ${W(360,46,420,46)}${T(372,40,'L1 PE-53823, D5 SK33',{fs:10})}${W(420,46,470,46)}${T(476,50,'+5 V → L2 → +5V (PIC, CS8427, EL5263) · L3 → +5VA (DAC)',{fs:11})}
        ${W(230,120,270,120)}${T(240,112,'D4',{fs:10})}${Rr(270,120,'R35 2R2 ½ W')}${W(304,120,350,120)}${T(356,124,'+VA ≈ +21 V unregulated → NE5532 U5, U6, U8, U9, U11, U12',{fs:11})}
        ${T(10,190,'V− −22 V (P,13)',{m:1})}${W(130,186,170,186)}${Rr(170,186,'F1 RXE050')}${W(204,186,250,186)}${T(214,178,'D3',{fs:10})}${W(250,186,350,186)}${T(356,190,'−VA ≈ −21 V → NE5532s; REG1 79L05 → −5 V → EL5263 U1, U2 (U4)',{fs:11})}
        ${T(10,240,'U13 MC34164 holds the PIC in reset (MCLR) until +5 V is good. Spec: +22 V 165 mA, −22 V 137 mA max.',{fs:11,c:'var(--ink2)'})}</svg>`);
    }
    sh.innerHTML = s;
    const cv = sh.querySelector('#eqc');
    if (cv){ const {c,w} = SIM.canvas(cv, 230); const fmin=1e5, fmax=2e7, X=f=>40+Math.log10(f/fmin)/Math.log10(fmax/fmin)*(w-50), Y=v=>20+(14-v)/44*190;
      c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif';
      for (let v=10; v>=-30; v-=10){ c.beginPath(); c.moveTo(40,Y(v)); c.lineTo(w-10,Y(v)); c.stroke(); c.fillText(v+' dB', 2, Y(v)+3); }
      [1e5,1e6,1e7].forEach(f=>{ c.beginPath(); c.moveTo(X(f),20); c.lineTo(X(f),210); c.stroke(); c.fillText(f>=1e6?f/1e6+' MHz':f/1e3+' kHz', X(f)+2, 222); });
      const curve=(fn,col,lab,i)=>{ c.strokeStyle=col; c.lineWidth=2; c.beginPath(); for (let k=0;k<=200;k++){ const f=fmin*Math.pow(fmax/fmin,k/200); const yy=Y(fn(f)); k?c.lineTo(X(f),yy):c.moveTo(X(f),yy); } c.stroke(); c.fillStyle=col; c.fillText(lab, 50, 186+i*13-40); };
      curve(f=>db(eqGain(f,false)), SIM.css('--ink2'), 'U1B, EQ off', 0); curve(f=>db(eqGain(f,true)), SIM.css('--accent'), 'U1B, EQ on', 1);
      curve(f=>-cableLoss(f,D.cable), SIM.css('--bad'), `cable ${D.cable} ft`, 2); curve(f=>-cableLoss(f,D.cable)+db(eqGain(f,D.eq))+6, SIM.css('--accent2'), 'cable + U1 (×2) as set', 3);
      c.strokeStyle=SIM.css('--warn'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(X(64*D.src.fs),20); c.lineTo(X(64*D.src.fs),210); c.stroke(); c.setLineDash([]); }
  };
  SIM.on('time', draw);
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__d8204aActive = true;
  m.innerHTML = `<div class="grid2">${card('Main loop of v100.asm at the playhead (ISS1)', `<div id="loop"></div>`)}${card('Lock state machine (REFRESHSTATUS)', `<div id="fsm"></div>`)}</div>
    <div class="grid2">${card('PROCESS_SWITCHES: the two computed-GOTO tables, live', `<div id="tbl"></div>`)}${card('Register maps as last written', `<div id="regs"></div>`)}</div>
    ${card('SPI bytes in the current pass', `<div id="spi" class="small mono"></div>`)}
    ${card('INIT (0x005 → 0x05B)', `<ol class="small"><li>PORTA=0x00, PORTB=0xFF (red LED on), PORTC=0x00 (RC7 low: CS8427 in reset; both chip-selects low), PORTD=0xE6 (green LED on, DAC CS low), PORTE=0xE6.</li><li>TRISA=0x3F, TRISB=0xF8, RBPU on, TRISC=0x08 (only RC3 = CDOUT is an input), TRISD=0x70, TRISE=0xEB; ADCON1 = 0111 → all digital.</li><li><span class="mono">bcf portb,2 ;lock</span> (RB2 goes nowhere on ISS1) · <span class="mono">bsf portd,7 ;error</span> (RD7 is the green LED).</li><li><span class="mono">powerupdelay</span>: 256 × 3 cycles ≈ 0.62 ms.</li><li>cs4392reg5 = <span class="mono">cs4392reg5start</span> 0x30; copy the cs8420 defaults into both banks of shadow registers.</li><li><span class="mono">bsf portc,7</span> (receiver out of reset) → REFRESH4392 (only reg 5 is meaningful yet) → refresh8420_1 → refresh8420_2.</li><li>CS4392 defaults (reg 5 = 0x20) → REFRESH4392 → MAIN. Total ≈ ${(INIT_CYC*TCY*1e3).toFixed(1)} ms (approx. count).</li></ol>`)}`;
  const draw = ()=>{
    const t=SIM.t, st=stepAt(t), R=dacRegs(), lk=fwLock(passOf(t,READ_OFF));
    // main loop flow
    { let s=`<svg viewBox="0 0 520 ${STEPS.length*40+20}" style="width:100%" role="img" aria-label="main loop">`;
      STEPS.forEach((x,i)=>{ const y=10+i*40, on = D.issue==='ISS1' && st.k===i; const addr = {READ_SWITCHES:ADDR.READ_SWITCHES, PROCESS_SWITCHES:ADDR.PROCESS_SWITCHES, REFRESH8420_1:ADDR.refresh8420_1, REFRESH8420_2:ADDR.refresh8420_2, READ8420s:ADDR.read8420s, REFRESHSTATUS:ADDR.REFRESHSTATUS, REFRESH4392:ADDR.refresh4392, pdelay:ADDR.pdelay, clrwdt:ADDR.MAIN, 'goto main':0x06B}[x[0]];
        s += `<rect x="10" y="${y}" width="330" height="32" rx="6" fill="${on?'color-mix(in srgb,var(--accent) 30%,var(--panel))':'var(--panel2)'}" stroke="${x[3]==='p'?'var(--warn)':on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/>
          <text x="20" y="${y+20}" font-size="12" font-weight="700" fill="var(--ink)" font-family="var(--mono)">0x${addr.toString(16).padStart(3,'0')} ${x[0]}</text><text x="350" y="${y+14}" font-size="11" fill="var(--ink2)">${x[1]} cycles · ${SIM.fmtDur(x[1]*TCY)}</text><text x="350" y="${y+27}" font-size="10" fill="var(--ink2)">${x[3]==='p'?'phantom 2nd receiver':x[3]==='d'?'busy-wait':''}</text>`;
        if (i<STEPS.length-1) s += `<line x1="175" y1="${y+32}" x2="175" y2="${y+40}" stroke="var(--ink2)"/>`; });
      s += `<path d="M10 ${10+(STEPS.length-1)*40+16} H2 V26 H10" fill="none" stroke="var(--ink2)" stroke-dasharray="3 3"/></svg>`;
      m.querySelector('#loop').innerHTML = (D.issue==='ISS1'? `<p class="small">Pass #${st.pass}, cycle ${st.c} of 6303: <b>${STEPS[st.k][0]}</b> — ${STEPS[st.k][2]}</p>` : `<p class="small" style="color:var(--warn)">Board ISS3 selected: its PIC16C54 program is not in the archive. This is the ISS1 code, shown for reference.</p>`) + s; }
    // FSM
    { const cur = lk?0:1; const box=(x,lab,sub,on)=>`<rect x="${x}" y="30" width="200" height="90" rx="12" fill="${on?'color-mix(in srgb,var(--accent) 22%,var(--panel))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/><text x="${x+100}" y="56" text-anchor="middle" font-weight="700" font-size="13" fill="var(--ink)">${lab}</text>${sub.map((l,i)=>`<text x="${x+100}" y="${76+i*15}" text-anchor="middle" font-size="11" fill="var(--ink2)" font-family="var(--mono)">${l}</text>`).join('')}`;
      m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 520 200" style="width:100%" role="img" aria-label="lock state machine">${box(10,'LOCKED (bit 0 = 1)',['RD7=1 green · RB0=0','RC6=0 tally open','reg13 ← 0x95 (TX on)'],cur===0)}${box(310,'UNLOCKED (bit 0 = 0)',['RD7=0 · RB0=1 red','RC6=1 → Q1 → NO_LOCK low','reg13 ← 0xD5 (TXOFF)'],cur===1)}
        <path d="M210 55 C260 40 260 40 310 55" fill="none" stroke="var(--bad)" stroke-width="1.6"/><text x="260" y="36" text-anchor="middle" font-size="11" fill="var(--bad)">reg16 bit4 = 1</text>
        <path d="M310 100 C260 120 260 120 210 100" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="260" y="135" text-anchor="middle" font-size="11" fill="var(--accent)">reg16 bit4 = 0</text>
        <text x="10" y="170" font-size="11" fill="var(--ink2)">Evaluated once per pass in READ8420s / REFRESHSTATUS. reg 16 errors latch until read,</text><text x="10" y="186" font-size="11" fill="var(--ink2)">so any unlock since the last read counts. The TX change reaches the chip one pass later.</text></svg>`; }
    // tables
    { const ref = REFS.map((r,i)=>`<tr class="${i===R.ri&&D.issue==='ISS1'?'hl':''}"><td class="mono">${i} (${(i>>2)&1}${(i>>1)&1}${i&1})</td><td class="mono">0x${REFADDR[i].toString(16)}</td><td class="mono">${r[0]}</td><td class="mono">0x${hex2(r[1])}</td><td>${r[2]===null?'mute (manual: “Reserved”)':r[2]+' dBFS → +4 dBu ('+r[1]+' dB att.)'}</td></tr>`).join('');
      const rt = REG2.map((r,i)=>{ const a=atapi(r[1]); return `<tr class="${i===R.ti&&D.issue==='ISS1'?'hl':''}"><td class="mono">${i}</td><td class="mono">0x${(ADDR.left_right+3*i).toString(16)}</td><td class="mono">${r[0]}</td><td class="mono" style="${r[1]===0x72?'color:var(--bad)':''}">${bin8(r[1])}</td><td class="small">A=${srcName(a.aL,a.aR)} · B=${srcName(a.bL,a.bR)}</td></tr>`; }).join('');
      m.querySelector('#tbl').innerHTML = `<p class="small">dip_switch = <span class="mono">${bin8(R.dsw)}b</span>. <span class="mono">andlw 0x07</span> → reference_level_table (0x089): <span class="mono">addwf pcl,f</span>.</p><table class="kv"><tr><th>idx (SW8 SW7 SW6)</th><th>target</th><th>label</th><th>reg3/4</th><th>meaning</th></tr>${ref}</table>
        <p class="small"><span class="mono">andlw 0x78 · rrf ×3</span> → analog_type_table (0x0B5). Index bits 1:0 = SW5 SW4 (left), bits 3:2 = SW3 SW2 (right).</p><table class="kv"><tr><th>idx</th><th>at</th><th>label</th><th>cs4392reg2</th><th>ATAPI routing</th></tr>${rt}</table>`; }
    // regs
    { const r=FW.r8420, reg13 = lk? r[3] : FW.reg3off;
      const rows8 = [[1,'Control 1',r[1],'all defaults'],[2,'Control 2',r[2],'—'],[3,'Data Flow Control',reg13,(reg13&0x40?'TXOFF=1 · ':'TXOFF=0 · ')+'AESBP=0 · TXD=10 (AES3 receiver) · SPD=10 · SRCD=1 · bit 7 set'],[4,'Clock Source Control',r[4],'RUN=1 · CLK=00 · OUTC=1 (recovered clock) · INC=0 · RXD=01'],[5,'Serial Input Format',r[5],'unused'],[6,'Serial Output Format',r[6],'SOMS=1 master · SOSF=0 64fs · SORES=00 24-bit · left-justified · SOSPOL=1'],[9,'Interrupt 1 Mask',r[9],'all masked (also written to regs 10–16)'],[17,'Receiver Error Mask',r[17],'only bit 4 UNLOCK unmasked']];
      const rows4 = [[1,'Mode Control 1',FW.r4392[1],'bit 7 set (auto-mute) · DIF 000 left-justified'],[2,'Volume & Mixing',R.reg2,R.route[0]+' · soft ramp + zero-cross bits 6:5'],[3,'Channel A Volume',R.reg3,R.ref[2]===null?'0x7F mute':R.reg3+' dB'],[4,'Channel B Volume',R.reg4,R.ref[2]===null?'0x7F mute':R.reg4+' dB'],[5,'Mode Control 2',FW.r4392[5],'0x30 at start (power-down) → 0x20 (run)'],[6,'Mode Control 3',FW.r4392[6],'bit 4 set — meaning not in the archive']];
      const tb=(rows)=>`<table class="kv"><tr><th>reg</th><th>name (source comment)</th><th>value</th><th>decode</th></tr>${rows.map(x=>`<tr><td class="mono">${x[0]}</td><td>${x[1]}</td><td class="mono">0x${hex2(x[2])} ${bin8(x[2])}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
      m.querySelector('#regs').innerHTML = `<h3>CS8427 (code calls it cs8420)</h3>${tb(rows8)}<h3>CS4392 (ISS1)</h3>${tb(rows4)}<p class="small muted">Register names are the source's own comments. Bit-field decodes follow the Cirrus CS8420/CS4392 register layouts, which are not in the archive (${inf}).</p>`; }
    // spi
    { const p=Math.floor(t/PASS); const tx=passTx(p);
      m.querySelector('#spi').innerHTML = tx.map(x=>`<div><b>${x.name}</b> · ${x.cs} · ${SIM.fmtDur((x.b-x.a)*TCY)} → ${x.bytes.map(hex2).join(' ')}</div>`).join('') + `<div class="muted">Bit period 5 cycles = ${SIM.fmtDur(5*TCY)} (≈${(1/(5*TCY)/1000).toFixed(0)} kbit/s); CCLK high for 1 cycle per bit. Reads sample RC3 every 4 cycles.</div>`; }
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__d8204aActive = false;
  const F = [
    ['The only firmware is for a board that never shipped', `<span class="mono">v100.asm</span> (June 13 2005|38) drives a PIC16F874, a CS4392 DAC over SPI and an 8-way DIP switch. Every port pin matches <span class="mono">OBSOLETE/ISSUE1/d8204A-ISS1.net</span> (U25 PIC16F874, U4 CS4392, SW2 DIPSW8SMT, X2 4.9152 MHz). The ISS2 ECO (<span class="mono">d8204A-iss2.ECO</span>, June 8 2005) had already deleted U4 and the PIC's DAC_CLOCK/DAC_DATA/CS nets. ISS2/ISS3 use a PIC16C54, a hardware-mode CS4390 and no DIP switch, and their program is not in the archive. This resolves the “discrepancy” in the folder README.`],
    ['Code written for two receivers, board has one', `<span class="mono">refresh8420_2</span> and the second half of <span class="mono">read8420s</span> talk to “aes2” on RC4. On ISS1 the net CS2 (U25.42) connects to nothing. Each pass spends 863 + ≈85 cycles (≈0.77 ms, 15 % of the loop) writing to and reading from a chip that is not there; <span class="mono">lock_8420</span> bit 1 gets whatever the floating RC3 line reads and is never used. The structure was copied from D8204B <span class="mono">v200.asm</span> (May 9 2005), whose header and register set are identical.`],
    ['Lineage visible in the project files', `<span class="mono">v100.mcp</span> lists <span class="mono">file_000=v200.asm</span>, and <span class="mono">v100.mcw</span> points at <span class="mono">H:\\D82XX\\D8204B\\Software\\v100\\v100.mcp</span>: the MPLAB 8 project in this folder belongs to the D8204B. <span class="mono">d8204a.pjt</span> carries sections for <span class="mono">DA301V00.ASM</span> (P16C5X.INC) and an MRU list through D8201 v200 and D8204B v200 — the code family tree.`],
    ['The backup shows the last edit', `<span class="mono">V100.$$$</span> differs from <span class="mono">v100.asm</span> in one line: <span class="mono">cs8420reg6def</span> was <span class="mono">10010010</span> (D8204B's value) and became <span class="mono">10000010</span>. Read against the CS8420 layout this changes the serial output from 20-bit to 24-bit (${inf}) — the change a 24-bit DAC would need.`],
    ['A typo in the routing table', `15 of the 16 <span class="mono">cs4392reg2_*</span> constants are <span class="mono">0110xxxx</span>. <span class="mono">cs4392reg2_mute_left</span> is <span class="mono">01110010</span>: bit 4 is set as well. That entry is used with SW5 SW4 = 11 (left mute) and SW3 SW2 = 01 (right = input left). What bit 4 does in the CS4392 is not recorded here; the pattern says it was not meant.`],
    ['Codes 6 and 7: manual “Reserved”, firmware mutes', `D8204AMN_UPDATE.wpd lists SW8 SW7 SW6 = 110 and 111 as “Reserved”. <span class="mono">reference_level_table</span> sends both to <span class="mono">reference_mute</span>, which writes 0x7F to both volume registers, so the analog outputs go silent.`],
    ['A computed GOTO that works because the code is short', `<span class="mono">reference_level_table</span> (0x089) and <span class="mono">analog_type_table</span> (0x0B5) use <span class="mono">addwf pcl,f</span> without setting PCLATH, and the index for the second table is made with three <span class="mono">rrf</span> through carry. Carry at that point is whatever the first table's <span class="mono">addwf pcl</span> left: 0, because 0x08A + 7 does not cross 0xFF. Both tables happen to sit below 0x100 (address counts in this plugin). Move them past a 256-word page and the routing would jump to the wrong entry.`],
    ['Only assembles case-insensitively', `The source mixes <span class="mono">MAIN</span>/<span class="mono">main</span>, <span class="mono">REFRESH4392</span>/<span class="mono">refresh4392</span>, <span class="mono">PORTd</span>/<span class="mono">portd</span>, <span class="mono">bank0</span>/<span class="mono">BANK0</span>. It builds only because <span class="mono">d8204a.pjt</span> passes MPASM <span class="mono">/c-</span> (case-insensitive).`],
    ['Stale comments from other cards', `TRISE is commented “E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED” and TRISC “C6=CD LED”, but here RE0/RE1 are DIP inputs and RC6 is the NO-LOCK tally. <span class="mono">bsf portd,7 ;error</span> lights the <i>green</i> LED; <span class="mono">bcf portb,2 ;lock</span> drives an unconnected pin. At power-up both LEDs are on until the first pass, a free lamp test.`],
    ['Status changes reach the outputs one pass late', `REFRESHSTATUS writes the TXOFF value into the shadow register <span class="mono">cs8420reg13</span> after <span class="mono">REFRESH8420_1</span> has already run, so the CS8427 gets it on the next pass. Because reg 16 latches errors until read, a 2 ms glitch turns the four digital outputs off for about two passes (≈10 ms) after the red LED lights. Try it in the Simulator.`],
    ['No DAC mute in v100', `On loss of lock v100 turns the AES transmitter off but never touches the CS4392; the analog outputs rely on the receiver and the DAC's auto-mute (reg 1 bit 7, ${inf}). ISS2/ISS3 added a dedicated MUTEDAC line (PIC RB3 → CS4390 MUTEL/MUTER).`],
    ['Every register, every pass', `The loop rewrites all CS8427 control registers (20 bytes, including zeros into read-only regs 7 and 8 and the reg 9 value into regs 10–16) and all six CS4392 registers about 195 times a second. It is robust against a chip losing its settings, but the DAC volume/routing write is unconditional too. Most of the pass (3852 of 6303 cycles) is the <span class="mono">pdelay</span> busy-wait, set by <span class="mono">pconstant equ 5</span>.`],
    ['Clock settings disagree', `<span class="mono">d8204a.pjt</span> [Fuses] says 4 MHz (simulator setting); ISS1 has a 4.9152 MHz crystal. There is no <span class="mono">__CONFIG</span> line, so oscillator and watchdog fuses were set at the programmer. With CLRWDT once per 5.1 ms pass, the default WDT (≈18 ms) would never fire.`],
    ['Which manual matches which board', `<b>D8204AMN_UPDATE.wpd</b> (June 14 2005, the day after V1.00) describes the DIP switch tables and LOCK / NO LOCK / EQ — the ISS1 card. Its intro still lists a “Confidence” LED that the body and the ISS1 board do not have. <b>D8204AMN Issue3.doc</b> (Jan 2006) describes SIGNAL / CONFIDENCE / ERROR / EQ and only the CHA/CHB trims — the ISS3 card. Issue3's spec says input “Selectable 75 Ω and HiZ”; the update says a 75/110 Ω “INPUT TERMINATION” berg header. Neither ISS1 nor ISS3 has such a header: R9 75R is fixed (H1 is the alarm jumper, H13 the ICSP header).`],
    ['Rear-module labels promise two alarms', `The BNC2/BNC4 art (<span class="mono">D8204A - rear module options.pdf</span>, <span class="mono">D8204AT2.CDR</span>) labels “ANALOG R. OUT2+/CONFIDENCE” and “ANALOG R. OUT2−/NO-LOCK … by setting the jumpers”. ISS1 and ISS3 have one 3-pin jumper, H1, on pin M (R OUT2+) only, and it carries the NO-LOCK tally (ISS1 net name <span class="mono">NO_LOCK</span>). R OUT2− (pin 11) is always analog. The labels look inherited from the 1998|31 D8204A, whose drawings sit in the D8204 folder.`],
    ['Same PCB could be an 8-output DA', `U4 (a third EL5263) and resistors R18, R20, R21, R27 (750R) and R22, R24, R28, R29 (75R) are on the ISS3 board but marked “do not install”. They would drive TXN into pins K, J, L and H1-1 — the analog output pins — giving eight AES outputs (${inf}: no such build is documented).`],
    ['BOM vs netlist', `RV1/RV2 are “20K” in d8204A-iss3.bom and on the assembly drawing, but “10K” in d8204A-ISS3.net. With 10K the CHA/CHB range would be −1.8 … +2.7 dB instead of −1.8 … +12.6 dB, centred differently. The netlist (July 2005) predates the BOM (Jan 2006); the BOM value is used here.`],
    ['Artwork 2026|59: rear modules now from the CorelDRAW guide', `BNC2 and BNC4 are the vectors of ${SIM.src(RMG_DIR+'D8204A - rear module options.cdr','D8204A - rear module options.cdr')} (CorelDRAW X3, 2012-01-16), black plate with white legends, through Corel's own ${SIM.src(RMG_DIR+'D8204A - rear module options.pdf','PDF export')} (libcdr draws the screw-terminal symbol font as giant letters). The older terminal pages for this card sit in the D8204 folder: ${SIM.src(E+'D8204AT2.CDR','D8204AT2.CDR')} (same BNC + screw layout and CONFIDENCE / NO-LOCK text, file re-saved 2016-07-06), ${SIM.src(E+'D8204AT1.CDR','D8204AT1.CDR')} and ${SIM.src(E+'D8204AT3.CDR','D8204AT3.CDR')} (1998 solder / screw-terminal pages). There is no D8204A artwork in the D8204A folder itself.`],
    ['File dates', `ISS3 netlist 2005-07-08, BOM 2006-01-13, schematic 2006-06-26, .pcb re-saved 2013-01-17 with a clean Online DRC log, Gerbers regenerated 2013, PnP program 2016. ISS4 in WORKING/ (2006) was never released.`],
  ];
  m.innerHTML = card('Findings — what the D8204A and its firmware are up to', `<ol>${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> ${f[1]}</li>`).join('')}</ol>`) +
    card('Main inferred assumptions', `<ul class="small"><li>Cable loss: 0.30 dB/100 ft at 1 MHz, √f law; receiver lock threshold 0.15 V p-p and eye ratio 0.33; CONF below 0.5 V p-p or ratio 0.55. Chosen so the model matches the manual's 2000 ft (no EQ) and about 5000 ft (EQ).</li><li>T1 treated as 1:1; TXP swing taken as 5 V.</li><li>CS8427 re-acquire time 10 ms.</li><li>Factory trim position = centre of the 20K trim; 0 dBFS = +24 dBu there (spec).</li><li>Clip level ≈ +30.5 dBu balanced from the unregulated ±VA rails.</li><li>ISS3 LED/mute/alarm behaviour (PIC16C54 code missing) taken from the netlist pin names and the Issue 3 manual; ISS3 status follows the receiver directly.</li><li>Rear-module panel colour and the position of DIP switch #1 on ISS1.</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'d8204a', name:'D8204A · AES/EBU reclocking DA + D/A converter (2005|38)', duration:1,
  product:'D8204A', year:2005, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8204A - #Master #MF82',
  summary:'MF82 frame card: one 75 Ω AES/EBU input, cable EQ, a CS8427 receiver that re-times it to four 75 Ω outputs, and a DAC feeding two balanced analog stereo pairs. The archived PIC firmware (v100, 2005|38) is for the ISS1 board with a DIP switch for reference level and routing; the shipping ISS3 board used a PIC16C54 whose code is lost.',
  highlights:['Board from the real ISS3 assembly drawing; ISS1 drawn from its pick-and-place file','DIP switch → computed-GOTO tables → CS4392 registers, bit by bit','Main loop timed from the code: 6303 cycles = 5.13 ms','Glitch → latched UNLOCK → TXOFF one pass later','Cable length and EQ modelled from the part values','Firmware drives a second receiver that is not on the board'],
  footnotes:[
    {text:'Rear-module art: BNC2 and BNC4 are vectors of the 2012 CorelDRAW guide, taken through its Corel PDF export because libcdr renders the terminal-block symbol font as giant text.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8204A - rear module options.cdr'},
    {text:'The guide labels the right-hand pair “ANALOG R. OUT2+/CONFIDENCE” and “ANALOG R. OUT2-/NO-LOCK”, but the ISS3 board has only the NO-LOCK tally.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8204A - rear module options.cdr'},
    {text:'The D8204A has no artwork folder of its own: its terminal pages D8204AT1/AT2/AT3.CDR and manual D8204AMN.CDR live in the D8204 folder (and again in D8204 - #ARCHIVE).', src:'#MF8200 #SERIES/D8204 - #Master #MF82/D8204 - #Engineering/D8204AT2.CDR'},
    {text:'D8204AT2.CDR carries a 2016-07-06 file date although it holds the same BNC + screw-terminal layout as the 1998 pages; Inkscape/libcdr drops its label text, which only the CDR text dump shows.', src:'#MF8200 #SERIES/D8204 - #Master #MF82/D8204 - #Engineering/D8204AT2.CDR'},
    {text:'Both BNC2 and BNC4 cells are captioned “D8204A-1x4 AES/EBU Distribution Amplifier & Digital to Analog Converter”; BNC4 is marked *MF8210 only.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8204A - rear module options.cdr'},
  ],
  depth:'Full model',
  stepUnits:[
    {label:'1 PIC pass (5.13 ms)', period:()=>PASS},
    {label:'1 SPI byte (46 cycles)', period:()=>46*TCY},
    {label:'1 AES block (192 frames)', period:()=>192/D.src.fs},
    {label:'1 AES frame', period:()=>1/D.src.fs},
    {label:'1 ms', period:()=>0.001},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole)'],[0.2,'200 ms'],[0.05,'50 ms (≈10 passes)'],[0.0055,'1 pass (5.1 ms)'],[0.0008,'REFRESH8420_1 (0.8 ms)'],[0.00005,'50 µs (SPI bits)'],[4/48000,'4 AES frames']],
  defaultZoom:2,
  init(){ },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial', render:viewTutorial},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
