/* =====================================================================
   POD24 — Stereo monitor power amplifier (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.

   Sources used (all in this archive, folder #POD #SERIES/POD24 - #Master):
   - POD24 - #Engineering/PCB/POD24iss2.net                         (P-CAD ISS2 netlist: every pin, value and net below)
   - POD24 - #Engineering/MANUAL/POD24MANU.doc / .wpd                (manual: 10 W/channel, gain 17 dB, +21 dBu max in, STEREO mode)
   - POD24 - #ARTWORK #DA #2016/POD24-FRONT&REAR-SILK (CURVE).pdf    (panel silkscreen, Jun 26 2014)
   - POD24 - #Mechanical #DA #2016/POD24-FRONT/REAR ISS 1 (PANEL).pdf, POD24-HEATSINK ISS 1.pdf, POD24-PLATE ISS 1 (MTG.PLATE).pdf
   - TDA2616 behaviour (30 dB internal gain, ~20 kΩ input) is from the part's datasheet, not the archive: marked inferred.
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

const PREFIX='pod24';
const V = { Rin:10000, R47:47500, POT:10000, Rser:20000, RinTDA:20000, Gtda:31.62, Vrail:8, drop:1.5, Zobel:[8.2e-9,10] };
const D = { power:true, powerAt:-1, gen:{L:4, R:4, f:1000}, plug:{L:true,R:true}, lvl:{L:0.6,R:0.6}, stereo:true, load:8, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const dB=g=>20*Math.log10(Math.max(g,1e-12));
const railAt=t=>ramp(D.power,D.powerAt,t,V.Vrail,0.01,0.03);
const ampSwing=t=>Math.max(0,railAt(t)-V.drop);
const hc=(v,l)=>clamp(v,-l,l);
/* RV1 = dual 10K log (LEFT knob; section 2 → STEREO net), RV2 = single 10K (RIGHT knob). Wipers drive 47K5 into virtual earths. */
function potG(p){ const a=taper.log(p); return a*V.R47/(V.R47 + a*(1-a)*V.POT); }
const gL=()=>potG(D.lvl.L), gR=()=>potG(D.stereo?D.lvl.L:D.lvl.R);
const tdaG = V.Gtda*V.RinTDA/(V.RinTDA+V.Rser);               // R32/R33 20K into the TDA2616 input (≈ 20 kΩ, inferred) → ×0.5, then 30 dB
const vin=(s,t)=>D.plug[s]?dbu2v(D.gen[s])*Math.SQRT2*Math.sin(2*Math.PI*D.gen.f*t+(s==='R'?0.5:0)):0;
function chain(s,t){ const lim=Math.max(0,railAt(t)-1.5), sw=ampSwing(t);
  const rx=hc(vin(s,t),lim);                                  // U1 (L) / U3 (R): balanced receiver, unity
  const pot=(s==='L'?gL():gR())*rx;
  const m=hc(-pot,lim), p=hc(pot,lim);                        // U2/U4: LEFT−/LEFT+ (RIGHT−/RIGHT+)
  const a1=hc(tdaG*p,sw), a2=hc(tdaG*m,sw);                   // the two halves of one TDA2616, bridged
  return { rx, pot, p, m, a1, a2, spk:a1-a2 }; }
function levels(s){ const on=D.plug[s]&&D.power, inL=on?D.gen[s]:-200, g=s==='L'?gL():gR(), clipDiff=v2dbu(2*(V.Vrail-V.drop)/Math.SQRT2);
  const pot=inL+dB(g), out=pot+dB(2*tdaG), P = out<-150?0:Math.pow(dbu2v(out),2)/D.load;
  return { out, P, clip: out>clipDiff+0.01, stages:[
    {name:`${s==='L'?'LEFT':'RIGHT'} XLR → U${s==='L'?1:3} receiver`, lvl:inL, gain:0, clip:v2dbu((V.Vrail-1.5)/Math.SQRT2), note:'R1/R2 (R15/R4) 10K to virtual earths, 68 µ… 33 µF coupling'},
    {name:`${s==='L'?'RV1 section 1':D.stereo?'RV1 section 2 (STEREO)':'RV2'} → U${s==='L'?2:4}`, lvl:pot, gain:dB(g), clip:v2dbu((V.Vrail-1.5)/Math.SQRT2), note:'47K5/47K5 inverting + unity inverter → ± drive'},
    {name:`TDA2616 U${s==='L'?13:22} bridged → speaker`, lvl:out, gain:dB(2*tdaG), clip:clipDiff, note:`20K series, 30 dB per half (${inf}); ${(P).toFixed(2)} W into ${D.load} Ω`}] }; }
