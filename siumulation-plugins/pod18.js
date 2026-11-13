/* =====================================================================
   POD18 — Quad audio interface (4 × unbalanced → balanced), Ward-Beck Systems
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.

   Sources used (all in this archive, folder #POD #SERIES/POD18 - #Master):
   - POD18 - #Engineering/MANUAL/POD 18 MANUAL.pdf          (current manual: +12…+24 dB, +25 dBu max out)
   - POD18 - #Engineering/MANUAL/Older/pod18.pdf            (older manual: +10…+25 dB, +28 dBu max out)
   - POD18 - #Engineering/PCB/OBSOLETE/POD18ISS2.net, POD18iss2.bom (P-CAD netlist + BOM, Issue 2)
   - POD18 - #Engineering/PCB/POD18ISS3.sch                 (P-CAD Issue 3; part values read from the binary)
   - POD18 - #TESTREPORT/POD18-21OCT13.pdf                  (stock test, 21 Oct 2013)
   - POD18 - #ARTWORK #DA #2016/POD18-FRONT&REAR-SILK (CURVE).pdf + Pics/POD18 FRONT.jpg, REAR.jpg
   - ../POD1  - POD18 - Redesign #RD #RD64/PCB/POD1 MASTER BOM with jumpers.xlsx (the later SMT build)
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
/* Panel artwork 2026|59: CorelDRAW sheet converted with Inkscape (libcdr) → assets/pod18-front.svg, -rear.svg
   (ink plates coloured green rgb(52,168,83) / white rgb(240,240,236), cut-outs as dark holes, drill crosshairs faint;
   registered to the older PDF PNG silks to ±1 px so every control keeps its place). The PNGs stay on a toggle. */
const ART = {cdr:true};
const ART_CDR = '#POD #SERIES/POD18 - #Master/POD18 - #ARTWORK #DA #2016/POD18-FRONT&REAR-SILK (CURVE).cdr', ART_PDF = '#POD #SERIES/POD18 - #Master/POD18 - #ARTWORK #DA #2016/POD18-FRONT&REAR-SILK (CURVE).pdf';
function artNote(){ return `<div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART_CDR, ART_CDR.split('/').pop())} (CorelDRAW, default) · <label><input type="checkbox" class="pod18-art" ${ART.cdr?'':'checked'}> show the older PNG silks cut from ${SIM.src(ART_PDF, 'the PDF')}</label></div>`; }
document.addEventListener('change', e=>{ if (e.target && e.target.classList && e.target.classList.contains('pod18-art')){ ART.cdr = !e.target.checked; SIM.refresh(); } });
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

const PREFIX='pod18';
const BUILDS = {
  ISS2:{ name:'ISS2 through-hole (2200 µF/25 V)', rail:18, raw:22.6, C:2200e-6, R18:2430, Cin:33e-6, psu:'TE70043 + 1N4003 ×4 + LM317/LM337' },
  ISS3:{ name:'ISS3 through-hole (470 µF/40 V)',  rail:18, raw:22.6, C:470e-6,  R18:2430, Cin:33e-6, psu:'TE70043 + 1N4003 ×4 + LM317/LM337' },
  RD64:{ name:'RD64 SMT build (2 × POD1-3, ±12 V)', rail:12, raw:null, C:null,   R18:2210, Cin:68e-6, psu:'NFM-10-5 + SUW1R5 (DC-DC)' },
};
const V = { R14:47500, R15:100000, R19:47500, R20:301, RV:5000, R16:4750, R17:4750, Rout:30, swingLoss:1.5, Ilim:0.032, Iload:0.040, psrr:65 };
const CH = ['OUTPUT 1 L','OUTPUT 1 R','OUTPUT 2 L','OUTPUT 2 R'];
const REF = [['CH1L','U1','R14A/R19A/R18A/R20A','R30A/R31A','CH1LOUT'],['CH1R','U2','R22A/R26A/R25A/R27A','R32A/R33A','CH1ROUT'],['CH2L','U3','R14/R19/R18/R20','R30/R31','CH2LOUT'],['CH2R','U4','R22/R26/R25/R27','R32/R33','CH2ROUT']];
const D = {
  power:true, powerAt:-1, build:'ISS3', regs:'built',  // regs: 'built' (rails as named) | 'bom' (221R/221R per the parts lists)
  gen:{ f:1000, lvl:-7.8 }, plug:[true,true,true,true], load:600,
  trim:[0.25,0.25,0.25,0.25], log:[],
};
const FACT=JSON.parse(JSON.stringify(D));
const B = ()=>BUILDS[D.build];
const dB = g=>20*Math.log10(g);
function gainLeg(f){ const Rsh=V.R20+(1-f)*V.RV, R18=B().R18; return (V.R19+R18+V.R19*R18/Rsh)/V.R14; }

