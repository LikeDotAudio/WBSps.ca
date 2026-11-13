/* =====================================================================
   POD8A — Analog audio distribution amplifier, 2 in / 2 × 8 out (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.

   Sources used (all in this archive, folder #POD #SERIES/POD8A - #Master):
   - POD8A - #ARTWORK #DA #2016/POD8A-FRONT & REAR-PHX.pdf           (front + Phoenix rear silk, Jun 23 2015)
   - POD8A - #ARTWORK #DA #2016/POD8A-REAR-QTP & XLR-SILK (CURVE).pdf (QTP and XLR rear silks, Jul 6 2015) + PICS/
   - POD8A - #TESTREPORT/Pod8A-03JUL15.pdf                            (stock unit test: POD 8-1 ISS 4, POD 8-4 rear ISS 4, max out +27.5 dBu, max in +27 dBu)
   - POD8A - #QUOTES/POD8A - QUOTE/SQ20148, SQ20152 (18 Dec 2015)      (SA-POD8A-MAIN, SA-POD8A-XLR, IRM-15-15 supply)
   - POD8A - #Mechanical #DA #2016/ (front ISS 4, rear PHX ISS 4, QTP ISS 1, XLR ISS 1)
   No schematic, BOM or netlist is archived: the circuit inside is inferred and marked so on screen.
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
/* Artwork 2026|59: both panels come straight from the CorelDRAW sheet POD8A-FRONT & REAR-PHX-SILK (CURVE).cdr (Jul.23/15, text as curves). Inkscape → plain SVG;
   the FRONT GREEN, FRONT WHITE and REAR WHITE plates were cut at their outline (x 114.04 pt; y 74.15 / 254.18 / 429.87 pt; 617.04 × 115.63 pt = 8.570 × 1.606 in),
   the two front plates registered on one face and inked POD green rgb(52,168,83) / white rgb(240,240,236). Cut-outs, screw holes
   and drill centre marks are kept as faint geometry, not ink (the photos show no printed crosshairs). 1 pt = 200/72 px, so the
   art lands on the same 1714 × 321 grid as the controls. */
