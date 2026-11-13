/* =====================================================================
   C6201 — openGear frame controller, functional concept, never produced (Ward-Beck Systems, 13 Jun 2006|39)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware/concept model: one drawing, no electronics.

   Sources used:
   - #OPENGEAR #SERIES/XXX - C6201 - #Engineering NEVER PRODUCED/C6201-FUNCTIONAL.dwg (+ .bak): AutoCAD 2000
     (AC1015); the text strings were recovered (CONTROL, PSU1 SERIAL, PSU2 SERIAL, FRAME I-WIRE, CAN ADDRESS, CAN BUS,
     AES RECEIVER, CAN COM, ENABLE, FAN KIT, folder "OPEN GEAR/C62XX/A"); the geometry could not be rendered
   - #OPENGEAR #SERIES/FC6221 - #Engineering #PROBLEM/FC6221 - #PCB/FC6221Aiss1.net (the board that implemented it)
   - siumulation-plugins/mf6220-frame.js (MF6220 slot pitch, slot-ID ladder R1–R20, FINC slot) and opengear.js (CAN)
   Everything about behaviour and timing is inferred and marked so on screen.
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
function card(t,b,cls){ return `<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`; }
const ASSET = 'siumulation-plugins/assets/';
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
/* What the drawing says (text recovered from C6201-FUNCTIONAL.dwg, AutoCAD 2000 format, 13 Jun 2006) */
const DWG_TEXT = ['CONTROL','PSU1 SERIAL','PSU2 SERIAL','FRAME I-WIRE','CAN ADDRESS','CAN BUS','AES  RECEIVER','CAN COM','ENABLE','FAN KIT','OPEN GEAR/C62XX/A','C6201 FUNCTIONAL'];
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681]; // MF6220-1 ladder R1…R20 (mf6220-frame.js)
const PITCH = i => (i%2===1 ? 0.650 : 0.670);
const SLOT_X = (()=>{ const a=[0]; for(let i=1;i<20;i++) a.push(a[i-1]+PITCH(i)); a.push(a[19]+0.820); return a; })();
const adcOf = R => Math.min(1023, Math.floor(1024*R/(R+1000)));
const bin = a => 32 - Math.floor((a+16)/32);
const slotId = i => 1 + bin(adcOf(SLOT_R[i]));
const CARDS = ['D6201A','D6202A','AV6201A','AA6201A','D6203A','D6204A','M6202A','M6203A','M6204A','M6205','T6201','D6208'];
const FACT = { power:true, slots:[null,'D6201A',null,'D6203A',null,'AV6201A',null,'D6204A',null,null,null,'M6205',null,null,null,null,null,null,null,null], ctl:true,
  psu:[{on:true,fault:false},{on:true,fault:false}], fanKit:true, fanEnable:true, fanFail:false, aesRef:true, refFs:48000, sel:21, scanFrom:0 };
const D = JSON.parse(JSON.stringify(FACT)); D.log=[];
const inserted = () => D.slots.map((c,i)=>c?{c,i}:null).filter(Boolean);
/* ---------------- concept behaviour (every rate below is inferred; only the function names are in the drawing) ---------------- */
const CANF = 111e-6, ROUND = 0.1, OW = 480e-6+70e-6+10*8*65e-6;
const aesLock = () => D.power && D.ctl && D.aesRef;
const alarms = () => { const a=[]; if (!D.power||!D.ctl) return a; D.psu.forEach((p,i)=>{ if (!p.on) a.push('PSU'+(i+1)+' missing'); else if (p.fault) a.push('PSU'+(i+1)+' FAULT'); });
  if (D.fanKit && D.fanEnable && D.fanFail) a.push('fan failure'); if (D.fanKit && !D.fanEnable) a.push('fan kit disabled'); if (!D.aesRef) a.push('no frame reference'); return a; };
