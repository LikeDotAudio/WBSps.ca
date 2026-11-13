/* =====================================================================
   RD64 — POD1 / POD18 redesign study (Ward-Beck Systems R&D)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware / R&D model: no firmware.

   Sources used (folder #POD #SERIES/POD1  - POD18 - Redesign #RD #RD64):
   - details.txt                             (engineering e-mail stating the four goals; file date 2013-02-21)
   - mutant POD/mutant pod bom.xlsx          (first combined attempt: Mean Well RPT-60C, costed per configuration; 2013-06-14)
   - mutant POD/RPT-60-spec-32191.pdf        (RPT-60C: 5 V 4 A, +15 V 1.5 A, −15 V 0.5 A, 100 kHz)
   - PCB/BLACK BOX MASTER BOM.xlsx           (stand-alone unbal→bal "black box": USB power, Phoenix, mono sum; 2013-10-04)
   - PCB/POD1 MASTER BOM with jumpers.xlsx   (final SA-POD1-MAIN / BAL2UNB / UNB2BAL and the POD1 + POD18 kits; 2014-05-28)
   - PCB/Unbalanced-Balanced.pdf, ../POD1 - #Master/... ISS3 schematics (circuit values)
   - POD 1 - POD 18 POD 14- AB  #SA BALtoUNBAL - #Master/SA-BALtoUNBAL - QUOTE/SA-BALtoUNBAL - QUOTE SQ20146.pdf (12/18/15)
   - ../POD18 - #Master/.../POD18ISS2.net (the through-hole design being replaced)
   Panels reuse the POD1 and POD18 silkscreen PNGs cut for those plugins (read-only).
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

/* ---------------- what the study compared ---------------- */
const SUB = {
  BU:   { name:'SA-POD1-BAL2UNB (POD1-2)', short:'bal→unbal', Rin:8060, Rf:15000, Rt:2000, RV:5000, cost:6.77 },
  UB:   { name:'SA-POD1-UNB2BAL (POD1-3)', short:'unbal→bal', R9:47500, R13:2210, R11:301, RV:5000, R5:47500, cost:3.45 },
  BUm:  { name:'mutant bal→unbal', short:'bal→unbal (mutant)', Rin:7870, Rf:12000, Rt:2000, RV:5000, cost:6.77 },
  UBm:  { name:'mutant unbal→bal', short:'unbal→bal (mutant)', R9:47500, R13:2430, R11:301, RV:5000, R5:47500, cost:3.45 },
  none: { name:'(empty slot)', short:'—' },
};
const PSU = {
  xfmr:  { name:'Through-hole linear (POD18 ISS2/3: transformer + LM317/LM337)', rail:18, ripple:120, rpp:0.0004, note:'the design being replaced; needs 115/230 V strapping', univ:false },
  rpt:   { name:'Mutant POD: Mean Well RPT-60C (±15 V, +5 V)', rail:15, ripple:100000, rpp:0.15, note:'60 W triple output, 100 kHz; the op-amps run straight off its ±15 V', univ:true },
  final: { name:'Final: NFM-10-5 → SUW1R5 (±12 V)', rail:12, ripple:100000, rpp:0.02, note:'10 W 5 V module + 1.5 W isolated DC-DC on POD1-1', univ:true },
  bom:   { name:'Final, as the BOM lists it (SUW1R5-1212 on 5 V)', rail:0, ripple:0, rpp:0, note:'a 12 V-input converter on the 5 V bus does not start ('+'inferred'+')', univ:true },
  usb:   { name:'Black box: micro-USB 5 V → SUW1R5 (±12 V)', rail:12, ripple:100000, rpp:0.02, note:'no mains at all', univ:true },
};
const CONFIG = {
  POD1:  { name:'POD1 kit', slots:['BU','UB'], psu:'final', panel:'pod1', xlr:['in','out'] },
  POD18: { name:'POD18 kit', slots:['UB','UB'], psu:'final', panel:'pod18', xlr:['out','out'] },
  MUT1:  { name:'Mutant POD as POD1', slots:['BUm','UBm'], psu:'rpt', panel:'pod1', xlr:['in','out'] },
  MUT18: { name:'Mutant POD as POD18', slots:['UBm','UBm'], psu:'rpt', panel:'pod18', xlr:['out','out'] },
  OLD18: { name:'Old POD18 (through-hole)', slots:['UBm','UBm'], psu:'xfmr', panel:'pod18', xlr:['out','out'] },
  BOX:   { name:'Black box (stand-alone unbal→bal)', slots:['UB','none'], psu:'usb', panel:'box', xlr:[] },
};
const D = { cfg:'POD1', slots:['BU','UB'], psu:'final', power:true, powerAt:-1, gen:{f:1000, bal:4, unb:-7.8}, load:600,
  trim:[[0.42,0.42],[0.55,0.55]], mono:false, log:[] };
const FACT = JSON.parse(JSON.stringify(D));
const dB = g=>20*Math.log10(g);
const swingLoss=1.5;
function gBU(s,f){ const Ra=Math.max(1e-3,f*s.RV), Rb=Math.max(1e-3,(1-f)*s.RV), k=(1/Ra)/(1/Ra+1/Rb+1/s.Rt); return (1/s.Rin)/(1/s.Rf+k/s.Rt); }
function gUB(s,f){ const Rsh=s.R11+(1-f)*s.RV; return (s.R9+s.R13+s.R9*s.R13/Rsh)/s.R5; }
const P = ()=>PSU[D.psu];
function railAt(t){ if(!D.power) return 0; const r=P().rail; if(!r) return 0; if(D.powerAt>=0 && t<D.powerAt) return 0;
  const dt = D.powerAt<0? 1 : t-D.powerAt; const dly = D.psu==='xfmr'?0.004:0.02, tau = D.psu==='xfmr'?0.01:0.004;
  return (dt<dly?0:r*(1-Math.exp(-(dt-dly)/tau))) + P().rpp/2*Math.sin(2*Math.PI*P().ripple*t); }
