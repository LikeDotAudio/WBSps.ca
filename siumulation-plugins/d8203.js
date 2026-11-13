/* =====================================================================
   D8203 — Analog to AES/EBU digital converter (Ward-Beck Systems, 1998|31)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, #MF8200 #SERIES/D8203 - #Master #MF82/…):
   - D8203 - #Engineering/D8203 - #V100 #SOFTWARE/8203V100.ASM (17 Aug 1998) — the PIC firmware.
       It is embedded below verbatim and RUN by a small PIC16C5x interpreter, so every LED, mute and
       calibration edge on the timeline comes from the real instructions. Also 8203V100.ERR, D8203.PJT,
       OLD/8203.ASM … 8203V1X8.ASM, 8203TEST.ASM (the eight intermediate builds).
   - D8203 - #PLD #SOFTWARE/d8203.rpt (MAX+plus II 9.6, EPM7064SLC44-10): pin list and the fitted
       equations for CAL, VAL, MCLK, SDATA, osc1/osc2, 128FS, the '48K' toggle and the ÷3 lpm_counter.
       …/ISS1/d8203.rpt: the first (48 kHz only) CPLD.
   - D8203 - #PCB #SOFTWARE/D8203-ISS5.net (P-CAD 2002 netlist, 2005|38), .bom, .pnp, .ECO; Gerbers
       D8203 - #GERBERS/D8203-ISS5.zip (2012|45) → assets/d8203-board-copper.png, d8203-board-silk.png
       (TOP and TSS layers rasterised at 150 dpi; LED, jumper and trimmer positions from the drill and
       copper flashes). #OBSOLETE/ISS4 BOM, ISS1/ISS2 OrCAD part lists (CS8412, CS8402A, CS5396, EPM7064,
       PIC16C54A, AMP03, LF353, EL2099) and the Tango D8203.PCB (1998 LED / monitor-jack heights).
   - D8203MAN.WPD + d8203.pdf (1998 manual: 25 s / 7 s calibration, monitor jack, TERM, REF, SAMPLE and
       level jumpers), D8203MAN-1.wpd (2009|42 manual: 16 s / 2 s, H1, H2, H4), SLS8303.WPD.
   - 8200 Series Rear Module options…/D8203 - rear module options.cdr + .pdf (2012|45) → assets/d8203-rear-*.svg
       (BNC2, BNC4, TB8205P, TB8205P/75); D8203tr4.pdf (ST8200 / ST8201A pin order).
   - D8203 - #PNP #2016/D8203-ISS5-T.prg vs D8203-110R-ISS5-T.prg (75 Ω vs 110 Ω build).
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const ASSET = 'siumulation-plugins/assets/';
const Y = y=>SIM.year(y);

/* ---------------- constants ---------------- */
// 8203V100.ASM: ";******* DELAY2 = 1 will give 1.2 msec delay". One DELAY2 step is 1023 instruction cycles
// (254×4 + 3 inner, +4 outer), so Tcy = 1.2 ms / 1023 → Fosc ≈ 3.41 MHz (inferred; ISS5 clocks the PIC from an
// RC pair R25 4K7 / C58 27 pF on OSC1, which runs in that range).
const TCY = 1.2e-3/1023;
const DRT = 0.018;            // PIC16C5x device-reset timer, 18 ms nominal (datasheet) — inferred
const LOCK_T = 0.020;         // CS8412 / CS8427 PLL acquire time — inferred
const HORIZON = 90;           // seconds of the card's life we compute
const SECS = 90;
const PASS_T = (48*1023+2+40)*TCY;   // one main-loop pass ≈ delvis1 + ~40 cycles of tests
const LV = {'24':24,'18':18,'16':16};
const FS_INT = {'48':48000,'44.1':44100,'32':32000};

/* ---------------- the real firmware (verbatim) ---------------- */
const ASM_SRC = String.raw`	ERRORLEVEL -302
;********************************************************
;      D8203V1.xx AES\EBU Analog to Digital Converter
;	NOTE : This program has a two calibration setup-
;********************************************************
	LIST	P=16C5X,r=dec
	#INCLUDE "P16C5X.INC"

E1		equ	0x00	;---------------
D0		equ	0x01	;	P
D1		equ	0x02	;	O
D2		equ	0x03	;	R
EXT_L		equ	0x04	;	T
INT_R		equ	0x05	;
CAL		equ	0x06	;	B
E0		equ	0x07	;---------------
SEL		equ	0x00	;---------------
PDN		equ	0x02	;	PORT A
E2		equ	0x03	;---------------
int_set		equ	0x00	;---------------
ext_set		equ	0x01	;	FLAG1
init_set	equ	0x02	;---------------
bounce_num	equ	0x0A

;********************************************************
	ORG 07H
DELAY1		RES 	1
DELAY2		RES	1
delay3		res	1
bounce_count	res	1
flag1		res	1
;*************	INTERRUPTS  *************************
	ORG 4H
	RETFIE

;***************  RESET  ****************************
	ORG 	0X1FF
	GOTO 	RESET
	ORG 	0
	GOTO 	RESET
	ORG	0X10
RESET   GOTO 	INIT

;************** INIT  ******************************
INIT	MOVLW 	B'10000001'
	TRIS 	PORTB
	MOVLW 	B'00001000'
	TRIS 	PORTA
	movlw	0x30		;Set Initial Delay
	movwf	delay3
	clrf	flag1
	CLRF	PORTA
	bsf	PORTA,PDN
init2	btfss	flag1,init_set
	CLRF 	PORTB
	bcf	PORTA,SEL
	bcf	PORTB,D1
	bcf	PORTB,D2
	bsf 	PORTB,CAL	; Turn on CAL light
	call	delvis1
	call	delvis1
	call	delvis1
	call	delvis1
	call	delvis1
	call	delvis1
	call	delvis1
	call	delvis1
	call	delvis1
	call	delvis1
	bcf	PORTB,EXT_L
	bcf	PORTB,INT_R
	bcf	PORTA,PDN
	bsf	PORTA,SEL
	btfss	PORTB,E0
	call	locked
	btfss	PORTB,E1
	call	locked
	btfss	PORTA,E2
	call	locked
	btfss	PORTB,EXT_L
	bsf	PORTB,INT_R
	btfss	PORTB,EXT_L
	bcf	PORTB,D0
	call	DELVIS3
	bsf	PORTB,D2
	call	DELVIS2
	bcf	PORTB,D2
	bcf	PORTB,CAL
	bcf	PORTA,SEL
	bsf	PORTB,D1
	movlw	0x1C
	movwf	delay3
	btfsc	flag1,init_set
	goto	main
	bsf	flag1,init_set
	GOTO 	init2

locked	bcf	PORTB,INT_R
	bsf	PORTB,D0
	bsf	PORTB,EXT_L
	return
;************** INIT  ******************************
RE_INIT
	MOVLW 	B'10000001'
	TRIS 	PORTB
	MOVLW 	B'00001000'
	TRIS 	PORTA
	CLRWDT
	movlw	0x10
	movwf	delay3
	return

;************** DELAY ROUTINES *********************

;******* DELAY2 = 1 will give 1.2 msec delay *******
DELVIS1		MOVLW 	0X30
		MOVWF 	DELAY2
		CALL 	DELAY
		RETLW 	0

;********* ??? SEC Delay ***********
DELVIS2		movlw	0x04		; 0x08 gives good consistent levels
		movwf	delay3
big_lp		bcf	PORTA,SEL
		MOVLW 	0X70
		MOVWF 	DELAY2
		CALL 	DELAY
		bsf	PORTA,SEL
		btfss	PORTB,E0
		goto	check_lock
		btfss	PORTB,E1
		goto	check_lock
		btfss	PORTA,E2
		goto	check_lock
		btfss	PORTB,INT_R
		goto	check_reset
		goto	cont_delvis
check_lock	btfsc	PORTB,INT_R
		goto	check_reset
cont_delvis	decfsz	delay3,1
		goto	big_lp
		RETLW 	0

;********* 3 SEC Delay ***********
DELVIS3		bcf	PORTA,SEL
		MOVLW 	0XFF
		MOVWF 	DELAY2
		CALL 	DELAY
		bsf	PORTA,SEL
		btfss	PORTB,E0
		goto	check_lock1
		btfss	PORTB,E1
		goto	check_lock1
		btfss	PORTA,E2
		goto	check_lock1
		btfss	PORTB,INT_R
		goto	check_reset
		goto	cont_delvis1
check_lock1	btfsc	PORTB,INT_R
		goto	check_reset
cont_delvis1	decfsz	delay3,1
		goto	DELVIS3
		RETLW 	0
check_reset	btfss	flag1,init_set
		goto	reset
		movlw	0x10
		movwf	delay3
		goto	init2
;**************  MAIN  ******************************
;READ ERROR FLAGS CHECK FOR LOCK
;****************************************************
main		CALL	RE_INIT
		BCF 	PORTA,SEL
		call	delvis1
		BSF 	PORTA,SEL
		BTFSS 	PORTB,E0
		goto	lock_debounce
		BTFSS 	PORTB,E1
		goto	lock_debounce
		BTFSS 	PORTA,E2
		goto	lock_debounce
		btfss	flag1,int_set
		goto	reset_int
		decfsz	bounce_count,1
		goto	main
		btfsc	PORTB,EXT_L
		goto	init2
		bsf	PORTB,INT_R
		bcf	PORTB,EXT_L
		bcf	PORTB,D0
reset_int	bsf	flag1,int_set
		bcf	flag1,ext_set
		goto	reset_bounce
lock_debounce	btfss	flag1,ext_set
		goto	reset_ext
		decfsz	bounce_count,1
		goto	main
		btfsc	PORTB,INT_R
		goto	init2
		bcf	PORTB,INT_R
		bsf	PORTB,EXT_L
		bsf	PORTB,D0
reset_ext	bsf	flag1,ext_set
		bcf	flag1,int_set
reset_bounce	movlw	bounce_num
		movwf	bounce_count
		goto	main
;****************  DELAY ROUTINE *********************
; INIT DELAY 2 BEFORE ENTERING
; DELAY=:: DELAY1(255*1/1.53MHZ*2 * DELAY2)
; DELAY2 = 15 FOR RELAY PULSE(5mS)
; DELAY2 = 255 4 TIMES FOR VISIBLE DELAY
;*****************************************************
DELAY	MOVLW 0XFF
DEL1	MOVWF DELAY1
DEC1	CLRWDT
	DECFSZ DELAY1,F
	GOTO DEC1
	DECFSZ DELAY2,F
	GOTO DEL1
	RETURN

	END`;
const SRC_LINES = ASM_SRC.split('\n');

/* ---------------- a two-pass MPASM subset, case-insensitive like the 1998 build ---------------- */
const MNEM = new Set(['MOVLW','MOVWF','TRIS','CLRF','BSF','BCF','BTFSS','BTFSC','CALL','GOTO','RETLW','RETURN','DECFSZ','CLRWDT','NOP']);
const DIRECTIVE = new Set(['ERRORLEVEL','LIST','#INCLUDE','EQU','ORG','RES','END']);
function assemble(src){
  const sym = {INDF:0,TMR0:1,PCL:2,STATUS:3,FSR:4,PORTA:5,PORTB:6,W:0,F:1};
  const warn = [], ins = [], labelAt = {};
  const num = t=>{ t=String(t).trim(); let m;
    if ((m=t.match(/^0x([0-9a-f]+)$/i))) return parseInt(m[1],16);
    if ((m=t.match(/^([0-9a-f]+)h$/i))) return parseInt(m[1],16);
    if ((m=t.match(/^b'([01]+)'$/i))) return parseInt(m[1],2);
    if (/^\d+$/.test(t)) return parseInt(t,10);
    const v = sym[t.toUpperCase()]; if (v===undefined) throw new Error('undefined symbol '+t); return v; };
  let pc = 0;
  src.split('\n').forEach((raw,i)=>{
    const s = raw.replace(/;.*$/,''); if (!s.trim()) return;
    const toks = s.trim().split(/[\s,]+/); let label = null;
    if (!/^\s/.test(s)) label = toks.shift();
    else if (!MNEM.has(toks[0].toUpperCase()) && !DIRECTIVE.has(toks[0].toUpperCase())){ label = toks.shift(); warn.push(`Warning[207] line ${i+1} : Found label after column 1. (${label})`); }
    const op = toks[0] ? toks[0].toUpperCase() : null;
    if (op==='EQU'){ sym[label.toUpperCase()] = num(toks[1]); return; }
    if (label){ sym[label.toUpperCase()] = pc; labelAt[pc] = labelAt[pc] || label; }
    if (!op) return;
    if (op==='ORG'){ pc = num(toks[1]); return; }
    if (op==='RES'){ pc += num(toks[1]); return; }
    if (DIRECTIVE.has(op)) return;
    ins.push({addr:pc, op, args:toks.slice(1), line:i}); pc++;
  });
  const code = {};
  ins.forEach(n=>{ const a=n.args;
    n.f = (a[0]!==undefined && !['CALL','GOTO','MOVLW','RETLW'].includes(n.op)) ? num(a[0]) : null;
    n.k = (['CALL','GOTO','MOVLW','RETLW'].includes(n.op)) ? num(a[0]) : null;
    n.b = (['BSF','BCF','BTFSS','BTFSC'].includes(n.op)) ? num(a[1]) : null;
    n.d = (n.op==='DECFSZ') ? num(a[1]) : null;
    code[n.addr] = n; });
  // routine = nearest label at or before each address (for the timeline / highlight)
  const addrs = Object.keys(code).map(Number).sort((x,y)=>x-y); let cur='?'; const routine={};
  addrs.forEach(a=>{ if (labelAt[a]) cur = labelAt[a]; routine[a]=cur; });
  return {sym, code, warn, routine, labelAt};
}
const PROG = assemble(ASM_SRC);
const S = PROG.sym;

/* ---------------- device state + time-stamped history ---------------- */
const CFG0 = { plugged:false, frameRef:false, h1:'ext', refFs:48000, err:'000', fsJ:'48', inDbu:4, inHz:1000, srcOn:true, lvl:'24', trimL:0, trimR:0, term:'75' };
const D = {
  build:'1998',            // '1998' = ISS1/2 hardware + 8203V100.ASM (runs); '2005' = ISS4/5 board (CS8427/CS5394/PLL1700), firmware not in archive
  sec:0,                   // which second of the card's life the 1-s timeline shows
  module:'BNC2',           // rear module
  hist:[{t:0, c:Object.assign({},CFG0)}],
  log:[], lastTrace:[],
};
function absNow(){ return D.sec + SIM.t; }
function cfgAt(t){ let c=D.hist[0].c; for (const h of D.hist){ if (h.t<=t) c=h.c; else break; } return c; }
function setCfg(changes){ const t=absNow(); D.hist = D.hist.filter((h,i)=>h.t<t || i===0); const prev = cfgAt(t); D.hist.push({t, c:Object.assign({},prev,changes)}); TL=null; }
function cfg(){ return cfgAt(absNow()); }

/* ---------------- reference input → receiver lock and error pins ---------------- */
function presentAt(t){ const c=cfgAt(t); return c.h1==='ext' ? c.plugged : c.frameRef; }
function lockedAt(t){ // present continuously for LOCK_T
  if (!presentAt(t)) return false;
  let since = 0; for (const h of D.hist){ if (h.t>t) break; const p = h.c.h1==='ext'? h.c.plugged : h.c.frameRef; if (!p) since = Infinity; else if (since===Infinity) since = h.t; }
  if (since===Infinity) return false; return t - since >= LOCK_T;
}
// CS8412 multiplexed pins: SEL=1 → E2 E1 E0 error code (111 = no lock); SEL=0 → channel-status bits (modelled as 0 1 0)
function ePins(t, sel){
  if (!sel) return {e0:0,e1:1,e2:0};
  const code = lockedAt(t) ? cfgAt(t).err : '111';
  return {e2:+code[0], e1:+code[1], e0:+code[2]};
}

