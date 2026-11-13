/* =====================================================================
   FC6221A — MF6220 frame controller card, issue 1 (Ward-Beck Systems, schematic 2006|39–2007|40, PCB 2008|41)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model: no firmware for this board is archived.

   Sources used (folder "#OPENGEAR #SERIES/FC6221 - #Engineering #PROBLEM/FC6221 - #PCB/"):
   - FC6221Aiss1.net (P-CAD netlist, 21 Mar 2007: every pin and net used below) and FC6221Aiss1sch.net (20 Dec 2006)
   - FC6221Aiss1.ECO (94 RefdesChange lines, path H:\OPEN GEAR\FC62xx\FC6221\FC6221Aiss1.sch)
   - FC6221A.bom (values, footprints; header "MLC-8-ISS1"), FC6221A.pcb.md (layers, plating notes, footprints)
   - Cross-checked with the MF6220 frame plugin (mf6220-frame.js: FINC slot 21, FAULT on P21-10, AN_FRAME_ID 2K21,
     fan board PCA9555 / TC670 on the EDAC-20) and XXX - C6201 - #Engineering NEVER PRODUCED/C6201-FUNCTIONAL.dwg
   - Data-sheet facts (not archive files): AT90CAN128 TQFP-64 pin-out, SN65HVD233 pins, RXE050 hold/trip currents,
     1-Wire and I²C timing. Everything not in the archive is marked "inferred" on screen.
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
/* ---------------- netlist facts (FC6221Aiss1.net) ---------------- */
const P2N = {"1":"ELED_ACT","2":"ELED_LINK","4":"REF1_21","5":"ETHER_RXP","7":"ETHER_RXN","9":"ETHER_RXC","10":"FAULT","12":"REF2_21","13":"ETHER_TXP","15":"ETHER_TXN","16":"FRM_1WIRE","17":"ETHER_TXC","18":"AN_FRAME_ID","20":"PSU_SERIAL2_DATA","21":"CANL","23":"CANH","26":"PSU_SERIAL1_DATA","27":"CLED_LINK","28":"CLED_ACT","31":"PSB_1+","32":"DIP4","33":"PSB_1-","34":"DIP3","38":"DIP1","40":"DIP2","44":"RS422TX-","46":"RS422TX+","50":"RS485-","52":"RS485+","93":"-7V5","96":"-7V5","97":"+12V","98":"+12V","99":"+12V","100":"+12V"};
[3,6,8,11,14,19,22,24,25,29,30,35,36,47,48,53,54,59,60,65,66,71,72,77,78,83,84,89,90].forEach(p=>P2N[p]='GNDD');
const P1N = {"1":"GNDD","2":"GNDD","5":"+12V to fan board (via Q1, F1)","6":"+12V to fan board (via Q1, F1)","9":"+3V3 to fan board (via Q3, F2)","10":"+3V3 to fan board (via Q3, F2)","13":"GNDD","14":"GNDD","15":"ALARM","16":"SCL","17":"SDA","19":"AN_FAN_ID","20":"GNDD"};
const ONCARD = new Set(['FAULT','FRM_1WIRE','AN_FRAME_ID','PSU_SERIAL2_DATA','PSU_SERIAL1_DATA','CANL','CANH','CLED_LINK','CLED_ACT','DIP1','DIP2','DIP3','DIP4','RS422TX-','RS422TX+','RS485-','RS485+','+12V','GNDD']);
// AT90CAN128 (TQFP-64) pins used, from the netlist; port names from the data sheet
const U1 = [[1,'PEN','3V (tied high)'],[2,'PE0/RXD0','CPU_RX ← U3 RO'],[3,'PE1/TXD0','CPU_TX → U2, U3 DI'],[4,'PE2','U2 DE/RE (RS-422 TX enable)'],[5,'PE3','U3 DE/RE (RS-485 direction)'],[6,'PE4','DIP2 ← P2-40'],[7,'PE5','DIP1 ← P2-38'],[8,'PE6','DIP3 ← P2-34'],[9,'PE7','DIP4 ← P2-32'],
  [10,'PB0','CLED_ACT_CTL → Q5 → P2-28'],[11,'PB1','CLED_LINK_CTL → Q6 → P2-27'],[12,'PB2','+3V_FAN_BOARD_CTL → Q4 → Q3'],[13,'PB3','+12V_FAN_BOARD_CTL → Q2 → Q1'],[18,'PG3','ALARM → P1-15'],[19,'PG4','SW2 (EVQPP) via R36'],[20,'RESET','NSRST: R13 10K, C9, JTAG3-6'],[23,'XTAL2','X1 8 MHz'],[24,'XTAL1','X1 8 MHz'],
  [25,'PD0/SCL','SCL → P1-16'],[26,'PD1/SDA','SDA ↔ P1-17'],[30,'PD5/TXCAN','CAND → U4 D'],[31,'PD6/RXCAN','CANR ← U4 R (C17 15 pF)'],[32,'PD7','LBK → U4 loop-back'],[33,'PG0','FRM_1WIRE ↔ P2-16'],[34,'PG1','FAULT_DATA ← R9 ← P2-10'],
  [35,'PC0','DIP_IN1 ← R25 110R ← SW1'],[36,'PC1','DIP_IN2'],[37,'PC2','DIP_IN3'],[38,'PC3','DIP_IN4'],[39,'PC4','DIP_IN5'],[40,'PC5','DIP_IN6'],[41,'PC6','DIP_IN7'],[42,'PC7','DIP_IN8'],[43,'PG2','R35 4K75 → Q7 → ALARM1 buzzer'],
  [48,'PA3','LED1 → R18 750 → L4 green'],[49,'PA2','LED2 → R15 → L3 yellow'],[50,'PA1','LED3 → R14 → L2 red'],[51,'PA0','LED4 → R12 → L1 green'],[54,'PF7/TDI','JTAG3-9'],[55,'PF6/TDO','JTAG3-3'],[56,'PF5/TMS','JTAG3-5'],[57,'PF4/TCK','JTAG3-1'],
  [58,'PF3','PSU_SERIAL2_DATA ↔ P2-20 (R8 pull-up)'],[59,'PF2','PSU_SERIAL1_DATA ↔ P2-26 (R7 pull-up)'],[60,'PF1/ADC1','AN_FRAME_ID ← P2-18, R17 1K to 3V'],[61,'PF0/ADC0','AN_FAN_ID ← P1-19, R16 1K to 3V'],[62,'AREF','3V'],[64,'AVCC','3V via R11 10R']];