const act=makeActor(D,()=>`L ${levels('L').P.toFixed(2)} W · R ${levels('R').P.toFixed(2)} W into ${D.load} Ω`);
const A={
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t; tr('ACIN1 → F1 → PWRSW → PWROUT → off-board transformer/rectifier → DCIN (±VA) on the board ('+inf+')'); tr('R14 750R + D1 1N751A → +5V for U7 74HC4053; R27 1K → PWRLED'); } else tr('±VA collapse'); }); },
  lvl(s,dir){ act(`Turn ${s==='L'?'LEFT':'RIGHT'} ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{ D.lvl[s]=clamp(+(D.lvl[s]+dir*0.04).toFixed(3),0,1);
    if (s==='L') tr(`RV1 (dual 10K log): section 1 → R10 47K5 → U2A (left)${D.stereo?'; section 2 → R23 47K5 → STEREO → U7 X0 → RIGHT_AUDIO: the right channel follows':' ; section 2 is parked on U7 X1 (GND)'}`);
    else tr(D.stereo?'RV2 → R20 → RIGHT net, but U7 Y0 grounds it in STEREO mode: this knob does nothing now':'RV2 → R20 47K5 → RIGHT → U7 Y1 → RIGHT_AUDIO (U4A)');
    tr(`Left ${fdb(levels('L').out)} dBu (${levels('L').P.toFixed(2)} W) · right ${fdb(levels('R').out)} dBu (${levels('R').P.toFixed(2)} W)`); }); },
  mode(){ act(`Mode switch → ${D.stereo?'LEFT / RIGHT':'STEREO'}`, tr=>{ D.stereo=!D.stereo;
    tr(`SW1 ${D.stereo?'closes: U7 select (pins 10/11) to GND':'opens: R24 1K pulls U7 select to +5V'}`);
    tr(D.stereo?'U7 X: STEREO (RV1 section 2) → RIGHT_AUDIO; Y: RIGHT (RV2) → GND. The LEFT knob sets both channels.':'U7 X: STEREO → GND; Y: RIGHT (RV2) → RIGHT_AUDIO. Each knob sets its own channel.'); }); },
  plug(s){ act(`${D.plug[s]?'Unplug':'Plug in'} ${s==='L'?'LEFT':'RIGHT'} input`, tr=>{ D.plug[s]=!D.plug[s]; tr(`XLR${s==='L'?2:1} (NC3FD-H) pins 2/3 → U${s==='L'?1:3}`); }); },
  set(k,v,l){ act(l,tr=>{ if(k==='load') D.load=v; else D.gen[k]=v; tr('Source or load changed'); }); },
  reset(){ Object.assign(D,JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
function toggle(x,y,up,cls,title){ return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="24" fill="#b9bcbf" stroke="#6b6f73" stroke-width="3"/><circle cx="${x}" cy="${y}" r="10" fill="#555"/><line x1="${x}" y1="${y}" x2="${x}" y2="${up?y-48:y+48}" stroke="#d9dcdf" stroke-width="10" stroke-linecap="round"/></g>`; }
function frontSVG(t){ const over=rocker(D.power)+pled(D.power&&railAt(t)>4)+trim(980,210,D.lvl.L,'lv-L','LEFT (RV1 dual 10K)')+toggle(1179,218,D.stereo,'sw','STEREO / LEFT-RIGHT switch (SW1) — click')+trim(1380,210,D.lvl.R,'lv-R','RIGHT (RV2 10K)');
  return panelSVG(PREFIX,'front',{over},'POD24 front panel (real silkscreen)'); }
function spk(x,y,col,title,live){ return `<g><title>${title}</title><rect x="${x-34}" y="${y-48}" width="68" height="96" rx="6" fill="${col}" stroke="#222" stroke-width="2"/><rect x="${x-14}" y="${y-30}" width="28" height="20" fill="#111"/><circle cx="${x}" cy="${y+20}" r="9" fill="#ddd"/>${live?`<rect x="${x-30}" y="${y-44}" width="60" height="6" fill="var(--accent)"/>`:''}</g>`; }
function rearSVG(t){ const live=s=>D.power&&levels(s).out>-60;
  const over=xlr(269,156,false,D.plug.L,'pl-L','LEFT input (XLR-F) — click')+xlr(529,156,false,D.plug.R,'pl-R','RIGHT input (XLR-F) — click')
    +`<rect x="720" y="92" width="430" height="120" rx="8" fill="#151617" stroke="#333"/>`+spk(770,152,'#c8312a','LEFT + (U13 pin 4)',live('L'))+spk(880,152,'#222','LEFT − (U13 pin 6)',live('L'))+spk(990,152,'#222','RIGHT − (U22 pin 6)',live('R'))+spk(1100,152,'#c8312a','RIGHT + (U22 pin 4)',live('R'))
    +iec(1421,84,1647,250);
  return panelSVG(PREFIX,'rear',{over},'POD24 rear panel (real silkscreen)'); }
function bindPanel(r){ const p=r.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); ['L','R'].forEach(s=>{ bindTrim(r,'lv-'+s,d=>A.lvl(s,d)); r.querySelectorAll('.pl-'+s).forEach(g=>g.onclick=()=>A.plug(s)); }); r.querySelectorAll('.sw').forEach(g=>g.onclick=()=>A.mode()); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px"><label>Left source <input id="gl" type="number" value="${D.gen.L}" style="width:52px"> dBu</label><label>Right source <input id="gr" type="number" value="${D.gen.R}" style="width:52px"> dBu</label>
  <label>Tone <select id="gF">${[100,1000,10000].map(f=>`<option ${f===D.gen.f?'selected':''}>${f}</option>`).join('')}</select> Hz</label><label>Speakers <select id="ld">${[16,8,4].map(v=>`<option ${v===D.load?'selected':''}>${v}</option>`).join('')}</select> Ω</label></div>
  <div class="small muted" style="margin-top:4px">Click a trim's halves (or wheel) to turn it; click the mode lever and the XLRs. Keys Q/W LEFT, E/R RIGHT, S = mode.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#gl')) return; g('#gl').onchange=e=>A.set('L',+e.target.value,'Left source → '+e.target.value+' dBu'); g('#gr').onchange=e=>A.set('R',+e.target.value,'Right source → '+e.target.value+' dBu'); g('#gF').onchange=e=>A.set('f',+e.target.value,'Tone → '+e.target.value+' Hz'); g('#ld').onchange=e=>A.set('load',+e.target.value,'Speakers → '+e.target.value+' Ω'); }
