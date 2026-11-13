/* =====================================================================
   POD28 — SD/HD-SDI reclocking distribution amplifier (Ward-Beck Systems, 2003|36)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive):
   - #POD #SERIES/POD28 - #Master/POD28 - #Engineering/Software/v101w/28v101.asm + autodetect.asm
     and Software/v100/28v100.asm + autodetect.asm. Both are embedded below VERBATIM and run on a
     small PIC16 instruction interpreter, cycle by cycle (Tcy = 4 / 4.9152 MHz).
   - .../Software/v101w/v101.mcp, pod28.pjt  (MPASM options /c- /rdec, processor 0x874f)
   - .../PCB/pod28iss3.net (= OBSOLETE/ISSUE 2/pod28iss2.net), ISSUE 2/pod28iss2.ECO, ISSUE 1/pod28iss1.net
   - .../PCB/WORKING/pod28iss3.net + POD28iss3.pcb ("ISSUE 3-test": the 3G redesign)
   - .../P-CAD EDA - [Sheet1..3].pdf  (Issue 1 schematic, 4 Nov 2003)
   - .../MANUAL/POD28MAN.wpd, POD28MAN.doc  (operator manual)
   - .../POD28 - Functional Diagram.cdr  (converted with Inkscape)
   - POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD28/POD28-FRONT&REAR(FINAL CURVE).pdf (silk)
     and Pics/POD28 Front.jpg, POD28 Rear.jpg
   - POD28 - #Mechanical #DA #2016/POD28-FRONT ISS 1.pdf, POD28-REAR ISS 1.pdf (drill positions)
   - POD27 - #TESTREPORT/POD28-ASI PASS-24JUN10.pdf  (misfiled test e-mail)
   - POD28 - Upgrade #RD #RD48/Requirements.txt
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (title, body, cls) => `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;

/* ---------------- the real firmware (verbatim from the archive) ---------------- */
const SRC = {
  v101main: ";*********************************************\n;POD28 JUNE 23, 2005\n;\n;CHANGED LOCK DETECTION FLAG TO THAT OF THE\n;RECLOCKER GS1535\n;*********************************************\n\n\tERRORLEVEL -302\n\n\t#INCLUDE \"P16f874.INC\"\n\n\n;************ CPU CONTROL MACROS **********\n\nBANK0\tMACRO\n\tBCF STATUS,5\n\tbcf status,6\n\tENDM\n\nBANK1\tMACRO\n\tBSF STATUS,5\n\tbcf status,6\n\tENDM\n\nBINIT\tEQU 0X4F\n;************ PROGRAM CONSTANTS*************\n\n\nZ\tEQU 2\t;ZER0 FLAG IN STATUS REG\n\ndetect_count1\tequ 5\ndetect_count\tequ 100\n\n;*************  BANK0  RAM ***************\n\tORG 20H \t;BANK0 MEMORY\n\nlock\tres 1\nlock1\tres 1\ndelay1\tres 1\n\nbcount1_1\tres 1\nbcount_1\tres 1\nplock1\t\tres 1\ntemp\t\tres 1\nunstable\tres 1\n;********************  BANK 1 FILE REISTERS*****************\n\n\n;    160 THROUGH 256 ARE GENERAL PURPOSE REGISTERS\n\n\n\n\n;***************  RESET  ****************************\n\tORG 0\nRESET   GOTO INIT\n\n\n;*************\tINTERRUPTS  *************************\n\n\tORG 4H\n\tRETFIE\n;******  TABLE LOOKUP ****************************\n\n;************** INIT  ******************************\n\nINIT\n\tBANK0\n\n\tMOVLW B'11111111'\n\tMOVWF PORTA\n\n\tMOVLW B'11111111'\n\tMOVWF PORTB\n\n\tMOVLW B'11110100'\n\tMOVWF PORTC\n\n\tMOVLW B'11111111'\n\tMOVWF PORTd\n\tMOVLW B'11111111'\n\tMOVWF PORTe\n\n\tBANK1\n\n\tMOVLW \tB'00000011'\n\t;MOVLW \tB'00000010'\n\n\tMOVWF \tTRISA\n\tMOVLW \tB'11001000'\n\tMOVWF \tTRISB\n\n \tBsF OPTION_REG,7\t;ENABLE PORT B WEAK PULL-UPS\n\n\tMOVLW \tB'00000000'\n\tMOVWF \tTRISC\n\n\t;MOVLW \tb'10000001'\n\tMOVLW\tb'10000011'\n\tMOVWF \tTRISD\n\n\tMOVLW \tb'11100000'\n\tMOVWF \tTRISE\n\n\tBcF \tADCON1,PCFG3\t;porta/e is digital i/o\n\tBSF \tADCON1,PCFG2\n\tBSF \tADCON1,PCFG1\n\tbsF \tADCON1,PCFG0\n\n\tbank0\n\n\tmovlw \tdetect_count1\n\tmovwf \tbcount1_1\n\tmovlw \tdetect_count\n\tmovwf \tbcount_1\n\tclrf \tplock1\n\tclrf\ttemp\n\tclrf \tunstable\n\n\tbcf\tportc,3\t\t;disable ASI lock, enable lock of 177\n\tbcf\tportc,1\t\t;disable BYPASS\n\tbsf\tportc,2\t\t;enable SDI outputs\n\n\tGOTO MAIN\n\n\n\n\n\n\n;**************  MAIN  ******************\n\n\nMAIN\t\tCLRWDT\n\t\tcall readgs1524\n\t\tcall readgs1535\n\t\tcall autodetect1\n\t\tcall refresh\n\n\n\t\tclrf delay1\nrdelay1\t\tclrwdt\n\t\tdecfsz delay1,f\n\t\tgoto rdelay1\n\t\tgoto main\n\n\n;*****************************************\nreadgs1524\n\tclrf\tlock\n\n\t;bcf\tporta,0\n\tbtfss \tporta,0\t;CD/mute\n\n\tbsf\tlock,0\t;signal present\n\treturn\n\n;*****************************************\nreadgs1535\n\tclrf \tlock1\n\n\tbtfsc\tportd,1\t;LD lock detect of the gs1535\n\tbsf \tlock1,0\n\tbtfsc \tportd,0\t;SD/HD if 0 HD if 1 SD\n\tbsf\tlock1,1\n\treturn\n\n;****************************************\nrefresh\n\tbtfsc \tlock1,0\n\tbsf\tportb,1\t;LOCK\n\tbtfss\tlock1,0\n\tbcf \tportb,1\n\n\tbtfsS \tlock1,0\n\tbsf\tportb,4\t;ERROR\n\tbtfsC\tlock1,0\n\tbcf \tportb,4\n\n\tBTFSS\tLOCK1,0\t;NOT LOCKED DO NOT TURN LED ON\n\tGOTO\tNOT_LOCKED\n\n\tbtfsc \tunstable,0\n\tbsf\tportb,4\t;ERROR\n\tbtfss\tunstable,0\n\tbcf \tportb,4\n\n\t;btfsc \tunstable,0\n\t;bcf\tportb,1\t;ERROR\n\n\tBTFSC \tUNSTABLE,0 ;SD/HD IS UNSTABLE DO NOT TURN LED ON\n\tGOTO \tNOT_LOCKED\n\n\tbtfss \tlock1,1\n\tbsf\tportb,2\t;HD\n\tbtfsc\tlock1,1\n\tbcf \tportb,2\t;~HD\n\n\t;btfsc \tlock1,0\n\t;bsf\tportb,1\t;LOCK\n\t;btfss\tlock1,0\n\t;bcf \tportb,1\n\n\treturn\n\nnot_locked\n\tbcf\tportb,2\n\tbcf\tportb,1\n\tbsf\tportb,4\n\n\treturn\n\n\t#include \"autodetect.asm\"\n\n\tend",
  v101auto: ";******************************************************************\nautodetect1\n\t\tbtfss lock1,0\t\t;check if is SDI locked\n\t\tgoto no_lock1\n\t\tgoto sig_lock1\n\nsig_lock1\n\t\tmovlw\t2\n\t\tandwf\tlock1,w\n\t\tmovwf\ttemp\t\t;,1=SD/HD bit\n\n\t\tmovf\ttemp,w\n\t\txorwf\tplock1,w\t;compare with previous stable state\n\t\tbtfss\tstatus,z\t;if z=1 then it is stable\n\t\tgoto\tunstable_state\t;else goto unstable routine\n\n\t\tdecfsz bcount_1,f\n\t\treturn\n\n\t\t;btfss lock1,1\t\t;check if in HD mode locked\n\t\t;goto switch_state1\n\n\t\tmovlw detect_count1\t;2\n\t\tmovwf bcount1_1\n\t\tmovlw detect_count\t;9\n\t\tmovwf bcount_1\n\n\t\tbcf unstable,0\t\t;error SD/HD is stablized\n\n\t\tbcf lock,1\t\t;SD/HD is now stabilized\n\t\treturn\nunstable_state\n\t\tdecfsz bcount1_1,f\n\t\treturn\n\n\t\tmovlw detect_count1\n\t\tmovwf bcount1_1\n\t\tmovlw detect_count\n\t\tmovwf bcount_1\n\n\t\tbsf unstable,0\t\t;error SD/HD is not stablized\n\n\t\tmovf temp,w\n\t\tmovwf plock1\t\t;store this value as the stable state of SD/HD\n\n\t\treturn\nno_lock1\n\t\t;decfsz bcount_1,f\n\t\t;return\n\n\t\tmovlw detect_count1\n\t\tmovwf bcount1_1\n\t\tmovlw detect_count\n\t\tmovwf bcount_1\n\t\t;movlw 1\n\t\t;xorwf lock1,f\t\t;switch source\n\t\t;bcf lock1,1\t\t;signal is not HD mode locked\n\n\t\treturn",
  v100main: ";*********************************************\n;POD28 DEMUX VERSION 1.00\n;NOVEMBER 4, 2003\n;\n;*********************************************\n\n\tERRORLEVEL -302\n\n\t#INCLUDE \"P16f874.INC\"\n\n\n;************ CPU CONTROL MACROS **********\n\nBANK0\tMACRO\n\tBCF STATUS,5\n\tbcf status,6\n\tENDM\n\nBANK1\tMACRO\n\tBSF STATUS,5\n\tbcf status,6\n\tENDM\n\nBINIT\tEQU 0X4F\n;************ PROGRAM CONSTANTS*************\n\n\nZ\tEQU 2\t;ZER0 FLAG IN STATUS REG\n\ndetect_count1\tequ 5\ndetect_count\tequ 100\n\n;*************  BANK0  RAM ***************\n\tORG 20H \t;BANK0 MEMORY\n\nlock\tres 1\nlock1\tres 1\ndelay1\tres 1\n\nbcount1_1\tres 1\nbcount_1\tres 1\nplock1\t\tres 1\ntemp\t\tres 1\nunstable\tres 1\n;********************  BANK 1 FILE REISTERS*****************\n\n\n;    160 THROUGH 256 ARE GENERAL PURPOSE REGISTERS\n\n\n\n\n;***************  RESET  ****************************\n\tORG 0\nRESET   GOTO INIT\n\n\n;*************\tINTERRUPTS  *************************\n\n\tORG 4H\n\tRETFIE\n;******  TABLE LOOKUP ****************************\n\n;************** INIT  ******************************\n\nINIT\n\tBANK0\n\n\tMOVLW B'11111111'\n\tMOVWF PORTA\n\n\tMOVLW B'11111111'\n\tMOVWF PORTB\n\n\tMOVLW B'11110100'\n\tMOVWF PORTC\n\n\tMOVLW B'11111111'\n\tMOVWF PORTd\n\tMOVLW B'11111111'\n\tMOVWF PORTe\n\n\tBANK1\n\n\tMOVLW \tB'00000011'\n\t;MOVLW \tB'00000010'\n\n\tMOVWF \tTRISA\n\tMOVLW \tB'11001000'\n\tMOVWF \tTRISB\n\n \tBsF OPTION_REG,7\t;ENABLE PORT B WEAK PULL-UPS\n\n\tMOVLW \tB'00000000'\n\tMOVWF \tTRISC\n\n\tMOVLW \tb'10000001'\n\tMOVWF \tTRISD\n\n\tMOVLW \tb'11100000'\n\tMOVWF \tTRISE\n\n\tBcF \tADCON1,PCFG3\t;porta/e is digital i/o\n\tBSF \tADCON1,PCFG2\n\tBSF \tADCON1,PCFG1\n\tbsF \tADCON1,PCFG0\n\n\tbank0\n\n\tmovlw \tdetect_count1\n\tmovwf \tbcount1_1\n\tmovlw \tdetect_count\n\tmovwf \tbcount_1\n\tclrf \tplock1\n\tclrf\ttemp\n\tclrf \tunstable\n\n\tbcf\tportc,3\t\t;disable ASI lock, enable lock of 177\n\tbcf\tportc,1\t\t;disable BYPASS\n\tbsf\tportc,2\t\t;enable SDI outputs\n\n\tGOTO MAIN\n\n\n\n\n\n\n;**************  MAIN  ******************\n\n\nMAIN\t\tCLRWDT\n\t\tcall readgs1524\n\t\tcall readgs1535\n\t\tcall autodetect1\n\t\tcall refresh\n\n\n\t\tclrf delay1\nrdelay1\t\tclrwdt\n\t\tdecfsz delay1,f\n\t\tgoto rdelay1\n\t\tgoto main\n\n\n;*****************************************\nreadgs1524\n\tclrf\tlock\n\n\t;bcf\tporta,0\n\tbtfss \tporta,0\t;CD/mute\n\n\tbsf\tlock,0\t;signal present\n\treturn\n\n;*****************************************\nreadgs1535\n\tclrf \tlock1\n\n\tbtfsc\tportd,1\t;LD lock detect of the gs1535\n\tbsf \tlock1,0\n\tbtfsc \tportd,0\t;SD/HD if 0 HD if 1 SD\n\tbsf\tlock1,1\n\treturn\n\n;****************************************\nrefresh\n\tbtfsc \tlock,0\n\tbsf\tportb,1\t;LOCK\n\tbtfss\tlock,0\n\tbcf \tportb,1\n\n\tbtfsS \tlock,0\n\tbsf\tportb,4\t;ERROR\n\tbtfsC\tlock,0\n\tbcf \tportb,4\n\n\tBTFSS\tLOCK,0\t;NOT LOCKED DO NOT TURN LED ON\n\tGOTO\tNOT_LOCKED\n\n\tbtfsc \tunstable,0\n\tbsf\tportb,4\t;ERROR\n\tbtfss\tunstable,0\n\tbcf \tportb,4\n\n\t;btfsc \tunstable,0\n\t;bcf\tportb,1\t;ERROR\n\n\tBTFSC \tUNSTABLE,0 ;SD/HD IS UNSTABLE DO NOT TURN LED ON\n\tGOTO \tNOT_LOCKED\n\n\tbtfss \tlock1,1\n\tbsf\tportb,2\t;HD\n\tbtfsc\tlock1,1\n\tbcf \tportb,2\t;~HD\n\n\t;btfsc \tlock1,0\n\t;bsf\tportb,1\t;LOCK\n\t;btfss\tlock1,0\n\t;bcf \tportb,1\n\n\treturn\n\nnot_locked\n\tbcf\tportb,2\n\treturn\n\n\t#include \"autode~1.asm\"\n\n\tend",
  v100auto: ";******************************************************************\nautodetect1\n\t\tbtfss lock,0\t\t;check if is SDI locked\n\t\tgoto no_lock1\n\t\tgoto sig_lock1\n\nsig_lock1\n\t\tmovlw\t2\n\t\tandwf\tlock1,w\n\t\tmovwf\ttemp\t\t;,1=SD/HD bit\n\n\t\tmovf\ttemp,w\n\t\txorwf\tplock1,w\t;compare with previous stable state\n\t\tbtfss\tstatus,z\t;if z=1 then it is stable\n\t\tgoto\tunstable_state\t;else goto unstable routine\n\n\t\tdecfsz bcount_1,f\n\t\treturn\n\n\t\t;btfss lock1,1\t\t;check if in HD mode locked\n\t\t;goto switch_state1\n\n\t\tmovlw detect_count1\t;2\n\t\tmovwf bcount1_1\n\t\tmovlw detect_count\t;9\n\t\tmovwf bcount_1\n\n\t\tbcf unstable,0\t\t;error SD/HD is stablized\n\n\t\tbcf lock,1\t\t;SD/HD is now stabilized\n\t\treturn\nunstable_state\n\t\tdecfsz bcount1_1,f\n\t\treturn\n\n\t\tmovlw detect_count1\n\t\tmovwf bcount1_1\n\t\tmovlw detect_count\n\t\tmovwf bcount_1\n\n\t\tbsf unstable,0\t\t;error SD/HD is not stablized\n\n\t\tmovf temp,w\n\t\tmovwf plock1\t\t;store this value as the stable state of SD/HD\n\n\t\treturn\nno_lock1\n\t\t;decfsz bcount_1,f\n\t\t;return\n\n\t\tmovlw detect_count1\n\t\tmovwf bcount1_1\n\t\tmovlw detect_count\n\t\tmovwf bcount_1\n\t\t;movlw 1\n\t\t;xorwf lock1,f\t\t;switch source\n\t\t;bcf lock1,1\t\t;signal is not HD mode locked\n\n\t\treturn",
};

