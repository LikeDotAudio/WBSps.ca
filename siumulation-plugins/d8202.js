/* =====================================================================
   D8202 — AES/EBU digital-to-analog converter card, MF8200 series
   (Ward-Beck Systems; ISS2 1997|30, ISS4/ISS5 2005|38, firmware V1.00 2005|38)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, #MF8200 #SERIES/D8202 - #Master #MF82/…):
   - D8202 - #Engineering/Software/v100/v100.asm  (V1.00, Sept 22 2005; embedded below verbatim
       and ASSEMBLED + EXECUTED by an instruction-level PIC16C5x emulator in this file)
   - …/Software/v100/V100.ERR, V100.$$$ (build warnings, the earlier draft), da301.pjt (4 MHz, MPASM)
   - …/PCB/OBSOLETE/ISS4/d8202-ISS4.net  (Tango netlist, 205 parts / 137 nets: every pin and net
       name used in the schematics and the PIC pin map; the ISS5 .sch is an identical copy of ISS4)
   - …/PCB/D8202-ISS5.bom, D8202-ISS5.pnp, OBSOLETE/ISS4/D8202-ISS4.bom (values by RefDes)
   - …/PCB/GERBERS/D8202-ISS5.TOP/.BOT/.TSM/.SLK  (rendered into assets/d8202-board-top.png)
   - D8202-ISS5 - #Assembly.pdf (P-CAD 2002 assembly drawing, 2010|43)
   - …/D8202MAN.WPD and d8202.pdf  (manual, 1999|32: Figs 1.1–1.3, specs, LEDs, EQ, mono jumpers)
   - …/PCB/OBSOLETE/ISS2/D8202.ASM, D8202.BOM  (1997|30 ISS2 design: CS8412, CS4329, 75176, jack)
   - 8200 Series Rear Module options…/D8202 - rear module options.cdr + .pdf  (TB8205P, TB8205P/75; 2012|45) → assets/d8202-rear-*.svg
       → assets/d8202-rear-tb8205p-black.png, d8202-rear-tb8205p75-black.png
   - …/D8202TR1.CDR, D8202TR3.cdr (older QC8200 / TB8205 / ST8200 / ST8201A terminal options,
       converted with Inkscape; text re-read from the converted SVG)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const AS = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const Y = y=>SIM.year(y);
const hex2 = v=>(v&255).toString(16).toUpperCase().padStart(2,'0');
const bin8 = v=>(v&255).toString(2).padStart(8,'0');
const esc = s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ASM_SRC = "    ERRORLEVEL -302\n;********************************************************\n;    D8202 V100 D-to-A Converter\n;    based on the DA301V101 AES\\EBU DA\n;\n;     VERSION V1.00\n;     September 22, 2005\n;********************************************************\n    LIST    P=16C5X,r=dec\n    #INCLUDE \"P16C5X.INC\"\n\n;default cs8420 settings\n\ncs8420reg1def    equ b'00001000'    ; Miscellaneous Control 1 (1)\ncs8420reg2def    equ b'00000000'    ; Miscellaneous Control 2 (2)\ncs8420reg3def    equ b'10010101'    ; Data Flow Control (3)\ncs8420reg4def    equ b'01001001'    ; Clock Flow Control (4)\ncs8420reg5def    equ b'00000000'    ; Serial Audio Input Port Data Format (5)\ncs8420reg6def    equ b'10010010'    ; Serial Audio Output Port Data Format (6)\ncs8420reg9def    equ b'00000000'    ; Interupt 1 Register Mask (9) 0=masked-\ncs8420reg17def    equ b'00110111'    ; Receive Error Mask (17)\n\ncs8420reg3mute    equ b'11010101'    ; Mute AES3 Transmitter (3)\n;********************************************************\n        ORG 07H     ;BANK0 MEMORY\n\nDELAY1        RES 1        ;TEMP REG FOR DELAY ROUTINES\nDELAY2        RES 1        ;TEMP REG FOR DELAY ROUTINES\ntemp0        RES 1        ;\ntemp1        RES 1        ;\ntemp2        RES 1\n\nstage        res 1\nstage1        res 1\nwrite        res 1\n\n; cs8420 setup registers\n\ncs8420reg1        res    1        ; Miscellaneous Control 1 (1)\ncs8420reg2        res    1        ; Miscellaneous Control 2 (2)\ncs8420reg3        res    1        ; Data Flow Control (3)\ncs8420reg4        res    1        ; Clock Flow Control (4)\ncs8420reg5        res    1        ; Serial Audio Input Port Data Format (5)\ncs8420reg6        res    1        ; Serial Audio Output Port Data Format (6)\ncs8420reg9        res    1        ; Interupt 1 Register Mask (9)\ncs8420reg17        res    1        ; Receive Error Mask (17)\n\nCS8420_16        res    1        ;status for lock detect\ncs8420_6        res     1\n\nconfidence        res    1\n\n;***************  RESET  ****************************\n    ORG 0X1FF\n    GOTO RESET\n    ORG 0\n    GOTO RESET\n    ORG    0X10\nRESET\n\n;************** INIT  ******************************\nINIT\n            bcf portb,1\n            MOVLW B'00000100'\n            TRIS PORTB\n            MOVLW B'11110010'\n            TRIS PORTA\n\n            CLRF PORTA    ;SEL\n            CLRF PORTB\n\n            bsf porta,0    ;8420 chip select\n        ;*************************\n            bsf stage,0\n            clrf stage1\n            clrf write\n        ;****************************\n            clrf temp0\npowerupdelay        decfsz temp0,f\n            goto powerupdelay\n\n;------------ setup cs8420  ------------------------------------------------\n\n        movlw cs8420reg1def    ;set files registers to default settings\n        movwf cs8420reg1\n        movlw cs8420reg2def\n        movwf cs8420reg2\n        movlw cs8420reg3def\n        movwf cs8420reg3\n        movlw cs8420reg4def\n        movwf cs8420reg4\n        movlw cs8420reg4def\n        movwf cs8420reg4\n        movlw cs8420reg5def\n        movwf cs8420reg5\n        movlw cs8420reg6def\n        movwf cs8420reg6\n        movlw cs8420reg9def\n        movwf cs8420reg9\n        movlw cs8420reg17def\n        movwf cs8420reg17\n        bsf portb,1        ;take 8420 out of reset\n        call refresh8420\n\n        clrf confidence\n\n\n;**************  MAIN  ******************************\n;\n;****************************************************\n\nMAIN\n    clrwdt\n    MOVLW B'00000100'\n    TRIS PORTB\n    MOVLW B'11110010'\n    TRIS PORTA\n\n    CALL READ8420\n    CALL REFRESHSTATUS\n    CALL REFRESH8420\n\n    goto main\n\n\n;**************** REFRESHSTATUS *****************************\n;test  cs8420_16 for error status and set leds 8420 registers\n;\nREFRESHSTATUS\n\n;test lock state cs8420_16,4 - 0=locked\n;mute dac if no lock\n\n    movlw cs8420reg6def\n    subwf cs8420_6,w\n    btfss status,z\n    goto init\n\n    btfsc cs8420_16,4\n    goto no_lock\n    goto lock\n\nlock\n    movlw cs8420reg3def\n    movwf cs8420reg3\n    bsf portb,3        ;mute dac on no lock(0=mute)\n    bcf portb,4        ;no lock led (error)\n    bsf portb,6        ;lock led\n    bcf portb,7        ;no lock flag (error)\n    goto next\n\nno_lock\n    movlw cs8420reg3mute\n    movwf cs8420reg3\n    bcf portb,3        ;mute dac on no lock (0=mute)\n    bsf portb,4        ;no lock led(error)\n    bcf portb,6        ;lock led\n    bsf portb,7        ;no lock flag(error)\n;test for confidence\nnext\n    btfss cs8420_16,4    ;if error, no need to check confidence\n    goto check_confidence\n    bcf portb,5\n\n    bcf portb,0        ;not in DA301\n    return\n\ncheck_confidence    ; changed from previous DA301\n    clrf confidence\n\n    btfss cs8420_16,5    ;crc flag\n    bcf confidence,5    ;confidence error\n    btfsc cs8420_16,5\n    bsf confidence,5\n\n    btfss cs8420_16,2    ;confidence flag\n    bcf confidence,2    ;confidence error\n    btfsc cs8420_16,2\n    bsf confidence,2\n\n    btfss cs8420_16,1    ;biphase flag\n    bcf confidence,1    ;confidence error\n    btfsc cs8420_16,1\n    bsf confidence,1\n\n    btfss cs8420_16,0    ;parity flag\n    bcf confidence,0    ;confidence error\n    btfsc cs8420_16,0\n    bsf confidence,0\n\n    movf confidence,w\n    btfsc status,z\n    goto confidence_off\n    btfss status,z\n    goto confidence_on\n\nconfidence_on\n    bsf portb,5        ;turn on confidence led\n    bsf portb,0        ;turn on confidence oc\n    return\n\nconfidence_off\n    bcf portb,5        ;turn off confidence led\n    bcf portb,0        ;turn off confidence oc\n    return\n;****************  read cs8420 *****************************\n;\n;test for lock\n;return\n\nread8420\n\n;set address 16 to read ERROR bits\n\n        bcf portA,0            ;cs8420 chip select = 0\n        movlw b'00100000'        ; address + write bit (bit0=0 for write)\n        movwf temp0\n        ;call shiftout1\n        goto shiftout1\n\ns1        bsf stage1,0\n        movlw 16            ;address of receive error register\n        movwf temp0\n        ;call shiftout_1\n        goto shiftout1\n\ns2        bsf stage1,1\n        bsf portA,0            ;cs8420 chip select = 1\n        nop\n        nop\n        bcf portA,0            ;cs8420 chip select = 0\n        movlw b'00100001'        ; address + write bit (bit0=0 for write)\n        movwf temp0\n        ;call shiftout_1            ;set read mode\n        goto shiftout1\n\ns3        call shiftin            ;read data into temp\n        bsf portA,0            ;cs8420 chip select = 1\n        movf temp2,w\n        movwf cs8420_16\n\n        bsf stage1,2\n        bcf portA,0            ;cs8420 chip select = 0\n        movlw b'00100000'        ; address + write bit (bit0=0 for write)\n        movwf temp0\n        ;call shiftout1\n        goto shiftout1\n\ns4        bsf stage1,3\n        movlw 6                ;address of receive error register\n        movwf temp0\n        ;call shiftout_1\n        goto shiftout1\n\ns5        bsf stage1,4\n        bsf portA,0            ;cs8420 chip select = 1\n        nop\n        nop\n        bcf portA,0            ;cs8420 chip select = 0\n        movlw b'00100001'        ; address + write bit (bit0=0 for write)\n        movwf temp0\n        ;call shiftout_1            ;set read mode\n        goto shiftout1\n\ns6        clrf stage1\n        call shiftin            ;read data into temp\n        bsf portA,0            ;cs8420 chip select = 1\n        movf temp2,w\n        movwf cs8420_6\n        return\n\n\n\nshiftin\n;shift 8 bits into temp2\n\n        clrf temp2\n    ;    bsf portA,2\n    ;    bcf portA,2\n    ;    nop\n        btfsc portA,1    ;msb first\n        bsf temp2,7    ;data out\n\n\n        bsf portA,2\n        bcf portA,2\n    ;    nop\n        btfsc portA,1    ;qcrc\n        bsf temp2,6    ;data out\n\n\n        bsf portA,2\n        bcf portA,2\n    ;    nop\n        btfsc portA,1    ;crc\n        bsf temp2,5    ;data out\n\n\n        bsf portA,2\n        bcf portA,2\n    ;    nop\n        btfsc portA,1    ;lock\n        bsf temp2,4    ;data out\n\n        bsf portA,2\n        bcf portA,2\n    ;    nop\n        btfsc portA,1    ;validity\n        bsf temp2,3    ;data out\n\n        bsf portA,2\n        bcf portA,2\n    ;    nop\n        btfsc portA,1    ;conf\n        bsf temp2,2    ;data out\n\n        bsf portA,2\n        bcf portA,2\n    ;    nop\n        btfsc portA,1    ;biphase\n        bsf temp2,1    ;data out\n\n        bsf portA,2\n        bcf portA,2\n    ;    nop\n        btfsc portA,1    ;lsb last=par\n        bsf temp2,0    ;data out\n        return\n\nshiftout1    ;shift 8 bits in temp0 to cs8420\n\n        bcf portA,3    ;data out\n        btfsc temp0,7    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,6    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,5    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,4    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,3    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,2    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,1    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,0    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        btfss stage1,0\n        goto s1\n        btfss stage1,1\n        goto s2\n        btfss stage1,2\n        goto s3\n        btfss stage1,3\n        goto s4\n        btfss stage1,4\n        goto s5\n        goto s6\n        ;return\n\n;****************  refresh cs8420 control registers ***************************\n;this routine will refresh control registers 1-6,9 and 17\n;values are stored in file registers 'cs8420regxx'\n;using spi port on 8420\n\n\n\nrefresh8420\n\nreg1\n        bsf write,0\n        movlw b'00100000'    ;address + write bit (bit0=0 for write)\n        movwf temp0\n        movlw 1            ;address\n        movwf temp1\n        movf cs8420reg1,w\n        movwf temp2\n        goto wr8420reg\n\nreg2\n        bsf write,1\n        movlw b'00100000'    ;address + write bit (bit0=0 for write)\n        movwf temp0\n        movlw 2            ;address\n        movwf temp1\n        movf cs8420reg2,w\n        movwf temp2\n        goto wr8420reg\nreg3\n        bsf write,2\n        movlw b'00100000'    ;address + write bit (bit0=0 for write)\n        movwf temp0\n        movlw 3            ;address\n        movwf temp1\n        movf cs8420reg3,w\n        movwf temp2\n        goto wr8420reg\nreg4\n        bsf write,3\n        movlw b'00100000'    ; address + write bit (bit0=0 for write)\n        movwf temp0\n        movlw 4            ;address\n        movwf temp1\n        movf cs8420reg4,w\n        movwf temp2\n        goto wr8420reg\nreg5\n        bsf write,4\n        movlw b'00100000'    ; address + write bit (bit0=0 for write)\n        movwf temp0\n        movlw 5            ;address-\n        movwf temp1\n        movf cs8420reg5,w\n        movwf temp2\n        goto wr8420reg\nreg6\n        bsf write,5\n        movlw b'00100000'    ; address + write bit (bit0=0 for write)\n        movwf temp0\n        movlw 6            ;address\n        movwf temp1\n        movf cs8420reg6,w\n        movwf temp2\n        goto wr8420reg\n\nreg9\n        bsf write,6\n        movlw b'00100000'    ; address + write bit (bit0=0 for write)\n        movwf temp0\n        movlw 9            ;address\n        movwf temp1\n        movf cs8420reg9,w\n        movwf temp2\n        goto wr8420reg\nreg17\n        bsf write,7\n        movlw b'00100000'    ; address + write bit (bit0=0 for write)\n        movwf temp0\n        movlw 17            ;address\n        movwf temp1\n        movf cs8420reg17,w\n        movwf temp2\n        goto wr8420reg\n\nwr8420reg    ;write  data into cs8420 control register\n        ;on entry temp0=address, temp1=map and temp2=data\n\n        bcf portA,0        ;cs8420 chip select = 0\n        ;call shiftout        ;send address first\n;*********************************\n        goto shiftout\n;********************************\n\nr1        clrf stage\n        bsf stage,1\n        movf temp1,w\n        movwf temp0\n        ;call shiftout        ;send map second\n        ;****************\n        goto shiftout\n        ;*************\n\nr2        clrf stage\n        bsf stage,2\n        movf temp2,w\n        movwf temp0\n        ;call shiftout        ;send data third\n        ;**************\n        goto shiftout\n        ;**************\n\nr3        clrf stage\n        bsf stage,0\n        bsf portA,0        ;cs8420 chip select = 1\n\n        btfss write,1\n        goto reg2\n        btfss write,2\n        goto reg3\n        btfss write,3\n        goto reg4\n        btfss write,4\n        goto reg5\n        btfss write,5\n        goto reg6\n        btfss write,6\n        goto reg9\n        btfss write,7\n        goto reg17\n        clrf write\n        return\n\nshiftout    ;shift 8 bits in temp0 to cs8420\n\n        bcf portA,3    ;data out\n        btfsc temp0,7    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,6    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,5    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,4    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,3    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,2    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,1    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        bcf portA,3    ;data out\n        btfsc temp0,0    ;msb first\n        bsf portA,3\n        bsf portA,2\n        bcf portA,2\n\n        btfsc stage,0\n        goto r1\n        btfsc stage,1\n        goto r2\n        btfsc stage,2\n        goto r3\n        ;return\n        END";

/* ================================================================
   CONSTANTS
   ================================================================ */
const C = {
  FOSC_PJT: 4.0e6,     // da301.pjt [Fuses] Frequency=4000000 (MPLAB simulator setting)
  FOSC_RC: 3.3e6,      // PIC16C54RC with R41 4K7 / C46 27p (BOM) — typical RC frequency, inferred
  T_SUPPLY: 0.005,     // LM2596 +5 V rise to MC34164 threshold — inferred
  T_DRT: 0.018,        // PIC16C5x device-reset timer, 18 ms typical (Microchip data, not in archive) — inferred
  LOCK_ACQ: 0.020,     // CS8427 PLL acquisition after RUN + valid input — inferred (same figure as the D8204 plugin)
  K_TP: 0.25,          // 110 Ω twisted pair skin-effect constant per 100 m (calibrated to the manual: 250 m / 600 m) — inferred
  K_COAX: 0.103,       // 75 Ω coax (calibrated to the manual: 1500 m with EQ) — inferred
  Q_CONF: 0.50,        // eye opening (fraction of peak) below which the receiver flags CONF — inferred
  Q_ERR: 0.30,         // below this, bi-phase and parity errors appear — inferred
  Q_LOCK: 0.15,        // below this the PLL cannot lock — inferred
  VEYE_MIN: 0.10,      // eye height at RXP needed to lock (≈ 200 mV p-p) — inferred
  DAC_FS: 2.0,         // CS4390 differential full-scale, V rms — inferred (makes Fig 1.2's 24/18/16 dBFS marks come out exactly)
  RAIL_PK: 17.5,       // OP275 swing on ±19 V rails (±20 V less D3/D4), V peak — inferred
};
// Real component values (D8202-ISS4.bom / ISS5.pnp, by RefDes)
const R = { R1:750,R3:750,R4:750,R5:750,R6:330,R7:110,R8:100e3,R9:110,R11:110,R12:110,R13:110,R14:75,
  R20:10e3,R21:10e3,R22:10e3,R23:3300,R24:10e3,R25:3300,R27:10e3,R28:3300,R29:10e3,
  R46:15e3,R47:15e3,R49:15e3,R50:0,R53:10e3,R54:10e3,R56:15e3,R62:15e3,R63:7500,R65:15e3,R66:15e3,R67:15e3,
  R78:15e3,R79:15e3,R83:0,R84:10e3,R85:10e3,R86:15e3, RV:20e3, ROUT:30,
  C7:1e-9, C13:220e-12, C25:1e-9, C26:220e-12 };
const H2POS = { '24':{r:R.R50, lab:'24 dBFS', pins:'1–2', res:'R50 0R'}, '18':{r:R.R54, lab:'18 dBFS', pins:'3–4', res:'R54 10K'}, '16':{r:R.R56, lab:'16 dBFS', pins:'5–6', res:'R56 15K'} };
const FS_LIST = [32000, 44100, 48000, 96000];
const fosc = ()=> D.clock==='rc'? C.FOSC_RC : C.FOSC_PJT;
const TCY = ()=> 4/fosc();
const tBoot = ()=> C.T_SUPPLY + C.T_DRT;

/* ================================================================
   MINI ASSEMBLER for v100.asm (MPASM subset, case-insensitive as da301.pjt's /c- option)
   ================================================================ */
const OPS = ['nop','clrwdt','bcf','bsf','btfss','btfsc','movlw','movwf','movf','clrf','subwf','decfsz','goto','call','return','tris'];
const OPN = {}; OPS.forEach((o,i)=>OPN[o]=i);
const PROG = (function assemble(src){
  const lines = src.split('\n');
  const sym = { indf:0,tmr0:1,pcl:2,status:3,fsr:4,porta:5,portb:6,w:0,f:1,z:2,c:0,dc:1 };   // P16C5X.INC
  const num = s=>{ s=s.trim(); let m;
    if ((m=s.match(/^b'([01]+)'$/i))) return parseInt(m[1],2);
    if ((m=s.match(/^0x([0-9a-f]+)$/i))) return parseInt(m[1],16);
    if ((m=s.match(/^([0-9][0-9a-f]*)h$/i))) return parseInt(m[1],16);
    if (/^\d+$/.test(s)) return parseInt(s,10);
    const k=s.toLowerCase(); if (k in sym) return sym[k]; return null; };
  const items=[]; let pc=0; const lab={}; const addrLab={};
  for (let pass=0; pass<2; pass++){
    pc=0; items.length=0;
    lines.forEach((raw,li)=>{
      const s = raw.split(';')[0]; if (!s.trim()) return;
      const toks = s.trim().split(/\s+/);
      let label=null; if (!/^\s/.test(s)){ label=toks.shift(); }
      let op=(toks.shift()||'').toLowerCase(); const arg=toks.join(' ');
      if (label && OPN[label.toLowerCase()]!==undefined && !op){ op=label.toLowerCase(); label=null; }
      if (op==='equ'){ if(pass===0) sym[label.toLowerCase()]=num(arg); return; }
      if (op==='res'){ if(pass===0){ sym[label.toLowerCase()]=pc; } pc+=num(arg); return; }
      if (label){ const k=label.toLowerCase(); if(pass===0){ lab[k]=pc; sym[k]=pc; (addrLab[pc]=addrLab[pc]||[]).push(label); } }
      if (!op || ['errorlevel','list','#include'].includes(op)) return;
      if (op==='org'){ pc=num(arg); return; }
      if (op==='end') return;
      if (OPN[op]===undefined) return;
      const a=arg.split(',').map(x=>x.trim()).filter(Boolean);
      const ins={op:OPN[op], name:op, arg, line:li, addr:pc, f:0, b:0, d:1, k:0};
      if (pass===1){
        if (['bcf','bsf','btfss','btfsc'].includes(op)){ ins.f=num(a[0]); ins.b=num(a[1]); }
        else if (['movf','subwf','decfsz'].includes(op)){ ins.f=num(a[0]); ins.d=num(a[1]); }
        else if (['movwf','clrf','tris'].includes(op)) ins.f=num(a[0]);
        else if (['movlw','goto','call'].includes(op)) ins.k=num(a[0]);
      }
      items.push(ins); pc++;
    });
  }
  const mem = new Array(512).fill(null); const lineAddr={};
  items.forEach(i=>{ mem[i.addr]=i; lineAddr[i.line]=i.addr; });
  return { mem, lab, addrLab, sym, lines, lineAddr, size: Math.max(...items.filter(i=>i.addr<0x1FF).map(i=>i.addr))+1 };
})(ASM_SRC);
const L = PROG.lab;
// file registers the code RES-erves at ORG 07H (bank 0)
const FREGS = ['DELAY1','DELAY2','temp0','temp1','temp2','stage','stage1','write','cs8420reg1','cs8420reg2','cs8420reg3','cs8420reg4','cs8420reg5','cs8420reg6','cs8420reg9','cs8420reg17','CS8420_16','cs8420_6','confidence'];
// routine ranges for the "where is the PC" highlight
const ROUTINES = [
  ['RESET / INIT', 'init'], ['MAIN','main'], ['REFRESHSTATUS','refreshstatus'], ['READ8420','read8420'], ['shiftin','shiftin'],
  ['shiftout1','shiftout1'], ['REFRESH8420','refresh8420'], ['wr8420reg','wr8420reg'], ['shiftout','shiftout'] ].map(([n,k])=>({n,k,a:L[k]})).sort((a,b)=>a.a-b.a);
function routineOf(pc){ if (pc>=0x1FF) return 'reset vector'; let r=ROUTINES[0]; ROUTINES.forEach(x=>{ if (pc>=x.a) r=x; }); return r.n; }
const RB_NAMES = ['RB0 → Q2 CONF alarm (P1-22)','RB1 → CS8427 RST','RB2 ← RERR (input, unused)','RB3 → MUTEDAC (0 = mute)','RB4 → R43 → ERROR / NO LOCK LED (red)','RB5 → R42 → CONF LED (yellow)','RB6 → R40 → SIGNAL / LOCK LED (green)','RB7 → Q1 NO-LOCK alarm (P1-21)'];

/* ================================================================
   DEVICE STATE
   ================================================================ */
const DEF = ()=>({
  rear:'p',            // 'p' = TB8205P (110 Ω pluggable screw) · 'p75' = TB8205P/75 (BNC, unbalanced)
  len:30,              // cable length, m
  vpp:4.0,             // AES source level into a matched load, V p-p (TB8205P); /75 uses 1.0 V (AES-3id)
  plugged:true, loop:false,
  fs:48000, crc:true, validity:false, parityErr:false,
  h1:'110', h2:'24', h5:'24', rv1:0.817, rv2:0.817, h3:'stereo', h4:'stereo', eq:false,
  tone:{ db:-20, fL:1000, fR:1000 }, load:10000, clock:'pjt',
  events:[],           // {t, type:'unplug'|'plug'|'glitch'}
  probe:null, sel:'U7',
  log:[],
});
let D = DEF();

/* ================================================================
   CABLE + INPUT EQ + RECEIVER EYE (FFT of a real biphase stream)
   ================================================================ */
