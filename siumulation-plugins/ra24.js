/* =====================================================================
   RA24 — 12 × 2 stereo audio routing switcher (Ward-Beck Systems "Select Series"), obsolete mechanical folder
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model with the real PIC firmware behaviour.

   Sources used:
   - #AV #SERIES/XXX - AVS - #OBSOLETE #Archive/XXX - RA24 - #Mechanical #Obsolete/*.dwg (2012 drafting: front ISS 2, rear ISS 2, rear "WHEN MODIFING A RAV-24",
       layouts — DWG text only; the drawings could not be rendered here)
   - #AV #SERIES/XXX - AVS - #OBSOLETE #Archive/RA24/ (the engineering for this product):
       V101/ra24v101.asm (Tim Clarke, August 16 2000; PIC16C73A "RA24 ROUTING AUDIO X 24"): MAIN, input, debounce, led_ctrl, switch_ctrl,
         led_output, switch_output, recieve_uart, reset_uart, translate_uart (0xCF frames), transmit_uart, DELAY
       V101/remv103.asm (remote panel), V100/RA24V100.ASM, ra24.acf (CPLD), RA24SILK.CDR (→ assets/ra24-*.png via Inkscape), Ra24manu.cdr
   - …/XXX - AVS - #OBSOLETE #Archive/Custom Rav24 Dec 21/RAV24MANCUSTOM.WPD (audio specifications shared with the RAV24)
   - The sister RAV24 silk PDF (Nov 2015) was used to place the RA24 artwork on the same 17.1 × 1.65 in face.
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
const PREFIX='ra24';
const RW=3420, RH=330;
/* Artwork 2026|59: assets/ra24-front.svg (two GREEN groups + the WHITE legends) and ra24-rear.svg are vector, straight from
   RA24/RA24SILK.CDR (Dec 17 1998, text already curves) via Inkscape. The sheet has no panel outline, so each group was registered
   by cross-correlation on the old PNGs (which were placed on the RAV24 face): offsets agree to 1 px. */
