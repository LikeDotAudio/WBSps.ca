/* =====================================================================
   POD34 — Stereo 2 × 15 W power amplifier with AES and analog inputs (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware archived.

   Sources used (all in this archive, folder #POD #SERIES/POD34 - #Master):
   - POD34 - #Engineering/POD34_Pre_Specs.xls                       (preliminary spec: 2 × 15 W, gain 20 dB, AES −9 dBFS sensitivity, 30 kΩ +26 dBu analog)
   - POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).pdf    (panel silkscreen, Feb 26 2015) + Pics/POD34 Front.jpg, Rear.jpg
   - POD34 - #Mechanical #DA #2016/POD34-FRONT/REAR ISS 1 (PANEL).pdf, POD34-SPACER ISS1; #Engineering/MECHANICAL (MTG. PLATE ISS 2)
   - POD34 - #Engineering/WIRING DIAGRAM/POD34-wiring diagram-iss1.dwg (wiring only; no PCB, no firmware)
   The electronics inside (AES receiver/DAC, amplifier module, headset driver) are inferred and marked so on screen.
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
/* Artwork 2026|59: assets/pod34-front.svg, pod34-rear.svg are vector conversions of
   POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr (FEB.26/15; identical inside the panel outlines to
   #Engineering/SILK/POD34-FRONT&REAR(FINAL CURVE).cdr): GREEN + WHITE plates on one panel, holes, cut-outs and the
   drawing's XLR/IEC outlines; the yellow “FUSE” note on the IEC drawing is left out. Controls were moved onto its holes:
   toggle (545,161), trims (839/1039,223), knobs (1165/1365,161), STEREO button (1265,169), rear XLRs (209/417/961/1169,156),
   IEC cut-out 1357–1609 × 33–249. */
const ART_PATH = '#POD #SERIES/POD34 - #Master/POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr';
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

