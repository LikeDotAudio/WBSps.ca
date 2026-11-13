/* =====================================================================
   AMX6 — 6-input analog mixing audio monitor, Select Series (Ward-Beck Systems, 1998|31–2009|42)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: analog product, no code.

   Sources used (folder "#AMX #SERIES/XXX - AMX6 - #Master/AMX6 - #Engineering/"):
   - amx6.pdf / AMX6MANU.WPD (2000|33–2002|35 manual: 6 mono inputs, OFF…+9 dB input and master gain,
       T/R/S headset jack normalling the speaker feeds, +24 dBu, >20 kΩ in, 60 Ω out, 115 VAC 25 VA, 1RU)
   - AMX6.cdr = "AMX6 - #Functional #Manual.cdr" (2003|36 functional diagram, decoded with Inkscape)
   - SILK/AMX6SILK.CDR (front green + white and rear white separations, 1998-08-25) → Inkscape/libcdr plain SVG →
       assets/amx6-front.svg (green + white plates registered) and amx6-rear.svg (white plate), 200 px/in panel
       coordinates; drill crosshairs give the knob centres and are dropped from the art (artwork pass 2026|59)
   - Amx6manu.cdr (manual-cover drawing of both panels: speaker grilles, IEC, vents, terminal blocks)
   - AMX6.DSN (OrCAD 1998|31: 103 parts, LF353 ×6, TDA1521, TRANSFORMER; nets INPUT1-6, WIPER1-6, MASTER,
       HEADPHONE, TIP/RING/TIP-N/RING-N, LEFT, RIGHT, BRIDGE, LINE/NEUTRAL, VCC_BAR) and AMS6FUNC/AMS9FUNC.DSN
   - PCB/AMX6.PCB (Tango-PCB PLUS ASCII, 1999|32: placement, tracks, pads, value text) → assets/amx6-board.png;
       PCB/AMX9.PCB (compared byte by byte); PCB/AMX6-iss1.pcb + GERBERS/AMX6-ISS1.* (P-CAD 2002, 2009|42)
   - AMX6 - #Photo/AMX6 Front.jpg, AMX6 Rear.jpg (2008|41: black panel, green and white inks, green knobs)
   Everything about circuit values that is not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
function card(t,b,cls){ return `<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`; }
const ASSET = 'siumulation-plugins/assets/';
const SILK_SRC = '#AMX #SERIES/XXX - AMX6 - #Master/AMX6 - #Engineering/SILK/AMX6SILK.CDR';
const silkNote = side => `<p class="small muted">${side} artwork: ${SIM.src(SILK_SRC,'AMX6SILK.CDR')} (CorelDRAW 5, 1998|31), converted to SVG; ${side==='Front'?'green and white plates registered on the black panel':'white plate on the black panel'}. Controls sit on the drill crosshairs of the same sheet.</p>`;
const dbu2v = d => 0.7746*Math.pow(10,d/20);           // dBu -> V rms
const v2dbu = v => v>1e-9 ? 20*Math.log10(v/0.7746) : -200;
const sgn = x => (x>=0?'+':'') ;
const fdb = (d,n) => d<-150 ? '−∞' : (d>=0?'+':'−')+Math.abs(d).toFixed(n==null?1:n);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

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
const P = 'amx6';
const PW = 3420, PH = 330;                       // panel pixels: 200 px per inch, 17.1 in × 1.65 in
const RAIL = 21.8;                               // LF353 on ±15 V: ≈ ±13.5 V peak = +21.8 dBu (inferred rails)
const TDA_CLIP = 22.1;                           // TDA1521 on ±16 V (2200 µF / 25 V caps): ≈ 14 V peak (inferred)
const TDA_GAIN = 30;                             // TDA1521 fixed closed-loop gain (data-sheet figure)
const SPK_PAD = -16.8;                           // pad before the power amp so +4 dBu line ≈ 1 W — inferred
const KX = [1113,1314,1515,1714,1914,2114,2314], KY = 221;    // knob centres from the silk crosshairs
const TB_X = [2271,2376,2483,2589], TB_Y = [68,190];           // rear terminal blocks (silk "1 1 3 5 / 2 2 4 6")
const FACT = { power:true, ins:[{on:true,lvl:4,f:1000},{on:true,lvl:0,f:400},{on:false,lvl:4,f:250},{on:false,lvl:4,f:2000},{on:false,lvl:-6,f:150},{on:false,lvl:4,f:3150}],
  pots:[0.6,0.45,0.6,0.6,0.6,0.6], master:0.6, hdst:false, load:['10k','open'], wiring:'inferred' };
const D = JSON.parse(JSON.stringify(FACT)); D.log=[];
const LOADS = {open:1e9, '10k':1e4, '600':600};

/* ---------------- the circuit ---------------- */
// input/master pot: OFF … +9 dB. A log pot is modelled as 40·log10(rotation); unity at 0.6 of the travel (inferred)
const potDb = x => x<=0.004 ? -Infinity : Math.min(0, 40*Math.log10(x));
const gIn = i => potDb(D.pots[i]) + 9, gMaster = () => potDb(D.master) + 9;
const sumDb = arr => { const p=arr.filter(v=>v>-150).reduce((a,v)=>a+Math.pow(10,v/10),0); return p>0? 10*Math.log10(p) : -Infinity; };
const inLvl = i => (D.power && D.ins[i].on) ? D.ins[i].lvl : -Infinity;            // balanced dBu at the terminal
const rxLvl = i => inLvl(i) - 6;                                                     // U1–U3 receiver: 20K0 in / 10K0 feedback (inferred)
const busTerm = i => rxLvl(i) + potDb(D.pots[i]) + 15;                               // U4 summing amp: +15 dB → OFF…+9 overall
const busLvl = () => sumDb([0,1,2,3,4,5].map(busTerm));
const mstLvl = () => busLvl() + potDb(D.master) + 3;                                 // U5 after MASTER (single-ended)
const loadLoss = k => { const RL=LOADS[D.load[k]]; return 20*Math.log10(RL/(RL+60)); };   // 60 Ω balanced build-out
const lineLvl = k => D.power ? Math.min(mstLvl(),RAIL) + 6 + loadLoss(k) : -Infinity;      // balanced driver +6 dB
const rLvlSrc = () => D.wiring==='drawing' ? busLvl() : mstLvl();                    // right/ring feed: as drawn = bus, no MASTER
const spkLvl = side => (!D.power || D.hdst) ? -Infinity : Math.min((side? rLvlSrc():mstLvl()) + SPK_PAD + TDA_GAIN, TDA_CLIP);
const hdLvl = side => (!D.power || !D.hdst) ? -Infinity : Math.min(side? rLvlSrc():mstLvl(), RAIL) - 1;  // op-amp drives the phones (inferred −1 dB build-out)
const watts = side => { const v=dbu2v(spkLvl(side)); return v*v/8; };               // 8 Ω speakers (inferred)
const clipAt = () => { const c=[]; for (let i=0;i<6;i++){ if (rxLvl(i)>RAIL) c.push('IN'+(i+1)+' receiver'); } if (busLvl()>RAIL) c.push('mix bus U4'); if (mstLvl()>RAIL) c.push('master U5');
  [0,1].forEach(s=>{ if (!D.hdst && D.power && ((s? rLvlSrc():mstLvl())+SPK_PAD+TDA_GAIN)>TDA_CLIP) c.push('power amp '+(s?'R':'L')); }); return c; };