/* ---------------- constants ---------------- */
const FOSC = 4.9152e6;           // X2 = 4.9152 (pod28iss3.net); the .pjt still says 4.000000 MHz
const TCY = 4/FOSC;              // 813.8 ns per instruction cycle
const C = {
  BOOT: 0.0722,                  // PWRT 72 ms + OST 1024·Tosc — INFERRED (config bits are not in the source)
  ACQ: 0.0005,                   // GS1535 lock acquisition after a change — INFERRED
  PRE: 0.25,                     // the unit has been running this long before t = 0 (warm start)
  FLAP: 0.0037,                  // lock flaps in ≈3.7 ms bins on a marginal cable — INFERRED
  MARGIN: 1.3,                   // carrier still detected up to 1.3 × the manual's cable length — INFERRED
};
const STD = {
  none:  {name:'No signal', short:'none', rate:0, lock:false},
  sd525: {name:'SD-SDI 270 Mb/s · 525i 59.94', short:'SD 525', rate:270e6, hd:false, lock:true, line:1001/30000/525, field:1001/60000, words:1716, hb:276, kind:'video', std:'SMPTE 259M-C'},
  sd625: {name:'SD-SDI 270 Mb/s · 625i 50', short:'SD 625', rate:270e6, hd:false, lock:true, line:64e-6, field:0.02, words:1728, hb:288, kind:'video', std:'SMPTE 259M-C'},
  hd1080:{name:'HD-SDI 1.4835 Gb/s · 1080i 59.94', short:'HD 1080i', rate:1.485e9/1.001, hd:true, lock:true, line:1001/30000/1125, field:1001/60000, words:4400, hb:560, kind:'video', std:'SMPTE 292M'},
  hd720: {name:'HD-SDI 1.4835 Gb/s · 720p 59.94', short:'HD 720p', rate:1.485e9/1.001, hd:true, lock:true, line:1001/60000/750, field:1001/60000, words:3300, hb:740, kind:'video', std:'SMPTE 292M'},
  asi:   {name:'DVB-ASI 270 Mb/s (8b/10b)', short:'ASI', rate:270e6, hd:false, lock:true, kind:'asi', std:'EN 50083-9'},
  c143:  {name:'143 Mb/s · 525 composite 4fsc', short:'143', rate:143.18e6, hd:false, lock:true, line:1001/30000/525, field:1001/60000, words:910, hb:142, kind:'video', std:'SMPTE 259M-A'},
  c177:  {name:'177 Mb/s · 625 composite 4fsc', short:'177', rate:177.34e6, hd:false, lock:true, line:64e-6, field:0.02, words:1135, hb:188, kind:'video', std:'SMPTE 259M-B'},
  sd360: {name:'360 Mb/s · 525i 16:9 (18 MHz)', short:'360', rate:360e6, hd:false, lock:true, line:1001/30000/525, field:1001/60000, words:2288, hb:368, kind:'video', std:'SMPTE 259M-D'},
  sd540: {name:'540 Mb/s · 525p', short:'540', rate:540e6, hd:false, lock:true, line:1001/60000/525, field:1001/60000, words:1716, hb:276, kind:'video', std:'SMPTE 344M'},
  g3:    {name:'3G-SDI 2.97 Gb/s · 1080p 59.94 (RD48)', short:'3G', rate:2.97e9/1.001, hd:true, lock:false, line:1001/60000/1125, field:1001/60000, words:4400, hb:560, kind:'video', std:'SMPTE 424M'},
};
const LIMIT = st => (st.rate >= 1e9 ? 120 : 300);   // manual: 300 m SD, 120 m HD (Belden 8281)

/* ---------------- device state ---------------- */
const D = {
  in: { std:'sd525', cable:30, conn:true },   // input at t = 0
  ev: [],                                      // changes made at the playhead: {t, kind:'sig'|'pwr', ...}
  fw: 'v101',                                  // firmware: v101 (23 Jun 2005) or v100 (4 Nov 2003)
  board: 'iss3',                               // iss3 = Issue 2/3 (AUTOBYPASS = GND); iss1 = Issue 1 (AUTOBYPASS = VCC_1)
  cold: false,                                 // power switched on at t = 0
  scopeOut: 1,
  log: [],
};

/* ---------------- input / chip models ---------------- */
function sigAt(t){ let s = D.in; for (const e of D.ev) if (e.kind==='sig' && e.t<=t) s = e; return s; }
function powerAt(t){ let on = !D.cold || t>=0; for (const e of D.ev) if (e.kind==='pwr' && e.t<=t) on = e.on; return on; }
function powerOnAt(t){ let a = D.cold? 0 : -1e9; for (const e of D.ev) if (e.kind==='pwr' && e.on && e.t<=t) a = e.t; return a; }
function lastChange(t){ let c = powerOnAt(t); for (const e of D.ev) if (e.kind==='sig' && e.t<=t) c = Math.max(c, e.t); return c; }
function quality(s){ const st = STD[s.std]; if (!s.conn || !st.rate) return 'none'; const L = LIMIT(st); return s.cable<=L ? 'ok' : s.cable<=L*C.MARGIN ? 'marginal' : 'lost'; }
function hash(n){ n = (n|0) ^ 61 ^ ((n|0) >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n>>>0)/4294967296; }
function cdAt(t){ if (!powerAt(t)) return false; const q = quality(sigAt(t)); return q==='ok' || q==='marginal'; }      // GS1524 carrier detect
function ldAt(t){                                                                                                          // GS1535 LD
  if (!cdAt(t)) return false; const s = sigAt(t), st = STD[s.std];
  if (!st.lock) return false;
  if (t - lastChange(t) < C.ACQ) return false;
  if (quality(s)==='marginal') return hash(Math.floor(t/C.FLAP)) > 0.45;
  return true;
}
function sdhdAt(t){                                     // GS1535 SD/~HD: 1 = SD, 0 = HD; holds its last value when unlocked (inferred)
  if (ldAt(t)) return STD[sigAt(t).std].hd ? 0 : 1;
  const list = [D.in].concat(D.ev.filter(e=>e.kind==='sig' && e.t<=t));
  for (let i=list.length-1; i>=0; i--){ const s=list[i], st=STD[s.std]; if (st.lock && s.conn && quality(s)!=='lost') return st.hd?0:1; }
  return 1;
}
function outState(k, t){                                 // what OUTPUT k (1..6) carries
  if (!powerAt(t)) return 'off';
  const s = sigAt(t), st = STD[s.std];
  if (ldAt(t)) return (st.kind==='asi' && k%2===1) ? 'asifail' : 'reclocked';
  if (D.board==='iss1' && cdAt(t)) return 'bypass';
  return 'none';
}
const OUT_TXT = {off:'unit off', reclocked:'reclocked', bypass:'bypassed (equalised, not retimed)', none:'no valid data', asifail:'ASI failed here (2010 test)'};

/* ================================================================
   PIC16 interpreter: assembles the real MPASM source and runs it
   ================================================================ */
const SFR = ['STATUS','PORTA','PORTB','PORTC','PORTD','PORTE','TRISA','TRISB','TRISC','TRISD','TRISE','OPTION_REG','ADCON1'];
function assemble(mainTxt, autoTxt, incName){
  const list = [];
  mainTxt.split('\n').forEach((tx,i)=>{
    list.push({file:'28v1xx.asm', n:i+1, text:tx});
    if (/^\s*#include\s+"(?!p16)/i.test(tx)) autoTxt.split('\n').forEach((ta,j)=>list.push({file:incName, n:j+1, text:ta}));
  });
  const ins=[], labels={}, consts={pcfg0:0,pcfg1:1,pcfg2:2,pcfg3:3}, ram=[], pend=[]; let inMacro=false, ended=false;
  const MAC = { bank0:[['BCF','STATUS','5'],['BCF','STATUS','6']], bank1:[['BSF','STATUS','5'],['BCF','STATUS','6']] };
  const num = tok => { const t=String(tok).trim(); let m;
    if ((m=/^b'([01]+)'$/i.exec(t))) return parseInt(m[1],2);
    if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t,16);
    if ((m=/^([0-9a-f]+)h$/i.exec(t))) return parseInt(m[1],16);
    if (/^\d+$/.test(t)) return parseInt(t,10);
    if (t.toLowerCase() in consts) return consts[t.toLowerCase()];
    throw new Error('POD28 asm: unknown value '+t); };
  list.forEach((L,li)=>{
    if (ended) return;
    const code = L.text.split(';')[0].replace(/\s+$/,''); if (!code.trim()) return;
    const toks = code.trim().split(/\s+/);
    if (inMacro){ if (/^endm$/i.test(toks[0])) inMacro=false; return; }
    if (toks[0][0]==='#' || /^errorlevel$/i.test(toks[0])) return;
    if (toks[1] && /^macro$/i.test(toks[1])){ inMacro=true; return; }
    if (toks[1] && /^equ$/i.test(toks[1])){ consts[toks[0].toLowerCase()] = num(toks[2]); return; }
    if (toks[1] && /^res$/i.test(toks[1])){ ram.push(toks[0].toUpperCase()); return; }
    let k=0; if (/^\S/.test(code)){ pend.push(toks[0].toLowerCase()); L.label=toks[0]; k=1; }
    if (k>=toks.length) return;
    const mn = toks[k].toUpperCase(), op = toks.slice(k+1).join('');
    if (mn==='ORG') return; if (mn==='END'){ ended=true; return; }
    const emit = (o,a)=>{ pend.forEach(l=>labels[l]=ins.length); pend.length=0; ins.push({mn:o, a, li}); L.code=true; };
    if (MAC[mn.toLowerCase()]){ MAC[mn.toLowerCase()].forEach(m=>emit(m[0],[m[1],m[2]])); return; }
    emit(mn, op? op.split(','):[]);
  });
  const reg = n => { const u=n.toUpperCase(); if (ram.includes(u) || SFR.includes(u)) return u; throw new Error('POD28 asm: unknown register '+n); };
  const OPC = {MOVLW:1,MOVWF:2,BSF:3,BCF:4,CLRF:5,CALL:6,GOTO:7,RETURN:8,RETFIE:9,CLRWDT:10,DECFSZ:11,BTFSS:12,BTFSC:13,ANDWF:14,XORWF:15,MOVF:16};
  const labelAt = {}; for (const l in labels) labelAt[labels[l]] = labelAt[labels[l]] || l;
  ins.forEach(I=>{
    I.op = OPC[I.mn]; if (!I.op) throw new Error('POD28 asm: opcode '+I.mn);
    const a=I.a;
    if (I.op===1) I.k = num(a[0]);
    else if (I.op===6||I.op===7){ I.tgt = labels[a[0].toLowerCase()]; I.tname=a[0]; if (I.tgt===undefined) throw new Error('label '+a[0]); }
    else if (I.op===2||I.op===5) I.f = reg(a[0]);
    else if (I.op===3||I.op===4||I.op===12||I.op===13){ I.f = reg(a[0]); I.b = num(a[1]); }
    else if (I.op>=14||I.op===11){ I.f = reg(a[0]); I.d = /^(w|0)$/i.test(a[1]||'f') ? 0 : 1; }
    I.src = list[I.li].text.replace(/^\S+/, '').trim().split(';')[0].trim() || list[I.li].text.trim();
  });
  const clr = ins.findIndex(I=>I.op===5 && I.f==='DELAY1');
  return { list, ins, labels, labelAt, ram, main:labels.main, clrDelay:clr, rdelay:labels.rdelay1, afterDelay:labels.rdelay1+3 };
}
const PROG = {
  v101: assemble(SRC.v101main, SRC.v101auto, 'autodetect.asm'),
  v100: assemble(SRC.v100main, SRC.v100auto, 'autode~1.asm'),
};

/* external pins seen by the PIC at time t */
function pinIn(port, bit, t){
  if (port==='PORTA'){ if (bit===0) return cdAt(t)?0:1; if (bit===1) return 0; return 1; }   // RA0 = CD/MUTE (low = carrier), RA1 = CLI (analog, never read)
  if (port==='PORTD'){ if (bit===0) return sdhdAt(t); if (bit===1) return ldAt(t)?1:0; return 1; }   // RD0 SD/~HD, RD1 LD, RD7 H1 (pull-up)
  return 1;                                                                                    // RB3/6/7 pulled up, others idle
}
function rd(cpu, f, t){
  if (f[0]==='P' && f[1]==='O'){ const tris = cpu.R['TRIS'+f[4]], lat = cpu.R[f]; let v=0;
    for (let b=0;b<8;b++) v |= (((tris>>b)&1) ? pinIn(f,b,t) : ((lat>>b)&1)) << b;   // an output pin reads its own latch (v100 RD1: contention, inferred)
    return v; }
  return cpu.R[f]|0;
}
const LEDMASK = 0x16;                                   // RB1 SDI · RB2 HD · RB4 ERROR
function ledPins(cpu){ return (~cpu.R.TRISB) & cpu.R.PORTB & LEDMASK; }
function pcPins(cpu){ return (~cpu.R.TRISC) & cpu.R.PORTC & 0x0E; }   // RC1 BYPASS · RC2 ~DDO_MUTE (via U9) · RC3 ASI/~177
function newCPU(P){ const R={STATUS:0x18,TRISA:255,TRISB:255,TRISC:255,TRISD:255,TRISE:255,PORTA:0,PORTB:0,PORTC:0,PORTD:0,PORTE:0,OPTION_REG:255,ADCON1:0}; P.ram.forEach(r=>R[r]=0); return {pc:0, W:0, R, stack:[]}; }
function snap(cpu){ return {pc:cpu.pc, W:cpu.W, R:Object.assign({}, cpu.R), stack:cpu.stack.slice()}; }

/* execute one instruction; returns cycles. hook(I, info) gets a description for logging */
function step(P, cpu, t, out, hook){
  const I = P.ins[cpu.pc]; let cyc=1, skip=false, note='';
  const wr = (f,v)=>{ cpu.R[f]=v&255;
    if (out && (f==='PORTB'||f==='TRISB')){ const b=ledPins(cpu); if (b!==out.lastLed){ out.led.push({t, b}); out.lastLed=b; } }
    if (out && (f==='PORTC'||f==='TRISC')){ const b=pcPins(cpu); if (b!==out.lastPc){ out.pc.push({t, b}); out.lastPc=b; } } };
  const setZ = v=>{ cpu.R.STATUS = (v&255)===0 ? (cpu.R.STATUS|4) : (cpu.R.STATUS&~4); };
  switch (I.op){
    case 1: cpu.W=I.k; if (hook) note=`W = 0x${hx(I.k)}`; break;
    case 2: wr(I.f, cpu.W); if (hook) note=`${I.f} = 0x${hx(cpu.W)}`; break;
    case 3: case 4: { const v=rd(cpu,I.f,t); wr(I.f, I.op===3 ? v|(1<<I.b) : v&~(1<<I.b)); if (hook && I.f==='PORTB') note=ledTxt(ledPins(cpu)); else if (hook) note=`${I.f}.${I.b} = ${I.op===3?1:0}`; break; }
    case 5: wr(I.f,0); setZ(0); if (hook) note=`${I.f} = 0`; break;
    case 6: cpu.stack.push(cpu.pc+1); cpu.pc=I.tgt; return hookRet(hook, I, 2, '');
    case 7: cpu.pc=I.tgt; return hookRet(hook, I, 2, '');
    case 8: case 9: cpu.pc = cpu.stack.length? cpu.stack.pop() : 0; return hookRet(hook, I, 2, '');
    case 10: if (hook) note='watchdog cleared'; break;
    case 11: { const v=(rd(cpu,I.f,t)-1)&255; if (I.d) wr(I.f,v); else cpu.W=v; skip = v===0; if (hook) note=`${I.f} → ${v}${skip?' = 0 → skip':''}`; break; }
    case 12: case 13: { const v=(rd(cpu,I.f,t)>>I.b)&1; skip = I.op===12 ? v===1 : v===0;
      if (hook){ const pin = I.f==='PORTA'&&I.b===0?'RA0 CD/MUTE': I.f==='PORTD'&&I.b===1?'RD1 LD': I.f==='PORTD'&&I.b===0?'RD0 SD/~HD': I.f==='STATUS'&&I.b===2?'Z':`${I.f}.${I.b}`; note=`${pin} = ${v} → ${skip?'skip':'no skip'}`; } break; }
    case 14: case 15: case 16: { const f=rd(cpu,I.f,t); const v = I.op===14 ? (cpu.W & f) : I.op===15 ? (cpu.W ^ f) : f; setZ(v); if (I.d) wr(I.f,v); else cpu.W=v&255; if (hook) note=`${I.d?I.f:'W'} = 0x${hx(v)}, Z = ${(v&255)===0?1:0}`; break; }
  }
  cpu.pc++;
  if (skip){ cpu.pc++; cyc=2; }
  if (hook) hook(I, cyc, note);
  return cyc;
}
function hookRet(hook, I, c, note){ if (hook) hook(I, c, note); return c; }
const hx = v => (v&255).toString(16).toUpperCase().padStart(2,'0');
function ledTxt(b){ return `PORTB → SDI ${b&2?'ON':'off'} · HD ${b&4?'ON':'off'} · ERROR ${b&16?'ON':'off'}`; }

