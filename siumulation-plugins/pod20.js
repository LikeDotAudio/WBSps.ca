/* =====================================================================
   POD20 — Serial digital video distribution amplifier, 1 in / 6 out, cable EQ + reclocking (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.

   Sources used (all in this archive, folder #POD #SERIES/POD20 - #Master):
   - PCB/pod20-1iss2.net (= POD20 - #ISS2 #PCB/), ISS2 netlist, Sep 2000   (CLC014 EQ, CLC016 reclocker, 2 × CLC007 drivers, 7805, LEDs)
   - POD20 - #OBSOLETE/pod20-1.net (ISS1, same circuit)
   - POD20 - #OLD MANUAL.pdf (Jul 2002) and ../POD  - #Engineering/pod20.pdf      (rates 143/177/270/360 Mb/s, Belden 8281, 300 m, tallies)
   - POD20 - #SILK/POD20SLK.cdr, converted with Inkscape (libcdr): bars, LED and BNC cross-hairs used as drawn;
     text re-anchored by hand because libcdr loses its alignment (no photo of POD20 exists to check against).
   The CLC014/CLC016 pin functions and cable losses are from the parts' public behaviour, not the archive: marked inferred.
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

const PREFIX='pod20';
/* the four CLC016 data rates and their VCO resistors (R7…R10 from the netlist; pairing by 1/R, inferred) */
const RATES=[ {mbps:143.18, r:'R10 6K81', pin:13, std:'NTSC 4fsc composite (10-bit)', led:'SR143', wps:14.318e6, line:910, lines:525, field:59.94},
  {mbps:177.34, r:'R9 5K49', pin:14, std:'PAL 4fsc composite (10-bit)', led:null, wps:17.734e6, line:1135, lines:625, field:50},
  {mbps:270, r:'R8 3K48', pin:15, std:'4:2:2 component (Rec.601)', led:'SR270', wps:27e6, line:1716, lines:525, field:59.94},
  {mbps:360, r:'R7 2K55', pin:17, std:'4:2:2 16:9 (18 MHz sampling)', led:'SR360', wps:36e6, line:2288, lines:525, field:59.94} ];
