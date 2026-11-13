/* =====================================================================
   POD15A — Analog video distribution amplifier with cable equaliser and clamp (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no electronics files are archived.

   Sources used:
   - #POD #SERIES/POD  - #Engineering/pod15.pdf          (POD15 manual: 1×6 + front split, Hi-Z loop, specs)
   - #POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).pdf (panels, Jun 24 2014)
   - .../Pics/POD15A Front .jpg, POD15A Rear.jpg        (LED colours, connector positions)
   - .../POD15A - #Mechanical #DA #2016/POD15A-FRONT ISS 1 (PANEL).pdf, POD15A-REAR ISS 2 (PANEL) .pdf
   - Video timing: SMPTE 170M (NTSC) and ITU-R BT.470 (PAL) standard values (not archive files; general knowledge)
   Everything about the circuit is inferred from the panel legends and the POD15 specs, and is marked so on screen.
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

const PREFIX='pod15a';
const STD = {
  NTSC:{ name:'NTSC 525/59.94', line:1/15734.264, field:1001/60000, lines:525, fsc:3579545.45, sync:-0.286, white:0.714, burst:0.143, hs:4.7e-6, bp:4.7e-6, act0:10.9e-6 },
  PAL: { name:'PAL 625/50',     line:64e-6,        field:1/50,       lines:625, fsc:4433618.75, sync:-0.300, white:0.700, burst:0.150, hs:4.7e-6, bp:5.7e-6, act0:12.0e-6 },
};
const D = { power:true, powerAt:-1, std:'NTSC', pattern:'bars', cable:150, term:'75', eqTrim:0.2, eq300:false, clamp:true, level:0.5, outTerm:[1,1,1,1,1,1,1], log:[], patAt:-1 };
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
/* ---------------- the circuit (inferred) ---------------- */
// RG-59-class coax loss: about 3.1 dB per 100 m at 5 MHz, scaling with √f (inferred)
const lossDb = (f,len)=> 3.1*Math.sqrt(Math.max(f,1)/5e6)*len/100;
function eqLen(){ return D.eqTrim*300 + (D.eq300?300:0); }
function termGain(){ return D.term==='open'?2 : D.term==='75'?1 : 2/3; }   // back-terminated source into Hi-Z loop: open = 2×, 75 Ω = 1×, double-terminated = 0.67×
function residualDb(f){ return lossDb(f,D.cable) - lossDb(f,eqLen()); }   // + = under-equalised, − = over-equalised (peaking)
function levelGain(){ return Math.pow(10,((D.level-0.5)*2*3)/20); }        // LEVEL trim ±3 dB (inferred)
function syncAmp(){ return Math.abs(S().sync)*termGain()*Math.pow(10,-lossDb(0.5e6,D.cable)/20); }
function synchOK(){ return D.power && D.cable<=900 && syncAmp()>0.1 && D.term!=='none'; }
function errorOn(){ const rd=residualDb(S().fsc); return D.power && (!synchOK() || Math.abs(rd)>3 || Math.abs(20*Math.log10(termGain()*levelGain()))>3); } // inferred criteria
// stage waveforms at absolute time t (volts at 75 Ω-terminated point)
function stage(which, t){
  const s=S(); const tl=((t%s.line)+s.line)%s.line, p=patternAt(tl,t);
  const fl = Math.floor(t/s.line)%2 ? 1 : -1;                            // subcarrier phase flips per line pair-ish (visual only)
  const sc = Math.sin(2*Math.PI*s.fsc*t + p.ph*fl);
  let y=p.y*s.white, c=p.c*s.white;
  if (which==='src') return y + c*sc;
  const g=termGain(); y*=g; c*=g;
  const lc = Math.pow(10,-lossDb(s.fsc,D.cable)/20), ly=Math.pow(10,-lossDb(0.5e6,D.cable)/20);
  if (which==='in'){ return y*ly + c*lc*sc; }
  const rc = Math.pow(10,-residualDb(s.fsc)/20), ry=Math.pow(10,-residualDb(0.5e6)/20);
  let v = y*ry + c*rc*sc;
  if (which==='eq') return v;
  // clamp OUT: AC coupling → back porch moves with average picture level (bounce), recovering with τ ≈ 60 ms (inferred)
  if (!D.clamp){ const a=apl()*s.white*0.6*g; const since = D.pattern==='bounce' ? (t%0.5) : 1; v += -(a - 0.25*g)*Math.exp(-since/0.06) - (a-0.25*g)*0.15; }
  if (which==='clamp') return v;
  v *= levelGain(); return D.power? clamp(v,-0.9,1.6) : 0;   // output stage swing limit (inferred)
}
function stageStats(){
  const s=S(), g=termGain();
  return [
    {name:'Source (house black/bars, 75 Ω)', lvl:20*Math.log10(1), gain:null, clip:null, unit:'dB re 1 V p-p', note:'1 V p-p into 75 Ω'},
    {name:`Cable ${D.cable} m + loop ${D.term==='75'?'terminated':D.term==='open'?'UNTERMINATED':'DOUBLE-terminated'}`, lvl:20*Math.log10(g)-lossDb(0.5e6,D.cable), gain:20*Math.log10(g)-lossDb(0.5e6,D.cable), clip:null, unit:'dB', note:`chroma at ${(s.fsc/1e6).toFixed(2)} MHz: ${fdb(-lossDb(s.fsc,D.cable))} dB (${inf})`},
    {name:`EQUALIZER ${Math.round(eqLen())} m (trim ${Math.round(D.eqTrim*300)} m${D.eq300?' + 300 m switch':''})`, lvl:20*Math.log10(g)-residualDb(s.fsc), gain:lossDb(s.fsc,eqLen()), clip:null, unit:'dB', note:`residual at ${(s.fsc/1e6).toFixed(2)} MHz ${fdb(-residualDb(s.fsc))} dB ${residualDb(s.fsc)<-0.5?'(over-equalised: peaking)':residualDb(s.fsc)>0.5?'(under-equalised: soft, low chroma)':'(flat)'}`},
    {name:`CLAMP ${D.clamp?'IN (back-porch DC restore)':'OUT (AC coupled)'}`, lvl:20*Math.log10(g)-residualDb(s.fsc), gain:0, clip:null, unit:'dB', note: D.clamp?'blanking held at 0 V every line':'blanking level moves with picture content (APL bounce)'},
    {name:'LEVEL trim → 7 back-terminated outputs', lvl:20*Math.log10(g*levelGain())-residualDb(s.fsc), gain:20*Math.log10(levelGain()), clip:4, unit:'dB', note:'manual: 1 V p-p terminated on all 6+1 outputs'},
  ];
}
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`SYNCH ${synchOK()?'on':'off'} · ERROR ${errorOn()?'on':'off'} · residual ${fdb(-residualDb(S().fsc))} dB`);
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power) D.powerAt=SIM.t; tr(D.power?'Supply up; SYNCH lights once sync is found on the input (≈ a few fields, '+inf+')':'All seven outputs go to 0 V (black, no sync): downstream monitors lose lock'); }); },
  eqTrim(dir){ act(`Turn EQUALIZER 0–300m ${dir>0?'CW':'CCW'}`, tr=>{ D.eqTrim=clamp(+(D.eqTrim+dir*0.04).toFixed(3),0,1); tr(`EQ now matches ${Math.round(eqLen())} m of cable; the cable is ${D.cable} m → residual ${fdb(-residualDb(S().fsc))} dB at the subcarrier (${inf})`); }); },
  eq300(){ act(`300m switch → ${D.eq300?'out':'in'}`, tr=>{ D.eq300=!D.eq300; tr(`Adds a fixed 300 m section (silk: “EQUALIZER (600m TOTAL)”) → EQ ${Math.round(eqLen())} m`); }); },
  clamp(){ act(`CLAMP → ${D.clamp?'OUT':'IN'}`, tr=>{ D.clamp=!D.clamp; tr(D.clamp?'Back-porch clamp: the blanking level is restored to 0 V on every line, so picture content cannot shift the DC':'Clamp out: the signal is AC-coupled; the blanking level moves with the average picture level (try the “bounce” pattern)'); }); },
  level(dir){ act(`Turn LEVEL ${dir>0?'CW':'CCW'}`, tr=>{ D.level=clamp(+(D.level+dir*0.04).toFixed(3),0,1); tr(`Output gain ${fdb(20*Math.log10(levelGain()),2)} dB (POD15 manual: “level trim”; range ±3 dB ${inf})`); }); },
  term(){ act('Loop-through termination → '+({'75':'open (unterminated)','open':'double (two 75 Ω)','double':'75 Ω'})[D.term], tr=>{ D.term=({'75':'open','open':'double','double':'75'})[D.term];
    tr(D.term==='75'?'Correct: the Hi-Z input bridges the line and the far loop BNC carries the 75 Ω terminator → 1 V p-p':D.term==='open'?'No terminator: the back-terminated source sees an open line → 2 V p-p, ringing on long cable':'Terminated twice (e.g. a terminator plus a 75 Ω monitor) → 0.67 V p-p'); }); },
  set(k,v,l){ act(l, tr=>{ D[k]=v; if(k==='pattern') D.patAt=SIM.t; tr(k==='cable'?`Cable loss ${fdb(-lossDb(S().fsc,v))} dB at the subcarrier, ${fdb(-lossDb(0.5e6,v))} dB at 0.5 MHz (${inf})`:'Source changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels (POD15A-FRONT&REAR-SILK (CURVE).pdf) ---------------- */
function frontSVG(){ const on=D.power;
  let over=rocker(on)+pled(on)+led(739,218,synchOK(),'var(--led-g)')+led(790,218,errorOn(),'#ff4a3a')
   + trim(939,220,D.eqTrim,'eqt','EQUALIZER 0–300m')
   + `<g class="eq3" style="cursor:pointer"><title>300m switch (${D.eq300?'IN':'OUT'}) — click</title><circle cx="1040" cy="217" r="28" fill="#0a0b0c" stroke="#3a3d40" stroke-width="3"/><circle cx="1040" cy="${D.eq300?224:212}" r="18" fill="${D.eq300?'#2a2d31':'#16181a'}"/></g>`
   + `<g class="clp" style="cursor:pointer"><title>CLAMP push switch (${D.clamp?'IN':'OUT'}) — click</title><circle cx="1239" cy="217" r="28" fill="#0a0b0c" stroke="#3a3d40" stroke-width="3"/><circle cx="1239" cy="${D.clamp?224:212}" r="18" fill="${D.clamp?'#2a2d31':'#16181a'}"/></g>`
   + trim(1390,220,D.level,'lvt','LEVEL') + bnc(1552,152,false,'','VIDEO MONITOR (7th output)',44);
  return panelSVG(PREFIX,'front',{over},'POD15A front panel (real silkscreen)'); }
function rearSVG(){
  let over=bnc(273,64,true,'','INPUT (looping, Hi-Z) — cable from the source',44)+bnc(273,200,D.term!=='open','tm',`INPUT loop: ${D.term==='75'?'75 Ω terminator':D.term==='open'?'nothing (unterminated!)':'two 75 Ω loads'} — click to change`,44)
   + [[482,70],[586,200],[693,70],[796,200],[902,70],[1007,200]].map(([x,y],i)=>bnc(x,y,false,'','OUT '+(i+1)+' (75 Ω, back-terminated)',42)).join('') + iec(1372,26,1600,250);
  return panelSVG(PREFIX,'rear',{over},'POD15A rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); bindTrim(root,'eqt',d=>A.eqTrim(d)); bindTrim(root,'lvt',d=>A.level(d));
  root.querySelectorAll('.eq3').forEach(g=>g.onclick=()=>A.eq300()); root.querySelectorAll('.clp').forEach(g=>g.onclick=()=>A.clamp()); root.querySelectorAll('.tm').forEach(g=>g.onclick=()=>A.term()); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Standard <select id="sd">${Object.keys(STD).map(k=>`<option ${k===D.std?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>Pattern <select id="pt">${[['bars','75 % colour bars'],['black','black burst'],['white','white field'],['bounce','bounce (black/white every 0.5 s)']].map(([v,l])=>`<option value="${v}" ${v===D.pattern?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Input cable <input id="cb" type="number" step="25" value="${D.cable}" style="width:64px"> m</label></div>
  <div class="small muted">Front: EQUALIZER trim and 300m switch, CLAMP switch, LEVEL trim (click a trim's left or right half, or use the wheel). Rear: click the lower INPUT BNC to change the loop termination. Keys: Q/W EQ, E 300m, C clamp, A/S level.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if(!g('#sd')) return; g('#sd').onchange=e=>A.set('std',e.target.value,'Standard → '+e.target.value); g('#pt').onchange=e=>A.set('pattern',e.target.value,'Test pattern → '+e.target.selectedOptions[0].text); g('#cb').onchange=e=>A.set('cable',Math.max(0,+e.target.value),'Input cable → '+e.target.value+' m'); }
bindKeys('__pod15aActive', ()=>({q:()=>A.eqTrim(-1),w:()=>A.eqTrim(1),e:()=>A.eq300(),c:()=>A.clamp(),a:()=>A.level(-1),s:()=>A.level(1)}));
/* ---------------- timeline ---------------- */
function vLane(label, which, color){ return { label, h:44, draw(c,X,t0,t1,y,h){ const span=t1-t0, s=S();
  if (span > 6*s.line){ // too long to draw: show the per-line envelope (sync tip … peak)
    c.fillStyle=color; c.globalAlpha=.3; const top=stage(which, Math.floor(t0/s.line)*s.line + s.act0+ (s.line-s.act0)*0.1)+0.2, bot=stage(which, Math.floor(t0/s.line)*s.line+1e-6);
    const Y=v=>y+h-6-(v+0.5)/2.2*(h-10); c.fillRect(X(t0),Y(Math.max(top,0.7)),X(t1)-X(t0),Y(bot)-Y(Math.max(top,0.7))); c.globalAlpha=1;
    c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(`${Math.round(span/s.line).toLocaleString()} lines — zoom to 64 µs to see one`, X(t0)+6, y+12); return; }
  const N=Math.min(3000, Math.max(400,(X(t1)-X(t0))*3)); c.strokeStyle=color; c.lineWidth=1; c.beginPath();
  const Y=v=>y+h-6-(v+0.5)/2.2*(h-10);
  c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),Y(0)); c.lineTo(X(t1),Y(0)); c.stroke(); c.strokeStyle=color; c.beginPath();
  for (let i=0;i<=N;i++){ const tt=t0+span*i/N, v=stage(which,tt); i?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); } c.stroke(); }}; }
function lanes(){ const s=S(), a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn');
  return [
    {label:`Fields (${(1/s.field).toFixed(2)} Hz)`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,s.field,0,3*s.line,b,'fields'); }},
    {label:'H sync (lines)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,s.line,0,s.hs,SIM.css('--ink2'),'H sync pulses'); }},
    {label:'Clamp pulses (back porch)', h:20, draw(c,X,t0,t1,y,h){ if(!D.clamp){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('CLAMP OUT — no clamp pulses', X(t0)+6, y+14); return; } SIM.pulses(c,X,t0,t1,y,h,s.line,s.hs+3.2e-6,1.2e-6,wn,'clamp pulses ('+'inferred'+')'); }},
    vLane('Source (75 Ω)', 'src', SIM.css('--ink2')), vLane(`INPUT after ${D.cable} m`, 'in', b), vLane('after EQUALIZER', 'eq', a), vLane(`after CLAMP ${D.clamp?'IN':'OUT'}`, 'clamp', a), vLane('OUT 1…6 + MONITOR', 'out', a),
    boolLane('SYNCH LED (green)', ()=>synchOK(), '#3fbf5f'), boolLane('ERROR LED (red)', ()=>errorOn(), '#e3453a'),
  ]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__pod15aActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel',`<div id="fp"></div>${controlsHTML()}`)}${card('Rear panel — click the loop BNC to change the termination',`<div id="rp"></div>`)}</div>
   <div>${card('What the circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('Signal now',`<div id="now"></div>`)}</div></div>
   ${card('Timeline — one second, zoomable. Choose “1 line” to see sync, burst and bars; “1 µs” shows single subcarrier cycles.',`<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Stage by stage',`<div id="lv"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Turn the EQUALIZER, push CLAMP or change the cable length.');
    const s=S(); m.querySelector('#now').innerHTML=`<table class="kv"><tr><th>Standard</th><td>${s.name}</td></tr><tr><th>Input amplitude</th><td class="mono">sync ${(syncAmp()*1000).toFixed(0)} mV (nominal ${Math.abs(s.sync)*1000} mV)</td></tr>
      <tr><th>Cable vs EQ</th><td class="mono">${D.cable} m vs ${Math.round(eqLen())} m → ${fdb(-residualDb(s.fsc))} dB at ${(s.fsc/1e6).toFixed(2)} MHz</td></tr><tr><th>Clamp</th><td>${D.clamp?'IN':'OUT'}</td></tr><tr><th>LEDs</th><td>SYNCH ${synchOK()?'●':'○'} · ERROR ${errorOn()?'<b style="color:var(--bad)">●</b>':'○'}</td></tr></table>`;
    m.querySelector('#lv').innerHTML=stageTable(stageStats(),'dB'); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:190}); };
  bindControls(m); SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD15A', body:`<p>The POD15 manual: “a one by six video distribution amplifier with level trim and a seventh output split on the front panel … The input is a high impedance looping input while the outputs are 75 ohm.” The POD15A front adds <b>SYNCH</b> and <b>ERROR</b> tallies, a cable <b>EQUALIZER</b> (0–300 m trim plus a 300 m switch, “600m TOTAL”), a <b>CLAMP</b> in/out switch, a <b>LEVEL</b> trim and a <b>VIDEO MONITOR</b> BNC.</p>`, check:()=>true, auto:true},
  {title:'1 · Terminate the loop', body:`<p>A looping input has two BNCs. The signal goes in on one, and the other must carry a <b>75 Ω terminator</b> (or feed on to the next device). Click the lower rear INPUT BNC to see what happens when it is left open (2 V p-p) or terminated twice. Leave it on 75 Ω.</p>`, check:()=>D.term==='75'&&D.log.some(e=>e.name.startsWith('Loop-through')), hint:'Click the lower INPUT BNC on the rear until it shows 75 Ω again.'},
  {title:'2 · Equalise the cable', body:`<p>The source is 150 m away. Long coax loses high frequencies, so colour (the subcarrier) is weaker than sync. Zoom the timeline to <b>1 line</b> and compare “INPUT after 150 m” with “after EQUALIZER”. Turn the <b>EQUALIZER</b> trim until the residual is within ±0.5 dB.</p>`, check:()=>Math.abs(residualDb(S().fsc))<0.5&&D.cable===150, hint:'Q/W keys; watch the “Cable vs EQ” row.'},
  {title:'3 · A really long run', body:`<p>Set the cable to <b>450 m</b>. The trim alone reaches 300 m, so push the <b>300m</b> switch in and trim the rest (300 + 150).</p>`, check:()=>D.cable===450&&D.eq300&&Math.abs(residualDb(S().fsc))<0.5, hint:'Cable 450; E key for the 300 m switch; then trim.'},
  {title:'4 · Why the clamp is there', body:`<p>Choose the <b>bounce</b> pattern (the picture alternates black and white every half second) and push <b>CLAMP</b> out. The blanking level jumps with the picture content, because without the clamp the stage is AC-coupled. Push CLAMP back in: the back porch is held at 0 V on every line.</p>`, check:()=>D.pattern==='bounce'&&D.clamp&&D.log.some(e=>e.name==='CLAMP → OUT'), hint:'Pattern → bounce, press C twice.'},
  {title:'5 · Set the level', body:`<p>Use <b>LEVEL</b> to set the outputs to exactly 1 V p-p (0 dB in the stage table's last row).</p>`, check:()=>Math.abs(20*Math.log10(levelGain()))<0.2, hint:'A/S keys.'},
  {title:'Done', body:`<p>See <b>Findings</b> for what is (and is not) in the archive about this product.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod15aActive=true; tutorialView(m,{title:'Tutorial — installing a POD15A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${stageTable(stageStats(),'dB')}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod15aActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('At the playhead',`<div id="dev"></div>`)}${card('What a monitor on OUT 1 shows (one line, as a waveform monitor)',`<canvas id="wfm"></canvas>`)}</div>`;
  const draw=()=>{ const s=S(), t=SIM.t;
    const rows=[['Fields',(1/s.field).toFixed(3),SIM.fmtDur(s.field),'vertical sync; the SYNCH detector needs a few (${inf})'.replace('${inf}',inf)],['Lines',(1/s.line).toFixed(1),SIM.fmtDur(s.line),`${s.lines} per frame`],['Colour subcarrier cycles',s.fsc.toLocaleString(),SIM.fmtDur(1/s.fsc),'the EQ is set for this frequency'],
      ['Clamp pulses',D.clamp?(1/s.line).toFixed(1):'0',SIM.fmtDur(s.line),'one per line on the back porch ('+inf+')'],['Burst cycles per line','≈ 9','2.5 µs','reference for the monitor\'s colour decoder']];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const tl=((t%s.line)+s.line)%s.line; m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>Field / line</th><td class="mono">${Math.floor(t/s.field)} / ${Math.floor((t%s.field)/s.line)+1}</td></tr><tr><th>Within the line</th><td class="mono">${(tl*1e6).toFixed(2)} µs ${tl<s.hs?'(H sync)':tl<s.act0?'(back porch / burst)':'(active picture)'}</td></tr>
      ${['src','in','eq','clamp','out'].map(k=>`<tr><th>${k}</th><td class="mono">${stage(k,t).toFixed(3)} V</td></tr>`).join('')}</table>`;
    const {c,w}=SIM.canvas(m.querySelector('#wfm'),220); c.fillStyle='#071007'; c.fillRect(0,0,w,220); c.strokeStyle='rgba(120,255,120,.25)';
    [-0.3,0,0.35,0.7,1].forEach(v=>{ const y=180-(v+0.4)*130; c.beginPath(); c.moveTo(30,y); c.lineTo(w-10,y); c.stroke(); c.fillStyle='rgba(150,255,150,.6)'; c.font='10px sans-serif'; c.fillText(v.toFixed(2)+' V',2,y+3); });
    c.strokeStyle='#8f8'; c.beginPath(); const L0=Math.floor(t/s.line)*s.line; for(let i=0;i<=1200;i++){ const tt=L0+s.line*i/1200, v=stage('out',tt), y=180-(v+0.4)*130; i?c.lineTo(30+(w-40)*i/1200,y):c.moveTo(30,y);} c.stroke(); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:20,y:30,w:180,h:80,t:'Looping input',s:['2 × BNC, Hi-Z bridge','46 dB return loss (POD15)'],d:'From the POD15 manual: a high-impedance looping input; the line is terminated at the far loop BNC.'},
  eq:{x:240,y:30,w:180,h:90,t:'Cable equaliser',s:['0–300 m trim','+300 m switch (600 m total)'],d:'A frequency-dependent gain stage that undoes coax loss (√f). The circuit is not archived; the values come from the panel legend.'},
  cl:{x:460,y:30,w:180,h:90,t:'Clamp',s:['back-porch DC restore','IN / OUT push switch'],d:'Holds the blanking level at 0 V each line (inferred: sync-separator-driven keyed clamp).'},
  sy:{x:240,y:170,w:180,h:80,t:'Sync detect',s:['SYNCH (green)','ERROR (red)'],d:'The criteria for ERROR are not documented. Here: no sync, an EQ mismatch over 3 dB, or a level error over 3 dB (inferred).'},
  lv:{x:460,y:170,w:180,h:80,t:'LEVEL + drivers',s:['level trim','7 × 75 Ω back-terminated'],d:'6 rear outputs + front VIDEO MONITOR, each 1 V p-p into 75 Ω (manual: “6+1 splits”).'},
  out:{x:460,y:290,w:180,h:70,t:'OUT 1–6 + MONITOR',s:['BNC'],d:'Rear OUT 1–6 (staggered BNCs), front VIDEO MONITOR.'},
};
const WIRES=[['in','eq',''],['eq','cl',''],['cl','lv',''],['eq','sy',''],['lv','out','×7']];
function viewBlock(m){ window.__pod15aActive=false; blockView(m,BLOCKS,WIRES,'eq',[660,380],card('In one sentence',`<p>A bridging input takes the incoming video, an adjustable cable equaliser undoes the cable's high-frequency loss, a clamp pins the blanking level, and seven 75 Ω drivers send identical 1 V copies out.</p>`)); }
const SHEETS=[
  {name:'1 · Functional schematic (inferred)', note:'No POD15A schematic, BOM or Gerber is archived. This is a functional sheet built from the panel legends and the POD15 manual; the part types are typical choices, not archive facts.', svg:()=>
    net(30,120,'INPUT BNC')+wire([[110,120],[150,120]])+dot(150,120)+wire([[150,120],[150,200]])+net(120,220,'LOOP BNC (75 Ω term.)')+res(150,120,220,120,'','')+txt(170,108,'Hi-Z buffer',10)
    +opamp(240,132,'EQ stage (inferred)')+txt(240,190,'0–300 m trim + 300 m section',10,'var(--ink2)')+wire([[300,132],[360,132]])
    +opamp(360,132,'clamp + buffer')+txt(360,205,'keyed by sync separator',10,'var(--ink2)')+wire([[420,132],[480,132]])
    +opamp(480,132,'LEVEL + driver')+wire([[540,132],[600,132]])+[0,1,2,3,4,5,6].map(i=>res(600,60+i*40,680,60+i*40,'75R','')+wire([[600,60+i*40],[590,60+i*40]])+net(690,60+i*40,i<6?'OUT '+(i+1):'VIDEO MONITOR')).join('')+wire([[590,60],[590,300]])
    +txt(40,400,'Each output: driver gain ×2 into a 75R back-termination → 1 V p-p at a terminated load (manual: 1 V p-p, terminated).',11.5)},
];
function viewSchem(m){ window.__pod15aActive=false; schemView(m,SHEETS,'POD15A','This sheet is a functional reconstruction, labelled as inferred. The archive has only POD15A panel artwork, mechanical panels and photos, plus the older POD15 manual.'); }
function viewSoft(m){ window.__pod15aActive=true; let hot=1;
  m.innerHTML=`${card('No firmware — the video path, stage by stage',`<div id="f"></div><div id="det" class="card"></div>`)}${card('Cable loss and EQ vs frequency (live)',`<canvas id="fr"></canvas>`)}`;
  const draw=()=>{ const s=S(); const st=[{t:'Source',s:['1 V p-p']},{t:`Cable ${D.cable} m`,s:[fdb(-lossDb(s.fsc,D.cable))+' dB @ fsc']},{t:`EQ ${Math.round(eqLen())} m`,s:[fdb(lossDb(s.fsc,eqLen()))+' dB @ fsc'],bad:Math.abs(residualDb(s.fsc))>3},{t:`Clamp ${D.clamp?'IN':'OUT'}`,s:[D.clamp?'0 V back porch':'AC-coupled']},{t:'LEVEL → 7 outs',s:[fdb(20*Math.log10(levelGain()),2)+' dB']}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=['House reference or programme: 1 V p-p into 75 Ω.',`Coax loss grows with √f: ${fdb(-lossDb(1e6,D.cable))} dB at 1 MHz, ${fdb(-lossDb(s.fsc,D.cable))} dB at ${(s.fsc/1e6).toFixed(2)} MHz, ${fdb(-lossDb(5e6,D.cable))} dB at 5 MHz (${inf}: RG-59-class).`,'The equaliser applies the inverse curve for the length you set. Too little leaves soft edges and weak colour; too much gives peaking and ringing.','Keyed clamp on the back porch (inferred). OUT = plain AC coupling: the DC shifts with the average picture level.','Gain trim, then seven back-terminated outputs.'][hot];
    const {c,w}=SIM.canvas(m.querySelector('#fr'),200); const X=f=>40+(Math.log10(f)-5)/(Math.log10(8e6)-5)*(w-60), Y=d=>20+(d+6)/26*160;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; [1e5,1e6,s.fsc,5e6].forEach(f=>{ c.beginPath(); c.moveTo(X(f),20); c.lineTo(X(f),180); c.stroke(); c.fillText((f/1e6).toFixed(f<1e6?1:2)+' MHz',X(f)+2,195); });
    [0,-6,-12,-18].forEach(d=>c.fillText(d+' dB',2,Y(-d)+3));
    [[f=>lossDb(f,D.cable),SIM.css('--accent2'),'cable'],[f=>-lossDb(f,eqLen()),SIM.css('--warn'),'EQ'],[f=>residualDb(f),SIM.css('--accent'),'result']].forEach(([fn,col,lb])=>{ c.strokeStyle=col; c.lineWidth=2; c.beginPath(); for(let i=0;i<=100;i++){ const f=Math.pow(10,5+i/100*(Math.log10(8e6)-5)); const y=Y(fn(f)); i?c.lineTo(X(f),y):c.moveTo(X(f),y);} c.stroke(); c.fillStyle=col; c.fillText(lb, X(6e6), Y(fn(6e6))-4); }); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod15aActive=false;
  m.innerHTML=card('What the POD15A archive shows — findings',`<ol>
   <li><b>Only the outside is archived.</b> The POD15A folder has panel artwork (front ISS3, rear ISS2 CorelDRAW), panel drawings and two photos. There is no schematic, BOM, Gerber or manual. Everything inside this model is inferred and labelled so.</li>
   <li><b>The POD15 → POD15A step is visible on the panel.</b> The older POD15 manual describes a 1×6 DA with level trim and a front split. The POD15A panel keeps those and adds a cable equaliser (“0-300m”, “300m”, “(600m TOTAL)”), a CLAMP in/out switch and SYNCH/ERROR tallies.</li>
   <li><b>The manual's specs are for POD15, not POD15A.</b> Return loss 46 dB, response 0.05 dB, DG/DP 0.15 %/0.15° and S/N 60 dB, all at 3.58 MHz, and 115 V/60 Hz 12 VA. The POD15A rear silk says “90-230 VAC, 50-60 Hz, ½ A.S.B.”, so POD15A moved to a universal supply.</li>
   <li><b>The CLAMP switch legend uses a graphic.</b> The front silk draws OUT/IN with a raised and a pressed key symbol, the same convention as a latching push switch.</li>
   <li><b>The panel issues differ.</b> The mechanical set is front ISS 1 and rear ISS 2, while the silks are front “ISS3” (<span class="mono">Pd15Asilk-ISS3.cdr</span>) and rear “ISS2”.</li>
   <li><b>The front monitor output counts as a seventh output.</b> The POD15 manual says “Output Impedance (6+1 splits) 75 ohm”. On POD15A the split is the VIDEO MONITOR BNC on the front.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Coax loss 3.1 dB/100 m at 5 MHz, scaling with √f; the EQ applies the inverse for the set length (${inf}).</li><li>Clamp-out bounce: AC coupling with about 60 ms recovery (${inf}).</li><li>LEVEL ±3 dB; SYNCH needs sync above 100 mV; ERROR = no sync, more than 3 dB EQ mismatch or more than 3 dB level error (${inf}).</li><li>Colour bars approximate 75 % bars; the subcarrier phase is drawn for illustration, not as a true NTSC/PAL encoder.</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>../POD  - #Engineering/pod15.pdf</li><li>POD15A - #ARTWORK #DA #2016/POD15A-FRONT&amp;REAR-SILK (CURVE).pdf · Pd15Asilk-ISS3.cdr · Pd15AREAR-ISS2-CURVE.cdr · Pics/</li><li>POD15A - #Mechanical #DA #2016/POD15A-FRONT ISS 1 (PANEL).pdf · POD15A-REAR ISS 2 (PANEL) .pdf</li></ul>`); }
SIM.register({
  id:'pod15a', name:'POD15A · analog video DA with cable EQ and clamp (2014|47)', duration:1, product:'POD15A', year:2014, family:'POD series', folder:'#POD #SERIES/POD15A - #Master',
  summary:'Half-rack composite video distribution amplifier: a looping Hi-Z input, a 0–600 m cable equaliser, a back-porch clamp, a level trim and seven 75 Ω outputs (six rear, one front monitor). Only the panels survive, so the circuit is modelled from the legends and the older POD15 manual (year from the 2014 silk date).',
  highlights:['Real silkscreen panels with working EQ, 300 m, CLAMP and LEVEL controls','NTSC/PAL lines with sync, burst and bars through each stage','Cable loss vs equaliser, live frequency plot','Loop-termination mistakes and clamp-out bounce'],
  depth:'Hardware model',
  stepUnits:[{label:'1 line',period:()=>S().line},{label:'1 field',period:()=>S().field},{label:'1 subcarrier cycle',period:()=>1/S().fsc},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1001/60000,'1 field'],[0.0002,'3 lines'],[64e-6,'1 line (64 µs)'],[1e-5,'10 µs (sync + burst)'],[1e-6,'1 µs (subcarrier)']], defaultZoom:4,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: installing a POD15A',render:viewTutorial},{id:'second',label:'One second, line by line',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (inferred)',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
