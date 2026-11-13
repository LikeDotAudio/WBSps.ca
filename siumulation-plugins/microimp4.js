/* =====================================================================
   microIMP4 — "micro" series 4-channel interface box (silk 2015|48)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, microIMP4 - #Engineering/):
   - IMP4 (FINAL CURVE).cdr (CorelDRAW X3, 3 Sep 2015, date stamp JUL.10/15): GREEN and WHITE separations of the
       top cover, plus 1:1 views of both end panels. Converted to PDF and cut with tools/silk_extract.py
       -> assets/microimp4-top-green.png, assets/microimp4-top-white.png (200 px per inch)
   - IMP4.cdr (19 Aug 2015): the draft, with live text objects; Silks/ holds identical copies of both files
   The end-panel hole sizes and positions below are measured from the 1:1 views in the FINAL CURVE file.
   There is NO schematic, BOM or manual. The electrical function (a passive 110 Ω balanced ↔ 75 Ω
   unbalanced AES3 impedance converter, ×4) is INFERRED from the name, the connectors and the lack of
   any power input, and is marked as such on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';

/* ---------------- geometry (inches, from IMP4 (FINAL CURVE).cdr), 200 px per inch ---------------- */
const G = {
  top:{w:4.64,h:2.54}, end:{w:4.54,h:1.67},
  cx:[0.71,1.75,2.79,3.83],                 // channel centres on both ends (1.04 in pitch)
  round:{y:0.843, d:0.556},                 // end A: four .556 in round holes
  xlr:{y:0.797, d:0.937, mh:0.172, mdx:0.375, mdy:0.470},   // end B: four .937 in D-size holes, two .172 fixing holes each
};
/* ---------------- AES3 constants ---------------- */
const Z_BAL=110, Z_UNB=75, N=Math.sqrt(Z_BAL/Z_UNB);       // 1.211 turns ratio for an impedance match — inferred design
const FS_LIST=[44100,48000,96000];
const D = {
  fs:48000,
  ch:[0,1,2,3].map(i=>({dir:'x2b', src:i<2, dst:i<2, len:i===1?100:10})),   // x2b: XLR (AES3) in → coax out
  pad:true,                 // resistive pad to meet the AES-3id 1 V level — inferred
  vpp:4.0,                  // AES3 transmitter level into 110 Ω (spec 2–7 V p-p)
  term:'ok',                // ok | open | wrong (110 Ω cable into 75 Ω input without the IMP4)
  sel:0,                    // channel shown in the timeline
  tone:true, log:[],
};
const PAD_DB = ()=> 20*Math.log10((D.vpp/N)/1.0);              // pad that brings an XLR→coax channel to 1.0 V p-p
function levels(i){
  const c=D.ch[i]; if (!c.src) return {inV:0,outV:0};
  if (c.dir==='x2b'){ const v=D.vpp/N, out = D.pad? 1.0 : v; return {inV:D.vpp, outV:out, inZ:Z_BAL, outZ:Z_UNB}; }
  const vin=1.0, out = D.pad? vin*N*Math.pow(10,-PAD_DB()/20) : vin*N; return {inV:vin, outV:out, inZ:Z_UNB, outZ:Z_BAL};
}
function gamma(){ if (D.term==='ok') return 0; if (D.term==='open') return 1; return (Z_UNB-Z_BAL)/(Z_UNB+Z_BAL); }
/* Coax rise time grows with cable length: 10–90 % ≈ 3 ns + 0.04 ns/m² × … — a simple RC stand-in, inferred */
function riseT(len){ return 3e-9 + 0.2e-9*len + 1.5e-12*len*len; }

/* ---------------- AES3 bit stream (biphase-mark) ---------------- */
const PRE={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]};
const CACHE=new Map();
function subframe(n, side){
  const key=n*2+side; if (CACHE.has(key)) return CACHE.get(key); if (CACHE.size>4000) CACHE.clear();
  const fr=n%192, v = D.tone? 0.1*Math.sin(2*Math.PI*1000*n/D.fs + side*0.5) : 0;
  let s=Math.round(v*8388607); if (s<0) s+=1<<24;
  const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
  const cs0 = D.fs===48000?0x85 : D.fs===44100?0x45 : 0x05; bits[30] = fr<8? (cs0>>fr)&1 : 0;
  let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
  const pre = side? 'Y' : (fr===0?'Z':'X'); const lv=PRE[pre].slice(); let cur=lv[7];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); }
  const r={lv, pre, bits, raw:s}; CACHE.set(key,r); return r;
}
function cellLevel(t){ const UI=1/(128*D.fs); const k=Math.floor(t/UI); const n=Math.floor(k/128), r=k%128; const sf=subframe(n, r>=64?1:0); return sf.lv[r%64]?1:-1; }
function signalAt(t, side){            // side 0 = input connector, 1 = output connector of the selected channel (volts)
  const c=D.ch[D.sel], L=levels(D.sel); if (!c.src) return 0;
  if (side===0) return cellLevel(t)*L.inV/2;
  if (!c.dst && D.term==='ok') return 0;
  // band-limit by the coax (only on the coax side) and add the reflection of a mismatched far end
  const coax = c.dir==='x2b'? 1 : 0; const tr = coax? riseT(c.len) : 3e-9; const tau=tr/2.2;
  let v=0; const h=tau/2; for (let k=0;k<6;k++){ const w=Math.exp(-k*h/tau); v+=w*cellLevel(t-k*h); } v/= [0,1,2,3,4,5].reduce((a,k)=>a+Math.exp(-k*h/tau),0);
  const g=gamma(); const delay = 2*c.len/(0.66*3e8);
  if (g) v += g*cellLevel(t-delay);
  return v*L.outV/2;
}

