/* =====================================================================
   D8208 — Adjustable-gain AES distribution amplifier (Ward-Beck, 2000|33)
   Plugin for the WBS Device Simulator (../siumulation.html)

   The D8208 folder holds one document. Its behaviour comes from the shared D820x platform
   firmware, built with #define D8208 (FIRMWARE LINK — the card had no code folder of its own):
   - D8208 - #Engineering #MF82/D8208 - Adjustable Gain Distribution Amplifier FUNCTIONAL DESCRIPTION.WPD
   - D8200 - #Engineering #MF82/d8200 - #d820x/jumpers.txt          (D8208 LEDs and jumpers, CS=8434)
   - …/d820x/pic/d820x.h          (#ifdef D8208: MODE1/MODE2 bits, AUD_OUTPUT_ROUTE, PRODUCT_NUMBER 0x08)
   - …/d820x/pic/d820x.asm        (main loop; #ifdef D8208 init_modes, switch_8420_modes, LED_processing)
   - …/d820x/pic/d820xswr.asm     (jmp_input, debounce, validity-bit copy)
   - …/d820x/pic/d820xad.asm      (AtoD_data_preparing, Average, Hysterisis)
   - …/d820x/sharc/d820xcore.asm  (D8208_beg, jumpers_analize_D8208, sample_proc_D8208)
   - …/d820x/sharc/D8205_trm.dat, D8205_vol.dat (256-entry gain tables used by the D8208)
   - D8200 - #Engineering #MF82/d8200 - #PCB/d8200-1.bom (platform board parts: X1 3.58 = ML6431 genlock crystal, OSC2 24.576 MHz, LEDs)
   - …/d820x/altera/d8200_top.rpt (PIC_CLK = 24.576 MHz ÷ 4 = 6.144 MHz; corrected 2026|59, see d8205.js / d8200.js)
   - D8206 - #Master #MF82/…/D8206 - #ARCHIVE/D8208MAN.WPD (a "D8208" manual whose text is the D8205's)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- constants from the source ---------------- */
const PIC_F = 24.576e6/4, TCY = 4/PIC_F;             // d8200_top.rpt: PIC_CLK = TFF(!_LC099), _LC099 = TFF(input_clk) → OSC2 24.576 MHz ÷ 4 = 6.144 MHz on U1 OSC1 (d8200-2.net PIC_CLK: U1-9, U4-8). X1 3.58 is the ML6431's crystal (U7-11/12).
const PASS = 1.33e-3;         // INFERRED (as d8205.js): ≈78 SPI bytes + ≈500 Tcy at 6.144 MHz; cross-check: Hysterisis "about 4 second" = 256 conversions × 12 passes ≈ 4.1 s
const AD_PASSES = 3;          // AtoD: setup / start_AtoD / AtoD_results → 3 passes per conversion; 4 pots round-robin → each pot every 12 passes
const HYST_LOCK_N = 256;      // HSTRZ_CNT_NUM1 = 0x00, HSTRZ_CNT_NUM2 = 0x01 → 256 decrements
const OUT_DELAY = 0.1;        // AES_output_control "delayed switch_on of AES outputs" — length inferred
const LOCK_T = 0.02;          // CS8420 PLL acquire — inferred
const TRM = i=>Math.pow(10,(-15 + i*30/256)/20);     // D8205_trm.dat: [0]=0.17783 (−15 dB) … [255]=5.548 (+14.9 dB)
const VOL = i=>i*0.0155510613497;                     // D8205_vol.dat: linear, [255]=3.9655 (+11.97 dB)
const STEPS = [
  ['AtoD_data_preparing · AtoD', .16, 'One step of the 3-pass A/D; 4 pots round-robin (each every 12 passes); Average of 4, then Hysterisis'],
  ['Link_to_SHARC', .10, '16 nibbles: FRAME_CODE 0xE4, MODE1/MODE2, CODE1–4'],
  ['Link_to_ALTERA', .14, '4-byte SPI exchange (3 Altera regs + 1 SHARC mailbox byte)'],
  ['SHARC_link_control', .04, 'SHARC answered 0xE4? else time out'],
  ['jmp_input · debounce', .10, 'Read 14 jumpers via the Altera, read CS8420 reg 16 of both chips'],
  ['switch_8420_modes', .06, 'D8208: CH2 locked → MODE 6; unlocked → MODE 0 (internal 48 kHz)'],
  ['channel_status_proc', .14, 'Update channel-status blocks of CH1 and CH2'],
  ['LED_processing', .04, 'LED_0 = CH2 locked · LED_2 = internal mode · LED_3 = FLG_ERROR_CH2'],
  ['flush8420reg · AES_output_control', .22, 'Write all CS8420 regs; re-enable AES out after a mode change'],
];
const STEP_FRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
const FS_LIST = [22050, 32000, 44100, 48000, 88200, 96000];

/* ---------------- device state ---------------- */
const J0 = { j1:0, j2:0, j3:0, j4:0, j5:0, j6:0, j7:0, j8:0, j14:1 };
const D = {
  plugged:true, fs:48000, progA:-20, progB:-20,      // incoming program level dBFS (a −20 dBFS tone)
  j: Object.assign({}, J0),
  pot:[128,128,128,128],      // RV1, RV2 (10-turn, 5K MULTI), remote L, remote R — 8-bit A/D codes
  lossAt:null, backAt:null,
  log:[],
};
function reset(){ D.plugged=true; D.fs=48000; D.progA=-20; D.progB=-20; D.j=Object.assign({},J0); D.pot=[128,128,128,128]; D.lossAt=null; D.backAt=null; }
const JDOC = {
  j1:['OUT','0 = AUDIO','1 = test tone 1 kHz'], j2:['TESTTONE LVL','0 = −20 dBFS','1 = −18 dBFS'],
  j3:['CNTRL1','0 = stereo control','1 = mono control'], j4:['CNTRL0','0 = internal pots','1 = remote pots'],
  j5:['Word length','0 = 24 bit','1 = 20 bit'], j6:['LEVEL CNTRL','0 = trim −15…+15','1 = volume off…+12'],
  j7:['INPUT','0 = stereo','1 = mono (A+B)/2'], j8:['INPUT','0 = normal','1 = invert right'], j14:['JACK','0 = OUT1','1 = OUT2 (must be 1)'],
};

/* ---------------- time model ---------------- */
function inputAt(t){ if (!D.plugged) return false; if (D.lossAt!==null && t>=D.lossAt && (D.backAt===null||t<D.backAt)) return false; return D.fs>=22000 && D.fs<=96000; }
function rxLockAt(t){ if (!inputAt(t)) return false; const since=(D.backAt!==null&&t>=D.backAt)?t-D.backAt:t; return since>=LOCK_T; }
const passIdx = t=>Math.floor(t/PASS), pStart=i=>i*PASS;
function fwLockAt(t){ const i=passIdx(t); const rd=pStart(i)+STEP_FRAC[4]*PASS; const k = t>=rd? i : i-1; if (k<0) return false; return rxLockAt(pStart(k)+STEP_FRAC[4]*PASS); }
// AES output re-enable delay after a mode change (AES_output_control)
function modeAt(t){ return fwLockAt(t)? 6 : 0; }
function lastModeChange(t){ // scan back pass by pass (cheap enough: only near loss events)
  const i=passIdx(t); const m=modeAt(t); for (let k=i;k>=0 && k>i-200;k--){ if (modeAt(pStart(k)+STEP_FRAC[5]*PASS+1e-9)!==m) return pStart(k+1)+STEP_FRAC[5]*PASS; } return 0; }