const PARTS = {
  U1:'AT90CAN128 (TQFP64) — the controller. 8 MHz crystal X1, three JTAG footprints (only JTAG3 is wired to it).', U4:'SN65HVD233 3.3 V CAN transceiver (BOM spells it “SN65HDV233D”). CANH/CANL to P2-23/P2-21; LBK from PD7.',
  U2:'ADM3485EAR — RS-422 transmitter only (DI = CPU_TX, enable PE2) → RS422TX± (10R + bias resistors) → P2-46/44.', U3:'ADM3485EAR — RS-485 half duplex (RO → CPU_RX, DI ← CPU_TX, DE/RE ← PE3) → RS485± → P2-52/50.',
  REG1:'LM1117-3.3 → “3V” logic rail for U1–U4.', REG2:'LM1117-3.3 → +3V3VF, switched by Q3 to the fan board (P1-9/10).', R10:'2R2 ½ W in parallel with ferrite FB1 from +12VF to both regulator inputs.',
  Q1:'NDC652P P-FET: +12VF → F1 → fan board +12 V (P1-5/6). Gate pulled up by R1, pulled down by Q2.', Q3:'NDC652P P-FET: +3V3VF → F2 → fan board +3.3 V (P1-9/10). Driven by Q4.', Q2:'2N4401, base from PB3 (+12V_FAN_BOARD_CTL).', Q4:'2N4401, base from PB2 (+3V_FAN_BOARD_CTL).',
  Q5:'2N4401: CLED_ACT_CTL (PB0) → CLED_ACT (P2-28) — drives the rear MagJack ACT LED on MF6220-3.', Q6:'2N4401: CLED_LINK_CTL (PB1) → CLED_LINK (P2-27).', Q7:'2N4401 from PG2 via R35 4K75 → ALARM1 SDT083A buzzer.',
  F1:'RXE050 polyfuse (hold 0.5 A, trip 1.0 A) in the fan board +12 V feed.', F2:'RXE050 polyfuse in the fan board +3.3 V feed.', F3:'RXE-050/SM polyfuse on the card +12 V input (P2-97…100).',
  SW1:'219-8MS 8-way DIP: DIP_IN1…8 → PC0…PC7 through 110R resistors.', SW2:'EVQPP push button: R37 1K to 3V, R36 1K to PG4.', X1:'8 MHz crystal, C13/C14 27 pF.', ALARM1:'SDT083A buzzer, low side switched by Q7.',
  JTAG1:'H2X5 right-angle header — wired only to JTAG2.', JTAG2:'H2X5 header — wired only to JTAG1.', JTAG3:'Samtec HLE 2×5 SMT — the only header connected to U1 (TCK/TDO/TMS/TDI/NSRST).',
  L1:'Green LED ← PA0 (LED4).', L2:'Red LED ← PA1 (LED3).', L3:'Yellow LED ← PA2 (LED2).', L4:'Green LED ← PA3 (LED1).', P1:'EDAC20 card edge → MF6220-2 fan/alarm board.', P2:'MEDAC100 card edge → MF6220-1 midplane, slot 21.' };
/* ---------------- state ---------------- */
const FRAMES = [['2K21 (MF6220-1, WBS frame)',2210],['open (no frame resistor)',1e9],['short (0 Ω)',0],['10K',10000]];
const FACT = { power:true, dip:[false,false,false,false,false,false,false,false], fdip:[false,false,false,false], frameR:2210, fanR:4990, fanBoard:true, fanI:0.45, fan12:true, fan3:true,
  psuFault:[false,false], stall:false, lbk:false, cards:6, leds:[true,false,false,false], buzz:false, sel:'U1', pin:null };
