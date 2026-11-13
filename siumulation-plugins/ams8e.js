/* =====================================================================
   AMS8E — the AMS8 "E" board set: production masters (Ward-Beck Systems, 2006|39–2016|49)
   Plugin for the WBS Device Simulator (../siumulation.html)

   The folder holds production data, not firmware: BOMs, Gerbers, IPC netlist, pick-and-place
   programs, quotes and two hand-written test sheets. The model therefore simulates what the boards
   do electrically, using the firmware that drives them (AMS81/AMS82 and the 32ME/RD22 release)
   only where a board's behaviour depends on it.
   Sources used (all in this archive):
   - AMS8E - #Master/AMS8E-1 - #Master/AMS8E-1 ISS5 - ALTIUM.csv, AMS8E-1-ISS5-GERBER.zip
       (Ams8e-1iss5.GTO/.GTS/.GM6 and Ams8e-1iss5-net.ipc, IPC-D-356A, 01/11/2012)
   - AMS8E - #Master/AMS8E-4 - #Master/AMS8E-4-PCAD.csv, AMS8E-4 FINAL BOM.xlsx, AMS8E-4 Production Notes.docx,
       AMS8E-4 PANEL PRODUCTION GERBERS/AMS8E-4PANEL.TSS/.TSM/.BSS/.BSM (P-CAD 2002, 12-Jun-2008)
   - AMS8E - #Master/AMS8E - 4MeterPCBRedesign #RD #RD55/NOtes.txt.txt
   - AMS8E - #Master/AMS8E - #TESTREPORT/AMS8E-1-CURRENT CONSUMPTION.pdf, AMS8E-8-19OCT06.pdf (scans, read by eye)
   - AMS8E - #Master/AMS8E - #PNP/**.prg (2016|49 pick-and-place programs for every board)
   - AMS81 - #Master/…/AMS8 - #Software #Sharc #v205c/ams81_INIT.ASM, ams81_main.asm (AMS8-1 meter mux)
   - XXX - ENGINEERING - 2016 RD FILES/RD22-MADI/Software/01AV0200 firmware package/SHARC/v050000 (32ME meter mux,
       vumeter.asm, ams81_vu_data.dat) and RD22-MADI/Hardware/Regulator/PowerNThermalAnalysis.xlsx, TPSThermalEstimate.txt
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const FS = 48000;
const inf = '<span class="tag-inf">inferred</span>';

/* ---------------- constants from the source ---------------- */
const K = {
  CORE: 49.152e6,               // SHARC core: CLKIN 24.576 MHz (AMS8E-1 X1) × 2 — timer 0 period 2 = "24 MHz" in ams81_INIT.ASM
  T1_V205: 153600,              // AMS8-1 v205c ams81_INIT.ASM: TPERIOD1 (mux rate)
  T1_32ME: 12000,               // 32ME 01AV0200 SHARC v050000: TPERIOD1
  REXT: 365,                    // AMS8E-4 R12–R15 (current-set resistor, one per driver)
  VREF: 1.24,                   // TLC5926 reference — datasheet value, not in the archive (inferred)
  kVU: 0.000319752, kA: 0.02276277, kD: 0.000031978,   // vumeter.asm
  // AMS8E-8 power amp test sheet, 19 Oct 2006|39
  AMP_GAIN: 7.8, AMP_MAX_DBU: 22.8, AMP_MAX_V: 10.67, AMP_MAX_W: 14, AMP_IQ_P: 0.060, AMP_IQ_N: 0.055,
  AMP_I3W_P: 0.620, AMP_I3W_N: 0.570, AMP_NOISE: -90.25, RL: 8,
};
K.IOUT = K.VREF*15/K.REXT;                       // ≈ 51 mA per output while on
const SEG_TH = [114,94,82,74,64,60,56,52,48,46,44,42,40,38,36,34,32,28,24,20,16,12];   // ams81_vu_data.dat first index per segment
const SEG_LBL = ['-36','-26','-20','-16','-12','-10','-8','-6','-4','-3','-2','-1','0','+1','+2','+3','+4','+6','+8','+10','+12','+14'];
const SEGCOL = i => i<10? '#36d05a' : i<18? '#ffd23a' : '#ff3b2f';
const litSegs = v => { let n=0; for (let i=0;i<22;i++) if (v<=SEG_TH[i]) n=i+1; return v>=115?0:n; };
const dBu = v => 20*Math.log10(v/0.7746);

/* AMS8E-1 test sheet (+5 V current, "AMS81 MAIN BOARD") */
const MB_TEST = [ {io:false,dolby:false,I:0.35,T:34}, {io:true,dolby:false,I:0.40,T:42}, {io:false,dolby:true,I:0.64,T:35}, {io:true,dolby:true,I:0.74,T:42} ];
/* RD22 PowerNThermalAnalysis.xlsx (estimates) */
const RAILS = [ ['+1V2','FPGA VCCINT','TPS70402 (REG2) ch 1',0.28563], ['+2V5','FPGA VCCA','TPS70402 (REG2) ch 2',0.03814], ['+3V3','all misc','LM1117',0.7], ['+3V3_2','Dolby CAT1100','second TPS70402',1.7] ];

/* Board positions on AMS8E-1 ISS5 (inches from the board's lower-left corner), from the IPC netlist pad
   extents minus the (1.23, 10.92) offset that lines the netlist up with the Gerber outline. */
const MB_PARTS = {
  U4:{b:[3.98,13.15,4.8,13.98],t:'U4 Cyclone IV EP4CE40F23C6N',d:'484-ball FBGA, 1 mm. Routes the AES receivers and SRC, the TDM links to the SHARC and the MADI/option header H4. The RD22 project files target EP4CE30F23I7 instead (see Findings).'},
  U1:{b:[5.31,12.43,6.49,13.62],t:'U1 ADSP-21065 SHARC',d:'MQFP-208. Meters (vumeter.asm), phase meter, volume, LED shifter. Boots from U2.'},
  U2:{b:[5.54,13.91,6.09,14.36],t:'U2 AM29LV040B in PLCC-32 socket',d:'Boot flash for the SHARC, socketed so it can be programmed off-board. RD22 production notes report PLCC32 programming failures.'},
  U14:{b:[5.72,12.33,6.33,12.94],t:'U14 ATmega128L',d:'Main-board MCU, X2 4.9152 MHz. Card detect, SPI to the FPGA, UARTs to the front board (P4 LR/LT, P7 SDR/SDT).'},
  U24:{b:[4.68,12.48,5.01,12.71],t:'U24 CS8416',d:'192 kHz AES receiver for the sync/reference inputs P8 (REF75) and P2 (REF110).'},
  U10:{b:[4.2,12.48,4.53,12.76],t:'U10 AD1895',d:'Asynchronous sample-rate converter (LRCLK_OUTAD1895, SMODEIN/OUT nets).'},
  REG2:{b:[2.49,12.18,2.74,12.46],t:'REG2 TPS70402',d:'Dual adjustable LDO from +5 V: +1V2 (FPGA core) and +2V5 (FPGA analog/PLL). RESET_TPS70402 net.'},
  X3:{b:[3.11,13.4,3.31,13.57],t:'X3 CSX750V 24.576 MHz',d:'VCO_OUT1: 48 kHz-family master clock (512 × 48 kHz).'},
  X4:{b:[3.11,12.94,3.31,13.1],t:'X4 CSX750V 22.5792 MHz',d:'VCO_OUT2: 44.1 kHz family (512 × 44.1 kHz). Left out of the 32ME-MADI pick-and-place program.'},
  H4:{b:[3.37,14.85,4.97,14.95],t:'H4 2×17 option header',d:'DATA1–8_OUT_I64, DATA1–8_IN_I64, FSYNC_IN/OUT_I64, MCLK_IN/OUT_I64, DATAn_RESERVED: the i64 MADI module or the 32ME-N uNet.'},
  H3:{b:[2.04,14.85,2.94,14.95],t:'H3 2×10 meter data',d:'MD1–MD8 differential pairs: the LED shift lines to the front board (32ME-5 H10) and on to the AMS8E-4 boards.'},
  P5:{b:[2.17,14.5,6.58,14.65],t:'P5 72-pin SIMM socket',d:'“CAT_NO_552_RA”: Dolby card connector (RESET_552, MAP0/1, PRG0–2, DLM0–2, PLE/PLS/PGP, ACS, PDN).'},
  P13:{b:[2.19,11.73,2.58,14.23],t:'P13 Dolby CAT1100 100-pin',d:'Molex 55091-1075. The CAT1100 Dolby decoder card is the largest load: the test sheet shows +0.29 A at +5 V with it fitted.'},
  H9:{b:[3.45,11.05,4.35,11.15],t:'H9 AES 1–4 in/out',d:'AES1–4_IN_P/N and AES1–4_OUT_P/N.'},
  H10:{b:[3.45,11.72,4.35,11.82],t:'H10 AES 5–8',d:'AES5–8 in/out.'},
  H11:{b:[4.8,11.05,5.7,11.15],t:'H11 AES 9–12',d:'AES9–12 in/out.'},
  H12:{b:[4.79,11.72,5.7,11.82],t:'H12 AES 13–16',d:'AES13–16 in/out.'},
  JTAG1:{b:[5.82,14.91,6.22,15.02],t:'JTAG1',d:'ATmega128 JTAG/ISP (H2X5).'},
  H2:{b:[5.25,14.91,5.66,15.01],t:'H2 FPGA config',d:'DCLK, CONF_DONE, N_CONFIG, NCE, CNF_DATA, NCS, ASDI: Active-Serial programming of the EPCS device.'},
  U101:{b:[2.01,12.05,2.23,12.21],t:'U101/104/107/110 CS4334 DACs',d:'Four stereo DACs feeding eight NE5532 stages (U100–U111): the analog monitor outputs.'},
};
const OFF=[1.23,10.92];