function outEnabledAt(t){
  const m=modeAt(t);
  if (m===0 && !D.j.j1) return false;                    // shut_off_AES_output_CH2 unless AUD_TESTTONE
  return t - lastModeChange(t) >= OUT_DELAY || lastModeChange(t)===0;
}
function ledsAt(t){ const L=fwLockAt(t); const err = !rxLockAt(t) && D.plugged; return { audio:L, proc: modeAt(t)===0, err: err || !L, unused:false }; }

/* ---------------- gain path (sample_proc_D8208) ---------------- */
function codes(){ // the codes the PIC has settled on (hysteresis ignores ±1 once locked)
  return D.pot.slice();
}
function gains(){
  const c=codes(), remote=D.j.j4, vol=D.j.j6; let f8,f9,f10=1,f11=1;
  const tab = vol? VOL : TRM;
  if (!remote){ f8=tab(c[0]); f9=tab(c[1]); }
  else if (!vol){ f10=TRM(c[2]); f11=TRM(c[3]); f8=TRM(c[0]); f9=TRM(c[1]); }
  else { f10=VOL(c[2]); f11=VOL(c[3]); f8=TRM(c[0]); f9=TRM(c[1]); }   // case 3: remote = volume, internal pots = trim
  f8*=f10; f9*=f11;
  const stereoTie = !!D.j.j3;        // code: btst CNTRL_STEREO_MONO; if not sz f9 = pass f8 — jumper SET ties R to L
  if (stereoTie) f9=f8;
  return { f8, f9, case:(remote<<1)|vol, stereoTie };
}
const dB = g=> g<=0? -Infinity : 20*Math.log10(g);
function outLevels(t){
  const tone = !!D.j.j1, ttdB = D.j.j2? -18 : -20;
  if (tone) return { a:ttdB, b:ttdB, src:'test tone 1 kHz (formed_tone_sampl, level not pot-controlled)' };
  if (!rxLockAt(t)) return { a:-Infinity, b:-Infinity, src:'rx_buf_silence (CH2 unlocked)' };
  let a=D.progA, b=D.progB, la=Math.pow(10,a/20), lb=Math.pow(10,b/20);
  if (D.j.j8) lb=-lb;
  if (D.j.j7){ const m=(la+lb)/2; la=m; lb=m; }
  const g=gains(); la*=g.f8; lb*=g.f9;
  return { a:dB(Math.abs(la)), b:dB(Math.abs(lb)), src:'CH2 receiver → SHARC', inv:D.j.j8 };
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if (D.log.length>50) D.log.length=50; SIM.refresh(); }
const A = {
  jumper(k){ act(`Toggle ${k.toUpperCase()} (${JDOC[k][0]})`, tr=>{ D.j[k]^=1;
    tr(`jmp_input: FROM_ALTERA bit → input_reg${['j1','j2','j3','j4'].includes(k)?'1':'2'} · debounce compares with MODE1/MODE2, waits, then copies`);
    tr(`MODE_change_analize (D8208) only acts on W_24bit_20bit_XOR; every other jumper reaches the SHARC in the next Link_to_SHARC (MODE nibbles)`);
    tr(`SHARC jumpers_analize_D8208 / sample_proc_D8208: ${JDOC[k][0]} now ${D.j[k]? JDOC[k][2]: JDOC[k][1]}`);
    if (k==='j3') tr('Code: “btst r4 by D8208_JMP_CNTRL_STEREO_MONO; if not sz f9=pass f8” → with the jumper SET the right channel follows the LEFT pot (see Findings)');
    if (k==='j14' && !D.j.j14) tr('jumpers.txt: “JMP_14: Choose output for JACK: Should be =1 !!!” — the front jack now monitors OUT1 (CS8420 #2 route is OUT1=OUT2=CH2, so it still carries audio)'); }); },
  pot(i,v){ D.pot[i]=v; SIM.refresh(); },
  potLog(i){ act(`Turn ${['RV1 (CH A)','RV2 (CH B)','remote L','remote R'][i]} to code ${D.pot[i]}`, tr=>{
    tr(`AtoD_data_preparing: ANAL_PIN${i+1} converted every ${4*AD_PASSES} passes (3 per conversion × 4 pots, ≈${(4*AD_PASSES*PASS*1e3).toFixed(1)} ms ${'(inferred pass length)'})`);
    tr('Average: code = (new + 3 previous) / 4 → reaches the new value after 4 conversions');
    tr('Hysterisis: while unlocked the code follows; after 256 steady conversions (≈4 s) it locks and ignores ±1 count');
    const g=gains(); tr(`SHARC case ${g.case} (${['internal trim','internal volume','remote trim × internal trim','remote volume × internal trim'][g.case]}): f8 = ${dB(g.f8).toFixed(2)} dB, f9 = ${dB(g.f9).toFixed(2)} dB`); }); },
  plug(){ act(D.plugged?'Unplug AES input':'Plug in AES input', tr=>{ D.plugged=!D.plugged; D.lossAt=null; D.backAt=null;
    tr(D.plugged?'CS8420 #2 locks (PLL), reg 16 bit 4 clears':'CS8420 #2 reg 16 bit 4 (UNLOCK) set');
    tr('switch_8420_modes (D8208): CH2_8420_LOCKED? yes → set_MODE_6 · no → shut_off_AES_output_CH2 (unless AUD_TESTTONE), set_MODE_0 internal 48 kHz');
    tr('SHARC jumpers_analize_D8208: unlocked → I_REG_fix_din_CH2 = rx_buf_silence'); }); },
  loss(){ act('Drop the input for 300 ms at the playhead', tr=>{ D.plugged=true; D.lossAt=SIM.t; D.backAt=Math.min(1,SIM.t+0.3);
    tr('Next jmp_input: CH2 unlocked → UNLOCKED_MODE, MODE 0, LED_2 (internal) on, LED_0 off');
    tr(D.j.j1? 'AUD_TESTTONE set: output stays on, now clocked from internal 48 kHz' : 'shut_off_AES_output_CH2: outputs silent');
    tr(`On return: swm → MODE_change_analize, set_MODE_6 → AES_output_control re-enables after a delay (${OUT_DELAY*1e3} ms ${'inferred'})`); }); },
  fs(v){ act('Upstream fs '+v/1000+' kHz', tr=>{ D.fs=v; tr(`Functional description: accepts 22–96 kHz. ${inputAt(SIM.t)?'Locks.':'Out of range.'}`); }); },
  prog(v){ D.progA=v; D.progB=v; SIM.refresh(); },
  reset(){ act('Factory defaults', tr=>{ reset(); tr('All jumpers 0 except JMP_14 = 1; pots centred (code 128 = ' + dB(TRM(128)).toFixed(2) + ' dB trim)'); }); },
};