function fft(re, im, inv){
  const n=re.length;
  for (let i=1,j=0;i<n;i++){ let bit=n>>1; for(;j&bit;bit>>=1) j^=bit; j^=bit; if(i<j){ let t=re[i];re[i]=re[j];re[j]=t; t=im[i];im[i]=im[j];im[j]=t; } }
  for (let len=2;len<=n;len<<=1){ const ang=2*Math.PI/len*(inv?1:-1), wr=Math.cos(ang), wi=Math.sin(ang);
    for (let i=0;i<n;i+=len){ let cr=1,ci=0; for (let k=0;k<len/2;k++){ const a=i+k,b=a+len/2; const xr=re[b]*cr-im[b]*ci, xi=re[b]*ci+im[b]*cr; re[b]=re[a]-xr; im[b]=im[a]-xi; re[a]+=xr; im[a]+=xi; const t=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=t; } } }
  if (inv) for (let i=0;i<n;i++){ re[i]/=n; im[i]/=n; }
}
const PRE = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]};
// AES3 subframe bits (slots 4..31) for a 24-bit sample
function subBits(sample24, fr, side, opt){
  const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(sample24>>b)&1;
  bits[28]=opt.validity?1:0; bits[29]=0;
  const cs0 = opt.fs===48000?0x85: opt.fs===44100?0x45: opt.fs===32000?0xC5:0x05;
  bits[30] = fr<8 ? (cs0>>fr)&1 : 0;
  let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]= opt.parityErr && side===0 ? par^1 : par;
  return bits;
}
// half-cell levels for a run of frames; starts at level 0
function biphaseFrames(frames){
  const lv=[]; let cur=0;
  frames.forEach(F=>F.forEach(sf=>{
    const P=PRE[sf.pre]; P.forEach(b=>lv.push(cur? 1-b : b)); cur=lv[lv.length-1];
    for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (sf.bits[i]) cur=1-cur; lv.push(cur); }
  }));
  return lv;
}
function eqStage(f, on){   // U1A (×2, R4/R1) then U1B inverting: R3 / (R11 + Z); Z = R5 ‖ (R6+C7) ‖ (R12+C13) when SW1 is in
  const w=2*Math.PI*f; let zr=R.R5, zi=0;
  if (on){ // admittances
    const y5r=1/R.R5;
    const z6r=R.R6, z6i=-1/(w*R.C7||1e-30); const m6=z6r*z6r+z6i*z6i; const y6r=z6r/m6, y6i=-z6i/m6;
    const z12r=R.R12, z12i=-1/(w*R.C13||1e-30); const m12=z12r*z12r+z12i*z12i; const y12r=z12r/m12, y12i=-z12i/m12;
    const yr=y5r+(f? y6r+y12r:0), yi=(f? y6i+y12i:0); const m=yr*yr+yi*yi; zr=yr/m; zi=-yi/m;
  }
  const dr=R.R11+zr, di=zi, m=dr*dr+di*di;   // R3/(dr+jdi)
  return [2*R.R3*dr/m, -2*R.R3*di/m];
}
const OS = 16;     // samples per biphase half-cell
function channel(lv){   // biphase half-cells (0/1) → waveform at the CS8427 RXP pin, per volt of input: cable × U1 EQ stage
  const N=lv.length*OS; const re=new Float64Array(N), im=new Float64Array(N);
  for (let i=0;i<N;i++) re[i]= lv[(i/OS)|0]? 1 : -1;
  fft(re,im,false);
  const cell=1/(128*D.fs), dt=cell/OS, K=(D.rear==='p75'? C.K_COAX : C.K_TP)*D.len/100;
  const cache={};
  for (let i=0;i<N;i++){ const f=(i<=N/2? i : i-N)/(N*dt);
    const s=Math.sqrt(Math.abs(f)/1e6)/Math.SQRT2, mag=Math.exp(-K*s), ph=-K*s*Math.sign(f);
    const [er,ei0]=eqStage(Math.abs(f), D.eq); const ei = f<0? -ei0 : ei0;
    const hr=mag*(Math.cos(ph)*er - Math.sin(ph)*ei), hi=mag*(Math.cos(ph)*ei + Math.sin(ph)*er);
    const x=re[i], y=im[i]; re[i]=x*hr-y*hi; im[i]=x*hi+y*hr; }
  fft(re,im,true);
  return re;
}
let LINK=null, LINK_KEY='';
function z0(){ return D.rear==='p75'? 75 : 110; }
function zTerm(){ let z = D.h1==='110'? 110 : D.h1==='75'? 75 : R.R8; if (D.rear==='p' && D.loop) z = 1/(1/z + 1/110); return z; }
function link(){
  const key=[D.rear,D.len,D.vpp,D.h1,D.eq,D.loop,D.fs,D.plugged].join('|');
  if (key===LINK_KEY) return LINK; LINK_KEY=key;
  // 8 frames of pseudo-random audio (seeded) → biphase → cable → EQ → eye
  let seed=12345; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed; };
  const frames=[]; for (let k=0;k<8;k++) frames.push([0,1].map(s=>({pre: s? 'Y' : (k===0?'Z':'X'), bits: subBits(rnd()&0xFFFFFF, k, s, {fs:D.fs})})));
  const lv=biphaseFrames(frames); const N=lv.length*OS;  // 8·128·16 = 16384
  const re=channel(lv);
  let pk=0; for (let i=0;i<N;i++) pk=Math.max(pk,Math.abs(re[i]));
  let best=-1e9, bestPh=0; for (let ph=0;ph<OS;ph++){ let m=1e9; for (let c=0;c<lv.length;c++){ const v=re[c*OS+ph]*(lv[c]?1:-1); if (v<m) m=v; } if (m>best){best=m;bestPh=ph;} }
  const q=Math.max(0,best)/pk;
  const zt=zTerm(), Z0=z0(), gam=(zt-Z0)/(zt+Z0);
  const vin = (D.rear==='p75'? 1.0 : D.vpp)/2*(1+gam);   // V peak at the transformer secondary
  const veye = Math.max(0,best)*vin, vpk=pk*vin;
  const lossDb = 6.14*(D.rear==='p75'? C.K_COAX : C.K_TP)*(D.len/100)*Math.sqrt(64*D.fs/1e6);
  const [g0r,g0i]=eqStage(64*D.fs, D.eq), eqDb=20*Math.log10(Math.hypot(g0r,g0i)/Math.hypot(...eqStage(1e3,false)));
  const fsOK = D.fs>=30000 && D.fs<=50000;
  const lockOK = fsOK && q>=C.Q_LOCK && veye>=C.VEYE_MIN;
  LINK = { q, veye, vpk, gam, zt, Z0, vin, lossDb, eqDb, fsOK, lockOK, conf:q<C.Q_CONF, err:q<C.Q_ERR, wave:re, lv, ph:bestPh, N };
  return LINK;
}

/* ================================================================
   INPUT EVENTS + RECEIVER LOCK (a pure function of time + the RUN history the emulator records)
   ================================================================ */
function evSorted(){ return D.events; }   // kept sorted on insert
function sigPresent(t){ let s=D.plugged; for (const e of evSorted()){ if (e.t>t) break; if (e.type==='unplug') s=false; if (e.type==='plug') s=true; } return s; }
function sigSince(t){ let s=D.plugged, since=0; for (const e of evSorted()){ if (e.t>t) break; if (e.type==='unplug') s=false; if (e.type==='plug' && !s){ s=true; since=e.t; } } return since; }
function runAt(hist, t){ let st=null; for (const h of hist){ if (h.t>t) break; st=h; } return st && st.on ? st.t : null; }
function lockedH(hist, t){
  const rs=runAt(hist,t); if (rs===null) return false;
  if (!sigPresent(t) || !link().lockOK) return false;
  return t - Math.max(rs, sigSince(t)) >= C.LOCK_ACQ;
}

/* ================================================================
   CS8427 control port (SPI slave), as the PIC sees it
   ================================================================ */
class CS8427 {
  constructor(hist){ this.regs=new Uint8Array(128); this.hist=hist; this.live=false; this.rst=0; this.cs=1; this.sck=0; this.sdo=0; this.mode='idle'; this.bit=0; this.sh=0; this.map=0; this.out=0; this.idx=0; this.tx=null; this.last16=0; this.reads=0; this.lastR16=0; this.lastR6=0; }
  clone(){ const s=Object.assign(new CS8427(this.hist), this); s.regs=this.regs.slice(); s.tx=this.tx?{...this.tx,bytes:this.tx.bytes.slice()}:null; return s; }
  T(c){ return tBoot()+c*TCY(); }
  clearRegs(c, why){ this.regs.fill(0); if (this.live) this.hist.push({t:this.T(c), on:false, why}); this.last16=this.T(c); }
  setSdo(v, c, rec){ if (v!==this.sdo){ this.sdo=v; if (rec) rec.tog[1].push(c); } }
  onPins(a, b, c, rec){
    const rst=(b>>1)&1;
    if (!rst){ if (this.rst){ this.clearRegs(c,'RST low'); } this.rst=0; this.mode='idle'; return; }
    this.rst=1;
    const cs=a&1, sck=(a>>2)&1, din=(a>>3)&1;
    if (cs!==this.cs){
      if (cs===0){ this.mode='addr'; this.bit=0; this.idx=0; this.sh=0; this.tx={c0:c, bytes:[]}; }
      else { if (this.tx && this.tx.bytes.length){ this.tx.c1=c; if (rec) rec.tx.push(this.tx); } this.tx=null; this.mode='idle'; }
      this.cs=cs;
    }
    if (cs===0){
      if (sck && !this.sck){
        if (this.mode==='addr' || this.mode==='map' || this.mode==='data'){ this.sh=((this.sh<<1)|din)&255; if (++this.bit===8){ this.bit=0; this.byte(this.sh, c); } }
      } else if (!sck && this.sck){
        if (this.mode==='rpend'){ this.mode='read'; this.setSdo((this.out>>7)&1, c, rec); }
        else if (this.mode==='read'){ this.out=(this.out<<1)&255; this.setSdo((this.out>>7)&1, c, rec); }
      }
    }
    this.sck=sck;
  }
  byte(v, c){
    if (this.tx) this.tx.bytes.push(v);
    if (this.mode==='addr'){
      if ((v>>1)===0x10){ if (v&1){ this.mode='rpend'; this.out=this.readReg(this.map, c); if (this.tx){ this.tx.rd=this.map; this.tx.val=this.out; } } else this.mode='map'; }
      else this.mode='ignore';
    } else if (this.mode==='map'){ this.map=v&0x7F; this.mode='data'; if (this.tx) this.tx.map=this.map; }
    else if (this.mode==='data'){ this.writeReg(this.map, v, c); if (this.tx) this.tx.val=v; }
  }
  writeReg(m, v, c){
    const was=this.regs[4]&0x40; this.regs[m]=v;
    if (m===4){ const now=v&0x40; if (now && !was && this.live) this.hist.push({t:this.T(c), on:true}); if (!now && was && this.live) this.hist.push({t:this.T(c), on:false, why:'RUN=0'}); }
  }
  flags16(c){   // Receiver Error register (16): bits latched since the last read, ANDed with the mask in reg 17 — latching per CS84xx data sheets, inferred
    const t1=this.T(c), t0=this.last16; this.last16=t1; this.reads++;
    const Lk=link(), H=this.hist;
    let unlock = !(lockedH(H,t0) && lockedH(H,t1));
    if (D.events.some(e=>(e.type==='unplug'||e.type==='glitch') && e.t>t0 && e.t<=t1)) unlock=true;
    let v=0;
    if (unlock) v|=0x10;
    else {
      if (Lk.conf) v|=0x04;
      if (Lk.err){ const h=((this.reads*2654435761)>>>0)/4294967296; if (h < (C.Q_ERR-Lk.q)/C.Q_ERR*1.2) v|=0x03; }
      if (!D.crc && Math.floor(t1*D.fs/192) > Math.floor(t0*D.fs/192)) v|=0x20;    // CRCC checked once per 192-frame block
      if (D.parityErr) v|=0x01;
      if (D.validity) v|=0x08;
      v|=0x40*0;    // Q-subcode CRC: not used in AES3 professional — always 0 here
    }
    return v & this.regs[17];
  }
  readReg(m, c){ const v = m===16? this.flags16(c) : this.regs[m]; if (m===16) this.lastR16=v; if (m===6) this.lastR6=v; return v; }
}

/* ================================================================
   PIC16C54 (baseline 12-bit core) — executes v100.asm
   ================================================================ */
class PIC {
  constructor(){ this.pc=0x1FF; this.w=0; this.f=new Uint8Array(32); this.f[3]=0x18; this.st=[0,0]; this.trisA=0x0F; this.trisB=0xFF; this.latA=0; this.latB=0; this.c=0; this.pA=0; this.pB=0; }
  clone(){ const p=Object.assign(new PIC(), this); p.f=this.f.slice(); p.st=this.st.slice(); return p; }
  pinsA(sl){ return ((this.latA & ~this.trisA) | ((sl.sdo<<1) & this.trisA)) & 0x0F; }
  pinsB(sl){ const rerr = 0; return ((this.latB & ~this.trisB) | (rerr<<2 & this.trisB)) & 0xFF; }
  rd(a, sl){ a&=31; if (a===2) return this.pc&255; if (a===5) return this.pinsA(sl); if (a===6) return this.pinsB(sl); return this.f[a]; }
  wr(a, v, sl, rec){ a&=31; v&=255; if (a===5){ this.latA=v&15; this.pins(sl,rec); return; } if (a===6){ this.latB=v; this.pins(sl,rec); return; } if (a===2){ this.pc=(this.pc&0x100)|v; return; } this.f[a]=v; }
  pins(sl, rec){
    const a=(this.latA & ~this.trisA)&15, b=(this.latB & ~this.trisB)&255;
    if (rec){ const da=a^this.pA, db=b^this.pB;
      if (da&1) rec.tog[0].push(this.c); if (da&4) rec.tog[2].push(this.c); if (da&8) rec.tog[3].push(this.c);
      if (db) for (let k=0;k<8;k++) if (db&(1<<k)) rec.rb[k].push(this.c); }
    this.pA=a; this.pB=b; sl.onPins(a, b, this.c, rec);
  }
  setZ(v){ if ((v&255)===0) this.f[3]|=4; else this.f[3]&=~4; }
  step(sl, rec, log){
    const I=PROG.mem[this.pc]; let cy=1;
    if (!I){ this.pc=(this.pc+1)&0x1FF; this.c++; return; }
    let npc=(this.pc+1)&0x1FF;
    switch(I.op){
      case 0: case 1: break;                                   // nop, clrwdt
      case 2: { const v=this.rd(I.f,sl)&~(1<<I.b); this.wr(I.f,v,sl,rec); if (log&&(I.f===6||I.f===5)) log.push({c:this.c,k:'bit',I,v:0}); break; }
      case 3: { const v=this.rd(I.f,sl)|(1<<I.b); this.wr(I.f,v,sl,rec); if (log&&(I.f===6||I.f===5)) log.push({c:this.c,k:'bit',I,v:1}); break; }
      case 4: { const s=(this.rd(I.f,sl)>>I.b)&1; if (s){ npc=(npc+1)&0x1FF; cy=2; } if (log && I.f>6) log.push({c:this.c,k:'test',I,bit:s,skip:!!s}); break; }   // btfss
      case 5: { const s=(this.rd(I.f,sl)>>I.b)&1; if (!s){ npc=(npc+1)&0x1FF; cy=2; } if (log && I.f>6) log.push({c:this.c,k:'test',I,bit:s,skip:!s}); break; } // btfsc
      case 6: this.w=I.k&255; break;                           // movlw
      case 7: this.wr(I.f,this.w,sl,rec); break;               // movwf
      case 8: { const v=this.rd(I.f,sl); this.setZ(v); if (I.d) this.wr(I.f,v,sl,rec); else this.w=v; break; }
      case 9: this.wr(I.f,0,sl,rec); this.f[3]|=4; break;      // clrf
      case 10:{ const a=this.rd(I.f,sl), r=a-this.w; if (r>=0) this.f[3]|=1; else this.f[3]&=~1; this.setZ(r); if (I.d) this.wr(I.f,r&255,sl,rec); else this.w=r&255; if (log) log.push({c:this.c,k:'sub',I,a,w:(a-r)&255}); break; }
      case 11:{ const v=(this.rd(I.f,sl)-1)&255; if (I.d) this.wr(I.f,v,sl,rec); else this.w=v; if (!v){ npc=(npc+1)&0x1FF; cy=2; } break; }
      case 12: npc=I.k&0x1FF; cy=2; break;                     // goto (9-bit)
      case 13: this.st[1]=this.st[0]; this.st[0]=npc; npc=I.k&0xFF; cy=2; break;   // call: 8-bit target, bit 8 cleared
      case 14: npc=this.st[0]; this.st[0]=this.st[1]; this.w=0; cy=2; break;     // RETURN → RETLW 0 (V100.ERR warning 227)
      case 15: if (I.f===5) this.trisA=this.w&15; else if (I.f===6) this.trisB=this.w; this.pins(sl,rec); break;
    }
    this.pc=npc; this.c+=cy;
  }
}

/* ================================================================
   RUN ONE SECOND (cached): every instruction from power-on to t = 1 s
   ================================================================ */
let RUN=null, RUN_KEY='';
function runKey(){ return JSON.stringify([D.rear,D.len,D.vpp,D.plugged,D.loop,D.fs,D.crc,D.validity,D.parityErr,D.h1,D.eq,D.clock,evSorted()]); }
function advance(pic, sl, cEnd, rec, log, glitches){
  let gi=0; if (glitches) while (gi<glitches.length && glitches[gi].c<pic.c) gi++;
  while (pic.c < cEnd){
    if (glitches && gi<glitches.length && pic.c>=glitches[gi].c){ sl.clearRegs(pic.c,'glitch'); gi++; }
    const pc=pic.pc;
    if (rec && rec.passes){
      if (pc===L.main){ if (rec.cur) rec.cur.c1=pic.c; rec.cur={c:pic.c, snap:{pic:pic.clone(), sl:sl.clone()}, i:rec.passes.length}; rec.passes.push(rec.cur); }
      else if (rec.cur){ const p=rec.cur;
        if (pc===L.read8420) p.cRead=pic.c;
        else if (pc===L.refreshstatus){ p.cStat=pic.c; p.r16=sl.lastR16; p.r6=sl.lastR6; }
        else if (pc===L.refresh8420) p.cRef=pic.c;
        else if (pc===L.lock) p.path='lock'; else if (pc===L.no_lock) p.path='no_lock';
        else if (pc===L.confidence_on) p.conf=true; else if (pc===L.confidence_off) p.conf=false; }
      if (pc===L.init){ rec.inits.push(pic.c); if (rec.cur){ rec.cur.path='init'; rec.cur.c1=pic.c; rec.cur=null; } }
    }
    if (log && PROG.addrLab[pc]) log.push({c:pic.c, k:'lab', n:PROG.addrLab[pc]});
    pic.step(sl, rec, log);
  }
}
function run(){
  const key=runKey(); if (key===RUN_KEY) return RUN; RUN_KEY=key;
  const t0=performance.now();
  const hist=[]; const pic=new PIC(), sl=new CS8427(hist);
  const rec={ tog:[[],[],[],[]], rb:[[],[],[],[],[],[],[],[]], tx:[], passes:[], inits:[], cur:null };
  const cEnd=Math.ceil((SIM.duration - tBoot())/TCY());
  const glitches=evSorted().filter(e=>e.type==='glitch').map(e=>({c:Math.max(0,Math.round((e.t-tBoot())/TCY()))}));
  sl.live=true;
  advance(pic, sl, cEnd, rec, null, glitches);
  if (rec.cur) rec.cur.c1=pic.c;
  rec.passes.forEach(p=>{ if (p.r6===undefined) p.r6=null; });
  // pass statistics
  const full=rec.passes.filter(p=>p.c1 && p.path!=='init');
  const cyc=full.map(p=>p.c1-p.c);
  RUN = { ...rec, hist, glitches, cEnd, ms: performance.now()-t0,
    stat:{ min:Math.min(...cyc), max:Math.max(...cyc), avg: cyc.reduce((a,b)=>a+b,0)/Math.max(1,cyc.length), n:rec.passes.length,
      read: avgOf(full,'cRead','cStat'), status: avgOf(full,'cStat','cRef'), refresh: avgOf(full,'cRef','c1'), main: avgOf(full,'c','cRead') } };
  return RUN;
}
function avgOf(ps,a,b){ const v=ps.filter(p=>p[a]!=null&&p[b]!=null).map(p=>p[b]-p[a]); return v.length? v.reduce((x,y)=>x+y,0)/v.length : 0; }
const cyc2t = c=> tBoot()+c*TCY();
const t2cyc = t=> (t-tBoot())/TCY();
function bsearch(arr, c){ let lo=0, hi=arr.length; while(lo<hi){ const m=(lo+hi)>>1; if (arr[m]<=c) lo=m+1; else hi=m; } return lo; }   // # of toggles ≤ c
function levelAt(arr, c, init){ return (init ^ (bsearch(arr,c)&1)); }
function rbAt(k, t){ if (t<tBoot()) return 0; return levelAt(run().rb[k], t2cyc(t), 0); }
function lockedAt(t){ return lockedH(run().hist, t); }
function passAt(t){ const P=run().passes; if (!P.length || t<cyc2t(P[0].c)) return null; const c=t2cyc(t); let lo=0,hi=P.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (P[m].c<=c) lo=m; else hi=m-1; } return P[lo]; }
function stateAt(t){   // replay from the pass snapshot up to t: exact PC, W and file registers
  const R_=run(); if (t<tBoot()) return { boot:true };
  const p=passAt(t); const c=Math.floor(t2cyc(t));
  let pic, sl;
  if (p){ pic=p.snap.pic.clone(); sl=p.snap.sl.clone(); }
  else { pic=new PIC(); sl=new CS8427(R_.hist); }
  sl.live=false; advance(pic, sl, c, null, null, R_.glitches);
  return { pic, sl, pass:p };
}
function tracePass(p){   // replay one pass and return what the code did
  const R_=run(); const pic=p.snap.pic.clone(), sl=p.snap.sl.clone(); sl.live=false;
  const log=[]; const rec2={ tog:[[],[],[],[]], rb:[[],[],[],[],[],[],[],[]], tx:[] };
  const c1=p.c1 || (p.c+4000);
  advance(pic, sl, c1, rec2, log, R_.glitches);
  return { log, tx:rec2.tx, c0:p.c, c1, pic };
}

/* ================================================================
   ANALOG PATH (netlist d8202-ISS4.net + values from the ISS4/ISS5 BOM)
   CS4390 → U3/U5 (NE5532 differential MFB filters, gain −1 · −1) → H2/H5 range jumper (R50/R54/R56 into R53)
   → U16 (OP275, gain 1 + (R47 + RV)/R46) → R49 → L/R bus → U8…U14 balanced drivers (+6 dB, 2 × 30 Ω)
   Mono: U11B sums L and R through R62/R66 into R63 (7K5) = −(L+R)/2, U11A re-inverts (R67/R65).
   ================================================================ */
const dbu = v=> v>0? 20*Math.log10(v/0.7746) : -Infinity;
const fmtDbu = v=> isFinite(v)? (v>=0?'+':'')+v.toFixed(1)+' dBu' : '—';
function chan(side){ const hp=side? D.h5:D.h2, rv=side? D.rv2:D.rv1; const att=R.R53/(R.R53+H2POS[hp].r); const g=1+(R.R47+rv*R.RV)/R.R46; return {att, g, hp, rv}; }
const OUTS = [
  {id:'L1', name:'LEFT OUT 1',  amp:'U8',  p:'P1-10/9 (5/E)',  rp:['R44','R51'], src:()=>'L'},
  {id:'L2', name:'LEFT OUT 2',  amp:'U9',  p:'P1-8/7 (4/D)',   rp:['R52','R58'], src:()=>'L'},
  {id:'L3', name:'LEFT OUT 3 / MONO 1', amp:'U10', p:'P1-12/11 (6/F)', rp:['R59','R64'], src:()=> D.h3==='mono'?'M':'L'},
  {id:'R1', name:'RIGHT OUT 1', amp:'U13', p:'P1-16/15 (8/J)', rp:['R72','R75'], src:()=>'R'},
  {id:'R2', name:'RIGHT OUT 2', amp:'U14', p:'P1-18/17 (9/K)', rp:['R76','R81'], src:()=>'R'},
  {id:'R3', name:'RIGHT OUT 3 / MONO 2', amp:'U12', p:'P1-20/19 (10/L)', rp:['R68','R71'], src:()=> D.h4==='mono'?'M':'R'},
];
function levels(){
  const dac = C.DAC_FS*Math.pow(10, D.tone.db/20);
  const cl=chan(0), cr=chan(1);
  const busL=dac*cl.att*cl.g, busR=dac*cr.att*cr.g;
  const mono = D.tone.fL===D.tone.fR ? (busL+busR)/2 : Math.hypot(busL,busR)/2;
  const kl = D.load/(D.load+2*R.ROUT);
  const railRms = C.RAIL_PK/Math.SQRT2;
  const outs = OUTS.map(o=>{ const s=o.src(); const v= s==='L'?busL : s==='R'?busR : mono; const vb=2*v*kl; return {...o, s, vbus:v, vbal:vb, dbu:dbu(vb), clip: v>railRms}; });
  return { dac, cl, cr, busL, busR, mono, kl, outs, fsL:dbu(2*C.DAC_FS*cl.att*cl.g*kl), fsR:dbu(2*C.DAC_FS*cr.att*cr.g*kl) };
}
const audible = t => lockedAt(t) && rbAt(3,t)===1 && t>=tBoot();

/* ================================================================
   FIRMWARE TRACE TEXT (from an emulator replay of one pass)
   ================================================================ */
const REGN = {1:'Misc Ctrl 1',2:'Misc Ctrl 2',3:'Data Flow Ctrl',4:'Clock Flow Ctrl',5:'Serial In Format',6:'Serial Out Format',9:'Interrupt 1 Mask',16:'Receive Error',17:'Receive Error Mask'};
const R16B = ['par (parity)','biphase','conf','validity','UNLOCK','crc (CS CRC)','qcrc','—'];
function r16txt(v){ const s=[]; for (let b=6;b>=0;b--) if (v&(1<<b)) s.push(R16B[b]); return '0x'+hex2(v)+(s.length?' ('+s.join(', ')+')':' (no errors)'); }
const SHOWLAB = new Set(['MAIN','read8420','REFRESHSTATUS','lock','no_lock','next','check_confidence','confidence_on','confidence_off','refresh8420','RESET','INIT','powerupdelay']);
function fwLines(p){
  const T=tracePass(p); const ev=[];
  let seenPU=false;
  T.log.forEach(e=>{
    if (e.k==='lab'){ const n=e.n.find(x=>SHOWLAB.has(x)); if (!n) return; if (n==='powerupdelay'){ if (seenPU) return; seenPU=true; }
      ev.push({c:e.c, s:`<b>${e.n.join(' / ')}</b> <span class="muted">@0x${PROG.mem[PROG.lab[n.toLowerCase()]]? PROG.lab[n.toLowerCase()].toString(16).toUpperCase().padStart(3,'0'):''}</span>`}); }
    else if (e.k==='bit' && e.I.f===6){ ev.push({c:e.c, s:`${e.I.name} portb,${e.I.b} → ${RB_NAMES[e.I.b].split(' → ').slice(-1)[0].split(' ← ').slice(-1)[0]} = ${e.v}`}); }
    else if (e.k==='test' && /cs8420_16/i.test(e.I.arg) && e.I.b===4 && e.I.name==='btfsc'){ ev.push({c:e.c, s:`btfsc cs8420_16,4 → UNLOCK bit = ${e.bit} → ${e.bit?'goto no_lock':'goto lock'}`}); }
    else if (e.k==='sub'){ ev.push({c:e.c, s:`subwf cs8420_6,w: read-back 0x${hex2(e.a)} − cs8420reg6def 0x${hex2(e.w)} → ${e.a===e.w?'Z=1, CS8427 still configured':'Z=0 → <b style="color:var(--bad)">goto init</b> (chip lost its setup)'}`}); }
  });
  const wr=[];
  T.tx.forEach(x=>{
    if (x.rd!==undefined){ ev.push({c:x.c0, s:`SPI read: CS↓ 0x21 → reg ${x.rd} (${REGN[x.rd]||''}) = ${x.rd===16? r16txt(x.val) : '0x'+hex2(x.val)}`}); }
    else if (x.bytes.length===2){ ev.push({c:x.c0, s:`SPI: CS↓ 0x20 0x${hex2(x.bytes[1])} (set MAP = ${x.bytes[1]}) CS↑`}); }
    else if (x.bytes.length>=3){ wr.push(x); }
  });
  if (wr.length) ev.push({c:wr[0].c0, s:`SPI writes (wr8420reg ×${wr.length}): `+wr.map(x=>`${x.bytes[1]}←${hex2(x.bytes[2])}`).join(' · ')});
  ev.sort((a,b)=>a.c-b.c);
  const cy=(T.c1-T.c0);
  ev.push({c:T.c1, s:`goto main — this pass took ${cy.toLocaleString()} instruction cycles = ${SIM.fmtDur(cy*TCY())}`});
  return ev.map(e=>`<span class="muted">${SIM.fmtT(cyc2t(e.c)).replace(' s','')}</span> ${e.s}`);
}
function logAction(name, hw, pickPass){
  RUN_KEY=''; run();
  let fw=[]; const p = pickPass ? pickPass() : null;
  if (p) fw = fwLines(p);
  D.log.unshift({ name, t:SIM.t, hw, fw, pass: p? p.i : null });
  D.log.length = Math.min(D.log.length, 40);
  SIM.refresh();
}
const firstPass = (t, pred)=>{ const P=run().passes; return P.find(p=>cyc2t(p.c)>=t && p.c1 && (!pred||pred(p))) || P.find(p=>p.c1 && (!pred||pred(p))) || P[0]; };
function eyeTxt(){ const k=link(); return `eye opening ${(k.q*100).toFixed(0)} % of peak, ${k.veye.toFixed(2)} V at RXP → ${!k.fsOK?'sample rate outside 30–50 kHz':!k.lockOK?'cannot lock':k.err?'CONF + bi-phase/parity errors':k.conf?'CONF (marginal eye)':'clean'}`; }