/* ---------------- device state ---------------- */
const D = {
  board: 'ams8e4',           // which board is on the bench
  fw: 'v205',                // which SHARC build drives the meter: 'v205' (AMS8-1, 1 board) or '32me' (v050000, 4 boards)
  level: -20, burst: false,  // meter test tone (dBFS)
  oe: 100,                   // % brightness (OE duty) — the FPGA brightness_ctl, modelled as a duty factor (inferred)
  io: true, dolby: false,    // AMS8E-1 configuration for the current test
  ampIn: -4, ampF: 1000, ampLoad: 8, ampFix: true,   // AMS8E-8
  driver: 'TLC5926',
  pick: 'U4',
  log: [],
};

/* ---------------- meter-board model ---------------- */
function muxStep(){ return (D.fw==='v205'? K.T1_V205 : K.T1_32ME)/K.CORE; }
function phases(){ return D.fw==='v205'? 4 : 16; }        // v205: mux_count 0..3, one board; v050000: 4 boards × 4
function muxAt(t){ const k=Math.floor(t/muxStep()), c=k%phases(); return {k, phase:c%4, board: D.fw==='v205'?0:(c>>2)&3, t0:k*muxStep()}; }
/* per-sample VU/PPM for one test channel (vumeter.asm), sampled each ms */
let MT=null, MK='';
function meter(){
  const key=[D.level,D.burst].join(); if (key===MK) return MT; MK=key;
  const N=1000, step=FS/N, vu=new Uint8Array(N), pk=new Uint8Array(N); let V=0,P=0; const A=Math.pow(10,D.level/20), w=2*Math.PI*1000/FS;
  for (let n=0;n<FS;n++){ const on = !D.burst || ((n/FS+0.05)%0.25)<0.010; const x=on? A*Math.sin(w*n):0, x2=x*x;
    V+=(x2-V)*K.kVU; P=Math.max(P+(x2-P)*K.kA, P+(x2-P)*K.kD);
    if ((n+1)%step===0){ const i=(n+1)/step-1; vu[i]=Math.max(0,Math.min(255,Math.round(-20*Math.log10(Math.max(V,1e-13)))-6)); pk[i]=Math.max(0,Math.min(255,Math.round(-20*Math.log10(Math.max(P,1e-13))))); } }
  MT={vu,pk,N}; return MT;
}
function meterAt(t){ const M=meter(); const i=Math.max(0,Math.min(M.N-1,Math.floor(t*M.N))); return {vu:M.vu[i], pk:M.pk[i]}; }
/* which bars are being driven in this phase: v205 shifts shift_data[mux] and shift_data[mux+4] → bars k and k+4 */
function barsOn(ph){ return [ph, ph+4]; }
function ledStats(t){
  const r=meterAt(t), n=litSegs(r.vu), d=litSegs(r.pk);
  const perBar = n + (d>n?1:0);                     // VU bar plus a PPM dot above it
  const onFrac = (D.fw==='v205'?1/4:1/16) * D.oe/100;
  const Iavg = 8*perBar*K.IOUT*onFrac*(D.fw==='v205'?1:1);      // per board, eight bars carry the same test tone
  return {n,d,perBar,onFrac,Iavg, Ipk:2*perBar*K.IOUT};
}

/* ---------------- AMS8E-8 power-amp model (from the 19-Oct-2006 test sheet) ---------------- */
function amp(){
  const g=Math.pow(10,K.AMP_GAIN/20); const vin=0.7746*Math.pow(10,D.ampIn/20); let vout=vin*g;
  const vmax = K.AMP_MAX_V*Math.sqrt(D.ampLoad/8)*(D.ampLoad<8?0.95:1); const clip = vout>vmax; if (clip) vout=vmax;
  const P=vout*vout/D.ampLoad, ipk=vout*Math.SQRT2/D.ampLoad;
  const Ip = K.AMP_IQ_P + 2*ipk/Math.PI, In = K.AMP_IQ_N + 2*ipk/Math.PI;          // class-AB rail current, two channels driven
  const Pin = 12*(Ip+In), diss = Pin - 2*P;
  const osc = !D.ampFix;
  return {vin,vout,clip,P,ipk,Ip,In,Pin,diss,osc, dbuOut:dBu(vout)};
}
function mbPower(){
  const row = MB_TEST.find(r=>r.io===D.io && r.dolby===D.dolby); return {I:row.I, P:row.I*5, T:row.T};
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,trace:tr}); if (D.log.length>50) D.log.length=50; SIM.refresh(); }
const A = {
  board(b){ act('Put '+BOARDS[b].name+' on the bench', tr=>{ D.board=b; tr(BOARDS[b].what); tr('Pick-and-place: '+BOARDS[b].pnp); }); },
  fw(f){ act('Drive the meter board with '+(f==='v205'?'AMS8-1 SHARC v205c':'32ME SHARC v050000'), tr=>{ D.fw=f;
    tr(`ams81_INIT.ASM: TPERIOD1 = ${f==='v205'?K.T1_V205:K.T1_32ME} → timer 1 every ${SIM.fmtDur(muxStep())} at 49.152 MHz → tmzl_svc sets ustat2 bit 0`);
    tr(f==='v205'? 'shifter: mux_count 0..3 on ONE board; shifts shift_data[mux] and shift_data[mux+4] (bars k and k+4), 64 bits, then STROBE (FLG2) and OE (FLG3)'
                 : 'shifter: mux_count2 0..15 = 4 boards × 4 phases; disp_group selects the latch enable FLG6/FLG5/FLG2/FLG4');
    tr(`Each LED is lit ${f==='v205'?'1/4':'1/16'} of the time; the whole board repeats every ${SIM.fmtDur(muxStep()*phases())} (${(1/(muxStep()*phases())).toFixed(0)} Hz)`); }); },
  level(v){ D.level=v; MK=''; SIM.refresh(); },
  driver(d){ act('Fit '+d+' as U2–U5', tr=>{ D.driver=d; tr(d==='A6276'? 'Allegro A6276 16-bit serial-input constant-current sink (P-CAD BOM AMS8E-4-PCAD.csv). Production notes: obsolete.' : 'TI TLC5926IDWR (AMS8E-4 FINAL BOM, issue 2 PCB): same 24-pin SOIC pin-out and serial protocol, so “no firmware modifications are required”.');
    tr(`R_EXT = R12–R15 = 365 Ω → I_OUT ≈ ${(K.IOUT*1e3).toFixed(1)} mA per lit segment (1.24 V × 15 / R_EXT; formula ${'from the TLC5926 datasheet'}, not archived)`); }); },
  config(io,dolby){ act(`Main board: ${io?'1 input / 1 output':'no I/O'}, ${dolby?'Dolby card fitted':'no Dolby card'}`, tr=>{ D.io=io; D.dolby=dolby; const p=mbPower();
    tr(`AMS8E-1-CURRENT CONSUMPTION.pdf: +5 V = ${p.I.toFixed(2)} A (${p.P.toFixed(2)} W), board temperature ${p.T} °C`);
    if (dolby) tr('The Dolby CAT1100 on P13 adds about 0.29 A (1.45 W). RD22 estimated 1.7 A at 3.3 V for it: the measurement is far lower.'); }); },
  ampIn(v){ D.ampIn=v; SIM.refresh(); },
  ampFix(on){ act(on?'Apply the 2006 AMS8E-8 fix':'Undo the AMS8E-8 fix (issue 2 as built)', tr=>{ D.ampFix=on;
    tr(on? 'C1, C2 changed from 100 pF to 27 pF; 1000 pF added across the LM4766 differential inputs (pins 7–8 and 12–13)' : 'C1, C2 = 100 pF, no input capacitors');
    tr(on? '“This modification will fix the oscillation and noise problem on iss. 2 board.” The 2016 pick-and-place program already places C1/C2 = 27p.' : 'The test sheet reports oscillation and noise on the issue-2 board in this state'); }); },
  pick(p){ D.pick=p; SIM.refresh(); },
};

/* ---------------- boards ---------------- */
const BOARDS = {
  ams8e1:{name:'AMS8E-1 main board (ISS5)', what:'SHARC + Cyclone IV + ATmega128L + CS8416 + AD1895 + 4 × CS4334, 8 layers, 5.800″ × 4.175″ (Gerber outline; the 5.175″ in the fab notes includes the panel rails).', pnp:'ISS2–ISS5 programs; ISS5 has a normal and a 32ME-MADI variant (75 Ω → 110 Ω, X4 omitted).'},
  ams8e4:{name:'AMS8E-4 LED meter board', what:'8 bars × 22 LEDs + 12 indicator LEDs, 4 × 16-bit constant-current drivers, 4 P-FET row switches. 3.66″ × 1.50″, panelised ×5.', pnp:'Ams8e-4-T.prg (192 LEDs/parts), Ams8e-4b-B.prg (40 parts).'},
  ams8e5:{name:'AMS8E-5 control/display board', what:'RS-485 (4 × 75176), 1N4003 ×3 LED-supply drop, encoder and display (firmware in AMS82). The 32ME-5 front board was derived from AMS8E-5 issue 4.', pnp:'iss2, 2b, 3, 3b, 4b and panel programs; AMS8E-5-6 adds 24 × 1K and 8 × 301 Ω.'},
  ams8e8:{name:'AMS8E-8 speaker power amp', what:'LM4766 stereo power amp for the AMS8 speakers. Test sheet 19 Oct 2006|39: +7.8 dB into 8 Ω, 22.8 dBu (10.67 V, 14 W) maximum.', pnp:'Ams8e-8panel-T.prg: 34 SMD parts (5K1 ×6, 20K ×6, 27p ×4, 0.1 ×5 …).'},
  ams8e10:{name:'AMS8E-10 double meter board', what:'384–399 LEDs and 8 drivers/8 row FETs: two AMS8E-4s on one board (probably the 16-channel AMS16, inferred).', pnp:'iss1, iss1×2, iss2; iss2 lists the FET as “FDC6734” (see Findings).'},
  ams8e12:{name:'AMS8E-12 (analog)', what:'215 parts: 2K55 ×24, 31K6 ×16, 27p ×16, 10 µF/10 V ×29 — an analog input/output board; its role is not documented (inferred).', pnp:'Ams8e-12iss2-T.prg only.'},
};

