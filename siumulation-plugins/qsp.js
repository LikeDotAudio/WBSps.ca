/* =====================================================================
   QSP — QSP-2 dual cue speaker (also QSP2-D, QSP-XLR, QSP6) (Ward-Beck Systems "Select Series"), obsolete master folder
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model (analog audio, no code).

   Sources used (XXX - QSP  - #Master #OBSOLETE/):
   - QSP - #OBSOLETE #Archive/QSP2.pdf                         (manual: STEREO/MONO, CH1/CH2 levels, headset jack mutes speakers)
   - QSP - #OBSOLETE #Archive/QSP2 - #Schematic page1.pdf, page2.PDF (QSP.DSN "QSP-2 CUE SPEAKER ISS.3 PCB", JULY 3,1998)
   - QSP - #OBSOLETE #Archive/QSP2 Front.jpg, QSP2 Rear.jpg     (panel colours, knob colour)
   - QSP & QSP-XLR - #Mechanical #DA #2016/QSP-FRONT ISS 4 (PANEL).pdf, QSP-REAR ISS.5 (PANEL).pdf (hole positions, to scale)
   - QSP & QSP-XLR - #ARTWORK #DA #2016/QSP-FRONT-SILK(CURVE).CDR, QSP-REAR-SILK (CURVE).CDR (Inkscape → tools cut, Artwork 2026|59 → assets/qsp-front.svg (GREEN + WHITE plates registered), qsp-rear.svg; the older PNG cuts qsp-front-green/-white.png, qsp-rear-white.png are no longer used)
   - QSP & QSP-XLR - #Mechanical #DA #2016/A-QSP BOM Structure.pdf; qsp6/QSP6 Manual/README.txt (QSP6 notes)
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
const PREFIX='qsp';
const ART_F='QSP  - #Master #OBSOLETE/QSP & QSP-XLR - #ARTWORK #DA #2016/QSP-FRONT-SILK(CURVE).CDR', ART_R='QSP  - #Master #OBSOLETE/QSP & QSP-XLR - #ARTWORK #DA #2016/QSP-REAR-SILK (CURVE).CDR';
const QA='QSP  - #Master #OBSOLETE/QSP - #OBSOLETE #Archive/';
/* Artwork 2026|59 footnotes: small facts the CorelDRAW files show */
const FOOT=[
 {text:'The front silk marks CH 1, STEREO/MONO and HEADSET holes with drilling cross-hairs, but the CH 2 pot hole is a plain circle with no cross-hair (hole E, the one enlarged from .167 in 2008).', src:ART_F},
 {text:'STEREO/MONO is not a word pair on the panel: it is a push-button symbol, button up for STEREO and pressed for MONO, with the two words stacked beside it.', src:ART_F},
 {text:'The rear silk prints “+ − G / INPUT” only under the CH 2 cut-out; CH 1 shares that legend, and the third cut-out (13.850 in) has no legend at all.', src:ART_R},
 {text:'An unlabelled round hole sits beside the IEC inlet under “115 VAC, 1 A.S.B”; the silk names no fuse holder or switch for it.', src:ART_R},
 {text:'The front sheet is dated nowhere; the rear sheet is dated MAY 13/16, five weeks before the rear drawing’s “JUN.28/16 STUD CHANGED” revision.', src:ART_R},
 {text:'The 2016 silks (QSP-FRONT-SILK.CDR / (CURVE).CDR) are the third generation: QSPSILK.CDR (file date 2016-05-10) and QSPOUTS.CDR / QSPBACKS.CDR (May 1998) hold the same legends as loose items, not registered on a panel outline.', src:QA+'QSP - #SILK/QSPSILK.CDR'},
 {text:'QSP6FRONTSILK.cdr is stored twice: once in qsp6/ and again in the console module folder #CONSOLES - #OBSOLETE #Archive/MODULES/R208/ beside a PDF of it, suggesting the QSP6 face was reused on the R208 console module (<span class="tag-inf">inferred</span> from the folder).', src:'#CONSOLES - #OBSOLETE #Archive/MODULES/R208/QSP6FRONTSILK.cdr'},
 {text:'QSP6REARSILK.cdr labels a MINI DISK / PC output pair and six LEFT/RIGHT INPUTs, and its one-line caution runs past the right edge of the page (“…FUSE OR SER”).', src:QA+'qsp6/QSP6REARSILK.cdr'},
];
const PPI=150, W=2565, H=247;                    // face 17.100 × 1.648 in at 150 px/in
const X = v=>Math.round(v*PPI);
/* ---------------- circuit constants from QSP.DSN (ISS.3) ---------------- */
const RAIL = 16;                // T1 two secondaries → bridge → C56/C57 2200 µF/25 V (rail inferred)
const SW = RAIL-2;              // 5532 swing (inferred)
const RX_G = 10/20;             // U18/U19: 20K0 in, 10K0 feedback → ×0.5 (−6 dB)
const TDA_G = 31.6;             // TDA1521 fixed gain 30 dB (data-sheet value, inferred)
const DIV = 20/(75+20);         // R83/R84 75K into the TDA1521 input (≈20 kΩ, data sheet) (inferred)
const SPK = 8;                  // speaker impedance (inferred)
const D = { power:true, srcDbu:[4,4], freq:[1000,1000], plugged:[true,true], pot:[0.6,0.6], stereo:true, hp:false, vol:'speaker', log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const potGain = f => f<=0.001 ? 0 : Math.pow(10,(f-1)*40/20);   // 10K audio-taper: −40 dB … 0 dB over the travel (inferred)
/* per side: 0 = LEFT (CH1), 1 = RIGHT (CH2) */
function chanIn(side){ return D.stereo ? side : side; }          // inputs are always CH1→LEFT, CH2→RIGHT
function potFor(side){ return D.stereo ? D.pot[0] : D.pot[side]; } // STEREO: the CH1 (L\R VOL dual) pot sets both; MONO: CH1 and CH2 separately (R-VOL)
function vRx(side,t){ if(!D.plugged[side]||!D.power) return 0; return clamp(dbu2v(D.srcDbu[side])*Math.SQRT2*Math.sin(2*Math.PI*D.freq[side]*t)*RX_G,-SW,SW); }
function vPot(side,t){ return vRx(side,t)*potGain(potFor(side)); }
function vU26(side,t){ return vPot(side,t); }                     // U26 unity buffers (pins 5/6/7, 3/2/1)
function vSpk(side,t){ if(D.hp||!D.power) return 0; return clamp(vU26(side,t)*DIV*TDA_G,-(RAIL-2),RAIL-2); }   // headset jack normals mute the speakers
function vHp(side,t){ if(!D.hp||!D.power) return 0; return clamp(vPot(side,t)*2,-SW,SW); }   // U24: 10K0/10K0 → ×2, R55/R56 30R
function vLine(side,t){ return vRx(side,t); }                    // page 2: RIGHT/LEFT → 6K2/680p → U20A/U23A → balanced, 30R (R VU IN / L VU IN)
const pk = fn => { let m=0; for(let i=0;i<200;i++) m=Math.max(m,Math.abs(fn(i/200/1000))); return m; };
const spkW = side => { const v=Math.min(RAIL-2, dbu2v(D.srcDbu[side])*Math.SQRT2*RX_G*potGain(potFor(side))*DIV*TDA_G); return D.plugged[side]&&D.power&&!D.hp ? v*v/2/SPK : 0; };
const spkClip = side => D.power&&!D.hp&&D.plugged[side] && dbu2v(D.srcDbu[side])*Math.SQRT2*RX_G*potGain(potFor(side))*DIV*TDA_G > RAIL-2;
const rxClip = side => D.plugged[side] && dbu2v(D.srcDbu[side])*Math.SQRT2*RX_G > SW;
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`L ${spkW(0).toFixed(2)} W · R ${spkW(1).toFixed(2)} W · ${D.stereo?'STEREO':'MONO'}${D.hp?' · headset':''}`);
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; tr('P1 (LINE/NEUTRAL/GND) → T1 (BK/WHT/BR/ORG primaries, RED/YEL/BLU/GRY secondaries) → bridge → C56/C57 2200/25 → V+ / V−'); }); },
  pot(i,d){ act(`Turn CH ${i+1} ${d>0?'CW':'CCW'}`, tr=>{ D.pot[i]=clamp(+(D.pot[i]+d*0.04).toFixed(3),0,1);
    tr(i===0?`AMS4-3 front board: L\\R VOL dual 10K (CW) via the P2/H2 ribbon → ${D.stereo?'both speakers':'LEFT speaker only'}`:`AMS4-3: R-VOL 10K → ${D.stereo?'no effect in STEREO (switch routes the RIGHT feed through the dual pot)':'RIGHT speaker'}`);
    tr(`Pot ${fdb(20*Math.log10(Math.max(1e-9,potGain(D.pot[i]))))} dB → U26 → R83/R84 75K → TDA1521 (U29)`); }); },
  stereo(){ act(`STEREO/MONO switch → ${D.stereo?'MONO':'STEREO'}`, tr=>{ D.stereo=!D.stereo; tr(`SW DPDT on AMS4-3: ${D.stereo?'RIGHT channel wiper taken from the second gang of L\\R VOL — CH 1 sets both':'RIGHT channel wiper taken from R-VOL — CH 1 and CH 2 independent'} (manual)`); }); },
  hp(){ act(D.hp?'Unplug the headset':'Plug a headset into HEADSET', tr=>{ D.hp=!D.hp; tr(D.hp?'TRS jack normals open: the speaker feeds stop (manual: “automatically mute the speakers”); U24A/B (×2, 10K0/10K0) drive the tip and ring through R55/R56 30R':'Normals close: speaker feeds restored'); }); },
  plug(i){ act(`${i?'CH 2':'CH 1'} input ${D.plugged[i]?'unplugged':'plugged'}`, tr=>{ D.plugged[i]=!D.plugged[i]; tr(`Rear INPUT ${i?'CH 2':'CH 1'} (3-pin + − G) → TB → U${i?19:18} receiver (R${i?3:2}/R${i?4:1} 20K0, C 33µ)`); }); },
  set(k,i,v,l){ act(l, tr=>{ D[k][i]=v; tr(`U${i?19:18} receiver output ${fdb(D.srcDbu[i]-6.02)} dBu${rxClip(i)?' — CLIPPING':''}`); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels (QSP-FRONT ISS 4 / QSP-REAR ISS.5; silks QSP-FRONT-SILK / QSP-REAR-SILK, May 13/16) ---------------- */
function louvres(cols){ let s=''; cols.forEach(cx=>{ for(let r=0;r<9;r++){ const y=X(0.364+r*0.115); s+=`<rect x="${X(cx-0.375)}" y="${y-5}" width="${X(0.75)}" height="${X(0.062)+1}" rx="4.6" fill="#050505"/>`; } }); return s; }
function frontSVG(){ const on=D.power;
  const under = louvres([0.638,1.513,2.388,3.263,13.838,14.713,15.588,16.463]);
  const over = knob(X(5.350),X(1.121),22,D.pot[0],'kn" data-i="0','CH 1 (L\\R VOL dual 10K)','#2fae5a') + knob(X(11.750),X(1.121),22,D.pot[1],'kn" data-i="1','CH 2 (R-VOL 10K)','#2fae5a')
    + `<g class="sm" style="cursor:pointer"><title>STEREO/MONO push switch (${D.stereo?'STEREO, up':'MONO, pressed'}) — click</title><circle cx="${X(11.25)}" cy="${X(1.165)}" r="20" fill="#0b0c0d" stroke="#333"/><circle cx="${X(11.25)}" cy="${X(1.165)}" r="${D.stereo?14:11}" fill="${D.stereo?'#26292d':'#141618'}"/></g>`
    + `<g class="hp" style="cursor:pointer"><title>HEADSET TRS jack — click to ${D.hp?'unplug':'plug'} a headset</title><circle cx="${X(12.775)}" cy="${X(0.871)}" r="30" fill="#9a9da1" stroke="#555"/><circle cx="${X(12.775)}" cy="${X(0.871)}" r="17" fill="#060606"/>${D.hp?`<circle cx="${X(12.775)}" cy="${X(0.871)}" r="24" fill="#1d1f22" stroke="#444"/><rect x="${X(12.775)-7}" y="${X(0.871)+20}" width="14" height="40" fill="#1d1f22"/>`:''}</g>`
    + (D.power?`<circle cx="${X(3.9)}" cy="${X(1.3)}" r="0" fill="none"/>`:'');
  return layered({w:W,h:H,bg:'#151617',layers:[PREFIX+'-front.svg'],under,over,label:'QSP-2 front panel (real silkscreen)'}); }
function rearSVG(){
  let under=''; for(let i=0;i<7;i++){ under+=`<rect x="${X(5.150+i*0.25)-7}" y="${X(0.324)}" width="14" height="${X(1.0)}" rx="7" fill="#050505"/><rect x="${X(7.150+i*0.25)-7}" y="${X(0.324)}" width="14" height="${X(1.0)}" rx="7" fill="#050505"/>`; }
  const ph=(cx,cy,on,cls,title,plug)=>`<g class="${cls}" style="cursor:pointer"><title>${title}</title><rect x="${X(cx)-X(0.264)}" y="${X(cy)-X(0.166)}" width="${X(0.528)}" height="${X(0.332)}" fill="#050505"/><rect x="${X(cx)-36}" y="${X(cy)-20}" width="72" height="40" rx="3" fill="#26a356" stroke="#0e5d2b"/>${[-22,0,22].map(d=>`<rect x="${X(cx)+d-7}" y="${X(cy)-10}" width="14" height="20" fill="#0e4d25"/>`).join('')}${plug?`<rect x="${X(cx)-34}" y="${X(cy)-18}" width="68" height="14" fill="#2b5f9e" opacity=".85"/>`:''}</g>`;
  const over = iec(X(0.84-0.54),X(0.824-0.62),X(0.84+0.54),X(0.824+0.62)) + ph(11.2,0.393,1,'pi" data-i="0','CH 1 INPUT (+ − G) — click to '+(D.plugged[0]?'unplug':'plug'),D.plugged[0]) + ph(11.2,1.093,1,'pi" data-i="1','CH 2 INPUT (+ − G) — click to '+(D.plugged[1]?'unplug':'plug'),D.plugged[1])
    + ph(13.85,0.393,1,'','3-pin header at 13.850 in (no silk legend; the schematic’s LEFT/RIGHT OUT and VU feeds — '+'inferred'+')',false)
    + [9.85,11.35,13.375,14.725].map(x=>`<circle cx="${X(x)}" cy="${X(0.743)}" r="7" fill="#777"/>`).join('');
  return layered({w:W,h:H,bg:'#151617',layers:[PREFIX+'-rear.svg'],under,over,label:'QSP-2 rear panel (real silkscreen)'}); }
function bindPanel(r){ r.querySelectorAll('.kn').forEach(g=>{ const i=+g.dataset.i; g.addEventListener('click',e=>{ const b=g.getBoundingClientRect(); A.pot(i,(e.clientX-b.left)/b.width<0.5?-1:1); }); g.addEventListener('wheel',e=>{ e.preventDefault(); A.pot(i,e.deltaY<0?1:-1); },{passive:false}); });
  r.querySelectorAll('.sm').forEach(g=>g.onclick=()=>A.stereo()); r.querySelectorAll('.hp').forEach(g=>g.onclick=()=>A.hp()); r.querySelectorAll('.pi').forEach(g=>g.onclick=()=>A.plug(+g.dataset.i)); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  ${[0,1].map(i=>`<label>CH ${i+1} <input id="s${i}" type="number" step="2" value="${D.srcDbu[i]}" style="width:56px"> dBu at <select id="f${i}">${[100,440,1000,5000].map(f=>`<option ${f===D.freq[i]?'selected':''} value="${f}">${f} Hz</option>`).join('')}</select></label>`).join('')}
  <label><input type="checkbox" id="pw" ${D.power?'checked':''}> AC power</label></div>
  <div class="small muted">Click a knob’s left/right half (or wheel) · the small button left of CH 2 is STEREO/MONO · the jack is HEADSET · rear: click an input to unplug it. Keys: Z/X CH 1, N/M CH 2, S stereo/mono, H headset.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#s0')) return; [0,1].forEach(i=>{ g('#s'+i).onchange=e=>A.set('srcDbu',i,+e.target.value,`CH ${i+1} source → ${e.target.value} dBu`); g('#f'+i).onchange=e=>A.set('freq',i,+e.target.value,`CH ${i+1} tone → ${e.target.value} Hz`); }); g('#pw').onchange=()=>A.power(); }
bindKeys('__qspActive', ()=>({z:()=>A.pot(0,-1),x:()=>A.pot(0,1),n:()=>A.pot(1,-1),m:()=>A.pot(1,1),s:()=>A.stereo(),h:()=>A.hp()}));
/* ---------------- timeline ---------------- */
function envOf(fn,side){ const e=()=>{ let m=0; for(let i=0;i<64;i++) m=Math.max(m,Math.abs(fn(side,i/64/D.freq[side]))); return m; }; e.dense=(span,pw)=>span*D.freq[side]>pw/3; return e; }
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2');
  return [
    waveLane('CH 1 input (balanced)', t=>D.plugged[0]?dbu2v(D.srcDbu[0])*Math.SQRT2*Math.sin(2*Math.PI*D.freq[0]*t):0, -0.5, null, SIM.css('--ink2'), 36, envOf((s,t)=>D.plugged[0]?dbu2v(D.srcDbu[0])*1.414*Math.sin(2*Math.PI*D.freq[0]*t):0,0)),
    waveLane('U18 receiver (×0.5) → LEFT', t=>vRx(0,t), -0.5, SW, b, 36, envOf(vRx,0)),
    waveLane(`After CH 1 pot (${D.stereo?'dual gang':'single'})`, t=>vPot(0,t), -0.2, null, a, 36, envOf(vPot,0)),
    waveLane('LEFT speaker (TDA1521 OUT2)', t=>vSpk(0,t), -1, RAIL-2, a, 40, envOf(vSpk,0)),
    waveLane('RIGHT speaker (TDA1521 OUT1)', t=>vSpk(1,t), -1, RAIL-2, a, 40, envOf(vSpk,1)),
    waveLane('Headset tip (U24, 30R)', t=>vHp(0,t), -0.2, SW, b, 34, envOf(vHp,0)),
    boolLane('Speakers muted by the jack', ()=>D.hp, SIM.css('--warn')),
    boolLane('Any clipping', ()=>spkClip(0)||spkClip(1)||rxClip(0)||rxClip(1), SIM.css('--bad')),
  ]; }
function stageStats(side){ const v0=dbu2v(D.srcDbu[side]);
  const lv=x=>x>1e-9?v2dbu(x):-200, pg=potGain(potFor(side));
  return [
    {name:`CH ${side+1} input`, lvl:D.plugged[side]?D.srcDbu[side]:-200, gain:null, clip:24, note:'manual: +24 dBu max, >20 kΩ balanced'},
    {name:`U${side?19:18} receiver (10K0/20K0)`, lvl:D.plugged[side]?lv(v0*RX_G):-200, gain:-6.02, clip:v2dbu(SW/Math.SQRT2)},
    {name:`${D.stereo&&side?'CH 1 dual pot (second gang)':'CH '+(side+1)+' pot'}`, lvl:D.plugged[side]?lv(v0*RX_G*pg):-200, gain:pg>0?20*Math.log10(pg):null, clip:null},
    {name:'U26 buffer → R83/R84 75K', lvl:D.plugged[side]?lv(v0*RX_G*pg*DIV):-200, gain:20*Math.log10(DIV), clip:null, note:`75K into the TDA1521 input (≈20 kΩ, ${inf})`},
    {name:`TDA1521 (+30 dB) → ${D.hp?'muted (headset)':'8 Ω speaker'}`, lvl:D.plugged[side]&&!D.hp?lv(v0*RX_G*pg*DIV*TDA_G):-200, gain:30, clip:v2dbu((RAIL-2)/Math.SQRT2), note:`${spkW(side).toFixed(2)} W into ${SPK} Ω (${inf})`},
  ]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__qspActive=true;
  m.innerHTML=`${card('Front panel (QSP-FRONT ISS 4 holes + QSP-FRONT-SILK)',`<div id="fp"></div><div class="small muted" style="margin-top:3px">Artwork: GREEN + WHITE plates of ${SIM.src(ART_F,'QSP-FRONT-SILK(CURVE).CDR')} (May 2016), CorelDRAW vector, registered on one panel; faint lines = cut geometry.</div>${controlsHTML()}`)}${card('Rear panel (QSP-REAR ISS.5 + QSP-REAR-SILK)',`<div id="rp"></div><div class="small muted" style="margin-top:3px">Artwork: WHITE plate of ${SIM.src(ART_R,'QSP-REAR-SILK (CURVE).CDR')} (MAY 13/16), CorelDRAW vector.</div>`)}
   <div class="grid2">${card('What the circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('Speakers and headset',`<div id="now"></div>`)}</div>
   ${card('Timeline — one second, zoomable (zoom to 2 ms to see the waveforms)',`<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Stage by stage — LEFT',`<div id="lv0"></div>`)}${card('Stage by stage — RIGHT',`<div id="lv1"></div>`)}</div>${card('Action log',`<div id="log" class="log"></div>`)}`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Turn CH 1, press STEREO/MONO, plug a headset.');
    m.querySelector('#now').innerHTML=kvt([['Mode',D.stereo?'STEREO (CH 1 sets both)':'MONO (CH 1 → left, CH 2 → right)'],['LEFT speaker',D.hp?'muted (headset in)':spkW(0).toFixed(2)+' W'+(spkClip(0)?' — CLIPPING':''),1],['RIGHT speaker',D.hp?'muted (headset in)':spkW(1).toFixed(2)+' W'+(spkClip(1)?' — CLIPPING':''),1],['Headset (tip/ring)',D.hp?'driven through 30R by U24':'—']]);
    [0,1].forEach(s=>m.querySelector('#lv'+s).innerHTML=stageTable(stageStats(s))); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the QSP-2', body:`<p>From <span class="mono">QSP2.pdf</span>: “a cost effective dual channel analog audio monitor system … designed to operate selectively as a monitor for a stereo signal or two independent mono signals.” It is a 1 RU “Select Series” unit with two speakers behind the louvres.</p>`, check:()=>true, auto:true},
  {title:'1 · Stereo: one knob for both', body:`<p>In <b>STEREO</b> “the CHANNEL 1 level control is active and varies the level of both speakers”. Turn <b>CH 1</b> down to about −20 dB of travel and watch both speaker powers fall together. Then turn CH 2: nothing changes.</p>`, check:()=>D.stereo&&D.pot[0]<0.5&&D.log.some(e=>e.name.startsWith('Turn CH 2')), hint:'Z/X for CH 1, N/M for CH 2.'},
  {title:'2 · Mono: two cue channels', body:`<p>Press <b>STEREO/MONO</b> (the small button next to CH 2). Now CH 1 sets the left speaker and CH 2 the right one. Set CH 2 lower than CH 1.</p>`, check:()=>!D.stereo&&D.pot[1]<D.pot[0], hint:'S key, then N.'},
  {title:'3 · Headset', body:`<p>Plug a headset into <b>HEADSET</b>. The speaker feeds are normalled through the jack, so the speakers go silent and U24 drives the headset through 30 Ω.</p>`, check:()=>D.hp, hint:'Click the jack or press H.'},
  {title:'4 · Overload', body:`<p>Unplug the headset, return to STEREO, set CH 1 fully clockwise and raise the CH 1 source to +20 dBu. The TDA1521 clips at its rails long before the input stage does.</p>`, check:()=>!D.hp&&D.stereo&&spkClip(0), hint:'X several times; CH 1 dBu box → 20.'},
  {title:'Done', body:`<p>See <b>Findings</b> for the QSP family and the drawings.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__qspActive=true; tutorialView(m,{title:'Tutorial — using a QSP-2',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${kvt([['LEFT',D.hp?'muted':spkW(0).toFixed(2)+' W'+(spkClip(0)?' CLIP':''),1],['RIGHT',D.hp?'muted':spkW(1).toFixed(2)+' W'+(spkClip(1)?' CLIP':''),1],['Mode',D.stereo?'STEREO':'MONO']])}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__qspActive=true;
  m.innerHTML=`${card('One second through the QSP-2',`<div id="tab"></div>`)}<div class="grid2">${card('At the playhead',`<div id="dev"></div>`)}${card('One CH 1 cycle: receiver, pot, speaker',`<canvas id="sc"></canvas>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#tab').innerHTML=tbl(['What happens','per second','period','notes'],[[`CH 1 tone cycles`,D.freq[0],SIM.fmtDur(1/D.freq[0]),'through U18 → pot → U26 → TDA1521'],['Rectifier ripple','120','8.33 ms','2200 µF reservoirs on V+ / V−'],['Page-2 filter corner','—',SIM.fmtDur(1/37.7e3),'R39/R42 6K2 + C22/C24 680p: f = 1/(2πRC) ≈ 37.7 kHz'],['Zobel network','—','—','R85/R86 10R + C48/C49 3900p on each speaker output']]);
    m.querySelector('#dev').innerHTML=kvt([['Time',SIM.fmtT(t),1],['U18 out',vRx(0,t).toFixed(3)+' V',1],['After pot',vPot(0,t).toFixed(3)+' V',1],['LEFT speaker',vSpk(0,t).toFixed(3)+' V',1],['Headset',vHp(0,t).toFixed(3)+' V',1]]);
    const {c,w}=SIM.canvas(m.querySelector('#sc'),200), P=1/D.freq[0], t0=Math.floor(t/P)*P, sc=90/RAIL;
    c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(0,100); c.lineTo(w,100); c.stroke();
    [['receiver',vRx,SIM.css('--accent2')],['pot',vPot,SIM.css('--ink2')],['speaker',vSpk,SIM.css('--accent')]].forEach(([n,fn,col],k)=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); for(let i=0;i<=400;i++){ const v=fn(0,t0+P*i/400); i?c.lineTo(w*i/400,100-v*sc):c.moveTo(0,100-v*sc);} c.stroke(); c.fillStyle=col; c.font='11px sans-serif'; c.fillText(n,w-70,14+k*13); }); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:15,y:40,w:150,h:80,t:'INPUT CH 1/2',s:['3-pin + − G','TB → 6-pin header'],d:'Pluggable screw terminals on the rear; inside, a 6-pin header carries both channels to the main board.'},
  rx:{x:185,y:40,w:160,h:80,t:'Receivers U18/U19',s:['5532, 20K0 / 10K0','33 µF coupling'],d:'Balanced to single-ended, ×0.5. Outputs LEFT and RIGHT.'},
  fe:{x:365,y:20,w:170,h:100,t:'AMS4-3 front board',s:['L\\R VOL dual 10K','R-VOL 10K, SW DPDT','HEADPHONE jack'],d:'Connected by the P2/H2 16-way ribbon. The DPDT picks the right-channel wiper from the dual pot (STEREO) or R-VOL (MONO). The jack normals carry the speaker feeds.'},
  buf:{x:555,y:40,w:150,h:80,t:'U26 buffers',s:['75K to the amp'],d:'Unity followers, 100K bias (R71/R72), 75K series into the TDA1521.'},
  amp:{x:725,y:40,w:150,h:80,t:'TDA1521 (U29)',s:['2-channel power amp','470 µF supply caps'],d:'Fixed 30 dB gain (data sheet). Outputs through Zobel networks to the LEFT and RIGHT speaker connectors.'},
  hp:{x:555,y:150,w:150,h:80,t:'U24 headset amp',s:['×2, 30R out'],d:'Non-inverting ×2 (10K0/10K0), 100K bias, 30R in series with tip and ring.'},
  line:{x:185,y:150,w:160,h:90,t:'Page 2: line/VU feeds',s:['6K2/680p, U20/U23','30R balanced, VU IN'],d:'RIGHT and LEFT also go to balanced outputs (U20B/U23B inverters) and to “R VU IN / L VU IN” — the AMS4-style meter feeds.'},
  psu:{x:725,y:150,w:150,h:80,t:'Power',s:['toroid T1, bridge','2 × 2200 µF/25 V'],d:'IEC inlet (P1) → T1 → bridge → V+ / V−. The manual stresses a toroidal transformer to avoid hum fields near VTRs and monitors.'},
};
const WIRES=[['in','rx',''],['rx','fe','P2'],['fe','buf',''],['buf','amp',''],['fe','hp',''],['rx','line',''],['psu','amp','V±']];
function viewBlock(m){ window.__qspActive=false; blockView(m,BLOCKS,WIRES,'fe',[890,260],card('In one sentence',`<p>Two balanced inputs are halved by 5532 receivers, routed to the front-panel volume board, buffered, and amplified 30 dB by a TDA1521 into two speakers; a headset plugged into the front jack breaks the speaker feeds.</p>`)); }
const SHEETS=[
  {name:'1 · Receivers, power amp', note:'Redrawn from “QSP2 - #Schematic page1.pdf” (QSP.DSN, ISS.3, JULY 3,1998).', svg:()=>
    net(20,90,'IN1 L −')+net(20,200,'IN1 L +')+res(80,90,150,90,'R2','20K0')+cap(150,90,200,90,'C2','33u')+opamp(220,102,'U18A 5532')+res(220,50,280,50,'R33','10K0')+cap(220,30,280,30,'C18','22p')
    +res(80,200,150,200,'R1','20K0')+cap(150,200,200,200,'C1','33u')+opamp(220,212,'U18B 5532',true)+net(300,212,'LEFT')+wire([[280,102],[300,102],[300,150],[200,150],[200,224],[220,224]])+txt(205,145,'R35 10K0',9.5,'var(--ink2)')
    +opamp(400,250,'U26A buffer')+res(470,250,540,250,'R84','75K')+res(380,262,380,330,'R71','100K')+gnd(380,330)
    +chip(560,200,150,'U29 TDA1521',[['9 IN2+','R84'],['1 IN1+','R83'],['2/8 IN−',''],['3 GND','']],[['6 OUT2','LEFT → C49/R86'],['4 OUT1','RIGHT → C48/R85'],['7 V+',''],['5 V−','C47/C50 470\\25']],'2 × power amp')
    +txt(40,420,'P2 (16-way) ↔ AMS4-3 front board: L\\R VOL dual 10K, R-VOL 10K, SW DPDT (STEREO/MONO), HEADPHONE TRS; U24A/B ×2 with R55/R56 30R to the jack.',11)},
  {name:'2 · Line/VU outputs, power', note:'Redrawn from “QSP2 - #Schematic page2.PDF”.', svg:()=>
    net(20,120,'RIGHT')+res(80,120,150,120,'R42','6K2')+cap(170,120,170,180,'C24','680p')+gnd(170,180)+opamp(220,132,'U23A')+wire([[150,120],[200,120],[200,144],[220,144]])
    +res(300,132,370,132,'R45','30R')+net(380,132,'RIGHT OUT +')+opamp(300,220,'U23B inv')+res(300,170,360,170,'R43','10K0')+res(380,232,450,232,'R46','30R')+net(460,232,'RIGHT OUT −')+net(380,100,'R VU IN')
    +chip(560,300,140,'P1 / T1',[['3 LINE',''],['2 NEUTRAL',''],['1 GND','chassis']],[['RED/YEL','bridge'],['BLU/GRY','bridge']],'mains, toroid')+txt(560,430,'C56, C57 2200/25 → V+ / V−',11)},
];
function viewSchem(m){ window.__qspActive=false; schemView(m,SHEETS,'QSP-2 ISS.3','Redrawn from the two CorelDRAW-exported schematic pages; part names and values are copied from them.'); }
function viewSoft(m){ window.__qspActive=true; let hot=2;
  m.innerHTML=`${card('No firmware — the LEFT signal path stage by stage (click a stage)',`<div id="f"></div><div id="det" class="card"></div>`)}${card('The STEREO/MONO switch as a routing table',`<div id="rt"></div>`)}`;
  const draw=()=>{ const st=stageStats(0).map(s=>({t:s.name.slice(0,22),s:[fdb(s.lvl)+' dBu'],bad:s.clip!=null&&s.lvl>s.clip}));
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=stageStats(0)[hot].note||'—';
    m.querySelector('#rt').innerHTML=tbl(['Mode','LEFT speaker level set by','RIGHT speaker level set by','Source of each'],[['STEREO'+(D.stereo?' (now)':''),'CH 1 (gang A)','CH 1 (gang B)','CH 1 input → left, CH 2 input → right'],['MONO'+(!D.stereo?' (now)':''),'CH 1','CH 2','same inputs; two independent mono cues']]); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__qspActive=false;
  m.innerHTML=card('What the QSP folder shows — findings',`<ol>
   <li><b>The front panel is a separate AMS4-3 board.</b> The schematic’s dotted box is titled “AMS4-3”: the QSP-2 borrows its volume/headphone board from the AMS4 monitor family, connected through a 16-way ribbon (P2/H2).</li>
   <li><b>The manual calls it a “dual channel analog audio monitor system”; the drawings call it a “CUE SPEAKER”.</b> The silk reads “QSP-2 CUE SPEAKER” and “SELECT SERIES”.</li>
   <li><b>An unlabelled rear connector.</b> The rear drawing has three .332 × .528 cut-outs; the silk labels only CH 1 and CH 2 INPUT. The third (13.850 in) matches the schematic’s LEFT/RIGHT OUT block — in the photo it is fitted but has no legend (${inf}).</li>
   <li><b>Meter feeds that the QSP never uses.</b> Page 2 brings out “R VU IN / L VU IN” beside balanced line outputs — leftovers of the AMS4 design (${inf}).</li>
   <li><b>The input halves the level.</b> 20K0 in, 10K0 feedback: −6 dB before the volume control, which is how a +24 dBu input stays clean.</li>
   <li><b>Drawing history.</b> QSP-REAR ISS.5: “JUN.28/16 STUD CHANGED TO FH440-5”, “SEPT.25/07 REMOVED (2) MOUNTING HOLES (K)”, “OCT.9/01 .332X.528 WAS .312X.530”, first issue “AUGUST 13th, 1999. by B.H.” QSP-FRONT ISS 4: “MARCH,24/08 (E) HOLE WAS .167 DIA.” and the same Sept 2007 mounting-hole removal.</li>
   <li><b>Two different pot holes.</b> CH 1 sits in hole C (.250 in), CH 2 in hole E (.218 in, enlarged in 2008); the STEREO/MONO switch uses D (.281 in). That fits the schematic: CH 1 is the dual-gang L\\R VOL, CH 2 the single R-VOL (${inf}).</li>
   <li><b>Variants without circuits.</b> QSP2-D (<span class="mono">QSP-2D.DSN</span>, a D-connector rear: QSP-REAR-D75), QSP-XLR (XLR front/rear drawings “Not in ERP”), and QSP6 (M1–M10 drawings, <span class="mono">QSP6ISS3.sch</span>, a 1998 manual README) are in the folder; only the QSP-2 has a readable schematic.</li>
   <li><b>Artwork 2026|59: front/rear panels now from the CorelDRAW silks</b> ${SIM.src(ART_F,'QSP-FRONT-SILK(CURVE).CDR')} and ${SIM.src(ART_R,'QSP-REAR-SILK (CURVE).CDR')} (May 2016), replacing the PNG cuts. The front sheet holds a GREEN plate (WARD-BECK SYSTEMS, QSP-2 CUE SPEAKER, the stripe and the STEREO/MONO button symbol) and a WHITE plate (CH 1, CH 2, STEREO, MONO, HEADSET, SELECT SERIES); the rear is one WHITE plate.</li>
   ${FOOT.map(f=>`<li>${f.text} <span class="muted small">— ${SIM.src(f.src)}</span></li>`).join('')}
   <li><b>Duplicates.</b> <span class="mono">page1.pdf</span> is byte-identical to <span class="mono">QSP2 - #Schematic page1.pdf</span>, and the photos and manual appear twice (folder root and #Photo/#Manual sub-folders).</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>TDA1521 gain 30 dB and 20 kΩ input (data sheet), 8 Ω speakers, ±16 V rails (${inf}).</li><li>Volume pots audio taper, −40 dB … 0 dB (${inf}).</li><li>MONO routes CH 2 input to the right speaker under R-VOL control (manual wording; switch wiring read from the drawing, ${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>QSP - #OBSOLETE #Archive/QSP2.pdf · QSP2 - #Schematic page1.pdf · page2.PDF · QSP2 Front.jpg · QSP2 Rear.jpg</li><li>QSP & QSP-XLR - #Mechanical #DA #2016/QSP-FRONT ISS 4 (PANEL).pdf · QSP-REAR ISS.5 (PANEL).pdf</li><li>QSP & QSP-XLR - #ARTWORK #DA #2016/QSP-FRONT-SILK(CURVE).CDR · QSP-REAR-SILK (CURVE).CDR (→ assets/qsp-front.svg, qsp-rear.svg, Artwork 2026|59)</li></ul>`); }
SIM.register({
  id:'qsp', name:'QSP · QSP-2 dual cue speaker, 1 RU (1998|31–2016|49)', duration:1, product:'QSP', year:1998, family:'Obsolete products', folder:'XXX - QSP  - #Master #OBSOLETE',
  summary:'A 1 RU “Select Series” monitor speaker: two balanced inputs, a TDA1521 power amplifier, CH 1/CH 2 level knobs, a STEREO/MONO switch and a front headset jack that mutes the speakers. Built from the 1998 ISS.3 schematic, the manual, the 2016 panel drawings and the real silks.',
  highlights:['Real QSP-2 front and rear silkscreens on the ISS 4 / ISS.5 panel drawings','STEREO (one knob) vs MONO (two knobs) routing','Headset jack normals mute the speakers','Speaker power and TDA1521 clipping','Two schematic pages redrawn with real part names'],
  depth:'Hardware model',
  footnotes:FOOT,
  stepUnits:[{label:'1 tone cycle',period:()=>1/D.freq[0]},{label:'1 ms',period:()=>0.001},{label:'1 mains cycle',period:()=>1/60}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
