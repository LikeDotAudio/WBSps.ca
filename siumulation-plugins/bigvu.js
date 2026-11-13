/* =====================================================================
   Big VU (RD87) — stereo 57-pixel WS2812 LED tower, 2015|48
   Plugin for the WBS Device Simulator (../siumulation.html)
   Source: Big VU - #MASTER/Big VU - #Software/Big VU - #Software #APK/
           Big VU - #Software #APK #WORKING VERSION/BIG_VU_METERS_arduinopro_mini.ino
   Constants below are copied from that sketch; timings of analogRead,
   Serial and WS2812 come from the ATmega328P / Arduino / WS2812 specs.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const K = { N:57, WINDOW:0.035, PEAK_HANG:1, PEAK_FALL:3, PEAK_HANG2:30, PEAK_FALL2:8, FLOOR:4, REDDOT:35,
  ADC:104e-6+8e-6,            // analogRead ≈ 13 ADC clocks @ 125 kHz + overhead
  BAUD_CHAR: 10/9600,         // 1 start + 8 data + 1 stop
  TXBUF: 64,                  // HardwareSerial TX buffer
  WS: 57*24*1.25e-6,          // one strip.show(): 57 px × 24 bits × 1.25 µs = 1.71 ms
  CALC: 1.2e-3,               // four fscale() float pow() calls + fills — inferred
};
const S = { level:-6, freq:1000, ceiling:500, serial:true, fsCounts:400, playing:false };
let FR = null, KEY='';

function fscale(oMin, oMax, nBegin, nEnd, v, curve){
  if (curve>10) curve=10; if (curve<-10) curve=-10; curve = Math.pow(10, curve*-0.1);
  if (v<oMin) v=oMin; if (v>oMax) v=oMax;
  const oRange=oMax-oMin; let nRange, inv=false;
  if (nEnd>nBegin) nRange=nEnd-nBegin; else { nRange=nBegin-nEnd; inv=true; }
  const norm=(v-oMin)/oRange; if (oMin>oMax) return 0;
  return inv ? nBegin - Math.pow(norm,curve)*nRange : Math.pow(norm,curve)*nRange + nBegin;
}
function input(ch, t){ const A = S.fsCounts*Math.pow(10,S.level/20) * (ch? 0.8:1); return 512 + A*Math.sin(2*Math.PI*S.freq*t + (ch?0.7:0)); }

/* Simulate every loop() over one second: sampling window, Serial back-pressure, compute, show() */
function simulate(){
  const key=[S.level,S.freq,S.ceiling,S.serial].join('|'); if (key===KEY) return FR; KEY=key;
  const frames=[]; let t=0, txq = S.serial? K.TXBUF : 0; let txT=0; // txq = chars waiting in buffer
  let pk=[16,16], pk2=[16,16], hang=[0,0], hang2=[0,0], dc=[0,0], dc2=[0,0];
  const drain = (dt)=>{ if (!S.serial) return; txq = Math.max(0, txq - dt/K.BAUD_CHAR); };
  while (t < 1){
    const f = { t0:t, samples:[] }; let mx=[0,0], mn=[1023,1023];
    const tEnd = t + K.WINDOW;
    while (t < tEnd){
      const a = Math.round(input(0,t)), b = Math.round(input(1,t+K.ADC));
      f.samples.push(t); t += 2*K.ADC; drain(2*K.ADC);
      if (S.serial){ const n = String(a).length+2; // println: digits + \r\n
        if (txq + n > K.TXBUF){ const wait = (txq + n - K.TXBUF)*K.BAUD_CHAR; t += wait; txq = K.TXBUF; } else txq += n; }
      // the sketch's max/min uses "else if": a new max can't also be a new min
      if (a>mx[0]) mx[0]=a; else if (a<mn[0]) mn[0]=a;
      if (b>mx[1]) mx[1]=b; else if (b<mn[1]) mn[1]=b;
    }
    f.tWin = t; t += K.CALC; drain(K.CALC); f.tShow = t; t += 2*K.WS; /* interrupts off during show(): TX stalls */ f.t1 = t;
    f.pp = [mx[0]-mn[0], mx[1]-mn[1]];
    f.c = f.pp.map(p=> Math.round(fscale(K.FLOOR, S.ceiling, K.N, 0, p, 2)));
    for (let ch=0; ch<2; ch++){
      if (f.c[ch] < pk[ch]){ pk[ch]=f.c[ch]; hang[ch]=0; }
      if (f.c[ch] < pk2[ch]){ pk2[ch]=f.c[ch]; hang2[ch]=0; }
    }
    f.pk=pk.slice(); f.pk2=pk2.slice();
    for (let ch=0; ch<2; ch++){
      if (hang[ch] > K.PEAK_HANG){ if (++dc[ch] >= K.PEAK_FALL){ pk[ch]++; dc[ch]=0; } } else hang[ch]++;
      if (hang2[ch] > K.PEAK_HANG2){ if (++dc2[ch] >= K.PEAK_FALL2){ pk2[ch]++; dc2[ch]=0; } } else hang2[ch]++;
    }
    frames.push(f);
  }
  FR = frames; return FR;
}
function frameAt(t){ const F=simulate(); let r=null; for (const f of F){ if (f.t1<=t) r=f; else break; } return r; } // last shown frame
function curFrame(t){ const F=simulate(); return F.find(f=>t>=f.t0 && t<f.t1) || F[F.length-1]; }