/* ---------------- power supply ---------------- */
function vreg(){ return D.regs==='bom' && D.build!=='RD64' ? 1.25*(1+221/221) : B().rail; }
function rawAt(t){ // unregulated bridge output: peak charge then linear discharge at 120 Hz
  const b=B(); if (!b.raw) return 5;
  const pp = V.Iload/(120*b.C), ph=(t*120)%1; return b.raw - pp*ph;
}
function rippleOut(){ const b=B(); return b.raw? V.Iload/(120*b.C)*Math.pow(10,-V.psrr/20) : 0.002; }
function railAt(t){
  if (!D.power) return 0;
  const on = D.powerAt<0 ? -1 : D.powerAt; if (on>=0 && t<on) return 0;
  const dt = on<0 ? 1 : t-on;
  const tau = B().raw ? 0.010 : 0.004, dly = B().raw ? 0.004 : 0.020;   // inferred
  const target = Math.min(vreg(), B().raw ? rawAt(t)-2.0 : vreg());
  const r = dt<dly ? 0 : target*(1-Math.exp(-(dt-dly)/tau));
  return r + (B().raw ? rippleOut()*Math.sin(2*Math.PI*120*t) : 0);
}
const swing = t => Math.max(0, railAt(t)-V.swingLoss);
function legLimit(t){ const sw=swing(t); const il = D.load>=1e5 ? 1e9 : V.Ilim*(D.load/2+V.Rout); return Math.min(sw, il); } // output current limit (inferred)
const hclip=(v,l)=>clamp(v,-l,l);
const w = t=>Math.sin(2*Math.PI*D.gen.f*t);
function inV(ch){ return D.plug[ch] ? dbu2v(D.gen.lvl)*Math.SQRT2 : 0; }
function chan(ch,t){
  const vin=inV(ch)*w(t), lim=legLimit(t);
  const n=hclip(-gainLeg(D.trim[ch])*vin, lim), p=hclip(-n*V.R17/V.R16, lim);
  return { vin, n, p, diff:(p-n)*D.load/(D.load+2*V.Rout) };
}
function levels(ch){
  const inL = D.plug[ch]? D.gen.lvl : -200, g=gainLeg(D.trim[ch]), lc=v2dbu(legLimit(1)/Math.SQRT2), ld = dB(D.load/(D.load+2*V.Rout));
  const n=inL+dB(g), diff=n+6.0206, out=diff+ld;
  return { stages:[
    {name:`RCA ${ch<2?'IN 1':'IN 2'} ${ch%2?'R (red)':'L (white)'}`, lvl:inL, gain:null, clip:null, note:`${REF[ch][0]}: Zin ≈ 47K5 (manual: 47 kΩ)`},
    {name:`${REF[ch][1]}A NE5532, T-network gain`, lvl:n, gain:dB(g), clip:lc, note:`${REF[ch][2]}, trim ${REF[ch][0]} 5K: ${fdb(dB(gainLeg(0)))} … ${fdb(dB(gainLeg(1)))} dB`},
    {name:`${REF[ch][1]}B inverter (4K75/4K75)`, lvl:diff, gain:6.02, clip:lc+6.02, note:'second leg in anti-phase'},
    {name:`${REF[ch][3]} 30R → XLR ${REF[ch][4]}`, lvl:out, gain:ld, clip:lc+6.02+ld, note:`60 Ω balanced into ${D.load>=1e5?'open circuit':D.load+' Ω'}`},
  ], out, clip:n>lc+0.01, total: out-inL };
}

