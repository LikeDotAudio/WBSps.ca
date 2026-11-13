/* =====================================================================
   AMS2 — 1RU two-channel audio monitor / powered speaker (Ward-Beck Systems, 2015|48–2016|49)
   Plugin for the WBS Device Simulator (../siumulation.html)
   Sources used (all in this archive):
   - AMS2 - #Master/SILK/AMS2-FRONT &  REAR-SILK(CURVE).cdr (MAR.17/15) → Inkscape (libcdr) → assets/ams2-front.svg
     (WHITE-plate cut-outs + GREEN and WHITE inks) and assets/ams2-rear.svg (2026|59 artwork pass; the older
     silk_extract.py PNGs ams2-front-green/-white.png and ams2-rear-white.png are no longer used)
   - AMS2 - #Master/MECHANICAL/AMS2-FRONT ISS1 (PANEL).pdf, AMS2-REAR ISS 2 (PANEL).pdf (17.10″ × 1.648″)
   - AMS2 - #Master/FUNCTIONALBD/AMS2.pdf (functional block diagram, 2015|48)
   - AMS2 - #Master/AMS2-N - #Engineering/AMS2-Test Results.pdf (Audio Precision SYS-2722, 16 Feb 2016|49),
     unet-standard-Parameters.xlsx (AMS2 Modification column), unet-standard-to-ams2-connection.xlsx, 7201-switch.jpg
   - AMS2 - #Master/AMS2 - power supply for networked version.xlsx
   - #QUBE #SERIES/QUBE - #Engineering #PROBLEM/QUBE - #PCB/QUBE - #ISS3 #schematic.pdf (the SA-AMS2-AMP board,
     "Universal Amplifier Board", UNI-AMP-ISS3, 3/27/2015): CS8416, PCM5100A, NE5532 mixer, 74HC4053, TPA3124D2
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const FS = 48000;
const inf = '<span class="tag-inf">inferred</span>';
const dBu = v => 20*Math.log10(Math.max(v,1e-9)/0.7746), fromdBu = d => 0.7746*Math.pow(10,d/20);

/* ---------------- constants ---------------- */
const K = {
  DAC_FS: 2.1,                       // PCM5100A full-scale output, Vrms — datasheet value (inferred: datasheet not archived)
  DIV: 4.64/(6.81+4.64),             // R99 6K81 / R87 4K64 (DAC_L → DIGITAL_L), likewise R86/R88
  DAC_RC: 1/(2*Math.PI*470*2200e-12),// R15 470R + C14 2200p → 154 kHz
  MIX_POLE: 1/(2*Math.PI*20e3*22e-12), // NE5532 stages 20K ∥ 22p → 362 kHz
  AMP_GAIN: 36,                      // TPA3124D2 with GAIN0 = GAIN1 = 1 (R62/R63 10K pull-ups, H4/H5 open); AP test: −17.7 dBu → +18.3 dBu
  VCC: 24,                           // VCC_P — inferred from the 24 V outputs in the PSU candidate sheet (PD-65B, RD-35B …) and 35 V caps
  FSW: 250e3,                        // TPA3124D2 switching frequency — datasheet (inferred)
  L: 33e-6, C: 0.22e-6, CO: 470e-6, CIN: 1e-6, ZIN36: 9e3,  // L1/L2, C60/C61, C64/C65, C48/C49; Zin at 36 dB inferred
  BAL_TRIM_CAL: -18.3,               // test: 0 dBu in → 17.7 dBu out with the rear trim set ⇒ trim ≈ −18.3 dB at calibration
  CMRR: 82, SNR: 70, XT: 63,          // measured
};
K.F0 = 1/(2*Math.PI*Math.sqrt(K.L*K.C));                // 59 kHz output filter
const hpOut = R => 1/(2*Math.PI*K.CO*R);                // output coupling corner
K.HPIN = 1/(2*Math.PI*K.CIN*K.ZIN36);

/* ---------------- state ---------------- */
const D = {
  input: 'analog',         // front AES ⇄ ANALOG switch
  mode: 'stereo',          // STEREO / LEFT / RIGHT selector
  lvlL: 0, lvlR: -6,       // analog source level dBu (balanced XLR)
  dbfs: -20,               // AES source level dBFS
  freq: 1000,
  trimL: -18.3, trimR: -18.3,   // rear ANALOG IN ADJUST
  xlrIn: true, aesIn: true, aesLock: true,
  phones: false,
  speaker: 8,              // Ω
  variant: 'AMS2',         // or 'AMS2-N'
  aoip: true,              // AES67 stream present (AMS2-N)
  log: [],
};