const act = makeActor(D, ()=>`${inserted().length} cards · ${alarms().length} alarms`);
const A = {
  slot(i){ const cur=D.slots[i], nx = cur===null? CARDS[0] : (CARDS.indexOf(cur)+1<CARDS.length? CARDS[CARDS.indexOf(cur)+1] : null);
    act(`Slot ${i+1}: ${nx||'empty'}`, tr=>{ D.slots[i]=nx; D.sel=i; if (nx){ tr(`CAN ADDRESS: the card reads its slot resistor R${i+1} = ${SLOT_R[i]>=1000?SLOT_R[i]/1000+'K':SLOT_R[i]+'R'} → ADC ${adcOf(SLOT_R[i])} → slot ${slotId(i)} (same scheme as every WBS openGear card)`); tr(`CAN BUS: the controller finds it at the next enumeration round (${ROUND*1000} ms ${inf})`); } else tr('Card removed: the controller times out on it and drops it from the list'); }); },
  ctl(){ act(D.ctl?'Pull the C6201 controller':'Insert the C6201 into the controller slot', tr=>{ D.ctl=!D.ctl; tr(D.ctl? 'CONTROL comes up, reads FRAME I-WIRE (frame identity), then enumerates CAN' : 'No controller: cards keep running, but nothing polls them, reads the PSUs or watches the fans'); }); },
  psu(i,k){ act(`PSU${i+1} ${k==='on'?(D.psu[i].on?'removed':'fitted'):(D.psu[i].fault?'fault cleared':'fault')}`, tr=>{ D.psu[i][k]=!D.psu[i][k]; tr(`PSU${i+1} SERIAL: the controller reads the supply's serial interface (1-Wire on the MF6220 midplane: PSU_SERIAL${i+1}) and its fault flag`); }); },
  fan(k){ act(k==='fanEnable'?`FAN KIT ENABLE → ${D.fanEnable?'off':'on'}`:k==='fanKit'?`Fan kit ${D.fanKit?'removed':'fitted'}`:`Fan ${D.fanFail?'restored':'fails'}`, tr=>{ D[k]=!D[k]; tr('ENABLE / FAN KIT on the drawing: the controller powers and monitors the fan tray (on FC6221A: Q1/Q3 switches, I²C to the PCA9555)'); }); },
  ref(){ act(D.aesRef?'Remove the AES frame reference':'Connect the AES frame reference', tr=>{ D.aesRef=!D.aesRef; tr(`AES RECEIVER: lock ${aesLock()?'on':'lost'} — the controller can report the frame reference (${inf}: what the receiver was for is not written down)`); }); },
  power(){ act(D.power?'Frame power off':'Frame power on', tr=>{ D.power=!D.power; }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
/* ---------------- frame front, to scale from the MF6220 design notes (slot pitch) ---------------- */
function frameSVG(){ const S=50, W=(SLOT_X[20]+1.6)*S, H=190; let s=`<svg viewBox="0 0 ${W+20} ${H+60}" style="width:100%;max-width:1000px;background:var(--lane);border-radius:8px">
  <rect x="10" y="10" width="${W}" height="${H}" rx="6" fill="var(--dev)" stroke="#000"/>`;
  SLOT_X.forEach((x,i)=>{ const X=10+(0.6+x)*S, isC=i===20, card=isC?(D.ctl?'C6201':null):D.slots[i], sel=D.sel===i, lit = D.power && card;
    s+=`<g class="sl" data-i="${i}" style="cursor:pointer"><rect x="${X}" y="22" width="${S*0.56}" height="${H-30}" rx="3" fill="${card?(isC?'#2b5f9e':'#2c3a33'):'#0f1011'}" stroke="${sel?'#ffd84a':'#3a3d40'}" stroke-width="${sel?3:1}"/>
      ${card?`<text transform="translate(${X+S*0.36},${H-18}) rotate(-90)" font-size="12" fill="#e8f0e8">${card}</text>`:''}${lit?`<circle cx="${X+S*0.28}" cy="36" r="5" fill="${isC&&alarms().length?'#ff4a3a':'#7dff6a'}"/>`:''}
      <text x="${X+S*0.28}" y="${H+28}" text-anchor="middle" font-size="10" fill="var(--ink2)">${isC?'ctl':i+1}</text><title>${isC?'Controller slot (slot 21) — click to insert / pull the C6201':'Slot '+(i+1)+' — click to change the card'}</title></g>`; });
  return s+`<text x="12" y="${H+50}" font-size="11" fill="var(--ink2)">MF6220 front: slots to scale (0.650/0.670 in pitch, controller +0.820 in; design notes via mf6220-frame.js).</text></svg>`; }
function bindFrame(r){ r.querySelectorAll('.sl').forEach(g=>g.onclick=()=>{ const i=+g.dataset.i; if (i===20) A.ctl(); else A.slot(i); }); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:6px">
  <button id="k_pw">Frame power ${D.power?'ON':'off'}</button><button id="k_p1">PSU1 ${D.psu[0].on?'fitted':'missing'}</button><button id="k_f1">PSU1 ${D.psu[0].fault?'FAULT':'ok'}</button><button id="k_p2">PSU2 ${D.psu[1].on?'fitted':'missing'}</button><button id="k_f2">PSU2 ${D.psu[1].fault?'FAULT':'ok'}</button>
  <button id="k_fk">Fan kit ${D.fanKit?'fitted':'none'}</button><button id="k_fe">FAN ENABLE ${D.fanEnable?'on':'off'}</button><button id="k_ff">Fan ${D.fanFail?'FAILED':'ok'}</button><button id="k_rf">AES reference ${D.aesRef?'present':'absent'}</button></div>
  <div class="small muted">Click a slot to cycle its card, the blue controller slot to pull / insert the C6201.</div>`; }
function bindControls(r){ const q=s=>r.querySelector(s); if (!q('#k_pw')) return; q('#k_pw').onclick=()=>A.power(); q('#k_p1').onclick=()=>A.psu(0,'on'); q('#k_f1').onclick=()=>A.psu(0,'fault'); q('#k_p2').onclick=()=>A.psu(1,'on'); q('#k_f2').onclick=()=>A.psu(1,'fault');
  q('#k_fk').onclick=()=>A.fan('fanKit'); q('#k_fe').onclick=()=>A.fan('fanEnable'); q('#k_ff').onclick=()=>A.fan('fanFail'); q('#k_rf').onclick=()=>A.ref(); }
/* ---------------- the controller's second (schedule inferred) ---------------- */
function schedule(){ const ev=[]; if (!D.power||!D.ctl) return ev; const cs=inserted();
  ev.push({k:'ow',t:0.01,d:OW,l:'FRAME I-WIRE: frame identity'});
  for (let r=0;r<10;r++){ cs.forEach((x,n)=>{ const t=0.02+r*ROUND+n*ROUND/Math.max(cs.length,1)*0.8; ev.push({k:'can',t,d:CANF,l:'poll '+slotId(x.i)},{k:'can',t:t+CANF+30e-6,d:CANF,l:x.c,rx:true}); }); }
  D.psu.forEach((p,i)=>{ ev.push({k:'psu',t:0.3+i*0.25,d:OW,l:p.on?'PSU'+(i+1)+' serial'+(p.fault?' FAULT':''):'PSU'+(i+1)+' no presence',bad:!p.on||p.fault}); });
  if (D.fanKit) for (let t=0.05;t<1;t+=0.25) ev.push({k:'fan',t,d:0.0004,l:D.fanEnable?(D.fanFail?'fan fail':'fans ok'):'disabled',bad:D.fanFail||!D.fanEnable});
  return ev; }
function lanes(){ const ev=schedule(), a=SIM.css('--accent'), b=SIM.css('--accent2'), w=SIM.css('--warn'), bad=SIM.css('--bad');
  const L=(lab,k,col)=>({label:lab,h:26,draw(c,X,t0,t1,y,h){ ev.filter(e=>e.k===k&&e.t<t1&&e.t+e.d>t0).forEach(e=>{ c.fillStyle=e.bad?bad:e.rx?b:col; c.fillRect(X(e.t),y+5,Math.max(1.5,X(e.t+e.d)-X(e.t)),h-10); if (X(e.t+e.d)-X(e.t)>50){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(e.l,X(e.t)+3,y+h/2+3); } }); }});
  const fs=D.refFs, blk=192/fs;
  return [ L('CAN BUS (poll ▸ / reply ▸)','can',a), L('FRAME I-WIRE','ow',w), L('PSU1 / PSU2 SERIAL','psu',w), L('FAN KIT (read)','fan',a),
    {label:'AES RECEIVER: reference blocks (192 frames)', h:22, draw(c,X,t0,t1,y,h){ if (!aesLock()){ c.fillStyle=bad; c.font='11px sans-serif'; c.fillText(D.aesRef?'controller not running':'no reference — receiver unlocked',X(t0)+6,y+15); return; } SIM.pulses(c,X,t0,t1,y,h,blk,0,1/fs,b,'block starts (Z preamble)'); }},
    {label:'AES frames (48 kHz)', h:18, draw(c,X,t0,t1,y,h){ if (!aesLock()) return; if ((t1-t0)*fs > (X(t1)-X(t0))/3){ c.fillStyle=b; c.globalAlpha=.25; c.fillRect(X(t0),y+3,X(t1)-X(t0),h-6); c.globalAlpha=1; return; } SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.5/fs,b,''); }},
    boolLane('Alarm (any)', ()=>alarms().length>0, bad) ]; }
function nowHTML(){ const cs=inserted(), al=alarms();
  return `<table class="kv"><tr><th>Controller</th><td>${D.ctl?(D.power?'running':'unpowered'):'not fitted'}</td></tr><tr><th>Cards found on CAN</th><td class="mono">${D.ctl&&D.power? cs.map(x=>`${x.c}@${slotId(x.i)}`).join(' · ')||'none' : '—'}</td></tr>
  <tr><th>Power supplies</th><td>${D.psu.map((p,i)=>`PSU${i+1} ${p.on?(p.fault?'FAULT':'ok'):'missing'}`).join(' · ')}</td></tr><tr><th>Fan kit</th><td>${D.fanKit?(D.fanEnable?(D.fanFail?'failed':'running'):'disabled'):'not fitted'}</td></tr>
  <tr><th>AES reference</th><td>${aesLock()?'locked, '+D.refFs/1000+' kHz':'unlocked'}</td></tr><tr><th>Alarms</th><td>${al.length?`<b style="color:var(--bad)">${al.join(', ')}</b>`:'none'}</td></tr></table>`; }
function viewSim(m){ window.__c6201Active=false;
  m.innerHTML=`${card('The frame the C6201 was meant to control (MF6220 front)',`<div id="fr"></div><div id="ctl"></div>`)}<div class="grid2">${card('What the controller did',`<div id="trace" class="log"></div>`)}${card('Controller view',`<div id="now"></div>`)}</div>
   ${card('Timeline — the controller\'s second (functions from the drawing; every rate inferred)',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const f=m.querySelector('#fr'); f.innerHTML=frameSVG(); bindFrame(f); const c=m.querySelector('#ctl'); c.innerHTML=controlsHTML(); bindControls(c);
    m.querySelector('#trace').innerHTML=traceHTML(D,'Insert a card, fault a PSU or remove the reference.'); m.querySelector('#now').innerHTML=nowHTML(); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:230}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'A card that was never made', body:`<p>All that survives is one AutoCAD sheet, <span class="mono">C6201-FUNCTIONAL.dwg</span> (13 Jun 2006), filed under “OPEN GEAR/C62XX/A”. Its labels: ${DWG_TEXT.slice(0,10).map(t=>`<span class="chip">${t}</span>`).join('')}. Read together they describe a <b>frame controller</b>: the card in the controller slot that talks to every card over CAN and watches power, fans and reference. This tutorial shows how it would have been used.</p>`, check:()=>true, auto:true},
  {title:'1 · Fit the controller', body:`<p>Pull the C6201 out of the controller slot (blue), then insert it again. With no controller the cards still pass signal, but nothing reports on them.</p>`, check:()=>D.ctl&&D.log.some(e=>e.name.startsWith('Pull the C6201')), hint:'Click the blue slot twice.'},
  {title:'2 · CAN ADDRESS', body:`<p>Put a card in <b>slot 10</b>. Each card reads its slot resistor (MF6220-1: R10 = 2K55) through a 1K pull-up and joins CAN with that address. The controller lists it at the next round.</p>`, check:()=>!!D.slots[9], hint:'Click slot 10.'},
  {title:'3 · PSU SERIAL', body:`<p>Raise a fault on <b>PSU2</b>. The controller reads each supply over its serial line and raises an alarm (the LED on the controller turns red).</p>`, check:()=>D.psu[1].fault&&alarms().length>0, hint:'PSU2 ok → FAULT.'},
  {title:'4 · FAN KIT ENABLE', body:`<p>Clear the PSU fault. Now fail a fan, then turn <b>FAN ENABLE</b> off and on. The drawing pairs ENABLE with FAN KIT: the controller can power the fan tray and read its status.</p>`, check:()=>!D.psu[1].fault&&D.fanFail&&D.fanEnable&&D.log.some(e=>e.name.startsWith('FAN KIT ENABLE → off')), hint:'Fan ok → FAILED, then FAN ENABLE twice.'},
  {title:'5 · AES RECEIVER', body:`<p>Remove the AES frame reference: the receiver lane loses its 192-frame blocks and an alarm appears. Zoom to 1 ms to see single 48 kHz frames when it is back.</p>`, check:()=>!D.aesRef, hint:'Press “AES reference”.'},
  {title:'Done', body:`<p>The board that implemented this idea is in the archive under another name — see <b>Findings</b> (FC6221).</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__c6201Active=false; tutorialView(m,{title:'Tutorial — the frame controller concept',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frameSVG()}${controlsHTML()}<div class="small">${nowHTML()}</div>`, bind:r=>{ bindFrame(r); bindControls(r); }}); }
function viewSecond(m){ window.__c6201Active=false;
  m.innerHTML=`${card('What the controller would do in one second',`<div id="rows"></div>`)}${card('Timeline',`<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const n=inserted().length, rows=[['CAN polls',D.ctl&&D.power?n*10:0,SIM.fmtDur(CANF),`${n} cards × 10 rounds of ${ROUND*1000} ms`],['PSU serial reads',2,SIM.fmtDur(OW),'one per supply'],['Frame 1-Wire read',1,SIM.fmtDur(OW),'at start-up'],['Fan kit reads',4,'0.4 ms','every 250 ms'],['AES reference blocks',D.refFs/192,SIM.fmtDur(192/D.refFs),'192 frames each'],['AES frames',D.refFs.toLocaleString(),SIM.fmtDur(1/D.refFs),'each with two 32-bit subframes']];
    m.querySelector('#rows').innerHTML=`<table class="kv"><tr><th>Event</th><th>per s</th><th>each</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">The functions come from the drawing; the rates are ${inf} from the MF6220 frame and openGear card models (CAN 1 Mbit/s, 1-Wire standard timing, AES3 at 48 kHz).</p>`;
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:230}); };
  SIM.on('time',draw); }
