/* =====================================================================
   POD11A — Stereo loudness meter (VU + PPM/peak LED bars, phase meter), Ward-Beck Systems
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model.

   The POD11A folder holds only panels, panel drawings and photos. The metering maths comes from the "SLM-1"
   (Stereo Loudness Meter) ADSP-21065L code filed in the sister POD3A folder. Its options match POD11A's rear
   DIP legend exactly (peak hold, PPM type 1/2, −20 dBFS calibration), so the code is assumed to be POD11A's family (inferred):
   - #POD #SERIES/POD3A - #Master/POD3A - #Engineering/sharc/working v101/vumeter.asm   (TCONST_VU / PPM / PEAK, formulas)
   - .../sharc/working v101/slm-1-main.asm   (VU_32/441/48, peak_decay type 1 "1 second" / type 2 "3 seconds", meter_cal −6 = −20 dBFS)
   - .../sharc/working v101/phasemeter.asm   (PhaseMeterGet: 0–127 out of phase, 128 none, 129–255 in phase)
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

const PREFIX='pod11a';
const FS0=48000;
const TC = { VU:0.0003541811, PPM_A:0.02103034, PPM_D:0.00007084630, PK_D1:0.0000767499, PK_D2:0.0000383757 };  // per-sample at 48 kHz (vumeter.asm / slm-1-main.asm)
const T40 = tc => -4/(FS0*Math.log10(1-tc));      // seconds for 40 dB, from "tconst = 1 − 10^(−40/(10·time·FS))"
// the 57 scale points printed under the bars: 52 … 20 in 2 dB steps, 19 … 1, 0, 1 … 20  (dB re the CAL reference)
const SEG = [...Array(17)].map((_,i)=>-52+2*i).concat([...Array(19)].map((_,i)=>-19+i)).concat([0]).concat([...Array(20)].map((_,i)=>i+1));
const SEGX = i => 500 + i*(1353-500)/56;
const CALT = { '11':-20, '01':-18, '10':-16, '00':-14 };   // CAL1, CAL0 (1 = ON) from the rear silk table
const D = { ver:'75', on:true, lockAt:-1, dip:{BS1:0, BS0:1, CAL1:1, CAL0:1},   // BS1 OFF = peak hold off; BS0 ON = PPM type 2
  sig:{ prog:'bursts', f:1000, dbfs:-12, phase:0, rOff:0 }, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const calRef = ()=>CALT[''+D.dip.CAL1+D.dip.CAL0];
const peakHold = ()=>!!D.dip.BS1, ppmType = ()=> D.dip.BS0 ? 2 : 1;
function locked(t){ return D.on && (D.lockAt<0 || t >= D.lockAt + 0.02); }   // lock time inferred
/* ---------------- programme ---------------- */
function amp(ch,t){ const s=D.sig; if (!D.on) return 0;
  let a=Math.pow(10,(s.dbfs + (ch?s.rOff:0))/20);
  if (s.prog==='bursts') a *= (t%0.5)<0.12 ? 1 : 0;                    // 120 ms bursts every 500 ms
  else if (s.prog==='step') a *= t>=0.2 ? 1 : 0;
  else if (s.prog==='speech'){ const e=0.5+0.5*Math.sin(2*Math.PI*3.1*t)*Math.sin(2*Math.PI*0.7*t+1); a*=Math.max(0,e)*(1+0.4*Math.sin(2*Math.PI*11*t)); }
  return a; }
function sample(ch,t){ return amp(ch,t)*Math.sin(2*Math.PI*D.sig.f*t + (ch? D.sig.phase*Math.PI/180 : 0)); }
/* ---------------- ballistics, run once per settings change at 0.25 ms resolution ---------------- */
let CACHE=null, KEY='';
function run(){
  const key=JSON.stringify([D.sig,D.dip,D.on]); if (key===KEY) return CACHE; KEY=key;
  const dt=0.00025, N=Math.round(1/dt)+1, k=n=>FS0*dt*n;
  const step = tc => 1-Math.pow(1-tc, k(1));
  const aVU=step(TC.VU), aPA=step(TC.PPM_A), aPD=step(TC.PPM_D), aKD=step(ppmType()===1?TC.PK_D1:TC.PK_D2);
  const out=[[],[]];
  for (let ch=0;ch<2;ch++){ let vu=0, ppm=0, pk=0;
    for (let n=0;n<N;n++){ const t=n*dt, A=amp(ch,t), sq=A*A;      // in² of a sine: mean A²/2 (VU), peak A² (PPM)
      vu += (sq/2 - vu)*aVU;
      ppm += (sq - ppm)*(sq>ppm ? aPA : aPD);
      if (sq>=pk) pk=sq; else if (!peakHold()) pk += (0-pk)*aKD;
      out[ch].push([vu,ppm,pk]); } }
  CACHE={dt,out}; return CACHE;
}
const dbOf = p => p>1e-14 ? 10*Math.log10(p) : -140;
function meter(ch,t){ const c=run(); const i=clamp(Math.round(t/c.dt),0,c.out[ch].length-1), [vu,ppm,pk]=c.out[ch][i];
  return { vu:dbOf(2*vu), ppm:dbOf(ppm), pk:dbOf(pk) }; }   // dBFS (sine-referenced)
