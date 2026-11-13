/* =====================================================================
   POD22A — Stereo loudness meter, AES or analog input (VU / PPM bars, phase, rate tallies) (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model with the POD22 control firmware traced.

   The POD22A folder holds only panels and photos. The related code and records are elsewhere in the archive:
   - #POD #SERIES/POD22A - #Master/POD22A - #ARTWORK #DA #2016/POD22A-FRONT&REAR-SILK (CURVE).pdf (Jun 27 2014) + Pics/POD22A Front.jpg, Rear.jpg
   - #POD #SERIES/POD23 - #Engineering/POD23 - #Software/POD23 - #SOFTWARE #working/POD23Com/POD22/pod22v2.asm, init.asm, uart.asm, modes.asm
       (POD22 v1.02 PIC16F874 controller, 17 Mar 2003: CS8420 lock, DIP switches, 75/110 Ω autodetect, POD23 serial control, SHARC link)
   - #POD #SERIES/POD23 - #Engineering/POD23 PROTOCOL.wpd (frame ff · address · command · data · aa; POD22 product ID 1000 0001)
   - #POD #SERIES/POD21 - #Master/POD21 - #TESTREPORT/POD22-V103-13JUN11.pdf (misfiled POD22 test: MC v103 / DSP v103, SLM1-4 display board)
   - #POD #SERIES/POD3A - #Master/POD3A - #Engineering/sharc/working v101/ (SLM-1 meter constants, as used by the POD11A plugin)
   That POD22A runs the POD22 code is inferred (same front legend family, same DIP names); marked so on screen.
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

const PREFIX='pod22a';
const TC = { VU:0.0003541811, PPM_A:0.02103034, PPM_D:0.00007084630, PK_D1:0.0000767499, PK_D2:0.0000383757 };   // SLM-1 constants (vumeter.asm / slm-1-main.asm)
const T40 = tc => -4/(48000*Math.log10(1-tc));
const SEG = [...Array(17)].map((_,i)=>-52+2*i).concat([...Array(19)].map((_,i)=>-19+i)).concat([0]).concat([...Array(20)].map((_,i)=>i+1));
const SEGX = i => 506 + i*(1349-506)/56;
const CALT = { '11':-20, '01':-18, '10':-16, '00':-14 };      // CAL1, CAL0 (1 = ON): POD11A rear legend, inferred for POD22A
const DIPS = ['BRIGHT','A/D','BS0','BS1','CAL0','CAL1','A0','A1'];   // dip1…dip8 in read_jumpers (pod22v2.asm); BRIGHT is on the photo, not the silk
const PASS = 0.001;            // one MAIN loop pass ≈ 1 ms (inferred: oscillator not archived)
const ADC0 = 24;               // analog: 0 dBFS = +24 dBu (inferred)
const D = { dip:{BRIGHT:1,'A/D':1,BS0:1,BS1:0,CAL0:1,CAL1:1,A0:0,A1:0},     // 'A/D' ON = digital (see read_jumpers)
  in:{bnc:true, phx:false, ana:true}, fs:48000, unplugAt:-1, prog:{type:'bursts', f:1000, dbfs:-12, dbu:4, phase:0},
  remote:{on:false, lvl:{S:0,L:0,R:0}, lastAt:-1, addr:0}, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const digital = ()=> !!D.dip['A/D'];
const calRef = ()=> CALT[''+D.dip.CAL1+D.dip.CAL0];
const peakHold = ()=> !!D.dip.BS1, ppmType = ()=> D.dip.BS0?2:1;
const addr = ()=> (D.dip.A0?2:0)+(D.dip.A1?1:0);     // dip7 (silk “A0”) → address,1 = MSB; dip8 (“A1”) → address,0 = LSB
/* autodetect (pod22v2.asm): while unlocked in digital mode, every detect_count = 100 passes it flips lock75_110_1 bit 0 (porte 0/1 = 75 Ω BNC vs 110 Ω Phoenix) */
function srcAt(t){ if (!digital()) return 'ana'; const live = D.in.bnc? 'bnc' : D.in.phx? 'phx' : null; return live; }
function lockAt(t){ if (!digital()) return D.in.ana; const s=srcAt(t); if (!s) return false;
  const t0=Math.max(0,D.unplugAt); const want = s==='bnc'?0:1; const flipsNeeded = (want===0?0:1);                  // starts on 75 Ω after reset (inferred)
  const tLock = t0 + flipsNeeded*100*PASS + 7*PASS;                                                                    // detect_count = 100, detect_count1 = 7 confirming passes
  return t>=tLock; }
function selAt(t){ if (!digital()) return 'analog'; const t0=Math.max(0,D.unplugAt); const n=Math.floor((t-t0)/(100*PASS)); if (lockAt(t)) return srcAt(t)==='bnc'?'75 Ω BNC':'110 Ω Phoenix'; return (n%2)?'110 Ω Phoenix (trying)':'75 Ω BNC (trying)'; }
function trimDb(ch){ if (!D.remote.on) return 0; return D.remote.lvl.S + (ch?D.remote.lvl.R:D.remote.lvl.L); }
/* programme in dBFS at the meter */
function amp(ch,t){ if (!lockAt(t)) return 0; const s=D.prog; let lvl = digital()? s.dbfs : s.dbu-ADC0; lvl = Math.min(lvl+trimDb(ch), 0);
  let a=Math.pow(10,lvl/20);
  if (s.type==='bursts') a *= (t%0.5)<0.12 ? 1 : 0; else if (s.type==='step') a *= t>=0.2?1:0;
  else if (s.type==='speech'){ const e=0.5+0.5*Math.sin(2*Math.PI*3.1*t)*Math.sin(2*Math.PI*0.7*t+1); a*=Math.max(0,e)*(1+0.4*Math.sin(2*Math.PI*11*t)); }
  return a; }