const PREFIX='pod34';
const SPEC = { P:15, load:8, gain:20, aesSens:-9, anaMax:26, Zin:30000 };
const V = { dac0:12, trimLo:-24, trimHi:0, lock:0.03 };     // DAC 0 dBFS = +12 dBu so −9 dBFS + 20 dB = full power (inferred); trim range inferred
const FSS=[32000,44100,48000,96000,192000];
const D = { power:true, powerAt:-1, src:'AES', aes:{plug:true, dbfs:-20, fs:48000, at:-1}, ana:{plugL:true, plugR:true, dbu:4}, f:1000,
  trim:{L:0.75,R:0.75}, vol:{L:0.7,R:0.7}, stereo:true, load:8, hs:false, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const dB=g=>20*Math.log10(Math.max(g,1e-12));
const fullV = ()=>Math.sqrt(SPEC.P*SPEC.load);                       // 10.95 V rms into 8 Ω at 15 W
const clipV = ()=>fullV()*Math.SQRT2;                                 // peak swing limit (fixed by the rails, inferred)
const volG = s => taper.log(D.stereo? D.vol.L : D.vol[s]);
const trimDb = s => V.trimLo + (V.trimHi-V.trimLo)*D.trim[s];
function locked(t){ if (!D.power||!D.aes.plug) return false; const t0=Math.max(D.aes.at, D.powerAt); return t0<0 || t>=t0+V.lock; }
const upAt = t => ramp(D.power, D.powerAt, t, 1, 0.05, 0.02);
/* level at the amplifier input (dBu) for side s */
function ampInDb(s){ if (!D.power) return -200;
  if (D.src==='AES') return locked(1e9)? D.aes.dbfs + V.dac0 : -200;
  return (s==='L'?D.ana.plugL:D.ana.plugR)? D.ana.dbu + trimDb(s) : -200; }
function spkDb(s){ const a=ampInDb(s); return a<-150?-200: a + dB(volG(s)) + SPEC.gain; }
function watts(s){ const v=Math.min(clipV()/Math.SQRT2, dbu2v(spkDb(s))); return spkDb(s)<-150?0: v*v/D.load*(D.load/SPEC.load<1?1:1); }
const clipped = s => spkDb(s) > v2dbu(clipV()/Math.SQRT2)+0.01;
function sig(s,t){ const ph=s==='R'?0.6:0; return Math.sin(2*Math.PI*D.f*t+ph); }
function spkV(s,t){ const d=spkDb(s); if (d<-150) return 0; if (D.src==='AES' && !locked(t)) return 0; return clamp(dbu2v(d)*Math.SQRT2*sig(s,t)*upAt(t), -clipV(), clipV()); }
function aesSample(t){ return D.src==='AES'||true ? (D.aes.plug&&D.power? Math.pow(10,D.aes.dbfs/20)*sig('L',t) : 0) : 0; }
const act=makeActor(D,()=>`L ${watts('L').toFixed(2)} W · R ${watts('R').toFixed(2)} W (${D.src})`);
const A={
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t; tr('110–230 VAC IEC → rocker → amplifier supply ('+inf+': off-the-shelf module, README note)'); tr('Speaker outputs un-mute after ≈ 50 ms ('+inf+'); the AES receiver re-locks'); } else tr('All off'); }); },
  src(){ act(`Input select → ${D.src==='AES'?'ANALOG':'AES'}`, tr=>{ D.src=D.src==='AES'?'ANALOG':'AES'; tr(D.src==='AES'?'Front toggle to AES: the DAC output feeds the amplifier (sensitivity −9 dBFS for full power, spec sheet)':'Front toggle to ANALOG: the 30 kΩ balanced inputs through the ANALOG IN ADJUST trims feed the amplifier'); }); },
  trim(s,dir){ act(`Turn ANALOG IN ADJUST ${s} ${dir>0?'up':'down'}`, tr=>{ D.trim[s]=clamp(+(D.trim[s]+dir*0.04).toFixed(3),0,1); tr(`Input sensitivity trim ${fdb(trimDb(s))} dB (range ${V.trimLo} … ${V.trimHi} dB ${inf}; the spec says “Adjustable (TBA)”)`); }); },
  vol(s,dir){ act(`Turn ${s==='L'?'LEFT':'RIGHT'} level ${dir>0?'up':'down'}`, tr=>{ D.vol[s]=clamp(+(D.vol[s]+dir*0.04).toFixed(3),0,1); tr(D.stereo&&s==='R'?'STEREO is latched: the LEFT knob sets both channels, so RIGHT has no effect':`${D.stereo?'Both channels':s==='L'?'Left':'Right'} volume ${fdb(dB(volG(s)))} dB (log taper ${inf})`); }); },
  link(){ act(`STEREO button → ${D.stereo?'released (LEFT / RIGHT)':'latched (STEREO)'}`, tr=>{ D.stereo=!D.stereo; tr(D.stereo?'Latched: the left knob controls both channels (as on POD24)':'Released: each knob sets its own channel'); }); },
  plug(k){ act(`${(k==='aes'?D.aes.plug:k==='L'?D.ana.plugL:D.ana.plugR)?'Disconnect':'Connect'} ${k==='aes'?'AES IN':'ANALOG IN '+k}`, tr=>{
    if (k==='aes'){ D.aes.plug=!D.aes.plug; D.aes.at=SIM.t; tr(D.aes.plug?`AES3 at ${D.aes.fs/1000} kHz into the 110 Ω transformer input → receiver locks in ≈ ${V.lock*1000} ms (${inf}) → LOCK LED`:'No AES: LOCK goes out; the AES OUT stops too ('+inf+')'); }
    else { if (k==='L') D.ana.plugL=!D.ana.plugL; else D.ana.plugR=!D.ana.plugR; tr('Analog XLR-F, 30 kΩ balanced (spec)'); } }); },
  hs(){ act(`${D.hs?'Unplug':'Plug in'} HEADSET`, tr=>{ D.hs=!D.hs; tr('Front ¼" jack; its driver and whether it mutes the speakers are not documented ('+inf+': speakers stay on)'); }); },
  set(k,v,l){ act(l,tr=>{ if(k==='fs'){ D.aes.fs=v; D.aes.at=SIM.t; tr(`Receiver re-locks to ${v/1000} kHz (spec: 32–192 kHz)`); } else if(k==='dbfs') D.aes.dbfs=v; else if(k==='dbu') D.ana.dbu=v; else if(k==='load') D.load=v; else D.f=v; tr('Source or load changed'); }); },
  reset(){ Object.assign(D,JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
function knob(x,y,frac,cls,title){ const a=(-135+270*frac)*Math.PI/180; return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="46" fill="transparent"/><circle cx="${x}" cy="${y}" r="38" fill="#1b1c1e" stroke="#3a3d40" stroke-width="3"/><circle cx="${x}" cy="${y}" r="29" fill="#2a8a48"/><line x1="${x}" y1="${y}" x2="${x+Math.sin(a)*29}" y2="${y-Math.cos(a)*29}" stroke="#f0f0ec" stroke-width="5" stroke-linecap="round"/></g>`; }
function toggle(x,y,up,cls,title){ return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="20" fill="#b9bcbf" stroke="#6b6f73" stroke-width="3"/><line x1="${x}" y1="${y}" x2="${up?x-38:x+38}" y2="${y-6}" stroke="#d9dcdf" stroke-width="9" stroke-linecap="round"/></g>`; }
function frontSVG(t){ const on=D.power&&upAt(t)>0.5;
  const over=rocker(D.power)+led(388,218,locked(t),'#ff4a3a',11)+toggle(545,161,D.src==='AES','src','AES / ANALOG input select — click')
    +trim(839,223,D.trim.L,'tr-L','ANALOG IN ADJUST L')+trim(1039,223,D.trim.R,'tr-R','ANALOG IN ADJUST R')
    +knob(1165,161,D.vol.L,'vl-L','LEFT level (both in STEREO)')+`<g class="lnk" style="cursor:pointer"><title>STEREO link push-button — click</title><rect x="1242" y="143" width="46" height="52" rx="6" fill="${D.stereo?'#050505':'#2a2d31'}" stroke="#555" stroke-width="2"/></g>`+knob(1365,161,D.vol.R,'vl-R','RIGHT level')
    +`<g class="hs" style="cursor:pointer"><title>HEADSET ¼" jack — click</title><circle cx="1573" cy="110" r="40" fill="#0c0d0e" stroke="#777" stroke-width="3"/><circle cx="1573" cy="110" r="12" fill="#050505"/>${D.hs?'<circle cx="1573" cy="110" r="26" fill="#2b5f9e" opacity=".9"/>':''}</g>`
    +(on?'':'');
  return panelSVG(PREFIX,'front',{over},'POD34 front panel (real silkscreen)'); }
function post(x,y,red,live){ return `<circle cx="${x}" cy="${y}" r="42" fill="#d6b65a" stroke="#7a5f12" stroke-width="3"/><circle cx="${x}" cy="${y}" r="26" fill="${red?'#b02a24':'#1a1a1a'}"/><circle cx="${x}" cy="${y}" r="9" fill="#d6b65a"/>${live?`<circle cx="${x+34}" cy="${y-34}" r="7" fill="var(--accent)"/>`:''}`; }
function rearSVG(){ const lv=s=>watts(s)>0.001;
  const X=(x,y,...a)=>`<g transform="translate(${x} ${y}) scale(1.22) translate(${-x} ${-y})">${xlr(x,y,...a)}</g>`;   // Ø 187 px D-flange XLR holes in the artwork
  const over=X(209,156,false,D.aes.plug,'pa','AES IN (XLR-F, 110 Ω) — click')+X(417,156,true,false,'','AES OUT (XLR-M)')
    +post(608,85,true,lv('R'))+post(772,85,true,lv('L'))+post(608,235,false,lv('R'))+post(772,235,false,lv('L'))
    +X(961,156,false,D.ana.plugL,'pL','ANALOG IN L (XLR-F) — click')+X(1169,156,false,D.ana.plugR,'pR','ANALOG IN R (XLR-F) — click')+iec(1357,33,1609,249);
  return panelSVG(PREFIX,'rear',{over},'POD34 rear panel (real silkscreen)'); }
function bindPanel(r){ const q=(c,f)=>r.querySelectorAll('.'+c).forEach(g=>g.onclick=f); const p=r.querySelector('.pwr'); if(p) p.onclick=()=>A.power();
  q('src',()=>A.src()); q('lnk',()=>A.link()); q('hs',()=>A.hs()); q('pa',()=>A.plug('aes')); q('pL',()=>A.plug('L')); q('pR',()=>A.plug('R'));
  ['L','R'].forEach(s=>{ bindTrim(r,'tr-'+s,d=>A.trim(s,d)); bindTrim(r,'vl-'+s,d=>A.vol(s,d)); }); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px"><label>AES level <input id="ad" type="number" value="${D.aes.dbfs}" style="width:52px"> dBFS</label>
  <label>fs <select id="fs">${FSS.map(f=>`<option value="${f}" ${f===D.aes.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label><label>Analog <input id="an" type="number" value="${D.ana.dbu}" style="width:52px"> dBu</label>
  <label>Tone <select id="gF">${[100,1000,5000].map(f=>`<option ${f===D.f?'selected':''}>${f}</option>`).join('')}</select> Hz</label><label>Speakers <select id="ld">${[8,4].map(v=>`<option ${v===D.load?'selected':''}>${v}</option>`).join('')}</select> Ω</label></div>
  <div class="small muted" style="margin-top:4px">Click the AES/ANALOG toggle, the STEREO button, knobs and trims (halves or wheel), the jack and the rear XLRs. Keys: S = source, L = link, Q/W left, E/R right.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#ad')) return; g('#ad').onchange=e=>A.set('dbfs',Math.min(0,+e.target.value),'AES level → '+e.target.value+' dBFS'); g('#fs').onchange=e=>A.set('fs',+e.target.value,'AES rate → '+e.target.value+' Hz');
  g('#an').onchange=e=>A.set('dbu',+e.target.value,'Analog level → '+e.target.value+' dBu'); g('#gF').onchange=e=>A.set('f',+e.target.value,'Tone → '+e.target.value+' Hz'); g('#ld').onchange=e=>A.set('load',+e.target.value,'Speakers → '+e.target.value+' Ω'); }
bindKeys('__pod34Active',()=>({s:()=>A.src(),l:()=>A.link(),q:()=>A.vol('L',-1),w:()=>A.vol('L',1),e:()=>A.vol('R',-1),r:()=>A.vol('R',1)}));
const dense=(s,pw)=>s*D.f>pw/3;
const envOf=fn=>{ const e=t=>{ let m=0; const P=1/D.f; for(let i=0;i<8;i++) m=Math.max(m,Math.abs(fn(t+P*i/8))); return m; }; e.dense=dense; return e; };
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), r=SIM.css('--bad');
  return [ {label:`AES3 frames (${D.aes.fs/1000} kHz)`, h:22, draw(c,X,t0,t1,y,h){ if(!D.aes.plug||!D.power) return; SIM.pulses(c,X,t0,t1,y,h,1/D.aes.fs,0,0.25/D.aes.fs,b,'frames'); }},
    {label:'AES blocks (192 frames, Z preamble)', h:20, draw(c,X,t0,t1,y,h){ if(!D.aes.plug||!D.power) return; SIM.pulses(c,X,t0,t1,y,h,192/D.aes.fs,0,2/D.aes.fs,SIM.css('--warn'),'block start'); }},
    boolLane('LOCK LED', t=>locked(t), '#e3453a'), boolLane('Source = AES', t=>D.src==='AES', '#e8b23a'),
    waveLane('AES samples (L, full scale = 1)', t=>locked(t)?aesSample(t):0, 1, null, b, 30, Object.assign(t=>locked(t)?Math.pow(10,D.aes.dbfs/20):0,{dense})),
    waveLane('LEFT speaker (+ to −)', t=>spkV('L',t), -0.5, clipV(), r, 40, envOf(t=>spkV('L',t))),
    waveLane('RIGHT speaker', t=>spkV('R',t), -0.5, clipV(), a, 36, envOf(t=>spkV('R',t))) ]; }
function nowHTML(t){ const row=s=>`<tr><th>${s==='L'?'LEFT':'RIGHT'} speaker</th><td class="mono">${spkDb(s)<-150?'—':fdb(spkDb(s))+' dBu'} · ${watts(s).toFixed(2)} W ${clipped(s)?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>`;
  return `<table class="kv">${row('L')}${row('R')}<tr><th>Source</th><td class="mono">${D.src} ${D.src==='AES'?(locked(t)?'· locked '+D.aes.fs/1000+' kHz':'· NO LOCK'):''}</td></tr><tr><th>Link</th><td class="mono">${D.stereo?'STEREO (LEFT knob sets both)':'LEFT / RIGHT'}</td></tr></table>`; }
function levelsHTML(){ const s='L', clip=v2dbu(clipV()/Math.SQRT2);
  const st = D.src==='AES' ? [{name:'AES IN (110 Ω transformer)',lvl:D.aes.plug?D.aes.dbfs:-200,unit:'dBFS',gain:null,clip:0,note:`${D.aes.fs/1000} kHz, sensitivity −9 dBFS (spec)`},{name:'DAC (0 dBFS = +12 dBu)',lvl:ampInDb(s),gain:V.dac0,clip:V.dac0,note:inf}]
    : [{name:'ANALOG IN L (30 kΩ bal.)',lvl:D.ana.plugL?D.ana.dbu:-200,gain:null,clip:SPEC.anaMax,note:'max +26 dBu (spec)'},{name:'ANALOG IN ADJUST L',lvl:ampInDb(s),gain:trimDb(s),clip:SPEC.anaMax,note:'sensitivity trim '+inf}];
  return `<h3>Left channel</h3>${stageTable(st.concat([{name:'LEFT level knob',lvl:ampInDb(s)<-150?-200:ampInDb(s)+dB(volG(s)),gain:dB(volG(s)),clip:clip-20,note:D.stereo?'STEREO linked':''},{name:'Power amp (20 dB, spec) → speaker',lvl:spkDb(s),gain:20,clip,note:`${watts(s).toFixed(2)} W into ${D.load} Ω; 15 W/8 Ω = +23.0 dBu`}]))}<p class="small muted">The swing limit is fixed at 15 W into 8 Ω (${inf}); into 4 Ω the same voltage gives 30 W, which the module may not deliver.</p>`; }
const viewSim=simView({flag:'__pod34Active',D,front:frontSVG,rear:rearSVG,bind:bindPanel,controls:controlsHTML,bindControls,now:nowHTML,levels:levelsHTML,lanes,labelW:210,nowTitle:'Speakers now',rearNote:`<p class="small muted" style="margin:6px 0 0">Panel artwork: ${SIM.src(ART_PATH,'POD34-FRONT&REAR-SILK (Curve).cdr')} (CorelDRAW, FEB.26/15), converted to vector: green and white ink plates on one panel, holes, cut-outs and connector outlines from the same drawing.</p>`,hint:'Flip AES/ANALOG, turn a level knob or plug an input.'});
const LESSONS=[
  {title:'Meet the POD34', body:'<p>POD34 is a <b>stereo power amplifier</b> (2 × 15 W) that takes either an <b>AES</b> digital feed (with a loop-out) or a balanced <b>analog</b> pair. Front: LOCK LED, AES/ANALOG toggle, analog input trims, LEFT/RIGHT knobs with a STEREO link button, and a headset jack.</p><p class="muted">Only the preliminary spec sheet, panels and a wiring drawing survive.</p>', check:()=>true, auto:true},
  {title:'1 · Lock to AES', body:'<p>Power on with AES connected. LOCK lights once the receiver locks.</p>', check:()=>D.power&&locked(SIM.t+1), hint:'Rocker; click AES IN on the rear if it is unplugged.'},
  {title:'2 · Full power at −9 dBFS', body:'<p>Set the AES level to −9 dBFS and both knobs fully up. That is the spec sheet\'s sensitivity: about 15 W.</p>', check:()=>D.src==='AES'&&D.aes.dbfs===-9&&watts('L')>13, hint:'AES level −9; W key many times.'},
  {title:'3 · A comfortable level', body:'<p>Bring both channels to about 1 W (0.7–1.4 W) with the STEREO link latched.</p>', check:()=>D.stereo&&watts('L')>=0.7&&watts('L')<=1.4, hint:'Q lowers LEFT, which sets both.'},
  {title:'4 · Analog', body:'<p>Switch to ANALOG with a +4 dBu source and set the L trim so the left speaker gives the same 1 W.</p>', check:()=>D.src==='ANALOG'&&watts('L')>=0.7&&watts('L')<=1.4, hint:'S key; click the L trim halves.'},
  {title:'Done', body:'<p>Findings compares the spec sheet with the panel.</p>', check:()=>true, auto:true}];
let lessonIdx=0;
function viewTutorial(m){ window.__pod34Active=true; tutorialView(m,{title:'Tutorial — setting up a POD34',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${nowHTML(SIM.t)}</div>`,bind:r=>{bindPanel(r);bindControls(r);}}); }
function viewSecond(m){ window.__pod34Active=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('One AES3 frame at the playhead (the AES IN bit stream)',`<canvas id="sc"></canvas>`)}${card('As seen by the outside world',`<div id="fp"></div><div id="dev"></div>`)}</div>${card('Zoom ladder at the playhead — LEFT speaker',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, fs=D.aes.fs;
    m.querySelector('#ladder').innerHTML=tableRows([['AES3 frames',fs.toLocaleString(),SIM.fmtDur(1/fs),'two 32-bit subframes each (L, R)'],['AES3 blocks',(fs/192).toFixed(1),SIM.fmtDur(192/fs),'channel-status block: Z preamble every 192 frames'],['Biphase bit cells',(fs*128).toLocaleString(),SIM.fmtDur(1/(fs*128)),`${(fs*128/1e6).toFixed(3)} Mbaud on the 110 Ω pair`],['Receiver lock','—',SIM.fmtDur(V.lock)+' '+inf,'LOCK LED'],['Tone cycles',D.f.toLocaleString(),SIM.fmtDur(1/D.f),'the program'],['Amp output swing','—','—',`±${clipV().toFixed(1)} V peak at 15 W / 8 Ω`]]);
    const n=Math.floor(t*fs), s0=locked(t)?aesSample(t):0; drawAesScope(m.querySelector('#sc'), aesSubframe(s0,n%192===0?'Z':'X',n%192,fs), aesSubframe(s0,'Y',n%192,fs), fs, D.aes.plug?1:0.05, `frame ${n.toLocaleString()} ·`);
    m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#dev').innerHTML=nowHTML(t);
    drawLadder(m.querySelector('#zl'),t,[['1 second',1],['100 ms',0.1],['10 ms',0.01],['1 tone cycle',1/D.f],['4 AES frames',4/fs]],tt=>spkV('L',tt),-0.5,'LEFT speaker volts'); };
  SIM.on('time',draw); }
const BLOCKS={ aes:{x:20,y:30,w:170,h:80,t:'AES IN / OUT',s:['110 Ω transformer XLRs','32–192 kHz'],d:'Spec sheet. The receiver/DAC parts are not archived (inferred).'},
  ana:{x:20,y:170,w:170,h:80,t:'ANALOG IN L/R',s:['30 kΩ balanced, +26 dBu max','ADJUST trims L/R'],d:'Spec sheet; trims on the front ("ANALOG IN ADJUST").'},
  sel:{x:240,y:100,w:150,h:70,t:'AES / ANALOG toggle',s:['front'],d:'Silk and photo.'},
  vol:{x:430,y:100,w:160,h:80,t:'LEFT / RIGHT knobs',s:['STEREO link button'],d:'Same idea as POD24\'s STEREO lever (inferred).'},
  amp:{x:630,y:60,w:170,h:90,t:'Power amp module',s:['2 × 15 W, gain 20 dB','binding posts R±, L±'],d:'Probably bought in (README; wiring-diagram-only design).'},
  hs:{x:630,y:190,w:170,h:70,t:'HEADSET',s:['front ¼" jack'],d:'Driver not documented (inferred).'} };
const WIRES=[['aes','sel','DAC'],['ana','sel',''],['sel','vol',''],['vol','amp',''],['vol','hs','']];
function viewBlock(m){ window.__pod34Active=false; blockView(m,BLOCKS,WIRES,'amp',[820,290],card('In one sentence',`<p>An AES receiver/DAC or a trimmed balanced analog pair is selected by a front toggle, set by linked or separate level knobs, and drives a 2 × 15 W amplifier and a headset jack.</p>`)); }
const SHEETS=[{name:'1 · Wiring (inferred)', note:'POD34-wiring diagram-iss1.dwg is the only electrical drawing; its contents could not be read as text. This sheet is a labelled inference from the panels and the spec sheet.', svg:()=>
  chip(80,80,150,'AES IN/OUT',[['XLR-F 2/3','AES +/−'],['XLR-M 2/3','AES OUT']],[['→','receiver/DAC '+'(inferred)']],'110 Ω transformer')+chip(80,260,150,'ANALOG IN',[['L XLR-F','+ − G'],['R XLR-F','+ − G']],[['→','ADJUST L/R']],'30 kΩ')
  +chip(420,150,140,'AMP MODULE',[['IN L/R','from knobs'],['V±','supply']],[['L+ / L−','binding posts'],['R+ / R−','binding posts']],'2 × 15 W, 20 dB')+txt(60,430,'Spec: THD+N < 0.2 % @ 5 W · crosstalk −70 dB and SNR −92 dB @ 1 W/1 kHz · 100–240 VAC',11)}];
function viewSchem(m){ window.__pod34Active=false; schemView(m,SHEETS,'POD34','No POD34 schematic or PCB is archived.'); }
const viewSoft=softView({flag:'__pod34Active',D,intro:'No POD34 firmware is archived. The signal path is shown stage by stage (spec-sheet numbers; internals inferred).',
  flows:[{title:'Left channel',stages:()=>[{t:D.src==='AES'?'AES IN':'ANALOG IN',s:[D.src==='AES'?fdb(D.aes.dbfs)+' dBFS':fdb(D.ana.dbu)+' dBu']},{t:D.src==='AES'?'Receiver + DAC':'ADJUST trim',s:[fdb(ampInDb('L'))+' dBu']},{t:'Level knob',s:[fdb(dB(volG('L')))+' dB']},{t:'Amp 20 dB',s:[watts('L').toFixed(2)+' W'],bad:clipped('L')}],
    det:[()=>D.src==='AES'?'<b>AES.</b> 110 Ω transformer-balanced XLR-3F, 0.2–7 V p-p, 32–192 kHz (spec).':'<b>Analog.</b> 30 kΩ balanced, +26 dBu max (spec).',()=>D.src==='AES'?`<b>DAC.</b> 0 dBFS = +${V.dac0} dBu, chosen so −9 dBFS gives full power (${inf}).`:`<b>Trim.</b> ${fdb(trimDb('L'))} dB (${inf}).`,()=>`<b>Knob.</b> log taper (${inf}).`,()=>`<b>Amp.</b> gain 20 dB; 15 W into 8 Ω = ${fullV().toFixed(2)} V rms.`]}],
  chartTitle:'AES level → left speaker power (knob full)', chart:cv=>curveChart(cv,[{fn:x=>{ const d=-40+x*40, v=Math.min(fullV(),dbu2v(d+V.dac0+SPEC.gain)); return v*v/8; }, col:SIM.css('--accent'), label:'W', cur:clamp((D.aes.dbfs+40)/40,0,1)}],0,16,' W','−40 dBFS','0 dBFS'),
  buttons:[['AES/ANALOG toggle','input selector','source'],['LEFT/RIGHT knobs + STEREO button','volume, linked or separate','level'],['ANALOG IN ADJUST','input trims','analog sensitivity']],
  pins:[['AES IN / OUT','XLR-3F / XLR-3M','110 Ω transformer balanced'],['ANALOG IN L / R','XLR-F','30 kΩ balanced'],['Speakers','binding posts','R+ R− L+ L− (red = +)'],['HEADSET','¼" TRS','front']]});
const viewNotes=notesView('__pod34Active','What the POD34 archive shows — findings',[
  '<b>The spec sheet is preliminary and the panel follows it closely.</b> POD34_Pre_Specs.xls (by Ali and Wai-keung) gives 2 × 15 W, gain 20 dB, AES in/out on XLR-3F/3M, analog 30 kΩ. The panel adds what the sheet does not mention: a HEADSET jack, LOCK LED and a STEREO link button.',
  '<b>Several values are still “TBA”.</b> Analog sensitivity (“Adjustable (TBA)”), AES output level and weight. The model fills them with inferred values.',
  '<b>No electronics.</b> There is no PCB, BOM or firmware; the wiring diagram is the only electrical drawing, which suggests the amplifier and the AES receiver/DAC are bought-in modules (README note).',
  '<b>The AES sensitivity is −9 dBFS for full power.</b> Normal programme peaking at −9 dBFS drives it to 15 W; line-up tone at −18/−20 dBFS gives about 1.9 W or 1.2 W with the knobs full.',
  '<b>The same STEREO-link idea as POD24.</b> The silk “STEREO ▀ / LEFT ▄ RIGHT” matches POD24\'s lever legend; here it is a push-button between the knobs.',
  '<b>Input range on the rear differs from the spec.</b> Rear silk: “110-230 VAC, 50-60 Hz”; spec sheet: 100–240 VAC.',
  `<b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src(ART_PATH,'POD34-FRONT&REAR-SILK (Curve).cdr')} (FEB.26/15).</b> The ARTWORK copy (saved Oct 2015|48) and <span class="mono">#Engineering/SILK/POD34-FRONT&amp;REAR(FINAL CURVE).cdr</span> (Mar 2015|48) are identical inside the panel outlines. The drawing put the analog XLRs at x 961/1169 px and the IEC cut-out at 1357–1609 px, 60–120 px left of where this panel had them, and the rocker, toggle, level knobs, STEREO button and trims 3–19 px off; all are now on their holes. The STEREO button hole (Ø 56 px, 7.1 mm) is wider than the knob shafts (Ø 44 px) and sits 8 px lower, and the LOCK LED hole (Ø 51 px) is a holder, not a bare 3 mm LED. The rear carries two ink notes the spec never mentions: a “CAUTION: DISCONNECT POWER BEFORE SERVICING OR REPLACING THE FUSE” block and a warning triangle.`],
 [`DAC 0 dBFS = +${V.dac0} dBu, analog trim ${V.trimLo}…${V.trimHi} dB, log-taper knobs, ${V.lock*1000} ms lock (all inferred).`,'Speaker swing limit fixed at 15 W into 8 Ω (inferred).','The headset jack does not mute the speakers (inferred).'],
 ['POD34 - #Engineering/POD34_Pre_Specs.xls',SIM.src(ART_PATH,'POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr')+' (panel artwork, vector) · its .pdf export · Pics/POD34 Front.jpg, Rear.jpg','POD34 - #Mechanical #DA #2016/POD34-FRONT ISS 1 · REAR ISS 1 · SPACER ISS1','POD34 - #Engineering/WIRING DIAGRAM/POD34-wiring diagram-iss1.dwg']);
SIM.register({ footnotes:[{text:"The drawing puts the analog XLRs at x 961/1169 px and the IEC cut-out at 1357–1609 px, 60–120 px left of where the panel had been drawn; the rocker, toggle, knobs, STEREO button and trims were 3–19 px off.",src:"#POD #SERIES/POD34 - #Master/POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr"},{text:"A yellow “FUSE” note sits on the IEC drawing. It is a drafting note, not ink, so the panel leaves it out.",src:"#POD #SERIES/POD34 - #Master/POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr"},{text:"The STEREO button hole (Ø 7.1 mm) is wider than the knob-shaft holes (Ø 5.6 mm) and sits 1 mm lower.",src:"#POD #SERIES/POD34 - #Master/POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr"},{text:"The LOCK LED hole is Ø 6.5 mm, a holder rather than a bare 3 mm LED.",src:"#POD #SERIES/POD34 - #Master/POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr"},{text:"The rear prints “CAUTION: DISCONNECT POWER BEFORE SERVICING OR REPLACING THE FUSE” and a warning triangle, neither mentioned in the spec sheet.",src:"#POD #SERIES/POD34 - #Master/POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr"},{text:"The ARTWORK copy (saved Oct 2015) and Engineering/SILK/POD34-FRONT&REAR(FINAL CURVE).cdr (Mar 2015) are identical inside the panel outlines.",src:"#POD #SERIES/POD34 - #Master/POD34 - #Engineering/SILK/POD34-FRONT&REAR(FINAL CURVE).cdr"},{text:"Each XLR is drawn as a D-flange connector with two diagonal mounting holes, and the binding posts as Ø 14 mm holes in a 2 × 2 block.",src:"#POD #SERIES/POD34 - #Master/POD34 - #ARTWORK #DA #2016/POD34-FRONT&REAR-SILK (Curve).cdr"}],
   id:'pod34', name:'POD34 · 2 × 15 W stereo power amplifier, AES + analog in (2015|48)', duration:1, product:'POD34', year:2015, family:'POD series', folder:'#POD #SERIES/POD34 - #Master',
  summary:'Half-rack stereo power amplifier fed from AES (with loop-out) or balanced analog inputs, with linked or separate level knobs, a LOCK LED and a headset jack. Only a preliminary spec sheet, panels and a wiring drawing survive; internals are inferred.',
  highlights:['Real silkscreen panels with toggle, knobs, trims, STEREO button and rear XLRs/binding posts','AES3 frame scope and lock behaviour','Spec-sheet gain and sensitivity → speaker power','What the spec sheet left “TBA”'],
  depth:'Hardware model', stepUnits:[{label:'1 AES frame',period:()=>1/D.aes.fs},{label:'1 tone cycle',period:()=>1/D.f},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms (AES blocks)'],[0.002,'2 ms'],[0.0001,'100 µs (AES frames)']], defaultZoom:3, init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: setting up a POD34',render:viewTutorial},{id:'second',label:'One second, frame by frame',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Wiring (inferred)',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}] });

})();