function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,trace:tr}); if (D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  plug(i,end){ act(`Channel ${i+1}: ${end==='x'?'XLR':'coax'} ${connected(i,end)?'unplugged':'plugged in'}`, tr=>{
    const c=D.ch[i]; const isIn = (end==='x') === (c.dir==='x2b'); if (isIn) c.src=!c.src; else c.dst=!c.dst; D.sel=i;
    tr(end==='x'? `End B, hole ${i+1}: .937 in Neutrik D-size cut-out with two .172 in fixing holes (pattern ±0.375 × ±0.470 in) → XLR, 110 Ω balanced (AES3)` :
      `End A, hole ${i+1}: .556 in round hole → BNC bulkhead, 75 Ω unbalanced (AES-3id) ${inf}`);
    tr(`Transformer ${N.toFixed(3)}:1 (√(110/75)) ${inf}${D.pad?` plus a ${PAD_DB().toFixed(1)} dB pad toward the coax side ${inf}`:''}`);
    const L=levels(i); if (c.src) tr(`${c.dir==='x2b'?'XLR → coax':'coax → XLR'}: ${L.inV.toFixed(2)} V p-p in → ${L.outV.toFixed(2)} V p-p out`); }); },
  dir(i){ act(`Channel ${i+1}: reverse direction`, tr=>{ const c=D.ch[i]; c.dir=c.dir==='x2b'?'b2x':'x2b'; D.sel=i;
    tr('A transformer balun works in both directions. A pad attenuates both ways too.');
    tr(`Coax → XLR: 1.0 V p-p × ${N.toFixed(3)}${D.pad?` − ${PAD_DB().toFixed(1)} dB`:''} = ${levels(i).outV.toFixed(2)} V p-p on 110 Ω, against the 0.2 V AES3 receiver minimum`); }); },
  setLen(i,v){ D.ch[i].len=v; SIM.refresh(); },
  reset(){ D.fs=48000; D.ch=[0,1,2,3].map(i=>({dir:'x2b',src:i<2,dst:i<2,len:i===1?100:10})); D.pad=true; D.vpp=4; D.term='ok'; D.sel=0; D.tone=true; D.log=[]; CACHE.clear(); SIM.refresh(); },
};
function connected(i,end){ const c=D.ch[i]; const isIn=(end==='x')===(c.dir==='x2b'); return isIn? c.src : c.dst; }

