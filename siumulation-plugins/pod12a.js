/* =====================================================================
   POD12A — Digital audio (AES) distribution amplifier, Ward-Beck Systems (ISS2, 2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: the board carries an AT90CAN128
   MCU and an Altera Cyclone EP1C3 FPGA, but neither program is in the archive.

   Sources used (folder #POD #SERIES/POD12A - #Master):
   - POD12A - #ISS2 #GERBER.zip → POD12-iss2-net.ipc (IPC-D-356A netlist, 15 Dec 2013: every net name used here)
   - POD12A - BOM/POD12A - MASTER BOM.xlsx (SA-POD12A-MAIN, TB-75, TB-110, POD12A/75, POD12A/110)
   - POD12A - #ARTWORK #DA #2016/POD12A-FRONT&REAR-SILK (CURVE).cdr — converted to PDF with Inkscape (libcdr) and cut with
     tools/silk_extract.py; in this conversion the cut-out outlines came out as ink, so the drawn parts cover them
   - POD12A - #ARTWORK #DA #2016/Pics/POD12A Front.jpg, POD12A-75 Rear.jpg, POD12A-110 Rear.jpg
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

const PREFIX='pod12a';
const K = { lockLo:30000, lockHi:200000, thr:0.1, a75:2.5, a110:4.0, eqGain:14, srcOut:48000, srcDelay:0.0021, fpgaDelay:3, lockT:0.02 }; // all inferred except the part list
const D = { power:true, powerAt:-1, ver:'75',
  in:[ { on:true, fs:48000, cable:50, at:-1, f:1000, dbfs:-20 }, { on:true, fs:44100, cable:50, at:-1, f:400, dbfs:-18 } ],
  dip:[0,0,0,0],   // SW1 DUAL, SW2 SRC, SW3 EQ1, SW4 EQ2 (rear legend "DUAL SRC EQ1 EQ2"); 1 = ON
  term:{ load:[1,1,1,1,1,1,1,1] }, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const OUTN=['A1','A2','A3','A4','B1','B2','B3','B4'];
/* ---------------- model ---------------- */
const dual=()=>!!D.dip[0], srcOn=()=>!!D.dip[1], eqOn=k=>!!D.dip[2+k];
function rxV(k){ const c=D.in[k]; if(!c.on) return 0; const v=D.ver==='75'?1.0:4.0, a=(D.ver==='75'?K.a75:K.a110)*Math.sqrt(c.fs/48000); return v*Math.pow(10,-a*c.cable/100/20); }
function effV(k){ return rxV(k)*(eqOn(k)? Math.min(Math.pow(10,K.eqGain/20), 1/Math.max(rxV(k),1e-6)) : 1); }   // EQ path restores amplitude (inferred gain)
function lockable(k){ const c=D.in[k]; return D.power && c.on && c.fs>=K.lockLo && c.fs<=K.lockHi && effV(k)>=K.thr; }
function lockedAt(k,t){ if(!lockable(k)) return false; const st=Math.max(D.in[k].at,D.powerAt); return st<0||t>=st+K.lockT; }
// which input feeds FPGA output OUTn (OUT1 → AES1/AES2 = A1/A2 … OUT4 → AES7/AES8 = B3/B4)
function srcOf(o){ return dual() && o>=4 ? 1 : 0; }
function outRate(o){ const k=srcOf(o); return (srcOn() && k===0) ? K.srcOut : D.in[k].fs; }
function outLive(o,t){ return lockedAt(srcOf(o),t); }
function leds(t){ return { pwr:D.power, lock1:D.power&&lockedAt(0,t), nolock1:D.power&&!lockedAt(0,t), lock2:D.power&&lockedAt(1,t), nolock2:D.power&&!lockedAt(1,t),
  x8:D.power&&!dual(), x4:D.power&&dual(), src:D.power&&srcOn(), eq1:D.power&&eqOn(0), eq2:D.power&&eqOn(1) }; }
