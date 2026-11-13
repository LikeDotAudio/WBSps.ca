/* =====================================================================
   RLM24-2 — main board of the RLM12/RLM24 high-density AES loudness/level meter (Ward-Beck Systems), pick-and-place folder
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model of the board inside the RLM24 frame.

   Sources used:
   - #RLM #SERIES/xxx - RLM24-2 - #Master/rlm24-2-T.prg/.mdb, rlm24-2-12-T (RLM12 build), rlm24-2b-B (2008 pick-and-place)
   - #RLM #SERIES/XXX - RLM  - #Master #obsolete/RLM - #OBSOLETE #Archive/:
       RLM24-2/PCB/rlm24-2ISS2.net (P-CAD netlist: every part and named net quoted here), RLM24-2/RLM24-2-SCH-P1…P17.pdf (image-only sheets)
       RLM24-1/PCB/rlm24-1iss2.net (display board: LED and pushbutton counts)
       MANUAL/RLM12 RLM24 Manual.pdf (features, SETUP dip switches, GPI/GPO, specifications)
       SILK/RLM24REARCURVE.cdr (rear panel artwork → assets/rlm24-2-rear-white.png via Inkscape)
       software/Atmel/RLM24/v101/v101.c (ATmega128 main loop, READ_FRAME_ADDRESS, READ_CALIBRATION, READ_ALARM_SETTINGS,
         TRANSLATE_INPUTS_ALARMS, READ_ADC, UART0_translate, uart0_init)
   - #MF8200 #SERIES/TB8201AP - #Engineering #MF82 #TERMINATION/TB8201AP-ISS2-RLM24-6 (input termination re-use)
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
const PREFIX='rlm24-2';
/* ---------------- constants from the files ---------------- */
const XTAL_AVR = 4.9152e6, XTAL_AUDIO = 24.576e6;     // rlm24-2ISS2.net: X "4.9152" and X "24.578M" (sic)
const TDM_BITS = 8*2*32;                              // 8 AD1895 per TDM chain × 2 channels × 32-bit slots
const BAUD = XTAL_AVR/(16*(2+1));                     // uart0_init: UBRR0L = 0x02 → 102 400 baud ("desired 115200, actual 102400 (12.5%)")
const INITIAL_THRESHOLD = 40, INITIAL_DELAY = 10;     // v101.c
const BOOT = 15*0.5 + 3*0.5;                          // main(): 15 × wait_ms(500), CONFIGURE_ALTERA, 3 × wait_ms(500), then init_CS8416 …
const NSEG = 42;                                      // RLM24-1: 528 green + 288 yellow + 192 red = 1008 LEDs for 24 bars → 22 G + 12 Y + 8 R per bar
const segCol = k => k>=34?'#ff3b30': k>=22?'#ffd60a':'#30d158';
const REFS = [-20,-18,-16,-14];                       // SW5/SW6: ON/ON −20, OFF/ON −18, ON/OFF −16, OFF/OFF −14 dBFS
const FS_LIST = [32000,44100,48000,96000];
/* ---------------- state ---------------- */
function mkIn(i){ return { on:true, lvl: -20 + ((i*7)%9) - 4, fs:48000, kind: i%5===4?'tone':'program', mute:false }; }
const D = { power:true, frames:12, dip:[true,true,true,true,true,true,true,true], ps:[true,true], gpi2:false, inputs:[...Array(24)].map((_,i)=>mkIn(i)),
  thr:Array(12).fill(INITIAL_THRESHOLD), dly:Array(12).fill(INITIAL_DELAY), skip:0, silentSince:Array(12).fill(null), ack:Array(12).fill(false), sel:0, log:[], uart:[] };
const FACT=JSON.parse(JSON.stringify(D));
/* dip: index 0..7 = SW1..SW8, true = ON (closed to ground → reads 0) */
const frameNo = ()=> 1 + (D.dip[0]?0:1) + (D.dip[1]?0:2) + (D.dip[2]?0:4) + (D.dip[3]?0:8);   // READ_FRAME_ADDRESS: (PIND & 0x0F) + 1
const calIdx = ()=> (D.dip[4]?0:1) + (D.dip[5]?0:2);                                              // READ_CALIBRATION: (PIND & 0x30) >> 4
const REF = ()=> REFS[calIdx()];
const psuAlarmEn = ()=> !D.dip[6], silenceAudEn = ()=> !D.dip[7];                                 // READ_ALARM_SETTINGS: bit0 = PSU (SW7), bit1 = audible silence (SW8) — OFF = enabled (inferred from the inversion)
const vt = ()=> SIM.t + D.skip;                                                                  // virtual clock (lets the user skip ahead for the silence timers)
/* signal at time t (dBFS short-term level of input i) */
function hsh(x){ x=Math.imul(x^0x5bd1e995, 0x27d4eb2d); x^=x>>>15; return (x>>>0)/4294967296; }
function shortLvl(i,t){ const s=D.inputs[i]; if(!s.on||s.mute) return -200; if(s.kind==='tone') return s.lvl;
  const k=Math.floor(t*25); const a=hsh(k*31+i*977), b=hsh(k*17+i*131); return s.lvl + (a-0.5)*14 - (b>0.92?14:0); }
