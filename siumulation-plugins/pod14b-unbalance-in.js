/* =====================================================================
   POD14B — Analog-to-digital converter, unbalanced-input variant (Ward-Beck Systems, panels Nov 2014)
   Plugin for the WBS Device Simulator (../siumulation.html).

   POD14B's own folder holds only panels, mechanical drawings and photos. Its electronics and firmware are taken
   from its sister POD14A (same front-panel controls, same rear outputs/reference; inferred to share the board):
   - #POD #SERIES/POD14A - #Master/POD14A - #Engineering /Software/atmel/v100/d6203_test.c, D6203A.c/.h, altera.c/.h
       main loop, TRANSLATE_ENCODER1, REFRESH_LEDS, NO_LOCK_CHIRP, ALTERA_write, ADC reset logic, constants
   - .../Software/README.md (FPGA: SR_DETECT_192, mclk_sel, i2s8416_aes; AK5394 nets)
   - #POD #SERIES/POD14A - #Master/POD14A - #Manual/POD14A MANUAL.docx (Rev Oct.01 2014: specs, −20 dBFS = +4 dBu)
   - #POD #SERIES/POD14A - #Master/POD14A - #Master/POD14A - MAIN FINAL BOM.xlsx (AK5394A ×2, PLL1705, 27 MHz, NE5532 ×4, 2K trims)
   - #POD #SERIES/POD14B - UNBALANCE IN #Master/POD14B - #ARTWORK #DA #2016/POD14B-FRONT&REAR-SILK (CURVE).pdf + Pics/
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
    ${ART.cdr ? `<image href="${ASSET}${prefix}-${side}.svg" width="${PW}" height="${PH}"/>` : layers.map(l=>`<image href="${ASSET}${prefix}-${l}.png" width="${PW}" height="${PH}"/>`).join('')}
    ${inner.over||''}
    ${screw(50,160)}${screw(1664,160)}
  </svg>`;
}
/* Panel artwork 2026|59: CorelDRAW sheet converted with Inkscape (libcdr) → assets/pod14b-unbalance-in-front.svg, -rear.svg
   (ink plates coloured green rgb(52,168,83) / white rgb(240,240,236), cut-outs as dark holes, drill crosshairs faint;
   registered to the older PDF PNG silks to ±1 px so every control keeps its place). The PNGs stay on a toggle. */
const ART = {cdr:true};
const ART_CDR = '#POD #SERIES/POD14B - UNBALANCE IN #Master/POD14B - #ARTWORK #DA #2016/POD14B-FRONT&REAR-SILK (CURVE).cdr', ART_PDF = '#POD #SERIES/POD14B - UNBALANCE IN #Master/POD14B - #ARTWORK #DA #2016/POD14B-FRONT&REAR-SILK (CURVE).pdf';
function artNote(){ return `<div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART_CDR, ART_CDR.split('/').pop())} (CorelDRAW, default) · <label><input type="checkbox" class="pod14b-unbalance-in-art" ${ART.cdr?'':'checked'}> show the older PNG silks cut from ${SIM.src(ART_PDF, 'the PDF')}</label></div>`; }
document.addEventListener('change', e=>{ if (e.target && e.target.classList && e.target.classList.contains('pod14b-unbalance-in-art')){ ART.cdr = !e.target.checked; SIM.refresh(); } });
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

