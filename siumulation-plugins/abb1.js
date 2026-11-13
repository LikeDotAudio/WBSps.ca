/* =====================================================================
   ABB-1 "Audio Bit Buddy" — portable AES/EBU, S/PDIF and analog monitor
   (Ward-Beck Systems, 1997|30 – 2009|42). Plugin for the WBS Device Simulator.

   How this model works
   --------------------
   The PIC firmware is not re-written by hand: the plugin carries the real
   source (ABB1 - #Engineering/V100/abb1v103.asm, rebuilt line-for-line into
   v1.00/1.01/1.02 from the archived diffs), assembles it with a small MPASM-
   compatible assembler (default radix HEX, BANK0/BANK1 macros, ORG/RES/EQU)
   and runs it instruction by instruction on a PIC16F73 core model clocked at
   6.144 MHz (1 instruction cycle = 651.04 ns). The receiver (CS8412/CS8414),
   the 74HC00 FCK gate, the switches, the status-LED matrix and the meter bars
   are modelled around it. Every timing on the timeline comes out of that run.

   Sources used (all in the archive, folder "ABB1 - #Master"):
   - ABB1 - #Engineering/V100/ABB1V100.ASM, ABB1V101.ASM, abb1v102.asm, abb1v103.asm,
     ABB1V100.PJT, *.ERR, ABB1V103.$$$          (firmware, project, build logs)
   - ABB-1 SCH PG1.pdf, ABB-1 SCH PG2.pdf       (schematics, Feb 10 2000)
   - ABB1 - #ISS2 #PCB/ABB-1-iss2.net, .ECO     (P-CAD 2002 netlist, 2008|41–2009|42)
   - ABB-1MAN.pdf (manual, 2005|38), ABB-1SLS.WPD (sales sheet / spec)
   - ABBFSLK2.cdr (front silkscreen, two separations with drill crosshairs),
     ABBFRNT.DXF (front panel drilling, 1998|31), ABB-1SLK.CDR (rear guide line),
     ABB1.cdr (functional block diagram), Bit Buddy Front.JPG / Rear.JPG (2010|43)
   Panel artwork in assets/: abb1-front-white.png and abb1-front-green.png were
   cut from ABBFSLK2.cdr (CorelDRAW → SVG, crosshairs removed, registered to the
   DXF drill positions, inks recoloured from the photo). The Hobo title and the
   rear-panel ink are lifted from the photos after a perspective rectification
   onto the DXF/crosshair coordinates (abb1-front-photo.jpg / abb1-rear-photo.jpg).
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;

/* ================================================================
   1. FIRMWARE SOURCE (abb1v103.asm, verbatim, CR/LF and ^Z removed)
   ================================================================ */
const SRC103 = "\tERRORLEVEL -302\n;      ABB-1 AUDIO BIT BUDDY\n\n\t;LIST\tP=16C73A\n\t#INCLUDE \"P16f73.INC\"\n;\tversion1.01 - update reports 44056 as 44100\n;\tversion1.02 - update PICf73\n;\tversion1.03 - updata cs8414\n\n\n;\tMOVLW 100\n;************ CPU CONTROL MACROS **********\n\nBANK0\tMACRO\n\tBCF STATUS,5\n\tBCF STATUS,6\n\tENDM\n\nBANK1\tMACRO\n\tBSF STATUS,5\n\tBCF STATUS,6\n\tENDM\n\nBINIT\tEQU 0X4F\n;************ PROGRAM CONSTANTS*************\n\n\nZ\tEQU 2\t\t;ZER0 FLAG IN STATUS REG\n\nSEL0\tEQU 5\nSEL1\tEQU 3\nSEL2\tEQU 2\nSEL3\tEQU 7\nSEL4\tEQU 6\nSEL5\tEQU 4\n\n\n\n\n;*************  BANK0  RAM *****************\n\tORG 20H \t;BANK0 MEMORY \n\n\n;\n\nMUX\tRES 1\t;HOLDS MUX STSATUS\nSTATERR\tRES 1\t;\nERR\tRES 1\n\nFREQ\tRES 1\nSTAT\tRES 1\n;\tTEMP RAM REGISTERS\nTEMP\tRES 1\nTEMP2\tRES 1\n\n\n\nDELAY1\tRES 1\t\t;TEMP REG FOR DELAY ROUTINES\nDELAY2\tRES 1\t\t;TEMP REG FOR DELAY ROUTINES\n\n\n\n;********************  BANK 1 FILE REISTERS*****************\n\n\n;    160 THROUGH 256 ARE GENERAL PURPOSE REGISTERS\n\n\n\n\n;***************  RESET  ****************************\n\tORG 0\nRESET   CALL INIT\n\tGOTO MAIN\n\n;*************\tINTERRUPTS  *************************\n\n\tORG 4H\n\tRETFIE\n;******  TABLE LOOKUP ****************************\n;ERROR\nTABLE1\tADDWF PCL\n\tRETLW B'01000000'\n\tRETLW B'10000000'\n\tRETLW B'00010000'\n\tRETLW B'00100000'\t;\n\tRETLW B'00000010'\n\tRETLW B'00001000'\n\tRETLW B'00000001'\n\tRETLW B'00000100'\n\tNOP\n\tNOP\n;FREQ\nTABLE2\tADDWF PCL\n\tRETLW B'00100000'\n\tRETLW B'00100000'\n\tRETLW B'00100000'\n\tRETLW B'00100000'\t;\n\tRETLW B'00100000'\n\tRETLW B'01000000'\t;48\n\tRETLW B'10000000'\t;44.1\n\tRETLW B'00010000'\t;32\n\tNOP\n\tNOP\n;************** INIT  ******************************\n\nINIT\n\tMOVLW 0XFF\n\tMOVWF DELAY2\n\tCALL DELAY\t\n\n\tMOVLW\t0XFF\n\tMOVWF PORTB\n\tCLRF PORTC\n\tBSF PORTC,6\n\tBSF PORTC,4\n\tBANK1\n\tCLRF TRISB\t;PORTB IS OUTPUT\n \tBSF TRISB,0\t;PORTB 0 IS AN INPUT\n\tBSF TRISB,1\t;PORTB 1 IS AN INPUT\n\tBCF OPTION_REG,7\t;ENABLE PORT B WEAK PULL-UPS\n\t\n\tCLRF TRISC\n\tBSF TRISC,3\t;CBL INPUT\n\t\n\n\n\t;BCF TRISA,2\t;DATAA PIN IS OUTPUT\n\tBSF ADCON1,PCFG2\t;porta is digital i/o\n\tBSF ADCON1,PCFG1\n\n\tBANK0\n\n\n\tMOVLW\t0XFF\n\tMOVWF PORTB\n\tCLRF PORTC\n\tBSF PORTC,6\n\tBSF PORTC,4\n\n;-----------TEST LEDS ON POWER UP-------------------\nTEST\t\n\tBSF PORTB,SEL0\n\tBSF PORTB,SEL1\n\tBSF PORTB,SEL2\n\tBSF PORTB,SEL3\n\tBCF PORTC,SEL4\n\tBCF PORTC,SEL5\n\n;48\n\tBCF PORTB,SEL3\n\tBSF PORTC,SEL4\t\n\tCALL DELVIS\n;44\n\tBCF PORTC,SEL4\n\tBSF PORTC,SEL5\n\tCALL DELVIS\t\n\n;32\n\tBSF PORTC,SEL4\n\tBCF PORTC,SEL5\n\tBCF PORTB,SEL2\n\tBSF PORTB,SEL3\n\tCALL DELVIS\n\n;OUT\n\tBCF PORTC,SEL4\n\tBSF PORTC,SEL5\n\tCALL DELVIS\n\n;CON\n\tBCF PORTC,SEL5\n\tBSF PORTB,SEL2\n\tBSF PORTC,SEL4\n\tBCF PORTB,SEL1\n\tCALL DELVIS\n;PRE\n\tBCF PORTC,SEL4\n\tBSF PORTC,SEL5\n\n\tCALL DELVIS\n;AUDIO\n\tBCF PORTC,SEL5\n\tBSF PORTB,SEL1\n\tBSF PORTC,SEL4\n\tBCF PORTB,SEL0\n\tCALL DELVIS\n;ERR\n\tBCF PORTC,SEL4\n\tBSF PORTC,SEL5\n\tCALL DELVIS\n\tBSF PORTB,SEL0\n\tBSF PORTC,SEL5\n\t\n\n;-----------SETUP TIMER2 -------\n\n;T2CON\n\tBANK1\n\tMOVLW 0XFF\n\n\tMOVWF PR2\t;PERIOD REGISTER\n\t\n\tBSF PIE1,1\t;ENABLE TIMER2 INTERUPT\n\tBANK0\n\n\tCLRF T2CON\t; BOTH PRESCALES 0, TIMER2 OFF\n\tBSF T2CON,1\t;PRESCALE=16\n\tBSF T2CON,6\n\tBSF T2CON,5\n\tBSF T2CON,2\t;TIMER2 ON\n\n\tRETURN\n\t\n\tRETURN\n\nDELVIS\t\n\n\tMOVLW 0X2F\n\tMOVWF DELAY2\n\tCALL DELAY\n\treturn\n\n\t\n\n;**************  MAIN  ******************************\n\n;main routine tests power switch position for analog or digital\n; and sets input relay accordingly, then goes to analog or digital routine\n\nMAIN\tCLRWDT\n\tBTFSS PORTB,1\t;MUST BE ANALOG IF SET\n\tGOTO DIG\t;MUST BE DIGITAL\n\tBTFSS PORTB,1\t; TEST SEVERAL TIMES FOR BEBOUNCE\n\tGOTO DIG\t\n\tBTFSS PORTB,1\t\n\tGOTO DIG\n\tBTFSS PORTB,1\t\n\tGOTO DIG\n\tBTFSS PORTB,1\t\n\tGOTO DIG\t\n\tBTFSS PORTB,1\t\n\tGOTO DIG\n\tGOTO SETA\t;MUST BE ANALOG - SET  RELAY\n\t\nDIG\tBTFSC PORTB,1\t;MUST BE DIGITAL IF CLEAR\n\tGOTO MAIN\t;MUST BE ANALOG\n\tBTFSC PORTB,1\t; TEST SEVERAL TIMES FOR BEBOUNCE\n\tGOTO MAIN\t\n\tBTFSC PORTB,1\t\n\tGOTO MAIN\n\tBTFSC PORTB,1\t\n\tGOTO MAIN\n\tBTFSC PORTB,1\t\n\tGOTO MAIN\t\n\tBTFSC PORTB,1\t\n\tGOTO MAIN\n\tGOTO SETD\t;MUST BE DIGITAL - SET  RELAY\n\tNOP\n\tNOP\n\tGOTO MAIN\n  \n;----- SET RELAY FOR ANALOG\nSETA\tBCF PORTB,4\t;ENERGIZE COIL\n\tBCF PORTC,SEL4\t;TURN OFF STATUS LEDS\n\tBCF PORTC,SEL5\n\tBCF PORTC,0\t;TURN OFF FCK\n\tBCF PORTC,1\n\tMOVLW 15\n\tMOVWF DELAY2\n\tCALL DELAY\n\tBSF PORTB,4\t;DE-ENERGIZE COIL\n\tGOTO ANALOG \n\t\t\n;----- SET RELAY FOR DIGITAL\nSETD\tBCF PORTB,6\t;ENERGIZE COIL\n\tBCF PORTC,SEL4\t;TURN OFF STATUS LEDS\n\tBCF PORTC,SEL5\n\tMOVLW 15\n\tMOVWF DELAY2\n\tCALL DELAY\n\tBSF PORTB,6\t;DE-ENERGIZE COIL\n\tBSF PORTC,0\t;ENABLE OSCILLATOR\n\tBSF PORTC,1\n\tGOTO DIGITAL \n\nINIT2\tCLRWDT\n\tBANK1\n\tCLRF TRISB\t;PORTB IS OUTPUT\n \tBSF TRISB,0\t;PORTB 0 IS AN INPUT\n\tBSF TRISB,1\t;PORTB 1 IS AN INPUT\n\tBCF OPTION_REG,7\t;ENABLE PORT B WEAK PULL-UPS\n\t\n\tCLRF TRISC\n\tBSF TRISC,3\t;CBL INPUT\n\t\n\n\tBSF ADCON1,PCFG2\t;porta is digital i/o\n\tBSF ADCON1,PCFG1\n\n\tBANK0\n\tRETURN\n;T2CON\n\tBANK1\n\tMOVLW 0XFF\n\n\tMOVWF PR2\t;PERIOD REGISTER\n\t\n\tBSF PIE1,1\t;ENABLE TIMER2 INTERUPT\n\tBANK0\n\n\tCLRF T2CON\t; BOTH PRESCALES 0, TIMER2 OFF\n\tBSF T2CON,1\t;PRESCALE=16\n\tBSF T2CON,6\n\tBSF T2CON,5\n\tBSF T2CON,4\n\tBSF T2CON,4\n\tBSF T2CON,2\t;TIMER2 ON\n\n\n\tRETURN\n\n\n;************************ANALOG MODE **********************\n\nANALOG\tCLRWDT\n\tCALL INIT2\n\tBTFSS PORTB,1\t;MUST BE ANALOG IF SET\n\tGOTO RESET\t;MUST BE DIGITAL\n\tBTFSS PORTB,1\t; TEST SEVERAL TIMES FOR BEBOUNCE\n\tGOTO RESET\t\n\tBTFSS PORTB,1\t\n\tGOTO RESET\n\tBTFSS PORTB,1\t\n\tGOTO RESET\n\tBTFSS PORTB,1\t\n\tGOTO RESET\n;\tBCF PORTC,SEL4\t;MAKE SURE STAT DISPLAY IS OFF\n;\tBCF PORTC,SEL5\n\n;MUX LEFT AND RIGHT METER, TOGGLE MUX,0 TO KEEP TRACK!\n\n\tBTFSC PIR1,1\t;TEST TIMER 2 INT FLAG\n\tGOTO MUXUP\n\tGOTO ANALOG\n\nMUXUP\tBCF  PIR1,1\t;CLEAR TIMER INT FLAG\n\n;\tMOVLW 0XFF\n;\tMOVWF PR2\t;PERIOD REGISTER\n\tBANK1\n\tMOVLW 0XDF\n\n\tMOVWF PR2\t;PERIOD REGISTER\n\t\n\tBSF PIE1,1\t;ENABLE TIMER2 INTERUPT\n\n\tBANK0\n\tCLRF T2CON\t; BOTH PRESCALES 0, TIMER2 OFF\n\n\tBSF T2CON,1\t;PRESCALE=16\n\tBCF T2CON,6\n\tBSF T2CON,5\n\tBCF T2CON,4\n\tBCF T2CON,3\n\tBSF T2CON,2\t;TIMER2 ON\n\n\tBTFSC MUX,0\n\tGOTO MUX1\n\t\t\t\t\n\tBCF PORTC,SEL4\t;LEFT 4053\n\tBCF PORTC,5\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tBSF PORTC,SEL5\t;TURN ANALOG SWITCH ON\n\tBCF PORTB,SEL0\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tBSF PORTC,7\t;LEFT BAR\n\tBSF MUX,0\n\tGOTO ANALOG\nMUX1\tBCF MUX,0\n\tBSF PORTB,SEL0\n\tBCF PORTC,SEL5\t;TURN OFF SWITCH\n\tBCF PORTC,7\t;TURN OFF BAR\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tBSF PORTC,SEL4\t;RIGHT 4053\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\n\tBSF PORTC,5\t;RIGHT BAR\n\tGOTO ANALOG\n\n\n;************************DIGITAL MODE **********************\n\nDIGITAL\n\tBTFSC PORTB,1\t;MUST BE DIGITAL IF CLEAR\n\tGOTO RESET\t;MUST BE ANALOG\n\tBTFSC PORTB,1\t; TEST SEVERAL TIMES FOR BEBOUNCE\n\tGOTO RESET\t\n\tBTFSC PORTB,1\t\n\tGOTO RESET\n\tBTFSC PORTB,1\t\n\tGOTO RESET\n\tBTFSC PORTB,1\t\n\tGOTO RESET\n\n;WAIT FOR CBL TRANSITION\n\t\n;\tBTFSS PORTC,3\n;\tGOTO CBL1\nCBL0\tBTFSS PORTC,3\t;WAIT FOR CBL=1\n\tGOTO\tCBL0 \n;\tGOTO CBLOK\n;CBL1\tBTFSC PORTC,3\t;WAIT FOR CBL=0\n;\tGOTO CBL1\n\n;READ ERROR FLAGS CHECK FOR LOCK\n\nCBLOK\tCLRF ERR\n\tBCF PORTC,2\t;SEL LINE LOW\n\tBTFSC PORTA,5\n\tBSF ERR,0\n\tBTFSC PORTA,4\n\tBSF ERR,1\n\tBTFSC PORTA,3\n\tBSF ERR,2\n\tMOVF ERR,W\n\tCALL TABLE1\t;\n\tMOVWF ERR\n\n;READ FREQUENCY\n\tCLRF FREQ\n\tBTFSC PORTA,2\n\tBSF FREQ,0\n\tBTFSC PORTA,0\n\tBSF FREQ,1\n\tBTFSC PORTA,1\n\tBSF FREQ,2\n\n;READ CHANNEL STATUS\n\tCLRF TEMP\n\tCLRF STAT\n\tBSF PORTC,2\t;SEL LINE SHOULD BE HIGH\n\tBCF PORTC,0\t;SELECT SUBFRAME 0 CS12\\FCK=0\n\tMOVF PORTA,W\n\tMOVWF TEMP\n\tBCF PORTC,1\t;SELECT SUBFRAME 1 CS12\\FCK=1\n\tMOVF PORTA,W\n\tMOVWF STAT\n\tBSF PORTC,0\t;TURN OSC BACK ON\n\tBSF PORTC,1\n\tBCF PORTC,2\t;BRING SEL LOW\n\n;'OR' SUB FRAME STAT\n\n\tBTFSC TEMP,0\n\tBSF STAT,0\n\tBTFSC TEMP,1\n\tBSF STAT,1\n\tBTFSC TEMP,2\n\tBSF STAT,2\n\tBTFSC TEMP,3\n\tBSF STAT,3\n\tBTFSC TEMP,4\n\tBSF STAT,4\n\tBTFSC TEMP,5\n\tBSF STAT,5\n\t\n\tMOVF FREQ,W\n\tCALL TABLE2\t;\n\tMOVWF FREQ\n\t\n;TEST FOR EMPHASIS\n\tBTFSS STAT,2\n\tBSF FREQ,3\n;TEST FOR AUDIO\n\tBTFSC STAT,4\n\tBSF FREQ,0\n;TEST FOR PRO\\CONSUMER\n\tBTFSC STAT,5\n\tBSF FREQ,1\n;TEST FOR RCV\\ERROR\n\tBTFSS STAT,1\n\tBSF FREQ,2\n\tBTFSC FREQ,1\n\tBCF FREQ,2\n\n; IS IT IN STATUS OR ERROR MODE ?\n\nSTST\tBTFSC PORTB,0\t;MUST BE STATUS IF CLEAR\n\tGOTO ERRTST\t;MUST BE ERROR\n\tBTFSC PORTB,0\t; TEST SEVERAL TIMES FOR BEBOUNCE\n\tGOTO ERRTST\t\n\tBTFSC PORTB,0\t\n\tGOTO ERRTST\n\tBTFSC PORTB,0\t\n\tGOTO ERRTST\n\tBTFSC PORTB,0\t\n\tGOTO ERRTST\n\tGOTO READSTAT\n\nERRTST\tBTFSS PORTB,0\t;MUST BE ERROR IF SET\n\tGOTO STST\t;MUST BE STAT\n\tBTFSS PORTB,0\t;TEST SEVERAL TIMES FOR BEBOUNCE\n\tGOTO STST\t\n\tBTFSS PORTB,0\t\n\tGOTO STST\n\tBTFSS PORTB,0\t\n\tGOTO STST\n\tBTFSS PORTB,0\t\n\tGOTO STST\n\tGOTO READERR\n\n;--READ STATUS BITS ----\nREADSTAT\n\tCLRWDT\t\t\n\tBTFSC PORTC,3\n\tGOTO READSTAT\n\tCALL INIT2\n\tMOVF FREQ,W\n\tMOVWF STATERR\n\tBTFSC ERR,2\n\tCLRF STATERR\t;BLANK DISPLAY IF NO LOCK\n\tBTFSS ERR,6\n\tBSF STATERR,2\t;INDICATE ERROR IF ANY ERROR ACTIVE\n\n\tGOTO DIGMUX\n\n;--READ ERROR BITS -----\nREADERR\tCLRWDT\n\tBTFSC PORTC,3\n\tGOTO READERR\n\tCALL INIT2\n\tMOVF ERR,W\n\tMOVWF STATERR\n\n\n;----------------------------------------------\n;MUX LEFT AND RIGHT METER, TOGGLE MUX,0 TO KEEP TRACK!\n;MUX STATUS LEDS\nDIGMUX\t\n\n\tBTFSC MUX,0\n\tGOTO MUX1D\n\tBCF PORTC,5\n\tBCF PORTC,SEL4\n\tBCF PORTC,SEL5\n\tBSF PORTB,SEL0\n\tBSF PORTB,SEL1\n\tBSF PORTB,SEL2\n\tBSF PORTB,SEL3\n\n\tBTFSC STATERR,3\n\tBCF PORTB,SEL1\t;PRE\\PARITY\n\tBTFSC STATERR,2\n\tBCF PORTB,SEL0\t;ERROR\\NOLOCK\n\tBTFSC STATERR,5\n\tBCF PORTB,SEL2\t;FREQ\n\tBTFSC STATERR,7\n\tBCF PORTB,SEL3\t;FREQ\n\t\n\n\n\tBCF PORTC,SEL4\t;LEFT 4053\n\tBCF PORTC,5\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tBSF PORTC,SEL5\t;TURN ANALOG SWITCH ON\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n;\tBSF PORTC,7\t;LEFT BAR\n;\tBSF MUX,0\n\n;\tBSF PORTC,SEL5\t\t\t\t\t\t\t\t\t\t\n;\tBCF PORTC,SEL4\t;LEFT 4053\n\tBTFSS ERR,2\n\tBSF PORTC,7\t;LEFT BAR\n\tBSF MUX,0\n\tGOTO DIGITAL\n\nMUX1D\tBCF MUX,0\n\tBCF PORTC,7\n\t\n\tBCF PORTC,SEL4\n\tBCF PORTC,SEL5\n\tBSF PORTB,SEL0\n\tBSF PORTB,SEL1\n\tBSF PORTB,SEL2\n\tBSF PORTB,SEL3\n\n\tBTFSC STATERR,1\n\tBCF PORTB,SEL1\t;\n\tBTFSC STATERR,0\n\tBCF PORTB,SEL0\t;\n\tBTFSC STATERR,4\n\tBCF PORTB,SEL2\t;\n\tBTFSC STATERR,6\n\tBCF PORTB,SEL3\t;\n\n\tBCF PORTC,SEL5\t;TURN OFF SWITCH\n\tBCF PORTC,7\t;TURN OFF BAR\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tBSF PORTC,SEL4\t;RIGHT 4053\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n;\tBSF PORTC,5\t;RIGHT BAR\n\n;\n\tBTFSS ERR,2\n\tBSF PORTC,5\t;RIGHT BAR\n\tGOTO DIGITAL\n\n;****************  DELAY ROUTINE *****************************\n\n; INIT DELAY 2 BEFORE ENTERING\n; DELAY=:: DELAY1(255*1/1.53MHZ*2 * DELAY2)\n; DELAY2 = 15 FOR RELAY PULSE(5mS)\n; DELAY2 = 255 4 TIMES FOR VISIBLE DELAY \nDELAY\n\tMOVLW 0XFF\nDEL1\tMOVWF DELAY1\nDEC1\tCLRWDT\n\tDECFSZ DELAY1,F\n\tGOTO DEC1\n\tDECFSZ DELAY2,F\n\tGOTO DEL1\n\tRETURN\n\n\n\n\tEND\n";