const lim = t=>Math.max(0, railAt(t)-swingLoss);
const w = t=>Math.sin(2*Math.PI*D.gen.f*t);
// a slot is a stereo path; returns {in, out} levels and waveforms for channel ch (0 L, 1 R)
function slotPath(k, ch, t){
  const s=SUB[D.slots[k]], f=D.trim[k][ch], L=lim(t==null?1:t);
  if (!s.Rin && !s.R9) return null;
  if (s.Rin){ const vin=dbu2v(D.gen.bal)*Math.SQRT2*(t==null?1:w(t)), g=gBU(s,f);
    const r=clamp(-0.5*vin,-L,L), o=clamp(-g*r,-L,L)*10000/10030; return {kind:'BU', vin, o, g:g*0.5, inL:D.gen.bal, outL:D.gen.bal+dB(g*0.5), clipAt:v2dbu(L/Math.SQRT2)}; }
  const vin=dbu2v(D.gen.unb)*Math.SQRT2*(t==null?1:w(t)), g=gUB(s,f), n=clamp(-g*vin,-L,L), p=clamp(n*-1,-L,L);
  return {kind:'UB', vin, o:(p-n)*D.load/(D.load+60), g:2*g, inL:D.gen.unb, outL:D.gen.unb+dB(2*g)+dB(D.load/(D.load+60)), clipAt:v2dbu(L/Math.SQRT2)+6.02+dB(D.load/(D.load+60))};
}
function slotLevels(k,ch){ const p=slotPath(k,ch,null); if(!p) return null; const s=SUB[D.slots[k]], L=lim(1), lc=v2dbu(L/Math.SQRT2);
  if (p.kind==='BU'){ const g=gBU(s,D.trim[k][ch]); const ssm=p.inL-6.02, u=ssm+dB(g); return {p, clip:u>lc+0.01||ssm>lc+0.01, stages:[
    {name:'XLR in (balanced)', lvl:p.inL, gain:null, clip:lc+6.02},{name:'SSM2143 (−6 dB)', lvl:ssm, gain:-6.02, clip:lc},
    {name:`NE5532 + T trim (R in ${s.Rin}, Rf ${s.Rf/1000}K, 2K)`, lvl:u, gain:dB(g), clip:lc, note:`${fdb(dB(gBU(s,0)))} … ${fdb(dB(gBU(s,1)))} dB`},{name:'30R → RCA out', lvl:u, gain:0, clip:lc}]}; }
  const g=gUB(s,D.trim[k][ch]), n=p.inL+dB(g); return {p, clip:n>lc+0.01, stages:[
    {name:'RCA / jack in', lvl:p.inL, gain:null, clip:null},{name:`NE5532 T stage (R13 ${s.R13/1000}K)`, lvl:n, gain:dB(g), clip:lc, note:`${fdb(dB(gUB(s,0)))} … ${fdb(dB(gUB(s,1)))} dB/leg`},
    {name:'unity inverter → 2nd leg', lvl:n+6.02, gain:6.02, clip:lc+6.02},{name:'2 × 30R → XLR / Phoenix', lvl:p.outL, gain:dB(D.load/(D.load+60)), clip:p.clipAt}]};
}
function cost(){ const c=CONFIG[D.cfg]; if (D.cfg==='BOX') return null; return 36.2178 + D.slots.reduce((a,s)=>a+(SUB[s].cost||0),0); }

