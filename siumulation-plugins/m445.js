/* =====================================================================
   M445 — Extended Range Meter/Monitor (Ward-Beck Systems, 1995|28–1997|30, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html) — FULL MODEL, 68HC11 firmware emulated

   Sources (folder "#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive"):
   - CODE/KS0003.ASM  (1996-09-26) embedded verbatim below, ASSEMBLED by an AS11-compatible
       assembler in this file and EXECUTED instruction by instruction on a 68HC711E9 model.
       KS0002.ASM (1996-07-10) and KS0001.ASM (1996-01-29) are rebuilt from it with their exact diffs.
   - CODE/TMP         S-record (1237 bytes, $D000–$FFFF) — embedded; the KS0002 build matches it byte for byte.
   - CODE/SYNTAX.TXT, ASM11.BAT, CHKLIST.MS (AS11 rules, build command, converter list)
   - M445.WP          User's manual Issue #1, 1996-11-04 (WordPerfect, read with LibreOffice): spec,
                      operation (1)–(19), installation, LK2/LK3 configuration, parts list.
   - SA14-305/SM143051.DWG, SM143052.DWG  SA14-305 schematic sheets 1 (audio) and 2 (68HC11, charger, PSU)
   - S14-305A/S14305A1/2.DWG (SA14-305A), SA14-304/SM14-304.DWG (LCD/encoder), SA14-311/SM14311.DWG (speaker
     driver), SA14-307/SA14-307.DWG (light bar), SA14-324/SA14-324.DWG (M445A charger), SCHEM/445S01/445S02.DWG
     (rack frame / meter wiring), FM445.DWG (functional), MECHANIC/MM445-1.DWG (front panel 445-03-001),
     MECHANIC/445SILK.DWG (silkscreen art), FRPNL.DWG / RRPNL.DWG (speaker panels), MECHANIC/M445SILK.CDR.
     DWGs read with LibreDWG dwgread → JSON and redrawn entity by entity into assets/m445-*.svg.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const AS = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the archive; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__m445Active';

/* ---------------- CODE/KS0003.ASM, verbatim (CR/LF → LF) ---------------- */
const SRC3 = `* LOW POWER CODE VERSION 2, NOW USES MM5453N

RAM     EQU     $0000
REGS    EQU     $1000
EEPROM  EQU     $B600
EPROM   EQU     $D000
VECTORS EQU     $FFD6
RESET   EQU     $D000

PORTA   EQU     $00
PIOC    EQU     $02
PORTC   EQU     $03
PORTB   EQU     $04
PORTCL  EQU     $05
DDRB    EQU     $06
DDRC    EQU     $07
PORTD   EQU     $08
DDRD    EQU     $09
PORTE   EQU     $0A
CFORC   EQU     $0B
OC1M    EQU     $0C
OC1D    EQU     $0D
TCNT    EQU     $0E
TIC1    EQU     $10
TIC2    EQU     $12
TIC3    EQU     $14
TOC1    EQU     $16
TOC2    EQU     $18
TOC3    EQU     $1A
TOC4    EQU     $1C
TI4O5   EQU     $1E
TCTL1   EQU     $20
TCTL2   EQU     $21
TMSK1   EQU     $22
TFLG1   EQU     $23
TMSK2   EQU     $24
TFLG2   EQU     $25
PACTL   EQU     $26
PACNT   EQU     $27
SPCR    EQU     $28
SPSR    EQU     $29
SPDR    EQU     $2A
BAUD    EQU     $2B
EPROG   EQU     $2B
SCCR1   EQU     $2C
SCCR2   EQU     $2D
SCSR    EQU     $2E
SCDR    EQU     $2F
ADCTL   EQU     $30
ADR1    EQU     $31
ADR2    EQU     $32
ADR3    EQU     $33
ADR4    EQU     $34
BPROT   EQU     $35
OPTION  EQU     $39
COPRST  EQU     $3A
PPROG   EQU     $3B
HPRIO   EQU     $3C
INIT    EQU     $3D
TEST1   EQU     $3E
CONFIG  EQU     $3F

* BOOTSTRAP MODE JUMP TABLE FOR VECTORS

JSCI    EQU     $C4
JSPI    EQU     $C7
JPAIE   EQU     $CA
JPAOF   EQU     $CD

JTOF    EQU     $D0
JTOC5   EQU     $D3
JTOC4   EQU     $D6
JTOC3   EQU     $D9

JTOC2   EQU     $DC
JTOC1   EQU     $DF
JTIC3   EQU     $E2
JTIC2   EQU     $E5

JTIC1   EQU     $E8
JRTI    EQU     $EB
JIRQ    EQU     $EE
JXIRQ   EQU     $F1

JSWI    EQU     $F4
JILLEG  EQU     $F7
JCOP    EQU     $FA
JCMF    EQU     $FD

JMPOPC  EQU     $7E

; ----------   PORTA BITS   ----------

NMUTE   EQU     $40             ; A6
K1CLR   EQU     $20             ; A5
K1SET   EQU     $10             ; A4
BAT     EQU     $04             ; A2
KNOB2   EQU     $02             ; A1
KNOB1   EQU     $01             ; A0

; ----------   PORTB BITS   ----------

ATTEN   EQU     $08             ; B3
UNITY   EQU     $04             ; B2
GAIN    EQU     $02             ; B1
PM6     EQU     $01             ; B0

; ----------   PORTC BITS   ----------

REF8DB  EQU     $80             ; C7
REF0DB  EQU     $40             ; C6
FC      EQU     $20             ; C5
FCEN    EQU     $10             ; C4
NCS     EQU     $04             ; C2
CLK     EQU     $02             ; C1
DATA    EQU     $01             ; C0

; ----------   PORTD BITS   ----------

LCDCLK  EQU     $10             ; D4
LCDDATA EQU     $08             ; D3

; ----------   PORTE BITS   ----------

; NONE USED

; ----------   GENERAL EQUATES   ----------

; USE 4 MHz CRYSTAL THEN  E=1 MHz

K1_TI   EQU     6500            ; 6.5 msec
MUTE_TI EQU     5000            ; 5.0 msec
SCAN_TI EQU     4000            ; 4.0 msec
IC2AND3 EQU     $03
OC2     EQU     $40
OC3     EQU     $20
TALLY   EQU     $01             ; BIT 0 OF FLAGS

LEVEL0  EQU     60              ; INITIAL VALUE OF LEVEL
LEVEL4  EQU     64
LEVEL8  EQU     68

; ----------   RAM   ----------
        ORG     $0010
BUF     DS      5
CS3310  DS      1       ; VALUE SENT TO PORT B
KS1     DS      1
KS2     DS      1
STATE2  DS      1
DELTA   DS      1
LEVEL   DS      1
FLAGS   DS      1
ONESEC  DS      1
COUNTER DS      1

; ----------   CODE   ----------

        ORG     RESET

        STX     $FFFF
        STX     $FFFF
        SEI
        LDS     #$00BF
        LDX     #REGS
        CLR     OPTION,X
        CLR     TCTL1,X         ; DISABLE OUTPUT COMPARE
        CLR     TCTL2,X         ; INPUT CAPTURE AND PULSE ACC
        CLR     TMSK1,X
        CLR     TMSK2,X
        CLR     PACTL,X         ; INITIALIZE PORTS A,B & C
        CLR     PORTA,X         ; A7 AND A3 UNUSED INPUTS
        LDD     #$FF03
        STAA    PORTB,X
        STAB    PIOC,X          ; SIMPLE IO
        LDD     #$0F1F
        STAA    PORTC,X
        STAB    DDRC,X

        LDAB    #100             ; 1000 msec DELAY FOR POWER UP
        JSR     DELAY

        LDX     #REGS
        BSET    PORTA,X K1CLR   ; CLEAR RELAY
        LDD     TCNT,X
        ADDD    #K1_TI
        STD     TOC2,X          ; USE TIMER2
        LDAA    #OC2
        STAA    TFLG1,X         ; CLEAR OC2 FLAG
ML1     LDD     #$55AA
        STAA    COPRST,X
        STAB    COPRST,X
        BRCLR   TFLG1,X OC2 ML1 ; WAIT FOR OC2 TIMEOUT
        BCLR    PORTA,X K1CLR+K1SET

        LDAA    SPSR,X
        CLR     SPCR,X          ; DISABLE SPI
        LDD     #$3F38
        STAA    PORTD,X         ; INITALIZE PORTD
        STAB    DDRD,X

        LDAA    #JMPOPC
        STAA    JTOC1
        STAA    JTOC3
        STAA    JCOP
        STAA    JIRQ
        LDD     #TIMEOUT        ; FOR K1 SET & CLR
        STD     JTOC1+1
        LDD     #JSCAN          ; SCAN TIMER
        STD     JTOC3+1
        LDD     #RESET          ; COP -> RESET
        STD     JCOP+1
        LDD     #HALT           ; WHEN BATTERIES TOO LOW
        STD     JIRQ+1          ; STOP PROCESSOR

        CLR     BUF
        CLR     BUF+1
        CLR     BUF+2
        CLR     BUF+3
        CLR     BUF+4
        CLR     CS3310
        CLR     KS1
        CLR     KS2
        CLR     STATE2
        JSR     SCAN
        JSR     SCAN
        JSR     SCAN
        JSR     SCAN
        JSR     TXD             ; CLEAR LCD

        LDAA    #1
        STAA    DELTA
        LDX     #REGS           ; READ INITIAL LEVEL FROM LK 2 & 3
        LDAB    #LEVEL4
        BRCLR   PORTC,X REF0DB+REF8DB ML2
        LDAB    #LEVEL0
        BRCLR   PORTC,X REF0DB ML2
        LDAB    #LEVEL8
        BRCLR   PORTC,X REF8DB ML2
        LDAB    #LEVEL4
ML2     STAB    LEVEL
        LDAA    #TALLY
        STAA    FLAGS
        JSR     SETBUF
        JSR     TXD             ; INITIALIZE LCD

        LDX     #REGS
        BCLR    TCTL1,X $30
        LDAA    #OC3
        STAA    TFLG1,X         ; CLEAR PENDING OC3 INTERRUPTS
        BSET    TMSK1,X OC3     ; ENABLE SCAN INTERRUPT
        CLI

        LDAB    #20             ; 200 msec DELAY FOR -5V TO
        JSR     DELAY           ; STABLEIZE BEFORE MUTE CALIBRATION

        LDX     #REGS
        BSET    PORTA,X NMUTE   ; DEACTIVATE MUTE
        BCLR    TMSK1,X NMUTE                                   
        BCLR    TCTL1,X $C0
        LDD     TCNT,X
        BCLR    PORTA,X NMUTE   ; ACTIVATE MUTE
        ADDD    #MUTE_TI
        STD     TOC2,X          ; USE TIMER2
        LDAA    #NMUTE
        STAA    TFLG1,X         ; CLEAR OC2 FLAG
ML3     LDD     #$55AA
        STAA    COPRST,X
        STAB    COPRST,X
        BRCLR   TFLG1,X NMUTE ML3  ; WAIT FOR OC2 TIMEOUT
        BSET    PORTA,X NMUTE   ; DEACTIVATE MUTE


        LDAA    #$39            ; PUT RTS OPCODE AT $100
        STAA    $100
MAIN1   JSR     $100
        LDX     #REGS
        LDD     #$55AA          ; RESET COP
        STAA    COPRST,X
        STAB    COPRST,X
        BRCLR   FLAGS TALLY MAIN1

MAIN3   BCLR    FLAGS TALLY
        JSR     SETBUF
        TBA
        LDX     #REGS
        EORA    PORTB,X
        STAB    PORTB,X
        ANDA    #GAIN           ; COMPARE NEW OUTPUT TO PREVIOUS
        BEQ     MAIN4
        JSR     K1PULSE
MAIN4   JSR     TXD
        JMP     MAIN1


; ----------   STOP PROCESSOR   ----------

HALT   
	LDAB #25
	JSR DELAY
	LDX #REGS		;IS BAT OK
	BRSET PORTA,X BAT IGNORE ;IF YES IGNORE IRQ

	LDX     #REGS
        LDAA    #$FF
        STAA    PORTB,X
        JSR     K1PULSE
        LDAA    #192
        STAA    CS3310
        LDAA    #$90
        STAA    BUF
        CLR     BUF+1
        CLR     BUF+2
        CLR     BUF+3
        CLR     BUF+4
        JSR     TXD
        LDX     #REGS
        BRSET   PORTA,X K1CLR * ; WAIT FOR END OF K1PULSE
        BRSET   PORTA,X K1SET *
        LDAA    #$7F
        TAP                     ; ENABLE STOP OPCODE
        SEI                     ; DO NOT WANT /IRQ TO LEAVE STOP MODE
        STOP                    ; WHEN THE CLOCKS STOP
                                ; SO DOES THE COP.
	JMP     RESET
IGNORE  RTI

; ----------   NEXT STATE TABLE1   ----------

; DEBOUNCE INPUT STATE MACHINE
; BIT 0 INPUT - ACTIVE HIGH
; BIT 1 STATE
; BIT 2 STATE
; BIT 3 OUTPUT - SET AFTER INPUT=1 FOUR CONSECUTIVE TIMES
; BIT 4 OUTPUT - SET AFTER BIT 3 TOGGLES

KEYBIT  EQU     $08
KCH     EQU     $10

DEBTAB  DB      0, 2       ; KEYBIT CLEAR WHILE INPUT=0
        DB      0, 4
        DB      0, 6
        DB      0, 8+16    ; 4TH INPUT=1 SO SET KEYBIT

        DB      10, 8      ; KEYBIT SET WHILE INPUT=1
        DB      12, 8
        DB      14, 8
        DB      0+16, 8    ; 4TH INPUT=0 SO CLEAR KEYBIT

; ----------   NEXT STATE TABLE2   ----------

TINC    EQU     $80
TDEC    EQU     $40
TCH     EQU     $20
TCHINC  EQU     $A0
TCHDEC  EQU     $60

TABLE2

; DOWN
        DB      $00+$00, $04+$40, $18+$A0, $0C+$00
        DB      $10+$A0, $04+$00, $08+$00, $0C+$40
        DB      $00+$40, $04+$00, $08+$00, $1C+$A0
        DB      $00+$00, $14+$A0, $08+$40, $0C+$00
; UP
        DB      $10+$00, $04+$60, $18+$80, $1C+$00
        DB      $10+$80, $14+$00, $18+$00, $0C+$60
        DB      $00+$60, $14+$00, $18+$00, $1C+$80
        DB      $10+$00, $14+$80, $08+$60, $1C+$00

; ----------   SCAN CODE   ----------

; INPUT
; RETURN
; MODIFY   A,B,X
; PRESERVE Y

SCAN    LDX     #REGS
        LDAB    KS1
        BRCLR   PORTA,X KNOB1 SL1
        INCB
SL1     ANDB    #$0F
        LDX     #DEBTAB
        ABX
        LDAB    0,X
        STAB    KS1
        ANDB    #KEYBIT
        BEQ     SL2
        BSET    STATE2 $01
SL2
        LDX     #REGS
        LDAB    KS2
        BRCLR   PORTA,X KNOB2 SL3
        INCB
SL3     ANDB    #$0F
        LDX     #DEBTAB
        ABX
        LDAB    0,X
        STAB    KS2
        ANDB    #KEYBIT
        BEQ     SL4
        BSET    STATE2 $02
SL4
        LDAB    STATE2
        ANDB    #$1F
        LDX     #TABLE2
        ABX
        LDAB    0,X
        STAB    STATE2

INC_L   BRCLR   STATE2 TINC INC_3
        BSET    FLAGS TALLY
        LDAA    LEVEL
        LDAB    DELTA
        CMPB    #6
        BCS     INC_1
        LDAB    #5
INC_1   ABA
        CMPA    #91
        BCS     INC_2
        LDAA    #90
INC_2   STAA    LEVEL
        LDAA    #7
        STAA    DELTA
        JMP     DEC_3
INC_3

DEC_L   BRCLR   STATE2 TDEC DEC_3
        BSET    FLAGS TALLY
        LDAA    LEVEL
        LDAB    DELTA
        CMPB    #6
        BCS     DEC_1
        LDAB    #5
DEC_1   SBA
        BCC     DEC_2
        LDAA    #0
DEC_2   STAA    LEVEL
        LDAA    #7
        STAA    DELTA

DEC_3
        RTS


; ----------   TIME TO SCAN ENCODER  ----------

JSCAN   LDX     #REGS           ; TIMER 3 SCAN RATE
        LDD     TCNT,X
        ADDD    #SCAN_TI
        STD     TOC3,X
        LDAA    #OC3
        STAA    TFLG1,X         ; RESET OC3 FLAG
JSCAN1
        DEC     DELTA
        BNE     JSCAN2
        INC     DELTA
JSCAN2
        JSR     SCAN
        DEC     ONESEC          ; CHECK BAT PIN EVERY
        BNE     JSCAN3          ; 256*4ms = 1.024 seconds.

        LDX     #REGS
        BRSET   PORTA,X BAT NOTLOW
        BRSET   FLAGS BAT JSCAN3        ; BATTERIES LOW.
        BSET    FLAGS BAT+TALLY         ; UPDATE FLAGS & TALLY
        BRA     JSCAN3                  ; IF NECESSARY.
NOTLOW  BRCLR   FLAGS BAT JSCAN3        ; BATTERIES GOOD.
        BCLR    FLAGS BAT               ; UPDATE FLAGS & TALLY
        BSET    FLAGS TALLY             ; IF NECESSARY.
JSCAN3
        RTI


; ----------   TX SPI CODE   ----------

; INPUT    BUF LOADED WITH DISPLAY DATA, CS3310 VALUE SET
; RETURN
; MODIFY   A,B,X
; PRESERVE Y

TXERR   CLR     SPCR,X
        LDAA    SPDR,X
TXD     LDX     #REGS
        LDD     #$3F38
        STAA    PORTD,X
        STAB    DDRD,X
        LDAA    #$5F            ; SPI MASTER
        STAA    SPCR,X
        LDAA    SPSR,X
        BNE     TXERR

        LDAA    BUF
        STAA    SPDR,X          ; SEND LCD BYTE 1
        BCLR    PORTC,X NCS     ; CLEAR CS3310 CHIP SELECT
        BSR     TXCS            ; SEND CS3310 BYTE 1
        BSR     TXWAIT

        LDAA    BUF+1
        STAA    SPDR,X          ; SEND LCD BYTE 2
        BSR     TXCS            ; SEND CS3310 BYTE 2
        BSET    PORTC,X NCS     ; SET CS3310 CHIP SELECT
        BSR     TXWAIT

        LDAA    BUF+2
        BSR     TXSPI           ; SEND LCD BYTE 3
        LDAA    BUF+3
        BSR     TXSPI           ; SEND LCD BYTE 4
        LDAA    BUF+4
        BSR     TXSPI           ; SEND LCD BYTE 5
        CLR     SPCR,X          ; DISABLE SPI
        RTS

TXSPI   STAA    SPDR,X                  ; SEND DATA
TXWAIT  BRCLR   SPSR,X  $80 TXWAIT      ; WAIT FOR SPIF
        LDAA    SPDR,X                  ; CLR SPI FLAGS
        RTS

TXCS    LDAB    #8
        LDAA    CS3310
TXLOOP  ASLA
        BCLR    PORTC,X CLK
        BCC     TXCS0
        BSET    PORTC,X DATA
        BRA     TXCS1
TXCS0   BCLR    PORTC,X DATA
TXCS1   NOP
        BSET    PORTC,X CLK
        DECB
        BNE     TXLOOP
        RTS


; ----------   NEW LOOKUP TABLE   ----------

;    0               1        2         3      ;
; FLAGS 7 SIGN     DIGIT1   DIGIT2   CS3310VAL ;  MINUS   EQU     $80
;       3 ATTEN                                ;  ATTEN   EQU     $08
;       2 UNITY                                ;  UNITY   EQU     $04
;       1 GAIN                                 ;  GAIN    EQU     $02
;       0 +/- 6                                ;  PM6     EQU     $01

LUTAB2  DB      $8D, $7D, $3F, $E8

        DB      $8D, $6D, $6F, $E6,  $8D, $6D, $7F, $E4
        DB      $8D, $6D, $07, $E2,  $8D, $6D, $7D, $E0
        DB      $8D, $6D, $6D, $DE,  $8D, $6D, $66, $DC
        DB      $8D, $6D, $4F, $DA,  $8D, $6D, $5B, $D8
        DB      $8D, $6D, $06, $D6,  $8D, $6D, $3F, $D4
        DB      $8D, $66, $6F, $D2,  $8D, $66, $7F, $D0
        DB      $8D, $66, $07, $CE,  $8D, $66, $7D, $CC
        DB      $8D, $66, $6D, $CA,  $8D, $66, $66, $C8
        DB      $8D, $66, $4F, $C6,  $8D, $66, $5B, $C4
        DB      $8D, $66, $06, $C2,  $8D, $66, $3F, $C0

        DB      $8D, $4F, $6F, $BE,  $8D, $4F, $7F, $BC
        DB      $8D, $4F, $07, $BA,  $8D, $4F, $7D, $B8
        DB      $8D, $4F, $6D, $B6,  $8B, $4F, $66, $E6
        DB      $8B, $4F, $4F, $E4,  $8B, $4F, $5B, $E2
        DB      $8B, $4F, $06, $E0,  $8B, $4F, $3F, $DE
        DB      $8B, $5B, $6F, $DC,  $8B, $5B, $7F, $DA
        DB      $8B, $5B, $07, $D8,  $8B, $5B, $7D, $D6
        DB      $8B, $5B, $6D, $D4,  $8B, $5B, $66, $D2
        DB      $8B, $5B, $4F, $D0,  $8B, $5B, $5B, $CE
        DB      $8B, $5B, $06, $CC,  $8B, $5B, $3F, $CA

        DB      $8B, $06, $6F, $C8,  $8B, $06, $7F, $C6
        DB      $8B, $06, $07, $C4,  $8B, $06, $7D, $C2
        DB      $8B, $06, $6D, $C0,  $8A, $06, $66, $D2
        DB      $8A, $06, $4F, $D0,  $8A, $06, $5B, $CE
        DB      $8A, $06, $06, $CC,  $8A, $06, $3F, $CA
        DB      $8A, $6F, $00, $C8,  $8A, $7F, $00, $C6
        DB      $8A, $07, $00, $C4,  $8A, $7D, $00, $C2
        DB      $8A, $6D, $00, $C0,  $8A, $66, $00, $BE
        DB      $8A, $4F, $00, $BC,  $8A, $5B, $00, $BA
        DB      $8A, $06, $00, $B8,  $0A, $3F, $00, $B6

        DB      $07, $06, $00, $DC,  $07, $5B, $00, $DA
        DB      $07, $4F, $00, $D8,  $07, $66, $00, $D6
        DB      $07, $6D, $00, $D4,  $07, $7D, $00, $D2
        DB      $07, $07, $00, $D0,  $07, $7F, $00, $CE
        DB      $07, $6F, $00, $CC,  $07, $06, $3F, $CA
        DB      $07, $06, $06, $C8,  $07, $06, $5B, $C6
        DB      $07, $06, $4F, $C4,  $07, $06, $66, $C2
        DB      $07, $06, $6D, $C0,  $06, $06, $7D, $D2
        DB      $06, $06, $07, $D0,  $06, $06, $7F, $CE
        DB      $06, $06, $6F, $CC,  $06, $5B, $3F, $CA

        DB      $06, $5B, $06, $C8,  $06, $5B, $5B, $C6
        DB      $06, $5B, $4F, $C4,  $06, $5B, $66, $C2
        DB      $06, $5B, $6D, $C0,  $06, $5B, $7D, $BE
        DB      $06, $5B, $07, $BC,  $06, $5B, $7F, $BA
        DB      $06, $5B, $6F, $B8,  $06, $4F, $3F, $B6

; ----------   READ LOOKUP TABLE AND SET DISPLAY BUFFER  ----------

; INPUT    LEVEL MUST BE SET
; RETURN   B = FLAGS (FIRST BYTE OF RECORD IN LUTAB2)
; MODIFY   A,B,X
; PRESERVE Y

SETBUF  CLRA
        LDAB    LEVEL
        ASLD
        ASLD
        ADDD    #LUTAB2
        XGDX

        LDAA    #12+128         ; PLUS SIGN
        LDAB    0,X             ; *** RETURN VALUE IN B ***
        BPL     SET1
        LDAA    #8+128          ; MINUS SIGN
SET1    STAA    BUF
        LDAA    1,X
        STAA    BUF+1
        CMPA    #$3F            ; DON'T DISPLAY + OR - FOR ZERO
        BNE     SET2
        LDAA    #128
        STAA    BUF
SET2    LDAA    2,X
        STAA    BUF+2
        CLR     BUF+3
        CLR     BUF+4
        LDAA    3,X
        STAA    CS3310          ; SAVE VALUE TO SEND TO CS3310
        BRCLR   FLAGS BAT SET3
        BSET    BUF $10
SET3    RTS                     ; *** RETURN B ***

; ----------   PULSE EITHER K1SET OR K1CLR  ----------

; INPUT
; RETURN
; MODIFY   A,B,X
; PRESERVE Y

K1PULSE LDX     #REGS
K1WAIT  LDAA    PORTA,X
        ANDA    #K1CLR+K1SET    ; MAKE SURE THAT PREVIOUS
        BNE     K1WAIT          ; SET OR CLR PULSE IS OVER

        LDD     TCNT,X
        ADDD    #K1_TI
        STD     TOC1,X

        LDAA    #K1SET
        BRCLR   PORTB,X GAIN KP1   ; PULSE K1SET IF GAIN IS ACTIVE (LOW)
        LDAA    #K1CLR
KP1     STAA    OC1D,X

        LDAA    #K1CLR+K1SET
        STAA    OC1M,X
        LDAA    #$80
        STAA    CFORC,X         ; FORCE OC1
        CLR     OC1D,X
        STAA    TFLG1,X         ; CLEAR PENDING INTERRUPTS
        BSET    TMSK1,X $80     ; ENABLE OC1 INTERRUPTS
        RTS

TIMEOUT LDX     #REGS           ; STOP K1 PULSE
        LDAA    #$80
        STAA    TFLG1,X         ; RESET OC1 FLAG
        BCLR    TMSK1,X $80     ; DISABLE FURTHER OC1 INTERRUPTS
        RTI

; ----------   B * 10 msec DELAY   ----------

DELAY   STAB    COUNTER
        LDX     #REGS
        BCLR    TMSK1,X OC2
        BCLR    TCTL1,X $C0
DLY1    LDD     TCNT,X
        ADDD    #10000             ; 10 msec DELAY
        STD     TOC2,X
        LDAA    #OC2
        STAA    TFLG1,X            ; CLEAR OC2 FLAG
DLY2    LDD     #$55AA
        STAA    COPRST,X
        STAB    COPRST,X
        BRCLR   TFLG1,X OC2 DLY2   ; WAIT FOR OC2 TIMEOUT
        DEC     COUNTER
        BNE     DLY1
        RTS

; ----------   VECTORS   ----------

        ORG     $FFD6
        DW      JSCI
        DW      JSPI
        DW      JPAIE
        DW      JPAOF
        DW      JTOF
        DW      JTOC5
        DW      JTOC4
        DW      JTOC3
        DW      JTOC2
        DW      JTOC1
        DW      JTIC3
        DW      JTIC2
        DW      JTIC1
        DW      JRTI
        DW      JIRQ
        DW      JXIRQ
        DW      JSWI
        DW      RESET
        DW      JCOP
        DW      RESET
        DW      RESET

        END
`;
/* ---------------- CODE/TMP, verbatim ---------------- */
const TMP_S19 = `S123D000FFFFFFFFFFFF0F8E00BFCE10006F396F206F216F226F246F266F00CCFF03A70470
S123D020E702CC0F1FA703E707C664BDD484CE10001C0020EC0EC31964ED188640A723CC7D
S123D04055AAA73AE73A1F2340F51D0030A6296F28CC3F38A708E709867E97DF97D997FA44
S123D06097EECCD479DDE0CCD217DDDACCD000DDFBCCD133DDEF7F00107F00117F00127FA6
S123D08000137F00147F00157F00167F00177F0018BDD197BDD197BDD197BDD197BDD25419
S123D0A086019719CE1000C6401F03C00EC63C1F034008C6441F038002C640D71A86019732
S123D0C01BBDD41ABDD254CE10001D20308620A7231C22200EC614BDD484CE10001C004053
S123D0E01D22401D20C0EC0E1D0040C31388ED188640A723CC55AAA73AE73A1F2340F51C06
S123D10000408639B70100BD0100CE1000CC55AAA73AE73A131B01EF151B01BDD41A17CE0C
S123D1201000A804E70484022703BDD44FBDD2547ED107CE100086FFA704BDD44F86C097B0
S123D14015869097107F00117F00127F00137F0014BDD254CE10001E0020FC1E0010FC8608
S123D1607F060FCF7ED00000020004000600180A080C080E0810080044B80CB004084C4032
S123D1800408BC00B4480C1064981C9014186C6014189C1094681CCE1000D6161F00010130
S123D1A05CC40FCED1673AE600D716C4082703141801CE1000D6171F0002015CC40FCED14B
S123D1C0673AE600D717C4082703141802D618C41FCED1773AE600D7181318801D141B01C4
S123D1E0961AD619C1062502C6051B815B2502865A971A860797197ED21613184018141BCF
S123D20001961AD619C1062502C6051024028600971A8607971939CE1000EC0EC30FA0ED97
S123D2201A8620A7237A001926037C0019BDD1977A001C261ACE10001E000409121B040FCB
S123D240141B05200A131B0406151B04141B013B6F28A62ACE1000CC3F38A708E709865F89
S123D260A728A62926EA9610A72A1D03048D258D1C9611A72A8D1D1C03048D1196128D0BE3
S123D28096138D0796148D036F2839A72A1F2980FCA62A39C6089615481D030224051C037A
S123D2A00120031D0301011C03025A26EB398D7D3FE88D6D6FE68D6D7FE48D6D07E28D6DA5
S123D2C07DE08D6D6DDE8D6D66DC8D6D4FDA8D6D5BD88D6D06D68D6D3FD48D666FD28D6612
S123D2E07FD08D6607CE8D667DCC8D666DCA8D6666C88D664FC68D665BC48D6606C28D66C4
S123D3003FC08D4F6FBE8D4F7FBC8D4F07BA8D4F7DB88D4F6DB68B4F66E68B4F4FE48B4F30
S123D3205BE28B4F06E08B4F3FDE8B5B6FDC8B5B7FDA8B5B07D88B5B7DD68B5B6DD48B5B7A
S123D34066D28B5B4FD08B5B5BCE8B5B06CC8B5B3FCA8B066FC88B067FC68B0607C48B064B
S123D3607DC28B066DC08A0666D28A064FD08A065BCE8A0606CC8A063FCA8A6F00C88A7FB7
S123D38000C68A0700C48A7D00C28A6D00C08A6600BE8A4F00BC8A5B00BA8A0600B80A3F7B
S123D3A000B6070600DC075B00DA074F00D8076600D6076D00D4077D00D2070700D0077F1B
S123D3C000CE076F00CC07063FCA070606C807065BC607064FC4070666C207066DC006067F
S123D3E07DD2060607D006067FCE06066FCC065B3FCA065B06C8065B5BC6065B4FC4065B67
S123D40066C2065B6DC0065B7DBE065B07BC065B7FBA065B6FB8064F3FB64FD61A0505C31A
S123D420D2AE8F868CE6002A0286889710A6019711813F260486809710A60297127F001337
S123D4407F0014A6039715131B040314101039CE1000A600843026FAEC0EC31964ED168623
S123D460101F0402028620A70D8630A70C8680A70B6F0DA7231C228039CE10008680A7230B
S123D4801D22803BD71DCE10001D22401D20C0EC0EC32710ED188640A723CC55AAA73AE724
S10ED4A03A1F2340F57A001D26E539F1
S123FFD600C400C700CA00CD00D000D300D600D900DC00DF00E200E500E800EB00EE00F15F
S10DFFF600F4D00000FAD000D0009F
S9030000FC
`;

