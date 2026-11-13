/* =====================================================================
   POD8 — stereo audio distribution amplifier, 1 × 6 stereo (Ward-Beck Systems), obsolete master folder
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model (analog audio, no code).

   Sources used (#POD #SERIES/xxx - POD8 - #Master #OBSOLETE/ unless noted):
   - POD8 - #Engineering/POD8 - #MANUAL/POD8MANU.pdf          (description and specifications)
   - POD8 Through Hole - #Master/POD8 ISS3 BOM.xlsx            (NE5532 ×14, 3006P 10K LVL trims ×12, PT10 1K CMR trims, resistor values)
   - POD8 Through Hole - #Master/POD8ISS3 BOM PCAD.bom        (P-CAD BOM, title block "MLC-8-ISS1")
   - POD8 - #Engineering/POD8 - #SILK/Obsolete/POD8SILK.CDR, POD8-rearSILK-iss2.cdr (converted with Inkscape → assets/pod8-*.png)
   - #POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - OBSOLETE/POD8 - MECHANICAL/
       POD8-FRONT ISS 1 (PANEL).pdf, POD8-REAR ISS 4 (PANEL).pdf  (hole positions, to scale)
   - POD8 - Update #RD #RD82/ (2015 Altium redesign: POD8-1 main, POD8-2 Phoenix, POD8-3 XLR, POD8-4 QTP boards; backup names)
   The front text did not survive the CorelDRAW conversion; front labels are drawn from the manual and marked inferred.
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
/* ---------- shared helper kit (inlined; the same code appears in each of these plugin files) ---------- */
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
    ${layers.map(l=>`<image href="${ASSET}${prefix}-${l}.png" width="${PW}" height="${PH}"/>`).join('')}
    ${inner.over||''}
    ${screw(50,160)}${screw(1664,160)}
  </svg>`;
}
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

/* ---- extra kit for the obsolete-product hardware models (same code in each of these files) ---- */
function layered(o){ // o: {w,h,bg,layers:[asset file], under, over, label, maxw, rx}
  return `<svg viewBox="0 0 ${o.w} ${o.h}" role="img" aria-label="${o.label||''}" style="width:100%;max-width:${o.maxw||980}px;border-radius:${o.rx==null?8:o.rx}px;display:block">
    <defs><filter id="glowfront" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${o.glow||3}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${o.w}" height="${o.h}" rx="${o.rx==null?8:o.rx}" fill="${o.bg||'var(--dev)'}"/>${o.under||''}
    ${(o.layers||[]).map(l=>`<image href="${ASSET}${l}" width="${o.w}" height="${o.h}"/>`).join('')}${o.over||''}</svg>`;
}
/* illuminated square pushbutton (lit = 0 off, 1 on, 0.5 dim/flash phase) */
function pbtn(x,y,s,lit,col,cls,title,data,cap){
  const on = lit>0.01, f = on ? `fill="${col}" ${lit>0.6?'filter="url(#glowfront)"':''} opacity="${0.35+0.65*lit}"` : `fill="${cap||'#3a3d42'}"`;
  return `<g class="${cls||''}" ${data||''} style="cursor:pointer"><title>${title||''}</title><rect x="${x-s/2-5}" y="${y-s/2-5}" width="${s+10}" height="${s+10}" rx="5" fill="#0b0c0d" stroke="#2c2f33" stroke-width="2"/>
    <rect x="${x-s/2}" y="${y-s/2}" width="${s}" height="${s}" rx="4" ${f}/><rect x="${x-s/2+4}" y="${y-s/2+3}" width="${s-8}" height="${s*0.25}" rx="2" fill="#fff" opacity=".12"/></g>`;
}
/* rotary knob, frac 0..1 = fully CCW..CW (300° travel) */
function knob(x,y,r,frac,cls,title,col){
  const a=(-150+300*frac)*Math.PI/180, dx=Math.sin(a)*r*0.8, dy=-Math.cos(a)*r*0.8;
  return `<g class="${cls||''}" style="cursor:pointer"><title>${title||''}: click right half for CW, left half for CCW (or use the wheel)</title><circle cx="${x}" cy="${y}" r="${r*1.35}" fill="transparent"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${col||'#2f9e55'}" stroke="#0d3d1f" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r*0.72}" fill="${col||'#2f9e55'}" stroke="#ffffff22"/>
    <line x1="${x}" y1="${y}" x2="${x+dx}" y2="${y+dy}" stroke="#fff" stroke-width="${Math.max(2,r*0.14)}" stroke-linecap="round"/></g>`;
}
function kvt(rows){ return `<table class="kv">${rows.map(r=>`<tr><th>${r[0]}</th><td${r[2]?' class="mono"':''}>${r[1]}</td></tr>`).join('')}</table>`; }
function tbl(head, rows, small){ return `<table class="kv ${small?'small':''}"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }
/* main-loop / state diagram: steps laid out in a ring-like row with the running step highlighted */
function loopSVG(steps, hot, title){
  const n=steps.length, cols=Math.min(n, 5), rows=Math.ceil(n/cols), bw=170, bh=62, gx=22, gy=34, W=cols*(bw+gx)+30, H=rows*(bh+gy)+40;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%"><defs><marker id="la" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  if (title) s+=`<text x="10" y="16" font-size="12" fill="var(--ink2)">${title}</text>`;
  steps.forEach((st,i)=>{ const r=Math.floor(i/cols), cc=r%2? cols-1-(i%cols) : i%cols, x=15+cc*(bw+gx), y=26+r*(bh+gy), on=i===hot;
    s+=`<g data-step="${i}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="${x+8}" y="${y+18}" font-size="11.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}" font-family="var(--mono)">${st.t}</text>
      ${(st.s||[]).map((l,k)=>`<text x="${x+8}" y="${y+34+k*13}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${l}</text>`).join('')}</g>`;
    if (i<n-1){ const r2=Math.floor((i+1)/cols), c2=r2%2? cols-1-((i+1)%cols) : (i+1)%cols, x2=15+c2*(bw+gx), y2=26+r2*(bh+gy);
      if (r2===r) s+=`<line x1="${cc<c2?x+bw:x}" y1="${y+bh/2}" x2="${cc<c2?x2:x2+bw}" y2="${y2+bh/2}" stroke="var(--ink2)" marker-end="url(#la)"/>`;
      else s+=`<line x1="${x+bw/2}" y1="${y+bh}" x2="${x2+bw/2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#la)"/>`; }
  });
  const last=n-1, rl=Math.floor(last/cols), cl=rl%2? cols-1-(last%cols) : last%cols;
  s+=`<path d="M${15+cl*(bw+gx)+bw/2} ${26+rl*(bh+gy)+bh} v14 H8 V${26+bh/2} H15" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3" marker-end="url(#la)"/>`;
  return s+'</svg>';
}
/* pin header / connector drawn as a pin table */
function pinRow(x,y,pins,pitch,lab){ let s=''; pins.forEach((p,i)=>{ const xx=x+i*pitch; s+=`<rect x="${xx-7}" y="${y-7}" width="14" height="14" fill="#d4af37" stroke="#7a5f12"/><text x="${xx}" y="${y-12}" text-anchor="middle" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${xx}" y="${y+22}" text-anchor="middle" font-size="9" fill="var(--accent2)">${p[1]||''}</text>`; }); return s+(lab?`<text x="${x-14}" y="${y+4}" text-anchor="end" font-size="11" font-weight="700" fill="var(--ink)">${lab}</text>`:''); }
/* ---------- end of kit ---------- */
const PREFIX='pod8';
/* ---------------- constants ---------------- */
const RAIL = 16.0;                // TE70042 toroid (12 V secondaries) → 1N4003 bridges → 470 µF: ≈ ±16 V unregulated (inferred: no regulator in the BOM)
const SWING = RAIL-1.5;           // NE5532 output swing into 2 k (inferred)
const G_RX = -4.7;                // receiver gain (inferred so that +25 dBu in reaches the clip point, matching "Max Input Level +25 dBu")
const TRIMX = [3.296,3.596,4.146,4.446,4.996,5.296,5.846,6.146,6.696,6.996,7.546,7.846].map(x=>Math.round(x*200)); // POD8-FRONT ISS 1: .130 dia × 12 (+ LED)
const D = { power:true, srcDbu:4, freq:1000, cm:0, trims:Array(12).fill(0.5), cmr:[0.5,0.5], loads:Array(12).fill(600), plugged:[true,true], lidOff:false, rev:'iss3', log:[] };
const FACT=JSON.parse(JSON.stringify(D));
/* trim k: 0..11 = 1L,1R,2L,2R … (front order: LVL-1L, LVL-1R, …) */
const trimGain = k => -6 + 20*D.trims[k];                 // −6 … +14 dB (manual "Gain -6dB to +14dB"); linear in dB (inferred)
const cmrrDb = ch => 40 + 45*Math.exp(-Math.pow((D.cmr[ch]-0.5)/0.08,2));   // trimmed ≈ 85 dB, untrimmed ≈ 40 dB (inferred); spec "better than 70dB at 60Hz"
const rxOutDbu = ch => D.plugged[ch] ? D.srcDbu + G_RX : -200;
const clipDbu = SWING>0 ? 20*Math.log10(SWING/Math.SQRT2/0.7746) : 0;   // single-ended clip, ≈ +20.2 dBu
function outDbu(k){ const ch=k%2; if(!D.power) return -200; const pre=rxOutDbu(ch); if(pre<-150) return -200;
  const leg = Math.min(pre + (trimGain(k) - G_RX - 6), clipDbu);   // hot leg; cold leg = inverted copy (×1, 20K/20K)
  const diff = leg + 6.02;                                        // balanced: hot − cold
  const rl=D.loads[k], att = rl>=1e5 ? 0 : 20*Math.log10(rl/(rl+60));   // 2 × 30R build-out = 60 Ω output impedance (manual)
  return diff + att; }