const V = { k8281:8.0, eqMax:30, Rterm:75, Rout:68, vout:0.8, lockT:0.004 };   // dB/100 m at 135 MHz and EQ range: inferred
const D = { power:true, powerAt:-1, rate:2, len:150, plug:true, plugAt:-1, outs:[true,true,true,true,true,true], log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const R=()=>RATES[D.rate];
const loss = (len, mbps)=> V.k8281*len/100*Math.sqrt((mbps*1e6/2)/135e6);      // cable loss at the Nyquist frequency
const canEq = ()=> loss(D.len, R().mbps) <= V.eqMax;
const upAt = t => ramp(D.power, D.powerAt, t, 5, 0.02, 0.005);
function locked(t){ if (!D.power||!D.plug||!canEq()) return false; const t0=Math.max(D.plugAt, D.powerAt); return upAt(t)>4.5 && (t0<0 || t>=t0+0.02+V.lockT); }
/* LED decode (U1/U2 logic): one yellow LED per rate, none for 177 (no LED on the panel) */
const srLed = n => locked(1e9) && R().led===n;
/* ---- bit stream + first-order channel model ---- */
function bitAt(n){ let x=(n*2654435761)>>>0; x^=x>>>13; x=(x*1274126177)>>>0; return (x>>>16)&1; }   // stand-in scrambled NRZI data
function tauFor(atten, mbps){ const fn=mbps*1e6/2, h=Math.pow(10,-atten/20); return Math.sqrt(Math.max(1/(h*h)-1,0))/(2*Math.PI*fn); }
function wave(tns, tau, ui){ // value at time tns (ns) for a ±0.4 V NRZ stream through a first-order low-pass with time constant tau (ns)
  const n=Math.floor(tns/ui); let v=0; for (let k=n-40;k<=n;k++){ const a=bitAt(k)?0.4:-0.4, b=bitAt(k-1)?0.4:-0.4, dt=tns-k*ui; v += (a-b)*(tau>1e-6?1-Math.exp(-dt/tau):1); } return v + (bitAt(n-41)?0.4:-0.4); }
const act=makeActor(D,()=>`${R().mbps} Mb/s · ${D.len} m · ${locked(1e9)?'SIGNAL':'ERROR'}`);
const A={
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t; tr('PWRSW → T1 TE70040 (links 110_1/110_2/220) → D1–D4 → C14/C15 2200 µF → REG1 7805 → +5V; R33 300R → PWR LED'); tr('CLC014 equalizer, CLC016 reclocker and both CLC007 drivers run from the single +5 V rail'); } else tr('All off: outputs drop to 0 V'); }); },
  plug(){ act(`${D.plug?'Disconnect':'Connect'} INPUT`, tr=>{ D.plug=!D.plug; D.plugAt=SIM.t; tr(D.plug?'BNC → R2 75R termination → C1 1 µF → R1 110R → U5 CLC014 pin 9 (other input R4 110R / C2 / R3 75R to ground)':'No carrier: CLC016 loses lock → U1/U2 logic lights ERROR (R15 330R), all rate LEDs off'); }); },
  rate(i){ act(`Source data rate → ${RATES[i].mbps} Mb/s`, tr=>{ D.rate=i; D.plugAt=SIM.t; tr(`${RATES[i].std}`); tr(`CLC016 searches its four VCO ranges (resistors on pins 13/14/15/17) and locks on ${RATES[i].r} (pin ${RATES[i].pin}) (${inf})`); tr(RATES[i].led?`Rate code → U1/U2 decode → ${RATES[i].led} yellow LED`:'177 Mb/s: there is no 177 LED on the panel, so none of the three yellow LEDs lights'); }); },
  len(v){ act(`Input cable → ${v} m Belden 8281`, tr=>{ D.len=v; D.plugAt=SIM.t; const a=loss(v,R().mbps); tr(`Loss at ${(R().mbps/2).toFixed(0)} MHz ≈ ${a.toFixed(1)} dB (${V.k8281} dB/100 m at 135 MHz, √f, ${inf})`); tr(a<=V.eqMax?`CLC014 adaptive EQ restores the eye (range ≈ ${V.eqMax} dB, ${inf}); CLC016 retimes it`:'Beyond the equalizer: eye closed, no lock → ERROR'); }); },
  out(i){ act(`${D.outs[i]?'Disconnect':'Connect'} OUTPUT ${i+1}`, tr=>{ D.outs[i]=!D.outs[i]; tr(`CLC007 ${i<4?'U4':'U6'} output → C${[20,21,22,23,26,27][i]} 1 µF → R${17+i} 68R → OUTPUT ${i+1}: ${D.outs[i]?'0.8 V p-p into the 75 Ω load':'unterminated: the BNC sees ≈ 1.6 V p-p and reflections go back up the stub ('+inf+')'}`); }); },
  reset(){ Object.assign(D,JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
/* ---------------- panels (drawn from the converted POD20SLK.cdr: 1 pt = 2.778 px) ---------------- */
const BNCX=[261,411,561,711,861,1011,1160], LEDX={SIGNAL:825,SR143:925,SR270:1025,SR360:1125,ERROR:1225};
function face(inner){ return `<svg viewBox="0 0 1714 321" style="width:100%;max-width:980px;border-radius:8px;display:block"><defs><filter id="glowfront" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="1714" height="321" rx="10" fill="var(--dev)"/>${inner}${screw(50,160)}${screw(1664,160)}</svg>`; }
const W=(x,y,s,t,anc,wt)=>`<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${s}" fill="#f0f0ec" ${anc?`text-anchor="${anc}"`:''} ${wt?`font-weight="${wt}"`:''}>${t}</text>`;
function frontSVG(t){ const on=D.power&&upAt(t)>4.5, lk=locked(t);
  let s=`<rect x="50" y="16" width="205" height="20" fill="rgb(52,168,83)"/><rect x="520" y="16" width="1150" height="20" fill="rgb(52,168,83)"/>`
    +`<text x="273" y="74" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="62" fill="#f0f0ec">PODS</text><text x="520" y="64" font-family="Arial,sans-serif" font-weight="700" font-size="25" fill="rgb(52,168,83)">by Ward-Beck Systems</text>`
    +W(50,301,26,'POD-20 DIGITAL VIDEO DISTRIBUTION AMPLIFIER')+W(825,176,20,'SIGNAL','middle')+W(1025,176,20,'SAMPLE RATE','middle')+W(1225,176,20,'ERROR','middle')
    +W(925,200,20,'143','middle')+W(1025,200,20,'270','middle')+W(1125,200,20,'360','middle')
    +`<path d="M897 183 v-22 h40 M1155 183 v-22 h-40" stroke="#f0f0ec" stroke-width="2" fill="none"/>`;
  s+=rocker(D.power)+led(299,217,on,'var(--led-g)',10)+led(LEDX.SIGNAL,218,on&&lk,'var(--led-g)',10)+['SR143','SR270','SR360'].map(n=>led(LEDX[n],238,on&&lk&&R().led===n,'#ffd23a',9)).join('')+led(LEDX.ERROR,218,on&&!lk,'#ff4a3a',10);
  return face(s); }
function rearSVG(){ let s=W(261,101,20,'INPUT','middle')+[1,2,3,4,5,6].map(n=>W(BNCX[n],101,20,'OUTPUT '+n,'middle')).join('')+W(1520,58,22,'115 VAC, 1/2 A.S.B.','middle')+W(1520,302,18,'DISCONNECT POWER BEFORE SERVICING','middle');
  s+=bnc(BNCX[0],198,D.plug,'pin','INPUT (75 Ω BNC) — click to connect/disconnect',44)+[0,1,2,3,4,5].map(i=>bnc(BNCX[i+1],198,D.outs[i],'po'+i,`OUTPUT ${i+1} — click to connect/disconnect a 75 Ω load`,44)).join('')+iec(1410,78,1630,272);
  return face(s); }
function bindPanel(r){ const p=r.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); r.querySelectorAll('.pin').forEach(g=>g.onclick=()=>A.plug()); for(let i=0;i<6;i++) r.querySelectorAll('.po'+i).forEach(g=>g.onclick=()=>A.out(i)); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px"><label>Source <select id="rt">${RATES.map((r,i)=>`<option value="${i}" ${i===D.rate?'selected':''}>${r.mbps} Mb/s — ${r.std}</option>`).join('')}</select></label>
  <label>Input cable <input id="ln" type="range" min="0" max="500" step="10" value="${D.len}"> <span class="mono">${D.len} m</span></label></div><div class="small muted" style="margin-top:4px">Click the rear BNCs to connect or disconnect. Keys: [ / ] cable −/+ 25 m, 1–4 pick the data rate.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#rt')) return; g('#rt').onchange=e=>A.rate(+e.target.value); g('#ln').onchange=e=>A.len(+e.target.value); }
bindKeys('__pod20Active',()=>({'[':()=>A.len(Math.max(0,D.len-25)),']':()=>A.len(Math.min(500,D.len+25)),'1':()=>A.rate(0),'2':()=>A.rate(1),'3':()=>A.rate(2),'4':()=>A.rate(3)}));
/* ---------------- timeline: video structure seen by the reclocker ---------------- */
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), r=R(), lineT=r.line/r.wps, fieldT=1/r.field;
  return [ waveLane('+5V (7805)', t=>upAt(t), 6, null, wn, 22),
    {label:`Fields (${r.field} Hz)`, h:20, draw(c,X,t0,t1,y,h){ if(!locked((t0+t1)/2)) return; SIM.pulses(c,X,t0,t1,y,h,fieldT,0,fieldT*20/r.lines*(r.lines===525?1:1),b,'vertical blanking'); }},
    {label:`Lines (${(1/lineT).toFixed(0)} /s)`, h:20, draw(c,X,t0,t1,y,h){ if(!locked((t0+t1)/2)) return; SIM.pulses(c,X,t0,t1,y,h,lineT,0,lineT*(r.mbps>=270?(r.line-1440*(r.mbps===360?4/3:1))/r.line:0.17),a,'H blanking'); }},
    {label:'TRS words (EAV/SAV: 3FF 000 000 XYZ)', h:20, draw(c,X,t0,t1,y,h){ if(!locked((t0+t1)/2)||r.mbps<200) return; SIM.pulses(c,X,t0,t1,y,h,lineT,0,4/r.wps,SIM.css('--bad'),'EAV'); }},
    {label:`Words (${(r.wps/1e6).toFixed(3)} MW/s, 10 bit)`, h:20, draw(c,X,t0,t1,y,h){ if(!locked((t0+t1)/2)) return; SIM.pulses(c,X,t0,t1,y,h,1/r.wps,0,0.5/r.wps,SIM.css('--ink2'),'words'); }},
    waveLane('Serial data at the input BNC (after cable)', t=>D.plug&&D.power?wave(t*1e9,tauFor(loss(D.len,r.mbps),r.mbps)*1e9,1e3/r.mbps):0, 0.5, null, b, 36),
    waveLane('Reclocked output (CLC007, 75 Ω)', t=>locked(t)?wave(t*1e9,0.15,1e3/r.mbps):0, 0.5, null, a, 36),
    boolLane('SIGNAL (green)', t=>locked(t), '#3fbf5f'), boolLane('ERROR (red)', t=>D.power&&!locked(t), '#e3453a') ]; }