const FOSC = 4.9152e6, TCY = 4/FOSC;          // inferred from SPBRG = 7, BRGH = 0 and the 9600-baud remote link
const ROUT = [['re_init',14],['input',46],['debounce',26],['led_ctrl',40],['switch_ctrl',110],['led_output',330],['switch_output',336],['recieve_uart',9],['reset_uart',14],['translate_uart',14],['transmit_uart',9],['delay',256*31]];
const PASS = ROUT.reduce((a,r)=>a+r[1],0)*TCY;
const B_COUNT=3;
const BY=112, BS=74, OUTX=[976,1116], SRCX=[1325,1466,1607,1746,1888,2026,2166,2306,2447,2588,2725,2867];
const D = { power:true, out:0, xpt:[1,1], ev:null, uart:[], log:[] };
const FACT=JSON.parse(JSON.stringify(D));
function pressTiming(t){ const n0=Math.ceil(t/PASS), det=(n0+B_COUNT-1)*PASS; return {press:t, det, force:det+(ROUT.slice(0,6).reduce((a,r)=>a+r[1],0)+336)*TCY, release:t+0.12}; }
const act=makeActor(D, ()=>`OUT1 ← ${D.xpt[0]} · OUT2 ← ${D.xpt[1]}`);
function scan(tr,group,bit,label){ const t=pressTiming(SIM.t); D.ev={...t,label};
  tr(`input: sel0/sel1/sel2 pick group ${group} (“INPUTS : ${group===1?'OUT2, OUT1, VIDEO, AUDIO, A/V, SW1':group===2?'SW2 … SW7':'SW8 … SW12'}”); PORTA → input_${group}, bit ${bit} = 0`);
  tr(`debounce: ${B_COUNT} identical scans → input_flag,0 at ${SIM.fmtT(t.det)} (${SIM.fmtDur(t.det-t.press)} after the press)`); }
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; tr(D.power?'RESET → INIT (SPBRG = 7) → audset1/audset2 restore both outputs from the 93C66 (nonvol_audtab, table_nonvol)':'Tallies dark'); }); },
  out(o){ act(`SWR OUT ${o+1}`, tr=>{ scan(tr,1,o?1:2,'OUTPUT'+(o+1)); D.out=o; tr(`led_ctrl → out${o+1}_change: save the other output’s tallies (out${o?1:2}_last1..3), restore out${o+1}_last1..3`); }); },
  src(s){ act(`SOURCE ${s} → SWR OUT ${D.out+1}`, tr=>{ scan(tr,s<=6?2:3,s<=6?6-s:12-s,`INPUT ${s} (check_sw${s+5})`); D.xpt[D.out]=s;
    tr(`led_ctrl: check_sw${s+5} stores ${s} in switch_check; switch_ctrl → do_audio${D.out+1} → erase_aud${D.out+1} (old relay bit off) → audio${D.out?2:1}_table → new bit into switch_1..5`);
    tr('switch_output: 36 bits via sft_out (RB7 data, RB5 clock) then “force” (bsf/bcf PORTB,6) latches the relays — no ARM wait: the RA24 has no video'); tr('led_output: 36 LED bits, strobe RB2'); }); },
  serial(hex){ act(`Remote in: ${hex}`, tr=>{ const b=hex.trim().split(/[\s,]+/).filter(Boolean).map(x=>parseInt(x,16));
    if(b.some(isNaN)){ tr('Not hex bytes'); return; }
    D.uart.unshift({t:SIM.t,dir:'rx',s:b.map(x=>x.toString(16).toUpperCase().padStart(2,'0')).join(' ')});
    if(b.length>2) tr(`${b.length} bytes in one burst: recieve_uart reads one byte per pass (${SIM.fmtDur(PASS)}) and the USART FIFO holds 2 — byte 3 arrives after ${SIM.fmtDur(20/9600)} and sets OERR (aerror: CREN cleared and set) (${inf}: timing)`);
    let i=0, armed=false, reply=null;
    for(;i<Math.min(b.length,2);i++){ const x=b[i];
      if(x===0xCF){ armed=true; tr('translate_uart: 0xCF → transmit_flag,1 set: the next byte is an information byte'); continue; }
      if(!armed){ tr(`0x${x.toString(16)}: no preceding 0xCF → ignored`); continue; }
      if(x===0){ reply=[D.xpt[0]&15,D.xpt[1]&15]; tr('info 0x00 → just_transmit: check_aud1, then (special_loop) check_aud2'); continue; }
      const src=x&15, o=(x>>6)&1, upd=(x>>7)&1;
      if(src>=13||src===0){ tr(`source ${src}: “movlw 0x0D / subwf / btfsc STATUS,C / return” rejects it`); continue; }
      D.xpt[o]=src; tr(`bit 6 = ${o} → uart_out${o+1}: audset${o+1}, do_audio${o+1} → OUT ${o+1} ← input ${src}`); tr(upd?`bit 7 = 1 → just_dis${o+1}: the front tallies switch to output ${o+1}`:'bit 7 = 0 → tallies left alone (uart_dis: btfss recieved_reg,7)'); if(upd) D.out=o;
      reply=[D.xpt[0]&15,D.xpt[1]&15]; }
    if(reply){ D.uart.unshift({t:SIM.t+0.003,dir:'tx',s:reply.map(x=>x.toString(16).toUpperCase().padStart(2,'0')).join(' ')}); tr(`transmit_uart: replies ${reply.join(', ')} (low nibble of check_aud1, check_aud2)`); }
    D.uart.length=Math.min(D.uart.length,30); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
function frontSVG(){ const on=D.power; let over='';
  OUTX.forEach((x,o)=>over+=pbtn(x,BY,BS,on&&D.out===o?1:0,'#ff5a3c','ot" data-o="'+o,`SWR OUT ${o+1} — click`));
  SRCX.forEach((x,i)=>over+=pbtn(x,BY,BS,on&&D.xpt[D.out]===i+1?1:0,'#43e06a','sr" data-s="'+(i+1),`SOURCE ${i+1} — click`));
  return layered({w:RW,h:RH,bg:'#111214',layers:[PREFIX+'-front.svg'],over,label:'RA24 front panel (RA24SILK.CDR)'}); }
function rearSVG(){ const ph=(x,y,hot,title)=>`<g><title>${title}</title><rect x="${x-46}" y="${y-24}" width="92" height="48" rx="3" fill="#26a356" stroke="#0e5d2b"/>${[-28,0,28].map(d=>`<rect x="${x+d-8}" y="${y-12}" width="16" height="24" fill="#0e4d25"/>`).join('')}${hot?`<rect x="${x-44}" y="${y-22}" width="88" height="14" fill="#2b5f9e" opacity=".85"/>`:''}</g>`;
  let over=''; for(let k=1;k<=12;k++){ const x=1830+(k-1)*106.5; over+=ph(x,95,D.xpt.includes(k),`AUDIO INPUT ${k} LEFT (+ − G)`)+ph(x,225,D.xpt.includes(k),`AUDIO INPUT ${k} RIGHT`); }
  [0,1].forEach(o=>{ const x=3230+o*108; over+=ph(x,95,true,`AUDIO OUTPUT ${o+1} LEFT ← input ${D.xpt[o]}`)+ph(x,225,true,`AUDIO OUTPUT ${o+1} RIGHT`); });
  over+=iec(100,30,236,150)+`<rect x="118" y="196" width="100" height="62" rx="10" fill="#9a9da1" stroke="#555"/><rect x="132" y="210" width="72" height="34" rx="6" fill="#111"/>`;
  return layered({w:RW,h:RH,bg:'#111214',layers:[PREFIX+'-rear.svg'],over,label:'RA24 rear panel (RA24SILK.CDR)'}); }
function bindPanel(r){ r.querySelectorAll('.ot').forEach(g=>g.onclick=()=>A.out(+g.dataset.o)); r.querySelectorAll('.sr').forEach(g=>g.onclick=()=>A.src(+g.dataset.s)); }
function consoleHTML(){ return `<div class="small" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px"><label>Remote link (9600 baud, hex) <input id="cmd" value="CF 85" style="width:110px" class="mono"></label><button id="snd">Send</button>
  ${['CF 00','CF 83','CF CC','CF 0D','CF 85 CF 46'].map(c=>`<button class="qk" data-c="${c}">${c}</button>`).join('')}</div>
  <div class="log small mono" style="max-height:110px">${D.uart.map(u=>`<div>${SIM.fmtT(u.t)} ${u.dir==='rx'?'→ RA24':'← RA24'} ${u.s}</div>`).join('')||'<span class="muted">No remote traffic yet. Info byte: bits 0–3 source, bit 6 output 2, bit 7 update tallies.</span>'}</div>`; }
function bindConsole(r){ const g=s=>r.querySelector(s); if(!g('#snd')) return; g('#snd').onclick=()=>A.serial(g('#cmd').value); r.querySelectorAll('.qk').forEach(b=>b.onclick=()=>A.serial(b.dataset.c)); }
bindKeys('__ra24Active', ()=>({'[':()=>A.out(0),']':()=>A.out(1),'1':()=>A.src(1),'2':()=>A.src(2),'3':()=>A.src(3),'4':()=>A.src(4),'5':()=>A.src(5),'6':()=>A.src(6),'7':()=>A.src(7),'8':()=>A.src(8),'9':()=>A.src(9),'0':()=>A.src(10),'-':()=>A.src(11),'=':()=>A.src(12)}));
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), e=D.ev;
  const mark=(label,fn,col)=>({label,h:20,draw(c,X,t0,t1,y,h){ if(!e){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('press a button',X(t0)+6,y+14); return; } const [s0,s1]=fn(e); if(s1<t0||s0>t1) return; c.fillStyle=col; c.fillRect(X(Math.max(t0,s0)),y+4,Math.max(2,X(Math.min(t1,s1))-X(Math.max(t0,s0))),h-8); }});
  return [
    {label:`Main-loop passes (${SIM.fmtDur(PASS)})`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,PASS,0,PASS-ROUT[ROUT.length-1][1]*TCY,b,'work (rest = delay)'); }},
    mark('Button held', e=>[e.press,e.release], SIM.css('--ink2')), mark('Debounce (b_count = 3)', e=>[e.press,e.det], SIM.css('--warn')),
    mark('led_ctrl / switch_ctrl', e=>[e.det,e.det+PASS*0.3], a), mark('“force” → relays switch', e=>[e.force,e.force+0.0004], a),
    {label:'Remote link (9600 8N1)', h:22, draw(c,X,t0,t1,y,h){ D.uart.forEach(u=>{ const d=u.s.split(' ').length*10/9600; if(u.t+d<t0||u.t>t1) return; c.fillStyle=u.dir==='rx'?b:a; c.fillRect(X(Math.max(t0,u.t)),y+4,Math.max(2,X(Math.min(t1,u.t+d))-X(Math.max(t0,u.t))),h-8); c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(u.s,X(Math.max(t0,u.t))+3,y+15); }); }},
  ]; }