function pixelColor(i){ const pos = Math.round(30 + (150-30)*i/(K.N-1)); return pos<=90? 'rgb(0,200,0)' : pos<120? 'rgb(255,100,0)' : 'rgb(255,0,0)'; }
/* Towers drawn to scale from BIG VU - #Mechanical #DA #2016/Paint Info/VU-FRONT.pdf (D.A., 01-02-2016|49):
   front panel 41.524" × 5.000", .080 aluminium, "WBS BLACK" (Sherwin-Williams Polane T F63B12), one long window.
   Window ≈ 1.75" × 37.4" (measured off the drawing). 57 pixels over the window = 0.656" pitch = a 60 LED/m WS2812 strip. */
function towersSVG(t){
  const f = frameAt(t), S_=14;                 // 14 px per inch
  const TW=5*S_, TH=41.524*S_, WX=1.65*S_, WW=1.75*S_, WY=0.05*TH, WH=0.90*TH, gap=34;
  let s=`<svg viewBox="0 0 ${2*TW+gap+20} ${TH+46}" style="width:100%;max-width:240px">
    <defs><linearGradient id="bvsheen" x1="0" x2="1"><stop offset="0" stop-color="#1a1b1d"/><stop offset=".5" stop-color="#26282b"/><stop offset="1" stop-color="#161719"/></linearGradient>
    <filter id="bvglow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  for (let ch=0; ch<2; ch++){
    const x0 = 10 + ch*(TW+gap);
    s+=`<rect x="${x0}" y="14" width="${TW}" height="${TH}" rx="3" fill="url(#bvsheen)" stroke="#0b0b0c"/>
        <rect x="${x0+WX}" y="${14+WY}" width="${WW}" height="${WH}" rx="2" fill="#060607" stroke="#000"/>`;
    const lit = f? K.N - f.c[ch] : 0; const y1 = f? K.N - f.pk[ch] : -9, y2 = f? K.N - f.pk2[ch] + 2 : -9;
    const pitch = WH/K.N;
    for (let i=0;i<K.N;i++){
      const cy = 14+WY+WH - (i+0.5)*pitch; let col=null;
      if (f){ if (i < lit) col = pixelColor(i); if (i===y1-1 || i===y2-1) col = pixelColor(i===y1-1? y1 : y2); }
      if (i===K.REDDOT) col='#ff2020';
      s += col ? `<rect x="${x0+WX+3}" y="${cy-pitch*0.36}" width="${WW-6}" height="${pitch*0.72}" rx="2" fill="${col}" filter="url(#bvglow)"/>`
               : `<rect x="${x0+WX+5}" y="${cy-pitch*0.2}" width="${WW-10}" height="${pitch*0.4}" rx="1" fill="#141416"/>`;
    }
    s+=`<text x="${x0+TW/2}" y="${TH+36}" fill="var(--ink2)" font-size="13" text-anchor="middle">${ch?'R':'L'}</text>`;
  }
  return s+`<text x="${TW+gap/2+10}" y="10" fill="var(--ink2)" font-size="9" text-anchor="middle">${f? 'frame shown at '+SIM.fmtDur(f.t1) : 'no frame shown yet'}</text></svg>
   <div class="small muted" style="max-width:240px">Drawn to scale from the paint drawing <span class="mono">VU-FRONT.pdf</span>: 41.5″ × 5″ WBS-black aluminium panel with one window.</div>`;
}
function viewSim(m){
  window.__pod33Active = false;
  m.innerHTML = `<div class="grid2">
   <div class="card"><h2>Input and settings</h2>
     <label class="small">Tone level <input type="range" id="lv" min="-40" max="6" step="1" value="${S.level}"> <span id="lvv" class="mono"></span></label><br>
     <label class="small">Tone frequency <select id="fq">${[100,400,1000,5000].map(f=>`<option ${f===S.freq?'selected':''}>${f}</option>`).join('')}</select> Hz</label><br>
     <label class="small">Ceiling pot on A5 (INPUT_CEILING) <input type="range" id="ce" min="50" max="1023" value="${S.ceiling}"> <span id="cev" class="mono"></span></label><br>
     <label class="small"><input type="checkbox" id="se" ${S.serial?'checked':''}> Serial.println(sample_left) left in the sampling loop (as in the shipped sketch)</label>
     <div id="stats" class="small mono" style="margin-top:8px"></div>
     <p class="small muted">The input is modelled as ADC counts around mid-rail (512). The analog front end's gain is not documented, so “0 dB” here means a ±${S.fsCounts}-count swing <span class="tag-inf">inferred</span>.</p></div>
   <div class="card"><h2>What the towers show at the playhead</h2><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start"><div id="tw" style="flex:0 0 220px"></div><div id="now" class="small" style="flex:1;min-width:200px"></div></div></div></div>
  <div class="card"><h2>Timeline</h2><canvas id="tl"></canvas></div>`;
  const q=s=>m.querySelector(s);
  const upd=()=>{ q('#lvv').textContent=S.level+' dB'; q('#cev').textContent=S.ceiling; };
  q('#lv').oninput=e=>{S.level=+e.target.value; upd(); SIM.refresh();};
  q('#fq').onchange=e=>{S.freq=+e.target.value; SIM.refresh();};
  q('#ce').oninput=e=>{S.ceiling=+e.target.value; upd(); SIM.refresh();};
  q('#se').onchange=e=>{S.serial=e.target.checked; SIM.refresh();};
  upd();
  SIM.on('time', ()=>{
    const F=simulate(), t=SIM.t, f=curFrame(t), shown=frameAt(t);
    const n = F.reduce((a,x)=>a+x.samples.length,0)/F.length;
    q('#stats').innerHTML = `${F.length} frames per second · ${n.toFixed(1)} sample pairs per 35 ms window · frame ≈ ${SIM.fmtDur(1/F.length)}`;
    q('#tw').innerHTML = towersSVG(t);
    const ph = t<f.tWin? 'sampling: analogRead L/R'+(S.serial?' + Serial.println (blocks when the 64-byte TX buffer is full)':'') : t<f.tShow? 'fscale() ×4, peak-dot logic, fill colours' : 'strip_left.show(); strip_right.show(); — WS2812 data, interrupts off';
    q('#now').innerHTML = `<table class="kv"><tr><th>loop()</th><td>frame #${F.indexOf(f)} · ${ph}</td></tr>
      <tr><th>Window</th><td class="mono">${f.samples.length} pairs, pp L ${f.pp[0]} / R ${f.pp[1]} counts</td></tr>
      <tr><th>Lit pixels</th><td class="mono">L ${K.N-f.c[0]} / R ${K.N-f.c[1]} of 57</td></tr>
      <tr><th>Peak dots</th><td class="mono">fast L ${K.N-f.pk[0]} · slow L ${K.N-f.pk2[0]+2}</td></tr>
      <tr><th>Red dot</th><td class="mono">pixel 35 always on (reference mark)</td></tr></table>`;
    SIM.drawLanes(q('#tl'), [
      {label:'loop() phases', h:30, draw(c,X,t0,t1,y,h){ for (const fr of F){ if (fr.t1<t0||fr.t0>t1) continue;
        c.fillStyle=SIM.css('--accent'); c.globalAlpha=.6; c.fillRect(X(fr.t0),y+4,X(fr.tWin)-X(fr.t0),h-8);
        c.fillStyle=SIM.css('--warn'); c.fillRect(X(fr.tWin),y+4,Math.max(1,X(fr.tShow)-X(fr.tWin)),h-8);
        c.fillStyle=SIM.css('--accent2'); c.fillRect(X(fr.tShow),y+4,Math.max(1,X(fr.t1)-X(fr.tShow)),h-8); c.globalAlpha=1; } }},
      {label:'analogRead pairs', h:24, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--ink'); for (const fr of F){ if (fr.t1<t0||fr.t0>t1) continue; for (const s of fr.samples){ if (s>=t0&&s<=t1) c.fillRect(X(s),y+4,1.2,h-8); } } }},
      {label:'Input L (ADC counts)', h:40, draw(c,X,t0,t1,y,h){ const span=t1-t0, pw=X(t1)-X(t0); c.strokeStyle=SIM.css('--accent'); if (span*S.freq > pw/2){ c.globalAlpha=.3; c.fillStyle=SIM.css('--accent'); const A=S.fsCounts*Math.pow(10,S.level/20)/512; c.fillRect(X(t0),y+h/2-A*h/2,pw,A*h); c.globalAlpha=1; return; } c.beginPath(); for(let i=0;i<=600;i++){ const tt=t0+span*i/600; const v=(input(0,tt)-512)/512; i?c.lineTo(X(tt),y+h/2-v*h/2):c.moveTo(X(tt),y+h/2-v*h/2);} c.stroke(); }},
      {label:'Lit pixels L (0–57)', h:40, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--accent'); for (const fr of F){ if (fr.t1<t0||fr.t0>t1) continue; const nx=F[F.indexOf(fr)+1]; const e=nx?nx.t1:1; const v=(K.N-fr.c[0])/K.N; c.fillRect(X(fr.t1),y+h-v*(h-4),Math.max(1,X(e)-X(fr.t1)),v*(h-4)); } }},
    ], {labelW:170});
  });
}
function viewSoft(m){
  window.__pod33Active = false;
  m.innerHTML = `<div class="card"><h2>loop() — what the Arduino does each frame</h2><div id="fl"></div></div>
   <div class="card"><h2>Block diagram and pins</h2>
   <svg viewBox="0 0 860 200" style="width:100%">${[['Line in L/R','3.5 mm / Euroblock'],['NE5532 buffer','bias to mid-rail'],['ATmega32U4 / 328P','A1 L · A3 R · A5 pot'],['D6 / D9','WS2812 data'],['2× 57-pixel towers','NeoPixel GRB 800 kHz']].map((b,i)=>`<rect x="${10+i*170}" y="50" width="150" height="70" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="${85+i*170}" y="80" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${b[0]}</text><text x="${85+i*170}" y="100" text-anchor="middle" font-size="11" fill="var(--ink2)">${b[1]}</text>${i<4?`<line x1="${160+i*170}" y1="85" x2="${180+i*170}" y2="85" stroke="var(--ink2)"/>`:''}`).join('')}
   <text x="10" y="160" font-size="11" fill="var(--ink2)">2016|49 PCB adds a DS75176B RS-485 transceiver and micro-USB; no firmware for them is in the archive.</text></svg></div>`;
  SIM.on('time', ()=>{
    const f=curFrame(SIM.t), t=SIM.t; const k = t<f.tWin?1:t<f.tShow?2:3;
    const steps=[['loop() start','startMillis = millis()'],['while (millis()-start < 35)','analogRead A1, A3 · Serial.println · track max/min'],['peak-to-peak → fscale(…, curve 2)','peak dots: hang 1/fall 3 frames · slow dot hang 30/fall 8'],['strip_left.show(); strip_right.show();','2 × 1.71 ms WS2812 bit stream; then frame counters advance']];
    m.querySelector('#fl').innerHTML = `<svg viewBox="0 0 860 90" style="width:100%">${steps.map((s,i)=>`<rect x="${10+i*212}" y="10" width="198" height="62" rx="6" fill="${i===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${20+i*212}" y="32" font-size="11.5" font-family="var(--mono)" fill="${i===k?'#fff':'var(--ink)'}">${s[0]}</text><text x="${20+i*212}" y="54" font-size="10" fill="${i===k?'#fff':'var(--ink2)'}">${s[1].slice(0,40)}</text>`).join('')}</svg>`;
  });
}
function viewNotes(m){
  window.__pod33Active = false;
  m.innerHTML = `<div class="card"><h2>Findings</h2><ol>
   <li><b>A debug print limits the sampling.</b> <span class="mono">Serial.println(sample_left)</span> sits inside the 35 ms sampling loop at 9600 baud. Once the 64-byte TX buffer fills, every pass waits about 5–6 ms for it to drain. Each frame then sees only about 6 samples per channel, not about 150. A 1 kHz tone's peak-to-peak reading then depends on where those few samples land, so the bar jumps around. Untick the box on the Simulator tab to compare.</li>
   <li><b>max/min uses “else if”.</b> A sample can't become both the new max and the new min, so the first sample only sets the max. This is harmless in practice.</li>
   <li><b>The dim background is overwritten.</b> The first <span class="mono">drawLine</span> paints the unlit pixels dim grey (left) or dim red (right). The second <span class="mono">drawLine</span> (for the slow dot) paints the same range black, so the dim background never shows.</li>
   <li><b>Both dots use the same input.</b> <span class="mono">c_left2</span> uses the same fscale result as <span class="mono">c_left</span>. Only the hang and fall rates differ, which gives the long-hold peak.</li>
   <li><b>The red reference dot is fixed at pixel 35.</b> You calibrate by setting the A5 pot so a reference tone reaches it.</li></ol></div>`;
}
function viewTut(m){
  window.__pod33Active = false;
  m.innerHTML = `<div class="card"><h2>Using the Big VU</h2><ol>
   <li>Connect the stereo line feed to the 3.5 mm jack or the Euroblock terminals. Power it from USB or the meter power board.</li>
   <li>Play a reference tone (for example 1 kHz at your plant's line-up level).</li>
   <li>Turn the <b>ceiling trim pot</b> (A5) until the top of the bar just reaches the fixed <b>red dot</b> at pixel 35. Try this on the Simulator tab: set the level to 0 dB and move the ceiling slider. The sketch reads the pot every 10th frame (<span class="mono">CeilingCounter</span> += 1000 until it passes 10000).</li>
   <li>In use: the green bar is the level over the last 35 ms. The fast dot holds for one frame and falls one pixel every 3 frames. The slow dot holds for about 30 frames (about 1 s) and falls one pixel every 8 frames.</li></ol></div>`;
}
SIM.register({
  id:'bigvu', name:'Big VU · RD87 LED tower (2015|48)', duration:1,
  product:'Big VU (RD87)', year:2015, family:'Meters',
  folder:'Big VU - #MASTER',
  summary:'Free-standing stereo LED level tower: an Arduino (ATmega328P / 32U4) samples line input and drives two 57-pixel WS2812 strips with peak-hold dots and a fixed red reference dot.',
  highlights:['Live LED towers frame by frame','Ceiling-pot calibration','Serial.println bottleneck: about 7 samples per frame'],
  depth:'Small model',
  stepUnits:[ {label:'1 display frame', period:()=>1/simulate().length}, {label:'1 ms', period:()=>0.001}, {label:'1 analogRead pair', period:()=>2*K.ADC} ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms'],[0.05,'50 ms (≈1 frame)'],[0.005,'5 ms'],[0.001,'1 ms (one 1 kHz cycle)']],
  defaultZoom:1,
  tabs:[ {id:'sim',label:'Simulator',render:viewSim}, {id:'tutorial',label:'Tutorial',render:viewTut}, {id:'software',label:'Software & blocks',render:viewSoft}, {id:'findings',label:'Findings',render:viewNotes} ],
});
})();
