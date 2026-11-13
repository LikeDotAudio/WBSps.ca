/* =====================================================================
   POD5 — Dual stereo headset amplifier with talkback (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware.

   Sources used (all in this archive, folder #POD #SERIES/POD5 - #Master):
   - POD5 - #Engineering/POD5 - #ISS4 #PCB/POD5-iss4.net          (P-CAD ISS4 netlist: every pin, value and net below)
   - POD5 - #Engineering/POD5 - #MANUAL/POD5MANU.pdf              (manual: talkback to the right ear, mono sum to the left; specs)
   - POD5 - #ARTWORK #DA #2016/POD5-FRONT&REAR-SILK (CURVE).pdf   (panel silkscreen, Jun 20 2014) + Pics/POD5 Front.jpg, Rear.jpg
   - POD5 - #Mechanical #DA #2016/POD5-FRONT/REAR ISS 3 (PANEL).pdf
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

const PREFIX='pod5';
/* channel A = U8 (program receivers), U3 (74HC4053), U4 (ear mixers), ALVL, U1 + Q1–Q6 (headset drivers), HDSTA
   channel B = U9, U5, U6, BLVL, U2 + Q7–Q12, HDSTB. Values from POD5-iss4.net. */
const CH = {
  A:{ recv:'U8', sw:'U3', mix:'U4', pot:'ALVL', drv:'U1', jack:'HDSTA', ctl:'TBA (P2-2)', Rin_prR:20000, Rfb_R:10000, Rtb:10000, trimR:'RV1', Rfix:'R13 6K8', Rtrim:'R12 4K7 + RV1 5K', inL:'P2-11/12', inR:'P2-8/9' },
  B:{ recv:'U9', sw:'U5', mix:'U6', pot:'BLVL', drv:'U2', jack:'HDSTB', ctl:'TBB (P2-3)', Rin_prR:20000, Rfb_R:20000, Rtb:20000, trimR:'RV2', Rfix:'R24 6K8', Rtrim:'R25 4K7 + RV2 5K', inL:'P1-5/6', inR:'P1-2/3' },
};
const V = { Rf:20000, R4k7:4700, R6k8:6800, RV:5000, POT:10000, TB:10000, R67:2000, swingLoss:2.0, Imax:0.2, Rrail:221, Radj:2870 };
const D = {
  power:true, powerAt:-1,
  prog:{ lvl:4, f:1000, rOff:0 }, tb:{ lvl:4, f:400, talk:'speech' },
  lvl:{ A:0.8, B:0.8 }, tbTrim:0.5, rv:{ A:0.5, B:0.5 },
  ctl:{ A:false, B:false },                 // talkback control closed to GND
  plug:{ A:true, B:true }, load:{ A:600, B:60 },
  log:[],
};
const FACT=JSON.parse(JSON.stringify(D));
const dB=g=>20*Math.log10(Math.max(g,1e-12));
const railV = ()=>1.25*(1+V.Radj/V.Rrail);
const railAt = t=>ramp(D.power,D.powerAt,t,railV(),0.004,0.012);
const swing = t=>Math.max(0,railAt(t)-V.swingLoss);
const hc=(v,l)=>clamp(v,-l,l);
/* ALVL/BLVL dual 10K pot (log taper inferred), wiper into the driver's virtual earth through Rs */
const potA = p=>taper.log(p);
function potGain(p, Rs){ const a=potA(p); return a*V.Rf/(Rs + a*(1-a)*V.POT); }
const gR = ch => potGain(D.lvl[ch], V.R6k8);                         // right ear: fixed 6K8 → U1B/U2A, R27/R28 20K feedback
const gL = ch => potGain(D.lvl[ch], V.R4k7 + D.rv[ch]*V.RV);         // left ear: 4K7 + 5K trim (RV1/RV2) → U1A/U2B
/* talkback trim TBLVL: track between U7-1 and R67 2K to ground, wiper → TB_INPUT (pin roles inferred), loaded by R34 ∥ R38 (virtual earths) */
function tbDiv(){ const k=D.tbTrim, Rl=1/(1/10000+1/20000), Rtop=(1-k)*V.TB, Rbot=k*V.TB+V.R67, vth=Rbot/(Rtop+Rbot), rth=Rtop*Rbot/(Rtop+Rbot); return vth*Rl/(Rl+rth); }
/* ear-mixer gains: the 74HC4053 sits at virtual earths (select high = normal, low = talkback) */
function mixG(ch){ const c=CH[ch], tk=D.ctl[ch];
  const fbL = tk ? 1/(1/V.Rf+1/V.Rf) : V.Rf;                    // X switch: R36/R40 20K joins the left mixer's feedback in talkback
  return tk ? { LL:fbL/V.Rf, RL:fbL/c.Rin_prR, RR:0, TR:c.Rfb_R/c.Rtb }   // mono sum to the left; talkback to the right
            : { LL:1, RL:0, RR:c.Rfb_R/c.Rin_prR, TR:0 }; }