/* VU: 300 ms integration; PPM: instant attack, 3.0 s / 24 dB decay (manual) — computed on 10 ms steps */
function meter(i,t){ let vu=-200, pk=-200; const dt=0.01; for(let k=60;k>=0;k--){ const tt=t-k*dt; const L=shortLvl(i,tt); const p=L<-150?0:Math.pow(10,L/10);
    const vp = vu<-150?0:Math.pow(10,vu/10); const nv = vp + (p-vp)*(1-Math.exp(-dt/0.3)); vu = nv>1e-12?10*Math.log10(nv):-200;
    const Lp = L + (D.inputs[i].kind==='program'?6:3); pk = Math.max(Lp, pk - 8*dt); } return {vu,pk}; }
const segOf = db => Math.round((db - (REF()+20-52)) / 52 * NSEG);     // 52 dB over 42 LEDs, top = REF + 20 dB (inferred)
const locked = i => D.power && D.inputs[i].on && D.inputs[i].fs>=30000 && D.inputs[i].fs<=96000;
/* silence per pair: loss of lock is immediate; level below −thr for dly seconds */
function pairState(p){ const a=2*p, b=2*p+1, t=vt();
  if (!locked(a)||!locked(b)) return 'loss';
  const quiet = shortLvl(a,SIM.t) < -D.thr[p] && shortLvl(b,SIM.t) < -D.thr[p];
  if (!quiet){ D.silentSince[p]=null; return 'ok'; }
  if (D.silentSince[p]==null) D.silentSince[p]=t;
  return (t - D.silentSince[p] >= D.dly[p]) ? 'silence' : 'counting'; }
