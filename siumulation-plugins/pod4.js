/* =====================================================================
   POD4 — Dual microphone preamplifier (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.

   Sources used (all in this archive, folder #POD #SERIES/POD4 - #Master):
   - POD4 - #Engineering/POD4 - #ISS4 #PCB/POD4iss4.net         (P-CAD ISS4 netlist, Apr 2006: every pin and net below)
   - POD4 - #Master/POD4 iss4 PCAD.bom                          (values as drawn in P-CAD)
   - POD4 - #Master/POD 4 FINAL BOM.xlsx                        (production values: 2K43, 240R/9K09, 500R trims, 5K1, DNI list)
   - POD4 - #Engineering/POD4MANU.pdf                           (manual, Jul 2002: specs, peak LEDs at ≈ +19 dBu, mute by closure)
   - POD4 - #ARTWORK #DA #2016/POD4-FRONT&REAR-SILK (CURVE).pdf (panel silkscreen, Jun 19 2014)
   - POD4 - #Mechanical #DA #2016/POD4-FRONT ISS 1, POD4-REAR ISS 3 (PANEL).pdf
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
/* Artwork 2026|59: both panels come straight from the CorelDRAW sheet POD4-FRONT&REAR-SILK (CURVE).cdr (Jun.19/14, text as curves). Inkscape → plain SVG;
   the FRONT GREEN, FRONT WHITE and REAR WHITE plates were cut at their outline (x 116.75 pt; y 75.00 / 250.87 / 425.38 pt; 617.04 × 115.63 pt = 8.570 × 1.606 in),
   the two front plates registered on one face and inked POD green rgb(52,168,83) / white rgb(240,240,236). Cut-outs, screw holes
   and drill centre marks are kept as faint geometry, not ink (the photos show no printed crosshairs). 1 pt = 200/72 px, so the
   art lands on the same 1714 × 321 grid as the controls. */
const ART_SRC = '#POD #SERIES/POD4 - #Master/POD4 - #ARTWORK #DA #2016/POD4-FRONT&REAR-SILK (CURVE).cdr';
const ART_CAP = `<div class="small muted" style="margin-top:4px">Front and rear artwork: ${SIM.src(ART_SRC, 'POD4-FRONT&REAR-SILK (CURVE).cdr')} (CorelDRAW, Jun.19/14 · ${SIM.year(2014)}), green and white plates registered on one panel.</div>`;
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

const PREFIX='pod4';
/* ---------------- component values: two builds (FINAL BOM = production, PCAD = the ISS4 .bom) ---------------- */
const BUILDS = {
  final:{ name:'FINAL BOM (production)', R1:2430, R2:221, R6:240, R7:9090, LVL:500, R14:5100, R57:15000, R58:5100 },
  pcad: { name:'P-CAD ISS4 .bom (as drawn)', R1:2870, R2:221, R6:221, R7:221, LVL:2000, R14:15000, R57:15000, R58:5100 },
};
const V = { R30:10, Rg0:10000, R16:6810, R18:6810, R19:47, C11:3.9e-9, R39:10000, R38:20000, R33:10000, R52:20000, R9:20000, R11:20000, R73:20000, R46:20000, MIX:10000, Rout:30, R12:1000, C10:1e-7, R74:100000, swingLoss:1.5 };
const D = {
  power:true, powerAt:-1, build:'final',
  mic:{ A:{plug:true, type:'dyn', lvl:-50}, B:{plug:true, type:'cond', lvl:-44} }, f:1000,
  ph:{ A:false, B:true }, trim:{ A:0.55, B:0.55 }, mix:0.7, mute:{ A:false, B:false },  // mute = closure to ground on the CTL terminals
  log:[],
};
const FACT = JSON.parse(JSON.stringify(D));
const B = ()=>BUILDS[D.build];
const dB = g => 20*Math.log10(g);
/* rails: LM317/LM337 with 221R (out–adj) and R1/R4 (adj–gnd); +48 V from LM317LZ REG3 (R6 out–adj, R7 adj–gnd) */
const railV = ()=>1.25*(1+B().R1/B().R2);
const phV = ()=>1.25*(1+B().R7/B().R6);
function railAt(t){ return ramp(D.power, D.powerAt, t, railV(), 0.004, 0.012); }
function phAt(t, ch){ return D.ph[ch] ? ramp(D.power, D.powerAt, t, phV(), 0.01, 0.05) : 0; }
const swing = t => Math.max(0, railAt(t)-V.swingLoss);
/* SSM2017: G = 1 + 10k/RG; RG = R30 10R + the LVL trim used as a rheostat (fully CW = 0 Ω, inferred) */
const ssmG = f => 1 + V.Rg0/(V.R30 + (1-f)*B().LVL);
/* condenser mic: needs phantom; dynamic works either way. Mic output level is the generator's level (dBu). */
function micV(ch, t){ const m=D.mic[ch]; if (!m.plug) return 0; if (m.type==='cond' && phAt(t,ch)<30) return 0;
  return dbu2v(m.lvl)*Math.SQRT2*Math.sin(2*Math.PI*D.f*t + (ch==='B'?0.4:0)); }
const hc=(v,l)=>clamp(v,-l,l);
const mixA = ()=>taper.log(D.mix);
const mixGain = ()=>{ const a=mixA(); return a*V.R46/(V.R73 + a*(1-a)*V.MIX); };   // loaded wiper into U7A's 20K virtual earth
function chain(ch, t){
  const lim=swing(t), vin=micV(ch,t);
  const s = hc(ssmG(D.trim[ch])*vin, lim);                    // U2/U3 SSM2017 out (pin 6)
  const d1 = hc(-2*s, lim), d2 = -d1;                          // U5/U6 A: −R38/R39 = −2; B: unity inverter → DIRECT legs
  const sw = D.mute[ch] ? 0 : hc(-2*s, lim);                   // 74HC4053 at U9A/U8A virtual earth: muted → input resistor grounded
  return { vin, s, d1, d2, direct:d1-d2, sw, swd:2*sw };
}
function mixAt(t){ const lim=swing(t), a=chain('A',t), b=chain('B',t);
  const bus = hc(-(a.sw + b.sw), lim);                          // U1A LF353 summer, 20K/20K/20K
  const o = hc(-mixGain()*bus, lim);                            // MIX LVL wiper → R73 → U7A
  return { bus, o, diff:2*o }; }