/* ---------------- AS11-compatible two-pass assembler (the subset KS000x uses, plus the common HC11 set) ----------------
   Rules copied from CODE/SYNTAX.TXT: comments start with * in column 1 or ';' after the operands, directives in capitals,
   forward references assemble as extended (16-bit) addressing, known values < $100 use direct addressing.            */
const OPS = (()=>{
  const T = {};
  // mnemonic: [imm, dir, ext, idx, immBytes]
  const g = (m, imm, dir, ext, idx, w)=>{ T[m]={imm,dir,ext,idx,w:w||1}; };
  g('LDAA',0x86,0x96,0xB6,0xA6); g('LDAB',0xC6,0xD6,0xF6,0xE6); g('LDD',0xCC,0xDC,0xFC,0xEC,2); g('LDS',0x8E,0x9E,0xBE,0xAE,2);
  g('LDX',0xCE,0xDE,0xFE,0xEE,2); g('STAA',null,0x97,0xB7,0xA7); g('STAB',null,0xD7,0xF7,0xE7); g('STD',null,0xDD,0xFD,0xED);
  g('STX',null,0xDF,0xFF,0xEF); g('STS',null,0x9F,0xBF,0xAF); g('ADDD',0xC3,0xD3,0xF3,0xE3,2); g('SUBD',0x83,0x93,0xB3,0xA3,2);
  g('ADDA',0x8B,0x9B,0xBB,0xAB); g('ADDB',0xCB,0xDB,0xFB,0xEB); g('SUBA',0x80,0x90,0xB0,0xA0); g('SUBB',0xC0,0xD0,0xF0,0xE0);
  g('ANDA',0x84,0x94,0xB4,0xA4); g('ANDB',0xC4,0xD4,0xF4,0xE4); g('ORAA',0x8A,0x9A,0xBA,0xAA); g('ORAB',0xCA,0xDA,0xFA,0xEA);
  g('EORA',0x88,0x98,0xB8,0xA8); g('EORB',0xC8,0xD8,0xF8,0xE8); g('CMPA',0x81,0x91,0xB1,0xA1); g('CMPB',0xC1,0xD1,0xF1,0xE1);
  g('BITA',0x85,0x95,0xB5,0xA5); g('BITB',0xC5,0xD5,0xF5,0xE5); g('CPX',0x8C,0x9C,0xBC,0xAC,2); g('ADCA',0x89,0x99,0xB9,0xA9); g('ADCB',0xC9,0xD9,0xF9,0xE9);
  g('SBCA',0x82,0x92,0xB2,0xA2); g('SBCB',0xC2,0xD2,0xF2,0xE2);
  for (const [m,e,i] of [['CLR',0x7F,0x6F],['INC',0x7C,0x6C],['DEC',0x7A,0x6A],['TST',0x7D,0x6D],['COM',0x73,0x63],['NEG',0x70,0x60],
    ['ASL',0x78,0x68],['LSL',0x78,0x68],['LSR',0x74,0x64],['ROL',0x79,0x69],['ROR',0x76,0x66],['ASR',0x77,0x67],['JMP',0x7E,0x6E]]) g(m,null,null,e,i);
  g('JSR',null,0x9D,0xBD,0xAD);
  const INH = {NOP:1,IDIV:2,FDIV:3,LSRD:4,ASLD:5,LSLD:5,TAP:6,TPA:7,INX:8,DEX:9,CLV:0xA,SEV:0xB,CLC:0xC,SEC:0xD,CLI:0xE,SEI:0xF,SBA:0x10,CBA:0x11,
    TAB:0x16,TBA:0x17,DAA:0x19,ABA:0x1B,TSX:0x30,INS:0x31,PULA:0x32,PULB:0x33,DES:0x34,TXS:0x35,PSHA:0x36,PSHB:0x37,PULX:0x38,RTS:0x39,ABX:0x3A,
    RTI:0x3B,PSHX:0x3C,MUL:0x3D,WAI:0x3E,SWI:0x3F,NEGA:0x40,COMA:0x43,LSRA:0x44,RORA:0x46,ASRA:0x47,ASLA:0x48,LSLA:0x48,ROLA:0x49,DECA:0x4A,
    INCA:0x4C,TSTA:0x4D,CLRA:0x4F,NEGB:0x50,COMB:0x53,LSRB:0x54,RORB:0x56,ASRB:0x57,ASLB:0x58,LSLB:0x58,ROLB:0x59,DECB:0x5A,INCB:0x5C,TSTB:0x5D,
    CLRB:0x5F,XGDX:0x8F,STOP:0xCF};
  const REL = {BRA:0x20,BRN:0x21,BHI:0x22,BLS:0x23,BCC:0x24,BHS:0x24,BCS:0x25,BLO:0x25,BNE:0x26,BEQ:0x27,BVC:0x28,BVS:0x29,BPL:0x2A,BMI:0x2B,
    BGE:0x2C,BLT:0x2D,BGT:0x2E,BLE:0x2F,BSR:0x8D};
  return {T, INH, REL, BIT:{BSET:[0x14,0x1C],BCLR:[0x15,0x1D],BRSET:[0x12,0x1E],BRCLR:[0x13,0x1F]}};
})();
function assemble(src){
  const lines = src.replace(/\r/g,'').split('\n');
  let syms = {};
  function val(expr, pc, pass){   // + - only (all the source needs); returns {v, known}
    let known = true, v = 0; const parts = expr.replace(/\s+/g,'').split(/(?=[+-])/);
    for (let p of parts){ let s=1; if (p[0]==='+'){p=p.slice(1);} else if (p[0]==='-'){s=-1;p=p.slice(1);}
      let x;
      if (p==='*') x=here; else if (p[0]==='$') x=parseInt(p.slice(1),16); else if (p[0]==='%') x=parseInt(p.slice(1),2);
      else if (/^\d+$/.test(p)) x=parseInt(p,10); else if (p[0]==="'") x=p.charCodeAt(1);
      else if (p.toUpperCase() in syms) x=syms[p.toUpperCase()]; else { known=false; x=0; if(pass===2) throw new Error('undefined symbol '+p); }
      v += s*x; }
    return {v, known};
  }
  let out, listing, here=0; const fwd = new Set();
  for (let pass=1; pass<=2; pass++){
    let pc = 0; out = new Map(); listing = [];
    const emit = b=>{ out.set(pc & 0xFFFF, b & 0xFF); pc++; };
    lines.forEach((raw, ln)=>{
      let line = raw.replace(/\t/g,'        ');
      if (!line.trim() || line[0]==='*' || line.trim()[0]===';'){ return; }
      const ci = line.indexOf(';'); if (ci>=0) line = line.slice(0,ci);
      let label=null, rest=line;
      if (line[0]!==' '){ const m=line.match(/^(\S+)\s*(.*)$/); label=m[1].toUpperCase(); rest=m[2]; }
      const m = rest.trim().match(/^(\S+)\s*(.*)$/); const op = m? m[1].toUpperCase() : null; let opd = m? m[2].trim() : '';
      if (op==='EQU'){ syms[label] = val(opd, pc, pass).v; return; }
      if (label) syms[label] = pc;
      if (!op) return;
      const start = pc; here = pc;
      if (op==='ORG'){ pc = val(opd,pc,pass).v; return; }
      if (op==='END') return;
      if (op==='DS'||op==='RMB'){ pc += val(opd,pc,pass).v; listing.push({a:start,n:0,ln}); return; }
      if (op==='DB'||op==='FCB'){ opd.split(',').forEach(e=>emit(val(e,pc,pass).v)); listing.push({a:start,n:pc-start,ln}); return; }
      if (op==='DW'||op==='FDB'){ opd.split(',').forEach(e=>{ const v=val(e,pc,pass).v; emit(v>>8); emit(v); }); listing.push({a:start,n:pc-start,ln}); return; }
      if (op in OPS.INH){ emit(OPS.INH[op]); }
      else if (op in OPS.REL){ emit(OPS.REL[op]); const t=val(opd,pc,pass).v; const r=t-(pc+1); if(pass===2&&(r<-128||r>127)) throw new Error('branch out of range line '+(ln+1)); emit(r); }
      else if (op in OPS.BIT){
        const tok = opd.split(/\s+/); const [od,oi]=OPS.BIT[op]; let idx=false, a=tok[0];
        if (/,X$/i.test(a)){ idx=true; a=a.slice(0,-2); }
        emit(idx?oi:od); emit(val(a,pc,pass).v); emit(val(tok[1],pc,pass).v);
        if (op[1]==='R'){ const t=val(tok[2],pc,pass).v; const r=t-(pc+1); emit(r); }
      }
      else if (op in OPS.T){
        const d = OPS.T[op];
        if (opd[0]==='#'){ const v=val(opd.slice(1),pc,pass).v; emit(d.imm); if(d.w===2) emit(v>>8); emit(v); }
        else if (/,X$/i.test(opd)){ emit(d.idx); emit(val(opd.slice(0,-2)||'0',pc,pass).v); }
        else { const r=val(opd,pc,pass);
          if (pass===1 && !r.known) fwd.add(ln);          // AS11: forward reference -> extended
          if (d.dir!=null && !fwd.has(ln) && r.v>=0 && r.v<256){ emit(d.dir); emit(r.v); }
          else { emit(d.ext); emit(r.v>>8); emit(r.v); }
        }
      } else throw new Error('unknown opcode '+op+' line '+(ln+1));
      listing.push({a:start, n:pc-start, ln});
    });
  }
  return {mem: out, listing, syms, lines};
}
function parseS19(txt){ const m=new Map(); txt.replace(/\r/g,'').split('\n').forEach(l=>{ if(l[0]!=='S'||l[1]!=='1') return;
  const n=parseInt(l.substr(2,2),16), a=parseInt(l.substr(4,4),16); for(let i=0;i<n-3;i++) m.set(a+i, parseInt(l.substr(8+2*i,2),16)); }); return m; }

/* ---------------- MC68HC711E9 instruction-level emulator ----------------
   CPU: every opcode the assembler above can emit, with Motorola cycle counts (E = 1 MHz from the 4 MHz XT1).
   On-chip peripherals modelled because KS0003 uses them: free-running TCNT, OC1 (with OC1M/OC1D/CFORC driving PA4/PA5),
   OC2 (delays), OC3 (4 ms scan interrupt), TFLG1/TMSK1, SPI master (SPCR $5F = E/32), ports A–E, COP watchdog,
   level-sensitive /IRQ and the STOP instruction. Everything is a pure function of the input-event list, so a
   recording can be replayed to any cycle from the nearest snapshot.                                                    */
const VEC = {RESET:0xFFFE, COP:0xFFFA, IRQ:0xFFF2, OC1:0xFFE8, OC2:0xFFE6, OC3:0xFFE4, SWI:0xFFF6, ILL:0xFFF8};
// cycles: [imm,dir,ext,idx] per family; inherent table below
const CYC_INH = {0x01:2,0x02:41,0x03:41,0x04:3,0x05:3,0x06:2,0x07:2,0x08:3,0x09:3,0x0A:2,0x0B:2,0x0C:2,0x0D:2,0x0E:2,0x0F:2,0x10:2,0x11:2,
  0x16:2,0x17:2,0x19:2,0x1B:2,0x30:3,0x31:3,0x32:4,0x33:4,0x34:3,0x35:3,0x36:3,0x37:3,0x38:5,0x39:5,0x3A:3,0x3B:12,0x3C:4,0x3D:10,0x3E:14,0x3F:14,
  0x8F:3,0xCF:2};
