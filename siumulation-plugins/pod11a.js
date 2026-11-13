/* =====================================================================
   POD11A — Stereo loudness meter (VU + PPM/peak LED bars, phase meter), Ward-Beck Systems
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model.

   The POD11A folder holds only panels, panel drawings and photos.
   Corrected 2026|59 (see pod11.js, pod3a.js, slm.js): the model is rebased on the POD11A manual and the digital SLM-1 code.
   - #POD #SERIES/XXX - POD11 - #Master  #OBSOLETE/POD11 - #MANUAL #Obsolete/POD11A MANUAL.pdf (DIP table, ballistics, 41 LEDs, 30–96 kHz)
   - #SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/sharc/slm-1-v1.02/slm-1-main.asm, vumeter.asm, phasemeter.asm,
     sdm_vu_data_1..3.dat, sdm_pk_data_1..3.dat, sdm_phase_data.dat (digital SLM-1 master; tied to POD11A by the 2004
     "POD11A AES/EBU MONITOR" functional diagram with an "SLM1D Input" — inferred)
   - #POD #SERIES/POD11A - #Master/POD11A - #ARTWORK #DA #2016/POD11A-FRONT&REAR-SILK(CURVE).pdf (panels, Jun 19 2014) + Pics/
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

const PREFIX='pod11a';
/* ---------------- constants from the digital SLM-1 master (slm-1-v1.02/slm-1-main.asm, vumeter.asm, phasemeter.asm) ----------------
   sample_rate_calc picks one set per measured rate (emuclk counts between SPORT0 interrupts: 96k ≈ 301, 48k ≈ 598, 44.1k ≈ 647, ±10).
   Comment in the code: "vu=300mS/24db, pk attack=5mS/24db, peak decay parameter calc for 1.5s and 3s /24db".            */
