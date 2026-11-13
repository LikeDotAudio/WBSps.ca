/* =====================================================================
   AMA4 — 1RU "AMA-4 AUDIO MONITOR SYSTEM", 2016|49 production-drafting model
   (Ward-Beck Systems SELECT SERIES). Plugin for the WBS Device Simulator.

   The AMA4 folder holds only metalwork and silkscreen. Its electronics are
   reconstructed from the sister AMS4 (same chassis, same front-panel layout):
   Sources used (all in this archive):
   - #AMA #SERIES/XXX - AMA4 #Obsolete/
       AMA4-M1 ISS 2 (FRONT PANEL) .pdf, AMA4-M2 ISS 3 (REAR PANEL).pdf, AMA4-M3 ISS 2 (BOTTOM PAN) .pdf
       AMA4 - #ARTWORK #DA #2016/AMA4-M1-FRONT-SILK (CURVE).pdf, AMA4-M2-REAR-SILK(CURVE).pdf
         → tools/silk_extract.py → assets/ama4-front-green.png, ama4-front-white.png, ama4-rear-white.png (superseded)
       AMA4-M1-FRONT-SILK (CURVE).cdr, AMA4-M2-REAR-SILK(CURVE).cdr → Inkscape → tools cut (Artwork 2026|59)
         → assets/ama4-front.svg (GREEN + WHITE plates registered), ama4-rear.svg (vector, 200 units per inch)
   - #AMA #SERIES/XXX - AMA - #OBSOLETE #Archive/AMA - #SILKS/Older Drawings/
       AMA-S1(.._TEST).cdr, AMA-S2(.._TEST).cdr (2002), Ama4manu_TEST.cdr (2003)
         → Inkscape (libcdr) → assets/ama-front-2002-green.png, ama-front-2002-white.png, ama-rear-2003-manual.png
   - AMA - #MECHANICAL/ and OBSOLETE/ DWG text (sidecars), file sizes, dates and hashes
   - AMS4 - #Master: AMS4 Manual.pdf (2007|40), AMS4-1ISS5 .net/.bom (P-CAD), PIC firmware
       AMS4 - #SOFTWARE #PIC #v203/ams1v203.asm + init.asm (v2.03, 17 Jun 2002)
   - MISC/BOM Summary Tool.xlsx (AMA4--M1/M2/M3 part costs)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: preload the CorelDRAW SVGs once, so panels that are re-rendered every frame never show them half-loaded */
const ART_PRELOAD = ["ama4-front.svg", "ama4-rear.svg"].map(n=>{ const i=new Image(); i.src=ASSET+n; return i; });
const inf = '<span class="tag-inf">inferred</span>';
const card = (t,b,id)=>`<div class="card"${id?` id="${id}"`:''}><h2>${t}</h2>${b}</div>`;
const ID='ama4', ERA=2016, FLAG='__ama4Active';
const off = ()=>{ window[FLAG]=false; };

/* ---------------- constants ----------------
   Firmware constants are copied from init.asm (AMS4 v2.03). Timing of one main() pass is not in the
   archive: the PIC16F874 runs from X2 = 4.9152 MHz (AMS4-1ISS5.net; Amsv203.pjt's Frequency=4000000 is wrong)
   = 813.8 ns per instruction, and the pass is about 250 instructions (≈203 µs) long when the DEMUX board is absent (count of the called routines, inferred). */
const K = {
  TP: 250*4/4.9152e6,  // one pass of main(): 250 instructions at 4.9152 MHz ≈ 203 µs — inferred (see above)
  BOUNCE: 0x0A,        // bounce_num equ 0x0A
  LOCK_ON: 10*256,     // lock_num1 equ 10, inner lock_counter wraps 256 → passes before the AES crosspoint opens
  LOCK_OFF: 4*256,     // lock_num2 equ 4  → passes before it closes again after a loss of lock
  BCOUNT: 0x0F,        // auto_detect: movlw 0x0f → bcount (passes of no lock before 75/110 flips)
  PHASE_TH: 100,       // phase: movlw 100 ; phase threshold on ADRESH
  RX_LOCK: 3e-3,       // CS8415 PLL lock time — inferred (datasheet not archived)
  FLASH: 0.5,          // display alternation (source ⇄ NL / MUTE) period — inferred from the lockflash counters
  FS: 48000,
  VU_TAU: 0.065,       // VU ballistics: 99 % in 300 ms — standard VU, inferred
  PAD: -23,            // pad in front of the power amp so 0 VU at full pot ≈ 1 W/8 Ω — inferred
  AMP: 30,             // TDA2616 fixed gain 30 dB — datasheet value, inferred (datasheet not archived)
  VCLIP: 9.9,          // TDA2616 on ±16 V: ≈14 V peak → 9.9 Vrms (≈12 W into 8 Ω) — inferred
  RL: 8,
};
const VU = [-20,-10,-7,-5,-3,-1,0,1,2,3];          // front silk scale
const dBu = v => 20*Math.log10(Math.max(v,1e-9)/0.7746), V_ = d => 0.7746*Math.pow(10,d/20);
const PX = 200;                                      // silk/panel px per inch (200 dpi separations)

/* ---------------- device state ---------------- */
const D = {
  power: true,
  demux: false,              // 2016 rear: Detail B is a blank plate (no DEMUX board) — inferred from the M2 cut-out
  mode: 1,                   // firmware register "mode": bit0 analog, bit1 AES, bit2 SDI
  sourcea: 1, sourced: 1, sources: 1,   // one-hot source registers (rlf to step)
  ee7: 0,                    // ee_data,7: 0 = 75 Ω BNC path (PORTC,0 low = AES75 ~RE), 1 = 110 Ω euroblock path (PORTA,1 low = AES110 ~RE); one bit for all four inputs
  ana: [ {on:true,lvl:4,inv:false},{on:true,lvl:0,inv:false},{on:false,lvl:4,inv:false},{on:false,lvl:4,inv:false} ],
  aes: [ {conn:'75',lvl:-20,inv:false},{conn:'110',lvl:-18,inv:false},{conn:'none',lvl:-20,inv:false},{conn:'110',lvl:-20,inv:true} ],
  sdiIn: true, sdiGroups:[true,true,false,false],   // SD1–SD8 = 4 groups × 2 pairs (manual), presence per group
  extMute: false, headset: false, stereo: true, potL: 0.75, potR: 0.75, spk: true, freq: 1000,
  log: [],
};
const MODE_NAME = m => m&1?'ANALOG':m&2?'AES':'SDI';
const idx = r => Math.round(Math.log2(r));
function srcLabel(){ return D.mode&1? 'A'+(idx(D.sourcea)+1) : D.mode&2? 'D'+(idx(D.sourced)+1) : 'SD'+(idx(D.sources)+1); }
function selected(){
  if (D.mode&1){ const a=D.ana[idx(D.sourcea)]; return {kind:'A', present:a.on, lvl:a.lvl, inv:a.inv, conn:a.on?'euroblock':'none'}; }
  if (D.mode&2){ const a=D.aes[idx(D.sourced)]; return {kind:'D', present:a.conn!=='none', lvl:a.lvl+24, dbfs:a.lvl, inv:a.inv, conn:a.conn}; }
  const g=idx(D.sources)>>1; return {kind:'S', present:D.demux&&D.sdiIn&&D.sdiGroups[g], lvl:-20+24, dbfs:-20, inv:false, conn:'SDI'};
}
function log(fn, txt){ D.log.unshift({t:SIM.t, fn, txt}); if (D.log.length>60) D.log.length=60; KEY=''; }

/* ---------------- user actions (each logs the real firmware path) ---------------- */
function pressMode(){
  if (!D.power) return;
  const before=MODE_NAME(D.mode);
  if (D.demux){ if (D.mode&4){ D.mode=1; } else D.mode<<=1; }   // sw_mode: rlf mode / back_to_analog
  else D.mode ^= 0b011;                                         // no_sdi: xorwf mode, b'00000011'
  log('PB1 MODE', `PORTB,7 low → <b>input_routine</b>: input,1 ← 1 → <b>debounce</b>: bounce_count ${K.BOUNCE}→0 (${K.BOUNCE} passes, ${SIM.fmtDur(K.BOUNCE*K.TP)}) → bounce_flag,0, input_flag,0 → <b>display_setup</b> → ${D.demux?'<b>sw_mode</b>: rlf mode':'<b>no_sdi</b>: xorwf mode,b\'011\' (no DEMUX found by the SDI check)'} → mode=b'${D.mode.toString(2).padStart(3,'0')}' (${before}→${MODE_NAME(D.mode)}) · input_flag,6 → <b>unlock_source</b>: disctl,2|3 set, crosspoint off · <b>refresh</b> "${srcLabel()}"`);
}
function pressSource(){
  if (!D.power) return;
  let reg = D.mode&1?'sourcea':D.mode&2?'sourced':'sources', top = reg==='sources'?0x80:0x08;
  D[reg] = D[reg]&top ? 1 : D[reg]<<1;
  log('PB2 SOURCE', `PORTB,6 low → input,2 ← 1 → <b>debounce</b> (${K.BOUNCE} passes) → <b>display_setup</b> → <b>sw_source</b> → ${reg==='sourcea'?'analog':reg==='sourced'?'digital':'sdi'}: ${D[reg]===1?`reset_${reg==='sourcea'?'analog':reg==='sourced'?'digital':'sdi'} (wrap)`:'rlf '+reg} → ${reg}=b'${D[reg].toString(2).padStart(reg==='sources'?8:4,'0')}' → "${srcLabel()}" · <b>output_control</b> → ${D.mode&1?'in'+(idx(D.sourcea)+1)+': XPT'+(idx(D.sourcea)+1):'aes: XPT1–4 high, XPTAES'} · ${D.mode&2?'<b>digital_output</b> → source'+(idx(D.sourced)+1)+': cs8415reg2 ← '+(idx(D.sourced)===0?'cs8415reg2s6':'its cs8415reg2s… constant')+' (receiver input select)':''}`);
}
function setMute(v){ D.extMute=v; log('EXT_MUTE', v? `rear MUTE I–G closed → PORTA,4 low → <b>mute_check</b>: mute_flag,0 ← 1, PORTA,5 ← 1 (EXT_MUTE_TALLY on), input_flag,1|4 → outputs updated, lock_count skipped while muted` : `MUTE opened → PORTA,4 high → <b>mute_before?</b>: mute_flag,0 ← 0, PORTA,5 ← 0, input_flag,1 (update outputs)`); }
function setHeadset(v){ D.headset=v; log('HEADSET', v? 'T/R/S plug in → LEFT_NORM / RIGHT_NORM contacts open: speaker feed breaks, headset gets the signal (hardware, no firmware)' : 'plug out → normals close, speakers back'); }
function setStereo(v){ D.stereo=v; log('STEREO', v? 'latching switch out: STEREO (L→left, R→right)' : `latching switch in: L and R summed to both sides ${inf} (silk icon pair STEREO ▀ / ▬)`); }

