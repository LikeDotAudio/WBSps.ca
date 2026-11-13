/* =====================================================================
   E8200 — custom MF8200 card-to-D-sub extender modules E8200C (CBC, 2004|37) and E8200D (2005|38), Ward-Beck Systems
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: passive wiring, no electronics.

   Sources used (folder "#CUSTOM #SYSTEMS/XXX - CUSTOM - E8200 - #Engineering/"):
   - E8200C.pdf (10 Aug 2004, "E8200C CBC CUSTOM EXTENDER MODULE": M8204 / M8205 signal, DB25 pin, card pin)
   - E8200D PINOUTS.pdf (8 Mar 2005, "E8200D MODULE EXTENDER": DB37 pin, edge pin, D8201 … D8206 signals)
   - E8200D.cdr (CorelDRAW wiring sheet, rendered with Inkscape: DB37 ↔ edge lines), E8200D PINOUTS.cdr
   - Card context from the existing m8200-terminations.js, d8203.js, d8204.js plugins
   Anything not on those sheets is marked "inferred" on screen.
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
/* ---------------- the two pinout sheets, as data ---------------- */
// E8200C.pdf (10 Aug 2004, “E8200C CBC CUSTOM EXTENDER MODULE”): DB25 pin ↔ card pin, signal on M8204 / M8205
const EC = [[1,'1','INPUT A +','INPUT +'],[14,'A','INPUT A −','INPUT −'],[2,'2','GROUND','GROUND'],[15,'B','SHIELD A','SHIELD'],[3,'4','OUT A +','OUT 1 +'],[16,'D','OUT A −','OUT 1 −'],[4,'5','','OUT 2 +'],[17,'E','','OUT 2 −'],
  [5,'6','','OUT 3 +'],[18,'F','','OUT 3 −'],[6,'7','','OUT 4 +'],[19,'H','','OUT 4 −'],[7,'8','OUT B +','OUT 5 +'],[20,'J','OUT B −','OUT 5 −'],[8,'9','','OUT 6 +'],[21,'K','','OUT 6 −'],[9,'10','','OUT 7 +'],[22,'L','SHIELD B','OUT 7 −'],[10,'11','INPUT B +','OUT 8 +'],[23,'M','INPUT B −','OUT 8 −']];
const C_CARDS = ['M8204','M8205'];
// E8200D PINOUTS.pdf (8 Mar 2005, “E8200D MODULE EXTENDER”): DB37 pin ↔ edge pin, signal per card
const D_CARDS = ['D8201','D8201A','D8202','D8203','D8204','D8204A','D8205','D8206'];
const ED = [
  [1,'1',['IN−','IN1−','IN−','REFIN−','IN−','IN−','IN−','IN−']],[20,'A',['IN+','IN1+','IN+','REFIN+','IN+','IN+','IN+','IN+']],[2,'2',['','','','','','','','']],[21,'B',['GND','GND','GND','GND','GND','GND','GND','GND']],
  [3,'3',['','','','REFOUT−','','REFIN−','','']],[22,'C',['','','','REFOUT+','','REFIN+','','']],
  [4,'4',['OUT1−','OUT1−(ALARM1)','ANALOG OUT1L−','OUT1−','','','OUT1−','OUT1−']],[23,'D',['OUT1+','OUT1+(ALARM2)','ANALOG OUT1L+','OUT1+','OUT1, 75Ω','OUT1, 75Ω','OUT1+','OUT1+']],
  [5,'5',['OUT2−','OUT2−','ANALOG OUT2L−','OUT2−','','','OUT2−','OUT2−']],[24,'E',['OUT2+','OUT2+','ANALOG OUT2L+','OUT2+','OUT2, 75Ω','OUT2, 75Ω','OUT2+','OUT2+']],
  [6,'6',['OUT3−','OUT3−','ANALOG OUT3L−','OUT3−','','','OUT3−','OUT3−']],[25,'F',['OUT3+','OUT3+','ANALOG OUT3L+','OUT3+','OUT3, 75Ω','OUT3, 75Ω','OUT3+','OUT3+']],
  [7,'7',['OUT4−','OUT4−','','OUT4−','','','OUT4−','OUT4−']],[26,'H',['OUT4+','OUT4+','','OUT4+','OUT4, 75Ω','OUT4, 75Ω','OUT4+','OUT4+']],
  [8,'8',['OUT5−','OUT5−','ANALOG OUT1R−','','','ANALOG OUT1L−','OUT5−','OUT5−']],[27,'J',['OUT5+','OUT5+','ANALOG OUT1R+','','OUT5, 75Ω','ANALOG OUT1L+','OUT5+','OUT5+']],
  [9,'9',['OUT6−','OUT6−','ANALOG OUT2R−','ANALOG LIN−','','ANALOG OUT2L−','OUT6−','OUT6−']],[28,'K',['OUT6+','OUT6+','ANALOG OUT2R+','ANALOG LIN+','OUT6, 75Ω','ANALOG OUT2L+','OUT6+','OUT6+']],
  [10,'10',['OUT7−','OUT7−','ANALOG OUT3R−','','','ANALOG OUT1R−','OUT7−','OUT7−']],[29,'L',['OUT7+','OUT7+','ANALOG OUT3R+','','OUT7, 75Ω','ANALOG OUT1R+','OUT7+','OUT7+']],
  [11,'11',['OUT8−(ALARM1)','IN2−','CONFTALLY','ANALOG RIN−','','OUT2R− (CONFTALLY)','OUT8−(ALARM1)','OUT8−(ALARM1)']],[30,'M',['OUT8+(ALARM2)','IN2+','NOLOCKTALLY','ANALOG RIN+','OUT8, 75Ω','OUT2R+ (NOLOCKTALLY)','OUT8+(ALARM2)','OUT8+(ALARM2)']],
  [12,'12',['','OUT8−','','','','','','']],[31,'N',['','OUT8+','','','','','','']],
  [13,'13',Array(8).fill('−V')],[32,'P',Array(8).fill('−V')],[14,'14',Array(8).fill('GND')],[33,'R',Array(8).fill('GND')],[15,'15',Array(8).fill('+V')],[34,'S',Array(8).fill('+V')]];