function nowHTML(t){ const a=loss(D.len,R().mbps); return `<table class="kv"><tr><th>Input</th><td class="mono">${D.plug?R().mbps+' Mb/s over '+D.len+' m':'— disconnected'}</td></tr><tr><th>Cable loss at ${(R().mbps/2).toFixed(0)} MHz</th><td class="mono">${a.toFixed(1)} dB ${a>V.eqMax?'<b style="color:var(--bad)">beyond EQ</b>':''}</td></tr>
  <tr><th>Tallies</th><td class="mono">${locked(t)?'SIGNAL':'ERROR'} · ${['SR143','SR270','SR360'].filter(srLed).join(' ')||'no rate LED'}</td></tr><tr><th>Outputs</th><td class="mono">${D.outs.map((o,i)=>`${i+1}:${locked(t)?(o?'0.8':'1.6'):'0'}`).join(' ')} V p-p</td></tr></table>`; }
function budgetHTML(){ const rows=RATES.map(r=>{ const a=loss(D.len,r.mbps), max=V.eqMax/(V.k8281/100*Math.sqrt((r.mbps*1e6/2)/135e6)); return `<tr><td>${r.mbps}</td><td class="mono">${a.toFixed(1)} dB</td><td class="mono">${max.toFixed(0)} m</td><td>${r.led||'— (no LED)'}</td></tr>`; }).join('');
  return `<table class="kv"><tr><th>Rate (Mb/s)</th><th>Loss at ${D.len} m</th><th>Max cable (${V.eqMax} dB EQ)</th><th>Rate LED</th></tr>${rows}</table><p class="small muted">Belden 8281 loss ${V.k8281} dB/100 m at 135 MHz scaling with √f, and a ${V.eqMax} dB equalizer range, are ${inf}; with them 270 Mb/s reaches ≈ ${(V.eqMax/(V.k8281/100)).toFixed(0)} m, in line with the manual's “up to 300 metres”.</p>`; }
