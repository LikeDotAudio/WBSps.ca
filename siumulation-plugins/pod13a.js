/* =====================================================================
   POD13A — Dual AES/EBU digital-to-analog converter (Ward-Beck Systems, 2008|41)
   Plugin for the WBS Device Simulator (../siumulation.html). Full model: ATmega128 (Atmel V100) and LatticeXP
   (Lattice V100) code. Corrected 2026|59 (see pod13.js): both are archived in the obsolete POD13 folder.

   Sources used (folder #POD #SERIES/POD13A - #Master):
   - POD13A - #Engineering/POD13A - #MANUAL/POD13A Manual Oct62008.pdf    (manual, Issue 1, 6 Oct 2008)
   - POD13A - #Engineering/POD13A - #TESTING/.../POD13A TEST PROCEDURE.doc (ISS 2 procedure, rev. 14 Oct 2008)
   - .../October102008 POD13A FUNCTIONAL TEST.xls                        (measured results, 30 Sep 2008)
   - POD13A - #Master/POD13A-PCAD-BOM.txt, POD13A-MAIN-ERP-BOM.csv, POD13A-REAR-ERP-BOM.csv
   - POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).pdf + Pics/, POD13A - #Photos/
   - #POD #SERIES/XXX - POD13 - #Master #OBSOLETE/POD13 - #Software/POD13 - SOFTWARE #atmel/POD13 - #SOFTWARE #atmel #v100/
     v100w.c, D6204A.c/.h, AK4396.c, cs84xx.c, altera.c (Atmel V100)
   - .../POD13 - #Software/POD13 - #SOFTWARE #lattice2/v100/pod13a.vhd, dec2_4.vhd, SR_DETECT_192.vhd, pod13a.jed (Lattice V100)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
/* ---------- POD-family helper kit (inlined in each POD plugin; same code in each file) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
function card(t,b,cls){ return `<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`; }
const ASSET = 'siumulation-plugins/assets/';
const dbu2v = d => 0.7746*Math.pow(10,d/20);           // dBu -> V rms
const v2dbu = v => v>1e-9 ? 20*Math.log10(v/0.7746) : -200;
const sgn = x => (x>=0?'+':'') ;
const fdb = (d,n) => d<-150 ? '−∞' : (d>=0?'+':'−')+Math.abs(d).toFixed(n==null?1:n);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

/* ---- panel primitives, in silkscreen pixels (200 dpi, 1 mm = 7.874 px, face 1714 × 321) ---- */
const PW = 1714, PH = 321;
function panelSVG(prefix, side, inner, label){
  const layers = side==='front' ? ['front-green','front-white'] : ['rear-white'];
  return `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${label||''}" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="glow${side}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${PW}" height="${PH}" rx="10" fill="var(--dev)"/>
    ${inner.under||''}
    ${ART.cdr ? `<image href="${ASSET}${prefix}-${side}.svg" width="${PW}" height="${PH}"/>` : layers.map(l=>`<image href="${ASSET}${prefix}-${l}.png" width="${PW}" height="${PH}"/>`).join('')}
    ${inner.over||''}
    ${screw(50,160)}${screw(1664,160)}
  </svg>`;
}
/* Panel artwork 2026|59: CorelDRAW sheet converted with Inkscape (libcdr) → assets/pod13a-front.svg, -rear.svg
   (ink plates coloured green rgb(52,168,83) / white rgb(240,240,236), cut-outs as dark holes, drill crosshairs faint;
   registered to the older PDF PNG silks to ±1 px so every control keeps its place). The PNGs stay on a toggle. */
const ART = {cdr:true};
const ART_CDR = '#POD #SERIES/POD13A - #Master/POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).cdr', ART_PDF = '#POD #SERIES/POD13A - #Master/POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).pdf';
function artNote(){ return `<div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART_CDR, ART_CDR.split('/').pop())} (CorelDRAW, default) · <label><input type="checkbox" class="pod13a-art" ${ART.cdr?'':'checked'}> show the older PNG silks cut from ${SIM.src(ART_PDF, 'the PDF')}</label></div>`; }
document.addEventListener('change', e=>{ if (e.target && e.target.classList && e.target.classList.contains('pod13a-art')){ ART.cdr = !e.target.checked; SIM.refresh(); } });
function screw(x,y){ return `<circle cx="${x}" cy="${y}" r="13" fill="#6d7175" stroke="#3a3d40" stroke-width="2"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#33363a" stroke-width="3"/>`; }
function rocker(on, x, y){ x=x||137; y=y||58;
  return `<g class="pwr" style="cursor:pointer"><title>Power rocker: click to switch ${on?'off':'on'}</title><rect x="${x}" y="${y}" width="112" height="146" rx="10" fill="#0a0b0c" stroke="#30333a" stroke-width="2"/>
    <rect x="${x+16}" y="${on?y+12:y+68}" width="80" height="64" rx="7" fill="#1d2023" stroke="#3a3d40" stroke-width="2"/><text x="${x+56}" y="${on?y+52:y+108}" text-anchor="middle" font-size="22" fill="#55595c">${on?'I':'O'}</text></g>`; }
function led(x,y,on,col,r){ r=r||10; return `<circle cx="${x}" cy="${y}" r="${r+3.5}" fill="#0a0b0b"/><circle cx="${x}" cy="${y}" r="${r}" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#glowfront)"':''}/>`; }
function pled(on){ return led(299,217,on,'#d8ff70',10); }
function trim(x,y,frac,cls,title){   // PCB trimmer seen through a panel hole; frac 0..1 = CCW..CW
  const a = (-135 + 270*frac)*Math.PI/180, dx=Math.sin(a)*13, dy=-Math.cos(a)*13;
  return `<g class="${cls||'trim'}" style="cursor:pointer"><title>${title||'Trim'}: click right half to turn clockwise, left half counter-clockwise (or use the mouse wheel)</title>
    <circle cx="${x}" cy="${y}" r="30" fill="transparent"/><circle cx="${x}" cy="${y}" r="19" fill="#c9cbcc" stroke="#55595c" stroke-width="3"/>
    <line x1="${x-dx}" y1="${y-dy}" x2="${x+dx}" y2="${y+dy}" stroke="#222" stroke-width="5" stroke-linecap="round"/><circle cx="${x+dx*0.9}" cy="${y+dy*0.9}" r="3" fill="#d33a2c"/></g>`; }
function xlr(x,y,male,plugged,cls,title){
  const pins = male ? [[-20,-12],[20,-12],[0,22]].map(([a,b])=>`<circle cx="${x+a}" cy="${y+b}" r="7" fill="#d8b04a"/>`).join('')
                    : [[-20,-12],[20,-12],[0,22]].map(([a,b])=>`<circle cx="${x+a}" cy="${y+b}" r="9" fill="#050505" stroke="#444"/>`).join('');
  return `<g class="${cls||''}" style="${cls?'cursor:pointer':''}">${title?`<title>${title}</title>`:''}<circle cx="${x}" cy="${y}" r="74" fill="#b9bcbf" stroke="#6b6f73" stroke-width="4"/><circle cx="${x}" cy="${y}" r="58" fill="#121314"/>${pins}
    ${plugged?`<circle cx="${x}" cy="${y}" r="52" fill="#2c2f33" opacity=".92"/><rect x="${x-22}" y="${y-10}" width="44" height="20" fill="#44484d"/><circle cx="${x+50}" cy="${y-60}" r="9" fill="var(--accent)"/>`:''}</g>`; }
function rca(x,y,col,plugged,cls,title){
  return `<g class="${cls||''}" style="${cls?'cursor:pointer':''}">${title?`<title>${title}</title>`:''}<circle cx="${x}" cy="${y}" r="38" fill="#0c0d0e"/><circle cx="${x}" cy="${y}" r="27" fill="#d7c071"/><circle cx="${x}" cy="${y}" r="19" fill="${col}"/><circle cx="${x}" cy="${y}" r="7" fill="#111"/>
    ${plugged?`<circle cx="${x}" cy="${y}" r="24" fill="#2b5f9e" opacity=".93"/><circle cx="${x}" cy="${y}" r="10" fill="#3a74b8"/>`:''}</g>`; }
function bnc(x,y,plugged,cls,title,r){ r=r||46;
  return `<g class="${cls||''}" style="${cls?'cursor:pointer':''}">${title?`<title>${title}</title>`:''}<circle cx="${x}" cy="${y}" r="${r}" fill="#b9a25a" stroke="#6e5d22" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r*0.64}" fill="#e2d3a0"/><circle cx="${x}" cy="${y}" r="${r*0.22}" fill="#7a5f12"/>
    ${plugged?`<circle cx="${x}" cy="${y}" r="${r*0.9}" fill="#2b5f9e" opacity=".9"/><circle cx="${x}" cy="${y}" r="${r*0.4}" fill="#3a74b8"/>`:''}</g>`; }
function phx(x,y,plugged,cls,title){   // 3-pin 3.81 mm Phoenix header, centre (x,y)
  return `<g class="${cls||''}" style="${cls?'cursor:pointer':''}">${title?`<title>${title}</title>`:''}<rect x="${x-50}" y="${y-28}" width="100" height="56" rx="4" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>${[-30,0,30].map(d=>`<rect x="${x+d-11}" y="${y-14}" width="22" height="28" fill="#0e4d25"/>`).join('')}
    ${plugged?`<rect x="${x-46}" y="${y-24}" width="92" height="22" fill="#2b5f9e" opacity=".85"/>`:''}</g>`; }
function iec(x0,y0,x1,y1){ const w=x1-x0,h=y1-y0;
  return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="12" fill="#0c0d0e" stroke="#2c2f33" stroke-width="3"/><rect x="${x0+w*.18}" y="${y0+h*.16}" width="${w*.64}" height="${h*.68}" rx="10" fill="#151719"/>
    ${[[.38,.34],[.62,.34],[.5,.68]].map(([a,b])=>`<rect x="${x0+w*a-8}" y="${y0+h*b-16}" width="16" height="32" fill="#777"/>`).join('')}`; }
function dip(x,y,states,cls,labels){  // states: array of booleans (true = ON/up)
  let s=`<g><rect x="${x-6}" y="${y-6}" width="${states.length*30+12}" height="70" rx="4" fill="#3d7bc9" stroke="#1d4d8a" stroke-width="2"/>`;
  states.forEach((on,i)=>{ s+=`<g class="${cls||'dip'}" data-i="${i}" style="cursor:pointer"><title>${labels&&labels[i]?labels[i]+': ':''}${on?'ON':'OFF'} — click to flip</title><rect x="${x+i*30+4}" y="${y}" width="22" height="58" fill="#e8ecef"/><rect x="${x+i*30+6}" y="${on?y+3:y+29}" width="18" height="26" fill="#2a2d31"/></g>`; });
  return s+'</g>'; }
/* bind trims inside a rendered panel: cls -> fn(dir) */
function bindTrim(root, cls, fn){ root.querySelectorAll('.'+cls).forEach(g=>{
  g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); fn((e.clientX-r.left)/r.width < 0.5 ? -1 : 1); });
  g.addEventListener('wheel', e=>{ e.preventDefault(); fn(e.deltaY<0?1:-1); }, {passive:false}); }); }

/* ---- action log: every user action logs the circuit path it exercises ---- */
function makeActor(D, getSummary){
  return function act(name, fn){
    const trace=[]; const tr=s=>trace.push(s);
    fn(tr);
    D.log.unshift({t:SIM.t, name, trace, sum:getSummary?getSummary():''}); if (D.log.length>60) D.log.length=60;
    SIM.refresh();
  };
}
function traceHTML(D, hint){ return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : `<div class="muted">${hint||'Use a control. The circuit path it exercises is listed here.'}</div>`; }
function logHTML(D){ return D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span>${e.sum?' → '+e.sum:''}</div>`).join('') || '<div class="muted">No actions yet.</div>'; }