/* ---------------- analog chain ---------------- */
function chain(open){
  const s=selected(), st=[]; const on = D.power && s.present;
  const lvlL = on? s.lvl : -200, lvlR = on? s.lvl : -200;
  st.push({n:s.kind==='A'?'Rear ANALOG input (balanced euroblock, >20 kΩ)':s.kind==='D'?`AES input ${s.conn==='75'?'75 Ω BNC':'110 Ω euroblock'} → CS8415 → CS4335 D/A_LEFT/RIGHT (0 VU = −20 dBFS)`:'SDI → DEMUX → AES pair → CS8415 → CS4335', L:lvlL, R:lvlR});
  const R_ = run(); const xpt = open? R_.xptT!==null : R_.xptT!==null && SIM.t>=R_.xptT && !(R_.xptOffT!==null && SIM.t>=R_.xptOffT);
  const xl = xpt? lvlL : -200, xr = xpt? lvlR : -200;
  st.push({n:`74HC4053 crosspoint ${s.kind==='A'?'XPT'+(idx(D.sourcea)+1):'XPTAES'} → LEFT / RIGHT bus (LEFT_VU / RIGHT_VU taps)`, L:xl, R:xr});
  // mono sum
  let ml=xl, mr=xr;
  if (!D.stereo){ const a=V_(xl), b=V_(xr)*(s.inv?-1:1); const m=Math.abs(a+b)/2; ml=mr=m<1e-6?-200:dBu(m); }
  st.push({n:`STEREO switch (${D.stereo?'stereo':'L+R mono '+'(inferred)'})`, L:ml, R:mr});
  const pot = p => p<=0.001? -200 : 40*Math.log10(p);
  const pl = ml+pot(D.potL), pr = mr+pot(D.potR);
  st.push({n:'LEFT / RIGHT level controls (audio taper, inferred)', L:pl, R:pr});
  const mute = D.extMute;
  const al = mute?-200:pl+K.PAD+K.AMP, ar = mute?-200:pr+K.PAD+K.AMP;
  const clipL = V_(al)>K.VCLIP, clipR = V_(ar)>K.VCLIP;
  st.push({n:`pad ${K.PAD} dB + TDA2616 ${K.AMP} dB → LEFT+/LEFT−, RIGHT+/RIGHT− ${mute?'(EXT MUTE)':''}`, L:Math.min(al,dBu(K.VCLIP)), R:Math.min(ar,dBu(K.VCLIP)), clipL, clipR});
  const spkOn = D.spk && !D.headset;
  const W = l => spkOn? Math.pow(Math.min(V_(l),K.VCLIP),2)/K.RL : 0;
  return { st, xpt, s, vuL: xl-4, vuR: xr-4, outL: spkOn?al:-200, outR: spkOn?ar:-200, PL:W(al), PR:W(ar), clipL, clipR, hpL: D.headset&&!mute? pl: -200 };
}

/* ---------------- one second of firmware: simulated pass by pass ----------------
   Scenario: the shown source was selected at t = 0 (display_setup has just run). */
let KEY='', R=null;
function run(){
  const s = selected();
  const key=[D.power,D.demux,D.mode,D.sourcea,D.sourced,D.sources,D.ee7,JSON.stringify(D.aes),JSON.stringify(D.ana),D.sdiIn,D.sdiGroups.join(),D.extMute,K.TP].join('|');
  if (key===KEY && R) return R; KEY=key;
  const r = { toggles:[], term0:D.ee7, rxLockT:null, xptT:null, xptOffT:null, disp:[], passes:Math.floor(1/K.TP) };
  if (!D.power){ r.disp=[{t0:0,t1:1,txt:'    '}]; return R=r; }
  if (s.kind==='A'){ if (s.present||true) r.xptT = K.TP; }                // output_control → inN on the first pass
  else if (s.kind==='D'){
    let term=D.ee7, bcount=K.BCOUNT, termT=0, lockCnt=0, locked=false;
    for (let p=0; p<r.passes; p++){
      const t=p*K.TP;
      const want = s.conn==='75'?0:s.conn==='110'?1:-1;   // ee_data,7: 0 = 75 Ω, 1 = 110 Ω
      const rx = want===term && (t-termT)>=K.RX_LOCK;
      if (rx && r.rxLockT===null) r.rxLockT=t;
      if (!rx){ if (--bcount===0){ term^=1; termT=t; r.toggles.push(t); bcount=K.BCOUNT; } lockCnt=0; }
      else { bcount=K.BCOUNT; if (!D.extMute && ++lockCnt===K.LOCK_ON && r.xptT===null) r.xptT=t; }
    }
    r.termEnd=term;
  } else {
    if (s.present){ r.rxLockT = 2*K.TP + K.RX_LOCK; r.xptT = r.rxLockT + K.LOCK_ON*K.TP; }   // DEMUX lock relayed by scanuart — inferred timing
  }
  // display sequence
  const lab = srcLabel().padEnd(4,' ');
  const alt = D.extMute? 'MUTE' : (D.mode&1)? null : 'NL  ';
  const tEnd = D.extMute? 1 : (r.xptT===null? 1 : r.xptT);   // disctl,3 (unlocked) is cleared by lock_count when XPTAES opens
  if (!alt) r.disp=[{t0:0,t1:1,txt:lab}];
  else { let t=0,i=0; for (; t<tEnd-1e-9; t+=K.FLASH,i++){ const t1=Math.min(tEnd,t+K.FLASH); r.disp.push({t0:t,t1,txt:i%2? alt : lab}); } if (tEnd<1) r.disp.push({t0:tEnd,t1:1,txt:lab}); }
  return R=r;
}
function dispAt(t){ const r=run(); const d=r.disp.find(x=>t>=x.t0&&t<x.t1)||r.disp[r.disp.length-1]; return d? d.txt:'    '; }
function termAt(t){ const r=run(); let v=r.term0; for (const x of r.toggles){ if (x<=t) v^=1; else break; } return v; }
function vuAt(t, base){ const r=run(); if (r.xptT===null || t<r.xptT || base<-60) return -60; const k=1-Math.exp(-(t-r.xptT)/K.VU_TAU); return 20*Math.log10(Math.max(1e-4, Math.pow(10,base/20)*k)); }
function phaseRed(){ const s=selected(); const c=chain(); if (!c.xpt) return false; const adres = s.inv? 230 : 25; return adres>=K.PHASE_TH; }   // PHASE_V model — inferred

/* ---------------- panels ---------------- */
const SLOTX=[1.028,7.428,13.828];
function slots(){ let s=''; for (const x0 of SLOTX) for (let i=0;i<13;i++){ const x=(x0+i*0.187)*PX; s+=`<rect x="${x-6}" y="${0.449*PX}" width="12.4" height="${0.75*PX}" rx="6" fill="#050506" stroke="#2c2f33" stroke-width="1"/>`; } return s; }
function knob(x,y,v,cls,lbl){ const a=(-135+270*v)*Math.PI/180; return `<g class="${cls}" style="cursor:ns-resize"><circle cx="${x}" cy="${y}" r="34" fill="transparent"/><circle cx="${x}" cy="${y}" r="28" fill="#1d6e3a" stroke="#0d3a1e" stroke-width="3"/><circle cx="${x}" cy="${y}" r="20" fill="#2b9a52"/><line x1="${x}" y1="${y}" x2="${x+22*Math.sin(a)}" y2="${y-22*Math.cos(a)}" stroke="#fff" stroke-width="5" stroke-linecap="round"/><title>${lbl} ${Math.round(v*100)} % — click upper half to raise, lower half to lower (or use the wheel)</title></g>`; }
function frontSVG(){
  const c=chain(), t=SIM.t, on=D.power;
  const co=chain(true); const vl=vuAt(t,co.vuL), vr=vuAt(t,co.vuR);
  const ledCol=i=> i<6?'#7dff6a':i===6?'#ffd23a':'#ff4a3a';
  let leds=''; for (let i=0;i<10;i++){ const x=(5.215+i*0.16)*PX; for (const [y,v] of [[0.724*PX,vl],[0.924*PX,vr]]){ const lit=on&&v>=VU[i]; leds+=`<circle cx="${x}" cy="${y}" r="12" fill="${lit?ledCol(i):'#26302a'}" ${lit?'filter="url(#glw)"':''}/>`; } }
  const red=on&&phaseRed(), grn=on&&!red;
  const txt = dispAt(t);
  const layers=`<image href="${ASSET}ama4-front.svg" width="3420" height="330"/>`;
  return `<svg viewBox="0 0 3420 330" style="width:100%;display:block;border-radius:6px" role="img" aria-label="front panel">
  <defs><filter id="glw" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <rect width="3420" height="330" rx="6" fill="#17191b"/>${slots()}
  <rect x="${4.45*PX-100}" y="${0.44*PX-40}" width="200" height="81" rx="4" fill="#0a0c0a" stroke="#333"/>
  <g transform="translate(${4.45*PX-86},${0.44*PX-26})">${on?SIM.dotMatrix(txt,0,0,7.2,'#9dff5a','#132313'):''}</g>
  ${layers}
  <g class="pbm" style="cursor:pointer"><rect x="${4.15*PX-50}" y="${1.068*PX-50}" width="100" height="100" rx="6" fill="#2a2d30" stroke="#55595e" stroke-width="3"/><rect x="${4.15*PX-38}" y="${1.068*PX-38}" width="76" height="76" rx="4" fill="#33373b"/><title>MODE (PB1) — click</title></g>
  <g class="pbs" style="cursor:pointer"><rect x="${4.75*PX-50}" y="${1.068*PX-50}" width="100" height="100" rx="6" fill="#2a2d30" stroke="#55595e" stroke-width="3"/><rect x="${4.75*PX-38}" y="${1.068*PX-38}" width="76" height="76" rx="4" fill="#33373b"/><title>SOURCE (PB2) — click</title></g>
  ${leds}
  <circle cx="${8.4*PX}" cy="${0.2*PX}" r="12" fill="${grn?'#7dff6a':'#26302a'}" ${grn?'filter="url(#glw)"':''}><title>0° (PORTA,3 low)</title></circle>
  <circle cx="${8.7*PX}" cy="${0.2*PX}" r="12" fill="${red?'#ff4a3a':'#302626'}" ${red?'filter="url(#glw)"':''}><title>180° (PORTA,3 high: ADRESH ≥ 100)</title></circle>
  ${knob(10.75*PX,1.121*PX,D.potL,'kl','LEFT level')}${knob(11.75*PX,1.121*PX,D.potR,'kr','RIGHT level')}
  <g class="st" style="cursor:pointer"><circle cx="${11.25*PX}" cy="${1.121*PX}" r="26" fill="#121314" stroke="#4a4d50" stroke-width="3"/><circle cx="${11.25*PX}" cy="${1.121*PX}" r="${D.stereo?17:12}" fill="${D.stereo?'#3a3d40':'#26282a'}"/><title>STEREO latching button (${D.stereo?'out = STEREO':'in = L+R'}) — click</title></g>
  <g class="hs" style="cursor:pointer"><circle cx="${12.775*PX}" cy="${0.871*PX}" r="40" fill="transparent"/><circle cx="${12.775*PX}" cy="${0.871*PX}" r="36" fill="#0b0b0c" stroke="#777" stroke-width="4"/><circle cx="${12.775*PX}" cy="${0.871*PX}" r="14" fill="#000"/>${D.headset?`<circle cx="${12.775*PX}" cy="${0.871*PX}" r="26" fill="#2d2f31" stroke="#999" stroke-width="3"/><rect x="${12.775*PX-9}" y="${0.871*PX+26}" width="18" height="70" fill="#2d2f31"/>`:''}<title>HEADSET T/R/S jack — click to plug / unplug</title></g>
  ${on?'':'<rect width="3420" height="330" fill="#000" opacity=".35"/>'}
  </svg>`;
}
const eb=(x,y,cls,on,t,col)=>`<g class="${cls}" style="cursor:pointer"><rect x="${x-53}" y="${y-33}" width="106" height="66" rx="3" fill="${on?(col||'#2f9e55'):'#3a3d40'}" stroke="#111" stroke-width="2"/>${[0,1,2].map(i=>`<circle cx="${x-34+i*34}" cy="${y-8}" r="8" fill="#1d1f21"/>`).join('')}${on?`<rect x="${x-50}" y="${y+12}" width="100" height="18" fill="#1d5f35"/>`:''}<title>${t}</title></g>`;
const bnc=(x,y,r,cls,on,t)=>`<g class="${cls}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${r}" fill="#b9bcc0" stroke="#666" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r*0.55}" fill="#d9dadc"/><circle cx="${x}" cy="${y}" r="${r*0.18}" fill="#333"/>${on?`<circle cx="${x}" cy="${y}" r="${r*0.95}" fill="none" stroke="#2f9e55" stroke-width="${r*0.3}"/>`:''}<title>${t}</title></g>`;
const post=(x,y,cls,lbl,col)=>`<g class="${cls}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="34" fill="${col}" stroke="#111" stroke-width="3"/><circle cx="${x}" cy="${y}" r="13" fill="#333"/>${D.spk?`<path d="M${x},${y} l0,-70" stroke="${lbl.includes('+')?'#c33':'#222'}" stroke-width="10"/>`:''}<title>${lbl} speaker terminal (${D.spk?'speaker wired':'open'}) — click</title></g>`;
/* Rear drawn on the M2 ISS 3 drilling (200 px/in): IEC D, ground stud H, binding posts L (Detail 'L' .320 double-D),
   vents G, Detail B option cut-out, euroblocks A (.332 × .528), BNCs E (.531). Silk = ama4-rear.svg (CorelDRAW). */