/* steady-state levels for the tables */
function levels(ch){
  const m=D.mic[ch], on = m.plug && D.power && !(m.type==='cond' && !D.ph[ch]), inL = on? m.lvl : -200;
  const lim = v2dbu((railV()-V.swingLoss)/Math.SQRT2), g=dB(ssmG(D.trim[ch]));
  const s = inL+g, leg = s+6.02, dir = leg+6.02, swd = D.mute[ch]? -200 : dir;
  return { stages:[
    {name:`MIC ${ch} XLR (female)`, lvl:inL, gain:null, clip:null, note: m.type==='cond'? (D.ph[ch]?'condenser, phantom ON':'condenser — no phantom, no output') : 'dynamic'},
    {name:`U${ch==='A'?2:3} SSM2017, RG = 10R + ${Math.round((1-D.trim[ch])*B().LVL)} Ω`, lvl:s, gain:g, clip:lim, note:`G = 1 + 10k/RG → ${fdb(dB(ssmG(0)))} … ${fdb(dB(ssmG(1)))} dB`},
    {name:`U${ch==='A'?5:6}A −R38/R39 (−2) → DIRECT leg`, lvl:leg, gain:6.02, clip:lim, note:'the other leg is a unity inverter'},
    {name:`DIRECT ${ch} OUT (balanced, 2 × 30R)`, lvl:dir, gain:6.02, clip:lim+6.02, note:'two legs in anti-phase'},
    {name:`SWITCHED ${ch} OUT (U${ch==='A'?9:8}, 74HC4053)`, lvl:swd, gain:D.mute[ch]?null:0, clip:lim+6.02, note:D.mute[ch]?'MUTED: control terminal closed to G':'unmuted'},
  ], dir, sw:swd, clip: s>lim+0.01 || leg>lim+0.01, total: dir-inL };
}
function levelsMix(){ const a=levels('A'), b=levels('B'); const p=x=>x<-150?0:Math.pow(10,x/20);
  const legA=a.sw<-150?0:p(a.sw-6.02), legB=b.sw<-150?0:p(b.sw-6.02);
  const bus = (legA||legB)? 20*Math.log10(Math.sqrt(legA*legA+legB*legB)) : -200;   // incoherent sum (different sources)
  const lim=v2dbu((railV()-V.swingLoss)/Math.SQRT2), o = bus<-150?-200: bus+dB(Math.max(mixGain(),1e-9)), diff = o<-150?-200:o+6.02;
  return { bus, o, diff, stages:[
    {name:'U1A LF353 mix bus (−(A+B), 20K/20K)', lvl:bus, gain:0, clip:lim, note:'fed from the SWITCHED legs, so a muted mic leaves the mix'},
    {name:`MIX LVL (10K log, ${Math.round(D.mix*100)} %) → U7A`, lvl:o, gain:mixGain()>0?dB(mixGain()):null, clip:lim, note:'wiper loads into R73 20K'},
    {name:'MIX OUT (balanced, U7A/U7B)', lvl:diff, gain:6.02, clip:lim+6.02, note:''}], clip: bus>lim+0.01 }; }
/* peak indicators: comparators against divider references (netlist) */
const pkRefCh = ()=> railV()*B().R58/(B().R57+B().R58);       // U10: V− · 5K1/(15K+5K1), compared with U5A output via R56 1K
const pkRefMix = ()=> railV()*B().R14/(15000+B().R14);         // U1B: V+ · R14/(R13 15K + R14), compared with the D18-rectified bus
const pkCh = (ch,t)=> chain(ch,t).d1 < -pkRefCh();
function mixPkAt(t){ // D18 + R12 1K charge C10 100n, R74 100K bleeds it: peak detector, then comparator
  let v=0; const dt=1/(D.f*24), n=Math.ceil(0.03/dt); for (let k=n;k>=0;k--){ const tt=t-k*dt; const x=mixAt(tt).bus-0.6; if (x>v) v=v+(x-v)*(1-Math.exp(-dt/(V.R12*V.C10))); else v=v*Math.exp(-dt/(V.R74*V.C10)); }
  return v > pkRefMix(); }
