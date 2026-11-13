/* =====================================================================
   SLM8 — SLM-8 (SLM-8D) four-input AES loudness meter, 8 bars (Ward-Beck Systems), obsolete mechanical folder
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model (the SLM8 firmware is not archived).

   Sources used:
   - #SLM #SERIES - To Delete/XXX - SLM8 - #Mechanical #Obsolete/Silks/SLM8-1M3-SILK(CURVE).cdr (display lens, Jul.29/14 → assets/slm8-lens-white.png)
   - …/SLM8-1M1 … M10 drawings, SLM8-REMOTE GAIN BRACKET ISS 1, ASSEMBLY & OBSOLETE/SLM8-ASSEMBLY (DWG text: “WITH KLT15F/TOF15 PSU”,
       “4 PLACES .562 DIA.”, “SLM8 BASE 15 DEGREE ANGLE”, “THIS LARGE KNOB IS NOT AVAILABLE ANYMORE”); SLM8-1M9 ISS 1 (PCB SPACER).pdf
   - #SLM #SERIES - To Delete/XXX - SLM8-1 - #PNP #2016 #OBSOLETE/SLM8-1iss2-T.prg, SLM8-1iss2b-B.prg (2011 pick-and-place: LED colours and positions)
   - WBS - #SOFTWARE LISTINGS OFFICIAL - FULL HISTORY - #Engineering_.xlsx (SLM8 ATmega128L V103/V104, SHARC V102, Altera EPC1S V100)
   - #SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/SLM1 MANUAL mod.pdf (SLM-8D description, ballistics, calibration table)
   - Sister plugin slm.js (SLM-1D) for the 57-LED scale (+20 … 0 … −52) that the SLM8 lens repeats
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
const PREFIX='slm8';
const LW=600, LH=996, PPI=150;                             // lens 4.000 × 6.640 in
const BARX=[...Array(8)].map((_,k)=>49.6+71.25*k);         // pick-and-place: L1 x 0.194 in, pitch 0.475 in
const LED0=130, PITCH=11.25;                               // +20 at the top … −52 at the bottom, 0.075 in pitch
const LAB57=[]; for(let v=20;v>=-20;v--) LAB57.push(v); for(let v=-22;v>=-52;v-=2) LAB57.push(v);
const yOfK = k => LED0 + k*PITCH;                          // k = 0 (+20) … 56 (−52); PR LED (index 1) at k = 59
/* colour of scale step k from SLM8-1iss2-T.prg (index i = 60 − k): R 49–60, Y 42–48, G 39–41, Y 35–38, G 4–34, PR Y */
function colK(k){ const i=60-k; return i>=49?'#ff3b30': i>=42?'#ffd60a': i>=39?'#30d158': i>=35?'#ffd60a':'#30d158'; }
const kOf = L => L==null? null : (L>=-20? 20-L : 40+(-L-20)/2);
const PAIRX=[85,228,370,513];                              // LOCK / sticky-peak LED columns (L112–L115, L119…L127)
const FMT=['PCM','DOLBY E','DOLBY D'], FMTX=[156.6,299,441.5];
/* ---------------- state ---------------- */
const D = { power:true, ins:[0,1,2,3].map(i=>({on:true, fmt:'PCM', lvl:-20+(i*3)-4, kind:i===3?'tone':'program'})), cal:0, ppm2:true, hold:true, ver:'V104', gain:0.5, bnc:false, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const NOMS=[-20,-18,-16,-14];                               // SLM1/2 DIGITAL table: CAL1/CAL0 (SLM8 use inferred)
const nominal = ()=> NOMS[D.cal];
const decay = ()=> 24/(D.ppm2?3.0:1.5);                     // dB per second: Type 2 = 3.0 s/24 dB, Type 1 = 1.5 s/24 dB
function hsh(x){ x=Math.imul(x^0x5bd1e995, 0x27d4eb2d); x^=x>>>15; return (x>>>0)/4294967296; }
function chLvl(ch,t){ const i=ch>>1, s=D.ins[i]; if(!s.on||!D.power) return -200; if(s.kind==='tone') return s.lvl - (ch&1?1:0);
  const k=Math.floor(t*25); return s.lvl + (hsh(k*31+ch*977)-0.5)*14 - (hsh(k*17+ch*131)>0.93?12:0) + (hsh(k*7+ch)>0.97?9:0); }
function meter(ch,t){ let vu=-200, pk=-200, held=-200, heldT=-1; const dt=0.01;
  for(let k=80;k>=0;k--){ const tt=t-k*dt, L=chLvl(ch,tt), p=L<-150?0:Math.pow(10,L/10), vp=vu<-150?0:Math.pow(10,vu/10), nv=vp+(p-vp)*(1-Math.exp(-dt/0.3)); vu=nv>1e-12?10*Math.log10(nv):-200;
    const Lp=L+5; if(Lp>pk){ pk=Lp; } else pk=pk-decay()*dt;
    if (D.hold && Lp>nominal() && Lp>=held){ held=Lp; heldT=tt; } }
  if (D.hold && heldT>=0 && t-heldT<3) pk=Math.max(pk,held);   // “Peak Hold … holds ‘PPM’ peaks above ‘nominal’ for 3 seconds”
  return {vu,pk}; }
const isAudio = i => D.ins[i].fmt==='PCM' || D.ver==='V103';  // V104 “IMPROVED DOLBY DETECTION”: data blanks the bars (inferred)
const locked = i => D.power && D.ins[i].on;
const stickyPk = (i,t)=>{ if(!locked(i)||!isAudio(i)) return false; for(let k=0;k<300;k++){ const tt=t-k*0.01; if(tt<0) break; if(Math.max(chLvl(2*i,tt),chLvl(2*i+1,tt))+5>-3) return true; } return false; }  // “Peak LED … above -3dB for 3 seconds”
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`nominal ${nominal()} dBFS · PPM ${D.ppm2?'Type 2':'Type 1'} · hold ${D.hold?'on':'off'}`);
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; tr('IEC inlet → KLT15F/TOF15 PSU module (rear-cover drawing note) → SLM8-1 board; the SLM-8D is the only SLM on mains (90–230 VAC, manual)'); tr(D.power?`ATmega128L ${D.ver} starts; the SHARC boots SLM8V102 from the AM29LV040B flash; the EPC1S loads SLM8V100 into the Altera (software listing)`:'All 8 bars and status LEDs dark'); }); },
  plug(i){ act(`AES ${i+1} ${D.ins[i].on?'unplugged':'connected'}`, tr=>{ D.ins[i].on=!D.ins[i].on; tr(`LOCK ${i+1} (L${112+i}, red on the board) ${D.ins[i].on?'lights':'goes out'}; bars ${2*i+1}–${2*i+2} ${D.ins[i].on?'follow the input':'fall'}`); tr(D.bnc?'75 Ω version: one of the four .562 in BNC holes in the rear cover (SLM8-1M2)':'110 Ω version: 3-pin pluggable terminal (manual)'); }); },
  fmt(i,f){ act(`AES ${i+1} carries ${f}`, tr=>{ D.ins[i].fmt=f; tr(f==='PCM'?'Channel status “audio”: metered normally':`Non-audio data: IEC 61937 burst preambles Pa/Pb (Dolby D) or a Dolby E sync word in the PCM slots (${inf}: detection method)`); tr(`${FMT.indexOf(f)>=0?FMT[FMT.indexOf(f)]+' LED ('+['L116','L117','L118'][FMT.indexOf(f)]+', green) on':''}. ${D.ver==='V104'?'V104 (2007-05-07) “UPDATED FOR IMPROVED DOLBY DETECTION”: bars blank instead of showing data as noise ('+inf+')':'V103: data reads as full-scale noise on the bars ('+inf+')'}`); }); },
  dip(k){ act(`DIP ${['CAL0 (SW1)','CAL1 (SW2)','BS0 (SW3)','BS1 (SW4)'][k]} toggled`, tr=>{ if(k===0) D.cal^=1; if(k===1) D.cal^=2; if(k===2) D.ppm2=!D.ppm2; if(k===3) D.hold=!D.hold;
    tr(`Nominal (0 on the scale) = ${nominal()} dBFS; ${D.ppm2?'PPM Type 2 (3.0 s/24 dB)':'PPM Type 1 (1.5 s/24 dB)'}; peak hold ${D.hold?'on':'off'} — SLM1/2 DIP table (${inf}: the SLM8 table is not archived)`); }); },
  ver(v){ act(`Firmware → ATmega ${v}`, tr=>{ D.ver=v; tr(v==='V104'?'SLM8V104 (75 Ω version), 2007-05-07: improved Dolby detection':'SLM8V103 (110 Ω version), 2006-05-24: peak hold function'); }); },
  gain(d){ act(`Remote gain ${d>0?'up':'down'}`, tr=>{ D.gain=clamp(+(D.gain+d*0.05).toFixed(2),0,1); tr(`SLM8-REMOTE GAIN BRACKET holds a modified pot (“POD P/N 51CADE24B15”, shaft cut to 0.200 in; “THIS LARGE KNOB IS NOT AVAILABLE ANYMORE”). What it adjusts is not in the archive (${inf}: shown here as display brightness)`); }); },
  set(i,k,v,l){ act(l, tr=>{ D.ins[i][k]=v; tr('Source changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- the lens and the unit ---------------- */
function lensSVG(){ const t=SIM.t, br=0.45+0.55*D.gain; let u='', o='';
  for(let b=0;b<8;b++){ const i=b>>1, ok=locked(i)&&isAudio(i), m=ok?meter(b,t):{vu:-200,pk:-200}, kv=m.vu>-150?kOf(Math.round(clamp(m.vu-nominal(),-52,20))):99, kp=m.pk>-150?kOf(Math.round(clamp(m.pk-nominal(),-52,20))):99;
    for(let k=0;k<57;k++){ const on = D.power && ok && (k>=Math.round(kv) || k===Math.round(kp)); u+=`<rect x="${BARX[b]-9}" y="${yOfK(k)-3.6}" width="18" height="7.2" rx="1" fill="${on?colK(k):'#1c1d1f'}" opacity="${on?br:1}"/>`; }
    u+=`<rect x="${BARX[b]-9}" y="${yOfK(59)-3.6}" width="18" height="7.2" rx="1" fill="${D.power&&D.hold&&ok?'#ffd60a':'#1c1d1f'}" opacity="${br}"/>`; }
  PAIRX.forEach((x,i)=>{ o+=led(x,824,locked(i),'#ff3b30',6)+led(x,355,D.power&&stickyPk(i,t),'#ff3b30',5)+led(x,936,D.power&&stickyPk(i,t),'#ff3b30',5); });
  FMT.forEach((f,k)=>{ o+=led(FMTX[k],872,D.power&&D.ins.some((s,i)=>locked(i)&&s.fmt===f),'#30d158',6); });
  o+=`<text x="49.6" y="104" text-anchor="middle" font-size="11" fill="#eee" font-family="Arial">1</text>`;
  return layered({w:LW,h:LH,bg:'#0d0e0f',under:u,layers:[PREFIX+'-lens-white.png'],over:o,label:'SLM-8 display lens (SLM8-1M3-SILK)',maxw:420,rx:6}); }
function sideSVG(){ // the assembled unit, from the part list (M1 enclosure, M2 rear cover, M3 lens, M7 base at 15°) — proportions inferred
  return `<svg viewBox="0 0 470 300" style="width:100%;max-width:470px"><g transform="rotate(-15 180 250)"><rect x="110" y="40" width="90" height="200" rx="4" fill="var(--panel2)" stroke="var(--ink)"/><rect x="104" y="44" width="8" height="192" fill="var(--accent)" opacity=".6"/><rect x="200" y="50" width="10" height="180" fill="var(--ink2)" opacity=".5"/></g>
    <path d="M60 270 H300 L280 255 H80 Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="20" y="292" font-size="11" fill="var(--ink2)">M7 base, “15 DEGREE ANGLE”</text><text x="10" y="40" font-size="11" fill="var(--accent)">M3 lens (front)</text><text x="230" y="60" font-size="11" fill="var(--ink2)">M2 rear cover: PSU, 4 × .562 holes</text><text x="210" y="160" font-size="11" fill="var(--ink2)">M1 enclosure + M4/M10 brackets</text></svg>`; }
function rearHTML(){ return `<svg viewBox="0 0 640 230" style="width:100%;max-width:520px"><rect width="640" height="230" rx="6" fill="#151617"/>
  ${[0,1,2,3].map(i=>`<g class="rin" data-i="${i}" style="cursor:pointer"><title>AES ${i+1} (${D.bnc?'BNC 75 Ω':'3-pin 110 Ω'}) — click to ${D.ins[i].on?'unplug':'connect'}</title>${D.bnc?bnc(80+i*135,60,D.ins[i].on,'','',30):phx(80+i*135,60,D.ins[i].on,'','')}<text x="${80+i*135}" y="${112}" text-anchor="middle" font-size="14" fill="#eee">AES ${i+1}</text></g>`).join('')}
  <text x="40" y="140" font-size="13" fill="#eee">SETUP (SLM1/2 table, inferred)</text>${dip(40,150,[!(D.cal&1),!(D.cal&2),D.ppm2,!D.hold],'sdp',['CAL0','CAL1','BS0 (ON = Type 2)','BS1 (ON = hold off)'])}
  ${iec(470,140,600,220)}<text x="470" y="132" font-size="13" fill="#eee">90-230 VAC</text></svg>`; }
function bindPanel(r){ r.querySelectorAll('.rin').forEach(g=>g.onclick=()=>A.plug(+g.dataset.i)); r.querySelectorAll('.sdp').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i)); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:6px">
  ${D.ins.map((s,i)=>`<label>AES ${i+1} <select class="ff" data-i="${i}">${['PCM','DOLBY E','DOLBY D'].map(f=>`<option ${f===s.fmt?'selected':''}>${f}</option>`).join('')}</select> <input class="lv" data-i="${i}" type="number" step="2" value="${s.lvl}" style="width:52px"> dBFS</label>`).join('')}
  <label>ATmega <select id="ver">${['V103','V104'].map(v=>`<option ${v===D.ver?'selected':''}>${v}</option>`).join('')}</select></label>
  <label><input type="checkbox" id="bn" ${D.bnc?'checked':''}> 75 Ω BNC version</label><button id="gd">gain −</button><button id="gu">gain +</button></div>`; }
function bindControls(r){ r.querySelectorAll('.ff').forEach(s=>s.onchange=e=>A.fmt(+s.dataset.i,e.target.value)); r.querySelectorAll('.lv').forEach(s=>s.onchange=e=>A.set(+s.dataset.i,'lvl',+e.target.value,`AES ${+s.dataset.i+1} level → ${e.target.value} dBFS`));
  const g=s=>r.querySelector(s); if(!g('#ver')) return; g('#ver').onchange=e=>A.ver(e.target.value); g('#bn').onchange=e=>{ D.bnc=e.target.checked; SIM.refresh(); }; g('#gd').onclick=()=>A.gain(-1); g('#gu').onclick=()=>A.gain(1); }
bindKeys('__slm8Active', ()=>({'1':()=>A.plug(0),'2':()=>A.plug(1),'3':()=>A.plug(2),'4':()=>A.plug(3),c:()=>A.dip(0),p:()=>A.dip(2),h:()=>A.dip(3)}));
/* ---------------- timeline ---------------- */
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2');
  return [
    {label:'AES frames (48 kHz)', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,0,1/96000,SIM.css('--ink2'),'frames'); }},
    {label:'AES blocks (192 frames)', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,192/48000,0,1/48000,b,'Z preamble / channel status'); }},
    {label:'AC-3 frames (1536 samples)', h:18, draw(c,X,t0,t1,y,h){ if(!D.ins.some(s=>s.fmt==='DOLBY D')){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('no Dolby D input',X(t0)+6,y+13); return;} SIM.pulses(c,X,t0,t1,y,h,1536/48000,0,0.0004,SIM.css('--warn'),'Pa/Pb burst'); }},
    {label:'Dolby E frames (29.97 Hz)', h:18, draw(c,X,t0,t1,y,h){ if(!D.ins.some(s=>s.fmt==='DOLBY E')){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('no Dolby E input',X(t0)+6,y+13); return;} SIM.pulses(c,X,t0,t1,y,h,1001/30000,0,0.0006,SIM.css('--warn'),'sync word'); }},
    waveLane('Bar 1 VU (re nominal, 0 = top of VU range)', t=>{ const m=locked(0)&&isAudio(0)?meter(0,t):{vu:-200}; return Math.max(-52,m.vu-nominal()); }, 60, null, a, 46),
    waveLane(`Bar 1 PPM (${D.ppm2?'3.0':'1.5'} s / 24 dB)${D.hold?' + hold':''}`, t=>{ const m=locked(0)&&isAudio(0)?meter(0,t):{pk:-200}; return Math.max(-52,m.pk-nominal()); }, 60, null, SIM.css('--warn'), 46),
    boolLane('Sticky peak pair 1 (> −3 dBFS, 3 s)', t=>D.power&&stickyPk(0,t), SIM.css('--bad')),
  ]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__slm8Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Display lens (SLM8-1M3-SILK) with the SLM8-1 LEDs behind it',`<div id="lens"></div>`)}</div>
   <div>${card('Rear and set-up (click inputs and switches)',`<div id="rear"></div>${controlsHTML()}`)}${card('The unit (SLM8-1M1…M10)',sideSVG())}${card('What the meter did (last action)',`<div id="trace" class="log"></div>`)}</div></div>
   ${card('Timeline — one second, zoomable',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#lens').innerHTML=lensSVG(); m.querySelector('#rear').innerHTML=rearHTML(); bindPanel(m.querySelector('#rear'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Unplug an input, change a format, flip a DIP switch.'); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:230}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the SLM-8', body:`<p>The SLM manual lists the <b>SLM-8D</b>: “Stereo Loudness Meter - 4 AES/EBU Digital audio inputs”, a quad stereo meter in a “table top swivel stand for vertical viewing”, the only SLM on mains power (90–230 VAC). The lens shows eight bars, LOCK 1–4, and PCM / DOLBY E / DOLBY D indicators.</p>`, check:()=>true, auto:true},
  {title:'1 · Read the scale', body:`<p>Each bar is 57 LEDs: the upper part (“PEAK RANGE”) runs +1 … +20 above nominal, the lower part (“VU RANGE”) 0 … −52. The VU bar and a single PPM dot show at the same time. Set the nominal to <b>−18 dBFS</b> (CAL0 OFF).</p>`, check:()=>nominal()===-18, hint:'Click the first DIP switch (or press C).'},
  {title:'2 · Lose an input', body:`<p>Unplug <b>AES 3</b>: LOCK 3 goes out and bars 5–6 drop.</p>`, check:()=>!D.ins[2].on, hint:'Click AES 3 on the rear, or press 3.'},
  {title:'3 · Dolby on the line', body:`<p>Reconnect AES 3 and set it to carry <b>DOLBY E</b>. The DOLBY E LED lights; with ATmega <b>V104</b> (“improved Dolby detection”) the bars blank instead of showing data as noise.</p>`, check:()=>D.ins[2].on&&D.ins[2].fmt==='DOLBY E'&&D.ver==='V104', hint:'AES 3 selector → DOLBY E.'},
  {title:'4 · Ballistics', body:`<p>Switch to <b>PPM Type 1</b> (1.5 s / 24 dB, BS0) and turn <b>peak hold</b> off (BS1). Watch the bar-1 PPM lane fall twice as fast.</p>`, check:()=>!D.ppm2&&!D.hold, hint:'P and H keys.'},
  {title:'Done', body:`<p>See <b>Findings</b> for what the mechanical and pick-and-place files reveal.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__slm8Active=true; tutorialView(m,{title:'Tutorial — setting up an SLM-8',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`<div class="grid2"><div>${lensSVG()}</div><div>${rearHTML()}${controlsHTML()}</div></div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__slm8Active=true;
  m.innerHTML=`${card('One second in an SLM-8',`<div id="tab"></div>`)}<div class="grid2">${card('At the playhead',`<div id="dev"></div>`)}${card('Bar 1 over the last second (VU line, PPM dots)',`<canvas id="h"></canvas>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#tab').innerHTML=tbl(['Event','per second','period','notes'],[['AES frames per input','48 000',SIM.fmtDur(1/48000),'4 inputs → 8 channels'],['AES blocks (channel status)','250',SIM.fmtDur(192/48000),'bit 1 of byte 0 = non-audio ('+inf+': detection)'],['AC-3 bursts','31.25',SIM.fmtDur(0.032),'1536-sample frames'],['Dolby E frames','29.97',SIM.fmtDur(1001/30000),'one per video frame'],['VU integration','—','300 ms','standard VU ballistics ('+inf+')'],['PPM fall',D.ppm2?'8 dB/s':'16 dB/s',D.ppm2?'3.0 s/24 dB':'1.5 s/24 dB','manual'],['Peak hold','—','3 s','“holds PPM peaks above nominal for 3 seconds”']]);
    const mm=locked(0)&&isAudio(0)?meter(0,t):{vu:-200,pk:-200};
    m.querySelector('#dev').innerHTML=kvt([['Time',SIM.fmtT(t),1],['Bar 1 VU',fdb(mm.vu)+' dBFS = '+fdb(mm.vu-nominal())+' on the scale',1],['Bar 1 PPM',fdb(mm.pk)+' dBFS',1],['LOCK 1–4',[0,1,2,3].map(i=>locked(i)?'●':'○').join(' ')],['Formats',D.ins.map(s=>s.fmt).join(' · ')]]);
    const {c,w}=SIM.canvas(m.querySelector('#h'),200), Y=d=>20+(20-clamp(d,-52,20))/72*170;
    c.strokeStyle=SIM.css('--grid'); [20,0,-20,-52].forEach(d=>{ c.beginPath(); c.moveTo(30,Y(d)); c.lineTo(w,Y(d)); c.stroke(); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(String(d),2,Y(d)+3); });
    c.strokeStyle=SIM.css('--accent'); c.beginPath(); for(let i=0;i<=100;i++){ const tt=Math.max(0,t-1+i/100), r=locked(0)&&isAudio(0)?meter(0,tt):{vu:-200}; const x=30+(w-30)*i/100, y=Y(r.vu-nominal()); i?c.lineTo(x,y):c.moveTo(x,y);} c.stroke();
    c.fillStyle=SIM.css('--warn'); for(let i=0;i<=50;i++){ const tt=Math.max(0,t-1+i/50), r=locked(0)&&isAudio(0)?meter(0,tt):{pk:-200}; c.fillRect(30+(w-30)*i/50-1,Y(r.pk-nominal())-1,3,3); } };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:15,y:30,w:160,h:80,t:'4 AES inputs',s:['110 Ω 3-pin or','75 Ω BNC (.562 holes)'],d:'Two firmware lines exist: SLM8V103 for 110 Ω balanced and SLM8V104 for 75 Ω unbalanced (software listing).'},
  fpga:{x:195,y:30,w:170,h:80,t:'Altera (EPC1S)',s:['SLM8V100'],d:'Configured from an EPC1S serial device (software listing). Role inferred: AES receive/format to the DSP and LED drive.'},
  dsp:{x:385,y:30,w:170,h:80,t:'SHARC',s:['SLM8V102','AM29LV040B flash'],d:'Meter ballistics (VU, PPM, hold) like the SLM-1D (slm.js) — inferred from the shared scale.'},
  avr:{x:195,y:140,w:170,h:80,t:'ATmega128L',s:['V103 peak hold','V104 Dolby detect'],d:'Status, set-up switches, peak hold (V103, 2006) and improved Dolby detection (V104, 2007).'},
  led:{x:575,y:30,w:170,h:90,t:'SLM8-1 LED board',s:['8 × 58 LEDs','LOCK, PCM, DOLBY E/D'],d:'34 green + 12 yellow + 12 red per bar (pick-and-place), plus 15 status LEDs (L112–L127).'},
  psu:{x:385,y:140,w:170,h:80,t:'PSU module',s:['KLT15F / TOF15','90–230 VAC'],d:'Named on the rear-cover drawing SLM8-1M2.'},
};
const WIRES=[['in','fpga',''],['fpga','dsp',''],['dsp','led',''],['avr','fpga',''],['avr','led','status'],['psu','avr','']];
function viewBlock(m){ window.__slm8Active=false; blockView(m,BLOCKS,WIRES,'led',[760,240],card('In one sentence',`<p>Four AES inputs go through an Altera into a SHARC that computes VU and PPM for eight bars on a 464-LED board behind a silk-screened lens; an ATmega128L handles status, peak hold and the PCM / Dolby E / Dolby D indicators.</p>`)); }
const SHEETS=[
  {name:'1 · SLM8-1 LED map (pick-and-place)', note:'From SLM8-1iss2-T.prg (14 Jun 2011): designators, colours and X/Y in inches. Index i = 1 … 60 per bar; 2 and 3 are not placed.', svg:()=>{
    let s=txt(30,30,'Bar Ln, index i: colour (scale value)',12);
    const rows=[['60 … 49','red ×12','+20 … +9'],['48 … 42','yellow ×7','+8 … +2'],['41 … 39','green ×3','+1, 0, −1'],['38 … 35','yellow ×4','−2 … −5'],['34 … 4','green ×31','−6 … −20, −22 … −52'],['1','yellow','PR (0.225 in below the scale)']];
    rows.forEach((r,k)=>{ s+=txt(30,60+k*22,r[0],11.5)+txt(160,60+k*22,r[1],11.5,'var(--accent2)')+txt(280,60+k*22,r[2],11.5); });
    s+=txt(30,230,'Bars L1…L8 at x = 0.194 + 0.475 n in; LEDs 0.075 in apart.',11.5)+txt(30,260,'Status: L112–L115 red at y −1.072 (LOCK 1–4) · L116–L118 green at y −0.697 (PCM, DOLBY E, DOLBY D)',11.5)+txt(30,280,'L121–L125 red at y −4.197 (0-dB line between bar pairs) · L119, L124, L126, L127 red at y −0.322 — unlabelled on the lens',11.5)
      +txt(30,300,'Bottom side (SLM8-1iss2b-B.prg): R7–R14 365R (LED current, '+'inferred'+'), R22… 1K5 …',11.5,'var(--ink2)'); return s; }},
];
function viewSchem(m){ window.__slm8Active=false; schemView(m,SHEETS,'SLM8-1 iss 2','No SLM8 schematic or netlist is archived; this sheet is the LED map from the pick-and-place program.'); }
function viewSoft(m){ window.__slm8Active=true; let hot=2;
  m.innerHTML=`${card('Firmware history (WBS software listing) — the code itself is not archived',tbl(['Part','Device','Version','Date','Change'],[['ATmega (110 Ω)','ATmega128L','SLM8V103 → V104','2006-05-24','UPDATED FOR PEAK HOLD FUNCTION'],['ATmega (75 Ω)','ATmega128L','SLM8V104','2007-05-07','UPDATED FOR IMPROVED DOLBY DETECTION'],['DSP','SHARC (AM29LV040B flash)','SLM8V102','—',''],['FPGA','Altera (EPC1S)','SLM8V100','—','']],true))}
   ${card('Signal path for bar 1 (click a stage)',`<div id="f"></div><div id="det" class="card small"></div>`)}`;
  const draw=()=>{ const ok=locked(0), mm=ok&&isAudio(0)?meter(0,SIM.t):{vu:-200,pk:-200};
    const st=[{t:'AES 1',s:[ok?'locked':'no signal']},{t:'Format check',s:[D.ins[0].fmt],bad:D.ins[0].fmt!=='PCM'},{t:'VU 300 ms',s:[fdb(mm.vu)+' dBFS']},{t:'PPM',s:[fdb(mm.pk)+' dBFS']},{t:'Scale (nominal '+nominal()+')',s:['VU LED '+(mm.vu>-150?Math.round(kOf(Math.round(clamp(mm.vu-nominal(),-52,20)))):'—')]},{t:'57-LED bar',s:['+ PR LED']}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=['Receiver lock lights LOCK 1.','Non-audio data is recognised (Dolby E / D) and, with V104, kept off the bars ('+inf+').','Average level, 300 ms ('+inf+').',`PPM: instant attack, ${decay()} dB/s fall${D.hold?', held 3 s above nominal':''}.`,'0 on the lens = the nominal level from CAL0/CAL1.','Lower part 1-dB steps to −20, then 2-dB steps to −52; above 0, 1-dB peak range to +20.'][hot]; };
  SIM.on('time',draw); }
function viewNotes(m){ window.__slm8Active=false;
  m.innerHTML=card('What the SLM8 files show — findings',`<ol>
   <li><b>No electronics design survives here.</b> The folder holds metalwork (M1–M10, remote-gain bracket), a lens silk and an assembly drawing; the SLM8-1 board exists only as 2011 pick-and-place data. The firmware (ATmega V103/V104, SHARC V102, Altera V100) is listed but not archived anywhere (the README’s pointer to <span class="mono">#SLM #SERIES</span> finds only the SLM-1 code).</li>
   <li><b>The LED board is mounted upside down relative to its numbering.</b> Index 1 (the PR LED) sits 3 pitches below index 4 (−52), and index 60 is +20: the colour run read from the top is red ×12, yellow ×7, green ×3 (around 0), yellow ×4, green ×31.</li>
   <li><b>58 LEDs, 57 scale marks.</b> The lens scale (+20 … 0 … −52, 1-dB then 2-dB steps) is the SLM-1’s 57-step scale; the 58th LED is the “PR” position below it.</li>
   <li><b>Unlabelled LEDs.</b> Eight red LEDs (L119, L121–L127) have no legend on the lens; the SLM manual’s “pair of ‘sticky’ peak LEDs (for each stereo pair)” fits their count (${inf}).</li>
   <li><b>Lens label lost in conversion.</b> The bar number “1” does not survive the CorelDRAW conversion (libcdr text alignment); it is redrawn here.</li>
   <li><b>Rear cover facts.</b> SLM8-1M2: “WITH KLT15F/TOF15 PSU”, four .562 in holes (BNCs for the 75 Ω version, ${inf}), 11 vent slots, 44 + 24 + 84 inserts and countersinks; “BSOS-440-8 IS NOT AVAILABLE — take BSOS-440-10 and modify it”.</li>
   <li><b>A discontinued knob.</b> SLM8-REMOTE GAIN BRACKET: a modified pot “POD P/N 51CADE24B15” with the shaft cut to 0.200 in; “THIS LARGE KNOB IS NOT AVAILABLE ANYMORE”.</li>
   <li><b>Desk stand.</b> SLM8-1M7 ISS 2: “SLM8 BASE 15 DEGREE ANGLE”, “(2) CUTOUTS ADDED” — the manual’s “table top swivel stand for vertical viewing”.</li>
   <li><b>Custom job.</b> A custom SLM8 front exists in <span class="mono">#CUSTOM 55XXXX Systems/552728</span> (slm8frontss*.cdr) and a TURRETS job 550001 has an SLM8-1ISS1-TEST.err file.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>CAL/BS switches use the SLM1/2 digital table (${inf}).</li><li>VU 300 ms; PPM per the manual; the PR LED lights while peak hold is on (${inf}).</li><li>Dolby detection blanks the bars in V104 (${inf}); detection by burst preambles / sync words (${inf}).</li><li>“Remote gain” shown as display brightness (${inf}; purpose undocumented).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>XXX - SLM8 - #Mechanical #Obsolete/Silks/SLM8-1M3-SILK(CURVE).cdr (→ assets/slm8-lens-white.png)</li><li>…/SLM8-1M2 ISS 1 (REAR COVER).dwg, SLM8-1M7 ISS 2 (BASE).dwg, SLM8-REMOTE GAIN BRACKET ISS 1.dwg, ASSEMBLY &amp; OBSOLETE/SLM8-ASSEMBLY.dwg (+ .md text), SLM8-1M9 ISS 1 (PCB SPACER).pdf</li><li>XXX - SLM8-1 - #PNP #2016 #OBSOLETE/SLM8-1iss2-T.prg, SLM8-1iss2b-B.prg</li><li>WBS - #SOFTWARE LISTINGS OFFICIAL - FULL HISTORY - #Engineering_.xlsx</li><li>#SLM #SERIES - To Delete/…/SLM-1/SLM1 MANUAL mod.pdf</li></ul>`); }
SIM.register({
  id:'slm8', name:'SLM8 · SLM-8D four-input AES loudness meter, 8 bars (2006|39–2014|47)', duration:1, product:'SLM8', year:2006, family:'Obsolete products', folder:'#SLM #SERIES - To Delete/XXX - SLM8 - #Mechanical #Obsolete',
  summary:'A desk-top meter on a 15° stand: four AES inputs shown as eight 57-step VU + PPM bars behind a silk-screened lens, with LOCK, PCM, Dolby E and Dolby D indicators. Built from the lens silk, the 2011 LED pick-and-place data, the metalwork drawings, the software listing and the SLM manual.',
  highlights:['Real lens silkscreen with 464 LEDs placed from the pick-and-place file','VU bar + PPM dot with Type 1/2 decay and 3 s peak hold','LOCK and PCM / Dolby E / Dolby D indicators','Mechanical assembly: enclosure, rear cover, lens, 15° base'],
  depth:'Hardware model',
  stepUnits:[{label:'10 ms',period:()=>0.01},{label:'1 AES block',period:()=>192/48000},{label:'1 AES frame',period:()=>1/48000}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.05,'50 ms'],[0.004,'1 AES block'],[1e-4,'100 µs']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'LED map (from PNP)',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