bindKeys('__pod24Active',()=>({q:()=>A.lvl('L',-1),w:()=>A.lvl('L',1),e:()=>A.lvl('R',-1),r:()=>A.lvl('R',1),s:()=>A.mode()}));
const dense=(s,pw)=>s*D.gen.f>pw/3;
const envOf=fn=>{ const e=t=>{ let m=0; const P=1/D.gen.f; for(let i=0;i<8;i++) m=Math.max(m,Math.abs(fn(t+P*i/8))); return m; }; e.dense=dense; return e; };
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), r=SIM.css('--bad'), wn=SIM.css('--warn');
  return [ waveLane('±VA (DCIN)', t=>railAt(t), 10, null, wn, 24), boolLane('U7 select = STEREO', t=>D.stereo, '#e8b23a'),
    waveLane('LEFT XLR in', t=>vin('L',t), -0.05, null, b, 30, envOf(t=>vin('L',t))),
    waveLane('LEFT+ (U2B)', t=>chain('L',t).p, -0.05, null, a, 30, envOf(t=>chain('L',t).p)),
    waveLane('U13 pin 4 (half 1)', t=>chain('L',t).a1, -0.5, ampSwing(1), r, 32, envOf(t=>chain('L',t).a1)),
    waveLane('U13 pin 6 (half 2)', t=>chain('L',t).a2, -0.5, ampSwing(1), r, 32, envOf(t=>chain('L',t).a2)),
    waveLane('LEFT speaker (pin 4 − pin 6)', t=>chain('L',t).spk, -0.5, 2*ampSwing(1), r, 40, envOf(t=>chain('L',t).spk)),
    waveLane('RIGHT speaker', t=>chain('R',t).spk, -0.5, 2*ampSwing(1), a, 36, envOf(t=>chain('R',t).spk)) ]; }
