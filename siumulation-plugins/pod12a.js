/* =====================================================================
   POD12A — Digital audio (AES) distribution amplifier, Ward-Beck Systems (ISS2, 2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html). Full model of the AT90CAN128 MCU firmware and the
   Cyclone EP1C3 FPGA design. Corrected 2026|59 (see pod12.js): both programs are archived in the obsolete POD12 folder.

   Sources used (folder #POD #SERIES/POD12A - #Master):
   - POD12A - #ISS2 #GERBER.zip → POD12-iss2-net.ipc (IPC-D-356A netlist, 15 Dec 2013: every net name used here)
   - POD12A - BOM/POD12A - MASTER BOM.xlsx (SA-POD12A-MAIN, TB-75, TB-110, POD12A/75, POD12A/110)
   - POD12A - #ARTWORK #DA #2016/POD12A-FRONT&REAR-SILK (CURVE).cdr — converted to PDF with Inkscape (libcdr) and cut with
     tools/silk_extract.py; in this conversion the cut-out outlines came out as ink, so the drawn parts cover them
   - POD12A - #ARTWORK #DA #2016/Pics/POD12A Front.jpg, POD12A-75 Rear.jpg, POD12A-110 Rear.jpg
   - #POD #SERIES/XXX - POD12 - #Master #OBSOLETE/POD12 - #Engineering/POD12 - #Software/…/#V020000/ (v100w.c, D6202B.c,
     cs84xx.c, altera.c: MCU V020000) and POD12 - Update - #RD #RD77/Software/Atmel/backup1/v100 (earlier MCU build)
   - .../POD12 - Update - #RD #RD77/Software/FPGA/v100/D6201A.bdf, .qsf, *.vhd (FPGA "D6201BV100")
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
  /* CorelDRAW artwork (Artwork 2026|59): <prefix>-front.svg = GREEN + WHITE plates on the panel, -rear.svg = rear WHITE plate */
  return `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${label||''}" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="glow${side}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${PW}" height="${PH}" rx="10" fill="var(--dev)"/>
    ${inner.under||''}
    <image href="${ASSET}${prefix}-${side}.svg" width="${PW}" height="${PH}"/>
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

const PREFIX='pod12a';
/* ---------------- firmware facts (Corrected 2026|59, see pod12.js) ----------------
   MCU: V020000 in #POD #SERIES/XXX - POD12 - #Master #OBSOLETE/POD12 - #Engineering/POD12 - #Software/…/#V020000/
        (v100w.c, D6202B.c, cs84xx.c, altera.c; 27 Jan 2014), earlier v100 in POD12 - Update - #RD #RD77/Software/Atmel/backup1/v100
   FPGA: D6201A Quartus project in RD77/Software/FPGA/v100 (D6201A.bdf/.qsf, i2s8416_aes.vhd, sw2x2x1x24.vhd, i2s_par.vhd) */
const hex2 = v=>(v&255).toString(16).toUpperCase().padStart(2,'0');
const bin8 = v=>(v&255).toString(2).padStart(8,'0');
const kHz = f=>(f/1000).toFixed(f%1000?1:0)+' kHz';
const XTAL = 8e6;                                    // v100w.c: "Crystal: 8.0000Mhz" (X2)
const BYTE = 8*14.5 + 15;                            // bit-banged byte ≈ 131 cycles (counted from altera.lis / cs84xx.lis; call overhead estimated)
const RD8416 = 3*BYTE + (8*14 + 15) + 22, WR8416 = 3*BYTE + 14;
const STEPS = [  // v100w.c main() while(1)
  {n:'CS8416_READ_LOCK_ALL', c:()=>2*RD8416+20, d:'WDR; reads register 0x0C (RERR) of U5 then U6 over the bit-banged port C bus; 0 = locked. Astatus = INVERT_DATA(status).'},
  {n:'PROCESS_MODES', c:()=> (input2Active()?2:1)*WR8416+30, d:'WDR; rewrites CS8416 register 0x04 every pass: 0x80 (RXP0 = flat IN) or 0x89 (RXP1 = IN_EQ), for each active input.'},
  {n:'READ_DIP_SWITCHES', c:()=>45, d:'MIRROR(PINA): PA7..PA4 → bits 0..3, inverted (ON grounds the pin = 1).'},
  {n:'REFRESH_LEDS', c:()=>70, d:'LOCK/NO LOCK/EQ per active input, 1X8/1X4 from mode, SRC_LED from src_is_active.'},
  {n:'ALTERA_write', c:()=>120+2*BYTE+10, d:'WDR; recomputes mode/EQ from the DIP, builds data_upper/data_lower, shifts 16 bits into the FPGA (FPGA3 data, FPGA4 clock) and strobes FPGA2.'},
];
const K = { startup:0.0041, wait3000:(3000*7+8)/XTAL, altReset:(1000*7+10)/XTAL, fpgaCfg:0.040, initRegs:7*(WR8416+10)/XTAL, lockT:0.020,
  srcMaxFs:24.576e6/138, srcDelay:0.0030, fpgaLat:2 };   // start-up, FPGA config, lock time, AD1895 limit/delay, FPGA latency: inferred
const REACH = {'75':[300,750],'110':[150,250]};      // POD12A manual (2014): metres without / with EQ
const OUTN=['A1','A2','A3','A4','B1','B2','B3','B4'];
const DIPN=['DUAL','SRC','EQ1','EQ2'];
const MODEN=['OUTPUT_1x8','OUTPUT_2x4','OUTPUT_1x8_SRC'];
const D = { power:true, powerAt:-1, ver:'75', fw:'V020000',
  in:[ { on:true, fs:48000, cable:50, at:-1, f:1000, dbfs:-20 }, { on:true, fs:44100, cable:50, at:-1, f:400, dbfs:-18 } ],
  dip:[0,0,0,0],   // SW1 DUAL, SW2 SRC, SW3 EQ1, SW4 EQ2 (rear legend, confirmed by the firmware); 1 = ON
  log:[] };
const FACT=JSON.parse(JSON.stringify(D));
/* ---------------- firmware model (the same decisions as the C source) ---------------- */
function dipByte(){ let b=0; D.dip.forEach((v,i)=>{ if(v) b|=1<<i; }); return b; }          // MIRROR(PINA)
const modeRaw=()=>dipByte()&0x03;                                                        // mode = dip_switches & 0x03
const mode=()=>{ const m=modeRaw(); return m>=2?2:m; };                                    // ALTERA_write's final else forces OUTPUT_1x8_SRC
const input2Active=()=>mode()===1||mode()===2;                                            // PROCESS_MODES
const dual=()=>mode()===1, srcOn=()=>mode()===2;
const eq1=()=>!!(dipByte()&4);
const eq2=()=>D.fw==='v100' ? (!!(dipByte()&8) && input2Active()) : (!!(dipByte()&8) && modeRaw()===1);
const eqOn=k=>k?eq2():eq1();
function reach(k){ return REACH[D.ver][eqOn(k)?1:0]*Math.sqrt(48000/D.in[k].fs); }      // scaling with fs inferred
let BP=null, BPK='';
function bootPlan(){ const key=D.powerAt+'|'+input2Active(); if (key!==BPK){ BPK=key; BP=bootPlan_(); } return BP; }
function bootPlan_(){ const t0=D.powerAt; let t=t0; const ph=[]; const add=(name,dur,d)=>{ ph.push({name,t0:t,t1:t+dur,d}); t+=dur; };
  add('Reset · oscillator start-up', K.startup, 'fuse bytes not archived ('+inf+')');
  add('port_init · watchdog_init', 40/XTAL, 'PORTC = 0xFF → PC0 high → Q1 → N_CONFIG low: FPGA held blank. CLI(), never SEI().');
  add('wait(3000) × 10', 10*K.wait3000, 'WDR inside each wait');
  add('ALTERA_RESET(1000)', K.altReset, 'PC0 low → N_CONFIG released: EP1C3 loads from U7 M25P40');
  const cfg0=t;
  add('wait(3000) × 20', 20*K.wait3000, '15 of them added “//Ali-Add”');
  add('init_CS8416: reset, wait(3000) × 5', 5*K.wait3000, 'CS8416_RS1/RS2 low');
  add('CS8416_write_ALL regs 00–06', K.initRegs, '00 04 0B BB 80 B0 10');
  add('READ_DIP_SWITCHES · ALTERA_write', (45+STEPS[4].c())/XTAL, 'dashboard_enabled = NO');
  return { ph, cfg:{t0:cfg0,t1:cfg0+K.fpgaCfg}, run:t-(45+STEPS[4].c())/XTAL, loop:t }; }
const passCycles=()=>STEPS.reduce((a,s)=>a+s.c(),0)+4, passT=()=>passCycles()/XTAL;
function stepFr(){ let a=0; const tot=passCycles(); return STEPS.map(s=>{ const r=a; a+=s.c(); return [r/tot,a/tot]; }); }
const powered=t=>D.power && t>=D.powerAt;
function where(t){ if(!powered(t)) return {kind:'off'}; const B=bootPlan();
  if (t<B.loop){ const i=B.ph.findIndex(p=>t>=p.t0&&t<p.t1); return {kind:'boot',i,p:B.ph[i]}; }
  const P=passT(), n=Math.floor((t-B.loop)/P), f=(t-B.loop)/P-n; let s=0; stepFr().forEach((r,j)=>{ if(f>=r[0]) s=j; }); return {kind:'loop',n,step:s,P}; }
function sigOK(k){ const c=D.in[k]; return c.on && c.fs>=30000 && c.fs<=192000 && c.cable<=reach(k); }
function lockedAt(k,t){ if(!powered(t)||!sigOK(k)) return false; return t>=Math.max(bootPlan().run, D.in[k].at)+K.lockT; }   // CS8416 PLL
function lastPass(t,s){ const B=bootPlan(); if(!powered(t)||t<B.loop) return null; const P=passT(), fr=stepFr(); let n=Math.floor((t-B.loop)/P); if (t<B.loop+n*P+fr[s][1]*P) n--; return n; }
const readTime=n=>bootPlan().loop+n*passT()+stepFr()[0][1]*passT();
const seenAt=(k,n)=>n>=0 && lockedAt(k,readTime(n)) && (k===0||input2Active());          // aes1_lock / aes2_lock
const mcuSeen=(k,t)=>{ const n=lastPass(t,4); return n!==null && seenAt(k,n); };
const srcFsOK=()=>D.in[0].fs<=K.srcMaxFs && D.in[1].fs<=K.srcMaxFs && D.in[1].fs/D.in[0].fs<=7.75 && D.in[0].fs/D.in[1].fs<=8;
const srcActive=t=>mode()===2 && mcuSeen(1,t);                                           // src_is_active
function dataLower(t){ let b=0x0C; const n=lastPass(t,4), w=n===null?1:n+2;               // tone_generation1/2 = NO → BIT2, BIT3
  if (w<=4) b&=~0x20; else b|=0x20;                                                     // src_reset until src_reset_count = SRC_CONSTANT
  const m=mode(), a2=n!==null&&seenAt(1,n);
  if (m===0) b&=~(0x10|0x02|0x01); else if (m===1){ b|=0x02; b&=~(0x10|0x01); }
  else if (a2){ b|=0x10|0x04|0x02|0x01; b&=~0x08; } else { b&=~(0x10|0x02|0x01); b|=0x04|0x08; }
  return b; }
function dataUpper(t){ const n=lastPass(t,4); const a1=n!==null&&seenAt(0,n), a2=n!==null&&seenAt(1,n); return ((a1?0:1)<<7)|((a2?0:1)<<6); }
function fpga(t){ const lo=dataLower(t), up=dataUpper(t); return { lo, up, selA:lo&1, selB:(lo>>1)&1, ext1:((lo>>2)&1)?0:1, ext2:((lo>>3)&1)?0:1, swSel:(lo>>4)&1, off1:(up>>7)&1, off2:(up>>6)&1 }; }
function outInfo(o,t){
  if (!powered(t)) return {live:false, why:'power off'};
  const B=bootPlan(); if (t<B.cfg.t1) return {live:false, why:'FPGA not configured ('+inf+')'}; if (t<B.loop) return {live:false, why:'boot: receivers not running yet'};
  const F=fpga(t), sel=o<4?F.selA:F.selB;                     // switch2x1 inst20 (OUT1/OUT2) or inst21 (OUT3/OUT4)
  if (sel===0){ if(!lockedAt(0,t)) return {live:false, why:'INPUT A not locked: no RMCK from U5; q15 no_lock mutes inst2'}; if(F.off1) return {live:false, why:'muted by q15 until the next ALTERA_write'};
    return {live:true, src:0, fs:D.in[0].fs, path:'U5 → inst2 i2s8416_aes → inst'+(o<4?'20':'21')}; }
  if (!lockedAt(1,t)) return {live:false, why:'INPUT B not locked: inst3 has no clock (U6 RMCK)'}; if (F.off2) return {live:false, why:'muted by q14 no_lock2'};
  if (F.ext2 && F.swSel){ if(!srcFsOK()) return {live:true, src:0, fs:D.in[1].fs, viaSRC:true, bad:true, why:'AD1895 out of range (24.576 MHz / 138 = '+kHz(K.srcMaxFs)+')'};
    return {live:true, src:0, fs:D.in[1].fs, viaSRC:true, silent:!lockedAt(0,t), path:'U5 → inst2 I²S → U9 AD1895 → inst23 i2s_par → inst22 → inst3 (U6 clocks)'}; }
  return {live:true, src:1, fs:D.in[1].fs, path:'U6 → inst3 i2s8416_aes → inst'+(o<4?'20':'21')}; }
function leds(t){ const L={pwr:powered(t)}; const n=lastPass(t,3);
  if (n===null||n<0) return Object.assign(L,{lock1:0,nolock1:0,lock2:0,nolock2:0,x8:0,x4:0,src:0,eq1:0,eq2:0});   // port_init leaves every MCU LED off
  const a1=seenAt(0,n), a2=seenAt(1,n), m=mode();
  Object.assign(L,{lock1:a1,nolock1:!a1,eq1:eq1(),x4:m===1,x8:m!==1});
  if (input2Active()) Object.assign(L,{lock2:a2,nolock2:!a2,eq2:eq2()}); else Object.assign(L,{lock2:0,nolock2:0,eq2:0});
  L.src = D.fw==='V020000' && m===2 && n>0 && seenAt(1,n-1);  // SRC_LED from the previous pass's src_is_active (v100 has no SRC LED code)
  return L; }
function eqGain(f){ const w=2*Math.PI*f; const y=(re,im)=>{ const d=re*re+im*im; return [re/d,-im/d]; };
  const a=[1/750,0], b=y(365,-1/(w*1e-9)), c=y(110,-1/(w*220e-12)); return 750*Math.hypot(a[0]+b[0]+c[0], a[1]+b[1]+c[1]); }   // EL5263 section B: R8 750R over R7 ‖ (R9+C15) ‖ (R11+C17)
function rxV(k){ const c=D.in[k]; if(!c.on) return 0; const v=D.ver==='75'?1.0:4.0, a=(D.ver==='75'?2.5:4.0)*Math.sqrt(c.fs/48000); return v*Math.pow(10,-a*c.cable/100/20); }   // display only (inferred loss)
function sample(k,t){ const c=D.in[k]; const n=Math.floor(t*c.fs); return Math.pow(10,c.dbfs/20)*Math.sin(2*Math.PI*c.f*n/c.fs); }
function outRate(o){ const oi=outInfo(o,SIM.t); return oi.live?oi.fs:D.in[o<4?0:(dual()?1:0)].fs; }
function outSample(o,t){ const oi=outInfo(o,t); if(!oi.live||oi.silent||oi.bad) return 0; const fs=oi.fs, c=D.in[oi.src];
  const dly = oi.viaSRC ? K.srcDelay : K.fpgaLat/fs; const n=Math.floor((t-dly)*fs); return Math.pow(10,c.dbfs/20)*Math.sin(2*Math.PI*c.f*n/fs); }
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`${MODEN[mode()]} · IN1 ${lockedAt(0,1)?'LOCK':'NO LOCK'} · IN2 ${lockedAt(1,1)?'LOCK':'NO LOCK'}${mode()===2?(lockedAt(1,1)&&srcFsOK()?' · SRC → '+kHz(D.in[1].fs):' · SRC idle (B not locked)'):''}`);
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t;
    tr('PSU1 VOF-10-5 → VCC_5V; REG1 LM1117-3.3 → VCC_3V3; REG3 LM1117-ADJ (R2 221R / R3 47R5) → net “VCC_1V2” = 1.52 V; REG2 MAX660 → VCC_5VN');
    tr('main(): port_init(): PORTC = 0xFF → PC0 → Q1 → N_CONFIG low (FPGA blank) · watchdog_init() · CLI() — interrupts are never enabled');
    tr(`wait(3000) × 10 → ALTERA_RESET(1000) → EP1C3 loads from U7 M25P40 → wait(3000) × 20 → init_CS8416() → CS8416_write_ALL(00..06) = 00 04 0B BB 80 B0 10`);
    tr(`READ_DIP_SWITCHES() → ALTERA_write() → while(1) starts ${SIM.fmtDur(bootPlan().loop-D.powerAt)} after power-on; each pass ≈ ${SIM.fmtDur(passT())}`); } else tr('All rails collapse; outputs stop, LEDs off'); }); },
  dip(i){ act(`Rear DIP ${i+1} (${DIPN[i]}) → ${D.dip[i]?'OFF':'ON'}`, tr=>{ D.dip[i]^=1;
    tr(`SW1-${8-i} → R${72+i} → U10 pin ${44+i} ${['PA7','PA6','PA5','PA4'][i]} = ${D.dip[i]?'0 (ON grounds it)':'1 (pull-up)'} → next pass READ_DIP_SWITCHES: MIRROR(PINA) = ${bin8(dipByte())}b`);
    tr(`ALTERA_write(): mode = dip_switches & 0x03 = ${modeRaw()}${modeRaw()===3?' → final else sets mode = OUTPUT_1x8_SRC (SRC beats DUAL)':''} → ${MODEN[mode()]}`);
    if (i<2){ const m=mode();
      tr(m===0?'data_lower &= ~(BIT4|BIT1|BIT0): q0 = q1 = 0 → inst20 and inst21 both pick aes1 → all eight outputs carry INPUT A'
        : m===1?'data_lower |= BIT1: q1 = 1 → inst21 picks aes2 → B1–B4 carry INPUT B; A1–A4 stay on INPUT A'
        : `SRC: ${mcuSeen(1,SIM.t+0.01)?'aes2_lock == YES → data_lower |= BIT4|BIT2|BIT1|BIT0, &= ~BIT3 → inst3 ext_sel = 1, inst22 sel = 1: AD1895 output (INPUT A audio) re-encoded on INPUT B’s clock → all eight outputs at '+kHz(D.in[1].fs)+' · src_is_active = YES':'aes2_lock == NO → falls back to plain 1×8 (INPUT A) and src_is_active = NO: the SRC LED stays dark'}`);
      tr(`REFRESH_LEDS: ${m===1?'DUAL_LED_ON (PG3)':'SINGLE_LED_ON (PG4)'}${m===0?' · input2 = INACTIVE → LOCK2 and NO LOCK2 both dark':''}`); }
    if (i===2) tr(`eq1_active = ${eq1()?'YES':'NO'} → PROCESS_MODES: CS8416_write1(0x04, ${eq1()?'0x89':'0x80'}) → U5 takes ${eq1()?'RXP1 = IN1_EQ (EL5263 U1 section B, +'+(20*Math.log10(eqGain(3.072e6))).toFixed(0)+' dB at 3 MHz)':'RXP0 = IN1 (flat section A)'} · EQ1 LED PE3`);
    if (i===3) tr(`eq2_active = ${eq2()?'YES':'NO'}${D.fw==='V020000'?' (V020000: only when mode == OUTPUT_2x4)':' (v100: whenever input 2 is active)'} → CS8416_write2(0x04, ${eq2()?'0x89':'0x80'}) · EQ2 LED PE7`); }); },
  plug(k){ act(`${D.in[k].on?'Unplug':'Plug in'} INPUT ${'AB'[k]}`, tr=>{ const c=D.in[k]; c.on=!c.on; c.at=SIM.t;
    tr(`AES${9+k}_IN → T${9+k} PE-65612 → I${k+1} jumper (${D.ver==='75'?'75R R'+(35+k):'110R R'+(25+k)}) → U${1+k} EL5263 → R${k?22:12} IN${k+1} / R${k?23:13} IN${k+1}_EQ → U${5+k} CS8416 RXP0 / RXP1`);
    tr(c.on?`U${5+k} locks after ≈${SIM.fmtDur(K.lockT)} (${inf}) → next CS8416_READ_LOCK_ALL sees RERR UNLOCK = 0 → aes${k+1}_lock = YES`
      :`RERR UNLOCK = 1 (register 06 = 0x10 unmasks UNLOCK only) → aes${k+1}_lock = NO → NO LOCK${k+1}; data_upper bit ${7-k} = 1 → FPGA q${15-k} mutes aes${k+1}${k===1&&mode()===2?' — and ALTERA_write drops the SRC path back to 1×8':''}`); }); },
  set(k,key,v,l){ act(l, tr=>{ D.in[k][key]=v; D.in[k].at=SIM.t;
    if (key==='cable') tr(`${D.ver} Ω reach at ${kHz(D.in[k].fs)}: ${Math.round(reach(k))} m with EQ${k+1} ${eqOn(k)?'on':'off'} (POD12A manual 300/750 m on 75 Ω, 150/250 m on 110 Ω; fs scaling ${inf}) → ${D.in[k].cable<=reach(k)?'locks':'NO LOCK'}`);
    else { tr(`CS8416 re-locks; RMCK = 256 × fs = ${(256*v/1e6).toFixed(3)} MHz clocks i2s8416_aes → AES out at ${kHz(v)}${v<30000||v>192000?' (outside 30–192 kHz: no lock)':''}`); if (mode()===2) tr(srcFsOK()?'AD1895 within range':`AD1895 out of range: MCLK 24.576 MHz / 138 = ${kHz(K.srcMaxFs)} (test report: “SRC at 192KHz not work”)`); } }); },
  ver(v){ act(`Rear version → POD12A/${v}`, tr=>{ D.ver=v; tr(v==='75'? 'SA-POD12A-TB-75: ten 75 Ω BNCs; jumpers I1/I2, O1–O8 on the 75R side (R35/R36, R37–R44)' : 'SA-POD12A-TB-110: ten Phoenix MCV1.5/3; jumpers on the 110R side (R25/R26, R27–R34)'); tr('The main board is the same for both versions'); }); },
  fw(v){ act(`Firmware → ${v}`, tr=>{ D.fw=v; tr(v==='v100'?'RD77 backup1/v100 (8 Jan 2014): no SRC LED code; eq2_active = (dip & BIT3) in any mode with input 2 active':'V020000 (27 Jan 2014, test report “MC: V020000”): SRC_LED on PB0 from src_is_active; EQ2 only in OUTPUT_2x4'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels ---------------- */
function frontSVG(t){ const L=leds(t);
  let over=`<g class="pwr" style="cursor:pointer"><title>Power rocker</title><rect x="130" y="57" width="100" height="150" rx="9" fill="#0a0b0c" stroke="#30333a" stroke-width="3"/><rect x="144" y="${D.power?68:122}" width="72" height="62" rx="7" fill="#1d2023" stroke="#3a3d40" stroke-width="2"/></g>`
    + led(299,218,L.pwr,'#9be35a') + led(552,218,L.x8,'#ffd23a') + led(612,218,L.x4,'#ffd23a') + led(787,218,L.src,'#ffd23a') + led(847,218,L.eq1,'#ffd23a') + led(907,218,L.eq2,'#ffd23a')
    + led(1082,218,L.lock1,'var(--led-g)') + led(1142,218,L.nolock1,'#ff4a3a') + led(1362,218,L.lock2,'var(--led-g)') + led(1422,218,L.nolock2,'#ff4a3a');
  return panelSVG(PREFIX,'front',{over},'POD12A front panel (CorelDRAW silk artwork)'); }
function rearSVG(){ const v75=D.ver==='75';
  const conn=(x,y,pl,cls,title)=> v75? bnc(x,y,pl,cls,title,52) : phx(x,y,pl,cls,title);
  let over = conn(263,52,D.in[0].on,'inA','INPUT A — click to plug/unplug') + conn(263,180,D.in[1].on,'inB','INPUT B (also the SRC reference clock) — click to plug/unplug');
  [[420,52],[420,180],[576,52],[576,180],[732,52],[732,180],[888,52],[888,180]].forEach(([x,y],i)=>over+=conn(x,y,false,'','OUTPUT '+(i+1)+' ('+OUTN[i]+')'));
  over += phx(1010,128,false,'','BALANCED IOS (+ − G)') + dip(1128,158,D.dip.map(Boolean),'dp',DIPN) + iec(1362,32,1606,248);
  return panelSVG(PREFIX,'rear',{over},'POD12A rear panel (CorelDRAW silk artwork)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); root.querySelectorAll('.inA').forEach(g=>g.onclick=()=>A.plug(0)); root.querySelectorAll('.inB').forEach(g=>g.onclick=()=>A.plug(1)); root.querySelectorAll('.dp').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i)); }
function controlsHTML(){ return `<div class="small" style="display:grid;grid-template-columns:auto repeat(3,auto);gap:4px 10px;align-items:center;margin-top:8px">
  ${[0,1].map(k=>`<b>INPUT ${'AB'[k]} source</b><label>fs <select id="fs${k}">${[22050,32000,44100,48000,96000,192000,220000].map(f=>`<option value="${f}" ${f===D.in[k].fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label><label>cable <input id="cb${k}" type="number" step="50" value="${D.in[k].cable}" style="width:64px"> m</label><label>tone ${D.in[k].f} Hz, ${D.in[k].dbfs} dBFS</label>`).join('')}
  <b>Rear version</b><label><select id="vr"><option value="75" ${D.ver==='75'?'selected':''}>POD12A/75 (BNC)</option><option value="110" ${D.ver==='110'?'selected':''}>POD12A/110 (Phoenix)</option></select></label>
  <b>MCU firmware</b><label><select id="fwv"><option value="V020000" ${D.fw==='V020000'?'selected':''}>V020000 (shipped)</option><option value="v100" ${D.fw==='v100'?'selected':''}>v100 (RD77 backup)</option></select></label></div>
  <div class="small muted">Click the rear inputs to plug or unplug them, the DIP levers (DUAL, SRC, EQ1, EQ2) to flip them, and the rocker for a cold boot. Keys 1–4 flip the DIP switches.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); [0,1].forEach(k=>{ if(!g('#fs'+k)) return; g('#fs'+k).onchange=e=>A.set(k,'fs',+e.target.value,`INPUT ${'AB'[k]} rate → ${e.target.value/1000} kHz`); g('#cb'+k).onchange=e=>A.set(k,'cable',Math.max(0,+e.target.value),`INPUT ${'AB'[k]} cable → ${e.target.value} m`); });
  if(g('#vr')) g('#vr').onchange=e=>A.ver(e.target.value); if(g('#fwv')) g('#fwv').onchange=e=>A.fw(e.target.value); }
bindKeys('__pod12aActive', ()=>({'1':()=>A.dip(0),'2':()=>A.dip(1),'3':()=>A.dip(2),'4':()=>A.dip(3)}));
/* ---------------- timeline ---------------- */
const STEPCOL=['#2f7fbf','#6a5acd','#8a8f96','#c08a2a','#1f9a5a'];
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2');
  const L=[{label:'MCU (boot phase / main-loop step)', h:24, draw(c,X,t0,t1,y,h){ if(!D.power) return; const B=bootPlan(); c.font='10px sans-serif';
    B.ph.forEach((p,i)=>{ if(p.t1<t0||p.t0>t1) return; const x0=X(Math.max(p.t0,t0)), x1=X(Math.min(p.t1,t1)); c.fillStyle=i%2?'#7a8590':'#9aa5b0'; c.fillRect(x0,y+3,Math.max(1,x1-x0),h-6); if(x1-x0>60){ c.fillStyle='#fff'; c.fillText(p.name,x0+3,y+15);} });
    const P=passT(); if (t1>B.loop){ const s0=Math.max(t0,B.loop); if ((t1-s0)/P>400){ c.fillStyle=STEPCOL[0]; c.globalAlpha=.5; c.fillRect(X(s0),y+3,X(t1)-X(s0),h-6); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.fillText(`main loop: ${Math.round((t1-s0)/P).toLocaleString()} passes of ${SIM.fmtDur(P)} — zoom in`,X(s0)+4,y+15); return; }
      const fr=stepFr(); for(let n=Math.floor((s0-B.loop)/P); B.loop+n*P<t1; n++){ fr.forEach((r,j)=>{ const u0=B.loop+(n+r[0])*P, u1=B.loop+(n+r[1])*P; if(u1<t0||u0>t1) return; c.fillStyle=STEPCOL[j]; const x0=X(Math.max(u0,t0)), x1=X(Math.min(u1,t1)); c.fillRect(x0,y+3,Math.max(1,x1-x0),h-6); if(x1-x0>70){ c.fillStyle='#fff'; c.fillText(STEPS[j].n,x0+3,y+15);} }); } } }}];
  [0,1].forEach(k=>{ L.push({label:`INPUT ${'AB'[k]} frames (${D.in[k].fs/1000}k)`, h:22, draw(c,X,t0,t1,y,h){ if(!D.in[k].on){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('unplugged',X(t0)+6,y+15); return; } SIM.pulses(c,X,t0,t1,y,h,1/D.in[k].fs,0,0.2/D.in[k].fs,b,'frames'); }});
    L.push(boolLane(`U${5+k} CS8416 lock (hardware)`, t=>lockedAt(k,t), '#3fbf5f')); L.push(boolLane(`LOCK${k+1} LED (as the MCU last saw it)`, t=>leds(t)['lock'+(k+1)], '#7fd08f')); });
  [0,4].forEach(o=>{ L.push({label:`FPGA OUT${o/2+1} → ${OUTN[o]}/${OUTN[o+1]}`, h:22, draw(c,X,t0,t1,y,h){ const tm=(t0+t1)/2, oi=outInfo(o,tm); if(!oi.live){ c.fillStyle=SIM.css('--bad'); c.font='11px sans-serif'; c.fillText(oi.why,X(t0)+6,y+15); return; } SIM.pulses(c,X,t0,t1,y,h,1/oi.fs,0,0.2/oi.fs,a,'frames'); c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(`${kHz(oi.fs)} · ${oi.viaSRC?'INPUT A via AD1895 on INPUT B clock':'INPUT '+'AB'[oi.src]}`,X(t1)-260,y+12); }}); });
  L.push(waveLane('INPUT A samples', t=>D.in[0].on?sample(0,t):0, -0.01, null, b, 34));
  L.push(waveLane(`${OUTN[0]} samples${srcOn()?' (after AD1895)':''}`, t=>outSample(0,t), -0.01, null, a, 34));
  L.push(waveLane(`${OUTN[4]} samples`, t=>outSample(4,t), -0.01, null, a, 34));
  L.push(boolLane('SRC LED (src_is_active)', t=>leds(t).src, '#ffd23a'));
  return L; }
/* ---------------- views ---------------- */
function routeTable(t){ const F=fpga(t); return `<table class="kv"><tr><th>Output</th><th>FPGA pin / driver</th><th>Carries</th><th>Rate</th></tr>${OUTN.map((n,o)=>{ const f=Math.floor(o/2); const pins=[['U8-75','U3 DI4/DI3'],['U8-74','U3 DI1/DI2'],['U8-69','U4 DI4/DI3'],['U8-68','U4 DI1/DI2']][f]; const oi=outInfo(o,t);
  return `<tr><td class="mono">${o+1} · ${n}</td><td class="mono small">OUT${f+1} ${pins[0]} → ${pins[1]} → T${o+1}</td><td>${oi.live?(oi.viaSRC?'INPUT A via SRC'+(oi.silent?' (A unlocked: silence, '+inf+')':'')+(oi.bad?' <span style="color:var(--bad)">out of range</span>':''):'INPUT '+'AB'[oi.src]):`<span style="color:var(--bad)">${oi.why}</span>`}</td><td class="mono">${oi.live?kHz(oi.fs):'—'}</td></tr>`; }).join('')}</table>
  <p class="small mono">Last ALTERA_write: data_upper ${bin8(F.up)}b · data_lower ${bin8(F.lo)}b (q0 sel A ${F.selA}, q1 sel B ${F.selB}, q4 SRC ${F.swSel})</p>`; }
function viewSim(m){ window.__pod12aActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead',`<div id="fp"></div>`)}${card('Rear panel — click inputs and DIP levers',`<div id="rp"></div><div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src('#POD #SERIES/POD12A - #Master/POD12A - #ARTWORK #DA #2016/POD12A-FRONT&REAR-SILK (CURVE).cdr', 'POD12A-FRONT&REAR-SILK (CURVE).cdr')} (2016-06-17|49), CorelDRAW silk plates in their real inks.</div>${controlsHTML()}`)}</div>
    <div>${card('What the firmware did (last action)',`<div id="trace" class="log"></div>`)}${card('Routing now',`<div id="rt"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable. 200 µs shows single frames; with SRC on, the outputs follow INPUT B’s frame rate.',`<canvas id="tl"></canvas>`)}
    <div class="grid2">${card('Scope: INPUT A and output A1 at the playhead (one AES3 frame each)',`<canvas id="s1"></canvas><canvas id="s2"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Flip a DIP switch (DUAL, SRC, EQ1, EQ2) or plug an input.'); m.querySelector('#rt').innerHTML=routeTable(t);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:230});
    const fi=D.in[0].fs, ni=Math.floor(t*fi), si=sample(0,t), oi=outInfo(0,t), fo=oi.live?oi.fs:48000, no=Math.floor(t*fo), so=outSample(0,t);
    drawAesScope(m.querySelector('#s1'), aesSubframe(si,ni%192===0?'Z':'X',ni%192,fi), aesSubframe(si,'Y',ni%192,fi), fi, rxV(0)/(D.ver==='75'?1:4), 'INPUT A ·');
    drawAesScope(m.querySelector('#s2'), aesSubframe(so,no%192===0?'Z':'X',no%192,fo), aesSubframe(so,'Y',no%192,fo), fo, oi.live?1:0.05, 'A1 out ·');
    m.querySelector('#bits').innerHTML=`Input amplitude at the receiver ${rxV(0).toFixed(3)} V p-p (${inf}); ${eq1()?'CS8416 register 04 = 0x89: RXP1 (IN1_EQ)':'register 04 = 0x80: RXP0 (flat IN1)'}. <span class="muted">${oi.live?oi.path||'':oi.why}</span>`; };
  bindControls(m); SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD12A', body:`<p>An <b>AES digital audio DA</b> that runs as one <b>1×8</b> or two <b>1×4</b> amplifiers, with SRC/EQ1/EQ2 tallies and LOCK/NO LOCK for each input, as POD12A/75 (BNC) or POD12A/110 (Phoenix). The model runs the real MCU firmware (V020000) and FPGA design (D6201A), archived in the obsolete POD12 folder.</p>`, check:()=>true, auto:true},
  {title:'1 · Power and lock', body:`<p>Switch off and on again with the rocker. The MCU spends about ${Math.round((bootPlan().loop-D.powerAt)*1000)||300} ms in wait() loops before its main loop starts; only then do LOCK and the <b>1X8</b> tally light.</p>`, check:()=>D.power&&D.log.some(e=>e.name==='Power on'), hint:'Click the rocker twice.'},
  {title:'2 · One input to eight outputs', body:`<p>In 1×8 mode (DIP 1 and 2 off), ALTERA_write clears q0/q1, so both FPGA switches pick INPUT A. In 1×8 the firmware marks input 2 INACTIVE, so LOCK2 and NO LOCK2 are both dark.</p>`, check:()=>mode()===0, hint:'DIP 1 and 2 off.'},
  {title:'3 · Dual 1×4', body:`<p>Flip <b>DIP 1 (DUAL)</b> on. The 1X4 tally lights. B1–B4 now carry INPUT B.</p>`, check:()=>dual()&&lockedAt(1,1), hint:'Click the first DIP lever; keep INPUT B plugged in.'},
  {title:'4 · SRC: INPUT A on INPUT B’s clock', body:`<p>Flip DIP 1 off and <b>DIP 2 (SRC)</b> on. The AD1895 takes INPUT A (48 kHz) and outputs it on INPUT B’s clock (44.1 kHz): all eight outputs now run at INPUT B’s rate. INPUT B is only a clock reference; its audio is discarded.</p>`, check:()=>srcOn()&&srcActive(SIM.t+0.001)&&!D.dip[0], hint:'DIP 1 off, DIP 2 on; INPUT B plugged in.'},
  {title:'5 · No reference, no SRC', body:`<p>Unplug <b>INPUT B</b>. ALTERA_write only engages the SRC path <span class="mono">if (aes2_lock == YES)</span>, so the unit quietly falls back to plain 1×8 and the SRC LED goes dark.</p>`, check:()=>srcOn()&&!D.in[1].on, hint:'Click the lower rear input.'},
  {title:'6 · A long cable', body:`<p>Plug INPUT B back in and set INPUT A's cable to <b>500 m</b>: beyond the manual's 300 m, so NO LOCK. Switch on <b>DIP 3 (EQ1)</b>: PROCESS_MODES writes 0x89 to register 04 and the CS8416 takes its second input, the EL5263's boosted copy; it locks again (750 m reach).</p>`, check:()=>D.in[0].cable>=500&&eq1()&&lockedAt(0,1), hint:'Cable 500, then the third DIP lever.'},
  {title:'Done', body:`<p>See <b>Findings</b> for what the code does that the manual does not say.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod12aActive=true; tutorialView(m,{title:'Tutorial — using a POD12A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${routeTable(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod12aActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the device at the playhead',`<div id="dev"></div>`)}${card('As seen by the front panel',`<div id="fp"></div>`)}</div>${card('Zoom ladder — samples on output A1',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, fi=D.in[0].fs, oi=outInfo(0,t), fo=oi.live?oi.fs:fi, P=passT(), w=where(t);
    const rows=[['MCU clock','8,000,000',SIM.fmtDur(1/XTAL),'U10 AT90CAN128, X2 8 MHz; no interrupts (CLI, never SEI)'],['Main-loop passes',Math.round(1/P).toLocaleString(),SIM.fmtDur(P),'READ_LOCK_ALL → PROCESS_MODES → READ_DIP → REFRESH_LEDS → ALTERA_write (cycles estimated from the .lis)'],
      ['CS8416 SPI transactions',Math.round((2+(input2Active()?2:1))/P).toLocaleString(),'—','2 RERR reads + 1–2 register-04 rewrites per pass, all bit-banged'],
      ['INPUT A frames',fi.toLocaleString(),SIM.fmtDur(1/fi),'U5 CS8416 recovers the clock (RMCK → U8 pin 87)'],['Output A1 frames',fo.toLocaleString(),SIM.fmtDur(1/fo),oi.viaSRC?'AD1895 output re-encoded on INPUT B’s U6 clocks':'same frames as the input, re-encoded by i2s8416_aes'],
      ['Bit cells per output',(128*fo).toLocaleString(),SIM.fmtDur(1/(128*fo)),'DS34LV87T → PE-65612 → 75R/110R → connector'],
      ['VCXO steering','0','—','idle: the FPGA ties up, dn and src_bypass to GND; R55/R59 DNI. X1 24.576 MHz free-runs as the AD1895 MCLK'],['SRC group delay','—',SIM.fmtDur(K.srcDelay),'AD1895 filter delay ('+inf+')']];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>MCU</th><td class="mono">${w.kind==='off'?'off':w.kind==='boot'?'boot: '+(w.p?w.p.name:''):'pass '+w.n.toLocaleString()+' · '+STEPS[w.step].n}</td></tr><tr><th>INPUT A</th><td class="mono">frame ${Math.floor(t*fi).toLocaleString()} · sample ${sample(0,t).toFixed(5)}</td></tr><tr><th>A1 out</th><td class="mono">${oi.live?'frame '+Math.floor(t*fo).toLocaleString()+' · sample '+outSample(0,t).toFixed(5):oi.why}</td></tr><tr><th>Mode</th><td class="mono">${MODEN[mode()]} · EQ1 ${eq1()?'on':'off'} · EQ2 ${eq2()?'on':'off'} · ${D.fw}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    drawLadder(m.querySelector('#zl'),t,[['1 second',1],['10 ms',0.01],['1 tone cycle',1/D.in[0].f],['8 frames',8/fo],['1 frame',1/fo]],tt=>outSample(0,tt),-0.01,'full scale'); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:20,y:20,w:180,h:100,t:'INPUT A / B',s:['BNC or Phoenix (rear board)','T9/T10 PE-65612','I1/I2: 75R or 110R'],d:'AES9_IN/AES10_IN → H103 → H5 → transformers T9/T10 → AES9/AES10 nets. Jumpers I1/I2 pick the termination. INPUT B doubles as the SRC clock reference.'},
  eq:{x:20,y:160,w:180,h:90,t:'U1/U2 EL5263',s:['A: flat → IN1 / IN2','B: boost → IN1_EQ / IN2_EQ'],d:'Each EL5263 drives the CS8416 twice: section A (gain 2) → RXP0, section B (R8 750R over R7 ‖ R9+C15 ‖ R11+C17, inverting) → RXP1. EQ1/EQ2 only select the receiver input: register 04 = 0x80 or 0x89.'},
  rx:{x:250,y:20,w:180,h:90,t:'U5/U6 CS8416',s:['RXP0 flat, RXP1 EQ','I²S + RMCK → FPGA'],d:'Receivers, programmed and polled by U10 over a bit-banged bus (CS8416_CLK/IN/OUT). Register 06 = 0x10 unmasks UNLOCK only.'},
  fpga:{x:250,y:150,w:180,h:110,t:'U8 EP1C3 (D6201A)',s:['inst2/inst3 i2s8416_aes','inst20/21 switch2x1 (q0, q1)','inst22 sw2x2x1x24 (q4)','q14/q15 mute on no lock'],d:'D6201A.bdf: two AES encoders (inst2 on U5 clocks, inst3 on U6 clocks), two output selectors and the SRC return path. 16 control bits from ALTERA_write (data_upper, data_lower). up/dn/src_bypass tied to GND: the VCXO loop is idle.'},
  src:{x:480,y:150,w:170,h:80,t:'U9 AD1895 SRC',s:['in: INPUT A I²S (inst2)','out: on INPUT B LRCLK/SCLK','MCLK 24.576 MHz X1'],d:'Input side = INPUT A; output side, inst23 i2s_par and inst3 run on U6 (INPUT B) clocks. Engaged only when aes2_lock == YES. MCLK/138 caps fs at about 178 kHz ('+'inferred'+').'},
  drv:{x:480,y:20,w:170,h:90,t:'U3/U4 DS34LV87T',s:['8 differential drivers','O1–O8: 75R or 110R','T1–T8 PE-65612'],d:'Each FPGA OUTn drives two driver sections.'},
  mcu:{x:250,y:300,w:180,h:90,t:'U10 AT90CAN128',s:['V020000 main loop','DIP PA7..PA4, LEDs','ALTERA_write → FPGA2/3/4'],d:'v100w.c / D6202B.c / cs84xx.c / altera.c. openGear (D6201B) code base: CAN, DashBoard and EEPROM code linked but never called; interrupts never enabled.'},
  out:{x:480,y:270,w:170,h:70,t:'Outputs 1–8',s:['A1–A4 / B1–B4'],d:'Rear board SA-POD12A-TB-75 (10 BNC) or TB-110 (10 Phoenix).'},
  pwr:{x:20,y:300,w:180,h:90,t:'Power',s:['VOF-10-5 → VCC_5V','LM1117 3.3 V and ADJ (1.52 V)','MAX660 → VCC_5VN'],d:'PSU2 VAF1005 is a DNI “Special Build” alternative.'},
};
const WIRES=[['in','eq',''],['eq','rx','IN / IN_EQ'],['rx','fpga','I²S'],['fpga','src','A I²S'],['src','fpga','on B clock'],['fpga','drv','OUT1–4'],['drv','out','×8'],['mcu','rx','SPI'],['mcu','fpga','FPGA2/3/4'],['pwr','mcu','']];
function viewBlock(m){ window.__pod12aActive=false; blockView(m,BLOCKS,WIRES,'fpga',[680,410],card('In one sentence',`<p>Two AES inputs are received (flat or through the EL5263 EQ copy), an FPGA fans INPUT A, or A and B, out to four streams — or, in SRC mode, sends INPUT A through the AD1895 onto INPUT B’s clock — and eight transformer-coupled drivers send them out. An AT90CAN128 polls the receivers and DIP switches and writes 16 control bits to the FPGA every pass.</p>`)); }
const SHEETS=[
  {name:'1 · Inputs and receivers', note:'Every net and pin here is copied from POD12-iss2-net.ipc (IPC-D-356A, 15/12/2013). Component values come from the master BOM.', svg:()=>
    chip(150,60,110,'T9 PE-65612',[['3','AES9 (I1-2)'],['2','AES9_N (H5-2)']],[['1','C26 → AES9_P']],'input A')
    +chip(430,190,140,'U1 EL5263',[['3 (+)','AES9 / D1-D2'],['2','R5/R6 750R'],['8/4','VCC_5V / 5VN']],[['1','R12 → IN1'],['7','R13 → IN1_EQ']],'')
    +chip(610,40,110,'U5 CS8416',[['4','IN1 (C36) RXP0'],['3','IN1_EQ (C37) RXP1'],['16/15/17','CS8416_CLK/IN/OUT'],['9 / 14','RESET1 / SEL1']],[['24','MCLK→U8-87'],['27','SCLK→U8-77'],['28','LRCK→U8-76'],['26','SDATA→U8-86'],['20–18','GPO→U8-88..90']],'')
    +txt(60,360,'Register 04 = 0x80 selects RXP0 (flat), 0x89 selects RXP1 (EQ): PROCESS_MODES rewrites it every pass.',11.5)+txt(60,380,'Input B is identical: T10, U2, U6, R26/R36, I2, nets AES10, IN2, IN2_EQ, U6_*.',11.5)},
  {name:'2 · FPGA, SRC and outputs', note:'Nets from the IPC netlist; FPGA roles from D6201A.bdf/.qsf. The DS34LV87T section assignment follows the part datasheet.', svg:()=>
    chip(230,40,150,'U8 EP1C3T100',[['75 / 74','OUT1 / OUT2'],['69 / 68','OUT3 / OUT4'],['50 / 49','BYPASS / U9_RESET'],['51–53','LRCLK_I SCLK_I SDATA_I'],['56/57/55','LRCLK SCLK SDATA'],['54','MCLKOUT'],['10','VCO_OUT ← X1'],['37 / 36','UP / DN = GND']],[],'')
    +chip(230,290,150,'U9 AD1895',[['6/5/4','LRCLK_I/SCLK_I/SDATA_I (A)'],['2','MCLKOUT'],['9 / 13','BYPASS / U9_RESET']],[['24/25/23','LRCLK/SCLK/SDATA (B clock)']],'SRC')
    +chip(560,60,120,'U3 DS34LV87T',[['15 / 9','OUT1'],['1 / 7','OUT2']],[['10/11','AES1P/N_SEL'],['14/13','AES2P/N_SEL'],['2/3','AES3P/N_SEL'],['6/5','AES4P/N_SEL']],'')
    +txt(470,260,'AESnN_SEL → jumper On → R27–R34 110R',11.5)+txt(470,278,'or R37–R44 75R → Cn → Tn → connector',11.5)+txt(470,300,'U4 does the same for OUT3/OUT4 → B1–B4.',11.5)},
  {name:'3 · MCU, LEDs and power', note:'From the IPC netlist, the BOM and the port comments in v100w.c. LED colours: LED1/2/4 green, LED3/5–8 yellow, LED9/10 red.', svg:()=>
    chip(200,40,150,'U10 AT90CAN128',[['44–47','SW1 via R72–R75 (PA7..PA4)'],['37/38/36','CS8416_CLK/IN/OUT'],['42/40','RESET1/RESET2'],['41/39','SEL1/SEL2'],['12–17','FPGA6…FPGA1'],['35','ALTERA_RESET → Q1'],['23/24','X2 8 MHz']],[['2','LOCK1 → LED2'],['26','NOLOCK1 → LED9'],['6','LOCK2 → LED4'],['25','NOLOCK2 → LED10'],['5','EQ1 → LED3'],['9','EQ2 → LED5'],['10','SRC (PB0) → LED6'],['19','DA_1X8 → LED7'],['18','DA_1X4 → LED8']],'')
    +chip(690,60,130,'Power',[['PSU1 VOF-10-5','VCC_5V'],['REG1 LM1117-3.3','VCC_3V3'],['REG3 LM1117-ADJ','VCC_1V2'],['REG2 MAX660','VCC_5VN']],[],'')
    +txt(540,260,'REG3: R2 221R (out→adj), R3 47R5 (adj→gnd)',11.5)+txt(540,280,'Vout = 1.25 × (1 + 47.5/221) = 1.52 V',11.5,'var(--warn)')+txt(540,300,'= Cyclone (EP1C) core 1.5 V; the net name says 1V2',11.5,'var(--warn)')},
];
function viewSchem(m){ window.__pod12aActive=false; schemView(m,SHEETS,'POD12A','No schematic file is archived for POD12A. These sheets come from the IPC-D-356A netlist inside the ISS2 Gerber zip, with signal roles from the firmware and the D6201A FPGA design.'); }
function viewSoft(m){ window.__pod12aActive=true;
  m.innerHTML=`<div class="grid2">${card('main() while(1) — the step running at the playhead',`<div id="f"></div><div id="det" class="small"></div>`)}${card('Mode decision (ALTERA_write, live)',`<div id="md"></div>`)}</div><div class="grid2">${card('DIP → firmware → LEDs and routing (live)',`<div id="dp"></div>`)}${card('Output routing (live)',`<div id="rt"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, w=where(t), hot=w.kind==='loop'?w.step:-1;
    m.querySelector('#f').innerHTML=flowSVG(STEPS.map((s,i)=>({t:s.n.replace('CS8416_',''),s:[SIM.fmtDur(s.c()/XTAL)]})),hot);
    m.querySelector('#det').innerHTML=w.kind==='loop'?`<b>${STEPS[w.step].n}</b>: ${STEPS[w.step].d}`:w.kind==='boot'?`Boot: <b>${w.p?w.p.name:''}</b> — ${w.p?w.p.d:''}`:'Power off.';
    const F=fpga(t), a2=mcuSeen(1,t);
    m.querySelector('#md').innerHTML=`<table class="kv"><tr><th>dip_switches</th><td class="mono">${bin8(dipByte())}b → mode = ${modeRaw()} → ${MODEN[mode()]}</td></tr>
      <tr><th>Branch</th><td class="small">${mode()===0?'OUTPUT_1x8: data_lower &= ~(BIT4|BIT1|BIT0)':mode()===1?'OUTPUT_2x4: data_lower |= BIT1':(a2?'else, aes2_lock == YES: |= BIT4|BIT2|BIT1|BIT0, &= ~BIT3 → src_is_active = YES':'else, aes2_lock == NO: plain 1×8, src_is_active = NO')}</td></tr>
      <tr><th>data_upper</th><td class="mono">${bin8(F.up)}b (bit 7 = NOT aes1_lock → q15, bit 6 = NOT aes2_lock → q14)</td></tr><tr><th>data_lower</th><td class="mono">${bin8(F.lo)}b (q0 ${F.selA} · q1 ${F.selB} · q4 ${F.swSel})</td></tr></table>`;
    m.querySelector('#dp').innerHTML=`<table class="kv"><tr><th>DIP</th><th>State</th><th>Pin</th><th>Code</th><th>Tally</th></tr>${DIPN.map((n,i)=>`<tr class="${D.dip[i]?'hl':''}"><td>${i+1} ${n}</td><td class="mono">${D.dip[i]?'ON':'OFF'}</td><td class="mono">${44+i} ${['PA7','PA6','PA5','PA4'][i]}</td><td class="small">${['mode bit 0 (OUTPUT_2x4)','mode bit 1 (OUTPUT_1x8_SRC; beats DUAL)','eq1_active → reg 04 = 0x89 on U5','eq2_active → reg 04 = 0x89 on U6 ('+(D.fw==='V020000'?'2×4 only':'any active mode')+')'][i]}</td><td class="small">${['DA_1X8 / DA_1X4','SRC_LED (when B locked)','EQ1','EQ2'][i]}</td></tr>`).join('')}</table>`;
    m.querySelector('#rt').innerHTML=routeTable(t); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod12aActive=false;
  m.innerHTML=card('What the POD12A archive shows — findings',`<ol><li><b>Artwork 2026|59: front/rear panels now from ${SIM.src('#POD #SERIES/POD12A - #Master/POD12A - #ARTWORK #DA #2016/POD12A-FRONT&REAR-SILK (CURVE).cdr', 'POD12A-FRONT&REAR-SILK (CURVE).cdr')} (2016-06-17|49).</b> GREEN + WHITE front plates and the WHITE rear plate (the 75 Ω BNC build) registered on the panel outline (assets/pod12a-front.svg, pod12a-rear.svg). As on the POD10A, the rear power legend ends “100-230 VAC, 50-60 Hz,” with no fuse rating. Not used: POD12A-FRONT(FINAL CURVE).cdr (2014|47, identical copies in two folders) and POD12A-75-110-REAR SILK(FINAL CURVE).cdr (2016-06-17, the 75/110 rear variants sheet).</li>
   <li><b>Corrected 2026|59: the POD12A firmware is archived, in the obsolete POD12 folder (see pod12.js).</b> The MCU program is V020000 (<span class="mono">XXX - POD12 - #Master #OBSOLETE/POD12 - #Engineering/POD12 - #Software/…/#V020000/</span>, with an earlier v100 in <span class="mono">POD12 - Update - #RD #RD77/Software/Atmel/backup1/v100</span>), and the FPGA is the D6201A project in <span class="mono">RD77/Software/FPGA/v100</span>. This plugin used to say neither existed and guessed the behaviour; the model now follows that code.</li>
   <li><b>SRC takes INPUT A and outputs it on INPUT B's clock.</b> In D6201A.bdf the AD1895's input is encoder inst2's I²S (INPUT A); its output side, the i2s_par reader and encoder inst3 run on U6's LRCLK/SCLK (INPUT B). ALTERA_write engages the path only <span class="mono">if (aes2_lock == YES)</span>. INPUT B's audio is discarded; with no B the unit quietly runs plain 1×8 and the SRC LED stays dark. (The earlier guess of a fixed 48 kHz from the VCXO was wrong.)</li>
   <li><b>The clock-steering loop is idle.</b> The FPGA ties <span class="mono">up</span>, <span class="mono">dn</span> and <span class="mono">src_bypass</span> to GND, and R55/R59 are DNI. X1 (24.576 MHz VCXO) free-runs; it only clocks the AD1895.</li>
   <li><b>The EQ is a second receiver input.</b> Each EL5263 drives the CS8416 twice: section A → IN on RXP0, section B (inverting, about +${(20*Math.log10(eqGain(3.072e6))).toFixed(0)} dB at 3 MHz) → IN_EQ on RXP1. EQ1/EQ2 only write 0x80 or 0x89 to register 04, and PROCESS_MODES rewrites it on every pass.</li>
   <li><b>SRC beats DUAL through a side effect.</b> <span class="mono">mode = dip_switches &amp; 0x03</span> is 3 with both on; only ALTERA_write's final <span class="mono">else</span> rewrites the global to OUTPUT_1x8_SRC.</li>
   <li><b>In 1×8 mode INPUT 2's LOCK and NO LOCK are both dark</b> (input2 = INACTIVE), not “no lock”.</li>
   <li><b>V020000 took EQ2 away from the SRC reference.</b> v100 allowed EQ2 whenever input 2 was active; V020000 adds <span class="mono">&amp;&amp; (mode == OUTPUT_2x4)</span>. v100 also has no SRC LED code. Switch the firmware in the rear-panel controls to compare.</li>
   <li><b>“SRC at 192KHz not work”.</b> The AD1895 MCLK is X1, 24.576 MHz; with MCLK ≥ 138 × fs (${inf}: data sheet) the limit is ${kHz(K.srcMaxFs)}.</li>
   <li><b>SRC_LED reuses COM_ACTIVITY_LED's bit</b> (PORTB BIT0) from the openGear D6201B code base, which is harmless only because the CAN/DashBoard code is never called. Interrupts are never enabled (CLI, no SEI).</li>
   <li><b>The boot is mostly waiting.</b> 35 × <span class="mono">wait(3000)</span> (15 of them “//Ali-Add”), so the main loop starts about ${Math.round((bootPlan_().loop-D.powerAt)*1000)} ms after power-on; LEDs stay dark until then.</li>
   <li><b>The “1V2” rail is 1.52 V.</b> REG3 LM1117-ADJ with R2 221R and R3 47R5 gives 1.25 × (1 + 47.5/221) = 1.52 V, right for the Cyclone I core. Only the net name is wrong.</li>
   <li><b>One FPGA pin feeds two outputs.</b> OUT1–OUT4 each drive two DS34LV87T sections, so outputs always come in identical pairs.</li>
   <li><b>One main board for both versions.</b> 75/110 Ω is chosen by the rear board and ten 3-pin jumpers (I1, I2, O1–O8).</li>
   <li><b>Leftovers.</b> <span class="mono">POD12A - #PNP #2016/dsfsd.prg</span> is a stray pick-and-place file; the Gerber zip names the board “POD12” (POD12-iss2). The panel art only exists as CorelDRAW.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Main-loop pass length is estimated from instruction counts in the .lis files; AVR start-up, FPGA configuration (40 ms), CS8416 lock (20 ms), AD1895 delay and FPGA latency are ${inf}.</li><li>Cable reach uses the POD12A manual figures (300/750 m on 75 Ω, 150/250 m on 110 Ω) and scales with √(48 k / fs) (${inf}).</li><li>In SRC mode with INPUT A unlocked, the outputs keep running at B's rate and carry silence (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD12A - #ISS2 #GERBER.zip → POD12-iss2-net.ipc · POD12A - BOM/POD12A - MASTER BOM.xlsx · POD12A - #ARTWORK #DA #2016/ (.cdr, Pics/)</li><li>../XXX - POD12 - #Master #OBSOLETE/POD12 - #Engineering/POD12 - #Software/…/#V020000/ v100w.c · D6202B.c · cs84xx.c · altera.c</li><li>../XXX - POD12 - #Master #OBSOLETE/POD12 - Update - #RD #RD77/Software/Atmel/backup1/v100/ · Software/FPGA/v100/D6201A.bdf, .qsf, *.vhd</li></ul>`); }
SIM.register({
  footnotes:[{text:"The rear power legend stops at “100-230 VAC, 50-60 Hz,” with a trailing comma and no fuse rating.", src:"#POD #SERIES/POD12A - #Master/POD12A - #ARTWORK #DA #2016/POD12A-FRONT&REAR-SILK (CURVE).cdr"},
    {text:"The rear on this sheet is the 75 Ω BNC build; the 75/110 rear variants are on a separate sheet.", src:"#POD #SERIES/POD12A - #Master/POD12A - #ARTWORK #DA #2016/POD12A-75-110-REAR SILK(FINAL CURVE).cdr"},
    {text:"POD12A-FRONT(FINAL CURVE).cdr is stored twice, in “POD12A - Artwork” and in the 2016 drafting set (same size).", src:"#POD #SERIES/POD12A - #Master/POD12A - Artwork/POD12A-FRONT(FINAL CURVE).cdr"}],
  id:'pod12a', name:'POD12A · AES digital audio DA, 1×8 or dual 1×4 (2013|46)', duration:1, product:'POD12A', year:2013, family:'POD series', folder:'#POD #SERIES/POD12A - #Master',
  summary:'Half-rack AES/EBU distribution amplifier: one input to eight outputs or two inputs to four each, with an SRC mode that puts INPUT A on INPUT B’s clock (AD1895) and a cable-EQ receiver input (EL5263), in 75 Ω BNC or 110 Ω Phoenix versions. Modelled from the real MCU firmware (V020000) and FPGA design (D6201A), archived in the obsolete POD12 folder.',
  highlights:['Real silkscreen panels with working DIP switches and pluggable inputs','The V020000 main loop and ALTERA_write control bits, live','SRC: INPUT A converted to INPUT B’s clock, only while B is locked','EQ as a second CS8416 input (register 04 = 0x80/0x89)','V020000 vs v100 firmware differences'],
  depth:'Full model',
  stepUnits:[{label:'1 input frame',period:()=>1/D.in[0].fs},{label:'1 main-loop pass',period:()=>passT()},{label:'1 AES block',period:()=>192/D.in[0].fs},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[0.0002,'200 µs (frames)']], defaultZoom:4,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: using a POD12A',render:viewTutorial},{id:'second',label:'One second, frame by frame',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software (V020000 + D6201A)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