const D = JSON.parse(JSON.stringify(FACT)); D.log=[];
const adc = R => Math.min(1023, Math.round(1023*R/(R+1000)));
const vin = () => D.power? 12 - 2.2*0.06 : 0;                                    // regulator input after R10 at ≈60 mA (inferred load)
const fan12On = () => D.power && D.fan12 && D.fanBoard, fan3On = () => D.power && D.fan3 && D.fanBoard;
const f1State = () => !fan12On()? 'off' : D.fanI<=0.5? 'held (below 0.5 A)' : D.fanI<1.0? 'may trip (0.5–1.0 A)' : 'trips (above 1.0 A)';
const faultLine = () => D.psuFault[0]||D.psuFault[1];
const i2cOK = () => D.power && fan3On();
const busCards = () => D.lbk? 0 : D.cards;
const act = makeActor(D, ()=>`frame ID ADC ${adc(D.frameR)} · fan board ${fan12On()?'powered':'off'} · CAN ${busCards()} cards`);
const A = {
  power(){ act(D.power?'Pull the card':'Insert the card into slot 21', tr=>{ D.power=!D.power; tr(D.power?'P2-97…100 +12V → F3 RXE-050 → FB2 → +12VF → R10/FB1 → REG1 (3V logic) and REG2 (+3V3VF)':'All rails off; the fan board loses power and the alarm logic stops'); }); },
  dip(i){ act(`SW1-${i+1} → ${D.dip[i]?'OFF':'ON'}`, tr=>{ D.dip[i]=!D.dip[i]; tr(`SW1 pin ${16-i} → R${[25,26,27,28,29,30,32,34][i]} 110R → DIP_IN${i+1} → PC${i} (U1 pin ${35+i}) reads ${D.dip[i]?0:1} (internal pull-up ${inf})`); }); },
  fdip(i){ act(`Frame DIP ${i+1} (MF6220-3) → ${D.fdip[i]?'OFF':'ON'}`, tr=>{ D.fdip[i]=!D.fdip[i]; const pin={0:7,1:6,2:8,3:9}[i]; tr(`DIP${i+1} → P2-${[38,40,34,32][i]} → U1 pin ${pin} (PE${pin-2}) — note the order: DIP1 is PE5, DIP2 is PE4`); }); },
  sw2(){ act('Press SW2', tr=>{ tr('SW2 EVQPP pulls R36 / PG4 (U1 pin 19) low; R37 1K to 3V is the pull-up'); tr(`What it does depends on firmware that was never written ${inf}`); }); },
  frame(r){ act('Frame ID resistor → '+(r>=1e9?'open':r+' Ω'), tr=>{ D.frameR=r; tr(`AN_FRAME_ID: R17 1K to 3V over the frame resistor → ${(3.3*r/(r+1000)).toFixed(2)} V → ADC1 = ${adc(r)} (AREF = 3V)`); }); },
  fan(k){ act(`${k==='fan12'?'+12V':'+3V3'} fan-board supply → ${D[k]?'off':'on'}`, tr=>{ D[k]=!D[k]; tr(k==='fan12'? `PB3 ${D.fan12?'high':'low'} → Q2 ${D.fan12?'on':'off'} → Q1 gate ${D.fan12?'pulled low: P-FET on':'pulled up by R1: off'} → F1 → P1-5/6` : `PB2 → Q4 → Q3 → F2 → P1-9/10 (fan board logic, PCA9555)`); }); },
  fanI(v){ act('Fan load → '+v+' A', tr=>{ D.fanI=v; tr(`F1 RXE050: ${f1State()} ${inf}: five TC670-monitored fans on MF6220-2 share this feed`); }); },
  psu(i){ act(`PSU${i+1} fault ${D.psuFault[i]?'cleared':'raised'}`, tr=>{ D.psuFault[i]=!D.psuFault[i]; tr('PSU FAULT pins wired-OR on the midplane → R66/R65 divider → P2-10 FAULT → R9 → FAULT_DATA (PG1, U1 pin 34)'); }); },
  stall(){ act(D.stall?'Fan restored':'A fan stalls', tr=>{ D.stall=!D.stall; tr('MF6220-2: TC670 ALERT → PCA9555 input; the controller sees it at its next I²C read of the fan board'); if (!i2cOK()) tr('…but the fan board +3V3 is off, so the I²C read gets a NACK'); }); },
  lbk(){ act('CAN LBK → '+(D.lbk?'normal':'loop-back'), tr=>{ D.lbk=!D.lbk; tr(D.lbk?'PD7 high → SN65HVD233 LBK: D is looped to R and the bus driver is off — the controller hears only itself':'PD7 low → normal: CANH/CANL on P2-23/21 to every slot'); }); },
  led(i){ act(`LED ${['L1 green','L2 red','L3 yellow','L4 green'][i]} → ${D.leds[i]?'off':'on'}`, tr=>{ D.leds[i]=!D.leds[i]; tr(`PA${i} → R${[12,14,15,18][i]} 750 → L${i+1}`); }); },
  buzz(){ act('Buzzer '+(D.buzz?'off':'on'), tr=>{ D.buzz=!D.buzz; tr('PG2 (U1 pin 43) → R35 4K75 → Q7 → ALARM1 SDT083A'); }); },
  cards(n){ act('Cards in the frame → '+n, tr=>{ D.cards=n; }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; SIM.refresh(); },
};
/* ---------------- the card (layout inferred: the binary PCB file is not readable and #GERBERS is empty) ---------------- */
const BW=1000, BH=560;
const PL = { U1:[420,200,120,120], U4:[300,420,60,40], U2:[620,430,50,36], U3:[690,430,50,36], X1:[560,230,30,50], REG1:[800,150,60,40], REG2:[800,220,60,40], R10:[740,150,40,20], Q1:[880,120,36,30], Q3:[880,220,36,30], Q2:[880,80,30,24], Q4:[880,270,30,24],
  F1:[930,120,40,26], F2:[930,220,40,26], F3:[860,470,50,26], Q5:[520,440,30,24], Q6:[560,440,30,24], Q7:[180,120,30,24], ALARM1:[110,90,60,60], SW1:[40,200,60,150], SW2:[40,380,50,40], L1:[20,60,24,16], L2:[20,90,24,16], L3:[20,120,24,16], L4:[20,150,24,16],
  JTAG1:[250,60,80,40], JTAG2:[350,60,80,40], JTAG3:[460,60,70,40] };
function cardSVG(){ let s=`<svg viewBox="0 0 ${BW} ${BH+70}" style="width:100%;max-width:980px;background:var(--lane);border-radius:8px">
  <rect x="10" y="10" width="${BW-20}" height="${BH-20}" rx="6" fill="#1f5a35" stroke="#0e3a20" stroke-width="3"/>`;
  for (let i=0;i<50;i++){ const x=60+i*16.5, top=P2N[2*i+1]||'nc', bot=P2N[2*i+2]||'nc';
    [[2*i+1,BH-14,top],[2*i+2,BH+2,bot]].forEach(([pin,y,n])=>{ const sel=D.pin==='P2-'+pin; s+=`<rect class="pin" data-p="P2-${pin}" x="${x}" y="${y}" width="12" height="14" fill="${sel?'#ffd84a':n==='nc'?'#8a7a3a':ONCARD.has(n)?'#e2c05a':'#b9a060'}" stroke="#5a4a12"><title>P2-${pin}: ${n}${n!=='nc'&&!ONCARD.has(n)?' (reaches the connector only)':''}</title></rect>`; }); }
  s+=`<text x="60" y="${BH+36}" font-size="12" fill="var(--ink2)">P2 MEDAC100 → MF6220-1 midplane slot 21 (pins 1…99 top, 2…100 bottom; pale = connector only)</text>`;
  for (let i=0;i<10;i++){ const y=330+i*18; [[2*i+1,BW-14],[2*i+2,BW-2]].forEach(([pin,x])=>{ const n=P1N[pin]||'nc', sel=D.pin==='P1-'+pin; s+=`<rect class="pin" data-p="P1-${pin}" x="${x-10}" y="${y}" width="14" height="13" fill="${sel?'#ffd84a':n==='nc'?'#8a7a3a':'#e2c05a'}" stroke="#5a4a12"><title>P1-${pin}: ${n}</title></rect>`; }); }
  s+=`<text x="${BW-20}" y="318" font-size="11" text-anchor="end" fill="#e8f0e8">P1 EDAC20 → fan board</text>`;
  for (const k in PL){ const [x,y,w,h]=PL[k], sel=D.sel===k; let fill='#2a2d31';
    if (k[0]==='L'){ const i=+k[1]-1, on=D.power&&D.leds[i]; fill=on?['#7dff6a','#ff4a3a','#ffd23a','#7dff6a'][i]:'#333'; }
    if (k==='F1' && fan12On() && D.fanI>1.0) fill='var(--bad)';
    s+=`<g class="part" data-k="${k}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${sel?'#ffd84a':'#c9cbcc'}" stroke-width="${sel?3:1}"/><text x="${x+w/2}" y="${y+h/2+4}" font-size="10" text-anchor="middle" fill="${k[0]==='L'&&D.power&&D.leds[+k[1]-1]?'#000':'#eee'}">${k}</text><title>${PARTS[k]||k}</title></g>`; }
  D.dip.forEach((on,i)=>{ s+=`<rect class="dp" data-i="${i}" x="48" y="${206+i*17.5}" width="44" height="13" fill="#e8ecef" style="cursor:pointer"/><rect x="${on?50:70}" y="${208+i*17.5}" width="20" height="9" fill="#2a2d31" pointer-events="none"/>`; });
  s+=`<text x="20" y="${BH-30}" font-size="11" fill="#e8f0e8">Front edge (operator side, ${inf.replace(/<[^>]+>/g,'')})</text>`;
  return s+`<text x="300" y="${BH+56}" font-size="11" fill="var(--ink2)">Part positions are a functional layout (inferred); pins and nets are from FC6221Aiss1.net.</text></svg>`; }
function bindCard(root){ root.querySelectorAll('.part').forEach(g=>g.onclick=()=>{ D.sel=g.dataset.k; if (D.sel==='SW2') A.sw2(); else if (D.sel[0]==='L'&&D.sel.length===2) A.led(+D.sel[1]-1); else if (D.sel==='ALARM1') A.buzz(); else SIM.refresh(); });
  root.querySelectorAll('.pin').forEach(g=>g.onclick=()=>{ D.pin=g.dataset.p; SIM.refresh(); }); root.querySelectorAll('.dp').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i)); }