const sample=(ch,t)=>amp(ch,t)*Math.sin(2*Math.PI*D.prog.f*t+(ch?D.prog.phase*Math.PI/180:0));
let CACHE=null, KEY='';
function run(){ const key=JSON.stringify([D.prog,D.dip,D.in,D.unplugAt,D.remote]); if (key===KEY) return CACHE; KEY=key;
  const dt=0.00025, N=Math.round(1/dt)+1, k=48000*dt, step=tc=>1-Math.pow(1-tc,k);
  const aVU=step(TC.VU), aPA=step(TC.PPM_A), aPD=step(TC.PPM_D), aKD=step(ppmType()===1?TC.PK_D1:TC.PK_D2); const out=[[],[]];
  for (let ch=0;ch<2;ch++){ let vu=0,ppm=0,pk=0; for (let n=0;n<N;n++){ const A_=amp(ch,n*dt), sq=A_*A_; vu+=(sq/2-vu)*aVU; ppm+=(sq-ppm)*(sq>ppm?aPA:aPD); if (sq>=pk) pk=sq; else if(!peakHold()) pk+=(0-pk)*aKD; out[ch].push([vu,ppm,pk]); } }
  CACHE={dt,out}; return CACHE; }
const dbOf=p=>p>1e-14?10*Math.log10(p):-140;
function meter(ch,t){ const c=run(), i=clamp(Math.round(t/c.dt),0,c.out[ch].length-1), [vu,ppm,pk]=c.out[ch][i]; return {vu:dbOf(2*vu),ppm:dbOf(ppm),pk:dbOf(pk)}; }
const rel = d => d - calRef();
function litCount(r){ let n=0; for (const s of SEG) if (r>=s) n++; return n; }
function dotIndex(r){ let k=-1; SEG.forEach((s,i)=>{ if (r>=s) k=i; }); return k; }
function corr(t){ if (amp(0,t)<1e-4||amp(1,t)<1e-4) return null; return Math.cos(D.prog.phase*Math.PI/180); }
const comOn = t => D.remote.on && D.remote.lastAt>=0 && t>=D.remote.lastAt && t<D.remote.lastAt+0.2;    // serial_time / timer_uart 200 (inferred: passes)
/* ---------------- actions ---------------- */
const act=makeActor(D,()=>`${digital()?'AES':'analog'} · L VU ${fdb(rel(meter(0,SIM.t).vu))} dB re CAL ${calRef()} dBFS`);
const A={
  dip(n){ act(`Rear DIP ${n} → ${D.dip[n]?'OFF':'ON'}`, tr=>{ D.dip[n]^=1; const i=DIPS.indexOf(n);
    const pin=['portd,6','portd,7','portb,4','portb,0','portb,1','portb,2','portd,4','portd,5'][i];
    tr(`read_jumpers: dip${i+1} on ${pin} → ${n==='A0'||n==='A1'?'address,'+(n==='A0'?1:0):'jumper0,'+i}${n==='A/D'?' (btfsc: this one is inverted — ON = digital)':''}`);
    if (n==='A/D'){ D.unplugAt=SIM.t; tr(digital()?'digital_mode: CS8420 reg1/3/4 = RMCK / AES input / 0x49; porte selects 75 or 110 Ω; autodetect starts':'analog_mode: CS8420 reg1 = OMCK, reg3/reg4 for the A/D path; mode,0 set → resetsharcprocess resets the SHARC once'); }
    else if (n==='BS1'||n==='BS0') tr(`jumper0 → sharc_out+5 every pass; the SHARC picks ${peakHold()?'peak hold':'peak decay type '+ppmType()} (${inf}, SLM-1 constants)`);
    else if (n==='CAL0'||n==='CAL1') tr(`Reference → ${calRef()} dBFS = scale 0 (${inf}: POD11A legend)`);
    else if (n==='A0'||n==='A1') tr(`POD23 address = ${addr()}; uart_rx compares the address byte with it`);
    else tr('BRIGHT: jumper0,0 to the SHARC (display brightness; POD22 v103 notes say brightness control was later removed)');
    tr('refresh_sharc_registers → sharc: 17 × 10-bit words shifted out on SPORT1 (portd 1/2/3)'); }); },
  plug(k){ act(`${D.in[k]?'Disconnect':'Connect'} ${({bnc:'AES IN 75 Ω BNC',phx:'AES IN 110 Ω Phoenix',ana:'ANALOG IN L/R'})[k]}`, tr=>{ D.in[k]=!D.in[k]; D.unplugAt=SIM.t;
    if (k==='ana') tr(digital()?'Analog is ignored in digital mode (A/D DIP ON)':'A/D path: '+(D.in.ana?'signal':'silence'));
    else { tr('read8420s: CS8420 register 16 bit 4 (1 = no lock) read twice per pass over the SPI-style shiftin');
      tr(D.in.bnc||D.in.phx? `autodetect: tries 75 Ω first, flips porte every detect_count = 100 passes until lock; 7 more passes confirm (lock75_110_1,1). Lock ≈ ${((D.in.bnc?0:1)*100+7)} ms here (${inf})`:'No AES: autodetect keeps flipping between 75 and 110 Ω every 100 passes; LOCK off, ERROR on'); } }); },
  fs(v){ act(`AES sample rate → ${v/1000} kHz`, tr=>{ D.fs=v; D.unplugAt=SIM.t; tr('cs8420lockprocess: lock lost and regained → run/stop (cs8420reg4_1 bit 6) forces the CS8420 to restart'); tr(`SHARC measures the rate (SLM-1 emuclk_prev) → ${v===44100?'44.1K':v===48000?'48K':v===96000?'96K':'no'} LED (${inf})`); }); },
  remote(cmd,val){ const name={S:'stereo level',L:'left level',R:'right level'}[cmd]; act(`POD23 sends ${name} ${fdb(val,0)} dB`, tr=>{ D.remote.on=true; D.remote.lvl[cmd]=val; D.remote.lastAt=SIM.t;
    const byte=Math.round(195+val*4); tr(`Frame at 9600 baud: ff · ${addr().toString(16).padStart(2,'0')} · ${({S:0,L:1,R:2})[cmd]} · ${byte.toString(16)} · aa (POD23 PROTOCOL; level code ${inf})`);
    tr(`uart_rx → check_address (= DIP A1/A0 = ${addr()}) → ${cmd==='S'?'sbyte1':cmd==='L'?'lbyte1':'rbyte1'} → audio,${({S:0,L:1,R:2})[cmd]}; uart_process sets serial_control,0 “under serial control, ignore jumpers and pots”`);
    tr('uart_tx replies 1000 0001 (POD22 product ID) + address; refresh_sharc_registers puts serial_control in sharc_out+7 bit 1 → COM LED (inferred)'); }); },
  set(k,v,l){ act(l,tr=>{ D.prog[k]=v; tr('Programme changed; ballistics recomputed'); }); },
  reset(){ Object.assign(D,JSON.parse(JSON.stringify(FACT))); KEY=''; D.log=[]; SIM.refresh(); },
};
/* ---------------- panels ---------------- */
function segColor(v){ return v>8?'#ff2d6f': v>=0?'#ff9a2a': v>=-9?'#ffe23a':'#9be35a'; }
function frontSVG(t){ let over=''; const lk=lockAt(t), br=D.dip.BRIGHT?1:0.55;
  [0,1].forEach(ch=>{ const m=meter(ch,t), lit=litCount(rel(m.vu)), dot=dotIndex(rel(m.pk)), y=ch?184:118;
    SEG.forEach((s,i)=>{ const on=lk&&(i<lit||i===dot); over+=`<rect x="${(SEGX(i)-5).toFixed(1)}" y="${y}" width="10" height="16" rx="2" fill="${on?segColor(s):'#2a2f2a'}" opacity="${on?br:1}"/>`; }); });
  const c=corr(t); for (let i=0;i<11;i++){ const v=1-i*0.2, on=lk&&c!==null&&Math.abs(v-c)<0.1; over+=`<circle cx="422" cy="${100+i*12}" r="4.5" fill="${on?(v>0?'#9be35a':v<-0.2?'#ff4a3a':'#ffe23a'):'#2a2f2a'}"/>`; }
  const fsLed=f=>lk&&digital()&&D.fs===f || lk&&!digital()&&f===48000;
  over+=led(742,280,lk,'var(--led-g)',8)+led(847,280,comOn(t),'#ffd23a',8)+led(943,280,fsLed(44100),'#ffd23a',8)+led(1045,280,fsLed(48000),'#ffd23a',8)+led(1149,280,fsLed(96000),'#ffd23a',8)+led(1248,280,!lk,'#ff4a3a',8);
  return panelSVG(PREFIX,'front',{over},'POD22A front panel (real silkscreen)'); }