function xptTable(){ return tbl(['Switcher','Source','Tallies shown'],[0,1].map(o=>[`OUT ${o+1}`,`input ${D.xpt[o]}`,o===D.out?'yes':'—']),true); }
function viewSim(m){ window.__ra24Active=true;
  m.innerHTML=`${card('Front panel — RA24SILK.CDR on the RAV24 face; click SWR OUT and SOURCE SELECT',`<div id="fp"></div><div class="small muted">Keys: [ ] = SWR OUT 1/2, 1…9 0 - = = sources 1…12.</div>`)}${card('Rear panel',`<div id="rp"></div><div class="small muted" style="margin-top:4px">Front and rear artwork: ${SIM.src('#AV #SERIES/XXX - AVS - #OBSOLETE #Archive/RA24/RA24SILK.CDR','RA24/RA24SILK.CDR')} (Dec 17 1998), green and white plates, placed on the RAV24 face.</div>`)}
   <div class="grid2">${card('Firmware path of the last action (ra24v101.asm)',`<div id="trace" class="log"></div>`)}<div>${card('Crosspoints',`<div id="xp"></div>`)}${card('Remote panel link (0xCF frames)',`<div id="con"></div>`)}</div></div>
   ${card('Timeline — zoom to 100 ms after a press',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); m.querySelector('#trace').innerHTML=traceHTML(D,'Press a button.'); m.querySelector('#xp').innerHTML=xptTable();
    const ce=m.querySelector('#con'); const keep=ce.querySelector('#cmd')?ce.querySelector('#cmd').value:null; ce.innerHTML=consoleHTML(); if(keep) ce.querySelector('#cmd').value=keep; bindConsole(ce);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the RA24', body:`<p>The RA24 is the audio-only member of the AVS family (“RA24 ROUTING AUDIO X 24” in the code): 12 stereo inputs, two independent output switchers, lit SWR OUT and SOURCE SELECT buttons, and a serial link for a remote panel. The rear drawing “RA24-REAR ISS 2 (WHEN MODIFING A RAV-24)” shows RA24s were also made from RAV24 chassis.</p>`, check:()=>true, auto:true},
  {title:'1 · Route source 5 to output 1', body:`<p>SWR OUT <b>1</b> is lit. Press SOURCE <b>5</b>.</p>`, check:()=>D.xpt[0]===5, hint:'Click button 5 or press 5.'},
  {title:'2 · Output 2', body:`<p>Press SWR OUT <b>2</b>; the tallies switch to show output 2. Route source <b>11</b> to it.</p>`, check:()=>D.xpt[1]===11, hint:'] then -.'},
  {title:'3 · Remote panel', body:`<p>Send <span class="mono">CF 83</span> from the remote link: 0x83 = update tallies (bit 7), output 1 (bit 6 = 0), source 3.</p>`, check:()=>D.xpt[0]===3, hint:'Use the quick button CF 83.'},
  {title:'4 · A bad source number', body:`<p>Send <span class="mono">CF 0D</span> (source 13). The firmware rejects it with <span class="mono">movlw 0x0D / subwf / btfsc STATUS,C / return</span>.</p>`, check:()=>D.log.some(e=>e.name.includes('CF 0D')), hint:'Quick button CF 0D.'},
  {title:'Done', body:`<p>See <b>Software</b> for the main loop and <b>Findings</b>.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__ra24Active=true; tutorialView(m,{title:'Tutorial — operating the RA24',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div class="small">${xptTable()}</div>${consoleHTML()}`, bind:r=>{ bindPanel(r); bindConsole(r); }}); }
function viewSecond(m){ window.__ra24Active=true;
  m.innerHTML=`${card('One second inside the RA24',`<div id="tab"></div>`)}${card('The pass at the playhead',`<div id="pass"></div>`)}`;
  const draw=()=>{ const ph=(SIM.t%PASS)/TCY; let acc=0, hot=0; ROUT.forEach((r,i)=>{ if(ph>=acc) hot=i; acc+=r[1]; });
    m.querySelector('#tab').innerHTML=tbl(['Event','per second','period','source'],[['Main-loop passes',(1/PASS).toFixed(1),SIM.fmtDur(PASS),'cycles counted from ra24v101.asm; Fosc '+inf],['Debounce','—',SIM.fmtDur(B_COUNT*PASS),'b_count = 3'],['LED + switch shift-outs',(1/PASS).toFixed(1),SIM.fmtDur(72*9*TCY),'2 × 36 bits every pass, changed or not'],['Remote bytes (9600 8N1)','≤ 960',SIM.fmtDur(10/9600),'two-byte frames fit the 2-byte USART FIFO'],['Audio (20 Hz … 20 kHz)','—','—','relay crosspoints; no clocks touch the audio']]);
    m.querySelector('#pass').innerHTML=loopSVG(ROUT.map(r=>({t:r[0],s:[r[1]+' cycles',SIM.fmtDur(r[1]*TCY)]})),hot,'MAIN (ra24v101.asm)'); };
  SIM.on('time',draw); }
const BLOCKS={
  fp:{x:15,y:20,w:170,h:80,t:'Front panel',s:['14 lit pushbuttons'],d:'SWR OUT 1/2 and SOURCE 1–12. The code still scans the RAV24 MODE positions (VIDEO, AUDIO, A/V) in input_1.'},
  pic:{x:210,y:20,w:180,h:80,t:'PIC16C73A',s:['ra24v101.asm'],d:'Same skeleton as the RAV24 firmware without video, chirp or ARM.'},
  cpld:{x:415,y:20,w:180,h:80,t:'Altera CPLD',s:['ra24.acf'],d:'36-bit LED and switch latches.'},
  aud:{x:620,y:20,w:180,h:80,t:'Audio relays',s:['12 stereo → 2'],d:'40 kΩ balanced in, 60 Ω out, unity (RAV24 manual audio specs).'},
  ee:{x:210,y:130,w:180,h:70,t:'93C66 EEPROM',s:['nonvol tables'],d:'Crosspoints restored at power-up (audset1/audset2).'},
  rem:{x:15,y:130,w:170,h:70,t:'Remote panel',s:['remv103.asm','0xCF + info byte'],d:'A separate PIC panel speaking the 2-byte protocol at 9600 baud.'},
};
const WIRES=[['fp','pic','scan'],['pic','cpld','36+36'],['cpld','aud',''],['pic','ee',''],['rem','pic','UART']];
function viewBlock(m){ window.__ra24Active=false; blockView(m,BLOCKS,WIRES,'pic',[815,220],card('In one sentence',`<p>A PIC scans 14 buttons and a remote link, keeps one source number per output, and shifts LED and relay words into a CPLD that switches 12 stereo inputs onto two outputs.</p>`)); }
const SHEETS=[{name:'1 · PIC16C73A pin use (from the code)', note:'From the EQUs and TRIS set-up in ra24v101.asm; identical to the RAV24 except that ARM (RB3) gates only the LED output.', svg:()=>
  chip(300,40,220,'PIC16C73A (ra24v101.asm)',[['RA0–RA4','button returns'],['RA5 sel0','scan select'],['RB0 sel1','scan select'],['RB1','button return'],['RB2 strb','LED strobe'],['RB3 ARM','tested in led_output'],['RB5 led_clk','shift clock'],['RB6 force','relay latch'],['RB7 sft_dat','shift data']],[['RC0 sel2','scan select'],['RC1 DO','93C66'],['RC2 CS','93C66'],['RC3 CLK','93C66'],['RC4 DI','93C66'],['RC5','BSF PORTC,5 (Aug 2000 fix)'],['RC6 TX','remote'],['RC7 RX','remote']],'OTP, MPASM')},
  {name:'2 · Remote frame', note:'translate_uart in ra24v101.asm.', svg:()=>chip(60,60,160,'byte 1',[['0xCF','address/sync']],[],'')+chip(320,60,240,'byte 2 (info)',[['bit 7','update tallies'],['bit 6','0 = OUT1, 1 = OUT2'],['bits 3–0','source 1–12 (≥13 rejected)'],['0x00','status request']],[],'')+chip(620,60,180,'reply',[['check_aud1 & 0x0F',''],['check_aud2 & 0x0F','']],[],'transmit_uart')}];
function viewSchem(m){ window.__ra24Active=false; schemView(m,SHEETS,'RA24','Redrawn from the firmware; no RA24 schematic is in the archive.'); }
function viewSoft(m){ window.__ra24Active=true; let hot=null;
  const DET={re_init:'Rewrites ADCON1/TRIS each pass.',input:'Three scan groups; group 1 still names VIDEO, AUDIO and A/V (RAV24 positions).',debounce:'3 identical scans to accept, 3 clean scans to release.',led_ctrl:'check_sw6…check_sw17 decode INPUT 1–12; out1_change/out2_change swap the tally sets.',switch_ctrl:'do_audio1/do_audio2: erase_aud then audio table bit OR.',led_output:'Skipped while PORTB,ARM is high (a RAV24 leftover — the RA24 never sets ARM).',switch_output:'36 bits then force.',recieve_uart:'One byte per pass.',reset_uart:'Re-programs SPBRG/TXSTA/RCSTA after each received byte.',translate_uart:'0xCF then info byte.',transmit_uart:'BSF STATUS,5 commented “set bank 0” (it selects bank 1).',delay:'DELAY2 is never reloaded: 256 × 7 loops each call.'};
  m.innerHTML=`${card('MAIN — ra24v101.asm (follows the playhead; click a step)',`<div id="lp"></div><div id="det" class="card small"></div>`)}`;
  const draw=()=>{ const ph=(SIM.t%PASS)/TCY; let acc=0, run=0; ROUT.forEach((r,i)=>{ if(ph>=acc) run=i; acc+=r[1]; }); const h=hot==null?run:hot;
    m.querySelector('#lp').innerHTML=loopSVG(ROUT.map(r=>({t:r[0],s:[r[1]+' cycles']})),h,`Pass ${Math.floor(SIM.t/PASS)} · ${SIM.fmtDur(PASS)}`); m.querySelectorAll('[data-step]').forEach(g=>g.onclick=()=>{ hot=+g.dataset.step; draw(); });
    m.querySelector('#det').innerHTML=`<b class="mono">${ROUT[h][0]}</b>: ${DET[ROUT[h][0]]}`; };
  SIM.on('time',draw); }
function viewNotes(m){ window.__ra24Active=false;
  m.innerHTML=card('What the RA24 files show — findings',`<ol>
   <li><b>The RA24 is a RAV24 with the video taken out.</b> ra24v101.asm keeps the RAV24 skeleton: group 1 is still documented as “OUT2, OUT1, VIDEO, AUDIO, A/V, SW1”, <span class="mono">led_output</span> still tests PORTB,ARM, and the rear drawing “RA24-REAR ISS 2 (WHEN MODIFING A RAV-24)” converts a RAV24 chassis.</li>
   <li><b>Two-byte remote protocol.</b> <span class="mono">translate_uart</span>: 0xCF, then an info byte (bits 0–3 source, bit 6 output, bit 7 update tallies); 0x00 asks for status; sources ≥ 13 are rejected. Two bytes fit the PIC USART’s 2-byte FIFO, which matters because <span class="mono">recieve_uart</span> reads only one byte per ${SIM.fmtDur(PASS)} pass.</li>
   <li><b>A wrong bank comment.</b> <span class="mono">transmit_uart</span>: “BSF STATUS,5 ; set bank 0” selects bank 1.</li>
   <li><b>The delay ignores its own comment.</b> DELAY2 is never reloaded in MAIN, so each call runs 256 × 7 inner loops, not the “15 FOR RELAY PULSE(5mS)” the comment describes.</li>
   <li><b>Clock vs comment.</b> “DELAY=:: DELAY1(255*1/1.53MHZ*2 * DELAY2)” implies a 1.53 MHz instruction rate, but SPBRG = 7 / BRGH = 0 gives 9600 baud only at Fosc = 4.9152 MHz (${inf}).</li>
   <li><b>Labels by case.</b> MAIN calls <span class="mono">delay</span> and loops to <span class="mono">main</span>; the labels are DELAY and MAIN — assembled case-insensitive.</li>
   <li><b>The August 2000 fix.</b> The header: “The Revision of this program is the addition of the BSF PORTC,5 in the system initialization to allow for serial communication” — the same one-line fix as RAVV101 (June 23 2000).</li>
   <li><b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src('#AV #SERIES/XXX - AVS - #OBSOLETE #Archive/RA24/RA24SILK.CDR','RA24/RA24SILK.CDR')} (Dec 17 1998).</b> The sheet holds four separations without a panel outline or drill marks beyond the crosshairs: the green logo/rule row (the WBS mark, RA24, BY WARD-BECK SYSTEMS, the SWR OUT and SOURCE SELECT brackets), the green bottom bars, the white legends (SWR OUT 1–2, SOURCE SELECT 1–12, SELECT SERIES) and the rear white legends. The button crosshairs fall on the SWR OUT and SOURCE SELECT positions used here. The rear legends number the inputs 1–12 with “+ - G” under each, and outputs 1–2, but draw no connector outlines, so the Phoenix blocks are placed from the legends (${inf}).</li>
   <li><b>Mechanical folder text only.</b> The five 2012 DWGs carry text from other drawings (ABB-M1, POD10-REAR, AMS8-M1, “POWDER COAT BEIGE”) — the RA24 sheets were made from older title blocks.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Fosc 4.9152 MHz and per-routine cycle counts estimated from the listing (${inf}).</li><li>Panel placement: the RA24 CorelDRAW silk aligned to the RAV24 2015 PDF face (same 17.1 × 1.65 in chassis).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>XXX - RA24 - #Mechanical #Obsolete/RA24-FRONT ISS 2 (PANEL).dwg, RA24-REAR ISS 2 (PANEL).dwg, RA24-REAR ISS 2 ( WHEN MODIFING A RAV-24).dwg (+ .md text)</li><li>XXX - AVS - #OBSOLETE #Archive/RA24/V101/ra24v101.asm, remv103.asm · RA24SILK.CDR (→ assets/ra24-front-white.png, ra24-front-green.png, ra24-rear-white.png)</li></ul>`); }
SIM.register({
  id:'ra24', name:'RA24 · 12 × 2 stereo audio routing switcher (2000|33–2012|45)', duration:1, product:'RA24', year:2000, family:'Obsolete products', folder:'#AV #SERIES/XXX - AVS - #OBSOLETE #Archive/XXX - RA24 - #Mechanical #Obsolete',
  summary:'The audio-only sibling of the RAV24: 12 stereo inputs switched to two outputs from lit SWR OUT and SOURCE SELECT buttons or a remote panel. The panel is the RA24 CorelDRAW silk; the behaviour follows the PIC16C73A firmware ra24v101.asm.',
  highlights:['Real RA24 silkscreen with 14 working lit pushbuttons','Debounce and relay latch timing from the main loop','The 0xCF remote protocol, including rejected frames','Main loop stepped routine by routine'],
  depth:'Hardware model',
  stepUnits:[{label:'1 main-loop pass',period:()=>PASS},{label:'1 ms',period:()=>0.001},{label:'1 UART bit',period:()=>1/9600}],
  zooms:[[1,'1 s'],[0.1,'100 ms (a press)'],[0.02,'20 ms'],[PASS,'1 pass'],[0.002,'2 ms']], defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (from code)',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