const progV=(side,t)=>dbu2v(D.prog.lvl + (side==='R'?D.prog.rOff:0))*Math.SQRT2*Math.sin(2*Math.PI*D.prog.f*t + (side==='R'?0.9:0));
function tbV(t){ let a=dbu2v(D.tb.lvl)*Math.SQRT2; if (D.tb.talk==='speech') a*=Math.max(0,0.55+0.45*Math.sin(2*Math.PI*3.3*t)*Math.sin(2*Math.PI*0.8*t)); return a*Math.sin(2*Math.PI*D.tb.f*t); }
function Rload(ch){ return D.plug[ch]? D.load[ch] : 1e6; }
function outLim(ch,t){ return Math.min(swing(t), V.Imax*Rload(ch)); }   // TIP29C/TIP30C followers; current limit inferred from "+21 dB @ 60 Ω"
function chain(ch,t){
  const g=mixG(ch), L=progV('L',t), R=progV('R',t), T=tbV(t)*tbDiv(), lim=swing(t);
  const mL = hc(-(g.LL*L + g.RL*R), lim), mR = hc(-(g.RR*R + g.TR*T), lim);   // U4B / U4A (left / right ear mixers)
  const ol = outLim(ch,t);
  const tip = hc(-gL(ch)*mL, ol), ring = hc(-gR(ch)*mR, ol);                   // U1A → tip (left), U1B → ring (right)
  return { L, R, T, mL, mR, tip, ring };
}
/* steady-state levels (dBu) */
function levels(ch){
  const g=mixG(ch), lim=v2dbu(railV()-V.swingLoss)-3.01, olim=v2dbu(Math.min(railV()-V.swingLoss,V.Imax*Rload(ch))/Math.SQRT2);
  const p=D.prog.lvl, pr=p+D.prog.rOff, sum=(a,b)=>20*Math.log10(Math.hypot(Math.pow(10,a/20),Math.pow(10,b/20)));
  const mL = D.ctl[ch]? sum(p+dB(g.LL), pr+dB(g.RL)) : p+dB(g.LL);
  const mR = D.ctl[ch]? D.tb.lvl+dB(tbDiv())+dB(g.TR) : pr+dB(g.RR);
  const tip=mL+dB(gL(ch)), ring=mR+dB(gR(ch)), on=D.power;
  const x=v=>on?v:-200;
  return { tip:x(tip), ring:x(ring), clip: on && (tip>olim+0.01||ring>olim+0.01||mL>lim||mR>lim), stages:[
    {name:`Program in L / R (${CH[ch].inL} / ${CH[ch].inR})`, lvl:x(p), gain:null, clip:null, note:`balanced, ${CH[ch].recv} unity receivers (20K/20K), > 20 kΩ`},
    {name:`${CH[ch].mix}B left-ear mixer`, lvl:x(mL), gain:D.ctl[ch]?dB(g.LL):0, clip:lim, note:D.ctl[ch]?'TALKBACK: mono sum L+R at ½ each':'normal: L only, ×1'},
    {name:`${CH[ch].mix}A right-ear mixer`, lvl:x(mR), gain:D.ctl[ch]?dB(g.TR)+dB(tbDiv()):dB(g.RR), clip:lim, note:D.ctl[ch]?'TALKBACK: TB IN through TBLVL':`normal: R only, ×${g.RR.toFixed(2)}`},
    {name:`${CH[ch].pot} → ${CH[ch].drv}A + TIP29C/30C → tip (L)`, lvl:x(tip), gain:dB(gL(ch)), clip:olim, note:`${CH[ch].Rtrim}; into ${Rload(ch)>=1e5?'open':Rload(ch)+' Ω'}`},
    {name:`${CH[ch].pot} → ${CH[ch].drv}B + TIP29C/30C → ring (R)`, lvl:x(ring), gain:dB(gR(ch)), clip:olim, note:CH[ch].Rfix}] };
}
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`A: L ${fdb(levels('A').tip)} / R ${fdb(levels('A').ring)} · B: L ${fdb(levels('B').tip)} / R ${fdb(levels('B').ring)} dBu`);
const A={
  power(){ act(D.power?'Power off (rocker)':'Power on (rocker)', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t;
    tr('PWRSW → T1 (110/220 links R110/R111/R220) → D1–D4 → C1/C2 470 µF'); tr(`REG3 LM317 (R102 221R / R103 2K87) → +V ${railV().toFixed(1)} V · REG2 LM337 → −V · REG1 7805 → +5V for the two 74HC4053s; R1 4K7 → PWR LED`); }
    else tr('Rails collapse; both headsets go silent'); }); },
  lvl(ch,dir){ act(`Turn HEADSET ${ch} level ${dir>0?'up':'down'}`, tr=>{ const o=D.lvl[ch]; D.lvl[ch]=clamp(+(o+dir*0.04).toFixed(3),0,1);
    tr(`${CH[ch].pot} (dual 10K): both sections move together, ${Math.round(o*100)} → ${Math.round(D.lvl[ch]*100)} % rotation (log taper ${inf})`);
    tr(`Left section wiper → ${CH[ch].Rtrim} → ${CH[ch].drv}A: ${fdb(dB(gL(ch)))} dB · right section → ${CH[ch].Rfix} → ${CH[ch].drv}B: ${fdb(dB(gR(ch)))} dB (feedback R26–R29 20K taken after the emitter resistors)`); }); },
  tbTrim(dir){ act(`Turn TKBK LEVEL ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{ D.tbTrim=clamp(+(D.tbTrim+dir*0.05).toFixed(3),0,1);
    tr(`TBLVL 10K: U7A talkback receiver → track → R67 2K → GND; wiper → TB_INPUT → R34 10K (A) and R38 20K (B): ${fdb(dB(tbDiv()))} dB`); }); },
  ctl(ch){ act(`${D.ctl[ch]?'Release':'Press'} TKBK-${ch} CTL (closure to GND)`, tr=>{ D.ctl[ch]=!D.ctl[ch]; const c=CH[ch];
    tr(`${c.ctl} → R${ch==='A'?32:30} 10K → ${c.sw} select A/B/C (pins 9–11 tied); R${ch==='A'?33:31} 20K pulls it to +5V when open`);
    if (D.ctl[ch]){ tr(`Select low: Y switch moves the R program (via R${ch==='A'?48:56} 20K) from the right-ear mixer to the left-ear mixer → left = −½(L+R) mono`);
      tr(`X switch connects R${ch==='A'?36:40} 20K across the left mixer's feedback (now 10K), so L and R add at half level each`);
      tr(`Z switch lets TB_INPUT (R${ch==='A'?34:38}) into the right-ear mixer (${ch==='A'?'U4A':'U6A'}) → talkback in the right ear`); }
    else tr('Select high: stereo program again; TB_INPUT is shorted to ground at Z1 (pin 3)');
    tr(`${c.sw} works at virtual earths, so a 5 V CMOS switch handles a ±17 V program path`); }); },
  rv(ch,dir){ act(`Turn ${CH[ch].trimR} (left-ear trim, inside) ${dir>0?'up':'down'}`, tr=>{ D.rv[ch]=clamp(+(D.rv[ch]+dir*0.1).toFixed(2),0,1); tr(`${CH[ch].Rtrim}: series resistance ${Math.round(V.R4k7+D.rv[ch]*V.RV)} Ω → left-ear stage ${fdb(dB(gL(ch)))} dB (PCB trim, not on the panel ${inf})`); }); },
  plug(ch){ act(`${D.plug[ch]?'Unplug':'Plug in'} HEADSET ${ch}`, tr=>{ D.plug[ch]=!D.plug[ch]; tr(D.plug[ch]?`${CH[ch].jack} ¼" TRS: tip (pin 8) = left, ring (pin 6) = right, sleeve = GNDD`:'Jack open: the followers drive no load'); }); },
  set(k,v,l){ act(l, tr=>{ const [a,b]=k.split('.'); D[a][b]=v; tr('The source changed; every stage follows'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
/* ---------------- panels (POD5-FRONT&REAR-SILK (CURVE).pdf) ---------------- */
function knob(x,y,frac,cls,title){ const a=(-135+270*frac)*Math.PI/180;
  return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="46" fill="transparent"/><circle cx="${x}" cy="${y}" r="38" fill="#1b1c1e" stroke="#3a3d40" stroke-width="3"/><circle cx="${x}" cy="${y}" r="29" fill="#2a8a48"/>
    <line x1="${x}" y1="${y}" x2="${x+Math.sin(a)*29}" y2="${y-Math.cos(a)*29}" stroke="#f0f0ec" stroke-width="5" stroke-linecap="round"/></g>`; }
function trs(x,y,plugged,cls,title){ return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="40" fill="#0c0d0e" stroke="#555" stroke-width="3"/><circle cx="${x}" cy="${y}" r="26" fill="#1d1f21" stroke="#777" stroke-width="2"/><circle cx="${x}" cy="${y}" r="11" fill="#050505"/>
  ${plugged?`<circle cx="${x}" cy="${y}" r="24" fill="#2b5f9e" opacity=".92"/><circle cx="${x}" cy="${y}" r="9" fill="#c8c8c8"/>`:''}</g>`; }
function frontSVG(t){ const on=D.power&&railAt(t)>5;
  const over = rocker(D.power)+pled(on)
    + trs(800,160,D.plug.A,'pl-A','HEADSET A ¼" TRS — click to plug/unplug') + knob(1000,210,D.lvl.A,'lv-A','HEADSET A level (ALVL dual 10K) — click halves or wheel')
    + trim(1176,203,D.tbTrim,'tbk','TKBK LEVEL (TBLVL 10K)')
    + trs(1350,160,D.plug.B,'pl-B','HEADSET B ¼" TRS — click to plug/unplug') + knob(1550,210,D.lvl.B,'lv-B','HEADSET B level (BLVL dual 10K)');
  return panelSVG(PREFIX,'front',{over},'POD5 front panel (real silkscreen)'); }
const PX=i=>468+i*28.3;
function rearSVG(){ let over=`<rect x="${PX(0)-16}" y="96" width="${PX(17)-PX(0)+32}" height="58" rx="4" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>`;
  for (let i=0;i<18;i++){ const c=i===15?'B':i===16?'A':null, closed=c&&D.ctl[c];
    over+=`<g class="${c?'ct-'+c:''}" style="${c?'cursor:pointer':''}">${c?`<title>TKBK-${c} CTL — click to close/open to GND (talkback)</title>`:''}<rect x="${PX(i)-10}" y="108" width="20" height="34" fill="${closed?'#2b5f9e':'#0e4d25'}"/><circle cx="${PX(i)}" cy="121" r="6" fill="#9aa"/></g>`; }
  if (D.ctl.A||D.ctl.B) over+=`<path d="M${PX(17)} 150 v10 H${PX(D.ctl.B?15:16)} v-10" stroke="#2b5f9e" stroke-width="5" fill="none"/>`;
  over+=iec(1385,28,1611,252);
  return panelSVG(PREFIX,'rear',{over},'POD5 rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power();
  ['A','B'].forEach(ch=>{ bindTrim(root,'lv-'+ch,d=>A.lvl(ch,d)); root.querySelectorAll('.pl-'+ch).forEach(g=>g.onclick=()=>A.plug(ch)); root.querySelectorAll('.ct-'+ch).forEach(g=>g.onclick=()=>A.ctl(ch)); });
  bindTrim(root,'tbk',d=>A.tbTrim(d)); }
function controlsHTML(){ const ld=ch=>`<label>Headset ${ch} <select id="ld${ch}">${[[600,'600 Ω'],[300,'300 Ω'],[60,'60 Ω'],[32,'32 Ω']].map(([v,l])=>`<option value="${v}" ${v===D.load[ch]?'selected':''}>${l}</option>`).join('')}</select></label>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px">
  <label>Program <input id="pl" type="number" step="1" value="${D.prog.lvl}" style="width:52px"> dBu</label><label>R offset <input id="po" type="number" step="1" value="${D.prog.rOff}" style="width:46px"> dB</label>
  <label>Talkback <input id="tbl" type="number" step="1" value="${D.tb.lvl}" style="width:52px"> dBu <select id="tt"><option value="speech" ${D.tb.talk==='speech'?'selected':''}>speech-like</option><option value="tone" ${D.tb.talk==='tone'?'selected':''}>400 Hz tone</option></select></label>
  ${ld('A')}${ld('B')}<label>RV1 (A left trim) <input id="rv" type="range" min="0" max="1" step="0.05" value="${D.rv.A}"></label></div>
  <div class="small muted" style="margin-top:4px">Click a knob's right half to turn up, left half down (or wheel). Click the jacks to plug a headset, and the rear TKBK-A/B CTL terminals to talk. Keys: Q/W level A, E/R level B, T/Y TKBK LEVEL, 1 = talk A, 2 = talk B.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if(!g('#pl')) return;
  g('#pl').onchange=e=>A.set('prog.lvl',+e.target.value,'Program → '+e.target.value+' dBu'); g('#po').onchange=e=>A.set('prog.rOff',+e.target.value,'R offset → '+e.target.value+' dB');
  g('#tbl').onchange=e=>A.set('tb.lvl',+e.target.value,'Talkback source → '+e.target.value+' dBu'); g('#tt').onchange=e=>A.set('tb.talk',e.target.value,'Talkback source → '+e.target.value);
  ['A','B'].forEach(ch=>g('#ld'+ch).onchange=e=>A.set('load.'+ch,+e.target.value,`Headset ${ch} → ${e.target.value} Ω`));
  g('#rv').onchange=e=>{ D.rv.A=+e.target.value-0.1; A.rv('A',1); }; }
bindKeys('__pod5Active',()=>({q:()=>A.lvl('A',-1),w:()=>A.lvl('A',1),e:()=>A.lvl('B',-1),r:()=>A.lvl('B',1),t:()=>A.tbTrim(-1),y:()=>A.tbTrim(1),'1':()=>A.ctl('A'),'2':()=>A.ctl('B')}));
/* ---------------- timeline ---------------- */
const fmax=()=>Math.max(D.prog.f,D.tb.f);
const dense=(span,pw)=>span*fmax()>pw/3;
const envOf=fn=>{ const e=t=>{ let m=0; const P=1/Math.min(D.prog.f,D.tb.f); for(let i=0;i<12;i++) m=Math.max(m,Math.abs(fn(t+P*i/12))); return m; }; e.dense=dense; return e; };
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), r=SIM.css('--bad'), wn=SIM.css('--warn');
  return [ waveLane('+V (LM317)', t=>railAt(t), 20, null, wn, 24),
    waveLane('Program L in (A)', t=>progV('L',t), -0.05, null, b, 32, envOf(t=>progV('L',t))),
    waveLane('Talkback in (U7A)', t=>tbV(t), -0.05, null, b, 32, envOf(t=>tbV(t))),
    boolLane('TKBK-A CTL closed', t=>D.ctl.A, '#e8b23a'),
    waveLane('U4B left mixer (A)', t=>chain('A',t).mL, -0.05, swing(1), a, 32, envOf(t=>chain('A',t).mL)),
    waveLane('U4A right mixer (A)', t=>chain('A',t).mR, -0.05, swing(1), a, 32, envOf(t=>chain('A',t).mR)),
    waveLane('HEADSET A tip (L)', t=>chain('A',t).tip, -0.05, outLim('A',1), r, 38, envOf(t=>chain('A',t).tip)),
    waveLane('HEADSET A ring (R)', t=>chain('A',t).ring, -0.05, outLim('A',1), r, 38, envOf(t=>chain('A',t).ring)),
    waveLane('HEADSET B tip (L)', t=>chain('B',t).tip, -0.05, outLim('B',1), a, 32, envOf(t=>chain('B',t).tip)),
    waveLane('HEADSET B ring (R)', t=>chain('B',t).ring, -0.05, outLim('B',1), a, 32, envOf(t=>chain('B',t).ring)) ]; }
/* ---------------- views ---------------- */
function nowHTML(t){ const row=(n,l)=>`<tr><th>${n}</th><td class="mono">L ${fdb(l.tip)} · R ${fdb(l.ring)} dBu ${l.clip?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>`;
  return `<table class="kv">${row('HEADSET A'+(D.ctl.A?' (TALKBACK)':''),levels('A'))}${row('HEADSET B'+(D.ctl.B?' (TALKBACK)':''),levels('B'))}<tr><th>Rails</th><td class="mono">±${railAt(t).toFixed(1)} V</td></tr><tr><th>TKBK LEVEL</th><td class="mono">${fdb(dB(tbDiv()))} dB at the trim</td></tr></table>`; }
function levelsHTML(){ return ['A','B'].map((ch,i)=>{ const body=`<h3>HEADSET ${ch}</h3>${stageTable(levels(ch).stages)}`; return i?`<details><summary class="small">HEADSET B</summary>${body}</details>`:body; }).join('')+`<p class="small muted">Clip: ±${railV().toFixed(1)} V less ${V.swingLoss} V (${inf}); current limit ${V.Imax} A peak (${inf}, set so 60 Ω clips near the manual's +21 dB).</p>`; }
const viewSim=simView({flag:'__pod5Active',D,front:frontSVG,rear:rearSVG,bind:bindPanel,controls:controlsHTML,bindControls,now:nowHTML,levels:levelsHTML,lanes,labelW:200,
  rearTitle:'Rear panel — click TKBK-A / TKBK-B CTL to talk', hint:'Turn a HEADSET knob, close a talkback control or plug a headset.'});
const LESSONS=[
  {title:'Meet the POD5', body:`<p>POD5 is a <b>dual stereo headset amplifier</b>. Two stereo programs (A and B) arrive on rear screw terminals and drive the two front ¼" headset jacks. A talkback source (TKBK IN) can interrupt each headset: when TKBK-A or TKBK-B CTL is grounded, the talkback goes to the <b>right ear</b> and a <b>mono sum</b> of the program to the left.</p>`, check:()=>true, auto:true},
  {title:'1 · Power and plug in', body:'<p>Power the unit and make sure both headsets are plugged in.</p>', check:()=>D.power&&D.plug.A&&D.plug.B, hint:'Rocker; click a jack if it has no blue plug.'},
  {title:'2 · Set a listening level', body:`<p>With +4 dBu program, set HEADSET B's left ear to about <b>+10 dBu</b> (±1.5 dB) — loud in a 60 Ω headset.</p>`, check:()=>Math.abs(levels('B').tip-10)<=1.5&&D.prog.lvl===4, hint:'E/R keys or click the HEADSET B knob halves.'},
  {title:'3 · Talk to A', body:'<p>Close <b>TKBK-A CTL</b> to GND on the rear. Watch the A ring (right ear) switch to the talkback and the tip carry the mono sum.</p>', check:()=>D.ctl.A, hint:'Click the TKBK-A CTL terminal (17th position).'},
  {title:'4 · Talkback level', body:'<p>Use the screwdriver <b>TKBK LEVEL</b> so the talkback in A\'s right ear is within 3 dB of the program in its left ear.</p>', check:()=>D.ctl.A&&Math.abs(levels('A').ring-levels('A').tip)<=3, hint:'T/Y keys.'},
  {title:'5 · Compare A and B', body:'<p>Release TKBK-A and set both HEADSET knobs to the same position. Compare A\'s right ear with B\'s: channel A\'s right-ear mixer uses a 10K feedback resistor where B uses 20K, so A\'s right ear is 6 dB quieter (see Findings).</p>', check:()=>!D.ctl.A&&Math.abs(D.lvl.A-D.lvl.B)<0.01, hint:'Release the A control; match the two knobs.'},
  {title:'Done', body:'<p>Signal path shows each stage; Findings lists what the netlist reveals.</p>', check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod5Active=true; tutorialView(m,{title:'Tutorial — using a POD5',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div style="margin-top:6px">${nowHTML(SIM.t)}</div>`, bind:r=>{bindPanel(r);bindControls(r);}}); }
const viewSecond=secondView({flag:'__pod5Active',front:frontSVG,bind:bindPanel,freq:()=>Math.min(D.prog.f,D.tb.f),ladderLabel:'HEADSET A ring (right ear)',ladderFn:t=>chain('A',t).ring,
  ladder:()=>[['1 second',1],['300 ms (speech syllable)',0.3],['10 ms',0.01],['1 program cycle',1/D.prog.f],['50 µs',5e-5]],
  outs:()=>[['A tip (L)',t=>chain('A',t).tip],['A ring (R)',t=>chain('A',t).ring],['B tip (L)',t=>chain('B',t).tip],['B ring (R)',t=>chain('B',t).ring]],
  rows:()=>[['Program cycles',D.prog.f.toLocaleString(),SIM.fmtDur(1/D.prog.f),'continuous analog path'],['Talkback tone / syllables',D.tb.f+' / ≈ 6.6','—','speech-like envelope at 3.3 Hz × 0.8 Hz in this model ('+inf+')'],
    ['Mute/talk switching','—','≈ 0.1 µs','74HC4053 switches at virtual earths: no click from DC, only the program step'],['Rectifier pulses','120',SIM.fmtDur(1/120),'D1–D4 into C1/C2 470 µF, then LM317/LM337'],
    ['Input coupling (C21/C24 33 µ · 20K)','—',SIM.fmtDur(33e-6*20000),`−3 dB at ${(1/(2*Math.PI*33e-6*20000)).toFixed(2)} Hz`],['Driver bias (Q1 Vbe multiplier, R5 3K6 / R6 6K8)','—','—',`≈ ${(0.65*(1+3600/6800)).toFixed(2)} V across the TIP29C/30C bases: class AB`]],
  dev:t=>{ const a=chain('A',t); return `<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>Inputs</th><td class="mono">L ${a.L.toFixed(3)} · R ${a.R.toFixed(3)} · TB ${a.T.toFixed(3)} V</td></tr>
    <tr><th>A mixers</th><td class="mono">left ${a.mL.toFixed(3)} V · right ${a.mR.toFixed(3)} V</td></tr><tr><th>A outputs</th><td class="mono">tip ${a.tip.toFixed(3)} V · ring ${a.ring.toFixed(3)} V</td></tr><tr><th>Talkback A / B</th><td class="mono">${D.ctl.A?'ON':'off'} / ${D.ctl.B?'ON':'off'}</td></tr></table>`; }});
const BLOCKS={
  rx:{x:20,y:40,w:160,h:80,t:'Program receivers',s:['U8 (A), U9 (B) NE5532','20K/20K unity diff'],d:'Rear P1/P2 terminals: L and R program for each headset, + − G.'},
  tb:{x:20,y:170,w:160,h:80,t:'Talkback receiver',s:['U7A NE5532 unity diff','TBLVL 10K + R67 2K'],d:'TKBK IN (P2-5/6). U7B is unused (follower to ground). The trim feeds TB_INPUT to both channels.'},
  sw:{x:220,y:110,w:170,h:90,t:'74HC4053 U3 / U5',s:['at the mixers\' virtual earths','select ← TKBK-x CTL'],d:'Y moves R program between right and left mixers; X halves the left feedback; Z admits the talkback. Selects pulled up by 20K, grounded to talk.'},
  mix:{x:430,y:110,w:170,h:90,t:'Ear mixers U4 / U6',s:['B half: left ear','A half: right ear','A: R35 10K, B: R39 20K'],d:'Inverting mixers with 20K inputs. Channel A\'s right mixer has 10K feedback (−6 dB) where B has 20K.'},
  pot:{x:640,y:40,w:160,h:80,t:'ALVL / BLVL',s:['dual 10K, front knobs','left: 4K7 + RV 5K trim'],d:'Both ears move together. The 5K RV trims set the left/right balance on the board.'},
  drv:{x:640,y:170,w:160,h:90,t:'Headset drivers',s:['U1/U2 NE5532 + TIP29C/30C','Vbe-multiplier bias','2 × 30R emitter R'],d:'Feedback R26–R29 20K is taken at the jack, after the 30R emitter resistors, so the output impedance is low.'},
  ps:{x:220,y:240,w:170,h:70,t:'Power',s:['LM317/LM337 ±17.5 V','7805 +5V for CMOS'],d:'R102/R100 221R with R103/R101 2K87.'},
};
const WIRES=[['rx','sw','L/R'],['tb','sw','TB_INPUT'],['sw','mix',''],['mix','pot',''],['pot','drv',''],['ps','drv','±V']];
function viewBlock(m){ window.__pod5Active=false; blockView(m,BLOCKS,WIRES,'sw',[820,330],card('In one sentence',`<p>Balanced program and talkback receivers feed two inverting ear mixers per headset; CMOS switches at the mixers' virtual earths re-route the right program and admit the talkback when a control input is grounded, and a dual pot feeds discrete class-AB headphone drivers.</p>`)); }
const SHEETS=[
  {name:'1 · Talkback switch (channel A)', note:'From POD5-iss4.net. 74HC4053 U3: 9/10/11 tied (NET00020) → R32 10K → TBA; 6/7/8 GND; 16 +5V.', svg:()=>
    chip(320,90,150,'U3 74HC4053',[['Y (15)','← C21 ← R48 ← U8B (R)'],['X (14)','← R36 ← U4-7'],['Z (4)','← C13 ← R34 ← TB_INPUT'],['A,B,C (9–11)','← R32 ← TBA']],[['Y1 (1)','U4A sum (right)'],['Y0 (2)','U4B sum (left)'],['X0 (12)','U4B sum'],['X1 (13)','GND'],['Z0 (5)','U4A sum'],['Z1 (3)','GND']],'select high (open) = normal')
    +txt(40,330,'Normal (TBA open, pulled up by R33 20K): Y→Y1, X→X1, Z→Z1 — R program to the right mixer, talkback grounded.',11)
    +txt(40,350,'Talk (TBA grounded): Y→Y0 puts R into the left mixer; X0 parallels R36 with R37 (20K∥20K = 10K); Z0 admits the talkback to the right mixer.',11)
    +txt(40,370,'Every switched node is a virtual earth or a capacitor-coupled resistor end, so the switch never sees the audio voltage.',11)},
  {name:'2 · Ear mixers + driver (A)', note:'U4B: R55 20K in (L via C24), R37 20K feedback. U4A: R48 20K in (R via Y switch), R35 10K feedback, R34 10K talkback. Channel B uses R39 20K and R38 20K.', svg:()=>
    opamp(120,120,'U4A (right)')+res(40,90,110,90,'R48','20K')+res(40,150,110,150,'R34','10K')+res(130,60,190,60,'R35','10K')+wire([[180,120],[230,120]])+net(235,120,'ALVL-1')
    +opamp(120,280,'U4B (left)')+res(40,250,110,250,'R55','20K')+res(130,220,190,220,'R37','20K')+wire([[180,280],[230,280]])+net(235,280,'ALVL-4')
    +opamp(480,140,'U1B → Q4–Q6')+res(400,128,470,128,'R13','6K8')+net(330,128,'ALVL-2')+res(480,80,560,80,'R27','20K')+wire([[540,140],[600,140]])+res(600,140,600,200,'R7/R8','30R')+net(610,140,'HDSTA-6 ring (R)')
    +opamp(480,320,'U1A → Q1–Q3')+res(380,308,470,308,'R12+RV1','4K7+5K')+net(320,308,'ALVL-5')+res(480,260,560,260,'R26','20K')+wire([[540,320],[600,320]])+net(610,320,'HDSTA-8 tip (L)')
    +txt(40,420,`Right ear: ×${(V.Rf/V.R6k8).toFixed(2)} at full; left ear: ×${(V.Rf/(V.R4k7+V.RV)).toFixed(2)} … ×${(V.Rf/V.R4k7).toFixed(2)} with RV1.`,11)},
];
function viewSchem(m){ window.__pod5Active=false; schemView(m,SHEETS,'POD5','The P-CAD originals are POD5-iss4.sch/.net (ISS4). These sheets keep the netlist designators and values, laid out more simply. Blue labels are nets.'); }
const viewSoft=softView({flag:'__pod5Active',D,intro:'POD5 has no processor. Click a stage for its maths.',
  flows:[{title:'Channel A, left ear',stages:()=>{ const l=levels('A'); return [{t:'Program L',s:[fdb(l.stages[0].lvl)+' dBu']},{t:'U4B mixer',s:[D.ctl.A?'mono ½(L+R)':'L ×1',fdb(l.stages[1].lvl)+' dBu']},{t:'ALVL + RV1',s:[fdb(dB(gL('A')))+' dB']},{t:'U1A + TIP29C/30C',s:['tip '+fdb(l.tip)+' dBu'],bad:l.clip}]; },
    det:[()=>`<b>Receiver.</b> U8A: R54/R47 20K, R53/R52 20K → unity differential.`,()=>`<b>U4B.</b> −R37/R55 = −1; in talkback R36 parallels R37 and R48 joins → −½(L+R).`,()=>`<b>Pot.</b> a = ${potA(D.lvl.A).toFixed(3)} (log taper ${inf}); source a(1−a)·10K in series with 4K7 + RV1 (${Math.round(D.rv.A*5000)} Ω).`,()=>`<b>Driver.</b> NE5532 + complementary TIP29C/TIP30C, 30R emitter resistors inside the 20K feedback loop.`]},
   {title:'Channel A, right ear',stages:()=>{ const l=levels('A'); return [{t:D.ctl.A?'Talkback':'Program R',s:[fdb(D.ctl.A?D.tb.lvl:D.prog.lvl)+' dBu']},{t:'U4A mixer',s:[D.ctl.A?'TB ×1':'R ×0.5 (R35 10K)',fdb(l.stages[2].lvl)+' dBu']},{t:'ALVL',s:[fdb(dB(gR('A')))+' dB']},{t:'U1B + TIP29C/30C',s:['ring '+fdb(l.ring)+' dBu'],bad:l.clip}]; },
    det:[()=>`<b>Source.</b> ${D.ctl.A?'TB_INPUT through TBLVL: '+fdb(dB(tbDiv()))+' dB':'R program through the Y switch (Y1)'}.`,()=>`<b>U4A.</b> R35 10K feedback: program ×0.5 (R48 20K), talkback ×1 (R34 10K).`,()=>`<b>Pot.</b> right section into R13 6K8.`,()=>`<b>Driver.</b> ×${(V.Rf/V.R6k8).toFixed(2)} at full rotation.`]}],
  chartTitle:'HEADSET knob → ear gain (A left / A right / B right)', chart:cv=>curveChart(cv,[
    {fn:p=>dB(potGain(p,V.R4k7+D.rv.A*V.RV)), col:SIM.css('--accent'), label:'A left', cur:D.lvl.A},
    {fn:p=>dB(0.5*potGain(p,V.R6k8)), col:SIM.css('--bad'), label:'A right (incl. ×0.5)', cur:D.lvl.A},
    {fn:p=>dB(potGain(p,V.R6k8)), col:SIM.css('--accent2'), label:'B right', cur:D.lvl.B}],-40,15,' dB','off','full'),
  buttons:[['HEADSET A/B knob','ALVL/BLVL dual 10K → U1/U2 drivers','Both ears together'],['TKBK-A/B CTL to GND','R32/R30 → 74HC4053 select','Talkback right, mono left'],['TKBK LEVEL trim','TBLVL wiper → TB_INPUT → R34/R38','Talkback level in both channels'],['Plug headset','HDSTx: tip pin 8, ring pin 6','Load on the drivers']],
  pins:[['Rear block (18 × 3.5 mm)','1–6','HEADSET B L (+ − G), R (+ − G)'],['','7–12','HEADSET A L, R'],['','13–15','TKBK IN + − G (U7A)'],['','16 / 17 / 18','TKBK-B CTL / TKBK-A CTL / GND'],['HEADSET jacks (¼" TRS)','tip / ring / sleeve','left (U1A/U2B) / right (U1B/U2A) / GNDD']]});
const viewNotes=notesView('__pod5Active','What the POD5 archive shows — findings',[
  `<b>Channel A's right ear is 6 dB quieter than channel B's.</b> In POD5-iss4.net the right-ear mixer of A (U4A) has feedback R35 = 10K, while B's (U6A) has R39 = 20K. Both take the R program through a 20K resistor (R48, R56), so A gives ×0.5 and B gives ×1. The talkback inputs were sized to match (R34 10K for A, R38 20K for B), so talkback is unity in both — which suggests R35 was chosen for the talkback and the program path was missed. The 5K trim RV1 only adjusts the left ear and cannot correct it.`,
  `<b>The manual's talkback range (−6 … +6 dB) does not fit the circuit.</b> TBLVL is a 10K trim with R67 2K to ground, so it can only attenuate (≈ −17 … 0 dB at the mixer); the +6 dB comes from the headset driver after the HEADSET knob. Pin roles of TBLVL are ${inf}.`,
  `<b>Talkback switching happens at virtual earths.</b> The 74HC4053s run from +5 V with VEE at ground, yet switch a ±17 V path: every switched node is an op-amp summing node or the far end of a capacitor-coupled input resistor.`,
  `<b>Headset drivers are discrete class AB.</b> Each ear has an NE5532 driving TIP29C/TIP30C followers biased by a 2N3904 Vbe multiplier (R5 3K6 / R6 6K8), with 30R emitter resistors inside the feedback loop. That is why the manual quotes +21 dB into 60 Ω.`,
  `<b>Two ¼" jacks, one control per headset, but one talkback source.</b> TB_INPUT feeds both channels; TKBK-A and TKBK-B choose who hears it. U7B is wired as a grounded follower (unused).`,
  `<b>Mono sum keeps level.</b> In talkback the X switch puts R36 (R40) in parallel with the left mixer's feedback, so L and R each go in at ½ and a centred (mono) program stays at the same level.`,
],[`Pots: log taper, 10 % at mid travel (${inf}). TBLVL pin roles (${inf}).`,`Driver clip at the rails less 2 V and a 0.2 A peak current limit (${inf}, chosen to match the manual's 60 Ω figure).`,`Rear terminal order follows the silk; which P1/P2 pair is L or R is ${inf} from the talkback behaviour in the manual.`],
  ['POD5 - #Engineering/POD5 - #ISS4 #PCB/POD5-iss4.net · POD5-iss4.sch','POD5 - #Engineering/POD5 - #MANUAL/POD5MANU.pdf','POD5 - #ARTWORK #DA #2016/POD5-FRONT&amp;REAR-SILK (CURVE).pdf · Pics/POD5 Front.jpg, Rear.jpg','POD5 - #Mechanical #DA #2016/POD5-FRONT ISS 3 (PANEL).pdf · POD5-REAR ISS 3 (PANEL).pdf']);
SIM.register({
  id:'pod5', name:'POD5 · dual stereo headset amplifier with talkback (2014|47)', duration:1, product:'POD5', year:2014, family:'POD series', folder:'#POD #SERIES/POD5 - #Master',
  summary:'Half-rack dual stereo headset amplifier. Grounding a rear control puts the talkback input in the right ear and a mono sum of the program in the left. Modelled from the ISS4 netlist: CMOS switches at virtual earths, dual-pot level, discrete class-AB headset drivers. The year is the panel silk date.',
  highlights:['Real silkscreen panels with working knobs, jacks and talkback controls','Talkback routing through 74HC4053 switches at virtual earths','Discrete TIP29C/TIP30C headset drivers with load-dependent clipping','Channel A right-ear gain 6 dB low (R35 10K vs R39 20K)'],
  depth:'Hardware model',
  stepUnits:[{label:'1 program cycle',period:()=>1/D.prog.f},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.3,'300 ms (speech)'],[0.01,'10 ms'],[0.005,'5 ms'],[0.0005,'500 µs']], defaultZoom:3, init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: using a POD5',render:viewTutorial},{id:'second',label:'One second, cycle by cycle',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