function dipV(x,y,cls){ let s=`<rect x="${x-8}" y="${y-8}" width="62" height="${DIPS.length*24+10}" rx="4" fill="#3d7bc9" stroke="#1d4d8a" stroke-width="2"/>`;
  DIPS.forEach((n,i)=>{ const on=!!D.dip[n], yy=y+i*24; s+=`<g class="${cls}" data-i="${i}" style="cursor:pointer"><title>${n}: ${on?'ON':'OFF'} — click to flip</title><rect x="${x}" y="${yy}" width="46" height="18" fill="#e8ecef"/><rect x="${on?x+24:x+2}" y="${yy+2}" width="20" height="14" fill="#2a2d31"/></g>`; }); return s; }
function rearSVG(t){ const ld=t==null?SIM.t:t;
  const over=bnc(297,85,D.in.bnc,'pb','AES IN 75 Ω BNC — click',50)+bnc(447,85,false,'','AES OUT 75 Ω BNC',50)+phx(297,200,D.in.phx,'pp','AES IN 110 Ω (+ − G) — click')+phx(447,200,false,'','AES OUT 110 Ω')
    +phx(647,95,D.in.ana,'pa','ANALOG IN L — click')+phx(797,95,false,'','ANALOG OUT L')+phx(647,195,D.in.ana,'pa','ANALOG IN R — click')+phx(797,195,false,'','ANALOG OUT R')
    +dipV(958,52,'dp')+`<g><title>CONTROL (DB9) — POD23 remote, 9600 baud</title><rect x="1110" y="175" width="132" height="62" rx="12" fill="#b9bcbf" stroke="#6b6f73" stroke-width="3"/><rect x="1128" y="187" width="96" height="38" rx="8" fill="#151617"/>${comOn(ld)?'<circle cx="1250" cy="170" r="7" fill="var(--accent)"/>':''}</g>`
    +`<circle cx="1374" cy="160" r="44" fill="#151617" stroke="#666" stroke-width="4"/><text x="1374" y="166" font-size="16" fill="#999" text-anchor="middle">FUSE</text><circle cx="1534" cy="160" r="30" fill="#0c0d0e"/><path d="M1534 160 h200" stroke="#0c0d0e" stroke-width="24"/>`;
  return panelSVG(PREFIX,'rear',{over},'POD22A rear panel (real silkscreen)'); }
