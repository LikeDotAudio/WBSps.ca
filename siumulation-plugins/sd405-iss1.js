/* =====================================================================
   Sd405 - ISS1 — SD405 issue 1: Serialboxx SDI audio muxer (embedder) card, schematic snapshot of May 2003 (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model of the issue 1 schematic.

   Sources used:
   - #SERIALBOX #SERIES/SERIALBOXX - #SD400/SD405/Sd405 - ISS1/Sd405ISS1.net (P-CAD netlist, 26 May 2003 — every part and named net quoted here),
       Sd405ISS1.ECO (26 May 2003 edits, path U:\DOUG\Sd405ISS1.sch), Sd405ISS1.sch(.md: title “2 GROUP AUDIO MUX”, ISS.2)
   - #SERIALBOX #SERIES/SERIALBOXX - #SD400/SD405/:
       Sd405ISS1.net (27 May 2003, one day later — compared below), SD405MAN.wpd (SD405A manual: DIP table, tallies, specs),
       Software/v100/sd405v0.asm (June 2, 2003 “SD405 Analog and Digital 2 Group Muxer”: MAIN, read_jumpers, process, refresh_leds,
       check_aes3/4, check_video, check_calibration, refreshgs9023_2, readgs9023s, refresh8420_1/2, read8420s), v100/ad.asm, Software/v106
   - Video timing: SMPTE 259M / ITU-R BT.656, SMPTE 272M audio packets (general knowledge, marked inferred)
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
/* ---------- shared helper kit (inlined; the same code appears in each of these plugin files) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
function card(t,b,cls){ return `<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`; }
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: preload the CorelDRAW SVGs once, so panels that are re-rendered every frame never show them half-loaded */
const ART_PRELOAD = ["sd405-iss1-rear.svg"].map(n=>{ const i=new Image(); i.src=ASSET+n; return i; });
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
const XTAL = 4.9152e6, TCY = 4/XTAL;                // X2 4.9152 on the netlist; PIC16F874
const STD = { NTSC:{name:'525/270 (NTSC D1)', line:1/15734.264, field:1001/60000, lines:525, addr:0x81}, PAL:{name:'625/270 (PAL D1)', line:64e-6, field:1/50, lines:625, addr:0x85} };
const GROUPS = [[0xEF,0x8F],[0xCD,0x8E],[0xAB,0x8D],[0x89,0x8C]];   // process: set21…set24 → addr23 (audio packet DID), addr24 (control packet DID)
/* SD405A manual DIP table: SW1/SW2 group, SW3 analog/AES 1, SW4 mux 1 enable, SW5 analog/AES 2, SW6 mux 2 enable, SW7 standard, SW8 cascade */
const D = { power:true, sdi:true, std:'NTSC', sw:[true,false,true,true,false,true,false,true], aes:[true,true], ana:[true,true], lvl:[-20,-20], existing:true, calAt:-1, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const S=()=>STD[D.std];
const group = ()=> 1 + (D.sw[0]?1:0) + (D.sw[1]?2:0);
const isAes = k => D.sw[k?4:2];                    // SW3 / SW5: 1 = AES
const muxOn = k => D.sw[k?5:3];                    // SW4 / SW6
const cascade = ()=> D.sw[7];
const stdSel = ()=> D.sw[6]?'PAL':'NTSC';
const cd = ()=> D.power && D.sdi;                  // CLC016 CD → U12-36 (net CD)
const stdLock = ()=> cd() && stdSel()===D.std;      // GS9023 standard lock (lock_9023,4)
const videoOK = ()=> cd() && stdLock();
const CAL_T = 8*0.15;                               // check_calibration: CAL pulse + 7 idelay calls (idelay length inferred ≈ 150 ms)
const calibrating = t => D.calAt>=0 && t>=D.calAt && t<D.calAt+CAL_T;
const aesLock = k => D.power && isAes(k) && D.aes[k];
const audioLed = k => D.power && (aesLock(k) || (!isAes(k)&&D.ana[k]&&videoOK()));
function errorLed(t){ if(!D.power) return false; if(calibrating(t)) return true; if(!videoOK()) return true;
  if (!isAes(0)||!isAes(1)) return false; return false; }     // refresh_leds: lock-mismatch check only when both channels are AES (no mismatch modelled)
const leds = t => calibrating(t) ? [true,true,true,true] : [videoOK(), audioLed(0), audioLed(1), errorLed(t)];
/* ---------------- actions ---------------- */
const act=makeActor(D, ()=>`CD ${videoOK()?'●':'○'} · group ${group()} · ${cascade()?'cascade':'strip'} · ${stdSel()}`);
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power){ D.calAt=SIM.t; tr('P1 V+ (+21 V) → F1 RXE050 → REG1 LM2596 (+5V) → REG2 LM1117-3.3 (3V); X2 4.9152 MHz → U12 PIC16F874'); tr('MAIN: bsf portc,1 (take the 8420s and 9023s out of reset); read_jumpers → process → refresh_leds …'); } else tr('All tallies dark; SDI outputs stop'); }); },
  sdi(){ act(D.sdi?'SDI input removed':'SDI input connected', tr=>{ D.sdi=!D.sdi; tr('IN+ (P1-A1) → L7 18nH → U1 CLC014 adaptive cable EQ → U2 CLC016 reclocker (CD on pins 19/28 → U12-36) → U5 CLC011 decoder → D0–D9 → U9 GS9023');
    if(D.sdi){ D.calAt=SIM.t; tr('refresh_leds: video_error,7 = 1 → CD led; calibration,0 cleared → check_video sets calibration,1 → check_calibration: all four LEDs on, CAL pin (porte,0) pulsed for the CS5394 ADCs (manual: “When all four leds are illuminated the card is in calibration mode”)'); }
    else tr('lock_9023,0 (cd) clear → video_error → ERROR led and error tally; calibration,0 set so the ADCs recalibrate when video returns'); }); },
  dip(k){ act(`SW${k+1} → ${D.sw[k]?'0 (OFF)':'1 (ON)'}`, tr=>{ D.sw[k]=!D.sw[k];
    const desc=['SW1 group LSB','SW2 group MSB','SW3 analog/AES 1','SW4 audio 1 muxer enable','SW5 analog/AES 2','SW6 audio 2 muxer enable','SW7 SDI standard','SW8 cascade'][k];
    tr(`${desc} (SD405A manual). SW1 is read by the PIC through U20 74HC165 (SCK shared with the 8420 bus) in read_jumpers`);
    if(k<2){ const g=GROUPS[group()-1]; tr(`process: set2${group()} → addr23 = 0x${g[0].toString(16).toUpperCase()} (audio packet DID), addr24 = 0x${g[1].toString(16).toUpperCase()} (control packet DID) → written to U9 GS9023 by refreshgs9023_2`); }
    if(k===2||k===4) tr(`aes${k===2?1:2},0 = ${isAes(k===2?0:1)?'0 (digital)':'1 (analog)'}; audio_source${k===2?1:2} (ad.asm) loads cs8420reg3/4 ${isAes(k===2?0:1)?'defaults (AES in, SRC to video-locked 48 kHz)':'“swclk” values: CS5394 ADC as the source'} — only before calibration completes (btfsc delay_setup,7)`);
    if(k===6) tr(`ntsc525d1 / pal625: addr20 = addr0 = 0x${S().addr.toString(16)} → GS9023 standard; the input is ${D.std} — ${stdSel()===D.std?'standard lock':'no standard lock → ERROR (“wrong SDI standard selected”)'}`);
    if(k===7) tr(`jumper0,6 → addr24,7 = ${cascade()?'1: cascade, existing ancillary data kept (“1=add data”)':'0: GS9023-2 strips existing audio (“0=strips data”)'}`); }); },
  aes(k){ act(`AES ${k+1} ${D.aes[k]?'removed':'connected'}`, tr=>{ D.aes[k]=!D.aes[k]; tr(`AESIN${k+1} (P1-${k?'A18':'C18'}) → U${k?14:10} CS8420 (SRC to the PLL1700E clock) → AES${k+1} → GS9023 pin ${k?22:21}`); tr(`read8420s → lock_8420; refresh_leds: btfsc lock_8420,${k+2} → status0,${k+3} (AUDIO ${k+1} tally)`); }); },
  set(k,v,l){ act(l, tr=>{ D[k]=v; tr(k==='std'?`Incoming video is now ${STD[v].name}; SW7 selects ${stdSel()}`:'Changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- the card and its TB102 termination (drawn; proportions from the manual: 1 in × 2.75 in front, 10.06 in deep) ---------------- */
/* Rear: the rear termination module and TB102 termination block are the real CorelDRAW art from
   SD405_FUNCTION_CURVES.cdr (Jun 2003), region x 385–715, y 215–552 pt → assets/sd405-iss1-rear.svg (330 × 337, 1 unit = 1 pt),
   placed at (700,10) scaled by RK; hot spots sit on its BNC and Phoenix positions (pt coordinates from the converted SVG). */
const RK=270/337, RX=x=>700+(x-385)*RK, RY=y=>10+(y-215)*RK;
function cardSVG(){ const t=SIM.t, L=leds(t), W=975, H=300;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:900px"><defs><filter id="glowfront" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect x="10" y="20" width="70" height="200" rx="4" fill="#26282b" stroke="#555"/><text x="45" y="40" text-anchor="middle" font-size="10" fill="#eee">SD405</text>`;
  ['CD','AUDIO 1','AUDIO 2','ERROR'].forEach((n,i)=>{ const col=['#3fdc6a','#ffd34a','#ffd34a','#ff3b30'][i]; s+=led(30,70+i*36,L[i],col,7)+`<text x="44" y="${74+i*36}" font-size="9" fill="#ddd">${n}</text>`; });
  s+=`<text x="45" y="236" text-anchor="middle" font-size="9" fill="var(--ink2)">front edge</text>`;
  s+=`<rect x="100" y="20" width="560" height="200" rx="6" fill="#1d5c3a" stroke="#0e3d24" stroke-width="2"/><text x="112" y="38" font-size="12" fill="#e8f5e9">SD405 ISS 1 (“2 GROUP AUDIO MUX”) — top view, parts placed by function (${'inferred'})</text>`;
  const ic=(x,y,w,h,n,sub,hot)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${hot?'#0f2d1d':'#111'}" stroke="${hot?'#ffd60a':'#333'}"/><text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" font-size="9.5" fill="#eee">${n}</text><text x="${x+w/2}" y="${y+h/2+11}" text-anchor="middle" font-size="8" fill="#9c9">${sub||''}</text>`;
  s+=ic(560,50,80,34,'U1 CLC014','cable EQ',cd())+ic(470,50,80,34,'U2 CLC016','reclock · CD',cd())+ic(380,50,80,34,'U5 CLC011','decoder',cd())+ic(250,60,110,70,'U9 GS9023','embedder',videoOK())+ic(120,60,110,46,'U4 GS9032','serializer',videoOK())
    +ic(250,150,70,34,'U10 CS8420','AES 1 / SRC',aesLock(0))+ic(330,150,70,34,'U14 CS8420','AES 2 / SRC',aesLock(1))+ic(410,150,70,34,'U16 CS5394','ADC 1',!isAes(0))+ic(490,150,70,34,'U17 CS5394','ADC 2',!isAes(1))
    +ic(120,150,110,46,'U12 PIC16F874','4.9152 MHz',D.power)+ic(570,150,70,34,'U11 PLL1700E','clocks',D.power);
  s+=`<g><title>SW1 SETUP dip switch (8 positions) — click a switch</title>${D.sw.map((on,k)=>`<g class="sw" data-k="${k}" style="cursor:pointer"><title>SW${k+1} ${['group LSB','group MSB','AES/analog 1','mux 1 enable','AES/analog 2','mux 2 enable','standard PAL','cascade'][k]}: ${on?'1 (ON)':'0 (OFF)'}</title><rect x="${120+k*16}" y="${112}" width="13" height="30" fill="#e8ecef"/><rect x="${121+k*16}" y="${on?114:126}" width="11" height="14" fill="#222"/></g>`).join('')}</g><text x="120" y="108" font-size="9" fill="#cfe">SW1 1…8</text>`;
  // rear: 96-pin connector P1 and the TB102 termination
  s+=`<rect x="664" y="30" width="14" height="180" fill="#bbb"/><text x="671" y="225" text-anchor="middle" font-size="9" fill="var(--ink2)">P1 96-pin</text>`;
  s+=`<rect x="694" y="4" width="276" height="292" rx="6" fill="#f4f4f0" stroke="#444"/><image href="${ASSET}sd405-iss1-rear.svg" x="700" y="10" width="${330*RK}" height="270"/>`;
  const ring=(x,y,r,col,w)=>`<circle cx="${RX(x)}" cy="${RY(y)}" r="${r*RK}" fill="none" stroke="${col}" stroke-width="${w||2.5}"/>`;
  s+=`<g class="si" style="cursor:pointer"><title>SDI INPUT BNC (rear module, IN 1) — click to ${D.sdi?'remove':'connect'} the SDI source</title><circle cx="${RX(616.4)}" cy="${RY(237.05)}" r="${10*RK}" fill="${D.sdi?'rgba(43,95,158,.75)':'transparent'}"/>${D.sdi?ring(616.4,237.05,11,'#2b5f9e',3):''}</g>`;
  [[616.4,260.45],[616.7,283.75],[616.3,307.1],[615.9,330.45]].forEach(([x,y],i)=>{ s+=`<g><title>SDI OUTPUT ${i+1}${videoOK()?' — carrying the embedded stream':' — no valid video'}</title>${ring(x,y,11,videoOK()?'#2fbf5a':'#999',videoOK()?2.5:1)}</g>`; });
  [[588.4,272.1],[588.55,318.75]].forEach(([x,y],k)=>{ s+=`<g class="ai" data-k="${k}" style="cursor:pointer"><title>AES INPUT ${k+1} BNC — AUDIO ${k+1} is ${isAes(k)?'set to AES':'set to analog (SW1)'}; click to ${D.aes[k]?'remove':'connect'} the AES source</title><circle cx="${RX(x)}" cy="${RY(y)}" r="${10*RK}" fill="${D.aes[k]?'rgba(43,95,158,.75)':'transparent'}"/>${isAes(k)?ring(x,y,11.5,'#e0a020',2.5):''}</g>`; });
  [[0,410.4,445.4],[1,447.0,481.9]].forEach(([k,y0,y1])=>{ const on=!isAes(k); s+=`<g><title>TB102 ANALOG INPUT ${k+1}A / ${k+1}B (Phoenix, + − G) — ${on?'in use: AUDIO '+(k+1)+' is analog':'idle: AUDIO '+(k+1)+' is AES'}</title><rect x="${RX(502)}" y="${RY(y0)-1}" width="${21*RK}" height="${(y1-y0)*RK+2}" fill="${on?'rgba(38,163,86,.35)':'transparent'}" stroke="${on?'#26a356':'none'}" stroke-width="2"/></g>`; });
  s+=`<text x="${RX(550)}" y="296" text-anchor="middle" font-size="8" fill="#555">art: SD405_FUNCTION_CURVES.cdr</text>`;
  return s+'</svg>'; }
function bindCard(r){ r.querySelectorAll('.sw').forEach(g=>g.onclick=()=>A.dip(+g.dataset.k)); r.querySelectorAll('.si').forEach(g=>g.onclick=()=>A.sdi()); r.querySelectorAll('.ai').forEach(g=>g.onclick=()=>A.aes(+g.dataset.k)); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:6px"><label>Incoming SDI <select id="sd">${Object.keys(STD).map(k=>`<option value="${k}" ${k===D.std?'selected':''}>${STD[k].name}</option>`).join('')}</select></label>
  <label><input type="checkbox" id="ex" ${D.existing?'checked':''}> input already carries embedded audio (group 1)</label><button id="pw">${D.power?'Power off':'Power on'}</button></div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#sd')) return; g('#sd').onchange=e=>A.set('std',e.target.value,'Incoming SDI → '+e.target.value); g('#ex').onchange=e=>{ D.existing=e.target.checked; SIM.refresh(); }; g('#pw').onclick=()=>A.power(); }
bindKeys('__sd405Active', ()=>({v:()=>A.sdi(),'1':()=>A.aes(0),'2':()=>A.aes(1)}));
/* what ends up in the output stream */
function outGroups(){ const g=[]; if(D.existing&&cascade()&&videoOK()) g.push({grp:1,src:'existing (passed through)'}); if(D.existing&&!cascade()) g.push({grp:1,src:'stripped (cascade OFF)',gone:true});
  if(videoOK()&&(muxOn(0)||muxOn(1))){ const conflict = D.existing&&cascade()&&group()===1; g.push({grp:group(),src:`card audio 1/2 (${muxOn(0)?(isAes(0)?'AES':'analog'):'—'} / ${muxOn(1)?(isAes(1)?'AES':'analog'):'—'})${conflict?' — OVERWRITES the existing group 1!':''}`, bad:conflict}); }
  return g; }
/* ---------------- timeline ---------------- */
function lanes(){ const s=S(), a=SIM.css('--accent'), b=SIM.css('--accent2');
  return [
    {label:`Fields (${(1/s.field).toFixed(2)} Hz) · EDH`, h:18, draw(c,X,t0,t1,y,h){ if(!videoOK()) return; SIM.pulses(c,X,t0,t1,y,h,s.field,0,0.0004,b,'EDH packet (RP165) once per field'); }},
    {label:'Lines (HANC: audio packets)', h:18, draw(c,X,t0,t1,y,h){ if(!videoOK()) return; SIM.pulses(c,X,t0,t1,y,h,s.line,0,s.line*0.1,SIM.css('--ink2'),'line'); }},
    {label:'48 kHz audio samples', h:18, draw(c,X,t0,t1,y,h){ if(!videoOK()) return; SIM.pulses(c,X,t0,t1,y,h,1/48000,0,1/96000,a,'samples (≈3.05 per NTSC line)'); }},
    {label:'270 Mb/s serial words (10 bits)', h:18, draw(c,X,t0,t1,y,h){ if(!videoOK()) return; SIM.pulses(c,X,t0,t1,y,h,10/270e6,0,5/270e6,SIM.css('--warn'),'27 MHz words'); }},
    boolLane('CD (CLC016)', ()=>cd(), '#3fdc6a'), boolLane('Calibration (all four LEDs, CAL pulses)', t=>calibrating(t), SIM.css('--warn')),
    boolLane('AUDIO 1 tally', ()=>audioLed(0), '#ffd34a'), boolLane('AUDIO 2 tally', ()=>audioLed(1), '#ffd34a'), boolLane('ERROR', t=>errorLed(t), SIM.css('--bad')),
  ]; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__sd405Active=true;
  m.innerHTML=`${card('The card (front-edge tallies, SW1 set-up, rear module + TB102) — click the switches, SDI INPUT and the AES INPUT BNCs',`<div id="cd"></div><div class="small muted" style="margin-top:3px">Rear module and TB102: CorelDRAW art from ${SIM.src('#SERIALBOX #SERIES/SERIALBOXX - #SD400/SD405/Functionals/SD405_FUNCTION_CURVES.cdr','SD405_FUNCTION_CURVES.cdr')} (Jun 2003).</div>${controlsHTML()}`)}
   <div class="grid2">${card('Firmware path of the last action (sd405v0.asm, June 2 2003)',`<div id="trace" class="log"></div>`)}${card('Output stream',`<div id="os"></div>`)}</div>
   ${card('Timeline — one second, zoomable (1 line shows the audio samples per line)',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#cd').innerHTML=cardSVG(); bindCard(m.querySelector('#cd')); m.querySelector('#trace').innerHTML=traceHTML(D,'Flip a switch or pull the SDI input.');
    m.querySelector('#os').innerHTML=kvt([['Standard (SW7 / input)',`${stdSel()} / ${D.std}${stdSel()!==D.std?' — <b style="color:var(--bad)">mismatch</b>':''}`],['Embed group (SW1/SW2)',String(group())],['Cascade (SW8)',cascade()?'ON — keep existing audio':'OFF — strip existing audio'],['Groups out',outGroups().map(g=>`<span style="${g.bad?'color:var(--bad);font-weight:700':g.gone?'text-decoration:line-through':''}">G${g.grp}: ${g.src}</span>`).join('<br>')||'—'],['SDI outputs','OUT1–OUT4 via U4 GS9032 '+(videoOK()?'(live)':'(no valid video)')]]);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:220}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the SD405', body:`<p>From the SD405A manual: “a muxer designed to embed one group (two stereo channels) of analog or AES audio into a SMPTE 259 serial digital video signal … one serial digital video input and four serial digital video output splits.” This folder holds issue 1 of its schematic.</p>`, check:()=>true, auto:true},
  {title:'1 · Pick the group', body:`<p>The card is set to group 2. Move it to <b>group 3</b>: SW1 OFF, SW2 ON.</p>`, check:()=>group()===3, hint:'Click switches 1 and 2 on the card.'},
  {title:'2 · Keep what is there', body:`<p>The incoming video already carries group 1. With <b>cascade</b> (SW8) ON the card adds group 2 and keeps group 1; turn it OFF to see group 1 stripped, then back ON.</p>`, check:()=>cascade()&&D.log.some(e=>e.name.startsWith('SW8')), hint:'Click switch 8 twice.'},
  {title:'3 · Analog channel 2', body:`<p>Set audio 2 to <b>analog</b> (SW5 OFF). The CS5394 converter becomes the source and the CS8420 is set to its “swclk” values.</p>`, check:()=>!isAes(1), hint:'Click switch 5.'},
  {title:'4 · Pull the video', body:`<p>Remove the SDI input (click SDI IN): ERROR lights. Reconnect it: all four LEDs light together while the card recalibrates its A/D converters, then CD returns.</p>`, check:()=>D.sdi&&D.log.filter(e=>e.name.startsWith('SDI')).length>=2, hint:'Click SDI IN twice (or press V twice).'},
  {title:'5 · Wrong standard', body:`<p>Change the incoming SDI to <b>PAL</b> without moving SW7: no standard lock → ERROR (“wrong SDI standard selected”). Then set SW7 to match.</p>`, check:()=>D.std==='PAL'&&stdSel()==='PAL', hint:'Incoming SDI → PAL, then switch 7.'},
  {title:'Done', body:`<p>See <b>Findings</b> for what issue 1 differs in.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__sd405Active=true; tutorialView(m,{title:'Tutorial — setting up an SD405 in an MF100 frame',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${cardSVG()}${controlsHTML()}<div class="small">${kvt([['Groups out',outGroups().map(g=>'G'+g.grp+': '+g.src).join(' · ')||'—']])}</div>`, bind:r=>{ bindCard(r); bindControls(r); }}); }
const LOOP=[['bsf portc,1','release resets'],['read_jumpers','U20 74HC165'],['process','group DIDs, cascade, standard'],['refresh_leds','status0 → tallies'],['check_aes3','AES 1 lock'],['check_aes4','AES 2 lock'],['check_video','calibration?'],['refreshgs9023_2','write U9'],['readgs9023s','lock_9023'],['refresh8420_1','U10'],['refresh8420_2','U14'],['read8420s ×2','lock_8420'],['delay_2',''],['run_stop','']];
function viewSecond(m){ window.__sd405Active=true;
  m.innerHTML=`${card('One second through the SD405',`<div id="tab"></div>`)}${card('PIC main loop at the playhead (equal step times, '+inf+')',`<div id="lp"></div>`)}`;
  const draw=()=>{ const s=S();
    m.querySelector('#tab').innerHTML=tbl(['Event','per second','period','where'],[['Serial bits','270 000 000',SIM.fmtDur(1/270e6),'CLC014 → CLC016 → CLC011 (10-bit words at 27 MHz)'],['Lines',(1/s.line).toFixed(1),SIM.fmtDur(s.line),'audio data packets go in the horizontal blanking ('+inf+': SMPTE 272M)'],['Audio samples per channel','48 000',SIM.fmtDur(1/48000),`≈ ${(48000*s.line).toFixed(2)} per line`],['Fields / EDH packets',(1/s.field).toFixed(2),SIM.fmtDur(s.field),'“generates and embeds its own EDH packets … RP165”'],['PIC instruction cycles','1 228 800',SIM.fmtDur(TCY),'4.9152 MHz / 4'],['Calibration after video returns','—',SIM.fmtDur(CAL_T),'check_calibration: CAL pulse, 6 × idelay, CAL pulse ('+inf+': idelay length)']]);
    const run=Math.floor((SIM.t*120)%LOOP.length); m.querySelector('#lp').innerHTML=loopSVG(LOOP.map(r=>({t:r[0],s:[r[1]]})),run,'MAIN (sd405v0.asm)'); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:15,y:30,w:150,h:80,t:'SDI IN',s:['L7 18nH','U1 CLC014 EQ'],d:'Adaptive cable equaliser (manual: “an adaptive cable equalizer in the input circuitry”).'},
  rc:{x:185,y:30,w:150,h:80,t:'U2 CLC016',s:['reclocker','CD → PIC'],d:'Carrier detect on pins 19/28 → net CD → U12-36.'},
  dec:{x:355,y:30,w:150,h:80,t:'U5 CLC011',s:['decoder','D0–D9'],d:'Serial to 10-bit parallel (nets D0…D9) for the GS9023.'},
  emb:{x:525,y:30,w:160,h:80,t:'U9 GS9023',s:['embedder','AES1/AES2 in'],d:'Host bus C0–C7, A0–A3, ~RE/~WE/~CS2 from the PIC; output DO0–DO9.'},
  ser:{x:705,y:30,w:150,h:80,t:'U4 GS9032',s:['serializer','OUT1–OUT4'],d:'Parallel to serial, four outputs (OUT1…OUT4 on P1).'},
  a1:{x:355,y:150,w:150,h:80,t:'U10/U14 CS8420',s:['AES in / SRC','ACLK8420 via U13'],d:'AESIN1/AESIN2 (and AESIN3/4 nets) — sample-rate converted to the video-locked 48 kHz.'},
  adc:{x:185,y:150,w:150,h:80,t:'U16/U17 CS5394',s:['A/D, CAL pin','NE5532 inputs'],d:'TB1±…TB4± analog inputs through four NE5532 stages and RV1–RV4 trims (issue 1).'},
  clk:{x:525,y:150,w:160,h:80,t:'U11 PLL1700E',s:['U15 CY2305 buffer'],d:'PCLK-1700, PCLK-023-1/2, PCLK-032: audio clocks locked to the video.'},
  pic:{x:705,y:150,w:150,h:80,t:'U12 PIC16F874',s:['4.9152 MHz','SW1 via U20'],d:'Reads the DIP switch through a 74HC165, programs the GS9023 and CS8420s, drives the tallies.'},
};
const WIRES=[['in','rc',''],['rc','dec',''],['dec','emb','D0–9'],['emb','ser','DO0–9'],['adc','a1','I²S'],['a1','emb','AES1/2'],['clk','a1',''],['pic','emb','host bus'],['pic','a1','SPI']];
function viewBlock(m){ window.__sd405Active=false; blockView(m,BLOCKS,WIRES,'emb',[870,250],card('In one sentence',`<p>SDI is equalised, reclocked and decoded to parallel; a GS9023 inserts two AES pairs (from CS8420 rate converters, fed by AES inputs or CS5394 converters) into one audio group, and a GS9032 re-serialises four outputs, all set up by a PIC from an 8-way DIP switch.</p>`)); }
const SHEETS=[
  {name:'1 · Video path (named nets)', note:'From Sd405ISS1.net (26 May 2003).', svg:()=>
    chip(40,60,130,'U1 CLC014',[['in','IN+ (P1-A1) via L7']],[['out','→ U2']],'cable EQ')+chip(250,60,130,'U2 CLC016',[['in','']],[['19/28','CD → U12-36']],'reclocker')+chip(460,40,150,'U9 GS9023',[['D0…D9','← U5 CLC011'],['21','AES1 ← U10-26'],['22','AES2 ← U14-26'],['72–81','C0…C7 (PIC)'],['86–89','A3…A0'],['83/84/85','~RE ~WE ~CS2']],[['56–66','DO9…DO0 → U4'],['18','RESET']],'embedder')
    +chip(680,60,130,'U4 GS9032',[['1–10','DO9…DO0']],[['20','LOCK32'],['','OUT1…OUT4']],'serializer')},
  {name:'2 · Audio path and control', note:'From Sd405ISS1.net; PIC port use from sd405v0.asm comments.', svg:()=>
    chip(40,40,150,'U16 CS5394',[['7/20','MCLK'],['13','LRCK'],['14','SCLK'],['10','CAL']],[['16','SDATA → U10-14']],'ADC 1')+chip(40,250,150,'U17 CS5394',[['10','CAL'],['7/20','MCLK2']],[['16','SDATA2 → U14-14']],'ADC 2')
    +chip(330,40,150,'U10 CS8420',[['14','SDATA'],['10','MCLK'],['21','ACLK8420'],['1/27/28','SDI/SDO/SCK'],['2','~CS6']],[['26','AES1']],'AES/SRC 1')+chip(330,250,150,'U14 CS8420',[['14','SDATA2'],['2','~CS5'],['21','ACLK8420']],[['26','AES2']],'AES/SRC 2')
    +chip(620,100,170,'U12 PIC16F874',[['36','CD'],['38–41, 2–5','C0…C7'],['19–22','A0…A3'],['8/9/10','SCK/SDO/SDI'],['35','RESET']],[['42/43/37','~CS5 ~CS2 ~CS6'],['porte,0','CAL'],['portc,6','ERROR LED']],'4.9152 MHz (X2)')},
];
function viewSchem(m){ window.__sd405Active=false; schemView(m,SHEETS,'SD405 ISS 1','Redrawn from the issue 1 netlist; pin numbers and nets are real. The P-CAD .sch/.s01–.s03 sheets are binary.'); }
function viewSoft(m){ window.__sd405Active=true; let hot=null;
  const DET={'bsf portc,1':'Takes the CS8420s and GS9023 out of reset every pass.','read_jumpers':'Shifts SW1 in through U20 74HC165 into jumper0.','process':'Group → addr23/addr24 DIDs (set21…set24); analog/AES flags (only before calibration); cascade → addr24,7; standard → addr20/addr0.','refresh_leds':'video_error from lock_9023 (cd, standard lock); ERROR also on a CS8420/GS9023 lock mismatch when both channels are AES.','check_aes3':'AES 1 lock handling.','check_aes4':'AES 2 lock handling.','check_video':'Valid video after loss → calibration,1.','refreshgs9023_2':'Writes the GS9023 registers over the host bus.','readgs9023s':'Reads 9023 lock, CD and 9032 lock.','refresh8420_1':'Writes U10 (cs8420reg1/3/4).','refresh8420_2':'Writes U14.','read8420s ×2':'lock_8420 (read twice).','delay_2':'Pacing delay.','run_stop':'Run/stop housekeeping.'};
  m.innerHTML=`${card('MAIN — sd405v0.asm v100 (click a step)',`<div id="lp"></div><div id="det" class="card small"></div>`)}<div class="grid2">${card('process: group → DIDs',`<div id="g"></div>`)}${card('Tally logic (refresh_leds)',`<div id="tl2"></div>`)}</div>`;
  const draw=()=>{ const run=Math.floor((SIM.t*120)%LOOP.length), h=hot==null?run:hot;
    m.querySelector('#lp').innerHTML=loopSVG(LOOP.map(r=>({t:r[0],s:[r[1]]})),h,'MAIN'); m.querySelectorAll('[data-step]').forEach(g=>g.onclick=()=>{ hot=+g.dataset.step; draw(); });
    m.querySelector('#det').innerHTML=`<b class="mono">${LOOP[h][0]}</b>: ${DET[LOOP[h][0]]}`;
    m.querySelector('#g').innerHTML=tbl(['Group','addr23 (audio DID)','addr24 (control DID)'],GROUPS.map((g,i)=>[`${i+1}${i+1===group()?' ◀':''}`,'0x'+g[0].toString(16).toUpperCase(),'0x'+g[1].toString(16).toUpperCase()+(cascade()?' | 0x80':'')]),true);
    const L=leds(SIM.t); m.querySelector('#tl2').innerHTML=kvt([['lock_9023,0 (cd)',String(cd())],['lock_9023,4 (standard)',String(stdLock())],['video_error,7 (good)',String(videoOK())],['calibration',calibrating(SIM.t)?'running (all LEDs on)':'idle'],['status0 → CD/A1/A2/ERROR',L.map(x=>x?'1':'0').join(' ')]]); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__sd405Active=false;
  m.innerHTML=card('What the SD405 issue 1 files show — findings',`<ol>
   <li><b>Artwork 2026|59: rear module and TB102 now from ${SIM.src('#SERIALBOX #SERIES/SERIALBOXX - #SD400/SD405/Functionals/SD405_FUNCTION_CURVES.cdr','SD405_FUNCTION_CURVES.cdr')} (9 Jun 2003).</b> The SD405 has no silk or panel art of its own (it is a card behind the MF100 door); the functional diagram's rear-module and termination-block drawings are the only to-scale artwork, so they are used as is. They show what the manual implies but the old drawing did not: the AES inputs are <b>BNCs</b> on the rear module (positions 3 and 7, “AES INPUT 1/2”, with 1 and 5 “NOT USED”), SDI IN is position IN 1 and SDI OUTPUT 1–4 are 2/4/6/8, and the analog inputs 1A/1B/2A/2B are four 3-pin Phoenix blocks on TB102 with a fifth “NOT USED”. The same diagram (and ${SIM.src('#SERIALBOX #SERIES/SERIALBOXX-Functionals/SD405.cdr','SERIALBOXX-Functionals/SD405.cdr')}) draws a single MUX fed by two A-to-D / AES selectors, i.e. one group, matching the manual rather than the schematic's “2 GROUP”.</li>
   <li><b>It is a muxer, not a de-embedder.</b> Both READMEs call the SD405 an “SDI de-embedder”, but the schematic title is “2 GROUP AUDIO MUX”, the netlist has two CS5394 A/D converters and CS8420s feeding the GS9023’s AES inputs, the firmware header reads “SD405 Analog and Digital 2 Group Muxer”, and the manual calls the SD405A an “AUDIO MUXER … designed to embed one group”.</li>
   <li><b>“2 group” vs “one group”.</b> The schematic title and code say 2 group; the manual says one group (two stereo channels), selectable 1–4.</li>
   <li><b>Issue 1 vs the next day.</b> This folder’s <span class="mono">Sd405ISS1.net</span> (26 May 2003) predates the Serialbox copy (27 May): many capacitor and resistor values are still “{Value}”; the input trims are RV1–RV4 (later LEFT1/2, RIGHT1/2); R4 is 110R (later 75R) and R37 is 75R (later 150R); F2 and the R98/R99 2R2 ½ W resistors are not yet added.</li>
   <li><b>The ISS1 file says ISS.2.</b> The schematic title block in <span class="mono">Sd405ISS1.sch</span> reads “Revision: ISS.2”.</li>
   <li><b>Code expects a 4094.</b> <span class="mono">refresh_leds</span> is commented “proc led status and update 4094”, but the issue 1 netlist has no 74HC4094 (only a 74HC165 for the switches and a 74HC74); later code drives the LEDs from port pins (portc,6 ERROR, portc,0 AUDIO2, porte,2 AUDIO1, porte,1 CD in <span class="mono">check_calibration</span>).</li>
   <li><b>Switch map mismatch.</b> The code’s <span class="mono">jumper0</span> comment lists “edh, cascade, src, 24/20, grp3/4msb, grp3/4lsb, grp1/2msb, grp1/2lsb” and uses bit 6 for cascade and bit 7 for the standard; the manual puts the standard on SW7 and cascade on SW8. Either the 74HC165 wiring reorders them (“shift in order H9,10,8,7,1,2,3,4,6”) or the manual and code disagree (${inf}).</li>
   <li><b>Calibration is visible.</b> All four tallies on = A/D calibration after (re)gaining video: <span class="mono">check_calibration</span> pulses the CAL pin (porte,0) around six <span class="mono">idelay</span> calls.</li>
   <li><b>Cascade does not check.</b> The manual warns: “The SD405 does not check which group has existing audio” — embedding into an occupied group with cascade ON overwrites it.</li>
   <li><b>Device change.</b> <span class="mono">sd405v0.asm</span> includes P16F874.INC with “P16f747.INC ;---formerly” commented out; the README lists v106 as a “Gennum lock-pin change”.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Card top view drawn from the manual’s dimensions and the parts list, not from the PCB (${inf}). Rear module and TB102 are the functional-diagram art (SD405_FUNCTION_CURVES.cdr).</li><li>Calibration lasts about ${SIM.fmtDur(CAL_T)} (${inf}: idelay length).</li><li>SW numbering follows the manual.</li><li>Packet timing per SMPTE 272M (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>Sd405 - ISS1/Sd405ISS1.net · Sd405ISS1.ECO · Sd405ISS1.sch (+ .md)</li><li>#SERIALBOX #SERIES/SERIALBOXX - #SD400/SD405/Sd405ISS1.net · SD405MAN.wpd (+ .md) · Software/v100/sd405v0.asm · ad.asm</li></ul>`); }
SIM.register({
  id:'sd405-iss1', name:'Sd405 - ISS1 · SD405 SDI audio muxer card, issue 1 schematic (2003|36)', duration:1, product:'Sd405 - ISS1', year:2003, family:'Obsolete products', folder:'#SERIALBOX #SERIES/SERIALBOXX - #SD400/SD405/Sd405 - ISS1',
  summary:'Issue 1 of the Serialboxx SD405: an SDI card that embeds two AES or analog stereo channels into one selectable audio group of a 270 Mb/s signal, with four SDI outputs and CD/AUDIO/ERROR tallies. Built from the May 2003 netlist, the SD405A manual and the June 2003 PIC firmware.',
  highlights:['Working SW1 set-up: group, AES/analog, standard, cascade','Calibration flash, CD and ERROR from the real tally code','Group DIDs from the firmware’s process routine','Issue 1 vs next-day netlist differences'],
  depth:'Hardware model',
  stepUnits:[{label:'1 line',period:()=>S().line},{label:'1 field',period:()=>S().field},{label:'1 audio sample',period:()=>1/48000}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1001/60000,'1 field'],[64e-6,'1 line'],[1e-6,'1 µs']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