/* ---------------- the chain, stage by stage ---------------- */
function chain(){
  const st=[]; let L, R, srcNote;
  if (D.input==='analog'){
    const inL = D.xlrIn? fromdBu(D.lvlL):0, inR = D.xlrIn? fromdBu(D.lvlR):0;
    st.push(['XLR ANALOG IN L / R (balanced)', inL, inR, `${D.xlrIn?'':'(unplugged) '}CMRR > ${K.CMRR} dB measured`]);
    L = inL*Math.pow(10,D.trimL/20); R = inR*Math.pow(10,D.trimR/20);
    st.push(['SA-BAL2UNBAL (POD1-2) + ANALOG IN ADJUST trims', L, R, `trims ${D.trimL.toFixed(1)} / ${D.trimR.toFixed(1)} dB (single-ended out)`]);
    srcNote='analog';
  } else {
    const src = D.variant==='AMS2-N' ? (D.aoip? 'uNet AES67 → DIGITAL OUT (purple wire) → 7201 switch' : null) : (D.aesIn? 'rear AES IN XLR':null);
    const lock = !!src && D.aesLock;
    const a = lock? Math.pow(10,D.dbfs/20) : 0;
    st.push([src? src : 'AES source: none', a, a, lock? `${D.dbfs} dBFS`:'no lock: CS8416 AUDIO high → mute']);
    const v = a*K.DAC_FS;
    st.push(['CS8416 → I²S → PCM5100A (DEMP off, FLT normal, XSMT unmute)', v, v, `0 dBFS = ${K.DAC_FS} Vrms ${'(datasheet, inferred)'}; R15/C14 470R + 2200p → ${(K.DAC_RC/1e3).toFixed(0)} kHz`]);
    const dL = v, dR = v;   // as built: R99/R86 = 0R, R87/R88 DNI (BOM + PnP) — the schematic's 6K81/4K64 divider is not fitted
    st.push(['R99/R86 0R, R87/R88 DNI → DIGITAL_L/R (P7)', dL, dR, `full DAC level; the schematic's 6K81/4K64 divider (× ${K.DIV.toFixed(3)}) is not fitted in either build`]);
    L = dL*Math.pow(10,D.trimL/20); R = dR*Math.pow(10,D.trimR/20);
    st.push(['Front AES/ANALOG switch → SA-BAL2UNBAL trims', L, R, `trims ${D.trimL.toFixed(1)} / ${D.trimR.toFixed(1)} dB also act on AES (${'inferred'}: the off-board path from P7 is not documented)`]);
    srcNote='AES';
  }
  // mode selector → 74HC4053 + NE5532 unity inverting stages (twice → non-inverted LEFT/RIGHT)
  let oL=L, oR=R; if (D.mode==='left') oR=L; else if (D.mode==='right') oL=R;
  st.push(['Mode selector → 74HC4053 + NE5532 (20K/20K, 22p)', oL, oR, `${D.mode.toUpperCase()}: ${D.mode==='stereo'?'L→L, R→R':D.mode==='left'?'L to both':'R to both'} (routing ${'inferred'} from the labels and A/B/C_SEL straps)`]);
  // TPA3124D2
  const g=Math.pow(10,K.AMP_GAIN/20), vClip=(K.VCC/2)*0.9/Math.SQRT2; let aL=oL*g, aR=oR*g; const clipL=aL>vClip, clipR=aR>vClip;
  aL=Math.min(aL,vClip); aR=Math.min(aR,vClip);
  const mute = false;         // AMS2 build: JACK_INSERT strapped low (R73 0R), so the board never sees the headset
  st.push(['TPA3124D2 class-D, GAIN1:0 = 11 → 36 dB', aL, aR, `clip ≈ ${vClip.toFixed(2)} Vrms (${dBu(vClip).toFixed(1)} dBu) at VCC ${K.VCC} V ${'inferred'}${clipL||clipR?' — CLIPPING':''}`]);
  const spL = mute?0:aL, spR=mute?0:aR;
  st.push(['33 µH / 0.22 µF → 470 µF → speaker', spL, spR, `${(spL*spL/D.speaker).toFixed(2)} W / ${(spR*spR/D.speaker).toFixed(2)} W into ${D.speaker} Ω; HPF ${hpOut(D.speaker).toFixed(1)} Hz`]);
  return {st, srcNote, clip:clipL||clipR, PL:spL*spL/D.speaker, PR:spR*spR/D.speaker, vClip, ampL:aL, ampR:aR, mute};
}
function led(){ // LOCK LED: LED_G = AUD_VAL' or JACK_INSERT; LED_R = AUD_VAL or JACK_INSERT (power sheet diode-OR)
  const aesSrc = D.variant==='AMS2-N'? D.aoip : D.aesIn; const valid = aesSrc && D.aesLock;   // CS8416 AUDIO pin low = valid
  // SA-AMS2-AMP BOM: R73 = 0R ties JACK_INSERT low and R72/R101 are DNI, so only AUD_VAL drives the LED in an AMS2
  const g = (D.input==='AES' && valid), r = (D.input==='AES' && !valid);
  return {g,r};
}
function response(f){ // amplitude response of the speaker path (relative)
  const R=D.speaker; const hp=f/Math.sqrt(f*f+hpOut(R)**2), hin=f/Math.sqrt(f*f+K.HPIN**2);
  const w=2*Math.PI*f, wl=w*K.L, xc=1/(w*K.C); // LC into R
  const Zc=R/(1+ (w*R*K.C)**2), Xpar = -(w*R*R*K.C)/(1+(w*R*K.C)**2);  // R ∥ C
  const re=Zc, im=Xpar+wl; const lc=Math.sqrt(Zc*Zc+Xpar*Xpar)/Math.sqrt(re*re+im*im);
  return hp*hin*lc;
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,trace:tr}); if (D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  input(){ act('Front switch AES ⇄ ANALOG', tr=>{ D.input = D.input==='analog'?'AES':'analog'; tr(`Input select → ${D.input==='AES'?'AES (CS8416 → PCM5100A → DIGITAL_L/R on P7, off-board to the switch)':'ANALOG (SA-BAL2UNBAL)'}`); tr('The QubeAmp board has no MCU: switches act directly on analog switches / straps (A_SEL, B_SEL, C_SEL on P15 are pulled up by R45–R47) — exact wiring '+'inferred'); }); },
  mode(){ act('Turn the STEREO / LEFT / RIGHT selector', tr=>{ D.mode = D.mode==='stereo'?'left':D.mode==='left'?'right':'stereo'; tr(`74HC4053 select lines change → ${D.mode.toUpperCase()}`); tr('U8/U9 NE5532 inverting stages (20K/20K) rebuild LEFT and RIGHT around VCC_P/2 (U4A buffer)'); }); },
  phones(){ act(D.phones?'Unplug the headset':'Plug in the headset', tr=>{ D.phones=!D.phones; tr('The headset is fed by the separate HP AMP of the functional block diagram (its circuit is not in the archive, '+'inferred'+')'); tr('On the amplifier board JACK_INSERT is tied low by R73 = 0R in the SA-AMS2-AMP build (R72/R101 DNI), so the LOCK LED and the speakers do not react'); }); },
  trim(ch,d){ act(`Rear ANALOG IN ADJUST ${ch} ${d>0?'+':'−'}1 dB`, tr=>{ const k='trim'+ch; D[k]=Math.max(-40,Math.min(0,D[k]+d)); tr(`${ch} trim ${D[k].toFixed(1)} dB. The AP test set the trims so 0 dBu in gives 17.7 dBu at the speaker terminals.`); }); },
  xlr(){ act(D.xlrIn?'Unplug the analog XLRs':'Plug in the analog XLRs', tr=>{ D.xlrIn=!D.xlrIn; }); },
  aes(){ act(D.aesIn?'Unplug AES IN':'Plug in AES IN', tr=>{ D.aesIn=!D.aesIn; tr(`CS8416 ${D.aesIn?'locks; AUDIO goes low; Q1 inverts it to AUD_VAL′ → green LOCK':'loses lock; AUDIO high → red LOCK, PCM5100A output mutes'}`); }); },
  variant(v){ act('Build as '+v, tr=>{ D.variant=v; if (v==='AMS2-N'){ tr('uNet2500 fitted on the AMS2-N plate; Hostname and ModelName “AMS2-N”'); tr('Audio mode Mode1 renamed “AES67 Monitor”: no outgoing streams (ActiveStreams 0); output group 5 = Digital Out 1-2 named LEFT / RIGHT Channel'); tr('X102 pin 26 DIGITAL OUT (purple) → the 7201 switch → the AES input path'); } else tr('Standard AMS2: AES from the rear XLR'); }); },
  aoip(){ act(D.aoip?'Stop the AES67 stream':'Start the AES67 stream', tr=>{ D.aoip=!D.aoip; tr(D.aoip?'uNet joins the stream (PTP domain 0, 48 kHz), plays out after 512 samples (10.7 ms) on DIGITAL OUT':'No stream: DIGITAL OUT stops; CS8416 unlocks'); }); },
};

