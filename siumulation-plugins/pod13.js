/* =====================================================================
   POD13 — Dual AES/EBU digital-to-analog converter (Ward-Beck Systems, 1998|31, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html). Full model: the real PIC16C54A
   programs (PD13.ASM 1998, PD13V100.ASM 1999, pd13v101.asm 2004) are assembled here and run
   on a cycle-counting PIC16C5x emulator against a model of the two CS8412 receivers.

   Sources used (folder #POD #SERIES/XXX - POD13 - #Master #OBSOLETE):
   - POD13 - #Software/POD13 - #SOFTWARE #V100/PD13.ASM, PD13V100.ASM, pd13v101.asm, PD13V100.BKX,
     PD13V101.BKX, POD13.PJT, PD13*.ERR, 8201V100.ASM
   - POD13 - #MANUAL/POD13MAN.PDF (1999) and pod13.pdf (2002 re-issue of POD13MAN.WPD)
   - POD13 - Functional Diagram.pdf / .cdr
   - POD13 - #PCB/OBSOLETE/ARCHIVE/POD13-3.DSN (OrCAD, "ISS 3 PCB", Feb 26 1999) and POD13.PCB (Tango)
   - POD13 - #SILK/OBSOLETE/POD13SLK.CDR (converted with Inkscape; text re-anchored)
   - POD13 - #MECHANICAL/POD13FRT.pdf, POD13RER.pdf
   - SOFTWARE LISTINGS - #Engineering.xls (archive root): "POD13 | PIC16C54A | RC | POD13V101 | 2004-09-23 |
     DISREGARD THE VALIDITY BIT"
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
/* ---------- POD-family helper kit (same code as the other POD plugins) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
function card(t,b,cls){ return `<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`; }
const ASSET = 'siumulation-plugins/assets/';
const dbu2v = d => 0.7746*Math.pow(10,d/20);
const v2dbu = v => v>1e-9 ? 20*Math.log10(v/0.7746) : -200;
const fdb = (d,n) => d<-150 ? '−∞' : (d>=0?'+':'−')+Math.abs(d).toFixed(n==null?1:n);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const hex = (v,n) => v.toString(16).toUpperCase().padStart(n||2,'0');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const ART13 = '#POD #SERIES/XXX - POD13 - #Master #OBSOLETE/POD13 - #SILK/OBSOLETE/POD13SLK.CDR';
const ART13A = '#POD #SERIES/POD13A - #Master/POD13A - #ARTWORK #DA #2016/POD13A-FRONT&REAR-SILK (CURVE).cdr';
const PW = 1714, PH = 321;   // silkscreen pixels, 200 dpi: 8.570" × 1.606" (POD13FRT / POD13RER)
function panelSVG(side, inner, label){
  return `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${label||''}" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="glow13${side}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${PW}" height="${PH}" rx="10" fill="#141516"/>
    ${inner.under||''}
    <image href="${ASSET}pod13-${side}.svg" width="${PW}" height="${PH}"/>
    ${inner.over||''}
  </svg>`;
}
function screw(x,y){ return `<circle cx="${x}" cy="${y}" r="13" fill="#6d7175" stroke="#3a3d40" stroke-width="2"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#33363a" stroke-width="3"/>`; }
function rocker(on, x, y){
  return `<g class="pwr" style="cursor:pointer"><title>Power rocker: click to switch ${on?'off':'on'}</title><rect x="${x}" y="${y}" width="102" height="154" rx="9" fill="#0a0b0c" stroke="#30333a" stroke-width="2"/>
    <rect x="${x+14}" y="${on?y+12:y+74}" width="74" height="68" rx="7" fill="#1d2023" stroke="#3a3d40" stroke-width="2"/><text x="${x+51}" y="${on?y+54:y+116}" text-anchor="middle" font-size="22" fill="#55595c">${on?'I':'O'}</text></g>`; }
function led(x,y,on,col,r){ r=r||10; return `<circle cx="${x}" cy="${y}" r="${r+3.5}" fill="#0a0b0b"/><circle cx="${x}" cy="${y}" r="${r}" fill="${on?col:'#2c332c'}" ${on?'filter="url(#glow13front)"':''}/>`; }
function pbtn(x,y,pressed,cls,title){   // latching push-button behind a 0.281" hole
  return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="30" fill="transparent"/><circle cx="${x}" cy="${y}" r="27" fill="#050606" stroke="#3b3f43" stroke-width="2"/>
    <circle cx="${x}" cy="${y}" r="${pressed?17:21}" fill="${pressed?'#5b5f63':'#9a9ea2'}" stroke="${pressed?'#2a2c2e':'#d5d8da'}" stroke-width="3"/>${pressed?`<circle cx="${x}" cy="${y}" r="8" fill="#47494c"/>`:''}</g>`; }
function xlrF(x,y,r,plugged,cls,title){
  const p=[[-0.34,-0.2],[0.34,-0.2],[0,0.38]].map(([a,b])=>`<circle cx="${x+a*r}" cy="${y+b*r}" r="${r*0.12}" fill="#050505" stroke="#555"/>`).join('');
  return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="${r}" fill="#b9bcbf" stroke="#6b6f73" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r*0.78}" fill="#121314"/>${p}
   <rect x="${x-r*0.12}" y="${y-r*0.95}" width="${r*0.24}" height="${r*0.16}" fill="#6b6f73"/>
   ${plugged?`<circle cx="${x}" cy="${y}" r="${r*0.72}" fill="#2c2f33" opacity=".94"/><rect x="${x-r*0.3}" y="${y-r*0.14}" width="${r*0.6}" height="${r*0.28}" fill="#44484d"/><circle cx="${x+r*0.7}" cy="${y-r*0.75}" r="9" fill="var(--accent)"/>`:''}</g>`; }
function bnc(x,y,r,plugged,cls,title){
  return `<g class="${cls}" style="cursor:pointer"><title>${title}</title><circle cx="${x}" cy="${y}" r="${r*1.9}" fill="#1b1c1e" stroke="#3a3d40" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r}" fill="#b9a25a" stroke="#6e5d22" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r*0.64}" fill="#e2d3a0"/><circle cx="${x}" cy="${y}" r="${r*0.22}" fill="#7a5f12"/>
    ${plugged?`<circle cx="${x}" cy="${y}" r="${r*0.9}" fill="#2b5f9e" opacity=".9"/><circle cx="${x}" cy="${y}" r="${r*0.4}" fill="#3a74b8"/>`:''}</g>`; }
function tb3(x,y,title,pins){  // 3-pin Phoenix (WECO 3×.138) seen in the rear slot; pins: [{on,col,label}]
  let s=`<g><title>${title}</title><rect x="${x-38}" y="${y-30}" width="76" height="60" rx="3" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>`;
  [-24,0,24].forEach((d,i)=>{ const p=(pins||[])[i]; s+=`<rect x="${x+d-9}" y="${y-18}" width="18" height="24" fill="#0e4d25"/><circle cx="${x+d}" cy="${y+18}" r="6" fill="#c8c9b5" stroke="#555"/>`;
    if (p && p.on) s+=`<circle cx="${x+d}" cy="${y-6}" r="9" fill="${p.col}" filter="url(#glow13rear)"/>`; });
  return s+'</g>'; }

/* ---- action log ---- */
function makeActor(D, getSummary){
  return function act(name, fn){ const trace=[]; const tr=s=>trace.push(s); fn(tr); D.ver++;
    D.log.unshift({t:SIM.t, name, trace, sum:getSummary?getSummary():''}); if (D.log.length>60) D.log.length=60; SIM.refresh(); };
}
function traceHTML(D, hint){ return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : `<div class="muted">${hint||'Use a control. The code path it exercises is listed here.'}</div>`; }
function logHTML(D){ return D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span>${e.sum?' → '+e.sum:''}</div>`).join('') || '<div class="muted">No actions yet.</div>'; }
function stageTable(stages, unit){
  unit = unit||'dBu';
  return `<table class="kv"><tr><th>Stage</th><th>Gain</th><th>Level</th><th>Clips at</th><th style="width:30%">Headroom</th></tr>${stages.map(s=>{
    const hr = s.clip!=null && s.lvl>-150 ? s.clip - s.lvl : null; const bad = hr!=null && hr<0, tight = hr!=null && hr<6;
    const w = hr==null? 0 : clamp(hr,0,30)/30*100;
    return `<tr><td>${s.name}${s.note?`<div class="small muted">${s.note}</div>`:''}</td><td class="mono">${s.gain==null?'—':fdb(s.gain)+' dB'}</td><td class="mono">${s.lvl<-150?'—':fdb(s.lvl)+' '+(s.unit||unit)}</td><td class="mono">${s.clip==null?'—':fdb(s.clip)+' '+(s.unit||unit)}</td>
      <td>${hr==null?'<span class="muted small">n/a</span>':`<div style="background:var(--chip);border-radius:4px;height:14px"><div style="width:${bad?100:w}%;height:14px;border-radius:4px;background:${bad?'var(--bad)':tight?'var(--warn)':'var(--accent)'}"></div></div><span class="small mono">${bad?'CLIPPING by '+(-hr).toFixed(1)+' dB':hr.toFixed(1)+' dB'}</span>`}</td></tr>`; }).join('')}</table>`;
}
function boolLane(label, fn, color, h){ return {label, h:h||18, draw(c,X,t0,t1,y,hh){ const N=Math.min(900,Math.max(60,(X(t1)-X(t0))/2)), span=t1-t0; c.fillStyle=color||SIM.css('--accent');
  for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; if (fn(tt)) c.fillRect(X(t0+span*i/N), y+3, (X(t1)-X(t0))/N+0.6, hh-6); } }}; }
function waveLane(label, fn, color, h, fHz){ return { label, h:h||38, draw(c,X,t0,t1,y,hh){
  const pw=X(t1)-X(t0), span=t1-t0, col=color||SIM.css('--accent');
  let pk=0.05; for (let i=0;i<=240;i++) pk=Math.max(pk,Math.abs(fn(t0+span*i/240)));
  const vmax=pk*1.15; c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText('±'+vmax.toFixed(2)+' V', X(t1)-64, y+hh-3);
  if (span*fHz > pw/3){ c.fillStyle=col; c.globalAlpha=.35; const M=Math.min(500,pw); for (let i=0;i<M;i++){ const tt=t0+span*(i+.5)/M; let a=0; for(let k=0;k<6;k++) a=Math.max(a,Math.abs(fn(tt+k/(6*fHz)))); a=a/vmax*(hh/2-3); c.fillRect(X(t0)+pw*i/M, y+hh/2-a, pw/M+0.6, 2*a+0.5); } c.globalAlpha=1; return; }
  c.strokeStyle=col; c.lineWidth=1.2; c.beginPath(); const N=Math.min(1600,Math.max(200,pw*2));
  for (let i=0;i<=N;i++){ const tt=t0+span*i/N, yy=y+hh/2-clamp(fn(tt)/vmax,-1,1)*(hh/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }}; }
function drawLadder(cv, t, levels, fn, label){
  const H = levels.length*44+10, {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid');
  levels.forEach(([nm,span],i)=>{
    const y=8+i*44, t0=Math.max(0, Math.min(SIM.duration-span, t-span/2));
    let pk=0.05; for(let k=0;k<300;k++) pk=Math.max(pk,Math.abs(fn(t0+span*k/300))); const vmax=pk*1.15;
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')', 6, y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText((label||'')+' ±'+vmax.toFixed(2)+' V', 6, y+28);
    const x0=180, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30);
    c.strokeStyle=acc; c.beginPath(); const N=Math.min(900,pw*1.5);
    for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const yy=y+17-clamp(fn(tt)/vmax,-1,1)*13; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy);} c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke();
  });
}
function tutorialView(m, T){
  m.innerHTML = `<div class="grid2"><div>${card(T.title, `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="unit"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
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
function blockView(m, BLOCKS, WIRES, first, vb, side){
  let sel=first;
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${side||''}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 ${vb[0]} ${vb[1]}" style="width:100%"><defs><marker id="ar13" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ar13)"/>`;
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
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
function res(x1,y1,x2,y2,lbl,val){ const mx=(x1+x2)/2,my=(y1+y2)/2, hz=y1===y2; const L=hz?Math.abs(x2-x1):Math.abs(y2-y1), z=Math.min(36,L*0.6);
  let p; if(hz){ const a=mx-z/2; p=`M${x1} ${y1}H${a}`+[...Array(6)].map((_,i)=>`L${a+z*(i+.5)/6} ${y1+(i%2?6:-6)}`).join('')+`L${a+z} ${y1}H${x2}`; }
  else { const a=my-z/2; p=`M${x1} ${y1}V${a}`+[...Array(6)].map((_,i)=>`L${x1+(i%2?6:-6)} ${a+z*(i+.5)/6}`).join('')+`L${x1} ${a+z}V${y2}`; }
  return `<path d="${p}" fill="none" stroke="var(--ink)"/>`+(lbl?`<text x="${hz?mx:x1+10}" y="${hz?y1-10:my-4}" font-size="10" ${hz?'text-anchor="middle"':''} fill="var(--ink)">${lbl}</text><text x="${hz?mx:x1+10}" y="${hz?y1+18:my+9}" font-size="10" ${hz?'text-anchor="middle"':''} fill="var(--ink2)">${val||''}</text>`:''); }
function opamp(x,y,name){ return `<path d="M${x} ${y-30}L${x+60} ${y}L${x} ${y+30}Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+5}" y="${y-8}" font-size="13" fill="var(--ink)">−</text><text x="${x+5}" y="${y+18}" font-size="12" fill="var(--ink)">+</text><text x="${x+10}" y="${y+44}" font-size="10" fill="var(--ink2)">${name}</text>`; }
function gnd(x,y){ return `<path d="M${x} ${y}v8M${x-9} ${y+8}h18M${x-6} ${y+12}h12M${x-3} ${y+16}h6" stroke="var(--ink)" fill="none"/>`; }
function wire(pts){ return `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--ink)"/>`; }
function net(x,y,t,anchor){ return `<text x="${x}" y="${y+4}" font-size="10.5" ${anchor?`text-anchor="${anchor}"`:''} fill="var(--accent2)">${t}</text>`; }
function txt(x,y,t,sz,col,anchor){ return `<text x="${x}" y="${y}" font-size="${sz||11}" ${anchor?`text-anchor="${anchor}"`:''} fill="${col||'var(--ink)'}">${t}</text>`; }
function npn(x,y,name){ return `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="var(--ink)"/><path d="M${x-16} ${y}h10M${x-6} ${y-10}v20M${x-6} ${y-4}L${x+8} ${y-14}V${y-24}M${x-6} ${y+4}L${x+8} ${y+14}V${y+24}" fill="none" stroke="var(--ink)"/><path d="M${x+8} ${y+14}l-7 -1l3 -5z" fill="var(--ink)"/><text x="${x+20}" y="${y+4}" font-size="10" fill="var(--ink2)">${name}</text>`; }
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
function bindKeys(flag, mapFn){ document.addEventListener('keydown', e=>{ if (!window[flag] || (e.target.matches && e.target.matches('input,select,textarea'))) return; const f=mapFn()[e.key.toLowerCase()]; if (f){ f(); e.preventDefault(); } }); }
/* ---- AES3 helpers ---- */
function aesSubframe(sample, pre, frameInBlock, fs, validity){
  let s = Math.round(clamp(sample,-1,0.99999988)*8388607); if (s<0) s += 1<<24;
  const bits = new Array(32).fill(0);
  for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
  bits[28]=validity?1:0; bits[29]=0;
  const cs0 = fs===48000?0x85: fs===44100?0x45: fs===32000?0xC5: 0x05;
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
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn'), bad=SIM.css('--bad');
  const lvA=biphase(subA.pre,subA.bits,0), lvB=biphase(subB.pre,subB.bits,lvA[lvA.length-1]); const lv=lvA.concat(lvB), cw=(w-20)/lv.length;
  [[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio 20 bits (CS4329 uses these)'],[56,58,bad,'V'],[58,64,a2,'UCP']].forEach(([a,b,col,lb])=>[0,64].forEach(off=>{ c.fillStyle=col; c.globalAlpha=.14; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if((b-a)*cw>8) c.fillText(lb,12+(off+a)*cw,104); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); const hh=25*clamp(amp==null?1:amp,0.05,1);
  lv.forEach((v,i)=>{ const x=10+i*cw, y=55+(v?-hh:hh); if(i===0) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${subA.pre})  V=${subA.bits[28]}`,12,14); c.fillText(`Subframe B (Y)  V=${subB.bits[28]}`,12+64*cw,14);
  c.fillText(`${label||''} one bit cell = ${SIM.fmtDur(1/(fs*128))} · frame = ${SIM.fmtDur(1/fs)}`,10,130);
}
/* ---------- end of kit ---------- */

/* =====================================================================
   1. The firmware: the three PIC16C54A sources, verbatim from the archive
   ===================================================================== */
const SRC = {"pd13": {"file": "PD13.ASM", "date": "1998-06-16", "text": "\tERRORLEVEL -302\n;      D8201 AES\\EBU DA\n\n\tLIST\tP=16C5X,r=dec\n\t#INCLUDE \"P16C5X.INC\"\n\nBINIT\tEQU 0X4F\n;************ PROGRAM CONSTANTS*************\nZ\tEQU 2\t\t;ZER0 FLAG IN STATUS REG\n\n;*************  BANK0  RAM *****************\n\tORG 07H \t;BANK0 MEMORY \nDELAY1\tRES 1\t\t;TEMP REG FOR DELAY ROUTINES\nDELAY2\tRES 1\t\t;TEMP REG FOR DELAY ROUTINES\nACON_CNT RES 1\t\t;A CHANNEL CONFIDENCE COUNTER\nBCON_CNT RES 1\t\t;B CHANNEL CONFIDENCE COUNTER\t\t\n\n;*************\tINTERRUPTS  *************************\n\tORG 4H\n\n\tRETFIE\n\n;***************  RESET  ****************************\n\tORG 0X1FF\n\tGOTO RESET\n\tORG 0\n\tGOTO RESET\n\tORG\t0X10\nRESET   CALL INIT\n\tGOTO MAIN\n\n;************** INIT  ******************************\n\nINIT\tMOVLW B'00001111'\n\tTRIS PORTB\n\tMOVLW B'00000000'\n\tTRIS PORTA\n\tCLRF PORTA\t;SEL\n\tCLRF PORTB\n\tRETLW 0\n\n;*************** DELAY ROUTINE **********************\nDELVIS\tMOVLW 0XFF\n\tMOVWF DELAY2\n\tCALL DELAY\n\tCLRWDT\n\tRETLW 0\n\n;**************  MAIN  ******************************\n;READ ERROR FLAGS CHECK FOR LOCK\nMAIN\tBSF PORTA,1\t;SET SEL HIGH\n\tNOP\n\tBCF PORTA,1\t;SEL LINE LOW\n\tCALL DELVIS\n\tBTFSS PORTB,2\t;E0 - A CHECK\n\tGOTO NEXT_A\n\tBTFSS PORTB,3\n\tGOTO B_CHECK\n\tBSF PORTB,5\t;SET A NO LOCK ALARM\n\tBCF PORTA,3\t;SET A NO LOCK LED\n\tBCF PORTB,4\t;CLEAR A CONF ALARM\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\t;SET CONF TIMER\n\tGOTO B_CHECK\nNEXT_A\tBSF PORTA,3\t;SET A LOCK LED\n\tBCF PORTB,5\t;CLEAR A NO LOCK ALARM\n\tBTFSS PORTB,3\n\tGOTO RST_ACN\n\tDECFSZ ACON_CNT,1\t;CHECK HOW MANY TIMES\n\tGOTO B_CHECK\t;CONFIDENCE IS ON\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\n\tBSF PORTB,4\t;SET A CONF ALARM\nB_CHECK\tBTFSS PORTB,0\t;E0 - B CHECK\n\tGOTO NEXT_B\n\tBTFSS PORTB,1\n\tGOTO B_CHECK\n\tBSF PORTB,6\t;SET B NO LOCK ALARM\n\tBCF PORTA,2\t;SET B NO LOCK LED\n\tBCF PORTB,7\t;CLEAR B CONF ALARM\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\t;SET CONF TIMER\n\tGOTO MAIN\nNEXT_B\tBSF PORTA,2\t;SET B LOCK LED\n\tBCF PORTB,6\t;CLEAR B NO LOCK ALARM\n\tBTFSS PORTB,1\n\tGOTO RST_BCN\n\tDECFSZ BCON_CNT,1\t;CHECK HOW MANY TIMES\n\tGOTO MAIN\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\n\tBSF PORTB,7\t;SET B CONF ALARM\n\tGOTO MAIN\nRST_ACN\tBCF PORTB,4\t;CLEAR A CONF ALARM\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\t;SET CONF TIMER\n\tGOTO B_CHECK\nRST_BCN\tBCF PORTB,7\t;CLEAR B CONF ALARM\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\n\tBSF PORTA,1\n\tGOTO MAIN\n\n;****************  DELAY ROUTINE *****************************\n; INIT DELAY 2 BEFORE ENTERING\n; DELAY=:: DELAY1(255*1/1.53MHZ*2 * DELAY2)\n; DELAY2 = 15 FOR RELAY PULSE(5mS)\n; DELAY2 = 255 4 TIMES FOR VISIBLE DELAY \nDELAY\tMOVLW 0XFF\nDEL1\tMOVWF DELAY1\nDEC1\tCLRWDT\n\tDECFSZ DELAY1,F\n\tGOTO DEC1\n\tDECFSZ DELAY2,F\n\tGOTO DEL1\n\tRETURN\n\n;DELAY\tMOVLW 0XFF\n;\tMOVWF DELAY1\n;\tMOVLW 0X07\n;\tMOVWF DELAY2\n;LOOP\tDECFSZ DELAY1\n;\tGOTO LOOP\n;\tMOVLW 0XFF\n;\tMOVWF DELAY1\n;\tDECFSZ DELAY2\n;\tGOTO LOOP\n;\tRETURN\t\n\n\tEND"}, "v100": {"file": "PD13V100.ASM", "date": "1999-05-21", "text": "\tERRORLEVEL -302\n;      POD13 DUAL D-A\n\n\tLIST\tP=16C5X,r=dec\n\t#INCLUDE \"P16C5X.INC\"\n\nBINIT\tEQU 0X4F\n;************ PROGRAM CONSTANTS*************\nZ\tEQU 2\t\t;ZER0 FLAG IN STATUS REG\n\n;*************  BANK0  RAM *****************\n\tORG 07H \t;BANK0 MEMORY \nDELAY1\tRES 1\t\t;TEMP REG FOR DELAY ROUTINES\nDELAY2\tRES 1\t\t;TEMP REG FOR DELAY ROUTINES\nACON_CNT RES 1\t\t;A CHANNEL CONFIDENCE COUNTER\nBCON_CNT RES 1\t\t;B CHANNEL CONFIDENCE COUNTER\t\t\n\n;*************\tINTERRUPTS  *************************\n\tORG 4H\n;\tRETFIE\n\n;***************  RESET  ****************************\n\tORG 0X1FF\n\tGOTO RESET\n\tORG 0\n\tGOTO RESET\n\tORG\t0X10\nRESET   CALL INIT\n\tGOTO MAIN\n\t\n;************** INIT  ******************************\n\nINIT\tMOVLW B'00001111'\n\tTRIS PORTB\n\tMOVLW B'00000000'\n\tTRIS PORTA\n\tCLRF PORTA\t;SEL\n\tCLRF PORTB\n\tRETLW 0\n\n;*************** DELAY ROUTINE **********************\nDELVIS\tMOVLW 0XFF\n\tMOVWF DELAY2\n\tCALL DELAY\n\tCLRWDT\n\tRETLW 0\n\n;**************  MAIN  ******************************\n;READ ERROR FLAGS 740CHECK FOR LOCK\nMAIN\tBSF PORTA,1\t;SET SEL HIGH\n\tNOP\n\tBCF PORTA,1\t;SEL LINE LOW\n\tCALL DELVIS\n\tBTFSS PORTB,2\t;E0 - A CHECK\n\tGOTO NEXT_A\n\tBTFSS PORTB,3\n\tGOTO B_CHECK\n\tBSF PORTB,4\t;SET A NO LOCK ALARM\n\tBCF PORTA,3\t;SET A NO LOCK LED\n\tBCF PORTB,5\t;CLEAR A CONF ALARM\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\t;SET CONF TIMER\n\tGOTO B_CHECK\nNEXT_A\tBSF PORTA,3\t;SET A LOCK LED\n\tBCF PORTB,4\t;CLEAR A NO LOCK ALARM\n\tBTFSS PORTB,3\n\tGOTO RST_ACN\n\tDECFSZ ACON_CNT,1\t;CHECK HOW MANY TIMES\n\tGOTO B_CHECK\t;CONFIDENCE IS ON\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\n\tBSF PORTB,5\t;SET A CONF ALARM\nB_CHECK\tBTFSS PORTB,0\t;E0 - B CHECK\n\tGOTO NEXT_B\n\tBTFSS PORTB,1\n\tGOTO B_CHECK\n\tBSF PORTB,7\t;SET B NO LOCK ALARM\n\tBCF PORTA,2\t;SET B NO LOCK LED\n\tBCF PORTB,6\t;CLEAR B CONF ALARM\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\t;SET CONF TIMER\n\tGOTO MAIN\nNEXT_B\tBSF PORTA,2\t;SET B LOCK LED\n\tBCF PORTB,7\t;CLEAR B NO LOCK ALARM\n\tBTFSS PORTB,1\n\tGOTO RST_BCN\n\tDECFSZ BCON_CNT,1\t;CHECK HOW MANY TIMES\n\tGOTO MAIN\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\n\tBSF PORTB,6\t;SET B CONF ALARM\n\tGOTO MAIN\nRST_ACN\tBCF PORTB,5\t;CLEAR A CONF ALARM\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\t;SET CONF TIMER\n\tGOTO B_CHECK\nRST_BCN\tBCF PORTB,6\t;CLEAR B CONF ALARM\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\n\tBSF PORTA,1\n\tGOTO MAIN\n\n;****************  DELAY ROUTINE *****************************\n; INIT DELAY 2 BEFORE ENTERING\n; DELAY=:: DELAY1(255*1/1.53MHZ*2 * DELAY2)\n; DELAY2 = 15 FOR RELAY PULSE(5mS)\n; DELAY2 = 255 4 TIMES FOR VISIBLE DELAY \nDELAY\tMOVLW 0XFF\nDEL1\tMOVWF DELAY1\nDEC1\tCLRWDT\n\tDECFSZ DELAY1,F\n\tGOTO DEC1\n\tDECFSZ DELAY2,F\n\tGOTO DEL1\n\tRETURN\n\n;DELAY\tMOVLW 0XFF\n;\tMOVWF DELAY1\n;\tMOVLW 0X07\n;\tMOVWF DELAY2\n;LOOP\tDECFSZ DELAY1\n;\tGOTO LOOP\n;\tMOVLW 0XFF\n;\tMOVWF DELAY1\n;\tDECFSZ DELAY2\n;\tGOTO LOOP\n;\tRETURN\t\n\n\tEND"}, "v101": {"file": "pd13v101.asm", "date": "2004-09-23", "text": "\tERRORLEVEL -302\n;      POD13 DUAL D-A\n\n;\tLIST\tP=16C5X,r=dec\n\t#INCLUDE \"P16C5X.INC\"\n\nBINIT\tEQU 0X4F\n;************ PROGRAM CONSTANTS*************\nZ\tEQU 2\t\t;ZER0 FLAG IN STATUS REG\n\n;*************  BANK0  RAM *****************\n\tORG 07H \t;BANK0 MEMORY \nDELAY1\tRES 1\t\t;TEMP REG FOR DELAY ROUTINES\nDELAY2\tRES 1\t\t;TEMP REG FOR DELAY ROUTINES\nACON_CNT RES 1\t\t;A CHANNEL CONFIDENCE COUNTER\nBCON_CNT RES 1\t\t;B CHANNEL CONFIDENCE COUNTER\t\t\n\n;*************\tINTERRUPTS  *************************\n\tORG 4H\n;\tRETFIE\n\n;***************  RESET  ****************************\n\tORG 0X1FF\n\tGOTO RESET\n\tORG 0\n\tGOTO RESET\n\tORG\t0X10\nRESET   CALL INIT\n\tGOTO MAIN\n\t\n;************** INIT  ******************************\n\nINIT\tMOVLW B'00001111'\n\tTRIS PORTB\n\tMOVLW B'00000000'\n\tTRIS PORTA\n\tCLRF PORTA\t;SEL\n\tCLRF PORTB\n\tRETLW 0\n\n;*************** DELAY ROUTINE **********************\nDELVIS\tMOVLW 0XFF\n\tMOVWF DELAY2\n\tCALL DELAY\n\tCLRWDT\n\tRETLW 0\n\n;**************  MAIN  ******************************\n;READ ERROR FLAGS 740CHECK FOR LOCK\nMAIN\tBSF PORTA,1\t;SET SEL HIGH\n\tNOP\n\tBCF PORTA,1\t;SEL LINE LOW\n\tCALL DELVIS\n\nA_CHECK\n\tBTFSS PORTB,2\t;E0 - A CHECK\t-IF E0=1, E1=0  THAN VALIDITY BIT=1 \n\tGOTO NEXT_A\t;\t\t-IF E0=1, E1=1  THAN ERROR\n\tBTFSS PORTB,3\t;E1\t\t-IF E0=0, E1=0  THAN NO ERROR\n\tGOTO B_CHECK1\t;\t\t-IF E0=0, E1=1\tTHAN CONFIDENCE ERROR\n\n\tBSF PORTB,4\t;SET A NO LOCK ALARM\n\tBCF PORTA,3\t;SET A NO LOCK LED\n\tBCF PORTB,5\t;CLEAR A CONF ALARM\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\t;SET CONF TIMER\n\tGOTO B_CHECK\n\nNEXT_A\t\n\tBSF PORTA,3\t;SET A LOCK LED\n\tBCF PORTB,4\t;CLEAR A NO LOCK ALARM\n\tBTFSS PORTB,3\n\tGOTO RST_ACN\n\tDECFSZ ACON_CNT,1\t;CHECK HOW MANY TIMES\n\tGOTO B_CHECK\t;CONFIDENCE IS ON\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\n\tBSF PORTB,5\t;SET A CONF ALARM\n\nB_CHECK\t\n\tBTFSS PORTB,0\t;E0 - B CHECK\n\tGOTO NEXT_B\n\tBTFSS PORTB,1\t;E1\n\tGOTO MAIN1\n\n\tBSF PORTB,7\t;SET B NO LOCK ALARM\n\tBCF PORTA,2\t;SET B NO LOCK LED\n\tBCF PORTB,6\t;CLEAR B CONF ALARM\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\t;SET CONF TIMER\n\tGOTO MAIN\nB_CHECK1\n\tBSF PORTA,3\t;SET A LOCK LED - ONLY VALIDITY BIT\n\tBCF PORTB,4\t;CLEAR NO LOCK ALARM\n\tBCF PORTB,5\t;CLEAR CONF ALARM\n\tGOTO B_CHECK\n\nNEXT_B\t\n\tBSF PORTA,2\t;SET B LOCK LED\n\tBCF PORTB,7\t;CLEAR B NO LOCK ALARM\n\tBTFSS PORTB,1\n\tGOTO RST_BCN\n\tDECFSZ BCON_CNT,1\t;CHECK HOW MANY TIMES\n\tGOTO MAIN\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\n\tBSF PORTB,6\t;SET B CONF ALARM\n\tGOTO MAIN\n\nMAIN1\n\tBSF PORTA,2\t;SET B LOCK LED\n\tBCF PORTB,7\t;CLEAR B NO LOCK ALARM\n\tBCF PORTB,6\t;CLEAR B CONF ALARM\n\tGOTO MAIN\n\nRST_ACN\tBCF PORTB,5\t;CLEAR A CONF ALARM\n\tMOVLW 0X07\n\tMOVWF ACON_CNT\t;SET CONF TIMER\n\tGOTO B_CHECK\nRST_BCN\tBCF PORTB,6\t;CLEAR B CONF ALARM\n\tMOVLW 0X07\n\tMOVWF BCON_CNT\n\tBSF PORTA,1\n\tGOTO MAIN\n\n;****************  DELAY ROUTINE *****************************\n; INIT DELAY 2 BEFORE ENTERING\n; DELAY=:: DELAY1(255*1/1.53MHZ*2 * DELAY2)\n; DELAY2 = 15 FOR RELAY PULSE(5mS)\n; DELAY2 = 255 4 TIMES FOR VISIBLE DELAY \nDELAY\tMOVLW 0XFF\nDEL1\tMOVWF DELAY1\nDEC1\tCLRWDT\n\tDECFSZ DELAY1,F\n\tGOTO DEC1\n\tDECFSZ DELAY2,F\n\tGOTO DEL1\n\tRETLW 0\n\n;DELAY\tMOVLW 0XFF\n;\tMOVWF DELAY1\n;\tMOVLW 0X07\n;\tMOVWF DELAY2\n;LOOP\tDECFSZ DELAY1\n;\tGOTO LOOP\n;\tMOVLW 0XFF\n;\tMOVWF DELAY1\n;\tDECFSZ DELAY2\n;\tGOTO LOOP\n;\tRETURN\t\n\n\tEND"}};   // {pd13:{file,date,text}, v100:{…}, v101:{…}}
const BKX = {"v100": ":02000000100AE4\n:1000200012091E0A0F0C0600000C05006500660090\n:100030000008FF0C280052090400000825050000F4\n:100040002504190946072C0A6607350A8605650442\n:10005000A604070C2900350A650586046607490AC7\n:10006000E902350A070C2900A60506073F0A2607FC\n:10007000350AE6054504C604070C2A001E0A450594\n:10008000E60426074D0AEA021E0A070C2A00C605E6\n:100090001E0AA604070C2900350AC604070C2A000C\n:1000A00025051E0AFF0C27000400E702540AE80297\n:0400B000530A0008E7\n:0203FE00100AE3\n:00000001FF", "v101": ":02000000100AE4\n:1000200012091E0A0F0C0600000C05006500660090\n:100030000008FF0C280052090400000825050000F4\n:100040002504190946072C0A6607350AA605650422\n:100050008604070C2900350A6505A6046607490AC7\n:10006000E902350A070C2900860506073F0A26071C\n:10007000350AC6054504E604070C2A001E0A450594\n:10008000C60426074D0AEA021E0A070C2A00E605E6\n:100090001E0A8604070C2900350AE604070C2A000C\n:1000A00025051E0AFF0C27000400E702540AE80297\n:0400B000530A0008E7\n:0203FE00100AE3\n:00000001FF"};       // {v100:'…hex…', v101:'…hex…'} (PD13V100.BKX, PD13V101.BKX)
const FW_ORDER = ['pd13','v100','v101'];
const FW_NAME = {pd13:'PD13.ASM (Jun 1998, from D8201)', v100:'PD13V100.ASM (May 1999)', v101:'pd13v101.asm (Sep 2004, “disregard the validity bit”)'};

/* --- a small MPASM-subset assembler for the 12-bit PIC16C5x core --- */
const INC = {INDF:0,TMR0:1,PCL:2,STATUS:3,FSR:4,PORTA:5,PORTB:6,W:0,F:1};   // P16C5X.INC (the symbols this code uses)
const OPS = { NOP:[0x000,0], OPTION:[0x002,0], SLEEP:[0x003,0], CLRWDT:[0x004,0], CLRW:[0x040,0], TRIS:[0x000,'t'], MOVWF:[0x020,'f'], CLRF:[0x060,'f'],
  SUBWF:[0x080,'fd'], DECF:[0x0C0,'fd'], IORWF:[0x100,'fd'], ANDWF:[0x140,'fd'], XORWF:[0x180,'fd'], ADDWF:[0x1C0,'fd'], MOVF:[0x200,'fd'], COMF:[0x240,'fd'], INCF:[0x280,'fd'],
  DECFSZ:[0x2C0,'fd'], RRF:[0x300,'fd'], RLF:[0x340,'fd'], SWAPF:[0x380,'fd'], INCFSZ:[0x3C0,'fd'], BCF:[0x400,'fb'], BSF:[0x500,'fb'], BTFSC:[0x600,'fb'], BTFSS:[0x700,'fb'],
  RETLW:[0x800,'k8'], CALL:[0x900,'k8'], GOTO:[0xA00,'k9'], MOVLW:[0xC00,'k8'], IORLW:[0xD00,'k8'], ANDLW:[0xE00,'k8'], XORLW:[0xF00,'k8'], RETURN:[0x800,0] };   // RETURN: MPASM pseudo-op on the 12-bit core → RETLW 0
function parseNum(s, sym){
  s=s.trim(); let m;
  if (sym && s.toUpperCase() in sym) return sym[s.toUpperCase()];
  if ((m=/^0X([0-9A-F]+)$/i.exec(s))) return parseInt(m[1],16);
  if ((m=/^([0-9A-F]+)H$/i.exec(s))) return parseInt(m[1],16);
  if ((m=/^B'([01]+)'$/i.exec(s))) return parseInt(m[1],2);
  if ((m=/^D'(\d+)'$/i.exec(s))) return parseInt(m[1],10);
  if (/^\d+$/.test(s)) return parseInt(s,10);    // all bare numbers in these files are < 10, so the radix does not matter
  return NaN;
}
function assemble(text){
  const lines = text.replace(/\x1a/g,'').split(/\r?\n/);
  const rows = lines.map((raw,i)=>{ const ci=raw.indexOf(';'); const code=(ci>=0?raw.slice(0,ci):raw), comment=ci>=0?raw.slice(ci+1).trim():'';
    let label=null, rest=code; if (/^[A-Za-z_]/.test(code)){ const m=/^([A-Za-z_][\w]*)\s*(.*)$/.exec(code); label=m[1]; rest=m[2]; }
    const m2=/^\s*([#A-Za-z_][\w]*)\s*(.*?)\s*$/.exec(rest); const mn=m2?m2[1].toUpperCase():null, args=m2&&m2[2]?m2[2].split(',').map(s=>s.trim()):[];
    return {n:i+1, raw, label, mn, args, comment}; });
  const sym = Object.assign({}, INC), warnings=[];
  const pass = (emit)=>{
    let loc=0; const mem={}, lineOf={}, addrOfLine={};
    for (const r of rows){
      let mn=r.mn, label=r.label;
      if (mn && !(mn in OPS) && !['ORG','RES','EQU','END','LIST','ERRORLEVEL','#INCLUDE'].includes(mn) && !r.args.length){ if(emit) warnings.push(`line ${r.n}: “${mn}” is not a 16C5x instruction, so MPASM takes it as a label (Warning[207]) at ${hex(loc,3)}`); if(!label) label=mn; mn=null; }
      if (mn==='EQU'){ sym[label.toUpperCase()] = parseNum(r.args[0],sym); continue; }
      if (mn==='ORG'){ loc = parseNum(r.args[0],sym); if (label) sym[label.toUpperCase()]=loc; continue; }
      if (label) sym[label.toUpperCase()] = loc;
      if (mn==='RES'){ loc += parseNum(r.args[0],sym); continue; }
      if (mn==='END') break;
      if (!mn || !(mn in OPS)) continue;
      const [base,form]=OPS[mn]; let w=base;
      if (emit){ const a=r.args.map(x=>parseNum(x,sym));
        if (form==='f') w|=a[0]&31; else if (form==='t') w|=a[0]&7;
        else if (form==='fd') w|=(a[0]&31)|((a.length>1?a[1]:1)&1)<<5;
        else if (form==='fb') w|=(a[0]&31)|(a[1]&7)<<5;
        else if (form==='k8') w|=a[0]&255; else if (form==='k9') w|=a[0]&511;
        if (r.args.some((x,i)=>isNaN(a[i]))) warnings.push(`line ${r.n}: cannot resolve “${r.args.join(',')}”`); }
      if (emit && mn==='RETURN') warnings.push(`line ${r.n}: RETURN is not a 16C5x instruction; MPASM substitutes RETLW 0 (Warning[227])`);
      mem[loc]=w; lineOf[loc]=r.n; addrOfLine[r.n]=loc; loc++;
    }
    return {mem,lineOf,addrOfLine};
  };
  pass(false); const out=pass(true);
  const labels={}; rows.forEach(r=>{ if (r.label && sym[r.label.toUpperCase()]!=null && out.addrOfLine[r.n]!=null) labels[out.addrOfLine[r.n]]=r.label; });
  rows.forEach(r=>{ if (r.label && !(r.mn in {EQU:1,RES:1}) && r.label.toUpperCase() in sym){ const a=sym[r.label.toUpperCase()]; if (out.mem[a]!=null && !labels[a]) labels[a]=r.label; } });
  return {rows, sym, warnings, labels, ...out};
}
function hexWords(h){ const mem={}; (h||'').split(/\s+/).forEach(line=>{ if(!/^:/.test(line)) return; const n=parseInt(line.substr(1,2),16), a=parseInt(line.substr(3,4),16), ty=parseInt(line.substr(7,2),16); if(ty) return;
  for (let i=0;i<n;i+=2){ const lo=parseInt(line.substr(9+2*i,2),16), hi=parseInt(line.substr(11+2*i,2),16); mem[(a+i)/2]=lo|hi<<8; } }); return mem; }
const OPN = {0x2:'SUBWF',0x3:'DECF',0x4:'IORWF',0x5:'ANDWF',0x6:'XORWF',0x7:'ADDWF',0x8:'MOVF',0x9:'COMF',0xA:'INCF',0xB:'DECFSZ',0xC:'RRF',0xD:'RLF',0xE:'SWAPF',0xF:'INCFSZ'};
function disasm(w, names){ const f=x=>(names&&names[x])||('0x'+hex(x));
  if (w===0) return 'NOP'; if (w===2) return 'OPTION'; if (w===3) return 'SLEEP'; if (w===4) return 'CLRWDT'; if (w>=5&&w<=7) return 'TRIS '+f(w);
  if (w>>5===1) return 'MOVWF '+f(w&31); if (w===0x40) return 'CLRW'; if (w>>5===3) return 'CLRF '+f(w&31);
  if (w>>10===0) return OPN[(w>>6)&15]+' '+f(w&31)+','+(w&32?'F':'W');
  const b=(w>>5)&7, top=w>>8; if (top>=4&&top<=7) return ['BCF','BSF','BTFSC','BTFSS'][top-4]+' '+f(w&31)+','+b;
  if (top===8) return 'RETLW 0x'+hex(w&255); if (top===9) return 'CALL 0x'+hex(w&255,3); if (w>>9===5) return 'GOTO 0x'+hex(w&511,3);
  return ['MOVLW','IORLW','ANDLW','XORLW'][top-12]+' 0x'+hex(w&255); }

let PROGS=null;
function progs(){ if (PROGS) return PROGS; PROGS={}; FW_ORDER.forEach(k=>{ PROGS[k]=assemble(SRC[k].text); PROGS[k].key=k; }); return PROGS; }
function bkxCompare(){
  const P=progs(), out=[];
  [['v100','PD13V100.BKX (Nov 18 1999)'],['v101','PD13V101.BKX (May 13 1999)']].forEach(([bk,nm])=>{
    const words=hexWords(BKX[bk]); const addrs=Object.keys(words).map(Number);
    FW_ORDER.forEach(k=>{ const mem=P[k].mem; const all=new Set([...addrs,...Object.keys(mem).map(Number)]); let diff=0; all.forEach(a=>{ if (words[a]!==mem[a]) diff++; });
      out.push({bkx:nm, fw:k, words:addrs.length, diff}); }); });
  return out;
}

/* =====================================================================
   2. Device state
   ===================================================================== */
const DUR = 3;                         // seconds simulated: the confidence alarm needs 7 main-loop passes
const K = { lockT:0.012, drt:0.018, wdtBase:0.018, wdtPre:128, vSrc110:4.0, vSrc75:1.0, eyeMin:0.2, eyeConf:0.25, eyeSlip:0.17 };
const LIM = { 110:{off:250, on:600}, 75:{off:600, on:1500} };   // manual: reliable reach without / with the equalizer
const D = {
  power:true, powerAt:0, version:110, fw:'v101', fosc:4e6, wdt:false, ramInit:0x07,
  conv:[ { plug:true, fs:48000, dbfs:-20, f:1000, cable:30, valid:false, eq:false, lvlIn:false, trim:[0,0], at:-1, glitches:[] },
         { plug:true, fs:44100, dbfs:-20, f:440,  cable:30, valid:false, eq:false, lvlIn:false, trim:[0,0], at:-1, glitches:[] } ],
  ver:0, log:[] };
const FACT = JSON.parse(JSON.stringify(D));
const NAMES = ['CONVERTER A','CONVERTER B'];
const CODES = ['000 no error','001 validity bit set','010 confidence (eye closing)','011 slipped sample','100 CRC error','101 parity error','110 bi-phase coding error','111 no lock'];

/* ---- the input side: what each CS8412 reports (E2 E1 E0) ---- */
function alpha(){ const v=D.version, L=LIM[v]; return 20*Math.log10((v===110?K.vSrc110:K.vSrc75)/K.eyeMin)/L.off; }   // dB per m: the eye reaches the 0.2 V p-p spec minimum at the manual's no-EQ reach
function eqBoost(){ const L=LIM[D.version]; return alpha()*(L.on-L.off); }
function rawV(k){ const c=D.conv[k]; return (D.version===110?K.vSrc110:K.vSrc75)*Math.pow(10,-alpha()*c.cable/20); }
function eyeV(k){ return rawV(k)*Math.pow(10,(D.conv[k].eq?eqBoost():0)/20); }
function steadyCode(k){ const c=D.conv[k]; if (!c.plug) return 7; if (c.fs<30000||c.fs>50000) return 7;
  const e=eyeV(k); if (e<K.eyeSlip) return 7; if (e<K.eyeMin) return 6; if (e<K.eyeConf) return 2; return c.valid?1:0; }
function codeAt(k,t){ const c=D.conv[k]; if (!D.power || t<D.powerAt) return 7;
  for (const g of c.glitches) if (t>=g.t0 && t<g.t1) return g.code;
  const st=Math.max(c.at, D.powerAt); if (t>=st && t<st+K.lockT) return 7;
  return steadyCode(k); }
const locked = (k,t)=> codeAt(k,t)!==7;

/* =====================================================================
   3. PIC16C54A emulator (12-bit core, 2-level stack, 1 cycle = 4 Fosc clocks)
   ===================================================================== */
const SKIPLBL = {DEL1:1, DEC1:1};
let TRACE=null, TRACE_KEY='';
function traceKey(){ return [D.ver,D.fw,D.fosc,D.wdt,D.ramInit,D.power,D.powerAt].join('|'); }
function newCPU(){ return { pc:0x1FF, w:0, f:new Uint8Array(32), st:[0,0], sp:0, trisA:0xF, trisB:0xFF, wdtC:0, sel:0 }; }
function resetCPU(cpu, cold){ cpu.pc=0x1FF; cpu.trisA=0xF; cpu.trisB=0xFF; cpu.f[3]=(cpu.f[3]&0x07)|0x18; cpu.wdtC=0;
  if (cold){ for (let i=7;i<32;i++) cpu.f[i]=(i===9||i===10)?D.ramInit:0; cpu.f[5]=0; cpu.f[6]=0; cpu.w=0; } }
function cloneCPU(c){ return { pc:c.pc, w:c.w, f:new Uint8Array(c.f), st:c.st.slice(), sp:c.sp, trisA:c.trisA, trisB:c.trisB, wdtC:c.wdtC }; }
function inputsB(t, cpu){   // pins RB0..RB3 = E0-B, E1-B, E0-A, E1-A (POD13-3.DSN nets; pin order from the code's comments)
  const sel = (cpu.f[5]>>1)&1 && !((cpu.trisA>>1)&1);
  if (sel) return 0;          // SEL high: the pins carry channel-status bits instead (not read by this code) — modelled as 0 (inferred)
  const a=codeAt(0,t), b=codeAt(1,t);
  return (b&1) | ((b>>1)&1)<<1 | (a&1)<<2 | ((a>>1)&1)<<3;
}
function readF(cpu, a, t){ a&=31; if (a===0) a=cpu.f[4]&31; if (a===0) return 0;
  if (a===2) return cpu.pc&255;
  if (a===5) return (cpu.f[5]&~cpu.trisA&0xF) | (cpu.trisA&0x0);   // RA inputs float (none used)
  if (a===6) return (cpu.f[6]&~cpu.trisB&0xFF) | (inputsB(t,cpu)&cpu.trisB&0x0F);
  return cpu.f[a]; }
function writeF(cpu, a, v){ a&=31; if (a===0) a=cpu.f[4]&31; v&=255; if (a===2){ cpu.pc=v; return true; } if (a===5) v&=0xF; cpu.f[a]=v; return false; }
/* Runs the selected program from power-on to DUR and records what the timeline needs. */
function runTrace(){
  const P=progs()[D.fw], mem=P.mem, fcy=D.fosc/4, tcy=1/fcy;
  const T = { tcy, t0:D.powerAt+K.drt, ports:[], hits:[], reads:[], resets:[], cks:[], cnt:[], prog:P, cycles:0 };
  if (!D.power) return T;
  const cpu=newCPU(); resetCPU(cpu,true);
  const total=Math.floor((DUR-T.t0)/tcy), ckEvery=Math.max(1,Math.round(0.002/tcy));
  const wdtLim = D.wdt ? Math.round(K.wdtBase*K.wdtPre/tcy) : Infinity;
  let lastA=-1, lastB=-1, lastTA=-1, lastTB=-1, cyc=0, lastAC=-1, lastBC=-1;
  const rec=()=>{ if (cpu.f[5]!==lastA||cpu.f[6]!==lastB||cpu.trisA!==lastTA||cpu.trisB!==lastTB){ lastA=cpu.f[5]; lastB=cpu.f[6]; lastTA=cpu.trisA; lastTB=cpu.trisB; T.ports.push({c:cyc,a:lastA,b:lastB,ta:lastTA,tb:lastTB}); }
    if (cpu.f[9]!==lastAC||cpu.f[10]!==lastBC){ lastAC=cpu.f[9]; lastBC=cpu.f[10]; T.cnt.push({c:cyc,a:lastAC,b:lastBC}); } };
  rec();
  let nextCk=0;
  while (cyc<total){
    if (cyc>=nextCk){ T.cks.push({c:cyc, cpu:cloneCPU(cpu)}); nextCk+=ckEvery; }
    const lb=P.labels[cpu.pc]; if (lb && !SKIPLBL[lb]) T.hits.push({c:cyc, l:lb, pc:cpu.pc});
    const t=T.t0+cyc*tcy; const n=stepCPU(cpu, mem, t, T, cyc);
    cyc+=n; cpu.wdtC+=n;
    if (cpu.wdtC>wdtLim){ T.resets.push({c:cyc}); resetCPU(cpu,false); }
    rec();
  }
  T.cycles=cyc; return T;
}
function stepCPU(cpu, mem, t, T, cyc){
  const w = mem[cpu.pc]!=null ? mem[cpu.pc] : 0xFFF;   // erased OTP reads 0xFFF = XORLW 0xFF
  let pc = (cpu.pc+1)&511, n=1; const f=w&31, d=(w>>5)&1, b=(w>>5)&7, top=w>>8, F=cpu.f;
  if (w<8){ if (w===4) cpu.wdtC=0; else if (w===5) cpu.trisA=cpu.w&0xF; else if (w===6) cpu.trisB=cpu.w; }   // NOP, OPTION, SLEEP, CLRWDT, TRIS
  else if (w>>5===1){ if (writeF(cpu,f,cpu.w)){ pc=cpu.w; n=2; } }                                          // MOVWF
  else if (w===0x40){ cpu.w=0; F[3]|=4; }                                                                     // CLRW
  else if (w>>5===3){ writeF(cpu,f,0); F[3]|=4; }                                                             // CLRF
  else if (w>>10===0){ const op=(w>>6)&15, v=readF(cpu,f,t); let r=0, z=true, skip=false;
    switch(op){ case 2: r=v-cpu.w; if (r>=0) F[3]|=1; else F[3]&=~1; r&=255; break;
      case 3: r=(v-1)&255; break; case 4: r=v|cpu.w; break; case 5: r=v&cpu.w; break; case 6: r=v^cpu.w; break;
      case 7: r=v+cpu.w; if (r>255) F[3]|=1; else F[3]&=~1; r&=255; break; case 8: r=v; break; case 9: r=(~v)&255; break; case 10: r=(v+1)&255; break;
      case 11: r=(v-1)&255; z=false; skip=r===0; break; case 12: r=((F[3]&1)<<7)|(v>>1); F[3]=(F[3]&~1)|(v&1); z=false; break;
      case 13: r=((v<<1)|(F[3]&1))&255; F[3]=(F[3]&~1)|(v>>7); z=false; break; case 14: r=((v<<4)|(v>>4))&255; z=false; break; case 15: r=(v+1)&255; z=false; skip=r===0; break; }
    if (z){ if (r===0) F[3]|=4; else F[3]&=~4; }
    if (d){ if (writeF(cpu,f,r)){ pc=r; n=2; } } else cpu.w=r;
    if (skip){ pc=(pc+1)&511; n=2; } }
  else if (top===4) writeF(cpu,f,F[f]&~(1<<b));                                                               // BCF
  else if (top===5) writeF(cpu,f,F[f]|(1<<b));                                                                // BSF
  else if (top===6||top===7){ const bit=(readF(cpu,f,t)>>b)&1;                                                 // BTFSC / BTFSS
    if (f===6 && b<4 && T) T.reads.push({c:cyc, bit:b, v:bit, pc:cpu.pc});
    if ((top===6 && !bit) || (top===7 && bit)){ pc=(pc+1)&511; n=2; } }
  else if (top===8){ cpu.w=w&255; cpu.sp=Math.max(0,cpu.sp-1); pc=cpu.st[cpu.sp]; n=2; }                      // RETLW
  else if (top===9){ cpu.st[Math.min(cpu.sp,1)]=pc; cpu.sp=Math.min(2,cpu.sp+1); pc=w&255; n=2; }              // CALL
  else if (w>>9===5){ pc=w&511; n=2; }                                                                         // GOTO
  else { const k=w&255; if (top===12) cpu.w=k; else { cpu.w = top===13? cpu.w|k : top===14? cpu.w&k : cpu.w^k; if (cpu.w===0) F[3]|=4; else F[3]&=~4; } }
  cpu.pc=pc; return n;
}
function trace(){ const k=traceKey(); if (!TRACE || k!==TRACE_KEY){ TRACE=runTrace(); TRACE_KEY=k; } return TRACE; }
function bsearch(arr, c){ let lo=0, hi=arr.length-1, r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if (arr[m].c<=c){ r=m; lo=m+1; } else hi=m-1; } return r; }
const cycAt = (T,t)=> Math.floor((t-T.t0)/T.tcy);
function portsAt(t){ const T=trace(); if (!D.power || t<T.t0) return null; const i=bsearch(T.ports, cycAt(T,t)); return i<0?null:T.ports[i]; }
function cntAt(t){ const T=trace(); if (!D.power || t<T.t0) return null; const i=bsearch(T.cnt, cycAt(T,t)); return i<0?null:T.cnt[i]; }
/* LED/tally outputs as the board sees them (driven only once INIT has made the pins outputs) */
function lockLED(k,t){ const p=portsAt(t); if(!p) return null; const bit=k?2:3; if ((p.ta>>bit)&1) return null; return (p.a>>bit)&1; }   // 1 = LOCK (green), 0 = NO LOCK (red), null = undriven
const TB_PIN = {anl:4,acf:5,bcf:6,bnl:7};   // ISS 3 board wiring, taken from the V100/V101 comments (Q1–Q4 2N3904 drivers, order inferred)
function tally(key,t){ const p=portsAt(t); if(!p) return 0; const bit=TB_PIN[key]; if ((p.tb>>bit)&1) return 0; return (p.b>>bit)&1; }
function cpuAt(t){ const T=trace(); if (!D.power || t<T.t0 || !T.cks.length) return null; const target=cycAt(T,t); const i=bsearch(T.cks,target); if (i<0) return null;
  const cpu=cloneCPU(T.cks[i].cpu); let cyc=T.cks[i].c; const mem=T.prog.mem; let guard=0;
  const wdtLim = D.wdt ? Math.round(K.wdtBase*K.wdtPre/T.tcy) : Infinity;
  while (cyc<target && guard++<200000){ const n=stepCPU(cpu,mem,T.t0+cyc*T.tcy,null,cyc); cyc+=n; cpu.wdtC+=n; if (cpu.wdtC>wdtLim) resetCPU(cpu,false); }
  cpu.cyc=cyc; return cpu; }
function labelAt(t){ const T=trace(); const i=bsearch(T.hits, cycAt(T,t)); return i<0?null:T.hits[i]; }
function passes(){ const T=trace(); return T.hits.filter(h=>h.l==='MAIN').map(h=>T.t0+h.c*T.tcy); }

/* ---- the analog side ---- */
const LVL = lvlIn => lvlIn? 18 : 24;    // functional diagram + silk legend: button out = 0 dBFS → +24 dBu, pressed = +18 dBu
const RAIL=12, SWING=1.5;               // LF353 on ±12 V (DSN “+12”, “-12”); output swing loss inferred
function outDbu(k,ch){ const c=D.conv[k]; return c.dbfs + LVL(c.lvlIn) + c.trim[ch]; }
function clipDbu(){ return v2dbu(2*(RAIL-SWING)/Math.SQRT2); }
function sample(k,t){ const c=D.conv[k]; if(!locked(k,t)) return 0; const n=Math.floor(t*c.fs); return Math.pow(10,c.dbfs/20)*Math.sin(2*Math.PI*c.f*n/c.fs); }
function analog(k,ch,t){ const c=D.conv[k]; if (!locked(k,t)) return 0; const vpk=dbu2v(outDbu(k,ch))*Math.SQRT2; const lim=2*(RAIL-SWING); return clamp(vpk*Math.sin(2*Math.PI*c.f*t), -lim, lim); }
function levels(k,ch){
  const c=D.conv[k], code=steadyCode(k), L=code!==7, out=outDbu(k,ch), cl=clipDbu();
  return { lock:L, out:L?out:-200, clip:L&&out>cl, stages:[
    {name:`AES input (${D.version===110?'XLR-3F, 110R':'BNC, 75R'}) after ${c.cable} m`, lvl:c.plug?20*Math.log10(Math.max(rawV(k),1e-9)):-200, gain:null, clip:null, unit:'dBV p-p', note:c.plug?`${rawV(k).toFixed(3)} V p-p (spec 0.2–7 V p-p); cable loss ${(alpha()*c.cable).toFixed(1)} dB (${inf})`:'nothing connected'},
    {name:`EQ insert (${c.eq?'ON':'off'}) → AES transformer`, lvl:c.plug?20*Math.log10(Math.max(eyeV(k),1e-9)):-200, gain:c.eq?eqBoost():0, clip:null, unit:'dBV p-p', note:`eye at the CS8412 ${eyeV(k).toFixed(3)} V p-p; needs ≥ ${K.eyeMin} V (${inf})`},
    {name:'CS8412 receiver → CS4329 20-bit DAC', lvl:L?c.dbfs:-200, gain:null, clip:0, unit:'dBFS', note:`E2E1E0 = ${CODES[code]}`+(L?` · ${c.fs/1000} kHz`:' · DAC muted ('+inf+')')},
    {name:`LVL (${c.lvlIn?'pressed':'out'}): 74HC4053 gain + LF353`, lvl:L?out-6.02:-200, gain:L?LVL(c.lvlIn):null, clip:cl-6.02, note:`0 dBFS = +${LVL(c.lvlIn)} dBu; ${ch?'R':'L'} trim ${fdb(c.trim[ch],2)} dB`},
    {name:'Balanced driver, 2 × 30R → Phoenix', lvl:L?out:-200, gain:6.02, clip:cl, note:`60 Ω balanced (manual); clips near ${fdb(cl)} dBu on ±12 V (${inf})`},
  ]};
}

/* =====================================================================
   4. Actions
   ===================================================================== */
const ledName = v => v==null?'off':v?'LOCK':'NO LOCK';
const act = makeActor(D, ()=>{ const t=DUR-0.001; return `A ${ledName(lockLED(0,t))} · B ${ledName(lockLED(1,t))} (end of run)`; });
function fwPathFor(k){ const code=steadyCode(k), e0=code&1, e1=(code>>1)&1, f=D.fw, A=k===0;
  const L = A? {chk:'A_CHECK (BTFSS PORTB,2 ; E0)', nl:'BSF PORTB,4 ; SET A NO LOCK ALARM · BCF PORTA,3 ; NO LOCK LED', lk:'NEXT_A: BSF PORTA,3 ; LOCK LED', cf:'DECFSZ ACON_CNT → BSF PORTB,5 ; A CONF ALARM after 7 passes', ok:'RST_ACN: BCF PORTB,5 ; MOVLW 7 → ACON_CNT'}
             : {chk:'B_CHECK (BTFSS PORTB,0 ; E0)', nl:'BSF PORTB,7 ; SET B NO LOCK ALARM · BCF PORTA,2 ; NO LOCK LED', lk:'NEXT_B: BSF PORTA,2 ; LOCK LED', cf:'DECFSZ BCON_CNT → BSF PORTB,6 ; B CONF ALARM after 7 passes', ok:'RST_BCN: BCF PORTB,6 ; MOVLW 7 → BCON_CNT'};
  if (e0 && e1) return [L.chk+' = 1, E1 = 1 → no lock', L.nl];
  if (!e0) return [L.chk+' = 0 → locked', L.lk, e1? L.cf : L.ok];
  // E0=1, E1=0: validity
  if (f==='v101') return [L.chk+' = 1, E1 = 0 → validity only', A?'B_CHECK1: BSF PORTA,3 ; LOCK LED - ONLY VALIDITY BIT (clears both A alarms)':'MAIN1: BSF PORTA,2 ; B LOCK LED (clears both B alarms)'];
  return [L.chk+' = 1, E1 = 0 → validity bit', A?'GOTO B_CHECK — A’s LED and alarms are left as they were (V100 / PD13 bug)':'GOTO B_CHECK — loops on B until the validity flag clears; nothing else runs and CLRWDT is not executed (V100 / PD13 bug)'];
}
const A = {
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if (D.power){ D.powerAt=SIM.t;
    tr('T1 toroid → bridge → LM317/LM337 (±12 V), MC7805/MC7905, LM2931AT-5.0 (+5 V digital) (POD13-3.DSN part list)');
    tr(`PIC16C54A: device-reset timer ≈ ${K.drt*1000} ms (${inf}, data sheet), then ORG 0x1FF: GOTO RESET → CALL INIT`);
    tr('INIT: MOVLW B\'00001111\' / TRIS PORTB (RB0–RB3 in = E0/E1 of both CS8412s) · TRIS PORTA = 0 · CLRF PORTA, CLRF PORTB → both NO LOCK LEDs red');
    tr('MAIN: BSF PORTA,1 (SEL high) · NOP · BCF PORTA,1 (SEL low) · CALL DELVIS (≈ 255 × 255 loops) · then A_CHECK and B_CHECK'); } }); },
  plug(k){ act(`${NAMES[k]}: ${D.conv[k].plug?'unplug':'plug in'} the AES source`, tr=>{ const c=D.conv[k]; c.plug=!c.plug; c.at=SIM.t;
    tr(c.plug? `${D.version===110?'XLR-3F → 110R':'BNC → 75R'} → AES transformer → ${c.eq?'EQ amplifier → ':''}CS8412 RXP/RXN; PLL relocks in ≈ ${K.lockT*1000} ms (${inf})` : 'CS8412 loses lock: E2E1E0 = 111');
    fwPathFor(k).forEach(s=>tr('next pass: '+s)); tr('The LED changes only at the next A_CHECK/B_CHECK, up to one loop pass ('+SIM.fmtDur(passPeriod())+') later'); }); },
  eq(k){ act(`${NAMES[k]}: EQ button ${D.conv[k].eq?'out (off)':'in (on)'}`, tr=>{ const c=D.conv[k]; c.eq=!c.eq; c.at=SIM.t;
    tr(`${k?'SW3':'SW1'} (PH3SW) switches the cable equalizer into the receive path (${k?'BEQ-IN':'AEQ-IN'}) and lights ${k?'BEQ-ON':'AEQ-ON'} — hardware only, the PIC does not see it`);
    tr(`Eye at the CS8412: ${eyeV(k).toFixed(3)} V p-p → ${CODES[steadyCode(k)]}`); fwPathFor(k).forEach(s=>tr('next pass: '+s)); }); },
  lvl(k){ act(`${NAMES[k]}: LVL button ${D.conv[k].lvlIn?'out':'in'}`, tr=>{ const c=D.conv[k]; c.lvlIn=!c.lvlIn;
    tr(`${k?'SW4':'SW2'} drives the 74HC4053 (${k?'U16':'U17'}) select line → ${k?'BLVL-L/BLVL-R':'ALVL-L/ALVL-R'} gain resistors (hardware only)`);
    tr(`0 dBFS = +${LVL(c.lvlIn)} dBu → output now ${fdb(outDbu(k,0))} dBu`); }); },
  set(k,key,v,l){ act(l, tr=>{ const c=D.conv[k]; c[key]=v; if (key!=='dbfs'&&key!=='f'&&key!=='valid') c.at=SIM.t;
    if (key==='valid') tr(`Source sets the AES3 V bit to ${v?1:0} in every subframe → CS8412 E2E1E0 = ${CODES[steadyCode(k)]}`);
    else if (key==='cable') tr(`Cable loss ${(alpha()*v).toFixed(1)} dB (${inf}) → eye ${eyeV(k).toFixed(3)} V p-p → ${CODES[steadyCode(k)]}`);
    else if (key==='fs') tr(v<30000||v>50000? 'Outside the 30–50 kHz range in the manual → CS8412 cannot lock (111)' : 'CS8412 relocks at the new rate');
    else tr('Source tone changed');
    if (key!=='dbfs'&&key!=='f') fwPathFor(k).forEach(s=>tr('next pass: '+s)); }); },
  glitch(k,ms,code){ act(`${NAMES[k]}: ${ms} ms ${code===7?'dropout':'confidence burst'} at ${SIM.fmtT(SIM.t)}`, tr=>{ D.conv[k].glitches.push({t0:SIM.t, t1:SIM.t+ms/1000, code});
    const T=trace(); const reads=T.reads.filter(r=>{ const tt=T.t0+r.c*T.tcy; return tt>=SIM.t && tt<SIM.t+ms/1000; });
    tr(`CS8412 shows ${CODES[code]} for ${ms} ms`); tr(`The PIC polls E0/E1 once per pass (every ${SIM.fmtDur(passPeriod())}); the LED ${'will '+(reads.length?'catch it':'miss it unless a read falls inside the window')} (${inf}: the CS8412 error latch is not modelled)`); }); },
  fw(v){ act(`Firmware → ${FW_NAME[v]}`, tr=>{ D.fw=v; const P=progs()[v]; tr(`Assembled ${Object.keys(P.mem).length} words; ${P.warnings.length} assembler warning(s)`); }); },
  cfg(key,v,l){ act(l, tr=>{ D[key]=v; if (key==='version'){ tr(v===110?'110 Ω version: XLR-3F inputs (Delco 009035 cable)':'75 Ω version: BNC inputs (Belden 8281 cable)'); tr(`Reach without EQ ${LIM[v].off} m, with EQ ${LIM[v].on} m (manual)`); }
    if (key==='fosc') tr(`RC oscillator ${D.fosc/1e6} MHz → instruction cycle ${SIM.fmtDur(4/D.fosc)} → main loop ≈ ${SIM.fmtDur(passPeriod())}`);
    if (key==='wdt') tr(v?`WDT fuse on: with the prescaler on the WDT (OPTION = 0x3F after reset) it times out after ≈ ${(K.wdtBase*K.wdtPre).toFixed(2)} s without CLRWDT (${inf})`:'WDT fuse off (POD13.PJT: WDTEnable=0)');
    if (key==='ramInit') tr(`ACON_CNT and BCON_CNT power up holding 0x${hex(v)}; INIT never loads them`); }); },
  reset(){ const keep=D.ver; Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.ver=keep+1; SIM.refresh(); },
};
function passPeriod(){ const p=passes(); if (p.length>=3) return p[p.length-1]-p[p.length-2]; return 261800*4/D.fosc; }

/* =====================================================================
   5. Panels (POD13SLK.CDR silk, POD13FRT/POD13RER drawings)
   ===================================================================== */
const FX = { pwrLed:299, y:218, conv:[{lvl:757,eqLed:814,eq:872,nl:949,lk:1009},{lvl:1197,eqLed:1254,eq:1313,nl:1389,lk:1449}] };   // LVL/EQ on the POD13SLK.CDR drill crosshairs
function frontSVG(t){ let over=rocker(D.power,129,84)+led(FX.pwrLed,FX.y,D.power,'#d8ff70')+screw(50,160)+screw(1664,160);
  [0,1].forEach(k=>{ const p=FX.conv[k], c=D.conv[k], L=D.power?lockLED(k,t):null;
    over+=pbtn(p.lvl,FX.y,c.lvlIn,'lv'+k,`${NAMES[k]} LVL: ${c.lvlIn?'pressed → 0 dBFS = +18 dBu':'out → 0 dBFS = +24 dBu'} (click)`);
    over+=pbtn(p.eq,FX.y,c.eq,'eq'+k,`${NAMES[k]} EQ: ${c.eq?'on':'off'} (click)`)+led(p.eqLed,FX.y,D.power&&c.eq,'#ffb43a',9);
    over+=led(p.nl,FX.y,L===0,'#ff4a3a',9)+led(p.lk,FX.y,L===1,'#58e06a',9); });
  return panelSVG('front',{over},'POD13 front panel (silk from POD13SLK.CDR)'); }
const RX = { xlr:[269,529], y:161, tb:[776,861,946,1031,1116,1201], tbY:156 };
function rearSVG(t){ let over=screw(42,160)+screw(1675,162);
  [0,1].forEach(k=>{ const c=D.conv[k], tt=`${NAMES[k]} AES/EBU input (${D.version===110?'XLR-3F, 110 Ω':'BNC, 75 Ω'}) — click to ${c.plug?'unplug':'plug in'}`;
    over+= D.version===110 ? xlrF(RX.xlr[k],RX.y,90,c.plug,'in'+k,tt) : bnc(RX.xlr[k],RX.y,44,c.plug,'in'+k,tt); });
  over+=`<rect x="732" y="112" width="514" height="88" rx="4" fill="#060707" stroke="#2b2e31"/>`;
  const tl=k=>[{on:tally(k?'bnl':'anl',t),col:'#ff4a3a'},{on:tally(k?'bcf':'acf',t),col:'#ffb43a'},null];
  ['A LEFT','A RIGHT','A CTL','B LEFT','B RIGHT','B CTL'].forEach((n,i)=>{ const isCtl=i%3===2, k=i<3?0:1;
    over+=tb3(RX.tb[i],RX.tbY, isCtl? `${n}: NO LOCK, CONFIDENCE (open-collector 2N3904, 10 Ω, 30 V 60 mA max), common — lit pin = transistor on` : `${n}: + − G, 60 Ω balanced`, isCtl? tl(k): null); });
  over+=`<g><title>Fuse holder (single-D punch, POD13RER): 115 VAC, 1/2 A slow-blow</title><circle cx="1374" cy="160" r="30" fill="#0c0d0e" stroke="#3a3d40" stroke-width="3"/><rect x="1360" y="146" width="28" height="28" rx="4" fill="#26282b"/><path d="M1366 160h16" stroke="#777" stroke-width="4"/></g>`;
  over+=`<g><title>Earth stud (PEM, POD13RER)</title><circle cx="1454" cy="160" r="10" fill="#9a9ea2"/></g>`;
  over+=`<g><title>AC cord, strain relief (double-D punch; ${inf})</title><circle cx="1534" cy="160" r="34" fill="#0c0d0e" stroke="#3a3d40" stroke-width="3"/><circle cx="1534" cy="160" r="20" fill="#222"/><path d="M1534 180 C1540 250 1600 290 1700 300" stroke="#222" stroke-width="22" fill="none"/></g>`;
  return panelSVG('rear',{over},'POD13 rear panel (silk from POD13SLK.CDR)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power();
  [0,1].forEach(k=>{ root.querySelectorAll('.lv'+k).forEach(g=>g.onclick=()=>A.lvl(k)); root.querySelectorAll('.eq'+k).forEach(g=>g.onclick=()=>A.eq(k)); root.querySelectorAll('.in'+k).forEach(g=>g.onclick=()=>A.plug(k)); }); }
function controlsHTML(){ return `<div class="small" style="margin-top:8px">
  ${[0,1].map(k=>{ const c=D.conv[k]; return `<div style="display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;margin-top:4px"><b style="min-width:105px">${NAMES[k]}</b><label>fs <select id="fs${k}">${[32000,44100,48000,96000].map(f=>`<option value="${f}" ${f===c.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
   <label>level <input id="lv${k}" type="number" step="1" max="0" value="${c.dbfs}" style="width:52px"> dBFS</label><label>cable <input id="cb${k}" type="number" step="25" min="0" value="${c.cable}" style="width:64px"> m</label>
   <label><input id="vb${k}" type="checkbox" ${c.valid?'checked':''}> V bit set</label><span><button data-g="${k},7">40 ms dropout</button> <button data-g="${k},2">0.6 s conf.</button></span></div>`; }).join('')}
  <div style="display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;margin-top:4px"><b style="min-width:105px">Unit</b><label>version <select id="ver"><option value="110" ${D.version===110?'selected':''}>POD13/110 (XLR)</option><option value="75" ${D.version===75?'selected':''}>POD13/75 (BNC)</option></select></label>
  <label>firmware <select id="fw">${FW_ORDER.map(k=>`<option value="${k}" ${k===D.fw?'selected':''}>${k==='pd13'?'PD13 (1998)':k==='v100'?'V100 (1999)':'V101 (2004)'}</option>`).join('')}</select></label>
  <label>RC osc. <select id="fo">${[[1e6,'1 MHz'],[2e6,'2 MHz'],[4e6,'4 MHz'],[6.144e6,'6.144 MHz ("1.53MHZ" comment)']].map(([v,l])=>`<option value="${v}" ${v===D.fosc?'selected':''}>${l}</option>`).join('')}</select></label>
  <label><input id="wd" type="checkbox" ${D.wdt?'checked':''}> WDT fuse</label><label>RAM at power-up <select id="ri">${[0x07,0x00,0x03,0xFF].map(v=>`<option value="${v}" ${v===D.ramInit?'selected':''}>0x${hex(v)}</option>`).join('')}</select></label></div></div>
  <div class="small muted">Front: click the rocker, the LVL and EQ buttons. Rear: click an input to plug/unplug it. Keys: P power · 1/2 plug A/B · E/R EQ A/B · L/K LVL A/B. Settings marked RC osc., WDT and RAM are ${inf} (not recorded in the archive).</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if (!g('#fs0')) return;
  [0,1].forEach(k=>{ g('#fs'+k).onchange=e=>A.set(k,'fs',+e.target.value,`${NAMES[k]} source rate → ${e.target.value/1000} kHz`);
    g('#lv'+k).onchange=e=>A.set(k,'dbfs',Math.min(0,+e.target.value),`${NAMES[k]} tone → ${Math.min(0,+e.target.value)} dBFS`);
    g('#cb'+k).onchange=e=>A.set(k,'cable',Math.max(0,+e.target.value),`${NAMES[k]} cable → ${Math.max(0,+e.target.value)} m`);
    g('#vb'+k).onchange=e=>A.set(k,'valid',e.target.checked,`${NAMES[k]} source V bit → ${e.target.checked?1:0}`); });
  root.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ const [k,code]=b.dataset.g.split(',').map(Number); A.glitch(k, code===7?40:600, code); });
  g('#ver').onchange=e=>A.cfg('version',+e.target.value,`Version → POD13/${e.target.value}`);
  g('#fw').onchange=e=>A.fw(e.target.value);
  g('#fo').onchange=e=>A.cfg('fosc',+e.target.value,`RC oscillator → ${e.target.value/1e6} MHz`);
  g('#wd').onchange=e=>A.cfg('wdt',e.target.checked,`WDT fuse → ${e.target.checked?'on':'off'}`);
  g('#ri').onchange=e=>A.cfg('ramInit',+e.target.value,`Power-up RAM → 0x${hex(+e.target.value)}`); }
bindKeys('__pod13Active', ()=>({p:()=>A.power(),'1':()=>A.plug(0),'2':()=>A.plug(1),e:()=>A.eq(0),r:()=>A.eq(1),l:()=>A.lvl(0),k:()=>A.lvl(1)}));

/* =====================================================================
   6. Timeline
   ===================================================================== */
const PHASE_COL = { RESET:'#9a6cff', INIT:'#9a6cff', MAIN:'#d33a2c', DELVIS:'#8a8f94', DELAY:'#8a8f94', A_CHECK:'#1f7a4d', NEXT_A:'#1f7a4d', RST_ACN:'#1f7a4d', B_CHECK1:'#1f7a4d', B_CHECK:'#0d5c8c', NEXT_B:'#0d5c8c', RST_BCN:'#0d5c8c', MAIN1:'#0d5c8c' };
function segLane(label, h, segs){ return {label, h, draw(c,X,t0,t1,y,hh){ const s=segs(t0,t1); c.font='10px '+SIM.css('--mono');
  s.forEach(g=>{ const xa=Math.max(X(t0),X(g.a)), xb=Math.min(X(t1),X(g.b)); if (xb<xa) return; c.fillStyle=g.col; c.globalAlpha=g.alpha||.8; c.fillRect(xa,y+3,Math.max(1,xb-xa),hh-6); c.globalAlpha=1;
    if (xb-xa>c.measureText(g.txt||'').width+6){ c.fillStyle='#fff'; c.fillText(g.txt||'',xa+3,y+hh/2+4); } }); }}; }
function phaseSegs(t0,t1){ const T=trace(), out=[]; if (!T.hits.length) return out; let i=Math.max(0,bsearch(T.hits,cycAt(T,t0)));
  for (; i<T.hits.length; i++){ const h=T.hits[i], a=T.t0+h.c*T.tcy; if (a>t1) break; const b=i+1<T.hits.length? T.t0+T.hits[i+1].c*T.tcy : DUR; out.push({a,b,col:PHASE_COL[h.l]||'#777',txt:h.l}); if (out.length>4000) break; }
  return out; }
function codeSegs(k){ return (t0,t1)=>{ const out=[]; const N=400; let prev=null, a=t0; for (let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, cd=i<N?codeAt(k,t):-1; if (cd!==prev){ if (prev!=null) out.push({a,b:t,col:prev===7?'#c0392b':prev===0?'#2e8b57':prev===1?'#7a64c8':'#d08a2a',txt:CODES[prev]}); prev=cd; a=t; } } return out; }; }
function lanes(){
  const T=trace(), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), wn=SIM.css('--warn');
  const L=[
    {label:`PIC cycles (RC ${D.fosc/1e6} MHz ÷ 4)`, h:18, draw(c,X,t0,t1,y,h){ if (D.power) SIM.pulses(c,X,Math.max(t0,T.t0),t1,y,h,T.tcy,T.t0,T.tcy*0.4,a2,'instruction cycles'); }},
    segLane('PIC: running label', 24, phaseSegs),
    boolLane('SEL (RA1) → both CS8412', t=>{ const p=portsAt(t); return p && !((p.ta>>1)&1) && ((p.a>>1)&1); }, '#d33a2c', 16),
    {label:'E0/E1 reads (BTFSS PORTB)', h:20, draw(c,X,t0,t1,y,h){ const i0=Math.max(0,bsearch(T.reads,cycAt(T,t0))); c.font='9px '+SIM.css('--mono');
      for (let i=i0;i<T.reads.length;i++){ const r=T.reads[i], t=T.t0+r.c*T.tcy; if (t>t1) break; const x=X(t); c.fillStyle=r.v?'#d08a2a':'#2e8b57'; c.fillRect(x-1,y+3,3,h-6); if (X(t1)-X(t0) > 0 && (t1-t0)<2e-4) c.fillText(['E0-B','E1-B','E0-A','E1-A'][r.bit]+'='+r.v,x+3,y+12); } }},
  ];
  [0,1].forEach(k=>{ const AB=k?'B':'A';
    L.push(segLane(`${AB}: CS8412 E2E1E0`, 20, codeSegs(k)));
    L.push(boolLane(`${AB} LOCK LED (RA${k?2:3}=1)`, t=>lockLED(k,t)===1, '#3fbf5f', 16));
    L.push(boolLane(`${AB} NO LOCK LED (RA${k?2:3}=0)`, t=>lockLED(k,t)===0, '#e3453a', 16));
    L.push(boolLane(`${AB} NO LOCK tally (RB${k?7:4})`, t=>tally(k?'bnl':'anl',t)===1, '#b3261e', 14));
    L.push(boolLane(`${AB} CONF tally (RB${k?6:5})`, t=>tally(k?'bcf':'acf',t)===1, '#d08a2a', 14));
    L.push({label:`${AB}CON_CNT (RAM 0x${k?'0A':'09'})`, h:18, draw(c,X,t0,t1,y,h){ const i0=Math.max(0,bsearch(T.cnt,cycAt(T,t0))); c.font='10px '+SIM.css('--mono'); c.fillStyle=SIM.css('--ink');
      let lastX=-99; for (let i=i0;i<T.cnt.length;i++){ const e=T.cnt[i], t=Math.max(t0,T.t0+e.c*T.tcy); if (t>t1) break; const x=X(t); if (x-lastX>22){ c.fillText(String(k?e.b:e.a),x+2,y+13); lastX=x; } c.fillRect(x,y+2,1,h-4); } }});
  });
  const c0=D.conv[0];
  L.push({label:`A: AES3 frames (${c0.fs/1000}k)`, h:18, draw(c,X,t0,t1,y,h){ if (c0.plug) SIM.pulses(c,X,t0,t1,y,h,1/c0.fs,0,0.2/c0.fs,a2,'frames'); }});
  L.push(waveLane('A LEFT out (V diff.)', t=>analog(0,0,t), acc, 36, c0.f));
  if (T.resets.length) L.push({label:'WDT resets', h:18, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--bad'); T.resets.forEach(r=>{ const x=X(T.t0+r.c*T.tcy); c.fillRect(x-1,y+2,3,h-4); }); }});
  return L; }

/* =====================================================================
   7. Views
   ===================================================================== */
function nowHTML(t){ const cpu=cpuAt(t), T=trace();
  const rows=[0,1].map(k=>{ const l=levels(k,0), L=lockLED(k,t); return `<tr><th>${NAMES[k]}</th><td class="mono">${CODES[codeAt(k,t)]}</td><td class="mono">${L==null?'LEDs off':L?'LOCK':'NO LOCK'}</td><td class="mono">${locked(k,t)?fdb(outDbu(k,0))+' dBu':'muted'}${l.clip?' <b style="color:var(--bad)">CLIP</b>':''}</td></tr>`; }).join('');
  return `<table class="kv"><tr><th></th><th>CS8412 code now</th><th>Front LED</th><th>L out</th></tr>${rows}</table>
   <table class="kv" style="margin-top:6px"><tr><th>PIC at playhead</th><td class="mono">${cpu?`PC 0x${hex(cpu.pc,3)} ${esc(T.prog.labels[cpu.pc]||'')} · ${disasm(T.prog.mem[cpu.pc]??0xFFF,{5:'PORTA',6:'PORTB',7:'DELAY1',8:'DELAY2',9:'ACON_CNT',10:'BCON_CNT'})} · W=0x${hex(cpu.w)}`:'not running'}</td></tr>
   <tr><th>RAM</th><td class="mono">${cpu?`DELAY1=${cpu.f[7]} DELAY2=${cpu.f[8]} ACON_CNT=${cpu.f[9]} BCON_CNT=${cpu.f[10]}`:'—'}</td></tr>
   <tr><th>Rear tallies</th><td class="mono">A NO LOCK ${tally('anl',t)?'ON':'off'} · A CONF ${tally('acf',t)?'ON':'off'} · B NO LOCK ${tally('bnl',t)?'ON':'off'} · B CONF ${tally('bcf',t)?'ON':'off'}</td></tr>
   <tr><th>Main loop</th><td class="mono">${passes().length} passes in ${DUR} s · one pass ≈ ${SIM.fmtDur(passPeriod())}${T.resets.length?` · <b style="color:var(--bad)">${T.resets.length} WDT reset(s)</b>`:''}</td></tr></table>`; }
function nextRead(){ const T=trace(); const c=cycAt(T,SIM.t); const r=T.reads.find(x=>x.c>c+2); if (r) SIM.seek(T.t0+r.c*T.tcy - 3e-6); }
function viewSim(m){
  window.__pod13Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead',`<div id="fp"></div>`)}${card('Rear panel — click an input to plug/unplug; CTL pins light while the open-collector tally is on',`<div id="rp"></div><div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART13,'POD13 - #SILK/OBSOLETE/POD13SLK.CDR')} (Feb 16 1998: front WHITE, rear WHITE and front GREEN plates, vector); the PODS logo, green bars and tagline are taken from ${SIM.src(ART13A,'POD13A-FRONT&REAR-SILK (CURVE).cdr')} because POD13SLK sets them in live Hobo/Arial text, which libcdr cannot place. All lettering is re-set from the CDR text objects.</div>${controlsHTML()}`)}</div>
    <div>${card('What the firmware did (last action)',`<div id="trace" class="log"></div>`)}${card('State at the playhead',`<div id="now"></div><div style="margin-top:6px"><button id="nr">Jump to the next E0/E1 read</button> <button id="z1">Zoom to 50 µs</button></div>`)}</div></div>
    ${card(`Timeline — ${DUR} seconds (the PIC's main loop is slow: each pass spends ≈ 65 000 loops in DELAY). Zoom to 50 µs around a red MAIN mark to see single instructions.`,`<canvas id="tl"></canvas>`)}
    <div class="grid2">${card('Scope: converter A input at the playhead (one AES3 frame, biphase-mark)',`<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}${card('Level through every stage (left channels)',`<div id="lv"></div>`)}</div>
    ${card('Action log',`<div id="log" class="log"></div>`)}`;
  m.querySelector('#nr').onclick=nextRead;
  m.querySelector('#z1').onclick=()=>{ const zs=document.querySelector('#zoomSel'); const o=[...zs.options].findIndex(x=>+x.value===0.00005); if (o>=0){ zs.selectedIndex=o; SIM.win=0.00005; } SIM.refresh(); };
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Plug or unplug an input, press EQ or LVL, or change the source.');
    m.querySelector('#now').innerHTML=nowHTML(t);
    m.querySelector('#lv').innerHTML=[0,1].map(k=>`<h3>${NAMES[k]} LEFT</h3>${stageTable(levels(k,0).stages)}`).join('');
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200});
    const c=D.conv[0], n=Math.floor(t*c.fs), fr=n%192, s=sample(0,t);
    if (c.plug){ const sa=aesSubframe(s, fr===0?'Z':'X', fr, c.fs, c.valid), sb=aesSubframe(s,'Y',fr,c.fs,c.valid);
      drawAesScope(m.querySelector('#scope'), sa, sb, c.fs, eyeV(0)/(D.version===110?K.vSrc110:K.vSrc75), `frame ${n.toLocaleString()} (${fr}/191) ·`);
      m.querySelector('#bits').innerHTML=`A = ${s.toFixed(5)} → 24-bit 0x${hex(sa.raw,6)}; the CS4329 keeps the top 20 bits (0x${hex(sa.raw>>4,5)}) · V=${sa.bits[28]} C=${sa.bits[30]} P=${sa.bits[31]} · eye ${eyeV(0).toFixed(3)} V p-p<br><span class="muted">The CS8412 turns V=1 into error code 001, which the PIC reads on E0.</span>`; }
    else { SIM.canvas(m.querySelector('#scope'),150); m.querySelector('#bits').textContent='Nothing connected to converter A.'; } };
  bindControls(m); SIM.on('time',draw);
}
const LESSONS=[
  {title:'Meet the POD13', body:`<p>From the manual (1999): “POD 13 is a dual AES/EBU digital to analog audio converter. This unit is available in both 75 Ω and 110 Ω versions. POD 13's reclocking circuitry and selectable cable equalization ensures that the incoming digital audio signal is recovered reliably, even when relatively long cable runs are involved.”</p><p>Each converter has an operating-level button (<b>LVL</b>), an <b>EQ</b> button with its LED, and <b>LOCK</b>/<b>NO LOCK</b> tallies. The rear has the AES inputs, the analog outputs and the open-collector NO LOCK and CONFIDENCE tallies on Phoenix terminals.</p>`, check:()=>true, auto:true},
  {title:'1 · Power and lock', body:`<p>Switch on with the rocker. The PIC starts with both <b>NO LOCK</b> LEDs red (INIT clears PORTA), then the first pass of the main loop turns them green. Scrub the timeline: the LEDs change only when the code reaches A_CHECK and B_CHECK.</p>`, check:()=>D.power&&lockLED(0,DUR-0.01)===1&&lockLED(1,DUR-0.01)===1, hint:'Power on; both sources plugged in.'},
  {title:'2 · Operating level', body:`<p>The front-panel legend reads <b>0dBFS = 24dBu</b> (button out) and <b>18dBu</b> (button in). Press converter A's <b>LVL</b> button and send <b>0 dBFS</b>: the output should read +18 dBu.</p>`, check:()=>D.conv[0].lvlIn&&D.conv[0].dbfs===0&&Math.abs(levels(0,0).out-18)<0.6, hint:'Press A LVL; type 0 into converter A level.'},
  {title:'3 · A long cable', body:`<p>The manual: without the equalizer the 110 Ω version reaches 250 m; with it, 600 m. Set converter A's cable to <b>400 m</b>. Converter A shows NO LOCK. Then press <b>EQ</b> on converter A: its LED lights and LOCK comes back.</p>`, check:()=>D.version===110&&D.conv[0].cable>=400&&D.conv[0].cable<=560&&D.conv[0].eq&&lockLED(0,DUR-0.01)===1, hint:'Cable 400 m, then click A EQ.'},
  {title:'4 · The confidence tally', body:`<p>When the eye is closing, the CS8412 reports <b>010</b> (confidence). The firmware counts it down in <span class="mono">ACON_CNT</span> and closes the rear <b>A CONF</b> tally only after <b>7 passes in a row</b>. Set EQ off and cable to <b>235 m</b>. Watch ACON_CNT in the timeline, and the CONF pin on the rear terminal.</p>`, check:()=>tally('acf',DUR-0.01)===1, hint:'EQ off, cable 235 m (or set the RC oscillator to 6.144 MHz to get more passes into the 3 s).'},
  {title:'5 · The validity bit (why V101 exists)', body:`<p>Tick <b>V bit set</b> on converter B. The CS8412 now reports 001. Select firmware <b>V100</b>: B_CHECK loops on itself as long as the flag stays set, so converter A is never checked again. Then select <b>V101</b> (2004, “disregard the validity bit”): B shows LOCK again.</p>`, check:()=>D.conv[1].valid&&D.fw==='v101'&&lockLED(1,DUR-0.01)===1, hint:'Tick B “V bit set”, try V100, then select V101.'},
  {title:'6 · The 75 Ω version', body:`<p>Switch the unit to <b>POD13/75</b>. The rear gets BNC inputs and the reach is 600 m without EQ and 1500 m with it. Set converter B's cable to <b>1200 m</b> and turn on B's EQ.</p>`, check:()=>D.version===75&&D.conv[1].cable>=1200&&D.conv[1].eq&&lockLED(1,DUR-0.01)===1, hint:'Version POD13/75, B cable 1200, B EQ on.'},
  {title:'Done', body:`<p>The <b>Software</b> tab runs the listing with the program counter at the playhead. The <b>Findings</b> tab lists what the code and files reveal.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod13Active=true; tutorialView(m,{title:'Tutorial — from the POD13 manual',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(DUR-0.01)}<div style="margin-top:8px">${rearSVG(DUR-0.01)}</div>${controlsHTML()}<div class="small muted">Panels show the state at the end of the ${DUR}-second run.</div><div>${[0,1].map(k=>`<span class="chip mono">${NAMES[k]} ${ledName(lockLED(k,DUR-0.01))} · ${levels(k,0).lock?fdb(levels(k,0).out)+' dBu':'muted'} · ${k?'B':'A'}CON_CNT ${(cntAt(DUR-0.01)||{a:'—',b:'—'})[k?'b':'a']}</span>`).join('')}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){
  window.__pod13Active=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the PIC and the receivers at the playhead',`<div id="dev"></div>`)}${card('As seen on the front panel',`<div id="fp"></div>`)}</div>${card('Zoom ladder — converter A LEFT output',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, c=D.conv[0], T=trace(), s0=Math.floor(t), inSec=x=>x>=s0&&x<s0+1;
    const nPass=passes().filter(inSec).length, nRead=T.reads.filter(r=>inSec(T.t0+r.c*T.tcy)).length, nPort=T.ports.filter(p=>inSec(T.t0+p.c*T.tcy)).length;
    const rows=[['AES3 frames (samples per channel)',c.fs.toLocaleString(),SIM.fmtDur(1/c.fs),'CS8412 (U2) recovers clock and data'],['AES3 bit cells',(128*c.fs).toLocaleString(),SIM.fmtDur(1/(128*c.fs)),'biphase-mark through the AES transformer'],
      ['AES3 blocks (Z preamble)',(c.fs/192).toFixed(1),SIM.fmtDur(192/c.fs),'channel status, 192 frames'],['CS4329 output samples',(c.fs*128).toLocaleString(),SIM.fmtDur(1/(128*c.fs)),'128× oversampling delta-sigma ('+inf+', data sheet)'],
      ['PIC instruction cycles',(D.fosc/4).toLocaleString(),SIM.fmtDur(4/D.fosc),`RC oscillator ${D.fosc/1e6} MHz (${inf})`],
      ['Main-loop passes (this second)',String(nPass),SIM.fmtDur(passPeriod()),'SEL pulse, DELVIS, A_CHECK, B_CHECK'],['E0/E1 reads (this second)',String(nRead),'—','BTFSS PORTB,0…3'],['Port writes that changed a pin (this second)',String(nPort),'—','LEDs on RA2/RA3, tallies on RB4–RB7'],
      ['Tone cycles',c.f.toLocaleString(),SIM.fmtDur(1/c.f),`${(c.fs/c.f).toFixed(1)} samples per cycle`]];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const n=Math.floor(t*c.fs), lb=labelAt(t);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr><tr><th>PIC is in</th><td class="mono">${lb?lb.l:'(not running)'}</td></tr><tr><th>Conv. A frame</th><td class="mono">${n.toLocaleString()} · block ${Math.floor(n/192)} · frame ${n%192}/191</td></tr><tr><th>Sample</th><td class="mono">${sample(0,t).toFixed(5)} FS</td></tr><tr><th>Analog out A L</th><td class="mono">${analog(0,0,t).toFixed(4)} V</td></tr></table>${nowHTML(t)}`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    drawLadder(m.querySelector('#zl'),t,[['1 main-loop pass',Math.min(DUR,passPeriod())],['100 ms',0.1],['1 block',192/c.fs],['1 tone cycle',1/c.f],['8 frames',8/c.fs]],tt=>analog(0,0,tt),'volts'); };
  SIM.on('time',draw);
}
const BLOCKS={
  in:{x:20,y:30,w:170,h:80,t:'AES inputs ×2',s:['XLR-3F (110 Ω) or BNC (75 Ω)','75R/110R termination','AES transformers T2/T3'],d:'Rear XLR-A/XLR-B (PCB patterns XLR3F) with a 75R or 110R termination (DSN value “75R/110R”) and an AES pulse transformer (pattern AESXFMR) per input. The 75 Ω build uses BNCs (manual).'},
  eq:{x:20,y:140,w:170,h:80,t:'Cable EQ ×2',s:['EQ button SW1/SW4','EQ-ON LED','U1/U8 DIP-8'],d:'The EQ button switches an equalizing amplifier into the path (functional diagram “EQ INSERT”, nets AEQ-IN/BEQ-IN, LEDs AEQ-ON/BEQ-ON). The DSN library holds an OPA650 wide-band op-amp; that it is this amplifier is inferred. Reach: 110 Ω 250 → 600 m, 75 Ω 600 → 1500 m.'},
  rx:{x:250,y:30,w:170,h:90,t:'CS8412 ×2',s:['U2 / U9, DIP-28','E0/E1 → PIC, SEL ← PIC','MCK, SCK, FSYNC, SDATA'],d:'Crystal CS8412 AES/EBU receivers. With SEL low, pins C/E0, CA/E1, CB/E2 carry the error code; the PIC reads only E0 and E1 (nets E0-A, E1-A, E0-B, E1-B). Data and clocks go straight to the DAC.'},
  dac:{x:250,y:150,w:170,h:80,t:'CS4329 ×2',s:['U3 / U10, DIP-20','20-bit stereo DAC','DIF0–2, DEM0/1, AUTOM'],d:'Crystal CS4329 20-bit delta-sigma DACs, configured by strap pins (DIF, DEM, AUTOM in the DSN). The lowest 4 bits of a 24-bit AES word are dropped.'},
  mcu:{x:250,y:270,w:170,h:90,t:'PIC16C54A (U15)',s:['RC oscillator, OTP','PD13V101 (2004)','RB0–3 in · RA1–3, RB4–7 out'],d:'Polls the two receivers once per main-loop pass, drives the LOCK/NO LOCK LED pairs (RA3 = A, RA2 = B) and four open-collector tallies (RB4–RB7 through 2N3904s Q1–Q4). It does not touch the audio, the EQ or the LVL buttons.'},
  ana:{x:480,y:30,w:190,h:110,t:'Analog out ×4',s:['LF353 filter + balanced driver','74HC4053 LVL gain (U16/U17)','trims A-L, A-R, B-L, B-R','2 × 30R build-out'],d:'0 dBFS = +24 dBu (LVL out) or +18 dBu (LVL in); 60 Ω balanced output; ±0.5 dB 20 Hz–20 kHz; noise better than −82 dBu (manual).'},
  out:{x:480,y:170,w:190,h:60,t:'Rear Phoenix TB1–TB6',s:['A L, A R, A CTL · B L, B R, B CTL'],d:'Six 3-pin terminal blocks in one punched slot (POD13RER: 0.426 × 2.550 in). Each CTL block carries NO LOCK and CONFIDENCE (rear silk).'},
  tal:{x:480,y:260,w:190,h:80,t:'Tallies Q1–Q4',s:['2N3904 open collector','10 Ω, 30 V, 60 mA max'],d:'Manual: “O.C. Outputs 10 Ω, 30 V, 60 mA MAX”. The PIC sets RB4 (A NO LOCK), RB5 (A CONF), RB6 (B CONF), RB7 (B NO LOCK) in V100/V101.'},
  psu:{x:20,y:270,w:170,h:90,t:'Power',s:['T1 toroid, bridge R1','LM317/LM337, 7805/7905','LM2931AT-5.0'],d:'115 VAC 60 Hz, 12 VA (230 VAC on request), fuse 1/2 A slow-blow (rear silk). Regulators from the DSN library list.'},
};
const WIRES=[['in','eq','AES'],['eq','rx',''],['rx','dac','I²S-style serial'],['dac','ana','audio'],['ana','out',''],['rx','mcu','E0, E1'],['mcu','rx','SEL'],['mcu','tal','RB4–7'],['tal','out','CTL'],['psu','mcu','']];
function viewBlock(m){ window.__pod13Active=false; blockView(m,BLOCKS,WIRES,'mcu',[700,380],card('In one sentence',`<p>Each converter receives AES/EBU on XLR or BNC, optionally through a cable equalizer, decodes it in a CS8412 and converts it in a CS4329. A switched-gain LF353 stage then drives a 60 Ω balanced Phoenix output. A PIC16C54A only watches the receivers' error pins and lights the tallies.</p>`)); }
const SHEETS=[
  {name:'1 · PIC16C54A and tallies', note:'Pin names from the DSN symbol (RA0–RA3, RB0–RB7, OSC1/OSC2, RTCC, M̅C̅L̅R̅) and net names E0-A, E1-A, E0-B, E1-B, SEL, LOCKA/NO-LOCKA, LOCKB/NO-LOCKB, A CONF, B CONF, A NO LOCK, B NO LOCK. Which RB pin drives which transistor comes from the V100/V101 comments; the transistor-to-terminal order and the LED drive are inferred.', svg:()=>
    chip(330,70,150,'U15 PIC16C54A',[['RB0','E0-B'],['RB1','E1-B'],['RB2','E0-A'],['RB3','E1-A'],['OSC1','R/C'],['M̅C̅L̅R̅','+5V'],['RTCC','GND']],[['RA0','n.c.'],['RA1','SEL'],['RA2','LOCKB/NO-LOCKB'],['RA3','LOCKA/NO-LOCKA'],['RB4','Q1 A NO LOCK'],['RB5','Q2 A CONF'],['RB6','Q3 B CONF'],['RB7','Q4 B NO LOCK']],'18-pin OTP, RC oscillator')
    +npn(640,330,'Q1–Q4 2N3904')+res(560,330,624,330,'R','')+res(648,280,648,250,'10R','')+net(652,240,'TB3/TB6 CTL pin')+gnd(648,354)
    +txt(40,400,'RA3/RA2 high = green LOCK, low = red NO LOCK (code comments: “SET A LOCK LED” / “SET A NO LOCK LED”). INIT makes RB0–RB3 inputs (TRIS PORTB = 0x0F).',11,'var(--ink2)')
    +txt(40,420,'O.C. outputs: 10 Ω, 30 V, 60 mA max (manual). OSC1 R/C values are not readable from the binary DSN ('+'inferred'+').',11,'var(--ink2)')},
  {name:'2 · Converter A digital path', note:'Pin names from the CS8412 and CS4329 symbols in POD13-3.DSN (RXP, SEL, C/E0, CA/E1, CB/E2, CC/F0, CD/F1, CE/F2, MCK, SCK, FSYNC, SDATA, ERF; MCLK, SCLK, LRCLK, SDATA, DIF0–2, DEMO0/1, AUTOM). Connections between them are inferred from the part functions.', svg:()=>
    chip(80,80,110,'XLR-A / BNC',[['1','GND'],['2','+'],['3','−']],[['','75R/110R']],'rear')
    +chip(290,80,110,'T2 AESXFMR',[['P','in'],['',' ']],[['S','→ EQ']],'')
    +chip(290,230,110,'U1 (EQ amp)',[['IN','T2'],['SW1','AEQ-IN']],[['OUT','RXP']],'OPA650 '+'(inferred)')
    +chip(520,60,130,'U2 CS8412',[['RXP/RXN','EQ/T2'],['SEL','PIC RA1'],['MCK','→U3'],['SCK','→U3']],[['C/E0','E0-A'],['CA/E1','E1-A'],['CB/E2','n.c.'],['FSYNC','→U3'],['SDATA','→U3'],['ERF','mute?']],'AES receiver')
    +chip(520,300,130,'U3 CS4329',[['MCLK','MCK'],['SCLK','SCK'],['LRCLK','FSYNC'],['SDATA','SDATA']],[['AOUTL','→ LF353'],['AOUTR','→ LF353'],['DIF0–2','strap'],['AUTOM','strap']],'20-bit DAC')},
  {name:'3 · Analog output (one channel)', note:'Values that appear in the DSN: 4K75, 30K1, 15K0, 10K0, 2K87, 1K62, 221R, 30R, 620R, 270p, 220p, 1000p, 0.047; parts LF353, 74HC4053, POT (trims). The 30R build-out pair matches the manual\'s 60 Ω balanced output; the other values\' positions are inferred.', svg:()=>
    chip(70,130,110,'U3 CS4329',[['',' ']],[['AOUTL','']],'DAC')
    +opamp(270,160,'LF353 filter')+res(210,148,270,148,'',' ')+txt(230,210,'2K87 / 1K62 / 220p ('+'inferred'+')',10,'var(--ink2)')
    +chip(420,110,120,'U17 74HC4053',[['X0/X1','gain R'],['A','ALVL-L']],[['X','→ driver']],'LVL: +24 / +18 dBu')
    +res(480,260,480,320,'SW2','LVL button')+opamp(620,120,'LF353 driver')+opamp(620,250,'LF353 inverter')
    +res(680,120,760,120,'30R','')+res(680,250,760,250,'30R','')+net(765,120,'A L+ (TB1)')+net(765,250,'A L− (TB1)')+txt(600,340,'A-L trim (POT)',11)
    +txt(60,420,'0 dBFS → +24 dBu (LVL out) · +18 dBu (LVL in) · clips near +25.6 dBu on ±12 V ('+'inferred'+')',12)},
  {name:'4 · Power', note:'Parts from the DSN library and placements: T1 (TOROID), R1 BRIDGE, 2200/25 and 470/25 reservoirs, LM317 + LM337 (±12 V: nets “+12”, “-12”), MC7805/MC7905, LM2931AT-5.0, 1N4003. Rail assignments are inferred.', svg:()=>
    chip(70,120,110,'T1 toroid',[['AC IN 1','LINE'],['AC IN 2','NEUTRAL']],[['sec','→ R1']],'115 V, 1/2 A S.B. fuse')
    +chip(260,120,100,'R1 bridge',[['~','T1'],['~','T1']],[['+','2200/25'],['−','2200/25']],'')
    +chip(450,60,120,'LM317',[['IN','+raw']],[['OUT','+12']],'')+chip(450,160,120,'LM337',[['IN','−raw']],[['OUT','−12']],'')
    +chip(450,260,120,'MC7805 / MC7905',[['IN','±raw']],[['OUT','±5 V analog']],'')+chip(450,360,120,'LM2931AT-5.0',[['IN','+raw']],[['OUT','+5 V (PIC, CS8412)']],'low-dropout')},
];
function viewSchem(m){ window.__pod13Active=false; schemView(m,SHEETS,'POD13','The design files are the OrCAD Capture schematic POD13-3.DSN (binary, “ISS 3 PCB”, Feb 26 1999; parts and labels recovered from its strings) and the Tango layout POD13.PCB (component placements, no values). The firmware fixes the PIC pin functions exactly.'); }

/* ---- Software tab ---- */
function listingHTML(P, pc, hitLines){
  const lineAddr={}; Object.keys(P.lineOf).forEach(a=>lineAddr[P.lineOf[a]]=+a);
  const cur=P.lineOf[pc];
  return P.rows.map(r=>{ const a=lineAddr[r.n]; const hot=r.n===cur; const seen=hitLines&&hitLines.has(r.n);
    return `<div class="${hot?'hl':''}" ${hot?'id="pcline"':''} style="white-space:pre;${seen&&!hot?'border-left:3px solid var(--accent);':'border-left:3px solid transparent;'}"><span class="muted">${String(r.n).padStart(3,' ')} ${a!=null?hex(a,3)+' '+hex(P.mem[a],3):'        '}</span> ${esc(r.raw.replace(/\t/g,'    ').replace(/\r/g,''))}</div>`; }).join('');
}
function stateSVG(k, f){
  const code=steadyCode(k), e0=code&1, e1=(code>>1)&1, hot= e0&&e1?'nl': !e0? (e1?'cf':'ok') : 'v';
  const box=(x,y,w,id,t,s)=>`<g><rect x="${x}" y="${y}" width="${w}" height="54" rx="8" fill="${hot===id?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+8}" y="${y+20}" font-size="12" font-weight="700" fill="${hot===id?'#fff':'var(--ink)'}">${t}</text><text x="${x+8}" y="${y+38}" font-size="10.5" fill="${hot===id?'#eef':'var(--ink2)'}">${s}</text></g>`;
  const A=k===0, cnt=A?'ACON_CNT':'BCON_CNT';
  return `<svg viewBox="0 0 640 230" style="width:100%"><text x="10" y="18" font-size="12" fill="var(--ink)">${A?'A_CHECK':'B_CHECK'}: read E0 (RB${A?2:0}) then E1 (RB${A?3:1}) — now E1E0 = ${e1}${e0}</text>
    ${box(10,40,300,'nl','E0=1, E1=1 → NO LOCK',`LED red, NO LOCK tally on, CONF off, ${cnt}=7`)}
    ${box(330,40,300,'v','E0=1, E1=0 → validity bit',f==='v101'?`${A?'B_CHECK1':'MAIN1'}: LED green, both tallies off`:A?'GOTO B_CHECK: nothing updated (bug)':'GOTO B_CHECK: spins here (bug)')}
    ${box(10,120,300,'ok','E0=0, E1=0 → locked, OK',`LED green, NO LOCK off; RST_${A?'A':'B'}CN: CONF off, ${cnt}=7`)}
    ${box(330,120,300,'cf','E0=0, E1=1 → locked, confidence',`LED green; DECFSZ ${cnt}; at 0 → CONF tally on, reload 7`)}
    <text x="10" y="210" font-size="11" fill="var(--ink2)">E2 is never read: 011 (slipped sample) counts as NO LOCK, 101 (parity) as validity, 110 (bi-phase) as confidence (${'inferred'}, CS8412 data sheet).</text></svg>`;
}
function viewSoft(m){
  window.__pod13Active=true; let k=0;
  m.innerHTML=`<div class="grid2"><div>${card('The listing, running (program counter at the playhead)',`<div class="small" style="margin-bottom:6px">Firmware <select id="fw2">${FW_ORDER.map(x=>`<option value="${x}" ${x===D.fw?'selected':''}>${FW_NAME[x]}</option>`).join('')}</select> <button id="nr2">Next E0/E1 read</button> <button id="st">Step 1 instruction</button></div><div id="lst" class="log" style="max-height:520px"></div><div id="warn" class="small muted"></div>`)}</div>
    <div>${card('Decision per converter (live)',`<div><button id="ka" class="on">Converter A</button> <button id="kb">Converter B</button></div><div id="sm"></div>`)}${card('Port map (live)',`<div id="pm"></div>`)}${card('CS8412 error code (E2 E1 E0) as the firmware sees it',`<div id="ct"></div>`)}</div></div>
    <div class="grid2">${card('Main-loop timing (cycle-counted on the emulator)',`<div id="tm"></div>`)}${card('Assembled here vs. the .BKX hex backups',`<div id="bk"></div>`)}</div>`;
  m.querySelector('#fw2').onchange=e=>A.fw(e.target.value);
  m.querySelector('#nr2').onclick=nextRead;
  m.querySelector('#st').onclick=()=>{ const T=trace(); SIM.seek(SIM.t+T.tcy*1.0001); };
  m.querySelector('#ka').onclick=()=>{ k=0; m.querySelector('#ka').classList.add('on'); m.querySelector('#kb').classList.remove('on'); SIM.refresh(); };
  m.querySelector('#kb').onclick=()=>{ k=1; m.querySelector('#kb').classList.add('on'); m.querySelector('#ka').classList.remove('on'); SIM.refresh(); };
  let lastPC=-1, lastFw='';
  const draw=()=>{ const t=SIM.t, T=trace(), P=T.prog, cpu=cpuAt(t);
    const s0=cycAt(T,t)-Math.round(0.4/T.tcy), seen=new Set(T.hits.filter(h=>h.c>=s0&&h.c<=cycAt(T,t)).map(h=>P.lineOf[h.pc]));
    if (!cpu || cpu.pc!==lastPC || lastFw!==D.fw){ const box=m.querySelector('#lst'), st=box.scrollTop; box.innerHTML=listingHTML(P, cpu?cpu.pc:-1, seen); lastPC=cpu?cpu.pc:-1; lastFw=D.fw; const pl=box.querySelector('#pcline'); if (pl) box.scrollTop=Math.max(0,pl.offsetTop-box.offsetTop-160); else box.scrollTop=st; }
    m.querySelector('#warn').innerHTML=(P.warnings.length?P.warnings.map(esc).join('<br>'):'Assembles without warnings.')+(cpu?'':'<br>The PIC is not running at the playhead (power off or within the reset timer).');
    m.querySelector('#sm').innerHTML=stateSVG(k, D.fw);
    const p=portsAt(t); const bit=(v,i)=>(v>>i)&1;
    const rowsA=[['RA0','—','n.c.'],['RA1','SEL','→ CS8412 ×2'],['RA2','B LOCK/NO LOCK','1 = green'],['RA3','A LOCK/NO LOCK','1 = green']];
    const rowsB=[['RB0','E0-B','in'],['RB1','E1-B','in'],['RB2','E0-A','in'],['RB3','E1-A','in'],['RB4','A NO LOCK tally','Q, O.C.'],['RB5','A CONF tally','Q, O.C.'],['RB6','B CONF tally','Q, O.C.'],['RB7','B NO LOCK tally','Q, O.C.']];
    const inb=cpu? inputsB(t,cpu):0;
    m.querySelector('#pm').innerHTML=`<table class="kv"><tr><th>Pin</th><th>Net</th><th>Dir</th><th>Now</th></tr>${rowsA.map((r,i)=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${p&&!bit(p.ta,i)?'out':'in'}</td><td class="mono">${p?bit(p.a,i):'—'}</td></tr>`).join('')}${rowsB.map((r,i)=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${p&&!bit(p.tb,i)?'out':'in'}</td><td class="mono">${p?(i<4?bit(inb,i):bit(p.b,i)):'—'}</td></tr>`).join('')}</table>
      <p class="small muted">${D.fw==='pd13'?'PD13.ASM sets RB5 for A NO LOCK and RB4 for A CONF (and RB6/RB7 swapped for B): on the ISS 3 board its tallies come out on the wrong pins.':'V100 and V101 use this mapping.'}</p>`;
    const cur=[codeAt(0,t),codeAt(1,t)];
    m.querySelector('#ct').innerHTML=`<table class="kv"><tr><th>E2E1E0</th><th>CS8412 meaning (${inf})</th><th>E1E0 read</th><th>Firmware action</th></tr>${CODES.map((c,i)=>{ const e=i&3; const actn=e===3?'NO LOCK':e===0?'LOCK, clear CONF':e===2?'LOCK, count CONF':(D.fw==='v101'?'LOCK (validity ignored)':'skip / spin'); return `<tr class="${cur.includes(i)?'hl':''}"><td class="mono">${(i>>2)&1}${(i>>1)&1}${i&1}</td><td>${c.slice(4)}</td><td class="mono">${(e>>1)&1}${e&1}</td><td>${actn}</td></tr>`; }).join('')}</table>`;
    const pp=passPeriod(); const dly=255*(255*4)+255*4;
    m.querySelector('#tm').innerHTML=`<table class="kv"><tr><th>Instruction cycle</th><td class="mono">${SIM.fmtDur(T.tcy)} (Fosc ${D.fosc/1e6} MHz RC, ${inf})</td></tr>
      <tr><th>DELAY inner loop</th><td class="mono">CLRWDT · DECFSZ · GOTO = 4 cycles × 255 = 1020 cycles</td></tr><tr><th>DELVIS (DELAY2 = 255)</th><td class="mono">≈ ${dly.toLocaleString()} cycles = ${SIM.fmtDur(dly*T.tcy)}</td></tr>
      <tr><th>One pass of MAIN (measured)</th><td class="mono">${SIM.fmtDur(pp)} → ${(1/pp).toFixed(2)} LED updates per second</td></tr>
      <tr><th>CONF tally delay</th><td class="mono">7 passes ≈ ${SIM.fmtDur(7*pp)}</td></tr>
      <tr><th>The comment</th><td class="small">“DELAY=:: DELAY1(255*1/1.53MHZ*2 * DELAY2) … DELAY2 = 15 FOR RELAY PULSE(5mS)”: a shared WBS boilerplate written for a 1.536 MHz instruction rate and a relay product. POD13 has no relay and an RC clock.</td></tr></table>`;
    m.querySelector('#bk').innerHTML=`<table class="kv"><tr><th>Backup</th><th>vs. source</th><th>words</th><th>differences</th></tr>${bkxCompare().map(r=>`<tr class="${r.diff===0?'hl':''}"><td class="mono">${r.bkx}</td><td>${FW_NAME[r.fw]}</td><td class="mono">${r.words}</td><td class="mono">${r.diff===0?'identical':r.diff}</td></tr>`).join('')}</table><p class="small">The .BKX files are MPLAB hex backups. Neither holds the 2004 V101 build, and the file named <span class="mono">PD13V101.BKX</span> is an image of the 1998 <span class="mono">PD13.ASM</span>.</p>`;
  };
  SIM.on('time',draw);
}
function viewNotes(m){ window.__pod13Active=false;
  const bk=bkxCompare(); const same=(b,f)=>bk.find(r=>r.bkx.startsWith(b)&&r.fw===f).diff===0;
  m.innerHTML=card('What the POD13 archive shows — findings',`<ol>
   <li><b>V100 can hang on a validity bit.</b> In <span class="mono">PD13V100.ASM</span> (and <span class="mono">PD13.ASM</span>) the B check reads <span class="mono">BTFSS PORTB,1 / GOTO B_CHECK</span>: when converter B's CS8412 reports 001 (validity), the code jumps back to <span class="mono">B_CHECK</span> and spins there. Converter A is never checked again, SEL is not pulsed and <span class="mono">CLRWDT</span> is not executed. With the WDT fuse on, that becomes a reset every ≈ 2.3 s (${inf}). For converter A the same case jumps straight to <span class="mono">B_CHECK</span>, so A's LED keeps its last state. After power-up that state is red NO LOCK (INIT clears PORTA), so a source that sets V = 1 never shows LOCK. <span class="mono">pd13v101.asm</span> (Sep 23 2004) adds <span class="mono">B_CHECK1</span> and <span class="mono">MAIN1</span> to treat “validity only” as locked. This matches the software listing entry “POD13V101 … DISREGARD THE VALIDITY BIT”.</li>
   <li><b>The confidence counters are never initialised.</b> <span class="mono">INIT</span> sets only TRIS and the ports. <span class="mono">ACON_CNT</span>/<span class="mono">BCON_CNT</span> start with whatever the RAM powers up holding, so the first CONF alarm can take from 1 to 256 passes (try “RAM at power-up 0x00”). After that the counters are reloaded with 7.</li>
   <li><b>The firmware ignores E2.</b> Only E0 and E1 are wired to the PIC (RB0–RB3). Per the CS8412 data sheet (${inf}), 011 “slipped sample” therefore reads as NO LOCK, 101 “parity error” as validity, and 110 “bi-phase error” as confidence. 100 “CRC error” reads as OK.</li>
   <li><b>The LEDs are slow by design.</b> Each pass of <span class="mono">MAIN</span> calls <span class="mono">DELVIS</span> = 255 × 255 four-cycle loops (≈ 261 000 cycles). At the modelled 4 MHz RC clock that is ≈ 0.26 s per pass, so the front panel can miss a 40 ms dropout completely. The CONF tally needs 7 passes in a row (≈ 1.8 s). The RC component values are not readable from the binary DSN, so the clock is ${inf}. The delay comment (“1/1.53MHZ”, “RELAY PULSE(5mS)”) is the shared WBS boilerplate (also in <span class="mono">8201V100.ASM</span>) and does not describe this board.</li>
   <li><b>The PD13 → V100 change swaps the tally pins.</b> <span class="mono">PD13.ASM</span> (header “D8201 AES\\EBU DA”, Jun 1998) sets RB5 for A NO LOCK and RB4 for A CONF, RB6 for B NO LOCK and RB7 for B CONF. V100 (May 1999) swaps both pairs. The DSN is marked “ISS 3 PCB … FEB 26, 1999”, so the swap evidently follows the board re-spin (${inf}).</li>
   <li><b>The .BKX backups do not hold what their names say.</b> Assembled here, <span class="mono">PD13V100.BKX</span> is ${same('PD13V100','v100')?'word-for-word identical to':'different from'} <span class="mono">PD13V100.ASM</span>. <span class="mono">PD13V101.BKX</span> (May 13 1999) is ${same('PD13V101','pd13')?'identical to':'not identical to'} the 1998 <span class="mono">PD13.ASM</span>, not to <span class="mono">pd13v101.asm</span>. The V101 HEX was removed in the 2026|59 clean-up, so no binary of the shipped 2004 code survives. The source assembles to the same layout, though.</li>
   <li><b>RETFIE and RETURN on a part that has neither.</b> <span class="mono">PD13.ASM</span> has <span class="mono">RETFIE</span> at <span class="mono">ORG 4H</span>. The 16C5x has no such instruction, so MPASM took it as a label: <span class="mono">PD13.ERR</span> logs “Warning[207] … Found label after column 1. (RETFIE)”. V100 comments it out. Both older files also end <span class="mono">DELAY</span> with <span class="mono">RETURN</span>, which MPASM turns into <span class="mono">RETLW 0</span> on this core (the BKX images hold 0x800 there). V101 writes <span class="mono">RETLW 0</span> itself. The other <span class="mono">.ERR</span> logs “Processor superceded by command line” (the <span class="mono">LIST P=16C5X</span> line); V101 comments that line out.</li>
   <li><b>Leftovers.</b> <span class="mono">RST_BCN</span> ends with a stray <span class="mono">BSF PORTA,1</span> (SEL high), which only stretches the next SEL pulse. <span class="mono">BINIT EQU 0X4F</span> and <span class="mono">Z EQU 2</span> are unused. <span class="mono">POD13.PJT</span> still lists <span class="mono">pd13v100.asm</span> as its source but targets <span class="mono">PD13V101.HEX</span>, with “Frequency=140000000”. Its MRU list includes an unrelated <span class="mono">r203v101.asm</span> (radio console module).</li>
   <li><b>Front and rear controls the PIC never sees.</b> LVL (SW2/SW3 → 74HC4053) and EQ (SW1/SW4 → EQ amplifier, EQ-ON LED) are pure hardware. The PIC has no spare input: RB0–RB3 are taken by E0/E1, and RA0 is unused.</li>
   <li><b>Manual vs. hardware.</b> The manual lists “Sampling Frequency Range 30 kHz to 50 kHz”, so 96 kHz never locks. Two manual PDFs carry the same text: <span class="mono">POD13MAN.PDF</span> (Sep 1999) and <span class="mono">pod13.pdf</span> (Jul 2002, from <span class="mono">POD13MAN.WPD</span>). The functional diagram exists twice (<span class="mono">POD13 - Functional Diagram.cdr</span> and <span class="mono">#Functional Diagram.cdr</span> are byte-identical). Its legend writes “OdBS” for 0 dBFS. The front LED order on the PCB is NO LOCK then LOCK (NO-LOCKA x = 6150, LOCKA x = 6450), the reverse of the POD13A.</li>
   <li><b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src(ART13,'POD13SLK.CDR')} (Feb 16 1998).</b> Its three plates (rear WHITE, front WHITE, front GREEN) are converted to vector (assets/pod13-front.svg, pod13-rear.svg) and register on the earlier cuts (front white 3 px lower than first cut), so buttons, LEDs and terminal blocks stay on their marks. The file is an old CorelDRAW version: libcdr reads all 48 text objects as garbled double-byte strings stacked at one point, so the lettering is re-set in Arial at the measured positions (textLength-fitted). The POD13 sheet sets “PODS” in live Hobo and the tagline as text, so the logo, the two green bars and “by Ward-Beck Systems” come from the 2015 ${SIM.src(ART13A,'POD13A-FRONT&REAR-SILK (CURVE).cdr')}, which registers with the POD13 green plate to within a pixel. Drill crosshairs on the POD13 front mark the PWR lamp and the four LVL/EQ buttons (the buttons were moved 3 px onto them), but none of the EQ-ON, NO LOCK and LOCK lamps; the POD13A sheet instead marks every lamp with ⊕. Only one POD13 silk exists (in OBSOLETE); everything else in POD13 - #SILK is POD13A artwork (V10, iss2, iss2curve, iss2sticker, RR-iss3).</li>
   <li><b>The POD13A firmware <i>is</i> in this folder.</b> The <span class="mono">pod13a.js</span> plugin says the successor's firmware is not archived, but it is here. (1) <span class="mono">POD13 - SOFTWARE #atmel/…#v100/</span>: <span class="mono">ATMELPOD13.prj</span> (Sep 23 2008, “ATMega128”) builds <span class="mono">v100w.c</span>, <span class="mono">cs84xx.c</span>, <span class="mono">AK4396.c</span>, <span class="mono">altera.c</span>, <span class="mono">eeprom.c</span> and <span class="mono">D6204A.c</span>. The main loop polls <span class="mono">CS8416_READ_LOCK_ALL()</span>, drives LOCK/NO LOCK, power-cycles each AK4396 on lock changes and reads the sample-rate flags from the FPGA (<span class="mono">ALTERA2 == 0xAA</span> handshake). Its header still says “AT90CAN128 … OPEN GEAR (D6204A) … Oct 4 2007 prototype”, and <span class="mono">DEBOUNCE_fs2()</span> compares <span class="mono">fs2 != pfs</span> where <span class="mono">pfs2</span> was meant. (2) <span class="mono">POD13 - #SOFTWARE #lattice2/v100/</span>: <span class="mono">pod13a.vhd</span> (Sep 23 2008) for the LFXP3C-3T100C, with <span class="mono">pod13a.jed</span> built by ispLEVER 7.1 on Sep 24 2008. A byte-identical copy of the .jed sits in <span class="mono">POD13 - #Software/</span>. <span class="mono">dec2_4.vhd</span> decodes the CAL DIP into the 74HC4053 enables (“11=-20, 10=-18, 01=-12, 00=reserved”) and forces all outputs high (mute) on <span class="mono">no_lock</span>. That is why the POD13A test sheet records Up/Up as “Mute”. The DIP decode in <span class="mono">v100w.c</span> is commented out. These match the test sheet's “Atmel: V100, Lattice: V100” and the listing entries “POD13A | ATMEGA128L | POD13AV100” and “LFXP3KC-T100 | POD13AV100”.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>PIC clock: RC, default 4 MHz (${inf}); the WDT fuse defaults off (POD13.PJT “WDTEnable=0”); RAM at power-up defaults to 0x07.</li><li>Device-reset timer 18 ms; WDT 18 ms × 128 prescaler (OPTION = 0x3F after reset) (${inf}, PIC16C5x data sheet).</li><li>CS8412 codes from the eye amplitude: source 4 V p-p (110 Ω) or 1 V p-p (75 Ω). Cable loss is set so that the eye reaches the 0.2 V p-p spec minimum at the manual's no-EQ reach, and the EQ adds the loss of the extra reach. Confidence below 0.25 V p-p, bi-phase errors below 0.2 V, no lock below 0.17 V. Relock takes 12 ms (all ${inf}).</li><li>While SEL is high the E pins are read as 0; the CS8412 error latch is not modelled (${inf}).</li><li>Output muted while unlocked; LF353 on ±12 V clips near +25.6 dBu (${inf}).</li><li>Panel text was re-set from the CorelDRAW text objects, whose positions libcdr lost. Labels are placed against POD13FRT/POD13RER and the PCB placements. The PODS logo and tagline are the POD13A curve artwork (the POD13 file uses live “Hobo” text).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD13 - #Software/POD13 - #SOFTWARE #V100/PD13.ASM · PD13V100.ASM · pd13v101.asm · PD13V100.BKX · PD13V101.BKX · POD13.PJT · PD13.ERR · PD13V100.ERR · 8201V100.ASM</li><li>POD13 - #Software/POD13 - SOFTWARE #atmel/…#v100/ · POD13 - #SOFTWARE #lattice2/v100/</li><li>POD13 - #MANUAL/POD13MAN.PDF · pod13.pdf</li><li>POD13 - Functional Diagram.pdf</li><li>POD13 - #PCB/OBSOLETE/ARCHIVE/POD13-3.DSN · POD13.PCB</li><li>POD13 - #SILK/OBSOLETE/POD13SLK.CDR · POD13 - #MECHANICAL/POD13FRT.pdf · POD13RER.pdf</li><li>SOFTWARE LISTINGS - #Engineering.xls (archive root)</li></ul>`); }

SIM.register({
  id:'pod13', name:'POD13 · dual AES/EBU D/A converter (1998|31)', duration:DUR, product:'POD13', year:1998, family:'Obsolete products', folder:'#POD #SERIES/XXX - POD13 - #Master #OBSOLETE',
  summary:'The original half-rack dual AES/EBU to analog converter (75 Ω BNC or 110 Ω XLR builds), with front LVL (+24/+18 dBu) and cable-EQ buttons and LOCK/NO LOCK tallies. Two CS8412 receivers feed CS4329 DACs. A PIC16C54A polls the receivers\' error pins and drives the LEDs and the open-collector NO LOCK/CONFIDENCE tallies. Its three archived programs run here on a cycle-counting emulator.',
  highlights:['Real PIC16C54A code (1998, 1999, 2004) assembled and run cycle by cycle, with a live listing','The V100 validity-bit hang and the 2004 fix','Silk panels from POD13SLK.CDR with working LVL/EQ buttons and pluggable inputs','CS8412 error codes, AES3 frames with the V bit, and cable reach with and without EQ','Shows that the POD13A Atmel and Lattice V100 firmware is archived in this folder'],
  depth:'Full model',
  stepUnits:[{label:'1 PIC instruction',period:()=>4/D.fosc,phase:()=>trace().t0%(4/D.fosc)},{label:'1 AES frame (A)',period:()=>1/D.conv[0].fs},{label:'10 ms',period:()=>0.01},{label:'1 main-loop pass',period:()=>passPeriod(),phase:()=>{ const p=passes(); return p.length?p[0]%passPeriod():0; }}],
  zooms:[[3,'3 s (whole run)'],[1,'1 s'],[0.3,'300 ms (≈ 1 loop pass)'],[0.01,'10 ms'],[0.001,'1 ms'],[0.0002,'200 µs (frames)'],[0.00005,'50 µs (instructions)']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: using a POD13',render:viewTutorial},{id:'second',label:'One second, loop by loop',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software (PIC16C54A)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