/* ---------------- drawings ---------------- */
function frontSVG(t){
  const L=ledsAt(t), W=100, FH=275, o=outLevels(t);
  const led=(i,on,col,lbl)=>`<g><title>${lbl}</title><circle cx="70" cy="${40+i*16}" r="4.8" fill="#0a0b0b"/><circle cx="70" cy="${40+i*16}" r="3.6" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#d8g)"':''}/><text x="${W+34}" y="${44+i*16}" font-size="11" fill="var(--ink)">${lbl}</text><line x1="76" y1="${40+i*16}" x2="${W+30}" y2="${40+i*16}" stroke="var(--ink2)" stroke-width=".5"/></g>`;
  const pot=(i,y,lbl)=>{ const a=-135+270*D.pot[i]/255; return `<g class="d8pot" data-i="${i}" style="cursor:ns-resize"><title>${lbl}: drag or scroll (code ${D.pot[i]})</title><rect x="56" y="${y-9}" width="28" height="18" rx="2" fill="#2a4fa0" stroke="#173070"/><circle cx="70" cy="${y}" r="6" fill="#dfe3ea"/><line x1="70" y1="${y}" x2="${70+5*Math.cos((a-90)*Math.PI/180)}" y2="${y+5*Math.sin((a-90)*Math.PI/180)}" stroke="#000" stroke-width="1.6"/><text x="${W+34}" y="${y+4}" font-size="11" fill="var(--ink)">${lbl} · ${D.pot[i]}</text><line x1="86" y1="${y}" x2="${W+30}" y2="${y}" stroke="var(--ink2)" stroke-width=".5"/></g>`; };
  return `<svg viewBox="0 0 ${W+200} ${FH+60}" style="width:100%;max-width:300px"><defs><filter id="d8g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="20" y="24" width="${W}" height="${FH}" rx="3" fill="#1b5e33" stroke="#0e3a1f"/>
    ${led(0,L.audio,'var(--led-g)','AUDIO (LED_0, CH2 lock)')}${led(1,false,'var(--led-g)','LED_1 (unused on D8208)')}${led(2,L.proc,'#ffd84a','PROC (LED_2, internal mode)')}${led(3,L.err,'#ff4a3a','ERR (LED_3)')}
    ${pot(0,130,'RV1 CH A')}${pot(1,165,'RV2 CH B')}
    <g><title>MONITOR TRS jack (110 Ω, ABB-1 Audio Bit Buddy)</title><circle cx="70" cy="215" r="10" fill="#111" stroke="#777"/><circle cx="70" cy="215" r="4" fill="#000"/><text x="${W+34}" y="219" font-size="11" fill="var(--ink)">MONITOR (TRS) → OUT${D.j.j14?2:1}</text></g>
    <rect x="42" y="235" width="56" height="58" rx="6" fill="#c9c9c2" stroke="#888"/><text x="70" y="264" font-size="11" text-anchor="middle" fill="#222" transform="rotate(90 70 264)">D8208</text>
    <text x="4" y="${FH+42}" font-size="10" fill="var(--ink2)">Front edge drawn to the D8204 outline (pin-compatible).</text><text x="4" y="${FH+56}" font-size="10" fill="var(--ink2)">LED / pot / jack order ${'inferred'} from the BOM and description.</text></svg>`;
}
const BNC1 = [['INPUT',6850,4525],['1',7290,4065],['2',6850,3605],['3',7290,3145],['4',6850,2685],['5',7290,2225],['6',6850,1765]];
function rearSVG(t){
  const on=outEnabledAt(t)&&(rxLockAt(t)||D.j.j1), S=0.07; const xs=BNC1.map(b=>b[1]), ys=BNC1.map(b=>b[2]); const x0=Math.min(...xs)-450, y1=Math.max(...ys)+450, y0=Math.min(...ys)-450, x1=Math.max(...xs)+450;
  const X=v=>20+(v-x0)*S, Y=v=>20+(y1-v)*S, W=(x1-x0)*S, H=(y1-y0)*S;
  let s=`<svg viewBox="0 0 ${W+190} ${H+40}" style="width:100%;max-width:300px"><rect x="20" y="20" width="${W}" height="${H}" rx="4" fill="#26292c" stroke="#111"/>`;
  BNC1.forEach(([n,x,y])=>{ const isIn=n==='INPUT'; const col=isIn?(D.plugged?'var(--accent2)':'#555'):on?'var(--led-g)':'#555';
    s+=`<g class="${isIn?'d8in':''}" style="cursor:${isIn?'pointer':'default'}"><title>${isIn?'AES INPUT — click to plug/unplug':'AES OUT '+n}</title><circle cx="${X(x)}" cy="${Y(y)}" r="15" fill="#b9bcbf" stroke="#666"/><circle cx="${X(x)}" cy="${Y(y)}" r="9" fill="#1a1a1a"/><circle cx="${X(x)}" cy="${Y(y)}" r="3" fill="${col}"/>${isIn&&D.plugged?`<rect x="${X(x)-6}" y="${Y(y)-30}" width="12" height="16" fill="#333"/>`:''}<text x="${X(x)}" y="${Y(y)+27}" font-size="8.5" text-anchor="middle" fill="#ddd">${isIn?'IN':'OUT '+n}</text></g>`; });
  return s+`<text x="${W+30}" y="40" font-size="12" font-weight="700" fill="var(--ink)">BNC1 (D8204 module)</text><text x="${W+30}" y="58" font-size="10" fill="var(--ink2)">“pin for pin compatible</text><text x="${W+30}" y="72" font-size="10" fill="var(--ink2)">with the D8204”</text><text x="${W+30}" y="94" font-size="10" fill="var(--ink2)">BNC3 gives 8 outs in MF82/10</text><text x="${W+30}" y="110" font-size="10" fill="var(--ink2)">positions: BNC-XX.PCB</text></svg>`;
}
function jumperHTML(){
  return `<div class="small" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 8px">${Object.keys(JDOC).map(k=>`<button class="d8j ${D.j[k]?'on':''}" data-k="${k}" title="${JDOC[k][1]} / ${JDOC[k][2]}" style="text-align:left;font-size:11.5px">${k.toUpperCase().replace('J','JMP_')} ${JDOC[k][0]}: <b>${D.j[k]?JDOC[k][2]:JDOC[k][1]}</b></button>`).join('')}</div>`;
}
function bindPanel(m){
  m.querySelectorAll('.d8in').forEach(g=>g.onclick=()=>A.plug());
  m.querySelectorAll('.d8j').forEach(b=>b.onclick=()=>A.jumper(b.dataset.k));
  m.querySelectorAll('.d8pot').forEach(g=>{ const i=+g.dataset.i;
    g.onwheel=e=>{ e.preventDefault(); D.pot[i]=Math.max(0,Math.min(255,D.pot[i]+(e.deltaY<0?4:-4))); SIM.refresh(); };
    g.onclick=e=>{ D.pot[i]=Math.min(255,D.pot[i]+16); A.potLog(i); }; });
}
function controlsHTML(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
   <label>RV1 <input type="range" id="p0" min="0" max="255" value="${D.pot[0]}"></label><label>RV2 <input type="range" id="p1" min="0" max="255" value="${D.pot[1]}"></label>
   <label>Remote L <input type="range" id="p2" min="0" max="255" value="${D.pot[2]}"></label><label>Remote R <input type="range" id="p3" min="0" max="255" value="${D.pot[3]}"></label>
   <label>Program in <input type="range" id="pg" min="-40" max="0" value="${D.progA}"> <span id="pgv" class="mono"></span></label>
   <label>fs <select id="fs">${FS_LIST.map(f=>`<option value="${f}" ${f===D.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
   <button id="ls">Drop input 300 ms here</button><button id="rs">Factory defaults</button></div>`;
}
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#p0')) return;
  [0,1,2,3].forEach(i=>{ const el=q('#p'+i); el.oninput=e=>A.pot(i,+e.target.value); el.onchange=()=>A.potLog(i); });
  const u=()=>q('#pgv').textContent=D.progA+' dBFS'; u(); q('#pg').oninput=e=>{A.prog(+e.target.value); u();};
  q('#fs').onchange=e=>A.fs(+e.target.value); q('#ls').onclick=()=>A.loss(); q('#rs').onclick=()=>A.reset(); }

/* ---------------- lanes ---------------- */
function stateBar(c,X,t0,t1,y,h,f,onC,offC,onL,offL){ const N=300; let prev=null,xs=X(t0); for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, v=f(t); if(prev===null){prev=v;continue;} if(v!==prev||i===N){ const xe=X(t); c.fillStyle=prev?onC:offC; c.globalAlpha=.55; c.fillRect(xs,y+4,xe-xs,h-8); c.globalAlpha=1; if(xe-xs>70){c.fillStyle=SIM.css('--ink');c.font='10px sans-serif';c.fillText(prev?onL:offL,xs+4,y+h/2+3);} xs=xe; prev=v; } } }
function lanes(){ const css=SIM.css; return [
  {label:`AES frames in (${D.fs/1000} kHz)`, h:24, draw(c,X,t0,t1,y,h){ if(D.lossAt!==null){c.fillStyle=css('--bad');c.globalAlpha=.25;c.fillRect(X(D.lossAt),y,X(D.backAt)-X(D.lossAt),h);c.globalAlpha=1;} if(!D.plugged){c.fillStyle=css('--bad');c.font='11px sans-serif';c.fillText('no input',X(t0)+6,y+h/2+4);return;} SIM.pulses(c,X,t0,t1,y,h,1/D.fs,0,0.5/D.fs,css('--accent2'),'frames'); }},
  {label:'SHARC sample_proc_D8208', h:22, draw(c,X,t0,t1,y,h){ const fs=rxLockAt((t0+t1)/2)?D.fs:48000; SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.2/fs,css('--accent'),'samples (gain ×, invert, mono)'); }},
  {label:'PIC16C73A main loop', h:32, draw(c,X,t0,t1,y,h){ const px=X(t0+PASS)-X(t0); const i0=passIdx(t0), i1=passIdx(t1);
    if (px<3){ c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+8,X(t1)-X(t0),h-16); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px monospace'; c.fillText(`${i1-i0+1} passes × ${SIM.fmtDur(PASS)} (inferred: 6.144 MHz PIC_CLK, checked against the 4 s hysteresis comment)`,X(t0)+6,y+h/2+4); return; }
    for (let i=i0;i<=i1;i++) STEPS.forEach((s,j)=>{ const a=pStart(i)+STEP_FRAC[j]*PASS, b=a+s[1]*PASS; c.fillStyle=j%2?css('--accent2'):css('--accent'); c.globalAlpha=.7; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-.5),h-6); c.globalAlpha=1; if(X(b)-X(a)>90){c.fillStyle='#fff';c.font='10px sans-serif';c.fillText(s[0].split(' · ')[0],X(a)+3,y+h/2+3);} }); }},
  {label:'A/D channel (round robin)', h:22, draw(c,X,t0,t1,y,h){ const px=X(t0+PASS)-X(t0); if(px<8){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('RV1 → RV2 → remote L → remote R, one conversion per 3 passes',X(t0)+6,y+h/2+4); return; } for(let i=passIdx(t0);i<=passIdx(t1);i++){ const ch=Math.floor(i/AD_PASSES)%4; c.fillStyle=[css('--accent'),css('--accent2'),css('--warn'),css('--bad')][ch]; c.globalAlpha=.5; c.fillRect(X(pStart(i)),y+4,X(pStart(i)+PASS*0.16)-X(pStart(i)),h-8); c.globalAlpha=1; if(px>40){c.fillStyle=css('--ink');c.font='10px sans-serif';c.fillText(['RV1','RV2','RemL','RemR'][ch]+' '+['setup','start','result'][i%AD_PASSES],X(pStart(i))+2,y+h/2+3);} } }},
  {label:'CS8420 #2 lock (input)', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,rxLockAt,css('--accent'),css('--bad'),'locked','UNLOCK'); }},
  {label:'Mode (real_mode)', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>modeAt(t)===6,css('--accent2'),css('--warn'),'MODE 6 (audio)','MODE 0 internal 48 k'); }},
  {label:'AES outputs enabled', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>outEnabledAt(t)&&(rxLockAt(t)||!!D.j.j1),css('--accent'),css('--ink2'),'outputs on','shut_off_AES_output_CH2 / delay'); }},
];}

