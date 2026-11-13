/* =====================================================================
   POD1 — Bi-directional audio interface (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.

   Sources used (all in this archive, folder #POD #SERIES/POD1 - #Master):
   - POD1-2  - #ISS3 #PCB/ISS3/Balanced-Unbalanced.pdf      (POD1-2 ISS3, Altium, dated 8/10/2015)
   - POD1-3  - #ISS3 #PCB/ISS3/Unbalanced-Balanced.pdf      (POD1-3 ISS3, dated 02/05/2016)
   - POD1-1  - #ISS2 #PCB/.../POD1-1-ISS2.pdf               (main board ISS2, dated 04/12/2013)
   - POD1 - #TESTREPORT/POD1-04NOV13.pdf                    (prototype test, 4 Nov 2013)
   - ../POD1  - POD18 - Redesign #RD #RD64/PCB/POD1 MASTER BOM with jumpers.xlsx (BOM, fitted/DNI)
   - POD1 - #ARTWORK #DA #2016/POD1-FRONT&REAR-SILK(CURVE) .pdf (panel silkscreen) + Pics/POD1 Front.jpg, Rear.jpg
   - ../POD18 - #Master/POD18 - #Engineering/MANUAL/POD 18 MANUAL.pdf (sister product; unbal->bal specs)
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

const PREFIX = 'pod1';
/* ---------------- component values (from the ISS3 schematics and the master BOM) ---------------- */
const V = {
  // POD1-2 balanced -> unbalanced (per channel; channel A values, B is identical)
  ssmGain: 0.5,          // SSM2143 "-6dB differential line receiver" (BOM description)
  R9: 8060, R11: 15000, R12: 2000, RV: 5000, C5: 68e-6, Rout2: 30,  // U3A inverting stage with T-network trim
  // POD1-3 unbalanced -> balanced
  R5: 47500, R7: 100000, R9b: 47500, R13: 2210, R11b: 301, RVb: 5000, C1: 68e-6, R15: 4750, R18: 4750, Rout3: 30,
  rail: 12, swingLoss: 1.5,  // SUW1R5 ±12 V; NE5532 output swing to within about 1.5 V of the rails (inferred, datasheet typical)
};
/* ---------------- device state ---------------- */
const D = {
  power: true, powerAt: -1,          // sim time the rocker was last turned on (-1 = already on at t=0)
  psu: 'design',                     // 'design' = rails come up at ±12 V; 'bom' = SUW1R5-1212 fed from the 5 V NFM-10-5 (see Findings)
  rev: 'ISS3',                       // 'ISS3' as drawn, or 'ISS2' = the 4 Nov 2013 prototype with the faults the test report lists
  gen: { f: 1000, bal: 4, unb: -7.8 },// test generator: balanced source level (dBu) and consumer source (dBu; -7.8 dBu = -10 dBV)
  plug: { balL:true, balR:true, unbL:true, unbR:true },
  loadU: 10000, loadB: 600,          // load on the unbalanced outputs and on the balanced outputs (ohms)
  trim: { uL:0.42, uR:0.42, bL:0.55, bR:0.55 },  // OUTPUT ADJUST trims, 0 = fully CCW, 1 = fully CW
  log: [],
};
const FACT = JSON.parse(JSON.stringify(D));

/* ---------------- gain maths straight from the schematic ---------------- */
// POD1-2 U3A: inverting, R9 in, feedback R11 in parallel with a T: R12 from the summing node to the RV2 wiper,
// RV2 ccw end on the output, CW end on GND. f = trim position (0 = CCW, 1 = CW).
function gainBU(f){
  const Ra = Math.max(1e-3, f*V.RV), Rb = Math.max(1e-3, (1-f)*V.RV);
  const k = (1/Ra)/(1/Ra + 1/Rb + 1/V.R12);            // wiper voltage / output voltage
  return (1/V.R9)/(1/V.R11 + k/V.R12);                  // |Vo / Vin| of the U3A stage
}
// POD1-3 U1A: inverting, R5 in, feedback T: R9 (47K5) from the summing node to node M, R13 (2K21) from M to the output,
// shunt from M to GND = R11 (301R) + the RV1 track (wiper tied to bw, CW end on GND). CW = less shunt = more gain.
function gainUB(f){ const Rsh = V.R11b + (1-f)*V.RVb; return (V.R9b + V.R13 + V.R9b*V.R13/Rsh)/V.R5; }
const dB = g => 20*Math.log10(g);

/* rails at time t (power-up ramp; time constants inferred: NFM-10-5 start-up ~20 ms, SUW1R5 soft start ~5 ms) */
function railAt(t){
  if (!D.power) return 0;
  if (D.psu==='bom') return 0;                          // 12 V-input converter on a 5 V bus never starts (inferred)
  if (D.powerAt<0 || t<D.powerAt) return D.powerAt<0 ? V.rail : 0;
  const dt=t-D.powerAt-0.020; return dt<=0?0: V.rail*(1-Math.exp(-dt/0.004));
}
function dcAt(t){ if (!D.power) return 0; if (D.powerAt<0 || t<D.powerAt) return D.powerAt<0?5:0; const dt=t-D.powerAt; return dt<0.004?0:5*(1-Math.exp(-(dt-0.004)/0.004)); }
const swing = t => Math.max(0, railAt(t)-V.swingLoss);
const hclip = (v,l) => clamp(v,-l,l);

/* ---------------- channel model ---------------- */
// trims as the operator sees them (ISS2 prototype: level controls L/R reversed per the test report)
function tU(ch){ const sw = D.rev==='ISS2'; return D.trim[(ch^(sw?1:0))?'uR':'uL']; }
function tB(ch){ return D.trim[ch?'bR':'bL']; }
function balInV(ch){ const p = ch? D.plug.balR : D.plug.balL; return p ? dbu2v(D.gen.bal)*Math.SQRT2 : 0; }  // differential peak
function unbInV(ch){ const p = ch? D.plug.unbR : D.plug.unbL; return p ? dbu2v(D.gen.unb)*Math.SQRT2 : 0; }
const w = t => Math.sin(2*Math.PI*D.gen.f*t);
// bal -> unbal: returns stage voltages at time t for output channel ch
function BU(ch, t){
  const src = D.rev==='ISS2' ? 1-ch : ch;                // ISS2: inputs L/R reversed (test report)
  const vin = balInV(src)*w(t), lim = swing(t);
  const ssm = hclip(-V.ssmGain*vin, lim);               // "+" leg wired to SSM2143 IN-: receiver inverts
  const u3 = hclip(-gainBU(tU(ch))*ssm, lim);           // U3A inverts again -> in phase overall
  const out = (D.rev==='ISS2'? -1:1) * u3 * D.loadU/(D.loadU+V.Rout2);   // ISS2: output out of phase (test report)
  return { vin, ssm, u3, out };
}
// unbal -> bal
function UB(ch, t){
  const vin = unbInV(ch)*w(t), lim = swing(t);
  const n = hclip(-gainUB(tB(ch))*vin, lim);             // U1A output -> OUT_x_N (XLR pin 3)
  const p = hclip(-n*V.R18/V.R15, lim);                  // U1B unity inverter -> OUT_x_P (XLR pin 2)
  const diff = (p-n) * D.loadB/(D.loadB+2*V.Rout3);
  return { vin, n, p, diff };
}
// steady-state levels (dBu rms) and clip points, for the stage tables
function levelsBU(ch){
  const src = D.rev==='ISS2' ? 1-ch : ch, on = D.rev==='ISS2' ? (src? D.plug.balR:D.plug.balL) : (ch? D.plug.balR:D.plug.balL);
  const inL = on? D.gen.bal : -200, g = gainBU(tU(ch)), lim = swing(1)/Math.SQRT2, lc = v2dbu(lim);
  const ssm = inL + dB(V.ssmGain), u3 = ssm + dB(g), out = u3 + dB(D.loadU/(D.loadU+V.Rout2));
  return { stages:[
    {name:'BALANCED INPUT (XLR, female)', lvl:inL, gain:null, clip: lc - dB(V.ssmGain), note:'differential; SSM2143 input range sets the limit'},
    {name:'U1/U2 SSM2143 receiver', lvl:ssm, gain:dB(V.ssmGain), clip:lc, note:'−6 dB, inverts (the + leg goes to IN−)'},
    {name:'C5 68 µF + R9 8K06 → U3A NE5532', lvl:u3, gain:dB(g), clip:lc, note:`T-network trim: ${dB(gainBU(0)).toFixed(1)} … ${fdb(dB(gainBU(1)))} dB; HPF ${(1/(2*Math.PI*V.R9*V.C5)).toFixed(2)} Hz`},
    {name:'R15 30R → UNBALANCED OUT (RCA)', lvl:out, gain:dB(D.loadU/(D.loadU+V.Rout2)), clip:lc + dB(D.loadU/(D.loadU+V.Rout2)), note:`into ${D.loadU>=1e5?'open circuit':D.loadU+' Ω'}`},
  ], out, total: out-inL, clip: out>lc+0.01 || ssm>lc+0.01 };
}
function levelsUB(ch){
  const on = ch? D.plug.unbR : D.plug.unbL, inL = on? D.gen.unb : -200, g = gainUB(tB(ch)), lim = swing(1)/Math.SQRT2, lc=v2dbu(lim);
  const n = inL + dB(g), diff = n + 6.0206, out = diff + dB(D.loadB/(D.loadB+2*V.Rout3));
  return { stages:[
    {name:'UNBALANCED INPUT (RCA)', lvl:inL, gain:null, clip:null, note:'Zin ≈ R5 = 47K5 (R7 100K sits on the virtual-earth side of C1)'},
    {name:'U1A NE5532 inverting, T-network trim', lvl:n, gain:dB(g), clip:lc, note:`${fdb(dB(gainUB(0)))} … ${fdb(dB(gainUB(1)))} dB per leg → OUT_N`},
    {name:'U1B unity inverter (4K75/4K75) → OUT_P', lvl:diff, gain:6.02, clip:lc+6.02, note:'two legs in anti-phase: +6 dB differential'},
    {name:'2 × 30R → BALANCED OUT (XLR, male)', lvl:out, gain:dB(D.loadB/(D.loadB+2*V.Rout3)), clip:lc+6.02+dB(D.loadB/(D.loadB+2*V.Rout3)), note:`60 Ω balanced source into ${D.loadB>=1e5?'open circuit':D.loadB+' Ω'}`},
  ], out, total: out-inL, clip: n>lc+0.01 };
}