const pkLevelCh = ()=> v2dbu(pkRefCh()/Math.SQRT2)+6.02;
const pkLevelMix = ()=> v2dbu((pkRefMix()+0.6)/Math.SQRT2)+6.02;
/* ---------------- actions ---------------- */
const act = makeActor(D, ()=>`DIRECT A ${fdb(levels('A').dir)} · DIRECT B ${fdb(levels('B').dir)} · MIX ${fdb(levelsMix().diff)} dBu`);
const A = {
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{ D.power=!D.power;
    if (D.power){ D.powerAt=SIM.t; tr('PWRSW → T1 toroid (TE70043, 15 V 0.666 A) → D1–D4 bridge → C1/C2 470 µF');
      tr(`REG2 LM317T (221R / ${B().R1===2430?'2K43':'2K87'}) → V+ ${railV().toFixed(1)} V; REG1 LM337T → V− −${railV().toFixed(1)} V; D8 1N749A zener + R36 1K5 → +5 V for the 74HC4053 and LEDs`);
      tr(`D5–D7 + C7/C8/C39 330 µF multiplier → REG3 LM317LZ (R6 ${B().R6}R / R7 ${B().R7===9090?'9K09':'221R'}) → +48V rail ${phV().toFixed(1)} V`);
    } else tr('Rails collapse; the SSM2017s and NE5532s go silent'); }); },
  phantom(ch){ act(`48V ${ch} → ${D.ph[ch]?'OFF':'ON'}`, tr=>{ D.ph[ch]=!D.ph[ch];
    tr(`PH_${ch}_SW (C62206L slide): ${D.ph[ch]?'+48V → R'+(ch==='A'?15:22)+' 100R → C'+(ch==='A'?37:38)+' 22 µF → R'+(ch==='A'?'16/R17':'23/R24')+' 6K81 to XLR pins 2 and 3':'phantom feed opened'}`);
    tr(`Second pole: V+ → R${ch==='A'?29:31} 1K5 → PH${ch} red LED ${D.ph[ch]?'lights':'off'} (pole mapping ${inf})`);
    tr(`C${ch==='A'?'13/C14':'15/C16'} 47 µF/63 V block the ${phV().toFixed(0)} V from the SSM2017 inputs; D10–D17 1N749A zeners clamp the plug-in surge`);
    if (D.mic[ch].type==='cond') tr(D.ph[ch]?'The condenser mic powers up (≈ 50 ms here) and its signal appears':'The condenser mic loses power: no signal'); }); },
  trim(ch,dir){ act(`Turn LVL ${ch} ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{ const o=D.trim[ch]; D.trim[ch]=clamp(+(o+dir*0.04).toFixed(3),0,1);
    tr(`LVL_${ch} (${B().LVL} Ω trim, wiper tied to one end) between U${ch==='A'?2:3} pins 1 and 8 with R${ch==='A'?30:32} 10R: RG ${Math.round(V.R30+(1-o)*B().LVL)} → ${Math.round(V.R30+(1-D.trim[ch])*B().LVL)} Ω`);
    tr(`SSM2017 gain 1 + 10k/RG: ${fdb(dB(ssmG(o)))} → ${fdb(dB(ssmG(D.trim[ch])))} dB; total mic → balanced out ${fdb(dB(ssmG(D.trim[ch]))+12.04)} dB`); }); },
  mixKnob(dir){ act(`Turn MIC MIX LVL ${dir>0?'up':'down'}`, tr=>{ const o=D.mix; D.mix=clamp(+(o+dir*0.05).toFixed(3),0,1);
    tr(`MIX_LVL (TOCOS dual 10K log, one section used): wiper ${Math.round(o*100)} → ${Math.round(D.mix*100)} % of rotation = ${(mixA()*100).toFixed(1)} % of the bus voltage`);
    tr(`Wiper → R73 20K → U7A (R46 20K): ${fdb(dB(Math.max(mixGain(),1e-6)))} dB; U7B inverts for the − leg`); }); },
  mute(ch){ act(`${D.mute[ch]?'Open':'Close'} ${ch} MUTE to G (rear CTL terminal)`, tr=>{ D.mute[ch]=!D.mute[ch];
    tr(`${ch} MUTE terminal → R${ch==='A'?75:76} 100R → 74HC4053 select ${ch==='A'?'A (pin 11)':'C (pin 9)'}; R${ch==='A'?35:37} 100K pulls it to +5 V when open`);
    tr(D.mute[ch]? `Select low: switch ${ch==='A'?'X (pins 14→12)':'Z (pins 4→5)'} connects C${ch==='A'?18:17} to GNDA, so U${ch==='A'?9:8}A's input resistor R${ch==='A'?33:34} 10K goes to ground and its output falls to 0 V. MUTE_${ch} green LED lights (+5 → LED → R${ch==='A'?62:61} 1K → the low select node)` : `Select high: ${ch==='A'?'X1 (pin 13)':'Z1 (pin 3)'} → U${ch==='A'?9:8}A summing node; the SWITCHED output and the mix get the mic again`);
    tr('The switch sits at a virtual earth, so it never sees the audio voltage swing: a 5 V CMOS part can mute a +28 dBu path'); }); },
  plug(ch){ act(`${D.mic[ch].plug?'Unplug':'Plug in'} MIC ${ch}`, tr=>{ D.mic[ch].plug=!D.mic[ch].plug; tr(D.mic[ch].plug?'XLR_'+ch+' pins 2/3 → C14/C13 → R20/R19 47R → SSM2017 +IN/−IN':'Input open: R18/R21 6K81 hold the SSM2017 inputs at ground'); }); },
  set(k,v,label){ act(label, tr=>{ if (k==='f') D.f=v; else if (k==='build') D.build=v; else { const [ch,kk]=k.split('.'); D.mic[ch][kk]=v; }
    tr(k==='build'? (v==='final'?'FINAL BOM: ±15.0 V rails, 48.6 V phantom, 500R gain trims, 5K1 peak references':'P-CAD ISS4 .bom: ±17.5 V rails, 2K trims, R13/R14 15K/15K — and REG3 with 221R/221R gives only 2.5 V phantom (see Findings)') : 'The test source changed; every stage follows'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
/* ---------------- panels (POD4-FRONT&REAR-SILK (CURVE).pdf, 200 dpi) ---------------- */
function knob(x,y,frac,cls,title){ const a=(-135+270*frac)*Math.PI/180;
  return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="44" fill="transparent"/><circle cx="${x}" cy="${y}" r="36" fill="#1b1c1e" stroke="#3a3d40" stroke-width="3"/><circle cx="${x}" cy="${y}" r="27" fill="#2a8a48"/>
    <line x1="${x}" y1="${y}" x2="${x+Math.sin(a)*27}" y2="${y-Math.cos(a)*27}" stroke="#f0f0ec" stroke-width="5" stroke-linecap="round"/></g>`; }
function slide(x,y,on,cls,title){ return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><rect x="${x-16}" y="${y-30}" width="32" height="60" rx="4" fill="#0b0c0d" stroke="#44484d" stroke-width="2"/><rect x="${x-11}" y="${on?y-25:y+1}" width="22" height="24" rx="3" fill="#bfc3c6"/></g>`; }
function frontSVG(t){
  const on=D.power&&railAt(t)>5;
  let over = rocker(D.power) + pled(on)
    + knob(611,209,D.mix,'mixk','MIC MIX LVL — click right half to turn up, left half down (or wheel)') + led(700,217,on&&mixPkAt(t),'#ff4a3a',10);
  [['A',850,950,1020,1090,1150],['B',1290,1390,1460,1530,1590]].forEach(([ch,sw,ph,mu,lv,pk])=>{
    over += slide(sw,212,D.ph[ch],'ph-'+ch,`48V ${ch} slide switch — click`) + led(ph,217,on&&D.ph[ch],'#ff4a3a',10) + led(mu,217,on&&D.mute[ch],'var(--led-g)',10)
      + trim(lv,220,D.trim[ch],'tr-'+ch,`MIC ${ch} LVL (gain trim)`) + led(pk,217,on&&pkCh(ch,t),'#ff4a3a',10); });
  return panelSVG(PREFIX,'front',{over},'POD4 front panel (real silkscreen)'); }
const PX = i => 750 + i*27.56;
function rearSVG(){
  let over = xlr(271,157,false,D.mic.B.plug,'pl-B','MIC B (XLR-F) — click to plug/unplug') + xlr(531,157,false,D.mic.A.plug,'pl-A','MIC A (XLR-F) — click to plug/unplug');
  over += `<rect x="${PX(0)-16}" y="140" width="${PX(17)-PX(0)+32}" height="62" rx="4" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>`;
  for (let i=0;i<18;i++){ const ctl = i===15?'B':i===16?'A':null, closed = ctl && D.mute[ctl];
    over += `<g class="${ctl?'mu-'+ctl:''}" style="${ctl?'cursor:pointer':''}">${ctl?`<title>${ctl} MUTE control — click to close/open to G</title>`:''}<rect x="${PX(i)-10}" y="152" width="20" height="36" fill="${closed?'#2b5f9e':'#0e4d25'}"/><circle cx="${PX(i)}" cy="166" r="6" fill="#9aa"/></g>`; }
  if (D.mute.A||D.mute.B) over += `<path d="M${PX(17)} 194 v10 H${PX(D.mute.B?15:16)} v-10" stroke="#2b5f9e" stroke-width="5" fill="none"/>`;
  over += iec(1385,28,1611,252);
  return panelSVG(PREFIX,'rear',{over},'POD4 rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if (p) p.onclick=()=>A.power();
  ['A','B'].forEach(ch=>{ bindTrim(root,'tr-'+ch,d=>A.trim(ch,d)); root.querySelectorAll('.ph-'+ch).forEach(g=>g.onclick=()=>A.phantom(ch)); root.querySelectorAll('.pl-'+ch).forEach(g=>g.onclick=()=>A.plug(ch)); root.querySelectorAll('.mu-'+ch).forEach(g=>g.onclick=()=>A.mute(ch)); });
  bindTrim(root,'mixk',d=>A.mixKnob(d)); }
function controlsHTML(){ const mo=ch=>`<label>Mic ${ch} <select id="mt${ch}"><option value="dyn" ${D.mic[ch].type==='dyn'?'selected':''}>dynamic</option><option value="cond" ${D.mic[ch].type==='cond'?'selected':''}>condenser</option></select> <input id="ml${ch}" type="number" step="1" value="${D.mic[ch].lvl}" style="width:56px"> dBu</label>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px" class="small">${mo('A')}${mo('B')}
    <label>Tone <select id="gF">${[100,1000,10000].map(f=>`<option ${f===D.f?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
    <label>Values <select id="bd">${Object.keys(BUILDS).map(k=>`<option value="${k}" ${k===D.build?'selected':''}>${BUILDS[k].name}</option>`).join('')}</select></label></div>
    <div class="small muted" style="margin-top:4px">Click a trim's or the MIX knob's right half to turn it up, left half down (or use the wheel). Click the 48V slides, the rear XLRs and the A/B MUTE terminals. Keys: Q/W LVL A, E/R LVL B, A/S MIX, 4 = 48V A, 5 = 48V B, M = mute A.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if (!g('#gF')) return;
  ['A','B'].forEach(ch=>{ g('#mt'+ch).onchange=e=>A.set(ch+'.type',e.target.value,`Mic ${ch} → ${e.target.value==='dyn'?'dynamic':'condenser'}`); g('#ml'+ch).onchange=e=>A.set(ch+'.lvl',+e.target.value,`Mic ${ch} level → ${e.target.value} dBu`); });
  g('#gF').onchange=e=>A.set('f',+e.target.value,'Tone → '+e.target.value+' Hz'); g('#bd').onchange=e=>A.set('build',e.target.value,'Component values → '+BUILDS[e.target.value].name); }
bindKeys('__pod4Active', ()=>({q:()=>A.trim('A',-1),w:()=>A.trim('A',1),e:()=>A.trim('B',-1),r:()=>A.trim('B',1),a:()=>A.mixKnob(-1),s:()=>A.mixKnob(1),'4':()=>A.phantom('A'),'5':()=>A.phantom('B'),m:()=>A.mute('A')}));
/* ---------------- timeline ---------------- */
const dense=(span,pw)=>span*D.f>pw/3;
const envOf = fn => { const e = t => { let m=0; const P=1/D.f; for (let i=0;i<8;i++) m=Math.max(m, Math.abs(fn(t+P*i/8))); return m; }; e.dense=dense; return e; };
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), r=SIM.css('--bad'), wn=SIM.css('--warn');
  return [
    { label:'Mains / bridge', h:22, draw(c,X,t0,t1,y,h){ if(!D.power){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('rocker off', X(t0)+6, y+15); return; } SIM.pulses(c,X,t0,t1,y,h,1/120,0,1/600,SIM.css('--ink2'),'120 Hz charging pulses into C1/C2'); } },
    waveLane('V+ (LM317T)', t=>railAt(t), 20, null, wn, 24),
    waveLane('+48V (LM317LZ) → MIC A', t=>phAt(t,'A'), 55, null, wn, 24),
    waveLane('MIC A (XLR pins 2−3)', t=>chain('A',t).vin, -0.005, null, b, 34, envOf(t=>chain('A',t).vin)),
    waveLane('U2 SSM2017 out', t=>chain('A',t).s, -0.05, null, a, 34, envOf(t=>chain('A',t).s)),
    waveLane('DIRECT A OUT (diff.)', t=>chain('A',t).direct, -0.05, 2*swing(1), a, 40, envOf(t=>chain('A',t).direct)),
    waveLane('SWITCHED A OUT (diff.)', t=>chain('A',t).swd, -0.05, 2*swing(1), a, 34, envOf(t=>chain('A',t).swd)),
    waveLane('MIC B (XLR)', t=>chain('B',t).vin, -0.005, null, b, 30, envOf(t=>chain('B',t).vin)),
    waveLane('MIX OUT (diff.)', t=>mixAt(t).diff, -0.05, 2*swing(1), r, 40, envOf(t=>mixAt(t).diff)),
    boolLane(`PK A comparator (U10A, U5A < −${pkRefCh().toFixed(2)} V)`, t=>D.power&&pkCh('A',t), '#e3453a'),
    boolLane('MUTE A LED', t=>D.power&&D.mute.A, '#3fbf5f'),
  ]; }
/* ---------------- views ---------------- */
function nowHTML(t){ const row=(n,v,c)=>`<tr><th>${n}</th><td class="mono">${v<-150?'— (no signal)':fdb(v)+' dBu'} ${c?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>`;
  const a=levels('A'), b=levels('B'), mx=levelsMix();
  return `<table class="kv">${row('DIRECT A OUT',a.dir,a.clip)}${row('SWITCHED A OUT',a.sw,a.clip&&!D.mute.A)}${row('DIRECT B OUT',b.dir,b.clip)}${row('SWITCHED B OUT',b.sw,b.clip&&!D.mute.B)}${row('MIX OUT',mx.diff,mx.clip)}
   <tr><th>Rails</th><td class="mono">±${railAt(t).toFixed(1)} V · +48V ${phV().toFixed(1)} V (${D.build})</td></tr>
   <tr><th>Peak LEDs light at</th><td class="mono">A/B ${fdb(pkLevelCh())} dBu (DIRECT) · MIX ${fdb(pkLevelMix())} dBu (bus, pre-fader)</td></tr></table>`; }
function levelsHTML(){ const a=levels('A'), b=levels('B'), mx=levelsMix();
  return `<h3>MIC A · total ${a.total<-150?'—':fdb(a.total)+' dB'}</h3>${stageTable(a.stages)}<details><summary class="small">MIC B</summary>${stageTable(b.stages)}</details><h3>MIX</h3>${stageTable(mx.stages)}
   <p class="small muted">Clip points use the ±${railV().toFixed(1)} V rails less ${V.swingLoss} V of swing loss (${inf}). The manual gives +28 dBu max output; the model gives ${fdb(v2dbu((railV()-V.swingLoss)/Math.SQRT2)+6.02)} dBu.</p>`; }
const viewSim = simView({ flag:'__pod4Active', D, front:frontSVG, rear:rearSVG, bind:bindPanel, controls:controlsHTML, bindControls, now:nowHTML, levels:levelsHTML, lanes, labelW:220,
  rearTitle:'Rear panel — click the XLRs and the A/B MUTE terminals', hint:'Turn a LVL trim, flip a 48V slide, close a MUTE terminal or turn MIX LVL.' });
const LESSONS = [
  { title:'Meet the POD4', body:`<p>POD4 is a <b>dual microphone preamplifier</b>. Each mic (A and B) has a <b>DIRECT</b> output, a <b>SWITCHED</b> output that an external closure can mute, and a front <b>48V</b> phantom switch, <b>MUTE</b> tally, <b>LVL</b> gain trim and <b>PK</b> peak LED. The switched outputs are also summed into a <b>MIX</b> output with its own knob and peak LED.</p><p class="muted">This follows POD4MANU.pdf (2002|35) and the ISS4 netlist.</p>`, check:()=>true, auto:true },
  { title:'1 · Power up', body:`<p>Click the <b>rocker</b>. The LM317/LM337 regulators make ±${railV().toFixed(1)} V for the op-amps.</p>`, check:()=>D.power, hint:'Rocker on the left.' },
  { title:'2 · Phantom for the condenser', body:`<p>MIC B is a condenser mic. It gives nothing until it gets phantom power. Make sure <b>48V B</b> is on and the red 48V LED is lit; then switch MIC B to dynamic and back to see the difference.</p><p><b>Goal:</b> 48V B on, 48V A off (MIC A is a dynamic mic and does not need it).</p>`, check:()=>D.ph.B&&!D.ph.A, hint:'Click the slide switches next to the 48V labels.' },
  { title:'3 · Set the gain', body:`<p>A speaking voice at −50 dBu should come out at about <b>+4 dBu</b>. Turn <b>LVL A</b> until DIRECT A OUT reads +4 dBu (±1 dB). The balanced output stage adds a fixed +12 dB, so the SSM2017 needs about 42 dB.</p>`, check:()=>Math.abs(levels('A').dir-4)<=1&&D.mic.A.lvl===-50, hint:'Q/W keys, or click the LVL A trim halves. Keep MIC A at −50 dBu.' },
  { title:'4 · Mute from the console', body:`<p>A console tally can mute the SWITCHED output by closing <b>A MUTE</b> to <b>G</b> on the rear terminal block. DIRECT A keeps running (for a recorder), and MIC A leaves the MIX.</p><p><b>Goal:</b> mute A.</p>`, check:()=>D.mute.A, hint:'Click the A MUTE terminal on the rear (17th position).' },
  { title:'5 · Watch the peak LEDs', body:`<p>Raise MIC B's level to −20 dBu (a loud singer close to the mic). The <b>PK B</b> LED flickers at about ${fdb(pkLevelCh())} dBu out. Its comparator has no hold capacitor fitted (C35/C36 are DNI), so it lights only on the peaks of each cycle.</p>`, check:()=>levels('B').dir>=pkLevelCh(), hint:'Type −20 into MIC B level, or turn LVL B up (E/R).' },
  { title:'6 · The mix', body:`<p>Unmute A, then set <b>MIC MIX LVL</b> so MIX OUT reads between 0 and +8 dBu. MIX PK watches the bus before the knob, so turning the knob down does not stop it lighting.</p>`, check:()=>!D.mute.A && levelsMix().diff>=0 && levelsMix().diff<=8, hint:'A/S keys turn the MIX knob.' },
  { title:'Done', body:`<p>Switch <b>Values</b> to “P-CAD ISS4 .bom” to see why the production BOM differs from the drawing (Findings has the details).</p>`, check:()=>true, auto:true },
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod4Active=true; tutorialView(m,{ title:'Tutorial — setting up a POD4', lessons:LESSONS, D, getIdx:()=>lessonIdx, setIdx:i=>lessonIdx=i, reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${nowHTML(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); } }); }
const viewSecond = secondView({ flag:'__pod4Active', front:frontSVG, bind:bindPanel, freq:()=>D.f, ladderLabel:'DIRECT A OUT', ladderFn:t=>chain('A',t).direct,
  ladder:()=>[['1 second',1],['100 ms',0.1],['10 ms',0.01],['1 tone cycle',1/D.f],['50 µs',5e-5]],
  outs:()=>[['DIRECT A',t=>chain('A',t).direct],['SWITCHED A',t=>chain('A',t).swd],['DIRECT B',t=>chain('B',t).direct],['MIX',t=>mixAt(t).diff]],
  rows:()=>[['Test-tone cycles',D.f.toLocaleString(),SIM.fmtDur(1/D.f),'a continuous analog path — nothing is sampled'],
    ['Rectifier charging pulses','120',SIM.fmtDur(1/120),'D1–D4 bridge into C1/C2 470 µF; the LM317/337 remove the ripple'],
    ['Input coupling HPF (C14 47 µ · 2 × 6K81)','—',SIM.fmtDur(47e-6*13620),`−3 dB at ${(1/(2*Math.PI*47e-6*13620)).toFixed(2)} Hz`],
    ['Input RF filter (2 × 47R · C11 3n9)','—',SIM.fmtDur(94*3.9e-9),`≈ ${(1/(2*Math.PI*94*3.9e-9)/1000).toFixed(0)} kHz`],
    ['Output coupling (C19 33 µ · R39 10K)','—',SIM.fmtDur(33e-6*1e4),`−3 dB at ${(1/(2*Math.PI*33e-6*1e4)).toFixed(2)} Hz`],
    ['MIX PK peak hold (C10 100 n · R74 100K)','—',SIM.fmtDur(V.R74*V.C10),'charge through R12 1K in 0.1 ms, then 10 ms release'],
    ['Phantom ramp after 48V on','—','≈ 50 ms '+inf,'C37 22 µF through R15 100R and the 6K81 pair; the condenser mic wakes up'],
    ['SSM2017 bandwidth at high gain','—','—','≈ 200 kHz typical ('+inf+', datasheet), so 20 kHz stays flat even at 60 dB']],
  dev:t=>{ const a=chain('A',t), mx=mixAt(t); return `<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)} · cycle ${Math.floor(t*D.f).toLocaleString()}</td></tr>
    <tr><th>Rails</th><td class="mono">±${railAt(t).toFixed(2)} V · +48V(A) ${phAt(t,'A').toFixed(1)} V · +48V(B) ${phAt(t,'B').toFixed(1)} V</td></tr>
    <tr><th>MIC A path</th><td class="mono">XLR ${(a.vin*1000).toFixed(2)} mV → SSM2017 ${a.s.toFixed(3)} V → legs ${a.d1.toFixed(3)} / ${a.d2.toFixed(3)} V</td></tr>
    <tr><th>MIX</th><td class="mono">bus ${mx.bus.toFixed(3)} V → out ${mx.diff.toFixed(3)} V diff.</td></tr><tr><th>PK A / MIX PK</th><td class="mono">${pkCh('A',t)?'ON':'off'} / ${mixPkAt(t)?'ON':'off'}</td></tr></table>`; } });
const BLOCKS = {
  psu:{x:20,y:20,w:170,h:100,t:'Power',s:['T1 15 V toroid, D1–D4','REG2/REG1 LM317/337 → ±V','D5–D7 multiplier → REG3','D8 4V3 zener → +5 V'],d:'±15.0 V (FINAL BOM 2K43) or ±17.5 V (P-CAD 2K87). The +48V rail comes from a diode/capacitor multiplier on the same winding, regulated by an LM317LZ.'},
  xlr:{x:20,y:150,w:170,h:90,t:'MIC A / MIC B XLR-F',s:['C13–C16 47 µF/63 V','R16/R17 6K81 phantom feed','D10–D17 zener clamps'],d:'Phantom is fed through 6K81 pairs from the PH switch (R15/R22 100R, C37/C38 22 µF). 47 µF caps keep the 48 V off the preamp.'},
  pre:{x:230,y:150,w:170,h:90,t:'U2/U3 SSM2017',s:['G = 1 + 10k/RG','RG = 10R + LVL trim','47R + 3n9 RF filter'],d:'Low-noise instrumentation preamp (INA217 listed as substitute). LVL trim range: FINAL 500R → 26–60 dB; P-CAD 2K → 15.5–60 dB.'},
  dir:{x:440,y:120,w:170,h:70,t:'DIRECT (U5/U6)',s:['−2, then unity inverter','+12 dB balanced, 2 × 30R'],d:'Always live. R38/R39 20K/10K, R40/R41 20K/20K.'},
  sw:{x:440,y:210,w:170,h:80,t:'SWITCHED (U9/U8)',s:['74HC4053 at virtual earth','mute = closure to G'],d:'U4 74HC4053: X (A) and Z (B) switches pick between the U9A/U8A summing node and ground. Select lines from the rear CTL terminals through 100R, pulled up by 100K.'},
  mix:{x:650,y:210,w:170,h:90,t:'MIX (U1A, U7)',s:['LF353 summer of SWITCHED','MIX LVL 10K log knob','U7 balanced out'],d:'The mix is built from the switched outputs, so a muted mic drops out of it.'},
  pk:{x:650,y:60,w:170,h:100,t:'PK detectors (U10, U1B)',s:['LF353 comparators','A/B: U5A vs V−·5K1/20K1','MIX: D18 peak vs V+·R14/(R13+R14)'],d:'C35/C36 hold caps are DNI in the FINAL BOM, so A/B PK has no hold. D19 (output-leg detector) is DNI, so MIX PK sees only the bus.'},
  front:{x:230,y:20,w:170,h:90,t:'Front panel',s:['48V slides + red LEDs','MUTE green LEDs','LVL trims · MIX knob'],d:'R1966 rocker, Dialight right-angle LEDs, Bourns 3006P trims through the panel.'},
};
const WIRES=[['psu','pre','±V'],['psu','xlr','+48V'],['xlr','pre',''],['pre','dir',''],['pre','sw',''],['sw','mix',''],['dir','pk','U5A'],['mix','pk','bus'],['front','pre','LVL'],['front','mix','MIX LVL']];
function viewBlock(m){ window.__pod4Active=false; blockView(m,BLOCKS,WIRES,'pre',[840,310],card('In one sentence',`<p>Each mic goes through a phantom-powered, 47 µF-coupled input into an SSM2017 preamp; a −2/inverter pair makes a DIRECT balanced output, a second pair behind a CMOS mute switch makes the SWITCHED output, and the two switched signals are summed into a knob-controlled MIX.</p>`)); }
const SHEETS=[
  { name:'1 · Mic A input + SSM2017', note:'From POD4iss4.net (ISS4). Channel B: XLR_B, C15/C16, R23/R24/R25/R28, R26/R27, C12, U3, LVL_B, R32.', svg:()=>
    net(30,140,'XLR_A-2')+wire([[100,140],[130,140]])+cap(130,140,180,140,'C14','47µ/63')+res(180,140,240,140,'R20','47R')+wire([[240,140],[300,140]])+dot(270,140)+res(270,140,270,230,'R21','6K81')+gnd(270,230)
    +net(30,260,'XLR_A-3')+wire([[100,260],[130,260]])+cap(130,260,180,260,'C13','47µ/63')+res(180,260,240,260,'R19','47R')+wire([[240,260],[300,260]])+dot(250,260)+res(250,260,250,330,'R18','6K81')+gnd(250,330)
    +cap(300,140,300,260,'C11','3n9')+res(110,140,110,60,'R16','6K81')+res(150,260,150,200,'','')+wire([[150,200],[150,60]])+txt(158,190,'R17 6K81',10)+wire([[110,60],[150,60]])+net(115,46,'NET00010 ← R15 100R ← PH_A_SW ← +48V; C37 22µ to GNDA')
    +chip(380,110,140,'U2 SSM2017',[['+IN (3)',''],['−IN (2)',''],['RG1 (1)',''],['RG2 (8)','']],[['OUT (6)','→ R33, R39'],['REF (5)','GNDA'],['V+ (7)','V+'],['V− (4)','V−']],'G = 1 + 10k/RG')
    +wire([[300,140],[346,132]])+wire([[300,260],[346,150]])+res(346,168,346,250,'R30','10R')+wire([[346,250],[360,250]])+txt(364,254,`LVL_A ${B().LVL} Ω (wiper = ccw) → pin 8`,10)
    +txt(40,420,`RG = 10 + (1−f)·${B().LVL} Ω → SSM2017 ${fdb(dB(ssmG(0)))} … ${fdb(dB(ssmG(1)))} dB; with the +12 dB output stage: ${fdb(dB(ssmG(0))+12.04)} … ${fdb(dB(ssmG(1))+12.04)} dB (manual: 28–70 dB)`,11.5) },
  { name:'2 · DIRECT / SWITCHED / mute', note:'U5 = DIRECT A (H2-9/H2-10), U9 = SWITCHED A (H2-7/H2-8); U6/U8 for B. U4 74HC4053 pins: 11 A ← A MUTE, 9 C ← B MUTE, 10 B and Y unused (GNDA).', svg:()=>
    net(30,100,'U2-6')+res(80,100,150,100,'R39','10K')+cap(150,100,200,100,'C19','33µ')+wire([[200,100],[240,100],[240,88]])+opamp(240,100,'U5A NE5532')+wire([[240,112],[230,112],[230,130]])+gnd(230,130)
    +res(240,60,300,60,'R38','20K')+wire([[240,88],[240,60]])+wire([[300,60],[320,60],[320,100]])+wire([[300,100],[360,100]])+res(360,100,420,100,'R69','30R')+net(425,100,'DIRECT A (H2-9)')
    +res(330,100,330,170,'R41','20K')+wire([[330,170],[360,170]])+opamp(360,182,'U5B')+res(430,150,480,150,'R40','20K')+wire([[420,182],[500,182]])+res(500,182,560,182,'R70','30R')+net(565,182,'DIRECT A (H2-10)')
    +net(30,300,'U2-6')+res(80,300,150,300,'R33','10K')+cap(150,300,200,300,'C18','33µ')+chip(220,280,110,'U4 74HC4053',[['X (14)',''],['A (11)','← A MUTE']],[['X1 (13)','→ U9-2'],['X0 (12)','GNDA']],'')
    +opamp(450,320,'U9A')+res(450,270,520,270,'R52','20K')+net(540,320,'SWITCHED A (H2-7) via R67 30R; −2 → U9B → H2-8')+net(540,345,'U9-1 → R10 20K → MIX bus (U1-2)')
    +txt(40,420,'Muted: X → X0 = ground, so R33 sees 0 V at its far end and U9A outputs 0. The CMOS switch only ever sees the virtual-earth node (≈ 0 V).',11) },
  { name:'3 · Mix, peak LEDs, power', note:`FINAL BOM values shown (P-CAD in brackets). D19 and C35/C36 DNI. MIX_LVL = TOCOS dual 10K log (one section).`, svg:()=>
    chip(80,60,130,'U1 LF353',[['−A (2)','R9/R10 20K ← U8-1/U9-1'],['+B (5)','MIX ← D18 peak'],['−B (6)','V+·R14/(R13+R14)']],[['A (1)','→ MIX_LVL-1, D18'],['B (7)','→ R8 1K → MIXPK']],'A: summer (R11 20K) · B: comparator')
    +chip(560,60,130,'U10 LF353',[['−A (2)','PK_A ← R56 1K ← U5-1'],['+ (3,5)','V−·R58/(R57+R58)'],['−B (6)','PK_B ← R59 1K ← U6-1']],[['A (1)','R55 1K5 → PK_A'],['B (7)','R60 1K → PK_B']],'channel peak comparators')
    +txt(60,250,`References: A/B −${pkRefCh().toFixed(2)} V  → PK at ${fdb(pkLevelCh())} dBu balanced;  MIX +${pkRefMix().toFixed(2)} V + 0.6 V diode → ${fdb(pkLevelMix())} dBu (bus)`,11)
    +txt(60,290,`REG2 LM317T: 1.25·(1 + ${B().R1}/221) = +${railV().toFixed(2)} V   ·   REG1 LM337T: −${railV().toFixed(2)} V`,11)
    +txt(60,310,`REG3 LM317LZ: 1.25·(1 + R7/R6) = 1.25·(1 + ${B().R7}/${B().R6}) = ${phV().toFixed(2)} V  (+48V rail)`,11)
    +txt(60,330,'D8 1N749A 4V3 zener + R36 1K5 from V+ → “+5” for the 74HC4053 and the MUTE/LED pull-ups',11) },
];
function viewSchem(m){ window.__pod4Active=false; schemView(m,SHEETS,'POD4','The P-CAD originals are POD4iss4.sch/.net (ISS4, 2006|39). These sheets keep the reference designators, values and net names from the netlist and BOMs, laid out more simply. Blue labels are nets.'); }
const viewSoft = softView({ flag:'__pod4Active', D, intro:'POD4 has no processor. Click a stage for its maths; the controls on the other tabs change the numbers.',
  flows:[ { title:'MIC A → DIRECT A', stages:()=>{ const a=levels('A'); return [{t:'MIC A XLR',s:[fdb(a.stages[0].lvl)+' dBu',D.ph.A?'48V on':'48V off']},{t:'SSM2017',s:['G '+fdb(dB(ssmG(D.trim.A)))+' dB',fdb(a.stages[1].lvl)+' dBu'],bad:a.clip},{t:'U5A ×−2',s:[fdb(a.stages[2].lvl)+' dBu/leg']},{t:'U5B ×−1',s:['+6.02 dB diff.']},{t:'2×30R → DIRECT',s:[fdb(a.dir)+' dBu']}]; },
      det:[()=>`<b>Input.</b> 6K81 phantom pair (13.6 kΩ) in parallel with the 6K81 bias pair through C13/C14: about ${(1/(1/13620+1/13620)/1000).toFixed(1)} kΩ differential.`,
        ()=>`<b>SSM2017.</b> RG = 10 + (1−${D.trim.A.toFixed(2)})·${B().LVL} = ${Math.round(V.R30+(1-D.trim.A)*B().LVL)} Ω → G = ${ssmG(D.trim.A).toFixed(1)} (${fdb(dB(ssmG(D.trim.A)))} dB).`,
        ()=>`<b>U5A.</b> −R38/R39 = −20K/10K = −2 (+6.02 dB) through C19 33 µF.`,()=>`<b>U5B.</b> R40/R41 20K/20K unity inverter → second leg; differential +6.02 dB.`,()=>`<b>Output.</b> R69/R70 30R build-out. Peak LED at ${fdb(pkLevelCh())} dBu.`] },
    { title:'SWITCHED A + SWITCHED B → MIX', stages:()=>{ const mx=levelsMix(); return [{t:'U9A / U8A',s:[D.mute.A?'A muted':'A live',D.mute.B?'B muted':'B live']},{t:'U1A summer',s:[fdb(mx.bus)+' dBu'],bad:mx.clip},{t:'MIX LVL',s:[Math.round(D.mix*100)+' % rot.',fdb(dB(Math.max(mixGain(),1e-9)))+' dB']},{t:'U7 → MIX',s:[fdb(mx.diff)+' dBu']}]; },
      det:[()=>`<b>Switched stages.</b> 74HC4053 picks summing node or ground at the input resistor.`,()=>`<b>U1A.</b> −(A+B)·20K/20K. MIX PK compares this bus (via D18) with +${pkRefMix().toFixed(2)} V.`,()=>`<b>MIX LVL.</b> log taper a = ${mixA().toFixed(3)}; wiper source a(1−a)·10K loads R73.`,()=>`<b>U7.</b> −1 and a unity inverter: +6.02 dB balanced.`] } ],
  chartTitle:'LVL trim → mic-to-DIRECT gain (both value sets)', chart:cv=>curveChart(cv,[
    {fn:f=>20*Math.log10(1+10000/(10+(1-f)*500))+12.04, col:SIM.css('--accent'), label:'FINAL 500R', cur:D.build==='final'?D.trim.A:null},
    {fn:f=>20*Math.log10(1+10000/(10+(1-f)*2000))+12.04, col:SIM.css('--accent2'), label:'P-CAD 2K', cur:D.build==='pcad'?D.trim.A:null}],20,80,' dB'),
  buttons:[['Rocker','T1 → D1–D4 → LM317/LM337 → ±V; multiplier → LM317LZ → +48V','Rails, phantom'],['48V A/B slide','+48V → R15/R22 100R → 6K81 pair → XLR 2/3; V+ → R29/R31 → PH LED','Phantom on the mic'],['LVL A/B trim','LVL_x between SSM2017 pins 1 and 8 with 10R','26–60 dB (FINAL) preamp gain'],['A/B MUTE closure','R75/R76 → 74HC4053 A/C select; MUTE LED from +5','SWITCHED out and mix muted'],['MIC MIX LVL','MIX_LVL wiper → R73 → U7A','Mix level']],
  pins:[['MIC A/B (XLR-F)','2 / 3 / 1','XLR_x-2 (C14+) / XLR_x-3 (C13+) / GND'],['Rear block (2 × 9-way Phoenix 3.5 mm)','1–15','DIRECT B, DIRECT A, SWITCHED B, SWITCHED A, MIX: + − G each (via H2 14-way)'],['CTL','16 / 17 / 18','B MUTE / A MUTE / G (closure to G mutes)'],['H2 (14-way)','1/2 · 3/4 · 5/6 · 7/8 · 9/10 · 13/14','A/B mute ctl · MIX · SW B · SW A · DIR A · DIR B']] });
const viewNotes = notesView('__pod4Active','What the POD4 archive shows — findings',[
  ()=>`<b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src(ART_SRC,'POD4-FRONT&REAR-SILK (CURVE).cdr')} (Jun.19/14).</b> The front plates carry the cut-outs as outlines, and every LED, slide, trim and the MIX knob of the simulator sits on one of them. The drill centre marks (a cross in every hole, and big ones through the XLRs and the Phoenix block) are on the sheet but not on the panel in ${SIM.src('#POD #SERIES/POD4 - #Master/POD4 - #ARTWORK #DA #2016/Pics/POD4 Front.jpg','Pics/POD4 Front.jpg')}, so they are drawn as faint geometry here. Older art: ${SIM.src('#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD4SLK-CURVE-ISS2.cdr','POD4SLK-CURVE-ISS2.cdr')} (30 Apr 2014|47) has the same legend with the WHITE plate above the GREEN one, and its rear CAUTION block is still live text that runs off the panel when converted; ${SIM.src('#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD4SLKS.CDR','POD4SLKS.CDR')} (Jan 2008|41) is the earlier set.`,
  ()=>`<b>The P-CAD BOM's phantom regulator gives 2.5 V, not 48 V.</b> In <span class="mono">POD4 iss4 PCAD.bom</span> R6 and R7 are both 221R, so REG3 (LM317LZ) makes 1.25·(1+221/221) = 2.5 V. The FINAL BOM changes them to 240R and 9K09: 1.25·(1+9090/240) = ${(1.25*(1+9090/240)).toFixed(1)} V. The drawing was never updated; only the production BOM is right. Switch “Values” to P-CAD to see a condenser mic stay dead.`,
  `<b>The manual's 28–70 dB gain range fits the P-CAD 2K trim, not the 500R that production fits.</b> With RG = 10R + 2K the SSM2017 gives 15.5–60 dB; add the fixed +12 dB output stage and the range is 27.6–72 dB. The FINAL BOM fits a Bourns 3006P 500R, which narrows it to 38.3–72 dB. Quieter sources (a line feed into the mic input) can no longer be brought down far enough.`,
  ()=>`<b>The “+19 dBu” peak LEDs move with the rails.</b> The comparator references are dividers from the rails (R57/R58, R13/R14). P-CAD values (±17.5 V) put PK A/B at about +18.2 dBu, close to the manual. The FINAL BOM's ±15 V rails put them at ${fdb(v2dbu(15*5100/20100/Math.SQRT2)+6.02)} dBu, and its R14 5K1 (P-CAD 15K) moves MIX PK from about +24.6 dBu to ${fdb(v2dbu((15*5100/20100+0.6)/Math.SQRT2)+6.02)} dBu.`,
  `<b>MIX PK is pre-fader.</b> D18 rectifies U1A's output (the bus), before the MIX LVL knob. D19, which would have watched the output leg (U7-1), is DNI. So MIX PK warns about the bus, and turning the knob down does not stop it.`,
  `<b>The peak LEDs have no hold.</b> C35 and C36 (0.1 µF on PK_A/PK_B) are “DO NOT INSTALL” in the FINAL BOM, so U10 lights its LED only during the part of each cycle past the threshold. The LED flickers at audio rate instead of flashing for a visible time.`,
  `<b>The mute switch works at a virtual earth.</b> U4 (74HC4053, VCC +5 V, VEE at ground) sits between the 10K input resistor and the U9A/U8A summing node. Its pins never swing more than a few millivolts, so a 5 V CMOS switch can mute a ±15 V audio path without distortion.`,
  `<b>Input impedance is about half the spec.</b> The phantom pair (R16/R17 6K81) is AC-grounded by C37 even when 48V is off, and the bias pair (R18/R21 6K81) sits behind the 47 µF caps. In parallel that is ≈ 6.8 kΩ differential; the manual says 12 kΩ.`,
  `<b>The manual's power spec is out of date.</b> It says “12V AC”; the FINAL BOM fits a 15 V toroid (TE70043, 15 V 0.666 A), and the 74HC4053 is flagged “*Obsolete*” in the same BOM.`,
], [`Op-amp/SSM2017 outputs swing to within 1.5 V of the rails, with hard clipping (${inf}).`,`LVL trims are used as rheostats; fully CW = 0 Ω (maximum gain) (${inf}). MIX LVL follows a log taper with 10 % at mid-travel (${inf}).`,`Phantom switch pole mapping (which pole lights the LED) ${inf}. Condenser mic needs > 30 V; phantom ramps in ≈ 50 ms (${inf}).`,`Mix level adds A and B as uncorrelated sources (power sum) in the tables; the waveforms add sample by sample.`],
  ['POD4 - #Engineering/POD4 - #ISS4 #PCB/POD4iss4.net · POD4iss4.sch','POD4 - #Master/POD4 iss4 PCAD.bom · POD 4 FINAL BOM.xlsx · POD4 Misys BOM.xls','POD4 - #Engineering/POD4MANU.pdf · pod4.pdf',SIM.src(ART_SRC,'POD4 - #ARTWORK #DA #2016/POD4-FRONT&REAR-SILK (CURVE).cdr')+' (panel artwork) · .pdf','POD4 - #Mechanical #DA #2016/POD4-FRONT ISS 1 (PANEL).pdf · POD4-REAR ISS 3 (PANEL).pdf · POD4-SHIELD ISS 1.pdf']);
SIM.register({
  footnotes:[{text:"The silk sheet draws a drill cross in every hole and big ones through the XLRs and the Phoenix block. The photo shows none of them printed, so they are construction marks. <span class=\"tag-inf\">inferred</span>", src:"#POD #SERIES/POD4 - #Master/POD4 - #ARTWORK #DA #2016/Pics/POD4 Front.jpg"},
  {text:"POD4SLK-CURVE-ISS2.cdr (30 Apr 2014) stacks the WHITE plate above the GREEN one. Its rear CAUTION block is still live text and runs off the panel when converted.", src:"#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD4SLK-CURVE-ISS2.cdr"},
  {text:"POD4SLKS.CDR (Jan 2008) is the earlier silk set, kept beside the 2014 issue.", src:"#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD4SLKS.CDR"},
  {text:"A hooked line ties each \"48V\" legend to its phantom LED rather than to the slide switch beside it.", src:"#POD #SERIES/POD4 - #Master/POD4 - #ARTWORK #DA #2016/POD4-FRONT&REAR-SILK (CURVE).cdr"}],
  id:'pod4', name:'POD4 · dual microphone preamplifier with mix (2006|39)', duration:1, product:'POD4', year:2006, family:'POD series', folder:'#POD #SERIES/POD4 - #Master',
  summary:'Half-rack dual mic preamp: SSM2017 front ends with switchable 48 V phantom, DIRECT and mutable SWITCHED balanced outputs per mic, and a knob-controlled MIX of the switched outputs. Modelled from the ISS4 netlist (2006) with both the P-CAD and the production BOM values.',
  highlights:['Real silkscreen panels: 48V slides, LVL trims, MIX knob, rear XLRs and mute terminals','SSM2017 gain and the +12 dB balanced output stage from the netlist','CMOS mute at a virtual earth; mix built from the switched outputs','Peak comparators and rail-derived thresholds','P-CAD BOM phantom regulator that only makes 2.5 V'],
  depth:'Hardware model',
  stepUnits:[{label:'1 tone cycle', period:()=>1/D.f},{label:'1 ms', period:()=>0.001},{label:'10 ms', period:()=>0.01},{label:'100 ms', period:()=>0.1}],
  zooms:[[1,'1 s'],[0.1,'100 ms (power-up, phantom)'],[0.01,'10 ms'],[0.002,'2 ms (two 1 kHz cycles)'],[0.0002,'200 µs']], defaultZoom:3,
  init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: setting up a POD4',render:viewTutorial},{id:'second',label:'One second, cycle by cycle',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
