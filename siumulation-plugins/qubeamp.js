/* =====================================================================
   QubeAmp — “Universal Amplifier Board” UNI-AMP-ISS3 (Ward-Beck Systems, 2014|47–2016|49)
   The class-D amplifier PCBA used in the QUBE powered speaker (SA-QUBEAMP-MAIN) and the AMS2 (SA-AMS2-AMP).
   Plugin for the WBS Device Simulator (../siumulation.html)
   Sources used (all in this archive, under "#QUBE #SERIES"):
   - QUBE - #Engineering #PROBLEM/QUBE - #PCB/QUBE - #ISS3 #schematic.pdf (4 sheets, 3/27/2015)
   - QubeAmp and AMS2 - #Master/SA-QUBEAMP-MAIN MASTER BOM.xlsx, SA-AMS2-AMP MASTER BOM.xlsx
   - QubeAmp and AMS2 - #Master/QubeAmp-ISS3-PNL.zip (panel Gerbers, 15-Dec-2014|47) → assets/qubeamp-top-*.png
   - QUBE - #Engineering #PROBLEM/QUBE - #PCB/QUBE - #PNP/SA-AMS2-AMP-PNP.txt (centroids)
   - QubeAmp - #BOM #QUOTES #Problem/QubeAmp - #PNP #2016/**.prg (ISS1, ISS2, AMS2 variant, DontUse_OriginalFiles)
   - Qube & AMS2 Amp 103014.xlsx (CM quote sheet), Artaflex QT141207, Hansong quote (Jan 20 2015)
   - AMS2 - #Master/AMS2-N - #Engineering/AMS2-Test Results.pdf (AP SYS-2722 measurements of this board)
   - QUBE - #WIRING DIAGRAMS/qube-speaker-wiring diagram-iss1.dwg (text only)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const FS = 48000;
const inf = '<span class="tag-inf">inferred</span>';
const dBu = v => 20*Math.log10(Math.max(v,1e-9)/0.7746), fromdBu = d => 0.7746*Math.pow(10,d/20);

/* ---------------- the two builds (from the two master BOMs and the 2016 PnP programs) ---------------- */
const BUILDS = {
  qube:{ name:'SA-QUBEAMP-MAIN (QUBE speaker)', L:22e-6, C:0.68e-6, CO:null, out:'btl', r20:true, r21:false, jackDetect:true, bom:31.23577, sencore:[83.54,59.33], hansong:[30.75,29.9,29.3],
    note:'L1/L2 22 µH (L3A7-22), C60/C61 0.68 µF film, C64/C65 DNI with R66/R67 = 0R across them, R20 30R1 fitted (RIGHT ← LEFT_N), R21 DNI: one speaker bridged between OUT_1_P and OUT_2_N.' },
  ams2:{ name:'SA-AMS2-AMP (AMS2 monitor)', L:33e-6, C:0.22e-6, CO:470e-6, out:'se', r20:false, r21:true, jackDetect:false, bom:31.76203, sencore:[84.03,59.85], hansong:[33,31.9,31.3],
    note:'L1/L2 33 µH (L3A6-33), C60/C61 0.22 µF film, C64/C65 470 µF fitted, R66/R67 DNI, R21 30R1 fitted (RIGHT ← RIGHT_P), R20 DNI, R73 0R (JACK_INSERT tied low): two speakers, single-ended.' },
};
const K = {
  DAC_FS: 2.1,                              // PCM5100A full scale, Vrms (datasheet, inferred)
  DIV: 4.64/(6.81+4.64),                    // R87/(R99+R87) as drawn on sheet 2
  VCC: 24,                                  // VCC_P (inferred: 35 V parts, AMS2-N PSU sheet lists 24 V supplies)
  FSW: 250e3,                               // TPA3124D2 switching frequency (datasheet, inferred)
  GAINS: {'00':20,'01':26,'10':32,'11':36}, // GAIN1 GAIN0 → dB (TPA3124D2 table, inferred; '11' = 36 dB confirmed by the AP test)
  ZIN: {20:45e3,26:23e3,32:11.5e3,36:9e3},  // input impedance by gain (datasheet typicals, inferred)
  CIN: 1e-6,                                // C48/C49
};

/* ---------------- state ---------------- */
const D = { build:'qube', src:'aes', dbfs:-20, jack:-10, freq:1000, divider:false, h4:false, h5:false, load:8, jackIn:false, aesLock:true, pick:'U12', log:[] };
const B = () => BUILDS[D.build];
const gainCode = () => `${D.h5?0:1}${D.h4?0:1}`;        // H5 shorts GAIN1, H4 shorts GAIN0 to GND; R62/R63 pull up
const gainDb = () => K.GAINS[gainCode()];