/* run from RESET at t0 until tEnd; records passes and pin events into out */
function runSegment(P, t0, tEnd, out){
  const cpu = newCPU(P); let cyc=0, n=0;
  let pass = {i:-1, kind:'init', t0, c0:0, marks:{}, path:[]};
  const close = t=>{ pass.t1=t; pass.cycles=cyc-pass.c0; pass.v=pickVars(P,cpu); pass.led=ledPins(cpu); out.passes.push(pass); };
  while (true){
    const t = t0 + cyc*TCY;
    if (t >= tEnd){ pass.cut=true; close(tEnd); break; }
    if (cpu.pc===P.main && !(pass.kind==='loop' && cyc===pass.c0)){
      close(t); pass = {i:n++, kind:'loop', t0:t, c0:cyc, marks:{}, path:[], snap:snap(cpu)};
    }
    const I = P.ins[cpu.pc];
    if (P.labelAt[cpu.pc] && pass.path.length<12) pass.path.push(P.labelAt[cpu.pc]);
    if (I.op===6) pass.marks[I.tname.toLowerCase()] = cyc-pass.c0;
    if (cpu.pc===P.clrDelay){                     // fast path for the delay loop: clrf + 256 × (clrwdt, decfsz, goto) = 1024 cycles
      pass.marks.delay = cyc-pass.c0; cpu.R.DELAY1=0; cpu.pc=P.afterDelay; cyc += 1024; continue;
    }
    cyc += step(P, cpu, t, out, null);
  }
}
function pickVars(P, cpu){ const v={W:cpu.W}; P.ram.forEach(r=>v[r]=cpu.R[r]); v.PORTB=cpu.R.PORTB; v.PORTC=cpu.R.PORTC; return v; }

/* re-run one pass with full instruction logging (the "real code path") */
function tracePass(pass, maxLines){
  const P = PROG[D.fw]; if (!pass || !pass.snap) return [];
  const cpu = {pc:pass.snap.pc, W:pass.snap.W, R:Object.assign({}, pass.snap.R), stack:pass.snap.stack.slice()};
  const lines=[]; let cyc=0, first=true;
  while (lines.length < (maxLines||80)){
    if (cpu.pc===P.main && !first) break; first=false;
    const t = pass.t0 + cyc*TCY;
    if (cpu.pc===P.clrDelay){ lines.push({lbl:'', src:'clrf delay1 · rdelay1: clrwdt / decfsz delay1,f / goto rdelay1', note:'256 turns = 1024 cycles = '+SIM.fmtDur(1024*TCY)+' (CLRWDT every 4 cycles)', c:1024}); cpu.pc=P.afterDelay; cyc+=1024; continue; }
    const lbl = P.labelAt[cpu.pc]||'';
    cyc += step(P, cpu, t, null, (I,c,note)=>lines.push({lbl, src:I.src, note, c}));
  }
  return lines;
}
/* which source line is executing at time t (for the live listing) */
function pcAt(t){
  const sch = schedule(); const p = passAt(t); if (!p) return null;
  const P = PROG[D.fw];
  if (p.kind!=='loop' || !p.snap) return {pass:p, li:-1};
  const k = Math.floor((t - p.t0)/TCY);
  if (p.marks.delay!==undefined && k >= p.marks.delay){
    const off = k - p.marks.delay;
    if (off===0) return {pass:p, li:P.ins[P.clrDelay].li, cyc:k, delay1:0};
    if (off < 1024){ const it=Math.floor((off-1)/4), ph=(off-1)%4; const li = P.ins[P.rdelay + (ph===0?0:ph===1?1:2)].li; return {pass:p, li, cyc:k, delay1:(255-it)&255, inDelay:true}; }
    return {pass:p, li:P.ins[P.afterDelay].li, cyc:k};
  }
  const cpu = {pc:p.snap.pc, W:p.snap.W, R:Object.assign({}, p.snap.R), stack:p.snap.stack.slice()};
  let cyc=0, li=P.ins[cpu.pc].li;
  while (cyc <= k){ li = P.ins[cpu.pc].li; if (cpu.pc===P.clrDelay) break; cyc += step(P, cpu, p.t0+cyc*TCY, null, null); }
  return {pass:p, li, cyc:k, regs:cpu};
}

/* ---------------- the schedule for the simulated second ---------------- */
let SCH=null, SKEY='';
function powerIntervals(){
  const evs = D.ev.filter(e=>e.kind==='pwr').slice(); if (D.cold) evs.unshift({t:0, on:true});
  let on = !D.cold, a = -C.PRE, boot=false; const iv=[];
  evs.forEach(e=>{ if (e.on && !on){ on=true; a=e.t; boot=true; } else if (!e.on && on){ iv.push([a, e.t, boot]); on=false; } });
  if (on) iv.push([a, 1.0005, boot]);
  return iv;
}
function schedule(){
  const key = JSON.stringify([D.in, D.ev, D.fw, D.board, D.cold]);
  if (key===SKEY && SCH) return SCH;
  SKEY = key; const P = PROG[D.fw];
  const out = {passes:[], led:[{t:-1e9,b:0}], pc:[{t:-1e9,b:0}], lastLed:0, lastPc:0, boots:[]};
  powerIntervals().forEach(([a,b,boot])=>{
    const s = a + (boot? C.BOOT : 0);
    if (boot) out.boots.push([a, Math.min(s,b)]);
    out.lastLed=0; out.lastPc=0;
    if (s < b) runSegment(P, s, Math.min(b, 1.0005), out);
    if (b < 1.0005){ out.led.push({t:b,b:0}); out.pc.push({t:b,b:0}); out.lastLed=0; }
  });
  out.passes = out.passes.filter(p=>p.t1 >= 0 && p.t0 <= 1.0005);
  SCH = out; return SCH;
}
function passAt(t){ const ps=schedule().passes; let lo=0, hi=ps.length-1; if (hi<0) return null; if (t<ps[0].t0) return null;
  while (lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; } const p=ps[lo]; return (t<=p.t1)? p : null; }
function evAt(arr, t){ let lo=0, hi=arr.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (arr[m].t<=t) lo=m; else hi=m-1; } return arr[lo].b; }
function ledDuty(t, m){                                 // fraction of the last pass the LED was lit = brightness the eye sees
  const ev = schedule().led, W = loopT(), a = t - W; let lo=0, hi=ev.length-1;
  while (lo<hi){ const k=(lo+hi+1)>>1; if (ev[k].t<=a) lo=k; else hi=k-1; }
  let on=0, cur=ev[lo].b, ta=a;
  for (let i=lo+1;i<ev.length && ev[i].t<t;i++){ if (cur&m) on += ev[i].t-ta; cur=ev[i].b; ta=ev[i].t; }
  if (cur&m) on += t-ta; return Math.max(0, Math.min(1, on/W));
}
function ledsAt(t){ const b = evAt(schedule().led, t); return {sdi:!!(b&2), hd:!!(b&4), err:!!(b&16), pwr:powerAt(t)}; }
function pcAtPins(t){ const b = evAt(schedule().pc, t); return {bypass:!!(b&2), mute:!(b&4), asi:!!(b&8), live:powerAt(t) && !inBoot(t)}; }
function inBoot(t){ return schedule().boots.some(([a,b])=>t>=a && t<b); }
function loopT(){ const ps = schedule().passes.filter(p=>p.kind==='loop' && !p.cut); return ps.length? ps.reduce((a,p)=>a+(p.t1-p.t0),0)/ps.length : 1083*TCY; }

/* ---------------- user actions (what changes, and what the firmware then does) ---------------- */
function followUp(te){
  const sch = schedule(); const tr=[];
  const p = sch.passes.find(q=>q.kind==='loop' && q.t0 >= te - 1e-9);
  if (!p){ tr.push('No main-loop pass runs after this point in the simulated second.'); return tr; }
  tr.push(`<b>Next pass #${p.i}</b> starts at ${SIM.fmtT(p.t0)} (+${SIM.fmtDur(p.t0-te)}). The PIC executes:`);
  tracePass(p, 70).forEach(l=>tr.push(`<span class="mono">${l.lbl?'<b>'+l.lbl+'</b>: ':''}${esc(l.src)}</span>${l.note?' <span class="muted">— '+esc(l.note)+'</span>':''}`));
  let last = evAt(sch.led, te), cnt=0;
  const LE = sch.led;
  for (let i=0;i<LE.length;i++){ const e=LE[i]; if (e.t<=te+1e-12 || e.t>te+0.4) continue; if (e.b===last) continue; if (LE[i+1] && LE[i+1].t-e.t < 1e-4) continue; last=e.b; const q=passAt(e.t);
    tr.push(`→ +${SIM.fmtDur(e.t-te)}${q&&q.kind==='loop'?' (pass #'+q.i+')':''}: ${ledTxt(e.b)}`); if (++cnt>=6) break; }
  const un = sch.passes.filter(q=>q.kind==='loop' && q.t0>te && q.v && q.v.UNSTABLE);
  if (un.length) tr.push(`autodetect1 flagged SD/HD <b>unstable</b> for ${un.length} passes (${SIM.fmtDur(un[un.length-1].t1-un[0].t0)}): bcount1_1 ran out (5 mismatches), then bcount_1 had to count 100 matching passes.`);
  return tr;
}
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s)); SKEY='';
  D.log.unshift({t:SIM.t, name, trace: tr.concat(followUp(SIM.t))});
  try { const ae=document.activeElement; if (ae && ae.blur) ae.blur(); } catch(e){}
  if (D.log.length>40) D.log.length=40;
  SIM.refresh();
}
function setSig(ch, tr){
  const t = SIM.t;
  if (t < 1e-6){ Object.assign(D.in, ch); tr('Playhead at 0: this changes the input the unit had before the second started.'); return; }
  const cur = Object.assign({}, sigAt(t)); delete cur.t; delete cur.kind;
  D.ev = D.ev.filter(e=>!(e.kind==='sig' && Math.abs(e.t-t)<1e-9));
  D.ev.push(Object.assign({t, kind:'sig'}, cur, ch)); D.ev.sort((a,b)=>a.t-b.t);
  tr(`Recorded as a change at ${SIM.fmtT(t)}. Scrub forward to watch the firmware react.`);
}
const A = {
  setStd(std){ act('Input → '+STD[std].name, tr=>{ setSig({std, conn: std!=='none'}, tr); const st=STD[std];
    tr(st.rate ? `GS1524 equalises ${SIM.fmtDur(1/st.rate)} bits; GS1535 ${st.lock?`locks at ${(st.rate/1e6).toFixed(st.rate<1e9?0:1)} Mb/s and drives SD/~HD = ${st.hd?0:1}`:'cannot lock: 2.97 Gb/s is outside its 143–1485 Mb/s range'}` : 'No signal at the INPUT BNC.'); }); },
  setCable(m){ act(`Cable → ${m} m Belden 8281`, tr=>{ setSig({cable:m}, tr); const s=sigAt(SIM.t+1e-9), st=STD[s.std];
    if (st.rate) tr(`Manual limit for this rate: ${LIMIT(st)} m. Signal is ${quality(s)==='ok'?'inside it':quality(s)==='marginal'?'just past it: carrier detected, lock comes and goes ('+inf+')':'too far: no carrier'}.`); }); },
  plug(){ const on = !sigAt(SIM.t).conn; act(on?'Plug the INPUT BNC in':'Unplug the INPUT BNC', tr=>{ setSig({conn:on, std: on && sigAt(SIM.t).std==='none' ? 'sd525' : sigAt(SIM.t).std}, tr); }); },
  power(){ const on = !powerAt(SIM.t); act(on?'Power switch ON':'Power switch OFF', tr=>{
    if (SIM.t<1e-6 && on){ D.cold=true; tr('Power switched on at t = 0.'); }
    else { D.ev = D.ev.filter(e=>!(e.kind==='pwr' && Math.abs(e.t-SIM.t)<1e-9)); D.ev.push({t:SIM.t, kind:'pwr', on}); D.ev.sort((a,b)=>a.t-b.t); }
    tr(on? `VAF1005 brings up +5 V; the PIC waits out the power-up timer (≈72 ms, ${inf}) then runs RESET → INIT → MAIN.` : 'The PIC and the Gennum chips lose power; all LEDs go out.'); }); },
  setFw(v){ act('Firmware → '+v, tr=>{ D.fw=v; tr(v==='v101'? '28v101.asm (23 Jun 2005|38): LEDs and SD/HD detection follow the GS1535 LD pin.' : '28v100.asm (4 Nov 2003|36): LEDs follow the GS1524 carrier detect; RD1 (LD) is set up as an output.'); }); },
  setBoard(b){ act('Board → '+(b==='iss1'?'Issue 1':'Issue 2/3'), tr=>{ D.board=b; tr(b==='iss1'? 'GS1535 pin 20 AUTOBYPASS tied to VCC_1 (Issue 1 schematic): unlocked signals are passed through un-retimed.' : 'ECO 24 Jun 2005|38: NetNodeDelete "VCC_1" "U2-20"; NetNodeAdd "GNDD" "U2-20" — auto-bypass off.'); }); },
  setCold(v){ act(v?'Power on at t = 0':'Unit already running at t = 0', tr=>{ D.cold=v; }); },
  scope(k){ D.scopeOut=k; SIM.refresh(); },
  clear(){ D.ev=[]; SKEY=''; D.log.unshift({t:SIM.t, name:'Clear all recorded changes', trace:['The input and power stay as they were at t = 0 for the whole second.']}); SIM.refresh(); },
  reset(){ Object.assign(D, {in:{std:'sd525',cable:30,conn:true}, ev:[], fw:'v101', board:'iss3', cold:false, scopeOut:1, log:[]}); SKEY=''; SIM.refresh(); },
};

/* ================================================================
   PANELS on the real silkscreen
   ================================================================ */
/* POD28-FRONT&REAR(FINAL CURVE).pdf (POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD28) was cut at
   200 dpi with tools/silk_extract.py between its crop marks: 1709 × 316 px = 8.545" × 1.58" of the 8.570" × 1.606"
   panel (3 px inset from the marks). Positions come from the ISS 1 panel drawings: x px = 200·inch − 3.
   Front: power switch cut-out 0.505" × 0.770" at (0.900, 0.803); LEDs Ø.130 at 1.496 / 4.554 / 5.054 / 5.554, y 1.090.
   Rear: D-holes for the BNCs at 1.305 … 5.805 (0.750 pitch), y 0.989; IEC cut-out 1.256 × 1.080 at (7.415, 0.703);
   ground insert at (8.319, 0.250). */
