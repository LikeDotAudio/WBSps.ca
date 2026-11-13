/* =====================================================================
   POD29 — Four-output 40 W regulated power supply, POD29A ±15 V / POD29B ±12 V (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.
   Sources (folder #POD #SERIES/POD29 - #Master): POD29 - #Engineering/WiringDiagrams/POD29A WIRING.sch (ISS.1),
   MANUAL/POD29 MANUALtemp.wpd (ratings), #ARTWORK #DA #2016/POD29-FRONT&REAR-SILK (CURVE).pdf + Pics, #Mechanical #DA #2016/POD29-M1/M2 ISS 1.
   The supply module is not identified in the archive; its dynamic behaviour is inferred and marked so on screen.
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
/* ---------- POD-family helper kit (inlined in each POD plugin; same code in each file) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
function card(t,b,cls){ return `<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`; }
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: assets/pod29-front.svg, pod29-rear.svg are vector conversions of
   #ARTWORK #DA #2016/POD29-FRONT&REAR-SILK (CURVE).cdr (Jul.03/14; GREEN + WHITE plates on one panel, holes from the same
   drawing). That "CURVE" file still holds its legends as live Arial text: libcdr drops the alignment, so each line is
   placed and stretched to the word boxes of the file's own PDF export (pdftotext -bbox). Output cut-outs, their flange
   screws, the IEC cut-out and the front rocker were re-aligned to the drawing (outputs had been drawn 32 px high, the IEC
   46 px right and 19 px low, the rocker 7 px right). */
const ART_PATH = '#POD #SERIES/POD29 - #Master/POD29 - #ARTWORK #DA #2016/POD29-FRONT&REAR-SILK (CURVE).cdr';
const dbu2v = d => 0.7746*Math.pow(10,d/20);           // dBu -> V rms
const v2dbu = v => v>1e-9 ? 20*Math.log10(v/0.7746) : -200;
const sgn = x => (x>=0?'+':'') ;
const fdb = (d,n) => d<-150 ? '−∞' : (d>=0?'+':'−')+Math.abs(d).toFixed(n==null?1:n);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