/* ---------------- views ---------------- */
function meter(db){ const w=Math.max(0,Math.min(1,(db+60)/60)); return `<span style="display:inline-block;width:160px;height:10px;background:var(--chip);border:1px solid var(--line);vertical-align:middle"><span style="display:block;height:100%;width:${(w*100).toFixed(1)}%;background:${db>-0.01?'var(--bad)':db>-10?'var(--warn)':'var(--accent)'}"></span></span> <span class="mono">${isFinite(db)?db.toFixed(2):'−∞'} dBFS${db>0?' CLIP':''}</span>`; }
function inspector(t){ const g=gains(), o=outLevels(t), L=ledsAt(t);
  return `<table class="kv"><tr><th>Input</th><td class="mono">${D.plugged?D.fs/1000+' kHz':'none'} · CS8420 #2 ${rxLockAt(t)?'locked':'UNLOCK'} · program ${D.progA} dBFS</td></tr>
   <tr><th>PIC pass</th><td class="mono">#${passIdx(t)} · ${STEPS[Math.max(0,STEP_FRAC.filter(f=>f<=(t%PASS)/PASS).length-1)][0]}</td></tr>
   <tr><th>Pot codes</th><td class="mono">CODE1 ${D.pot[0]} · CODE2 ${D.pot[1]} · CODE3 ${D.pot[2]} · CODE4 ${D.pot[3]}</td></tr>
   <tr><th>SHARC case</th><td class="mono">${g.case}: ${['remote off, trim','remote off, volume','remote on, trim (remote × internal)','remote on, volume (remote vol × internal trim)'][g.case]}</td></tr>
   <tr><th>Gain A / B</th><td class="mono">${dB(g.f8).toFixed(2)} dB / ${dB(g.f9).toFixed(2)} dB${g.stereoTie?' (B tied to A)':''}</td></tr>
   <tr><th>Out A</th><td>${meter(o.a)}</td></tr><tr><th>Out B</th><td>${meter(o.b)}${o.inv?' <span class="mono">(inverted)</span>':''}</td></tr>
   <tr><th>Source</th><td class="small">${o.src}</td></tr>
   <tr><th>LEDs</th><td class="mono">AUDIO ${L.audio?'●':'○'} · PROC ${L.proc?'●':'○'} · ERR ${L.err?'●':'○'}</td></tr></table>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Turn a pot (drag the sliders or click/scroll the blue trimmers), flip a jumper, or unplug the input.</div>'; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Card front edge and rear module', `<div style="display:flex;gap:10px;flex-wrap:wrap"><div id="fp" style="flex:0 0 260px"></div><div id="rp" style="flex:1;min-width:220px"></div></div>${controlsHTML()}`)}${card('Jumpers (jumpers.txt, D8208, CS=8434) — click to toggle', `<div id="jp"></div>`)}</div>
   <div>${card('What the firmware did', `<div id="tr" class="log"></div>`)}${card('State at the playhead', `<div id="in"></div>`)}</div></div>
   ${card('Timeline — one second', `<canvas id="tl"></canvas><p class="small muted">The D8208 has no code of its own: this is the D820x platform firmware with <span class="mono">#define D8208</span>. PIC clock PIC_CLK = 24.576 MHz ÷ 4 = 6.144 MHz from the CPLD (d8200_top.rpt; ${(TCY*1e6).toFixed(3)} µs per instruction). The loop length ≈ ${SIM.fmtDur(PASS)} is ${inf} from that clock and the SPI byte count; it checks out against <span class="mono">Hysterisis</span> (“about 4 second”): 256 steady conversions of a pot read every 12 passes ≈ ${(256*12*PASS).toFixed(1)} s.</p>`)}
   ${card('Action log', `<div id="lg" class="log"></div>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); m.querySelector('#jp').innerHTML=jumperHTML(); bindPanel(m);
    m.querySelector('#tr').innerHTML=traceHTML(); m.querySelector('#in').innerHTML=inspector(t);
    m.querySelector('#lg').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:180}); });
}
let lesson=0;
const LESSONS=[
  {title:'Meet the D8208', body:`<p>A 1-in, 8-out AES DA with <b>gain control</b>, pin-for-pin compatible with the D8204. It re-clocks the input and lets you set the level “in a familiar analog fashion” with two 10-turn PCB pots (CH A, CH B) or external pots.</p>`, check:()=>true, auto:true},
  {title:'1 · Trim the level', body:`<p>With the jumpers at their defaults the pots are <b>trims</b>: −15 to +15 dB (centre ≈ 0 dB). A plant at −20 dBFS that receives a feed at −14 dBFS needs about −6 dB.</p><p><b>Goal:</b> bring channel A to −20 dBFS ±0.5 with the program at −14 dBFS.</p>`, check:()=>{ const o=outLevels(0.5); return D.progA===-14 && Math.abs(o.a+20)<=0.5; }, hint:'Set “Program in” to −14, then lower RV1 to about code 77.'},
  {title:'2 · One knob for both', body:`<p>JMP_3 (CNTRL1) chooses stereo control (one pot moves both channels) or mono control (one pot each). Flip it and see which pot now drives channel B.</p><p><b>Goal:</b> set JMP_3 so B follows RV1.</p>`, check:()=>gains().stereoTie, hint:'Click JMP_3. Note the code ties B to A when the jumper is SET — the opposite of jumpers.txt.'},
  {title:'3 · Volume mode and remote pots', body:`<p>JMP_6 turns the pots into a <b>volume</b> control (off … +12 dB, linear table). JMP_4 brings in remote pots. With both, the remote pots are the volume and the PCB pots stay as trims (jumpers.txt table).</p><p><b>Goal:</b> remote on, volume mode.</p>`, check:()=>D.j.j4&&D.j.j6, hint:'Click JMP_4 and JMP_6.'},
  {title:'4 · Fix a phase error, or sum to mono', body:`<p>JMP_8 inverts channel B; JMP_7 sums A and B ((A+B)/2) into both outputs.</p><p><b>Goal:</b> invert B.</p>`, check:()=>!!D.j.j8, hint:'Click JMP_8.'},
  {title:'5 · Line-up tone', body:`<p>JMP_1 replaces the input with an internal 1 kHz tone; JMP_2 picks −20 or −18 dBFS. The pots don't affect it.</p><p><b>Goal:</b> −18 dBFS tone.</p>`, check:()=>D.j.j1&&D.j.j2, hint:'JMP_1 and JMP_2.'},
  {title:'6 · Lose the input', body:`<p>Turn the tone off (JMP_1), then press “Drop input”. The firmware switches to internal mode (yellow PROC), mutes the outputs, and after relock waits before switching them on again.</p><p><b>Goal:</b> record a dropout with the tone off.</p>`, check:()=>D.lossAt!==null&&!D.j.j1, hint:'JMP_1 off, then “Drop input 300 ms here”.'},
  {title:'Done', body:`<p>See <b>Software</b> for the PIC↔SHARC path and <b>Findings</b> for the jumper and validity-bit surprises.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — setting up a D8208 (from the functional description and jumpers.txt)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div>${card('State', `<div id="in"></div>`)}</div>
   <div>${card('The card', `<div style="display:flex;gap:10px;flex-wrap:wrap"><div id="fp" style="flex:0 0 260px"></div><div id="rp" style="flex:1;min-width:200px"></div></div>${controlsHTML()}<div id="jp" style="margin-top:8px"></div>`)}${card('What the firmware did', `<div id="tr" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); m.querySelector('#jp').innerHTML=jumperHTML(); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML(); m.querySelector('#in').innerHTML=inspector(Math.max(t,0.5));
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i;draw();});
    const L=LESSONS[lesson], ok=L.check(); m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#r0').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time',draw);
}
function viewSecond(m){
  const passes=Math.floor(1/PASS);
  m.innerHTML=`<div class="grid3">${card('Audio', `<table class="kv"><tr><th>Frames</th><td class="mono">${D.fs.toLocaleString()}</td></tr><tr><th>sample_proc_D8208 calls</th><td class="mono">${D.fs.toLocaleString()} (2 multiplies each)</td></tr><tr><th>Outputs</th><td class="mono">8 copies from CS8420 #2</td></tr></table>`)}
   ${card('PIC', `<table class="kv"><tr><th>Passes</th><td class="mono">≈${passes} × ${SIM.fmtDur(PASS)} ${inf}</td></tr><tr><th>A/D conversions</th><td class="mono">≈${(passes/AD_PASSES).toFixed(0)} (≈${(passes/(4*AD_PASSES)).toFixed(0)} per pot)</td></tr><tr><th>Messages to SHARC</th><td class="mono">≈${passes} × 16 nibbles</td></tr><tr><th>Hysteresis lock</th><td class="mono">256 steady readings ≈ ${(256*4*AD_PASSES*PASS).toFixed(1)} s</td></tr></table>`)}
   ${card('Pot → gain', `<table class="kv"><tr><th>Trim step</th><td class="mono">30 dB / 256 = 0.117 dB per code</td></tr><tr><th>Volume step</th><td class="mono">linear 0.01555 per code</td></tr><tr><th>Pot settle</th><td class="mono">4-sample average ≈ ${(16*AD_PASSES*PASS*1e3).toFixed(0)} ms</td></tr></table>`)}</div>
   ${card('Pot response at the playhead: code after Average + Hysterisis for a step from 128 → 200 at t = 0.2 s', `<canvas id="pr"></canvas>`)}`;
  SIM.on('time',()=>{ const cv=m.querySelector('#pr'); SIM.drawLanes(cv,[{label:'RV1 code (simulated)',h:90,draw(c,X,t0,t1,y,h){ // simulate per-pass averaging for channel 0
      let hist=[128,128,128,128], code=128, stor=128, cnt=0, lock=false; c.strokeStyle=SIM.css('--accent'); c.beginPath(); let first=true;
      for (let i=0;i<=passIdx(1);i++){ if(i%(4*AD_PASSES)!==0) continue; const t=pStart(i), raw=t>=0.2?200:128; hist=[raw,hist[0],hist[1],hist[2]]; const av=Math.floor((hist[0]+hist[1]+hist[2]+hist[3])/4);
        if (lock){ if (Math.abs(av-stor)>1){ lock=false; stor=av; cnt=0; code=av; } else code=stor; } else { if (av===stor){ cnt++; if(cnt>=HYST_LOCK_N) lock=true; } else { stor=av; cnt=0; } code=av; }
        const yy=y+h-4-(code-100)/120*(h-8); if (first){c.moveTo(X(t),yy); first=false;} else c.lineTo(X(t),yy); }
      c.stroke(); }}],{labelW:150}); });
}
const BLOCKS={
  in:{x:10,y:130,w:120,h:60,t:'Rear BNC1/BNC3',s:['AES in','8 outs'],d:'D8204-compatible rear module.'},
  rx:{x:160,y:130,w:140,h:76,t:'CS8420 #2 (U6)',s:['receiver','“First input” = CH2'],d:'AUD_OUTPUT_ROUTE B\'01110000\': OUT1 = CS8420 #2, OUT2 = CS8420 #2. The D8208 uses only the second CS8420 (TWO_C8420_ONBOARD_EXIST not defined).'},
  cpld:{x:330,y:130,w:140,h:76,t:'EPM7128S',s:['routes SPORTs','jumper reader','SPI to PIC'],d:'MAX7000S CPLD: routes CS8420 serial ports to the SHARC SPORTs and back, and passes the 14 jumpers and SHARC mailbox to the PIC in a 4-byte exchange.'},
  dsp:{x:500,y:130,w:150,h:76,t:'ADSP-21061',s:['sample_proc_D8208','gain, invert, mono, tone'],d:'Float processing per sample: f2/f3 from rx_buf_CH2 (or silence), invert R, mono sum, ×f8/f9 gain from trim/volume tables, or the 1 kHz test tone.'},
  tx:{x:680,y:130,w:130,h:76,t:'CS8420 #2 TX',s:['→ EL2280C ×2','→ 8 outputs + jack'],d:'Re-transmitted AES feeds the output drivers and the TRS MONITOR jack.'},
  pic:{x:330,y:10,w:140,h:76,t:'PIC16C73A',s:['6.144 MHz (PIC_CLK)','A/D 4 pots','LEDs, CS8420 SPI'],d:'Main loop: A/D, link to SHARC via the Altera, jumpers, CS8420 modes, LEDs.'},
  pots:{x:160,y:10,w:140,h:76,t:'Pots',s:['RV1, RV2 5K multi','remote L/R (P1)'],d:'Four analog inputs AN (ANAL_PIN1..4). 8-bit codes.'},
  led:{x:500,y:10,w:150,h:76,t:'Front edge',s:['AUDIO, PROC, ERR','MONITOR TRS'],d:'LED_0 lock, LED_2 internal mode, LED_3 error (FLG_ERROR_CH2, cleared each pass).'},
  osc:{x:680,y:10,w:130,h:60,t:'OSC2 24.576 MHz',s:['= 512 × 48 kHz'],d:'Audio master for internal 48 kHz mode (MODE 0). The CPLD also divides it by 4 for the PIC (PIC_CLK 6.144 MHz).'},
};
const WIRES=[['in','rx','AES'],['rx','cpld','I²S'],['cpld','dsp','SPORT'],['dsp','cpld',''],['cpld','tx',''],['pots','pic','AN0–3'],['pic','cpld','SPI 4 B'],['pic','led',''],['osc','cpld','']];
function blockSVG(sel){ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 830 230" style="width:100%"><defs><marker id="d8a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b,l],k)=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const off=(a==='dsp'&&b==='cpld')?14:(a==='cpld'&&b==='dsp')?-14:0; y1+=off; y2+=off; const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y,k2=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9);return[x+dx*k2,y+dy*k2];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#d8a)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
  for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
  return s+'</svg>'; }
function viewBlock(m){ let sel='dsp'; m.innerHTML=`<div class="grid2">${card('Block diagram — D820x platform as a D8208 (click a block)', `<div id="bd"></div>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('Signal flow', `<p>Input → CS8420 #2 → Altera → SHARC (gain) → Altera → CS8420 #2 transmitter → eight outputs. The PIC never handles audio: it reads pots and jumpers and hands them to the SHARC every pass.</p>`)}</div></div>`;
  const draw=()=>{ m.querySelector('#bd').innerHTML=blockSVG(sel); m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b;draw();}); const b=BLOCKS[sel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; }; draw(); }
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length),h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n_],i)=>{const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p}</text>${n_?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${n_}</text>`:''}`;});
  right.forEach(([p,n_],i)=>{const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p}</text>${n_?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${n_}</text>`:''}`;}); return s; }