const PREFIX='pod14b-unbalance-in';
const C = { PASS:175e-6, ADC_RESET:5714, RESET_MAX:2, SAVE:57140, LOCK:25, CHIRP_ON:1000, CHIRP_OFF:7000, WAIT100:0.1, BOOT:0.15+0.75 }; // PASS from the ADC_RESET_CONSTANT comment
const SR = [32000,44100,48000,96000,192000], SRN=['32','44.1','48','96','192'], SRD=['SR_32','SR_44','SR_48','SR_96','SR_192'];
const REFN = {0:'REFERENCE_1',1:'REFERENCE_2',3:'INTERNAL_REF'};
const D = { power:true, powerAt:-1, sample_rate:2, rateAt:-10, savedRate:2,
  ref:{ on:false, fs:48000, at:-1 },
  in1:{ on:true, lvl:-7.8 }, in2:{ on:true, lvl:4 },   // INPUT1 = RCA (consumer, −10 dBV), INPUT2 = Phoenix (balanced, +4 dBu)
  front:[0.59,0.59], rear:[0.5,0.5,0.5,0.5], f:1000, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
/* ---------------- firmware model (d6203_test.c v100) ---------------- */
function passAt(t){ return Math.floor(t/C.PASS); }
// ADC reset windows after a rate change with INTERNAL_REF selected: 5714 passes low, 100 ms high (blocking wait), 5714 passes low
function resetWindows(){ const t0=D.rateAt; if (t0<-5) return []; const L=C.ADC_RESET*C.PASS; return [[t0,t0+L],[t0+L+C.WAIT100, t0+2*L+C.WAIT100]]; }
function adcInReset(t){ if (!D.power) return true; if (D.powerAt>=0 && t<D.powerAt+C.BOOT) return true; return resetWindows().some(([a,b])=>t>=a&&t<b); }
function refLocked(t){ return D.power && D.ref.on && [32000,44100,48000,96000,192000].includes(D.ref.fs) && t >= Math.max(D.ref.at, D.powerAt) + C.LOCK*C.PASS; }
function referenceSel(t){ return refLocked(t) ? 1 : 3; }   // ALTERA_write: (Astatus != NO_LOCK && clocks_stable) ? reference : INTERNAL_REF ; reference stays REFERENCE_2 while locked
function fsOut(t){ return referenceSel(t)===3 ? SR[D.sample_rate] : D.ref.fs; }
function chirpOn(t){ const p=passAt(t)%(C.CHIRP_ON+C.CHIRP_OFF); return p>=C.CHIRP_OFF; }  // computed every pass, never used for a LED
function altera2(t){ return (0<<7)|(referenceSel(t)<<5)|(D.sample_rate<<2)|(refLocked(t)?1:((passAt(t)/C.LOCK|0)%2)); }
function leds(t){ const on=D.power && !(D.powerAt>=0 && t<D.powerAt+0.15); const rs=referenceSel(t);
  return { pwr:D.power, sr:on? D.sample_rate : -1, ext:on && rs!==3, int:on && rs===3, cal:on && adcInReset(t) }; }
/* ---------------- analog model ---------------- */
const FS0 = 24;  // 0 dBFS = +24 dBu at factory calibration (−20 dBFS for +4 dBu, manual)
function frontDb(ch){ return D.front[ch]*20; }            // INPUT 1 GAIN: 0 … +20 dB (inferred range)
function rearDb(i){ return (D.rear[i]-0.5)*12; }           // rear trims RV1–RV4 (2K, 3006P): ±6 dB (inferred)
function inLevels(conv,ch){
  const unb = conv===0, src = unb? D.in1 : D.in2, inL = src.on? src.lvl : -200;
  const g = unb? frontDb(ch) : 0, tr = rearDb(conv*2+ch), opClip = v2dbu(10.5/Math.SQRT2);
  const afterGain = inL + g, afterTrim = afterGain + tr, dbfs = afterTrim - FS0;
  return { dbfs, stages:[
    {name: unb? `INPUT1 RCA ${ch?'R (red)':'L (white)'} — unbalanced`:`INPUT2 Phoenix ${ch?'R':'L'} — balanced`, lvl:inL, gain:null, clip:null, note: unb?'consumer −10 dBV = −7.8 dBu nominal':'+4 dBu nominal; POD14A: 24 kΩ balanced'},
    {name: unb? `front INPUT 1 GAIN ${ch?'R':'L'}`:'balanced receiver (NE5532)', lvl:afterGain, gain:g, clip:opClip, note: unb?`0 … +20 dB (${inf})`:'unity ('+inf+')'},
    {name:`rear trim ${ch?'R':'L'} (${unb?'INPUT1':'INPUT2'}, 2K 3006P)`, lvl:afterTrim, gain:tr, clip:opClip, note:`±6 dB (${inf}); factory: +4 dBu → −20 dBFS`},
    {name:'AK5394A ADC (differential driver, 21K5/36K/150R network)', lvl:dbfs, gain:-FS0, clip:0, unit:'dBFS', note:'0 dBFS = +24 dBu (manual: max input +24 dBu)'},
  ]};
}
const w = t=>Math.sin(2*Math.PI*D.f*t);
function adcSample(conv,ch,t){ const L=inLevels(conv,ch); if (adcInReset(t) || L.dbfs<-150) return 0; const fs=fsOut(t), n=Math.floor(t*fs); return clamp(Math.pow(10,L.dbfs/20)*Math.SQRT2*Math.sin(2*Math.PI*D.f*n/fs),-1,1); }
function analogIn(t){ return D.in1.on ? dbu2v(D.in1.lvl)*Math.SQRT2*w(t) : 0; }
/* ---------------- actions (each logs the v100 code path) ---------------- */
const act=makeActor(D, ()=>`${SRN[D.sample_rate]} kHz · ${referenceSel(SIM.t+0.01)===3?'INT':'EXT'} · OUT1 L ${fdb(inLevels(0,0).dbfs)} dBFS`);
const A={
  press(){ act('Press SAMPLE RATE', tr=>{ if(!D.power){ tr('Unit is off.'); return; }
    const o=D.sample_rate; D.sample_rate = D.sample_rate===4?0:D.sample_rate+1; D.rateAt=SIM.t;
    tr('SWITCH_ENCODER1 → READ_ENCODER1(); TRANSLATE_ENCODER1: (encoder1 & BIT2)==0 && release1==0 && switch1==0 → switch1 = 1');
    tr(`sample_rate ${SRD[o]} → ${SRD[D.sample_rate]} (SAMPLE_RATE_MAX = SR_192 wraps to SAMPLE_RATE_MIN = SR_32)`);
    tr(`ALTERA_write(): ALTERA2 = da_disabled<<7 | reference_sel<<5 | sample_rate<<2 | reference = 0x${altera2(SIM.t+0.01).toString(16).padStart(2,'0').toUpperCase()}`);
    if (referenceSel(SIM.t)===3){ tr('sample_rate != psample_rate && reference_sel == INTERNAL_REF → reset_adc = YES, no_of_adc_resets = 0');
      tr(`RESET_LOW holds both AK5394s in reset for ADC_RESET_CONSTANT = 5714 passes (“5714 cycles = 1 sec”), then wait(50000)×2 ≈ 100 ms, then a second reset (RESET_MAX = 2): outputs silent for ≈ ${(2*C.ADC_RESET*C.PASS+C.WAIT100).toFixed(2)} s`); }
    else tr('An external reference is locked: reference_sel ≠ INTERNAL_REF, so no ADC reset; the outputs keep following the reference rate. REFRESH_LEDS still lights the internal-rate LED');
    tr('save_settings = YES → SAVE_INFORMATION_EEPROM after SAVE_SETTINGS_CONSTANT = 57 140 passes (≈ 10 s)'); }); },
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power){ D.powerAt=SIM.t;
    tr('main(): init_devices (WDTCR = 0x08, timer0) → RESET_LOW, da_disabled = YES → ALTERA_RESET(1000) → wait ≈150 ms → init_CS8416()');
    tr('reference_sel = reference = REFERENCE_2; sample_rate = SR_48; ALTERA_write(); RESET_HIGH; 15 × wait(50000) ≈ 750 ms; RESET_LOW; RESET_HIGH');
    tr('RESTORE_INFORMATION_EEPROM() → sample_rate from EEPROM; da_disabled = NO; enter while(1)'); D.sample_rate=D.savedRate; } }); },
  ref(){ act(D.ref.on?'Disconnect REF INPUT':'Connect REF INPUT', tr=>{ D.ref.on=!D.ref.on; D.ref.at=SIM.t;
    tr(`CS8416_READ_LOCK_ALL() → Astatus = INVERT_DATA(...) & BIT0 = ${D.ref.on?'locked':'NO_LOCK'}`);
    tr(D.ref.on? `clocks_stable after LOCK_CONSTANT = 25 passes (${(25*C.PASS*1000).toFixed(1)} ms) → ALTERA_write: reference_sel = reference → EXT LED; FPGA SR_DETECT_192 follows the ${D.ref.fs/1000} kHz reference`
                : 'reference_sel = INTERNAL_REF → INT LED; while unlocked, reference toggles REFERENCE_1 ↔ REFERENCE_2 every 25 passes (left over from the two-reference D6203)'); }); },
  refFs(v){ act(`Reference rate → ${v/1000} kHz`, tr=>{ D.ref.fs=v; D.ref.at=SIM.t; tr('CS8416 re-locks; FPGA mclk_sel picks the master clock for the detected rate'); }); },
  trim(kind,i,dir){ act(`Turn ${kind==='front'?'INPUT 1 GAIN '+(i?'R':'L'):'rear trim '+['INPUT1 L','INPUT1 R','INPUT2 L','INPUT2 R'][i]} ${dir>0?'CW':'CCW'}`, tr=>{
    const a = kind==='front'? D.front : D.rear; a[i]=clamp(+(a[i]+dir*0.04).toFixed(3),0,1);
    const conv = kind==='front'?0:(i>>1), ch = kind==='front'?i:(i&1);
    tr(`${kind==='front'?'front gain':'rear calibration'} now ${fdb(kind==='front'?frontDb(i):rearDb(i))} dB → OUTPUT${conv+1} ${ch?'R':'L'} = ${fdb(inLevels(conv,ch).dbfs)} dBFS (pure analog: no firmware involved)`); }); },
  plug(which){ act(`${D[which].on?'Unplug':'Plug in'} ${which==='in1'?'INPUT1 (RCA)':'INPUT2 (Phoenix)'}`, tr=>{ D[which].on=!D[which].on; }); },
  set(k,v,l){ act(l, tr=>{ if (k==='f') D.f=v; else D[k].lvl=v; tr('Source changed'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* ---------------- panels (POD14B-FRONT&REAR-SILK (CURVE).pdf, NOV.06/14) ---------------- */
const SRX=[832,878,933,983,1034];
function frontSVG(t){ const L=leds(t);
  let over=rocker(D.power)+pled(D.power)
    + `<g class="srb" style="cursor:pointer"><title>SAMPLE RATE step switch (PHA-2UOA momentary + G003A cap) — click to press</title><circle cx="714" cy="218" r="30" fill="#0a0b0c" stroke="#3a3d40" stroke-width="3"/><circle cx="714" cy="218" r="20" fill="#191b1d"/></g>`
    + SRX.map((x,i)=>led(x,224,L.sr===i,'#ff3b30',9)).join('') + led(1123,224,L.ext,'var(--led-g)',9) + led(1170,224,L.int,'#ffd23a',9)
    + trim(1297,153,D.front[0],'fg0','INPUT 1 GAIN L') + trim(1497,153,D.front[1],'fg1','INPUT 1 GAIN R');
  return panelSVG(PREFIX,'front',{over},'POD14B front panel (real silkscreen)'); }
function rearSVG(){
  let over = rca(266,75,'#eee',D.in1.on,'pin1','INPUT1 L (white) — click to plug/unplug')+rca(266,188,'#c8312a',D.in1.on,'pin1','INPUT1 R (red)')
    + phx(406,90,D.in2.on,'pin2','INPUT2 L (+ − G) — click')+phx(406,200,D.in2.on,'pin2','INPUT2 R (+ − G)')
    + [[180,250,0],[223,250,1],[488,250,3],[533,250,2]].map(([x,y,i])=>`<g transform="translate(${x},${y}) scale(.55) translate(${-x},${-y})">${trim(x,y,D.rear[i],'rt'+i,'rear trim '+['INPUT1 L','INPUT1 R','INPUT2 L','INPUT2 R'][i])}</g>`).join('')
    + bnc(716,87,D.ref.on,'rf','REF INPUT 75 Ω — click to connect/disconnect',46)+phx(716,208,false,'','REF INPUT 110 Ω')
    + bnc(926,87,false,'','OUTPUT1 75 Ω',46)+phx(926,208,false,'','OUTPUT1 110 Ω')+bnc(1136,87,false,'','OUTPUT2 75 Ω',46)+phx(1136,208,false,'','OUTPUT2 110 Ω')+iec(1395,28,1612,252);
  return panelSVG(PREFIX,'rear',{over},'POD14B rear panel (real silkscreen)'); }
function bindPanel(root){ const p=root.querySelector('.pwr'); if(p) p.onclick=()=>A.power(); root.querySelectorAll('.srb').forEach(g=>g.onclick=()=>A.press());
  bindTrim(root,'fg0',d=>A.trim('front',0,d)); bindTrim(root,'fg1',d=>A.trim('front',1,d)); [0,1,2,3].forEach(i=>bindTrim(root,'rt'+i,d=>A.trim('rear',i,d)));
  root.querySelectorAll('.pin1').forEach(g=>g.onclick=()=>A.plug('in1')); root.querySelectorAll('.pin2').forEach(g=>g.onclick=()=>A.plug('in2')); root.querySelectorAll('.rf').forEach(g=>g.onclick=()=>A.ref()); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center"><button id="pr">press SAMPLE RATE</button>
  <label>INPUT1 (RCA) source <input id="l1" type="number" value="${D.in1.lvl}" style="width:60px"> dBu</label><label>INPUT2 (Phoenix) source <input id="l2" type="number" value="${D.in2.lvl}" style="width:60px"> dBu</label>
  <label>Reference rate <select id="rfs">${[44100,48000,96000,192000,50000].map(f=>`<option value="${f}" ${f===D.ref.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label></div>
  <div class="small muted">Click the round button (or press S) to step the rate. Turn the INPUT 1 GAIN trims on the front and the small rear trims. Click the REF INPUT BNC to connect a reference.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if(!g('#pr')) return; g('#pr').onclick=()=>A.press();
  g('#l1').onchange=e=>A.set('in1',+e.target.value,'INPUT1 source → '+e.target.value+' dBu'); g('#l2').onchange=e=>A.set('in2',+e.target.value,'INPUT2 source → '+e.target.value+' dBu');
  g('#rfs').onchange=e=>A.refFs(+e.target.value); }
bindKeys('__pod14bActive', ()=>({s:()=>A.press(), q:()=>A.trim('front',0,-1), w:()=>A.trim('front',0,1), e:()=>A.trim('front',1,-1), r:()=>A.trim('front',1,1)}));
/* ---------------- timeline ---------------- */
const STEPS=[['WDR · SWITCH_ENCODER1',.10],['CS8416_READ_LOCK_ALL',.12],['ALTERA_write (2 bytes)',.30],['reset_adc bookkeeping',.08],['NO_LOCK_CHIRP · REFRESH_LEDS',.15],['WDR · save_settings · lock counters',.25]];
function stepAt(t){ const f=(t/C.PASS)%1; let a=0; for (let i=0;i<STEPS.length;i++){ a+=STEPS[i][1]; if (f<a) return i; } return STEPS.length-1; }
const envF=fn=>{ const e=t=>{ let m=0; for(let i=0;i<8;i++) m=Math.max(m,Math.abs(fn(t+i/(8*D.f)))); return m; }; e.dense=(span,pw)=>span*D.f>pw/3; return e; };
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), r=SIM.css('--bad');
  return [
    { label:'ATmega128 main loop (175 µs)', h:30, draw(c,X,t0,t1,y,h){ const px=X(t0+C.PASS)-X(t0);
      if (px>60){ for (let n=Math.floor(t0/C.PASS); n*C.PASS<t1; n++){ let tt=n*C.PASS; STEPS.forEach(([nm,f],j)=>{ const d=f*C.PASS; c.fillStyle=j===2?b:a; c.globalAlpha=j%2?.55:.85; c.fillRect(X(tt),y+3,Math.max(1,X(tt+d)-X(tt)-1),h-6); c.globalAlpha=1; if(X(tt+d)-X(tt)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(nm.slice(0,22),X(tt)+3,y+h/2+3);} tt+=d; }); } }
      else SIM.pulses(c,X,t0,t1,y,h,C.PASS,0,C.PASS*0.9,a,'main-loop passes'); }},
    { label:'ALTERA_write strobe', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.PASS,C.PASS*0.22,C.PASS*0.3,b,'2-byte writes'); }},
    boolLane('AK5394 RESET (low = held)', t=>adcInReset(t), r),
    boolLane('CS8416 lock (Astatus)', t=>refLocked(t), '#3fbf5f'),
    { label:`Sample clock (${SRN[D.sample_rate]}k int / ref)`, h:22, draw(c,X,t0,t1,y,h){ const fs=fsOut((t0+t1)/2); SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.3/fs,a,'LRCK'); }},
    { label:'AES3 blocks out', h:20, draw(c,X,t0,t1,y,h){ const fs=fsOut((t0+t1)/2); SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,wn,'192-frame blocks'); }},
    waveLane('INPUT1 L (RCA, volts)', t=>analogIn(t), -0.05, null, b, 32, envF(t=>analogIn(t))),
    waveLane('OUTPUT1 L samples (FS)', t=>adcSample(0,0,t), -0.01, null, a, 34, envF(t=>adcSample(0,0,t))),
    boolLane('SR LED for the selected rate', t=>leds(t).sr>=0, '#ff3b30'),
    boolLane('EXT LED (green)', t=>leds(t).ext, '#3fbf5f'), boolLane('INT LED (yellow)', t=>leds(t).int, '#ffd23a'),
    boolLane('chirp_on (computed, never shown)', t=>D.power&&chirpOn(t), SIM.css('--ink2')),
  ]; }
/* ---------------- views ---------------- */
function nowTable(t){ const L=leds(t); return `<table class="kv"><tr><th>sample_rate</th><td class="mono">${SRD[D.sample_rate]} (${SRN[D.sample_rate]} kHz)</td></tr><tr><th>reference_sel</th><td class="mono">${REFN[referenceSel(t)]}${referenceSel(t)!==3?' (locked to '+D.ref.fs/1000+' kHz)':''}</td></tr>
  <tr><th>Output rate</th><td class="mono">${fsOut(t).toLocaleString()} Hz${referenceSel(t)!==3&&fsOut(t)!==SR[D.sample_rate]?' <span style="color:var(--warn)">≠ the SR LED</span>':''}</td></tr>
  <tr><th>ALTERA2 byte</th><td class="mono">0x${altera2(t).toString(16).padStart(2,'0').toUpperCase()} = ${altera2(t).toString(2).padStart(8,'0')}b</td></tr><tr><th>AK5394</th><td class="mono">${adcInReset(t)?'<b style="color:var(--bad)">in RESET (muted)</b>':'running'}</td></tr>
  <tr><th>Main-loop pass</th><td class="mono">#${passAt(t).toLocaleString()} · ${STEPS[stepAt(t)][0]}</td></tr>
  ${[0,1].map(cv=>[0,1].map(ch=>`<tr><th>OUTPUT${cv+1} ${ch?'R':'L'}</th><td class="mono">${fdb(inLevels(cv,ch).dbfs)} dBFS${inLevels(cv,ch).dbfs>0?' <b style="color:var(--bad)">CLIP</b>':''}</td></tr>`).join('')).join('')}</table>`; }
function viewSim(m){ window.__pod14bActive=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead',`<div id="fp"></div>${controlsHTML()}`)}${card('Rear panel',`<div id="rp"></div>${artNote()}`)}</div>
   <div>${card('What the software did (last action)',`<div id="trace" class="log"></div>`)}${card('State at the playhead',`<div id="now"></div>`)}</div></div>
   ${card('Timeline — one second, zoomable. Press SAMPLE RATE, then scrub: the ADCs are held in reset twice for 1 s each. Zoom to 1 ms to see single loop passes.',`<canvas id="tl"></canvas>`)}
   <div class="grid2">${card('Scope: OUTPUT1 at the playhead (one AES3 frame)',`<canvas id="sc"></canvas><div id="bits" class="small mono"></div>`)}${card('Levels — INPUT1 L (RCA) and INPUT2 L (Phoenix)',`<div id="lv"></div>`)}</div>${card('Action log',`<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Press SAMPLE RATE, connect a reference or turn a gain trim. Each step the firmware takes is listed here.');
    m.querySelector('#now').innerHTML=nowTable(t); m.querySelector('#lv').innerHTML=`<h3>OUTPUT1 L ← INPUT1 L</h3>${stageTable(inLevels(0,0).stages)}<h3>OUTPUT2 L ← INPUT2 L</h3>${stageTable(inLevels(1,0).stages)}`;
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:210});
    const fs=fsOut(t), n=Math.floor(t*fs), s=adcSample(0,0,t), s2=adcSample(0,1,t);
    drawAesScope(m.querySelector('#sc'), aesSubframe(s,n%192===0?'Z':'X',n%192,fs), aesSubframe(s2,'Y',n%192,fs), fs, 1, `OUTPUT1 frame ${n.toLocaleString()} ·`);
    m.querySelector('#bits').innerHTML=`L = ${s.toFixed(5)} · R = ${s2.toFixed(5)}${adcInReset(t)?' (ADC in reset → zeros)':''}. <span class="muted">C/U/V from the FPGA's i2s_gen_cuv block; channel-status byte 0 shown in the standard professional layout (${inf}).</span>`; };
  bindControls(m); SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the POD14B', body:`<p>The POD14B is the “ANALOG-DIGITAL CONVERTER” with <b>unbalanced input</b>. It has two stereo converters. <b>INPUT1</b> is an RCA pair for consumer equipment, with <b>INPUT 1 GAIN</b> trims on the front. <b>INPUT2</b> is a balanced Phoenix pair. Each converter has an AES output (BNC 75 Ω and Phoenix 110 Ω). A <b>REF INPUT</b> takes an external AES reference.</p><p class="muted">The POD14B folder has no manual or firmware. The behaviour below comes from POD14A's manual and v100 firmware (shared board, ${inf}).</p>`, check:()=>true, auto:true},
  {title:'1 · Pick a sample rate', body:`<p>POD14A manual: “a momentary step switch and LED indicators to cycle through the internally generated sample rates from 32 to 192 kHz.” Press <b>SAMPLE RATE</b> until the <b>96</b> LED is lit.</p>`, check:()=>D.sample_rate===3, hint:'Click the round button (or press S).'},
  {title:'2 · Watch the outputs mute', body:`<p>Scrub the timeline forward from where you pressed. The firmware holds both AK5394 ADCs in reset for 5714 loop passes (“5714 cycles = 1 sec”), releases them for about 100 ms, then resets them a second time (RESET_MAX = 2). The outputs are silent for about 2.1 s after every press. Zoom out to 1 s to see both reset windows.</p>`, check:()=>D.rateAt>0, auto:false, hint:'Press SAMPLE RATE once more, then drag the time slider.'},
  {title:'3 · Line up a consumer source', body:`<p>INPUT1 is fed −10 dBV (−7.8 dBu) from a consumer deck. Factory calibration is −20 dBFS for +4 dBu, so the deck needs about +11.8 dB. Set <b>INPUT 1 GAIN L</b> and <b>R</b> so OUTPUT1 reads <b>−20 dBFS ±0.5</b>.</p>`, check:()=>Math.abs(inLevels(0,0).dbfs+20)<=0.5&&Math.abs(inLevels(0,1).dbfs+20)<=0.5, hint:'Q/W and E/R keys, or click the front trims.'},
  {title:'4 · Lock to a house reference', body:`<p>“The external sampling rate reference signal has precedence over the internally generated signal.” Connect <b>REF INPUT</b> (48 kHz). After 25 loop passes (4.4 ms) the <b>EXT</b> LED lights and the outputs run at the reference rate. The 96 LED stays lit, because REFRESH_LEDS shows the internal setting, not the rate in use.</p>`, check:()=>D.ref.on&&refLocked(1), hint:'Click the REF INPUT BNC on the rear.'},
  {title:'5 · Lose the reference', body:`<p>Disconnect REF INPUT. ALTERA_write falls back to INTERNAL_REF at once and the INT LED lights. The firmware also starts toggling <span class="mono">reference</span> between REFERENCE_1 and REFERENCE_2 every 25 passes, which is left over from the two-reference D6203 card.</p>`, check:()=>!D.ref.on&&D.log.some(e=>e.name==='Connect REF INPUT'), hint:'Click the REF BNC again.'},
  {title:'Done', body:`<p>The <b>Software</b> tab steps through the main loop. <b>Findings</b> lists what POD14B inherits from the D6203/POD14A code.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod14bActive=true; tutorialView(m,{title:'Tutorial — using a POD14B',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small">${nowTable(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod14bActive=true;
  m.innerHTML=`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the device',`<div id="dev"></div>`)}${card('As seen by the front panel',`<div id="fp"></div>`)}</div>${card('Zoom ladder — OUTPUT1 L samples',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, fs=fsOut(t);
    const rows=[['Main-loop passes',Math.round(1/C.PASS).toLocaleString(),SIM.fmtDur(C.PASS),'from the source comment “1 cycle = 175us or 5714 cycles = 1 sec”'],['ALTERA_write calls',Math.round(1/C.PASS).toLocaleString(),SIM.fmtDur(C.PASS),'2 bytes bit-banged every pass, changed or not'],
      ['Timer0 overflow interrupts','≈ 1,000','1 ms','TCNT0 = 0x83, clk/64 at 8 MHz → 125 counts = 1 ms; the ISR only reloads TCNT0'],['Sample frames (each output)',fs.toLocaleString(),SIM.fmtDur(1/fs),referenceSel(t)===3?'internal clock: PLL1705 from the 27 MHz crystal (24.576 / 33.8688 MHz families)':'locked to the reference'],
      ['AES3 blocks',(fs/192).toFixed(2),SIM.fmtDur(192/fs),'Z preamble'],['Chirp half-cycles','≈ 1.1',SIM.fmtDur(C.CHIRP_OFF*C.PASS)+' / '+SIM.fmtDur(C.CHIRP_ON*C.PASS),'NO_LOCK_CHIRP_CONSTANT_OFF/ON 7000/1000 passes'],
      ['Lock debounce','—',SIM.fmtDur(25*C.PASS),'LOCK_CONSTANT 25 passes'],['ADC reset after a rate change','—',SIM.fmtDur(2*C.ADC_RESET*C.PASS+C.WAIT100),'2 × 5714 passes + 100 ms'],['EEPROM save delay','—',SIM.fmtDur(C.SAVE*C.PASS),'SAVE_SETTINGS_CONSTANT 5714×10']];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>what it is</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#dev').innerHTML=nowTable(t); m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    drawLadder(m.querySelector('#zl'),t,[['1 second',1],['100 ms',0.1],['1 tone cycle',1/D.f],['1 loop pass',C.PASS],['4 frames',4/fs]],tt=>adcSample(0,0,tt),-0.01,'full scale'); };
  SIM.on('time',draw); }
const BLOCKS={
  in1:{x:20,y:20,w:180,h:80,t:'INPUT1 (RCA, unbal.)',s:['front INPUT 1 GAIN L/R','rear trims R/L'],d:'POD14B only. Consumer level, gained up by the front trims. The circuit is not archived; the gain range is inferred.'},
  in2:{x:20,y:130,w:180,h:80,t:'INPUT2 (Phoenix, bal.)',s:['rear trims R/L'],d:'Same as POD14A: balanced, 24 kΩ, +24 dBu max (manual).'},
  drv:{x:250,y:60,w:180,h:90,t:'NE5532 ×4 → AK5394A ×2',s:['21K5 / 36K / 150R / 90R9','2K trims RV1–RV4'],d:'POD14A BOM: differential drivers into two AKM AK5394A 24-bit ADCs (MCLK/SCLK/LRCK/SDATA/DFS0/DFS1/HPF/ZCAL/CAL/RSTN_5394_1/2).'},
  fpga:{x:250,y:190,w:180,h:110,t:'Cyclone EP1C3T100C8',s:['SR_DETECT_192 · mclk_sel','i2s8416_aes · i2s_gen_cuv','sclk128_64 · div_3_50'],d:'Generates the ADC clocks from the internal clocks or the reference, and formats two AES streams with C/U/V/Z bits (README of POD14A software).'},
  pll:{x:20,y:240,w:180,h:70,t:'PLL1705 + 27 MHz',s:['INTCLK_24576 / INTCLK_33868'],d:'The internal sample clocks for the 48 kHz and 44.1 kHz families.'},
  ref:{x:20,y:340,w:180,h:70,t:'REF INPUT → CS8416',s:['DS34LV86T receiver','Astatus lock bit'],d:'Its lock bit decides EXT/INT.'},
  mcu:{x:250,y:340,w:180,h:90,t:'ATmega128L (8 MHz)',s:['d6203_test.c v100','175 µs main loop','EEPROM, LEDs, switch'],d:'Reads the step switch, writes ALTERA1/2 every pass, resets the ADCs on changes, drives PORTD/PORTG LEDs.'},
  out:{x:480,y:190,w:170,h:90,t:'OUTPUT1 / OUTPUT2',s:['DS34LV87T → PE-65612','BNC 75 Ω + Phoenix 110 Ω'],d:'1 V p-p terminated (manual).'},
  fp:{x:480,y:340,w:170,h:90,t:'Front panel',s:['SR 32…192 (red)','EXT (green) / INT (yellow)','step switch'],d:'LED colours from the POD14A BOM: SR LEDs 551-0405 red, EXTREF green, INTREF yellow.'},
};
const WIRES=[['in1','drv',''],['in2','drv',''],['drv','fpga','I²S'],['pll','fpga','clocks'],['ref','fpga','MCLK/data'],['ref','mcu','lock'],['mcu','fpga','ALTERA bus'],['fpga','out','AES ×2'],['mcu','fp','LEDs']];
function viewBlock(m){ window.__pod14bActive=false; blockView(m,BLOCKS,WIRES,'mcu',[680,450],card('In one sentence',`<p>Two stereo analog inputs (INPUT1 unbalanced with front gain, INPUT2 balanced) go into two AK5394 ADCs. The FPGA clocks them from an internal PLL or an external AES reference and sends two AES outputs. A small ATmega128 loop handles the rate button, the LEDs and the reference lock.</p>`)); }
const SHEETS=[
  {name:'1 · MCU ports (from the v100 headers)', note:'Port bits from D6203A.h / common.h / d6203_test.c of POD14A v100. Encoder and DIP pins come from shaft_encoder1.h and are not traced here.', svg:()=>
    chip(320,50,200,'ATmega128L (8 MHz)',[['PORTD.3','SR32 LED'],['PORTD.4','SR44 LED'],['PORTD.5','SR48 LED'],['PORTD.6','SR96 LED'],['PORTD.7','SR192 LED'],['PORTG.0','EXTERNAL LED'],['PORTG.1','INTERNAL LED'],['PORTE.6','CAL LED (not on the panel)']],
      [['RESET_HIGH/LOW','AK5394 RSTN'],['PORTE.0','reset companion'],['ALTERA bus','strobed serial'],['CS8416','SPI, lock'],['encoder BIT2','SAMPLE RATE switch'],['WDTCR = 0x08','watchdog ≈ 14 ms']],'d6203_test.c v100')},
  {name:'2 · ALTERA2 control byte', note:'From ALTERA_write() in D6203A.c. ALTERA1 (data_upper) is always 0.', svg:()=>{
    const b=altera2(SIM.t); let s=txt(60,60,'ALTERA2 = (da_disabled << 7) | (reference_sel << 5) | (sample_rate << 2) | reference',13);
    ['da_disabled','reference_sel.1','reference_sel.0','sample_rate.2','sample_rate.1','sample_rate.0','reference.1','reference.0'].forEach((n,i)=>{ const bit=(b>>(7-i))&1; s+=`<rect x="${60+i*90}" y="100" width="84" height="50" fill="${bit?'var(--accent)':'var(--panel2)'}" stroke="var(--ink)"/><text x="${102+i*90}" y="132" text-anchor="middle" font-size="20" fill="${bit?'#fff':'var(--ink)'}">${bit}</text><text x="${102+i*90}" y="170" text-anchor="middle" font-size="10" fill="var(--ink2)">${n}</text><text x="${102+i*90}" y="92" text-anchor="middle" font-size="10" fill="var(--ink2)">bit ${7-i}</text>`; });
    return s+txt(60,230,'reference_sel: 0 REFERENCE_1, 1 REFERENCE_2, 3 INTERNAL_REF · sample_rate: 0 SR_32 … 4 SR_192',12)+txt(60,250,'Note: reference_sel = 3 and reference = 1 overlap bits 5–6 and 0–1 by design; da_disabled shares bit 7.',12,'var(--ink2)'); }},
];
function viewSchem(m){ window.__pod14bActive=false; schemView(m,SHEETS,'POD14B (POD14A board)','The POD14A schematic (P-CAD 2002) is filed outside its folder; POD14B has none. These sheets are redrawn from the firmware headers.'); }
function viewSoft(m){ window.__pod14bActive=true;
  m.innerHTML=`<div class="grid2">${card('Main loop (d6203_test.c v100) — the lit box runs at the playhead',`<div id="flow"></div>`)}<div>${card('reference_sel state machine',`<div id="fsm"></div>`)}${card('ADC reset sequencer',`<div id="rs"></div>`)}</div></div>
    ${card('How the buttons did things',`<div id="btn"></div>`)}`;
  const draw=()=>{ const t=SIM.t, st=stepAt(t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*44+70}" style="width:100%"><rect x="150" y="6" width="220" height="26" rx="13" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="12" fill="var(--ink)">main(): init, EEPROM restore</text>`;
    STEPS.forEach(([n],j)=>{ const y=44+j*44, on=j===st; s+=`<rect x="40" y="${y}" width="440" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="52" y="${y+20}" font-size="12" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${n}</text>`; });
    s+=`<text x="40" y="${44+STEPS.length*44+16}" font-size="11" fill="var(--ink2)">while(1), about 175 µs per pass · pass #${passAt(t).toLocaleString()}</text></svg>`; m.querySelector('#flow').innerHTML=s;
    const rs=referenceSel(t); const node=(x,lbl,on)=>`<circle cx="${x}" cy="70" r="40" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="74" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text>`;
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 460 150" style="width:100%">${node(90,'INTERNAL_REF',rs===3)}${node(370,'REFERENCE_2',rs===1)}<path d="M132 60 Q230 20 328 60" fill="none" stroke="var(--ink2)"/><text x="230" y="30" text-anchor="middle" font-size="10" fill="var(--ink2)">Astatus locked + 25 passes</text><path d="M328 82 Q230 120 132 82" fill="none" stroke="var(--ink2)"/><text x="230" y="130" text-anchor="middle" font-size="10" fill="var(--ink2)">Astatus == NO_LOCK (immediately)</text></svg>`;
    const W=resetWindows(); m.querySelector('#rs').innerHTML=`<p class="small">${W.length?W.map(([a,b],i)=>`Reset ${i+1}: ${SIM.fmtT(a)} → ${SIM.fmtT(b)}`).join('<br>'):'No rate change yet.'}</p><p class="small muted">reset_adc → RESET_LOW; counts ADC_RESET_CONSTANT = 5714 passes; no_of_adc_resets++; if &lt; RESET_MAX (2): wait 100 ms (blocking) and reset again.</p>`;
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>Effect</th></tr><tr><td>Press SAMPLE RATE</td><td class="mono small">SWITCH_ENCODER1 → TRANSLATE_ENCODER1 → sample_rate++</td><td class="small">ALTERA2 bits 2–4; ADC reset ×2 if internal; SR LED; EEPROM after 10 s</td></tr>
      <tr><td>Connect REF</td><td class="mono small">CS8416_READ_LOCK_ALL → Astatus; clocks_stable after 25 passes</td><td class="small">reference_sel = reference → EXT LED; FPGA follows the reference</td></tr><tr><td>Remove REF</td><td class="mono small">ALTERA_write: reference_sel = INTERNAL_REF; reference toggles 1↔2</td><td class="small">INT LED; internal clock</td></tr>
      <tr><td>Turn a gain trim</td><td class="mono small">(analog only)</td><td class="small">level into the AK5394</td></tr></table><p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none'}</b></p>`; };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod14bActive=false;
  m.innerHTML=card('What POD14B (and its POD14A firmware) is up to — findings',`<ol>
   <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src(ART_CDR, ART_CDR.split('/').pop())}</b> (file 2016-06-16, sheet dated NOV.06/14; it is newer than the PDF (2015-12-03) the PNG silks came from, but its ink is identical). The ink plates are drawn as vectors; the older PNG silks cut from ${SIM.src(ART_PDF, 'the PDF')} are on the toggle under the rear panel. The cut-out layer shows four small rear holes the legend does not name (beside INPUT2 and between REF INPUT, OUTPUT1 and OUTPUT2); nothing in this model uses them (${inf}: connector or standoff screws). OUTPUT1 is cut as a plain round hole while REF INPUT and OUTPUT2 carry XLR crosshairs.</li>
   <li><b>Every rate change mutes the outputs for about 2.1 s.</b> With the internal reference, a press sets <span class="mono">reset_adc = YES</span>. The loop then holds the AK5394s in reset for <span class="mono">ADC_RESET_CONSTANT</span> = 5714 passes (“5714 cycles = 1 sec”), releases them during a blocking 100 ms wait, and resets them again (<span class="mono">RESET_MAX = 2</span>).</li>
   <li><b>The rate LEDs can be wrong.</b> <span class="mono">REFRESH_LEDS</span> lights the LED for <span class="mono">sample_rate</span>, the internal setting, even when an external reference sets a different rate. Lock to a 48 kHz reference with 96 selected and the 96 LED stays on.</li>
   <li><b>No-lock chirp is computed but never shown.</b> <span class="mono">NO_LOCK_CHIRP()</span> toggles <span class="mono">chirp_on</span> (1000/7000 passes), but nothing reads it. Unlike POD33, no LED flashes when the reference is missing.</li>
   <li><b>Leftovers from the D6203 OpenGear card.</b> The project is still called <span class="mono">d6203_test</span>. When unlocked, <span class="mono">reference</span> toggles REFERENCE_1/REFERENCE_2 every 25 passes, but POD14 has one reference input. The CAN/DashBoard files are in the folder but not in the build. A <span class="mono">CAL_LED</span> on PORTE.6 lights during ADC resets, but neither POD14 panel has a CAL LED.</li>
   <li><b>The comments disagree on timer0.</b> <span class="mono">timer0_init</span> says “desired value: 1mSec”, the ISR reload says “for 100us”, and TCNT0 = 0x83 with prescaler 64 at 8 MHz gives about 1 ms (${inf}). Nothing in the loop uses the timer anyway.</li>
   <li><b>The firmware writes the FPGA every pass.</b> <span class="mono">ALTERA_write()</span> sends ALTERA1/ALTERA2 about 5700 times a second whether or not anything changed. The change-detect code (<span class="mono">pALTERA1</span>) is commented out.</li>
   <li><b>POD14B has no firmware or schematic of its own.</b> The folder name and panels show an unbalanced RCA INPUT1 with front INPUT 1 GAIN trims, where POD14A has rear Phoenix inputs. Everything electronic here is inferred from POD14A: same EP1C3, ATmega128, CS8416 and AK5394 BOM, same panel layout for SR, REF and outputs.</li>
   <li><b>The panel says 100–240 VAC.</b> Like POD14A it uses the VAF1005 universal supply.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Main-loop pass = 175 µs, from the source comment (not measured).</li><li>INPUT1 front gain 0…+20 dB and rear trims ±6 dB (${inf}); 0 dBFS = +24 dBu (manual).</li><li>Boot length about 0.9 s, from the wait() calls in main().</li><li>Reference lock = 25 passes after connection; the FPGA's rate detection is instantaneous (${inf}).</li><li>The saved rate is restored at power-on (RESTORE_INFORMATION_EEPROM).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>../POD14A - #Master/POD14A - #Engineering /Software/atmel/v100/d6203_test.c, D6203A.c/.h, altera.h, common.h</li><li>../POD14A - #Master/POD14A - #Manual/POD14A MANUAL.docx · POD14A - #Master/POD14A - MAIN FINAL BOM.xlsx</li><li>POD14B - #ARTWORK #DA #2016/POD14B-FRONT&amp;REAR-SILK (CURVE).pdf · Pics/</li></ul>`); }
SIM.register({
  footnotes: [
    { text: "The rear has four small round holes the legend does not name: one beside INPUT2 and one between each of REF INPUT, OUTPUT1 and OUTPUT2.", src: "#POD #SERIES/POD14B - UNBALANCE IN #Master/POD14B - #ARTWORK #DA #2016/POD14B-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "OUTPUT1 is cut as a plain round hole, while REF INPUT and OUTPUT2 have drill crosshairs.", src: "#POD #SERIES/POD14B - UNBALANCE IN #Master/POD14B - #ARTWORK #DA #2016/POD14B-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "Of the two INPUT 1 GAIN holes on the front, only L has a drill crosshair; R is a plain hole.", src: "#POD #SERIES/POD14B - UNBALANCE IN #Master/POD14B - #ARTWORK #DA #2016/POD14B-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The CDR (saved 2016-06-16) is newer than the PDF of the same sheet (2015-12-03), but the ink is identical. The sheet is dated NOV.06/14.", src: "#POD #SERIES/POD14B - UNBALANCE IN #Master/POD14B - #ARTWORK #DA #2016/POD14B-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The CDR draws a drill crosshair at every hole on both the green and white plates; the real panels (Pics/ photos) carry no crosshairs, so the simulator shows them faint.", src: "#POD #SERIES/POD14B - UNBALANCE IN #Master/POD14B - #ARTWORK #DA #2016/POD14B-FRONT&REAR-SILK (CURVE).cdr" }
  ],
  id:'pod14b-unbalance-in', name:'POD14B · analog-to-AES converter, unbalanced input (2014|47)', duration:1, product:'POD14B - UNBALANCE IN', year:2014, family:'POD series', folder:'#POD #SERIES/POD14B - UNBALANCE IN #Master',
  summary:'Half-rack dual analog-to-AES converter: an unbalanced RCA input with front gain trims plus a balanced Phoenix input, 32–192 kHz from an internal PLL or an external AES reference. Behaviour modelled from the POD14A v100 ATmega128 firmware it shares.',
  highlights:['Real silkscreen panels: step switch, rate/REF LEDs, front and rear trims','175 µs main loop with ALTERA_write and the ADC reset sequence','2.1 s mute on every rate change','EXT/INT reference handover and LED quirks','AES3 output frames at the selected rate'],
  depth:'Hardware model',
  stepUnits:[{label:'1 loop pass (175 µs)',period:()=>C.PASS},{label:'1 sample',period:()=>1/fsOut(SIM.t)},{label:'1 AES block',period:()=>192/fsOut(SIM.t)},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms (≈6 loop passes)'],[0.0002,'200 µs']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: using a POD14B',render:viewTutorial},{id:'second',label:'One second, pass by pass',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software (POD14A v100)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});

})();