/* ---------------- panels: real silk (3418 × 329 px = 17.09″ × 1.645″ at 200 dpi) ---------------- */
const ASSET='siumulation-plugins/assets/';
function frontSVG(){
  const L=led(), c=chain();
  const ledCol = L.g&&L.r? '#ffb43a' : L.g? '#7dff6a' : L.r? '#ff4a3a' : 'var(--led-off)';
  const angle = D.mode==='stereo'?0: D.mode==='left'?-60:60;
  return `<svg viewBox="0 0 3418 329" style="width:100%;border-radius:6px;display:block" role="img" aria-label="AMS2 front panel (real silk)">
   <defs><filter id="ga2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="3418" height="329" rx="8" fill="var(--dev)"/>
   ${c.PL+c.PR>0.01? `<g opacity="${Math.min(.5,(c.PL+c.PR)/10)}"><rect x="70" y="20" width="740" height="260" fill="#2a3a2a"/><rect x="2610" y="20" width="740" height="260" fill="#2a3a2a"/></g>`:''}
   <image href="${ASSET}ams2-front.svg" width="3418" height="329"/>
   <circle cx="940" cy="164" r="22" fill="${ledCol}" ${ledCol!=='var(--led-off)'?'filter="url(#ga2)"':''}><title>LOCK (bi-colour: green = AES valid, red = no lock)</title></circle>
   <g class="sw" style="cursor:pointer"><rect x="1050" y="110" width="72" height="108" fill="transparent"/><circle cx="1086" cy="164" r="20" fill="#9aa0a6"/><rect x="${D.input==='AES'?1052:1092}" y="156" width="44" height="16" rx="8" fill="#d0d4d8"/><title>AES ⇄ ANALOG — click</title></g>
   <g class="mode" style="cursor:pointer"><circle cx="2174" cy="232" r="54" fill="transparent"/><circle cx="2174" cy="232" r="36" fill="#1b1d1f" stroke="#5a5d60" stroke-width="3"/><line x1="2174" y1="232" x2="${2174+30*Math.sin(angle*Math.PI/180)}" y2="${232-30*Math.cos(angle*Math.PI/180)}" stroke="#eee" stroke-width="6"/><title>STEREO / LEFT / RIGHT — click to turn</title></g>
   <circle cx="2074" cy="224" r="13" fill="${D.mode==='left'?'#7dff6a':'var(--led-off)'}"><title>LEFT position mark (indicator ${'inferred'})</title></circle><circle cx="2274" cy="224" r="13" fill="${D.mode==='right'?'#7dff6a':'var(--led-off)'}"><title>RIGHT position mark (indicator inferred)</title></circle>
   <g class="hp" style="cursor:pointer"><circle cx="2480" cy="174" r="34" fill="#0b0b0c" stroke="#666" stroke-width="3"/><circle cx="2480" cy="174" r="12" fill="#000"/>${D.phones?'<circle cx="2480" cy="174" r="22" fill="#2d2f31" stroke="#888"/>':''}<title>HEADSET — click to plug / unplug</title></g>
  </svg>`;
}
function rearSVG(){
  const xlr=(x,cls,on,lbl)=>`<g class="${cls}" style="cursor:pointer"><circle cx="${x}" cy="128" r="76" fill="transparent"/>${on?`<circle cx="${x}" cy="128" r="70" fill="#2b2d30" stroke="#888" stroke-width="4"/><rect x="${x-26}" y="200" width="52" height="120" fill="#202224"/>`:''}<title>${lbl} — click to ${on?'unplug':'plug in'}</title></g>`;
  const trim=(x,ch)=>`<g class="trim" data-ch="${ch}" style="cursor:pointer"><circle cx="${x}" cy="276" r="22" fill="#c9a640" stroke="#6b5517" stroke-width="3"/><line x1="${x}" y1="276" x2="${x+18*Math.sin((D['trim'+ch]+40)/40*4-2)}" y2="${276-18*Math.cos((D['trim'+ch]+40)/40*4-2)}" stroke="#222" stroke-width="5"/><title>ANALOG IN ADJUST ${ch}: ${D['trim'+ch].toFixed(1)} dB (left half −, right half +)</title></g>`;
  return `<svg viewBox="0 0 3418 329" style="width:100%;border-radius:6px;display:block" role="img" aria-label="AMS2 rear panel (real silk)"><rect width="3418" height="329" rx="8" fill="var(--dev)"/>
    ${D.variant==='AMS2-N'?`<g class="aoip" style="cursor:pointer"><rect x="1300" y="30" width="820" height="200" fill="#123a6b"/><rect x="1640" y="80" width="130" height="100" rx="6" fill="#d9d9d9"/><rect x="1660" y="96" width="90" height="60" fill="#333"/><circle cx="1795" cy="96" r="9" fill="${D.aoip?'#7dff6a':'#555'}"/><text x="1710" y="215" text-anchor="middle" font-size="26" fill="#cde">uNet2500 RJ45 — ${D.aoip?'AES67 stream on':'no stream'} (click)</text></g>`:''}
    <image href="${ASSET}ams2-rear.svg" width="3418" height="329"/>
    ${xlr(2400,'xa',D.xlrIn,'ANALOG IN L')}${xlr(2610,'xa',D.xlrIn,'ANALOG IN R')}${xlr(2960,'xe',D.aesIn,'AES IN')}${xlr(3170,'',false,'AES OUT (loop: P2 AES_TX)')}
    ${trim(1610,'L')}${trim(1810,'R')}</svg>`;
}
function bindPanels(root){
  const on=(sel,fn)=>root.querySelectorAll(sel).forEach(e=>e.addEventListener('click',fn));
  on('.sw',()=>A.input()); on('.mode',()=>A.mode()); on('.hp',()=>A.phones()); on('.xa',()=>A.xlr()); on('.xe',()=>A.aes()); on('.aoip',()=>A.aoip());
  root.querySelectorAll('.trim').forEach(g=>g.addEventListener('click',e=>{ const r=g.getBoundingClientRect(); A.trim(g.dataset.ch, (e.clientX-r.left)<r.width/2?-1:1); }));
}
function sourceCtl(){
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
   <label class="small">Analog L <input type="range" id="sl" min="-30" max="24" value="${D.lvlL}"> <span class="mono" id="slv">${D.lvlL} dBu</span></label>
   <label class="small">R <input type="range" id="sr" min="-30" max="24" value="${D.lvlR}"> <span class="mono" id="srv">${D.lvlR} dBu</span></label>
   <label class="small">AES <input type="range" id="sa" min="-60" max="0" value="${D.dbfs}"> <span class="mono" id="sav">${D.dbfs} dBFS</span></label>
   <label class="small">Tone <select id="sf">${[50,100,1000,10000,15000].map(f=>`<option ${f===D.freq?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
   <label class="small">Speaker <select id="sp">${[4,8].map(r=>`<option ${r===D.speaker?'selected':''}>${r}</option>`).join('')}</select> Ω</label>
   <label class="small">Build <select id="vr"><option ${D.variant==='AMS2'?'selected':''}>AMS2</option><option ${D.variant==='AMS2-N'?'selected':''}>AMS2-N</option></select></label></div>`;
}
function bindSource(m){
  const q=s=>m.querySelector(s);
  q('#sl').oninput=e=>{ D.lvlL=+e.target.value; q('#slv').textContent=D.lvlL+' dBu'; SIM.refresh(); };
  q('#sr').oninput=e=>{ D.lvlR=+e.target.value; q('#srv').textContent=D.lvlR+' dBu'; SIM.refresh(); };
  q('#sa').oninput=e=>{ D.dbfs=+e.target.value; q('#sav').textContent=D.dbfs+' dBFS'; SIM.refresh(); };
  q('#sf').onchange=e=>{ D.freq=+e.target.value; SIM.refresh(); };
  q('#sp').onchange=e=>{ D.speaker=+e.target.value; SIM.refresh(); };
  q('#vr').onchange=e=>A.variant(e.target.value);
}
function chainTable(){
  const c=chain();
  return `<table class="kv"><tr><th>Stage</th><th>L</th><th>R</th><th>note</th></tr>${c.st.map(s=>`<tr><td>${s[0]}</td><td class="mono">${s[1]>0? dBu(s[1]).toFixed(1)+' dBu':'—'}</td><td class="mono">${s[2]>0? dBu(s[2]).toFixed(1)+' dBu':'—'}</td><td class="small">${s[3]}</td></tr>`).join('')}</table>`;
}

/* ---------------- timeline ---------------- */
function lanes(){
  const css=SIM.css, c=chain(), L=[];
  const g=Math.pow(10,K.AMP_GAIN/20), resp=response(D.freq), vpk=c.ampL*Math.SQRT2*resp;
  L.push({label:D.input==='AES'?'AES3 frames (CS8416 in)':'Analog input L', h:28, draw(cx,X,t0,t1,y,h){ if (D.input==='AES'){ SIM.pulses(cx,X,t0,t1,y,h,1/FS,0,0.5/FS,css('--accent2'),'AES3 frames'); return; }
    const a=c.st[0][1]; wave(cx,X,t0,t1,y,h,a*Math.SQRT2,D.freq,css('--accent2'),6); }});
  if (D.input==='AES') L.push({label:'I²S SCLK 64fs / LRCLK', h:22, draw(cx,X,t0,t1,y,h){ SIM.pulses(cx,X,t0,t1,y,h,1/(64*FS),0,0.5/(64*FS),css('--ink2'),'SCLK 3.072 MHz'); }});
  L.push({label:'LEFT into the amp (P10 L_IN)', h:32, draw(cx,X,t0,t1,y,h){ wave(cx,X,t0,t1,y,h,c.st[c.st.length-3][1]*Math.SQRT2,D.freq,css('--accent'),2); }});
  L.push({label:`TPA3124 PWM ≈ ${K.FSW/1e3} kHz (LOUT)`, h:30, draw(cx,X,t0,t1,y,h){ const T=1/K.FSW; const n0=Math.floor(t0/T), n1=Math.ceil(t1/T);
    if (n1-n0>400){ SIM.pulses(cx,X,t0,t1,y,h,T,0,T/2,css('--warn'),'PWM periods ('+'switching frequency inferred'+')'); return; }
    cx.fillStyle=css('--warn'); for (let n=n0;n<=n1;n++){ const tt=n*T; const v=c.ampL*Math.SQRT2*Math.sin(2*Math.PI*D.freq*tt); const duty=Math.max(0.02,Math.min(0.98,0.5+v/K.VCC)); cx.fillRect(X(tt),y+4,Math.max(1,X(tt+duty*T)-X(tt)),h-8); } }});
  L.push({label:`Speaker L after LC + 470 µF (${D.speaker} Ω)`, h:40, draw(cx,X,t0,t1,y,h){ wave(cx,X,t0,t1,y,h,c.mute?0:vpk,D.freq,c.clip?css('--bad'):css('--accent'),12,K.VCC/2*0.9); }});
  L.push({label:'LOCK LED (G / R)', h:22, draw(cx,X,t0,t1,y,h){ const l=led(); cx.fillStyle='#3fbf5f'; if (l.g) cx.fillRect(X(t0),y+3,X(t1)-X(t0),7); cx.fillStyle='#e0453a'; if (l.r) cx.fillRect(X(t0),y+12,X(t1)-X(t0),7); }});
  if (D.variant==='AMS2-N') L.push({label:'uNet: RTP in (1 ms) → playout 10.7 ms', h:26, draw(cx,X,t0,t1,y,h){ if (!D.aoip) return; SIM.pulses(cx,X,t0,t1,y,h/2,1e-3,0,0.06e-3,css('--accent2'),'RTP packets'); SIM.pulses(cx,X,t0,t1,y+h/2,h/2,1,0.25,0.004,css('--warn'),'PTP Sync'); }});
  return L;
}
function wave(cx,X,t0,t1,y,h,pk,f,col,scale,clip){
  const span=t1-t0, pw=X(t1)-X(t0);
  if (span*f>pw/3){ cx.fillStyle=col; cx.globalAlpha=.3; const a=Math.min(1,pk/scale); cx.fillRect(X(t0),y+h/2-a*(h/2-2),pw,2*a*(h/2-2)); cx.globalAlpha=1; return; }
  cx.strokeStyle=col; cx.beginPath(); for (let i=0;i<=600;i++){ const tt=t0+span*i/600; let v=pk*Math.sin(2*Math.PI*f*tt); if (clip) v=Math.max(-clip,Math.min(clip,v)); const yy=y+h/2-v/scale*(h/2-2); i?cx.lineTo(X(tt),yy):cx.moveTo(X(tt),yy); } cx.stroke();
}

/* ================================================================ VIEWS ================================================================ */
const card=(t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
function viewSim(m){
  window.__ams2Active=false;
  const art=`<div class="small muted">Artwork: ${SIM.src('AMS2 - #Master/SILK/AMS2-FRONT &  REAR-SILK(CURVE).cdr','AMS2-FRONT & REAR-SILK(CURVE).cdr')} (MAR.17/15), CorelDRAW vectors: cut-outs from the WHITE plate, inks GREEN + WHITE.</div>`;
  m.innerHTML = card('Front panel (real silk, MAR.17/15) — click the switch, the selector and the headset jack','<div id="fp"></div>'+art)
   + card('Rear panel (real silk) — click the XLRs, the trims (left half −1 dB, right half +1 dB) and, on an AMS2-N, the network plate','<div id="rp"></div>'+art)
   + card('Sources and build', sourceCtl())
   + `<div class="grid2">${card('Level at each stage','<div id="ch"></div>')}${card('What happened','<div id="tr" class="log"></div><div id="sum" class="small" style="margin-top:8px"></div>')}</div>`
   + card('Timeline: one second, zoomable (zoom to 20 µs to see the PWM)','<canvas id="tl"></canvas>');
  bindSource(m);
  SIM.on('time',()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanels(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanels(m.querySelector('#rp'));
    m.querySelector('#ch').innerHTML=chainTable(); const c=chain();
    m.querySelector('#sum').innerHTML=`Speakers: <b>${c.PL.toFixed(2)} W</b> L, <b>${c.PR.toFixed(2)} W</b> R ${c.clip?'<b style="color:var(--bad)">— clipping</b>':''} · response at ${D.freq} Hz: ${(20*Math.log10(response(D.freq))).toFixed(2)} dB`;
    m.querySelector('#tr').innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a control.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); });
}
const LESSONS=[
  {title:'Meet the AMS2', body:`<p>The AMS2 is a 1RU monitor with two speakers behind the hex grilles. It plays either a stereo analog feed (rear XLRs) or an AES pair. There is no operator manual in the archive; this tutorial follows the panel legends, the functional block diagram and the 2016 Audio Precision test.</p>`, check:()=>true, auto:true},
  {title:'1 · Line it up', body:`<p>The test set the rear <b>ANALOG IN ADJUST</b> trims so that <b>0 dBu</b> in gives <b>17.7 dBu</b> at the speaker (about 5 W into 8 Ω). Set both analog sources to 0 dBu and check the chain table.</p><p><b>Goal:</b> L and R at 0 dBu, analog input.</p>`, check:()=>D.lvlL===0&&D.lvlR===0&&D.input==='analog', hint:'Use the source sliders.'},
  {title:'2 · Listen to one side', body:`<p>Turn the <b>STEREO / LEFT / RIGHT</b> selector to <b>LEFT</b>: both speakers now play the left input.</p><p><b>Goal:</b> mode LEFT.</p>`, check:()=>D.mode==='left', hint:'Click the knob between LEFT and RIGHT.'},
  {title:'3 · Switch to AES', body:`<p>Flip <b>AES ⇄ ANALOG</b> to AES. The <b>LOCK</b> LED turns green when the CS8416 sees valid audio. The divider drawn on the schematic is not fitted, so a 0 dBFS AES signal leaves the board at the full DAC level, about +8.7 dBu: almost 9 dB hotter than a 0 dBu analog feed. A −20 dBFS line-up tone lands near −11 dBu.</p><p><b>Goal:</b> AES input with a green LOCK.</p>`, check:()=>D.input==='AES'&&led().g&&!led().r, hint:'Click the small toggle next to LOCK; make sure AES IN is plugged in.'},
  {title:'4 · Lose lock', body:`<p>Unplug <b>AES IN</b>. The LOCK LED goes red and the amplifier gets silence.</p><p><b>Goal:</b> red LOCK.</p>`, check:()=>led().r&&!led().g, hint:'Click the AES IN XLR on the rear.'},
  {title:'5 · Headset', body:`<p>Plug the headset in. It has its own amplifier (functional block diagram), so the speakers keep playing. The amplifier board's jack-insert detect is strapped off in the AMS2 build (R73 = 0R).</p><p><b>Goal:</b> headset plugged.</p>`, check:()=>D.phones, hint:'Click HEADSET.'},
  {title:'6 · Find the clip point', body:`<p>Back to analog, headset out. Raise the input until the class-D stage clips. With the 36 dB gain the TPA3124 runs out of supply at about +18 dBu out (${'24 V supply inferred'}).</p><p><b>Goal:</b> clipping.</p>`, check:()=>chain().clip&&D.input==='analog', hint:'Push the L slider up past about +1 dBu with the trims at −18.3.'},
  {title:'7 · AMS2-N', body:`<p>Choose the <b>AMS2-N</b> build. The uNet2500 is set up as an “AES67 Monitor”: it receives a network stream and feeds it as a digital signal into the AES path.</p><p><b>Goal:</b> AMS2-N on AES with the stream running.</p>`, check:()=>D.variant==='AMS2-N'&&D.input==='AES'&&D.aoip, hint:'Build → AMS2-N, input AES.'},
  {title:'Done', body:'<p>That covers every control. The other tabs show the board inside (the QubeAmp, “Universal Amplifier Board”).</p>', check:()=>true, auto:true},
];
let LI=0;
function viewTut(m){
  window.__ams2Active=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial: using the AMS2','<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>')}<div class="card" id="lesson"></div></div><div>${card('The unit','<div id="fp"></div><div id="rp" style="margin-top:6px"></div><div style="margin-top:6px">'+sourceCtl()+'</div><div id="ch" style="margin-top:6px"></div>')}</div></div>`;
  bindSource(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanels(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanels(m.querySelector('#rp')); m.querySelector('#ch').innerHTML=chainTable();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===LI?'font-weight:700;color:var(--accent)':''}">${l.title}${i<LI?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ LI=+li.dataset.i; draw(); });
    const L=LESSONS[LI], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${LI?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${LI<LESSONS.length-1?'':'disabled'}>Next ▶</button></div>`;
    m.querySelector('#pv').onclick=()=>{ LI=Math.max(0,LI-1); draw(); }; m.querySelector('#nx').onclick=()=>{ LI=Math.min(LESSONS.length-1,LI+1); draw(); }; };
  SIM.on('time',draw);
}
function viewSecond(m){
  window.__ams2Active=false;
  m.innerHTML=card('One second inside the AMS2','<div id="lad"></div>')+`<div class="grid2">${card('Frequency response of the speaker path (model vs the AP test)','<canvas id="fr"></canvas><p class="small muted">Model: 1 µF input coupling into ≈9 kΩ (at 36 dB, '+inf+'), the 33 µH / 0.22 µF output filter into the load, and the 470 µF output capacitor. Shaded: the measured limits (< 1 dB 100 Hz–10 kHz, < 3 dB 50 Hz–15 kHz).</p>')}${card('One PWM period at the playhead','<canvas id="pw"></canvas>')}</div>`;
  SIM.on('time',()=>{ const t=SIM.t;
    const rows=[['AES3 frames / CS8416 samples','48,000','20.83 µs'],['I²S bit clock (SCK = BCK on the PCM5100A)','3.072 M','325.5 ns'],['PCM5100A 8× oversampled filter output','384,000','2.6 µs ('+'datasheet, inferred'+')'],['TPA3124 PWM periods',(K.FSW).toLocaleString(),SIM.fmtDur(1/K.FSW)+' ('+'inferred'+')'],['Tone cycles',D.freq.toLocaleString(),SIM.fmtDur(1/D.freq)],['uNet RTP packets (AMS2-N)','1,000','1 ms']];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join('')}</table>`;
    const {c,w}=SIM.canvas(m.querySelector('#fr'),200); const fx=f=>40+(Math.log10(f)-1)/3.3*(w-60), dy=db=>20+(-db)/12*150;
    c.fillStyle=SIM.css('--accent'); c.globalAlpha=.12; c.fillRect(fx(100),dy(0),fx(10000)-fx(100),dy(-1)-dy(0)); c.fillRect(fx(50),dy(0),fx(15000)-fx(50),dy(-3)-dy(0)); c.globalAlpha=1;
    c.strokeStyle=SIM.css('--grid'); [0,-3,-6,-12].forEach(d=>{ c.beginPath(); c.moveTo(40,dy(d)); c.lineTo(w-20,dy(d)); c.stroke(); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(d+' dB',4,dy(d)+3); });
    [20,100,1000,10000].forEach(f=>{ c.fillText(f>=1000?f/1000+'k':f, fx(f)-6, 195); });
    c.strokeStyle=SIM.css('--accent2'); c.lineWidth=2; c.beginPath(); for (let i=0;i<=300;i++){ const f=10*Math.pow(10,3.3*i/300); const db=20*Math.log10(response(f)); i?c.lineTo(fx(f),dy(db)):c.moveTo(fx(f),dy(db)); } c.stroke(); c.lineWidth=1;
    const p=SIM.canvas(m.querySelector('#pw'),200); const T=1/K.FSW, ch=chain(); const v=ch.ampL*Math.SQRT2*Math.sin(2*Math.PI*D.freq*t); const duty=Math.max(0.02,Math.min(0.98,0.5+v/K.VCC));
    p.c.strokeStyle=SIM.css('--warn'); p.c.lineWidth=2; p.c.beginPath(); p.c.moveTo(20,160); p.c.lineTo(20,40); p.c.lineTo(20+duty*(p.w-40),40); p.c.lineTo(20+duty*(p.w-40),160); p.c.lineTo(p.w-20,160); p.c.stroke(); p.c.lineWidth=1;
    p.c.fillStyle=SIM.css('--ink'); p.c.font='12px sans-serif'; p.c.fillText(`LOUT high for ${(duty*100).toFixed(1)} % of ${SIM.fmtDur(T)} → filtered output ${v.toFixed(2)} V about VCC/2`, 20, 190); });
}
const BLK={
  xlr:{x:10,y:20,w:150,h:70,t:'ANALOG IN L/R',s:['XLR, balanced'],d:'Rear XLRs into the SA-BAL2UNBAL board (POD1-2 PCB). CMRR > 82 dB, 20 Hz–20 kHz (AP test, 0 dBu in).'},
  bal:{x:190,y:20,w:170,h:70,t:'SA-BAL2UNBAL (POD1-2)',s:['balanced → single-ended','rear ANALOG IN ADJUST'],d:'Rear trims L and R set the level into the amp. At the test setting 0 dBu in gave 17.7 dBu at the speaker output.'},
  aes:{x:10,y:130,w:150,h:70,t:'AES IN (or uNet)',s:['XLR / AES67 (AMS2-N)'],d:'Into the CS8416 via transformer T1. On the AMS2-N, the uNet’s DIGITAL OUT reaches this path through the 7201 switch.'},
  rx:{x:190,y:130,w:170,h:70,t:'CS8416 → PCM5100A',s:['hardware mode, I²S','DEMP off, normal filter'],d:'Universal Amplifier Board sheet 1. The PCM5100A output passes 470 Ω / 2200 pF to DIGITAL_L/R. The 6K81/4K64 divider drawn on sheet 2 is replaced by 0R / DNI in both BOMs.'},
  sel:{x:390,y:70,w:170,h:90,t:'Input & mode select',s:['front AES ⇄ ANALOG','STEREO / LEFT / RIGHT','74HC4053 + NE5532'],d:'Sheet 2 “Analog Mixer”: a 74HC4053 picks JACK_L/R or LEFT_FB, strapped by A/B/C_SEL (R45–R47 pull-ups, pull-downs DNI, header P15 to the front panel). NE5532 unity inverting stages on a single supply with VCC_P/2 from U4A.'},
  amp:{x:590,y:70,w:170,h:90,t:'TPA3124D2',s:['36 dB (GAIN1:0 = 11)','SE outputs, 470 µF'],d:'Sheet 3. GAIN0/GAIN1 pulled up by R62/R63 (pull-downs R97/R98 DNI, links H4/H5 open) → 36 dB, confirmed by the AP test (−17.7 dBu in → +18.3 dBu out). L1/L2 33 µH with C60/C61 0.22 µF (59 kHz), then C64/C65 470 µF to the speakers.'},
  spk:{x:790,y:40,w:120,h:60,t:'Speakers',s:['two drivers + tweeters'],d:'Behind the hex grilles. A tweeter bracket is in MECHANICAL/. The AP test used 8 Ω dummy loads.'},
  hp:{x:790,y:130,w:120,h:60,t:'HEADSET',s:['separate HP amp'],d:'The functional BD shows a separate headphone amp after the gain stage. The amp board has a jack-insert input, but the SA-AMS2-AMP BOM straps it off (R73 0R to GND, R72/R101 DNI); it is used in the QUBE build.'},
  psu:{x:390,y:200,w:170,h:60,t:'Power',s:['90–230 VAC, 1A S.B.','VCC_P + R-78E3.3'],d:'Rear legend 90-230 VAC 1A S.B. VCC_P feeds the TPA3124 and the mixer; a Recom R-78E3.3-0.5 makes 3.3 V. The AMS2-N PSU sheet compares 5 V + 24 V supplies (Mean Well PD-65B, RD-35B …), hence VCC_P = 24 V (inferred).'},
};
const WIRES=[['xlr','bal'],['bal','sel'],['aes','rx'],['rx','sel','DIGITAL_L/R'],['sel','amp','L_IN/R_IN'],['amp','spk','OUT_1_P/OUT_2_N'],['sel','hp'],['psu','amp']];
function viewBlock(m){
  window.__ams2Active=false; let sel='amp';
  m.innerHTML=`<div class="grid2">${card('Block diagram (after FUNCTIONALBD/AMS2.pdf and the board schematic; click a block)','<div id="bd"></div>')}${card('Block','<div id="bi"></div>')}</div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 920 270" style="width:100%"><defs><marker id="aa2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLK[a],B_=BLK[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; }; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#aa2)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLK){ const b=BLK[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); }); m.querySelector('#bi').innerHTML=`<h3>${BLK[sel].t}</h3><p>${BLK[sel].d}</p>`; };
  draw();
}
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length), h=24+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.3"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p}</text><text x="${x-33}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${n}</text>`; });
  right.forEach(([p,n],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p}</text><text x="${x+w+33}" y="${yy+4}" font-size="10" fill="var(--accent2)">${n}</text>`; }); return s; }
const SHEETS=[
  {name:'1 · AES → DAC', note:'Sheet 1 of UNI-AMP-ISS3 (3/27/2015). Pins from the PDF.', svg:()=>chip(330,60,180,'U3 PCM5100A',[['12 SCK','(R103 DNI)'],['13 BCK','SCLK'],['14 DIN','SDATA'],['15 LRCLK','LRCLK'],['16 FMT','GND = I²S'],['10 DEMP','GND = off'],['11 FLT','GND = normal'],['17 XSMT','3V3 = unmute']],[['6 OUTL','R15 470R → DAC_L'],['7 OUTR','R14 470R → DAC_R'],['1/3/5','CPVDD, CPGND, VNEG 2U2'],['20/8','DVDD, AVDD (R16 10R)']],'2.1 Vrms FS (datasheet)')+`<text x="40" y="330" font-size="11" fill="var(--ink2)">C13/C14 2200 pF to GND → 154 kHz; DAC_L → R99 (6K81 on the schematic, 0R as built) → DIGITAL_L; R87 4K64 drawn, DNI as built.</text>`},
  {name:'2 · Mixer', note:'Sheet 2 “Analog Mixer”. U8/U9/U4 NE5532 on VCC_P with VCC_P/2 (R70/R71 10K + U4A buffer).', svg:()=>chip(140,60,170,'U10 74HC4053',[['14 A','JACK_R via R48 20K'],['15 B','JACK_L via R49 20K'],['4 C','LEFT_FB via C72, R50'],['11/10/9','A/B/C_SEL (R45–47 10K up)']],[['12/13','AX/AY → C40 → U8B'],['2/1','BX/BY'],['5/3','CX/CY'],['16','VCC_3V3']],'analog switch')+chip(580,60,150,'U8A / U4B',[['2','R55/R56 20K'],['6','R18/R17 20K']],[['1 → R19 30R','LEFT (C73 47µ)'],['7','LEFT_N'],['R20/R21 30R','RIGHT (C74 47µ)']],'unity inverting, 22p')},
  {name:'3 · Power amp', note:'Sheet 3. Values from the schematic.', svg:()=>chip(330,40,180,'U12 TPA3124D2',[['5 LIN','C48 1µ ← L_IN'],['6 RIN','C49 1µ ← R_IN'],['4 MUTE','MUTE'],['2 /SD','R85 10K'],['18 GAIN0','R62 10K ↑, R97 DNI'],['17 GAIN1','R63 10K ↑, R98 DNI'],['1,3,10,12','PVCC (C57 470µ)']],[['22 LOUT','L1 33µ → C60 0.22µ'],['21 BSL','C55 220n'],['15 ROUT','L2 33µ → C61 0.22µ'],['16 BSR','C56 220n'],['','C64/C65 470µ → OUT_1_P / OUT_2_N'],['','C75 1µ across the outputs']],'class-D, 36 dB')},
  {name:'4 · Power & LEDs', note:'Sheet 4 “PWR SUP / HEADER”. LED logic: LED_R = JACK_INSERT or AUD_VAL; LED_G = JACK_INSERT or AUD_VAL′ (Q1 2N4401 inverter, R74 3K, R75 110R).', svg:()=>chip(330,60,180,'U13 R-78E3.3-0.5',[['1 Vin','VCC_P (C69 22µ)']],[['3 Vout','VCC_3V3 (C70 10µ)']],'switching regulator')+`<text x="40" y="250" font-size="11" fill="var(--ink)">Headers: P1 AES_RX, P2 AES_TX, P7 DIGITAL_L/R, P8 JACK_L/R/INSERT, P9 LEFT/RIGHT, P10 R_IN/L_IN, P11 OUT_2_N/OUT_1_P, P12 LED_G/LED_R, P14 VCC_P, P15 A/B/C_SEL.</text>`},
];
function viewSchem(m){
  window.__ams2Active=false; let i=0;
  m.innerHTML=card('Schematic set — redrawn from the QubeAmp ISS3 schematic PDF (the SA-AMS2-AMP board); not the Altium drawings','<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>');
  const draw=()=>{ m.querySelector('#t2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#t2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 360" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[i].svg()}<text x="850" y="352" text-anchor="end" font-size="10" fill="var(--ink2)">AMS2 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`; m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}
function viewSoft(m){
  window.__ams2Active=false;
  m.innerHTML=`<div class="grid2">${card('Signal path, stage by stage (live)','<div id="ch"></div>')}${card('The AMS2-N network configuration (uNet parameter sheet, “AMS2 Modification” column)','<div id="un"></div>')}</div>`;
  SIM.on('time',()=>{ m.querySelector('#ch').innerHTML=chainTable()+'<p class="small muted">There is no firmware in the AMS2: the CS8416 runs in hardware mode, the TPA3124 gain is strapped and the selectors act on the analog switch.</p>';
    m.querySelector('#un').innerHTML=`<table class="kv"><tr><th>Parameter</th><th>default</th><th>AMS2-N</th></tr>
      <tr><td class="mono">Global/ModelName, IpCfg/Hostname</td><td>uNet2500</td><td class="mono">AMS2-N</td></tr>
      <tr><td class="mono">AudioModes/Mode1/AudioModeName</td><td>SPDIF digital I/O</td><td class="mono">AES67 Monitor</td></tr>
      <tr><td class="mono">Mode1/ActiveStreams</td><td>1,2,5,6,7</td><td class="mono">0 (sends nothing)</td></tr>
      <tr><td class="mono">Mode1/ActiveOutputGroups</td><td>1,2,5</td><td class="mono">5 (Digital Out 1-2)</td></tr>
      <tr><td class="mono">OutputGroup5 Output1/2 names</td><td>Digital Output 1/2</td><td class="mono">LEFT / RIGHT Channel</td></tr>
      <tr><td class="mono">User_AudioMode</td><td>1</td><td class="mono">2</td></tr>
      <tr><td class="mono">PTP domain / playout</td><td colspan="2">0 · 512 samples (10.7 ms) — unchanged</td></tr></table>
      <p class="small">Wiring (unet-standard-to-ams2-connection.xlsx): 5V red, GND white/black, SDOUT0 black, DIGITAL OUT purple (pin 26) → the “7201 switch”, LRCLK and SCLK to the switch side.</p>`; });
}
function viewNotes(m){
  window.__ams2Active=false;
  m.innerHTML=card('What the AMS2 is up to: findings', `<ol>
   <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src('AMS2 - #Master/SILK/AMS2-FRONT &  REAR-SILK(CURVE).cdr','AMS2-FRONT & REAR-SILK(CURVE).cdr')} (title block MAR.17/15, file saved 2015-11-06).</b> The sheet holds a GREEN front plate, a WHITE front plate and a WHITE rear plate; they are registered on one panel and the CorelDRAW cut-outs (hex vents, LED/switch/pot holes, IEC, D-sub plate, XLR flanges) are drawn under the inks. Outside the printed page the file still carries a second, older copy of the rear legends and the “AMS2 SERIES” title (leftover). The non-curve twin ${SIM.src('AMS2 - #Master/SILK/AMS2-FRONT &  REAR PANEL SILK.cdr','AMS2-FRONT & REAR PANEL SILK.cdr')} is dated 2015-03-20. The two small holes either side of the STEREO/LEFT/RIGHT selector are real cut-outs, but only the left one carries a drill crosshair.</li>
   <li><b>The amplifier gain is set by two pull-ups, and the test confirms it.</b> TPA3124D2 GAIN0/GAIN1 are pulled high by R62/R63 (10K), with the pull-downs R97/R98 DNI and the links H4/H5 open. That is the 36 dB setting. The 2016 AP test drove −17.7 dBu in and got +18.3 dBu out, exactly 36 dB.</li>
   <li><b>The DAC divider on the schematic is not built.</b> Sheet 2 shows DAC_L → R99 6K81 → DIGITAL_L with R87 4K64 to ground (−7.9 dB). Both master BOMs and the AMS2-AMP pick-and-place file fit R99 and R86 as 0R and leave R87/R88 out, so DIGITAL_L/R carry the full PCM5100A output (2.1 Vrms, +8.7 dBu at 0 dBFS). The pick-and-place file even types R86's value as “OR” (letter O). Fed into the 36 dB amp without the rear trims, anything above about −25 dBFS would clip. The model therefore sends AES through the same rear trims (${inf}).</li>
   <li><b>The test describes the trim oddly.</b> The CMRR line says “Input = 0 dBu, Output = 17.7 dBu (set by Trim Pot on the rear panel)” for the BAL2UNBAL board, which can only be the level at the speaker. The amp tests then use −17.7 dBu in, consistent with the trim attenuating about 18 dB.</li>
   <li><b>One board, two builds.</b> The SA-AMS2-AMP BOM fits 33 µH / 0.22 µF filters, the 470 µF output capacitors (C64/C65) and R21, so the two outputs play L and R into two speakers. The SA-QUBEAMP BOM instead fits 22 µH / 0.68 µF, bypasses the output capacitors with 0R (R66/R67) and feeds RIGHT from LEFT_N (R20): one speaker bridged between OUT_1_P and OUT_2_N. The AMS2 build also straps JACK_INSERT low (R73 0R) and changes the A/B/C_SEL straps (R92/R94 fitted, R45/R47 DNI).</li>
   <li><b>The board is called “Universal Amplifier Board”.</b> The schematic title is UNI-AMP-ISS3; the folder is QUBE; the BOM calls it SA-AMS2-AMP. One board serves the QUBE speaker and the AMS2.</li>
   <li><b>AMS2-N turns the uNet into a receiver only.</b> The parameter sheet's “AMS2 Modification” column renames Mode1 “AES67 Monitor”, sets ActiveStreams to 0 and enables only Digital Out 1-2 (LEFT/RIGHT). The 32ME-N used the same sheet the other way round, sending streams.</li>
   <li><b>The same partial harness twice.</b> Both the AMS2-N and 32ME-N harnesses leave the uNet's MCLK, SPI, UART and GPIO unwired.</li>
   <li><b>The panel artwork is older than the drafting set.</b> The silk is dated MAR.17/15 and the front/rear drawings 22-04-15 / 24-02-15, so the rear drawing (ISS 2) predates the silk by a month.</li>
   <li><b>Privacy.</b> The test report names a customer contact; this plugin leaves the name out.</li></ol>`)
  + card('Assumptions', `<ul class="small"><li>VCC_P = 24 V (from the PSU candidate list and the 35 V capacitors), TPA3124 switching frequency and input impedance, and the PCM5100A full-scale level: ${inf}.</li><li>The exact routing of the front switches through P15 / the 74HC4053, and the headset amplifier: ${inf}.</li><li>Speaker impedance 8 Ω (the test's dummy load).</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>AMS2 - #Master/SILK/AMS2-FRONT &amp;  REAR-SILK(CURVE).cdr · MECHANICAL/*.pdf · FUNCTIONALBD/AMS2.pdf</li><li>AMS2 - #Master/AMS2-N - #Engineering/AMS2-Test Results.pdf, unet-standard-*.xlsx · AMS2 - power supply for networked version.xlsx</li><li>#QUBE #SERIES/QUBE - #Engineering #PROBLEM/QUBE - #PCB/QUBE - #ISS3 #schematic.pdf</li></ul>`);
}
SIM.register({
  id:'ams2', name:'AMS2 · 1RU stereo powered speaker monitor (2015|48)', duration:1,
  product:'AMS2', year:2015, family:'Monitors, meters & tools', folder:'AMS2 - #Master',
  summary:'A 1RU stereo monitor with built-in speakers. It plays a balanced analog pair or an AES pair; the AMS2-N variant adds a uNet AES67 network receiver. Inside, the QubeAmp “Universal Amplifier Board” runs a CS8416 and PCM5100A, an NE5532 mixer, and a TPA3124D2 class-D stage at 36 dB.',
  highlights:['Real front and rear silk','Level at every stage, from the schematic and the Audio Precision test','Class-D PWM and output filter in slow motion','AMS2-N AES67 receive configuration'],
  depth:'Hardware model',
  stepUnits:[{label:'1 PWM period (4 µs)',period:()=>1/K.FSW},{label:'1 AES frame',period:()=>1/FS},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.01,'10 ms'],[0.002,'2 ms (two 1 kHz cycles)'],[0.0002,'200 µs'],[0.00002,'20 µs (five PWM periods)']],
  defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second, frame by frame',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path & network config',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