/* ---------------- PIC16C5x interpreter running 8203V100.ASM ---------------- */
let TL = null;
function runFirmware(){
  const ent = {t:[], pc:[], ph:[], n:[]}; const sig = [];
  const f = new Uint8Array(32); let W=0, pc=0x1FF, st=[0,0], t=DRT;
  let la=0, lb=0; let phase=1, inMain=false, guard=0;
  const routineOf = a=>PROG.routine[a];
  const pushSig = ()=>{ sig.push({t, a:la, b:lb, ph:phase}); };
  pushSig();
  const rd = (r)=>{
    if (r===5){ const e=ePins(t, la&1); return (la & ~0x08) | (e.e2<<3); }
    if (r===6){ const e=ePins(t, la&1); return (lb & ~0x81) | (e.e1) | (e.e0<<7); }
    return f[r]; };
  const wr = (r,v)=>{ v&=255; if (r===5){ if (v!==la){ la=v; pushSig(); } } else if (r===6){ if (v!==lb){ lb=v; pushSig(); } } else f[r]=v; };
  const DELAY = S.DELAY;
  while (t < HORIZON && guard++ < 4e6){
    if (pc===DELAY){ // fast-forward the 255 × DELAY2 busy loop (no port access inside, only CLRWDT)
      const n = f[S.DELAY2]||256; ent.t.push(t); ent.pc.push(pc); ent.ph.push(phase); ent.n.push(n);
      t += (1023*n+2)*TCY; W=0xFF; f[S.DELAY1]=0; f[S.DELAY2]=0; pc=st[0]; st[0]=st[1]; continue; }
    const I = PROG.code[pc]; if (!I){ pc=(pc+1)&0x1FF; t+=TCY; continue; }
    const r = routineOf(pc);
    if (r==='main' || r==='reset_int' || r==='lock_debounce' || r==='reset_ext' || r==='reset_bounce' || r==='RE_INIT'){ if (!inMain || phase!==3){ inMain=true; phase=3; pushSig(); } }
    else if (r==='init2' && pc===S.INIT2 && inMain){ phase=4; pushSig(); }
    else if (r==='INIT' && pc===S.INIT){ phase=1; inMain=false; pushSig(); }
    else if (pc===S.INIT2 && !inMain && (f[S.FLAG1]&4)){ phase=2; pushSig(); }
    ent.t.push(t); ent.pc.push(pc); ent.ph.push(phase); ent.n.push(-1);
    let cyc=1, next=pc+1;
    switch(I.op){
      case 'MOVLW': W=I.k; break;
      case 'MOVWF': wr(I.f,W); break;
      case 'TRIS': break;
      case 'CLRF': wr(I.f,0); break;
      case 'BSF': wr(I.f, (I.f===5?la:I.f===6?lb:f[I.f]) | (1<<I.b)); break;
      case 'BCF': wr(I.f, (I.f===5?la:I.f===6?lb:f[I.f]) & ~(1<<I.b)); break;
      case 'BTFSS': if ((rd(I.f)>>I.b)&1){ next=pc+2; cyc=2; } break;
      case 'BTFSC': if (!((rd(I.f)>>I.b)&1)){ next=pc+2; cyc=2; } break;
      case 'DECFSZ': { const v=(rd(I.f)-1)&255; if (I.d) wr(I.f,v); else W=v; if (!v){ next=pc+2; cyc=2; } break; }
      case 'CALL': st[1]=st[0]; st[0]=pc+1; next=I.k; cyc=2; break;
      case 'GOTO': next=I.k; cyc=2; break;
      case 'RETLW': W=I.k; next=st[0]; st[0]=st[1]; cyc=2; break;
      case 'RETURN': W=0; next=st[0]; st[0]=st[1]; cyc=2; break;
      default: break; // CLRWDT, NOP
    }
    pc=next&0x1FF; t+=cyc*TCY;
  }
  return {ent, sig, kind:'fw'};
}
// ISS4/5 build: the PIC on that board talks SPI to a CS8427 (netlist) and the code is not in the archive.
// Behaviour from the 2009|42 manual: 16 s calibration at power-up, 2 s after a reference change (inferred mechanism).
function runBehaviour(){
  const sig=[]; const dt=0.005; let t=DRT; let calUntil=DRT+16, mode=null, cand=null, candSince=0, phase=1;
  const P = (cal,intL,extL,d0,d1,d2,ph)=>{ const b=(cal<<6)|(intL<<5)|(extL<<4)|(d2<<3)|(d1<<2)|(d0<<1); const last=sig[sig.length-1]; if (!last || last.b!==b || last.ph!==ph) sig.push({t, a:0, b, ph}); };
  sig.push({t:0,a:0,b:0,ph:0});
  while (t<HORIZON){
    const L = lockedAt(t);
    if (mode===null) mode = L;
    if (L!==mode){ if (cand!==L){ cand=L; candSince=t; } if (t-candSince>=0.1){ mode=L; cand=null; if (t>=calUntil){ calUntil=t+2; phase=4; } } }
    else cand=null;
    const cal = t<calUntil; if (!cal && phase!==3) phase=3;
    P(cal?1:0, mode?0:1, mode?1:0, mode?1:0, cal?0:1, cal?1:0, cal?(phase===4?4:1):3);
    t+=dt;
  }
  return {ent:null, sig, kind:'beh'};
}
function timeline(){ if (!TL){ TL = D.build==='1998' ? runFirmware() : runBehaviour(); } return TL; }
function sigAt(t){ const s=timeline().sig; let lo=0, hi=s.length-1; if (t<s[0].t) return {t:0,a:0,b:0,ph:0}; while(lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function entAt(t){ const e=timeline().ent; if (!e || !e.t.length || t<e.t[0]) return -1; let lo=0, hi=e.t.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (e.t[m]<=t) lo=m; else hi=m-1; } return lo; }
const bit = (v,b)=>(v>>b)&1;
function pins(t){ const s=sigAt(t); return { cal:bit(s.b,6), intL:bit(s.b,5), extL:bit(s.b,4), d2:bit(s.b,3), d1:bit(s.b,2), d0:bit(s.b,1), sel:bit(s.a,0), pdn:bit(s.a,2), ph:s.ph, on:t>=DRT }; }
const PH = ['reset (DRT)','calibration pass 1','calibration pass 2','main: lock watch','re-calibration'];

/* first time the CAL LED goes out after power-up */
function calEnd(){ const s=timeline().sig; for (const x of s){ if (x.ph===3) return x.t; } return null; }

/* ---------------- clocks and audio ---------------- */
function clockAt(t){
  const c=cfgAt(t), p=pins(t);
  if (!p.on) return {fs:0, src:'none', txt:'no power'};
  if (p.d0){ // MCLK = EXTREF (CS8412 recovered 256 fs) when D0 = 1
    if (lockedAt(t)) return {fs:c.refFs, src:'ext', txt:`EXTREF: recovered from the reference, ${c.refFs/1000} kHz`};
    return {fs:c.refFs, src:'vco', txt:'EXTREF selected but the receiver has lost lock: free-running VCO ('+inf+')'}; }
  if (D.build==='1998'){
    if (c.fsJ==='none') return {fs:0, src:'none', txt:'SR0 = SR1 = 0: the CPLD MCLK term is never true → no clock'};
    const osc = c.fsJ==='44.1'? '33M (33.8688 MHz) ÷ 3' : c.fsJ==='32' ? '25M576 (24.576 MHz) ÷ 3' : '25M576 ÷ 2 ("48K" toggle)';
    return {fs:FS_INT[c.fsJ], src:'int', txt:`internal: ${osc} → MCLK ${(256*FS_INT[c.fsJ]/1e6).toFixed(4)} MHz`};
  }
  return {fs:FS_INT[c.fsJ==='none'?'48':c.fsJ], src:'int', txt:`internal: PLL1700 from 27 MHz X1 → ${FS_INT[c.fsJ==='none'?'48':c.fsJ]/1000} kHz (H2)`};
}
function calLevel(c){ return D.build==='1998' ? LV[c.lvl] : 24; }
function chanDbfs(t, ch){ const c=cfgAt(t); if (!c.srcOn) return -Infinity; return c.inDbu - calLevel(c) + (ch? c.trimR : c.trimL); }
function outSample(t, ch){
  const p=pins(t), k=clockAt(t); if (!p.on || !k.fs) return {v:0, muted:true, val:p.d2};
  const muted = !p.d1; const db = chanDbfs(t,ch);
  const c=cfgAt(t); const n=Math.floor(t*k.fs); if (!isFinite(db)) return {v:0, muted, val:p.d2, n};
  let v = Math.pow(10,db/20)*Math.SQRT2*Math.sin(2*Math.PI*c.inHz*n/k.fs + (ch?Math.PI/2:0));
  const clip = Math.abs(v)>1; v=Math.max(-1,Math.min(1,v));
  return {v: muted?0:v, raw:v, muted, clip, val:p.d2, n};
}
function ledsAt(t){ const p=pins(t); return {ext:p.on&&p.extL, int:p.on&&p.intL, cal:p.on&&p.cal}; }

/* ---------------- user actions (what changes, and the code path that reacts) ---------------- */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s); const t=absNow();
  fn(tr);
  D.log.unshift({t, name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function fwNote(tr){
  if (D.build!=='1998'){ tr(`ISS5 board: the PIC (U10) would read the CS8427 over SPI (SCK RA2, SDO RA3, SDI RA1, CS2 RA0) and see RERR on RB2. That firmware is not in the archive, so the reaction below follows the 2009|42 manual (${inf}).`); return; }
  const t=absNow(), p=pins(t);
  if (p.ph===1 || p.ph===2 || p.ph===4){
    tr(`The PIC is in ${PH[p.ph]}. DELVIS3 checks the CS8412 once per 255-step DELAY (≈0.31 s): bsf PORTA,SEL → btfss PORTB,E0 / E1 / btfss PORTA,E2.`);
    tr(p.ph===1 ? 'If the lock state no longer matches INT_R, check_reset → btfss flag1,init_set → goto reset: the whole 25 s power-up calibration starts again.' : 'If the lock state no longer matches INT_R, check_reset → delay3 = 0x10 → goto init2: pass 2 restarts (≈6 s).');
  } else if (p.ph===3){
    tr('main runs every ≈57.6 ms: CALL RE_INIT, bcf SEL, call delvis1 (48 DELAY steps), bsf SEL, read E0/E1/E2.');
    tr('A change has to persist for bounce_num = 10 passes (decfsz bounce_count) before the code acts: ≈0.6 s.');
    tr('Then btfsc PORTB,EXT_L / btfsc PORTB,INT_R → goto init2: mute (bcf D1), CAL LED on, 10× delvis1, new LED, DELVIS3 with delay3 = 0x10, CAL pulse on D2, unmute. ≈6–7 s in all (manual: "approximately 7 seconds").');
  } else tr('The PIC is still in its power-on reset.');
}
const A = {
  plug(on){ act(on?'Plug in the AES reference (REF INPUT)':'Unplug the AES reference', tr=>{
    setCfg({plugged:on});
    tr(on? `The reference reaches T1 → ${D.build==='1998'?'CS8412':'75176 receiver U7 → CS8427 U3'}; its PLL locks after ≈${LOCK_T*1000} ms (${inf}).` : 'The receiver loses lock at once.');
    if (cfg().h1!=='ext') tr(`But H1 / REF is set to ${D.build==='1998'?'LCL':'FRAME'}: the card listens to the frame reference bus (P1 pins C/3), not REF INPUT. Nothing changes.`);
    else tr(on? 'CS8412 E2 E1 E0 go from 111 (no lock) to '+cfg().err+' while SEL is high.' : 'CS8412 E2 E1 E0 read 111 (no lock).');
    fwNote(tr); }); },
  frameRef(on){ act(on?'Frame reference present on the MF82 motherboard':'Frame reference removed', tr=>{ setCfg({frameRef:on});
    tr('The MF82 motherboard carries an AES reference from the REF IN housing next to the power supply (2009 manual) or from a D8206 card through a D8203 with OUT set (1998 manual).');
    if (cfg().h1==='ext') tr('H1 is on EXT, so the card ignores it.'); fwNote(tr); }); },
  h1(v){ act('Reference jumper → '+(v==='ext'?'EXT':(D.build==='1998'?'LCL':'FRAME')), tr=>{ setCfg({h1:v});
    tr(D.build==='1998' ? `REF jumper (Fig 1.1): ${v==='ext'?'EXT':'LCL'} connects T1 to ${v==='ext'?'the rear REF INPUT':'the frame reference bus'}.` : `H1 ${v==='ext'?'3-5, 4-6 (ExtRef)':'1-3, 2-4 (FrameRef)'}: T1 (via C16 IN+ / C1−) now hears ${v==='ext'?'P1 A/1 = REF IN on the rear module':'P1 C/3 = the frame reference bus'} (D8203-ISS5.net).`);
    fwNote(tr); }); },
  refFs(v){ act('Reference sample rate → '+v/1000+' kHz', tr=>{ setCfg({refFs:v}); tr('When locked, MCLK comes from the reference, so the output follows its rate (spec: 30–50 kHz).'); tr('The firmware does not notice a rate change: E2..E0 stay "locked", so there is no re-calibration.'); }); },
  err(v){ act('Reference error code → '+v, tr=>{ setCfg({err:v});
    const n={'000':'no error','001':'validity bit high','010':'confidence flag','011':'slipped sample','100':'CRC error','101':'parity error','110':'bi-phase coding error'}[v]||v;
    tr(`CS8412 E2 E1 E0 = ${v} (${n}) while locked.`);
    if (D.build==='1998') tr('8203V100.ASM only asks "are all three bits 1?" (btfss … three times). Any code other than 111 counts as LOCKED: EXT LED stays on and D0 keeps MCLK on EXTREF.');
    else tr(`ISS5: RERR (CS8427 pin 11) goes to RB2; what the missing firmware did with it is unknown (${inf}).`); }); },
  fsJ(v){ act('Sample-rate jumper → '+(v==='none'?'none':v+' kHz'), tr=>{ setCfg({fsJ:v});
    if (D.build==='1998'){ tr(`SAMPLE jumpers (Fig 1.2) set SR0/SR1 on the EPM7064: ${v==='48'?'SR0=1 SR1=1':v==='44.1'?'SR0=1 SR1=0':v==='32'?'SR0=0 SR1=1':'SR0=0 SR1=0'} (${inf}: the jumper-to-pin wiring is read off the equations).`);
      tr('MCLK = !D0 & SR0 & SR1 & 48K  #  !D0 & dffs1 & SR0 & !SR1  #  !D0 & dffs1 & !SR0 & SR1  #  D0 & EXTREF (d8203.rpt). osc1/osc2 switch the unused oscillator off.');
      tr('The PIC never sees these jumpers: the rate changes at once, with no mute and no re-calibration.'); }
    else { tr(`H2 ${v==='32'?'1-2 (32 kHz)':v==='44.1'?'2-3 (44.1 kHz)':'open (48 kHz)'} pulls FS1/FS0 of the PLL1700 (U4) high through +5 V (R17/R18 4K7 pull-downs). U4 makes the 256 fs clock (pin 14) for the CS8427 OMCK.`); }
    tr('Takes effect only while the card runs on its internal clock (yellow INT REF).'); }); },
  term(v){ act('Reference termination → '+v, tr=>{ setCfg({term:v}); tr(D.build==='1998' ? `TERM jumper (Fig 1.1): ${v} Ω across T1.` : `H4: ${v==='75'?'R1 75R':'R3 110R'} across the T1 secondary / U7 75176 inputs (H4.3 → R1, H4.1 → R3).`);
    const mod = MODS[D.module]; if (mod.refBal===false && v!=='75') tr('<b>Mismatch:</b> this rear module brings the reference in on a 75 Ω BNC. The 2009 manual says use 75 Ω.'); }); },
  level(v){ act(`Analog input → ${v>0?'+':''}${v} dBu`, tr=>{ setCfg({inDbu:v}); const c=cfg(); const db=v-calLevel(c);
    tr(`Balanced input (24 kΩ) → ${D.build==='1998'?'AMP03 + LF353 stage, level jumper '+c.lvl+' dBu':'NE5532 U5 (left) / U6 (right), each leg its own op-amp, RV1/RV2 trim one leg'} → ADC.`);
    tr(`0 dBFS = +${calLevel(c)} dBu, so the output is ${db.toFixed(1)} dBFS${db>0?' → <b>clips</b> (spec: maximum input +'+(D.build==='1998'?26:24)+' dBu)':''}.`); }); },
  hz(v){ act('Test tone → '+v+' Hz', tr=>{ setCfg({inHz:v}); tr('Analog source frequency.'); }); },
  src(on){ act(on?'Connect the analog source':'Disconnect the analog source', tr=>{ setCfg({srcOn:on}); tr(on?'Tone on ANALOG L/R IN.':'Inputs open: the ADC outputs digital silence (plus its noise floor, better than −108 dBFS).'); }); },
  lvl(v){ act('Level-set jumpers → 0 dBFS = +'+v+' dBu', tr=>{ setCfg({lvl:v}); tr('Fig 1.3 LEFT / RIGHT jumpers (1998 board only). The 2009 manual offers +24 dBu only.'); }); },
  trim(ch,v){ act(`${ch?'Right':'Left'} input trim → ${v>0?'+':''}${v} dB`, tr=>{ setCfg(ch?{trimR:v}:{trimL:v}); tr(`${D.build==='1998'?(ch?'RT':'LT'):(ch?'RV2 (U6)':'RV1 (U5)')} input calibration trim, ±2 dB range (1998 manual).`); }); },
  build(v){ D.build=v; D.hist=[{t:0,c:Object.assign({},CFG0)}]; TL=null; D.sec=0; SIM.seek(0);
    act('Board → '+(v==='1998'?'ISS1/ISS2 (1998|31) running 8203V100.ASM':'ISS5 (2005|38) — behaviour from the 2009 manual'), tr=>{
      tr(v==='1998' ? 'PIC16C54A + EPM7064 CPLD + CS8412 receiver + CS5396 ADC + CS8402A transmitter (OrCAD ISS1/ISS2 part lists). The firmware below runs instruction by instruction.' : 'PIC16C54 + CS8427 transceiver + CS5394 ADC + PLL1700 clock + EL2280 drivers (D8203-ISS5.bom / .net). No CPLD.'); }); },
  module(v){ D.module=v; act('Rear module → '+v, tr=>{ const m=MODS[v]; tr(m.note); if (m.variant) tr('Card variant: '+m.variant); if (m.refBal===false && cfg().term!=='75') tr('Set the reference termination to 75 Ω for this module (2009 manual).'); }); },
  power(){ D.hist=[{t:0,c:Object.assign({},cfg())}]; TL=null; D.sec=0; SIM.seek(0);
    act('Power cycle', tr=>{ tr('+21 V / −21 V return (manual: 95 mA / 29 mA). LM2596 → +5 V, 79L05 → −5 V, LM1117 → 3.3 V (ISS5).');
      if (D.build==='1998'){ tr('MCLR released; after the 18 ms device-reset timer the PIC starts at 0x1FF: GOTO RESET → GOTO INIT.'); tr('INIT: TRIS PORTB = 10000001b (E0, E1 in), TRIS PORTA = 00001000b (E2 in), delay3 = 0x30, clrf flag1, PDN high.'); tr(`init2 (pass 1): CAL LED on, D1 = 0 (SDATA gated → mute), 10 × delvis1, PDN low, read lock, DELVIS3 × 48, D2 pulse, CAL off. Then pass 2 with delay3 = 0x1C. CAL LED goes out at ${calEnd()?calEnd().toFixed(2):'?'} s.`); }
      else tr('Behaviour per the 2009 manual: 16 s calibration with the red CAL LED on and the audio muted.'); }); },
  reset(){ D.module='BNC2'; D.hist=[{t:0,c:Object.assign({},CFG0)}]; TL=null; D.sec=0; D.log=[]; SIM.seek(0); SIM.refresh(); },
  goSec(s){ D.sec=Math.max(0,Math.min(SECS-1,Math.floor(s))); SIM.refresh(); },
};
document.addEventListener('keydown', e=>{
  if (!window.__d8203Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key; const c=cfg();
  const m={r:()=>A.plug(!c.plugged), p:()=>A.power(), '[':()=>A.goSec(D.sec-1), ']':()=>A.goSec(D.sec+1), j:()=>A.h1(c.h1==='ext'?'frame':'ext')};
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ================================================================
   DRAWINGS
   ================================================================ */
// Front edge, 1.00″ × 2.75″ (manual). ISS5 LED heights from the Gerber drill (board top edge y = 7.590″):
// EXTREF 7.40, INTREF 7.30, CAL 7.20; handle screw holes 6.760 / 6.456 / 6.144. 1998: Tango D8203.PCB
// (top 5354 mil): EXT LOCK 4850, INT REF 4750, CAL 4650, DIGITAL MONITOR jack 3100.
function frontSVG(t){
  const S_=100, W=100, FH=275, L=ledsAt(t), x0=20, y0=24, cx=x0+W*0.30;
  const iss5 = D.build!=='1998';
  const leds = iss5 ? [[0.19,'EXTREF (green)',L.ext,'var(--led-g)'],[0.29,'INTREF (yellow)',L.int,'#ffd84a'],[0.39,'CAL (red)',L.cal,'#ff4a3a']]
                    : [[0.504,'EXT LOCK (green)',L.ext,'var(--led-g)'],[0.604,'INT REF (yellow)',L.int,'#ffd84a'],[0.704,'CAL (red)',L.cal,'#ff4a3a']];
  let s=`<svg viewBox="0 0 ${W+190} ${FH+70}" style="width:100%;max-width:300px" role="img" aria-label="D8203 front edge">
   <defs><filter id="d3g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect x="${x0}" y="${y0}" width="${W}" height="${FH}" rx="3" fill="#1d5c36" stroke="#0e3a1f"/>
   <rect x="${x0+W*0.62}" y="${y0}" width="${W*0.38}" height="${FH}" fill="#174d2c"/>
   <text x="${x0+W/2}" y="16" font-size="10" text-anchor="middle" fill="var(--ink2)">pin 1 / A ↑ (MF82/10, /12)</text>`;
  leds.forEach(([inch,lbl,on,col],i)=>{ const y=y0+inch*S_, ly=y0+8+i*20;
    s+=`<g><title>${lbl}</title><line x1="${cx+6}" y1="${y}" x2="${W+30}" y2="${ly}" stroke="var(--ink2)" stroke-width=".6"/><rect x="${cx-6}" y="${y-4}" width="12" height="8" rx="2" fill="#0a0b0b"/><circle cx="${cx}" cy="${y}" r="3.6" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#d3g)"':''}/><text x="${W+33}" y="${ly+4}" font-size="11" fill="var(--ink)">${lbl}</text></g>`; });
  const hy0 = iss5? 0.72 : 0.86, hy1 = iss5? 1.56 : 1.86;
  s+=`<g><title>Card handle ${iss5?'(screw holes at 0.83, 1.13 and 1.45″ from the top edge, Gerber drill)':'(position '+'inferred'+')'}</title><rect x="${x0+W*0.18}" y="${y0+hy0*S_}" width="${W*0.64}" height="${(hy1-hy0)*S_}" rx="7" fill="#c9c9c2" stroke="#888"/>
    <text x="${x0+W/2}" y="${y0+(hy0+hy1)/2*S_}" font-size="12" font-weight="700" text-anchor="middle" fill="#222" transform="rotate(90 ${x0+W/2} ${y0+(hy0+hy1)/2*S_})">D8203</text></g>`;
  if (!iss5){ const jy=y0+(5354-3100)/1000*S_; const on=!pins(t).d1? false: true;
    s+=`<g><title>DIGITAL MONITOR ¼″ jack: 110 Ω balanced AES (1998 board only)</title><circle cx="${x0+W/2}" cy="${jy}" r="13" fill="#111" stroke="#777"/><circle cx="${x0+W/2}" cy="${jy}" r="5" fill="#000"/><line x1="${x0+W/2+14}" y1="${jy}" x2="${W+30}" y2="${y0+8+3*20}" stroke="var(--ink2)" stroke-width=".6"/><text x="${W+33}" y="${y0+12+3*20}" font-size="11" fill="var(--ink)">DIGITAL MONITOR</text><text x="${W+33}" y="${y0+26+3*20}" font-size="10" fill="var(--ink2)">${on?'AES with audio':'AES, muted'}</text></g>`; }
  s+=`<text x="4" y="${FH+46}" font-size="10" fill="var(--ink2)">Front edge 1.00″ × 2.75″ to scale (manual).</text>
    <text x="4" y="${FH+60}" font-size="10" fill="var(--ink2)">${iss5?'LEDs from the ISS5 Gerber drill file.':'LEDs and jack from the Tango D8203.PCB.'}</text></svg>`;
  return s;
}

/* Rear modules: Artwork 2026|59 = the CorelDRAW vectors of "D8203 - rear module options.cdr" (2012-01-16), taken through
   Corel's own PDF export of it (libcdr mangles the terminal-block symbol font), cropped to the same cells: plate black, silk white.
   Hot-spot coordinates are in 300-dpi cell pixels (the SVG viewBox). */
const RMG_DIR='#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/';
const MODS = {
  BNC2: {img:'d8203-rear-bnc2.svg', w:776, h:980, refBal:false, variant:'D8203/75 (R7/R8/R15/R16 = 75R)', note:'BNC2: BNC and screw terminals, D8203/75. REF INPUT and DIGITAL OUT 1–4 on 75 Ω BNCs; analog L and R on screw terminals.',
    ref:[307,167], loop:null, outs:[[402,267],[307,367],[402,467],[307,569]], inL:[[270,757],[270,788]], inR:[[387,707],[387,738]]},
  BNC4: {img:'d8203-rear-bnc4.svg', w:780, h:980, refBal:false, variant:'D8203/75', note:'BNC4: BNC and pluggable screw terminals, *MF8210 only. REF INPUT with a passive loop BNC; four output BNCs.',
    ref:[307,161], loop:[444,161], outs:[[307,314],[444,314],[307,469],[444,469]], inL:[[292,704],[292,734]], inR:[[402,704],[402,734]]},
  TB8205P: {img:'d8203-rear-tb8205p.svg', w:776, h:980, refBal:true, variant:'D8203/110 (R7/R8/R15/R16 = 110R, C62–C65 fitted — D8203-110R-ISS5-T.prg)', note:'TB8205P: pluggable screw terminals, D8203/110. Balanced REF INPUT ± with a passive input loop; DIGITAL OUT 1–4 ±.',
    ref:[276,209], refm:[276,246], loop:[397,209], outs:[[276,383],[276,456],[276,529],[276,601]], outsm:[[276,419],[276,492],[276,565],[276,637]], inL:[[406,456],[406,492]], inR:[[406,600],[406,636]]},
  TB8205P75: {img:'d8203-rear-tb8205p75.svg', w:780, h:980, refBal:false, variant:'D8203/110 with an unbalanced reference', note:'TB8205P/75: pluggable screw terminals with an unbalanced 75 Ω reference BNC.',
    ref:[381,224], loop:null, outs:[[289,383],[289,456],[289,529],[289,601]], outsm:[[289,419],[289,492],[289,565],[289,637]], inL:[[419,456],[419,492]], inR:[[419,600],[419,636]]},
};
function rearSVG(t){
  const m=MODS[D.module], c=cfgAt(t), p=pins(t), k=clockAt(t);
  const live = p.on && k.fs>0;
  const dot=(x,y,col,r)=>`<circle cx="${x}" cy="${y}" r="${r||11}" fill="${col}" stroke="#000" stroke-width="2" opacity=".9"/>`;
  let s=`<svg viewBox="0 0 ${m.w} ${m.h}" style="width:100%;max-width:330px;background:#fff;border-radius:6px" role="img" aria-label="Rear module ${D.module} (real artwork)">
    <image href="${ASSET}${m.img}" width="${m.w}" height="${m.h}"/>`;
  s+=`<g class="d3ref" style="cursor:pointer"><title>REF INPUT — click to ${c.plugged?'unplug':'plug in'} the AES reference</title><circle cx="${m.ref[0]}" cy="${m.ref[1]}" r="44" fill="transparent"/>${dot(m.ref[0],m.ref[1],c.plugged?(lockedAt(t)&&c.h1==='ext'?'#3fbf5f':'#e8b23a'):'#999',14)}${m.refm?dot(m.refm[0],m.refm[1],c.plugged?'#3fbf5f':'#999',9):''}</g>`;
  m.outs.forEach((o,i)=>{ s+=`<g><title>DIGITAL OUT ${i+1}: ${live?(p.d1?'AES3 with audio':'AES3 frames, audio muted'):'no clock'}</title>${dot(o[0],o[1], live? (p.d1?'#3fbf5f':'#e8b23a') : '#555', 10)}${m.outsm?dot(m.outsm[i][0],m.outsm[i][1], live?(p.d1?'#3fbf5f':'#e8b23a'):'#555',7):''}</g>`; });
  [m.inL, m.inR].forEach((pp,ch)=>{ s+=`<g class="d3src" style="cursor:pointer"><title>ANALOG ${ch?'RIGHT':'LEFT'} IN ± — click to ${c.srcOn?'disconnect':'connect'} the analog source</title>${pp.map(q=>`<rect x="${q[0]-22}" y="${q[1]-16}" width="44" height="32" fill="${c.srcOn?'rgba(63,120,220,.35)':'rgba(0,0,0,.05)'}" stroke="${c.srcOn?'#2b5f9e':'#aaa'}" stroke-width="2"/>`).join('')}</g>`; });
  s+=`</svg><div class="small muted" style="max-width:330px">CorelDRAW art: ${SIM.src(RMG_DIR+'D8203 - rear module options.cdr','D8203 - rear module options.cdr')} (2012|45), via its Corel PDF ${SIM.src(RMG_DIR+'D8203 - rear module options.pdf','export')}.</div>`;
  return s;
}

/* ISS5 board, top view, from the 2012 Gerbers: copper (TOP) and silkscreen (TSS) at 150 dpi; board 10.980 × 2.755 in.
   Gerber origin of the crop: x 5.175″, y 7.590″ (top). px = (x − 5.175)·150, py = (7.590 − y)·150. */
const GX = x=>(x-5.175)*150, GY = y=>(7.590-y)*150;
const PARTS5 = [
  ['U10','PIC16C54 (DIP18), RC clock R25/C58',11.748,5.773,140,48], ['U1','CS5394 24-bit stereo ADC',11.615,6.675,110,44], ['U3','CS8427 AES3 transceiver',12.555,6.675,110,44],
  ['U4','PLL1700E multi-clock (FS0/FS1/SR0)',12.785,5.945,48,40], ['X1','27 MHz crystal',13.195,5.97,22,60], ['U5','NE5532 left input (P1 9/K)',10.055,6.01,40,34], ['U6','NE5532 right input (P1 11/M)',10.055,6.955,40,34],
  ['U7','75176 reference receiver',13.665,7.185,40,30], ['U2','EL2280C dual output driver',13.85,6.525,40,40], ['T1','PE-65612 reference transformer',14.212,7.207,52,74],
  ['T2','PE-65612 OUT 1',15.06,7.057,72,54],['T3','PE-65612 OUT 2',15.06,6.69,72,54],['T4','PE-65612 OUT 3',15.06,6.307,72,54],['T5','PE-65612 OUT 4',15.06,5.873,72,54],
  ['U13','MC34164 reset for MCLR',12.215,5.305,36,30], ['REG2','LM2596 switcher (+5 V)',7.025,6.265,76,70], ['REG3','LM1117-3.3 (PLL1700 VDD)',13.325,5.415,40,36], ['Q1','2N4401 alarm (P1 pin 16)',11.3365,5.43,16,16],
];
function boardSVG(t){
  const c=cfgAt(t), L=ledsAt(t);
  const led=(y,on,col,name)=>`<g><title>${name}</title><circle cx="${GX(5.58)}" cy="${GY(y)}" r="7" fill="${on?col:'#222'}" ${on?'filter="url(#d3bg)"':''} stroke="#000"/></g>`;
  let s=`<svg viewBox="0 0 1648 414" style="width:100%;border-radius:6px" role="img" aria-label="D8203 ISS5 board from the Gerbers">
    <defs><filter id="d3bg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1648" height="414" rx="4" fill="#1d5c36"/><image href="${ASSET}d8203-board-copper.png" width="1648" height="414" opacity=".85"/><image href="${ASSET}d8203-board-silk.png" width="1648" height="414"/>`;
  PARTS5.forEach(([r,d,x,y,w,h])=>{ s+=`<rect x="${GX(x)-w/2}" y="${GY(y)-h/2}" width="${w}" height="${h}" fill="transparent" stroke="transparent"><title>${r}: ${d}</title></rect>`; });
  s+=led(7.40,L.ext,'#7dff6a','EXTREF (green)')+led(7.30,L.int,'#ffd84a','INTREF (yellow)')+led(7.20,L.cal,'#ff4a3a','CAL (red)');
  // H1 2×3 (rows 7.457/7.357/7.257, cols 14.927/15.033): EXT = rows 2–3, FRAME = rows 1–2 (pin-1 end inferred)
  const h1y = c.h1==='ext' ? [7.357,7.257] : [7.457,7.357];
  s+=`<g class="d3h1" style="cursor:pointer"><title>H1 reference select — click: ${c.h1==='ext'?'EXT (3-5, 4-6) → FRAME (1-3, 2-4)':'FRAME → EXT'}</title><rect x="${GX(14.88)}" y="${GY(7.5)}" width="${0.2*150}" height="${0.29*150}" fill="rgba(0,0,0,.01)" stroke="#ffd84a" stroke-dasharray="3 2"/>
    ${[14.927,15.033].map(x=>`<rect x="${GX(x)-5}" y="${GY(h1y[0])-6}" width="10" height="${(h1y[0]-h1y[1])*150+12}" rx="2" fill="#222" stroke="#ffd84a"/>`).join('')}
    <text x="${GX(14.88)-4}" y="${GY(7.5)+12}" text-anchor="end" font-size="13" font-weight="700" fill="#ffd84a">H1 ${c.h1==='ext'?'EXT':'FRAME'}</text></g>`;
  // H2 (FS1 | +5 V | FS0) vertical at x 12.815, pins 5.573/5.473/5.373; H3 SR0 at 12.918
  const h2 = c.fsJ==='32' ? [5.573,5.473] : c.fsJ==='44.1' ? [5.473,5.373] : null;
  s+=`<g class="d3h2" style="cursor:pointer"><title>H2 sample rate — click to cycle: open = 48 kHz, 1-2 = 32 kHz, 2-3 = 44.1 kHz (2009 manual)</title><rect x="${GX(12.815)-12}" y="${GY(5.62)}" width="24" height="${0.3*150}" fill="rgba(0,0,0,.01)" stroke="#ffd84a" stroke-dasharray="3 2"/>
    ${h2?`<rect x="${GX(12.815)-6}" y="${GY(h2[0])-6}" width="12" height="${0.1*150+12}" rx="2" fill="#222" stroke="#ffd84a"/>`:''}<text x="${GX(12.815)-16}" y="${GY(5.30)+14}" text-anchor="end" font-size="13" font-weight="700" fill="#ffd84a">H2 ${c.fsJ==='none'?'48':c.fsJ}k</text></g>
    <g class="d3h3" style="cursor:pointer"><title>H3 (SR0 of the PLL1700) — not described in the 2009 manual; left open</title><rect x="${GX(12.918)-8}" y="${GY(5.62)}" width="16" height="${0.3*150}" fill="rgba(0,0,0,.01)" stroke="#888" stroke-dasharray="2 2"/></g>`;
  // H4 vertical at 13.978: 7.307 (110 side, R3) / 7.217 / 7.123 (75 side, R1)
  const h4 = c.term==='110' ? [7.307,7.217] : [7.217,7.123];
  s+=`<g class="d3h4" style="cursor:pointer"><title>H4 reference termination — click: ${c.term==='110'?'110 Ω → 75 Ω':'75 Ω → 110 Ω'}</title><rect x="${GX(13.978)-12}" y="${GY(7.36)}" width="24" height="${0.29*150}" fill="rgba(0,0,0,.01)" stroke="#ffd84a" stroke-dasharray="3 2"/>
    <rect x="${GX(13.978)-6}" y="${GY(h4[0])-6}" width="12" height="${0.09*150+12}" rx="2" fill="#222" stroke="#ffd84a"/><text x="${GX(13.978)}" y="${GY(7.36)-6}" text-anchor="middle" font-size="13" font-weight="700" fill="#ffd84a">H4 ${c.term==='HiZ'?'open':c.term}</text></g>`;
  // RV1 (left) 10.425,6.267 · RV2 (right) 10.425,7.213
  [[6.267,0,'RV1 left trim'],[7.213,1,'RV2 right trim']].forEach(([y,ch,n])=>{ const v=ch?c.trimR:c.trimL; const a=(v/2)*120*Math.PI/180;
    s+=`<g class="d3rv" data-ch="${ch}" style="cursor:pointer"><title>${n}: ${v>0?'+':''}${v} dB — click the right half to raise, left half to lower</title><circle cx="${GX(10.425)}" cy="${GY(y)}" r="20" fill="#2d5ea8" stroke="#ccd"/><line x1="${GX(10.425)}" y1="${GY(y)}" x2="${GX(10.425)+16*Math.sin(a)}" y2="${GY(y)-16*Math.cos(a)}" stroke="#fff" stroke-width="4"/></g>`; });
  // P1 edge fingers (15) with signal tags
  s+=`<text x="${GX(15.5)}" y="${GY(4.87)}" font-size="12" fill="#ffd84a" text-anchor="middle">P1 30/156 edge</text></svg>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.d3ref').forEach(g=>g.onclick=()=>A.plug(!cfg().plugged));
  root.querySelectorAll('.d3src').forEach(g=>g.onclick=()=>A.src(!cfg().srcOn));
  root.querySelectorAll('.d3h1').forEach(g=>g.onclick=()=>A.h1(cfg().h1==='ext'?'frame':'ext'));
  root.querySelectorAll('.d3h2').forEach(g=>g.onclick=()=>{ const o=['48','32','44.1']; const c=cfg().fsJ==='none'?'48':cfg().fsJ; A.fsJ(o[(o.indexOf(c)+1)%3]); });
  root.querySelectorAll('.d3h3').forEach(g=>g.onclick=()=>act('Touch H3 (PLL1700 SR0)', tr=>{ tr('H3 pulls SR0 (U4 pin 1) high. The 2009 manual does not mention it; on a PLL1700 SR selects double-rate clocks, which the CS5394 path is not set up for. Left open here ('+inf+').'); }));
  root.querySelectorAll('.d3h4').forEach(g=>g.onclick=()=>A.term(cfg().term==='110'?'75':'110'));
  root.querySelectorAll('.d3rv').forEach(g=>g.onclick=e=>{ const r=g.getBoundingClientRect(); const up=(e.clientX-r.left)>r.width/2; const ch=+g.dataset.ch; const v=(ch?cfg().trimR:cfg().trimL)+(up?0.5:-0.5); A.trim(ch, Math.max(-2,Math.min(2,v))); });
}
function controlsHTML(){
  const c=cfg(); const o=(v,l,cur)=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px">
    <label>Board <select id="d3build">${o('1998','ISS1/2 1998|31 — runs 8203V100.ASM',D.build)}${o('2005','ISS5 2005|38 — CS8427 (firmware missing)',D.build)}</select></label>
    <label>Rear module <select id="d3mod">${Object.keys(MODS).map(k=>o(k,k==='TB8205P75'?'TB8205P/75':k,D.module)).join('')}</select></label>
    <button id="d3plug">${c.plugged?'Unplug':'Plug in'} REF INPUT</button>
    <label>Ref jumper <select id="d3h1">${o('ext','EXT (rear REF INPUT)',c.h1)}${o('frame',D.build==='1998'?'LCL (frame bus)':'FRAME (H1 1-3, 2-4)',c.h1)}</select></label>
    <label><input type="checkbox" id="d3frame" ${c.frameRef?'checked':''}> frame reference present</label>
    <label>Ref rate <select id="d3rfs">${[32000,44100,48000].map(f=>o(f,f/1000+' kHz',c.refFs)).join('')}</select></label>
    <label>Ref error code <select id="d3err">${['000','001','010','011','100','101','110'].map(v=>o(v,v,c.err)).join('')}</select></label>
    <label>Internal fs <select id="d3fs">${o('48','48 kHz',c.fsJ)}${o('44.1','44.1 kHz',c.fsJ)}${o('32','32 kHz',c.fsJ)}${D.build==='1998'?o('none','no jumper (SR0=SR1=0)',c.fsJ):''}</select></label>
    <label>Ref term <select id="d3term">${o('75','75 Ω',c.term)}${o('110','110 Ω',c.term)}${D.build==='1998'?o('HiZ','HiZ',c.term):''}</select></label>
    <label>Input <input type="range" id="d3lev" min="-30" max="30" step="1" value="${c.inDbu}"> <span id="d3levv" class="mono">${c.inDbu>0?'+':''}${c.inDbu} dBu</span></label>
    <label>Tone <select id="d3hz">${[100,400,1000,10000].map(f=>o(f,f>=1000?f/1000+' kHz':f+' Hz',c.inHz)).join('')}</select></label>
    ${D.build==='1998'?`<label>Level jumpers <select id="d3lvl">${o('24','0 dBFS = +24 dBu',c.lvl)}${o('18','+18 dBu',c.lvl)}${o('16','+16 dBu',c.lvl)}</select></label>`:''}
    <button id="d3pwr">Power cycle</button><button id="d3rst">Factory defaults</button></div>
    <div class="small muted" style="margin-top:4px">Every change is stamped at the playhead time (second ${D.sec} + ${SIM.t.toFixed(3)} s) and the firmware is re-run from power-up. Keys: <b>R</b> plug/unplug ref · <b>J</b> ref jumper · <b>[ ]</b> previous / next second · <b>P</b> power cycle.</div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s); if (!q('#d3build')) return;
  q('#d3build').onchange=e=>A.build(e.target.value);
  q('#d3mod').onchange=e=>A.module(e.target.value);
  q('#d3plug').onclick=()=>A.plug(!cfg().plugged);
  q('#d3h1').onchange=e=>A.h1(e.target.value);
  q('#d3frame').onchange=e=>A.frameRef(e.target.checked);
  q('#d3rfs').onchange=e=>A.refFs(+e.target.value);
  q('#d3err').onchange=e=>A.err(e.target.value);
  q('#d3fs').onchange=e=>A.fsJ(e.target.value);
  q('#d3term').onchange=e=>A.term(e.target.value);
  q('#d3lev').oninput=e=>{ q('#d3levv').textContent=(+e.target.value>0?'+':'')+e.target.value+' dBu'; };
  q('#d3lev').onchange=e=>A.level(+e.target.value);
  q('#d3hz').onchange=e=>A.hz(+e.target.value);
  if (q('#d3lvl')) q('#d3lvl').onchange=e=>A.lvl(e.target.value);
  q('#d3pwr').onclick=()=>A.power(); q('#d3rst').onclick=()=>A.reset();
}

/* ---------------- whole-life strip: which second to show ---------------- */
function drawLife(cv){
  const {c,w} = SIM.canvas(cv, 92); const css=n=>SIM.css(n); const x0=8, pw=w-16, X=t=>x0+t/HORIZON*pw;
  const N=Math.min(900, Math.round(pw)); c.font='10px '+css('--mono');
  const rows=[['CAL LED','cal','#e3453a'],['INT REF','int','#e8b23a'],['EXT','ext','#3fbf5f']];
  rows.forEach(([n,k,col],r)=>{ c.fillStyle=col; for(let i=0;i<N;i++){ const t=HORIZON*(i+.5)/N; if (ledsAt(t)[k]) c.fillRect(x0+pw*i/N, 6+r*13, pw/N+.6, 10); } c.fillStyle=css('--ink2'); c.fillText(n, x0+2, 14+r*13); });
  // muted band
  c.fillStyle=css('--accent2'); for(let i=0;i<N;i++){ const t=HORIZON*(i+.5)/N; if (pins(t).on && pins(t).d1) c.fillRect(x0+pw*i/N, 46, pw/N+.6, 8); }
  c.fillStyle=css('--ink2'); c.fillText('audio on (D1)', x0+2, 53);
  for (let s=0;s<=HORIZON;s+=5){ c.fillStyle=css('--grid'); c.fillRect(X(s),58,1,10); c.fillStyle=css('--ink2'); c.fillText(s+'s', X(s)+2, 76); }
  D.hist.slice(1).forEach(h=>{ c.fillStyle=css('--accent'); c.beginPath(); c.moveTo(X(h.t),58); c.lineTo(X(h.t)-4,66); c.lineTo(X(h.t)+4,66); c.fill(); });
  c.strokeStyle=css('--play'); c.lineWidth=2; c.strokeRect(X(D.sec), 3, Math.max(2,X(D.sec+1)-X(D.sec)), 55); c.fillStyle=css('--play'); c.fillRect(X(absNow())-1,0,2,70);
  c.fillStyle=css('--ink'); c.fillText(`showing second ${D.sec} (${D.sec}.000–${D.sec+1}.000 s after power-on) · click to choose another second · ▲ = your changes`, x0, 89);
  if (!cv._d3){ cv._d3=true; cv.addEventListener('click', e=>{ const r=cv.getBoundingClientRect(); const tt=(e.clientX-r.left-8)/(r.width-16)*HORIZON; D.sec=Math.max(0,Math.min(SECS-1,Math.floor(tt))); SIM.seek(tt-D.sec); }); }
}

/* ---------------- timeline lanes (one second of absolute time D.sec … D.sec+1) ---------------- */
function lanes(){
  const css=n=>SIM.css(n); const o=D.sec; const ls=[];
  const logic=(label,get,col)=>({label, h:22, draw(c,X,t0,t1,y,h){ const N=Math.min(1400,Math.max(100,(X(t1)-X(t0)))); c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); let prev=null;
    for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v=get(o+tt); const yy=y+(v?4:h-4); if(i===0) c.moveTo(X(tt),yy); else { if (v!==prev) c.lineTo(X(tt),y+(prev?4:h-4)); c.lineTo(X(tt),yy); } prev=v; } c.stroke(); }});
  ls.push({label: D.build==='1998'?'PIC16C54A: what 8203V100.ASM is doing':'ISS5 PIC (firmware not in archive)', h:34, draw(c,X,t0,t1,y,h){
    const cols=['#888',css('--warn'),css('--accent2'),css('--accent'),css('--bad')]; const N=Math.min(1200,Math.max(80,X(t1)-X(t0)));
    let lastPh=-1, segStart=X(t0);
    const flush=(x,ph)=>{ if (ph<0) return; c.fillStyle=cols[ph]; c.globalAlpha=.75; c.fillRect(segStart,y+3,Math.max(1,x-segStart),h-6); c.globalAlpha=1; if (x-segStart>90){ c.fillStyle='#fff'; c.font='11px sans-serif'; c.fillText(PH[ph], segStart+4, y+h/2+4); } };
    for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const ph=pins(o+tt).on? pins(o+tt).ph : 0; if (ph!==lastPh){ flush(X(tt),lastPh); segStart=X(tt); lastPh=ph; } } flush(X(t1),lastPh);
    // DELAY calls as ticks when zoomed in
    const E=timeline().ent; if (E && (t1-t0)<0.8){ c.fillStyle='rgba(255,255,255,.75)'; for (let i=Math.max(0,entAt(o+t0)); i<E.t.length && E.t[i]<=o+t1; i++){ if (E.n[i]>0){ const a=E.t[i]-o, b=a+(1023*E.n[i]+2)*TCY; c.fillRect(X(a),y+h-8,Math.max(1,X(b)-X(a)-1),3); } } }
  }});
  ls.push(logic('RA0 SEL (CS8412 pin mux)', t=>pins(t).sel, css('--accent2')));
  ls.push(logic('RA2 PDN', t=>pins(t).pdn, css('--ink2')));
  ls.push({label:'CS8412 E2 E1 E0 (when SEL=1)', h:22, draw(c,X,t0,t1,y,h){ const N=Math.min(600,Math.max(60,(X(t1)-X(t0))/3)); c.font='10px '+css('--mono');
    for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N; const L=lockedAt(o+tt); c.fillStyle=L?css('--accent'):css('--bad'); c.globalAlpha=.55; c.fillRect(X(t0+(t1-t0)*i/N),y+4,(X(t1)-X(t0))/N+.5,h-8); } c.globalAlpha=1; c.fillStyle=css('--ink'); c.fillText(lockedAt(o+(t0+t1)/2)?'locked: '+cfgAt(o+(t0+t1)/2).err:'111 = no lock', X(t0)+6, y+h/2+4); }});
  ls.push(logic('RB1 D0 → CPLD: MCLK = EXTREF', t=>pins(t).d0, css('--accent')));
  ls.push(logic('RB2 D1 → CPLD: SDATA gate (1 = audio)', t=>pins(t).d1, css('--accent')));
  ls.push(logic('RB3 D2 → CPLD: CAL + VAL', t=>pins(t).d2, css('--warn')));
  ls.push({label:'LEDs: CAL · INT REF · EXT', h:30, draw(c,X,t0,t1,y,h){ const N=Math.min(600,Math.max(60,(X(t1)-X(t0))/2));
    [['cal','#e3453a'],['int','#e8b23a'],['ext','#3fbf5f']].forEach(([k,col],r)=>{ c.fillStyle=col; for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N; if (ledsAt(o+tt)[k]) c.fillRect(X(t0+(t1-t0)*i/N), y+3+r*9, (X(t1)-X(t0))/N+.5, 7); } }); }});
  ls.push({label:'MCLK source / sample clock', h:24, draw(c,X,t0,t1,y,h){ const k=clockAt(o+(t0+t1)/2);
    if (k.fs) SIM.pulses(c,X,t0,t1,y,h,1/k.fs,0,0.2/k.fs,css('--accent2'),`LRCK (${k.fs/1000} kHz, ${k.src})`);
    else { c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText('no MCLK', X(t0)+6, y+h/2+4); } }});
  ls.push({label:'AES3 blocks (192 frames, Z preamble)', h:20, draw(c,X,t0,t1,y,h){ const k=clockAt(o+(t0+t1)/2); if (k.fs) SIM.pulses(c,X,t0,t1,y,h,192/k.fs,0,1/k.fs,css('--warn'),'blocks'); }});
  [0,1].forEach(ch=>ls.push({label:`AES out ${ch?'B (right)':'A (left)'}`, h:36, draw(c,X,t0,t1,y,h){
    const cfg_=cfgAt(o+(t0+t1)/2), k=clockAt(o+(t0+t1)/2); const span=t1-t0, pw=X(t1)-X(t0); const col=ch?css('--bad'):css('--accent');
    if (k.fs && span*cfg_.inHz > pw/3){ const N=Math.min(800,pw); for(let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; const s=outSample(o+tt,ch); const db=chanDbfs(o+tt,ch); const a=s.muted||!isFinite(db)?0:Math.min(1,Math.pow(10,db/20)*Math.SQRT2); c.fillStyle=col; c.globalAlpha=.4; c.fillRect(X(t0)+pw*i/N, y+h/2-a*(h/2-3), pw/N+.6, 2*a*(h/2-3)+1); } c.globalAlpha=1; return; }
    c.strokeStyle=col; c.beginPath(); const N=Math.min(1600,pw*2); for(let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=outSample(o+tt,ch).v; const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }}));
  return ls;
}

/* ---------------- AES3 frame for the scope ---------------- */
const PRE = { Z:[1,1,1,0,1,0,0,0], Y:[1,1,1,0,0,1,0,0], X:[1,1,1,0,0,0,1,0] };
function aesFrame(t){
  const k=clockAt(t); if (!k.fs) return null; const n=Math.floor(t*k.fs), fr=n%192; const sub=[];
  for (const ch of [0,1]){ const s=outSample(n/k.fs+1e-9, ch); let raw=Math.round(s.v*8388607); if (raw<0) raw+=1<<24;
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(raw>>b)&1;
    bits[28]=s.val?1:0; bits[29]=0; const cs0=0x01|(k.fs===48000?0x40:k.fs===44100?0x00:k.fs===32000?0xC0:0x00); bits[30]= fr<8 ? (cs0>>fr)&1 : 0;
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par; sub.push({pre: ch?'Y':(fr===0?'Z':'X'), bits, raw, v:s.v, muted:s.muted, val:s.val}); }
  return {n, fr, fs:k.fs, sub};
}
function drawScope(cv, el, t){
  const {c,w} = SIM.canvas(cv, 140); const F=aesFrame(t); const css=n=>SIM.css(n);
  if (!F){ c.fillStyle=css('--ink2'); c.font='12px sans-serif'; c.fillText('No MCLK → no AES frames at this instant.', 10, 60); el.innerHTML=''; return; }
  const lv=[]; let cur=0; F.sub.forEach(sf=>{ PRE[sf.pre].forEach(b=>{ cur = b; lv.push(cur); }); for(let i=4;i<32;i++){ cur^=1; lv.push(cur); if (sf.bits[i]) cur^=1; lv.push(cur); } });
  const cw=(w-20)/lv.length; const zones=[[0,8,css('--warn'),'pre'],[8,16,css('--ink2'),'aux'],[16,56,css('--accent'),'audio'],[56,64,css('--accent2'),'VUCP']];
  [0,64].forEach(off=>zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,64); c.globalAlpha=1; c.fillStyle=css('--ink2'); c.font='10px sans-serif'; if ((b-a)*cw>26) c.fillText(lb,12+(off+a)*cw,98); }));
  c.strokeStyle=css('--ink'); c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?28:76; i?c.lineTo(x,y):c.moveTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 of block · bit cell ${SIM.fmtDur(1/(F.fs*128))} · frame ${SIM.fmtDur(1/F.fs)}`, 10, 124);
  const fmt=s=>s.bits.slice(4,28).reverse().join('');
  el.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'} ${s.muted?'<b style="color:var(--warn)">muted (SDATA = D1 · SDATA1 = 0)</b>':'sample '+s.v.toFixed(5)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} · V=${s.bits[28]} U=0 C=${s.bits[30]} P=${s.bits[31]}`).join('<br>')+
    `<br><span class="muted">V = the CPLD's VAL output, which copies D2 (the CAL pulse) on the 1998 board. Channel-status byte 0 (professional, fs code) is the standard AES3 layout; what the CS8402A was strapped to send is ${inf}.</span>`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${D.log[0].t.toFixed(4)} s after power-on</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Plug the reference, move a jumper or change the input. Each step the hardware and firmware take is listed here.</div>'; }
function inspHTML(t){
  const p=pins(t), c=cfgAt(t), k=clockAt(t), L=ledsAt(t); const i=entAt(t), E=timeline().ent;
  const line = (E && i>=0) ? PROG.code[E.pc[i]] : null;
  const dbL=chanDbfs(t,0), dbR=chanDbfs(t,1);
  return `<table class="kv">
    <tr><th>Time since power-on</th><td class="mono">${t.toFixed(6)} s</td></tr>
    <tr><th>Phase</th><td class="mono">${p.on?PH[p.ph]:'power-on reset (18 ms DRT)'}</td></tr>
    ${D.build==='1998'?`<tr><th>PIC instruction</th><td class="mono">${line?`0x${line.addr.toString(16).padStart(3,'0')} ${PROG.routine[line.addr]}: ${SRC_LINES[line.line].trim().replace(/\s+/g,' ')}${E.n[i]>0?` (busy loop: DELAY2 = ${E.n[i]})`:''}`:'—'}</td></tr>`:''}
    <tr><th>PORTB latch</th><td class="mono">${D.build==='1998'?`E0·CAL·INT_R·EXT_L·D2·D1·D0·E1 = ${'?'+p.cal+p.intL+p.extL+p.d2+p.d1+p.d0+'?'}`:`CAL ${p.cal} INT ${p.intL} EXT ${p.extL} (ISS5 pin map differs, see Schematics)`}</td></tr>
    <tr><th>PORTA</th><td class="mono">SEL ${p.sel} · PDN ${p.pdn}</td></tr>
    <tr><th>Reference</th><td class="mono">${c.h1==='ext'?'EXT':'FRAME'} · ${presentAt(t)?'present':'absent'} · ${lockedAt(t)?'LOCKED ('+c.err+')':'no lock (111)'}</td></tr>
    <tr><th>LEDs</th><td class="mono">CAL ${L.cal?'●':'○'} · INT ${L.int?'●':'○'} · EXT ${L.ext?'●':'○'}</td></tr>
    <tr><th>Clock</th><td class="small">${k.txt}</td></tr>
    <tr><th>Output level</th><td class="mono">${p.d1?'':'MUTED · '}L ${isFinite(dbL)?dbL.toFixed(1):'—'} dBFS · R ${isFinite(dbR)?dbR.toFixed(1):'—'} dBFS${(dbL>0||dbR>0)?' <b style="color:var(--bad)">CLIP</b>':''}</td></tr>
  </table>`;
}
function viewSim(m){
  window.__d8203Active = true;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('The card — front edge and rear module at the playhead', `<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start"><div id="fp" style="flex:0 0 260px"></div><div id="rp" style="flex:1 1 240px;max-width:330px"></div></div>
        <div class="small muted">Rear module: the 2012|45 CorelDRAW artwork (see the link under the panel). Click REF INPUT to plug the reference, the analog terminals to connect the source. Dots: green = carrying audio, amber = muted, grey = idle.</div><div id="d3ctl"></div>`)}
      ${card('ISS5 board from the Gerbers (2012|45) — click H1, H2, H4 and the trimmers', `<div id="bp"></div><div class="small muted">Copper and silkscreen are rasterised straight from <span class="mono">D8203-ISS5.zip</span>. Hover a part for its role. The jumpers drive the same settings on both boards.</div>`)}
    </div>
    <div>
      ${card('What happened (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('The card\'s first 90 seconds', `<canvas id="life"></canvas>`)}
  ${card('Timeline — the chosen second, zoomable (click to seek)', `<canvas id="tl"></canvas>
    <p class="small muted">Everything on the PIC lanes comes from running 8203V100.ASM instruction by instruction (the 255-iteration DELAY busy loop is fast-forwarded: 1023 cycles per DELAY2 step). Instruction time ${SIM.fmtDur(TCY)} is ${inf} from the source comment "DELAY2 = 1 will give 1.2 msec". White ticks = DELAY calls.</p>`)}
  <div class="grid2">
    ${card('Scope: DIGITAL OUT at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  const draw=()=>{
    const t=absNow();
    m.querySelector('#fp').innerHTML=frontSVG(t);
    m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#bp').innerHTML=boardSVG(t); bindPanel(m.querySelector('#bp'));
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#insp').innerHTML=inspHTML(t);
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${e.t.toFixed(3)} s</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    drawLife(m.querySelector('#life'));
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  let lastKey='';
  SIM.on('time', ()=>{ const key=JSON.stringify([D.build,D.module,D.sec,cfg()]); if (key!==lastKey){ lastKey=key; m.querySelector('#d3ctl').innerHTML=controlsHTML(); bindControls(m); } draw(); });
}

/* ---------------- tutorial (from D8203MAN.WPD 1998 and D8203MAN-1.wpd 2009) ---------------- */
const LESSONS = [
  {title:'Meet the D8203', body:()=>`<p>The D8203 is a card for a Ward-Beck <b>MF82</b> frame. It turns a stereo <b>analog</b> signal into <b>AES/EBU digital audio</b> (24-bit) and sends it out four times. It can make its own sample clock (48, 44.1 or 32 kHz) or follow an external AES <b>reference</b> so the whole plant runs at one rate.</p>
    <p>The front edge has three LEDs: <b style="color:#3fbf5f">green</b> = locked to an external reference, <b style="color:#c9a400">yellow</b> = running on its own clock, <b style="color:#e3453a">red</b> = calibrating (audio muted). Everything else is set with jumpers on the board and wired at the rear module.</p>
    <p class="muted">This tutorial runs on the 1998 board, whose firmware is in the archive. Click Next.</p>`, check:()=>true, auto:true},
  {title:'1 · Power up and wait', body:()=>`<p>A cold card <b>calibrates</b> first. The red CAL LED lights and the outputs carry silent AES frames. The 1998 manual says about <b>25 seconds</b>; the firmware's two passes add up to ${calEnd()?calEnd().toFixed(1):'≈25'} s.</p>
    <p>Use the <b>first-90-seconds strip</b> on the Simulator tab (or the <b>]</b> key) to move to a second after the red bar ends.</p><p><b>Goal:</b> be at a moment where CAL is off and audio is on.</p>`, check:()=>{ const p=pins(absNow()); return p.on && !p.cal && p.d1; }, hint:()=>`Click the strip at about ${calEnd()?Math.ceil(calEnd()):26} s.`},
  {title:'2 · Read the LEDs', body:()=>`<p>No reference is connected, so the card runs on its internal oscillator: <b>yellow INT REF</b> is on. The firmware decided this in <span class="mono">init2</span>: it read the CS8412 error pins E2 E1 E0 = <span class="mono">111</span> (no lock), so <span class="mono">btfss PORTB,EXT_L / bsf PORTB,INT_R</span> lit yellow and <span class="mono">bcf PORTB,D0</span> kept the CPLD on its own oscillator.</p><p><b>Goal:</b> yellow on, green off.</p>`, check:()=>{ const L=ledsAt(absNow()); return L.int && !L.ext; }, hint:()=>'Make sure REF INPUT is unplugged and you are after the calibration.'},
  {title:'3 · Choose the internal sample rate', body:()=>`<p>The <b>SAMPLE</b> jumpers (Fig 1.2, beside the EPM7064) pick 48, 44.1 or 32 kHz. They go straight into the CPLD's clock multiplexer, so the rate changes at once.</p><p><b>Goal:</b> run at <b>44.1 kHz</b>.</p>`, check:()=>clockAt(absNow()).fs===44100 && !pins(absNow()).d0, hint:()=>'Set “Internal fs” to 44.1 kHz.'},
  {title:'4 · Lock to a house reference', body:()=>`<p>Plug an AES reference into <b>REF INPUT</b> on the rear module (click it). With the REF jumper on <b>EXT</b>, the CS8412 receiver locks in a few milliseconds, but the firmware is cautious: <span class="mono">main</span> must see the lock for <b>10 passes</b> in a row (≈0.6 s), and then it <b>re-calibrates</b> (≈6 s, manual: “approximately 7 seconds”) before turning the green LED on.</p>
    <p>Watch it on the strip, then step forward to after the red bar.</p><p><b>Goal:</b> green EXT on, audio on.</p>`, check:()=>{ const t=absNow(), L=ledsAt(t); return L.ext && !L.cal && pins(t).d1; }, hint:()=>'Click REF INPUT, then press ] about eight times.'},
  {title:'5 · Reference rate follows', body:()=>`<p>Locked, the converter's MCLK is the receiver's recovered clock (<span class="mono">MCLK = D0 &amp; EXTREF</span>). Change the <b>Ref rate</b> to 32 kHz: the output follows at once. The firmware does not re-calibrate: the error code stays “locked”.</p><p><b>Goal:</b> output at 32 kHz while locked.</p>`, check:()=>{ const t=absNow(); return pins(t).d0 && clockAt(t).fs===32000; }, hint:()=>'Choose Ref rate 32 kHz.'},
  {title:'6 · Set the level', body:()=>`<p>The factory calibration is <b>0 dBFS = +24 dBu</b>, so a nominal <b>+4 dBu</b> line gives <b>−20 dBFS</b>. The 1998 board also has level jumpers for +18 and +16 dBu (Fig 1.3) and ±2 dB trimmers LT / RT.</p><p><b>Goal:</b> left output at exactly −18 dBFS.</p>`, check:()=>{ const v=chanDbfs(absNow(),0); return Math.abs(v+18)<0.01; }, hint:()=>''},
  {title:'7 · An error that still counts as lock', body:()=>`<p>The CS8412 reports problems on E2 E1 E0: <span class="mono">001</span> validity, <span class="mono">101</span> parity, <span class="mono">110</span> bi-phase errors… Only <span class="mono">111</span> means “no lock”. The firmware tests the three bits with <span class="mono">btfss</span> and treats <b>anything but 111</b> as a good reference.</p><p><b>Goal:</b> set the ref error code to 110 and see that green stays on.</p>`, check:()=>{ const t=absNow(); return cfgAt(t).err==='110' && ledsAt(t).ext; }, hint:()=>'Ref error code → 110 (while locked).'},
  {title:'8 · Lose the reference', body:()=>`<p>Unplug REF INPUT. Ten passes later the firmware jumps to <span class="mono">init2</span>: mute, red CAL on, re-calibrate on the internal clock, then yellow. During those seconds the outputs still carry AES frames, but with zero audio and the V (validity) bit set during the CAL pulse.</p><p><b>Goal:</b> be inside that re-calibration (red on after a reference change).</p>`, check:()=>{ const t=absNow(); return pins(t).ph===4 && ledsAt(t).cal; }, hint:()=>'Unplug REF INPUT, then step a second or two forward.'},
  {title:'9 · Wire the rear', body:()=>`<p>The rear module decides the connectors: <b>BNC2</b> / <b>BNC4</b> for the 75 Ω card (D8203/75), <b>TB8205P</b> screw terminals for the 110 Ω card (D8203/110), <b>TB8205P/75</b> for a 110 Ω card with an unbalanced reference. The 2016 pick-and-place files show the only difference between the two cards: R7, R8, R15, R16 are 75R or 110R.</p><p><b>Goal:</b> choose TB8205P.</p>`, check:()=>D.module==='TB8205P', hint:()=>'Rear module → TB8205P.'},
  {title:'Done', body:()=>`<p>You have used every setting the manuals describe. The <b>Software</b> tab shows the firmware line running at the playhead; <b>Findings</b> lists where the 1998 code, the 2005 board and the 2009 manual disagree.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__d8203Active = true;
  if (D.build!=='1998'){ D.build='1998'; TL=null; }
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the D8203 (from the 1998 and 2009 manuals)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What happened', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The card', `<div style="display:flex;gap:14px;flex-wrap:wrap"><div id="fp" style="flex:0 0 240px"></div><div id="rp" style="flex:1 1 220px;max-width:300px"></div></div><canvas id="life" style="margin-top:6px"></canvas><div id="ctl"></div>`)}
      ${card('State', `<div id="insp"></div>`)}</div></div>`;
  let lastKey='';
  const draw=()=>{
    const t=absNow();
    m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    drawLife(m.querySelector('#life'));
    const key=JSON.stringify([D.build,D.module,D.sec,cfg()]); if (key!==lastKey){ lastKey=key; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); }
    m.querySelector('#insp').innerHTML=inspHTML(t);
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body()}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint?L.hint():'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; lastKey=''; draw(); };
  };
  SIM.on('time', draw);
}
// fix lesson 6 hint text
LESSONS[6].hint=()=>'Input +6 dBu (0 dBFS = +24 dBu), or +4 dBu with a +2 dB trim, or 0 dBu with the +18 dBu level jumper.';

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__d8203Active = true;
  m.innerHTML = `${card('One second of the D8203, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device', `<div id="dev"></div>`)}${card('As seen by the displays (front LEDs) and downstream', `<div id="fp"></div><h3>A meter on DIGITAL OUT 1</h3><canvas id="meter"></canvas><p class="small muted">Peak of the last 10 ms, −60 to 0 dBFS, like an AMS8-2 in the same rack (${inf}).</p>`)}</div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{
    const t=absNow(), k=clockAt(t), fs=k.fs||48000, c=cfgAt(t);
    const rows=[
      ['PIC instruction cycles', Math.round(1/TCY).toLocaleString(), SIM.fmtDur(TCY), `Fosc ≈ ${(4/TCY/1e6).toFixed(2)} MHz ${inf}; RC R25 4K7 / C58 27 pF on ISS5`],
      ['DELAY2 steps (busy loop)', Math.round(1/(1023*TCY)).toLocaleString(), '1.2 ms', '255 × (CLRWDT, DECFSZ, GOTO): the only "clock" the firmware has'],
      ['main passes (after calibration)', (1/PASS_T).toFixed(1), SIM.fmtDur(PASS_T), 'RE_INIT, SEL low, delvis1 (48 steps), SEL high, read E0/E1/E2'],
      ['SEL pulses to the CS8412', '≈'+(1/PASS_T).toFixed(1)+' (main) / ≈3.3 (DELVIS3)', '', 'SEL=1 shows E2..E0; SEL=0 shows channel-status bits'],
      ['Debounce before acting', '1 per 10 passes', SIM.fmtDur(10*PASS_T), 'bounce_num = 0x0A'],
      ['Crystal / clock source', D.build==='1998'?(c.fsJ==='44.1'?'33 868 800':'24 576 000'):'27 000 000', '', D.build==='1998'?'CPLD inputs 33M / 25M576':'PLL1700 X1'],
      ['MCLK (256 fs)', (256*fs).toLocaleString(), SIM.fmtDur(1/(256*fs)), 'CPLD MCLK mux (1998) / PLL1700 SCKO or CS8427 RMCK (ISS5)'],
      ['128FS (CPLD toggle)', (128*fs).toLocaleString(), SIM.fmtDur(1/(128*fs)), 'TFFE clocked by the MCLK term (d8203.rpt)'],
      ['SCLK (64 fs)', (64*fs).toLocaleString(), SIM.fmtDur(1/(64*fs)), 'ADC serial clock; the CPLD inverts it (SCLK1 = !SCLK)'],
      ['Samples per channel (LRCK)', fs.toLocaleString(), SIM.fmtDur(1/fs), 'ADC → CPLD (SDATA = D1 & SDATA1) → AES transmitter'],
      ['AES3 blocks', (fs/192).toFixed(2), SIM.fmtDur(192/fs), 'Z preamble every 192 frames'],
      ['AES3 subframes', (2*fs).toLocaleString(), SIM.fmtDur(1/fs/2), 'A = left, B = right'],
      ['AES3 bit cells', (128*fs).toLocaleString(), SIM.fmtDur(1/fs/128), `${(128*fs/1e6).toFixed(3)} Mbaud on 4 outputs (${D.build==='1998'?'EL2099':'EL2280 + PE-65612'})`],
      [`Tone cycles (${c.inHz} Hz)`, c.inHz.toLocaleString(), SIM.fmtDur(1/c.inHz), `${(fs/c.inHz).toFixed(1)} samples per cycle`],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Showing second ${D.sec} after power-on (choose another on the Simulator tab). The firmware's view of time is coarse: it checks the reference only once per main pass (≈${(PASS_T*1000).toFixed(1)} ms) or, while calibrating, once per ≈0.31 s DELVIS3 step.</p>`;
    const p=pins(t), F=aesFrame(t), i=entAt(t), E=timeline().ent; const ln=(E&&i>=0)?PROG.code[E.pc[i]]:null;
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${t.toFixed(6)} s</td></tr>
      <tr><th>PIC</th><td class="mono">${ln?PROG.routine[ln.addr]+': '+SRC_LINES[ln.line].trim().replace(/\s+/g,' '):PH[p.ph]}</td></tr>
      <tr><th>CPLD / clocks</th><td class="small">${k.txt}</td></tr>
      <tr><th>Receiver</th><td class="mono">${lockedAt(t)?'locked, E2..E0 = '+cfgAt(t).err:'no lock (111)'} · SEL ${p.sel}</td></tr>
      <tr><th>ADC</th><td class="mono">${p.d2?'CAL pulse (D2) — calibrating':p.pdn?'PDN high':'converting'}</td></tr>
      <tr><th>AES frame</th><td class="mono">${F?`${F.fr}/191 · A ${F.sub[0].v.toFixed(4)} · B ${F.sub[1].v.toFixed(4)} · V=${F.sub[0].bits[28]}`:'none'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t);
    const {c:g,w}=SIM.canvas(m.querySelector('#meter'),64);
    [0,1].forEach(ch=>{ let pk=0; for(let j=0;j<64;j++) pk=Math.max(pk,Math.abs(outSample(t-0.01*j/64,ch).v)); const db=pk>0?20*Math.log10(pk):-99; const segs=46, lit=Math.max(0,Math.min(segs,Math.round((db+60)/60*segs)));
      for(let s=0;s<segs;s++){ const x=10+s*(w-20)/segs; g.fillStyle = s<lit ? (s>=segs-4?'#e3453a':s>=segs-12?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); g.fillRect(x,6+ch*28,(w-20)/segs-2,20); }
      g.fillStyle=SIM.css('--ink'); g.font='11px '+SIM.css('--mono'); g.fillText((ch?'B ':'A ')+(db>-99?db.toFixed(1)+' dBFS':'—'),12,20+ch*28); });
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const k=clockAt(t), fs=k.fs||48000;
  const levels=[['1 second',1],['1 DELVIS3 step (≈0.31 s)',255*1023*TCY],['1 main pass',PASS_T],['1 AES block',192/fs],['1 DELAY2 step (1.2 ms)',1023*TCY],['1 AES frame',1/fs]];
  const H=levels.length*44+10; const {c,w}=SIM.canvas(cv,H); const css=n=>SIM.css(n);
  levels.forEach(([nm,span],i)=>{ const y=8+i*44, t0=Math.max(0,t-span/2); const x0=200, pw=w-x0-10;
    c.fillStyle=css('--ink'); c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+14); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('AES out A + SEL (blue) + D1 (green)',6,y+28);
    c.strokeStyle=css('--grid'); c.strokeRect(x0,y+2,pw,30);
    const N=Math.min(700,pw); c.strokeStyle=css('--accent2'); c.beginPath(); for(let j=0;j<=N;j++){ const tt=t0+span*j/N; const yy=y+(pins(tt).sel?6:28); j?c.lineTo(x0+pw*j/N,yy):c.moveTo(x0,yy);} c.stroke();
    c.strokeStyle=css('--accent'); c.beginPath(); for(let j=0;j<=N;j++){ const tt=t0+span*j/N; const v=outSample(tt,0).v; const yy=y+17-v*12; j?c.lineTo(x0+pw*j/N,yy):c.moveTo(x0,yy);} c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke(); });
}

/* ---------------- block diagram ---------------- */
function blocks(){
  if (D.build==='1998') return {
    B:{ ain:{x:20,y:30,w:170,h:84,t:'Analog L/R in',s:['balanced, 24 kΩ','AMP03 + LF353','level jumpers 24/18/16'],d:'Actively balanced inputs (1998 manual: CMRR better than 75 dB). AMP03 and LF353 in the ISS1/ISS2 OrCAD part lists. The Fig 1.3 jumpers and LT/RT trimmers set 0 dBFS = +24, +18 or +16 dBu.'},
        adc:{x:240,y:30,w:170,h:84,t:'CS5396 ADC',s:['24-bit stereo','CAL from CPLD (D2)','DFS, S/M, PDN = GND'],d:'Crystal CS5396 in the ISS1/ISS2 parts list. Its MCLK, CAL and mode pins come from the EPM7064; DFS, S/M and PDN are driven low by the CPLD (d8203.rpt warnings).'},
        cpld:{x:240,y:160,w:170,h:120,t:'EPM7064 CPLD',s:['MCLK mux: osc / EXTREF','÷2 (48K), ÷3 lpm_counter','SDATA = D1 & SDATA1','CAL = VAL = D2'],d:'MAX7000S EPM7064SLC44-10, 15 of 64 macrocells. Chooses the master clock, gates (mutes) the serial audio, inverts SCLK, buffers LRCK (Q6), and passes the PIC\'s calibration pulse to the ADC and the transmitter\'s V bit.'},
        osc:{x:20,y:180,w:170,h:70,t:'Oscillators',s:['25M576 (24.576 MHz)','33M (33.8688 MHz)'],d:'Two 8-pin oscillators (OSC1/OSC2 in D8203.PCB). The CPLD outputs osc1/osc2 disable the one not in use and both when locked to EXTREF.'},
        rx:{x:20,y:300,w:170,h:84,t:'REF IN → CS8412',s:['T1, TERM 75/110/HiZ','REF: EXT / LCL / OUT','E2..E0 via SEL mux'],d:'Crystal CS8412 receiver. Recovers a 256 fs clock (EXTREF) from the reference and reports lock/error on E2..E0 when SEL is high.'},
        pic:{x:460,y:160,w:170,h:120,t:'PIC16C54A',s:['8203V100.ASM','reads E0..E2, drives D0..D2','LEDs CAL / INT / EXT','PDN, SEL'],d:'The only processor. No interrupts, no timer: every delay is a busy loop. It sequences the power-up and change-over calibrations and decides when to trust the reference.'},
        tx:{x:460,y:30,w:170,h:84,t:'CS8402A transmitter',s:['AES3 encoder','V bit = VAL'],d:'Crystal CS8402A in the ISS1/ISS2 parts list. Encodes SDATA/SCLK/LRCK as AES3.'},
        out:{x:460,y:320,w:170,h:84,t:'Outputs ×4 + monitor',s:['EL2099 drivers','75 Ω or 110 Ω','front ¼″ monitor jack'],d:'Four outputs to P1 and a 110 Ω monitor jack on the front edge (1998 manual).'} },
    W:[['ain','adc','analog'],['adc','cpld','SDATA1 SCLK LRCK'],['cpld','adc','MCLK CAL'],['osc','cpld','25M576 33M'],['cpld','osc','osc1 osc2'],['rx','cpld','EXTREF'],['rx','pic','E0 E1 E2'],['pic','rx','SEL PDN'],['pic','cpld','D0 D1 D2'],['cpld','tx','SDATA VAL'],['tx','out','AES3']] };
  return {
    B:{ ain:{x:20,y:30,w:170,h:84,t:'Analog L/R in',s:['NE5532 U5 / U6','one op-amp per leg','RV1 / RV2 trims'],d:'P1 9/K (left ±) → R60/R61 → U5; P1 11/M (right ±) → R62/R63 → U6. Each leg has its own op-amp; RV1 (left) and RV2 (right) trim one leg. Differential out to the ADC through C1/C2 (left) and C14/C15 (right).'},
        adc:{x:240,y:30,w:170,h:84,t:'CS5394 ADC (U1)',s:['24-bit stereo','MCLK = CS8427 RMCK','CAL ← PIC RB0'],d:'U1 pins 13/14/16 LRCK/SCLK/SDATA go straight to the CS8427 (U3 pins 12/13/14). Pin 10 CAL is driven by the PIC (RB0). MCLK (pins 7, 20) comes from U3 pin 10 RMCK.'},
        pll:{x:20,y:180,w:170,h:70,t:'PLL1700E (U4)',s:['27 MHz X1','FS0/FS1 (H2), SR0 (H3)'],d:'Multi-clock generator. Pin 14 → CS8427 OMCK (pin 21). Its reset (pin 18) is driven by the PIC (RB3 RESET1700).'},
        x8427:{x:240,y:160,w:170,h:120,t:'CS8427 (U3)',s:['AES3 receiver + transmitter','RMCK → ADC MCLK','SPI to the PIC','TXP → EL2280'],d:'Replaces the CS8412, the CS8402A and the CPLD of the 1998 board. Receives the reference on RXP/RXN (pins 4/5, from U7 via C10), transmits on TXP (pin 26). Controlled over SPI (CCLK 28, CDIN 27, CDOUT 1, CS 2) from the PIC.'},
        rx:{x:20,y:300,w:170,h:84,t:'REF IN → T1 → 75176',s:['H1 EXT / FRAME','H4 75 / 110 Ω'],d:'H1 connects T1 to P1 A/1 (REF IN on the rear module) or C/3 (frame bus). H4 picks R1 75R or R3 110R. U7 75176 squares the signal for the CS8427.'},
        pic:{x:460,y:160,w:170,h:120,t:'PIC16C54 (U10)',s:['RC clock 4K7 / 27 pF','SPI: RA0..RA3','RB0 CAL, RB1/RB3 resets','RB4..RB6 LEDs, RB7 alarm'],d:'Firmware not in the archive. Its pins (D8203-ISS5.net) show it configured the CS8427 over SPI and watched RERR (RB2).'},
        out:{x:460,y:30,w:170,h:84,t:'Outputs ×4',s:['EL2280C U2 (2 halves)','R7/R8/R15/R16 75R|110R','T2–T5 PE-65612'],d:'U3 TXP → R11 → U2 (both halves). U2 pin 1 → R7/R8 → T2/T3 (OUT 1/2); pin 7 → R15/R16 → T4/T5 (OUT 3/4). P1 D/4, E/5, F/6, H/7.'},
        alarm:{x:460,y:320,w:170,h:70,t:'Alarm (Q1)',s:['RB7 → 2N4401 → P1 pin 16'],d:'Open-collector alarm to P1 pin 16 (“8”). D8203TR4.cdr labels a terminal ALARM; the PDF terminal options show it as not connected.'} },
    W:[['ain','adc','analog ±'],['adc','x8427','SDATA SCLK LRCK'],['x8427','adc','RMCK'],['pll','x8427','OMCK'],['rx','x8427','RXP/RXN'],['pic','x8427','SPI, RESET'],['x8427','pic','RERR'],['pic','adc','CAL'],['pic','pll','RESET1700'],['x8427','out','TXP'],['pic','alarm','RB7']] };
}
function viewBlock(m){
  window.__d8203Active=false; let sel=null;
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block) — '+(D.build==='1998'?'1998 ISS1/2 board':'2005 ISS5 board'), `<div id="bd"></div><div class="small" style="margin-top:6px"><label>Board <select id="bb"><option value="1998" ${D.build==='1998'?'selected':''}>1998 ISS1/2</option><option value="2005" ${D.build!=='1998'?'selected':''}>2005 ISS5</option></select></label></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', `<p id="one"></p>`)}</div></div>`;
  const draw=()=>{ const {B,W}=blocks(); if (!sel||!B[sel]) sel=Object.keys(B)[3];
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 650 420" style="width:100%"><defs><marker id="d3ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l],wi)=>{ const A_=B[a],B_=B[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#d3ar)"/>`+(l?`<text x="${(x1+x2)/2+4+(W.some(([p,q])=>p===b&&q===a)&&a>b?-60:0)}" y="${(y1+y2)/2-4+(W.some(([p,q])=>p===b&&q===a)&&a>b?16:0)}" font-size="10" fill="var(--ink2)">${l}</text>`:''); });
    for (const k in B){ const b=B[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bdinfo').innerHTML=`<h3>${B[sel].t}</h3><p>${B[sel].d}</p>`;
    m.querySelector('#one').innerHTML = D.build==='1998' ? 'The <b>ADC</b> samples the analog input on a clock the <b>CPLD</b> picks (its own oscillator or the reference recovered by the <b>CS8412</b>); the CPLD lets the audio through only when the <b>PIC</b> says calibration is over, and the <b>CS8402A</b> sends it out as AES3.' : 'The <b>CS8427</b> does the receiving, clocking and transmitting; the <b>PIC</b> sets it up over SPI and runs the LEDs and the ADC calibration.';
  };
  m.querySelector('#bb').onchange=e=>{ D.build=e.target.value; TL=null; SIM.openTab('block'); };
  draw();
}