const BLOCKS={
  ctl:{x:330,y:150,w:190,h:80,t:'CONTROL',s:['controller (CPU)'],d:'The central block of the drawing. The later FC6221A uses an AT90CAN128.'},
  can:{x:330,y:20,w:190,h:80,t:'CAN BUS · CAN COM',s:['to every card slot'],d:'openGear cards are controlled over CAN; CAN COM is the transceiver side.'},
  addr:{x:600,y:20,w:190,h:80,t:'CAN ADDRESS',s:['slot ID resistor'],d:'How the controller (and each card) knows its address: the midplane resistor ladder.'},
  psu:{x:20,y:20,w:220,h:80,t:'PSU1 SERIAL · PSU2 SERIAL',s:['supply status'],d:'Serial status lines from the two frame supplies.'},
  frm:{x:20,y:150,w:220,h:80,t:'FRAME I-WIRE',s:['frame identity'],d:'“I-WIRE” = 1-Wire: an identity / EEPROM chip in the frame (DS2433 on MF6220-3).'},
  fan:{x:600,y:150,w:190,h:80,t:'ENABLE · FAN KIT',s:['fan tray power / status'],d:'The controller enables and monitors the fan kit.'},
  aes:{x:330,y:280,w:190,h:80,t:'AES RECEIVER',s:['frame reference'],d:'An AES receiver on the controller — its purpose is not written on the sheet (frame reference monitoring is the likely one, inferred). It is missing from the FC6221A netlist.'},
};
const WIRES=[['ctl','can',''],['can','addr',''],['psu','ctl',''],['frm','ctl',''],['ctl','fan',''],['aes','ctl','']];
function viewBlock(m){ window.__c6201Active=false; blockView(m,BLOCKS,WIRES,'ctl',[810,380],card('In one sentence',`<p>A controller card for the openGear frame: it addresses and polls the cards over CAN, reads the two power supplies and the frame's 1-Wire identity, enables and watches the fan kit, and receives an AES reference.</p><p class="small muted">Block names are the recovered labels of C6201-FUNCTIONAL.dwg; the arrangement is redrawn.</p>`)); }
const SHEETS=[
  {name:'1 · Functional sheet (redrawn)', note:'The DWG could not be rendered (no DWG reader); its text strings were recovered and placed in a plausible arrangement. Connections are inferred.', svg:()=>{ const bx=(x,y,w,t)=>`<rect x="${x}" y="${y}" width="${w}" height="44" fill="var(--panel2)" stroke="var(--ink)"/>`+txt(x+w/2,y+27,t,12,'var(--ink)','middle');
    return bx(340,190,180,'CONTROL')+bx(60,60,170,'PSU1 SERIAL')+bx(60,130,170,'PSU2 SERIAL')+bx(60,250,170,'FRAME I-WIRE')+bx(60,330,170,'AES  RECEIVER')+bx(620,60,170,'CAN BUS')+bx(620,130,170,'CAN COM')+bx(620,250,170,'CAN ADDRESS')+bx(620,330,170,'ENABLE → FAN KIT')
     +wire([[230,82],[290,82],[290,205],[340,205]])+wire([[230,152],[290,152]])+wire([[230,272],[290,272],[290,220],[340,220]])+wire([[230,352],[300,352],[300,228],[340,228]])+wire([[520,205],[580,205],[580,82],[620,82]])+wire([[580,152],[620,152]])+wire([[580,205],[580,272],[620,272]])+wire([[520,225],[560,225],[560,352],[620,352]])
     +txt(30,440,'Title block: C6201 FUNCTIONAL · FOLDER OPEN GEAR/C62XX/A · WB-TITLE-BLOCK · plotted on a “Xerox WC M15 Series PCL 6”',11,'var(--ink2)'); }},
  {name:'2 · As built later (FC6221A)', note:'For comparison: the same functions as wired on the FC6221A issue 1 netlist (Mar 2007).', svg:()=>chip(330,50,200,'U1 AT90CAN128 (FC6221A)',[['PD5/PD6','CAN BUS → SN65HVD233'],['PF1/ADC1','AN_FRAME_ID'],['PG0','FRM_1WIRE (“FRAME I-WIRE”)'],['PF2','PSU_SERIAL1_DATA'],['PF3','PSU_SERIAL2_DATA'],['PG1','FAULT']],[['PB2/PB3','+3V/+12V fan-board power (“ENABLE”)'],['PD0/PD1','I²C to the fan board (“FAN KIT”)'],['PG3','ALARM'],['—','no AES receiver']],'see the FC6221 plugin')},
];
function viewSchem(m){ window.__c6201Active=false; schemView(m,SHEETS,'C6201','Redrawn: labels from C6201-FUNCTIONAL.dwg; the as-built comparison from FC6221Aiss1.net.'); }
function viewSoft(m){ window.__c6201Active=false; let hot=0;
  m.innerHTML=`${card('No firmware — what the controller concept does, step by step (click a step)',`<div id="f"></div><div id="det" class="small"></div>`)}${card('Controller view',`<div id="nw"></div>`)}`;
  const draw=()=>{ const st=[{t:'Power-up',s:['read FRAME I-WIRE']},{t:'Enumerate',s:['CAN BUS: poll slot IDs',inserted().length+' found']},{t:'Supervise',s:['PSU1/2 SERIAL',D.psu.some(p=>p.fault||!p.on)?'fault':'ok'],bad:D.psu.some(p=>p.fault||!p.on)},{t:'Fans',s:['ENABLE / FAN KIT',D.fanFail?'fail':'ok'],bad:D.fanFail},{t:'Reference',s:['AES RECEIVER',aesLock()?'locked':'unlocked'],bad:!aesLock()},{t:'Report',s:[alarms().length+' alarms']}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=['Read the frame identity over 1-Wire (MF6220-3 carries a DS2433).','Poll each slot address on CAN; cards derive the address from the slot resistor (CAN ADDRESS).','Read both supplies’ serial status lines.','Switch the fan kit on and read its status.','Lock to the frame AES reference and report it.','Report everything (to a control port; the drawing shows CAN COM) — '+'how was never decided.'][hot];
    m.querySelector('#nw').innerHTML=nowHTML(); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__c6201Active=false;
  m.innerHTML=card('Findings',`<ol>
   <li><b>C6201 was a frame controller, and it was built — as the FC6221A.</b> The drawing's functions (CONTROL, CAN BUS, CAN ADDRESS, PSU1/PSU2 SERIAL, FRAME I-WIRE, ENABLE, FAN KIT) are exactly the nets of the <span class="mono">FC6221Aiss1</span> board six months later (<span class="mono">CANH/CANL</span>, <span class="mono">AN_FRAME_ID</span>, <span class="mono">PSU_SERIAL1/2_DATA</span>, <span class="mono">FRM_1WIRE</span>, <span class="mono">+12V/+3V_FAN_BOARD_CTL</span>). “Never produced” is true for the C6201 name; the design moved on as FC6221 (filed as a #PROBLEM board).</li>
   <li><b>The AES receiver was dropped.</b> The sheet has an AES RECEIVER block; the FC6221A has no receiver, and the slot-21 reference lines REF1_21/REF2_21 stop at its edge connector.</li>
   <li><b>Same time as the frame.</b> The drawing is dated 13 Jun 2006; the MF6220 frame design notes are from Nov 2006 / Jan 2007. Ward-Beck was planning its own frame with its own controller; the frame shipped with a Ross MFC-8310 in the controller slot ${inf}.</li>
   <li><b>Naming.</b> “C62XX” in the title-block folder suggests a C (controller) family beside the D (digital), AV, AA, M and T (rear module) 62xx openGear lines. No other C62xx exists in the archive.</li>
   <li><b>Two versions of the one sheet.</b> <span class="mono">C6201-FUNCTIONAL.bak</span> (71,781 bytes) differs from the .dwg (73,566 bytes) from byte 45 on: the last edit before saving. Both are AutoCAD 2000 (AC1015) files, which this archive cannot render without a DWG reader.</li>
   <li><b>“I-WIRE”.</b> The label is “FRAME I-WIRE”, almost certainly 1-Wire; the FC6221A net is <span class="mono">FRM_1WIRE</span>.</li></ol>`)
  +card('Assumptions',`<ul class="small"><li>Everything about behaviour and timing (${inf}): the drawing has only block names. Rates follow the MF6220 and openGear plugins.</li><li>The frame picture uses the MF6220 slot pitches; the card list is the WBS openGear range.</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>XXX - C6201 - #Engineering NEVER PRODUCED/C6201-FUNCTIONAL.dwg · .bak · README.md</li><li>FC6221 - #Engineering #PROBLEM/FC6221 - #PCB/FC6221Aiss1.net</li><li>siumulation-plugins/mf6220-frame.js · opengear.js</li></ul>`); }
SIM.register({
  id:'c6201-never-produced', name:'C6201 · openGear frame controller concept ('+SIM.year(2006)+')', duration:1, product:'C6201 - NEVER PRODUCED', year:2006,
  family:'Obsolete products', folder:'#OPENGEAR #SERIES/XXX - C6201 - #Engineering NEVER PRODUCED',
  summary:'One functional drawing from June 2006 for a card that was never sold: a controller for Ward-Beck\'s own openGear frame, with CAN to the cards, slot addressing, power-supply and frame 1-Wire monitoring, fan-kit enable and an AES receiver. The model shows the concept at work in the frame and links it to the board that implemented it, the FC6221A.',
  highlights:['Frame with clickable slots: CAN addressing from the slot resistor ladder','PSU, fan-kit and reference alarms','The controller\'s second: CAN polls, 1-Wire reads, AES reference blocks','Finding: the concept became the FC6221A “problem” board'],
  depth:'Hardware model',
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'1 CAN frame',period:()=>CANF},{label:'1 AES frame',period:()=>1/D.refFs},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.1,'100 ms (CAN round)'],[0.01,'10 ms'],[0.004,'4 ms (AES block)'],[0.001,'1 ms'],[1e-4,'100 µs']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Controller logic (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