function clipping(k){ const ch=k%2; const pre=rxOutDbu(ch); return D.power && pre>-150 && (pre>clipDbu || pre + trimGain(k) - G_RX - 6 > clipDbu); }
function humDbu(ch){ return D.cm>0 ? 20*Math.log10(D.cm/0.7746) - cmrrDb(ch) + G_RX : -200; }
/* waveform at stage for channel/out at time t (volts) */
function vAt(where, k, t){ const ch=k%2, w=2*Math.PI*D.freq*t, ph = ch? 0.3:0;
  const src = D.plugged[ch]? dbu2v(D.srcDbu)*Math.SQRT2*Math.sin(w+ph) : 0, hum = D.cm*Math.SQRT2*Math.sin(2*Math.PI*60*t);
  if (where==='src') return src; if (!D.power) return 0;
  let rx = src*Math.pow(10,G_RX/20) + hum*Math.pow(10,(-cmrrDb(ch)+G_RX)/20); rx = clamp(rx,-SWING,SWING);
  if (where==='rx') return rx;
  let hot = clamp(rx*Math.pow(10,(trimGain(k)-G_RX-6)/20),-SWING,SWING);
  if (where==='hot') return hot; if (where==='cold') return -hot;
  const rl=D.loads[k]; return 2*hot*(rl>=1e5?1:rl/(rl+60)); }