function rearSVG(){
  const c=chain(); const y1=118, y2=240;
  const anaX=[11.623,12.148,12.673,13.198,13.723].map(x=>x*PX), aesX=[14.574,15.099].map(x=>x*PX);
  const sa=selected();
  let s=`<svg viewBox="0 0 3422 331" style="width:100%;display:block;border-radius:6px" role="img" aria-label="rear panel"><rect width="3422" height="331" rx="6" fill="#17191b"/>
  <g class="pw" style="cursor:pointer"><rect x="${0.3*PX}" y="${0.204*PX}" width="${1.08*PX}" height="${1.24*PX}" rx="10" fill="#0d0d0e" stroke="#444" stroke-width="3"/><rect x="${0.42*PX}" y="${0.32*PX}" width="${0.84*PX}" height="${0.56*PX}" rx="8" fill="#1a1a1b"/>${[0.6,0.84,1.08].map((x,i)=>`<rect x="${x*PX-7}" y="${(i===1?0.42:0.5)*PX}" width="14" height="34" fill="#888"/>`).join('')}<rect x="${0.5*PX}" y="${1.0*PX}" width="${0.68*PX}" height="${0.3*PX}" rx="4" fill="#222"/>${D.power?`<rect x="${0.38*PX}" y="${0.3*PX}" width="${0.92*PX}" height="${0.6*PX}" rx="10" fill="#111" stroke="#2f9e55" stroke-width="6"/>`:''}<title>IEC inlet + fuse drawer (115-230 VAC, 1 A S.B) — click to ${D.power?'unplug':'plug in'}</title></g>
  <circle cx="${1.88*PX}" cy="${0.824*PX}" r="14" fill="#9a9a9a"><title>ground stud H (ISS 3: changed to FH 440-5)</title></circle>
  ${[0,1,2,3,4].map(i=>`<rect x="${(3.481+i*0.25)*PX-9}" y="${0.324*PX}" width="19" height="${PX}" rx="9" fill="#050506"/>`).join('')}
  <rect x="${6.324*PX}" y="${0.30*PX}" width="${3.89*PX}" height="${0.70*PX}" rx="4" fill="${D.demux?'#123a6b':'#222427'}" stroke="#555"/>
  <g class="dmx" style="cursor:pointer"><rect x="${6.324*PX}" y="${0.30*PX}" width="${3.89*PX}" height="${0.70*PX}" fill="transparent"/>${D.demux?[0,1,2,3].map(i=>bnc((6.9+i*0.9)*PX,0.65*PX,40,'',i===3&&D.sdiIn,'')).join('')+`<text x="${8.27*PX}" y="${0.98*PX}" fill="#cfe" font-size="24" text-anchor="middle">OUTPUT 1 · OUTPUT 2 · SDI OUT · SDI IN (DEMUX option ${'— inferred fit'})</text>`:`<text x="${8.27*PX}" y="${0.7*PX}" fill="#777" font-size="26" text-anchor="middle">Detail B cut-out 3.890 × .700 — blank plate (click: fit DEMUX option)</text>`}<title>Detail B option opening — click to fit / remove the DEMUX board</title></g>
  ${post(2.23*PX,0.55*PX,'sp','L+','#c9302c')}${post(2.98*PX,0.55*PX,'sp','L−','#1b1b1b')}${post(5.042*PX,0.55*PX,'sp','R+','#c9302c')}${post(5.792*PX,0.55*PX,'sp','R−','#1b1b1b')}
  ${eb(10.88*PX,185,'mu',D.extMute,'MUTE I O G — click to close I–G (EXT_MUTE to ground)','#e0a020')}
  ${anaX.map((x,i)=>eb(x,y1,i?'ai':'ao',i?D.ana[i-1].on:true,i?`ANALOG LEFT input ${i} — click to connect / disconnect`:'ANALOG OUTPUT L (switcher output)')+eb(x,y2,i?'ai':'ao',i?D.ana[i-1].on:true,i?`ANALOG RIGHT input ${i}`:'ANALOG OUTPUT R')).join('')}
  ${aesX.map((x,j)=>[0,1].map(k=>{ const n=j*2+k; return eb(x,k?y2:y1,'ae'+n,D.aes[n].conn==='110',`AES ${n+1} 110 Ω euroblock — click`,'#2f8fd0'); }).join('')).join('')}
  ${[[15.75,0],[15.75,1],[16.375,2],[16.375,3]].map(([x,n])=>bnc(x*PX,(n%2?1.121:0.496)*PX,52,'ab'+n,D.aes[n].conn==='75',`AES ${n+1} 75 Ω BNC — click`)).join('')}
  <image href="${ASSET}ama4-rear.svg" width="3422" height="331"/>
  ${D.power?'':'<rect width="3422" height="331" fill="#000" opacity=".25"/>'}</svg>`;
  return s;
}
function bind(root){
  if (!root) return;
  const q=(s,f)=>root.querySelectorAll(s).forEach(e=>e.addEventListener('click',ev=>{ f(ev,e); SIM.refresh(); }));
  q('.pbm',()=>pressMode()); q('.pbs',()=>pressSource());
  q('.st',()=>setStereo(!D.stereo)); q('.hs',()=>setHeadset(!D.headset));
  const kn=(cls,k,name)=>{ root.querySelectorAll('.'+cls).forEach(e=>{ e.addEventListener('click',ev=>{ const r=e.getBoundingClientRect(); const up=ev.clientY<r.top+r.height/2; D[k]=Math.max(0,Math.min(1,D[k]+(up?0.05:-0.05))); log(name,`pot ${name} → ${Math.round(D[k]*100)} % (analog, no firmware)`); SIM.refresh(); }); e.addEventListener('wheel',ev=>{ ev.preventDefault(); D[k]=Math.max(0,Math.min(1,D[k]+(ev.deltaY<0?0.02:-0.02))); KEY=''; SIM.refresh(); },{passive:false}); }); };
  kn('kl','potL','LEFT'); kn('kr','potR','RIGHT');
  q('.pw',()=>{ D.power=!D.power; log('POWER', D.power? `power up → <b>program</b>: pdelay1, then <b>send</b>/<b>receive</b> SDI check with the DEMUX board (comout,1) → <b>opening_window</b>/<b>display_version</b> → PORTB,5 takes the CS8415 out of reset → reg1/reg2/reg4/reg6/reg17 → <b>main</b>; last selection restored from EEPROM (ee_data)` : 'power removed (last selection already in EEPROM via eewrite)'); });
  q('.sp',()=>{ D.spk=!D.spk; log('SPEAKERS', D.spk?'external speakers wired to the binding posts':'speaker wires removed'); });
  q('.mu',()=>setMute(!D.extMute));
  q('.dmx',()=>{ D.demux=!D.demux; if(!D.demux && D.mode&4) D.mode=1; log('DEMUX', D.demux? 'DEMUX board fitted: at power-up <b>send</b>/<b>receive</b> succeed → comout,0 set → MODE steps A → D → SD; main() also runs communication_control / pole / scanuart / tx_setup / settxdata / txuart' : 'no DEMUX: SDI check fails → <b>no_sdi</b> path, MODE toggles A ⇄ D only'); });
  q('.sdi',()=>{ D.sdiIn=!D.sdiIn; log('SDI IN', D.sdiIn?'SDI connected':'SDI removed'); });
  q('.ai',(ev,e)=>{ const all=[...root.querySelectorAll('.ai')]; const n=Math.floor(all.indexOf(e)/2); D.ana[n].on=!D.ana[n].on; log('ANALOG IN', `input ${n+1} ${D.ana[n].on?'connected':'disconnected'} (L and R)`); });
  for (let n=0;n<4;n++){
    q('.ae'+n,()=>{ D.aes[n].conn = D.aes[n].conn==='110'?'none':'110'; log('AES IN',`AES ${n+1}: ${D.aes[n].conn==='110'?'110 Ω euroblock connected':'removed'}`); });
    q('.ab'+n,()=>{ D.aes[n].conn = D.aes[n].conn==='75'?'none':'75'; log('AES IN',`AES ${n+1}: ${D.aes[n].conn==='75'?'75 Ω BNC connected':'removed'}`); });
  }
}

/* ---------------- shared bits for views ---------------- */
function srcEditor(){
  const s=selected();
  return `<table class="kv"><tr><th>Selected</th><td><b>${srcLabel()}</b> (${MODE_NAME(D.mode)})</td></tr>
  <tr><th>Level</th><td>${s.kind==='A'?`<input type="range" id="lv" min="-30" max="24" value="${D.ana[idx(D.sourcea)].lvl}"> <span class="mono">${D.ana[idx(D.sourcea)].lvl} dBu</span>`:s.kind==='D'?`<input type="range" id="lv" min="-60" max="0" value="${D.aes[idx(D.sourced)].lvl}"> <span class="mono">${D.aes[idx(D.sourced)].lvl} dBFS</span>`:'−20 dBFS tone in the SDI group'}</td></tr>
  <tr><th>Right polarity</th><td><label><input type="checkbox" id="inv" ${s.inv?'checked':''} ${s.kind==='S'?'disabled':''}> R inverted (out of phase)</label></td></tr>
  ${s.kind==='D'?`<tr><th>Connected on</th><td><select id="cn">${['110','75','none'].map(v=>`<option ${v===s.conn?'selected':''} value="${v}">${v==='none'?'nothing':v+' Ω'}</option>`).join('')}</select> · receiver starts on <select id="t0"><option value="0" ${!D.ee7?'selected':''}>75 Ω</option><option value="1" ${D.ee7?'selected':''}>110 Ω</option></select> (ee_data,7)</td></tr>`:''}
  ${s.kind==='S'?`<tr><th>SDI groups present</th><td>${D.sdiGroups.map((g,i)=>`<label class="small"><input type="checkbox" data-g="${i}" ${g?'checked':''}> G${i+1}</label>`).join(' ')}</td></tr>`:''}
  <tr><th>Main pass (inferred)</th><td><input type="range" id="tp" min="50" max="2000" step="50" value="${K.TP*1e6}"> <span class="mono">${(K.TP*1e6).toFixed(0)} µs</span></td></tr></table>`;
}
function bindSrc(m){
  const s=selected(), g=x=>m.querySelector(x);
  if (g('#lv')) g('#lv').oninput=e=>{ if(s.kind==='A') D.ana[idx(D.sourcea)].lvl=+e.target.value; else D.aes[idx(D.sourced)].lvl=+e.target.value; KEY=''; SIM.refresh(); };
  if (g('#inv')) g('#inv').onchange=e=>{ if(s.kind==='A') D.ana[idx(D.sourcea)].inv=e.target.checked; else if(s.kind==='D') D.aes[idx(D.sourced)].inv=e.target.checked; log('SOURCE',`right channel polarity ${e.target.checked?'inverted':'normal'} at the source`); SIM.refresh(); };
  if (g('#cn')) g('#cn').onchange=e=>{ D.aes[idx(D.sourced)].conn=e.target.value; KEY=''; SIM.refresh(); };
  if (g('#t0')) g('#t0').onchange=e=>{ D.ee7=+e.target.value; KEY=''; SIM.refresh(); };
  if (g('#tp')) g('#tp').oninput=e=>{ K.TP=+e.target.value*1e-6; KEY=''; SIM.refresh(); };
  m.querySelectorAll('[data-g]').forEach(c=>c.onchange=()=>{ D.sdiGroups[+c.dataset.g]=c.checked; KEY=''; SIM.refresh(); });
}
const fmtL = l => l<-150? '—' : (l>=0?'+':'')+l.toFixed(1)+' dBu';
function chainTable(){ const c=chain(); return `<table class="kv"><tr><th>Stage</th><th>L</th><th>R</th></tr>${c.st.map(x=>`<tr><td>${x.n}</td><td class="mono">${fmtL(x.L)}${x.clipL?' <b style="color:var(--bad)">CLIP</b>':''}</td><td class="mono">${fmtL(x.R)}${x.clipR?' <b style="color:var(--bad)">CLIP</b>':''}</td></tr>`).join('')}
  <tr><th>Speakers</th><td class="mono">${D.headset?'muted by headset':!D.spk?'not wired':(c.PL).toFixed(2)+' W'}</td><td class="mono">${D.headset||!D.spk?'':(c.PR).toFixed(2)+' W'}</td></tr>
  <tr><th>Headset</th><td colspan="2" class="mono">${D.headset? fmtL(c.hpL)+' (after the level controls)':'not plugged'}</td></tr></table>`; }
