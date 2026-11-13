/* =====================================================================
   POD16 — stereo audio cross-fader, 2 × 1 (Ward-Beck Systems, 1998|31, firmware v1.01 2000|33)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder #POD #SERIES/XXX - POD16 - #Master #OBSOLETE):
   - POD16 - #Engineering/Software/v101/pd16v101.asm (Tim Clarke, 14 Sep 2000, PIC16C73A):
       interupt, init, linear_table, db_table, xdb_table, flash_rout, sft_out, main, input,
       debounce, debounce_dry, dry_led_output, pb_led_output, AtoD, output_DtoA, delay,
       fade_set, fade_how, switch; PD16V101.ERR; pod16.pjt
   - .../Software/V100/PD16V100.ASM (15 Oct 1998), TESTV100.ASM, PD16V1XX.ASM (an MPASM 01.40
       listing of PD16V100 with the symbol table), V100/OLD/* (PD16V1X1, V2X1–V2X3, DBLFADE, JUNK)
   - .../MANUAL/Pod16sch.pdf = Pod16_1/2/3sch.pdf (POD16.DSN, 4 Sep 1998, ISS1PCB): SSM2018TP VCAs,
       OP275 control amps, 5532 summing/balancing, LT1451 DACs, PIC16C73A, X1 4M915, ILD1, 75176
   - .../MANUAL/POD16MAN.WPD (manual text, 27 Oct 1999), POD16 - Functional Diagram.pdf
   - .../PCB/POD16-iss3.pcb (P-CAD 2002), PCB/OBSOLETE/ARCHIVE/POD16.DSN (OrCAD)
   - POD16 - #ARTWORK #DA #2016/POD16-FRONT&REAR(CURVE).pdf (silk separations, 25 Jun 2014), Pics/*.jpg
   - POD16 - #Mechanical #DA #2016/POD16-FRONT ISS 1 (PANEL).pdf, POD16-REAR ISS 4 (PANEL).pdf (both copies)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const hex = (v,n)=>'0x'+(v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bin = (v,n)=>(v>>>0).toString(2).padStart(n||8,'0');

/* ---------------- constants from the source ---------------- */
const C = {
  FOSC: 4.9152e6,                // X1 4M915 on OSC1/OSC2 (schematic page 2)
  TCY: 4/4.9152e6,               // one instruction cycle = 813.8 ns
  PASS_CYC: 1912,                // one main-loop pass, counted from the listing (delay = 256 × 7 cycles) — branch-dependent, inferred ±3 %
  BCOUNT: 7,                     // bcount_num
  FLASH: 0x49,                   // flash_num = 73 passes
  T2_MUL: 36,                    // T2CON = 0x45 → prescale 1:4 × postscale 1:9 = 36 cycles per (PR2+1)
  LAT: 3,                        // interrupt latency (PIC16 datasheet: 3–4 Tcy)
  DTOA: 287,                     // output_DtoA incl. call: 2 × (8 + 4 bits) through sft_out + strobe (counted)
  TAIL: 17,                      // bcf PIR1 … RETFIE (counted)
  RC_TAU: 50e-6,                 // R35 ‖ R34 (1K0 ‖ 1K0) × C22 0.1 µF on each VCA CTL pin
  DUR: 5,                        // simulated run length (s)
  PRESS: 0.06,                   // how long a mouse click holds a button — inferred human press
};
const DBK = 20*Math.log10(255)/255;   // db_table fit: −20·log10(1 − (i−1)/254) / 0.1875 → 255 counts = 48.1 dB
const BIT = { manual:0, cross_1:1, cross_2:2, cross_3:3, not_used:4, input_1:5, input_2:6, read:7 };
const F1 = { rel:1, prss:2, in1:4, in2:8, ad1:16, ad2:32, zero:64, frm_ext:128 };
const F2 = { ext1:1, ext2:2, flash:4, input_flag:8, special:16, dry_press:32, clr_in:64, hard:128 };
const BTN = [ // front buttons: PORTB bit, label, silk x (drill positions from POD16-FRONT ISS 1 × 200 px/in)
  {bit:0, id:'manual', label:'MANUAL', short:'MANUAL', x:630},
  {bit:1, id:'log',    label:'LOG FADE (cross_1, db_table)', short:'LOG', x:780},
  {bit:2, id:'cross',  label:'CROSS FADE (cross_2, linear_table)', short:'CROSS', x:930},
  {bit:3, id:'vfade',  label:'V-FADE (cross_3, xdb_table)', short:'V', x:1080},
  {bit:5, id:'in1',    label:'INPUT 1', short:'IN 1', x:1380},
  {bit:6, id:'in2',    label:'INPUT 2', short:'IN 2', x:1530},
];
const MODE_NAME = led => !(led&2)?'LOG FADE':!(led&4)?'CROSS FADE':!(led&8)?'V-FADE':'none';

/* ---------------- the three fade tables (retlw lists in pd16v101.asm) ---------------- */
const LIN = (()=>{ const a=[0]; for(let v=0; v<=255; v++){ if(v===12||v===242) continue; a.push(v); } a.push(255); return a; })();
const DB = [0,0,0,1,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5,6,6,6,6,6,7,7,7,7,7,8,8,8,8,8,9,9,9,9,10,10,10,10,10,11,11,11,11,12,12,12,12,13,13,13,13,13,14,14,14,14,15,15,15,15,16,16,16,16,17,17,17,17,18,18,18,19,19,19,19,20,20,20,20,21,21,21,22,22,22,23,23,23,24,24,24,25,25,25,26,26,26,26,27,27,27,28,28,28,29,29,29,30,30,30,31,31,32,32,32,33,33,33,34,34,34,35,35,36,36,36,37,37,38,38,38,39,39,40,40,41,41,41,42,42,43,43,44,44,45,45,46,46,47,47,48,48,49,49,50,50,51,51,52,52,53,53,54,55,55,56,56,57,58,58,59,60,60,61,62,62,63,64,64,65,66,67,67,68,69,70,71,72,72,73,74,75,76,77,78,79,80,81,82,83,84,85,87,88,89,90,92,93,94,96,97,99,100,102,103,105,107,109,111,113,115,117,120,122,125,127,130,134,137,141,145,149,154,159,166,173,181,191,204,223,255,255];
const XDB = Array.from({length:256}, (_,i)=> i===0? 0 : i<=127? 2*(i-1) : 255);   // xdb_table: 0,0,2,4 … 252, then 255 × 128
function tbl(ireg, w){ // btfss interrupt_reg,cross_n / call …_table — chained exactly as in fade_how
  if (!(ireg&2)) w = DB[w]; if (!(ireg&4)) w = LIN[w]; if (!(ireg&8)) w = XDB[w]; return w;
}

/* ---------------- main-loop step map (cycles, counted from the listing) ---------------- */
const STEPS = [
  ['clrwdt · input', 40, 'Pull READ (RB7) low, read the 7 front switches on RB0–6, restore the LEDs, apply the flash, read tallies RC2/RC3'],
  ['debounce', 14, '7 identical passes = a press (prss_flag); then 7 passes of all-released'],
  ['flash_rout', 10, 'While a fade runs, toggle the flash phase every 73 passes'],
  ['debounce_dry', 14, 'Tally inputs: only when MANUAL is off; one bit changes per 7 stable passes'],
  ['pb_led_output', 12, 'Front-button logic: MANUAL / mode / INPUT 1 / INPUT 2'],
  ['dry_led_output', 10, 'Tally logic: select, mix both, reverse a running fade'],
  ['AtoD', 12, 'FADE TIME trim on RA0: one of set-up / start / read per pass'],
  ['fade_set', 14, 'If in1_flag or in2_flag: load PR2 = time_reg, T2CON = 0x45, enable the Timer 2 interrupt'],
  ['delay', 1784, '256 × (movwf · clrwdt · decfsz · decfsz · goto): delay2 wraps, so always 256 turns'],
  ['goto main', 2, ''],
];
const STEP_OFF = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
const WIN_A = [2,4], WIN_B = [11,13], WIN_C = [STEP_OFF[6]+4, STEP_OFF[6]+10];   // RP0 = 1 windows (bank 1)

/* ---------------- device state (operator side) and events ---------------- */
const D = {
  ev: [],                 // {t, kind:'btn'|'tally'|'trim'|'power'|'src', ...} — replayed from t = 0
  adres0: 128,            // FADE TIME trim at power-up (centre = "1SEC")
  ram: 8,                 // shift_count left in RAM at power-up (init never sets it)
  cal: 'table',           // VCA calibration: 'table' = 0.1887 dB/count (what the tables assume); 'deep' = 255 → 100 dB
  log: [],
  lastTrace: [],
};
function demoEvents(){
  return [
    {t:0.050, kind:'btn', bit:0, dur:C.PRESS},      // MANUAL on
    {t:0.300, kind:'btn', bit:6, dur:C.PRESS},      // INPUT 2 → ~1 s fade (trim at 1SEC)
    {t:1.700, kind:'btn', bit:3, dur:C.PRESS},      // V-FADE
    {t:1.900, kind:'btn', bit:5, dur:C.PRESS},      // INPUT 1
    {t:3.200, kind:'trim', adres:255},              // trim to CUT
    {t:3.400, kind:'btn', bit:6, dur:C.PRESS},      // cut to INPUT 2
  ];
}
D.ev = demoEvents();