/* ---------------- actions ---------------- */
const NAME = k => `OUT ${Math.floor(k/2)+1} ${k%2?'R':'L'}`;
const UOUT = k => { const n=Math.floor(k/2), ch=k%2; return `U${3+k} (NE5532, ${inf})`; };
const act=makeActor(D, ()=>`OUT1 L ${fdb(outDbu(0))} dBu · OUT1 R ${fdb(outDbu(1))} dBu`);
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; tr('AC IN (723W fused inlet, ½ A S.B.) → rocker → T1 TE70042 toroid → D1–D4 / D13–D16 1N4003 → C1–C4 470 µF/50 V → ±V rails (no regulator in the BOM)'); tr(D.power?'PWR LED (Dialight 551-0207, green) on':'All 14 NE5532s lose their rails; outputs mute'); }); },
  trim(k,d){ act(`Turn LVL-${Math.floor(k/2)+1}${k%2?'R':'L'} ${d>0?'CW':'CCW'}`, tr=>{ D.trims[k]=clamp(+(D.trims[k]+d*0.025).toFixed(3),0,1);
    tr(`3006P 10K trimpot through the front-panel hole at x = ${(TRIMX[k]/200).toFixed(3)} in → gain ${fdb(trimGain(k))} dB (manual range −6 … +14 dB)`);
    tr(`${NAME(k)} = ${fdb(outDbu(k))} dBu balanced${clipping(k)?' — CLIPPING':''}`); }); },
  cmr(ch,d){ act(`Turn CMR-${ch?'R':'L'} ${d>0?'CW':'CCW'}`, tr=>{ D.cmr[ch]=clamp(+(D.cmr[ch]+d*0.02).toFixed(3),0,1); tr(`PT10 1K trim balances the receiver’s resistor ratios (24K3/19K6/20K): CMRR now ≈ ${cmrrDb(ch).toFixed(0)} dB (${inf})`); }); },
  load(k){ act(`${NAME(k)} load → ${({600:'10 kΩ',10000:'open',1e6:'600 Ω'})[D.loads[k]]}`, tr=>{ D.loads[k]=({600:10000,10000:1e6,1e6:600})[D.loads[k]];
    tr(`Output impedance 60 Ω (two 30R build-outs, R66–R101): into ${D.loads[k]>=1e5?'an open circuit':D.loads[k]+' Ω'} the level is ${fdb(outDbu(k))} dBu`); }); },
  plug(ch){ act(`${ch?'RIGHT':'LEFT'} input ${D.plugged[ch]?'unplugged':'plugged'}`, tr=>{ D.plugged[ch]=!D.plugged[ch]; tr(`Rear INPUT ${ch?'RIGHT':'LEFT'} (3-way Phoenix SMKDS1/3-3.5) → balanced receiver`); }); },
  set(k,v,l){ act(l, tr=>{ D[k]=v; tr(k==='srcDbu'?`Receiver output ${fdb(rxOutDbu(0))} dBu; clips at ${fdb(clipDbu)} dBu (±${SWING.toFixed(1)} V swing, ${inf})`:k==='cm'?`Common-mode hum on the input pair: ${v} V; after the receiver ${fdb(humDbu(0))} dBu`:'Changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels (200 px per inch; face 8.570 × 1.606 in) ---------------- */
const lbl = (x,y,t,sz,anc,col) => `<text x="${x}" y="${y}" font-size="${sz||17}" text-anchor="${anc||'middle'}" fill="${col||'#eee'}" font-family="Arial,sans-serif">${t}</text>`;
function frontSVG(){ const on=D.power;
  let over = rocker(on,124,58) + pled(on) + screw(50,161) + screw(1664,161) + lbl(299,262,'POWER',15);
  for (let n=0;n<6;n++){ const xl=TRIMX[2*n], xr=TRIMX[2*n+1]; over += lbl((xl+xr)/2,138,String(n+1),22) + lbl(xl,268,'L',15) + lbl(xr,268,'R',15); }
  TRIMX.forEach((x,k)=>{ over += trim(x,218,D.trims[k],'tr" data-k="'+k,`LVL-${Math.floor(k/2)+1}${k%2?'R':'L'} (3006P 10K)`); if (clipping(k)) over += `<circle cx="${x}" cy="${218}" r="26" fill="none" stroke="#ff4a3a" stroke-width="4"/>`; });
  over += lbl(1110,90,'OUTPUT LEVEL',18) + `<text x="40" y="300" font-size="16" fill="#eee" font-family="Arial,sans-serif">POD-8 STEREO AUDIO DISTRIBUTION AMPLIFIER</text>`;
  return layered({w:1714,h:321,layers:[PREFIX+'-front-green.png',PREFIX+'-front-white.png'],over,label:'POD8 front panel'}); }
function rearSVG(){
  // outside view (the 2007 drawing is an inside view, mirrored here): input cutout 1.393–1.843 in, output cutout 2.245–4.953 in, IEC detail D at ≈ 7.87 in
  const pitch=27.6, rowY=[100,170];
  let over = `<rect x="279" y="29" width="90" height="175" fill="#050505"/><rect x="449" y="29" width="542" height="175" fill="#050505"/>`;
  [0,1].forEach(ch=>{ const y=rowY[ch];
    over += `<g class="pin" data-c="${ch}" style="cursor:pointer"><title>INPUT ${ch?'RIGHT':'LEFT'} — click to ${D.plugged[ch]?'unplug':'plug in'}</title><rect x="287" y="${y-22}" width="76" height="44" rx="3" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>${[0,1,2].map(i=>`<rect x="${294+i*pitch-6+6}" y="${y-12}" width="16" height="24" fill="#0e4d25"/>`).join('')}${D.plugged[ch]?`<rect x="289" y="${y-20}" width="72" height="16" fill="#2b5f9e" opacity=".85"/>`:''}</g>`;
    for (let n=0;n<6;n++){ const k=2*n+ch, x0=465+(5-n)*85.2; const ld=D.loads[k];
      over += `<g class="ld" data-k="${k}" style="cursor:pointer"><title>${NAME(k)}: load ${ld>=1e5?'open':ld+' Ω'} — click to change</title><rect x="${x0-12}" y="${y-22}" width="${3*pitch+2}" height="44" rx="3" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>${[0,1,2].map(i=>`<rect x="${x0+i*pitch-6}" y="${y-12}" width="14" height="24" fill="#0e4d25"/>`).join('')}${ld<1e5?`<rect x="${x0-10}" y="${y-20}" width="${3*pitch-2}" height="14" fill="${clipping(k)?'#c0392b':'#2b5f9e'}" opacity=".85"/>`:''}</g>`; } });
  over += iec(1466,25,1682,276) + screw(50,161) + screw(1664,161)
    + `<text x="1080" y="120" font-size="13" fill="#eee" font-family="Arial,sans-serif">CAUTION: DISCONNECT POWER</text><text x="1080" y="138" font-size="13" fill="#eee" font-family="Arial,sans-serif">BEFORE SERVICING OR</text><text x="1080" y="156" font-size="13" fill="#eee" font-family="Arial,sans-serif">REPLACING THE FUSE</text>`;
  return layered({w:1714,h:321,layers:[PREFIX+'-rear-white.png'],over,label:'POD8 rear panel (real rear silkscreen issue 2)'}); }
function pcbSVG(){ // lid off: the two CMR trims (PT10V 1K) are on the main board
  return `<svg viewBox="0 0 600 120" style="width:100%;max-width:600px"><rect width="600" height="120" rx="6" fill="#1d5c3a"/><text x="10" y="18" font-size="12" fill="#cfe">POD8 ISS3 main board (lid off) — CMR trims and 14 × NE5532 (layout inferred)</text>
    ${[...Array(14)].map((_,i)=>`<rect x="${20+i*40}" y="70" width="28" height="36" fill="#111"/><text x="${34+i*40}" y="92" text-anchor="middle" font-size="8" fill="#ddd">U${i+1}</text>`).join('')}
    ${[0,1].map(ch=>trim(80+ch*120,44,D.cmr[ch],'cm" data-c="'+ch,`CMR-${ch?'R':'L'} (PT10 1K)`)+`<text x="${110+ch*120}" y="48" font-size="11" fill="#fff">CMR-${ch?'R':'L'}</text>`).join('')}</svg>`; }
function bindPanel(r){ const p=r.querySelector('.pwr'); if(p) p.onclick=()=>A.power();
  r.querySelectorAll('.tr').forEach(g=>{ const k=+g.dataset.k; g.addEventListener('click',e=>{ const b=g.getBoundingClientRect(); A.trim(k,(e.clientX-b.left)/b.width<0.5?-1:1); }); g.addEventListener('wheel',e=>{ e.preventDefault(); A.trim(k,e.deltaY<0?1:-1); },{passive:false}); });
  r.querySelectorAll('.cm').forEach(g=>{ const c=+g.dataset.c; g.addEventListener('click',e=>{ const b=g.getBoundingClientRect(); A.cmr(c,(e.clientX-b.left)/b.width<0.5?-1:1); }); });
  r.querySelectorAll('.ld').forEach(g=>g.onclick=()=>A.load(+g.dataset.k)); r.querySelectorAll('.pin').forEach(g=>g.onclick=()=>A.plug(+g.dataset.c)); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Source <input id="sl" type="number" step="1" value="${D.srcDbu}" style="width:60px"> dBu</label>
  <label>Tone <select id="fq">${[100,1000,10000].map(f=>`<option ${f===D.freq?'selected':''} value="${f}">${f} Hz</option>`).join('')}</select></label>
  <label>Common-mode hum <select id="cmv">${[0,0.1,1,5].map(v=>`<option ${v===D.cm?'selected':''} value="${v}">${v} V</option>`).join('')}</select></label>
  <label><input type="checkbox" id="lid" ${D.lidOff?'checked':''}> lid off (show CMR trims)</label></div>
  <div class="small muted">Front: click a trim’s left/right half (or wheel). Rear: click an input block to unplug it, an output block to change its load (600 Ω → 10 kΩ → open). Keys 1–6 select an output pair, ←/→ turn its L trim, Shift+←/→ its R trim.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#sl')) return; g('#sl').onchange=e=>A.set('srcDbu',+e.target.value,'Source → '+e.target.value+' dBu');
  g('#fq').onchange=e=>A.set('freq',+e.target.value,'Tone → '+e.target.value+' Hz'); g('#cmv').onchange=e=>A.set('cm',+e.target.value,'Common-mode hum → '+e.target.value+' V');
  g('#lid').onchange=e=>{ D.lidOff=e.target.checked; SIM.refresh(); }; }
let selPair=0;
document.addEventListener('keydown', e=>{ if(!window.__pod8Active || (e.target.matches&&e.target.matches('input,select,textarea'))) return;
  if (/^[1-6]$/.test(e.key)){ selPair=+e.key-1; e.preventDefault(); return; }
  if (e.key==='ArrowLeft'||e.key==='ArrowRight'){ A.trim(2*selPair+(e.shiftKey?1:0), e.key==='ArrowRight'?1:-1); e.preventDefault(); } });
/* ---------------- timeline ---------------- */
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), w=SIM.css('--warn');
  const env = (k,where)=>{ const f=t=>Math.abs(vAt(where,k,t)); const e=()=>Math.min(SWING*2, where==='out'?2*Math.abs(clamp(dbu2v(D.srcDbu)*1.414*Math.pow(10,(trimGain(k)-6)/20),-SWING,SWING)) : dbu2v(D.srcDbu)*1.414); e.dense=(span,pw)=>span*D.freq>pw/3; return e; };
  return [
    {label:`Tone ${D.freq} Hz (cycles)`, h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/D.freq,0,0.5/D.freq,b,'cycles'); }},
    {label:'60 Hz common-mode', h:18, draw(c,X,t0,t1,y,h){ if(!D.cm){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('none',X(t0)+6,y+13); return;} SIM.pulses(c,X,t0,t1,y,h,1/60,0,1/120,w,'hum'); }},
    waveLane('Input LEFT (+ − differential)', t=>vAt('src',0,t), -0.5, null, SIM.css('--ink2'), 40, env(0,'src')),
    waveLane('Receiver out L', t=>vAt('rx',0,t), -0.5, SWING, b, 40, env(0,'rx')),
    waveLane('OUT 1 L hot leg (→ 30R)', t=>vAt('hot',0,t), -0.5, SWING, a, 40, env(0,'hot')),
    waveLane('OUT 1 L cold leg (inverter)', t=>vAt('cold',0,t), -0.5, SWING, a, 40, env(0,'hot')),
    waveLane('OUT 1 L at the load (hot − cold)', t=>vAt('out',0,t), -0.5, 2*SWING, a, 44, env(0,'out')),
    boolLane('Any output clipping', ()=>[...Array(12).keys()].some(clipping), SIM.css('--bad')),
  ]; }