/* ================================================================ DRAWING ================================================================ */
const ASSET='siumulation-plugins/assets/';
/* AMS8E-4 drawn from its Gerbers: assets/ams8e-4-top-*.png and -bot-*.png, 548 × 225 px at 150 dpi = 3.66″ × 1.50″
   (window X 5.11–8.77″, Y 2.375–3.875″ of AMS8E-4PANEL.*). LED centres come from the TSM pad pairs. */
const B4 = { x0:5.11, y1:3.875, dpi:150 };
const b4x = X => (X-B4.x0)*B4.dpi, b4y = Y => (B4.y1-Y)*B4.dpi;
const BARX = [5.64,5.99,6.34,6.69,7.19,7.54,7.89,8.24];
function meterBoardSVG(t, side){
  const mx=muxAt(t), r=meterAt(t), n=litSegs(r.vu), d=litSegs(r.pk), on=barsOn(mx.phase);
  let s=`<svg viewBox="0 0 548 225" style="width:100%;max-width:820px;display:block;border-radius:6px" role="img" aria-label="AMS8E-4 ${side} side, from the Gerbers">
    <defs><filter id="g8e" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="548" height="225" rx="4" fill="#145a32"/>`;
  if (side==='bottom'){
    s+=`<g transform="translate(548,0) scale(-1,1)"><image href="${ASSET}ams8e-4-bot-pads.png" width="548" height="225"/><image href="${ASSET}ams8e-4-bot-silk.png" width="548" height="225"/></g>`;
    const U=[['U5',120,10],['U4',120,100],['U3',345,10],['U2',345,100]];   // driver outlines read off the bottom silk (mirrored view)
    U.forEach(([u,x,y])=>{ s+=`<rect class="u4" data-u="${u}" x="${x}" y="${y}" width="80" height="88" fill="rgba(255,180,60,${D.oe/100*0.12})" stroke="var(--warn)" stroke-opacity=".5" stroke-width="1.5" style="cursor:pointer"><title>${u} ${D.driver}: 16 sinks, R_EXT 365 Ω — all four are clocked every phase; click to probe</title></rect>`; });
    return s+`<text x="6" y="218" font-size="10" fill="#cfe">bottom side (viewed from below): ${D.driver} drivers, FDC634P / 2N4401 / 2N4403 row switches, header H5 (DNI)</text></svg>`;
  }
  s+=`<image href="${ASSET}ams8e-4-top-pads.png" width="548" height="225" opacity=".5"/><image href="${ASSET}ams8e-4-top-silk.png" width="548" height="225"/>`;
  let lit='';
  BARX.forEach((X,b)=>{ const driven = on.includes(b) && D.oe>0;
    for (let i=0;i<22;i++){ const y=b4y(2.55+0.06*i), x=b4x(X); const want = i<n || (d && i===d-1);
      const r_=`<rect x="${x-7}" y="${y-3.2}" width="14" height="6.4" rx="1" fill="${want? SEGCOL(i):'#26302a'}" opacity="${want? (driven?1:0.28):1}"/>`; if (want&&driven) lit+=r_; else s+=r_; }
    if (driven) s+=`<rect x="${b4x(X)-10}" y="${b4y(3.84)}" width="20" height="${b4y(2.52)-b4y(3.84)}" fill="none" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="3 3"/>`; });
  [5.815,6.515,7.365,8.065].forEach((X,p)=>{ s+=`<circle cx="${b4x(X)}" cy="${b4y(3.27)}" r="4" fill="#1f2a44"><title>blue indicator (L178/L181/L185/L188, FINAL BOM)</title></circle><circle cx="${b4x(X)}" cy="${b4y(2.67)}" r="4" fill="#3a1a1a"><title>red indicator</title></circle><circle cx="${b4x(X)}" cy="${b4y(2.85)}" r="4" fill="#3a1a1a"><title>red indicator</title></circle>`; });
  return s+`<g filter="url(#g8e)">${lit}</g><text x="6" y="218" font-size="10" fill="#cfe">phase ${mx.phase+1}/4${D.fw==='32me'?' · board '+(mx.board+1)+'/4':''}: bars ${on[0]+1} and ${on[1]+1} driven; dim = waiting for their turn</text></svg>`;
}
/* AMS8E-1 drawn from Ams8e-1iss5.GTO/.GTS: assets/ams8e-1-top-*.png, 696 × 501 px at 120 dpi = 5.800″ × 4.175″ */
function mainBoardSVG(){
  const P=(x,y)=>[(x-OFF[0])*120,(4.175-(y-OFF[1]))*120];
  let s=`<svg viewBox="0 0 696 501" style="width:100%;max-width:820px;display:block;border-radius:6px" role="img" aria-label="AMS8E-1 ISS5 top side from the Gerbers"><rect width="696" height="501" fill="#145a32"/>
    <image href="${ASSET}ams8e-1-top-pads.png" width="696" height="501"/><image href="${ASSET}ams8e-1-top-silk.png" width="696" height="501"/>`;
  for (const k in MB_PARTS){ const b=MB_PARTS[k].b; const [x1,y1]=P(b[0],b[3]), [x2,y2]=P(b[2],b[1]); const sel=D.pick===k;
    s+=`<rect class="mbp" data-p="${k}" x="${x1-6}" y="${y1-6}" width="${Math.max(14,x2-x1+12)}" height="${Math.max(14,y2-y1+12)}" rx="3" fill="${sel?'rgba(90,169,230,.25)':'transparent'}" stroke="${sel?'var(--accent2)':'rgba(255,255,255,.0)'}" stroke-width="2.5" style="cursor:pointer"><title>${MB_PARTS[k].t}</title></rect>`; }
  if (D.dolby) { const [x1,y1]=P(2.19,14.23), [x2,y2]=P(2.58,11.73); s+=`<rect x="${x1-10}" y="${y1}" width="${x2-x1+60}" height="${y2-y1}" fill="rgba(60,90,160,.35)" stroke="#8fb3ff" stroke-dasharray="6 4"/><text x="${x1}" y="${y1-4}" font-size="11" fill="#cde">Dolby CAT1100 card (P13)</text>`; }
  return s+'</svg>';
}
function ampSVG(t){
  const a=amp(); const W=520,H=170; let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:620px"><rect width="${W}" height="${H}" fill="var(--lane)" stroke="var(--line)"/>`;
  const per=1/D.ampF, span=3*per; let p1='',p2='';
  for (let i=0;i<=300;i++){ const tt=i/300*span; const vin=a.vin*Math.SQRT2*Math.sin(2*Math.PI*D.ampF*tt); let vo=vin*Math.pow(10,K.AMP_GAIN/20); const vm=K.AMP_MAX_V*Math.SQRT2*Math.sqrt(D.ampLoad/8); if (vo>vm) vo=vm; if (vo<-vm) vo=-vm;
    if (a.osc) vo += 0.12*vm*Math.sin(2*Math.PI*37*D.ampF*tt);
    const x=20+i/300*(W-40); p1+=(i?'L':'M')+x.toFixed(1)+','+(H/2-vin/18*70).toFixed(1); p2+=(i?'L':'M')+x.toFixed(1)+','+(H/2-vo/18*70).toFixed(1); }
  const vmY = 18;
  return s+`<line x1="20" y1="${H/2}" x2="${W-20}" y2="${H/2}" stroke="var(--grid)"/><path d="${p1}" fill="none" stroke="var(--accent2)" stroke-width="1.5"/><path d="${p2}" fill="none" stroke="${a.clip?'var(--bad)':'var(--accent)'}" stroke-width="2"/>
    <text x="24" y="16" font-size="11" fill="var(--ink2)">blue: input ${D.ampIn} dBu · ${a.clip?'red':'green'}: output into ${D.ampLoad} Ω (${a.dbuOut.toFixed(1)} dBu${a.clip?', CLIPPED':''})${a.osc?' + oscillation (issue 2 unmodified)':''} · ±18 V full scale</text></svg>`;
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css=SIM.css, L=[], st=muxStep();
  L.push({label:'SHARC timer 1 → shifter', h:26, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,st,0,Math.min(st*0.15,40e-6),css('--warn'),`shifter calls (TPERIOD1 ${D.fw==='v205'?K.T1_V205:K.T1_32ME})`); }});
  L.push({label:'FLG1 clock / FLG0 data: 64 bits', h:30, draw(c,X,t0,t1,y,h){ const bt=0.2e-6; const n0=Math.floor(t0/st), n1=Math.ceil(t1/st);
    for (let k=n0;k<=n1;k++){ const a=k*st+2e-6; if (a>t1||a+64*bt<t0) continue; if (X(a+64*bt)-X(a)<40){ c.fillStyle=css('--accent2'); c.fillRect(X(a),y+4,Math.max(1.5,X(a+64*bt)-X(a)),h-8); continue; }
      for (let b=0;b<64;b++){ const xa=X(a+b*bt), xb=X(a+(b+0.5)*bt); c.fillStyle=css('--accent2'); c.fillRect(xa,y+3,Math.max(1,xb-xa),8); const bit=(b*7+k)%3===0; c.fillStyle=css('--accent'); if (bit) c.fillRect(xa,y+14,X(a+(b+1)*bt)-xa,h-18); } }
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('bit time ≈ 0.2 µs ('+'inferred: ~10 SHARC cycles per bit'+')', X(t0)+4, y+h-2); }});
  L.push({label:'STROBE / latch, OE blanking', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,st,2e-6+64*0.2e-6,0.4e-6,css('--bad'),'latch'); }});
  L.push({label:'Row (P-FET) driven', h:36, draw(c,X,t0,t1,y,h){ const cols=['#e0a020','#3aa0e0','#3fbf5f','#c04ad0']; const n0=Math.floor(t0/st), n1=Math.ceil(t1/st);
    if (n1-n0>600){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(`${n1-n0} row changes in view — zoom in`, X(t0)+6, y+h/2+4); return; }
    for (let k=n0;k<=n1;k++){ const m=muxAt(k*st+1e-9); c.fillStyle=cols[m.phase]; c.globalAlpha=D.fw==='32me'? 0.3+0.17*m.board : 0.7; c.fillRect(X(k*st),y+3,X((k+1)*st)-X(k*st)-0.5,h-6); c.globalAlpha=1;
      if (X((k+1)*st)-X(k*st)>70){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`${D.fw==='32me'?'board '+(m.board+1)+' ':''}bars ${m.phase+1}+${m.phase+5}`, X(k*st)+3, y+h/2+4); } } }});
  L.push({label:'Test tone → VU / PPM (index)', h:52, draw(c,X,t0,t1,y,h){ const M=meter(); const toY=v=>y+2+Math.min(120,v)/120*(h-4);
    [['vu',css('--accent')],['pk',css('--bad')]].forEach(([k,col])=>{ c.strokeStyle=col; c.beginPath(); const a=Math.max(0,Math.floor(t0*M.N)), b=Math.min(M.N-1,Math.ceil(t1*M.N)); for (let i=a;i<=b;i++){ const yy=toY(M[k][i]); i===a?c.moveTo(X(i/M.N),yy):c.lineTo(X(i/M.N),yy);} c.stroke(); }); }});
  L.push({label:'Segment current, one bar (mA)', h:40, draw(c,X,t0,t1,y,h){ const n0=Math.floor(t0/st), n1=Math.ceil(t1/st); c.fillStyle=css('--warn');
    if (n1-n0>2000){ c.globalAlpha=.35; c.fillRect(X(t0),y+h*0.3,X(t1)-X(t0),h*0.6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`${(K.IOUT*1e3).toFixed(0)} mA pulses, ${(ledStats(t0).onFrac*100).toFixed(2)} % duty`, X(t0)+4,y+h/2+4); return; }
    for (let k=n0;k<=n1;k++){ const m=muxAt(k*st+1e-9); if (m.phase===0 && m.board===0) c.fillRect(X(k*st),y+6,Math.max(1,(X((k+1)*st)-X(k*st))*D.oe/100),h-10); } }});
  L.push({label:'AMS8E-8 output (V)', h:40, draw(c,X,t0,t1,y,h){ const a=amp(); const span=t1-t0, pw=X(t1)-X(t0); const vm=K.AMP_MAX_V*Math.SQRT2*Math.sqrt(D.ampLoad/8), g=Math.pow(10,K.AMP_GAIN/20);
    if (span*D.ampF>pw/3){ c.fillStyle=a.clip?css('--bad'):css('--accent'); c.globalAlpha=.3; const A=Math.min(vm,a.vin*Math.SQRT2*g)/16; c.fillRect(X(t0),y+h/2-A*h/2,pw,A*h); c.globalAlpha=1; return; }
    c.strokeStyle=a.clip?css('--bad'):css('--accent'); c.beginPath(); for (let i=0;i<=600;i++){ const tt=t0+span*i/600; let v=a.vin*Math.SQRT2*g*Math.sin(2*Math.PI*D.ampF*tt); v=Math.max(-vm,Math.min(vm,v)); const yy=y+h/2-v/16*h/2; i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); }});
  return L;
}