/* ---------------- the firmware, ported routine by routine ---------------- */
function newState(){
  return { led:0, portb:0, pre:0, inReg:0xFF, inReg2:0xFF, f1:0, f2:0, bcount:0, bounce:0, bcountDry:0, b2:0xFF,
    tc1:0, tc2:0, dac1:0, dac2:0, timeReg:0, ireg:0, flashCount:0, shift:8, adres:128, go:false,
    peie:false, gie:false, pr2:0, tEn:0, P:0, nextStart:Infinity, rc0:0, rc4:0, rc5:0,
    u4:0, u5:0, u4out:0, u5out:0, carry:0, fadesByMode:{}, reversals:0, cuts:0 };
}
/* sft_out + output_DtoA, bit-accurate through the LT1451 daisy chain (U4 DO → U5 DI) */
function sftOut(S, w, bits){
  let reg = w & 255;
  let n = S.shift; do {
    const d = (reg>>7)&1; if (bits) bits.push(d);
    S.u5 = ((S.u5<<1) | (S.u4>>11)) & 0xFFF; S.u4 = ((S.u4<<1) | d) & 0xFFF;   // rising CLK
    const c = (reg>>7)&1; reg = ((reg<<1) | S.carry) & 255; S.carry = c;      // rlf SFT_REG,1 (through carry)
    n = (n-1) & 255;
  } while (n !== 0);
  S.shift = 8;
}
function outputDtoA(S){
  const bits = [];
  sftOut(S, S.dac1, bits); S.shift = 4; sftOut(S, 0, bits);
  sftOut(S, S.dac2, bits); S.shift = 4; sftOut(S, 0, bits);
  S.u4out = S.u4; S.u5out = S.u5;                                               // bsf/bsf/bcf PORTA,strb → CS rising loads both DACs
  return bits;
}
function init(S, n){
  S.led = 0x5D; S.portb = 0x5D; S.dac1 = 0xFF; S.b2 = 0xFF; S.f1 = 0; S.f2 = 0; S.tc1 = 0; S.tc2 = 0; S.dac2 = 0;
  S.shift = D.ram;   // never initialised: whatever the RAM held
  n(`init: TRISA = 0x0B, TRISC = 0xCE, TRISB = 0x80, ADCON0 = 0x81; PORTB = led_output_reg = 0x5D (LOG FADE + INPUT 1 lit, MANUAL off)`);
  n(`dac1_reg = 0xFF (input 2 off), dac2_reg = 0x00 (input 1 on); bsf flag_1,ad_flag1 is undone by the clrf flag_1 that follows`);
  const bits = outputDtoA(S);
  n(`output_DtoA with shift_count = ${D.ram} (uninitialised RAM) → ${bits.length} clocks; U4 (FADE 1) = ${hex(S.u4out,3)}, U5 (FADE 2) = ${hex(S.u5out,3)}${D.ram===8?'':' ← misaligned'}`);
  return bits;
}
function do1(S, n){
  S.f1 |= F1.in1; S.led &= ~0x20; if (S.b2 & 0x08) S.led |= 0x40;
  let msg = 'do1: in1_flag = 1, INPUT 1 LED on' + ((S.b2&0x08)?', INPUT 2 LED off':' (tally 2 active: INPUT 2 stays on)');
  if (!(S.pre & 0x20) && (S.pre & 0x40)){ S.f1 &= ~F1.in1; msg += ' — input 1 was already alone: in1_flag cleared, nothing to fade'; }
  n(msg);
  if (!(S.b2 & 0x08)){ // dryness1
    if (S.tc1 !== 0) S.tc1 = (~S.tc1)&255; if (S.tc2 === 0) S.tc2 = 0xFF;
    n(`dryness1 (tally 2 held): table_count1 → ${hex(S.tc1)}, table_count2 → ${hex(S.tc2)} — input 2 is kept up, input 1 fades in on top`);
  } else if (S.f1 & F1.in2){
    S.f1 &= ~F1.in2; S.tc2 = 0xFF - S.tc2; S.tc1 = 0xFF - S.tc1; S.reversals++;
    n(`skipit_1: a fade toward input 2 was running → in2_flag = 0, table_count1/2 = 0xFF − count (${hex(S.tc1)}/${hex(S.tc2)}): the fade reverses from where it is`);
  }
  output(S);
}
function do2(S, n){
  S.f1 |= F1.in2; S.led &= ~0x40; if (S.b2 & 0x04) S.led |= 0x20;
  let msg = 'do2: in2_flag = 1, INPUT 2 LED on' + ((S.b2&0x04)?', INPUT 1 LED off':' (tally 1 active: INPUT 1 stays on)');
  if (!(S.pre & 0x40) && (S.pre & 0x20)){ S.f1 &= ~F1.in2; msg += ' — input 2 was already alone: in2_flag cleared'; }
  n(msg);
  if (!(S.b2 & 0x04)){ // dryness2
    if (S.tc2 !== 0) S.tc2 = (~S.tc2)&255; if (S.tc1 === 0) S.tc1 = 0xFF;
    n(`dryness2 (tally 1 held): table_count2 → ${hex(S.tc2)}, table_count1 → ${hex(S.tc1)} — input 1 is kept up, input 2 fades in on top`);
  } else if (S.f1 & F1.in1){
    S.f1 &= ~F1.in1; S.tc2 = 0xFF - S.tc2; S.tc1 = 0xFF - S.tc1; S.reversals++;
    n(`skipit_2: a fade toward input 1 was running → in1_flag = 0, counts mirrored (${hex(S.tc1)}/${hex(S.tc2)}): the fade reverses`);
  }
  output(S);
}
function output(S){ S.portb = S.led; }
function input(S, inp){
  S.inReg = (inp.btn & 0x7F) | 0x90;                   // bsf input_reg,read · bsf input_reg,not_used
  S.portb = S.led;
  if (S.f1 & F1.in1) S.portb &= ~0x20; if (S.f1 & F1.in2) S.portb &= ~0x40;
  if (S.f2 & F2.flash){ if (S.f1 & F1.in1) S.portb |= 0x20; if (S.f1 & F1.in2) S.portb |= 0x40; }
  S.inReg2 = 0xFF; if (inp.dry1) S.inReg2 &= ~0x04; if (inp.dry2) S.inReg2 &= ~0x08;
}
function debounce(S, n){
  const dec = ()=>{ S.bcount = (S.bcount-1)&255; return S.bcount!==0; };
  if (S.f1 & F1.rel){
    if (S.inReg !== 0xFF){ S.bcount = C.BCOUNT; return; }
    if (dec()) return; S.f1 &= ~F1.rel; S.bcount = C.BCOUNT; return;
  }
  if (S.inReg === 0xFF || S.bounce !== S.inReg){ S.bounce = S.inReg; S.bcount = C.BCOUNT; return; }
  if (dec()) return;
  S.f1 |= F1.rel | F1.prss; S.f2 &= ~(F2.ext1|F2.ext2); S.f2 |= F2.input_flag;
  const b = BTN.find(x=>!(S.inReg & (1<<x.bit)));
  n(`debounce: input_reg = ${hex(S.inReg)} stable for 7 passes → prss_flag, rel_flag set (${b?b.short:'?'})`);
  S.bounce = S.inReg; S.bcount = C.BCOUNT;
}
function flashRout(S){
  const in12 = S.f1 & (F1.in1|F1.in2);
  if (!in12){ if (!(S.f2 & F2.flash)) return; }
  else { S.flashCount = (S.flashCount-1)&255; if (S.flashCount !== 0) return; }
  S.flashCount = C.FLASH;
  if (!(S.f2 & F2.flash)){ // flash_on
    S.f2 |= F2.flash; if (S.f1 & F1.in1) S.portb |= 0x20;
    if (S.f2 & F2.input_flag) S.portb |= 0x40;     // BUG: tests flag_2 bit 3 (input_flag), meant flag_1,in2_flag
    return;
  }
  S.f2 &= ~F2.flash;
  if (S.f1 & F1.in1) S.portb &= ~0x20; if (S.f1 & F1.in2) S.portb &= ~0x40;
  if (S.f1 & (F1.in1|F1.in2)) return;
  S.portb = S.led;
}
function debounceDry(S, n){
  if (!(S.portb & 1)) return;                          // MANUAL LED lit → tallies ignored
  if (S.b2 === S.inReg2){ S.bcountDry = C.BCOUNT; return; }
  S.bcountDry = (S.bcountDry-1)&255; if (S.bcountDry !== 0) return;
  S.f2 |= F2.dry_press;
  const old = S.b2;
  if ((S.inReg2&4) && !(S.b2&4)) S.b2 |= 4;
  else if (!(S.inReg2&4) && (S.b2&4)) S.b2 &= ~4;
  else if ((S.inReg2&8) && !(S.b2&8)) S.b2 |= 8;
  else if (!(S.inReg2&8) && (S.b2&8)) S.b2 &= ~8;
  n(`debounce_dry: tallies stable 7 passes → bounce_reg2 ${hex(old)} → ${hex(S.b2)}, dry_press set`);
  S.bcountDry = C.BCOUNT;
}
function dryLedOutput(S, n){
  if (!(S.f2 & F2.dry_press)) return;
  S.f2 &= ~F2.dry_press; S.pre = S.led;
  n(`dry_led_output: input_reg2 = ${hex(S.inReg2)} (tally 1 ${S.inReg2&4?'off':'ON'}, tally 2 ${S.inReg2&8?'off':'ON'})`);
  const checkDry2 = ()=>{
    if (S.inReg2 & 0x08) return offExt2();
    if (!(S.led & 0x40)) return output(S);
    return do2(S, n);
  };
  const offExt2 = ()=>{
    if (S.led & 0x40) return output(S);
    if (S.led & 0x60){ n('off_ext2: tally 2 released while input 2 is alone on → do1 (fade over to input 1)'); return do1(S, n); }
    S.tc2 = (~S.tc2)&255;
    if (S.f1 & (F1.in1|F1.in2)){ S.f1 &= ~(F1.in1|F1.in2); n('passthis2: both were up and a fade was running → flags cleared'); return do1(S, n); }
    S.tc2 = 0; S.tc1 = 0xFF; S.dac2 = 0; n('off_ext2: both inputs up, tally 2 released → table_count2 = 0, table_count1 = 0xFF, dac2_reg = 0 → do1'); return do1(S, n);
  };
  if (S.inReg2 & 0x04){ // off_ext1
    if (S.led & 0x20) return checkDry2();
    if (S.led & 0x60){ n('off_ext1: tally 1 released while input 1 is alone on → do2 (fade over to input 2)'); return do2(S, n); }
    S.tc1 = (~S.tc1)&255;
    if (S.f1 & (F1.in1|F1.in2)){ S.f1 &= ~(F1.in1|F1.in2); n('passthis1: flags cleared'); return do2(S, n); }
    S.tc1 = 0; S.tc2 = 0xFF; S.dac1 = 0; n('off_ext1: both inputs up, tally 1 released → table_count1 = 0, table_count2 = 0xFF, dac1_reg = 0 → do2'); return do2(S, n);
  }
  if (!(S.led & 0x20)) return checkDry2();
  return do1(S, n);
}
function pbLedOutput(S, n){
  if (!(S.f1 & F1.prss)) return;
  S.f1 &= ~F1.prss;
  if (S.f2 & F2.special) return;                       // never set in v101
  S.pre = S.led;
  const manual = !(S.portb & 1);
  if (!(S.inReg & 0x20)){
    if (!manual){ n('pb_led_output: INPUT 1 pressed but MANUAL is off → front input buttons locked out'); return output(S); }
    if (!(S.pre & 0x20) && (S.pre & 0x40)){ n('pb_led_output: INPUT 1 is already selected → nothing'); return output(S); }
    if (!(S.pre & 0x60)){ S.tc2 = 0; S.tc1 = 0xFF; S.dac2 = 0; n('check_it1: both inputs up → table_count1 = 0xFF, dac2_reg = 0 (input 1 straight to full)'); }
    else n('check_it1 → do1');
    return do1(S, n);
  }
  if (!(S.inReg & 0x40)){
    if (!manual){ n('pb_led_output: INPUT 2 pressed but MANUAL is off → locked out'); return output(S); }
    if (!(S.pre & 0x40) && (S.pre & 0x20)){ n('pb_led_output: INPUT 2 is already selected → nothing'); return output(S); }
    if (!(S.pre & 0x60)){ S.tc1 = 0; S.tc2 = 0xFF; S.dac1 = 0; n('check_it2: both inputs up → table_count2 = 0xFF, dac1_reg = 0'); }
    else n('check_it2 → do2');
    return do2(S, n);
  }
  // check_manual
  if (S.f1 & (F1.in1|F1.in2)){ n('check_manual: a fade is running (in1/in2_flag) → MANUAL and MODE buttons ignored'); return output(S); }
  if (!(S.inReg & 0x01)){
    S.led &= ~1; if (S.portb & 1) S.led &= ~1; else S.led |= 1;
    S.b2 = 0xFF;
    n(`check_manual: MANUAL toggled → ${S.led&1?'off (tally control)':'ON (front-panel control)'}; bounce_reg2 = 0xFF (tally history forgotten)`);
    return output(S);
  }
  if (!(S.inReg & 0x02)){ S.led = (S.led & ~0x0E) | 0x0C; n('check_cross1: LOG FADE (cross_1) → db_table'); return output(S); }
  if (!(S.inReg & 0x04)){ S.led = (S.led & ~0x0E) | 0x0A; n('check_cross2: CROSS FADE (cross_2) → linear_table'); return output(S); }
  if (!(S.inReg & 0x08)){ S.led = (S.led & ~0x0E) | 0x06; n('check_cross3: V-FADE (cross_3) → xdb_table'); return output(S); }
  // only the unused bit-4 switch: plain return
}
function atod(S, inp, n){
  if (S.f1 & F1.ad1){ S.f1 &= ~F1.ad1; S.f1 |= F1.ad2; S.go = true; S.adres = inp.adres; return 'start'; }
  if (S.f1 & F1.ad2){
    S.f1 &= ~(F1.ad1|F1.ad2); S.go = false;
    if (S.adres > 0xF7){
      if (!(S.f2 & F2.hard)) n(`AtoD: ADRES = ${hex(S.adres)} > 0xF7 → switch_hard: time_reg = 1, hard_switch = 1 (CUT), RC0 = 0, RC4 = 1`);
      S.timeReg = 1; S.f2 |= F2.hard; S.rc0 = 0; S.rc4 = 1;
    } else {
      const tr = 0xFF - S.adres;
      if (tr !== S.timeReg || (S.f2 & F2.hard)) n(`AtoD: ADRES = ${hex(S.adres)} → time_reg = 0xFF − ADRES = ${hex(tr)} (${(fadeSeconds(tr)).toFixed(3)} s fade), hard_switch = 0`);
      S.timeReg = tr; S.f2 &= ~F2.hard; S.rc0 = 1; S.rc4 = 0;
    }
    return 'read';
  }
  S.f1 |= F1.ad1; return 'setup';
}
function fadeSet(S, tEnable, n){
  if (S.f1 & (F1.in1|F1.in2)){
    if (S.peie && S.gie) return false;
    S.ireg = S.led; S.pr2 = S.timeReg; S.peie = true; S.gie = true; S.tEn = tEnable; S.P = C.T2_MUL*(S.pr2+1);
    S.nextStart = tEnable + S.P + C.LAT;
    const mode = (S.f2 & F2.hard) ? 'CUT' : MODE_NAME(S.ireg); S.fadesByMode[mode] = (S.fadesByMode[mode]||0)+1;
    n(`fade_set → set_int: interrupt_reg = ${hex(S.ireg)} (${mode}), PR2 = time_reg = ${hex(S.pr2)}, TMR2 = 0, T2CON = 0x45, GIE = PEIE = TMR2IE = 1 → an interrupt every ${SIM.fmtDur(S.P*C.TCY)}`);
    return true;
  }
  S.peie = false; S.gie = false; S.nextStart = Infinity; return false;
}
/* the interrupt: fade_how · switch · output_DtoA · bcf PIR1,TMR2IF */
function isr(S){
  let look = 0, fh = 3, sw = 5, kind = 'fade';
  const T = w=>{ look++; return tbl(S.ireg, w); };
  const before = {tc1:S.tc1, tc2:S.tc2};
  if (!(S.f2 & F2.hard)){
    S.rc5 = 1;
    const doA2 = ()=>{
      if (S.tc2 !== 0xFF){ S.dac1 = T(0xFF - S.tc2); S.tc2 = (S.tc2+1)&255; }
      if (S.f1 & F1.in1){ if (S.tc1 === S.tc2) S.f2 |= F2.clr_in; }
      else if (S.tc1 === 0xFF){ if (S.tc1 === S.tc2) S.f2 |= F2.clr_in; }
      else { S.dac2 = T(S.tc1); S.tc1 = (S.tc1+1)&255; }
    };
    if (S.f1 & F1.in1){
      if (S.tc1 !== 0xFF){ S.dac2 = T(0xFF - S.tc1); S.tc1 = (S.tc1+1)&255; }
      if (S.f1 & F1.in2) doA2();
      else if (S.tc2 === 0xFF){ if (S.tc1 === S.tc2) S.f2 |= F2.clr_in; }
      else { S.dac1 = T(S.tc2); S.tc2 = (S.tc2+1)&255; }
    } else doA2();
    if (S.f2 & F2.clr_in){ S.f1 &= ~(F1.in1|F1.in2); S.f2 &= ~F2.clr_in; kind = 'end'; }
    fh = 14 + 19*look;
  } else {
    // switch(): the v101 cut
    kind = 'cut'; sw = 14;
    if (S.f1 & F1.in1){ S.dac1 = 0xFF; S.dac2 = 0; }
    else if (S.f1 & F1.in2){ S.dac2 = 0xFF; S.dac1 = 0; }
    S.f1 &= ~(F1.in1|F1.in2); S.rc5 = 0; S.cuts++;
  }
  const bits = outputDtoA(S);
  const clr = C.LAT + 8 + fh + sw + C.DTOA + 1;
  let len = clr + C.TAIL;
  const done = !(S.f1 & (F1.in1|F1.in2));
  if (done){ S.tc1 = 0; S.tc2 = 0; S.f2 &= ~F2.special; S.peie = false; len += 5; }
  return { clr, len, dacAt: clr - 4, done, kind, look, before, bits };
}

