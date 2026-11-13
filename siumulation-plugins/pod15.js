/* =====================================================================
   POD15 — 1×6 (+1) composite video distribution amplifier (Ward-Beck Systems), obsolete master folder
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model (analog video, no code).

   Sources used (#POD #SERIES/XXX - POD15 - #Master #Obsolete/POD15 - #Engineering/):
   - pod15.pdf                                   (POD15 manual: 1×6 + front split, Hi-Z looping input, specs)
   - PCB/pod15aiss3.net, PCB/POD15aiss3.bom      (POD15A issue 3, P-CAD 2009: every net and part used below)
   - PCB/POD15Aiss3-AMS8-7.net                   (the same board re-used for "AMS8-7", Sep 2009)
   - PCB/OBSOLETE/pod15aiss1.net, POD15aiss2.ECO, POD15aiss2.bom (2004–2008 through-hole issues)
   - PCB/OBSOLETE/POD15.DSN, POD15.PCB           (the 1999 OrCAD/Tango original: parts list only)
   - SILK/Pd15Asilk-ISS3.cdr                     (front and rear artwork, converted with Inkscape → assets/pod15-*.png)
   - SILK/OBSOLETE/PD15SILK.CDR                  (the 1999 silk: only the green bar layer survives conversion)
   - Video timing: SMPTE 170M / ITU-R BT.470 standard values (general knowledge, not archive files)
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
const PREFIX='pod15';
const STD = {
  NTSC:{ name:'NTSC 525/59.94', line:1/15734.264, field:1001/60000, lines:525, fsc:3579545.45, sync:-0.286, white:0.714, burst:0.143, hs:4.7e-6, act0:10.9e-6 },
  PAL: { name:'PAL 625/50',     line:64e-6,        field:1/50,       lines:625, fsc:4433618.75, sync:-0.300, white:0.700, burst:0.150, hs:4.7e-6, act0:12.0e-6 },
};
/* issues of the board found in the folder */
const ISS = {
  iss3:{ name:'POD15A issue 3 (SMT, 2009)', sep:'LMH1981 (U2)', clampIc:'GB4571 (U3)', eqAmp:'ISL5002 (U4)', drv:'ISL5002 ×2 (U5, U6)', psu:'VAF1005 (+5 V) + SUS1R5-0505 (−5 V)', oneshot:'CD4538 (U7)', R:100e3, C:0.1e-6, errCol:'#ff4a3a', errName:'RED', termSw:false, rails:5 },
  iss1:{ name:'POD15A issue 1 (through-hole, 2004)', sep:'GS4982 (U4)', clampIc:'GB4571 (U2)', eqAmp:'EL2244 (U7)', drv:'EL2244 ×2 (U5, U6)', psu:'TE70042 toroid + LM317/LM337 (±V)', oneshot:'74HC4538 / CD4538BCN (U3)', R:68e3, C:0.1e-6, errCol:'#3fdc6a', errName:'GREEN', termSw:true, rails:6 },
};
const D = { power:true, iss:'iss3', std:'NTSC', pattern:'bars', cable:150, plugged:true, unplugAt:-1, term:'75', termSw:false,
  eqTrim:0.5, eqFixed:false, clamp:true, lvl:0.5, outs:['term','term','term','term','term','term','term'], log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const S=()=>STD[D.std], I=()=>ISS[D.iss];
const T1 = ()=> I().R*I().C;                          // CD4538: T = R·C (R52 100K × C35 0.1 µF on issue 3)
/* ---------------- the circuit ---------------- */
// INPUT: differential receiver U1 (IN+ = BNC centre via R4, IN− = BNC shell via R5; C1/C2 tie the shell to ground for RF)
// CLAMP switch (PHA-2UEE): pin 2 = direct (LVL wiper), pin 6 = clamped (GB4571 out via R26) → pin 4 = U4-3 (EQ stage input)
// EQ: U4A with the 2K multiturn "EQ" pot + CV1 trimcap + 220p in the feedback leg; U4B adds the fixed section (RV1, CV2) when EQ_FIXED is pressed
// Drivers: U6A → OUT1+OUT2, U5B → OUT3+OUT4, U5A → OUT5+OUT6, U6B → MONITOR, each gain 2 (1K/1K) into 75R back-terminations
const DRV = [['U6A',[0,1]],['U5B',[2,3]],['U5A',[4,5]],['U6B',[6]]];
const OUTN = ['OUT1','OUT2','OUT3','OUT4','OUT5','OUT6','MONITOR'];
const OUTR = ['R47','R46','R40','R39','R38','R37','R48'];
const lossDb = (f,len)=> 3.1*Math.sqrt(Math.max(f,1)/5e6)*len/100;           // RG-59-class coax (inferred)
const eqLen = ()=> D.eqTrim*300 + (D.eqFixed?300:0);                           // panel legend: 0-300m + 300m (600m TOTAL)
const residualDb = f => lossDb(f,D.cable)-lossDb(f,eqLen());
function termGain(){ if(!D.plugged) return 0; const loads = (D.term==='75'?1:D.term==='double'?2:0) + (D.termSw&&I().termSw?1:0);
  return loads===0?2: loads===1?1: 2/3; }
const lvlGain = ()=> Math.pow(10,((D.lvl-0.5)*6)/20);                          // LVL 2K multiturn, ±3 dB (inferred)
function syncAmp(){ return Math.abs(S().sync)*termGain()*Math.pow(10,-lossDb(0.5e6,D.cable)/20); }
function syncPresentAt(t){ return D.power && D.plugged && syncAmp()>0.08 && !(D.unplugAt>=0 && t>=D.unplugAt && !D.plugged); }
/* CD4538 retriggerable one-shot: re-armed by every HSYNCH falling edge; Q stays high T after the last one */
function oneshotQ(t){ if(!D.power) return false; if(D.plugged && syncAmp()>0.08) return true;
  if(D.unplugAt<0) return false; return t>=D.unplugAt && t<D.unplugAt+T1(); }
const synchLed = t => D.power && oneshotQ(t), errorLed = t => D.power && !oneshotQ(t);
const BARS=[[0.75,0],[0.67,0.33],[0.53,0.45],[0.46,0.4],[0.29,0.4],[0.22,0.45],[0.08,0.33],[0,0]];
function patternAt(tl,tAbs){ const s=S(); if (tl<s.hs) return {y:s.sync/s.white,c:0,ph:0}; if (tl<s.hs+0.6e-6) return {y:0,c:0,ph:0};
  if (tl<s.hs+3.1e-6) return {y:0,c:s.burst/s.white,ph:Math.PI}; if (tl<s.act0||tl>s.line-1.5e-6) return {y:0,c:0,ph:0};
  const x=(tl-s.act0)/(s.line-1.5e-6-s.act0);
  if (D.pattern==='bars'){ const b=BARS[Math.min(7,Math.floor(x*8))]; return {y:b[0],c:b[1],ph:Math.floor(x*8)*0.9}; }
  if (D.pattern==='black') return {y:0,c:0,ph:0}; if (D.pattern==='white') return {y:1,c:0,ph:0};
  return {y:(Math.floor((tAbs||0)*2)%2?1:0),c:0,ph:0}; }
const apl = ()=> D.pattern==='black'?0: D.pattern==='white'?1: D.pattern==='bars'?0.38: (Math.floor(SIM.t*2)%2?1:0);
function stage(which,t){
  const s=S(), tl=((t%s.line)+s.line)%s.line, p=patternAt(tl,t), sc=Math.sin(2*Math.PI*s.fsc*t+p.ph);
  let y=p.y*s.white, c=p.c*s.white;
  if (which==='src') return y+c*sc;
  if (!D.plugged || !D.power) return 0;
  const g=termGain(); y*=g; c*=g;
  const ly=Math.pow(10,-lossDb(0.5e6,D.cable)/20), lc=Math.pow(10,-lossDb(s.fsc,D.cable)/20);
  if (which==='in') return y*ly + c*lc*sc;                       // after U1 (gain 1, inferred)
  const Yl=y*ly*lvlGain(), Cl=c*lc*lvlGain();
  if (which==='lvl') return Yl+Cl*sc;
  let off=0; if (!D.clamp){ const a=apl()*s.white*0.6*g, since=D.pattern==='bounce'?(t%0.5):1; off = -(a-0.25*g)*Math.exp(-since/0.06)-(a-0.25*g)*0.15; }
  if (which==='clamp') return Yl+Cl*sc+off;
  const v = Yl*Math.pow(10,lossDb(0.5e6,eqLen())/20) + Cl*Math.pow(10,lossDb(s.fsc,eqLen())/20)*sc + off;
  if (which==='eq') return v;
  return clamp(v,-0.9,1.6);       // at a terminated output (driver ×2 into 75R + 75 Ω load); swing limit inferred from the ±5 V rails
}
function outLevel(i){ const st=D.outs[i]; return st==='term'?1: st==='open'?2: 0; }
function outV(i,t){ return stage('out',t)*outLevel(i); }
function stageStats(){ const s=S(), g=termGain();
  return [
    {name:'Source (1 V p-p into 75 Ω)', lvl:0, gain:null, clip:null, unit:'dB'},
    {name:`Cable ${D.cable} m, loop ${D.term==='75'?'terminated':D.term==='open'?'OPEN':'double-terminated'}${D.termSw&&I().termSw?' + on-board TERM_SW':''}`, lvl:g?20*Math.log10(g)-lossDb(0.5e6,D.cable):-200, gain:g?20*Math.log10(g)-lossDb(0.5e6,D.cable):null, clip:null, unit:'dB', note:`chroma at ${(s.fsc/1e6).toFixed(2)} MHz ${fdb(-lossDb(s.fsc,D.cable))} dB (${inf})`},
    {name:'U1 differential receiver (IN+ / IN−)', lvl:g?20*Math.log10(g)-lossDb(0.5e6,D.cable):-200, gain:0, clip:6, unit:'dB', note:'BNC shell is IN−: ground-loop hum on the shield cancels'},
    {name:`LVL pot (R12 → LVL → R14)`, lvl:g?20*Math.log10(g*lvlGain())-lossDb(0.5e6,D.cable):-200, gain:20*Math.log10(lvlGain()), clip:null, unit:'dB'},
    {name:`CLAMP ${D.clamp?'IN → GB4571 '+'(BPOUT clamp pulse)':'OUT → direct'}`, lvl:g?20*Math.log10(g*lvlGain())-lossDb(0.5e6,D.cable):-200, gain:0, clip:null, unit:'dB'},
    {name:`EQ ${Math.round(eqLen())} m (U4A${D.eqFixed?' + U4B fixed 300 m':''})`, lvl:g?20*Math.log10(g*lvlGain())-residualDb(s.fsc):-200, gain:lossDb(s.fsc,eqLen()), clip:null, unit:'dB', note:`residual at fsc ${fdb(-residualDb(s.fsc))} dB`},
    {name:'R36/R42 75R/75R pad → 4 drivers ×2 → 75R', lvl:g?20*Math.log10(g*lvlGain())-residualDb(s.fsc):-200, gain:0, clip:4, unit:'dB', note:'1 V p-p at each terminated output'},
  ]; }
/* ---------------- actions (each logs the circuit path) ---------------- */
const act=makeActor(D, ()=>`SYNCH ${synchLed(SIM.t)?'on':'off'} · ERROR ${errorLed(SIM.t)?'on':'off'} · EQ residual ${fdb(-residualDb(S().fsc))} dB`);
const A={
  power(){ act(D.power?'Power off (PWRSW)':'Power on (PWRSW)', tr=>{ D.power=!D.power;
    tr(`ACIN (PAN356) → PWRSW (PAN256) → ${I().psu}`); tr(D.power?'+5 V up → PWRLED via R54 (511R); U7 CD4538 starts with Q low → ERROR lit until the first HSYNCH edge':'All drivers lose their rails: every output goes to 0 V'); }); },
  plug(){ act(D.plugged?'Unplug the input cable':'Plug the input cable back in', tr=>{ D.plugged=!D.plugged; D.unplugAt = D.plugged?-1:SIM.t;
    tr(D.plugged?`IN+ / IN− carry video again → ${I().sep} HSOUT (U2-7 net HSYNCH) toggles every line → U7-5 retriggers the one-shot`:`HSYNCH stops. U7 Q (pin 6) stays high for T = R·C = ${SIM.fmtDur(T1())}, then drops: Q2 off (SYNCH dark), Q̄ (pin 7) → R56 → Q1 on → ERROR lit`); }); },
  eqTrim(d){ act(`Turn EQUALIZER ${d>0?'CW':'CCW'}`, tr=>{ D.eqTrim=clamp(+(D.eqTrim+d*0.04).toFixed(3),0,1); tr(`EQ pot (2K multiturn, wiper net NET00014 with CV1, C11 220p, R18, R19) sets U4A's high-frequency gain → ${Math.round(eqLen())} m equalised vs ${D.cable} m cable`); }); },
  eqFixed(){ act(`300m switch → ${D.eqFixed?'out':'in'}`, tr=>{ D.eqFixed=!D.eqFixed; tr(`EQ_FIXED (PHA-2UEE): pin 1 = U4A out, pin 5 = U4B out, pin 3 → R36 → drivers. ${D.eqFixed?'U4B (RV1, CV2, R45/C31, R50/C32) adds a fixed 300 m section':'U4B bypassed'}`); }); },
  clamp(){ act(`CLAMP → ${D.clamp?'OUT':'IN'}`, tr=>{ D.clamp=!D.clamp; tr(D.clamp?`CLAMP pin 4 ← pin 6: signal via C52/C53 into ${I().clampIc} (U3-2), clamp pulse BPOUT (LMH1981 pin 13) on U3-4, output U3-7 → R26`:'CLAMP pin 4 ← pin 2: the LVL wiper feeds U4 directly (AC path, no DC restore)'); }); },
  lvl(d){ act(`Turn LEVEL ${d>0?'CW':'CCW'}`, tr=>{ D.lvl=clamp(+(D.lvl+d*0.04).toFixed(3),0,1); tr(`VIDEO_IN → R12 (47R5) → LVL (2K) → wiper → R14 (0R) → CLAMP switch. Gain ${fdb(20*Math.log10(lvlGain()),2)} dB (${inf}: ±3 dB)`); }); },
  term(){ act('Loop termination → '+({'75':'open','open':'double','double':'75 Ω'})[D.term], tr=>{ D.term=({'75':'open','open':'double','double':'75'})[D.term];
    tr(D.term==='75'?'Correct: Hi-Z bridge + one 75 Ω terminator → 1 V p-p':D.term==='open'?'Unterminated line: the back-terminated source delivers 2 V p-p':'Two terminations → 0.67 V p-p'); }); },
  termSw(){ act(`TERM_SW → ${D.termSw?'off':'on'}`, tr=>{ D.termSw=!D.termSw; tr(I().termSw?'Issue 1 only: TERM_SW (pins 3–6) connects R13 across IN+/IN− — an on-board 75 Ω terminator':'Issue 3 has no TERM_SW: the part was removed from the netlist (finding)'); }); },
  out(i){ act(`${OUTN[i]} → ${({term:'open',open:'short',short:'75 Ω load'})[D.outs[i]]}`, tr=>{ D.outs[i]=({term:'open',open:'short',short:'term'})[D.outs[i]];
    const d=DRV.find(x=>x[1].includes(i)), mate=d[1].filter(k=>k!==i);
    tr(`${OUTN[i]} is fed by ${d[0]} through ${OUTR[i]} (75R)${mate.length?' — the same amplifier also drives '+OUTN[mate[0]]:''}`);
    tr(D.outs[i]==='open'?'Unloaded: the BNC shows 2 V p-p (no divider)':D.outs[i]==='short'?`Shorted: ${OUTN[i]} reads 0 V; ${d[0]} now sources about 27 mA peak into 75R — ${mate.length?OUTN[mate[0]]+' keeps its level because its own 75R isolates it ('+inf+')':'only the monitor is affected'}`:'1 V p-p into 75 Ω'); }); },
  set(k,v,l){ act(l, tr=>{ D[k]=v; tr(k==='iss'?`${ISS[v].name}: sync separator ${ISS[v].sep}, supply ${ISS[v].psu}, one-shot ${ISS[v].oneshot} with T = ${SIM.fmtDur(ISS[v].R*ISS[v].C)}`:k==='cable'?`Cable loss ${fdb(-lossDb(S().fsc,v))} dB at the subcarrier (${inf})`:'Source changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels: 200 px per inch, face 8.570 × 1.606 in ----------------
   Artwork 2026|59: POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr (Jun.24/14, text as curves) via Inkscape →
   assets/pod15-front.svg (GREEN + WHITE plates) and pod15-rear.svg, cut at the panel outline. Controls sit on its cut-outs:
   rear BNC holes at x 273/483/588/693/798/903/1008, y 75/205; IEC cut-out 1359–1607 × 33–249; monitor BNC D-hole at 1557,168.
   The ISS3 file Pd15Asilk-ISS3.cdr (used before, as PNGs) keeps live text that libcdr scrambles, so its labels had been redrawn. */
function frontSVG(){ const on=D.power, t=SIM.t;
  const over = rocker(on,124,58) + pled(on) + led(739,218,synchLed(t),'#3fdc6a') + led(790,218,errorLed(t),I().errCol)
   + trim(939,220,D.eqTrim,'eqt','EQUALIZER 0-300m (EQ, 2K multiturn)')
   + `<g class="eq3" style="cursor:pointer"><title>300m switch EQ_FIXED (${D.eqFixed?'IN':'OUT'}) — click</title><circle cx="1040" cy="217" r="28" fill="#0a0b0c" stroke="#3a3d40" stroke-width="3"/><circle cx="1040" cy="${D.eqFixed?224:212}" r="18" fill="${D.eqFixed?'#2a2d31':'#16181a'}"/></g>`
   + `<g class="clp" style="cursor:pointer"><title>CLAMP push switch (${D.clamp?'IN':'OUT'}) — click</title><circle cx="1239" cy="217" r="28" fill="#0a0b0c" stroke="#3a3d40" stroke-width="3"/><circle cx="1239" cy="${D.clamp?224:212}" r="18" fill="${D.clamp?'#2a2d31':'#16181a'}"/></g>`
   + trim(1390,220,D.lvl,'lvt','LEVEL (LVL, 2K multiturn)') + bnc(1557,168,D.outs[6]!=='open','mo6',`VIDEO MONITOR (${D.outs[6]}) — click to change the load`,44)
   + screw(50,160)+screw(1664,160);
  return layered({w:1714,h:321,layers:[PREFIX+'-front.svg'],over,label:'POD15A front panel (POD15A-FRONT&amp;REAR-SILK (CURVE).cdr)'}); }
function rearSVG(){
  const over = bnc(273,75,D.plugged,'plg',`INPUT — ${D.plugged?'cable from the source (click to unplug)':'nothing connected (click to plug in)'}`,44)
   + bnc(273,205,D.term!=='open','tm',`INPUT loop: ${D.term==='75'?'75 Ω terminator':D.term==='open'?'open (unterminated!)':'two 75 Ω loads'} — click to change`,44)
   + [[483,75],[588,205],[693,75],[798,205],[903,75],[1008,205]].map(([x,y],i)=>bnc(x,y,D.outs[i]!=='open','oo" data-o="'+i,`OUT ${i+1}: ${D.outs[i]} — click: 75 Ω load → open → short`,42)+(D.outs[i]==='short'?`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="22" fill="#ff6b5a" font-weight="700">✕</text>`:'')).join('')
   + iec(1359,33,1607,249)
   + screw(50,160)+screw(1664,160);
  return layered({w:1714,h:321,layers:[PREFIX+'-rear.svg'],over,label:'POD15A rear panel (POD15A-FRONT&amp;REAR-SILK (CURVE).cdr)'}); }
function bindPanel(r){ const p=r.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); bindTrim(r,'eqt',d=>A.eqTrim(d)); bindTrim(r,'lvt',d=>A.lvl(d));
  r.querySelectorAll('.eq3').forEach(g=>g.onclick=()=>A.eqFixed()); r.querySelectorAll('.clp').forEach(g=>g.onclick=()=>A.clamp());
  r.querySelectorAll('.tm').forEach(g=>g.onclick=()=>A.term()); r.querySelectorAll('.plg').forEach(g=>g.onclick=()=>A.plug());
  r.querySelectorAll('.oo').forEach(g=>g.onclick=()=>A.out(+g.dataset.o)); r.querySelectorAll('.mo6').forEach(g=>g.onclick=()=>A.out(6)); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Board <select id="is">${Object.keys(ISS).map(k=>`<option value="${k}" ${k===D.iss?'selected':''}>${ISS[k].name}</option>`).join('')}</select></label>
  <label>Standard <select id="sd">${Object.keys(STD).map(k=>`<option ${k===D.std?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>Pattern <select id="pt">${[['bars','75 % colour bars'],['black','black burst'],['white','white field'],['bounce','bounce (black/white every 0.5 s)']].map(([v,l])=>`<option value="${v}" ${v===D.pattern?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Input cable <input id="cb" type="number" step="25" min="0" value="${D.cable}" style="width:64px"> m</label>
  ${I().termSw?`<label><input type="checkbox" id="ts" ${D.termSw?'checked':''}> TERM_SW (on-board 75 Ω)</label>`:''}</div>
  <div class="small muted">Rear: click the upper INPUT BNC to unplug the cable (watch SYNCH/ERROR and the 10 ms one-shot), the lower one to change the loop termination, an OUT BNC to load/open/short it. Keys: Q/W EQ, E 300m, C clamp, A/S level, U unplug.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#sd')) return;
  g('#is').onchange=e=>A.set('iss',e.target.value,'Board → '+ISS[e.target.value].name); g('#sd').onchange=e=>A.set('std',e.target.value,'Standard → '+e.target.value);
  g('#pt').onchange=e=>A.set('pattern',e.target.value,'Pattern → '+e.target.selectedOptions[0].text); g('#cb').onchange=e=>A.set('cable',Math.max(0,+e.target.value),'Input cable → '+e.target.value+' m');
  if(g('#ts')) g('#ts').onchange=()=>A.termSw(); }
bindKeys('__pod15Active', ()=>({q:()=>A.eqTrim(-1),w:()=>A.eqTrim(1),e:()=>A.eqFixed(),c:()=>A.clamp(),a:()=>A.lvl(-1),s:()=>A.lvl(1),u:()=>A.plug()}));
/* ---------------- timeline ---------------- */
function vLane(label, fn, color){ return { label, h:44, draw(c,X,t0,t1,y,h){ const span=t1-t0, s=S(), Y=v=>y+h-6-(v+0.5)/2.6*(h-10);
  if (span>6*s.line){ c.fillStyle=color; c.globalAlpha=.3; const N=Math.min(400,X(t1)-X(t0));
    for(let i=0;i<N;i++){ const tt=t0+span*i/N, L=Math.floor(tt/s.line)*s.line, top=fn(L+s.act0+(s.line-s.act0)*0.1), bot=fn(L+1e-6); if(Math.abs(top)+Math.abs(bot)<1e-4) continue; c.fillRect(X(tt),Y(Math.max(top,bot)),Math.max(1,(X(t1)-X(t0))/N),Math.abs(Y(bot)-Y(Math.max(top,bot)))+1); }
    c.globalAlpha=1; c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(`${Math.round(span/s.line).toLocaleString()} lines — zoom to 1 line to see one`, X(t0)+6, y+12); return; }
  c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),Y(0)); c.lineTo(X(t1),Y(0)); c.stroke();
  const N=Math.min(3000,Math.max(400,(X(t1)-X(t0))*3)); c.strokeStyle=color; c.lineWidth=1; c.beginPath();
  for(let i=0;i<=N;i++){ const tt=t0+span*i/N, v=fn(tt); i?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); } c.stroke(); }}; }
function lanes(){ const s=S(), a=SIM.css('--accent'), b=SIM.css('--accent2');
  return [
    {label:`Fields (${(1/s.field).toFixed(2)} Hz)`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,s.field,0,3*s.line,b,'fields'); }},
    {label:'HSYNCH (U2-7 → U7-5)', h:20, draw(c,X,t0,t1,y,h){ if(!D.power){return;} const end = D.plugged?t1:Math.min(t1,D.unplugAt); if(end<=t0) { c.fillStyle=SIM.css('--bad'); c.font='11px sans-serif'; c.fillText('no H sync',X(t0)+6,y+14); return; } SIM.pulses(c,X,t0,end,y,h,s.line,0,s.hs,SIM.css('--ink2'),'H sync'); }},
    {label:'BPOUT clamp pulse (U2-13)', h:20, draw(c,X,t0,t1,y,h){ if(!D.clamp||!D.power){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText(D.clamp?'':'CLAMP OUT — U3 bypassed', X(t0)+6, y+14); return; } const end=D.plugged?t1:Math.min(t1,D.unplugAt); if(end>t0) SIM.pulses(c,X,t0,end,y,h,s.line,s.hs+0.6e-6,2.5e-6,SIM.css('--warn'),'back porch'); }},
    boolLane(`U7 one-shot Q (T = ${SIM.fmtDur(T1())})`, t=>oneshotQ(t), b),
    vLane('Source (75 Ω)', t=>stage('src',t), SIM.css('--ink2')), vLane(`U1 out after ${D.cable} m`, t=>stage('in',t), b),
    vLane(`after CLAMP ${D.clamp?'IN':'OUT'}`, t=>stage('clamp',t), a), vLane(`after EQ ${Math.round(eqLen())} m`, t=>stage('eq',t), a), vLane('OUT 1 (terminated)', t=>outV(0,t), a),
    boolLane('SYNCH LED (Q2)', t=>synchLed(t), '#3fbf5f'), boolLane(`ERROR LED (Q1, ${I().errName})`, t=>errorLed(t), I().errCol),
  ]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__pod15Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel',`<div id="fp"></div>${controlsHTML()}`)}${card('Rear panel — click the BNCs',`<div id="rp"></div><div class="small muted" style="margin-top:4px">Front and rear artwork: ${SIM.src('#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr','POD15A-FRONT&REAR-SILK (CURVE).cdr')} (Jun.24/14), FRONT GREEN, FRONT WHITE and REAR WHITE plates.</div>`)}</div>
   <div>${card('What the circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('Outputs now',`<div id="now"></div>`)}</div></div>
   ${card('Timeline — one second, zoomable. Unplug the input and zoom to 10 ms to watch the CD4538 time out.',`<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Stage by stage',`<div id="lv"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Unplug the input, short an output, or trim the EQ.');
    const pk=i=>{ let mx=-9,mn=9; const s=S(), L=Math.floor(SIM.t/s.line)*s.line; for(let k=0;k<300;k++){ const v=outV(i,L+s.line*k/300); mx=Math.max(mx,v); mn=Math.min(mn,v);} return mx-mn; };
    m.querySelector('#now').innerHTML=tbl(['Output','Driver','Load','p-p now'],OUTN.map((n,i)=>[n, DRV.find(d=>d[1].includes(i))[0]+' → '+OUTR[i], D.outs[i], `<span class="mono">${pk(i).toFixed(2)} V</span>`]),true)
      +`<p class="small">SYNCH ${synchLed(SIM.t)?'●':'○'} · ERROR ${errorLed(SIM.t)?'<b style="color:var(--bad)">●</b>':'○'} · sync tip at input ${(syncAmp()*1000).toFixed(0)} mV</p>`;
    m.querySelector('#lv').innerHTML=stageTable(stageStats(),'dB'); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD15', body:`<p>From <span class="mono">pod15.pdf</span>: “a one by six video distribution amplifier with level trim and a seventh output split on the front panel … The input is a high impedance looping input while the outputs are 75 ohm.” The board in this folder is the later POD15A (issue 3): it adds a cable EQUALIZER, a CLAMP switch and SYNCH/ERROR tallies.</p><p>Power is on. Press <b>Next</b>.</p>`, check:()=>true, auto:true},
  {title:'1 · Terminate the loop', body:`<p>The input bridges the line (Hi-Z) and the far loop BNC must carry a 75 Ω terminator. Click the lower rear INPUT BNC through <i>open</i> and <i>double</i> and back to <b>75 Ω</b>, watching the stage table.</p>`, check:()=>D.term==='75'&&D.log.some(e=>e.name.startsWith('Loop termination')), hint:'Click the lower INPUT BNC on the rear panel three times.'},
  {title:'2 · Equalise 150 m of cable', body:`<p>Turn <b>EQUALIZER</b> until the EQ row of the stage table shows a residual within ±0.5 dB at the subcarrier.</p>`, check:()=>D.cable===150&&Math.abs(residualDb(S().fsc))<0.5, hint:'Q/W keys or click the EQUALIZER trim halves.'},
  {title:'3 · The 300 m section', body:`<p>Set the cable to <b>450 m</b>, press the <b>300m</b> switch (EQ_FIXED switches U4B into the path) and trim the rest.</p>`, check:()=>D.cable===450&&D.eqFixed&&Math.abs(residualDb(S().fsc))<0.5, hint:'Cable 450; E key; then Q/W.'},
  {title:'4 · Lose the input', body:`<p>Click the upper rear INPUT BNC to unplug the source. SYNCH does not go out at once: the CD4538 one-shot (U7) holds Q high for T = R52·C35 = 100 kΩ × 0.1 µF = 10 ms after the last H-sync edge. Zoom the timeline to 10 ms around the playhead to see it.</p>`, check:()=>!D.plugged, hint:'Click the upper INPUT BNC (or press U).'},
  {title:'5 · Restore and short an output', body:`<p>Plug the input back in, then short <b>OUT 1</b> (click it twice). OUT 1 and OUT 2 share amplifier U6A, but each has its own 75R, so OUT 2 keeps its level.</p>`, check:()=>D.plugged&&D.outs[0]==='short', hint:'U to re-plug; click OUT 1 twice.'},
  {title:'Done', body:`<p>Restore OUT 1 (click once more). The <b>Findings</b> tab lists what the netlists reveal.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod15Active=true; tutorialView(m,{title:'Tutorial — installing a POD15/POD15A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${stageTable(stageStats(),'dB')}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod15Active=true;
  m.innerHTML=`${card('One second as the POD15 sees it',`<div id="tab"></div>`)}<div class="grid2">${card('At the playhead',`<div id="dev"></div>`)}${card('One line at OUT 1 (waveform monitor view)',`<canvas id="wfm"></canvas>`)}</div>`;
  const draw=()=>{ const s=S(), t=SIM.t;
    m.querySelector('#tab').innerHTML=tbl(['Event','per second','period','what the board does with it'],[
      ['Fields',(1/s.field).toFixed(3),SIM.fmtDur(s.field),'ignored (no vertical processing)'],
      ['Lines / HSYNCH edges',(1/s.line).toFixed(1),SIM.fmtDur(s.line),`each falling edge retriggers U7 (T = ${SIM.fmtDur(T1())}, so ${Math.round(T1()/s.line)} missing lines in a row before ERROR)`],
      ['Back-porch clamp pulses',D.clamp?(1/s.line).toFixed(1):'0',SIM.fmtDur(s.line),'BPOUT → GB4571 pin 4: the clamp samples the back porch'],
      ['Subcarrier cycles',s.fsc.toLocaleString(),SIM.fmtDur(1/s.fsc),'the EQ is judged at this frequency'],
      ['Burst cycles per line','≈ 9','2.5 µs','passes through untouched']]);
    const tl=((t%s.line)+s.line)%s.line;
    m.querySelector('#dev').innerHTML=kvt([['Time',SIM.fmtT(t),1],['Line / position',`${Math.floor((t%s.field)/s.line)+1} · ${(tl*1e6).toFixed(2)} µs ${tl<s.hs?'(H sync)':tl<s.act0?'(back porch)':'(picture)'}`,1],
      ['Source / U1 / EQ / OUT1',['src','in','eq','out'].map(k=>stage(k,t).toFixed(3)).join(' · ')+' V',1],['U7 Q',oneshotQ(t)?'high (SYNCH)':'low (ERROR)']]);
    const {c,w}=SIM.canvas(m.querySelector('#wfm'),220); c.fillStyle='#071007'; c.fillRect(0,0,w,220); c.strokeStyle='rgba(120,255,120,.25)';
    [-0.3,0,0.35,0.7,1].forEach(v=>{ const y=180-(v+0.4)*130; c.beginPath(); c.moveTo(34,y); c.lineTo(w-10,y); c.stroke(); c.fillStyle='rgba(150,255,150,.6)'; c.font='10px sans-serif'; c.fillText(v.toFixed(2)+' V',2,y+3); });
    c.strokeStyle='#8f8'; c.beginPath(); const L0=Math.floor(t/s.line)*s.line; for(let i=0;i<=1200;i++){ const v=outV(0,L0+s.line*i/1200), y=180-(v+0.4)*130; i?c.lineTo(34+(w-44)*i/1200,y):c.moveTo(34,y);} c.stroke(); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:15,y:20,w:170,h:84,t:'INPUT (looping)',s:['IN+ = centre, IN− = shell','U1 diff. receiver'],d:'U1A buffers IN− (via R5, R6 to ground) and U1B subtracts it from IN+ (via R4): hum on the cable shield cancels. Output net VIDEO_IN.'},
  lvl:{x:205,y:20,w:150,h:84,t:'LEVEL',s:['R12 → LVL 2K → R14','±3 dB (inferred)'],d:'The LVL multiturn pot sits right after the receiver, before the clamp and EQ.'},
  sep:{x:205,y:140,w:150,h:90,t:'Sync separator',s:['LMH1981 (iss 3)','GS4982 (iss 1)'],d:'Fed from VIDEO_IN through C4. HSOUT → HSYNCH net (one-shot), BPOUT → clamp pulse. CSOUT, VSOUT, FSOUT, OEOUT unused.'},
  cl:{x:375,y:20,w:150,h:84,t:'CLAMP',s:['GB4571 DC restorer','PHA-2UEE switch'],d:'In: signal through C52/C53 to U3-2, clamp pulse on U3-4, output U3-7 → R26. Out: the switch takes the direct path from the LVL wiper.'},
  eq:{x:545,y:20,w:160,h:84,t:'EQUALIZER',s:['U4A: 0–300 m pot','U4B: fixed 300 m'],d:'Frequency-dependent gain in U4A’s feedback leg (EQ pot, CV1, 220p). EQ_FIXED selects U4A alone or U4A→U4B.'},
  drv:{x:545,y:140,w:160,h:90,t:'4 drivers ×2',s:['R36/R42 pad in','U5, U6 dual amps'],d:'Each amplifier half has 1K/1K feedback (gain 2) and drives one or two 75R back-terminations.'},
  out:{x:375,y:250,w:330,h:70,t:'OUT1–6 + VIDEO MONITOR',s:['U6A:1,2 · U5B:3,4 · U5A:5,6 · U6B:MON'],d:'Pairs of outputs share an amplifier half; the front VIDEO MONITOR has its own.'},
  led:{x:15,y:150,w:170,h:84,t:'CD4538 one-shot',s:['T = R52·C35 = 10 ms','Q → SYNCH, Q̄ → ERROR'],d:'Retriggered by each H sync. Q drives Q2 (SYNCH LED), Q̄ drives Q1 (ERROR LED). The second half of U7 is unused.'},
  psu:{x:15,y:258,w:170,h:62,t:'Power',s:['VAF1005 + SUS1R5-0505'],d:'Issue 3: AC → VAF1005 (+5 V) → FB1 → SUS1R5-0505 (−5 V). Issue 1: toroid + LM317/LM337.'},
};
const WIRES=[['in','lvl',''],['lvl','cl',''],['cl','eq',''],['eq','drv',''],['drv','out','×7'],['in','sep','C4'],['sep','cl','BPOUT'],['sep','led','HSYNCH']];
function viewBlock(m){ window.__pod15Active=false; blockView(m,BLOCKS,WIRES,'led',[720,330],card('In one sentence',`<p>A differential bridging input, a level trim, a switchable back-porch clamp, a two-section cable equaliser and four ×2 drivers feeding seven 75 Ω outputs; a sync separator and a 10 ms one-shot light SYNCH or ERROR.</p>`)); }
const SHEETS=[
  {name:'1 · Input, level, sync', note:'Redrawn from pod15aiss3.net (P-CAD netlist, Oct 2009). Values from POD15aiss3.bom where listed.', svg:()=>
    net(20,100,'INPUT-1 (IN+)')+net(20,160,'INPUT-2 (IN−)')+res(110,100,190,100,'R4','33R2')+res(110,160,190,160,'R5','33R2')+cap(150,160,150,220,'C2','0.1')+gnd(150,220)
    +opamp(230,112,'U1B (pins 5,6,7)')+wire([[190,100],[205,100],[205,124],[230,124]])+opamp(230,200,'U1A (pins 1,2,3)')+wire([[190,160],[200,160],[200,212],[230,212]])
    +wire([[290,200],[310,200],[310,90],[230,90],[230,100]])+txt(312,150,'R9/R10',10,'var(--ink2)')+wire([[290,112],[350,112]])+net(300,128,'VIDEO_IN')
    +res(350,112,420,112,'R12','47R5')+txt(430,80,'LVL 2K (CW)',11)+res(470,112,470,180,'LVL','2K')+res(470,180,470,240,'R13','180R')+gnd(470,240)+wire([[420,112],[470,112]])+net(480,150,'wiper → R14 (0R) → CLAMP-2')
    +cap(350,112,350,280,'C4','')+chip(600,250,150,'U2 LMH1981',[['4 VIN','C4'],['1 RSET','R17 10K'],['3 VCC','+5V']],[['7 HSOUT','HSYNCH'],['13 BPOUT','BPOUT'],['12 CSOUT','—'],['8 VSOUT','—'],['14 OEOUT','—']],'sync separator (iss 3)')+wire([[350,280],[566,280]])},
  {name:'2 · Clamp and equaliser', note:'CLAMP and EQ_FIXED are PHA-2UEE push switches; pin numbers as in the netlist.', svg:()=>
    net(20,80,'LVL wiper (NET00047)')+cap(150,80,210,80,'C52','')+cap(210,80,270,80,'C53','')+chip(300,60,140,'U3 GB4571',[['2 IN','C53'],['4 CLAMP','BPOUT'],['1 HOLD','C12 1nF']],[['7 OUT','R26 33R2'],['8 VCC','+5V'],['6 VEE','−5V']],'DC restorer')
    +chip(560,60,140,'CLAMP (SW)',[['2','direct'],['6','clamped (R26)']],[['4 common','U4-3'],['1','+5V']],'PHA-2UEE')
    +opamp(160,300,'U4A EQ')+txt(110,350,'feedback: R23 1K1, R22 3K57 to GND, R20 → EQ pot (2K) → R16 30R',10,'var(--ink2)')+txt(110,365,'wiper: CV1 trimcap, C11 220p, R18, R19, R21 3K32',10,'var(--ink2)')
    +opamp(330,300,'U4B fixed 300 m')+txt(300,395,'R30 1K1, R29 3K57, RV1 2K, CV2, R45/C31, R50/C32',10,'var(--ink2)')+wire([[220,300],[300,300],[300,312],[330,312]])
    +chip(560,250,150,'EQ_FIXED (SW)',[['1','U4A out'],['5','U4B out']],[['3 common','R36 75R → drivers']],'PHA-2UEE')},
  {name:'3 · Drivers and tallies', note:'Four amplifier halves, gain 2 (all feedback pairs are 1K/1K in the BOM), 75R back-terminations.', svg:()=>
    [['U6A',['OUT1 ← R47','OUT2 ← R46'],60],['U5B',['OUT3 ← R40','OUT4 ← R39'],150],['U5A',['OUT5 ← R38','OUT6 ← R37'],240],['U6B',['MONITOR ← R48'],330]].map(([u,o,y])=>opamp(140,y,u+' ×2')+wire([[200,y],[260,y]])+o.map((t,k)=>res(260,y-10+k*22,330,y-10+k*22,'','')+net(340,y-10+k*22,t)).join('')).join('')
    +net(20,200,'NET00018 (R36/R42)')+chip(520,80,150,'U7 CD4538',[['5 −TR (B1)','HSYNCH'],['4 +TR (A1)','GND'],['2 RXCX1','R52 100K, C35 0.1']],[['6 Q1','R55 → Q2 → SYNCH'],['7 Q̄1','R56 → Q1 → ERROR'],['3 RESET','+5V']],'retriggerable one-shot')
    +txt(520,330,'T = R·C = 100 kΩ × 0.1 µF = 10 ms',12)+txt(520,350,'LEDs: anodes to +5 V, cathodes via R53 / R49 to Q2 / Q1 collectors',10.5,'var(--ink2)')},
  {name:'4 · Power (issue 3 vs issue 1)', note:'Issue 3: pod15aiss3.net. Issue 1: OBSOLETE/pod15aiss1.net (2004).', svg:()=>
    chip(60,80,150,'ACIN PAN356',[['1','GNDD'],['2','PSU-2'],['3','PWRSW-2']],[],'IEC inlet')+chip(300,80,150,'PSU VAF1005',[['1','PWRSW-1'],['2','ACIN-2']],[['5','+5V'],['3,4','GNDD']],'AC → +5 V')
    +chip(560,80,160,'REG1 SUS1R5-0505',[['1','FB1 / +5V']],[['5','−5V'],['2,3','GNDD']],'DC-DC')
    +txt(60,300,'Issue 1: T3 TE70042 toroid → D5–D8 1N4003 → REG2 LM317 (+V) / REG1 LM337 (−V), plus TERM_SW and GS4982.',11.5)
    +txt(60,322,'PWRLED: +5 V → R54 (511R, issue 3) / R60 (issue 1) → green LED.',11.5)},
];
function viewSchem(m){ window.__pod15Active=false; schemView(m,SHEETS,'POD15A iss 3','Redrawn from the P-CAD netlists and BOM in this folder; pin and net names are real, layout is not the original CAD.'); }
function viewSoft(m){ window.__pod15Active=true; let hot=6;
  m.innerHTML=`${card('No firmware — the signal path stage by stage (click a stage)',`<div id="f"></div><div id="det" class="card"></div>`)}<div class="grid2">${card('Cable loss vs EQ (live)',`<canvas id="fr"></canvas>`)}${card('SYNCH/ERROR state machine (CD4538)',`<div id="sm"></div>`)}</div>`;
  const draw=()=>{ const s=S();
    const st=[{t:'INPUT',s:['IN+/IN− diff','U1']},{t:`Cable ${D.cable} m`,s:[fdb(-lossDb(s.fsc,D.cable))+' dB @ fsc']},{t:'LEVEL',s:[fdb(20*Math.log10(lvlGain()),2)+' dB']},{t:`CLAMP ${D.clamp?'IN':'OUT'}`,s:[D.clamp?'GB4571':'direct']},{t:`EQ ${Math.round(eqLen())} m`,s:[fdb(-residualDb(s.fsc))+' dB left'],bad:Math.abs(residualDb(s.fsc))>3},{t:'Drivers',s:['×2 → 75R','4 halves']},{t:'Tallies',s:[synchLed(SIM.t)?'SYNCH':'ERROR']}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=['Differential input: the BNC shell is not grounded directly (C1/C2 to ground), so the receiver rejects shield hum.','Coax loss grows with √f ('+inf+').','The LVL pot divides VIDEO_IN before everything else, so a hot input can clip U1 before LEVEL can help.','Clamp: GB4571 samples the back porch during BPOUT and pulls blanking to a fixed DC level every line.',`EQ residual at ${(s.fsc/1e6).toFixed(2)} MHz: ${fdb(-residualDb(s.fsc))} dB.`,'Each driver half: gain 2, 1K/1K, into one or two 75R resistors.',`HSYNCH retriggers U7; T = ${SIM.fmtDur(T1())}.`][hot];
    const {c,w}=SIM.canvas(m.querySelector('#fr'),200); const X=f=>40+(Math.log10(f)-5)/(Math.log10(8e6)-5)*(w-60), Y=d=>20+(d+6)/26*160;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; [1e5,1e6,s.fsc,5e6].forEach(f=>{ c.beginPath(); c.moveTo(X(f),20); c.lineTo(X(f),180); c.stroke(); c.fillText((f/1e6).toFixed(f<1e6?1:2)+' MHz',X(f)+2,195); });
    [0,-6,-12,-18].forEach(d=>c.fillText(d+' dB',2,Y(-d)+3));
    [[f=>lossDb(f,D.cable),SIM.css('--accent2'),'cable'],[f=>-lossDb(f,eqLen()),SIM.css('--warn'),'EQ'],[f=>residualDb(f),SIM.css('--accent'),'result']].forEach(([fn,col,lb],k)=>{ c.strokeStyle=col; c.lineWidth=2; c.beginPath(); for(let i=0;i<=100;i++){ const f=Math.pow(10,5+i/100*(Math.log10(8e6)-5)); i?c.lineTo(X(f),Y(fn(f))):c.moveTo(X(f),Y(fn(f))); } c.stroke(); c.fillStyle=col; c.fillText(lb,w-60,30+k*14); });
    const q=oneshotQ(SIM.t);
    m.querySelector('#sm').innerHTML=loopSVG([{t:'Q low · ERROR',s:['power-up / no sync']},{t:'HSYNCH edge',s:['U7-5 falling edge']},{t:'Q high · SYNCH',s:['T restarts every line']},{t:`no edge for ${SIM.fmtDur(T1())}`,s:['RC times out']}], q?2:0,'CD4538 half A (U7 pins 1–7)'); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod15Active=false;
  m.innerHTML=card('What the POD15 folder shows — findings',`<ol>
   <li><b>The POD15A circuit is archived here, not in the POD15A folder.</b> <span class="mono">pod15aiss3.net</span> and <span class="mono">POD15aiss3.bom</span> (2009) hold the full POD15A issue 3 netlist. The <span class="mono">pod15a</span> plugin had to infer the circuit; this one uses the nets.</li>
   <li><b>ERROR is simply “no sync”.</b> The CD4538 one-shot (U7, T = R52·C35 = 10 ms) is retriggered by the LMH1981 HSOUT. Q lights SYNCH through Q2, Q̄ lights ERROR through Q1. Nothing measures the EQ or the level.</li>
   <li><b>The ERROR LED colour changes between files.</b> <span class="mono">pod15aiss3.net</span> says RED; the BOM groups “3 GREEN: ERROR, PWRLED, SYNCH”; <span class="mono">POD15Aiss3-AMS8-7.net</span> and issue 1 say GREEN.</li>
   <li><b>Part value vs footprint.</b> U1, U4, U5 and U6 are valued <span class="mono">ISL5002IBZ</span> but placed on the <span class="mono">EL2244-SO8</span> (dual op-amp) pattern, and the netlist uses both halves (pins 1–3 and 5–7). Issue 1 used real EL2244s.</li>
   <li><b>Outputs share amplifiers.</b> U6A drives OUT1 and OUT2, U5B OUT3/OUT4, U5A OUT5/OUT6, U6B only the MONITOR. A shorted output does not change its partner’s level (separate 75R), but doubles that half’s current (${inf}).</li>
   <li><b>The input is differential.</b> IN− is the BNC shell, returned to ground only through C1 (DNI) / C2 (0.1 µF). That is unusual for a video DA and rejects shield hum.</li>
   <li><b>Issue 1 had an input terminator switch.</b> TERM_SW (R13 across IN+/IN−) exists in <span class="mono">pod15aiss1.net</span> and is gone in issue 3. Issue 1 also used a GS4982 separator and a linear ±V supply (TE70042 toroid, LM317/LM337).</li>
   <li><b>A 2005 ECO rewired the clamp.</b> <span class="mono">POD15aiss2.ECO</span> (9 Jan 2005) deletes the CLAMP-5 ↔ U2-4 link and joins U2-4 straight to the separator (U4-5): from then on the clamp pulse is always present and the switch only selects the path. A 2008 change sets R53 = 931R, RV1 = 2K, R61 = 68K, R28/R29 = 1K62.</li>
   <li><b>The board was re-used.</b> <span class="mono">POD15Aiss3-AMS8-7.net</span> is the same circuit plus five panel connectors (P1–P5), extra bulk capacitors and a PTH08080W regulator: the POD15A video DA reborn inside an AMS8 frame.</li>
   <li><b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src('#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr','POD15A-FRONT&REAR-SILK (CURVE).cdr')} (Jun.24/14).</b> It is the same face as ${SIM.src('#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/Pd15Asilk-ISS3.cdr','Pd15Asilk-ISS3.cdr')} (2010, the issue-3 board's silk) with the text converted to curves, so every label now comes out right; the old PNGs had to have “by Ward-Beck Systems” and the rear caution text redrawn. On it the input and output BNCs sit ≈0.05 in lower than the old placement (y 75/205 px), and the rear power legend reads “90-230 VAC, 50-60 Hz, ½ A.S.B.”.</li>
   <li><b>Silk mismatch.</b> The ISS3 CorelDRAW rear says “100-240 VAC, 50-60 Hz, ½ A.S.B.”; the 2016 POD15A PDF says “90-230 VAC”. The manual (<span class="mono">pod15.pdf</span>) still says 115 V AC/60 Hz, 12 VA.</li>
   <li><b>The 1999 POD15 is almost gone.</b> Only <span class="mono">POD15.DSN</span>/<span class="mono">POD15.PCB</span> parts lists (BNCs OUT1–6, headers P1/P2, 470 µF supply caps) and a silk whose text no longer converts survive.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Coax loss 3.1 dB/100 m at 5 MHz ∝ √f; the EQ applies the inverse for the set length (${inf}).</li><li>LVL range ±3 dB; U1 gain 1; sync detection needs more than 80 mV of sync (${inf}).</li><li>Issue 1 one-shot T uses R61 = 68K (2008 ECO) with 0.1 µF (${inf}: C value not in the ECO).</li><li>Clamp-out bounce: AC coupling with about 60 ms recovery (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD15 - #Engineering/pod15.pdf</li><li>PCB/pod15aiss3.net · POD15aiss3.bom · POD15Aiss3-AMS8-7.net</li><li>PCB/OBSOLETE/pod15aiss1.net · POD15aiss2.ECO · POD15aiss2.bom · POD15.DSN · POD15.PCB</li><li>SILK/Pd15Asilk-ISS3.cdr (→ assets/pod15-front-green.png, pod15-front-white.png, pod15-rear-white.png)</li><li>MECHANICAL/POD15A-FRONT.dwg, POD15A-REAR.dwg (not renderable here; the panel holes match the silk crosshairs)</li></ul>`); }
SIM.register({
  footnotes:[{text:"The 2014 curve silk is the same face as the 2010 ISS3 file with its text converted to curves; the ISS3 file's live text comes out scrambled.",src:"#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr"},{text:"The 2014 silk's rear power legend reads “90-230 VAC, 50-60 Hz, ½ A.S.B.”; the ISS3 file says “100-240 VAC” and the manual still says 115 V AC/60 Hz.",src:"#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr"},{text:"Pd15Asilk-ISS3.cdr is stored twice, in the POD15 SILK folder and in the POD15A #ARTWORK folder.",src:"#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/Pd15Asilk-ISS3.cdr"},{text:"The VIDEO MONITOR output is a D-shaped BNC cut-out on the front, at 7.78 in.",src:"#POD #SERIES/POD15A - #Master/POD15A - #ARTWORK #DA #2016/POD15A-FRONT&REAR-SILK (CURVE).cdr"},{text:"The 1999 POD15 silk converts only its green bar layer; its text does not survive.",src:"#POD #SERIES/XXX - POD15 - #Master #Obsolete/POD15 - #Engineering/SILK/OBSOLETE/PD15SILK.CDR"}],
  
  id:'pod15', name:'POD15 · 1×6 composite video DA, POD15A board (1999|32–2009|42)', duration:1, product:'POD15', year:1999, family:'Obsolete products', folder:'#POD #SERIES/XXX - POD15 - #Master #Obsolete',
  summary:'Half-rack video distribution amplifier: a bridging looping input, a level trim and seven 75 Ω outputs (six rear, one front monitor). The folder holds the later POD15A issue 1 and issue 3 netlists, so this model runs on the real nets: differential input, GB4571 clamp, two-section EQ, paired drivers and a CD4538 sync one-shot.',
  highlights:['Real POD15A ISS3 silkscreen with working EQ, 300 m, CLAMP and LEVEL controls','SYNCH/ERROR from the real CD4538 10 ms one-shot','Shorted, open and terminated outputs on paired drivers','Issue 1 vs issue 3 board differences from the netlists','Four redrawn schematic sheets with real net names'],
  depth:'Hardware model',
  stepUnits:[{label:'1 line',period:()=>S().line},{label:'1 field',period:()=>S().field},{label:'1 ms',period:()=>0.001},{label:'1 subcarrier cycle',period:()=>1/S().fsc}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms (one-shot)'],[0.0002,'3 lines'],[64e-6,'1 line'],[1e-5,'10 µs'],[1e-6,'1 µs']], defaultZoom:4,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