class HC11 {
  constructor(rom, env){
    this.rom = rom; this.env = env;          // env: {pins(cyc) -> {pa, pc, irq}, log(kind, cyc, data)}
    this.mem = new Uint8Array(0x10000).fill(0xFF);
    for (let a=0;a<0x200;a++) this.mem[a]=0;
    rom.forEach((v,a)=>{ this.mem[a]=v; });
    this.cyc = 0; this.cold();
  }
  cold(){ this.reg = new Uint8Array(64); this.r = {A:0,B:0,X:0,Y:0,S:0,PC:0,CC:0xD0};
    this.reg[0x06]=0; this.reg[0x07]=0; this.reg[0x09]=0; this.reg[0x39]=0x10;
    this.tcnt0 = this.cyc; this.copLast = this.cyc; this.cop55=false; this.spiEnd = -1; this.spiByte=0; this.stopped=false;
    this.pa = 0; this.pb = 0; this.pcl = 0; this.pd = 0;
    this.r.PC = this.rd16(VEC.RESET); this.env.log('reset', this.cyc, this.r.PC); }
  snapshot(){ return {cyc:this.cyc, ram:this.mem.slice(0,0x200), reg:this.reg.slice(), r:{...this.r}, tcnt0:this.tcnt0, copLast:this.copLast, cop55:this.cop55,
    spiEnd:this.spiEnd, spiByte:this.spiByte, stopped:this.stopped, pa:this.pa, pb:this.pb, pcl:this.pcl, pd:this.pd}; }
  restore(s){ this.cyc=s.cyc; this.mem.set(s.ram,0); this.reg=s.reg.slice(); this.r={...s.r}; Object.assign(this,{tcnt0:s.tcnt0,copLast:s.copLast,cop55:s.cop55,
    spiEnd:s.spiEnd,spiByte:s.spiByte,stopped:s.stopped,pa:s.pa,pb:s.pb,pcl:s.pcl,pd:s.pd}); }
  tcnt(){ return (this.cyc - this.tcnt0) & 0xFFFF; }
  /* ---- register block $1000-$103F ---- */
  rreg(o){ const p = this.env.pins(this.cyc);
    switch(o){
      case 0x00: return (this.pa & 0x70) | (p.pa & 0x8F);                         // PA0/1 encoder, PA2 BAT, PA4-6 outputs
      case 0x03: { const d=this.reg[0x07]; return (this.pcl & d) | (p.pc & ~d & 0xFF); }
      case 0x04: return this.pb;
      case 0x08: return (this.pd & this.reg[0x09]) | (0x3F & ~this.reg[0x09]);
      case 0x0E: return this.tcnt()>>8;   case 0x0F: return this.tcnt()&0xFF;
      case 0x29: { this.spiReadSR = true; return this.reg[0x29]; }
      case 0x2A: { if (this.spiReadSR){ this.reg[0x29] &= ~0xC0; this.spiReadSR=false; } return this.spiByte; }
      default: return this.reg[o];
    } }
  wreg(o, v){ const c=this.cyc;
    switch(o){
      case 0x00: { const nv=(this.pa & ~0x70) | (v & 0x70); if (nv!==this.pa){ this.pa=nv; this.env.log('pa', c, nv); } return; }
      case 0x03: if (v!==this.pcl){ this.pcl=v; this.env.log('pc', c, v); } return;
      case 0x04: if (v!==this.pb){ this.pb=v; this.env.log('pb', c, v); } return;
      case 0x08: this.pd=v; return;
      case 0x0B: if (v & 0x80) this.oc1Action(true); return;                         // CFORC: force OC1 now
      case 0x23: this.reg[0x23] &= ~v; return;                                       // TFLG1: write 1 to clear
      case 0x25: this.reg[0x25] &= ~v; return;
      case 0x28: this.reg[0x28]=v; if(!(v&0x40)) this.spiEnd=-1; return;
      case 0x2A: { const sp=this.reg[0x28]; if (sp&0x40 && sp&0x10){                 // SPE & MSTR: start a transfer
          if (this.spiEnd>c){ this.reg[0x29]|=0x40; this.env.log('wcol', c, v); return; }
          const div=[2,4,16,32][sp&3]; this.spiEnd = c + 8*div; this.spiByte = 0xFF; this.env.log('spi', c, {v, dur:8*div}); } return; }
      case 0x3A: if (v===0x55) this.cop55=true; else if (v===0xAA && this.cop55){ this.cop55=false; this.copLast=c; this.env.log('cop', c, 0); } else this.cop55=false; return;
      case 0x16: case 0x18: case 0x1A: case 0x1C: case 0x1E: this.reg[o]=v; return;
      default: this.reg[o]=v;
    } }
  oc1Action(forced){ const m=this.reg[0x0C], d=this.reg[0x0D]; if (!m) return;
    const nv = (this.pa & ~(m & 0xF8)) | (d & m & 0xF8); if (nv!==this.pa){ this.pa=nv; this.env.log('pa', this.cyc, nv); }
    if (forced) this.env.log('cforc', this.cyc, d); }
  rd(a){ a&=0xFFFF; if (a>=0x1000 && a<0x1040) return this.rreg(a-0x1000); return this.mem[a]; }
  wr(a,v){ a&=0xFFFF; v&=0xFF; if (a>=0x1000 && a<0x1040) return this.wreg(a-0x1000, v); if (a<0x200){ this.mem[a]=v; this.env.log('ram', this.cyc, a); } else this.env.log('romwr', this.cyc, a); }
  rd16(a){ return (this.rd(a)<<8)|this.rd(a+1); }
  wr16(a,v){ this.wr(a,v>>8); this.wr(a+1,v); }
  push(v){ this.wr(this.r.S, v); this.r.S=(this.r.S-1)&0xFFFF; }
  pull(){ this.r.S=(this.r.S+1)&0xFFFF; return this.rd(this.r.S); }
  /* ---- time advance: timer compares, SPI, COP ---- */
  advance(n){
    const t0 = this.tcnt(); this.cyc += n; const t1 = this.tcnt();
    for (const [o, bit] of [[0x16,0x80],[0x18,0x40],[0x1A,0x20],[0x1C,0x10]]){
      const toc=(this.reg[o]<<8)|this.reg[o+1]; const d=(toc - t0 - 1) & 0xFFFF;
      if (d < n){ this.reg[0x23] |= bit; if (bit===0x80) this.oc1Action(false); this.env.log('oc', this.cyc - n + d + 1, bit); }
    }
    if (this.spiEnd>=0 && this.cyc>=this.spiEnd){ this.spiEnd=-1; this.reg[0x29] |= 0x80; this.env.log('spif', this.cyc, 0); }
    if (this.env.copOn && this.cyc - this.copLast >= 32768){ this.env.log('copreset', this.cyc, this.r.PC); this.copLast=this.cyc; this.vectorReset(VEC.COP); }
  }
  vectorReset(vec){ const keep = this.mem.slice(0,0x200); this.cold(); this.mem.set(keep,0); this.r.PC = this.rd16(vec); }
  interrupt(vec, name){ const r=this.r; this.push(r.PC); this.push(r.PC>>8); this.push(r.Y); this.push(r.Y>>8); this.push(r.X); this.push(r.X>>8);
    this.push(r.A); this.push(r.B); this.push(r.CC); r.CC |= 0x10; r.PC = this.rd16(vec); this.env.log('irq', this.cyc, name); this.advance(12); }
  /* ---- flags ---- */
  nz8(v){ const c=this.r; c.CC=(c.CC&~0x0C)|(v&0x80?8:0)|((v&0xFF)===0?4:0); }
  nz16(v){ const c=this.r; c.CC=(c.CC&~0x0C)|(v&0x8000?8:0)|((v&0xFFFF)===0?4:0); }
  setC(b){ this.r.CC = b? this.r.CC|1 : this.r.CC&~1; } setV(b){ this.r.CC = b? this.r.CC|2 : this.r.CC&~2; }
  add8(a,b,c){ const r=a+b+c; this.setC(r>0xFF); this.setV(((a^r)&(b^r)&0x80)!==0); this.r.CC=(this.r.CC&~0x20)|(((a&0xF)+(b&0xF)+c)>0xF?0x20:0); this.nz8(r&0xFF); return r&0xFF; }
  sub8(a,b,c){ const r=a-b-c; this.setC(r<0); this.setV(((a^b)&(a^r)&0x80)!==0); this.nz8(r&0xFF); return r&0xFF; }
  step(){
    const r=this.r;
    if (this.stopped){ this.advance(1000); return 1000; }
    // pending interrupts (I clear): /IRQ (level) > OC1 > OC2 > OC3
    if (!(r.CC & 0x10)){
      const p=this.env.pins(this.cyc), f=this.reg[0x23], m=this.reg[0x22];
      if (!p.irq){ this.interrupt(VEC.IRQ,'IRQ'); return 12; }
      if (f&m&0x80){ this.interrupt(VEC.OC1,'OC1'); return 12; }
      if (f&m&0x40){ this.interrupt(VEC.OC2,'OC2'); return 12; }
      if (f&m&0x20){ this.interrupt(VEC.OC3,'OC3'); return 12; }
    }
    const pc0=r.PC, op=this.rd(r.PC); r.PC=(r.PC+1)&0xFFFF;
    this.env.ins(this.cyc, pc0);
    const n = this.exec(op);
    this.advance(n); return n;
  }
  exec(op){
    const r=this.r, imm8=()=>{ const v=this.rd(r.PC); r.PC=(r.PC+1)&0xFFFF; return v; }, imm16=()=>{ const v=this.rd16(r.PC); r.PC=(r.PC+2)&0xFFFF; return v; };
    const hi=op>>4, lo=op&0xF;
    // ---- inherent / branches / bit ops ($00-$3F) ----
    if (op<0x40 && !(op>=0x12&&op<=0x15) && !(op>=0x1C&&op<=0x1F) && !(op>=0x20&&op<=0x2F)){
      switch(op){
        case 0x01: break;
        case 0x04: { const d=(r.A<<8|r.B); this.setC(d&1); const v=d>>>1; r.A=v>>8; r.B=v&0xFF; this.nz16(v); this.setV(false^(d&1)); break; }
        case 0x05: { const d=(r.A<<8|r.B); const v=(d<<1)&0xFFFF; this.setC(d&0x8000); r.A=v>>8; r.B=v&0xFF; this.nz16(v); this.setV(((v>>15)^(d>>15&1))&1); break; }
        case 0x06: r.CC = (r.A & 0xBF) | (r.CC & r.A & 0x40); break;   // TAP: X can be cleared, never set
        case 0x07: r.A=r.CC; break;
        case 0x08: r.X=(r.X+1)&0xFFFF; r.CC=(r.CC&~4)|(r.X?0:4); break;
        case 0x09: r.X=(r.X-1)&0xFFFF; r.CC=(r.CC&~4)|(r.X?0:4); break;
        case 0x0A: this.setV(false); break; case 0x0B: this.setV(true); break;
        case 0x0C: this.setC(false); break; case 0x0D: this.setC(true); break;
        case 0x0E: r.CC&=~0x10; break; case 0x0F: r.CC|=0x10; break;
        case 0x10: r.A=this.sub8(r.A,r.B,0); break;
        case 0x11: this.sub8(r.A,r.B,0); break;
        case 0x16: r.B=r.A; this.nz8(r.B); this.setV(false); break;
        case 0x17: r.A=r.B; this.nz8(r.A); this.setV(false); break;
        case 0x1B: r.A=this.add8(r.A,r.B,0); break;
        case 0x30: r.X=(r.S+1)&0xFFFF; break; case 0x35: r.S=(r.X-1)&0xFFFF; break;
        case 0x31: r.S=(r.S+1)&0xFFFF; break; case 0x34: r.S=(r.S-1)&0xFFFF; break;
        case 0x32: r.A=this.pull(); break; case 0x33: r.B=this.pull(); break;
        case 0x36: this.push(r.A); break; case 0x37: this.push(r.B); break;
        case 0x38: { const h=this.pull(); r.X=(h<<8)|this.pull(); break; }
        case 0x3C: this.push(r.X); this.push(r.X>>8); break;
        case 0x39: { const h=this.pull(); r.PC=(h<<8)|this.pull(); this.env.log('rts', this.cyc, r.PC); break; }
        case 0x3A: r.X=(r.X+r.B)&0xFFFF; break;
        case 0x3B: { r.CC=this.pull(); r.B=this.pull(); r.A=this.pull(); let h=this.pull(); r.X=(h<<8)|this.pull(); h=this.pull(); r.Y=(h<<8)|this.pull(); h=this.pull(); r.PC=(h<<8)|this.pull(); this.env.log('rti', this.cyc, r.PC); break; }
        case 0x3D: { const d=r.A*r.B; r.A=d>>8; r.B=d&0xFF; this.setC(r.B&0x80); break; }
        default: this.env.log('illegal', this.cyc, op); this.r.PC=this.rd16(VEC.ILL); return 3;
      }
      return CYC_INH[op]||2;
    }
    if (op>=0x20 && op<=0x2F || op===0x8D){
      const off=imm8(), d=off&0x80? off-256: off, c=r.CC, C=c&1, Z=(c>>2)&1, N=(c>>3)&1, V=(c>>1)&1;
      if (op===0x8D){ this.push(r.PC); this.push(r.PC>>8); r.PC=(r.PC+d)&0xFFFF; this.env.log('call', this.cyc, r.PC); return 6; }
      const t=[1,0,!(C|Z),(C|Z),!C,C,!Z,Z,!V,V,!N,N,!(N^V),(N^V),!(Z|(N^V)),(Z|(N^V))][op-0x20];
      if (t) r.PC=(r.PC+d)&0xFFFF; return 3;
    }
    if ((op>=0x12&&op<=0x15)||(op>=0x1C&&op<=0x1F)){
      const idx = op>=0x1C, base=imm8(), a = idx? (r.X+base)&0xFFFF : base, mask=imm8(), v=this.rd(a);
      const k = idx? op-0x1C : op-0x12;   // idx: 1C BSET 1D BCLR 1E BRSET 1F BRCLR ; dir: 12 BRSET 13 BRCLR 14 BSET 15 BCLR
      const kind = idx? ['BSET','BCLR','BRSET','BRCLR'][k] : ['BRSET','BRCLR','BSET','BCLR'][k];
      if (kind==='BSET'){ const nv=v|mask; this.wr(a,nv); this.nz8(nv); this.setV(false); return idx?7:6; }
      if (kind==='BCLR'){ const nv=v&~mask; this.wr(a,nv); this.nz8(nv); this.setV(false); return idx?7:6; }
      const off=imm8(), d=off&0x80?off-256:off;
      const take = kind==='BRSET'? ((~v)&mask)===0 : (v&mask)===0;
      if (take) r.PC=(r.PC+d)&0xFFFF; return idx?7:6;
    }
    // ---- $40-$7F: accumulator / memory RMW ----
    if (op>=0x40 && op<0x80){
      const k=lo; let a=null, v, cyc=2;
      if (hi===4) v=r.A; else if (hi===5) v=r.B; else { if (hi===6){ a=(r.X+imm8())&0xFFFF; } else a=imm16(); cyc=6; if (k!==0xE && k!==0xF) v=this.rd(a); }
      if (k===0xE){ if (hi===6||hi===7){ r.PC=a; return 3; } }               // JMP
      let res=v, w=true;
      switch(k){
        case 0x0: res=this.sub8(0,v,0); break;                                // NEG
        case 0x3: res=(~v)&0xFF; this.nz8(res); this.setV(false); this.setC(true); break;   // COM
        case 0x4: this.setC(v&1); res=v>>1; this.nz8(res); this.setV(v&1); break;          // LSR
        case 0x6: { const c=r.CC&1; this.setC(v&1); res=(v>>1)|(c<<7); this.nz8(res); this.setV(((res>>7)^(v&1))&1); break; }  // ROR
        case 0x7: this.setC(v&1); res=(v>>1)|(v&0x80); this.nz8(res); this.setV(((res>>7)^(v&1))&1); break;   // ASR
        case 0x8: this.setC(v&0x80); res=(v<<1)&0xFF; this.nz8(res); this.setV(((res>>7)^(v>>7))&1); break;    // ASL
        case 0x9: { const c=r.CC&1; this.setC(v&0x80); res=((v<<1)|c)&0xFF; this.nz8(res); this.setV(((res>>7)^(v>>7))&1); break; } // ROL
        case 0xA: res=(v-1)&0xFF; this.nz8(res); this.setV(v===0x80); break;     // DEC
        case 0xC: res=(v+1)&0xFF; this.nz8(res); this.setV(v===0x7F); break;     // INC
        case 0xD: this.nz8(v); this.setV(false); this.setC(false); w=false; break; // TST
        case 0xF: res=0; r.CC=(r.CC&~0x0F)|4; break;                              // CLR
        default: this.env.log('illegal', this.cyc, op); return 2;
      }
      if (w){ if (hi===4) r.A=res; else if (hi===5) r.B=res; else this.wr(a,res); }
      return cyc;
    }
    // ---- $80-$FF: two-operand families ----
    if (op===0x8F){ const t=(r.A<<8)|r.B; r.A=r.X>>8; r.B=r.X&0xFF; r.X=t; return 3; }
    if (op===0xCF){ if (!(r.CC&0x80)){ this.stopped=true; this.env.log('stop', this.cyc, 0); } return 2; }
    const isB = op>=0xC0, mode=(op>>4)&3, k=lo;                // mode 0 imm,1 dir,2 idx,3 ext
    const w16 = (k===3||k===0xC||k===0xE) && !(isB && k===0xC && false);
    const sixteenLoad = (k===0xC&&isB)||(k===0xE)||(k===3)||(k===0xC&&!isB);
    let a=null, opv;
    const fetch16 = ()=>{ if (mode===0) return imm16(); return this.rd16(a); };
    if (mode===1) a=imm8(); else if (mode===2) a=(r.X+imm8())&0xFFFF; else if (mode===3) a=imm16();
    const base = [2,3,4,4][mode];
    const acc = isB? 'B':'A';
    // JSR / BSR handled
    if (op===0x9D||op===0xAD||op===0xBD){ if(mode===0) return 2; this.push(r.PC); this.push(r.PC>>8); r.PC=a; this.env.log('call', this.cyc, a); return [0,5,6,6][mode]; }
    switch(k){
      case 0x0: { const v=mode?this.rd(a):imm8(); r[acc]=this.sub8(r[acc],v,0); return base; }      // SUB
      case 0x1: { const v=mode?this.rd(a):imm8(); this.sub8(r[acc],v,0); return base; }              // CMP
      case 0x2: { const v=mode?this.rd(a):imm8(); r[acc]=this.sub8(r[acc],v,r.CC&1); return base; }  // SBC
      case 0x3: { const v=mode?this.rd16(a):imm16(); const d=(r.A<<8)|r.B; let res;
                  if (!isB){ res=d-v; this.setC(res<0); this.setV(((d^v)&(d^res)&0x8000)!==0); } else { res=d+v; this.setC(res>0xFFFF); this.setV(((d^res)&(v^res)&0x8000)!==0); }
                  res&=0xFFFF; r.A=res>>8; r.B=res&0xFF; this.nz16(res); return [4,5,6,6][mode]; }          // SUBD / ADDD
      case 0x4: { const v=mode?this.rd(a):imm8(); r[acc]&=v; this.nz8(r[acc]); this.setV(false); return base; }
      case 0x5: { const v=mode?this.rd(a):imm8(); this.nz8(r[acc]&v); this.setV(false); return base; }
      case 0x6: { const v=mode?this.rd(a):imm8(); r[acc]=v; this.nz8(v); this.setV(false); return base; }   // LDA
      case 0x7: { if(!mode) return 2; this.wr(a,r[acc]); this.nz8(r[acc]); this.setV(false); return base; } // STA
      case 0x8: { const v=mode?this.rd(a):imm8(); r[acc]^=v; this.nz8(r[acc]); this.setV(false); return base; }
      case 0x9: { const v=mode?this.rd(a):imm8(); r[acc]=this.add8(r[acc],v,r.CC&1); return base; }
      case 0xA: { const v=mode?this.rd(a):imm8(); r[acc]|=v; this.nz8(r[acc]); this.setV(false); return base; }
      case 0xB: { const v=mode?this.rd(a):imm8(); r[acc]=this.add8(r[acc],v,0); return base; }
      case 0xC: { if (!isB){ const v=mode?this.rd16(a):imm16(); const res=r.X-v; this.setC(res<0); this.setV(((r.X^v)&(r.X^res)&0x8000)!==0); this.nz16(res&0xFFFF); return [4,5,6,6][mode]; } // CPX
                  const v=mode?this.rd16(a):imm16(); r.A=v>>8; r.B=v&0xFF; this.nz16(v); this.setV(false); return [3,4,5,5][mode]; }  // LDD
      case 0xD: { if(!isB || !mode) return 2; const v=(r.A<<8)|r.B; this.wr16(a,v); this.nz16(v); this.setV(false); return [0,4,5,5][mode]; } // STD
      case 0xE: { const v=mode?this.rd16(a):imm16(); if(isB) r.X=v; else r.S=v; this.nz16(v); this.setV(false); return [3,4,5,5][mode]; } // LDX / LDS
      case 0xF: { if(!mode) return 2; const v=isB? r.X : r.S; this.wr16(a,v); this.nz16(v); this.setV(false); return [0,4,5,5][mode]; }   // STX / STS
    }
    return 2;
  }
}

/* =====================================================================
   FIRMWARE VARIANTS — KS0003 is embedded verbatim; KS0002/KS0001 are rebuilt from it with the exact
   line differences found by diffing the three files (see Findings). The KS0002 build is checked
   against the leftover S-record CODE/TMP every time the plugin loads.
   ===================================================================== */
const HALT3 = 'HALT   \n\tLDAB #25\n\tJSR DELAY\n\tLDX #REGS\t\t;IS BAT OK\n\tBRSET PORTA,X BAT IGNORE ;IF YES IGNORE IRQ\n\n\tLDX     #REGS\n';
const SRC2 = SRC3.replace(HALT3, 'HALT    LDX     #REGS\n').replace('\tJMP     RESET\nIGNORE  RTI\n', '        JMP     RESET\n');
const SRC1 = SRC2.replace('LDAB    #100             ; 1000 msec DELAY FOR POWER UP', 'LDAB    #50             ; 500 msec DELAY FOR POWER UP')
                 .replace('LDAB    #20             ; 200 msec DELAY FOR -5V TO', 'LDAB    #10             ; 100 msec DELAY FOR -5V TO');
const FW = {
  KS0001:{src:SRC1, date:'1996-01-29', note:'500 ms power-up delay, 100 ms −5 V settle'},
  KS0002:{src:SRC2, date:'1996-07-10', note:'delays doubled; /IRQ always halts'},
  KS0003:{src:SRC3, date:'1996-09-26', note:'HALT waits 250 ms and ignores /IRQ while BAT is good'},
};
const TMPIMG = parseS19(TMP_S19);
for (const k in FW){
  const a = assemble(FW[k].src); FW[k].asm = a;
  FW[k].lab = {}; for (const [n,v] of Object.entries(a.syms)) if (v>=0x0100 && v<0x10000 && !(v>=0x1000&&v<0x1040) && !/^(RESET|EPROM|VECTORS|EEPROM|REGS)$/.test(n)) (FW[k].lab[v] = FW[k].lab[v] || n);
  FW[k].lab[0xD000] = 'RESET';
  let diff=0; const keys=new Set([...a.mem.keys(),...TMPIMG.keys()]); for (const x of keys) if (a.mem.get(x)!==TMPIMG.get(x)) diff++;
  FW[k].tmpDiff = diff; FW[k].size = a.mem.size;
  // address -> source line, and per-line address/bytes for the listing
  FW[k].pcLine = new Map(); FW[k].lineInfo = new Map();
  a.listing.forEach(L=>{ if (L.n){ const by=[]; for(let i=0;i<L.n;i++) by.push(a.mem.get(L.a+i)); FW[k].lineInfo.set(L.ln,{a:L.a,by}); FW[k].pcLine.set(L.a, L.ln); } else FW[k].lineInfo.set(L.ln,{a:L.a,by:[]}); });
  const labs = Object.entries(FW[k].lab).map(([a,n])=>[+a,n]).sort((x,y)=>x[0]-y[0]);
  FW[k].labs = labs;
}
/* major routine of an address (for the CPU lane and the trace) */
const ROUT = ['RESET','ML1','ML2','ML3','MAIN1','MAIN3','MAIN4','HALT','IGNORE','DEBTAB','TABLE2','SCAN','INC_L','DEC_L','JSCAN','TXERR','TXD','TXSPI','TXWAIT','TXCS','LUTAB2','SETBUF','K1PULSE','TIMEOUT','DELAY'];
const RCOL = {RESET:'#8a8f96',ML1:'#8a8f96',ML2:'#8a8f96',ML3:'#b07cc6',MAIN1:'#d7d3c8',MAIN3:'#3d8bd9',MAIN4:'#3d8bd9',HALT:'#d33a2c',IGNORE:'#d33a2c',
  SCAN:'#1f9d55',INC_L:'#e3a35a',DEC_L:'#e3a35a',JSCAN:'#13804a',TXERR:'#c0392b',TXD:'#7b5cd6',TXSPI:'#7b5cd6',TXWAIT:'#9b7cf0',TXCS:'#c25bb0',SETBUF:'#2a9fb8',
  K1PULSE:'#e0782e',TIMEOUT:'#e0782e',DELAY:'#a3a9ae',HOOK:'#f0c040',PSEUDO:'#555'};
function routineOf(fw, pc){
  if (pc===0x0100) return 'HOOK'; if (pc<0x0100) return 'PSEUDO';
  const L = FW[fw].labs; let best='RESET';
  for (const [a,n] of L){ if (a>pc) break; if (ROUT.includes(n)) best=n; }
  return best;
}
const RNAME = {HOOK:'JSR $0100 (RAM RTS hook)', PSEUDO:'RAM pseudo-vector JMP', MAIN1:'MAIN1 idle loop'};

/* =====================================================================
   DEVICE STATE (front-panel switches, dock, battery, sources, events on the time line)
   ===================================================================== */
const PRE = 1.3;                                  // "running" mode: power was applied 1.3 s before t = 0
const DUR = 1.5;
const BAT_TH = 2.5*(15+20)/20, STOP_TH = 2.5*(15+30.1)/30.1;   // U16A R161 15K / R162 20K, U16B R164 15K / R165 30K1 against U17 LM385Z 2.5 V
const DEMO = [{t:0.30,k:'enc',n:3,per:0.040},{t:0.80,k:'enc',n:-6,per:0.009}];
const D = {};
function reset(){ Object.assign(D, { fw:'KS0003', boot:'running', power:true, docked:true, vbat:5.0, lk2:true, lk3:true, copOn:true,
  mode:false, hp:false, term:false, z150:false, phones:false, plugL:false, plugR:false,
  rear:{lvl:4, f:1000, rphase:0, rdb:0}, patch:{lvl:-30, f:400}, rs:0, prog:'burst', spk:0.5,
  events: DEMO.map(e=>({...e})), log:[] }); }
reset();

/* =====================================================================
   INPUT PINS as a pure function of the event list
   ===================================================================== */
const UPSEQ = [3,1,0,2];          // PA1:PA0 gray sequence for a clockwise (level up) turn; rest state 11 (39K pull-ups R2/R3 on SA14-304)
function inputs(){
  const pre = D.boot==='running'? PRE : 0, c = t=>Math.round((t+pre)*1e6);
  const edges=[];
  D.events.filter(e=>e.k==='enc').forEach(e=>{ const n=Math.abs(e.n), s=Math.sign(e.n); for(let i=0;i<n;i++) edges.push([c(e.t+i*e.per), s]); });
  edges.sort((a,b)=>a[0]-b[0]); let pos=0; const pc=[], pv=[]; edges.forEach(([cc,s])=>{ pos+=s; pc.push(cc); pv.push(pos); });
  const bats = D.events.filter(e=>e.k==='bat').map(e=>[c(e.t), e.v]).sort((a,b)=>a[0]-b[0]);
  const gl = D.events.filter(e=>e.k==='glitch').map(e=>[c(e.t), c(e.t)+Math.round((e.dur||0.002)*1e6)]);
  let ie=0, ib=0;
  const vb = cc=>{ if (D.docked) return 5.16; let v=D.vbat; for (const [b,x] of bats){ if (b<=cc) v=x; else break; } return v; };
  const pinsPC = (D.lk2?0:0x80)|(D.lk3?0:0x40)|0x0F;
  function pins(cc){
    if (ie>0 && pc[ie-1]>cc) ie=0; while (ie<pc.length && pc[ie]<=cc) ie++;
    const p = ie? pv[ie-1] : 0, st = UPSEQ[((p%4)+4)%4];
    const v = vb(cc); let irq = v>STOP_TH; for (const [a,b] of gl) if (cc>=a && cc<b) irq=false;
    return {pa: st | (v>BAT_TH?0x04:0), pc: pinsPC, irq: irq?1:0};
  }
  return {pins, vb, pre, encPos:(cc)=>{ let p=0; for(let i=0;i<pc.length&&pc[i]<=cc;i++) p=pv[i]; return p; }, edges:pc.map((x,i)=>[x,pv[i]])};
}

/* =====================================================================
   RUN THE FIRMWARE — record every instruction (cycle, PC) plus peripheral events
   ===================================================================== */
let REC=null, RECKEY='';
function rec(){
  const key = JSON.stringify([D.fw,D.boot,D.power,D.docked,D.vbat,D.lk2,D.lk3,D.copOn,D.events]);
  if (key===RECKEY && REC) return REC;
  RECKEY = key;
  const IN = inputs(), pre = IN.pre, total = Math.round((pre+DUR)*1e6);
  const R = { pre, fw:D.fw, IN, n:0, insC:new Uint32Array(1<<20), insPC:new Uint16Array(1<<20), ev:{}, snaps:[], ram:[], running: D.power };
  const EVK = ['pa','pb','pc','spi','spif','irq','rti','cop','copreset','stop','reset','oc','wcol','romwr','cforc','illegal'];
  EVK.forEach(k=>R.ev[k]=[]);
  if (!D.power){ REC=R; derive(R); return R; }
  const env = { copOn:D.copOn, pins:IN.pins,
    log(k,c,d){ if (k==='ram'){ if (d>=0x10 && d<=0x1D) R.ram.push([c,d,env.cpu.mem[d]]); return; } const a=R.ev[k]; if (a) a.push([c,d]); },
    ins(c,pc){ if (R.n>=R.insC.length){ const a=new Uint32Array(R.insC.length*2); a.set(R.insC); R.insC=a; const b=new Uint16Array(R.insPC.length*2); b.set(R.insPC); R.insPC=b; } R.insC[R.n]=c; R.insPC[R.n]=pc; R.n++; } };
  const rom = FW[D.fw].asm.mem;
  const cpu = new HC11(rom, env); env.cpu = cpu;
  let nextSnap = 0;
  while (cpu.cyc < total){
    if (cpu.cyc >= nextSnap){ R.snaps.push({c:cpu.cyc, n:R.n, s:cpu.snapshot()}); nextSnap += 50000; }
    cpu.step();
  }
  R.final = cpu.snapshot(); R.rom = rom;
  derive(R); REC = R; return R;
}
const tOf = (R,c)=> c/1e6 - R.pre, cOf = (R,t)=> Math.round((t+R.pre)*1e6);
function ub(arr, n, x){ let lo=0, hi=n; while(lo<hi){ const m=(lo+hi)>>1; if (arr[m]<=x) lo=m+1; else hi=m; } return lo; }   // first index with arr[i] > x
function ubE(list, x){ let lo=0, hi=list.length; while(lo<hi){ const m=(lo+hi)>>1; if (list[m][0]<=x) lo=m+1; else hi=m; } return lo; }
function at(list, c, dflt){ const i=ubE(list,c); return i? list[i-1][1] : dflt; }