// E8200D.cdr (the wiring sheet) draws DB37 1 → edge A, 20 → edge 1 … i.e. letters and numbers swapped against the PINOUTS table
const CDR_SWAP = true;
const CARD_DESC = { M8204:'dual analog DA (inputs A and B)', M8205:'1 × 8 analog DA', D8201:'AES DA (110 Ω)', D8201A:'dual-input AES DA with alarm relay', D8202:'AES → analog D/A with conf / no-lock tallies', D8203:'analog → AES A/D, reference in/out', D8204:'AES reclocking DA, 75 Ω outputs', D8204A:'AES DA 75 Ω + analog monitor outputs', D8205:'AES mixer / level DA (D8200 platform)', D8206:'AES tone generator (D8200 platform)' };
const kind = s => !s? 'nc' : /GND|GROUND|SHIELD/.test(s)? 'gnd' : /^[+−]V$/.test(s)? 'pwr' : /TALLY|ALARM/.test(s)&&!/OUT\d[+−]\(|OUT\d \(|\(ALARM/.test(s)? 'tally' : /75Ω/.test(s)? 'aes75' : /ANALOG|INPUT [AB]|^INPUT|OUT [AB]|^OUT \d/.test(s) && !/^D/.test(s)? 'analog' : 'aes';
/* ---------------- state ---------------- */
const FACT = { model:'D', cardD:'D8203', cardC:'M8205', harness:'M8205', sel:23, sig:'tone', lenM:20 };
const D = JSON.parse(JSON.stringify(FACT)); D.log=[];
const rows = () => D.model==='C' ? EC.map(([db,edge,a,b])=>({db,edge,sig: D.cardC==='M8204'?a:b, alt: D.harness==='M8204'?a:b})) : ED.map(([db,edge,s])=>({db,edge,sig:s[D_CARDS.indexOf(D.cardD)],alt:null}));
const cardName = () => D.model==='C'? D.cardC : D.cardD;
const sigKind = r => { if (!r||!r.sig) return 'nc'; const s=r.sig; if (/GND|GROUND|SHIELD/.test(s)) return 'gnd'; if (/^[+−]V$/.test(s)) return 'pwr'; if (/TALLY/.test(s)||/ALARM/.test(s)) return 'tally';
  if (/75Ω/.test(s)) return 'aes75'; if (D.model==='C' || /ANALOG/.test(s)) return 'analog'; return 'aes'; };
const conflicts = () => D.model!=='C' || D.cardC===D.harness ? [] : EC.filter(([db,e,a,b])=>a!==b).map(([db,e,a,b])=>({db,edge:e,want:D.harness==='M8204'?a:b,got:D.cardC==='M8204'?a:b})).filter(x=>x.want||x.got);
const act = makeActor(D, ()=>`${D.model==='C'?'E8200C':'E8200D'} · ${cardName()} · pin ${D.sel}`);
const A = {
  model(v){ act('Extender → '+(v==='C'?'E8200C (DB25, CBC)':'E8200D (DB37)'), tr=>{ D.model=v; D.sel=v==='C'?3:23; tr(v==='C'?'E8200C: 20 of the 25 DB25 pins used, no power pins — the card is powered from the frame':'E8200D: 34 of the 37 DB37 pins used, including ±V and GND'); }); },
  card(v){ act('Card → '+v, tr=>{ if (D.model==='C') D.cardC=v; else D.cardD=v; tr(`${v}: ${CARD_DESC[v]||''}`); const c=conflicts(); if (c.length) tr(`The harness is wired for ${D.harness}: ${c.length} pins now carry a different signal`); }); },
  harness(v){ act('DB25 harness wired for → '+v, tr=>{ D.harness=v; }); },
  pin(db){ act('Trace DB pin '+db, tr=>{ D.sel=db; const r=rows().find(x=>x.db===db); tr(r? `DB${D.model==='C'?25:37} pin ${db} ↔ card edge pin ${r.edge} : ${r.sig||'not used'} on the ${cardName()}` : `DB pin ${db}: not wired on the ${D.model==='C'?'E8200C':'E8200D'}`);
    if (r && D.model==='D' && CDR_SWAP){ const tw=ED.find(x=>x[0]===db); const swapped = /^\d+$/.test(r.edge)? 'letter row' : 'number row'; tr(`E8200D.cdr draws this DB pin to the ${swapped} instead (rows swapped against the PINOUTS sheet)`); } }); },
  sig(v){ act('Test signal → '+v, tr=>{ D.sig=v; }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
/* ---------------- drawings: connectors to scale (D-sub and 0.156″ edge standards; module outline inferred) ---------------- */
const KC = {nc:'#6b6f73',gnd:'#8a8f95',pwr:'#d33a2c',tally:'#b5651d',aes75:'#5aa9e6',aes:'#3f7fd8',analog:'#2fa35a'};
function dsubPins(n){ const top=Math.ceil(n/2), bot=n-top, P=[]; for (let i=0;i<top;i++) P.push({p:i+1,x:i,y:0}); for (let i=0;i<bot;i++) P.push({p:top+i+1,x:i+0.5,y:1}); return {top,P}; }
function moduleSVG(){ const n=D.model==='C'?25:37, {top,P}=dsubPins(n), S=D.model==='C'?62:50, R=rows(), map={}; R.forEach(r=>map[r.db]=r);
  const ox=40, oy=60, shellW=(top+1)*S, edgeX=ox+shellW+110; let s=`<svg viewBox="0 0 ${edgeX+220} 520" style="width:100%;max-width:1000px;background:var(--lane);border-radius:8px">
   <text x="${ox}" y="30" font-size="14" font-weight="700" fill="var(--ink)">DB${n} (${D.model==='C'?'E8200C, CBC custom':'E8200D module extender'})</text>
   <path d="M${ox} ${oy} H${ox+shellW} L${ox+shellW-S*0.6} ${oy+S*2.6} H${ox+S*0.6} Z" fill="#b9bcbf" stroke="#55595c" stroke-width="3"/>`;
  P.forEach(q=>{ const r=map[q.p], k=sigKind(r), cx=ox+S*0.75+q.x*S, cy=oy+S*0.75+q.y*S, sel=D.sel===q.p, bad=conflicts().some(c=>c.db===q.p);
    s+=`<g class="dbp" data-p="${q.p}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="17" fill="${r?KC[k]:'#3a3d40'}" stroke="${sel?'#ffd84a':bad?'var(--bad)':'#222'}" stroke-width="${sel||bad?4:1.5}"/><text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="13" fill="#fff">${q.p}</text><title>DB pin ${q.p}: ${r?(r.sig||'—')+' → edge '+r.edge:'not wired'}</title></g>`; });
  // card edge 15 × 2 (number side / letter side)
  const EL=['A','B','C','D','E','F','H','J','K','L','M','N','P','R','S'];
  s+=`<text x="${edgeX}" y="30" font-size="14" font-weight="700" fill="var(--ink)">Card edge P1 (30-way, ${cardName()})</text><rect x="${edgeX}" y="${oy-10}" width="190" height="${15*28+20}" rx="4" fill="#1f5a35"/>`;
  for (let i=0;i<15;i++){ const y=oy+i*28; [[String(i+1),edgeX+20],[EL[i],edgeX+120]].forEach(([e,x])=>{ const r=R.find(z=>z.edge===e), sel=r&&r.db===D.sel;
    s+=`<rect x="${x}" y="${y}" width="50" height="20" rx="2" fill="${r?KC[sigKind(r)]:'#8a7a3a'}" stroke="${sel?'#ffd84a':'#5a4a12'}" stroke-width="${sel?3:1}"/><text x="${x+25}" y="${y+14}" text-anchor="middle" font-size="11" fill="#fff">${e}</text>`; }); }
  const r=map[D.sel]; if (r){ const q=P.find(z=>z.p===D.sel), cx=ox+S*0.75+q.x*S, cy=oy+S*0.75+q.y*S, i=/^\d+$/.test(r.edge)? +r.edge-1 : EL.indexOf(r.edge), ex=/^\d+$/.test(r.edge)? edgeX+20 : edgeX+120, ey=oy+i*28+10;
    s+=`<path d="M${cx} ${cy} C ${cx+200} ${cy}, ${ex-160} ${ey}, ${ex} ${ey}" fill="none" stroke="#ffd84a" stroke-width="4"/><text x="${ox}" y="${oy+S*2.6+40}" font-size="13" fill="var(--ink)">DB pin ${D.sel} ↔ edge ${r.edge}: <tspan font-weight="700">${r.sig||'not used on this card'}</tspan></text>`; }
  s+=`<g font-size="11">${Object.entries({analog:'analog balanced',aes:'AES 110 Ω',aes75:'AES 75 Ω',tally:'tally / alarm',pwr:'power',gnd:'ground / shield'}).map(([k,l],i)=>`<rect x="${ox+(i%3)*170}" y="${oy+S*2.6+60+Math.floor(i/3)*22}" width="14" height="14" fill="${KC[k]}"/><text x="${ox+(i%3)*170+20}" y="${oy+S*2.6+72+Math.floor(i/3)*22}" fill="var(--ink2)">${l}</text>`).join('')}</g>`;
  return s+`<text x="${ox}" y="505" font-size="11" fill="var(--ink2)">D-sub and edge pitches from the connector standards; the module outline is not in the archive.</text></svg>`; }
function bindModule(r){ r.querySelectorAll('.dbp').forEach(g=>g.onclick=()=>A.pin(+g.dataset.p)); }
function controlsHTML(){ const cards=D.model==='C'?C_CARDS:D_CARDS;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px;align-items:center"><label>Extender <select id="e_m"><option value="C" ${D.model==='C'?'selected':''}>E8200C — DB25 (CBC, 2004)</option><option value="D" ${D.model==='D'?'selected':''}>E8200D — DB37 (2005)</option></select></label>
   <label>Card <select id="e_c">${cards.map(c=>`<option ${c===cardName()?'selected':''}>${c}</option>`).join('')}</select></label>${D.model==='C'?`<label>DB25 harness wired for <select id="e_h">${C_CARDS.map(c=>`<option ${c===D.harness?'selected':''}>${c}</option>`).join('')}</select></label>`:''}
   <label>Test signal <select id="e_s">${[['tone','1 kHz tone / AES 48 kHz'],['silence','silence']].map(([v,l])=>`<option value="${v}" ${v===D.sig?'selected':''}>${l}</option>`).join('')}</select></label></div><div class="small muted">Click a D-sub pin to trace it to the card edge.</div>`; }
function bindControls(r){ const q=s=>r.querySelector(s); if (!q('#e_m')) return; q('#e_m').onchange=e=>A.model(e.target.value); q('#e_c').onchange=e=>A.card(e.target.value); if (q('#e_h')) q('#e_h').onchange=e=>A.harness(e.target.value); q('#e_s').onchange=e=>A.sig(e.target.value); }
/* ---------------- what flows through the selected pin (one second) ---------------- */
const FS=48000;
function pinV(t){ const r=rows().find(x=>x.db===D.sel), k=sigKind(r); if (!r) return 0; const neg=/−/.test(r.sig||'');
  if (k==='pwr') return /\+V/.test(r.sig)? 12 : -12; if (k==='gnd'||k==='nc') return 0; if (k==='tally') return 5*(Math.floor(t*2)%2);
  if (D.sig==='silence' && (k==='analog')) return 0;
  if (k==='analog') return (neg?-1:1)*1.228*Math.SQRT2/2*Math.sin(2*Math.PI*1000*t);          // +4 dBu balanced, half per leg
  // AES: biphase-mark at 64·fs, amplitude 2.5 V per leg (110 Ω) or 1 V (75 Ω)
  const amp = k==='aes75'? 0.5 : 1.25, ui=1/(FS*128); const n=Math.floor(t/ui); const lvl=((n>>1)+((n&1)&&((n>>1)%7===3)?1:0))%2; return (neg?-1:1)*amp*(lvl?1:-1); }
function lanes(){ const r=rows().find(x=>x.db===D.sel), k=sigKind(r), a=SIM.css('--accent'), b=SIM.css('--accent2');
  const L=[{label:`DB pin ${D.sel} → edge ${r?r.edge:'—'}: ${r&&r.sig||'unused'}`, h:16, draw(c,X,t0,t1,y,h){ c.fillStyle=KC[k]; c.fillRect(X(t0),y+5,X(t1)-X(t0),h-10); }}];
  if (k==='aes'||k==='aes75'){ L.push({label:'AES blocks (192 frames, Z preamble)',h:18,draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,192/FS,0,1/FS,b,'blocks'); }},{label:'AES frames 48 kHz',h:18,draw(c,X,t0,t1,y,h){ if ((t1-t0)*FS>(X(t1)-X(t0))/3){ c.fillStyle=b; c.globalAlpha=.25; c.fillRect(X(t0),y+3,X(t1)-X(t0),h-6); c.globalAlpha=1; return; } SIM.pulses(c,X,t0,t1,y,h,1/FS,0,0.5/FS,b,''); }});
    L.push(waveLane('Line voltage (biphase-mark, 6.144 Mbit/s cells)', pinV, -0.3, null, a, 44, (()=>{ const e=()=>k==='aes75'?0.5:1.25; e.dense=(s,p)=>s*FS*128>p/2; return e; })())); }
  else if (k==='analog') L.push(waveLane('Voltage on this leg (+4 dBu balanced test tone)', pinV, -0.2, null, a, 50, (()=>{ const e=()=>D.sig==='silence'?0:0.87; e.dense=(s,p)=>s*1000>p/3; return e; })()));
  else L.push(waveLane('Voltage', pinV, -1, null, a, 40));
  if (D.model==='C' && conflicts().length) L.push(boolLane('Harness / card mismatch on this DB25', ()=>true, SIM.css('--bad')));
  return L; }
function tableHTML(){ const R=rows(), bad=new Set(conflicts().map(c=>c.db));
  return `<table class="kv small"><tr><th>DB pin</th><th>Edge</th><th>${cardName()}</th>${D.model==='C'?`<th>harness (${D.harness})</th>`:''}</tr>${R.map(r=>`<tr style="${r.db===D.sel?'background:color-mix(in srgb,var(--accent) 18%,transparent)':''}"><td class="mono">${r.db}</td><td class="mono">${r.edge}</td><td><span style="color:${KC[sigKind(r)]}">●</span> ${r.sig||'—'}</td>${D.model==='C'?`<td style="${bad.has(r.db)?'color:var(--bad);font-weight:700':''}">${r.alt||'—'}</td>`:''}</tr>`).join('')}</table>`; }
/* ---------------- views ---------------- */
function viewSim(m){ window.__e8200Active=false;
  m.innerHTML=`${card('Extender module — D-sub and card edge (click a pin)',`<div id="md"></div><div id="ctl"></div>`)}<div class="grid2">${card('What the wiring did',`<div id="trace" class="log"></div>`)}${card('Pin table (from the PDF)',`<div id="tb" class="scroll" style="max-height:420px"></div>`)}</div>
   ${card('Timeline — the signal on the selected pin over one second (zoom in for cycles and AES bits)',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const md=m.querySelector('#md'); md.innerHTML=moduleSVG(); bindModule(md); const c=m.querySelector('#ctl'); c.innerHTML=controlsHTML(); bindControls(c);
    m.querySelector('#trace').innerHTML=traceHTML(D,'Click a D-sub pin.'); m.querySelector('#tb').innerHTML=tableHTML(); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:250}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'What the E8200 is', body:`<p>Two pinout sheets for 8200-series cards: <b>E8200C</b> (Aug 2004, “CBC CUSTOM EXTENDER MODULE”, DB25 ↔ card, for the M8204 / M8205 analog DAs) and <b>E8200D</b> (Mar 2005, “MODULE EXTENDER”, DB37 ↔ card edge, for eight D82xx cards). Each brings the card's 30-way edge (pins 1–15 and A–S) out to a D-sub. No manual exists, so this walk-through uses the sheets themselves.</p>`, check:()=>true, auto:true},
  {title:'1 · Find the input', body:`<p>Choose <b>E8200C</b> and the <b>M8205</b>. Click DB25 pin <b>1</b>: INPUT + on card pin 1. Its partner, INPUT −, is DB25 pin 14 → card pin A.</p>`, check:()=>D.model==='C'&&D.cardC==='M8205'&&D.sel===14, hint:'Extender → E8200C, then click pins 1 and 14.'},
  {title:'2 · Same harness, other card', body:`<p>The harness is wired for the M8205. Fit an <b>M8204</b> instead: DB25 pins 22, 10 and 23 now carry SHIELD B and INPUT B ± where the harness expects OUT 7 − and OUT 8 ±. The table marks them red.</p>`, check:()=>D.model==='C'&&D.cardC==='M8204'&&D.harness==='M8205', hint:'Card → M8204.'},
  {title:'3 · Power on the DB37', body:`<p>Switch to <b>E8200D</b>. Find the power pins: −V on DB37 13/32, GND 14/33, +V 15/34. The E8200C carries no power at all.</p>`, check:()=>D.model==='D'&&(D.sel===15||D.sel===34), hint:'Click DB37 pin 15.'},
  {title:'4 · The A/D card', body:`<p>Pick the <b>D8203</b> (analog → AES). Its analog inputs are on DB37 9/28 (L) and 11/30 (R); AES outputs on 4–7 / 23–26; the reference loop on 1/20 (in) and 3/22 (out). Click DB37 <b>23</b> and zoom the timeline to 10 µs to see the AES bit cells.</p>`, check:()=>D.model==='D'&&D.cardD==='D8203'&&D.sel===23, hint:'Card → D8203, click pin 23.'},
  {title:'5 · Which drawing is right?', body:`<p>The CorelDRAW wiring sheet <span class="mono">E8200D.cdr</span> joins DB37 1 to edge <b>A</b> and DB37 20 to edge <b>1</b>; the PINOUTS table joins 1 to 1 and 20 to A. Trace any pin: the trace notes which row the CDR uses. One of the two is drawn from the other side of the connector.</p>`, check:()=>D.model==='D'&&D.log.some(e=>e.name.startsWith('Trace DB pin')), hint:'Click any DB37 pin.'},
  {title:'Done', body:`<p>See <b>Findings</b>.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__e8200Active=false; tutorialView(m,{title:'Tutorial — wiring a card through the E8200',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${moduleSVG()}${controlsHTML()}`, bind:r=>{ bindModule(r); bindControls(r); }}); }
function viewSecond(m){ window.__e8200Active=false;
  m.innerHTML=`<div class="grid2">${card('What one second carries through the extender',`<div id="rows"></div>`)}${card('Selected pin, nested zoom',`<canvas id="lad"></canvas>`)}</div>${card('Timeline',`<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const rows=[['Analog test tone','1,000','1 ms','+4 dBu balanced; the extender is passive copper'],['AES3 frames',FS.toLocaleString(),SIM.fmtDur(1/FS),'two 32-bit subframes'],['AES3 blocks',(FS/192).toFixed(0),'4 ms','192 frames, Z preamble'],['AES3 bit cells (biphase)',(FS*128).toLocaleString(),SIM.fmtDur(1/(FS*128)),'what the 75 Ω / 110 Ω lines carry'],['Delay through 0.5 m of wire','—','≈2.5 ns','negligible ('+'inferred'+')']];
    m.querySelector('#rows').innerHTML=`<table class="kv"><tr><th>Event</th><th>per s</th><th>each</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    drawLadder(m.querySelector('#lad'), SIM.t, [['Second',1],['10 ms',0.01],['100 µs',1e-4],['2 µs',2e-6]], pinV, -0.2, 'DB pin '+D.sel);
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:250}); };
  SIM.on('time',draw); }
const BLOCKS={
  frame:{x:20,y:120,w:180,h:80,t:'MF8200 frame',s:['card slot, power'],d:'The 8200-series frame (MF82). Cards plug in from the front; their 30-way edge mates with the backplane.'},
  card:{x:240,y:120,w:180,h:80,t:'8200 card',s:['P1 30-way edge','1–15 / A–S'],d:'M8204/M8205 analog DAs or D8201…D8206 AES cards.'},
  ext:{x:460,y:120,w:180,h:80,t:'E8200 module',s:['edge socket ↔ D-sub'],d:'Straight wiring from the card connector to a D-sub (no parts are listed).'},
  db25:{x:690,y:40,w:200,h:80,t:'E8200C: DB25',s:['20 pins, no power','CBC custom'],d:'Signals only — the card stays powered from the frame.'},
  db37:{x:690,y:200,w:200,h:80,t:'E8200D: DB37',s:['34 pins incl. ±V, GND'],d:'Carries the card supplies too, so a card could run on the bench or in another enclosure.'},
};
const WIRES=[['frame','card','power, ID'],['card','ext','30-way'],['ext','db25','E8200C'],['ext','db37','E8200D']];
function viewBlock(m){ window.__e8200Active=false; blockView(m,BLOCKS,WIRES,'ext',[910,320],card('In one sentence',`<p>A passive adapter that brings an 8200-series card's 30-way edge connector out to a D-sub, so a customer (CBC) could cable the card with standard D-sub harnesses.</p><p class="small muted">From the README and the two pinout PDFs; the frame-side mounting is ${inf}.</p>`)); }
const SHEETS=[
  {name:'1 · E8200C (DB25)', note:'Redrawn from E8200C.pdf: every row of the sheet.', svg:()=>{ let s=txt(40,30,'DB25',12)+txt(250,30,'CARD',12)+txt(420,30,'M8204',12)+txt(560,30,'M8205',12); EC.forEach(([db,e,a,b],i)=>{ const y=50+i*20; s+=txt(40,y+4,'PIN '+db,10.5)+`<circle cx="110" cy="${y}" r="4" fill="none" stroke="var(--ink)"/><circle cx="240" cy="${y}" r="4" fill="none" stroke="var(--ink)"/>`+wire([[114,y],[236,y]])+txt(250,y+4,'PIN '+e,10.5)+txt(420,y+4,a||'—',10.5,a?'var(--accent2)':'var(--ink2)')+txt(560,y+4,b,10.5,'var(--accent2)'); }); return s; }},
  {name:'2 · E8200D (DB37), part 1', note:'Redrawn from E8200D PINOUTS.pdf, rows DB37 1–25.', svg:()=>{ let s=txt(20,24,'DB37',11)+txt(60,24,'EDGE',11); D_CARDS.forEach((c,j)=>s+=txt(110+j*92,24,c,10.5)); ED.slice(0,20).forEach(([db,e,v],i)=>{ const y=44+i*21; s+=txt(20,y,String(db),10.5)+txt(64,y,e,10.5)+v.map((x,j)=>txt(110+j*92,y,x.replace('ANALOG ','A.').slice(0,13),9.5,x?'var(--accent2)':'var(--ink2)')).join(''); }); return s; }},
  {name:'3 · E8200D (DB37), part 2', note:'Rows DB37 11–15 and 30–34 (alarms, tallies, power).', svg:()=>{ let s=txt(20,24,'DB37',11)+txt(60,24,'EDGE',11); D_CARDS.forEach((c,j)=>s+=txt(110+j*92,24,c,10.5)); ED.slice(20).forEach(([db,e,v],i)=>{ const y=44+i*21; s+=txt(20,y,String(db),10.5)+txt(64,y,e,10.5)+v.map((x,j)=>txt(110+j*92,y,x.replace('ANALOG ','A.').slice(0,13),9.5,x?'var(--accent2)':'var(--ink2)')).join(''); });
    return s+txt(20,330,'E8200D.cdr wiring sheet (as drawn): 1→A, 20→1, 2→B, 21→2 … 15→S, 34→15 — letters and numbers swapped against this table.',11)+txt(20,350,'DB37 16–19 and 35–37 are unused on both sheets.',11); }},
];
function viewSchem(m){ window.__e8200Active=false; schemView(m,SHEETS,'E8200','Redrawn from E8200C.pdf and E8200D PINOUTS.pdf (CorelDRAW originals E8200D.cdr / E8200D PINOUTS.cdr).'); }
function viewSoft(m){ window.__e8200Active=false; let hot=1;
  m.innerHTML=`${card('No electronics — the path of the selected pin (click a stage)',`<div id="f"></div><div id="det" class="small"></div>`)}${card('Pin table',`<div id="tb"></div>`)}`;
  const draw=()=>{ const r=rows().find(x=>x.db===D.sel); const st=[{t:cardName(),s:[(r&&r.sig)||'unused']},{t:'Edge pin '+(r?r.edge:'—'),s:['30-way, 0.156″']},{t:'E8200 wiring',s:['straight copper']},{t:'DB'+(D.model==='C'?25:37)+' pin '+D.sel,s:[sigKind(r)]},{t:'Harness',s:[D.model==='C'?'wired for '+D.harness:'customer cable'],bad:conflicts().some(c=>c.db===D.sel)}];
    m.querySelector('#f').innerHTML=flowSVG(st,hot); m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{hot=+g.dataset.st;draw();});
    m.querySelector('#det').innerHTML=[`${cardName()}: ${CARD_DESC[cardName()]||''}.`,'Card edge pins 1–15 on one side, A–S (no G, I, O, Q) on the other.','No components on either sheet: the module is wiring only.','D-sub pin numbering: row 1 = 1…13 (DB25) or 1…19 (DB37), row 2 below it.',D.model==='C'?'The CBC harness: a different card on the same harness swaps signals on the red pins.':'Any harness.'][hot];
    m.querySelector('#tb').innerHTML=tableHTML(); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__e8200Active=false;
  m.innerHTML=card('Findings',`<ol>
   <li><b>The two E8200D drawings disagree.</b> <span class="mono">E8200D PINOUTS.pdf</span> pairs DB37 1 with edge 1 and DB37 20 with edge A. The CorelDRAW wiring sheet <span class="mono">E8200D.cdr</span> joins 1 → A, 20 → 1, 2 → B, 21 → 2 … 34 → 15: the two edge rows are swapped. One was drawn looking at the other side of the connector. Built from the wrong one, every balanced pair comes out inverted (IN−/IN+, OUTn−/OUTn+) and the GND on DB37 21 lands on the blank edge pin 2; only the supplies survive, because −V, GND and +V sit on both rows (13/P, 14/R, 15/S).</li>
   <li><b>E8200C carries no power.</b> Only signal pins 1–11 / A–M are wired (card pin 3/C is skipped); edge 12–15 / N–S, which carry −V, GND and +V on the E8200D sheet, are not. The CBC module therefore relies on the frame for power, while the E8200D can power a card on its own.</li>
   <li><b>One harness, two cards, three clashes.</b> On the E8200C, card pins L, 11 and M are SHIELD B and INPUT B ± on the M8204 but OUT 7 − and OUT 8 ± on the M8205. A DB25 harness wired for one card feeds outputs into inputs (or into the shield) on the other.</li>
   <li><b>Alarms and tallies share output pins.</b> D8201/D8205/D8206 put ALARM1/ALARM2 on the OUT8 pins (DB37 11/30); the D8201A puts them on OUT1 (4/23) because its OUT8 moves to 12/31 to make room for a second input. The D8202 and D8204A use the same pins for CONF / NO-LOCK tallies.</li>
   <li><b>The 75 Ω cards are single-ended.</b> D8204 and D8204A list “OUTn, 75 OHM” on the + rows only (23–30): coax outputs with the − pins unused, unlike the balanced 110 Ω cards.</li>
   <li><b>The D8203 uses the extender for its reference loop.</b> REFIN on DB37 1/20 and REFOUT on 3/22; its analog inputs are LIN on 9/28 and RIN on 11/30.</li>
   <li><b>Pins left free.</b> DB25 11–13 and 24–25; DB37 2 (edge 2 is blank for every card), 16–19 and 35–37.</li>
   <li><b>Customer.</b> “CBC” on the E8200C sheet; the D version, seven months later, generalises it to the whole D82xx range.</li></ol>`)
  +card('Assumptions',`<ul class="small"><li>Signal types per pin are read from the names; voltages (+4 dBu analog, 2.5 V / 1 V AES legs, ±12 V supplies, 5 V tallies) are ${inf}.</li><li>Connector geometry is from the D-sub and 0.156″ edge-connector standards; the module itself is not drawn anywhere.</li><li>Which drawing of E8200D is correct is not decided by the archive.</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>XXX - CUSTOM - E8200 - #Engineering/E8200C.pdf · E8200D PINOUTS.pdf · E8200D.cdr · E8200D PINOUTS.cdr</li><li>siumulation-plugins/m8200-terminations.js · d8203.js · d8204.js (card context)</li></ul>`); }
SIM.register({
  footnotes: [{"text": "No panel artwork exists for the E8200 extenders: E8200D.cdr is a DB37-to-edge wiring sheet titled “E8200D MODULE EXTENDER”.", "src": "#CUSTOM #SYSTEMS/XXX - CUSTOM - E8200 - #Engineering/E8200D.cdr"}, {"text": "On the pinout sheet the D8204A tally labels “(CONF TALLY)” and “(NO LOCK TALLY)” run past their cell into the next column.", "src": "#CUSTOM #SYSTEMS/XXX - CUSTOM - E8200 - #Engineering/E8200D PINOUTS.cdr"}],
  
  id:'custom-e8200', name:'E8200 · custom MF8200 card-to-D-sub extender ('+SIM.year(2004)+')', duration:1, product:'CUSTOM - E8200', year:2004,
  family:'Obsolete products', folder:'#CUSTOM #SYSTEMS/XXX - CUSTOM - E8200 - #Engineering',
  summary:'Two pinout sheets for a passive module that brings an 8200-series card\'s 30-way edge out to a D-sub: E8200C (DB25, for CBC, M8204/M8205) and E8200D (DB37, eight D82xx cards, with power). The model traces every pin and shows the signal it carries.',
  highlights:['Click any D-sub pin and follow it to the card edge','Ten card pinouts from the two sheets','Harness mismatch between M8204 and M8205','Signal on the pin over one second: tone, AES bits, supplies','Finding: the CDR wiring sheet swaps the edge rows against the PDF'],
  depth:'Hardware model',
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'1 AES frame',period:()=>1/FS},{label:'1 AES bit cell',period:()=>1/(FS*128)}],
  zooms:[[1,'1 s'],[0.01,'10 ms'],[0.004,'4 ms (AES block)'],[0.001,'1 ms'],[1e-4,'100 µs'],[1e-5,'10 µs (AES bits)']], defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Signal path (no electronics)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
