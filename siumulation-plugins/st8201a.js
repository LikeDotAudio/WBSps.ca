/* =====================================================================
   ST8201A — solder-terminal rear termination for a dual-input MF8200 card (Ward-Beck Systems), engineering folder tagged #PROBLEM
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model of a passive termination board.

   Sources used:
   - #MF8200 #SERIES/XXX - st8201a - #Engineering #PROBLEM/st8201a.net (P-CAD netlist: every terminal and pin below),
       st8201a.ECO (24 Aug 2004 refdes renames S1→INA_N … S18→OUTN8), st8201a.sch(.md: title block “TB8204P PLUGGABLE TEMINATION”, ISS.1),
       st8201aiss1.pcb(.md: P-CAD 2002 binary, library DSBEDA.LIB)
   - #MF8200 #SERIES/TB8201AP - #Engineering #MF82 #TERMINATION/TB8201AP.net (the pluggable sister: identical H1/H2 nets),
       TB8201AP-D8204A-WIRING.sch(.md), TB8201AP-ISS2-RLM24-6; TB8201A - #Engineering…/README.md (INA, INB, OUT 1–4 ×2)
   - siumulation-plugins/m8200-terminations.js and d8204c.js (sister plugins: 8200-series rear modules, TB8201AP labels)
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
/* ---------------- the netlist ---------------- */
// [terminal, net (= card-edge name), header pin]
const NETS = [
  ['INA_N','A','H1-1'],['INA_P','1','H1-2'],['S4','B','H1-3'],['S3 + S23','2','H1-4'],
  ['OUTN1','D','H1-5'],['OUTP1','4','H1-6'],['OUTN2','E','H1-7'],['OUTP2','5','H1-8'],['OUTN3','F','H1-9'],['OUTP3','6','H1-10'],
  ['OUTN4','H','H1-11'],['OUTP4','7','H1-12'],['OUTN5','J','H1-13'],['OUTP5','8','H1-14'],['OUTN6','K','H1-15'],['OUTP6','9','H1-16'],
  ['OUTN7','L','H1-17'],['OUTP7','10','H1-18'],['INB_N','M','H1-19'],['INB_P','11','H1-20'],['OUTN8','N','H2-1'],['OUTP8','12','H2-2']];