/* derived time lines: LCD frames, CS3310 words, relay, mute, range flags, RAM variables */
const RAMN = {0x10:'BUF',0x11:'BUF+1',0x12:'BUF+2',0x13:'BUF+3',0x14:'BUF+4',0x15:'CS3310',0x16:'KS1',0x17:'KS2',0x18:'STATE2',0x19:'DELTA',0x1A:'LEVEL',0x1B:'FLAGS',0x1C:'ONESEC',0x1D:'COUNTER'};
function derive(R){
  const ev=R.ev;
  // LCD: SPI bytes grouped into TXD frames (gap < 3 ms), latched by the MM5453 at the 36th clock
  R.frames=[]; let fr=null;
  ev.spi.forEach(([c,d])=>{ if (!fr || c - fr.last > 3000){ fr={c0:c, bytes:[], last:c}; R.frames.push(fr); } fr.bytes.push(d.v); fr.last=c; fr.end=c+d.dur; fr.dur=d.dur; });
  R.lcd=[]; R.frames.forEach(f=>{ if (f.bytes.length===5) R.lcd.push([f.end - 4*(f.dur/8), decodeLCD(f.bytes)]); });
  // CS3310: follow /CS (PC2), CLK (PC1) and DATA (PC0) as the firmware toggles them in TXCS
  R.cs=[]; R.csBits=[]; let pv=0x0F, sh=[], c0=0;
  ev.pc.forEach(([c,v])=>{ const ncs=v&4, clk=v&2, dat=v&1;
    if ((pv&4) && !ncs){ sh=[]; c0=c; }
    if (!(pv&2) && clk && !ncs) sh.push([c, dat?1:0]);
    if (!(pv&4) && ncs){ if (sh.length>=16){ const w=sh.slice(-16).reduce((a,b)=>(a<<1)|b[1],0); R.cs.push([c, {R:w>>8, L:w&0xFF, bits:sh.slice(), c0}]); } }
    pv=v; });
  // range flags (PORTB, power-on value 0), mute (PA6), K1 relay pulses (PA4 SET / PA5 CLR)
  R.pb = ev.pb.slice(); R.mute=[]; R.k1p=[]; R.k1=[]; let ppa=0, pset=0, pclr=0;
  R.mute.push([0,1]);
  ev.pa.forEach(([c,v])=>{ if ((v&0x40)!==(ppa&0x40)) R.mute.push([c, v&0x40?0:1]);
    if ((v&0x10) && !(ppa&0x10)) pset=c; if (!(v&0x10) && (ppa&0x10)){ R.k1p.push({k:'SET',c0:pset,c1:c}); R.k1.push([pset+3000,'SET']); }
    if ((v&0x20) && !(ppa&0x20)) pclr=c; if (!(v&0x20) && (ppa&0x20)){ R.k1p.push({k:'CLR',c0:pclr,c1:c}); R.k1.push([pclr+3000,'CLR']); }
    ppa=v; });
  R.k1.sort((a,b)=>a[0]-b[0]);
  // RAM variable histories
  R.var={}; Object.values(RAMN).forEach(n=>R.var[n]=[]); R.ram.forEach(([c,a,v])=>R.var[RAMN[a]].push([c,v]));
  // OC3 scans
  R.scans = ev.irq.filter(e=>e[1]==='OC3').map(e=>e[0]);
  R.copSvc = ev.cop.map(e=>e[0]);
}
/* MM5453: 40 clocks, first '1' is the start bit, the next 33 bits are outputs 1-33. BUF semantics are the firmware's. */
const SEG7 = {0x3F:'0',0x06:'1',0x5B:'2',0x4F:'3',0x66:'4',0x6D:'5',0x7D:'6',0x07:'7',0x7F:'8',0x6F:'9',0x00:' '};
function decodeLCD(b){
  const bits=[]; b.forEach(v=>{ for(let i=7;i>=0;i--) bits.push((v>>i)&1); });
  const s=bits.indexOf(1); const data = s<0? [] : bits.slice(s+1, s+34);
  return { bytes:b.slice(), start:s, data, sign: (b[0]&0x0C)===0x0C?'+':(b[0]&0x08)?'−':'', lobat: !!(b[0]&0x10), d1:b[1], d2:b[2], d3:b[3],
    text: ((b[0]&0x0C)===0x0C?'+':(b[0]&0x08)?'−':' ') + (SEG7[b[1]]??'?') + (SEG7[b[2]]??'?') };
}
function lcdAt(R, c){ const i=ubE(R.lcd, c); return i? R.lcd[i-1][1] : null; }

/* =====================================================================
   ANALOG CHAIN (SA14-305 sheet 1) — gains derived from LUTAB2, see Software tab
   ===================================================================== */
const POST = 19;                          // fixed gain after the CS3310 so that LUTAB2 gives +4 dBu at the meter drive for 0 VU (inferred)
const VU0 = 4;                            // meter-driver level for 0 VU: rear MONITOR OUTPUT is "+4 dBu for 0 VU" (M445.WP)
const CLIP = 20*Math.log10(4.2/Math.SQRT2/0.7746);   // OP492 on +5.16 V / −5 V rails, ~1 V from each rail (inferred) = +11.7 dBu
function flagGain(pb){ if (pb===0xFF || pb===0) return null; let g=0, any=false;   // active LOW (K1PULSE: "GAIN IS ACTIVE (LOW)")
  if (!(pb&0x02)){ g+=25; any=true; } if (!(pb&0x04)){ any=true; } if (!(pb&0x08)){ g-=30; any=true; } if (!(pb&0x01)) g-=10; return any? g : null; }
const csDb = n=> n===0? -Infinity : (n-192)/2;          // CS3310: 0.5 dB steps, 192 = 0 dB, 0 = mute
function gainAt(R, c){                                  // total dB from the input terminals to the meter driver
  const pb = at(R.pb, c, 0), fg = flagGain(pb), cw = at(R.cs, c, null), mu = at(R.mute, c, 1);
  if (fg===null || !cw || mu) return {db:-Infinity, fg, cs: cw? csDb(cw.L):null, pb, mu};
  return {db: fg + csDb(cw.L) + POST, fg, cs: csDb(cw.L), pb, mu};
}
const dBu = v=>20*Math.log10(Math.max(v,1e-9)/0.7746);
function env(t){
  if (D.prog==='tone') return 1;
  if (D.prog==='burst') return (t>=0.2 && t<0.7)? 1 : 0;
  const syl = Math.max(0, Math.sin(2*Math.PI*4.1*t))*Math.max(0,Math.sin(2*Math.PI*0.9*t+0.6)); return Math.min(1.4, 1.6*syl);   // speech-like (inferred test signal)
}
function sourceOf(ch){ const plug = ch==='L'? D.plugL : D.plugR;
  if (plug) return {lvl:D.patch.lvl, f:D.patch.f, ph:0, from:'front '+(ch==='L'?'JACK 2':'JACK 3')+' (PJ339)'};
  return {lvl: D.rear.lvl + (ch==='R'? D.rear.rdb : 0), f:D.rear.f, ph: ch==='R'? D.rear.rphase : 0, from:'rear TS1 '+(ch==='L'?'1/2':'4/5')+' via P1 normals'}; }
const ZIN = ()=> D.term? (D.z150? 150 : 600) : 20000;
function terminal(ch){ const s=sourceOf(ch); return s.lvl + 20*Math.log10(ZIN()/(ZIN()+D.rs)); }
const hpMag = f=> D.hp? 1/Math.sqrt(1+Math.pow(75/f,6)) : 1;    // 3rd-order, −3 dB at 75 Hz, −18 dB/oct (M445.WP); U9A/U9B C27–C29 0.068 µF
function chain(){                  // steady-state levels (no time dependence) for the current switches
  const L=sourceOf('L'), Rr=sourceOf('R');
  const aL = Math.pow(10,terminal('L')/20)*hpMag(L.f), aR = Math.pow(10,terminal('R')/20)*hpMag(Rr.f);
  const pr = Rr.ph*Math.PI/180, same = L.f===Rr.f;
  const re = (x,y,s)=> same? Math.hypot(x + s*y*Math.cos(pr), s*y*Math.sin(pr)) : Math.sqrt(x*x+y*y);   // different frequencies add in power
  const mL = D.mode? re(aL,aR,1) : aL, mR = D.mode? re(aL,aR,-1) : aR;    // SW3: L+R on the left meter, L−R on the right (unity mix inferred)
  return {L, R:Rr, tL:terminal('L'), tR:terminal('R'), mL: 20*Math.log10(Math.max(mL,1e-9)), mR: 20*Math.log10(Math.max(mR,1e-9))};
}
/* VU needles: 2nd order, ANSI C16.5 (99 % in 300 ms, ~1–1.5 % overshoot) — same movement model as m405m.js */
const WN=13.6, ZETA=0.82;
let NEED=null, NEEDKEY='';
function needles(){
  const R=rec(); const key=RECKEY+JSON.stringify([D.mode,D.hp,D.term,D.z150,D.plugL,D.plugR,D.rear,D.patch,D.rs,D.prog,D.docked,D.spk]);
  if (key===NEEDKEY && NEED) return NEED; NEEDKEY=key;
  const N=Math.round(DUR*1000), ch=chain(), dt=1e-3;
  const out={L:new Float32Array(N+1),R:new Float32Array(N+1),dL:new Float32Array(N+1),dR:new Float32Array(N+1),g:new Float32Array(N+1),clip:new Uint8Array(N+1)};
  let xL=0,vL=0,xR=0,vR=0;
  for (let i=0;i<=N;i++){
    const t=i*dt; let gl=0, fgMax=-1e9;
    for (let k=0;k<4;k++){ const G=gainAt(R, cOf(R,t+k*dt/4)); gl += isFinite(G.db)? Math.pow(10,G.db/20)/4 : 0; if (G.fg!==null) fgMax=Math.max(fgMax,G.fg); }
    const gdb = gl>0? 20*Math.log10(gl) : -Infinity; out.g[i]=isFinite(gdb)?gdb:-200;
    const e=env(t);
    const uL = R.running? e*Math.pow(10,(ch.mL + gdb - VU0)/20) : 0, uR = R.running? e*Math.pow(10,(ch.mR + gdb - VU0)/20) : 0;
    const lim = Math.pow(10,(CLIP-VU0)/20);
    out.clip[i] = (e>0 && (Math.max(ch.tL,ch.tR)+fgMax > CLIP || Math.max(ch.mL,ch.mR)+gdb > CLIP))?1:0;
    const dL=Math.min(lim,uL||0), dR=Math.min(lim,uR||0); out.dL[i]=dL; out.dR[i]=dR;
    out.L[i]=xL; out.R[i]=xR;
    let a=WN*WN*(dL-xL)-2*ZETA*WN*vL; vL+=a*dt; xL+=vL*dt; if(xL<-0.02){xL=-0.02;vL=0;} if(xL>1.6){xL=1.6;vL=0;}
    a=WN*WN*(dR-xR)-2*ZETA*WN*vR; vR+=a*dt; xR+=vR*dt; if(xR<-0.02){xR=-0.02;vR=0;} if(xR>1.6){xR=1.6;vR=0;}
  }
  NEED=out; return out;
}
const needleAt = (ch,t)=>{ const n=needles(); const i=Math.max(0,Math.min(n.L.length-1,Math.round(t*1000))); return n[ch][i]; };
const vuDb = p=> p<=0.001? -Infinity : 20*Math.log10(p);

/* =====================================================================
   REGISTER / RAM STATE AT ANY CYCLE (replay from the nearest snapshot)
   ===================================================================== */
function stateAt(R, c){
  if (!R.running || !R.snaps.length) return null;
  let s=R.snaps[0]; for (const x of R.snaps){ if (x.c<=c) s=x; else break; }
  const env={copOn:D.copOn, pins:R.IN.pins, log(){}, ins(){}}; const cpu=new HC11(R.rom, env); env.cpu=cpu; cpu.restore(s.s);
  const p=pcAt(R,c), target = p? p.c : c; let guard=0; while (cpu.cyc < target && guard++<400000) cpu.step();
  return cpu;
}
function pcAt(R, c){ const i=ub(R.insC, R.n, c); return i? {pc:R.insPC[i-1], c:R.insC[i-1], i:i-1} : null; }

/* =====================================================================
   FIRMWARE TRACE: the code path the emulator actually executed between two cycles
   ===================================================================== */
function trace(R, c0, c1, max){
  max = max||60; const out=[]; if (!R.running) return ['(power is off: nothing executes)'];
  const fw=R.fw, i0=ub(R.insC,R.n,c0), i1=ub(R.insC,R.n,c1);
  const evs=[];
  R.ev.irq.forEach(([c,d])=>{ if(c>=c0&&c<c1) evs.push([c,`<b>${d} interrupt</b> → stacks 9 bytes, vector ${hex({IRQ:0xFFF2,OC1:0xFFE8,OC2:0xFFE6,OC3:0xFFE4}[d],4)} → RAM pseudo-vector ${hex({IRQ:0xEE,OC1:0xDF,OC3:0xD9,OC2:0xDC}[d])} (JMP)`]); });
  R.ev.rti.forEach(([c])=>{ if(c>=c0&&c<c1) evs.push([c,'RTI']); });
  R.ram.forEach(([c,a,v],k)=>{ if(c>=c0&&c<c1 && a!==0x1D){ const prev = at(R.var[RAMN[a]], c-1, null); if (prev!==v) evs.push([c, `${RAMN[a]} ${hex(a)} ← ${hex(v)}${a===0x1A?` (LEVEL ${v-60>=0?'+':''}${v-60} dB)`:''}${prev!==null?` (was ${hex(prev)})`:''}`]); } });
  R.ev.pb.forEach(([c,v])=>{ if(c>=c0&&c<c1) evs.push([c,`STAB PORTB,X → PORTB = ${hex(v)} (${flagTxt(v)})`]); });
  R.ev.spi.forEach(([c,d])=>{ if(c>=c0&&c<c1) evs.push([c,`SPDR ← ${hex(d.v)} (MM5453 byte, 8 × 32 µs)`]); });
  R.cs.forEach(([c,w])=>{ if(c>=c0&&c<c1) evs.push([c,`/CS rises: CS3310 latched ${hex(w.R)} ${hex(w.L)} → ${fmtDb(csDb(w.L))} both channels`]); });
  R.k1p.forEach(p=>{ if(p.c0>=c0&&p.c0<c1) evs.push([p.c0,`CFORC forces OC1: PA${p.k==='SET'?4:5} K1${p.k} high (Q${p.k==='SET'?'1/Q3':'2/Q4'}) for ${((p.c1-p.c0)/1000).toFixed(2)} ms`]); });
  R.ev.stop.forEach(([c])=>{ if(c>=c0&&c<c1) evs.push([c,'<b>STOP</b>: oscillator halts (and the COP with it)']); });
  R.ev.copreset.forEach(([c])=>{ if(c>=c0&&c<c1) evs.push([c,'<b>COP watchdog reset</b>']); });
  // routine entries
  let prev=null, cnt=0;
  for (let i=i0;i<i1;i++){ const r=routineOf(fw, R.insPC[i]); if (r!==prev){ if (r==='MAIN1'||r==='HOOK'){ if (prev!=='MAIN1'&&prev!=='HOOK') evs.push([R.insC[i], `<span class="muted">MAIN1 idle loop (JSR $0100 · COPRST $55/$AA · BRCLR FLAGS TALLY)</span>`]); }
      else if (r==='DELAY' && prev==='DELAY'){} else evs.push([R.insC[i], `→ <span class="mono" style="color:${RCOL[r]||'inherit'}">${r}</span> ${hex(R.insPC[i],4)}`]); prev=r; } }
  evs.sort((a,b)=>a[0]-b[0]);
  let lastIdle=false;
  for (const [c,s] of evs){ const idle=s.includes('idle loop'); if (idle&&lastIdle) continue; lastIdle=idle; out.push(`<span class="mono muted">${SIM.fmtT(tOf(R,c))}</span> ${s}`); if (out.length>=max){ out.push('…'); break; } }
  return out;
}
const fmtDb = d=> !isFinite(d)? 'mute' : (d>=0?'+':'')+d.toFixed(1)+' dB';
function flagTxt(v){ if (v===0xFF) return 'all ranges off'; const a=[]; if(!(v&2)) a.push('GAIN'); if(!(v&4)) a.push('UNITY'); if(!(v&8)) a.push('ATTEN'); if(!(v&1)) a.push('PM6'); return (a.join('+')||'none')+' active (low)'+(v&0x80?' · PB7 sign = −':''); }
function hex(v,n){ return '$'+(v>>>0).toString(16).toUpperCase().padStart(n||2,'0'); }
/* LUTAB2 decoded straight from the assembled image */
function lut(fw){ const a=FW[fw||D.fw].asm, base=a.syms.LUTAB2, out=[]; for(let i=0;i<91;i++){ const f=a.mem.get(base+4*i), d1=a.mem.get(base+4*i+1), d2=a.mem.get(base+4*i+2), cs=a.mem.get(base+4*i+3); out.push({i, lvl:i-60, f, d1, d2, cs, csdb:csDb(cs), fg:flagGain(f&0x0F|0xF0)}); } return out; }

/* =====================================================================
   ACTIONS — each logs the hardware path, then the code path the emulator really ran
   ===================================================================== */
function act(name, fn, fwSpec){
  const tr=[]; const t=Math.min(DUR-0.001, Math.max(0, SIM.t));
  fn(s=>tr.push(s), t);
  const R=rec(); let fw=[];
  if (fwSpec) try{ fw = fwSpec(R, t) || []; }catch(e){ fw=['(trace failed: '+e.message+')']; }
  D.log.unshift({t, name, tr, fw}); if (D.log.length>40) D.log.length=40; SIM.refresh();
}
function fwAfterLevel(R, t){
  const c=cOf(R,t), lv=R.var.LEVEL.find(([cc])=>cc>=c);
  if (!lv){ const sc=R.scans.find(x=>x>=c); return sc? ['No LEVEL change was produced (end stop at −60/+30, or edges shorter than the 16 ms debounce).', ...trace(R, sc-20, sc+400, 25)] : ['(no scan after this time inside the recorded window)']; }
  let ci=0; for (const s of R.scans) if (s<=lv[0]) ci=s;
  const fr=R.frames.find(f=>f.c0>=lv[0]); const end = fr? fr.end+40 : lv[0]+3000;
  return trace(R, ci-15, end, 70);
}
const A = {
  enc(n, per){ act(`Turn SENSITIVITY ${n>0?'clockwise':'anticlockwise'} ${Math.abs(n)} detent${Math.abs(n)>1?'s':''}${Math.abs(n)>1?' ('+(per*1000).toFixed(0)+' ms apart)':''}`, (tr,t)=>{
      D.events.push({t, k:'enc', n, per});
      tr(`SA14-304 PU1 500EN-206P-C2 encoder: ${Math.abs(n)} gray-code edge${Math.abs(n)>1?'s':''} on A0/A1 (P1-6/P1-5 → 305P7 → U12 PA0 KNOB1 / PA1 KNOB2, 39K pull-ups R2/R3) ${inf('one quadrature edge per detent, because the firmware counts every edge and the spec says 1 dB steps')}`);
      tr('Nothing happens until the next 4 ms OC3 interrupt samples the pins; DEBTAB needs 4 equal samples (16 ms) per pin before KEYBIT moves');
    }, fwAfterLevel); },
  btn(k){ const lbl={mode:'MODE (SW3)',hp:'HP FILT (SW4)',term:'TERM (SW1)',z150:'Z (SW2)'}[k];
    act(`Press ${lbl} → ${!D[k]?'in':'out'}`, tr=>{ D[k]=!D[k];
      if (k==='mode') tr(D.mode? 'SW3 routes U9C = L+R to the left meter driver and U9D = L−R to the right (B 14-305-02-001/1, label “(L&R) / (L+R & L−R)”)' : 'SW3 back to discrete L & R');
      if (k==='hp') tr(D.hp? 'SW4 HP FILTER inserts U9A/U9B: 3-pole high-pass, C27–C29 0.068 µF, R61 56K, R62 82K, R63 36K — −3 dB at 75 Hz, −18 dB/oct (manual)' : 'SW4 bypasses U9A/U9B: full band');
      if (k==='term') tr(D.term? `SW1 BRIDGE/MATCH → match: the ${D.z150?'150 Ω R10':'600 Ω R9'} 3.75 W termination now loads the source` : 'SW1 → bridge: only R11/R12 470K (≥ 20 kΩ per the spec) across the input');
      if (k==='z150') tr(`SW2 600/150 selects ${D.z150?'R10 150 Ω':'R9 600 Ω'}${D.term?'':' (no effect until TERM is in)'}`);
      tr(`Steady tone now reads L ${fmtVU(readDb('L'))} · R ${fmtVU(readDb('R'))} on the meters`);
      tr('The 68HC11 never sees these switches: they are analog only, so no firmware runs'); }); },
  power(){ act(D.power?'Press POWER → off':'Press POWER → on (power-up from t = 0)', tr=>{ D.power=!D.power;
      if (D.power){ D.boot='powerup'; tr('SW5 ON/OFF closes: '+(D.docked?'dock +24 V → U18 LM317T (R159 750 / R160 240) = 5.16 V VCC; Q13/U14 switcher makes VEE':'batteries B1–4 → CR42 1N5822 → L1 → VCC')); tr('/RST releases; the 68HC711E9 fetches the reset vector $FFFE → $D000. Time line restarts at power-on (see the Second tab)'); }
      else tr('SW5 off: VCC collapses, the LCD and meters die'+(D.docked?'; the dock keeps charging (MAX713 is outside SW5)':'')); },
      (R)=> D.power? trace(R, 0, 70000, 40) : []); SIM.seek(0); },
  dock(){ act(D.docked?'Pull the meter out of the dock':'Dock the meter', tr=>{ D.docked=!D.docked;
      if (D.docked) tr('J1 3549-1000 mates with P1: +24 V on P1-10/22, speaker +24 V on 11/23, meter inputs/outputs to TS1. MAX713 (U13) starts quick-charge; meter lamps (SA14-307) and speakers (SA14-311) come on with POWER');
      else tr(`Running on 4 × P-60AA NiCd (${D.vbat.toFixed(2)} V). Lamps and speakers are off (they live in the dock). BAT trips below ${BAT_TH.toFixed(3)} V, STOP below ${STOP_TH.toFixed(3)} V`); }); },
  jack(k){ act(k==='P'? (D.phones?'Unplug headphones':'Plug headphones into MONITOR') : `${(k==='L'?D.plugL:D.plugR)?'Unplug':'Plug a patch cord into'} INPUT ${k==='L'?'LEFT (JACK 2)':'RIGHT (JACK 3)'}`, tr=>{
      if (k==='P'){ D.phones=!D.phones; tr(`JACK 1 NL-114B: tip/ring from P3 through R123/R124 300 Ω ½ W (headset −2 dBu at 0 VU, 600 Ω or more)`); return; }
      const key=k==='L'?'plugL':'plugR'; D[key]=!D[key];
      tr(D[key]? `PJ339 long-frame jack breaks the normal from the rear TS1 (445S02: JACK ${k==='L'?2:3} → 305P1/305P2) and feeds the ${D.patch.lvl} dBu patch source` : 'Normals restored: the rear TS1 input reaches the meter again'); }); },
  bat(v){ act(`Battery drops to ${v.toFixed(2)} V (at the playhead)`, tr=>{ D.events.push({t:SIM.t, k:'bat', v});
      if (D.docked) tr('Docked: VCC comes from U18, so BAT and /IRQ stay high — undock first to see the effect');
      tr(`U16A (R161/R162 vs LM385Z 2.5 V) → PA2 BAT ${v>BAT_TH?'high (good)':'LOW'}; U16B (R164/R165) → /IRQ ${v>STOP_TH?'high':'LOW (STOP)'}`);
      tr('BAT is only polled once per 256 scans (ONESEC, 1.024 s); /IRQ is level-sensitive and acts at once'); },
      (R,t)=>{ const c=cOf(R,t); const f=R.var.FLAGS.find(([cc,v])=>cc>=c && (v&4)!==(at(R.var.FLAGS,c,0)&4)); const ir=R.ev.irq.find(([cc,d])=>cc>=c&&d==='IRQ');
        const c0 = Math.min(f?f[0]:1e12, ir?ir[0]:1e12); if (c0>=1e12) return ['No reaction inside the recorded window (ONESEC polls every 1.024 s — try an earlier time)']; return trace(R, c0-600, c0+300000, 60); }); },
  glitch(){ act('2 ms dip on /IRQ (docking transient)', tr=>{ D.events.push({t:SIM.t, k:'glitch', dur:0.002}); tr('U16B output pulses low for 2 ms → U12 /IRQ (pin 19), level-sensitive (OPTION.IRQE = 0 after CLR OPTION,X)'); },
      (R,t)=>{ const c=cOf(R,t); return trace(R, c-20, c+300000, 60); }); },
  fw(k){ act(`Load firmware ${k}.ASM`, tr=>{ D.fw=k; tr(`${k} assembled in the browser: ${FW[k].size} bytes; ${FW[k].note}`); }); },
  lk(n){ act(`${(n===2?D.lk2:D.lk3)?'Remove':'Fit'} shorting clip LK${n} (${n===2?'8 dB REF → PC7':'0 dB REF → PC6'})`, tr=>{ if(n===2) D.lk2=!D.lk2; else D.lk3=!D.lk3;
      const want = (!D.lk2&&!D.lk3)||(D.lk2&&D.lk3)? '+4' : D.lk3? '0' : '+8';
      tr(`Power-up reads PC6/PC7 at ML2: LK2 ${D.lk2?'in':'out'}, LK3 ${D.lk3?'in':'out'} → LEVEL${want==='+4'?'4 (64)':want==='0'?'0 (60)':'8 (68)'} → LCD shows ${want}`);
      tr('Only read once, at reset: press POWER off/on (or the Second tab is already a fresh boot in “running” mode)'); }); },
};
function readDb(k){ const c=chain(); return (k==='L'?c.mL:c.mR) - liveLevel(); }
const fmtVU = v=> v< -40? 'below −20 VU' : (v>=0?'+':'')+v.toFixed(1)+' VU'+(v>3?' (pinned)':'');
function liveLevel(){ const R=rec(); const v=at(R.var.LEVEL, cOf(R,SIM.t), null); return v===null? 4 : v-60; }