/* ---------------- actions ---------------- */
const act = makeActor(D, ()=>CH.map((n,c)=>`${n.replace('OUTPUT ','')} ${fdb(levels(c).out)}`).join(' · ')+' dBu');
const A = {
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power;
    if (D.power){ D.powerAt=SIM.t; if (B().raw){ tr('PWRSW → T1 TE70043 primaries (R1–R3 0R links choose the 115/230 V strapping)'); tr('Centre-tapped secondaries → D1–D4 1N4003 bridge → C1/C2 → ±V raw'); tr('REG1 LM317 / REG2 LM337 → +18V / −18V nets → U1–U4 pins 8/4'); tr('Power LED on +V through R4 3K3'); }
      else { tr('RD64 build: NFM-10-5 → DC+ 5 V → SUW1R5 → ±12 V on the POD1-1 main board'); }
      tr('Scrub forward 10–40 ms from the playhead to watch the rails rise'); } else tr('Rails collapse; outputs silent'); }); },
  trim(ch,dir){ act(`Turn OUTPUT ADJUST ${CH[ch].replace('OUTPUT ','')} ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    const o=D.trim[ch]; D.trim[ch]=clamp(+(o+dir*0.04).toFixed(3),0,1);
    tr(`${REF[ch][0]} trim (PT10H-5K): shunt at the T node = 301R + ${Math.round((1-D.trim[ch])*5000)} Ω to ground`);
    tr(`${REF[ch][1]}A gain ${fdb(dB(gainLeg(o)))} → ${fdb(dB(gainLeg(D.trim[ch])))} dB per leg; RCA → XLR ${fdb(dB(gainLeg(D.trim[ch]))+6.02)} dB (open circuit)`); }); },
  plug(ch){ act(`${D.plug[ch]?'Unplug':'Plug in'} RCA ${ch<2?'IN 1':'IN 2'} ${ch%2?'R':'L'}`, tr=>{ D.plug[ch]=!D.plug[ch]; tr(D.plug[ch]?`JK1 → R14/R22 47K5 → C13/C16 33 µF → ${REF[ch][1]} pin 2`:'Input open: R15/R21 100K hold the coupling cap at ground'); }); },
  set(k,v,label){ act(label, tr=>{ if(k==='lvl'||k==='f') D.gen[k]=v; else D[k]=v;
    if (k==='build') tr(`${BUILDS[v].name}: ${BUILDS[v].psu}${v==='RD64'?'; gain T-network uses 2K21 (POD1-3) instead of 2K43':''}`);
    else if (k==='regs') tr(v==='bom'?'LM317 adjust network 221R (out→adj) and 221R (adj→gnd): Vout = 1.25 × (1 + 221/221) = 2.5 V. The op-amps cannot work':'Rails at the ±18 V the net names promise (the second resistor of each pair must differ from the parts list, '+inf+')');
    else if (k==='load') tr(`Each leg now drives ${v>=1e5?'nothing':v/2+' Ω'} to the load's centre through 30R; the NE5532 current limit (≈${V.Ilim*1000} mA, ${inf}) caps the swing at ${v>=1e5?'the rails':(V.Ilim*(v/2+30)).toFixed(1)+' V peak'}`);
    else tr('Source changed; every stage follows'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};

/* ---------------- panels (POD18-FRONT&REAR-SILK (CURVE).pdf; the rear separation has no crop marks, so its
   box was set from POD1's ink-to-edge offsets — inferred) ---------------- */
const TRIMXY=[[791,195],[990,195],[1316,195],[1514,195]];
function frontSVG(t){ let over=rocker(D.power)+pled(D.power && railAt(t)>1); TRIMXY.forEach(([x,y],c)=>over+=trim(x,y,D.trim[c],'tr'+c,'OUTPUT ADJUST '+CH[c]));
  return panelSVG(PREFIX,'front',{over},'POD18 front panel (real silkscreen)'); }
function rearSVG(){
  const pl = c=>D.plug[c];
  const over = xlr(209,155,true,false,'','BALANCED OUTPUTS 2 LEFT (CH2LOUT, NC3MD-H)')+xlr(448,155,true,false,'','BALANCED OUTPUTS 2 RIGHT (CH2ROUT)')
    + rca(650,98,'#c8312a',pl(3),'pl3','UNBALANCED IN 2 right — click')+rca(650,208,'#eeeeee',pl(2),'pl2','UNBALANCED IN 2 left — click')
    + rca(759,98,'#c8312a',pl(1),'pl1','UNBALANCED IN 1 right — click')+rca(759,208,'#eeeeee',pl(0),'pl0','UNBALANCED IN 1 left — click')
    + xlr(930,155,true,false,'','BALANCED OUTPUTS 1 LEFT (CH1LOUT)')+xlr(1168,155,true,false,'','BALANCED OUTPUTS 1 RIGHT (CH1ROUT)') + iec(1385,28,1611,252);
  return panelSVG(PREFIX,'rear',{over},'POD18 rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); for(let c=0;c<4;c++){ bindTrim(root,'tr'+c,d=>A.trim(c,d)); root.querySelectorAll('.pl'+c).forEach(g=>g.onclick=()=>A.plug(c)); } }
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px" class="small">
    <label>Consumer source <input id="gL" type="number" step="1" value="${D.gen.lvl}" style="width:70px"> dBu</label>
    <label>Tone <select id="gF">${[100,1000,10000].map(f=>`<option ${f===D.gen.f?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
    <label>Load <select id="ld">${[[1e6,'open'],[10000,'10 kΩ'],[600,'600 Ω']].map(([v,l])=>`<option value="${v}" ${v===D.load?'selected':''}>${l}</option>`).join('')}</select></label>
    <label>Build <select id="bd">${Object.keys(BUILDS).map(k=>`<option value="${k}" ${k===D.build?'selected':''}>${BUILDS[k].name}</option>`).join('')}</select></label>
    <label>Regulator resistors <select id="rg"><option value="built" ${D.regs==='built'?'selected':''}>as the rail names say (±18 V)</option><option value="bom" ${D.regs==='bom'?'selected':''}>as the parts lists say (221R/221R)</option></select></label></div>
    <div class="small muted" style="margin-top:4px">Trims: click the right half to turn clockwise, the left half counter-clockwise, or use the wheel. Keys Q/W, E/R, A/S, D/F. Click a rear RCA to plug or unplug it.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if(!g('#gL')) return;
  g('#gL').onchange=e=>A.set('lvl',+e.target.value,'Consumer source → '+e.target.value+' dBu'); g('#gF').onchange=e=>A.set('f',+e.target.value,'Tone → '+e.target.value+' Hz');
  g('#ld').onchange=e=>A.set('load',+e.target.value,'Output load → '+e.target.selectedOptions[0].text); g('#bd').onchange=e=>A.set('build',e.target.value,'Build → '+BUILDS[e.target.value].name);
  g('#rg').onchange=e=>A.set('regs',e.target.value,'Regulator resistors → '+e.target.selectedOptions[0].text); }
bindKeys('__pod18Active', ()=>({q:()=>A.trim(0,-1),w:()=>A.trim(0,1),e:()=>A.trim(1,-1),r:()=>A.trim(1,1),a:()=>A.trim(2,-1),s:()=>A.trim(2,1),d:()=>A.trim(3,-1),f:()=>A.trim(3,1)}));

/* ---------------- timeline ---------------- */
const dense=(span,pw)=>span*D.gen.f>pw/3;
const envOf = fn=>{ const e=t=>{ let m=0; const P=1/D.gen.f; for(let i=0;i<8;i++) m=Math.max(m,Math.abs(fn(t+P*i/8))); return m; }; e.dense=dense; return e; };
function lanes(){
  const a=SIM.css('--accent'), b=SIM.css('--accent2'), r=SIM.css('--bad'), wn=SIM.css('--warn');
  const L=[{ label:'Mains (60 Hz) → T1', h:30, draw(c,X,t0,t1,y,h){ if(!D.power) return; if (t1-t0>0.3){ SIM.pulses(c,X,t0,t1,y,h,1/60,0,1/120,SIM.css('--ink2'),'mains cycles'); return; } c.strokeStyle=SIM.css('--ink2'); c.beginPath(); for(let i=0;i<=400;i++){ const tt=t0+(t1-t0)*i/400, v=Math.sin(2*Math.PI*60*tt); const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); } }];
  if (B().raw) L.push(waveLane('+V raw (C1, bridge)', t=>D.power?rawAt(t)-(B().raw-2):0, -0.05, null, wn, 34));
  L.push(waveLane('+18V rail (REG1) ripple', t=>railAt(t)-vreg(), -0.0005, null, wn, 30));
  L.push(waveLane('+18V rail (REG1)', t=>railAt(t), 20, null, wn, 26));
  for (const ch of [0,2]){
    L.push(waveLane(`RCA ${ch?'IN 2':'IN 1'} L`, t=>chan(ch,t).vin, -0.05, null, b, 34, envOf(t=>chan(ch,t).vin)));
    L.push(waveLane(`${REF[ch][1]}A → pin 3`, t=>chan(ch,t).n, -0.05, legLimit(1), r, 34, envOf(t=>chan(ch,t).n)));
    L.push(waveLane(`${REF[ch][1]}B → pin 2`, t=>chan(ch,t).p, -0.05, legLimit(1), a, 34, envOf(t=>chan(ch,t).p)));
    L.push(waveLane(`XLR ${REF[ch][4]} (diff.)`, t=>chan(ch,t).diff, -0.05, null, a, 38, envOf(t=>chan(ch,t).diff)));
  }
  L.push(boolLane('Power LED', t=>D.power && railAt(t)>1, '#9be35a'));
  return L;
}

/* ---------------- views ---------------- */
function levelsCard(){
  return [0,1,2,3].map(ch=>{ const l=levels(ch); const body=`<h3>${CH[ch]} (${REF[ch][0]}) · total ${l.total<-150?'—':fdb(l.total)+' dB'}${l.clip?' · <span style="color:var(--bad)">CLIPPING</span>':''}</h3>${stageTable(l.stages)}`; return ch? `<details><summary class="small">${CH[ch]} — ${fdb(l.out)} dBu</summary>${body}</details>`:body; }).join('')
    + `<p class="small muted">Leg limit = the lower of the rail swing (rail − ${V.swingLoss} V, ${inf}) and the NE5532 output current (≈${V.Ilim*1000} mA, ${inf}) into half the load plus 30R. Now: ${legLimit(1).toFixed(2)} V peak per leg → max ${fdb(v2dbu(legLimit(1)/Math.SQRT2)+6.02+dB(D.load/(D.load+60)))} dBu at the XLR.</p>`;
}
function viewSim(m){
  window.__pod18Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead',`<div id="fp"></div>${controlsHTML()}`)}${card('Rear panel — click the RCA inputs to plug or unplug',`<div id="rp"></div>${artNote()}`)}</div>
    <div>${card('What the circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('Outputs now',`<div id="now"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable. 10 ms shows the 120 Hz ripple; 2 ms shows single tone cycles.',`<canvas id="tl"></canvas>`)}
    <div class="grid2">${card('Level through every stage',`<div id="lv"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Turn an OUTPUT ADJUST trim or plug an input.');
    m.querySelector('#now').innerHTML=`<table class="kv">${CH.map((n,c)=>{const l=levels(c); return `<tr><th>${n}</th><td class="mono">${l.out<-150?'— (no input)':fdb(l.out)+' dBu'} ${l.clip?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>`;}).join('')}
      <tr><th>Rails at playhead</th><td class="mono">±${railAt(t).toFixed(3)} V${B().raw?` · raw ${rawAt(t).toFixed(2)} V`:''}</td></tr><tr><th>Build</th><td class="mono">${B().name}${D.regs==='bom'&&D.build!=='RD64'?' · regs per parts list':''}</td></tr></table>`;
    m.querySelector('#lv').innerHTML=levelsCard(); m.querySelector('#log').innerHTML=logHTML(D);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:180}); };
  bindControls(m); SIM.on('time',draw);
}
const LESSONS=[
  {title:'Meet the POD18', body:`<p>The manual calls POD18 a <b>4 channel audio interface</b>. It “converts 4 consumer grade unbalanced audio signals to balanced broadcast quality signals”. Its inputs are four RCA jacks (IN 1 and IN 2, left and right). Its outputs are four male XLRs (BALANCED OUTPUTS 1 and 2). Each output has an <b>OUTPUT ADJUST</b> trim on the front.</p><p>Spec (current manual): gain +12 to +24 dB, maximum input +10 dBu, maximum output +25 dBu, input impedance 47 kΩ, output impedance 60 Ω balanced.</p>`, check:()=>true, auto:true},
  {title:'1 · Power', body:`<p>Switch the <b>rocker</b> on. In the through-hole builds the mains goes through a transformer, a 1N4003 bridge and LM317/LM337 regulators.</p>`, check:()=>D.power, hint:'Click the rocker.'},
  {title:'2 · Connect the consumer machines', body:`<p>Plug the two stereo players into <b>UNBALANCED IN 1</b> and <b>IN 2</b> on the rear. White is left, red is right.</p>`, check:()=>D.plug.every(x=>x), hint:'Click each rear RCA that has no blue plug.'},
  {title:'3 · Line up OUTPUT 1', body:`<p>The consumer source plays line-up tone at −10 dBV (−7.8 dBu). The manual says “Front panel trim control lets the user set playback levels of consumer equipment to the professional standards employed”, which here is <b>+4 dBu</b>.</p><p>Set <b>OUTPUT 1 L</b> and <b>OUTPUT 1 R</b> to +4 dBu ±0.5 dB into 600 Ω.</p>`, check:()=>[0,1].every(c=>Math.abs(levels(c).out-4)<=0.5)&&D.gen.lvl===-7.8&&D.load===600, hint:'Q/W and E/R keys (or click the trims). Keep the source at −7.8 dBu and the load at 600 Ω.'},
  {title:'4 · Line up OUTPUT 2', body:`<p>Do the same for <b>OUTPUT 2 L/R</b>.</p>`, check:()=>[2,3].every(c=>Math.abs(levels(c).out-4)<=0.5)&&D.gen.lvl===-7.8, hint:'A/S and D/F keys.'},
  {title:'5 · Headroom', body:`<p>Raise the consumer source to <b>+10 dBu</b>, the manual's maximum input. With the trims where you left them, the outputs try to reach about +22 dBu.</p><p>Now turn OUTPUT 1 L fully clockwise and watch the stage table. The output stops at about +25 dBu into 600 Ω. Change the load to <b>open</b> and see the limit rise: into 600 Ω the output current is the limit, not the rails (${inf}).</p><p><b>Goal:</b> make OUTPUT 1 L clip.</p>`, check:()=>levels(0).clip, hint:'Source to +10 dBu, then W until the table says CLIPPING.'},
  {title:'6 · Look at the power supply', body:`<p>Zoom the timeline to <b>10 ms</b>. The raw supply after the bridge sags between mains peaks (120 Hz ripple). The LM317 removes about ${V.psrr} dB of it (${inf}). Switch <b>Build</b> between ISS2 (2200 µF) and ISS3 (470 µF): ISS3 has 4.7 times the raw ripple.</p><p><b>Goal:</b> select ISS2.</p>`, check:()=>D.build==='ISS2', hint:'Use the Build menu.'},
  {title:'7 · The puzzle in the parts list', body:`<p>Both the ISS2 BOM and the ISS3 schematic list only <b>221R</b> resistors in the regulator networks. Taken literally, an LM317 with 221R/221R makes 2.5 V. Set “Regulator resistors: as the parts lists say” and see what that would do.</p><p><b>Goal:</b> try it, then set it back.</p>`, check:()=>D.log.some(e=>/221R\/221R/.test(e.name))&&D.regs==='built', hint:'Use the Regulator resistors menu twice.'},
  {title:'Done', body:`<p>The <b>Signal path</b> tab has the gain maths, <b>Schematics</b> has the netlist redrawn, and <b>Findings</b> covers the manual and spec mismatches.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod18Active=true;
  tutorialView(m,{title:'Tutorial — from the POD18 manual', lessons:LESSONS, D, getIdx:()=>lessonIdx, setIdx:i=>lessonIdx=i, reset:()=>A.reset(),
    unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${CH.map((n,c)=>`<span class="chip mono">${n} ${fdb(levels(c).out)} dBu${levels(c).clip?' CLIP':''}</span>`).join('')}</div>`,
    bind:root=>{ bindPanel(root); bindControls(root); } }); }
function viewSecond(m){
  window.__pod18Active=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the circuit at the playhead',`<div id="dev"></div>`)}${card('As seen by the outside world',`<div id="fp"></div><canvas id="meter"></canvas>`)}</div>${card('Zoom ladder — XLR CH1LOUT',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t,f=D.gen.f,b=B();
    const rows=[['Tone cycles',f.toLocaleString(),SIM.fmtDur(1/f),'Continuous analog path, 4 identical channels'],
      ['Mains cycles',60,SIM.fmtDur(1/60),b.raw?'T1 TE70043, centre-tapped secondaries':'NFM-10-5 switch-mode module (RD64)'],
      ['Bridge charging pulses',b.raw?120:'—',b.raw?SIM.fmtDur(1/120):'',b.raw?`C1/C2 ${b.C*1e6} µF top up twice per mains cycle; ripple ≈ ${(V.Iload/(120*b.C)).toFixed(2)} V p-p at ${V.Iload*1000} mA (${inf})`:'no 120 Hz ripple'],
      ['Rail ripple after the regulator','—','',`≈ ${(rippleOut()*2000).toFixed(2)} mV p-p (${V.psrr} dB rejection, ${inf})`],
      ['Input coupling HPF (C13·R14)','—',SIM.fmtDur(V.R14*b.Cin),`−3 dB at ${(1/(2*Math.PI*V.R14*b.Cin)).toFixed(3)} Hz`],
      ['Feedback pole (C14 22 pF)','—',SIM.fmtDur((V.R19+b.R18)*22e-12),`≈ ${(1/(2*Math.PI*(V.R19+b.R18)*22e-12)/1000).toFixed(0)} kHz`]];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period / τ</th><th>what it means</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)} · mains phase ${((t*60%1)*360).toFixed(0)}° · tone cycle ${Math.floor(t*f)}</td></tr><tr><th>Rails</th><td class="mono">±${railAt(t).toFixed(4)} V${b.raw?' · raw '+rawAt(t).toFixed(3)+' V':''}</td></tr>
      ${[0,1,2,3].map(c=>{const s=chan(c,t); return `<tr><th>${CH[c]}</th><td class="mono">in ${s.vin.toFixed(3)} V → pin 3 ${s.n.toFixed(3)} · pin 2 ${s.p.toFixed(3)} → ${s.diff.toFixed(3)} V</td></tr>`;}).join('')}</table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    const {c,w}=SIM.canvas(m.querySelector('#meter'),130);
    CH.forEach((n,i)=>{ let pk=0; const P=1/f; for(let k=0;k<32;k++) pk=Math.max(pk,Math.abs(chan(i,t-P*k/32).diff)); const d=v2dbu(pk/Math.SQRT2), segs=40, lit=Math.round(clamp((d+30)/58,0,1)*segs);
      for(let s=0;s<segs;s++){ c.fillStyle=s<lit?(s>=segs-6?'#e3453a':s>=segs-14?'#e8b23a':'#3fbf5f'):SIM.css('--grid'); c.fillRect(110+s*(w-120)/segs,6+i*31,(w-120)/segs-2,22); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(n.replace('OUTPUT','OUT')+' '+(d>-150?fdb(d):'—'),4,21+i*31); });
    drawLadder(m.querySelector('#zl'),t,[['1 second',1],['100 ms',0.1],['1 mains cycle',1/60],['1 tone cycle',1/f],['50 µs',5e-5]],tt=>chan(0,tt).diff,-0.05,'XLR CH1LOUT, volts'); };
  SIM.on('time',draw);
}
const BLOCKS={
  ac:{x:20,y:20,w:170,h:80,t:'ACIN + PWRSW',s:['PAN356 / PAN256','R1–R3 0R: 115/230 V'],d:'Netlist: ACIN-3 → PWRSW → T1 primaries. R1, R2 and R3 are 0R links that wire the two primaries in series or parallel (115/230 V strapping, inferred from the topology).'},
  t1:{x:20,y:130,w:170,h:80,t:'T1 TE70043',s:['dual primary','centre-tapped secondaries'],d:'Pins 6/7/14/15 to GNDD (centre taps); 8/16 and 5/13 to the bridge. The secondary voltage is not in the archive (≈2 × 17 VAC, inferred from the 25 V caps in ISS2).'},
  rect:{x:20,y:240,w:170,h:80,t:'D1–D4 1N4003 + C1/C2',s:['ISS2: 2200 µF/25 V','ISS3: 470 µF/40 V'],d:'A full-wave bridge into two reservoir capacitors gives ±V raw.'},
  reg:{x:20,y:350,w:170,h:80,t:'REG1 LM317 / REG2 LM337',s:['+18V / −18V nets','R5–R8 221R'],d:'Adjustable regulators. The rail nets are named +18V and −18V, but every part list shows only 221R parts in the adjust networks (see Findings).'},
  in:{x:250,y:20,w:170,h:80,t:'JK1 quad RCA',s:['pins 3/4 → CH1 L/R','pins 5/6 → CH2 L/R'],d:'A single four-way RCA block (JACKRCA2) for UNBALANCED IN 1 and IN 2.'},
  g:{x:250,y:150,w:190,h:120,t:'4 × gain stage (U1–U4 A)',s:['R14 47K5 → C13 33 µF','R19 47K5 + R18 2K43 T','R20 301R + 5K trim to GND','C14 22 pF'],d:'Inverting stage with a T feedback network. Gain per leg = (R19 + R18 + R19·R18/Rsh)/R14, with Rsh = 301R + trim: +3.6 … +19.2 dB.'},
  inv:{x:480,y:150,w:170,h:120,t:'4 × inverter (U1–U4 B)',s:['R16/R17 4K75','C15 22 pF'],d:'Unity inverter for the second leg; the balanced output gets +6 dB.'},
  out:{x:480,y:320,w:170,h:90,t:'4 × XLR male (NC3MD-H)',s:['R30/R31 30R 1 W build-out','pin 2 = inverter, pin 3 = gain stage'],d:'60 Ω balanced source. The 1 W build-out resistors survive a shorted output.'},
  fr:{x:480,y:20,w:170,h:80,t:'Front panel',s:['rocker · PWR LED (R4 3K3)','4 × PT10H-5K trims'],d:'The trims CH1L, CH1R, CH2L and CH2R are on the main board and reached through the OUTPUT ADJUST holes.'},
};
const WIRES=[['ac','t1',''],['t1','rect','AC'],['rect','reg','±V'],['reg','g','±18V'],['in','g','×4'],['g','inv',''],['g','out','pin 3'],['inv','out','pin 2'],['fr','g','trims']];
function viewBlock(m){ window.__pod18Active=false; blockView(m,BLOCKS,WIRES,'g',[680,450],card('In one sentence',`<p>Four identical channels. Each is an adjustable inverting amplifier followed by a unity inverter, so one RCA input becomes a balanced pair. A linear ±18 V supply powers them.</p>`)); }
const SHEETS=[
  {name:'1 · One channel (CH1L)', note:'Redrawn from POD18ISS2.net (nets NET00000–NET00009) with values from POD18iss2.bom. The other three channels are the same with their own reference designators.', svg:()=>
    net(30,140,'JK1-3 (IN 1 L)')+wire([[110,140],[130,140]])+res(130,140,200,140,'R14A','47K5')+wire([[200,140],[230,140]])+dot(220,140)+res(220,140,220,210,'R15A','100K')+gnd(220,210)
    +cap(230,140,280,140,'C13A','33/10')+wire([[280,140],[320,140]])+opamp(320,152,'U1 (A) NE5532')+wire([[320,164],[310,164],[310,190]])+gnd(310,190)
    +wire([[320,140],[320,70],[340,70]])+res(340,70,410,70,'R19A','47K5')+wire([[410,70],[430,70]])+dot(430,70)+res(430,70,500,70,'R18A','2K43')+wire([[500,70],[520,70],[520,152]])+wire([[380,152],[580,152]])
    +wire([[430,70],[430,40],[450,40]])+res(450,40,520,40,'R20A','301R')+txt(530,44,'→ CH1L trim PT10H-5K (2+3) → GNDD',10,'var(--ink2)')
    +res(580,152,650,152,'R30A','30R 1W')+net(655,152,'CH1LOUT-3')
    +wire([[540,152],[540,250]])+res(540,250,540,300,'R16A','4K75')+wire([[540,300],[540,320],[580,320]])+opamp(580,332,'U1 (B)')+wire([[580,344],[570,344],[570,370]])+gnd(570,370)
    +res(580,290,660,290,'R17A','4K75')+wire([[560,320],[560,290],[580,290]])+wire([[660,290],[670,290],[670,332],[640,332]])+wire([[640,332],[690,332]])+res(690,332,760,332,'R31A','30R 1W')+net(690,360,'CH1LOUT-2')
    +txt(40,420,`Gain/leg = (R19 + R18 + R19·R18/Rsh)/R14, Rsh = 301R + trim → ${fdb(20*Math.log10((47500+2430+47500*2430/5301)/47500))} … ${fdb(20*Math.log10((47500+2430+47500*2430/301)/47500))} dB; balanced +6.02 dB`,11.5)
    +txt(40,440,'Older manual: +10 … +25 dB (matches). Current manual: +12 … +24 dB.',11.5)},
  {name:'2 · Power supply', note:'From POD18ISS2.net: +V, −V, +18V, −18V, GNDD and NET00040–00050. ISS3 changes C1/C2 to 470 µF/40 V (values read from POD18ISS3.sch).', svg:()=>
    chip(130,80,130,'T1 TE70043',[['1/9','ACIN-2'],['2/10, 3/11','R1–R3 links'],['4/12','PWRSW-2']],[['8/16','D1-K, D3-A'],['6/7/14/15','GNDD'],['5/13','D2-K, D4-A']],'dual primary')
    +chip(420,60,120,'Bridge',[['D3/D4 K','+V'],['D1/D2 A','−V']],[['C1','2200/25 (ISS2)'],['C2','470/40 (ISS3)']],'1N4003 ×4')
    +chip(620,200,140,'REG1 LM317',[['IN (3)','+V'],['ADJ (1)','R8 221R / R7 221R']],[['OUT (2)','+18V']],'')
    +chip(620,310,140,'REG2 LM337',[['IN (2)','−V'],['ADJ (1)','R6 221R / R5 221R']],[['OUT (3)','−18V']],'')
    +txt(60,300,'Vout = 1.25 V × (1 + R7/R8)',12)+txt(60,320,'R7 = R8 = 221R  →  2.5 V   (!)',12,'var(--bad)')+txt(60,340,'R7 ≈ 2K95 would give 18 V  ('+'inferred'+')',12,'var(--warn)')
    +txt(60,420,'+18V → U1–U4 pin 8, −18V → pin 4; C3–C12 0.1 µF decoupling',11)+txt(60,438,'PWR LED (551-0405) on +V through R4 3K3; R9/R10 0R links',11)},
];
function viewSchem(m){ window.__pod18Active=false; schemView(m,SHEETS,'POD18','The P-CAD originals are POD18ISS3.sch / POD18iss3.pcb (Issue 3) and OBSOLETE/POD18ISS2.sch/.net/.bom. These sheets are redrawn from the ISS2 netlist, so every connection shown is a real net.'); }
function viewSoft(m){
  window.__pod18Active=true; let hot=1;
  m.innerHTML=`${card('No firmware — the signal path, live',`<div id="f"></div><div id="det" class="card"></div>`)}<div class="grid2">${card('How the buttons did things',`<div id="btn"></div>`)}${card('Spec versions vs this model',`<div id="spec"></div>`)}</div>`;
  const draw=()=>{ const l=levels(0);
    const st=[{t:'RCA IN 1 L',s:[fdb(l.stages[0].lvl)+' dBu','47K5']},{t:'U1A + CH1L',s:['×'+gainLeg(D.trim[0]).toFixed(3),fdb(l.stages[1].lvl)+' dBu/leg'],bad:l.clip},{t:'U1B inverter',s:['×−1','+6.02 dB']},{t:'R30A/R31A → XLR',s:['60 Ω',fdb(l.out)+' dBu']},{t:'Rails',s:['±'+vreg().toFixed(1)+' V',B().psu.split(' + ')[0]]}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    const det=[`JK1-3 → R14A 47K5 → C13A ${B().Cin*1e6} µF. R15A 100K bleeds the cap to ground.`,`G = (R19 + R18 + R19·R18/Rsh)/R14 = (47K5 + ${B().R18} + 47K5·${B().R18}/${Math.round(V.R20+(1-D.trim[0])*V.RV)})/47K5 = ${gainLeg(D.trim[0]).toFixed(3)}`,'R16A/R17A 4K75/4K75 with C15A 22 pF: pin 2 = −(pin 3).',`Each leg 30R 1 W: into ${D.load} Ω the loss is ${(-dB(D.load/(D.load+60))).toFixed(2)} dB. Leg limit now ${legLimit(1).toFixed(2)} V peak.`,`${B().psu}. ${B().raw?'Raw ripple '+(V.Iload/(120*B().C)).toFixed(2)+' V p-p → '+(rippleOut()*2000).toFixed(2)+' mV p-p after the regulator ('+inf+').':''}`];
    m.querySelector('#det').innerHTML=det[hot];
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Circuit path</th></tr><tr><td>Rocker</td><td class="small mono">ACIN → PWRSW → T1 → D1–D4 → C1/C2 → LM317/LM337</td></tr><tr><td>OUTPUT ADJUST trims</td><td class="small mono">CH1L/CH1R/CH2L/CH2R 5K → R20/R27 301R → T node of U1–U4 A</td></tr><tr><td>Plug an RCA</td><td class="small mono">JK1-3…6 → R14/R22 47K5 → C13/C16</td></tr></table><p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none'}</b></p>`;
    const gm=fdb(dB(gainLeg(0))+6.02), gx=fdb(dB(gainLeg(1))+6.02);
    m.querySelector('#spec').innerHTML=`<table class="kv"><tr><th></th><th>Older manual</th><th>Current manual</th><th>Test 21 Oct 2013</th><th>Model (${D.build})</th></tr>
      <tr><td>Gain</td><td>+10 … +25 dB</td><td>+12 … +24 dB</td><td>“+12 … 24.5”</td><td class="mono">${gm} … ${gx} dB</td></tr>
      <tr><td>Max out</td><td>+28 dBu</td><td>+25 dBu</td><td>+25.5 dBu</td><td class="mono">${fdb(v2dbu(legLimit(1)/Math.SQRT2)+6.02+dB(D.load/(D.load+60)))} dBu (${D.load>=1e5?'open':D.load+' Ω'})</td></tr>
      <tr><td>Max in</td><td>+20 dBu</td><td>+10 dBu</td><td>+13 dBu</td><td class="mono">—</td></tr><tr><td>Power</td><td colspan="2">115 VAC/60 Hz 12 VA (230 V on request)</td><td></td><td class="mono">${B().psu}</td></tr></table>`; };
  SIM.on('time',draw);
}
function viewNotes(m){ window.__pod18Active=false;
  m.innerHTML=card('What the POD18 archive shows — findings',`<ol>
   <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src(ART_CDR, ART_CDR.split('/').pop())}</b> (file 2015-10-02, sheet dated Jun.25/14). The ink plates are drawn as vectors; the older PNG silks cut from ${SIM.src(ART_PDF, 'the PDF')} are on the toggle under the rear panel. The rear plate on the sheet is drawn 1.4 pt left of the front plates and its outline is drawn twice (x 114.3 pt and 114.33 pt, against 115.7 pt for the fronts); it was registered to the older PNG silk (3 px). Front OUTPUT ADJUST has four holes (L/R for OUTPUT 1 and 2) but only OUTPUT 1 R carries a drill crosshair on the art.</li>
   <li><b>The folder README has the direction backwards.</b> The README says “balanced inputs, unbalanced outputs”. Both manuals, the netlist (JK1 RCA → gain stage → NC3MD-H male XLRs) and the rear silk say <b>unbalanced in, balanced out</b>. The cover drawing in <span class="mono">POD 18 MANUAL.pdf</span> labels the right-hand pair “BALANCED INPUTS 1”, but the real silk reads “BALANCED OUTPUTS 1”.</li>
   <li><b>The regulator resistors in the parts lists cannot make ±18 V.</b> The ISS2 BOM and the strings in <span class="mono">POD18ISS3.sch</span> list only 221R parts (R5–R8) in the LM317/LM337 adjust networks. That gives 1.25 × (1 + 221/221) = 2.5 V, yet the nets are named +18V/−18V and the units measured +25.5 dBu. One resistor of each pair must be about 2K95 in the real build (${inf}). Try “Regulator resistors: as the parts lists say”.</li>
   <li><b>Two manuals, two specs.</b> <span class="mono">Older/pod18.pdf</span> gives +10 … +25 dB gain, +28 dBu max out and +20 dBu max in. The current manual gives +12 … +24 dB, +25 dBu and +10 dBu. The schematic values give ${fdb(dB(gainLeg(0))+6.02)} … ${fdb(dB(gainLeg(1))+6.02)} dB, which matches the older manual. +28 dBu needs rails of about ±18 V. +25 dBu is what the ±12 V SMT (RD64) board can do. So the current manual looks rewritten for the RD64 build (${inf}).</li>
   <li><b>Into 600 Ω the output current sets the limit (${inf}).</b> With ±18 V rails each leg could swing ±16.5 V. Into a 600 Ω load, each NE5532 drives 300 Ω + 30R. At a typical ~32 mA limit that is about ±10.6 V, i.e. +25.4 dBu — close to the +25.5 dBu the test measured.</li>
   <li><b>The test sheet's unbal→bal text is shared with POD1.</b> <span class="mono">POD18-21OCT13.pdf</span> and <span class="mono">POD1-04NOV13.pdf</span> have the same numbers word for word (+25.5 dBu, “+12dBu to 24.5dBu with -10 dB in”, 0.003 %, −87 dB). It writes the gain in dBu.</li>
   <li><b>The power LED colour differs between the netlist and the BOM.</b> The ISS2 netlist value is “GRN”, but the BOM line is Dialight <span class="mono">551-0405</span>, which is the red part. In the photo the LED is yellow-green.</li>
   <li><b>ISS2 → ISS3 power change.</b> The reservoir capacitors went from 2200 µF/25 V to 470 µF/40 V. Raw ripple goes up about 4.7 times, but the regulators remove it. The 40 V rating gives margin on high mains.</li>
   <li><b>The photographed unit is not the silk-file unit.</b> The silk PDF (Jun 25/14) says “115 VAC, 1/2 A.S.B.”. <span class="mono">Pics/POD18 REAR.jpg</span> shows “100-230 VAC, 50-60 Hz”, which is the universal-input label of the RD64 build.</li>
   <li><b>Consistent with the manual:</b> input impedance 47 kΩ (R14 47K5) and 60 Ω balanced output (2 × 30R 1 W).</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>T1 secondary about 2 × 17 VAC → 22.6 V raw; load current 40 mA; LM317 ripple rejection 65 dB; rails come up with a 10 ms time constant (all ${inf}).</li><li>NE5532 output current limit 32 mA; swing to rail − 1.5 V; hard clipping (${inf}).</li><li>The RD64 build uses POD1-3 values (R13 2K21, 68 µF, ±12 V).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD18 - #Engineering/MANUAL/POD 18 MANUAL.pdf · MANUAL/Older/pod18.pdf</li><li>POD18 - #Engineering/PCB/OBSOLETE/POD18ISS2.net · POD18iss2.bom · PCB/POD18ISS3.sch</li><li>POD18 - #TESTREPORT/POD18-21OCT13.pdf · ../POD1 - #Master/POD1 - #TESTREPORT/POD1-04NOV13.pdf</li><li>POD18 - #ARTWORK #DA #2016/POD18-FRONT&amp;REAR-SILK (CURVE).pdf · Pics/</li></ul>`); }

SIM.register({
  id:'pod18', name:'POD18 · quad audio interface, 4 × unbalanced → balanced (2013|46)', duration:1,
  product:'POD18', year:2013, family:'POD series', folder:'#POD #SERIES/POD18 - #Master',
  summary:'Half-rack four-channel interface. Each consumer RCA input becomes a balanced XLR output through an NE5532 gain stage and a unity inverter, with a front OUTPUT ADJUST trim per channel. The through-hole Issues 2/3 use a transformer and LM317/LM337 supply; it was later rebuilt on the RD64 SMT boards.',
  highlights:['Real silkscreen panels with four working trims and pluggable RCAs','Stage-by-stage levels, headroom and output-current limiting','Linear supply with 120 Hz ripple, ISS2 vs ISS3 capacitors','Regulator-resistor and manual/spec mismatches you can try'],
  depth:'Hardware model',
  stepUnits:[{label:'1 tone cycle',period:()=>1/D.gen.f},{label:'1 ripple cycle (120 Hz)',period:()=>1/120},{label:'1 mains cycle',period:()=>1/60},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1/30,'2 mains cycles'],[0.01,'10 ms'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:4,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: lining up a POD18',render:viewTutorial},{id:'second',label:'One second, cycle by cycle',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
