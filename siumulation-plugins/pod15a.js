/* =====================================================================
   POD15A — Analog video distribution amplifier with cable equaliser and clamp (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model of the POD15A issue 3 board.

   Sources used:
   - #POD #SERIES/POD  - #Engineering/pod15.pdf          (POD15 manual: 1×6 + front split, Hi-Z loop, specs)
   - #POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).pdf (panels, Jun 24 2014)
   - .../Pics/POD15A Front .jpg, POD15A Rear.jpg        (LED colours, connector positions)
   - .../POD15A - #Mechanical #DA #2016/POD15A-FRONT ISS 1 (PANEL).pdf, POD15A-REAR ISS 2 (PANEL) .pdf
   - XXX - POD15 - #Master #Obsolete/POD15 - #Engineering/PCB/pod15aiss3.net, POD15aiss3.bom (POD15A issue 3 netlist + BOM, 2009)
   - .../PCB/OBSOLETE/pod15aiss1.net                    (issue 1, 2004: TERM_SW, GS4982, linear supply)
   - Video timing: SMPTE 170M (NTSC) and ITU-R BT.470 (PAL) standard values (not archive files; general knowledge)
   Corrected 2026|59: the circuit now comes from the issue 3 netlist (see pod15.js); only the cable model, level range and clamp-out bounce are inferred.
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
/* Panel artwork 2026|59: CorelDRAW sheet converted with Inkscape (libcdr) → assets/pod15a-front.svg, -rear.svg
   (ink plates coloured green rgb(52,168,83) / white rgb(240,240,236), cut-outs as dark holes, drill crosshairs faint;
   registered to the older PDF PNG silks to ±1 px so every control keeps its place). The PNGs stay on a toggle. */
const ART = {cdr:true};
const ART_CDR = '#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr', ART_PDF = '#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).pdf';
function artNote(){ return `<div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART_CDR, ART_CDR.split('/').pop())} (CorelDRAW, default) · <label><input type="checkbox" class="pod15a-art" ${ART.cdr?'':'checked'}> show the older PNG silks cut from ${SIM.src(ART_PDF, 'the PDF')}</label></div>`; }
document.addEventListener('change', e=>{ if (e.target && e.target.classList && e.target.classList.contains('pod15a-art')){ ART.cdr = !e.target.checked; SIM.refresh(); } });
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

const PREFIX='pod15a';
const STD = {
  NTSC:{ name:'NTSC 525/59.94', line:1/15734.264, field:1001/60000, lines:525, fsc:3579545.45, sync:-0.286, white:0.714, burst:0.143, hs:4.7e-6, bp:4.7e-6, act0:10.9e-6 },
  PAL: { name:'PAL 625/50',     line:64e-6,        field:1/50,       lines:625, fsc:4433618.75, sync:-0.300, white:0.700, burst:0.150, hs:4.7e-6, bp:5.7e-6, act0:12.0e-6 },
};
const D = { power:true, powerAt:-1, std:'NTSC', pattern:'bars', cable:150, plugged:true, unplugAt:-1, term:'75', eqTrim:0.2, eq300:false, clamp:true, level:0.5, outs:['term','term','term','term','term','term','term'], log:[], patAt:-1 };
const FACT=JSON.parse(JSON.stringify(D));
const S=()=>STD[D.std];
/* ---------------- the composite signal ---------------- */
const BARS=[[0.75,0],[0.67,0.33],[0.53,0.45],[0.46,0.4],[0.29,0.4],[0.22,0.45],[0.08,0.33],[0,0]]; // luma, chroma amplitude (approx. 75 % bars, in units of white)
function apl(){ return D.pattern==='black'?0 : D.pattern==='white'?1 : D.pattern==='bars'?0.38 : (Math.floor(SIM.t*2)%2?1:0); }
function patternAt(tl, tAbs){ // tl = time within the line
  const s=S(); if (tl < s.hs) return {y:s.sync/s.white, c:0, ph:0};
  if (tl < s.hs+0.6e-6) return {y:0,c:0,ph:0};
  if (tl < s.hs+0.6e-6+2.5e-6) return {y:0, c:s.burst/s.white, ph:Math.PI};          // colour burst
  if (tl < s.act0 || tl > s.line-1.5e-6) return {y:0,c:0,ph:0};
  const x=(tl-s.act0)/(s.line-1.5e-6-s.act0);
  if (D.pattern==='bars'){ const b=BARS[Math.min(7,Math.floor(x*8))]; return {y:b[0], c:b[1], ph:Math.floor(x*8)*0.9}; }
  if (D.pattern==='black') return {y:0,c:0,ph:0}; if (D.pattern==='white') return {y:1,c:0,ph:0};
  return {y:(Math.floor((tAbs||0)*2)%2?1:0), c:0, ph:0};   // “bounce”: field alternates black/white every 0.5 s
}
/* ---------------- the circuit: POD15A issue 3 (XXX - POD15 - #Master #Obsolete/POD15 - #Engineering/PCB/pod15aiss3.net + POD15aiss3.bom) ----------------
   INPUT: differential receiver U1 (IN+ = BNC centre via R4, IN− = BNC shell via R5; C1 DNI / C2 0.1 µF return the shell to ground)
   VIDEO_IN → R12 47R5 → LVL 2K → R14 0R → CLAMP switch pin 2 (direct) / GB4571 U3 → R26 → pin 6 (clamped) → pin 4 → U4-3
   EQ: U4A (EQ 2K pot, CV1, C11 220p) = 0–300 m; EQ_FIXED switch adds U4B (RV1, CV2) = fixed 300 m
   Drivers: U6A → OUT1+OUT2, U5B → OUT3+OUT4, U5A → OUT5+OUT6, U6B → MONITOR, gain 2 (1K/1K) into 75R back-terminations
   Sync: LMH1981 U2 HSOUT → HSYNCH → CD4538 U7 (R52 100K, C35 0.1 µF, T = 10 ms): Q → Q2 → SYNCH, Q̄ → Q1 → ERROR
   U1, U4, U5, U6 are valued ISL5002IBZ on the EL2244-SO8 dual-op-amp footprint. */
const DRV = [['U6A',[0,1]],['U5B',[2,3]],['U5A',[4,5]],['U6B',[6]]];
const OUTN = ['OUT1','OUT2','OUT3','OUT4','OUT5','OUT6','MONITOR'];
const OUTR = ['R47','R46','R40','R39','R38','R37','R48'];
const T1 = 100e3*0.1e-6;                                            // CD4538: T = R52·C35 = 10 ms
// RG-59-class coax loss: about 3.1 dB per 100 m at 5 MHz, scaling with √f (inferred)
const lossDb = (f,len)=> 3.1*Math.sqrt(Math.max(f,1)/5e6)*len/100;
function eqLen(){ return D.eqTrim*300 + (D.eq300?300:0); }
function termGain(){ if(!D.plugged) return 0; return D.term==='open'?2 : D.term==='75'?1 : 2/3; }   // back-terminated source into the Hi-Z loop
function residualDb(f){ return lossDb(f,D.cable) - lossDb(f,eqLen()); }   // + = under-equalised, − = over-equalised (peaking)
function levelGain(){ return Math.pow(10,((D.level-0.5)*2*3)/20); }        // LVL 2K multiturn, range ±3 dB (inferred)
function syncAmp(){ return Math.abs(S().sync)*termGain()*Math.pow(10,-lossDb(0.5e6,D.cable)/20); }
/* CD4538 retriggerable one-shot: re-armed by every HSYNCH falling edge; Q stays high T after the last one */
function oneshotQ(t){ if(!D.power) return false; if(D.plugged && syncAmp()>0.08) return true;
  if(D.unplugAt<0) return false; return t>=D.unplugAt && t<D.unplugAt+T1; }