/* ---- stage table with a headroom bar per stage ---- */
function stageTable(stages, unit){
  unit = unit||'dBu';
  return `<table class="kv"><tr><th>Stage</th><th>Gain</th><th>Level</th><th>Clips at</th><th style="width:34%">Headroom</th></tr>${stages.map(s=>{
    const hr = s.clip!=null ? s.clip - s.lvl : null; const bad = hr!=null && hr<0, tight = hr!=null && hr<6;
    const w = hr==null? 0 : clamp(hr,0,30)/30*100;
    return `<tr><td>${s.name}${s.note?`<div class="small muted">${s.note}</div>`:''}</td><td class="mono">${s.gain==null?'—':fdb(s.gain)+' dB'}</td><td class="mono">${s.lvl<-150?'—':fdb(s.lvl)+' '+(s.unit||unit)}</td><td class="mono">${s.clip==null?'—':fdb(s.clip)+' '+(s.unit||unit)}</td>
      <td>${hr==null?'<span class="muted small">n/a</span>':`<div style="background:var(--chip);border-radius:4px;height:14px;position:relative"><div style="width:${bad?100:w}%;height:14px;border-radius:4px;background:${bad?'var(--bad)':tight?'var(--warn)':'var(--accent)'}"></div></div><span class="small mono">${bad?'CLIPPING by '+(-hr).toFixed(1)+' dB':hr.toFixed(1)+' dB'}</span>`}</td></tr>`; }).join('')}</table>`;
}

/* ---- waveform lane for drawLanes: fn(t) -> volts, drawn against ±vmax, with clip marks ---- */
function waveLane(label, fn, vmax, clip, color, h, env){
  // env(t) -> peak |v| ; used when the carrier is too dense to draw (more than 1 cycle per 3 px)
  return { label, h:h||40, draw(c,X,t0,t1,y,hh){
    const pw = X(t1)-X(t0), N = Math.min(1600, Math.max(200, pw*2)), span=t1-t0;
    const col = color||SIM.css('--accent');
    if (vmax<0){ // auto-scale: fit the largest value in view (or the clip level if it is close), min |vmax|
      let pk=0; for (let i=0;i<=200;i++){ const tt=t0+span*i/200; pk=Math.max(pk, Math.abs(env&&env.dense&&env.dense(span,pw)? env(tt) : fn(tt))); }
      if (env && !(env.dense&&env.dense(span,pw))) pk=Math.max(pk, env(t0+span/2));
      vmax = Math.max(pk*1.15, -vmax); if (clip && clip < vmax*1.6) vmax=Math.max(vmax, clip*1.08);
      c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText('±'+(vmax<1?(vmax*1000).toFixed(0)+' mV':vmax.toFixed(vmax<10?2:1)+' V'), X(t1)-70, y+hh-3);
    }
    if (env && env.dense && env.dense(span, pw)){
      c.fillStyle=col; c.globalAlpha=.35; const M=Math.min(500,pw);
      for (let i=0;i<M;i++){ const tt=t0+span*(i+.5)/M, a=clamp(env(tt)/vmax,0,1)*(hh/2-3); c.fillRect(X(t0)+pw*i/M, y+hh/2-a, pw/M+0.6, 2*a+0.5); }
      c.globalAlpha=1; if (clip && clip<vmax){ c.strokeStyle=SIM.css('--bad'); c.setLineDash([4,4]); [clip,-clip].forEach(v=>{ const yy=y+hh/2-v/vmax*(hh/2-3); c.beginPath(); c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); }); c.setLineDash([]); }
      if (env(t0+span/2) >= (clip||1e9)*0.999){ c.fillStyle=SIM.css('--bad'); c.font='bold 11px sans-serif'; c.fillText('CLIP', X(t1)-36, y+12); }
      return;
    }
    if (clip && clip<vmax){ c.strokeStyle=SIM.css('--bad'); c.globalAlpha=.35; c.setLineDash([4,4]); [clip,-clip].forEach(v=>{ const yy=y+hh/2-v/vmax*(hh/2-3); c.beginPath(); c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); }); c.setLineDash([]); c.globalAlpha=1; }
    c.strokeStyle=col; c.lineWidth=1.2; c.beginPath(); let clipped=false;
    for (let i=0;i<=N;i++){ const tt=t0+span*i/N; let v=fn(tt); if (clip && Math.abs(v)>=clip*0.999) clipped=true; const yy=y+hh/2 - clamp(v/vmax,-1,1)*(hh/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); }
    c.stroke();
    if (clipped){ c.fillStyle=SIM.css('--bad'); c.font='bold 11px sans-serif'; c.fillText('CLIP', X(t1)-36, y+12); }
  }};
}
function textLane(label, fn, h){ return {label, h:h||22, draw(c,X,t0,t1,y,hh){ c.fillStyle=SIM.css('--ink2'); c.font='11px '+SIM.css('--mono'); c.fillText(fn(t0,t1), X(t0)+6, y+hh/2+4); }}; }
function boolLane(label, fn, color, h){ return {label, h:h||20, draw(c,X,t0,t1,y,hh){ const N=Math.min(800,Math.max(60,(X(t1)-X(t0))/2)), span=t1-t0; c.fillStyle=color||SIM.css('--accent');
  for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; if (fn(tt)) c.fillRect(X(t0+span*i/N), y+4, (X(t1)-X(t0))/N+0.6, hh-8); } }}; }

/* ---- zoom ladder: the same stage waveform at nested time spans ---- */
function drawLadder(cv, t, levels, fn, vmax, label){
  const H = levels.length*44+10, {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid');
  if (vmax<0){ let pk=0; const sp=levels[levels.length-2]?levels[levels.length-2][1]:0.01; for(let k=0;k<400;k++) pk=Math.max(pk,Math.abs(fn(t-sp/2+sp*k/400))); vmax=Math.max(pk*1.15,-vmax); label=(label||'')+' (±'+vmax.toFixed(2)+' V)'; }
  levels.forEach(([nm,span],i)=>{
    const y=8+i*44, t0=Math.max(0, Math.min(1-span, t-span/2));
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')', 6, y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(label||'', 6, y+28);
    const x0=180, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30);
    c.strokeStyle=acc; c.beginPath(); const N=Math.min(900,pw*1.5);
    for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const v=fn(tt)/vmax; const yy=y+17-clamp(v,-1,1)*13; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy);} c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=x0+(Math.max(0,Math.min(1-ns,t-ns/2))-t0)/span*pw; c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,ns/span*pw),30); c.globalAlpha=1; }
  });
}