function infoHTML(){ const p=D.pin; let pinTxt='';
  if (p){ const [c,n]=p.split('-'), net=(c==='P2'?P2N:P1N)[n]||'not connected'; const u=U1.find(x=>x[2].includes(net.split(' ')[0])); pinTxt=`<b>${p}</b> = <span class="mono">${net}</span>${u?` → U1 pin ${u[0]} (${u[1]})`:''}${c==='P2'&&net!=='not connected'&&!ONCARD.has(net)?' — <b>goes nowhere on the card</b>':''}`; }
  return `<div class="small">${PARTS[D.sel]?`<b>${D.sel}</b>: ${PARTS[D.sel]}`:''}</div><div class="small" style="margin-top:4px">${pinTxt||'<span class="muted">Click an edge-connector finger to trace its net.</span>'}</div>`; }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:6px">
  <button id="c_pw">${D.power?'Pull card':'Insert card'}</button><button id="c_12">+12V fan supply ${D.fan12?'ON':'off'}</button><button id="c_3">+3V3 fan supply ${D.fan3?'ON':'off'}</button>
  <label>Fan load <select id="c_fi">${[0.2,0.45,0.75,1.2].map(v=>`<option ${v===D.fanI?'selected':''}>${v}</option>`).join('')}</select> A ${inf}</label>
  <label>Frame ID <select id="c_fr">${FRAMES.map(([l,r])=>`<option value="${r}" ${r===D.frameR?'selected':''}>${l}</option>`).join('')}</select></label>
  <button id="c_p1">PSU1 ${D.psuFault[0]?'FAULT':'ok'}</button><button id="c_p2">PSU2 ${D.psuFault[1]?'FAULT':'ok'}</button><button id="c_st">Fan ${D.stall?'stalled':'ok'}</button><button id="c_lb">LBK ${D.lbk?'loop-back':'normal'}</button>
  <label>Cards on CAN <select id="c_cd">${[0,1,6,12,20].map(v=>`<option ${v===D.cards?'selected':''}>${v}</option>`).join('')}</select></label>
  <span>Frame DIP (MF6220-3): ${D.fdip.map((v,i)=>`<label><input type="checkbox" data-fd="${i}" ${v?'checked':''}>${i+1}</label>`).join(' ')}</span></div>
  <div class="small muted">Click parts (L1–L4, ALARM1, SW2 act), SW1 switches, or a gold finger to trace it. Keys: F fan supply, L loop-back, B buzzer.</div>`; }
function bindControls(r){ const q=s=>r.querySelector(s); if(!q('#c_pw')) return; q('#c_pw').onclick=()=>A.power(); q('#c_12').onclick=()=>A.fan('fan12'); q('#c_3').onclick=()=>A.fan('fan3'); q('#c_fi').onchange=e=>A.fanI(+e.target.value);
  q('#c_fr').onchange=e=>A.frame(+e.target.value); q('#c_p1').onclick=()=>A.psu(0); q('#c_p2').onclick=()=>A.psu(1); q('#c_st').onclick=()=>A.stall(); q('#c_lb').onclick=()=>A.lbk(); q('#c_cd').onchange=e=>A.cards(+e.target.value);
  r.querySelectorAll('[data-fd]').forEach(c=>c.onchange=()=>A.fdip(+c.dataset.fd)); }
bindKeys('__fc6221Active', ()=>({f:()=>A.fan('fan12'),l:()=>A.lbk(),b:()=>A.buzz()}));
/* ---------------- one second: what this hardware can carry (schedule inferred) ---------------- */
const CANBIT=1e-6, CANF=111*CANBIT;                      // openGear CAN at 1 Mbit/s (opengear.js); 8-byte frame ≈ 111 bits
const OW_RESET=480e-6+70e-6, OW_BYTE=8*65e-6;           // 1-Wire reset + presence, 65 µs slots (DS2433 / DS18 data sheets)
const I2C_BIT=1/100e3;                                  // 100 kHz standard mode
function schedule(){ const ev=[];
  if (!D.power) return ev;
  ev.push({k:'adc',t:0.0002,d:104e-6,l:`ADC1 AN_FRAME_ID = ${adc(D.frameR)}`},{k:'adc',t:0.0004,d:104e-6,l:`ADC0 AN_FAN_ID = ${D.fanBoard?adc(D.fanR):1023}`});
  ev.push({k:'ow',t:0.05,d:OW_RESET+10*OW_BYTE,l:'FRM_1WIRE: DS2433 frame EEPROM (MF6220-3)'},{k:'ow',t:0.30,d:OW_RESET+10*OW_BYTE,l:'PSU_SERIAL1_DATA'},{k:'ow',t:0.55,d:OW_RESET+10*OW_BYTE,l:'PSU_SERIAL2_DATA'});
  for (let t=0.02;t<1;t+=0.25) ev.push({k:'i2c',t,d:4*9*I2C_BIT,l: i2cOK()? 'PCA9555 read: '+(D.stall?'FAN_DETECT!':'fans ok') : 'NACK (fan board +3V3 off)', bad:!i2cOK()||D.stall});
  const n=busCards(); for (let r=0;r<10;r++) for (let c=0;c<n;c++){ const t=0.01+r*0.1+c*0.1/Math.max(n,1); ev.push({k:'can',t,d:CANF,l:'poll slot '+(c+1)},{k:'can',t:t+CANF+20e-6,d:CANF,l:'reply',rx:true}); }
  if (D.lbk) for (let r=0;r<10;r++) ev.push({k:'can',t:0.01+r*0.1,d:CANF,l:'loop-back: own frame only',bad:true});
  return ev; }
function alarmOn(){ return D.power && (faultLine() || D.stall || (fan12On() && D.fanI>1.0)); }
function lanes(){ const ev=schedule(), a=SIM.css('--accent'), b=SIM.css('--accent2'), w=SIM.css('--warn'), bad=SIM.css('--bad');
  const evLane=(lab,k,col)=>({label:lab,h:26,draw(c,X,t0,t1,y,h){ ev.filter(e=>e.k===k&&e.t<t1&&e.t+e.d>t0).forEach(e=>{ c.fillStyle=e.bad?bad:e.rx?b:col; c.fillRect(X(e.t),y+5,Math.max(1.5,X(e.t+e.d)-X(e.t)),h-10); if (X(e.t+e.d)-X(e.t)>60){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(e.l,X(e.t)+3,y+h/2+3); } }); }});
  return [
    {label:'8 MHz clock (X1) — 125 ns', h:16, draw(c,X,t0,t1,y,h){ if (!D.power) return; if ((t1-t0)>2e-5){ c.fillStyle=SIM.css('--ink2'); c.globalAlpha=.25; c.fillRect(X(t0),y+3,X(t1)-X(t0),h-6); c.globalAlpha=1; return; } SIM.pulses(c,X,t0,t1,y,h,125e-9,0,62.5e-9,SIM.css('--ink2'),''); }},
    evLane('CAN 1 Mbit/s (U4, P2-23/21)','can',a), evLane('I²C 100 kHz → fan board (P1-16/17)','i2c',w), evLane('1-Wire (FRM_1WIRE, PSU_SERIAL1/2)','ow',b), evLane('ADC (frame / fan ID)','adc',a),
    boolLane('FAULT (P2-10 → PG1)', ()=>D.power&&faultLine(), bad), boolLane('ALARM (PG3 → P1-15)', ()=>alarmOn(), bad), boolLane('Buzzer (PG2 → Q7)', t=>D.power&&(D.buzz||alarmOn())&&(Math.floor(t*4)%2===0), w),
    boolLane('Fan board +12 V (Q1)', ()=>fan12On()&&D.fanI<=1.0, a), boolLane('Fan board +3V3 (Q3)', ()=>fan3On(), a), boolLane('L1 heartbeat (PA0)', t=>D.power&&D.leds[0]&&(t%1)<0.5, '#3fbf5f') ]; }
/* ---------------- views ---------------- */
function nowHTML(){ return `<table class="kv"><tr><th>Rails</th><td class="mono">${D.power?`+12VF · REG input ≈${vin().toFixed(2)} V · 3V`:'off'}</td></tr>
  <tr><th>Frame ID</th><td class="mono">${D.frameR>=1e9?'open':D.frameR+' Ω'} → ${(3.3*Math.min(D.frameR,1e7)/(Math.min(D.frameR,1e7)+1000)).toFixed(2)} V → ADC ${adc(D.frameR)}${D.frameR===2210?' (= 704: “WBS – MF6220-1”, type 11 in the FINC sheet)':''}</td></tr>
  <tr><th>Fan board</th><td>${D.fanBoard?`+12 V ${fan12On()?'on':'off'} · +3V3 ${fan3On()?'on':'off'} · F1 ${f1State()}`:'not fitted'}</td></tr><tr><th>CAN</th><td>${busCards()} cards answer ${D.lbk?'(LBK: none)':''}</td></tr>
  <tr><th>Alarm</th><td>${alarmOn()?'<b style="color:var(--bad)">ALARM</b> '+[faultLine()&&'PSU FAULT',D.stall&&'fan stall',fan12On()&&D.fanI>1&&'F1 tripped'].filter(Boolean).join(', '):'none'}</td></tr>
  <tr><th>DIP</th><td class="mono">SW1 PC7…0 = ${D.dip.slice().reverse().map(v=>v?0:1).join('')} · frame DIP1-4 = ${D.fdip.map(v=>v?1:0).join('')}</td></tr></table>`; }
function viewSim(m){ window.__fc6221Active=true;
  m.innerHTML=`${card('The FC6221A card — click parts, switches and edge fingers',`<div id="cd"></div><div id="inf" style="margin-top:6px"></div><div id="ctl"></div>`)}
   <div class="grid2">${card('What the circuit did',`<div id="trace" class="log"></div>`)}${card('Now',`<div id="now"></div>`)}</div>
   ${card('Timeline — one second of the buses this board wires up (the schedule is inferred: no firmware exists)',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const cd=m.querySelector('#cd'); cd.innerHTML=cardSVG(); bindCard(cd); m.querySelector('#inf').innerHTML=infoHTML(); const c=m.querySelector('#ctl'); c.innerHTML=controlsHTML(); bindControls(c);
    m.querySelector('#trace').innerHTML=traceHTML(D,'Switch the fan supplies, raise a PSU fault or trace a pin.'); m.querySelector('#now').innerHTML=nowHTML(); m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:220}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'What this board is', body:`<p>The folder is tagged #PROBLEM because the BOM header says <span class="mono">MLC-8-ISS1</span>. The netlist answers it: <span class="mono">FRM_1WIRE</span>, <span class="mono">PSU_SERIAL1/2_DATA</span>, <span class="mono">AN_FRAME_ID</span>, <span class="mono">FAULT</span> on P2-10, <span class="mono">REF1_21/REF2_21</span>, fan-board I²C and power on a 20-way edge. That is the controller slot (slot 21) of Ward-Beck's own MF6220 openGear frame: a <b>Frame Controller</b>, FC6221. This is a bring-up walk-through for the bare board.</p>`, check:()=>true, auto:true},
  {title:'1 · Insert and check the frame ID', body:`<p>Insert the card. The AT90CAN128 reads <span class="mono">AN_FRAME_ID</span> on ADC1: 1K to 3 V on the card, the frame's resistor to ground. Set the frame ID to <b>2K21</b> (the MF6220-1 value) and read 704 counts.</p>`, check:()=>D.power&&D.frameR===2210, hint:'Use “Frame ID”.'},
  {title:'2 · Trace a dead net', body:`<p>Click edge finger <b>P2-5</b>. It is <span class="mono">ETHER_RXP</span>: Ethernet reaches the slot, but the card has no Ethernet PHY. Find another net that stops at the connector (try P2-4).</p>`, check:()=>D.pin==='P2-4'||D.pin==='P2-12'||D.pin==='P2-31', hint:'P2-4 is REF1_21.'},
  {title:'3 · Power the fan board', body:`<p>The controller switches the fan board's 12 V (PB3 → Q2 → Q1) and 3.3 V (PB2 → Q4 → Q3). Turn the +3V3 supply off: the I²C reads in the timeline turn red (NACK). Turn it back on.</p>`, check:()=>D.fan3&&D.log.some(e=>e.name.startsWith('+3V3 fan-board supply → off')), hint:'Press “+3V3 fan supply” twice.'},
  {title:'4 · Size the polyfuse', body:`<p>F1 is an RXE050: it holds 0.5 A and trips by 1.0 A. Set the fan load to 1.2 A ${inf} and see F1 trip and the alarm come on. Five fans at a few hundred mA each could get there.</p>`, check:()=>D.fanI>1.0&&alarmOn(), hint:'Fan load → 1.2.'},
  {title:'5 · PSU fault and the buzzer', body:`<p>Set the fan load back to 0.45 A, then raise a <b>PSU1</b> fault. FAULT reaches PG1 through R9; the model's firmware then raises ALARM (to the fan board) and pulses the buzzer via Q7 ${inf}.</p>`, check:()=>D.fanI<=0.5&&D.psuFault[0]&&alarmOn(), hint:'Fan load 0.45, then PSU1.'},
  {title:'6 · CAN loop-back', body:`<p>Switch <b>LBK</b> on. PD7 puts the SN65HVD233 in loop-back: the controller hears only its own frames and no card answers. A handy self-test before the frame is full of cards.</p>`, check:()=>D.lbk, hint:'Press LBK (or key L).'},
  {title:'Done', body:`<p>See <b>Findings</b> for the evidence that this is the MF6220 frame controller, and what was left unconnected.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__fc6221Active=true; tutorialView(m,{title:'Tutorial — bringing up the FC6221A',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${cardSVG()}<div>${infoHTML()}</div>${controlsHTML()}<div class="small">${nowHTML()}</div>`, bind:r=>{ bindCard(r); bindControls(r); }}); }