const viewSim=simView({flag:'__pod20Active',D,front:frontSVG,rear:rearSVG,bind:bindPanel,controls:controlsHTML,bindControls,now:nowHTML,levels:budgetHTML,lanes,labelW:230,
  frontTitle:'Front panel at the playhead (drawn from the converted silk)',rearTitle:'Rear panel — click the BNCs',nowTitle:'Link now',levelsTitle:'Cable budget per data rate',tlTitle:'Timeline — one second of video as the reclocker sees it. Zoom to 100 µs for lines, 200 ns for bits.',hint:'Change the cable length or the source rate, or click a BNC.'});
const LESSONS=[
  {title:'Meet the POD20', body:'<p>POD20 takes one serial digital video signal on a 75 Ω BNC, <b>equalizes</b> the cable loss, <b>reclocks</b> it at one of four rates (143, 177, 270, 360 Mb/s) and drives <b>six</b> outputs. Front tallies: SIGNAL (locked), SAMPLE RATE 143/270/360, ERROR.</p>', check:()=>true, auto:true},
  {title:'1 · Lock to 270', body:'<p>Power on with a 270 Mb/s source over 150 m: SIGNAL and the 270 LED light.</p>', check:()=>locked(1e9)&&D.rate===2, hint:'Rocker; Source 270.'},
  {title:'2 · Long run', body:'<p>Stretch the cable to 300 m (the manual\'s limit). It still locks.</p>', check:()=>D.len>=300&&locked(1e9), hint:'] key or the slider.'},
  {title:'3 · Too far', body:'<p>Go to 450 m: the loss exceeds the equalizer and ERROR lights.</p>', check:()=>D.len>=450&&!locked(1e9), hint:'Slider to 450.'},
  {title:'4 · A PAL composite source', body:'<p>Back to 150 m and choose 177 Mb/s. It locks (SIGNAL) but no rate LED lights — the panel has none for 177.</p>', check:()=>D.rate===1&&locked(1e9), hint:'Source 177.'},
  {title:'5 · Terminate the outputs', body:'<p>Disconnect OUTPUT 3 and look at the Outputs line: an unterminated output shows twice the amplitude. Reconnect it.</p>', check:()=>D.log.some(e=>e.name==='Disconnect OUTPUT 3')&&D.outs[2], hint:'Click OUTPUT 3 twice.'},
  {title:'Done', body:'<p>Signal path shows the eye before and after equalization.</p>', check:()=>true, auto:true}];
