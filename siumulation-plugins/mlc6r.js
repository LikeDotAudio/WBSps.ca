/* =====================================================================
   MLC6R — MLC6 with built-in speakers: bottom pan and front strip (Ward-Beck Systems, 2006|39, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html) — hardware model of a metalwork-only folder

   Sources (folder "#MLC - #SERIES/XXX - MLC6R - #OBSOLETE #Archive", all dated June 2006):
   - MLC6R-M1.dwg          "MLC6R-BOTTOM PAN" MLC6R-M1 iss 1 (MAY 10/06), drawn E.S. 21 06 2006: 17.250 × 6.000,
                           .036 CRS (20 ga), textured WBS black, 8 × A holes (.114 csk to .170), two speaker
                           cut-outs; sidecar text: MINNEOPOLIS SPEAKER, SPEAKER SHIM .125 GREY PVC FOR SPEAKER
                           P/N EN5F, AMS8-M8, "MOVED MOUNTING HOLES FURTHER APART"
   - MLC6R-M6-LAYOUT.dwg   titled "MLC6R-BOTTOM PAN LAYOUT / MLC6R-M1-LAYOUT": parts placed on the pan —
                           left speaker, right speaker outline, a large board, "AMS8E-81 ISS.1 POWER AMP" with
                           HEATSINK, ENCODER block (ENCODER-BIG-CUP) at the front; END VIEW, TOP VIEW
                           -> assets/mlc6r-pan.svg (QCAD dwg2dwg → DXF → ezdxf crop, true inches)
   - ABAB.dwg              unnamed 7.85 × 1.66 strip: 6 × "B" holes on 1.000 pitch, "E" encoder hole with a
                           ring of 25 small holes (11° pitch), 4 × "A" mounting holes  -> assets/mlc6r-front.svg
   - AAAAA.bak, ZZZZZZ.bak, MLC6R-M2.bak, *.bak — AutoCAD backups (ZZZZZZ is also a block name in the layout)
   Family facts reused (cited on screen): XXX - MLC6A (mlc6A-SILK.cdr: L R C LFE LS RS, MASTER, PRESETS,
   5.1; MLC6-M1.dwg), mlc8.js (MASTER_VOLUME, 25-LED dial rings, 0.5 dB per index), ams8e.js (AMS8E-8
   LM4766 speaker amp: +7.8 dB into 8 Ω, 22.8 dBu max ≈ 14 W).
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__mlc6rActive';
const CH = ['L','R','C','LFE','LS','RS'];        // mlc6A-SILK.cdr order
const K = { RING:25, RING_A0:-138, RING_STEP:11, LOOP:5/6000, AMP_G:7.8, AMP_MAX_DBU:22.8, RL:8, VOL_STEP:0.5 };

/* ---------------- state ---------------- */
const PARTS = { spkL:'Left speaker (EN5F) + .125 PVC shim', spkR:'Right speaker (EN5F) + .125 PVC shim', main:'Large board (MLC6 electronics / supply)', amp:'AMS8E-81 ISS.1 power amp + heatsink', enc:'Master encoder (ENCODER-BIG-CUP)', strip:'Front strip (ABAB.dwg)' };
const D = { asm:{spkL:true,spkR:true,main:true,amp:true,enc:true,strip:true}, power:true, vol:-20, mute:[0,0,0,0,0,0], src:0, prog:'tone', log:[] };
function reset(){ Object.assign(D,{asm:{spkL:true,spkR:true,main:true,amp:true,enc:true,strip:true},power:true,vol:-20,mute:[0,0,0,0,0,0],src:0,prog:'tone'}); }
const built = ()=>Object.values(D.asm).every(Boolean);
function env(t){ if(!(D.power&&built())) return 0; if(D.prog==='tone') return 1; if(D.prog==='burst') return (t>=0.2&&t<0.7)?1:0;
  return Math.min(1.4,1.6*Math.max(0,Math.sin(2*Math.PI*4.1*t))*Math.max(0,Math.sin(2*Math.PI*0.9*t+0.6))); }