/* ---------------- drawing ---------------- */
function topSVG(){
  return `<svg viewBox="0 0 928 508" role="img" aria-label="microIMP4 top cover, real silkscreen" style="width:100%;display:block;border-radius:6px"><rect width="928" height="508" fill="var(--dev)"/>
    <image href="${ASSET}microimp4-top-green.svg" width="928" height="508"/><image href="${ASSET}microimp4-top-white.svg" width="928" height="508"/>
    ${[0,1,2,3].map(i=>`<g class="msel" data-i="${i}" style="cursor:pointer"><rect x="${(G.cx[i]+0.05)*200-60}" y="0" width="120" height="508" fill="${D.sel===i?'rgba(76,195,138,.13)':'transparent'}"/><title>Channel ${i+1}: click to show it in the timeline</title></g>`).join('')}</svg>`;
}
function endSVG(which){
  const k=200, W=G.end.w*k, H=G.end.h*k;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="microIMP4 end ${which==='a'?'A (round holes)':'B (XLR)'}" style="width:100%;display:block;border-radius:6px"><rect width="${W}" height="${H}" fill="var(--dev)"/>`;
  G.cx.forEach((x,i)=>{ const cx=x*k; const on=connected(i, which==='a'?'b':'x'); const isIn=((which==='b')===(D.ch[i].dir==='x2b'));
    if (which==='a'){ const cy=G.round.y*k, r=G.round.d*k/2;
      s+=`<g class="mplug" data-i="${i}" data-e="b" style="cursor:pointer"><title>Ch ${i+1} coax (BNC ${'inferred'}) — ${on?'unplug':'plug in'}</title><circle cx="${cx}" cy="${cy}" r="${r+8}" fill="#b5964a" stroke="#6b5520" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r-10}" fill="#dfc985"/><circle cx="${cx}" cy="${cy}" r="10" fill="#7a5f12"/>
        ${on?`<circle cx="${cx}" cy="${cy}" r="${r-2}" fill="none" stroke="${isIn?'var(--accent2)':'var(--accent)'}" stroke-width="10"/>`:''}</g>`; }
    else { const cy=G.xlr.y*k, r=G.xlr.d*k/2;
      s+=`<g class="mplug" data-i="${i}" data-e="x" style="cursor:pointer"><title>Ch ${i+1} XLR — ${on?'unplug':'plug in'}</title><circle cx="${cx}" cy="${cy}" r="${r}" fill="#b9bcc0" stroke="#5c5f62" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r-18}" fill="#1b1c1e"/>
        ${[[-22,-16],[22,-16],[0,24]].map(([dx,dy])=>`<circle cx="${cx+dx}" cy="${cy+dy}" r="8" fill="#000" stroke="#777"/>`).join('')}
        <circle cx="${cx-G.xlr.mdx*k}" cy="${cy-G.xlr.mdy*k}" r="${G.xlr.mh*k/2}" fill="#555"/><circle cx="${cx+G.xlr.mdx*k}" cy="${cy+G.xlr.mdy*k}" r="${G.xlr.mh*k/2}" fill="#555"/>
        ${on?`<circle cx="${cx}" cy="${cy}" r="${r-14}" fill="none" stroke="${isIn?'var(--accent2)':'var(--accent)'}" stroke-width="10"/>`:''}</g>`; }
    s+=`<text x="${cx}" y="${H-10}" text-anchor="middle" font-size="22" fill="#e8e8e2">${i+1}</text>`; });
  return s+`</svg>`;
}
function unitHTML(){ return `<div style="max-width:620px"><div class="small muted">End A — four .556 in round holes (75 Ω coax ${inf})</div><div id="ea"></div><div id="tp" style="margin:6px 0 0"></div><div class="small muted" style="margin-bottom:6px">Top-cover artwork: ${SIM.src('microIMP4 - #Engineering/IMP4 (FINAL CURVE).cdr','IMP4 (FINAL CURVE).cdr')} (3 Sep 2015), GREEN + WHITE plates as vector art; grey lines are the cover outline and fold guides.</div><div id="eb"></div><div class="small muted">End B — four .937 in D-size XLR cut-outs (110 Ω AES3). Blue ring = input, green = output.</div></div>`; }
function drawUnit(m){ m.querySelector('#ea').innerHTML=endSVG('a'); m.querySelector('#tp').innerHTML=topSVG(); m.querySelector('#eb').innerHTML=endSVG('b');
  m.querySelectorAll('.mplug').forEach(g=>g.onclick=()=>A.plug(+g.dataset.i, g.dataset.e));
  m.querySelectorAll('.msel').forEach(g=>g.onclick=()=>{ D.sel=+g.dataset.i; SIM.refresh(); }); }

/* ---------------- lanes ---------------- */
function lanes(){
  const css=SIM.css, c=D.ch[D.sel], L=levels(D.sel);
  const wave=(side,col)=>function(cc,X,t0,t1,y,h){
    const amp=Math.max(0.6, D.vpp/2*1.1); const pw=X(t1)-X(t0), UI=1/(128*D.fs);
    if (!c.src){ cc.fillStyle=css('--ink2'); cc.font='11px sans-serif'; cc.fillText('nothing plugged into the input', X(t0)+6, y+h/2+4); return; }
    const vmax = side? L.outV/2 : L.inV/2; const Y=v=>y+h/2-v/amp*(h/2-3);
    if ((t1-t0)/UI > pw*1.5){ cc.globalAlpha=.35; cc.fillStyle=col; cc.fillRect(X(t0),Y(vmax),pw,Y(-vmax)-Y(vmax)); cc.globalAlpha=1; cc.fillStyle=css('--ink'); cc.font='11px '+css('--mono'); cc.fillText(`${(vmax*2).toFixed(2)} V p-p · ${Math.round((t1-t0)/UI).toLocaleString()} bit cells (zoom in)`, X(t0)+6, y+h/2+4); return; }
    cc.strokeStyle=col; cc.lineWidth=1.3; cc.beginPath(); const Np=Math.min(3000,Math.max(200,pw*2));
    for (let p=0;p<=Np;p++){ const tt=t0+(t1-t0)*p/Np, v=signalAt(tt,side); p?cc.lineTo(X(tt),Y(v)):cc.moveTo(X(tt),Y(v)); } cc.stroke(); };
  return [
    {label:'AES3 blocks (Z preamble)', h:22, draw(cc,X,t0,t1,y,h){ SIM.pulses(cc,X,t0,t1,y,h,192/D.fs,0,1/D.fs,css('--warn'),'blocks of 192 frames'); }},
    {label:'Frames (A = X/Z, B = Y)', h:22, draw(cc,X,t0,t1,y,h){ SIM.pulses(cc,X,t0,t1,y,h,1/D.fs,0,0.5/D.fs,css('--accent2'),'frames'); }},
    {label:'Bit cells (UI)', h:20, draw(cc,X,t0,t1,y,h){ SIM.pulses(cc,X,t0,t1,y,h,1/(128*D.fs),0,0.5/(128*D.fs),css('--ink2'),'half-bit cells'); }},
    {label:`Ch ${D.sel+1} in: ${c.dir==='x2b'?'XLR 110 Ω':'coax 75 Ω'}`, h:46, draw:wave(0,css('--accent2'))},
    {label:`Ch ${D.sel+1} out: ${c.dir==='x2b'?`coax 75 Ω, ${c.len} m`:'XLR 110 Ω'}`, h:46, draw:wave(1,css('--accent'))},
  ];
}

/* ---------------- views ---------------- */
const card=(t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
function table(){
  const g=gamma();
  return `<table class="kv"><tr><th>Ch</th><th>Direction</th><th>In</th><th>Out</th><th>Coax</th><th></th></tr>${D.ch.map((c,i)=>{ const L=levels(i); const ok3id = c.dir==='x2b'? (L.outV>=0.8&&L.outV<=1.2) : L.outV>=0.2;
     return `<tr class="${i===D.sel?'hl':''}"><td>${i+1}</td><td><button data-d="${i}">${c.dir==='x2b'?'XLR → coax':'coax → XLR'}</button></td><td class="mono">${c.src?L.inV.toFixed(2)+' V p-p':'—'}</td><td class="mono">${c.src&&c.dst?L.outV.toFixed(2)+' V p-p':c.src?'(open)':'—'}</td>
     <td><input type="range" data-l="${i}" min="1" max="300" value="${c.len}" style="width:80px"> <span class="mono">${c.len} m</span></td><td class="small">${c.src&&c.dst?(ok3id?'within spec':'<b style="color:var(--warn)">out of spec</b>'):''}</td></tr>`; }).join('')}</table>
   <p class="small">Turns ratio √(110/75) = ${N.toFixed(3)} ${inf}. AES-3id wants 1.0 V p-p ±20 % on 75 Ω. AES3 sends 2–7 V p-p on 110 Ω. With a ${D.vpp} V p-p source, the transformer alone gives ${(D.vpp/N).toFixed(2)} V p-p, so a ${PAD_DB().toFixed(1)} dB pad is needed ${inf}. Far-end termination: ${D.term==='ok'?'correct (no reflection)':D.term==='open'?'open (Γ = +1)':'110 Ω cable into a 75 Ω input without the IMP4 (Γ = '+g.toFixed(3)+', return loss '+(-20*Math.log10(Math.abs(g))).toFixed(1)+' dB)'}.</p>`;
}
function controls(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px">
    <label>Sample rate <select id="ifs">${FS_LIST.map(f=>`<option value="${f}" ${f===D.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
    <label>AES3 source <input type="range" id="ivp" min="2" max="7" step="0.5" value="${D.vpp}"> <span class="mono" id="ivpv"></span></label>
    <label><input type="checkbox" id="ipd" ${D.pad?'checked':''}> level pad fitted ${inf}</label>
    <label>Far end <select id="itm"><option value="ok">matched</option><option value="open">open</option><option value="wrong">110 Ω into 75 Ω (no IMP4)</option></select></label>
    <label><input type="checkbox" id="itn" ${D.tone?'checked':''}> 1 kHz tone in the audio bits</label><button id="irs">Reset</button></div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s); q('#itm').value=D.term; const up=()=>q('#ivpv').textContent=D.vpp+' V p-p';
  q('#ifs').onchange=e=>{ D.fs=+e.target.value; CACHE.clear(); SIM.refresh(); }; q('#ivp').oninput=e=>{ D.vpp=+e.target.value; up(); SIM.refresh(); };
  q('#ipd').onchange=e=>{ D.pad=e.target.checked; SIM.refresh(); }; q('#itm').onchange=e=>{ D.term=e.target.value; SIM.refresh(); };
  q('#itn').onchange=e=>{ D.tone=e.target.checked; CACHE.clear(); SIM.refresh(); }; q('#irs').onclick=()=>A.reset(); up();
}
function bindTable(m){ m.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>A.dir(+b.dataset.d)); m.querySelectorAll('[data-l]').forEach(r=>r.onchange=e=>A.setLen(+r.dataset.l,+e.target.value)); }
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a connector on either end to plug or unplug it. Click a channel on the top cover to show it in the timeline.</div>'; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('microIMP4: real top-cover silk, both ends drawn 1:1 from the artwork', unitHTML()+controls())}</div>
   <div>${card('Channels', `<div id="tb"></div>`)}${card('What the last action touched', `<div id="tr" class="log"></div>`)}</div></div>
   ${card('Timeline: AES3 on the selected channel (zoom to “4 frames” or “64 cells” to see the bits)', `<canvas id="tl"></canvas><p class="small muted">The biphase-mark stream is generated exactly (preambles, 24-bit audio, channel-status bit, parity). The connector-to-connector behaviour (turns ratio, pad, coax rise time, reflections) is ${inf}.</p>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ drawUnit(m); m.querySelector('#tb').innerHTML=table(); bindTable(m); m.querySelector('#tr').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:180}); });
}
const LESSONS=[
  {title:'Meet the microIMP4', body:`<p>A folded “micro” cover, 4.64 × 2.54 in, printed with a green <b>micro</b> and a white <b>WBS IMP4</b>. Channel numbers 1–4 appear twice: upright along one edge and upside down along the other, so they read correctly from either end. One end has four XLR cut-outs. The other has four .556 in round holes. There is no power input.</p><p class="muted">With no manual or circuit, this tutorial follows the most likely use: four passive AES3 baluns between 110 Ω XLR and 75 Ω coax ${inf}.</p>`, check:()=>true, auto:true},
  {title:'1 · Feed channel 3 from an AES3 output', body:'<p>Click XLR <b>3</b> on end B (bottom). It gets a blue ring: this is the input.</p>', check:()=>D.ch[2].src && D.ch[2].dir==='x2b', hint:'Bottom end view, third XLR from the left.'},
  {title:'2 · Connect the coax side', body:'<p>Click round hole <b>3</b> on end A (top) to plug in the BNC that runs to the 75 Ω router. It gets a green ring: this is the output.</p>', check:()=>D.ch[2].src && D.ch[2].dst, hint:'Top end view, third connector.'},
  {title:'3 · Get the level into spec', body:'<p>Without a pad, the transformer leaves about 3 V p-p on the coax: too hot for AES-3id (1 V ±20 %). Untick <b>level pad fitted</b> to see the channel go out of spec. Then tick it again.</p>', check:()=>D.pad && D.ch[2].src && D.ch[2].dst, hint:'Use the checkbox under the panels.'},
  {title:'4 · Look at the bits', body:'<p>Click channel <b>3</b> on the top cover, then set the zoom window to <b>4 frames</b>. You can see each subframe’s preamble (X, Y or Z) and the biphase-mark cells. One cell lasts 1/(128 × fs).</p>', check:()=>D.sel===2 && SIM.win<=4/D.fs+1e-9, hint:'Zoom window menu in the transport bar.'},
  {title:'5 · Run it the other way', body:'<p>Reverse channel 4 (<b>coax → XLR</b>) to feed an AES3 input from a 75 Ω source. A balun works both ways.</p>', check:()=>D.ch[3].dir==='b2x', hint:'Click the direction button for channel 4 in the Channels table.'},
  {title:'6 · Why bother: a mismatch', body:'<p>Set <b>Far end</b> to “110 Ω into 75 Ω (no IMP4)”. The out lane shows an echo of each edge, delayed by the cable’s round trip: Γ = (75 − 110)/(75 + 110) = −0.19. With long coax the echoes close the eye.</p>', check:()=>D.term==='wrong', hint:'Far end menu.'},
  {title:'Done', body:'<p>That is how the box was most likely used. The Findings tab shows what the artwork does and doesn’t prove.</p>', check:()=>true, auto:true},
];
let li=0;
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — using a microIMP4 '+inf, `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="le"></div></div><div>${card('The unit', unitHTML()+controls())}${card('Channels', `<div id="tb"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ drawUnit(m); m.querySelector('#tb').innerHTML=table(); bindTable(m);
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(e=>e.onclick=()=>{ li=+e.dataset.i; draw(); });
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#le').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
     <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#r0').onclick=()=>{ A.reset(); D.ch.forEach(c=>{c.src=false;c.dst=false;}); li=0; SIM.refresh(); };
  };
  SIM.on('time',draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second through a microIMP4 channel', `<div id="ld"></div>`)}<div class="grid2">${card('Eye diagram: output of the selected channel, 2 UI wide', `<canvas id="ey"></canvas><div class="small muted" id="ei"></div>`)}${card('Bits at the playhead', `<canvas id="bt"></canvas><div id="bi" class="small mono"></div>`)}</div>${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  SIM.on('time',()=>{
    const fs=D.fs, UI=1/(128*fs), c=D.ch[D.sel];
    const rows=[['AES3 blocks',(fs/192).toFixed(2),SIM.fmtDur(192/fs),'192 frames; channel status repeats per block'],['Frames',fs.toLocaleString(),SIM.fmtDur(1/fs),'one stereo sample pair'],['Subframes',(2*fs).toLocaleString(),SIM.fmtDur(0.5/fs),'32 time slots each'],['Bit cells (half-slots)',(128*fs).toLocaleString(),SIM.fmtDur(UI),`${(128*fs/1e6).toFixed(3)} MHz cell rate; fundamental up to ${(64*fs/1e6).toFixed(3)} MHz`],['Coax delay, ch '+(D.sel+1),'',SIM.fmtDur(c.len/(0.66*3e8)),`${c.len} m at 0.66 c (velocity factor ${'inferred'})`],['Coax rise time','',SIM.fmtDur(riseT(c.len)),`${(riseT(c.len)/UI*100).toFixed(1)} % of a cell ${''}`]];
    m.querySelector('#ld').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">The microIMP4 itself is passive: no clock, no logic. Every number here belongs to the AES3 signal passing through it. The rise-time and velocity-factor figures are ${inf}.</p>`;
    const {c:cc,w}=SIM.canvas(m.querySelector('#ey'),180); cc.strokeStyle=SIM.css('--grid'); cc.strokeRect(4,4,w-8,172);
    const amp=Math.max(0.6,levels(D.sel).outV/2*1.2); cc.strokeStyle=SIM.css('--accent'); cc.globalAlpha=.25;
    const base=Math.floor(SIM.t/UI);
    for (let k=0;k<160;k++){ const t0=(base+k*7)*UI; cc.beginPath(); for(let p=0;p<=60;p++){ const tt=t0+2*UI*p/60, v=signalAt(tt,1), x=8+(w-16)*p/60, y=90-v/amp*80; p?cc.lineTo(x,y):cc.moveTo(x,y);} cc.stroke(); }
    cc.globalAlpha=1; m.querySelector('#ei').textContent=`160 overlaid traces starting at the playhead · Γ = ${gamma().toFixed(3)} · ${c.len} m coax`;
    const sfn=Math.floor(SIM.t*fs), A_=subframe(sfn,0), B_=subframe(sfn,1); const lv=A_.lv.concat(B_.lv);
    const b2=SIM.canvas(m.querySelector('#bt'),110), bc=b2.c, cw=(b2.w-20)/128;
    bc.strokeStyle=SIM.css('--ink'); bc.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?20:70; i?bc.lineTo(x,y):bc.moveTo(x,y); bc.lineTo(x+cw,y); }); bc.stroke();
    bc.fillStyle=SIM.css('--ink2'); bc.font='10px sans-serif'; bc.fillText(`A: ${A_.pre}`,12,92); bc.fillText('B: Y',12+64*cw,92);
    m.querySelector('#bi').textContent=`frame ${sfn.toLocaleString()} (${sfn%192}/191 of its block) · A = 0x${A_.raw.toString(16).padStart(6,'0').toUpperCase()} · B = 0x${B_.raw.toString(16).padStart(6,'0').toUpperCase()} · parity A ${A_.bits[31]}`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:180});
  });
}
function viewBlock(m){
  m.innerHTML=card('Block diagram '+inf+' — one of four identical channels', `<svg viewBox="0 0 760 210" style="width:100%"><defs><marker id="ima" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    ${[['XLR (end B)','110 Ω balanced','AES3, 2–7 V p-p',20],['Balun transformer',N.toFixed(3)+' : 1','√(110/75)',220],['Pad','≈'+PAD_DB().toFixed(1)+' dB','to 1.0 V p-p',420],['BNC (end A)','75 Ω unbalanced','AES-3id, 1 V p-p',600]].map(([a,b,c,x],i)=>`<rect x="${x}" y="60" width="150" height="80" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="${x+10}" y="84" font-size="13" font-weight="700" fill="var(--ink)">${a}</text><text x="${x+10}" y="104" font-size="11" fill="var(--ink2)">${b}</text><text x="${x+10}" y="122" font-size="11" fill="var(--ink2)">${c}</text>${i<3?`<line x1="${x+150}" y1="100" x2="${x+218}" y2="100" stroke="var(--ink2)" marker-end="url(#ima)"/><line x1="${x+218}" y1="112" x2="${x+152}" y2="112" stroke="var(--ink2)" stroke-dasharray="3 3" marker-end="url(#ima)"/>`:''}`).join('')}
    <text x="20" y="180" font-size="11" fill="var(--ink2)">Solid: XLR → coax. Dashed: the same parts used coax → XLR. No power, no active parts (there is no power input on either end or the cover).</text></svg>`)
  + card('Mechanical assembly, to scale (60 px per inch)', `<svg viewBox="0 0 760 330" style="width:100%">${(()=>{ const k=60; let s=`<rect x="20" y="20" width="${4.54*k}" height="${1.67*k}" fill="var(--panel2)" stroke="var(--ink)"/>`;
      G.cx.forEach(x=>{ s+=`<circle cx="${20+x*k}" cy="${20+G.round.y*k}" r="${G.round.d*k/2}" fill="none" stroke="var(--ink)"/>`; });
      s+=`<text x="20" y="${30+1.67*k}" font-size="11" fill="var(--ink)">End A 4.54 × 1.67 in · 4 × Ø.556 at 1.04 in pitch</text>`;
      const y2=60+1.67*k; s+=`<rect x="20" y="${y2}" width="${4.64*k}" height="${2.54*k}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${20+2.3*k}" y="${y2+1.3*k}" text-anchor="middle" font-size="12" fill="var(--ink)">TOP COVER 4.64 × 2.54 in (silk)</text>`;
      const x3=360; s+=`<rect x="${x3}" y="20" width="${4.54*k}" height="${1.67*k}" fill="var(--panel2)" stroke="var(--ink)"/>`;
      G.cx.forEach(x=>{ s+=`<circle cx="${x3+x*k}" cy="${20+G.xlr.y*k}" r="${G.xlr.d*k/2}" fill="none" stroke="var(--ink)"/><circle cx="${x3+(x-G.xlr.mdx)*k}" cy="${20+(G.xlr.y-G.xlr.mdy)*k}" r="${G.xlr.mh*k/2}" fill="none" stroke="var(--ink)"/><circle cx="${x3+(x+G.xlr.mdx)*k}" cy="${20+(G.xlr.y+G.xlr.mdy)*k}" r="${G.xlr.mh*k/2}" fill="none" stroke="var(--ink)"/>`; });
      return s+`<text x="${x3}" y="${30+1.67*k}" font-size="11" fill="var(--ink)">End B · 4 × Ø.937 D-size + 2 × Ø.172 each</text>`; })()}</svg><p class="small muted">Measured from the 1:1 end views in <span class="mono">IMP4 (FINAL CURVE).cdr</span>. Unlike microMATCH, the folder has no cover DWGs for IMP4.</p>`);
}
function viewSchem(m){
  m.innerHTML=card('Schematic — conceptual, NOT from a circuit (none exists in the archive)', `<svg viewBox="0 0 860 300" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px"><g fill="none">
    <text x="20" y="40" font-size="12" font-weight="700" fill="var(--ink)">One of four channels (1–4 per the silkscreen) ${''}</text>
    <text x="30" y="110" font-size="11" fill="var(--accent2)">XLR pin 2 (+)</text><text x="30" y="190" font-size="11" fill="var(--accent2)">XLR pin 3 (−)</text><text x="30" y="240" font-size="11" fill="var(--accent2)">XLR pin 1 (shield)</text>
    <path d="M120 106 H300 V120 M120 186 H300 V172" stroke="var(--ink)"/>
    ${[0,1,2,3].map(i=>`<path d="M300 ${120+i*13} a6 6 0 0 1 0 13" stroke="var(--ink)"/>`).join('')}<path d="M318 112 V180 M324 112 V180" stroke="var(--ink)"/>
    ${[0,1,2,3].map(i=>`<path d="M342 ${120+i*13} a6 6 0 0 0 0 13" stroke="var(--ink)"/>`).join('')}
    <text x="290" y="100" font-size="11" fill="var(--ink)">T1 ${N.toFixed(3)}:1</text>
    <path d="M342 120 V106 H420" stroke="var(--ink)"/><path d="M420 100 h8 l3 -6 6 12 6 -12 6 12 6 -12 6 12 3 -6 h8 H560" stroke="var(--ink)"/><text x="430" y="90" font-size="11" fill="var(--ink)">pad (if fitted)</text>
    <path d="M342 172 V200 H560" stroke="var(--ink)"/><path d="M500 106 V130" stroke="var(--ink)"/><path d="M500 130 l6 3 -12 6 12 6 -12 6 12 6 -6 3 V200" stroke="var(--ink)"/>
    <circle cx="590" cy="150" r="22" stroke="var(--ink)"/><circle cx="590" cy="150" r="5" fill="var(--ink)"/><path d="M560 106 H590 V145 M560 200 H590 V172" stroke="var(--ink)"/><text x="620" y="146" font-size="11" fill="var(--accent2)">BNC centre (75 Ω)</text><text x="620" y="190" font-size="11" fill="var(--accent2)">BNC shell</text>
    <text x="20" y="280" font-size="12" fill="var(--bad)">Conceptual only: topology, turns ratio and pad are inferred (an AES-3id-style balun). The XLR pin numbers follow AES3, not the archive.</text></g></svg>`)
  + card('Interpretation check — why “AES balun”', `<table class="kv"><tr><th>Evidence (fact)</th><th>Points to</th></tr>
    <tr><td>Name “IMP4”; same “micro” family as microMATCH</td><td>“IMPedance”, 4 channels ${inf}</td></tr>
    <tr><td>Four XLR D-size cut-outs on one end, four Ø.556 round holes on the other, at the same 1.04 in pitch</td><td>a 1:1 pairing of balanced and unbalanced connectors</td></tr>
    <tr><td>No POWER label, LED or DC hole anywhere (unlike microMATCH)</td><td>passive: transformers or resistors only</td></tr>
    <tr><td>Ø.556 in is larger than an RCA or 1/4 in jack needs, and suits an insulated BNC bulkhead</td><td>75 Ω coax ${inf}</td></tr>
    <tr><td>Ward-Beck built AES/video reference gear (POD33 DARS, openGear cards)</td><td>AES3 ↔ AES-3id use is likely; analog −10/+4 balun use is the alternative</td></tr></table>`);
}
function viewPath(m){
  m.innerHTML=card('Signal path per channel (passive: no software)', `<div id="tb"></div>${controls()}`)+card('Level budget, selected channel', `<canvas id="lb"></canvas>`);
  bindControls(m);
  SIM.on('time',()=>{ m.querySelector('#tb').innerHTML=table(); bindTable(m);
    const {c,w}=SIM.canvas(m.querySelector('#lb'),190), L=levels(D.sel), ch=D.ch[D.sel]; const x2b=ch.dir==='x2b';
    const st = x2b? [['XLR in',D.vpp],['after T1',D.vpp/N],['after pad',D.pad?1:D.vpp/N],['coax out',D.pad?1:D.vpp/N]] : [['coax in',1],['after pad',D.pad?Math.pow(10,-PAD_DB()/20):1],['after T1',L.outV],['XLR out',L.outV]];
    const Y=v=>170-v/7.5*150; c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif';
    for(let v=0;v<=7;v++){ c.beginPath(); c.moveTo(50,Y(v)); c.lineTo(w-10,Y(v)); c.stroke(); c.fillText(v+' Vpp',4,Y(v)+3); }
    c.fillStyle='rgba(76,195,138,.18)'; if (x2b) c.fillRect(50,Y(1.2),w-60,Y(0.8)-Y(1.2));
    st.forEach(([n,v],i)=>{ const x=90+i*(w-140)/3; c.fillStyle=SIM.css('--accent2'); c.fillRect(x-16,Y(v),32,170-Y(v)); c.fillStyle=SIM.css('--ink'); c.fillText(n+' '+v.toFixed(2),x-30,184); }); });
}
function viewFindings(m){
  m.innerHTML=card('What the archive says about microIMP4', `<ol>
    <li><b>Artwork 2026|59: top cover now from ${SIM.src('microIMP4 - #Engineering/IMP4 (FINAL CURVE).cdr','IMP4 (FINAL CURVE).cdr')} (3 Sep 2015).</b> The GREEN and WHITE plates are drawn as vector art (assets/microimp4-top-green.svg, -top-white.svg) on the same frame as the earlier cut, so the channel controls stay put. The green plate is only two objects (the “micro” frame and word); everything else is white.</li>
    <li><b>Only artwork survives.</b> The folder has two CorelDRAW files (IMP4.cdr, 19 Aug 2015; IMP4 (FINAL CURVE).cdr, 3 Sep 2015), and <span class="mono">Silks/</span> holds byte-identical copies of both. There are no cover drawings, schematic, BOM or manual, and no other file in the archive mentions IMP4. The electrical function in this plugin is ${inf}.</li>
    <li><b>It was started from a “micro AMP” artwork.</b> Both files carry a <b>“micro AMP”</b> logo group (WBS frame, “micro”, “AMP”) parked far off the page on the pasteboard, at about x = 22 in on an 11 in sheet. They also carry a date stamp <b>JUL.10/15</b>, a month before either file was saved. No microAMP artwork is in the archive. Its only trace is this leftover.</li>
    <li><b>Channel numbers are printed twice.</b> “1 2 3 4” runs upright along one long edge and upside down along the other. The numbers sit within 0.05 in of the hole centres on both ends (1.04 in pitch). So each end reads correctly from its own side.</li>
    <li><b>No power anywhere.</b> microMATCH has a POWER label, LED hole and power cut-out. IMP4 has none, on the cover or either end. It must be passive.</li>
    <li><b>Same family layout as microMATCH.</b> The green separation is the “micro” wordmark and frame, and the white is WBS + model name. The “micro” top-cover blank is 4.64 × 2.54 in here and 4.32 × 2.56 in on microMATCH, so the micro boxes did not share one enclosure size.</li>
    <li><b>The README guesses “impedance matching” from the name alone.</b> The connector evidence (XLR ↔ Ø.556 in round, ×4, passive) supports a 110 Ω ↔ 75 Ω balun reading. An analog unbalanced ↔ balanced transformer box is the main alternative. The Schematic tab weighs both.</li></ol>`)
   + card('Assumptions in this simulation', `<ul class="small"><li>Each channel is an AES-3id-style balun: a √(110/75) transformer plus an optional pad to bring 2–7 V p-p AES3 down to 1 V p-p ${inf}.</li><li>Coax rise time grows with length (3 ns + 0.2 ns/m + 1.5 ps/m²) and the velocity factor is 0.66 ${inf}. Reflections use Γ = (ZL − Z0)/(ZL + Z0).</li><li>The AES3 stream is exact: preambles X/Y/Z, 24-bit audio (1 kHz at −20 dBFS), channel-status byte 0 (professional), even parity.</li></ul>`);
}
SIM.register({
  footnotes:[
    {text:'Both IMP4 files carry an unused “micro AMP” logo group parked off the page on the pasteboard, so the artwork was started from a microAMP sheet.', src:'microIMP4 - #Engineering/IMP4 (FINAL CURVE).cdr'},
    {text:'Channel numbers 1–4 are printed twice, upright along one long edge and upside down along the other.', src:'microIMP4 - #Engineering/IMP4 (FINAL CURVE).cdr'},
    {text:'Silks/ holds byte-identical copies of IMP4.cdr and IMP4 (FINAL CURVE).cdr.', src:'microIMP4 - #Engineering/Silks/IMP4 (FINAL CURVE).cdr'},
    {text:'No POWER legend, LED or power cut-out appears on the cover or either end, so the box is taken to be passive (inferred).', src:'microIMP4 - #Engineering/IMP4 (FINAL CURVE).cdr'},
    {text:'The green plate holds only the “micro” frame and word; WBS and IMP4 are on the white plate.', src:'microIMP4 - #Engineering/IMP4 (FINAL CURVE).cdr'}],
  id:'microimp4', name:'microIMP4 · 4-channel passive interface box (2015|48)', duration:1,
  product:'microIMP4', year:2015, family:'Monitors, meters & tools', folder:'microIMP4 - #Engineering',
  summary:'A Ward-Beck “micro” box known only from its 2015|48 silkscreen: a printed top cover numbered 1–4, four XLR cut-outs on one end, four round holes on the other, and no power. The plugin builds it from the real artwork and models the most likely use: four passive 110 Ω AES3 ↔ 75 Ω coax baluns, down to the biphase-mark bit cells.',
  highlights:['Real green + white top-cover silk','Both end panels drawn 1:1 from the artwork','AES3 stream to the bit: preambles, parity, channel status','Pad, coax length and reflection effects (inferred)','Leftover “micro AMP” logo off the page'],
  depth:'Hardware model',
  stepUnits:[{label:'1 bit cell (UI)', period:()=>1/(128*D.fs)},{label:'1 subframe', period:()=>0.5/D.fs},{label:'1 frame', period:()=>1/D.fs},{label:'1 block (192 frames)', period:()=>192/D.fs},{label:'10 ms', period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.004,'1 block (4 ms)'],[4/48000,'4 frames (83 µs)'],[1/48000,'1 frame (20.8 µs)'],[64/(128*48000),'64 cells (1 subframe)']], defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram & assembly',render:viewBlock},{id:'schematic',label:'Schematic (conceptual)',render:viewSchem},{id:'software',label:'Signal path',render:viewPath},{id:'findings',label:'Findings',render:viewFindings}],
});
})();