function stateTable(){ const r=run(), t=SIM.t, s=selected(), c=chain();
  return `<table class="kv"><tr><th>Display</th><td class="mono">"${dispAt(t)}"</td></tr>
  <tr><th>mode</th><td class="mono">b'${D.mode.toString(2).padStart(3,'0')}' ${MODE_NAME(D.mode)} · DEMUX ${D.demux?'found (comout,0)':'absent (no_sdi)'}</td></tr>
  <tr><th>sourcea / sourced / sources</th><td class="mono">${D.sourcea.toString(2).padStart(4,'0')} / ${D.sourced.toString(2).padStart(4,'0')} / ${D.sources.toString(2).padStart(8,'0')}</td></tr>
  <tr><th>ee_data,7 (AES75/AES110)</th><td class="mono">${termAt(t)?'1 = 110 Ω (PORTC,0 high, PORTA,1 low → AES110 ~RE on)':'0 = 75 Ω (PORTC,0 low → AES75 ~RE on, PORTA,1 high)'} · ${r.toggles.length} flips this second</td></tr>
  <tr><th>CS8415 lock</th><td class="mono">${s.kind==='A'?'n/a (analog)':r.rxLockT===null?'no lock (cs8415_16,0 = 1)':t>=r.rxLockT?'locked at '+SIM.fmtDur(r.rxLockT):'acquiring… (locks at '+SIM.fmtDur(r.rxLockT)+')'}</td></tr>
  <tr><th>Crosspoint</th><td class="mono">${c.xpt?'ON':'off'}${r.xptT!==null&&!c.xpt?' (opens at '+SIM.fmtDur(r.xptT)+')':''}</td></tr>
  <tr><th>mute_flag / tally</th><td class="mono">${D.extMute?'1 / EXT_MUTE_TALLY on':'0 / off'}</td></tr>
  <tr><th>Phase LED</th><td class="mono">${!D.power?'off':phaseRed()?'180° (red)':c.xpt?'0° (green)':'0° (green; no signal)'}</td></tr></table>`; }
function logHTML(){ return `<div class="log">${D.log.map(l=>`<div><span class="muted">${SIM.fmtT(l.t)}</span> <b>${l.fn}</b> — ${l.txt}</div>`).join('')||'<div class="muted">Click MODE, SOURCE, knobs, the headset jack, or the rear connectors. Each action shows the firmware path it takes.</div>'}</div>`; }

function lanes(){
  const r=run(), s=selected(), c=chain(true);
  const acc=SIM.css('--accent'), acc2=SIM.css('--accent2'), warn=SIM.css('--warn'), ink=SIM.css('--ink'), bad=SIM.css('--bad');
  const bar=(c_,X,t0,t1,y,h,a,b,col,lbl)=>{ if (a===null) return; const x0=Math.max(X(t0),X(a)), x1=Math.min(X(t1),X(b)); if (x1<=x0) return; c_.fillStyle=col; c_.globalAlpha=.55; c_.fillRect(x0,y+5,x1-x0,h-10); c_.globalAlpha=1; if(lbl){ c_.fillStyle=ink; c_.font='11px sans-serif'; c_.fillText(lbl,x0+4,y+h/2+4); } };
  const L=[
    {label:'main() passes', h:24, draw:(c_,X,t0,t1,y,h)=>SIM.pulses(c_,X,t0,t1,y,h,K.TP,0,K.TP*0.92,acc,'main() pass')},
    {label:'read8415 + reg2/reg4 (SPI)', h:22, draw:(c_,X,t0,t1,y,h)=>{ SIM.pulses(c_,X,t0,t1,y,h,K.TP,K.TP*0.12,K.TP*0.28,acc2,'CS8415 SPI burst'); }},
    {label:'phase() ADC → PORTA,3', h:22, draw:(c_,X,t0,t1,y,h)=>{ SIM.pulses(c_,X,t0,t1,y,h,K.TP,K.TP*0.6,K.TP*0.05,phaseRed()?bad:acc,'ADRESH test'); }},
  ];
  if (s.kind!=='A') L.push({label:s.kind==='D'?'AES3 frames into CS8415':'SDI → DEMUX AES', h:22, draw:(c_,X,t0,t1,y,h)=>{ if (!s.present) { c_.fillStyle=SIM.css('--ink2'); c_.font='11px sans-serif'; c_.fillText('no signal connected',X(t0)+6,y+h/2+4); return; } SIM.pulses(c_,X,t0,t1,y,h,1/K.FS,0,0.5/K.FS,warn,'AES frame'); }});
  if (s.kind==='D') L.push({label:'ee_data,7: 75 Ω ↔ 110 Ω', h:28, draw:(c_,X,t0,t1,y,h)=>{ c_.strokeStyle=acc2; c_.lineWidth=2; c_.beginPath(); let v=r.term0, x=X(t0); const yy=v=>v?y+6:y+h-6; c_.moveTo(x,yy(termAt(t0))); v=termAt(t0); for(const tt of r.toggles){ if(tt<t0) continue; if(tt>t1) break; c_.lineTo(X(tt),yy(v)); v^=1; c_.lineTo(X(tt),yy(v)); } c_.lineTo(X(t1),yy(v)); c_.stroke(); c_.lineWidth=1; c_.fillStyle=ink; c_.font='10px sans-serif'; c_.fillText('110',X(t0)+2,y+12); c_.fillText('75',X(t0)+2,y+h-2); if(r.toggles.length>40){ c_.fillText(r.toggles.length+' flips (every '+SIM.fmtDur(K.BCOUNT*K.TP)+')',X(t0)+30,y+h/2+4);} }});
  if (s.kind!=='A') L.push({label:'CS8415 lock (RERR clear)', h:22, draw:(c_,X,t0,t1,y,h)=>bar(c_,X,t0,t1,y,h,r.rxLockT,1,acc,'locked')});
  L.push({label:s.kind==='A'?'XPT'+(idx(D.sourcea)+1)+' crosspoint':'lock_count → XPTAES', h:22, draw:(c_,X,t0,t1,y,h)=>{ if (r.xptT!==null) bar(c_,X,t0,t1,y,h,r.xptT,1,acc,'audio on'); if (s.kind!=='A' && r.rxLockT!==null && r.xptT!==null) bar(c_,X,t0,t1,y,h,r.rxLockT,r.xptT,warn,`lock_counter ${K.LOCK_ON} passes`); }});
  L.push({label:'Display (4 chars)', h:26, draw:(c_,X,t0,t1,y,h)=>{ r.disp.forEach((d,i)=>{ bar(c_,X,t0,t1,y,h,d.t0,d.t1,i%2?warn:acc2,'"'+d.txt.trim()+'"'); }); }});
  L.push({label:'VU reading L (LEFT_VU)', h:36, draw:(c_,X,t0,t1,y,h)=>{ c_.strokeStyle=acc; c_.beginPath(); for(let i=0;i<=300;i++){ const t=t0+(t1-t0)*i/300; const v=vuAt(t,c.vuL); const yy=y+h-3-(Math.max(-20,Math.min(3,v))+20)/23*(h-6); i?c_.lineTo(X(t),yy):c_.moveTo(X(t),yy); } c_.stroke(); }});
  L.push({label:'Speaker L+ voltage', h:44, draw:(c_,X,t0,t1,y,h)=>{ const A=c.outL<-150?0:Math.min(V_(c.outL),K.VCLIP)*Math.SQRT2, Am=K.VCLIP*Math.SQRT2*1.1; const span=t1-t0, pw=X(t1)-X(t0); c_.strokeStyle=warn; if (A===0||r.xptT===null){ c_.beginPath(); c_.moveTo(X(t0),y+h/2); c_.lineTo(X(t1),y+h/2); c_.stroke(); return; } if (span*D.freq>pw/3){ c_.fillStyle=warn; c_.globalAlpha=.35; const xa=Math.max(X(t0),X(r.xptT)); c_.fillRect(xa,y+h/2-A/Am*h/2,X(t1)-xa,A/Am*h); c_.globalAlpha=1; return; } c_.beginPath(); for(let i=0;i<=500;i++){ const t=t0+span*i/500; let v=t<r.xptT?0:A*Math.sin(2*Math.PI*D.freq*t); if(c.clipL) v=Math.max(-K.VCLIP*1.414,Math.min(K.VCLIP*1.414,v*1.6)); const yy=y+h/2-v/Am*h/2; i?c_.lineTo(X(t),yy):c_.moveTo(X(t),yy); } c_.stroke(); }});
  return L;
}