const ART_SRC = '#POD #SERIES/POD8A - #Master/POD8A - #ARTWORK #DA #2016/POD8A-FRONT & REAR-PHX-SILK (CURVE).cdr';
const ART_CAP = `<div class="small muted" style="margin-top:4px">Front and rear artwork: ${SIM.src(ART_SRC, 'POD8A-FRONT & REAR-PHX-SILK (CURVE).cdr')} (CorelDRAW, Jul.23/15 · ${SIM.year(2015)}), green and white plates registered on one panel.</div>`;
const QTP_SRC = '#POD #SERIES/POD8A - #Master/POD8A - #ARTWORK #DA #2016/POD8A-REAR-QTP & XLR-SILK (CURVE).cdr';
const QTP_CAP = `<div class="small muted" style="margin-top:4px">Front artwork: ${SIM.src(ART_SRC, 'POD8A-FRONT & REAR-PHX-SILK (CURVE).cdr')} (Jul.23/15) · QTP and XLR rear artwork: ${SIM.src(QTP_SRC, 'POD8A-REAR-QTP & XLR-SILK (CURVE).cdr')} (CorelDRAW, Jul.06/15 · ${SIM.year(2015)}).</div>`;
const PW = 1714, PH = 321;
function panelSVG(prefix, side, inner, label){
  const art = `${prefix}-${side==='front'?'front':(inner.art||'rear')}.svg`;
  return `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${label||''}" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="glow${side}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${PW}" height="${PH}" rx="10" fill="var(--dev)"/>
    ${inner.under||''}
    <image href="${ASSET}${art}" width="${PW}" height="${PH}" preserveAspectRatio="none" style="pointer-events:none"/>
    ${inner.over||''}
    ${screw(50,160)}${screw(1664,160)}
  </svg>${side==='front'?'':(inner.cap||ART_CAP)}`;
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

const PREFIX='pod8a';
const OUTS=['A1','A2','A3','A4','A5','A6','A7','A8','B1','B2','B3','B4','B5','B6','B7','B8'];
const V = { rail:15, swingLoss:1.7, inRange:10, outRange:6, Rout:30 };      // all inferred (see Findings); rails from the measured +27.5 dBu
const D = { power:true, powerAt:-1, mode:'STEREO', gen:{A:4,B:4,f:1000,phaseB:0}, plug:{A:true,B:true}, inTrim:{A:0.5,B:0.5}, outTrim:OUTS.map(()=>0.5), load:600, rear:'PHX', sel:0, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const dB=g=>20*Math.log10(Math.max(g,1e-12));
const railAt=t=>ramp(D.power,D.powerAt,t,V.rail,0.03,0.01);           // IRM-15-15 start-up ≈ 30 ms (inferred)
const swing=t=>Math.max(0,railAt(t)-V.swingLoss);
const hc=(v,l)=>clamp(v,-l,l);
const gIn = s => Math.pow(10, (D.inTrim[s]*2-1)*V.inRange/20);
const gOut = i => Math.pow(10, (D.outTrim[i]*2-1)*V.outRange/20);
const vin=(s,t)=>D.plug[s]?dbu2v(D.gen[s])*Math.SQRT2*Math.sin(2*Math.PI*D.gen.f*t+(s==='B'?D.gen.phaseB*Math.PI/180:0)):0;
/* mode switch (front, 3-position): which bus feeds each output bank */
function busSrc(bank){ if (D.mode==='STEREO') return bank; if (D.mode==='MONO') return 'A'; return 'SUM'; }
function bus(src,t){ const lim=2*swing(t); const a=hc(gIn('A')*vin('A',t),lim), b=hc(gIn('B')*vin('B',t),lim); return src==='A'?a:src==='B'?b:hc(0.5*(a+b),lim); }
function outV(i,t){ const lim=swing(t), src=busSrc(OUTS[i][0]); const leg=hc(gOut(i)*bus(src,t)/2,lim); return 2*leg*D.load/(D.load+2*V.Rout); }  // balanced: each leg carries half the differential bus
/* levels (dBu); SUM adds A and B as voltages with B's phase offset */
function busLevel(src){ const lim=v2dbu((V.rail-V.swingLoss)/Math.SQRT2)+6.02; const a=D.plug.A&&D.power?D.gen.A+dB(gIn('A')):-200, b=D.plug.B&&D.power?D.gen.B+dB(gIn('B')):-200;
  if (src==='A') return {l:a,lim}; if (src==='B') return {l:b,lim};
  const va=a<-150?0:Math.pow(10,a/20), vb=b<-150?0:Math.pow(10,b/20), ph=D.gen.phaseB*Math.PI/180; const m=0.5*Math.hypot(va+vb*Math.cos(ph), vb*Math.sin(ph)); return {l:m>0?20*Math.log10(m):-200, lim}; }
function outLevel(i){ const src=busSrc(OUTS[i][0]), b=busLevel(src); const l=b.l<-150?-200:b.l+dB(gOut(i))+dB(D.load/(D.load+2*V.Rout)); return {l, src, clip:l>b.lim+0.01 || b.l>b.lim+0.01, lim:b.lim}; }
const act=makeActor(D,()=>`mode ${D.mode} · A1 ${fdb(outLevel(0).l)} · B1 ${fdb(outLevel(8).l)} dBu`);
const A={
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t; tr('Rocker → IRM-15-15 (15 W, 15 V module, per quote SQ20148) on SA-POD8A-MAIN'); tr('A ± rail converter for the op-amps is '+inf+' — +27.5 dBu out (test report) needs about ±15 V'); } else tr('Supply off: every output goes silent'); }); },
  mode(){ const order=['MONO','SUM','STEREO']; const n=order[(order.indexOf(D.mode)+1)%3]; act(`MODE switch → ${n}`, tr=>{ D.mode=n;
    tr(n==='STEREO'?'Input A → A1–A8, input B → B1–B8':n==='MONO'?'Input A (labelled “A MONO”) → all sixteen outputs':'(A + B)/2 → all sixteen outputs ('+inf+': gain of the sum)');
    tr('Front 3-position toggle; the bus switching circuit is not archived ('+inf+')'); }); },
  trim(i,dir){ act(`Turn OUTPUT ${OUTS[i]} trim ${dir>0?'up':'down'}`, tr=>{ D.outTrim[i]=clamp(+(D.outTrim[i]+dir*0.04).toFixed(3),0,1); D.sel=i; tr(`${OUTS[i]} driver gain ${fdb(dB(gOut(i)))} dB (±${V.outRange} dB range ${inf}) → ${fdb(outLevel(i).l)} dBu`); }); },
  inTrimT(s,dir){ act(`Turn INPUT ${s} trim ${dir>0?'up':'down'}`, tr=>{ D.inTrim[s]=clamp(+(D.inTrim[s]+dir*0.04).toFixed(3),0,1); tr(`Input ${s} receiver gain ${fdb(dB(gIn(s)))} dB (±${V.inRange} dB range ${inf}); every output on that bus follows`); }); },
  plug(s){ act(`${D.plug[s]?'Disconnect':'Connect'} INPUT ${s}`, tr=>{ D.plug[s]=!D.plug[s]; tr(D.plug[s]?`Source on the INPUT ${s} terminals (+ − G)`:'Input open'); }); },
  set(k,v,l){ act(l,tr=>{ if(k==='load'||k==='rear') D[k]=v; else D.gen[k]=v; tr(k==='rear'?`Rear panel option → ${v} (${v==='PHX'?'18 three-pin Phoenix plugs':v==='QTP'?'one QTP input and four QTP output connectors':'XLRs on a 17.17-inch rear: INPUT A, B and only twelve outputs, B6…B1 and A6…A1 — A7/A8/B7/B8 have no connector'})`:'Source or load changed'); }); },
  reset(){ Object.assign(D,JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
/* ---------------- panels ---------------- */
const TX=i=>455+i*63.07;
function modeSw(x,y){ const pos={MONO:-1,SUM:0,STEREO:1}[D.mode]; return `<g class="md" style="cursor:pointer"><title>MODE: MONO / SUM / STEREO — click to step</title><rect x="${x-34}" y="${y-14}" width="68" height="28" rx="6" fill="#0b0c0d" stroke="#555" stroke-width="2"/><rect x="${x+pos*20-9}" y="${y-11}" width="18" height="22" rx="3" fill="#cfd2d5"/></g>`; }
function frontSVG(t){ const on=D.power&&railAt(t)>5; let over=rocker(D.power)+led(297,217,on,'var(--led-g)',10)+modeSw(372,206);
  OUTS.forEach((n,i)=>{ over+=trim(TX(i),220,D.outTrim[i],'ot'+i,'OUTPUT '+n+' level'); });
  over+=trim(1517,220,D.inTrim.A,'itA','INPUT A (MONO) level')+trim(1580,220,D.inTrim.B,'itB','INPUT B level');
  return panelSVG(PREFIX,'front',{over},'POD8A front panel (real silkscreen)'); }
function rearSVG(){ let over='';
  if (D.rear==='PHX'){ over+=phx(225,50,D.plug.A,'plA','INPUT A (MONO) — click')+phx(225,240,D.plug.B,'plB','INPUT B — click');
    for (let k=0;k<8;k++){ const x=379+k*109.6; over+=phx(x,50,false,'',`OUTPUT A${8-k}`)+phx(x,240,false,'',`OUTPUT B${8-k}`); }
    over+=iec(1390,40,1616,230);
    return panelSVG(PREFIX,'rear',{over},'POD8A rear panel, Phoenix version (real silkscreen)'); }
  if (D.rear==='XLR') return xlrRearSVG();
  /* QTP rear (POD8A-REAR-QTP & XLR-SILK (CURVE).cdr, REAR-QTP plate): one INPUT cut-out 128 × 136 px at x 166 and four OUTPUT
     cut-outs at x 426 / 580 / 734 / 888, IEC opening 1359–1607 × 33–249 — all measured from the converted CDR. */
  const qtp=(x0,y0,lit,cls,title)=>`<g class="${cls||''}" style="${cls?'cursor:pointer':''}">${title?`<title>${title}</title>`:''}<rect x="${x0+6}" y="${y0+6}" width="116" height="124" rx="8" fill="#1d1f21" stroke="#5d6166" stroke-width="3"/>${[...Array(8)].map((_,k)=>`<circle cx="${x0+38+(k%2)*52}" cy="${y0+26+Math.floor(k/2)*28}" r="8" fill="${lit&&lit(k)?'#2b5f9e':'#c9b46a'}"/>`).join('')}</g>`;
  over+=qtp(166,94,k=>(D.plug.A&&k<2)||(D.plug.B&&(k===2||k===3)),'',`QTP INPUT — A (MONO) on pins 2,1, B on 4,5 (silk table)`)
    +`<rect class="plA" x="166" y="94" width="64" height="136" fill="transparent" style="cursor:pointer"><title>INPUT A (MONO) — click to connect/disconnect</title></rect><rect class="plB" x="230" y="94" width="64" height="136" fill="transparent" style="cursor:pointer"><title>INPUT B — click to connect/disconnect</title></rect>`;
  [[426,'A7 / B7 · A8 / B8'],[580,'A5 / B5 · A6 / B6'],[734,'A3 / B3 · A4 / B4'],[888,'A1 / B1 · A2 / B2']].forEach(([x,t])=>{ over+=qtp(x,86,null,'',`QTP OUTPUT ${t}`); });
  over+=iec(1359,33,1607,249);
  return panelSVG(PREFIX,'rear',{over,art:'rearqtp',cap:QTP_CAP},'POD8A rear panel, QTP version (real silkscreen)'); }
/* XLR rear (same sheet, REAR-XLR plate, 1236.24 × 115.63 pt = 17.17 × 1.606 in → 3434 × 321 px): INPUT A, B and only twelve
   outputs, B6…B1 and A6…A1, 175-px XLR holes; IEC 3079–3327 × 33–249. */
const XLRX={A:240.5,B:422.5}, XLRO=[['B6',604.5],['B5',786.5],['B4',967.5],['B3',1149.5],['B2',1331.5],['B1',1513.5],['A6',1920.5],['A5',2102.5],['A4',2284.5],['A3',2466.5],['A2',2647.5],['A1',2829.5]];
function xlrRearSVG(){ let over='';
  over+=xlr(XLRX.A,159.5,false,D.plug.A,'plA','INPUT A (XLR-F) — click')+xlr(XLRX.B,159.5,false,D.plug.B,'plB','INPUT B (XLR-F) — click');
  XLRO.forEach(([n,x])=>{ over+=xlr(x,159.5,true,false,'',`OUTPUT ${n} (XLR-M)`); });
  over+=iec(3079,33,3327,249);
  return `<svg viewBox="0 0 3434 321" role="img" aria-label="POD8A rear panel, XLR version (real silkscreen)" style="width:100%;border-radius:8px;display:block"><rect width="3434" height="321" rx="10" fill="var(--dev)"/>${over}<image href="${ASSET}${PREFIX}-rearxlr.svg" width="3434" height="321" preserveAspectRatio="none" style="pointer-events:none"/>${screw(50,160)}${screw(3384,160)}</svg>${QTP_CAP}`; }
function bindPanel(r){ const p=r.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); r.querySelectorAll('.md').forEach(g=>g.onclick=()=>A.mode());
  OUTS.forEach((n,i)=>bindTrim(r,'ot'+i,d=>A.trim(i,d))); bindTrim(r,'itA',d=>A.inTrimT('A',d)); bindTrim(r,'itB',d=>A.inTrimT('B',d));
  r.querySelectorAll('.plA').forEach(g=>g.onclick=()=>A.plug('A')); r.querySelectorAll('.plB').forEach(g=>g.onclick=()=>A.plug('B')); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px"><label>Source A <input id="ga" type="number" value="${D.gen.A}" style="width:52px"> dBu</label><label>Source B <input id="gb" type="number" value="${D.gen.B}" style="width:52px"> dBu</label>
  <label>B phase <select id="ph">${[0,90,180].map(p=>`<option ${p===D.gen.phaseB?'selected':''}>${p}</option>`).join('')}</select>°</label><label>Load <select id="ld">${[[1e6,'open'],[10000,'10 kΩ'],[600,'600 Ω']].map(([v,l])=>`<option value="${v}" ${v===D.load?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Rear <select id="rr">${['PHX','QTP','XLR'].map(v=>`<option ${v===D.rear?'selected':''}>${v}</option>`).join('')}</select></label></div><div class="small muted" style="margin-top:4px">Click trims (halves or wheel), the MODE switch and the rear inputs. Keys: M = mode, Q/W = selected output trim, [ / ] = previous / next output.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#ga')) return; g('#ga').onchange=e=>A.set('A',+e.target.value,'Source A → '+e.target.value+' dBu'); g('#gb').onchange=e=>A.set('B',+e.target.value,'Source B → '+e.target.value+' dBu');
  g('#ph').onchange=e=>A.set('phaseB',+e.target.value,'Source B phase → '+e.target.value+'°'); g('#ld').onchange=e=>A.set('load',+e.target.value,'Load → '+e.target.selectedOptions[0].text); g('#rr').onchange=e=>A.set('rear',e.target.value,'Rear → '+e.target.value); }
bindKeys('__pod8aActive',()=>({m:()=>A.mode(),q:()=>A.trim(D.sel,-1),w:()=>A.trim(D.sel,1),'[':()=>{D.sel=(D.sel+15)%16;SIM.refresh();},']':()=>{D.sel=(D.sel+1)%16;SIM.refresh();}}));
const dense=(s,pw)=>s*D.gen.f>pw/3;
const envOf=fn=>{ const e=t=>{ let m=0; const P=1/D.gen.f; for(let i=0;i<8;i++) m=Math.max(m,Math.abs(fn(t+P*i/8))); return m; }; e.dense=dense; return e; };
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), s=D.sel;
  return [ waveLane('± rails ('+inf.replace(/<[^>]+>/g,'')+')', t=>railAt(t), 17, null, wn, 22),
    {label:'MODE', h:20, draw(c,X,t0,t1,y){ c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(D.mode+' → A bank: '+busSrc('A')+', B bank: '+busSrc('B'), X(t0)+6, y+14); }},
    waveLane('INPUT A', t=>vin('A',t), -0.05, null, b, 30, envOf(t=>vin('A',t))), waveLane('INPUT B', t=>vin('B',t), -0.05, null, b, 30, envOf(t=>vin('B',t))),
    waveLane(`OUTPUT ${OUTS[s]} (selected)`, t=>outV(s,t), -0.05, swing(1), a, 40, envOf(t=>outV(s,t))),
    waveLane('OUTPUT A1', t=>outV(0,t), -0.05, swing(1), a, 30, envOf(t=>outV(0,t))), waveLane('OUTPUT B1', t=>outV(8,t), -0.05, swing(1), a, 30, envOf(t=>outV(8,t))) ]; }
function nowHTML(){ return `<table class="kv"><tr><th>Mode</th><td class="mono">${D.mode}</td></tr>${['A','B'].map(bk=>`<tr><th>${bk}1–${bk}8</th><td class="mono small">${OUTS.map((n,i)=>n[0]===bk?`${n} ${fdb(outLevel(i).l)}${outLevel(i).clip?'!':''}`:'').filter(Boolean).join(' · ')}</td></tr>`).join('')}<tr><th>Selected</th><td class="mono">${OUTS[D.sel]} ${fdb(outLevel(D.sel).l)} dBu (from ${outLevel(D.sel).src})</td></tr></table>`; }
function levelsHTML(){ const i=D.sel, o=outLevel(i), b=busLevel(o.src); const inp=s=>D.plug[s]&&D.power?D.gen[s]:-200;
  return `<h3>Path to ${OUTS[i]}</h3>${stageTable([{name:'INPUT A',lvl:inp('A'),gain:null,clip:null,note:'balanced'},{name:'INPUT B',lvl:inp('B'),gain:null,clip:null,note:'balanced'},{name:`Bus ${o.src} (input trims, mode ${D.mode})`,lvl:b.l,gain:null,clip:b.lim,note:'receiver + input trim '+inf},{name:`${OUTS[i]} driver + trim`,lvl:o.l,gain:dB(gOut(i)),clip:o.lim,note:`2 × 30R into ${D.load>=1e5?'open':D.load+' Ω'} ${inf}`}])}<p class="small muted">Stage values are ${inf}: no POD8A schematic is archived. Clip is set from the test report's +27.5 dBu maximum output.</p>`; }
const viewSim=simView({flag:'__pod8aActive',D,front:frontSVG,rear:rearSVG,bind:bindPanel,controls:controlsHTML,bindControls,now:nowHTML,levels:levelsHTML,lanes,labelW:200,hint:'Turn a trim, step the MODE switch or connect an input.'});
const LESSONS=[
  {title:'Meet the POD8A', body:'<p>POD8A is an <b>analog audio DA</b>: two balanced inputs (A, B), sixteen balanced outputs (A1–A8, B1–B8), a front trim for every output and input, and a <b>MONO / SUM / STEREO</b> switch. It came with three rear panels: Phoenix (PHX), QTP and XLR.</p><p class="muted">No manual or schematic is archived; this follows the silk and the 3 Jul 2015|48 test report.</p>', check:()=>true, auto:true},
  {title:'1 · Stereo distribution', body:'<p>Power on and set MODE to <b>STEREO</b>. A feeds A1–A8, B feeds B1–B8.</p>', check:()=>D.power&&D.mode==='STEREO', hint:'Rocker; click the MODE switch.'},
  {title:'2 · Match an output', body:'<p>A recorder on A3 wants +8 dBu. Select A3 and trim it to +8 dBu (±0.5).</p>', check:()=>Math.abs(outLevel(2).l-8)<=0.5, hint:'Click the A3 trim halves.'},
  {title:'3 · Mono feed everywhere', body:'<p>Set MODE to <b>MONO</b>: input A (“A MONO”) feeds all sixteen outputs.</p>', check:()=>D.mode==='MONO', hint:'M key.'},
  {title:'4 · Sum, and phase', body:'<p>Set MODE to <b>SUM</b> and set source B phase to 180°. With equal A and B the sum cancels — a quick polarity check.</p>', check:()=>D.mode==='SUM'&&D.gen.phaseB===180, hint:'M, then B phase 180.'},
  {title:'5 · Headroom', body:'<p>Back to STEREO; raise source A to +27 dBu (the test report\'s max input). Outputs with trims above unity clip near +27.5 dBu.</p>', check:()=>D.gen.A>=27&&outLevel(0).l>20, hint:'Type 27 in Source A.'},
  {title:'Done', body:'<p>Findings covers the supply and the three rear options.</p>', check:()=>true, auto:true}];
let lessonIdx=0;
function viewTutorial(m){ window.__pod8aActive=true; tutorialView(m,{title:'Tutorial — distributing with a POD8A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${nowHTML()}</div>`,bind:r=>{bindPanel(r);bindControls(r);}}); }
const viewSecond=secondView({flag:'__pod8aActive',front:frontSVG,bind:bindPanel,freq:()=>D.gen.f,ladderLabel:'selected output',ladderFn:t=>outV(D.sel,t),
  ladder:()=>[['1 second',1],['100 ms',0.1],['10 ms',0.01],['1 tone cycle',1/D.gen.f],['50 µs',5e-5]],
  outs:()=>[0,3,7,8,11,15].map(i=>[OUTS[i],t=>outV(i,t)]),
  rows:()=>[['Tone cycles',D.gen.f.toLocaleString(),SIM.fmtDur(1/D.gen.f),'continuous analog fan-out: every output sees the same cycle at the same instant'],['Supply start-up','—','≈ 30 ms '+inf,'IRM-15-15 module'],['Mode switching','—','instant','mechanical toggle: a click may reach the outputs ('+inf+')']],
  dev:t=>`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>Buses</th><td class="mono">A ${bus('A',t).toFixed(3)} · B ${bus('B',t).toFixed(3)} · SUM ${bus('SUM',t).toFixed(3)} V</td></tr><tr><th>${OUTS[D.sel]}</th><td class="mono">${outV(D.sel,t).toFixed(3)} V</td></tr></table>`});
const BLOCKS={ inA:{x:20,y:40,w:150,h:70,t:'INPUT A (MONO)',s:['balanced receiver','front trim'],d:'Rear PHX/QTP/XLR. Receiver circuit '+'inferred.'}, inB:{x:20,y:170,w:150,h:70,t:'INPUT B',s:['balanced receiver','front trim'],d:'As A.'},
  mode:{x:220,y:100,w:160,h:80,t:'MODE switch',s:['MONO: A → all','SUM: A+B → all','STEREO: A→A, B→B'],d:'Front three-position toggle (silk). Bus logic inferred from the labels.'},
  ba:{x:430,y:40,w:170,h:80,t:'A1–A8 drivers',s:['8 × balanced driver','front trim each'],d:'Sixteen outputs, each with its own trim (silk).'}, bb:{x:430,y:170,w:170,h:80,t:'B1–B8 drivers',s:['8 × balanced driver','front trim each'],d:'As A.'},
  ps:{x:220,y:240,w:160,h:60,t:'IRM-15-15',s:['15 V module (quote)'],d:'Quote SQ20148 lists IRM-15-15 with 12 weeks lead time.'} };
const WIRES=[['inA','mode','A'],['inB','mode','B'],['mode','ba','A bus'],['mode','bb','B bus'],['ps','mode','']];
function viewBlock(m){ window.__pod8aActive=false; blockView(m,BLOCKS,WIRES,'mode',[620,320],card('In one sentence',`<p>Two balanced inputs feed two buses; a three-position switch picks STEREO (A and B separate), MONO (A everywhere) or SUM; each bus fans out to eight trimmed balanced drivers.</p>`)); }
const SHEETS=[{name:'1 · Inferred block level', note:'No POD8A schematic is archived. Board names from the test report: POD 8-1 (main) ISS 4, POD 8-4 (rear) ISS 4. Everything on this sheet is inferred from the silk.', svg:()=>
  chip(80,80,140,'INPUT A rx',[['+','A +'],['−','A −']],[['out','A bus']],'inferred')+chip(80,250,140,'INPUT B rx',[['+','B +'],['−','B −']],[['out','B bus']],'inferred')
  +chip(380,150,140,'MODE',[['A','A bus'],['B','B bus']],[['bank A','A / A / (A+B)/2'],['bank B','B / A / (A+B)/2']],'STEREO / MONO / SUM')
  +txt(620,120,'→ A1 … A8: driver + trim + 2 × 30R',11)+txt(620,280,'→ B1 … B8: driver + trim + 2 × 30R',11)+txt(60,430,'Measured (Pod8A-03JUL15.pdf): max output +27.5 dBu unloaded, max input +27 dBu, CMRR better than −80 dBu re +4 dBu.',11)}];
function viewSchem(m){ window.__pod8aActive=false; schemView(m,SHEETS,'POD8A','There is no schematic for POD8A in the archive; this sheet is a labelled inference, not a redraw.'); }
const viewSoft=softView({flag:'__pod8aActive',D,intro:'POD8A has no processor. Click a stage for its maths (all stage gains inferred).',
  flows:[{title:'Path to the selected output',stages:()=>{ const o=outLevel(D.sel); return [{t:'INPUT A / B',s:[fdb(D.gen.A)+' / '+fdb(D.gen.B)]},{t:'Input trims',s:[fdb(dB(gIn('A')))+' / '+fdb(dB(gIn('B')))+' dB']},{t:'MODE '+D.mode,s:['bus '+o.src]},{t:OUTS[D.sel]+' driver',s:[fdb(dB(gOut(D.sel)))+' dB',fdb(o.l)+' dBu'],bad:o.clip}]; },
    det:[()=>'<b>Inputs.</b> Balanced, max +27 dBu (test).',()=>`<b>Input trims.</b> ±${V.inRange} dB ${inf}.`,()=>`<b>Mode.</b> SUM = (A+B)/2 ${inf}.`,()=>`<b>Driver.</b> ±${V.outRange} dB trim ${inf}; clip +27.5 dBu (test).`]}],
  chartTitle:'Output trim → output gain', chart:cv=>curveChart(cv,[{fn:f=>(f*2-1)*V.outRange,col:SIM.css('--accent'),label:OUTS[D.sel],cur:D.outTrim[D.sel]}],-8,8,' dB'),
  buttons:[['MODE switch','three-position toggle','STEREO / MONO / SUM'],['Output trim (16)','per-output driver','±6 dB '+inf],['Input trim A/B','receiver gain','±10 dB '+inf]],
  pins:[['PHX rear','18 × 3-pin (+ − G)','top row: A (MONO), A8 … A1; bottom: B, B8 … B1'],['QTP rear','multi-pin','A(MONO) 2,1 · B 4,5 · A7/B7/A8/B8 6,3 / 8,7 … (silk table)'],['XLR rear','full-rack-width','INPUT A, B; OUTPUT B8 … A1 (black-rack version)']]});
const viewNotes=notesView('__pod8aActive','What the POD8A archive shows — findings',[
  ()=>`<b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src(ART_SRC,'POD8A-FRONT & REAR-PHX-SILK (CURVE).cdr')} (Jul.23/15) and ${SIM.src(QTP_SRC,'POD8A-REAR-QTP & XLR-SILK (CURVE).cdr')} (Jul.06/15).</b> Choose the rear with <i>Rear</i>: PHX, QTP or the new XLR view. What the art shows: <b>the XLR rear has only twelve outputs</b> (B6…B1, A6…A1 plus INPUT A and B: fourteen 175-px holes on a 17.17-in plate), so A7, A8, B7 and B8 have no connector on that version. The QTP rear has one INPUT and four OUTPUT cut-outs; its pin table puts two A and two B outputs on each output connector. On the PHX sheet a loose “+ - G” sits between the INPUT B legend and the OUTPUT bar, a stray copy of the terminal legend. In the curve version the green top bar stops short of the INPUT section. ${SIM.src('#POD #SERIES/POD8A - #Master/POD8A - #ARTWORK #DA #2016/POD8A-FRONT&REAR-XLR-SILK.cdr','POD8A-FRONT&REAR-XLR-SILK.cdr')} (JAN.14/16), filed byte-identical in “BLACK RACK - #Mechanical”, is a later 19-inch rack set (front with the 16 trims and a rear with the same 14 XLRs) in live text; its CAUTION line runs off the panel when converted, so the Jul 2015 curve sheet is used for the XLR rear.`,
  `<b>The supply in the quote cannot make +27.5 dBu by itself.</b> Quote SQ20148 lists an IRM-15-15 (a single 15 V, 15 W module) for SA-POD8A-MAIN. The test report measured +27.5 dBu out unloaded, which needs about ±14 V swing on each leg. Either the board has a DC-DC converter for a negative rail, or the op-amps run on a split 15 V with a rail-to-rail bridge (${inf}).`,
  `<b>The test outline is a generic form.</b> Pod8A-03JUL15.pdf ticks only the analog sections; the AES, video and “push-buttons” items are blank or N/A. It records “Firmware: NA” and boards “POD 8-1 Issue 4” and “POD 8-4 Rear PCB Issue 4”.`,
  `<b>The A input is labelled “A MONO”.</b> On front and rear silks input A doubles as the mono source, matching the MONO switch position.`,
  `<b>Three rear panels, one front.</b> PHX (ISS 4), QTP (ISS 1) and XLR (ISS 1). The XLR rear is wider than a POD face (its silk is 17.17 in wide, rack width between the ears), and a “BLACK RACK” folder holds its rack-mount version; SA-POD8A-XLR is a separate board (quote SQ20152, 150 pcs).`,
  `<b>The QTP pin table pairs outputs oddly.</b> The silk lists A(MONO) on pins 2,1 and B on 4,5, then 6,3 and 8,7 for the second rows (A8/A6/A4/A2 and B8/B6/B4/B2); the + and − pins swap order from pair to pair, so a QTP harness must follow the table, not the pin numbers.`,
  `<b>No electronics files.</b> There is no schematic, BOM or netlist in this folder; the older POD8 panels are in ../POD PANELS/POD - OBSOLETE.`],
 [`All stage gains, trim ranges and the SUM gain are ${inf}.`,`Rails ±15 V with 1.7 V swing loss (${inf}) reproduce the measured +27.5 dBu.`,`Output drivers balanced with 2 × 30R (${inf}, as in the other analog PODs).`],
 [SIM.src(ART_SRC,'POD8A-FRONT & REAR-PHX-SILK (CURVE).cdr')+' · '+SIM.src(QTP_SRC,'POD8A-REAR-QTP & XLR-SILK (CURVE).cdr')+' (panel artwork) · POD8A-FRONT &amp; REAR-PHX.pdf · PICS/','POD8A - #TESTREPORT/Pod8A-03JUL15.pdf','POD8A - #QUOTES/POD8A - QUOTE/POD8A - QUOTE - SQ20148.pdf · SQ20152.pdf','POD8A - #Mechanical #DA #2016/ (front ISS 4, rear PHX ISS 4, QTP ISS 1, XLR ISS 1)']);
SIM.register({ id:'pod8a', name:'POD8A · analog audio DA, 2 in / 16 out (2015|48)', duration:1, product:'POD8A', year:2015, family:'POD series', folder:'#POD #SERIES/POD8A - #Master',
  summary:'Half-rack analog audio distribution amplifier: inputs A and B, outputs A1–A8 and B1–B8, a trim per output and per input, and a MONO / SUM / STEREO switch. Only panels, a test report and quotes survive, so the circuit inside is inferred.',
  highlights:['Real silkscreen front with 18 working trims and the mode switch','PHX and QTP rear silks','Fan-out levels with the measured +27.5 dBu ceiling','Supply quoted (IRM-15-15) vs the measured headroom'],
  depth:'Hardware model', stepUnits:[{label:'1 tone cycle',period:()=>1/D.gen.f},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:3, init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: distributing with a POD8A',render:viewTutorial},{id:'second',label:'One second, cycle by cycle',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (inferred)',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}] });

})();