/* ---- tutorial engine ---- */
function tutorialView(m, T){
  // T: {lessons, unitHTML(), bind(root), reset(), flag, getIdx(), setIdx(i), D}
  m.innerHTML = `<div class="grid2"><div>${card(T.title, `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="unit"></div>`)}${card('What the circuit did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw=()=>{
    m.querySelector('#unit').innerHTML = T.unitHTML(); T.bind(m.querySelector('#unit'));
    m.querySelector('#trace').innerHTML = traceHTML(T.D);
    const idx=T.getIdx(), L=T.lessons;
    m.querySelector('#lessons').innerHTML = L.map((l,i)=>`<li style="cursor:pointer;${i===idx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<idx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ T.setIdx(+li.dataset.i); draw(); });
    const le=L[idx], ok=le.check();
    m.querySelector('#lesson').innerHTML = `<h2>${le.title}</h2>${le.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(le.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(le.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${idx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${idx<L.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory state)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ T.setIdx(Math.max(0,idx-1)); draw(); };
    m.querySelector('#nxt').onclick=()=>{ T.setIdx(Math.min(L.length-1,idx+1)); draw(); };
    m.querySelector('#rs').onclick=()=>{ T.reset(); T.setIdx(0); draw(); };
  };
  SIM.on('time', draw);
}

/* ---- block diagram engine ---- */
function blockView(m, BLOCKS, WIRES, first, vb, side){
  let sel=first;
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${side||''}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 ${vb[0]} ${vb[1]}" style="width:100%"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${(b.s||[]).map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---- schematic sheets (redrawn, net-label style) ---- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
/* schematic symbols */
function res(x1,y1,x2,y2,lbl,val){ const mx=(x1+x2)/2,my=(y1+y2)/2, hz=y1===y2; const L=hz?Math.abs(x2-x1):Math.abs(y2-y1), z=Math.min(36,L*0.6);
  let p; if(hz){ const a=mx-z/2; p=`M${x1} ${y1}H${a}`+[...Array(6)].map((_,i)=>`L${a+z*(i+.5)/6} ${y1+(i%2?6:-6)}`).join('')+`L${a+z} ${y1}H${x2}`; }
  else { const a=my-z/2; p=`M${x1} ${y1}V${a}`+[...Array(6)].map((_,i)=>`L${x1+(i%2?6:-6)} ${a+z*(i+.5)/6}`).join('')+`L${x1} ${a+z}V${y2}`; }
  return `<path d="${p}" fill="none" stroke="var(--ink)"/>`+(lbl?`<text x="${hz?mx:x1+10}" y="${hz?y1-10:my-4}" font-size="10" ${hz?'text-anchor="middle"':''} fill="var(--ink)">${lbl}</text><text x="${hz?mx:x1+10}" y="${hz?y1+18:my+9}" font-size="10" ${hz?'text-anchor="middle"':''} fill="var(--ink2)">${val||''}</text>`:''); }
function cap(x1,y1,x2,y2,lbl,val){ const hz=y1===y2, mx=(x1+x2)/2, my=(y1+y2)/2;
  return hz? `<path d="M${x1} ${y1}H${mx-4}M${mx+4} ${y1}H${x2}M${mx-4} ${y1-10}v20M${mx+4} ${y1-10}v20" stroke="var(--ink)" fill="none"/><text x="${mx}" y="${y1-14}" font-size="10" text-anchor="middle" fill="var(--ink)">${lbl||''}</text><text x="${mx}" y="${y1+22}" font-size="10" text-anchor="middle" fill="var(--ink2)">${val||''}</text>`
            : `<path d="M${x1} ${y1}V${my-4}M${x1} ${my+4}V${y2}M${x1-10} ${my-4}h20M${x1-10} ${my+4}h20" stroke="var(--ink)" fill="none"/><text x="${x1+14}" y="${my}" font-size="10" fill="var(--ink)">${lbl||''}</text><text x="${x1+14}" y="${my+11}" font-size="10" fill="var(--ink2)">${val||''}</text>`; }
function opamp(x,y,name,flip){ // inputs at left (x, y-12 '-' / y+12 '+'), output at (x+60,y)
  return `<path d="M${x} ${y-30}L${x+60} ${y}L${x} ${y+30}Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+5}" y="${y-8}" font-size="13" fill="var(--ink)">${flip?'+':'−'}</text><text x="${x+5}" y="${y+18}" font-size="12" fill="var(--ink)">${flip?'−':'+'}</text><text x="${x+20}" y="${y+44}" font-size="10" fill="var(--ink2)">${name}</text>`; }
function gnd(x,y){ return `<path d="M${x} ${y}v8M${x-9} ${y+8}h18M${x-6} ${y+12}h12M${x-3} ${y+16}h6" stroke="var(--ink)" fill="none"/>`; }
function wire(pts){ return `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--ink)"/>`; }
function dot(x,y){ return `<circle cx="${x}" cy="${y}" r="3" fill="var(--ink)"/>`; }
function net(x,y,t,anchor){ return `<text x="${x}" y="${y+4}" font-size="10.5" ${anchor?`text-anchor="${anchor}"`:''} fill="var(--accent2)">${t}</text>`; }
function txt(x,y,t,sz,col,anchor){ return `<text x="${x}" y="${y}" font-size="${sz||11}" ${anchor?`text-anchor="${anchor}"`:''} fill="${col||'var(--ink)'}">${t}</text>`; }
function schemView(m, SHEETS, prod, srcNote){
  let i=0;
  m.innerHTML = card('Schematic set (redrawn from the archive — not the original CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">${srcNote}</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">${prod} · sheet ${i+1}/${SHEETS.length} · REDRAWN 2026|59, not the original CAD</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML = SHEETS[i].note;
  };
  draw();
}
/* ---- signal-path flow strip (software tab for hardware products): highlight a stage ---- */
function flowSVG(stages, hot){
  const w=Math.max(120, Math.floor(900/stages.length)-8);
  let s=`<svg viewBox="0 0 ${stages.length*(w+12)+10} 116" style="width:100%"><defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  stages.forEach((st,i)=>{ const x=6+i*(w+12), on=i===hot, bad=st.bad;
    s+=`<g data-st="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="${w}" height="96" rx="7" fill="${bad?'var(--bad)':on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="${x+8}" y="26" font-size="11.5" font-weight="700" fill="${on||bad?'#fff':'var(--ink)'}">${st.t}</text>
      ${(st.s||[]).map((l,k)=>`<text x="${x+8}" y="${44+k*14}" font-size="10" fill="${on||bad?'#eef':'var(--ink2)'}">${l}</text>`).join('')}</g>`;
    if (i<stages.length-1) s+=`<line x1="${x+w}" y1="56" x2="${x+w+11}" y2="56" stroke="var(--ink2)" marker-end="url(#fa)"/>`; });
  return s+'</svg>';
}
/* keyboard helper */
function bindKeys(flag, mapFn){ document.addEventListener('keydown', e=>{ if (!window[flag] || (e.target.matches && e.target.matches('input,select,textarea'))) return; const f=mapFn()[e.key.toLowerCase()]; if (f){ f(); e.preventDefault(); } }); }
/* ---------- end of kit ---------- */
/* ---- AES3 helpers (subframe bits, biphase-mark, scope) — shared by the digital-audio PODs ---- */
function aesSubframe(sample, pre, frameInBlock, fs, validity){
  let s = Math.round(clamp(sample,-1,0.99999988)*8388607); if (s<0) s += 1<<24;
  const bits = new Array(32).fill(0);
  for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;              // 24-bit audio LSB first in slots 4..27
  bits[28]=validity?1:0; bits[29]=0;
  const cs0 = fs===48000?0x85: fs===44100?0x45: fs===32000?0xC5: 0x05;  // channel-status byte 0, professional (AES3)
  bits[30] = frameInBlock<8 ? (cs0>>frameInBlock)&1 : 0;
  let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
  return { pre, bits, raw:s };
}
function biphase(pre, bits, start){
  const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv=[]; P.forEach(b=>lv.push(start? 1-b : b)); let cur=lv[lv.length-1];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); }
  return lv;
}
function drawAesScope(cv, subA, subB, fs, amp, label){
  const {c,w} = SIM.canvas(cv, 150);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  const lvA=biphase(subA.pre,subA.bits,0), lvB=biphase(subB.pre,subB.bits,lvA[lvA.length-1]); const lv=lvA.concat(lvB), cw=(w-20)/lv.length;
  [[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio 20 bits'],[56,64,a2,'VUCP']].forEach(([a,b,col,lb])=>[0,64].forEach(off=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if((b-a)*cw>24) c.fillText(lb,12+(off+a)*cw,104); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); const hh=25*clamp(amp==null?1:amp,0.05,1);
  lv.forEach((v,i)=>{ const x=10+i*cw, y=55+(v?-hh:hh); if(i===0) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${subA.pre})`,12,14); c.fillText('Subframe B (Y)',12+64*cw,14);
  c.fillText(`${label||''} one bit cell = ${SIM.fmtDur(1/(fs*128))} · frame = ${SIM.fmtDur(1/fs)} · ${(fs*128/1e6).toFixed(3)} Mbaud`,10,130);
}

const PREFIX='pod13a';
/* ---------------- firmware (Corrected 2026|59, see pod13.js) ----------------
   MCU:  XXX - POD13 - #Master #OBSOLETE/POD13 - #Software/POD13 - SOFTWARE #atmel/POD13 - #SOFTWARE #atmel #v100/
         v100w.c (main, REFRESH_LEDS, DEBOUNCE_fs/_fs2), D6204A.c (PROCESS_MODES, ALTERA_write), cs84xx.c, AK4396.c, altera.c
   FPGA: .../POD13 - #SOFTWARE #lattice2/v100/pod13a.vhd, dec2_4.vhd, SR_DETECT_192.vhd, shift_in/shift_out.vhd, pod13a.jed */
const FS=[32000,44100,48000,96000,192000];
const CAL = { '00':{ref:-20, fs0:24}, '10':{ref:-18, fs0:22}, '01':{ref:-12, fs0:16}, '11':{ref:null, fs0:null} };  // SW(a,b): 0 = Dn, 1 = Up
const K = { lockLo:14600, lockHi:216000, thrBNC:0.097, thrPHX:0.034, a75:2.5, a110:4.0, vBNC:1.0, vPHX:4.0, lockT:0.005,
  akFS:2.0, rail:12, swingLoss:1.5, trimDb:0.43 };  // akFS, loss per 100 m and CS8416 lock time are inferred
const XTAL=8e6, BYTE=8*14.5+15, RD=3*BYTE+(8*14+15)+22, WR=3*BYTE+14;            // bit-banged SPI cycle estimates (as for POD12A)
const PASS_CY = 2*RD + 2*WR + 2*BYTE + 300;                                        // one main-loop pass, estimated
const WAITC = 7;                                                                   // wait(): WDR, decrement, compare, branch
const AKRST = 2*1000*WAITC/XTAL;                                                   // AK4396_RESET(1000): two wait(1000)
const BOOT = (35*3000 + 1000 + 2*2000 + 1000)*WAITC/XTAL + 0.004;                  // 35 × wait(3000), ALTERA_RESET, 2 × AK4396_RESET, wait(1000) + start-up
const LOCK_CONSTANT=25, DEBOUNCE=255, SRDET=0.016;                                 // D6204A.c, D6204A.h; SR_DETECT_192 latch cycle (counter4 on the 500 Hz ref)
const SPEED=['NORMAL_SPEED','DOUBLE_SPEED','QUAD_SPEED'], DFSREG=[0x02,0x0A,0x12];
const speedOf = fs => fs>135000?2: fs>70000?1: 0;                                 // SR_DETECT_192: MCLK counts per 1 ms ref, 70k / 135k thresholds (with hysteresis)
const D = {
  power:true, powerAt:-1,
  conv:[ { plug:'bnc', fs:48000, dbfs:-20, f:1000, cable:30, at:-1, prev:null }, { plug:'phx', fs:48000, dbfs:-20, f:1000, cable:30, at:-1, prev:null } ],
  dip:[0,0,0,0], trim:[0.5,0.5,0.5,0.5], load:1e6, log:[] };  // dip 1 = Up (= switch ON, grounds the pin)
const FACT=JSON.parse(JSON.stringify(D));
const NAMES=['CONVERTER A','CONVERTER B'];
/* ---------------- analog / input model ---------------- */
function rxVof(c){ if (!c || c.plug==='none') return 0; const bnc=c.plug==='bnc', a=(bnc?K.a75:K.a110)*Math.sqrt(c.fs/48000); return (bnc?K.vBNC:K.vPHX)*Math.pow(10,-a*c.cable/100/20); }
const rxV = k => rxVof(D.conv[k]);
function sigOK(c){ return c && c.plug!=='none' && c.fs>=K.lockLo && c.fs<=K.lockHi && rxVof(c) >= (c.plug==='bnc'?K.thrBNC:K.thrPHX); }
function srcAt(k,t){ const c=D.conv[k]; return (c.prev && t<c.at) ? Object.assign({},c,c.prev) : c; }   // settings before the last change
/* ---------------- the MCU main loop, simulated pass by pass (cached) ----------------
   per pass: CS8416_READ_LOCK_ALL → ALTERA1 fs flags → DEBOUNCE_fs / _fs2 → PROCESS_EQ_PUSHBUTTONS → PROCESS_MODES
             → READ_DIP_SWITCHES → REFRESH_LEDS → ALTERA_write                                                     */
let SIMC=null, SIMK='';
function mcu(){
  const key=JSON.stringify([D.power,D.powerAt,D.conv,K.lockT]); if (key===SIMK) return SIMC; SIMK=key;
  const P=PASS_CY/XTAL, t0=D.powerAt+BOOT, T=[], S=[[],[]];
  const st=[0,1].map(()=>({ ref:0, cnt:0, lock:0, conn:null, flag:0, pflag:0, dc:0 }));   // aesN_reference AES75 = 0, unlockN_count, aesN_lock, PLL start
  let fs=0, pfs=0, fs2=0, pfs2=0, dfs=[0,0], akOn=[0,0];                                 // REFRESH_AK4396 at boot: fs = NORMAL_SPEED
  let t=t0; if (!D.power){ SIMC={T:[],S,P,t0}; return SIMC; }
  while (t<1.0 && T.length<20000){
    let extra=0; const rec=[];
    for (let k=0;k<2;k++){ const s=st[k], c=srcAt(k,t);
      const want = c.plug==='bnc'?0 : c.plug==='phx'?1 : -1;                   // BNC = AES75 → register 04 = 0x89 (RXP1); Phoenix = AES110 → 0x80 (RXP0) (input mapping inferred from the names)
      if (D.conv[k].at>=0 && t>=D.conv[k].at && s.seen!==D.conv[k].at){ s.seen=D.conv[k].at; s.conn=null; }   // any source change makes the PLL re-acquire
      const conn = sigOK(c) && want===s.ref; if (conn && s.conn===null) s.conn=Math.max(t, D.powerAt); if (!conn) s.conn=null;
      s.hw = conn && t-s.conn>=K.lockT;                                         // CS8416_READ_LOCK_ALL: RERR (0x0C) == 0
      s.flag = s.hw ? (speedOf(c.fs)===2?3:speedOf(c.fs)===1?1:0) : 0;           // ALTERA1 bits from SR_DETECT_192 (no MCLK → 0, inferred)
      s.c=c; }
    // DEBOUNCE_fs (A) and DEBOUNCE_fs2 (B)
    { const s=st[0]; if (s.flag!==s.pflag){ if (s.dc<DEBOUNCE) s.dc++; else { s.dc=0; s.pflag=s.flag; fs = s.flag===1?1: s.flag===3?2: 0; if (fs!==pfs){ extra+=AKRST; dfs[0]=fs; akOn[0]=1; rec.push('A: fs '+SPEED[fs]+' → AK4396_RESET + REFRESH_AK4396 (reg 01 = 0x'+DFSREG[fs].toString(16).toUpperCase()+')'); } pfs=fs; } } else s.dc=0; }
    { const s=st[1]; if (s.flag!==s.pflag){ if (s.dc<DEBOUNCE) s.dc++; else { s.dc=0; s.pflag=s.flag; fs2 = s.flag===1?1: s.flag===3?2: 0;
        if (fs2!==pfs){ extra+=AKRST; dfs[1]=fs; akOn[1]=1; rec.push('B: fs2 '+SPEED[fs2]+' != pfs → AK4396_RESET_2 + REFRESH_AK4396_2 — which writes reg 01 from fs (A), = 0x'+DFSREG[fs].toString(16).toUpperCase()); } pfs2=fs2; } } else s.dc=0; }
    // PROCESS_MODES: input hunt (uses aesN_lock from the previous REFRESH_LEDS)
    for (let k=0;k<2;k++){ const s=st[k]; if (s.lock===0 && s.cnt>=LOCK_CONSTANT){ s.cnt=0; s.ref^=1; rec.push(`${'AB'[k]}: unlock${k+1}_count ≥ 25 → aes${k+1}_reference = ${s.ref?'AES110 → reg 04 = 0x80':'AES75 → reg 04 = 0x89'}`); } else s.cnt++; }
    // REFRESH_LEDS
    for (let k=0;k<2;k++){ const s=st[k]; if (s.hw){ if (!s.lock){ extra+=AKRST; akOn[k]=1; dfs[k]= fs; rec.push(`${'AB'[k]}: LOCK → AK4396_RESET${k?'_2':''} + REFRESH_AK4396${k?'_2':''} (DFS from fs = ${SPEED[fs]})`); } s.lock=1; } else { if (s.lock) rec.push(`${'AB'[k]}: NO LOCK → AK4396_POWER_DOWN${k?'_2':''}`); s.lock=0; akOn[k]=0; } }
    T.push(t);
    for (let k=0;k<2;k++){ const s=st[k]; S[k].push({ hw:s.hw, led:s.lock, ref:s.ref, cnt:s.cnt, dfs:dfs[k], ak:akOn[k], want:speedOf(s.c.fs), flag:s.flag, pflag:s.pflag, dc:s.dc, fsA:fs, rec:k?null:rec }); }
    t += P + extra; }
  SIMC={T,S,P,t0}; return SIMC; }