const SHEETS=[
  {name:'1 · PIC16C73A', note:'Pin functions from d820x.h (ANAL_PIN1..4 = AN0, AN1, AN2, AN4 ADCON0 codes) and d8200-1.bom. Exact pin numbers are not traced here.', svg:()=>chip(330,50,190,'U1 PIC16C73A',[['AN1 (B\'00001000\')','RV1 internal L'],['AN0 (B\'00000000\')','RV2 internal R'],['AN2 (B\'00010000\')','remote L (P1)'],['AN4 (B\'00100000\')','remote R (P1)'],['OSC1','PIC_CLK 6.144 MHz ← U4-8']],[['SPI','EPM7128S link'],['SPI','CS8420 #1, #2'],['LED_0..3','AUDIO1/2, PROC, ERR'],['MCLR','power-on']],'__CONFIG _WDT_ON _BODEN_ON _PWRTE_ON _HS_OSC')},
  {name:'2 · DSP and logic', note:'Parts from d8200-1.bom: U3 ADSP21061, U4 EPM7128 TQFP, U2 27C512 boot EPROM, OSC2 24.576 MHz.', svg:()=>chip(120,60,170,'U4 EPM7128S',[['SPORT0/1','SHARC'],['SDIN/SDOUT','CS8420 U5, U6'],['JMP 1–14','H1–H14']],[['PIC link','4 bytes'],['FSYNC','frame'],['CLK','OSC2']],'d8200_top.gdf')+chip(520,60,170,'U3 ADSP-21061',[['SPORT','from/to U4'],['BMS','U2 27C512']],[['FLAG','—']],'d820xcore.asm')},
  {name:'3 · Receivers and outputs', note:'U5/U6 CS8420, U8/U12 EL2280C drivers, U9–U11 75176 (RS-485) transceivers, T1–T10 PE65612 transformers, R24… 75/110R build options (BOM).', svg:()=>chip(140,60,160,'U6 CS8420 (#2)',[['RXP/RXN','AES IN (T)'],['CS/CCLK','PIC SPI']],[['TXP/TXN','→ EL2280C U8/U12'],['SDOUT','→ U4']],'D8208 input + output')+`<text x="420" y="90" font-size="11" fill="var(--ink)">EL2280C ×2 → 8 × (75R / 110R build) → P1 → BNC1/BNC3</text><text x="420" y="110" font-size="11" fill="var(--ink)">TRS MONITOR jack: 110 Ω transformer output (JMP_14 picks OUT1/OUT2)</text>`},
];
function viewSchem(m){ let i=0; m.innerHTML=card('Schematic set — D820x platform board (redrawn from BOM and firmware names, not the CAD)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">The original ACCEL schematics are <span class="mono">D8200 - #Engineering #MF82/d8200 - #PCB/d8200-1.sch</span> and <span class="mono">d8200-2.sch</span> (BOM titled “D8205”). No D8208-specific schematic exists.</p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();}); m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 360" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><text x="840" y="350" text-anchor="end" font-size="10" fill="var(--ink2)">D8208 / D820x · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`; m.querySelector('#sn').textContent=SHEETS[i].note; }; draw(); }
function viewSoft(m){
  m.innerHTML=`<div class="grid2">${card('PIC main loop (d820x.asm, #define D8208) — lit box runs at the playhead', `<div id="fl"></div>`)}<div>${card('SHARC D8208_main (d820xcore.asm)', `<div id="sh"></div>`)}${card('switch_8420_modes for D8208', `<div id="fsm"></div>`)}</div></div>
   ${card('Gain tables (live)', `<canvas id="gt"></canvas><p class="small muted">Trim table D8205_trm.dat: logarithmic, −15 … +14.9 dB. Volume table D8205_vol.dat: <b>linear</b> 0 … 3.97 (+12 dB) — jumpers.txt asks for logarithmic pots in volume mode to make up for it.</p>`)}`;
  SIM.on('time',()=>{ const t=SIM.t, k=STEP_FRAC.filter(f=>f<=(t%PASS)/PASS).length-1;
    let s=`<svg viewBox="0 0 520 ${STEPS.length*40+50}" style="width:100%">`; STEPS.forEach((p,j)=>{ const y=10+j*40, on=j===k; s+=`<rect x="20" y="${y}" width="480" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="30" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="30" y="${y+27}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${p[2]}</text>`; }); s+=`<text x="20" y="${STEPS.length*40+30}" font-size="11" fill="var(--ink2)">pass #${passIdx(t)} · clrwdt at the top and middle · ${SIM.fmtDur(PASS)} ${'(inferred)'}</text></svg>`;
    m.querySelector('#fl').innerHTML=s;
    const g=gains(), tone=!!D.j.j1;
    const box=(x,y,txt,on)=>`<rect x="${x}" y="${y}" width="150" height="30" rx="5" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+75}" y="${y+19}" text-anchor="middle" font-size="10.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${txt}</text>`;
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 520 210" style="width:100%">${box(10,10,'wait sampl_gn ≥ 2',false)}${box(180,10,'jumpers_analize_D8208',false)}${box(350,10,'form_testtone_sampl',tone)}${box(10,70,tone?'TESTTONE → skip':'load rx_buf_CH2',true)}${box(180,70,'invert R',!!D.j.j8&&!tone)}${box(350,70,'mono (A+B)·0.5',!!D.j.j7&&!tone)}${box(10,130,'case '+g.case+' tables',!tone)}${box(180,130,g.stereoTie?'f9 = f8 (tied)':'f9 own',!tone)}${box(350,130,'fix & store',true)}<text x="10" y="195" font-size="10.5" fill="var(--ink2)">Product ID 0x08 arrives in the PIC frame → D8208_beg; gains ${dB(g.f8).toFixed(1)} / ${dB(g.f9).toFixed(1)} dB</text></svg>`;
    const L=fwLockAt(t);
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 460 140" style="width:100%"><circle cx="100" cy="70" r="46" fill="${L?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="100" y="66" text-anchor="middle" font-size="12" font-weight="700" fill="${L?'#fff':'var(--ink)'}">MODE 6</text><text x="100" y="84" text-anchor="middle" font-size="10" fill="${L?'#fff':'var(--ink2)'}">audio, LED_0</text><circle cx="360" cy="70" r="46" fill="${!L?'var(--warn)':'var(--panel2)'}" stroke="var(--line)"/><text x="360" y="66" text-anchor="middle" font-size="12" font-weight="700" fill="${!L?'#fff':'var(--ink)'}">MODE 0</text><text x="360" y="84" text-anchor="middle" font-size="10" fill="${!L?'#fff':'var(--ink2)'}">int. 48k, LED_2</text><path d="M146 58 Q230 20 314 58" fill="none" stroke="var(--ink2)"/><text x="230" y="28" text-anchor="middle" font-size="10" fill="var(--ink2)">CH2 unlocked: shut_off_AES_output_CH2 (unless tone)</text><path d="M314 84 Q230 125 146 84" fill="none" stroke="var(--ink2)"/><text x="230" y="130" text-anchor="middle" font-size="10" fill="var(--ink2)">locked: MODE_change_analize, set_MODE_6</text></svg>`;
    const cv=m.querySelector('#gt'); const {c,w,h}=SIM.canvas(cv,160); c.strokeStyle=SIM.css('--line'); c.strokeRect(40,10,w-50,h-30); const Y=d=>10+(15-d)/35*(h-30);
    [[TRM,SIM.css('--accent'),'trim'],[VOL,SIM.css('--warn'),'volume']].forEach(([f,col,l],k)=>{ c.strokeStyle=col; c.beginPath(); for(let i=1;i<256;i++){ const x=40+i/255*(w-50), y=Y(Math.max(-20,dB(f(i)))); i===1?c.moveTo(x,y):c.lineTo(x,y);} c.stroke(); c.fillStyle=col; c.fillText(l,w-60,22+k*14); });
    c.fillStyle=SIM.css('--ink2'); c.font='10px monospace'; [15,0,-15].forEach(d=>c.fillText(d+' dB',2,Y(d)+3)); const x=40+D.pot[0]/255*(w-50); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(x,10); c.lineTo(x,h-20); c.stroke(); c.fillText('RV1 code '+D.pot[0],x+4,h-22);
  });
}
function viewNotes(m){
  m.innerHTML=card('What the D8208 is up to — findings', `<ol>
   <li><b>No D8208 code folder, but the code is there.</b> The D8208 folder holds only a 2000|33 functional description. Its firmware is the D820x tree with <span class="mono">#define D8208</span>: <span class="mono">d820x.h</span>, <span class="mono">d820x.asm</span> (init_modes, switch_8420_modes, LED_processing), <span class="mono">d820xswr.asm</span> and the SHARC's <span class="mono">D8208_beg</span>. No build folder ever had D8208 active (the working copy is D8207).</li>
   <li><b>Stereo/mono control looks inverted.</b> jumpers.txt: “JMP_3 CNTRL1: 0 = stereo control / 1 = mono control”. <span class="mono">sample_proc_D8208</span>: <span class="mono">btst r4 by D8208_JMP_CNTRL_STEREO_MONO; if not sz f9=pass f8;</span> — with the bit SET, channel B copies channel A's gain, i.e. stereo control. Either the doc or the code is backwards (or the Altera reports fitted jumpers as 0, ${inf}).</li>
   <li><b>Validity bit from the wrong receiver.</b> In <span class="mono">jmp_input</span> the D8208 branch reads <span class="mono">RD_CH1</span> (CS8420 #1) and copies its V bit into <span class="mono">CH2_8420reg1</span>, but the D8208's input is on CH2 (“LED_0 – Lock to CH2 (First input)”, AUD_OUTPUT_ROUTE OUT1 = OUT2 = CS8420 #2). The D8207 branch copies CH1→CH1 correctly.</li>
   <li><b>The test tone ignores the pots.</b> When AUD_TESTTONE is set, the delayed branch jumps straight to <span class="mono">D8208_sp_end</span> with the tone sample, skipping invert, mono and level control. It also keeps the output on through a loss of input (MODE 0 internal clock).</li>
   <li><b>Volume is a linear table.</b> <span class="mono">D8205_vol.dat</span> runs 0, 0.01555 … 3.97 in equal steps; jumpers.txt asks for logarithmic pots so the taper feels right. Trim (<span class="mono">D8205_trm.dat</span>) is already logarithmic and wants linear pots. The D8208 borrows both D8205 tables.</li>
   <li><b>Remote + volume is a hybrid.</b> In case 3 the remote pots use the volume table but the PCB pots still apply the trim table (<span class="mono">jump (PC, D8208_case_0)</span>), matching the jumpers.txt table “internal pots – trim, remote pots – volume”.</li>
   <li><b>Corrected 2026|59:</b> the PIC clock is PIC_CLK = 24.576 MHz ÷ 4 = 6.144 MHz from the CPLD (<span class="mono">d8200_top.rpt</span>: two TFFE stages on <span class="mono">input_clk</span>; <span class="mono">d8200-2.net</span>: PIC_CLK = U1-9/U4-8), not 3.58 MHz. The BOM's X1 3.58 is the ML6431 video-genlock crystal (X1 → U7-11/12), unused on a D8208. The pass is now ≈1.33 ms ${inf} (was 3.9 ms), and the A/D takes 3 passes per conversion, so each pot is read every 12 passes (was every 4th). (see d8205.js, d8200.js)</li>
   <li><b>Pots freeze after 4 s.</b> <span class="mono">Hysterisis</span> locks a pot reading after 256 steady samples and then ignores ±1 count, so slow drift of a 10-turn trimmer never wobbles the gain.</li>
   <li><b>The archived “D8208 manual” is a D8205 manual.</b> <span class="mono">D8206 - #ARCHIVE/D8208MAN.WPD</span> is titled “D8208 DARS XXXXXXXX with Sample Rate Converter” but every paragraph says D8205, lists H5 twice and labels both H6 and H7 “MONO/STEREO INPUT1”.</li>
   <li><b>Functional description vs firmware.</b> It promises CH A + CH B sum (firmware: JMP_7 mono = (A+B)/2, i.e. −6 dB) and 22–96 kHz input. JMP_14 “should be = 1” or the monitor jack selects OUT1, which on a D8208 is the same CS8420 #2 stream anyway.</li>
  </ol>`)+card('Assumptions', `<ul class="small"><li>PIC pass ≈ ${SIM.fmtDur(PASS)} ${inf} from the 6.144 MHz clock and SPI byte count (as in d8205.js), cross-checked with the hysteresis comment; the step proportions inside a pass are also ${inf}.</li><li>LED_0..3 → AUDIO/–/PROC/ERR physical LEDs, and their front-edge order, are ${inf} from the d8200-1 BOM (AUDIO1, AUDIO2 green, PROC yellow, ERR red).</li><li>Output re-enable delay ${OUT_DELAY*1e3} ms and PLL lock ${LOCK_T*1e3} ms ${inf}.</li><li>Clipping above 0 dBFS assumed at the fixed-point conversion ${inf}.</li></ul>`)
  +card('Sources', `<ul class="small mono"><li>D8208 - #Engineering #MF82/D8208 - Adjustable Gain … FUNCTIONAL DESCRIPTION.WPD</li><li>D8200 - #Engineering #MF82/d8200 - #d820x/jumpers.txt · pic/d820x.h · d820x.asm · d820xswr.asm · d820xad.asm</li><li>…/sharc/d820xcore.asm · D8205_trm.dat · D8205_vol.dat</li><li>…/d8200 - #PCB/d8200-1.bom · D8206 - #Master/…/D8208MAN.WPD</li></ul>`);
}
SIM.register({
  id:'d8208', name:'D8208 · Adjustable-gain AES DA (2000|33)', duration:1,
  product:'D8208', year:2000, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8208 - #Engineering #MF82',
  summary:'A 1-in, 8-out AES distribution amplifier with ±15 dB trim or off…+12 dB volume, set by PCB or remote pots. It is the shared D820x platform (PIC16C73A, EPM7128S, ADSP-21061, CS8420) built with #define D8208.',
  highlights:['Pots → A/D → hysteresis → SHARC gain tables','All 9 D8208 jumpers live','Dropout: MODE 6 → MODE 0 and output mute','Stereo-control jumper polarity mismatch','Archived “D8208 manual” is the D8205 text'],
  depth:'Hardware model',
  stepUnits:[{label:'1 PIC pass (inferred)',period:()=>PASS},{label:'1 AES frame',period:()=>1/D.fs},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s (whole)'],[0.1,'100 ms'],[0.02,'20 ms (≈15 passes)'],[PASS,'1 pass (≈1.33 ms)'],[0.0005,'500 µs'],[4/48000,'4 frames']],
  defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