function nowHTML(t){ const row=s=>{ const l=levels(s); return `<tr><th>${s==='L'?'LEFT':'RIGHT'} speaker</th><td class="mono">${l.out<-150?'—':fdb(l.out)+' dBu'} · ${l.P.toFixed(2)} W ${l.clip?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>`; };
  return `<table class="kv">${row('L')}${row('R')}<tr><th>Mode</th><td class="mono">${D.stereo?'STEREO (LEFT knob sets both)':'LEFT / RIGHT'}</td></tr><tr><th>Max before clip</th><td class="mono">${(Math.pow(2*(V.Vrail-V.drop),2)/2/D.load).toFixed(1)} W into ${D.load} Ω</td></tr></table>`; }
function levelsHTML(){ return `<h3>LEFT</h3>${stageTable(levels('L').stages)}<details><summary class="small">RIGHT</summary>${stageTable(levels('R').stages)}</details><p class="small muted">±VA = ±${V.Vrail} V and 1.5 V output drop are ${inf} (chosen so clipping lands at the manual's 10 W into 8 Ω); the DC supply is off-board.</p>`; }
const viewSim=simView({flag:'__pod24Active',D,front:frontSVG,rear:rearSVG,bind:bindPanel,controls:controlsHTML,bindControls,now:nowHTML,levels:levelsHTML,lanes,labelW:200,nowTitle:'Speakers now',hint:'Turn LEFT or RIGHT, flip the mode lever or plug an input.'});
const LESSONS=[
  {title:'Meet the POD24', body:'<p>POD24 is a <b>10 W stereo monitor amplifier</b>. Balanced XLR inputs; bridged outputs on quick-release speaker terminals (“DIFFERENTIAL OUTPUTS” — neither terminal may go to ground). Front: LEFT and RIGHT screwdriver level trims and a STEREO / LEFT-RIGHT lever.</p>', check:()=>true, auto:true},
  {title:'1 · Power', body:'<p>Switch on.</p>', check:()=>D.power, hint:'Rocker.'},
  {title:'2 · Stereo mode', body:'<p>Put the lever on <b>STEREO</b>: the LEFT trim now sets both channels. Turn LEFT and watch both speaker powers move.</p>', check:()=>D.stereo&&D.log.some(e=>e.name.startsWith('Turn LEFT')), hint:'Click the lever; Q/W.'},
  {title:'3 · 1 W monitoring level', body:'<p>Set both speakers to about <b>1 W</b> (0.8–1.25 W) into 8 Ω with +4 dBu in.</p>', check:()=>D.load===8&&levels('L').P>=0.8&&levels('L').P<=1.25&&levels('R').P>=0.8&&levels('R').P<=1.25, hint:'Q/W.'},
  {title:'4 · Independent levels', body:'<p>Switch to <b>LEFT / RIGHT</b> and turn the RIGHT trim down so the right speaker is at least 6 dB quieter.</p>', check:()=>!D.stereo&&levels('L').out-levels('R').out>=6, hint:'S toggles the lever; E lowers RIGHT.'},
  {title:'5 · Clip it', body:'<p>Set 4 Ω speakers and raise the left source until the left channel clips.</p>', check:()=>levels('L').clip, hint:'Speakers → 4; raise Left source.'},
  {title:'Done', body:'<p>Findings: the manual says “MONO” where the panel says LEFT/RIGHT, and a 12 VA supply for 2 × 10 W.</p>', check:()=>true, auto:true}];