function sample(k,t){ const c=D.in[k]; const n=Math.floor(t*c.fs); return Math.pow(10,c.dbfs/20)*Math.sin(2*Math.PI*c.f*n/c.fs); }
function outSample(o,t){ const k=srcOf(o); if(!outLive(o,t)) return 0; const fs=outRate(o); const dly = (srcOn()&&k===0)? K.srcDelay : K.fpgaDelay/(128*fs);
  const n=Math.floor((t-dly)*fs); const c=D.in[k]; return Math.pow(10,c.dbfs/20)*Math.sin(2*Math.PI*c.f*n/fs); }
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`${dual()?'dual 1×4':'1×8'}${srcOn()?' + SRC':''} · IN1 ${lockedAt(0,1)?'LOCK':'NO LOCK'} · IN2 ${lockedAt(1,1)?'LOCK':'NO LOCK'}`);
const DIPN=['DUAL','SRC','EQ1','EQ2'];
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t;
    tr('PSU1 VOF-10-5 → VCC_5V; REG1 LM1117-3.3 → VCC_3V3; REG3 LM1117-ADJ (R2 221R / R3 47R5) → net “VCC_1V2” = 1.52 V for the Cyclone core; REG2 MAX660 → VCC_5VN (−5 V) for the EL5263s');
    tr('U10 AT90CAN128 (X2 8 MHz) starts; Q1 releases N_CONFIG; U8 EP1C3 loads from U7 M25P40 (DCLK/CONF_DATA/ASDI/NCS); CONF_DONE goes high ('+inf+' timing)');
    tr('U10 reads SW1 (pins 44–47 via R72–R75), resets the CS8416s (CS8416_RESET1/2) and programs them over CS8416_CLK/IN/OUT'); } }); },
  dip(i){ act(`Rear DIP ${i+1} (${DIPN[i]}) → ${D.dip[i]?'OFF':'ON'}`, tr=>{ D.dip[i]^=1; tr(`SW1-${8-i} → R${72+i} → U10 pin ${44+i} (the MCU reads it; firmware not archived)`);
    if (i===0) tr(dual()? 'DUAL: U8 OUT1/OUT2 (A1–A4) carry INPUT A, OUT3/OUT4 (B1–B4) carry INPUT B · DA_1X4 LED (U10 pin 18)' : '1×8: all four FPGA outputs OUT1–OUT4 carry INPUT A → eight AES outputs · DA_1X8 LED (pin 19)');
    if (i===1) tr(srcOn()? `SRC: U8 routes INPUT A through U9 AD1895 (SDATA_I/SCLK_I/LRCLK_I → SDATA/SCLK/LRCLK, BYPASS released); outputs run at ${K.srcOut/1000} kHz from X1 24.576 MHz VCXO (${inf}) · SRC_LED` : 'SRC bypassed: outputs follow the input rate');
    if (i>=2){ const k=i-2; tr(`EQ${k+1}: the CS8416 (U${5+k}) is switched to its IN${k+1}_EQ input — the EL5263 (U${1+k}) high-frequency boost path — instead of the flat IN${k+1} path (${inf}: selection over SPI) · EQ${k+1} LED (pin ${k?9:5})`); }
    [0,1].forEach(k=>D.in[k].at=SIM.t); }); },
  plug(k){ act(`${D.in[k].on?'Unplug':'Plug in'} INPUT ${'AB'[k]}`, tr=>{ D.in[k].on=!D.in[k].on; D.in[k].at=SIM.t;
    tr(D.in[k].on? `AES${9+k}_IN → H103 → H5 → T${9+k} PE-65612 → AES${9+k} (I${1+k} jumper: ${D.ver==='75'?'75R R'+(35+k):'110R R'+(25+k)}) → U${1+k} EL5263 → IN${k+1} / IN${k+1}_EQ → U${5+k} CS8416` : `U${5+k} loses lock → LOCK${k+1} off, NOLOCK${k+1} on`); }); },
  ver(v){ act(`Rear version → POD12A/${v}`, tr=>{ D.ver=v; tr(v==='75'? 'SA-POD12A-TB-75: ten 75 Ω BNCs (31-5329-72RFX); jumpers I1/I2, O1–O8 on the 75R side (R35/R36, R37–R44)' : 'SA-POD12A-TB-110: ten Phoenix MCV1.5/3; jumpers on the 110R side (R25/R26, R27–R34)'); tr('The main board is the same for both versions'); [0,1].forEach(k=>D.in[k].at=SIM.t); }); },
  set(k,key,v,l){ act(l, tr=>{ D.in[k][key]=v; D.in[k].at=SIM.t; tr(key==='cable'?`${rxV(k).toFixed(3)} V p-p at the receiver; with EQ${k+1} ${eqOn(k)?'on':'off'} the CS8416 sees ${effV(k).toFixed(3)} V p-p (${inf})`:'Source changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels ---------------- */
function frontSVG(t){ const L=leds(t);
  let over=`<g class="pwr" style="cursor:pointer"><title>Power rocker</title><rect x="130" y="57" width="100" height="150" rx="9" fill="#0a0b0c" stroke="#30333a" stroke-width="3"/><rect x="144" y="${D.power?68:122}" width="72" height="62" rx="7" fill="#1d2023" stroke="#3a3d40" stroke-width="2"/></g>`
    + led(299,218,L.pwr,'#9be35a') + led(552,218,L.x8,'#ffd23a') + led(612,218,L.x4,'#ffd23a') + led(787,218,L.src,'#ffd23a') + led(847,218,L.eq1,'#ffd23a') + led(907,218,L.eq2,'#ffd23a')
    + led(1082,218,L.lock1,'var(--led-g)') + led(1142,218,L.nolock1,'#ff4a3a') + led(1362,218,L.lock2,'var(--led-g)') + led(1422,218,L.nolock2,'#ff4a3a');
  return panelSVG(PREFIX,'front',{over},'POD12A front panel (real silkscreen)'); }
function rearSVG(){ const v75=D.ver==='75';
  const conn=(x,y,pl,cls,title)=> v75? bnc(x,y,pl,cls,title,52) : phx(x,y,pl,cls,title);
  let over = conn(263,52,D.in[0].on,'inA','INPUT A — click to plug/unplug') + conn(263,180,D.in[1].on,'inB','INPUT B — click to plug/unplug');
  [[420,52],[420,180],[576,52],[576,180],[732,52],[732,180],[888,52],[888,180]].forEach(([x,y],i)=>over+=conn(x,y,false,'','OUTPUT '+(i+1)+' ('+OUTN[i]+')'));
  over += phx(1010,128,false,'','BALANCED IOS (+ − G)') + dip(1128,158,D.dip.map(Boolean),'dp',DIPN) + iec(1362,32,1606,248);
  return panelSVG(PREFIX,'rear',{over},'POD12A rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); root.querySelectorAll('.inA').forEach(g=>g.onclick=()=>A.plug(0)); root.querySelectorAll('.inB').forEach(g=>g.onclick=()=>A.plug(1)); root.querySelectorAll('.dp').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i)); }
function controlsHTML(){ return `<div class="small" style="display:grid;grid-template-columns:auto repeat(3,auto);gap:4px 10px;align-items:center;margin-top:8px">
  ${[0,1].map(k=>`<b>INPUT ${'AB'[k]} source</b><label>fs <select id="fs${k}">${[22050,32000,44100,48000,96000,192000,220000].map(f=>`<option value="${f}" ${f===D.in[k].fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label><label>cable <input id="cb${k}" type="number" step="50" value="${D.in[k].cable}" style="width:64px"> m</label><label>tone ${D.in[k].f} Hz, ${D.in[k].dbfs} dBFS</label>`).join('')}
  <b>Rear version</b><label><select id="vr"><option value="75" ${D.ver==='75'?'selected':''}>POD12A/75 (BNC)</option><option value="110" ${D.ver==='110'?'selected':''}>POD12A/110 (Phoenix)</option></select></label></div>
  <div class="small muted">Click the rear inputs to plug or unplug them, and the DIP levers (DUAL, SRC, EQ1, EQ2) to flip them. Keys 1–4 flip the DIP switches.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); [0,1].forEach(k=>{ if(!g('#fs'+k)) return; g('#fs'+k).onchange=e=>A.set(k,'fs',+e.target.value,`INPUT ${'AB'[k]} rate → ${e.target.value/1000} kHz`); g('#cb'+k).onchange=e=>A.set(k,'cable',Math.max(0,+e.target.value),`INPUT ${'AB'[k]} cable → ${e.target.value} m`); });
  if(g('#vr')) g('#vr').onchange=e=>A.ver(e.target.value); }
bindKeys('__pod12aActive', ()=>({'1':()=>A.dip(0),'2':()=>A.dip(1),'3':()=>A.dip(2),'4':()=>A.dip(3)}));
/* ---------------- timeline ---------------- */
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn');
  const L=[];
  [0,1].forEach(k=>{ L.push({label:`INPUT ${'AB'[k]} frames (${D.in[k].fs/1000}k)`, h:22, draw(c,X,t0,t1,y,h){ if(!D.in[k].on){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('unplugged',X(t0)+6,y+15); return; } SIM.pulses(c,X,t0,t1,y,h,1/D.in[k].fs,0,0.2/D.in[k].fs,b,'frames'); }});
    L.push(boolLane(`LOCK${k+1} / NOLOCK${k+1}`, t=>D.power&&lockedAt(k,t), '#3fbf5f')); });
  [0,4].forEach(o=>{ L.push({label:`FPGA OUT${o/2+1} → ${OUTN[o]}/${OUTN[o+1]} (${outRate(o)/1000}k)`, h:22, draw(c,X,t0,t1,y,h){ const fs=outRate(o); if(!D.power){return;} SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.2/fs,a,'frames'); if(!outLive(o,(t0+t1)/2)){ c.fillStyle=SIM.css('--bad'); c.font='11px sans-serif'; c.fillText('no source locked',X(t0)+6,y+15);} }}); });
  L.push(waveLane('INPUT A samples', t=>D.in[0].on?sample(0,t):0, -0.01, null, b, 34));
  L.push(waveLane(`${OUTN[0]} samples${srcOn()?' (after AD1895)':''}`, t=>outSample(0,t), -0.01, null, a, 34));
  L.push(waveLane(`${OUTN[4]} samples (${dual()?'INPUT B':'INPUT A'})`, t=>outSample(4,t), -0.01, null, a, 34));
  L.push(boolLane('SRC LED (yellow)', t=>leds(t).src, '#ffd23a'));
  return L; }
/* ---------------- views ---------------- */
function routeTable(t){ return `<table class="kv"><tr><th>Output</th><th>FPGA pin / driver</th><th>Carries</th><th>Rate</th></tr>${OUTN.map((n,o)=>{ const f=Math.floor(o/2); const pins=[['U8-75','U3 DI4/DI3'],['U8-74','U3 DI1/DI2'],['U8-69','U4 DI4/DI3'],['U8-68','U4 DI1/DI2']][f];
  return `<tr><td class="mono">${o+1} · ${n}</td><td class="mono small">OUT${f+1} ${pins[0]} → ${pins[1]} → T${o+1}</td><td>${outLive(o,t)?'INPUT '+'AB'[srcOf(o)]+(srcOn()&&srcOf(o)===0?' via SRC':''):'<span style="color:var(--bad)">nothing (input not locked)</span>'}</td><td class="mono">${outRate(o)/1000} kHz</td></tr>`; }).join('')}</table>`; }
function viewSim(m){ window.__pod12aActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead',`<div id="fp"></div>`)}${card('Rear panel — click inputs and DIP levers',`<div id="rp"></div>${controlsHTML()}`)}</div>
    <div>${card('What the circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('Routing now',`<div id="rt"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable. 200 µs shows single frames; with SRC on, compare input and output frame rates.',`<canvas id="tl"></canvas>`)}
    <div class="grid2">${card('Scope: INPUT A and output A1 at the playhead (one AES3 frame each)',`<canvas id="s1"></canvas><canvas id="s2"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Flip a DIP switch (DUAL, SRC, EQ1, EQ2) or plug an input.'); m.querySelector('#rt').innerHTML=routeTable(t);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:220});
    const fi=D.in[0].fs, ni=Math.floor(t*fi), si=sample(0,t), fo=outRate(0), no=Math.floor(t*fo), so=outSample(0,t);
    drawAesScope(m.querySelector('#s1'), aesSubframe(si,ni%192===0?'Z':'X',ni%192,fi), aesSubframe(si,'Y',ni%192,fi), fi, rxV(0)/(D.ver==='75'?1:4), 'INPUT A ·');
    drawAesScope(m.querySelector('#s2'), aesSubframe(so,no%192===0?'Z':'X',no%192,fo), aesSubframe(so,'Y',no%192,fo), fo, outLive(0,t)?1:0.05, 'A1 out ·');
    m.querySelector('#bits').innerHTML=`Input amplitude at the receiver ${rxV(0).toFixed(3)} V p-p${eqOn(0)?` → ${effV(0).toFixed(3)} V after the EQ path`:''}. Output: ${D.ver==='75'?'1 V p-p into 75 Ω':'about 4 V p-p into 110 Ω'} from DS34LV87T + PE-65612 (${inf}). <span class="muted">Without SRC the FPGA passes the frames through bit-for-bit (${inf}); with SRC the samples are recomputed at ${K.srcOut/1000} kHz.</span>`; };
  bindControls(m); SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD12A', body:`<p>From the front panel and README: an <b>AES digital audio DA</b> that runs as one <b>1×8</b> or two <b>1×4</b> amplifiers, with SRC/EQ1/EQ2 tallies and LOCK/NO LOCK for each input. It comes as POD12A/75 (BNC) or POD12A/110 (Phoenix).</p><p class="muted">No POD12A manual is in the archive. This tutorial follows the panel legends, the rear DIP legend (DUAL · SRC · EQ1 · EQ2) and the netlist.</p>`, check:()=>true, auto:true},
  {title:'1 · Power and lock', body:`<p>Switch on. With INPUT A connected, LOCK under INPUT 1 turns green and the <b>1X8</b> tally lights.</p>`, check:()=>D.power&&lockedAt(0,1)&&!dual(), hint:'Rocker on; INPUT A plugged in; DIP 1 (DUAL) off.'},
  {title:'2 · One input to eight outputs', body:`<p>In 1×8 mode, all four FPGA outputs carry INPUT A. Each one drives two RS-422 line drivers, so A1–A4 and B1–B4 all carry the same signal. Check the routing table.</p>`, check:()=>!dual()&&OUTN.every((n,o)=>srcOf(o)===0), auto:false, hint:'DIP 1 off.'},
  {title:'3 · Dual 1×4', body:`<p>Flip <b>DIP 1 (DUAL)</b> on. The 1X4 tally lights. B1–B4 now carry INPUT B.</p>`, check:()=>dual()&&lockedAt(1,1), hint:'Click the first DIP lever; keep INPUT B plugged in.'},
  {title:'4 · Sample-rate conversion', body:`<p>INPUT A is at 48 kHz and INPUT B at 44.1 kHz. Set INPUT A to <b>44.1 kHz</b> and switch on <b>DIP 2 (SRC)</b>. The AD1895 converts INPUT A to ${K.srcOut/1000} kHz (${inf}), clocked from the 24.576 MHz VCXO. On the timeline, the A outputs now run at a different frame rate from the input.</p>`, check:()=>srcOn()&&D.in[0].fs===44100, hint:'INPUT A fs → 44.1 kHz; click the second DIP lever.'},
  {title:'5 · A long cable', body:`<p>Set INPUT A's cable to <b>700 m</b>. The signal at the receiver drops below threshold and NO LOCK lights. Switch on <b>DIP 3 (EQ1)</b>: the CS8416 then takes its input from the EL5263 equaliser path and locks again (${inf}).</p>`, check:()=>D.in[0].cable>=700&&eqOn(0)&&lockedAt(0,1), hint:'Cable 700, then the third DIP lever.'},
  {title:'6 · 110 Ω version', body:`<p>Switch the rear to <b>POD12A/110</b>. The main board is the same; the jumpers I1/I2 and O1–O8 select the 110R terminations and source resistors instead of 75R.</p>`, check:()=>D.ver==='110', hint:'Rear version menu.'},
  {title:'Done', body:`<p>See <b>Findings</b> for the firmware the archive doesn't have and the odd power-rail name.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod12aActive=true; tutorialView(m,{title:'Tutorial — using a POD12A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${routeTable(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod12aActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the device at the playhead',`<div id="dev"></div>`)}${card('As seen by the front panel',`<div id="fp"></div>`)}</div>${card('Zoom ladder — samples on output A1',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, fi=D.in[0].fs, fo=outRate(0);
    const rows=[['INPUT A frames',fi.toLocaleString(),SIM.fmtDur(1/fi),'U5 CS8416 recovers the clock (U5_MCLK → U8 pin 87)'],['Output A1 frames',fo.toLocaleString(),SIM.fmtDur(1/fo),srcOn()?'AD1895 output, clocked from the VCXO (X1 24.576 MHz, VCO_OUT → U8 pin 10)':'same frames as the input, re-driven'],
      ['Bit cells per output',(128*fo).toLocaleString(),SIM.fmtDur(1/(128*fo)),'DS34LV87T → PE-65612 → 75R/110R → connector'],['Output streams','4 × 2','','FPGA OUT1–OUT4, each into two driver sections'],
      ['VCXO steering','—','—','U8 UP/DN (pins 37/36) → D5/D6 → R55–R58, C52/C53 loop filter → X1 (inferred PLL)'],['SRC group delay','—',SIM.fmtDur(K.srcDelay),'AD1895 filter delay ('+inf+')'],['MCU clock','8,000,000',SIM.fmtDur(1/8e6),'U10 AT90CAN128, X2 8 MHz']];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>INPUT A</th><td class="mono">frame ${Math.floor(t*fi).toLocaleString()} · sample ${sample(0,t).toFixed(5)}</td></tr><tr><th>A1 out</th><td class="mono">frame ${Math.floor(t*fo).toLocaleString()} · sample ${outSample(0,t).toFixed(5)}</td></tr><tr><th>Mode</th><td class="mono">${dual()?'DUAL 1×4':'1×8'} · SRC ${srcOn()?'on':'off'} · EQ1 ${eqOn(0)?'on':'off'} · EQ2 ${eqOn(1)?'on':'off'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    drawLadder(m.querySelector('#zl'),t,[['1 second',1],['10 ms',0.01],['1 tone cycle',1/D.in[0].f],['8 frames',8/fo],['1 frame',1/fo]],tt=>outSample(0,tt),-0.01,'full scale'); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:20,y:20,w:180,h:100,t:'INPUT A / B',s:['BNC or Phoenix (rear board)','T9/T10 PE-65612','I1/I2: 75R or 110R'],d:'AES9_IN/AES10_IN → H103 → H5 → transformers T9/T10 → AES9/AES10 nets. Jumpers I1/I2 pick the termination: R25/R26 110R or R35/R36 75R.'},
  eq:{x:20,y:160,w:180,h:90,t:'U1/U2 EL5263 + D1–D4',s:['flat → IN1 / IN2','boosted → IN1_EQ / IN2_EQ'],d:'Video op-amps on ±5 V (MAX660 makes −5 V). Each gives two outputs to the CS8416: a flat one (R12/R22 75R) and an equalised one (R13/R23). The 1N4148 pairs clamp the input.'},
  rx:{x:250,y:20,w:180,h:90,t:'U5/U6 CS8416',s:['RXP inputs: IN, IN_EQ','I²S + MCLK → FPGA'],d:'Receivers. U5_MCLK/SCLK/LRCLK/SDATA → U8 pins 87/77/76/86; U6 → 98/92/91/97. GPO0–2 also go to the FPGA. Programmed by U10 over CS8416_CLK/IN/OUT.'},
  fpga:{x:250,y:150,w:180,h:110,t:'U8 Cyclone EP1C3T100',s:['routing 1×8 / dual 1×4','OUT1–OUT4 → drivers','VCXO phase detector UP/DN','config: U7 M25P40'],d:'Routes inputs to the four output streams and steers the 24.576 MHz VCXO. Bus to the MCU on FPGA1–FPGA6 (U10 pins 12–17). Test points TP1–TP5 on header H2.'},
  src:{x:480,y:150,w:170,h:80,t:'U9 AD1895 SRC',s:['in: SDATA_I/SCLK_I/LRCLK_I','out: SDATA/SCLK/LRCLK','BYPASS, U9_RESET'],d:'Asynchronous sample-rate converter in an FPGA loop. MCLKOUT from U8 pin 54.'},
  drv:{x:480,y:20,w:170,h:90,t:'U3/U4 DS34LV87T',s:['8 differential drivers','O1–O8: 75R or 110R','T1–T8 PE-65612'],d:'Each FPGA OUTn drives two driver sections. AESnN_SEL goes through jumper On to R27–R34 (110R) or R37–R44 (75R) before the transformer.'},
  mcu:{x:250,y:300,w:180,h:90,t:'U10 AT90CAN128',s:['SW1 DIP: pins 44–47','LEDs: pins 2,5,6,9,10,18,19,25,26','ALTERA_RESET pin 35'],d:'Reads the DIP switches, lights the tallies, resets and programs the receivers and resets the FPGA. JTAG2 is its debug header. CAN-capable part, but no CAN connector.'},
  out:{x:480,y:270,w:170,h:70,t:'Outputs 1–8',s:['A1–A4 / B1–B4'],d:'Rear board SA-POD12A-TB-75 (10 BNC) or TB-110 (10 Phoenix).'},
  pwr:{x:20,y:300,w:180,h:90,t:'Power',s:['VOF-10-5 → VCC_5V','LM1117 3.3 V and ADJ (1.52 V)','MAX660 → VCC_5VN'],d:'PSU2 VAF1005 is a DNI “Special Build” alternative.'},
};
const WIRES=[['in','eq',''],['eq','rx','IN / IN_EQ'],['rx','fpga','I²S'],['fpga','src','I²S'],['src','fpga',''],['fpga','drv','OUT1–4'],['drv','out','×8'],['mcu','rx','SPI'],['mcu','fpga','FPGA1–6'],['pwr','mcu','']];
function viewBlock(m){ window.__pod12aActive=false; blockView(m,BLOCKS,WIRES,'fpga',[680,410],card('In one sentence',`<p>Two AES inputs are equalised and received, an FPGA fans one or both of them out to four streams (optionally through a sample-rate converter), and eight transformer-coupled line drivers send them out.</p>`)); }
const SHEETS=[
  {name:'1 · Inputs and receivers', note:'Every net and pin here is copied from POD12-iss2-net.ipc (IPC-D-356A, 15/12/2013). Component values come from the master BOM.', svg:()=>
    chip(150,60,110,'T9 PE-65612',[['3','AES9 (I1-2)'],['2','AES9_N (H5-2)']],[['1','C26 → AES9_P']],'input A')
    +chip(430,190,140,'U1 EL5263',[['3 (+)','AES9 / D1-D2'],['2','R5/R6 750R'],['8/4','VCC_5V / 5VN']],[['1','R12 → IN1'],['7','R13 → IN1_EQ']],'')
    +chip(610,40,110,'U5 CS8416',[['4','IN1 (C36)'],['3','IN1_EQ (C37)'],['16/15/17','CS8416_CLK/IN/OUT'],['9 / 14','RESET1 / SEL1']],[['24','MCLK→U8-87'],['27','SCLK→U8-77'],['28','LRCK→U8-76'],['26','SDATA→U8-86'],['20–18','GPO→U8-88..90']],'')
    +txt(60,360,'Termination jumper I1: pin 1 → R25 110R, pin 3 → R35 75R, pin 2 → AES9.',11.5)+txt(60,380,'Input B is identical: T10, U2, U6, R26/R36, I2, nets AES10, IN2, IN2_EQ, U6_*.',11.5)},
  {name:'2 · FPGA, SRC and outputs', note:'Nets from the IPC netlist. The DS34LV87T section assignment (DI1–DI4 to pins 1/7/9/15) follows the part datasheet.', svg:()=>
    chip(230,40,150,'U8 EP1C3T100',[['75 / 74','OUT1 / OUT2'],['69 / 68','OUT3 / OUT4'],['50 / 49','BYPASS / U9_RESET'],['51–53','LRCLK_I SCLK_I SDATA_I'],['56/57/55','LRCLK SCLK SDATA'],['54','MCLKOUT'],['10','VCO_OUT ← X1'],['37 / 36','UP / DN']],[],'')
    +chip(230,290,150,'U9 AD1895',[['6/5/4','LRCLK_I/SCLK_I/SDATA_I'],['2','MCLKOUT'],['9 / 13','BYPASS / U9_RESET']],[['24/25/23','LRCLK/SCLK/SDATA']],'SRC')
    +chip(560,60,120,'U3 DS34LV87T',[['15 / 9','OUT1'],['1 / 7','OUT2']],[['10/11','AES1P/N_SEL'],['14/13','AES2P/N_SEL'],['2/3','AES3P/N_SEL'],['6/5','AES4P/N_SEL']],'')
    +txt(470,260,'AESnN_SEL → jumper On → R27–R34 110R',11.5)+txt(470,278,'or R37–R44 75R → Cn → Tn → connector',11.5)+txt(470,300,'U4 does the same for OUT3/OUT4 → B1–B4.',11.5)},
  {name:'3 · MCU, LEDs and power', note:'From the IPC netlist and the BOM. LED colours: LED1/2/4 green (551-0205), LED3/5–8 yellow (551-0305), LED9/10 red (551-0405).', svg:()=>
    chip(200,40,150,'U10 AT90CAN128',[['44–47','SW1 via R72–R75'],['37/38/36','CS8416_CLK/IN/OUT'],['42/40','RESET1/RESET2'],['41/39','SEL1/SEL2'],['12–17','FPGA6…FPGA1'],['35','ALTERA_RESET → Q1'],['23/24','X2 8 MHz']],[['2','LOCK1 → LED2'],['26','NOLOCK1 → LED9'],['6','LOCK2 → LED4'],['25','NOLOCK2 → LED10'],['5','EQ1 → LED3'],['9','EQ2 → LED5'],['10','SRC → LED6'],['19','DA_1X8 → LED7'],['18','DA_1X4 → LED8']],'')
    +chip(690,60,130,'Power',[['PSU1 VOF-10-5','VCC_5V'],['REG1 LM1117-3.3','VCC_3V3'],['REG3 LM1117-ADJ','VCC_1V2'],['REG2 MAX660','VCC_5VN']],[],'')
    +txt(540,260,'REG3: R2 221R (out→adj), R3 47R5 (adj→gnd)',11.5)+txt(540,280,'Vout = 1.25 × (1 + 47.5/221) = 1.52 V',11.5,'var(--warn)')+txt(540,300,'= Cyclone (EP1C) core 1.5 V; the net name says 1V2',11.5,'var(--warn)')},
];
function viewSchem(m){ window.__pod12aActive=false; schemView(m,SHEETS,'POD12A','No schematic file is archived for POD12A. These sheets come from the IPC-D-356A netlist inside the ISS2 Gerber zip, so every pin-to-net connection shown is real.'); }
function viewSoft(m){ window.__pod12aActive=true; let hot=2;
  m.innerHTML=`${card('Signal path, stage by stage (the MCU and FPGA programs are not archived)',`<div id="f"></div><div id="det" class="card"></div>`)}<div class="grid2">${card('DIP → MCU → LEDs and routing (live)',`<div id="dp"></div>`)}${card('Output routing (live)',`<div id="rt"></div>`)}</div>`;
  const draw=()=>{ const st=[{t:'INPUT A',s:[D.ver+' Ω',rxV(0).toFixed(3)+' V p-p']},{t:'EL5263 EQ',s:[eqOn(0)?'EQ path':'flat path',effV(0).toFixed(3)+' V']},{t:'CS8416',s:[lockedAt(0,1)?'LOCK':'NO LOCK',D.in[0].fs/1000+' kHz'],bad:!lockedAt(0,1)},{t:'FPGA routing',s:[dual()?'dual 1×4':'1×8']},{t:'AD1895',s:[srcOn()?'→ '+K.srcOut/1000+' kHz':'bypassed']},{t:'8 drivers',s:['DS34LV87T','PE-65612']}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=['Rear connector → H103 → H5 → T9 transformer → termination selected by jumper I1.',`EL5263 makes a flat copy and a boosted copy. The boost (${K.eqGain} dB at the AES fundamental, ${inf}) makes up for cable loss.`,`CS8416 locks from about ${K.lockLo/1000} to ${K.lockHi/1000} kHz (${inf}; the part is rated 32–192 kHz). The MCU reads lock and drives LOCK/NOLOCK.`,'In 1×8, OUT1–OUT4 = input A. In dual mode, OUT1/OUT2 = A and OUT3/OUT4 = B.','AD1895 in an FPGA loop: input I²S in, output I²S at the VCXO-derived rate. BYPASS is driven by the FPGA.','DS34LV87T sections → AESnN_SEL → On jumper → 75R/110R → PE-65612 → connector.'][hot];
    m.querySelector('#dp').innerHTML=`<table class="kv"><tr><th>DIP</th><th>State</th><th>MCU pin</th><th>Effect</th><th>Tally</th></tr>${DIPN.map((n,i)=>`<tr class="${D.dip[i]?'hl':''}"><td>${i+1} ${n}</td><td class="mono">${D.dip[i]?'ON':'OFF'}</td><td class="mono">${44+i}</td><td class="small">${['1×8 ↔ dual 1×4','SRC in/out','EQ path input A','EQ path input B'][i]}</td><td class="small">${['DA_1X8 / DA_1X4','SRC_LED','EQ1','EQ2'][i]}</td></tr>`).join('')}</table>`;
    m.querySelector('#rt').innerHTML=routeTable(SIM.t); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod12aActive=false;
  m.innerHTML=card('What the POD12A archive shows — findings',`<ol>
   <li><b>It is not firmware-free.</b> The README says “Hardware only. There is no firmware”. The BOM and netlist show an <b>AT90CAN128</b> MCU (U10, JTAG2 header) and an <b>Altera Cyclone EP1C3</b> (U8) configured from an M25P40 (U7, header H1). Both need programs, and neither is in the folder. The FPGA probably shares code with the POD14A platform (same EP1C3T100, CS8416, PE-65612, DS34LV87T) (${inf}).</li>
   <li><b>The “1V2” rail is 1.52 V.</b> REG3 LM1117-ADJ with R2 221R and R3 47R5 gives 1.25 × (1 + 47.5/221) = 1.52 V. That is correct for a Cyclone I core (1.5 V). Only the net name “VCC_1V2” is wrong — perhaps carried over from a Cyclone II/III design.</li>
   <li><b>One FPGA pin feeds two outputs.</b> The FPGA has only OUT1–OUT4. Each drives two DS34LV87T sections (e.g. OUT1 → U3 pins 15 and 9 → AES2 and AES1). So in 1×8 mode A1/A2 always carry the same stream, and in dual mode the A/B split falls on an OUT-pair boundary.</li>
   <li><b>The equaliser is a second receiver input, not a filter in line.</b> Each EL5263 feeds the CS8416 two ways: <span class="mono">IN1</span> through R12 75R and <span class="mono">IN1_EQ</span> through R13. EQ1/EQ2 then picks the receiver input (${inf}, consistent with the nets).</li>
   <li><b>One main board for both versions.</b> 75/110 Ω is chosen by the rear board (TB-75 BNCs or TB-110 Phoenix) and by ten 3-pin jumpers (I1, I2, O1–O8) that pick 75R or 110R parts. The main board is identical.</li>
   <li><b>The SRC runs against a steerable VCXO.</b> X1 is a 24.576 MHz VCXO (CSX-750V) whose control voltage comes from FPGA pins UP/DN through diodes D5/D6 and an R/C loop filter (R55–R58, C52/C53). So the FPGA contains a phase detector, as POD33 does with its PLL1705.</li>
   <li><b>Leftovers.</b> <span class="mono">POD12A - #PNP #2016/dsfsd.prg</span> is a stray pick-and-place file. The BOMs exist in two copies each (“(1)”). The Gerber zip names the board “POD12” (POD12-iss2), without the A.</li>
   <li><b>The panel art only exists as CorelDRAW.</b> There is no SILK PDF, so the panels here come from the .cdr through Inkscape. In that conversion the cut-out outlines are black like the ink.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Lock range, cable loss (2.5 / 4 dB per 100 m), EQ boost (14 dB), lock time 20 ms, SRC output 48 kHz and SRC on input A only, FPGA latency 3 bit cells: all ${inf}.</li><li>DIP order follows the rear legend “DUAL · SRC · EQ1 · EQ2” for switches 1–4.</li><li>An output whose source is not locked is shown as silent (${inf}; the real firmware may mute, pass or fall back).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD12A - #ISS2 #GERBER.zip → POD12-iss2-net.ipc, POD12-Drill-Report.txt</li><li>POD12A - BOM/POD12A - MASTER BOM.xlsx</li><li>POD12A - #ARTWORK #DA #2016/POD12A-FRONT&amp;REAR-SILK (CURVE).cdr · Pics/</li></ul>`); }
SIM.register({
  id:'pod12a', name:'POD12A · AES digital audio DA, 1×8 or dual 1×4 (2013|46)', duration:1, product:'POD12A', year:2013, family:'POD series', folder:'#POD #SERIES/POD12A - #Master',
  summary:'Half-rack AES/EBU distribution amplifier: one input to eight outputs or two inputs to four each, with optional sample-rate conversion (AD1895) and cable equalisation (EL5263), in 75 Ω BNC or 110 Ω Phoenix versions. CS8416 receivers, an EP1C3 FPGA and an AT90CAN128 MCU.',
  highlights:['Real silkscreen panels with working DIP switches and pluggable inputs','Routing from the IPC netlist: FPGA OUT1–4 to eight drivers','AES3 frames in and out, with SRC changing the output rate','Cable length vs lock, with and without the EQ path','Firmware the archive is missing; the 1.52 V “1V2” rail'],
  depth:'Hardware model',
  stepUnits:[{label:'1 input frame',period:()=>1/D.in[0].fs},{label:'1 output frame',period:()=>1/outRate(0)},{label:'1 AES block',period:()=>192/D.in[0].fs},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[0.0002,'200 µs (frames)']], defaultZoom:4,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: using a POD12A',render:viewTutorial},{id:'second',label:'One second, frame by frame',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