/* ---------------- actions ---------------- */
const act = makeActor(D, ()=>`UNBAL OUT L ${fdb(levelsBU(0).out)} dBu · BAL OUT L ${fdb(levelsUB(0).out)} dBu`);
const TRIMNAME = {uL:'UNBALANCED L (POD1-2 RV2)', uR:'UNBALANCED R (POD1-2 RV1)', bL:'BALANCED L (POD1-3 RV1)', bR:'BALANCED R (POD1-3 RV2)'};
const A = {
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{
    D.power=!D.power;
    if (D.power){ D.powerAt=SIM.t; tr('Rocker closes the mains to P1/P2 → PSU1 NFM-10-5 (AC in, 5 V out) → DC+ with C1–C6 5 × 68 µF');
      tr('LED1 (green, through R1 332R) lights from DC+ — the front power tally'); tr('PSU2 SUW1R5 DC-DC → VCC+12 / VCC-12 for both sub-boards (headers H2/H4 pins 1–2)');
      tr(D.psu==='bom'? 'Per the BOM the converter is SUW1R5-1212 (12 V input) — on a 5 V bus it does not start: the LED lights but the audio is dead ('+'inferred'+')' : 'Scrub forward ~30 ms from the playhead to watch the rails come up');
    } else tr('Mains removed: DC+ and the ±12 V rails collapse; all outputs go silent');
  }); },
  trim(k, dir){ act(`Turn ${TRIMNAME[k]} ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    const o=D.trim[k]; D.trim[k]=clamp(+(o+dir*0.04).toFixed(3),0,1);
    if (k[0]==='u'){ const g0=gainBU(o), g1=gainBU(D.trim[k]);
      tr(`RV wiper moves ${Math.round(o*100)}% → ${Math.round(D.trim[k]*100)}% of travel: the T-network (R11 15K ∥ [R12 2K into the wiper]) changes U3A's feedback`);
      tr(`U3A gain ${fdb(dB(g0))} → ${fdb(dB(g1))} dB; with the SSM2143's −6 dB the bal→unbal path is ${fdb(dB(g1)-6.02)} dB`);
      if (D.rev==='ISS2') tr('ISS2 prototype: this knob acts on the other channel (test report: “Level control L&R reversed”)');
    } else { const g0=gainUB(o), g1=gainUB(D.trim[k]);
      tr(`RV wiper ${Math.round(o*100)}% → ${Math.round(D.trim[k]*100)}%: shunt from node M to GND = 301R + ${Math.round((1-D.trim[k])*5000)} Ω`);
      tr(`U1A gain ${fdb(dB(g0))} → ${fdb(dB(g1))} dB per leg; balanced output (U1A − U1B) ${fdb(dB(g1)+6.02)} dB re the RCA input`); }
  }); },
  plug(k){ act(`${D.plug[k]?'Unplug':'Plug in'} ${({balL:'BALANCED INPUT LEFT',balR:'BALANCED INPUT RIGHT',unbL:'UNBALANCED IN (white, L)',unbR:'UNBALANCED IN (red, R)'})[k]}`, tr=>{
    D.plug[k]=!D.plug[k]; tr(D.plug[k]? 'Source connected: the generator level reaches the input stage' : 'Input open: the stage sees only its own noise (R7 100K / SSM2143 inputs float to ground)'); }); },
  setGen(key,val){ act(`Generator ${key==='f'?'frequency':key==='bal'?'balanced level':'consumer level'} → ${val}${key==='f'?' Hz':' dBu'}`, tr=>{ D.gen[key]=val; tr('The test source feeding the rear inputs changes; every stage level follows'); }); },
  setLoad(key,val){ act(`${key==='loadU'?'Unbalanced':'Balanced'} output load → ${val>=1e5?'open':val+' Ω'}`, tr=>{ D[key]=val; tr(`Output build-out resistors (${key==='loadU'?'R15/R16 30R':'2 × 30R per channel'}) form a divider with the load`); }); },
  setRev(r){ act(`Board issue → ${r}`, tr=>{ D.rev=r; if (r==='ISS2') { tr('Prototype faults from POD1-04NOV13.pdf: bal→unbal output out of phase, input L/R reversed, level control L/R reversed'); } else tr('ISS3 schematic (8/10/2015): + leg into SSM2143 IN−, then the inverting NE5532 → in phase; channels straight'); }); },
  setPsu(p){ act(`Power supply → ${p==='bom'?'as the BOM lists it (SUW1R5-1212 on 5 V)':'as designed (±12 V)'}`, tr=>{ D.psu=p; tr(p==='bom'?'SUW1R5-1212 wants 12 V in; NFM-10-5 gives 5 V. The converter stays off ('+inf+'), so the op-amps have no rails':'Rails ±12 V: NE5532 and SSM2143 swing to about ±10.5 V'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};

/* ---------------- panels (real silkscreen: POD1-FRONT&REAR-SILK(CURVE) .pdf, cut at 200 dpi) ---------------- */
const TRIMXY = { uL:[791,195], uR:[990,195], bL:[1316,195], bR:[1514,195] };
function frontSVG(t){
  const on = D.power && dcAt(t)>3;
  let over = rocker(D.power) + pled(on);
  for (const k in TRIMXY) over += trim(TRIMXY[k][0], TRIMXY[k][1], D.trim[k], 'tr-'+k, 'OUTPUT ADJUST '+TRIMNAME[k]);
  return panelSVG(PREFIX,'front',{over},'POD1 front panel (CorelDRAW silk artwork)');
}
function rearSVG(){
  let over = xlr(209,155,true,false,'','BALANCED OUTPUT LEFT (NC3MD-H, male)') + xlr(448,155,true,false,'','BALANCED OUTPUT RIGHT (male)')
    + rca(650,98,'#c8312a',D.plug.unbR,'pl-unbR','UNBALANCED IN, right (red) — click to plug/unplug') + rca(650,208,'#eeeeee',D.plug.unbL,'pl-unbL','UNBALANCED IN, left (white) — click')
    + rca(759,98,'#c8312a',false,'','UNBALANCED OUT, right') + rca(759,208,'#eeeeee',false,'','UNBALANCED OUT, left')
    + xlr(930,155,false,D.plug.balL,'pl-balL','BALANCED INPUT LEFT (NC3FD-H, female) — click to plug/unplug') + xlr(1168,155,false,D.plug.balR,'pl-balR','BALANCED INPUT RIGHT — click')
    + iec(1385,28,1611,252);
  return panelSVG(PREFIX,'rear',{under:'',over},'POD1 rear panel (CorelDRAW silk artwork)');
}
function bindPanel(root){
  const p=root.querySelector('.pwr'); if (p) p.onclick=()=>A.power();
  for (const k in TRIMXY) bindTrim(root, 'tr-'+k, d=>A.trim(k,d));
  ['balL','balR','unbL','unbR'].forEach(k=> root.querySelectorAll('.pl-'+k).forEach(g=>g.onclick=()=>A.plug(k)));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px" class="small">
    <label>Balanced source <input id="gB" type="number" step="1" value="${D.gen.bal}" style="width:70px"> dBu</label>
    <label>Consumer source <input id="gU" type="number" step="1" value="${D.gen.unb}" style="width:70px"> dBu</label>
    <label>Tone <select id="gF">${[100,400,1000,10000].map(f=>`<option ${f===D.gen.f?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
    <label>Unbal load <select id="lU">${[[1e6,'open'],[10000,'10 kΩ'],[600,'600 Ω']].map(([v,l])=>`<option value="${v}" ${v===D.loadU?'selected':''}>${l}</option>`).join('')}</select></label>
    <label>Bal load <select id="lB">${[[1e6,'open'],[10000,'10 kΩ'],[600,'600 Ω']].map(([v,l])=>`<option value="${v}" ${v===D.loadB?'selected':''}>${l}</option>`).join('')}</select></label>
    <label>Board <select id="rv"><option value="ISS3" ${D.rev==='ISS3'?'selected':''}>ISS3 (as drawn)</option><option value="ISS2" ${D.rev==='ISS2'?'selected':''}>ISS2 prototype (Nov 2013 faults)</option></select></label>
    <label>PSU <select id="ps"><option value="design" ${D.psu==='design'?'selected':''}>as designed (±12 V)</option><option value="bom" ${D.psu==='bom'?'selected':''}>as the BOM lists it</option></select></label>
  </div><div class="small muted" style="margin-top:4px">Click a trim's right half to turn it clockwise, left half counter-clockwise (or use the wheel). Keys: Q/W unbal L, E/R unbal R, A/S bal L, D/F bal R. Click rear inputs to plug or unplug.</div>`;
}
function bindControls(root){
  const g=id=>root.querySelector(id);
  if (!g('#gB')) return;
  g('#gB').onchange=e=>A.setGen('bal',+e.target.value); g('#gU').onchange=e=>A.setGen('unb',+e.target.value); g('#gF').onchange=e=>A.setGen('f',+e.target.value);
  g('#lU').onchange=e=>A.setLoad('loadU',+e.target.value); g('#lB').onchange=e=>A.setLoad('loadB',+e.target.value);
  g('#rv').onchange=e=>A.setRev(e.target.value); g('#ps').onchange=e=>A.setPsu(e.target.value);
}
bindKeys('__pod1Active', ()=>({q:()=>A.trim('uL',-1),w:()=>A.trim('uL',1),e:()=>A.trim('uR',-1),r:()=>A.trim('uR',1),a:()=>A.trim('bL',-1),s:()=>A.trim('bL',1),d:()=>A.trim('bR',-1),f:()=>A.trim('bR',1)}));

/* ---------------- timeline ---------------- */
const dense = (span,pw)=> span*D.gen.f > pw/3;
function lanes(){
  const vm = -0.05, a=SIM.css('--accent'), b=SIM.css('--accent2'), r=SIM.css('--bad'), wn=SIM.css('--warn');
  const envOf = fn => { const e = t => { let m=0; const P=1/D.gen.f; for (let i=0;i<8;i++) m=Math.max(m, Math.abs(fn(t+P*i/8))); return m; }; e.dense=dense; return e; };
  const lim = t=>swing(t);
  return [
    { label:'Mains / power', h:22, draw(c,X,t0,t1,y,h){ if(!D.power){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('rocker off', X(t0)+6, y+15); return; } SIM.pulses(c,X,t0,t1,y,h,1/60,0,1/120,SIM.css('--ink2'),'mains half-cycles into NFM-10-5'); } },
    waveLane('DC+ (NFM-10-5, 5 V)', t=>dcAt(t), 6, null, wn, 26),
    waveLane('VCC±12 (SUW1R5)', t=>railAt(t), 13, null, wn, 26),
    waveLane('XLR IN L (diff.)', t=>BU(0,t).vin, vm, null, b, 38, envOf(t=>BU(0,t).vin)),
    waveLane('SSM2143 out (−6 dB)', t=>BU(0,t).ssm, vm, null, a, 38, envOf(t=>BU(0,t).ssm)),
    waveLane('U3A → RCA OUT L', t=>BU(0,t).out, vm, swing(1), a, 40, envOf(t=>BU(0,t).out)),
    waveLane('RCA IN L', t=>UB(0,t).vin, vm, null, b, 38, envOf(t=>UB(0,t).vin)),
    waveLane('U1A → XLR pin 3 (OUT_N)', t=>UB(0,t).n, vm, swing(1), r, 38, envOf(t=>UB(0,t).n)),
    waveLane('U1B → XLR pin 2 (OUT_P)', t=>UB(0,t).p, vm, swing(1), a, 38, envOf(t=>UB(0,t).p)),
    waveLane('XLR OUT L (pin 2 − pin 3)', t=>UB(0,t).diff, vm, 2*swing(1), a, 44, envOf(t=>UB(0,t).diff)),
    boolLane('Power LED (LED1 via R1 332R)', t=>dcAt(t)>3, '#9be35a'),
  ];
}

/* ---------------- views ---------------- */
function levelsCard(){
  const s = ['L','R'].map((n,ch)=>{ const a=levelsBU(ch), b=levelsUB(ch); const body=`<h3>${n}: balanced → unbalanced (POD1-2) · total ${a.total<-150?'—':fdb(a.total)+' dB'}</h3>${stageTable(a.stages)}<h3>${n}: unbalanced → balanced (POD1-3) · total ${b.total<-150?'—':fdb(b.total)+' dB'}</h3>${stageTable(b.stages)}`; return ch? `<details><summary class="small">Right channel (same circuit, its own trims)</summary>${body}</details>` : body; }).join('');
  return s + `<p class="small muted">Clip points use ±${V.rail} V rails less ${V.swingLoss} V of output swing loss (${inf}, NE5532/SSM2143 typical). The 4 Nov 2013 test measured +19.35 dBu max out (bal→unbal) and +25.5 dBu (unbal→bal); the model gives ${fdb(v2dbu((V.rail-V.swingLoss)/Math.SQRT2))} and ${fdb(v2dbu((V.rail-V.swingLoss)/Math.SQRT2)+6.02)} dBu.</p>`;
}
function viewSim(m){
  window.__pod1Active = true;
  m.innerHTML = `<div class="grid2"><div>
      ${card('Front panel at the playhead', `<div id="fp"></div>${controlsHTML()}`)}
      ${card('Rear panel — click the inputs to plug or unplug', `<div id="rp"></div><div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src('#POD #SERIES/POD1 - #Master/POD1 - #SILK/POD1-FRONT&REAR-SILK(CURVE) .cdr', 'POD1-FRONT&REAR-SILK(CURVE) .cdr')} (2015-09-30|48), CorelDRAW silk plates in their real inks.</div>`)}
    </div><div>
      ${card('What the circuit did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('Outputs now', `<div id="now"></div>`)}
    </div></div>
    ${card('Timeline — one second, zoomable (click to seek). Zoom to 1 ms to see single cycles; scrub after a power-on to see the rails rise.', `<canvas id="tl"></canvas>`)}
    <div class="grid2">${card('Level through every stage', `<div id="lv"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Turn an OUTPUT ADJUST trim, flip the rocker or plug an input. The circuit path is listed here.');
    const row=(n,l)=>`<tr><th>${n}</th><td class="mono">${l.out<-150?'— (no input)':fdb(l.out)+' dBu'} ${l.out>-150?`(${fdb(l.out-2.2)} dBV)`:''} ${l.clip?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>`;
    m.querySelector('#now').innerHTML=`<table class="kv">${row('UNBALANCED OUT L',levelsBU(0))}${row('UNBALANCED OUT R',levelsBU(1))}${row('BALANCED OUT L',levelsUB(0))}${row('BALANCED OUT R',levelsUB(1))}
      <tr><th>Rails at playhead</th><td class="mono">DC+ ${dcAt(t).toFixed(2)} V · ±${railAt(t).toFixed(2)} V</td></tr><tr><th>Board / PSU</th><td class="mono">${D.rev} · ${D.psu==='bom'?'BOM part (dead)':'±12 V'}</td></tr></table>`;
    m.querySelector('#lv').innerHTML=levelsCard();
    m.querySelector('#log').innerHTML=logHTML(D);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
  };
  bindControls(m);
  SIM.on('time', draw);
}

const LESSONS = [
  { title:'Meet the POD1', body:`<p>POD1 is a <b>bi-directional audio interface</b>. It works in two directions at once: a <b>balanced</b> professional feed (XLR, +4 dBu) comes out as a <b>consumer</b> unbalanced feed (RCA, −10 dBV), and a consumer feed comes out as a balanced one. Each direction is stereo and has its own <b>OUTPUT ADJUST</b> trims on the front.</p><p>Inside are three boards: the POD1-1 main board (power and connectors), POD1-2 (balanced → unbalanced) and POD1-3 (unbalanced → balanced).</p><p class="muted">No POD1 manual is in the archive; these steps follow the front/rear silkscreen, the sister POD18 manual and the 4 Nov 2013|46 test sheet.</p>`, check:()=>true, auto:true },
  { title:'1 · Power up', body:`<p>Click the <b>rocker</b>. The green LED shows that the 5 V supply (NFM-10-5) is up. A DC-DC converter then makes ±12 V for the op-amps.</p><p><b>Goal:</b> the unit is on.</p>`, check:()=>D.power, hint:'Click the rocker on the left of the front panel.' },
  { title:'2 · Connect the sources', body:`<p>On the rear, a balanced source goes into <b>BALANCED INPUTS LEFT/RIGHT</b> (female XLRs). A consumer deck goes into <b>UNBALANCED IN</b> (white = left, red = right).</p><p><b>Goal:</b> all four inputs connected.</p>`, check:()=>D.plug.balL&&D.plug.balR&&D.plug.unbL&&D.plug.unbR, hint:'Click any rear input that has no blue plug in it.' },
  { title:'3 · Line up the consumer output (left)', body:`<p>The balanced source is at <b>+4 dBu</b>. The consumer machine wants <b>−10 dBV</b>, which is −7.8 dBu.</p><p>Turn <b>UNBALANCED L</b> until UNBALANCED OUT L reads −7.8 dBu (±0.5 dB). The bal→unbal gain range is about −19 to −0.6 dB.</p>`, check:()=>Math.abs(levelsBU(0).out+7.8)<=0.5&&D.gen.bal===4, hint:'Q / W keys, or click the left/right half of the first trim. Keep the balanced source at +4 dBu.' },
  { title:'4 · Same for the right', body:`<p>Set <b>UNBALANCED R</b> the same way, so left and right match.</p>`, check:()=>Math.abs(levelsBU(1).out+7.8)<=0.5&&D.gen.bal===4, hint:'E / R keys.' },
  { title:'5 · Line up the balanced output', body:`<p>The consumer source is at −10 dBV (−7.8 dBu). Set <b>BALANCED L</b> and <b>BALANCED R</b> so both BALANCED OUTs read <b>+4 dBu</b> (±0.5 dB) into 600 Ω.</p><p>The unbal→bal path has gain +9.3 to +24.5 dB. Part of that is a fixed +6 dB, which comes from driving the two legs in anti-phase.</p>`, check:()=>Math.abs(levelsUB(0).out-4)<=0.5&&Math.abs(levelsUB(1).out-4)<=0.5&&D.gen.unb===-7.8&&D.loadB===600, hint:'A/S for left, D/F for right. Keep the consumer source at −7.8 dBu and the balanced load at 600 Ω.' },
  { title:'6 · Find the headroom', body:`<p>Raise the <b>balanced source</b> towards +24 dBu and watch the timeline and the level table. The NE5532 output stage clips at about +19.6 dBu, because the rails are only ±12 V. The test sheet measured +19.35 dBu.</p><p><b>Goal:</b> make UNBALANCED OUT L clip.</p>`, check:()=>levelsBU(0).clip, hint:'Type 24 into “Balanced source”. Zoom the timeline to 1 ms to see the flat tops.' },
  { title:'7 · The prototype faults', body:`<p>Set <b>Board</b> to “ISS2 prototype”. This reproduces what the 4 Nov 2013 test found: output <b>out of phase</b>, inputs <b>L/R reversed</b>, level controls <b>L/R reversed</b>. Compare the XLR IN and RCA OUT lanes: the output is now upside down.</p><p><b>Goal:</b> view the ISS2 faults, then go back to ISS3.</p>`, check:()=>D.log.some(e=>e.name.includes('ISS2'))&&D.rev==='ISS3', hint:'Use the “Board” menu under the front panel.' },
  { title:'Done', body:`<p>You have used every control on the POD1. <b>Software</b> shows the signal path stage by stage with the gain formulas, <b>Schematics</b> has redrawn sheets of the three boards, and <b>Findings</b> lists what the archive shows about this design.</p>`, check:()=>true, auto:true },
];
let lessonIdx=0;
function viewTutorial(m){
  window.__pod1Active = true;
  tutorialView(m, { title:'Tutorial — lining up a POD1', lessons:LESSONS, D, getIdx:()=>lessonIdx, setIdx:i=>lessonIdx=i, reset:()=>A.reset(),
    unitHTML:()=>`<div id="fp">${frontSVG(SIM.t)}</div><div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${['L','R'].map((n,c)=>`<span class="chip mono">UNBAL OUT ${n} ${fdb(levelsBU(c).out)} dBu</span><span class="chip mono">BAL OUT ${n} ${fdb(levelsUB(c).out)} dBu</span>`).join('')}</div>`,
    bind:root=>{ bindPanel(root); bindControls(root); } });
}

function viewSecond(m){
  window.__pod1Active = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('As seen by the circuit at the playhead', `<div id="dev"></div>`)}${card('As seen by the outside world', `<div id="fp"></div><h3>Downstream meters (dBu, 1-cycle peak → rms)</h3><canvas id="meter"></canvas>`)}</div>
    ${card('Zoom ladder at the playhead — XLR OUT L', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{
    const t=SIM.t, f=D.gen.f;
    const fc1 = 1/(2*Math.PI*V.R9*V.C5), fc2 = 1/(2*Math.PI*V.R5*V.C1), fp = 1/(2*Math.PI*V.R11*27e-12), fp3 = 1/(2*Math.PI*(V.R9b+V.R13)*15e-12);
    const rows=[
      ['Test-tone cycles', f.toLocaleString(), SIM.fmtDur(1/f), 'Every stage passes the tone; nothing is sampled — it is a continuous analog path'],
      ['Mains cycles (60 Hz)', '60', SIM.fmtDur(1/60), 'Into PSU1 NFM-10-5, a switch-mode module: no 120 Hz ripple reaches the audio rails (unlike the POD18 transformer supply)'],
      ['Rails rising after power-on', '—', '≈ 25 ms '+inf, 'NFM start-up then SUW1R5 soft start; the op-amps follow the rails'],
      ['POD1-2 coupling HPF (C5·R9)', '—', SIM.fmtDur(V.R9*V.C5), `−3 dB at ${fc1.toFixed(2)} Hz: settles over the first second after power-on`],
      ['POD1-3 coupling HPF (C1·R5)', '—', SIM.fmtDur(V.R5*V.C1), `−3 dB at ${fc2.toFixed(3)} Hz`],
      ['U3A feedback pole (R11·C8 27 pF)', '—', SIM.fmtDur(V.R11*27e-12), `≈ ${(fp/1000).toFixed(0)} kHz roll-off: stability, far above audio`],
      ['U1A feedback pole (C5 15 pF)', '—', SIM.fmtDur((V.R9b+V.R13)*15e-12), `≈ ${(fp3/1000).toFixed(0)} kHz`],
      ['NE5532 slew at full swing', '—', '9 V/µs', `full-power bandwidth ≈ ${(9e6/(2*Math.PI*(V.rail-V.swingLoss))/1000).toFixed(0)} kHz`],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period / τ</th><th>what it means</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const bu=BU(0,t), ub=UB(0,t);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)} · cycle ${Math.floor(t*f).toLocaleString()} · phase ${((t*f%1)*360).toFixed(0)}°</td></tr>
      <tr><th>Rails</th><td class="mono">DC+ ${dcAt(t).toFixed(2)} V · VCC±12 = ±${railAt(t).toFixed(2)} V</td></tr>
      <tr><th>POD1-2 (L)</th><td class="mono">XLR in ${bu.vin.toFixed(3)} V → SSM2143 ${bu.ssm.toFixed(3)} V → U3A ${bu.u3.toFixed(3)} V → RCA ${bu.out.toFixed(3)} V</td></tr>
      <tr><th>POD1-3 (L)</th><td class="mono">RCA in ${ub.vin.toFixed(3)} V → U1A (pin 3) ${ub.n.toFixed(3)} V · U1B (pin 2) ${ub.p.toFixed(3)} V → XLR ${ub.diff.toFixed(3)} V diff.</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    const {c,w}=SIM.canvas(m.querySelector('#meter'), 130);
    const outs=[['UNBAL L',tt=>BU(0,tt).out],['UNBAL R',tt=>BU(1,tt).out],['BAL L',tt=>UB(0,tt).diff],['BAL R',tt=>UB(1,tt).diff]];
    outs.forEach(([n,fn],i)=>{ let pk=0; const P=1/f; for(let k=0;k<32;k++) pk=Math.max(pk,Math.abs(fn(t-P*k/32))); const d=v2dbu(pk/Math.SQRT2), segs=40, lit=Math.round(clamp((d+30)/58,0,1)*segs);
      for(let s=0;s<segs;s++){ const x=90+s*(w-100)/segs; c.fillStyle= s<lit ? (s>=segs-6?'#e3453a':s>=segs-14?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); c.fillRect(x, 6+i*31, (w-100)/segs-2, 22); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(n+' '+(d>-150?fdb(d):'—'), 4, 21+i*31); });
    drawLadder(m.querySelector('#zl'), t, [['1 second',1],['100 ms',0.1],['10 ms',0.01],['1 tone cycle',1/f],['50 µs',5e-5]], tt=>UB(0,tt).diff, -0.05, 'XLR OUT L, volts');
  };
  SIM.on('time', draw);
}

const BLOCKS = {
  ac:{x:20,y:20,w:160,h:70,t:'AC inlet + rocker',s:['723W fuse holder, ½ A','R1966 rocker'],d:'IEC inlet/fuse holder 723W-X2/02 with a 0.5 A slow-blow fuse; the rocker switches the line into P1/P2 (Panduit MLSS-156) on the main board.'},
  psu:{x:20,y:120,w:160,h:80,t:'PSU1 NFM-10-5',s:['AC → 5 V (DC+)','alt. footprint PSU3 VAF1005','C1–C6 5 × 68 µF'],d:'POD1-1 main board. A 10 W AC/DC module gives DC+ (5 V). The schematic has a second footprint, PSU3 VAF1005, as an alternative part. LED1 (green, R1 332R) on DC+ is the front power tally.'},
  dc:{x:20,y:230,w:160,h:70,t:'PSU2 SUW1R5',s:['DC+ → VCC±12','to H2 / H4'],d:'1.5 W isolated DC-DC with ±12 V outputs, decoupled by C7/C8 100 nF. The BOM calls it SUW1R5-1212, which is a 12 V-input part (see Findings).'},
  bin:{x:230,y:20,w:160,h:70,t:'BALANCED INPUTS',s:['XLR1/2 NC3FD-H','IN A+ / IN/OUT A−'],d:'Female XLRs on the main board. Their pins carry IN x+ and the shared IN/OUT x− net to headers H1/H3.'},
  p2:{x:230,y:120,w:200,h:110,t:'POD1-2 bal → unbal',s:['U1/U2 SSM2143 (−6 dB)','C5/C6 68 µF, R9/R10 8K06','U3 NE5532 inverting','RV1/RV2 5K trims (T-network)','R15/R16 30R → HDR Out'],d:'Balanced-Unbalanced.SchDoc, ISS3. Differential receiver, then an inverting gain stage whose feedback is R11 15K in parallel with a T made of R12 2K and the 5K trim. Gain range about −19 to −0.6 dB overall.'},
  uout:{x:470,y:120,w:150,h:70,t:'UNBALANCED OUT',s:['RCA1B (quad RCA)','IN/OUT C, D'],d:'The quad RCA socket 04P0605 (RCJ-43). Two of its jacks are outputs fed from POD1-2 through H2.'},
  uin:{x:230,y:260,w:160,h:70,t:'UNBALANCED IN',s:['RCA1A','IN/OUT A, B'],d:'The other two RCA jacks feed POD1-3 through H3/H4.'},
  p3:{x:230,y:350,w:200,h:110,t:'POD1-3 unbal → bal',s:['R5 47K5 in, C1 68 µF','U1A NE5532 inverting + T','U1B unity inverter','RV 5K + 301R shunt','4 × 30R1 build-out'],d:'Unbalanced-Balanced.SchDoc, ISS3. Inverting stage with a T feedback network (47K5 + 2K21, shunt 301R + trim) gives +3.3 to +18.5 dB per leg; a unity inverter makes the other leg, so the balanced output gains another +6 dB. U3 (mono sum) and the stand-alone parts are DNI in POD1.'},
  bout:{x:470,y:370,w:150,h:70,t:'BALANCED OUTPUTS',s:['XLR3/4 NC3MD-H','pin 2 = OUT_P, pin 3 = OUT_N'],d:'Male XLRs. 60 Ω balanced source (2 × 30R).'},
  front:{x:470,y:20,w:150,h:80,t:'Front panel',s:['rocker · power LED','4 × OUTPUT ADJUST'],d:'The four trimmers are on the sub-boards and are reached through holes in the front panel. A drafting note on the POD1-3 sheet asks for a pot footprint with the back-wiper pin on the far side, so the pot can be mounted on the underside of the board.'},
};
const WIRES=[['ac','psu','L/N'],['psu','dc','DC+ 5 V'],['dc','p2','±12 V'],['dc','p3','±12 V'],['bin','p2','H1'],['p2','uout','H2'],['uin','p3','H3/H4'],['p3','bout','H3'],['front','p2','trims'],['front','p3','']];
function viewBlock(m){ window.__pod1Active=false; blockView(m, BLOCKS, WIRES, 'p2', [640,470], card('In one sentence', `<p>Mains → 5 V → ±12 V powers two independent stereo paths: <b>balanced → unbalanced</b> (receiver −6 dB, then an adjustable inverting stage) and <b>unbalanced → balanced</b> (adjustable inverting stage, then a unity inverter for the second leg).</p>`)); }

const SHEETS = [
  { name:'1 · POD1-2 bal→unbal (ch. A)', note:'From Balanced-Unbalanced.pdf (POD1-2 ISS3). Channel B (U2, U3B, R10, R13, R14, C6, C9, RV1) is identical. Note the cross labels: the channel-A receiver is fed by PHX IN B+ / HDR IN A+ and drives Jack Out B / HDR Out A.', svg:()=>
    net(40,120,'HDR IN A+ / PHX IN B+')+wire([[150,120],[200,120]])+net(40,180,'HDR IN A− / PHX IN B−')+wire([[150,180],[200,180]])
    +chip(200,95,110,'U1 SSM2143',[['IN− (2)',''],['IN+ (3)',''],['REF (1)','GND']],[['VOUT (6)',''],['SENSE (5)',''],['V± (7/4)','±12']],'−6 dB receiver')
    +wire([[344,117],[380,117]])+res(380,117,450,117,'R9','8K06')+cap(450,117,500,117,'C5','68µ/10V')+wire([[500,117],[540,117],[540,140]])
    +opamp(540,152,'U3A NE5532')+wire([[540,164],[530,164],[530,190]])+gnd(530,190)
    +wire([[540,140],[540,60],[560,60]])+res(560,60,640,60,'R11','15K')+wire([[640,60],[660,60],[660,152]])+cap(560,30,640,30,'C8','27p')+wire([[540,60],[540,30],[560,30]])+wire([[640,30],[660,30],[660,60]])
    +wire([[600,152],[660,152]])+res(660,152,730,152,'R15','30R')+net(735,152,'Jack Out B / HDR Out A')
    +wire([[540,140],[520,140],[520,260],[560,260]])+res(560,260,630,260,'R12','2K')+wire([[630,260],[680,260]])+res(680,200,680,320,'RV2','5K')+wire([[660,152],[680,152],[680,200]])+wire([[680,320],[680,340]])+gnd(680,340)
    +txt(700,262,'wiper ← R12',10,'var(--ink2)')+txt(60,400,`|G(U3A)| = (1/R9) / (1/R11 + k/R12), k = wiper/output ratio → ${dB(gainBU(0)).toFixed(1)} … ${fdb(dB(gainBU(1)))} dB`,11.5)
    +txt(60,420,'Overall: −6.02 dB + U3A = −19.2 … −0.6 dB (test sheet: −19.5 … −0.5 dB)',11.5) },
  { name:'2 · POD1-3 unbal→bal (ch. A)', note:'From Unbalanced-Balanced.pdf (POD1-3 ISS3). Channel B uses U2A/U2B. U3 (mono sum: R25/R27 20K into a 10K inverting summer, then a 10K/10K inverter to MONO_P/N) is fitted only in the stand-alone build.', svg:()=>
    net(30,140,'JACK A / HDR IN A')+wire([[130,140],[150,140]])+res(150,140,220,140,'R5','47K5')+wire([[220,140],[250,140]])+dot(240,140)+res(240,140,240,210,'R7','100K')+gnd(240,210)
    +cap(250,140,300,140,'C1','68µ/10V')+wire([[300,140],[330,140]])+opamp(330,152,'U1A NE5532')+wire([[330,164],[320,164],[320,190]])+gnd(320,190)
    +wire([[330,140],[330,70],[350,70]])+res(350,70,420,70,'R9','47K5')+wire([[420,70],[440,70]])+dot(440,70)+res(440,70,510,70,'R13','2K21')+wire([[510,70],[530,70],[530,152]])+wire([[390,152],[600,152]])
    +res(440,70,440,0+40,'','')+wire([[440,40],[470,40]])+res(470,40,540,40,'R11','301R')+txt(560,44,'→ RV1 5K (wiper+bw) → GND',10,'var(--ink2)')
    +res(600,152,670,152,'R17','30R')+net(675,152,'OUT_A_N → XLR pin 3')
    +wire([[560,152],[560,250]])+res(560,250,560,300,'R15','4K75')+wire([[560,300],[560,320],[600,320]])+opamp(600,332,'U1B NE5532')+wire([[600,344],[590,344],[590,370]])+gnd(590,370)
    +wire([[580,320],[580,290],[680,290]])+res(600,290,680,290,'R18','4K75')+wire([[680,290],[690,290],[690,332],[660,332]])+wire([[660,332],[700,332]])+res(700,332,770,332,'R26','30R')+net(700,360,'OUT_A_P → XLR pin 2')
    +txt(40,420,`G(U1A) = (R9 + R13 + R9·R13/Rsh)/R5, Rsh = 301R + trim → ${fdb(dB(gainUB(0)))} … ${fdb(dB(gainUB(1)))} dB; balanced +6.02 dB → ${fdb(dB(gainUB(0))+6.02)} … ${fdb(dB(gainUB(1))+6.02)} dB`,11.5) },
  { name:'3 · POD1-1 main board', note:'From POD1-1-ISS2.pdf (04/12/2013). XLR footprints carry both IN x+ and OUT x+ nets, so the same main board can be loaded as POD1 (one POD1-2 + one POD1-3) or POD18 (two POD1-3) — the RD64 plan.', svg:()=>
    chip(130,70,150,'PSU1 NFM-10-5',[['AC/L (2)','P2 rocker'],['AC/N (1)','P1']],[['V+ (3)','DC+ 5 V'],['V− (4)','GND']],'alt. PSU3 VAF1005')
    +chip(130,220,150,'PSU2 SUW1R5',[['+VIN (1)','DC+'],['−VIN (2)','GND']],[['+VOUT (3)','VCC+12'],['COM (4)','GND'],['−VOUT (6)','VCC−12']],'BOM: SUW1R5-1212')
    +txt(40,330,'LED1 GREEN via R1 332R from DC+ (≈ 9 mA) · C2 22 µF/35 V',11)+txt(40,348,'C1, C3–C6 68 µF/10 V on DC+ (DNI “Test” in the BOM)',11)
    +chip(560,60,150,'XLR1…XLR4',[['+ (2)','IN x+ / OUT x+'],['− (3)','IN/OUT x−'],['G (1)','GND']],[],'NC3FD-H in, NC3MD-H out')
    +chip(560,200,150,'H1…H4 (12-pin)',[['1','OUT A+'],['2','IN/OUT A−'],['3','IN A+'],['6','OUT B+'],['7','IN/OUT B−'],['8','IN B+']],[['H2/H4 1','VCC+12'],['H2/H4 2','VCC−12'],['H2 6/10','IN/OUT A/B (RCA)']],'to the sub-boards')
    +chip(130,385,150,'RCA1 04P0605',[['RCA1A 3/6','IN/OUT A/B'],['RCA1B 3/6','IN/OUT C/D']],[],'quad RCA') },
];
function viewSchem(m){ window.__pod1Active=false; schemView(m, SHEETS, 'POD1', 'The Altium originals are POD1-2-ISS3 Balanced-Unbalanced.SchDoc, POD1-3-ISS3 Unbalanced-Balanced.SchDoc and POD1-1-ISS2 Main Board.SchDoc (with PDFs). These sheets keep the reference designators, values and net names from those PDFs, laid out more simply. Blue labels are nets.'); }

function viewSoft(m){
  window.__pod1Active = true;
  let hot=2;
  m.innerHTML = `${card('No firmware — the signal path is the program', `<p class="small">POD1 has no processor. These live diagrams show what each stage does to the signal at the current settings. Click a stage for its maths. Trims and inputs on the other tabs change the numbers here.</p><h3>Balanced → unbalanced (left channel)</h3><div id="f1"></div><h3>Unbalanced → balanced (left channel)</h3><div id="f2"></div><div id="det" class="card" style="margin-top:10px"></div>`)}
    <div class="grid2">${card('Trim position → gain (both directions)', `<canvas id="gc"></canvas>`)}${card('How the buttons did things', `<div id="btn"></div>`)}</div>
    ${card('Pin-outs', `<div id="pins"></div>`)}`;
  const DET = [
    ()=>`<b>XLR in.</b> Pin 2 + / pin 3 − / pin 1 ground, through 0R links (R1–R8) that select Phoenix or header inputs. Level now ${fdb(D.gen.bal)} dBu.`,
    ()=>`<b>SSM2143.</b> Gain = 0.5 (−6.02 dB) with high common-mode rejection. The “+” leg is wired to IN−, so this stage inverts. Its input clips at about ${fdb(v2dbu((V.rail-V.swingLoss)/Math.SQRT2)+6.02)} dBu differential (test: max in +26 dBu).`,
    ()=>`<b>U3A + trim.</b> k = (1/Ra)/(1/Ra+1/Rb+1/R12), Ra = f·5K, Rb = (1−f)·5K. |G| = (1/8K06)/(1/15K + k/2K). At f = ${D.trim.uL.toFixed(2)}: k = ${(()=>{const Ra=Math.max(1e-3,D.trim.uL*5000),Rb=Math.max(1e-3,(1-D.trim.uL)*5000);return ((1/Ra)/(1/Ra+1/Rb+1/2000)).toFixed(3);})()}, G = ${gainBU(D.trim.uL).toFixed(3)} (${fdb(dB(gainBU(D.trim.uL)))} dB).`,
    ()=>`<b>Output.</b> R15 30R build-out, then the RCA. Into ${D.loadU} Ω the loss is ${(-dB(D.loadU/(D.loadU+30))).toFixed(3)} dB.`,
  ];
  const DET2 = [
    ()=>`<b>RCA in.</b> R5 47K5 sets the input impedance. R7 100K bleeds DC to ground so C1 does not charge to a plug-in transient. Level ${fdb(D.gen.unb)} dBu.`,
    ()=>`<b>U1A + T-network.</b> G = (R9 + R13 + R9·R13/Rsh)/R5 with Rsh = 301 + (1−f)·5000. At f = ${D.trim.bL.toFixed(2)}: Rsh = ${Math.round(301+(1-D.trim.bL)*5000)} Ω, G = ${gainUB(D.trim.bL).toFixed(3)} (${fdb(dB(gainUB(D.trim.bL)))} dB).`,
    ()=>`<b>U1B.</b> 4K75/4K75 unity inverter. Pin 2 = −(pin 3), so the differential output is twice either leg: +6.02 dB.`,
    ()=>`<b>Output.</b> 30R in each leg (R17/R26) gives the 60 Ω balanced source impedance quoted for the sister POD18. Into ${D.loadB} Ω the loss is ${(-dB(D.loadB/(D.loadB+60))).toFixed(2)} dB.`,
  ];
  let which=0;
  const draw=()=>{
    const a=levelsBU(0), b=levelsUB(0);
    const st1=[{t:'XLR IN L',s:[fdb(a.stages[0].lvl)+' dBu','balanced']},{t:'SSM2143',s:['×0.5, inverts',fdb(a.stages[1].lvl)+' dBu']},{t:'U3A + RV2',s:['×'+gainBU(tU(0)).toFixed(3)+' inverts',fdb(a.stages[2].lvl)+' dBu'],bad:a.clip},{t:'R15 → RCA OUT',s:['30R',fdb(a.out)+' dBu']}];
    const st2=[{t:'RCA IN L',s:[fdb(b.stages[0].lvl)+' dBu','47K5']},{t:'U1A + RV1',s:['×'+gainUB(tB(0)).toFixed(3)+' inverts',fdb(b.stages[1].lvl)+' dBu/leg'],bad:b.clip},{t:'U1B inverter',s:['×−1','+6.02 dB diff.']},{t:'2×30R → XLR OUT',s:['60 Ω',fdb(b.out)+' dBu']}];
    m.querySelector('#f1').innerHTML=flowSVG(st1, which===0?hot:-1); m.querySelector('#f2').innerHTML=flowSVG(st2, which===1?hot:-1);
    m.querySelectorAll('#f1 [data-st]').forEach(g=>g.onclick=()=>{ which=0; hot=+g.dataset.st; draw(); });
    m.querySelectorAll('#f2 [data-st]').forEach(g=>g.onclick=()=>{ which=1; hot=+g.dataset.st; draw(); });
    m.querySelector('#det').innerHTML=(which?DET2:DET)[hot]();
    const {c,w,h}=SIM.canvas(m.querySelector('#gc'),200), x0=40, pw=w-60;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif';
    for(let d=-20;d<=25;d+=5){ const y=10+(25-d)/45*170; c.beginPath(); c.moveTo(x0,y); c.lineTo(x0+pw,y); c.stroke(); c.fillText(d+' dB',2,y+3); }
    [[f=>dB(gainBU(f))-6.02,SIM.css('--accent'),'bal→unbal',D.trim.uL],[f=>dB(gainUB(f))+6.02,SIM.css('--accent2'),'unbal→bal',D.trim.bL]].forEach(([fn,col,lb,cur])=>{
      c.strokeStyle=col; c.lineWidth=2; c.beginPath(); for(let i=0;i<=100;i++){ const y=10+(25-fn(i/100))/45*170; i?c.lineTo(x0+pw*i/100,y):c.moveTo(x0,y);} c.stroke();
      const y=10+(25-fn(cur))/45*170; c.fillStyle=col; c.beginPath(); c.arc(x0+pw*cur,y,5,0,7); c.fill(); c.fillText(lb, x0+pw*cur+8, y-6); });
    c.fillStyle=SIM.css('--ink2'); c.fillText('trim fully CCW', x0, 196); c.fillText('fully CW', x0+pw-44, 196);
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Circuit path</th><th>Result</th></tr>
      <tr><td>Rocker</td><td class="small mono">P1/P2 → NFM-10-5 → DC+ → LED1; SUW1R5 → VCC±12</td><td class="small">Power tally; op-amp rails</td></tr>
      <tr><td>UNBALANCED L/R trim</td><td class="small mono">POD1-2 RV2/RV1 wiper → R12/R14 2K → U3A/U3B summing node</td><td class="small">−19.2 … −0.6 dB bal→unbal</td></tr>
      <tr><td>BALANCED L/R trim</td><td class="small mono">POD1-3 RV1/RV2 + R11/R12 301R shunt at the T node</td><td class="small">+9.3 … +24.5 dB unbal→bal</td></tr>
      <tr><td>Plug a balanced source</td><td class="small mono">XLR1/2 → H1 → R1–R4 0R → SSM2143 IN±</td><td class="small">Common-mode noise rejected</td></tr>
      <tr><td>Plug a consumer source</td><td class="small mono">RCA1A → H3/H4 → R5 47K5 → C1 → U1A</td><td class="small">Gain + split into two legs</td></tr></table><p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    m.querySelector('#pins').innerHTML=`<table class="kv"><tr><th>Connector</th><th>Pin</th><th>Net</th></tr>
      <tr><td>BALANCED INPUT (XLR F)</td><td>2 / 3 / 1</td><td class="mono">IN x+ / IN/OUT x− / GND</td></tr>
      <tr><td>BALANCED OUTPUT (XLR M)</td><td>2 / 3 / 1</td><td class="mono">OUT_x_P (U1B) / OUT_x_N (U1A) / GND</td></tr>
      <tr><td>UNBALANCED IN/OUT (RCA)</td><td>tip / sleeve</td><td class="mono">IN/OUT A…D / GND (04P0605 quad)</td></tr>
      <tr><td>Sub-board headers H1/H2 (12-way)</td><td>1–12</td><td class="mono">signals (H1/H3), VCC+12 pin 1, VCC−12 pin 2, audio 6/10 (H2/H4), GND</td></tr></table>`;
  };
  SIM.on('time', draw);
}

function viewNotes(m){
  window.__pod1Active=false;
  m.innerHTML = card('What the POD1 archive shows — findings', `<ol><li><b>Artwork 2026|59: front/rear panels now from ${SIM.src('#POD #SERIES/POD1 - #Master/POD1 - #SILK/POD1-FRONT&REAR-SILK(CURVE) .cdr', 'POD1-FRONT&REAR-SILK(CURVE) .cdr')} (2015-09-30|48).</b> GREEN + WHITE front plates and the WHITE rear plate registered on the panel outline (assets/pod1-front.svg, pod1-rear.svg). On this sheet the rear plate's outline is drawn in the ink colour and sits 1.4 pt left of the front plates; it was dropped, not printed. The rear still reads “115 VAC, 1/2 A.S.B.” (the transformer-era legend). Not used: POD1-FRONT (FINAL CURVE).cdr (2015|48, front only), POD1-REAR (FINAL CURVE).cdr (2014|47) and the 2013|46 POD-1 FRONT SILK(FINAL CURVE).cdr.</li>
    <li><b>The prototype test found three wiring faults; the ISS3 drawing shows how they are avoided.</b> <span class="mono">POD1-04NOV13.pdf</span> (ISS2 prototype) says: “Output out of phase. Input L&amp;R reversed. Level control L&amp;R reversed.” In the ISS3 <span class="mono">Balanced-Unbalanced</span> sheet (8/10/2015|48), the + leg goes to the SSM2143's <span class="mono">IN−</span> pin and the following NE5532 stage inverts, so the two inversions cancel and the output is in phase. The sheet still cross-labels channels: the channel-A receiver is fed by <span class="mono">PHX IN B+</span>/<span class="mono">HDR IN A+</span> and drives <span class="mono">Jack Out B</span>/<span class="mono">HDR Out A</span>. That kind of A/B swap is what produced the L/R faults (${inf}). Use the “Board: ISS2 prototype” setting to hear the faults.</li>
    <li><b>The schematic values match the test sheet.</b> −6.02 dB (SSM2143) plus U3A's T-network gives ${fdb(dB(gainBU(0))-6.02)} … ${fdb(dB(gainBU(1))-6.02)} dB. The test measured −19.5 … −0.5 dB. The ±12 V rails limit the unbalanced output to about +19.6 dBu; the test measured +19.35 dBu.</li>
    <li><b>The “Unbal.-Balance section” of the POD1 test is the POD18 test, word for word.</b> Max output +25.5 dBu, “Gain range: +12dBu to 24.5dBu with -10 dB in”, 0.003 %, −87 dB, &gt;80 dB all appear identically in <span class="mono">POD18-21OCT13.pdf</span> (21 Oct 2013|46). Either the section was copied, or the same POD1-3 board was measured for both (under RD64 POD18 is two POD1-3 boards). It also writes the gain range in “dBu”.</li>
    <li><b>The low end of the unbal→bal gain range does not match.</b> With the trim at 5 kΩ the schematic gives ${fdb(dB(gainUB(0))+6.02)} dB. The POD18 manual and the test both say +12 dB. A 5K trim at the low end of its tolerance, or a different shunt value in the tested build, would explain it (${inf}).</li>
    <li><b>The DC-DC converter part number does not fit the supply.</b> PSU1 is <span class="mono">NFM-10-5</span> (“5VDC POWER SUPPLY”), and DC+ is decoupled with 10 V tantalums. PSU2 is listed as <span class="mono">SUW1R5-1212</span>; in this kind of part number “12” before the output code usually means a 12 V input. Yet every Ward-Beck board that uses it feeds it 5 V: POD1-1, both sub-boards, the black box, POD13A and POD14A. POD13A's 2008 test procedure even checks for 5 V in and ±12 V out. Either the suffix means something else for this vendor, or 5 V-input parts were fitted under that stock code (${inf}). The 2013 test maxima (+19.35/+25.5 dBu) show the rails worked. “PSU: as the BOM lists it” shows what would happen if the suffix is taken literally.</li>
    <li><b>Each sub-board can also stand alone.</b> POD1-2 and POD1-3 carry footprints for their own SUW1R5, power LED, micro-USB 5 V input (10118194), 3.5 mm jack (CTP-35009-SMT) and Phoenix terminals. All of these are DNI in the POD1 build. They are fitted in the “BLACK BOX” and stand-alone SA-BALtoUNBAL builds (see RD64). POD1-3's mono-sum stage U3 (20K/10K summer and inverter → MONO_P/N) is also DNI in POD1.</li>
    <li><b>One main board for two products.</b> Every XLR position on POD1-1 is wired to both <span class="mono">IN x+</span> and <span class="mono">OUT x+</span>. The BOM loads the same <span class="mono">SA-POD1-MAIN</span> as POD1 (one bal→unbal + one unbal→bal) or as POD18 (two unbal→bal). This is RD64's “combine both circuits on one PCB”.</li>
    <li><b>Front trims under the board.</b> A drafting note on the POD1-3 sheet asks for a version of the “MULTI” pot footprint with the back-wiper pin on the far side, so the pot can be mounted on the underside of the board. That way the trims line up with the OUTPUT ADJUST holes.</li>
    <li><b>The rear silk is older than the electronics.</b> The rear panel (silk dated Jun 18 2014|47) says “115 VAC, 1/2 A.S.B.”. The ISS2/ISS3 design uses a universal-input module, so the transformer-era 115 V label stayed (${inf}).</li>
    <li><b>Small BOM slips.</b> The 4K75 resistors use stock code “4K7--1/4W” with a “1/10W 4K75” description. The 47K5 parts have a 5 % stock code and a 1 % description. The SA-POD1-UNB2BAL header line still says “POD1-3 ISS2”.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Op-amp outputs swing to within 1.5 V of the ±12 V rails, with hard clipping (${inf}). Slew and noise are not modelled in the waveforms.</li>
    <li>Power-up timing: NFM-10-5 about 4 ms, SUW1R5 starts about 20 ms after power-on and rises with a 4 ms time constant (${inf}).</li>
    <li>Trim taper is linear over 0–100 % travel (${inf}; Tocos RJC097 5K, “B” = linear).</li>
    <li>“ISS2 prototype” mode applies the three faults the test report lists, not a traced ISS2 netlist.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>POD1-2 - #ISS3 #PCB/ISS3/Balanced-Unbalanced.pdf · POD1-3 - #ISS3 #PCB/ISS3/Unbalanced-Balanced.pdf · POD1-1-ISS2.pdf</li><li>POD1 - #TESTREPORT/POD1-04NOV13.pdf · ../POD18 - #Master/POD18 - #TESTREPORT/POD18-21OCT13.pdf</li><li>../POD1  - POD18 - Redesign #RD #RD64/PCB/POD1 MASTER BOM with jumpers.xlsx</li><li>POD1 - #ARTWORK #DA #2016/POD1-FRONT&amp;REAR-SILK(CURVE) .pdf · Pics/POD1 Front.jpg, Rear.jpg</li></ul>`);
}

SIM.register({
  footnotes:[{text:"The rear still reads “115 VAC, 1/2 A.S.B.”, the transformer-era legend, though ISS2/ISS3 use a universal-input supply.", src:"#POD #SERIES/POD1 - #Master/POD1 - #SILK/POD1-FRONT&REAR-SILK(CURVE) .cdr"},
    {text:"On this sheet the rear plate's outline is drawn in the ink colour and sits 1.4 pt left of the front plates; it is a drawing outline, not printed.", src:"#POD #SERIES/POD1 - #Master/POD1 - #SILK/POD1-FRONT&REAR-SILK(CURVE) .cdr"},
    {text:"The sheet's own title reads “PO1-FRONT&amp;REAR-SILK”, missing the D of POD.", src:"#POD #SERIES/POD1 - #Master/POD1 - #SILK/POD1-FRONT&REAR-SILK(CURVE) .cdr"},
    {text:"The POD1 ARTWORK folder also holds a copy of the POD-18 front silk (2013|46).", src:"#POD #SERIES/POD1 - #Master/POD-1 - ARTWORK/POD-18 FRONT SILK (FINAL CURVE).cdr"},
    {text:"Separate front-only and rear-only sheets exist: POD1-FRONT (FINAL CURVE).cdr (2015|48) and POD1-REAR (FINAL CURVE).cdr (2014|47).", src:"#POD #SERIES/POD1 - #Master/POD1 - #SILK/POD1-REAR (FINAL CURVE).cdr"}],
  id:'pod1', name:'POD1 · bi-directional balanced/unbalanced audio interface (2013|46)', duration:1,
  product:'POD1', year:2013, family:'POD series', folder:'#POD #SERIES/POD1 - #Master',
  summary:'Half-rack analog interface with two stereo paths: balanced XLR in to consumer RCA out, and RCA in to balanced XLR out, each with front OUTPUT ADJUST trims. ISS2/ISS3 is an SMT redesign on a main board plus POD1-2 (SSM2143 + NE5532) and POD1-3 (NE5532) sub-boards.',
  highlights:['Real silkscreen panels with working trims and pluggable inputs','Stage-by-stage levels and headroom from the ISS3 schematic values','T-network trim maths that reproduces the 2013 test results','ISS2 prototype faults (phase, L/R swap) you can switch on','Power-up rails and the DC-DC part-number mismatch'],
  depth:'Hardware model',
  stepUnits:[{label:'1 tone cycle', period:()=>1/D.gen.f},{label:'1 mains cycle (60 Hz)', period:()=>1/60},{label:'1 ms', period:()=>0.001},{label:'10 ms', period:()=>0.01},{label:'100 ms', period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.05,'50 ms (power-up)'],[0.01,'10 ms'],[0.002,'2 ms (two 1 kHz cycles)'],[0.0002,'200 µs']],
  defaultZoom:4,
  init(){},
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: lining up a POD1', render:viewTutorial},
    {id:'second', label:'One second, cycle by cycle', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Signal path (no firmware)', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});

})();