/* Rebuild the older versions from v1.03 using exactly the archived differences */
function srcFor(ver){
  let L = SRC103.split('\n');
  if (ver === '1.03') return L.join('\n');
  // v1.02: no v1.03 header line; TABLE2 for the CS8412
  L.splice(7, 1);
  const t2 = L.findIndex(l => /^TABLE2\s/.test(l));
  const T102 = ["\tRETLW B'00100000'","\tRETLW B'01000000'","\tRETLW B'10000000'","\tRETLW B'00010000'\t;","\tRETLW B'01000000'","\tRETLW B'10000000'","\tRETLW B'10000000'","\tRETLW B'00010000'"];
  L.splice(t2+1, 8, ...T102);
  if (ver === '1.02') return L.join('\n');
  // v1.01: PIC16C73A, no 'BCF STATUS,6' in the bank macros
  L[3] = '\tLIST\tP=16C73A'; L[4] = '\t#INCLUDE "P16C73A.INC"';
  L.splice(6, 2, ';');
  L = L.filter(l => l !== '\tBCF STATUS,6');
  if (ver === '1.01') return L.join('\n');
  // v1.00: original header, 44.056 kHz reported as "other"
  L.splice(5, 2);
  const t2b = L.findIndex(l => /^TABLE2\s/.test(l));
  L[t2b+7] = "\tRETLW B'00100000'";
  return L.join('\n');
}
const VERSIONS = {
  '1.00': {date:'1997-10-09', file:'ABB1V100.ASM', chip:'PIC16C73A', note:'original release'},
  '1.01': {date:'1998-06-16', file:'ABB1V101.ASM', chip:'PIC16C73A', note:'“update reports 44056 as 44100”'},
  '1.02': {date:'2002-07-12', file:'abb1v102.asm', chip:'PIC16F73',  note:'“update PICf73” (flash part; BCF STATUS,6 in bank macros)'},
  '1.03': {date:'2005-10-04', file:'abb1v103.asm', chip:'PIC16F73',  note:'“updata cs8414” (new TABLE2)'},
};

/* ================================================================
   2. MPASM-COMPATIBLE ASSEMBLER (subset used by the ABB-1)
   ================================================================ */
/* Register addresses and bit names normally come from Microchip's P16F73.INC / P16C73A.INC
   (not archived — they ship with MPASM). Values below are the standard ones. */
const INC = { W:0, F:1, INDF:0, TMR0:1, PCL:2, STATUS:3, FSR:4, PORTA:5, PORTB:6, PORTC:7, PCLATH:0x0A, INTCON:0x0B,
  PIR1:0x0C, PIR2:0x0D, TMR1L:0x0E, TMR1H:0x0F, T1CON:0x10, TMR2:0x11, T2CON:0x12, ADRES:0x1E, ADCON0:0x1F,
  OPTION_REG:0x81, TRISA:0x85, TRISB:0x86, TRISC:0x87, PIE1:0x8C, PIE2:0x8D, PCON:0x8E, PR2:0x92, ADCON1:0x9F,
  PCFG0:0, PCFG1:1, PCFG2:2, RP0:5, RP1:6, C:0, DC:1, TMR2IF:1, TMR2IE:1, GIE:7, PEIE:6 };
const OP = {MOVLW:1,MOVWF:2,CLRF:3,MOVF:4,BSF:5,BCF:6,BTFSS:7,BTFSC:8,GOTO:9,CALL:10,RETURN:11,RETLW:12,RETFIE:13,ADDWF:14,DECFSZ:15,CLRWDT:16,NOP:17};
function num(tok){
  tok = tok.trim(); let m;
  if ((m = /^0x([0-9a-f]+)$/i.exec(tok))) return parseInt(m[1],16);
  if ((m = /^b'([01]+)'$/i.exec(tok))) return parseInt(m[1],2);
  if ((m = /^d'(\d+)'$/i.exec(tok))) return parseInt(m[1],10);
  if ((m = /^h'([0-9a-f]+)'$/i.exec(tok))) return parseInt(m[1],16);
  if ((m = /^\.(\d+)$/.exec(tok))) return parseInt(m[1],10);
  if ((m = /^([0-9][0-9a-f]*)h$/i.exec(tok))) return parseInt(m[1],16);
  if (/^[0-9][0-9a-f]*$/i.test(tok)) return parseInt(tok,16);       // MPASM default radix is HEX
  return null;
}
/* category of each instruction for the timeline / flowchart (-1 = inherit from caller) */
const CAT = ['off','init','walk','main','relay','apoll','amux','ddeb','cbl0','readE','readF','readC','decode','stst','cblwait','decide','dmux'];
const CATN = {}; CAT.forEach((c,i)=>CATN[c]=i);
const CAT_TXT = { off:'off / reset wait', init:'INIT (ports, 170 ms DELAY, Timer2)', walk:'TEST — LED walk', main:'MAIN — debounce RB1', relay:'SETA / SETD — relay pulse',
  apoll:'ANALOG — poll loop', amux:'MUXUP — meter mux', ddeb:'DIGITAL — debounce RB1', cbl0:'CBL0 — wait CBL=1', readE:'CBLOK — read E2..E0',
  readF:'READ FREQUENCY', readC:'READ CHANNEL STATUS', decode:'OR / TABLE2 / flags', stst:'STST / ERRTST', cblwait:'READSTAT / READERR — wait CBL=0',
  decide:'INIT2 + build STATERR', dmux:'DIGMUX / MUX1D — light LEDs' };
const LABEL_CAT = { RESET:'init', TABLE1:-1, TABLE2:-1, INIT:'init', TEST:'walk', DELVIS:-1, MAIN:'main', DIG:'main', SETA:'relay', SETD:'relay', INIT2:-1,
  ANALOG:'apoll', MUXUP:'amux', MUX1:'amux', DIGITAL:'ddeb', CBL0:'cbl0', CBLOK:'readE', STST:'stst', ERRTST:'stst', READSTAT:'cblwait', READERR:'cblwait',
  DIGMUX:'dmux', MUX1D:'dmux', DELAY:-1, DEL1:-1, DEC1:-1 };
const COMMENT_CAT = [[/READ FREQUENCY/,'readF'],[/READ CHANNEL STATUS/,'readC'],[/'OR' SUB FRAME/,'decode'],[/SETUP TIMER2/,'init']];