let lessonIdx=0;
function viewTutorial(m){ window.__pod24Active=true; tutorialView(m,{title:'Tutorial — setting up a POD24',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG(SIM.t)}</div>${controlsHTML()}<div style="margin-top:6px">${nowHTML(SIM.t)}</div>`,bind:r=>{bindPanel(r);bindControls(r);}}); }
const viewSecond=secondView({flag:'__pod24Active',front:frontSVG,bind:bindPanel,freq:()=>D.gen.f,ladderLabel:'LEFT speaker',ladderFn:t=>chain('L',t).spk,meterTitle:'Speaker level (dBu across the terminals)',
  ladder:()=>[['1 second',1],['100 ms',0.1],['10 ms',0.01],['1 tone cycle',1/D.gen.f],['50 µs',5e-5]],
  outs:()=>[['LEFT spk',t=>chain('L',t).spk],['RIGHT spk',t=>chain('R',t).spk],['LEFT+ drive',t=>chain('L',t).p]],
  rows:()=>[['Tone cycles',D.gen.f.toLocaleString(),SIM.fmtDur(1/D.gen.f),'continuous'],['Speaker current peak','—',`${(2*(V.Vrail-V.drop)/D.load).toFixed(2)} A max`,`into ${D.load} Ω at clip`],
    ['Zobel (C51 8n2 + R30 10R)','—',SIM.fmtDur(8.2e-9*10),'keeps each TDA2616 half stable into the speaker cable'],['Input coupling (C1 33 µ · 10K)','—',SIM.fmtDur(33e-6*1e4),`−3 dB at ${(1/(2*Math.PI*33e-6*1e4)).toFixed(2)} Hz`],
    ['TDA2616 mute/power-up','—','≈ 10 ms '+inf,'the chip has internal power-up muting (datasheet)']],
  dev:t=>{ const l=chain('L',t); return `<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>Left</th><td class="mono">XLR ${l.rx.toFixed(3)} → wiper ${l.pot.toFixed(3)} → U13 ${l.a1.toFixed(2)} / ${l.a2.toFixed(2)} V → speaker ${l.spk.toFixed(2)} V</td></tr><tr><th>Speaker current</th><td class="mono">${(l.spk/D.load).toFixed(3)} A</td></tr></table>`; }});
const BLOCKS={ inp:{x:20,y:40,w:160,h:80,t:'XLR2 LEFT / XLR1 RIGHT',s:['U1 / U3 NE5532','unity balanced receivers'],d:'10K into virtual earths: 20 kΩ differential (manual: 40 kΩ).'},
  pot:{x:220,y:40,w:170,h:90,t:'RV1 dual · RV2',s:['LEFT knob = RV1 (2 sections)','RIGHT knob = RV2'],d:'TOCOS 10-079 dual 10K log (the POD4 MIX part).'},
  sw:{x:220,y:180,w:170,h:80,t:'U7 74HC4053 + SW1',s:['STEREO: RV1 sec. 2 → right','L/R: RV2 → right'],d:'Selects pulled up by R24 1K; SW1 grounds them.'},
  drv:{x:430,y:100,w:160,h:80,t:'U2 / U4 NE5532',s:['47K5/47K5: −1','10K/10K: +1'],d:'Produce LEFT±/RIGHT± for the bridge.'},
  amp:{x:630,y:100,w:170,h:90,t:'U13 / U22 TDA2616',s:['both halves per channel','bridged, 30 dB each '+'(datasheet)'],d:'Inputs pins 1/9 through R32/R33 (R49/R50) 20K; outputs 4/6 with Zobels to the speaker terminals.'},
  ps:{x:430,y:230,w:160,h:70,t:'DCIN ±VA',s:['off-board supply','R14+D1 → +5V'],d:'ACIN/F1/PWRSW/PWROUT only route mains to an external transformer module (inferred).'} };
const WIRES=[['inp','pot',''],['pot','drv','left'],['pot','sw','STEREO/RIGHT'],['sw','drv','RIGHT_AUDIO'],['drv','amp','±'],['ps','amp','±VA']];
function viewBlock(m){ window.__pod24Active=false; blockView(m,BLOCKS,WIRES,'sw',[820,320],card('In one sentence',`<p>Balanced receivers feed screwdriver level pots; a CMOS switch lets the left pot's second section drive the right channel (STEREO), and each channel's ± drive pair feeds one TDA2616 used as a bridge amplifier.</p>`)); }
const SHEETS=[{name:'1 · Left channel', note:'From POD24iss2.net. Right: XLR1, U3, RV2/RV1-sec2, U7, U4, U22, R49/R50, C62/C63, R47/R48.', svg:()=>
  chip(60,90,120,'U1 NE5532',[['−A (2)','R1 10K ← XLR2-2'],['−B (6)','R2 10K ← XLR2-3, R5']],[['B out (7)','→ RV1-1']],'R3, R5, R6 10K')
  +chip(330,90,120,'RV1 dual 10K',[['1','U1-7'],['3','GNDD']],[['2 (wiper)','→ R10 47K5']],'section 2 → R23 → STEREO')
  +chip(560,90,130,'U2 NE5532',[['−A (2)','R10/R9 47K5'],['−B (6)','R12/R13 10K']],[['A (1)','LEFT−'],['B (7)','LEFT+']],'')
  +chip(330,280,150,'U13 TDA2616',[['IN1 (1)','R33 20K ← LEFT+'],['IN2 (9)','R32 20K ← LEFT−'],['VP/VN (7/5)','±VA']],[['OUT1 (4)','→ spk +, C52/R31'],['OUT2 (6)','→ spk −, C51/R30']],'bridged')},
  {name:'2 · Mode switch', note:'U7 74HC4053: select A/B (11/10) = SW1 with R24 1K pull-up; C (9) and Z unused (GNDD).', svg:()=>
  chip(320,100,160,'U7 74HC4053',[['X (14)','STEREO ← R23 ← RV1-5'],['Y (15)','RIGHT ← R20 ← RV2-2'],['A,B (11,10)','SW1 / R24 1K → +5V']],[['X0 (12)','RIGHT_AUDIO'],['X1 (13)','GNDD'],['Y0 (2)','GNDD'],['Y1 (1)','RIGHT_AUDIO']],'')
  +txt(60,330,'SW1 closed (select 0) = STEREO: X0 connects RV1 section 2 to RIGHT_AUDIO (U4A summing node); Y0 grounds RV2.',11)+txt(60,350,'SW1 open (select 1) = LEFT/RIGHT: Y1 connects RV2 to RIGHT_AUDIO; X1 grounds RV1 section 2.',11)+txt(60,370,'Both switched nodes are 47K5 resistor ends at a virtual earth: the CMOS switch never sees the audio swing.',11)}];
function viewSchem(m){ window.__pod24Active=false; schemView(m,SHEETS,'POD24','The P-CAD originals are POD24iss2.sch/.net (ISS2) and an Altium import of ISS3 in WORKING/. Blue labels are nets.'); }
const viewSoft=softView({flag:'__pod24Active',D,intro:'POD24 has no processor. Click a stage for its maths.',
  flows:[{title:'Left channel',stages:()=>{ const l=levels('L'); return [{t:'LEFT XLR',s:[fdb(l.stages[0].lvl)+' dBu']},{t:'RV1 → U2',s:[fdb(dB(gL()))+' dB']},{t:'TDA2616 bridge',s:[fdb(dB(2*tdaG))+' dB '],bad:l.clip},{t:'Speaker',s:[l.P.toFixed(2)+' W']}]; },
    det:[()=>'<b>Receiver.</b> U1A/U1B 10K/10K: unity, 20 kΩ in.',()=>`<b>Pot.</b> log taper a = ${taper.log(D.lvl.L).toFixed(3)} into 47K5 (U2A), then U2B inverts for the other side.`,()=>`<b>Bridge.</b> each half: ×0.5 (20K into ≈20K, ${inf}) × 31.6 (30 dB, ${inf}); the halves get opposite drive, so the speaker sees ×${(2*tdaG).toFixed(1)}.`,()=>`<b>Speaker.</b> P = V²/R = ${levels('L').P.toFixed(3)} W.`]}],
  chartTitle:'LEFT trim → output power (8 Ω, +4 dBu in)', chart:cv=>curveChart(cv,[{fn:p=>Math.min(12,Math.pow(dbu2v(4)*potG(p)*2*tdaG,2)/8),col:SIM.css('--accent'),label:'W',cur:D.lvl.L}],0,12,' W'),
  buttons:[['LEFT trim','RV1 sec 1 (and sec 2 in STEREO)','Left (both) level'],['RIGHT trim','RV2 → U7 Y1','Right level (L/R mode only)'],['Mode lever','SW1 → U7 selects','STEREO ⇄ LEFT/RIGHT']],
  pins:[['LEFT / RIGHT input (XLR-F)','2 / 3 / 1','XLR2 / XLR1: + / − / GND'],['Speaker terminals','+ − − +','U13-4, U13-6, U22-6, U22-4 (left +, left −, right −, right +)'],['DCIN','1 / 2 / 3','GND / −VA / +VA']]});
const viewNotes=notesView('__pod24Active','What the POD24 archive shows — findings',[
  `<b>The manual says “MONO”, the panel says “LEFT / RIGHT”.</b> POD24MANU.doc: “In the MONO mode the left and right output levels may be adjusted individually.” The silk (and the U7 wiring) make it a stereo-linked vs independent-level switch; nothing makes the amplifier mono.`,
  `<b>12 VA cannot make 2 × 10 W.</b> The manual quotes 10 W/channel and “115V AC/60Hz, 12 VA”. The same 12 VA, 40 kΩ, 60 Ω and 1.27 kg appear in the POD26 manual, so the spec block was copied from a line-level product.`,
  `<b>“Output Impedance 60 Ω” is copied too.</b> A bridged TDA2616 has a fraction of an ohm output impedance; 60 Ω is the POD26 line-output figure.`,
  `<b>The rail voltage cannot satisfy both specs.</b> The receivers (U1/U3) run on the same ±VA as the TDA2616s. Rails low enough to clip at the rated 10 W into 8 Ω (±8 V here) clip the receiver at about +15.5 dBu, below the manual's “Max Input Level +21 dBu”; rails high enough for +21 dBu (≈ ±11 V) would let the bridge make ≈ 18 W. The 10 W figure is probably a thermal/THD rating (${inf}).`,
  `<b>Input impedance is 20 kΩ.</b> R1/R2 10K go to virtual earths (manual: 40 kΩ balanced).`,
  `<b>The board takes DC from outside.</b> The mains only passes through ACIN1, F1, PWRSW and PWROUT on the board; ±VA come in on DCIN. The heatsink and mounting plate drawings (POD24-HEATSINK, POD24-PLATE) carry the TDA2616s and the supply (${inf}).`,
  `<b>The RIGHT trim is dead in STEREO mode.</b> U7's Y0 grounds RV2's resistor end, so turning it changes nothing until the lever goes to LEFT/RIGHT.`,
  `<b>Duplicated folders.</b> <span class="mono">POD24 - #PCB</span>, <span class="mono">#MANUAL</span>, <span class="mono">#MECHANICAL</span> duplicate <span class="mono">PCB</span>, <span class="mono">MANUAL</span>, <span class="mono">MECHANICAL</span>; LEFT_OUT/RIGHT_OUT footprints are DNI (wired off-board).`],
  [`TDA2616: 30 dB per half, ≈20 kΩ input resistance (${inf}, datasheet).`,`±VA = ±${V.Vrail} V, 1.5 V drop (${inf}).`,`Pots log taper (${inf}).`],
  ['POD24 - #Engineering/PCB/POD24iss2.net · POD24iss2.sch · WORKING/ (ISS3 Altium import)','POD24 - #Engineering/MANUAL/POD24MANU.doc','POD24 - #ARTWORK #DA #2016/POD24-FRONT&amp;REAR-SILK (CURVE).pdf','POD24 - #Mechanical #DA #2016/POD24-FRONT ISS 1 · POD24-REAR ISS 1 · POD24-HEATSINK ISS 1 · POD24-PLATE ISS 1']);
SIM.register({ id:'pod24', name:'POD24 · 10 W stereo monitor power amplifier (2014|47)', duration:1, product:'POD24', year:2014, family:'POD series', folder:'#POD #SERIES/POD24 - #Master',
  summary:'Half-rack stereo monitor amplifier: balanced XLR inputs, screwdriver level trims with a STEREO-link lever, and two TDA2616s driving bridged speaker outputs. Modelled from the ISS2 netlist; the year is the panel silk date.',
  highlights:['Real silkscreen panels with trims, mode lever, XLRs and speaker terminals','CMOS mode switch that hands the right channel to the left knob','Bridged TDA2616 outputs with power and clipping','Manual spec block copied from POD26'],
  depth:'Hardware model', stepUnits:[{label:'1 tone cycle',period:()=>1/D.gen.f},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:3, init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: setting up a POD24',render:viewTutorial},{id:'second',label:'One second, cycle by cycle',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}] });

})();