let lessonIdx=0;
function viewTutorial(m){ window.__pod20Active=true; tutorialView(m,{title:'Tutorial — installing a POD20',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${nowHTML(SIM.t)}</div>`,bind:r=>{bindPanel(r);bindControls(r);}}); }
function eye(cv, tau, label, ok){ const {c,w}=SIM.canvas(cv,170), ui=1e3/R().mbps, x0=10, pw=w-20, Y=v=>85-v*160;
  c.strokeStyle=SIM.css('--grid'); c.strokeRect(x0,5,pw,160); c.fillStyle=SIM.css('--ink'); c.font='11px sans-serif'; c.fillText(label,x0+4,18);
  c.strokeStyle=ok?SIM.css('--accent'):SIM.css('--bad'); c.globalAlpha=.25; c.lineWidth=1;
  for (let k=60;k<220;k++){ c.beginPath(); for (let i=0;i<=60;i++){ const tt=(k+i/30)*ui; const x=x0+pw*i/60, y=Y(wave(tt,tau,ui)); i?c.lineTo(x,y):c.moveTo(x,y); } c.stroke(); }
  c.globalAlpha=1; c.fillStyle=SIM.css('--ink2'); c.fillText(`2 UI = ${(2*ui).toFixed(2)} ns`, x0+4, 160); }
function viewSecond(m){ window.__pod20Active=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the reclocker at the playhead',`<div id="dev"></div>`)}${card('As seen by the outside world',`<div id="fp"></div>`)}</div>${card('Zoom ladder — reclocked serial data',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, r=R(), lineT=r.line/r.wps;
    m.querySelector('#ladder').innerHTML=tableRows([['Fields',r.field,SIM.fmtDur(1/r.field),`${r.lines}-line system`],['Lines',(1/lineT).toFixed(1),SIM.fmtDur(lineT),`${r.line} words per line`],['Words (10 bit)',(r.wps/1e6).toFixed(3)+' M',SIM.fmtDur(1/r.wps),r.std],['Serial bits',(r.mbps).toFixed(2)+' M',SIM.fmtDur(1/(r.mbps*1e6)),'scrambled NRZI on the coax'],['PLL lock after a change','—',SIM.fmtDur(V.lockT)+' '+inf,'CLC016 rate search + lock'],['Supply','120','8.33 ms','D1–D4 into 2 × 2200 µF, 7805']]);
    const line=Math.floor(t/lineT), word=Math.floor((t%lineT)*r.wps);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>Field / line / word</th><td class="mono">${Math.floor(t*r.field)} / ${line%r.lines} / ${word}</td></tr><tr><th>State</th><td class="mono">${locked(t)?'locked at '+r.mbps+' Mb/s':'NO LOCK'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t);
    drawLadder(m.querySelector('#zl'),t,[['1 second',1],['1 field',1/r.field],['1 line',lineT],['10 words',10/r.wps],['20 bits',20/(r.mbps*1e6)]],tt=>locked(tt)?wave(tt*1e9,0.15,1e3/r.mbps):0,0.5,'serial data'); };
  SIM.on('time',draw); }
const BLOCKS={ inp:{x:20,y:60,w:150,h:80,t:'INPUT BNC',s:['R2 75R termination','C1 1 µF, R1 110R'],d:'Single-ended 75 Ω into one side of the CLC014 differential input; the other side is terminated (R3/R4/C2).'},
  eq:{x:210,y:60,w:160,h:80,t:'U5 CLC014',s:['adaptive cable EQ','C5 100p, C6 0.1 µ'],d:'Equalizes Belden 8281 loss (manual).'},
  rc:{x:410,y:60,w:170,h:100,t:'U7 CLC016',s:['data retiming PLL','4 rate resistors R7–R10','R11/C12/C13 loop filter'],d:'Retimes at 143/177/270/360 Mb/s. Lock and rate outputs go to U1/U2.'},
  logic:{x:410,y:200,w:170,h:80,t:'U1 / U2 logic',s:['rate + lock decode'],d:'Two unnamed 14-pin parts drive SIGNAL, SR143/270/360 and ERROR through 330R.'},
  drv:{x:620,y:60,w:170,h:100,t:'U4 + U6 CLC007',s:['cable drivers, 4 + 2','R14/R16 75R pull-ups','1 µF + 68R per output'],d:'Six outputs from two drivers driven in parallel from the CLC016 outputs.'},
  ps:{x:210,y:200,w:160,h:80,t:'Power',s:['T1 TE70040','7805 → +5V'],d:'Everything on +5 V.'} };
const WIRES=[['inp','eq',''],['eq','rc','equalized'],['rc','drv','retimed'],['rc','logic','LD, rate'],['ps','rc','+5V']];
function viewBlock(m){ window.__pod20Active=false; blockView(m,BLOCKS,WIRES,'rc',[810,300],card('In one sentence',`<p>A Comlinear CLC014 equalizes the incoming coax, a CLC016 PLL retimes the data at one of four rates, and two CLC007 drivers fan it out to six 75 Ω outputs, with lock and rate tallies on the front.</p>`)); }
const SHEETS=[{name:'1 · Signal path', note:'From pod20-1iss2.net (ISS2). Pin functions of the CLC parts are inferred from the parts; net names and values are from the netlist.', svg:()=>
  net(20,120,'INPUT-3')+res(70,120,70,200,'R2','75R')+gnd(70,200)+cap(90,120,150,120,'C1','1µ')+res(150,120,220,120,'R1','110R')+wire([[220,120],[250,120]])
  +chip(250,90,120,'U5 CLC014',[['9','← R1'],['8','← R4 / C2 / R3']],[['13','→ U7-5'],['14','→ U7-6']],'EQ')
  +chip(470,80,130,'U7 CLC016',[['5/6','data in'],['13/14/15/17','R10/R9/R8/R7'],['18','common R']],[['24/25','→ U4/U6 in'],['19/28','→ U1 (lock) '+'inferred'],['20/21','→ U1/U2 (rate)']],'reclocker')
  +chip(700,80,110,'U4 CLC007',[['6/7','data']],[['1–4','→ C20–C23 → 68R → OUT1–4']],'U6: OUT5–6')+txt(40,420,'Rate resistors: R7 2K55, R8 3K48, R9 5K49, R10 6K81 (f·R ≈ constant: 360·2.55 ≈ 270·3.48 ≈ 177·5.49 ≈ 143·6.81).',11)},
  {name:'2 · Tallies and power', note:'LED anodes through 330R from the U2-6 node; cathodes to the decode outputs (SR143 ← U2-3, SR270 ← U2-8, SR360 ← U1-11).', svg:()=>
  txt(60,80,'SIGNAL (green): R13 330R ← U2-6 node',12)+txt(60,105,'SR143 / SR270 / SR360 (yellow): R23 / R24 / R25 330R; cathodes to U2-3 / U2-8 / U1-11',12)+txt(60,130,'ERROR (red): R15 330R ← U2-4/U2-5/U1-3',12)+txt(60,155,'No LED for 177 Mb/s',12)
  +txt(60,210,'T1 TE70040, links 110_1 / 110_2 / 220 (0R) choose the primary; D1–D4 1N4004; C14/C15 2200 µF/25 V; REG1 7805 → +5V',12)+txt(60,235,'PWR green LED via R33 300R from the raw rail',12)}];
function viewSchem(m){ window.__pod20Active=false; schemView(m,SHEETS,'POD20','The P-CAD originals are pod20-1iss2.sch/.net (two identical copies) and ISS1 in #OBSOLETE.'); }
function viewSoft(m){ window.__pod20Active=true;
  m.innerHTML=`${card('No firmware — the signal path, with the eye at each stage',`<p class="small">Stand-in scrambled data through a first-order model of ${D.len} m of 8281 (${inf}). Change the cable length on the Simulator tab.</p><div class="grid2"><div><canvas id="e1"></canvas></div><div><canvas id="e2"></canvas></div></div><div id="fl"></div>`)}${card('Pin-outs and terminations',`<div id="pins"></div>`)}`;
  const draw=()=>{ const r=R(), a=loss(D.len,r.mbps); eye(m.querySelector('#e1'), tauFor(a,r.mbps)*1e9, `At the input BNC: ${a.toFixed(1)} dB loss at ${(r.mbps/2).toFixed(0)} MHz`, a<6);
    eye(m.querySelector('#e2'), canEq()?0.15:tauFor(a-V.eqMax,r.mbps)*1e9, canEq()?'After CLC014 + CLC016 (reclocked)':'After CLC014: loss beyond the EQ range — no lock', canEq());
    m.querySelector('#fl').innerHTML=flowSVG([{t:'INPUT',s:[r.mbps+' Mb/s',D.len+' m']},{t:'CLC014 EQ',s:[a.toFixed(1)+' dB'],bad:!canEq()},{t:'CLC016',s:[locked(1e9)?'locked':'no lock',r.r]},{t:'2 × CLC007',s:['6 outputs','0.8 V p-p']}],-1);
    m.querySelector('#pins').innerHTML=`<table class="kv"><tr><th>Connector</th><th>Function</th></tr><tr><td>INPUT BNC</td><td class="small mono">R2 75R to ground, C1 1 µF, R1 110R → CLC014</td></tr><tr><td>OUTPUT 1–6 BNC</td><td class="small mono">CLC007 → 1 µF → 68R (R17–R22); R28–R34 pull-downs (value not in the netlist)</td></tr><tr><td>Front LEDs</td><td class="small mono">PWR, SIGNAL, SR143, SR270, SR360, ERROR</td></tr></table>`; };
  SIM.on('time',draw); }
const viewNotes=notesView('__pod20Active','What the POD20 archive shows — findings',[
  '<b>There is no 177 Mb/s LED.</b> The CLC016 is set up for four rates (R7–R10), and the manual lists 143, 177, 270 and 360 Mb/s, but the panel and netlist have only SR143, SR270 and SR360. A PAL 4fsc (177 Mb/s) source locks with no rate LED lit.',
  '<b>The manual calls the data rate a “sample rate” and the signal “audio”.</b> “SAMPLE RATE - indicates the 143, 270, 360 Mbps sampling rate signals” and “reliably recover the incoming digital audio signal” (POD20 - #OLD MANUAL.pdf).',
  '<b>“Five LED status tallies” — there are six LEDs.</b> SIGNAL, three rate LEDs and ERROR are five; the netlist adds a PWR LED (R33 300R).',
  '<b>Outputs use 68R, not 75R, build-out.</b> R17–R22 are 68R after 1 µF; the CLC007\'s own output resistance makes up the rest of 75 Ω (inferred). The pull-downs R28–R34 have no value in the netlist ({Value}).',
  '<b>The rate resistors follow f·R ≈ constant.</b> 360 × 2.55 ≈ 918, 270 × 3.48 ≈ 940, 177 × 5.49 ≈ 972, 143 × 6.81 ≈ 974 — so the pairing of resistor to rate is inferred from the CLC016 VCO law.',
  '<b>Duplicate and leftover files.</b> <span class="mono">PCB/</span> and <span class="mono">POD20 - #ISS2 #PCB/</span> are identical; the root and <span class="mono">#ARCHIVE</span> both hold the autorouter files (<span class="mono">best.w, pod20-1.DO, .sts</span>). The ISS1 netlist differs from ISS2 only in net ordering.',
  '<b>The panel artwork exists only as CorelDRAW.</b> <span class="mono">POD20 - #SILK/POD20SLK.cdr</span> (Oct 2000) has no PDF in the 2016 audit and no photo; libcdr places its text badly, so the labels here were re-anchored to the LED and BNC cross-hairs, which convert accurately.'],
 [`Belden 8281 loss ${V.k8281} dB/100 m at 135 MHz ∝ √f; CLC014 range ${V.eqMax} dB (inferred).`,`CLC016 pin roles (lock, rate outputs) and the LED decode logic in U1/U2 (inferred; the parts have no names in the netlist).`,'The eye uses stand-in pseudo-random data and a first-order channel, not real SDI scrambling.','Rocker and PWR LED placed at the usual POD positions (the silk shows neither; inferred).'],
 ['PCB/pod20-1iss2.net · POD20 - #ISS2 #PCB/ · POD20 - #OBSOLETE/pod20-1.net','POD20 - #OLD MANUAL.pdf · ../POD  - #Engineering/pod20.pdf','POD20 - #SILK/POD20SLK.cdr (converted with Inkscape)','POD20 - #MECHANICAL/Podf20frt.dwg · Pod20rer.dwg · ../POD PANELS - #Mechanical #DA #2016/POD - NOT IN ERP/POD20-REAR ISS 1.dwg']);
SIM.register({ id:'pod20', name:'POD20 · serial digital video DA, cable EQ + reclocking, 1 × 6 (2000|33)', duration:1, product:'POD20', year:2000, family:'POD series', folder:'#POD #SERIES/POD20 - #Master',
  summary:'Half-rack SD serial digital video distribution amplifier: CLC014 adaptive cable equalizer, CLC016 multi-rate reclocker (143/177/270/360 Mb/s) and two CLC007 drivers feeding six 75 Ω outputs, with lock and rate tallies. Modelled from the ISS2 netlist (2000) and manual.',
  highlights:['Panels drawn from the converted CorelDRAW silk; clickable BNCs','Cable-length budget per data rate with lock / ERROR','Eye before and after equalization','Video structure (fields, lines, TRS, words, bits) on the timeline','No LED for 177 Mb/s'],
  depth:'Hardware model', stepUnits:[{label:'1 line',period:()=>R().line/R().wps},{label:'1 word',period:()=>1/R().wps},{label:'1 field',period:()=>1/R().field},{label:'1 ms',period:()=>0.001}],
  zooms:[[1,'1 s'],[0.04,'2 fields'],[0.0002,'3 lines'],[0.000002,'2 µs'],[0.0000001,'100 ns (bits)']], defaultZoom:2, init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: installing a POD20',render:viewTutorial},{id:'second',label:'One second, line by line',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}] });

})();