const KS = {
  32000:{ vu:0.0005754806, pa:0.03394912, d1:0.0000575630, d2:0.0001151226, emu:'797–1165 (non-standard band)' },
  44100:{ vu:0.0004176153, pa:0.02475070, d1:0.0000417694, d2:0.000083537,  emu:'647 ± 10' },
  48000:{ vu:0.0003836906, pa:0.02276277, d1:0.0000383757, d2:0.0000767499, emu:'598 ± 10' },
  96000:{ vu:0.0001918637, pa:0.01138138, d1:0.0000191880, d2:0.0000383757, emu:'301 ± 10' },
};
const T24 = (tc,fs) => -24/(10*fs*Math.log10(1-tc));   // seconds per 24 dB, from "tconst = 1 − 10^(−24/(10·time·FS))"
const PK_HOLD = 200000, PK_THRESH = 0.707, MUX = 300, PH_ALPHA = 0.999;   // pk_hold / ppm_hold (samples), pk_thresh, mux_rate, PHMETER_ALPHA
// the silk's 57 scale points: 52 … 20 in 2 dB steps, 19 … 1, 0, 1 … 20  (dB re the CAL reference)
const SEG = [...Array(17)].map((_,i)=>-52+2*i).concat([...Array(19)].map((_,i)=>-19+i)).concat([0]).concat([...Array(20)].map((_,i)=>i+1));
const SEGX = i => 500 + i*(1353-500)/56;
// sdm_vu_data_1..3 / sdm_pk_data_1..3: table index (0–255, 0.5 dB per step) → segment label. 40 segments, +14 … −38.
const BRK = [[0,14]].concat([...Array(30)].map((_,k)=>[13+2*k,13-k])).concat([[75,-18],[79,-20],[83,-22],[87,-24],[91,-26],[95,-28],[99,-32],[107,-36],[115,-38],[123,null]]);
const FWSEG = BRK.filter(b=>b[1]!==null).map(b=>b[1]);            // the 40 firmware segments, top first
function labelOf(idx){ let L=null; for (const [i,l] of BRK) if (idx>=i) L=l; return idx>=123?null:L; }
const D = { ver:'75', on:true, lockAt:-1, fs:48000, dip:{BS1:1, BS0:0, CAL1:1, CAL0:1},   // 1 = switch ON. BS1 ON = peak hold OFF; BS0 OFF = 1.5 s decay
  sig:{ prog:'bursts', f:1000, dbfs:-12, phase:0, rOff:0 }, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
// DIP switches are read as FLAG0–3 inputs (ASTAT bits 19–22). A switch that is ON reads 0 (pull-up, inferred: it makes BS1 and CAL agree with the manual)
const flag = n => D.dip[n] ? 0 : 1;
const calV = () => flag('CAL1') + 2*flag('CAL0');               // read_dipswitch: (astat & cal_mask) >> 21
const meterCal = () => 4*calV() - 6;                            // meter_cal: −6 = −20 dBFS, 0.5 dB per unit
const calRef = () => -20 + 2*calV();
const ppmHoldOn = () => flag('BS1')===1;                         // "test position of BS1": bit set → ppm_hold_l / ppm_hold_r run
const decay = () => flag('BS0')===0 ? KS[D.fs].d1 : KS[D.fs].d2; // BS0 bit clear → peak_decay_1 ("type2 (3 seconds)")
const decayName = () => flag('BS0')===0 ? 'peak_decay_1 — 3 s/24 dB (code comment “type2”)' : 'peak_decay_2 — 1.5 s/24 dB (code comment “type1”)';
function locked(t){ return D.on && (D.lockAt<0 || t >= D.lockAt + 0.02); }   // CS8427 lock time inferred
/* ---------------- programme ---------------- */
function amp(ch,t){ const s=D.sig; if (!D.on) return 0;
  let a=Math.pow(10,(s.dbfs + (ch?s.rOff:0))/20);
  if (s.prog==='bursts') a *= (t%0.5)<0.12 ? 1 : 0;                    // 120 ms bursts every 500 ms
  else if (s.prog==='step') a *= t>=0.2 ? 1 : 0;
  else if (s.prog==='speech'){ const e=0.5+0.5*Math.sin(2*Math.PI*3.1*t)*Math.sin(2*Math.PI*0.7*t+1); a*=Math.max(0,e)*(1+0.4*Math.sin(2*Math.PI*11*t)); }
  return Math.min(a,1); }
function sample(ch,t){ return amp(ch,t)*Math.sin(2*Math.PI*D.sig.f*t + (ch? D.sig.phase*Math.PI/180 : 0)); }
/* ---------------- VUMeterCalc + PhaseMeterCalc + hold counters, run once per settings change at 0.25 ms resolution ---------------- */
let CACHE=null, KEY='';
const idxOf = p => clamp(Math.round(Math.min(255, p>0 ? -2*10*Math.log10(p) : 255)) + meterCal(), 0, 255);   // VUMeterGet → +meter_cal → clamp 0..255
function run(){
  const key=JSON.stringify([D.sig,D.dip,D.on,D.fs]); if (key===KEY) return CACHE; KEY=key;
  const fs=D.fs, K=KS[fs], dt=0.00025, N=Math.round(1/dt)+1, n=fs*dt;
  const step = tc => 1-Math.pow(1-tc, n);
  const aVU=step(K.vu), aPA=step(K.pa), aPD=step(decay()), aPh=1-Math.pow(PH_ALPHA,n), holdT=PK_HOLD/fs;
  const out=[[],[]], ph=[];
  const st=[0,1].map(()=>({vu:0,ppm:0,led:0,hold:255,hc:0})); let sA=0, dA=0;
  for (let k=0;k<N;k++){ const t=k*dt;
    for (let ch=0;ch<2;ch++){ const s=st[ch], A=amp(ch,t), sq=A*A;
      s.vu += (sq/2 - s.vu)*aVU;                                         // VU = VU + (in² − VU)·Tvu (mean of a sine's in² = A²/2)
      s.ppm += (sq - s.ppm)*(sq>s.ppm ? aPA : aPD);                       // PPM = max(PPMA, PPMD)
      s.led = A>PK_THRESH ? holdT : Math.max(0, s.led-dt);               // test_peaks: |in| > 0.707 → pk_led for pk_hold samples
      const pk=idxOf(s.ppm);
      if (ppmHoldOn()){ if (pk<=s.hold){ s.hold=pk; s.hc=holdT; } else if (s.hc>0) s.hc=Math.max(0,s.hc-dt); else s.hold=255; }
      else { s.hold=255; s.hc=Math.max(0,s.hc-dt); }
      out[ch].push([s.vu,s.ppm,s.led>0,s.hold]); }
    const a=amp(0,t), b=amp(1,t), c=Math.cos(D.sig.phase*Math.PI/180), avg=2/Math.PI;  // average |L±R| of two sines
    sA += (avg*Math.sqrt(Math.max(0,a*a+b*b+2*a*b*c)) - sA)*aPh; dA += (avg*Math.sqrt(Math.max(0,a*a+b*b-2*a*b*c)) - dA)*aPh;
    ph.push((sA+dA)<1e-4 ? 128 : Math.trunc(128*clamp((sA-dA)/(sA+dA),-1,1)+128)); }
  CACHE={dt,out,ph}; return CACHE;
}
const dbOf = p => p>1e-14 ? 10*Math.log10(p) : -140;
const tMux = t => Math.floor(t*D.fs/MUX)*MUX/D.fs;              // translate_meter_results runs every mux_rate = 300 samples
function meter(ch,t){ const c=run(); const i=clamp(Math.round(t/c.dt),0,c.out[ch].length-1), [vu,ppm,led,hold]=c.out[ch][i];
  const lk=locked(t), vi=lk?idxOf(vu):255, pi=lk?idxOf(ppm):255, hi=lk?hold:255;
  return { vu:dbOf(2*vu), ppm:dbOf(ppm), vuIdx:vi, pkIdx:pi, holdIdx:hi, led:lk&&led,
    vuL:labelOf(vi), pkL:labelOf(pi+6), holdL:(()=>{ const L=labelOf(hi+6); return L===null||L<(ch?-1:0)?null:L; })() }; }   // hold dot: pk_data_1 only (−1 … +14), left masks −1
function phaseCode(t){ if(!locked(t)) return 255; const c=run(); return c.ph[clamp(Math.round(t/c.dt),0,c.ph.length-1)]; }   // no lock → phase_results forced to 255
function phaseLit(code){ return code<36?7: code<72?6: code<108?5: code<148?4: code<184?3: code<220?2: 1; }       // sdm_phase_data.dat
const rel = dbfs => dbfs - calRef();
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>{ const m=meter(0,SIM.t); return `L VU ${m.vuL===null?'off':fdb(m.vuL,0)} · PPM dot ${m.pkL===null?'off':fdb(m.pkL,0)} (scale, CAL ${calRef()} dBFS)`; });
const A={
  dip(n){ act(`Rear DIP ${n} → ${D.dip[n]?'OFF':'ON'}`, tr=>{ D.dip[n]^=1;
    tr(`read as FLAG${({BS1:0,BS0:1,CAL1:2,CAL0:3})[n]} = ${flag(n)} (ASTAT bit ${({BS1:19,BS0:20,CAL1:21,CAL0:22})[n]}; ON reads 0, ${inf})`);
    if (n==='BS1') tr(ppmHoldOn()?`BS1 OFF = PEAK HOLD ON: sport0_isr calls ppm_hold_l / ppm_hold_r every sample; a PPM peak is held for ppm_hold = 200000 samples (${(PK_HOLD/D.fs).toFixed(2)} s at ${D.fs/1000} kHz; manual says 3 s). The hold dot comes from pk_data_1 only, so only peaks at −1 … +14 are held`:'BS1 ON = PEAK HOLD OFF: bs1_is_off0 → ppm_hold_left/right = 255 (dot off)');
    else if (n==='BS0') tr(`update_meter_parameters_${D.fs===44100?'441':D.fs/1000}: BS0 bit ${flag('BS0')?'set':'clear'} → ${decayName()} written to VUMETER_WS_PPM_DECAY (manual: BS0 ON = Type 1; the code gives ON = 3 s)`);
    else tr(`read_dipswitch: meter_cal = 4·${calV()} − 6 = ${meterCal()} → scale 0 = ${calRef()} dBFS (manual table: ON/ON −20, OFF/ON −18, ON/OFF −16, OFF/OFF −14)`); }); },
  plug(){ act(D.on?'Disconnect AES input':'Connect AES input', tr=>{ D.on=!D.on; D.lockAt=SIM.t; tr(D.on?'CS8427 locks (≈20 ms, '+inf+'): cs8427_in+5 bit 13 clears → refresh_lock_status sets the LOCK bit in shift7; SPORT0 DMA delivers one stereo pair per sample → VUMeterCalc, PhaseMeterCalc':'cs8427_in+5 bit 13 set (no lock): refresh_lock_status → ERROR bit; translate_meter_results forces vu/pk results and ppm_hold to 255 (bars off), pk_led to 0, raises FLAG10 for the PIC — and forces phase_results to 255, which the phase table shows as one “in phase” LED'); }); },
  set(k,v,l){ act(l, tr=>{ D.sig[k]=v; tr(k==='phase'?`PhaseMeterCalc: sumAVE = AVE|L+R|, diffAVE = AVE|L−R| (α = 0.999); PhaseMeterGet = trunc(128·(sum−diff)/(sum+diff) + 128) → ${phaseCode(SIM.t)} → ${phaseLit(phaseCode(SIM.t))} of 7 phase LEDs`:k==='dbfs'&&v>-3?'Above −3 dBFS: test_peaks sees |in| > pk_thresh 0.707 → pk_led lights for 200000 samples':'Programme changed; ballistics recomputed'); }); },
  fs(v){ act(`Input sample rate → ${v/1000} kHz`, tr=>{ D.fs=v; tr(`sample_rate_calc: emuclk difference between interrupts ${KS[v].emu} → update_meter_parameters_${v===44100?'441':v/1000}: VU ${KS[v].vu}, PPM attack ${KS[v].pa}, decay ${decay()}`); tr(`Counts in samples are not rescaled: pk_hold / ppm_hold = ${(PK_HOLD/v).toFixed(2)} s, mux period ${SIM.fmtDur(MUX/v)}`); }); },
  ver(v){ act(`Rear version → ${v} Ω`, tr=>{ D.ver=v; tr(v==='75'?'BNC input (Pics/POD11A Rear 75.jpg)':'Phoenix + − G input (Pics/POD11A Rear 110.jpg)'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); KEY=''; SIM.refresh(); },
};
/* ---------------- panels (POD11A-FRONT&REAR-SILK(CURVE).pdf) ---------------- */
function segColor(v){ return v>8?'#ff2d6f': v>=0?'#ff9a2a': v>=-9?'#ffe23a':'#9be35a'; }
const PEAKPOS = SEG.indexOf(15);   // pk_led_left_1_on = bit 17 of shift1, next to +14 (bit 16): drawn at the silk's +15 point (inferred)
function frontSVG(t){
  const tq=tMux(t); let over='';
  [0,1].forEach(ch=>{ const m=meter(ch,tq), y=ch?184:126;
    SEG.forEach((s,i)=>{ const fw=FWSEG.includes(s); let on=false, col=segColor(s);
      if (fw && m.vuL!==null && s<=m.vuL) on=true;                      // VU bar (vu_data)
      if (fw && (s===m.pkL || s===m.holdL)) on=true;                     // PPM dot (pk_data) and held PPM dot
      if (i===PEAKPOS && m.led){ on=true; col='#ff2d2d'; }
      over+=`<rect x="${(SEGX(i)-5).toFixed(1)}" y="${y}" width="10" height="16" rx="2" fill="${on?col:fw||i===PEAKPOS?'#2a2f2a':'#1a1d1a'}" ${on?'filter="url(#glowfront)"':''}/>`; }); });
  const lit=phaseLit(phaseCode(tq));  // 7-LED phase bar: LED 1 (top, in phase) always lit, the bar grows toward out-of-phase
  for (let i=0;i<7;i++){ const yy=100+i*20; over+=`<circle cx="430" cy="${yy}" r="5" fill="${D.on||lit?(i<lit?(i<2?'#9be35a':i<4?'#ffe23a':'#ff4a3a'):'#2a2f2a'):'#2a2f2a'}"/>`; }
  over += led(745,222,locked(t),'var(--led-g)',9) + led(845,222,!locked(t),'#ff4a3a',9);
  return panelSVG(PREFIX,'front',{over},'POD11A front panel (CorelDRAW silk artwork)'); }
function rearSVG(){
  const names=['BS1','BS0','CAL1','CAL0'];
  let over = dip(752,52,names.map(n=>!!D.dip[n]),'dp',names) + (D.ver==='75'? bnc(1180,228,D.on,'inp','AES INPUT (75 Ω BNC) — click to connect/disconnect',46) : phx(1180,228,D.on,'inp','AES INPUT (110 Ω, + − G) — click'))
    + iec(1362,30,1600,250);
  return panelSVG(PREFIX,'rear',{over},'POD11A rear panel (CorelDRAW silk artwork)'); }
function bindPanel(root){ const names=['BS1','BS0','CAL1','CAL0']; root.querySelectorAll('.dp').forEach(g=>g.onclick=()=>A.dip(names[+g.dataset.i])); root.querySelectorAll('.inp').forEach(g=>g.onclick=()=>A.plug()); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Programme <select id="pg">${[['tone','steady tone'],['bursts','120 ms bursts'],['step','tone starts at 200 ms'],['speech','speech-like envelope']].map(([v,l])=>`<option value="${v}" ${v===D.sig.prog?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Level <input id="lv" type="number" step="1" value="${D.sig.dbfs}" style="width:56px"> dBFS</label><label>R offset <input id="ro" type="number" step="1" value="${D.sig.rOff}" style="width:50px"> dB</label>
  <label>R phase <select id="ph">${[0,45,90,135,180].map(p=>`<option ${p===D.sig.phase?'selected':''}>${p}</option>`).join('')}</select>°</label>
  <label>Rate <select id="fsr">${Object.keys(KS).map(k=>`<option value="${k}" ${+k===D.fs?'selected':''}>${k/1000} kHz</option>`).join('')}</select></label>
  <label>Rear <select id="vr"><option value="75" ${D.ver==='75'?'selected':''}>75 Ω (BNC)</option><option value="110" ${D.ver==='110'?'selected':''}>110 Ω (Phoenix)</option></select></label></div>
  <div class="small muted">Click the rear DIP levers (BS1 ON = peak hold OFF, BS0 decay, CAL1/CAL0 reference) and the input connector. Press Play or scrub: the bars move with the real SLM-1 time constants and refresh at the 300-sample mux rate. Silk points with no firmware LED are drawn darker. Keys 1–4 flip the DIP switches.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if(!g('#pg')) return;
  g('#pg').onchange=e=>A.set('prog',e.target.value,'Programme → '+e.target.selectedOptions[0].text); g('#lv').onchange=e=>A.set('dbfs',Math.min(0,+e.target.value),'Level → '+e.target.value+' dBFS');
  g('#ro').onchange=e=>A.set('rOff',+e.target.value,'R offset → '+e.target.value+' dB'); g('#ph').onchange=e=>A.set('phase',+e.target.value,'R phase → '+e.target.value+'°'); g('#vr').onchange=e=>A.ver(e.target.value); g('#fsr').onchange=e=>A.fs(+e.target.value); }
bindKeys('__pod11aActive', ()=>({'1':()=>A.dip('BS1'),'2':()=>A.dip('BS0'),'3':()=>A.dip('CAL1'),'4':()=>A.dip('CAL0')}));
/* ---------------- timeline ---------------- */
function dbLane(label, fn, color){ return { label, h:46, draw(c,X,t0,t1,y,h){ const Y=v=>y+4+(1-(clamp(v,-60,20)+60)/80)*(h-8);
  c.strokeStyle=SIM.css('--grid'); [-40,-20,0].forEach(v=>{ c.beginPath(); c.moveTo(X(t0),Y(v)); c.lineTo(X(t1),Y(v)); c.stroke(); });
  c.fillStyle=SIM.css('--ink2'); c.font='9px sans-serif'; c.fillText('0',X(t0)+2,Y(0)-1); c.fillText('−20',X(t0)+2,Y(-20)-1);
  c.strokeStyle=color; c.lineWidth=1.5; c.beginPath(); const N=Math.min(800,(X(t1)-X(t0))); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=fn(tt); i?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); } c.stroke(); }}; }
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), r=SIM.css('--bad'), fs=D.fs;
  const lab = L => L===null ? -60 : L;
  return [
    {label:`SPORT0 ISR (${fs/1000} kHz)`, h:22, draw(c,X,t0,t1,y,h){ if(!D.on) return; SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.2/fs,b,'sport0_isr → VUMeterCalc, PhaseMeterCalc'); }},
    {label:`mux_ctl (every ${MUX} samples)`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,MUX/fs,0,72/fs,wn,'L/R toggle + translate + 36-clock shift'); }},
    waveLane('Input L (samples)', t=>locked(t)?sample(0,t):0, -0.01, PK_THRESH, b, 34, Object.assign(t=>locked(t)?amp(0,t):0,{dense:(s,pw)=>s*D.sig.f>pw/3})),
    dbLane('VU L (dB re CAL, sine-ref.)', t=>locked(t)?rel(meter(0,t).vu):-60, a),
    dbLane('PPM L (dB re CAL)', t=>locked(t)?rel(meter(0,t).ppm):-60, wn),
    dbLane('Displayed VU segment L', t=>lab(meter(0,tMux(t)).vuL), SIM.css('--ink')),
    dbLane(`PPM dot L ${ppmHoldOn()?'+ hold dot':''}`, t=>{ const m=meter(0,tMux(t)); return Math.max(lab(m.pkL),lab(m.holdL)); }, r),
    boolLane(`Peak LED L (> −3 dBFS, ${(PK_HOLD/fs).toFixed(2)} s)`, t=>meter(0,t).led, '#ff2d2d'),
    {label:'Phase (PhaseMeterGet → LEDs)', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); const pc=phaseCode((t0+t1)/2); c.fillText(`${pc} → ${phaseLit(pc)} of 7 LEDs ${pc===128?'(no correlation / no valid signal)':pc>128?'(in phase)':'(out of phase)'}`, X(t0)+6, y+15); }},
    boolLane('LOCK (green)', t=>locked(t), '#3fbf5f'), boolLane('ERROR (red)', t=>!locked(t), '#e3453a'),
  ]; }
/* ---------------- views ---------------- */
function nowTable(t){ const m0=meter(0,tMux(t)), m1=meter(1,tMux(t)), f=L=>L===null?'off':fdb(L,0);
  return `<table class="kv"><tr><th>CAL reference</th><td class="mono">${calRef()} dBFS = scale 0 (meter_cal ${meterCal()}) · top segment +14 = ${calRef()+14} dBFS</td></tr>
  <tr><th>L: VU bar / PPM dot / hold</th><td class="mono">${f(m0.vuL)} / ${f(m0.pkL)} / ${f(m0.holdL)} · idx ${m0.vuIdx}/${m0.pkIdx}${m0.led?' · PEAK':''}</td></tr><tr><th>R: VU bar / PPM dot / hold</th><td class="mono">${f(m1.vuL)} / ${f(m1.pkL)} / ${f(m1.holdL)}${m1.led?' · PEAK':''}</td></tr>
  <tr><th>PPM hold (BS1) / decay (BS0)</th><td class="mono">${ppmHoldOn()?'ON':'OFF'} / ${flag('BS0')?'1.5':'3'} s per 24 dB</td></tr><tr><th>Rate</th><td class="mono">${D.fs/1000} kHz (emuclk Δ ${KS[D.fs].emu})</td></tr><tr><th>Phase</th><td class="mono">${phaseCode(t)} → ${phaseLit(phaseCode(t))} of 7 LEDs</td></tr></table>`; }
function viewSim(m){ window.__pod11aActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead — press Play to watch the ballistics',`<div id="fp"></div>${controlsHTML()}`)}${card('Rear panel — DIP switches and input',`<div id="rp"></div><div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src('#POD #SERIES/POD11A - #Master/POD11A - #ARTWORK #DA #2016/POD11A-FRONT&REAR-SILK(CURVE).cdr', 'POD11A-FRONT&REAR-SILK(CURVE).cdr')} (2016-06-24|49), CorelDRAW silk plates in their real inks.</div>`)}</div>
   <div>${card('What the firmware did (last action)',`<div id="trace" class="log"></div>`)}${card('Readings at the playhead',`<div id="now"></div>`)}</div></div>
   ${card('Timeline — one second, zoomable: detectors, displayed segments and status on the left channel',`<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Scope: one AES3 input frame at the playhead',`<canvas id="sc"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Flip a rear DIP switch or change the programme.'); m.querySelector('#now').innerHTML=nowTable(t);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200});
    const fs=D.fs, n=Math.floor(t*fs), s0=locked(t)?sample(0,t):0, s1=locked(t)?sample(1,t):0;
    drawAesScope(m.querySelector('#sc'), aesSubframe(s0,n%192===0?'Z':'X',n%192,fs), aesSubframe(s1,'Y',n%192,fs), fs, D.on?1:0.05, `frame ${n.toLocaleString()} ·`); };
  bindControls(m); SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD11A', body:`<p>The manual (<span class="mono">POD11A MANUAL.pdf</span>, in the obsolete POD11 folder): “a digital series loudness meter [that] displays the average (VU) and peak content of an audio signal simultaneously”, with “sticky” peak LEDs, a phase correlation meter and LOCK/ERROR. “Each stereo bargraph indicator comprises a dual set of 41 LEDs.” Input: AES/EBU 110 Ω or 75 Ω BNC, 30–96 kHz.</p><p class="muted">The model runs the digital SLM-1 master code (<span class="mono">SLM-1/sharc/slm-1-v1.0x</span>), which the 2004 functional diagram ties to POD11A (${inf}).</p>`, check:()=>true, auto:true},
  {title:'1 · Set the reference', body:`<p>Manual table 2: CAL1/CAL0 ON/ON = −20 dBFS, OFF/ON = −18, ON/OFF = −16, OFF/OFF = −14. In the code, <span class="mono">read_dipswitch</span> sets <span class="mono">meter_cal = 4·n − 6</span> (0.5 dB units). Set <b>−18 dBFS</b> (EBU).</p>`, check:()=>calRef()===-18, hint:'Click the CAL1 lever (third) to OFF.'},
  {title:'2 · Line-up tone', body:`<p>Choose <b>steady tone</b> at <b>−18 dBFS</b>. Press Play. The VU bar settles at 0 (300 ms per 24 dB) and the PPM dot sits on 0 too: the code adds 3 dB to the PPM index so that a sine reads the same on both.</p>`, check:()=>D.sig.prog==='tone'&&D.sig.dbfs===-18&&calRef()===-18, hint:'Programme → steady tone; Level −18.'},
  {title:'3 · Bursts show the ballistics', body:`<p>Choose <b>120 ms bursts</b> at −10 dBFS. The VU (300 ms/24 dB) never reaches the burst level; the PPM dot (5 ms/24 dB attack) does, then falls at 1.5 or 3 s per 24 dB.</p>`, check:()=>D.sig.prog==='bursts'&&D.sig.dbfs===-10, hint:'Programme → 120 ms bursts; Level −10.'},
  {title:'4 · Peak hold and PPM type', body:`<p>Flip <b>BS1</b> to OFF: that turns PEAK HOLD <b>on</b> (manual: “BS1 ON = Peak Hold Off”). A PPM peak above nominal stays as a second dot. Then flip <b>BS0</b>: the PPM decay changes between 1.5 s and 3 s per 24 dB.</p>`, check:()=>D.log.some(e=>e.name==='Rear DIP BS1 → OFF')&&D.log.some(e=>e.name.startsWith('Rear DIP BS0')), hint:'Click the first and second DIP levers.'},
  {title:'5 · The sticky peak LED', body:`<p>Set the level to <b>−2 dBFS</b>. Samples above 0.707 (−3 dBFS) light the red peak LED beyond +14, and it stays on for 200000 samples (${(PK_HOLD/48000).toFixed(2)} s at 48 kHz).</p>`, check:()=>D.sig.dbfs>-3, hint:'Level → −2.'},
  {title:'6 · Check the phase', body:`<p>Set R phase to <b>180°</b>: all 7 phase LEDs light (out of phase: a mono sum would cancel). At 0° only the top one is lit.</p>`, check:()=>D.sig.phase===180, hint:'R phase → 180.'},
  {title:'7 · Lose the input', body:`<p>Click the rear input to disconnect it. LOCK goes out, ERROR lights and the bars go dark at the next mux cycle. Look at the phase column: one LED stays lit (finding).</p>`, check:()=>!D.on, hint:'Click the BNC/Phoenix on the rear.'},
  {title:'Done', body:`<p>See <b>Findings</b> for the manual/code mismatches.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod11aActive=true; tutorialView(m,{title:'Tutorial — reading a POD11A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${nowTable(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod11aActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the DSP at the playhead',`<div id="dev"></div>`)}${card('As seen by the display (last mux update)',`<div id="fp"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, fs=D.fs, K=KS[fs];
    const rows=[['AES3 frames = SPORT0 interrupts',fs.toLocaleString(),SIM.fmtDur(1/fs),'sport0_isr: VUMeterCalc, PhaseMeterCalc, hold counters, test_peaks, DIP read'],
      ['VU detector','—',`24 dB in ${(T24(K.vu,fs)*1000).toFixed(0)} ms`,`VU_${fs===44100?'441':fs/1000} = ${K.vu} (“vu=300mS/24db”)`],
      ['PPM attack','—',`24 dB in ${(T24(K.pa,fs)*1000).toFixed(1)} ms`,`PPM_ATTACK = ${K.pa} (“pk attack=5mS/24db”)`],
      ['PPM decay (BS0)','—',`24 dB in ${T24(decay(),fs).toFixed(2)} s`,decayName()],
      ['Peak LED / PPM hold','—',`${(PK_HOLD/fs).toFixed(2)} s`,'pk_hold = ppm_hold = 200000 samples (manual: 3 s)'],
      ['Phase averaging','—',`τ ≈ ${SIM.fmtDur(1/(1-PH_ALPHA)/fs)}`,'PHMETER_ALPHA = 0.999'],
      ['mux_ctl: L/R toggle',(fs/MUX).toFixed(1),SIM.fmtDur(MUX/fs),'“300=80Hz mux rate at 48K”: each bar refreshed every '+SIM.fmtDur(2*MUX/fs)],
      ['LED shift (36 clocks, 2 interrupts each)',(fs/MUX).toFixed(1),SIM.fmtDur(72/fs),'shift_led_data → MM5450 (FLG4–6 data, FLG7 clock)']];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period / time</th><th>source (slm-1-v1.02)</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">The constants are per-sample IIR coefficients: tconst = 1 − 10^(−24/(10·time·FS)) (“change 40 to 24 for 24 db decay”).</p>`;
    m.querySelector('#dev').innerHTML=nowTable(t)+`<p class="small mono">sample ${Math.floor(t*fs).toLocaleString()} · L = ${sample(0,t).toFixed(5)} · R = ${sample(1,t).toFixed(5)} · last mux at ${SIM.fmtT(tMux(t))}</p>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:20,y:30,w:180,h:90,t:'AES input',s:['75 Ω BNC or 110 Ω Phoenix','CS8427 transceiver','status → LOCK/ERROR'],d:'Two rear versions (photos “Rear 75” and “Rear 110”). The code loads cs8427_ctl_dat.dat over SPORT1 (18 words) and reads the receiver error word cs8427_in+5; bit 13 = no lock.'},
  dsp:{x:250,y:30,w:200,h:120,t:'ADSP-21065L (digital SLM-1)',s:['sport0_isr every sample','VUMeterCalc / PhaseMeterCalc','sample_rate_calc (emuclk)','translate_meter_results'],d:'slm-1-v1.02/slm-1-main.asm (“DSB NOV 13,2002 ISSUE.1-WORKING”, v1.02 2006). Tied to POD11A by the 2004 “POD11A AES/EBU MONITOR” functional diagram (“SLM1D Input”) (inferred).'},
  dip:{x:20,y:170,w:180,h:80,t:'Rear DIP',s:['FLAG0 BS1, FLAG1 BS0','FLAG2 CAL1, FLAG3 CAL0'],d:'Read through ASTAT bits 19–22 every sample. ON reads 0 (inferred pull-ups; consistent with the manual for BS1 and CAL).'},
  led:{x:500,y:30,w:180,h:120,t:'LED drivers (MM5450)',s:['3 data lines FLG4–6, clock FLG7','FLG8/FLG9 left/right select','40 seg + peak per bar','7 phase, LOCK/ERROR'],d:'Shift registers shift1–3 (left) and shift5–7 (right), 36 clocks each, alternated every 300 samples (80 Hz at 48 kHz). The L/R multiplexing hardware is inferred.'},
  pic:{x:500,y:180,w:180,h:70,t:'PIC (source not archived)',s:['FLAG10 = no lock'],d:'translate_meter_results raises FLAG10 “FOR PIC”; v1.02 lengthens the FLG9 pulse “for pic L/R test”.'},
  ps:{x:250,y:190,w:200,h:60,t:'Power',s:['90–230 VAC 50/60 Hz'],d:'Manual and rear silk. No front power switch.'},
};
const WIRES=[['in','dsp','SPORT0 / SPORT1'],['dip','dsp','FLAG0–3'],['dsp','led','FLG4–9'],['dsp','pic','FLAG10'],['ps','dsp','']];
function viewBlock(m){ window.__pod11aActive=false; blockView(m,BLOCKS,WIRES,'dsp',[700,270],card('In one sentence',`<p>A CS8427 hands each AES sample pair to an ADSP-21065L, which runs VU and PPM detectors and a phase correlator every sample, and every 300 samples shifts 40 bar segments, a peak LED, 7 phase LEDs and LOCK/ERROR out to MM5450 drivers for one side of the display.</p>`)); }
const SHEETS=[
  {name:'1 · DSP pins used by the code', note:'Redrawn from the flag and SPORT usage in slm-1-main.asm (digital SLM-1 v1.02). No POD11A schematic is archived; the pin roles come from the code, the parts around them are inferred.', svg:()=>
    chip(330,70,200,'ADSP-21065L',[['SPORT0 RX/TX','CS8427 audio'],['SPORT1 RX/TX','CS8427 control'],['FLAG0','BS1'],['FLAG1','BS0'],['FLAG2','CAL1'],['FLAG3','CAL0'],['FLAG11','CS8427 reset']],[['FLAG4','MM5450 data 1'],['FLAG5','MM5450 data 2'],['FLAG6','MM5450 data 3'],['FLAG7','clock'],['FLAG8','left select'],['FLAG9','right select'],['FLAG10','PIC: no lock']],'digital SLM-1 (pins from the code)')
    +chip(60,330,160,'CS8427',[['AES in','BNC / Phoenix']],[['SDOUT','SPORT0'],['control','SPORT1']],'transceiver ('+'cs8427_ctl_dat.dat)')
    +chip(600,330,170,'3 × MM5450',[['DATA','FLG4–6'],['CLK','FLG7']],[['bar + phase','LEDs']],'LED drivers (inferred count)')
    +txt(30,445,'DIP inputs read through ASTAT bits 19–22 in sport0_isr; a switch that is ON reads 0 (inferred pull-ups).',10.5,'var(--ink2)')},
  {name:'2 · Meter algorithm (vumeter.asm)', note:'Redrawn from the comments and constants of vumeter.asm and slm-1-main.asm (digital SLM-1 v1.02).', svg:()=>
    txt(40,50,`Per sample (${D.fs/1000} kHz), sport0_isr → VUMeterCalc:`,13)+txt(60,80,'VU   = VU  + (in² − VU)·Tvu                Tvu = '+KS[D.fs].vu,12)+txt(60,105,'PPM  = max(PPM + (in² − PPM)·TppmA, PPM + (in² − PPM)·TppmD)   A = '+KS[D.fs].pa+', D = '+decay(),12)
    +txt(60,135,'VUMeterGet: idx = min(255, −2·10·log10(x)) + meter_cal (−6 = −20 dBFS), clamp 0…255   (0.5 dB per step)',12)
    +txt(60,160,'translate_meter_results: VU → vu_data_1..3[idx];  PPM → pk_data_1..3[idx + 6]  (+3 dB: a sine reads the same on both)',12)
    +txt(60,185,'40 segments: +14 … −16 in 1 dB, −18 … −28 in 2 dB, −32, −36, −38; index ≥ 123 = “no audio”',12)
    +txt(40,225,'test_peaks: |in| > 0.707 → pk_led (bit 17 of shift1) for 200000 samples',12)
    +txt(40,250,'ppm_hold (BS1 OFF): hold the lowest PPM index for 200000 samples; shown from pk_data_1 only (−1 … +14)',12)
    +txt(40,280,'PhaseMeterCalc: sumAVE = AVE|L+R|, diffAVE = AVE|L−R|  (α = 0.999)',12)+txt(40,305,'PhaseMeterGet = trunc(128·(sum − diff)/(sum + diff) + 128) → sdm_phase_data: 1 … 7 LEDs',12)
    +txt(40,340,'No lock (cs8427_in+5 & 8192): vu/pk/phase results and ppm_hold forced to 255, pk_led 0, FLAG10 set',12)},
];
function viewSchem(m){ window.__pod11aActive=false; schemView(m,SHEETS,'POD11A','There is no POD11A schematic in the archive. These sheets are redrawn from the digital SLM-1 source (pin roles from the code); the hardware around the DSP is labelled inferred.'); }
function viewSoft(m){ window.__pod11aActive=true;
  m.innerHTML=`<div class="grid2">${card('sport0_isr, once per sample (step running at the playhead)',`<div id="f"></div>`)}${card('Ballistics, step response (computed from the constants at the current rate)',`<canvas id="br"></canvas>`)}</div>${card('main: background loop',`<div id="mn"></div>`)}${card('DIP → code',`<div id="dp"></div>`)}`;
  const draw=()=>{ const fs=D.fs, K=KS[fs], ph=Math.floor(SIM.t*fs)%MUX, hot = ph===0?4:Math.floor((SIM.t*fs*7)%6);
    m.querySelector('#f').innerHTML=flowSVG([{t:'float inputs',s:['dma_in_a → ÷2³¹']},{t:'VUMeterCalc',s:['VU, PPM (in²)']},{t:'PhaseMeterCalc',s:['|L±R| averages']},{t:'hold counters',s:['ppm / pk_led']},{t:'mux_ctl',s:[ph===0?'NOW: translate':'every 300']},{t:'shift_led_data',s:['1 clock edge']}],hot);
    m.querySelector('#mn').innerHTML=flowSVG([{t:'sample_rate_calc',s:['emuclk Δ → '+fs/1000+' kHz','sets Tvu, TppmA, TppmD']},{t:'VUMeterGet ×2',s:['VU → vu_results','+ meter_cal']},{t:'VUMeterGet ×2',s:['PPM → pk_results']},{t:'PhaseMeterGet',s:['→ phase_results']},{t:'jump main',s:['forever']}],Math.floor(SIM.t*20)%5);
    const {c,w}=SIM.canvas(m.querySelector('#br'),200); const dt=0.002, X=t=>40+t/1.5*(w-50), Y=d=>10+(-d)/45*170;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; [0,-10,-20,-30,-40].forEach(d=>{ c.beginPath(); c.moveTo(40,Y(d)); c.lineTo(w-10,Y(d)); c.stroke(); c.fillText(d+' dB',2,Y(d)+3); }); [0,0.5,1,1.5].forEach(s=>c.fillText(s+' s',X(s)-6,196));
    const curves=[[K.vu,K.vu,SIM.css('--accent'),'VU'],[K.pa,K.d2,SIM.css('--warn'),'PPM 1.5 s'],[K.pa,K.d1,SIM.css('--bad'),'PPM 3 s']];
    curves.forEach(([ta,td,col,lb],k)=>{ let x=0; c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); for(let t=0;t<=1.5;t+=dt){ const sq=t<0.5?1:0, aa=1-Math.pow(1-ta,fs*dt), ad=1-Math.pow(1-td,fs*dt); const tgt=lb==='VU'?sq/2:sq; x += (tgt-x)*(tgt>x?aa:ad); const d=Math.max(-45,10*Math.log10(Math.max((lb==='VU'?2*x:x),1e-9))); t?c.lineTo(X(t),Y(d)):c.moveTo(X(t),Y(d)); } c.stroke(); c.fillStyle=col; c.fillText(lb, w-80, 30+k*14); });
    c.fillStyle=SIM.css('--ink2'); c.fillText('0 dBFS tone for 0.5 s, then silence',X(0.55),20);
    m.querySelector('#dp').innerHTML=`<table class="kv"><tr><th>Switch</th><th>Manual</th><th>Now</th><th>Code</th></tr><tr><td>BS1 (SW4, FLAG0)</td><td>ON = Peak Hold Off · OFF = Peak Hold On</td><td class="mono">${D.dip.BS1?'ON':'OFF'} → hold ${ppmHoldOn()?'ON':'OFF'}</td><td class="small mono">bit set → ppm_hold_l/r; clear → ppm_hold = 255</td></tr>
      <tr><td>BS0 (SW3, FLAG1)</td><td>ON = PPM Type 1 (1.5 s/24 dB) · OFF = Type 2 (3 s)</td><td class="mono">${D.dip.BS0?'ON':'OFF'} → ${flag('BS0')?'1.5':'3'} s</td><td class="small mono">bit clear → peak_decay_1 “type2 (3 seconds)”; set → peak_decay_2 “type1”</td></tr>
      <tr><td>CAL1, CAL0 (SW2, SW1)</td><td>−20 ON ON · −18 OFF ON · −16 ON OFF · −14 OFF OFF</td><td class="mono">${D.dip.CAL1?'ON':'OFF'}, ${D.dip.CAL0?'ON':'OFF'} = ${calRef()} dBFS</td><td class="small mono">meter_cal = 4·((astat &amp; cal_mask) &gt;&gt; 21) − 6 = ${meterCal()}</td></tr></table>
      <p class="small muted">BS1 and CAL agree with the manual if an ON switch reads 0. Read the same way, BS0 ON gives the 3 s decay, which the code calls “type2” and the manual calls Type 2 = OFF: the manual and the code disagree on BS0 (Findings).</p>`; };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod11aActive=false;
  m.innerHTML=card('What the POD11A archive shows — findings',`<ol><li><b>Artwork 2026|59: front/rear panels now from ${SIM.src('#POD #SERIES/POD11A - #Master/POD11A - #ARTWORK #DA #2016/POD11A-FRONT&REAR-SILK(CURVE).cdr', 'POD11A-FRONT&REAR-SILK(CURVE).cdr')} (2016-06-24|49).</b> GREEN + WHITE front plates and the WHITE rear plate registered on the panel outline (assets/pod11a-front.svg, pod11a-rear.svg). Unlike the other PODs the green plate carries no PODS mark: it prints the WBS box logo and “Ward-Beck Systems” bottom right, plus the green VU RANGE / PEAK RANGE brackets; the bar-graph scale numbers are set rotated 90°. Not used: POD11A-Silk-iss2.cdr (2006|39) and the live-text POD11A-FRONT&amp;REAR-SILK.cdr.</li>
   <li><b>Corrected 2026|59: the model is rebased on the POD11A manual and the digital SLM-1 code (see pod11.js, pod3a.js, slm.js).</b> The manual is in the obsolete POD11 folder (<span class="mono">XXX - POD11 - #Master #OBSOLETE/POD11 - #MANUAL #Obsolete/POD11A MANUAL.pdf</span>): BS1 ON = peak hold OFF, PPM decay 1.5 s or 3 s per 24 dB, peak LED above −3 dBFS, 30–96 kHz input, 41 LEDs per bar. The SLM-1 code this plugin used before (<span class="mono">POD3A - #Engineering/sharc/working v101</span>) is POD3A's own analog code (CAL steps 0/+4/+8/+12 dBu). POD11A's firmware is most likely the digital SLM-1 master in <span class="mono">#SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/sharc/slm-1-v1.0x</span> (${inf}: the 2004 functional diagram “POD11A AES/EBU MONITOR” shows an “SLM1D Input”).</li>
   <li><b>The code matches the manual's LED count.</b> <span class="mono">sdm_vu_data_1..3</span> light 40 segments (+14 … −16 in 1 dB, then −18 … −28 in 2 dB, −32, −36, −38) and <span class="mono">pk_led_left_1_on</span> (bit 17 of shift1) is the 41st, the peak LED: “a dual set of 41 LEDs”. The 2014 silk prints 57 scale points (52 … +20), so the silk does not match this firmware's bar; points with no firmware LED are drawn darker here (${inf}: a later LED board and table set may have existed).</li>
   <li><b>The CAL switches are 2 dB steps of meter_cal.</b> <span class="mono">read_dipswitch</span>: meter_cal = 4·n − 6 in 0.5 dB units, n from FLAG2/FLAG3, giving −20/−18/−16/−14 dBFS exactly as the manual's table 2 and the rear silk. (The POD3A analog code steps 0/+4/+8/+12 dBu, which is why it did not fit.)</li>
   <li><b>BS0: manual and code disagree.</b> Reading the switches the way that makes BS1 and CAL agree with the manual (ON = 0), BS0 ON selects <span class="mono">peak_decay_1</span>, commented “type2 (3 seconds)”. The manual says BS0 ON = PPM Type 1 (1.5 s). The rear silk's “PPM TYPE 2 ON” agrees with the code.</li>
   <li><b>The hold times are counted in samples.</b> <span class="mono">pk_hold</span> and <span class="mono">ppm_hold</span> are both 200000 samples: 4.17 s at 48 kHz, 4.54 s at 44.1 kHz, 2.08 s at 96 kHz. The manual says 3 s for both. Only the IIR constants are rescaled by <span class="mono">sample_rate_calc</span>.</li>
   <li><b>The peak LED is a sample-peak test.</b> <span class="mono">test_peaks_left_1</span> compares |in| with <span class="mono">pk_thresh 0.707</span> (−3 dBFS) on each raw sample: no oversampling, so inter-sample peaks are missed.</li>
   <li><b>Peak hold shows only peaks above nominal.</b> The held dot is drawn from <span class="mono">pk_data_1</span> alone, which covers −1 … +14, and the “-1 mask” removes −1 on the left channel: that is the manual's “holds PPM peaks above ‘nominal’”. On the right channel the mask is applied after the OR (<span class="mono">r1=r1 or r2; … r2=r3 and r2; r2=-1</span>), so the right hold dot can also show −1.</li>
   <li><b>No lock shows “in phase”.</b> Without lock <span class="mono">translate_meter_results</span> forces vu, pk and phase results to 255. For the bars 255 is “no audio”, but <span class="mono">sdm_phase_data[255]</span> is “in phase”, so one phase LED stays lit with no input.</li>
   <li><b>The sample rate is measured from emuclk.</b> <span class="mono">sample_rate_calc</span> compares the emuclk count between interrupts with 301/598/647 (96/48/44.1 kHz, ±10). The comments keep older counts (516/1025/1110/1365/2000), so the clock was changed (${inf}). Rates between bands fall to the nearest parameter set; 32 kHz has no exact test.</li>
   <li><b>“Loudness” here means VU and PPM, not LKFS.</b> The SLM-1 maths is VU integration plus PPM attack/decay on in². It has no K-weighting or gating (ITU-R BS.1770).</li>
   <li><b>vumeter.asm's own constants are overwritten.</b> <span class="mono">TCONST_VU 0.000319752</span> and <span class="mono">TCONST_PPM_DECAY 0.000031978</span> are only power-up values; <span class="mono">sample_rate_calc</span> replaces them on every pass of <span class="mono">main</span>. The 1.5 s / 3 s and 300 ms / 5 ms values in this model are the per-rate defines in slm-1-main.asm.</li>
   <li><b>v1.00 → v1.02.</b> v1.00 and v1.01 have the same <span class="mono">slm-1-main.asm</span> (Jun 2005). v1.02 (Mar 2006) only moves the FLG9 clear “to lengthen pulse for pic L/R test”: a PIC on the board watches the L/R select; its source is not archived.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>POD11A runs the digital SLM-1 v1.02 code (${inf}).</li><li>DIP switches read 0 when ON (pull-ups, ${inf}).</li><li>The detectors run at 0.25 ms steps using the per-sample coefficients raised to the step length; the display shows the values at the last 300-sample mux update.</li><li>The peak LED is drawn at the silk's +15 point and the firmware's 7 phase LEDs are spread over the silk's phase column (${inf}). CS8427 lock time 20 ms (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD11A - #ARTWORK #DA #2016/POD11A-FRONT&amp;REAR-SILK(CURVE).pdf · Pics/POD11A Front.jpg, Rear 75.jpg, Rear 110.jpg</li><li>../XXX - POD11 - #Master  #OBSOLETE/POD11 - #MANUAL #Obsolete/POD11A MANUAL.pdf · POD11 - Functional Diagram.cdr</li><li>#SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/sharc/slm-1-v1.02/slm-1-main.asm · vumeter.asm · phasemeter.asm · sdm_vu_data_1..3.dat · sdm_pk_data_1..3.dat · sdm_phase_data.dat · cs8427_ctl_dat.dat (v1.00, v1.01 compared)</li></ul>`); }
SIM.register({
  id:'pod11a', name:'POD11A · digital stereo loudness meter, VU/PPM LED bars + phase (2014|47)', duration:1, product:'POD11A', year:2014, family:'POD series', folder:'#POD #SERIES/POD11A - #Master',
  summary:'Half-rack AES-input stereo meter: two 41-LED bars showing VU and PPM together, a sticky peak LED, a 7-LED phase meter and LOCK/ERROR, set up by a rear DIP switch. The model follows the POD11A manual and the digital SLM-1 ADSP-21065L code (VU, PPM, peak, phase, sample-rate detection); the year comes from the 2014 silk date.',
  highlights:['Real silkscreen panels with the firmware\'s 40-segment bars, peak LED and phase column','VU 300 ms and PPM 5 ms / 1.5–3 s per 24 dB, rescaled for 32–96 kHz','Rear DIP decoded as the code reads it: CAL −20…−14, peak hold, decay','Manual vs code: BS0 sense, 4.17 s holds, “in phase” with no lock'],
  depth:'Full model',
  stepUnits:[{label:'10 ms',period:()=>0.01},{label:'1 ms',period:()=>0.001},{label:'1 sample',period:()=>1/D.fs},{label:'mux (300 samples)',period:()=>MUX/D.fs},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.5,'500 ms (one burst cycle)'],[0.1,'100 ms'],[0.0125,'12.5 ms (L+R mux)'],[0.001,'1 ms']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: reading a POD11A',render:viewTutorial},{id:'second',label:'One second, sample by sample',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (from the code)',render:viewSchem},{id:'software',label:'Software (digital SLM-1)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