/* =====================================================================
   FRONT PANEL — drawn to scale from MECHANIC/MM445-1.DWG (445-03-001 iss 3, 11.750 × 3.468 in),
   silkscreen = MECHANIC/445SILK.DWG (LB445-08-001 artwork), aligned with the drill drawing.
   ===================================================================== */
const PH=3.468, PW=11.75, S=100, py=y=>(PH-y)*S;
const P = { win:[[0.704,1.31,3.324,1.73],[4.388,1.31,3.324,1.73]], lcd:[8.95,2.673,1.38,0.765], enc:[8.95,1.436],
  jack:{L:[10.95,2.5],R:[10.95,1.75],P:[10.95,0.637]}, btn:{mode:8.079,hp:8.579,term:9.079,z150:9.579,power:10.229}, btnY:0.637 };
const VU_MARKS=[-20,-10,-7,-5,-3,-2,-1,0,1,2,3];
const angOf = p=> -42 + 84*Math.min(1.6,Math.max(-0.02,p))/1.413;
function meterSVG(i, p, lit, label){
  const [x,y,w,h]=P.win[i], X0=x*S, Y0=py(y+h), W=w*S, H=h*S, cx=X0+W/2, cy=Y0+H+0.62*S, r=1.95*S;
  let s=`<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="${lit?'#f6ecc4':'#d8d1b6'}"/>`;
  if (lit) s+=`<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="url(#m445glow)"/>`;
  const arc=(a0,a1,rr)=>{ const A0=(a0-90)*Math.PI/180, A1=(a1-90)*Math.PI/180; return `M${cx+rr*Math.cos(A0)} ${cy+rr*Math.sin(A0)} A${rr} ${rr} 0 0 1 ${cx+rr*Math.cos(A1)} ${cy+rr*Math.sin(A1)}`; };
  s+=`<path d="${arc(-42,angOf(1),r*0.86)}" stroke="#222" stroke-width="2" fill="none"/><path d="${arc(angOf(1),42,r*0.86)}" stroke="#c0282d" stroke-width="5" fill="none"/>`;
  VU_MARKS.forEach(v=>{ const a=(angOf(Math.pow(10,v/20))-90)*Math.PI/180; const r1=r*0.86, r2=r*(v%5===0||v>=-3?0.93:0.9);
    s+=`<line x1="${cx+r1*Math.cos(a)}" y1="${cy+r1*Math.sin(a)}" x2="${cx+r2*Math.cos(a)}" y2="${cy+r2*Math.sin(a)}" stroke="${v>0?'#c0282d':'#222'}" stroke-width="2"/>`;
    if ([-20,-10,-7,-5,-3,-2,-1,0,1,2,3].includes(v)) s+=`<text x="${cx+r*0.98*Math.cos(a)}" y="${cy+r*0.98*Math.sin(a)}" font-size="11" text-anchor="middle" fill="${v>0?'#c0282d':'#222'}">${v>0?'+'+v:v}</text>`; });
  [0,20,40,60,80,100].forEach(pc=>{ const a=(angOf(pc/100)-90)*Math.PI/180, r1=r*0.80, r2=r*0.76; s+=`<line x1="${cx+r1*Math.cos(a)}" y1="${cy+r1*Math.sin(a)}" x2="${cx+r2*Math.cos(a)}" y2="${cy+r2*Math.sin(a)}" stroke="#222"/><text x="${cx+r*0.70*Math.cos(a)}" y="${cy+r*0.70*Math.sin(a)+3}" font-size="8.5" text-anchor="middle" fill="#222">${pc}</text>`; });
  s+=`<text x="${cx}" y="${Y0+H-28}" font-size="17" font-weight="700" text-anchor="middle" fill="#222">VU</text><text x="${X0+8}" y="${Y0+H-8}" font-size="9" fill="#555">1823 “A” Wilbac (scale redrawn)</text>`;
  const a=(angOf(p)-90)*Math.PI/180; s+=`<line x1="${cx+r*0.25*Math.cos(a)}" y1="${cy+r*0.25*Math.sin(a)}" x2="${cx+r*0.95*Math.cos(a)}" y2="${cy+r*0.95*Math.sin(a)}" stroke="#111" stroke-width="2.4"/>`;
  return `<g clip-path="url(#m445w${i})"><title>${label}</title>${s}</g>`;
}
function segPath(x,y,w,h,code){   // 7-seg, bit0 = a … bit6 = g (standard gfedcba codes in LUTAB2)
  const t=w*0.16, segs=[[x+t,y,w-2*t,t],[x+w-t,y+t,t,h/2-t],[x+w-t,y+h/2,t,h/2-t],[x+t,y+h-t,w-2*t,t],[x,y+h/2,t,h/2-t],[x,y+t,t,h/2-t],[x+t,y+h/2-t/2,w-2*t,t]];
  return segs.map((s,i)=>`<rect x="${s[0]}" y="${s[1]}" width="${s[2]}" height="${s[3]}" rx="1" fill="${(code>>i)&1?'#1d2418':'rgba(29,36,24,.07)'}"/>`).join(''); }
function lcdSVG(l){
  const [cx,cy,w,h]=P.lcd, X0=(cx-w/2)*S, Y0=py(cy+h/2), W=w*S, H=h*S;
  let s=`<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" rx="3" fill="${l?'#a9b99a':'#8d9a82'}" stroke="#333"/>`;
  if (l){ const dx=X0+12, dy=Y0+12, dw=26, dh=44;
    s+=`<rect x="${dx}" y="${dy+dh/2-3}" width="16" height="6" fill="${l.sign?'#1d2418':'rgba(29,36,24,.07)'}"/><rect x="${dx+5}" y="${dy+dh/2-11}" width="6" height="22" fill="${l.sign==='+'?'#1d2418':'rgba(29,36,24,.07)'}"/>`;
    s+=segPath(dx+24,dy,dw,dh,l.d1)+segPath(dx+24+dw+8,dy,dw,dh,l.d2)+segPath(dx+24+2*(dw+8),dy,dw,dh,l.d3);
    s+=`<text x="${X0+W-8}" y="${Y0+H-8}" font-size="10" text-anchor="end" font-weight="700" fill="${l.lobat?'#1d2418':'rgba(29,36,24,.10)'}">LO BAT</text>`;
  }
  return `<g><title>DS1 STA 3901-365-920 LCD driven by U1 MM5453 (SA14-304)</title>${s}</g>`;
}
function frontSVG(t){
  const R=rec(), c=cOf(R,t), l=R.running? lcdAt(R,c) : null, lit = D.power && D.docked;
  let s=`<defs>${P.win.map((w,i)=>`<clipPath id="m445w${i}"><rect x="${w[0]*S}" y="${py(w[1]+w[3])}" width="${w[2]*S}" height="${w[3]*S}"/></clipPath>`).join('')}
    <radialGradient id="m445glow" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#fff3b0" stop-opacity=".55"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>
    <rect width="${PW*S}" height="${PH*S}" rx="6" fill="#1c1d1f"/>`;
  s+=meterSVG(0, needleAt('L',t), lit, 'M1 left meter (LEFT/L+R)')+meterSVG(1, needleAt('R',t), lit, 'M2 right meter (RIGHT/L−R)');
  s+=lcdSVG(l);
  [[0.18,0.234],[0.18,3.234],[11.57,0.234],[11.57,3.234]].forEach(([x,y])=>s+=`<circle cx="${x*S}" cy="${py(y)}" r="7" fill="#2a2b2e" stroke="#555"/>`);
  s+=`<image href="${AS}m445-front-silk.svg" x="0" y="0" width="${PW*S}" height="${PH*S}"/>`;
  // encoder (SW1 cap/knob Sifam S150, 15 mm)
  const [ex,ey]=P.enc, pos=R.running? R.IN.encPos(c) : 0, ka=pos*15*Math.PI/180;
  s+=`<g data-act="enc" style="cursor:pointer"><circle cx="${ex*S}" cy="${py(ey)}" r="29.5" fill="#101012" stroke="#444" stroke-width="2"/><circle cx="${ex*S}" cy="${py(ey)}" r="22" fill="#18181a"/>
     <line x1="${ex*S+Math.sin(ka)*8}" y1="${py(ey)-Math.cos(ka)*8}" x2="${ex*S+Math.sin(ka)*26}" y2="${py(ey)-Math.cos(ka)*26}" stroke="#ddd" stroke-width="3"/>
     <rect x="${ex*S-30}" y="${py(ey)-30}" width="30" height="60" fill="transparent" data-dir="-1"><title>SENSITIVITY: click left half = 1 detent down</title></rect>
     <rect x="${ex*S}" y="${py(ey)-30}" width="30" height="60" fill="transparent" data-dir="1"><title>SENSITIVITY: click right half = 1 detent up</title></rect></g>`;
  for (const [k,x] of Object.entries(P.btn)){ const on = D[k]; const tip={mode:'MODE: in = L+R / L−R',hp:'HP FILT: in = 75 Hz high-pass',term:'TERM: in = MATCH (terminate)',z150:'Z: in = 150 Ω, out = 600 Ω',power:'POWER SW5'}[k];
    s+=`<g data-act="btn" data-k="${k}" style="cursor:pointer"><circle cx="${x*S}" cy="${py(P.btnY)}" r="21.1" fill="#0d0d0e"/><circle cx="${x*S}" cy="${py(P.btnY)}" r="${on?15:18}" fill="${on?'#3a3c40':'#5b5e63'}" stroke="${on?'var(--accent)':'#777'}" stroke-width="${on?3:1.5}"/><title>${tip} (${on?'in':'out'})</title></g>`; }
  for (const k of ['L','R','P']){ const [x,y]=P.jack[k], r=k==='P'?18.75:26.5, plugged = k==='L'?D.plugL:k==='R'?D.plugR:D.phones;
    s+=`<g data-act="jack" data-k="${k}" style="cursor:pointer"><circle cx="${x*S}" cy="${py(y)}" r="${r}" fill="#0a0a0a" stroke="#888" stroke-width="2"/><circle cx="${x*S}" cy="${py(y)}" r="${r*0.45}" fill="#000"/>${plugged?`<circle cx="${x*S}" cy="${py(y)}" r="${r*0.9}" fill="${k==='P'?'#3d6fb0':'#b0503d'}" stroke="#222"/><rect x="${x*S-r*0.3}" y="${py(y)-r*0.3}" width="${r*0.6}" height="${r*0.6}" fill="#ccc"/>`:''}<title>${k==='P'?'MONITOR (JACK 1 NL-114B TRS headset)':'INPUT '+(k==='L'?'LEFT JACK 2':'RIGHT JACK 3')+' PJ339 long-frame'} — click to ${plugged?'unplug':'plug in'}</title></g>`; }
  if (!D.power) s+=`<rect width="${PW*S}" height="${PH*S}" fill="#000" opacity=".25" pointer-events="none"/>`;
  return s;
}
function dockSVG(t){
  const meter = frontSVG(t);
  if (!D.docked) return `<svg viewBox="0 0 ${PW*S} ${PH*S}" style="width:100%;max-width:1100px;display:block;margin:auto">${meter}</svg>`;
  const W=1900, H=350, mx=(19-PW)/2*S, n=needles(), i=Math.min(n.dL.length-1,Math.round(t*1000)), lit=D.power;
  const spk=(x0,ch)=>{ const lv = lit? Math.min(1, (ch==='L'?n.dL[i]:n.dR[i])*D.spk*0.6) : 0; let g=`<rect x="${x0}" y="10" width="259" height="330" rx="4" fill="#2b2c2e" stroke="#444"/><rect x="${x0+54}" y="35" width="175" height="250" rx="12" fill="#151515"/>`;
    for (let yy=50; yy<280; yy+=11) for (let xx=x0+66; xx<x0+222; xx+=11) g+=`<circle cx="${xx}" cy="${yy}" r="3" fill="#2d2d2d"/>`;
    g+=`<rect x="${x0+54}" y="35" width="175" height="250" rx="12" fill="var(--accent)" opacity="${(lv*0.35).toFixed(2)}"/><text x="${x0+130}" y="320" font-size="13" text-anchor="middle" fill="#aaa">${ch==='L'?'LEFT':'RIGHT'} SPEAKER · SD22S</text>`; return g; };
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block"><rect width="${W}" height="${H}" rx="6" fill="#3a3b3e"/>`;
  s+=`<rect x="0" y="0" width="50" height="${H}" fill="#47484c"/><rect x="${W-50}" y="0" width="50" height="${H}" fill="#47484c"/>`;
  s+=spk(mx-259-10,'L')+spk(mx+PW*S+10,'R');
  s+=`<g transform="translate(${mx},${(H-PH*S)/2})">${meter}</g>`;
  s+=`<text x="25" y="${H/2}" font-size="12" fill="#bbb" transform="rotate(-90 25 ${H/2})" text-anchor="middle">RACK DOCK (445S01)</text></svg>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('[data-act="enc"] rect').forEach(r=>r.onclick=e=>{ e.stopPropagation(); A.enc(+r.dataset.dir, 0.04); });
  root.querySelectorAll('[data-act="btn"]').forEach(g=>g.onclick=()=>{ const k=g.dataset.k; if (k==='power') A.power(); else A.btn(k); });
  root.querySelectorAll('[data-act="jack"]').forEach(g=>g.onclick=()=>A.jack(g.dataset.k));
}

/* ---------------- controls under the panel ---------------- */
function controlsHTML(){
  const o=(v,l,cur)=>`<option value="${v}" ${String(cur)===String(v)?'selected':''}>${l}</option>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
   <span><b>Sensitivity</b> <button data-c="e-10">◀◀ fast −</button> <button data-c="e-1">◀ −1</button> <button data-c="e1">+1 ▶</button> <button data-c="e10">fast + ▶▶</button></span>
   <label>Rear source <input id="m4lv" type="range" min="-70" max="30" value="${D.rear.lvl}"> <span id="m4lvv" class="mono"></span></label>
   <label>f <select id="m4f">${[50,100,400,1000,10000].map(f=>o(f,f>=1000?f/1000+' kHz':f+' Hz',D.rear.f)).join('')}</select></label>
   <label>R channel <select id="m4ph">${o(0,'in phase',D.rear.rphase)}${o(180,'inverted',D.rear.rphase)}${o(90,'90°',D.rear.rphase)}</select></label>
   <label>R level <select id="m4rdb">${[0,-3,-6,-20,-60].map(v=>o(v,(v?v:'±0')+' dB',D.rear.rdb)).join('')}</select></label>
   <label>Source Z <select id="m4rs">${o(0,'0 Ω',D.rs)}${o(150,'150 Ω',D.rs)}${o(600,'600 Ω',D.rs)}</select></label>
   <label>Patch cord source <input id="m4pl" type="number" min="-70" max="30" value="${D.patch.lvl}" style="width:62px"> dBu</label>
   <label>Program <select id="m4pg">${o('burst','Tone burst 200–700 ms',D.prog)}${o('tone','Steady tone',D.prog)}${o('speech','Speech-like',D.prog)}</select></label>
  </div><div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:6px">
   <button data-c="dock">${D.docked?'Undock (portable)':'Dock in rack frame'}</button>
   <label>Battery <input id="m4vb" type="range" min="3.4" max="5.6" step="0.05" value="${D.vbat}" ${D.docked?'disabled':''}> <span class="mono">${D.vbat.toFixed(2)} V</span></label>
   <button data-c="bat42" ${D.docked?'disabled':''}>Battery → 4.20 V here</button><button data-c="bat36" ${D.docked?'disabled':''}>→ 3.60 V here</button>
   <button data-c="glitch">/IRQ glitch here</button>
   <label>Firmware <select id="m4fw">${Object.keys(FW).map(k=>o(k,k+'.ASM ('+SIM.year(1996)+')',D.fw)).join('')}</select></label>
   <label>Time line <select id="m4boot">${o('running','already running (booted 1.3 s earlier)',D.boot)}${o('powerup','power-on at t = 0',D.boot)}</select></label>
   <label><input type="checkbox" id="m4lk2" ${D.lk2?'checked':''}> LK2 (8 dB REF)</label><label><input type="checkbox" id="m4lk3" ${D.lk3?'checked':''}> LK3 (0 dB REF)</label>
   <label><input type="checkbox" id="m4cop" ${D.copOn?'checked':''}> COP on ${inf('CONFIG not in archive')}</label>
   <label>Speaker level <input id="m4spk" type="range" min="0" max="1" step="0.05" value="${D.spk}"></label>
   <button data-c="clr">Clear time-line events (${D.events.length})</button><button data-c="rst">Factory state</button></div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s); if (!q('#m4lv')) return;
  m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ const c=b.dataset.c;
    if (c==='e-10') A.enc(-10,0.009); else if (c==='e10') A.enc(10,0.009); else if (c==='e-1') A.enc(-1,0.04); else if (c==='e1') A.enc(1,0.04);
    else if (c==='dock') A.dock(); else if (c==='bat42') A.bat(4.2); else if (c==='bat36') A.bat(3.6); else if (c==='glitch') A.glitch();
    else if (c==='clr'){ D.events=[]; SIM.refresh(); } else if (c==='rst'){ reset(); SIM.refresh(); } });
  const u=()=>q('#m4lvv').textContent=D.rear.lvl+' dBu'; u();
  q('#m4lv').oninput=e=>{ D.rear.lvl=+e.target.value; u(); }; q('#m4lv').onchange=()=>act(`Rear source → ${D.rear.lvl} dBu`, tr=>{ tr(`TS1 1/2 & 4/5 → P1 → J1 → 305P1 (normalled through JACK 2/3)`); tr(`Steady tone reads L ${fmtVU(readDb('L'))} · R ${fmtVU(readDb('R'))} against the LCD sensitivity ${liveLevel()>=0?'+':''}${liveLevel()} dBu`); });
  q('#m4f').onchange=e=>{ D.rear.f=+e.target.value; SIM.refresh(); };
  q('#m4ph').onchange=e=>{ D.rear.rphase=+e.target.value; SIM.refresh(); };
  q('#m4rdb').onchange=e=>{ D.rear.rdb=+e.target.value; SIM.refresh(); };
  q('#m4rs').onchange=e=>{ D.rs=+e.target.value; SIM.refresh(); };
  q('#m4pl').onchange=e=>{ D.patch.lvl=+e.target.value; SIM.refresh(); };
  q('#m4pg').onchange=e=>{ D.prog=e.target.value; SIM.refresh(); };
  q('#m4vb').onchange=e=>act(`Battery set to ${(+e.target.value).toFixed(2)} V (whole run)`, tr=>{ D.vbat=+e.target.value; tr(`BAT ${D.vbat>BAT_TH?'high':'LOW'} (threshold ${BAT_TH.toFixed(3)} V), /IRQ ${D.vbat>STOP_TH?'high':'LOW'} (threshold ${STOP_TH.toFixed(3)} V) ${inf('comparator node from the divider values')}`); });
  q('#m4fw').onchange=e=>A.fw(e.target.value);
  q('#m4boot').onchange=e=>{ D.boot=e.target.value; SIM.seek(0); SIM.refresh(); };
  q('#m4lk2').onchange=()=>A.lk(2); q('#m4lk3').onchange=()=>A.lk(3);
  q('#m4cop').onchange=e=>{ D.copOn=e.target.checked; SIM.refresh(); };
  q('#m4spk').onchange=e=>act(`Speaker level (R15 10-072 on SA14-311) → ${Math.round(+e.target.value*10)}`, tr=>{ D.spk=+e.target.value; tr('Dual pot R15A/R15B ahead of U4 LM1877N-9 (2 × 2 W); dock only'); });
}
function traceHTML(){ const e=D.log[0]; if (!e) return '<div class="muted">Turn the SENSITIVITY knob (click its left or right half), press a button, plug a jack — or use the controls. The hardware path appears first, then the instructions the 68HC11 really executed (from the emulator).</div>';
  return `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>`+e.tr.map(s=>`<div>→ ${s}</div>`).join('')+(e.fw.length?`<div style="margin-top:4px"><b>Firmware (emulated ${D.fw})</b></div>`+e.fw.map(s=>`<div>${s}</div>`).join(''):''); }
function logHTML(){ return D.log.map(e=>`<div><span class="mono">${SIM.fmtT(e.t)}</span> ${e.name}</div>`).join('') || '<div class="muted">No actions yet.</div>'; }
function inspHTML(t){
  const R=rec(), c=cOf(R,t), l=R.running? lcdAt(R,c):null, g=R.running? gainAt(R,c):null, ch=chain(), lv=at(R.var.LEVEL,c,null);
  const pL=needleAt('L',t), pR=needleAt('R',t), k1=at(R.k1,c,'CLR');
  return `<table class="kv">
   <tr><th>LCD</th><td class="mono">${l? (l.text.trim()||'(blank)')+(l.lobat?' · LO BAT':'') : D.power? 'blank (MM5453 not loaded yet)':'off'}</td></tr>
   <tr><th>LEVEL (RAM $1A)</th><td class="mono">${lv===null?'—':lv+' → sensitivity '+(lv-60>=0?'+':'')+(lv-60)+' dBu for 0 VU'}</td></tr>
   <tr><th>Range flags PORTB</th><td class="mono">${g? hex(g.pb)+' '+flagTxt(g.pb) : '—'} · K1/K2 ${k1}</td></tr>
   <tr><th>CS3310 U11</th><td class="mono">${g&&g.cs!==null? fmtDb(g.cs) : 'not loaded'}${g&&g.mu?' · /MUTE low':''}</td></tr>
   <tr><th>Gain input → meter driver</th><td class="mono">${g&&isFinite(g.db)? fmtDb(g.db) : '— (muted / no range)'}</td></tr>
   <tr><th>At the input terminals</th><td class="mono">L ${ch.tL.toFixed(1)} dBu · R ${ch.tR.toFixed(1)} dBu (Z<sub>in</sub> ${ZIN()} Ω, source ${D.rs} Ω)</td></tr>
   <tr><th>Needles at playhead</th><td class="mono">L ${isFinite(vuDb(pL))?vuDb(pL).toFixed(1):'−∞'} VU · R ${isFinite(vuDb(pR))?vuDb(pR).toFixed(1):'−∞'} VU</td></tr>
   <tr><th>Outputs at 0 VU</th><td class="mono">TS1 6–10 +4 dBu · headset −2 dBu (300 Ω)${D.phones?' · phones plugged':''} · speakers ${D.docked&&D.power?'on':'off (undocked)'}</td></tr>
   <tr><th>Supply</th><td class="mono">${D.docked?'dock +24 V → 5.16 V (U18), MAX713 charging':'battery '+R.IN.vb(c).toFixed(2)+' V'} · BAT ${R.IN.vb(c)>BAT_TH?'ok':'LOW'}${R.ev.stop.length&&R.ev.stop[0][0]<=c?' · <b style="color:var(--bad)">STOPPED</b>':''}</td></tr></table>`;
}

/* =====================================================================
   TIME LINE LANES
   ===================================================================== */