/* ---------------- the signal chain ---------------- */
function chain(){
  const st=[], b=B(); let v;
  if (D.src==='aes'){
    const a = D.aesLock? Math.pow(10,D.dbfs/20):0; v=a*K.DAC_FS;
    st.push(['P1 AES_RX → T1 → CS8416 (hardware mode)', v, D.aesLock?`${D.dbfs} dBFS, I²S out`:'no lock → PCM5100A muted']);
    st.push(['PCM5100A → R14/R15 470R, C13/C14 2n2', v, `${K.DAC_FS} Vrms at 0 dBFS (${'datasheet, inferred'}), 154 kHz RC`]);
    if (D.divider) v*=K.DIV;
    st.push([D.divider?'R99 6K81 / R87 4K64 (DontUse_OriginalFiles)':'R99 0R, R87 DNI (as built)', v, D.divider?`× ${K.DIV.toFixed(3)}`:'divider removed in the 2016 programs and both BOMs']);
  } else {
    v=fromdBu(D.jack); st.push(['P8 JACK_L / JACK_R (analog)', v, 'into the 74HC4053 via R48/R49 20K']);
  }
  st.push(['74HC4053 → NE5532 U8/U9 (20K/20K, −1, 22p)', v, 'twice inverted → LEFT; U4B makes LEFT_N']);
  const zin=K.ZIN[gainDb()], fin=1/(2*Math.PI*K.CIN*zin);
  st.push([B().r20?'R19/R20 30R1: L_IN = LEFT, R_IN = LEFT_N':'R19/R21 30R1: L_IN = LEFT, R_IN = RIGHT', v, `C48/C49 1 µF into ≈${(zin/1e3).toFixed(1)} kΩ → ${fin.toFixed(1)} Hz (${'inferred'})`]);
  const g=Math.pow(10,gainDb()/20), vpkMax=(K.VCC/2)*0.9;      // each output swings about VCC/2 (inferred 90 % of rail)
  let half=v*g, clip=false; if (half*Math.SQRT2>vpkMax){ half=vpkMax/Math.SQRT2; clip=true; }
  st.push([`TPA3124D2, GAIN1:0 = ${gainCode()} → ${gainDb()} dB`, half, `per output${clip?' — CLIPPING':''}; R62/R63 pull-ups, H4/H5 ${D.h4||D.h5?'fitted':'open'}`]);
  let vspk, P, R=D.load;
  if (b.out==='btl'){ vspk=2*half; P=vspk*vspk/R; st.push(['L1/L2 + C60/C61 → speaker across OUT_1_P / OUT_2_N', vspk, `bridged: ${P.toFixed(2)} W into ${R} Ω (each half sees ${R/2} Ω)`]); }
  else { vspk=half; P=vspk*vspk/R; st.push(['L1/L2 + C60/C61 → C64/C65 470 µF → speakers', vspk, `${P.toFixed(2)} W per channel into ${R} Ω; HPF ${(1/(2*Math.PI*470e-6*R)).toFixed(1)} Hz`]); }
  const muted = D.jackIn && b.jackDetect;     // jack-insert drives MUTE in the QUBE build — inferred
  return {st, half, vspk: muted?0:vspk, P: muted?0:P, clip, g, muted};
}
function lc(){ const b=B(); const f0=1/(2*Math.PI*Math.sqrt(b.L*b.C)); const Rh = b.out==='btl'? D.load/2 : D.load; const Q=Rh*Math.sqrt(b.C/b.L); return {f0,Q}; }
function response(f){
  const b=B(), Rh = b.out==='btl'? D.load/2 : D.load, w=2*Math.PI*f;
  const zr=Rh/(1+(w*Rh*b.C)**2), zx=-(w*Rh*Rh*b.C)/(1+(w*Rh*b.C)**2);
  let h = Math.hypot(zr,zx)/Math.hypot(zr, zx+w*b.L);
  if (b.CO) h*= f/Math.hypot(f, 1/(2*Math.PI*b.CO*D.load));
  const fin=1/(2*Math.PI*K.CIN*K.ZIN[gainDb()]); h*= f/Math.hypot(f,fin);
  return h;
}
function leds(){ // sheet 4: LED_R = JACK_INSERT | AUD_VAL ; LED_G = JACK_INSERT | AUD_VAL′ (Q1 inverts); AUD_VAL high = not valid
  const ji = D.jackIn && B().jackDetect, valid = D.src==='aes' && D.aesLock;
  return { g: ji || valid, r: ji || (D.src==='aes' && !D.aesLock) };
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,trace:tr}); if (D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  build(b){ act('Load the '+BUILDS[b].name+' build', tr=>{ D.build=b; tr(BUILDS[b].note); const l=lc(); tr(`Output filter ${(BUILDS[b].L*1e6).toFixed(0)} µH / ${(BUILDS[b].C*1e6).toFixed(2)} µF → f0 ${(l.f0/1e3).toFixed(1)} kHz, Q ${l.Q.toFixed(2)} into ${b==='qube'?D.load/2:D.load} Ω per half`); }); },
  jumper(h){ act(`${D[h]?'Remove':'Fit'} link ${h.toUpperCase()}`, tr=>{ D[h]=!D[h]; tr(`${h==='h4'?'H4 shorts GAIN0 (pin 18)':'H5 shorts GAIN1 (pin 17)'} to GND over the 10K pull-up ${h==='h4'?'R62':'R63'}`); tr(`GAIN1:GAIN0 = ${gainCode()} → ${gainDb()} dB (TPA3124D2 gain table, ${'inferred'}); input impedance ≈ ${(K.ZIN[gainDb()]/1e3).toFixed(1)} kΩ`); }); },
  divider(){ act(D.divider?'Back to the as-built 0R / DNI':'Fit the original 6K81 / 4K64 divider', tr=>{ D.divider=!D.divider; tr(D.divider? '“DontUse_OriginalFiles/Pick Place for QubeAmp-ISS2-T.prg” places R99 = R86 = 6K81 and R87 = 4K64: DIGITAL_L/R drop 7.85 dB':'Current programs and both BOMs: R86/R99 = 0R, R87/R88 DNI — the full DAC level reaches the mixer'); }); },
  jackIn(){ act(D.jackIn?'Unplug the jack':'Plug a jack into P8', tr=>{ D.jackIn=!D.jackIn; if (B().jackDetect){ tr(`JACK_INSERT ${D.jackIn?'high (R72/R101 100R to 3V3, contact opens)':'low'} → D2 lights LED_R and D4 lights LED_G: amber`); tr(D.jackIn?'Speaker muted (MUTE driven by the jack detect, '+'inferred'+')':'Speaker back'); } else tr('AMS2 build: R73 = 0R holds JACK_INSERT low, R72/R101 DNI — nothing happens on this board'); }); },
  lock(){ act(D.aesLock?'Remove the AES signal':'Restore the AES signal', tr=>{ D.aesLock=!D.aesLock; tr(`CS8416 AUDIO pin ${D.aesLock?'low (valid) → Q1 2N4401 → AUD_VAL′ high → green':'high (not valid) → red; PCM5100A output silent'}`); }); },
  pick(p){ D.pick=p; SIM.refresh(); },
};