function passIdx(t){ const M=mcu(), T=M.T; if (!T.length || t<T[0]) return -1; let lo=0, hi=T.length-1; while(lo<hi){ const mid=(lo+hi+1)>>1; if (T[mid]<=t) lo=mid; else hi=mid-1; } return lo; }
function stAt(k,t){ const i=passIdx(t); return i<0?null:mcu().S[k][i]; }
const booting = t => D.power && t>=D.powerAt && t<D.powerAt+BOOT;
function ledLock(k,t){ if (!D.power||t<D.powerAt) return false; if (booting(t)) return true; const s=stAt(k,t); return !!(s&&s.led); }   // DATA_INITIALIZATION lights LOCK during the boot waits
function ledNoLock(k,t){ if (!D.power||t<D.powerAt||booting(t)) return false; const s=stAt(k,t); return !(s&&s.led); }
function lockedAt(k,t){ const s=stAt(k,t); return !!(s&&s.led); }
const lockable = k => sigOK(D.conv[k]);
function cal(k){ return CAL[''+D.dip[2*k]+D.dip[2*k+1]]; }
function outState(k,t){ const s=stAt(k,t); if(!D.power||!s) return {ok:false, why:D.power?'boot: AK4396 not refreshed yet':'power off'};
  if (!s.led) return {ok:false, why:'NO LOCK: AK4396 powered down, FPGA no_lock mutes the CAL switches'};
  if (!cal(k).fs0) return {ok:false, why:'CAL Up/Up: dec2_4 out4 (00 = “reserved”) drives no switch → mute'};
  if (s.dfs!==s.want) return {ok:false, bad:true, why:`AK4396 DFS = ${SPEED[s.dfs]} but the input needs ${SPEED[s.want]}`};
  return {ok:true}; }
function trimDb(ch){ return (D.trim[ch]-0.5)*2*K.trimDb; }
function outDbu(k,ch){ const c=cal(k), cv=D.conv[k]; if (!c.fs0) return -200; return cv.dbfs + c.fs0 + trimDb(2*k+ch) + 20*Math.log10(D.load/(D.load+60)); }
const lim = ()=>Math.max(0,K.rail-K.swingLoss);
function sample(k,ch,t){ const c=D.conv[k]; if(!lockedAt(k,t)) return 0; const n=Math.floor(t*c.fs); return Math.pow(10,c.dbfs/20)*Math.sin(2*Math.PI*c.f*n/c.fs); }
function analog(k,ch,t){ const c=D.conv[k], cc=cal(k); if (!outState(k,t).ok) return 0;
  const vpk = dbu2v(cc.fs0 + trimDb(2*k+ch))*Math.SQRT2*Math.pow(10,c.dbfs/20);
  const leg = clamp(vpk/2*Math.sin(2*Math.PI*c.f*t), -lim(), lim()); return 2*leg*D.load/(D.load+60); }
function levels(k,ch){
  const c=D.conv[k], cc=cal(k), lc=v2dbu(lim()/Math.SQRT2), o=outState(k,1), L=lockedAt(k,1);
  const ak = c.dbfs + v2dbu(K.akFS), out=outDbu(k,ch), pre = cc.fs0? c.dbfs+cc.fs0+trimDb(2*k+ch) : -200;
  return { lock:L, ok:o.ok, why:o.why, clip: o.ok && pre-6.02>lc, out:o.ok?out:-200, stages:[
    {name:`AES input (${c.plug==='bnc'?'BNC 75 Ω, R72 75R':c.plug==='phx'?'Phoenix 110 Ω, R71 110R':'nothing connected'})`, lvl:c.plug==='none'?-200:20*Math.log10(Math.max(rxV(k),1e-9)), gain:null, clip:null, unit:'dBV p-p', note:`${rxV(k).toFixed(3)} V p-p after ${c.cable} m; lock lost below ${c.plug==='bnc'?K.thrBNC:K.thrPHX} V (test)`},
    {name:'PE-65612 → DS34LV86T → CS8416 (U16/U17)', lvl:L?c.dbfs:-200, gain:null, clip:0, unit:'dBFS', note:L?`locked at ${c.fs/1000} kHz · register 04 = ${stAt(k,1)&&stAt(k,1).ref?'0x80 (RXP0)':'0x89 (RXP1)'}`:'NO LOCK — AK4396 powered down'},
    {name:'LFXP3 i2s8416_aes → AK4396 DAC', lvl:o.ok?ak:-200, gain:null, clip:v2dbu(K.akFS), note:o.ok?`DFS ${SPEED[stAt(k,1).dfs]} · 0 dBFS ≈ ${K.akFS} V rms differential (${inf})`:o.why},
    {name:'OP275 diff. → SE + filter; 74HC4053 CAL gain (MR'+(k+1)+'_1…3); RV trim', lvl:o.ok?pre-6.02:-200, gain:o.ok?pre-6.02-ak:null, clip:lc, note:cc.fs0?`CAL ${cc.ref} dBFS = +4 dBu → 0 dBFS = +${cc.fs0} dBu; trim ${fdb(trimDb(2*k+ch),2)} dB`:'Up/Up: no switch enabled → mute'},
    {name:'NE5532 driver + inverter → 2 × 30R → Phoenix', lvl:o.ok?out:-200, gain:6.02+20*Math.log10(D.load/(D.load+60)), clip:lc+6.02+20*Math.log10(D.load/(D.load+60)), note:`60 Ω balanced into ${D.load>=1e5?'open':D.load+' Ω'}`},
  ]};
}
const mirror = b => { let r=0; for(let i=0;i<8;i++) if(b>>i&1) r|=1<<(7-i); return r; };
function dataLower(){ let pina=0xFF; D.dip.forEach((u,i)=>{ if(u) pina&=~(1<<(7-i)); }); return mirror(pina)&0x0F; }   // SW1..4 on PA7..PA4 (inferred order); ON (Up) grounds the pin
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`A ${levels(0,0).ok?fdb(levels(0,0).out)+' dBu':levels(0,0).lock?'muted':'NO LOCK'} · B ${levels(1,0).ok?fdb(levels(1,0).out)+' dBu':levels(1,0).lock?'muted':'NO LOCK'}`);
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t;
    tr('PSU VAF1005 → 5 V; REG2 SUW1R5 → ±12 V; REG1 LM1117 → 3.3 V');
    tr('main(): initialization() — SEI(), timer0_init(): 1 ms interrupt toggles PE3 = FPGA5 → 500 Hz reference for SR_DETECT_192');
    tr('DATA_INITIALIZATION(): LOCK_LED_ON, LOCK2_LED_ON, NO_LOCK LEDs off — both LOCK LEDs are green during the boot, whatever the inputs');
    tr(`wait(3000) × 5 → ALTERA_RESET(1000) → wait(3000) × 5 → init_CS8416() (regs 00–06 = 00 04 08 88 80 B0 10) → AK4396_RESET × 2 → READ_DIP_SWITCHES → wait(3000) × 25 → ALTERA_write → REFRESH_AK4396 ×2: main loop after ≈${SIM.fmtDur(BOOT)}`); } else tr('Rails collapse; outputs silent'); }); },
  plug(k,kind){ act(`${NAMES[k]}: source → ${kind==='bnc'?'BNC (75 Ω)':kind==='phx'?'Phoenix (110 Ω)':'unplugged'}`, tr=>{ const c=D.conv[k]; c.prev={plug:c.plug, fs:c.fs, cable:c.cable}; c.plug = c.plug===kind?'none':kind; c.at=SIM.t;
    if (c.plug==='none'){ tr(`CS8416 RERR UNLOCK → REFRESH_LEDS: NO LOCK, aes${k+1}_lock = NO, AK4396_POWER_DOWN${k?'_2':''}; ALTERA_write sets data_upper bit ${k?7:6} → FPGA q${k?15:14} no_lock mutes the CAL switches`); tr(`PROCESS_MODES now hunts: every 25 passes (≈${SIM.fmtDur(26*PASS_CY/XTAL)}) it flips register 04 between 0x89 and 0x80`); return; }
    tr(`${c.plug==='bnc'?'BNC → R72 75R':'Phoenix → R71 110R'} → PE-65612 → DS34LV86T → CS8416 ${c.plug==='bnc'?'RXP1 (AES75, 0x89)':'RXP0 (AES110, 0x80)'} (${inf}: mapping from the AES75/AES110 names)`);
    tr(sigOK(c)? `If register 04 points at the other input, PROCESS_MODES flips it within 25 passes; then the PLL locks (${SIM.fmtDur(K.lockT)}, ${inf}) → LOCK, AK4396_RESET + REFRESH` : `Amplitude ${rxV(k).toFixed(3)} V p-p or rate out of range → stays NO LOCK while the MCU keeps hunting`); }); },
  dip(i){ act(`Rear DIP SW${i+1} → ${D.dip[i]?'Dn':'Up'}`, tr=>{ D.dip[i]^=1; const k=i<2?0:1, c=cal(k), lo=dataLower();
    tr(`READ_DIP_SWITCHES: MIRROR(PINA) → ALTERA_write: data_lower = dip_switches & 0x0F = ${lo.toString(2).padStart(4,'0')}b (the MCU's own decode is commented out)`);
    tr(`FPGA shift_in q${2*k}/q${2*k+1} = dip${2*k+1}/dip${2*k+2} = ${(lo>>2*k)&1}${(lo>>(2*k+1))&1} → dec2_4 → ${c.ref?`MR${k+1}_${c.ref===-20?1:c.ref===-18?2:3} low: 74HC4053 selects the ${c.ref} dBFS gain`:'out4 (00 = “reserved”) — not wired to any MR pin, so no gain switch is on: MUTE'}`); }); },
  trim(ch,dir){ act(`Turn RV${ch+1} (${NAMES[ch>>1]} ${ch&1?'R':'L'}) ${dir>0?'CW':'CCW'}`, tr=>{ D.trim[ch]=clamp(+(D.trim[ch]+dir*0.05).toFixed(3),0,1);
    tr(`2K calibration trim: ${fdb(trimDb(ch),2)} dB (test: sensitivity range ≈ 3.89 … 4.74 dBu at −20 dBFS)`); }); },
  set(k,key,v,l){ act(l, tr=>{ const c=D.conv[k]; c.prev={plug:c.plug, fs:c.fs, cable:c.cable}; c[key]=v; c.at=SIM.t;
    if (key==='fs'){ tr(v<K.lockLo||v>K.lockHi?'Outside the measured lock range 14.6 … 216 kHz → NO LOCK':`CS8416 re-locks; MCLK${k+1} = 256 × fs → SR_DETECT_192 counts it during each 1 ms half of the 500 Hz ref → det_96 / det_192 = ${speedOf(v)?(speedOf(v)===2?'1/1':'1/0'):'0/0'}`);
      tr(`ALTERA_write reads them back (ALTERA1 bits ${k?'4–5':'0–1'}, ALTERA2 = 0xAA) → DEBOUNCE_fs${k?'2':''}: 255 passes (≈${SIM.fmtDur(256*PASS_CY/XTAL)}) → ${k?'fs2 vs pfs (bug: should be pfs2) → REFRESH_AK4396_2 writes register 01 from fs, converter A’s speed':'fs → AK4396_RESET + REFRESH_AK4396: register 01 = 0x'+DFSREG[speedOf(v)].toString(16).toUpperCase()}`); }
    else tr(key==='cable'? `Cable loss ${((c.plug==='bnc'?K.a75:K.a110)*Math.sqrt(c.fs/48000)*v/100).toFixed(1)} dB (${inf}) → ${rxV(k).toFixed(3)} V p-p at the receiver` : 'The source tone changed'); }); },
  load(v){ act(`Output load → ${v>=1e5?'open':v+' Ω'}`, tr=>{ D.load=v; }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIMK=''; SIM.refresh(); },
};
/* ---------------- panels (POD13A-FRONT&REAR-SILK (CURVE).pdf) ---------------- */
function frontSVG(t){ let over=rocker(D.power)+pled(D.power);
  [[947,0],[1367,1]].forEach(([x,k])=>{ over+=led(x,218,ledLock(k,t),'var(--led-g)')+led(x+60,218,ledNoLock(k,t),'#ff4a3a'); });
  return panelSVG(PREFIX,'front',{over},'POD13A front panel (real silkscreen)'); }