/* ================================================================
   ACTIONS (each logs the hardware path and, where the PIC reacts, the real code path)
   ================================================================ */
const A = {
  plug(v){
    D.plugged = v===undefined? !D.plugged : v;
    logAction(D.plugged?'Connect the AES input':'Disconnect the AES input',
      [D.rear==='p75'? 'TB8205P/75 BNC → P1-2 (IN+) / P1-1 (IN−)' : 'TB8205P IN+ / IN− / SH → P1-2 (IN+) / P1-1 (IN−)',
       'C14 0.1 µF → T1 PE-65612 AES transformer → H1 termination ('+D.h1+') → R9 110R → U1A EL5263 (×2)',
       D.plugged? eyeTxt() : 'No transitions → the CS8427 PLL drops lock and latches UNLOCK (reg 16 bit 4)',
       'The PIC never sees the cable: it polls reg 16 over SPI once per pass (no interrupt; RERR on RB2 is not read)'],
      ()=> D.plugged ? firstPass(0, p=>p.path==='lock') : firstPass(Math.max(SIM.t,tBoot()+0.003), p=>p.path==='no_lock'));
  },
  eq(){
    D.eq=!D.eq; const k=link();
    logAction('EQ button (SW1) '+(D.eq?'in':'out'),
      ['SW1 PHA-2UEE latching push switch — pure hardware, the PIC does not know about it',
       D.eq? 'SW1-4 ↔ SW1-6: R6 330R + C7 1000p and R12 110R + C13 220p now shunt R5 750R at U1B (EL5263) input' : 'SW1 open: U1B gain is R3/(R11+R5) = 750/860 (flat)',
       `HF boost at the AES bit rate (${(64*D.fs/1e6).toFixed(3)} MHz): ${k.eqDb>=0?'+':''}${k.eqDb.toFixed(1)} dB · cable loss there ${k.lossDb.toFixed(1)} dB`,
       'EQ LED: +5V → R16 330R → EQ LED → SW1-5 → SW1-3 (GND) '+(D.eq?'lit':'dark'), eyeTxt()],
      ()=> firstPass(Math.max(SIM.t,tBoot())));
  },
  h1(v){ D.h1=v; const k=link(); logAction('INPUT TERMINATION jumper H1 → '+(v==='hiz'?'Hi Z':v+' Ω'),
      [`H1 pin 2 (T1 secondary) ${v==='110'?'↔ pin 1: R13 110R to GND':v==='75'?'↔ pin 3: R14 75R to GND':'parked: only R8 100K to GND'}`,
       `Cable ${k.Z0} Ω into ${k.zt>=1000?(k.zt/1000).toFixed(0)+' kΩ':k.zt.toFixed(0)+' Ω'}: reflection Γ = ${k.gam.toFixed(2)} → ${(1+k.gam).toFixed(2)} × the matched level`, eyeTxt()],
      ()=> firstPass(Math.max(SIM.t,tBoot()))); },
  range(side, v){ if (side) D.h5=v; else D.h2=v; const Lv=levels();
    logAction(`${side?'RIGHT (H5)':'LEFT (H2)'} level range jumper → ${v} dBFS`,
      [`${side?'H5':'H2'} pins ${H2POS[v].pins}: ${side? H2POS[v].res.replace('R50','R83').replace('R54','R85').replace('R56','R86') : H2POS[v].res} into ${side?'R84':'R53'} 10K → ${(20*Math.log10((side?Lv.cr:Lv.cl).att)).toFixed(2)} dB before ${side?'U16B':'U16A'}`,
       `0 dBFS now gives ${fmtDbu(side?Lv.fsR:Lv.fsL)} at the outputs (${D.load} Ω load)`, 'No firmware involved'], null); },
  trim(side, v){ v=Math.max(0,Math.min(1,v)); if (side) D.rv2=v; else D.rv1=v; const Lv=levels(); const c=side?Lv.cr:Lv.cl;
    const last=D.log[0]; const nm=`${side?'RIGHT (RV2)':'LEFT (RV1)'} level trim`;
    const hw=[`${side?'RV2':'RV1'} PT10H-20K at ${(v*100).toFixed(0)} % → ${side?'U16B':'U16A'} gain 1 + (15K + ${(v*20).toFixed(1)}K)/15K = ${c.g.toFixed(3)} (${(20*Math.log10(c.g)).toFixed(2)} dB)`,
      `${D.tone.db} dBFS tone → ${fmtDbu(Lv.outs[side?3:0].dbu)} on ${side?'RIGHT':'LEFT'} OUT 1 (${D.load} Ω load)`];
    if (last && last.name===nm){ last.hw=hw; last.t=SIM.t; SIM.refresh(); } else logAction(nm, hw, null); },
  mono(side, v){ if (side) D.h4=v; else D.h3=v;
    logAction(`${side?'H4 (RIGHT OUT 3)':'H3 (LEFT OUT 3)'} → ${v.toUpperCase()}`,
      [`${side?'H4':'H3'} pin 2 → ${side?'U12':'U10'} + input ← ${v==='mono'?'pin 3: U11A mono sum (L+R)/2':'pin 1: '+(side?'right':'left')+' bus'}`,
       v==='mono'? 'U11B: R62 15K (L) + R66 15K (R) into R63 7K5 → −(L+R)/2; U11A (R67/R65 15K) inverts back' : 'Third stereo output restored',
       'Both mono outputs are fed from the same U11 node, so both trims affect both mono outputs'], null); },
  rear(v){ D.rear=v; if (v==='p75') D.loop=false; logAction('Rear module → '+(v==='p75'?'TB8205P/75 (75 Ω BNC)':'TB8205P (110 Ω screw)'), [v==='p75'?'Unbalanced 75 Ω coax, AES-3id level 1 V p-p (inferred)':'Balanced 110 Ω pair, '+D.vpp+' V p-p', 'Set H1 to match the cable: '+(v==='p75'?'75':'110'), eyeTxt()], ()=>firstPass(Math.max(SIM.t,tBoot()))); },
  loop(){ if (D.rear!=='p') return; D.loop=!D.loop; const k=link(); logAction('Passive input loop '+(D.loop?'→ next card (terminated there)':'removed'),
      ['TB8205P IN and loop terminals are wired straight through (passive)', `Two terminations in parallel → ${k.zt.toFixed(0)} Ω; Γ = ${k.gam.toFixed(2)}`, 'Set H1 to Hi Z on every card but the last one', eyeTxt()], ()=>firstPass(Math.max(SIM.t,tBoot()))); },
  event(type, snap){
    let t=SIM.t;
    if (snap){ const p=firstPass(SIM.t); t=cyc2t(p.c)+3*TCY(); }
    D.events.push({t, type}); D.events.sort((a,b)=>a.t-b.t);
    const nm={unplug:'Cable pulled', plug:'Cable reconnected', glitch:'CS8427 loses its registers'}[type];
    logAction(`${nm} at ${SIM.fmtT(t)}`, [type==='glitch'? 'Models a brown-out/ESD reset of U2 only: all control registers return to 00 (RUN = 0)' : 'Input transitions '+(type==='unplug'?'stop':'resume'),
      type==='glitch'? 'The PIC only notices if reg 6 is read before REFRESH8420 rewrites it' : 'Lock follows after the PLL settles ('+SIM.fmtDur(C.LOCK_ACQ)+', inferred)'],
      ()=> type==='glitch'? (firstPass(t, p=>p.path==='init') || firstPass(t)) : firstPass(t, p=> type==='unplug'? p.path==='no_lock' : p.path==='lock'));
  },
  clearEvents(){ D.events=[]; logAction('Events cleared', ['Back to a steady input for the whole second'], null); },
  reset(){ const lg=D.log; D=DEF(); D.log=lg; logAction('Factory defaults', ['H1 110 Ω (shipping default per manual), H2/H5 24 dBFS, trims at 81.7 % so −20 dBFS → +4 dBu into a bridging load (inferred), H3/H4 stereo, EQ out'], null); },
};

/* ================================================================
   PANELS
   ================================================================ */