/* ---------------- views ---------------- */
function viewSim(m){
  off();
  m.innerHTML=`${card('Front panel '+(ERA===2016?'(real 2015|48 silk, AMA4-M1-FRONT-SILK, on the M1 ISS 2 drilling)':'(real 2002|35 silk AMA-S1.cdr on the AMA4-M1 drilling)'),'<div id="fp"></div><div class="small muted" style="margin-top:3px">Artwork: GREEN + WHITE plates of '+SIM.src('#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M1-FRONT-SILK (CURVE).cdr','AMA4-M1-FRONT-SILK (CURVE).cdr')+' (NOV.05/15), CorelDRAW vector, registered on one panel; faint lines = cut geometry.</div>')}
  ${card('Rear panel '+(ERA===2016?'(real 2015|48 silk AMA4-M2-REAR-SILK on the M2 ISS 3 drilling)':'(2003|36 manual sketch Ama4manu_TEST.cdr — click the hot spots)'),'<div id="rp"></div><div class="small muted" style="margin-top:3px">Artwork: WHITE plate of '+SIM.src('#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M2-REAR-SILK(CURVE).cdr','AMA4-M2-REAR-SILK(CURVE).cdr')+' (MAY 08/15), CorelDRAW vector.</div>')}
  <div class="grid2"><div>${card('Selected source','<div id="se"></div>')}${card('Level through each stage','<div id="ch"></div>')}</div><div>${card('Firmware state at the playhead','<div id="stt"></div>')}${card('What your clicks did (firmware path, AMS4 v2.03 names)','<div id="lg"></div>')}</div></div>
  ${card('Timeline — the selection was made at t = 0','<canvas id="tl"></canvas><p class="small muted">Main-loop pass time and CS8415 lock time are '+inf+'; the pass counts (bounce_num 0x0A, bcount 0x0F, lock_num1 10 × 256, lock_num2 4 × 256) are from init.asm / ams1v203.asm.</p>')}`;
  let lastKey='';
  SIM.on('time',()=>{
    m.querySelector('#fp').innerHTML=frontSVG(); bind(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(); bind(m.querySelector('#rp'));
    const k=[D.mode,D.sourcea,D.sourced,D.sources,D.ana.map(a=>a.inv).join(),D.aes.map(a=>a.conn+a.inv).join(),D.ee7,D.sdiGroups.join()].join('|');
    if (k!==lastKey){ lastKey=k; m.querySelector('#se').innerHTML=srcEditor(); bindSrc(m.querySelector('#se')); }
    m.querySelector('#ch').innerHTML=chainTable(); m.querySelector('#stt').innerHTML=stateTable(); m.querySelector('#lg').innerHTML=logHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
  });
}

const LESSONS=[
  {title:'1. Power and speakers', body:`<p>${ERA===2016?'The rear has an IEC inlet (115-230 VAC, 1 A slow-blow) and four binding posts L+ L− R+ R−.':'The 2003 manual sketch shows the IEC inlet (115-230 VAC, 1 A S.B) and four binding posts, drawn R+ R− then L+ L−.'} Plug in the power and wire the external speakers to the posts (click them on the rear panel).</p><p class="small muted">That the posts feed external speakers is ${inf} from the silk (L+/L−/R+/R−) and the AMS4 nets LEFT+/LEFT−/RIGHT+/RIGHT− at the TDA2616 outputs.</p>`, check:()=>D.power&&D.spk},
  {title:'2. Pick analog input A2', body:'<p>The manual: “The MODE switch steps through analog, AES digital and SDI modes while the SOURCE switch selects the input from that group. Use A1 through A4 for analog…”. Press MODE until the display reads A, then SOURCE until it reads <b>A2</b>. Connect input 2 on the rear (ANALOG LEFT/RIGHT, column 2) if it is not connected.</p>', check:()=>(D.mode&1)&&idx(D.sourcea)===1&&D.ana[1].on},
  {title:'3. Set the speaker level', body:'<p>Turn LEFT and RIGHT (click the upper half of a knob to raise, lower half to lower, or use the wheel) until each speaker gets between 0.5 W and 3 W with no CLIP in the stage table. Watch the 10-LED meter: it is fed before the level controls, so it does not move with the knobs.</p>', check:()=>{ const c=chain(); return D.spk&&!D.headset&&c.PL>0.5&&c.PL<3&&c.PR>0.5&&c.PR<3&&!c.clipL&&!c.clipR; }},
  {title:'4. AES on a BNC: watch the 75/110 auto-detect', body:`<p>Press MODE for AES and pick <b>D1</b> (connected on the 75 Ω BNC). Set the receiver start to 110 Ω in “Selected source”. Then press Play or drag the playhead: the firmware's <span class="mono">auto_detect</span> flips <span class="mono">ee_data,7</span> after 15 passes of no lock, the CS8415 locks, and <span class="mono">lock_count</span> waits ${K.LOCK_ON} passes before XPTAES opens. Until then the display alternates D1 / NL.</p>`, check:()=>{ const r=run(); return (D.mode&2)&&idx(D.sourced)===0&&D.aes[0].conn==='75'&&r.toggles.length>0&&r.xptT!==null&&SIM.t>r.xptT; }},
  {title:'5. Phase check and mono', body:'<p>Tick “R inverted” for the selected source: the 180° LED lights. Now press the STEREO button in (L+R): the two sides cancel and the speakers go quiet. This is what the phase indicator warns about.</p>', check:()=>{ const s=selected(); return s.inv&&!D.stereo&&phaseRed(); }},
  {title:'6. Headset', body:'<p>“The speaker feeds are normalled through this jack to automatically mute the speakers when a headset is plugged in.” Plug the headset in (front jack).</p>', check:()=>D.headset},
  {title:'7. External mute', body:'<p>“The EXT MUTE IN requires a closure to ground to mute the monitor. Once muted, the display window will alternate between the selected source ID and the word MUTE. The open collector output EXT MUTE TALLY pin will be activated.” Unplug the headset, then close MUTE I–G on the rear.</p>', check:()=>D.extMute&&!D.headset},
];
let LI=0;
function viewTut(m){
  off();
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial (from the AMS4 manual text; the AMA-4 shares its panel)','<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>')}<div class="card" id="lesson"></div>${card('Level through each stage','<div id="ch"></div>')}</div><div>${card('The unit','<div id="fp"></div><div style="height:8px"></div><div id="rp"></div>')}${card('Selected source','<div id="se"></div>')}${card('Firmware state','<div id="stt"></div>')}</div></div>`;
  let lk='';
  const draw=()=>{
    m.querySelector('#fp').innerHTML=frontSVG(); bind(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bind(m.querySelector('#rp'));
    const k=[D.mode,D.sourcea,D.sourced,D.sources,D.ana.map(a=>a.inv).join(),D.aes.map(a=>a.conn+a.inv).join(),D.ee7].join('|'); if(k!==lk){ lk=k; m.querySelector('#se').innerHTML=srcEditor(); bindSrc(m.querySelector('#se')); }
    m.querySelector('#ch').innerHTML=chainTable(); m.querySelector('#stt').innerHTML=stateTable();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;padding:2px 0;${i===LI?'font-weight:700;color:var(--accent)':''}">${l.title} ${l.check()?'✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ LI=+li.dataset.i; draw(); });
    const L=LESSONS[LI], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?'✓ Goal reached.':'Goal not reached yet. Hint: use the panels on the right; the state table shows what the firmware sees.'}</div><div style="margin-top:8px"><button id="pv">◀ Back</button> <button id="nx">Next ▶</button></div>`;
    m.querySelector('#pv').onclick=()=>{ LI=Math.max(0,LI-1); draw(); }; m.querySelector('#nx').onclick=()=>{ LI=Math.min(LESSONS.length-1,LI+1); draw(); };
  };
  SIM.on('time',draw);
}

/* main() pass breakdown: routine order from ams1v203.asm; instruction counts per routine estimated (inferred) */
const PASS=[['input_routine',8,'read PB1/PB2 (PORTB,7/6) into input,1/2'],['debounce',12,'bounce_count from bounce_num (0x0A)'],['read8415',62,'CS low, shiftout addr 0x20 + reg 16, shiftin RERR'],['auto_detect',10,'AES only: bcount 15 → flip ee_data,7'],['display_setup',6,'on a debounced press: sw_mode / sw_source'],['unlock_source',4,'disctl,2|3 after a change'],['analog_mode / aes_mode / sdi_mode',14,'set display codes for the group'],['refresh',36,'dis0–dis3 → PORTD, A0/A1 (PORTE,1), ~WR pulse'],['output_control',14,'in1–in4 → XPT1–4, aes → XPTAES'],['phase',10,'ADRESH vs 100 → PORTA,3'],['digital_output',6,'cs8415reg2 input mux per source'],['mute_check',6,'PORTA,4 → mute_flag, PORTA,5 tally'],['processdata',8,'check_aes_lock / check_sdi_lock'],['lock_count',10,'lock_counter/1/2/3 delays'],['reg2',22,'wr8415reg: receiver input select'],['reg4',22,'wr8415reg: control 4 (run)'],['eewrite',0,'only when the selection changed']];
function passAt(t){ const tot=PASS.reduce((a,p)=>a+p[1],0); const ph=((t%K.TP)/K.TP)*tot; let acc=0; for (let i=0;i<PASS.length;i++){ acc+=PASS[i][1]; if (ph<acc) return i; } return PASS.length-1; }
function viewSecond(m){
  off();
  m.innerHTML=`<div class="grid2">${card('One second inside the unit','<div id="ev"></div>')}${card('Inside one main() pass at the playhead','<div id="pa"></div>')}</div>
  ${card('Zoomable timeline (use the Zoom window: 1 s shows the lock and display sequence, 1 ms shows passes, 50 µs shows AES frames)','<canvas id="tl"></canvas>')}
  <div class="grid2">${card('VU meter ballistics after the crosspoint opens','<canvas id="vu"></canvas>')}${card('Front panel at the playhead','<div id="fp"></div>')}</div>`;
  SIM.on('time',()=>{
    const r=run(), s=selected(), t=SIM.t;
    const rows=[['main() passes',r.passes.toLocaleString(),SIM.fmtDur(K.TP)+' '+inf],['CS8415 SPI reads (read8415) + register writes (reg2, reg4)',(r.passes*3).toLocaleString(),'3 per pass'],['phase() ADC tests',r.passes.toLocaleString(),'1 per pass'],['AES3 frames (if AES/SDI)',s.kind==='A'?'—':'48,000','20.83 µs'],['75/110 flips by auto_detect',r.toggles.length,s.kind==='D'?'every '+SIM.fmtDur(K.BCOUNT*K.TP)+' while unlocked':'—'],['Debounce of a press',K.BOUNCE+' passes',SIM.fmtDur(K.BOUNCE*K.TP)],['AES lock → XPTAES open',K.LOCK_ON+' passes',SIM.fmtDur(K.LOCK_ON*K.TP)],['AES loss → XPTAES closed',K.LOCK_OFF+' passes',SIM.fmtDur(K.LOCK_OFF*K.TP)],['Display alternation NL / MUTE','2 per s',SIM.fmtDur(K.FLASH)+' '+inf]];
    m.querySelector('#ev').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td></tr>`).join('')}</table>`;
    const pi=passAt(t), n=Math.floor(t/K.TP);
    m.querySelector('#pa').innerHTML=`<p class="small">Pass #${n.toLocaleString()} · ${SIM.fmtDur(t-n*K.TP)} into it</p><table class="kv">${PASS.map((p,i)=>`<tr class="${i===pi?'hl':''}"><td class="mono">call ${p[0]}</td><td class="mono">${p[1]} cyc</td><td class="small">${p[2]}</td></tr>`).join('')}</table><p class="small muted">Routine order is from <span class="mono">main</span> in ams1v203.asm; cycle counts are ${inf} (813.8 ns per cycle at 4.9152 MHz).</p>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
    const {c,w}=SIM.canvas(m.querySelector('#vu'),170); const cc=chain(true);
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif';
    VU.forEach(v=>{ const y=10+(3-v)/23*140; c.beginPath(); c.moveTo(40,y); c.lineTo(w-10,y); c.stroke(); if([-20,-10,-5,0,3].includes(v)) c.fillText(v,8,y+3); });
    c.strokeStyle=SIM.css('--accent'); c.lineWidth=2; c.beginPath(); for (let i=0;i<=300;i++){ const tt=i/300; const v=Math.max(-20,Math.min(3,vuAt(tt,cc.vuL))); const x=40+(w-50)*i/300, y=10+(3-v)/23*140; i?c.lineTo(x,y):c.moveTo(x,y); } c.stroke(); c.lineWidth=1;
    const px=40+(w-50)*t; c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,5); c.lineTo(px,155); c.stroke(); c.fillStyle=SIM.css('--ink2'); c.fillText('0 s',40,166); c.fillText('1 s',w-24,166);
    m.querySelector('#fp').innerHTML=frontSVG(); bind(m.querySelector('#fp'));
  });
}