function rearSVG(){ const c=D.conv;
  let over = phx(248,80,c[0].plug==='phx','pa','CONVERTER A AES/EBU 110 Ω (+ − G) — click to plug/unplug')+phx(438,80,c[1].plug==='phx','pb','CONVERTER B AES/EBU 110 Ω — click')
   + bnc(248,215,c[0].plug==='bnc','ba','CONVERTER A AES 75 Ω BNC — click',46)+bnc(438,215,c[1].plug==='bnc','bb','CONVERTER B AES 75 Ω BNC — click',46)
   + phx(628,80,false,'','A LEFT out')+phx(818,80,false,'','B LEFT out')+phx(628,210,false,'','A RIGHT out')+phx(818,210,false,'','B RIGHT out')
   + dip(1020,186,D.dip.map(Boolean),'dp',['SW1 (A)','SW2 (A)','SW3 (B)','SW4 (B)']) + iec(1395,28,1612,252);
  return panelSVG(PREFIX,'rear',{over},'POD13A rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power();
  [['pa',0,'phx'],['pb',1,'phx'],['ba',0,'bnc'],['bb',1,'bnc']].forEach(([c,k,kind])=>root.querySelectorAll('.'+c).forEach(g=>g.onclick=()=>A.plug(k,kind)));
  root.querySelectorAll('.dp').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i)); }