/* ---------------- schematics (redrawn from net and pin names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  {name:'1 · ISS5 PIC16C54 (U10)', note:'Pins and nets from D8203-ISS5.net (P-CAD 2002). Port names are the PIC16C54 DIP18 pin functions. Compare with the 1998 port map in 8203V100.ASM (sheet 6): none of the RB functions line up.', svg:()=>
    chip(330,50,200,'U10 PIC16C54',[['1 RA2','SCK → U3.28'],['2 RA3','SDO → U3.27 (CDIN)'],['17 RA0','CS2 → U3.2'],['18 RA1','SDI ← U3.1 (CDOUT)'],['4 MCLR','U13 MC34164 + R26'],['16 OSC1','R25 4K7 / C58 27p (RC)'],['14 VDD','+5V'],['5 VSS','GNDD']],
      [['6 RB0','CAL → U1.10'],['7 RB1','RESET → U3.9'],['8 RB2','RERR ← U3.11'],['9 RB3','RESET1700 → U4.18'],['10 RB4','R34 → CAL LED (red)'],['11 RB5','R33 → INTREF (yellow)'],['12 RB6','R32 → EXTREF (green)'],['13 RB7','R37 → Q1 → P1.16 alarm']],'DIP18 · 2005|38 netlist')},
  {name:'2 · ISS5 clocks and AES (U3, U4, U1)', note:'CS8427 pin roles from the net names (SDA/CDOUT 1, AD0/CS 2, RXP/RXN 4/5, RST 9, RMCK 10, RERR 11, ILRCK/ISCLK/SDIN 12–14, OMCK 21, TXP 26, CDIN 27, CCLK 28). PLL1700E: SR 1, XT 5/6, FS0/FS1 19/20, RST 18, clock out 14 (256 fs, '+'inferred'+').', svg:()=>
    chip(80,60,170,'U4 PLL1700E',[['5 XT1','X1 27MHz'],['6 XT2','X1'],['19 FS0','H2.3 / R18'],['20 FS1','H2.1 / R17'],['1 SR','H3.3 / R19'],['18 RST','RESET1700']],[['14 SCKO','→ U3.21 OMCK'],['16 VDD','REG3 3.3 V']],'27 MHz → 256 fs')
    + chip(470,40,190,'U3 CS8427',[['4 RXP','C10 ← U7.1'],['5 RXN','C12'],['21 OMCK','← U4.14'],['9 RST','RESET'],['28 CCLK','SCK'],['27 CDIN','SDO'],['1 CDOUT','SDI'],['2 CS','CS2']],[['10 RMCK','MCLK → U1.7/20'],['12 ILRCK','LRCK ↔ U1.13'],['13 ISCLK','SCLK ↔ U1.14'],['14 SDIN','SDATA ← U1.16'],['11 RERR','→ PIC RB2'],['26 TXP','R11 → U2'],['8 FILT','R23 / C17']],'AES3 transceiver')
    + `<text x="40" y="330" font-size="11" fill="var(--ink2)">U1 CS5394: 13 LRCK, 14 SCLK, 16 SDATA (to U3), 7 + 20 MCLK, 10 CAL (from PIC RB0), 4/5 left analog in, 26/27 right analog in.</text>`},
  {name:'3 · ISS5 analog inputs', note:'NE5532 halves per leg. Net names from D8203-ISS5.net; component values from D8203-ISS5.bom. Input impedance 24 kΩ balanced (manual).', svg:()=>
    chip(300,50,180,'U5 NE5532 (left)',[['3 +A','R60 ← P1.18 (9) L+'],['2 −A','R39 / C30 / R47'],['5 +B','R61 ← P1.17 (K) L−'],['6 −B','RV1 / R40 / C33']],[['1 outA','R45 → C1/C62 → U1.4'],['7 outB','R46 → C2/C63 → U1.5'],['8/4','+VA / −VA']],'one op-amp per leg')
    + chip(300,250,180,'U6 NE5532 (right)',[['3 +A','R62 ← P1.22 (11) R+'],['5 +B','R63 ← P1.21 (M) R−'],['6 −B','RV2 / R56 / C44']],[['1 outA','R58 → C15/C64 → U1.27'],['7 outB','R57 → C14/C65 → U1.26']],'')},
  {name:'4 · ISS5 outputs and P1', note:'P1 = EDAC 30/156 edge: odd contacts are letters (A, B, C, D, E, F, H, J, K, L, M, N, P, R, S), even contacts numbers 1–15. Mapping from D8203-ISS5.net and D8203tr4.pdf.', svg:()=>{
    const rows=[['A / 1','REF IN − / +','H1.5 / H1.6 → T1'],['B / 2','GND','GNDD'],['C / 3','frame reference bus','H1.1 / H1.2'],['D / 4','DIGITAL OUT 1','T2 (R7, U2.1)'],['E / 5','DIGITAL OUT 2','T3 (R8, U2.1)'],['F / 6','DIGITAL OUT 3','T4 (R15, U2.7)'],['H / 7','DIGITAL OUT 4','T5 (R16, U2.7)'],['J / 8','(8) alarm','Q1 2N4401 ← RB7'],['K / 9','ANALOG LEFT IN − / +','R61 / R60 → U5'],['M / 11','ANALOG RIGHT IN − / +','R63 / R62 → U6'],['P / 13','V− (−21 V)','F1 → 79L05 / LM2596'],['R / 14','GND','GNDD'],['S / 15','V+ (+21 V)','F2 → LM2596']];
    let s=`<text x="40" y="40" font-size="12" font-weight="700" fill="var(--ink)">P1 contact</text><text x="160" y="40" font-size="12" font-weight="700" fill="var(--ink)">Signal</text><text x="400" y="40" font-size="12" font-weight="700" fill="var(--ink)">On the card</text>`;
    rows.forEach((r,i)=>{ const y=64+i*26; s+=`<rect x="34" y="${y-15}" width="760" height="22" fill="${i%2?'var(--lane)':'transparent'}"/><text x="40" y="${y}" font-size="12" fill="var(--ink)" font-family="var(--mono)">${r[0]}</text><text x="160" y="${y}" font-size="12" fill="var(--ink)">${r[1]}</text><text x="400" y="${y}" font-size="12" fill="var(--accent2)">${r[2]}</text>`; });
    return s; }},
  {name:'5 · ISS5 reference input and power', note:'H1 2×3 and H4 1×3 from the netlist; regulators from the BOM.', svg:()=>
    chip(120,60,160,'T1 PE-65612',[['1','C16 ← IN+ (H1.4)'],['2','C1− (H1.3)']],[['3','R1 / R3 / U7.7'],['4','H4.2 / U7.6']],'reference transformer')
    + chip(520,60,160,'U7 75176',[['7 A','T1.3'],['6 B','T1.4']],[['1 RO','C10 → U3.4 RXP'],['8','+5V']],'RS-485 receiver')
    + `<text x="60" y="230" font-size="12" fill="var(--ink)">H1: 1 = P1_C, 2 = P1_3, 3 = C1−, 4 = IN+, 5 = P1_A, 6 = P1_1 → 1-3, 2-4 = FrameRef · 3-5, 4-6 = ExtRef (2009 manual)</text>
       <text x="60" y="254" font-size="12" fill="var(--ink)">H4: 1 = R3 110R, 2 = T1.4 / U7.6, 3 = R1 75R → jumper 1-2 = 110 Ω, 2-3 = 75 Ω</text>
       <text x="60" y="290" font-size="12" fill="var(--ink2)">Power: P1 S/15 V+ → F2 RXE050 → D4 → LM2596 REG2 (+ L1 PE-53823, D5 SK33) → +5V; LM1117-3.3 REG3 → PLL1700 VDD;</text>
       <text x="60" y="308" font-size="12" fill="var(--ink2)">P1 P/13 V− → F1 → D3 → 79L05 REG1 → −5V (EL2280); ±VA for the NE5532s through R64 / R38 (2R2) and C24/C25 220 µF.</text>`},
  {name:'6 · 1998 PIC16C54A ports (from 8203V100.ASM)', note:'Port bits are the equ lines at the top of the firmware; where each line goes is from the CPLD pin list (D0–D2) and the CS8412 pin functions (E0–E2, SEL). PDN\'s destination is not in a readable netlist (ISS1/2 are OrCAD binaries).', svg:()=>
    chip(330,60,200,'PIC16C54A (1998)',[['RA0 SEL','→ CS8412 SEL (pin mux)'],['RA2 PDN','→ ADC / receiver reset ('+'inferred'+')'],['RA3 E2','← CS8412 Cb/E2'],['RB0 E1','← CS8412 Ca/E1'],['RB7 E0','← CS8412 C0/E0']],[['RB1 D0','→ CPLD pin 37'],['RB2 D1','→ CPLD pin 41'],['RB3 D2','→ CPLD pin 39'],['RB4 EXT_L','green LED'],['RB5 INT_R','yellow LED'],['RB6 CAL','red LED']],'TRIS B = 10000001b · TRIS A = 00001000b')},
  {name:'7 · 1998 EPM7064 CPLD (d8203.rpt)', note:'Pin numbers, names and equations from the MAX+plus II 9.6 report (EPM7064SLC44-10, 15/64 macrocells). The ÷3 counter is lpm_counter:156 (dffs0/dffs1).', svg:()=>
    chip(300,40,200,'EPM7064SLC44',[['37','D0'],['41','D1'],['39','D2'],['4','EXTREF'],['8','25M576'],['6','33M'],['31','SR0'],['29','SR1'],['11','SDATA1'],['18','SCLK'],['17','LRCK']],[['14','MCLK'],['21','128FS'],['24','SDATA'],['20','SCLK1 (= !SCLK)'],['25','Q6 (= LRCK)'],['16','CAL (= D2)'],['27','VAL (= D2)'],['34 / 36','osc1 / osc2'],['5 / 9 / 40','DFS / S/M / PDN = GND']],'MAX+plus II 9.6 · 2005 recompile')
    + `<text x="30" y="300" font-size="11" fill="var(--ink)" font-family="var(--mono)">MCLK = !D0·SR0·SR1·48K  +  !D0·dffs1·SR0·!SR1  +  !D0·dffs1·!SR0·SR1  +  D0·EXTREF</text>
       <text x="30" y="318" font-size="11" fill="var(--ink)" font-family="var(--mono)">48K = T-flip-flop on 25M576 (÷2) · dffs0/dffs1 count 0,1,2 on 33M (SR0) or 25M576 (SR1) → ÷3</text>
       <text x="30" y="336" font-size="11" fill="var(--ink)" font-family="var(--mono)">osc1 = !(!D0·!SR1) · osc2 = !(!D0·SR1) · SDATA = D1·SDATA1 · 128FS = T-flip-flop on the MCLK term</text>
       <text x="30" y="360" font-size="11" fill="var(--ink2)">ISS1 (PLD/ISS1/d8203.rpt): MCLK = D0·EXTREF + !D0·(25M576 ÷ 2) only — 48 kHz internal, no SR jumpers, no osc enables, no VAL.</text>`},
];
function viewSchem(m){
  window.__d8203Active=false; let i=0;
  m.innerHTML=card('Schematic set — redrawn from the archive\'s net and pin names (not the original P-CAD / OrCAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">Originals: <span class="mono">D8203-ISS5.sch</span> (P-CAD 2002 binary), <span class="mono">#OBSOLETE/ISS1, ISS2/D8203.DSN</span> (OrCAD). These sheets are built from the ASCII netlist <span class="mono">D8203-ISS5.net</span>, the BOMs, the CPLD report and the firmware's equ lines. Blue labels are nets.</p>`);
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 440" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="428" fill="none" stroke="var(--line)"/><text x="840" y="426" text-anchor="end" font-size="10" fill="var(--ink2)">D8203 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
const FLOW = [ // [label, routine set, text]
  ['RESET → INIT', ['RESET','INIT'], 'TRIS, delay3 = 0x30, clrf flag1, PDN = 1'],
  ['init2 (start of a pass)', ['init2'], 'CAL LED on, D1 = 0 mute, D2 = 0'],
  ['10 × delvis1', ['DELVIS1'], '10 × 48 DELAY2 steps ≈ 0.58 s'],
  ['lock check', ['locked'], 'PDN = 0, SEL = 1, E0/E1/E2 → locked: EXT_L, D0'],
  ['DELVIS3 × delay3', ['DELVIS3','check_lock1','cont_delvis1','check_reset'], '255-step DELAY, then re-check lock'],
  ['DELVIS2: CAL pulse', ['DELVIS2','big_lp','check_lock','cont_delvis'], 'D2 = 1 for 4 × 112 steps ≈ 0.54 s'],
  ['end of pass', [], 'CAL off, D1 = 1; pass 1 → set init_set, pass 2 → main'],
  ['main', ['main','RE_INIT'], 'every ≈57.6 ms: read E0..E2'],
  ['debounce', ['lock_debounce','reset_int','reset_ext','reset_bounce'], '10 equal passes → act / goto init2'],
];
const KL = (()=>{ const f=re=>SRC_LINES.findIndex(l=>re.test(l)); return { calls:f(/^\s*call\s+delvis1/), lock:f(/^\s*bcf\s+PORTB,EXT_L/), d3:f(/^\s*call\s+DELVIS3/), d2:f(/^\s*call\s+DELVIS2/) }; })();
function viewSoft(m){
  window.__d8203Active=true;
  m.innerHTML=`<div class="grid2">
    <div>${card('8203V100.ASM — the line running at the playhead', `<div id="src" class="log" style="max-height:520px;white-space:pre;font-size:11.5px"></div><p class="small muted">The listing is the archive file verbatim. It is assembled here (case-insensitive, as the 1998 build must have been) and executed; the highlighted line is the instruction at the playhead. <span id="asmw"></span></p>`)}</div>
    <div>${card('Flow of the program — the box lit up is running', `<div id="flow"></div>`)}${card('Lock debounce in main (flag1 / bounce_count)', `<div id="fsm"></div>`)}</div></div>
  <div class="grid2">${card('Port map, live', `<div id="ports"></div>`)}${card('CPLD equations, live (d8203.rpt)', `<div id="cpld"></div>`)}</div>
  ${card('How the controls did things', `<div id="btn"></div>`)}`;
  let lastLine=-1;
  const draw=()=>{
    const t=absNow(), p=pins(t), i=entAt(t), E=timeline().ent; const cur = (E&&i>=0)? PROG.code[E.pc[i]] : null; const curLine=cur?cur.line:-1;
    if (D.build!=='1998'){ m.querySelector('#src').innerHTML='<div class="muted">The ISS5 board (2005|38) is selected. Its firmware is not in the archive: the PIC on that board is wired to a CS8427 over SPI, which 8203V100.ASM never talks to. Switch the board to 1998 on the Simulator tab to run the code.</div>'+SRC_LINES.map(l=>`<div>${l.replace(/&/g,'&amp;').replace(/</g,'&lt;')||'&nbsp;'}</div>`).join(''); }
    else if (curLine!==lastLine || !m.querySelector('#src').children.length){
      const box=m.querySelector('#src');
      box.innerHTML=SRC_LINES.map((l,k)=>`<div data-l="${k}" class="${k===curLine?'hl':''}" style="border:none;padding:0 2px"><span class="muted">${String(k+1).padStart(3,' ')}</span> ${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\t/g,'    ')||' '}</div>`).join('');
      const el=box.querySelector('.hl'); if (el) box.scrollTop = Math.max(0, el.offsetTop - box.offsetTop - 160);
      lastLine=curLine; }
    m.querySelector('#asmw').textContent = PROG.warn.join(' · ') + ` · ${Object.keys(PROG.code).length} words`;
    let r = cur? PROG.routine[cur.addr] : '';
    if (cur && E.n[i]>0 && i>0) r = PROG.routine[E.pc[i-1]];
    let item = -1; FLOW.forEach((f,j)=>{ if (f[1].includes(r)) item=j; });
    if (r==='init2' && cur){ const ln = E.n[i]>0 ? PROG.code[E.pc[i-1]].line : cur.line;
      item = ln<KL.calls?1 : ln<KL.lock?2 : ln<KL.d3?3 : ln===KL.d3?4 : ln<=KL.d2?5 : 6; }
    let s=`<svg viewBox="0 0 470 ${FLOW.length*46+20}" style="width:100%"><defs><marker id="d3a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    FLOW.forEach((f,j)=>{ const y=10+j*46; const on = D.build==='1998' && j===item;
      s+=`<rect x="20" y="${y}" width="410" height="34" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="30" y="${y+15}" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${f[0]}</text><text x="30" y="${y+29}" font-size="10.5" fill="${on?'#eef':'var(--ink2)'}">${f[2]}</text>`;
      if (j<FLOW.length-1) s+=`<line x1="225" y1="${y+34}" x2="225" y2="${y+46}" stroke="var(--ink2)" marker-end="url(#d3a2)"/>`; });
    s+=`<path d="M430 ${10+6*46+17} h22 V${10+1*46+17} h-22" fill="none" stroke="var(--ink2)" marker-end="url(#d3a2)"/><text x="456" y="${10+3*46}" font-size="10" fill="var(--ink2)" transform="rotate(90 456 ${10+3*46})">pass 1 → pass 2</text>
      <path d="M20 ${10+8*46+17} h-12 V${10+1*46+17} h12" fill="none" stroke="var(--bad)" marker-end="url(#d3a2)"/><text x="4" y="${10+5*46}" font-size="10" fill="var(--bad)" transform="rotate(-90 4 ${10+5*46})">goto init2 (re-cal)</text></svg>
      <p class="small">Phase now: <b>${p.on?PH[p.ph]:'reset'}</b>${cur&&E.n[i]>0?` · inside DELAY (DELAY2 = ${E.n[i]})`:''}. In DELVIS3, a lock change during pass 1 → <span class="mono">goto reset</span> (start again); during pass 2 → <span class="mono">delay3 = 0x10, goto init2</span>.</p>`;
    m.querySelector('#flow').innerHTML=s;
    // FSM: int_set / ext_set — recompute flag state from the running firmware is not stored; show the rule and the current lock
    const L=lockedAt(t), led=ledsAt(t);
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 460 170" style="width:100%">
      ${[['INT',90,!led.ext,'yellow, D0 = 0'],['EXT',370,led.ext,'green, D0 = 1']].map(([n,x,on,sub])=>`<circle cx="${x}" cy="80" r="44" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="78" text-anchor="middle" font-size="13" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${n}</text><text x="${x}" y="95" text-anchor="middle" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${sub}</text>`).join('')}
      <path d="M134 66 Q230 20 326 66" fill="none" stroke="var(--ink2)" marker-end="url(#d3a2)"/><text x="230" y="30" text-anchor="middle" font-size="10.5" fill="var(--ink2)">E ≠ 111 for 10 passes → goto init2 (re-cal)</text>
      <path d="M326 96 Q230 150 134 96" fill="none" stroke="var(--ink2)" marker-end="url(#d3a2)"/><text x="230" y="150" text-anchor="middle" font-size="10.5" fill="var(--ink2)">E = 111 for 10 passes → goto init2 (re-cal)</text>
      <text x="10" y="166" font-size="11" fill="var(--ink)">Receiver now: ${L?'locked':'no lock'} · ${(L===!!led.ext)?'agrees with the LEDs':'<tspan fill="var(--warn)">disagrees → counting down bounce_count</tspan>'}</text></svg>`;
    const bits=(v,names)=>names.map((n,k)=>`<td class="mono" style="text-align:center;${v[k]?'background:color-mix(in srgb,var(--accent) 30%,transparent)':''}">${n}<br>${v[k]}</td>`).join('');
    const e=ePins(t,p.sel);
    m.querySelector('#ports').innerHTML=`<table class="kv"><tr><th>PORTB</th>${bits([e.e0,p.cal,p.intL,p.extL,p.d2,p.d1,p.d0,e.e1],['RB7 E0','RB6 CAL','RB5 INT_R','RB4 EXT_L','RB3 D2','RB2 D1','RB1 D0','RB0 E1'])}</tr>
      <tr><th>PORTA</th>${bits([0,0,0,0,e.e2,p.pdn,0,p.sel],['','','','','RA3 E2','RA2 PDN','RA1','RA0 SEL'])}</tr></table>
      <p class="small muted">RAM: DELAY1 0x07, DELAY2 0x08, delay3 0x09, bounce_count 0x0A, flag1 0x0B — “allocated” with <span class="mono">ORG 07H … RES 1</span>, which in absolute MPASM reserves program words; the label values just happen to be valid file registers.${D.build!=='1998'?' <b>ISS5 board selected: this map is the 1998 one.</b>':''}</p>`;
    const c=cfgAt(t), sr0 = c.fsJ==='48'||c.fsJ==='44.1' ? 1:0, sr1 = c.fsJ==='48'||c.fsJ==='32' ? 1:0; const k=clockAt(t);
    const term=(on,txt)=>`<div class="mono small" style="padding:2px 4px;border-radius:4px;${on?'background:color-mix(in srgb,var(--accent) 25%,transparent)':''}">${txt}</div>`;
    m.querySelector('#cpld').innerHTML = (D.build==='1998'?'':'<p class="small"><b>ISS5 has no CPLD</b>: the CS8427 does this job. The 1998 equations are shown for reference.</p>') +
      `<p class="small">Inputs now: D0=${p.d0} D1=${p.d1} D2=${p.d2} · SR0=${sr0} SR1=${sr1} (${inf}: jumper → SR wiring) · EXTREF ${lockedAt(t)?'running':'idle'}</p>`+
      term(!p.d0&&sr0&&sr1,'MCLK ← !D0 · SR0 · SR1 · 48K           (25M576 ÷ 2 = 12.288 MHz)')+term(!p.d0&&sr0&&!sr1,'MCLK ← !D0 · dffs1 · SR0 · !SR1        (33M ÷ 3 = 11.2896 MHz)')+term(!p.d0&&!sr0&&sr1,'MCLK ← !D0 · dffs1 · !SR0 · SR1        (25M576 ÷ 3 = 8.192 MHz)')+term(p.d0,'MCLK ← D0 · EXTREF                      (CS8412 recovered)')+
      term(p.d1,'SDATA = D1 · SDATA1   '+(p.d1?'(audio passes)':'(forced 0: mute)'))+term(p.d2,'CAL = VAL = D2   '+(p.d2?'(calibration pulse, V bit set)':''))+term(!p.d0,`osc1 = ${(!p.d0&&!sr1)?0:1} · osc2 = ${(!p.d0&&sr1)?0:1}   (0 = oscillator on, ${inf})`)+
      `<p class="small muted">Result: ${k.txt}</p>`;
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Hardware path</th><th>Firmware reaction (8203V100.ASM)</th></tr>
      <tr><td>Power on</td><td class="small">MCLR → 18 ms DRT → 0x1FF GOTO RESET</td><td class="small mono">INIT → init2 ×2 (delay3 0x30 then 0x1C) → main · ≈25.5 s muted</td></tr>
      <tr><td>Plug / unplug REF</td><td class="small">T1 → CS8412 lock → E2..E0 (SEL = 1)</td><td class="small mono">main: lock_debounce / reset_int, 10 passes, goto init2 → ≈6.6 s re-cal</td></tr>
      <tr><td>REF jumper EXT / LCL</td><td class="small">Chooses which signal reaches T1</td><td class="small">Same as plugging / unplugging</td></tr>
      <tr><td>SAMPLE jumpers</td><td class="small">SR0/SR1 → CPLD MCLK mux, osc1/osc2</td><td class="small"><b>None</b>: the PIC never reads them, so no mute or re-cal</td></tr>
      <tr><td>Reference error (not 111)</td><td class="small">E2..E0 ≠ 111</td><td class="small">Treated as lock (only 111 = unlocked)</td></tr>
      <tr><td>Level jumpers / trims</td><td class="small">Analog gain before the ADC</td><td class="small">None</td></tr>
      <tr><td>Reference rate change</td><td class="small">EXTREF follows; output fs follows</td><td class="small">None (still “locked”)</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__d8203Active=false;
  const ce=(()=>{ const b=D.build; if (b!=='1998'){ D.build='1998'; TL=null; } const v=calEnd(); if (b!=='1998'){ D.build=b; TL=null; } return v; })();
  m.innerHTML=card('What the D8203 is up to — findings from the archive', `<ol>
    <li><b>The firmware in the archive does not fit the ISS4/ISS5 board.</b> <span class="mono">8203V100.ASM</span> (17 Aug ${Y(1998)}) reads CS8412 error pins E0/E1/E2 on RB7/RB0/RA3 and drives D0–D2 into a CPLD. On <span class="mono">D8203-ISS5.net</span> the same PIC16C54 pins carry SPI to a CS8427 (RA0 CS2, RA1 SDI, RA2 SCK, RA3 SDO), RESET / RERR / RESET1700 on RB1–RB3, the LEDs on RB4–RB6 and an alarm transistor on RB7. ISS4 and ISS5 have no CPLD at all. The firmware that shipped on the 2005–2016 boards is not in the archive.</li>
    <li><b>The PIC question in the README is settled by the assembler's own warning.</b> <span class="mono">8203V100.ERR</span>: “Found label after column 1. (RETFIE)”. RETFIE does not exist on the 12-bit PIC16C5x core, so MPASM took it as a label: the code really was built for P=16C5X, and the BOMs say PIC16C54(A). The <span class="mono">Processor=0x673a</span> line is only in the July 2007 copy of <span class="mono">D8203.PJT</span>; the 1998 <span class="mono">OLD/D8203.PJT</span> has none. That 2007 file also says <span class="mono">Frequency=140000000</span> (140 MHz) and still lists <span class="mono">8203.asm</span>, not 8203V100.ASM.</li>
    <li><b>The 1998 manual's “25 seconds” is exactly what the code does.</b> Pass 1 = 10 × 48 + 48 × 255 + 4 × 112 DELAY2 steps, pass 2 = 10 × 48 + 28 × 255 + 4 × 112: 21 236 steps × 1.2 ms (the source's own figure) = ${ce?ce.toFixed(1):'25.5'} s. A reference change costs 10 debounce passes plus 10 × 48 + 16 × 255 + 448 steps ≈ 6.6 s (“approximately 7 seconds”). The 2009|42 manual's 16 s / 2 s match no code in the archive, which fits finding 1.</li>
    <li><b>“Two calibration setup”.</b> The whole start-up runs twice (<span class="mono">init_set</span> in flag1): a long pass (delay3 = 0x30) and a shorter one (0x1C), each ending in a CAL pulse on D2. Between them, <span class="mono">bsf PORTB,D1</span> un-mutes and <span class="mono">init2</span> mutes again 8 instructions later (≈9 µs, less than one 48 kHz sample) — a possible one-sample click ${inf}.</li>
    <li><b>A reference change during pass 1 restarts everything.</b> <span class="mono">check_reset</span>: with init_set clear it does <span class="mono">goto reset</span>, so plugging a reference in the first ≈15 s starts the 25 s over. It also jumps out of DELVIS2/DELVIS3 without returning; on the 2-level PIC16C5x stack the abandoned return addresses are simply overwritten.</li>
    <li><b>Any receiver error counts as “locked”.</b> The code only asks whether E0, E1 and E2 are all 1 (CS8412 code 111 = no lock). Validity, parity, CRC and bi-phase errors (001–110) keep the green LED on and MCLK on the reference.</li>
    <li><b>The sample-rate jumpers bypass the firmware.</b> SR0/SR1 go only to the CPLD MCLK multiplexer, so moving them on a live card changes fs with no mute and no re-calibration. With neither jumper (SR0 = SR1 = 0) no MCLK term is true and the converter has no clock on internal reference.</li>
    <li><b>The CPLD input called 25M576 is a 24.576 MHz clock.</b> Its T-flip-flop ‘48K’ ÷ 2 gives 12.288 MHz = 256 × 48 kHz and the ÷3 counter 8.192 MHz = 256 × 32 kHz; the other input 33M ÷ 3 = 11.2896 MHz needs 33.8688 MHz (${inf}, from the arithmetic). The first CPLD (<span class="mono">PLD/ISS1/d8203.rpt</span>) only had 48 kHz: SR0/SR1, the ÷3 counter, osc1/osc2 and VAL came later.</li>
    <li><b>Constant pins burnt into the CPLD.</b> DFS, S/M and PDN are outputs equal to GND (“stuck at GND” warnings), and the ACF still assigns pins to <span class="mono">D3</span> and <span class="mono">sdata2</span>, which no longer exist. The report was recompiled in May ${Y(2005)}, after the ISS4 board had already dropped the CPLD.</li>
    <li><b>Assembler habits that only worked by luck.</b> RAM is “allocated” with <span class="mono">ORG 07H / RES 1</span>, which reserves program words; the labels happen to equal free file registers 0x07–0x0B. The code calls <span class="mono">delvis1</span> and <span class="mono">reset</span> but defines <span class="mono">DELVIS1</span> and <span class="mono">RESET</span>, so it only builds case-insensitively. The delay comment (“1/1.53MHZ”, “DELAY2 = 15 FOR RELAY PULSE(5mS)”) disagrees with “DELAY2 = 1 will give 1.2 msec” and looks copied from a relay product.</li>
    <li><b>Eight builds in three days.</b> <span class="mono">OLD/8203V1X0…V1X8.ASM</span> (10–11 Aug ${Y(1998)}) and <span class="mono">8203TEST.ASM</span> show the tuning: initial delay 0x50 → 0x30, second pass 0x10 → 0x1C, DELVIS2 0x08 → 0x04 (“0x08 gives good consistent levels”), and <span class="mono">locked</span> learning to clear INT_R. The July <span class="mono">8203.ASM</span> calibrated once and had a jump to the wrong label (<span class="mono">goto cont_delvis</span> from DELVIS3).</li>
    <li><b>Two manuals, two boards.</b> <span class="mono">D8203MAN.WPD</span> and the font-encoded <span class="mono">d8203.pdf</span> (its text is a glyph substitution, which is why extraction fails) describe the 1998 card: EPM7064 in Fig 1.2, TERM 75/110/HiZ, REF EXT/LCL/OUT, level jumpers, a front ¼″ monitor jack, 25 s / 7 s. <span class="mono">D8203MAN-1.wpd</span> (${Y(2009)}) describes ISS5: H1 Frame/Ext, H2 32/44.1/48, H4 75/110, no monitor jack, +24 dBu only, 16 s / 2 s.</li>
    <li><b>Small loose ends.</b> H3 (PLL1700 SR0) is on the board but in no manual. P1 pin 16 (“8”) carries an alarm transistor (Q1, RB7) and <span class="mono">D8203TR4.cdr</span> names a terminal ALARM, yet <span class="mono">D8203tr4.pdf</span> shows it as NOT CONNECTED. The 75 Ω and 110 Ω cards differ only in R7/R8/R15/R16 (75R / 110R) and four select-on-test caps C62–C65 (2016 pick-and-place programs). The ISS5 ECO log flips C26/C37/C51/C53/C59 between 10\\35 and 10\\10 five times in one afternoon (8 Jul ${Y(2005)}).</li>
    <li><b>Artwork 2026|59: rear modules now from ${SIM.src(RMG_DIR+'D8203 - rear module options.cdr','D8203 - rear module options.cdr')} (CorelDRAW X3, 2012-01-16).</b> BNC2, BNC4, TB8205P and TB8205P/75 are its vectors (black plate, white legends) through Corel's own ${SIM.src(RMG_DIR+'D8203 - rear module options.pdf','PDF export')}, since libcdr draws the screw-terminal symbol font as giant letters. Every module leaves four screw terminals marked NOT CONNECTED (BNC2/BNC4: two per block; TB8205P(/75): right-hand 1, 2, 5 and 6), so the D8203 uses only part of the shared terminal plate. The 2002 terminal pages ${SIM.src(E+'D8203tr2.cdr','D8203tr2.cdr')} / ${SIM.src(E+'D8203tr3.cdr','D8203tr3.cdr')} show the same modules ten years earlier, and ${SIM.src(E+'D8203TR1.CDR','D8203TR1.CDR')} / TR4 the older QC8200QCP, TB8205 and ST8200/ST8201A solder options.</li>
    <li><b>Duplicates.</b> <span class="mono">D8203 - WAS IN D8204 FOLDER #PROBLEM</span> is byte-identical to <span class="mono">#Engineering</span> (ASM, GDF, manual) except <span class="mono">PLD/d8203.rpt</span>, an earlier compile (Jan ${Y(2004)}) with identical equations.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>PIC instruction time ${SIM.fmtDur(TCY)} (Fosc ≈ 3.41 MHz) from the source comment “DELAY2 = 1 will give 1.2 msec” ${inf}. Device-reset timer 18 ms ${inf}.</li>
    <li>CS8412 / CS8427 lock time ${LOCK_T*1000} ms ${inf}; when SEL is low its pins are modelled as fixed channel-status bits.</li>
    <li>SAMPLE jumper → SR0/SR1 wiring and osc1/osc2 polarity are read off the equations ${inf}. PDN's destination on the 1998 board ${inf}.</li>
    <li>ISS5 behaviour (16 s / 2 s, 0.1 s debounce) follows the 2009 manual; the mechanism is ${inf} because the firmware is missing.</li>
    <li>Analog: ideal gain to 0 dBFS = +24 dBu (or the jumper level) plus the trim; clipping is hard at 0 dBFS.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>D8203 - #Engineering/D8203 - #V100 #SOFTWARE/8203V100.ASM, .ERR, D8203.PJT, OLD/*.ASM</li>
    <li>D8203 - #Engineering/D8203 - #PLD #SOFTWARE/d8203.rpt, ISS1/d8203.rpt</li>
    <li>D8203 - #Engineering/D8203 - #PCB #SOFTWARE/D8203-ISS5.net, .bom, .pnp, .ECO, #GERBERS/D8203-ISS5.zip, #OBSOLETE/*</li>
    <li>D8203 - #Engineering/D8203MAN.WPD, d8203.pdf, D8203MAN-1.wpd, D8203tr4.pdf · D8203 - #PNP #2016/*.prg</li>
    <li>8200 Series Rear Module options…/D8203 - rear module options.cdr, .pdf</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'d8203', name:'D8203 · Analog to AES/EBU converter (1998|31)', duration:1,
  product:'D8203', year:1998, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8203 - #Master #MF82',
  summary:'Stereo analog to 24-bit AES/EBU converter card for the MF82 frame, with four outputs and an internal 48/44.1/32 kHz clock or lock to an external AES reference. The 1998 PIC firmware runs here instruction by instruction: its two-pass self-calibration takes 25 s at power-up and about 7 s at every reference change, exactly as the 1998 manual says.',
  highlights:['8203V100.ASM executed on a PIC16C5x interpreter','EPM7064 clock multiplexer from the fitted equations','ISS5 board drawn from the 2012 Gerbers','Real rear-module artwork (BNC2, BNC4, TB8205P)','The 2005 board needs firmware that is not in the archive'],
  footnotes:[
    {text:'Rear-module art: BNC2, BNC4, TB8205P and TB8205P/75 are the vectors of the 2012 CorelDRAW guide, via its Corel PDF export (libcdr renders the terminal-block symbol font as giant text).', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8203 - rear module options.cdr'},
    {text:'Every D8203 rear module leaves four screw terminals marked NOT CONNECTED (on the TB8205P(/75), right-hand 1, 2, 5 and 6): the card uses only part of the shared terminal plate.', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8203 - rear module options.cdr'},
    {text:'The 2002 terminal sheets D8203tr2.cdr / D8203tr3.cdr already show BNC2/BNC4 and TB8205P(/75); D8203TR1.CDR and D8203TR4.cdr show the earlier QC8200QCP, TB8205 and ST8200/ST8201A solder options.', src:'#MF8200 #SERIES/D8203 - #Master #MF82/D8203 - #Engineering/D8203tr3.cdr'},
    {text:'The D8203 CDR set is stored three times: in D8203 - #Engineering, its #ARCHIVE folder and “D8203 - WAS IN D8204 FOLDER #PROBLEM”, with the same dates and sizes.', src:'#MF8200 #SERIES/D8203 - #Master #MF82/D8203 - #Engineering/D8203 - WAS IN D8204 FOLDER #PROBLEM/D8203tr3.cdr'},
    {text:'D8203MAN.CDR (1998-04-16, 311 004 bytes) has the same date and size as D8204MAN.CDR and D8202 ISS2 D8202MAN.CDR: one manual-cover template copied between products.', src:'#MF8200 #SERIES/D8203 - #Master #MF82/D8203 - #Engineering/D8203MAN.CDR'},
  ],
  depth:'Full model',
  stepUnits:[
    {label:'1 PIC instruction', period:()=>TCY},
    {label:'1 DELAY2 step (1.2 ms)', period:()=>1023*TCY},
    {label:'1 main pass (≈57.6 ms)', period:()=>PASS_T},
    {label:'1 AES frame', period:()=>1/(clockAt(absNow()).fs||48000)},
    {label:'1 AES block', period:()=>192/(clockAt(absNow()).fs||48000)},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms'],[PASS_T,'1 main pass (57.6 ms)'],[0.01,'10 ms'],[1023*TCY*2,'2 DELAY2 steps (2.4 ms)'],[0.0002,'200 µs'],[4/48000,'4 AES frames (83 µs)'],[1e-5,'10 µs (PIC instructions)']],
  defaultZoom:0,
  init(){ TL=null; },
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