function stageStats(k){ k=k||0; const ch=k%2;
  return [
    {name:`Source (${ch?'RIGHT':'LEFT'} IN, balanced)`, lvl:D.plugged[ch]?D.srcDbu:-200, gain:null, clip:25, note:'manual: max input +25 dBu, 40 kΩ balanced'},
    {name:'Balanced receiver (CMR trim)', lvl:rxOutDbu(ch), gain:G_RX, clip:clipDbu, note:`CMRR ≈ ${cmrrDb(ch).toFixed(0)} dB; hum after receiver ${fdb(humDbu(ch))} dBu (${inf})`},
    {name:`LVL-${Math.floor(k/2)+1}${ch?'R':'L'} + gain stage (1K / 3K32)`, lvl:Math.min(rxOutDbu(ch)+trimGain(k)-G_RX-6,99), gain:trimGain(k)-G_RX-6, clip:clipDbu, note:'hot leg; 3006P 10K trim'},
    {name:'Inverter (20K / 20K) → cold leg', lvl:Math.min(rxOutDbu(ch)+trimGain(k)-G_RX-6,99), gain:0, clip:clipDbu},
    {name:`Balanced output, 2 × 30R into ${D.loads[k]>=1e5?'open':D.loads[k]+' Ω'}`, lvl:outDbu(k), gain:6.02, clip:clipDbu+6.02, note:'manual: max output +28 dBu, 60 Ω'},
  ]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__pod8Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel (POD8-FRONT ISS 1 holes + POD8SILK.CDR bars)',`<div id="fp"></div>${controlsHTML()}<div id="pcb"></div>`)}${card('Rear panel (POD8-rearSILK-iss2.cdr)',`<div id="rp"></div>`)}</div>
    <div>${card('What the circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('All twelve outputs',`<div id="outs"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable (zoom to 1 ms to see the 1 kHz tone)',`<canvas id="tl"></canvas>`)}
    <div class="grid2">${card('Stage by stage — OUT 1 L',`<div id="lv"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#pcb').innerHTML=D.lidOff?pcbSVG():''; bindPanel(m.querySelector('#pcb'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Turn a level trim or change a load.');
    m.querySelector('#outs').innerHTML=tbl(['Output','Gain','Load','Level'],[...Array(12).keys()].map(k=>[NAME(k),fdb(trimGain(k))+' dB',D.loads[k]>=1e5?'open':D.loads[k]+' Ω',`<span class="mono" style="${clipping(k)?'color:var(--bad);font-weight:700':''}">${fdb(outDbu(k))} dBu${clipping(k)?' CLIP':''}</span>`]),true);
    m.querySelector('#lv').innerHTML=stageTable(stageStats(0)); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD8', body:`<p>From <span class="mono">POD8MANU.pdf</span>: “six adjustable stereo outputs of a single stereo input signal. Twelve separate screwdriver adjust potentiometers, on the front panel, allow the user to trim the levels of the left and right channels of the six outputs independently … via screw terminals located on the rear panel.”</p>`, check:()=>true, auto:true},
  {title:'1 · Set unity gain on OUT 1', body:`<p>The source is +4 dBu. Turn LVL-1L and LVL-1R until OUT 1 L and OUT 1 R both read +4.0 dBu (±0.5 dB) in the output table.</p>`, check:()=>Math.abs(outDbu(0)-4)<0.5&&Math.abs(outDbu(1)-4)<0.5, hint:'Unity is about a third of the trim travel (−6 dB + 20 dB × 0.34, less 0.8 dB for the 600 Ω load). Key 1, then ←/→ and Shift+←/→.'},
  {title:'2 · Find the headroom', body:`<p>Raise the source to <b>+24 dBu</b>. OUT 1 is at unity, so it stays clean, but any output trimmed above about +4 dB clips. Make OUT 2 L clip by turning its trim fully clockwise.</p>`, check:()=>D.srcDbu>=24&&clipping(2), hint:'Source box → 24; key 2 then → several times.'},
  {title:'3 · Common-mode rejection', body:`<p>Set the source back to +4 dBu and add <b>1 V</b> of common-mode hum. Tick <b>lid off</b> and turn <b>CMR-L</b> until the receiver row shows CMRR above 80 dB.</p>`, check:()=>D.cm>=1&&cmrrDb(0)>80&&D.srcDbu<10, hint:'Common-mode hum → 1 V; lid off; click the CMR-L trim halves.'},
  {title:'4 · Loads', body:`<p>Click the rear OUT 3 L block until it is open (no load). The 60 Ω source impedance means the level rises by about 0.8 dB from a 600 Ω load to an open circuit.</p>`, check:()=>D.loads[4]>=1e5, hint:'Rear panel, upper row (LEFT). Outputs run 6…1 from left to right, so OUT 3 is the fourth block. Click it twice.'},
  {title:'Done', body:`<p>See <b>Findings</b> for what the BOMs and the 2015 redesign show.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod8Active=true; tutorialView(m,{title:'Tutorial — setting up a POD8',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}${D.lidOff?pcbSVG():''}<div class="small">${tbl(['Output','Level'],[0,1,2,3,4].map(k=>[NAME(k),fdb(outDbu(k))+' dBu'+(clipping(k)?' CLIP':'')]),true)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod8Active=true;
  m.innerHTML=`${card('One second through the POD8',`<div id="tab"></div>`)}<div class="grid2">${card('At the playhead',`<div id="dev"></div>`)}${card('One tone cycle on OUT 1 L (hot, cold, difference)',`<canvas id="sc"></canvas>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#tab').innerHTML=tbl(['What happens','per second','period','notes'],[[`Tone cycles`,D.freq.toLocaleString(),SIM.fmtDur(1/D.freq),'each cycle passes 14 NE5532s in parallel paths'],['Mains (hum, rectifier ripple)','120 ripple peaks','8.33 ms','unregulated ±V rails: NE5532 PSRR keeps ripple out ('+inf+')'],['Slew limit (NE5532 ≈ 9 V/µs)','—','—',`full-swing 20 kHz needs ${(2*Math.PI*20000*SWING/1e6).toFixed(1)} V/µs — inside the limit`],['Signal delay through 3 op-amp stages','—','≈ 1 µs ('+inf+')','no buffering, no clocks: purely analog']]);
    m.querySelector('#dev').innerHTML=kvt([['Time',SIM.fmtT(t),1],['Source L',vAt('src',0,t).toFixed(3)+' V',1],['Receiver L',vAt('rx',0,t).toFixed(3)+' V',1],['OUT1 L hot / cold',vAt('hot',0,t).toFixed(3)+' / '+vAt('cold',0,t).toFixed(3)+' V',1],['OUT1 L at load',vAt('out',0,t).toFixed(3)+' V',1],['Rails','±'+RAIL.toFixed(1)+' V (unregulated, '+inf+')']]);
    const {c,w}=SIM.canvas(m.querySelector('#sc'),200), P=1/D.freq, t0=Math.floor(t/P)*P, sc=80/(SWING*2);
    c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(0,100); c.lineTo(w,100); c.stroke(); [SWING,-SWING,2*SWING,-2*SWING].forEach(v=>{ c.setLineDash([3,3]); c.strokeStyle=SIM.css('--bad'); c.beginPath(); c.moveTo(0,100-v*sc); c.lineTo(w,100-v*sc); c.stroke(); c.setLineDash([]); });
    [['hot',SIM.css('--accent')],['cold',SIM.css('--accent2')],['out',SIM.css('--warn')]].forEach(([k,col])=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); for(let i=0;i<=400;i++){ const v=vAt(k,0,t0+P*i/400); i?c.lineTo(w*i/400,100-v*sc):c.moveTo(0,100-v*sc);} c.stroke(); c.fillStyle=col; c.font='11px sans-serif'; c.fillText(k,w-40,14+['hot','cold','out'].indexOf(k)*13); }); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:15,y:40,w:160,h:80,t:'INPUT L / R',s:['3-way Phoenix','40 kΩ balanced'],d:'SMKDS1/3-3.5 pluggable terminals (Left IN, Right IN) on the rear connector board POD8-2.'},
  rx:{x:200,y:40,w:170,h:80,t:'Balanced receiver',s:['24K3 / 19K6 / 20K','CMR-L/R 1K trims'],d:'One per channel. The resistor ratios set the gain; the PT10 1K trim nulls common-mode error. Exact topology not archived ('+inf+').'},
  dist:{x:395,y:40,w:150,h:80,t:'Bus to 6 outputs',s:['per channel'],d:'The receiver output feeds six trim/gain stages per channel.'},
  g:{x:570,y:20,w:170,h:90,t:'LVL trim + gain',s:['3006P 10K ×12','1K / 3K32 per stage'],d:'12 identical stages, −6 … +14 dB overall (manual).'},
  inv:{x:570,y:130,w:170,h:80,t:'Inverter',s:['20K / 20K ×12'],d:'Makes the cold leg: unity inverting stage.'},
  o:{x:765,y:70,w:150,h:90,t:'12 balanced outs',s:['2 × 30R each','60 Ω, +28 dBu max'],d:'Two 9-way Phoenix blocks per row (LEFT row, RIGHT row), outputs 6…1 left to right.'},
  psu:{x:200,y:170,w:170,h:70,t:'Power',s:['TE70042 toroid','±V unregulated'],d:'Toroidal 12 V 0.834 A transformer, eight 1N4003, four 470 µF/50 V. No regulator appears in either BOM.'},
};
const WIRES=[['in','rx',''],['rx','dist',''],['dist','g','×6'],['g','inv',''],['g','o','hot'],['inv','o','cold'],['psu','rx','±V']];
function viewBlock(m){ window.__pod8Active=false; blockView(m,BLOCKS,WIRES,'g',[930,260],card('In one sentence',`<p>Each channel’s balanced input is received once, then split to six trim-and-gain stages; each drives a hot leg directly and a cold leg through an inverter, through 30 Ω build-outs to the rear Phoenix terminals.</p>`)); }
const SHEETS=[
  {name:'1 · One channel, one output (reconstructed)', note:`The archive has BOMs, not a schematic. Values are from POD8 ISS3 BOM.xlsx; the topology is the usual one for these parts (${inf}).`, svg:()=>
    net(20,120,'IN +')+net(20,180,'IN −')+res(70,120,150,120,'R102','24K3')+res(70,180,150,180,'R103','19K6')+opamp(170,140,'U1A NE5532 receiver')+res(170,80,230,80,'R104','20K')+txt(110,230,'CMR-L PT10 1K in the + leg divider ('+'inferred'+')',10,'var(--ink2)')
    +wire([[230,140],[280,140]])+res(280,140,280,240,'LVL-1L','3006P 10K')+gnd(280,240)+wire([[280,190],[330,190],[330,152],[350,152]])+opamp(350,140,'U3A gain')+res(350,80,410,80,'R10','3K32')+res(350,60,350,30,'R11','1K')
    +wire([[410,140],[460,140]])+res(460,140,540,140,'R66','30R')+net(550,140,'OUT1 L +')+wire([[440,140],[440,260],[480,260]])+res(480,260,540,260,'R54','20K')+opamp(560,272,'U3B inverter')+res(560,215,620,215,'R55','20K')+wire([[620,272],[650,272]])+res(650,272,720,272,'R67','30R')+net(730,272,'OUT1 L −')
    +txt(40,400,'Gain chain: receiver (≈ −4.7 dB, '+'inferred'+') × LVL (0…1) × (1 + 3K32/1K) = +12.7 dB, then +6 dB from the balanced pair.',11.5)},
  {name:'2 · Supply (from the BOM)', note:'No regulator part is listed in either BOM; rails follow the transformer.', svg:()=>
    chip(60,90,150,'AC IN 723W-X2/02',[['L','fuse 0.5 A S.B.'],['N','']],[['','rocker R1966']],'fused inlet')+chip(300,90,150,'T1 TE70042',[['pri','115 V']],[['sec','12 V × 2 ('+'inferred'+')']],'toroid 12 V 0.834 A')
    +chip(560,90,180,'D1–D4, D13–D16 1N4003',[['AC','']],[['+V','C1, C2 470µ/50'],['−V','C3, C4 470µ/50']],'two bridges')+txt(60,330,'28 × 0.1 µF (one per op-amp rail) + 4 × 33 µF tantalum (C33, C34, C37, C38). 28 × 22 pF compensation/RF caps.',11.5)},
];
function viewSchem(m){ window.__pod8Active=false; schemView(m,SHEETS,'POD8 ISS3','Reconstructed from the issue 3 BOMs; no POD8 schematic file exists in the archive (the RD82 Altium .SchDoc files are the 2015 redesign).'); }
function viewSoft(m){ window.__pod8Active=true; let hot=2;
  m.innerHTML=`${card('No firmware — the signal path stage by stage for OUT 1 L (click a stage)',`<div id="f"></div><div id="det" class="card"></div>`)}${card('Headroom of every output',`<canvas id="hr"></canvas>`)}`;
  const draw=()=>{ const st=stageStats(0).map(s=>({t:s.name.split(' (')[0].slice(0,22),s:[fdb(s.lvl)+' dBu'],bad:s.clip!=null&&s.lvl>s.clip}));
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=stageStats(0)[hot].note||'—';
    const {c,w}=SIM.canvas(m.querySelector('#hr'),180); const bw=(w-40)/12;
    for(let k=0;k<12;k++){ const hr=clipDbu+6.02-outDbu(k), x=30+k*bw, hh=clamp(hr,0,30)/30*140; c.fillStyle=hr<0?SIM.css('--bad'):hr<6?SIM.css('--warn'):SIM.css('--accent'); c.fillRect(x+4,160-hh,bw-8,hh); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(NAME(k).replace('OUT ',''),x+4,175); c.fillText(hr.toFixed(0)+' dB',x+4,150-hh); } };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod8Active=false;
  m.innerHTML=card('What the POD8 folder shows — findings',`<ol>
   <li><b>The P-CAD BOM is titled “MLC-8-ISS1”.</b> <span class="mono">POD8ISS3 BOM PCAD.bom</span> names <span class="mono">POD8ISS3-updated.pcb</span> but carries the MLC-8 title block, so the board file was started from an MLC-8 template.</li>
   <li><b>Same pins, different blocks.</b> The P-CAD BOM lists 14 × PHEN3VERT (42 positions); the 2015 spreadsheet BOM lists 4 × SMKDS1/9-3.5 + 2 × SMKDS1/3-3.5 (also 42 positions). The rear silk (issue 2) shows two rows of 6 outputs plus INPUT.</li>
   <li><b>No regulator.</b> Neither BOM lists a voltage regulator: TE70042 toroid → eight 1N4003 → 470 µF. The specs still work out: a ±16 V unregulated rail gives about +20 dBu per leg, which matches “Max Input +25 dBu” after a −4.7 dB receiver and “Max Output +28 dBu” balanced (${inf}).</li>
   <li><b>60 Ω = two 30R.</b> 24 × 30 Ω resistors (R66–R101) give the manual’s 60 Ω output impedance: each output is truly balanced (hot and cold driven).</li>
   <li><b>Spreadsheet typos.</b> <span class="mono">POD8 ISS3 BOM.xlsx</span>: “R84,R85R86”, “C25,C25”, “C30C31,C32C35” (missing commas, a duplicate) and “Uesd On Rear Panel”.</li>
   <li><b>The 2015 RD82 redesign split the board.</b> POD8-1 (main), POD8-2 (Phoenix), POD8-3 (XLR) and POD8-4 (QTP) rear boards. Backup names record the steps: “added-inverting-stage-to-feed-a-to-b”, “phoenix-and-xlr-termination-added”, “pin swaps”, “final-cleaned up”. It became POD8A in <span class="mono">#POD #SERIES</span>.</li>
   <li><b>About 2,300 Altium autosave zips</b> (<span class="mono">*.~(n).SchDoc.Zip</span>) make up most of the folder; the README marks them disposable.</li>
   <li><b>The front silk text is lost.</b> <span class="mono">POD8SILK.CDR</span> converts only the green bars, two white rule lines and the drill crosshairs; the labels here are drawn from the manual (${inf}). The crosshairs match <span class="mono">POD8-FRONT ISS 1</span> exactly (12 trims in pairs 0.300 in apart, 0.850 in between pairs).</li>
   <li><b>The rear drawing is an inside view.</b> <span class="mono">POD8-REAR ISS 4</span> is labelled “INSIDE VIEW” (IEC on the left); the panel here is mirrored to the outside view to match the silk. ISS 4 (Apr 2007) note: “REVISED AC/PLUG”.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Receiver gain −4.7 dB and rails ±16 V chosen to reproduce the manual’s +25 dBu / +28 dBu limits (${inf}).</li><li>Trim law linear in dB over −6 … +14 dB (${inf}).</li><li>CMRR 40 dB untrimmed, about 85 dB at the best trim setting (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD8 - #Engineering/POD8 - #MANUAL/POD8MANU.pdf</li><li>POD8 Through Hole - #Master/POD8 ISS3 BOM.xlsx · POD8ISS3 BOM PCAD.bom</li><li>POD8 - #SILK/Obsolete/POD8SILK.CDR, POD8-rearSILK-iss2.cdr (→ assets/pod8-front-green.png, pod8-front-white.png, pod8-rear-white.png)</li><li>#POD #SERIES/POD PANELS - #Mechanical #DA #2016/POD - OBSOLETE/POD8 - MECHANICAL/POD8-FRONT ISS 1 (PANEL).pdf, POD8-REAR ISS 4 (PANEL).pdf</li><li>POD8 - Update #RD #RD82/PCB/* (folder names)</li></ul>`); }
SIM.register({
  id:'pod8', name:'POD8 · stereo audio DA, 1 × 6 stereo (1996|29–2015|48)', duration:1, product:'POD8', year:1996, family:'Obsolete products', folder:'#POD #SERIES/xxx - POD8 - #Master #OBSOLETE',
  summary:'Half-rack stereo distribution amplifier: one balanced stereo input, six balanced stereo outputs on rear screw terminals, and twelve front-panel trims (−6 to +14 dB). Built from the issue 3 BOMs, the manual, the 2007/2015 panel drawings and the surviving silk.',
  highlights:['Twelve working level trims at the drawing’s hole positions','Headroom per output: clip at the manual’s +28 dBu','CMR trim against common-mode hum','Balanced hot/cold legs and 60 Ω build-outs','Findings from the BOMs and the 2015 RD82 redesign'],
  depth:'Hardware model',
  stepUnits:[{label:'1 tone cycle',period:()=>1/D.freq},{label:'1 ms',period:()=>0.001},{label:'1 mains cycle',period:()=>1/60}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1/60,'1 mains cycle'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (reconstructed)',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