function controlsHTML(){ return `<div class="small" style="display:grid;grid-template-columns:auto repeat(4,auto);gap:4px 10px;align-items:center;margin-top:8px">
  ${[0,1].map(k=>`<b>${NAMES[k]} source</b><label>fs <select id="fs${k}">${[14000,...FS,240000].map(f=>`<option value="${f}" ${f===D.conv[k].fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
   <label>level <input id="lv${k}" type="number" step="1" value="${D.conv[k].dbfs}" style="width:56px"> dBFS</label><label>cable <input id="cb${k}" type="number" step="50" value="${D.conv[k].cable}" style="width:64px"> m</label>
   <label>trims L/R <button data-tr="${2*k},-1">−</button><button data-tr="${2*k},1">+</button> <button data-tr="${2*k+1},-1">−</button><button data-tr="${2*k+1},1">+</button></label>`).join('')}
  <b>Outputs</b><label>load <select id="ld">${[[1e6,'open'],[10000,'10 kΩ'],[600,'600 Ω']].map(([v,l])=>`<option value="${v}" ${v===D.load?'selected':''}>${l}</option>`).join('')}</select></label></div>
  <div class="small muted">Rear: click a BNC or Phoenix input to connect the source there; click the DIP levers to flip them. RV1–RV4 are internal (buttons above). Keys: 1–4 flip the DIP switches.</div>`; }
function bindControls(root){ [0,1].forEach(k=>{ const g=s=>root.querySelector(s); if(!g('#fs'+k)) return;
  g('#fs'+k).onchange=e=>A.set(k,'fs',+e.target.value,`${NAMES[k]} source rate → ${e.target.value/1000} kHz`);
  g('#lv'+k).onchange=e=>A.set(k,'dbfs',Math.min(0,+e.target.value),`${NAMES[k]} tone → ${e.target.value} dBFS`);
  g('#cb'+k).onchange=e=>A.set(k,'cable',Math.max(0,+e.target.value),`${NAMES[k]} cable → ${e.target.value} m`); });
  root.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{ const [ch,d]=b.dataset.tr.split(',').map(Number); A.trim(ch,d); });
  const l=root.querySelector('#ld'); if(l) l.onchange=e=>A.load(+e.target.value); }
bindKeys('__pod13aActive', ()=>({'1':()=>A.dip(0),'2':()=>A.dip(1),'3':()=>A.dip(2),'4':()=>A.dip(3)}));
/* ---------------- timeline ---------------- */
function lanes(){
  const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn');
  const L=[{label:'MCU: boot / main-loop passes', h:22, draw(cx,X,t0,t1,y,h){ if(!D.power) return; const M=mcu(); cx.font='10px sans-serif';
      const bs=Math.max(t0,D.powerAt), be=Math.min(t1,D.powerAt+BOOT); if (be>bs){ cx.fillStyle='#8a8f96'; cx.fillRect(X(bs),y+3,X(be)-X(bs),h-6); if(X(be)-X(bs)>80){ cx.fillStyle='#fff'; cx.fillText('boot: 35 × wait(3000)',X(bs)+3,y+15);} }
      if (M.T.length && (t1-t0)/M.P<600) SIM.pulses(cx,X,Math.max(t0,M.T[0]),t1,y,h,M.P,M.T[0]%M.P,M.P*0.3,b,'passes');
      else if (M.T.length && t1>M.T[0]){ cx.fillStyle=b; cx.globalAlpha=.4; cx.fillRect(X(Math.max(t0,M.T[0])),y+3,X(t1)-X(Math.max(t0,M.T[0])),h-6); cx.globalAlpha=1; cx.fillStyle=SIM.css('--ink'); cx.fillText(`passes of ≈${SIM.fmtDur(M.P)} (${inf.replace(/<[^>]+>/g,'')}) — zoom in`,X(Math.max(t0,M.T[0]))+4,y+15); } }},
    {label:'FPGA5 ref (timer0 ISR, 500 Hz)', h:18, draw(cx,X,t0,t1,y,h){ if(D.power) SIM.pulses(cx,X,Math.max(t0,D.powerAt),t1,y,h,0.002,0,0.001,wn,'500 Hz'); }}];
  [0,1].forEach(k=>{ const c=D.conv[k];
    L.push({label:`${NAMES[k]}: AES3 frames (${c.fs/1000}k)`, h:20, draw(cx,X,t0,t1,y,h){ if(c.plug==='none'){ cx.fillStyle=SIM.css('--ink2'); cx.font='11px sans-serif'; cx.fillText('no input', X(t0)+6, y+15); return; } SIM.pulses(cx,X,t0,t1,y,h,1/c.fs,0,0.2/c.fs,b,'frames'); }});
    L.push(boolLane(`${NAMES[k]}: reg 04 = 0x80 (RXP0, AES110)`, t=>{ const s=stAt(k,t); return !!(s&&s.ref); }, SIM.css('--ink2'), 16));
    L.push(boolLane(`${NAMES[k]}: CS8416 lock (hardware)`, t=>{ const s=stAt(k,t); return !!(s&&s.hw); }, '#7fd08f', 16));
    L.push(boolLane(`${NAMES[k]}: LOCK LED`, t=>ledLock(k,t), '#3fbf5f', 16));
    L.push(boolLane(`${NAMES[k]}: NO LOCK LED`, t=>ledNoLock(k,t), '#e3453a', 16));
    L.push(boolLane(`${NAMES[k]}: AK4396 DFS wrong for the rate`, t=>{ const s=stAt(k,t); return !!(s&&s.led&&s.dfs!==s.want); }, SIM.css('--bad'), 16));
    L.push(waveLane(`${NAMES[k]} LEFT out (Phoenix, V diff.)`, t=>analog(k,0,t), -0.05, null, a, 34, Object.assign(t=>{ let m=0; for(let i=0;i<8;i++) m=Math.max(m,Math.abs(analog(k,0,t+i/(8*c.f)))); return m; },{dense:(sp,pw)=>sp*c.f>pw/3})));
  }); return L; }
/* ---------------- views ---------------- */
function viewSim(m){
  window.__pod13aActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead',`<div id="fp"></div>`)}${card('Rear panel — click an input to connect the source, click the DIP levers',`<div id="rp"></div>${artNote()}${controlsHTML()}`)}</div>
    <div>${card('What the firmware did (last action)',`<div id="trace" class="log"></div>`)}${card('Outputs now',`<div id="now"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable. Move an input from BNC to Phoenix and zoom to 10 ms to watch the MCU hunt between RXP0 and RXP1.',`<canvas id="tl"></canvas>`)}
    <div class="grid2">${card('Scope: converter A input at the playhead (one AES3 frame, biphase-mark)',`<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}${card('Level through every stage (left channels)',`<div id="lv"></div>`)}</div>
    ${card('Action log',`<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Connect an input, flip a DIP switch or change the source.');
    m.querySelector('#now').innerHTML=`<table class="kv">${[0,1].map(k=>[0,1].map(ch=>{ const l=levels(k,ch); return `<tr><th>${NAMES[k]} ${ch?'RIGHT':'LEFT'}</th><td class="mono">${l.ok?fdb(l.out)+' dBu':`<span style="color:var(--bad)">${l.why}</span>`}${l.clip?' <b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>`; }).join('')).join('')}
      <tr><th>CAL A / B</th><td class="mono">${cal(0).ref?cal(0).ref+' dBFS':'MUTE'} / ${cal(1).ref?cal(1).ref+' dBFS':'MUTE'} = +4 dBu</td></tr></table>`;
    m.querySelector('#lv').innerHTML=[0,1].map(k=>`<h3>${NAMES[k]} LEFT</h3>${stageTable(levels(k,0).stages)}`).join('');
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:230});
    const c=D.conv[0], n=Math.floor(t*c.fs), fr=n%192, s=sample(0,0,t);
    if (c.plug!=='none'){ const sa=aesSubframe(s, fr===0?'Z':'X', fr, c.fs), sb=aesSubframe(s,'Y',fr,c.fs);
      drawAesScope(m.querySelector('#scope'), sa, sb, c.fs, rxV(0)/(c.plug==='bnc'?K.vBNC:K.vPHX), `frame ${n.toLocaleString()} (${fr}/191) ·`);
      m.querySelector('#bits').innerHTML=`A = ${s.toFixed(5)} → 24-bit 0x${sa.raw.toString(16).padStart(6,'0').toUpperCase()} · C=${sa.bits[30]} P=${sa.bits[31]} · amplitude at the receiver ${rxV(0).toFixed(3)} V p-p<br><span class="muted">Channel-status bytes use the standard AES3 professional layout (${inf}, set by the source, not the POD).</span>`; }
    else { SIM.canvas(m.querySelector('#scope'),150); m.querySelector('#bits').textContent='No input on converter A.'; } };
  bindControls(m); SIM.on('time',draw);
}
const LESSONS=[
  {title:'Meet the POD13A', body:`<p>From the manual: “POD13A is a dual AES/EBU digital to analog audio converter. This unit is equipped with both 75Ω and 110Ω inputs. The re-clocking circuitry … ensures that the incoming digital audio signal is recovered reliably, even when relatively long cable runs are involved.”</p><p>The front has a power switch with tally and, for each converter, a <b>LOCK</b> (green) and <b>NO LOCK</b> (red) LED. The rear has the AES inputs, the analog Phoenix outputs and a 4-way <b>CAL</b> DIP switch. The model runs the archived Atmel V100 and Lattice V100 code.</p>`, check:()=>true, auto:true},
  {title:'1 · Power and lock', body:`<p>Switch off and on. For about ${Math.round(BOOT*1000)} ms both LOCK LEDs are green whatever is connected (DATA_INITIALIZATION). Then the main loop reads the receivers. Converter B's source is on the Phoenix, but the MCU starts on the BNC input (AES75), so B needs 25 passes before PROCESS_MODES switches to RXP0 and it locks.</p>`, check:()=>D.power&&D.log.some(e=>e.name==='Power on'), hint:'Click the rocker twice, then scrub the first 150 ms.'},
  {title:'2 · Check the calibration', body:`<p>The test procedure: “Ensure that all DIP switches located on the back of the POD13A are in the down position”, apply −20 dBFS at 1 kHz and check for <b>+4 dBu</b>. All switches Dn = all pins high = dip 11 → dec2_4 enables the −20 dBFS gain.</p>`, check:()=>D.dip.every(x=>!x)&&Math.abs(levels(0,0).out-4)<0.5&&D.conv[0].dbfs===-20, hint:'All four DIP levers down, source −20 dBFS, load open.'},
  {title:'3 · Change the reference to −18 dBFS', body:`<p>For converter A, set <b>SW1 Up, SW2 Dn</b> (dip 01 → MR1_2). Then set the source to −18 dBFS and check for +4 dBu.</p>`, check:()=>D.dip[0]===1&&D.dip[1]===0&&D.conv[0].dbfs===-18&&Math.abs(levels(0,0).out-4)<0.5, hint:'Click the first DIP lever; set converter A level to −18.'},
  {title:'4 · The fourth setting is a mute', body:`<p>The manual calls <b>Up/Up</b> “RESERVED”; the test sheet records “Mute”. The FPGA explains it: dec2_4 decodes 00 to <span class="mono">out4</span>, which is not connected, so none of the three gain switches is on. Set converter B to Up/Up: its outputs go silent while LOCK stays green.</p>`, check:()=>D.dip[2]&&D.dip[3], hint:'Flip the 3rd and 4th DIP levers up.'},
  {title:'5 · Move a cable', body:`<p>Click converter A's <b>Phoenix</b> input (the source moves there). Register 04 still selects RXP1 (BNC), so the MCU sees NO LOCK; because unlock1_count has been counting while locked, PROCESS_MODES flips to RXP0 on the very next pass. Zoom the timeline to 10 ms around the playhead.</p>`, check:()=>D.conv[0].plug==='phx', hint:'Click the upper-left Phoenix on the rear.'},
  {title:'6 · 96 kHz on converter B only', body:`<p>Put A back on the BNC, then set converter B to <b>96 kHz</b> with A at 48 kHz. B locks, but after the 255-pass debounce DEBOUNCE_fs2 compares fs2 with <span class="mono">pfs</span> (A's speed) and REFRESH_AK4396_2 writes register 01 from <span class="mono">fs</span> — A's NORMAL speed. B's DAC runs in the wrong speed mode (flagged red on the timeline). Set A to 96 kHz too and B plays.</p>`, check:()=>D.conv[1].fs===96000, hint:'Converter B fs → 96 kHz.'},
  {title:'7 · A long cable run', body:`<p>Set converter A's cable to <b>900 m</b>. The test sheet logged “Max Distance >596 m” and a lock threshold of 0.097 V p-p on the BNC. Past that point the red NO LOCK LED comes on and the MCU starts hunting between the two inputs.</p>`, check:()=>D.conv[0].cable>=800&&!lockedAt(0,1), hint:'Type 900 into converter A’s cable box.'},
  {title:'Done', body:`<p>The <b>Findings</b> tab lists what the code does that the manual does not say.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod13aActive=true; tutorialView(m,{title:'Tutorial — from the POD13A manual and test procedure',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div>${[0,1].map(k=>`<span class="chip mono">${NAMES[k]} ${levels(k,0).ok?fdb(levels(k,0).out)+' dBu':levels(k,0).why}</span>`).join(' ')}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){
  window.__pod13aActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the device at the playhead',`<div id="dev"></div>`)}${card('As seen by the displays',`<div id="fp"></div>`)}</div>${card('Zoom ladder — converter A LEFT output',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, c=D.conv[0], P=PASS_CY/XTAL;
    const rows=[['ATmega128 clock','8,000,000',SIM.fmtDur(1/XTAL),'X1 8 MHz (v100w.c header)'],['Main-loop passes',Math.round(1/P).toLocaleString(),SIM.fmtDur(P),'estimated from the bit-banged SPI traffic per pass ('+inf+')'],
      ['timer0 interrupts','1,000','1 ms','TCNT0 = 0x83, prescale 64: toggles PE3 → FPGA5 = 500 Hz reference'],['SR_DETECT_192 decisions','62.5','16 ms','counter4 on the reference; MCLK counted for 1 ms against 15360 (60k), 17920 (70k), 32000 (125k), 34560 (135k)'],
      ['Input hunt','—',SIM.fmtDur(26*P),'PROCESS_MODES: register 04 flips after 25 unlocked passes'],['fs debounce','—',SIM.fmtDur(256*P),'DEBOUNCE_fs / _fs2: EQ_PUSHBUTTON_DEBOUNCE = 255 passes'],
      ['AES3 frames (= samples per channel)',c.fs.toLocaleString(),SIM.fmtDur(1/c.fs),'CS8416 recovers clock and data; MCLK = 256 × fs'],['AES3 bit cells',(128*c.fs).toLocaleString(),SIM.fmtDur(1/(128*c.fs)),'biphase-mark through the PE-65612 transformer'],
      ['DAC samples (AK4396)',c.fs.toLocaleString(),SIM.fmtDur(1/c.fs),'register 01: 0x02 normal, 0x0A double, 0x12 quad speed'],['Tone cycles',c.f.toLocaleString(),SIM.fmtDur(1/c.f),`${(c.fs/c.f).toFixed(1)} samples per cycle`]];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const n=Math.floor(t*c.fs), s0=stAt(0,t), s1=stAt(1,t), fmt=s=>s?`reg 04 ${s.ref?'0x80':'0x89'} · count ${s.cnt} · hw ${s.hw?'lock':'unlock'} · LED ${s.led?'LOCK':'NO LOCK'} · DFS ${SPEED[s.dfs]} (needs ${SPEED[s.want]}) · fs flag ${s.flag}/${s.pflag} debounce ${s.dc}`:'boot';
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>MCU pass</th><td class="mono">${passIdx(t)<0?(booting(t)?'boot (wait loops)':'off'):passIdx(t).toLocaleString()}</td></tr><tr><th>Converter A</th><td class="mono small">${fmt(s0)}</td></tr><tr><th>Converter B</th><td class="mono small">${fmt(s1)}</td></tr><tr><th>Conv. A frame</th><td class="mono">${n.toLocaleString()} · block ${Math.floor(n/192)} · frame ${n%192}/191</td></tr><tr><th>Analog out</th><td class="mono">${analog(0,0,t).toFixed(4)} V</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    drawLadder(m.querySelector('#zl'),t,[['1 second',1],['1 block',192/c.fs],['1 tone cycle',1/c.f],['8 frames',8/c.fs],['1 frame',1/c.fs]],tt=>analog(0,0,tt),-0.05,'volts'); };
  SIM.on('time',draw);
}
const BLOCKS={
  in:{x:20,y:30,w:170,h:90,t:'AES inputs ×2',s:['BNC 75 Ω (R72 75R)','Phoenix 110 Ω (R71 110R)','PE-65612 transformers'],d:'Rear board SA-POD13A-2: 2 BNCs and 6 Phoenix headers (2 inputs, 4 outputs). The two inputs of each converter reach the CS8416 as RXP1 (BNC, “AES75”) and RXP0 (Phoenix, “AES110”) (mapping inferred from the firmware names).'},
  rx:{x:20,y:160,w:170,h:80,t:'DS34LV86T + CS8416 ×2',s:['register 04: 0x89 / 0x80','RERR polled every pass'],d:'The MCU programs both CS8416s (init_CS8416) and polls RERR (0x0C) every pass. While unlocked, PROCESS_MODES alternates the receiver input every 25 passes until one locks.'},
  fpga:{x:250,y:100,w:180,h:100,t:'LatticeXP LFXP3C (pod13a.vhd)',s:['i2s8416_aes ×2 (off = no_lock)','SR_DETECT_192 ×2: 96k/192k','dec2_4 ×2: CAL → MR pins','shift_in / shift_out ↔ MCU'],d:'Lattice V100 (pod13a.vhd, .jed 24 Sep 2008). Passes I²S to the DACs (halving MCLK at 192 kHz), detects the rate against the 500 Hz reference, decodes the CAL DIP into the 74HC4053 enables and mutes them on no_lock.'},
  mcu:{x:250,y:240,w:180,h:90,t:'ATmega128L (v100w.c)',s:['Atmel V100, 8 MHz','LOCK/NO LOCK LEDs','AK4396 reset + speed'],d:'Polls the receivers, hunts the input, lights LOCK/NO LOCK, resets and programs the AK4396s, and passes the DIP byte straight to the FPGA. Its own DIP decode, CAN and DashBoard code are commented out or unused (openGear D6204A base).'},
  dac:{x:490,y:30,w:180,h:80,t:'AK4396 ×2',s:['register 01: DFS','powered down on NO LOCK'],d:'REFRESH_AK4396 writes regs 00–04; the speed mode comes from the debounced FPGA rate flags. DAC 2 gets converter A’s speed (bug).'},
  ana:{x:490,y:150,w:180,h:110,t:'Analog out ×4',s:['OP275: diff → SE + filter','74HC4053 ×4: CAL gain','NE5532: balanced driver','2K trims RV1–RV4','2 × 30R build-out'],d:'Gives 0 dBFS = +24/+22/+16 dBu (test: 23.98 dBu), 60 Ω balanced, ±12 V rails.'},
  out:{x:490,y:300,w:180,h:60,t:'Phoenix outputs',s:['A L/R, B L/R (+ − G)'],d:'Four 3-pin EuroBlock outputs on the rear board.'},
  psu:{x:20,y:290,w:170,h:80,t:'Power',s:['VAF1005 → 5 V','SUW1R5 → ±12 V','LM1117 → 3.3 V'],d:'The test procedure probes these three. Idle current 23 mA.'},
};
const WIRES=[['in','rx','AES'],['rx','fpga','I²S + MCLK'],['fpga','dac','I²S'],['dac','ana','diff. audio'],['ana','out',''],['mcu','rx','SPI'],['fpga','ana','MR1_1…3 / MR2_1…3'],['mcu','fpga','FPGA1–5'],['mcu','dac','SPI'],['psu','mcu','']];
function viewBlock(m){ window.__pod13aActive=false; blockView(m,BLOCKS,WIRES,'fpga',[700,390],card('In one sentence',`<p>Each converter receives AES3 on BNC or Phoenix (the MCU hunts for whichever is connected), recovers it in a CS8416, passes it through a LatticeXP FPGA that also detects the rate and decodes the CAL switches, and converts it in an AK4396 whose speed mode the MCU sets. An analog stage sets the calibrated level and drives a 60 Ω balanced Phoenix output.</p>`)); }
const SHEETS=[
  {name:'1 · FPGA (pod13a.vhd)', note:'Redrawn from pod13a.vhd, dec2_4.vhd and SR_DETECT_192.vhd (Lattice V100). Port names are the real ones; the board routing of each port is not in the archive.', svg:()=>
    chip(330,40,200,'U19 LFXP3C pod13a',[['FPGA2','data in (shift_in)'],['FPGA3','clock'],['FPGA4','strobe'],['FPGA5','500 Hz ref'],['MCLK1/2','CS8416'],['LRCLK1/2, SCLK1/2','CS8416'],['DATA_IN1/2','CS8416']],[['FPGA1','data out (shift_out)'],['MR1_1…3 (+_4…6)','A CAL switches'],['MR2_1…3 (+_4…6)','B CAL switches'],['MCLK_OUT1/2','AK4396 (÷2 at 192k)'],['LRCLK/SCLK/DATA_OUT','AK4396'],['TP1–TP5','test']],'Lattice V100')
    +txt(40,300,'shift_in: q0–q3 = dip1–dip4 (data_lower) · q14 = no_lock_1, q15 = no_lock_2 (data_upper)',11.5)
    +txt(40,320,'shift_out: p0/p1 = det96/det192 A, p4/p5 = det96/det192 B, p8–p15 = 0,1,0,1… → ALTERA2 = 0xAA',11.5)
    +txt(40,345,'dec2_4: out1 = NOT(in1·in2) + mute (−20) · out2 = NOT(¬in1·in2) + mute (−18) · out3 = NOT(in1·¬in2) + mute (−12) · out4 (00) unconnected',11.5,'var(--warn)')
    +txt(40,370,'SR_DETECT_192: count MCLK while ref = 1 (1 ms): > 17920 → det_96 (70k), > 34560 → det_192 (135k); 15360/32000 for release',11.5)},
  {name:'2 · MCU (v100w.c)', note:'Port use from v100w.c, D6204A.h and the BOM. The X1 crystal and JTAG headers are from the BOM.', svg:()=>
    chip(200,50,170,'U18 ATmega128L',[['PA7…PA4','SW1…SW4 (MIRROR(PINA))'],['PE3','FPGA5 (timer0 ISR)'],['PE2 / PE6','EQ1/EQ2 switch inputs (unused)'],['port C','CS8416 bit-banged SPI'],['X1','8 MHz']],[['PD1 / PD2','LOCK / NO LOCK (A)'],['PG0 / PG1','LOCK2 / NO LOCK2 (B)'],['PG4','set by both DEBOUNCE_fs'],['FPGA2/3/4','→ U19 shift_in'],['AK4396 CS/CLK/DATA, RS','U7 / U8']],'Atmel V100')
    +txt(40,330,'Each pass: CS8416_READ_LOCK_ALL → DEBOUNCE_fs/_fs2 → PROCESS_EQ_PUSHBUTTONS → PROCESS_MODES → READ_DIP_SWITCHES → REFRESH_LEDS → ALTERA_write',11.5)
    +txt(40,352,'The CAL decode in ALTERA_write is commented out: data_lower = dip_switches & 0x0F goes to the FPGA as is.',11.5,'var(--ink2)')},
  {name:'3 · Analog output (one channel)', note:'Values present in the BOM: OP275, NE5532, 74HC4053, 3K32 ×12, 6K49 ×4, 8K06 ×4, 16K2 ×4, 19K6 ×4, 3K48 ×2, 30R ×8, 2K trims ×4, 220 pF ×12, 1 nF ×14. How they are wired is inferred.', svg:()=>
    chip(110,90,130,'U7 AK4396',[['SDTI','I²S'],['MCLK','FPGA']],[['AOUTL+','→ OP275'],['AOUTL−','→ OP275']],'DAC')
    +opamp(320,150,'OP275 diff→SE + LPF')+txt(290,210,'3K32 / 6K49 / 220p ('+'inferred'+')',10,'var(--ink2)')
    +chip(480,110,110,'74HC4053',[['X0/X1','gain R'],['enable','MR1_1…3']],[['X','→ driver']],'CAL −20/−18/−12')
    +opamp(620,120,'NE5532 driver')+opamp(620,250,'NE5532 inverter')+res(680,120,760,120,'30R','')+res(680,250,760,250,'30R','')+net(765,120,'OUT +')+net(765,250,'OUT −')
    +txt(60,380,'0 dBFS → +24 dBu (CAL −20) · +22 (−18) · +16 (−12) · Up/Up = no enable = MUTE · RV 2K trim ≈ ±0.43 dB',12)},
];
function viewSchem(m){ window.__pod13aActive=false; schemView(m,SHEETS,'POD13A','The board design files are the ISS3 Gerbers and the P-CAD BOM; no schematic PDF is archived. Sheets 1–2 are redrawn from the archived FPGA and MCU source (obsolete POD13 folder); sheet 3 from the BOM.'); }
function viewSoft(m){
  window.__pod13aActive=true;
  m.innerHTML=`<div class="grid2">${card('main() while(1), converter state at the playhead',`<div id="f"></div><div id="st" class="small"></div>`)}${card('CAL DIP: MCU → FPGA dec2_4 (live)',`<div id="dip"></div>`)}</div><div class="grid2">${card('Rate detection → AK4396 speed (live)',`<div id="sr"></div>`)}${card('Lock window (test sheet)',`<canvas id="lk"></canvas>`)}</div>`;
  const draw=()=>{ const t=SIM.t, i=passIdx(t), M=mcu(), steps=['READ_LOCK_ALL','DEBOUNCE_fs ×2','PROCESS_EQ_PB','PROCESS_MODES','READ_DIP','REFRESH_LEDS','ALTERA_write'];
    m.querySelector('#f').innerHTML=flowSVG(steps.map(s=>({t:s,s:[]})), i<0?-1:Math.floor(((t-M.T[i])/M.P)*7)%7);
    const rec=[]; if(i>=0) for(let j=Math.max(0,i-400);j<=i;j++){ const r=M.S[0][j].rec; if(r&&r.length) r.forEach(x=>rec.push(`pass ${j}: ${x}`)); }
    m.querySelector('#st').innerHTML=(i<0?(booting(t)?'<p>Boot: wait loops; LOCK LEDs forced on by DATA_INITIALIZATION.</p>':'<p>Off.</p>'):'')+`<p><b>Recent decisions</b></p>${rec.slice(-8).map(x=>`<div class="mono">${x}</div>`).join('')||'<div class="muted">none in the last 400 passes</div>'}`;
    const lo=dataLower();
    m.querySelector('#dip').innerHTML=`<table class="kv"><tr><th>SW (a,b)</th><th>dip bits</th><th>dec2_4</th><th>Manual</th><th>Test sheet</th></tr>${['00','10','01','11'].map(k=>`<tr class="${[0,1].some(c=>''+D.dip[2*c]+D.dip[2*c+1]===k)?'hl':''}"><td class="mono">${k[0]==='1'?'Up':'Dn'}, ${k[1]==='1'?'Up':'Dn'}</td><td class="mono">${k[0]==='1'?0:1}${k[1]==='1'?0:1}</td><td class="mono">${CAL[k].ref?'out'+(CAL[k].ref===-20?1:CAL[k].ref===-18?2:3)+' low → MR_'+(CAL[k].ref===-20?1:CAL[k].ref===-18?2:3):'out4 (unconnected)'}</td><td>${CAL[k].ref?CAL[k].ref+' dBFS':'RESERVED'}</td><td>${CAL[k].ref?CAL[k].ref+' dBFS ref':'Mute'}</td></tr>`).join('')}</table><p class="small mono">data_lower now = ${lo.toString(2).padStart(4,'0')}b · A = SW1/SW2 ${D.dip[0]?'Up':'Dn'},${D.dip[1]?'Up':'Dn'} · B = SW3/SW4 ${D.dip[2]?'Up':'Dn'},${D.dip[3]?'Up':'Dn'} · Up = ON = pin grounded = 0 (order SW1 → dip1 ${inf})</p>`;
    m.querySelector('#sr').innerHTML=`<table class="kv"><tr><th></th><th>Input rate</th><th>FPGA det96/192</th><th>debounced speed</th><th>AK4396 reg 01</th><th>Plays?</th></tr>${[0,1].map(k=>{ const s=stAt(k,t), c=D.conv[k], o=outState(k,t); return `<tr><td>${NAMES[k]}</td><td class="mono">${c.fs/1000} kHz</td><td class="mono">${s?(s.flag&1)+'/'+((s.flag>>1)&1):'—'}</td><td class="mono">${s?SPEED[k?(s.pflag===1?1:s.pflag===3?2:0):s.fsA]:'—'}</td><td class="mono">${s?'0x'+DFSREG[s.dfs].toString(16).toUpperCase()+' ('+SPEED[s.dfs]+')':'—'}</td><td>${o.ok?'yes':`<span style="color:var(--bad)">${o.why}</span>`}</td></tr>`; }).join('')}</table><p class="small muted">REFRESH_AK4396_2 programs DAC 2 from <span class="mono">fs</span> (converter A), and DEBOUNCE_fs2 compares with <span class="mono">pfs</span>: converter B plays correctly only in A's speed class.</p>`;
    const {c:cx,w}=SIM.canvas(m.querySelector('#lk'),110); const c=D.conv[0], X=f=>20+(Math.log10(f)-4)/(Math.log10(3e5)-4)*(w-40);
    cx.fillStyle=SIM.css('--chip'); cx.fillRect(20,30,w-40,30); cx.fillStyle=SIM.css('--accent'); cx.globalAlpha=.5; cx.fillRect(X(K.lockLo),30,X(K.lockHi)-X(K.lockLo),30); cx.globalAlpha=1;
    cx.fillStyle=SIM.css('--ink'); cx.font='10px sans-serif'; [10000,14600,32000,48000,70000,96000,135000,192000,216000].forEach(f=>{ cx.fillText((f/1000)+'k',X(f)-8,80); cx.fillRect(X(f),60,1,6); });
    cx.fillStyle=SIM.css('--play'); cx.fillRect(X(c.fs)-2,24,4,42); cx.fillText('converter A',X(c.fs)+4,20); };
  SIM.on('time',draw);
}
function viewNotes(m){ window.__pod13aActive=false;
  m.innerHTML=card('What the POD13A archive shows — findings',`<ol>
   <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src(ART_CDR, ART_CDR.split('/').pop())}</b> (file 2015-10-01, sheet dated Jun.20/14). The ink plates are drawn as vectors; the older PNG silks cut from ${SIM.src(ART_PDF, 'the PDF')} are on the toggle under the rear panel. The CDR also draws what the PDF guides hid: the rocker cut-out, the two front screw holes, the Phoenix and BNC cut-outs, the four rear screw holes and a small rectangular window under the CAL table for the DIP switch, which this model places there.</li>
   <li><b>Corrected 2026|59: the POD13A firmware is archived, in the obsolete POD13 folder (see pod13.js).</b> Atmel V100: <span class="mono">XXX - POD13 - #Master #OBSOLETE/POD13 - #Software/POD13 - SOFTWARE #atmel/POD13 - #SOFTWARE #atmel #v100/</span> (ATmega128, <span class="mono">v100w.c</span>, <span class="mono">D6204A.c</span>, <span class="mono">AK4396.c</span>, <span class="mono">cs84xx.c</span>). Lattice V100: <span class="mono">POD13 - #SOFTWARE #lattice2/v100/pod13a.vhd</span> and <span class="mono">pod13a.jed</span>. This plugin used to say neither was archived and guessed the behaviour; it now runs on that code.</li>
   <li><b>The fourth CAL setting is a mute, in the FPGA.</b> <span class="mono">dec2_4.vhd</span> decodes the two DIP bits into four enables (“11=-20, 10=-18, 01=-12, 00=reserved”), but only out1–out3 reach the MR pins. Up/Up gives 00 → out4 → no gain switch on: the test sheet's “Up/Up = Mute”. The same decoder forces all enables high on <span class="mono">no_lock</span>.</li>
   <li><b>The MCU does not decode the DIP.</b> Its CAL/tone decode in <span class="mono">ALTERA_write</span> and <span class="mono">main()</span> is commented out; <span class="mono">data_lower = dip_switches &amp; 0x0F</span> is shifted to the FPGA unchanged.</li>
   <li><b>Bug: <span class="mono">DEBOUNCE_fs2</span> compares <span class="mono">fs2 != pfs</span></b> (converter A's previous speed) where <span class="mono">pfs2</span> was meant, <b>and <span class="mono">REFRESH_AK4396_2</span> writes register 01 from <span class="mono">fs</span></b>, converter A's speed. So DAC 2's speed mode always follows converter A: converter B at 96 or 192 kHz only plays correctly when A runs in the same speed class (try it in the tutorial, step 6). Both debounce routines also write the same <span class="mono">PORTG BIT4</span>.</li>
   <li><b>The MCU hunts for the connected input.</b> <span class="mono">PROCESS_MODES</span> flips register 04 between 0x89 (“AES75”) and 0x80 (“AES110”) whenever a converter has been unlocked for 25 passes. Because <span class="mono">unlockN_count</span> also counts while locked, the first unlocked pass after a long lock flips at once. The comments on those writes (“GPO = IN1_EQ” on 0x80) are copied from the POD12A/D6202B code, where 0x89 meant the EQ input.</li>
   <li><b>Lock must be fast.</b> A hunt period is 26 passes (≈${SIM.fmtDur(26*PASS_CY/XTAL)} with the estimated pass length). A CS8416 that needed longer than that to lock would be switched away before it locked, so the shipped units (which passed the test) must lock faster (${inf}: this model uses ${SIM.fmtDur(K.lockT)}).</li>
   <li><b>Both LOCK LEDs are green during the boot.</b> <span class="mono">DATA_INITIALIZATION()</span> lights LOCK and LOCK2 and then 35 × <span class="mono">wait(3000)</span> follow (≈${Math.round(BOOT*1000)} ms) before the first <span class="mono">REFRESH_LEDS</span>.</li>
   <li><b>The 500 Hz reference comes from a timer interrupt.</b> <span class="mono">timer0_ovf_isr</span> toggles PE3 every 1 ms; the FPGA's <span class="mono">SR_DETECT_192</span> counts MCLK (256 × fs) while it is high and sets det_96 above 70 kHz, det_192 above 135 kHz (60/125 kHz to release), and halves MCLK to the AK4396 at 192 kHz. The flags come back in <span class="mono">ALTERA1</span> with an 0xAA check byte in <span class="mono">ALTERA2</span>.</li>
   <li><b>openGear leftovers.</b> The header says “AT90CAN128 … OPEN GEAR (D6204A) … OCTOBER 4, 2007 … PROTOTYPE”. EQ push-button code (PINE2/PINE6, mask 0x01 so EQ2 alone is ignored) toggles <span class="mono">eq1_active</span>, which nothing uses; EEPROM save/restore of calibration and tone is never reached.</li>
   <li><b>Headroom at the −20 dBFS setting is small.</b> 0 dBFS measured 23.98 dBu (spec: max output +24 dBu). With ±12 V rails the NE5532 line driver can give only about +25.6 dBu (${inf}).</li>
   <li><b>The test numbers support the long-cable claim.</b> “Max Distance >596 m”, lock held down to 0.097 V p-p (BNC) and 0.034 V p-p (Phoenix, called “XLR” on the sheet), lock range 14.6–216 kHz.</li>
   <li><b>The BOM header names another product.</b> <span class="mono">POD13A-PCAD-BOM.txt</span> is for <span class="mono">POD13A-iss3.pcb</span>, but its title line reads “POD31A-ISS1”. Issue numbers drift between the manual, test procedure, test report and BOM.</li>
   <li><b>OP275 sits in an NE5532 footprint</b> in the P-CAD BOM, so either dual op-amp fits the pads.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Main-loop pass ≈ ${SIM.fmtDur(PASS_CY/XTAL)}, estimated from the bit-banged SPI traffic; wait() = 7 cycles per count (${inf}).</li><li>BNC = RXP1 (“AES75”, 0x89), Phoenix = RXP0 (“AES110”, 0x80); DIP SW1…SW4 = PA7…PA4 (${inf}).</li><li>CS8416 lock ${SIM.fmtDur(K.lockT)}; with no MCLK the rate detector reads normal speed; a DAC in the wrong speed mode is shown as silent (${inf}).</li><li>Cable loss 2.5 dB/100 m (75 Ω) and 4 dB/100 m (110 Ω) at 48 kHz, scaled with √fs; AK4396 0 dBFS ≈ 2 V rms differential; trim ±0.43 dB from the test's sensitivity range (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD13A - #Engineering/POD13A - #MANUAL/POD13A Manual Oct62008.pdf</li><li>POD13A - #Engineering/POD13A - #TESTING/… TEST PROCEDURE.doc · October102008 POD13A FUNCTIONAL TEST.xls</li><li>POD13A - #Master/POD13A-PCAD-BOM.txt · POD13A-MAIN-ERP-BOM.csv · POD13A-REAR-ERP-BOM.csv</li><li>../XXX - POD13 - #Master #OBSOLETE/POD13 - #Software/POD13 - SOFTWARE #atmel/…#v100/ v100w.c · D6204A.c/.h · AK4396.c · cs84xx.c · altera.c</li><li>../XXX - POD13 - #Master #OBSOLETE/POD13 - #Software/POD13 - #SOFTWARE #lattice2/v100/ pod13a.vhd · dec2_4.vhd · SR_DETECT_192.vhd · pod13a.jed</li><li>POD13A - #ARTWORK #DA #2016/POD13A-FRONT&amp;REAR-SILK (CURVE).pdf · Pics/</li></ul>`); }
SIM.register({
  footnotes: [
    { text: "The rear plate has a small rectangular cut-out under the CAL table: the window for the 4-way CAL DIP switch.", src: "#POD #SERIES/POD13A - #Master/POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The CAL table printed on the rear (DN/UP for A (1,2) and B (3,4)) lists only three settings, −20, −18 and −12 dBFS; the fourth DIP combination (Up/Up) is not on the panel and mutes the output.", src: "#POD #SERIES/POD13A - #Master/POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The rear has four screw holes around the connector field (beside AES/EBU INPUTS and CONVERTER B) as well as the fixing holes at the panel ends.", src: "#POD #SERIES/POD13A - #Master/POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "In this sheet the cut-out guides are drawn in the same black (#1B1918) as the ink, unlike the other 2016 POD sheets, which use pure black for the guides.", src: "#POD #SERIES/POD13A - #Master/POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The CDR draws a drill crosshair at every hole on both the green and white plates; the real panels (Pics/ photos) carry no crosshairs, so the simulator shows them faint.", src: "#POD #SERIES/POD13A - #Master/POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).cdr" }
  ],
  id:'pod13a', name:'POD13A · dual AES/EBU D/A converter (2008|41)', duration:1, product:'POD13A', year:2008, family:'POD series', folder:'#POD #SERIES/POD13A - #Master',
  summary:'Half-rack dual AES/EBU to analog converter with 75 Ω BNC and 110 Ω Phoenix inputs, LOCK/NO LOCK tallies and a rear CAL DIP switch (−20/−18/−12 dBFS = +4 dBu, fourth setting mutes). Modelled from the archived ATmega128 (Atmel V100) and LatticeXP (Lattice V100) code: CS8416 receivers, input hunting, FPGA rate detection and AK4396 DACs.',
  highlights:['Real silkscreen panels: pluggable BNC/Phoenix inputs and a working CAL DIP switch','The MCU main loop simulated pass by pass: input hunt, lock, DAC reset','CAL decode in the FPGA (dec2_4): why Up/Up mutes','Rate detection and the DEBOUNCE_fs2 / REFRESH_AK4396_2 bug','Level and headroom through each stage'],
  depth:'Full model',
  stepUnits:[{label:'1 AES frame',period:()=>1/D.conv[0].fs},{label:'1 MCU pass',period:()=>PASS_CY/XTAL},{label:'1 AES block',period:()=>192/D.conv[0].fs},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.004,'1 AES block (4 ms)'],[0.001,'1 ms'],[0.0001,'100 µs (frames)']], defaultZoom:4,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: setting up a POD13A',render:viewTutorial},{id:'second',label:'One second, frame by frame',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software (Atmel + Lattice V100)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