function viewSecond(m){ window.__fc6221Active=false;
  m.innerHTML=`${card('Bus budget for one second',`<div id="rows"></div>`)}${card('Timeline',`<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const ev=schedule(), n=busCards(), sum=k=>ev.filter(e=>e.k===k).reduce((a,e)=>a+e.d,0);
    const rows=[['CAN frames',ev.filter(e=>e.k==='can').length,SIM.fmtDur(CANF),`${(sum('can')*100).toFixed(2)} % of the bus; ${n} cards polled every 100 ms ${inf}`],['I²C transactions',ev.filter(e=>e.k==='i2c').length,SIM.fmtDur(36*I2C_BIT),'PCA9555 input read every 250 ms '+inf],['1-Wire transactions',3,SIM.fmtDur(OW_RESET+10*OW_BYTE),'reset 480 µs + presence, 10 bytes × 8 slots'],['ADC conversions',2,'104 µs','13 ADC clocks at 125 kHz (8 MHz / 64)'],['CPU clock cycles','8,000,000','125 ns','X1 8 MHz']];
    m.querySelector('#rows').innerHTML=`<table class="kv"><tr><th>What</th><th>per s</th><th>each</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">Only the wiring is archived. Rates mirror the MF6220 frame model (FINC polls cards every 100 ms, reads the fan board every 250 ms), both ${inf}.</p>`;
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:220}); };
  SIM.on('time',draw); }