function assemble(src){
  const lines = src.split('\n');
  const sym = {}; for (const k in INC) sym[k.toUpperCase()] = INC[k];
  const val = tok => { const n = num(tok); if (n !== null) return n; const v = sym[tok.trim().toUpperCase()]; if (v === undefined) throw new Error('undefined symbol '+tok); return v; };
  let prog, labels, macros;
  for (let pass = 1; pass <= 2; pass++){
    prog = []; labels = []; macros = {}; let loc = 0, inMacro = null, cat = -1, afterGotoWait = false, curLabel = '';
    const emit = (mn, ops, line, label) => {
      const m = mn.toUpperCase(); const o = OP[m]; if (!o) throw new Error('unknown mnemonic '+mn+' (line '+(line+1)+')');
      let a = 0, b = 0;
      try {
        if (o===OP.MOVLW || o===OP.RETLW) a = val(ops[0]) & 255;
        else if (o===OP.GOTO || o===OP.CALL) a = pass===1 ? 0 : val(ops[0]);
        else if (o===OP.BSF || o===OP.BCF || o===OP.BTFSS || o===OP.BTFSC){ a = val(ops[0]); b = val(ops[1]); }
        else if (o===OP.MOVF || o===OP.ADDWF || o===OP.DECFSZ){ a = val(ops[0]); b = ops.length>1 ? val(ops[1]) : 1; }
        else if (o===OP.MOVWF || o===OP.CLRF) a = val(ops[0]);
      } catch(e){ if (pass===2) throw e; }
      if (afterGotoWait){ cat = CATN.decide; afterGotoWait = false; }
      prog[loc] = { op:o, a, b, line, mn:m, text: lines[line].replace(/;.*$/,'').trim(), cat };
      if ((o===OP.GOTO) && /^(READSTAT|READERR)$/i.test((ops[0]||'').trim()) && (ops[0]||'').trim().toUpperCase() === curLabel) afterGotoWait = true;
      loc++;
    };
    for (let i = 0; i < lines.length; i++){
      const raw = lines[i]; const ci = raw.indexOf(';');
      const comment = ci >= 0 ? raw.slice(ci) : ''; let code = ci >= 0 ? raw.slice(0, ci) : raw;
      if (!inMacro) for (const [re,c] of COMMENT_CAT) if (re.test(comment)) cat = CATN[c];
      if (!code.trim()) continue;
      let label = null;
      if (/^\S/.test(code) && !/^#/.test(code)){ const m = /^(\S+)\s*(.*)$/.exec(code); label = m[1].replace(/:$/,''); code = m[2]; }
      const m2 = /^\s*(\S+)\s*(.*)$/.exec(code); const mn = m2 ? m2[1] : ''; const rest = m2 ? m2[2].trim() : '';
      const MN = mn.toUpperCase();
      if (inMacro){ if (MN === 'ENDM') inMacro = null; else macros[inMacro].push(lines[i]); continue; }
      if (/^#/.test(code.trim()) || MN === 'ERRORLEVEL' || MN === 'LIST' || /^#INCLUDE/i.test(mn)) continue;
      if (MN === 'MACRO'){ inMacro = label.toUpperCase(); macros[inMacro] = []; continue; }
      if (MN === 'EQU'){ sym[label.toUpperCase()] = val(rest); continue; }
      if (MN === 'ORG'){ loc = val(rest); continue; }
      if (MN === 'RES'){ sym[label.toUpperCase()] = loc; loc += val(rest); continue; }
      if (MN === 'END') break;
      if (label){ sym[label.toUpperCase()] = loc; labels.push({name:label, addr:loc, line:i}); curLabel = label.toUpperCase();
        const lc = LABEL_CAT[label.toUpperCase()]; if (lc !== undefined) cat = lc === -1 ? -1 : CATN[lc]; }
      if (!mn) continue;
      if (macros[MN]){ for (const ml of macros[MN]){ const mm = /^\s*(\S+)\s*(.*)$/.exec(ml.replace(/;.*$/,'')); if (mm) emit(mm[1], mm[2].split(',').map(s=>s.trim()), i, null); } continue; }
      emit(mn, rest ? rest.split(',').map(s=>s.trim()) : [], i, label);
    }
  }
  const tbl = name => { const a = sym[name]; const out = []; for (let k=1;k<=8;k++) out.push(prog[a+k].a); return out; };
  const labelAt = []; let cur = '';
  const sorted = labels.slice().sort((x,y)=>x.addr-y.addr); let li = 0;
  for (let ad = 0; ad < prog.length; ad++){ while (li < sorted.length && sorted[li].addr <= ad){ cur = sorted[li].name; li++; } labelAt[ad] = cur; }
  return { prog, sym, labels, labelAt, lines, table1: tbl('TABLE1'), table2: tbl('TABLE2') };
}
const ASM = {}; function asmFor(ver){ return ASM[ver] || (ASM[ver] = assemble(srcFor(ver))); }

/* ================================================================
   3. HARDWARE CONSTANTS
   ================================================================ */
const FOSC = 6.144e6, CPS = FOSC/4, TCY = 1/CPS;          // X1 = 6M144 (netlist) → 1.536 MIPS
const PWRT_S = 0.072, OST_CYC = 256;                       // power-up timer 72 ms nominal — config bits not in source (inferred: PWRT on)
const WDT_S = 0.018 * 128;                                 // WDT 18 ms nominal × prescaler 1:128 (OPTION_REG reset value 0xFF, never changed)
const WARM = 0.8;                                          // "running" start: the core is run from power-on 0.8 s before t = 0
const FREE_FS = 48000;                                     // CS8412 free-running block rate when unlocked — inferred
const CBL_HIGH_FRAMES = 32;                                // CBL high for the first 32 frames of a block — inferred (Crystal datasheet)
const LEDN = ['48','44','32','OUT','CON','PRE','AUDIO','ERR'];   // physical rows top→bottom
const LED_RC = { '48':[7,6], '44':[7,4], '32':[2,6], 'OUT':[2,4], 'CON':[3,6], 'PRE':[3,4], 'AUDIO':[5,6], 'ERR':[5,4] }; // [PORTB row bit (low=on), PORTC column bit (high=on)]
const LED_STAT_BIT = { '48':6, '44':7, '32':4, 'OUT':5, 'CON':1, 'PRE':3, 'AUDIO':0, 'ERR':2 };
const LEGEND_L = { '48':'48.0kHz', '44':'44.1kHz', '32':'32.0kHz', 'OUT':'LOCK', 'CON':'CONSUMER', 'PRE':'PRE-EMPH', 'AUDIO':'AUDIO', 'ERR':'RCV ERROR' };
const LEGEND_R = { '48':'NO ERROR', '44':'VALIDITY BIT', '32':'CONFIDENCE FLAG', 'OUT':'CRC ERROR', 'CON':'PARITY ERROR', 'PRE':'BIPHASE ERROR', 'AUDIO':'NO LOCK', 'ERR':'(no legend)' };
const ECODE = ['no error','validity bit high','confidence flag','slipped sample','CRC error (pro only)','parity error','bi-phase coding error','no lock'];
const METER_DB = [12,9,6,3,0,-3,-6,-9,-12,-15,-21,-27];   // silkscreen, top → bottom (dB re 0 VU)
const FAULTS = { none:0, validity:1, confidence:2, slip:3, crc:4, parity:5, biphase:6 };

/* ================================================================
   4. DEVICE STATE
   ================================================================ */
const D = {
  ver: '1.03', rx: 'CS8414',
  pos0: 'DIGITAL', es0: 'STATUS',          // switch positions at t = 0
  events: [],                               // user flips at a time: {t, kind:'pos'|'es', v}
  start: 'running',                         // 'running' | 'power' (power switched on at t = 0)
  cfg: { pwrt: true, wdt: true },           // config bits are not in the source (set by hand)
  term: '110',
  aes: { plugged:true, fs:48000, pro:true, emph:'none', data:'audio', fault:'none', lvlL:-20, lvlR:-24 },
  ana: { L:true, R:true, lvlL:4, lvlR:0 },
  prog: true,                               // program-like level movement on the meters
  phones: true, vol: 0.55,
  adapter: false, battLow: false,
  cblMode: 'free',                          // what CBL does with no lock (inferred): free | low | high
  eye: true, photo: false,
  log: [], lastTrace: [],
};
const posAt = t => { let p = D.pos0; for (const e of D.events) if (e.kind==='pos' && e.t <= t) p = e.v; return p; };
const esAt  = t => { let p = D.es0;  for (const e of D.events) if (e.kind==='es'  && e.t <= t) p = e.v; return p; };

/* ---------------- receiver model (CS8412 / CS8414) ---------------- */
function rxState(){
  const a = D.aes, fs = a.fs;
  const lock = a.plugged && fs >= 30000 && fs <= 50000;   // manual: "30 kHz to 50 kHz"
  let E = 7, F = 0;
  if (lock){
    E = FAULTS[a.fault] || 0;
    if (E === 4 && !a.pro) E = 0;                           // CRC is only checked on professional streams
    const near = (nom, tol) => Math.abs(fs - nom)/nom <= tol;
    if (D.rx === 'CS8412'){                                 // Crystal CS8412 F2..F0 (with 6.144 MHz on FCK) — inferred from datasheet + v1.00/1.01 TABLE2
      F = near(48000,400e-6)?4 : near(44100,400e-6)?5 : near(44056,400e-6)?6 : near(32000,400e-6)?7 :
          near(48000,0.04)?1 : near(44100,0.04)?2 : near(32000,0.04)?3 : 0;
    } else {                                                // CS8414 — inferred from what v1.03 TABLE2 expects (only codes 5/6/7 are rates)
      F = near(48000,0.04)?5 : near(44100,0.04)?6 : near(32000,0.04)?7 : 0;
    }
  }
  // channel-status pins as the firmware reads them (SEL = 1). Polarity inferred from the firmware's own tests.
  const cs = sub => {
    const emph = a.emph==='both' || (a.emph==='A' && sub===0);
    const audio = a.data==='audio' || (a.data==='mixed' && sub===0);
    const C0 = a.pro ? 0 : 1;                               // RA5: high = consumer   (BTFSC STAT,5 → CONSUMER)
    const Ca = audio ? 1 : 0;                               // RA4: high = audio      (BTFSC STAT,4 → AUDIO)
    const Cb = 1, Cd = 1;                                   // RA3, RA0: not used by the firmware
    const Cc = emph ? 0 : 1;                                // RA2: low = emphasis    (BTFSS STAT,2 → PRE-EMPH)
    const Ce = a.pro ? ((a.fault==='crc') ? 0 : 1) : 0;     // RA1: pro = CRCE, low = CS CRC error; consumer: another bit (low) — masked by firmware
    return (C0<<5)|(Ca<<4)|(Cb<<3)|(Cc<<2)|(Ce<<1)|Cd;
  };
  const efPins = ((E&1)<<5)|(((E>>1)&1)<<4)|(((E>>2)&1)<<3)|((F&1)<<2)|(((F>>2)&1)<<1)|((F>>1)&1);
  return { lock, E, F, fs, csA: cs(0), csB: cs(1), efPins };
}
function cblAt(t, rx){
  if (!rx.lock && D.cblMode !== 'free') return D.cblMode === 'high' ? 1 : 0;
  const fs = rx.lock ? rx.fs : FREE_FS, Tb = 192/fs;
  let ph = t % Tb; if (ph < 0) ph += Tb;
  return ph < CBL_HIGH_FRAMES/fs ? 1 : 0;
}

/* ================================================================
   5. THE PIC16F73 RUN — one simulated second, cycle by cycle
   ================================================================ */
let RUN = null, RUN_KEY = '';
function runKey(){ return JSON.stringify([D.ver, D.rx, D.pos0, D.es0, D.events, D.start, D.cfg, D.aes.plugged, D.aes.fs, D.aes.pro, D.aes.emph, D.aes.data, D.aes.fault, D.cblMode]); }
function sim(){
  const key = runKey(); if (RUN && key === RUN_KEY) return RUN;
  RUN_KEY = key; const t0w = performance.now();
  const A = asmFor(D.ver), P = A.prog, rx = rxState();
  const T0 = D.start === 'running' ? -WARM : 0;
  const recStart = Math.round(-T0 / TCY), endCyc = recStart + CPS + 2;
  const NREC = CPS + 4;
  const pcRec = new Uint16Array(NREC).fill(0xFFFF);
  // recorded outputs
  const evR = [], evB = [], evTB = [], evC = [], evTC = [], evP = [];
  const reads = []; const t2flags = []; const wdtGaps = []; const resets = [];
  const ramW = {}; for (let a = 0x20; a <= 0x28; a++) ramW[a] = { r:[], v:[] };
  let init2 = 0;
  // CPU state
  let pc=0, w=0, status=0x18, stack=[], sp=0, pclath=0;
  const mem = new Uint8Array(256);
  let latchA=0, latchB=0, latchC=0, trisA=0xFF, trisB=0xFF, trisC=0xFF, option=0xFF, adcon1=0, t2con=0, tmr2=0, pr2=0xFF, pir1=0, pie1=0, pre=0, post=0;
  let wdt = 0, lastClr = 0, powered = false, runFrom = 0, recOn = false;
  // power transitions (cycle numbers)
  const pw = [];
  const p0 = posAt(T0) !== 'OFF';
  if (p0) pw.push({c:0, on:true});
  let state = p0;
  for (const e of D.events) if (e.kind === 'pos'){ const on = e.v !== 'OFF'; if (on !== state){ pw.push({c: Math.round((e.t - T0)/TCY), on}); state = on; } }
  let pwi = 0;
  // switch inputs as functions of cycle
  const esEv = D.events.filter(e=>e.kind==='es').map(e=>({c:Math.round((e.t-T0)/TCY), v:e.v}));
  const posEv = D.events.filter(e=>e.kind==='pos').map(e=>({c:Math.round((e.t-T0)/TCY), v:e.v}));
  let cyc = 0;
  const rb0 = () => { let v = D.es0; for (const e of esEv) if (e.c <= cyc) v = e.v; return v === 'ERROR' ? 1 : 0; };        // STATUS grounds RB0
  const rb1 = () => { let v = D.pos0; for (const e of posEv) if (e.c <= cyc) v = e.v; return v === 'ANALOG' ? 1 : 0; };     // DIGITAL grounds RB1
  let rb0v = rb0(), rb1v = rb1(), nextSw = Math.min(...esEv.concat(posEv).map(e=>e.c).filter(c=>c>0), Infinity);
  let last = '';
  const out = () => {
    const k = powered ? ((latchB&0xFC)|((trisB&0xFC)<<8)|((latchC&0xF7)<<16)|((trisC&0xF7)<<24)) : -1;
    const ks = String(k); if (ks === last) return; last = ks;
    evR.push(cyc - recStart); evB.push(latchB); evTB.push(trisB); evC.push(latchC); evTC.push(trisC); evP.push(powered?1:0);
  };
  const reset = (kind) => {           // POR or WDT reset
    pc = 0; status = 0x18; sp = 0; pclath = 0; trisA = trisB = trisC = 0xFF; option = 0xFF; adcon1 = 0; t2con = 0; tmr2 = 0; pr2 = 0xFF; pir1 = 0; pie1 = 0; pre = post = 0; wdt = 0;
    if (kind === 'por'){ mem.fill(0); }   // RAM is undefined at power-up; zero is assumed (MUX starts at 0)
    out();
  };
  const pinsA = () => {
    if ((adcon1 & 6) !== 6) return 0;                       // PORTA still analog → reads 0
    const sel = !(trisC & 4) && (latchC & 4);
    const rc0 = (trisC & 1) ? 1 : (latchC & 1), rc1 = (trisC & 2) ? 1 : ((latchC>>1) & 1);
    if (!sel) return rx.efPins;
    if (rc0 && rc1) return 0x15;                            // FCK oscillating while SEL=1: undefined (firmware never does this)
    const cs12 = rc1 ? 0 : 1;                               // NAND(NAND(RC0,OSC),RC1) with RC0 = 0
    return cs12 ? rx.csB : rx.csA;
  };
  const tNow = () => T0 + cyc*TCY;
  const readF = a => {
    switch (a){
      case 0x02: return pc & 255;
      case 0x03: return status;
      case 0x05: { const v = pinsA(); if (recOn){ const sel = !(trisC & 4) && (latchC & 4) ? 1 : 0; reads.push([cyc-recStart, v, sel, (latchC & 3)]); } return v; }
      case 0x06: { const pins = (rb0v) | (rb1v<<1) | 0xFC; return ((latchB & ~trisB) | (pins & trisB)) & 255; }
      case 0x07: { const pins = cblAt(tNow(), rx) << 3; return ((latchC & ~trisC) | (pins & trisC)) & 255; }
      case 0x0A: return pclath; case 0x0C: return pir1; case 0x11: return tmr2; case 0x12: return t2con;
      case 0x81: return option; case 0x85: return trisA; case 0x86: return trisB; case 0x87: return trisC; case 0x8C: return pie1; case 0x92: return pr2; case 0x9F: return adcon1;
      default: return mem[a];
    }
  };
  let pcWritten = -1;
  const writeF = (a, v) => {
    v &= 255;
    switch (a){
      case 0x02: pcWritten = (pclath<<8) | v; return;
      case 0x03: status = (status & 0x18) | (v & ~0x18); return;
      case 0x05: latchA = v; return;
      case 0x06: latchB = v; out(); return;
      case 0x07: latchC = v; out(); return;
      case 0x0A: pclath = v & 0x1F; return;
      case 0x0C: pir1 = v; return;
      case 0x11: tmr2 = v; pre = 0; return;
      case 0x12: t2con = v & 0x7F; pre = 0; post = 0; return;
      case 0x81: option = v; return;
      case 0x85: trisA = v; return;
      case 0x86: trisB = v; out(); return;
      case 0x87: trisC = v; out(); return;
      case 0x8C: pie1 = v; return;
      case 0x92: pr2 = v; return;
      case 0x9F: adcon1 = v; return;
      default: mem[a] = v; if (a >= 0x20 && a <= 0x28 && recOn){ const R = ramW[a]; R.r.push(cyc - recStart); R.v.push(v); }
    }
  };
  const addr = f => { f &= 0x7F; if (f===2 || f===3 || f===4 || f===0x0A || f===0x0B || f >= 0x70) return f; return (status & 0x20) ? (f | 0x80) : f; };
  const WDT_CYC = Math.round(WDT_S / TCY), PWRT_CYC = D.cfg.pwrt ? Math.round(PWRT_S/TCY) + OST_CYC : OST_CYC;
  let guard = 0;
  while (cyc < endCyc){
    if (!recOn && cyc >= recStart){ recOn = true; for (let a = 0x20; a <= 0x28; a++){ ramW[a].r.push(0); ramW[a].v.push(mem[a]); } }
    if (cyc >= nextSw){ rb0v = rb0(); rb1v = rb1(); nextSw = Math.min(...esEv.concat(posEv).map(e=>e.c).filter(c=>c>cyc), Infinity); }
    if (pwi < pw.length && cyc >= pw[pwi].c){
      const e = pw[pwi++];
      if (e.on){ powered = true; reset('por'); runFrom = cyc + PWRT_CYC; if (cyc >= recStart || true) resets.push({r: cyc - recStart, kind:'por'}); }
      else { powered = false; out(); resets.push({r: cyc - recStart, kind:'off'}); }
      continue;
    }
    if (!powered || cyc < runFrom){
      let nx = endCyc; if (pwi < pw.length) nx = Math.min(nx, pw[pwi].c); if (powered) nx = Math.min(nx, runFrom); if (nextSw > cyc) nx = Math.min(nx, nextSw);
      if (!recOn && nx > recStart) nx = Math.max(cyc+1, Math.min(nx, recStart));
      cyc = Math.max(nx, cyc+1); if (powered && cyc >= runFrom) lastClr = cyc; continue;
    }
    const I = P[pc]; if (!I){ pc = (pc+1) & 0x7FF; cyc++; continue; }        // unprogrammed word: treat as NOP (never happens)
    const here = pc; pc = (pc + 1) & 0x7FF; let n = 1;
    switch (I.op){
      case OP.MOVLW: w = I.a; break;
      case OP.MOVWF: writeF(addr(I.a), w); break;
      case OP.CLRF: { const a = addr(I.a); writeF(a, 0); status |= 4; if (a === 0x86 || a === 0x87) init2++; break; }
      case OP.MOVF: { const a = addr(I.a), v = readF(a); if (v) status &= ~4; else status |= 4; if (I.b) writeF(a, v); else w = v; break; }
      case OP.BSF: { const a = addr(I.a); writeF(a, readF(a) | (1<<I.b)); break; }
      case OP.BCF: { const a = addr(I.a); writeF(a, readF(a) & ~(1<<I.b)); break; }
      case OP.BTFSS: if ((readF(addr(I.a)) >> I.b) & 1){ pc = (pc+1) & 0x7FF; n = 2; } break;
      case OP.BTFSC: if (!((readF(addr(I.a)) >> I.b) & 1)){ pc = (pc+1) & 0x7FF; n = 2; } break;
      case OP.GOTO: pc = I.a; n = 2; break;
      case OP.CALL: stack[sp & 7] = pc; sp++; pc = I.a; n = 2; break;
      case OP.RETURN: sp--; pc = stack[sp & 7]; n = 2; break;
      case OP.RETLW: w = I.a; sp--; pc = stack[sp & 7]; n = 2; break;
      case OP.RETFIE: sp--; pc = stack[sp & 7]; n = 2; break;
      case OP.ADDWF: { const a = addr(I.a), v = (readF(a) + w); if (v & 255) status &= ~4; else status |= 4; if (v > 255) status |= 1; else status &= ~1;
        if (I.b){ pcWritten = -1; writeF(a, v); if (pcWritten >= 0){ pc = pcWritten; n = 2; } } else w = v & 255; break; }
      case OP.DECFSZ: { const a = addr(I.a), v = (readF(a) - 1) & 255; if (I.b) writeF(a, v); else w = v; if (v === 0){ pc = (pc+1) & 0x7FF; n = 2; } break; }
      case OP.CLRWDT: if (recOn && cyc - lastClr > CPS/1000) wdtGaps.push([Math.max(0,lastClr - recStart), cyc - recStart]); wdt = 0; lastClr = cyc; break;
      case OP.NOP: break;
    }
    if (recOn){ const r = cyc - recStart; if (r < NREC){ pcRec[r] = here; if (n === 2 && r+1 < NREC) pcRec[r+1] = here; } }
    else if (n === 2 && cyc + 1 === recStart) pcRec[0] = here;
    // Timer2
    if (t2con & 4){
      pre += n; const ps = (t2con & 2) ? 16 : (t2con & 1) ? 4 : 1;
      while (pre >= ps){ pre -= ps;
        if (tmr2 === pr2){ tmr2 = 0; post++; if (post >= ((t2con>>3)&15) + 1){ post = 0; if (!(pir1 & 2) && recOn) t2flags.push(cyc - recStart); pir1 |= 2; } }
        else tmr2 = (tmr2 + 1) & 255;
      }
    }
    cyc += n;
    if (D.cfg.wdt){ wdt += n; if (wdt >= WDT_CYC){ resets.push({r: cyc - recStart, kind:'wdt'}); if (recOn) wdtGaps.push([Math.max(0,lastClr-recStart), cyc-recStart]); reset('wdt'); lastClr = cyc; } }
    if (++guard > 6e6) break;
  }
  if (recOn && cyc - lastClr > CPS/1000 && powered) wdtGaps.push([Math.max(0,lastClr - recStart), Math.min(cyc, endCyc) - recStart]);
  // category runs
  const runS = [], runK = []; let prev = -2, cur = 0;
  for (let r = 0; r < CPS; r++){
    const p = pcRec[r]; let k;
    if (p === 0xFFFF) k = 0; else { const c = P[p].cat; k = c === -1 ? (cur || 0) : c; }
    if (k !== prev){ runS.push(r); runK.push(k); prev = k; } cur = k;
  }
  // relay latch: last coil pulse decides the audio path
  RUN = { A, rx, T0, recStart, pcRec, evR, evB, evTB, evC, evTC, evP, reads, t2flags, wdtGaps, resets, ramW, init2, runS, runK, ms: performance.now() - t0w };
  RUN.relay0 = relayBefore(RUN);
  return RUN;
}
function relayBefore(R){ // relay position at t=0 from coil pulses during the warm-up (latching relay)
  let pos = 'digital';
  for (let i = 0; i < R.evR.length && R.evR[i] <= 0; i++){ const st = stAtIdx(R, i); if (coilA(st)) pos = 'analog'; if (coilD(st)) pos = 'digital'; }
  return pos;
}
/* ---------------- reading the recording ---------------- */
function idxAt(R, r){ let lo = 0, hi = R.evR.length - 1; if (hi < 0 || R.evR[0] > r) return -1; while (lo < hi){ const m = (lo+hi+1)>>1; if (R.evR[m] <= r) lo = m; else hi = m-1; } return lo; }
function stAtIdx(R, i){ if (i < 0) return {b:0xFF,tb:0xFF,c:0,tc:0xFF,p:0}; return { b:R.evB[i], tb:R.evTB[i], c:R.evC[i], tc:R.evTC[i], p:R.evP[i] }; }
const rAt = t => Math.max(0, Math.min(CPS, Math.round(t / TCY)));
function stAt(t){ const R = sim(); return stAtIdx(R, idxAt(R, rAt(t))); }
const drvHi = (st, port, bit) => st.p && !((port==='B'?st.tb:st.tc) >> bit & 1) && ((port==='B'?st.b:st.c) >> bit & 1);
const drvLo = (st, port, bit) => st.p && !((port==='B'?st.tb:st.tc) >> bit & 1) && !((port==='B'?st.b:st.c) >> bit & 1);
const ledOn = (st, n) => drvLo(st,'B',LED_RC[n][0]) && drvHi(st,'C',LED_RC[n][1]);
const barL = st => drvHi(st,'C',7), barR = st => drvHi(st,'C',5);
const coilA = st => drvLo(st,'B',4), coilD = st => drvLo(st,'B',6);
const fckOsc = st => drvHi(st,'C',0) && drvHi(st,'C',1);
const selHi = st => drvHi(st,'C',2);
function relayAt(t){ const R = sim(); let pos = R.relay0; const r = rAt(t); for (let i = 0; i < R.evR.length && R.evR[i] <= r; i++){ if (R.evR[i] < 0) continue; const st = stAtIdx(R,i); if (coilA(st)) pos='analog'; if (coilD(st)) pos='digital'; } return pos; }
function pcAt(t){ const R = sim(); const r = rAt(t); return r < R.pcRec.length ? R.pcRec[Math.min(r, CPS-1)] : 0xFFFF; }
function catAt(t){ const R = sim(); const r = rAt(t); let lo=0, hi=R.runS.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (R.runS[m]<=r) lo=m; else hi=m-1; } return CAT[R.runK[lo]]; }
function ramAt(t, a){ const R = sim(), E = R.ramW[a], r = rAt(t); let lo=0, hi=E.r.length-1; if (hi<0) return 0; while(lo<hi){ const m=(lo+hi+1)>>1; if (E.r[m]<=r) lo=m; else hi=m-1; } return E.v[lo]; }
/* span walker over the event list: calls fn(ra, rb, st) for each constant stretch inside [r0, r1] */
function spans(r0, r1, fn){
  const R = sim(); let i = idxAt(R, r0); let a = r0;
  while (a < r1){ const nx = (i+1 < R.evR.length) ? Math.min(R.evR[i+1], r1) : r1; fn(a, Math.max(a, nx), stAtIdx(R, i)); a = nx; i++; if (nx >= r1) break; }
}
function onFraction(t0, t1, pred){ let on = 0; const r0 = rAt(t0), r1 = Math.max(rAt(t1), r0+1); spans(r0, r1, (a,b,st)=>{ if (pred(st)) on += b-a; }); return on / (r1 - r0); }

/* ---------------- what the firmware will compute (same logic, for explanations) ---------------- */
function fwDecode(){
  const A = asmFor(D.ver), rx = rxState();
  const ERRi = rx.E, ERR = A.table1[ERRi];
  const Fi = rx.F, T2 = A.table2[Fi];
  const TEMP = rx.csA, STAT = rx.csB | (TEMP & 0x3F);
  let FREQ = T2; const steps = [];
  if (!(STAT & 4)){ FREQ |= 8; steps.push('BTFSS STAT,2 → Cc low → BSF FREQ,3 (PRE-EMPH)'); }
  if (STAT & 16){ FREQ |= 1; steps.push('BTFSC STAT,4 → Ca high → BSF FREQ,0 (AUDIO)'); }
  if (STAT & 32){ FREQ |= 2; steps.push('BTFSC STAT,5 → C0 high → BSF FREQ,1 (CONSUMER)'); }
  if (!(STAT & 2)){ FREQ |= 4; steps.push('BTFSS STAT,1 → Ce low → BSF FREQ,2 (RCV ERROR)'); }
  if (FREQ & 2){ if (FREQ & 4) steps.push('BTFSC FREQ,1 → consumer → BCF FREQ,2 (CS CRC ignored)'); FREQ &= ~4; }
  let ST = FREQ; if (ERR & 4) ST = 0; if (!(ERR & 64)) ST |= 4;
  return { rx, ERRi, ERR, Fi, T2, TEMP, STAT, FREQ, STATERR_S: ST, STATERR_E: ERR, steps };
}
const b8 = v => (v & 255).toString(2).padStart(8,'0');
const h2 = v => '0x' + (v & 255).toString(16).toUpperCase().padStart(2,'0');
function ledsFromStaterr(v){ const o = []; for (const n of LEDN) if (v >> LED_STAT_BIT[n] & 1) o.push(n); return o; }
function ledName(n, es){ return es === 'ERROR' ? (n==='ERR' ? 'bottom LED (RCV ERROR row, no ERROR legend)' : LEGEND_R[n]) : LEGEND_L[n]; }

/* ---------------- audio levels (for meters and headphones) ---------------- */
function levels(t){
  const relay = relayAt(t), rx = rxState(); const mod = (k)=> D.prog ? 5*Math.sin(2*Math.PI*0.9*t + k) + 3*Math.sin(2*Math.PI*2.7*t + 2*k) - 3 : 0;
  if (relay === 'analog') return { src:'analog jacks', L: D.ana.L ? D.ana.lvlL - 4 + mod(0) : -99, R: D.ana.R ? D.ana.lvlR - 4 + mod(1) : -99 };
  if (!rx.lock) return { src:'CS4330 DAC (receiver not locked — silent, inferred)', L:-99, R:-99 };
  if (D.aes.data === 'nonaudio') return { src:'CS4330 DAC playing non-audio data (noise)', L: 14, R: 14 };
  return { src:'CS4330 DAC (AES input)', L: D.aes.lvlL + 20 + mod(0), R: D.aes.lvlR + 20 + mod(1) };   // manual: −20 dBFS reads 0 VU
}

/* ---------------- panel state at time t ---------------- */
function panelAt(t, eye){
  const st = stAt(t), tau = 0.04;
  const lv = levels(t);
  const P = { pw: st.p, leds:{}, mL:[], mR:[], lb: st.p && D.battLow && !D.adapter ? 1 : 0, pos: posAt(t), es: esAt(t) };
  if (eye){
    const a = Math.max(0, Math.min(t, 1) - tau), b = Math.max(a + tau, t);   // near t = 0 the eye looks at the first 40 ms
    for (const n of LEDN) P.leds[n] = onFraction(a, b, s => ledOn(s, n));
    const fl = onFraction(a, b, barL), fr = onFraction(a, b, barR);
    METER_DB.forEach(db => { P.mL.push(lv.L >= db ? fl : 0); P.mR.push(lv.R >= db ? fr : 0); });
  } else {
    for (const n of LEDN) P.leds[n] = ledOn(st, n) ? 1 : 0;
    METER_DB.forEach(db => { P.mL.push(barL(st) && lv.L >= db ? 1 : 0); P.mR.push(barR(st) && lv.R >= db ? 1 : 0); });
  }
  return P;
}

/* ================================================================
   6. USER ACTIONS — each logs the firmware path
   ================================================================ */
function act(name, fn){
  D.lastTrace = []; const tr = s => D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({ t: SIM.t, name, trace: D.lastTrace.slice() }); if (D.log.length > 60) D.log.length = 60;
  SIM.refresh();
}
function addEvent(kind, v){
  const t = SIM.t;
  D.events = D.events.filter(e => !(e.kind === kind && e.t >= t));     // re-record from the playhead on
  const cur = kind === 'pos' ? posAt(t) : esAt(t);
  if (cur === v) return false;
  if (t <= 0){ if (kind === 'pos') D.pos0 = v; else D.es0 = v; }
  else D.events.push({ t, kind, v });
  D.events.sort((a,b)=>a.t-b.t);
  return true;
}
function decodeTrace(tr, es){
  const d = fwDecode(), A = asmFor(D.ver);
  if (!d.rx.lock){ tr(`CS8412/14 E2..E0 = 111 (no lock) → CBLOK: ERR = 7 → CALL TABLE1 → RETLW ${b8(A.table1[7])}b → ERR,2 set`);
    tr(es==='ERROR' ? 'READERR: STATERR = ERR → only the bottom LED lights (row SEL0, column SEL5) — the RCV ERROR row, not the “NO LOCK” legend' : 'READSTAT: BTFSC ERR,2 → CLRF STATERR (blank) ; BTFSS ERR,6 → BSF STATERR,2 → only RCV ERROR');
    tr('DIGMUX: BTFSS ERR,2 skips BSF PORTC,7 / BSF PORTC,5 → both meter bars stay off'); return; }
  tr(`CBLOK (SEL=0): RA5/RA4/RA3 = E0/E1/E2 → ERR index ${d.ERRi} (${ECODE[d.ERRi]}) → TABLE1 → ERR = ${b8(d.ERR)}b`);
  tr(`READ FREQUENCY: RA2/RA0/RA1 = F0/F1/F2 → index ${d.Fi} → TABLE2 (v${D.ver}) → ${b8(d.T2)}b = ${d.T2===0x40?'48.0kHz':d.T2===0x80?'44.1kHz':d.T2===0x10?'32.0kHz':'LOCK (other rate)'}`);
  tr(`READ CHANNEL STATUS (SEL=1): BCF PORTC,0 → CS12=0 → TEMP = PORTA = ${b8(d.TEMP)}b ; BCF PORTC,1 → CS12=1 → STAT = ${b8(d.rx.csB)}b ; 'OR' SUB FRAME → STAT = ${b8(d.STAT)}b`);
  d.steps.forEach(s => tr(s));
  if (es === 'ERROR') tr(`READERR: STATERR = ERR = ${b8(d.STATERR_E)}b → lights ${ledsFromStaterr(d.STATERR_E).map(n=>ledName(n,'ERROR')).join(', ')}`);
  else tr(`READSTAT: STATERR = FREQ${d.ERR & 64 ? '' : ' + BSF STATERR,2 (ERR,6 clear = some error)'} = ${b8(d.STATERR_S)}b → lights ${ledsFromStaterr(d.STATERR_S).map(n=>ledName(n,'STATUS')).join(', ') || 'nothing'}`);
}
const A_ = {
  setPos(v){ act('Power/mode switch → '+v, tr => {
    const t = SIM.t, from = posAt(t);
    if (!addEvent('pos', v)){ tr('Already there.'); return; }
    if (v === 'OFF'){ tr('SW2 (ON-OFF-ON) opens the supply: the PIC, receiver and LEDs lose power at once. The latching relay keeps its position.'); return; }
    if (from === 'OFF'){
      tr(`Power-on reset → ${D.cfg.pwrt?'power-up timer 72 ms + ':''}oscillator start-up → RESET: CALL INIT`);
      tr('INIT: MOVLW 0XFF / MOVWF DELAY2 / CALL DELAY → 255 × 1023 cycles = 169.8 ms with every LED off');
      tr('INIT: PORTB = 0xFF, PORTC = SEL4|SEL5, TRISB/TRISC, RBPU on (BCF OPTION_REG,7), ADCON1 → PORTA digital');
      tr('TEST: LED walk 48 → 44 → 32 → OUT → CON → PRE → AUDIO → ERR, one CALL DELVIS each (0X2F = 47 × 1023 cycles = 31.3 ms)');
      tr('Timer2: PR2 = 0xFF, T2CON prescale 16, postscale 1:13 (polled — no interrupt is ever enabled) → RETURN → MAIN');
    } else {
      tr(from === 'ANALOG' ? 'ANALOG polls RB1 five times every pass (≈20 µs): RB1 is now low → GOTO RESET'
                           : 'DIGITAL tests RB1 once per AES block, just after DIGMUX: up to one block (4 ms at 48 kHz) later it sees RB1 high → GOTO RESET');
      tr('GOTO RESET is a software jump, not a reset: INIT runs again — 169.8 ms dark, then the whole LED walk (8 × 31.3 ms)');
    }
    if (v === 'DIGITAL') tr('MAIN: RB1 low six times → DIG → GOTO SETD: BCF PORTB,6 (digital coil on), BCF PORTC,SEL4/SEL5, MOVLW 15 → DELAY2 = 0x15 = 21 (MPASM radix is hex) → 14.0 ms pulse (comment says 5 ms) → BSF PORTB,6 → BSF PORTC,0/1 (FCK oscillator on) → DIGITAL');
    else tr('MAIN: RB1 high six times → GOTO SETA: BCF PORTB,4 (analog coil on), status LEDs off, FCK gated off (BCF PORTC,0/1), 14.0 ms pulse → BSF PORTB,4 → ANALOG');
    tr('Scrub forward from the playhead (or press Play) to watch it happen on the timeline and the panel.');
  }); },
  setES(v){ act('STATUS/ERROR switch → '+v, tr => {
    if (!addEvent('es', v)){ tr('Already there.'); return; }
    if (posAt(SIM.t) !== 'DIGITAL'){ tr('Only the digital loop reads RB0 (STST/ERRTST). In ANALOG mode this switch does nothing.'); return; }
    tr(`STST / ERRTST read RB0 every AES block; it must read the same 5 times in a row (bouncing makes the code ping-pong between STST and ERRTST). RB0 ${v==='ERROR'?'high → ERRTST → READERR':'low → STST → READSTAT'}`);
    decodeTrace(tr, v);
  }); },
  plugAes(on){ act(on ? 'Plug AES cable into the XLR' : 'Unplug the AES cable', tr => {
    D.aes.plugged = on;
    tr(on ? 'T1 (PE65612) couples the signal into the CS8412/14; the PLL locks (E2..E0 leaves 111)' : 'The receiver loses lock: E2..E0 = 111');
    if (!on) tr(`CBL with no lock: ${D.cblMode==='free'?'keeps running from the free-running PLL (inferred) — the loop keeps going':D.cblMode==='low'?'stuck low → CBL0 spins with no CLRWDT':'stuck high → READSTAT spins with CLRWDT'}`);
    decodeTrace(tr, esAt(SIM.t));
  }); },
  setAes(k, v, label){ act(label, tr => { D.aes[k] = v; const rx = rxState();
    if (k === 'fs'){ tr(`Receiver ${D.rx}: ${rx.lock ? 'locked' : 'no lock (outside 30–50 kHz)'}; F2..F0 = ${rx.F.toString(2).padStart(3,'0')} (${rx.F})`); tr(`New AES block every ${SIM.fmtDur(192/(rx.lock?rx.fs:FREE_FS))} → the digital loop (one pass per CBL) runs ${(rx.lock?rx.fs:FREE_FS)/192|0} times a second`); }
    decodeTrace(tr, esAt(SIM.t)); }); },
  setVer(v){ act('Firmware → v'+v, tr => { const o = asmFor(D.ver).table2, n = asmFor(v).table2; D.ver = v;
    tr(`${VERSIONS[v].file} (${VERSIONS[v].date}): ${VERSIONS[v].note}; target ${VERSIONS[v].chip}`);
    tr('TABLE2 index 0–7 → ' + n.map(x=>x===0x40?'48':x===0x80?'44.1':x===0x10?'32':'LOCK').join(' · '));
    if (o.join() !== n.join()) tr('TABLE2 changed from the previous version.');
    decodeTrace(tr, esAt(SIM.t)); }); },
  setRx(v){ act('Receiver chip → '+v, tr => { D.rx = v; tr(v==='CS8414' ? 'CS8414 in the CS8412 footprint (v1.03 “updata cs8414”). Frequency codes inferred from TABLE2 v1.03.' : 'CS8412 (ISS2 netlist U6 = CS8412SM). Frequency codes ±400 ppm (4–7) and ±4 % (1–3), inferred from the datasheet and TABLE2 v1.00/1.01.'); decodeTrace(tr, esAt(SIM.t)); }); },
  term(){ act('TERM switch → ' + (D.term==='110'?'HiZ':'110 Ω'), tr => { D.term = D.term==='110' ? 'HiZ' : '110'; tr(`SW1 on the input ${D.term==='110'?'puts R1 (110 Ω) across':'removes R1 (110 Ω) from'} the T1 primary. Hardware only — the firmware cannot see it.`); tr('Use HiZ (> 20 kΩ) when bridging a line that is already terminated; 110 Ω at the end of a line (manual).'); }); },
  plugAna(side){ act(`${D.ana[side]?'Unplug':'Plug'} analog ${side==='L'?'LEFT':'RIGHT'} jack`, tr => { D.ana[side] = !D.ana[side]; tr('U1 (NE5532) balanced receiver → REL1 (latching relay) → meters and headphones. The firmware only sees this through the relay position it set.'); }); },
  phones(){ act(D.phones?'Unplug headphones':'Plug headphones', tr => { D.phones = !D.phones; tr('HDST jack after the U3 NE5532 headphone amplifiers; RV1 sets the level. No firmware involved.'); }); },
  vol(dv){ D.vol = Math.max(0, Math.min(1, D.vol + dv)); act('Headset level → ' + Math.round(D.vol*10), tr => tr('RV1 (dual pot) in front of the U3 headphone amplifiers. No firmware involved.')); },
  adapter(){ act(D.adapter?'Unplug 9 V adapter':'Plug 9 V adapter', tr => { D.adapter = !D.adapter; tr(D.adapter ? '9 V via PWRIN → REG1 LM7805; R2 121 Ω trickle-charges the NiCds (≈30 mA → the manual’s 18 h, inferred)' : 'Running on 4 × AA NiCd (4.8 V)'); }); },
  battLow(){ act(D.battLow?'Fresh batteries':'Batteries run low', tr => { D.battLow = !D.battLow; tr('LOW BATT is a hardware comparator (U11A LF353 on the BAT net) driving its own LED — the PIC is not involved. Threshold not in the archive (inferred).'); }); },
  reset(){ Object.assign(D, { ver:'1.03', rx:'CS8414', pos0:'DIGITAL', es0:'STATUS', events:[], start:'running', term:'110', cblMode:'free', adapter:false, battLow:false, phones:true, vol:0.55 });
    Object.assign(D.aes, { plugged:true, fs:48000, pro:true, emph:'none', data:'audio', fault:'none', lvlL:-20, lvlR:-24 }); Object.assign(D.ana, {L:true,R:true,lvlL:4,lvlR:0}); D.cfg = {pwrt:true, wdt:true};
    D.log = []; RUN_KEY = ''; SIM.refresh(); },
  clearEvents(){ D.pos0 = posAt(SIM.t); D.es0 = esAt(SIM.t); D.events = []; RUN_KEY=''; SIM.refresh(); },
};

/* ================================================================
   7. PANELS — built on the real silkscreen
   ================================================================ */
const ASSET = 'siumulation-plugins/assets/';
/* panel px (viewBox 1140 × 569 = 3.8 × 1.895 in at 300 dpi) from ABBFRNT.DXF inches */
const PX = X => (X - 3.784) * 300, PY = Y => (4.2 - Y) * 300;
const OUTLINE = '60.6,0 1079.4,0 1140,267.9 1079.4,568.5 60.6,568.5 0,267.9';
const FP = { mLx: PX(4.2238), mRx: PX(4.6238), mY: k => PY(4.0804 - 0.12*k), sX: PX(5.4738), sY: k => PY(3.8404 - 0.12*k),
  lb: [PX(6.274), PY(3.84)], jack: [PX(7.0238), PY(3.8344)], pot: [PX(7.0238), PY(2.7474)], sw1: [PX(5.4878), PY(2.57)], sw2: [PX(6.2878), PY(2.57)],
  screws: [[PX(3.8838), PY(3.3074)], [PX(7.4838), PY(3.3074)], [PX(5.8738), PY(2.7804)]] };
function ledSVG(x, y, b, col, offCol){
  const on = b > 0.02;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15.5" fill="#050606"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12.5" fill="${offCol}"/>` +
    (on ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12.5" fill="${col}" opacity="${Math.min(1, 0.25 + 0.75*b).toFixed(2)}" ${b > 0.25 ? 'filter="url(#abbGlow)"' : ''}/>` : '') +
    `<circle cx="${(x-4).toFixed(1)}" cy="${(y-4).toFixed(1)}" r="3.5" fill="#fff" opacity=".18"/>`;
}
function screw(x, y){ return `<circle cx="${x}" cy="${y}" r="20" fill="#9a9a94" stroke="#55554f" stroke-width="2"/><path d="M${x-11} ${y}h22M${x} ${y-11}v22" stroke="#4a4a45" stroke-width="5"/>`; }
function toggle(cx, cy, pos){   // pos: -1 left, 0 centre, +1 right
  const tip = cx + pos*50;
  return `<rect x="${cx-56}" y="${cy-20}" width="112" height="40" rx="20" fill="#050606" stroke="#2c2f31" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="15" fill="#8d8f8c"/>
    <line x1="${cx}" y1="${cy}" x2="${tip}" y2="${cy + (pos===0?-6:0)}" stroke="#d8dad6" stroke-width="13" stroke-linecap="round"/>
    <circle cx="${tip}" cy="${cy + (pos===0?-6:0)}" r="15" fill="#f1f2ef" stroke="#9a9c98" stroke-width="2"/>`;
}
function frontSVG(t, opts){
  opts = opts || {};
  const P = panelAt(t, opts.eye !== undefined ? opts.eye : D.eye);
  let s = `<svg viewBox="0 0 1140 569" role="img" aria-label="ABB-1 front panel (real silkscreen)" style="width:100%;max-width:820px;display:block">
    <defs><filter id="abbGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <polygon points="${OUTLINE}" fill="var(--dev)" stroke="#000" stroke-width="3"/>`;
  if (D.photo) s += `<image href="${ASSET}abb1-front-photo.jpg" width="1140" height="569" opacity=".55"/>`;
  s += `<image href="${ASSET}abb1-front-green.png" width="1140" height="569"/><image href="${ASSET}abb1-front-white.png" width="1140" height="569"/>`;
  METER_DB.forEach((db, k) => { s += ledSVG(FP.mLx, FP.mY(k), P.mL[k], k===0 ? '#ff4a3a' : 'var(--led-g)', k===0 ? '#3a1414' : '#10261a') + ledSVG(FP.mRx, FP.mY(k), P.mR[k], k===0 ? '#ff4a3a' : 'var(--led-g)', k===0 ? '#3a1414' : '#10261a'); });
  LEDN.forEach((n, k) => { s += `<g class="abbLed" data-led="${n}">${ledSVG(FP.sX, FP.sY(k), P.leds[n], '#ff3b30', '#3a1212')}<rect x="${FP.sX-200}" y="${FP.sY(k)-17}" width="420" height="34" fill="transparent"><title>${LEGEND_L[n]} / ${LEGEND_R[n]} — row ${['SEL3','SEL3','SEL2','SEL2','SEL1','SEL1','SEL0','SEL0'][k]}, column ${LED_RC[n][1]===6?'SEL4 (RC6)':'SEL5 (RC4)'}; STATERR bit ${LED_STAT_BIT[n]}</title></rect></g>`; });
  s += ledSVG(FP.lb[0], FP.lb[1], P.lb, '#ff3b30', '#3a1212');
  // headset jack
  const [jx, jy] = FP.jack;
  s += `<g class="abbJack" style="cursor:pointer"><circle cx="${jx}" cy="${jy}" r="80" fill="#0b0c0c" stroke="#262829" stroke-width="10" stroke-dasharray="6 5"/><circle cx="${jx}" cy="${jy}" r="40" fill="#020202"/>
    ${D.phones ? `<circle cx="${jx}" cy="${jy}" r="52" fill="#2a2c2e" stroke="#444" stroke-width="3"/><circle cx="${jx}" cy="${jy}" r="22" fill="#3a3c3e"/>` : ''}<circle cx="${jx}" cy="${jy}" r="86" fill="transparent"><title>Headset jack — click to ${D.phones?'unplug':'plug in'} headphones</title></circle></g>`;
  // level pot
  const [kx, ky] = FP.pot, a = Math.PI - D.vol*Math.PI;
  s += `<g class="abbPot" style="cursor:pointer"><circle cx="${kx}" cy="${ky}" r="72" fill="#0d0e0f" stroke="#2c2f31" stroke-width="3"/>
    ${Array.from({length:24},(_,i)=>{ const q=i*Math.PI/12; return `<line x1="${(kx+64*Math.cos(q)).toFixed(1)}" y1="${(ky+64*Math.sin(q)).toFixed(1)}" x2="${(kx+72*Math.cos(q)).toFixed(1)}" y2="${(ky+72*Math.sin(q)).toFixed(1)}" stroke="#2a2d30" stroke-width="4"/>`; }).join('')}
    <circle cx="${kx}" cy="${ky}" r="44" fill="#3c9d5d" stroke="#1f5a33" stroke-width="4"/>
    <line x1="${kx}" y1="${ky}" x2="${(kx+66*Math.cos(a)).toFixed(1)}" y2="${(ky-66*Math.sin(a)).toFixed(1)}" stroke="#f4f4f0" stroke-width="7" stroke-linecap="round"/>
    <circle cx="${kx}" cy="${ky}" r="92" fill="transparent"><title>HEADSET LEVEL (RV1) — click left/right half or use the wheel</title></circle></g>`;
  // switches
  s += `<g class="abbSw1" style="cursor:pointer">${toggle(FP.sw1[0], FP.sw1[1], P.es==='ERROR'?1:-1)}<rect x="${FP.sw1[0]-80}" y="${FP.sw1[1]-50}" width="160" height="100" fill="transparent"><title>STATUS / ERROR select (SW1 → RB0) — click to flip</title></rect></g>`;
  s += `<g class="abbSw2" style="cursor:pointer">${toggle(FP.sw2[0], FP.sw2[1], P.pos==='ANALOG'?-1:P.pos==='DIGITAL'?1:0)}<rect x="${FP.sw2[0]-90}" y="${FP.sw2[1]-50}" width="180" height="100" fill="transparent"><title>Power / mode SW2: ANALOG · OFF · DIGITAL (→ RB1) — click left, centre or right</title></rect></g>`;
  FP.screws.forEach(([x,y]) => s += screw(x.toFixed(1), y.toFixed(1)));
  if (opts.hot) s += opts.hot;
  return s + '</svg>';
}
/* rear: positions measured on the rectified photo (Bit Buddy Rear.JPG → DXF frame), guide line from ABB-1SLK.CDR */
const RP = { L:[160,370], R:[345,365], dc:[490,442], term:[667,487], xlr:[925,375], screws:[[30,268],[1110,268],[790,228],[1025,515]] };
function rearSVG(){
  let s = `<svg viewBox="0 0 1140 569" role="img" aria-label="ABB-1 rear panel" style="width:100%;max-width:820px;display:block">
    <polygon points="${OUTLINE}" fill="var(--dev)" stroke="#000" stroke-width="3"/>`;
  if (D.photo) s += `<image href="${ASSET}abb1-rear-photo.jpg" width="1140" height="569" opacity=".55"/>`;
  s += `<image href="${ASSET}abb1-rear-white.png" width="1140" height="569"/>`;
  const jack = (id, [x,y], plugged, tip) => `<g class="abbRj" data-j="${id}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="84" fill="#0c0d0d" stroke="#2a2c2d" stroke-width="12" stroke-dasharray="7 5"/><circle cx="${x}" cy="${y}" r="46" fill="#030303"/>
    ${plugged ? `<circle cx="${x}" cy="${y}" r="58" fill="#33363a" stroke="#5a5d60" stroke-width="3"/><rect x="${x-22}" y="${y+40}" width="44" height="${569-y-40}" fill="#2a2c2e"/>` : ''}
    <circle cx="${x}" cy="${y}" r="92" fill="transparent"><title>${tip} — click to ${plugged?'unplug':'plug in'}</title></circle></g>`;
  s += jack('L', RP.L, D.ana.L, 'Analog LEFT input (balanced 1/4" TRS)') + jack('R', RP.R, D.ana.R, 'Analog RIGHT input');
  const [dx, dy] = RP.dc;
  s += `<g class="abbRj" data-j="dc" style="cursor:pointer"><rect x="${dx-50}" y="${dy-48}" width="100" height="96" rx="6" fill="#050505" stroke="#2a2c2d" stroke-width="3"/><circle cx="${dx}" cy="${dy}" r="22" fill="#1d1d1d"/><circle cx="${dx}" cy="${dy}" r="7" fill="#c8c0a0"/>
    ${D.adapter ? `<circle cx="${dx}" cy="${dy}" r="36" fill="#222" stroke="#555" stroke-width="3"/><rect x="${dx-14}" y="${dy+30}" width="28" height="${569-dy-30}" fill="#1c1c1c"/>` : ''}<rect x="${dx-56}" y="${dy-54}" width="112" height="108" fill="transparent"><title>±9VDC adapter input (PWRIN) — click to ${D.adapter?'unplug':'plug in'}</title></rect></g>`;
  const [tx, ty] = RP.term;
  s += `<g class="abbRj" data-j="term" style="cursor:pointer"><rect x="${tx-55}" y="${ty-35}" width="110" height="70" rx="4" fill="#050505" stroke="#2a2c2d" stroke-width="3"/><rect x="${D.term==='110'?tx:tx-50}" y="${ty-30}" width="50" height="60" rx="3" fill="#1e1f20" stroke="#4a4c4e" stroke-width="2"/>
    ${[0,1,2,3,4].map(i=>`<line x1="${(D.term==='110'?tx:tx-50)+8+i*8}" y1="${ty-24}" x2="${(D.term==='110'?tx:tx-50)+8+i*8}" y2="${ty+24}" stroke="#3a3c3e" stroke-width="3"/>`).join('')}
    <rect x="${tx-60}" y="${ty-40}" width="120" height="80" fill="transparent"><title>TERM: HiZ / 110 Ω (SW1 across R1) — now ${D.term==='110'?'110 Ω':'HiZ'}; click to slide</title></rect></g>`;
  const [xx, xy] = RP.xlr;
  s += `<g class="abbRj" data-j="aes" style="cursor:pointer"><circle cx="${xx}" cy="${xy}" r="146" fill="#bfc1bd" stroke="#7b7d79" stroke-width="5"/><circle cx="${xx}" cy="${xy}" r="122" fill="#d9dbd7"/><circle cx="${xx}" cy="${xy}" r="104" fill="#0b0b0b"/>
    <circle cx="${xx-55}" cy="${xy+3}" r="18" fill="#c9b27a"/><circle cx="${xx+52}" cy="${xy+3}" r="18" fill="#c9b27a"/><circle cx="${xx-4}" cy="${xy+50}" r="18" fill="#c9b27a"/><circle cx="${xx-4}" cy="${xy-25}" r="9" fill="#222"/>
    <rect x="${xx-48}" y="${xy-180}" width="110" height="52" rx="18" fill="#c7c9c5" stroke="#7b7d79" stroke-width="3"/><text x="${xx+7}" y="${xy-145}" font-size="26" text-anchor="middle" fill="#444" font-family="Arial, sans-serif" letter-spacing="3">PUSH</text>
    ${D.aes.plugged ? `<circle cx="${xx}" cy="${xy}" r="118" fill="#2b2d30" stroke="#55585b" stroke-width="5"/><circle cx="${xx}" cy="${xy}" r="70" fill="#202224"/><rect x="${xx-40}" y="${xy+100}" width="80" height="${569-xy-100}" fill="#26282a"/>` : ''}
    <circle cx="${xx}" cy="${xy}" r="150" fill="transparent"><title>AES\\EBU INPUT (XLR-3F, T1 → CS8412/14) — click to ${D.aes.plugged?'unplug':'plug in'} the AES cable</title></circle></g>`;
  RP.screws.forEach(([x,y]) => s += screw(x, y));
  return s + '</svg>';
}
function bindPanel(root){
  const q = s => root.querySelector(s);
  const sw1 = q('.abbSw1'); if (sw1) sw1.onclick = () => A_.setES(esAt(SIM.t) === 'ERROR' ? 'STATUS' : 'ERROR');
  const sw2 = q('.abbSw2'); if (sw2) sw2.onclick = e => { const r = sw2.getBoundingClientRect(); const x = (e.clientX - r.left)/r.width; A_.setPos(x < 0.38 ? 'ANALOG' : x > 0.62 ? 'DIGITAL' : 'OFF'); };
  const jk = q('.abbJack'); if (jk) jk.onclick = () => A_.phones();
  const pot = q('.abbPot'); if (pot){ pot.onclick = e => { const r = pot.getBoundingClientRect(); A_.vol((e.clientX - r.left)/r.width < 0.5 ? -0.1 : 0.1); };
    pot.addEventListener('wheel', e => { e.preventDefault(); A_.vol(e.deltaY < 0 ? 0.05 : -0.05); }, {passive:false}); }
  root.querySelectorAll('.abbRj').forEach(g => g.onclick = () => { const j = g.dataset.j;
    if (j === 'aes') A_.plugAes(!D.aes.plugged); else if (j === 'term') A_.term(); else if (j === 'dc') A_.adapter(); else A_.plugAna(j); });
}
document.addEventListener('keydown', e => {
  if (!window.__abb1Keys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase();
  const m = { a:()=>A_.setPos('ANALOG'), o:()=>A_.setPos('OFF'), d:()=>A_.setPos('DIGITAL'), s:()=>A_.setES(esAt(SIM.t)==='ERROR'?'STATUS':'ERROR'), x:()=>A_.plugAes(!D.aes.plugged) };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- control panel (signal generator + what-ifs) ---------------- */
const RATES = [[32000,'32 kHz'],[44056,'44.056 kHz (NTSC pull-down)'],[44100,'44.1 kHz'],[47952,'47.952 kHz (48 k − 0.1 %)'],[48000,'48 kHz'],[38000,'38 kHz (vari-speed, inside 30–50 k)'],[52000,'52 kHz (above the range)'],[96000,'96 kHz']];
function controlsHTML(compact){
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`).join('')}</select>`;
  return `<div class="small" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:6px 12px;align-items:center">
    <label>Sample rate ${sel('cRate', RATES, D.aes.fs)}</label>
    <label>Format ${sel('cFmt', [['pro','Professional (AES3)'],['con','Consumer (S/PDIF)']], D.aes.pro?'pro':'con')}</label>
    <label>Emphasis ${sel('cEmph', [['none','none'],['both','50/15 µs, both subframes'],['A','50/15 µs, subframe A only']], D.aes.emph)}</label>
    <label>Data ${sel('cData', [['audio','audio'],['nonaudio','non-audio (e.g. AC-3)'],['mixed','A audio, B non-audio']], D.aes.data)}</label>
    <label>Fault on the line ${sel('cFault', [['none','none'],['validity','validity bit set'],['confidence','eye closing (confidence)'],['slip','slipped sample'],['crc','channel-status CRC error'],['parity','parity error'],['biphase','bi-phase coding error']], D.aes.fault)}</label>
    <label>AES level L <input id="cLL" type="range" min="-50" max="0" value="${D.aes.lvlL}"> <span class="mono">${D.aes.lvlL} dBFS</span></label>
    <label>AES level R <input id="cLR" type="range" min="-50" max="0" value="${D.aes.lvlR}"> <span class="mono">${D.aes.lvlR} dBFS</span></label>
    <label>Analog L / R <input id="cAL" type="number" min="-30" max="18" value="${D.ana.lvlL}" style="width:56px"> / <input id="cAR" type="number" min="-30" max="18" value="${D.ana.lvlR}" style="width:56px"> dBu</label>
    <label><input type="checkbox" id="cProg" ${D.prog?'checked':''}> program-like level movement</label>
    ${compact ? '' : `
    <label>Firmware ${sel('cVer', Object.keys(VERSIONS).map(v=>[v,'v'+v+' ('+SIM.year(+VERSIONS[v].date.slice(0,4))+')']), D.ver)}</label>
    <label>Receiver fitted ${sel('cRx', [['CS8412','CS8412'],['CS8414','CS8414']], D.rx)}</label>
    <label>The second starts ${sel('cStart', [['running','with the unit already running'],['power','at power-on (t = 0)']], D.start)}</label>
    <label>CBL with no lock <span class="tag-inf">inferred</span> ${sel('cCbl', [['free','keeps toggling (free-running PLL)'],['low','stuck low'],['high','stuck high']], D.cblMode)}</label>
    <label>Config bits (set by hand) <input type="checkbox" id="cPwrt" ${D.cfg.pwrt?'checked':''}> PWRT <input type="checkbox" id="cWdt" ${D.cfg.wdt?'checked':''}> WDT</label>`}
    <label><input type="checkbox" id="cEye" ${D.eye?'checked':''}> panel “as the eye sees it” (40 ms persistence); off = strobe at the playhead</label>
    <label><input type="checkbox" id="cPhoto" ${D.photo?'checked':''}> show the 2010|43 photo under the artwork</label>
    <label><input type="checkbox" id="cBatt" ${D.battLow?'checked':''}> batteries low</label>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button id="cClr">Keep the current switch positions, clear switch history</button><button id="cRst">Factory defaults</button></div>
  <div class="small muted" style="margin-top:4px">Keys: <b>A</b> ANALOG · <b>O</b> OFF · <b>D</b> DIGITAL · <b>S</b> STATUS/ERROR · <b>X</b> plug/unplug AES. A switch flipped while the playhead is at <i>t</i> takes effect from <i>t</i> on: scrub forward to watch the firmware react.</div>`;
}
function bindControls(root){
  const g = id => root.querySelector('#'+id); const on = (id, ev, fn) => { const e = g(id); if (e) e.addEventListener(ev, fn); };
  on('cRate','change', e => A_.setAes('fs', +e.target.value, 'Incoming sample rate → '+(+e.target.value/1000)+' kHz'));
  on('cFmt','change', e => A_.setAes('pro', e.target.value==='pro', 'Channel status → '+(e.target.value==='pro'?'professional':'consumer')));
  on('cEmph','change', e => A_.setAes('emph', e.target.value, 'Emphasis → '+e.target.value));
  on('cData','change', e => A_.setAes('data', e.target.value, 'Data → '+e.target.value));
  on('cFault','change', e => A_.setAes('fault', e.target.value, 'Line fault → '+e.target.value));
  on('cLL','change', e => { D.aes.lvlL = +e.target.value; SIM.refresh(); }); on('cLR','change', e => { D.aes.lvlR = +e.target.value; SIM.refresh(); });
  on('cAL','change', e => { D.ana.lvlL = +e.target.value; SIM.refresh(); }); on('cAR','change', e => { D.ana.lvlR = +e.target.value; SIM.refresh(); });
  on('cProg','change', e => { D.prog = e.target.checked; SIM.refresh(); });
  on('cVer','change', e => A_.setVer(e.target.value)); on('cRx','change', e => A_.setRx(e.target.value));
  on('cStart','change', e => { D.start = e.target.value; RUN_KEY=''; SIM.refresh(); });
  on('cCbl','change', e => A_.setAes('fault', D.aes.fault, (D.cblMode = e.target.value, 'What-if: CBL with no lock → '+e.target.value)));
  on('cPwrt','change', e => { D.cfg.pwrt = e.target.checked; SIM.refresh(); }); on('cWdt','change', e => { D.cfg.wdt = e.target.checked; SIM.refresh(); });
  on('cEye','change', e => { D.eye = e.target.checked; SIM.refresh(); }); on('cPhoto','change', e => { D.photo = e.target.checked; SIM.refresh(); });
  on('cBatt','change', () => A_.battLow());
  on('cClr','click', () => A_.clearEvents()); on('cRst','click', () => A_.reset());
}

/* ================================================================
   8. TIMELINE LANES
   ================================================================ */
const CAT_COL = { off:'--ink2', init:'--accent2', walk:'--warn', main:'--accent2', relay:'--bad', apoll:'--accent', amux:'--warn', ddeb:'--accent2', cbl0:'--grid', readE:'--bad', readF:'--warn', readC:'--accent2', decode:'--accent', stst:'--accent2', cblwait:'--chip', decide:'--accent', dmux:'--warn' };
function drawBool(c, X, t0, t1, y, h, pred, col, label){
  const r0 = rAt(t0), r1 = Math.max(rAt(t1), r0 + 1); let n = 0; const rects = [];
  spans(r0, r1, (a, b, st) => { if (pred(st)){ rects.push([a,b]); n++; } });
  c.fillStyle = col;
  if (rects.length > 4000){ c.globalAlpha = .35; c.fillRect(X(t0), y+h*.3, X(t1)-X(t0), h*.4); c.globalAlpha = 1; c.fillStyle = SIM.css('--ink'); c.font = '11px '+SIM.css('--mono'); c.fillText(`${rects.length} pulses${label?' · '+label:''}`, X(t0)+6, y+h/2+4); return; }
  rects.forEach(([a,b]) => c.fillRect(X(a*TCY), y+4, Math.max(1, X(b*TCY)-X(a*TCY)), h-8));
}
function lanes(){
  const R = sim(), rx = R.rx, css = n => SIM.css(n);
  const fsB = rx.lock ? rx.fs : FREE_FS, Tb = 192/fsB;
  const ls = [];
  ls.push({ label:'PIC16F73 — what the code is doing', h:34, draw(c, X, t0, t1, y, h){
    const r0 = rAt(t0), r1 = rAt(t1); let lo = 0, hi = R.runS.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (R.runS[m] <= r0) lo = m; else hi = m-1; }
    let shown = 0;
    for (let i = lo; i < R.runS.length && R.runS[i] <= r1; i++){
      const a = Math.max(R.runS[i], r0), b = Math.min(i+1 < R.runS.length ? R.runS[i+1] : CPS, r1), k = CAT[R.runK[i]];
      const xa = X(a*TCY), xb = X(b*TCY); c.fillStyle = css(CAT_COL[k]); c.globalAlpha = k==='cbl0'||k==='cblwait' ? 1 : .8; c.fillRect(xa, y+3, Math.max(1, xb-xa), h-6); c.globalAlpha = 1; shown++;
      if (xb - xa > 90){ c.fillStyle = (k==='cbl0'||k==='cblwait'||k==='off') ? css('--ink') : '#fff'; c.font = '10.5px sans-serif'; c.fillText(CAT_TXT[k].slice(0, Math.floor((xb-xa)/6)), xa+4, y+h/2+4); }
    }
  }});
  ls.push({ label:'AES3 in: blocks (Z) · frames', h:24, draw(c, X, t0, t1, y, h){
    if (!rx.lock){ c.fillStyle = css('--ink2'); c.font = '11px sans-serif'; c.fillText(D.aes.plugged ? `no lock (${(D.aes.fs/1000)} kHz is outside 30–50 kHz)` : 'no cable in the AES\\EBU INPUT', X(t0)+6, y+h/2+4); return; }
    SIM.pulses(c, X, t0, t1, y, h*0.55, Tb, 0, 1/fsB, css('--warn'), 'blocks of 192 frames');
    if ((t1-t0) < 400/fsB) SIM.pulses(c, X, t0, t1, y+h*0.5, h*0.5, 1/fsB, 0, 0.5/fsB, css('--accent2'), 'frames');
  }});
  ls.push({ label:'CBL → RC3 (block start)', h:22, draw(c, X, t0, t1, y, h){
    if (!rx.lock && D.cblMode !== 'free'){ c.fillStyle = css('--accent'); if (D.cblMode==='high') c.fillRect(X(t0), y+4, X(t1)-X(t0), h-8); c.fillStyle = css('--ink2'); c.font='11px sans-serif'; c.fillText('stuck '+D.cblMode+' (what-if)', X(t0)+6, y+h/2+4); return; }
    SIM.pulses(c, X, t0, t1, y, h, Tb, 0, CBL_HIGH_FRAMES/fsB, css('--accent'), 'CBL pulses');
  }});
  ls.push({ label:'SEL (RC2) · FCK gate (RC0·RC1)', h:24, draw(c, X, t0, t1, y, h){
    drawBool(c, X, t0, t1, y, h*0.55, selHi, css('--bad'), 'SEL high');
    const r0 = rAt(t0), r1 = Math.max(rAt(t1), r0+1); c.fillStyle = css('--accent2'); c.globalAlpha = .35;
    spans(r0, r1, (a,b,st) => { if (fckOsc(st)) c.fillRect(X(a*TCY), y+h*0.6, Math.max(1, X(b*TCY)-X(a*TCY)), h*0.35); }); c.globalAlpha = 1;
  }});
  ls.push({ label:'PORTA reads (E/F · C)', h:20, draw(c, X, t0, t1, y, h){
    const r0 = rAt(t0), r1 = rAt(t1); const rd = R.reads; let n = 0;
    for (const q of rd){ if (q[0] < r0 || q[0] > r1) continue; n++; if (n > 3000) break; c.fillStyle = q[2] ? css('--accent2') : css('--bad'); const x = X(q[0]*TCY); c.fillRect(x, y+3, 2, h-6); }
  }});
  ls.push({ label:'LED column SEL5 (RC4): 44·LOCK·PRE·ERR', h:18, draw(c,X,t0,t1,y,h){ drawBool(c,X,t0,t1,y,h, st=>drvHi(st,'C',4), css('--bad')); }});
  ls.push({ label:'LED column SEL4 (RC6): 48·32·CON·AUDIO', h:18, draw(c,X,t0,t1,y,h){ drawBool(c,X,t0,t1,y,h, st=>drvHi(st,'C',6), css('--warn')); }});
  ls.push({ label:'Meter bars: RC7 left · RC5 right', h:24, draw(c,X,t0,t1,y,h){ drawBool(c,X,t0,t1,y,h*0.5, barL, css('--accent')); drawBool(c,X,t0,t1,y+h*0.5,h*0.5, barR, css('--accent2')); }});
  ls.push({ label:'Relay coils RB4 analog · RB6 digital', h:22, draw(c,X,t0,t1,y,h){ drawBool(c,X,t0,t1,y,h*0.5, coilA, css('--warn')); drawBool(c,X,t0,t1,y+h*0.5,h*0.5, coilD, css('--bad')); }});
  ls.push({ label:'Timer2 TMR2IF (polled)', h:18, draw(c,X,t0,t1,y,h){ c.fillStyle = css('--accent2'); for (const r of R.t2flags){ const t = r*TCY; if (t < t0 || t > t1) continue; c.fillRect(X(t), y+3, 2, h-6); } }});
  ls.push({ label:'Watchdog: stretches with no CLRWDT', h:20, draw(c,X,t0,t1,y,h){
    c.fillStyle = css('--bad'); c.globalAlpha = .55; let n = 0, mx = 0;
    for (const [a,b] of R.wdtGaps){ const ta = a*TCY, tb = b*TCY; mx = Math.max(mx, tb-ta); if (tb < t0 || ta > t1) continue; n++; c.fillRect(X(ta), y+4, Math.max(1, X(tb)-X(ta)), h-8); }
    c.globalAlpha = 1; c.fillStyle = css('--ink'); c.font = '11px sans-serif';
    const resets = R.resets.filter(q => q.kind==='wdt' && q.r >= 0); resets.forEach(q => { c.fillStyle = css('--bad'); c.fillRect(X(q.r*TCY)-1, y, 3, h); });
    if (X(t1) - X(t0) > 200) c.fillText(`longest gap ${SIM.fmtDur(mx)} of ${SIM.fmtDur(WDT_S)} (WDT 18 ms × 1:128)${resets.length?' · WDT RESET':''}`, X(t0)+6, y+h/2+4);
  }});
  LEDN.forEach(n => ls.push({ label:`LED ${LEGEND_L[n]} / ${LEGEND_R[n]}`, h:13, draw(c,X,t0,t1,y,h){ drawBool(c,X,t0,t1,y-2,h+3, st=>ledOn(st,n), '#e5483b'); } }));
  return ls;
}

/* ================================================================
   9. VIEWS
   ================================================================ */
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0] ? `<div><b>${D.log[0].name}</b> <span class="muted">at ${SIM.fmtT(D.log[0].t)}</span></div>` + D.log[0].trace.map(s => `<div>→ ${s}</div>`).join('') : '<div class="muted">Flip a switch, plug a cable or change the incoming signal. Each step the firmware takes is listed here, with the real labels and registers.</div>'; }
function srcLineAt(t){ const p = pcAt(t); if (p === 0xFFFF) return null; const A = sim().A; return { pc: p, line: A.prog[p].line, text: A.prog[p].text, label: A.labelAt[p] }; }
function inspectHTML(t){
  const R = sim(), st = stAt(t), s = srcLineAt(t), k = catAt(t), lv = levels(t);
  const reg = a => h2(ramAt(t, a)), regs = ['MUX','STATERR','ERR','FREQ','STAT','TEMP'];
  const fsB = R.rx.lock ? R.rx.fs : FREE_FS;
  return `<table class="kv">
    <tr><th>Power / switch</th><td class="mono">${st.p ? 'ON' : 'OFF'} · ${posAt(t)} · ${esAt(t)} · relay → ${relayAt(t)}</td></tr>
    <tr><th>Code at the playhead</th><td class="mono">${s ? `${s.label} · line ${s.line+1}: <b>${s.text.replace(/</g,'&lt;')}</b> (PC ${h2(s.pc)})` : '—'}<br><span class="muted">${CAT_TXT[k]}</span></td></tr>
    <tr><th>File registers</th><td class="mono">${regs.map((n,i)=>`${n}=${reg(0x20+[0,1,2,3,4,5][i])}`).join(' · ')}</td></tr>
    <tr><th>Receiver (${D.rx})</th><td class="mono">${R.rx.lock ? 'locked' : 'NO LOCK'} · E2..E0 = ${R.rx.E.toString(2).padStart(3,'0')} (${ECODE[R.rx.E]}) · F2..F0 = ${R.rx.F.toString(2).padStart(3,'0')} · CBL = ${cblAt(t, R.rx)}</td></tr>
    <tr><th>AES position</th><td class="mono">${R.rx.lock ? `block ${Math.floor(t*fsB/192)} · frame ${Math.floor(t*fsB)%192}/191` : '—'}</td></tr>
    <tr><th>Ports (driven)</th><td class="mono small">PORTB ${b8(st.b)} TRISB ${b8(st.tb)}<br>PORTC ${b8(st.c)} TRISC ${b8(st.tc)}</td></tr>
    <tr><th>Headphones / meters</th><td class="small">${lv.src}${D.phones ? ' · level ' + Math.round(D.vol*10) + '/10' : ' · no headphones plugged in'}</td></tr>
    <tr><th>This second</th><td class="small mono">run ${R.ms.toFixed(0)} ms · ${R.t2flags.length} Timer2 flags · ${R.reads.length} PORTA reads · ${R.init2} TRIS rewrites</td></tr></table>`;
}

function viewSim(m){
  window.__abb1Keys = true;
  m.innerHTML = `
  <div class="grid2">
    <div>${card('Front panel at the playhead', `<div id="fp"></div><div class="small muted" style="margin-top:6px">Click the toggles (STATUS/ERROR; ANALOG · OFF · DIGITAL), the headset jack and the level knob. Hover a status LED for its row/column wiring.</div>`)}
      ${card('Rear panel — click the connectors and the TERM switch', `<div id="rp"></div>`)}</div>
    <div>${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('Incoming signal and what-ifs', `<div id="ctl"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second as the PIC sees it (click to seek; zoom and step on the transport bar)', `<canvas id="tl"></canvas>
    <p class="small muted">Everything on this chart comes from running the archived <span class="mono">abb1v1xx.asm</span> on a PIC16F73 model at 6.144 MHz (651 ns per instruction cycle). In DIGITAL the main loop runs once per AES block, because it waits for CBL to rise (<span class="mono">CBL0</span>) and to fall (<span class="mono">READSTAT/READERR</span>). In ANALOG it polls Timer2 (≈20 µs per poll) and swaps meter channels every 11.67 ms. Grey = waiting for CBL. CBL's duty cycle and the receiver's code tables are ${inf}.</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  m.querySelector('#ctl').innerHTML = controlsHTML(false); bindControls(m.querySelector('#ctl'));
  const draw = () => {
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = inspectHTML(t);
    m.querySelector('#log').innerHTML = D.log.map(e => `<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW: 230});
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (based on ABB-1MAN.pdf) ---------------- */
const ledNow = n => { const P = panelAt(SIM.t, true); return P.leds[n] > 0.2; };
const LESSONS = [
  { title:'Meet the Audio Bit Buddy', body:`<p>The ABB-1 is a <b>beltpack monitor</b>. Plug it into an AES/EBU (or S/PDIF) line, or into a pair of analog lines, and listen on headphones while the LEDs show what is on the line.</p>
     <p>Front panel, left to right: the <b>stereo bargraph</b> (12 LEDs per side, 0 dB = −20 dBFS or +4 dBu), the <b>eight status/error LEDs</b> with two legends each, the <b>STATUS/ERROR</b> toggle, the <b>ANALOG · OFF · DIGITAL</b> power toggle, the <b>headset jack</b> and its <b>level knob</b>. Rear: analog LEFT/RIGHT jacks, ±9 VDC, the <b>TERM HiZ/110</b> slide and the <b>AES\\EBU INPUT</b> XLR.</p>
     <p class="muted">The panel on the right is drawn on the real silkscreen (ABBFSLK2.cdr). Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Switch on and watch the self-test', body:`<p>Set the <b>power switch to OFF</b>, then to <b>DIGITAL</b> (keys O then D), and scrub forward. Before anything else the firmware waits 170 ms (<span class="mono">INIT → DELAY</span>), then walks one LED at a time: 48 → 44.1 → 32 → LOCK → CONSUMER → PRE-EMPH → AUDIO → RCV ERROR, 31 ms each (<span class="mono">TEST → DELVIS</span>). The manual doesn't mention this walk.</p><p>Shortcut: choose “The second starts at power-on” in the what-ifs.</p>`,
    check:()=> sim().runK.some(k => CAT[k]==='walk'), hint:'Press O, then D, then press Play or drag the time slider forward.' },
  { title:'2 · Connect the AES line', body:`<p>Click the <b>XLR</b> on the rear panel to plug in the AES cable. Leave <b>TERM on 110</b> when the ABB-1 is the end of the line. Use <b>HiZ</b> when you bridge a line that is terminated somewhere else. For 75 Ω coax, the manual recommends an IMP-1M adaptor.</p><p><b>Goal:</b> cable in, TERM = 110, switch on DIGITAL.</p>`,
    check:()=> D.aes.plugged && D.term==='110' && posAt(SIM.t)==='DIGITAL', hint:'Click the XLR (or press X); click TERM if it shows HiZ; power switch on DIGITAL.' },
  { title:'3 · Read the sample rate', body:`<p>In <b>STATUS</b> mode, one of the four top-left legends shows the rate: <b>48.0kHz</b>, <b>44.1kHz</b>, <b>32.0kHz</b>, or <b>LOCK</b> (locked to some other rate). The manual notes that only one of the four can be lit.</p><p><b>Goal:</b> feed a 44.1 kHz signal and see 44.1kHz light.</p>`,
    check:()=> D.aes.fs===44100 && ledNow('44'), hint:'Set the sample rate to 44.1 kHz in “Incoming signal”, and make sure STATUS is selected.' },
  { title:'4 · Off-speed and pulled-down rates', body:`<p>Try <b>38 kHz</b> (a vari-speed tape machine): it is still inside the 30–50 kHz lock range, so the unit locks and shows <b>LOCK</b>, meaning “some other rate”.</p><p>Then try <b>44.056 kHz</b> with the CS8412 and firmware v1.00. It also shows LOCK, because v1.01 was the release that started reporting 44.056 as 44.1 (see Findings).</p><p><b>Goal:</b> LOCK lit.</p>`,
    check:()=> ledNow('OUT'), hint:'Sample rate → 38 kHz.' },
  { title:'5 · Consumer format and emphasis', body:`<p>Put the rate back to 48 kHz. Switch the channel status to <b>Consumer</b> (S/PDIF): <b>CONSUMER</b> lights. Then set emphasis on <b>both subframes</b>: <b>PRE-EMPH</b> lights.</p><p class="muted">Set emphasis on subframe A only, and PRE-EMPH stays dark. The firmware ORs the two subframes together, and the emphasis pin is active-low.</p><p><b>Goal:</b> CONSUMER and PRE-EMPH both lit.</p>`,
    check:()=> ledNow('CON') && ledNow('PRE'), hint:'Format → Consumer; Emphasis → both subframes.' },
  { title:'6 · Something is wrong: RCV ERROR', body:`<p>Inject a <b>parity error</b>. In STATUS mode the bottom LED, <b>RCV ERROR</b>, lights. It lights for any receive error, even just the validity flag.</p><p><b>Goal:</b> parity error injected, RCV ERROR lit in STATUS mode.</p>`,
    check:()=> D.aes.fault==='parity' && esAt(SIM.t)==='STATUS' && ledNow('ERR'), hint:'Fault on the line → parity error.' },
  { title:'7 · Find out what: ERROR mode', body:`<p>Flip the <b>STATUS/ERROR</b> toggle to ERROR (key S). The same eight LEDs now use the right-hand legends: NO ERROR, VALIDITY BIT, CONFIDENCE FLAG, CRC ERROR, PARITY ERROR, BIPHASE ERROR, NO LOCK. The receiver reports only the highest-priority error.</p>
     <p>The manual says this shows PARITY ERROR. The firmware's <span class="mono">TABLE1</span> sends error code 5 (parity) to the LED labelled <b>BIPHASE ERROR</b>. Check which LED lights, and read Findings #1.</p><p><b>Goal:</b> ERROR mode with the parity fault.</p>`,
    check:()=> esAt(SIM.t)==='ERROR' && D.aes.fault==='parity', hint:'Click the STATUS/ERROR toggle or press S.' },
  { title:'8 · Clear the fault', body:`<p>Set the fault back to <b>none</b>. In ERROR mode the top LED, <b>NO ERROR</b>, lights. The manual suggests leaving the switch on STATUS unless RCV ERROR is lit.</p><p><b>Goal:</b> NO ERROR lit.</p>`,
    check:()=> esAt(SIM.t)==='ERROR' && ledNow('48'), hint:'Fault on the line → none.' },
  { title:'9 · Pull the cable', body:`<p>Unplug the AES cable (key X). The manual lists NO LOCK as the highest-priority error. In the firmware, no-lock is error code 7. TABLE1 sends that code to the <b>bottom</b> LED (RCV ERROR row), which has no ERROR-side legend, so the LED labelled “NO LOCK” stays dark. Both meters go dark too: <span class="mono">BTFSS ERR,2</span> skips the bar enables.</p><p><b>Goal:</b> cable out.</p>`,
    check:()=> !D.aes.plugged, hint:'Click the XLR or press X.' },
  { title:'10 · Back to STATUS', body:`<p>Plug the cable back in and return the toggle to <b>STATUS</b>. That is the mode the manual recommends for normal use.</p>`,
    check:()=> D.aes.plugged && esAt(SIM.t)==='STATUS', hint:'Press X and S.' },
  { title:'11 · Analog mode', body:`<p>Move the power switch to <b>ANALOG</b> (key A) and scrub forward. The firmware notices within one AES block and jumps to <span class="mono">RESET</span>, so you get the 170 ms pause and the LED walk again. It then pulses the latching relay's analog coil and starts the Timer2 meter multiplex.</p>
     <p>The manual: “In the analog mode, the RCV ERROR/NO LOCK LED is illuminated to indicate power on.” In the code that LED is lit only during the left-meter half of the multiplex (50 % duty, 43 Hz).</p><p><b>Goal:</b> ANALOG selected.</p>`,
    check:()=> posAt(SIM.t)==='ANALOG', hint:'Press A (or click the left side of the power toggle).' },
  { title:'12 · Listen', body:`<p>Turn the <b>HEADSET LEVEL</b> knob (click its left or right half, or use the mouse wheel). The headphone amplifiers (U3 NE5532) sit after the relay, so you hear whichever input the relay has selected. Use 600 Ω headphones (manual).</p><p><b>Goal:</b> level above 7.</p>`,
    check:()=> D.vol > 0.7, hint:'Click the right half of the knob a few times.' },
  { title:'Done', body:`<p>You've used every control on the ABB-1. <b>Software</b> shows the main loop and the source line running at the playhead. <b>One second</b> breaks the timing down to single instruction cycles. <b>Findings</b> lists where the firmware, the panel and the manual disagree.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__abb1Keys = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — using the ABB-1 (after ABB-1MAN.pdf)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div>`)}${card('Incoming signal', `<div id="ctl"></div>`)}</div></div>`;
  m.querySelector('#ctl').innerHTML = controlsHTML(true); bindControls(m.querySelector('#ctl'));
  const draw = () => {
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i) => `<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${(i<lessonIdx || (i>0 && !l.auto && l.check()))?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li => li.onclick = () => { lessonIdx = +li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok ? (L.auto ? 'Ready.' : '✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: ' + (L.hint||'') + '</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory defaults)</button></div>`;
    m.querySelector('#prv').onclick = () => { lessonIdx = Math.max(0, lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick = () => { lessonIdx = Math.min(LESSONS.length-1, lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick = () => { A_.reset(); lessonIdx = 0; draw(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__abb1Keys = false;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device — the PIC at the playhead', `<div id="dev"></div><h3>Source around the program counter</h3><pre id="src" class="log" style="max-height:260px;white-space:pre"></pre>`)}
    ${card('As seen by the displays', `<div class="grid2"><div><h3 style="margin-top:0">Strobe: what is lit at this instant</h3><div id="fpS"></div></div><div><h3 style="margin-top:0">The eye: 40 ms persistence</h3><div id="fpE"></div></div></div>
       <p class="small muted">The status LEDs and the meters are multiplexed. At any instant only one column of status LEDs and one meter bar is on, so the eye sees each at about 50 % brightness. Scrub in 1-block steps in DIGITAL, or 1 Timer2-period steps in ANALOG, to watch the two halves alternate.</p>
       <h3>Channel-status capture (what the CS8412/14 hands the PIC each block)</h3><div id="cs"></div>`)}
  </div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw = () => {
    const t = SIM.t, R = sim(), rx = R.rx, fsB = rx.lock ? rx.fs : FREE_FS;
    const cnt = k => { let n = 0; for (let i = 0; i < R.runK.length; i++) if (CAT[R.runK[i]] === k) n++; return n; };
    const passes = cnt('dmux'), muxes = R.t2flags.length;
    const rows = [
      ['PIC instruction cycles', CPS.toLocaleString(), SIM.fmtDur(TCY), '6.144 MHz crystal (X1) ÷ 4'],
      ['DELAY inner loop (DEC1: CLRWDT · DECFSZ · GOTO)', (CPS/4|0).toLocaleString()+' max', SIM.fmtDur(4*TCY), '4 cycles, not the 2 the comment assumes → every delay is 2× longer'],
      ['DELAY outer step (255 inner loops)', '', SIM.fmtDur(1023*TCY), 'INIT 0xFF → 169.8 ms · DELVIS 0x2F → 31.3 ms · relay 15 (=0x15) → 14.0 ms'],
      ['AES3 blocks (CBL pulses)', rx.lock || D.cblMode==='free' ? (fsB/192).toFixed(2) : '0', SIM.fmtDur(192/fsB), 'one DIGITAL pass per block: CBL0 → CBLOK → READSTAT/READERR → DIGMUX'],
      ['DIGITAL passes completed this second', passes.toLocaleString(), passes ? SIM.fmtDur(1/passes) : '—', 'each one toggles MUX: status column + meter bar swap'],
      ['Status column / bar swaps (ANALOG, Timer2)', muxes.toLocaleString(), muxes ? SIM.fmtDur(17920*TCY) : '—', 'PR2 = 0xDF, prescale 16, postscale 1:5 = 17 920 cycles'],
      ['PORTA reads', R.reads.length.toLocaleString(), '', '8 per DIGITAL pass: 3 × E, 3 × F, 2 × channel status'],
      ['TRIS rewrites (INIT2 and INIT)', R.init2.toLocaleString(), '', 'RB0/RB1/RC3 briefly become outputs on each one (see Findings)'],
      ['AES3 frames', rx.lock ? fsB.toLocaleString() : '—', SIM.fmtDur(1/fsB), '2 subframes × 32 bit cells; C bit = channel status, 1 per frame'],
      ['AES3 bit cells (biphase-mark)', rx.lock ? (128*fsB).toLocaleString() : '—', SIM.fmtDur(1/fsB/128), 'decoded by the CS8412/14 — the PIC never sees them'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Step units on the transport: 1 instruction cycle, 1 AES frame, 1 AES block (= 1 DIGITAL pass), 1 Timer2 meter period, 1 LED-walk step.</p>`;
    const s = srcLineAt(t), k = catAt(t);
    m.querySelector('#dev').innerHTML = inspectHTML(t);
    const A = R.A; const pre = m.querySelector('#src');
    if (s){ const a = Math.max(0, s.line - 7), b = Math.min(A.lines.length, s.line + 8);
      pre.innerHTML = A.lines.slice(a, b).map((l, i) => { const n = a + i; const esc = l.replace(/&/g,'&amp;').replace(/</g,'&lt;'); return `<div class="${n===s.line?'hl':''}">${String(n+1).padStart(4,' ')}  ${esc}</div>`; }).join(''); }
    else pre.innerHTML = '<div class="muted">CPU not running (power off or power-up timer).</div>';
    m.querySelector('#fpS').innerHTML = frontSVG(t, {eye:false}); m.querySelector('#fpE').innerHTML = frontSVG(t, {eye:true});
    m.querySelector('#cs').innerHTML = csHTML(t);
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
/* AES3 channel status bytes (for display) */
function csBytes(sub){
  const a = D.aes, b = new Array(24).fill(0);
  const emph = a.emph==='both' || (a.emph==='A' && sub===0), audio = a.data==='audio' || (a.data==='mixed' && sub===0);
  if (a.pro){
    b[0] = 1 | (audio?0:2) | (emph ? (1<<2)|(1<<3) : (1<<2)) | ((a.fs===48000||a.fs===47952)?(1<<7):a.fs===44100?(1<<6):a.fs===32000?(3<<6):0);
    b[2] = 0x2C;                                                // 24-bit max word length, 24 bits — illustrative
    let crc = 0xFF; for (let i = 0; i < 23; i++) for (let k = 0; k < 8; k++){ const bit = (b[i]>>k)&1; const fb = ((crc>>7)&1) ^ bit; crc = (crc<<1)&255; if (fb) crc ^= 0x1D; }
    b[23] = a.fault==='crc' ? crc ^ 0x5A : crc;
  } else {
    b[0] = (audio?0:2) | (emph ? (1<<3) : 0); b[3] = a.fs===48000?0x02:a.fs===32000?0x03:0x00;
  }
  return b;
}
function csHTML(t){
  const R = sim(), rx = R.rx, fsB = rx.lock ? rx.fs : FREE_FS, fr = Math.floor(t*fsB) % 192;
  if (!rx.lock) return '<p class="small muted">No lock: there is no channel-status block to capture.</p>';
  const A = csBytes(0), B = csBytes(1); const d = fwDecode();
  const cell = (bytes, i) => `<span class="mono" style="padding:0 2px;${(fr>>3)===i?'background:color-mix(in srgb,var(--warn) 35%,transparent)':''}">${bytes[i].toString(16).padStart(2,'0').toUpperCase()}</span>`;
  return `<div class="small">Subframe A bytes 0–23: ${A.map((_,i)=>cell(A,i)).join('')}<br>Subframe B bytes 0–23: ${B.map((_,i)=>cell(B,i)).join('')}</div>
    <p class="small">Frame ${fr}/191 carries C bit ${fr} (byte ${fr>>3}, bit ${fr&7}) = A:${(A[fr>>3]>>(fr&7))&1} B:${(B[fr>>3]>>(fr&7))&1}. The receiver collects all 192 C bits, checks the CRC (byte 23, professional only), and puts a few decoded flags on C0/Ca–Ce. The PIC reads them once per block, after CBL rises:</p>
    <table class="kv small"><tr><th>pin</th><th>PIC</th><th>A (CS12=0) → TEMP</th><th>B (CS12=1)</th><th>OR → STAT</th><th>used for</th></tr>
    ${[['C0',5,'RA5','CONSUMER (high)'],['Ca',4,'RA4','AUDIO (high)'],['Cb',3,'RA3','—'],['Cc',2,'RA2','PRE-EMPH (low)'],['Ce',1,'RA1','RCV ERROR (low, pro only)'],['Cd',0,'RA0','—']].map(([n,bit,pin,use])=>`<tr><td>${n}</td><td class="mono">${pin}</td><td class="mono">${(d.TEMP>>bit)&1}</td><td class="mono">${(d.rx.csB>>bit)&1}</td><td class="mono">${(d.STAT>>bit)&1}</td><td>${use}</td></tr>`).join('')}</table>
    <p class="small muted">Byte values follow AES3 / IEC 60958 (CRC x⁸+x⁴+x³+x²+1, preset 1s). Pin polarity is ${inf} from the firmware's own tests. Byte 2 is illustrative.</p>`;
}
function drawLadder(cv, t){
  const R = sim(), rx = R.rx, fsB = rx.lock ? rx.fs : FREE_FS;
  const levels = [['1 second', 1], ['100 ms', 0.1], ['1 AES block', 192/fsB], ['1 read burst (≈100 µs)', 1e-4], ['15 instruction cycles', 15*TCY]];
  const H = levels.length*40 + 10; const {c, w} = SIM.canvas(cv, H);
  const ink = SIM.css('--ink'), play = SIM.css('--play'), grid = SIM.css('--grid');
  levels.forEach(([nm, span], i) => {
    const y = 6 + i*40, t0 = Math.max(0, Math.min(1 - span, t - span/2)), x0 = 190, pw = w - x0 - 10;
    c.fillStyle = ink; c.font = '12px sans-serif'; c.fillText(nm + ' (' + SIM.fmtDur(span) + ')', 6, y + 20);
    c.strokeStyle = grid; c.strokeRect(x0, y + 2, pw, 30);
    const X = tt => x0 + (tt - t0)/span*pw;
    const r0 = rAt(t0), r1 = rAt(t0 + span); let lo = 0, hi = R.runS.length - 1; while (lo<hi){ const m=(lo+hi+1)>>1; if (R.runS[m] <= r0) lo = m; else hi = m-1; }
    for (let j = lo; j < R.runS.length && R.runS[j] <= r1; j++){ const a = Math.max(R.runS[j], r0), b = Math.min(j+1<R.runS.length?R.runS[j+1]:CPS, r1); const k = CAT[R.runK[j]]; c.fillStyle = SIM.css(CAT_COL[k]); c.fillRect(X(a*TCY), y+4, Math.max(1, X(b*TCY)-X(a*TCY)), 14); }
    c.fillStyle = SIM.css('--bad'); spans(r0, Math.max(r1, r0+1), (a,b,st) => { if (drvHi(st,'C',4)) c.fillRect(X(a*TCY), y+20, Math.max(1,X(b*TCY)-X(a*TCY)), 5); });
    c.fillStyle = SIM.css('--warn'); spans(r0, Math.max(r1, r0+1), (a,b,st) => { if (drvHi(st,'C',6)) c.fillRect(X(a*TCY), y+26, Math.max(1,X(b*TCY)-X(a*TCY)), 5); });
    const px = X(t); c.strokeStyle = play; c.lineWidth = 2; c.beginPath(); c.moveTo(px, y); c.lineTo(px, y + 34); c.stroke(); c.lineWidth = 1;
    if (i < levels.length - 1){ const ns = levels[i+1][1]; const a = X(Math.max(0, Math.min(1-ns, t - ns/2))); c.fillStyle = play; c.globalAlpha = .15; c.fillRect(a, y+2, Math.max(2, ns/span*pw), 30); c.globalAlpha = 1; }
  });
  c.fillStyle = SIM.css('--ink2'); c.font = '10.5px sans-serif'; c.fillText('top strip: code category (Software tab colours) · red: column SEL5 · amber: column SEL4', 190, H - 1);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  xlr:{x:10,y:20,w:150,h:78,t:'AES\\EBU INPUT',s:['XLR-3F · T1 PE65612','R1 110 Ω / TERM SW1'],d:'Transformer-balanced input. The rear TERM slide switches R1 (110 Ω) across the line or leaves it high-impedance (> 20 kΩ). For 75 Ω coax, the manual recommends the IMP-1M; an engineering memo describes a BNC conversion (R1 → 75 Ω).'},
  rx:{x:200,y:20,w:170,h:96,t:'CS8412 / CS8414 (U6)',s:['AES3 receiver + PLL','E/F or C pins (SEL)','CBL · I²S to the DAC'],d:'Crystal receiver. With SEL low it outputs the error code E2..E0 and, with a 6.144 MHz clock on FCK, the sample-rate code F2..F0. With SEL high it outputs channel-status flags C0, Ca–Ce for subframe 1 or 2 (CS12). CBL marks the start of each 192-frame block. Schematic and the 2009|42 netlist show the CS8412SM; v1.03 (2005|38) adapts the rate table to the CS8414.'},
  dac:{x:410,y:20,w:150,h:78,t:'CS4330 DAC (U10)',s:['18-bit stereo','SDATA · SCK · FSYNC · MCLK'],d:'Converts the receiver’s serial audio to analog for the meters and headphones. The firmware never touches it: no mute and no format control.'},
  ana:{x:10,y:140,w:140,h:78,t:'Analog inputs',s:['LEFT / RIGHT 1/4" TRS','U1 NE5532 balanced rx'],d:'Two balanced inputs (> 20 kΩ), +18 dBu before clipping (manual).'},
  rel:{x:410,y:150,w:150,h:78,t:'REL1 latching relay',s:['analog ⇄ DAC','coils: RB4 / RB6 via Q1/Q2'],d:'A latching DPDT relay chooses the analog inputs or the DAC output. SETA pulses the analog coil (RB4 low) and SETD the digital coil (RB6 low), each for DELAY2 = 0x15 → 14.0 ms.'},
  hp:{x:600,y:150,w:150,h:78,t:'Headset amp',s:['U3 NE5532 · RV1 level','HDST 1/4" jack'],d:'Stereo headphone amplifier after the relay, for 600 Ω headphones (manual). Hardware only.'},
  rect:{x:600,y:270,w:150,h:78,t:'Meter rectifiers',s:['U4 LF353 + 1N4148','→ U12 74HC4053'],d:'Precision rectifiers for L and R. The 74HC4053 (U12, A = SEL4) picks one of them for the single meter signal SIG. The firmware swaps it in step with the bar enables.'},
  fp:{x:600,y:380,w:150,h:96,t:'Front panel PCB',s:['2× LM3915 (U8/U9)','12-LED L/R bar, mux','8 status LEDs (2×4)'],d:'The two LM3915s drive one 12-LED bar from SIG. The PIC switches it between the left column (RC7) and the right column (RC5). The eight status LEDs form a matrix: rows SEL0–SEL3 (PORTB, low = on) × columns SEL4/SEL5 (PORTC, high = on).'},
  pic:{x:200,y:270,w:170,h:120,t:'PIC16F73 (U7)',s:['6.144 MHz, no interrupts','reads RA0–RA5, CBL, RB0/RB1','drives SEL, FCK gate, LEDs,','bars, relay coils'],d:'abb1v103.asm. Mode switch on RB1, STATUS/ERROR on RB0. In DIGITAL it runs once per AES block, timed by CBL. In ANALOG it polls Timer2 to multiplex the meters. The watchdog is cleared in every loop except CBL0.'},
  clk:{x:10,y:270,w:150,h:90,t:'6.144 MHz + 74HC00',s:['X1 · U5B/U5C oscillator','U5A/U5D gate → FCK/CS12','→ PIC OSC1'],d:'One gate oscillator clocks the PIC and, through two NAND gates, the receiver’s FCK pin. RC0 = RC1 = 1 passes the clock (frequency measurement). RC0 = 0 turns the pin into a static CS12 select: RC1 = 1 → subframe 1, RC1 = 0 → subframe 2.'},
  pwr:{x:10,y:378,w:150,h:100,t:'Power',s:['4×AA NiCd 4.8 V · 9 V in','REG1 LM7805 · U2 MAX1044','SW2 ANALOG·OFF·DIGITAL','U11A low-batt comparator'],d:'SW2 is an ON-OFF-ON toggle: one pole switches power, the other grounds RB1 for DIGITAL. MAX1044 makes the negative rail. R2 (121 Ω) trickle-charges the batteries from the adapter.'},
};
const WIRES = [['xlr','rx','AES3'],['rx','dac','I²S'],['dac','rel',''],['ana','rel',''],['rel','hp',''],['rel','rect',''],['rect','fp','SIG'],['rx','pic','E/F/C · CBL ⇅ SEL'],['clk','rx','FCK/CS12'],['clk','pic','OSC1 ⇄ RC0/RC1'],['pic','fp','SEL0–5 · RC5/RC7'],['pic','rel','RB4/RB6'],['pic','rect','SEL4'],['pwr','pic','RB1']];
function viewBlock(m){
  window.__abb1Keys = false; let sel = 'pic';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div><p class="small muted">Redrawn from the schematics, the ISS2 netlist and the functional drawing in <span class="mono">ABB1.cdr</span> / <span class="mono">RearPanel-functionalManual.cdr</span>.</p>`)}</div>
    <div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', `<p>The <b>receiver</b> turns AES3 into audio for the <b>DAC</b> and status for the <b>PIC</b>. The <b>relay</b> picks DAC or analog for the <b>headphones</b> and the <b>meter</b>. The PIC reads the receiver once per block and multiplexes the LEDs.</p>`)}${card('Live', `<div id="bdl" class="small"></div>`)}</div></div>`;
  const draw = () => {
    const ctr = b => [b.x + b.w/2, b.y + b.h/2];
    let s = `<svg viewBox="0 0 760 490" style="width:100%"><defs><marker id="abbAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l]) => { const A=BLOCKS[a], B=BLOCKS[b]; let [x1,y1]=ctr(A), [x2,y2]=ctr(B);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A,x1,y1,x2,y2); [x2,y2]=clip(B,x2,y2,x1,y1); const hot = sel===a || sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#abbAr)"/>`;
      if (l) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b = BLOCKS[k];
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s + '</svg>';
    m.querySelectorAll('[data-b]').forEach(g => g.onclick = () => { sel = g.dataset.b; draw(); });
    const b = BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d}</p>`;
    const R = sim(), st = stAt(SIM.t);
    m.querySelector('#bdl').innerHTML = `Receiver: ${R.rx.lock?'locked at '+(R.rx.fs/1000)+' kHz':'no lock'} · relay → ${relayAt(SIM.t)} · FCK ${fckOsc(st)?'running':'gated'} · SEL ${selHi(st)?'high (C pins)':'low (E/F pins)'} · bars ${barL(st)?'LEFT':''}${barR(st)?'RIGHT':''}${!barL(st)&&!barR(st)?'off':''}`;
  };
  draw(); SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x, y, w, name, left, right, sub){
  const n = Math.max(left.length, right.length), h = 26 + n*18;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net,hot]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="${hot?'var(--bad)':'var(--accent2)'}">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net,hot]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="${hot?'var(--bad)':'var(--accent2)'}">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · PIC16F73 (U7)', note:'Pin numbers and net names from ABB1 - #ISS2 #PCB/ABB-1-iss2.net (where the part is called PIC16C63A; schematic page 1 says PIC16C62A). Red = nets that are split in the netlist (see Findings).', svg:()=>
    chip(330, 50, 200, 'U7 PIC16F73 (28-pin)', [
      ['1 MCLR','+5V'],['2 RA0','CD / F1'],['3 RA1','CE / F2'],['4 RA2','CC / F0'],['5 RA3','CB / E2'],['6 RA4','CA / E1'],['7 RA5','“C0” ≠ “CO”',1],['8 VSS','GND'],['9 OSC1','U5 6.144 MHz'],['10 OSC2','—'],['11 RC0','CS12OSC → U5-1'],['12 RC1','CS12SEL → U5-13'],['13 RC2','SEL → U6-16'],['14 RC3','CBL ← U6-15'],
    ], [
      ['28 RB7','SEL3 (row 48/44)'],['27 RB6','→ RP1 → Q2 digital coil'],['26 RB5','SEL0 (row AUDIO/ERR)'],['25 RB4','→ RP1 → Q1 analog coil'],['24 RB3','SEL1 (row CON/PRE)'],['23 RB2','SEL2 (row 32/OUT)'],['22 RB1','“ADSW” ≠ “AD_SW”',1],['21 RB0','ASSW ← STATUS/ERROR'],['20 VDD','+5V'],['19 VSS','GND'],['18 RC7','RHIGH (fw: LEFT BAR)'],['17 RC6','SEL4 → U12-11, column'],['16 RC5','LHIGH (fw: RIGHT BAR)'],['15 RC4','SEL5 → column'],
    ], 'firmware v1.02+ target · 6.144 MHz external clock') },
  { name:'2 · Receiver and clock gate', note:'CS8412 pins from schematic page 1 and the netlist. The 74HC00 wiring (U5A pins 1-2-3, U5D pins 11-12-13, oscillator U5B/U5C with R21 10 MΩ, R22 4K7, C16/C17 22 pF) is from the netlist. Gate logic: FCK = NAND(NAND(RC0, OSC), RC1).', svg:()=>
    chip(120, 60, 190, 'U6 CS8412 / CS8414', [['9 RXP','T1-4'],['10 RXN','T1-3'],['13 CS12/FCK','← U5-11'],['16 SEL','← RC2'],['19 MCK','→ U10 MCLK'],['20 FILT','R30 1k + C31 47n']],
      [['6 C0/E0','→ RA5'],['5 Ca/E1','→ RA4'],['4 Cb/E2','→ RA3'],['3 Cc/F0','→ RA2'],['2 Cd/F1','→ RA0'],['27 Ce/F2','→ RA1'],['15 CBL','→ RC3'],['11 FSYNC','→ U10'],['12 SCK','→ U10'],['26 SDATA','→ U10']], 'AES3 receiver (U13 = second footprint, ECO 2008|41)')
    + chip(560, 80, 150, 'U5 74HC00', [['1','RC0 CS12OSC'],['2','OSC'],['13','RC1 CS12SEL'],['12','U5-3']], [['3','→ U5-12'],['11','→ FCK (U6-13)'],['6','OSC → PIC OSC1'],['8/9/10','X1 6M144']], 'gate oscillator + FCK gate')
    + `<text x="560" y="300" font-size="11" fill="var(--ink)">RC0 RC1 → FCK pin</text><text x="560" y="318" font-size="11" class="mono" fill="var(--ink2)">1   1   → 6.144 MHz (rate measurement)</text><text x="560" y="334" font-size="11" fill="var(--ink2)">0   1   → 0 = CS12: subframe 1 → TEMP</text><text x="560" y="350" font-size="11" fill="var(--ink2)">0   0   → 1 = CS12: subframe 2 → STAT</text>` },
  { name:'3 · Audio path', note:'From schematic page 1 and the netlist. Values as drawn: R3–R6 20K0, AL/AR/DL/DR 20K trims (meter calibration), C9/C10 47µ/25 V.', svg:()=>
    chip(80, 60, 140, 'U1 NE5532', [['IN L','LEFT TRS'],['IN R','RIGHT TRS']], [['OUT L','→ REL1'],['OUT R','→ REL1']], 'balanced input amps')
    + chip(80, 220, 140, 'U10 CS4330', [['1 SDATA','U6-26'],['2 SCK','U6-12'],['3 LRCK','U6-11 FSYNC'],['4 MCLK','U6-19']], [['AOUTL','→ C9 → REL1'],['AOUTR','→ C10 → REL1']], '18-bit DAC')
    + chip(360, 120, 140, 'REL1 (latching DPDT)', [['analog','U1'],['digital','U10'],['coil A','Q1 ← RB4'],['coil D','Q2 ← RB6']], [['out L','→ U3, U4'],['out R','→ U3, U4']], 'G5V / LDPDT')
    + chip(640, 60, 130, 'U3 NE5532', [['in','RV1 level']], [['out','HDST jack']], 'headset amps')
    + chip(640, 220, 130, 'U4 LF353 + D6–D9', [['in L','REL1 L'],['in R','REL1 R']], [['X0 L','U12-12'],['X1 R','U12-13']], 'rectifiers')
    + chip(640, 340, 130, 'U12 74HC4053', [['11 A','SEL4 (RC6)'],['6 INH','GND']], [['14 X','SIG → P2-9']], 'L/R meter select') },
  { name:'4 · Front panel PCB', note:'Schematic page 2 (“FRONT PANEL PCB”) and the netlist: LEDs L1_1–12 / L2_1–12 (top LED RED, the rest GRN), status LEDs L48 L44 L32 OUT CON PRE AUDIO ERR, row resistors RP2 (1k). U8/U9 are LM3915 (netlist pattern LM3916).', svg:()=>{
    let s = chip(90, 60, 150, 'U8 / U9 LM3915', [['5 SIG IN','SIG (P4-9)'],['9 MODE','(bar/dot — not traced)']], [['LED1–10','L/R columns (cathodes)'],['+ D11–D14','−21, −27 steps']], 'log 3 dB/step');
    s += `<text x="90" y="230" font-size="12" font-weight="700" fill="var(--ink)">Status matrix (rows active-low on PORTB, columns active-high on PORTC)</text>`;
    const rows = [['SEL3 RB7','48','44.1'],['SEL2 RB2','32','LOCK (OUT)'],['SEL1 RB3','CONSUMER','PRE-EMPH'],['SEL0 RB5','AUDIO','RCV ERR']];
    s += `<text x="300" y="258" font-size="11" fill="var(--warn)">SEL4 (RC6)</text><text x="470" y="258" font-size="11" fill="var(--bad)">SEL5 (RC4)</text>`;
    rows.forEach((r,i)=>{ const y = 280 + i*34; s += `<text x="90" y="${y+4}" font-size="11" class="mono" fill="var(--accent2)">${r[0]}</text><line x1="170" y1="${y}" x2="600" y2="${y}" stroke="var(--ink)"/>
      <circle cx="330" cy="${y}" r="9" fill="none" stroke="var(--ink)"/><text x="345" y="${y-6}" font-size="10" fill="var(--ink)">${r[1]}</text><circle cx="500" cy="${y}" r="9" fill="none" stroke="var(--ink)"/><text x="515" y="${y-6}" font-size="10" fill="var(--ink)">${r[2]}</text>`; });
    s += `<line x1="330" y1="262" x2="330" y2="392" stroke="var(--warn)"/><line x1="500" y1="262" x2="500" y2="392" stroke="var(--bad)"/>
      <text x="620" y="300" font-size="11" fill="var(--ink2)">LHIGH (RC5) / RHIGH (RC7)</text><text x="620" y="316" font-size="11" fill="var(--ink2)">switch the L / R meter column</text><text x="620" y="350" font-size="11" fill="var(--ink2)">LB (LOW BATT) ← U11A LF353</text>`;
    return s; } },
  { name:'5 · Power', note:'Schematic page 2 and the netlist: BAT (PAN200, 4 × AA “4.8V”), PWRIN (712A), R2 121 Ω, D1–D4, REG1 LM7805, U2 MAX1044, REL2 G5V-1, SW2 ON-OFF-ON.', svg:()=>
    chip(120, 70, 150, 'BAT / PWRIN', [['BAT','4 × AA NiCd'],['PWRIN','9 V 300 mA']], [['R2 121R','charge path'],['D1–D4','bridge']], 'inputs')
    + chip(380, 70, 150, 'REG1 LM7805', [['VI','+V']], [['VO','+5V']], '')
    + chip(380, 200, 150, 'U2 MAX1044', [['V+','+V']], [['OUT','−V (op-amps)']], 'charge pump')
    + chip(120, 230, 150, 'SW2 ON-OFF-ON', [['pole 1','power'],['pole 2','RB1 (ADSW)']], [['ANALOG','RB1 open (pull-up = 1)'],['OFF','no power'],['DIGITAL','RB1 grounded (0)']], 'ANALOG · OFF · DIGITAL')
    + chip(620, 70, 150, 'REL2 G5V-1', [['coil','SW net']], [['contacts','BAT / REG1 / D10']], 'power / charge switch') },
];
function viewSchem(m){
  window.__abb1Keys = false; let i = 0;
  m.innerHTML = card('Schematic set — REDRAWN from net names in the archive (not the original CAD)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The originals are <span class="mono">ABB-1 SCH PG1.pdf</span> / <span class="mono">PG2.pdf</span> (OrCAD, “ISS 2 PCB, Feb 10 2000”) and the P-CAD 2002 files in <span class="mono">ABB1 - #ISS2 #PCB/</span>. These sheets are a readable guide built from their pin and net names. Blue labels are nets.</p>`);
  const draw = () => {
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b => b.onclick = () => { i = +b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 880 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="868" height="458" fill="none" stroke="var(--line)"/>
      <text x="860" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">ABB-1 · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
const FLOW = [
  ['RESET (ORG 0) → CALL INIT', 'init'], ['INIT: DELAY 0xFF (169.8 ms), ports, TRIS', 'init'], ['TEST: LED walk, 8 × DELVIS (31.3 ms)', 'walk'], ['Timer2 set-up → RETURN', 'init'],
  ['MAIN / DIG: RB1 read 6× (debounce)', 'main'], ['SETA / SETD: relay coil 14.0 ms', 'relay'],
];
const FLOW_D = [['DIGITAL: RB1 5× → RESET if ANALOG','ddeb'],['CBL0: wait CBL = 1 (no CLRWDT!)','cbl0'],['CBLOK: SEL=0, E2..E0 → TABLE1 → ERR','readE'],['READ FREQUENCY: F2..F0','readF'],['READ CHANNEL STATUS: SEL=1, CS12 0/1','readC'],['OR subframes · TABLE2 · flags','decode'],['STST / ERRTST: RB0 5×','stst'],['READSTAT / READERR: wait CBL = 0','cblwait'],['INIT2 · STATERR (blank if no lock)','decide'],['DIGMUX / MUX1D: light one column + bar','dmux']];
const FLOW_A = [['ANALOG: CLRWDT · INIT2 · RB1 5× · test TMR2IF','apoll'],['MUXUP: PR2 = 0xDF, T2CON 1:16 · 1:5','amux']];
function viewSoft(m){
  window.__abb1Keys = false;
  m.innerHTML = `<div class="grid2">
    ${card('Main program — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('State machine', `<div id="fsm"></div>`)}${card('Interrupts', `<p class="small"><span class="mono">ORG 4H : RETFIE</span>. That is the whole interrupt handler. <span class="mono">INIT</span> and <span class="mono">MUXUP</span> set <span class="mono">PIE1,1</span> (“ENABLE TIMER2 INTERUPT”), but <span class="mono">INTCON</span> GIE/PEIE are never set, so no interrupt ever fires. Timer2 is polled through <span class="mono">PIR1,1</span>, and the digital loop is paced by polling CBL on RC3.</p>`)}
      ${card('Port / pin map, live at the playhead', `<div id="pins"></div>`)}</div></div>
  <div class="grid2">
    ${card('Source at the playhead — <span id="srcname" class="mono"></span>', `<div id="srcwrap" class="log" style="max-height:420px"><pre id="src" style="margin:0;white-space:pre"></pre></div><p class="small muted">The listing is the archived file, assembled as MPASM would (default radix hex). The highlighted line is the instruction executing at the playhead.</p>`)}
    <div>${card('Lookup tables (this version)', `<div id="tbl"></div>`)}${card('How the buttons did things — switch → code → wires', `<div id="btn"></div>`)}</div></div>`;
  let lastLine = -1;
  const draw = () => {
    const t = SIM.t, k = catAt(t), R = sim(), A = R.A, st = stAt(t), s = srcLineAt(t);
    const box = (x, y, w, txt, on, cat) => `<rect x="${x}" y="${y}" width="${w}" height="26" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+8}" y="${y+17}" font-size="11" fill="${on?'#fff':'var(--ink)'}" font-family="var(--mono)">${txt}</text>`;
    let f = `<svg viewBox="0 0 640 ${8 + 34*FLOW.length + 10 + 6 + 34*FLOW_D.length + 30}" style="width:100%"><defs><marker id="abbA2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    let y = 8; FLOW.forEach(([txt, c], i) => { const on = (k === c) && ((i===0||i===1||i===3) ? (i===1 ? k==='init' : false) || (c===k && i===1) : true); f += box(150, y, 340, txt, k===c && (c!=='init' || i===1), c); if (i) f += `<line x1="320" y1="${y-8}" x2="320" y2="${y}" stroke="var(--ink2)" marker-end="url(#abbA2)"/>`; y += 34; });
    const yb = y + 10;
    f += `<text x="20" y="${yb-2}" font-size="11" font-weight="700" fill="var(--ink)">ANALOG (RB1 = 1)</text><text x="330" y="${yb-2}" font-size="11" font-weight="700" fill="var(--ink)">DIGITAL (RB1 = 0) — once per AES block</text>`;
    FLOW_A.forEach(([txt, c], i) => f += box(10, yb + 6 + i*34, 300, txt, k===c, c));
    FLOW_D.forEach(([txt, c], i) => f += box(320, yb + 6 + i*34, 310, txt, k===c, c));
    f += `<path d="M160 ${yb+6+2*34} v12 h-140 v-${2*34+8}" fill="none" stroke="var(--ink2)" marker-end="url(#abbA2)"/><path d="M475 ${yb+6+FLOW_D.length*34} v10 h160 v-${FLOW_D.length*34+6} h-6" fill="none" stroke="var(--ink2)" marker-end="url(#abbA2)"/>
      <text x="10" y="${yb+6+2*34+30}" font-size="10.5" fill="var(--ink2)">switch moved → GOTO RESET (INIT and LED walk run again)</text>
      <text x="10" y="${yb+6+2*34+46}" font-size="10.5" fill="var(--ink2)">now: ${CAT_TXT[k]}${k==='off'?'':''}</text></svg>`;
    m.querySelector('#flow').innerHTML = f;
    // state machine
    const node = (x, y, lbl, on, sub) => `<g><rect x="${x-58}" y="${y-22}" width="116" height="44" rx="22" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-2}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    const inBoot = ['init','walk','main','relay'].includes(k), anaK = ['apoll','amux'].includes(k), digK = !inBoot && !anaK && k !== 'off';
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 520 200" style="width:100%">
      ${node(70,40,'OFF / PWRT',k==='off','SW2 centre')}${node(250,40,'INIT + TEST',inBoot,'≈ 0.43 s')}${node(430,40,'MAIN → SETx','',(k==='main'||k==='relay')?'now':'relay 14 ms')}
      ${node(150,150,'ANALOG',anaK,'Timer2 mux 11.67 ms')}${node(370,150,'DIGITAL',digK,'one pass / AES block')}
      <path d="M128 40 H192" stroke="var(--ink2)" marker-end="url(#abbA2)"/><path d="M308 40 H372" stroke="var(--ink2)" marker-end="url(#abbA2)"/>
      <path d="M410 62 L380 128" stroke="var(--ink2)" marker-end="url(#abbA2)"/><path d="M400 62 L180 128" stroke="var(--ink2)" marker-end="url(#abbA2)"/>
      <path d="M130 128 Q150 95 210 62" stroke="var(--warn)" fill="none" marker-end="url(#abbA2)"/><path d="M350 128 Q300 95 268 62" stroke="var(--warn)" fill="none" marker-end="url(#abbA2)"/>
      <text x="260" y="112" font-size="10" fill="var(--warn)" text-anchor="middle">GOTO RESET</text><text x="300" y="196" font-size="10" fill="var(--bad)" text-anchor="middle">WDT (≈2.3 s) if stuck in CBL0 → hardware reset → INIT</text></svg>`;
    // pins
    const pin = (n, dir, lvl, fn) => `<tr><td class="mono">${n}</td><td class="small">${dir}</td><td class="mono" style="color:${lvl==='1'?'var(--accent)':lvl==='0'?'var(--ink)':'var(--ink2)'}">${lvl}</td><td class="small">${fn}</td></tr>`;
    const lv = (port, bit) => { if (!st.p) return '–'; const tr = (port==='B'?st.tb:st.tc)>>bit&1; if (tr) return 'in'; return String((port==='B'?st.b:st.c)>>bit&1); };
    const rx = R.rx, sel = selHi(st);
    const raBits = sel ? (st.c & 2 ? rx.csA : rx.csB) : rx.efPins;
    m.querySelector('#pins').innerHTML = `<table class="kv"><tr><th>pin</th><th>dir</th><th>level</th><th>function</th></tr>
      ${[5,4,3,2,1,0].map(b=>pin('RA'+b,'in', st.p ? String(raBits>>b&1) : '–', ['CD / F1','CE / F2','CC / F0','CB / E2','CA / E1','C0 / E0'][b] + (sel?' (C pins)':' (E/F pins)'))).join('')}
      ${pin('RB0','in', st.p ? String(esAt(t)==='ERROR'?1:0) : '–','STATUS (0) / ERROR (1)')}${pin('RB1','in', st.p ? String(posAt(t)==='ANALOG'?1:0) : '–','DIGITAL (0) / ANALOG (1)')}
      ${pin('RB2','out',lv('B',2),'SEL2 row 32/LOCK')}${pin('RB3','out',lv('B',3),'SEL1 row CON/PRE')}${pin('RB4','out',lv('B',4),'analog coil (0 = pulse)')}${pin('RB5','out',lv('B',5),'SEL0 row AUDIO/ERR')}${pin('RB6','out',lv('B',6),'digital coil (0 = pulse)')}${pin('RB7','out',lv('B',7),'SEL3 row 48/44.1')}
      ${pin('RC0','out',lv('C',0),'CS12OSC')}${pin('RC1','out',lv('C',1),'CS12SEL')}${pin('RC2','out',lv('C',2),'SEL')}${pin('RC3','in', st.p ? String(cblAt(t, rx)) : '–','CBL')}${pin('RC4','out',lv('C',4),'SEL5 column')}${pin('RC5','out',lv('C',5),'right bar (LHIGH net)')}${pin('RC6','out',lv('C',6),'SEL4 column + 4053 A')}${pin('RC7','out',lv('C',7),'left bar (RHIGH net)')}</table>`;
    // source listing
    m.querySelector('#srcname').textContent = VERSIONS[D.ver].file + ' (v' + D.ver + ')';
    const pre = m.querySelector('#src');
    if (pre.dataset.ver !== D.ver){ pre.dataset.ver = D.ver; pre.innerHTML = A.lines.map((l,i)=>`<div data-l="${i}">${String(i+1).padStart(4,' ')}  ${l.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`).join(''); lastLine = -1; }
    const ln = s ? s.line : -1;
    if (ln !== lastLine){ const o = pre.querySelector('.hl'); if (o) o.classList.remove('hl'); if (ln >= 0){ const e = pre.querySelector(`[data-l="${ln}"]`); if (e){ e.classList.add('hl'); const wrap = m.querySelector('#srcwrap'); wrap.scrollTop += e.getBoundingClientRect().top - wrap.getBoundingClientRect().top - wrap.clientHeight/2; } } lastLine = ln; }
    // tables
    const d = fwDecode(); const nm = v => v===0x40?'48.0kHz':v===0x80?'44.1kHz':v===0x10?'32.0kHz':v===0x20?'LOCK':'?';
    m.querySelector('#tbl').innerHTML = `<table class="kv small"><tr><th>idx</th><th>TABLE1 (E2..E0)</th><th>LED (ERROR legend)</th><th>TABLE2 (F2..F0)</th></tr>
      ${[0,1,2,3,4,5,6,7].map(i=>`<tr><td class="mono">${i}</td><td class="mono" style="${i===d.ERRi?'font-weight:700;color:var(--accent)':''}">${b8(A.table1[i])} <span class="muted">${ECODE[i]}</span></td><td>${ledName(ledsFromStaterr(A.table1[i])[0],'ERROR')}</td><td class="mono" style="${i===d.Fi?'font-weight:700;color:var(--accent)':''}">${b8(A.table2[i])} ${nm(A.table2[i])}</td></tr>`).join('')}</table>
      <p class="small muted">Bold = what the receiver reports now. Error names by code follow the sales sheet's priority list (No Lock highest … No Error lowest). The code numbers are the Crystal datasheet's ${inf}.</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv small"><tr><th>Operator does</th><th>Firmware path</th><th>What changes on the wires</th></tr>
      <tr><td>ANALOG ⇄ DIGITAL</td><td class="mono">ANALOG / DIGITAL debounce → GOTO RESET → INIT → TEST → MAIN → SETA / SETD</td><td>170 ms dark, LED walk, RB4 or RB6 low for 14.0 ms, FCK gated off/on (RC0/RC1)</td></tr>
      <tr><td>OFF</td><td class="mono">—</td><td>power gone; relay stays latched</td></tr>
      <tr><td>STATUS ⇄ ERROR</td><td class="mono">STST / ERRTST (RB0 ×5) → READSTAT / READERR</td><td>STATERR = FREQ (+ RCV) or ERR, shown on the next DIGMUX</td></tr>
      <tr><td>Plug / unplug AES, rate, format, fault</td><td class="mono">CBLOK → TABLE1 · READ FREQUENCY → TABLE2 · READ CHANNEL STATUS → OR → flags</td><td>SEL (RC2) high for 12 cycles per block; CS12 static for 2 reads</td></tr>
      <tr><td>TERM, level knob, LOW BATT, headphones</td><td class="mono">none (hardware)</td><td>R1, RV1, U11A comparator, U3</td></tr></table>
      <p class="small">Last action: <b>${D.log[0] ? D.log[0].name : 'none yet — use the Simulator or Tutorial tab'}</b></p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__abb1Keys = false;
  const A3 = asmFor('1.03'), A0 = asmFor('1.00');
  const poll = ver => { const A = asmFor(ver); return 'ANALOG'; };
  m.innerHTML = card('What the ABB-1 firmware is up to — findings from the source', `
  <ol>
    <li><b>The error LEDs are one place off from their legends.</b> <span class="mono">TABLE1</span> turns error code E2..E0 into one LED: 0 → NO ERROR, 1 → VALIDITY, 2 → CONFIDENCE, 3 → “CRC ERROR”, 4 → “PARITY ERROR”, 5 → “BIPHASE ERROR”, 6 → “NO LOCK”, 7 → the bottom LED (RCV ERROR row, no ERROR legend).
      The sales sheet (<span class="mono">ABB-1SLS.WPD</span>) lists the receiver's errors by priority: No Lock, Bi-Phase, Parity, CRC, <i>Slipped Sample “not implemented — future”</i>, Confidence, Validity, No Error. So code 3 is slipped sample, 4 CRC, 5 parity, 6 bi-phase and 7 no lock (Crystal numbering ${inf}).
      The firmware agrees that 7 means no lock: it blanks the display on <span class="mono">BTFSC ERR,2</span>, and only TABLE1[7] sets that bit. The panel just skipped “slipped sample”. A parity error lights BIPHASE ERROR, a bi-phase error lights NO LOCK, and a real no-lock lights the unlabelled bottom LED. Try it in the Tutorial (steps 7–9).</li>
    <li><b>“15” means 0x15.</b> <span class="mono">SETA/SETD: MOVLW 15</span> — “DELAY2 = 15 FOR RELAY PULSE (5mS)”. MPASM's default radix is hex and the file never sets <span class="mono">LIST R=DEC</span>, so DELAY2 = 21. The <span class="mono">DELAY</span> comment also assumes 2 cycles per inner loop, but <span class="mono">DEC1: CLRWDT · DECFSZ · GOTO</span> takes 4. Result: 21 × 1023 cycles = <b>14.0 ms</b> coil pulse instead of 5 ms, which is comfortably long enough for a latching relay. The same arithmetic gives INIT's “boot” delay 169.8 ms and DELVIS 31.3 ms per LED-walk step.</li>
    <li><b>Every mode change reboots the display.</b> The debounce loops in <span class="mono">ANALOG</span> and <span class="mono">DIGITAL</span> exit with <span class="mono">GOTO RESET</span>. That is a software jump to address 0, so the 170 ms dark pause and the whole LED walk (≈0.43 s with the relay pulse) run on every ANALOG ⇄ DIGITAL flip, not just at power-on.</li>
    <li><b>The digital loop is clocked by the AES signal.</b> <span class="mono">CBL0</span> waits for CBL to rise and <span class="mono">READSTAT/READERR</span> wait for it to fall, so there is exactly one pass per 192-frame block. The status-LED and meter multiplex therefore follows the incoming rate: 250 passes/s at 48 kHz, 229.7 at 44.1 kHz, 166.7 at 32 kHz, so each LED column refreshes at half that. In ANALOG the same multiplex runs from Timer2 at 11.67 ms per half (42.9 Hz).</li>
    <li><b>CBL0 has no CLRWDT.</b> Every other loop clears the watchdog, but <span class="mono">CBL0 BTFSS PORTC,3 / GOTO CBL0</span> doesn't. If CBL ever stopped toggling while low, the PIC would sit there with the display frozen until the watchdog (OPTION_REG never changed → 1:128 → ≈2.3 s nominal) reset it, and then it would show the LED walk again. If CBL stuck high, <span class="mono">READSTAT</span> would spin forever <i>with</i> CLRWDT and never notice the switches. The manual says RCV ERROR lights with no signal, which needs the loop to keep running, so the receiver's CBL most likely keeps toggling from its free-running PLL ${inf}. Try the “CBL with no lock” what-if.</li>
    <li><b>Rate table history.</b> v1.00 (${SIM.year(1997)}): 44.056 kHz (code 110) → LOCK. v1.01 (${SIM.year(1998)}): “update reports 44056 as 44100”, so code 110 → 44.1. v1.02 (${SIM.year(2002)}): only the port to the flash PIC16F73. v1.03 (${SIM.year(2005)}): “updata cs8414”, which rewrites <span class="mono">TABLE2</span> so codes 0–4 → LOCK and 5/6/7 → 48/44.1/32.
      The firmware and the receiver have to match. v1.03 with a CS8412 shows an exact 48 kHz (±400 ppm code 100) as LOCK and an exact 44.1 kHz (code 101) as <b>48.0kHz</b>. v1.01 with a CS8414 shows 48 kHz as 44.1. Mix them on the Simulator tab to see it. The 2009|42 ISS2 netlist still lists a CS8412SM.</li>
    <li><b>The two subframes are ORed, with mixed polarity.</b> <span class="mono">'OR' SUB FRAME STAT</span> ORs TEMP (subframe 1) into STAT (subframe 2). AUDIO and CONSUMER (active-high pins) light if <i>either</i> subframe says so. PRE-EMPH and the channel-status CRC flag (active-low pins, <span class="mono">BTFSS</span>) need <i>both</i> subframes to agree. Emphasis on one channel only doesn't show. Pin polarity ${inf} from the firmware's own tests.</li>
    <li><b>RCV ERROR is broader than the manual implies.</b> In STATUS mode, <span class="mono">BTFSS ERR,6 / BSF STATERR,2</span> lights RCV ERROR for any non-zero code, including just the validity bit. The channel-status CRC pin (Ce) also lights it, but <span class="mono">BTFSC FREQ,1 / BCF FREQ,2</span> masks that for consumer streams, where Ce means something else.</li>
    <li><b>“Interrupt” that never interrupts.</b> <span class="mono">PIE1,1</span> is set twice (“ENABLE TIMER2 INTERUPT”), but GIE/PEIE are never set and the vector is a bare <span class="mono">RETFIE</span>. Timer2 is polled. The first meter period after reset runs at INIT's PR2 = 0xFF and postscale 1:13: <b>34.7 ms</b>, three times longer than the 11.67 ms that <span class="mono">MUXUP</span> then sets. <span class="mono">INIT2</span> also carries a dead second Timer2 set-up after its RETURN (with <span class="mono">BSF T2CON,4</span> twice).</li>
    <li><b>The switch inputs and CBL become outputs ≈50 000 times a second.</b> <span class="mono">INIT2</span> (called on every ANALOG poll and every DIGITAL pass) does <span class="mono">CLRF TRISB</span> and <span class="mono">CLRF TRISC</span> before setting the input bits back. For 1–2 instruction cycles (0.65–1.3 µs), RB0/RB1 drive the switch lines (behind RP1's 1 kΩ) and RC3 drives against the receiver's CBL output, which has no resistor. Harmless in practice ${inf}, but it is bus contention. This second the model counted ${'<span id="abbInit2"></span>'} <span class="mono">CLRF TRISB/TRISC</span> instructions.</li>
    <li><b>Comments that outlived the hardware.</b> “TURN ANALOG SWITCH ON” on <span class="mono">BSF PORTC,SEL5</span>: in the netlist SEL5 only reaches the front panel (an LED column). The 4053's INH is grounded and only SEL4 selects L/R. The firmware calls RC7 “LEFT BAR” and RC5 “RIGHT BAR”, but the netlist names them RHIGH and LHIGH.</li>
    <li><b>Split nets in the ISS2 netlist (${SIM.year(2009)}).</b> CS8412 pin 6 is on net <span class="mono">CO</span> (letter O) and PIC pin 7 (RA5) on net <span class="mono">C0</span> (zero). The mode switch side is <span class="mono">AD_SW</span> (RP1-7) and PIC pin 22 (RB1) is <span class="mono">ADSW</span>. Both are single-node nets. A board built strictly from this netlist would leave RA5 (E0 and the consumer flag) and RB1 (the mode switch) floating. Check the Gerbers before reusing it.</li>
    <li><b>Which PIC?</b> Schematic page 1 draws a PIC16C62A, the 2009 netlist a PIC16C63A, v1.00/1.01 assemble for the PIC16C73A and v1.02+ for the PIC16F73. All are pin-compatible 28-pin parts. The <span class="mono">ADCON1</span> write only matters on the ’73s.</li>
    <li><b>Config bits are nowhere.</b> There is no <span class="mono">__CONFIG</span>. The MPLAB project's [Fuses] section says Frequency = 4 MHz and WDTEnable = 0, which are emulator defaults, not the 6.144 MHz board. Because the code clears the watchdog everywhere, WDT on looks intended. The PIC is clocked from the 74HC00 gate oscillator on OSC1, so HS (or XT) both work. This model assumes PWRT and WDT on; untick them in the what-ifs ${inf}.</li>
    <li><b>v1.02's only change adds time.</b> The bank macros gained <span class="mono">BCF STATUS,6</span> (RP1, harmless on a 2-bank part). That adds one cycle per macro, so an ANALOG poll grows from 30 to 32 cycles (46.1 k → 48.0 k polls a second) and a <span class="mono">CALL INIT2</span> from 15 to 17. You can see it by switching versions with the playhead on the ANALOG poll.</li>
    <li><b>Manual vs panel vs sales sheet.</b> The manual: 12 LEDs “−21 to +18 dBu”, 0 VU = −20 dBFS. The silkscreen: −27 … +12 dB. The sales sheet: digital 0 dB = −12 dBFS, and “100 ohm” for 110. The manual says the RCV ERROR/NO LOCK LED shows power in analog mode. The code lights it only in the left-bar half of the multiplex (50 % duty).</li>
    <li><b>Housekeeping.</b> <span class="mono">ABB1V103.$$$</span> is byte-identical to <span class="mono">abb1v102.asm</span>: MPLAB's backup from when v1.03 was started. The project file still lists <span class="mono">abb1v101.asm</span> as its source but targets <span class="mono">ABB1V103.HEX</span>. The build logs move from <span class="mono">M:\\ABB1\\V100</span> (${SIM.year(1997)}–${SIM.year(1998)}) to <span class="mono">H:\\ABS1\\ABB1\\V100</span> (${SIM.year(2002)}–${SIM.year(2005)}). MUX is never initialised; it starts at whatever was in RAM.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Register addresses from the standard P16F73.INC (not archived). The core model covers the 17 instructions the program uses, Timer2, the watchdog and port read-modify-write.</li>
    <li>CS8412/CS8414 behaviour ${inf}: error codes as above; CS8412 rate codes 1–3 (±4 %) and 4–7 (±400 ppm); CS8414 codes 5/6/7 only (what v1.03 expects); CBL high for the first 32 frames of each block; free-running at 48 kHz with no lock; no lock outside 30–50 kHz (the manual's range).</li>
    <li>Channel-status pin polarity ${inf} from the firmware (C0 high = consumer, Ca high = audio, Cc low = emphasis, Ce low = CRC error in pro mode).</li>
    <li>Meters in bar mode, 0 dB = −20 dBFS / +4 dBu (manual) ${inf}. In the 2010|43 photo only a band of LEDs is lit, which could also mean dot mode.</li>
    <li>RAM is zero at power-up; PWRT 72 ms; WDT 18 ms × 128 (nominal; the real figure varies with temperature and voltage).</li>
    <li>Input changes (cable, rate, faults) apply to the whole second. Switch flips are timed events at the playhead.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>ABB1 - #Master/ABB1 - #Engineering/V100/ABB1V100.ASM · ABB1V101.ASM · abb1v102.asm · abb1v103.asm · ABB1V100.PJT · *.ERR · *.$$$</li>
    <li>…/ABB-1 SCH PG1.pdf · ABB-1 SCH PG2.pdf · ABB1 - #ISS2 #PCB/ABB-1-iss2.net · ABB-1-iss2.ECO</li>
    <li>…/ABB-1MAN.pdf · ABB-1SLS.WPD · ABBFSLK2.cdr · ABBFRNT.DXF · ABB-1SLK.CDR · ABB1.cdr · Bit Buddy Front.JPG · Bit Buddy Rear.JPG</li></ul>`);
  const e = m.querySelector('#abbInit2'); if (e) e.textContent = sim().init2.toLocaleString();
}

/* ================================================================
   10. REGISTER
   ================================================================ */
SIM.register({
  id:'abb1', name:'ABB-1 · Audio Bit Buddy AES monitor (1997|30)', duration:1,
  product:'ABB-1 Audio Bit Buddy', year:1997, family:'Portable monitors', folder:'ABB1 - #Master',
  summary:'Beltpack AES/EBU, S/PDIF and analog monitor: CS8412/CS8414 receiver, CS4330 DAC, 12-LED stereo bargraph and 8 dual-legend status/error LEDs, driven by a PIC16F73 running hand-written MPASM (v1.00–1.03). The archived source runs instruction by instruction in this model.',
  highlights:['Real abb1v103.asm assembled and run cycle by cycle at 6.144 MHz','Front panel on the ABBFSLK2 silkscreen, LEDs on the DXF drill points','Digital loop clocked by the AES block (CBL)','Error LEDs one place off from their legends','13-step operator tutorial from the manual','v1.00 → v1.03 rate tables and CS8412/CS8414 mix-ups'],
  depth:'Full model',
  stepUnits:[
    {label:'1 instruction cycle (651 ns)', period:()=>TCY},
    {label:'1 AES frame', period:()=>1/(rxState().lock?rxState().fs:FREE_FS)},
    {label:'1 AES block = 1 DIGITAL pass', period:()=>192/(rxState().lock?rxState().fs:FREE_FS)},
    {label:'1 Timer2 meter period (11.67 ms)', period:()=>17920*TCY},
    {label:'1 LED-walk step (31.3 ms)', period:()=>(1023*47+10)*TCY},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.025,'25 ms (2 analog mux periods)'],[0.008,'8 ms (2 AES blocks)'],[0.001,'1 ms'],[0.0002,'200 µs (read burst)'],[0.00004,'40 µs'],[0.00001,'10 µs (≈15 instructions)']],
  defaultZoom:3,
  init(){ RUN_KEY = ''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the ABB-1', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
/* exposed for testing only */
window.__abb1 = { D, A_, sim, asmFor, srcFor, fwDecode, panelAt, catAt };
})();