/* ---------------- model: 5.1 in → stereo downmix → master → LM4766 → speakers (inferred chain) ---------------- */
const DM = { L:[1,0], R:[0,1], C:[0.707,0.707], LFE:[0,0], LS:[0.707,0], RS:[0,0.707] }; // ITU-style fold-down (inferred)
function chain(){
  const a = 0.7746*Math.pow(10,D.src/20); let l=0,r=0;
  CH.forEach((c,i)=>{ if(D.mute[i]) return; l+=a*DM[c][0]; r+=a*DM[c][1]; });   // equal-level tone on every channel, summed in amplitude (worst case)
  const g = Math.pow(10,(D.vol+K.AMP_G)/20), vMax = 0.7746*Math.pow(10,K.AMP_MAX_DBU/20);
  const oL=l*g, oR=r*g, cl=Math.min(oL,vMax), cr=Math.min(oR,vMax);
  return { inL:l, inR:r, oL:cl, oR:cr, clip: built()&&D.power&&(oL>vMax||oR>vMax), wL:cl*cl/K.RL, wR:cr*cr/K.RL };
}
const ringLit = ()=> Math.round(Math.max(0,Math.min(1,(D.vol+60)/60))*K.RING);   // 25 LEDs over −60…0 dB (inferred span)

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  part(k){ act(`${D.asm[k]?'Remove':'Fit'} ${PARTS[k]}`, tr=>{ D.asm[k]=!D.asm[k];
    const msg={spkL:'Speaker drops into the left cut-out of MLC6R-M1; the .125 grey PVC shim (AMS8-M8 style) spaces it off the pan',spkR:'Right cut-out: the layout draws only its outline and corner pads',main:'Board on the pan stand-offs behind the encoder; its CONNECTOR faces the amp board',amp:'AMS8E-81 ISS.1 POWER AMP mounts with its HEATSINK edge to the rear (layout label)',enc:'ENCODER-BIG-CUP at the front centre of the pan, shaft through the front strip',strip:'ABAB strip: 6 B holes, E encoder hole with 25-hole LED ring, 4 A screws'}[k];
    tr(D.asm[k]? msg : `${PARTS[k]} removed`); tr(built()? 'Assembly complete' : 'Still missing: '+Object.keys(D.asm).filter(x=>!D.asm[x]).map(x=>PARTS[x]).join(', ')); }); },
  btn(i){ act(`Press ${CH[i]} (B${i+1})`, tr=>{ if(!built()){ tr('The front strip or electronics are not fitted'); return; } D.mute[i]=D.mute[i]?0:1;
    tr(`B${i+1} = ${CH[i]} ${inf('order from mlc6A-SILK.cdr')}: channel ${D.mute[i]?'muted':'restored'} ${inf('button role')}`);
    tr(`In the MLC8 firmware a mute keeps the ring dark except the MSB LED and sends 'F','F' for the gain (mlc8.js); here the fold-down to the speakers simply drops ${CH[i]}`);
    const c=chain(); tr(`Speakers: L ${c.wL.toFixed(2)} W · R ${c.wR.toFixed(2)} W`); }); },
  turn(d){ act(`Turn MASTER ${d>0?'clockwise':'anticlockwise'} (${d>0?'+':''}${d} detents)`, tr=>{ if(!built()){ tr('Encoder not fitted'); return; } const b=D.vol; D.vol=Math.max(-60,Math.min(0,D.vol+d*K.VOL_STEP*2));
    tr(`PROCESS_SHAFT_ENCODER → MASTER_VOLUME(): ${b} → ${D.vol} dB (${K.VOL_STEP} dB per index, 2 per detent ${inf('mlc8.js table')})`);
    tr(`CONVERT_DIAL_INFORMATION → ring shows ${ringLit()} of ${K.RING} LEDs`); const c=chain(); tr(`LM4766 out L ${c.oL.toFixed(2)} V / R ${c.oR.toFixed(2)} V${c.clip?' — CLIPPING':''}`); }); },
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; tr(D.power? (built()?'Supply → MLC6 front ATmega128 boots, ring shows the stored master level; amp un-mutes':'Power applied but the unit is incomplete: nothing useful happens') : 'Amp and LEDs off'); }); },
  src(v){ act(`Programme level ${v} dBu per channel`, tr=>{ D.src=v; const c=chain(); tr(`Fold-down: L ${(20*Math.log10(Math.max(1e-9,c.inL)/0.7746)).toFixed(1)} dBu, R ${(20*Math.log10(Math.max(1e-9,c.inR)/0.7746)).toFixed(1)} dBu before MASTER`); }); },
  prog(p){ act(`Programme: ${p}`, tr=>{ D.prog=p; }); },
};