const ASSET = 'siumulation-plugins/assets/';
const PX = inch => inch*200 - 3;
const LEDX = {pwr:PX(1.496), sdi:PX(4.554), hd:PX(5.054), err:PX(5.554)}, LEDY = PX(1.090);
function frontSVG(t, opts){
  opts = opts||{}; const L = ledsAt(t);
  const led = (x,on,col,m)=>{ const d = m? ledDuty(t,m) : (on?1:0); const op = d<=0 ? 0 : Math.min(1, 0.22 + 0.78*Math.sqrt(d));
    return `<circle cx="${x}" cy="${LEDY}" r="15" fill="#0a0b0b"/><circle cx="${x}" cy="${LEDY}" r="11" fill="var(--led-off)"/>${d>0?`<circle cx="${x}" cy="${LEDY}" r="11" fill="${col}" opacity="${op.toFixed(2)}" ${d>0.5?'filter="url(#p28glow)"':''}><title>on ${(d*100).toFixed(1)}% of the last pass</title></circle>`:''}`; };
  const sx = PX(0.900), sy = PX(0.803), sw = 101, sh = 154;
  return `<svg viewBox="0 0 1709 316" role="img" aria-label="POD28 front panel (real silkscreen)" style="width:100%;max-width:960px;border-radius:8px;display:block">
    <defs><filter id="p28glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1709" height="316" rx="8" fill="var(--dev)"/>
    <image href="${ASSET}pod28-front-green.png" width="1709" height="316"/>
    <image href="${ASSET}pod28-front-white.png" width="1709" height="316"/>
    <g class="p28pwr" style="cursor:pointer"><title>Power rocker (PWRSW, PAN256) — click to switch at the playhead</title>
      <rect x="${sx-sw/2-6}" y="${sy-sh/2-6}" width="${sw+12}" height="${sh+12}" rx="8" fill="#0a0b0c" stroke="#2e3134"/>
      <rect x="${sx-sw/2+8}" y="${sy-sh/2+10}" width="${sw-16}" height="${sh-20}" rx="10" fill="#151719" stroke="#34383c"/>
      <rect x="${sx-sw/2+14}" y="${L.pwr? sy-sh/2+16 : sy+4}" width="${sw-28}" height="${sh/2-20}" rx="8" fill="#22262a"/></g>
    ${led(LEDX.pwr, L.pwr, '#c8ff6a')}${led(LEDX.sdi, L.sdi, 'var(--led-g)', 2)}${led(LEDX.hd, L.hd, 'var(--led-g)', 4)}${led(LEDX.err, L.err, '#ff4a3a', 16)}
    <circle cx="${PX(.251)}" cy="${PX(.803)}" r="17" fill="#55595c" stroke="#2a2d30"/><path d="M${PX(.251)-10} ${PX(.803)}h20M${PX(.251)} ${PX(.803)-10}v20" stroke="#2a2d30" stroke-width="3"/>
    <circle cx="${PX(8.319)}" cy="${PX(.803)}" r="17" fill="#55595c" stroke="#2a2d30"/><path d="M${PX(8.319)-10} ${PX(.803)}h20M${PX(8.319)} ${PX(.803)-10}v20" stroke="#2a2d30" stroke-width="3"/>
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const s = sigAt(t);
  const bnc = (k)=>{ const x = PX(1.305+0.75*k), y = PX(0.989); const isIn = k===0, sel = !isIn && D.scopeOut===k;
    const st = isIn? null : outState(k, t); const col = st==='reclocked'?'var(--led-g)':st==='bypass'?'var(--warn)':st==='asifail'?'var(--bad)':'#555';
    return `<g class="p28jack" data-j="${k}" style="cursor:pointer"><title>${isIn?(s.conn?'Click to unplug the INPUT':'Click to plug a source into INPUT'):'OUTPUT '+k+': '+OUT_TXT[st]+' — click to look at it on the scope'}</title>
      <circle cx="${x}" cy="${y}" r="62" fill="transparent"/>
      <circle cx="${x}" cy="${y}" r="52" fill="#b4b8bb" stroke="${sel?'var(--accent)':'#6b7074'}" stroke-width="${sel?7:3}"/>
      <circle cx="${x}" cy="${y}" r="40" fill="#d9dcde" stroke="#8d9296" stroke-width="2"/><circle cx="${x}" cy="${y}" r="22" fill="#e3d6a6"/><circle cx="${x}" cy="${y}" r="6" fill="#b48a1e"/>
      ${isIn && s.conn ? `<rect x="${x-20}" y="${y+40}" width="40" height="${316-y-40}" fill="#2b5f9e"/><rect x="${x-34}" y="${y+22}" width="68" height="34" rx="8" fill="#3a74b8"/>` : ''}
      ${!isIn ? `<circle cx="${x+44}" cy="${y-50}" r="9" fill="${col}"/>` : `<circle cx="${x+44}" cy="${y-50}" r="9" fill="${s.conn?'var(--accent)':'#555'}"/>`}</g>`; };
  let g = `<svg viewBox="0 0 1709 316" role="img" aria-label="POD28 rear panel (real silkscreen)" style="width:100%;max-width:960px;border-radius:8px;display:block">
    <rect width="1709" height="316" rx="8" fill="var(--dev)"/>
    <image href="${ASSET}pod28-rear-white.png" width="1709" height="316"/>`;
  for (let k=0;k<7;k++) g += bnc(k);
  const ix = PX(7.415), iy = PX(0.703);
  g += `<rect x="${ix-112}" y="${iy-102}" width="224" height="204" rx="10" fill="#0b0c0d" stroke="#2d3033" stroke-width="2"/>
    <rect x="${ix-96}" y="${iy-88}" width="58" height="176" rx="6" fill="#141618" stroke="#33373b"><title>Fuse drawer (½ A S.B. per the artwork)</title></rect>
    <rect x="${ix-24}" y="${iy-70}" width="118" height="140" rx="12" fill="#1a1d20"/>
    ${[[ix+8,iy-34],[ix+62,iy-34],[ix+35,iy+30]].map(([x,y])=>`<rect x="${x-9}" y="${y-16}" width="18" height="32" rx="2" fill="#a7abae"/>`).join('')}
    <circle cx="${PX(8.319)}" cy="${PX(0.25)}" r="14" fill="#9a9ea2" stroke="#4d5154" stroke-width="3"><title>Ground stud insert FH-440-5 (POD28-REAR ISS 1)</title></circle>
    <circle cx="${PX(.251)}" cy="${PX(.803)}" r="17" fill="#55595c"/><circle cx="${PX(8.319)}" cy="${PX(.803)}" r="17" fill="#55595c"/>
  </svg>`;
  return g;
}
function bindPanel(root){
  root.querySelectorAll('.p28pwr').forEach(g=>g.addEventListener('click', ()=>A.power()));
  root.querySelectorAll('.p28jack').forEach(g=>g.addEventListener('click', ()=>{ const k=+g.dataset.j; if (k===0) A.plug(); else A.scope(k); }));
}
function controlsHTML(){
  const s = sigAt(SIM.t);
  return `<div class="ctl" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <label class="small">Input <select data-c="std">${Object.keys(STD).map(k=>`<option value="${k}" ${k===s.std?'selected':''}>${STD[k].name}</option>`).join('')}</select></label>
    <label class="small">Cable <input data-c="cable" type="range" min="0" max="400" step="5" value="${s.cable}" style="width:130px"> <span class="mono">${s.cable} m</span></label>
    <button data-c="plug">${s.conn?'Unplug':'Plug in'} INPUT</button><button data-c="pwr">Power ${powerAt(SIM.t)?'off':'on'}</button></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <label class="small">Firmware <select data-c="fw"><option value="v101" ${D.fw==='v101'?'selected':''}>v1.01 (Jun 2005)</option><option value="v100" ${D.fw==='v100'?'selected':''}>v1.00 (Nov 2003)</option></select></label>
    <label class="small">Board <select data-c="board"><option value="iss3" ${D.board==='iss3'?'selected':''}>Issue 2/3 (AUTOBYPASS = GND)</option><option value="iss1" ${D.board==='iss1'?'selected':''}>Issue 1 (AUTOBYPASS = VCC)</option></select></label>
    <label class="small"><input data-c="cold" type="checkbox" ${D.cold?'checked':''}> power on at 0 s</label>
    <button data-c="clear">Clear changes (${D.ev.length})</button><button data-c="reset">Defaults</button></div>
    <div class="small muted" style="margin-top:4px">Every change is made <b>at the playhead</b> and recorded, so scrub the timeline to watch the firmware react. Keys: S SD · H HD · A ASI · G 3G · I plug/unplug · [ ] cable · P power.</div>`;
}
function bindControls(root){
  const q = s=>root.querySelector(`[data-c="${s}"]`);
  if (!q('std')) return;
  q('std').onchange = e=>A.setStd(e.target.value);
  q('cable').onchange = e=>A.setCable(+e.target.value);
  q('cable').oninput = e=>{ e.target.nextElementSibling.textContent = e.target.value+' m'; };
  q('plug').onclick = ()=>A.plug(); q('pwr').onclick = ()=>A.power();
  q('fw').onchange = e=>A.setFw(e.target.value); q('board').onchange = e=>A.setBoard(e.target.value);
  q('cold').onchange = e=>A.setCold(e.target.checked); q('clear').onclick = ()=>A.clear(); q('reset').onclick = ()=>A.reset();
}
document.addEventListener('keydown', e=>{
  if (!window.__pod28Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase(); const c = sigAt(SIM.t).cable;
  const m = {s:()=>A.setStd('sd525'), h:()=>A.setStd('hd1080'), a:()=>A.setStd('asi'), g:()=>A.setStd('g3'), i:()=>A.plug(), p:()=>A.power(), '[':()=>A.setCable(Math.max(0,c-10)), ']':()=>A.setCable(Math.min(400,c+10))};
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ================================================================
   TIMELINE LANES
   ================================================================ */
const css = n => SIM.css(n);
function sigSegments(t0, t1){
  const pts = [t0]; D.ev.forEach(e=>{ if (e.kind==='sig' && e.t>t0 && e.t<t1) pts.push(e.t); }); pts.push(t1);
  const segs=[]; for (let i=0;i<pts.length-1;i++) segs.push([pts[i], pts[i+1], sigAt(pts[i]+1e-12)]); return segs;
}
function bitAt(n, seed){ return hash((Math.imul(n|0, 0x9E3779B1|0) ^ seed)|0) > 0.5 ? 1 : 0; }   // illustrative scrambled NRZI data
function drawDigital(c, X, t0, t1, y, h, fn, col, label){
  const pw = X(t1)-X(t0), N = Math.max(50, Math.min(1400, Math.round(pw*1.5)));
  c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); let prev=null;
  for (let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const v=fn(t)?1:0; const yy = y + (v? 5 : h-5);
    if (prev===null) c.moveTo(X(t),yy); else { if (v!==prev) c.lineTo(X(t), y+(prev?5:h-5)); c.lineTo(X(t),yy); } prev=v; }
  c.stroke(); if (label){ c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(label, X(t1)-c.measureText(label).width-6, y+12); }
}
function L_input(){ return {label:`INPUT: ${STD[sigAt(SIM.t).std].short}${sigAt(SIM.t).conn?'':' (unplugged)'} · ${sigAt(SIM.t).cable} m`, h:38, draw(c,X,t0,t1,y,h){
  sigSegments(t0,t1).forEach(([a,b,s])=>{
    const st = STD[s.std]; c.save(); c.beginPath(); c.rect(X(a), y, X(b)-X(a), h); c.clip();
    if (!s.conn || !st.rate){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no signal', X(a)+6, y+h/2+4); c.restore(); return; }
    const UI = 1/st.rate, span=b-a, pxUI = (X(a+UI)-X(a));
    if (pxUI > 3){                                             // bit level
      const n0=Math.floor(a/UI), n1=Math.ceil(b/UI); c.strokeStyle=css('--accent'); c.lineWidth=1.5; c.beginPath(); let lv=0;
      for (let n=n0;n<=n1;n++){ if (bitAt(n,7)) lv^=1; const xa=X(n*UI), xb=X((n+1)*UI), yy=y+(lv?6:h-6); if (n===n0) c.moveTo(xa,yy); else c.lineTo(xa,yy); c.lineTo(xb,yy); }
      c.stroke(); c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText(`NRZI bits, 1 UI = ${SIM.fmtDur(UI)} (scrambled data, illustrative)`, X(a)+4, y+h/2+3);
    } else if (st.kind==='asi'){
      SIM.pulses(c,X,a,b,y,h,10*UI,0,UI*10*0.9,css('--accent'),'8b/10b bytes (27 MB/s)');
    } else {
      const wordT = st.line/st.words;
      if (X(a+wordT)-X(a) > 2.5){ SIM.pulses(c,X,a,b,y,h,wordT,0,wordT*0.85,css('--accent'),'10-bit words'); }
      else if (X(a+st.line)-X(a) > 2.2){ SIM.pulses(c,X,a,b,y,h,st.line,0,st.hb*wordT,css('--warn'),'H blanking (EAV…SAV)'); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('orange = horizontal blanking, gaps = active line', X(a)+4, y+h-3); }
      else SIM.pulses(c,X,a,b,y,h,st.field,0,st.line*20,css('--accent2'), st.short+' fields');
    }
    c.restore();
  });
  D.ev.forEach(e=>{ if (e.t>=t0 && e.t<=t1){ c.strokeStyle=css('--warn'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(X(e.t),y); c.lineTo(X(e.t),y+h); c.stroke(); c.setLineDash([]);
    c.fillStyle=css('--warn'); c.font='10px sans-serif'; c.fillText(e.kind==='pwr'?(e.on?'power on':'power off'):(e.conn?STD[e.std].short+' '+e.cable+'m':'unplugged'), X(e.t)+3, y+10); } });
}}; }
function L_cd(){ return {label:'GS1524 CD/MUTE → RA0 (low = carrier)', h:26, draw(c,X,t0,t1,y,h){ drawDigital(c,X,t0,t1,y,h,t=>!cdAt(t),css('--accent2')); }}; }
function L_ld(){ return {label:'GS1535 LD → RD1 (1 = locked)', h:26, draw(c,X,t0,t1,y,h){ drawDigital(c,X,t0,t1,y,h,t=>ldAt(t),css('--accent')); }}; }
function L_sdhd(){ return {label:'GS1535 SD/~HD → RD0 + GS1528 slew', h:26, draw(c,X,t0,t1,y,h){ drawDigital(c,X,t0,t1,y,h,t=>powerAt(t)&&sdhdAt(t),css('--accent2'),'1 = SD · 0 = HD'); }}; }
const ROUT = [['readgs1524','#4a90d9'],['readgs1535','#2f9e8f'],['autodetect1','#8e6bd1'],['refresh','#d9822b'],['delay','#7d8790']];
function routineSegs(p){
  const m = p.marks, ends = [m.readgs1524, m.readgs1535, m.autodetect1, m.refresh, m.delay, p.cycles];
  const segs=[['MAIN clrwdt',0,1,'#5a6570']];
  for (let i=0;i<5;i++) if (ends[i]!==undefined) segs.push([ROUT[i][0], ends[i], ends[i+1]!==undefined?ends[i+1]:p.cycles, ROUT[i][1]]);
  return segs;
}
function L_loop(){ return {label:`PIC16F874 main loop (≈${SIM.fmtDur(loopT())}/pass)`, h:36, draw(c,X,t0,t1,y,h){
  const sch = schedule(); let shown=0;
  sch.boots.forEach(([a,b])=>{ if (b<t0||a>t1) return; c.fillStyle=css('--warn'); c.globalAlpha=.45; c.fillRect(X(a),y+3,X(b)-X(a),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('power-up timer ('+inf.replace(/<[^>]+>/g,'')+')', Math.max(X(a),X(t0))+4, y+h/2+4); });
  for (const p of sch.passes){ if (p.t1<t0 || p.t0>t1) continue; shown++;
    const pxp = X(p.t1)-X(p.t0);
    if (p.kind==='init'){ c.fillStyle=css('--bad'); c.globalAlpha=.6; c.fillRect(X(p.t0),y+3,Math.max(1,pxp),h-6); c.globalAlpha=1; if (pxp>40){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('RESET→INIT', X(p.t0)+2, y+h/2+3); } continue; }
    if (pxp > 50){
      routineSegs(p).forEach(([nm,a,b,col])=>{ const xa=X(p.t0+a*TCY), xb=X(p.t0+b*TCY); c.fillStyle=col; c.globalAlpha=.85; c.fillRect(xa,y+3,Math.max(1,xb-xa-0.5),h-6); c.globalAlpha=1;
        if (xb-xa>64){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(`${nm} ${b-a}c`, Math.max(xa,X(t0))+3, y+h/2+3); } });
    } else { c.fillStyle = p.i%2? css('--accent') : css('--accent2'); c.globalAlpha=.75; c.fillRect(X(p.t0),y+3,Math.max(1,pxp-0.5),h-6); c.globalAlpha=1; }
  }
  if (shown>60){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${shown} passes in view; zoom in to see readgs1524 · readgs1535 · autodetect1 · refresh · delay`, X(t0)+6, y+h/2+4); }
}}; }
const ITL = new Map();
function instrList(p){                       // [{c0, c, mn, li}] for one pass (delay loop expanded lazily)
  if (ITL.has(p)) return ITL.get(p);
  const P = PROG[D.fw], arr=[]; if (!p.snap){ ITL.set(p,arr); return arr; }
  const cpu = {pc:p.snap.pc, W:p.snap.W, R:Object.assign({}, p.snap.R), stack:p.snap.stack.slice()}; let cyc=0, first=true;
  while (arr.length<200){ if (cpu.pc===P.main && !first) break; first=false;
    if (cpu.pc===P.clrDelay){ arr.push({c0:cyc, c:1, mn:'clrf delay1', li:P.ins[cpu.pc].li}); arr.push({c0:cyc+1, c:1023, mn:'rdelay1 ×256', li:P.ins[P.rdelay].li, loop:true}); cyc+=1024; cpu.pc=P.afterDelay; continue; }
    const I=P.ins[cpu.pc], c0=cyc; cyc += step(P, cpu, p.t0+cyc*TCY, null, null); arr.push({c0, c:cyc-c0, mn:I.src.split(/\s+/)[0].toLowerCase()+' '+(I.src.split(/\s+/)[1]||''), li:I.li}); }
  if (ITL.size>400) ITL.clear(); ITL.set(p, arr); return arr;
}
function L_instr(){ return {label:`Instruction cycles (Tcy ${SIM.fmtDur(TCY)}, 4.9152 MHz ÷ 4)`, h:30, draw(c,X,t0,t1,y,h){
  const pxc = X(t0+TCY)-X(t0);
  if (pxc < 1.2){ SIM.pulses(c,X,t0,t1,y,h,TCY,0,TCY/2,css('--ink2'),'instruction cycles'); return; }
  for (const p of schedule().passes){ if (p.t1<t0||p.t0>t1||p.kind!=='loop') continue;
    instrList(p).forEach((it,i)=>{ const a=p.t0+it.c0*TCY, b=a+it.c*TCY; if (b<t0||a>t1) return;
      if (it.loop){ SIM.pulses(c,X,Math.max(a,t0),Math.min(b,t1),y,h,4*TCY,a,TCY*0.9,'#7d8790','delay-loop turns'); return; }
      c.fillStyle = i%2? css('--accent') : css('--accent2'); c.globalAlpha=.75; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-1),h-6); c.globalAlpha=1;
      if (X(b)-X(a) > 44){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(it.mn.slice(0, Math.floor((X(b)-X(a))/6.2)), X(a)+3, y+h/2+3); } });
  }
}}; }
function L_counters(){ return {label:'autodetect1: bcount_1 (/100) · bcount1_1 (/5) · unstable', h:44, draw(c,X,t0,t1,y,h){
  const ps = schedule().passes.filter(p=>p.kind==='loop' && p.v && p.t1>=t0 && p.t0<=t1);
  ps.forEach(p=>{ if (p.v.UNSTABLE&1){ c.fillStyle=css('--bad'); c.globalAlpha=.22; c.fillRect(X(p.t0),y,Math.max(1,X(p.t1)-X(p.t0)),h); c.globalAlpha=1; } });
  [['BCOUNT_1',100,css('--accent')],['BCOUNT1_1',5,css('--warn')]].forEach(([k,mx,col])=>{ c.strokeStyle=col; c.lineWidth=1.4; c.beginPath();
    ps.forEach((p,i)=>{ const v = (p.v[k]||0)/mx, yy=y+h-4-v*(h-8); if (!i) c.moveTo(X(p.t0),yy); else c.lineTo(X(p.t0),yy); c.lineTo(X(p.t1),yy); }); c.stroke(); });
  c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText('blue: bcount_1 · orange: bcount1_1 · red band: unstable,0 = 1', X(t0)+6, y+11);
}}; }
function L_leds(){ return {label:'LEDs: SDI (RB1) · HD (RB2) · ERROR (RB4)', h:34, draw(c,X,t0,t1,y,h){
  const ev = schedule().led; const rows=[[2,css('--accent')],[4,css('--accent2')],[16,css('--bad')]];
  rows.forEach(([m,col],r)=>{ c.fillStyle=col;
    let cur = evAt(ev,t0), ta=t0;
    const draw=(a,b,on)=>{ if (on) c.fillRect(X(a), y+3+r*10, Math.max(1,X(b)-X(a)), 8); };
    for (const e of ev){ if (e.t<=t0) continue; if (e.t>t1) break; draw(ta, e.t, cur&m); cur=e.b; ta=e.t; }
    draw(ta, t1, cur&m); });
}}; }
function L_outs(){ return {label:'OUTPUT 1–6 (green reclocked · amber bypassed · red ASI fail)', h:44, draw(c,X,t0,t1,y,h){
  const pw=X(t1)-X(t0), N=Math.max(40,Math.min(600,Math.round(pw/2)));
  const col = {reclocked:css('--accent'), bypass:css('--warn'), asifail:css('--bad'), none:css('--grid'), off:'transparent'};
  for (let k=1;k<=6;k++) for (let i=0;i<N;i++){ const t=t0+(t1-t0)*(i+.5)/N; c.fillStyle=col[outState(k,t)]; c.fillRect(X(t0)+pw*i/N, y+2+(k-1)*7, pw/N+0.6, 5); }
}}; }
function L_portc(){ return {label:'PORTC → NC7WZ16 → GS1535: BYPASS · ~DDO_MUTE · ASI/~177', h:30, draw(c,X,t0,t1,y,h){
  drawDigital(c,X,t0,t1,y,h/3,t=>pcAtPins(t).bypass,css('--warn'));
  drawDigital(c,X,t0,t1,y+h/3,h/3,t=>!pcAtPins(t).mute && pcAtPins(t).live,css('--accent'));
  drawDigital(c,X,t0,t1,y+2*h/3,h/3,t=>pcAtPins(t).asi,css('--bad'));
  c.fillStyle=css('--ink2'); c.font='10px '+css('--mono'); c.fillText('set once in INIT (RC1=0, RC2=1, RC3=0), never changed', X(t0)+6, y+h-3);
}}; }
function lanes(){ return [L_input(), L_cd(), L_ld(), L_sdhd(), L_loop(), L_instr(), L_counters(), L_leds(), L_outs(), L_portc()]; }

