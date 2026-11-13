/* =====================================================================
   D8204 — AES/EBU reclocking distribution amplifier, 75 Ω (Ward-Beck, 1998|31)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, #MF8200 #SERIES/…):
   - D8204 - #Master #MF82/D8204 - #Engineering/D8204MAN.WPD  (manual text, specs, LEDs, jumpers)
   - …/D8204 March 13 2012 Complete Manual.pdf  (scanned, 9 pages). Pages 5–6 are the
       schematic "D8204B AES/EBU DISTRIBUTION AMP, d8204B-ISS3.sch, Tue Mar 13 2012": CS8420 U3,
       EL2280C U1/U2/U5, PE-65612 T1, PHA-2UEE SW1, PIC16F874 U25 @ 4.9152 MHz, LM2596/LM337, P1 pin map.
   - …/D8204 - #PCB/D8204.DSN (1998|31: CS8412, PIC16C54A, OPA650, LM2825) and D8204.PCB
       (Tango, ISSUE.2, 10.82 × 3.55 in; LED, switch, jack and P1 positions used for the drawings)
   - #MF8200 #SERIES/D8204B - #Master #MF82/D8204B - #Software/…#v101/v200.asm  (SIBLING firmware:
       MAIN, REFRESH8420_1/2, READ8420s, REFRESHSTATUS, shiftout/shiftin, cs8420reg* constants)
   - 8200 Series Rear Module options…/D8204 - rear module options.pdf, D8204TRM.dxf  (BNC1 / BNC3)
   - M8200 Extender, handle…/M8200 - TERMINATIONS - BNC - #Engineering/BNC-XX.PCB  (BNC positions, mils)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- constants ---------------- */
const XTAL = 4.9152e6, TCY = 4/XTAL;                 // X2 4.9152 MHz on U25 (2012 schematic sheet 2); PIC = 4 clocks per cycle
// Instruction-cycle counts worked out by hand from v200.asm (shiftout = 8×(bcf,btfsc,bsf,PBCLOCK) + call/return = 44 cycles)
const CYC = { refresh:955, read:271, status:26, loop:4, powerup:768 };
const PASS = (2*CYC.refresh + CYC.read + CYC.status + CYC.loop)*TCY;        // ≈ 1.80 ms
const BOOT = (CYC.powerup + 2*CYC.refresh + 60)*TCY;                         // powerupdelay + two refreshes + INIT moves
const SPI_BIT = 5*TCY;                                                       // one shifted bit (bcf/btfsc/bsf + PBCLOCK)
const K = {
  SRC_VPP: 1.0,           // AES-3id source into 75 Ω — inferred (manual: output 1 V p-p terminated)
  MIN_VPP: 0.2,           // manual: input level 0.2–7 V p-p
  DB_PER_100M: 2.33,      // inferred so that 1 V reaches 0.2 V at 600 m (manual: 600 m without EQ)
  EQ_DB: 21.5,            // inferred so that EQ reaches 1524 m = 5000 ft (manual spec)
  LOCK_T: 0.020,          // CS8420 PLL acquire time — inferred
  LOSS_T: 3/48000,        // receiver notices loss after ~3 frames — inferred
};
const FS_LIST = [32000, 44100, 48000, 96000];

/* ---------------- device state ---------------- */
const D = {
  build: '2012',          // '2012' = board in the 2012 manual (d8204B-ISS3.sch + v200.asm); '1998' = ISSUE.2 (CS8412 + PIC16C54A)
  plugged: true, len: 300, eq: false, term: '75', fs: 48000,
  frame: 'MF82/12',       // MF82/12 → BNC1 (1 in, 6 out); MF82/10 → BNC3 (in + loop, 8 out)
  loopLoad: 'open',       // BNC3 loop BNC: open / 75 Ω load downstream
  h1: 'audio',            // H1 on P1M: OUT2 copy (audio) or NO_LOCK open collector
  lossAt: null, backAt: null,
  log: [],
};
function reset(){ Object.assign(D,{build:'2012',plugged:true,len:300,eq:false,term:'75',fs:48000,frame:'MF82/12',loopLoad:'open',h1:'audio',lossAt:null,backAt:null}); }

/* ---------------- analog front end ---------------- */
function frontEnd(){
  const loss = K.DB_PER_100M*D.len/100;
  let v = K.SRC_VPP*Math.pow(10,-loss/20);
  // termination: 75 matched; 110 Ω gives Γ≈0.19; HiZ unterminated unless the BNC3 loop is terminated downstream
  let refl = 0, note = 'matched 75 Ω';
  const loopT = D.frame==='MF82/10' && D.loopLoad==='75';
  if (D.term==='75' && loopT){ v*=0.5; note='double-terminated: card 75 Ω AND the loop load → −6 dB'; }
  else if (D.term==='110'){ refl=(110-75)/(110+75); v*=1+refl; note='110 Ω on 75 Ω coax: Γ = '+refl.toFixed(2)+' (small reflection)'; }
  else if (D.term==='HIZ'){ if (loopT){ note='HiZ bridging, terminated at the end of the loop (correct use)'; } else { refl=1; v*=2; note='HiZ with nothing terminating the line: full reflection, eye closes '+''; } }
  const eqGain = D.eq? Math.pow(10, Math.min(K.EQ_DB, loss+3)/20) : 1;     // EQ boosts the HF loss back (capped)
  const eye = Math.min(1, (D.eq? 1 : Math.pow(10,-Math.max(0,loss-6)/40))) * (refl>0.5? 0.35 : 1-refl*0.5);
  const atRx = v*eqGain;
  const margin = D.eq ? (K.EQ_DB + 20*Math.log10(K.SRC_VPP/K.MIN_VPP)) - loss : 20*Math.log10(v/K.MIN_VPP);
  const fsOK = D.build==='2012' ? (D.fs>=30000 && D.fs<=108000) : (D.fs>=30000 && D.fs<=50000);
  const ok = D.plugged && margin>0 && eye>0.3 && fsOK;
  return { loss, v, atRx, eqGain, eye, margin, refl, note, fsOK, ok };
}

/* ---------------- time model: input present, receiver lock, firmware passes ---------------- */
function inputAt(t){ if (!D.plugged) return false; if (D.lossAt!==null && t>=D.lossAt && (D.backAt===null || t<D.backAt)) return false; return true; }
function rxLockAt(t){
  const fe = frontEnd(); if (!fe.ok) return false;
  if (!inputAt(t)) return false;
  // after the signal comes back the PLL needs LOCK_T; after power-up too
  const since = (D.backAt!==null && t>=D.backAt) ? t-D.backAt : t;
  return since >= K.LOCK_T;
}
function passIndex(t){ return t<BOOT ? -1 : Math.floor((t-BOOT)/PASS); }
function passStart(i){ return BOOT + i*PASS; }
const STEPS = [
  ['REFRESH8420_1', CYC.refresh, 'Write CS8420 #1 control regs 1–6, 9, 17 (map 0x01 auto-increment), PORTC,2 = CS'],
  ['REFRESH8420_2', CYC.refresh, 'Same block to a second CS8420 on PORTC,4 — not fitted on this board'],
  ['READ8420s',     CYC.read,    'Address both chips at reg 16 (Receiver Error), read each: bit 4 = UNLOCK'],
  ['REFRESHSTATUS', CYC.status,  'lock_8420,0 → GREEN RD7 / RED RB0 / NO_LOCK RC6 / reg 3 TXOFF'],
  ['clrwdt · goto MAIN', CYC.loop, ''],
];
const STEP_T = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]*TCY; return r; }); })();
function stepAt(t){ const i=passIndex(t); if (i<0) return {i, k:-1}; const r=t-passStart(i); let k=0; for (let j=0;j<STEPS.length;j++) if (r>=STEP_T[j]) k=j; return {i,k}; }
// the firmware's view: lock_8420 bit 0 latched at the READ8420s of the last pass that finished reading
function fwLockAt(t){
  if (D.build==='1998') return rxLockAt(t);
  const i = passIndex(t); if (i<0) return false;
  const readEnd = passStart(i)+STEP_T[3];
  const j = t>=readEnd ? i : i-1; if (j<0) return false;
  return rxLockAt(passStart(j)+STEP_T[2]+CYC.read*TCY*0.5);
}
// REFRESHSTATUS sets cs8420reg13; it reaches the chip when the next REFRESH8420_1 shifts byte 3
function txOnAt(t){
  if (D.build==='1998') return rxLockAt(t);
  const i = passIndex(t); if (i<0) return false;
  const reg3Write = (k)=> passStart(k) + (1+46*2+46*3)*TCY;
  const k = t>=reg3Write(i) ? i : i-1; if (k<1) return false;      // value written in pass k was decided in pass k-1
  const statusT = passStart(k-1)+STEP_T[3]+1e-9;
  return fwLockAt(statusT);
}
function ledsAt(t){
  const fe=frontEnd(), L = fwLockAt(t);
  return { green: L, red: !L && t>=BOOT, yellow: D.eq, noLock: !L };
}
function outputsAt(t){ return rxLockAt(t) && txOnAt(t); }
function nOutputs(){ return D.frame==='MF82/10' ? 8 : 6; }
function outVpp(){ return 1.0; }   // manual: output level 1 V p-p terminated