/* waveforms (volts) — each stage soft-limits at its rail */
const lim = (v, clipDbu) => { const L=dbu2v(clipDbu)*Math.SQRT2; return Math.abs(v)<L? v : Math.sign(v)*L; };
const ph = i => i*1.37;
function srcV(i,t){ const l=inLvl(i); return l<-150? 0 : dbu2v(l)*Math.SQRT2*Math.sin(2*Math.PI*D.ins[i].f*t+ph(i)); }
function rxV(i,t){ return lim(srcV(i,t)*0.5, RAIL); }
function busV(t){ let v=0; for (let i=0;i<6;i++){ const g=potDb(D.pots[i]); if (g>-150) v -= rxV(i,t)*Math.pow(10,(g+15)/20); } return lim(v, RAIL); }   // inverting summer
function mstV(t){ const g=potDb(D.master); return g<-150? 0 : lim(-busV(t)*Math.pow(10,(g+3)/20), RAIL); }
function lineV(k,t){ return D.power? 2*mstV(t)*Math.pow(10,loadLoss(k)/20) : 0; }
function spkV(s,t){ if (!D.power||D.hdst) return 0; const src = s && D.wiring==='drawing' ? -busV(t) : mstV(t); return lim(src*Math.pow(10,(SPK_PAD+TDA_GAIN)/20), TDA_CLIP); }
function hdV(s,t){ if (!D.power||!D.hdst) return 0; const src = s && D.wiring==='drawing' ? -busV(t) : mstV(t); return src*0.89; }
const envOf = lvl => { const f = ()=> lvl()<-150? 0 : dbu2v(lvl())*Math.SQRT2; const e=()=>f(); e.dense=(span,pw)=> span*1000 > pw/3; return e; };
/* power supply: toroid → 4 × 1N4003 bridge → 2200 µF per rail; ripple ΔV = I / (2 f C) */
const railCurrent = () => D.power ? 0.06 + (watts(0)+watts(1))/14 : 0;               // quiescent 60 mA + class-B draw (inferred)
const ripple = () => railCurrent()/(2*60*0.0044);                                     // two 2200 µF in parallel per rail on the PCB (C29–C32)