// positions on assets/d8202-board-top.png (1383 × 361 px; 130 px per inch from the Gerbers;
// SMT parts from D8202-ISS5.pnp: x = (0.645 + X/1000)·130, y = (2.56 − Y/1000)·130)
const PNP = (x,y)=>[(0.645+x/1000)*130, (2.56-y/1000)*130];
const PARTS = {
  U7:{xy:[520,232], w:118, h:48, t:'U7 PIC16C54RC/P (DIP18)', d:'The only processor. Runs v100.asm: polls the CS8427 over a bit-banged SPI port, drives the LEDs, the DAC mute and the two alarm transistors. RC oscillator: R41 4K7 + C46 27p on OSC1.'},
  U2:{xy:PNP(3620,1795), w:48, h:100, t:'U2 CS8427-CS (SOIC-28)', d:'AES3 receiver/transceiver. The schematic symbol is still called CS8420 and the code still says cs8420; the BOM fits a CS8427. Control port: CCLK pin 28, CDIN 27, CDOUT 1, CS 2. Feeds the DAC by I²S: RMCK pin 10, OSCLK 16, OLRCK 17, SDOUT 18.'},
  U4:{xy:PNP(4610,1086.5), w:42, h:44, t:'U4 CS4390-KS (SSOP-20)', d:'24-bit stereo DAC with differential outputs: pins 17/18 left, 13/14 right. Mute pins 15+16 on MUTEDAC (PIC RB3).'},
  U1:{xy:PNP(7600,2140), w:36, h:30, t:'U1 EL5263IS (netlist: EL2280C)', d:'Dual current-feedback amplifier. U1A ×2 input buffer, U1B inverting stage whose input network SW1 switches for cable EQ, then R7 110R → C10 → CS8427 RXP.'},
  T1:{xy:[1266,52], w:68, h:50, t:'T1 PE-65612 AES transformer', d:'Transformer-balanced input (manual). C14 0.1 µF in series with IN+ (P1-2).'},
  U3:{xy:PNP(5715,1536), w:36, h:30, t:'U3 NE5532 (left reconstruction filter)', d:'U3A: differential-to-single MFB low-pass (R22/R27 10K, R20 10K, R23/R28 3K3, C25/C33 1n, C26/C34 220p). U3B: second MFB stage. Each pole pair ≈ 59 kHz, Q ≈ 0.74; gain −1 × −1.'},
  U5:{xy:PNP(5715,741), w:36, h:30, t:'U5 NE5532 (right reconstruction filter)', d:'Same as U3 for the right channel (R30–R38, C37–C41, C45).'},
  U16:{xy:PNP(6685,880), w:36, h:36, t:'U16 OP275 (level stages)', d:'U16A left: + input from H2 divider, gain 1+(R47+RV1)/R46. U16B right: H5, R78/R79/RV2. Outputs → R49/R82 15K → L/R buses (C49/C72 27p).'},
  U11:{xy:PNP(7565,1025), w:36, h:30, t:'U11 OP275 (mono sum)', d:'U11B: −(L+R)/2 (R62, R66 15K into R63 7K5). U11A: unity inverter (R67, R65). Output to H3 pin 3 and H4 pin 3.'},
  OUTS:{xy:[1186,172], w:120, h:150, t:'U8, U9, U10, U12, U13, U14 OP275 (balanced drivers)', d:'Each: follower (+ leg) and unity inverter (− leg, 15K/15K) → 30R build-out per leg → 60 Ω balanced (manual). +6 dB from bus to balanced output.'},
  P1:{xy:[1362,180], w:40, h:320, t:'P1 EDAC 30-way card edge (0.156″)', d:'IN 1/A, OUT pairs 5/E 4/D 6/F (left) 8/J 9/K 10/L (right), NO-LOCK M (21), CONF 11 (22), V− P/13, GND R/14, V+ S/15.'},
  REG2:{xy:PNP(1085,1040), w:100, h:70, t:'REG2 LM2596 buck + REG1 79L05', d:'+20 V → F2 RXE-050 → D4 → +VA; R17 2R2 → LM2596 → L2 → L3 (+5V) and L1 (+5VA for the DAC). −20 V → F1 → D3 → −VA → 79L05 → −5 V for U1.'},
  U6:{xy:PNP(3840,1075), w:30, h:26, t:'U6 MC34164 under-voltage reset', d:'Holds the PIC\'s MCLR (pin 4) low until +5 V is up; R39 4K7 pull-up.'},
  Q:{xy:[492,305], w:44, h:24, t:'Q1, Q2 2N4401 alarm transistors', d:'Open collectors through R18/R87 10R to P1-21 (NO-LOCK) and P1-22 (CONF). Manual: 10 Ω, 60 mA, 30 V max.'},
};
function shunt(x1,y1,x2,y2){ const x=Math.min(x1,x2)-7, y=Math.min(y1,y2)-7, w=Math.abs(x2-x1)+14, h=Math.abs(y2-y1)+14; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#111" stroke="#000" opacity=".92"/><rect x="${x+2}" y="${y+2}" width="${w-4}" height="${Math.min(4,h-4)}" fill="#444"/>`; }
function ledSVG(x,y,on,col,lab){ return `<g><title>${lab}: ${on?'ON':'off'}</title><circle cx="${x}" cy="${y}" r="9" fill="${on?col:'#1b1f1b'}" opacity="${on?.35:0}"/><circle cx="${x}" cy="${y}" r="5.5" fill="${on?col:'#3a3f3a'}" stroke="#000" stroke-width=".8"/>${on?`<circle cx="${x-1.6}" cy="${y-1.6}" r="1.6" fill="#fff" opacity=".8"/>`:''}</g>`; }
function trimSVG(x,y,v,id,lab){ const a=(-135+270*v)*Math.PI/180; return `<g class="d82hot" data-act="${id}" style="cursor:ns-resize"><title>${lab} ${(v*100).toFixed(0)} % — click upper half to raise, lower half to lower; mouse wheel also works</title><rect x="${x-14}" y="${y-28}" width="28" height="56" fill="transparent" stroke="var(--accent)" stroke-dasharray="3 2" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="11" fill="#2a63c9" stroke="#0b2a66"/><line x1="${x}" y1="${y}" x2="${x+9*Math.sin(a)}" y2="${y-9*Math.cos(a)}" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>`; }
function ledsAt(t){ const on=t>=tBoot(); return { lock: on&&rbAt(6,t)===1, conf: on&&rbAt(5,t)===1, nolock: on&&rbAt(4,t)===1, eq: D.eq && t>C.T_SUPPLY, mute: !(on&&rbAt(3,t)===1), alNL: on&&rbAt(7,t)===1, alCF: on&&rbAt(0,t)===1 }; }
function boardSVG(t, opt){
  opt=opt||{}; const Ld=ledsAt(t);
  let s=`<svg viewBox="0 0 1383 361" style="width:100%;display:block;background:#0c2a17;border-radius:6px" role="img" aria-label="D8202 ISSUE 5 board, top side">
    <image href="${AS}d8202-board-top.png" x="0" y="0" width="1383" height="361"/>`;
  // LEDs (front edge, left) + EQ LED
  s+=ledSVG(51,265,Ld.lock,'#55ff55','SIGNAL (LOCK) LED, RB6')+ledSVG(51,281,Ld.conf,'#ffd23a','CONF LED, RB5')+ledSVG(51,297,Ld.nolock,'#ff3b30','ERROR (NO LOCK) LED, RB4')+ledSVG(152,102,Ld.eq,'#ffd23a','EQ LED (SW1, hardware)');
  // SW1
  s+=`<g class="d82hot" data-act="eq" style="cursor:pointer"><title>SW1 EQ push button (latching) — click</title><rect x="104" y="36" width="84" height="42" fill="${D.eq?'rgba(255,210,58,.25)':'transparent'}" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3"/><rect x="${D.eq?78:66}" y="47" width="${D.eq?28:40}" height="20" rx="3" fill="#ddd" stroke="#333"/><text x="146" y="92" font-size="11" fill="#fff" text-anchor="middle" font-weight="700">EQ ${D.eq?'IN':'OUT'}</text></g>`;
  // H1
  const h1y = D.h1==='75'?[40,53]: D.h1==='110'?[53,66]:[40,40];
  s+=`<g class="d82hot" data-act="h1" style="cursor:pointer"><title>H1 INPUT TERMINATION (110 / 75 / Hi Z) — click to change</title><rect x="1206" y="24" width="36" height="56" fill="transparent" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3"/>${shunt(1224,h1y[0],1224,h1y[1])}<text x="1180" y="94" font-size="11" font-weight="700" fill="#fff">H1: ${D.h1==='hiz'?'Hi Z':D.h1+' Ω'}</text></g>`;
  // H2 / H5
  const rowY={ '24':0, '18':14, '16':28 };
  [['h2',156,D.h2,'H2 LEFT range'],['h5',262,D.h5,'H5 RIGHT range']].forEach(([id,y0,v,lab])=>{ const y=y0+rowY[v];
    s+=`<g class="d82hot" data-act="${id}" style="cursor:pointer"><title>${lab}: 24 / 18 / 16 dBFS headroom — click to change</title><rect x="888" y="${y0-12}" width="42" height="52" fill="transparent" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3"/>${shunt(900,y,918,y)}<text x="${id==='h2'?862:862}" y="${y0+16}" font-size="10.5" font-weight="700" fill="#fff" text-anchor="end">${v}</text></g>`; });
  // H3 / H4
  const h3y = D.h3==='stereo'?[120,134]:[134,148], h4y = D.h4==='mono'?[233,247]:[247,261];
  s+=`<g class="d82hot" data-act="h3" style="cursor:pointer"><title>H3 LEFT OUT 3: STEREO / MONO — click</title><rect x="1058" y="108" width="28" height="52" fill="transparent" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3"/>${shunt(1072,h3y[0],1072,h3y[1])}</g>`;
  s+=`<g class="d82hot" data-act="h4" style="cursor:pointer"><title>H4 RIGHT OUT 3: MONO / STEREO — click</title><rect x="1058" y="221" width="28" height="52" fill="transparent" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3"/>${shunt(1072,h4y[0],1072,h4y[1])}</g>`;
  s+=trimSVG(995,180,D.rv1,'rv1','RV1 LEFT LEVEL')+trimSVG(995,262,D.rv2,'rv2','RV2 RIGHT LEVEL');
  // parts
  for (const k in PARTS){ const p=PARTS[k]; const sel=D.sel===k;
    s+=`<g class="d82hot" data-part="${k}" style="cursor:help"><title>${p.t}</title><rect x="${p.xy[0]-p.w/2}" y="${p.xy[1]-p.h/2}" width="${p.w}" height="${p.h}" fill="${sel?'rgba(90,169,230,.18)':'transparent'}" stroke="${sel?'#5aa9e6':'transparent'}" stroke-width="2"/></g>`; }
  // live activity on the SPI lines (PIC ↔ CS8427)
  const st = opt.state;
  if (st && st.pic){ const r=routineOf(st.pic.pc); const busy=/shift|wr8420|READ|REFRESH8420/i.test(r); s+=`<path d="M 520 208 C 540 170, 548 160, 552 150" fill="none" stroke="${busy?'#ffd23a':'transparent'}" stroke-width="3" stroke-dasharray="5 4"><title>SPI: RA0/RA2/RA3 → CS8427, CDOUT → RA1</title></path>`; }
  if (opt.mute!==false){ const on=!Ld.mute; s+=`<text x="683" y="232" font-size="10" text-anchor="middle" fill="${on?'#9f9':'#f88'}" font-weight="700">${t<tBoot()?'':on?'PLAY':'MUTE'}</text>`; }
  s+=`<text x="8" y="352" font-size="10" fill="#cfe">ISS5 · rendered from D8202-ISS5.TOP/TSM/SLK Gerbers · front edge ←</text><text x="1375" y="352" font-size="10" fill="#cfe" text-anchor="end">→ P1 to the rear module</text></svg>`;
  return s;
}
function frontSVG(t){
  const Ld=ledsAt(t); const Y=y=>14+y; // board y px → svg (130 px per inch vertically)
  let s=`<svg viewBox="0 0 250 392" style="width:100%;max-width:250px;display:block" role="img" aria-label="Front edge of the card">
   <rect x="20" y="14" width="74" height="361" rx="3" fill="#163f26" stroke="#0a2414"/>
   <rect x="54" y="14" width="6" height="361" fill="#0e2e1a"/>`;
  // EQ button (SW1 actuator pokes out of the front edge)
  s+=`<g class="d82hot" data-act="eq" style="cursor:pointer"><title>EQ button (SW1) — click</title><rect x="38" y="${Y(57)-11}" width="38" height="22" rx="4" fill="${D.eq?'#e9e6d8':'#a7a49a'}" stroke="#333"/><rect x="${D.eq?44:40}" y="${Y(57)-7}" width="${D.eq?26:34}" height="14" rx="3" fill="${D.eq?'#cfcab8':'#c9c6bb'}"/></g>`;
  s+=ledSVG(57,Y(102),Ld.eq,'#ffd23a','EQ LED');
  // handle over the three large holes (inferred)
  s+=`<rect x="28" y="${Y(112)}" width="58" height="100" rx="8" fill="#c9c9c2" stroke="#888"/><rect x="36" y="${Y(124)}" width="42" height="76" rx="6" fill="#b2b2aa"/><text x="57" y="${Y(162)}" font-size="11" text-anchor="middle" fill="#222" transform="rotate(90 57 ${Y(162)})" font-weight="700">D8202</text>`;
  s+=ledSVG(57,Y(265),Ld.lock,'#55ff55','SIGNAL / LOCK')+ledSVG(57,Y(281),Ld.conf,'#ffd23a','CONF')+ledSVG(57,Y(297),Ld.nolock,'#ff3b30','ERROR / NO LOCK');
  const lab=(y,txt,sub)=>`<line x1="70" y1="${y}" x2="104" y2="${y}" stroke="var(--ink2)" stroke-width=".6"/><text x="108" y="${y+4}" font-size="11" fill="var(--ink)">${txt}</text>${sub?`<text x="108" y="${y+16}" font-size="9.5" fill="var(--ink2)">${sub}</text>`:''}`;
  s+=lab(Y(57),'EQ button','SW1 latching')+lab(Y(102),'EQ (yellow)','BOM: YEL; manual: green')+lab(Y(160),'handle','over 3 Ø holes ('+'inferred)')+lab(Y(250),'SIGNAL (green)','= LOCK, RB6')+lab(Y(281),'CONF (yellow)','RB5')+lab(Y(312),'ERROR (red)','= NO LOCK, RB4');
  s+=`<text x="4" y="389" font-size="9.5" fill="var(--ink2)">Edge 1.00″ × 2.75″ (manual) · heights from the Gerbers</text></svg>`;
  return s;
}
// TB8205P / TB8205P/75 terminals on the CorelDRAW rear-module art (cell 390 × 485 = 150 px per inch).
// Artwork 2026|59: assets/d8202-rear-tb8205p(75).svg = vectors of "D8202 - rear module options.cdr" (2012-01-16) taken through
// Corel's own PDF export of it (libcdr turns the terminal-block glyphs into giant text); plate black, silk white.
const RMG_DIR='#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/';
const TERM_ROWS=[176.5,193,209,225.5,241.5,258,274.5,290.5,307];
const TERMS = (function(){ const a=[];
  const L=['L1+','L1-','L2+','L2-','L3+','L3-','GND','GND','GND'], Rr=['R1+','R1-','R2+','R2-','R3+','R3-','CONF','NOLOCK','GND'];
  TERM_ROWS.forEach((y,i)=>{ a.push({id:L[i], col:0, y}); a.push({id:Rr[i], col:1, y}); }); return a; })();
function rearSVG(t){
  const p75=D.rear==='p75', xs=p75?[145.5,204.5]:[148,207], Ld=ledsAt(t), Lv=levels(), aud=audible(t);
  let s=`<svg viewBox="0 0 390 485" style="width:100%;max-width:390px;display:block;background:#fbfaf6;border-radius:6px" role="img" aria-label="Rear module">
    <image href="${AS}d8202-rear-tb8205${p75?'p75':'p'}.svg" x="0" y="0" width="390" height="485"/>`;
  const sig = sigPresent(t);
  if (p75){
    s+=`<g class="d82hot" data-act="plug" style="cursor:pointer"><title>INPUT BNC — click to plug / unplug</title><circle cx="187.5" cy="105" r="26" fill="transparent" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>${D.plugged?`<rect x="176" y="62" width="23" height="30" rx="3" fill="#3a3a3a"/><path d="M 187.5 62 C 187.5 30, 150 30, 140 4" stroke="#222" stroke-width="7" fill="none"/>`:''}<circle cx="187.5" cy="105" r="4" fill="${sig?'#3fbf5f':'#999'}"/></g>`;
  } else {
    s+=`<g class="d82hot" data-act="plug" style="cursor:pointer"><title>IN + / IN − / SH — click to plug / unplug the AES pair</title><rect x="128" y="88" width="40" height="52" fill="transparent" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>${D.plugged?`<path d="M 132 98 L 60 98 M 132 114 L 60 114 M 132 130 L 60 130" stroke="#333" stroke-width="3"/><path d="M 60 98 L 60 130" stroke="#333" stroke-width="10" stroke-linecap="round"/>`:''}<circle cx="148" cy="114" r="3.5" fill="${sig?'#3fbf5f':'#999'}"/></g>`;
    s+=`<g class="d82hot" data-act="loop" style="cursor:pointer"><title>PASSIVE INPUT LOOP — click to loop through to another (terminated) card</title><rect x="183" y="88" width="38" height="52" fill="transparent" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="4 3"/>${D.loop?`<path d="M 218 98 L 270 70 M 218 114 L 270 86" stroke="#555" stroke-width="3"/><text x="272" y="66" font-size="10" fill="#333">to next card</text>`:''}</g>`;
  }
  TERMS.forEach(T=>{ const x=xs[T.col], y=T.y; let col='#999', tip=T.id;
    const o = Lv.outs.find(q=>T.id.startsWith(q.id));
    if (o){ col = aud? '#3fbf5f' : '#999'; tip=`${o.name} ${T.id.slice(-1)} — ${o.s==='M'?'mono (L+R)/2':o.s} · ${aud?fmtDbu(o.dbu)+' balanced':'muted'} · click to probe`; }
    else if (T.id==='CONF'){ col = Ld.alCF? '#ffb43a':'#999'; tip=`CONFIDENCE open collector (Q2): ${Ld.alCF?'ON (pulled to GND)':'off (open)'}`; }
    else if (T.id==='NOLOCK'){ col = Ld.alNL? '#ff3b30':'#999'; tip=`NO-LOCK open collector (Q1): ${Ld.alNL?'ON (pulled to GND)':'off (open)'}`; }
    else tip='GND';
    const sel = D.probe===T.id;
    s+=`<g class="d82hot" data-probe="${T.id}" style="cursor:pointer"><title>${tip}</title><rect x="${x-12}" y="${y-8}" width="24" height="16" fill="${sel?'rgba(31,122,77,.25)':'transparent'}" stroke="${sel?'var(--accent)':'transparent'}"/><circle cx="${x+15}" cy="${y}" r="3.2" fill="${col}"/></g>`;
  });
  s+=`</svg><div class="small muted" style="max-width:390px">CorelDRAW art: ${SIM.src(RMG_DIR+'D8202 - rear module options.cdr','D8202 - rear module options.cdr')} (2012|45), via its Corel PDF ${SIM.src(RMG_DIR+'D8202 - rear module options.pdf','export')}. Dots: green = audio, red/amber = alarm OC on.</div>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('[data-act]').forEach(g=>{
    const a=g.dataset.act;
    g.onclick=(e)=>{
      if (a==='eq') A.eq(); else if (a==='plug') A.plug(); else if (a==='loop') A.loop();
      else if (a==='h1') A.h1(D.h1==='110'?'75':D.h1==='75'?'hiz':'110');
      else if (a==='h2') A.range(0, D.h2==='24'?'18':D.h2==='18'?'16':'24');
      else if (a==='h5') A.range(1, D.h5==='24'?'18':D.h5==='18'?'16':'24');
      else if (a==='h3') A.mono(0, D.h3==='stereo'?'mono':'stereo');
      else if (a==='h4') A.mono(1, D.h4==='stereo'?'mono':'stereo');
      else if (a==='rv1'||a==='rv2'){ const r=g.getBoundingClientRect(); const up = (e.clientY - r.top) < r.height/2; const side=a==='rv2'?1:0; A.trim(side, (side?D.rv2:D.rv1) + (up?0.02:-0.02)); }
    };
    if (a==='rv1'||a==='rv2') g.onwheel=(e)=>{ e.preventDefault(); const side=a==='rv2'?1:0; A.trim(side, (side?D.rv2:D.rv1) + (e.deltaY<0?0.01:-0.01)); };
  });
  root.querySelectorAll('[data-part]').forEach(g=> g.onclick=()=>{ D.sel=g.dataset.part; SIM.refresh(); });
  root.querySelectorAll('[data-probe]').forEach(g=> g.onclick=()=>{ D.probe=g.dataset.probe; SIM.refresh(); });
}

/* ================================================================
   TIMELINE LANES
   ================================================================ */
const css = n=>SIM.css(n);
function cRange(t0,t1){ return [Math.max(0,t2cyc(t0)), t2cyc(t1)]; }
function drawDig(c, X, t0, t1, y, h, arr, init, col, opt){
  opt=opt||{}; const tb=tBoot(); const yH=y+5, yL=y+h-5;
  if (t1<=tb){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('PIC in reset (pins Hi-Z)', X(t0)+4, y+h/2+4); return; }
  const [c0,c1]=cRange(t0,t1); let i=bsearch(arr,c0); const iEnd=bsearch(arr,c1); const n=iEnd-i; const pw=X(t1)-X(Math.max(t0,tb));
  if (t0<tb){ c.strokeStyle=css('--grid'); c.setLineDash([3,3]); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(tb),y+h/2); c.stroke(); c.setLineDash([]); }
  if (n > pw/2.5){ c.fillStyle=col; c.globalAlpha=.3; c.fillRect(X(Math.max(t0,tb)), yH, pw, yL-yH); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10.5px '+css('--mono'); c.fillText(`${n.toLocaleString()} edges — zoom in`, X(Math.max(t0,tb))+6, y+h/2+4); return; }
  let lev=init^(i&1); c.strokeStyle=col; c.lineWidth=1.4; c.beginPath(); let x=X(Math.max(t0,tb)); c.moveTo(x, lev?yH:yL);
  for (; i<iEnd; i++){ const xx=X(cyc2t(arr[i])); c.lineTo(xx, lev?yH:yL); lev^=1; c.lineTo(xx, lev?yH:yL); }
  c.lineTo(X(t1), lev?yH:yL); c.stroke(); c.lineWidth=1;
}
function drawFill(c, X, t0, t1, y, h, arr, col, lab){
  const tb=tBoot(); if (t1<=tb) return; const [c0,c1]=cRange(t0,t1); let i=bsearch(arr,c0); let lev=i&1; let xs=X(Math.max(t0,tb));
  c.fillStyle=col;
  const seg=(xa,xb)=>{ if (xb>xa) c.fillRect(xa, y+5, Math.max(1,xb-xa), h-10); };
  for (; i<arr.length && arr[i]<=c1; i++){ const xx=X(cyc2t(arr[i])); if (lev) seg(xs,xx); lev^=1; xs=xx; }
  if (lev) seg(xs, X(t1));
  if (lab){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; }
}
function passIdx(c){ const P=run().passes; let lo=0,hi=P.length; while(lo<hi){ const m=(lo+hi)>>1; if (P[m].c<c) lo=m+1; else hi=m; } return lo; }
function lanes(){
  const R_=run(), k=link(), Lv=levels(); const ls=[];
  const ink=css('--ink'), ink2=css('--ink2'), acc=css('--accent'), a2=css('--accent2'), warn=css('--warn'), bad=css('--bad'), grid=css('--grid');
  const txt=(c,s,x,y,col)=>{ c.fillStyle=col||ink; c.font='10.5px '+css('--mono'); c.fillText(s,x,y); };
  ls.push({label:`AES input (${D.rear==='p75'?'75 Ω coax':'110 Ω pair'}, ${D.len} m)`, h:24, draw(c,X,t0,t1,y,h,pw){
    const N=Math.min(400,Math.ceil(pw)); for (let i=0;i<N;i++){ const ta=t0+(t1-t0)*i/N, tb_=t0+(t1-t0)*(i+1)/N; const on=sigPresent((ta+tb_)/2); c.fillStyle= on? (k.lockOK? (k.conf?warn:acc) : bad) : grid; c.globalAlpha=on?.55:.6; c.fillRect(X(ta),y+6,X(tb_)-X(ta)+.5,h-12); }
    c.globalAlpha=1; D.events.forEach(e=>{ if (e.t<t0||e.t>t1) return; const x=X(e.t); c.fillStyle=e.type==='glitch'?warn:e.type==='unplug'?bad:acc; c.beginPath(); c.moveTo(x-5,y+2); c.lineTo(x+5,y+2); c.lineTo(x,y+10); c.fill(); txt(c, e.type, x+6, y+11, ink2); });
    txt(c, `${(D.fs/1000).toFixed(1)} kHz · eye ${(k.q*100).toFixed(0)} %`, X(t0)+6, y+h/2+4); }});
  ls.push({label:'AES3 blocks (192 frames, Z)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,192/D.fs,0,1/D.fs,warn,'blocks'); }});
  ls.push({label:'AES3 frames (1 sample/ch)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/D.fs,0,0.5/D.fs,a2,'frames'); }});
  ls.push({label:'CS8427 PLL / lock', h:24, draw(c,X,t0,t1,y,h,pw){
    const N=Math.min(500,Math.ceil(pw)); let last=null, xs=X(t0);
    const st=t=>{ if (t<C.T_SUPPLY) return 0; const rs=runAt(R_.hist,t); if (rs===null) return 1; if (lockedAt(t)) return 3; return sigPresent(t)&&k.lockOK? 2 : 4; };
    const col=[grid, ink2, warn, acc, bad], lab=['no power','RST / RUN = 0','acquiring','LOCKED','no lock'];
    for (let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const s=i<N? st(t):-1; if (s!==last){ if (last!==null){ const x=X(t); c.fillStyle=col[last]; c.globalAlpha=.6; c.fillRect(xs,y+5,x-xs,h-10); c.globalAlpha=1; if (x-xs>60) txt(c, lab[last], xs+4, y+h/2+4); } last=s; xs=X(t); } } }});
  ls.push({label:'PIC16C54 main loop', h:28, draw(c,X,t0,t1,y,h,pw){
    const tb=tBoot();
    if (t0<tb){ const segs=[[0,C.T_SUPPLY,'+5 V rising'],[C.T_SUPPLY,tb,'MC34164 + 18 ms DRT']]; segs.forEach(([a,b,l])=>{ if (b<t0||a>t1) return; c.fillStyle=grid; c.fillRect(X(Math.max(a,t0)),y+4,X(Math.min(b,t1))-X(Math.max(a,t0)),h-8); if (X(Math.min(b,t1))-X(Math.max(a,t0))>80) txt(c,l,X(Math.max(a,t0))+4,y+h/2+4,ink2); }); }
    R_.inits.forEach(ci=>{ const a=cyc2t(ci); const nx=R_.passes[passIdx(ci)]; const b=nx? cyc2t(nx.c) : a+0.003; if (b<t0||a>t1) return; c.fillStyle=warn; c.globalAlpha=.55; c.fillRect(X(Math.max(a,t0)),y+4,Math.max(2,X(Math.min(b,t1))-X(Math.max(a,t0))),h-8); c.globalAlpha=1; if (X(b)-X(a)>40) txt(c,'INIT',X(Math.max(a,t0))+3,y+h/2+4); });
    const P=R_.passes; const i0=Math.max(0,passIdx(t2cyc(t0))-1), i1=passIdx(t2cyc(t1)); const n=i1-i0;
    if (n > pw/5){ c.fillStyle=acc; c.globalAlpha=.3; c.fillRect(X(Math.max(t0,tb)),y+4,X(t1)-X(Math.max(t0,tb)),h-8); c.globalAlpha=1; txt(c, `${n} passes of MAIN · ${R_.stat.avg.toFixed(0)} cycles ≈ ${SIM.fmtDur(R_.stat.avg*TCY())} each`, X(Math.max(t0,tb))+6, y+h/2+4); return; }
    for (let i=i0;i<i1 && i<P.length;i++){ const p=P[i]; const a=cyc2t(p.c), b=cyc2t(p.c1||p.c+1838); const col=p.path==='lock'?acc:p.path==='no_lock'?bad:warn; c.fillStyle=col; c.globalAlpha= i%2? .35:.55; c.fillRect(X(a),y+4,X(b)-X(a)-1,h-8); c.globalAlpha=1; if (X(b)-X(a)>46) txt(c, `#${i} ${p.path==='lock'?'lock':p.path==='no_lock'?'no_lock':'→INIT'}`, X(a)+3, y+h/2+4); } }});
  ls.push({label:'  READ · STATUS · REFRESH8420', h:22, draw(c,X,t0,t1,y,h,pw){
    const P=R_.passes; const i0=Math.max(0,passIdx(t2cyc(t0))-1), i1=passIdx(t2cyc(t1));
    if (i1-i0 > pw/24){ txt(c,'zoom in to ~20 ms to see the three calls of each pass', X(t0)+6, y+h/2+4, ink2); return; }
    for (let i=i0;i<i1 && i<P.length;i++){ const p=P[i]; const segs=[[p.c,p.cRead,ink2,'MAIN'],[p.cRead,p.cStat,a2,'READ8420'],[p.cStat,p.cRef,warn,'REFRESHSTATUS'],[p.cRef,p.c1,acc,'REFRESH8420']];
      segs.forEach(([a,b,col,l])=>{ if (a==null||b==null) return; const xa=X(cyc2t(a)), xb=X(cyc2t(b)); c.fillStyle=col; c.globalAlpha=.5; c.fillRect(xa,y+4,Math.max(1,xb-xa-.5),h-8); c.globalAlpha=1; if (xb-xa>c.measureText(l).width+8) txt(c,l,xa+3,y+h/2+4); }); } }});
  ls.push({label:'SPI CS  (RA0 → U2-2)', h:20, draw(c,X,t0,t1,y,h){ drawDig(c,X,t0,t1,y,h,R_.tog[0],0,ink); }});
  ls.push({label:'SPI CCLK (RA2 → U2-28)', h:20, draw(c,X,t0,t1,y,h){ drawDig(c,X,t0,t1,y,h,R_.tog[2],0,a2); }});
  ls.push({label:'SPI CDIN (RA3 → U2-27)', h:20, draw(c,X,t0,t1,y,h){ drawDig(c,X,t0,t1,y,h,R_.tog[3],0,acc); }});
  ls.push({label:'SPI CDOUT (U2-1 → RA1)', h:20, draw(c,X,t0,t1,y,h){ drawDig(c,X,t0,t1,y,h,R_.tog[1],0,warn); }});
  ls.push({label:'SPI bytes (decoded)', h:22, draw(c,X,t0,t1,y,h,pw){
    const T=R_.tx; let lo=0,hi=T.length; const c0=t2cyc(t0), c1=t2cyc(t1); while(lo<hi){ const m=(lo+hi)>>1; if (T[m].c1<c0) lo=m+1; else hi=m; }
    let n=0; for (let i=lo;i<T.length && T[i].c0<=c1;i++) n++;
    if (n > pw/10){ txt(c, `${n.toLocaleString()} SPI transactions — zoom in`, X(t0)+6, y+h/2+4, ink2); return; }
    for (let i=lo;i<T.length && T[i].c0<=c1;i++){ const x=T[i]; const xa=X(cyc2t(x.c0)), xb=X(cyc2t(x.c1)); const rd=x.rd!==undefined; c.fillStyle= rd? warn : x.bytes.length===2? ink2 : acc; c.globalAlpha=.25; c.fillRect(xa,y+3,xb-xa,h-6); c.globalAlpha=1; c.strokeStyle=c.fillStyle; c.strokeRect(xa,y+3,xb-xa,h-6);
      const l = rd? `R${x.rd}=${hex2(x.val)}` : x.bytes.length===2? `map ${x.bytes[1]}` : `W${x.bytes[1]}←${hex2(x.bytes[2])}`; if (xb-xa > l.length*6.2+4) txt(c,l,xa+2,y+h/2+4); } }});
  ls.push({label:'reg 16 read (rx errors)', h:22, draw(c,X,t0,t1,y,h,pw){
    const P=R_.passes; const i0=Math.max(0,passIdx(t2cyc(t0))-1), i1=passIdx(t2cyc(t1));
    if (i1-i0 > pw/26){ let nu=0,nc=0; for (let i=i0;i<i1&&i<P.length;i++){ if (P[i].r16&0x10) nu++; else if (P[i].r16&0x27) nc++; } txt(c, `${i1-i0} reads: ${nu} UNLOCK, ${nc} with conf/crc/bip/par bits`, X(t0)+6, y+h/2+4, ink2); return; }
    for (let i=i0;i<i1&&i<P.length;i++){ const p=P[i]; if (p.cStat==null) continue; const x=X(cyc2t(p.cStat)); const v=p.r16||0; txt(c, hex2(v), x-6, y+h/2+4, v&0x10?bad: v&0x27?warn:ink2); } }});
  ls.push({label:'LED SIGNAL/LOCK (RB6)', h:18, draw(c,X,t0,t1,y,h){ drawFill(c,X,t0,t1,y,h,R_.rb[6],'#3fbf5f'); }});
  ls.push({label:'LED CONF (RB5)', h:18, draw(c,X,t0,t1,y,h){ drawFill(c,X,t0,t1,y,h,R_.rb[5],'#e8b23a'); }});
  ls.push({label:'LED ERROR/NO LOCK (RB4)', h:18, draw(c,X,t0,t1,y,h){ drawFill(c,X,t0,t1,y,h,R_.rb[4],'#e3453a'); }});
  ls.push({label:'LED EQ (SW1, no firmware)', h:18, draw(c,X,t0,t1,y,h){ if (D.eq){ c.fillStyle='#e8b23a'; const a=Math.max(t0,C.T_SUPPLY); if (a<t1) c.fillRect(X(a),y+5,X(t1)-X(a),h-10); } }});
  ls.push({label:'MUTEDAC (RB3, 1 = play)', h:18, draw(c,X,t0,t1,y,h){ drawDig(c,X,t0,t1,y,h,R_.rb[3],0,ink); }});
  ls.push({label:'Alarm OC: NO-LOCK (RB7→Q1)', h:18, draw(c,X,t0,t1,y,h){ drawFill(c,X,t0,t1,y,h,R_.rb[7],bad); }});
  ls.push({label:'Alarm OC: CONF (RB0→Q2)', h:18, draw(c,X,t0,t1,y,h){ drawFill(c,X,t0,t1,y,h,R_.rb[0],warn); }});
  const amp = Math.max(Lv.busL, Lv.busR, Lv.mono, 1e-6)*Math.SQRT2;
  const wave=(side)=>(c,X,t0,t1,y,h,pw)=>{
    const f= side===0?D.tone.fL : side===1? D.tone.fR : 0; const bus = side===0?Lv.busL: side===1?Lv.busR: Lv.mono; const mid=y+h/2, A_=bus*Math.SQRT2/amp*(h/2-3);
    const cyclesPerPx = (side===2? Math.max(D.tone.fL,D.tone.fR): f)*(t1-t0)/pw; c.strokeStyle= side===0?acc: side===1?a2:warn; c.fillStyle=c.strokeStyle;
    const N=Math.ceil(pw);
    if (cyclesPerPx>0.25){ c.globalAlpha=.45; for (let i=0;i<N;i++){ const t=t0+(t1-t0)*(i+.5)/N; if (audible(t)) c.fillRect(X(t0)+i, mid-A_, 1, 2*A_); } c.globalAlpha=1; }
    else { c.beginPath(); for (let i=0;i<=N*2;i++){ const t=t0+(t1-t0)*i/(N*2); const g=audible(t)?1:0; const v= side===2? (D.tone.fL===D.tone.fR? Math.sin(2*Math.PI*D.tone.fL*t) : (Lv.busL*Math.sin(2*Math.PI*D.tone.fL*t)+Lv.busR*Math.sin(2*Math.PI*D.tone.fR*t))/(Lv.busL+Lv.busR)) : Math.sin(2*Math.PI*f*t); const yy=mid - g*A_*v; i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); }
    c.strokeStyle=grid; c.beginPath(); c.moveTo(X(t0),mid); c.lineTo(X(t1),mid); c.stroke(); };
  ls.push({label:`L bus → LEFT OUT 1 (${fmtDbu(Lv.outs[0].dbu)})`, h:34, draw:wave(0)});
  ls.push({label:`R bus → RIGHT OUT 1 (${fmtDbu(Lv.outs[3].dbu)})`, h:34, draw:wave(1)});
  if (D.h3==='mono'||D.h4==='mono') ls.push({label:`U11 mono (L+R)/2 (${fmtDbu(dbu(2*Lv.mono*Lv.kl))})`, h:30, draw:wave(2)});
  return ls;
}

/* ================================================================
   SCOPE: the AES frame at the playhead, clean and as the CS8427 sees it; eye diagram
   ================================================================ */
let SC_KEY='', SC=null;
function scopeAt(t){
  const n=Math.floor(t*D.fs); const key=[n,LINK_KEY].join('|'); if (key===SC_KEY) return SC; SC_KEY=key;
  const Lv=levels(); const frames=[];
  for (let k=0;k<8;k++){ const nn=n+k, tt=nn/D.fs, fr=nn%192, on=audible(tt);
    frames.push([0,1].map(s=>{ const f=s?D.tone.fR:D.tone.fL; const v= sigPresent(tt)? Math.pow(10,D.tone.db/20)*Math.sin(2*Math.PI*f*tt) : 0; let x=Math.round(v*8388607); if (x<0) x+=1<<24; return {pre: s?'Y':(fr===0?'Z':'X'), bits: subBits(x, fr, s, D), v, x}; })); }
  const lv=biphaseFrames(frames); const w=channel(lv);
  SC={ n, frames, lv, w, fr:n%192 }; return SC;
}
function drawScope(cv, el, t){
  const {c,w,h}=SIM.canvas(cv, 190); const S=scopeAt(t), k=link();
  const ink=css('--ink'), ink2=css('--ink2'), acc=css('--accent'), a2=css('--accent2'), warn=css('--warn'), bad=css('--bad');
  const cells=128, x0=10, cw=(w-20)/cells; // one frame = 128 half-cells
  const zones=[[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio (20 MSBs)'],[56,64,a2,'V U C P']];
  [0,64].forEach(off=>zones.forEach(([a,b,col,l])=>{ c.fillStyle=col; c.globalAlpha=.10; c.fillRect(x0+(off+a)*cw,16,(b-a)*cw,150); c.globalAlpha=1; c.fillStyle=ink2; c.font='9.5px sans-serif'; if ((b-a)*cw>34) c.fillText(l, x0+(off+a)*cw+2, 178); }));
  // clean
  c.strokeStyle=ink; c.lineWidth=1.3; c.beginPath(); for (let i=0;i<cells;i++){ const yy=S.lv[i]? 22:58; const x=x0+i*cw; i?c.lineTo(x,yy):c.moveTo(x,yy); c.lineTo(x+cw,yy); } c.stroke();
  // received (scaled to its own peak, centred)
  if (sigPresent(t)){
    let pk=0; for (let i=0;i<cells*OS;i++) pk=Math.max(pk,Math.abs(S.w[i])); const sc=34/(pk||1);
    c.strokeStyle= k.lockOK? (k.conf?warn:acc) : bad; c.lineWidth=1.4; c.beginPath(); for (let i=0;i<cells*OS;i++){ const x=x0+i*cw/OS, yy=118 - S.w[i]*sc; i?c.lineTo(x,yy):c.moveTo(x,yy); } c.stroke();
    c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(x0,118); c.lineTo(w-10,118); c.stroke();
  } else { c.fillStyle=bad; c.font='12px sans-serif'; c.fillText('no input: RXP sits at 0 V', x0+8, 120); }
  c.lineWidth=1; c.fillStyle=ink; c.font='11px '+css('--mono');
  c.fillText(`Frame ${S.n.toLocaleString()} (frame ${S.fr}/191 of its block) — at the rear terminals (top) and at CS8427 RXP (bottom, scaled)`, x0, 11);
  const F=S.frames[0];
  el.innerHTML = F.map((s,i)=>`${i?'B (right)':'A (left)'} preamble ${s.pre} · sample ${s.v.toFixed(5)} → 24-bit 0x${s.x.toString(16).toUpperCase().padStart(6,'0')} · V=${s.bits[28]} U=${s.bits[29]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>')+
    `<br><span class="muted">One half-cell = ${SIM.fmtDur(1/(128*D.fs))}; one frame = ${SIM.fmtDur(1/D.fs)}. Channel-status byte 0 is the AES3 professional layout (${inf}: the archive does not say what the source sends). Cable model ${inf}: skin-effect loss calibrated to the manual's 250 m (no EQ) / 600 m (EQ) / 1500 m coax figures.</span>`;
}
function drawEye(cv, el){
  const {c,w,h}=SIM.canvas(cv, 190); const k=link(); const N=k.N, win=2*OS, lv=k.lv;
  const ink2=css('--ink2'), col= k.lockOK? (k.conf?css('--warn'):css('--accent')) : css('--bad');
  let pk=0; for (let i=0;i<N;i++) pk=Math.max(pk,Math.abs(k.wave[i])); const sc=(h/2-22)/(pk||1), mid=h/2;
  c.strokeStyle=col; c.globalAlpha=.10; c.lineWidth=1;
  const off=(k.ph+OS/2)%OS;   // put the decision point in the middle of the window
  for (let s=off; s+win*1.5<N; s+=OS){ c.beginPath(); for (let j=0;j<=win*1.5;j++){ const x=10+j*(w-20)/(win*1.5), y=mid - k.wave[(s+j)%N]*sc; j?c.lineTo(x,y):c.moveTo(x,y); } c.stroke(); }
  c.globalAlpha=1; const xd=10+(OS/2+OS*0)*(w-20)/(win*1.5)+ (w-20)/(win*1.5)*OS/2; const eh=Math.max(0,k.q*pk*sc);
  c.strokeStyle=css('--ink'); c.setLineDash([4,3]); c.strokeRect(xd-10, mid-eh, 20, 2*eh); c.setLineDash([]);
  c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`eye ${(k.q*100).toFixed(0)} % of peak · ${k.veye.toFixed(2)} V at RXP`, 10, 14);
  c.fillStyle=ink2; c.fillText(`CONF below ${C.Q_CONF*100} %, lock lost below ${C.Q_LOCK*100} % (${'inferred'})`, 10, h-6);
  el.innerHTML = `<table class="kv"><tr><th>Cable</th><td>${D.rear==='p75'?'75 Ω coax':'110 Ω twisted pair'}, ${D.len} m: ${k.lossDb.toFixed(1)} dB at ${(64*D.fs/1e6).toFixed(2)} MHz ${inf}</td></tr>
    <tr><th>Termination</th><td>H1 = ${D.h1==='hiz'?'Hi Z (R8 100K)':D.h1+' Ω'}${D.loop?' ‖ 110 Ω further down the loop':''} on a ${k.Z0} Ω line: Γ = ${k.gam.toFixed(2)} → ${(1+k.gam).toFixed(2)} × level</td></tr>
    <tr><th>U1 EQ (SW1)</th><td>${D.eq?'IN':'OUT'}: ${k.eqDb>=0?'+':''}${k.eqDb.toFixed(1)} dB at the bit rate vs. flat (real R/C values)</td></tr>
    <tr><th>Receiver</th><td>${!k.fsOK?'<b style="color:var(--bad)">'+D.fs/1000+' kHz is outside the manual\'s 30–50 kHz</b>':!k.lockOK?'<b style="color:var(--bad)">cannot lock</b>':k.err?'<b style="color:var(--warn)">locks, CONF + bi-phase/parity errors</b>':k.conf?'<b style="color:var(--warn)">locks, CONF set</b>':'clean lock'}</td></tr></table>`;
}

/* ================================================================
   SIMULATOR VIEW
   ================================================================ */
function controlsHTML(){
  const opt=(v,cur,l)=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
   <label>Rear module <select data-c="rear">${opt('p',D.rear,'TB8205P · 110 Ω pair')}${opt('p75',D.rear,'TB8205P/75 · 75 Ω BNC')}</select></label>
   <label>Cable <input data-c="len" type="range" min="0" max="2000" step="10" value="${D.len}" style="width:130px"> <span class="mono">${D.len} m</span></label>
   ${D.rear==='p'?`<label>Source <input data-c="vpp" type="range" min="0.2" max="7" step="0.1" value="${D.vpp}" style="width:90px"> <span class="mono">${D.vpp.toFixed(1)} V p-p</span></label>`:'<span class="muted">Source 1.0 V p-p (AES-3id, '+'inferred)</span>'}
   <label>fs <select data-c="fs">${FS_LIST.map(f=>opt(f,D.fs,(f/1000)+' kHz')).join('')}</select></label>
   <label>Tone <input data-c="db" type="number" min="-60" max="0" step="1" value="${D.tone.db}" style="width:60px"> dBFS</label>
   <label>L <select data-c="fL">${[400,1000,3000,10000].map(f=>opt(f,D.tone.fL,f>=1000?f/1000+' kHz':f+' Hz')).join('')}</select></label>
   <label>R <select data-c="fR">${[400,1000,3000,10000].map(f=>opt(f,D.tone.fR,f>=1000?f/1000+' kHz':f+' Hz')).join('')}</select></label>
   <label>Load <select data-c="load">${opt(600,D.load,'600 Ω')}${opt(10000,D.load,'10 kΩ')}</select></label>
   <label><input data-c="crc" type="checkbox" ${D.crc?'checked':''}> source sends CS CRC</label>
   <label><input data-c="validity" type="checkbox" ${D.validity?'checked':''}> V bit set</label>
   <label><input data-c="parityErr" type="checkbox" ${D.parityErr?'checked':''}> bad parity</label>
   <label>PIC clock <select data-c="clock">${opt('pjt',D.clock,'4.000 MHz (da301.pjt)')}${opt('rc',D.clock,'≈3.3 MHz RC (inferred)')}</select></label>
  </div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 8px;margin-top:6px;align-items:center">
   <label>H1 <select data-c="h1">${opt('110',D.h1,'110 Ω')}${opt('75',D.h1,'75 Ω')}${opt('hiz',D.h1,'Hi Z')}</select></label>
   <label>H2 <select data-c="h2">${['24','18','16'].map(v=>opt(v,D.h2,v+' dBFS')).join('')}</select></label>
   <label>RV1 <input data-c="rv1" type="range" min="0" max="1" step="0.005" value="${D.rv1}" style="width:80px"></label>
   <label>H5 <select data-c="h5">${['24','18','16'].map(v=>opt(v,D.h5,v+' dBFS')).join('')}</select></label>
   <label>RV2 <input data-c="rv2" type="range" min="0" max="1" step="0.005" value="${D.rv2}" style="width:80px"></label>
   <label>H3 <select data-c="h3">${opt('stereo',D.h3,'stereo')}${opt('mono',D.h3,'mono')}</select></label>
   <label>H4 <select data-c="h4">${opt('stereo',D.h4,'stereo')}${opt('mono',D.h4,'mono')}</select></label>
   <button data-b="eq" class="${D.eq?'on':''}">EQ (E)</button>
   <button data-b="plug" class="${D.plugged?'on':''}">${D.plugged?'Input connected (P)':'Input disconnected (P)'}</button>
  </div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
   <button data-b="ev-unplug">Pull cable at playhead</button><button data-b="ev-plug">Reconnect at playhead</button>
   <button data-b="ev-glitch">CS8427 reset at playhead</button><button data-b="ev-glitch-snap" title="Places the reset just after the next MAIN, inside the window the reg 6 self-check can see">…just before the next reg 6 read</button>
   <button data-b="clr">Clear events</button><button data-b="rst">Factory defaults</button>
  </div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-c]').forEach(e=>{
    const k=e.dataset.c; const ev = e.type==='range'? 'change' : 'change';
    if (e.type==='range') e.oninput=()=>{ const s=e.nextElementSibling; if (s && s.classList.contains('mono')) s.textContent = k==='len'? e.value+' m' : (+e.value).toFixed(1)+' V p-p'; };
    e.addEventListener(ev, ()=>{
      const v = e.type==='checkbox'? e.checked : e.value;
      if (k==='rear') return A.rear(v);
      if (k==='h1') return A.h1(v);
      if (k==='h2') return A.range(0,v); if (k==='h5') return A.range(1,v);
      if (k==='h3') return A.mono(0,v); if (k==='h4') return A.mono(1,v);
      if (k==='rv1') return A.trim(0,+v); if (k==='rv2') return A.trim(1,+v);
      if (k==='db') D.tone.db=Math.max(-60,Math.min(0,+v)); else if (k==='fL') D.tone.fL=+v; else if (k==='fR') D.tone.fR=+v;
      else if (k==='len') D.len=+v; else if (k==='vpp') D.vpp=+v; else if (k==='fs') D.fs=+v; else if (k==='load') D.load=+v; else if (k==='clock') D.clock=v;
      else D[k]=v;
      logAction(`Set ${k} = ${v}`, k==='len'||k==='vpp'||k==='fs'? [eyeTxt()] : k==='crc'? [v?'Source sends CRCC (byte 23)':'No CRCC: the CS8427 flags a channel-status CRC error once per 192-frame block; check_confidence counts it as a confidence error'] : k==='clock'? ['Every pass now takes '+SIM.fmtDur(R_avg()*TCY())]: [], ()=>firstPass(Math.max(SIM.t,tBoot())));
    });
  });
  m.querySelectorAll('[data-b]').forEach(b=> b.onclick=()=>{
    const k=b.dataset.b;
    if (k==='eq') A.eq(); else if (k==='plug') A.plug();
    else if (k==='ev-unplug') A.event('unplug'); else if (k==='ev-plug') A.event('plug');
    else if (k==='ev-glitch') A.event('glitch'); else if (k==='ev-glitch-snap') A.event('glitch', true);
    else if (k==='clr') A.clearEvents(); else if (k==='rst') A.reset();
  });
}
function syncControls(m){
  const box=m.querySelector('#ctl'); if (!box) return;
  if (box.dataset.k!==D.rear){ box.dataset.k=D.rear; box.innerHTML=controlsHTML(); bindControls(box); return; }
  box.querySelectorAll('[data-c]').forEach(e=>{ if (e===document.activeElement) return; const k=e.dataset.c;
    const v = k==='db'? D.tone.db : k==='fL'? D.tone.fL : k==='fR'? D.tone.fR : D[k];
    if (e.type==='checkbox') e.checked=!!v; else if (String(e.value)!==String(v)) e.value=v;
    if (e.type==='range'){ const s=e.nextElementSibling; if (s && s.classList.contains('mono')) s.textContent = k==='len'? D.len+' m' : k==='vpp'? D.vpp.toFixed(1)+' V p-p' : ''; } });
  box.querySelectorAll('[data-b]').forEach(b=>{ if (b.dataset.b==='eq') b.classList.toggle('on',D.eq); if (b.dataset.b==='plug'){ b.classList.toggle('on',D.plugged); b.textContent=D.plugged?'Input connected (P)':'Input disconnected (P)'; } });
}
const R_avg = ()=>{ const r=run(); return r.stat.avg; };
document.addEventListener('keydown', e=>{
  if (!window.__d8202Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (e.key==='e'||e.key==='E') A.eq();
  if (e.key==='p'||e.key==='P') A.plug();
});
function logHTML(n){
  const e=D.log[n||0]; if (!e) return '<div class="muted">Click a jumper, the EQ button, a trim or the rear input. The hardware path appears here, then the instructions the PIC really executed in the next affected main-loop pass (replayed from the emulator).</div>';
  return `<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`+e.hw.map(s=>`<div>⚙ ${s}</div>`).join('')+(e.fw.length?`<div class="muted" style="margin-top:4px">Firmware, pass #${e.pass} (replayed):</div>`+e.fw.map(s=>`<div>→ ${s}</div>`).join(''):'');
}
function inspectHTML(t){
  const st=stateAt(t), k=link(), Lv=levels(), Ld=ledsAt(t), R_=run();
  let pcRow='PIC held in reset (MC34164, then the 18 ms device-reset timer)';
  if (!st.boot){ const I=PROG.mem[st.pic.pc]; pcRow=`PC 0x${st.pic.pc.toString(16).toUpperCase().padStart(3,'0')} in <b>${routineOf(st.pic.pc)}</b> · <span class="mono">${I?esc(PROG.lines[I.line].trim()):''}</span>`; }
  const p=st.pass; const probe = D.probe? (()=>{ const o=Lv.outs.find(q=>D.probe.startsWith(q.id)); if (o) return `${D.probe}: ${audible(t)? (o.vbal/2).toFixed(3)+' V rms to GND, '+fmtDbu(o.dbu)+' balanced' : 'muted (0 V)'}`; if (D.probe==='CONF') return 'CONF OC: '+(Ld.alCF?'ON — sinks to GND through Q2 + R87 10R':'open'); if (D.probe==='NOLOCK') return 'NO-LOCK OC: '+(Ld.alNL?'ON — sinks to GND through Q1 + R18 10R':'open'); return 'GND'; })() : 'click a rear terminal';
  return `<table class="kv">
   <tr><th>PIC16C54</th><td>${pcRow}${p?`<br>pass #${p.i} (${p.path||'…'}) · ${(R_.stat.avg).toFixed(0)} cycles/pass avg · ${SIM.fmtDur(TCY())} per cycle`:''}</td></tr>
   <tr><th>File registers</th><td class="mono small">${st.boot?'—':`stage=${bin8(st.pic.f[PROG.sym.stage]).slice(5)} stage1=${bin8(st.pic.f[PROG.sym.stage1]).slice(3)} write=${bin8(st.pic.f[PROG.sym.write])} cs8420_16=0x${hex2(st.pic.f[PROG.sym.cs8420_16])} cs8420_6=0x${hex2(st.pic.f[PROG.sym.cs8420_6])} cs8420reg3=0x${hex2(st.pic.f[PROG.sym.cs8420reg3])} W=0x${hex2(st.pic.w)}`}</td></tr>
   <tr><th>CS8427</th><td>${st.boot?'held in reset (RB1 Hi-Z/low)':`RUN=${(st.sl.regs[4]>>6)&1} · ${lockedAt(t)?'<b style="color:var(--accent)">LOCKED</b>':'not locked'} · last reg 16 read ${r16txt(st.sl.lastR16)} · reg 6 = 0x${hex2(st.sl.regs[6])}`}</td></tr>
   <tr><th>Input</th><td>${sigPresent(t)?'signal':'<b style="color:var(--bad)">no signal</b>'} · ${eyeTxt()}</td></tr>
   <tr><th>LEDs / alarms</th><td>${Ld.lock?'🟢 SIGNAL ':''}${Ld.conf?'🟡 CONF ':''}${Ld.nolock?'🔴 ERROR ':''}${Ld.eq?'🟡 EQ ':''}${!Ld.lock&&!Ld.conf&&!Ld.nolock&&!Ld.eq?'all dark':''} · DAC ${Ld.mute?'<b>muted</b>':'playing'} · OC NO-LOCK ${Ld.alNL?'ON':'off'}, CONF ${Ld.alCF?'ON':'off'}</td></tr>
   <tr><th>Outputs (${D.tone.db} dBFS, ${D.load} Ω)</th><td class="mono small">${Lv.outs.map(o=>`${o.name.padEnd(20,' ').replace(/ /g,'&nbsp;')} ${audible(t)?fmtDbu(o.dbu):'muted'}${o.s==='M'?' (mono)':''}${o.clip?' CLIP':''}`).join('<br>')}<br><span class="muted">0 dBFS = ${fmtDbu(Lv.fsL)} L, ${fmtDbu(Lv.fsR)} R</span></td></tr>
   <tr><th>Probe</th><td>${probe}</td></tr></table>`;
}
function viewSim(m){
  window.__d8202Active = true;
  m.innerHTML = `
  ${card('The card — ISSUE 5 board, rendered from the production Gerbers (click jumpers, trims, SW1 and chips)', `<div id="bd"></div><div id="ctl"></div>`)}
  <div class="grid2">
    <div class="grid2" style="grid-template-columns:minmax(0,.7fr) minmax(0,1fr)">
      ${card('Front edge', `<div id="fe"></div>`)}
      ${card('Rear module', `<div id="rp"></div>`)}
    </div>
    <div>${card('What happened (last action)', `<div id="trace" class="log"></div>`)}${card('Part', `<div id="part" class="small"></div>`)}</div>
  </div>
  ${card('State at the playhead', `<div id="insp"></div>`)}
  ${card('Timeline — one second from power-on (click to seek; zoom with the transport)', `<canvas id="tl"></canvas>
    <p class="small muted">Every PIC lane comes from executing v100.asm instruction by instruction (${'4 MHz per da301.pjt'}; 4 clocks per instruction). The CS8427 answers the bit-banged SPI as a register model; its lock and error flags follow the cable/eye model. Power-up timing before the first instruction is ${inf}.</p>`)}
  <div class="grid2">
    ${card('Scope: the AES3 frame at the playhead', `<canvas id="sc"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Eye at CS8427 RXP (cable + termination + U1 EQ)', `<canvas id="eye"></canvas><div id="eyet" class="small"></div>`)}
  </div>
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{
    const t=SIM.t; const st=stateAt(t); syncControls(m);
    m.querySelector('#bd').innerHTML=boardSVG(t,{state:st}); bindPanel(m.querySelector('#bd'));
    m.querySelector('#fe').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fe'));
    m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=logHTML(0);
    const P=PARTS[D.sel]; m.querySelector('#part').innerHTML = P? `<b>${P.t}</b><br>${P.d}` : '';
    m.querySelector('#insp').innerHTML=inspectHTML(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:205});
    drawScope(m.querySelector('#sc'), m.querySelector('#bits'), t);
    drawEye(m.querySelector('#eye'), m.querySelector('#eyet'));
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span>${e.hw[0]?' — '+e.hw[0]:''}</div>`).join('') || '<div class="muted">No actions yet.</div>';
  };
  SIM.on('time', draw);
}

/* ================================================================
   TUTORIAL (built on the 1999|32 manual, D8202MAN.WPD / d8202.pdf)
   ================================================================ */
const lvOut = id=> levels().outs.find(o=>o.id===id);
const LESSONS = [
  { title:'Meet the D8202', body:`<p>The D8202 is a plug-in card for a Ward-Beck MF82 frame. It takes one <b>AES/EBU</b> digital input and turns it into analog audio: three balanced stereo outputs, or two stereo outputs plus two mono (L+R) outputs. The manual promises 24-bit conversion, a transformer-balanced input and actively balanced outputs.</p>
     <p>Everything you set up is on the board: jumpers <b>H1</b> (input termination), <b>H2/H5</b> (level range), <b>H3/H4</b> (stereo or mono on output 3), trims <b>RV1/RV2</b> and the <b>EQ</b> button on the front edge. The connections are on the rear module behind the card.</p>
     <p class="muted">This tutorial starts with the input unplugged and the trims off their factory setting. Hover over the board on the right; dashed boxes are clickable.</p>`, check:()=>true, auto:true },
  { title:'1 · Connect the AES input', body:`<p>On the rear module (TB8205P, 110 Ω pluggable screw terminal), click <b>IN + / IN − / SH</b> to connect the AES pair.</p><p>Watch the front edge: <b>ERROR</b> (red, the manual's NO LOCK) is lit while there is nothing to lock to. Once the receiver locks, <b>SIGNAL</b> (green, the manual's LOCK) comes on.</p><p><b>Goal:</b> input connected and receivable.</p>`, check:()=>D.plugged && link().lockOK, hint:'Click the IN terminals at the top of the rear module.' },
  { title:'2 · See how long locking takes', body:`<p>The timeline starts at power-on. Set <b>Zoom window</b> to 100 ms and look at the <b>PIC16C54 main loop</b> and <b>CS8427 PLL</b> lanes. The PIC sits in reset for about 23 ms ${inf}, runs INIT, then loops through MAIN about every 1.84 ms. Each pass reads the receiver's error register over SPI. The SIGNAL LED changes only on the first pass that reads “no UNLOCK”.</p><p><b>Goal:</b> move the playhead to a moment where the SIGNAL LED is lit.</p>`, check:()=>ledsAt(SIM.t).lock, hint:'Drag the transport slider past ~50 ms, or press Play.' },
  { title:'3 · Feed it from 75 Ω coax', body:`<p>Many plants run AES on 75 Ω coax (AES-3id). Change the rear module to <b>TB8205P/75</b> (BNC input) with the selector under the board.</p><p>The card leaves the factory with H1 on <b>110 Ω</b>. On a 75 Ω line that is a mismatch (Γ = +0.19). Click <b>H1</b> (top right, by the transformer T1) until it reads <b>75 Ω</b>. Fig 1.1 in the manual shows the same header.</p><p><b>Goal:</b> TB8205P/75 fitted and H1 = 75 Ω.</p>`, check:()=>D.rear==='p75' && D.h1==='75', hint:'Rear module selector, then click H1 twice (110 → 75).' },
  { title:'4 · Line up the analog level', body:`<p>The factory alignment is <b>−20 dBFS in → +4 dBu out</b>. The test tone is already −20 dBFS.</p><p>Leave <b>H2</b> and <b>H5</b> on <b>24</b> (0 dBFS = +24 dBu). Then turn <b>RV1</b> (left) and <b>RV2</b> (right) until LEFT OUT 1 and RIGHT OUT 1 both read <b>+4.0 dBu</b> (within ±0.2 dB) in “State at the playhead”. Click the upper or lower half of a trim, or use the mouse wheel.</p><p class="muted">The trims change the gain of U16 from ×2.00 to ×3.33. RV1 near 82 % gives +4 dBu into a 10 kΩ load. Into 600 Ω the two 30 Ω build-out resistors lose 0.8 dB, and the trim cannot quite reach +4 dBu (${inf}, from the 2.0 V rms DAC full scale).</p>`,
    check:()=> D.h2==='24' && D.h5==='24' && Math.abs(lvOut('L1').dbu-4)<=0.2 && Math.abs(lvOut('R1').dbu-4)<=0.2, hint:()=>`Now: L ${fmtDbu(lvOut('L1').dbu)}, R ${fmtDbu(lvOut('R1').dbu)}.` },
  { title:'5 · Make output 3 mono', body:`<p>The manual: “to provide two mono outputs, place both programming jumpers in the 2,3 position.” Click <b>H3</b> and <b>H4</b> (next to the U11 mono summer) to <b>MONO</b>.</p><p>Both mono outputs now carry U11's (L+R)/2. Unlike what the manual says, each trim affects <i>both</i> mono outputs, because H3 and H4 take the same U11 node.</p><p><b>Goal:</b> H3 and H4 on MONO.</p>`, check:()=>D.h3==='mono'&&D.h4==='mono', hint:'Click the 3-pin headers marked STEREO / MONO.' },
  { title:'6 · A long twisted-pair run', body:`<p>Go back to the <b>TB8205P</b> rear (110 Ω) and set H1 to <b>110 Ω</b>. Then drag <b>Cable</b> to <b>450 m</b>.</p><p>The eye at the receiver closes and <b>CONF</b> (yellow) lights. The manual calls this “an eye pattern violation”. Press <b>EQ</b> on the front edge. SW1 switches an R-C network into U1B for about +13 dB at the bit rate, the eye opens again and CONF goes out. The EQ LED lights.</p><p><b>Goal:</b> 110 Ω pair, ≥ 400 m, EQ in, no CONF.</p>`, check:()=>D.rear==='p' && D.h1==='110' && D.len>=400 && D.eq && !link().conf && link().lockOK, hint:()=>`Now: ${D.rear==='p'?'TB8205P':'TB8205P/75'}, H1 ${D.h1}, ${D.len} m, EQ ${D.eq?'in':'out'}, ${eyeTxt()}` },
  { title:'7 · Too much EQ', body:`<p>Now shorten the cable to <b>50 m</b> and leave EQ in. The eye over-equalizes (overshoot) and CONF comes back. That is why the manual recommends EQ only past 250 m.</p><p>Take <b>EQ out</b>. <b>Goal:</b> ≤ 100 m, EQ out, clean eye.</p>`, check:()=>D.len<=100 && !D.eq && !link().conf, hint:'Cable slider to the left, then press EQ (or E).' },
  { title:'8 · External alarms', body:`<p>The two open-collector alarms on the rear (<b>CONFIDENCE</b> and <b>NO-LOCK</b>) follow the LEDs. RB7 drives Q1 and RB0 drives Q2.</p><p>Put the playhead around 0.5 s and click <b>Pull cable at playhead</b>. One main-loop pass later the PIC reads UNLOCK. It mutes the DAC (RB3 = 0), lights ERROR and switches Q1 on. The NO-LOCK terminal turns red on the rear module.</p><p><b>Goal:</b> the playhead is after a pull, and the NO-LOCK alarm is on.</p>`, check:()=>D.events.some(e=>e.type==='unplug' && e.t<SIM.t) && ledsAt(SIM.t).alNL, hint:'Use the transport to move past the red marker in the “AES input” lane.' },
  { title:'Done', body:`<p>You've used every control on the D8202. The other tabs show the same things from the inside. <b>Software</b> runs the real V1.00 code with the current line highlighted. <b>One second</b> breaks the loop down to single SPI bits and AES half-cells. <b>Findings</b> lists what the code and the boards are really up to.</p>`, check:()=>true, auto:true },
];
let lessonIdx=0;
function tutorialStart(){ const lg=D.log; D=DEF(); D.log=lg; D.plugged=false; D.rv1=0.45; D.rv2=0.62; lessonIdx=0; logAction('Tutorial start', ['Input unplugged, trims off their factory setting'], null); }
function viewTutorial(m){
  window.__d8202Active=true;
  m.innerHTML=`<div class="grid2">
    <div>${card('Tutorial — set up and run a D8202 the way the manual describes', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the card did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The card', `<div id="bd"></div><div id="ctl"></div>`)}
      <div class="grid2" style="grid-template-columns:minmax(0,.7fr) minmax(0,1fr)">${card('Front edge', `<div id="fe"></div>`)}${card('Rear module', `<div id="rp"></div>`)}</div>
      ${card('Levels', `<div id="insp"></div>`)}</div></div>`;
  const draw=()=>{
    const t=SIM.t; syncControls(m);
    m.querySelector('#bd').innerHTML=boardSVG(t); bindPanel(m.querySelector('#bd'));
    m.querySelector('#fe').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fe'));
    m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=logHTML(0);
    const Lv=levels(), Ld=ledsAt(t);
    m.querySelector('#insp').innerHTML=`<table class="kv"><tr><th>LEDs</th><td>${Ld.lock?'🟢 SIGNAL ':''}${Ld.conf?'🟡 CONF ':''}${Ld.nolock?'🔴 ERROR ':''}${Ld.eq?'🟡 EQ':''}${!Ld.lock&&!Ld.conf&&!Ld.nolock&&!Ld.eq?'dark (PIC in reset)':''}</td></tr>
      <tr><th>Input</th><td>${eyeTxt()}</td></tr>${Lv.outs.map(o=>`<tr><th>${o.name}</th><td class="mono">${audible(t)?fmtDbu(o.dbu):'muted'}${o.s==='M'?' (mono)':''}</td></tr>`).join('')}</table>`;
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const Ls=LESSONS[lessonIdx], ok=Ls.check(); const hint = typeof Ls.hint==='function'? Ls.hint() : (Ls.hint||'');
    m.querySelector('#lesson').innerHTML=`<h2>${Ls.title}</h2>${Ls.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(Ls.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ tutorialStart(); draw(); };
  };
  if (!viewTutorial.started){ viewTutorial.started=true; tutorialStart(); }
  SIM.on('time', draw);
}

/* ================================================================
   ONE SECOND, FRAME BY FRAME
   ================================================================ */
function viewSecond(m){
  window.__d8202Active=false;
  m.innerHTML=`${card('One second of a D8202, counted', `<div id="ladder"></div>`)}
   <div class="grid2">${card('As the card sees it at the playhead', `<div id="dev"></div>`)}${card('As the operator sees it', `<div id="fe" style="max-width:250px"></div><canvas id="meter"></canvas><p class="small muted">Downstream meter on LEFT/RIGHT OUT 1, dBu (peak over the last 10 ms of tone, after the DAC mute).</p>`)}</div>
   ${card('Zoom ladder at the playhead — the same moment at five time scales', `<div id="zl"></div>`)}`;
  const zl=m.querySelector('#zl'); const ZL=[['1 second',1],['100 ms',0.1],['one main-loop pass',null],['one SPI register write',null],['four AES3 frames',4]];
  zl.innerHTML=ZL.map((z,i)=>`<h3>${z[0]}</h3><canvas id="z${i}"></canvas>`).join('');
  const draw=()=>{
    const t=SIM.t, R_=run(), k=link(), Lv=levels();
    const sck=R_.tog[2].length/2, wbytes=R_.tx.reduce((a,x)=>a+x.bytes.length,0);
    const rows=[
      ['PIC instruction cycles', (fosc()/4).toLocaleString(), SIM.fmtDur(TCY()), `fosc ${(fosc()/1e6).toFixed(3)} MHz ÷ 4; ${D.clock==='rc'?'RC estimate ('+'inferred)':'da301.pjt'}`],
      ['MAIN passes', R_.passes.length.toLocaleString(), SIM.fmtDur(R_.stat.avg*TCY()), `${R_.stat.avg.toFixed(0)} cycles: MAIN ${R_.stat.main.toFixed(0)} · READ8420 ${R_.stat.read.toFixed(0)} · REFRESHSTATUS ${R_.stat.status.toFixed(0)} · REFRESH8420 ${R_.stat.refresh.toFixed(0)}`],
      ['SPI transactions', R_.tx.length.toLocaleString(), '', `${wbytes.toLocaleString()} bytes; ${Math.round(sck).toLocaleString()} CCLK pulses (bit-banged, 5 cycles per bit)`],
      ['Receiver-error reads (reg 16)', R_.passes.filter(p=>p.r16!=null).length.toLocaleString(), SIM.fmtDur(R_.stat.avg*TCY()), 'one per pass; LEDs can only change this often'],
      ['AES3 blocks', (D.fs/192).toFixed(2), SIM.fmtDur(192/D.fs), 'channel status (and its CRC) arrives once per block'],
      ['AES3 frames = DAC samples', D.fs.toLocaleString(), SIM.fmtDur(1/D.fs), 'CS8427 SDOUT → CS4390 (I²S, 64 fs SCLK, '+'inferred from reg 6)'],
      ['AES3 half-cells on the cable', (128*D.fs).toLocaleString(), SIM.fmtDur(1/(128*D.fs)), `the EQ boost is aimed at ${(64*D.fs/1e6).toFixed(2)} MHz`],
      ['DAC master clock (RMCK)', (256*D.fs).toLocaleString(), SIM.fmtDur(1/(256*D.fs)), 'U2-10 → U4-8 (256 fs, '+'inferred)'],
      ['Tone cycles (left)', D.tone.fL.toLocaleString(), SIM.fmtDur(1/D.tone.fL), `${(D.fs/D.tone.fL).toFixed(1)} samples per cycle`],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Emulated ${R_.cEnd.toLocaleString()} instruction cycles from power-on in ${R_.ms.toFixed(0)} ms. Use <b>Step</b> on the transport to move one pass, one SPI byte, one AES frame or one half-cell at a time.</p>`;
    const st=stateAt(t); const fr=Math.floor(t*D.fs);
    let spiNow='idle';
    if (!st.boot){ const T=R_.tx; const c=t2cyc(t); let lo=0,hi=T.length; while(lo<hi){ const mm=(lo+hi)>>1; if (T[mm].c1<c) lo=mm+1; else hi=mm; } const x=T[lo]; if (x && x.c0<=c){ spiNow = x.rd!==undefined? `reading reg ${x.rd} (${REGN[x.rd]})` : x.bytes.length===2? `setting MAP = ${x.bytes[1]}` : `writing reg ${x.bytes[1]} (${REGN[x.bytes[1]]}) ← 0x${hex2(x.bytes[2]||0)}`; } }
    m.querySelector('#dev').innerHTML=`<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PIC16C54</th><td>${st.boot?'in reset':`<b>${routineOf(st.pic.pc)}</b> @0x${st.pic.pc.toString(16).toUpperCase()} · <span class="mono">${esc(PROG.lines[PROG.mem[st.pic.pc].line].trim())}</span> · pass #${st.pass?st.pass.i:'—'}`}</td></tr>
      <tr><th>SPI port</th><td>${spiNow}</td></tr>
      <tr><th>CS8427</th><td>${lockedAt(t)?'locked; recovering 1 frame every '+SIM.fmtDur(1/D.fs):'not locked'} · frame ${fr.toLocaleString()} (${fr%192}/191 of block ${Math.floor(fr/192)})</td></tr>
      <tr><th>CS4390</th><td>${audible(t)?'converting':'muted (MUTEDAC low or no data)'} · L ${(Math.pow(10,D.tone.db/20)*Math.sin(2*Math.PI*D.tone.fL*fr/D.fs)).toFixed(4)} FS</td></tr>
      <tr><th>Analog</th><td>L bus ${(Lv.busL*Math.SQRT2*Math.sin(2*Math.PI*D.tone.fL*t)*(audible(t)?1:0)).toFixed(3)} V · R bus ${(Lv.busR*Math.SQRT2*Math.sin(2*Math.PI*D.tone.fR*t)*(audible(t)?1:0)).toFixed(3)} V (instantaneous)</td></tr></table>`;
    m.querySelector('#fe').innerHTML=frontSVG(t);
    // meter
    const {c,w}=SIM.canvas(m.querySelector('#meter'), 64);
    [['L',Lv.outs[0]],['R',Lv.outs[3]]].forEach(([n,o],i)=>{ let on=0; for (let j=0;j<32;j++) if (audible(t-0.01*j/32)) on=1; const db=on?o.dbu:-60; const lit=Math.max(0,Math.min(40,Math.round((db+20)/44*40)));
      for (let s=0;s<40;s++){ const x=40+s*(w-50)/40; c.fillStyle= s<lit? (s>=36?'#e3453a':s>=27?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); c.fillRect(x,6+i*28,(w-50)/40-2,20); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(n+(on?' '+o.dbu.toFixed(1):' —'), 2, 20+i*28); });
    // ladder canvases
    const p=passAt(t)||R_.passes[0]; const pt0 = p? cyc2t(p.c) : 0, pt1 = p? cyc2t(p.c1||p.c+1838) : 0.002;
    let wx=null; { const T=R_.tx; const c0=Math.max(t2cyc(t), p? p.c : 0); let lo=0,hi=T.length; while(lo<hi){ const mm=(lo+hi)>>1; if (T[mm].c1<c0) lo=mm+1; else hi=mm; } wx=T[lo]; }
    const L_=lanes(); const pick=(...names)=>L_.filter(l=>names.some(n=>l.label.startsWith(n)));
    const ranges=[[0,1],[Math.max(0,Math.min(0.9,t-0.05)),Math.max(0.1,Math.min(1,t+0.05))],[pt0,pt1], wx? [cyc2t(wx.c0)-2*TCY(), cyc2t(wx.c1)+2*TCY()] : [t-1e-4,t+1e-4], [Math.floor(t*D.fs)/D.fs, Math.floor(t*D.fs)/D.fs+4/D.fs]];
    const sets=[pick('PIC16C54','CS8427','LED SIGNAL','LED ERROR'), pick('PIC16C54','  READ','reg 16','LED SIGNAL'), pick('  READ','SPI CS','SPI CCLK','SPI bytes'), pick('SPI CS','SPI CCLK','SPI CDIN','SPI CDOUT','SPI bytes'), pick('AES3 frames','L bus')];
    sets.forEach((ls,i)=> SIM.drawLanes(m.querySelector('#z'+i), ls, {labelW:205, range:ranges[i]}));
  };
  SIM.on('time', draw);
}

/* ================================================================
   BLOCK DIAGRAM
   ================================================================ */
const BLOCKS = {
  rear:{x:10,y:20,w:150,h:78,t:'Rear module',s:['TB8205P (110 Ω screw)','TB8205P/75 (BNC)','→ P1 EDAC 30-way'],d:'Mounted behind the card in the MF82 frame. IN± and the passive loop on P1-2/P1-1; six balanced outputs; CONFIDENCE and NO-LOCK open collectors.'},
  inp:{x:10,y:130,w:150,h:96,t:'Input',s:['C14 → T1 PE-65612','H1: 110 / 75 / Hi Z','R9 110R, D1/D2 clamps'],d:'Transformer-balanced input. H1 puts R13 110R or R14 75R across the secondary (or leaves only R8 100K = Hi Z).'},
  eq:{x:190,y:130,w:160,h:96,t:'U1 EL5263 + SW1',s:['U1A ×2 buffer','U1B with switchable EQ','R7 110R → C10 → RXP'],d:'Cable equalizer: SW1 parallels R5 750R with R6/C7 (330R/1n) and R12/C13 (110R/220p). Hardware only.'},
  rx:{x:380,y:130,w:150,h:96,t:'U2 CS8427',s:['AES3 receiver + PLL','I²S out → DAC','control port ↔ PIC'],d:'Recovers the clock and data, flags errors in reg 16. The code still calls it cs8420.'},
  pic:{x:380,y:20,w:150,h:78,t:'U7 PIC16C54 (V1.00)',s:['bit-banged SPI master','LEDs, DAC mute, alarms'],d:'v100.asm. Polls reg 16 and reg 6 and rewrites all 8 control registers on every pass.'},
  stat:{x:560,y:20,w:170,h:78,t:'Status',s:['SIGNAL / CONF / ERROR LEDs','Q1 NO-LOCK, Q2 CONF OC','EQ LED (from SW1)'],d:'RB6/RB5/RB4 through 330R; RB7/RB0 → 4K7 → 2N4401 → 10R → P1-21/22.'},
  dac:{x:560,y:130,w:170,h:96,t:'U4 CS4390 DAC',s:['24-bit, differential out','MUTE ← RB3','2.0 V rms FS ('+'inferred)'],d:'I²S from the CS8427 (RMCK/OSCLK/OLRCK/SDOUT on pins 8/9/7/10).'},
  filt:{x:560,y:258,w:170,h:84,t:'U3 / U5 NE5532',s:['2 × MFB low-pass ≈ 59 kHz','diff → single-ended, ×1'],d:'Reconstruction filters, one NE5532 per channel.'},
  lvl:{x:380,y:258,w:150,h:84,t:'Level: H2/H5 + U16',s:['range 24 / 18 / 16 dBFS','RV1 / RV2: ×2.0 … ×3.33'],d:'R53/R84 10K dividers with 0R / 10K / 15K series resistors; U16 non-inverting gain.'},
  mono:{x:190,y:258,w:160,h:84,t:'U11 mono sum',s:['−(L+R)/2 then ×−1','H3 / H4 select'],d:'R62/R66 15K into R63 7K5; inverter R67/R65.'},
  outs:{x:10,y:258,w:150,h:84,t:'6 balanced drivers',s:['U8 U9 U10 U13 U14 U12','+6 dB, 2 × 30R = 60 Ω'],d:'Follower + inverter per output; 30R build-out resistors.'},
  pwr:{x:190,y:20,w:160,h:78,t:'Power',s:['±20 V → F1/F2 → D3/D4','LM2596 +5 V, 79L05 −5 V','MC34164 reset'],d:'Manual: +20 V 177 mA, −20 V 150 mA max.'},
};
const WIRES=[['rear','inp','AES in'],['inp','eq',''],['eq','rx','RXP'],['rx','pic','SPI'],['pic','stat',''],['rx','dac','I²S'],['pic','dac','MUTE'],['dac','filt','±L ±R'],['filt','lvl','CHA/CHB'],['lvl','mono','L+R'],['lvl','outs','L/R bus'],['mono','outs','H3/H4'],['outs','rear','P1'],['stat','rear','OC alarms'],['pwr','pic','+5V']];
function viewBlock(m){
  window.__d8202Active=false; let sel='rx';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bi"></div>`)}${card('Level through each stage (left channel, at the current settings)', `<div id="lv"></div>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 740 352" style="width:100%"><defs><marker id="d82ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const kk=Math.min(sx,sy); return [x+dx*kk,y+dy*kk]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#d82ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const kk in BLOCKS){ const b=BLOCKS[kk];
      s+=`<g data-b="${kk}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===kk?'var(--accent)':'var(--line)'}" stroke-width="${sel===kk?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bi').innerHTML=`<h3 style="margin-top:0">${b.t}</h3><p class="small">${b.d}</p>`;
    const Lv=levels(), c=Lv.cl; const st=[
      ['Digital input', `${D.tone.db} dBFS`, ''],
      ['CS4390 differential out', `${Lv.dac.toFixed(3)} V rms`, `${fmtDbu(dbu(Lv.dac))} · full scale 2.0 V rms ${inf}`],
      ['U3 MFB filters (−1 · −1)', `${Lv.dac.toFixed(3)} V rms`, 'single-ended CHA, −0.0 dB in band'],
      [`H2 = ${D.h2} (${H2POS[D.h2].res} into R53)`, `${(Lv.dac*c.att).toFixed(3)} V rms`, `${(20*Math.log10(c.att)).toFixed(2)} dB`],
      [`U16A, RV1 ${(D.rv1*100).toFixed(0)} %`, `${Lv.busL.toFixed(3)} V rms`, `×${c.g.toFixed(3)} = +${(20*Math.log10(c.g)).toFixed(2)} dB`],
      ['U8 balanced driver', `${(2*Lv.busL).toFixed(3)} V rms`, `+6.02 dB · ${fmtDbu(dbu(2*Lv.busL))} unloaded`],
      [`into ${D.load} Ω via 2 × 30R`, `${(2*Lv.busL*Lv.kl).toFixed(3)} V rms`, `<b>${fmtDbu(Lv.outs[0].dbu)}</b>`],
      ['Headroom to the rails', `${(C.RAIL_PK/Math.SQRT2).toFixed(1)} V rms per leg`, `clips at ${fmtDbu(dbu(2*C.RAIL_PK/Math.SQRT2*Lv.kl))}; the DAC (0 dBFS = ${fmtDbu(Lv.fsL)}) runs out first ${inf}`],
    ];
    m.querySelector('#lv').innerHTML=`<table class="kv"><tr><th>Stage</th><th>Level</th><th>Gain / note</th></tr>${st.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</table>`;
  };
  SIM.on('time', draw);
}

/* ================================================================
   SOFTWARE
   ================================================================ */
const FLOW = {   // node: [x,y,w,h,title,sub,labels that belong to it]
  rst:[20,14,150,44,'Reset vector 0x1FF','GOTO RESET',[]],
  init:[20,80,150,92,'RESET / INIT 0x010','TRIS, CLRF ports, CS high · powerupdelay (256×) · load cs8420reg* defaults · RB1 = 1 · CALL refresh8420',['init','powerupdelay']],
  main:[220,14,170,44,'MAIN 0x033','clrwdt · TRIS B 0x04 · TRIS A 0xF2',['main']],
  read:[220,82,170,70,'CALL READ8420 0x071','reg 16 → cs8420_16, reg 6 → cs8420_6 (s1…s6 via shiftout1 / shiftin)',['read8420','s1','s2','s3','s4','s5','s6','shiftin','shiftout1']],
  stat:[220,176,170,44,'CALL REFRESHSTATUS 0x03C','cs8420_6 = 0x92 ?',['refreshstatus']],
  lock:[420,150,120,44,'lock','reg3 = 0x95 · RB3=1 RB6=1 RB4=0 RB7=0',['lock']],
  nolock:[420,212,120,44,'no_lock','reg3 = 0xD5 · RB3=0 RB4=1 RB6=0 RB7=1',['no_lock']],
  conf:[570,150,150,70,'next / check_confidence','crc|conf|bip|par → confidence',['next','check_confidence']],
  con:[570,236,72,40,'conf ON','RB5=1 RB0=1',['confidence_on']],
  coff:[648,236,72,40,'conf OFF','RB5=0 RB0=0',['confidence_off']],
  ref:[220,300,170,64,'CALL REFRESH8420 0x0EF','reg1…reg17 via wr8420reg (r1→r2→r3)',['refresh8420','reg1','reg2','reg3','reg4','reg5','reg6','reg9','reg17','wr8420reg','r1','r2','r3','shiftout']],
};
const FLOW_BY = (()=>{ const m={}; for (const k in FLOW) FLOW[k][6].forEach(l=>m[l]=k); return m; })();
function flowNode(pc){ if (pc==null) return 'rst'; if (pc>=0x1FF) return 'rst'; let best=null, ba=-1; for (const l in FLOW_BY){ const a=L[l]; if (a!==undefined && a<=pc && a>ba){ ba=a; best=FLOW_BY[l]; } } return best||'init'; }
function flowSVG(pc, boot){
  const cur = boot? 'rst' : flowNode(pc);
  const arrow=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.3" marker-end="url(#d82ar2)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`;
  let s=`<svg viewBox="0 0 740 380" style="width:100%"><defs><marker id="d82ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  s+=arrow(95,58,95,80)+arrow(170,100,220,36,'')+arrow(305,58,305,82)+arrow(305,152,305,176)+arrow(390,198,420,172,'Z=1, UNLOCK=0')+arrow(390,206,420,232,'UNLOCK=1')+arrow(220,198,170,150,'Z=0 → goto init')
    +arrow(540,172,570,180)+arrow(540,234,575,214,'')+arrow(606,220,606,236)+arrow(684,220,684,236)+`<path d="M 606 276 L 606 290 L 305 290 L 305 300" fill="none" stroke="var(--ink2)" stroke-width="1.3" marker-end="url(#d82ar2)"/><path d="M 684 276 L 684 290" fill="none" stroke="var(--ink2)" stroke-width="1.3"/>`
    +`<path d="M 600 220 C 560 270, 420 280, 395 300" fill="none" stroke="var(--ink2)" stroke-width="1" stroke-dasharray="3 3"/><text x="470" y="276" font-size="9.5" fill="var(--ink2)">no_lock: skip check (bcf RB5, RB0)</text>`
    +`<path d="M 220 332 L 200 332 L 200 36 L 220 36" fill="none" stroke="var(--ink2)" stroke-width="1.3" marker-end="url(#d82ar2)"/><text x="160" y="250" font-size="10" fill="var(--ink2)" transform="rotate(-90 196 250)">goto main</text>`;
  for (const k in FLOW){ const [x,y,w,h,t,sub]=FLOW[k]; const on=k===cur;
    s+=`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${on?'color-mix(in srgb, var(--accent) 22%, var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.6:1.2}"/><text x="${x+7}" y="${y+15}" font-size="11.5" font-weight="700" fill="var(--ink)">${t}</text>`;
    const words=sub.split(' '); let line='', ly=y+29; words.forEach(wd=>{ if ((line+' '+wd).length*5.4 > w-12){ s+=`<text x="${x+7}" y="${ly}" font-size="9.8" fill="var(--ink2)">${esc(line)}</text>`; line=wd; ly+=12; } else line = line? line+' '+wd : wd; }); if (line) s+=`<text x="${x+7}" y="${ly}" font-size="9.8" fill="var(--ink2)">${esc(line)}</text>`;
    s+='</g>'; }
  return s+'</svg>';
}
const REGDEF = [
  [1,'cs8420reg1def','Miscellaneous Control 1 (1)',0x08],[2,'cs8420reg2def','Miscellaneous Control 2 (2)',0x00],
  [3,'cs8420reg3def','Data Flow Control (3)',0x95],[4,'cs8420reg4def','Clock Flow Control (4)',0x49],
  [5,'cs8420reg5def','Serial Audio Input Port Data Format (5)',0x00],[6,'cs8420reg6def','Serial Audio Output Port Data Format (6)',0x92],
  [9,'cs8420reg9def','Interupt 1 Register Mask (9) 0=masked-',0x00],[17,'cs8420reg17def','Receive Error Mask (17)',0x37],
];
const REGNOTE = {
  1:`bit 3 set; meaning per data sheet ${inf}`,
  3:`only difference from cs8420reg3mute (0xD5) is bit 6 = TXOFF, “Mute AES3 Transmitter” — but TXP/TXN are not connected on ISS4/5. Other fields route the receiver to the serial output ${inf}`,
  4:`bit 6 = RUN (the receiver only runs once this is written) ${inf}; the model starts the PLL here`,
  6:`master, I²S-style; SORES field = 10 which on the CS8420 means 16-bit output ${inf} — would contradict “24-bit”; also used as the alive check in REFRESHSTATUS`,
  9:'all interrupts masked: the PIC polls',
  17:'unmask crc(5), UNLOCK(4), conf(2), biphase(1), parity(0); validity(3) and qcrc(6) never reported',
};
function viewSoft(m){
  window.__d8202Active=false;
  const P=PROG;
  m.innerHTML=`<div class="grid2">
    <div>${card('Main loop of V1.00 — the highlighted box is where the PIC is at the playhead', `<div id="flow"></div><div id="where" class="small"></div>`)}
      ${card('State machines (file registers at the playhead)', `<div id="sm"></div><p class="small muted">The PIC16C5x has a 2-level stack and CALL reaches only 0x000–0x0FF, so the author replaced the byte-shift CALLs with GOTOs. <span class="mono">stage</span> tells <span class="mono">shiftout</span> where to jump back to (r1, r2, r3), <span class="mono">stage1</span> does the same for <span class="mono">shiftout1</span> (s1…s6), and <span class="mono">write</span> walks REFRESH8420 through reg1…reg17.</p>`)}
      ${card('One SPI register write at the playhead (emulated pins)', `<canvas id="spi"></canvas>`)}
      ${card('CS8427 registers written every pass', `<div id="regs"></div>`)}
    </div>
    <div>${card('v100.asm — executing line highlighted (live)', `<div id="lst" style="max-height:640px;overflow:auto;font:11.5px/1.45 var(--mono);background:var(--lane);border:1px solid var(--line);border-radius:8px;padding:4px 0"></div>`)}
      ${card('Cycle budget (measured by the emulator)', `<div id="cyc"></div>`)}
      ${card('File registers (bank 0, RES at ORG 07H)', `<div id="fr"></div>`)}
    </div></div>
    <div class="grid2">${card('PIC16C54 pin map (from d8202-ISS4.net)', pinMapHTML())}${card('Where the buttons go: hardware paths (no code involved)', hwPathsHTML())}</div>
    ${card('The 1997|30 ISS2 program (PCB/OBSOLETE/ISS2/D8202.ASM) vs. V1.00', iss2HTML())}`;
  // listing, built once
  const lst=m.querySelector('#lst');
  lst.innerHTML = P.lines.map((ln,i)=>{ const a=P.lineAddr[i]; return `<div data-l="${i}" style="white-space:pre;padding:0 8px"><span class="muted">${String(i+1).padStart(3,' ')} ${a!==undefined? a.toString(16).toUpperCase().padStart(3,'0'):'   '}</span>  ${esc(ln)||' '}</div>`; }).join('');
  let lastLine=-1;
  const draw=()=>{
    const t=SIM.t, st=stateAt(t), R_=run();
    const pc = st.boot? null : st.pic.pc;
    m.querySelector('#flow').innerHTML = flowSVG(pc, st.boot);
    m.querySelector('#where').innerHTML = st.boot? 'PIC in reset — MC34164 holds MCLR, then the device-reset timer runs.' : `PC = 0x${pc.toString(16).toUpperCase().padStart(3,'0')} (${routineOf(pc)}) · W = 0x${hex2(st.pic.w)} · STATUS.Z = ${(st.pic.f[3]>>2)&1} · stack [0x${st.pic.st[0].toString(16).toUpperCase()}, 0x${st.pic.st[1].toString(16).toUpperCase()}] · cycle ${Math.floor(t2cyc(t)).toLocaleString()} since reset`;
    const line = st.boot? -1 : (P.mem[pc]? P.mem[pc].line : -1);
    if (line!==lastLine){ lst.querySelectorAll('.hl').forEach(e=>e.classList.remove('hl')); const el=lst.querySelector(`[data-l="${line}"]`); if (el){ el.classList.add('hl'); const top=el.offsetTop-lst.offsetTop; if (top<lst.scrollTop+40 || top>lst.scrollTop+lst.clientHeight-60) lst.scrollTop=top-lst.clientHeight/2; } lastLine=line; }
    const f=st.boot? new Uint8Array(32) : st.pic.f;
    const chips=(v,n,names,cur)=>names.map((nm,i)=>`<span class="chip" style="${(v>>i)&1?'background:color-mix(in srgb,var(--accent) 30%,transparent);border-color:var(--accent)':''}">${nm}</span>`).join('');
    m.querySelector('#sm').innerHTML=`<table class="kv"><tr><th>stage = ${bin8(f[P.sym.stage])}</th><td>${chips(f[P.sym.stage],3,['→r1 (send map)','→r2 (send data)','→r3 (CS↑, next reg)'])}</td></tr>
      <tr><th>stage1 = ${bin8(f[P.sym.stage1])}</th><td>${chips(f[P.sym.stage1],5,['s1','s2','s3 (read 16)','s4','s5'])} <span class="muted">all set → s6 (read 6)</span></td></tr>
      <tr><th>write = ${bin8(f[P.sym.write])}</th><td>${chips(f[P.sym.write],8,['reg1','reg2','reg3','reg4','reg5','reg6','reg9','reg17'])}</td></tr>
      <tr><th>confidence = ${bin8(f[P.sym.confidence])}</th><td>${chips(f[P.sym.confidence],8,['par','bip','conf','—','—','crc','—','—'])}</td></tr></table>`;
    // SPI write at playhead
    const T=R_.tx; let x=null; if (!st.boot){ const c=t2cyc(t); let lo=0,hi=T.length; while(lo<hi){ const mm=(lo+hi)>>1; if (T[mm].c1<c) lo=mm+1; else hi=mm; } x=T[lo]; }
    const lsAll=lanes(); const pk=(...n)=>lsAll.filter(l=>n.some(q=>l.label.startsWith(q)));
    if (!x){ const cv=m.querySelector('#spi'); const {c}=SIM.canvas(cv,40); c.fillStyle=SIM.css('--ink2'); c.font='12px sans-serif'; c.fillText('PIC in reset: move the playhead past ~25 ms.',10,24); }
    if (x) SIM.drawLanes(m.querySelector('#spi'), pk('SPI CS','SPI CCLK','SPI CDIN','SPI CDOUT','SPI bytes'), {labelW:180, range:[cyc2t(x.c0)-3*TCY(), cyc2t(x.c1)+3*TCY()]});
    m.querySelector('#regs').innerHTML=`<table class="kv"><tr><th>reg</th><th>constant (v100.asm comment)</th><th>value</th><th>RAM shadow now</th><th>notes</th></tr>${REGDEF.map(([a,n,c,v])=>`<tr><td class="mono">${a}</td><td><span class="mono">${n}</span><br><span class="muted small">${c}</span></td><td class="mono">0x${hex2(v)}<br>${bin8(v)}</td><td class="mono">0x${hex2(f[P.sym['cs8420reg'+a]])}</td><td class="small">${REGNOTE[a]||''}</td></tr>`).join('')}
      <tr><td class="mono">3</td><td><span class="mono">cs8420reg3mute</span><br><span class="muted small">Mute AES3 Transmitter (3)</span></td><td class="mono">0xD5<br>11010101</td><td></td><td class="small">loaded by no_lock</td></tr></table>
      <p class="small muted">Write frame: CS↓ · 0x20 (chip address 0010000, R/W = 0) · MAP · DATA · CS↑. Read frame: CS↓ 0x20 MAP CS↑, CS↓ 0x21, then 8 bits on CDOUT (MSB first, sampled before each CCLK rising edge by <span class="mono">shiftin</span>).</p>`;
    const s=R_.stat, tc=TCY();
    m.querySelector('#cyc').innerHTML=`<table class="kv"><tr><th>Routine</th><th>cycles</th><th>time</th><th>share</th></tr>${[['MAIN (clrwdt, TRIS ×2, goto)',s.main+2],['READ8420 (2 reads, 6 shiftout1, 2 shiftin)',s.read],['REFRESHSTATUS',s.status],['REFRESH8420 (8 × 3-byte writes)',s.refresh-2]].map(([n,c])=>`<tr><td>${n}</td><td class="mono">${c.toFixed(0)}</td><td class="mono">${SIM.fmtDur(c*tc)}</td><td class="mono">${(c/s.avg*100).toFixed(1)} %</td></tr>`).join('')}
      <tr><th>Whole pass</th><th class="mono">${s.min}–${s.max}</th><th class="mono">${SIM.fmtDur(s.avg*tc)}</th><th>${(1/(s.avg*tc)).toFixed(0)} passes/s</th></tr></table>
      <p class="small muted">Locked & confidence-clean = 1,838 cycles; no_lock = 1,813. Each SPI bit costs 5 cycles (bcf · btfsc/bsf · bsf CCLK · bcf CCLK). Program size ${P.size} of 512 words; refresh8420 (a CALL target) sits at 0x${L.refresh8420.toString(16).toUpperCase()}, ${0x100-L.refresh8420} words below the CALL limit.</p>`;
    m.querySelector('#fr').innerHTML=`<table class="kv">${FREGS.map(n=>{ const a=P.sym[n.toLowerCase()]; return `<tr><td class="mono">0x${hex2(a)}</td><td class="mono">${n}</td><td class="mono">0x${hex2(f[a])}</td><td class="mono small">${bin8(f[a])}</td></tr>`; }).join('')}</table>`;
  };
  SIM.on('time', draw);
}
function pinMapHTML(){
  const rows=[[1,'RA2','out','SCK → U2-28 CCLK'],[2,'RA3','out','SDO → U2-27 CDIN'],[3,'RTCC','—','not on any net'],[4,'MCLR','in','U6 MC34164 reset, R39 4K7 pull-up'],[5,'VSS','',''],
    [6,'RB0','out','R88 4K7 → Q2 → R87 10R → P1-22 CONF (open collector)'],[7,'RB1','out','RESET → U2-9 RST'],[8,'RB2','in','RERR ← U2-11 (never read)'],[9,'RB3','out','MUTEDAC → U4-15, U4-16 (0 = mute)'],
    [10,'RB4','out','R43 330R → ERROR LED (red, NO LOCK)'],[11,'RB5','out','R42 330R → CONF LED (yellow)'],[12,'RB6','out','R40 330R → SIGNAL LED (green, LOCK)'],[13,'RB7','out','R19 4K7 → Q1 → R18 10R → P1-21 ALARM (NO-LOCK)'],
    [14,'VDD','','+5V'],[15,'OSC2','—','not on any net (RC mode)'],[16,'OSC1','in','R41 4K7 to +5V, C46 27p to GND — RC oscillator'],[17,'RA0','out','CS2 → U2-2 CS'],[18,'RA1','in','SDI ← U2-1 CDOUT']];
  return `<table class="kv"><tr><th>pin</th><th>name</th><th>dir</th><th>net → destination</th></tr>${rows.map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td>${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">PIC16C54 DIP-18 pin names are from the Microchip data sheet (${inf}); the nets are from the netlist. TRIS PORTA = 0xF2, TRIS PORTB = 0x04, both rewritten on every pass.</p>`;
}
function hwPathsHTML(){
  return `<table class="kv">
   <tr><th>EQ button</th><td class="small">SW1 PHA-2UEE (latching). Contact SW1-4↔6 puts R6 330R + C7 1n and R12 110R + C13 220p across R5 750R at U1B's input. Contact SW1-5↔3 grounds the EQ LED (+5V → R16 330R). The PIC never sees it.</td></tr>
   <tr><th>H1 termination</th><td class="small">Pin 2 = T1 secondary (NET00096); pin 1 → R13 110R, pin 3 → R14 75R to GND; no jumper = R8 100K only (Hi Z).</td></tr>
   <tr><th>H2 / H5 range</th><td class="small">Three series resistors (R50 0R / R54 10K / R56 15K; right R83 / R85 / R86) into R53 (R84) 10K: 0 / −6.0 / −8.0 dB → silk 24 / 18 / 16.</td></tr>
   <tr><th>RV1 / RV2</th><td class="small">PT10H-20K in series with R47 (R79) 15K, feedback of U16A (U16B) over R46 (R78) 15K: ×2.00 … ×3.33.</td></tr>
   <tr><th>H3 / H4</th><td class="small">Pin 2 → U10 (U12) input; pin 1 = left (right) bus; pin 3 = U11 mono (L+R)/2.</td></tr>
   <tr><th>Rear alarms</th><td class="small">RB7 → Q1 → P1-21, RB0 → Q2 → P1-22 (2N4401; collector resistors R18/R87 10R).</td></tr></table>`;
}
function iss2HTML(){
  return `<div class="grid2"><div class="small"><p><b>1997|30 ISS2</b> (D8202.BOM Nov 27 1997): CS8412 receiver, CS4329 DAC, PIC16C54A, OPA650 input amp, LM360 comparator, <b>75176</b> RS-485 driver for the front monitor jack, NE5532 audio, LM7805/LM337 regulators. The program's header reads <span class="mono">;ABB-1 AUDIO BIT BUDDY</span>: it was started from the Audio Bit Buddy code.</p>
    <p>Its MAIN pulls SEL low, reads the CS8412 error code on RB3–RB5, maps it through <span class="mono">TABLE1</span>, and sets LEDs and alarms on PORTA/PORTB. <span class="mono">BCF PORTB,7 ;FRONT JACK MONITOR OFF</span> gates the front-jack output when there is no lock. There is no SPI and no register setup: the CS8412 is pin-programmed.</p></div>
   <div class="small"><p><b>2005|38 V1.00</b> (this card, ISS4/ISS5): CS8427 under SPI control, so the PIC must configure it after every reset. It also rewrites the configuration on every pass. The front jack and the 75176 are gone, and with them the reason for RB7's old job. RB7 became the NO-LOCK alarm, and the AES transmitter mute (reg 3) has nothing to mute.</p>
   <p>ISS2's DELAY comment assumes a <span class="mono">1.53MHZ</span> clock; V1.00's project file says 4 MHz.</p></div></div>`;
}

/* ================================================================
   FINDINGS
   ================================================================ */
function viewFindings(m){
  window.__d8202Active=false; const R_=run(); const nConf=(()=>{ const d0=D.crc; if (!d0) return R_.passes.filter(p=>p.conf).length; return null; })();
  const F=[
    ['The code drives a “CS8420”; the board carries a CS8427', 'v100.asm (all <span class="mono">cs8420reg*</span> names; header “based on the DA301V101 AES\\EBU DA”) · D8202-ISS5.bom / ISS4.bom (<span class="mono">CS8427-CS</span>) · d8202-ISS5.sch (symbol CS8420, value CS8427)', `The register numbers it uses (1–6, 9, 16, 17) exist on both parts. Clock- and data-flow bits that steer the CS8420's sample-rate converter have no meaning on the converter-less CS8427 ${inf}: data sheets are not in the archive. The firmware is a port of the DA301 AES DA program.`],
    ['Muting a transmitter that is not connected', 'REFRESHSTATUS → <span class="mono">no_lock</span>: <span class="mono">movlw cs8420reg3mute</span> (0xD5, “Mute AES3 Transmitter”) · d8202-ISS4.net', 'U2 TXP/TXN are on no net in the ISS4 netlist, and the card has no AES output. The real mute is RB3 → MUTEDAC → CS4390 pins 15/16, which the same block drives. The reg 3 swap is a DA301 leftover.'],
    ['The manual\'s ¼″ front-edge monitor jack no longer exists', 'D8202MAN.WPD (1999|32, “Monitor”) · PCB/OBSOLETE/ISS2/D8202.BOM (75176) and D8202.ASM (<span class="mono">FRONT JACK MONITOR OFF</span>) · ISS4/ISS5 BOM and netlist', 'ISS2 had a jack driven by a 75176. ISS4 and ISS5 have no jack and no driver, so the manual was never updated for the 2005 redesign. The rear-module guide (2012|45) lists no monitor either.'],
    ['Three-quarters of every pass rewrites unchanged registers', 'REFRESH8420 / wr8420reg / shiftout', `Emulated: ${R_.stat.refresh.toFixed(0)} of ${R_.stat.avg.toFixed(0)} cycles per pass (${(R_.stat.refresh/R_.stat.avg*100).toFixed(0)} %) go into rewriting regs 1–6, 9 and 17, about ${Math.round(8/(R_.stat.avg*TCY())).toLocaleString()} register writes a second. This heals any register upset within one pass, but it also keeps the SPI lines toggling next to the analog stages for ${(R_.stat.refresh/R_.stat.avg*100).toFixed(0)} % of the time.`],
    ['The reg 6 “still configured?” check rarely fires', 'READ8420 (s4–s6: read reg 6 → <span class="mono">cs8420_6</span>) · REFRESHSTATUS (<span class="mono">subwf cs8420_6,w … goto init</span>)', `The check only sees a CS8427 reset that lands between the end of REFRESH8420 and the reg 6 read: MAIN plus most of READ8420, about ${((R_.stat.main+R_.stat.read)*TCY()*1e3).toFixed(2)} ms of each ${(R_.stat.avg*TCY()*1e3).toFixed(2)} ms pass (≈${((R_.stat.main+R_.stat.read)/R_.stat.avg*100).toFixed(0)} %). Any other time, the blind rewrite restores reg 6 first and INIT never runs. The latched UNLOCK still blinks ERROR while the PLL relocks. Try both “CS8427 reset” buttons on the Simulator tab.`],
    ['RERR is wired to the PIC but never read', 'd8202-ISS4.net: RERR = U7-8 (RB2) ↔ U2-11 · INIT/MAIN <span class="mono">TRIS PORTB = b\'00000100\'</span>', 'RB2 is the only input on port B, and no instruction reads <span class="mono">portb,2</span>. Errors are found by polling reg 16 over SPI instead.'],
    ['CONF is not only an eye warning', 'check_confidence (“changed from previous DA301”) · cs8420reg17def = 0x37 · manual “Status”', `The manual says CONFIDENCE means an eye-pattern violation. The code lights it for any of channel-status CRC (bit 5), conf (bit 2), bi-phase (bit 1) or parity (bit 0). Validity (bit 3) and Q-CRC (bit 6) are masked out by reg 17. A source that sends no CRCC byte trips the CRC flag once per 192-frame block, so the LED flickers on ${nConf!=null? nConf+' of '+R_.passes.length : 'about 45 % of the'} passes (untick “source sends CS CRC” to see it). Latching behaviour ${inf}.`],
    ['A 2-level stack used to the limit', 'v100.asm: <span class="mono">;call shiftout</span> commented out, <span class="mono">stage</span>/<span class="mono">stage1</span>/<span class="mono">write</span> dispatchers', `PIC16C5x: two return addresses, and CALL can only reach 0x000–0x0FF. MAIN → CALL READ8420 → CALL shiftin uses both levels. Everything else returns through GOTO dispatchers keyed on bit flags. <span class="mono">refresh8420</span> (a CALL target) sits at 0x${L.refresh8420.toString(16).toUpperCase()}, ${0x100-L.refresh8420} words under the limit. The program fills ${PROG.size} of 512 words.`],
    ['Every RETURN is a RETLW 0', 'V100.ERR (6 × warning 227, lines 166–523) · warning 215', 'The 12-bit core has no RETURN, so MPASM substituted RETLW 0 and W is cleared on every return. Harmless here: no caller uses W afterwards. The emulator does the same.'],
    ['A last-minute fix visible in the backup', 'V100.$$$ (09:35) vs v100.asm (09:50), Sept 23 2005', 'In the backup, MAIN reloaded <span class="mono">TRIS PORTB</span> with b\'00000101\' on every pass. That made RB0, the CONF open collector, an input, so the CONF alarm could never switch. Fifteen minutes later it reads b\'00000100\' and the confidence lines gained their comments.'],
    ['Leftovers and copy-paste', 'INIT · read8420 s4', 'INIT loads <span class="mono">cs8420reg4def</span> twice. s4 comments address 6 as “address of receive error register”, but reg 6 is the serial output format. INIT\'s <span class="mono">CLRF PORTA</span> drops CS for one cycle with no clock (harmless). <span class="mono">stage</span> is never cleared before <span class="mono">bsf stage,0</span> (harmless: bit 0 is tested first). powerupdelay is only 256 × 3 cycles ≈ 0.77 ms; the MC34164 and the PIC\'s reset timer do the real waiting.'],
    ['Mono outputs are the same signal', 'D8202MAN.WPD “Mono Outputs” · d8202-ISS4.net NET00088 (U11-1, H3-3, H4-3)', 'The manual says the left and right trims affect mono outputs one and two respectively. In the netlist both headers take the one U11 node, (L+R)/2. Both mono outputs are identical, and each trim moves both.'],
    ['Board, manual and BOM disagree on names and colours', 'Gerber D8202-ISS5.SLK · D8202-ISS5.bom · manual “Status”', 'Silk says SIGNAL / CONF / ERROR; the manual says LOCK / CONFIDENCE / NO LOCK. The manual\'s EQ LED is green, but the BOM fits two YEL (CONF and EQ). On ISS5 the EQ LED sits beside SW1, away from the other three, not “at the bottom of the LED array”.'],
    ['Artwork 2026|59: rear modules now from the CorelDRAW guide', SIM.src(RMG_DIR+'D8202 - rear module options.cdr','D8202 - rear module options.cdr')+' (CorelDRAW X3, 2012-01-16) · '+SIM.src(RMG_DIR+'D8202 - rear module options.pdf','its PDF export'), 'The TB8205P and TB8205P/75 panels are the vectors of the 2012 guide, black plate with white legends, replacing the 150-dpi PNG cut from the PDF; the terminals and BNC overlays sit on the same cells. The CDR itself converts badly (the screw-terminal blocks and 1–8/G numerals are a symbol font that libcdr turns into giant letters), so the vectors come from Corel\'s own PDF export of the same file. The TB8205P cell is captioned “D8202-AES/<b>EBS</b> Digital to Analog Converter” (typo for EBU). The older manual pages '+SIM.src('#MF8200 #SERIES/D8202 - #Master #MF82/D8202 - #Engineering/D8202tr3_1.cdr','D8202tr3_1.cdr')+' (2010) and D8202TR1/TR3 show the earlier ST8200 / ST8201A solder and QC8200QCP terminal options, the ST8200 marked “no longer manufactured”.'],
    ['The manual\'s figures show the 1997 board', 'd8202.pdf Fig 1.1–1.3 vs D8202-ISS5 Gerbers', 'Fig 1.2 labels R26–R48, U6/U7, C21/C22 and trims beside U6/U7. ISS5 uses RV1/RV2 beside U16 and H2/H5 headers. The 24 / 18 / 16 dBFS jumper markings are still true on ISS5 silk.'],
    ['Factory level, and a 600 Ω corner', 'manual (−20 dBFS → +4 dBu; +24 dBu max into 600 Ω) · BOM values', `With a 2.0 V rms DAC full scale ${inf}, one trim setting (×3.09) gives exactly +24 / +18 / +16 dBu at 0 dBFS in the three H2 positions, matching Fig 1.2. The two 30 Ω build-out resistors cost 0.83 dB into 600 Ω. There the trim tops out at +3.9 dBu for −20 dBFS, so the factory alignment assumes a bridging load.`],
    ['Rear-module guide footnote is wrong', '“D8202 - rear module options.pdf” (2012|45) vs D8202TR1.CDR', 'The guide stars LEFT/RIGHT OUT 3 with “this output can be used as an alarm by setting the jumpers”. The older terminal drawing says “jumper selectable for a third stereo output or two mono sum outputs”. The TB8205P caption also reads “AES/EBS”.'],
    ['Part names drift between netlist, BOM and README', 'd8202-ISS4.net · D8202-ISS5.bom · README', 'U1 is EL2280C in the netlist and EL5263IS on the BOM. U3–U16 all use the NE5532SO8 symbol, with OP275 values on U8–U16. The README\'s “Crystal CS8420” and “PIC16C54A (inferred)” are, per the BOM, a CS8427 and a PIC16C54RC/P, the RC-oscillator part (R41 4K7 + C46 27p).'],
    ['The clock is not really known', 'da301.pjt (Frequency=4000000, OSC_Settings, WDTEnable=0) · BOM PIC16C54RC/P', `The 4 MHz is the MPLAB simulator setting. The fitted part runs from R41/C46, typically 3–4 MHz ${inf}. That makes a pass ${SIM.fmtDur(1838*4/C.FOSC_PJT)} at 4 MHz or ${SIM.fmtDur(1838*4/C.FOSC_RC)} at 3.3 MHz. MAIN executes <span class="mono">clrwdt</span> every pass, so the code works whether or not the watchdog fuse is set; no hex or config bits are archived.`],
    ['ISS2 code began life as the Audio Bit Buddy', 'PCB/OBSOLETE/ISS2/D8202.ASM', 'Header “;ABB-1 AUDIO BIT BUDDY”. It reads the CS8412 error pins through a SEL line and TABLE1; its DELAY comment assumes 1.53 MHz.'],
    ['Last complete issue is ISS5', 'PCB/WORKING/D8202-ISS6.pcb (2010|43) · GERBERS/D8202-ISS6.STN (2009|42) · D8202 - #PNP #2016', 'An ISS6 layout and paste stencil exist with no BOM, netlist or Gerber set. The 2016|49 pick-and-place program is still ISS5 (<span class="mono">D8202-ISS5-T</span>).'],
  ];
  m.innerHTML = card('What the D8202 and its firmware are really up to', `<ol class="small" style="padding-left:20px">${F.map(f=>`<li style="margin-bottom:10px"><b>${f[0]}</b><br><span class="muted">${f[1]}</span><br>${f[2]}</li>`).join('')}</ol>`)
   + card('Main assumptions (inferred)', `<ul class="small">
      <li>CS8427 register semantics (RUN in reg 4 bit 6, reg 16 latched until read and ANDed with reg 17). The data sheets are not in the archive.</li>
      <li>Cable loss as skin effect (√f), calibrated so the manual's distances come out: 110 Ω pair CONF at ≈330 m without EQ and ≈600 m with; 75 Ω coax ≈1500 m with EQ. Thresholds: CONF below ${C.Q_CONF*100} % eye, lock below ${C.Q_LOCK*100} % or ${C.VEYE_MIN} V.</li>
      <li>PLL lock time ${SIM.fmtDur(C.LOCK_ACQ)}, power-up ${SIM.fmtDur(C.T_SUPPLY)} + 18 ms device-reset timer.</li>
      <li>CS4390 full scale 2.0 V rms differential; OP275 swing ±17.5 V.</li>
      <li>Front-edge orientation: pin 1 of P1 at the top, the same as the D8204 plugin. The handle is drawn over the three large holes.</li>
      <li>Mapping of P1 contacts to TB8205P terminal numbers (the TB8205P PCB is not decoded).</li></ul>`)
   + card('Files used', `<table class="kv small"><tr><td>Firmware</td><td class="mono">D8202 - #Engineering/Software/v100/v100.asm, V100.ERR, V100.$$$, da301.pjt</td></tr>
      <tr><td>Netlist / BOM / placement</td><td class="mono">PCB/OBSOLETE/ISS4/d8202-ISS4.net, D8202-ISS4.bom · PCB/D8202-ISS5.bom, D8202-ISS5.pnp</td></tr>
      <tr><td>Board artwork</td><td class="mono">PCB/GERBERS/D8202-ISS5.TOP, .BOT, .TSM, .SLK → assets/d8202-board-top.png · D8202-ISS5 - #Assembly.pdf</td></tr>
      <tr><td>Rear modules</td><td class="mono">8200 Series Rear Module options…/D8202 - rear module options.cdr (via its PDF) → assets/d8202-rear-tb8205p(75).svg · D8202TR1.CDR, D8202TR3.cdr (Inkscape)</td></tr>
      <tr><td>Manual</td><td class="mono">D8202MAN.WPD, d8202.pdf (1999|32)</td></tr>
      <tr><td>History</td><td class="mono">PCB/OBSOLETE/ISS2/D8202.ASM, D8202.BOM (1997|30)</td></tr></table>`);
}

/* ================================================================
   SCHEMATICS — redrawn from d8202-ISS4.net (net and pin names) + ISS4/ISS5 BOM values.
   Not the original P-CAD drawing.
   ================================================================ */
const K = {
  w(...p){ return `<polyline points="${p.map(q=>q.join(',')).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="1.3"/>`; },
  dot(x,y){ return `<circle cx="${x}" cy="${y}" r="2.6" fill="var(--ink)"/>`; },
  t(x,y,s,o){ o=o||{}; return `<text x="${x}" y="${y}" font-size="${o.fs||10.5}" fill="${o.c||'var(--ink)'}" text-anchor="${o.a||'start'}" ${o.b?'font-weight="700"':''} ${o.r?`transform="rotate(${o.r} ${x} ${y})"`:''}>${o.m?'<tspan font-family="monospace">':''}${s}${o.m?'</tspan>':''}</text>`; },
  net(x,y,s,a){ return K.t(x,y,s,{c:'var(--accent2)',a:a||'start',fs:10}); },
  res(x,y,h,ref,val){ // centred at x,y; leads ±20
    if (h) return `<path d="M${x-20},${y} h6 M${x+14},${y} h6" stroke="var(--ink)" stroke-width="1.3"/><rect x="${x-14}" y="${y-5}" width="28" height="10" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.3"/>`+K.t(x,y-8,ref+' '+val,{a:'middle',fs:9.5});
    return `<path d="M${x},${y-20} v6 M${x},${y+14} v6" stroke="var(--ink)" stroke-width="1.3"/><rect x="${x-5}" y="${y-14}" width="10" height="28" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.3"/>`+K.t(x+8,y+3,ref+' '+val,{fs:9.5});
  },
  cap(x,y,h,ref,val){
    if (h) return `<path d="M${x-20},${y} h17 M${x-3},${y-8} v16 M${x+3},${y-8} v16 M${x+3},${y} h17" stroke="var(--ink)" stroke-width="1.3" fill="none"/>`+K.t(x,y-11,ref+' '+val,{a:'middle',fs:9.5});
    return `<path d="M${x},${y-20} v17 M${x-8},${y-3} h16 M${x-8},${y+3} h16 M${x},${y+3} v17" stroke="var(--ink)" stroke-width="1.3" fill="none"/>`+K.t(x+10,y+3,ref+' '+val,{fs:9.5});
  },
  gnd(x,y){ return `<path d="M${x},${y} v6 M${x-8},${y+6} h16 M${x-5},${y+9} h10 M${x-2},${y+12} h4" stroke="var(--ink)" stroke-width="1.3"/>`; },
  oa(x,y,ref,plusTop){ // inputs at x (y∓12), output at x+56,y
    const a=plusTop?'+':'−', b=plusTop?'−':'+';
    return `<path d="M${x+6},${y-26} L${x+6},${y+26} L${x+52},${y} Z" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.4"/><path d="M${x},${y-12} h6 M${x},${y+12} h6 M${x+52},${y} h4" stroke="var(--ink)" stroke-width="1.3"/>`+K.t(x+10,y-8,a,{fs:12})+K.t(x+10,y+16,b,{fs:12})+K.t(x+22,y-28,ref,{fs:9.5,b:1});
  },
  ic(x,y,w,h,ref,val,pins){ // pins: [side,offset,num,name,net]
    let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4" rx="3"/>`+K.t(x+w/2,y-14,ref,{a:'middle',b:1})+K.t(x+w/2,y-3,val,{a:'middle',fs:9.5,c:'var(--ink2)'});
    pins.forEach(([sd,o,n,nm,net])=>{ if (sd==='L'){ s+=K.w([x-16,y+o],[x,y+o])+K.t(x+4,y+o+3.5,nm,{fs:9.5})+K.t(x-3,y+o-3,n,{fs:8.5,a:'end',c:'var(--ink2)'})+(net?K.net(x-20,y+o+3.5,net,'end'):''); }
      else { s+=K.w([x+w,y+o],[x+w+16,y+o])+K.t(x+w-4,y+o+3.5,nm,{fs:9.5,a:'end'})+K.t(x+w+3,y+o-3,n,{fs:8.5,c:'var(--ink2)'})+(net?K.net(x+w+20,y+o+3.5,net):''); } });
    return s;
  },
  hdr(x,y,n,ref,vert,on){ // n pins in a row, spacing 14; on = [a,b] pins joined by the jumper
    let s=''; for (let i=0;i<n;i++){ const px=vert?x:x+i*14, py=vert?y+i*14:y; s+=`<circle cx="${px}" cy="${py}" r="3.5" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.3"/>`+K.t(vert?px+6:px,vert?py+3.5:py-6,String(i+1),{fs:8,a:vert?'start':'middle',c:'var(--ink2)'}); }
    if (on){ const [a,b]=on; const ax=vert?x:x+(a-1)*14, ay=vert?y+(a-1)*14:y, bx=vert?x:x+(b-1)*14, by=vert?y+(b-1)*14:y; s+=`<rect x="${Math.min(ax,bx)-6}" y="${Math.min(ay,by)-6}" width="${Math.abs(bx-ax)+12}" height="${Math.abs(by-ay)+12}" rx="4" fill="var(--accent)" opacity=".35"/>`; }
    return s+K.t(vert?x-8:x-8, vert?y-8:y+16, ref,{fs:9.5,b:1,a:'end'});
  },
  led(x,y,ref,col,on){ return `<path d="M${x},${y-14} v6 M${x-7},${y-8} h14 L${x},${y+3} Z M${x-7},${y+3} h14 M${x},${y+3} v8" stroke="var(--ink)" stroke-width="1.3" fill="${on?col:'var(--panel)'}"/>`+K.t(x+10,y,ref,{fs:9.5}); },
  npn(x,y,ref){ return `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="var(--ink)" stroke-width="1.2"/><path d="M${x-13},${y} h7 M${x-6},${y-8} v16 M${x-6},${y-3} L${x+6},${y-11} M${x-6},${y+3} L${x+6},${y+11}" stroke="var(--ink)" stroke-width="1.3" fill="none"/>`+K.t(x+15,y+4,ref,{fs:9.5}); },
  port(x,y,s,right){ return `<path d="M${x},${y-6} h${right?-40:40} l${right?-6:6},6 l${right?6:-6},6 h${right?40:-40} z" fill="var(--chip)" stroke="var(--ink2)"/>`+K.t(x+(right?-24:24),y+3.5,s,{fs:9,a:'middle'}); },
};
function sheetInput(){
  const k=link(); const h1on = D.h1==='110'?[1,2]: D.h1==='75'?[2,3]: null; let s='';
  s+=K.port(70,70,'P1-2 IN+',true)+K.w([70,70],[90,70])+K.cap(110,70,1,'C14','0.1')+K.w([130,70],[160,70]);
  s+=K.port(70,150,'P1-1 IN−',true)+K.w([70,150],[160,150]);
  s+=`<path d="M160,70 v20 a8,8 0 0 1 0,16 a8,8 0 0 1 0,16 a8,8 0 0 1 0,16 v12 M188,70 v20 a8,8 0 0 0 0,16 a8,8 0 0 0 0,16 a8,8 0 0 0 0,16 v12 M172,86 v58 M176,86 v58" fill="none" stroke="var(--ink)" stroke-width="1.3"/>`+K.t(150,60,'T1 PE-65612',{fs:9.5,b:1})+K.w([160,150],[160,150]);
  s+=K.w([188,70],[250,70])+K.w([188,150],[188,160])+K.gnd(188,160)+K.net(196,90,'NET00096',);
  s+=K.dot(250,70)+K.w([250,70],[250,96])+K.hdr(236,110,3,'H1',false,h1on)+K.w([250,96],[250,110]);
  s+=K.w([236,110],[236,124])+K.w([264,110],[264,124]);
  s+=K.res(236,148,0,'','')+K.t(229,151,'R13 110R',{fs:9.5,a:'end'})+K.gnd(236,168)+K.res(264,148,0,'','')+K.t(272,151,'R14 75R',{fs:9.5})+K.gnd(264,168);
  s+=K.t(220,196,`H1: ${D.h1==='hiz'?'Hi Z':D.h1+' Ω'} (live)`,{fs:9.5,c:'var(--accent)'});
  s+=K.w([250,70],[310,70])+K.dot(310,70)+K.res(310,104,0,'R8','100K')+K.w([310,70],[310,84])+K.gnd(310,124);
  s+=K.res(350,70,1,'R9','110R')+K.w([370,70],[400,70])+K.dot(400,70)+K.t(392,50,'D1/D2 4148 → ±5 V',{fs:9,c:'var(--ink2)'});
  s+=K.w([400,70],[400,82])+K.w([400,82],[420,82])+K.oa(420,94,'U1A EL5263',true);   // + on top at y 82
  s+=K.w([420,106],[410,106],[410,140])+K.dot(410,140)+K.res(410,160,0,'R1','750')+K.gnd(410,180)+K.w([410,140],[460,140])+K.res(480,140,1,'R4','750')+K.w([500,140],[490,140])+K.w([500,140],[490,140]);
  s+=K.w([476,94],[510,94],[510,140],[500,140])+K.dot(510,94)+K.res(540,94,1,'R11','110R')+K.w([560,94],[580,94])+K.dot(580,94)+K.net(566,110,'NET00067');
  s+=K.res(620,94,1,'R5','750')+K.w([640,94],[660,94])+K.dot(660,94);
  // EQ network
  const eqc = D.eq? 'var(--accent)' : 'var(--ink2)';
  s+=K.w([580,94],[580,190])+`<path d="M580,190 L600,${D.eq?190:178}" stroke="${eqc}" stroke-width="2"/><circle cx="580" cy="190" r="2.5" fill="var(--ink)"/><circle cx="604" cy="190" r="2.5" fill="var(--ink)"/>`+K.t(560,210,'SW1 (EQ) '+(D.eq?'IN':'OUT'),{fs:9.5,b:1,c:eqc});
  s+=K.w([604,190],[620,190])+K.net(720,250,'NET00103 (SW1-6)')+K.w([620,150],[620,230])+K.res(640,150,1,'R6','330')+K.cap(680,150,1,'C7','1n')+K.res(640,190,1,'R12','110')+K.cap(680,190,1,'C13','220p')+K.res(640,230,1,'R10','DNI')+K.cap(680,230,1,'C9','DNI');
  s+=K.w([700,150],[710,150],[710,230],[700,230])+K.w([700,190],[710,190])+K.w([710,150],[710,94])+K.w([660,94],[710,94])+K.dot(710,94);
  s+=K.w([710,94],[730,94],[730,106])+K.w([730,106],[740,106])+K.oa(740,94,'U1B',true)+K.w([740,82],[730,82],[730,70])+K.gnd(730,70-0)+'';
  s+=K.w([710,94],[710,40],[810,40])+K.res(830,40,1,'R3','750')+K.w([850,40],[860,40],[860,94])+K.w([796,94],[860,94])+K.dot(860,94);
  s+=K.res(890,94,1,'R7','110R')+K.cap(940,94,1,'C10','0.1')+K.w([960,94],[980,94]);
  s+=K.t(560,250,'SW1-5 ↔ SW1-3: EQ LED (+5V → R16 330R) to GND',{fs:9,c:'var(--ink2)'});
  s+=K.ic(996,30,120,300,'U2','CS8427-CS (symbol “CS8420”)',[
    ['L',64,'4','RXP',''],['L',90,'5','RXN','C12 → GND'],['L',130,'8','FILT','R15 4K7+C16 .068 ‖ C15 6800p'],['L',160,'6','VA+','R2 10R/+5V'],['L',190,'9','RST','RESET ← RB1'],['L',220,'11','RERR','→ RB2'],
    ['R',20,'1','CDOUT','SDI → RA1'],['R',44,'2','CS','CS2 ← RA0'],['R',68,'27','CDIN','SDO ← RA3'],['R',92,'28','CCLK','SCK ← RA2'],['R',140,'10','RMCK','MCLK → U4-8'],['R',164,'16','OSCLK','SCLK → U4-9'],['R',188,'17','OLRCK','LRCK → U4-7'],['R',212,'18','SDOUT','SDATA → U4-10'],['R',250,'23','VD+','+5V'],['R',274,'7,22,24','GND','']]);
  s+=K.t(10,330,`Live: ${eyeTxt()}`,{fs:9.5,c:'var(--ink2)'});
  return `<svg viewBox="0 0 1260 345" style="width:100%">${s}</svg>`;
}
function sheetPIC(t){
  const Ld=ledsAt(t); let s='';
  s+=K.ic(330,40,150,250,'U7','PIC16C54RC/P · v100.asm',[
    ['L',20,'4','MCLR',''],['L',50,'16','OSC1',''],['L',80,'15','OSC2','n/c'],['L',120,'17','RA0','CS2 → U2-2'],['L',145,'18','RA1','SDI ← U2-1'],['L',170,'1','RA2','SCK → U2-28'],['L',195,'2','RA3','SDO → U2-27'],['L',230,'3','RTCC','n/c'],
    ['R',20,'6','RB0',''],['R',50,'7','RB1','RESET → U2-9'],['R',75,'8','RB2','RERR ← U2-11'],['R',100,'9','RB3','MUTEDAC → U4-15/16'],['R',130,'10','RB4',''],['R',160,'11','RB5',''],['R',190,'12','RB6',''],['R',225,'13','RB7','']]);
  s+=K.ic(120,20,90,60,'U6','MC34164',[['R',20,'1','RESET',''],['R',40,'2','VIN','+5V']])+K.w([226,40],[300,40],[300,60],[314,60])+K.w([300,40],[300,30])+K.res(300,10,0,'R39','4K7')+K.net(306,-6,'+5V');
  s+=K.res(200,90,1,'R41','4K7')+K.w([220,90],[314,90])+K.net(176,94,'+5V','end')+K.dot(240,90)+K.cap(240,115,0,'C46','27p')+K.w([240,90],[240,95])+K.gnd(240,135);
  const led=(y,x,col,lab,on,rn)=>K.w([496,y],[520,y])+K.res(540,y,1,rn,'330R')+K.w([560,y],[x,y],[x,y+6])+K.led(x,y+20,lab,col,on)+K.gnd(x,y+31);
  s+=led(170,590,'#ff3b30','ERROR',Ld.nolock,'R43')+led(200,660,'#ffd23a','CONF',Ld.conf,'R42')+led(230,730,'#55ff55','SIGNAL',Ld.lock,'R40');
  s+=K.w([496,265],[520,265])+K.res(540,265,1,'R19','4K7')+K.w([560,265],[580,265],[580,305],[600,305])+K.npn(613,305,'Q1 2N4401')+K.w([619,294],[619,290],[790,290])+K.w([619,316],[619,322])+K.gnd(619,322)+K.res(810,290,1,'R18','10R')+K.w([830,290],[840,290])+K.port(840,290,'P1-21 NO-LOCK',false);
  s+=K.w([496,60],[520,60])+K.res(540,60,1,'R88','4K7')+K.w([560,60],[600,60])+K.npn(613,60,'Q2 2N4401')+K.w([619,49],[619,35])+K.w([619,71],[619,85])+K.gnd(619,85)+K.res(680,35,1,'R87','10R')+K.w([619,35],[660,35])+K.w([700,35],[710,35])+K.port(710,35,'P1-22 CONF',false);
  s+=K.t(800,330,`OC now: NO-LOCK ${Ld.alNL?'ON':'off'}, CONF ${Ld.alCF?'ON':'off'}`,{fs:10,c:'var(--accent)'});
  s+=K.t(800,100,'EQ LED path (no PIC):',{fs:10,b:1})+K.t(800,116,'+5V → R16 330R → EQ LED → SW1-5 / SW1-3 → GND',{fs:9.5})+K.t(800,140,'Pin names: Microchip data sheet ('+'inferred).',{fs:9,c:'var(--ink2)'})+K.t(800,154,'Nets: d8202-ISS4.net.',{fs:9,c:'var(--ink2)'});
  return `<svg viewBox="0 -20 1000 360" style="width:100%">${s}</svg>`;
}
function sheetDAC(){
  let s='';
  s+=K.ic(40,30,120,250,'U4','CS4390-KS',[['L',30,'7','LRCK','← U2-17'],['L',55,'8','MCLK','← U2-10'],['L',80,'9','SCLK','← U2-16'],['L',105,'10','SDATA','← U2-18'],['L',140,'15,16','MUTE','MUTEDAC ← RB3'],['L',180,'3','VA','+5VA (L1)'],['L',210,'1,2,6,19,20','mode','NET00022 → R26 10R → +5VA'],['L',235,'4,5,11,12','GND',''],
    ['R',40,'17','AOUTL±',''],['R',75,'18','AOUTL∓',''],['R',150,'14','AOUTR±',''],['R',185,'13','AOUTR∓','']]);
  // U3A differential MFB
  s+=K.w([176,70],[200,70])+K.res(220,70,1,'R27','10K')+K.w([240,70],[260,70])+K.dot(260,70)+K.res(260,100,0,'R29','10K')+K.w([260,70],[260,80])+K.gnd(260,120)+K.cap(290,90,0,'C33','1n')+K.w([260,70],[290,70],[290,70])+K.gnd(290,110)+K.res(320,70,1,'R28','3K3')+K.w([340,70],[370,70])+K.dot(360,70)+K.cap(360,100,0,'C34','220p')+K.w([360,70],[360,80])+K.gnd(360,120);
  s+=K.w([176,105],[200,105],[200,150])+K.res(220,150,1,'R22','10K')+K.w([240,150],[260,150])+K.dot(260,150)+K.cap(260,180,0,'C25','1n')+K.w([260,150],[260,160])+K.gnd(260,200)+K.res(320,150,1,'R23','3K3')+K.w([280,150],[300,150])+K.w([260,150],[280,150])+K.w([340,150],[370,150])+K.dot(360,150);
  s+=K.w([370,70],[380,70],[380,96])+K.w([380,96],[390,96])+K.w([370,150],[380,150],[380,120],[390,120])+K.oa(390,108,'U3A NE5532',true);
  s+=K.cap(410,190,1,'C26','220p')+K.w([360,150],[360,190],[390,190])+K.w([430,190],[460,190],[460,108])+K.res(330,230,1,'R20','10K')+K.w([260,150],[260,150])+K.w([310,230],[270,230],[270,150])+K.w([350,230],[460,230],[460,190])+K.w([446,108],[480,108])+K.dot(460,108);
  // U3B MFB
  s+=K.res(500,108,1,'R24','10K')+K.w([520,108],[540,108])+K.dot(540,108)+K.cap(540,140,0,'C27','1n')+K.w([540,108],[540,120])+K.gnd(540,160)+K.res(580,108,1,'R25','3K3')+K.w([600,108],[620,108])+K.dot(615,108)+K.w([620,108],[620,96],[630,96])+K.oa(630,108,'U3B NE5532',false)+K.w([630,120],[625,120],[625,135])+K.gnd(625,135);
  s+=K.cap(660,60,1,'C28','220p')+K.w([615,108],[615,60],[640,60])+K.w([680,60],[700,60],[700,108])+K.res(620,190,1,'R21','10K')+K.w([540,108],[540,108])+K.w([600,190],[560,190],[560,108])+K.w([640,190],[700,190],[700,108])+K.w([686,108],[740,108])+K.dot(700,108)+K.net(712,100,'CHA → H2');
  s+=K.t(390,265,'Each MFB: f₀ = 1/(2π√(10K·3K3·1n·220p)) ≈ 59 kHz, Q ≈ 0.74; DC gain −1. U3A takes AOUTL+ − AOUTL−.',{fs:9.5,c:'var(--ink2)'});
  s+=K.t(390,280,'Right channel: U5 with R30–R38, C37–C41, C45 → CHB (identical). Polarity of pins 17/18 '+'inferred.',{fs:9.5,c:'var(--ink2)'});
  return `<svg viewBox="-90 0 990 295" style="width:100%">${s}</svg>`;
}
function sheetOut(){
  const Lv=levels(); const on2=v=>v==='24'?[1,2]:v==='18'?[3,4]:[5,6]; let s='';
  s+=K.net(10,64,'CHA')+K.w([34,60],[60,60],[60,40],[80,40])+K.w([60,60],[80,60])+K.w([60,60],[60,80],[80,80]);
  s+=K.res(100,40,1,'R50','0R')+K.res(100,60,1,'R54','10K')+K.res(100,80,1,'R56','15K');
  // H2 drawn as 2x3: pins (130..144, 40/60/80)
  [40,60,80].forEach((y,i)=>{ s+=`<circle cx="130" cy="${y}" r="3.5" fill="var(--panel)" stroke="var(--ink)"/><circle cx="148" cy="${y}" r="3.5" fill="var(--panel)" stroke="var(--ink)"/>`+K.t(156,y+3.5,['24','18','16'][i],{fs:9,c:'var(--ink2)'}); });
  const yy={ '24':40,'18':60,'16':80 }[D.h2]; s+=`<rect x="124" y="${yy-6}" width="30" height="12" rx="4" fill="var(--accent)" opacity=".35"/>`+K.t(120,24,'H2',{fs:9.5,b:1});
  s+=K.w([148,40],[148,80])+K.w([148,60],[190,60],[190,96])+K.dot(190,96)+K.res(190,126,0,'R53','10K')+K.gnd(190,146)+K.w([190,96],[210,96]);
  s+=K.oa(210,108,'U16A OP275',true)+K.w([210,120],[200,120],[200,170])+K.dot(200,170)+K.res(200,195,0,'R46','15K')+K.gnd(200,215)+K.w([200,170],[220,170])+K.res(240,170,1,'R47','15K')+K.res(290,170,1,'RV1','20K')+K.w([310,170],[320,170],[320,108])+K.w([266,108],[340,108])+K.dot(320,108)+K.t(270,190,`RV1 ${(D.rv1*100).toFixed(0)} % → ×${Lv.cl.g.toFixed(3)}`,{fs:9.5,c:'var(--accent)'});
  s+=K.res(360,108,1,'R49','15K')+K.w([380,108],[420,108])+K.dot(400,108)+K.cap(400,140,0,'C49','27p')+K.w([400,108],[400,120])+K.gnd(400,160)+K.net(404,100,'L bus');
  // drivers
  const drv=(x,y,ref,pp,pm,lab)=>K.oa(x,y,ref+'B',true)+K.w([x+56,y],[x+70,y],[x+70,y+30],[x-6,y+30],[x-6,y+12],[x,y+12])+K.res(x+100,y,1,pp[0],'30R')+K.w([x+56,y],[x+80,y])+K.port(x+160,y,pp[1],false)+K.w([x+120,y],[x+120,y])
    +K.w([x+70,y+30],[x+70,y+44])+K.res(x+70,y+64,0,'','')+K.t(x+62,y+67,'R45/R48 15K',{fs:9.5,a:'end'})+K.oa(x+90,y+96,ref+'A',false)+K.w([x+70,y+84],[x+90,y+84])+K.w([x+146,y+96],[x+176,y+96])+K.res(x+196,y+96,1,pm[0],'30R')+K.port(x+256,y+96,pm[1],false)+K.w([x+216,y+96],[x+216,y+96])+K.t(x+90,y+132,lab,{fs:9.5,c:'var(--ink2)'});
  s+=K.w([420,108],[440,108],[440,96],[460,96])+drv(460,108,'U8',['R44','P1-10 L1+'],['R51','P1-9 L1−'],`LEFT OUT 1: ${fmtDbu(Lv.outs[0].dbu)}`);
  s+=K.t(460,262,'U9 → P1-8/7 (R52/R58) LEFT OUT 2 — same circuit.',{fs:9.5,c:'var(--ink2)'});
  // H3 + mono
  s+=K.w([440,108],[440,300],[480,300])+K.hdr(480,300,3,'H3',false, D.h3==='stereo'?[1,2]:[2,3])+K.w([494,300],[494,330],[540,330])+K.t(545,334,`→ U10 → P1-12/11 LEFT OUT 3 / MONO 1 (${D.h3})`,{fs:9.5});
  s+=K.w([508,300],[508,280],[620,280])+K.net(626,284,'NET00088 = U11A out (mono)');
  s+=K.t(10,250,'U11 mono: L bus → R62 15K, R bus → R66 15K → U11B (−), R63 7K5 feedback → −(L+R)/2;',{fs:9.5})+K.t(10,264,'U11A: R67 15K in, R65 15K feedback → +(L+R)/2 → H3-3 and H4-3.',{fs:9.5})+K.t(10,282,`Mono level now ${fmtDbu(dbu(2*Lv.mono*Lv.kl))}.`,{fs:9.5,c:'var(--accent)'});
  s+=K.t(10,320,'Right channel: CHB → H5 (R83 0R, R85 10K, R86 15K; R84 10K) → U16B (R78, R79, RV2) → R82 → R bus (C72)',{fs:9.5,c:'var(--ink2)'})+K.t(10,334,'→ U13 (P1-16/15), U14 (P1-18/17), H4 → U12 (P1-20/19).',{fs:9.5,c:'var(--ink2)'});
  return `<svg viewBox="0 0 900 345" style="width:100%">${s}</svg>`;
}
function sheetPower(){
  let s='';
  s+=K.port(60,50,'P1-29/30 V+',true)+K.w([60,50],[80,50])+K.res(100,50,1,'F2','RXE-050')+K.w([120,50],[140,50])+`<path d="M140,42 L156,50 L140,58 Z M156,42 v16" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.3"/>`+K.t(140,36,'D4 1N4003',{fs:9.5})+K.w([156,50],[220,50])+K.dot(200,50)+K.cap(200,80,0,'C20','220/35')+K.w([200,50],[200,60])+K.gnd(200,100)+K.net(224,54,'+VA → op-amp V+');
  s+=K.port(60,150,'P1-25/26 V−',true)+K.w([60,150],[80,150])+K.res(100,150,1,'F1','RXE-050')+K.w([120,150],[140,150])+`<path d="M156,142 L140,150 L156,158 Z M140,142 v16" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.3"/>`+K.t(140,136,'D3 1N4003',{fs:9.5})+K.w([156,150],[220,150])+K.dot(200,150)+K.cap(200,180,0,'C19','220/35')+K.w([200,150],[200,160])+K.gnd(200,200)+K.net(224,154,'−VA → op-amp V−');
  s+=K.port(60,240,'P1-27/28 GND',true)+K.w([60,240],[80,240])+K.gnd(80,240);
  s+=K.w([330,50],[330,80])+K.dot(330,50)+K.w([300,50],[330,50])+K.res(330,100,0,'R17','2R2 ½W')+K.ic(380,110,110,80,'REG2','LM2596 buck',[['L',20,'1','VIN',''],['L',50,'3,5','GND',''],['R',20,'2','OUT','D5 SK33 + L2'],['R',50,'4','FB','']])+K.w([330,120],[330,130],[364,130]);
  s+=K.t(520,124,'L2 PE-53823 → C24 220/35 → L3 AL05 → +5V (PIC, CS8427, EL5263 +)',{fs:9.5})+K.t(520,140,'                      → L1 AL05 → +5VA (CS4390)',{fs:9.5});
  s+=K.ic(380,230,110,50,'REG1','MC79L05ACZ',[['L',25,'3','IN','−VA'],['R',25,'2','OUT','−5 V → U1 V−']]);
  s+=K.t(380,310,'Manual: +20 V 177 mA, −20 V 150 mA max. F1/F2 are polyfuses (RXE-050).',{fs:9.5,c:'var(--ink2)'});
  return `<svg viewBox="0 0 900 320" style="width:100%">${s}</svg>`;
}
function viewSchem(m){
  window.__d8202Active=false;
  m.innerHTML = `<div class="card"><p class="small" style="margin:0"><b>Redrawn, not the original CAD.</b> Every net name and pin number below is from <span class="mono">PCB/OBSOLETE/ISS4/d8202-ISS4.net</span>; <span class="mono">d8202-ISS5.sch</span> is a byte-for-byte copy of the ISS4 sheet. Values are from <span class="mono">D8202-ISS4.bom</span> / <span class="mono">D8202-ISS5.bom</span>. Device pin <i>names</i> (RXP, CDOUT, MCLR…) come from the manufacturers' data sheets, which are not in the archive (${inf}). Jumpers, SW1, LEDs and trims follow the simulator state.</p></div>
   ${card('Sheet 1 — Input, cable EQ and AES receiver', `<div id="s1"></div>`)}
   ${card('Sheet 2 — PIC16C54, status LEDs and alarm outputs', `<div id="s2"></div>`)}
   ${card('Sheet 3 — DAC and reconstruction filters (left; right is identical)', `<div id="s3"></div>`)}
   ${card('Sheet 4 — Level, mono sum and balanced outputs', `<div id="s4"></div>`)}
   ${card('Sheet 5 — Power', `<div id="s5"></div>`)}
   ${card('P1 (EDAC 30-way) and rear-module terminals', p1HTML())}`;
  const draw=()=>{ const t=SIM.t; m.querySelector('#s1').innerHTML=sheetInput(); m.querySelector('#s2').innerHTML=sheetPIC(t); m.querySelector('#s3').innerHTML=sheetDAC(); m.querySelector('#s4').innerHTML=sheetOut(); m.querySelector('#s5').innerHTML=sheetPower(); };
  SIM.on('time', draw);
}
function p1HTML(){
  const r=[['1 / A','P1-1','IN−','T1-2','IN −'],['2 / 1','P1-2','IN+','C14 → T1-1','IN +'],['10 / 5','P1-10','L1+','R44 ← U8B','OUT+ 1'],['9 / E','P1-9','L1−','R51 ← U8A','OUT+ 2'],['8 / 4','P1-8','L2+','R52 ← U9B','OUT+ 3'],['7 / D','P1-7','L2−','R58 ← U9A','OUT+ 4'],['12 / 6','P1-12','L3+ / MONO 1+','R59 ← U10B','OUT+ 5'],['11 / F','P1-11','L3− / MONO 1−','R64 ← U10A','OUT+ 6'],
    ['16 / 8','P1-16','R1+','R72 ← U13B','OUT− 1'],['15 / J','P1-15','R1−','R75 ← U13A','OUT− 2'],['18 / 9','P1-18','R2+','R76 ← U14B','OUT− 3'],['17 / K','P1-17','R2−','R81 ← U14A','OUT− 4'],['20 / 10','P1-20','R3+ / MONO 2+','R68 ← U12B','OUT− 5'],['19 / L','P1-19','R3− / MONO 2−','R71 ← U12A','OUT− 6'],
    ['22 / 11','P1-22','CONF','R87 ← Q2','OUT− 7'],['21 / M','P1-21','ALARM (no lock)','R18 ← Q1','OUT− 8'],['25,26 / P,13','','V−','F1','—'],['27,28 / R,14','','GND','','G'],['29,30 / S,15','','V+','F2','—']];
  return `<table class="kv"><tr><th>pin / contact</th><th>net</th><th>signal</th><th>on the card</th><th>TB8205P terminal ${inf}</th></tr>${r.map(x=>`<tr><td class="mono">${x[0]}</td><td class="mono">${x[1]}</td><td>${x[2]}</td><td class="mono small">${x[3]}</td><td class="small">${x[4]}</td></tr>`).join('')}</table>
   <p class="small muted">Contact letters per the EDAC30\\156 part in d8202-ISS5.sch (odd pins A–S, even pins 1–15). Older rear options (D8202TR1/TR3 CorelDRAW, converted with Inkscape): QC8200 (QCP), TB8205 screw, ST8200 and ST8201A solder terminals, with the same signal list.</p>`;
}

/* ================================================================
   REGISTER
   ================================================================ */
SIM.register({
  id:'d8202', name:'D8202 · AES/EBU to analog converter card (2005|38)', duration:1,
  product:'D8202', year:2005, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8202 - #Master #MF82',
  summary:'MF82 plug-in card that converts one AES/EBU input to three balanced analog stereo outputs, or two stereo plus two mono. A PIC16C54 running V1.00 (2005|38) configures and polls a CS8427 receiver over bit-banged SPI. A CS4390 DAC feeds jumper-ranged, trimmed OP275 line drivers.',
  highlights:['Board rendered from the ISS5 production Gerbers, every jumper and trim live','The real v100.asm assembled and executed instruction by instruction','Cable + EQ eye model drives the CONF / lock LEDs','SPI traffic to the CS8427 down to single CCLK edges','8-step setup tutorial from the 1999 manual','20 findings: dead transmitter mute, unread RERR pin, a 15-minute TRIS fix'],
  footnotes:[
    {text:'Rear-module art: the TB8205P and TB8205P/75 panels are vectors of the 2012 CorelDRAW guide (via its Corel PDF export, because libcdr renders the terminal-block symbol font as giant text).', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8202 - rear module options.cdr'},
    {text:'The guide captions the TB8205P cell “D8202-AES/EBS Digital to Analog Converter”: EBS is a typo for EBU (the /75 cell spells it right).', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8202 - rear module options.cdr'},
    {text:'The guide stars LEFT/RIGHT OUT 3 / MONO as “can be used as an alarm by setting the jumpers”; the older D8202TR1.CDR says the jumper selects a third stereo output or two mono sums, which is what the board does.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8202 - rear module options.cdr'},
    {text:'The 2010 manual page D8202tr3_1.cdr still shows the ST8200 / ST8201A solder terminals, with the ST8200 marked “no longer manufactured”.', src:'#MF8200 #SERIES/D8202 - #Master #MF82/D8202 - #Engineering/D8202tr3_1.cdr'},
    {text:'D8202TR1.CDR and D8202TR3.cdr show a QC8200QCP quick-connect option and a TB8205 screw terminal that the 2012 guide no longer offers.', src:'#MF8200 #SERIES/D8202 - #Master #MF82/D8202 - #Engineering/D8202TR1.CDR'},
    {text:'D8202TR2.CDR and D8202TR3.CDR are stored twice: once in D8202 - #Engineering and again (1998 versions) in PCB/OBSOLETE/ISS2.', src:'#MF8200 #SERIES/D8202 - #Master #MF82/D8202 - #Engineering/PCB/OBSOLETE/ISS2/D8202TR3.CDR'},
  ],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass', period:()=>R_avg()*TCY(), phase:()=>{ const p=run().passes[0]; return p? cyc2t(p.c) % (R_avg()*TCY()) : 0; }},
    {label:'1 SPI byte (8 bits)', period:()=>45*TCY()},
    {label:'1 PIC instruction cycle', period:()=>TCY()},
    {label:'1 AES block (192 frames)', period:()=>192/D.fs},
    {label:'1 AES frame', period:()=>1/D.fs},
    {label:'1 AES half-cell', period:()=>1/(128*D.fs)},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms'],[0.002,'1 main-loop pass (2 ms)'],[0.0002,'200 µs (SPI bytes)'],[0.00004,'40 µs (SPI bits)'],[4/48000,'4 AES frames (83 µs)']],
  defaultZoom:1,
  init(){ RUN_KEY=''; LINK_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: setting up a D8202', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