/* ================================================================ VIEWS ================================================================ */
const card=(t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
function benchCtl(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
   <label class="small">Board <select id="bd">${Object.keys(BOARDS).map(k=>`<option value="${k}" ${k===D.board?'selected':''}>${BOARDS[k].name}</option>`).join('')}</select></label>
   <label class="small">Meter driven by <select id="fw"><option value="v205" ${D.fw==='v205'?'selected':''}>AMS8-1 SHARC v205c (1 board)</option><option value="32me" ${D.fw==='32me'?'selected':''}>32ME SHARC v050000 (4 boards)</option></select></label>
   <label class="small">Test tone <input type="range" id="lv" min="-50" max="14" value="${D.level}"> <span id="lvv" class="mono">${D.level} dBFS</span></label>
   <label class="small"><input type="checkbox" id="bu" ${D.burst?'checked':''}> 10 ms bursts</label>
   <label class="small">OE duty <input type="range" id="oe" min="0" max="100" value="${D.oe}"> <span id="oev" class="mono">${D.oe} %</span></label>
   <label class="small">Drivers <select id="dr"><option ${D.driver==='TLC5926'?'selected':''}>TLC5926</option><option ${D.driver==='A6276'?'selected':''}>A6276</option></select></label></div>
   <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
   <span class="small muted">AMS8E-1 test:</span>${[[false,false],[true,false],[false,true],[true,true]].map(([i,d])=>`<button data-cfg="${i?1:0}${d?1:0}" class="${D.io===i&&D.dolby===d?'on':''}">${i?'1 in/1 out':'no I/O'}${d?' + Dolby':''}</button>`).join('')}
   <span class="small muted" style="margin-left:8px">AMS8E-8:</span><label class="small">in <input type="range" id="ai" min="-20" max="20" step="0.5" value="${D.ampIn}"> <span id="aiv" class="mono">${D.ampIn} dBu</span></label>
   <label class="small">load <select id="ld">${[4,8,16].map(r=>`<option ${r===D.ampLoad?'selected':''}>${r}</option>`).join('')}</select> Ω</label><button id="fx" class="${D.ampFix?'on':''}">2006 fix ${D.ampFix?'fitted':'not fitted'}</button></div>`;
}
function bindBench(m){
  const q=s=>m.querySelector(s);
  q('#bd').onchange=e=>A.board(e.target.value); q('#fw').onchange=e=>A.fw(e.target.value);
  q('#lv').oninput=e=>{ q('#lvv').textContent=e.target.value+' dBFS'; A.level(+e.target.value); };
  q('#bu').onchange=e=>{ D.burst=e.target.checked; MK=''; SIM.refresh(); };
  q('#oe').oninput=e=>{ D.oe=+e.target.value; q('#oev').textContent=D.oe+' %'; SIM.refresh(); };
  q('#dr').onchange=e=>A.driver(e.target.value);
  m.querySelectorAll('[data-cfg]').forEach(b=>b.onclick=()=>{ A.config(b.dataset.cfg[0]==='1', b.dataset.cfg[1]==='1'); });
  q('#ai').oninput=e=>{ D.ampIn=+e.target.value; q('#aiv').textContent=D.ampIn+' dBu'; SIM.refresh(); };
  q('#ld').onchange=e=>{ D.ampLoad=+e.target.value; SIM.refresh(); };
  q('#fx').onclick=()=>A.ampFix(!D.ampFix);
}
function bindBoard(root){ root.querySelectorAll('.mbp').forEach(r=>r.addEventListener('click',()=>A.pick(r.dataset.p))); root.querySelectorAll('.u4').forEach(r=>r.addEventListener('click',()=>act('Probe '+r.dataset.u, tr=>{ tr(`${r.dataset.u} ${D.driver}: SDI ← previous driver's SDO (4 drivers chained = 64 bits), CLK = FLG1, LE = STROBE, /OE = FLG3`); tr(`R_EXT 365 Ω → ${(K.IOUT*1e3).toFixed(1)} mA per output while the row FET is on`); }))); }
function benchView(t){
  const b=BOARDS[D.board]; let main='', side='';
  if (D.board==='ams8e1'){ const p=mbPower(), sel=MB_PARTS[D.pick];
    main = mainBoardSVG() + `<p class="small muted">Drawn from the ISS5 Gerbers (top overlay and solder mask); click a part. Positions of the clickable parts come from the IPC-D-356A netlist pads.</p>`;
    side = `<h3>${sel.t}</h3><p class="small">${sel.d}</p><table class="kv"><tr><th>+5 V supply (measured)</th><td class="mono">${p.I.toFixed(2)} A · ${p.P.toFixed(2)} W · ${p.T} °C</td></tr>
      ${RAILS.map(r=>{ const v=r[0]==='+1V2'?1.2:r[0]==='+2V5'?2.5:3.3; return `<tr><th>${r[0]} ${r[1]}</th><td class="mono">${(r[3]*1e3).toFixed(0)} mA from ${r[2]} → ${((5-v)*r[3]).toFixed(2)} W in the regulator (RD22 estimate)</td></tr>`; }).join('')}</table>`; }
  else if (D.board==='ams8e4'){ const s=ledStats(t);
    main = meterBoardSVG(t,'top') + `<div style="margin-top:6px">${meterBoardSVG(t,'bottom')}</div><p class="small muted">Drawn to scale from AMS8E-4PANEL.TSS/.TSM (top) and .BSS/.BSM (bottom, mirrored), the 2008|41 P-CAD panel Gerbers. Every bar shows the same test tone; the dashed bars are the pair being driven at the playhead.</p>`;
    side = `<table class="kv"><tr><th>VU / PPM</th><td class="mono">index ${meterAt(t).vu} → ${s.n} segments · dot ${s.d} (${SEG_LBL[Math.max(0,s.d-1)]})</td></tr>
      <tr><th>Segment current</th><td class="mono">${(K.IOUT*1e3).toFixed(1)} mA while on (365 Ω)</td></tr><tr><th>Duty</th><td class="mono">${(s.onFrac*100).toFixed(2)} % (${D.fw==='v205'?'1 of 4 phases':'1 of 16'} × OE ${D.oe} %)</td></tr>
      <tr><th>Peak VLED current</th><td class="mono">${(s.Ipk*1e3).toFixed(0)} mA (two bars × ${s.perBar} LEDs)</td></tr><tr><th>Average per board</th><td class="mono">${(s.Iavg*1e3).toFixed(1)} mA</td></tr>
      <tr><th>Refresh</th><td class="mono">${SIM.fmtDur(muxStep())} per phase · ${(1/(muxStep()*phases())).toFixed(0)} Hz frame</td></tr></table>`; }
  else if (D.board==='ams8e8'){ const a=amp();
    main = ampSVG(t) + `<p class="small muted">The LM4766 is through-hole and is not in the SMD pick-and-place program; its gain-setting network is not traced, so the model uses the measured +7.8 dB, the measured 22.8 dBu clip point and the measured supply currents.</p>`;
    side = `<table class="kv"><tr><th>Input</th><td class="mono">${D.ampIn} dBu (${(a.vin).toFixed(3)} V rms)</td></tr><tr><th>Output</th><td class="mono">${a.dbuOut.toFixed(1)} dBu · ${a.vout.toFixed(2)} V rms · ${a.P.toFixed(2)} W into ${D.ampLoad} Ω ${a.clip?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>
      <tr><th>Rails</th><td class="mono">+12 V ${(a.Ip*1e3).toFixed(0)} mA · −12 V ${(a.In*1e3).toFixed(0)} mA</td></tr><tr><th>Dissipation</th><td class="mono">${a.diss.toFixed(2)} W in the LM4766 (both channels)</td></tr>
      <tr><th>Check against the sheet</th><td class="small">At 3 W into 8 Ω the model gives ${(1e3*(K.AMP_IQ_P+2*Math.sqrt(2*3/8)*1/Math.PI)).toFixed(0)} mA on +12 V; the sheet says 620 mA. So both channels were driven (I = I_Q + 2·I_pk/π).</td></tr></table>`; }
  else { main = `<div class="card" style="background:var(--panel2)"><p>${b.what}</p><p class="small muted">No drawing: this board appears only as pick-and-place programs. Its parts list is in the table.</p></div>`;
    side = pnpTable(D.board); }
  return {main, side};
}
function pnpTable(bd){
  const T = {
    ams8e5:[['75176 RS-485','4'],['1N4003','3'],['110 Ω','8'],['1K','12'],['0.1 µF','14'],['2K (top side)','8']],
    ams8e10:[['green LEDs','184–188'],['RED + red','104–108'],['YEL + yel','92–99'],['1K5','24'],['2N4401 / 2N4403','8 + 8'],['FDC634 / “FDC6734”','8'],['365R','8']],
    ams8e12:[['2K55','24'],['31K6','16'],['27p','16'],['10/10 (10 µF 10 V)','29'],['0.1','42'],['0.01','10']],
  }[bd]||[];
  return `<table class="kv"><tr><th>Part (PnP value field)</th><th>count</th></tr>${T.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join('')}</table>`;
}
function viewSim(m){
  window.__ams8eActive=false;
  m.innerHTML = card('The bench: pick a board, drive it, measure it', benchCtl()) + `<div class="grid2">${card('Board at the playhead','<div id="bmain"></div>')}${card('Readings','<div id="bside"></div>')}</div>`
   + `<div class="grid2">${card('What happened (last action)','<div id="trace" class="log"></div>')}${card('Board summary','<div id="bsum" class="small"></div>')}</div>`
   + card('Timeline: one second, zoomable (click to seek)','<canvas id="tl"></canvas><p class="small muted">The shifter timing is from the two SHARC builds that drive this board; the 0.2 µs bit time is inferred. The amplifier lane uses the measured gain and clip point.</p>');
  bindBench(m);
  SIM.on('time',()=>{ const t=SIM.t, v=benchView(t);
    m.querySelector('#bmain').innerHTML=v.main; bindBoard(m.querySelector('#bmain')); m.querySelector('#bside').innerHTML=v.side;
    m.querySelector('#trace').innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Change a control or click a part.</div>';
    const b=BOARDS[D.board]; m.querySelector('#bsum').innerHTML=`<b>${b.name}</b><p>${b.what}</p><p class="muted">${b.pnp}</p>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); });
}

/* ---------------- tutorial: building and testing a board set ---------------- */
const LESSONS=[
  {title:'The AMS8E board set', body:`<p>The AMS8E boards are the shared hardware behind the AMS8-1/AMS8-2 monitors, and later the AMS16 and 32ME. This folder is what a contract manufacturer needed to build them: BOMs, Gerbers, pick-and-place programs and quotes. Sencore built AMS8E-1 issue 5 turnkey in April 2013|46 (PO 46643).</p><p>This tutorial walks one build: <b>main board → meter board → speaker amp</b>, using the archive's own test sheets.</p>`, check:()=>true, auto:true},
  {title:'1 · Main board on the bench', body:`<p>Choose <b>AMS8E-1 main board</b>. It is 5.8″ × 4.175″, 8 layers, 50 Ω controlled impedance, ENIG finish (fabrication notes in the Gerber drill layer). Click U4, U1 and U2 to see what each does.</p><p><b>Goal:</b> the main board is on the bench and you have selected U2 (the socketed boot flash).</p>`, check:()=>D.board==='ams8e1'&&D.pick==='U2', hint:'Board menu → AMS8E-1, then click the PLCC socket at the top right.'},
  {title:'2 · Current test', body:`<p>The 2006-era sheet “AMS81 MAIN BOARD +5V CURRENT” has four rows. Run all four with the AMS8E-1 test buttons. The Dolby card adds about 0.29 A.</p><p><b>Goal:</b> measure the worst case (I/O and Dolby).</p>`, check:()=>D.board==='ams8e1'&&D.io&&D.dolby, hint:'Press “1 in/1 out + Dolby”.'},
  {title:'3 · Meter board', body:`<p>Choose <b>AMS8E-4</b>. Set the tone to <b>0 dBFS</b>. The SHARC's +3 dB correction puts a −20 dBFS sine on the “0” segment, so 0 dBFS lights 20 dB higher, near the top of the red.</p><p><b>Goal:</b> meter board, tone 0 dBFS.</p>`, check:()=>D.board==='ams8e4'&&D.level===0, hint:'Board → AMS8E-4, tone slider to 0.'},
  {title:'4 · See the multiplex', body:`<p>Only two bars are driven at a time. Set the zoom to <b>50 ms</b> and step with <b>1 mux step</b>: the dashed pair walks across the board. With the AMS8-1 firmware (v205c) each step is 3.125 ms, so the board repeats at 80 Hz. With the 32ME firmware it is 244 µs per step, and 4 boards repeat at 256 Hz.</p><p><b>Goal:</b> switch to the 32ME firmware.</p>`, check:()=>D.fw==='32me', hint:'“Meter driven by” → 32ME SHARC v050000.'},
  {title:'5 · The obsolete driver', body:`<p>The 2012 production notes warn that U2–U5 (Allegro A6276) are obsolete. The FINAL BOM fits TI TLC5926 parts: same pin-out, same 16-bit serial-in protocol, current set by the same 365 Ω. Swap them and nothing else changes.</p><p><b>Goal:</b> fit A6276, then back to TLC5926.</p>`, check:()=>D.driver==='TLC5926'&&D.log.some(e=>/A6276/.test(e.name)), hint:'Drivers menu.'},
  {title:'6 · Speaker amp', body:`<p>Choose <b>AMS8E-8</b>. The 19 Oct 2006|39 sheet records +7.8 dB gain into 8 Ω and 22.8 dBu maximum. Raise the input until the output clips. Clipping starts near +15 dBu in.</p><p><b>Goal:</b> make it clip into 8 Ω.</p>`, check:()=>D.board==='ams8e8'&&amp().clip&&D.ampLoad===8, hint:'Input slider above about +15 dBu.'},
  {title:'7 · The oscillation fix', body:`<p>Un-fit the 2006 fix: the issue-2 board oscillates. The fix was C1/C2 100 p → 27 p, plus 1000 pF across each LM4766 differential input. Put it back.</p><p><b>Goal:</b> fix fitted after being removed.</p>`, check:()=>D.ampFix&&D.log.some(e=>/Undo/.test(e.name)), hint:'Click the “2006 fix” button twice.'},
  {title:'Done', body:`<p>That is the whole build. <b>Findings</b> lists the problems the archive itself records: a misfiled layout, a pick-and-place program with typing errors, BOM value slips and an FPGA part mismatch.</p>`, check:()=>true, auto:true},
];
let LI=0;
function viewTut(m){
  window.__ams8eActive=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial: building and testing the boards (from the production notes, test sheets and BOMs)','<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>')}<div class="card" id="lesson"></div></div>
   <div>${card('Bench', benchCtl()+'<div id="bmain" style="margin-top:8px"></div><div id="bside" class="small"></div>')}</div></div>`;
  bindBench(m);
  const draw=()=>{ const v=benchView(SIM.t); m.querySelector('#bmain').innerHTML=v.main; bindBoard(m.querySelector('#bmain')); m.querySelector('#bside').innerHTML=v.side;
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===LI?'font-weight:700;color:var(--accent)':''}">${l.title}${i<LI?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ LI=+li.dataset.i; draw(); });
    const L=LESSONS[LI], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
     <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${LI?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${LI<LESSONS.length-1?'':'disabled'}>Next ▶</button></div>`;
    m.querySelector('#pv').onclick=()=>{ LI=Math.max(0,LI-1); draw(); }; m.querySelector('#nx').onclick=()=>{ LI=Math.min(LESSONS.length-1,LI+1); draw(); }; };
  SIM.on('time',draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__ams8eActive=false;
  m.innerHTML=card('One second on the boards','<div id="lad"></div>')+`<div class="grid2">${card('The meter board at the playhead','<div id="mb"></div>')}${card('Persistence: what the eye sees','<canvas id="pv"></canvas><p class="small muted">Left: the LEDs actually on at this instant. Right: the average over the last refresh frame, roughly what the eye integrates.</p>')}</div>`;
  SIM.on('time',()=>{ const t=SIM.t, st=muxStep();
    const rows=[['SHARC timer-1 shifter calls',Math.round(1/st).toLocaleString(),SIM.fmtDur(st),D.fw==='v205'?'v205c: TPERIOD1 153600 / 49.152 MHz':'v050000: 12000 / 49.152 MHz'],
      ['Board refresh frames',(1/(st*phases())).toFixed(1),SIM.fmtDur(st*phases()),D.fw==='v205'?'4 phases, one board':'16 phases over 4 boards'],
      ['Bits shifted into the drivers',(64/st).toFixed(0),'≈ 0.2 µs '+inf,'4 × 16-bit drivers per call'],
      ['Audio samples metered','48,000','20.83 µs','VUMeterCalc per channel per sample'],
      ['Meter value updates seen by the LEDs',Math.round(1/st).toLocaleString(),'','translate_meter_results runs every main-loop pass'],
      ['AMS8E-8 output cycles at '+D.ampF+' Hz',D.ampF.toLocaleString(),SIM.fmtDur(1/D.ampF),'LM4766, +7.8 dB']];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>source</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#mb').innerHTML=meterBoardSVG(t,'top');
    const {c,w}=SIM.canvas(m.querySelector('#pv'),150); const s=ledStats(t), mx=muxAt(t), on=barsOn(mx.phase);
    for (let side=0;side<2;side++) for (let b=0;b<8;b++) for (let i=0;i<22;i++){ const want=i<s.n||(s.d&&i===s.d-1); const x=(side? w/2+10 : 10)+b*((w/2-30)/8), y=140-i*6;
      let a = want? (side? s.onFrac*(D.fw==='v205'?4:16)/(D.fw==='v205'?4:16)*4 : (on.includes(b)?1:0)) : 0; a=Math.min(1,a*(side?2.5:1));
      c.fillStyle= want? SEGCOL(i) : SIM.css('--grid'); c.globalAlpha= want? Math.max(0.12,a):1; c.fillRect(x,y,(w/2-30)/8-4,4); c.globalAlpha=1; }
    c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('instant', 10, 10); c.fillText('averaged ('+(s.onFrac*100).toFixed(1)+' % duty)', w/2+10, 10);
  });
}

/* ---------------- block diagram ---------------- */
const BLK={
  mb:{x:220,y:110,w:220,h:130,t:'AMS8E-1 main board',s:['SHARC · Cyclone IV · ATmega128L','CS8416 · AD1895 · 4 × CS4334','8 layers, 5.8″ × 4.175″'],d:'The processor board. Everything else hangs off its headers (IPC netlist names): H9–H12 AES 1–16 in/out, H3 meter data MD1–MD8, H4 option module, P5 72-pin and P13 100-pin Dolby card sockets, P4/P7 RS-485 to the front, P8/P2 reference in, H2 FPGA config, JTAG1.'},
  fp:{x:500,y:20,w:190,h:90,t:'AMS8E-5 control board',s:['encoder + 8-char display','4 × 75176 RS-485'],d:'Front-panel MCU board (firmware in AMS82). AMS8E-5-6 is a wider variant (24 × 1K, 8 × 301 Ω). The 32ME-5 is derived from AMS8E-5 issue 4.'},
  m4:{x:500,y:150,w:190,h:90,t:'AMS8E-4 meter board(s)',s:['8 × 22 LEDs + 12 indicators','4 × TLC5926 (was A6276)'],d:'One per AMS8-1, four in the 32ME; the AMS8E-10 is a double version with 8 drivers. Driven by the SHARC flags through the FPGA (DATA_OUT) or the H3 MD pairs.'},
  amp:{x:500,y:280,w:190,h:80,t:'AMS8E-8 speaker amp',s:['LM4766 stereo','+7.8 dB, 14 W / 8 Ω'],d:'Feeds the monitor speakers from the analog monitor output. ±12 V rails: 60/55 mA idle, 620/570 mA at 3 W.'},
  aes:{x:10,y:40,w:160,h:80,t:'AES I/O boards',s:['H9–H12: 16 pairs','75 Ω or 110 Ω'],d:'R17–R20 and R50–R53 set the input termination: 75 Ω in the normal ISS5 build, 110 Ω in the 32ME-MADI build (pick-and-place diff).'},
  dolby:{x:10,y:170,w:160,h:80,t:'Dolby cards',s:['P13 CAT1100 (100-pin)','P5 CAT552 (72-pin SIMM)'],d:'Dolby E/Digital decoder cards. The CAT1100 is the biggest single load on the +5 V rail.'},
  opt:{x:10,y:290,w:160,h:70,t:'Option header H4',s:['i64 MADI / uNet'],d:'34-pin header for the DirectOut i64 MADI module (32ME-MADI) or the Archwave uNet (32ME-N).'},
  pwr:{x:220,y:290,w:220,h:70,t:'Power',s:['+5 V in → TPS70402: +1V2, +2V5','LM1117 +3V3'],d:'Measured +5 V current 0.35–0.74 A (test sheet). RD22 estimate: 286 mA at 1V2, 38 mA at 2V5, 0.7 A at 3V3 (LM1117 junction estimate 210 °C, “heat is not at this level”).'},
};
const WIRES=[['aes','mb','H9–H12'],['dolby','mb','P5/P13'],['opt','mb','H4'],['mb','fp','P4 LR/LT, P7 SDR/SDT'],['mb','m4','H3 MD1–8 (LED shift)'],['mb','amp','analog monitor'],['pwr','mb','']];
function viewBlock(m){
  window.__ams8eActive=false; let sel='mb';
  m.innerHTML=`<div class="grid2">${card('Board-set block diagram (click a block)','<div id="bd"></div>')}${card('Block','<div id="bi"></div>')}</div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 700 370" style="width:100%"><defs><marker id="a8e" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLK[a],B_=BLK[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; }; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#a8e)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLK){ const b=BLK[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); }); m.querySelector('#bi').innerHTML=`<h3>${BLK[sel].t}</h3><p>${BLK[sel].d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length), h=24+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.3"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p}</text><text x="${x-33}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${n}</text>`; });
  right.forEach(([p,n],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p}</text><text x="${x+w+33}" y="${yy+4}" font-size="10" fill="var(--accent2)">${n}</text>`; }); return s; }
const SHEETS=[
  {name:'1 · AMS8E-1 headers', note:'Pin and net names from Ams8e-1iss5-net.ipc (IPC-D-356A, generated 01/11/2012).', svg:()=>
    chip(110,40,150,'H9 (AES 1–4)',[['1/2','AES1_IN_N/P'],['3/4','AES2_IN_N/P'],['5/6','AES3_IN_N/P'],['7/8','AES4_IN_N/P'],['9–12','GNDD']],[['13/14','AES1_OUT_N/P'],['15/16','AES2_OUT'],['17/18','AES3_OUT'],['19/20','AES4_OUT']],'H10/H11/H12 same for 5–8, 9–12, 13–16')
    + chip(110,250,150,'H3 (meter data)',[['1/2','MD1_N/P'],['3/4','MD2_N/P'],['5/6','MD4_N/P'],['7/8','MD3_N/P'],['11/12','GNDD']],[['13/14','MD5_N/P'],['15/16','MD6_N/P'],['17/18','MD7_N/P'],['19/20','MD8_N/P']],'note MD4 before MD3 on pins 5–8')
    + chip(580,40,150,'P4 / P7 / P8 / P2',[['P4-1/2','LR_P/N'],['P4-3/4','LT_P/N'],['P7-1/2','SDR_P/N'],['P7-3/4','SDT_P/N']],[['P8-1/2','REF75_N/P'],['P2-1/2','REF110_N/P'],['P4/P7-5','GNDD']],'serial links and reference')
    + chip(580,250,150,'H2 FPGA config',[['1','DCLK'],['3','CONF_DONE'],['5','N_CONFIG'],['7','CNF_DATA']],[['6','NCE'],['8','NCS'],['9','ASDI'],['4','+3V3']],'Active Serial (EPCS)') },
  {name:'2 · Power tree', note:'REG2 pins from the IPC netlist; currents from RD22 PowerNThermalAnalysis.xlsx; measured totals from AMS8E-1-CURRENT CONSUMPTION.pdf.', svg:()=>{
    let s=chip(330,60,170,'REG2 TPS70402',[['2,3,10,11','+5V'],['8','RESET_TPS70402'],['1,6,7,9,12,13,24,25','GNDD']],[['14,15','+1V2 (286 mA)'],['22,23','+2V5 (38 mA)'],['16/18/21','set resistors R95/R94/R92']],'dual LDO');
    s+=`<rect x="40" y="70" width="150" height="60" fill="none" stroke="var(--ink)"/><text x="50" y="92" font-size="12" fill="var(--ink)">+5 V in</text><text x="50" y="110" font-size="10" fill="var(--ink2)">0.35–0.74 A measured</text>
      <rect x="330" y="250" width="170" height="60" fill="none" stroke="var(--ink)"/><text x="340" y="272" font-size="12" fill="var(--ink)">LM1117 +3V3</text><text x="340" y="290" font-size="10" fill="var(--ink2)">0.7 A estimate → 1.19 W</text>
      <rect x="600" y="250" width="200" height="60" fill="none" stroke="var(--ink)"/><text x="610" y="272" font-size="12" fill="var(--ink)">TPS70402 #2 +3V3_2</text><text x="610" y="290" font-size="10" fill="var(--ink2)">CAT1100 1.7 A estimate → 2.9 W</text>
      <line x1="190" y1="100" x2="300" y2="100" stroke="var(--ink)"/><line x1="250" y1="100" x2="250" y2="280" stroke="var(--ink)"/><line x1="250" y1="280" x2="330" y2="280" stroke="var(--ink)"/><line x1="250" y1="330" x2="700" y2="330" stroke="var(--ink)"/><line x1="700" y1="330" x2="700" y2="310" stroke="var(--ink)"/><line x1="250" y1="280" x2="250" y2="330" stroke="var(--ink)"/>
      <text x="40" y="410" font-size="11" fill="var(--warn)">Estimate total at +5 V: (0.286+0.038+0.7+1.7) A ≈ 2.7 A. Measured with the Dolby card: 0.74 A. The estimate is about 3.7× pessimistic.</text>`; return s; } },
  {name:'3 · AMS8E-4 driver chain', note:'From the AMS8E-4 BOMs and the SHARC shifter. The P-FET row wiring is not traced (no schematic in the archive): the sel_1…sel_4 bits in the shifted word select the rows (inferred from ams81_main.asm).', svg:()=>{
    let s=''; ['U2','U3','U4','U5'].forEach((u,i)=>{ s+=chip(60+i*190,80,120,u+' '+D.driver,[['SDI',i?'←SDO':'DATA'],['CLK','FLG1'],['LE','STROBE'],['/OE','FLG3'],['R-EXT','365 Ω']],[['OUT0–15','16 sinks'],['SDO','→ next']],'16-bit, ≈51 mA'); });
    s+=`<text x="60" y="300" font-size="11" fill="var(--ink)">64 bits per call = shift_data[k] (32) + shift_data[k+4] (32): bits 31–10 = 22 segments, 9 = ERR, 8 = pair select, 3–0 = row selects sel_1…sel_4.</text>
      <text x="60" y="325" font-size="11" fill="var(--ink)">Row switches: Q18/Q21/Q23/Q26 FDC634P (P-FET) driven by Q16/17/22/25 2N4403 and Q19/20/24/27 2N4401; 1K5 base resistors (×12).</text>
      <text x="60" y="350" font-size="11" fill="var(--ink2)">LEDs: 80 green, 64 yellow, 40 red, 4 blue (FINAL BOM). Supply VLED via the AMS8E-5 / 32ME-5 1N4003 diode drop.</text>`; return s; } },
  {name:'4 · AMS8E-8 amplifier', note:'Topology inferred (LM4766 stereo, differential inputs). Values from Ams8e-8panel-T.prg; the 2006 fix from AMS8E-8-19OCT06.pdf.', svg:()=>{
    let s=`<polygon points="380,80 380,220 500,150" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="395" y="155" font-size="12" fill="var(--ink)">LM4766 (½)</text>
      <text x="360" y="110" font-size="11" fill="var(--ink)">− pin 7 / 13</text><text x="360" y="200" font-size="11" fill="var(--ink)">+ pin 8 / 12</text>
      <rect x="320" y="120" width="12" height="60" fill="none" stroke="var(--warn)" stroke-width="2"/><text x="250" y="150" font-size="11" fill="var(--warn)">1000 pF (added 2006)</text>
      <text x="60" y="100" font-size="11" fill="var(--accent2)">IN− → 20K / 5K1 network</text><text x="60" y="200" font-size="11" fill="var(--accent2)">IN+ → 20K / 5K1 network</text>
      <line x1="200" y1="96" x2="380" y2="96" stroke="var(--ink)"/><line x1="200" y1="204" x2="380" y2="204" stroke="var(--ink)"/>
      <text x="380" y="60" font-size="11" fill="var(--warn)">C1/C2 feedback: 100 pF → 27 pF (2006)</text><line x1="500" y1="150" x2="620" y2="150" stroke="var(--ink)"/><text x="630" y="154" font-size="11" fill="var(--accent2)">→ speaker 8 Ω</text>
      <text x="60" y="300" font-size="11" fill="var(--ink)">PnP parts: R1/4/6/10/12/14 5K1, R2/3/7/8/11/13 20K, R5/R9 1K, R15 3K3, R16 30R, C1/C2/C8/C10 27p, C3–C7 0.1 µF.</text>
      <text x="60" y="325" font-size="11" fill="var(--ink)">Measured: gain +7.8 dB into 8 Ω, noise −90.25 dB, response −0.01/+0.04 dB 20 Hz–20 kHz, THD 0.002–0.009 % at 3 W.</text>`; return s; } },
];
function viewSchem(m){
  window.__ams8eActive=false; let i=0;
  m.innerHTML=card('Schematic set (redrawn from the IPC netlist, BOMs, PnP programs and test sheets; not the Altium/P-CAD drawings)','<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">No schematic PDF for these boards is in the AMS8E folder; the AMS8E-1 ISS5 Altium project is referenced from RD22 and the 32ME-MADI build.</p>');
  const draw=()=>{ m.querySelector('#t2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#t2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 440" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[i].svg()}<text x="850" y="432" text-anchor="end" font-size="10" fill="var(--ink2)">AMS8E · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`; m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software (signal path + production programs) ---------------- */
function viewSoft(m){
  window.__ams8eActive=false;
  m.innerHTML=`<div class="grid2">${card('Signal path, stage by stage (meter board)','<div id="sp"></div>')}${card('Signal path, stage by stage (speaker amp)','<div id="sa"></div>')}</div>
    ${card('The pick-and-place program format (how the boards were “programmed” in production)','<div id="pnp"></div>')}`;
  SIM.on('time',()=>{ const t=SIM.t, r=meterAt(t), s=ledStats(t), mx=muxAt(t), a=amp();
    const st=[['AES sample','1 kHz tone at '+D.level+' dBFS'],['vumeter.asm VUMeterCalc','VU = VU + (x² − VU)·0.000319752 · PPM attack/decay'],['VUMeterGet → 0..255','VU '+r.vu+' (incl. +3 dB), PPM '+r.pk],['vu_data[] / pk_data[]','→ '+s.n+' segment bits + dot at '+s.d],['shifter','phase '+(mx.phase+1)+': 64 bits → 4 drivers, STROBE, OE'],['LED','≈ '+(K.IOUT*1e3).toFixed(0)+' mA × '+(s.onFrac*100).toFixed(1)+' % duty']];
    m.querySelector('#sp').innerHTML=`<svg viewBox="0 0 420 ${st.length*48+10}" style="width:100%">${st.map((p,i)=>`<rect x="10" y="${8+i*48}" width="400" height="38" rx="6" fill="${i===4&&(t-mx.t0)<100e-6?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="20" y="${24+i*48}" font-size="11.5" font-family="var(--mono)" fill="var(--ink)">${p[0]}</text><text x="20" y="${38+i*48}" font-size="10" fill="var(--ink2)">${p[1]}</text>`).join('')}</svg>`;
    const sa=[['Input',D.ampIn+' dBu'],['Gain +7.8 dB (measured)',(D.ampIn+K.AMP_GAIN).toFixed(1)+' dBu wanted'],['Clip at 22.8 dBu / 10.67 V (8 Ω)',a.clip?'<b style="color:var(--bad)">clipped</b>':'headroom '+(K.AMP_MAX_DBU-D.ampIn-K.AMP_GAIN).toFixed(1)+' dB'],['Load '+D.ampLoad+' Ω',a.P.toFixed(2)+' W per channel'],['Rails ±12 V',(a.Ip*1e3).toFixed(0)+' / '+(a.In*1e3).toFixed(0)+' mA']];
    m.querySelector('#sa').innerHTML=`<table class="kv">${sa.map(r=>`<tr><th>${r[0]}</th><td class="mono">${r[1]}</td></tr>`).join('')}</table>`;
    m.querySelector('#pnp').innerHTML=`<p class="small">Every board has an “L Series Pick and Place Program” (.prg, tab-separated) with an Access feeder database (.mdb). The command codes in the files:</p>
      <table class="kv"><tr><th>Cmd</th><th>meaning (from the file structure, ${inf})</th><th>example (Ams8e-8panel-T.prg)</th></tr>
      <tr><td class="mono">0 PR</td><td>program origin</td><td class="mono">0 PR 0 0 06.065 28.764</td></tr><tr><td class="mono">103</td><td>board/panel offset</td><td class="mono">103 0 0 08.612 −02.698</td></tr>
      <tr><td class="mono">101 Bn</td><td>panel step positions (5 boards)</td><td class="mono">101 B1 … B5, X −0.149 … 6.950</td></tr><tr><td class="mono">105</td><td>fiducial / mark setup</td><td class="mono">105 3 0 0 0</td></tr>
      <tr><td class="mono">25 ref value</td><td>place one part: feeder, rotation, X, Y</td><td class="mono">25 C1 27p 2 0 00.137 −00.937</td></tr></table>
      <p class="small">The value is typed into the designator column (“C1 27p”). That is how the ISS5 32ME-MADI program ended up with <span class="mono">R19 -1101/4W-1%/SM</span> and a part called <span class="mono">R20-110-1/4W-1%/SM</span> with no value (Findings).</p>`;
  });
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__ams8eActive=false;
  m.innerHTML=card('What the AMS8E masters are up to: findings', `<ol>
    <li><b>Artwork 2026|59: no panel artwork for the AMS8E boards.</b> The board set has no panel of its own; the only CorelDRAW files named AMS8E are manual covers, ${SIM.src('AMS8 #Engineering #TIM/AMS8E Manual Cover.cdr','AMS8E Manual Cover.cdr')} (2006-05-26) and its Prelim and Backup_of_ copies, which show the AMS8-1 front and rear (the AMS8-1 plugin models those panels). The boards here stay drawn from their Gerbers.</li>
   <li><b>The “ISS5 #PROBLEM” programs are the ISS5 programs.</b> Comparing <span class="mono">AMS8E-1 - #PNP #2016/ISS5</span> with <span class="mono">ISS5 #PROBLEM</span>, only the generated sidecars differ; the .prg/.mdb files match. The problem is probably inside them: in the 32ME-MADI bottom program, <span class="mono">R19</span> has the value <span class="mono">-1101/4W-1%/SM</span> and <span class="mono">R20</span> was entered as the designator <span class="mono">R20-110-1/4W-1%/SM</span> with no value. That leaves 313 placements against 314 in the standard build.</li>
   <li><b>The 32ME-MADI build of AMS8E-1.</b> The program diff is exactly R17–R20 and R50–R53, 75 Ω → 110 Ω (input terminations for balanced AES on DB25), and the 22.5792 MHz oscillator X4 removed (no 44.1 kHz family).</li>
   <li><b>AMS8E-1 programs filed under AMS8E-4.</b> <span class="mono">AMS8E-4 - #PNP #2016/AMS8E-1/ISS2…ISS5</span> holds copies of the main-board programs (110/228, 70/264, 79/285, 80/314 parts), not meter-board ones.</li>
   <li><b>FPGA part mismatch.</b> The ISS5 BOM fits an <span class="mono">EP4CE40F23C6N</span>. The RD22/32ME Quartus project (the README for RD22) targets <span class="mono">EP4CE30F23I7</span>. Same FBGA-484 footprint and the same pin roles. Whether a .sof built for the CE30 would configure a CE40 is not settled by anything archived: both report JTAG IDCODE 0x020F40DD and take the same 9,534,304-bit image (Cyclone IV handbook in RD10), and Quartus treats them as migration partners. The configuration hardware has no way the archive shows to tell them apart.</li>
   <li><b>Corrected 2026|59:</b> this finding used to say that a .sof built for the CE30 will not configure a CE40. That is not supported: EP4CE30 and EP4CE40 share the JTAG IDCODE 0x020F40DD, the 9,534,304-bit configuration image and all 484 ball roles (EP4CE30.xls / EP4CE40.xls), and nothing archived shows a difference the configuration hardware could detect. Quartus may still refuse a mismatched device in the programmer, which is a software check, not a hardware one (${inf}) (see rd10-cycloneiv.js).</li>
   <li><b>The obsolete LED driver was replaced.</b> The production notes and RD55 warn that the Allegro A6276 (U2–U5) is obsolete. The FINAL BOM (“AMS8E PCB - Issue 2”) already lists <span class="mono">TLC5926IDWR</span>: a drop-in with the same 365 Ω R_EXT.</li>
   <li><b>P-CAD auto-increment in the old meter BOM.</b> AMS8E-4-PCAD.csv lists R41 1K5, then R53 “1K6”, R58 “1K7” … R69 “1K16”. These are not real values. The FINAL BOM has all twelve as 1K5.</li>
   <li><b>Selector LEDs: notes vs BOM.</b> The notes say four <i>yellow</i> selector LEDs L178, L181, L188, L137 stay DNI. The FINAL BOM fits four <i>blue</i> LEDs at L178, L181, L185, L188; L137 is a green bar segment. It also says “H5 left DNI”, which is the meter board's only header.</li>
   <li><b>Screws short the meter board.</b> RD55 notes: “Top-cover screws dig into the tracks and short the meter board, so LEDs stop lighting.” Both RD55 and the production notes ask to keep the LED positions and the four mounting holes fixed in any re-spin. The 32ME panel's screw circles land exactly on those holes.</li>
   <li><b>One board, two refresh rates.</b> The same AMS8E-4 is refreshed at 80 Hz by the AMS8-1 SHARC (v205c, TPERIOD1 153600: 3.125 ms per phase, 4 phases) and at 256 Hz by the 32ME SHARC (v050000, TPERIOD1 12000 over 4 boards × 4 phases). 80 Hz at 25 % duty can flicker on camera.</li>
   <li><b>Power estimates vs measurements.</b> RD22's regulator sheet estimates 1.7 A for the CAT1100 at 3.3 V and an LM1117 junction of 210 °C, noting “heat is not at this level”. The handwritten AMS8E-1 sheet measured 0.74 A at +5 V with the Dolby card, so the estimate is about 3.7× high.</li>
   <li><b>The amp fix reached production.</b> The 2006 sheet changes C1/C2 from 100 p to 27 p to stop oscillation on issue 2. The 2016 Ams8e-8panel-T.prg places C1, C2, C8, C10 as 27p. The 1000 pF input caps are not in that SMD program, so they were fitted by hand or are through-hole (${inf}).</li>
   <li><b>A misfiled layout.</b> “AMS8E-1 - v105a - ALTIUM LAYOUT” contains IMP-16A / IMP202013 Altium files (README), not AMS8E-1.</li>
   <li><b>“FDC6734”.</b> The AMS8E-10 issue-2 bottom program calls the row FET FDC6734. Issue 1 says FDC634, and no FDC6734 part exists in the BOMs. Probably a typing slip (${inf}).</li>
   <li><b>Duplicate masters.</b> <span class="mono">AMS8E-1 - #Master</span> and <span class="mono">AMS8E-1 - MAINBOARD #Master</span> overlap except for one xlsx (README, by MD5).</li>
   <li><b>Board size in the fab notes.</b> The drill drawing says X = 5.800″, Y = 5.175″. The outline layer puts the board at 4.175″ tall; the extra inch is the 0.5″ panel rails top and bottom.</li></ol>`)
  + card('Assumptions in this simulation', `<ul class="small"><li>TLC5926 / A6276 output current formula and the 0.2 µs bit time: ${inf} (datasheets not in the archive).</li><li>Which bars each row FET powers (bars k and k+4, from v205c's shift_data[mux] / [mux+4]): ${inf}.</li><li>AMS8E-8: gain, clip level and currents are the measured values. The class-AB current formula reproduces the 3 W reading; the 4 Ω and 16 Ω behaviour is extrapolated (${inf}).</li><li>Panel colours of the LEDs follow the BOM counts per bar (10 green, 8 yellow, 4 red); their order is ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>AMS8E - #Master/AMS8E-1 - #Master/AMS8E-1 ISS5 - ALTIUM.csv, AMS8E-1-ISS5-GERBER.zip (GTO, GTS, GM6, net.ipc)</li><li>AMS8E - #Master/AMS8E-4 - #Master/* · AMS8E - 4MeterPCBRedesign #RD #RD55/NOtes.txt.txt</li><li>AMS8E - #Master/AMS8E - #TESTREPORT/*.pdf · AMS8E - #Master/AMS8E - #PNP/**/*.prg</li><li>AMS81 - #Master/…/#Sharc #v205c/ams81_INIT.ASM, ams81_main.asm · RD22-MADI/Software/01AV0200…/SHARC/v050000 · RD22-MADI/Hardware/Regulator/*</li></ul>`);
}

SIM.register({
  id:'ams8e', name:'AMS8E · AMS8 board-set production masters (2012|45)', duration:1,
  product:'AMS8E boards', year:2012, family:'Monitors, meters & tools', folder:'AMS8E - #Master',
  summary:'The AMS8E boards are the shared hardware of the AMS8 monitors and their descendants: the AMS8E-1 SHARC/FPGA main board, the AMS8E-4 LED meter board, the AMS8E-5 control board and the AMS8E-8 speaker amp. The boards are drawn from their Gerbers and placed on a test bench. The meter multiplex and the amplifier follow the firmware and the archive’s test sheets.',
  highlights:['Main and meter boards drawn from the production Gerbers','Live LED multiplex at 80 Hz (AMS8-1) or 256 Hz (32ME)','Measured power and amplifier test sheets','Pick-and-place program errors located','Obsolete driver swap and BOM slips'],
  depth:'Hardware model',
  stepUnits:[{label:'1 mux step',period:()=>muxStep()},{label:'1 refresh frame',period:()=>muxStep()*phases()},{label:'1 ms',period:()=>0.001},{label:'1 audio sample',period:()=>1/FS},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.05,'50 ms'],[0.0125,'12.5 ms (one AMS8-1 frame)'],[0.004,'4 ms (one 32ME frame)'],[0.0003,'300 µs'],[0.00003,'30 µs (one shift)']],
  defaultZoom:2,
  init(){ MK=''; },
  footnotes:[
    {text:"The only CorelDRAW files named AMS8E are manual covers; they show the AMS8-1 chassis front and rear, not the E boards.", src:"AMS8 #Engineering #TIM/AMS8E Manual Cover.cdr"},
    {text:"The AMS8E manual cover exists as Prelim (2005-09-08), final (2006-05-26) and two Backup_of_ copies in the same folder.", src:"AMS8 #Engineering #TIM/Backup_of_AMS8E Manual Cover.cdr"},
    {text:"The AMS8E-1B and AMS8E-1AAM manual covers are stored in both AMS8 #Engineering #TIM and AMS81 - #Master/AMS8 - #Engineering.", src:"AMS81 - #Master/AMS8 - #Engineering/AMS8-1B/AMS8E-1B Manual Cover.cdr"},
  ],
  tabs:[
    {id:'sim',label:'Simulator (test bench)',render:viewSim},
    {id:'tutorial',label:'Tutorial: build and test',render:viewTut},
    {id:'second',label:'One second, frame by frame',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Signal path & programs',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