/* ---------------- actions ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, name, tr}); if (D.log.length>50) D.log.length=50; SIM.refresh();
}
const A = {
  eq(){ act('Press EQ button (SW1, front edge)', tr=>{ D.eq=!D.eq;
    tr(`SW1 ${D.build==='2012'?'PHA-2UEE':'PH3SW "EQ INSERT"'} is a latching DPDT switch — hardware only, no firmware sees it`);
    tr(D.eq? 'Pole 1 routes U1:A output through the R13/C9 (330R/1000p) and R19/C15 (110R/220p) HF-boost network into U1:B' : 'Pole 1 bypasses the boost network: U1:A → R5 750R → U1:B (flat)');
    tr(`Pole 2 feeds +5V → R75 330R → yellow EQ LED: ${D.eq?'ON':'OFF'}`);
    const fe=frontEnd(); tr(`Margin at the CS8420 RXP/RXN: ${fe.margin.toFixed(1)} dB → ${fe.ok?'receiver can lock':'below 0.2 V p-p: NO LOCK'}`); }); },
  term(v){ act('Move INPUT TERMINATION jumper to '+v, tr=>{ D.term=v;
    tr(`TERM header H1X3: ${v==='75'?'R24 75R to ground':v==='110'?'R9 110R to ground':'jumper removed → HiZ (R49 3K only)'}`);
    tr(frontEnd().note); }); },
  plug(){ act(D.plugged?'Unplug DIGITAL INPUT BNC':'Plug in DIGITAL INPUT BNC', tr=>{ D.plugged=!D.plugged; D.lossAt=null; D.backAt=null;
    tr(D.plugged? 'Signal reaches P1A → C16 → T1 PE-65612 → U1 equaliser → CS8420 RXP/RXN' : 'No signal at P1A: CS8420 reg 16 bit 4 (UNLOCK) goes high');
    tr('The change is seen by READ8420s on the next pass (≈'+SIM.fmtDur(PASS)+' later at most)'); }); },
  loss(){ act('Pull the input cable at the playhead for 150 ms', tr=>{ D.plugged=true; D.lossAt=SIM.t; D.backAt=Math.min(1,SIM.t+0.15);
    tr(`Input gone from ${SIM.fmtT(D.lossAt)} to ${SIM.fmtT(D.backAt)}`);
    tr('READ8420s: shiftin → temp2 bit 4 = 1 → lock_8420,0 stays 0 → REFRESHSTATUS: bcf PORTD,7 (green off), bsf PORTB,0 (red on), bsf PORTC,6 (NO_LOCK tally)');
    tr('movlw cs8420reg3off (b\'11010101\', TXOFF=1) → movwf cs8420reg13 → written by the next REFRESH8420_1: all 8 outputs go quiet');
    tr(`On return: PLL needs ≈${K.LOCK_T*1e3} ms ${'(inferred)'}, then up to two passes before reg 3 = cs8420reg3def re-enables TXP`); }); },
  len(v){ D.len=v; SIM.refresh(); },
  fs(v){ act('Upstream sample rate '+(v/1000)+' kHz', tr=>{ D.fs=+v; const fe=frontEnd();
    tr(`Manual spec: 30–50 kHz. ${D.build==='2012'?'The CS8420 in the 2012 build would still lock up to 108 kHz (datasheet) — '+(fe.fsOK?'locks':'no lock'):'CS8412 build: '+(fe.fsOK?'in range':'out of range → NO LOCK')}`); }); },
  frame(v){ act('Install in '+v+' frame', tr=>{ D.frame=v; tr(v==='MF82/10'?'BNC3 rear module (10 BNC: input + loop + 8 outputs, MF8210 only)':'BNC1 rear module (7 BNC: input + 6 outputs) — outputs 7 and 8 have no connector'); }); },
  loopLoad(v){ act('Loop BNC: '+(v==='75'?'cable to a terminated device':'left open'), tr=>{ D.loopLoad=v; tr(frontEnd().note); }); },
  h1(v){ act('H1 jumper → '+(v==='alarm'?'NO LOCK alarm':'audio'), tr=>{ D.h1=v; tr(v==='alarm'?'P1M now carries NO_LOCK: Q1 2N4401 collector via R44 4K7 (RC6 high = no lock)':'P1M carries the second copy of OUT2 (R16 75R from U2:B)'); }); },
  build(v){ act('Show build: '+(v==='2012'?'2012 manual board (D8204B ISS3)':'1998 ISSUE.2'), tr=>{ D.build=v; tr(v==='2012'?'CS8420 + PIC16F874 running D8204B v200.asm (sibling firmware)':'CS8412 + PIC16C54A — no firmware in the archive; LEDs follow the receiver directly ('+'inferred'+')'); }); },
  reset(){ act('Factory defaults', tr=>{ reset(); tr('75 Ω termination, EQ off, MF82/12 + BNC1, H1 = audio'); }); },
};

/* ---------------- drawings ---------------- */
// Front edge: card 1.00" wide × 2.75" (manual). LED, switch and jack heights from D8204.PCB (board edge x=1795 mil;
// y measured from the board's top edge 5335 mil): LOCK 4850, CONFIDENCE 4750, NO LOCK 4650, EQ 4550, EQ INSERT 5125, DIGITAL MONITOR 3100.
function frontSVG(t){
  const S=100, W=1.0*S, L=ledsAt(t), top=5335, Y=mil=>24+(top-mil)/1000*S, FH=2.75*S;
  const conf = D.build==='1998';
  const items=[[4850,'LOCK (green)',L.green,'var(--led-g)'],conf?[4750,'CONFIDENCE',L.green,'#ffd84a']:null,[4650,'NO LOCK (red)',L.red,'#ff4a3a'],[4550,'EQ (yellow)',L.yellow,'#ffd84a']].filter(Boolean);
  let s=`<svg viewBox="0 0 ${W+170} ${FH+60}" style="width:100%;max-width:260px">
   <defs><filter id="d4g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect x="20" y="24" width="${W}" height="${FH}" rx="3" fill="#1b5e33" stroke="#0e3a1f"/>
   <text x="${20+W/2}" y="16" font-size="10" text-anchor="middle" fill="var(--ink2)">pin 1 / A ↑</text>`;
  items.forEach(([mil,lbl,on,col],i)=>{ const y=Y(mil), ly=30+i*20, cx=20+W*0.5;
    s+=`<g><title>${lbl}</title><line x1="${cx+6}" y1="${y}" x2="${W+30}" y2="${ly}" stroke="var(--ink2)" stroke-width=".6"/><circle cx="${cx}" cy="${y}" r="4.6" fill="#0a0b0b"/><circle cx="${cx}" cy="${y}" r="3.6" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#d4g)"':''}/><text x="${W+33}" y="${ly+4}" font-size="11" fill="var(--ink)">${lbl}</text></g>`; });
  const ey=Y(5125)<24? 30: Y(5125);
  s+=`<g class="d4eq" style="cursor:pointer"><title>EQ button (latching): click</title><rect x="${20+W*0.5-9}" y="${Y(4400)}" width="18" height="14" rx="2" fill="${D.eq?'#e8e8e0':'#8c8c86'}" stroke="#333"/><line x1="${20+W*0.5+10}" y1="${Y(4400)+7}" x2="${W+30}" y2="${30+items.length*20}" stroke="var(--ink2)" stroke-width=".6"/><text x="${W+33}" y="${34+items.length*20}" font-size="11" font-weight="700" fill="var(--accent)">EQ button ${D.eq?'(in)':'(out)'}</text></g>`;
  if (conf) s+=`<g><title>DIGITAL MONITOR jack (1998 ISSUE.2 only)</title><circle cx="${20+W/2}" cy="${Y(3100)}" r="9" fill="#111" stroke="#777"/><circle cx="${20+W/2}" cy="${Y(3100)}" r="3.5" fill="#000"/><text x="${W+33}" y="${Y(3100)+4}" font-size="11" fill="var(--ink)">DIGITAL MONITOR</text></g>`;
  s+=`<rect x="${20+W*0.22}" y="${24+FH-80}" width="${W*0.56}" height="72" rx="6" fill="#c9c9c2" stroke="#888"/>
   <text x="${20+W/2}" y="${24+FH-44}" font-size="11" text-anchor="middle" fill="#222" transform="rotate(90 ${20+W/2} ${24+FH-44})">D8204</text>
   <text x="4" y="${FH+42}" font-size="10" fill="var(--ink2)">Front edge 1.00″ × 2.75″ (manual).</text><text x="4" y="${FH+56}" font-size="10" fill="var(--ink2)">LED heights from D8204.PCB.</text></svg>`;
  return s;
}
// Rear modules drawn from BNC-XX.PCB (Tango, 1998|31) component positions in mils.
const BNC3 = [['INPUT',4300,4525],['LOOP',4925,4525],['1',4300,3825],['2',4925,3825],['3',4300,3125],['4',4925,3125],['5',4300,2425],['6',4925,2425],['7',4300,1725],['8',4925,1725]];
const BNC1 = [['INPUT',6850,4525],['1',7290,4065],['2',6850,3605],['3',7290,3145],['4',6850,2685],['5',7290,2225],['6',6850,1765]];
function rearSVG(t){
  const mod = D.frame==='MF82/10'? BNC3 : BNC1, S=0.07, on=outputsAt(t), inp=inputAt(t);
  const xs=mod.map(b=>b[1]), ys=mod.map(b=>b[2]); const x0=Math.min(...xs)-450, y1=Math.max(...ys)+450, y0=Math.min(...ys)-450, x1=Math.max(...xs)+450;
  const X=v=>20+(v-x0)*S, Y=v=>20+(y1-v)*S, W=(x1-x0)*S, H=(y1-y0)*S;
  let s=`<svg viewBox="0 0 ${W+190} ${H+40}" style="width:100%;max-width:330px"><rect x="20" y="20" width="${W}" height="${H}" rx="4" fill="#26292c" stroke="#111"/>`;
  mod.forEach(([n,x,y],i)=>{
    const isIn=n==='INPUT', isLoop=n==='LOOP', k=+n; const live = isIn? inp : isLoop? inp : (on && k<=nOutputs());
    const col = isIn? (D.plugged?'var(--accent2)':'#555') : isLoop? (D.loopLoad==='75'?'var(--accent2)':'#555') : live?'var(--led-g)':'#555';
    s+=`<g class="${isIn?'d4in':isLoop?'d4loop':''}" style="cursor:${isIn||isLoop?'pointer':'default'}"><title>${isIn?'DIGITAL INPUT — click to plug/unplug':isLoop?'INPUT LOOP — click to add/remove a terminated downstream cable':'DIGITAL OUT '+n}</title>
      <circle cx="${X(x)}" cy="${Y(y)}" r="15" fill="#b9bcbf" stroke="#666"/><circle cx="${X(x)}" cy="${Y(y)}" r="9" fill="#1a1a1a"/><circle cx="${X(x)}" cy="${Y(y)}" r="3" fill="${col}"/>
      ${(isIn&&D.plugged)||(isLoop&&D.loopLoad==='75')?`<rect x="${X(x)-6}" y="${Y(y)-30}" width="12" height="16" fill="#333"/>`:''}
      <text x="${X(x)}" y="${Y(y)+27}" font-size="8.5" text-anchor="middle" fill="#ddd">${isIn?'IN':isLoop?'LOOP':'OUT '+n}</text></g>`;
  });
  s+=`<text x="${W+30}" y="40" font-size="12" font-weight="700" fill="var(--ink)">${D.frame==='MF82/10'?'BNC3':'BNC1'}</text>
     <text x="${W+30}" y="58" font-size="10" fill="var(--ink2)">${D.frame==='MF82/10'?'10 BNC · MF8210 only':'7 BNC · MF82/12'}</text>
     <text x="${W+30}" y="80" font-size="10" fill="var(--ink2)">green dot = carrying AES</text>
     <text x="${W+30}" y="96" font-size="10" fill="var(--ink2)">positions: BNC-XX.PCB (mils)</text>
     <text x="${W+30}" y="112" font-size="10" fill="var(--ink2)">BNC numbering per rear-</text><text x="${W+30}" y="126" font-size="10" fill="var(--ink2)">module guide; P1 pin per</text><text x="${W+30}" y="140" font-size="10" fill="var(--ink2)">BNC not in archive ${'(inferred order)'}</text></svg>`;
  return s;
}
// Board top view to scale from D8204.PCB (BOARD 1795,1785 – 12615,5335 mil)
const PARTS98 = [['U3 CS8412',6525,4725,1500,787],['U4',7175,4500,660,1557],['U5',8100,4300,534,1382],['U1 equaliser',3375,4450,1055,400],['REG1 LM2825',5725,3550,1519,670],['REG2',4000,2950,408,977],['T1',6500,5100,759,410],['T10',3325,3350,410,732],['U6',10850,4600,904,508],['DIGITAL MONITOR',2050,3100,1350,752],['L trim',9400,4100,323,409],['R trim',9400,3075,310,409],['P1 EDGE30/156',12325,5050,554,2276]];
function boardSVG(){
  const S=0.045, X=v=>10+(v-1795)*S, Y=v=>10+(5335-v)*S, W=(12615-1795)*S, H=(5335-1785)*S;
  let s=`<svg viewBox="0 0 ${W+20} ${H+20}" style="width:100%"><rect x="10" y="10" width="${W}" height="${H}" fill="#1f6b3a" stroke="#0d3a1f"/>`;
  PARTS98.forEach(([n,x,y,w,h])=>{ s+=`<rect x="${X(x)}" y="${Y(y)}" width="${w*S}" height="${h*S}" fill="${n.startsWith('P1')?'#d4af37':'#222'}" opacity=".85"/><text x="${X(x)+2}" y="${Y(y)+10}" font-size="8" fill="#fff">${n}</text>`; });
  const jp=(n,x,y,on)=>`<g class="d4term" data-v="${n}" style="cursor:pointer"><title>INPUT TERMINATION: ${n}</title><rect x="${X(x)}" y="${Y(y)}" width="22" height="8" fill="${on?'#ffd84a':'#555'}" stroke="#000"/><text x="${X(x)+26}" y="${Y(y)+7}" font-size="8" fill="#fff">${n}</text></g>`;
  const jp2=(n,i)=>`<g class="d4term" data-v="${n}" style="cursor:pointer"><title>INPUT TERMINATION: ${n}</title><rect x="${X(4775)+60+i*44}" y="${Y(5200)}" width="40" height="16" rx="3" fill="${D.term===n?'#ffd84a':'#333'}" stroke="#000"/><text x="${X(4775)+80+i*44}" y="${Y(5200)+12}" text-anchor="middle" font-size="10" fill="${D.term===n?'#000':'#fff'}">${n}</text></g>`;
  s+=`<rect x="${X(4775)}" y="${Y(5050)}" width="16" height="10" fill="#ffd84a" stroke="#000"/><line x1="${X(4775)+16}" y1="${Y(5050)+4}" x2="${X(4775)+60}" y2="${Y(5200)+8}" stroke="#fff" stroke-width=".7"/>`+jp2('75',0)+jp2('110',1)+jp2('HIZ',2);
  s+=`</svg><div class="small muted">D8204 ISSUE.2 top view to scale from <span class="mono">D8204.PCB</span> (10.82″ × 3.55″): front edge left, P1 edge connector right. Click 75 / 110 / HIZ to move the INPUT TERMINATION jumper.</div>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.d4eq').forEach(g=>g.onclick=()=>A.eq());
  root.querySelectorAll('.d4in').forEach(g=>g.onclick=()=>A.plug());
  root.querySelectorAll('.d4loop').forEach(g=>g.onclick=()=>A.loopLoad(D.loopLoad==='75'?'open':'75'));
  root.querySelectorAll('.d4term').forEach(g=>g.onclick=()=>A.term(g.dataset.v));
}
function controlsHTML(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
    <label>Cable to input <input type="range" id="d4len" min="0" max="1800" step="10" value="${D.len}"> <span id="d4lenv" class="mono"></span></label>
    <label>Upstream fs <select id="d4fs">${FS_LIST.map(f=>`<option value="${f}" ${f===D.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
    <label>Termination <select id="d4term">${['75','110','HIZ'].map(v=>`<option ${v===D.term?'selected':''}>${v}</option>`).join('')}</select></label>
    <label>Frame <select id="d4frame"><option ${D.frame==='MF82/12'?'selected':''}>MF82/12</option><option ${D.frame==='MF82/10'?'selected':''}>MF82/10</option></select></label>
    <label>H1 (P1M) <select id="d4h1"><option value="audio" ${D.h1==='audio'?'selected':''}>OUT2 copy</option><option value="alarm" ${D.h1==='alarm'?'selected':''}>NO LOCK alarm</option></select></label>
    <label>Build <select id="d4build"><option value="2012" ${D.build==='2012'?'selected':''}>2012 manual (CS8420 + v200.asm)</option><option value="1998" ${D.build==='1998'?'selected':''}>1998 ISSUE.2 (CS8412)</option></select></label>
    <button id="d4eqb">EQ button</button><button id="d4loss">Pull input for 150 ms here</button><button id="d4rst">Factory defaults</button></div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s); if(!q('#d4len')) return;
  const upd=()=>{ q('#d4lenv').textContent = D.len+' m'; };
  q('#d4len').oninput=e=>{ A.len(+e.target.value); upd(); }; upd();
  q('#d4fs').onchange=e=>A.fs(+e.target.value);
  q('#d4term').onchange=e=>A.term(e.target.value);
  q('#d4frame').onchange=e=>A.frame(e.target.value);
  q('#d4h1').onchange=e=>A.h1(e.target.value);
  q('#d4build').onchange=e=>A.build(e.target.value);
  q('#d4eqb').onclick=()=>A.eq(); q('#d4loss').onclick=()=>A.loss(); q('#d4rst').onclick=()=>A.reset();
}