const BLK={
  ain:{x:10,y:15,w:160,h:62,t:'ANALOG IN 1–4',s:['balanced euroblocks','>20 kΩ, +24 dBu max'],d:'Rear ANALOG LEFT / ANALOG RIGHT, columns 1–4 (silk). Manual: input impedance >20 kΩ balanced, +24 dBu max, 0 VU = +4 dBu.'},
  aes:{x:10,y:95,w:160,h:62,t:'AES IN 1–4',s:['110 Ω euroblock','75 Ω BNC (auto)'],d:'Silk AES 1/2, 3/4 euroblocks and four BNCs. Nets AES110 / AES75 are selected by ee_data,7 (PORTC,0 / PORTA,1). Manual: auto-recognition of 75 or 110 Ω; both connected → random selection.'},
  sdi:{x:10,y:175,w:160,h:62,t:'SDI IN (option)',s:['DEMUX-1/-2/-3 board','serial link to the PIC'],d:'Optional DEMUX board in the Detail B opening. The firmware detects it at power-up (send/receive, comout,1) and then exchanges status every pass (communication_control, scanuart, txuart).'},
  rx:{x:200,y:95,w:160,h:62,t:'CS8415 → CS4335',s:['AES receiver, SPI','24-bit DAC → D/A_LEFT/RIGHT'],d:'AMS4-1 ISS5 BOM: U13 CS8415 (28-TSSOP), U18 CS4335 (v2.02: “CS4335 24-bit left-justified”). Clock net CLK8415; crystal X2 4.9152 MHz.'},
  xpt:{x:390,y:55,w:170,h:70,t:'Crosspoint',s:['8 × 74HC4053','XPT1–4, XPTAES'],d:'Eight 74HC4053 analog switches pick one analog pair or the DAC output onto LEFT / RIGHT. Driven from PORTC (xpt1–4 = bits 2–5) and PORTA,2 (xptaes).'},
  out:{x:390,y:150,w:170,h:60,t:'ANALOG OUTPUT',s:['balanced, switcher output'],d:'Rear column OUTPUT: “A direct, balanced, stereo analog audio output of the switcher is available on the rear panel.”'},
  mtr:{x:590,y:10,w:170,h:62,t:'10-LED VU + phase',s:['LEFT_VU / RIGHT_VU','PHASE_V → PIC ADC'],d:'Nets LEFT_VU, RIGHT_VU, PEAK_L, PEAK_R, PHASE, PHASE_V; LM393 and LF353 on the main board. The meter driver is on a separate board (AMS4-2…5, untitled in the archive) '+inf+'. phase() compares ADRESH with 100.'},
  ctl:{x:590,y:95,w:170,h:62,t:'STEREO + LEFT/RIGHT',s:['latching switch','two level pots'],d:'Front: LEFT knob (B .167″ hole at 10.750″), STEREO button (C .281″ at 11.250″), RIGHT knob (B at 11.750″). Mono sum when pressed is '+inf+'.'},
  amp:{x:790,y:95,w:150,h:62,t:'TDA2616 power amp',s:['LEFT+/− RIGHT+/−','3 × on the BOM'],d:'AMS4-1 ISS5 BOM: TDA2616 (U12…, footprint TDAUP), 3 pieces. On the AMA-4 the outputs reach the rear L+/L−/R+/R− posts '+inf+'. Gain 30 dB / ≈12 W per channel are datasheet values '+inf+'.'},
  hs:{x:790,y:10,w:150,h:62,t:'HEADSET jack',s:['LEFT_NORM / RIGHT_NORM'],d:'Front .390″ hole (D) at 12.775″. The speaker feeds are normalled through the jack (nets LEFT_NORM, RIGHT_NORM), so a plug mutes the speakers.'},
  spk:{x:790,y:180,w:150,h:58,t:'Speakers',s:['rear posts (+ front grilles?)'],d:'Rear binding posts (Detail L, .320″ double-D, 4 places). The front has 3 × 13 slots .062 × .750″ (39 places) in the same places as the AMS4 speaker grilles — whether AMA-4 also has built-in drivers is not stated '+inf+'.'},
  pic:{x:390,y:230,w:170,h:52,t:'PIC16F874 @ 4.9152 MHz',s:['MODE/SOURCE, display, mute'],d:'PB1/PB2 (PORTB,7/6), display D0–D6, A0/A1, ~WR, ~BL (4-character dot-matrix, 0x80|ASCII codes in init.asm), EXT_MUTE (PORTA,4), EXT_MUTE_TALLY (PORTA,5), CS8415 SPI (PORTB,2 CS). Firmware assumed to be the AMS4 code '+inf+'.'},
  psu:{x:200,y:230,w:160,h:52,t:'Power',s:['115-230 VAC, 1 A S.B'],d:'IEC inlet + fuse (rear silk). M3 bottom pan has four SOS-6440-8 inserts (D, 2.570 × 4.570″ pattern) — likely the transformer '+inf+'.'},
};
const WIRES=[['ain','xpt','XPT1–4'],['aes','rx','AES110/AES75'],['sdi','rx'],['rx','xpt','D/A_L/R'],['xpt','out'],['xpt','mtr','LEFT_VU'],['xpt','ctl','LEFT/RIGHT'],['ctl','amp'],['amp','hs','_NORM'],['hs','spk'],['pic','xpt'],['pic','rx','SPI'],['psu','pic']];
function viewBlock(m){
  off(); let sel='xpt';
  m.innerHTML=`${card('Block diagram (AMS4 manual functional text + AMS4-1 ISS5 nets; click a block)','<div id="bd"></div>')}<div class="grid2">${card('Block','<div id="bi"></div>')}${card('Live levels','<div id="ch"></div>')}</div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 950 292" style="width:100%"><defs><marker id="amaar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLK[a],B_=BLK[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; }; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#amaar)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLK){ const b=BLK[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); }); m.querySelector('#bi').innerHTML=`<h3>${BLK[sel].t}</h3><p>${BLK[sel].d}</p>`; m.querySelector('#ch').innerHTML=chainTable(); };
  draw(); SIM.on('time',()=>{ m.querySelector('#ch').innerHTML=chainTable(); });
}

/* Schematics: redrawn from AMS4-1ISS5.net net names and the AMA4 panel drawings — not the original CAD */
function sch(title, body, w, h){ return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;background:var(--panel2);border-radius:8px"><text x="10" y="18" font-size="12" font-weight="700" fill="var(--ink)">${title}</text><text x="${w-10}" y="18" font-size="10" text-anchor="end" fill="var(--warn)">REDRAWN — not the original P-CAD sheet</text>${body}</svg>`; }
const T=(x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" fill="var(--${(o&&o.c)||'ink'})" ${o&&o.a?`text-anchor="${o.a}"`:''} font-family="var(--mono)">${s}</text>`;
const Bx=(x,y,w,h,lbl,pins)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel)" stroke="var(--ink2)"/>${T(x+w/2,y+h/2+4,lbl,{a:'middle',fs:12})}${(pins||[]).map(p=>T(p[0],p[1],p[2],{fs:9.5,c:'ink2',a:p[3]})).join('')}`;
const Wn=(pts,net,hot)=>`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.3}"/>${net?T(pts[0][0]+4,pts[0][1]-4,net,{fs:9.5,c:hot?'accent':'ink2'}):''}`;
function viewSchem(m){
  off();
  m.innerHTML=`<p class="small muted">Redrawn sheets. Net and part names are from <span class="mono">AMS4 - #Master/AMS4 - #Engineering/AMS4-1/PCB/AMS4-1ISS5.net</span> and <span class="mono">.bom</span>; port bits are from <span class="mono">ams1v203.asm</span> / <span class="mono">init.asm</span>. The AMA-4 has no schematic of its own: using the AMS4 board is ${inf} from “FOR AMS4 ISSUE 4 PCB” on the 2002 AMA4 bottom-pan drawing. Connections drawn as lines are the net names; the exact pin numbers are not reproduced.</p><div id="s1"></div><div style="height:12px"></div><div id="s2"></div><div style="height:12px"></div><div id="s3"></div>`;
  SIM.on('time',()=>{ const s=selected(), c=chain(); const ax=s.kind==='A', ae=s.kind!=='A';
    m.querySelector('#s1').innerHTML=sch('Sheet A — input switching (74HC4053 × 8) and AES path', Bx(20,40,120,60,'ANALOG IN 1–4',[[22,115,'balanced euroblocks']])+Bx(20,150,120,60,'AES IN 1–4',[[22,225,'AES110 / AES75']])+Bx(220,150,130,70,'CS8415 U13',[[222,145,'CS8415 · CLK8415 · 8415IN/OUT'],[222,235,'SPI: PORTB,2 = CS']])+Bx(420,150,110,60,'CS4335 U18',[[422,225,'D/A_LEFT · D/A_RIGHT']])+Bx(600,60,140,140,'74HC4053 ×8',[[602,55,'XPT1 XPT2 XPT3 XPT4 XPTAES']])+Bx(820,90,110,70,'LEFT / RIGHT',[[822,175,'→ LEFT_VU, STEREO, pots']])+Wn([[140,70],[600,70]],'XPT'+(ax?idx(D.sourcea)+1:'1–4'),ax&&c.xpt)+Wn([[140,180],[220,180]],D.ee7?'AES110':'AES75',ae)+Wn([[350,180],[420,180]],'I²S',ae&&c.xpt)+Wn([[530,180],[600,180]],'D/A_LEFT/RIGHT',ae&&c.xpt)+Wn([[740,125],[820,125]],'LEFT',c.xpt)+T(560,250,'PORTC 2–5 = xpt1–4 · PORTA,2 = xptaes · PORTC,0/PORTA,1 = 75/110',{fs:10,c:'ink2'}),950,265);
    m.querySelector('#s2').innerHTML=sch('Sheet B — level, mono, power amp and headset normalling', Bx(20,60,110,60,'LEFT bus')+Bx(170,60,120,60,'STEREO sw',[[172,135,D.stereo?'stereo':'L+R (inferred)']])+Bx(330,60,110,60,'LEFT pot',[[332,135,Math.round(D.potL*100)+' %']])+Bx(480,60,140,60,'TDA2616 U12',[[482,135,'+30 dB (inferred)']])+Bx(670,40,130,100,'HEADSET jack',[[672,155,'LEFT_NORM / RIGHT_NORM'],[672,35,'T/R/S, .390″ hole D']])+Bx(840,60,100,60,'L+ / L−',[[842,135,'rear posts']])+Wn([[130,90],[170,90]],'',c.xpt)+Wn([[290,90],[330,90]],'',c.xpt)+Wn([[440,90],[480,90]],'',c.xpt&&!D.extMute)+Wn([[620,90],[670,90]],'LEFT+',c.xpt&&!D.extMute)+Wn([[800,90],[840,90]],'',c.xpt&&!D.extMute&&!D.headset)+T(480,185,'MUTE: EXT_MUTE (PORTA,4) → mute_flag → crosspoint/receiver muted (cs8415reg1mute) · EXT_MUTE_TALLY = PORTA,5, open collector 24 V 25 mA',{fs:10,c:'ink2',a:'middle'}),950,200);
    m.querySelector('#s3').innerHTML=sch('Sheet C — PIC16F874 (U35, QFP44) I/O used by the firmware', Bx(380,40,190,200,'PIC16F874',[[372,70,'RB7 PB1 (MODE)','end'],[372,95,'RB6 PB2 (SOURCE)','end'],[372,120,'RB2 CS8415 CS','end'],[372,145,'RB5 8415 reset','end'],[372,170,'RA4 EXT_MUTE','end'],[372,195,'RA5 EXT_MUTE_TALLY','end'],[372,220,'RA3 phase LED (0°/180°)','end'],[578,70,'RD0–RD6 → D0–D6 (display)'],[578,95,'RE1 → A0/A1 · RE2 → ~WR · ~BL'],[578,120,'RC2–RC5 → XPT1–4'],[578,145,'RA2 → XPTAES'],[578,170,'RC0 / RA1 → AES75 / AES110'],[578,195,'AN (PHASE_V) → ADRESH'],[578,220,'UART ↔ DEMUX board']]),950,255);
  });
}