/* ---------------- board drawing (ISS3 Gerbers, 643 × 343 px at 150 dpi = 4.29″ × 2.29″ window) ---------------- */
const ASSET='siumulation-plugins/assets/';
const PARTS = { // centroids from SA-AMS2-AMP-PNP.txt (mil)
  U2:[475.5,1355,'U2 CS8416','AES3 receiver in hardware mode, I²S out. AUDIO pin → AUD_VAL (LOCK LED).'],
  U3:[296.1,759.3,'U3 PCM5100A','32-bit DAC, I²S (FMT = GND), de-emphasis off, normal filter, XSMT high (unmuted). 2.1 Vrms full scale.'],
  T1:[1122.5,1410.3,'T1 AES pulse transformer','AES_RX_P/N isolation into the CS8416.'],
  U10:[1961.2,1491.2,'U10 74HC4053','Three 2:1 analog switches choosing JACK_L/JACK_R/LEFT_FB. Select lines A/B/C_SEL on P15, strapped by R45–R47 / R92–R94 (different in each build).'],
  U8:[1599.9,1076.8,'U8 NE5532','Unity inverting stages (20K/20K ∥ 22p) on VCC_P with VCC_P/2 bias.'],
  U9:[2277.4,1067.9,'U9 NE5532','Right-channel inverting stages → RIGHT_P.'],
  U4:[1852,892.1,'U4 NE5532','U4A buffers VCC_P/2; U4B makes LEFT_N, the inverted left used to bridge the QUBE speaker.'],
  U12:[3354.7,778.5,'U12 TPA3124D2','Stereo class-D, single-ended outputs, gain set by GAIN0/GAIN1 (R62/R63 pull-ups, H4/H5 links).'],
  L1:[2889,960,'L1 output inductor','33 µH (AMS2) or 22 µH (QUBE), radial, shielded.'],
  L2:[3820,960,'L2 output inductor','As L1, right channel.'],
  U13:[1360.4,230.3,'U13 R-78E3.3-0.5','Recom switching regulator, VCC_P → 3.3 V for the CS8416, DAC and logic.'],
  H4:[3195,1420,'H4 GAIN0 link','Fit to pull GAIN0 low.'], H5:[3540,1420,'H5 GAIN1 link','Fit to pull GAIN1 low.'],
  P10:[3355,305,'P10 L_IN / R_IN','Amplifier inputs (header).'], P11:[3365,1890,'P11 OUT_1_P / OUT_2_N','Speaker outputs.'], P14:[2350,160,'P14 VCC_P','Supply in.'], P1:[1075,1945,'P1 AES_RX','AES input.'],
};
const px = mil => (mil/1000+0.02)*150, py = mil => (2.27-mil/1000)*150;
function boardSVG(t){
  const c=chain(), l=leds();
  let s=`<svg viewBox="0 0 643 343" style="width:100%;max-width:900px;display:block;border-radius:6px" role="img" aria-label="QubeAmp ISS3 top side from the Gerbers"><rect width="643" height="343" fill="#124f2d"/>
    <image href="${ASSET}qubeamp-top-copper.png" width="643" height="343"/><image href="${ASSET}qubeamp-top-pads.png" width="643" height="343"/><image href="${ASSET}qubeamp-top-silk.png" width="643" height="343"/>`;
  const heat = Math.min(1, (c.P||0)/15);
  s+=`<circle cx="${px(3354.7)}" cy="${py(778.5)}" r="${18+16*heat}" fill="rgba(255,120,40,${0.15+0.45*heat})"><title>U12 dissipation (illustrative)</title></circle>`;
  for (const k in PARTS){ const [x,y,tt]=PARTS[k]; const sel=D.pick===k;
    s+=`<g class="part" data-p="${k}" style="cursor:pointer"><circle cx="${px(x)}" cy="${py(y)}" r="${k.startsWith('H')?9:16}" fill="${sel?'rgba(90,169,230,.3)':'transparent'}" stroke="${sel?'#5aa9e6':'rgba(255,255,255,0)'}" stroke-width="2.5"/><title>${tt}</title></g>`; }
  ['h4','h5'].forEach(h=>{ const p=PARTS[h.toUpperCase()]; if (D[h]) s+=`<rect x="${px(p[0])-6}" y="${py(p[1])-10}" width="12" height="20" rx="3" fill="#222" stroke="#aaa"/>`; s+=`<rect class="jmp" data-h="${h}" x="${px(p[0])-12}" y="${py(p[1])-16}" width="24" height="32" fill="transparent" style="cursor:pointer"><title>${h.toUpperCase()} link — click to ${D[h]?'remove':'fit'}</title></rect>`; });
  if (B().out==='se'){ s+=`<text x="${px(2889)}" y="${py(1300)}" font-size="10" fill="#ffe">C64 470µ</text><text x="${px(3700)}" y="${py(1300)}" font-size="10" fill="#ffe">C65 470µ</text>`; }
  else s+=`<text x="${px(2889)-10}" y="${py(1300)}" font-size="10" fill="#ffe">R66 0R</text><text x="${px(3700)}" y="${py(1300)}" font-size="10" fill="#ffe">R67 0R</text>`;
  s+=`<circle cx="610" cy="20" r="8" fill="${l.g&&l.r?'#ffb43a':l.g?'#7dff6a':l.r?'#ff4a3a':'#333'}"/><text x="598" y="40" font-size="10" fill="#cfe" text-anchor="end">LED_G/LED_R (P12)</text>`;
  return s+'</svg>';
}
function bindBoard(root){ root.querySelectorAll('.part').forEach(g=>g.addEventListener('click',()=>A.pick(g.dataset.p))); root.querySelectorAll('.jmp').forEach(g=>g.addEventListener('click',e=>{ e.stopPropagation(); A.jumper(g.dataset.h); })); }
function controls(){
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
   <label class="small">Build <select id="bd">${Object.keys(BUILDS).map(k=>`<option value="${k}" ${k===D.build?'selected':''}>${BUILDS[k].name}</option>`).join('')}</select></label>
   <label class="small">Source <select id="sr"><option value="aes" ${D.src==='aes'?'selected':''}>AES (P1)</option><option value="jack" ${D.src==='jack'?'selected':''}>analog jack (P8)</option></select></label>
   <label class="small">AES <input type="range" id="lv" min="-60" max="0" value="${D.dbfs}"> <span class="mono" id="lvv">${D.dbfs} dBFS</span></label>
   <label class="small">Jack <input type="range" id="jk" min="-40" max="10" value="${D.jack}"> <span class="mono" id="jkv">${D.jack} dBu</span></label>
   <label class="small">Tone <select id="fq">${[50,100,1000,10000,20000].map(f=>`<option ${f===D.freq?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
   <label class="small">Speaker <select id="ld">${[4,6,8].map(r=>`<option ${r===D.load?'selected':''}>${r}</option>`).join('')}</select> Ω</label></div>
   <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button id="h4" class="${D.h4?'on':''}">H4 link</button><button id="h5" class="${D.h5?'on':''}">H5 link</button><button id="dv" class="${D.divider?'on':''}">original 6K81/4K64 divider</button><button id="jki" class="${D.jackIn?'on':''}">jack inserted</button><button id="lk" class="${D.aesLock?'on':''}">AES lock</button></div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s);
  q('#bd').onchange=e=>A.build(e.target.value); q('#sr').onchange=e=>{ D.src=e.target.value; SIM.refresh(); };
  q('#lv').oninput=e=>{ D.dbfs=+e.target.value; q('#lvv').textContent=D.dbfs+' dBFS'; SIM.refresh(); };
  q('#jk').oninput=e=>{ D.jack=+e.target.value; q('#jkv').textContent=D.jack+' dBu'; SIM.refresh(); };
  q('#fq').onchange=e=>{ D.freq=+e.target.value; SIM.refresh(); }; q('#ld').onchange=e=>{ D.load=+e.target.value; SIM.refresh(); };
  q('#h4').onclick=()=>A.jumper('h4'); q('#h5').onclick=()=>A.jumper('h5'); q('#dv').onclick=()=>A.divider(); q('#jki').onclick=()=>A.jackIn(); q('#lk').onclick=()=>A.lock();
}
function chainTable(){ const c=chain(); return `<table class="kv"><tr><th>Stage</th><th>level</th><th>note</th></tr>${c.st.map(s=>`<tr><td>${s[0]}</td><td class="mono">${s[1]>0?dBu(s[1]).toFixed(1)+' dBu':'—'}</td><td class="small">${s[2]}</td></tr>`).join('')}</table>
  <p class="small">Speaker: <b>${c.P.toFixed(2)} W</b>${c.clip?' <b style="color:var(--bad)">clipping</b>':''}${c.muted?' (muted by the jack)':''} · response at ${D.freq} Hz ${(20*Math.log10(response(D.freq))).toFixed(2)} dB</p>`; }

/* ---------------- timeline ---------------- */
function wave(cx,X,t0,t1,y,h,pk,f,col,scale,clip,inv){ const span=t1-t0, pw=X(t1)-X(t0);
  if (span*f>pw/3){ cx.fillStyle=col; cx.globalAlpha=.3; const a=Math.min(1,pk/scale); cx.fillRect(X(t0),y+h/2-a*(h/2-2),pw,2*a*(h/2-2)); cx.globalAlpha=1; return; }
  cx.strokeStyle=col; cx.beginPath(); for (let i=0;i<=600;i++){ const tt=t0+span*i/600; let v=(inv?-1:1)*pk*Math.sin(2*Math.PI*f*tt); if (clip) v=Math.max(-clip,Math.min(clip,v)); const yy=y+h/2-v/scale*(h/2-2); i?cx.lineTo(X(tt),yy):cx.moveTo(X(tt),yy); } cx.stroke(); }
function pwm(cx,X,t0,t1,y,h,amp,inv,col){ const T=1/K.FSW, n0=Math.floor(t0/T), n1=Math.ceil(t1/T);
  if (n1-n0>400){ SIM.pulses(cx,X,t0,t1,y,h,T,0,T/2,col,`PWM ≈ ${K.FSW/1e3} kHz (inferred)`); return; }
  cx.fillStyle=col; for (let n=n0;n<=n1;n++){ const tt=n*T; const v=(inv?-1:1)*amp*Math.sin(2*Math.PI*D.freq*tt); const d=Math.max(0.02,Math.min(0.98,0.5+v/K.VCC)); cx.fillRect(X(tt),y+4,Math.max(1,X(tt+d*T)-X(tt)),h-8); } }
function lanes(){
  const css=SIM.css, c=chain(), b=B(), L=[], pk=c.half*Math.SQRT2, cl=(K.VCC/2)*0.9;
  if (D.src==='aes') L.push({label:'AES3 frames → CS8416', h:22, draw(cx,X,t0,t1,y,h){ SIM.pulses(cx,X,t0,t1,y,h,1/FS,0,0.5/FS,css('--accent2'),'AES frames'); }});
  L.push({label:'L_IN (into the TPA3124)', h:30, draw(cx,X,t0,t1,y,h){ wave(cx,X,t0,t1,y,h,c.half/c.g*Math.SQRT2,D.freq,css('--accent2'),1.5); }});
  L.push({label:'LOUT PWM', h:26, draw(cx,X,t0,t1,y,h){ pwm(cx,X,t0,t1,y,h,pk,false,css('--warn')); }});
  L.push({label:b.out==='btl'?'ROUT PWM (driven from LEFT_N)':'ROUT PWM (right channel)', h:26, draw(cx,X,t0,t1,y,h){ pwm(cx,X,t0,t1,y,h,pk,b.out==='btl',css('--accent2')); }});
  L.push({label:`OUT_1_P after ${(b.L*1e6).toFixed(0)} µH / ${(b.C*1e6).toFixed(2)} µF`, h:34, draw(cx,X,t0,t1,y,h){ wave(cx,X,t0,t1,y,h,pk*response(D.freq),D.freq,css('--accent'),K.VCC/2,cl); }});
  L.push({label:b.out==='btl'?'Speaker voltage (OUT_1_P − OUT_2_N)':'Speaker L (after 470 µF)', h:40, draw(cx,X,t0,t1,y,h){ wave(cx,X,t0,t1,y,h,c.muted?0:(b.out==='btl'?2:1)*pk*response(D.freq),D.freq,c.clip?css('--bad'):css('--accent'),K.VCC,b.out==='btl'?2*cl:cl); }});
  L.push({label:'LED_G / LED_R', h:20, draw(cx,X,t0,t1,y,h){ const l=leds(); cx.fillStyle='#3fbf5f'; if (l.g) cx.fillRect(X(t0),y+2,X(t1)-X(t0),7); cx.fillStyle='#e0453a'; if (l.r) cx.fillRect(X(t0),y+11,X(t1)-X(t0),7); }});
  return L;
}

/* ================================================================ VIEWS ================================================================ */
const card=(t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
function viewSim(m){
  window.__qubeampActive=false;
  m.innerHTML = card('The board (ISS3 Gerbers): click a part; click H4/H5 to fit or remove the gain links', '<div id="bd0"></div>') + card('Bench', controls())
   + `<div class="grid2">${card('Level at each stage','<div id="ch"></div>')}${card('Part / last action','<div id="pi" class="small"></div><div id="tr" class="log" style="margin-top:6px"></div>')}</div>`
   + card('Timeline: one second, zoomable (zoom to 20 µs for the PWM)','<canvas id="tl"></canvas>');
  bindControls(m);
  SIM.on('time',()=>{ m.querySelector('#bd0').innerHTML=boardSVG(SIM.t); bindBoard(m.querySelector('#bd0')); m.querySelector('#ch').innerHTML=chainTable();
    const p=PARTS[D.pick]; m.querySelector('#pi').innerHTML=`<b>${p[2]}</b><p>${p[3]}</p><p class="muted">Build: ${B().note}</p>`;
    m.querySelector('#tr').innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); });
}
const LESSONS=[
  {title:'One board, two products', body:`<p>The QubeAmp PCB (“Universal Amplifier Board”, UNI-AMP-ISS3) was built two ways: <b>SA-QUBEAMP-MAIN</b> for the QUBE speaker and <b>SA-AMS2-AMP</b> for the AMS2 rack monitor. The difference is only which parts are fitted. This tutorial is a bench session that finds those differences.</p>`, check:()=>true, auto:true},
  {title:'1 · The AMS2 build and its test', body:`<p>Load the <b>SA-AMS2-AMP</b> build. Use the analog jack at <b>−17.7 dBu</b> into an 8 Ω load: the AP test measured <b>+18.3 dBu</b> out (about 5 W). Check the chain table.</p><p><b>Goal:</b> AMS2 build, jack source at −17.7 ≈ −18 dBu, 8 Ω.</p>`, check:()=>D.build==='ams2'&&D.src==='jack'&&D.jack===-18&&D.load===8, hint:'Build → SA-AMS2-AMP, Source → jack, slider to −18.'},
  {title:'2 · Where the 36 dB comes from', body:`<p>Fit the <b>H4</b> link: GAIN0 goes low and the gain drops to 32 dB. Remove it again. With both links open, the R62/R63 pull-ups give the 36 dB the test measured.</p><p><b>Goal:</b> both links open after trying H4.</p>`, check:()=>!D.h4&&!D.h5&&D.log.some(e=>/link H4/.test(e.name)), hint:'Click H4 twice.'},
  {title:'3 · The QUBE build', body:`<p>Load <b>SA-QUBEAMP-MAIN</b>. The output capacitors are bypassed with 0R, and the right input is fed from LEFT_N, so the two halves drive one speaker in anti-phase (bridged). Zoom to 20 µs: the two PWM lanes are mirror images.</p><p><b>Goal:</b> QUBE build.</p>`, check:()=>D.build==='qube', hint:'Build menu.'},
  {title:'4 · Bridged power', body:`<p>With the same input, the bridged QUBE delivers four times the power of one AMS2 channel into the same load, until it clips at twice the voltage swing. Push the AES level until it clips.</p><p><b>Goal:</b> QUBE clipping on AES.</p>`, check:()=>D.build==='qube'&&D.src==='aes'&&chain().clip, hint:'AES slider up.'},
  {title:'5 · The missing divider', body:`<p>Fit the <b>original 6K81/4K64 divider</b>. It is on the schematic and in the “DontUse_OriginalFiles” pick-and-place program, but the current programs and both BOMs replace it with 0R / DNI: 7.85 dB more level from the DAC.</p><p><b>Goal:</b> fit and remove it.</p>`, check:()=>!D.divider&&D.log.some(e=>/original 6K81/.test(e.name)), hint:'Click the divider button twice.'},
  {title:'6 · LEDs and jack detect', body:`<p>On the QUBE build, plug a jack into P8: both LED colours light (amber) through D2/D4. Then try it on the AMS2 build: R73 = 0R ties JACK_INSERT low, so nothing happens.</p><p><b>Goal:</b> jack inserted on the AMS2 build.</p>`, check:()=>D.jackIn&&D.build==='ams2', hint:'Jack button, then Build → AMS2.'},
  {title:'Done', body:'<p>The Findings tab lists what the BOMs, programs and quotes reveal, including the price picture.</p>', check:()=>true, auto:true},
];
let LI=0;
function viewTut(m){
  window.__qubeampActive=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial: the board on the bench (from the BOMs, schematic and AP test; no manual exists)','<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>')}<div class="card" id="lesson"></div></div><div>${card('Bench','<div id="bd0"></div><div style="margin-top:6px">'+controls()+'</div><div id="ch" style="margin-top:6px"></div>')}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#bd0').innerHTML=boardSVG(SIM.t); bindBoard(m.querySelector('#bd0')); m.querySelector('#ch').innerHTML=chainTable();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===LI?'font-weight:700;color:var(--accent)':''}">${l.title}${i<LI?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ LI=+li.dataset.i; draw(); });
    const L=LESSONS[LI], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${LI?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${LI<LESSONS.length-1?'':'disabled'}>Next ▶</button></div>`;
    m.querySelector('#pv').onclick=()=>{ LI=Math.max(0,LI-1); draw(); }; m.querySelector('#nx').onclick=()=>{ LI=Math.min(LESSONS.length-1,LI+1); draw(); }; };
  SIM.on('time',draw);
}
function viewSecond(m){
  window.__qubeampActive=false;
  m.innerHTML=card('One second on the board','<div id="lad"></div>')+`<div class="grid2">${card('Frequency response of the build (model)','<canvas id="fr"></canvas><div id="frt" class="small"></div>')}${card('One PWM period at the playhead','<canvas id="pw"></canvas>')}</div>`;
  SIM.on('time',()=>{ const t=SIM.t, l=lc();
    const rows=[['AES3 frames / CS8416 samples','48,000','20.83 µs'],['I²S BCK (64 fs)','3.072 M','325.5 ns'],['TPA3124 PWM periods ('+'inferred'+')',K.FSW.toLocaleString(),SIM.fmtDur(1/K.FSW)],['PWM periods per 1 kHz cycle',(K.FSW/1000).toFixed(0),''],['Output filter resonance','',`${(l.f0/1e3).toFixed(1)} kHz, Q ${l.Q.toFixed(2)}`]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period / value</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join('')}</table>`;
    const {c,w}=SIM.canvas(m.querySelector('#fr'),200); const fx=f=>40+(Math.log10(f)-1)/3.6*(w-60), dy=db=>20+(6-db)/24*150;
    c.strokeStyle=SIM.css('--grid'); [6,0,-3,-6,-12,-18].forEach(d=>{ c.beginPath(); c.moveTo(40,dy(d)); c.lineTo(w-20,dy(d)); c.stroke(); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(d+' dB',4,dy(d)+3); });
    [20,100,1000,10000,40000].forEach(f=>c.fillText(f>=1000?f/1000+'k':f, fx(f)-6, 195));
    c.strokeStyle=SIM.css('--accent2'); c.lineWidth=2; c.beginPath(); for (let i=0;i<=300;i++){ const f=10*Math.pow(10,3.6*i/300); const db=20*Math.log10(response(f)); i?c.lineTo(fx(f),dy(db)):c.moveTo(fx(f),dy(db)); } c.stroke(); c.lineWidth=1;
    m.querySelector('#frt').innerHTML=`${B().name}: LC f0 = 1/(2π√(LC)) = ${(l.f0/1e3).toFixed(1)} kHz; Q = R·√(C/L) = ${l.Q.toFixed(2)} with ${B().out==='btl'?D.load/2:D.load} Ω per half${B().CO?`; 470 µF into ${D.load} Ω → ${(1/(2*Math.PI*470e-6*D.load)).toFixed(1)} Hz high-pass`:'; no output capacitor (bridged)'}. AMS2 measured: &lt; 1 dB 100 Hz–10 kHz, &lt; 3 dB 50 Hz–15 kHz.`;
    const p=SIM.canvas(m.querySelector('#pw'),200), c2=chain(), pk=c2.half*Math.SQRT2, v=pk*Math.sin(2*Math.PI*D.freq*t);
    [[v,SIM.css('--warn'),40],[B().out==='btl'?-v:v,SIM.css('--accent2'),110]].forEach(([vv,col,y0])=>{ const d=Math.max(0.02,Math.min(0.98,0.5+vv/K.VCC)); p.c.strokeStyle=col; p.c.lineWidth=2; p.c.beginPath(); p.c.moveTo(20,y0+50); p.c.lineTo(20,y0); p.c.lineTo(20+d*(p.w-40),y0); p.c.lineTo(20+d*(p.w-40),y0+50); p.c.lineTo(p.w-20,y0+50); p.c.stroke(); p.c.fillStyle=SIM.css('--ink'); p.c.font='11px sans-serif'; p.c.fillText(`${y0===40?'LOUT':'ROUT'} duty ${(d*100).toFixed(1)} %`, p.w-140, y0+20); });
    p.c.lineWidth=1; });
}
const BLK={
  aes:{x:10,y:20,w:150,h:70,t:'AES in (P1, T1)',s:['CS8416, hardware mode'],d:'Sheet 1. Transformer-isolated AES3 into the CS8416; I²S to the DAC.'},
  dac:{x:190,y:20,w:150,h:70,t:'PCM5100A',s:['2.1 Vrms FS','470R/2n2 → P7'],d:'DIGITAL_L/R go off-board on P7 and come back as JACK_L/R or via the selector. The schematic divider is not fitted.'},
  jk:{x:10,y:130,w:150,h:70,t:'Jack in (P8)',s:['JACK_L/R, JACK_INSERT'],d:'Analog input and insert detect. The detect is strapped off in the AMS2 build.'},
  mix:{x:190,y:130,w:150,h:70,t:'74HC4053 + NE5532',s:['select, invert, LEFT_N'],d:'Sheet 2. Single-supply op-amps around VCC_P/2. U4B produces LEFT_N for bridging.'},
  sel:{x:370,y:70,w:150,h:80,t:'Build straps',s:['R19/R20/R21 30R1','R66/R67, C64/C65'],d:'QUBE: R20 (RIGHT ← LEFT_N), R66/R67 0R. AMS2: R21 (RIGHT ← RIGHT_P), C64/C65 470 µF.'},
  amp:{x:550,y:70,w:150,h:80,t:'TPA3124D2',s:['GAIN0/1 straps → 36 dB','≈250 kHz PWM'],d:'Sheet 3. Single-ended stereo class-D, bootstrap caps C55/C56 220 nF.'},
  out:{x:730,y:40,w:150,h:70,t:'QUBE: 1 speaker',s:['bridged, 22 µH/0.68 µF'],d:'Speaker across OUT_1_P and OUT_2_N.'},
  out2:{x:730,y:130,w:150,h:70,t:'AMS2: 2 speakers',s:['SE, 33 µH/0.22 µF, 470 µF'],d:'Each output through its 470 µF capacitor to its own speaker.'},
  pwr:{x:370,y:190,w:150,h:60,t:'P14 VCC_P → R-78E3.3',s:['VCC_P/2 from R70/R71'],d:'Sheet 4.'},
};
const WIRES=[['aes','dac'],['dac','mix','P7 → off-board'],['jk','mix'],['mix','sel'],['sel','amp'],['amp','out'],['amp','out2'],['pwr','amp']];
function viewBlock(m){
  window.__qubeampActive=false; let sel='amp';
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)','<div id="bd"></div>')}${card('Block','<div id="bi"></div>')}</div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 890 260" style="width:100%"><defs><marker id="aq" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLK[a],B_=BLK[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; }; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#aq)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLK){ const b=BLK[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); }); m.querySelector('#bi').innerHTML=`<h3>${BLK[sel].t}</h3><p>${BLK[sel].d}</p>`; };
  draw();
}
function viewSchem(m){
  window.__qubeampActive=false; let i=0;
  const sheets=[
    {n:'1 · Output stage, both builds', svg:()=>{ let s=''; [['QUBE (bridged)',BUILDS.qube,40],['AMS2 (single-ended)',BUILDS.ams2,460]].forEach(([t,b,x0])=>{ s+=`<text x="${x0}" y="30" font-size="13" font-weight="700" fill="var(--ink)">${t}</text>
      <polygon points="${x0},60 ${x0},140 ${x0+60},100" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x0+4}" y="104" font-size="10" fill="var(--ink)">LOUT</text>
      <polygon points="${x0},200 ${x0},280 ${x0+60},240" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x0+4}" y="244" font-size="10" fill="var(--ink)">ROUT</text>
      <line x1="${x0+60}" y1="100" x2="${x0+90}" y2="100" stroke="var(--ink)"/><path d="M${x0+90},100 q8,-12 16,0 q8,-12 16,0 q8,-12 16,0" fill="none" stroke="var(--ink)"/><text x="${x0+92}" y="84" font-size="10" fill="var(--accent2)">L1 ${(b.L*1e6).toFixed(0)}µ</text>
      <line x1="${x0+60}" y1="240" x2="${x0+90}" y2="240" stroke="var(--ink)"/><path d="M${x0+90},240 q8,-12 16,0 q8,-12 16,0 q8,-12 16,0" fill="none" stroke="var(--ink)"/><text x="${x0+92}" y="224" font-size="10" fill="var(--accent2)">L2 ${(b.L*1e6).toFixed(0)}µ</text>
      <line x1="${x0+138}" y1="100" x2="${x0+230}" y2="100" stroke="var(--ink)"/><line x1="${x0+138}" y1="240" x2="${x0+230}" y2="240" stroke="var(--ink)"/>
      <line x1="${x0+160}" y1="100" x2="${x0+160}" y2="160" stroke="var(--ink)"/><line x1="${x0+150}" y1="160" x2="${x0+170}" y2="160" stroke="var(--ink)"/><line x1="${x0+150}" y1="166" x2="${x0+170}" y2="166" stroke="var(--ink)"/><text x="${x0+174}" y="166" font-size="10" fill="var(--accent2)">C60 ${(b.C*1e6).toFixed(2)}µ</text>
      <line x1="${x0+160}" y1="240" x2="${x0+160}" y2="186" stroke="var(--ink)"/><line x1="${x0+150}" y1="186" x2="${x0+170}" y2="186" stroke="var(--ink)"/><line x1="${x0+150}" y1="180" x2="${x0+170}" y2="180" stroke="var(--ink)"/><text x="${x0+174}" y="186" font-size="10" fill="var(--accent2)">C61</text><line x1="${x0+160}" y1="166" x2="${x0+160}" y2="180" stroke="var(--ink)"/><line x1="${x0+160}" y1="173" x2="${x0+128}" y2="173" stroke="var(--ink)"/><text x="${x0+98}" y="177" font-size="10" fill="var(--ink2)">GND</text>
      <text x="${x0+190}" y="92" font-size="10" fill="var(--ink)">${b.CO?'C64 470µ':'R66 0R'}</text><text x="${x0+190}" y="232" font-size="10" fill="var(--ink)">${b.CO?'C65 470µ':'R67 0R'}</text>
      ${b.out==='btl'?`<rect x="${x0+230}" y="140" width="40" height="60" fill="none" stroke="var(--ink)"/><text x="${x0+234}" y="174" font-size="10" fill="var(--ink)">SPK</text><line x1="${x0+230}" y1="100" x2="${x0+250}" y2="100" stroke="var(--ink)"/><line x1="${x0+250}" y1="100" x2="${x0+250}" y2="140" stroke="var(--ink)"/><line x1="${x0+250}" y1="200" x2="${x0+250}" y2="240" stroke="var(--ink)"/><text x="${x0}" y="320" font-size="11" fill="var(--ink2)">R_IN ← LEFT_N via R20: ROUT is LOUT inverted</text>`
        :`<rect x="${x0+230}" y="80" width="40" height="40" fill="none" stroke="var(--ink)"/><text x="${x0+234}" y="104" font-size="10" fill="var(--ink)">SPK L</text><rect x="${x0+230}" y="220" width="40" height="40" fill="none" stroke="var(--ink)"/><text x="${x0+234}" y="244" font-size="10" fill="var(--ink)">SPK R</text><text x="${x0}" y="320" font-size="11" fill="var(--ink2)">R_IN ← RIGHT_P via R21: independent stereo</text>`}`; }); return s; }},
    {n:'2 · Gain straps', svg:()=>`<text x="40" y="40" font-size="12" fill="var(--ink)">U12 pin 18 GAIN0 ← R62 10K to VCC_P; R97 (DNI) to GND; link H4 to GND</text><text x="40" y="62" font-size="12" fill="var(--ink)">U12 pin 17 GAIN1 ← R63 10K to VCC_P; R98 (DNI) to GND; link H5 to GND</text>
      <text x="40" y="100" font-size="12" font-weight="700" fill="var(--ink)">GAIN1 GAIN0 → gain (TPA3124D2 table, ${'inferred'})</text>${Object.entries(K.GAINS).map(([k,v],j)=>`<text x="60" y="${124+j*20}" font-size="12" fill="${k===gainCode()?'var(--accent)':'var(--ink2)'}" font-family="var(--mono)">${k[0]}  ${k[1]}  → ${v} dB ${k==='11'?'(as built; AP test: −17.7 dBu → +18.3 dBu)':''}</text>`).join('')}`},
    {n:'3 · DAC level', svg:()=>`<text x="40" y="40" font-size="12" fill="var(--ink)">Schematic sheet 2: DAC_L → R99 6K81 → DIGITAL_L, R87 4K64 to GND (× 0.405, −7.85 dB); same for R86/R88.</text><text x="40" y="64" font-size="12" fill="var(--ink)">DontUse_OriginalFiles ISS2 program: R99 6K81, R86 6K81, R87 4K64 (matches the schematic).</text><text x="40" y="88" font-size="12" fill="var(--ink)">QubeAmp-ISS2-T.prg, QubeAmp-AMS2-ISS2-T.prg and both 2014 master BOMs: R86/R99 0R, R87/R88 DNI.</text><text x="40" y="112" font-size="12" fill="var(--warn)">SA-AMS2-AMP-PNP.txt lists R86 as “OR” (the letter O).</text>`},
  ];
  m.innerHTML=card('Schematic sheets — redrawn from the ISS3 schematic PDF, the BOMs and the PnP programs (not the Altium drawings)','<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p class="small muted">The full four-sheet ISS3 schematic is in the AMS2 plugin\'s Schematics tab (same board).</p>');
  const draw=()=>{ m.querySelector('#t2').innerHTML=sheets.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.n}</button>`).join(''); m.querySelectorAll('#t2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 340" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${sheets[i].svg()}<text x="890" y="332" text-anchor="end" font-size="10" fill="var(--ink2)">QubeAmp · redrawn 2026|59</text></svg>`; };
  draw();
}
function viewSoft(m){
  window.__qubeampActive=false;
  m.innerHTML=`<div class="grid2">${card('Signal path, stage by stage (live)','<div id="ch"></div><p class="small muted">No firmware: the CS8416 runs in hardware mode and every option is a fitted or unfitted part.</p>')}${card('Build differences (2014 master BOMs)','<div id="bd"></div>')}</div>${card('Cost picture','<div id="cost"></div>')}`;
  SIM.on('time',()=>{ m.querySelector('#ch').innerHTML=chainTable();
    const rows=[['L1, L2','22 µH 3.7 A','33 µH 3.6 A'],['C60, C61','0.68 µF film','0.22 µF film'],['C64, C65','DNI','470 µF 35 V'],['R66, R67','0R','DNI'],['R20 / R21','30R1 / DNI','DNI / 30R1'],['R45, R47 / R92, R94','10K / DNI','DNI / 10K'],['R72, R101 / R73','100R / DNI','DNI / 0R'],['10K tolerance (BOM text)','5 %','1 %'],['BOM material total','$31.24','$31.76']];
    m.querySelector('#bd').innerHTML=`<table class="kv"><tr><th>Parts</th><th>QUBE</th><th>AMS2</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join('')}</table>`;
    m.querySelector('#cost').innerHTML=`<table class="kv"><tr><th>Source</th><th>QUBE</th><th>AMS2</th><th>terms</th></tr>
      <tr><td>WBS master BOM (materials)</td><td class="mono">$31.24</td><td class="mono">$31.76</td><td class="small">Dec 2014</td></tr>
      <tr><td>Sencore CM quote 2435-2436 (30 / 60 pcs)</td><td class="mono">$83.54 / $59.33</td><td class="mono">$84.03 / $59.85</td><td class="small">30 Oct 2014, NRE $635, visual inspection only</td></tr>
      <tr><td>Hansong (Nanjing), MOQ 500 (5K / 10K / 20K per year)</td><td class="mono">$30.75 / 29.9 / 29.3</td><td class="mono">$33 / 31.9 / 31.3</td><td class="small">Jan 20 2015, FOB Nanjing, USD:RMB 6.21</td></tr>
      <tr><td>Artaflex QT141207</td><td colspan="2" class="small">quoted both PCBAs (Dec 17 2014); prices in an attachment not archived</td><td></td></tr></table>`; });
}
function viewNotes(m){
  window.__qubeampActive=false;
  m.innerHTML=card('What the QubeAmp is up to: findings', `<ol>
   <li><b>Two products from one board, by part fitting alone.</b> The QUBE build bypasses the output capacitors (R66/R67 0R, C64/C65 DNI) and feeds R_IN from LEFT_N (R20), so the TPA3124's two single-ended outputs drive one speaker bridged: four times the power, no DC across the speaker. The AMS2 build fits the 470 µF capacitors and R21 for normal stereo. The filters differ too: QUBE 22 µH / 0.68 µF (41 kHz), AMS2 33 µH / 0.22 µF (59 kHz).</li>
   <li><b>The gain is 36 dB by default, and the test shows it.</b> GAIN0/GAIN1 are pulled up (R62/R63), the pull-downs R97/R98 are DNI and H4/H5 are open. The AMS2 test measured exactly 36 dB.</li>
   <li><b>The DAC divider was taken out.</b> The schematic and the “DontUse_OriginalFiles” ISS2 program have R99/R86 6K81 + R87 4K64. The working ISS2 programs, the AMS2 variant and both master BOMs use 0R / DNI. The README says nobody recorded what the “#PROBLEM” tag means; a too-quiet AES path is one candidate (${inf}).</li>
   <li><b>“OR” for 0R.</b> SA-AMS2-AMP-PNP.txt types R86's value with the letter O.</li>
   <li><b>Jack detect is strapped off in the AMS2.</b> R73 = 0R holds JACK_INSERT low and R72/R101 are DNI in the AMS2 BOM. The QUBE build fits the 100R pull-ups and uses it.</li>
   <li><b>The selector straps differ.</b> QUBE fits all three pull-ups R45–R47; AMS2 fits only R46 plus pull-downs R92/R94, so the 74HC4053 defaults to a different source set.</li>
   <li><b>One BOM says 5 %, the other 1 %.</b> The same 10K part number (10K-1/4W-1%/SM 603) is described as 5 % in the QUBE BOM and 1 % in the AMS2 BOM.</li>
   <li><b>The overseas price undercuts the material cost.</b> Hansong's all-in QUBE price at MOQ 500 ($30.75) is below WBS's own material total ($31.24). Sencore's 60-piece price is about twice that, with test not included.</li>
   <li><b>Program clutter.</b> The 2016 PnP folder holds “asdf.mdb”, “Copy of Pick Place…” and a “DontUse_OriginalFiles” folder beside the working ISS1/ISS2 programs. There is no ISS3 program even though the Gerbers are ISS3 (the ISS3 centroid file is in the engineering folder).</li>
   <li><b>Board names.</b> Schematic title “Universal Amplifier Board”, doc number UNI-AMP-ISS3; PCB QubeAmp-ISS3; assemblies SA-QUBEAMP-MAIN and SA-AMS2-AMP; the wiring diagram calls it the “CUBE SPEAKER”.</li>
   <li><b>Privacy.</b> The quote documents name supplier contacts; they are left out here.</li></ol>`)
  + card('Assumptions', `<ul class="small"><li>VCC_P = 24 V, switching frequency 250 kHz, gain table and input impedances, PCM5100A full scale: TPA3124D2 / PCM5100A datasheet values (${inf}).</li><li>Clip at 90 % of VCC/2 per output (${inf}). The QUBE speaker impedance is not documented; 8 Ω is used.</li><li>Jack insert muting the QUBE speaker (${inf}).</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>#QUBE #SERIES/QUBE - #Engineering #PROBLEM/QUBE - #PCB/QUBE - #ISS3 #schematic.pdf, QUBE - #PNP/SA-AMS2-AMP-PNP.txt</li><li>#QUBE #SERIES/QubeAmp and AMS2 - #Master/*.xlsx, *.doc(x), QubeAmp-ISS3-PNL.zip</li><li>#QUBE #SERIES/QubeAmp - #BOM #QUOTES #Problem/QubeAmp - #PNP #2016/**.prg</li><li>AMS2 - #Master/AMS2-N - #Engineering/AMS2-Test Results.pdf</li></ul>`);
}
SIM.register({
  id:'qubeamp', name:'QubeAmp · class-D amplifier PCBA, UNI-AMP-ISS3 (2015|48)', duration:1,
  product:'QubeAmp', year:2015, family:'Monitors, meters & tools', folder:'#QUBE #SERIES',
  summary:'The QubeAmp is a “Universal Amplifier Board” with an AES receiver and DAC (CS8416, PCM5100A), an NE5532 mixer and a TPA3124D2 class-D stage. The same PCB is built two ways: bridged mono for the QUBE speaker, or stereo single-ended for the AMS2. The model follows the signal from AES frame to PWM to speaker for either build.',
  highlights:['Board drawn from the ISS3 Gerbers, parts placed from the centroid file','QUBE bridged vs AMS2 stereo, from the two BOMs','Gain straps that match the AP test','The removed DAC divider','BOM vs supplier quotes'],
  depth:'Hardware model',
  stepUnits:[{label:'1 PWM period (4 µs)',period:()=>1/K.FSW},{label:'1 AES frame',period:()=>1/FS},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.01,'10 ms'],[0.002,'2 ms'],[0.0002,'200 µs'],[0.00002,'20 µs (five PWM periods)']],
  defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator (bench)',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second, frame by frame',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path & BOMs',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