/* ---------------- AES3 bits for the scope ---------------- */
function frameBits(n){ // one AES3 frame: 2 subframes; preamble Z on frame 0 of each 192-frame block
  let seed = (n*2654435761)>>>0; const rnd=()=>{ seed^=seed<<13; seed>>>=0; seed^=seed>>>17; seed^=seed<<5; seed>>>=0; return seed&1; };
  const sub=[]; for (let s=0;s<2;s++){ const pre = s? 'Y' : (n%192===0?'Z':'X'); const bits=[]; for(let i=4;i<32;i++) bits.push(i<28? rnd(): i===31? 0 : 0); sub.push({pre,bits}); }
  return sub;
}
const PRE = { Z:[1,1,1,0,1,0,0,0], Y:[1,1,1,0,0,1,0,0], X:[1,1,1,0,0,0,1,0] };
function cells(n){ const out=[]; let lv=0; frameBits(n).forEach(sf=>{ PRE[sf.pre].forEach(b=>{ lv = b? 1:0; out.push(lv); }); sf.bits.forEach(b=>{ lv^=1; out.push(lv); if (b) lv^=1; out.push(lv); }); }); return out.map(v=>v?1:-1); }
function drawScope(cv, t){
  const {c,w,h}=SIM.canvas(cv,170); const fe=frontEnd(), n=Math.floor(t*D.fs), cl=cells(n);
  const rows=[['At the source (1 V p-p)',1,0,SIM.css('--ink2')],[`At P1A after ${D.len} m (${fe.v.toFixed(2)} V p-p)`,fe.v,Math.min(0.97,D.len/1900),SIM.css('--warn')],[`After U1 ${D.eq?'EQ (on)':'(EQ off)'} → CS8420 RXP`,fe.ok?Math.min(1,fe.atRx):fe.atRx,D.eq?0.1:Math.min(0.97,D.len/1900),SIM.css('--accent2')],[`OUT (EL2280C → 75R): ${outputsAt(t)?'reclocked, 1 V p-p':'TXOFF / no signal'}`,outputsAt(t)?1:0,0,SIM.css('--accent')]];
  const rh=h/rows.length, cw=(w-170)/cl.length;
  rows.forEach(([lbl,amp,lp,col],r)=>{ const y0=r*rh+rh/2; c.fillStyle=SIM.css('--ink'); c.font='10.5px sans-serif'; c.fillText(lbl,4,y0+3); c.strokeStyle=col; c.lineWidth=1.4; c.beginPath(); let v=0;
    for (let i=0;i<cl.length;i++){ for (let k=0;k<6;k++){ v += (cl[i]-v)*(1-lp); const x=170+(i+k/6)*cw, y=y0 - v*amp*rh*0.38*(r===0?1:1); if(i===0&&k===0) c.moveTo(x,y); else c.lineTo(x,y);} }
    c.stroke(); });
  c.fillStyle=SIM.css('--ink2'); c.font='10px monospace'; c.fillText(`frame ${n.toLocaleString()} · ${n%192===0?'Z (block start)':'X'} / Y · 64 bit cells · ${(1e9/(D.fs*128)).toFixed(0)} ns per half-cell`, 172, h-4);
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css=SIM.css;
  return [
    {label:`AES frames in (fs ${D.fs/1000} kHz)`, h:26, draw(c,X,t0,t1,y,h){ const fe=frontEnd();
      if (!fe.ok){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText(D.plugged?'signal below receiver threshold / out of range':'no input',X(t0)+6,y+h/2+4); return; }
      c.fillStyle=css('--bad'); c.globalAlpha=.25; if (D.lossAt!==null) c.fillRect(X(D.lossAt),y,X(D.backAt===null?1:D.backAt)-X(D.lossAt),h); c.globalAlpha=1;
      SIM.pulses(c,X,t0,t1,y,h,1/D.fs,0,0.5/D.fs,css('--accent2'),'frames'); }},
    {label:'Block start (Z, every 192)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,192/D.fs,0,1/D.fs,css('--ink2'),'Z preambles'); }},
    {label:'CS8420 receiver lock', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,rxLockAt,css('--accent'),css('--bad'),'locked','UNLOCK'); }},
    {label:D.build==='2012'?'PIC16F874 MAIN passes':'(1998: no firmware model)', h:34, draw(c,X,t0,t1,y,h){
      if (D.build!=='2012'){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('PIC16C54A code is not in the archive',X(t0)+6,y+h/2+4); return; }
      if (t0<BOOT){ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(0),y+3,X(BOOT)-X(0),h-6); c.globalAlpha=1; }
      const pxPass=X(t0+PASS)-X(t0), i0=Math.max(0,passIndex(t0)), i1=passIndex(t1);
      if (pxPass<3){ c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(Math.max(t0,BOOT)),y+8,X(t1)-X(Math.max(t0,BOOT)),h-16); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px monospace'; c.fillText(`${i1-i0+1} passes × ${SIM.fmtDur(PASS)} (4.9152 MHz, cycles counted from v200.asm)`,X(t0)+6,y+h/2+4); return; }
      const cols=[css('--accent'),css('--accent2'),css('--warn'),css('--bad'),css('--ink2')];
      for (let i=i0;i<=i1;i++){ const p0=passStart(i); STEPS.forEach((s,j)=>{ const a=p0+STEP_T[j], b=a+s[1]*TCY; c.fillStyle=cols[j]; c.globalAlpha=.75; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-0.5),h-6); c.globalAlpha=1;
        if (X(b)-X(a)>80){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0],X(a)+3,y+h/2+3);} }); } }},
    {label:'SPI to CS8420 (RC0/RC1/RC3)', h:20, draw(c,X,t0,t1,y,h){ if (D.build!=='2012') return; const i0=Math.max(0,passIndex(t0)), i1=passIndex(t1);
      if (X(t0+SPI_BIT)-X(t0) < 1.5){ for (let i=i0;i<=i1;i++){ const p=passStart(i); c.fillStyle=css('--accent2'); c.globalAlpha=.5; c.fillRect(X(p),y+5,X(p+STEP_T[3])-X(p),h-10); c.globalAlpha=1; } return; }
      for (let i=i0;i<=i1;i++){ const p=passStart(i); SIM.pulses(c,X,Math.max(t0,p),Math.min(t1,p+STEP_T[3]),y,h,SPI_BIT,p,2*TCY,css('--accent2'),'SCK'); } }},
    {label:'lock_8420,0 (firmware)', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,fwLockAt,css('--accent'),css('--bad'),'1 = lock','0'); }},
    {label:'Outputs (TXP enabled)', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,outputsAt,css('--accent'),css('--ink2'),'8 outputs driven','TXOFF / silent'); }},
    {label:'LEDs: green / red', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>ledsAt(t).green,'#3fc04a','#d2372b','GREEN LOCK','RED NO LOCK'); }},
  ];
}
function stateBar(c,X,t0,t1,y,h,f,onC,offC,onL,offL){
  const N=400; let prev=null, xs=X(t0);
  for (let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const v=f(t); if (prev===null){prev=v; continue;}
    if (v!==prev || i===N){ const xe=X(t); c.fillStyle=prev?onC:offC; c.globalAlpha=.55; c.fillRect(xs,y+4,xe-xs,h-8); c.globalAlpha=1; if (xe-xs>70){ c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(prev?onL:offL,xs+4,y+h/2+3);} xs=xe; prev=v; } }
}