function viewSoft(m){
  off();
  m.innerHTML=`<div class="grid2">${card('main() — running step at the playhead (ams1v203.asm)','<div id="ml"></div>')}<div>${card('MODE state machine (sw_mode / no_sdi)','<div id="sm"></div>')}${card('AES lock / auto-detect state','<div id="lk"></div>')}</div></div>
  <div class="grid2">${card('Display codes (init.asm: char = 0x80 | ASCII)','<div id="dc"></div>')}${card('CS8415 register writes (init.asm constants)','<table class="kv small"><tr><th>Routine</th><th>Constant</th><th>Value</th></tr><tr><td>reg1</td><td class="mono">cs8415reg1def / reg1mute</td><td class="mono">00000000 / 00100000</td></tr><tr><td>reg2</td><td class="mono">cs8415reg2def … s6, off</td><td class="mono">01000000 … 01000110, 01000111</td></tr><tr><td>reg4</td><td class="mono">cs8415reg4def / reg4stop</td><td class="mono">01000001 / 00000001</td></tr><tr><td>reg6</td><td class="mono">cs8415reg6def</td><td class="mono">10000000</td></tr><tr><td>read8415</td><td class="mono">address byte 0x20, register 16</td><td class="mono">receiver error (lock) bit → cs8415_16,0</td></tr></table><p class="small muted">Register meanings come from the CS8415A datasheet, which is not in the archive '+inf+'.</p>')}</div>
  ${card('Firmware trace of your actions','<div id="lg"></div>')}`;
  SIM.on('time',()=>{ const t=SIM.t, r=run(), s=selected(), pi=passAt(t);
    const main=['clrwdt','input_routine','debounce','read8415','auto_detect','display_setup','unlock_source','analog_mode / aes_mode / sdi_mode','refresh','output_control','phase','digital_output','mute_check','processdata','lock_count','reg2 · reg4','eewrite','btfss comout,0 → goto main'].concat(D.demux?['communication_control · pole · scanuart','loss_of_com · tx_setup · processdata','settxdata · txuart → goto main']:[]);
    const map={0:1,1:2,2:3,3:4,4:5,5:6,6:7,7:8,8:9,9:10,10:11,11:12,12:13,13:14,14:15,15:15,16:16};
    const hi=map[pi];
    m.querySelector('#ml').innerHTML=`<svg viewBox="0 0 520 ${main.length*24+16}" style="width:100%">${main.map((x,i)=>`<rect x="10" y="${6+i*24}" width="500" height="20" rx="4" fill="${i===hi?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="18" y="${20+i*24}" font-size="11.5" font-family="var(--mono)" fill="${i===hi?'#fff':'var(--ink)'}">${x}</text>`).join('')}</svg><p class="small muted">${D.demux?'With the DEMUX board found (comout,0) the pass continues into the serial exchange.':'Without the DEMUX board (comout,0 clear) the pass returns to main after eewrite.'}</p>`;
    const st=D.demux?[['A',1],['D',2],['SD',4]]:[['A',1],['D',2]];
    m.querySelector('#sm').innerHTML=`<svg viewBox="0 0 420 110" style="width:100%">${st.map((x,i)=>`<g><circle cx="${70+i*140}" cy="50" r="32" fill="${D.mode===x[1]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${70+i*140}" y="55" text-anchor="middle" font-size="14" font-weight="700" fill="${D.mode===x[1]?'#fff':'var(--ink)'}">${x[0]}</text><text x="${70+i*140}" y="100" text-anchor="middle" font-size="10" fill="var(--ink2)">mode=b'${x[1].toString(2).padStart(3,'0')}'</text></g>`).join('')}${st.map((x,i)=>i<st.length-1?`<line x1="${102+i*140}" y1="45" x2="${178+i*140}" y2="45" stroke="var(--ink2)"/><text x="${140+i*140}" y="38" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${D.demux?'rlf':'xor 011'}</text>`:'').join('')}<path d="M${70+(st.length-1)*140},62 Q${(70+(st.length-1)*140+70)/2},92 70,62" fill="none" stroke="var(--ink2)" stroke-dasharray="3 2"/><text x="${(70+(st.length-1)*140+70)/2}" y="84" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${D.demux?'back_to_analog':'xor 011 (back)'}</text></svg>`;
    const stl = s.kind==='A'?'analog: no lock logic':r.rxLockT===null?'UNLOCKED — auto_detect counting bcount, flipping 75/110':t<r.rxLockT?'ACQUIRING (CS8415 PLL)':r.xptT===null||t<r.xptT?'LOCKED — lock_count waiting '+K.LOCK_ON+' passes':'LOCKED — XPTAES on, audio';
    m.querySelector('#lk').innerHTML=`<table class="kv"><tr><th>State</th><td><b>${stl}</b></td></tr><tr><th>bcount reload</th><td class="mono">0x0F = 15 passes = ${SIM.fmtDur(15*K.TP)}</td></tr><tr><th>CS8415 lock time</th><td class="mono">${SIM.fmtDur(K.RX_LOCK)} ${inf}</td></tr><tr><th>Can it lock?</th><td>${15*K.TP>K.RX_LOCK?'yes: the 15-pass window is longer than the lock time':'<b style="color:var(--bad)">no</b>: the termination flips before the receiver can lock (try a longer pass time)'}</td></tr></table>`;
    const chars=[['charA','11000001','A'],['charD','11000100','D'],['charS','11010011','S'],['charN','11001110','N'],['charL','11001100','L'],['charm','11001101','M'],['charu','11010101','U'],['chart','11010100','T'],['charE','11000101','E'],['char1','10110001','1']];
    m.querySelector('#dc').innerHTML=`<table class="kv small"><tr><th>Constant</th><th>Binary</th><th>Glyph</th></tr>${chars.map(c=>`<tr><td class="mono">${c[0]}</td><td class="mono">${c[1]}</td><td class="mono">${c[2]}</td></tr>`).join('')}</table><p class="small muted">refresh writes dis0–dis3 to PORTD with A0/A1 (PORTE,1) per digit and a ~WR pulse (PORTE,2): a 4-character intelligent dot-matrix display. Showing now: “${dispAt(t)}”.</p>`;
    m.querySelector('#lg').innerHTML=logHTML();
  });
}

function viewDraw(m){
  off();
  const S=40;   // px per inch for these views
  const front=()=>{ let s=`<svg viewBox="-20 -30 ${17.1*S+40} ${1.648*S+70}" style="width:100%"><rect x="0" y="0" width="${17.1*S}" height="${1.648*S}" fill="none" stroke="var(--ink)"/>`;
    for (const x0 of SLOTX) for (let i=0;i<13;i++) s+=`<rect x="${(x0+i*0.187)*S-1.2}" y="${0.449*S}" width="2.5" height="${0.75*S}" fill="var(--ink2)"/>`;
    s+=`<rect x="${3.95*S}" y="${0.24*S}" width="${1.0*S}" height="${0.404*S}" fill="none" stroke="var(--accent)"/>`;
    [4.15,4.75].forEach(x=>s+=`<rect x="${(x-0.25)*S}" y="${0.818*S}" width="${0.5*S}" height="${0.5*S}" fill="none" stroke="var(--accent)"/>`);
    for (let i=0;i<10;i++) [0.724,0.924].forEach(y=>s+=`<circle cx="${(5.215+i*0.16)*S}" cy="${y*S}" r="${0.065*S}" fill="none" stroke="var(--ink2)"/>`);
    [8.4,8.7].forEach(x=>s+=`<circle cx="${x*S}" cy="${0.2*S}" r="${0.065*S}" fill="none" stroke="var(--ink2)"/>`);
    [[10.75,0.0835],[11.25,0.1405],[11.75,0.0835]].forEach(([x,r])=>s+=`<circle cx="${x*S}" cy="${1.121*S}" r="${r*S}" fill="none" stroke="var(--accent)"/>`);
    s+=`<circle cx="${12.775*S}" cy="${0.871*S}" r="${0.195*S}" fill="none" stroke="var(--accent)"/>`;
    [3.775,6.925].forEach(x=>s+=`<circle cx="${x*S}" cy="${0.824*S}" r="${0.057*S}" fill="none" stroke="var(--ink2)"/>`);
    [0,4.15,4.45,5.215,8.4,10.75,11.25,11.75,12.775,17.1].forEach(x=>s+=`<text x="${x*S}" y="-6" font-size="8" fill="var(--ink2)" text-anchor="middle" transform="rotate(-45 ${x*S} -6)">${x.toFixed(3)}</text>`);
    return s+`<text x="0" y="${1.648*S+18}" font-size="8" fill="var(--ink2)">AMA4-M1 ISS 2 FRONT PANEL · 17.100 × 1.648″ · .047 CRS (18 ga) · WBS BLACK Polane T F63B12 · drawn TC 03-05-07, rev 2 (26-09-07 E.S.)</text></svg>`; };
  const rear=()=>{ let s=`<svg viewBox="-20 -30 ${17.1*S+40} ${1.648*S+70}" style="width:100%"><rect x="0" y="0" width="${17.1*S}" height="${1.648*S}" fill="none" stroke="var(--ink)"/>`;
    s+=`<rect x="${0.3*S}" y="${0.204*S}" width="${1.08*S}" height="${1.24*S}" fill="none" stroke="var(--accent)"/>`;
    [2.23,2.98,5.042,5.792].forEach(x=>s+=`<circle cx="${x*S}" cy="${0.55*S}" r="${0.16*S}" fill="none" stroke="var(--accent)"/>`);
    for (let i=0;i<5;i++) s+=`<rect x="${(3.481+i*0.25)*S-1.8}" y="${0.324*S}" width="3.7" height="${S}" fill="var(--ink2)"/>`;
    s+=`<rect x="${6.324*S}" y="${0.365*S}" width="${3.89*S}" height="${0.7*S}" fill="none" stroke="var(--warn)" stroke-dasharray="4 3"/>`;
    [11.623,12.148,12.673,13.198,13.723,14.574,15.099].forEach(x=>[0.59,1.2].forEach(y=>s+=`<rect x="${(x-0.264)*S}" y="${(y-0.166)*S}" width="${0.528*S}" height="${0.332*S}" fill="none" stroke="var(--accent2)"/>`));
    s+=`<rect x="${(10.88-0.166)*S}" y="${(0.92-0.264)*S}" width="${0.332*S}" height="${0.528*S}" fill="none" stroke="var(--accent2)"/>`;
    [15.75,16.375].forEach(x=>[0.496,1.121].forEach(y=>s+=`<circle cx="${x*S}" cy="${y*S}" r="${0.2655*S}" fill="none" stroke="var(--accent)"/>`));
    [0,0.84,2.23,2.98,5.042,5.792,6.324,10.898,11.623,13.723,15.099,15.75,16.375,17.1].forEach(x=>s+=`<text x="${x*S}" y="-6" font-size="8" fill="var(--ink2)" text-anchor="middle" transform="rotate(-45 ${x*S} -6)">${x.toFixed(3)}</text>`);
    return s+`<text x="0" y="${1.648*S+18}" font-size="8" fill="var(--ink2)">AMA4-M2 ISS 3 REAR PANEL · drawn D.A. 25-11-13 · rev 2 27-09-07 removed 2 mounting holes (K) · rev 3 24-06-16 changed ground stud to FH 440-5 (D.A.)</text></svg>`; };
  const pan=()=>{ const s2=30; let s=`<svg viewBox="-10 -10 ${17.12*s2+30} ${10.024*s2+40}" style="width:100%;max-width:640px"><rect x="0" y="0" width="${17.12*s2}" height="${10.024*s2}" fill="none" stroke="var(--ink)"/>`;
    [[1.06,1.337],[0.335,4.487],[5.685,4.487],[11.635,4.487],[15.86,4.462],[8.86,2.237],[11.935,0.712],[15.86,1.337]].forEach(([x,y])=>s+=`<circle cx="${x*s2}" cy="${y*s2}" r="4" fill="var(--accent)"/>`);
    [[11.99,5.289],[16.56,5.289],[11.99,7.859],[16.56,7.859]].forEach(([x,y])=>s+=`<circle cx="${x*s2}" cy="${y*s2}" r="5" fill="none" stroke="var(--warn)" stroke-width="2"/>`);
    [[12.105,9.374],[13.305,9.024]].forEach(([x,y])=>s+=`<circle cx="${x*s2}" cy="${y*s2}" r="6" fill="none" stroke="var(--accent2)" stroke-width="2"/>`);
    s+=`<rect x="${11.99*s2}" y="${5.289*s2}" width="${4.57*s2}" height="${2.57*s2}" fill="var(--warn)" opacity=".12"/><text x="${14.27*s2}" y="${6.7*s2}" font-size="10" text-anchor="middle" fill="var(--warn)">D ×4 SOS-6440-8 (transformer? inferred)</text>`;
    s+=`<rect x="${0.335*s2}" y="${0.712*s2}" width="${15.525*s2}" height="${3.775*s2}" fill="var(--accent)" opacity=".07"/><text x="${6*s2}" y="${3.2*s2}" font-size="10" fill="var(--accent)">B ×8 SO-440-4 standoffs: main PCB (AMS4 issue 4/5, inferred)</text><text x="${12.7*s2}" y="${9.8*s2}" font-size="10" text-anchor="middle" fill="var(--accent2)">C ×2 SO-440-8 (front, near headset)</text><text x="${8.56*s2}" y="${10.024*s2+22}" font-size="10" text-anchor="middle" fill="var(--ink2)">FRONT · AMA4-M3 ISS 2 BOTTOM PAN 17.120 × 10.024″, .035 CRS (20 ga), WBS black</text></svg>`; return s; };
  m.innerHTML=`${card('Front panel to scale — AMA4-M1 ISS 2 (FRONT PANEL) .pdf (holes: B .167, C .281, D .390, E .500 sq, H .404 × 1.000, J .114, slots .062 × .750 ×39, 20 unmarked .130)',front())}
  ${card('Rear panel to scale — AMA4-M2 ISS 3 (REAR PANEL).pdf (A .332 × .528 ×15, C .100 ×6, D 1.080 × 1.240 IEC, E .531 BNC ×4, G .093 × 1.000, H ground stud, L .320 double-D ×4, Detail B 3.890 × .700)',rear())}
  ${card('Bottom pan — AMA4-M3 ISS 2 (BOTTOM PAN) .pdf',pan())}
  ${card('Drafting record for the AMA4 (dates as in the files)',`<table class="kv small"><tr><th>Part</th><th>Description (BOM Summary Tool)</th><th>Cost</th><th>Files</th></tr>
  <tr><td class="mono">AMA4--M1</td><td>RoHS AMA4 FRONT PANEL (782.1)</td><td>6.85</td><td>ISS 2 DWG 2015-11-04 (71,502 B) · PDF 2015-11-04 · DWG 2016-07-06 (72,223 B, differs) · LAYOUT 2012-05-01 · silk NOV.05/15</td></tr>
  <tr><td class="mono">AMA4--M2</td><td>RoHS AMA4 REAR PANEL (783.1)</td><td>5.70</td><td>ISS 2 DWG 2012-05-01 · ISS 3 DWG 2016-06-24 in two different versions (78,355 B and 131,722 B) · PDF 2016-06-24 · LAYOUT ISS 3 2016-06-24 · silk MAY 08/15</td></tr>
  <tr><td class="mono">AMA4--M3</td><td>RoHS AMA4 BOTTOM PANEL (784.1)</td><td>13.50</td><td>ISS 2 DWG + PDF 2016-05-06 (drawn TC 03-05-02) · LAYOUT (AFTER BENDING) 2011-05-19 = byte-identical to AMS4-BOTTOM LAYOUT (AFTER BENDING)</td></tr></table>`)}`;
}