/* ---------------- actions ---------------- */
const act = makeActor(D, ()=>`bus ${fdb(busLvl())} dBu · line ${fdb(lineLvl(0))} dBu · ${D.hdst?'headset':'speakers'}`);
const A = {
  pot(i,dir){ act(`Turn INPUT LEVEL ${i+1} ${dir>0?'CW':'CCW'}`, tr=>{ D.pots[i]=clamp(+(D.pots[i]+dir*0.04).toFixed(3),0,1);
    tr(`IN${i+1} (TOCOS pot on the front board, via H1/H2 IDC16) — INPUT${i+1} on the pot top, WIPER${i+1} back to the summing resistor`);
    tr(`Input gain now ${isFinite(gIn(i))? fdb(gIn(i))+' dB' : 'OFF'} (manual: OFF to +9 dB) → contributes ${fdb(busTerm(i))} dBu to the mix bus`); }); },
  master(dir){ act(`Turn MASTER ${dir>0?'CW':'CCW'}`, tr=>{ D.master=clamp(+(D.master+dir*0.04).toFixed(3),0,1);
    tr(`MASTER pot → U5 master amplifier: gain ${isFinite(gMaster())? fdb(gMaster())+' dB':'OFF'}; line outputs ${fdb(lineLvl(0))} dBu`);
    tr(D.wiring==='drawing' ? 'As drawn in AMX6.cdr the right feed (jack ring / right speaker) is taken from the bus, so MASTER does not change it' : 'Both speaker feeds follow MASTER (inferred wiring)'); }); },
  hdst(){ act(D.hdst?'Unplug headset':'Plug headset into HEADSET', tr=>{ D.hdst=!D.hdst;
    tr(D.hdst? 'T/R/S plug opens the TIP-N and RING-N normals → the power-amp inputs lose their feed → both speakers mute (manual)' : 'Normals close again: TIP → TIP-N → left power amp, RING → RING-N → right power amp');
    tr(`HEADPHONE net: ${D.hdst? fdb(hdLvl(0))+' dBu on the tip':'no load'}`); }); },
  plug(i){ act(`${D.ins[i].on?'Unplug':'Plug'} INPUT ${i+1} (rear)`, tr=>{ D.ins[i].on=!D.ins[i].on; tr(`Pluggable 3-pin terminal (+ − G) for input ${i+1}: ${D.ins[i].on? D.ins[i].lvl+' dBu '+D.ins[i].f+' Hz source':'open — the receiver sees no signal'}`); }); },
  load(k){ const nx={open:'10k','10k':'600','600':'open'}[D.load[k]]; act(`OUTPUT ${k+1} load → ${nx==='open'?'open':nx+' Ω'}`, tr=>{ D.load[k]=nx; tr(`60 Ω balanced source into ${nx==='open'?'nothing':nx+' Ω'}: ${fdb(loadLoss(k),2)} dB`); }); },
  power(){ act(D.power?'Pull the power cord':'Plug in the power cord', tr=>{ D.power=!D.power; tr(D.power? '115 VAC → fuse (1 A slow-blow, rear silk) → toroid T1 (TE70062) → D1–D4 1N4003 → C29–C32 2200 µF / 25 V':'Rails collapse; LED1 goes out; all outputs silent'); }); },
  set(k,i,v,l){ act(l, tr=>{ D.ins[i][k]=v; tr(`Source on input ${i+1}: ${D.ins[i].lvl} dBu, ${D.ins[i].f} Hz`); }); },
  wiring(w){ act('Right feed → '+(w==='drawing'?'as drawn (bus)':'inferred (after MASTER)'), tr=>{ D.wiring=w; tr(w==='drawing'? 'AMX6.cdr: second amplifier fed straight from the mix bus → RING-N → right speaker':'Assumes both jack contacts carry the master output'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};

/* ---------------- panels ---------------- */
function knob(x,y,frac,cls,title,col){ const a=(-150+300*frac)*Math.PI/180, dx=Math.sin(a), dy=-Math.cos(a);
  return `<g class="${cls}" style="cursor:pointer"><title>${title}: click the right half to turn up, left half down (or use the wheel)</title><circle cx="${x}" cy="${y}" r="62" fill="transparent"/>
   <circle cx="${x}" cy="${y}" r="44" fill="${col}" stroke="#0b0c0d" stroke-width="4"/><circle cx="${x}" cy="${y}" r="34" fill="${col}" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
   <line x1="${x+dx*10}" y1="${y+dy*10}" x2="${x+dx*42}" y2="${y+dy*42}" stroke="#f2f2ee" stroke-width="7" stroke-linecap="round"/></g>`; }
function grille(cx,cy,level){ const w=600,h=196; let s=`<rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="6" fill="#0d0e0f" stroke="#2c2f33" stroke-width="3"/>`;
  const glow = level>-150 ? clamp((level+10)/32,0.05,1) : 0;
  if (glow) s+=`<ellipse cx="${cx}" cy="${cy}" rx="${120+glow*60}" ry="${70+glow*20}" fill="var(--accent)" opacity="${0.12+0.35*glow}" filter="url(#glowfront)"/>`;
  for (let r=0;r<9;r++) for (let c=0;c<30;c++){ const x=cx-w/2+14+c*19.7+(r%2?9:0), y=cy-h/2+14+r*21; if (x<cx+w/2-8) s+=`<circle cx="${x}" cy="${y}" r="6.5" fill="#1c1e20"/>`; }
  return s; }
function panelSVG(side, over){ const layers = [side];   // one SVG per side, cut from the CorelDRAW silk (plates registered and inked)
  return `<svg viewBox="0 0 ${PW} ${PH}" style="width:100%;max-width:1100px;display:block;border-radius:6px" role="img" aria-label="AMX6 ${side} panel">
   <defs><filter id="glowfront" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="${PW}" height="${PH}" rx="8" fill="var(--dev)"/>${over.under||''}${layers.map(l=>`<image href="${ASSET}${P}-${l}.svg" width="${PW}" height="${PH}"/>`).join('')}${over.over||''}</svg>`; }
function frontSVG(){
  const under = grille(432,162,spkLvl(0)) + grille(2994,162,spkLvl(1)) + [108,757,2668,3315].map(x=>screw(x,167)).join('');
  let over = led(867,220,D.power,'var(--led-g)',11);
  KX.forEach((x,i)=>{ over += i<6 ? knob(x,KY,D.pots[i],'k'+i,'INPUT LEVEL '+(i+1),'#1f8f4a') : knob(x,KY,D.master,'km','MASTER','#141516'); });
  over += `<g class="hd" style="cursor:pointer"><title>HEADSET T/R/S jack — click to ${D.hdst?'unplug':'plug in'} a headset</title><circle cx="2559" cy="171" r="58" fill="#0a0b0c" stroke="#55595c" stroke-width="5"/><circle cx="2559" cy="171" r="30" fill="#000"/>
    ${D.hdst?`<circle cx="2559" cy="171" r="44" fill="#2b5f9e"/><rect x="2545" y="171" width="28" height="160" fill="#2b5f9e"/>`:''}</g>`;
  return panelSVG('front',{under,over}); }
function rearSVG(){
  let under = iec(63,43,250,205) + `<rect x="88" y="214" width="137" height="70" rx="6" fill="#0c0d0e" stroke="#2c2f33" stroke-width="3"/>` + screw(1972,125);
  for (let g=0; g<2; g++) for (let k=0;k<7;k++) under += `<rect x="${1032+g*402+k*45}" y="62" width="18" height="200" rx="9" fill="#060708"/>`;
  under += `<g class="pwr" style="cursor:pointer"><title>IEC inlet — click to ${D.power?'pull':'plug in'} the power cord</title><rect x="63" y="43" width="187" height="162" fill="${D.power?'rgba(43,95,158,.55)':'transparent'}"/></g>`;
  let over = '';
  TB_X.forEach((x,c)=> TB_Y.forEach((y,r)=>{
    if (c===0){ over += phx(x,y,D.load[r]!=='open','ld'+r,`OUTPUT ${r+1} (+ − G, 60 Ω balanced): load ${D.load[r]==='open'?'none':D.load[r]+' Ω'} — click to change`); }
    else { const i=(c-1)*2+r; over += phx(x,y,D.ins[i].on,'pi'+i,`INPUT ${i+1} (+ − G): ${D.ins[i].on?'connected':'open'} — click to plug/unplug`); } }));
  over += screw(2241,125)+screw(2680,125);
  return panelSVG('rear',{under,over}); }
function bindPanel(root){
  for (let i=0;i<6;i++) bindTrim(root,'k'+i,d=>A.pot(i,d)); bindTrim(root,'km',d=>A.master(d));
  root.querySelectorAll('.hd').forEach(g=>g.onclick=()=>A.hdst()); root.querySelectorAll('.pwr').forEach(g=>g.onclick=()=>A.power());
  for (let i=0;i<6;i++) root.querySelectorAll('.pi'+i).forEach(g=>g.onclick=()=>A.plug(i));
  [0,1].forEach(k=>root.querySelectorAll('.ld'+k).forEach(g=>g.onclick=()=>A.load(k))); }
function controlsHTML(){ return `<div class="small" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 10px;margin-top:8px">${D.ins.map((s,i)=>`<label>IN${i+1} <input type="number" data-lv="${i}" value="${s.lvl}" step="1" style="width:52px"> dBu <select data-f="${i}">${[100,150,250,400,1000,2000,3150,10000].map(f=>`<option ${f===s.f?'selected':''}>${f}</option>`).join('')}</select> Hz</label>`).join('')}</div>
  <div class="small" style="margin-top:6px">Right feed: <select id="wr"><option value="inferred" ${D.wiring==='inferred'?'selected':''}>after MASTER (inferred)</option><option value="drawing" ${D.wiring==='drawing'?'selected':''}>from the bus, as drawn in AMX6.cdr</option></select></div>
  <div class="small muted">Front: click a knob's right or left half (or scroll). Click HEADSET to plug a headset. Rear: click a terminal block to plug or unplug that input, OUTPUT blocks to change the load, the IEC inlet for power. Keys 1–6 select an input, ↑/↓ turn it, M/N master, H headset.</div>`; }
function bindControls(root){ root.querySelectorAll('[data-lv]').forEach(e=>e.onchange=()=>{ const i=+e.dataset.lv; A.set('lvl',i,clamp(+e.value,-60,30),`Source IN${i+1} level → ${e.value} dBu`); });
  root.querySelectorAll('[data-f]').forEach(e=>e.onchange=()=>{ const i=+e.dataset.f; A.set('f',i,+e.value,`Source IN${i+1} → ${e.value} Hz`); });
  const w=root.querySelector('#wr'); if (w) w.onchange=()=>A.wiring(w.value); }
let selIn=0;
bindKeys('__amx6Active', ()=>({1:()=>selIn=0,2:()=>selIn=1,3:()=>selIn=2,4:()=>selIn=3,5:()=>selIn=4,6:()=>selIn=5,arrowup:()=>A.pot(selIn,1),arrowdown:()=>A.pot(selIn,-1),m:()=>A.master(1),n:()=>A.master(-1),h:()=>A.hdst()}));

/* ---------------- stages ---------------- */
function stageStats(){ const st=[];
  for (let i=0;i<6;i++) if (D.ins[i].on) st.push({name:`IN${i+1} receiver (½ LF353, ×0.5)`, gain:-6, lvl:rxLvl(i), clip:RAIL, note:`source ${D.ins[i].lvl} dBu bal. · pot ${isFinite(gIn(i))?fdb(gIn(i))+' dB':'OFF'}`});
  st.push({name:'Mix bus U4 (virtual earth, 10K0 per input)', gain:15, lvl:busLvl(), clip:RAIL, note:'sum of the six wipers (power sum of different tones)'});
  st.push({name:'MASTER + U5', gain:isFinite(gMaster())?gMaster()-9+3:null, lvl:mstLvl(), clip:RAIL});
  st.push({name:'LINE OUTPUT 1 (balanced, 60 Ω)', gain:6, lvl:lineLvl(0), clip:24, note:`load ${D.load[0]}`});
  st.push({name:'LINE OUTPUT 2 (paralleled)', gain:6, lvl:lineLvl(1), clip:24, note:`load ${D.load[1]}`});
  if (!D.hdst){ st.push({name:'Power amp L → left speaker (TDA1521)', gain:SPK_PAD+TDA_GAIN, lvl:spkLvl(0), clip:TDA_CLIP, note:`${watts(0).toFixed(2)} W into 8 Ω ${inf}`});
    st.push({name:`Power amp R → right speaker${D.wiring==='drawing'?' (fed from the bus)':''}`, gain:SPK_PAD+TDA_GAIN, lvl:spkLvl(1), clip:TDA_CLIP, note:`${watts(1).toFixed(2)} W`}); }
  else st.push({name:'HEADSET tip / ring (speakers muted)', gain:-1, lvl:hdLvl(0), clip:RAIL});
  return st; }

/* ---------------- timeline ---------------- */
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), w=SIM.css('--warn'); const L=[];
  L.push({label:'Mains 60 Hz', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/60,0,1/120,SIM.css('--ink2'),'positive half-cycles'); }});
  L.push({label:'Bridge D1–D4 charging C29–C32', h:20, draw(c,X,t0,t1,y,h){ if (!D.power) return; const wdt=Math.min(3e-3, 0.4e-3+railCurrent()*8e-3); SIM.pulses(c,X,t0,t1,y,h,1/120,1/240-wdt,wdt,w,'charge pulses'); }});
  L.push(waveLane(`+rail ripple, AC part (${(ripple()*1000).toFixed(0)} mV p-p)`, t=>{ if(!D.power) return 0; const ph=(t%(1/120))*120; return ripple()*(0.5-ph); }, -0.01, null, w, 30));
  for (let i=0;i<6;i++) if (D.ins[i].on) L.push(waveLane(`IN${i+1} after receiver (${D.ins[i].f} Hz)`, t=>rxV(i,t), -0.05, dbu2v(RAIL)*Math.SQRT2, b, 34, envOf(()=>Math.min(rxLvl(i),RAIL))));
  L.push(waveLane('Mix bus (U4 out)', busV, -0.05, dbu2v(RAIL)*Math.SQRT2, a, 40, (()=>{ const e=()=> busLvl()<-150?0:Math.min(dbu2v(Math.min(busLvl()+3,RAIL))*Math.SQRT2, dbu2v(RAIL)*Math.SQRT2); e.dense=(s,p)=>s*1000>p/3; return e; })()));
  L.push(waveLane('LINE OUTPUT 1 (balanced)', t=>lineV(0,t), -0.05, dbu2v(24)*Math.SQRT2, a, 40, envOf(()=>lineLvl(0))));
  if (!D.hdst){ L.push(waveLane('Left speaker (TDA1521)', t=>spkV(0,t), -0.2, dbu2v(TDA_CLIP)*Math.SQRT2, a, 40, envOf(()=>spkLvl(0))));
    L.push(waveLane('Right speaker', t=>spkV(1,t), -0.2, dbu2v(TDA_CLIP)*Math.SQRT2, a, 40, envOf(()=>spkLvl(1)))); }
  else L.push(waveLane('Headset tip', t=>hdV(0,t), -0.05, null, a, 40, envOf(()=>hdLvl(0))));
  L.push(boolLane('Power LED1', ()=>D.power, '#3fbf5f'));
  return L; }