/* ---------------- replay: run the firmware over the whole run ---------------- */
let SIMC = null, SIMKEY = '';
function powerSegments(){
  const ps = D.ev.filter(e=>e.kind==='power').map(e=>e.t).sort((a,b)=>a-b);
  const seg = []; let on = true, from = 0;
  ps.forEach(t=>{ if (on){ if (t>from) seg.push([from,t]); on=false; } else { from=t; on=true; } });
  if (on) seg.push([from, C.DUR]);
  return seg;
}
function inputsAt(ts){
  const t = ts*C.TCY; let btn = 0xFF, dry1=false, dry2=false, adres = D.adres0;
  for (const e of D.ev){
    if (e.kind==='btn' && t>=e.t && t<e.t+e.dur) btn &= ~(1<<e.bit);
    if (e.t > t) continue;
    if (e.kind==='tally'){ if (e.n===1) dry1=e.on; else dry2=e.on; }
    if (e.kind==='trim') adres = e.adres;
  }
  return {btn, dry1, dry2, adres};
}
function srcOn(k, t){ let on = true; for (const e of D.ev) if (e.kind==='src' && e.n===k && e.t<=t) on = e.on; return on; }
function simulate(){
  const key = JSON.stringify([D.ev, D.adres0, D.ram]);
  if (key === SIMKEY && SIMC) return SIMC;
  SIMKEY = key;
  const out = { passes:[], isrs:[], dacs:[], segs: powerSegments(), races:[], pins:[], inits:[] };
  const EV = D.ev.slice().sort((a,b)=>a.t-b.t); D.ev = EV;
  for (const [a,b] of out.segs){
    const S = newState(); const A = a/C.TCY, B = b/C.TCY;
    const inotes = []; const ibits = init(S, s=>inotes.push(s));
    out.inits.push({t:a, notes:inotes, bits:ibits});
    out.dacs.push({t:a, a1:0, a2:0, por:true});                                   // LT1451 power-on reset = zero scale → both VCAs at unity
    out.dacs.push({t:a+330*C.TCY, a1:S.u4out, a2:S.u5out, bits:ibits, init:true});
    let t = A + 400, idx = 0, lastPins = '';
    while (t < B){
      const ts = t, notes = []; const n = s=>notes.push(s);
      const inp = inputsAt(ts);
      input(S, inp); debounce(S, n); flashRout(S); debounceDry(S, n); pbLedOutput(S, n); dryLedOutput(S, n);
      const ad = atod(S, inp, n);
      const enabled = fadeSet(S, ts + STEP_OFF[7] + 10, n);
      const rec = { i: idx++, t0: ts*C.TCY, portb: S.portb, led: S.led, f1: S.f1, f2: S.f2, tc1: S.tc1, tc2: S.tc2, dac1: S.dac1, dac2: S.dac2,
        adres: S.adres, timeReg: S.timeReg, pr2: S.pr2, peie: S.peie, ad, notes, b2: S.b2, inReg: S.inReg, inReg2: S.inReg2, isrN: 0, enabled };
      let rem = C.PASS_CYC, cur = ts, done = 0;
      while (rem > 0){
        if (S.peie && S.nextStart < cur + rem && S.nextStart < B){
          const run = Math.max(0, S.nextStart - cur); rem -= run; done += run; cur = Math.max(cur, S.nextStart);
          const off = done;
          const race = (off>=WIN_A[0]&&off<WIN_A[1])?'A':(off>=WIN_B[0]&&off<WIN_B[1])?'B':(ad==='setup'&&off>=WIN_C[0]&&off<WIN_C[1])?'C':null;
          const r = isr(S);
          const rec2 = { t0: cur*C.TCY, tclr: (cur+r.clr)*C.TCY, t1:(cur+r.len)*C.TCY, tdac:(cur+r.dacAt)*C.TCY, dac1:S.dac1, dac2:S.dac2,
            tc1:S.tc1, tc2:S.tc2, before:r.before, kind:r.kind, done:r.done, look:r.look, lost:[], pass: rec.i, race, P:S.P, pr2:S.pr2, ireg:S.ireg, bits:r.bits };
          out.dacs.push({t: rec2.tdac, a1:S.u4out, a2:S.u5out, isr: out.isrs.length});
          if (race){ out.races.push({t:rec2.t0, win:race, pass:rec.i}); rec.race = race; if (race==='B') rec.blackFrom = rec2.t1; }
          rec.isrN++;
          // timer-2 matches: every P cycles from tEn; those before the TMR2IF clear are lost
          const firstK = Math.floor((cur - C.LAT - S.tEn)/S.P + 1e-9);
          const clrAbs = cur + r.clr;
          let k = firstK + 1;
          while (S.tEn + k*S.P <= clrAbs){ rec2.lost.push((S.tEn + k*S.P)*C.TCY); k++; }
          const m = S.tEn + k*S.P, end = cur + r.len;
          out.isrs.push(rec2);
          if (S.peie) S.nextStart = (m < end) ? end : m + C.LAT; else S.nextStart = Infinity;
          cur = end;
        } else { cur += rem; done += rem; rem = 0; }
      }
      rec.t1 = cur*C.TCY; rec.starved = (cur - ts) > C.PASS_CYC*1.5;
      rec.fEnd = S.f1; rec.tc1End = S.tc1; rec.tc2End = S.tc2; rec.portbEnd = S.portb; rec.rc = [S.rc0,S.rc4,S.rc5];
      const pk = rec.rc.join('');
      if (pk !== lastPins){ out.pins.push({t: rec.t0, rc: rec.rc.slice()}); lastPins = pk; }
      out.passes.push(rec);
      t = cur;
    }
    out.passes.push({ i:-1, t0: b, t1: b, off:true, portb:0xFF, led:0xFF, notes:[], f1:0, f2:0, tc1:0, tc2:0, adres:0, timeReg:0, pr2:0 });
    out.dacs.push({t:b, a1:-1, a2:-1, off:true});
    out.final = S;
  }
  out.passes.sort((x,y)=>x.t0-y.t0); out.dacs.sort((x,y)=>x.t-y.t);
  const real = out.passes.filter(p=>p.i>=0);
  out.avgPass = real.length? real.slice(0,50).reduce((a,p)=>a+(p.t1-p.t0),0)/Math.min(50,real.length) : C.PASS_CYC*C.TCY;
  SIMC = out; return out;
}
function bs(arr, t, key){ let lo=0, hi=arr.length-1, r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if (arr[m][key||'t0']<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function passAt(t){ const P = simulate().passes; const i = bs(P, t); return i<0? null : P[i]; }
function poweredAt(t){ return simulate().segs.some(([a,b])=>t>=a && t<b); }
function isrAt(t){ const I = simulate().isrs; const i = bs(I, t); return i<0? null : I[i]; }
function lastIsrBefore(t){ const I = simulate().isrs; const i = bs(I, t); return i<0? null : I[i]; }
function fadeSeconds(timeReg){ // 256 interrupts × the effective period (ISR-bound when shorter than the ISR)
  const P = C.T2_MUL*(timeReg+1), L = C.LAT+8+(14+38)+5+C.DTOA+1+C.TAIL, clr = C.LAT+8+(14+38)+5+C.DTOA+1;
  let step = P; if (P <= clr - C.LAT) step = 2*P; else if (P < L) step = L;
  return 256*step*C.TCY;
}

/* LEDs and audio at time t */
function ledsAt(t){
  const p = passAt(t); const on = poweredAt(t);
  if (!on || !p || p.off) return { pwr: on?1:0, b: [0,0,0,0,0,0,0] };
  let pb = p.portbEnd!==undefined ? p.portbEnd : p.portb;
  const dark = p.blackFrom!==undefined && t>=p.blackFrom;
  const b = [0,1,2,3,4,5,6].map(i=> dark ? 0 : ((pb>>i)&1)?0:1);
  b[4] = 0;   // RB4: there is no button or LED for the unused switch position on the panel
  return { pwr:1, b };
}
function calK(){ return D.cal==='deep' ? 100/255 : DBK; }
function attAt(t, ch){ // ch 1 = input 1 (U4, FADE 1), 2 = input 2 (U5, FADE 2) — returns dB attenuation, Infinity when off
  const A = simulate().dacs; const i = bs(A, t, 't'); if (i<0) return Infinity;
  const e = A[i]; if (e.off) return Infinity;
  const code = e => (ch===1? e.a1 : e.a2)/16 * calK();
  const tgt = code(e); const pe = i>0 && !A[i-1].off ? code(A[i-1]) : tgt;
  return tgt + (pe - tgt)*Math.exp(-(t - e.t)/C.RC_TAU);
}
function gainAt(t, ch){ const a = attAt(t, ch); return a===Infinity? 0 : Math.pow(10, -a/20); }
const SRC_F = [0, 400, 1000];
function srcSample(k, t){ return srcOn(k,t) ? 0.7*Math.sin(2*Math.PI*SRC_F[k]*t + (k===2?0.6:0)) : 0; }
function outSample(t){ return gainAt(t,1)*srcSample(1,t) + gainAt(t,2)*srcSample(2,t); }

/* ---------------- user actions ---------------- */
function act(name, fn, settle){
  const t = SIM.t;
  fn(t);
  SIMKEY = ''; const R = simulate();
  const tr = [];
  const tEnd = t + (settle||0.35);
  R.passes.forEach(p=>{ if (p.t0>=t-1e-9 && p.t0<=tEnd && p.notes && p.notes.length) p.notes.forEach(s=>tr.push(`<span class="muted">${SIM.fmtT(p.t0)} pass #${p.i}</span> ${s}`)); });
  const fades = R.isrs.filter(x=>x.t0>=t);
  if (fades.length){
    const first = fades[0]; let last = first; for (const x of fades){ if (x.t0 - last.t0 > 0.05 && last.done) break; last = x; if (x.done) break; }
    const set = fades.slice(0, fades.indexOf(last)+1);
    const lost = set.reduce((a,x)=>a+x.lost.length,0);
    if (first.kind==='cut') tr.push(`ISR at ${SIM.fmtT(first.t0)}: fade_how returns (hard_switch) → <b>switch</b> writes dac1/dac2 = ${hex(first.dac1)}/${hex(first.dac2)} → output_DtoA → done in one interrupt (${SIM.fmtDur(first.t1-first.t0)})`);
    else tr.push(`Timer 2 ISR × ${set.length}: fade_how → ${MODE_NAME(first.ireg)} table → dac1/dac2 → output_DtoA, from ${SIM.fmtT(first.t0)} to ${SIM.fmtT(last.t1)} (${SIM.fmtDur(last.t1-first.t0)}); ${lost? lost+' Timer 2 matches lost (TMR2IF cleared while the ISR was still running)':'no matches lost'}`);
  }
  D.lastTrace = tr.slice(0, 40);
  D.log.unshift({ t, name, trace: D.lastTrace });
  if (D.log.length>60) D.log.length = 60;
  SIM.refresh();
}
const A = {
  press(bit){ const b = BTN.find(x=>x.bit===bit);
    act('Press '+(b?b.short:'bit '+bit), t=>{ D.ev.push({t, kind:'btn', bit, dur:C.PRESS}); });
    if (SIM.t + 0.03 < C.DUR) SIM.seek(SIM.t + 0.03);
  },
  tally(nn){ const on = !inputsAt(SIM.t/C.TCY)['dry'+nn];
    act(`Tally ${nn} ${on?'ON (WET +12 V applied)':'OFF (released)'}`, t=>{ D.ev.push({t, kind:'tally', n:nn, on}); });
    if (SIM.t + 0.03 < C.DUR) SIM.seek(SIM.t + 0.03);
  },
  trim(adres){ adres = Math.max(0, Math.min(255, Math.round(adres)));
    act(`FADE TIME trim → ADRES ${hex(adres)} (${adres>0xF7?'CUT':fadeSeconds(0xFF-adres).toFixed(2)+' s'})`, t=>{
      if (t < 0.001) D.adres0 = adres; else D.ev.push({t, kind:'trim', adres}); }, 0.02);
  },
  trimStep(dir){ const cur = inputsAt(SIM.t/C.TCY).adres; A.trim(cur - dir*16); },   // clockwise = toward 2SEC = lower ADRES (silk)
  power(){ act(poweredAt(SIM.t)?'Power off':'Power on', t=>{ D.ev.push({t, kind:'power'}); }, 0.02); },
  src(k){ const on = !srcOn(k, SIM.t); act(`Input ${k} programme ${on?'connected':'removed'}`, t=>{ D.ev.push({t, kind:'src', n:k, on}); }, 0.01); },
  clear(){ D.ev = []; D.log = []; D.lastTrace = []; SIMKEY=''; SIM.seek(0); },
  demo(){ D.ev = demoEvents(); D.adres0 = 128; D.log = []; D.lastTrace = []; SIMKEY=''; SIM.seek(0); },
  settle(){ const R = simulate(); const after = R.isrs.filter(x=>x.t0>=SIM.t); const d = after.find(x=>x.done); SIM.seek(Math.min(C.DUR, d? d.t1+0.01 : SIM.t+0.05)); },
};

/* ================================================================
   DRAWING: front and rear panels on the real silkscreen
   ================================================================ */
/* POD16 - #ARTWORK #DA #2016/POD16-FRONT&REAR(CURVE).pdf (Jun.25/14): FRONT GREEN, FRONT WHITE and REAR WHITE
   separations cut at 200 dpi into assets/pod16-*.png (1713 × 321 px = the 8.570" × 1.606" panel). Controls are put
   at the drill positions of POD16-FRONT ISS 1 and POD16-REAR ISS 4 (× 200 px/in); colours from Pics/POD16 Front/Rear.jpg. */
const ASSET = 'siumulation-plugins/assets/';
const W = 1713, H = 321;
function trimAngle(adres){ const p = 1 - adres/255; return -120 + 240*p; }   // silk: CUT lower-left, 1SEC top, 2SEC lower-right
function frontSVG(t, opts){
  opts = opts||{};
  const L = ledsAt(t), inp = inputsAt(t/C.TCY), on = poweredAt(t);
  const btn = b=>{ const lit = L.b[b.bit];
    return `<g class="pbtn" data-bit="${b.bit}" style="cursor:pointer"><title>${b.label}</title>
      <rect x="${b.x-38}" y="122" width="76" height="76" rx="6" fill="#0b0c0d"/>
      <rect x="${b.x-33}" y="127" width="66" height="66" rx="5" fill="#1e2124" stroke="#383c40" stroke-width="2"/>
      <rect x="${b.x-14}" y="152" width="28" height="16" rx="2" fill="${lit?'#ff3a4c':'#c9cdd2'}" ${lit?'filter="url(#glow16)"':''} opacity="${lit?1:.55}"/></g>`; };
  const ang = trimAngle(inp.adres);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="POD16 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="glow16" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${W}" height="${H}" rx="10" fill="#17191b"/>
    <image href="${ASSET}pod16-front-green.png" width="${W}" height="${H}"/>
    <image href="${ASSET}pod16-front-white.png" width="${W}" height="${H}"/>
    <g class="pwr" style="cursor:pointer"><title>Power rocker (P2 “TO SWITCH”)</title><rect x="130" y="54" width="101" height="154" rx="6" fill="#0a0b0c" stroke="#2c2f33" stroke-width="2"/>
      <rect x="146" y="${on?66:104}" width="69" height="90" rx="10" fill="#1b1d20" stroke="#3a3e42" stroke-width="2"/><rect x="152" y="${on?72:140}" width="57" height="10" rx="4" fill="#2a2d31"/></g>
    <circle cx="299" cy="218" r="13" fill="#0a0b0b"/><circle cx="299" cy="218" r="9.5" fill="${L.pwr?'#c8ff4a':'var(--led-off)'}" ${L.pwr?'filter="url(#glow16)"':''}/>
    <g class="trim" style="cursor:pointer"><title>FADE TIME trim (RV1 → RA0). Click left = toward CUT, right = toward 2SEC; mouse wheel turns it.</title>
      <circle cx="480" cy="209" r="44" fill="transparent"/><circle cx="480" cy="209" r="15" fill="#a9adb1" stroke="#55595e" stroke-width="2"/>
      <line x1="${480-12*Math.sin(ang*Math.PI/180)}" y1="${209+12*Math.cos(ang*Math.PI/180)}" x2="${480+12*Math.sin(ang*Math.PI/180)}" y2="${209-12*Math.cos(ang*Math.PI/180)}" stroke="#2a2c2f" stroke-width="4" stroke-linecap="round"/></g>
    ${BTN.map(btn).join('')}
    ${[[50,160],[555,160],[1005,160],[1455,160],[1664,160]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="#3a3d40" stroke="#5a5e62"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#1b1d1f" stroke-width="3"/>`).join('')}
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const inp = inputsAt(t/C.TCY);
  const tb = (x,y,id,title,act)=>`<g ${id?`class="tb" data-tb="${id}" style="cursor:pointer"`:''}><title>${title}</title>
      <rect x="${x-53}" y="${y-32}" width="106" height="64" rx="3" fill="#0b0c0d"/>
      <rect x="${x-50}" y="${y-29}" width="100" height="58" rx="3" fill="${act?'#43c06b':'#36a35a'}" stroke="#1d6b37" stroke-width="2"/>
      ${[-31,0,31].map(d=>`<rect x="${x+d-12}" y="${y-18}" width="24" height="26" rx="2" fill="#1f6e3a"/><circle cx="${x+d}" cy="${y+18}" r="5" fill="#cfd5d0"/>`).join('')}</g>`;
  const dot = (x,y,on,col)=>`<circle cx="${x}" cy="${y}" r="9" fill="${on?col:'#444'}" stroke="#111"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="POD16 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="${W}" height="${H}" rx="10" fill="#17191b"/>
    ${tb(327,57,'s1','INPUT 1 LEFT (H1 pins 6/5) — click to connect/remove the programme', srcOn(1,t))}${tb(327,168,'s1','INPUT 1 RIGHT', srcOn(1,t))}
    ${tb(497,57,'s2','INPUT 2 LEFT (H1 pins 3/2) — click to connect/remove the programme', srcOn(2,t))}${tb(497,168,'s2','INPUT 2 RIGHT', srcOn(2,t))}
    ${tb(757,57,'','OUTPUT LEFT (H3, U7A/U7B via 30R)')}${tb(757,168,'','OUTPUT RIGHT (H3, U6A/U6B via 30R)')}
    ${tb(925,57,'t1','CTL 1: WET (+3…+30 V) / DRY (ground) / GND — click to apply or release tally 1', inp.dry1)}${tb(925,168,'t2','CTL 2: WET / DRY / GND — click for tally 2', inp.dry2)}
    ${dot(990,26,inp.dry1,'#ffb43a')}${dot(990,292,inp.dry2,'#ffb43a')}
    <rect x="1100" y="162" width="154" height="93" rx="10" fill="#0d0e0f" stroke="#2c2f33" stroke-width="2"><title>DE-9 cut-out (.465 × .768) for the RS422 option — blanked off: U1/U2 75176 “not installed”</title></rect>
    <text x="1177" y="214" text-anchor="middle" font-size="18" fill="#55595d">RS422 (blank)</text>
    <circle cx="1374" cy="160" r="52" fill="#121314" stroke="#2c2f33" stroke-width="3"/><circle cx="1374" cy="160" r="40" fill="#1d1f21"/><text x="1374" y="167" text-anchor="middle" font-size="20" fill="#6c7074">FUSE</text>
    <circle cx="1534" cy="160" r="50" fill="#0f1011" stroke="#2c2f33" stroke-width="3"/><rect x="1514" y="132" width="40" height="56" rx="8" fill="#1d1f21"/>
    ${[[50,160],[1664,160],[230,101],[230,196],[1010,102],[1010,196],[1078,208],[1275,208]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="#3a3d40" stroke="#5a5e62"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#1b1d1f" stroke-width="3"/>`).join('')}
    <image href="${ASSET}pod16-rear-white.png" width="${W}" height="${H}"/>
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.pbtn').forEach(g=> g.addEventListener('click', ()=>A.press(+g.dataset.bit)));
  const p = root.querySelector('.pwr'); if (p) p.addEventListener('click', ()=>A.power());
  const tr = root.querySelector('.trim'); if (tr){
    tr.addEventListener('click', e=>{ const r=tr.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; A.trimStep(x<0.5?-1:1); });
    tr.addEventListener('wheel', e=>{ e.preventDefault(); A.trimStep(e.deltaY<0?1:-1); }, {passive:false});
  }
  root.querySelectorAll('.tb').forEach(g=> g.addEventListener('click', ()=>{ const k=g.dataset.tb; if (k==='t1') A.tally(1); else if (k==='t2') A.tally(2); else if (k==='s1') A.src(1); else if (k==='s2') A.src(2); }));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    ${BTN.map(b=>`<button data-a="b${b.bit}" title="${b.label}">${b.short}</button>`).join('')}
    <span class="small muted" style="margin-left:8px">FADE TIME</span><button data-a="tl" title="toward CUT">⟲</button><button data-a="tr" title="toward 2SEC">⟳</button>
    <select data-a="tp" title="Trim position"><option value="">set…</option><option value="255">CUT (full CCW)</option><option value="246">fastest fade (ADRES 0xF6)</option><option value="192">≈ 0.5 s</option><option value="128">1SEC (centre)</option><option value="0">2SEC (full CW)</option></select>
    <span class="small muted" style="margin-left:8px">Tally</span><button data-a="t1">CTL 1</button><button data-a="t2">CTL 2</button>
    <button data-a="pw">Power</button><button data-a="st" title="Move the playhead to where the running fade ends">⏭ settle</button></div>
    <div class="small muted" style="margin-top:4px">Keys: M manual · 1 2 3 modes · Q W inputs · [ ] trim · T Y tallies. Each action is recorded at the playhead and the firmware is replayed from power-up; the playhead then moves on 30 ms. Press ▶ Play or drag the slider to watch a fade.</div>`;
}
function bindControls(root){
  const map = { tl:()=>A.trimStep(-1), tr:()=>A.trimStep(1), t1:()=>A.tally(1), t2:()=>A.tally(2), pw:()=>A.power(), st:()=>A.settle() };
  BTN.forEach(b=> map['b'+b.bit] = ()=>A.press(b.bit));
  root.querySelectorAll('button[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a] && map[b.dataset.a]());
  root.querySelectorAll('select[data-a="tp"]').forEach(s=> s.onchange=()=>{ if (s.value!=='') A.trim(+s.value); s.value=''; });
}
document.addEventListener('keydown', e=>{
  if (!window.__pod16Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase();
  const m = { m:()=>A.press(0), '1':()=>A.press(1), '2':()=>A.press(2), '3':()=>A.press(3), q:()=>A.press(5), w:()=>A.press(6), '[':()=>A.trimStep(-1), ']':()=>A.trimStep(1), t:()=>A.tally(1), y:()=>A.tally(2) };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const R = simulate(); const css = n=>SIM.css(n);
  const ls = [];
  const txt = (c,s,x,y)=>{ c.fillStyle=css('--ink2'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  ls.push({label:'Operator: buttons · tallies · trim', h:30, draw(c,X,t0,t1,y,h){
    D.ev.forEach(e=>{
      if (e.kind==='btn'){ c.fillStyle=css('--accent2'); c.fillRect(X(e.t), y+3, Math.max(2,X(e.t+e.dur)-X(e.t)), 10); c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText((BTN.find(b=>b.bit===e.bit)||{short:'?'}).short, X(e.t)+3, y+24); }
      if (e.kind==='trim' || e.kind==='power' || e.kind==='src'){ c.fillStyle=css('--warn'); c.fillRect(X(e.t)-1, y+2, 3, h-4); c.font='10px sans-serif'; c.fillStyle=css('--ink'); c.fillText(e.kind==='trim'?'trim '+hex(e.adres):e.kind==='power'?'power':'src '+e.n, X(e.t)+4, y+12); }
    });
    [1,2].forEach(n=>{ let on=false, from=0; const segs=[]; D.ev.filter(e=>e.kind==='tally'&&e.n===n).forEach(e=>{ if(e.on&&!on){on=true;from=e.t;} else if(!e.on&&on){on=false;segs.push([from,e.t]);} }); if(on) segs.push([from,C.DUR]);
      c.fillStyle='#e8a33a'; segs.forEach(([a,b])=>c.fillRect(X(a), y+14+(n-1)*7, X(b)-X(a), 5)); });
  }});
  ls.push({label:'PIC main loop (passes / steps)', h:34, draw(c,X,t0,t1,y,h){
    const P = R.passes; let i0 = Math.max(0, bs(P,t0)); const pxPass = X(t0+R.avgPass)-X(t0); let shown = 0;
    for (let i=i0; i<P.length && P[i].t0<=t1; i++){ const p=P[i]; if (p.off){ c.fillStyle=css('--ink2'); c.globalAlpha=.2; const nx=P[i+1]?P[i+1].t0:C.DUR; c.fillRect(X(p.t0),y+3,X(nx)-X(p.t0),h-6); c.globalAlpha=1; txt(c,'power off',Math.max(X(t0),X(p.t0))+4,y+h/2+4); continue; }
      shown++;
      if (pxPass > 80 && !p.starved){
        STEPS.forEach((s,j)=>{ const a=p.t0+STEP_OFF[j]*C.TCY, b=a+s[1]*C.TCY; c.fillStyle = j===8? css('--accent2') : css('--accent'); c.globalAlpha = j%2?.55:.85; c.fillRect(X(a), y+3, Math.max(1,X(b)-X(a)-0.5), h-6); c.globalAlpha=1;
          if (X(b)-X(a) > 60){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0], X(a)+3, y+h/2+3); } });
        if (pxPass > 4000){ c.fillStyle=css('--warn'); [WIN_A,WIN_B].concat(p.ad==='setup'?[WIN_C]:[]).forEach(w=>{ const a=p.t0+w[0]*C.TCY, b=p.t0+w[1]*C.TCY; c.fillRect(X(a), y, Math.max(2,X(b)-X(a)), 4); }); }
      } else { c.fillStyle = p.starved? css('--warn') : (p.i%2? css('--accent2') : css('--accent')); c.globalAlpha=.75; c.fillRect(X(p.t0), y+3, Math.max(1,X(p.t1)-X(p.t0)-0.5), h-6); c.globalAlpha=1; }
      if (p.race){ c.fillStyle=css('--bad'); c.fillRect(X(p.t0), y, 4, h); }
    }
    if (pxPass < 3) txt(c, `${shown} passes (${SIM.fmtDur(R.avgPass)} each when idle); orange = starved by the fade interrupt; red tick = ISR hit a bank-1 window`, X(t0)+6, y+h/2+4);
  }});
  ls.push({label:'AtoD on RA0: ADRES → time_reg', h:24, draw(c,X,t0,t1,y,h){
    const P = R.passes; let i0 = Math.max(0, bs(P,t0)); const px = X(t0+R.avgPass)-X(t0);
    for (let i=i0; i<P.length && P[i].t0<=t1; i++){ const p=P[i]; if (p.off||!p.ad) continue;
      c.fillStyle = p.ad==='read'? css('--accent') : p.ad==='start'? css('--accent2') : css('--grid'); c.fillRect(X(p.t0), y+5, Math.max(1, px*0.9), h-10);
      if (px > 70 && p.ad==='read'){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`${hex(p.adres)}→${p.timeReg===1&&(p.f2&F2.hard)?'CUT':hex(p.timeReg)}`, X(p.t0)+2, y+h/2+3); } }
    if (px < 30) txt(c, 'set-up / start / read: one reading every 3 passes', X(t0)+6, y+h/2+4);
  }});
  ls.push({label:'Timer 2 interrupt (fade step)', h:30, draw(c,X,t0,t1,y,h){
    const I = R.isrs; let i0 = Math.max(0, bs(I,t0)-1); let n=0;
    for (let i=i0; i<I.length && I[i].t0<=t1; i++){ const s=I[i]; n++;
      c.fillStyle = s.kind==='cut'? css('--warn') : s.done? css('--bad') : css('--accent2'); c.fillRect(X(s.t0), y+4, Math.max(1.5, X(s.t1)-X(s.t0)), h-8);
      c.fillStyle=css('--bad'); s.lost.forEach(tl=>{ c.fillRect(X(tl)-1, y, 2, h); });
      if (X(s.t1)-X(s.t0) > 120){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(`${s.kind} · tc ${hex(s.before.tc1)}/${hex(s.before.tc2)} → dac ${hex(s.dac1)}/${hex(s.dac2)}`, X(s.t0)+3, y+h/2+3); }
    }
    if (!n) txt(c, 'no fade running (GIE/PEIE off)', X(t0)+6, y+h/2+4);
  }});
  ls.push({label:'DAC serial: CLK · DATA · CS', h:30, draw(c,X,t0,t1,y,h){
    const Dc = R.dacs.filter(d=>d.bits && d.t>=t0-0.001 && d.t<=t1+0.001);
    const bitT = 10*C.TCY;
    Dc.forEach(d=>{ const start = d.t - d.bits.length*bitT; const pxBit = X(start+bitT)-X(start);
      if (pxBit < 3){ c.fillStyle=css('--ink2'); c.fillRect(X(start), y+8, Math.max(1,X(d.t)-X(start)), h-16); return; }
      c.strokeStyle=css('--ink'); c.lineWidth=1; c.beginPath();
      d.bits.forEach((b,k)=>{ const a=start+k*bitT; const yy = b? y+8 : y+18; c.moveTo(X(a), yy); c.lineTo(X(a+bitT), yy); }); c.stroke();
      c.fillStyle=css('--accent2'); d.bits.forEach((b,k)=>{ const a=start+k*bitT+6*C.TCY; c.fillRect(X(a), y+22, Math.max(1,X(a+2*C.TCY)-X(a)), 5); });
      c.fillStyle=css('--warn'); c.fillRect(X(d.t), y+2, Math.max(2, X(d.t+2*C.TCY)-X(d.t)), h-4);
      if (pxBit > 12) d.bits.forEach((b,k)=>{ c.fillStyle=css('--ink'); c.font='9px '+css('--mono'); c.fillText(b, X(start+k*bitT)+2, y+7); });
    });
  }});
  ls.push({label:'DAC codes: U4 → IN 1 · U5 → IN 2', h:40, draw(c,X,t0,t1,y,h){
    const Dl = R.dacs; let i0 = Math.max(0, bs(Dl,t0,'t')-1);
    [['a1',css('--accent')],['a2',css('--bad')]].forEach(([k,col])=>{ c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); let started=false;
      for (let i=i0; i<Dl.length && Dl[i].t<=t1; i++){ const d=Dl[i]; if (d.off){ started=false; continue; } const v=d[k]/4095; const yy=y+h-3-v*(h-6); const nx = (Dl[i+1]?Math.min(Dl[i+1].t,t1):t1);
        if (!started){ c.moveTo(X(Math.max(d.t,t0)),yy); started=true; } else c.lineTo(X(d.t),yy); c.lineTo(X(nx),yy); }
      c.stroke(); });
    txt(c,'12-bit code (top = 4095 = most attenuation)', X(t0)+6, y+11);
  }});
  ls.push({label:'VCA gain, dB (IN 1 green · IN 2 red · sum)', h:56, draw(c,X,t0,t1,y,h){
    const N = Math.min(900, Math.max(120, (X(t1)-X(t0)))); const span=t1-t0; const lo=-50;
    const Y_ = db=> y+3 + (Math.min(0,Math.max(lo,db))/lo)*(h-6);
    c.strokeStyle=css('--grid'); [ -6, -24, -48].forEach(db=>{ c.beginPath(); c.moveTo(X(t0),Y_(db)); c.lineTo(X(t1),Y_(db)); c.stroke(); });
    [[1,css('--accent')],[2,css('--bad')],[0,css('--ink2')]].forEach(([ch,col])=>{ c.strokeStyle=col; c.lineWidth=ch?1.6:1; c.setLineDash(ch?[]:[4,3]); c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N; let db; if (ch){ const a=attAt(tt,ch); db = a===Infinity? lo : -a; } else { const p = gainAt(tt,1)**2 + gainAt(tt,2)**2; db = p>0? 10*Math.log10(p) : lo; } const yy=Y_(db); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); }
      c.stroke(); c.setLineDash([]); });
    txt(c,'0 · −6 · −24 · −48 dB; dashed = power sum (uncorrelated programme)', X(t0)+6, y+h-4);
  }});
  ls.push({label:'Audio: OUTPUT left (IN 1 400 Hz + IN 2 1 kHz)', h:44, draw(c,X,t0,t1,y,h){
    const span=t1-t0, pw=X(t1)-X(t0);
    if (span*1000 > pw/3){ const N=Math.min(700,pw); c.fillStyle=css('--accent'); c.globalAlpha=.4;
      for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; const a=0.7*(gainAt(tt,1)*(srcOn(1,tt)?1:0)+gainAt(tt,2)*(srcOn(2,tt)?1:0)); c.fillRect(X(t0)+pw*i/N, y+h/2-a*(h/2-3)/1.4, pw/N+0.5, 2*a*(h/2-3)/1.4); }
      c.globalAlpha=1; txt(c,'envelope (zoom in to see the waveform)', X(t0)+6, y+11); return; }
    const N=Math.min(1600,Math.max(200,pw*2)); c.strokeStyle=css('--ink'); c.lineWidth=1.2; c.beginPath();
    for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=outSample(tt)/1.4; const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke();
  }});
  ls.push({label:'LEDs: MAN · LOG · CROSS · V · IN1 · IN2', h:44, draw(c,X,t0,t1,y,h){
    const N=Math.min(700, Math.max(80,(X(t1)-X(t0))/2)); const span=t1-t0; const bits=[0,1,2,3,5,6];
    bits.forEach((bt,r)=>{ c.fillStyle = r>=4? '#ff3a4c' : r? '#e25563' : '#ff6a3a'; for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; if (ledsAt(tt).b[bt]) c.fillRect(X(t0+span*i/N), y+2+r*7, (X(t1)-X(t0))/N+0.5, 5); } });
  }});
  ls.push({label:'Test pins RC0 · RC4 · RC5', h:26, draw(c,X,t0,t1,y,h){
    const Pn = R.pins; [0,1,2].forEach(k=>{ c.fillStyle=[css('--accent'),css('--warn'),css('--accent2')][k];
      for (let i=0;i<Pn.length;i++){ const a=Pn[i].t, b=Pn[i+1]?Pn[i+1].t:C.DUR; if (b<t0||a>t1) continue; if (Pn[i].rc[k]) c.fillRect(X(Math.max(a,t0)), y+3+k*7, X(Math.min(b,t1))-X(Math.max(a,t0)), 5); } });
  }});
  return ls;
}

/* ---------------- scope: one DAC frame (24 + 8 clocks) ---------------- */
function drawScope(cv, info, t){
  const R = simulate(); const k = bs(R.dacs, t, 't'); let d = null;
  for (let i=k; i>=0; i--) if (R.dacs[i] && R.dacs[i].bits){ d = R.dacs[i]; break; }
  const {c,w} = SIM.canvas(cv, 170);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn'), bad=SIM.css('--bad');
  if (!d){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText('No DAC write yet at the playhead.', 10, 30); info.innerHTML=''; return; }
  const bits = d.bits, n = bits.length, cw = (w-30)/Math.max(n,24);
  const x0 = 20;
  c.font='11px '+SIM.css('--mono');
  [['CLK',30],['DATA',70],['CS',110]].forEach(([l,y])=>{ c.fillStyle=ink2; c.fillText(l, 0, y-10); });
  c.strokeStyle=a2; c.beginPath(); for (let i=0;i<n;i++){ const x=x0+i*cw; c.moveTo(x,34); c.lineTo(x+cw*0.6,34); c.lineTo(x+cw*0.6,20); c.lineTo(x+cw*0.8,20); c.lineTo(x+cw*0.8,34); c.lineTo(x+cw,34); } c.stroke();
  c.strokeStyle=ink; c.beginPath(); bits.forEach((b,i)=>{ const x=x0+i*cw, y= b? 58 : 74; if(i===0) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.strokeStyle=warn; c.beginPath(); c.moveTo(x0-10,98); c.lineTo(x0,98); c.lineTo(x0,112); c.lineTo(x0+n*cw,112); c.lineTo(x0+n*cw,98); c.lineTo(x0+n*cw+12,98); c.stroke();
  if (n===32 || n===24+8){
    const zones=[[0,8,acc,'dac1_reg'],[8,12,ink2,'0000'],[12,20,bad,'dac2_reg'],[20,24,ink2,'0000']];
    zones.forEach(([a,b,col,l])=>{ c.fillStyle=col; c.globalAlpha=.13; c.fillRect(x0+a*cw,14,(b-a)*cw,104); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(l, x0+a*cw+2, 130); });
  }
  bits.forEach((b,i)=>{ if (cw>12){ c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(b, x0+i*cw+cw*0.35, 90); } });
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono');
  c.fillText(`${n} clocks · one bit ≈ 10 Tcy = ${SIM.fmtDur(10*C.TCY)} · frame ≈ ${SIM.fmtDur(n*10*C.TCY)} · CS rises at ${SIM.fmtT(d.t)}`, 0, 158);
  const isr = d.isr!==undefined ? R.isrs[d.isr] : null;
  info.innerHTML = `First 12 bits shifted end up in <b>U5</b> (it is downstream: U4 DO → U5 DI) → FADE 2 → input 2 VCAs U11/U9; the last 12 stay in <b>U4</b> → FADE 1 → input 1 VCAs U12/U10. So <span class="mono">dac1_reg</span> sets input 2 and <span class="mono">dac2_reg</span> sets input 1.<br>
    Latched: U4 = ${hex(d.a1,3)} (${(d.a1/16*calK()).toFixed(1)} dB on input 1) · U5 = ${hex(d.a2,3)} (${(d.a2/16*calK()).toFixed(1)} dB on input 2)${d.init?' — written by init':''}${isr?` — ISR in pass #${isr.pass}, ${isr.kind}`:''}.`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){
  return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>` + D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('')
    : '<div class="muted">Press a button, turn the trim or apply a tally. The routines the PIC runs for it are listed here. (The demo run already holds six actions; see the Operator lane.)</div>';
}
function inspectorHTML(t){
  const R = simulate(); const p = passAt(t); const s = isrAt(t);
  if (poweredAt(t) && (!p || p.off)) return '<p class="muted">Power-up: <span class="mono">init</span> is running (LEDs 0x5D, first output_DtoA). The main loop starts 400 Tcy after power-on.</p>';
  if (!p || p.off || !poweredAt(t)) return '<p class="muted">Unit is off at the playhead.</p>';
  const inISR = s && t>=s.t0 && t<s.t1;
  const off = (t - p.t0)/C.TCY; let st = 0; for (let j=0;j<STEPS.length;j++) if (off>=STEP_OFF[j]) st=j;
  const f1 = p.fEnd!==undefined && t>p.t0 ? p.f1 : p.f1;
  const fl = (v,map)=>Object.keys(map).filter(k=>v&map[k]).join(' ')||'—';
  const a1 = attAt(t,1), a2 = attAt(t,2);
  return `<table class="kv">
    <tr><th>Main loop</th><td class="mono">pass #${p.i} · ${inISR?'<b style="color:var(--accent2)">in the Timer 2 ISR</b>':p.starved?'starved by the ISR':'step: '+STEPS[st][0]}</td></tr>
    <tr><th>led_output_reg</th><td class="mono">${hex(p.led)} = ${bin(p.led)} · mode ${MODE_NAME(p.led)} · ${p.led&1?'tally control':'MANUAL'}</td></tr>
    <tr><th>flag_1 / flag_2</th><td class="mono">${fl(p.f1,F1)} / ${fl(p.f2,F2)}</td></tr>
    <tr><th>table_count1 / 2</th><td class="mono">${hex(p.tc1)} / ${hex(p.tc2)}${s && t>=s.t0 && s.pass>=p.i?` → after ISR ${hex(s.tc1)} / ${hex(s.tc2)}`:''}</td></tr>
    <tr><th>dac1_reg / dac2_reg</th><td class="mono">${hex(s&&s.pass===p.i&&t>=s.t0?s.dac1:p.dac1)} / ${hex(s&&s.pass===p.i&&t>=s.t0?s.dac2:p.dac2)}</td></tr>
    <tr><th>ADRES → time_reg</th><td class="mono">${hex(p.adres)} → ${p.f2&F2.hard?'CUT (hard_switch)':hex(p.timeReg)+' ≈ '+fadeSeconds(p.timeReg).toFixed(3)+' s'}</td></tr>
    <tr><th>Timer 2</th><td class="mono">${p.peie?`PR2 = ${hex(p.pr2)} → match every ${SIM.fmtDur(C.T2_MUL*(p.pr2+1)*C.TCY)}`:'off'}</td></tr>
    <tr><th>VCA attenuation</th><td class="mono">IN 1 ${a1===Infinity?'off':a1.toFixed(1)+' dB'} · IN 2 ${a2===Infinity?'off':a2.toFixed(1)+' dB'}</td></tr>
    <tr><th>Run totals</th><td class="mono">${R.passes.filter(x=>x.i>=0).length} passes · ${R.isrs.length} interrupts · ${R.isrs.reduce((a,x)=>a+x.lost.length,0)} lost matches · ${R.races.length} bank-1 races</td></tr>
  </table>`;
}
function viewSim(m){
  window.__pod16Active = true;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — what the operator sees', `<div id="fp"></div>${controlsHTML()}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">
          <label class="small">VCA calibration <select id="cal"><option value="table" ${D.cal==='table'?'selected':''}>0.189 dB/count (what the tables assume)</option><option value="deep" ${D.cal==='deep'?'selected':''}>255 = 100 dB (RANGE turned up, ${'inferred'})</option></select></label>
          <label class="small">shift_count in RAM at power-up <select id="ram">${[8,0,3,5,12,200].map(v=>`<option value="${v}" ${D.ram===v?'selected':''}>${v}${v===8?' (lucky)':''}</option>`).join('')}</select></label>
          <button id="clr">Clear all actions</button><button id="demo">Demo run</button>
        </div>`)}
      ${card('Rear panel — click CTL 1 / CTL 2 for the tallies, INPUT blocks to connect a programme', `<div id="rp"></div>`)}
    </div>
    <div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card(`Timeline — the whole ${C.DUR} s run, zoomable (click to seek)`, `<canvas id="tl"></canvas>
     <p class="small muted">Every pass and interrupt comes from replaying the ported v1.01 routines from power-up. Cycle counts are taken from the instruction listing (${inf}, ±3 %). Run length is ${C.DUR} s, so a full 2-second fade fits; use the 1 s zoom to look at one second.</p>`)}
  <div class="grid2">
    ${card('Scope: the last DAC frame before the playhead (output_DtoA → LT1451 × 2)', `<canvas id="scope"></canvas><div id="bits" class="small"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  bindControls(m);
  m.querySelector('#cal').onchange = e=>{ D.cal = e.target.value; SIM.refresh(); };
  m.querySelector('#ram').onchange = e=>{ D.ram = +e.target.value; SIMKEY=''; SIM.refresh(); };
  m.querySelector('#clr').onclick = ()=>A.clear();
  m.querySelector('#demo').onclick = ()=>A.demo();
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const fin = ()=>{ const P = simulate().passes.filter(p=>p.i>=0); return P[P.length-1] || {led:0x5D,f1:0,portbEnd:0x5D}; };
const finLed = ()=>fin().led;
const LESSONS = [
  { title:'Meet the POD16', body:`<p>The POD16 is a half-rack <b>stereo audio fader</b>: two stereo inputs, one stereo output. It moves the output from one input to the other with a timed fade, under front-panel or remote (tally) control. Typical use: switching between two programme feeds without a click.</p>
     <p>Front panel, left to right: power rocker and LED, the <b>FADE TIME</b> trim (CUT · 1SEC · 2SEC), <b>MANUAL</b>, three <b>MODE</b> buttons (log cross-fade, linear cross-fade, V-fade) and <b>INPUT SELECT</b> 1 and 2. Each button has a red LED in it.</p>
     <p>This tutorial starts from an empty run: the unit powers up at 0 s and nothing else happens. Each action you take is placed at the playhead.</p>`, check:()=>true, auto:true, enter:()=>{ D.ev=[]; D.adres0=128; SIMKEY=''; SIM.seek(0.02); } },
  { title:'1 · Read the power-up state', body:`<p>At power-up <span class="mono">init</span> writes <span class="mono">0x5D</span> to the LEDs: <b>LOG FADE</b> and <b>INPUT 1</b> are lit and <b>MANUAL</b> is dark.</p><p>MANUAL dark means the unit is in <b>tally mode</b>: the rear CTL inputs choose the input and the front INPUT buttons are locked out. Try pressing INPUT 2 now: nothing changes.</p>`, check:()=>true, auto:true },
  { title:'2 · Take local control', body:`<p>Press <b>MANUAL</b>. Its LED lights. From now on the front INPUT buttons work and the tallies are ignored.</p><p class="muted">The firmware debounces every press for 7 loop passes (about 11 ms), so a quick tap still counts.</p><p><b>Goal:</b> MANUAL lit.</p>`, check:()=>!(finLed()&1), hint:'Click the MANUAL button (or press M).' },
  { title:'3 · Choose the CROSS FADE mode', body:`<p>Press the second MODE button (the plain <b>X</b> symbol). The three mode LEDs act like radio buttons.</p><p><b>Goal:</b> CROSS FADE lit.</p>`, check:()=>(finLed()&0x0E)===0x0A, hint:'Click the X button (or press 2).' },
  { title:'4 · Set the fade time to 1 second', body:`<p>The trim is read by the PIC's A/D converter. Turn it to the top mark, <b>1SEC</b>. The firmware computes <span class="mono">time_reg = 0xFF − ADRES</span> and later loads it into Timer 2.</p><p><b>Goal:</b> trim near 1SEC (ADRES between 0x64 and 0x9C).</p>`, check:()=>{ const a=inputsAt(C.DUR/C.TCY).adres; return a>=0x64&&a<=0x9C; }, hint:'Use the trim menu → “1SEC (centre)”, or click the trim and use the mouse wheel.' },
  { title:'5 · Fade to INPUT 2', body:`<p>Press <b>INPUT 2</b>. Its LED <b>flashes</b> while the fade runs and INPUT 1 goes dark. Press ▶ Play (or ⏭ settle) to watch the green and red gain curves cross on the timeline.</p><p>CROSS FADE uses <span class="mono">linear_table</span>: the attenuation changes by the same number of dB on every step.</p><p><b>Goal:</b> input 2 on its own and the fade finished.</p>`, check:()=>{ const f=fin(); return !(f.led&0x40) && (f.led&0x20) && !(f.f1&(F1.in1|F1.in2)); }, hint:'Press INPUT 2 (W key), then click “⏭ settle”.' },
  { title:'6 · Turn a fade round', body:`<p>Press <b>INPUT 1</b>, and press <b>INPUT 2</b> again about half a second later, before the first fade has finished. The firmware doesn't restart. It mirrors both table counters (<span class="mono">0xFF − count</span>) and the fade reverses from where it was.</p><p><b>Goal:</b> one reversal.</p>`, check:()=>simulate().final && simulate().final.reversals>0, hint:'Press INPUT 1, then click on the timeline about 0.5 s later and press INPUT 2.' },
  { title:'7 · V-FADE', body:`<p>Wait until the fade has finished (the mode buttons are ignored while one runs). Then select <b>V-FADE</b> and switch input. With <span class="mono">xdb_table</span> the old input is gone by half-time, and only then does the new one rise.</p><p><b>Goal:</b> a fade in V-FADE mode.</p>`, check:()=>simulate().final && (simulate().final.fadesByMode['V-FADE']||0)>0, hint:'⏭ settle, press 3 (V), then press the other INPUT button.' },
  { title:'8 · CUT', body:`<p>Turn the trim fully counter-clockwise to <b>CUT</b> (ADRES above 0xF7). Since v1.01 a cut doesn't fade: <span class="mono">switch</span> writes both DACs in a single interrupt, so there is no gap.</p><p><b>Goal:</b> a cut.</p>`, check:()=>simulate().final && simulate().final.cuts>0, hint:'Trim menu → CUT, then press the other INPUT button.' },
  { title:'9 · Hand over to the tallies', body:`<p>Press <b>MANUAL</b> so its LED goes dark. Then apply <b>tally 2</b> by clicking the rear <b>CTL 2</b> block (or press Y). That is a positive voltage on WET or a ground on DRY. The unit selects input 2.</p><p><b>Goal:</b> MANUAL off, tally 2 on, input 2 selected.</p>`, check:()=>{ const f=fin(), i=inputsAt(C.DUR/C.TCY); return (f.led&1) && i.dry2 && !(f.led&0x40); }, hint:'Press M, then click CTL 2 on the rear panel.' },
  { title:'10 · Mix both inputs', body:`<p>Apply <b>tally 1</b> as well, and keep tally 2 on. Now <i>both</i> inputs come up and are mixed (the manual warns about this). Set the trim to 1SEC first: in CUT mode the firmware can't mix (see Findings).</p><p><b>Goal:</b> both INPUT LEDs lit.</p>`, check:()=>{ const f=fin(); return !(f.led&0x20) && !(f.led&0x40); }, hint:'Trim to 1SEC, then click CTL 1 on the rear.' },
  { title:'Done', body:`<p>You've used every control on the POD16. The <b>Software</b> tab follows each press through the PIC code and shows the three fade tables. <b>One second</b> breaks the timing down from loop passes to DAC bit clocks, and <b>Findings</b> lists what the code really does, including the mismatch between the table names and the actual fade laws.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod16Active = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD16 (from POD16MAN.WPD)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}
      <div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div><canvas id="mini" style="margin-top:8px"></canvas>`)}
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const hot = `<g><rect x="400" y="80" width="160" height="200" fill="transparent"><title>FADE TIME: CUT … 2 SEC (RV1 → RA0)</title></rect></g>`;
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t, {hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(SIM.t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML();
    const all = lanes(); SIM.drawLanes(m.querySelector('#mini'), [all[0], all[6], all[8]], {labelW:150, range:[0, C.DUR]});
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ go(+li.dataset.i); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached (checked at the end of the run).') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>go(lessonIdx-1);
    m.querySelector('#nxt').onclick=()=>go(lessonIdx+1);
    m.querySelector('#rs').onclick=()=>{ D.log=[]; go(0); };
  };
  const go = i=>{ lessonIdx = Math.max(0, Math.min(LESSONS.length-1, i)); if (LESSONS[lessonIdx].enter) LESSONS[lessonIdx].enter(); SIM.refresh(); };
  bindControls(m);
  SIM.on('time', draw);
  if (lessonIdx===0 && LESSONS[0].enter) LESSONS[0].enter();
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__pod16Active = true;
  m.innerHTML = `
  ${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the operator and the listener', `<div id="fp"></div><h3>Output level meter (peak over 10 ms, ${'−60…0 dB'} relative to one input at unity)</h3><canvas id="meter"></canvas>`)}
  </div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t = SIM.t, R = simulate(), p = passAt(t) || {}; const pr2 = p.peie? p.pr2 : (p.timeReg||127);
    const Pt = C.T2_MUL*(pr2+1)*C.TCY;
    const rows = [
      ['Main-loop passes (idle)', Math.round(1/R.avgPass).toLocaleString(), SIM.fmtDur(R.avgPass), `1 912 Tcy, 93 % of it in <span class="mono">delay</span> (${inf}: counted from the listing)`],
      ['A/D readings of FADE TIME', Math.round(1/(3*R.avgPass)).toLocaleString(), SIM.fmtDur(3*R.avgPass), 'AtoD: set-up, start, read on three successive passes'],
      ['Debounce window', '—', SIM.fmtDur(7*R.avgPass), 'bcount_num = 7 identical passes per press and per release'],
      ['LED flash half-period', (1/(73*R.avgPass)).toFixed(1), SIM.fmtDur(73*R.avgPass), 'flash_num = 0x49 passes, only while a fade runs'],
      ['Timer 2 matches', Math.round(1/Pt).toLocaleString(), SIM.fmtDur(Pt), `PR2 = ${hex(pr2)}; T2CON 0x45 → 4 × 9 × (PR2+1) Tcy`],
      ['Fade steps (ISRs) per fade', '256', SIM.fmtDur(fadeSeconds(pr2)/256), `fade = ${fadeSeconds(pr2).toFixed(3)} s; the ISR itself takes ≈ ${SIM.fmtDur(372*C.TCY)}`],
      ['DAC frames', '1 per ISR', SIM.fmtDur(C.DTOA*C.TCY), 'output_DtoA: 8 + 4 + 8 + 4 bits, then CS (strb) pulse'],
      ['DAC bit clocks', '24 per frame', SIM.fmtDur(10*C.TCY), 'sft_out: 10 Tcy per bit (bcf/btfsc/bsf/bsf/bsf/bcf/rlf/decfsz/goto)'],
      ['VCA control smoothing', '—', SIM.fmtDur(C.RC_TAU), 'R35 ‖ R34 × C22 (and R27 ‖ R26 × C17) on the SSM2018 CTL pins'],
      ['Programme cycles', '400 / 1 000', '2.5 ms / 1 ms', 'Test tones on input 1 / input 2 (simulation sources)'],
      ['Instruction cycles', Math.round(1/C.TCY).toLocaleString(), SIM.fmtDur(C.TCY), 'X1 = 4.9152 MHz ÷ 4'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one loop pass, one interrupt or one DAC bit at a time.</p>`;
    const s = isrAt(t); const inISR = s && t>=s.t0 && t<s.t1;
    const off = p.t0!==undefined? (t-p.t0)/C.TCY : 0; let st=0; for (let j=0;j<STEPS.length;j++) if (off>=STEP_OFF[j]) st=j;
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PIC16C73A</th><td class="mono">${!poweredAt(t)?'off':p.i===undefined?'init (power-up)':inISR?`<b>ISR</b> (${s.kind}) — ${t<s.tdac?'fade_how / sft_out shifting bits':'strobe done, restoring STATUS/W'}`:`pass #${p.i}: ${p.starved?'starved':STEPS[st][0]}<br><span class="muted">${p.starved?'':STEPS[st][2]}</span>`}</td></tr>
      <tr><th>Timer 2</th><td class="mono">${p.peie?`running, PR2 ${hex(p.pr2)}`:'stopped (no fade)'}</td></tr>
      <tr><th>LT1451 U4 / U5</th><td class="mono">${(()=>{ const k=bs(R.dacs,t,'t'); const d=R.dacs[k]; return d&&!d.off? hex(d.a1,3)+' / '+hex(d.a2,3)+' → FADE 1 '+(d.a1/1000).toFixed(3)+' V, FADE 2 '+(d.a2/1000).toFixed(3)+' V' : '—'; })()}</td></tr>
      <tr><th>SSM2018 VCAs</th><td class="mono">IN 1 ×${gainAt(t,1).toFixed(3)} · IN 2 ×${gainAt(t,2).toFixed(3)}</td></tr>
      <tr><th>Output L</th><td class="mono">${outSample(t).toFixed(3)} (= IN1·g1 + IN2·g2 through U7A, balanced by U7B)</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    const {c,w} = SIM.canvas(m.querySelector('#meter'), 40);
    let pk=0; for (let i=0;i<120;i++) pk=Math.max(pk, Math.abs(outSample(t-0.01*i/120))); const db = pk>0? 20*Math.log10(pk/0.7) : -99;
    const segs=40, lit=Math.max(0,Math.min(segs,Math.round((db+60)/60*segs)));
    for (let k=0;k<segs;k++){ const x=10+k*(w-20)/segs; c.fillStyle = k<lit ? (k>=segs-4?'#e3453a':k>=segs-10?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); c.fillRect(x, 6, (w-20)/segs-2, 20); }
    c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(db>-99? db.toFixed(1)+' dB':'—', 12, 38);
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const R = simulate(); const p = passAt(t)||{pr2:127};
  const levels = [['1 second',1],['100 ms',0.1],['1 loop pass', R.avgPass],['1 fade step (ISR)', C.T2_MUL*((p.peie?p.pr2:127)+1)*C.TCY],['1 DAC frame', C.DTOA*C.TCY]];
  const Hh = levels.length*46+10; const {c,w} = SIM.canvas(cv, Hh);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), bad=SIM.css('--bad'), play=SIM.css('--play'), grid=SIM.css('--grid');
  levels.forEach(([nm,span],i)=>{
    const y=8+i*46; const t0=Math.max(0, Math.min(C.DUR-span, t-span/2));
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')', 6, y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('IN 1 / IN 2 gain, output', 6, y+28);
    const x0=170, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,32);
    const N=Math.min(600,pw);
    [[1,acc],[2,bad]].forEach(([ch,col])=>{ c.strokeStyle=col; c.beginPath(); for(let k=0;k<=N;k++){ const tt=t0+span*k/N; const yy=y+32-gainAt(tt,ch)*28; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy);} c.stroke(); });
    c.strokeStyle=ink; c.globalAlpha=.6; c.beginPath(); for(let k=0;k<=N;k++){ const tt=t0+span*k/N; const yy=y+18-outSample(tt)*10; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy);} c.stroke(); c.globalAlpha=1;
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+36); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=x0+(Math.max(0,Math.min(C.DUR-ns,t-ns/2))-t0)/span*pw; c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,ns/span*pw),32); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram (after POD16 - Functional Diagram.pdf) ---------------- */
const BLOCKS = {
  inp:{x:20,y:20,w:150,h:96,t:'INPUT 1 / 2 (L, R)',s:['rear TB3B blocks → H1/H2','20K0 + 33 µF per leg','40 kΩ balanced (manual)'],d:'Four balanced inputs on rear screw terminals. Each leg goes through 20K0 and 33 µF into the SSM2018 current inputs (+I1G/−IN and +IN/−I1G tied in pairs).'},
  vca:{x:230,y:20,w:170,h:96,t:'4 × SSM2018TP VCA',s:['U12 IN1 L · U10 IN1 R','U11 IN2 L · U9 IN2 R','CTL: + volts = attenuation'],d:'Analog Devices / PMI SSM2018TP voltage-controlled amplifiers. Input 1 VCAs share one control voltage (FADE 1), input 2 VCAs share FADE 2, so left and right always fade together. The VCA is dB-linear: the control voltage sets the attenuation in dB.'},
  sum:{x:460,y:20,w:170,h:96,t:'Summing + balancing',s:['U7A/U6A 5532 sum (10K0)','U7B/U6B 5532 invert','30R build-out → OUTPUT'],d:'The two VCA outputs of each side are summed by an inverting 5532 stage (R32/R33, R15). A second 5532 half inverts again for the − leg. Both inputs are always summed, so with both tallies on, the unit mixes.'},
  out:{x:680,y:20,w:130,h:70,t:'OUTPUT L / R',s:['60 Ω balanced (manual)','+24 dBu max'],d:'Rear TB3B blocks via H3.'},
  dac:{x:230,y:190,w:170,h:84,t:'2 × LT1451 12-bit DAC',s:['U4 → FADE 1 · U5 → FADE 2','daisy chain U4 DO → U5 DI','CLK RA2 · DATA RA4 · CS RA5'],d:'Linear Technology LTC1451: 12-bit, 4.095 V internal reference (1 mV/LSB). The PIC sends 8 bits + 4 zeros per DAC, so the bottom 4 bits are always 0 and there are 256 usable steps.'},
  amp:{x:460,y:190,w:170,h:84,t:'2 × OP275 control amp',s:['U8B (FADE 1) · U8A (FADE 2)','RANGE trim (gain)','OFFSET trim (±18 V via 1M)'],d:'Non-inverting stage: gain 1 + (R16 10K0 + RANGE 20k)/R17 20K, plus an offset from a ±18 V pot through 1M. Output → 1K0/1K0 divider + 0.1 µF (C22/C17) → CTL of two VCAs. The trims set dB per DAC step; the tables assume 255 steps = 48.1 dB.'},
  mcu:{x:20,y:190,w:170,h:130,t:'PIC16C73A @ 4.9152 MHz',s:['main loop + Timer 2 ISR','3 fade tables (256 × retlw)','A/D: FADE TIME on RA0','OTP part (16C)'],d:'pd16v101.asm: the main loop reads buttons and tallies, debounces, drives the LEDs and reads the trim. Fades run in the Timer 2 interrupt: one table step per interrupt, 256 steps per fade.'},
  pnl:{x:20,y:360,w:170,h:96,t:'Front board (POD16-2.PCB)',s:['7 switch positions, 6 fitted','LED + switch on each RB line','READ (RB7) enables the switches'],d:'Each RB0–RB6 line drives a button LED through 220R and reads its switch through another 220R. The switches return to the READ line, which the PIC pulls low only while it reads. RB4 (SW5) is “not_used”.'},
  tal:{x:230,y:360,w:170,h:96,t:'Tally inputs CTL 1 / 2',s:['WET +3…+30 V → 750R → ILD1','DRY ground → 1N4148','→ RC2 / RC3 (active low)'],d:'Each tally can be a voltage on WET (it lights one half of the ILD1 dual opto-isolator) or a contact closure to ground on DRY. Either one pulls RC2/RC3 low. The firmware only listens when MANUAL is off.'},
  rs:{x:460,y:360,w:170,h:70,t:'RS422 option (not installed)',s:['DE-9 J1, 2 × 75176','RC6/RC7 (USART) unused'],d:'The schematic draws this area with a dashed box labelled “not installed”. The manual says “consult the factory”. No firmware in the archive drives the USART, and the rear panel has a blanking plate over the DE-9 cut-out.'},
  psu:{x:680,y:190,w:130,h:110,t:'Power supply',s:['115 V, T1, bridge','LM317 / LM337 “±18 V”','LM7805 +5 V'],d:'Linear supply. The regulators are labelled ±18 V, but R5/R6 (2K63/221R) set 1.25 × (1 + 2630/221) = 16.1 V. The power LED runs from the raw DC through 4K7.'},
};
const WIRES = [['inp','vca','audio'],['vca','sum','current out'],['sum','out',''],['mcu','dac','CLK/DATA/CS'],['dac','amp','0–4.08 V'],['amp','vca','CTL'],['pnl','mcu','RB0–7'],['tal','mcu','RC2/RC3'],['rs','mcu',''],['psu','vca','']];
function viewBlock(m){
  window.__pod16Active = false;
  let sel = 'mcu';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block) — after POD16 - Functional Diagram.pdf', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one paragraph', `<p>Each input passes through its own <b>VCA</b>. The two VCA outputs are <b>summed</b>, so the output is always input 1 × g1 + input 2 × g2. The <b>PIC</b> never touches the audio. It only writes two numbers to the <b>DACs</b>, and the control amplifiers turn those into VCA control voltages. A fade is 256 DAC writes, paced by Timer 2, with each step looked up in one of three tables.</p>`)}</div></div>`;
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 830 470" style="width:100%"><defs><marker id="ar16" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot = sel===a||sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ar16)"/>`;
      if (l) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}" ${k==='rs'?'stroke-dasharray="5 4"':''}/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>
        ${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += '</svg>';
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b = BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from Pod16sch.pdf net and pin names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const res = (x,y,l,v,vert)=> vert ? `<path d="M${x} ${y} v6 l5 3 l-10 6 l10 6 l-10 6 l5 3 v6" fill="none" stroke="var(--ink)"/><text x="${x+8}" y="${y+18}" font-size="10" fill="var(--ink)">${l}</text><text x="${x+8}" y="${y+30}" font-size="10" fill="var(--ink2)">${v}</text>`
  : `<path d="M${x} ${y} h6 l3 -5 l6 10 l6 -10 l6 10 l3 -5 h6" fill="none" stroke="var(--ink)"/><text x="${x+6}" y="${y-9}" font-size="10" fill="var(--ink)">${l} ${v}</text>`;
const SHEETS = [
  { name:'1 · Audio path (one channel)', note:'Sheet 1 of POD16.DSN (4 Sep 1998), left channel: inputs → U12/U11 SSM2018TP → U7A sum → U7B → H3. The right channel is the same with U10/U9 and U6A/U6B.', svg:()=>
    chip(170,70,130,'U12 SSM2018TP',[['1 +I1G','IN1 L+ via R45 20K0/C32'],['7 −IN',''],['6 +IN','IN1 L− via R44 20K0/C31'],['4 −I1G',''],['11 CTL','FADE 1 (via R35 1K0)'],['13 GND','']],[['3 +IO','→ R32 10K0'],['14 VG','R36 10K0 to +IO'],['12 MODE','+18 V via R37 150K'],['5/8 COMP','C24 47p'],['16 V−','−18 V']],'input 1 left')
    + chip(170,290,130,'U11 SSM2018TP',[['1/7','IN2 L+ via R43/C30'],['6/4','IN2 L− via R42/C29'],['11 CTL','FADE 2 (via R27 1K0)']],[['3 +IO','→ R33 10K0'],['12 MODE','R31 150K']],'input 2 left')
    + chip(600,120,110,'U7A 5532',[['2 −','R32 + R33 (sum)'],['3 +','GND']],[['1','OUT L+ via R47 30R'],['fb','R15 10K0 ‖ C14 22p']],'virtual-earth sum')
    + chip(600,290,110,'U7B 5532',[['6 −','R13 10K0 from U7A'],['5 +','GND']],[['7','OUT L− via R46 30R'],['fb','R14 10K0 ‖ C13']],'inverter for − leg')
    + `<text x="40" y="440" font-size="11" fill="var(--ink2)">Output = −(i₁₂ + i₁₁)·R15. Both inputs are always summed: the PIC fades by attenuating, never by switching.</text>` },
  { name:'2 · Control voltage (DAC → VCA)', note:'Sheet 2 (U4/U5 LT1451CN8) and sheet 1 (U8A/U8B OP275, RANGE-1/2, OFFSET-1/2, R34/R35, C22/C17).', svg:()=>
    chip(120,70,130,'U4 LT1451CN8',[['1 CLK','CLK (RA2)'],['2 DI','DATA (RA4)'],['3 CS','DAC CS (RA5)'],['4 DO','→ U5 DI']],[['7 Vout','FADE 1'],['6 REF','C7 0.1'],['8 VCC','+5'],['5 VSS','GND']],'12-bit, 1 mV/LSB')
    + chip(120,260,130,'U5 LT1451CN8',[['1 CLK','CLK'],['2 DI','U4 DO'],['3 CS','DAC CS'],['4 DO','n.c.']],[['7 Vout','FADE 2'],['6 REF','C8 0.1']],'downstream in the chain')
    + chip(560,90,120,'U8B OP275',[['5 +','FADE 1'],['6 −','R17 20K to GND; R16 10K0 + RANGE-1 20k fb; R18 1M from OFFSET-1']],[['7','→ R35 1K0 → CTL U12, U10']],'gain 1.5 … 2.5')
    + `<text x="560" y="230" font-size="11" fill="var(--ink)">CTL node: R34 1K0 to GND, C22 0.1 µF → τ = 500 Ω × 0.1 µF = 50 µs</text>
       <text x="560" y="250" font-size="11" fill="var(--ink)">OFFSET-1 20K between +18 V and −18 V</text>
       <text x="560" y="290" font-size="11" fill="var(--ink2)">U8A (pins 1/2/3), RANGE-2, OFFSET-2, R19–R21,</text><text x="560" y="306" font-size="11" fill="var(--ink2)">R26/R27/C17 do the same for FADE 2 → U11, U9.</text>
       <text x="40" y="440" font-size="11" fill="var(--ink2)">Bits leave the PIC MSB-first: dac1_reg + 0000 + dac2_reg + 0000. After 24 clocks the first 12 sit in U5, the last 12 in U4.</text>` },
  { name:'3 · PIC16C73A', note:'Sheet 2: U3 pins. RA3, RC0, RC4, RC5 are unconnected (the firmware uses RC0/RC4/RC5 as scope test points). The RA1 pot is wired but never read.', svg:()=>
    chip(330,40,200,'U3 PIC16C73A',[['2 RA0/AN0','RV1 FADE TIME (10-080)'],['3 RA1/AN1','2nd pot (unread)'],['4 RA2','CLK (led_clk)'],['5 RA3','n.c.'],['6 RA4','DATA (sft_dat)'],['7 RA5','DAC CS (strb)'],['1 /MCLR','R4 10K0 → +5'],['9/10 OSC','X1 4M915, C4/C5 22p'],['11 RC0','n.c. (test)'],['12 RC1','RS422 (n.i.)'],['13 RC2','tally 1 (dry1)'],['14 RC3','tally 2 (dry2)'],['15/16 RC4/5','n.c. (test)'],['17/18 RC6/7','RS422 TX/RX (n.i.)']],
      [['21 RB0','MANUAL'],['22 RB1','LOG FADE (cross_1)'],['23 RB2','CROSS FADE (cross_2)'],['24 RB3','V-FADE (cross_3)'],['25 RB4','SW5 (not_used)'],['26 RB5','INPUT 1'],['27 RB6','INPUT 2'],['28 RB7','READ'],['20 VDD','+5, 0.1 µF'],['8/19 VSS','GND']],'4 K OTP · ICSP not used') },
  { name:'4 · Front board and tallies', note:'Sheet 3 (POD16-2.PCB front board: SW1–SW7, R59–R79) and sheet 2 (H4, ILD1 U13A/B, D5–D8, R2/R3/R50–R53).', svg:()=>{
    let s='';
    for (let k=0;k<7;k++){ const y=50+k*44; s+=`<text x="30" y="${y+4}" font-size="10.5" fill="var(--accent2)">RB${k} ${['MANUAL','LOG','CROSS','V','(unused)','INPUT 1','INPUT 2'][k]}</text>`+res(130,y,'R'+(61+3*k-(k?0:0)),'220R')+`<line x1="172" y1="${y}" x2="230" y2="${y}" stroke="var(--ink)"/><circle cx="234" cy="${y}" r="3" fill="none" stroke="var(--ink)"/><line x1="236" y1="${y-6}" x2="256" y2="${y-2}" stroke="var(--ink)"/><circle cx="258" cy="${y}" r="3" fill="none" stroke="var(--ink)"/><text x="232" y="${y-9}" font-size="9" fill="var(--ink2)">SW${k+1}</text><line x1="261" y1="${y}" x2="300" y2="${y}" stroke="var(--ink)"/>`
      +`<path d="M140 ${y+14} h40 l0 -6 l10 6 l-10 6 z" fill="none" stroke="var(--warn)"/><text x="196" y="${y+18}" font-size="9" fill="var(--warn)">LED → +5</text>`; }
    s += `<line x1="300" y1="50" x2="300" y2="${50+6*44}" stroke="var(--ink)"/><text x="306" y="${50+3*44}" font-size="11" fill="var(--accent2)">READ (RB7)</text><text x="306" y="${66+3*44}" font-size="10" fill="var(--ink2)">2K pull-ups R59…R77</text>`;
    s += chip(560,60,130,'U13A ILD1',[['WET 1','R52 750R 3W, D6 1N4003'],['DRY 1','D8 1N4148']],[['C/E','RC2, R3 10K0 → +5, R51 1K']],'tally 1')
      + chip(560,220,130,'U13B ILD1',[['WET 2','R53 750R 3W, D5'],['DRY 2','D7 1N4148']],[['C/E','RC3, R2 10K0 → +5, R50 1K']],'tally 2');
    return s; } },
  { name:'5 · Power and RS422', note:'Sheet 2. REG2 LM317 (R5 2K63 / R6 221R), REG3 LM337 (R9 2K63 / R8 221R), REG1 LM7805, T1 with 110 V primary strapping, C1/C2 470 µF/25 V. The RS422 block (J1 DE-9, U1/U2 75176, RP1, R55–R58) is drawn inside a dashed “not installed” box.', svg:()=>
    chip(120,60,130,'REG2 LM317',[['VI','+raw (C2 470/25)']],[['VO','“+18” = 1.25·(1+2630/221) = 16.1 V'],['ADJ','R5 2K63 / R6 221R']],'positive rail')
    + chip(120,200,130,'REG3 LM337',[['VI','−raw (C1 470/25)']],[['VO','“−18” = −16.1 V'],['ADJ','R9 2K63 / R8 221R']],'negative rail')
    + chip(120,330,130,'REG1 LM7805',[['VI','+raw']],[['VO','+5 (PIC, DACs, LEDs)']],'logic')
    + chip(560,90,140,'U1/U2 75176',[['A/B','J1 DE-9 pins 1–9 via 22R'],['RO/DI','RC7 / RC6'],['DE/RE','RC1']],[['VCC','+5'],['','RP1 10K bias']],'NOT INSTALLED')
    + `<rect x="520" y="40" width="300" height="200" fill="none" stroke="var(--ink2)" stroke-dasharray="6 5"/><text x="530" y="230" font-size="11" fill="var(--ink2)">not installed — no firmware uses it</text>` },
];
function viewSchem(m){
  window.__pod16Active = false;
  let i = 0;
  m.innerHTML = card('Schematic set (redrawn from the net and part names in Pod16sch.pdf, not the OrCAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original OrCAD Capture schematics are <span class="mono">POD16 - #Engineering/PCB/OBSOLETE/ARCHIVE/POD16.DSN</span>; CorelDRAW 10 prints of them are <span class="mono">MANUAL/Pod16sch.pdf</span> (Oct 2004). These sheets are a readable guide built from those part, pin and net names. Blue labels are nets.</p>`);
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=> b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 470" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="880" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">POD16 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function drawTables(cv, t){
  const {c,w} = SIM.canvas(cv, 220);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), grid=SIM.css('--grid'), play=SIM.css('--play');
  const x0=40, y0=10, pw=w-60, ph=170;
  c.strokeStyle=grid; c.strokeRect(x0,y0,pw,ph);
  c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('255', 8, y0+8); c.fillText('0', 24, y0+ph); c.fillText('table index 0 → 255 (one step per interrupt)', x0, y0+ph+14);
  const sets = [[DB,'#d0621f','db_table (LOG FADE)'],[LIN,'#1f7a4d','linear_table (CROSS FADE)'],[XDB,'#0d5c8c','xdb_table (V-FADE)']];
  sets.forEach(([T,col,l],k)=>{ c.strokeStyle=col; c.lineWidth=2; c.beginPath(); T.forEach((v,i)=>{ const x=x0+i/255*pw, y=y0+ph-v/255*ph; i?c.lineTo(x,y):c.moveTo(x,y); }); c.stroke(); c.fillStyle=col; c.fillText(l, x0+8, y0+16+k*14); });
  const s = isrAt(t); if (s && t>=s.t0 - 0.05){ const x=x0+s.before.tc1/255*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(x,y0); c.lineTo(x,y0+ph); c.stroke(); c.fillStyle=ink; c.fillText(`last ISR: table_count1 ${hex(s.before.tc1)}`, Math.min(x+4, w-150), y0+ph-6); }
}
function viewSoft(m){
  window.__pod16Active = true;
  m.innerHTML = `<div class="grid2">
    ${card('Main loop — the step lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('Timer 2 interrupt (interupt → fade_how → switch → output_DtoA)', `<div id="isr"></div>`)}
      ${card('Input selection state (led_output_reg + in1/in2_flag)', `<div id="fsm"></div>`)}</div></div>
  <div class="grid2">
    ${card('The three fade tables (DAC code = attenuation in steps)', `<canvas id="tabs"></canvas><p class="small">On a dB-linear VCA the DAC code <i>is</i> the attenuation in dB. <span class="mono">db_table</span> holds −20·log₁₀(1−x) (the fit is exact at 0.1875 dB per count). It therefore gives a <b>linear-voltage</b> fade with −6 dB at the crossover. <span class="mono">linear_table</span> gives a <b>linear-dB</b> fade with −24 dB at the crossover. See Findings.</p>`)}
    ${card('Registers, live', `<div id="reg"></div>`)}
  </div>
  ${card('How the buttons did things — panel → code → DAC', `<div id="btn"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t, p = passAt(t) || {}, s = isrAt(t); const inISR = s && t>=s.t0 && t<s.t1;
    const off = p.t0!==undefined? (t-p.t0)/C.TCY : 0; let st=0; for (let j=0;j<STEPS.length;j++) if (off>=STEP_OFF[j]) st=j;
    let f = `<svg viewBox="0 0 520 ${STEPS.length*42+70}" style="width:100%"><defs><marker id="a16" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="150" y="6" width="220" height="26" rx="13" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="12" fill="var(--ink)">org 0: call init · goto main</text>`;
    STEPS.forEach((q,j)=>{ const y=42+j*42, on=!inISR && !p.starved && st===j && poweredAt(t);
      f += `<line x1="260" y1="${y-10}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#a16)"/><rect x="40" y="${y}" width="440" height="30" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="50" y="${y+13}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${q[0]} <tspan font-size="10" fill="${on?'#dfe':'var(--ink2)'}">${q[1]} Tcy</tspan></text><text x="50" y="${y+25}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${q[2].slice(0,92)}</text>`; });
    const yb = 42+STEPS.length*42; f += `<path d="M480 ${yb-26} h22 V40 h-22" fill="none" stroke="var(--ink2)" marker-end="url(#a16)"/>
      <text x="40" y="${yb+16}" font-size="11" fill="var(--ink2)">${inISR?'<tspan fill="var(--accent2)" font-weight="700">Interrupted: the Timer 2 ISR is running.</tspan>':p.starved?'Pass starved: the ISR takes nearly all the CPU.':'Pass #'+(p.i||0)+' · clrwdt in main and in delay keeps the watchdog fed.'}</text></svg>`;
    m.querySelector('#flow').innerHTML = f;
    const box=(x,y,wd,t1,t2,on)=>`<rect x="${x}" y="${y}" width="${wd}" height="38" rx="6" fill="${on?'var(--accent2)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+8}" y="${y+15}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${t1}</text><text x="${x+8}" y="${y+30}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${t2}</text>`;
    const ph = inISR ? (t < s.t0 + (C.LAT+8)*C.TCY ? 0 : t < s.tdac - C.DTOA*C.TCY ? 1 : t < s.tdac ? 2 : 3) : -1;
    m.querySelector('#isr').innerHTML = `<svg viewBox="0 0 520 240" style="width:100%">
      ${box(10,10,240,'movwf interrupt_temp …','save W / STATUS (not bank-safe)',ph===0)}
      ${box(270,10,240,'fade_how','table_count1/2 → table → dac1/2_reg',ph===1&&s.kind!=='cut')}
      ${box(270,60,240,'switch','hard_switch: cut in one interrupt',ph===1&&s.kind==='cut')}
      ${box(10,60,240,'output_DtoA','2 × (8 + 4) bits, CS pulse',ph===2)}
      ${box(10,110,240,'bcf PIR1,TMR2IF','matches before here are lost',false)}
      ${box(270,110,240,'flags clear? → interupts_over','clrf table_counts, PEIE = 0',ph===3&&s.done)}
      ${box(140,160,240,'RETFIE','restore STATUS/W (zero_flag trick)',ph===3&&!s.done)}
      <text x="10" y="225" font-size="11" fill="var(--ink2)">${s? `Last ISR ${SIM.fmtT(s.t0)}: ${s.kind}, tc ${hex(s.before.tc1)}/${hex(s.before.tc2)} → ${hex(s.tc1)}/${hex(s.tc2)}, dac ${hex(s.dac1)}/${hex(s.dac2)}, ${s.lost.length} lost` : 'No interrupt yet.'}</text></svg>`;
    const led = p.led!==undefined? p.led : 0x5D, f1 = p.f1||0;
    const i1 = !(led&0x20), i2 = !(led&0x40);
    const node=(x,y,l,on,sub)=>`<g><rect x="${x-62}" y="${y-24}" width="124" height="48" rx="24" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-2}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 520 200" style="width:100%">
      ${node(80,60,'INPUT 1',i1&&!i2&&!(f1&(F1.in1|F1.in2)),'dac2 = 0, dac1 = 0xFF')}
      ${node(440,60,'INPUT 2',i2&&!i1&&!(f1&(F1.in1|F1.in2)),'dac1 = 0, dac2 = 0xFF')}
      ${node(260,40,'fading → 2',!!(f1&F1.in2)&&!(f1&F1.in1),'in2_flag')}
      ${node(260,110,'fading → 1',!!(f1&F1.in1)&&!(f1&F1.in2),'in1_flag')}
      ${node(260,170,'BOTH UP (mix)',i1&&i2,'both tallies held')}
      <path d="M142 52 L198 44" stroke="var(--ink2)" fill="none" marker-end="url(#a16)"/><path d="M322 44 L378 52" stroke="var(--ink2)" fill="none" marker-end="url(#a16)"/>
      <path d="M378 70 L322 104" stroke="var(--ink2)" fill="none" marker-end="url(#a16)"/><path d="M198 110 L142 72" stroke="var(--ink2)" fill="none" marker-end="url(#a16)"/>
      <path d="M260 64 L260 86" stroke="var(--warn)" fill="none" marker-end="url(#a16)"/><text x="6" y="196" font-size="9.5" fill="var(--warn)">press the other input mid-fade: counts = 0xFF − count</text>
      <text x="6" y="16" font-size="11" fill="var(--ink)">led ${bin(led)} · ${led&1?'tally control':'MANUAL'} · ${MODE_NAME(led)}</text></svg>`;
    drawTables(m.querySelector('#tabs'), t);
    const R = simulate(); const S2 = R.final || {};
    const bitRow = (v, names)=>`<tr>${names.map((nm,i)=>`<td class="mono small" style="text-align:center;${(v>>(7-i))&1?'background:color-mix(in srgb,var(--accent) 22%,transparent)':''}">${nm}<br>${(v>>(7-i))&1}</td>`).join('')}</tr>`;
    m.querySelector('#reg').innerHTML = `<table class="kv"><tr><th colspan="8">led_output_reg / PORTB (0 = LED lit) — ${hex(led)}</th></tr>${bitRow(led,['read','IN2','IN1','n/u','V','CROSS','LOG','MAN'])}
      <tr><th colspan="8">flag_1 — ${hex(f1)}</th></tr>${bitRow(f1,['frm_ext','zero','ad2','ad1','in2','in1','prss','rel'])}
      <tr><th colspan="8">flag_2 — ${hex(p.f2||0)}</th></tr>${bitRow(p.f2||0,['hard','clr_in','dry_pr','special','in_flag','flash','ext2','ext1'])}</table>
      <p class="small muted">RAM map (from the <span class="mono">res</span> directives in the code section): input_reg 0x3F, input_reg2 0x40, flag_1 0x41, flag_2 0x42, led_output_reg 0x43 … dac1_reg 0x50, dac2_reg 0x51, time_reg 0x52, table_count1/2 0x55/0x56. In V100 every address is one lower (listing in PD16V1XX.ASM).</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes</th></tr>
      <tr><td>Press MANUAL</td><td class="mono small">input → debounce (7 passes) → pb_led_output → check_manual</td><td class="small">led bit 0 toggles; bounce_reg2 = 0xFF. Ignored while a fade runs.</td></tr>
      <tr><td>Press a MODE button</td><td class="mono small">check_cross1/2/3</td><td class="small">led bits 1–3 (radio). The ISR copies them to interrupt_reg at set_int, so a mode applies from the next fade.</td></tr>
      <tr><td>Press INPUT 1/2 (MANUAL lit)</td><td class="mono small">check_it1/2 → do1/do2 → fade_set → set_int</td><td class="small">in1/in2_flag; Timer 2 on; 256 interrupts each write one table step to both DACs.</td></tr>
      <tr><td>Press the other input mid-fade</td><td class="mono small">do1 → skipit_1 (or do2 → skipit_2)</td><td class="small">table_count1/2 = 0xFF − count: reverses smoothly from the current point.</td></tr>
      <tr><td>Apply / release a tally (MANUAL dark)</td><td class="mono small">input (RC2/RC3) → debounce_dry → dry_led_output → do1/do2 · off_ext1/2 · dryness1/2</td><td class="small">Select, mix both (dryness), or hand over when released (off_ext).</td></tr>
      <tr><td>Turn FADE TIME</td><td class="mono small">AtoD (3 passes) → time_reg = 0xFF − ADRES, or switch_hard</td><td class="small">Only read into PR2 at the next set_int. Turning to CUT mid-fade makes the next ISR finish it with switch.</td></tr>
      <tr><td>Power on</td><td class="mono small">init → output_DtoA</td><td class="small">LEDs 0x5D; dac1 = 0xFF, dac2 = 0; shift_count not initialised.</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b> · run so far: ${S2.reversals||0} reversals, ${S2.cuts||0} cuts, fades by mode ${JSON.stringify(S2.fadesByMode||{})}.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod16Active = false;
  const R = simulate();
  const minFade = (()=>{ let best=[9,1e9]; for (let pr=8; pr<=20; pr++){ const s=fadeSeconds(pr); if (s<best[1]) best=[pr,s]; } return best; })();
  m.innerHTML = card('What the POD16 firmware is up to — findings from the source', `
  <ol>
    <li><b>The fade laws don't match the button names.</b> The SSM2018 is a dB-linear VCA: its control voltage sets attenuation in dB, so a DAC ramp that is linear in time gives a fade that is linear in dB. <span class="mono">linear_table</span> (cross_2, “LINEAR CROSS FADE” in the code, “CROSS FADE” in the functional diagram) is therefore the <i>linear-dB</i> fade, crossing at about −24 dB. <span class="mono">db_table</span> (cross_1, “DB CROSS FADE”, the LOG FADE button) fits −20·log₁₀(1 − (i−1)/254) ÷ 0.1875 exactly (sum of squared error 38 over 253 entries). That is a <i>linear-voltage</i> fade, crossing at −6 dB. The table names describe the numbers stored in them, not the result. ${inf}: the dB-per-step scale depends on how RANGE-1/2 were trimmed.</li>
    <li><b>The T2CON comment is wrong; the value is right.</b> <span class="mono">movlw 0x45 ;POSTSCALE 1:7 / PRESCALE 1:8</span>. In fact 0x45 sets postscale 1:9 and prescale 1:4. With PR2 = 0xFF that gives 256 × 36 × 256 Tcy = <b>1.92 s</b>, which matches the manual's 2 s. The commented setting would give 2.98 s.</li>
    <li><b>The fastest fade is about ${(minFade[1]*1000).toFixed(0)} ms, not 10 ms.</b> The manual says 10 ms to 2 s. ADRES above 0xF7 is CUT, so the shortest PR2 is 8, and an interrupt then comes every 324 Tcy. The ISR runs ≈ 372 Tcy and clears <span class="mono">TMR2IF</span> after the DAC write, so every second match is lost and PR2 = 8 fades in ≈ ${(fadeSeconds(8)*1000).toFixed(0)} ms. That is slower than PR2 = 9 (≈ ${(fadeSeconds(9)*1000).toFixed(0)} ms). The main loop is starved for the whole of these fades (orange passes on the timeline).</li>
    <li><b>The RAM variables live in program space.</b> <span class="mono">input_reg res 1</span> … <span class="mono">table_count2 res 1</span> are placed after <span class="mono">init</span> in the absolute code section. That makes their “addresses” the program counter values 0x3F–0x56, which happen to fall in bank-0 RAM. The V100 listing (saved as <span class="mono">V100/PD16V1XX.ASM</span>) has INPUT_REG at 0x3E. One more instruction in v101's ISR (<span class="mono">call switch</span>) moved every variable up by one.</li>
    <li><b>The ISR context save is not bank-safe.</b> <span class="mono">movwf interrupt_temp</span> is the first instruction, run in whatever bank the main loop was in. The main loop is in bank 1 for a few cycles in <span class="mono">input</span> (both TRISB writes) and in the <span class="mono">AtoD</span> set-up (TRISA). An interrupt there stores W and STATUS in bank 1, then restores stale copies from bank 0. The next <span class="mono">movwf TRISB</span> then writes PORTB instead. The likely effect (${inf}) is a debounce restart, or all LEDs dark for one pass. This run had <b>${R.races.length}</b> such hit${R.races.length===1?'':'s'} (red ticks on the main-loop lane).</li>
    <li><b>The ISR disables the wrong interrupt.</b> It does <span class="mono">bcf PIE1,TMR1IE ;Clearing the timer2 interrupt</span> twice. TMR1 was never enabled, so TMR2IE stays on and the fade is really stopped by clearing PEIE in <span class="mono">interupts_over</span>.</li>
    <li><b>CUT can't mix.</b> In <span class="mono">switch</span>, a cut to input 2 always writes <span class="mono">dac2_reg = 0xFF</span> (input 1 off). With tally 1 held and tally 2 applied in CUT mode, both INPUT LEDs light but only input 2 is heard. In fade modes, <span class="mono">dryness2</span> keeps input 1 up correctly.</li>
    <li><b>shift_count is never initialised.</b> <span class="mono">init</span> calls <span class="mono">output_DtoA</span> before anything sets <span class="mono">shift_count</span>, so the first <span class="mono">sft_out</span> shifts as many bits as the RAM happened to hold. The last 12 bits (U4, input 1) are always right. U5 (input 2) can come up wrong and stays wrong until the first fade. Try the “shift_count in RAM” menu on the Simulator tab.</li>
    <li><b>flash_on tests the wrong register.</b> <span class="mono">btfsc flag_2,in2_flag</span>: bit 3 of flag_2 is <span class="mono">input_flag</span>, which the first button press sets and nothing clears. It does no harm because <span class="mono">input</span> rewrites PORTB on every pass.</li>
    <li><b>RC5 stays high after a normal fade.</b> <span class="mono">fade_how</span> sets RC5 on every step, but only <span class="mono">switch</span> (the cut) clears it. RC0/RC4 show CUT vs fade on every A/D read. All three are test points on unconnected pins; v101 changed TRISC from 0xFF to 0xCE to drive them.</li>
    <li><b>The FADE TIME direction disagrees.</b> The silkscreen puts CUT at the counter-clockwise end and 2SEC clockwise. The firmware says “CUT IS FULL-SCALE VOLTAGE”, but the schematic's CW mark on RV1 is at +5 V, which would put CUT clockwise. The simulator follows the silkscreen. Which one is right depends on how the trimmer was fitted (${inf}).</li>
    <li><b>MODE and MANUAL are locked during a fade.</b> <span class="mono">check_manual</span> returns if in1/in2_flag is set. The manual doesn't mention this.</li>
    <li><b>Releasing a tally hands over; it doesn't fade to silence.</b> The manual says “releasing these inputs will fade the input down”. In code, <span class="mono">off_ext1</span> with input 1 alone jumps to <span class="mono">do2</span>, so input 2 comes up. One input is always on.</li>
    <li><b>Leftovers.</b> <span class="mono">special</span> is tested and cleared but never set. <span class="mono">frm_ext</span>, <span class="mono">frm_ext1/2</span> and <span class="mono">input_flag</span> are only written; <span class="mono">table_count</span> is cleared and never used. <span class="mono">init</span> sets <span class="mono">ad_flag1</span> and then clears flag_1. The DAC clock is still called <span class="mono">led_clk</span>. RB4 is “not_used”, although the front board has seven switch positions. A second pot on RA1 is wired but never read. <span class="mono">linear_table</span> skips the values 12 and 242 to fit 0,0 … 255,255 into 256 entries.</li>
    <li><b>The RS422 option was never written.</b> The manual offers it (“consult the factory”) and the schematic has J1 DE-9 with two 75176s marked “not installed”. No firmware version touches the USART. The rear panel (REAR ISS 4) keeps the .465 × .768 DE-9 cut-out, covered by a blanking plate in the photo.</li>
    <li><b>The rails are not ±18 V.</b> They are labelled ±18 V, but LM317/LM337 with 221R/2K63 give 1.25 × (1 + 2630/221) = ±16.1 V.</li>
    <li><b>History of the cut.</b> V100 (Oct 1998) made a cut by forcing <span class="mono">time_reg = 1</span> and running the table fade at full speed: about 77 ms, ISR-bound, with the crossover dip of the chosen mode. Tim Clarke's v1.01 (14 Sep 2000) added <span class="mono">hard_switch</span> and <span class="mono">switch</span> “to have a cut transition without hearing any noticeable gap”. The 15 Oct 1998 “safety feature” (<span class="mono">check_interrupt</span>) re-arms Timer 2 if GIE was lost.</li>
    <li><b>Files.</b> <span class="mono">V100/PD16V1XX.ASM</span> is not source: it is the MPASM 01.40 listing of PD16V100.ASM, with the symbol table and memory map (1 332 words used). There are two <span class="mono">POD16-REAR ISS 4 (PANEL)</span> PDFs: one with a trailing space (Jun 2016, landscape, PEM note “FH-440-5”) and one from Oct 2015 (rotated, “FH-440-5 OR FH-440-6”). The OrCAD design cache also holds LF353 and SSM2017 parts that are not on the printed sheets. <span class="mono">pod16.pjt</span> sets the simulator clock to 140 000 000 Hz (the board runs at 4.9152 MHz) and WDT off. There is no <span class="mono">__CONFIG</span> in the source, so the fuses were set when each OTP part was programmed.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Instruction counts per routine and per ISR are counted from the listing and rounded (${inf}). The pass is 1 912 Tcy ≈ 1.556 ms; the ISR is ≈ 372 Tcy.</li>
    <li>VCA calibration: 0.1887 dB per 8-bit step (255 = 48.1 dB), the scale the tables were computed for (${inf}). The real value was set with RANGE-1/2; the “255 = 100 dB” option shows a deeper trim.</li>
    <li>The CTL pin follows the DAC through a single 50 µs RC; LT1451 settling (≈ 14 µs) and VCA dynamics are ignored.</li>
    <li>A mouse click holds a button for ${C.PRESS*1000} ms (${inf}). Tallies switch cleanly. A/D conversion finishes before the next pass.</li>
    <li>Bank-1 race effects are flagged, not fully modelled: the LEDs go dark for one pass on a TRISB-B hit.</li>
    <li>Sources on the inputs are test tones (400 Hz, 1 kHz).</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/XXX - POD16 - #Master #OBSOLETE/POD16 - #Engineering/Software/v101/pd16v101.asm, PD16V101.ERR, pod16.pjt</li>
    <li>…/Software/V100/PD16V100.ASM, PD16V1XX.ASM (listing), TESTV100.ASM, OLD/PD16V1X1 … PD16V2X3, DBLFADE, JUNK</li>
    <li>…/MANUAL/Pod16sch.pdf (Pod16_1/2/3sch.pdf), POD16MAN.WPD · …/POD16 - Functional Diagram.pdf · …/PCB/POD16-iss3.pcb, OBSOLETE/ARCHIVE/POD16.DSN</li>
    <li>…/POD16 - #ARTWORK #DA #2016/POD16-FRONT&amp;REAR(CURVE).pdf, Pics/POD16 Front.jpg, POD16 Rear.jpg</li>
    <li>…/POD16 - #Mechanical #DA #2016/POD16-FRONT ISS 1 (PANEL).pdf, POD16-REAR ISS 4 (PANEL).pdf and “(PANEL) .pdf”</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'pod16', name:'POD16 · stereo audio cross-fader ('+Y(1998)+')', duration:C.DUR,
  product:'POD16', year:1998, family:'Obsolete products',
  folder:'#POD #SERIES/XXX - POD16 - #Master #OBSOLETE',
  summary:'Half-rack 2 × 1 stereo fader: four SSM2018 VCAs summed into one balanced output, faded by a PIC16C73A through two LT1451 DACs. Three fade laws from 256-entry tables, a 10 ms…2 s FADE TIME trim (CUT since v1.01), and selection from the front panel or from WET/DRY tally inputs.',
  highlights:['Real silkscreen front and rear; buttons, trim, tallies all live','Every main-loop pass and Timer 2 interrupt replayed from the v1.01 code','DAC daisy chain shifted bit by bit, VCA gains and the output waveform','11-step operator tutorial from the manual','18 findings: table names vs fade laws, lost timer matches, RAM in program space, bank-unsafe ISR'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass', period:()=>simulate().avgPass},
    {label:'1 fade step (PR2 = 0x7F)', period:()=>C.T2_MUL*128*C.TCY},
    {label:'1 DAC bit clock', period:()=>10*C.TCY},
    {label:'1 ms', period:()=>0.001},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[C.DUR,'whole run ('+C.DUR+' s)'],[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms'],[0.005,'5 ms (3 passes)'],[0.002,'2 ms (1 pass)'],[0.0005,'500 µs (1 ISR)'],[0.0001,'100 µs (DAC bits)']],
  defaultZoom:0,
  init(){ SIMKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD16', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