const pairAlarm = p => { const s=pairState(p); return s==='loss'||s==='silence'; };
const psuAlarm = ()=> !D.ps[0] || !D.ps[1];                              // READ_ADC: either supply below POWER_SUPPLY_THRESHOLD (20)
const anyPairAlarm = ()=> [...Array(12).keys()].some(pairAlarm);
/* TRANSLATE_INPUTS_ALARMS (v101.c) */
function gpo(){ const mute = D.gpi2; let o=0;
  if (psuAlarm() && psuAlarmEn() && !mute) o|=2; else if (anyPairAlarm() && silenceAudEn() && !mute && !D.ack.some((a,p)=>a&&pairAlarm(p))) o|=2;
  if (psuAlarm() && psuAlarmEn()) o|=1; else if (anyPairAlarm()) o|=1; return o; }
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`frame ${frameNo()} · ref ${REF()} dBFS · GPO ${gpo().toString(2).padStart(2,'0')}`);
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power){ tr(`main(): initialization(); 15 × wait_ms(500); CONFIGURE_ALTERA(); DATA_INITIALIZATION(); 3 × wait_ms(500) → about ${BOOT.toFixed(1)} s before init_CS8416(), RESET_SHARC(), init_ADG1895(), START_ADC()`); tr('U21 EP1C6 loads from U13 EPCS1 (NCS, DCLK, ASDI, CNF_DATA); U1 ADSP-21262 boots from U2 AT25F512A over SPI (SPICLK, MOSO, MISO, FLAG0_CS)'); } else tr('All 48 bars dark; GPO open'); }); },
  dip(k){ act(`SETUP SW${k+1} → ${D.dip[k]?'OFF':'ON'}`, tr=>{ D.dip[k]=!D.dip[k];
    tr(k<4?`READ_FRAME_ADDRESS(): frame_number = (INVERT_DATA(READ_SWITCHES(PIND)) & FRAME_SETUP_MASK 0x0F) + 1 = ${frameNo()}`:k<6?`READ_CALIBRATION(): (PIND & 0x30) >> 4 = ${calIdx()} → reference ${REF()} dBFS (manual table)`:`READ_ALARM_SETTINGS(): (PIND & 0xC0) >> 6 → ${k===6?'PSU alarm '+(psuAlarmEn()?'enabled':'disabled'):'audible silence alarm '+(silenceAudEn()?'enabled':'disabled')}`);
    tr('Read every pass of the while(1) loop — no reset needed'); }); },
  input(i){ act(`Input ${i+1} ${D.inputs[i].on?'unplugged':'plugged'}`, tr=>{ D.inputs[i].on=!D.inputs[i].on; const p=Math.floor(i/2);
    tr(`AES${i+1} → DS26LS32A line receiver → CS8416 (${i<4?['U4','U6','U9','U12'][i]:'U2xx/U3xx/U4xx'}) ${D.inputs[i].on?'locks':'loses lock'}; CS8416_READ_LOCK_ALL() reads Astatus over CS8416_IN/CLK/OUT`);
    tr(D.inputs[i].on?'Pair alarm clears when both channels lock':`Pair ${p+1}: loss of signal → pushbutton LED + alarm (manual: “If the input signal is lost the LED in the pushbutton switch turns on and the internal alarm is sounded”)`); }); },
  ack(p){ act(`Press pushbutton ${p+1}`, tr=>{ D.ack[p]=!D.ack[p]; tr(D.ack[p]?'Audible alarm cancelled for this pair; the LED stays lit until the signal returns (manual)':'Acknowledge cleared'); tr(`The button is on the RLM24-1 display board (PB_SPL6B ×12 per board) and reaches the main board through the H headers (${inf}: path)`); }); },
  ps(k){ act(`PS${k+1} ${D.ps[k]?'removed':'fitted'}`, tr=>{ D.ps[k]=!D.ps[k]; tr(`READ_ADC(): ADC input ${k+1} ${D.ps[k]?'≥':'<'} POWER_SUPPLY_THRESHOLD (20) → power_supply${k+1}_status = ${D.ps[k]?'YES':'NO'}; PSU_alarm = ${psuAlarm()?'YES':'NO'}`); tr('Manual: “The system will operate properly with only one supply.”'); }); },
  gpi(){ act(`GPI-2 ${D.gpi2?'released':'grounded'}`, tr=>{ D.gpi2=!D.gpi2; tr(`READ_GP_INPUTS(): READ_GPI2 ${D.gpi2?'== 0 → data |= 0x02':'→ data &= ~0x02'}; TRANSLATE_INPUTS_ALARMS(): alarm_mute = ${D.gpi2?'YES — gp_outputs &= ~0x02 (audible off)':'NO'}`); tr('GPO-1 (pin 3, open collector) is “not affected by alarm mute”'); }); },
  skip(){ act('Skip ahead 10 s', tr=>{ D.skip+=10; tr('Virtual clock +10 s for the silence timers (the simulated second cannot show a 10 s delay otherwise)'); }); },
  cmd(s){ act(`Control panel → ${s}`, tr=>{ D.uart.unshift({t:SIM.t,s}); D.uart.length=Math.min(D.uart.length,20); const m=s.match(/^#F(.)A(\d)(\d)(?:T(\d)(\d)D(\d)(\d)(\d)|Q)\$$/);
    if(!m){ tr('UART0_translate: no #…$ frame of the form #F<f>A<aa>T<tt>D<ddd>$ or #F<f>A<aa>Q$ → ignored'); return; }
    const f=m[1].charCodeAt(0)-48, ad=+m[2]*10+ +m[3];
    if(f!==frameNo()){ tr(`frame_hold ${f} != frame_number ${frameNo()} → not for this frame`); return; }
    if(ad<1||ad>12){ tr(`address_hold ${ad} > CHANNELS → invalid_data`); return; }
    if(m[4]==null){ tr(`Query: meter pair ${ad} threshold ${D.thr[ad-1]}, delay ${D.dly[ad-1]} s`); return; }
    const th=+m[4]*10+ +m[5], dl=+m[6]*100+ +m[7]*10+ +m[8];
    if(+m[4]>7||+m[4]<2){ tr('threshold_hold_tens outside 2…7 → invalid_data'); return; }
    if(+m[5]!==0&&+m[5]!==5) tr('threshold ones not 0 or 5 — the correction line is commented out, value kept as sent');
    D.thr[ad-1]=th; D.dly[ad-1]=dl; tr(`Pair ${ad}: threshold −${th} dB, delay ${dl} s → SAVE_PARAMETERS_IN_EEPROM()`); tr(`Link speed: UBRR0L = 2 → ${Math.round(BAUD)} baud (12.5 % from 115200)`); }); },
  set(i,k,v,l){ act(l, tr=>{ D.inputs[i][k]=v; tr(k==='fs'?(v<30000||v>96000?'Outside the 30–96 kHz range: CS8416 cannot lock (spec “Sampling Frequency Range 30 kHz to 96 kHz”)':'CS8416 locks; AD1895 converts to the 48 kHz TDM rate'):'Level changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels ---------------- */
function frontSVG(){ const W=1900, Hh=350, t=SIM.t; let s=`<rect width="${W}" height="${Hh}" rx="8" fill="#141516"/><text x="22" y="34" font-size="20" fill="#3fc06a" font-family="Arial">WARD-BECK SYSTEMS</text><text x="${W-22}" y="34" text-anchor="end" font-size="20" fill="#3fc06a" font-family="Arial">RLM-24</text>`;
  // RLM24-1 boards hold 12 pairs each; pair n shows inputs 2n−1 / 2n
  for(let p=0;p<12;p++){ const x0=70+p*150+(p>=6?40:0);
    [0,1].forEach(c=>{ const i=2*p+c, x=x0+c*30, m=D.power&&locked(i)?meter(i,t):{vu:-200,pk:-200}, nv=clamp(segOf(m.vu),0,NSEG), np=clamp(segOf(m.pk),0,NSEG-1);
      for(let k=0;k<NSEG;k++){ const on = D.power && (k<nv || (k===np && m.pk>-150)); s+=`<rect x="${x}" y="${280-k*5.6}" width="20" height="4.2" fill="${on?segCol(k):'#262729'}"/>`; } });
    const al=D.power&&pairAlarm(p); s+=`<g class="pb" data-p="${p}" style="cursor:pointer"><title>Pair ${p+1} pushbutton (inputs ${2*p+1}/${2*p+2}): ${al?'ALARM — click to silence':'no alarm'}</title><rect x="${x0+4}" y="298" width="42" height="30" rx="4" fill="${al?'#ff3b30':'#3a3d42'}" ${al?'filter="url(#glowfront)"':''}/></g><text x="${x0+25}" y="344" text-anchor="middle" font-size="12" fill="#ddd">${2*p+1}–${2*p+2}</text>`; }
  return layered({w:W,h:Hh,bg:'#141516',over:s,label:'RLM24 front (drawn from the RLM24-1 display board, inferred layout; one display board of 12 pairs shown)'}); }
function rearSVG(){ const W=1800, Hh=350; let o='';
  [[42,55,126,129,0],[42,206,126,276,1]].forEach(([x0,y0,x1,y1,k])=>{ o+=`<g class="ps" data-k="${k}" style="cursor:pointer"><title>PS${k+1}: ${D.ps[k]?'fitted (click to remove)':'removed (click to fit)'}</title>${D.ps[k]?iec(x0,y0,x1,y1):`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="#050505" stroke="#ff3b30" stroke-width="3"/>`}</g>`; });
  o+=`<rect x="733" y="92" width="30" height="74" fill="#3d7bc9"/>`; D.dip.forEach((on,k)=>{ o+=`<g class="dp" data-k="${k}" style="cursor:pointer"><title>SETUP SW${k+1} ${on?'ON':'OFF'} — click</title><rect x="737" y="${95+k*8.6}" width="22" height="7" fill="#e8ecef"/><rect x="${on?738:748}" y="${96+k*8.6}" width="10" height="5" fill="#222"/></g>`; });
  [[880,'RS-422 IN'],[1030,'RS-422 OUT'],[1180,'GPIO']].forEach(([x,l])=>{ o+=`<g><title>${l} (DB9)</title><rect x="${x-34}" y="58" width="68" height="34" rx="8" fill="#9a9da1" stroke="#555"/><rect x="${x-24}" y="66" width="48" height="18" rx="5" fill="#111"/></g>`; });
  o+=`<g class="gp" style="cursor:pointer"><title>GPIO pin 2 = GPI-2 alarm mute (${D.gpi2?'grounded':'open'}) — click</title><circle cx="1180" cy="75" r="40" fill="transparent"/></g>`;
  for(let i=0;i<24;i++){ const r=i<12?0:1, c=i%12, x=899+c*63.2, y=r?278:154; const on=D.inputs[i].on;
    o+=`<g class="in" data-i="${i}" style="cursor:pointer"><title>AES INPUT ${i+1} (+ − G, 110 Ω): ${on?'connected — click to unplug':'unplugged'}</title><rect x="${x-29}" y="${y-22}" width="58" height="44" rx="3" fill="#26a356" stroke="#0e5d2b"/>${[-18,0,18].map(d=>`<rect x="${x+d-6}" y="${y-11}" width="12" height="22" fill="#0e4d25"/>`).join('')}${on?`<rect x="${x-27}" y="${y-20}" width="54" height="13" fill="${locked(i)?'#2b5f9e':'#c0392b'}" opacity=".85"/>`:''}</g>`; }
  return layered({w:W,h:Hh,bg:'#141516',layers:[PREFIX+'-rear-white.png'],over:o,label:'RLM24 rear panel (RLM24REARCURVE.cdr)'}); }
function bindPanel(r){ r.querySelectorAll('.pb').forEach(g=>g.onclick=()=>A.ack(+g.dataset.p)); r.querySelectorAll('.ps').forEach(g=>g.onclick=()=>A.ps(+g.dataset.k));
  r.querySelectorAll('.dp').forEach(g=>g.onclick=()=>A.dip(+g.dataset.k)); r.querySelectorAll('.in').forEach(g=>g.onclick=()=>A.input(+g.dataset.i)); r.querySelectorAll('.gp').forEach(g=>g.onclick=()=>A.gpi()); }
function controlsHTML(){ const s=D.inputs[D.sel]; return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:6px">
  <label>Input <select id="isel">${D.inputs.map((_,i)=>`<option value="${i}" ${i===D.sel?'selected':''}>${i+1}</option>`).join('')}</select></label>
  <label>level <input id="ilv" type="number" step="2" value="${s.lvl}" style="width:56px"> dBFS</label>
  <label>content <select id="ik">${['program','tone'].map(k=>`<option ${k===s.kind?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>fs <select id="ifs">${[22050,...FS_LIST,192000].map(f=>`<option value="${f}" ${f===s.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
  <label><input type="checkbox" id="imu" ${s.mute?'checked':''}> silent (digital black)</label>
  <button id="skp">Skip +10 s (silence timers)</button></div>
  <div class="small" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">Control panel (RS-485) <input id="cmd" class="mono" value="#F1A01T60D001$" style="width:150px"><button id="snd">Send</button><span class="muted">#F&lt;frame&gt;A&lt;pair&gt;T&lt;thr&gt;D&lt;sec&gt;$ — e.g. threshold −60 dB, 1 s</span></div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#isel')) return; g('#isel').onchange=e=>{ D.sel=+e.target.value; SIM.refresh(); };
  g('#ilv').onchange=e=>A.set(D.sel,'lvl',+e.target.value,`Input ${D.sel+1} level → ${e.target.value} dBFS`); g('#ik').onchange=e=>A.set(D.sel,'kind',e.target.value,`Input ${D.sel+1} → ${e.target.value}`);
  g('#ifs').onchange=e=>A.set(D.sel,'fs',+e.target.value,`Input ${D.sel+1} fs → ${e.target.value} Hz`); g('#imu').onchange=e=>A.set(D.sel,'mute',e.target.checked,`Input ${D.sel+1} ${e.target.checked?'silent':'program restored'}`);
  g('#skp').onclick=()=>A.skip(); g('#snd').onclick=()=>A.cmd(g('#cmd').value); }
/* ---------------- timeline ---------------- */
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), s=D.inputs[D.sel];
  return [
    {label:`AES frames, input ${D.sel+1} (${s.fs/1000} kHz)`, h:18, draw(c,X,t0,t1,y,h){ if(!locked(D.sel)){ c.fillStyle=SIM.css('--bad'); c.font='11px sans-serif'; c.fillText('not locked',X(t0)+6,y+13); return; } SIM.pulses(c,X,t0,t1,y,h,1/s.fs,0,0.5/s.fs,SIM.css('--ink2'),'frames'); }},
    {label:'TDM frames (48 kHz, 512 bits)', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,0,1/96000,b,'LRCLK1/2/3'); }},
    {label:'TDM bit clock 24.576 MHz', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/XTAL_AUDIO,0,0.5/XTAL_AUDIO,a,'SCLK1/2/3'); }},
    {label:`ATmega UART0 ${Math.round(BAUD)} baud`, h:20, draw(c,X,t0,t1,y,h){ D.uart.forEach(u=>{ const d=u.s.length*10/BAUD; if(u.t+d<t0||u.t>t1) return; c.fillStyle=b; c.fillRect(X(Math.max(t0,u.t)),y+4,Math.max(2,X(Math.min(t1,u.t+d))-X(Math.max(t0,u.t))),h-8); c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(u.s,X(Math.max(t0,u.t))+3,y+14); }); }},
    waveLane(`Input ${D.sel+1} short-term level (dBFS → bar)`, t=>D.power&&locked(D.sel)?Math.max(0,(meter(D.sel,t).vu+60)/60):0, 1.05, null, a, 40),
    waveLane(`Input ${D.sel+1} peak hold (3 s / 24 dB)`, t=>D.power&&locked(D.sel)?Math.max(0,(meter(D.sel,t).pk+60)/60):0, 1.05, null, SIM.css('--warn'), 40),
    boolLane(`Pair ${Math.floor(D.sel/2)+1} alarm`, ()=>pairAlarm(Math.floor(D.sel/2)), SIM.css('--bad')),
    boolLane('GPO-1 alarm (open collector)', ()=>!!(gpo()&1), SIM.css('--bad')), boolLane('GPO-2 audible alarm', ()=>!!(gpo()&2), SIM.css('--warn')),
  ]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__rlm242Active=true;
  m.innerHTML=`${card('Front: 12 meter pairs of one RLM24-1 display board (VU bar + peak dot, 42 LEDs each) — click a lit pushbutton to silence it',`<div id="fp"></div>`)}
   ${card('Rear (RLM24REARCURVE.cdr): PS1/PS2, SETUP dip switches, RS-422 loop, GPIO, 24 AES inputs — click them',`<div id="rp"></div>${controlsHTML()}`)}
   <div class="grid2">${card('Firmware path of the last action (v101.c)',`<div id="trace" class="log"></div>`)}${card('Status',`<div id="st"></div>`)}</div>
   ${card('Timeline — one second, zoomable (20 µs shows TDM frames, 100 ns the bit clock)',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Flip a SETUP switch, unplug an input or pull a supply.');
    m.querySelector('#st').innerHTML=kvt([['Frame address (SW1–4)',String(frameNo())],['Reference (SW5–6)',REF()+' dBFS'],['PSU alarm (SW7) / audible silence (SW8)',(psuAlarmEn()?'enabled':'disabled')+' / '+(silenceAudEn()?'enabled':'disabled')],['Supplies',D.ps.map((p,k)=>`PS${k+1} ${p?'OK':'<b style="color:var(--bad)">missing</b>'}`).join(' · ')],['GPO-1 / GPO-2',`${gpo()&1?'ACTIVE':'off'} / ${gpo()&2?'SOUNDING':'off'}`],['Virtual clock (silence timers)',vt().toFixed(2)+' s',1],['Pairs in alarm',[...Array(12).keys()].filter(pairAlarm).map(p=>p+1).join(', ')||'none']]);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:220}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the RLM24', body:`<p>From the manual: the RLM12/RLM24 “accepts 12 or 24 balanced (110 Ω) or unbalanced (75 Ω) AES/EBU digital audio signal inputs … provides 12 or 24 stereo LED bar graph displays. Each bar graph displays VU and Peak information simultaneously.” The RLM24-2 is the main board that does it: 24 CS8416 receivers, 24 AD1895 rate converters, an EP1C6 FPGA, an ADSP-21262 DSP and an ATmega128.</p>`, check:()=>true, auto:true},
  {title:'1 · Set the frame address', body:`<p>Each frame has a 4-bit address on SETUP SW1–SW4 (all ON = frame 1). Make this <b>frame 3</b>: SW1 ON, SW2 OFF, SW3 ON, SW4 ON.</p>`, check:()=>frameNo()===3, hint:'Click SW2 on the rear dip switch.'},
  {title:'2 · Reference level', body:`<p>SW5/SW6 choose the reference: ON/ON −20 dBFS … OFF/OFF −14 dBFS. Set <b>−18 dBFS</b> (SW5 OFF, SW6 ON) and watch the bars drop by two dB worth of LEDs.</p>`, check:()=>REF()===-18, hint:'Click SW5.'},
  {title:'3 · Loss of signal', body:`<p>Unplug AES input <b>5</b> on the rear. Pair 3’s pushbutton lights and GPO-1 goes active. Enable the audible alarm by setting <b>SW8 OFF</b> (${inf}: OFF = enabled, from the double inversion in the code), then press the lit pushbutton to silence it.</p>`, check:()=>!D.inputs[4].on&&silenceAudEn()&&D.ack[2], hint:'Click input 5 (upper row, fifth block), SW8, then pushbutton 3–4… the third button.'},
  {title:'4 · Silence detection', body:`<p>Plug input 5 back in. Select input 1 and tick <b>silent</b>, and input 2 too. Their pair counts silence for the delay (default ${INITIAL_DELAY} s from v101.c). Use <b>Skip +10 s</b> to reach it.</p>`, check:()=>D.inputs[4].on&&pairState(0)==='silence', hint:'Input selector 1 → silent; selector 2 → silent; Skip.'},
  {title:'5 · Redundant supplies', body:`<p>Click <b>PS2</b> to remove it. The meter keeps running (“will operate properly with only one supply”) but READ_ADC() raises PSU_alarm.</p>`, check:()=>!D.ps[1], hint:'Click the lower IEC inlet on the rear.'},
  {title:'Done', body:`<p>See <b>Software</b> for the ATmega loop and <b>Findings</b>.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__rlm242Active=true; tutorialView(m,{title:'Tutorial — commissioning an RLM24',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__rlm242Active=true;
  m.innerHTML=`${card('One second inside the RLM24-2',`<div id="tab"></div>`)}<div class="grid2">${card('At the playhead',`<div id="dev"></div>`)}${card('One TDM frame (chain 1: AD1895 U3, U5, U7, U10, U400…U406)',`<canvas id="tdm"></canvas>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#tab').innerHTML=tbl(['Event','per second','period','where'],[
      ['AES3 frames per input',D.inputs[D.sel].fs.toLocaleString(),SIM.fmtDur(1/D.inputs[D.sel].fs),'CS8416 recovers clock and data'],
      ['AES bits per input',(D.inputs[D.sel].fs*64).toLocaleString(),SIM.fmtDur(1/(D.inputs[D.sel].fs*64)),'biphase mark, 2 × 32 bits per frame'],
      ['TDM frames (all 3 chains)','48 000',SIM.fmtDur(1/48000),'LRCLK1/2/3 → FPGA; 8 converters × 2 ch × 32 bits'],
      ['TDM bits per chain','24 576 000',SIM.fmtDur(1/XTAL_AUDIO),'= the 24.576 MHz crystal: 512 bits × 48 kHz'],
      ['Samples into the DSP','2 304 000','—','48 channels × 48 kHz over DAI_P1…P20'],
      ['Meter updates (display)','≈ 25–50',SIM.fmtDur(0.02),'SHARC → FPGA → RLM24-1 LED drivers ('+inf+')'],
      ['PPM decay','—','3.0 s / 24 dB','manual'],
      ['Boot to first meter','—',BOOT.toFixed(1)+' s','main(): 18 × wait_ms(500) around CONFIGURE_ALTERA()']]);
    const i=D.sel, mm=D.power&&locked(i)?meter(i,t):{vu:-200,pk:-200};
    m.querySelector('#dev').innerHTML=kvt([['Time',SIM.fmtT(t),1],[`Input ${i+1} VU`,fdb(mm.vu)+' dBFS → LED '+clamp(segOf(mm.vu),0,NSEG),1],[`Input ${i+1} peak`,fdb(mm.pk)+' dBFS',1],['TDM frame / bit',`${Math.floor(t*48000)} / ${Math.floor((t*48000%1)*TDM_BITS)}`,1]]);
    const {c,w}=SIM.canvas(m.querySelector('#tdm'),120), ph=(t*48000)%1; c.font='9px sans-serif';
    for(let k=0;k<16;k++){ const x=10+k*(w-20)/16; c.fillStyle=k%2?SIM.css('--accent2'):SIM.css('--accent'); c.globalAlpha=.25+.5*(Math.floor(ph*16)===k); c.fillRect(x,20,(w-20)/16-2,40); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.fillText(`${['U3','U5','U7','U10','U400','U402','U404','U406'][k>>1]}${k%2?'R':'L'}`,x+2,75); }
    c.fillStyle=SIM.css('--play'); c.fillRect(10+ph*(w-20),14,2,52); c.fillStyle=SIM.css('--ink2'); c.fillText('each AD1895 passes TDM_IN (pin 20) to the next one’s TDM_OUT (pin 23): one 512-bit frame per 1/48 000 s',10,100); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:15,y:20,w:160,h:80,t:'24 AES inputs',s:['110 Ω (R1206) ×24','DS26LS32A ×7'],d:'Balanced AES through 110R terminations and quad line receivers (or 75 Ω via BNC rear boards).'},
  rx:{x:195,y:20,w:160,h:80,t:'CS8416 ×24',s:['AES receivers','shared SPI bus'],d:'CS8416_IN/CLK/OUT from the ATmega; CS8416_SEL1–4 from the FPGA pick chips; CS8416_RESET common.'},
  src:{x:375,y:20,w:170,h:80,t:'AD1895 ×24',s:['rate converters','3 TDM chains of 8'],d:'Every input is converted to the common 48 kHz; AD1895s daisy-chain TDM_IN→TDM_OUT (TDM1_2…TDM3_8) and MCLKOUT.'},
  fpga:{x:565,y:20,w:170,h:80,t:'EP1C6Q240 (U21)',s:['EPCS1 config','DAI_P1–P20 to DSP'],d:'Collects TDM1/2/3, generates MASTER_SRC_CLK, selects CS8416s, drives test points TP1–TP7 and the RS-485 TX enable (TX2_EN).'},
  dsp:{x:755,y:20,w:170,h:80,t:'ADSP-21262 (U1)',s:['boots from AT25F512A','VU + PPM + silence'],d:'BOOTCFG/CLKCFG from the FPGA; SHARC_RESET from the ATmega.'},
  avr:{x:375,y:140,w:170,h:90,t:'ATmega128 (U14)',s:['4.9152 MHz','v101.c'],d:'Reads SETUP (PIND), supplies (ADC), GPI-2; writes GPO-1/2; talks RS-485 at 102 400 baud; resets the other chips.'},
  disp:{x:755,y:140,w:170,h:90,t:'RLM24-1 displays ×2',s:['1008 LEDs, 12 buttons each','A6276 + FDC634'],d:'Display boards on the H headers (inferred path).'},
  net:{x:15,y:140,w:160,h:90,t:'RS-485 / RS-422',s:['ADM3485 ×3','DS26LS31C ×2'],d:'Control network daisy-chain to the central configuration panel.'},
};
const WIRES=[['in','rx',''],['rx','src','I²S'],['src','fpga','TDM ×3'],['fpga','dsp','DAI'],['dsp','disp',''],['avr','rx','SPI'],['avr','fpga',''],['net','avr','UART0'],['avr','dsp','reset']];
function viewBlock(m){ window.__rlm242Active=false; blockView(m,BLOCKS,WIRES,'src',[940,250],card('In one sentence',`<p>Twenty-four AES receivers feed twenty-four rate converters that share three 24.576 MHz TDM chains into a Cyclone FPGA; a SHARC computes VU, peak and silence for 48 channels, and an ATmega reads the switches, supplies and alarms and talks to the control network.</p>`)); }
const SHEETS=[
  {name:'1 · Named nets of the core', note:'From rlm24-2ISS2.net (P-CAD). The 17 schematic PDFs in RLM24-2/ are images.', svg:()=>
    chip(40,40,170,'U14 ATmega128',[['2 RXD0','CPU_RX'],['3 TXD0','CPU_TX'],['5','ALTERA_RESET'],['9','SHARC_RESET'],['11','CS8416_CLK'],['12','CS8416_IN'],['13','CS8416_OUT'],['18','AD1895_RESET'],['19','CS8416_RESET'],['25–32','DIP1–DIP8'],['4, 8','GPO2, GPO1']],[],'4.9152 MHz')
    +chip(330,40,170,'U21 EP1C6Q240',[['56','MASTER_SRC_CLK'],['59','LRCLK1'],['60','TDM1'],['116','TDM2'],['118','TDM3'],['65/67/73/75','CS8416_SEL1–4'],['216','TX2_EN']],[['121–162','DAI_P1…P20'],['160/161','CLKCFG0/1'],['162','BOOTCFG0'],['24/25/36/37','NCS/CNF_DATA/DCLK/ASDI']],'Cyclone')
    +chip(640,40,170,'U1 ADSP-21262',[['53…94','DAI_P1…P20'],['2/3/4','CLKCFG0/1, BOOTCFG0'],['121','SHARC_RESET']],[['125/126/127','SPICLK/MISO/MOSO'],['15','FLAG0_CS']],'boot: U2 AT25F512A')},
  {name:'2 · One input (×24)', note:'The same cell repeated 24 times (U2xx/U3xx/U4xx numbering).', svg:()=>
    net(20,100,'AES+ / AES−')+res(120,100,120,170,'R','110R')+chip(200,70,130,'DS26LS32A',[['in','AES']],[['out','AESn']],'¼ of a quad')+chip(420,60,140,'CS8416',[['1 RXP','AESn'],['9 RST','CS8416_RESET'],['15/16/17','SPI']],[['OSCLK/OLRCK/SDOUT','→ AD1895']],'receiver')
    +chip(650,60,150,'AD1895',[['in','I²S from CS8416'],['13 RST','AD1895_RESET'],['20 TDM_IN','previous']],[['23 TDM_OUT','next'],['24 LRCLK','LRCLKn'],['25 SCLK','SCLKn']],'SRC → 48 kHz')},
];
function viewSchem(m){ window.__rlm242Active=false; schemView(m,SHEETS,'RLM24-2 ISS2','Redrawn from the P-CAD netlist; pin numbers and net names are real.'); }
const LOOP=[['WDR()',''],['CS8416_READ_LOCK_ALL()','24 lock bits → Astatus'],['UART0_translate()','#F…A…T…D…$ frames'],['READ_ADC()','PS1/PS2 sense'],['ALTERA_TRANSLATE_UART0()',''],['ALTERA_SORT()',''],['ALTERA_read_write()','256-byte buffers'],['READ_FRAME_ADDRESS()','SW1–4'],['READ_CALIBRATION()','SW5–6'],['READ_ALARM_SETTINGS()','SW7–8'],['READ_GP_INPUTS()','GPI-2'],['TRANSLATE_INPUTS_ALARMS()','gp_outputs'],['WRITE_GP_OUTPUTS()','GPO-1/2']];
function viewSoft(m){ window.__rlm242Active=true; let hot=null;
  m.innerHTML=`${card('ATmega128 while(1) loop — v101.c (step follows the playhead, '+inf+': equal time per call; click a step)',`<div id="lp"></div>`)}<div class="grid2">${card('Alarm logic (TRANSLATE_INPUTS_ALARMS)',`<div id="al"></div>`)}${card('SETUP word on PIND',`<div id="pd"></div>`)}</div>`;
  const draw=()=>{ const run=Math.floor((SIM.t*400)%LOOP.length), h=hot==null?run:hot;
    m.querySelector('#lp').innerHTML=loopSVG(LOOP.map(r=>({t:r[0].replace('()',''),s:[r[1]]})),h,'main() after the 9 s start-up'); m.querySelectorAll('[data-step]').forEach(g=>g.onclick=()=>{ hot=+g.dataset.step; draw(); });
    const o=gpo(); m.querySelector('#al').innerHTML=tbl(['Condition','Value'],[['PSU_alarm & PSU enable (SW7)',`${psuAlarm()} & ${psuAlarmEn()}`],['silence flag (PINA bit 0) & audible enable (SW8)',`${anyPairAlarm()} & ${silenceAudEn()}`],['alarm_mute (GPI-2)',String(D.gpi2)],['gp_outputs',`0b${o.toString(2).padStart(2,'0')} (bit 0 GPO-1 OC, bit 1 audible)`]],true);
    const pind=D.dip.map((on,k)=>on?0:1<<k).reduce((a,b)=>a|b,0);
    m.querySelector('#pd').innerHTML=kvt([['PIND (switch ON = 0)','0b'+pind.toString(2).padStart(8,'0'),1],['frame = (PIND & 0x0F) + 1',String(frameNo()),1],['calibration = (PIND & 0x30) >> 4',String(calIdx()),1],['alarm_settings = (PIND & 0xC0) >> 6',String((pind>>6)&3),1]]); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__rlm242Active=false;
  m.innerHTML=card('What the RLM24-2 files show — findings',`<ol>
   <li><b>This folder is only machine data.</b> Three pick-and-place programs (top, an RLM12 build “-12-T”, bottom “2b-B”, 2008). The design is in <span class="mono">XXX - RLM - #Master #obsolete/…/RLM24-2</span>, whose 17 schematic PDFs are scanned images; the netlist is the readable source.</li>
   <li><b>The crystal is mislabelled.</b> The netlist value is “24.578M”. The TDM arithmetic needs exactly 24.576 MHz: 8 AD1895 × 2 channels × 32 bits × 48 kHz = 24.576 Mbit/s per chain.</li>
   <li><b>The UART is 12.5 % fast.</b> <span class="mono">uart0_init</span>: UBRR0L = 0x02 with the 4.9152 MHz crystal gives 102 400 baud; the ICCAVR comment says “desired baud rate:115200, actual baud rate:102400 (12.5%)”. It works only between WBS units built the same way.</li>
   <li><b>RS-422 or RS-485?</b> The manual’s network section says “RS-422 control network … daisy chain”, the specifications say RS-485 DB9; the board has both (3 × ADM3485, 2 × DS26LS31C, 7 × DS26LS32A).</li>
   <li><b>GPI-1 is not implemented.</b> <span class="mono">READ_GP_INPUTS</span>: “need altera for GPI 1”; only GPI-2 (alarm mute) is read. The GPI-1 mute block is commented out.</li>
   <li><b>Double inversion of the switches.</b> <span class="mono">READ_SWITCHES</span> inverts PIND and the callers invert it again, so the code works on raw PIND (ON = 0). The manual’s tables agree: all ON = frame 1, ON/ON = −20 dBFS.</li>
   <li><b>Long start-up.</b> main() waits 15 × 500 ms before configuring the FPGA and 3 × 500 ms after — about 9 s of dark meters at power-up.</li>
   <li><b>Defaults in code vs manual.</b> INITIAL_THRESHOLD 40 and INITIAL_DELAY 10; the code accepts thresholds 20–75 in 5 dB steps and delays up to 999 s, while the manual quotes 20 to −70 dB and 0–240 s.</li>
   <li><b>Typo in a function name.</b> <span class="mono">init_ADG1895()</span> initialises the AD1895 converters.</li>
   <li><b>A termination board was borrowed.</b> <span class="mono">TB8201AP-ISS2-RLM24-6</span> in the MF8200 termination folder: an MF8200 pluggable rear board re-used as the RLM24-6 input board.</li>
   <li><b>LED count.</b> The RLM24-1 display netlist has 528 green, 288 yellow and 192 red LEDs and 12 pushbuttons: 42 LEDs per bar (22/12/8) for 12 stereo pairs per board.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Bar scale: 52 dB over 42 LEDs with the top at reference + 20 dB (${inf}).</li><li>VU = 300 ms integration; peak = fast attack, 8 dB/s fall (manual “3.0 Second /24dB decay”).</li><li>SW7/SW8 OFF = alarm enabled (${inf} from the inversions; the manual only says Enable/Disable).</li><li>Pushbutton acknowledge silences only the audible alarm for that pair (manual).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>xxx - RLM24-2 - #Master/rlm24-2-T.prg, rlm24-2-12-T.prg, rlm24-2b-B.prg (+ .mdb)</li><li>XXX - RLM - #Master #obsolete/RLM - #OBSOLETE #Archive/RLM24-2/PCB/rlm24-2ISS2.net · RLM24-1/PCB/rlm24-1iss2.net · MANUAL/RLM12 RLM24 Manual.pdf · software/Atmel/RLM24/v101/v101.c</li><li>SILK/RLM24REARCURVE.cdr (→ assets/rlm24-2-rear-white.png)</li></ul>`); }
SIM.register({
  id:'rlm24-2', name:'RLM24-2 · main board of the RLM24 24-input AES meter (2004|37–2008|41)', duration:1, product:'RLM24-2', year:2004, family:'Obsolete products', folder:'#RLM #SERIES/xxx - RLM24-2 - #Master',
  summary:'The RLM24-2 is the main board of the RLM12/RLM24 rack meter: 24 AES receivers and rate converters in three 24.576 MHz TDM chains, a Cyclone FPGA, a SHARC DSP and an ATmega128 that reads the SETUP switches, supplies and alarms. The folder holds only pick-and-place data; this model uses the netlist, manual, rear silk and the ATmega v101.c source from the RLM archive.',
  highlights:['Rear silk with working SETUP dip switches, supplies, GPI-2 and 24 inputs','VU + peak bars with loss-of-signal and silence alarms','GPO/alarm logic from TRANSLATE_INPUTS_ALARMS()','TDM chain arithmetic (24.576 MHz) and the 102 400-baud link'],
  depth:'Hardware model',
  stepUnits:[{label:'10 ms',period:()=>0.01},{label:'1 TDM frame',period:()=>1/48000},{label:'1 TDM bit',period:()=>1/XTAL_AUDIO}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.001,'1 ms'],[2e-5,'20 µs (1 TDM frame)'],[2e-7,'200 ns']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