function viewFind(m){
  off();
  const F=[
   ['Artwork 2026|59: front/rear panels now from the CorelDRAW silks', `${SIM.src('#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M1-FRONT-SILK (CURVE).cdr','AMA4-M1-FRONT-SILK (CURVE).cdr')} (NOV.05/15, file 5 Nov 2015) and ${SIM.src('#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M2-REAR-SILK(CURVE).cdr','AMA4-M2-REAR-SILK(CURVE).cdr')} (MAY 08/15, file 4 Nov 2015), replacing the PNG cuts from the PDFs. The front sheet is two plates: GREEN carries the WARD-BECK SYSTEMS / AMA-4 AUDIO MONITOR SYSTEM wordmarks, the VU scale (-20 … 3, L, R) and a full-width green stripe broken only for the WHITE plate's “SELECT SERIES”; WHITE carries MODE, SOURCE, 0°/180°, STEREO, LEFT, RIGHT and HEADSET. The rear legend reads OUTPUT 1 2 3 4 over ANALOG LEFT / ANALOG RIGHT and four AES positions (1–4, two euroblocks and two BNCs), with the MUTE block printed I O G. The rear silk is six months older than the front silk and both predate the ISS 3 rear drilling (2016-06-24) <span class="tag-inf" title="Inferred: from the file dates">inferred</span>.`],
   ['What the AMA-4 is', `The silks say “AMA-4 AUDIO MONITOR SYSTEM” and “SELECT SERIES”. The 2002 AMA4 bottom-pan and panel DWGs say “FOR AMS4 ISSUE 4 PCB”, and <span class="mono">AMA4-M3 LAYOUT(AFTER BENDING).dwg</span> is byte-identical to <span class="mono">AMS4-BOTTOM LAYOUT(AFTER BENDING).dwg</span>. The front panel has the AMS4's MODE/SOURCE buttons, 4-character display, 10-LED meter, 0°/180° LEDs, LEFT/STEREO/RIGHT and HEADSET. The rear adds four speaker binding posts L+ L− R+ R−. So the AMA-4 is the AMS4 electronics with outputs for external speakers ${inf}; “AMA” = audio monitor amplifier is ${inf}.`],
   ['Two different “AMA4-M2 ISS 3” files with the same date', `<span class="mono">XXX - AMA4 #Obsolete/AMA4-M2 ISS 3 (REAR PANEL).dwg</span> (78,355 B, moved from the Master Mechanical Library) and <span class="mono">…/AMA4 - #Mechanical #DA #2016/AMA4-M2 ISS 3 (REAR PANEL).dwg</span> (131,722 B, also in the AMA folder) are both dated 2016-06-24 but differ. The 131 KB one carries extra text (threads covered prior to painting, “CHANGED GROUND STUD TO FH 440-50R”). Only one PDF exists.`],
   ['The front M1 changed after its PDF', `The M1 ISS 2 DWG in #Mechanical #DA #2016 was saved 2016-07-06 (72,223 B); the PDF and the AMA-folder DWG are from 2015-11-04 (71,502 B). The recovered text is identical and the issue stays 2, so the change has no revision note.`],
   ['Rear silk does not register with the BNC holes', `M2 ISS 3 drills four E holes (.531″) at 15.750″ and 16.375″, two rows. The 2015 rear silk has only two crosshair circles (one column, ≈16.33″) with the labels 1–4 around them. The plugin places the BNCs on the M2 positions.`],
   ['Speaker post order flips between versions', `2015 silk and the May 2002 AMA-S2.cdr: L+ L− … R+ R− from the left (as seen from the rear). The June 2002 AMA-S2_TEST.cdr and the 2003 manual sketch swapped them to R+ R− … L+ L−. The 2015 silk follows the older file.`],
   ['Revision text that is not in the title block', `The M1, M2 and M3 DWGs all contain “CHANGED SPEAKER SCREEN AND MOUNTING HOLES”; the PDFs' revision blocks only show “REMOVED 2 MOUNTING HOLES (K)” (26/27-09-07) and, on M2, “CHANGED GROUND STUD TO FH 440-5” (24-06-16). The speaker-screen note is a hidden or deleted revision row.`],
   ['Hole count on M1', `The note says “ALL UNMARKED HOLES ARE .130 DIA., 20 PLC'S”, but the drawing shows 22 such holes (2 × 10 meter LEDs + 2 phase LEDs at 8.400/8.700″).`],
   ['Auto 75/110 detection keeps toggling', `<span class="mono">auto_detect</span> flips <span class="mono">ee_data,7</span> (PORTC,0 / PORTA,1) after every 15 passes without lock. With nothing connected to the selected AES input it toggles forever (${(1/(15*K.TP)).toFixed(0)} flips/s at the inferred pass time). It also explains the manual's warning that a balanced and an unbalanced signal on the same input give “random selection”. If the CS8415 lock time were longer than 15 passes it would never settle (try the pass-time slider).`],
   ['Long, fixed lock delays', `<span class="mono">lock_num1 equ 10 ;aes lock xpt</span> with the 256-count inner loop means ${K.LOCK_ON} passes before XPTAES opens after lock (${SIM.fmtDur(K.LOCK_ON*K.TP)} at ${(K.TP*1e6).toFixed(0)} µs/pass ${inf}), and ${K.LOCK_OFF} passes before it closes after a loss. The commented-out values 6 and 7 show it was tuned by hand.`],
   ['Phase indicator is one bit', `<span class="mono">phase</span> compares ADRESH with 100 and drives PORTA,3: red (180°) or green (0°). One LED is always lit, even with no signal.`],
   ['Three TDA2616 on the AMS4 board', `AMS4-1ISS5.bom lists TDA2616 with quantity 3 (U12 …). Two stereo amplifiers for the speakers plus one for the headset is ${inf}.`],
   ['Still a costed production part in 2015–2016', `BOM Summary Tool.xls/.xlsx list AMA4--M1 (6.85), AMA4--M2 (5.70) and AMA4--M3 (13.50) as RoHS Ward-Beck parts 782–784.`],
   ['Paint spec typo and template leftovers', `M1/M2: “EXTRA FINE TEXT WBS BLACK, SHERWIN WILLIAMS POLANE T F63B12”; M3: “SHERWIN WILLAMS”. The 2002 obsolete DWGs still carry “POWDER COAT BEIGE”, “TEXTURED BLACK TEXCOTE VINYL”, ABB-M1 / ABB-1 ENCLOSURE and POD10-REAR text: they were started from the ABB-1 and POD10 drawings.`],
   ['Corrected 2026|59: PIC clock and termination bit', `The PIC runs from X2 = 4.9152 MHz (AMS4-1ISS5.net, BOM S1-4M9152), not the 4 MHz in <span class="mono">Amsv203.pjt</span>: SPBRG = 7 only gives the 9600 baud in the comment at 4.9152 MHz. The inferred 250-instruction pass is now ≈203 µs. <span class="mono">ee_data,7</span> was backwards here: <span class="mono">auto_detect</span> drives PORTC,0 low when the bit is 0, and PORTC,0 is net AES75 on the DS75176 ~RE pins (U19/U22/U23/U24 pin 2). So 0 = 75 Ω and 1 = 110 Ω (PORTA,1 = AES110, U14–U17), and the one saved bit sets the termination for all four inputs (see ams4.js).`],
  ];
  m.innerHTML=card('Findings',`<ol>${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> ${f[1]}</li>`).join('')}</ol>`)+card('Sources','<p class="small">'+(ERA===2016?'AMA4 folder: M1/M2/M3 PDFs and DWGs, #ARTWORK #DA #2016 silks. ':'AMA folder: #SILKS/Older Drawings CDRs, #MECHANICAL and OBSOLETE DWGs (text via sidecars). ')+'AMS4 - #Master: AMS4 Manual.pdf, AMS4-1ISS5.net/.bom, ams1v203.asm, init.asm. BOM Summary Tool.xlsx. File sizes and MD5s measured on the archive (read only).</p>');
}

SIM.register({
  footnotes: [{"text": "The front sheet has two plates. GREEN carries the wordmarks, the VU scale (-20 … 3, L, R) and a full-width stripe; WHITE carries MODE, SOURCE, 0°/180°, STEREO, LEFT, RIGHT and HEADSET.", "src": "#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M1-FRONT-SILK (CURVE).cdr"}, {"text": "The green stripe along the bottom of the front breaks only where the white plate prints “SELECT SERIES”.", "src": "#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M1-FRONT-SILK (CURVE).cdr"}, {"text": "The rear silk prints the MUTE block as “I O G” and the AES section as 1–4 across two euroblocks and two BNC pairs.", "src": "#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M2-REAR-SILK(CURVE).cdr"}, {"text": "The rear silk (MAY 08/15) is six months older than the front (NOV.05/15), and both predate the ISS 3 rear drilling of 2016-06-24.", "src": "#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M2-REAR-SILK(CURVE).cdr"}, {"text": "The AMA-4 rear warning reads “115-230 VAC, 1 A.S.B”, unlike the AMX9A’s 100-240 VAC.", "src": "#AMA #SERIES/XXX - AMA4 #Obsolete/AMA4 - #ARTWORK #DA #2016/AMA4-M2-REAR-SILK(CURVE).cdr"}],
  id:'ama4', name:'AMA4 · AMA-4 audio monitor system, 2016 drafting set (2016|49)', duration:1,
  product:'AMA4', year:2016, family:'Obsolete products', folder:'#AMA #SERIES/XXX - AMA4 #Obsolete',
  summary:'A 1RU SELECT SERIES “AMA-4 Audio Monitor System”: the AMS4 monitor (4 analog + 4 AES inputs, display, VU and phase meter, headset) with rear binding posts for external speakers. This model uses the 2015|48 silks and the 2016|49 M1/M2/M3 drawings; the electronics and firmware behaviour come from the sister AMS4.',
  highlights:['Real front and rear silk on the M1/M2 drilling','MODE/SOURCE with the AMS4 firmware path (sw_mode, auto_detect, lock_count)','75/110 Ω auto-detect and lock delay in slow motion','Level from input to the speaker posts','M1/M2/M3 drawn to scale','Two different M2 ISS 3 files found'],
  depth:'Hardware model',
  stepUnits:[{label:'1 main() pass',period:()=>K.TP},{label:'1 AES frame',period:()=>1/K.FS},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'display flash (0.5 s)',period:()=>K.FLASH}],
  zooms:[[1,'1 s (whole)'],[0.1,'100 ms'],[0.01,'10 ms (auto-detect)'],[0.001,'1 ms (passes)'],[0.0001,'100 µs (AES frames)']],
  defaultZoom:0,
  init(){ D.mode=2; D.sourced=1; D.ee7=0; KEY=''; },
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second, frame by frame',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'drawings',label:'Drawings (to scale)',render:viewDraw},{id:'findings',label:'Findings',render:viewFind}],
});
})();