function rel(dbfs){ return dbfs - calRef(); }     // dB on the printed scale
function litCount(dbr){ let n=0; for (const s of SEG) if (dbr>=s) n++; return n; }
function dotIndex(dbr){ let idx=-1; SEG.forEach((s,i)=>{ if (dbr>=s) idx=i; }); return idx; }
function corr(t){ const a=amp(0,t), b=amp(1,t); if (a<1e-4||b<1e-4) return null; return Math.cos(D.sig.phase*Math.PI/180); }
function phaseCode(t){ const c=corr(t); return c===null?128:Math.round(128+c*127); }   // PhaseMeterGet output (0–255)
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`L VU ${fdb(rel(meter(0,SIM.t).vu))} · PPM ${fdb(rel(meter(0,SIM.t).ppm))} (scale dB, CAL ${calRef()} dBFS)`);
const A={
  dip(n){ act(`Rear DIP ${n} → ${D.dip[n]?'OFF':'ON'}`, tr=>{ D.dip[n]^=1;
    if (n==='BS1') tr(peakHold()?'PEAK HOLD ON: the peak dot stops decaying (TCONST_PEAK_DECAY = 0.0 in vumeter.asm)':`PEAK HOLD OFF: the peak dot decays at peak_decay_${ppmType()===1?'2 (type 1, “1 second”)':'1 (type 2, “3 seconds”)'}`);
    else if (n==='BS0') tr(`PPM TYPE ${ppmType()}: slm-1-main.asm picks ${ppmType()===1?'peak_decay_2_48 = 0.0000767499 (“type1 (1 second)”)':'peak_decay_1_48 = 0.0000383757 (“type2 (3 seconds)”)'}`);
    else tr(`CAL1/CAL0 = ${D.dip.CAL1?'ON':'OFF'}/${D.dip.CAL0?'ON':'OFF'} → scale 0 = ${calRef()} dBFS; the top segment (+20) = ${calRef()+20} dBFS${calRef()+20>0?' — above full scale, so it can never light':''}`);
    tr('The DSP reads the switches and re-indexes its dB-to-segment table (meter_cal; “-6=-20dBFS”) ('+inf+')'); }); },
  plug(){ act(D.on?'Disconnect AES input':'Connect AES input', tr=>{ D.on=!D.on; D.lockAt=SIM.t; tr(D.on?'Receiver locks (≈20 ms, '+inf+') → LOCK; SPORT0 DMA starts delivering one stereo pair per sample → VUMeterCalc every sample':'No lock: LOCK off, ERROR on ('+inf+'); the bars fall back with their decay time constants'); }); },
  set(k,v,l){ act(l, tr=>{ D.sig[k]=v; tr(k==='phase'?`PhaseMeterCalc: correlation ${Math.cos(v*Math.PI/180).toFixed(2)} → PhaseMeterGet ≈ ${Math.round(128+Math.cos(v*Math.PI/180)*127)} (0–127 out of phase, 128 none, 129–255 in phase)`:'Programme changed; ballistics recomputed'); }); },
  ver(v){ act(`Rear version → ${v} Ω`, tr=>{ D.ver=v; tr(v==='75'?'BNC input (Pics/POD11A Rear 75.jpg)':'Phoenix + − G input (Pics/POD11A Rear 110.jpg)'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); KEY=''; SIM.refresh(); },
};
/* ---------------- panels (POD11A-FRONT&REAR-SILK(CURVE).pdf) ---------------- */
function segColor(v){ return v>8?'#ff2d6f': v>=0?'#ff9a2a': v>=-9?'#ffe23a':'#9be35a'; }
function frontSVG(t){
  let over='';
  [0,1].forEach(ch=>{ const m=meter(ch,t), vu=rel(m.vu), lit=litCount(vu), dot=dotIndex(rel(m.pk)), y=ch?184:126;
    SEG.forEach((s,i)=>{ const on=locked(t)&&(i<lit||i===dot); over+=`<rect x="${(SEGX(i)-5).toFixed(1)}" y="${y}" width="10" height="16" rx="2" fill="${on?segColor(s):'#2a2f2a'}" ${on?'filter="url(#glowfront)"':''}/>`; }); });
  const pc=phaseCode(t);  // 11-LED vertical phase column, +1 at the top
  for (let i=0;i<11;i++){ const v=1-i*0.2, yy=100+i*12, onIdx=pc===128?-1:Math.round((1-(pc-128)/127)*5); over+=`<circle cx="430" cy="${yy}" r="4.5" fill="${locked(t)&&i===onIdx?(v>0?'#9be35a':v<-0.2?'#ff4a3a':'#ffe23a'):'#2a2f2a'}"/>`; }
  over += led(745,222,locked(t),'var(--led-g)',9) + led(845,222,!locked(t),'#ff4a3a',9);
  return panelSVG(PREFIX,'front',{over},'POD11A front panel (real silkscreen)'); }
function rearSVG(){
  const names=['BS1','BS0','CAL1','CAL0'];
  let over = dip(752,52,names.map(n=>!!D.dip[n]),'dp',names) + (D.ver==='75'? bnc(1180,228,D.on,'inp','AES INPUT (75 Ω BNC) — click to connect/disconnect',46) : phx(1180,228,D.on,'inp','AES INPUT (110 Ω, + − G) — click'))
    + iec(1362,30,1600,250);
  return panelSVG(PREFIX,'rear',{over},'POD11A rear panel (real silkscreen)'); }
function bindPanel(root){ const names=['BS1','BS0','CAL1','CAL0']; root.querySelectorAll('.dp').forEach(g=>g.onclick=()=>A.dip(names[+g.dataset.i])); root.querySelectorAll('.inp').forEach(g=>g.onclick=()=>A.plug()); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Programme <select id="pg">${[['tone','steady tone'],['bursts','120 ms bursts'],['step','tone starts at 200 ms'],['speech','speech-like envelope']].map(([v,l])=>`<option value="${v}" ${v===D.sig.prog?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Level <input id="lv" type="number" step="1" value="${D.sig.dbfs}" style="width:56px"> dBFS</label><label>R offset <input id="ro" type="number" step="1" value="${D.sig.rOff}" style="width:50px"> dB</label>
  <label>R phase <select id="ph">${[0,45,90,135,180].map(p=>`<option ${p===D.sig.phase?'selected':''}>${p}</option>`).join('')}</select>°</label>
  <label>Rear <select id="vr"><option value="75" ${D.ver==='75'?'selected':''}>75 Ω (BNC)</option><option value="110" ${D.ver==='110'?'selected':''}>110 Ω (Phoenix)</option></select></label></div>
  <div class="small muted">Click the rear DIP levers (BS1 peak hold, BS0 PPM type, CAL1/CAL0 reference) and the input connector. Press Play or scrub: the bars move with the real time constants. Keys 1–4 flip the DIP switches.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if(!g('#pg')) return;
  g('#pg').onchange=e=>A.set('prog',e.target.value,'Programme → '+e.target.selectedOptions[0].text); g('#lv').onchange=e=>A.set('dbfs',Math.min(0,+e.target.value),'Level → '+e.target.value+' dBFS');
  g('#ro').onchange=e=>A.set('rOff',+e.target.value,'R offset → '+e.target.value+' dB'); g('#ph').onchange=e=>A.set('phase',+e.target.value,'R phase → '+e.target.value+'°'); g('#vr').onchange=e=>A.ver(e.target.value); }
bindKeys('__pod11aActive', ()=>({'1':()=>A.dip('BS1'),'2':()=>A.dip('BS0'),'3':()=>A.dip('CAL1'),'4':()=>A.dip('CAL0')}));
/* ---------------- timeline ---------------- */
function dbLane(label, fn, color){ return { label, h:46, draw(c,X,t0,t1,y,h){ const Y=v=>y+4+(1-(clamp(v,-60,20)+60)/80)*(h-8);
  c.strokeStyle=SIM.css('--grid'); [-40,-20,0].forEach(v=>{ c.beginPath(); c.moveTo(X(t0),Y(v)); c.lineTo(X(t1),Y(v)); c.stroke(); });
  c.fillStyle=SIM.css('--ink2'); c.font='9px sans-serif'; c.fillText('0',X(t0)+2,Y(0)-1); c.fillText('−20',X(t0)+2,Y(-20)-1);
  c.strokeStyle=color; c.lineWidth=1.5; c.beginPath(); const N=Math.min(800,(X(t1)-X(t0))); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=fn(tt); i?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); } c.stroke(); }}; }
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), r=SIM.css('--bad');
  return [
    {label:'AES3 frames / SPORT0 IRQ (48 kHz)', h:22, draw(c,X,t0,t1,y,h){ if(!D.on) return; SIM.pulses(c,X,t0,t1,y,h,1/FS0,0,0.2/FS0,b,'samples → VUMeterCalc'); }},
    waveLane('Input L (samples)', t=>locked(t)?sample(0,t):0, -0.01, null, b, 34, Object.assign(t=>locked(t)?amp(0,t):0,{dense:(s,pw)=>s*D.sig.f>pw/3})),
    dbLane('VU L (dB re CAL)', t=>locked(t)?rel(meter(0,t).vu):-60, a),
    dbLane('PPM L (dB re CAL)', t=>locked(t)?rel(meter(0,t).ppm):-60, wn),
    dbLane(`Peak L ${peakHold()?'(hold ON)':'(type '+ppmType()+' decay)'}`, t=>locked(t)?rel(meter(0,t).pk):-60, r),
    {label:'Lit segments L / R (of 57)', h:24, draw(c,X,t0,t1,y,h){ c.font='10px '+SIM.css('--mono'); const N=Math.min(300,(X(t1)-X(t0))/2);
      for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N; [0,1].forEach(ch=>{ const n=locked(tt)?litCount(rel(meter(ch,tt).vu)):0; c.fillStyle=ch?b:a; c.fillRect(X(t0+(t1-t0)*i/N), y+2+ch*10, (X(t1)-X(t0))/N+0.5, 8*n/57+0.5); }); } }},
    {label:'Phase meter (PhaseMeterGet)', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); const pc=phaseCode((t0+t1)/2); c.fillText(`${pc} → ${pc===128?'no valid signal / 50 %':pc>128?'in phase '+Math.round((pc-128)/127*100)+' %':'out of phase '+Math.round((128-pc)/128*100)+' %'}`, X(t0)+6, y+15); }},
    boolLane('LOCK (green)', t=>locked(t), '#3fbf5f'), boolLane('ERROR (red)', t=>!locked(t), '#e3453a'),
  ]; }
/* ---------------- views ---------------- */
function nowTable(t){ const m0=meter(0,t), m1=meter(1,t); return `<table class="kv"><tr><th>CAL reference</th><td class="mono">${calRef()} dBFS = scale 0 · top (+20) = ${calRef()+20} dBFS</td></tr>
  <tr><th>L: VU / PPM / peak</th><td class="mono">${fdb(rel(m0.vu))} / ${fdb(rel(m0.ppm))} / ${fdb(rel(m0.pk))} dB · ${litCount(rel(m0.vu))} segments</td></tr><tr><th>R: VU / PPM / peak</th><td class="mono">${fdb(rel(m1.vu))} / ${fdb(rel(m1.ppm))} / ${fdb(rel(m1.pk))} dB</td></tr>
  <tr><th>Peak hold / PPM type</th><td class="mono">${peakHold()?'ON':'OFF'} / type ${ppmType()}</td></tr><tr><th>Phase</th><td class="mono">${phaseCode(t)} (${corr(t)===null?'—':corr(t).toFixed(2)})</td></tr></table>`; }
function viewSim(m){ window.__pod11aActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead — press Play to watch the ballistics',`<div id="fp"></div>${controlsHTML()}`)}${card('Rear panel — DIP switches and input',`<div id="rp"></div>`)}</div>
   <div>${card('What the meter did (last action)',`<div id="trace" class="log"></div>`)}${card('Readings at the playhead',`<div id="now"></div>`)}</div></div>
   ${card('Timeline — one second, zoomable: VU, PPM and peak detectors on the left channel',`<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Scope: one AES3 input frame at the playhead',`<canvas id="sc"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Flip a rear DIP switch or change the programme.'); m.querySelector('#now').innerHTML=nowTable(t);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200});
    const n=Math.floor(t*FS0), s0=locked(t)?sample(0,t):0, s1=locked(t)?sample(1,t):0;
    drawAesScope(m.querySelector('#sc'), aesSubframe(s0,n%192===0?'Z':'X',n%192,FS0), aesSubframe(s1,'Y',n%192,FS0), FS0, D.on?1:0.05, `frame ${n.toLocaleString()} ·`); };
  bindControls(m); SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD11A', body:`<p>The front reads “POD-11A STEREO LOUDNESS METER”. It has two 57-segment bars on a scale from 52 to +20, labelled <b>VU RANGE</b> and <b>PEAK RANGE</b>, a vertical <b>PHASE</b> meter from −1 to +1, and <b>LOCK</b>/<b>ERROR</b> tallies. The rear has one AES input (75 Ω BNC or 110 Ω Phoenix), mains, and a 4-way DIP switch whose legend is printed beside it.</p><p class="muted">No POD11A manual or circuit is archived. The meter maths follows the SLM-1 DSP code in the POD3A folder (${inf}).</p>`, check:()=>true, auto:true},
  {title:'1 · Set the reference', body:`<p>The rear table: CAL1/CAL0 ON/ON = −20 dBFS, OFF/ON = −18, ON/OFF = −16, OFF/OFF = −14. The chosen level reads <b>0</b> on the scale. Set <b>−18 dBFS</b> (EBU).</p>`, check:()=>calRef()===-18, hint:'Click the CAL1 lever (third) to OFF.'},
  {title:'2 · Line-up tone', body:`<p>Choose <b>steady tone</b> at <b>−18 dBFS</b>. Press Play. Both bars settle at 0: the VU bar rises in about 0.3 s, the peak dot at once.</p>`, check:()=>D.sig.prog==='tone'&&D.sig.dbfs===-18&&calRef()===-18, hint:'Programme → steady tone; Level −18.'},
  {title:'3 · Bursts show the ballistics', body:`<p>Choose <b>120 ms bursts</b> at −10 dBFS. On the timeline the VU detector (green) never reaches the burst level, the PPM (orange) nearly does (attack ≈ ${(T40(TC.PPM_A)*1000/4).toFixed(0)} ms per 10 dB), and the peak (red) catches it fully.</p>`, check:()=>D.sig.prog==='bursts'&&D.sig.dbfs===-10, hint:'Programme → 120 ms bursts; Level −10.'},
  {title:'4 · Peak hold and PPM type', body:`<p>Flip <b>BS1</b> to ON (PEAK HOLD ON): the peak dot stays at the highest level. Flip it back and change <b>BS0</b>: type 1 falls in “1 second”, type 2 in “3 seconds” (the comments in slm-1-main.asm).</p>`, check:()=>D.log.some(e=>e.name==='Rear DIP BS1 → ON')&&D.log.some(e=>e.name.startsWith('Rear DIP BS0')), hint:'Click the first and second DIP levers.'},
  {title:'5 · Check the phase', body:`<p>Set R phase to <b>180°</b>: the phase column drops to −1, which means a mono sum would cancel. At 90° it sits at 0.</p>`, check:()=>D.sig.phase===180, hint:'R phase → 180.'},
  {title:'6 · Lose the input', body:`<p>Click the rear input to disconnect it. LOCK goes out, ERROR lights, and the bars fall back.</p>`, check:()=>!D.on, hint:'Click the BNC/Phoenix on the rear.'},
  {title:'Done', body:`<p>See <b>Findings</b> for the CAL settings that leave the top segments unreachable.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod11aActive=true; tutorialView(m,{title:'Tutorial — reading a POD11A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${nowTable(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod11aActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the DSP at the playhead',`<div id="dev"></div>`)}${card('As seen by the display',`<div id="fp"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    const rows=[['AES3 frames = samples per channel','48,000',SIM.fmtDur(1/FS0),'SPORT0 DMA; VUMeterCalc runs once per sample'],['VU detector', '—', `40 dB in ${T40(TC.VU).toFixed(2)} s`, `TCONST_VU = ${TC.VU} (VU_48 = 0.0003836906 in slm-1-main.asm)`],
      ['PPM attack','—',`40 dB in ${(T40(TC.PPM_A)*1000).toFixed(1)} ms`,`TCONST_PPM_ATTACK = ${TC.PPM_A}`],['PPM decay','—',`40 dB in ${T40(TC.PPM_D).toFixed(2)} s`,`TCONST_PPM_DECAY = ${TC.PPM_D}`],
      ['Peak decay, type 1','—',`40 dB in ${T40(TC.PK_D1).toFixed(2)} s`,'peak_decay_2_48 “type1 (1 second)”'],['Peak decay, type 2','—',`40 dB in ${T40(TC.PK_D2).toFixed(2)} s`,'peak_decay_1_48 “type2 (3 seconds)”'],
      ['Display refresh','≈ 100 ('+inf+')','10 ms','MM5450 LED-driver shift-out in the SLM-1 code']];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period / time</th><th>source</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">The constants are per-sample IIR coefficients, as in the code comment: tconst = 1 − 10^(−40/(10·time·FS)). “time” is how long the detector takes to move 40 dB.</p>`;
    m.querySelector('#dev').innerHTML=nowTable(t)+`<p class="small mono">sample ${Math.floor(t*FS0).toLocaleString()} · L = ${sample(0,t).toFixed(5)} · R = ${sample(1,t).toFixed(5)}</p>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:20,y:30,w:180,h:80,t:'AES input',s:['75 Ω BNC or 110 Ω Phoenix','receiver → LOCK/ERROR'],d:'Two rear versions (photos “Rear 75” and “Rear 110”). The SLM-1 code has a CS8427 transceiver option (cs8427_ctl_dat.dat). The receiver here is inferred.'},
  dsp:{x:250,y:30,w:200,h:110,t:'ADSP-21065L “SLM-1”',s:['VUMeterCalc every sample','VU / PPM / PEAK detectors','PhaseMeterCalc','dB → segment tables'],d:'POD3A folder, sharc/working v101 (VisualDSP++ 3.5). Its options match POD11A’s rear legend. Inferred to be POD11A’s DSP.'},
  dip:{x:20,y:160,w:180,h:80,t:'Rear DIP',s:['BS1 peak hold, BS0 PPM type','CAL1/CAL0: −20 … −14 dBFS'],d:'Legend printed on the rear silk.'},
  led:{x:500,y:30,w:180,h:110,t:'LED drivers',s:['2 × 57 bar segments','11 phase LEDs','LOCK / ERROR'],d:'SLM-1 shifts data out to MM5450 drivers (28 segments, +14 to −38 in that design). POD11A has 57 points per bar, so the driver count differs (inferred).'},
  ps:{x:250,y:180,w:200,h:60,t:'Power',s:['90–230 VAC, ½ A.S.B.'],d:'Rear silk. No front power switch.'},
};
const WIRES=[['in','dsp','I²S'],['dip','dsp',''],['dsp','led','serial'],['ps','dsp','']];
function viewBlock(m){ window.__pod11aActive=false; blockView(m,BLOCKS,WIRES,'dsp',[700,270],card('In one sentence',`<p>An AES receiver hands each sample to a SHARC DSP, which runs VU, PPM and peak detectors and a phase correlator, then lights 2 × 57 bar segments and an 11-LED phase column.</p>`)); }
const SHEETS=[
  {name:'1 · Meter algorithm (vumeter.asm)', note:'Redrawn from the comments and constants of vumeter.asm / slm-1-main.asm (SLM-1, POD3A folder). Hardware pins are not archived for POD11A.', svg:()=>
    txt(40,50,'Per sample (48 kHz):',13)+txt(60,80,'VU   = VU  + (in² − VU)·Tvu            Tvu = '+TC.VU,12)+txt(60,105,'PPM  = PPM + (in² − PPM)·Tppm         Tppm = '+TC.PPM_A+' (rising) / '+TC.PPM_D+' (falling)',12)
    +txt(60,130,'PEAK = max(PEAK, in²); decays by peak_decay_1/2 unless PEAK HOLD',12)+txt(60,160,'dB = (10/ln10)·ln(x)   (TEN_DIV_LN10 = 4.342944819) → segment table (sdm/slm1_vu_data, pk_data)',12)
    +txt(40,210,'Calibration: meter_cal = −6 “= −20dBFS”; the rear CAL switches move the 0 point by 2 dB steps.',12)
    +txt(40,250,'Phase: PhaseMeterGet → 0–127 out of phase, 128 = 50 % or no signal, 129–255 in phase.',12)
    +chip(560,300,160,'ADSP-21065L',[['SPORT0 RX','AES receiver'],['FLAG/IO','DIP switches']],[['serial','LED drivers']],'SLM-1 (inferred for POD11A)')},
];
function viewSchem(m){ window.__pod11aActive=false; schemView(m,SHEETS,'POD11A','There is no POD11A schematic in the archive. This sheet shows the metering maths from the related SLM-1 source and labels the hardware as inferred.'); }
function viewSoft(m){ window.__pod11aActive=true;
  m.innerHTML=`<div class="grid2">${card('Per-sample code path (SLM-1 v101)',`<div id="f"></div>`)}${card('Ballistics, step response (computed from the constants)',`<canvas id="br"></canvas>`)}</div>${card('DIP → code',`<div id="dp"></div>`)}`;
  const draw=()=>{ m.querySelector('#f').innerHTML=flowSVG([{t:'SPORT0 IRQ',s:['1 stereo pair']},{t:'VUMeterCalc',s:['VU, PPM, PEAK']},{t:'PhaseMeterCalc',s:['L·R correlation']},{t:'VUMeterGet',s:['dB → segment']},{t:'LED shift-out',s:['bars + phase']}],1);
    const {c,w}=SIM.canvas(m.querySelector('#br'),200); const dt=0.002, X=t=>40+t/1.5*(w-50), Y=d=>10+(-d)/45*170;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; [0,-10,-20,-30,-40].forEach(d=>{ c.beginPath(); c.moveTo(40,Y(d)); c.lineTo(w-10,Y(d)); c.stroke(); c.fillText(d+' dB',2,Y(d)+3); }); [0,0.5,1,1.5].forEach(s=>c.fillText(s+' s',X(s)-6,196));
    const curves=[[TC.VU,TC.VU,SIM.css('--accent'),'VU',0.5],[TC.PPM_A,TC.PPM_D,SIM.css('--warn'),'PPM',1],[1,TC.PK_D1,SIM.css('--bad'),'peak t1',1],[1,TC.PK_D2,'#c06','peak t2',1]];
    curves.forEach(([ta,td,col,lb,scale])=>{ let x=0; c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); for(let t=0;t<=1.5;t+=dt){ const sq=t<0.5?1:0, aa=1-Math.pow(1-ta,FS0*dt), ad=1-Math.pow(1-td,FS0*dt); x += ((lb==='VU'?sq/2:sq)-x)*(sq>x?aa:ad); const d=Math.max(-45,10*Math.log10(Math.max((lb==='VU'?2*x:x),1e-9))); t?c.lineTo(X(t),Y(d)):c.moveTo(X(t),Y(d)); } c.stroke(); c.fillStyle=col; c.fillText(lb, X(1.2), Y(lb==='VU'?-40:lb==='PPM'?-25:lb==='peak t1'?-38:-18)); });
    c.fillStyle=SIM.css('--ink2'); c.fillText('0 dBFS tone for 0.5 s, then silence',X(0.55),20);
    m.querySelector('#dp').innerHTML=`<table class="kv"><tr><th>Switch</th><th>Legend</th><th>Now</th><th>Code</th></tr><tr><td>BS1</td><td>PEAK HOLD OFF = ON / ON = OFF ¹</td><td class="mono">${D.dip.BS1?'ON':'OFF'}</td><td class="small mono">TCONST_PEAK_DECAY 0.0 (hold) or peak_decay_x</td></tr>
      <tr><td>BS0</td><td>PPM TYPE 2 = ON, TYPE 1 = OFF</td><td class="mono">${D.dip.BS0?'ON':'OFF'}</td><td class="small mono">peak_decay_1 (type 2, 3 s) / peak_decay_2 (type 1, 1 s)</td></tr>
      <tr><td>CAL1, CAL0</td><td>−20 ON ON · −18 OFF ON · −16 ON OFF · −14 OFF OFF</td><td class="mono">${D.dip.CAL1?'ON':'OFF'}, ${D.dip.CAL0?'ON':'OFF'} = ${calRef()} dBFS</td><td class="small mono">meter_cal (“-6=-20dBFS”)</td></tr></table>
      <p class="small muted">¹ The silk literally reads “PEAK HOLD OFF | ON” and “PEAK HOLD ON | OFF” under BS1, so the hold is on when BS1 is OFF. This model follows the more natural reading (ON = hold) and flags the ambiguity in Findings.</p>`; };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod11aActive=false;
  m.innerHTML=card('What the POD11A archive shows — findings',`<ol>
   <li><b>The POD11A's maths is probably in another folder.</b> POD11A has no electronics files. The “SLM-1” (Stereo Loudness Meter) ADSP-21065L project filed under POD3A has a VU/PPM/PEAK meter with peak hold, PPM type 1/2 and a −20 dBFS calibration default, plus a phase meter. These are exactly the options on POD11A's rear legend. The README of POD3A already doubts that the code belongs to the analog POD3A (${inf}: it is POD11A's family).</li>
   <li><b>Three CAL settings leave the top of the scale unreachable.</b> The scale tops out at +20 above the reference. Only the −20 dBFS setting puts +20 at 0 dBFS. At −18, −16 and −14 dBFS the top 2, 4 and 6 segments would mean +2, +4 and +6 dBFS, which AES audio cannot reach. Try it: set CAL to −14 and send a 0 dBFS tone.</li>
   <li><b>The BS1 legend is ambiguous.</b> The rear table reads “BS1 … PEAK HOLD OFF  ON” and “PEAK HOLD ON  OFF”, so peak hold is ON when the switch is OFF. That is the reverse of BS0's “PPM TYPE 2 ON”.</li>
   <li><b>“Loudness” here means VU and PPM, not LKFS.</b> The SLM-1 maths is VU integration plus PPM attack/decay on in². It has no K-weighting or gating (ITU-R BS.1770). The product name predates that use of the word.</li>
   <li><b>The time constants were tuned by hand.</b> vumeter.asm keeps three earlier values in comments (TCONST_VU 0.000319752, 0.0003836906, 0.000639402; PPM attack 0.02276277, 0.009548227, 0.000719299). slm-1-main.asm uses VU_48 = 0.0003836906, which differs from vumeter.asm's 0.0003541811. Which one wins depends on the init path (${inf}: the main file's table).</li>
   <li><b>The sample rate is measured, not configured.</b> slm-1-main.asm keeps <span class="mono">emuclk_prev[3]</span> “to calculate sample rate” and has separate constants for 32, 44.1, 48 and 96 kHz, with a note “44100=1115 -1118 max”.</li>
   <li><b>The SLM-1 code drives 28-segment MM5450 bars (+14 … −38), but POD11A has 57 points.</b> So the POD11A firmware must have its own segment tables (${inf}).</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>The SLM-1 constants at 48 kHz drive the model; the detectors are run at 0.25 ms steps using the per-sample coefficients raised to the step length.</li><li>The bar shows VU and the single dot shows the peak detector (held, or decaying at the type 1/2 rate). Segment colours come from the photo. Lock time 20 ms. ERROR = no lock (all ${inf}).</li><li>DIP BS1 ON = peak hold (see finding 3).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD11A - #ARTWORK #DA #2016/POD11A-FRONT&amp;REAR-SILK(CURVE).pdf · Pics/POD11A Front.jpg, Rear 75.jpg, Rear 110.jpg</li><li>../POD3A - #Master/POD3A - #Engineering/sharc/working v101/vumeter.asm · slm-1-main.asm · phasemeter.asm</li><li>../POD3A - #Master/POD3A - #Engineering/README.md</li></ul>`); }
SIM.register({
  id:'pod11a', name:'POD11A · stereo loudness meter, VU/PPM LED bars + phase (2014|47)', duration:1, product:'POD11A', year:2014, family:'POD series', folder:'#POD #SERIES/POD11A - #Master',
  summary:'Half-rack AES-input stereo meter with two 57-segment bars (VU and peak ranges), a phase meter and LOCK/ERROR tallies, set up by a rear DIP switch. Only the panels survive, so the metering uses the SLM-1 SHARC code (VU, PPM, peak, phase) from the POD3A folder; the year comes from the 2014 silk date.',
  highlights:['Real silkscreen panels with live 57-segment bars and a phase column','VU, PPM and peak ballistics from the SLM-1 time constants','Rear DIP: CAL reference, peak hold, PPM type 1/2','CAL settings that make the top segments unreachable'],
  depth:'Hardware model',
  stepUnits:[{label:'10 ms',period:()=>0.01},{label:'1 ms',period:()=>0.001},{label:'1 sample',period:()=>1/FS0},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.5,'500 ms (one burst cycle)'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: reading a POD11A',render:viewTutorial},{id:'second',label:'One second, sample by sample',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (algorithm)',render:viewSchem},{id:'software',label:'Software (SLM-1)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