const BLOCKS={
  mcu:{x:330,y:140,w:190,h:90,t:'U1 AT90CAN128',s:['8 MHz, JTAG3','TWI · CAN · USART0'],d:'The controller. No firmware for it is archived.'},
  can:{x:330,y:20,w:190,h:70,t:'U4 SN65HVD233',s:['CANH/CANL → P2-23/21'],d:'CAN to all 20 card slots of the MF6220 midplane; LBK on PD7.'},
  rs:{x:600,y:20,w:190,h:70,t:'U2/U3 ADM3485',s:['RS-422 TX · RS-485'],d:'One USART, two transceivers: an RS-422 transmitter and an RS-485 half-duplex port, to the MF6220-3 rear comms board (RJ connectors) '+'(inferred destination).'},
  ow:{x:20,y:20,w:220,h:90,t:'1-Wire ×3',s:['FRM_1WIRE (DS2433)','PSU_SERIAL1/2_DATA'],d:'Port G/F pins with pull-ups R7/R8: frame EEPROM on MF6220-3 and the two power supplies.'},
  id:{x:20,y:150,w:220,h:80,t:'ID resistors',s:['AN_FRAME_ID (ADC1)','AN_FAN_ID (ADC0)'],d:'1K pull-ups on the card; the frame and the fan board each supply a resistor to ground.'},
  ui:{x:20,y:270,w:220,h:80,t:'Local I/O',s:['SW1 8-way, SW2','L1–L4, buzzer'],d:'DIP_IN1–8 on PORTC, four LEDs on PORTA, buzzer through Q7, frame DIP1–4 on PORTE.'},
  fan:{x:600,y:150,w:190,h:90,t:'Fan board power',s:['Q1/Q3 P-FET switches','F1/F2 RXE050'],d:'+12 V and +3.3 V to the MF6220-2 fan/alarm board, each switchable by the CPU.'},
  fb:{x:600,y:280,w:190,h:70,t:'P1 EDAC20',s:['SCL/SDA, ALARM, ID'],d:'To the fan/alarm board: I²C to its PCA9555, ALARM, AN_FAN_ID and the two switched rails.'},
  pwr:{x:330,y:280,w:190,h:70,t:'Power',s:['F3 → REG1/REG2 LM1117'],d:'+12 V from the midplane (P2-97…100) → polyfuse F3 → ferrite → R10/FB1 → two LM1117-3.3.'},
  dead:{x:840,y:150,w:160,h:110,t:'Not connected',s:['ETHER_*, ELED_*','REF1_21/REF2_21','PSB_1±, −7V5'],d:'These reach P2 but go nowhere on the card: no Ethernet PHY, no reference input, no use of −7.5 V.'},
};
const WIRES=[['mcu','can','CAND/CANR'],['mcu','rs','TXD0/RXD0'],['ow','mcu','PG0 PF2 PF3'],['id','mcu','ADC0/1'],['ui','mcu',''],['mcu','fan','PB2/PB3'],['fan','fb','+12V +3V3'],['mcu','fb','TWI, PG3'],['pwr','mcu','3V']];
function viewBlock(m){ window.__fc6221Active=false; blockView(m,BLOCKS,WIRES,'mcu',[1010,370],card('In one sentence',`<p>A CAN microcontroller card for slot 21 of the MF6220 frame: it talks CAN to the cards, reads the frame and power-supply 1-Wire chips, powers and reads the fan board, and raises alarms — the job the Ross MFC-8310 did, without the Ethernet side.</p>`)); }
const SHEETS=[
  {name:'1 · U1 AT90CAN128', note:'Every connected pin of U1 from FC6221Aiss1.net. Port names from the AT90CAN128 data sheet.', svg:()=>chip(300,40,220,'U1 AT90CAN128',U1.filter(x=>x[0]<=32).map(x=>[x[0]+' '+x[1],x[2].slice(0,30)]),U1.filter(x=>x[0]>32).map(x=>[x[0]+' '+x[1],x[2].slice(0,30)]),'TQFP64 · 8 MHz')},
  {name:'2 · CAN and serial', note:'U4 SN65HVD233 pins: 1 D, 2 GND, 3 VCC, 4 R, 5 LBK, 6 CANL, 7 CANH, 8 Rs (to GNDD = high speed). U2/U3 ADM3485: 1 RO, 2 RE, 3 DE, 4 DI, 6 A, 7 B.', svg:()=>
    chip(120,60,150,'U4 SN65HVD233',[['1 D','CAND'],['4 R','CANR'],['5 LBK','LBK']],[['7 CANH','P2-23'],['6 CANL','P2-21'],['8 Rs','GNDD']])
    +chip(470,40,150,'U2 ADM3485 (TX only)',[['4 DI','CPU_TX'],['2/3 RE/DE','PE2']],[['6 A','R23 10R → RS422TX+ P2-46'],['7 B','R24 10R → RS422TX− P2-44']])
    +chip(470,240,150,'U3 ADM3485',[['1 RO','CPU_RX'],['4 DI','CPU_TX'],['2/3 RE/DE','PE3']],[['6 A','R31 10R → RS485+ P2-52'],['7 B','R33 10R → RS485− P2-50']])
    +txt(30,440,'R19–R22 (“sot” = select on test) bias the RS-422/485 pairs to 3V and GNDD.',11)},
  {name:'3 · Power and fan-board switching', note:'From the nets +12V, NET00000, +12VF, NET00002, 3V, +3V3VF, NET00031/32/17/33 and the BOM values.', svg:()=>
    net(20,80,'+12V P2-97…100')+wire([[140,80],[170,80]])+`<rect x="170" y="70" width="40" height="20" fill="none" stroke="var(--ink)"/>`+txt(172,64,'F3 RXE050',10)+wire([[210,80],[250,80]])+txt(225,64,'FB2',10)+wire([[250,80],[330,80]])+net(270,100,'+12VF')
    +res(330,80,400,80,'R10','2R2 ½W')+txt(330,120,'∥ FB1',10,'var(--ink2)')+wire([[400,80],[440,80],[440,60],[480,60]])+wire([[440,80],[440,150],[480,150]])+`<rect x="480" y="45" width="90" height="34" fill="var(--panel2)" stroke="var(--ink)"/>`+txt(486,66,'REG1 LM1117',10)+net(580,64,'3V (logic)')
    +`<rect x="480" y="135" width="90" height="34" fill="var(--panel2)" stroke="var(--ink)"/>`+txt(486,156,'REG2 LM1117',10)+wire([[570,150],[640,150]])+net(600,170,'+3V3VF')+`<rect x="640" y="135" width="60" height="30" fill="none" stroke="var(--ink)"/>`+txt(645,155,'Q3 P-FET',10)+wire([[700,150],[740,150]])+txt(705,140,'F2',10)+net(750,150,'P1-9/10')
    +wire([[300,80],[300,260],[640,260]])+`<rect x="640" y="245" width="60" height="30" fill="none" stroke="var(--ink)"/>`+txt(645,265,'Q1 P-FET',10)+wire([[700,260],[740,260]])+txt(705,250,'F1',10)+net(750,260,'P1-5/6')
    +txt(560,320,'Q2 2N4401 ← PB3 pulls Q1 gate down (R1 pull-up)',10)+txt(560,340,'Q4 2N4401 ← PB2 drives Q3',10)+txt(30,440,'Both regulators drop ≈8.7 V from 12 V: at 60 mA that is ≈0.5 W per SOT-223, eased a little by R10.',11)},
  {name:'4 · Frame interfaces', note:'1-Wire pull-ups R7/R8 (“sot”), FAULT series R9, ID pull-ups R16/R17 1K, DIP series R25–R34 110R, buzzer driver Q7 via R35 4K75, SW2 via R36/R37 1K.', svg:()=>{ let s=''; [['FRM_1WIRE','P2-16','PG0 (33)'],['PSU_SERIAL1_DATA','P2-26','PF2 (59)'],['PSU_SERIAL2_DATA','P2-20','PF3 (58)'],['FAULT','P2-10','R9 → PG1 (34)'],['AN_FRAME_ID','P2-18','PF1/ADC1 (60), R17 1K ↑'],['AN_FAN_ID','P1-19','PF0/ADC0 (61), R16 1K ↑'],['DIP1…DIP4','P2-38/40/34/32','PE5/PE4/PE6/PE7'],['ALARM','P1-15','PG3 (18)'],['CLED_LINK / ACT','P2-27 / 28','Q6 / Q5 ← PB1 / PB0']].forEach(([n,p,u],i)=>{ const y=50+i*42; s+=net(30,y,p)+wire([[150,y],[300,y]])+txt(170,y-6,n,11)+txt(320,y+4,'→ U1 '+u,11); }); return s; }},
];
function viewSchem(m){ window.__fc6221Active=false; schemView(m,SHEETS,'FC6221A','Redrawn from FC6221Aiss1.net (P-CAD, 21 Mar 2007) and FC6221A.bom — not the original CAD sheets, which are in the binary .sch.'); }
function viewSoft(m){ window.__fc6221Active=true; let hot=0;
  m.innerHTML=`${card('No firmware was archived — what the pins let firmware do',`<div id="pt"></div>`)}${card('Signal path of one function (click a stage)',`<div id="f"></div><div id="det" class="small"></div>`)}`;
  const draw=()=>{ const ports={PA:'LEDs L1–L4 (PA0–PA3)',PB:'MagJack LED drivers, fan-board power switches (PB0–PB3)',PC:'local DIP SW1 (PC0–PC7)',PD:'TWI to the fan board, CAN TX/RX, CAN loop-back',PE:'USART0, RS-422/485 enables, frame DIP1–4',PF:'two ADC IDs, two PSU 1-Wire lines, JTAG',PG:'frame 1-Wire, FAULT, buzzer, ALARM, SW2'};
    m.querySelector('#pt').innerHTML=`<table class="kv">${Object.entries(ports).map(([p,d])=>`<tr><th>${p}</th><td>${d}</td><td class="small mono">${U1.filter(x=>x[1].startsWith(p)).map(x=>x[1]+' '+x[2].split(' ')[0]).join(' · ')}</td></tr>`).join('')}</table><p class="small">A FINC-type firmware would loop: poll the cards on CAN, read the fan board over I²C, read the PSUs and frame EEPROM over 1-Wire, check FAULT, drive ALARM / buzzer / LEDs, and answer a control port ${inf}. The archive has no source, HEX or project for it.</p>`;
    const chains=[[{t:'PSU fault',s:['PSU FAULT pin']},{t:'Midplane',s:['wired-OR','R66/R65 divider']},{t:'P2-10 → R9',s:['FAULT_DATA']},{t:'PG1 read',s:[D.power&&faultLine()?'FAULT':'ok']},{t:'ALARM + buzzer',s:[alarmOn()?'ON':'off']}],
      [{t:'PB3 high',s:['+12V_FAN_BOARD_CTL']},{t:'Q2 2N4401',s:['saturates']},{t:'Q1 NDC652P',s:['gate low → on']},{t:'F1 RXE050',s:[f1State()],bad:fan12On()&&D.fanI>1},{t:'P1-5/6',s:['fan board 12 V']}]];
    const st=chains[0].concat(chains[1]).slice(hot<5?0:5, hot<5?5:10);
    m.querySelector('#f').innerHTML=`<div class="small" style="margin-bottom:4px"><button id="ch0" class="${hot<5?'on':''}">FAULT → alarm</button> <button id="ch1" class="${hot>=5?'on':''}">fan-board 12 V switch</button></div>`+flowSVG(st,hot%5);
    m.querySelector('#ch0').onclick=()=>{hot=0;draw();}; m.querySelector('#ch1').onclick=()=>{hot=5;draw();};
    m.querySelectorAll('[data-st]').forEach(g=>g.onclick=()=>{ hot=(hot<5?0:5)+(+g.dataset.st); draw(); });
    m.querySelector('#det').innerHTML=nowHTML(); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__fc6221Active=false;
  m.innerHTML=card('Findings',`<ol>
   <li><b>This is the MF6220 frame controller, not an MLC-8.</b> The nets are those of the MF6220 FINC slot: <span class="mono">FAULT</span> on P2-10 (the MF6220 midplane routes the PSU FAULT divider to FINC pin 10), <span class="mono">AN_FRAME_ID</span> (frame type resistor 2K21), <span class="mono">FRM_1WIRE</span>, <span class="mono">PSU_SERIAL1/2</span>, <span class="mono">REF1_21/REF2_21</span> (slot 21), frame <span class="mono">DIP1–4</span>, and an EDAC20 edge carrying I²C, ALARM and power to the fan board. “FC” = frame controller; the ECO path is <span class="mono">H:\\OPEN GEAR\\FC62xx\\FC6221\\</span>.</li>
   <li><b>Why the BOM says MLC-8-ISS1.</b> The P-CAD BOM prints the design title, and this design's title was evidently carried over from the MLC-8 board (also an AT90CAN128 design of 2006–2007). It is a title-block leftover, not a different board ${inf}.</li>
   <li><b>It is the PCB of the C6201 concept.</b> <span class="mono">C6201-FUNCTIONAL.dwg</span> (13 Jun 2006, “OPEN GEAR/C62XX/A”) lists CONTROL, PSU1 SERIAL, PSU2 SERIAL, FRAME I-WIRE, CAN ADDRESS, CAN BUS, ENABLE, FAN KIT — the same functions this board wires up six months later. Its “AES RECEIVER” did not make it: REF1_21/REF2_21 stop at the connector.</li>
   <li><b>Ethernet goes nowhere.</b> ETHER_RXP/N/C, ETHER_TXP/N/C and ELED_LINK/ACT reach P2 but nothing on the card. Without a PHY the card could not be a DashBoard gateway like the Ross MFC-8310; its outside links are RS-422 and RS-485. The CPU does drive the CLED_LINK / CLED_ACT LEDs (via Q6/Q5).</li>
   <li><b>Two of three JTAG headers are not connected to the CPU.</b> JTAG1 (right-angle) and JTAG2 are wired pin for pin to each other only; JTAG3 (Samtec SMT) is the one on U1. JTAG1/2 look like a pass-through or adapter footprint.</li>
   <li><b>The design changed between Dec 2006 and Mar 2007.</b> <span class="mono">FC6221Aiss1sch.net</span> (20 Dec 2006) has <span class="mono">CANP/CANN</span>, <span class="mono">PSU_SERIAL1/2</span> and no JTAG, ALARM or fan-board power control. The 21 Mar 2007 netlist adds JTAG to U1, <span class="mono">+3V/+12V_FAN_BOARD_CTL</span> switching and <span class="mono">ALARM</span>, and renames the CAN pair to CANH/CANL. The ECO renumbers 94 parts in the same session.</li>
   <li><b>Never fabricated?</b> The <span class="mono">#GERBERS</span> and <span class="mono">#WORKING</span> folders are empty; the PCB was last saved 11 Jun 2008. The MF6220 itself kept a Ross MFC-8310 in slot 21 ${inf}.</li>
   <li><b>Small mismatches.</b> The BOM spells the CAN chip “SN65HDV233D” (the part is SN65HVD233). Frame DIP1 lands on PE5 and DIP2 on PE4 (swapped against the port order). Eleven resistors have the value “sot” (select on test). The fan board's 12 V runs through a 0.5 A-hold RXE050 (F1), small for five fans ${inf}.</li>
   <li><b>Unused frame resources.</b> PSB_1± and −7V5 also stop at P2; the controller needs only +12 V.</li></ol>`)
  +card('Assumptions',`<ul class="small"><li>Card layout drawing: functional, not the PCB (the .pcb is binary P-CAD 2002 and no Gerbers exist).</li><li>Bus schedule (100 ms CAN round, 250 ms I²C, 1-Wire reads), alarm logic and LED heartbeat stand in for firmware that does not exist (${inf}).</li><li>CAN 1 Mbit/s as in the openGear card plugin; 1-Wire and I²C timings from the standards; RXE050 0.5 A hold / 1.0 A trip from its data sheet.</li><li>Fan-board ID resistor 4K99 (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>FC6221 - #PCB/FC6221Aiss1.net · FC6221Aiss1sch.net · FC6221Aiss1.ECO · FC6221A.bom · FC6221A.pcb</li><li>XXX - C6201 - #Engineering NEVER PRODUCED/C6201-FUNCTIONAL.dwg</li><li>siumulation-plugins/mf6220-frame.js (MF6220 midplane, FINC and fan-board nets)</li></ul>`); }
SIM.register({
  id:'fc6221', name:'FC6221 · MF6220 frame controller card ('+SIM.year(2007)+')', duration:1, product:'FC6221', year:2007,
  family:'Obsolete products', folder:'#OPENGEAR #SERIES/FC6221 - #Engineering #PROBLEM',
  summary:'The “#PROBLEM” board decoded: an AT90CAN128 card for slot 21 of Ward-Beck\'s MF6220 openGear frame — CAN to the cards, 1-Wire to the frame EEPROM and power supplies, I²C and switched power to the fan board, FAULT/ALARM and a buzzer. No firmware exists, so the model follows every net of the 2007 netlist.',
  highlights:['Every edge-connector finger traceable to its net','Fan-board power switching and the polyfuse limit','PSU fault → alarm chain','Bus budget: CAN, I²C, 1-Wire over one second','Findings: the BOM\'s MLC-8 title, dead Ethernet pins, the C6201 concept link'],
  depth:'Hardware model',
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'1 CAN frame',period:()=>CANF},{label:'1-Wire slot',period:()=>65e-6},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.1,'100 ms (CAN round)'],[0.01,'10 ms'],[0.002,'2 ms'],[2e-4,'200 µs']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Pin capabilities (no firmware)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