const synchOK = t => D.power && oneshotQ(t==null?SIM.t:t);
const errorOn = t => D.power && !oneshotQ(t==null?SIM.t:t);      // ERROR = Q̄: simply “no sync”; EQ and level are not measured
// stage waveforms at absolute time t (volts at a 75 Ω-terminated point); real order: U1 → LVL → CLAMP → EQ → drivers
function stage(which, t){
  const s=S(); const tl=((t%s.line)+s.line)%s.line, p=patternAt(tl,t);
  const sc = Math.sin(2*Math.PI*s.fsc*t + p.ph);
  let y=p.y*s.white, c=p.c*s.white;
  if (which==='src') return y + c*sc;
  if (!D.plugged || !D.power) return 0;
  const g=termGain(); y*=g; c*=g;
  const lc = Math.pow(10,-lossDb(s.fsc,D.cable)/20), ly=Math.pow(10,-lossDb(0.5e6,D.cable)/20);
  if (which==='in') return y*ly + c*lc*sc;                        // U1 out (VIDEO_IN), gain 1 (inferred)
  const Yl=y*ly*levelGain(), Cl=c*lc*levelGain();
  if (which==='lvl') return Yl+Cl*sc;
  // CLAMP OUT: the direct path is AC coupled → back porch moves with average picture level (bounce), τ ≈ 60 ms (inferred)
  let off=0; if (!D.clamp){ const a=apl()*s.white*0.6*g, since = D.pattern==='bounce' ? (t%0.5) : 1; off = -(a-0.25*g)*Math.exp(-since/0.06) - (a-0.25*g)*0.15; }
  if (which==='clamp') return Yl+Cl*sc+off;
  const v = Yl*Math.pow(10,lossDb(0.5e6,eqLen())/20) + Cl*Math.pow(10,lossDb(s.fsc,eqLen())/20)*sc + off;
  if (which==='eq') return v;
  return clamp(v,-0.9,1.6);   // terminated output (driver ×2 into 75R + 75 Ω load); swing limit inferred from the ±5 V rails
}
function outLevel(i){ const st=D.outs[i]; return st==='term'?1: st==='open'?2: 0; }
function outV(i,t){ return stage('out',t)*outLevel(i); }
function stageStats(){
  const s=S(), g=termGain(), base=g?20*Math.log10(g)-lossDb(0.5e6,D.cable):-200;
  return [
    {name:'Source (house black/bars, 75 Ω)', lvl:0, gain:null, clip:null, unit:'dB re 1 V p-p', note:'1 V p-p into 75 Ω'},
    {name:`Cable ${D.cable} m + loop ${!D.plugged?'(UNPLUGGED)':D.term==='75'?'terminated':D.term==='open'?'UNTERMINATED':'DOUBLE-terminated'}`, lvl:base, gain:g?base:null, clip:null, unit:'dB', note:`chroma at ${(s.fsc/1e6).toFixed(2)} MHz: ${fdb(-lossDb(s.fsc,D.cable))} dB (${inf})`},
    {name:'U1 differential receiver (IN+ centre / IN− shell)', lvl:base, gain:0, clip:6, unit:'dB', note:'ISL5002 on the EL2244-SO8 footprint; shield hum cancels'},
    {name:'LEVEL (R12 → LVL 2K → R14)', lvl:g?base+20*Math.log10(levelGain()):-200, gain:20*Math.log10(levelGain()), clip:null, unit:'dB', note:`range ±3 dB (${inf})`},
    {name:`CLAMP ${D.clamp?'IN → GB4571 U3 (BPOUT clamp pulse)':'OUT → direct (AC coupled)'}`, lvl:g?base+20*Math.log10(levelGain()):-200, gain:0, clip:null, unit:'dB', note: D.clamp?'blanking pulled to a fixed DC level every line':'blanking level moves with picture content (APL bounce)'},
    {name:`EQUALIZER ${Math.round(eqLen())} m (U4A trim ${Math.round(D.eqTrim*300)} m${D.eq300?' + U4B fixed 300 m':''})`, lvl:g?20*Math.log10(g*levelGain())-residualDb(s.fsc):-200, gain:lossDb(s.fsc,eqLen()), clip:null, unit:'dB', note:`residual at ${(s.fsc/1e6).toFixed(2)} MHz ${fdb(-residualDb(s.fsc))} dB ${residualDb(s.fsc)<-0.5?'(over-equalised: peaking)':residualDb(s.fsc)>0.5?'(under-equalised: soft, low chroma)':'(flat)'}`},
    {name:'R36/R42 pad → 4 driver halves ×2 → 75R → 7 outputs', lvl:g?20*Math.log10(g*levelGain())-residualDb(s.fsc):-200, gain:0, clip:4, unit:'dB', note:'outputs driven in pairs; 1 V p-p at each terminated output'},
  ];
}
/* ---------------- actions (each logs the circuit path) ---------------- */
const act=makeActor(D, ()=>`SYNCH ${synchOK()?'on':'off'} · ERROR ${errorOn()?'on':'off'} · residual ${fdb(-residualDb(S().fsc))} dB`);
const A={
  power(){ act(D.power?'Power off (PWRSW)':'Power on (PWRSW)', tr=>{ D.power=!D.power; if(D.power) D.powerAt=SIM.t;
    tr('ACIN (PAN356) → PWRSW (PAN256) → PSU VAF1005 (+5 V) → FB1 → REG1 SUS1R5-0505 (−5 V)');
    tr(D.power?'+5 V up → PWRLED via R54 (511R); U7 CD4538 starts with Q low → ERROR lit until the first HSYNCH edge':'All drivers lose their rails: every output goes to 0 V (no sync downstream)'); }); },
  plug(){ act(D.plugged?'Unplug the input cable':'Plug the input cable back in', tr=>{ D.plugged=!D.plugged; D.unplugAt = D.plugged?-1:SIM.t;
    tr(D.plugged?'IN+ / IN− carry video again → LMH1981 U2 HSOUT (pin 7, net HSYNCH) toggles every line → U7-5 retriggers the one-shot':`HSYNCH stops. U7 Q (pin 6) stays high for T = R52·C35 = ${SIM.fmtDur(T1)}, then drops: Q2 off (SYNCH dark), Q̄ (pin 7) → R56 → Q1 on → ERROR lit`); }); },
  eqTrim(dir){ act(`Turn EQUALIZER 0–300m ${dir>0?'CW':'CCW'}`, tr=>{ D.eqTrim=clamp(+(D.eqTrim+dir*0.04).toFixed(3),0,1); tr(`EQ pot (2K multiturn, wiper with CV1, C11 220p, R18, R19) sets U4A's high-frequency gain → ${Math.round(eqLen())} m equalised vs ${D.cable} m cable → residual ${fdb(-residualDb(S().fsc))} dB at the subcarrier (${inf}: cable model)`); }); },
  eq300(){ act(`300m switch → ${D.eq300?'out':'in'}`, tr=>{ D.eq300=!D.eq300; tr(`EQ_FIXED (PHA-2UEE): pin 1 = U4A out, pin 5 = U4B out, pin 3 → R36 → drivers. ${D.eq300?'U4B (RV1 2K, CV2) adds the fixed 300 m section (silk “600m TOTAL”)':'U4B bypassed'} → EQ ${Math.round(eqLen())} m`); }); },
  clamp(){ act(`CLAMP → ${D.clamp?'OUT':'IN'}`, tr=>{ D.clamp=!D.clamp; tr(D.clamp?'CLAMP pin 4 ← pin 6: signal via C52/C53 into GB4571 U3-2, clamp pulse BPOUT (LMH1981 pin 13) on U3-4, output U3-7 → R26 → U4-3':'CLAMP pin 4 ← pin 2: the LVL wiper feeds U4 directly (AC path, no DC restore; try the “bounce” pattern)'); }); },
  level(dir){ act(`Turn LEVEL ${dir>0?'CW':'CCW'}`, tr=>{ D.level=clamp(+(D.level+dir*0.04).toFixed(3),0,1); tr(`VIDEO_IN → R12 (47R5) → LVL (2K) → wiper → R14 (0R) → CLAMP switch. Gain ${fdb(20*Math.log10(levelGain()),2)} dB (range ±3 dB ${inf})`); }); },
  term(){ act('Loop-through termination → '+({'75':'open (unterminated)','open':'double (two 75 Ω)','double':'75 Ω'})[D.term], tr=>{ D.term=({'75':'open','open':'double','double':'75'})[D.term];
    tr(D.term==='75'?'Correct: the Hi-Z input bridges the line and the far loop BNC carries the 75 Ω terminator → 1 V p-p':D.term==='open'?'No terminator: the back-terminated source sees an open line → 2 V p-p. Issue 3 has no on-board TERM_SW (issue 1 had one), so the terminator must be external':'Terminated twice (e.g. a terminator plus a 75 Ω monitor) → 0.67 V p-p'); }); },
  out(i){ act(`${OUTN[i]} → ${({term:'open',open:'short',short:'75 Ω load'})[D.outs[i]]}`, tr=>{ D.outs[i]=({term:'open',open:'short',short:'term'})[D.outs[i]];
    const d=DRV.find(x=>x[1].includes(i)), mate=d[1].filter(k=>k!==i);
    tr(`${OUTN[i]} is fed by ${d[0]} through ${OUTR[i]} (75R)${mate.length?' — the same amplifier half also drives '+OUTN[mate[0]]:''}`);
    tr(D.outs[i]==='open'?'Unloaded: the BNC shows 2 V p-p (no divider)':D.outs[i]==='short'?`Shorted: ${OUTN[i]} reads 0 V; ${d[0]} now sources about 27 mA peak into 75R — ${mate.length?OUTN[mate[0]]+' keeps its level because its own 75R isolates it ('+inf+')':'only the monitor is affected'}`:'1 V p-p into 75 Ω'); }); },
  set(k,v,l){ act(l, tr=>{ D[k]=v; if(k==='pattern') D.patAt=SIM.t; tr(k==='cable'?`Cable loss ${fdb(-lossDb(S().fsc,v))} dB at the subcarrier, ${fdb(-lossDb(0.5e6,v))} dB at 0.5 MHz (${inf})`:'Source changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels (POD15A-FRONT&REAR-SILK (CURVE).pdf) ---------------- */
function frontSVG(){ const on=D.power;
  let over=rocker(on)+pled(on)+led(739,218,synchOK(),'var(--led-g)')+led(790,218,errorOn(),'#ff4a3a')
   + trim(939,220,D.eqTrim,'eqt','EQUALIZER 0–300m (EQ, 2K multiturn)')
   + `<g class="eq3" style="cursor:pointer"><title>300m switch EQ_FIXED (${D.eq300?'IN':'OUT'}) — click</title><circle cx="1040" cy="217" r="28" fill="#0a0b0c" stroke="#3a3d40" stroke-width="3"/><circle cx="1040" cy="${D.eq300?224:212}" r="18" fill="${D.eq300?'#2a2d31':'#16181a'}"/></g>`
   + `<g class="clp" style="cursor:pointer"><title>CLAMP push switch (${D.clamp?'IN':'OUT'}) — click</title><circle cx="1239" cy="217" r="28" fill="#0a0b0c" stroke="#3a3d40" stroke-width="3"/><circle cx="1239" cy="${D.clamp?224:212}" r="18" fill="${D.clamp?'#2a2d31':'#16181a'}"/></g>`
   + trim(1390,220,D.level,'lvt','LEVEL (LVL, 2K multiturn)') + bnc(1552,152,D.outs[6]!=='open','mo6',`VIDEO MONITOR (U6B → R48; ${D.outs[6]}) — click to change the load`,44)
   + (D.outs[6]==='short'?`<text x="1552" y="159" text-anchor="middle" font-size="22" fill="#ff6b5a" font-weight="700">✕</text>`:'');
  return panelSVG(PREFIX,'front',{over},'POD15A front panel (real silkscreen)'); }
function rearSVG(){
  let over=bnc(273,64,D.plugged,'plg',`INPUT (IN+ centre, IN− shell) — ${D.plugged?'cable from the source (click to unplug)':'nothing connected (click to plug in)'}`,44)
   + bnc(273,200,D.term!=='open','tm',`INPUT loop: ${D.term==='75'?'75 Ω terminator':D.term==='open'?'nothing (unterminated!)':'two 75 Ω loads'} — click to change`,44)
   + [[482,70],[586,200],[693,70],[796,200],[902,70],[1007,200]].map(([x,y],i)=>bnc(x,y,D.outs[i]!=='open','oo" data-o="'+i,`OUT ${i+1} (${DRV.find(d=>d[1].includes(i))[0]} → ${OUTR[i]}): ${D.outs[i]} — click: 75 Ω load → open → short`,42)+(D.outs[i]==='short'?`<text x="${x}" y="${y+7}" text-anchor="middle" font-size="22" fill="#ff6b5a" font-weight="700">✕</text>`:'')).join('') + iec(1372,26,1600,250);
  return panelSVG(PREFIX,'rear',{over},'POD15A rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); bindTrim(root,'eqt',d=>A.eqTrim(d)); bindTrim(root,'lvt',d=>A.level(d));
  root.querySelectorAll('.eq3').forEach(g=>g.onclick=()=>A.eq300()); root.querySelectorAll('.clp').forEach(g=>g.onclick=()=>A.clamp()); root.querySelectorAll('.tm').forEach(g=>g.onclick=()=>A.term());
  root.querySelectorAll('.plg').forEach(g=>g.onclick=()=>A.plug()); root.querySelectorAll('.oo').forEach(g=>g.onclick=()=>A.out(+g.dataset.o)); root.querySelectorAll('.mo6').forEach(g=>g.onclick=()=>A.out(6)); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Standard <select id="sd">${Object.keys(STD).map(k=>`<option ${k===D.std?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>Pattern <select id="pt">${[['bars','75 % colour bars'],['black','black burst'],['white','white field'],['bounce','bounce (black/white every 0.5 s)']].map(([v,l])=>`<option value="${v}" ${v===D.pattern?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Input cable <input id="cb" type="number" step="25" min="0" value="${D.cable}" style="width:64px"> m</label></div>
  <div class="small muted">Front: EQUALIZER trim and 300m switch, CLAMP switch, LEVEL trim (click a trim's left or right half, or use the wheel). Rear: upper INPUT BNC unplugs the cable (watch the 10 ms one-shot), lower one changes the loop termination, an OUT BNC loads/opens/shorts it. Keys: Q/W EQ, E 300m, C clamp, A/S level, U unplug.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if(!g('#sd')) return; g('#sd').onchange=e=>A.set('std',e.target.value,'Standard → '+e.target.value); g('#pt').onchange=e=>A.set('pattern',e.target.value,'Test pattern → '+e.target.selectedOptions[0].text); g('#cb').onchange=e=>A.set('cable',Math.max(0,+e.target.value),'Input cable → '+e.target.value+' m'); }
bindKeys('__pod15aActive', ()=>({q:()=>A.eqTrim(-1),w:()=>A.eqTrim(1),e:()=>A.eq300(),c:()=>A.clamp(),a:()=>A.level(-1),s:()=>A.level(1),u:()=>A.plug()}));
/* ---------------- timeline ---------------- */
function vLane(label, fn, color){ return { label, h:44, draw(c,X,t0,t1,y,h){ const span=t1-t0, s=S(), Y=v=>y+h-6-(v+0.5)/2.6*(h-10);
  if (span > 6*s.line){ // too long to draw: per-line envelope (sync tip … peak)
    c.fillStyle=color; c.globalAlpha=.3; const N=Math.min(400,X(t1)-X(t0));
    for(let i=0;i<N;i++){ const tt=t0+span*i/N, L=Math.floor(tt/s.line)*s.line, top=fn(L+s.act0+(s.line-s.act0)*0.1), bot=fn(L+1e-6); if(Math.abs(top)+Math.abs(bot)<1e-4) continue; c.fillRect(X(tt),Y(Math.max(top,bot,0.7)),Math.max(1,(X(t1)-X(t0))/N),Math.abs(Y(bot)-Y(Math.max(top,bot,0.7)))+1); }
    c.globalAlpha=1; c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(`${Math.round(span/s.line).toLocaleString()} lines — zoom to 64 µs to see one`, X(t0)+6, y+12); return; }
  c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),Y(0)); c.lineTo(X(t1),Y(0)); c.stroke();
  const N=Math.min(3000, Math.max(400,(X(t1)-X(t0))*3)); c.strokeStyle=color; c.lineWidth=1; c.beginPath();
  for (let i=0;i<=N;i++){ const tt=t0+span*i/N, v=fn(tt); i?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); } c.stroke(); }}; }
function lanes(){ const s=S(), a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn');
  return [
    {label:`Fields (${(1/s.field).toFixed(2)} Hz)`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,s.field,0,3*s.line,b,'fields'); }},
    {label:'HSYNCH (U2-7 → U7-5)', h:20, draw(c,X,t0,t1,y,h){ if(!D.power) return; const end = D.plugged?t1:Math.min(t1,D.unplugAt); if(end<=t0){ c.fillStyle=SIM.css('--bad'); c.font='11px sans-serif'; c.fillText('no H sync',X(t0)+6,y+14); return; } SIM.pulses(c,X,t0,end,y,h,s.line,0,s.hs,SIM.css('--ink2'),'H sync'); }},
    {label:'BPOUT clamp pulse (U2-13)', h:20, draw(c,X,t0,t1,y,h){ if(!D.clamp||!D.power){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText(D.clamp?'':'CLAMP OUT — U3 bypassed', X(t0)+6, y+14); return; } const end=D.plugged?t1:Math.min(t1,D.unplugAt); if(end>t0) SIM.pulses(c,X,t0,end,y,h,s.line,s.hs+0.6e-6,2.5e-6,wn,'back porch'); }},
    boolLane(`U7 CD4538 Q (T = ${SIM.fmtDur(T1)})`, t=>oneshotQ(t), b),
    vLane('Source (75 Ω)', t=>stage('src',t), SIM.css('--ink2')), vLane(`U1 out after ${D.cable} m`, t=>stage('in',t), b), vLane(`after CLAMP ${D.clamp?'IN':'OUT'}`, t=>stage('clamp',t), a), vLane(`after EQUALIZER ${Math.round(eqLen())} m`, t=>stage('eq',t), a), vLane('OUT 1 (as loaded)', t=>outV(0,t), a),
    boolLane('SYNCH LED (Q2, green)', t=>synchOK(t), '#3fbf5f'), boolLane('ERROR LED (Q1, red) = no sync', t=>errorOn(t), '#e3453a'),
  ]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__pod15aActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel',`<div id="fp"></div>${controlsHTML()}`)}${card('Rear panel — click the BNCs (input, loop termination, outputs)',`<div id="rp"></div>${artNote()}`)}</div>
   <div>${card('What the circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('Signal now',`<div id="now"></div>`)}</div></div>
   ${card('Timeline — one second, zoomable. Choose “1 line” to see sync, burst and bars; unplug the input and zoom to 10 ms to watch the CD4538 time out.',`<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Stage by stage',`<div id="lv"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Turn the EQUALIZER, push CLAMP, unplug the input or short an output.');
    const s=S(), pk=i=>{ let mx=-9,mn=9; const L=Math.floor(SIM.t/s.line)*s.line; for(let k=0;k<300;k++){ const v=outV(i,L+s.line*k/300); mx=Math.max(mx,v); mn=Math.min(mn,v);} return mx-mn; };
    m.querySelector('#now').innerHTML=`<table class="kv"><tr><th>Standard</th><td>${s.name}</td></tr><tr><th>Input amplitude</th><td class="mono">${D.plugged?`sync ${(syncAmp()*1000).toFixed(0)} mV (nominal ${Math.abs(s.sync)*1000} mV)`:'unplugged'}</td></tr>
      <tr><th>Cable vs EQ</th><td class="mono">${D.cable} m vs ${Math.round(eqLen())} m → ${fdb(-residualDb(s.fsc))} dB at ${(s.fsc/1e6).toFixed(2)} MHz</td></tr><tr><th>Clamp</th><td>${D.clamp?'IN (GB4571)':'OUT (direct)'}</td></tr><tr><th>LEDs</th><td>SYNCH ${synchOK()?'●':'○'} · ERROR ${errorOn()?'<b style="color:var(--bad)">●</b>':'○'} <span class="small muted">(ERROR = no sync only)</span></td></tr></table>
      <table class="kv small"><tr><th>Output</th><th>Driver</th><th>Load</th><th>p-p now</th></tr>${OUTN.map((n,i)=>`<tr><td>${n}</td><td class="mono">${DRV.find(d=>d[1].includes(i))[0]} → ${OUTR[i]}</td><td>${D.outs[i]}</td><td class="mono">${pk(i).toFixed(2)} V</td></tr>`).join('')}</table>`;
    m.querySelector('#lv').innerHTML=stageTable(stageStats(),'dB'); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200}); };
  bindControls(m); SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD15A', body:`<p>The POD15 manual: “a one by six video distribution amplifier with level trim and a seventh output split on the front panel … The input is a high impedance looping input while the outputs are 75 ohm.” The POD15A front adds <b>SYNCH</b> and <b>ERROR</b> tallies, a cable <b>EQUALIZER</b> (0–300 m trim plus a 300 m switch, “600m TOTAL”), a <b>CLAMP</b> in/out switch, a <b>LEVEL</b> trim and a <b>VIDEO MONITOR</b> BNC. The circuit used here is the real POD15A issue 3 netlist.</p>`, check:()=>true, auto:true},
  {title:'1 · Terminate the loop', body:`<p>A looping input has two BNCs. The signal goes in on one, and the other must carry a <b>75 Ω terminator</b> (or feed on to the next device). Issue 3 has no on-board terminator switch, so this matters. Click the lower rear INPUT BNC to see what happens when it is left open (2 V p-p) or terminated twice. Leave it on 75 Ω.</p>`, check:()=>D.term==='75'&&D.log.some(e=>e.name.startsWith('Loop-through')), hint:'Click the lower INPUT BNC on the rear until it shows 75 Ω again.'},
  {title:'2 · Equalise the cable', body:`<p>The source is 150 m away. Long coax loses high frequencies, so colour (the subcarrier) is weaker than sync. Zoom the timeline to <b>1 line</b> and compare “U1 out after 150 m” with “after EQUALIZER”. Turn the <b>EQUALIZER</b> trim until the residual is within ±0.5 dB.</p>`, check:()=>Math.abs(residualDb(S().fsc))<0.5&&D.cable===150, hint:'Q/W keys; watch the “Cable vs EQ” row.'},
  {title:'3 · A really long run', body:`<p>Set the cable to <b>450 m</b>. The trim alone reaches 300 m, so push the <b>300m</b> switch in (EQ_FIXED switches U4B into the path) and trim the rest (300 + 150).</p>`, check:()=>D.cable===450&&D.eq300&&Math.abs(residualDb(S().fsc))<0.5, hint:'Cable 450; E key for the 300 m switch; then trim.'},
  {title:'4 · Why the clamp is there', body:`<p>Choose the <b>bounce</b> pattern (the picture alternates black and white every half second) and push <b>CLAMP</b> out. The blanking level jumps with the picture content, because the direct path is AC-coupled. Push CLAMP back in: the GB4571 restores the back porch on every line.</p>`, check:()=>D.pattern==='bounce'&&D.clamp&&D.log.some(e=>e.name==='CLAMP → OUT'), hint:'Pattern → bounce, press C twice.'},
  {title:'5 · Lose the input', body:`<p>Click the upper rear INPUT BNC to unplug the source. SYNCH does not go out at once: the CD4538 one-shot (U7) holds Q high for T = R52·C35 = 100 kΩ × 0.1 µF = 10 ms after the last H-sync edge, then ERROR lights. ERROR means only “no sync”: a bad EQ or level does not light it. Plug it back in afterwards.</p>`, check:()=>D.log.some(e=>e.name==='Unplug the input cable')&&D.plugged, hint:'Click the upper INPUT BNC twice (or press U twice).'},
  {title:'6 · Outputs come in pairs', body:`<p>Short <b>OUT 1</b> (click it twice). OUT 1 and OUT 2 share amplifier half U6A, but each has its own 75R, so OUT 2 keeps its level. Then set the <b>LEVEL</b> trim for exactly 0 dB in the LEVEL row.</p>`, check:()=>D.outs[0]==='short'&&Math.abs(20*Math.log10(levelGain()))<0.2, hint:'Click OUT 1 twice; A/S keys for LEVEL.'},
  {title:'Done', body:`<p>Restore OUT 1 (click once more). See <b>Findings</b> for what the netlists show, and where they are archived.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod15aActive=true; tutorialView(m,{title:'Tutorial — installing a POD15A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${stageTable(stageStats(),'dB')}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod15aActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('At the playhead',`<div id="dev"></div>`)}${card('What a monitor on OUT 1 shows (one line, as a waveform monitor)',`<canvas id="wfm"></canvas>`)}</div>`;
  const draw=()=>{ const s=S(), t=SIM.t;
    const rows=[['Fields',(1/s.field).toFixed(3),SIM.fmtDur(s.field),'ignored: the board has no vertical processing'],['Lines / HSYNCH edges',(1/s.line).toFixed(1),SIM.fmtDur(s.line),`each falling edge retriggers U7 (T = ${SIM.fmtDur(T1)}, so ${Math.round(T1/s.line)} missing lines in a row before ERROR)`],['Colour subcarrier cycles',s.fsc.toLocaleString(),SIM.fmtDur(1/s.fsc),'the EQ is judged at this frequency'],
      ['BPOUT clamp pulses',D.clamp?(1/s.line).toFixed(1):'0',SIM.fmtDur(s.line),'LMH1981 pin 13 → GB4571 pin 4: the clamp samples the back porch'],['Burst cycles per line','≈ 9','2.5 µs','passes through untouched']];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>what the board does with it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const tl=((t%s.line)+s.line)%s.line; m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>Field / line</th><td class="mono">${Math.floor(t/s.field)} / ${Math.floor((t%s.field)/s.line)+1}</td></tr><tr><th>Within the line</th><td class="mono">${(tl*1e6).toFixed(2)} µs ${tl<s.hs?'(H sync)':tl<s.act0?'(back porch / burst)':'(active picture)'}</td></tr>
      ${['src','in','lvl','clamp','eq','out'].map(k=>`<tr><th>${k}</th><td class="mono">${stage(k,t).toFixed(3)} V</td></tr>`).join('')}<tr><th>U7 Q</th><td>${oneshotQ(t)?'high (SYNCH)':'low (ERROR)'}</td></tr></table>`;
    const {c,w}=SIM.canvas(m.querySelector('#wfm'),220); c.fillStyle='#071007'; c.fillRect(0,0,w,220); c.strokeStyle='rgba(120,255,120,.25)';
    [-0.3,0,0.35,0.7,1].forEach(v=>{ const y=180-(v+0.4)*130; c.beginPath(); c.moveTo(30,y); c.lineTo(w-10,y); c.stroke(); c.fillStyle='rgba(150,255,150,.6)'; c.font='10px sans-serif'; c.fillText(v.toFixed(2)+' V',2,y+3); });
    c.strokeStyle='#8f8'; c.beginPath(); const L0=Math.floor(t/s.line)*s.line; for(let i=0;i<=1200;i++){ const tt=L0+s.line*i/1200, v=outV(0,tt), y=180-(v+0.4)*130; i?c.lineTo(30+(w-40)*i/1200,y):c.moveTo(30,y);} c.stroke(); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:15,y:20,w:170,h:84,t:'INPUT (looping)',s:['IN+ = centre, IN− = shell','U1 diff. receiver'],d:'U1A buffers IN− (via R5, R6 to ground) and U1B subtracts it from IN+ (via R4): hum on the cable shield cancels. Output net VIDEO_IN. Issue 3 has no on-board terminator (issue 1 had TERM_SW).'},
  lvl:{x:205,y:20,w:150,h:84,t:'LEVEL',s:['R12 → LVL 2K → R14','±3 dB (inferred)'],d:'The LVL multiturn pot sits right after the receiver, before the clamp and the EQ.'},
  sep:{x:205,y:140,w:150,h:90,t:'Sync separator',s:['LMH1981 (U2)','HSOUT, BPOUT used'],d:'Fed from VIDEO_IN through C4. HSOUT → HSYNCH net (one-shot), BPOUT → clamp pulse. CSOUT, VSOUT, FSOUT, OEOUT are unused.'},
  cl:{x:375,y:20,w:150,h:84,t:'CLAMP',s:['GB4571 DC restorer','PHA-2UEE switch'],d:'In: signal through C52/C53 to U3-2, clamp pulse on U3-4, output U3-7 → R26. Out: the switch takes the direct path from the LVL wiper.'},
  eq:{x:545,y:20,w:160,h:84,t:'EQUALIZER',s:['U4A: 0–300 m pot','U4B: fixed 300 m'],d:'Frequency-dependent gain in U4A’s feedback leg (EQ pot, CV1, 220p). EQ_FIXED (the 300m switch) selects U4A alone or U4A→U4B.'},
  drv:{x:545,y:140,w:160,h:90,t:'4 drivers ×2',s:['R36/R42 pad in','U5, U6 dual amps'],d:'Each amplifier half has 1K/1K feedback (gain 2) and drives one or two 75R back-terminations. ISL5002 values on EL2244-SO8 footprints.'},
  out:{x:375,y:250,w:330,h:70,t:'OUT1–6 + VIDEO MONITOR',s:['U6A:1,2 · U5B:3,4 · U5A:5,6 · U6B:MON'],d:'Outputs are driven in pairs: each pair shares an amplifier half; the front VIDEO MONITOR has its own.'},
  led:{x:15,y:150,w:170,h:84,t:'CD4538 one-shot',s:['T = R52·C35 = 10 ms','Q → SYNCH, Q̄ → ERROR'],d:'Retriggered by each H sync. Q drives Q2 (SYNCH LED), Q̄ drives Q1 (ERROR LED): ERROR means “no sync” and nothing else. The second half of U7 is unused.'},
  psu:{x:15,y:258,w:170,h:62,t:'Power',s:['VAF1005 + SUS1R5-0505'],d:'Issue 3: AC → VAF1005 (+5 V) → FB1 → SUS1R5-0505 (−5 V).'},
};
const WIRES=[['in','lvl',''],['lvl','cl',''],['cl','eq',''],['eq','drv',''],['drv','out','×7'],['in','sep','C4'],['sep','cl','BPOUT'],['sep','led','HSYNCH']];
function viewBlock(m){ window.__pod15aActive=false; blockView(m,BLOCKS,WIRES,'led',[720,330],card('In one sentence',`<p>A differential bridging input, a level trim, a switchable back-porch clamp, a two-section cable equaliser and four ×2 driver halves feeding seven 75 Ω outputs in pairs; a sync separator and a 10 ms one-shot light SYNCH or ERROR. Redrawn from <span class="mono">pod15aiss3.net</span> (archived in the obsolete POD15 folder).</p>`)); }
const SHEETS=[
  {name:'1 · Input, level, sync', note:'Redrawn from pod15aiss3.net (P-CAD netlist, Oct 2009, in XXX - POD15 - #Master #Obsolete/POD15 - #Engineering/PCB). Values from POD15aiss3.bom where listed.', svg:()=>
    net(20,100,'INPUT-1 (IN+)')+net(20,160,'INPUT-2 (IN−, shell)')+res(110,100,190,100,'R4','33R2')+res(110,160,190,160,'R5','33R2')+cap(150,160,150,220,'C2','0.1')+gnd(150,220)
    +opamp(230,112,'U1B (pins 5,6,7)')+wire([[190,100],[205,100],[205,124],[230,124]])+opamp(230,200,'U1A (pins 1,2,3)')+wire([[190,160],[200,160],[200,212],[230,212]])
    +wire([[290,200],[310,200],[310,90],[230,90],[230,100]])+txt(312,150,'R9/R10',10,'var(--ink2)')+wire([[290,112],[350,112]])+net(300,128,'VIDEO_IN')
    +res(350,112,420,112,'R12','47R5')+txt(430,80,'LVL 2K (CW)',11)+res(470,112,470,180,'LVL','2K')+res(470,180,470,240,'R13','180R')+gnd(470,240)+wire([[420,112],[470,112]])+net(480,150,'wiper → R14 (0R) → CLAMP-2')
    +cap(350,112,350,280,'C4','')+chip(600,250,150,'U2 LMH1981',[['4 VIN','C4'],['1 RSET','R17 10K'],['3 VCC','+5V']],[['7 HSOUT','HSYNCH'],['13 BPOUT','BPOUT'],['12 CSOUT','—'],['8 VSOUT','—'],['14 OEOUT','—']],'sync separator')+wire([[350,280],[566,280]])
    +txt(20,440,'U1 is valued ISL5002IBZ but placed on the EL2244-SO8 (dual op-amp) footprint; both halves are used.',10.5,'var(--ink2)')},
  {name:'2 · Clamp and equaliser', note:'CLAMP and EQ_FIXED are PHA-2UEE push switches; pin numbers as in the netlist.', svg:()=>
    net(20,80,'LVL wiper (NET00047)')+cap(150,80,210,80,'C52','')+cap(210,80,270,80,'C53','')+chip(300,60,140,'U3 GB4571',[['2 IN','C53'],['4 CLAMP','BPOUT'],['1 HOLD','C12 1nF']],[['7 OUT','R26 33R2'],['8 VCC','+5V'],['6 VEE','−5V']],'DC restorer')
    +chip(560,60,140,'CLAMP (SW)',[['2','direct'],['6','clamped (R26)']],[['4 common','U4-3'],['1','+5V']],'PHA-2UEE')
    +opamp(160,300,'U4A EQ')+txt(110,350,'feedback: R23 1K1, R22 3K57 to GND, R20 → EQ pot (2K) → R16 30R',10,'var(--ink2)')+txt(110,365,'wiper: CV1 trimcap, C11 220p, R18, R19, R21 3K32',10,'var(--ink2)')
    +opamp(330,300,'U4B fixed 300 m')+txt(300,395,'R30 1K1, R29 3K57, RV1 2K, CV2, R45/C31, R50/C32',10,'var(--ink2)')+wire([[220,300],[300,300],[300,312],[330,312]])
    +chip(560,250,150,'EQ_FIXED (SW)',[['1','U4A out'],['5','U4B out']],[['3 common','R36 75R → drivers']],'PHA-2UEE')},
  {name:'3 · Drivers and tallies', note:'Four amplifier halves, gain 2 (all feedback pairs are 1K/1K in the BOM), 75R back-terminations; outputs in pairs.', svg:()=>
    [['U6A',['OUT1 ← R47','OUT2 ← R46'],60],['U5B',['OUT3 ← R40','OUT4 ← R39'],150],['U5A',['OUT5 ← R38','OUT6 ← R37'],240],['U6B',['MONITOR ← R48'],330]].map(([u,o,y])=>opamp(140,y,u+' ×2')+wire([[200,y],[260,y]])+o.map((t,k)=>res(260,y-10+k*22,330,y-10+k*22,'','')+net(340,y-10+k*22,t)).join('')).join('')
    +net(20,200,'NET00018 (R36/R42)')+chip(520,80,150,'U7 CD4538',[['5 −TR (B1)','HSYNCH'],['4 +TR (A1)','GND'],['2 RXCX1','R52 100K, C35 0.1']],[['6 Q1','R55 → Q2 → SYNCH'],['7 Q̄1','R56 → Q1 → ERROR'],['3 RESET','+5V']],'retriggerable one-shot')
    +txt(520,330,'T = R·C = 100 kΩ × 0.1 µF = 10 ms',12)+txt(520,350,'LEDs: anodes to +5 V, cathodes via R53 / R49 to Q2 / Q1 collectors',10.5,'var(--ink2)')},
  {name:'4 · Power', note:'Issue 3: pod15aiss3.net.', svg:()=>
    chip(60,80,150,'ACIN PAN356',[['1','GNDD'],['2','PSU-2'],['3','PWRSW-2']],[],'IEC inlet')+chip(300,80,150,'PSU VAF1005',[['1','PWRSW-1'],['2','ACIN-2']],[['5','+5V'],['3,4','GNDD']],'AC → +5 V')
    +chip(560,80,160,'REG1 SUS1R5-0505',[['1','FB1 / +5V']],[['5','−5V'],['2,3','GNDD']],'DC-DC')
    +txt(60,300,'Issue 1 (OBSOLETE/pod15aiss1.net, 2004): TE70042 toroid → 1N4003 bridge → LM317 / LM337, plus TERM_SW and a GS4982 separator.',11.5)
    +txt(60,322,'PWRLED: +5 V → R54 (511R) → LED.',11.5)},
];
function viewSchem(m){ window.__pod15aActive=false; schemView(m,SHEETS,'POD15A iss 3','Redrawn from the POD15A issue 3 P-CAD netlist and BOM (archived in the obsolete POD15 folder, not in the POD15A folder); pin and net names are real, layout is not the original CAD.'); }
function viewSoft(m){ window.__pod15aActive=true; let hot=4;
  m.innerHTML=`${card('No firmware — the video path, stage by stage (click a stage)',`<div id="f"></div><div id="det" class="card"></div>`)}<div class="grid2">${card('Cable loss and EQ vs frequency (live)',`<canvas id="fr"></canvas>`)}${card('SYNCH/ERROR state machine (CD4538 U7, half A)',`<div id="sm"></div>`)}</div>`;
  const draw=()=>{ const s=S(); const st=[{t:'INPUT',s:['IN+/IN− diff','U1']},{t:`Cable ${D.cable} m`,s:[fdb(-lossDb(s.fsc,D.cable))+' dB @ fsc']},{t:'LEVEL',s:[fdb(20*Math.log10(levelGain()),2)+' dB']},{t:`CLAMP ${D.clamp?'IN':'OUT'}`,s:[D.clamp?'GB4571':'direct']},{t:`EQ ${Math.round(eqLen())} m`,s:[fdb(-residualDb(s.fsc))+' dB left'],bad:Math.abs(residualDb(s.fsc))>3},{t:'Drivers',s:['×2 → 75R','4 halves, pairs']},{t:'Tallies',s:[synchOK()?'SYNCH':'ERROR']}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=['Differential input: the BNC shell is IN−, returned to ground only through C1 (DNI) / C2 (0.1 µF), so the receiver rejects shield hum.',`Coax loss grows with √f: ${fdb(-lossDb(1e6,D.cable))} dB at 1 MHz, ${fdb(-lossDb(s.fsc,D.cable))} dB at ${(s.fsc/1e6).toFixed(2)} MHz (${inf}: RG-59-class).`,'The LVL pot divides VIDEO_IN before everything else, so a hot input can clip U1 before LEVEL can help.','Clamp: the GB4571 samples the back porch during BPOUT and pulls blanking to a fixed DC level every line. OUT = the direct, AC-coupled path.',`The equaliser applies the inverse curve for the length you set; residual at ${(s.fsc/1e6).toFixed(2)} MHz ${fdb(-residualDb(s.fsc))} dB. Too little leaves soft edges and weak colour; too much gives peaking.`,'Each driver half: gain 2, 1K/1K, into one or two 75R resistors (U6A → OUT1/2, U5B → OUT3/4, U5A → OUT5/6, U6B → MONITOR).',`HSYNCH retriggers U7; T = ${SIM.fmtDur(T1)}. Q → SYNCH, Q̄ → ERROR.`][hot];
    const {c,w}=SIM.canvas(m.querySelector('#fr'),200); const X=f=>40+(Math.log10(f)-5)/(Math.log10(8e6)-5)*(w-60), Y=d=>20+(d+6)/26*160;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; [1e5,1e6,s.fsc,5e6].forEach(f=>{ c.beginPath(); c.moveTo(X(f),20); c.lineTo(X(f),180); c.stroke(); c.fillText((f/1e6).toFixed(f<1e6?1:2)+' MHz',X(f)+2,195); });
    [0,-6,-12,-18].forEach(d=>c.fillText(d+' dB',2,Y(-d)+3));
    [[f=>lossDb(f,D.cable),SIM.css('--accent2'),'cable'],[f=>-lossDb(f,eqLen()),SIM.css('--warn'),'EQ'],[f=>residualDb(f),SIM.css('--accent'),'result']].forEach(([fn,col,lb])=>{ c.strokeStyle=col; c.lineWidth=2; c.beginPath(); for(let i=0;i<=100;i++){ const f=Math.pow(10,5+i/100*(Math.log10(8e6)-5)); const y=Y(fn(f)); i?c.lineTo(X(f),y):c.moveTo(X(f),y);} c.stroke(); c.fillStyle=col; c.fillText(lb, X(6e6), Y(fn(6e6))-4); });
    const q=oneshotQ(SIM.t); m.querySelector('#sm').innerHTML=flowSVG([{t:'Q low · ERROR',s:['power-up /','no sync']},{t:'HSYNCH edge',s:['U7-5 falling']},{t:'Q high · SYNCH',s:['T restarts','every line']},{t:`no edge ${SIM.fmtDur(T1)}`,s:['RC times out','→ Q low']}], !D.power?-1:q?2:0); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod15aActive=false;
  m.innerHTML=card('What the POD15A archive shows — findings',`<ol>
   <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src(ART_CDR, ART_CDR.split('/').pop())}</b> (file 2015-10-02, sheet dated Jun.24/14). The ink plates are drawn as vectors; the older PNG silks cut from ${SIM.src(ART_PDF, 'the PDF')} are on the toggle under the rear panel. The cut-out layer shows the rear BNC holes as D-cuts (flat-sided) and a VIDEO MONITOR front hole that is a D-shape too. The front ERROR LED hole is cut, though the ERROR legend has no crosshair of its own.</li>
   <li><b>Corrected 2026|59: the POD15A circuit is archived after all, in the obsolete POD15 folder</b> (<span class="mono">XXX - POD15 - #Master #Obsolete/POD15 - #Engineering/PCB/pod15aiss3.net</span> and <span class="mono">POD15aiss3.bom</span>, POD15A issue 3, P-CAD 2009). This plugin previously guessed the circuit; it now runs on those nets: ERROR = no-sync one-shot (CD4538), ISL5002 on the EL2244 footprint, outputs driven in pairs, differential input with the BNC shell as IN−, and no terminator switch (issue 1 had one) (see pod15.js).</li>
   <li><b>ERROR is simply “no sync”.</b> The CD4538 one-shot (U7, T = R52·C35 = 100 kΩ × 0.1 µF = 10 ms) is retriggered by the LMH1981 HSOUT. Q lights SYNCH through Q2, Q̄ lights ERROR through Q1. Nothing measures the EQ or the level (the earlier guess that ERROR also flagged EQ or level errors was wrong).</li>
   <li><b>Part value vs footprint.</b> U1, U4, U5 and U6 are valued <span class="mono">ISL5002IBZ</span> but placed on the <span class="mono">EL2244-SO8</span> (dual op-amp) pattern, and the netlist uses both halves. Issue 1 used real EL2244s.</li>
   <li><b>Outputs share amplifiers.</b> U6A drives OUT1 and OUT2, U5B OUT3/OUT4, U5A OUT5/OUT6, U6B only the front MONITOR. A shorted output keeps its partner's level (separate 75R) but doubles that half's current (${inf}).</li>
   <li><b>The input is differential.</b> IN− is the BNC shell, returned to ground only through C1 (DNI) / C2 (0.1 µF): unusual for a video DA, and it rejects shield hum.</li>
   <li><b>Issue 3 dropped the terminator switch.</b> Issue 1 (<span class="mono">OBSOLETE/pod15aiss1.net</span>, 2004) had TERM_SW putting R13 across IN+/IN−; issue 3 has none, so the loop must be terminated externally.</li>
   <li><b>The real stage order is LEVEL → CLAMP → EQ.</b> The LVL pot sits right after the receiver; the CLAMP switch picks the GB4571 output or the direct path; EQ_FIXED (the “300m” switch) adds U4B after U4A.</li>
   <li><b>The ERROR LED colour changes between files.</b> <span class="mono">pod15aiss3.net</span> says RED; the BOM groups “3 GREEN: ERROR, PWRLED, SYNCH”. This model draws it red, as the panel photo does.</li>
   <li><b>The POD15 → POD15A step is visible on the panel.</b> The older POD15 manual describes a 1×6 DA with level trim and a front split. The POD15A panel keeps those and adds a cable equaliser (“0-300m”, “300m”, “(600m TOTAL)”), a CLAMP in/out switch and SYNCH/ERROR tallies.</li>
   <li><b>The manual's specs are for POD15, not POD15A.</b> Return loss 46 dB, response 0.05 dB, DG/DP 0.15 %/0.15° and S/N 60 dB, all at 3.58 MHz, and 115 V/60 Hz 12 VA. The POD15A rear silk says “90-230 VAC, 50-60 Hz, ½ A.S.B.”; the issue 3 PSU is a universal VAF1005.</li>
   <li><b>The panel issues differ.</b> The mechanical set is front ISS 1 and rear ISS 2, while the silks are front “ISS3” (<span class="mono">Pd15Asilk-ISS3.cdr</span>) and rear “ISS2”.</li>
   <li><b>The front monitor output counts as a seventh output.</b> The POD15 manual says “Output Impedance (6+1 splits) 75 ohm”. On POD15A the split is the VIDEO MONITOR BNC on the front, fed by its own driver half (U6B → R48).</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Coax loss 3.1 dB/100 m at 5 MHz, scaling with √f; the EQ applies the inverse for the set length (${inf}).</li><li>Clamp-out bounce: AC coupling with about 60 ms recovery (${inf}).</li><li>LEVEL ±3 dB; U1 gain 1; the LMH1981 finds sync above 80 mV (${inf}).</li><li>Colour bars approximate 75 % bars; the subcarrier phase is drawn for illustration, not as a true NTSC/PAL encoder.</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>../POD  - #Engineering/pod15.pdf</li><li>../XXX - POD15 - #Master #Obsolete/POD15 - #Engineering/PCB/pod15aiss3.net · POD15aiss3.bom · OBSOLETE/pod15aiss1.net</li><li>POD15A - #ARTWORK #DA #2016/POD15A-FRONT&amp;REAR-SILK (CURVE).pdf · Pd15Asilk-ISS3.cdr · Pd15AREAR-ISS2-CURVE.cdr · Pics/</li><li>POD15A - #Mechanical #DA #2016/POD15A-FRONT ISS 1 (PANEL).pdf · POD15A-REAR ISS 2 (PANEL) .pdf</li></ul>`); }
SIM.register({
  footnotes: [
    { text: "The rear BNC holes (INPUT, loop, OUT 1–6) are D-cuts with one flat side, not round holes.", src: "#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The front VIDEO MONITOR jack hole is D-shaped too.", src: "#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The front ERROR LED has a cut hole, but its legend has no drill crosshair, unlike SYNCH, 0-300m and LEVEL.", src: "#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "A short vertical white bar joins the two INPUT BNCs on the rear, marking them as a loop-through pair (inferred from the netlist loop termination).", src: "#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The CDR draws a drill crosshair at every hole on both the green and white plates; the real panels (Pics/ photos) carry no crosshairs, so the simulator shows them faint.", src: "#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr" }
  ],
  id:'pod15a', name:'POD15A · analog video DA with cable EQ and clamp (2014|47)', duration:1, product:'POD15A', year:2014, family:'POD series', folder:'#POD #SERIES/POD15A - #Master',
  summary:'Half-rack composite video distribution amplifier: a differential looping input, a level trim, a back-porch clamp, a 0–600 m cable equaliser and seven 75 Ω outputs driven in pairs (six rear, one front monitor). The circuit is the real POD15A issue 3 netlist, archived in the obsolete POD15 folder (year from the 2014 silk date).',
  highlights:['Real silkscreen panels with working EQ, 300 m, CLAMP and LEVEL controls','SYNCH/ERROR from the real CD4538 10 ms no-sync one-shot','NTSC/PAL lines with sync, burst and bars through each stage','Outputs driven in pairs: load, open or short any BNC','Four schematic sheets redrawn from pod15aiss3.net'],
  depth:'Hardware model',
  stepUnits:[{label:'1 line',period:()=>S().line},{label:'1 field',period:()=>S().field},{label:'1 subcarrier cycle',period:()=>1/S().fsc},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1001/60000,'1 field'],[0.0002,'3 lines'],[64e-6,'1 line (64 µs)'],[1e-5,'10 µs (sync + burst)'],[1e-6,'1 µs (subcarrier)']], defaultZoom:4,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: installing a POD15A',render:viewTutorial},{id:'second',label:'One second, line by line',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