/* ---------------- output scope: eye diagram ---------------- */
function drawEye(cv, info, t){
  const {c,w,h} = SIM.canvas(cv, 190);
  const k = D.scopeOut, st = outState(k,t), s = sigAt(t), S = STD[s.std];
  const ink=css('--ink'), ink2=css('--ink2'), acc=css('--accent'), grid=css('--grid');
  c.strokeStyle=grid; c.strokeRect(40,10,w-60,150);
  c.fillStyle=ink2; c.font='10px '+css('--mono'); c.fillText('+400 mV',2,16); c.fillText('−400 mV',2,158); c.fillText('0',28,88);
  if (st==='off' || st==='none' || !S.rate){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText(`OUTPUT ${k}: ${OUT_TXT[st]}`, 60, 88); info.innerHTML = `<span class="muted">No eye: ${st==='none' && D.board!=='iss1' ? 'the GS1535 is not locked and AUTOBYPASS is tied low (Issue 2/3), so nothing valid leaves the drivers '+inf+'.' : OUT_TXT[st]+'.'}</span>`; return; }
  const sdSlew = sdhdAt(t)===1;
  const UI = 1/S.rate, tr = sdSlew? 0.7e-9 : 0.18e-9;          // GS1528 SD/HD slew: SMPTE 259M 0.4–1.5 ns, 292M < 270 ps — values inferred
  const jit = st==='bypass'? 0.14 : 0.03;                     // rms jitter in UI — inferred
  const x0=40, pw=w-60, X = u => x0 + (u+0.5)/2*pw;           // −0.5 … 1.5 UI
  c.strokeStyle = st==='asifail'? css('--bad') : st==='bypass'? css('--warn') : acc; c.globalAlpha=.18; c.lineWidth=1.2;
  for (let n=0;n<90;n++){ const b0=bitAt(n,3), b1=bitAt(n,5), b2=bitAt(n,9);
    const lv = [b0, b0^b1, b0^b1^b2]; const e1 = (hash(n*7)-.5)*2*jit, e2=(hash(n*13)-.5)*2*jit;
    c.beginPath(); for (let i=0;i<=120;i++){ const u=-0.5+2*i/120;
      const step_=(a,b,tc,u_)=>{ const x=(u_-tc)*UI/tr; return a + (b-a)/(1+Math.exp(-4.4*x)); };
      let v = step_(lv[0], lv[1], 0+e1, u); v = step_(v, lv[2], 1+e2, u); if (u<0) v = step_(lv[0],lv[1],0+e1,u);
      const yy = 85 - (v-0.5)*140; i? c.lineTo(X(u),yy) : c.moveTo(X(u),yy); } c.stroke(); }
  c.globalAlpha=1; c.fillStyle=ink; c.font='11px '+css('--mono');
  c.fillText(`OUTPUT ${k} · ${S.short} · 1 UI = ${SIM.fmtDur(UI)} · 0.8 Vp-p into 75 Ω`, 44, 178);
  info.innerHTML = `GS1528 U${[0,3,4,5,6,7,8][k]} in <b>${sdSlew?'SD':'HD'} slew</b> (pin 6 = SD/~HD from the GS1535) · edge ≈ ${SIM.fmtDur(tr)} ${inf} · ${st==='bypass'?'not retimed: input jitter passes straight through':'retimed by the GS1535 PLL'}${st==='asifail'?' · <b style="color:var(--bad)">2010|43 test: ASI did not pass on this output</b>':''}`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function stateTable(t){
  const p = passAt(t), s = sigAt(t), L = ledsAt(t), pc = pcAt(t);
  const v = p && p.v ? p.v : {};
  return `<table class="kv">
    <tr><th>Input</th><td class="mono">${s.conn? STD[s.std].name : 'unplugged'} · ${s.cable} m · ${quality(s)}</td></tr>
    <tr><th>GS1524 / GS1535</th><td class="mono">CD ${cdAt(t)?'carrier':'—'} · LD ${ldAt(t)?'locked':'—'} · SD/~HD = ${sdhdAt(t)}</td></tr>
    <tr><th>PIC pass</th><td class="mono">${!powerAt(t)?'unit off': inBoot(t)?'power-up timer':!p?'—':p.kind==='init'?'RESET → INIT':'#'+p.i+' · '+SIM.fmtDur(p.t1-p.t0)+' · path '+p.path.filter(x=>x!=='main').join(' → ')}</td></tr>
    <tr><th>Executing</th><td class="mono">${pc && pc.li>=0 ? esc(PROG[D.fw].list[pc.li].text.trim()) + (pc.inDelay?` (delay1 = ${pc.delay1})`:'') : '—'}</td></tr>
    <tr><th>RAM (end of pass)</th><td class="mono small">lock=${hx(v.LOCK||0)} lock1=${hx(v.LOCK1||0)} temp=${hx(v.TEMP||0)} plock1=${hx(v.PLOCK1||0)} bcount_1=${v.BCOUNT_1??'—'} bcount1_1=${v.BCOUNT1_1??'—'} unstable=${v.UNSTABLE??'—'}</td></tr>
    <tr><th>LEDs</th><td class="mono">SDI ${L.sdi?'ON':'off'} · HD ${L.hd?'ON':'off'} · ERROR ${L.err?'ON':'off'} · PWR ${L.pwr?'ON':'off'}</td></tr>
    <tr><th>Outputs</th><td class="mono small">${[1,2,3,4,5,6].map(k=>k+': '+OUT_TXT[outState(k,t)]).join('<br>')}</td></tr></table>`;
}
function viewSim(m){
  window.__pod28Active = true;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead (real silkscreen)', `<div id="fp"></div><div id="ctl"></div>`)}
      ${card('Rear panel — click INPUT to plug/unplug, an OUTPUT to scope it', `<div id="rp"></div>`)}
    </div>
    <div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log" style="max-height:420px"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable down to single SDI bits (click to seek)', `<canvas id="tl"></canvas>
    <p class="small muted">Every lane comes from the emulator: the real 28v10x.asm instructions run one by one at ${SIM.fmtDur(TCY)} each. A pass is 1072–1085 cycles (≈${SIM.fmtDur(1083*TCY)}), 95% of it in the <span class="mono">rdelay1</span> loop. The Gennum chip timing (lock acquisition ${SIM.fmtDur(C.ACQ)}, marginal-cable flapping) is ${inf}.</p>`)}
  <div class="grid2">
    ${card('Scope: eye of the selected output at the playhead', `<canvas id="eye"></canvas><div id="eyei" class="small"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    const ctl = m.querySelector('#ctl'); if (!ctl.contains(document.activeElement)){ ctl.innerHTML = controlsHTML(); bindControls(ctl); }
    m.querySelector('#insp').innerHTML = stateTable(t);
    m.querySelector('#trace').innerHTML = D.log[0]? `<div><b>${esc(D.log[0].name)}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>${s}</div>`).join('') : '<div class="muted">Change the input, the cable, the power or the firmware. The emulator lists every instruction of the next main-loop pass, then when each LED changes.</div>';
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${esc(e.name)}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    drawEye(m.querySelector('#eye'), m.querySelector('#eyei'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (from POD28MAN.wpd) ---------------- */
const fin = ()=>ledsAt(0.999);
const hasUnstable = ()=>schedule().passes.some(p=>p.kind==='loop' && p.v && (p.v.UNSTABLE&1) && p.t0>=0);
const LESSONS = [
  { title:'Meet the POD28', body:`<p>The POD28 is a <b>six-output digital video distribution amplifier</b> (manual, POD28MAN.wpd). One SDI signal comes in on the rear <b>INPUT</b> BNC; the unit equalises the cable loss, re-times the data and sends six clean copies out of <b>OUTPUT 1–6</b>.</p>
     <p>The front has a power rocker, a power LED and three status tallies: <b>SDI</b> (green), <b>HD</b> (green) and <b>ERROR</b> (red). There are no other controls: the unit configures itself.</p><p class="muted">Hover over the panel. The tutorial starts with the input unplugged.</p>`, check:()=>true, auto:true },
  { title:'1 · Connect an SD source', body:`<p>Click the <b>INPUT</b> BNC on the rear panel (or press I). An SD-SDI (270 Mb/s) source is plugged in.</p><p>The <b>SDI</b> tally lights: <i>“the receiver is locked to the incoming digital video signal”</i>. ERROR goes out.</p><p><b>Goal:</b> SDI on, ERROR off.</p>`, check:()=>sigAt(.999).conn && !STD[sigAt(.999).std].hd && fin().sdi && !fin().err, hint:'Put the playhead near 0 s and click INPUT on the rear panel.' },
  { title:'2 · Feed it HD', body:`<p>Choose <b>HD-SDI 1.4835 Gb/s</b> in the Input list (or press H). The <b>HD</b> tally lights: the signal is at 1.485 Gb/s. Otherwise it is one of 143, 177, 270, 360 or 540 Mb/s.</p><p><b>Goal:</b> SDI and HD both on.</p>`, check:()=>fin().sdi && fin().hd, hint:'Input → HD-SDI 1080i or 720p.' },
  { title:'3 · Watch a rate change', body:`<p>Move the playhead to about <b>0.3 s</b>, then switch the input back to <b>SD</b>. Scrub through the timeline after 0.3 s.</p><p>For a few ms the GS1535 is unlocked. When it re-locks, <span class="mono">autodetect1</span> sees SD/~HD differ from the stored <span class="mono">plock1</span> for 5 passes and sets <span class="mono">unstable</span>. The ERROR tally then stays on (and in v1.01 SDI goes out) until 100 matching passes, about 88 ms, have gone by.</p><p><b>Goal:</b> an “unstable” period appears in the second.</p>`, check:()=>hasUnstable(), hint:'Seek to 0.3 s, then press S (SD).' },
  { title:'4 · Too much cable for HD', body:`<p>The manual allows <b>120 m</b> of Belden 8281 for HD-SDI and <b>300 m</b> for SD. Put the playhead at 0, choose HD and set the cable to <b>200 m</b>.</p><p><b>Goal:</b> HD input over 120 m, ERROR on.</p>`, check:()=>{ const s=sigAt(.999); return STD[s.std].hd && s.cable>120 && fin().err; }, hint:'Seek to 0, press H, then drag Cable to 200 m.' },
  { title:'5 · Same cable, SD signal', body:`<p>Now choose <b>SD</b> with the same 200 m cable. SD tolerates 300 m, so the unit locks again.</p><p><b>Goal:</b> SD input over 120 m, SDI on.</p>`, check:()=>{ const s=sigAt(.999); return !STD[s.std].hd && STD[s.std].lock && s.cable>120 && fin().sdi; }, hint:'Press S with the cable still at 200 m.' },
  { title:'6 · Lose the input', body:`<p>Unplug the INPUT. ERROR (red) <i>“indicates that the receiver cannot lock”</i>. SDI and HD go out.</p><p><b>Goal:</b> input unplugged, ERROR on.</p>`, check:()=>!sigAt(.999).conn && fin().err && !fin().sdi, hint:'Click INPUT on the rear panel.' },
  { title:'7 · Check an output', body:`<p>Plug the input back in, then click <b>OUTPUT 4</b>. The scope shows its eye diagram: 0.8 V p-p into 75 Ω, re-timed by the GS1535. Switch between SD and HD: the GS1528 drivers change edge speed, because the GS1535's SD/~HD pin drives their slew-rate pin.</p><p><b>Goal:</b> scope on OUTPUT 4 with a locked signal.</p>`, check:()=>D.scopeOut===4 && fin().sdi, hint:'Plug in INPUT, then click the OUTPUT 4 BNC.' },
  { title:'8 · ASI transport', body:`<p>Choose <b>DVB-ASI</b> (press A). ASI runs at 270 Mb/s, like SD, so SDI lights and HD stays off. The firmware sets the GS1535 <span class="mono">ASI/~177</span> pin low (“disable ASI lock”). A Test Dept e-mail of 24 Jun 2010|43 found ASI passed on outputs <b>2, 4 and 6</b> only. Click OUTPUT 1 and OUTPUT 2 to compare.</p><p><b>Goal:</b> ASI input, SDI on.</p>`, check:()=>sigAt(.999).std==='asi' && fin().sdi, hint:'Press A.' },
  { title:'9 · Power-up with SD', body:`<p>Tick <b>power on at 0 s</b> (or click the rocker off and on). After the power-up timer, INIT sets <span class="mono">plock1 = 0</span>, which means “HD”. With an SD input, the first 5 passes mismatch, so the unit shows <b>ERROR for about 88 ms</b> at every power-up before it settles.</p><p><b>Goal:</b> SD input, power on during the second, unstable period seen.</p>`, check:()=>(D.cold || D.ev.some(e=>e.kind==='pwr'&&e.on)) && !STD[sigAt(.999).std].hd && hasUnstable(), hint:'Choose SD, then tick “power on at 0 s”.' },
  { title:'10 · Why v1.01 exists', body:`<p>Set Firmware to <b>v1.00 (Nov 2003)</b> and feed <b>3G-SDI</b> (press G). The GS1535 cannot lock to 2.97 Gb/s, but the GS1524 still sees a carrier, and v1.00 drives the SDI tally from that carrier detect. The panel says “locked” while the outputs carry nothing valid. v1.01 (23 Jun 2005|38) moved the tally to the GS1535 LD pin.</p><p><b>Goal:</b> v1.00, 3G input, SDI wrongly on.</p>`, check:()=>D.fw==='v100' && sigAt(.999).std==='g3' && fin().sdi, hint:'Firmware → v1.00, then press G.' },
  { title:'Done', body:`<p>You have used everything an operator could reach on a POD28. The <b>Software</b> tab runs the same firmware with the executing line highlighted, and <b>Findings</b> lists what the code and the archive files say that the manual does not.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0, tutStarted = false;
function viewTutorial(m){
  window.__pod28Active = true;
  if (!tutStarted){ tutStarted=true; A.reset(); D.in.conn=false; D.in.std='sd525'; SKEY=''; }
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — using the POD28', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div><div id="ctl"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>
  ${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  const hot = `<g><rect x="110" y="70" width="230" height="180" fill="transparent"><title>Power rocker and power LED (PWR, fed from +5 V through R33 511R)</title></rect>
    <rect x="860" y="170" width="300" height="110" fill="transparent"><title>SDI = GS1535 locked (v1.01) · HD = 1.485 Gb/s · ERROR = cannot lock or SD/HD unstable</title></rect></g>`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t,{hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    const ctl = m.querySelector('#ctl'); if (!ctl.contains(document.activeElement)){ ctl.innerHTML = controlsHTML(); bindControls(ctl); }
    m.querySelector('#trace').innerHTML = D.log[0]? `<div><b>${esc(D.log[0].name)}</b></div>`+D.log[0].trace.slice(0,14).map(s=>`<div>${s}</div>`).join('') : '<div class="muted">Nothing yet.</div>';
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); D.in.conn=false; SKEY=''; lessonIdx=0; SIM.seek(0); };
    SIM.drawLanes(m.querySelector('#tl'), [L_input(), L_ld(), L_loop(), L_counters(), L_leds()], {labelW:220});
  };
  SIM.on('time', draw);
}

/* ---------------- one second, slow motion ---------------- */
function viewSecond(m){
  window.__pod28Active = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device', `<div id="dev"></div>`)}${card('As seen by the front panel', `<div id="fp"></div><p class="small muted">The LEDs change only inside <span class="mono">refresh</span>, once per pass (≈1.1 kHz), so the fastest blink the panel can show is one pass long. Marginal cables make SDI flicker at the pass rate.</p>`)}</div>
  ${card('Zoom ladder at the playhead: each row is a close-up of the shaded part of the row above', `<div id="zl"></div>`)}`;
  const spans = ()=>{ const st = STD[sigAt(SIM.t).std]; const UI = st.rate? 1/st.rate : 1/270e6;
    return [['1 second',1,[L_loop(),L_counters(),L_leds()]], ['1 video field', st.field||1001/60000, [L_input(),L_loop(),L_leds()]], ['1 PIC pass', 1083*TCY, [L_loop(),L_instr(),L_leds()]],
      ['1 video line', st.line||63.5e-6, [L_input(),L_instr()]], ['4 instruction cycles', 4*TCY, [L_input(),L_instr()]], ['12 SDI bits', 12*UI, [L_input()]]]; };
  m.querySelector('#zl').innerHTML = spans().map((s,i)=>`<div class="small" style="margin:6px 0 2px"><b>${s[0]}</b> <span class="muted mono" id="zls${i}"></span></div><canvas id="zl${i}"></canvas>`).join('');
  const draw = ()=>{
    const t=SIM.t, s=sigAt(t), st=STD[s.std], sch=schedule();
    const passes = sch.passes.filter(p=>p.kind==='loop' && p.t0>=0 && p.t0<1).length;
    const ledCh = sch.led.filter(e=>e.t>=0 && e.t<1).length;
    const rows = [
      ['PIC instruction cycles', Math.round(1/TCY).toLocaleString(), SIM.fmtDur(TCY), '4.9152 MHz crystal X2 ÷ 4; no interrupts (the vector is a bare RETFIE)'],
      ['Main-loop passes', passes.toLocaleString(), SIM.fmtDur(loopT()), 'MAIN: readgs1524 · readgs1535 · autodetect1 · refresh · 256-turn delay'],
      ['CLRWDT executions', (passes*257).toLocaleString(), SIM.fmtDur(4*TCY), 'one per delay turn + one at MAIN; the WDT setting is unknown (no __CONFIG)'],
      ['Status pin reads', (passes*3).toLocaleString(), '', 'RA0 CD/MUTE, RD1 LD, RD0 SD/~HD — each once per pass'],
      ['“Stable” reloads of bcount_1', st.lock&&s.conn? '≈ '+Math.round(passes/100) : '0', SIM.fmtDur(100*loopT()), 'every 100 matching passes autodetect1 clears unstable,0'],
      ['LED changes this second', ledCh.toLocaleString(), '', 'written in refresh; PORTB pins RB1/RB2/RB4 through 330 Ω'],
      ['Video fields', st.field && s.conn? (1/st.field).toFixed(2):'—', st.field? SIM.fmtDur(st.field):'', 'passed through untouched: the POD28 never decodes video'],
      ['Video lines', st.line && s.conn? Math.round(1/st.line).toLocaleString():'—', st.line? SIM.fmtDur(st.line):'', 'EAV/SAV timing reference words ride inside the bit stream'],
      ['10-bit words', st.rate && s.conn? Math.round(st.rate/10).toLocaleString():'—', st.rate? SIM.fmtDur(10/st.rate):'', st.kind==='asi'?'8b/10b symbols':'Y and C words interleaved'],
      ['Serial bits per output', st.rate && s.conn? Math.round(st.rate).toLocaleString():'—', st.rate? SIM.fmtDur(1/st.rate):'', '× 6 outputs, each a GS1528 cable driver'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">A PIC pass is ≈${(loopT()/ (st.line||1)).toFixed(1)} video lines long; one instruction lasts ${st.rate? Math.round(TCY*st.rate).toLocaleString():'—'} SDI bits. The firmware is about 6 orders of magnitude slower than the data it supervises: it only watches the chips' status pins.</p>`;
    const pc = pcAt(t), p = pc&&pc.pass;
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>Video</th><td class="mono">${st.field&&s.conn&&ldAt(t)? `field ${Math.floor(t/st.field)} · line ${Math.floor((t%st.field)/st.line)+1} · word ${Math.floor((t%st.line)/(st.line/st.words))}`: s.conn? STD[s.std].short : 'none'}</td></tr>
      <tr><th>Bit at the playhead</th><td class="mono">${st.rate&&s.conn? 'bit '+Math.floor(t*st.rate).toLocaleString()+' of this second' : '—'}</td></tr>
      <tr><th>PIC</th><td class="mono">${p? (p.kind==='loop'? 'pass #'+p.i+', cycle '+(pc.cyc||0)+' of '+p.cycles : 'RESET/INIT') : !powerAt(t)?'off':'power-up timer'}<br>${pc&&pc.li>=0? esc(PROG[D.fw].list[pc.li].text.trim()):''}</td></tr>
      <tr><th>GS1535</th><td class="mono">${ldAt(t)? 'locked, re-timing at '+(st.rate/1e6).toFixed(1)+' Mb/s' : cdAt(t)? 'carrier but no lock' : 'no input'}</td></tr>
      <tr><th>Drivers</th><td class="mono">${sdhdAt(t)?'SD':'HD'} slew · outputs ${[1,2,3,4,5,6].map(k=>outState(k,t)==='reclocked'?'●':outState(k,t)==='bypass'?'◐':'○').join(' ')}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    spans().forEach(([nm,span,ls],i)=>{ m.querySelector('#zl'+i)._seek=true; const a=Math.max(0,Math.min(1-span, t-span/2)); m.querySelector('#zls'+i).textContent = SIM.fmtDur(span)+' from '+SIM.fmtT(a);
      SIM.drawLanes(m.querySelector('#zl'+i), ls, {labelW:220, range:[a, a+span]}); });
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  inp:{x:10,y:30,w:150,h:84,t:'INPUT BNC',s:['75 Ω: R1/R2 75R, L1','C1/C2 1.0 µF to U1'],d:'Rear BNC with a 75 Ω termination network (R1, R2 75R, R3 37R5, L1 4.7 nH) AC-coupled into the GS1524. Issue 1 used L1 = 6.4 nH and 56R; the Feb 2004|37 ECO changed every inductor to 4.7 nH.'},
  eq:{x:200,y:30,w:190,h:84,t:'U1 GS1524',s:['adaptive cable EQ','CD/MUTE → RA0','CLI → RA1 (unused)'],d:'Gennum GS1524 HD/SD adaptive cable equaliser on VCC_1 (3.3 V). Pin 16 CD/MUTE tells the PIC a carrier is present (low = present, per readgs1524). Pin 1 CLI (cable-length indicator) is wired to RA1 and never read. RV1, R15, R38 on pin 10 are DNI.'},
  rc:{x:430,y:30,w:230,h:130,t:'U2 GS1535',s:['multi-rate reclocker','143…1485 Mb/s, AUTO/~MAN = 1','LD → RD1 · SD/~HD → RD0','BYPASS, ~DDO_MUTE, ASI/~177','X1 GO1535 + R16 75R'],d:'Gennum GS1535 reclocker. AUTO/~MAN (pin 21) is tied high, so it searches the rates by itself. DDI_SEL0/1 tied low: input 0. AUTOBYPASS (pin 20) was VCC on Issue 1 and GND after the 24 Jun 2005|38 ECO. LD and SD/~HD go straight to the PIC (3.3 V into 5 V Schmitt inputs — see Findings).'},
  bus:{x:700,y:30,w:180,h:70,t:'DDO / ~DDO bus',s:['49R9 terminations','to all six drivers'],d:'The differential reclocked output runs to six GS1528 inputs. R12/R14 and the other 49R9 parts terminate the line. U3/U5/U7 take ~DDO on pin 1; U4/U6/U8 take DDO.'},
  drv:{x:700,y:150,w:180,h:100,t:'U3–U8 GS1528 ×6',s:['SD/HD slew from RD0 net','RSET 750R','one leg to BNC, one to 75R'],d:'Six Gennum GS1528 cable drivers on VCC_2. Pin 6 (SD/~HD) comes from the GS1535, so edge speed follows the detected rate. Each driver feeds one BNC through 4.7 nH ∥ 75R and 4.7 µF; the other leg goes to a 75R dummy load.'},
  outs:{x:900,y:150,w:92,h:100,t:'OUTPUT 1–6',s:['0.8 Vp-p','75 Ω BNC'],d:'Six rear BNCs. Manual: output level 0.8 V p-p nominal, 75 Ω unbalanced.'},
  mcu:{x:430,y:240,w:230,h:110,t:'U25 PIC16F874',s:['TQFP-44, X2 4.9152 MHz','28v101.asm, MPASM','LEDs RB1/RB2/RB4','PORTC → U9/U10'],d:'Microchip PIC16F874. One polling loop, no interrupts. Reads three status pins, debounces SD/HD in autodetect1 and writes the three tallies. PORTC sets BYPASS = 0, ~DDO_MUTE = 1, ASI/~177 = 0 once in INIT. H13 = ICSP header; H1 jumper on RD7 is never read.'},
  lvl:{x:200,y:190,w:190,h:84,t:'U9, U10 NC7WZ16',s:['5 V → 3.3 V buffers','RC1/RC2/RC3 → GS1535'],d:'Fairchild NC7WZ16 dual buffers powered from VCC_1 translate the PIC outputs to 3.3 V. Only the PIC → GS1535 direction is buffered; LD and SD/~HD come back unbuffered.'},
  led:{x:200,y:320,w:190,h:60,t:'Front tallies',s:['SDI · HD (green) · ERROR (red)'],d:'LED1/LED2 green, LED3 red, each through 330R from RB1, RB2, RB4. The power LED (green) is fed from +5 V through R33 511R.'},
  psu:{x:10,y:190,w:170,h:200,t:'Power',s:['IEC ACIN (PAN356)','PWRSW rocker (PAN256)','PSU1 VAF1005 → +5 V','REG1 LM1117-3.3 → VCC_1','REG2 LM1117-3.3 → VCC_2','5× 68 µF/10 V'],d:'90–230 VAC (manual). The VAF1005 module makes +5 V for the PIC and the LEDs; two LM1117-3.3 regulators split the 3.3 V rail into VCC_1 (EQ, reclocker, buffers) and VCC_2 (the six drivers).'},
};
const WIRES = [['inp','eq','SDI'],['eq','rc','SDO → DDI0'],['rc','bus','DDO'],['bus','drv',''],['drv','outs','×6'],['eq','mcu',''],['rc','mcu','LD, SD/~HD'],['rc','drv','SD/~HD slew'],['mcu','lvl','RC1–RC3'],['lvl','rc','BYPASS · MUTE · ASI'],['mcu','led','RB1 RB2 RB4'],['psu','mcu','+5 V']];
function viewBlock(m){
  window.__pod28Active = false; let sel='rc';
  m.innerHTML = `${card('Block diagram (click a block) — from pod28iss3.net', `<div id="bd"></div>`)}<div class="grid2"><div>${card('Functional diagram in the archive', `<p class="small">“POD28 - Functional Diagram.cdr” (converted with Inkscape) shows <b>HD/SDI ASI INPUT → HIGH SPEED RECEIVER → DATA RETIMING PLL → six drivers</b>, with a LOGIC block lighting <b>HD</b> and <b>SD</b> and an inverter lighting <b>ERROR</b>. The built unit has no SD tally: it has SDI, HD and ERROR, and the logic is the PIC.</p>`)}</div>
    <div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', `<p>The <b>GS1524</b> undoes the cable loss, the <b>GS1535</b> re-times the bits to a clean clock, and six <b>GS1528</b>s drive the BNCs. The <b>PIC</b> only watches status pins and lights LEDs: the video never passes through it.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1000 410" style="width:100%"><defs><marker id="p28ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p28ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from the netlist) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const txt = (x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" fill="var(--${(o&&o.c)||'ink2'})" ${o&&o.a?`text-anchor="${o.a}"`:''}>${s}</text>`;
const SHEETS = [
  { name:'1 · Input and equaliser', note:'pod28iss3.net: INPUT-3 → L1 ∥ R1 → NET00002 (R2 75R, C1 1.0 µF → U1-4); C2 1.0 µF from U1-5 to R3 37R5. U1 outputs leave through C5/C6 4.7 µF to the GS1535. Pin names are the GS1524 names on the Issue 1 schematic.', svg:()=>
    chip(560,70,150,'U1 GS1524',[['4 SDI','C1 ← INPUT'],['5 ~SDI','C2 → R3 37R5'],['7 / 8','C4 1.0 µF'],['10','R4/R5 1K, RV1 DNI'],['2, 15 VCC','VCC_1 3.3 V'],['3 6 9 11 14','GNDD']],
      [['16 CD/MUTE','→ U25-19 RA0'],['1 CLI','→ U25-20 RA1'],['13 SDO','C5 4.7µ → U2-1'],['12 ~SDO','C6 4.7µ → U2-3']],'adaptive cable equaliser')
    + `<circle cx="80" cy="110" r="22" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="80" cy="110" r="5" fill="var(--ink)"/>${txt(80,150,'INPUT (BNC1)',{a:'middle',c:'ink'})}
       <path d="M102 110 H160 M220 110 H330" stroke="var(--ink)" fill="none"/><rect x="160" y="98" width="60" height="24" fill="none" stroke="var(--ink)"/>${txt(190,90,'L1 4.7 nH ∥ R1 75R',{a:'middle'})}
       <circle cx="280" cy="110" r="3" fill="var(--ink)"/><path d="M280 110 V170 M268 170 h24" stroke="var(--ink)"/>${txt(286,190,'R2 75R → GNDD')}
       ${txt(336,114,'NET00002',{c:'accent2'})}${txt(250,230,'NET00002 → C1 1.0 µF → U1-4 (SDI)')}
       ${txt(40,250,'Issue 1 (Nov 2003|36): L1 6.4 nH, L2–L13 5.6 nH. ECO 11 Feb 2004|37 → all 4.7 nH; R15/R38 4K7 → DNI.')}
       ${txt(40,268,'C3 1.0 µF from the BNC shell (INPUT-1/2/4/5, NET00017) to GNDD.')}` },
  { name:'2 · Reclocker GS1535', note:'U2 pins and nets from pod28iss3.net; pin names read from P-CAD EDA - [Sheet1].pdf. AUTOBYPASS moved from VCC_1 to GNDD by the 24 Jun 2005|38 ECO (pod28iss2.ECO).', svg:()=>
    chip(330,50,200,'U2 GS1535 (LQFP-64)',[['1 DDI0','← U1-13 SDO'],['3 ~DDI0','← U1-12 ~SDO'],['2','C12 0.1 µF'],['17/18 DDI_SEL0/1','GNDD'],['19 BYPASS','← U10-6 ← RC1'],['20 AUTOBYPASS','GNDD (was VCC_1)'],['21 AUTO/~MAN','VCC_1'],['27 ASI/~177','← U9-6 ← RC3'],['36 ~DDO_MUTE','← U9-4 ← RC2'],['52/53 XTAL','X1 GO1535, R16 75R']],
      [['28 LD','→ U25-39 RD1'],['33 SD/~HD','→ RD0 + U3–U8 pin 6'],['46 DDO','→ drivers'],['44 ~DDO','→ drivers'],['62/63 LF','C21 47 nF'],['45','C19 0.1 µF'],['24–26 SS0–2','not connected'],['VCC (12 pins)','VCC_1'],['GND (19 pins)','GNDD']],'multi-rate reclocker')
    + txt(40,320,'R16 was 56R on Issue 1; ECO 24 Jun 2005|38: CompAttrModify "R16" "Value" "75R".') },
  { name:'3 · Six cable drivers', note:'pod28iss3.net. Driver → BNC path traced net by net. Pin 7/8 names on the Issue 1 sheet are SDO/~SDO; which pin is inverting is not readable there.', svg:()=>{
    const D_ = [['U3','~DDO','DDO','7','8','OUT1','R6'],['U4','DDO','~DDO','8','7','OUT2','R22'],['U5','~DDO','DDO','7','8','OUT3','R31'],['U6','DDO','~DDO','8','7','OUT4','R41'],['U7','~DDO','DDO','7','8','OUT5','R48'],['U8','DDO','~DDO','8','7','OUT6','R54']];
    let s = txt(30,40,'GS1528',{c:'ink',fs:12}) + txt(110,40,'pin 1',{c:'ink'}) + txt(190,40,'pin 2',{c:'ink'}) + txt(270,40,'to BNC',{c:'ink'}) + txt(350,40,'dummy 75R',{c:'ink'}) + txt(450,40,'BNC',{c:'ink'}) + txt(520,40,'RSET 750R',{c:'ink'}) + txt(620,40,'2010|43 ASI test',{c:'ink'});
    D_.forEach((r,i)=>{ const y=70+i*30; s += txt(30,y,r[0],{c:'ink'})+txt(110,y,r[1],{c:r[1]==='DDO'?'accent':'warn'})+txt(190,y,r[2])+txt(270,y,'pin '+r[3])+txt(350,y,'pin '+r[4])+txt(450,y,r[5],{c:'ink'})+txt(520,y,r[6])+txt(620,y,i%2?'ASI passed':'ASI failed',{c:i%2?'accent':'bad'}); });
    return s + txt(30,270,'Every driver: pin 5 VCC_2, pin 3 GNDD, pin 6 SD/~HD; each output leg = 4.7 nH ∥ 75R + 75R pull-up to VCC_2; coupling 4.7 µF/10 V.')
      + txt(30,288,'Odd outputs: ~DDO in, pin 7 out. Even outputs: DDO in, pin 8 out. Two inversions cancel, so all six have the same polarity by the netlist.')
      + txt(30,306,'The odd/even ASI result matches this odd/even pattern, but the netlist does not explain it.'); } },
  { name:'4 · PIC16F874 and tallies', note:'U25 TQFP-44 pin numbers from pod28iss3.net; port bits from 28v101.asm. TRIS values are the INIT values (v1.01).', svg:()=>
    chip(330,40,210,'U25 PIC16F874 (TQFP-44)',[['19 RA0','CD/MUTE ← U1-16'],['20 RA1','CLI ← U1-1 (unused)'],['38 RD0','SD/~HD ← U2-33'],['39 RD1','LD ← U2-28'],['5 RD7','H1 + R21 1K5 (unused)'],['30/31 OSC','X2 4.9152 MHz, 27 pF'],['18 MCLR','H13-3, D11 4148'],['16/17 RB6/RB7','H13 ICSP'],['11 RB3/PGM','H13-6'],['7/28 VDD','+5V']],
      [['9 RB1','LED1 SDI green, 330R'],['10 RB2','LED2 HD green, 330R'],['14 RB4','LED3 ERROR red, 330R'],['35 RC1','U10 → BYPASS'],['36 RC2','U9 A2 → ~DDO_MUTE'],['37 RC3','U9 A1 → ASI/~177'],['6/29 VSS','GNDD']],'TRISA 03 · TRISB C8 · TRISC 00 · TRISD 83 · TRISE E0')
    + txt(40,300,'v1.00 had TRISD = 0x81: RD1 (LD) was an output, driven high by the earlier MOVWF PORTD = 0xFF.') },
  { name:'5 · Power', note:'pod28iss3.net power nets. PSU1-5 = +5V; REG1 → VCC_1 (U1, U2, U9, U10); REG2 → VCC_2 (U3–U8).', svg:()=>
    chip(120,60,140,'ACIN PAN356',[],[['1','GNDD (earth)'],['2','→ PSU1-2'],['3','→ PWRSW-2']],'IEC inlet')
    + chip(420,60,150,'PSU1 VAF1005',[['1','← PWRSW-1'],['2','← ACIN-2']],[['5','+5V'],['3, 4','GNDD']],'AC/DC module')
    + chip(420,210,150,'REG1 LM1117-3.3',[['3 IN','+5V']],[['2/4 OUT','VCC_1'],['1','GNDD']],'')
    + chip(660,210,150,'REG2 LM1117-3.3',[['3 IN','+5V']],[['2/4 OUT','VCC_2'],['1','GNDD']],'')
    + txt(40,330,'Bulk: C14 C15 C24 C25 C26 68 µF/10 V on +5V. PWR LED (green) from +5V through R33 511R. Manual: 90–230 VAC 50/60 Hz.')
    + txt(40,348,'Rear artwork: “100-240 VAC, 50-60 Hz, ½ A S.B.” and a fuse warning.') },
];
function viewSchem(m){
  window.__pod28Active = false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from pod28iss3.net — not the P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original P-CAD files are <span class="mono">PCB/pod28iss3.sch</span> and the Issue 1 prints <span class="mono">P-CAD EDA - [Sheet1..3].pdf</span>. These sheets are redrawn from the netlist, so every pin-to-net link above is as in <span class="mono">pod28iss3.net</span>. Blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 380" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="848" height="368" fill="none" stroke="var(--line)"/><text x="840" y="366" text-anchor="end" font-size="10" fill="var(--ink2)">POD28 Issue 2/3 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__pod28Active = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Main loop — the routine running at the playhead is lit', `<div id="flow"></div>`)}
      ${card('autodetect1 — SD/HD debounce state machine', `<div id="fsm"></div>`)}
      ${card('Cycle budget (counted by the emulator)', `<div id="cyc"></div>`)}</div>
    <div>${card(`Source at the playhead — <span id="srcname" class="mono"></span>`, `<div id="regs" class="small mono" style="margin-bottom:6px"></div><div id="src" class="log" style="max-height:520px;white-space:pre;font-size:11.5px"></div>`)}</div></div>
  <div class="grid2">${card('Port map (INIT)', `<div id="ports"></div>`)}${card('How each operator action reaches the code', `<div id="btn"></div>`)}</div>
  ${card('v1.00 → v1.01 (and the hardware change the same week)', `<div id="diff"></div>`)}`;
  let lastLi = -2;
  const draw=()=>{
    const t=SIM.t, P=PROG[D.fw], pc=pcAt(t), p=pc&&pc.pass;
    let cur = -1;
    if (p && p.kind==='loop'){ const k=pc.cyc; const segs=routineSegs(p); segs.forEach((s,i)=>{ if (k>=s[1] && k<s[2]) cur=i; }); }
    const boxes = [['MAIN: CLRWDT','watchdog kick'],['call readgs1524','RA0 → lock,0 (carrier)'],['call readgs1535','RD1 → lock1,0 (LD) · RD0 → lock1,1 (SD)'],['call autodetect1','SD/HD debounce → unstable,0'],['call refresh','RB1 SDI · RB4 ERROR · RB2 HD'],['delay: 256 × clrwdt/decfsz','≈ 833 µs of waiting']];
    let s=`<svg viewBox="0 0 470 ${boxes.length*46+40}" style="width:100%"><defs><marker id="p28a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    boxes.forEach((b,j)=>{ const y=10+j*46, on=cur===j; s+=`${j?`<line x1="220" y1="${y-12}" x2="220" y2="${y}" stroke="var(--ink2)" marker-end="url(#p28a2)"/>`:''}<rect x="20" y="${y}" width="400" height="34" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="30" y="${y+15}" font-size="12" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${b[0]}</text><text x="30" y="${y+28}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${b[1]}</text>`; });
    const yb=10+boxes.length*46; s+=`<path d="M420 ${yb-29} h24 V27 h-24" fill="none" stroke="var(--ink2)" marker-end="url(#p28a2)"/><text x="450" y="${yb/2}" font-size="10" fill="var(--ink2)" transform="rotate(90 450 ${yb/2})">goto main</text>
      <text x="20" y="${yb+16}" font-size="11" fill="var(--ink2)">${p? (p.kind==='loop'? 'Pass #'+p.i+', cycle '+pc.cyc+' of '+p.cycles : 'RESET → INIT') : 'Not running'}</text></svg>`;
    m.querySelector('#flow').innerHTML = s;
    // FSM
    const v = p&&p.v ? p.v : {};
    const locked = (D.fw==='v101'? (v.LOCK1&1) : (v.LOCK&1));
    const mism = locked && ((v.LOCK1&2) !== (v.PLOCK1&2));
    const stN = !locked ? 0 : (v.UNSTABLE&1) ? (mism?2:3) : (mism?2:1);
    const node=(x,y,l,sub,on)=>`<g><rect x="${x-70}" y="${y-26}" width="140" height="52" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 470 250" style="width:100%">
      ${node(90,45,'no_lock1','reload 5 / 100',stN===0)}${node(380,45,'sig_lock1: match','bcount_1 −1 per pass',stN===1)}
      ${node(380,175,'unstable_state','bcount1_1 −1 per pass',stN===2)}${node(90,175,'UNSTABLE','ERROR on, tallies held',stN===3)}
      <path d="M160 45 H306" stroke="var(--ink2)" marker-end="url(#p28a2)"/><text x="232" y="38" font-size="10" text-anchor="middle" fill="var(--ink2)">${D.fw==='v101'?'lock1,0 = 1 (LD)':'lock,0 = 1 (carrier)'}</text>
      <path d="M380 71 V145" stroke="var(--ink2)" marker-end="url(#p28a2)"/><text x="386" y="112" font-size="10" fill="var(--ink2)">SD/~HD differs from plock1</text>
      <path d="M310 175 H164" stroke="var(--ink2)" marker-end="url(#p28a2)"/><text x="236" y="216" font-size="10" text-anchor="middle" fill="var(--ink2)">5th mismatch: bsf unstable,0; plock1 = temp</text>
      <path d="M100 149 Q240 110 330 70" fill="none" stroke="var(--ink2)" marker-end="url(#p28a2)"/><text x="160" y="118" font-size="10" fill="var(--ink2)">100 matches: bcf unstable,0</text>
      <text x="10" y="242" font-size="11" fill="var(--ink)" font-family="var(--mono)">temp=${hx(v.TEMP||0)} plock1=${hx(v.PLOCK1||0)} bcount_1=${v.BCOUNT_1??'—'} bcount1_1=${v.BCOUNT1_1??'—'} unstable=${v.UNSTABLE??'—'}</text></svg>
      <p class="small muted">plock1 bit 1 = 1 means SD (the comment in readgs1535: “SD/HD if 0 HD if 1 SD”). INIT clears plock1, so the stored state starts as HD.</p>`;
    // cycles
    const ps = schedule().passes.filter(q=>q.kind==='loop' && !q.cut);
    const uniq = {}; ps.forEach(q=>{ const key=routineSegs(q).map(r=>r[2]-r[1]).join('/'); uniq[key]=(uniq[key]||0)+1; });
    m.querySelector('#cyc').innerHTML = `<table class="kv"><tr><th>MAIN · 1524 · 1535 · autodetect1 · refresh · delay</th><th>passes</th><th>length</th></tr>${Object.entries(uniq).sort((a,b)=>b[1]-a[1]).map(([k,n])=>{ const tot=k.split('/').reduce((a,x)=>a+ +x,0); return `<tr><td class="mono">${k.replace(/\//g,' · ')}</td><td class="mono">${n}</td><td class="mono">${tot} c = ${SIM.fmtDur(tot*TCY)}</td></tr>`; }).join('')}</table>
      <p class="small muted">autodetect1 costs 11 (no lock), 16 (match), 17 (mismatch), 23 or 25 cycles (when a counter runs out). refresh costs 18 or 24 in v1.01 (16, 22 or 24 in v1.00). The delay loop is always 1024 + 2.</p>`;
    // source listing
    m.querySelector('#srcname').textContent = D.fw==='v101'? 'v101w/28v101.asm + autodetect.asm' : 'v100/28v100.asm + autode~1.asm';
    const li = pc? pc.li : -1;
    if (li!==lastLi || m.querySelector('#src').dataset.fw!==D.fw){
      lastLi = li; const el=m.querySelector('#src'); el.dataset.fw=D.fw;
      el.innerHTML = P.list.map((L,i)=>`<div class="${i===li?'hl':''}" ${i===li?'id="p28cur"':''} style="border:0;padding:0">${(L.file.startsWith('auto')?'A':'M')+String(L.n).padStart(3,' ')}  ${esc(L.text)||' '}</div>`).join('');
      const c=el.querySelector('#p28cur'); if (c) el.scrollTop = Math.max(0, c.offsetTop - el.offsetTop - 160);
    }
    const r = pc&&pc.regs ? pc.regs : null;
    m.querySelector('#regs').innerHTML = r? `W=${hx(r.W)} Z=${(r.R.STATUS>>2)&1} lock=${hx(r.R.LOCK)} lock1=${hx(r.R.LOCK1)} temp=${hx(r.R.TEMP)} plock1=${hx(r.R.PLOCK1)} bcount_1=${r.R.BCOUNT_1} bcount1_1=${r.R.BCOUNT1_1} unstable=${r.R.UNSTABLE} PORTB=${hx(r.R.PORTB)}` : pc&&pc.inDelay? `in the delay loop · delay1 = ${pc.delay1}` : '<span class="muted">Zoom to a single pass and scrub: the highlighted line is the instruction executing at the playhead. M = main file, A = autodetect file.</span>';
    // ports
    m.querySelector('#ports').innerHTML = `<table class="kv"><tr><th>Port</th><th>TRIS</th><th>Used pins</th></tr>
      <tr><td>A</td><td class="mono">0x03</td><td class="small">RA0 in CD/MUTE · RA1 in CLI (never read) · RA2–RA5 outputs, unused. ADCON1 PCFG = 0111: all digital</td></tr>
      <tr><td>B</td><td class="mono">0xC8</td><td class="small">RB1 SDI · RB2 HD · RB4 ERROR outputs · RB3/6/7 inputs (ICSP) · weak pull-ups: <span class="mono">BsF OPTION_REG,7</span> sets RBPU, which <i>disables</i> them (the comment says “ENABLE”)</td></tr>
      <tr><td>C</td><td class="mono">0x00</td><td class="small">RC1 BYPASS = 0 · RC2 → ~DDO_MUTE = 1 · RC3 ASI/~177 = 0. PORTC was already loaded with 11110100b, so the three bcf/bsf lines after it change nothing.</td></tr>
      <tr><td>D</td><td class="mono">${D.fw==='v101'?'0x83':'<b style="color:var(--bad)">0x81</b>'}</td><td class="small">RD0 in SD/~HD · RD1 ${D.fw==='v101'?'in LD':'<b>output</b> (fights the GS1535 LD pin)'} · RD7 in H1 jumper (never read)</td></tr>
      <tr><td>E</td><td class="mono">0xE0</td><td class="small">RE0–RE2 outputs, unused; PSPMODE off</td></tr></table>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Chip reaction</th><th>Firmware path</th></tr>
      <tr><td>Plugs in SD</td><td class="small">GS1524 CD low; GS1535 locks, SD/~HD = 1</td><td class="mono small">readgs1535 → bsf lock1,0 / bsf lock1,1 → sig_lock1 → refresh: bsf portb,1 (SDI)</td></tr>
      <tr><td>Changes SD ↔ HD</td><td class="small">LD drops, re-locks, SD/~HD flips</td><td class="mono small">no_lock1 → sig_lock1 → unstable_state ×5 → bsf unstable,0 → not_locked (ERROR) ×100 → bcf unstable,0</td></tr>
      <tr><td>Unplugs</td><td class="small">CD high, LD low</td><td class="mono small">no_lock1 → refresh → not_locked: bcf portb,2 / bcf portb,1 / bsf portb,4</td></tr>
      <tr><td>Long cable</td><td class="small">LD comes and goes ${inf}</td><td class="mono small">refresh follows LD every pass: SDI/ERROR flicker at up to ≈567 Hz</td></tr>
      <tr><td>Power on</td><td class="small">PWRT, oscillator start</td><td class="mono small">RESET → INIT (PORTB = FF: all LEDs on for ≈30 µs) → MAIN</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?esc(D.log[0].name):'none yet'}</b></p>`;
    m.querySelector('#diff').innerHTML = `<table class="kv"><tr><th>Where</th><th>v1.00 (28v100.asm, 4 Nov 2003|36)</th><th>v1.01 (28v101.asm, 23 Jun 2005|38)</th></tr>
      <tr><td>Header</td><td class="mono small">;POD28 DEMUX VERSION 1.00</td><td class="mono small">;CHANGED LOCK DETECTION FLAG TO THAT OF THE RECLOCKER GS1535</td></tr>
      <tr><td>TRISD</td><td class="mono small">MOVLW b'10000001' (RD1 output)</td><td class="mono small">MOVLW b'10000011' (RD1 input)</td></tr>
      <tr><td>refresh, autodetect1</td><td class="mono small">btfsc lock,0 … (GS1524 carrier)</td><td class="mono small">btfsc lock1,0 … (GS1535 LD)</td></tr>
      <tr><td>not_locked</td><td class="mono small">bcf portb,2</td><td class="mono small">bcf portb,2 · bcf portb,1 · bsf portb,4</td></tr>
      <tr><td>Board ECO, 24 Jun 2005|38</td><td colspan="2" class="small">pod28iss2.ECO: R16 56R → 75R (crystal), and <span class="mono">NetNodeDelete "VCC_1" "U2-20" / NetNodeAdd "GNDD" "U2-20"</span>: GS1535 AUTOBYPASS off. With auto-bypass off, a signal the reclocker cannot lock no longer reaches the outputs, so the tally had to follow LD instead of the carrier.</td></tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod28Active = false;
  m.innerHTML = card('What the POD28 is up to — findings from the archive', `
  <ol>
    <li><b>v1.01 and a board ECO landed in the same week.</b> <span class="mono">28v101.asm</span> (23 Jun 2005|38) moves the tallies and <span class="mono">autodetect1</span> from the GS1524 carrier detect (<span class="mono">lock,0</span>) to the GS1535 lock detect (<span class="mono">lock1,0</span>). <span class="mono">pod28iss2.ECO</span> (24 Jun 2005|38) ties GS1535 pin 20 AUTOBYPASS to ground and changes R16 to 75R. Once auto-bypass was off, a carrier the reclocker could not lock gave dead outputs while v1.00 still lit SDI. Tutorial step 10 shows this with a 3G input.</li>
    <li><b>v1.00 drove the lock-detect pin.</b> v1.00 sets <span class="mono">TRISD = b'10000001'</span>, so RD1, which is wired to GS1535 pin 28 LD (net <span class="mono">LD</span>), is an output, already loaded high by <span class="mono">MOVWF PORTd</span> = 0xFF. A 5 V PIC output then fights a 3.3 V chip output whenever LD is low. v1.01 changes it to <span class="mono">b'10000011'</span>. ${inf}: in v1.00, <span class="mono">btfsc portd,1</span> reads the PIC's own latch.</li>
    <li><b>Asymmetric SD/HD debounce and an ERROR flash at power-up.</b> <span class="mono">detect_count1 = 5</span> mismatching passes set <span class="mono">unstable,0</span>. <span class="mono">detect_count = 100</span> matching passes clear it. At 4.9152 MHz that is ≈4.4 ms versus ≈88 ms. INIT clears <span class="mono">plock1</span>, which encodes “HD”, so every power-up with an SD input shows ERROR for about 88 ms. The comments <span class="mono">;2</span> and <span class="mono">;9</span> next to the reloads are older values.</li>
    <li><b>In v1.01 the SDI tally does not mean only “locked”.</b> <span class="mono">not_locked</span> now also clears RB1. While SD/HD is unstable the unit is locked, but SDI goes out and ERROR lights.</li>
    <li><b>The tallies are rewritten every pass, with µs glitches.</b> <span class="mono">refresh</span> first sets SDI and clears ERROR from <span class="mono">lock1,0</span>, then corrects them. While SD/HD is unstable, SDI is lit for 17 cycles (≈14 µs) of every 1083-cycle pass, ≈1.6% duty, which may show as a faint glow. ERROR also drops out for 4 cycles (≈3 µs) each pass. The front panel here draws each LED at its on-time over the last pass.</li>
    <li><b>Dead reads and dead wires.</b> v1.01 still calls <span class="mono">readgs1524</span> every pass, but nothing reads <span class="mono">lock</span> any more. <span class="mono">bcf lock,1</span> in <span class="mono">autodetect1</span> clears a bit nothing uses. GS1524 CLI (cable-length indicator) is wired to RA1 and never read. Jumper H1 with pull-up R21 1K5 on RD7 is never read. RB0, RB5, RA2–5 and RE0–2 are unused outputs.</li>
    <li><b>The control pins are set once.</b> BYPASS, ~DDO_MUTE and ASI/~177 (RC1–RC3 through NC7WZ16 buffers U9/U10) are written in INIT and never again. PORTC is preloaded with <span class="mono">B'11110100'</span>, so the following <span class="mono">bcf portc,3 / bcf portc,1 / bsf portc,2</span> repeat what is already there. The firmware never bypasses or mutes.</li>
    <li><b>An “ASI” DA that disables ASI.</b> The functional diagram is titled “HD/SDI ASI DISTRIBUTION AMPLIFIER”, and RD48 asks that “all SDI outputs support ASI”. INIT's comment says <span class="mono">;disable ASI lock, enable lock of 177</span>. A Test Dept e-mail of 24 Jun 2010|43, misfiled as <span class="mono">POD27 - #TESTREPORT/POD28-ASI PASS-24JUN10.pdf</span>, says ASI passed on outputs 2, 4 and 6 only.</li>
    <li><b>Odd and even outputs are wired differently.</b> In <span class="mono">pod28iss3.net</span>, U3/U5/U7 (OUT1/3/5) take <span class="mono">~DDO</span> on pin 1 and send pin 7 to the BNC. U4/U6/U8 (OUT2/4/6) take <span class="mono">DDO</span> on pin 1 and send pin 8. The two inversions cancel, so by the netlist the polarity is the same. The odd/even ASI result follows the same pattern, so the cause is probably in copper or parts rather than the netlist ${inf}.</li>
    <li><b>“Issue 3” has Issue 2's netlist.</b> <span class="mono">PCB/pod28iss3.net</span> is identical to <span class="mono">OBSOLETE/ISSUE 2/pod28iss2.net</span>. Issue 3 (P-CAD file stamped 10 Feb 2010|43) changed layout only ${inf}.</li>
    <li><b><span class="mono">PCB/WORKING/</span> is not a copy: it is a 3G redesign.</b> Its header path is <span class="mono">H:\\POD\\POD28\\PCB\\ISSUE 3-test\\</span> (30 Mar 2010|43). It uses a GS2974A equaliser, a GS2975A reclocker, four GS2978 drivers, an AT90CAN128 MCU with JTAG and an 8 MHz crystal, with nets LOCKED, LOS, SS0–SS2 and DATA_CLK. This is the RD48 “Upgrade to 3G-SDI” prototype, still with 6 outputs, not RD48's 10. Two of its drivers feed two BNCs each from their complementary legs, so OUT3/OUT4 and OUT5/OUT6 are opposite in polarity. That works for NRZI SDI but not for ASI. The README calls the folder a “WORKING/ copy”.</li>
    <li><b>Project files borrowed from POD21.</b> <span class="mono">pod28.pjt</span> still has a <span class="mono">[PD21V1~1.ASM]</span> section listing <span class="mono">P16F73.INC</span>, and its emulator frequency is 4.000000 MHz, not the 4.9152 MHz crystal. No <span class="mono">__CONFIG</span> is in the source, so the watchdog and power-up timer settings are unknown. The loop still runs CLRWDT every 4 cycles. The v1.00 header “POD28 DEMUX VERSION 1.00” is reused from a demux project.</li>
    <li><b>It only assembles case-insensitively.</b> The code uses <span class="mono">goto main</span> for <span class="mono">MAIN</span>, <span class="mono">GOTO NOT_LOCKED</span> for <span class="mono">not_locked</span>, <span class="mono">LOCK1</span>/<span class="mono">lock1</span>, <span class="mono">PORTd</span>. It relies on the <span class="mono">/c-</span> option in <span class="mono">v101.mcp</span> and <span class="mono">pod28.pjt</span>. The emulator's assembler does the same.</li>
    <li><b>The weak pull-up line does the opposite of its comment.</b> <span class="mono">BsF OPTION_REG,7 ;ENABLE PORT B WEAK PULL-UPS</span>. Bit 7 is RBPU, which is active-low, so setting it <i>disables</i> the pull-ups (PIC16F87x datasheet).</li>
    <li><b>3.3 V status into 5 V Schmitt inputs.</b> LD and SD/~HD go directly from the 3.3 V GS1535 to RD1/RD0. In I/O mode PORTD has Schmitt-trigger buffers (V<sub>IH</sub> = 0.8 V<sub>DD</sub> = 4.0 V), so a 3.3 V high is below the guaranteed threshold. The outputs to the Gennum chips are level-shifted by NC7WZ16s; these inputs are not. The threshold argument is ${inf} from the PIC16F87x datasheet.</li>
    <li><b>Manual slips.</b> POD28MAN says the unit will “reliably recover the incoming digital <i>audio</i> signal” and that the HD LED shows a “<i>sampling</i> rate of 1.485 Gbps”. <span class="mono">POD28MAN.doc</span> also contains the POD30 and POD31 manuals. The functional diagram labels its tallies HD / SD / ERROR, but the panel has SDI / HD / ERROR.</li>
    <li><b>The photographed rear panel is not the archived artwork.</b> <span class="mono">Pics/POD28 Rear.jpg</span> shows “100-240 VAC, 50-60 Hz / DISCONNECT BEFORE SERVICING” above OUTPUT 5–6. The FINAL CURVE silk (dated Jul.03/14) has a vertical “CAUTION: DISCONNECT POWER BEFORE SERVICING OR REPLACING THE FUSE” block and “100-240 VAC, 50-60 Hz, ½ A S.B.” under the inlet. The manual says 90–230 VAC.</li>
    <li><b>A four-LED POD28 once existed.</b> <span class="mono">#MF8200 #SERIES/M8205 - #Engineering #MF82/SA14-310/POD28iss1.ERR</span> (22 Oct 2003|36; a near-copy is in the obsolete R209 folder) loads <span class="mono">H:\\POD\\pod28\\POD28iss1.net</span> and reports LED1–3 “YELLOW” and an LED4 “GREEN” against a board with red LEDs and RFX BNCs. The archived Issue 1 netlist has three LEDs (two green, one red), so an earlier netlist was used ${inf}.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Instruction timing is exact for the archived source (4.9152 MHz, 1 or 2 cycles per instruction). The delay loop is computed in one step (1024 cycles) with the same result.</li>
    <li>Gennum behaviour is ${inf}: lock acquisition ${SIM.fmtDur(C.ACQ)}; carrier still detected to ${C.MARGIN}× the manual's cable length, with lock flapping in that band; SD/~HD holds its last value while unlocked; 3G gives a carrier but no lock; ASI locks like SD.</li>
    <li>Power-up timer 72 ms (config bits unknown). Port latches and RAM start at 0. In v1.00 a pin set as output reads back its latch.</li>
    <li>Outputs that are neither locked nor bypassed are shown as “no valid data”. The eye-diagram edge speeds and jitter are illustrative.</li>
    <li>ASI pass/fail per output comes from the 2010|43 test e-mail, not from a model.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD28 - #Master/POD28 - #Engineering/Software/v101w/28v101.asm, autodetect.asm, v101.mcp, pod28.pjt · v100/28v100.asm, autodetect.asm</li>
    <li>…/PCB/pod28iss3.net · OBSOLETE/ISSUE 1/pod28iss1.net · OBSOLETE/ISSUE 2/pod28iss2.ECO · WORKING/pod28iss3.net, POD28iss3.pcb</li>
    <li>…/P-CAD EDA - [Sheet1..3].pdf · …/MANUAL/POD28MAN.wpd, POD28MAN.doc · …/POD28 - Functional Diagram.cdr</li>
    <li>#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/Silks/POD28/POD28-FRONT&amp;REAR(FINAL CURVE).pdf, Pics/</li>
    <li>…/POD28 - #Mechanical #DA #2016/POD28-FRONT ISS 1.pdf, POD28-REAR ISS 1.pdf · …/POD28 - Upgrade #RD #RD48/Requirements.txt</li>
    <li>#POD #SERIES/POD27 - #Master/POD27 - #TESTREPORT/POD28-ASI PASS-24JUN10.pdf · #MF8200 #SERIES/M8205 - #Engineering #MF82/SA14-310/POD28iss1.ERR</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'pod28', name:'POD28 · SD/HD-SDI reclocking distribution amplifier ('+Y(2003)+')', duration:1,
  product:'POD28', year:2003, family:'POD series',
  folder:'#POD #SERIES/POD28 - #Master',
  summary:'Half-rack SDI distribution amplifier: one input, a GS1524 cable equaliser, a GS1535 multi-rate reclocker (143 Mb/s to 1.485 Gb/s) and six GS1528 drivers. A PIC16F874 watches the chips and lights SDI, HD and ERROR. Both archived firmware versions (v1.00 and v1.01) run here instruction by instruction.',
  highlights:['Real 28v10x.asm assembled and run cycle by cycle (813.8 ns per instruction)','Front and rear panels on the 2014|47 silkscreen, clickable','Rate changes, long cables and power-up seen through the 5/100-pass SD/HD debounce','v1.00 vs v1.01 and the same-week AUTOBYPASS ECO','Output eye per BNC, and the 2010|43 ASI test result','11-step operator tutorial from the manual'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (≈881 µs)', period:()=>loopT()},
    {label:'1 instruction cycle (813.8 ns)', period:()=>TCY},
    {label:'1 video line', period:()=>STD[sigAt(SIM.t).std].line || 1001/30000/525},
    {label:'1 video field', period:()=>STD[sigAt(SIM.t).std].field || 1001/60000},
    {label:'1 SDI bit', period:()=>1/(STD[sigAt(SIM.t).std].rate || 270e6)},
    {label:'1 ms', period:()=>0.001},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.1,'100 ms (debounce)'],[0.02,'20 ms (1 field)'],[0.003,'3 ms (3 passes)'],[0.0009,'1 pass (0.9 ms)'],[1e-4,'100 µs (lines)'],[2e-5,'20 µs (instructions)'],[2e-6,'2 µs'],[4e-8,'40 ns (SDI bits)']],
  defaultZoom:2,
  init(){ SKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD28', render:viewTutorial},
    {id:'second', label:'One second, slow motion', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