/* ---------------- actions ---------------- */
const act = makeActor(D, ()=>`${CONFIG[D.cfg].name} · ${P().name.split(':')[0]} · rails ±${P().rail} V`);
const A = {
  cfg(k){ act(`Build → ${CONFIG[k].name}`, tr=>{ const c=CONFIG[k]; D.cfg=k; D.slots=c.slots.slice(); D.psu=c.psu;
    tr(`Main board SA-POD1-MAIN, slot A (H1/H2) = ${SUB[D.slots[0]].name}, slot B (H3/H4) = ${SUB[D.slots[1]].name}`);
    tr(`Supply: ${P().name} — ${P().note}`);
    if (k==='POD18'||k==='MUT18') tr('Same main board as POD1: only the sub-boards and the rear panel (4 male XLRs) change — goal 1 of details.txt');
    if (k==='BOX') tr('Black box: one POD1-3 with its own SUW1R5, micro-USB, Phoenix TB1–TB4, 3.5 mm jack and the mono-sum U3/U4 fitted'); }); },
  slot(k){ act(`Swap sub-board in slot ${'AB'[k]}`, tr=>{ const order = D.cfg.startsWith('MUT')||D.cfg==='OLD18'? ['BUm','UBm','none'] : ['BU','UB','none']; const o=D.slots[k]; D.slots[k]=order[(order.indexOf(o)+1)%order.length];
    tr(`${SUB[o].name} → ${SUB[D.slots[k]].name} on ${k?'H3/H4':'H1/H2'}`);
    const c=CONFIG[D.cfg]; if (c.xlr[k]){ const need = SUB[D.slots[k]].Rin ? 'in' : SUB[D.slots[k]].R9 ? 'out' : null; if (need && need!==c.xlr[k]) tr(`<b style="color:var(--warn)">The ${c.panel.toUpperCase()} rear panel has ${c.xlr[k]==='in'?'female (input)':'male (output)'} XLRs here: this sub-board needs ${need==='in'?'inputs':'outputs'}. Every XLR footprint carries both IN x+ and OUT x+, so the board would work but the connector gender and silk would be wrong.</b>`); } }); },
  psu(k){ act(`Supply → ${PSU[k].name}`, tr=>{ D.psu=k; tr(PSU[k].note); tr(PSU[k].rail? `Op-amp swing ±${(PSU[k].rail-swingLoss).toFixed(1)} V → max balanced out ${fdb(v2dbu((PSU[k].rail-swingLoss)/Math.SQRT2)+6.02)} dBu (open circuit)` : 'No rails: every output is dead, but the power LED (on DC+) still lights'); }); },
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t; tr('Scrub forward 30 ms to watch the rails rise'); } }); },
  trim(k,ch,dir){ act(`Turn slot ${'AB'[k]} ${ch?'R':'L'} trim ${dir>0?'CW':'CCW'}`, tr=>{ const o=D.trim[k][ch]; D.trim[k][ch]=clamp(+(o+dir*0.04).toFixed(3),0,1); const p=slotPath(k,ch,null);
    if (p) tr(`${SUB[D.slots[k]].short}: path gain now ${fdb(dB(p.g))} dB → output ${fdb(p.outL)} dBu`); }); },
  set(k,v,l){ act(l, tr=>{ if (k in D.gen) D.gen[k]=v; else D[k]=v; tr('Every stage level follows'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};

/* ---------------- drawings ---------------- */
// the POD1-1 main board with its two sub-board slots (layout schematic; outline proportions from the POD1-1 ISS2 schematic connectors — inferred, the DWG dimensions could not be read)
function boardSVG(){
  const sl=(k,x)=>{ const s=SUB[D.slots[k]], on=D.slots[k]!=='none';
    return `<g class="slot${k}" style="cursor:pointer"><title>Click to swap the sub-board in slot ${'AB'[k]}</title><rect x="${x}" y="40" width="250" height="150" rx="6" fill="${on?(s.Rin?'#2f6f4f':'#2f4f7f'):'transparent'}" stroke="${on?'#cfd':'var(--line)'}" stroke-dasharray="${on?'':'6 4'}" stroke-width="2"/>
      <text x="${x+125}" y="80" text-anchor="middle" font-size="15" font-weight="700" fill="${on?'#fff':'var(--ink2)'}">${on?s.name.split(' (')[0]:'empty'}</text><text x="${x+125}" y="102" text-anchor="middle" font-size="12" fill="${on?'#dfe':'var(--ink2)'}">${s.short}</text>
      ${on?`<text x="${x+125}" y="124" text-anchor="middle" font-size="11" fill="#dfe">${s.Rin?'SSM2143 ×2 + NE5532':'NE5532 ×2'} · RV1/RV2 5K</text>`:''}
      <rect x="${x+20}" y="176" width="90" height="10" fill="#c9a640"/><rect x="${x+140}" y="176" width="90" height="10" fill="#c9a640"/><text x="${x+65}" y="205" text-anchor="middle" font-size="10" fill="var(--ink2)">${k?'H3':'H1'}</text><text x="${x+185}" y="205" text-anchor="middle" font-size="10" fill="var(--ink2)">${k?'H4':'H2'}</text></g>`; };
  return `<svg viewBox="0 0 860 300" style="width:100%;max-width:900px"><rect x="10" y="10" width="840" height="280" rx="10" fill="#1d5a3a" opacity=".25" stroke="var(--line)"/>
    <text x="24" y="30" font-size="12" font-weight="700" fill="var(--ink)">SA-POD1-MAIN (POD1-1 ISS2) — layout sketch (inferred, not to scale)</text>
    ${sl(0,30)}${sl(1,300)}
    <g><rect x="580" y="40" width="250" height="70" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="595" y="62" font-size="12" font-weight="700" fill="var(--ink)">PSU</text><text x="595" y="80" font-size="11" fill="var(--ink2)">${P().name.split(':').pop().trim().slice(0,38)}</text><text x="595" y="97" font-size="11" fill="${P().rail?'var(--accent)':'var(--bad)'}">rails ${P().rail?'±'+P().rail+' V':'DEAD'}</text></g>
    <g><rect x="580" y="125" width="250" height="65" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="595" y="146" font-size="12" font-weight="700" fill="var(--ink)">Connectors</text><text x="595" y="163" font-size="11" fill="var(--ink2)">XLR1–4 (IN x+ and OUT x+ on each)</text><text x="595" y="179" font-size="11" fill="var(--ink2)">RCA1 quad 04P0605 · P1/P2 mains</text></g>
    <text x="30" y="250" font-size="11" fill="var(--ink2)">Click a slot to swap its sub-board. ${D.cfg==='BOX'?'Black box: the sub-board stands alone, no main board.':''}</text></svg>`;
}
function panelFor(side){
  const c=CONFIG[D.cfg];
  if (c.panel==='box') return `<svg viewBox="0 0 860 200" style="width:100%;max-width:900px"><rect x="20" y="20" width="820" height="160" rx="10" fill="var(--dev)"/>
    ${[0,1,2,3].map(i=>`<rect x="${60+i*120}" y="70" width="100" height="50" rx="4" fill="#26a356"/><text x="${110+i*120}" y="140" text-anchor="middle" font-size="12" fill="#ddd">${['TB1 IN','TB2 OUT A','TB3 OUT B','TB4 MONO'][i]}</text>`).join('')}
    <rect x="560" y="80" width="50" height="26" rx="4" fill="#888"/><text x="585" y="140" text-anchor="middle" font-size="12" fill="#ddd">micro-USB 5 V</text>
    <circle cx="680" cy="93" r="18" fill="#222" stroke="#999" stroke-width="3"/><text x="680" y="140" text-anchor="middle" font-size="12" fill="#ddd">3.5 mm J1</text>
    ${led(780,93,D.power,'#9be35a',10)}<text x="780" y="140" text-anchor="middle" font-size="12" fill="#ddd">LED1</text>
    <text x="40" y="45" font-size="12" fill="#bbb">Black box — drawn from the BOM part list only; no mechanical drawing is archived (inferred)</text></svg>`;
  const pre=c.panel;
  if (side==='front'){ let over=rocker(D.power)+pled(D.power);
    [[791,0,0],[990,0,1],[1316,1,0],[1514,1,1]].forEach(([x,k,ch])=>{ over+=trim(x,195,D.trim[k][ch],`tr${k}${ch}`,`slot ${'AB'[k]} ${ch?'R':'L'}`); });
    return panelSVG(pre,'front',{over},'front panel (reused '+pre.toUpperCase()+' silkscreen)'); }
  const male=[c.xlr[0]!=='in', c.xlr[0]!=='in', c.xlr[1]!=='in', c.xlr[1]!=='in'];
  const over = (pre==='pod1'? xlr(209,155,true)+xlr(448,155,true)+xlr(930,155,false)+xlr(1168,155,false) : xlr(209,155,true)+xlr(448,155,true)+xlr(930,155,true)+xlr(1168,155,true))
    + rca(650,98,'#c8312a')+rca(650,208,'#eee')+rca(759,98,'#c8312a')+rca(759,208,'#eee')+iec(1385,28,1611,252);
  return panelSVG(pre,'rear',{over},'rear panel (reused silkscreen)');
}
function bindAll(root){
  [0,1].forEach(k=>root.querySelectorAll('.slot'+k).forEach(g=>g.onclick=()=>A.slot(k)));
  const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power();
  [0,1].forEach(k=>[0,1].forEach(ch=>bindTrim(root,`tr${k}${ch}`,d=>A.trim(k,ch,d))));
  const g=s=>root.querySelector(s);
  if (g('#cf')) g('#cf').onchange=e=>A.cfg(e.target.value);
  if (g('#ps')) g('#ps').onchange=e=>A.psu(e.target.value);
  if (g('#gB')) g('#gB').onchange=e=>A.set('bal',+e.target.value,'Balanced source → '+e.target.value+' dBu');
  if (g('#gU')) g('#gU').onchange=e=>A.set('unb',+e.target.value,'Consumer source → '+e.target.value+' dBu');
}
function controlsHTML(){ return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;margin:8px 0" class="small">
  <label>Build <select id="cf">${Object.keys(CONFIG).map(k=>`<option value="${k}" ${k===D.cfg?'selected':''}>${CONFIG[k].name}</option>`).join('')}</select></label>
  <label>Supply <select id="ps">${Object.keys(PSU).map(k=>`<option value="${k}" ${k===D.psu?'selected':''}>${PSU[k].name}</option>`).join('')}</select></label>
  <label>Balanced source <input id="gB" type="number" value="${D.gen.bal}" style="width:60px"> dBu</label><label>Consumer source <input id="gU" type="number" value="${D.gen.unb}" style="width:60px"> dBu</label></div>`; }
bindKeys('__rd64Active', ()=>({q:()=>A.trim(0,0,-1),w:()=>A.trim(0,0,1),e:()=>A.trim(0,1,-1),r:()=>A.trim(0,1,1),a:()=>A.trim(1,0,-1),s:()=>A.trim(1,0,1),d:()=>A.trim(1,1,-1),f:()=>A.trim(1,1,1)}));

/* ---------------- timeline ---------------- */
const dense=(span,pw)=>span*D.gen.f>pw/3;
const envOf=fn=>{ const e=t=>{ let m=0; const P_=1/D.gen.f; for(let i=0;i<8;i++) m=Math.max(m,Math.abs(fn(t+P_*i/8))); return m; }; e.dense=dense; return e; };
function lanes(){
  const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn');
  const L=[{label:'Supply switching / ripple', h:22, draw(c,X,t0,t1,y,h){ if(!P().rail){ c.fillStyle=SIM.css('--bad'); c.font='11px sans-serif'; c.fillText('converter not running', X(t0)+6, y+15); return; } SIM.pulses(c,X,t0,t1,y,h,1/P().ripple,0,0.3/P().ripple,wn, P().ripple===120?'rectifier charging pulses (120 Hz)':'switching cycles (100 kHz)'); }},
    waveLane('Op-amp rail (+)', t=>railAt(t), 20, null, wn, 26), waveLane('Rail ripple (AC part)', t=>railAt(t)-(P().rail&&D.power?P().rail:0)*(railAt(t)>P().rail*0.9?1:0), -0.0001, null, wn, 26)];
  [0,1].forEach(k=>{ if (!slotPath(k,0,null)) return; const nm=`Slot ${'AB'[k]} (${SUB[D.slots[k]].short})`;
    L.push(waveLane(nm+' in L', t=>slotPath(k,0,t).vin, -0.05, null, b, 32, envOf(t=>slotPath(k,0,t).vin)));
    L.push(waveLane(nm+' out L', t=>slotPath(k,0,t).o, -0.05, null, a, 38, envOf(t=>slotPath(k,0,t).o))); });
  return L;
}
/* ---------------- views ---------------- */
function nowTable(){ return `<table class="kv"><tr><th>Build</th><td>${CONFIG[D.cfg].name}</td></tr><tr><th>Slots</th><td class="mono">A ${SUB[D.slots[0]].short} · B ${SUB[D.slots[1]].short}</td></tr><tr><th>Supply</th><td class="small">${P().name} — ${P().note}</td></tr>
  ${[0,1].map(k=>[0,1].map(ch=>{ const l=slotLevels(k,ch); return l?`<tr><th>Slot ${'AB'[k]} ${ch?'R':'L'} out</th><td class="mono">${fdb(l.p.outL)} dBu ${l.clip?'<b style="color:var(--bad)">CLIP</b>':''} (max ${fdb(l.p.clipAt)})</td></tr>`:''; }).join('')).join('')}
  <tr><th>Parts cost (mutant BOM prices)</th><td class="mono">${cost()==null?'n/a':'$'+cost().toFixed(2)}</td></tr></table>`; }
function viewSim(m){
  window.__rd64Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('The study: one main board, two slots, a choice of supplies',`${controlsHTML()}<div id="bd"></div>`)}${card('Front and rear panel of this build',`<div id="fp"></div><div id="rp" style="margin-top:8px"></div>`)}</div>
    <div>${card('What changed (last action)',`<div id="trace" class="log"></div>`)}${card('This build now',`<div id="now"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable: supply behaviour and both slots',`<canvas id="tl"></canvas>`)}
    <div class="grid2">${card('Levels through each stage (left channels)',`<div id="lv"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ m.querySelector('#bd').innerHTML=boardSVG(); m.querySelector('#fp').innerHTML=panelFor('front'); m.querySelector('#rp').innerHTML=CONFIG[D.cfg].panel==='box'?'':panelFor('rear');
    bindAll(m.querySelector('#bd')); bindAll(m.querySelector('#fp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Pick a build or a supply, or click a slot to swap a sub-board.'); m.querySelector('#now').innerHTML=nowTable();
    m.querySelector('#lv').innerHTML=[0,1].map(k=>{ const l=slotLevels(k,0); return l?`<h3>Slot ${'AB'[k]}: ${SUB[D.slots[k]].name}</h3>${stageTable(l.stages)}`:''; }).join('');
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200}); };
  bindAll(m); SIM.on('time',draw);
}
const LESSONS=[
  {title:'The brief', body:`<p><span class="mono">details.txt</span> (an engineering e-mail): “POD1 and POD18 we are out of circuit boards. POD1 – 13 Finished Goods will remain, POD18 – 5 Finished Goods do remain.” It lists four goals:</p><ol><li>combine the circuits on one PCB;</li><li>convert from through-hole to SMT;</li><li>replace the power transformers with universal power;</li><li>do a competitive analysis.</li></ol><p>This tutorial walks through how the archive answers each one.</p>`, check:()=>true, auto:true},
  {title:'1 · Start from the old POD18', body:`<p>Choose <b>Build: Old POD18 (through-hole)</b>. It has a transformer, a bridge and LM317/LM337 regulators. Zoom the timeline to 10 ms to see the 120 Hz charging pulses.</p>`, check:()=>D.cfg==='OLD18', hint:'Use the Build menu.'},
  {title:'2 · The mutant POD', body:`<p>The first combined attempt (<span class="mono">mutant pod bom.xlsx</span>, Jun 2013) used one <b>Mean Well RPT-60C</b> (5 V 4 A, ±15 V) with SMT sub-boards. Choose <b>Mutant POD as POD1</b>. The ripple is now 100 kHz switching noise of up to 150 mV p-p (Mean Well spec), and the op-amps run directly on it.</p>`, check:()=>D.cfg==='MUT1', hint:'Build → Mutant POD as POD1.'},
  {title:'3 · One board, two products', body:`<p>Choose <b>POD1 kit</b>, then <b>POD18 kit</b>. Only the sub-boards change: POD1 = one BAL2UNB + one UNB2BAL; POD18 = two UNB2BAL. The main board is the same <span class="mono">SA-POD1-MAIN</span>. That is goal 1.</p>`, check:()=>D.cfg==='POD18'&&D.log.some(e=>e.name==='Build → POD1 kit'), hint:'Build → POD1 kit, then Build → POD18 kit.'},
  {title:'4 · Wrong board in the slot', body:`<p>With the POD18 kit, click <b>slot A</b> to put a bal→unbal board in it. The log warns that the POD18 rear panel has male (output) XLRs there. Every XLR footprint carries both IN and OUT nets, so the board itself would accept it.</p>`, check:()=>D.cfg==='POD18'&&D.slots[0]==='BU', hint:'Click the left slot on the board drawing.'},
  {title:'5 · The final supply', body:`<p>Go back to the <b>POD1 kit</b>. Its supply is NFM-10-5 (5 V) → SUW1R5 (±12 V). Now select <b>Supply: Final, as the BOM lists it</b>. Read literally, the BOM part SUW1R5-<b>1212</b> is a 12 V-input converter, which would not start on a 5 V bus (${inf}; the built units evidently worked).</p>`, check:()=>D.cfg==='POD1'&&D.psu==='bom', hint:'Build → POD1 kit, then Supply → Final, as the BOM lists it.'},
  {title:'6 · Headroom cost of ±12 V', body:`<p>Set the supply back to <b>Final (±12 V)</b> and the consumer source to <b>+10 dBu</b>. Turn slot B's left trim up until it clips: the maximum is about +25.6 dBu, against +28 dBu in the old through-hole POD18 manual. This is why the newer POD18 manual says +25 dBu (${inf}).</p>`, check:()=>D.psu==='final'&&slotLevels(1,0)&&slotLevels(1,0).clip, hint:'Supply → Final; consumer source 10; then the S key or the third front trim.'},
  {title:'7 · The black box', body:`<p>Choose <b>Black box</b>. It is one POD1-3 board on its own, with micro-USB power, Phoenix terminals, a 3.5 mm jack and the mono-sum stage fitted. All of these footprints are DNI in the POD kits. The stand-alone SA-BALtoUNBAL was quoted at $46.47 each for 60 pieces (SQ20146, 12/18/15).</p>`, check:()=>D.cfg==='BOX', hint:'Build → Black box.'},
  {title:'Done', body:`<p>See <b>Findings</b> for the costs, the timeline and what the BOMs get wrong.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__rd64Active=true; tutorialView(m,{title:'Tutorial — following the RD64 study', lessons:LESSONS, D, getIdx:()=>lessonIdx, setIdx:i=>lessonIdx=i, reset:()=>A.reset(),
  unitHTML:()=>`${controlsHTML()}${boardSVG()}${panelFor('front')}<div class="small" style="margin-top:6px">${nowTable()}</div>`, bind:bindAll}); }
function viewSecond(m){
  window.__rd64Active=true;
  m.innerHTML=`${card('One second, broken down — per supply option',`<div id="t"></div>`)}<div class="grid2">${card('At the playhead',`<div id="dev"></div>`)}${card('Zoom ladder — slot B output',`<canvas id="zl"></canvas>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#t').innerHTML=`<table class="kv"><tr><th>Supply</th><th>Events per second</th><th>Ripple on the op-amp rails</th><th>Max balanced out</th><th>Universal input?</th></tr>${Object.keys(PSU).map(k=>{const p=PSU[k]; return `<tr class="${k===D.psu?'hl':''}"><td>${p.name}</td><td class="mono">${p.ripple?p.ripple.toLocaleString()+(p.ripple===120?' charging pulses':' switching cycles'):'—'}</td><td class="mono">${p.rail?(p.rpp*1000).toFixed(1)+' mV p-p':'—'}</td><td class="mono">${p.rail?fdb(v2dbu((p.rail-swingLoss)/Math.SQRT2)+6.02)+' dBu':'dead'}</td><td>${p.univ?'yes':'no (115/230 strapping)'}</td></tr>`;}).join('')}</table>
      <p class="small muted">Ripple figures: RPT-60C from the Mean Well sheet (150 mV p-p max on −15 V). The others are ${inf}: LM317 ≈ 65 dB rejection of about 0.7 V raw ripple; SUW1R5 ≈ 20 mV p-p. The tone is ${D.gen.f} Hz, i.e. ${D.gen.f} cycles in this second.</p>`;
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>Rail</th><td class="mono">${railAt(t).toFixed(4)} V</td></tr>${[0,1].map(k=>{const p=slotPath(k,0,t); return p?`<tr><th>Slot ${'AB'[k]} L</th><td class="mono">in ${p.vin.toFixed(3)} V → out ${p.o.toFixed(3)} V</td></tr>`:'';}).join('')}</table>`;
    if (slotPath(1,0,t)) drawLadder(m.querySelector('#zl'),t,[['1 second',1],['100 ms',0.1],['10 ms',0.01],['1 tone cycle',1/D.gen.f],['20 µs (two 100 kHz cycles)',2e-5]],tt=>slotPath(1,0,tt).o,-0.05,'volts'); };
  SIM.on('time',draw);
}
const BLOCKS={
  goal:{x:20,y:20,w:200,h:90,t:'details.txt (goals)',s:['1 one PCB  2 SMT','3 universal power','4 competitive analysis'],d:'An engineering e-mail (file date 21 Feb 2013|46). It notes that 13 POD1 and 5 POD18 finished goods remain, and that the PCBs have run out.'},
  mut:{x:20,y:140,w:200,h:90,t:'Mutant POD (Jun 2013)',s:['RPT-60C ±15 V / 5 V','SMT bal→unbal / unbal→bal','Multisim 10 models'],d:'The first combined design: legacy P-CAD boards (POD1-ISS1.pcb, POD18iss3.pcb, AA6201Aiss5) plus new Altium sheets, Multisim files (aa6201, asl, “new bal to unbal circuit”, “unbal to bal”) and a costed BOM: POD1 configuration $46.44, POD18 configuration $43.11.'},
  box:{x:20,y:260,w:200,h:90,t:'Black box (Oct 2013)',s:['POD1-3 stand-alone','USB 5 V → SUW1R5','mono sum U3/U4 fitted'],d:'BLACK BOX MASTER BOM.xlsx: the unbal→bal board fully loaded, with Phoenix terminals, a 3.5 mm jack, micro-USB, an LED and the mono-sum stage.'},
  main:{x:280,y:80,w:220,h:110,t:'SA-POD1-MAIN (POD1-1)',s:['NFM-10-5 + SUW1R5','H1–H4 slots','XLR1–4, quad RCA'],d:'The final main board, used by both products.'},
  bu:{x:280,y:230,w:220,h:70,t:'SA-POD1-BAL2UNB (POD1-2)',s:['SSM2143 ×2 + NE5532'],d:'Balanced → unbalanced, −19 … −0.6 dB.'},
  ub:{x:280,y:320,w:220,h:70,t:'SA-POD1-UNB2BAL (POD1-3)',s:['NE5532 ×2 (+U3/U4 DNI)'],d:'Unbalanced → balanced, +9.3 … +24.5 dB.'},
  p1:{x:560,y:60,w:170,h:70,t:'POD1 kit',s:['MAIN + BAL2UNB + UNB2BAL','2 F + 2 M XLR'],d:'BOM “POD1”.'},
  p18:{x:560,y:170,w:170,h:70,t:'POD18 kit',s:['MAIN + 2 × UNB2BAL','4 M XLR'],d:'BOM “POD18”.'},
  sa:{x:560,y:290,w:170,h:80,t:'SA-BALtoUNBAL quote',s:['SQ20146, 12/18/15','60 pcs @ $46.47'],d:'Assembly quote for the stand-alone bal→unbal: $2,788.20 plus $480 stencil NRE and $100 “Programming”. The customer supplies the PCBs.'},
};
const WIRES=[['goal','mut',''],['mut','main','Altium ISS2'],['mut','box',''],['main','p1',''],['main','p18',''],['bu','p1',''],['ub','p1',''],['ub','p18','×2'],['bu','sa',''],['ub','box','']];
function viewBlock(m){ window.__rd64Active=false; blockView(m,BLOCKS,WIRES,'main',[750,410],card('In one sentence',`<p>RD64 replaced two through-hole, transformer-powered products with one SMT main board and two plug-in sub-boards on a universal supply. The sub-boards can also be built as stand-alone boxes.</p>`)); }
const SHEETS=[
  {name:'1 · Slot wiring (POD1-1)', note:'From the POD1-1 ISS2 main-board sheet: each 12-way header pair carries the signals and ±12 V to a sub-board. XLR footprints carry both IN x+ and OUT x+.', svg:()=>
    chip(190,80,150,'H1 / H3 (signals)',[['1','OUT A+ / C+'],['2','IN/OUT A− / C−'],['3','IN A+ / C+'],['6','OUT B+ / D+'],['7','IN/OUT B− / D−'],['8','IN B+ / D+']],[],'slot A / slot B')
    +chip(560,80,170,'H2 / H4 (power, RCA)',[['1','VCC+12'],['2','VCC−12'],['6','IN/OUT A / C'],['10','IN/OUT B / D'],['3–5, 7–9, 11–12','GND']],[],'')
    +chip(330,300,180,'XLR1…4 (one footprint)',[['2 (+)','IN x+ and OUT x+'],['3 (−)','IN/OUT x−'],['1','GND']],[],'NC3FD-H or NC3MD-H') },
  {name:'2 · Supply options', note:'NFM-10-5 / SUW1R5 from POD1-1; RPT-60C from the mutant BOM and the Mean Well sheet; through-hole from POD18ISS2.net.', svg:()=>
    chip(180,60,160,'Through-hole',[['T1 TE70043','mains'],['D1–D4','bridge']],[['LM317','+18V'],['LM337','−18V']],'POD18 ISS2/3')
    +chip(180,200,160,'RPT-60C',[['L/N','90–264 VAC']],[['V1','+5 V 4 A'],['V2','+15 V 1.5 A'],['V3','−15 V 0.5 A']],'Mean Well, 100 kHz')
    +chip(580,60,160,'NFM-10-5 → SUW1R5',[['AC/L, AC/N','mains']],[['V+','DC+ 5 V'],['SUW1R5','VCC±12']],'final POD1-1')
    +txt(60,320,'SUW1R5 family: the input voltage is in the suffix (05/12/24). The BOM orders SUW1R5-1212 for a 5 V bus.',11.5,'var(--bad)') },
];
function viewSchem(m){ window.__rd64Active=false; schemView(m,SHEETS,'RD64','The Altium project POD_1_18.PrjPcb (Sheet1.SchDoc, Balanced-Unbalanced.SchDoc), the PCB/backup1–13 snapshots and the mutant-POD Multisim files are binary and are not redrawn here. The circuit sheets for the sub-boards are in the POD1 plugin.'); }
function viewSoft(m){
  window.__rd64Active=true;
  m.innerHTML=`${card('No firmware — what each build option changes, live',`<div id="f"></div>`)}<div class="grid2">${card('Cost per configuration (mutant BOM, Jun 2013)',`<div id="c"></div>`)}${card('0R links: which path each BOM selects',`<div id="j"></div>`)}</div>`;
  const draw=()=>{
    const st=[{t:'Mains',s:[P().univ?'90–264 VAC':'115 / 230 strapped']},{t:'Supply',s:[P().name.split(':').pop().trim().slice(0,22),P().rail?'±'+P().rail+' V':'dead'],bad:!P().rail},{t:'Slot A',s:[SUB[D.slots[0]].short, slotLevels(0,0)?fdb(slotLevels(0,0).p.outL)+' dBu':'—']},{t:'Slot B',s:[SUB[D.slots[1]].short, slotLevels(1,0)?fdb(slotLevels(1,0).p.outL)+' dBu':'—']},{t:'Panel',s:[CONFIG[D.cfg].panel.toUpperCase()]}];
    m.querySelector('#f').innerHTML=flowSVG(st,1);
    m.querySelector('#c').innerHTML=`<table class="kv"><tr><th>Group</th><th>Cost</th></tr><tr><td>Parts on all units (XLR, RPT-60C $20.62, RCA, rocker, inlet, USB, jacks, headers)</td><td class="mono">$36.22</td></tr><tr><td>Bal→unbal board parts</td><td class="mono">$6.77</td></tr><tr><td>Unbal→bal board parts</td><td class="mono">$3.45</td></tr><tr><td><b>POD1 configuration</b></td><td class="mono">$46.44</td></tr><tr><td><b>POD18 configuration</b></td><td class="mono">$43.11</td></tr><tr><td>SA-BALtoUNBAL assembled (quote, 60 pcs)</td><td class="mono">$46.47 + NRE</td></tr></table>`;
    m.querySelector('#j').innerHTML=`<table class="kv"><tr><th>Board / BOM</th><th>0R fitted</th><th>Meaning on the ISS3 sheet</th></tr>
      <tr><td>UNB2BAL in POD1 (ISS2 BOM)</td><td class="mono">R2, R4, R24, R31</td><td class="small">R2/R4 = HDR IN A/B ✓; R24 = HDR OUT B−, R31 = PHX OUT B+ (mixed!)</td></tr>
      <tr><td>Black box</td><td class="mono">R1, R3, R21, R22, R24, R26, R29, R31</td><td class="small">R26 is a 30R build-out on ISS3, not a link → ISS2 numbering</td></tr>
      <tr><td>BAL2UNB in POD1</td><td class="mono">R1, R3, R5, R7</td><td class="small">on ISS3 these are the PHX IN links; HDR IN links R2/R4/R6/R8 are DNI</td></tr></table><p class="small muted">The BOM is for ISS2 (May 2014) and the sheet is ISS3 (Aug 2015 / Feb 2016). Reference designators changed between issues, so the 0R list can't be checked against ISS3 (${inf}).</p>`; };
  SIM.on('time',draw);
}
function viewNotes(m){ window.__rd64Active=false;
  m.innerHTML=card('What RD64 shows — findings',`<ol>
   <li><b>When it ran.</b> The README gives no date. The file dates trace it: <span class="mono">details.txt</span> 21 Feb 2013 → mutant-POD BOM 14 Jun 2013 → black-box BOM 4 Oct 2013 → POD1 test 4 Nov 2013 → POD1 kit BOM 28 May 2014 → POD1-2 ISS3 sheet 10 Aug 2015 → SA-BALtoUNBAL quote 18 Dec 2015 → POD1-3 ISS3 sheet 5 Feb 2016. So RD64 ran from 2013|46 to 2016|49.</li>
   <li><b>Goal 1 was met with one main board.</b> <span class="mono">SA-POD1-MAIN</span> is used by both kits. POD1 = MAIN + BAL2UNB + UNB2BAL with 2 female + 2 male XLRs; POD18 = MAIN + 2 × UNB2BAL with 4 male XLRs. The XLR footprints carry both IN and OUT nets.</li>
   <li><b>The DC-DC part number and the bus disagree.</b> Every final BOM (main board, BAL2UNB, UNB2BAL, black box) orders <span class="mono">SUW1R5-1212</span>, normally read as the 12 V-input part, but the bus is 5 V (NFM-10-5, or USB in the black box). POD13A and POD14A use the same line on a 5 V bus, and POD13A's test procedure measures ±12 V out, so the stock code evidently stood for a part that works from 5 V. The “as the BOM lists it” supply option shows the literal reading (${inf}).</li>
   <li><b>Universal power cost headroom.</b> The old POD18 ran ±18 V (older manual: +28 dBu max out). The mutant POD's RPT-60C gives ±15 V; the final SUW1R5 gives ±12 V, about +25.6 dBu max. The POD18 manual was later reissued with +25 dBu (${inf}).</li>
   <li><b>The mutant POD put a 60 W supply in a box that needs about 1 W.</b> RPT-60C (5 V 4 A, ±15 V) cost $20.62, more than half of the $36.22 common parts. The final NFM-10-5 (10 W) + SUW1R5 (1.5 W) is much smaller.</li>
   <li><b>The jumper BOM uses ISS2 reference designators.</b> In the POD1 kit BOM the fitted 0R links (R2, R4, R24, R31 on UNB2BAL; R1, R3, R5, R7 on BAL2UNB) do not make sense against the ISS3 sheets, where R26 is a 30R build-out. The designators were renumbered between ISS2 and ISS3, so the BOM must not be used with ISS3 boards (${inf}).</li>
   <li><b>The stand-alone quote includes “Programming”.</b> SQ20146 has $100 for programming on an all-analog board with no programmable part. It is probably the assembler's pick-and-place program set-up charge (${inf}).</li>
   <li><b>Sub-boards are built for both uses.</b> POD1-2/POD1-3 carry a micro-USB input, their own SUW1R5 and LED, Phoenix terminals and a 3.5 mm jack, all DNI in the POD kits. A drafting note asks for the 5K trims to fit on the board's underside, so the same board serves the front-panel trims of a POD.</li>
   <li><b>Leftovers.</b> <span class="mono">temp-pcb.dat</span> is a P-CAD component dump, not code. <span class="mono">“(Security copy)”</span> files are Multisim auto-backups. <span class="mono">PCB/backup1…13</span> are Altium snapshots. The micro-USB DWGs (<span class="mono">MICROUSB*.dwg</span>) belong to the black-box variant.</li></ol>`)
  +card('Assumptions',`<ul class="small"><li>Supply ripple other than the RPT-60C figure, rail rise times and the 1.5 V swing loss are ${inf}.</li><li>The main-board drawing is a layout sketch, not to scale: the DWG dimension drawings could not be read here.</li><li>Black-box panel drawn from its BOM part list (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>details.txt · mutant POD/mutant pod bom.xlsx · mutant POD/RPT-60-spec-32191.pdf</li><li>PCB/BLACK BOX MASTER BOM.xlsx · PCB/POD1 MASTER BOM with jumpers.xlsx</li><li>POD 1 - POD 18 POD 14- AB  #SA BALtoUNBAL - #Master/SA-BALtoUNBAL - QUOTE/SA-BALtoUNBAL - QUOTE SQ20146.pdf</li><li>../POD1 - #Master ISS3 schematics · ../POD18 - #Master/POD18 - #Engineering/PCB/OBSOLETE/POD18ISS2.net</li><li>Panels: assets/pod1-*.png and assets/pod18-*.png (POD1 and POD18 silkscreen)</li></ul>`); }

SIM.register({
  id:'pod1-pod18-redesign', name:'POD1–POD18 redesign (RD64) · one SMT board family for two products (2013|46)', duration:1,
  product:'POD1–POD18 redesign (RD64)', year:2013, family:'POD series', folder:'#POD #SERIES/POD1  - POD18 - Redesign #RD #RD64',
  summary:'R&D project that merged POD1 and POD18 onto one SMT main board with plug-in bal→unbal and unbal→bal sub-boards, and replaced their transformers with universal-input supplies. The model lets you switch build, sub-boards and supply and see levels, headroom and ripple change.',
  highlights:['Swap sub-boards in the two main-board slots','Compare transformer, RPT-60C and NFM-10-5 + SUW1R5 supplies','Headroom cost of ±12 V rails','Costs and the stand-alone quote','BOM vs schematic mismatches'],
  depth:'Hardware model',
  stepUnits:[{label:'1 tone cycle',period:()=>1/D.gen.f},{label:'1 ripple cycle',period:()=>P().ripple?1/P().ripple:0.01},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms'],[2e-5,'20 µs (switching)']], defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: the RD64 study',render:viewTutorial},{id:'second',label:'One second, per supply',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