/* ---- panel primitives, in silkscreen pixels (200 dpi, 1 mm = 7.874 px, face 1714 × 321) ---- */
const PW = 1714, PH = 321;
function panelSVG(prefix, side, inner, label){
  return `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${label||''}" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="glow${side}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${PW}" height="${PH}" rx="10" fill="var(--dev)"/>
    <image href="${ASSET}${prefix}-${side}.svg" width="${PW}" height="${PH}"/>
    ${inner.under||''}
    ${inner.over||''}
    ${screw(50,160)}${screw(1664,160)}
  </svg>`;
}
function screw(x,y){ return `<circle cx="${x}" cy="${y}" r="13" fill="#6d7175" stroke="#3a3d40" stroke-width="2"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#33363a" stroke-width="3"/>`; }
function rocker(on, x, y){ x=x||124; y=y||58;   // centred on the 100 × 150 px rocker cut-out at (180, 131) in the .cdr artwork
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
/* ---- view scaffolds for the analog PODs (same code in each of these files) ---- */
function simView(cfg){ return function(m){
  window[cfg.flag] = true;
  m.innerHTML = `<div class="grid2"><div>
      ${card(cfg.frontTitle||'Front panel at the playhead', `<div id="fp"></div>${cfg.controls()}`)}
      ${card(cfg.rearTitle||'Rear panel — click the connectors', `<div id="rp"></div>${cfg.rearNote||''}`)}
    </div><div>
      ${card('What the circuit did (last action)', `<div id="trace" class="log"></div>`)}
      ${card(cfg.nowTitle||'Outputs now', `<div id="now"></div>`)}
    </div></div>
    ${card(cfg.tlTitle||'Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>`)}
    <div class="grid2">${card(cfg.levelsTitle||'Level through every stage', `<div id="lv"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML=cfg.front(t); cfg.bind(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=cfg.rear(t); cfg.bind(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(cfg.D, cfg.hint);
    m.querySelector('#now').innerHTML=cfg.now(t);
    m.querySelector('#lv').innerHTML=cfg.levels(t);
    m.querySelector('#log').innerHTML=logHTML(cfg.D);
    SIM.drawLanes(m.querySelector('#tl'), cfg.lanes(), {labelW:cfg.labelW||190});
  };
  cfg.bindControls(m);
  SIM.on('time', draw);
}; }
function tableRows(rows, head){ return `<table class="kv"><tr>${(head||['Event','per second','period / τ','what it means']).map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((x,i)=>`<td class="${i===1||i===2?'mono':i===3?'small':''}">${x}</td>`).join('')}</tr>`).join('')}</table>`; }
function secondView(cfg){ return function(m){
  window[cfg.flag] = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('As seen by the circuit at the playhead', `<div id="dev"></div>`)}${card('As seen by the outside world', `<div id="fp"></div><h3>${cfg.meterTitle||'Downstream meters (dBu, 1-cycle peak → rms)'}</h3><canvas id="meter"></canvas>`)}</div>
    ${card('Zoom ladder at the playhead — '+cfg.ladderLabel, `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#ladder').innerHTML=tableRows(cfg.rows(t));
    m.querySelector('#dev').innerHTML=cfg.dev(t);
    m.querySelector('#fp').innerHTML=cfg.front(t); cfg.bind(m.querySelector('#fp'));
    const outs=cfg.outs(), {c,w}=SIM.canvas(m.querySelector('#meter'), outs.length*31+8), f=cfg.freq();
    outs.forEach(([n,fn,ref],i)=>{ let pk=0; const P=1/f; for(let k=0;k<32;k++) pk=Math.max(pk,Math.abs(fn(t-P*k/32))); const d=v2dbu(pk/Math.SQRT2)+(ref||0), segs=40, lit=Math.round(clamp((d+30)/58,0,1)*segs);
      for(let s=0;s<segs;s++){ const x=110+s*(w-120)/segs; c.fillStyle= s<lit ? (s>=segs-6?'#e3453a':s>=segs-14?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); c.fillRect(x, 6+i*31, (w-120)/segs-2, 22); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(n+' '+(d>-150?fdb(d):'—'), 4, 21+i*31); });
    drawLadder(m.querySelector('#zl'), t, cfg.ladder(), cfg.ladderFn, -0.05, cfg.ladderLabel+', volts');
  };
  SIM.on('time', draw);
}; }
function softView(cfg){ return function(m){
  window[cfg.flag] = true;
  let which=0, hot=cfg.firstHot||1;
  m.innerHTML = `${card('No firmware — the signal path is the program', `<p class="small">${cfg.intro}</p>${cfg.flows.map((f,i)=>`<h3>${f.title}</h3><div id="f${i}"></div>`).join('')}<div id="det" class="card" style="margin-top:10px"></div>`)}
    <div class="grid2">${card(cfg.chartTitle, `<canvas id="gc"></canvas>`)}${card('How the controls did things', `<div id="btn"></div>`)}</div>
    ${card(cfg.pinsTitle||'Pin-outs and terminations', `<div id="pins"></div>`)}`;
  const draw=()=>{
    cfg.flows.forEach((f,i)=>{ const st=f.stages(); const el=m.querySelector('#f'+i); el.innerHTML=flowSVG(st, which===i?hot:-1);
      el.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{ which=i; hot=+g.dataset.st; draw(); }); });
    const f=cfg.flows[which], det=f.det[Math.min(hot,f.det.length-1)];
    m.querySelector('#det').innerHTML=det?det():'';
    cfg.chart(m.querySelector('#gc'));
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Circuit path</th><th>Result</th></tr>${cfg.buttons.map(r=>`<tr><td>${r[0]}</td><td class="small mono">${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</table><p class="small">Last action: <b>${cfg.D.log[0]?cfg.D.log[0].name:'none yet'}</b></p>`;
    m.querySelector('#pins').innerHTML=`<table class="kv"><tr><th>Connector</th><th>Pin</th><th>Net / function</th></tr>${cfg.pins.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td class="mono small">${r[2]}</td></tr>`).join('')}</table>`;
  };
  SIM.on('time', draw);
}; }
function notesView(flag, title, findings, assumptions, sources){ return function(m){
  window[flag]=false;
  m.innerHTML = card(title, `<ol>${findings.map(f=>`<li>${typeof f==='function'?f():f}</li>`).join('')}</ol>`)
    + card('Assumptions in this simulation', `<ul class="small">${assumptions.map(a=>`<li>${a}</li>`).join('')}</ul>`)
    + card('Sources', `<ul class="small mono">${sources.map(s=>`<li>${s}</li>`).join('')}</ul>`);
}; }
/* curve chart: series [{fn(x)->y, col, label, cur}] over x 0..1 */
function curveChart(cv, series, ymin, ymax, ylab, xl, xr){
  const {c,w}=SIM.canvas(cv,200), x0=46, pw=w-66, Y=v=>10+(ymax-v)/(ymax-ymin)*170;
  c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif';
  const step=(ymax-ymin)/6; for(let k=0;k<=6;k++){ const v=ymin+k*step, y=Y(v); c.beginPath(); c.moveTo(x0,y); c.lineTo(x0+pw,y); c.stroke(); c.fillText((Math.abs(v)<1e-9?0:+v.toFixed(1))+(ylab||''),2,y+3); }
  series.forEach(s=>{ c.strokeStyle=s.col; c.lineWidth=2; c.beginPath(); for(let i=0;i<=100;i++){ const y=Y(clamp(s.fn(i/100),ymin,ymax)); i?c.lineTo(x0+pw*i/100,y):c.moveTo(x0,y);} c.stroke();
    if (s.cur!=null){ const y=Y(clamp(s.fn(s.cur),ymin,ymax)); c.fillStyle=s.col; c.beginPath(); c.arc(x0+pw*s.cur,y,5,0,7); c.fill(); c.fillText(s.label, Math.min(x0+pw*s.cur+8,w-90), y-6); } });
  c.fillStyle=SIM.css('--ink2'); c.fillText(xl||'fully CCW', x0, 196); c.fillText(xr||'fully CW', x0+pw-50, 196);
}
/* full-wave rectified, capacitor-filtered unregulated rail at time t (sawtooth ripple at 2× mains) */
function rippleRail(Vdc, Vpp, fm){ return t=>{ const ph=(t*2*fm)%1; return Vdc + Vpp*(0.5-ph); }; }
/* "power-on" ramp: v(t) after an on-event at tOn (tOn<0 = always on) */
function ramp(on, tOn, t, V, delay, tau){ if (!on) return 0; if (tOn<0) return V; if (t<tOn) return 0; const dt=t-tOn-(delay||0); return dt<=0?0:V*(1-Math.exp(-dt/(tau||0.01))); }
/* pot laws: lin, audio (log, 10 % at mid) */
const taper = { lin:p=>p, log:p=>p<=0?0:(Math.pow(10,2*p)-1)/99 };

const PREFIX='pod29';
const CFG = {
  product:'POD29', name:'POD29 · four-output 40 W regulated power supply (2014|47)', year:2014, folder:'#POD #SERIES/POD29 - #Master',
  summary:'Half-rack 40 W dual-rail power supply with four parallel + − G outputs on pluggable terminals: POD29A (±15 V) or POD29B (±12 V). Only a wiring diagram, a draft manual and panels survive, so the supply module itself is modelled from the manual ratings.',
  highlights:['Real silkscreen panels; click outputs to load them','Rail ratings per version (A ±15 V, B ±12 V) from the draft manual','Load steps, switching ripple and hiccup on overload','POD29X/L/E rear-panel family'],
  mains:'90–230 VAC 50–60 Hz, 2 A S.B. (rear silk)', module:'an enclosed 40 W dual-output switching module (make not in the archive, inferred)',
  wiring:'POD29A WIRING.sch (ISS.1): the module\'s outputs come in on P2 “JONES TERMINAL” (5-way) and go in parallel to P1, P3, P4, P5 “OUTPUT 1–4” (3-way each); L1 green LED through R1 4K7.', wiringShort:'P2 Jones → P1/P3/P4/P5',
  ledXY:[325,218], iec:[1359,33,1607,249],
  vers:[{id:'A',label:'POD29A (±15 V)',rails:[{k:'p',name:'V+ (+15 V)',v:15,imax:1.5},{k:'n',name:'V− (−15 V)',v:-15,imax:1.2}],note:'Manual: 40 W total, V+ +15 V @ 1.5 A, V− −15 V @ 1.2 A.'},
        {id:'B',label:'POD29B (±12 V)',rails:[{k:'p',name:'V+ (+12 V)',v:12,imax:1.8},{k:'n',name:'V− (−12 V)',v:-12,imax:1.2}],note:'Manual: 40 W total, V+ +12 V @ 1.8 A, V− −12 V @ 1.2 A.'}],
  outs:[1,2,3,4].map(n=>({name:'OUTPUT '+n, short:'OUT '+n, conn:'3-way pluggable terminal (+ − G)', rails:['p','n']})),
  loads:[[0,'open'],[0.1,'100 mA'],[0.25,'250 mA'],[0.5,'500 mA'],[1,'1 A'],[3,'short (3 A)']],
  drawOut:(o,i,live,a)=>{ const x=240+310*i, y=168; /* cut-out 146 × 98 px centred (240+310·i, 168), flange screws at ±100, y 127 (POD29-FRONT&REAR-SILK (CURVE).cdr) */ return `<g class="o${i}" style="cursor:pointer"><title>${o.name} (+ − G) — click to step the load (now ${a} A)</title>${[-100,100].map(d=>`<circle cx="${x+d}" cy="127" r="12" fill="#b9bcbf" stroke="#55595c" stroke-width="2"/><path d="M${x+d-7} 127h14" stroke="#55595c" stroke-width="3"/>`).join('')}<rect x="${x-73}" y="${y-49}" width="146" height="98" rx="4" fill="#2fae5c" stroke="#0e5d2b" stroke-width="2"/><rect x="${x-62}" y="${y-42}" width="124" height="84" fill="#26a356" stroke="#0e5d2b"/>${[-38,0,38].map(d=>`<rect x="${x+d-14}" y="${y-8}" width="28" height="40" fill="#5b5f62"/><circle cx="${x+d}" cy="${y-26}" r="8" fill="#999"/>`).join('')}${live?`<rect x="${x-58}" y="${y+36}" width="116" height="8" fill="#2b5f9e"/>`:''}</g>`; },
  blocks:{ ac:{x:20,y:100,w:160,h:80,t:'IEC + rocker',s:['90–230 VAC, 2 A S.B.'],d:'Rear IEC inlet with fuse; front rocker.'},
    mod:{x:230,y:90,w:180,h:100,t:'Switching module',s:['dual output, 40 W','A: ±15 V · B: ±12 V'],d:'Not identified in the archive (inferred enclosed switcher on the POD29E/L mounting plates).'},
    jw:{x:460,y:100,w:150,h:80,t:'P2 Jones terminal',s:['5-way','POD29A WIRING.sch'],d:'Interconnect between the module and the output connectors.'},
    out:{x:650,y:40,w:150,h:110,t:'OUTPUT 1–4',s:['P1, P3, P4, P5','+ − G each','all in parallel'],d:'Pluggable green terminals on the rear.'},
    led:{x:650,y:190,w:150,h:70,t:'L1 power LED',s:['R1 4K7'],d:'Front green LED.'} },
  wires:[['ac','mod','L/N'],['mod','jw','V+ V− 0V'],['jw','out',''],['jw','led','']], firstBlock:'mod',
  sentence:'A mains switching module makes two regulated rails that are wired in parallel to four rear + − G connectors, with a green LED on the front.',
  sheets:[{name:'1 · POD29A wiring', note:'Redrawn from POD29A WIRING.sch (P-CAD 2002, ISS.1): components L1, P1–P5, R1 only. Pin assignments of the Jones terminal are inferred.', svg:()=>
    chip(330,120,150,'P2 JONES TERMINAL',[['1','V+ '+'(inferred)'],['2','0V'],['3','V−'],['4','0V'],['5','chassis']],[['→','P1 OUTPUT 1'],['→','P3 OUTPUT 2'],['→','P4 OUTPUT 3'],['→','P5 OUTPUT 4']],'H1X5')
    +txt(60,360,'Each OUTPUT (H1X3): + = V+, − = V−, G = 0 V. L1 GREEN with R1 4K7 across V+ and 0 V.',11.5)+txt(60,385,'The PCB folder (POD29 - #Engineering/PCB) is empty: the wiring sheet is the only electrical drawing.',11.5)}],
  schemNote:'Only the wiring diagram exists for POD29.',
  pins:[['OUTPUT 1–4','+ / − / G','V+ / V− / 0 V (all four in parallel)'],['Jones P2','1–5','module interconnect (pin use inferred)'],['IEC','L / N / E','90–230 VAC, 2 A S.B. fuse']],
  lessons:A=>[
    {title:'Meet the POD29', body:'<p>POD29 is a <b>four-output regulated power supply</b> in a POD case: two rails (±15 V for POD29A, ±12 V for POD29B), each available on four rear + − G connectors, 40 W in total.</p>', check:()=>true, auto:true},
    {title:'1 · Power up', body:'<p>Switch on. The rails rise about 40 ms later (soft start).</p>', check:()=>D.power, hint:'Rocker.'},
    {title:'2 · Load the outputs', body:'<p>Put 500 mA on OUTPUT 1 and OUTPUT 2.</p>', check:()=>D.load[0]===0.5&&D.load[1]===0.5, hint:'Click a rear output to step its load, or use the menus.'},
    {title:'3 · Near the rating', body:'<p>On POD29A the V− rail is rated 1.2 A. Add load until V− carries at least 1.0 A but is not overloaded.</p>', check:()=>D.ver==='A'&&railI('n')>=1&&!overload(), hint:'Step OUTPUT 3 to 250 mA.'},
    {title:'4 · Overload', body:'<p>Short OUTPUT 4. The module goes into hiccup: the LED blinks and the rails pulse (zoom to 1 s).</p>', check:()=>overload(), hint:'Step OUTPUT 4 to “short”.'},
    {title:'5 · The ±12 V version', body:'<p>Clear the short and switch to POD29B: V+ may carry 1.8 A.</p>', check:()=>D.ver==='B'&&!overload(), hint:'Version menu.'},
    {title:'Done', body:'<p>Findings explains the POD29X/L/E panel family.</p>', check:()=>true, auto:true}],
  findings:[
    '<b>The manual ratings add up to the 40 W headline only for POD29A.</b> 15 V × 1.5 A + 15 V × 1.2 A = 40.5 W. POD29B gives 12 × 1.8 + 12 × 1.2 = 36 W, so its “40W” is the module rating, not what the rails can deliver together.',
    '<b>There is no circuit, only wiring.</b> <span class="mono">POD29 - #Engineering/PCB</span> is empty; <span class="mono">WiringDiagrams/POD29A WIRING.sch</span> holds just L1, R1 4K7 and five connectors (P2 “JONES TERMINAL” to four 3-way outputs). The supply is a bought-in module.',
    '<b>The “POD29X” rear silk is really POD29L and POD29E.</b> <span class="mono">POD29X-REAR-SILK(CURVE).pdf</span> (May 19/15) shows two 5-pin rears labelled POD29L (±24 V, +48 V phantom) and POD29E (±12 V, pin 5 NC). The matching drawing is titled “POD29XLR REAR PANEL” and notes “SILKSCREEN TO ARTWORK (POD29X-REAR-SILK (POD29E or POD29L))”. The folder <span class="mono">POD29X - #Mechanical #DA #2016</span> is empty.',
    '<b>Two input ranges on the silks.</b> POD29 reads “90-230 VAC 50-60 Hz, 2 A.S.B.”; POD29L/E read “100-230 VAC, 50-60 Hz”.',
    '<b>All outputs share one module.</b> The four connectors are in parallel, so a short on one output takes the other three down with it (hiccup in this model).',
    ()=>`<b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src(ART_PATH,'POD29-FRONT&REAR-SILK (CURVE).cdr')} (Jul.03/14).</b> Despite “CURVE” in its name the file keeps every POD29 legend (model line, OUTPUT 1–4, + − G, mains text) as live Arial text; only the PODS logo and “by Ward-Beck Systems” are curves. The front has one hole besides the rocker cut-out and the fixing screws: the power LED, Ø 51 px (6.5 mm), twice the 3.3 mm tally holes of POD27/28 (a panel-mount LED holder, ${inf}). On the rear each OUTPUT cut-out (146 × 98 px, 18.5 × 12.4 mm) has two flange-screw holes 200 px (25.4 mm) apart, and a small hole above the right fixing screw (as on POD27/28, where the POD28 ISS 1 rear drawing calls it the ground-stud insert).`,
    '<b>The manual is a draft.</b> <span class="mono">POD29 MANUALtemp.wpd</span> lists only versions and ratings; there is no regulation or ripple specification.'],
  assumptions:['Module: 0.03 Ω output resistance, ≈ 30 mV p-p ripple at 100 kHz, 40 ms start-up, hiccup 30 ms on / 250 ms period on overload (all inferred; no datasheet in the archive).','Overload = any rail above 110 % of its manual rating, or total above 115 % of 40 W (inferred).','The rocker matches the photo; the front silk has only the LED cross-hair.'],
  sources:['POD29 - #Engineering/WiringDiagrams/POD29A WIRING.sch',SIM.src(ART_PATH,'POD29 - #ARTWORK #DA #2016/POD29-FRONT&REAR-SILK (CURVE).cdr')+' (panel artwork, vector)','POD29 - #Engineering/MANUAL/POD29 MANUALtemp.wpd','POD29 - #ARTWORK #DA #2016/POD29-FRONT&amp;REAR-SILK (CURVE).pdf · POD29X-REAR-SILK(CURVE).pdf · Pics/POD29 FRONT.jpg, REAR.jpg','POD29 - #Mechanical #DA #2016/POD29-M1 ISS 1 (FRONT PANEL).pdf · POD29-M2 ISS 1 (REAR PANEL).pdf']
};
const V = { Rout:0.03, tauStep:0.0004, fsw:100000, ripple:0.03, hicPeriod:0.25, hicOn:0.03, Ptot:40 };   // switcher behaviour inferred (see Findings)
const D = { power:true, powerAt:-1, ver:CFG.vers[0].id, load:CFG.outs.map(()=>CFG.loads[1][0]), changedAt:-1, prevI:null, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const VER=()=>CFG.vers.find(v=>v.id===D.ver);
/* each output draws `amps` from every DC rail it carries (symmetrical load for the ± pair, phantom separate) */
function railI(k){ return D.load.reduce((s,a,i)=>s+(CFG.outs[i].rails.includes(k)?a*(VER().iScale?.[k]||1):0),0); }
function overload(){ return VER().rails.some(r=>railI(r.k)>r.imax*1.1) || VER().rails.reduce((s,r)=>s+Math.abs(r.v)*railI(r.k),0)>V.Ptot*1.15; }
function upAt(t){ if (!D.power) return 0; if (D.powerAt>=0 && t<D.powerAt) return 0; const dt=D.powerAt<0?1:t-D.powerAt; return dt<0.03?0:Math.min(1,(dt-0.03)/0.01); }  // ≈30 ms start-up, 10 ms soft start (inferred)
function hiccupOn(t){ if (!overload()) return true; const ph=((t-(D.changedAt<0?0:D.changedAt))%V.hicPeriod+V.hicPeriod)%V.hicPeriod; return ph<V.hicOn; }
function railAt(r,t){ const u=upAt(t); if (!u || !hiccupOn(t)) return 0;
  const I=railI(r.k), Ip=D.prevI?D.prevI[r.k]:I, step=(D.changedAt>=0&&t>=D.changedAt)? (I-Ip)*0.12*Math.exp(-(t-D.changedAt)/V.tauStep) : 0;
  const rip=V.ripple*Math.sign(r.v)*0.5*Math.sin(2*Math.PI*V.fsw*t);
  return u*(r.v - Math.sign(r.v)*(I*V.Rout + step)) + rip; }
const act=makeActor(D,()=>VER().rails.map(r=>`${r.name} ${railI(r.k).toFixed(2)} A`).join(' · ')+(overload()?' · OVERLOAD':''));
function snapI(){ const o={}; VER().rails.forEach(r=>o[r.k]=railI(r.k)); return o; }
const A={
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t; tr(`IEC inlet (${CFG.mains}) → rocker → ${CFG.module}`); tr(`${CFG.wiring}`); tr('Scrub ≈ 40 ms forward from the playhead to watch the soft start ('+inf+')'); } else tr('Outputs fall to 0 V'); }); },
  load(i){ const L=CFG.loads, k=L.findIndex(x=>x[0]===D.load[i]); act(`${CFG.outs[i].name}: load → ${L[(k+1)%L.length][1]}`, tr=>{ D.prevI=snapI(); D.changedAt=SIM.t; D.load[i]=L[(k+1)%L.length][0];
    tr(`${CFG.outs[i].name} (${CFG.outs[i].conn}) now draws ${D.load[i].toFixed(2)} A from ${CFG.outs[i].rails.map(k=>VER().rails.find(r=>r.k===k)?.name).filter(Boolean).join(' and ')}`);
    VER().rails.forEach(r=>tr(`${r.name}: ${railI(r.k).toFixed(2)} A of ${r.imax} A rated → ${(r.v-Math.sign(r.v)*railI(r.k)*V.Rout).toFixed(2)} V`));
    tr(overload()?'Over the rating: the module goes into hiccup (on 30 ms every 250 ms, '+inf+'); the power LED blinks':'Within rating: a short load-step dip recovers in ≈ 1 ms ('+inf+')'); }); },
  ver(v){ act(`Version → ${CFG.vers.find(x=>x.id===v).label}`, tr=>{ D.ver=v; tr(CFG.vers.find(x=>x.id===v).note); }); },
  reset(){ Object.assign(D,JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
function frontSVG(t){ const on=D.power&&upAt(t)>0.5&&hiccupOn(t); return panelSVG(PREFIX,'front',{over:rocker(D.power)+led(CFG.ledXY[0],CFG.ledXY[1],on,'var(--led-g)',12)},`${CFG.product} front panel (real silkscreen)`); }
function rearSVG(){ let over='';
  CFG.outs.forEach((o,i)=>{ const live=D.load[i]>0; over+=CFG.drawOut(o,i,live,D.load[i]); });
  over+=iec(...CFG.iec);
  const svg=panelSVG(PREFIX,'rear',{over},`${CFG.product} rear panel (real silkscreen)`);
  return CFG.rearLayer? svg.replace(`${ASSET}${PREFIX}-rear-white.png`, `${ASSET}${PREFIX}-${CFG.rearLayer(D.ver)}.png`) : svg; }
function bindPanel(r){ const p=r.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); CFG.outs.forEach((o,i)=>r.querySelectorAll('.o'+i).forEach(g=>g.onclick=()=>A.load(i))); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px"><label>Version <select id="vr">${CFG.vers.map(v=>`<option value="${v.id}" ${v.id===D.ver?'selected':''}>${v.label}</option>`).join('')}</select></label>
  ${CFG.outs.map((o,i)=>`<label>${o.short} <select id="ld${i}">${CFG.loads.map(([a,l])=>`<option value="${a}" ${a===D.load[i]?'selected':''}>${l}</option>`).join('')}</select></label>`).join('')}</div>
  <div class="small muted" style="margin-top:4px">Click a rear output connector to step its load (open → … → short). Keys 1–${CFG.outs.length} do the same; P = power.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#vr')) return; g('#vr').onchange=e=>A.ver(e.target.value);
  CFG.outs.forEach((o,i)=>g('#ld'+i).onchange=e=>{ const v=+e.target.value; act(`${o.name}: load → ${e.target.selectedOptions[0].text}`, tr=>{ D.prevI=snapI(); D.changedAt=SIM.t; D.load[i]=v; tr(`${o.name} draws ${v} A`); tr(overload()?'OVERLOAD: hiccup mode ('+inf+')':'Within rating'); }); }); }
bindKeys('__'+PREFIX+'Active',()=>{ const k={p:()=>A.power()}; CFG.outs.forEach((o,i)=>k[''+(i+1)]=()=>A.load(i)); return k; });
function lanes(){ const wn=SIM.css('--warn'), a=SIM.css('--accent'), b=SIM.css('--accent2');
  return [ { label:'Mains (60 Hz)', h:22, draw(c,X,t0,t1,y,h){ if(!D.power) return; SIM.pulses(c,X,t0,t1,y,h,1/120,0,1/480,SIM.css('--ink2'),'rectified mains peaks into the module'); } },
    { label:`Switcher (${V.fsw/1000} kHz, ${'inferred'})`, h:20, draw(c,X,t0,t1,y,h){ if(!D.power||!upAt((t0+t1)/2)) return; SIM.pulses(c,X,t0,t1,y,h,1/V.fsw,0,0.3/V.fsw,b,'PWM'); } },
    ...VER().rails.map(r=>waveLane(`${r.name} at the terminals`, t=>railAt(r,t), Math.abs(r.v)*1.15, null, r.v<0?SIM.css('--accent2'):a, 34)),
    ...VER().rails.map(r=>waveLane(`${r.name} ripple/transient (AC, ±0.2 V)`, t=>railAt(r,t)-(upAt(t)&&hiccupOn(t)?r.v-Math.sign(r.v)*railI(r.k)*V.Rout:0), 0.2, null, wn, 26)),
    boolLane('Power LED', t=>D.power&&upAt(t)>0.5&&hiccupOn(t), '#9be35a') ]; }
function nowHTML(t){ return `<table class="kv">${VER().rails.map(r=>{ const I=railI(r.k); return `<tr><th>${r.name}</th><td class="mono">${railAt(r,t).toFixed(3)} V · ${I.toFixed(2)} / ${r.imax} A ${I>r.imax*1.1?'<b style="color:var(--bad)">OVER</b>':''}</td></tr>`; }).join('')}
  <tr><th>Total power</th><td class="mono">${VER().rails.reduce((s,r)=>s+Math.abs(r.v)*railI(r.k),0).toFixed(1)} W of ${V.Ptot} W ${overload()?'<b style="color:var(--bad)">HICCUP</b>':''}</td></tr></table>`; }
function levelsHTML(){ return `<table class="kv"><tr><th>Output</th><th>Connector</th><th>Load</th><th>Rails</th></tr>${CFG.outs.map((o,i)=>`<tr><td>${o.name}</td><td class="small">${o.conn}</td><td class="mono">${D.load[i].toFixed(2)} A</td><td class="mono small">${o.rails.map(k=>{ const r=VER().rails.find(x=>x.k===k); return r?`${r.name} ${(r.v-Math.sign(r.v)*railI(k)*V.Rout).toFixed(2)} V`:''; }).join(' · ')}</td></tr>`).join('')}</table><p class="small muted">All outputs are wired in parallel to one module, so every load shares the rail ratings. Output resistance ${V.Rout} Ω and the hiccup timing are ${inf}.</p>`; }
const viewSim=simView({flag:'__'+PREFIX+'Active',D,front:frontSVG,rear:rearSVG,bind:bindPanel,controls:controlsHTML,bindControls,now:nowHTML,levels:levelsHTML,lanes,labelW:230,nowTitle:'Rails now',levelsTitle:'Outputs and loads',rearTitle:'Rear panel — click an output to step its load',rearNote:`<p class="small muted" style="margin:6px 0 0">Panel artwork: ${SIM.src(ART_PATH,'POD29-FRONT&REAR-SILK (CURVE).cdr')} (CorelDRAW, Jul.03/14), converted to vector: green and white ink plates on one panel, holes and cut-outs from the same drawing; its live-text legends are set in Arial-metric type on the PDF export's word positions.</p>`,tlTitle:'Timeline — one second, zoomable. Zoom to 50 µs to see the switching ripple; change a load to see the step.',hint:'Click an output connector to load it, or flip the rocker.'});
const LESSONS=CFG.lessons(A);
let lessonIdx=0;
function viewTutorial(m){ window['__'+PREFIX+'Active']=true; tutorialView(m,{title:'Tutorial — powering gear from a '+CFG.product,lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${nowHTML(SIM.t)}</div>`,bind:r=>{bindPanel(r);bindControls(r);}}); }
function viewSecond(m){ window['__'+PREFIX+'Active']=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the supply at the playhead',`<div id="dev"></div>`)}${card('As seen by the outside world',`<div id="fp"></div>`)}</div>${card('Zoom ladder at the playhead — '+VER().rails[0].name,`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, r0=VER().rails[0];
    m.querySelector('#ladder').innerHTML=tableRows([['Mains half-cycles','120',SIM.fmtDur(1/120),`${CFG.mains}: the module's bulk capacitor is topped up at each peak`],['Switching cycles',(V.fsw).toLocaleString()+' '+inf,SIM.fmtDur(1/V.fsw),`≈ ${V.ripple*1000} mV p-p ripple on each rail (${inf})`],['Start-up','—','≈ 40 ms '+inf,'delay + soft start after the rocker'],['Load-step recovery','—',SIM.fmtDur(V.tauStep*3),'control loop settles in about 3 τ ('+inf+')'],['Hiccup on overload','4',SIM.fmtDur(V.hicPeriod),'tries for 30 ms, rests 220 ms ('+inf+')']]);
    m.querySelector('#dev').innerHTML=nowHTML(t); m.querySelector('#fp').innerHTML=frontSVG(t);
    drawLadder(m.querySelector('#zl'),t,[['1 second',1],['100 ms',0.1],['10 ms',0.01],['100 µs',1e-4],['20 µs (2 switching cycles)',2e-5]],tt=>railAt(r0,tt),Math.abs(r0.v)*1.2,r0.name+', volts'); };
  SIM.on('time',draw); }
function viewBlock(m){ window['__'+PREFIX+'Active']=false; blockView(m,CFG.blocks,CFG.wires,CFG.firstBlock,[820,300],card('In one sentence',`<p>${CFG.sentence}</p>`)); }
function viewSchem(m){ window['__'+PREFIX+'Active']=false; schemView(m,CFG.sheets,CFG.product,CFG.schemNote); }
const viewSoft=softView({flag:'__'+PREFIX+'Active',D,intro:`${CFG.product} has no processor. The “program” is the power path; click a stage.`,
  flows:[{title:'Power path',stages:()=>[{t:'IEC + rocker',s:[CFG.mains]},{t:'Supply module',s:[VER().label]},{t:'Wiring',s:[CFG.wiringShort]},{t:'Outputs',s:[CFG.outs.length+' × '+CFG.outs[0].conn.split(' ')[0]],bad:overload()},{t:'Loads',s:[VER().rails.reduce((s,r)=>s+Math.abs(r.v)*railI(r.k),0).toFixed(1)+' W']}],
    det:[()=>`<b>Mains.</b> ${CFG.mains}.`,()=>`<b>Module.</b> ${VER().note}`,()=>`<b>Wiring.</b> ${CFG.wiring}`,()=>`<b>Outputs.</b> all in parallel: ${CFG.outs.map(o=>o.name).join(', ')}.`,()=>`<b>Loads.</b> ${VER().rails.map(r=>`${r.name}: ${railI(r.k).toFixed(2)} A`).join(' · ')}.`]}],
  chartTitle:'Load current → rail voltage (regulation)', chart:cv=>curveChart(cv,VER().rails.map((r,j)=>({fn:x=>Math.abs(r.v)-x*r.imax*1.2*V.Rout - (x>1/1.2*1.1?Math.abs(r.v):0), col:[SIM.css('--accent'),SIM.css('--accent2'),SIM.css('--warn')][j%3], label:r.name, cur:Math.min(1,railI(r.k)/(r.imax*1.2))})),0,Math.max(...VER().rails.map(r=>Math.abs(r.v)))*1.1,' V','0 A','1.2 × rated'),
  buttons:[['Rocker','IEC → rocker → module','All rails'],['Load an output','parallel wiring to the module','Shares the rail rating'],['Overload','module current limit','Hiccup, LED blinks']],
  pins:CFG.pins});
const viewNotes=notesView('__'+PREFIX+'Active',`What the ${CFG.product} archive shows — findings`,CFG.findings,CFG.assumptions,CFG.sources);
SIM.register({ id:'pod29', name:CFG.name, duration:1, product:CFG.product, year:CFG.year, family:'POD series', folder:CFG.folder, summary:CFG.summary, highlights:CFG.highlights, depth:'Hardware model',
  stepUnits:[{label:'1 switching cycle',period:()=>1/V.fsw},{label:'1 mains half-cycle',period:()=>1/120},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s (hiccup cycles)'],[0.1,'100 ms (start-up)'],[0.01,'10 ms'],[0.001,'1 ms (load step)'],[0.00005,'50 µs (ripple)']], defaultZoom:1, init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second, cycle by cycle',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Wiring',render:viewSchem},{id:'software',label:'Power path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}] });

})();