/* ---------------- views of the hardware ---------------- */
const FS = { W:7.85, H:1.66, b:i=>[0.511+i,0.827], e:[7.011,0.827], ringR:0.373 };
function frontSVG(){ const S=110, lit=ringLit(), on=D.power&&built();
  let s=`<svg viewBox="0 0 ${FS.W*S} ${FS.H*S}" style="width:100%;max-width:900px;background:#202224;border-radius:4px"><rect width="${FS.W*S}" height="${FS.H*S}" fill="#26282b"/>`;
  s+=`<g style="filter:invert(1)"><image href="${ASSET}mlc6r-front.svg" x="0" y="0" width="${FS.W*S}" height="${FS.H*S}"/></g>`;
  if(!D.asm.strip) return s+`<text x="20" y="${FS.H*S/2}" fill="#ccc" font-size="18">Front strip not fitted</text></svg>`;
  for(let i=0;i<6;i++){ const [x,y]=FS.b(i); s+=`<g data-act="btn" data-i="${i}" style="cursor:pointer"><circle cx="${x*S}" cy="${y*S}" r="${0.25*S}" fill="${D.mute[i]?'#5a1d1a':'#3a3d40'}" stroke="${D.mute[i]?'var(--bad)':'#999'}" stroke-width="2"/><text x="${x*S}" y="${y*S+6}" text-anchor="middle" font-size="16" fill="#eee">${CH[i]}</text><title>B${i+1}: ${CH[i]} (mute ${inf('role')})</title></g>`; }
  const [ex,ey]=FS.e;
  for(let k=0;k<K.RING;k++){ const a=(K.RING_A0-K.RING_STEP*k)*Math.PI/180; const x=ex+Math.cos(a)*FS.ringR, y=ey-Math.sin(a)*FS.ringR; s+=`<circle cx="${x*S}" cy="${y*S}" r="${0.022*S}" fill="${on&&k<lit?'#ffcc33':'#4a4a40'}"/>`; }
  // NB ring order: −138° clockwise round the top to −42° (11° pitch, ABAB.dwg)
  s+=`<g data-act="enc" style="cursor:ew-resize"><circle cx="${ex*S}" cy="${ey*S}" r="${0.31*S}" fill="#111" stroke="#666"/><line x1="${ex*S}" y1="${ey*S}" x2="${(ex+Math.cos((-138-264*(D.vol+60)/60)*Math.PI/180)*0.26)*S}" y2="${(ey-Math.sin((-138-264*(D.vol+60)/60)*Math.PI/180)*0.26)*S}" stroke="#eee" stroke-width="3"/><title>MASTER encoder: click the right half to turn up, left half to turn down</title></g>`;
  return s+'</svg>'; }
const PAN = { W:17.25, H:6.421, spkL:[2.61,3.01,2.1], spkR:[14.66,3.02,2.1], main:[5.17,0.64,5.01,3.01], amp:[10.30,0.68,1.77,2.67], enc:[8.289,5.548], strip:[4.39,6.0,7.85,0.42] };
function panSVG(t){ const S=56, c=chain(), e=env(t);
  let s=`<svg viewBox="0 0 ${PAN.W*S} ${PAN.H*S}" style="width:100%;background:#f3f1ea;border-radius:6px"><image href="${ASSET}mlc6r-pan.svg" x="0" y="0" width="${PAN.W*S}" height="${PAN.H*S}"/>`;
  const sh=(k,inner,title)=>`<g data-act="part" data-k="${k}" style="cursor:pointer">${inner}<title>${title} — click to ${D.asm[k]?'remove':'fit'}</title></g>`;
  for(const k of ['spkL','spkR']){ const [x,y,r]=PAN[k], w=k==='spkL'?c.wL:c.wR, lv=Math.min(1,Math.sqrt(w/14)*e);
    s+=sh(k,`<circle cx="${x*S}" cy="${y*S}" r="${r*S}" fill="${D.asm[k]?'var(--accent)':'#fff'}" fill-opacity="${D.asm[k]?(0.08+lv*0.45).toFixed(2):0.85}" stroke="${D.asm[k]?'var(--accent)':'var(--bad)'}" stroke-dasharray="${D.asm[k]?'':'6 5'}" stroke-width="2"/>`, PARTS[k]); }
  for(const k of ['main','amp']){ const [x,y,w,h]=PAN[k]; s+=sh(k,`<rect x="${x*S}" y="${y*S}" width="${w*S}" height="${h*S}" fill="${D.asm[k]?(k==='amp'&&c.clip?'var(--bad)':'var(--accent2)'):'#fff'}" fill-opacity="${D.asm[k]?0.12:0.85}" stroke="${D.asm[k]?'var(--accent2)':'var(--bad)'}" stroke-dasharray="${D.asm[k]?'':'6 5'}" stroke-width="2"/>`, PARTS[k]); }
  s+=sh('enc',`<circle cx="${PAN.enc[0]*S}" cy="${PAN.enc[1]*S}" r="${0.45*S}" fill="${D.asm.enc?'var(--accent2)':'#fff'}" fill-opacity="${D.asm.enc?0.2:0.85}" stroke="${D.asm.enc?'var(--accent2)':'var(--bad)'}" stroke-width="2"/>`, PARTS.enc);
  const [x,y,w,h]=PAN.strip; s+=sh('strip',`<rect x="${x*S}" y="${y*S}" width="${w*S}" height="${h*S}" fill="${D.asm.strip?'#333':'#fff'}" stroke="${D.asm.strip?'#000':'var(--bad)'}" stroke-dasharray="${D.asm.strip?'':'6 5'}"/>`, PARTS.strip+' (centred on the pan, as on the layout front elevation)');
  s+=`<text x="${PAN.W*S/2}" y="16" text-anchor="middle" font-size="13" fill="#555">REAR</text><text x="40" y="${PAN.H*S-30}" font-size="13" fill="#555">FRONT</text>`;
  return s+'</svg>'; }