/* ---------------- views ---------------- */
function viewSim(m){ window.__amx6Active=true;
  m.innerHTML=`${card('Front panel (real silkscreen, AMX6SILK.CDR)',`<div id="fp"></div>${silkNote('Front')}`)}${card('Rear panel',`<div id="rp"></div>${silkNote('Rear')}${controlsHTML()}`)}
   <div class="grid2">${card('What the circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('Now',`<div id="now"></div>`)}</div>
   ${card('Timeline — one second of the mains, the tones and every stage. Zoom to 10 ms or 1 ms to see single cycles.',`<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Stage by stage (levels in dBu)',`<div id="lv"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div>`;
  bindControls(m);
  const draw=()=>{ const fp=m.querySelector('#fp'); fp.innerHTML=frontSVG(); bindPanel(fp); const rp=m.querySelector('#rp'); rp.innerHTML=rearSVG(); bindPanel(rp);
    m.querySelector('#trace').innerHTML=traceHTML(D,'Turn a knob, plug the headset or click a rear terminal block.');
    const cl=clipAt();
    m.querySelector('#now').innerHTML=`<table class="kv"><tr><th>Power</th><td>${D.power?'on · LED1 lit':'off'}</td></tr><tr><th>Mix bus</th><td class="mono">${fdb(busLvl())} dBu</td></tr><tr><th>Line outputs</th><td class="mono">${fdb(lineLvl(0))} / ${fdb(lineLvl(1))} dBu</td></tr>
     <tr><th>Monitoring</th><td>${D.hdst? 'HEADSET (speakers muted by the jack normals)' : `speakers L ${watts(0).toFixed(2)} W · R ${watts(1).toFixed(2)} W`}</td></tr><tr><th>Clipping</th><td>${cl.length? `<b style="color:var(--bad)">${cl.join(', ')}</b>` : 'none'}</td></tr>
     <tr><th>Supply ripple</th><td class="mono">${(ripple()*1000).toFixed(0)} mV p-p at 120 Hz (${(railCurrent()*1000).toFixed(0)} mA per rail) ${inf}</td></tr></table>`;
    m.querySelector('#lv').innerHTML=stageTable(stageStats()); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the AMX6', body:`<p>The manual: “a versatile analog audio mixing monitor system … the monitoring and mixing of six mono audio signals. Front panel includes six independent level controls, one for each input, and a master level control. A convenient front panel mounted T/R/S headset jack … The speaker feeds are normalled through this jack to automatically mute the speakers when a headset is plugged in.”</p><p>It is one rack unit with two built-in speakers behind the grilles. Inputs and outputs are pluggable screw terminals on the rear.</p>`, check:()=>true, auto:true},
  {title:'1 · Power and wire input 1', body:`<p>Start over (button below) if you have been experimenting. On the <b>rear</b>, input 1 is the terminal block under the silk “1” in the second column (top row). Unplug it, then plug it back in, and watch the left speaker grille.</p>`, check:()=>D.ins[0].on && D.log.some(e=>e.name.startsWith('Unplug INPUT 1')), hint:'Click the green terminal block in column 2, top row, twice.'},
  {title:'2 · Set input 1 to unity', body:`<p>Turn <b>INPUT LEVEL 1</b> until its gain reads 0 dB (OFF to +9 dB range). The knob is at unity a little past twelve o'clock.</p>`, check:()=>Math.abs(gIn(0))<0.5, hint:'Click the right/left half of knob 1 or select it with key 1 and use ↑/↓.'},
  {title:'3 · Mix in input 2', body:`<p>Input 2 carries 0 dBu at 400 Hz. Bring <b>INPUT LEVEL 2</b> up to +3 dB so it sits above input 1 in the mix. The mix bus is a power sum: two equal tones add 3 dB.</p>`, check:()=>Math.abs(gIn(1)-3)<0.8, hint:'Knob 2, clockwise.'},
  {title:'4 · Line output at +4 dBu', body:`<p>The rear OUTPUT (+ − G, 60 Ω balanced) feeds the next device. Set <b>MASTER</b> so LINE OUTPUT 1 reads +4 dBu ±1 dB into its 10 kΩ load.</p>`, check:()=>Math.abs(lineLvl(0)-4)<1, hint:'Use M / N or click the black MASTER knob. Watch the “Now” card.'},
  {title:'5 · Plug the headset', body:`<p>Plug a headset into <b>HEADSET</b>. The jack's normals open and both speakers go quiet; the headset now gets the feeds.</p>`, check:()=>D.hdst && spkLvl(0)<-150, hint:'Click the HEADSET jack (or key H).'},
  {title:'6 · Find the headroom limit', body:`<p>Unplug the headset. Set input 1's source to <b>+24 dBu</b> (the manual's maximum) in the controls, and turn INPUT LEVEL 1 fully up. Something clips — the stage table shows where. Then turn it back down until nothing clips.</p>`, check:()=>D.ins[0].lvl>=24 && clipAt().length===0 && !D.hdst && gIn(0)>-20, hint:'At +24 dBu in, the mix bus (U4) only has room if input 1 is below about −2 dB.'},
  {title:'Done', body:`<p>See <b>Findings</b> for what the archive shows about this design (the corrupted AMX9.PCB copy, the two power amps on the PCB, the drawing's odd right-speaker feed).</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__amx6Active=true; tutorialView(m,{title:'Tutorial — operating the AMX6 (from the manual)',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${stageTable(stageStats())}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__amx6Active=false;
  m.innerHTML=`<div class="grid2">${card('What happens in one second',`<div id="rows"></div>`)}${card('At the playhead',`<div id="dev"></div>`)}</div>
   ${card('Line output 1, zoomed in steps around the playhead',`<canvas id="lad"></canvas>`)}${card('Speaker cone (left) — excursion follows the amplifier output',`<div id="cone"></div>`)}`;
  const draw=()=>{ const t=SIM.t, on=D.ins.map((s,i)=>[s,i]).filter(x=>x[0].on);
    const rows=[['Mains cycles','60','16.67 ms','115 VAC 60 Hz (manual)'],['Rectifier charge pulses','120','8.33 ms',`${(ripple()*1000).toFixed(0)} mV p-p ripple ${inf}`]].concat(on.map(([s,i])=>[`IN${i+1} tone cycles`, s.f.toLocaleString(), SIM.fmtDur(1/s.f), `${s.lvl} dBu at the terminal`]));
    m.querySelector('#rows').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">There is no clock or processor: every stage is continuous. The only periodic machinery is the mains and the bridge rectifier.</p>`;
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>${on.map(([s,i])=>`<tr><th>IN${i+1} receiver</th><td class="mono">${rxV(i,t).toFixed(3)} V</td></tr>`).join('')}
      <tr><th>Mix bus</th><td class="mono">${busV(t).toFixed(3)} V</td></tr><tr><th>Line out 1</th><td class="mono">${lineV(0,t).toFixed(3)} V</td></tr><tr><th>Speaker L / R</th><td class="mono">${spkV(0,t).toFixed(2)} / ${spkV(1,t).toFixed(2)} V</td></tr></table>`;
    drawLadder(m.querySelector('#lad'), t, [['Whole second',1],['100 ms',0.1],['10 ms',0.01],['1 ms',0.001]], tt=>lineV(0,tt), -0.1, 'LINE OUTPUT 1');
    const v=spkV(0,t), mx=dbu2v(TDA_CLIP)*Math.SQRT2, dx=v/mx*18;
    m.querySelector('#cone').innerHTML=`<svg viewBox="0 0 320 120" style="width:100%;max-width:420px"><rect x="40" y="20" width="30" height="80" fill="var(--panel2)" stroke="var(--line)"/><path d="M${70+dx} 30 L${150+dx} 6 L${150+dx} 114 L${70+dx} 90 Z" fill="var(--accent)" opacity=".7"/><text x="180" y="55" font-size="12" fill="var(--ink)">${v.toFixed(2)} V across 8 Ω</text><text x="180" y="75" font-size="11" fill="var(--ink2)">${D.hdst?'muted by the headset jack':watts(0).toFixed(2)+' W average'}</text></svg>`; };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:10,y:30,w:170,h:80,t:'INPUTS 1–6',s:['pluggable + − G','>20 kΩ balanced'],d:'Six balanced inputs on Phoenix-style 3-pin plugs (rear silk “+ − G”), four 2-row blocks on the rear terminal board.'},
  rx:{x:210,y:30,w:170,h:80,t:'Receivers U1–U3',s:['6 × ½ LF353','20K0 in / 10K0 fb'],d:'One differential receiver per input (DSN page1: U1–U3 LF353, R1–R25). Gain −6 dB inferred from the 10K0 / 20K0 values on the PCB.'},
  pot:{x:410,y:30,w:170,h:80,t:'INPUT LEVEL ×6',s:['front pot board','H1/H2 IDC16'],d:'TOCOS pots IN1–IN6 on the small front board (DSN PAGE2) reached through two 16-way ribbons; INPUTn goes up, WIPERn comes back.'},
  bus:{x:610,y:30,w:170,h:80,t:'Mix bus U4',s:['virtual earth','OFF…+9 dB'],d:'Summing amplifier: one 10K0 per wiper into a virtual-earth node (R26–R31 on the PCB).'},
  mst:{x:610,y:150,w:170,h:80,t:'MASTER + U5',s:['OFF…+9 dB'],d:'MASTER pot and the master amplifier. Its output feeds the line driver and the headset jack tip.'},
  line:{x:810,y:150,w:170,h:80,t:'LINE OUTPUT ×2',s:['60 Ω balanced','+24 dBu max'],d:'Balanced line driver; the rear OUTPUT column has two paralleled outputs (silk “1/2”).'},
  jack:{x:410,y:270,w:170,h:80,t:'HEADSET jack',s:['T/R/S, switched','TIP-N / RING-N'],d:'Stereo switched jack: the speaker feeds pass through its normals, so a plug mutes the speakers (manual).'},
  amp:{x:610,y:270,w:170,h:80,t:'Power amp',s:['TDA1521 (DSN U6)','U8/U9 on the PCB'],d:'Philips 2 × 12 W class-B amp, fixed 30 dB gain. The 1999 PCB has two TDA footprints and the DSN a BRIDGE net (see Findings).'},
  spk:{x:810,y:270,w:170,h:80,t:'Speakers L / R',s:['behind the grilles'],d:'Two small speakers in the 1RU front panel, one each side.'},
  psu:{x:10,y:270,w:170,h:80,t:'Power supply',s:['toroid TE70062','1N4003 ×4, 2200 µF ×4'],d:'115 VAC 60 Hz, 25 VA (manual). Toroid T1, bridge D1–D4, C29–C32 2200 µF/25 V, PANDUIT “PWR” connector.'},
};
const WIRES=[['in','rx','6×'],['rx','pot','INPUTn'],['pot','bus','WIPERn'],['bus','mst',''],['mst','line',''],['mst','jack','TIP'],['bus','jack','RING (as drawn)'],['jack','amp','TIP-N / RING-N'],['amp','spk','LEFT / RIGHT'],['psu','amp','rails']];
function viewBlock(m){ window.__amx6Active=false; blockView(m,BLOCKS,WIRES,'bus',[1000,370],card('In one sentence',`<p>Six balanced inputs go through their own level pots into one mix bus; a master control sets the line outputs and the feed to two built-in speakers, which a plugged headset takes over.</p><p class="small muted">Redrawn from AMX6.cdr (functional, 2003|36) and AMX6.DSN.</p>`)); }
const SHEETS=[
  {name:'1 · Input receivers (page1)', note:'AMX6.DSN page1: U1–U3 LF353 (two receivers each), R1–R25, C1–C12. Resistor values 10K0 / 20K0 / 22p are from the PCB value text; their exact positions are inferred.', svg:()=>{ let s=''; for (let i=0;i<3;i++){ const y=70+i*130;
      s+=net(20,y-12,'IN'+(i*2+1)+'+')+net(20,y+12,'IN'+(i*2+1)+'−')+res(70,y-12,150,y-12,'','')+res(70,y+12,150,y+12,'','')+txt(80,y-22,'20K0 ×2',10,'var(--ink2)')+wire([[150,y-12],[200,y-12]])+wire([[150,y+12],[200,y+12]])+opamp(200,y,'U'+(i+1)+'A LF353')+wire([[185,y-12],[185,y-45]])+res(185,y-45,275,y-45,'','')+txt(215,y-52,'10K0',10,'var(--ink2)')+wire([[275,y-45],[275,y]])+wire([[260,y],[300,y]])+net(306,y,'INPUT'+(i*2+1));
      s+=net(430,y-12,'IN'+(i*2+2)+'+')+net(430,y+12,'IN'+(i*2+2)+'−')+res(480,y-12,560,y-12,'','')+res(480,y+12,560,y+12,'','')+txt(490,y-22,'20K0 ×2',10,'var(--ink2)')+wire([[560,y-12],[610,y-12]])+wire([[560,y+12],[610,y+12]])+opamp(610,y,'U'+(i+1)+'B LF353')+wire([[595,y-12],[595,y-45]])+res(595,y-45,685,y-45,'','')+txt(625,y-52,'10K0',10,'var(--ink2)')+wire([[685,y-45],[685,y]])+wire([[670,y],[710,y]])+net(716,y,'INPUT'+(i*2+2)); }
    return s+txt(30,440,'Each receiver: balanced in, single-ended out at −6 dB (inferred), to the front pot board over H1.',11); }},
  {name:'2 · Front pot board (PAGE2)', note:'AMX6.DSN PAGE2: H1, H2 CON16, IN1–IN6 and MASTER (RV), LED1. On the PCB the pots read MASTER, IN6 … IN1 from left to right because the board is seen from behind the panel.', svg:()=>{ let s=chip(60,60,120,'H1 (CON16)',[],[['1','INPUT1'],['2','WIPER1'],['3','INPUT2'],['4','WIPER2'],['5','INPUT3'],['6','WIPER3'],['7','INPUT4'],['8','WIPER4']]);
    for (let i=0;i<7;i++){ const x=320+i*75; s+=`<rect x="${x-8}" y="120" width="16" height="70" fill="none" stroke="var(--ink)"/><path d="M${x+20} 165 L${x+9} 155" stroke="var(--ink)"/>`+wire([[x,100],[x,120]])+wire([[x,190],[x,215]])+gnd(x,215)+net(x-14,92,i<6?'INPUT'+(i+1):'MST_IN')+net(x+12,170,i<6?'WIPER'+(i+1):'MASTER')+txt(x-10,250,i<6?'IN'+(i+1):'MASTER',10); }
    return s+txt(320,300,'LED1 (power) ← +V through a resistor on the main board (inferred)',11)+txt(320,320,'H2 (CON16) carries the remaining wipers and MASTER back to the main board.',11); }},
  {name:'3 · Mix, master, outputs (PAGE3)', note:'AMX6.DSN PAGE3: U4, U5, U7 LF353, U6 TDA1521, nets HEADPHONE, TIP, RING, TIP-N, RING-N, LEFT, RIGHT, BRIDGE. The topology follows the functional drawing; component values are inferred.', svg:()=>{
    let s=''; for (let i=0;i<6;i++){ s+=net(20,60+i*24,'WIPER'+(i+1))+res(80,60+i*24,160,60+i*24,'','')+wire([[160,60+i*24],[190,60+i*24]]); }
    s+=wire([[190,60],[190,180]])+dot(190,120)+wire([[190,120],[230,120]])+opamp(230,132,'U4 LF353 (sum)')+res(230,120,290,80,'','')+txt(250,74,'Rf',10)+wire([[290,132],[330,132]]);
    s+=`<rect x="330" y="110" width="16" height="50" fill="none" stroke="var(--ink)"/>`+txt(300,180,'MASTER',10)+wire([[346,140],[380,140]])+opamp(380,152,'U5 LF353')+wire([[440,152],[500,152]])+dot(470,152);
    s+=res(500,152,580,152,'30R','')+res(500,190,580,190,'30R','')+net(590,152,'OUT +')+net(590,190,'OUT −')+txt(500,215,'balanced driver (×2 outputs paralleled)',10,'var(--ink2)');
    s+=wire([[470,152],[470,280],[520,280]])+net(526,280,'TIP')+net(526,300,'RING')+wire([[190,180],[190,320],[230,320]])+opamp(230,332,'U7 LF353')+wire([[290,332],[330,332],[330,300],[520,300]]);
    s+=`<rect x="610" y="260" width="20" height="60" fill="none" stroke="var(--ink)"/>`+txt(600,250,'HDST T/R/S',10)+net(640,275,'TIP-N')+net(640,305,'RING-N')+wire([[700,275],[720,275]])+wire([[700,305],[720,305]]);
    s+=`<rect x="720" y="250" width="90" height="80" fill="var(--panel2)" stroke="var(--ink)"/>`+txt(730,272,'U6 TDA1521',11)+txt(730,290,'2 × 12 W',10,'var(--ink2)')+net(820,270,'LEFT')+net(820,300,'RIGHT')+net(730,345,'BRIDGE (option?)');
    return s+txt(30,440,'As drawn in AMX6.cdr, U7 takes the bus directly, so the RING / right feed bypasses MASTER.',11); }},
  {name:'4 · Power supply', note:'Parts from the DSN (T1 TRANSFORMER, CON2/CON3, nets LINE/NEUTRAL, VCC_BAR, lead colours BLU GRY YEL RED ORG) and the PCB (TE70062 toroid, 4 × 1N4003, C29–C32 2200/25, “NOTE HEAT SINK REQ\'D”).', svg:()=>
    net(20,100,'LINE')+net(20,160,'NEUTRAL')+txt(20,80,'IEC + 1 A slow-blow fuse',10,'var(--ink2)')+wire([[70,100],[130,100]])+wire([[90,160],[130,160]])+`<rect x="130" y="80" width="80" height="100" rx="40" fill="none" stroke="var(--ink)"/>`+txt(132,200,'T1 TE70062 toroid',10)
    +['BLU','GRY','YEL','RED','ORG'].map((c,i)=>net(225,90+i*18,c)).join('')+`<path d="M320 90 l40 40 l-40 40 l-40 -40 z" fill="none" stroke="var(--ink)"/>`+txt(300,200,'D1–D4 1N4003',10)
    +wire([[360,130],[440,130]])+wire([[280,130],[260,130],[260,240],[440,240]])+cap(440,130,440,180,'C29/C31','2200µ/25')+cap(440,190,440,240,'C30/C32','2200µ/25')+dot(440,185)+gnd(440,185)
    +net(470,130,'+V (≈+16 V unloaded, inferred)')+net(470,240,'−V')+net(470,185,'AGND')+txt(30,440,'Ripple at 120 Hz grows with the power-amp current: ΔV = I / (2·60 Hz·4400 µF) — see the timeline lane.',11)},
];
function viewSchem(m){ window.__amx6Active=false; schemView(m,SHEETS,'AMX6','Sheets are redrawn from the net and part names in AMX6.DSN (OrCAD, 1998|31), the AMX6.PCB value text and the functional drawing — not the original CAD.'); }
const BOARD=[["C20","CAP200",756,367,29,18],["P2","IDC16M",814,420,116,43],["H2","IDC16M",390,77,131,36],["R25","R400",247,545,46,21],["LED1","LEDRA",1157,-5,20,43],["HDST","JACK1",291,20,87,115],["H1","IDC16M",727,100,133,36],["IN1","TOCOS",1024,0,41,71],["IN2","TOCOS",924,0,41,71],["IN3","TOCOS",824,0,41,71],["IN4","TOCOS",724,0,41,71],["IN5","TOCOS",624,0,41,71],["IN6","TOCOS",524,0,41,71],["MASTER","TOCOS",424,0,41,71],["C29","2200\\25",1142,216,66,82],["C30","2200\\25",1142,304,66,78],["C32","2200\\25",1067,304,66,78],["C31","2200\\25",1067,216,66,82],["R43","R400",600,255,62,21],["R44","R400",600,267,62,21],["R45","R400",725,317,21,66],["X7BCADCDCBAA","CAP100",752,302,21,16],["X1CCADCDCBAA","CAP100",732,302,21,16],["R46","R400",777,317,21,46],["U7","DIP8",737,316,36,55],["C19","CAP200",714,336,11,45],["C17","CAP200",614,336,11,47],["U6","DIP8",637,316,36,55],["R41","R400",677,317,21,61],["X1CCADCDCBA","CAP100",632,302,21,16],["X7BCADCDCBA","CAP100",652,302,21,16],["R40","R400",625,317,21,63],["C18","CAP200",673,297,29,18],["R42","R400",677,317,21,61],["R36","R400",582,317,21,63],["C16","CAP200",578,297,29,18],["R35","R400",530,317,21,63],["X7BCADCDCB","CAP100",557,302,21,16],["X1CCADCDCB","CAP100",537,302,21,16],["R37","R400",582,317,21,63],["U5","DIP8",542,316,36,55],["C15","CAP200",520,318,11,46],["R34","R400",554,467,46,28],["C14","CAP200",542,418,11,46],["P1","IDC16M",270,484,125,36],["R31","R400",422,550,63,21],["R30","R400",422,537,63,21],["R29","R400",422,525,63,21],["R28","R400",422,512,63,21],["R27","R400",422,500,63,21],["R26","R400",422,487,63,21],["C13","CAP200",457,436,18,29],["R32","R400",477,421,21,62],["X7BCADCDAADA","CAP100",504,422,21,16],["X1CCADCDAADA","CAP100",484,422,21,16],["R33","R400",530,421,21,62],["U4","DIP8",490,412,36,68],["U3","DIP8",404,340,36,63],["R22","R400",380,332,35,51],["X1CCADCDAAD","CAP100",424,382,21,16],["X7BCADCDAAD","CAP100",404,382,21,16],["R23","R400",430,332,23,51],["C11","CAP200",376,384,29,18],["R21","R400",372,337,28,46],["C12","CAP200",448,384,29,18],["R24","R400",452,337,21,46],["R20","R400",452,271,21,62],["R19","R400",442,271,21,62],["R17","R400",380,271,21,62],["R18","R400",390,271,21,62],["C9","CAP200",404,288,11,42],["C10","CAP200",430,283,11,46],["U2","DIP8",294,340,36,63],["R14","R400",270,332,35,51],["X1CCADCDAAC","CAP100",314,382,21,16],["X7BCADCDAAC","CAP100",294,382,21,16],["R15","R400",317,332,26,51],["C7","CAP200",266,384,29,18],["R13","R400",262,337,28,46],["C8","CAP200",338,384,29,18],["R16","R400",342,337,21,46],["R12","R400",342,271,21,62],["R11","R400",332,271,21,62],["R9","R400",270,275,21,58],["R10","R400",280,271,21,62],["C5","CAP200",294,288,11,42],["C6","CAP200",320,288,11,42],["C2","CAP200",210,288,11,42],["C1","CAP200",184,288,11,42],["R2","R400",170,275,21,58],["R1","R400",160,275,21,58],["R3","R400",222,275,21,58],["R4","R400",232,275,21,58],["R8","R400",232,337,21,46],["C4","CAP200",228,384,29,18],["R5","R400",152,337,28,46],["C3","CAP200",156,384,29,18],["R7","R400",212,332,21,51],["X7BCADCDAA","CAP100",184,382,21,16],["X1CCADCDAA","CAP100",204,382,21,16],["R6","R400",160,332,30,51],["U1","DIP8",184,340,36,63],["R48","R400",1394,572,65,21],["R49","R400",1527,557,65,21],["U8","TDA",1427,482,101,106],["U9","TDA",1257,482,101,106],["R52","R400",1200,524,21,66],["R53","R400",1185,524,21,66],["R50","R400",1412,647,68,21],["R51","R400",1484,647,65,21],["C24","CAP200",1483,644,51,11],["C23","CAP200",1427,644,45,11],["C334CAA","CAP100S",1478,575,22,21],["C21","470\\50",1415,592,63,51],["C22","470\\50",1482,590,57,53],["C26","470\\50",1312,592,72,51],["C25","470\\50",1240,592,68,51],["C334CA","CAP100S",1308,575,22,21],["C28","CAP200",1257,644,45,11],["C27","CAP200",1313,644,49,11],["R55","R400",1314,647,65,21],["R54","R400",1264,647,46,21],["H7AAACE","H2X3RA",547,190,31,36],["H7AAACD","H2X3RA",495,190,31,36],["H7AAACA","H2X3RA",442,190,31,36],["JP1ABBAA","JP3",55,125,31,11],["JP2ABBAA","JP3",55,115,31,11],["TB2AA","PHEN3P",44,84,51,28],["TB1AA","PHEN3P",44,14,51,46],["TB1AAA","PHEN3P",97,14,51,46],["TB2AAA","PHEN3P",97,84,51,28],["JP2ABBAAA","JP3",107,115,31,11],["JP1ABBAAA","JP3",107,125,31,11],["TB1AAB","PHEN3P",150,14,51,46],["TB2AAB","PHEN3P",150,84,51,28],["JP2ABBAAB","JP3",160,115,31,11],["JP1ABBAAB","JP3",160,125,31,11],["TB1AAC","PHEN3P",202,14,51,46],["TB2AAC","PHEN3P",202,84,51,28],["JP2ABBAAC","JP3",212,115,31,11],["JP1ABBAAC","JP3",212,125,31,11],["H7AAAC","H2X3RA",390,190,31,36],["D3","D400",1222,367,17,46],["D4","D400",1237,367,23,46],["D2","D400",1237,417,17,58],["D1","D400",1222,417,17,58],["R38","R400",530,237,21,46],["R39","R400",540,237,28,46],["T1","TOROID",1250,169,307,265],["RIGHT","PAN256",1387,617,33,43],["LEFT","PAN256",1545,587,33,46],["PWR","PAN356",1565,345,33,61],["MONO","PAN256",1205,617,41,36]];
let selPart=null;
function boardSVG(){ const W=1620,H=680; let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#123f25;border-radius:6px"><image href="${ASSET}${P}-board.png" width="${W}" height="${H}"/>`;
  BOARD.forEach(([r,p,x,y,w,h])=>{ const hot=r===selPart; s+=`<rect class="bp" data-r="${r}" x="${x}" y="${Math.max(0,y)}" width="${Math.max(w,8)}" height="${Math.max(h,8)}" fill="${hot?'rgba(255,220,80,.35)':'transparent'}" stroke="${hot?'#ffd84a':'none'}" stroke-width="2" style="cursor:pointer"><title>${r} · ${p.replace(/\\/g,'/')}</title></rect>`; });
  return s+`<text x="12" y="${H-8}" font-size="13" fill="#e8f0e8">AMX6.PCB (Tango-PCB, 1999|32): rear terminal board (top left), front pot board (top), main board. Orange = component side, blue = solder side.</text></svg>`; }
const PARTS={U1:'LF353 receivers IN1/IN2',U2:'LF353 receivers IN3/IN4',U3:'LF353 receivers IN5/IN6',U4:'LF353 summing amplifier (mix bus)',U5:'LF353 master amplifier / line driver',U6:'LF353 (PCB numbering differs from the DSN)',U7:'LF353 second amplifier (ring / right feed)',U8:'TDA power amplifier (footprint “TDA”)',U9:'second TDA power amplifier — the DSN has only one (U6 TDA1521)',T1:'TOROID footprint, TE70062 transformer',HDST:'T/R/S switched headset jack',MASTER:'MASTER pot (TOCOS)',LED1:'power LED',P1:'IDC16 ribbon to the rear terminal board',P2:'IDC16 ribbon',H1:'IDC16 to the pot board',H2:'IDC16 to the pot board',LEFT:'PAN256 speaker connector (left)',RIGHT:'PAN256 speaker connector (right)',MONO:'PAN256 “MONO” connector — not in the functional drawing',PWR:'PAN356 mains / transformer connector'};
function viewSoft(m){ window.__amx6Active=true; let hot=2;
  m.innerHTML=`${card('No firmware — the signal path, stage by stage (click a stage)',`<div id="f"></div><div id="det" class="small" style="margin-top:6px"></div>`)}
   ${card('Headset jack normals (live)',`<div id="jk" style="max-width:420px"></div>`)}${card('The boards (click a part)',`<div id="bd"></div><div id="pi" class="small" style="margin-top:6px"></div>`)}`;
  const draw=()=>{ const st=[{t:'Inputs',s:[D.ins.filter(x=>x.on).length+' connected']},{t:'Receivers',s:['−6 dB',fdb(Math.max(...[0,1,2,3,4,5].map(rxLvl)))+' max'],bad:[0,1,2,3,4,5].some(i=>rxLvl(i)>RAIL)},{t:'Pots + U4 bus',s:[fdb(busLvl())+' dBu'],bad:busLvl()>RAIL},{t:'MASTER + U5',s:[fdb(mstLvl())+' dBu'],bad:mstLvl()>RAIL},{t:'Line out ×2',s:[fdb(lineLvl(0))+' dBu bal.']},{t:D.hdst?'Headset':'TDA1521 → spk',s:[D.hdst?fdb(hdLvl(0))+' dBu':watts(0).toFixed(2)+' W'],bad:clipAt().some(c=>c.startsWith('power'))}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=['Six pluggable 3-pin terminals (+ − G), up to +24 dBu each (manual).','Differential receivers U1–U3 (LF353): 20K0 in, 10K0 feedback → −6 dB, >20 kΩ input (inferred from PCB values).','Each pot (OFF…) feeds a 10K0 summing resistor into U4; U4 gain +15 dB so a fully-up pot is +9 dB overall.','MASTER pot then U5 (+3 dB): OFF…+9 dB as the manual says.','Balanced driver: +6 dB single-ended → balanced, 30R per leg (60 Ω output impedance).',`Pad ${SPK_PAD} dB (inferred) into the TDA1521's fixed 30 dB: +4 dBu on the line ≈ 1 W per speaker.`][hot];
    const nTip = !D.hdst, j=`<svg viewBox="0 0 420 150" style="width:100%"><rect x="160" y="20" width="40" height="110" fill="var(--panel2)" stroke="var(--ink)"/><text x="148" y="14" font-size="11" fill="var(--ink)">HDST</text>
      <text x="10" y="45" font-size="11" fill="var(--ink)">TIP ← U5 master</text><text x="10" y="105" font-size="11" fill="var(--ink)">RING ← ${D.wiring==='drawing'?'U7 (bus)':'U5 (inferred)'}</text>
      <line x1="120" y1="40" x2="160" y2="40" stroke="var(--ink)"/><line x1="120" y1="100" x2="160" y2="100" stroke="var(--ink)"/>
      <line x1="200" y1="40" x2="${nTip?250:240}" y2="${nTip?55:30}" stroke="${nTip?'var(--accent)':'var(--bad)'}" stroke-width="3"/><line x1="200" y1="100" x2="${nTip?250:240}" y2="${nTip?115:90}" stroke="${nTip?'var(--accent)':'var(--bad)'}" stroke-width="3"/>
      <text x="260" y="60" font-size="11" fill="var(--ink)">TIP-N → amp L</text><text x="260" y="120" font-size="11" fill="var(--ink)">RING-N → amp R</text>${D.hdst?`<rect x="150" y="60" width="60" height="20" fill="#2b5f9e"/><text x="214" y="76" font-size="10" fill="var(--ink2)">plug in: normals open</text>`:''}</svg>`;
    m.querySelector('#jk').innerHTML=j+`<button id="jb">${D.hdst?'Unplug':'Plug'} headset</button>`; m.querySelector('#jb').onclick=()=>A.hdst();
    m.querySelector('#bd').innerHTML=boardSVG(); m.querySelectorAll('.bp').forEach(g=>g.onclick=()=>{ selPart=g.dataset.r; draw(); });
    const b=BOARD.find(x=>x[0]===selPart); m.querySelector('#pi').innerHTML= b? `<b>${b[0]}</b> · footprint ${b[1].replace(/\\/g,'/')} · ${PARTS[b[0]]||(b[0][0]==='R'?'resistor':b[0][0]==='C'?'capacitor':b[0].startsWith('TB')?'pluggable terminal header':b[0].startsWith('JP')?'3-pin jumper (purpose not documented)':b[0][0]==='D'?'1N4003 bridge diode':'')}` : '<span class="muted">Click a part on the board.</span>'; };
  SIM.on('time',draw); }
function viewNotes(m){ window.__amx6Active=false;
  m.innerHTML=card('Findings',`<ol>
   <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src(SILK_SRC,'SILK/AMX6SILK.CDR')} (1998-08-25).</b> One 17 × 11 in sheet holds three plates: front GREEN (logo, model name, the two rules beside INPUT LEVEL and the long base bar), front WHITE (INPUT LEVEL, 1–6, MASTER, HEADSET, SELECT SERIES) and rear WHITE. The plates register on their drill crosshairs: seven knob centres 1.00 in apart, a small one at the power-LED hole and one at the HEADSET jack; the rear has three screw crosshairs. There is no IEC, speaker-grille or terminal-block outline on the sheet, so those are still drawn from the photos and <span class="mono">Amx6manu.cdr</span>. The sheet's date (Aug 1998|31) is a year before the Tango PCB (Jun 1999|32). An identical copy sits in ${SIM.src('#AMX #SERIES/XXX - AMX6 - #Master/AMX6 - #Engineering/AMX6 - #SILK/AMX6SILK.CDR','AMX6 - #SILK/')}.</li>
   <li><b>AMX9.PCB is not an AMX9 board.</b> <span class="mono">PCB/AMX9.PCB</span> is the same Tango-PCB file as <span class="mono">AMX6.PCB</span> (124,591 bytes each) except for two corrupted bytes: a value text reads <span class="mono">"10K0 �"</span> and one board-outline endpoint changed from 2000 to 20 mil. It is a damaged copy, not a nine-input layout.</li>
   <li><b>Two power amplifiers on the PCB, one in the schematic.</b> AMX6.DSN (1998|31) places a single <span class="mono">U6 TDA1521</span>; the 1999|32 PCB has <span class="mono">U8</span> and <span class="mono">U9</span> with footprint “TDA” and a “NOTE HEAT SINK REQ'D” text. The DSN also has a <span class="mono">BRIDGE</span> net, which suggests each speaker could be driven bridged (BTL) by its own TDA1521 ${inf}.</li>
   <li><b>LF353 in the schematic, “5532” on the board.</b> All seven op-amps in the DSN are LF353, but the PCB carries a <span class="mono">5532</span> value text — a part change after the schematic.</li>
   <li><b>The functional drawing bypasses MASTER for the right side.</b> In <span class="mono">AMX6.cdr</span> the second amplifier is fed from the mix bus, before MASTER, and drives the jack ring and the right speaker. Either the drawing is simplified or the right speaker really ignores MASTER. Switch the “Right feed” option on the Simulator tab to hear the difference.</li>
   <li><b>The manual's symbols were lost in the PDF.</b> <span class="mono">amx6.pdf</span> prints “20kS” and “60S” where the WordPerfect source has Ω, and “Noise better than 85 dBu” has lost its minus sign.</li>
   <li><b>An extra “MONO” connector.</b> The PCB has PAN256 connectors <span class="mono">LEFT</span>, <span class="mono">RIGHT</span> and <span class="mono">MONO</span>; the manual and drawing only know two speakers.</li>
   <li><b>Undocumented jumpers.</b> Eight 3-pin jumpers (JP1/JP2 pairs) sit beside the rear terminal blocks. No document says what they do ${inf}: per-input ground or shield lift is a common use.</li>
   <li><b>The pot board reads backwards.</b> On the PCB the pots run MASTER, IN6 … IN1 from left to right, because the board is drawn from its component side behind the panel.</li>
   <li><b>Library leftovers.</b> AMX6.DSN loads <span class="mono">C:\\PROJ\\PHASE3\\RS81S\\RS81S.OLB</span>, <span class="mono">DA_RECVM.OLB</span> and <span class="mono">MX6.OLB</span>: symbols were borrowed from the RS81S project and a DA receiver design.</li>
   <li><b>Three generations of the same board.</b> Tango <span class="mono">AMX6.PCB</span> (Jun 1999|32) → P-CAD 2002 <span class="mono">AMX6-iss1.pcb</span> with Gerbers written <span class="mono">Mon Jan 12 2009</span> from <span class="mono">H:\\AMX\\amx6\\</span> → a 2015|48 <span class="mono">accel_uc.log</span> from opening it again.</li>
   <li><b>Duplicates.</b> <span class="mono">SILK/</span> = <span class="mono">AMX6 - #SILK/</span>, <span class="mono">PCB/</span> = <span class="mono">AMX6 - #PCB/</span>, the photos appear twice, and <span class="mono">AMX6.cdr</span> is byte-identical to <span class="mono">AMX6 - #Functional #Manual.cdr</span>. <span class="mono">AMS6FUNC.DSN</span> and <span class="mono">AMS9FUNC.DSN</span> are the AMX6 and AMX9 functional schematics under an older “AMS” name.</li>
   <li><b>The 1 A fuse is generous.</b> The manual says 25 VA; the rear silk says “115 VAC, 1 A.S.B”. At 115 V, 25 VA is about 0.22 A, so the fuse covers the toroid's inrush ${inf}.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Pot law 40·log10(rotation), unity at 60 % travel; receiver −6 dB, U4 +15 dB, U5 +3 dB, balanced driver +6 dB — chosen to meet the manual's OFF…+9 dB figures and the PCB resistor values (${inf}).</li><li>±15 V op-amp rails (+21.8 dBu clip), ±16 V TDA rails, 8 Ω speakers, a −16.8 dB pad before the power amp (${inf}).</li><li>Quiescent current 60 mA per rail and the ripple formula (${inf}).</li><li>Panel positions: silkscreen and its drill crosshairs; grille, IEC and vent positions scaled from the manual-cover drawing <span class="mono">Amx6manu.cdr</span>; panel size 17.1 × 1.65 in like the other Select Series 1RU panels (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>AMX6 - #Engineering/amx6.pdf · AMX6MANU.WPD · AMX6.cdr · Amx6manu.cdr · SILK/AMX6SILK.CDR</li><li>AMX6.DSN · AMS6FUNC.DSN · AMS9FUNC.DSN</li><li>PCB/AMX6.PCB · PCB/AMX9.PCB · PCB/AMX6-iss1.pcb · PCB/GERBERS/AMX6-ISS1.* · PCB/accel_uc.log</li><li>AMX6 - #Photo/AMX6 Front.jpg · AMX6 Rear.jpg</li></ul>`); }
SIM.register({
  id:'amx6', name:'AMX6 · 6-input mixing audio monitor ('+SIM.year(1998)+')', duration:1, product:'AMX6', year:1998,
  family:'Obsolete products', folder:'#AMX #SERIES/XXX - AMX6 - #Master',
  summary:'A 1RU Select Series monitor that mixes six balanced mono inputs, each with its own OFF…+9 dB level control, into a master-controlled line output and two built-in speakers; a T/R/S headset jack mutes the speakers. Analog only: the model follows every stage from the 1998 OrCAD schematic, the 1999 PCB and the manual.',
  highlights:['Real front and rear silkscreen with working knobs, headset jack and rear terminals','Six tones mixed stage by stage with headroom and clipping','Power-amp output, speaker mute and 120 Hz supply ripple over one second','PCB view rendered from the 1999 Tango file','Findings: a corrupted AMX9.PCB copy and two power amps where the schematic has one'],
  depth:'Hardware model',
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'1 mains cycle',period:()=>1/60},{label:'1 cycle of IN1',period:()=>1/D.ins[0].f},{label:'10 µs',period:()=>1e-5}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1/60,'1 mains cycle'],[0.005,'5 ms'],[0.001,'1 ms'],[0.0002,'200 µs']], defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Signal path (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