/* ---------------- views ---------------- */
function inspector(t){
  const fe=frontEnd(), st=stepAt(t), L=ledsAt(t);
  return `<table class="kv">
   <tr><th>Cable loss</th><td class="mono">${fe.loss.toFixed(1)} dB at ~3 MHz (${K.DB_PER_100M} dB/100 m ${inf}) → ${fe.v.toFixed(3)} V p-p at P1A</td></tr>
   <tr><th>Termination</th><td>${fe.note}</td></tr>
   <tr><th>EQ / margin</th><td class="mono">${D.eq?'ON (+'+K.EQ_DB+' dB HF, '+inf+')':'off'} · margin ${fe.margin.toFixed(1)} dB over 0.2 V p-p ${fe.margin<0?'<b style="color:var(--bad)">FAIL</b>':''}</td></tr>
   <tr><th>Receiver</th><td class="mono">${D.build==='2012'?'CS8420 U3':'CS8412 U3'} · ${rxLockAt(t)?'locked':'UNLOCK'} · fs ${D.fs/1000} kHz ${fe.fsOK?'':'<b style="color:var(--bad)">outside range</b>'}</td></tr>
   <tr><th>PIC pass</th><td class="mono">${D.build==='2012'? (st.i<0?'power-up delay / INIT':'#'+st.i+' · '+STEPS[st.k][0]) : 'n/a (no firmware)'}</td></tr>
   <tr><th>LEDs</th><td class="mono">GREEN ${L.green?'●':'○'} · RED ${L.red?'●':'○'} · EQ ${L.yellow?'●':'○'}</td></tr>
   <tr><th>P1M (H1)</th><td class="mono">${D.h1==='alarm'? 'NO_LOCK tally: '+(L.noLock?'pulled low (alarm)':'open'):'OUT2 copy'}</td></tr>
   <tr><th>Outputs</th><td class="mono">${outputsAt(t)?nOutputs()+' × 1 V p-p, 75 Ω, reclocked':'none (TXOFF or no lock)'}${D.frame==='MF82/12'?' · OUT 7/8 driven but no BNC on BNC1':''}${D.h1==='alarm'?' · one copy of OUT2 replaced by alarm':''}</td></tr>
  </table>`;
}
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the EQ button, the input BNC, the termination jumper, or use the controls. Each step the hardware and firmware take is listed here.</div>'; }
function viewSim(m){
  window.__d8204Active=false;
  m.innerHTML = `<div class="grid2"><div>
     ${card('Card front edge, board and rear module at the playhead', `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start"><div id="fp" style="flex:0 0 240px"></div><div id="rp" style="flex:1;min-width:240px"></div></div><div id="bd"></div>${controlsHTML()}`)}
   </div><div>${card('What happened (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
   ${card('Timeline — one second (click to seek, zoom from the transport)', `<canvas id="tl"></canvas><p class="small muted">Pass length is worked out from the crystal (4.9152 MHz → 0.814 µs per instruction) and the instruction counts of <span class="mono">v200.asm</span>: two 19-byte register refreshes (955 cycles each), the lock read (271) and the status update (26) give ${SIM.fmtDur(PASS)} per pass. That is the D8204B code; the 2012 D8204 manual prints the D8204B ISS3 schematic, so this is how the card sold as D8204 in 2012|45 behaved. Use “Pull input” to watch the firmware react pass by pass.</p>`)}
   <div class="grid2">${card('Scope at the playhead: one AES3 frame through the card', `<canvas id="sc"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  bindControls(m);
  SIM.on('time', ()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); m.querySelector('#bd').innerHTML=boardSVG(); bindPanel(m);
    m.querySelector('#insp').innerHTML=inspector(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190}); drawScope(m.querySelector('#sc'), t); });
}

/* ---------------- tutorial ---------------- */
let lesson=0;
const LESSONS = [
  {title:'Meet the D8204', body:`<p>The D8204 takes <b>one AES/EBU input on 75 Ω coax</b> and sends identical, <b>reclocked</b> copies to up to <b>eight</b> outputs. It is a 1″-wide card for the MF82 frames. Three LEDs sit on the front edge above the handle: green <b>LOCK</b>, red <b>NO LOCK</b>, yellow <b>EQ</b>. The EQ button is beside them.</p><p class="muted">The panel on the right is live: click the BNCs and the button. Click Next.</p>`, check:()=>true, auto:true},
  {title:'1 · Fit the card and rear module', body:`<p>The manual: in an <b>MF82/12</b> frame use the <b>BNC1</b> module (1 in + 6 out). For all eight outputs and an input loop, use an <b>MF82/10</b> with <b>BNC3</b> (MF8210 only). Pins 1 and A go at the top; the handle reads top to bottom.</p><p><b>Goal:</b> install the card in an MF82/10 frame.</p>`, check:()=>D.frame==='MF82/10', hint:'Frame selector → MF82/10.'},
  {title:'2 · Connect the input', body:`<p>Plug the AES source into <b>DIGITAL INPUT</b>. With a short cable the receiver locks in a few ms and the green LED comes on at the end of the next firmware pass.</p><p><b>Goal:</b> green LOCK on with 300 m of cable.</p>`, check:()=>D.plugged&&frontEnd().ok&&D.len<=600, hint:'Click the IN BNC if it is unplugged, and keep the cable ≤ 600 m.'},
  {title:'3 · Set the input termination', body:`<p>The two-position Berg header <b>INPUT TERMINATION</b> is marked 75 and 110 Ω. Remove the jumper for <b>HiZ</b>. The card ships at 75 Ω.</p><p>When you bridge the signal on with the BNC3 <b>LOOP</b> to another device, set this card to <b>HiZ</b> and let the last device terminate the line. Try 75 Ω with a terminated loop and watch the level drop 6 dB.</p><p><b>Goal:</b> loop to a terminated device, and set this card to HIZ.</p>`, check:()=>D.loopLoad==='75'&&D.term==='HIZ', hint:'Click the LOOP BNC on the rear module, then click HIZ on the board drawing.'},
  {title:'4 · Long cables need EQ', body:`<p>Up to <b>600 m</b> the card recovers the signal as it comes. Beyond that, press the <b>EQ</b> button: the yellow LED lights and the input stage adds high-frequency boost (rated to 5000 ft of 75 Ω coax).</p><p><b>Goal:</b> lock with 1200 m of cable.</p>`, check:()=>D.len>=1200&&frontEnd().ok, hint:'Drag the cable slider to 1200 m — it unlocks — then press EQ.'},
  {title:'5 · Watch a dropout', body:`<p>Press <b>“Pull input for 150 ms here”</b>, then scrub the timeline (zoom to 10 ms). Follow the order: the receiver loses lock → the next <span class="mono">READ8420s</span> sees it → <span class="mono">REFRESHSTATUS</span> swaps green for red and sets the NO LOCK tally → the next <span class="mono">REFRESH8420_1</span> writes TXOFF, silencing every output.</p><p><b>Goal:</b> a dropout recorded on the timeline.</p>`, check:()=>D.lossAt!==null, hint:'Use the button in the Simulator controls.'},
  {title:'6 · Use output 2 as an alarm', body:`<p>Header <b>H1</b> chooses what P1M carries: the second copy of OUT2, or the <b>NO LOCK</b> open-collector alarm (Q1, 2N4401). The rear-module art for the related cards says “this output can be used as an alarm by setting the jumper”.</p><p><b>Goal:</b> H1 = NO LOCK alarm.</p>`, check:()=>D.h1==='alarm', hint:'H1 selector → NO LOCK alarm.'},
  {title:'Done', body:`<p>That is everything the operator can touch. The <b>Software</b> tab shows the PIC loop doing this, and <b>Findings</b> lists what the files reveal — including that the 2012 D8204 manual prints the D8204B schematic.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  window.__d8204Active=false;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — installing and using the D8204 (from D8204MAN.WPD)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div></div>
   <div>${card('The card', `<div style="display:flex;gap:10px;flex-wrap:wrap"><div id="fp" style="flex:0 0 240px"></div><div id="rp" style="flex:1;min-width:220px"></div></div><div id="bd"></div>${controlsHTML()}`)}${card('What happened', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); m.querySelector('#bd').innerHTML=boardSVG(); bindPanel(m); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i; draw();});
    const L=LESSONS[lesson], ok=L.check();
    m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
     <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#rs').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__d8204Active=false;
  const n=D.fs, passes=Math.floor((1-BOOT)/PASS);
  m.innerHTML = `<div class="grid3">
   ${card('Audio', `<table class="kv"><tr><th>AES frames</th><td class="mono">${n.toLocaleString()}</td></tr><tr><th>Subframes</th><td class="mono">${(2*n).toLocaleString()}</td></tr><tr><th>Biphase cells</th><td class="mono">${(128*n).toLocaleString()} (${(128*n/1e6).toFixed(3)} Mbaud)</td></tr><tr><th>Channel-status blocks</th><td class="mono">${(n/192).toFixed(1)} (one Z preamble each)</td></tr><tr><th>Copies made</th><td class="mono">${nOutputs()} × ${n.toLocaleString()} frames</td></tr></table>`)}
   ${card('Firmware (2012 build)', `<table class="kv"><tr><th>Crystal / cycle</th><td class="mono">4.9152 MHz / ${(TCY*1e6).toFixed(3)} µs</td></tr><tr><th>Boot</th><td class="mono">${SIM.fmtDur(BOOT)} (powerupdelay + 2 refreshes)</td></tr><tr><th>MAIN passes</th><td class="mono">${passes} × ${SIM.fmtDur(PASS)}</td></tr><tr><th>SPI bytes written</th><td class="mono">${(passes*(2*19+4)).toLocaleString()} (19 per chip refresh + 4 read setup)</td></tr><tr><th>Lock reads</th><td class="mono">${passes*2} (chip #1 and the absent #2)</td></tr><tr><th>Worst-case LED delay</th><td class="mono">${SIM.fmtDur(2*PASS)}</td></tr></table>`)}
   ${card('Analog', `<table class="kv"><tr><th>Bit-cell fundamental</th><td class="mono">${(64*n/1e6).toFixed(3)} MHz</td></tr><tr><th>Cable loss now</th><td class="mono">${frontEnd().loss.toFixed(1)} dB</td></tr><tr><th>At receiver</th><td class="mono">${frontEnd().atRx.toFixed(2)} V p-p</td></tr><tr><th>Outputs</th><td class="mono">1 V p-p into 75 Ω each, EL2280C + 75R + 1 µF</td></tr><tr><th>Power</th><td class="mono">+20 V 47 mA, −20 V 37 mA max (manual)</td></tr></table>`)}</div>
   ${card('Zoomed ladder at the playhead', `<canvas id="ld"></canvas><p class="small muted">Each row zooms ×~20 around the playhead: second → block → frame → bit cells. Click to seek.</p>`)}`;
  SIM.on('time', ()=>{ const cv=m.querySelector('#ld'); const t=SIM.t, rows=[[1,'1 s'],[0.05,'50 ms'],[192/D.fs,'1 block'],[4/D.fs,'4 frames'],[PASS,'1 PIC pass']];
    const {c,w}=SIM.canvas(cv, rows.length*40+10); rows.forEach(([span,l],r)=>{ let a=Math.max(0,t-span/2); if (a+span>1) a=1-span; const b=a+span, y=r*40+6, X=v=>150+(v-a)/(b-a)*(w-160);
      c.fillStyle=SIM.css('--ink'); c.font='11px sans-serif'; c.fillText(l+' ('+SIM.fmtDur(span)+')',4,y+20);
      if (span>=0.05) SIM.pulses(c,X,a,b,y,30,192/D.fs,0,1/D.fs,SIM.css('--ink2'),'blocks'); else if (span>=192/D.fs*0.9) SIM.pulses(c,X,a,b,y,30,1/D.fs,0,0.5/D.fs,SIM.css('--accent2'),'frames'); else if (span<PASS*1.1 && span>4/D.fs){ STEPS.forEach((s,j)=>{ const i=Math.max(0,passIndex(t)); const p=passStart(i)+STEP_T[j]; c.fillStyle=[SIM.css('--accent'),SIM.css('--accent2'),SIM.css('--warn'),SIM.css('--bad'),SIM.css('--ink2')][j]; c.globalAlpha=.6; c.fillRect(X(p),y+4,X(p+s[1]*TCY)-X(p),22); c.globalAlpha=1; }); } else SIM.pulses(c,X,a,b,y,30,1/(D.fs*128),0,0.5/(D.fs*128),SIM.css('--accent'),'cells');
      c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(X(t),y); c.lineTo(X(t),y+30); c.stroke(); }); });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  bnc:{x:10,y:140,w:120,h:66,t:'Rear module',s:['BNC1 / BNC3','IN (+LOOP on BNC3)'],d:'BNC1 (7 BNC, MF82/12) or BNC3 (10 BNC, MF82/10 only). The input arrives at P1A / P1-1 on the 30-way edge connector.'},
  term:{x:160,y:40,w:120,h:66,t:'TERM H1X3',s:['R24 75R / R9 110R','open = HiZ'],d:'Input termination header. Shipped at 75 Ω (manual). Removing the jumper leaves R49 3K: HiZ for loop-through.'},
  xf:{x:160,y:140,w:120,h:66,t:'T1 PE-65612',s:['C16 0.1 µF','AES pulse xfmr'],d:'Isolation transformer from the coax to the equaliser (2012 schematic). The 1998 ISSUE.2 uses DA_TR T10/T9.'},
  eq:{x:310,y:140,w:150,h:76,t:'U1 EL2280C',s:['U1:A gain, D1/D2 clamp','SW1 EQ: R13/C9, R19/C15','U1:B → R31 110R'],d:'Two-stage input amplifier. SW1 (PHA-2UEE) switches the HF-boost network in and lights the yellow EQ LED. D1/D2 1N4148 clamp U1:A input.'},
  rx:{x:490,y:140,w:140,h:76,t:'U3 CS8420',s:['RXP/RXN → PLL','TXP → drivers','reg 3 bit 6 TXOFF'],d:'Receives, re-times and re-transmits the AES3 stream (sample-rate converter bypassed by reg 3/4 values). 1998 ISSUE.2 used a CS8412 receiver instead.'},
  pic:{x:490,y:20,w:140,h:76,t:'U25 PIC16F874',s:['4.9152 MHz','bit-bang SPI RC0/1/2/3','LEDs RD7 / RB0'],d:'Runs v200.asm (D8204B firmware): refreshes the CS8420 registers and polls lock every 1.80 ms. 1998: PIC16C54A, code not archived.'},
  drv:{x:660,y:140,w:130,h:76,t:'U2, U5 EL2280C',s:['4 drivers (A/B)','each → 2 × (1 µF + 75R)'],d:'Four driver halves each feed two outputs through 1.0 µF and 75 R: OUT1 → P1J/P1K, OUT2 → P1L/P1M(H1), OUT3 → P1F/P1H, OUT4 → P1E/P1D.'},
  leds:{x:660,y:20,w:130,h:76,t:'Front edge',s:['L4 GREEN, L3 RED','EQ yellow','Q1 NO_LOCK tally'],d:'GREEN from RD7 (R33 330R), RED from RB0 (R32 330R). Q1 2N4401 from RC6 via R29 4K7 sinks the NO_LOCK line (H1 → P1M).'},
  out:{x:820,y:140,w:90,h:66,t:'8 outputs',s:['P1 → rear BNCs','1 V p-p'],d:'BNC3 brings all 8 out; BNC1 only 6.'},
  pwr:{x:310,y:250,w:150,h:60,t:'Power',s:['LM2596 → +5 V','LM337 → −5 V'],d:'From the frame rails via RXE-050 polyfuses (P1 pins 26, 30). Manual: +20 V 47 mA, −20 V 37 mA.'},
};
const WIRES=[['bnc','xf','AES in'],['term','xf',''],['xf','eq',''],['eq','rx','RXP/RXN'],['pic','rx','SPI'],['rx','drv','TXP'],['drv','out',''],['pic','leds','RD7 RB0 RC6'],['pwr','eq',''],['pwr','rx','']];
function blockSVG(sel){
  const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
  let s=`<svg viewBox="0 0 920 330" style="width:100%"><defs><marker id="d4a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y,k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9);return[x+dx*k,y+dy*k];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
    s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#d4a)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
  for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
  return s+'</svg>';
}
function viewBlock(m){
  window.__d8204Active=false; let sel='rx';
  m.innerHTML=`<div class="grid2">${card('Block diagram (2012 manual board) — click a block', `<div id="bd"></div>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('Signal flow', `<p>The coax arrives on the rear module, crosses the edge connector to the input transformer, is equalised by U1, and is re-timed by the CS8420. Its regenerated TXP output drives four EL2280C buffers; each buffer feeds two 75 Ω outputs. The PIC never touches the audio: it only keeps the CS8420 configured, watches lock, drives the LEDs and mutes the transmitter on loss.</p>`)}</div></div>`;
  const draw=()=>{ m.querySelector('#bd').innerHTML=blockSVG(sel); m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b; draw();}); const b=BLOCKS[sel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n_],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p}</text>${n_?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${n_}</text>`:''}`; });
  right.forEach(([p,n_],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p}</text>${n_?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${n_}</text>`:''}`; });
  return s;
}
const SHEETS=[
  {name:'1 · Input and EQ', note:'From the 2012 manual, sheet 1 (d8204B-ISS3.sch). Part values as printed.', svg:()=> chip(330,70,170,'U1 EL2280C',[['3 (+A)','IN via R10 110R'],['2 (−A)','R1 750R fb'],['6 (+B)','R5 750R / EQ net'],['5 (−B)','']],[['1 (A out)','R4 750R, R30 110R'],['7 (B out)','R3 750R, R31 110R → RXP'],['8/4','+5V / −5V']],'dual video op-amp')
    + `<text x="40" y="60" font-size="11" fill="var(--ink)">P1A → C16 0.1 → T1 PE-65612 (1:1) → R10 110R</text><text x="40" y="78" font-size="11" fill="var(--ink)">TERM H1X3: R9 110R / R24 75R to GND · R49 3K</text>
       <text x="40" y="300" font-size="11" fill="var(--ink)">SW1 PHA-2UEE (DPDT): pole A inserts R13 330R + C9 1000p ‖ R19 110R + C15 220p (R17/C14 DNI)</text><text x="40" y="318" font-size="11" fill="var(--ink)">pole B: +5V → R75 330R → EQ LED (yellow)</text><text x="40" y="336" font-size="11" fill="var(--ink)">D1, D2 1N4148 clamp U1:A input to ±5V</text>`},
  {name:'2 · Receiver', note:'CS8420 pins from the 2012 schematic. Only TXP (pin 26 net in this drawing is TXN 25 to the drivers) is used to drive the outputs.', svg:()=> chip(340,50,190,'U3 CS8420',[['4 RXP','U1:B via C10'],['5 RXN','C12 0.1 to GND'],['8 FILT','R23 4K7 + C20 .068, C17 6800p'],['9 RESET','RESET (RC7)'],['28 SCL/CCLK','SCK (RC1)'],['27 AD1/CDIN','SDO (RC0)'],['1 SDA/CDOUT','SDI (RC3)'],['2 AD0/CS','CS1 (RC2)']],[['25 TXN','→ U2/U5 drivers'],['26 TXP',''],['6 VA, 23 VD','+5V via R2 10R'],['24 H/S','GND'],['17–21','OLRCK…OMCK n.c.']],'AES3 transceiver + SRC (SRC bypassed)')},
  {name:'3 · Output drivers', note:'Each EL2280C half drives two outputs through 1.0 µF + 75R (sheet 1). OUT2’s second leg goes to H1 so P1M can carry NO_LOCK instead.', svg:()=>{ let s=''; [['U2:A','OUT1','P1J','P1K'],['U2:B','OUT2','P1L','P1M (via H1)'],['U5:B','OUT3','P1F','P1H'],['U5:A','OUT4','P1E','P1D']].forEach(([u,o,a,b],i)=>{ const y=50+i*95; s+=`<polygon points="160,${y-18} 160,${y+18} 196,${y}" fill="var(--panel2)" stroke="var(--ink)"/><text x="150" y="${y+4}" text-anchor="end" font-size="11" fill="var(--accent2)">TXN →</text><text x="166" y="${y-22}" font-size="10.5" fill="var(--ink)">${u} EL2280C (R 750R/750R)</text><line x1="196" y1="${y}" x2="260" y2="${y}" stroke="var(--ink)"/><text x="204" y="${y-5}" font-size="10.5" fill="var(--accent2)">${o}</text><line x1="260" y1="${y-20}" x2="260" y2="${y+20}" stroke="var(--ink)"/>${[a,b].map((p,k)=>{const yy=y-20+k*40;return `<line x1="260" y1="${yy}" x2="290" y2="${yy}" stroke="var(--ink)"/><text x="292" y="${yy+4}" font-size="10" fill="var(--ink)">1.0µ ┤├ 75R ⏛</text><line x1="380" y1="${yy}" x2="430" y2="${yy}" stroke="var(--ink)"/><text x="436" y="${yy+4}" font-size="11" fill="var(--accent2)">${p}</text>`;}).join('')}`; }); return s+`<text x="560" y="140" font-size="11" fill="var(--ink2)">H1 H1X3: centre = P1M</text><text x="560" y="158" font-size="11" fill="var(--ink2)">one side R16 75R (OUT2), other NO_LOCK</text>`; }},
  {name:'4 · PIC and LEDs', note:'Sheet 2: U25 PIC16F874 (44-pin), X2 4.9152 MHz with 27p C64/C66, MCLR via D11 4148. H13 3×2 header on RB3–RB7 is not read by v200.asm.', svg:()=> chip(330,40,180,'U25 PIC16F874',[['17–11 RB7..RB3','H13 header'],['8 RB0','NET00037 → R32 → L3 RED'],['9 RB1','NET00025'],['1 RC7','RESET'],['44 RC6','NET00058 → R29 → Q1'],['42 RC4','CS2 (2nd chip, n.f.)'],['36 RC2','CS1'],['35 RC1','SCK'],['37 RC3','SDI'],['32 RC0','SDO']],[['5 RD7','NET00045 → R33 → L4 GREEN'],['18 MCLR','+5V via D11'],['31/30 OSC','X2 4.9152 MHz'],['7,28 VDD','+5V'],['6,29,34 GND','']],'v200.asm (D8204B, 2005|38 / v101 2010|43)')
    + `<text x="40" y="330" font-size="11" fill="var(--ink)">Q1 2N4401/SM: base R29 4K7 from RC6, collector R44 4K7 → NO_LOCK (open collector, to H1)</text>`},
  {name:'5 · Edge connector P1 and power', note:'P1 30-way 0.156″ (EDGE30/156, contacts 1–15 and A–S). Sheet 2 pin map; GNDD on B/3 and 27/28; rails via F2/F3 RXE-050 polyfuses.', svg:()=>{ const pins=[['A','P1A (AES in +)'],['1','P1_1 (AES in −)'],['B / 3','GNDD'],['2','P1_2'],['C','P1C'],['D','P1D (OUT4)'],['E','P1E (OUT4)'],['F','P1F (OUT3)'],['H','P1H (OUT3)'],['J','P1J (OUT1)'],['K','P1K (OUT1)'],['L','P1L (OUT2)'],['M','P1M (OUT2 / NO_LOCK)'],['N','P1N'],['13 (26)','→ F3 → LM337 → −5V'],['15 (30)','→ F2 → R35 10R → LM2596 → +5V'],['R/S/14','GND']]; let s=''; pins.forEach(([p,n],i)=>{ const y=40+i*22; s+=`<rect x="60" y="${y-10}" width="40" height="16" fill="#d4af37" opacity=".7"/><text x="80" y="${y+2}" text-anchor="middle" font-size="10.5" fill="#000">${p}</text><line x1="100" y1="${y-2}" x2="150" y2="${y-2}" stroke="var(--ink)"/><text x="156" y="${y+2}" font-size="11" fill="var(--accent2)">${n}</text>`; }); return s+`<text x="460" y="60" font-size="11" fill="var(--ink)">REG2 LM2596 buck: L1 PE-53823, D5 SK33, L2 AL05-1.0-K → +5V</text><text x="460" y="80" font-size="11" fill="var(--ink)">REG1 LM337 (R25 221R / R27 665R) → −5V</text><text x="460" y="110" font-size="11" fill="var(--ink2)">Physical contact numbers in brackets are the</text><text x="460" y="126" font-size="11" fill="var(--ink2)">schematic's 1–30 numbering of the same fingers.</text>`; }},
  {name:'6 · 1998 ISSUE.2 parts', note:'From D8204.DSN (1998|31, 57 parts) and D8204A.DSN (2 pages, 112 parts; adds LF353, OUT8 jumper). Net labels recovered: LOCK, CONFIDENCE, EQ, HIZ, PORTLEFT-L/RIGHT-R, AGND.', svg:()=> chip(120,60,160,'U3 CS8412',[['RXP/RXN','from T10 DA_TR'],['','']],[['ERF / C','→ PIC'],['','']],'receiver only') + chip(500,60,160,'U7 PIC16C54A',[['RA/RB','LOCK, CONFIDENCE'],['','']],[['','LEDs'],['','EQ']],'code not in archive') + `<text x="60" y="230" font-size="11" fill="var(--ink)">U6 OPA650 (TO-225 footprint on the PCB) output drivers · REG1 LM2825 (DIP24) · REG2 LM117</text><text x="60" y="250" font-size="11" fill="var(--ink)">PCB ISSUE.2 text: "DIGITAL AUDIO DA FOR M8204A", "16dBFS 18dBFS 24dBFS", L/R trims, DIGITAL MONITOR jack, ALARM / AUDIO headers</text><text x="60" y="270" font-size="11" fill="var(--ink2)">The same layout carries the analog (D/A) section of the D8204A variant; on a plain D8204 those parts are left off ${'(inferred)'}.</text>`},
];
function viewSchem(m){
  window.__d8204Active=false; let i=0;
  m.innerHTML=card('Schematic set (redrawn from the archive’s net names — not the original CAD)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">Originals: the scanned 2012 manual pages 5–6 (P-CAD “d8204B-ISS3.sch”) and OrCAD <span class="mono">D8204 - #PCB/D8204.DSN</span>. Blue labels are nets.</p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();});
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 440" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="428" fill="none" stroke="var(--line)"/><text x="840" y="426" text-anchor="end" font-size="10" fill="var(--ink2)">D8204 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`; m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
const REGS=[['1','Misc Control 1','cs8420reg1def','00000000','SDOUT etc. defaults'],['2','Misc Control 2','cs8420reg2def','00000000',''],['3','Data Flow Control','cs8420reg3def / reg3off','10010101 / 11010101','bit 6 TXOFF: 1 = AES3 transmitter driver off'],['4','Clock Flow Control','cs8420reg4def','01001001','RUN, clock sources'],['5','Serial In format','cs8420reg5def','00000000',''],['6','Serial Out format','cs8420reg6def','10010010','(D8204A uses 10000010)'],['9','Interrupt 1 mask','cs8420reg9def','00000000','all masked'],['17','Receive Error mask','cs8420reg17def','00010000','UNLOCK unmasked'],['16','Receiver Error (read)','—','QCRC CCRC UNLOCK V CONF BIP PAR','bit 4 tested by READ8420s']];
function viewSoft(m){
  window.__d8204Active=false;
  m.innerHTML=`<div class="grid2">${card('PIC16F874 MAIN (v200.asm) — the box lit up runs at the playhead', `<div id="fl"></div>`)}<div>${card('REFRESHSTATUS decision (lock_8420,0)', `<div id="fsm"></div>`)}${card('SPI frame (shiftout, MSB first)', `<div id="spi"></div>`)}</div></div>
   <div class="grid2">${card('CS8420 register image written every pass', `<table class="kv"><tr><th>Reg</th><th>Name</th><th>Symbol</th><th>Value</th><th>Note</th></tr>${REGS.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td class="mono small">${r[2]}</td><td class="mono small">${r[3]}</td><td class="small">${r[4]}</td></tr>`).join('')}</table>`)}
   ${card('How the controls work', `<table class="kv"><tr><th>Operator does</th><th>Path</th><th>Effect</th></tr><tr><td>EQ button</td><td class="small">SW1 pole A (hardware)</td><td class="small">HF boost in U1 path; pole B lights EQ LED. Firmware never sees it.</td></tr><tr><td>Termination jumper</td><td class="small">TERM H1X3</td><td class="small">75 / 110 Ω / HiZ at the transformer primary</td></tr><tr><td>Signal lost</td><td class="mono small">READ8420s → REFRESHSTATUS</td><td class="small">RD7 low, RB0 high, RC6 high (NO_LOCK), cs8420reg13 = reg3off</td></tr><tr><td>(next pass)</td><td class="mono small">REFRESH8420_1 byte 3</td><td class="small">TXOFF = 1: outputs silent</td></tr><tr><td>Signal back</td><td class="mono small">same, reversed</td><td class="small">PLL lock (${K.LOCK_T*1e3} ms ${inf}) + ≤ 2 passes</td></tr><tr><td>H1 jumper</td><td class="small">hardware</td><td class="small">P1M = OUT2 copy or Q1 NO_LOCK collector</td></tr></table>`)}</div>`;
  SIM.on('time', ()=>{ const st=stepAt(SIM.t), L=fwLockAt(SIM.t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*48+90}" style="width:100%"><defs><marker id="d4b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs><rect x="120" y="6" width="280" height="28" rx="14" fill="${st.i<0?'var(--warn)':'var(--chip)'}" stroke="var(--line)"/><text x="260" y="25" text-anchor="middle" font-size="11.5" fill="var(--ink)">INIT: ports, powerupdelay, reg defaults, RC7 high</text>`;
    STEPS.forEach((p,j)=>{ const y=48+j*48, on=D.build==='2012'&&st.i>=0&&st.k===j; s+=`<line x1="260" y1="${y-12}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#d4b)"/><rect x="30" y="${y}" width="460" height="36" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="40" y="${y+15}" font-size="12" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}  ·  ${p[1]} cycles = ${SIM.fmtDur(p[1]*TCY)}</text><text x="40" y="${y+30}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${p[2]}</text>`; });
    const yb=48+STEPS.length*48; s+=`<path d="M490 ${yb-30} h20 V44 h-20" fill="none" stroke="var(--ink2)" marker-end="url(#d4b)"/><text x="30" y="${yb+20}" font-size="11" fill="var(--ink2)">${D.build==='2012'?(st.i<0?'INIT (power-up delay)':'pass #'+st.i)+' · '+SIM.fmtDur(PASS)+' per pass':'Switch Build to 2012 to see the firmware run'} · no interrupts (ORG 4 is a bare RETFIE)</text></svg>`;
    m.querySelector('#fl').innerHTML=s;
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 460 150" style="width:100%"><circle cx="100" cy="75" r="50" fill="${L?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="100" y="70" text-anchor="middle" font-size="12" font-weight="700" fill="${L?'#fff':'var(--ink)'}">LOCK</text><text x="100" y="88" text-anchor="middle" font-size="10" fill="${L?'#fff':'var(--ink2)'}">RD7=1 RB0=0 RC6=0</text><text x="100" y="102" text-anchor="middle" font-size="10" fill="${L?'#fff':'var(--ink2)'}">reg3 = 10010101</text>
      <circle cx="360" cy="75" r="50" fill="${!L?'var(--bad)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="360" y="70" text-anchor="middle" font-size="12" font-weight="700" fill="${!L?'#fff':'var(--ink)'}">NO LOCK</text><text x="360" y="88" text-anchor="middle" font-size="10" fill="${!L?'#fff':'var(--ink2)'}">RD7=0 RB0=1 RC6=1</text><text x="360" y="102" text-anchor="middle" font-size="10" fill="${!L?'#fff':'var(--ink2)'}">reg3 = 11010101 TXOFF</text>
      <path d="M150 60 Q230 20 310 60" fill="none" stroke="var(--ink2)"/><text x="230" y="30" text-anchor="middle" font-size="10" fill="var(--ink2)">reg16 bit4 = 1</text><path d="M310 92 Q230 135 150 92" fill="none" stroke="var(--ink2)"/><text x="230" y="140" text-anchor="middle" font-size="10" fill="var(--ink2)">reg16 bit4 = 0</text></svg>`;
    const bytes=[['0x20','chip addr + W'],['0x81','MAP 1 + auto-inc'],['…','regs 1–6'],['0x00 ×2','7, 8 read-only'],['reg9',''],['×7','10–16 dummy'],['reg17','']];
    m.querySelector('#spi').innerHTML=`<div class="small mono">${bytes.map(b=>`<span class="chip">${b[0]} ${b[1]}</span>`).join('')}</div><p class="small muted">Bit time ${SIM.fmtDur(SPI_BIT)} (≈${(1/SPI_BIT/1e3).toFixed(0)} kHz SCK). Each refresh is 19 bytes; because auto-increment can't skip addresses, registers 7–8 and 10–16 are clocked with filler bytes.</p>`;
  });
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__d8204Active=false;
  m.innerHTML = card('What the D8204 is up to — findings from the files', `<ol>
   <li><b>The 2012 “D8204 Complete Manual” prints the D8204B schematic.</b> Pages 5–6 of <span class="mono">D8204 March 13 2012 Complete Manual.pdf</span> are titled “D8204B AES/EBU DISTRIBUTION AMP, d8204B-ISS3.sch, Tue Mar 13 2012” (drawn by DSB, the same morning the PDF was scanned). By 2012|45 the D8204 sold to customers was built on the D8204B board, so the D8204B firmware (<span class="mono">v200.asm</span>) is the code that ran it. The original 1998|31 D8204 (CS8412 + PIC16C54A, <span class="mono">D8204.DSN</span>) has no code in the archive.</li>
   <li><b>The firmware talks to a chip that isn't there.</b> <span class="mono">REFRESH8420_2</span> refreshes a second CS8420 on PORTC,4 every pass and <span class="mono">READ8420s</span> reads its lock into <span class="mono">lock_8420,1</span>, which nothing uses. The ISS3 schematic has only U3. Almost half of each 1.80 ms pass is spent clocking 19 bytes into nothing (CS2 is wired as a test pad).</li>
   <li><b>Mute by transmitter-off.</b> On loss of lock <span class="mono">REFRESHSTATUS</span> loads <span class="mono">cs8420reg3off</span> (b'11010101', TXOFF) — so all eight outputs go silent rather than passing a corrupted signal. The new value only reaches the chip on the next pass, and relock needs up to two passes after the PLL settles.</li>
   <li><b>Comment conflict on RD7.</b> INIT sets <span class="mono">bsf portd,7 ;error</span>, while REFRESHSTATUS calls the same pin <span class="mono">;signal1 lock</span>. The schematic settles it: RD7 (NET00045) drives the GREEN LED. The code just never clears it during the power-up delay, so the green LED is briefly on before the first status update.</li>
   <li><b>Both chips are addressed at once.</b> <span class="mono">READ8420s</span> drops both chip-selects to write the MAP pointer (16) to the two receivers in one transfer, then reads each separately — a neat saving, but it relies on both parts sharing the 0x20 address byte.</li>
   <li><b>H1 turns an output into an alarm.</b> P1M is either the second copy of OUT2 or the NO_LOCK open collector (Q1). On BNC3 that means “output 8” can become a tally. The D8204A/C artwork says the same (“THIS OUTPUT CAN BE USED AS AN ALARM BY SETTING THE JUMPERS”).</li>
   <li><b>Spec range vs hardware.</b> The manual gives 30–50 kHz. That suits the CS8412; the CS8420 in the 2012 board would lock to 96 kHz too, and the sibling D8208 is sold as 22–96 kHz. Switch Build to compare.</li>
   <li><b>The 1998 PCB is a shared D8204/D8204A board.</b> <span class="mono">D8204.PCB</span> ISSUE.2 carries “DIGITAL AUDIO DA FOR M8204A”, analog L/R trims, a 16/18/24 dBFS jumper, AUDIO/ALARM headers and a DIGITAL MONITOR jack — the analog-output variant's parts on the same layout. (“M8204A” on a digital board is probably a slip for D8204A, ${inf}.)</li>
   <li><b>Leftovers.</b> The D8204 folder once held the D8203 firmware (moved to “WAS IN D8204 FOLDER #PROBLEM”); <span class="mono">D8204 - #ARCHIVE</span> is a byte-for-byte duplicate of <span class="mono">#Engineering</span>; the D8204A manual drafts (2005–2006|38–39) live here, not in the D8204A folder.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
   <li>Cable loss ${K.DB_PER_100M} dB/100 m and EQ +${K.EQ_DB} dB are ${inf}, fitted to the manual's 600 m / 5000 ft figures.</li>
   <li>PLL lock time ${K.LOCK_T*1e3} ms and loss detection after ~3 frames are ${inf}.</li>
   <li>Pass time ${SIM.fmtDur(PASS)} is counted from <span class="mono">v200.asm</span> at 4.9152 MHz; the real loop is the same code, so this should be within a few cycles.</li>
   <li>Which BNC number maps to which P1 pin is not in the archive; outputs are treated as identical copies.</li>
   <li>1998 build: LEDs follow the receiver directly (no firmware to model).</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>D8204 - #Engineering/D8204MAN.WPD · D8204 March 13 2012 Complete Manual.pdf (pp. 5–6)</li><li>D8204 - #PCB/D8204.DSN, D8204A.DSN, D8204.PCB</li><li>D8204B - #Master/D8204B - #Software/…#v101/v200.asm (sibling firmware)</li><li>8200 Series Rear Module options…/D8204 - rear module options.pdf · D8204TRM.dxf · D8204AT1.CDR</li><li>M8200 Extender, handle…/BNC-XX.PCB</li></ul>`);
}

SIM.register({
  id:'d8204', name:'D8204 · AES/EBU reclocking DA (1998|31)', duration:1,
  product:'D8204', year:1998, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8204 - #Master #MF82',
  summary:'One AES/EBU input on 75 Ω coax, equalised, re-timed and fanned out to eight 75 Ω outputs on an MF82 frame card. The 2012 manual board runs the D8204B PIC firmware, which polls a CS8420 every 1.8 ms, drives the LOCK/NO LOCK LEDs and mutes the outputs on loss.',
  highlights:['Cable length, EQ and termination model','BNC1 / BNC3 rear modules from the PCB','PIC loop timed from the crystal','Dropout traced pass by pass','2012 manual prints the D8204B schematic'],
  depth:'Hardware model',
  stepUnits:[{label:'1 PIC pass', period:()=>PASS},{label:'1 AES block (192 frames)', period:()=>192/D.fs},{label:'1 AES frame', period:()=>1/D.fs},{label:'1 ms', period:()=>0.001},{label:'10 ms', period:()=>0.01}],
  zooms:[[1,'1 s (whole)'],[0.2,'200 ms'],[0.02,'20 ms'],[0.005,'5 ms (≈3 passes)'],[0.0018,'1 pass (1.8 ms)'],[0.0002,'200 µs'],[2/48000,'2 AES frames']],
  defaultZoom:1,
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial',render:viewTut},
    {id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Software',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