function bind(root){ root.querySelectorAll('[data-act="btn"]').forEach(g=>g.onclick=()=>A.btn(+g.dataset.i));
  root.querySelectorAll('[data-act="part"]').forEach(g=>g.onclick=()=>A.part(g.dataset.k));
  root.querySelectorAll('[data-act="enc"]').forEach(g=>g.onclick=e=>{ const r=g.getBoundingClientRect(); A.turn(e.clientX>r.left+r.width/2?1:-1); }); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
  <label>Programme per channel <input id="sv" type="range" min="-30" max="20" value="${D.src}"> <span id="svv" class="mono"></span></label>
  <label>Programme <select id="pg">${[['tone','Steady tone'],['burst','Tone burst 200–700 ms'],['speech','Speech-like']].map(([v,l])=>`<option value="${v}" ${D.prog===v?'selected':''}>${l}</option>`).join('')}</select></label>
  <button id="pw">${D.power?'Power off':'Power on'}</button><button id="dn">MASTER −</button><button id="up">MASTER +</button><button id="rs">Factory state</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#sv')) return; q('#svv').textContent=D.src+' dBu';
  q('#sv').oninput=e=>q('#svv').textContent=e.target.value+' dBu'; q('#sv').onchange=e=>A.src(+e.target.value);
  q('#pg').onchange=e=>A.prog(e.target.value); q('#pw').onclick=()=>A.power(); q('#dn').onclick=()=>A.turn(-1); q('#up').onclick=()=>A.turn(1);
  q('#rs').onclick=()=>{ reset(); D.log.length=0; SIM.refresh(); }; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click parts on the pan to fit or remove them, press the channel buttons, or turn the MASTER encoder.</div>'; }

/* ---------------- timeline ---------------- */
const lastTurn = ()=>{ const e=D.log.find(x=>/MASTER/.test(x.name)); return e? e.t : null; };
function lanes(){ const c=chain(), css=SIM.css, lt=lastTurn();
  const w=(f,amp,col)=>({h:34, draw(cx,X,t0,t1,y,h){ const pw=X(t1)-X(t0); cx.strokeStyle=col; cx.fillStyle=col; if((t1-t0)*f>pw/3){ cx.globalAlpha=.3; cx.beginPath(); for(let i=0;i<=200;i++){const tt=t0+(t1-t0)*i/200; cx.lineTo(X(tt),y+h/2-amp*env(tt)*h*.45);} for(let i=200;i>=0;i--){const tt=t0+(t1-t0)*i/200; cx.lineTo(X(tt),y+h/2+amp*env(tt)*h*.45);} cx.fill(); cx.globalAlpha=1; return; } cx.beginPath(); for(let i=0;i<=500;i++){ const tt=t0+(t1-t0)*i/500, v=amp*env(tt)*Math.sin(2*Math.PI*f*tt); i?cx.lineTo(X(tt),y+h/2-v*h*.45):cx.moveTo(X(tt),y+h/2-v*h*.45);} cx.stroke(); }});
  return [
    Object.assign(w(1000,0.6,css('--accent2')),{label:`6 channels in (${D.src} dBu, ${6-D.mute.reduce((a,b)=>a+b,0)} live)`}),
    Object.assign(w(1000,Math.min(0.95,c.inL/(0.7746*Math.pow(10,D.src/20))/3.5),css('--accent')),{label:'Fold-down L (in)'}),
    Object.assign(w(1000,Math.min(0.95,c.oL/7.6),c.clip?css('--bad'):css('--accent')),{label:`LM4766 L → speaker (${c.wL.toFixed(2)} W)`}),
    Object.assign(w(1000,Math.min(0.95,c.oR/7.6),c.clip?css('--bad'):css('--accent')),{label:`LM4766 R → speaker (${c.wR.toFixed(2)} W)`}),
    {label:`Front main-loop passes (${SIM.fmtDur(K.LOOP)}) ${'(MLC8 fw)'}`, h:22, draw(cx,X,t0,t1,y,h){ if(D.power&&built()) SIM.pulses(cx,X,t0,t1,y,h,K.LOOP,0,K.LOOP*0.3,css('--ink2'),'passes'); }},
    {label:'Encoder A/B (last MASTER turn)', h:26, draw(cx,X,t0,t1,y,h){ if(lt===null) return; cx.strokeStyle=css('--warn'); cx.beginPath(); const d=0.004; for(let k=0;k<4;k++){ const ta=lt+k*d; cx.moveTo(X(ta),y+h-4); cx.lineTo(X(ta),y+4); cx.lineTo(X(ta+d/2),y+4); cx.lineTo(X(ta+d/2),y+h-4); } cx.stroke(); }},
    {label:`LED ring (${ringLit()}/25 lit)`, h:20, draw(cx,X,t0,t1,y,h){ cx.fillStyle=(D.power&&built())?'#e8b830':css('--grid'); cx.fillRect(X(t0),y+5,(X(t1)-X(t0))*ringLit()/25,h-10); }},
  ]; }

/* ---------------- tabs ---------------- */
function inspHTML(){ const c=chain(); return `<table class="kv"><tr><th>Assembly</th><td class="mono">${built()?'complete':'missing '+Object.keys(D.asm).filter(k=>!D.asm[k]).join(', ')}</td></tr>
  <tr><th>Channels</th><td class="mono">${CH.map((x,i)=>D.mute[i]?'<s>'+x+'</s>':x).join(' ')}</td></tr>
  <tr><th>MASTER</th><td class="mono">${D.vol} dB · ring ${ringLit()}/25</td></tr>
  <tr><th>Speakers</th><td class="mono">L ${c.oL.toFixed(2)} V ${c.wL.toFixed(2)} W · R ${c.oR.toFixed(2)} V ${c.wR.toFixed(2)} W ${c.clip?'<b style="color:var(--bad)">CLIP</b>':''}</td></tr></table>`; }
function viewSim(m){ window[KEY]=false;
  m.innerHTML = card('Front strip (ABAB.dwg, to scale) — press L R C LFE LS RS, click MASTER', `<div id="fs"></div>${controlsHTML()}`)
   + card('Bottom pan, top view (MLC6R-M6-LAYOUT.dwg, to scale) — click a part to fit or remove it', `<div id="pan"></div>`)
   + `<div class="grid2">${card('What happened (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>`
   + card('Timeline — one second (click to seek)', `<canvas id="tl"></canvas>`);
  bindControls(m);
  SIM.on('time', ()=>{ m.querySelector('#fs').innerHTML=frontSVG(); bind(m.querySelector('#fs')); m.querySelector('#pan').innerHTML=panSVG(SIM.t); bind(m.querySelector('#pan'));
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=inspHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); });
}
const LESSONS=[
  {title:'1 · Start from the bare pan', body:`<p>Only metalwork survives for the MLC6R, so the tutorial starts as an assembly job. Click every fitted part on the pan to remove it, leaving the bare MLC6R-M1 bottom pan (17.250″ × 6.000″, 20-gauge steel, textured WBS black).</p>`, check:()=>Object.values(D.asm).every(v=>!v), hint:'Click each outlined part on the pan view until all are dashed red.'},
  {title:'2 · Fit the speakers', body:`<p>Two EN5F speakers sit in the large cut-outs, each on a .125″ grey PVC shim (MLC6R-M1 notes). The drawing was revised: “MOVED MOUNTING HOLES FURTHER APART”.</p>`, check:()=>D.asm.spkL&&D.asm.spkR, hint:'Click both speaker circles.'},
  {title:'3 · Fit the electronics', body:`<p>Fit the large board and the <b>AMS8E-81 ISS.1 POWER AMP</b>. The amp's heatsink edge faces the rear, as drawn.</p>`, check:()=>D.asm.main&&D.asm.amp, hint:'Click the two rectangles.'},
  {title:'4 · Fit the encoder and front strip', body:`<p>The encoder (block ENCODER-BIG-CUP) sits at the front centre. The ABAB strip carries six 0.516″ holes on a 1.000″ pitch and the encoder hole with its ring of 25 LED holes.</p>`, check:()=>built(), hint:'Click the encoder circle and the front strip.'},
  {title:'5 · Power up and set a level', body:`<p>Power on, then turn MASTER to <b>−10 dB</b>. Each detent moves 1 dB (two 0.5 dB indexes, as in the MLC8 firmware ${inf('')}) and the ring follows.</p>`, check:()=>D.power&&built()&&D.vol===-10, hint:'Power on, then click the right half of MASTER until −10 dB.'},
  {title:'6 · Mute the surrounds', body:`<p>Press <b>LS</b> and <b>RS</b>. The fold-down to the two speakers loses its surround contribution.</p>`, check:()=>D.mute[4]&&D.mute[5], hint:'Press LS and RS on the strip.'},
  {title:'7 · Find the amplifier limit', body:`<p>Raise MASTER to 0 dB and the programme to +16 dBu. The LM4766 (AMS8E-8 figures: 22.8 dBu max, ≈ 14 W into 8 Ω) clips.</p>`, check:()=>chain().clip, hint:'MASTER to 0 dB, programme slider up.'},
  {title:'Done', body:'<p>That is everything the drawings let us build. The Findings tab lists what the files disagree on.</p>', check:()=>true, auto:true},
];
let li=0;
function viewTut(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — assembling and using an MLC6R (from the metalwork drawings)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="pan"></div><div id="fs" style="margin-top:6px"></div>${controlsHTML()}`)}${card('What happened', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#pan').innerHTML=panSVG(SIM.t); bind(m.querySelector('#pan')); m.querySelector('#fs').innerHTML=frontSVG(); bind(m.querySelector('#fs')); m.querySelector('#trace').innerHTML=traceHTML();
    const pw=m.querySelector('#pw'); if(pw) pw.textContent=D.power?'Power off':'Power on';
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{li=+x.dataset.i;draw();});
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
     <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="st">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#st').onclick=()=>{ reset(); D.log.length=0; li=0; SIM.refresh(); }; };
  SIM.on('time', draw);
}
function viewSecond(m){ window[KEY]=false;
  m.innerHTML=card('One second in slow motion', `<canvas id="tl"></canvas><p class="small muted">Audio and amplifier lanes follow the inferred chain. The front-panel loop pass (${SIM.fmtDur(K.LOOP)}) is the MLC8 v205 figure (mlc8.js); it is assumed, not documented, that the MLC6R used the same MLC6A front firmware. A MASTER turn shows as the quadrature burst at the time you clicked.</p>`)
   + card('Time scales', `<table class="kv small"><tr><th>Tone</th><td>1 kHz on every channel: zoom to 5 ms</td></tr><tr><th>Front loop</th><td>${(1/K.LOOP).toFixed(0)} passes per second ${inf('MLC8 firmware')}</td></tr><tr><th>Encoder</th><td>one detent = one quadrature cycle, drawn 4 ms wide ${inf('')}</td></tr><tr><th>LED ring</th><td>25 LEDs, 11° pitch, 264° sweep (ABAB.dwg)</td></tr></table>`);
  SIM.on('time', ()=>SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}));
}
const BLOCKS={
  fs:{x:10,y:20,w:150,h:70,t:'Front strip',s:['6 × B (L R C LFE LS RS)','E encoder + 25-LED ring'],d:'ABAB.dwg: 7.85 × 1.66 in. Six 0.516″ holes on 1.000″ centres and one 0.746″ encoder hole ringed by 25 LED holes. Channel names from the MLC-6A silk (inferred to carry over).'},
  fr:{x:200,y:20,w:150,h:70,t:'MLC6 front logic',s:['ATmega128 (MLC6A)','MASTER_VOLUME, rings'],d:'Not drawn for the MLC6R. The MLC6A front board (ATmega128, ICCAVR v205, encoder1..9.c) is the likely brain (inferred).'},
  main:{x:200,y:130,w:150,h:70,t:'Large board',s:['big round part','CONNECTOR, "K"'],d:'Unlabelled board on the M6 layout: one large round component (transformer or reservoir capacitor), a CONNECTOR and a part marked K. Its function is not written anywhere (inferred: supply / audio board).'},
  amp:{x:400,y:130,w:150,h:70,t:'AMS8E-81 ISS.1',s:['POWER AMP','heatsink to rear'],d:'Labelled “AMS8E-81 ISS.1 POWER AMP” on the layout. The AMS8 speaker amp family is LM4766-based (AMS8E-8, ams8e.js): +7.8 dB into 8 Ω, 22.8 dBu max.'},
  spk:{x:600,y:110,w:160,h:110,t:'2 × EN5F speakers',s:['Minneapolis speaker','.125 grey PVC shims','in the bottom pan'],d:'Two speakers in the bottom pan cut-outs (MLC6R-M1 sidecar: MINNEOPOLIS SPEAKER, SPEAKER SHIM FOR SPEAKER P/N EN5F, AMS8-M8).'},
  pan:{x:400,y:20,w:150,h:70,t:'MLC6R-M1 pan',s:['17.25 × 6.00, 20 ga','textured WBS black'],d:'Bottom pan: .036 CRS, paint extra fine textured WBS black, 8 × A holes (.114 dia csk to .170).'},
};
const WIRES=[['fs','fr'],['fr','main'],['main','amp'],['amp','spk'],['pan','spk'],['pan','amp']];
let bsel='amp';
function viewBlock(m){ window[KEY]=false; m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 780 230" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.2}" stroke-dasharray="${a==='pan'?'4 4':''}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }
const T=(x,y,t,sz,a)=>`<text x="${x}" y="${y}" font-size="${sz||11}" fill="var(--ink)" ${a?'text-anchor="'+a+'"':''}>${t}</text>`, BX=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/>`, W_=d=>`<path d="${d}" fill="none" stroke="var(--ink)"/>`;
const SHEETS=[
  {name:'1 · Interconnect (inferred)', note:'No MLC6R schematic or netlist exists. This sheet only connects the parts the layout places, using the MLC6A and AMS8E names. Every connection is inferred.', svg:()=>
    `${BX(20,40,150,90)}${T(95,66,'Front strip',12,'middle')}${T(95,84,'6 × B · E + 25 LEDs',10,'middle')}${BX(230,40,170,90)}${T(315,66,'MLC6 front / main',12,'middle')}${T(315,84,'(not drawn)',10,'middle')}
     ${BX(460,40,160,90)}${T(540,66,'AMS8E-81 ISS.1',12,'middle')}${T(540,84,'POWER AMP (LM4766?)',10,'middle')}${BX(680,20,120,50)}${T(740,50,'SPK L EN5F',11,'middle')}${BX(680,100,120,50)}${T(740,130,'SPK R EN5F',11,'middle')}
     ${W_('M170 85 H230 M400 70 H460 M400 100 H460 M620 60 H680 M620 110 H680')}${T(180,78,'ribbon')}${T(410,62,'L in')}${T(410,94,'R in')}
     ${BX(230,180,170,70)}${T(315,210,'Large board',12,'middle')}${T(315,228,'supply? (round part)',10,'middle')}${W_('M315 180 V130 M400 215 H540 V130')}${T(420,208,'+/− rails')}
     <text x="20" y="300" font-size="11" fill="var(--warn)">Every line on this sheet is inferred: the MLC6R folder holds metalwork only.</text>` },
  {name:'2 · Front strip hole map', note:'From ABAB.dwg geometry (true inches). Ring holes are .040″ dia on a .373″ radius, 11° pitch.', svg:()=>{ const S=100; let s=`<g transform="translate(30,60)">${BX(0,0,FS.W*S,FS.H*S)}`;
    for(let i=0;i<6;i++){ const [x,y]=FS.b(i); s+=`<circle cx="${x*S}" cy="${y*S}" r="${0.258*S}" fill="none" stroke="var(--ink)"/><circle cx="${x*S}" cy="${y*S}" r="${0.344*S}" fill="none" stroke="var(--ink2)" stroke-dasharray="3 3"/>${T(x*S,y*S+4,'B'+(i+1)+' '+CH[i],10,'middle')}`; }
    const [ex,ey]=FS.e; s+=`<circle cx="${ex*S}" cy="${ey*S}" r="${0.373*S}" fill="none" stroke="var(--ink)" stroke-dasharray="2 3"/><circle cx="${ex*S}" cy="${ey*S}" r="${0.469*S}" fill="none" stroke="var(--ink2)"/>${T(ex*S,ey*S+4,'E',12,'middle')}`;
    s+=`${T(0,-10,'0.511 + n × 1.000 (B1…B6)  ·  E at 7.011  ·  all on 0.827 from the top edge')}</g>`; return s; } },
];
let si=0, orig=false;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematics — redrawn sheets (not original CAD) · original drawings alongside', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===si&&!orig?'on':''}" data-i="${k}">${s.name}</button>`).join('')+`<button data-o="1" class="${orig?'on':''}">Original drawings (DWG → SVG)</button>`;
    m.querySelectorAll('#tb button').forEach(b=>b.onclick=()=>{ if(b.dataset.o) orig=true; else { orig=false; si=+b.dataset.i; } draw(); });
    if(orig){ m.querySelector('#sh').innerHTML=`<div style="background:#fff;border-radius:8px;padding:6px"><img src="${ASSET}mlc6r-pan.svg" style="width:100%" alt="MLC6R-M6-LAYOUT pan"><img src="${ASSET}mlc6r-front.svg" style="width:60%;margin-top:10px" alt="ABAB front strip"></div>`; m.querySelector('#sn').textContent='MLC6R-M6-LAYOUT.dwg (pan region) and ABAB.dwg converted with QCAD dwg2dwg → DXF → SVG.'; return; }
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 320" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[si].svg()}<text x="850" y="312" text-anchor="end" font-size="10" fill="var(--ink2)">MLC6R · sheet ${si+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[si].note; };
  draw(); }
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<p class="small muted">No MLC6R firmware exists. If it used the MLC6A front firmware (inferred), MASTER behaves like MLC8's MASTER_VOLUME. This tab shows that path and the speaker chain stage by stage.</p><div class="grid2">${card('Encoder → ring → audio (live)', `<div id="fl"></div>`)}${card('Speaker chain (live)', `<div id="sp"></div>`)}</div>`;
  SIM.on('time', ()=>{ const c=chain(), lt=lastTurn(), hot=lt!==null && SIM.t>=lt && SIM.t<lt+0.05;
    const steps=[['PROCESS_SHAFT_ENCODER','A/B state table, one index per edge'],['MASTER_VOLUME()','volume ±1 index (0.5 dB), volume_take = YES'],['CONVERT_DIAL_INFORMATION','index → '+ringLit()+'/25 ring LEDs'],['ALTERA_write / UART','ring bits out, volume to main board']];
    m.querySelector('#fl').innerHTML=`<svg viewBox="0 0 520 ${steps.length*50+10}" style="width:100%">${steps.map((s,i)=>`<rect x="10" y="${10+i*50}" width="500" height="40" rx="6" fill="${hot?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="20" y="${27+i*50}" font-size="12" font-family="var(--mono)" fill="${hot?'#fff':'var(--ink)'}">${s[0]}</text><text x="20" y="${42+i*50}" font-size="10.5" fill="${hot?'#fff':'var(--ink2)'}">${s[1]}</text>`).join('')}</svg><p class="small muted">Lit for 50 ms after a MASTER turn. Function names are from the MLC8 v205 source (mlc8.js).</p>`;
    const d=x=>x>0?(20*Math.log10(x/0.7746)).toFixed(1)+' dBu':'—';
    m.querySelector('#sp').innerHTML=`<table class="kv"><tr><th>Stage</th><th>L</th><th>R</th></tr><tr><td>Per-channel programme</td><td class="mono" colspan="2">${D.src} dBu × ${6-D.mute.reduce((a,b)=>a+b,0)} live channels</td></tr>
      <tr><td>Fold-down (L+.707C+.707LS) ${inf('')}</td><td class="mono">${d(c.inL)}</td><td class="mono">${d(c.inR)}</td></tr><tr><td>MASTER</td><td class="mono" colspan="2">${D.vol} dB</td></tr>
      <tr><td>LM4766 +7.8 dB, limit 22.8 dBu</td><td class="mono">${d(c.oL)}</td><td class="mono">${d(c.oR)}</td></tr><tr><td>Into 8 Ω</td><td class="mono">${c.wL.toFixed(2)} W</td><td class="mono">${c.wR.toFixed(2)} W</td></tr></table>${c.clip?'<p style="color:var(--bad)"><b>Amplifier clipping.</b></p>':''}`; });
}
function viewNotes(m){ window[KEY]=false;
  m.innerHTML=card('Findings — what the MLC6R folder is up to', `<ol>
   <li><b>An MLC6 with its own speakers, borrowed from the AMS8.</b> The bottom pan carries two EN5F speaker cut-outs, the AMS8-M8 speaker shim and an “AMS8E-81 ISS.1 POWER AMP” with heatsink. The same AMS8E-81 label appears in the AMS8 BOTTOM PAN LAYOUT drawings, so the MLC6R pan is an AMS8 pan re-used under an MLC name. The product's name “R” and purpose are not written down ${inf('README guessed “rack version”')}.</li>
   <li><b>The layout file is mis-named.</b> MLC6R-M6-LAYOUT.dwg's title block reads “MLC6R-M1-LAYOUT” (it lays out the M1 bottom pan). There is no M6 part drawing in the folder.</li>
   <li><b>Scratch files became blocks.</b> ZZZZZZ is inserted twice in the layout as a block (once mirrored), and ZZZZZZ.bak / AAAAA.bak are the matching scratch drawings. MLC6R-M2.bak is the same size as AAAAA.bak (67,458 bytes) but differs from byte 173 on: a re-save of the same drawing, not an M2 part.</li>
   <li><b>The encoder is in two places.</b> The layout top view puts the ENCODER block at the pan's front centre (8.29″ from the left). The ABAB front strip, centred the same way on the layout's front elevation, puts its E hole at its right end (≈ 11.4″). One of the two was not updated ${inf('converted geometry')}.</li>
   <li><b>ABAB is the front strip.</b> The unnamed ABAB.dwg is a 7.85 × 1.66″ strip: six holes on a 1.000″ pitch and one encoder hole with 25 LED holes at 11° (a 264° sweep), the same 25-LED ring the MLC8 uses on its dials. Six holes match the MLC-6A silk's six channels (L R C LFE LS RS).</li>
   <li><b>All work was done in three days.</b> Every file is dated 21–23 June 2006 (pan issue 1 dated MAY 10/06), by drafter E.S. Nothing later exists: the variant was probably not built ${inf('no BOM, PCB or manual')}.</li>
   <li><b>The large board is unidentified.</b> The layout labels only CONNECTOR and K on it; its round part could be a toroid or reservoir capacitor ${inf('')}.</li></ol>`)
   + card('Assumptions in this model', `<ul class="small"><li>B buttons = channel mutes in MLC-6A order ${inf('')}.</li><li>Stereo fold-down for the two speakers ${inf('ITU-style coefficients')}; LFE not reproduced.</li><li>MASTER: 0.5 dB per index, 2 per detent, ring over −60…0 dB ${inf('mlc8.js')}.</li><li>Amplifier figures from AMS8E-8 test sheet (ams8e.js) ${inf('AMS8E-81 = AMS8E-8 family')}.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>#MLC - #SERIES/XXX - MLC6R - #OBSOLETE #Archive/MLC6R-M1.dwg · MLC6R-M6-LAYOUT.dwg · ABAB.dwg · *.bak · README.md</li><li>XXX - MLC6A - #OBSOLETE #Archive/mlc6A-SILK.cdr (sidecar text) · siumulation-plugins/mlc8.js · ams8e.js</li><li>assets: mlc6r-pan.svg, mlc6r-front.svg</li></ul>`);
}
SIM.register({
  id:'mlc6r', product:'MLC6R', name:'MLC6R · MLC6 with built-in speakers, metalwork (2006|39)', year:2006,
  family:'Obsolete products', folder:'#MLC - #SERIES/XXX - MLC6R - #OBSOLETE #Archive',
  summary:'An MLC6 multichannel level control built into an AMS8-style chassis with two speakers and an AMS8E-81 power amp. Only the June 2006 metalwork survives: the bottom pan, its parts layout and an unnamed front strip with six channel holes and a 25-LED master encoder.',
  highlights:['Bottom pan and front strip drawn from the DWGs, to scale','Assembly tutorial: fit speakers, amp, encoder and strip','Master encoder with its 25-LED ring','Speaker fold-down and amplifier headroom','Mis-named and duplicated drawing files'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 front loop pass',period:()=>K.LOOP},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms (encoder burst)'],[0.005,'5 ms (tone cycles)']],
  defaultZoom:0,
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: assemble & use',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Software (inferred)',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