function digital(c,X,t0,t1,y,h,R,list,init,col,lab){
  const ty=y+5, by=y+h-5; c.strokeStyle=col; c.lineWidth=1.5; c.beginPath();
  let v=at(list, cOf(R,t0), init); c.moveTo(X(t0), v?ty:by);
  const i0=ubE(list,cOf(R,t0)), i1=ubE(list,cOf(R,t1)); let n=0;
  for (let i=i0;i<i1 && n<4000;i++,n++){ const [cc,nv]=list[i]; const x=X(tOf(R,cc)); c.lineTo(x, v?ty:by); v=nv; c.lineTo(x, v?ty:by); }
  c.lineTo(X(t1), v?ty:by); c.stroke(); c.lineWidth=1;
  if (lab){ c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(lab, X(t0)+3, y+h-2); }
}
const pinList = (R, bit, src)=> (src||R.ev.pa).map(([c,v])=>[c, (v>>bit)&1]);
function lanes(){
  const R=rec(), css=SIM.css, n=needles(), fwn=D.fw;
  const encList = R.IN.edges.map(([c,p])=>[c, UPSEQ[((p%4)+4)%4]]);
  return [
    {label:'PA0 KNOB1 · PA1 KNOB2 (encoder)', h:34, draw(c,X,t0,t1,y,h){ digital(c,X,t0,t1,y,h/2,R,encList.map(([cc,v])=>[cc,v&1]),1,css('--accent2')); digital(c,X,t0,t1,y+h/2,h/2,R,encList.map(([cc,v])=>[cc,(v>>1)&1]),1,css('--accent2')); }},
    {label:'KEYBIT after DEBTAB (KS1 · KS2)', h:30, draw(c,X,t0,t1,y,h){ digital(c,X,t0,t1,y,h/2,R,R.var.KS1.map(([cc,v])=>[cc,(v>>3)&1]),0,css('--accent')); digital(c,X,t0,t1,y+h/2,h/2,R,R.var.KS2.map(([cc,v])=>[cc,(v>>3)&1]),0,css('--accent')); }},
    {label:'OC3 → JSCAN (SCAN_TI 4 ms)', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--accent'); let k=0; for (const s of R.scans){ const t=tOf(R,s); if (t<t0||t>t1) continue; const rt=R.ev.rti.find(([cc])=>cc>s); const x=X(t), x2=rt? Math.max(x+1,X(tOf(R,rt[0]))) : x+1; c.fillRect(x,y+4,x2-x,h-8); k++; }
      if (k>60){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${k} scans, every 4.000 ms (TOC3 += 4000)`, X(t0)+6, y+h/2+4); } }},
    {label:'CPU: routine at each instant', h:30, draw(c,X,t0,t1,y,h,pw){ if (!R.running){ c.fillStyle=css('--ink2'); c.fillText('power off',X(t0)+6,y+h/2+4); return; }
      const span=t1-t0, perPx=span/pw;
      if (span < 4e-4){ // instruction boxes
        const i0=ub(R.insC,R.n,cOf(R,t0))-1, i1=ub(R.insC,R.n,cOf(R,t1));
        c.font='10px '+css('--mono');
        for (let i=Math.max(0,i0);i<i1;i++){ const a=X(tOf(R,R.insC[i])), b=X(tOf(R,R.insC[i+1]||R.insC[i]+2)); const r=routineOf(fwn,R.insPC[i]); c.fillStyle=RCOL[r]||'#888'; c.globalAlpha=.55; c.fillRect(a,y+3,b-a-1,h-6); c.globalAlpha=1;
          const ln=FW[fwn].pcLine.get(R.insPC[i]); if (b-a>40 && ln!==undefined){ c.fillStyle=css('--ink'); const txt=FW[fwn].asm.lines[ln].replace(/;.*/,'').trim().replace(/\s+/g,' '); c.fillText(txt.slice(0,Math.floor((b-a)/6)), a+2, y+h/2+4); } }
        return; }
      let last=null, xs=X(t0);
      for (let x=0;x<=pw;x+=2){ const t=t0+x*perPx; const p=pcAt(R,cOf(R,t)); const r=p? routineOf(fwn,p.pc):'RESET';
        if (r!==last){ if (last){ c.fillStyle=RCOL[last]||'#888'; c.fillRect(xs,y+4,X(t)-xs,h-8); if (X(t)-xs>46){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(last,xs+3,y+h/2+4);} } last=r; xs=X(t); } }
      c.fillStyle=RCOL[last]||'#888'; c.fillRect(xs,y+4,X(t1)-xs,h-8); if (X(t1)-xs>46){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(last,xs+3,y+h/2+4);} }},
    {label:'LEVEL ($1A) − 60 = sensitivity dBu', h:40, draw(c,X,t0,t1,y,h){ const L=R.var.LEVEL; let lastLx=-1e9; c.strokeStyle=css('--warn'); c.lineWidth=2; c.beginPath(); let v=at(L,cOf(R,t0),64); const yy=v=>y+h-4-(v/90)*(h-8); c.moveTo(X(t0),yy(v)); for (const [cc,nv] of L){ const t=tOf(R,cc); if (t<t0||t>t1) continue; c.lineTo(X(t),yy(v)); v=nv; c.lineTo(X(t),yy(v)); if (X(t)-lastLx>22){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText((v-60>=0?'+':'')+(v-60),X(t)+2,yy(v)-2); lastLx=X(t); } } c.lineTo(X(t1),yy(v)); c.stroke(); c.lineWidth=1; c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText((v-60>=0?'+':'')+(v-60)+' dBu',X(t1)-50,yy(v)-3); }},
    {label:'DELTA (acceleration, −1 per scan)', h:26, draw(c,X,t0,t1,y,h){ const L=R.var.DELTA; c.strokeStyle=css('--accent2'); c.beginPath(); let v=at(L,cOf(R,t0),1); const yy=v=>y+h-3-(v/7)*(h-6); c.moveTo(X(t0),yy(v)); for (const [cc,nv] of L){ const t=tOf(R,cc); if(t<t0||t>t1) continue; c.lineTo(X(t),yy(v)); v=nv; c.lineTo(X(t),yy(v)); } c.lineTo(X(t1),yy(v)); c.stroke(); }},
    {label:'SPI → MM5453 LCD (PD4 SCK, PD3 MOSI)', h:30, draw(c,X,t0,t1,y,h){ c.font='10px '+css('--mono'); for (const [cc,d] of R.ev.spi){ const ta=tOf(R,cc), tb=ta+d.dur/1e6; if (tb<t0||ta>t1) continue; const a=X(ta), b=Math.max(a+1,X(tb)); c.fillStyle=css('--accent2'); c.globalAlpha=.6; c.fillRect(a,y+5,b-a,h-10); c.globalAlpha=1;
      if (b-a>26){ c.fillStyle=css('--ink'); c.fillText(hex(d.v),a+2,y+h/2+4); } if (b-a>120){ for(let k=0;k<8;k++){ const xb=a+(b-a)*k/8; c.fillStyle=css('--ink2'); c.fillText((d.v>>(7-k))&1, xb+(b-a)/16-3, y+h-1); } } } }},
    {label:'CS3310 /CS · CLK · DATA (PC2..PC0)', h:42, draw(c,X,t0,t1,y,h){ const pcs=R.ev.pc; digital(c,X,t0,t1,y,14,R,pinList(R,2,pcs),1,css('--warn')); digital(c,X,t0,t1,y+14,14,R,pinList(R,1,pcs),1,css('--ink2')); digital(c,X,t0,t1,y+28,14,R,pinList(R,0,pcs),1,css('--accent'));
      c.font='10px '+css('--mono'); c.fillStyle=css('--ink'); let lx=-1e9; for (const [cc,w] of R.cs){ const t=tOf(R,cc); if (t<t0||t>t1||X(t)-lx<120) continue; lx=X(t); c.fillText(`${hex(w.R)}${hex(w.L).slice(1)} = ${fmtDb(csDb(w.L))}`, X(t)+3, y+11); } }},
    {label:'PORTB range flags (active low)', h:24, draw(c,X,t0,t1,y,h){ const L=R.pb; let v=at(L,cOf(R,t0),0), xs=X(t0); c.font='10px '+css('--mono'); const seg=(a,b,v)=>{ c.fillStyle= v===0xFF? css('--grid') : (!(v&2)? '#e3a35a' : !(v&8)? '#5aa9e6' : '#4cc38a'); c.globalAlpha=.55; c.fillRect(a,y+4,b-a,h-8); c.globalAlpha=1; if (b-a>70){ c.fillStyle=css('--ink'); c.fillText(hex(v)+' '+flagTxt(v).replace(' active (low)','').slice(0,22),a+3,y+h/2+4);} };
      for (const [cc,nv] of L){ const t=tOf(R,cc); if (t<t0) { v=nv; continue; } if (t>t1) break; seg(xs,X(t),v); v=nv; xs=X(t); } seg(xs,X(t1),v); }},
    {label:'K1/K2 SET (PA4) · CLR (PA5) 6.5 ms', h:30, draw(c,X,t0,t1,y,h){ digital(c,X,t0,t1,y,h/2,R,pinList(R,4),0,'#e0782e','SET'); digital(c,X,t0,t1,y+h/2,h/2,R,pinList(R,5),0,'#e0782e','CLR'); }},
    {label:'/MUTE (PA6 → CS3310 pin 8)', h:20, draw(c,X,t0,t1,y,h){ digital(c,X,t0,t1,y,h,R,pinList(R,6),0,css('--bad')); }},
    {label:'COPRST $55/$AA (COP service)', h:20, draw(c,X,t0,t1,y,h){ const L=R.copSvc; let k=0; c.fillStyle=css('--ink2'); for (let i=0;i<L.length;i++){ const t=tOf(R,L[i]); if (t<t0||t>t1) continue; k++; if (k<3000) c.fillRect(X(t),y+5,1,h-10); }
      c.fillStyle=css('--bad'); R.ev.copreset.forEach(([cc])=>{ const t=tOf(R,cc); if(t>=t0&&t<=t1) c.fillRect(X(t)-1,y,3,h); }); if (k>200){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${k.toLocaleString()} services (timeout 32.8 ms)`,X(t0)+6,y+h/2+4);} }},
    {label:'BAT (PA2) · /IRQ (STOP comparator)', h:30, draw(c,X,t0,t1,y,h,pw){ const ss=[]; for (let x=0;x<=pw;x+=3){ const t=t0+(t1-t0)*x/pw, p=R.IN.pins(cOf(R,t)); ss.push([X(t),p.pa&4,p.irq]); } R.IN.pins(0);
      c.strokeStyle=css('--accent'); c.beginPath(); ss.forEach(([x,b],i)=>{ const yy=b? y+4 : y+h/2-2; i?c.lineTo(x,yy):c.moveTo(x,yy); }); c.stroke(); c.strokeStyle=css('--bad'); c.beginPath(); ss.forEach(([x,b,q],i)=>{ const yy=q? y+h/2+3 : y+h-3; i?c.lineTo(x,yy):c.moveTo(x,yy); }); c.stroke();
      R.ev.stop.forEach(([cc])=>{ const t=tOf(R,cc); if (t>=t0&&t<=t1){ c.fillStyle=css('--bad'); c.font='11px '+css('--mono'); c.fillText('STOP',X(t)+3,y+h/2+4);} }); }},
    {label:'Gain input → meter driver (dB)', h:36, draw(c,X,t0,t1,y,h,pw){ c.strokeStyle=css('--accent'); c.beginPath(); const yy=g=>y+h-3-Math.max(0,Math.min(1,(g+60)/110))*(h-6); for (let x=0;x<=pw;x+=2){ const t=t0+(t1-t0)*x/pw; const G=R.running? gainAt(R,cOf(R,t)).db : -200; const v=isFinite(G)?G:-60; x?c.lineTo(X(t),yy(v)):c.moveTo(X(t),yy(v)); } c.stroke(); }},
    {label:`Program at input (${D.prog})`, h:30, draw(c,X,t0,t1,y,h,pw){ c.fillStyle=css('--accent2'); c.globalAlpha=.4; for (let x=0;x<=pw;x+=2){ const t=t0+(t1-t0)*x/pw; const e=env(t); c.fillRect(X(t),y+h/2-e*h*0.4,2,e*h*0.8); } c.globalAlpha=1; }},
    {label:'Needle L · R (VU, ANSI C16.5)', h:52, draw(c,X,t0,t1,y,h,pw){ const yy=v=>y+h-4-Math.min(1.5,v)/1.5*(h-8);
      [['L',css('--ink')],['R',css('--accent2')]].forEach(([k,col])=>{ c.strokeStyle=col; c.lineWidth=2; c.beginPath(); for(let x=0;x<=pw;x+=2){ const t=t0+(t1-t0)*x/pw; const v=needleAt(k,t); x?c.lineTo(X(t),yy(v)):c.moveTo(X(t),yy(v)); } c.stroke(); });
      c.lineWidth=1; c.fillStyle=css('--ink2'); c.fillRect(X(t0),yy(1),X(t1)-X(t0),1); c.font='10px monospace'; c.fillText('0 VU',X(t0)+4,yy(1)-2); }},
    {label:'LCD shows (latched at the 36th clock)', h:24, draw(c,X,t0,t1,y,h){ c.font='12px '+css('--mono'); let prev=null, xs=X(t0); const L=R.lcd; let v=lcdAt(R,cOf(R,t0));
      const put=(a,b,l)=>{ c.fillStyle=css('--chip'); c.fillRect(a,y+3,b-a,h-6); c.fillStyle=css('--ink'); if (b-a>30) c.fillText(l? (l.text.trim()||'blank')+(l.lobat?' LO BAT':'') : 'blank', a+4, y+h/2+4); c.strokeStyle=css('--line'); c.strokeRect(a,y+3,b-a,h-6); };
      for (const [cc,l] of L){ const t=tOf(R,cc); if (t<t0) continue; if (t>t1) break; put(xs,X(t),v); v=l; xs=X(t); } put(xs,X(t1),v); }},
  ];
}
/* bit-level scope of the TXD burst nearest the playhead */
function scopeLanes(R, f){
  const css=SIM.css, t0=tOf(R,f.c0)-0.00005, t1=tOf(R,f.end)+0.00005;
  const spiBits=[]; R.ev.spi.forEach(([c,d])=>{ if (c>=f.c0-10 && c<=f.end) for(let k=0;k<8;k++) spiBits.push({c:c+k*d.dur/8, w:d.dur/8, b:(d.v>>(7-k))&1}); });
  return {range:[t0,t1], lanes:[
    {label:'SCK (PD4) E/32, CPOL=CPHA=1', h:26, draw(c,X,a,b,y,h){ c.strokeStyle=css('--accent2'); c.beginPath(); c.moveTo(X(a),y+5); spiBits.forEach(s=>{ const ta=tOf(R,s.c), tm=ta+s.w/2e6, te=ta+s.w/1e6; c.lineTo(X(ta),y+5); c.lineTo(X(ta),y+h-5); c.lineTo(X(tm),y+h-5); c.lineTo(X(tm),y+5); }); c.lineTo(X(b),y+5); c.stroke(); }},
    {label:'MOSI (PD3) → MM5453 DATA', h:26, draw(c,X,a,b,y,h){ c.font='10px '+css('--mono'); spiBits.forEach((s,i)=>{ const ta=tOf(R,s.c), te=ta+s.w/1e6; c.fillStyle=s.b? css('--accent2'):css('--grid'); c.fillRect(X(ta),y+5,X(te)-X(ta)-1,h-10); c.fillStyle=css('--ink'); if (X(te)-X(ta)>9) c.fillText(s.b,X(ta)+2,y+h/2+4); if (i===f.lcdStart) { c.fillStyle=css('--bad'); c.fillText('start',X(ta),y+4); } }); }},
    {label:'/CS (PC2) → CS3310', h:22, draw(c,X,a,b,y,h){ digital(c,X,a,b,y,h,R,pinList(R,2,R.ev.pc),1,css('--warn')); }},
    {label:'CLK (PC1)', h:22, draw(c,X,a,b,y,h){ digital(c,X,a,b,y,h,R,pinList(R,1,R.ev.pc),1,css('--ink2')); }},
    {label:'DATA (PC0), sampled on CLK ↑', h:26, draw(c,X,a,b,y,h){ digital(c,X,a,b,y,h,R,pinList(R,0,R.ev.pc),1,css('--accent'));
      const w=R.cs.find(([cc])=>cc>=f.c0 && cc<=f.end+200); if (w){ c.font='10px '+css('--mono'); c.fillStyle=css('--ink'); w[1].bits.forEach(([cc,bv])=>{ c.fillText(bv,X(tOf(R,cc))-3,y+h-1); }); } }},
    {label:'CPU routine', h:24, draw(c,X,a,b,y,h,pw){ let last=null, xs=X(a); for (let x=0;x<=pw;x+=2){ const t=a+(b-a)*x/pw, p=pcAt(R,cOf(R,t)), r=p?routineOf(R.fw,p.pc):''; if (r!==last){ if(last){ c.fillStyle=RCOL[last]||'#888'; c.fillRect(xs,y+4,X(t)-xs,h-8); if (X(t)-xs>40){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(last,xs+2,y+h/2+4);} } last=r; xs=X(t);} } c.fillStyle=RCOL[last]||'#888'; c.fillRect(xs,y+4,X(b)-xs,h-8); }},
  ]};
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function viewSim(m){
  window[KEY]=false;
  m.innerHTML = card('M445 at the playhead — '+(D.docked?'docked in the 19 in rack frame':'portable (out of the dock)')+'. Front panel drawn to scale from MM445-1.DWG with the 445SILK.DWG artwork; click the knob, buttons and jacks', `<div id="m4fp"></div>${controlsHTML()}`)
   + `<div class="grid2"><div>${card('State at the playhead', '<div id="m4insp"></div>')}${card('Rear connections (445S01 rack frame, 445S02 meter)', rearHTML())}</div>
      <div>${card('What happened (last action): hardware path, then the emulated code path', '<div id="m4trace" class="log" style="max-height:420px"></div>')}${card('Action log', '<div id="m4log" class="log"></div>')}</div></div>`;
  bindControls(m);
  const fp=m.querySelector('#m4fp');
  SIM.on('time', t=>{ fp.innerHTML=dockSVG(t); bindPanel(fp); m.querySelector('#m4insp').innerHTML=inspHTML(t); m.querySelector('#m4trace').innerHTML=traceHTML(); m.querySelector('#m4log').innerHTML=logHTML(); });
}
function rearHTML(){ return `<table class="kv small">
  <tr><th>TS1 Cinch 12-140Y (dock rear)</th><td>1 L+ · 2 L− · 3 SH · 4 R+ · 5 R− (METER INPUTS) · 6 L+ · 7 L− · 8 SH · 9 R+ · 10 R− (METER OUTPUTS +4 dBu at 0 VU, 60 Ω) · 11 GROUND · 12 CHASSIS</td></tr>
  <tr><th>J1 Preh 71206-021 POWER INPUT</th><td>1 = +24 V DC (F1 MDL 0.5 A slow-blow) · 5 = COMMON; supplied by MPI W48DQ5002/1 adapter</td></tr>
  <tr><th>Docking connector P1 3548-1001 ↔ J1 3549-1000</th><td class="mono">1/13 L in · 2/14 · 3/15 R in · 6/18 L out · 8/20 R out · 9/21 COMMON · 10/22 +24 V · 11/23 +24 V to speaker box · 12/24 CHASSIS</td></tr>
  <tr><th>Meter back panel</th><td>Battery compartment B1–4 P-60AA NiCd (Keystone 148 holder) and F2 0.5 A (manual: “If the unit will not run on batteries ensure the fuse in this compartment is not blown”)</td></tr>
  <tr><th>Inside the meter</th><td>LK2 “8 dB REF” → PC7, LK3 “0 dB REF” → PC6 (shorting clips) · LK1 on MODB ${inf('bootstrap select')} · P10 PROG/TX/RX/GND (65645-104)</td></tr></table>`; }

function viewSecond(m){
  window[KEY]=false;
  m.innerHTML = card('One '+(DUR===1?'second':'and a half seconds')+' as the 68HC711E9 sees it — every lane comes from the emulator running '+D.fw+'.ASM instruction by instruction (E = 1 MHz)', `<div class="small muted" style="margin-bottom:6px">Mode: <b>${D.boot==='running'?'already running (power applied 1.3 s before t = 0)':'power-on at t = 0 — watch the 1 s DELAY, the K1CLR pulse, the first TXD, the 200 ms −5 V settle and the 5 ms mute calibration'}</b>. Zoom to 10 ms to see one scan, to 100 µs for instruction boxes. Click a lane to seek.</div><canvas id="m4tl"></canvas>`)
   + `<div class="grid2"><div>${card('Bit level: the TXD burst nearest the playhead (MM5453 by hardware SPI, CS3310 bit-banged at the same time)', '<canvas id="m4sc"></canvas><div id="m4scn" class="small muted"></div>')}</div><div>${card('Instruction at the playhead', '<div id="m4ins"></div>')}${card('Cycle budget (measured on this recording)', '<div id="m4cyc"></div>')}</div></div>`;
  SIM.on('time', ()=>{ const R=rec(); SIM.drawLanes(m.querySelector('#m4tl'), lanes(), {labelW:190});
    const c=cOf(R,SIM.t); const f = R.frames.find(x=>x.end>=c) || R.frames[R.frames.length-1];
    if (f){ const sc=scopeLanes(R,f); SIM.drawLanes(m.querySelector('#m4sc'), sc.lanes, {labelW:170, range:sc.range}); const l=decodeLCD(f.bytes.concat([0,0,0,0,0]).slice(0,5));
      m.querySelector('#m4scn').innerHTML=`Frame at ${SIM.fmtT(tOf(R,f.c0))}: bytes ${f.bytes.map(b=>hex(b)).join(' ')} — first ‘1’ (bit 7 of BUF, the “+128” in SETBUF) is the MM5453 start bit, the next 33 bits drive the segments, the load happens on the 36th clock; the last 4 clocks shift zeros that are ignored ${inf('MM5453 data sheet, not in the archive')}. LCD reads “${l.text.trim()||'blank'}${l.lobat?' LO BAT':''}”.`; }
    else { m.querySelector('#m4sc').getContext('2d'); m.querySelector('#m4scn').textContent='No LCD frame was sent in this recording.'; }
    m.querySelector('#m4ins').innerHTML=insHTML(R,c); m.querySelector('#m4cyc').innerHTML=budgetHTML(R); });
}
function insHTML(R,c){ if (!R.running) return '<div class="muted">Power is off.</div>';
  const p=pcAt(R,c); if (!p) return '—'; const fw=FW[R.fw], ln=fw.pcLine.get(p.pc), cpu=stateAt(R,c);
  const r=cpu? cpu.r : null; const cc=r? r.CC : 0;
  return `<table class="kv"><tr><th>Cycle</th><td class="mono">${p.c.toLocaleString()} (instruction #${p.i.toLocaleString()})</td></tr>
   <tr><th>PC</th><td class="mono">${hex(p.pc,4)} · ${routineOf(R.fw,p.pc)}</td></tr>
   <tr><th>Source</th><td class="mono">${ln!==undefined? esc(fw.asm.lines[ln].replace(/\t/g,'  ')) : p.pc===0x100? 'RTS (planted at $0100 by “LDAA #$39 / STAA $100”)' : 'pseudo-vector JMP in RAM'}</td></tr>
   ${r?`<tr><th>Registers</th><td class="mono">A ${hex(r.A)} B ${hex(r.B)} X ${hex(r.X,4)} Y ${hex(r.Y,4)} SP ${hex(r.S,4)}</td></tr>
   <tr><th>CCR</th><td class="mono">${'SXHINZVC'.split('').map((f,i)=>(cc>>(7-i))&1? `<b>${f}</b>`:f.toLowerCase()).join(' ')}</td></tr>
   <tr><th>RAM</th><td class="mono small">${Object.entries(RAMN).map(([a,n])=>`${n} ${hex(cpu.mem[+a])}`).join(' · ')}</td></tr>
   <tr><th>Timer</th><td class="mono small">TCNT ${hex(cpu.tcnt(),4)} · TOC3 ${hex((cpu.reg[0x1A]<<8)|cpu.reg[0x1B],4)} · TFLG1 ${hex(cpu.reg[0x23])} · TMSK1 ${hex(cpu.reg[0x22])} · SPSR ${hex(cpu.reg[0x29])}</td></tr>`:''}</table>`; }
const esc = s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
let BUDGET=null, BUDGETKEY='';
function budgetHTML(R){
  if (!R.running) return '—'; if (BUDGETKEY===RECKEY && BUDGET) return BUDGET; BUDGETKEY=RECKEY;
  const isr=[]; R.ev.irq.forEach(([c,d])=>{ if (d!=='OC3') return; const r=R.ev.rti.find(([cc])=>cc>c); if (r) isr.push(r[0]-c); });
  const txd=R.frames.filter(f=>f.bytes.length===5).map(f=>f.end-f.c0);
  const csDur=R.cs.map(([c,w])=>c-w.c0);
  const counts={}; const c0=cOf(R,0); const i0=ub(R.insC,R.n,c0);
  for (let i=i0;i<R.n-1;i++){ const r=routineOf(R.fw,R.insPC[i]); counts[r]=(counts[r]||0)+(R.insC[i+1]-R.insC[i]); }
  const tot=Object.values(counts).reduce((a,b)=>a+b,0)||1;
  const avg=a=>a.length? (a.reduce((x,y)=>x+y,0)/a.length).toFixed(0)+' µs' : '—';
  BUDGET = `<table class="kv small"><tr><th>Main-loop pass (MAIN1 → JSR $0100 → COPRST → BRCLR)</th><td class="mono">31 cycles = 31 µs (≈ 32 000 passes / s)</td></tr>
   <tr><th>OC3 scan ISR, interrupt → RTI</th><td class="mono">${avg(isr)} avg, ${isr.length? Math.max(...isr)+' µs max':'—'} (every 4 000 µs)</td></tr>
   <tr><th>TXD (5 LCD bytes + CS3310 word)</th><td class="mono">${avg(txd)}</td></tr><tr><th>CS3310 16 bits, /CS low → high</th><td class="mono">${avg(csDur)} (vs 2 × 256 µs SPI bytes running in parallel)</td></tr>
   <tr><th>Instructions recorded</th><td class="mono">${R.n.toLocaleString()} in ${(R.pre+DUR).toFixed(1)} s</td></tr></table>
   <h3>Where the time goes (t ≥ 0)</h3><table class="kv small">${Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,9).map(([k,v])=>`<tr><th><span style="display:inline-block;width:10px;height:10px;background:${RCOL[k]||'#888'};margin-right:5px"></span>${RNAME[k]||k}</th><td class="mono">${(100*v/tot).toFixed(2)} %</td></tr>`).join('')}</table>`;
  return BUDGET;
}

/* =====================================================================
   SOFTWARE TAB
   ===================================================================== */
const FLOW = [ // main-line flow boxes: [id, label, x, y, routines that light it]
  ['init','RESET $D000: STX $FFFF ×2 (erased bytes), SEI, LDS #$00BF, ports',20,20,['RESET']],
  ['dly1','DELAY 100 × 10 ms (power-up)',20,70,['DELAY']],
  ['k1c','K1CLR 6.5 ms on OC2 (ML1)',20,120,['ML1']],
  ['vec','RAM pseudo-vectors: JTOC1→TIMEOUT, JTOC3→JSCAN, JCOP→RESET, JIRQ→HALT',20,170,[]],
  ['clr','SCAN ×4, TXD (clear LCD)',20,220,[]],
  ['lk','LK2/LK3 → LEVEL 60/64/68 (ML2), SETBUF, TXD',20,270,['ML2']],
  ['oc3','enable OC3 interrupt, CLI',20,320,[]],
  ['dly2','DELAY 20 × 10 ms (−5 V settles)',20,370,[]],
  ['mute','/MUTE pulse 5 ms on OC2 (ML3) — CS3310 calibration',20,420,['ML3']],
  ['main1','MAIN1: JSR $0100 · COPRST · BRCLR FLAGS TALLY',380,120,['MAIN1','HOOK']],
  ['main3','MAIN3: SETBUF → PORTB, GAIN changed?',380,220,['MAIN3','SETBUF']],
  ['k1p','K1PULSE (OC1 drives PA4/PA5)',380,320,['K1PULSE']],
  ['txd','MAIN4: TXD (LCD + CS3310)',600,220,['MAIN4','TXD','TXSPI','TXWAIT','TXCS','TXERR']],
  ['jscan','OC3 ISR JSCAN every 4 ms: DELTA−1, SCAN, ONESEC battery poll',600,20,['JSCAN','PSEUDO']],
  ['scan','SCAN: DEBTAB ×2 → TABLE2 → INC_L / DEC_L',600,70,['SCAN','INC_L','DEC_L']],
  ['timeout','OC1 ISR TIMEOUT: stop K1 interrupt',600,320,['TIMEOUT']],
  ['halt','/IRQ ISR HALT: '+'(KS0003) wait 250 ms, BAT ok → RTI; else lo-bat display, STOP',600,420,['HALT','IGNORE']],
];
function flowSVG(R, c){
  const p=R.running? pcAt(R,c):null, r=p? routineOf(R.fw,p.pc) : '';
  // during DELAY: which call? use time
  const inBoot = R.running && !R.ev.irq.some(([cc,d])=>d==='OC3' && cc<=c);
  let s=`<svg viewBox="0 0 900 470" style="width:100%;font-size:11px">`;
  const k1c = R.running? (R.ev.pa.find(e=>e[1]&0x20)||[1e12])[0] : 1e12;
  FLOW.forEach(([id,l,x,y,rs])=>{ let on = rs.includes(r);
    if (id==='dly1') on = r==='DELAY' && c < k1c; if (id==='dly2') on = r==='DELAY' && c > k1c && !(r==='HALT');
    s+=`<g><rect x="${x}" y="${y}" width="${id.startsWith('m')||id==='k1p'||id==='txd'?200:250}" height="38" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><foreignObject x="${x+4}" y="${y+2}" width="${(id.startsWith('m')||id==='k1p'||id==='txd'?200:250)-8}" height="36"><div xmlns="http://www.w3.org/1999/xhtml" style="font:11px/1.2 var(--sans);color:${on?'#fff':'var(--ink)'}">${l}</div></foreignObject></g>`; });
  const ar=(x1,y1,x2,y2,d)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="var(--ink2)" fill="none" marker-end="url(#m4ar)" ${d?'stroke-dasharray="4 3"':''}/>`;
  s+=`<defs><marker id="m4ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--ink2)"/></marker></defs>`;
  for (let i=0;i<8;i++) s+=ar(145,58+50*i,145,70+50*i);
  s+=ar(270,439,380,158)+ar(480,158,480,220)+ar(580,239,600,239)+ar(700,258,700,290)+ar(480,258,480,320)+ar(600,250,580,150)+ar(700,58,700,70)+ar(700,108,580,140,true);
  s+=`<text x="380" y="110" fill="var(--ink2)">TALLY set by INC_L/DEC_L or battery change</text><text x="610" y="15" fill="var(--ink2)">interrupts</text></svg>`;
  return s;
}
function debSVG(R,c){
  const ks1=at(R.var.KS1,c,0)&0x0F, ks2=at(R.var.KS2,c,0)&0x0F;
  const st=[0,2,4,6,8,10,12,14], pos=i=>[60+ (i%4)*110, i<4? 40 : 120];
  let s=`<svg viewBox="0 0 470 160" style="width:100%;max-height:170px;font-size:11px">`;
  st.forEach((v,i)=>{ const [x,y]=pos(i); const on1=v===ks1, on2=v===ks2; s+=`<circle cx="${x}" cy="${y}" r="22" fill="${on1&&on2?'var(--accent)':on1?'var(--accent2)':on2?'var(--warn)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="${on1||on2?'#fff':'var(--ink)'}">${v}${v>=8?'·K':''}</text>`; });
  s+=`</svg><div class="small muted">Top row: KEYBIT clear, counting 1-samples; bottom row (·K): KEYBIT set, counting 0-samples. The 4th equal sample flips KEYBIT (+16 = KCH). Blue = KS1 (PA0), orange = KS2 (PA1), green = both. KS1 ${hex(ks1)} · KS2 ${hex(ks2)}.</div>`;
  return s;
}
function table2HTML(R,c){
  const fw=FW[R.fw].asm, base=fw.syms.TABLE2, st=at(R.var.STATE2,c,0), cur=st;
  let s='<table class="kv small mono"><tr><th></th>'; for(let k=0;k<4;k++) s+=`<th>in ${k.toString(2).padStart(2,'0')}</th>`; s+='</tr>';
  for (let row=0; row<8; row++){ s+=`<tr><th>${row<4?'DOWN':'UP'} st ${hex(row*4)}</th>`; for (let k=0;k<4;k++){ const i=row*4+k, v=fw.mem.get(base+i); s+=`<td style="${(cur&0x1C)===(v&0x1C)&&false?'':''}">${hex(v)}${v&0x80?' INC':v&0x40?' DEC':''}</td>`; } s+='</tr>'; }
  return s+`</table><div class="small muted">Index = STATE2 &amp; $1F (bits 0–1 = debounced KNOB1/KNOB2 this scan, bits 2–4 = previous state). Result bits 7/6 = TINC/TDEC, bit 5 = TCH. STATE2 at the playhead: <b class="mono">${hex(st)}</b>.</div>`;
}
function listingHTML(R, c){
  const fw=FW[R.fw||D.fw], p=R.running? pcAt(R,c):null, curLn = p? fw.pcLine.get(p.pc) : -1;
  return fw.asm.lines.map((L,i)=>{ const li=fw.lineInfo.get(i); const a=li&&li.by.length? hex(li.a,4).slice(1) : '    '; const by=li? li.by.slice(0,4).map(b=>b.toString(16).toUpperCase().padStart(2,'0')).join(' ')+(li.by.length>4?'…':'') : '';
    return `<div data-ln="${i}" data-a="${li&&li.by.length?li.a:''}" class="${i===curLn?'hl':''}" style="white-space:pre;cursor:${li&&li.by.length?'pointer':'default'}"><span class="muted">${String(i+1).padStart(3)} ${a} ${by.padEnd(13)}</span>${esc(L.replace(/\t/g,'        '))}</div>`; }).join('');
}
function lutCanvas(cv, R, c){
  const {c:g,w,h}=SIM.canvas(cv,190), L=lut(R.fw||D.fw), css=SIM.css, x=i=>40+(w-50)*i/90, y=d=>10+(h-40)*(1-(d+30)/80);
  g.font='10px '+css('--mono'); g.fillStyle=css('--ink2');
  for (let d=-30; d<=50; d+=10){ g.fillRect(40,y(d),w-50,0.5); g.fillText((d>0?'+':'')+d,4,y(d)+3); }
  L.forEach(e=>{ const col=!(e.f&2)?'#e3a35a':!(e.f&8)?'#5aa9e6':'#4cc38a'; g.fillStyle=col; g.globalAlpha=(e.f&1)?0.9:0.45; g.fillRect(x(e.i)-2, y(e.fg+POST), 4, y(-30)-y(e.fg+POST)); g.globalAlpha=1; g.fillStyle=css('--ink'); g.fillRect(x(e.i)-2,y(e.csdb)-1,4,2); });
  const lv=R.running? at(R.var.LEVEL,c,64) : 64; g.strokeStyle=css('--play'); g.beginPath(); g.moveTo(x(lv),5); g.lineTo(x(lv),h-25); g.stroke();
  g.fillStyle=css('--ink'); [0,25,35,46,61,76,90].forEach(i=>g.fillText((i-60>=0?'+':'')+(i-60),x(i)-8,h-8));
  g.fillText('bars: range gain + 19 dB · ticks: CS3310 · red: LEVEL', 44, h-20);
}
function viewSoftware(m){
  window[KEY]=false;
  const k=D.fw, F=FW[k];
  m.innerHTML = `<div class="grid2"><div>${card(`Main line and interrupts (${k}.ASM) — the box that is running at the playhead is lit`, '<div id="m4flow"></div>')}
     ${card('Debounce state machine DEBTAB (one per encoder pin)', '<div id="m4deb"></div>')}
     ${card('Quadrature state machine TABLE2', '<div id="m4t2"></div>')}
     ${card('LUTAB2: the 91-entry level table (FLAGS · DIGIT1 · DIGIT2 · CS3310)', '<canvas id="m4lut"></canvas><div class="small">Each 4-byte record gives the sign (bit 7), the active-low range bits for PORTB, two 7-segment codes and the CS3310 byte. Working back from “meter reads 0 VU when the input equals the display” the ranges are: <b>GAIN</b> −60…−35 (CS3310 +20…−5 dB), <b>UNITY</b> −34…−15 (+19…0), <b>UNITY+PM6</b> −14…0 (+9…−5), <b>ATTEN</b> +1…+15 (+14…0), <b>ATTEN+PM6</b> +16…+30 (+9…−5). So GAIN = UNITY + 25 dB, ATTEN = UNITY − 30 dB and “PM6” is a 10 dB step, not 6. The absolute 19 dB after the CS3310 is '+inf('so that 0 VU = +4 dBu at the meter driver')+'.</div>')}</div>
    <div>${card('Instruction at the playhead', '<div id="m4ins2"></div>')}
     ${card(`Source ${k}.ASM — assembled here (${F.size} bytes, $D000–$FFFF); click a line to jump to its next execution`, `<div id="m4lst" class="log" style="max-height:520px;font-size:11.5px"></div>`)}
     ${card('Memory map and vectors', memHTML(k))}</div></div>`;
  const lst=m.querySelector('#m4lst');
  lst.onclick=e=>{ const d=e.target.closest('[data-a]'); if (!d||d.dataset.a==='') return; const a=+d.dataset.a, R=rec(), c=cOf(R,SIM.t); let i=ub(R.insC,R.n,c); while(i<R.n && R.insPC[i]!==a) i++; if (i<R.n) SIM.seek(tOf(R,R.insC[i])); };
  let lastLn=-2;
  SIM.on('time', ()=>{ const R=rec(), c=cOf(R,SIM.t);
    m.querySelector('#m4flow').innerHTML=flowSVG(R,c); m.querySelector('#m4deb').innerHTML=debSVG(R,c); m.querySelector('#m4t2').innerHTML=table2HTML(R,c);
    lutCanvas(m.querySelector('#m4lut'),R,c); m.querySelector('#m4ins2').innerHTML=insHTML(R,c);
    const p=R.running? pcAt(R,c):null, ln=p? FW[R.fw].pcLine.get(p.pc) : -1;
    if (ln!==lastLn){ lst.innerHTML=listingHTML(R,c); lastLn=ln; const el=lst.querySelector('.hl'); if (el) lst.scrollTop = el.offsetTop - lst.offsetTop - 160; } });
}
function memHTML(k){ const a=FW[k].asm.syms;
  return `<table class="kv small mono"><tr><th>$0000–$00BF</th><td>RAM: BUF $10–$14, CS3310 $15, KS1 $16, KS2 $17, STATE2 $18, DELTA $19, LEVEL $1A, FLAGS $1B (bit0 TALLY, bit2 BAT), ONESEC $1C, COUNTER $1D; stack grows down from $00BF</td></tr>
  <tr><th>$00C4–$00FF</th><td>bootstrap-style pseudo-vectors (3-byte JMPs): JTOC1 $DF → TIMEOUT ${hex(a.TIMEOUT,4)}, JTOC3 $D9 → JSCAN ${hex(a.JSCAN,4)}, JCOP $FA → RESET, JIRQ $EE → HALT ${hex(a.HALT,4)}</td></tr>
  <tr><th>$0100</th><td>RTS planted at run time, called every main-loop pass (JSR $100)</td></tr>
  <tr><th>$1000–$103F</th><td>registers (PORTA $00 … CONFIG $3F)</td></tr><tr><th>$B600</th><td>EEPROM (unused)</td></tr>
  <tr><th>$D000–$${(0xD000+FW[k].size-43).toString(16).toUpperCase()}</th><td>code + tables (DEBTAB ${hex(a.DEBTAB,4)}, TABLE2 ${hex(a.TABLE2,4)}, LUTAB2 ${hex(a.LUTAB2,4)})</td></tr>
  <tr><th>$FFD6–$FFFF</th><td>vectors: SCI…SWI → RAM jump table; ILLEGAL → RESET; COP → JCOP ($00FA, RAM); CLOCK MONITOR → RESET; RESET → $D000</td></tr></table>`; }

/* =====================================================================
   BLOCK DIAGRAM (from FM445.DWG "FUNCTIONAL" B 445-01-001 + the schematics)
   ===================================================================== */
const BLK = [
  ['in','Inputs',10,60,110,60,'TS1 1/2, 4/5 (rear, via P1) normalled through JACK 2/3 PJ339 long-frame (front)'],
  ['term','Bridge / match',140,60,110,60,'SW1 BRIDGE/MATCH, SW2 600/150: R9 600 Ω / R10 150 Ω 3.75 W; bridging R11/R12 470K'],
  ['pre','Preamp + range',270,60,120,60,'U1 OP492 with K1/K2 latching relays and U2–U4 74HC4053 switching GAIN / UNITY / ATTEN / PM6 (PORTB B0–B3)'],
  ['hp','75 Hz HP filter',410,60,110,60,'SW4, U9A/U9B 3-pole: C27–C29 0.068 µF, R61 56K, R62 82K, R63 36K'],
  ['cs','CS3310 attenuator',540,60,120,60,'U11 CS3310 stereo digital volume, 0.5 dB steps; /CS DATA CLK from PC2/PC0/PC1, /MUTE from PA6'],
  ['mode','Mode L&R / L+R & L−R',680,60,130,60,'SW3, U9C/U9D sum and difference (R67 30K1 on SA14-305, 18K on SA14-305A)'],
  ['drv','Meter drivers',830,60,110,60,'U10 OP492 + Q5–Q12 2N3904/2N3906; P5/P6 via R121/R125 1K8 + 22 µF to the meters'],
  ['vu','M1/M2 VU 1823',960,30,110,50,'Bach-Simpson 1823 “A” Wilbac, ANSI C16.5 ballistics; SA14-307 light bars (4 × HLMP-2450, LM317 current sources) when docked'],
  ['out','Outputs',960,95,110,50,'TS1 6–10 +4 dBu at 0 VU (R113/R114 30 Ω + 1000 µF), headset JACK 1 via R123/R124 300 Ω'],
  ['spk','SA14-311 speakers',960,160,110,50,'LM1877N-9 2 × 2 W, R15 10-072 level, SD22S speakers in the dock'],
  ['mcu','68HC711E9 U12',470,200,140,70,'4 MHz XT1 (E = 1 MHz), KS0003 firmware: OC3 4 ms scan, SPI to LCD, bit-bang to CS3310'],
  ['enc','Encoder PU1',290,190,110,45,'500EN-206P-C2 on SA14-304, A0/A1 with 39K pull-ups'],
  ['lcd','LCD MM5453',290,250,110,45,'SA14-304 U1 MM5453 + DS1 STA 3901-365-920, DATA PD3 / CLK PD4'],
  ['bat','Battery + charger',650,200,140,70,'4 × P-60AA NiCd; MAX713CP U13 + TIP29B/TIP30B (SA14-305) / SA14-324 (M445A); U16A BAT 4.375 V, U16B STOP 3.75 V'],
  ['pwr','Dock power',830,230,110,45,'J1 +24 V, F1 0.5 A, U18 LM317T → 5.16 V VCC, Q13/U14 switcher → VEE'],
];
function blockSVG(sel){
  const R=rec(), c=cOf(R,SIM.t), g=R.running? gainAt(R,c):null, ch=chain();
  const val = { in:`${ch.tL.toFixed(1)} dBu`, term: D.term? (D.z150?'150 Ω':'600 Ω') : 'bridge', pre: g&&g.fg!==null? fmtDb(g.fg) : '—', hp: D.hp?'in':'out', cs: g&&g.cs!==null? fmtDb(g.cs) : '—', mode: D.mode?'L+R / L−R':'L & R',
    drv: g&&isFinite(g.db)? fmtVU(g.db+ch.mL-VU0)+' (steady)':'—', vu: fmtVU(vuDb(needleAt('L',SIM.t))), out:'+4 dBu @0 VU', spk: D.docked&&D.power? 'on':'off', mcu: D.fw, enc:'pos '+(R.running?R.IN.encPos(c):0), lcd: (R.running&&lcdAt(R,c)? lcdAt(R,c).text.trim():'—'), bat: D.docked?'charging':R.IN.vb(c).toFixed(2)+' V', pwr: D.docked?'+24 V':'none' };
  let s=`<svg viewBox="0 0 1080 300" style="width:100%;font-size:12px"><defs><marker id="m4b" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--ink2)"/></marker></defs>`;
  const ln=(a,b,dash)=>{ const A=BLK.find(x=>x[0]===a), B=BLK.find(x=>x[0]===b); const x1=A[2]+A[4], y1=A[3]+A[5]/2, x2=B[2], y2=B[3]+B[5]/2; return `<path d="M${x1} ${y1} C${x1+15} ${y1} ${x2-15} ${y2} ${x2} ${y2}" stroke="var(--ink2)" fill="none" marker-end="url(#m4b)" ${dash?'stroke-dasharray="4 3"':''}/>`; };
  s+=ln('in','term')+ln('term','pre')+ln('pre','hp')+ln('hp','cs')+ln('cs','mode')+ln('mode','drv')+ln('drv','vu')+ln('drv','out')+ln('drv','spk')+ln('enc','mcu',1)+ln('pwr','bat',1);
  s+=`<path d="M540 200 L540 120" stroke="var(--accent2)" stroke-dasharray="4 3" marker-end="url(#m4b)"/><path d="M500 200 L330 120" stroke="var(--accent2)" stroke-dasharray="4 3" marker-end="url(#m4b)"/><path d="M470 250 L400 270" stroke="var(--accent2)" stroke-dasharray="4 3" marker-end="url(#m4b)"/><path d="M650 235 L610 235" stroke="var(--accent2)" stroke-dasharray="4 3" marker-end="url(#m4b)"/><path d="M560 200 L480 120" stroke="var(--accent2)" stroke-dasharray="4 3"/>`;
  s+=`<text x="345" y="160" fill="var(--accent2)" font-size="10">PORTB ranges, PA4/PA5 K1</text><text x="545" y="160" fill="var(--accent2)" font-size="10">PC0–2, PA6 /MUTE</text><text x="615" y="225" fill="var(--accent2)" font-size="10">PA2 BAT, /IRQ</text>`;
  BLK.forEach(([id,l,x,y,w,h])=>{ const on=sel===id; s+=`<g data-blk="${id}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}"/><text x="${x+w/2}" y="${y+18}" text-anchor="middle" fill="${on?'#fff':'var(--ink)'}" font-weight="600">${l}</text><text x="${x+w/2}" y="${y+h-10}" text-anchor="middle" font-family="var(--mono)" font-size="11" fill="${on?'#fff':'var(--accent)'}">${val[id]||''}</text></g>`; });
  return s+'</svg>';
}
function viewBlock(m){
  window[KEY]=false; let sel='cs';
  m.innerHTML = card('Block diagram — redrawn from FM445.DWG (B 445-01-001 “FUNCTIONAL”) with part numbers from the SA14-3xx schematics; live values at the playhead. Click a block.', '<div id="m4blk"></div><div id="m4bd" class="small" style="margin-top:6px"></div>')
    + card('Original functional drawing (FM445.DWG, converted with LibreDWG → SVG; block symbols drawn as SHAPEs are missing)', `<img src="${AS}m445-fm445.svg" style="width:100%;background:#fff;border-radius:6px" alt="FM445 functional">`);
  const draw=()=>{ m.querySelector('#m4blk').innerHTML=blockSVG(sel); m.querySelectorAll('[data-blk]').forEach(g=>g.onclick=()=>{ sel=g.dataset.blk; draw(); });
    const b=BLK.find(x=>x[0]===sel); m.querySelector('#m4bd').innerHTML=`<b>${b[1]}</b>: ${b[6]}`; };
  SIM.on('time', draw);
}

/* =====================================================================
   SCHEMATICS — redrawn pin map (live) + converted original sheets
   ===================================================================== */
const PINS = [ // [pin, name, net, side, src]
  [34,'PA0','A0 KNOB1 ← encoder','L','pa',0],[33,'PA1','A1 KNOB2 ← encoder','L','pa',1],[32,'PA2','BAT ← U16A','L','pa',2],[30,'PA4','SET → Q1/Q3 K1,K2','L','pa',4],[29,'PA5','CLR → Q2/Q4 K1,K2','L','pa',5],[28,'PA6','/MUTE → CS3310 pin 8','L','pa',6],
  [42,'PB0','PM6','L','pb',0],[41,'PB1','GAIN','L','pb',1],[40,'PB2','UNITY','L','pb',2],[39,'PB3','ATTEN','L','pb',3],
  [9,'PC0','DATA → CS3310 pin 3','R','pc',0],[10,'PC1','CLK → CS3310 pin 6','R','pc',1],[11,'PC2','/CS → CS3310 pin 2','R','pc',2],[13,'PC4','FCEN (R135 39K → FC)','R','pc',4],[14,'PC5','FC ← MAX713 FASTCHG','R','pin',5],
  [15,'PC6','LK3 “0 dB REF”','R','pin',6],[16,'PC7','LK2 “8 dB REF”','R','pin',7],[23,'PD3','MOSI → MM5453 DATA (P7-2)','R','spi',0],[24,'PD4','SCK → MM5453 CLK (P7-3)','R','spi',1],
  [19,'/IRQ','STOP ← U16B','R','irq',0],[17,'/RST','reset (C60)','R','',0],[8,'XTAL','XT1 4 MHz','R','',0]];
function pinmapSVG(){
  const R=rec(), c=cOf(R,SIM.t), ins=R.IN.pins(c);
  const val=(src,bit)=>{ if (!R.running) return null; if (src==='pa'){ const v= bit<4&&bit!==3? ins.pa : at(R.ev.pa,c,0); return (v>>bit)&1; } if (src==='pb') return (at(R.pb,c,0)>>bit)&1;
    if (src==='pc') return (at(R.ev.pc,c,0x0F)>>bit)&1; if (src==='pin') return (ins.pc>>bit)&1; if (src==='irq') return ins.irq; if (src==='spi'){ return R.ev.spi.some(([cc,d])=>cc<=c && cc+d.dur>c)? 2 : 1; } return null; };
  let s=`<svg viewBox="0 0 900 420" style="width:100%;font-size:11px"><rect x="330" y="20" width="240" height="380" rx="6" fill="var(--panel2)" stroke="var(--ink2)"/><text x="450" y="45" text-anchor="middle" font-weight="700" fill="var(--ink)">U12 MC68HC711E9 (52-PLCC)</text><text x="450" y="62" text-anchor="middle" font-size="9" fill="var(--ink2)">SA14-305 sheet 2 · redrawn, not the original CAD</text>`;
  let li=0, ri=0;
  PINS.forEach(([pin,name,net,side,src,bit])=>{ const y = side==='L'? 85 + 30*li++ : 85 + 14.5*ri++; const v=val(src,bit); const col = v===null? 'var(--ink2)' : v===2? 'var(--accent2)' : v? 'var(--accent)' : 'var(--bad)';
    if (side==='L') s+=`<line x1="250" y1="${y}" x2="330" y2="${y}" stroke="${col}" stroke-width="2"/><text x="335" y="${y+4}" fill="var(--ink)">${name}</text><text x="325" y="${y-3}" text-anchor="end" font-size="9" fill="var(--ink2)">${pin}</text><text x="245" y="${y+4}" text-anchor="end" fill="var(--ink)">${net}</text><circle cx="250" cy="${y}" r="3.5" fill="${col}"/>`;
    else s+=`<line x1="570" y1="${y}" x2="650" y2="${y}" stroke="${col}" stroke-width="2"/><text x="565" y="${y+4}" text-anchor="end" fill="var(--ink)">${name}</text><text x="575" y="${y-3}" font-size="9" fill="var(--ink2)">${pin}</text><text x="655" y="${y+4}" fill="var(--ink)">${net}</text><circle cx="650" cy="${y}" r="3.5" fill="${col}"/>`; });
  s+=`<text x="335" y="385" font-size="8.5" fill="var(--ink2)">MODA → VSS; MODB via LK1 ${'(bootstrap select, inferred)'}</text><text x="335" y="396" font-size="8.5" fill="var(--ink2)">P10 PROG / TX (PD1) / RX (PD0)</text>`;
  return s+`<text x="20" y="410" fill="var(--ink2)">green = high, red = low, blue = SPI shifting — values at the playhead from the emulator</text></svg>`;
}
function chainSVG(){
  const st=[['TS1 / JACK 2','in'],['SW1/SW2 R9 600 R10 150','term'],['U1A OP492 + K1','pre'],['U2–U4 74HC4053','pre'],['U5 OP492 sum','pre'],['U9A/B HPF','hp'],['SW4','hp'],['U11 CS3310','cs'],['SW3 / U9C,D','mode'],['U10 + Q5–Q12','drv'],['R121 1K8 → M1','vu']];
  let s=`<svg viewBox="0 0 980 140" style="width:100%;font-size:11px">`; st.forEach(([l],i)=>{ const x=10+i*88; s+=`<rect x="${x}" y="40" width="80" height="44" rx="5" fill="var(--panel2)" stroke="var(--line)"/><foreignObject x="${x+3}" y="44" width="74" height="40"><div xmlns="http://www.w3.org/1999/xhtml" style="font:11px/1.15 var(--sans);color:var(--ink);text-align:center">${l}</div></foreignObject>${i?`<line x1="${x-8}" y1="62" x2="${x}" y2="62" stroke="var(--ink2)"/>`:''}`; });
  s+=`<text x="10" y="20" fill="var(--ink2)">Left channel, B 14-305-02-001/1 (redrawn). Right channel mirrors it with U1C/D, U5C/D, U6–U8, K2.</text><text x="10" y="120" fill="var(--ink2)">Rails: VCC +5.16 V (U18 LM317T, R159 750 / R160 240) · VEE from Q13 2N6730 / U14 LM393 switcher · OP492 quad op-amps throughout.</text></svg>`;
  return s;
}
const SHEETS = [['pin','U12 pin map (redrawn, live)'],['chain','Signal chain (redrawn)'],['sch-sa14305-1','SA14-305 sheet 1: audio (B 14-305-02-001/1)'],['sch-sa14305-2','SA14-305 sheet 2: 68HC11, charger, supplies'],['sch-sa14304','SA14-304 LCD / encoder'],['sch-sa14311','SA14-311 speaker driver'],['sch-sa14307','SA14-307 light bar'],['sch-sa14324','SA14-324 M445A charging controller'],['sch-445S01','445S01 rack mount frame wiring'],['sch-445S02','445S02 meter frame wiring'],['mech-mm445-1','MM445-1 front panel drilling (445-03-001)']];
function viewSchematic(m){
  window[KEY]=false; let cur='pin';
  m.innerHTML = card('Schematic set', `<div class="small" style="display:flex;flex-wrap:wrap;gap:4px" id="m4ss">${SHEETS.map(([k,l])=>`<button data-s="${k}">${l}</button>`).join('')}</div><div id="m4sv" style="margin-top:8px"></div><div id="m4sn" class="small muted" style="margin-top:6px"></div>`);
  const draw=()=>{ m.querySelectorAll('#m4ss button').forEach(b=>b.classList.toggle('on',b.dataset.s===cur));
    const v=m.querySelector('#m4sv'), n=m.querySelector('#m4sn');
    if (cur==='pin'){ v.innerHTML=pinmapSVG(); n.innerHTML='Redrawn from the converted SA14-305 sheet 2 (SM143052.DWG) and the KS0003 port equates. Pin numbers are the 52-pin PLCC numbers printed on the sheet.'; }
    else if (cur==='chain'){ v.innerHTML=chainSVG(); n.innerHTML='Redrawn summary of sheet 1; component values as printed. The firmware only touches the blocks with port lines (range switches, K1/K2, CS3310, /MUTE).'; }
    else { v.innerHTML=`<div class="scroll" style="background:#fff;border-radius:6px"><img src="${AS}m445-${cur}.svg" style="width:100%;min-width:900px" alt="${cur}"></div>`; n.innerHTML='Original AutoCAD R12 drawing, converted to SVG by reading the DWG with LibreDWG (dwgread → JSON) and drawing its LINE/ARC/CIRCLE/TEXT/INSERT entities: a faithful conversion, not a redraw. Text fonts are approximated.'; } };
  m.querySelector('#m4ss').onclick=e=>{ const b=e.target.closest('[data-s]'); if (b){ cur=b.dataset.s; draw(); } };
  SIM.on('time', ()=>{ if (cur==='pin') draw(); }); draw();
}

/* =====================================================================
   TUTORIAL (from M445.WP, Issue #1, November 4 1996)
   ===================================================================== */
function finalLevel(){ const R=rec(); return R.running? at(R.var.LEVEL, cOf(R,DUR), null) : null; }
const STEPS = [
  {g:'Dock the meter and switch it on from cold', how:'Manual §Installation step 4: “The meter will operate when the power switch is engaged.” Press POWER (out → in) with the meter docked.', ok:()=>D.docked && D.power && D.boot==='powerup', hint:'If POWER is already in, press it twice: off, then on. The time line switches to “power-on at t = 0”.'},
  {g:'Watch the boot: the display appears about 1 s after power-on', how:'Play from 0 or drag the playhead past 1.25 s. On the Second tab you can see DELAY (1 s), the 6.5 ms K1CLR pulse, the first TXD and the 5 ms /MUTE calibration.', ok:()=>{ const R=rec(); return D.boot==='powerup' && SIM.t>1.22 && R.running && !!lcdAt(R,cOf(R,SIM.t)); }, hint:'Factory configuration (LK2 and LK3 both fitted) comes up at +4.'},
  {g:'Set the sensitivity to −10 dBu', how:'Turn SENSITIVITY (11): click the left half of the knob for one detent down, or use “fast −” for a quick spin. The LCD (10) shows the level that reads 0 on the meters.', ok:()=>finalLevel()===50, hint:()=>`The display ends at ${finalLevel()===null?'—':(finalLevel()-60)} at the end of the recording. Each click is 1 dB; a fast spin takes up to 5 dB per edge (DELTA acceleration).`},
  {g:'Feed −10 dBu and read 0 VU on both meters', how:'Set “Rear source” to −10 dBu, program “Steady tone”.', ok:()=>Math.abs(D.rear.lvl+10)<0.5 && D.prog==='tone' && Math.abs(needleAt('L',DUR-0.01)-1)<0.06, hint:'Needles must sit on 0 VU at the end of the second (sensitivity must be −10).'},
  {g:'Go below −35 dBu and hear K1 click', how:'Spin the knob down past −35. LUTAB2 switches to the GAIN range: PORTB B1 goes low and K1PULSE fires a 6.5 ms SET pulse on PA4.', ok:()=>{ const R=rec(); return R.k1p.some(p=>p.k==='SET' && p.c0>=cOf(R,0)); }, hint:'Look at the “K1/K2 SET” lane on the Second tab.'},
  {g:'Check stereo phase with sum and difference', how:'Press MODE (3). Set “R channel” to “in phase”: the left meter shows L+R (+6 dB), the right meter (L−R) drops off the scale. Inverted wiring would do the opposite.', ok:()=>D.mode && D.rear.rphase===0 && needleAt('R',DUR-0.01)<0.1, hint:'Use a steady tone so the needles settle.'},
  {g:'Reject hum with the 75 Hz high-pass filter', how:'Set the source frequency to 50 Hz and press HP FILT (4): a 3-pole filter at 75 Hz takes about 10.9 dB off 50 Hz.', ok:()=>D.hp && D.rear.f===50, hint:'Compare the needle with HP FILT out and in.'},
  {g:'Terminate a 600 Ω source', how:'Set “Source Z” to 600 Ω, press TERM (5) with Z (6) out (600 Ω). The reading falls 6 dB — this is the dBm-style reading the spec describes.', ok:()=>D.term && !D.z150 && D.rs===600, hint:'With Z in (150 Ω) the drop is 14 dB.'},
  {g:'Go portable and run the battery down to “lo bat”', how:'Press “Undock”, then move the playhead to ~0.2 s and press “Battery → 4.20 V here”. The firmware only polls BAT every 1.024 s (ONESEC), then sets FLAGS.BAT and TALLY and SETBUF lights the LO BAT segment.', ok:()=>{ const R=rec(); return !D.docked && R.lcd.some(([c,l])=>l.lobat && c>=cOf(R,0)); }, hint:'If nothing happens, put the battery event earlier — the next ONESEC poll must fall inside the window.'},
  {g:'Flatten it: the meter blanks and stops', how:'Press “→ 3.60 V here”. /IRQ goes low; HALT shows only LO BAT (BUF = $90), sets PORTB = $FF, CS3310 = 192 and executes STOP — “no digits will be visible in the display” (manual §10).', ok:()=>rec().ev.stop.length>0, hint:'KS0003 first waits 250 ms and re-checks BAT; with a real flat battery both comparators agree.'},
  {g:'Compare KS0002 and KS0003 on a docking glitch', how:'Dock, choose firmware KS0002, press “/IRQ glitch here”: KS0002 stops dead. Switch to KS0003: HALT waits 250 ms, sees BAT good and returns (IGNORE RTI).', ok:()=>D.events.some(e=>e.k==='glitch') && D.fw==='KS0003' && rec().ev.stop.length===0, hint:'Leave the glitch in the event list and flip the firmware selector.'},
  {g:'Change the power-up reference with LK2 / LK3', how:'Manual §Configuration: “To set a 0 dBu initial reference, remove the shorting clip across LK3, ensuring that the LK2 clip remains in place.” Do exactly that, then power-cycle (or use the running time line). What does the LCD show?', ok:()=>D.lk2 && !D.lk3, hint:'The emulator says +8, not 0: the manual has the two clips the wrong way round (see Findings).'},
];
function viewTutorial(m){
  window[KEY]=false;
  m.innerHTML = card('Operator tutorial — M445 Extended Range Meter/Monitor (manual M445.WP, Issue #1, 4 Nov 1996)', `<p class="small">Work through the goals; each ticks itself from the live model. The panel numbers (1)–(19) are the manual’s. Use the Simulator tab for the controls, keep this tab open in a second window if you like.</p><div id="m4steps"></div>`)
   + card('Panel (live) — the same controls as the Simulator tab', `<div id="m4tfp"></div>${controlsHTML()}`) + card('Last action', '<div id="m4ttr" class="log"></div>');
  bindControls(m);
  SIM.on('time', t=>{ let first=true; m.querySelector('#m4steps').innerHTML = '<ol>'+STEPS.map(s=>{ let ok=false; try{ ok=s.ok(); }catch(e){} const h=typeof s.hint==='function'? s.hint() : s.hint; const cur=!ok&&first; if(!ok) first=false;
      return `<li style="margin-bottom:6px${cur?';background:var(--chip);border-radius:6px;padding:4px':''}"><b>${ok?'✔':'☐'} ${s.g}</b><div class="small">${s.how}</div>${cur?`<div class="small muted">Hint: ${h}</div>`:''}</li>`; }).join('')+'</ol>';
    const fp=m.querySelector('#m4tfp'); fp.innerHTML=dockSVG(t); bindPanel(fp); m.querySelector('#m4ttr').innerHTML=traceHTML(); });
}

/* =====================================================================
   FINDINGS
   ===================================================================== */
function viewFindings(m){
  window[KEY]=false;
  const k2=FW.KS0002, k3=FW.KS0003, k1=FW.KS0001;
  const F = [
    ['CODE/TMP is the KS0002 build', 'CODE/TMP (S-record, 1996-09-26 13:43), KS0002.ASM', `Assembling KS0002.ASM here gives ${k2.size} bytes and differs from TMP in <b>${k2.tmpDiff}</b> bytes (KS0001: ${k1.tmpDiff}, KS0003: ${k3.tmpDiff}). TMP is therefore the KS0002 image, saved 2½ hours before KS0003.ASM. The README says the S19 outputs were deleted, but this one survives under a non-S19 name.`],
    ['The manual has LK2 and LK3 swapped', 'M445.WP “Configuration Selection”; KS0003 lines 232–240 (ML2); SA14-305 sheet 2', 'The schematic labels LK2 “8 dB REF” on PC7 and LK3 “0 dB REF” on PC6. The code picks LEVEL0 (0 dBu) when PC6 is low and PC7 high, i.e. LK3 fitted and LK2 removed. The manual says the opposite (“remove LK3 … LK2 remains” for 0 dBu). Following the manual gives +8. Both clips in, or both out, give +4.'],
    ['“PM6” is a 10 dB step', 'LUTAB2, PORTB B0', 'The comment says “0 +/- 6”, but the CS3310 bytes in LUTAB2 jump by 10 dB wherever PM6 turns on (−15 → −14: +0 dB to +9 dB; +15 → +16: 0 dB to +9 dB). Read back from the table: GAIN = UNITY + 25 dB, ATTEN = UNITY − 30 dB, PM6 = −10 dB.'],
    ['NMUTE doubles as the OC2 mask', 'KS0003 mute calibration after ML2 (BCLR TMSK1,X NMUTE · STAA TFLG1,X · BRCLR TFLG1,X NMUTE ML3)', 'The mute-calibration wait uses the PORTA bit name NMUTE ($40) as the timer mask. It works only because PA6 is the OC2 pin, so OC2I and OC2F are also $40. DELAY uses the right name (OC2).'],
    ['KS0003: HALT ignores /IRQ while BAT is good, from inside the interrupt', 'KS0003 HALT / IGNORE (lines 297–325) vs KS0002', 'The only change from KS0002. HALT runs DELAY (250 ms) with interrupts masked, so the 4 ms scan, the knob and the LCD freeze for a quarter-second on every /IRQ. Because /IRQ is level-sensitive (OPTION cleared), a STOP line that stays low while BAT stays high would re-enter HALT forever; the COP never fires because DELAY keeps servicing it. HALT’s DELAY also reuses COUNTER and OC2, so an /IRQ during the power-up DELAY cuts that delay short. Try the “/IRQ glitch” button with both versions.'],
    ['KS0001 → KS0002 only doubles the delays', 'KS0001/KS0002 lines 179 and 253', 'Power-up wait 500 ms → 1 s, and −5 V settle before the mute calibration 100 ms → 200 ms. No logic change. The VEE switcher (Q13/U14) needed longer to start.'],
    ['FC and FCEN are wired but never used', 'PORTC equates FC $20 / FCEN $10; SA14-305 sheet 2 R135', 'PC5 reads the MAX713 FASTCHG output and PC4 can pull that net through R135 39K, but the code never reads FC, and PC4 is left as an output at 0 by “LDD #$0F1F”. So FC is held low through 39 kΩ whenever FASTCHG is off. Charging is left entirely to the MAX713; the SA14-305A sheet moves the charger to the separate SA14-324 board (M445A).'],
    ['A RAM hook is called 32 000 times a second', 'KS0003 “LDAA #$39 / STAA $100 / MAIN1 JSR $100”', 'An RTS is planted at $0100 and called on every main-loop pass: 11 of the 31 cycles per pass do nothing. It is a patch point: a debugger or bootstrap loader could drop code there ' + inf('purpose not documented') + '. The 68HC711E9 has 512 bytes of RAM, so $0100 is valid.'],
    ['The reset entry starts with six erased bytes', 'KS0003 “STX $FFFF / STX $FFFF” at $D000', 'Both instructions assemble to $FF FF FF, the erased state of EPROM. They run as harmless stores to ROM (the emulator logs two ROM writes at every reset). This leaves room to burn a JMP over them in a one-time-programmable part later ' + inf('the usual reason for this trick') + '.'],
    ['Vectors go through RAM, mostly', 'VECTORS table ($FFD6), JCOP/JIRQ/JTOC1/JTOC3 set-up after ML1', 'All the interrupt vectors point at the bootstrap-mode jump table in RAM ($00C4–$00FF), which the code fills with JMPs at start-up. So the same image also runs under a bootstrap monitor (P10 PROG/TX/RX header, LK1 on MODB). Illegal opcode and clock monitor go straight to RESET, but COP goes through RAM ($00FA). That is fine after a COP reset, because RAM survives.'],
    ['The acceleration clamp only matters across both pins', 'SCAN INC_L/DEC_L (CMPB #6 · LDAB #5), JSCAN DELTA', 'DELTA is set to 7 after each step and drops by 1 every 4 ms. Each pin needs 4 equal samples (16 ms), so two edges on the same pin are at least 16 ms apart (step ≤ 3). The 5 dB maximum only appears when KNOB1 and KNOB2 edges are recognised 4–8 ms apart. The emulator gives about 4.7 dB per edge at 8 ms/edge and 1 dB per edge at 30 ms.'],
    ['Range switching glitches for a moment', 'MAIN3 (STAB PORTB,X) before MAIN4 (TXD)', 'MAIN3 switches the analog range on PORTB first; the new CS3310 byte arrives only at the end of TXD, about 0.66–0.75 ms later (measured by the emulator). At −35 ↔ −34 this leaves the gain 24–25 dB off for that time, and K1/K2 then take a 6.5 ms pulse plus their operate time. A VU needle cannot show it, but the headset can hear it.'],
    ['One relay command drives two relays; one byte drives both channels', 'K1PULSE; SA14-305 sheet 1 Q1–Q4; TXD/TXCS', 'K1SET/K1CLR fire Q1+Q3 / Q2+Q4, operating K1 (left) and K2 (right) together. TXD calls TXCS twice with the same CS3310 byte, so left and right always get identical attenuation: there is no balance trim.'],
    ['LCD and CS3310 are loaded in parallel', 'TXD / TXSPI / TXCS', 'Each LCD byte goes out on the hardware SPI (SPCR $5F: E/32, so 256 µs a byte) while TXCS bit-bangs the CS3310 byte on port C. TXCS is the slower of the two, so TXWAIT finds SPIF already set (see the bit-level scope). The first ‘1’ of BUF (the +128 in SETBUF) is the MM5453 start bit.'],
    ['Zero has no sign, but only by luck', 'SETBUF “CMPA #$3F”', 'SETBUF hides the sign whenever DIGIT1 is the “0” pattern. That is true only for LEVEL 60, and that table entry already has bit 7 clear (+).'],
    ['Battery thresholds', 'SA14-305 sheet 2 U16A/U16B, R161/R162, R164/R165, U17 LM385Z-2.5', `From the divider values: BAT trips at ${BAT_TH.toFixed(3)} V (1.09 V per cell) and STOP at ${STOP_TH.toFixed(3)} V (0.94 V per cell) on 4 × P-60AA ` + inf('the comparator node is assumed to be the battery') + '.'],
    ['Artwork 2026|59: the CorelDRAW silk could not replace the DWG art', SIM.src('#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive/MECHANIC/M445SILK.CDR','MECHANIC/M445SILK.CDR')+' (31 May 1999), '+SIM.src('#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive/MECHANIC/M445SLKR.CDR','M445SLKR.CDR')+', '+SIM.src('#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive/MECHANIC/445SILK.DWG','445SILK.DWG')+' (10 Sep 1998)', 'M445SILK.CDR is eight months newer than 445SILK.DWG and holds the same layout: window corners, the WBS logo, the SENSITIVITY scale, six rings along the bottom (five buttons and the MONITOR jack), the two input-jack rings and the corner crosshairs. Its 103 text objects are live CorelDRAW 5 text, though, and libcdr cannot read them: the panel labels come out empty and the rest as byte-swapped UTF-16 (“䑁啊呓…” = “ADJUST TO MEASURE 10.000 INCHE[S]”, “㑍㔴…” = “M445 EXTENDED RANGE METE[R]”). With no curve copy in the archive, the panel keeps the DWG art, which has every legend. M445SLKR.CDR (same date) has only a corner bracket, two large and one small ring and two LED marks, probably a partial rear or speaker-panel sheet '+inf('the sheet has no title')+'.'],
    ['Sheet labels and revisions', 'SM143051/2.DWG (SA14-305, 1995) vs S14305A1/2.DWG (SA14-305A, 1996); S14305A3.DWG', 'SA14-305A changes R67/R81 in the sum/difference stage from 30K1 to 18K and drops the MAX713 charger from sheet 2. The meter drivers are labelled “PPM-L/PPM-R” although the product uses VU meters (ANSI C16.5). S14305A3.DWG cannot be read by LibreDWG. MECHANIC/M445SILK.CDR (1999) is a later re-draw of the 445SILK.DWG artwork; libcdr loses its text, so the DWG silk is used for the panel.'],
    ['MAIN3 is a dead label; ASM11.BAT builds KS0003', 'KS0003 MAIN3; CODE/ASM11.BAT; CODE/CHKLIST.MS', 'MAIN3 is reached only by falling through from MAIN1. ASM11.BAT assembles ks0003.asm with as11mod (a modified AS11). CHKLIST.MS is a 54-byte binary that names only CONVERT.EXE and STOBIN.EXE, the converters that were deleted (probably a DOS checksum or check list ' + inf('format unknown') + ').'],
  ];
  m.innerHTML = card('Findings — what the M445 and its 68HC11 code are up to', `<table class="kv"><tr><th>Finding</th><th>Where</th><th>Detail</th></tr>${F.map(([a,b,c])=>`<tr><td><b>${a}</b></td><td class="mono small">${b}</td><td class="small">${c}</td></tr>`).join('')}</table>`)
   + card('How this model was built', `<ul class="small">
     <li>The firmware is <b>assembled in your browser</b> by a two-pass AS11-compatible assembler (rules from CODE/SYNTAX.TXT: forward references are extended, known values below $100 are direct, <span class="mono">*</span> is the instruction address). It then <b>runs on a 68HC711E9 instruction emulator</b> (Motorola cycle counts, TCNT/OC1–OC3/CFORC/OC1M, SPI, COP, ports, /IRQ, STOP). KS0002 assembles to TMP byte for byte, which checks the assembler.</li>
     <li>Panel: MECHANIC/MM445-1.DWG (11.750 × 3.468 in, textured black) with the MECHANIC/445SILK.DWG artwork aligned to the drill holes (assets/m445-front-silk.svg). Dock and speaker panels after FRPNL.DWG and 445S01.</li>
     <li>DWG files were read with LibreDWG <span class="mono">dwgread -O json</span> and redrawn entity by entity (LibreDWG’s own SVG and DXF output dropped every line of these R12 files).</li>
     <li>${inf()} items: one encoder edge per detent; the 19 dB fixed gain after the CS3310; the unity scaling of L+R / L−R; OP492 clip level; relay operate time 3 ms; COP enabled; MM5453 segment order; the comparator node.</li></ul>`);
}

/* =====================================================================
   REGISTER
   ===================================================================== */
window.__m445 = { D, rec, FW, A, needleAt, lcdAt, cOf };   // test hook
SIM.register({
  footnotes: [{"text": "M445SILK.CDR (31 May 1999) is eight months newer than 445SILK.DWG but its 103 live-text objects cannot be read by libcdr: the panel labels come out empty.", "src": "#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive/MECHANIC/M445SILK.CDR"}, {"text": "The readable CDR strings are byte-swapped UTF-16: “䑁啊呓…” decodes to “ADJUST TO MEASURE 10.000 INCHE[S]” and “㑍㔴…” to “M445 EXTENDED RANGE METE[R]”.", "src": "#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive/MECHANIC/M445SILK.CDR"}, {"text": "There is no curve copy of the M445 CorelDRAW silk, so the simulator keeps the 1998 DWG art, which has every legend.", "src": "#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive/MECHANIC/445SILK.DWG"}, {"text": "M445SLKR.CDR holds only a corner bracket, two large rings, one small ring and two LED marks, with no title.", "src": "#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive/MECHANIC/M445SLKR.CDR"}],
  
  id: 'm445',
  product: 'M445',
  name: 'M445 · Extended range meter/monitor, 68HC11 (' + SIM.year(1996) + ')',
  folder: '#M400 #SERIES - Meter Panels/XXX - M445 - #OBSOLETE #Archive',
  family: 'Obsolete products',
  year: 1996,
  depth: 'Full model',
  summary: 'A portable stereo VU meter that docks into a 19 in rack frame with speakers. It reads −60 to +30 dBu for 0 VU in 1 dB steps, set by a rotary encoder and shown on an LCD. Here the 68HC11 firmware (KS0003.ASM) is assembled and run instruction by instruction on a 68HC711E9 model, and drives the range relays, the CS3310 attenuator, the MM5453 LCD and the battery shutdown.',
  highlights: [
    'In-browser AS11 assembler: KS0002 rebuilds the leftover CODE/TMP S-record byte for byte',
    'Cycle-exact 68HC11 emulation: 4 ms OC3 scan, DEBTAB/TABLE2 encoder decoding, acceleration, COP, STOP',
    'Bit-level view of the shared TXD burst: SPI to the MM5453 while the CS3310 is bit-banged',
    'LUTAB2 decoded into the analog ranges: GAIN +25, ATTEN −30, “PM6” is really 10 dB',
    'Front panel to scale from MM445-1.DWG with the 445SILK artwork; dock, battery, LK2/LK3, KS0001–KS0003',
    'Finding: the manual’s LK2/LK3 instructions give +8 dBu, not 0 dBu',
  ],
  duration: DUR,
  stepUnits: [ {label:'4 ms scan (OC3)', period:()=>0.004}, {label:'1 ms', period:()=>0.001}, {label:'32 µs SPI bit', period:()=>32e-6}, {label:'1 µs E-cycle', period:()=>1e-6}, {label:'10 ms', period:()=>0.01} ],
  zooms: [[1.5,'1.5 s (whole)'],[0.1,'100 ms'],[0.02,'20 ms'],[0.004,'4 ms (one scan)'],[0.0015,'1.5 ms (one TXD)'],[0.0002,'200 µs (instructions)'],[0.00005,'50 µs']],
  defaultZoom: 0,
  init(){ window[KEY]=false; },
  tabs: [
    { id:'sim', label:'Simulator', render: viewSim },
    { id:'tutorial', label:'Tutorial', render: viewTutorial },
    { id:'second', label:'One second (slow motion)', render: viewSecond },
    { id:'block', label:'Block diagram', render: viewBlock },
    { id:'schematic', label:'Schematics', render: viewSchematic },
    { id:'software', label:'Software', render: viewSoftware },
    { id:'findings', label:'Findings', render: viewFindings },
  ],
});
})();