const TB8201AP = {A:'INA-2',1:'INA-1',B:'INA-3 + INB-3',2:'TB1-5 + TB2-5',D:'TB2-1',4:'TB1-1',E:'TB2-2',5:'TB1-2',F:'TB2-3',6:'TB1-3',H:'TB2-4',7:'TB1-4',J:'TB2-6',8:'TB1-6',K:'TB2-7',9:'TB1-7',L:'TB2-8',10:'TB1-8',M:'INB-2',11:'INB-1',N:'TB2-9',12:'TB1-9'};
const EDGE = ['1','2','3','4','5','6','7','8','9','10','11','12','A','B','C','D','E','F','H','J','K','L','M','N'];   // 22-way edge naming: letters skip G and I
const D = { srcA:true, srcB:true, h2:true, card:'dual', sel:'OUTP1', fault:null, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const CARDS = { dual:{name:'dual 1 × 4 DA (A → OUT 1–4, B → OUT 5–8)', map:k=>k<=4?'A':'B'}, single:{name:'single input, 8 outputs (A only)', map:()=>'A'} };
const outLive = k => { const src = CARDS[D.card].map(k); if (k===8 && !D.h2) return false; if (D.fault==='swapH1') return false; return src==='A'?D.srcA:D.srcB; };
const termOf = n => NETS.find(r=>r[0]===n);
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`A ${D.srcA?'on':'off'} · B ${D.srcB?'on':'off'} · H2 ${D.h2?'mated':'open'}`);
const A={
  pick(n){ act(`Probe ${n}`, tr=>{ D.sel=n; const r=termOf(n); tr(`${n} → net “${r[1]}” → ${r[2]}`); tr(`On the pluggable sister TB8201AP the same net goes to ${TB8201AP[r[1]]}`);
    if (r[2].startsWith('H2')) tr('Output 8 is the only pair that leaves on the separate 2-pin header H2: the 20-pin H1 is full'); if (r[1]==='B') tr('Net B = input shield common (TB8201AP joins INA-3 and INB-3 here)'); if (r[1]==='2') tr('Net 2 = output ground: S3 and S23 are both on it'); }); },
  src(w){ act(`Input ${w} ${D['src'+w]?'disconnected':'connected'}`, tr=>{ D['src'+w]=!D['src'+w]; tr(w==='A'?'INA_P → net 1 → H1-2, INA_N → net A → H1-1':'INB_P → net 11 → H1-20, INB_N → net M → H1-19'); tr(`Feeds ${CARDS[D.card].name.split('(')[1]?CARDS[D.card].name.split('(')[1].replace(')',''):'all outputs'} (${inf}: card)`); }); },
  h2(){ act(`H2 ${D.h2?'unplugged':'mated'}`, tr=>{ D.h2=!D.h2; tr(D.h2?'H2-1 (N) and H2-2 (12) carry OUT 8':'OUT 8 is dead: H2 carries the only connection for OUTP8/OUTN8'); }); },
  card(k){ act(`Card → ${CARDS[k].name}`, tr=>{ D.card=k; tr('ST8201A only routes nets; what each pin means is set by the card it mates with (TB8201AP serves D8204A, D8204C and D8201A).'); }); },
  fault(f){ act(f?'Mate H1 reversed':'Mate H1 correctly', tr=>{ D.fault=f; tr(f?'A 1 × 20 single-row header has no key: turned round, H1-1 lands on H1-20 — INA on INB, outputs on the wrong legs (inferred hazard)':'Pin 1 to pin 1'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- the board (drawn: the PCB file is binary; proportions inferred) ---------------- */
function boardSVG(){ const W=820, H=330; let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:900px"><rect x="20" y="20" width="${W-40}" height="${H-40}" rx="6" fill="#1d5c3a" stroke="#0e3d24" stroke-width="3"/>
   <text x="36" y="44" font-size="15" fill="#e8f5e9" font-weight="700">ST8201A ISS 1</text><text x="36" y="62" font-size="11" fill="#cfe">WARD-BECK SYSTEMS LTD. · solder terminals (layout inferred)</text>`;
  // terminals: inputs on the left, outputs in two rows (P on top, N below)
  const tp=(x,y,n,lab)=>{ const r=termOf(n), live = n.startsWith('IN') ? (n.includes('A')?D.srcA:D.srcB) : n.startsWith('OUT') ? outLive(+n.slice(-1)) : false, on=D.sel===n;
    return `<g class="tp" data-n="${n}" style="cursor:pointer"><title>${n}: net ${r[1]} → ${r[2]} — click to probe</title><circle cx="${x}" cy="${y}" r="13" fill="#d8d8d8" stroke="${on?'#ffd60a':'#888'}" stroke-width="${on?4:2}"/><circle cx="${x}" cy="${y}" r="5" fill="${live?'#43e06a':'#555'}"/><text x="${x}" y="${y+28}" text-anchor="middle" font-size="10" fill="#fff">${lab||n}</text></g>`; };
  s+=tp(80,120,'INA_P','INA +')+tp(80,175,'INA_N','INA −')+tp(140,147,'S4','S4 (shield)')+tp(80,240,'INB_P','INB +')+tp(80,290-0,'INB_N','INB −');
  for(let k=1;k<=8;k++){ const x=230+(k-1)*62; s+=tp(x,110,'OUTP'+k,'+'+k)+tp(x,165,'OUTN'+k,'−'+k); }
  s+=tp(740,110,'S3 + S23','S3/S23 G');
  // H1 and H2 along the bottom edge (0.1 in pitch)
  s+=`<rect x="200" y="236" width="${20*22+10}" height="30" fill="#111"/><text x="200" y="230" font-size="11" fill="#fff">H1 (1 × 20)</text>`;
  NETS.filter(r=>r[2].startsWith('H1')).forEach(r=>{ const p=+r[2].slice(3), x=210+(D.fault?20-p:p-1)*22; const hot=termOf(D.sel)&&termOf(D.sel)[2]===r[2]; s+=`<rect x="${x-4}" y="244" width="8" height="14" fill="${hot?'#ffd60a':'#d4af37'}"/><text x="${x}" y="282" text-anchor="middle" font-size="9" fill="#fff">${r[1]}</text>`; });
  s+=`<rect x="680" y="236" width="56" height="30" fill="#111"/><text x="680" y="230" font-size="11" fill="#fff">H2 (1 × 2)</text>`+['N','12'].map((n,i)=>`<rect x="${694+i*22}" y="244" width="8" height="14" fill="${D.h2?'#d4af37':'#555'}"/><text x="${698+i*22}" y="282" text-anchor="middle" font-size="9" fill="#fff">${n}</text>`).join('');
  s+=`<g class="h2t" style="cursor:pointer"><title>H2 ${D.h2?'mated (click to unplug)':'not mated (click to mate)'}</title><rect x="676" y="232" width="64" height="38" fill="transparent" stroke="${D.h2?'none':'#ff3b30'}" stroke-dasharray="4 3"/></g>`;
  const r=termOf(D.sel); if(r){ s+=`<text x="36" y="${H-30}" font-size="12" fill="#ffd60a">${D.sel} → net ${r[1]} → ${r[2]} → card edge “${r[1]}” · TB8201AP: ${TB8201AP[r[1]]}</text>`; }
  return s+'</svg>'; }
function bindBoard(r){ r.querySelectorAll('.tp').forEach(g=>g.onclick=()=>A.pick(g.dataset.n)); r.querySelectorAll('.h2t').forEach(g=>g.onclick=()=>A.h2()); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:6px">
  <label><input type="checkbox" id="sa" ${D.srcA?'checked':''}> AES/audio on INA</label><label><input type="checkbox" id="sb" ${D.srcB?'checked':''}> on INB</label>
  <label>Card <select id="cd">${Object.keys(CARDS).map(k=>`<option value="${k}" ${k===D.card?'selected':''}>${CARDS[k].name}</option>`).join('')}</select></label>
  <label><input type="checkbox" id="rv" ${D.fault?'checked':''}> H1 mated reversed</label></div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#sa')) return; g('#sa').onchange=()=>A.src('A'); g('#sb').onchange=()=>A.src('B'); g('#cd').onchange=e=>A.card(e.target.value); g('#rv').onchange=e=>A.fault(e.target.checked?'swapH1':null); }
bindKeys('__st8201aActive', ()=>({a:()=>A.src('A'),b:()=>A.src('B'),h:()=>A.h2()}));
/* ---------------- timeline: what the terminals carry (an AES card assumed) ---------------- */
function biphaseLane(label, liveFn){ return {label, h:24, draw(c,X,t0,t1,y,h){ if(!liveFn()){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('no signal',X(t0)+6,y+15); return; }
  const span=t1-t0, ui=1/(48000*128); if(span/ui > (X(t1)-X(t0))/2){ c.fillStyle=SIM.css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+5,X(t1)-X(t0),h-10); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText('AES3 at 6.144 Mbaud — zoom to 2 µs',X(t0)+6,y+15); return; }
  c.strokeStyle=SIM.css('--accent'); c.beginPath(); let lv=0; const n0=Math.floor(t0/ui), n1=Math.ceil(t1/ui); for(let n=n0;n<=n1;n++){ const tt=n*ui; if(hsh(n)>0.5) lv^=1; const yy=lv?y+5:y+h-5; n===n0?c.moveTo(X(Math.max(t0,tt)),yy):c.lineTo(X(tt),yy); c.lineTo(X(Math.min(t1,tt+ui)),yy); } c.stroke(); }}; }
function hsh(x){ x=Math.imul(x^0x5bd1e995, 0x27d4eb2d); x^=x>>>15; return (x>>>0)/4294967296 ; }
function lanes(){ return [
  {label:'AES frames (48 kHz)', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,0,1/96000,SIM.css('--accent2'),'frames'); }},
  biphaseLane('INA_P/INA_N (H1-2 / H1-1)', ()=>D.srcA && D.fault!=='swapH1'), biphaseLane('INB_P/INB_N (H1-20 / H1-19)', ()=>D.srcB && D.fault!=='swapH1'),
  biphaseLane('OUTP1/OUTN1 (H1-6 / H1-5)', ()=>outLive(1)), biphaseLane('OUTP5/OUTN5 (H1-14 / H1-13)', ()=>outLive(5)), biphaseLane('OUTP8/OUTN8 (H2-2 / H2-1)', ()=>outLive(8)),
]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__st8201aActive=true;
  m.innerHTML=`${card('The board — click a terminal to trace it, click H2 to mate/unmate it',`<div id="bd"></div>${controlsHTML()}`)}
   <div class="grid2">${card('What the connection does (last action)',`<div id="trace" class="log"></div>`)}${card('Every terminal',`<div id="nt"></div>`)}</div>
   ${card('Timeline — zoom to 2 µs to see the AES3 biphase signal on each pair',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#bd').innerHTML=boardSVG(); bindBoard(m.querySelector('#bd')); m.querySelector('#trace').innerHTML=traceHTML(D,'Click a terminal.');
    m.querySelector('#nt').innerHTML=tbl(['Terminal','Net','Header','TB8201AP','Live'],NETS.map(r=>[r[0],`<span class="mono">${r[1]}</span>`,r[2],TB8201AP[r[1]],r[0].startsWith('OUT')?(outLive(+r[0].slice(-1))?'●':'○'):r[0].startsWith('IN')?((r[0].includes('A')?D.srcA:D.srcB)?'●':'○'):'—']),true);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:220}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'What an ST8201A is', body:`<p>An MF8200-series card plugs into the frame from the front; its signals leave through a rear termination. The <b>TB</b> versions have screw terminals (TB8201A) or pluggable terminals (TB8201AP); this <b>ST</b> version has solder terminals for permanent wiring. Its netlist matches TB8201AP net for net.</p>`, check:()=>true, auto:true},
  {title:'1 · Find input A', body:`<p>Click the <b>INA +</b> terminal. It goes to net “1”, H1 pin 2; INA − goes to net “A”, H1 pin 1.</p>`, check:()=>D.sel==='INA_P', hint:'Top-left terminal.'},
  {title:'2 · Find output 8', body:`<p>Click <b>+8</b>. It is the only output that leaves on H2, the separate 2-pin header.</p>`, check:()=>D.sel==='OUTP8', hint:'Rightmost of the top row.'},
  {title:'3 · Forget H2', body:`<p>Click H2 to unmate it and watch OUT 8 go dead in the table and on the timeline.</p>`, check:()=>!D.h2, hint:'Click the H2 header outline.'},
  {title:'4 · Shields and grounds', body:`<p>Click <b>S4</b> (input shield, net B) and then <b>S3/S23</b> (output ground, net 2).</p>`, check:()=>D.log.some(e=>e.name==='Probe S4')&&D.log.some(e=>e.name==='Probe S3 + S23'), hint:'S4 sits between the two INA terminals; S3/S23 at the right.'},
  {title:'Done', body:`<p>The <b>Findings</b> tab explains why this folder is tagged #PROBLEM.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__st8201aActive=true; tutorialView(m,{title:'Tutorial — wiring an ST8201A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${boardSVG()}${controlsHTML()}`, bind:r=>{ bindBoard(r); bindControls(r); }}); }
function viewSecond(m){ window.__st8201aActive=true;
  m.innerHTML=card('One second through a passive termination',`<div id="tab"></div><p class="small">The board has no active parts: every signal passes with only the copper’s delay. What happens in one second is what the mated card sends (shown for an AES card, ${inf}).</p>`)+card('Propagation',`<div id="pr"></div>`);
  const draw=()=>{ m.querySelector('#tab').innerHTML=tbl(['Signal','per second','period','on this board'],[['AES3 frames','48 000',SIM.fmtDur(1/48000),'INA, INB and 8 output pairs'],['AES3 unit intervals','6 144 000',SIM.fmtDur(1/6144000),'biphase mark, 128 per frame'],['Analog audio (if an analog card)','20 Hz … 20 kHz','—','same copper']]);
    m.querySelector('#pr').innerHTML=kvt([['Terminal to header, about 2 in of track',SIM.fmtDur(0.05/1.5e8)+' (≈ ½ c)',1],['Compared with one AES unit interval','about '+(0.05/1.5e8*6144000*100).toFixed(2)+' %',1]]); };
  SIM.on('time',draw); }
const BLOCKS={
  ina:{x:20,y:30,w:150,h:70,t:'INA ±',s:['nets 1 / A'],d:'INA_P → net 1 → H1-2; INA_N → net A → H1-1.'},
  inb:{x:20,y:130,w:150,h:70,t:'INB ±',s:['nets 11 / M'],d:'INB_P → net 11 → H1-20; INB_N → net M → H1-19.'},
  sh:{x:20,y:230,w:150,h:60,t:'S4, S3, S23',s:['shield B, ground 2'],d:'S4 → net B → H1-3 (input shields). S3 and S23 → net 2 → H1-4 (output grounds).'},
  h1:{x:240,y:80,w:170,h:120,t:'H1 1 × 20',s:['to the card','A,1,B,2,D,4 … M,11'],d:'Net names are the 8200 card-edge contacts: numbers 1–12 and letters A–N without G and I. C and 3 are never used.'},
  h2:{x:240,y:230,w:170,h:60,t:'H2 1 × 2',s:['N, 12 → OUT 8'],d:'The overflow header: output 8 did not fit on H1.'},
  out:{x:480,y:80,w:170,h:120,t:'OUTP/OUTN 1–8',s:['numbered = +','lettered = −'],d:'OUTP k on nets 4…10, 12; OUTN k on D…L, N.'},
};
const WIRES=[['ina','h1',''],['inb','h1',''],['sh','h1',''],['h1','out','via card'],['h2','out','OUT 8']];
function viewBlock(m){ window.__st8201aActive=false; blockView(m,BLOCKS,WIRES,'h1',[670,300],card('In one sentence',`<p>A passive board: 21 solder terminals wired to a 20-pin and a 2-pin header that mate with an MF8200 card’s rear connector; no components at all.</p>`)); }
const SHEETS=[{name:'1 · Netlist as a schematic', note:'Redrawn from st8201a.net. Every net, every pin; there are no components besides the terminals and headers.', svg:()=>{
  let s=chip(300,30,120,'H1 (H1X20S)',NETS.filter(r=>r[2].startsWith('H1')).map(r=>[r[2].slice(3),r[1]]),[],'to the card')+chip(640,330,100,'H2 (H1X2)',[['1','N'],['2','12']],[],'');
  NETS.forEach(r=>{ const isH2=r[2].startsWith('H2'), p=+r[2].slice(3), y=isH2? 330+22+(p-1)*18 : 30+22+(p-1)*18, x0=isH2?470:90, x1=isH2?606:266; s+=txt(x0,y+4,r[0],10.5)+`<line x1="${x0+80}" y1="${y}" x2="${x1}" y2="${y}" stroke="var(--ink2)" stroke-dasharray="2 2"/>`; });
  return s+txt(470,60,'Pair k: OUTP k on a numbered net,',11)+txt(470,76,'OUTN k on a lettered net.',11)+txt(470,110,'C and 3 never appear:',11)+txt(470,126,'a key or unused contact pair (inferred).',11)+txt(470,300,'Output 8 overflows onto H2:',11); }}];
function viewSchem(m){ window.__st8201aActive=false; schemView(m,SHEETS,'ST8201A ISS 1','Redrawn from the P-CAD netlist; the original sheet carries a TB8204P title block.'); }
function viewSoft(m){ window.__st8201aActive=true; let hot=1;
  m.innerHTML=card('No firmware — the signal route for the selected terminal (click a stage)',`<div id="f"></div><div id="det" class="card small"></div>`)+card('ECO history (st8201a.ECO)',tbl(['Time (24 Aug 2004)','Change'],[['14:39:38','S2 → INA+ → INA_P, S1 → INA_N, S22 → INB_POS → INB_P, S24 → INB_N'],['14:45:52','S5/S7/S9/S11/S15/S16/S13/S14 → OUTP1…OUTP8; S6/S8/S10/S12/S19/S20/S17/S18 → OUTN1…OUTN8'],['—','S3, S4, S23 keep their generic names (shield/ground)']],true));
  const draw=()=>{ const r=termOf(D.sel)||NETS[0]; const st=[{t:r[0],s:['solder terminal']},{t:'net '+r[1],s:['copper']},{t:r[2],s:['header pin']},{t:'card edge '+r[1],s:[CARDS[D.card].name.slice(0,22)]}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=['Solder the cable here.','The net name is the 8200 edge-contact name.','H1 is a single-row 20-pin header; H2 a 2-pin.','The card decides what the contact means.'][hot]; };
  SIM.on('time',draw); }
function viewNotes(m){ window.__st8201aActive=false;
  m.innerHTML=card('What the ST8201A folder shows — findings (and a guess at the #PROBLEM tag)',`<ol>
   <li><b>The title block is wrong.</b> <span class="mono">st8201a.sch</span> is titled “TB8204P PLUGGABLE TEMINATION” (sic, ISS.1) although the file, the PCB and the netlist are st8201a — the sheet was copied from TB8204P. That is the most likely reason for “#PROBLEM” (${inf}).</li>
   <li><b>It is TB8201AP without the connectors.</b> Every H1/H2 net matches <span class="mono">TB8201AP.net</span>: INA on A/1, INB on M/11, shields on B, grounds on 2, outputs on D…N / 4…12. The README’s guess (“a termination/sub-board for the MF8200 series (8201)”) is right: it serves the TB8201A/AP family (D8204A, D8204C, D8201A per the rear-module guide), not the M8201 announce module.</li>
   <li><b>Output 8 spills onto a second header.</b> Two inputs, two shield/ground nets and seven output pairs fill the 20 pins of H1; OUTP8/OUTN8 go out on H2 (N, 12). Forget H2 and output 8 is dead.</li>
   <li><b>The net names are edge contacts.</b> 1–12 and A–N skipping G and I, the usual card-edge lettering. C and 3 are never used.</li>
   <li><b>Shields are split.</b> S4 is the input shield common (net B); S3 and S23 both land on output ground (net 2).</li>
   <li><b>Renamed in one afternoon.</b> The ECO file shows the generic S1…S24 terminals renamed to INA/INB/OUTP/OUTN in two passes on 24 Aug 2004 (path <span class="mono">H:\\M82XX\\TERMS\\st8201a.sch</span>).</li>
   <li><b>Unique.</b> Seven P-CAD files and no duplicates anywhere in the archive. There are no Gerbers, so it may never have been made (${inf}).</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Board outline and terminal positions are drawn, not measured: the P-CAD 2002 PCB file is binary (${inf}).</li><li>The “card” selector only changes which input feeds which outputs (${inf}).</li><li>An unkeyed single-row header can be mated backwards (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>XXX - st8201a - #Engineering #PROBLEM/st8201a.net · st8201a.ECO · st8201a.sch (+ .md) · st8201aiss1.pcb (+ .md)</li><li>#MF8200 #SERIES/TB8201AP - #Engineering #MF82 #TERMINATION/TB8201AP.net · TB8201AP-D8204A-WIRING.sch (+ .md)</li><li>#MF8200 #SERIES/TB8201A - #Engineering #MF82 #TERMINATION/README.md</li></ul>`); }
SIM.register({
  id:'st8201a', name:'st8201a · ST8201A solder-terminal rear termination for MF8200 cards (2004|37)', duration:1, product:'st8201a', year:2004, family:'Obsolete products', folder:'#MF8200 #SERIES/XXX - st8201a - #Engineering #PROBLEM',
  summary:'A passive MF8200-series rear termination with solder terminals: inputs A and B, eight balanced outputs, a 20-pin and a 2-pin header to the card. Its netlist matches the TB8201AP pluggable module net for net; the schematic carries a copied TB8204P title block.',
  highlights:['Every terminal traced to its net, header pin and TB8201AP equivalent','Output 8 on the overflow header H2','Card-edge net naming (A–N without G, I)','The #PROBLEM explained from the files'],
  depth:'Hardware model',
  stepUnits:[{label:'1 AES frame',period:()=>1/48000},{label:'1 AES UI',period:()=>1/6144000},{label:'1 ms',period:()=>0.001}],
  zooms:[[1,'1 s'],[0.001,'1 ms'],[2e-5,'1 AES frame'],[2e-6,'2 µs']], defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematic (redrawn)',render:viewSchem},{id:'software',label:'Signal route (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