function bindPanel(r){ r.querySelectorAll('.dp').forEach(g=>g.onclick=()=>A.dip(DIPS[+g.dataset.i])); r.querySelectorAll('.pb').forEach(g=>g.onclick=()=>A.plug('bnc')); r.querySelectorAll('.pp').forEach(g=>g.onclick=()=>A.plug('phx')); r.querySelectorAll('.pa').forEach(g=>g.onclick=()=>A.plug('ana')); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Programme <select id="pg">${[['tone','steady tone'],['bursts','120 ms bursts'],['step','tone from 200 ms'],['speech','speech-like']].map(([v,l])=>`<option value="${v}" ${v===D.prog.type?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>AES <input id="ad" type="number" value="${D.prog.dbfs}" style="width:50px"> dBFS</label><label>Analog <input id="an" type="number" value="${D.prog.dbu}" style="width:50px"> dBu</label>
  <label>fs <select id="fs">${[32000,44100,48000,96000].map(f=>`<option value="${f}" ${f===D.fs?'selected':''}>${f/1000}k</option>`).join('')}</select></label><label>R phase <select id="ph">${[0,90,180].map(p=>`<option ${p===D.prog.phase?'selected':''}>${p}</option>`).join('')}</select>°</label>
  <span>POD23: <button id="r1">stereo +3 dB</button> <button id="r2">left −3 dB</button> <button id="r3">stereo 0</button></span></div>
  <div class="small muted">Click the rear DIP levers (BRIGHT, A/D, BS0, BS1, CAL0, CAL1, A0, A1) and the inputs. Press Play: the bars move with the SLM-1 time constants. Keys 1–8 flip the DIPs.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#pg')) return; g('#pg').onchange=e=>A.set('type',e.target.value,'Programme → '+e.target.selectedOptions[0].text);
  g('#ad').onchange=e=>A.set('dbfs',Math.min(0,+e.target.value),'AES level → '+e.target.value+' dBFS'); g('#an').onchange=e=>A.set('dbu',+e.target.value,'Analog level → '+e.target.value+' dBu');
  g('#fs').onchange=e=>A.fs(+e.target.value); g('#ph').onchange=e=>A.set('phase',+e.target.value,'R phase → '+e.target.value+'°');
  g('#r1').onclick=()=>A.remote('S',3); g('#r2').onclick=()=>A.remote('L',-3); g('#r3').onclick=()=>A.remote('S',0); }
bindKeys('__pod22aActive',()=>{ const k={}; DIPS.forEach((n,i)=>k[''+(i+1)]=()=>A.dip(n)); return k; });
/* ---------------- timeline ---------------- */
function dbLane(label, fn, color){ return { label, h:44, draw(c,X,t0,t1,y,h){ const Y=v=>y+4+(1-(clamp(v,-60,20)+60)/80)*(h-8);
  c.strokeStyle=SIM.css('--grid'); [-40,-20,0].forEach(v=>{ c.beginPath(); c.moveTo(X(t0),Y(v)); c.lineTo(X(t1),Y(v)); c.stroke(); });
  c.strokeStyle=color; c.lineWidth=1.5; c.beginPath(); const N=Math.min(800,X(t1)-X(t0)); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=fn(tt); i?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); } c.stroke(); }}; }
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), r=SIM.css('--bad'), fs=digital()?D.fs:48000;
  return [ {label:'PIC MAIN passes (≈1 ms, inferred)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,PASS,0,PASS*0.3,SIM.css('--ink2'),'read8420s · read_jumpers · sharc · uart'); }},
    {label:'Autodetect input (porte)', h:22, draw(c,X,t0,t1,y,h){ c.font='10px '+SIM.css('--mono'); const N=Math.min(200,(X(t1)-X(t0))/3); for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N, s=selAt(tt); c.fillStyle=s.startsWith('75')?b:s.startsWith('110')?wn:SIM.css('--ink2'); c.globalAlpha=s.includes('trying')?0.35:1; c.fillRect(X(t0+(t1-t0)*i/N),y+4,(X(t1)-X(t0))/N+0.5,h-8); } c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.fillText('blue 75 Ω · amber 110 Ω (faint = trying)',X(t0)+4,y+15); }},
    {label:`AES3 frames (${fs/1000} kHz)`, h:20, draw(c,X,t0,t1,y,h){ if(!lockAt((t0+t1)/2)) return; SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.25/fs,b,'samples → VUMeterCalc'); }},
    {label:'UART 9600 Bd (POD23 frames)', h:20, draw(c,X,t0,t1,y,h){ if(D.remote.lastAt<0) return; const t=D.remote.lastAt; c.fillStyle=SIM.css('--warn'); for(let k=0;k<5;k++){ const s=t+k*10/9600; if(s>=t0&&s<=t1) c.fillRect(X(s),y+4,Math.max(2,X(s+10/9600)-X(s)-1),h-8); } }},
    waveLane('Input L (dBFS-scaled)', t=>sample(0,t), -0.01, null, b, 32, Object.assign(t=>amp(0,t),{dense:(s,pw)=>s*D.prog.f>pw/3})),
    dbLane('VU L (dB re CAL)', t=>lockAt(t)?rel(meter(0,t).vu):-60, a), dbLane('PPM L (dB re CAL)', t=>lockAt(t)?rel(meter(0,t).ppm):-60, wn), dbLane('Peak L', t=>lockAt(t)?rel(meter(0,t).pk):-60, r),
    boolLane('LOCK', t=>lockAt(t), '#3fbf5f'), boolLane('COM', t=>comOn(t), '#ffd23a'), boolLane('ERROR', t=>!lockAt(t), '#e3453a') ]; }
function nowHTML(t){ const m0=meter(0,t), m1=meter(1,t); return `<table class="kv"><tr><th>Mode / input</th><td class="mono">${digital()?'AES':'ANALOG (A/D)'} · ${selAt(t)} · ${lockAt(t)?'LOCK':'ERROR'}</td></tr><tr><th>Reference</th><td class="mono">${calRef()} dBFS = 0 · ${peakHold()?'peak hold':'PPM type '+ppmType()}</td></tr>
  <tr><th>L: VU / PPM / peak</th><td class="mono">${fdb(rel(m0.vu))} / ${fdb(rel(m0.ppm))} / ${fdb(rel(m0.pk))} dB</td></tr><tr><th>R: VU / PPM / peak</th><td class="mono">${fdb(rel(m1.vu))} / ${fdb(rel(m1.ppm))} / ${fdb(rel(m1.pk))} dB</td></tr>
  <tr><th>POD23 control</th><td class="mono">${D.remote.on?`address ${addr()} · S ${fdb(D.remote.lvl.S,0)} L ${fdb(D.remote.lvl.L,0)} R ${fdb(D.remote.lvl.R,0)} dB`:'none (DIPs and pots rule)'}</td></tr></table>`; }
function levelsHTML(){ return `<table class="kv"><tr><th>DIP</th><th>Pin (read_jumpers)</th><th>Now</th><th>Meaning</th></tr>${DIPS.map((n,i)=>`<tr><td>${i+1} ${n}</td><td class="mono small">${['portd,6','portd,7','portb,4','portb,0','portb,1','portb,2','portd,4','portd,5'][i]}</td><td class="mono">${D.dip[n]?'ON':'OFF'}</td><td class="small">${['brightness','ON = AES, OFF = analog (inverted test)','ballistics 0 → PPM type '+inf,'ballistics 1 → peak hold '+inf,'calibration 0','calibration 1','address MSB (comment: “auto level”)','address LSB (comment: “manual level”)'][i]}</td></tr>`).join('')}</table>`; }
const viewSim=simView({flag:'__pod22aActive',D,front:frontSVG,rear:rearSVG,bind:bindPanel,controls:controlsHTML,bindControls,now:nowHTML,levels:levelsHTML,lanes,labelW:220,frontTitle:'Front panel at the playhead — press Play to watch the ballistics',rearTitle:'Rear panel — DIP switches and inputs',nowTitle:'Readings at the playhead',levelsTitle:'DIP switches as the PIC reads them',tlTitle:'Timeline — one second: controller passes, autodetect, AES frames, detectors, tallies',hint:'Flip a DIP, plug an input or send a POD23 command.'});
const LESSONS=[
  {title:'Meet the POD22A', body:'<p>POD22A is a <b>stereo loudness meter</b>: two 57-point bars (52 … +20, VU and PEAK ranges), a phase column, and LOCK, COM, 44.1K, 48K, 96K and ERROR tallies. The rear takes AES (75 Ω BNC or 110 Ω Phoenix, with outputs) or analog L/R, has an 8-way DIP switch and a CONTROL port for the POD23 remote.</p>', check:()=>true, auto:true},
  {title:'1 · Lock to AES', body:'<p>With A/D ON (digital), connect the 75 Ω BNC: LOCK lights after a few passes.</p>', check:()=>digital()&&D.in.bnc&&lockAt(SIM.t+1), hint:'Click the AES IN BNC if empty.'},
  {title:'2 · Autodetect 110 Ω', body:'<p>Unplug the BNC and plug the Phoenix input. Watch the “Autodetect” lane: the PIC tries 75 Ω first, flips to 110 Ω after 100 passes, then locks.</p>', check:()=>!D.in.bnc&&D.in.phx&&lockAt(SIM.t+1), hint:'Click the BNC, then the green Phoenix under it.'},
  {title:'3 · Set the reference', body:'<p>Set CAL to −18 dBFS (CAL1 OFF, CAL0 ON) and play steady tone at −18 dBFS: both bars sit at 0.</p>', check:()=>calRef()===-18&&D.prog.type==='tone'&&D.prog.dbfs===-18, hint:'Click CAL1; programme → steady tone; AES −18.'},
  {title:'4 · Switch to analog', body:'<p>Flip A/D OFF. The PIC runs analog_mode, re-programs the CS8420 for the A/D clock and resets the SHARC; the 48K LED shows the converter rate.</p>', check:()=>!digital(), hint:'Second DIP lever.'},
  {title:'5 · Remote control', body:'<p>Press <b>stereo +3 dB</b> (a POD23 command). COM lights, and the PIC now ignores the DIPs/pots (serial_control).</p>', check:()=>D.remote.on&&D.remote.lvl.S===3, hint:'Button under the front panel.'},
  {title:'Done', body:'<p>Software shows the PIC main loop; Findings lists the polarity quirk and the misfiled test report.</p>', check:()=>true, auto:true}];
let lessonIdx=0;
function viewTutorial(m){ window.__pod22aActive=true; tutorialView(m,{title:'Tutorial — reading a POD22A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${nowHTML(SIM.t)}</div>`,bind:r=>{bindPanel(r);bindControls(r);}}); }
function viewSecond(m){ window.__pod22aActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('One AES3 frame at the playhead',`<canvas id="sc"></canvas><div id="dev"></div>`)}${card('As seen by the display',`<div id="fp"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, fs=digital()?D.fs:48000;
    m.querySelector('#ladder').innerHTML=tableRows([['AES3 frames',fs.toLocaleString(),SIM.fmtDur(1/fs),'one stereo pair per SHARC sample interrupt'],['PIC MAIN passes','≈ 1,000 '+inf,SIM.fmtDur(PASS),'read8420s ×2 · lock · read_jumpers · modes · autodetect · sharc · uart'],['Autodetect flip','≈ 10 while unlocked',SIM.fmtDur(100*PASS),'detect_count = 100 passes'],['Lock confirm','—',SIM.fmtDur(7*PASS),'detect_count1 = 7 passes'],['VU detector','—',`40 dB in ${T40(TC.VU).toFixed(2)} s`,'SLM-1 TCONST_VU'],['PPM attack / decay','—',`${(T40(TC.PPM_A)*1000).toFixed(0)} ms / ${T40(TC.PPM_D).toFixed(1)} s for 40 dB`,'SLM-1'],['UART byte at 9600 Bd','960',SIM.fmtDur(10/9600),'6-byte POD23 frame ≈ 6.3 ms']]);
    const n=Math.floor(t*fs), s0=sample(0,t), s1=sample(1,t); drawAesScope(m.querySelector('#sc'), aesSubframe(s0,n%192===0?'Z':'X',n%192,fs), aesSubframe(s1,'Y',n%192,fs), fs, lockAt(t)?1:0.05, `frame ${n.toLocaleString()} ·`);
    m.querySelector('#dev').innerHTML=nowHTML(t); m.querySelector('#fp').innerHTML=frontSVG(t); };
  SIM.on('time',draw); }
const BLOCKS={ inp:{x:20,y:30,w:160,h:90,t:'AES IN 75 / 110 Ω',s:['BNC or Phoenix','porte 0/1 select'],d:'The PIC switches between them (autodetect) until the CS8420 locks.'},
  ana:{x:20,y:160,w:160,h:70,t:'ANALOG IN L/R',s:['A/D (part not named)'],d:'Used when DIP A/D is OFF; the CS8420 then runs from OMCK.'},
  cs:{x:220,y:60,w:160,h:100,t:'CS8420',s:['AES receiver / SRC / transmitter','reg 16 lock bit','AES OUT'],d:'Programmed by the PIC over a bit-banged serial port (shiftout / shiftin).'},
  pic:{x:220,y:200,w:160,h:100,t:'PIC16F874 (POD22 v1.02)',s:['MAIN loop','DIPs, lock, autodetect','UART 9600 Bd'],d:'pod22v2.asm, init.asm, uart.asm, modes.asm (POD23Com/POD22).'},
  dsp:{x:430,y:60,w:170,h:100,t:'SHARC (DSP v1.02/v103)',s:['VU / PPM / peak / phase','17 × 10-bit words from PIC'],d:'The PIC header: “SHARC V1.01 is for CS4336-KS (obsolete), V1.02 is for CS4334-KS” — the DAC for the analog outputs.'},
  disp:{x:650,y:60,w:150,h:100,t:'Display (SLM1-4)',s:['2 × 57 segments','phase, 6 tallies'],d:'Board name from the POD22 v103 test report.'},
  rem:{x:430,y:210,w:170,h:80,t:'CONTROL → POD23',s:['ff · addr · cmd · data · aa','reply 0x81 + addr'],d:'POD23 PROTOCOL.wpd; stereo / left / right level, delay.'} };
const WIRES=[['inp','cs','AES'],['ana','cs','I²S'],['cs','dsp','audio'],['pic','cs','SPI'],['pic','dsp','SPORT1'],['dsp','disp',''],['rem','pic','UART']];
function viewBlock(m){ window.__pod22aActive=false; blockView(m,BLOCKS,WIRES,'pic',[820,320],card('In one sentence',`<p>A PIC16F874 configures a CS8420 (choosing the 75 or 110 Ω AES input, or the A/D path), reads the DIP switches and the POD23 serial link, and passes settings to a SHARC that runs the VU/PPM/peak/phase meters and the display.</p>`)); }
const SHEETS=[{name:'1 · PIC pin use (from the code)', note:'Redrawn from pod22v2.asm / init.asm port usage; there is no POD22/POD22A schematic in the archive.', svg:()=>
  chip(330,60,170,'PIC16F874',[['RD6','dip1 BRIGHT'],['RD7','dip2 A/D'],['RB4','dip3 BS0'],['RB0','dip4 BS1'],['RB1','dip5 CAL0'],['RB2','dip6 CAL1'],['RD4','dip7 A0 → MSB'],['RD5','dip8 A1 → LSB']],[['RB5','CS8420 CS'],['RC3/RC5/RC4','CLK / DOUT / DIN'],['RE0/RE1','75 / 110 Ω select'],['RD1/RD2/RD3','SHARC FSYNC/CLK/DATA'],['RD0','SHARC data in'],['RC6/RC7, RC1','UART TX/RX, TX enable']],'POD22 v1.02 (2003)')
  +txt(40,420,'CS8420 defaults: reg1 0000 0100 (RMCK) / 1000 0100 (OMCK, analog); reg3 1000 1101 / 1000 1010; reg4 0100 1001 / 0100 0101.',11)}];
function viewSchem(m){ window.__pod22aActive=false; schemView(m,SHEETS,'POD22A','No POD22A schematic exists; this sheet lists the pins the POD22 firmware drives (inferred to match POD22A).'); }
function viewSoft(m){ window.__pod22aActive=true;
  m.innerHTML=`${card('PIC MAIN loop (pod22v2.asm) — the running step follows the playhead',`<div id="ml"></div><div id="st" class="small"></div>`)}<div class="grid2">${card('POD23 serial frame',`<div id="fr"></div>`)}${card('DIP → code',`<div id="dp"></div>`)}</div>`;
  const STEPS=[['read8420s ×2','CS8420 reg 16 bit 4 → lock_8420,0'],['resetsharcprocess','analog mode + lock → pulse SHARC reset once'],['cs8420lockprocess','after lock: run/stop (reg4 bit 6)'],['refresh8420_1','write regs 1–6, 9, 17'],['read_jumpers','DIP → jumper0 / address'],['analog_mode / digital_mode','CS8420 clock source, porte'],['autodetect','flip 75/110 Ω every 100 passes'],['refresh_sharc_registers','cal_l/cal_r, jumper0, lock, serial'],['sharc','17 × 10-bit words on SPORT1'],['uart_rx / process / tx','POD23 frames, reply 0x81']];
  const draw=()=>{ const t=SIM.t, k=Math.floor((t%PASS)/PASS*STEPS.length);
    m.querySelector('#ml').innerHTML=flowSVG(STEPS.slice(0,5).map(s=>({t:s[0],s:[s[1].slice(0,24)]})),k<5?k:-1)+flowSVG(STEPS.slice(5).map(s=>({t:s[0],s:[s[1].slice(0,24)]})),k>=5?k-5:-1);
    m.querySelector('#st').innerHTML=`Pass ${Math.floor(t/PASS).toLocaleString()} · step ${k+1}: <b>${STEPS[k][0]}</b> — ${STEPS[k][1]} · input now: ${selAt(t)}`;
    m.querySelector('#fr').innerHTML=`<table class="kv"><tr><th>Byte</th><th>Value</th><th>Meaning</th></tr><tr><td>1</td><td class="mono">ff</td><td>framing</td></tr><tr><td>2</td><td class="mono">${addr().toString(16).padStart(2,'0')}</td><td>address (DIP A0 = MSB, A1 = LSB)</td></tr><tr><td>3</td><td class="mono">00 / 01 / 02 / 03</td><td>stereo / left / right level, delay (uart.asm jump table)</td></tr><tr><td>4</td><td class="mono">level</td><td>trim ±15 dB (POD23 README)</td></tr><tr><td>5</td><td class="mono">aa</td><td>termination (its check is commented out)</td></tr><tr><td>reply</td><td class="mono">81 ${addr().toString(16).padStart(2,'0')}</td><td>POD22 product ID 1000 0001 + address</td></tr></table>`;
    m.querySelector('#dp').innerHTML=levelsHTML(); };
  SIM.on('time',draw); }
const viewNotes=notesView('__pod22aActive','What the POD22A archive shows — findings',[
  '<b>The POD22 controller code is filed under POD23.</b> <span class="mono">POD23 - #Engineering/…/POD23Com/POD22/pod22v2.asm</span> is “Pod 22 v1.02, Issue 2 PCB” (17 Mar 2003|36), written while adding the POD23 remote protocol. The POD22A folder itself has only artwork.',
  '<b>A POD22 test report is filed under POD21.</b> <span class="mono">POD21 - #TESTREPORT/POD22-V103-13JUN11.pdf</span> (13 Jun 2011|44): “Software upgrade to support Hi Resolution LED Bar Graph. Brightness Control and Overload Peak Hold functions are removed”, MC v103 / DSP v103, display board SLM1-4. The 57-point bar on POD22A matches that “high resolution” version (inferred).',
  '<b>The A/D switch is read with the opposite polarity.</b> In <span class="mono">read_jumpers</span> every DIP uses <span class="mono">btfss</span> (ON = bit set) except dip2, where <span class="mono">btfss portd,7</span> is commented out and replaced by <span class="mono">btfsc</span>: A/D OFF = analog, ON = digital.',
  '<b>The address DIPs still carry old names.</b> dip7/dip8 set the POD23 address (address,1/0), but their comments say “auto level” and “manual level”, and the old <span class="mono">bsf jumper0,6/7</span> lines are commented out.',
  '<b>The address bits are named backwards.</b> The silk calls dip7 “A0” and dip8 “A1”, but read_jumpers puts dip7 into <span class="mono">address,1</span> (MSB) and dip8 into <span class="mono">address,0</span> (LSB). Setting only “A0” gives address 2. The SHARC data-in comment also says <span class="mono">portc,0</span> while the code reads <span class="mono">portd,0</span>.',
  '<b>Two AES inputs, found automatically.</b> <span class="mono">autodetect</span> flips <span class="mono">lock75_110_1</span> bit 0 every detect_count = 100 passes while unlocked, switching porte between the 75 Ω BNC and the 110 Ω Phoenix, and needs detect_count1 = 7 locked passes to settle. Plugging both inputs leaves the 75 Ω one in charge.',
  '<b>The termination byte is not checked.</b> uart.asm has the “should be AA” test commented out, so any 6th byte completes a frame.',
  '<b>DAC change documented in code.</b> “SHARC V1.01 is for CS4336-KS (OBSOLETE), SHARC V1.02 is for CS4334-KS” — the analog output DAC changed between DSP versions.',
  '<b>BRIGHT is on the photo but not the silk.</b> The rear silk lists A/D … A1 (seven names); the photo shows eight levers with BRIGHT first, matching dip1 “brightness” in read_jumpers.'],
 ['That POD22A runs the POD22 v1.02 PIC code and the SLM-1 meter maths (inferred from the matching DIP names and front legends).','BS0/BS1 and CAL0/CAL1 meanings follow the POD11A rear legend (inferred). Analog 0 dBFS = +24 dBu (inferred).','One MAIN pass ≈ 1 ms (oscillator not archived, inferred). COM lights for 200 ms after a frame (inferred from serial_time = 200).','Rate LEDs show the measured AES rate; 32 kHz lights none (inferred).'],
 ['POD22A - #ARTWORK #DA #2016/POD22A-FRONT&amp;REAR-SILK (CURVE).pdf · Pics/POD22A Front.jpg, Rear.jpg','../POD23 - #Engineering/POD23 - #Software/POD23 - #SOFTWARE #working/POD23Com/POD22/pod22v2.asm · init.asm · uart.asm · modes.asm · ee_data.asm','../POD23 - #Engineering/POD23 PROTOCOL.wpd','../POD21 - #Master/POD21 - #TESTREPORT/POD22-V103-13JUN11.pdf','../POD3A - #Master/POD3A - #Engineering/sharc/working v101/ (SLM-1)']);
SIM.register({ id:'pod22a', name:'POD22A · stereo loudness meter, AES or analog in (2014|47)', duration:1, product:'POD22A', year:2014, family:'POD series', folder:'#POD #SERIES/POD22A - #Master',
  summary:'Half-rack stereo meter with two 57-point VU/peak bars, a phase column and LOCK/COM/44.1K/48K/96K/ERROR tallies, fed from AES (75 or 110 Ω, auto-detected) or analog, and remote-controllable from a POD23. Only panels are in its folder; the PIC control code (POD22 v1.02) and a POD22 test report were found filed under POD23 and POD21.',
  highlights:['Real silkscreen panels with live bars, phase, tallies, DIPs and inputs','PIC main loop and 75/110 Ω autodetect traced from pod22v2.asm','POD23 serial frames and the COM tally','SLM-1 VU/PPM/peak ballistics','Inverted A/D DIP and other code findings'],
  depth:'Hardware model', stepUnits:[{label:'1 PIC pass',period:()=>PASS},{label:'1 AES frame',period:()=>1/D.fs},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.5,'500 ms (one burst cycle)'],[0.25,'250 ms (autodetect)'],[0.01,'10 ms'],[0.001,'1 ms']], defaultZoom:0, init(){},
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: reading a POD22A',render:viewTutorial},{id:'second',label:'One second, frame by frame',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (pins from code)',render:viewSchem},{id:'software',label:'Software (POD22 PIC)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}] });

})();
