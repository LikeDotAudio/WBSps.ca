/* =====================================================================
   POD26 — Six-channel audio level amplifier (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.

   Sources used (all in this archive, folder #POD #SERIES/POD26 - #Master):
   - POD26 - #Engineering/PCB/POD26iss1.net, POD26iss1.bom          (P-CAD ISS1 netlist and BOM: every pin and value below)
   - POD26 - #Engineering/MANUAL/POD26MANU.wpd                       (manual: −12 … +18 dB, +24 dBu, 40 kΩ, 60 Ω, 12 VA)
   - POD26 - #ARTWORK #DA #2016/POD26-FRONT&REAR-SILK (CURVE).pdf    (panel silkscreen, Jul 2 2014) + Pics/POD26 Front.jpg, Rear.jpg
   - POD26 - #Mechanical #DA #2016/POD26-FRONT ISS 1, POD26-REAR ISS 2 (PANEL).pdf
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
/* ---- view scaffolds for the analog PODs (same code in each of these files) ---- */
function simView(cfg){ return function(m){
  window[cfg.flag] = true;
  m.innerHTML = `<div class="grid2"><div>
      ${card(cfg.frontTitle||'Front panel at the playhead', `<div id="fp"></div>${cfg.controls()}`)}
      ${card(cfg.rearTitle||'Rear panel — click the connectors', `<div id="rp"></div>`)}
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

const PREFIX='pod26';
/* channel n (1–6): header Hn, input stage U(2n−1), output stage U(2n), trim LVL(n+4) — from POD26iss1.net */
const CHS=[1,2,3,4,5,6].map(n=>({ n, H:'H'+n, Uin:'U'+(2*n-1), Uout:'U'+(2*n), LVL:'LVL'+(n+4),
  R:[['R1','R2','R3','R5','R6','R7','R13','R14'],['R16','R20','R4','R15','R19','R11','R24','R18'],['R29','R33','R26','R28','R32','R25','R37','R31'],['R41','R45','R39','R40','R44','R38','R49','R43'],['R57','R52','R50','R51','R56','R55','R61','R54'],['R69','R64','R62','R63','R68','R67','R73','R66']][n-1] }));
const V = { Rin:10000, R6:43100, R7:1240, RV:5000, Rout:30, Vdc:12.2, ripple:0.5, swingLoss:1.5 };
const D = { power:true, powerAt:-1, gen:{lvl:4, f:1000}, trim:[0.5,0.5,0.5,0.5,0.5,0.5], plug:[true,true,true,true,true,true], load:600, sel:0, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const dB=g=>20*Math.log10(Math.max(g,1e-12));
/* T-network trim: R6 43K1 output→summing node, R7 1K24 summing node→wiper, 5K trim from output (ccw) to GND (CW) */
function gainT(f){ const Ra=Math.max(1e-3,f*V.RV), Rb=Math.max(1e-3,(1-f)*V.RV); const k=(1/Ra)/(1/Ra+1/Rb+1/V.R7); return (1/V.Rin)/(1/V.R6 + k/V.R7); }
const rail = rippleRail(V.Vdc, V.ripple, 60);
const railAt = t => D.power ? (D.powerAt<0||t>=D.powerAt ? Math.min(rail(t), ramp(true,D.powerAt,t,V.Vdc+1,0,0.03)) : 0) : 0;
const swing = t => Math.max(0, railAt(t)-V.swingLoss);
const hc=(v,l)=>clamp(v,-l,l);
const vin = (i,t)=> D.plug[i] ? dbu2v(D.gen.lvl)*Math.SQRT2*Math.sin(2*Math.PI*D.gen.f*t) : 0;
function chain(i,t){ const lim=swing(t), v=vin(i,t);
  const a = hc(-v/2, lim);                                   // U(2n−1)A: one leg inverted (pin 6 → R1 10K, R3 10K)
  const b = hc(gainT(D.trim[i])*v, lim);                     // U(2n−1)B with the T trim: G·(in+ − in−)
  const o1 = hc(-b, lim), o2 = b;                            // U(2n): A inverts, B follows → two legs
  const out = (o2-o1)*D.load/(D.load+2*V.Rout);
  return { v, a, b, out }; }
function levels(i){ const on=D.plug[i]&&D.power, inL=on?D.gen.lvl:-200, g=dB(gainT(D.trim[i])), lim=v2dbu((V.Vdc-V.ripple/2-V.swingLoss)/Math.SQRT2);
  const b=inL+g, out=b+6.02+dB(D.load/(D.load+2*V.Rout)), c=CHS[i];
  return { out, clip:b>lim+0.01, total:out-inL, stages:[
    {name:`INPUT ${c.n} (${c.H}-6/${c.H}-5 → ${c.R[0]}/${c.R[1]} 10K)`, lvl:inL, gain:null, clip:null, note:'two 10K resistors to virtual earths: 20 kΩ differential'},
    {name:`${c.Uin}B + ${c.LVL} T-network`, lvl:b, gain:g, clip:lim, note:`${c.R[4]} 43K1 ∥ (${c.R[5]} 1K24 to the wiper): ${fdb(dB(gainT(0)))} … ${fdb(dB(gainT(1)))} dB`},
    {name:`${c.Uout} A (−1) / B (+1) → OUTPUT ${c.n}`, lvl:out, gain:6.02+dB(D.load/(D.load+2*V.Rout)), clip:lim+6.02, note:`${c.R[6]}/${c.R[7]} 30R; into ${D.load>=1e5?'open':D.load+' Ω'}`}] }; }
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>CHS.map((c,i)=>`${c.n}:${fdb(levels(i).out)}`).join(' · ')+' dBu');
const A={
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t; tr('PWRSW1 → T3 TE70042 toroid (links “1”, “2”, “3” pick 115/230 V) → D5–D8 → C28/C55 2200 µF → ±VA (no regulators)'); tr('R27 1K → green PWR LED; 23 × 0.1 µF decouple the twelve NE5532s'); } else tr('±VA collapse; all six outputs go silent'); }); },
  trim(i,dir){ act(`Turn OUTPUT LEVEL ADJUST ${i+1} ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{ const o=D.trim[i]; D.trim[i]=clamp(+(o+dir*0.04).toFixed(3),0,1); D.sel=i; const c=CHS[i];
    tr(`${c.LVL} 5K wiper ${Math.round(o*100)} → ${Math.round(D.trim[i]*100)} % (CW end on GND, CCW end on ${c.Uin}-7)`);
    tr(`${c.Uin}B gain ${fdb(dB(gainT(o)))} → ${fdb(dB(gainT(D.trim[i])))} dB; with the +6 dB output pair, channel ${c.n} = ${fdb(dB(gainT(D.trim[i]))+6.02)} dB`); }); },
  plug(i){ act(`${D.plug[i]?'Disconnect':'Connect'} INPUT ${i+1}`, tr=>{ D.plug[i]=!D.plug[i]; D.sel=i; tr(D.plug[i]?`Source on ${CHS[i].H} pins 6/5 → ${CHS[i].R[0]}/${CHS[i].R[1]} → C 68 µF → ${CHS[i].Uin}`:'Input open: the 68 µF caps hold the stage at 0 V'); }); },
  set(k,v,l){ act(l, tr=>{ if (k==='load') D.load=v; else D.gen[k]=v; tr('Every channel follows'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
/* ---------------- panels ---------------- */
const TX = i => 720 + i*170;
function frontSVG(t){ let over=rocker(D.power)+pled(D.power&&railAt(t)>5);
  for (let i=0;i<6;i++) over+=trim(TX(i),220,D.trim[i],'tr'+i,'OUTPUT LEVEL ADJUST '+(i+1));
  return panelSVG(PREFIX,'front',{over},'POD26 front panel (real silkscreen)'); }
const PX = j => 465 + j*28.33;
function rearSVG(){ let over='';
  [[96,'out'],[172,'in']].forEach(([y,row])=>{ over+=`<rect x="${PX(0)-16}" y="${y}" width="${PX(17)-PX(0)+32}" height="52" rx="4" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>`;
    for (let j=0;j<18;j++){ const i=5-Math.floor(j/3); const hot=row==='in'&&D.plug[i];
      over+=`<g class="${row==='in'?'pl'+i:''}" style="${row==='in'?'cursor:pointer':''}">${row==='in'?`<title>INPUT ${i+1} — click to connect/disconnect</title>`:''}<rect x="${PX(j)-10}" y="${y+10}" width="20" height="32" fill="${hot?'#2b5f9e':'#0e4d25'}"/><circle cx="${PX(j)}" cy="${y+22}" r="6" fill="#9aa"/></g>`; } });
  over+=iec(1385,28,1611,252);
  return panelSVG(PREFIX,'rear',{over},'POD26 rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); for (let i=0;i<6;i++){ bindTrim(root,'tr'+i,d=>A.trim(i,d)); root.querySelectorAll('.pl'+i).forEach(g=>g.onclick=()=>A.plug(i)); } }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px">
  <label>Source <input id="gL" type="number" step="1" value="${D.gen.lvl}" style="width:56px"> dBu</label><label>Tone <select id="gF">${[100,1000,10000].map(f=>`<option ${f===D.gen.f?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
  <label>Output load <select id="ld">${[[1e6,'open'],[10000,'10 kΩ'],[600,'600 Ω']].map(([v,l])=>`<option value="${v}" ${v===D.load?'selected':''}>${l}</option>`).join('')}</select></label></div>
  <div class="small muted" style="margin-top:4px">Click a trim's right half for clockwise, left half for counter-clockwise (or wheel). Click a rear INPUT group to connect it. Keys 1–6 select a channel, Q/W turn it.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if(!g('#gL')) return; g('#gL').onchange=e=>A.set('lvl',+e.target.value,'Source → '+e.target.value+' dBu'); g('#gF').onchange=e=>A.set('f',+e.target.value,'Tone → '+e.target.value+' Hz'); g('#ld').onchange=e=>A.set('load',+e.target.value,'Load → '+e.target.selectedOptions[0].text); }
bindKeys('__pod26Active',()=>{ const k={q:()=>A.trim(D.sel,-1),w:()=>A.trim(D.sel,1)}; for(let i=0;i<6;i++) k[''+(i+1)]=()=>{ D.sel=i; SIM.refresh(); }; return k; });
/* ---------------- timeline ---------------- */
const dense=(s,pw)=>s*D.gen.f>pw/3;
const envOf=fn=>{ const e=t=>{ let m=0; const P=1/D.gen.f; for(let i=0;i<8;i++) m=Math.max(m,Math.abs(fn(t+P*i/8))); return m; }; e.dense=dense; return e; };
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), s=D.sel;
  return [ waveLane('+VA (unregulated, 120 Hz ripple)', t=>railAt(t), -1, null, wn, 30),
    waveLane(`INPUT ${s+1} (diff.)`, t=>chain(s,t).v, -0.05, null, b, 34, envOf(t=>chain(s,t).v)),
    waveLane(`${CHS[s].Uin}B (trimmed)`, t=>chain(s,t).b, -0.05, swing(1), a, 36, envOf(t=>chain(s,t).b)),
    waveLane(`OUTPUT ${s+1} (diff.)`, t=>chain(s,t).out, -0.05, 2*swing(1), a, 40, envOf(t=>chain(s,t).out)),
    ...[0,1,2,3,4,5].filter(i=>i!==s).map(i=>waveLane(`OUTPUT ${i+1}`, t=>chain(i,t).out, -0.05, 2*swing(1), SIM.css('--ink2'), 26, envOf(t=>chain(i,t).out))) ]; }
/* ---------------- views ---------------- */
function nowHTML(t){ return `<table class="kv">${CHS.map((c,i)=>{ const l=levels(i); return `<tr><th>OUTPUT ${c.n}${i===D.sel?' ◂':''}</th><td class="mono">${l.out<-150?'—':fdb(l.out)+' dBu'} (gain ${l.out<-150?'—':fdb(l.total)+' dB'}) ${l.clip?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>`; }).join('')}<tr><th>±VA at playhead</th><td class="mono">${railAt(t).toFixed(2)} V</td></tr></table>`; }
function levelsHTML(){ return `<h3>Channel ${D.sel+1}</h3>${stageTable(levels(D.sel).stages)}<p class="small muted">Rails: unregulated ±${V.Vdc} V with ${V.ripple} V p-p ripple (${inf}: the TE70042 secondary voltage is not in the archive); swing loss ${V.swingLoss} V (${inf}).</p>`; }
const viewSim=simView({flag:'__pod26Active',D,front:frontSVG,rear:rearSVG,bind:bindPanel,controls:controlsHTML,bindControls,now:nowHTML,levels:levelsHTML,lanes,labelW:210,hint:'Turn an OUTPUT LEVEL ADJUST trim or connect an input.'});
const LESSONS=[
  {title:'Meet the POD26', body:'<p>POD26 is a <b>six-channel audio level amplifier</b>: six balanced inputs and six balanced outputs on rear screw terminals, each with a front screwdriver <b>OUTPUT LEVEL ADJUST</b> from −12 to +18 dB (manual).</p>', check:()=>true, auto:true},
  {title:'1 · Power', body:'<p>Switch it on.</p>', check:()=>D.power, hint:'Rocker.'},
  {title:'2 · Unity gain on 1', body:'<p>With a +4 dBu source, set OUTPUT 1 to +4 dBu (±0.5 dB) into 600 Ω.</p>', check:()=>Math.abs(levels(0).out-4)<=0.5&&D.gen.lvl===4&&D.load===600, hint:'Click trim 1 halves; source +4 dBu; load 600 Ω.'},
  {title:'3 · Make up a weak feed', body:'<p>A feed arrives at −10 dBu on channel 4. Set the source to −10 dBu and turn trim 4 until OUTPUT 4 reads +4 dBu (±1 dB).</p>', check:()=>D.gen.lvl===-10&&Math.abs(levels(3).out-4)<=1, hint:'Keys 4, then Q/W.'},
  {title:'4 · Find the ceiling', body:'<p>Raise the source to +20 dBu with trim 4 still high: OUTPUT 4 clips on the unregulated rails.</p>', check:()=>levels(3).clip, hint:'Type 20 into Source.'},
  {title:'Done', body:'<p>Findings compares the manual with the netlist.</p>', check:()=>true, auto:true}];
let lessonIdx=0;
function viewTutorial(m){ window.__pod26Active=true; tutorialView(m,{title:'Tutorial — lining up a POD26',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${nowHTML(SIM.t)}</div>`,bind:r=>{bindPanel(r);bindControls(r);}}); }
const viewSecond=secondView({flag:'__pod26Active',front:frontSVG,bind:bindPanel,freq:()=>D.gen.f,ladderLabel:'OUTPUT '+1,ladderFn:t=>chain(D.sel,t).out,
  ladder:()=>[['1 second',1],['100 ms',0.1],['1 ripple cycle (8.3 ms)',1/120],['1 tone cycle',1/D.gen.f],['50 µs',5e-5]],
  outs:()=>CHS.map((c,i)=>['OUT '+c.n,t=>chain(i,t).out]),
  rows:()=>[['Test-tone cycles',D.gen.f.toLocaleString(),SIM.fmtDur(1/D.gen.f),'continuous analog path'],['Rail ripple (full-wave)','120',SIM.fmtDur(1/120),`C28/C55 2200 µF, no regulator: the op-amps' PSRR keeps it out of the audio (${inf})`],
    ['Input coupling (C1 68 µ · R1 10K)','—',SIM.fmtDur(68e-6*1e4),`−3 dB at ${(1/(2*Math.PI*68e-6*1e4)).toFixed(2)} Hz`],['Stage roll-off (C5 22 p · R6 43K1)','—',SIM.fmtDur(22e-12*43100),`≈ ${(1/(2*Math.PI*22e-12*43100)/1000).toFixed(0)} kHz`],['Power-up','—','≈ 30 ms '+inf,'the 2200 µF caps charge']],
  dev:t=>`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>±VA</th><td class="mono">${railAt(t).toFixed(3)} V</td></tr>${CHS.map((c,i)=>`<tr><th>CH ${c.n}</th><td class="mono">in ${chain(i,t).v.toFixed(3)} → ${chain(i,t).b.toFixed(3)} → out ${chain(i,t).out.toFixed(3)} V</td></tr>`).join('')}</table>`});
const BLOCKS={ ac:{x:20,y:20,w:170,h:80,t:'Mains + T3',s:['TE70042 toroid','D5–D8, 2 × 2200 µF'],d:'Unregulated ±VA. Links 1/2/3 select 115/230 V primaries.'},
  inp:{x:20,y:150,w:170,h:80,t:'INPUT 1–6',s:['rear Phoenix, + − G','H1–H6 headers'],d:'Each input pair goes through 10K + 68 µF into the stage.'},
  st1:{x:240,y:150,w:190,h:90,t:'U1/U3/…/U11 NE5532',s:['A: −1 on one leg','B: diff. + T-network trim','LVL5–LVL10 5K'],d:'The B half sums −(in−) from the A half and in+ with a feedback T (43K1 ∥ 1K24 to the trim wiper).'},
  st2:{x:480,y:150,w:180,h:80,t:'U2/U4/…/U12 NE5532',s:['A −1, B +1','2 × 30R build-out'],d:'Balanced output pair: +6 dB differential.'},
  out:{x:700,y:150,w:140,h:80,t:'OUTPUT 1–6',s:['rear Phoenix, + − G'],d:'Upper terminal row.'},
  fr:{x:240,y:20,w:190,h:80,t:'Front panel',s:['rocker, PWR LED','6 × OUTPUT LEVEL ADJUST'],d:'Screwdriver trims reached through panel holes.'} };
const WIRES=[['ac','st1','±VA'],['ac','st2',''],['inp','st1',''],['st1','st2',''],['st2','out',''],['fr','st1','trims']];
function viewBlock(m){ window.__pod26Active=false; blockView(m,BLOCKS,WIRES,'st1',[860,270],card('In one sentence',`<p>Six identical channels: a differential input stage with a T-network gain trim, then an inverting/non-inverting pair that drives a balanced output; twelve NE5532s run straight off an unregulated ± supply.</p>`)); }
const SHEETS=[{name:'1 · Channel 1', note:'From POD26iss1.net. Channels 2–6 repeat with H2–H6, U3–U12 and LVL6–LVL10 (designators in the Signal-path tab).', svg:()=>
  net(20,100,'H1-6 IN+')+res(90,100,160,100,'R1','10K')+cap(160,100,210,100,'C1','68µ')+wire([[210,100],[240,100],[240,88]])+opamp(240,100,'U1A')+res(240,50,300,50,'R3','10K')+wire([[240,88],[240,50]])+wire([[300,50],[320,50],[320,100]])+wire([[300,100],[340,100]])
  +res(340,100,400,100,'R5','10K')+wire([[400,100],[420,100],[420,188]])+net(20,200,'H1-5 IN−')+res(90,200,160,200,'R2','10K')+cap(160,200,210,200,'C2','68µ')+wire([[210,200],[420,200],[420,188]])
  +opamp(420,200,'U1B')+wire([[420,212],[410,212],[410,240]])+gnd(410,240)+res(430,150,510,150,'R6','43K1')+wire([[420,188],[420,150],[430,150]])+wire([[510,150],[540,150],[540,200]])+wire([[480,200],[600,200]])
  +res(420,280,500,280,'R7','1K24')+wire([[420,212],[420,280]])+res(540,240,540,330,'LVL5','5K')+wire([[540,200],[540,240]])+gnd(540,330)+txt(548,290,'wiper ← R7',10)
  +res(600,200,660,200,'R8','10K')+txt(670,190,'U2A (−1) → R13 30R → H1-1',10.5)+txt(670,230,'U2B (R12/R10 10K) → R14 30R → H1-2',10.5)
  +txt(30,420,`G = (1/R5)/(1/R6 + k/R7): ${fdb(dB(gainT(0)))} … ${fdb(dB(gainT(1)))} dB; +6.02 dB balanced → ${fdb(dB(gainT(0))+6.02)} … ${fdb(dB(gainT(1))+6.02)} dB (manual −12 … +18)`,11.5)},
  {name:'2 · Power', note:'T3 TE70042 (dual-primary toroid; two secondaries in series, centre to GNDD). No regulators on the board.', svg:()=>
  chip(120,80,160,'T3 TE70042',[['1/9','ACIN-2'],['4/12','PWRSW1'],['2,3 / 10,11','links 1, 2, 3']],[['5/13','→ D6/D7'],['8/16','→ D5/D8'],['6,7,14,15','GNDD']],'115/230 V by links')
  +txt(480,120,'D5, D6 → +VA → C28 2200 µF/25 V',11)+txt(480,150,'D7, D8 → −VA → C55 2200 µF/25 V',11)+txt(480,180,'R27 1K → PWRLED (green)',11)+txt(480,210,'C100–C123: 0.1 µF at each NE5532',11)}];
function viewSchem(m){ window.__pod26Active=false; schemView(m,SHEETS,'POD26','The P-CAD originals are POD26iss1.sch/.net/.bom. These sheets keep the netlist designators and values. Blue labels are nets.'); }
const viewSoft=softView({flag:'__pod26Active',D,intro:'POD26 has no processor. The selected channel is shown; keys 1–6 or a trim click select another.',
  flows:[{title:'Selected channel',stages:()=>{ const l=levels(D.sel), c=CHS[D.sel]; return [{t:'INPUT '+c.n,s:[fdb(l.stages[0].lvl)+' dBu','20 kΩ diff.']},{t:c.Uin+'A',s:['−1 on IN+']},{t:c.Uin+'B + '+c.LVL,s:['×'+gainT(D.trim[D.sel]).toFixed(3),fdb(l.stages[1].lvl)+' dBu'],bad:l.clip},{t:c.Uout+' pair',s:['+6.02 dB']},{t:'OUTPUT '+c.n,s:[fdb(l.out)+' dBu']}]; },
    det:[()=>`<b>Input.</b> ${CHS[D.sel].R[0]} and ${CHS[D.sel].R[1]} (10K) go to virtual earths: 20 kΩ differential, 68 µF coupling.`,()=>`<b>${CHS[D.sel].Uin}A.</b> Inverting unity (${CHS[D.sel].R[2]} 10K).`,
      ()=>{ const f=D.trim[D.sel], Ra=Math.max(1e-3,f*5000), Rb=Math.max(1e-3,(1-f)*5000), k=(1/Ra)/(1/Ra+1/Rb+1/1240); return `<b>T-network.</b> k = ${k.toFixed(4)}, G = (1/10K)/(1/43K1 + k/1K24) = ${gainT(f).toFixed(3)} (${fdb(dB(gainT(f)))} dB).`; },
      ()=>`<b>${CHS[D.sel].Uout}.</b> A inverts (10K/10K), B re-inverts: two legs in anti-phase, +6.02 dB.`,()=>`<b>Output.</b> ${CHS[D.sel].R[6]}/${CHS[D.sel].R[7]} 30R each leg: 60 Ω balanced source (the manual's “60 Ω”).`]}],
  chartTitle:'Trim position → channel gain', chart:cv=>curveChart(cv,[{fn:f=>dB(gainT(f))+6.02,col:SIM.css('--accent'),label:'CH '+(D.sel+1),cur:D.trim[D.sel]}],-20,20,' dB'),
  buttons:[['Rocker','PWRSW1 → T3 → D5–D8 → ±VA','Power'],['OUTPUT LEVEL ADJUST n','LVL(n+4) wiper ↔ R7-type 1K24 at U(2n−1)B','−12.4 … +18.7 dB'],['Connect INPUT n','Hn-6/Hn-5 → 10K → 68 µF','Signal into channel n']],
  pins:[...CHS.map(c=>[`Channel ${c.n}`, c.H, `IN+ ${c.H}-6 (${c.R[0]}), IN− ${c.H}-5 (${c.R[1]}); OUT ${c.H}-1 (${c.R[6]}), ${c.H}-2 (${c.R[7]}); GND 3,4 · ${c.Uin}/${c.Uout} · ${c.LVL}`]),['Rear terminals','2 rows × 18','OUTPUT row on top, INPUT row below; groups 6 … 1 left to right']]});
const viewNotes=notesView('__pod26Active','What the POD26 archive shows — findings',[
  `<b>The netlist reproduces the manual's gain range.</b> With R6 43K1, R7 1K24 and a 5K trim the input stage spans ${fdb(dB(gainT(0)))} … ${fdb(dB(gainT(1)))} dB; the +6 dB output pair makes it ${fdb(dB(gainT(0))+6.02)} … ${fdb(dB(gainT(1))+6.02)} dB. The manual says −12 … +18 dB.`,
  `<b>Input impedance is 20 kΩ, not 40 kΩ.</b> Each input leg sees 10K into a virtual earth, so the differential impedance is 20 kΩ. The manual's “40kΩ balanced” (and “60Ω”, “12 VA”, “1.27 kg”) appear word for word in the POD24 manual, so one sheet was copied from the other.`,
  `<b>There are no regulators.</b> T3 feeds D5–D8 and two 2200 µF capacitors directly: the twelve NE5532s run on unregulated ±VA, and the clip point follows the mains. The TE70042's voltage is not in the archive (${inf}).`,
  `<b>Trims and terminals run in opposite directions.</b> Front trims read 1 … 6 left to right, the rear terminal groups 6 … 1 left to right, because the rear is seen from behind.`,
  `<b>Duplicate and odd files.</b> <span class="mono">POD26ss1.net/.ECO/.BAK</span> (missing “i”) sit beside <span class="mono">POD26iss1.*</span>; the folder name “MECHNICAL” is misspelt; <span class="mono">POD26 - #PCB</span> duplicates <span class="mono">PCB</span>.`,
],[`Rails ±${V.Vdc} V DC with ${V.ripple} V p-p ripple (${inf}).`,`Trim: CW = more gain, linear track (${inf}).`,`The rear terminal groups map to H1–H6 in reverse order (${inf} from the silk).`],
 ['POD26 - #Engineering/PCB/POD26iss1.net · POD26iss1.bom · POD26iss1.sch','POD26 - #Engineering/MANUAL/POD26MANU.wpd','POD26 - #ARTWORK #DA #2016/POD26-FRONT&amp;REAR-SILK (CURVE).pdf · Pics/POD26 Front.jpg, Rear.jpg','POD26 - #Mechanical #DA #2016/POD26-FRONT ISS 1 (PANEL).pdf · POD26-REAR ISS 2 (PANEL).pdf']);
SIM.register({ id:'pod26', name:'POD26 · six-channel audio level amplifier (2014|47)', duration:1, product:'POD26', year:2014, family:'POD series', folder:'#POD #SERIES/POD26 - #Master',
  summary:'Half-rack six-in, six-out balanced audio level amplifier with a front screwdriver trim per channel (−12 … +18 dB). Modelled from the ISS1 netlist: twelve NE5532s with a T-network trim, on unregulated rails. The year is the panel silk date.',
  highlights:['Real silkscreen panels with six working trims and pluggable inputs','T-network gain maths that reproduces the manual range','Unregulated rails with 120 Hz ripple and clipping','Manual specs copied from the POD24 sheet'],
  depth:'Hardware model', stepUnits:[{label:'1 tone cycle',period:()=>1/D.gen.f},{label:'1 ripple cycle',period:()=>1/120},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms (power-up)'],[0.02,'20 ms (ripple)'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:3, init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: lining up a POD26',render:viewTutorial},{id:'second',label:'One second, cycle by cycle',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}] });

})();
