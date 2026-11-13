/* =====================================================================
   POD22 — half-rack stereo loudness meter, AES or analog in (Ward-Beck Systems, 2002|35–2011|44, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.htm). Full model: the PIC16F874 controller is emulated
   pass by pass and the ADSP-21065L SHARC metering runs sample by sample, through the real display tables.

   Sources (all under "#POD #SERIES/XXX - POD22 - #Master # Obsolte/" unless noted):
   - POD22 - #Engineering/sharc/v102/vms44_main.asm (DSB Oct 4 2002: sport0_isr, translate_meter_results, shift_led_data,
       mux_ctl, sample_rate_calc, refresh_lock_status, ppm_hold_l/r, test_peaks_*, update_meter_cal), vumeter.asm/.h
       (VUMeterCalc / VUMeterGet), phasemeter.asm/.h, vms44_INIT.ASM (SPORT0 I²S, SPORT1 10-bit multichannel, flag flush),
       vms44_ISR_table.ASM, sdm_vu_data_1..3.dat, sdm_pk_data_1..3.dat, sdm_phase_data.dat, halfdb_data.dat, trim_data.dat,
       point_one_dB_table.dat  ·  sharc/v100, v101, v102.1 (custom), v103 (2011, slm1_* tables) for the version history
   - POD22 - #Engineering/Software/v103/pod22v3.asm (May 16 2006: MAIN, read8420s, cs8420lockprocess, resetsharcprocess,
       refresh8420_1, sharc, read_jumpers, autodetect, refresh_sharc_registers), init.asm, modes.asm, uart.asm
       · Software/v100, v101, v102, working/{no_com,com,proto2}, 554265/ (Nov 2 2004 “Pod 22 communicating with 2 POD23s”)
   - POD22 - #Engineering/PCB/Pod22-1-ISS2.net, .bom (P-CAD netlist and BOM of the main board), GERBERS/ISS2/notes.txt
   - POD22 - #Engineering/MANUAL/POD22 MANUAL.pdf (Jan 2003), jumpers version 1_00.pdf / 1_01.wpd, POD22 Cutsheet.wpd,
       latest (oct.17 2013)/POD22 MANUAL.doc (POD22A text), Backup_of_Pod22manu.pdf, POD22 - Functional Diagram.pdf
   - POD22 - #Engineering/SILK/POD22-Silk.cdr (Jan 9 2003) → Inkscape (libcdr) → assets/pod22-front-green.png,
       pod22-front-white.png, pod22-rear-white.png. libcdr loses Corel's text alignment and the rotated scale numbers, so the
       labels were re-anchored against Photos/POD22 Front @ Full.jpg and POD22 Rear.jpg and the scale is redrawn here.
   - POD22 - #Mechanical #DA #2016/POD22-M1 ISS 1 (FRONT PANEL).pdf, POD22-M2 ISS 2 (REAR PANEL).pdf (rotated upright;
       the rear drawing is viewed from inside, so its x positions are mirrored for the outside view)
   - ../POD21 - #Master/POD21 - #TESTREPORT/POD22-V103-13JUN11.pdf (misfiled POD22 test report, found by the POD22A plugin)
   - ../POD23 - #Engineering/…/POD23Com/POD22/pod22v2.asm (the copy the POD22A plugin traced; = Software/working/proto2)
   Related plugins: pod22a.js (same rear, POD22 code traced from POD23), pod23.js (the control panel), slm.js, pod3a.js.
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
      ${card(cfg.rearTitle||'Rear panel — click the connectors', `<div id="rp"></div>${cfg.artNote?`<div class="small muted" style="margin-top:4px">Front and rear artwork: ${SIM.src('#POD #SERIES/XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/SILK/POD22-Silk.cdr','SILK/POD22-Silk.cdr')} (Jan 9 2003), FRONT GREEN, FRONT WHITE and REAR WHITE plates; its labels are live Arial text, re-anchored, and the scale numbers are drawn by the simulator.</div>`:''}`)}
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

/* ======================= POD22 model ======================= */
const PREFIX = 'pod22';
const Y = y => SIM.year(y);
const hex = (v,n) => (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bin = (v,n) => (v>>>0).toString(2).padStart(n||18,'0');

/* ---- PIC16F874 (U6) timing. The PIC is clocked by PLL1700E pin 14 (net PIC_CLOCK); its frequency is not in the archive.
   init.asm sets TXSTA = 0x20 (BRGH = 0) and SPBRG = 13 for "9600 baud" → Fosc = 9600·64·14 = 8.6016 MHz (inferred). ---- */
const FOSC = 9600*64*14;
const TCY = 4/FOSC;
const PASS_STEPS = [   // MAIN loop of pod22v3.asm, estimated instruction cycles per step (counted from the code, inferred)
  ['read8420s ×2', 300, 'CS8427 reg 16: bit 4 = 1 → no lock'], ['resetsharcprocess', 8, 'analog: pulse SHARC reset once'],
  ['cs8420lockprocess', 12, 'every 10 passes: OMCK or run/stop'], ['refresh8420_1', 870, 'regs 1–6, 9, 17 rewritten every pass'],
  ['read_jumpers', 22, 'DIPs → jumper0, address'], ['analog_mode · digital_mode', 18, 'clock source, porte 75/110'],
  ['autodetect', 12, 'flip 75/110 every 100 passes'], ['refresh_sharc_registers', 14, 'cal, jumper0, lock, COM'],
  ['sharc', 1540, '17 × 10-bit words on SPORT1 + 0xAA check'], ['uart_rx · uart_process · uart_tx · uart_control · tx_timer', 44, 'one RS-485 byte per pass'] ];
const PASS_CYC = PASS_STEPS.reduce((a,s)=>a+s[1],0);           // ≈ 2,840 cycles
const PASS = PASS_CYC*TCY;                                      // ≈ 1.32 ms (inferred)
const STEP_T0 = (()=>{ let a=0; return PASS_STEPS.map(s=>{ const r=a; a+=s[1]; return r*TCY; }); })();
/* init.asm delay loops (clrwdt/decfsz/goto = 4 cycles × 256, × 255, × 5) before the resets are released */
const INIT = { release: (5*255*(256*4+3) + 255*(256*4+3))*TCY, main: (5*255*(256*4+3) + 2*255*(256*4+3) + 200)*TCY };
const DETECT = 100, DETECT1 = 7, RSDELAY = 10, SERIAL_TIME = 200, TIMER_UART = 55, BROWN_COUNT = 20;
const COM_HOLD = 256*(256-SERIAL_TIME);                          // uart_control: 14,336 passes
const BYTE_T = 10/9600;

/* ---- ADSP-21065L (U4). emuclk counts per sample in sample_rate_calc's comments (48k = 1024) → 49.152 MHz core (inferred: 24.576 MHz × 2). ---- */
const CORE = 49.152e6;
const MUX_RATE = 300, SHIFT_CLKS = 36, HOLD_N = 200000, PK_THRESH = 0.7079457;
const TC = {   // sample_rate_calc / update_meter_parameters_xx (vms44_main.asm v102)
  32000: {VU:0.0005754806, ATT:0.03394912, D1:0.0000575630, D2:0.0001151226, bits:0},
  44100: {VU:0.0004176153, ATT:0.02475070, D1:0.0000417694, D2:0.000083537,  bits:1<<10},
  48000: {VU:0.0003836906, ATT:0.02276277, D1:0.0000383757, D2:0.0000767499, bits:1<<11},
  96000: {VU:0.0001918637, ATT:0.01138138, D1:0.0000191880, D2:0.0000383757, bits:1<<12} };
const LOCKW = { LOCK:1<<8, COM:1<<9, R441:1<<10, R48:1<<11, R96:1<<12, ERROR:1<<13 };   // v102 refresh_lock_status
const MCAL = { v102:[-6,-2,2,6], 'v102.1':[-6,-2,2,10] };                               // meter_cal0..3
const AOUT = { v102:[1.041357,0.8271792,0.6570517,0.5219148], 'v102.1':[1.041357,0.8271792,0.6570517,0.5219148*0.79342] };
const A_IN_CAL = 1.013911;
const ADC_FS = 24 + 20*Math.log10(A_IN_CAL);     // +24.12 dBu sine at A/D full scale: +4 dBu then reads 0 VU (−20 dBFS after a_in_cal), and −3 dBFS = +21 dBu, the PK threshold in jumpers 1_01 (inferred)
const DAC_FS = 24 - 20*Math.log10(1.041357);     // +23.65 dBu: −20 dBFS leaves as +4 dBu through a_out_cal0[0] (inferred)
const BOOT = 0.02, TLOCK = 0.008;                // SHARC reboot from the AM29LV040B and CS8427 PLL lock time (both inferred)
const halfdb = k => k<=0 ? 0 : Math.pow(10,(k-195)/40);   // halfdb_data.dat: 0 = off, 1 = −97 dB … 195 = 0 dB … 255 = +30 dB
/* the display tables, run-length coded from the .dat files (count, 32-bit word) */
const TBL_RLE={vu1:[13,0x1ffff,2,0xffff,2,0x7fff,2,0x3fff,2,0x1fff,2,0xfff,2,0x7ff,2,0x3ff,2,0x1ff,2,0xff,2,0x7f,2,0x3f,2,0x1f,2,0xf,2,0x7,2,0x3,213,0x1],vu2:[45,0x1ffff,2,0xffff,2,0x7fff,2,0x3fff,2,0x1fff,2,0xfff,2,0x7ff,2,0x3ff,2,0x1ff,2,0xff,2,0x7f,2,0x3f,2,0x1f,2,0xf,4,0x7,4,0x3,177,0x1],vu3:[83,0x1ff,4,0xff,4,0x7f,4,0x3f,4,0x1f,8,0xf,8,0x7,8,0x3,133,0x1],pk1:[13,0x10001,2,0x8001,2,0x4001,2,0x2001,2,0x1001,2,0x801,2,0x401,2,0x201,2,0x101,2,0x81,2,0x41,2,0x21,2,0x11,2,0x9,2,0x5,2,0x3,219,0x1],pk2:[43,0x1,2,0x10001,2,0x8001,2,0x4001,2,0x2001,2,0x1001,2,0x801,2,0x401,2,0x201,2,0x101,2,0x81,2,0x41,2,0x21,2,0x11,2,0x9,4,0x5,4,0x3,183,0x1],pk3:[79,0x1,4,0x101,4,0x81,4,0x41,4,0x21,4,0x11,8,0x9,8,0x5,8,0x3,139,0x1],ph:[36,0x3f800,36,0x1f800,36,0xf800,40,0x7800,36,0x3800,36,0x3000,37,0x1000]};
const TBL = {}; for (const k in TBL_RLE){ const r=TBL_RLE[k], a=[]; for (let i=0;i<r.length;i+=2) for (let n=0;n<r[i];n++) a.push(r[i+1]); TBL[k]=a; }
const TBL_FILE = { vu1:'sdm_vu_data_1.dat', vu2:'sdm_vu_data_2.dat', vu3:'sdm_vu_data_3.dat', pk1:'sdm_pk_data_1.dat', pk2:'sdm_pk_data_2.dat', pk3:'sdm_pk_data_3.dat', ph:'sdm_phase_data.dat' };
/* the 41 bar positions, left to right, as on the silk: chip C bits 1–8, chip B bits 1–16, chip A bits 1–16, (gap), PK = chip A bit 17 */
const SCALE = ['PR','36','32','28','26','24','22','20','18','16','15','14','13','12','11','10','9','8','7','6','5','4','3','2','1','0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','','PK'];
const segX = p => 476 + 20*p;                 // centre, silk pixels (200 dpi): label x from POD22-Silk.cdr + photo offset
const ROWY = [132, 190], PHX = 411, PHY0 = 100, TALLY_Y = 271;
const TALLY = [['LOCK',600,LOCKW.LOCK],['COM',697,LOCKW.COM],['44.1K',799,LOCKW.R441],['48K',898,LOCKW.R48],['96K',995,LOCKW.R96],['ERROR',1089,LOCKW.ERROR]];
const PH_ORDER = [12,13,11,14,15,16,17];      // top (+1) → bottom (−1): the order that makes the table fill from +1 (inferred wiring)
function segColor(p){ if (p===41) return '#ff3b30'; if (p<=18) return '#c9e43a'; if (p<=23) return '#ff9a2a'; if (p<=26) return '#b9f05a'; if (p<=33) return '#ff9a2a'; return '#ff3b30'; }
const PH_COL = ['#b9f05a','#d8ec3a','#ff9a2a','#ff9a2a','#ff5a3a','#ff3b30','#ff3b30'];
const DIPS = ['BRIGHT','A/D','BS0','BS1','CAL0','CAL1','A0','A1'];
const DIP_PIN = ['RD6 (pin 4)','RD7 (pin 5)','RB4 (pin 14)','RB0 (pin 8)','RB1 (pin 9)','RB2 (pin 10)','RD4 (pin 2)','RD5 (pin 3)'];
const DIP_TEST = ['btfss → jumper0,0','btfsc → jumper0,1 (inverted)','btfss → jumper0,2','btfss → jumper0,3','btfss → jumper0,4','btfss → jumper0,5','btfss → address,1','btfss → address,0'];

/* ---------------- device state ---------------- */
const D = {
  dip:{BRIGHT:1,'A/D':1,BS0:1,BS1:0,CAL0:0,CAL1:0,A0:0,A1:0},   // 1 = lever ON (pin pulled low)
  in:{bnc:true, phx:false, ana:true}, closure:false,                // closure = DB9 pin 1 to pin 9 (wired to RD7 with the A/D DIP)
  fs:48000, dsp:'v102',
  prog:{type:'tone', f:1000, dbfs:-20, dbu:4, rmode:'same'},
  chg:null,            // last input/mode change {t, before:{dig,bnc,phx}}
  powerAt:null,        // power switched on at this time (null = running since before the second began)
  frames:[],           // RS-485 frames sent by a POD23 {t, bytes, label}
  log:[] };
const FACT = JSON.parse(JSON.stringify(D));
const digitalCfg = (dip, closure) => !(dip['A/D']===0 && !closure);       // jumper0,1 = RD7 high = A/D OFF and no closure → analog
const digital = () => digitalCfg(D.dip, D.closure);
const jumper0 = () => (D.dip.BRIGHT?1:0) | (digital()?0:2) | (D.dip.BS0?4:0) | (D.dip.BS1?8:0) | (D.dip.CAL0?16:0) | (D.dip.CAL1?32:0);
const address = () => (D.dip.A0?2:0) | (D.dip.A1?1:0);
const calIdx = () => (D.dip.CAL1?2:0) + (D.dip.CAL0?1:0);
const calRef = () => [-20,-18,-16,-14][calIdx()] + (D.dsp==='v102.1' && calIdx()===3 ? 2 : 0);
const cfgNow = () => ({dig:digital(), bnc:D.in.bnc, phx:D.in.phx});

/* ---------------- programme (what is plugged in) ---------------- */
function env(t){ const s=D.prog.type;
  if (s==='silence') return 0; if (s==='bursts') return (((t%0.5)+0.5)%0.5)<0.12 ? 1 : 0; if (s==='step') return t>=0.2 ? 1 : 0;
  if (s==='speech'){ const e=0.5+0.5*Math.sin(2*Math.PI*3.1*t)*Math.sin(2*Math.PI*0.7*t+1); return Math.max(0,e)*(0.75+0.25*Math.sin(2*Math.PI*11*t)); }
  return 1; }
function srcPeak(dig){ return dig ? Math.pow(10, D.prog.dbfs/20) : Math.pow(10,(D.prog.dbu-ADC_FS)/20); }   // sine peak re full scale (AES: dBFS of the peak; analog: dBu rms)
function srcSample(ch, t, dig){ const a = srcPeak(dig)*env(t), w=2*Math.PI*D.prog.f*t, m=D.prog.rmode;
  if (ch===0) return m==='ronly' ? 0 : a*Math.sin(w);
  if (m==='lonly') return 0; const ph = m==='90'?Math.PI/2 : m==='180'?Math.PI : 0; return a*Math.sin(w+ph); }

/* ======================= PIC emulation, pass by pass ======================= */
let VER=1, EM=null, EM_VER=0;
const bump = ()=>{ VER++; };
function emulate(){
  if (EM && EM_VER===VER) return EM; EM_VER=VER;
  const cfgAt = t => (D.chg && t < D.chg.t) ? D.chg.before : cfgNow();
  const powered = D.powerAt!=null;
  const tMain = powered ? D.powerAt + INIT.main : 0;
  const resets = [];                                    // SHARC reset pulses (porta,4)
  if (powered) resets.push({t:D.powerAt + INIT.release, why:'init.asm: bsf resetsharc (power-up)'});
  const c0 = cfgAt(-1);
  const sig = (c,port) => port===75 ? c.bnc : c.phx;
  const fsOK = D.fs>=30000 && D.fs<=108000;
  // PIC state at the first pass
  let S;
  if (powered) S = {port:75, portAt:tMain, lock:0, conf:0, m0:0,m1:0,m2:0,m3:0, b6:0, bcount:DETECT, bcount1:DETECT, rs:4, sc:0, level:195, delay:0, sto:0, ut:TIMER_UART, txf:0, count:0, buf:0, cmd:0, prevDig:null};
  else { const p0 = c0.bnc ? 75 : c0.phx ? 110 : 75, ok = c0.dig && sig(c0,p0) && fsOK;
    S = {port:p0, portAt:-1, lock:ok?1:0, conf:ok?1:0, m0:c0.dig?(ok?1:0):1, m1:c0.dig?0:1, m2:c0.dig?0:1, m3:c0.dig?1:0, b6:(c0.dig&&!ok)?1:0,
         bcount:DETECT, bcount1:DETECT1, rs:RSDELAY, sc:0, level:195, delay:0, sto:0, ut:TIMER_UART, txf:0, count:0, buf:0, cmd:0, prevDig:c0.dig}; }
  // RS-485 byte stream
  const bytes=[]; D.frames.forEach(f=> f.bytes.forEach((b,k)=> bytes.push({t:f.t+(k+1)*BYTE_T, b, f})) ); bytes.sort((a,b)=>a.t-b.t);
  let bi=0; const fifo=[]; let oerr=false;
  const passes=[], uartLog=[], replies=[], gainEv=[{t:-1, level:195}], scEv=[{t:-1, sc:0}];
  const setSc=(t,v)=>{ if (S.sc!==v){ S.sc=v; scEv.push({t,sc:v}); } };
  const setLevel=(t,v)=>{ if (S.level!==v){ S.level=v; gainEv.push({t,level:v}); } };
  const unity=(t)=>{ setLevel(t,195); S.delay=0; };
  for (let k=0; ; k++){
    const t = tMain + k*PASS; if (t>1.0001) break;
    const c = cfgAt(t);
    // receive bytes into the 2-deep USART FIFO (overrun if a third completes while it is full)
    while (bi<bytes.length && bytes[bi].t<=t){ if (fifo.length>=2) { oerr=true; uartLog.push({t:bytes[bi].t, b:bytes[bi].b, note:'OERR: FIFO full, byte lost'}); } else fifo.push(bytes[bi]); bi++; }
    // read8420s ×2
    const portOn = c.dig ? S.port : 0;
    S.lock = (c.dig && sig(c,S.port) && fsOK && (t - Math.max(S.portAt, (D.chg && t>=D.chg.t) ? D.chg.t : -1)) >= TLOCK) ? 1 : 0;
    // resetsharcprocess (jumper0,1 set = analog)
    if (!c.dig){ if (S.m0){ if (!S.m1){ resets.push({t, why:'resetsharcprocess: analog mode, reset once (mode,1)'}); S.m1=1; } } else S.m1=0; }
    // cs8420lockprocess
    if (c.dig){ if (--S.rs<=0){ S.rs=RSDELAY;
        if (S.b6){ if (S.m0){ resets.push({t, why:'cs8420lockprocess → force_runstop_1: run/stop the CS8427, pulse SHARC reset'}); S.b6=0; } }
        else if (!S.m0){ S.b6=1; } } }
    // analog_mode / digital_mode
    if (!c.dig){ S.m0=1; if (!S.m2) S.m1=0; S.m2=1; S.lock=0; S.b6=0; S.m3=0; }
    else { if (!S.m3){ S.m1=0; } S.m3=1; S.m2=0; }
    // autodetect
    if (c.dig){
      if (S.lock){ if (!S.conf){ if (--S.bcount1<=0){ S.bcount1=DETECT1; S.bcount=DETECT; S.conf=1; } } else { S.m0=1; S.bcount1=DETECT1; S.bcount=DETECT; } }
      else if (--S.bcount<=0){ S.bcount1=DETECT1; S.bcount=DETECT; S.port = S.port===75?110:75; S.portAt=t; S.conf=0; S.m0=0; }
    }
    // uart_rx: one byte per pass (rxerror2 first if an overrun happened)
    let rx=null;
    if (oerr){ oerr=false; fifo.length=0; S.count=0; S.buf=0; uartLog.push({t, note:'rxerror2: CREN toggled, frame parser cleared'}); }
    else if (fifo.length){ rx=fifo.shift(); const b=rx.b; let note='';
      if (b===0xFF){ S.count=0; S.buf=0xFF; note='FF: framing → uart_count = 0'; }
      else { S.sto=0;   // uart_rx1 resets serial_timeout0/1 on every non-FF byte
        if (S.buf!==0xFF) note='ignored (no FF since the last frame)';
        else { S.count++;
          if (S.count===1 || S.count===5){ if (b===address()) note='check_address: '+hex(b)+' = address '+address()+' ✓';
            else { setSc(t,0); unity(t); S.buf=0; S.count=0; note='check_address: '+hex(b)+' ≠ address '+address()+' → clrf serial_control, gains back to 195 (unity)'; } }
          else if (S.count===2){ S.cmd=b; note='check_command: command = '+b; }
          else if (S.count===3){ const nm=['level','delay','target','ratio','range','threshold','peak limit'][S.cmd]||'(past the jump table)';
            if (S.cmd===0 || S.cmd>6){ S.pendLevel=b; } if (S.cmd===1) S.pendDelay=b; S.rxf=1; S.txf|=1; note='check_data: '+nm+' = '+b+(S.cmd===0?' ('+((b-195)/2>=0?'+':'')+((b-195)/2)+' dB, halfdb_data['+b+'])':''); }
          else if (S.count===4){ S.rxf=1; S.txf|=1; note='byte11: peak limit = '+b; }
          else { setSc(t,0); unity(t); S.buf=0; S.count=0; note='table300 overrun → check_address with W = uart_count → mismatch → unity'; }
        } }
      uartLog.push({t, b, note});
    }
    // uart_process: copies the level to sharc_out+9/11/13/15, sets serial_control and clears the parser
    if (S.rxf){ S.rxf=0; S.count=0; S.buf=0; if (S.pendLevel!=null){ setLevel(t,S.pendLevel); S.pendLevel=null; } if (S.pendDelay!=null){ S.delay=S.pendDelay; S.pendDelay=null; } setSc(t,1); }
    // uart_tx (reply 0x81 two passes after tx_timer fires)
    if (S.txf & 4){ if (!(S.txf & 128)) S.txf|=128; else if (!(S.txf & 2)){ S.txf|=2; replies.push({t, b:0x81}); } else if (t >= replies[replies.length-1].t + BYTE_T){ S.txf=0; } }
    // uart_control: serial_control times out after 14,336 passes with no byte
    if (S.sc){ if (++S.sto >= COM_HOLD){ setSc(t,0); unity(t); } }
    // tx_timer
    if (S.txf & 1){ if (--S.ut<=0){ S.ut=TIMER_UART; S.txf=(S.txf & ~1) | 4; } }
    passes.push({t, port:portOn, lock:S.lock, conf:S.conf, m0:S.m0, b6:S.b6, sc:S.sc, level:S.level, rx});
  }
  EM = {passes, resets, uartLog, replies, gainEv, scEv, tMain, powered, bytes};
  return EM;
}
function passIdx(t){ const E=emulate(); if (t < E.tMain) return -1; return Math.min(E.passes.length-1, Math.floor((t-E.tMain)/PASS)); }
function passAt(t){ const i=passIdx(t); return i<0 ? null : emulate().passes[i]; }
function lockAt(t){ const p=passAt(t); return !!(p && p.lock); }
function scAt(t){ const p=passAt(t); return !!(p && p.sc); }
function levelAt(t){ const p=passAt(t); return p ? p.level : 195; }
function digAt(t){ return (D.chg && t < D.chg.t) ? D.chg.before.dig : digital(); }
function lastResetBefore(t){ let r=null; emulate().resets.forEach(x=>{ if (x.t<=t) r=x; }); return r; }
function sharcState(t){ const E=emulate();
  if (E.powered && t < D.powerAt) return 'off-before';
  if (E.powered && t < E.resets[0].t) return 'held';
  const r=lastResetBefore(t); if (r && t < r.t+BOOT) return 'boot'; return 'run'; }
function isrRate(t){ return digAt(t) ? (lockAt(t) ? D.fs : 48000) : 48000; }     // unlocked: CS8427 serial port runs from OMCK (inferred 48 kHz)
function rateClass(fs){ return fs<=0?48000 : (Math.abs(CORE/fs-516)<=10)?96000 : (Math.abs(CORE/fs-1025)<=10)?48000 : (Math.abs(CORE/fs-1110)<=10)?44100 : (CORE/fs<819)?96000 : (CORE/fs<1070)?48000 : (CORE/fs<1365)?44100 : 32000; }
function rateBits(fs){ const d=CORE/fs; if (Math.abs(516-d)<=10) return LOCKW.R96; if (Math.abs(1025-d)<=10) return LOCKW.R48; if (Math.abs(1110-d)<=10) return LOCKW.R441; return 0; }

/* ======================= SHARC metering, sample by sample ======================= */
let MT=null, MT_VER=0;
const vget = ms => ms>0 ? Math.round(Math.min(-20*Math.log10(ms), 255)) : 255;   // VUMeterGet: −2·10·log10(mean square), ≤ 255, fix
function meterRun(){
  const E = emulate();
  if (MT && MT_VER===VER) return MT; MT_VER=VER;
  const P=E.passes, tM=E.tMain, chgT=D.chg?D.chg.t:-1, digB=D.chg?D.chg.before.dig:null, digN=digital();
  const pAt = t => (t<tM && E.powered) ? null : P[Math.max(0,Math.min(P.length-1, Math.floor((t-tM)/PASS)))];
  const dAt = t => (D.chg && t<chgT) ? digB : digN;
  const rTimes = E.resets.map(r=>r.t);
  const stAt = t => { if (E.powered && t < D.powerAt) return 'off-before'; if (E.powered && t < rTimes[0]) return 'held';
    let r=null; for (const x of rTimes) if (x<=t) r=x; return (r!=null && t<r+BOOT) ? 'boot' : 'run'; };
  const frames=[], bins=[]; const NB=1000;
  let vu=[0,0], ppm=[0,0], S_=0, Dd=0, pkc=[0,0], holdc=[0,0], hold=[255,255], mux=MUX_RATE, bit31=0, lastRst=-9, nIsr=0, lastFrameT=-1;
  let t = E.powered ? 0 : -0.6; let bin=0;   // pre-roll: a unit that was already running has settled ballistics at t = 0
  const resets = E.resets.map(r=>r.t);
  let ri = 0; while (ri<resets.length && resets[ri] < 0) ri++;
  while (t < 1){
    const pp = pAt(t), lk = !!(pp && pp.lock), dg = dAt(t), fs = dg ? (lk ? D.fs : 48000) : 48000, dt = 1/fs;
    // SHARC reset?
    while (ri<resets.length && resets[ri] <= t){ vu=[0,0]; ppm=[0,0]; S_=0; Dd=0; pkc=[0,0]; holdc=[0,0]; hold=[255,255]; mux=MUX_RATE; bit31=0; lastRst=resets[ri]; ri++; }
    const st = stAt(t);
    if (st==='run'){
      nIsr++;
      const dig = dg, g = halfdb(pp?pp.level:195) * (dig?1:A_IN_CAL);
      const audioOK = dig ? lk : true;
      let x0=0, x1=0;
      if (audioOK){ x0=srcSample(0,t,dig); x1=srcSample(1,t,dig); if (!dig){ x0=Math.max(-1,Math.min(1,x0)); x1=Math.max(-1,Math.min(1,x1)); } x0*=g; x1*=g; }
      const c = TC[rateClass(fs)], dec = D.dip.BS0 ? c.D2 : c.D1;
      const xs=[x0,x1];
      for (let ch=0; ch<2; ch++){ const q=xs[ch]*xs[ch]; vu[ch]+=(q-vu[ch])*c.VU; const e=q-ppm[ch]; ppm[ch]+= Math.max(e*c.ATT, e*dec);
        if (Math.abs(xs[ch])>PK_THRESH) pkc[ch]=HOLD_N; else if (pkc[ch]>0) pkc[ch]--;
        if (holdc[ch]>0) holdc[ch]--; }
      S_ = 0.999*S_ + 0.001*Math.abs(x0+x1); Dd = 0.999*Dd + 0.001*Math.abs(x0-x1);
      if (--mux<=0){ mux=MUX_RATE; bit31^=1;   // mux_ctl → translate_meter_results
        const cal = dig ? MCAL[D.dsp][calIdx()] : MCAL[D.dsp][0];
        const lockRaw = lk, forced = dig && !lockRaw;
        const vr=[0,1].map(ch=> forced?255 : Math.max(0,Math.min(255, vget(vu[ch])+cal)));
        const pr=[0,1].map(ch=> forced?255 : Math.max(0,Math.min(255, vget(ppm[ch])+cal)));
        let y = (S_+Dd >= 1e-4) ? (S_-Dd)/(S_+Dd) : 0; y=Math.max(-1,Math.min(1,y)); const ph = forced?255 : Math.trunc(128*y+128);
        // ppm_hold_l / _r (BS1), evaluated here once per frame (the ISR does it every sample)
        for (let ch=0; ch<2; ch++){ if (D.dip.BS1){ if (pr[ch] <= hold[ch]){ hold[ch]=pr[ch]; holdc[ch]=HOLD_N; } else if (holdc[ch]<=0) hold[ch]=255; } else hold[ch]=255; }
        let lw = 0;
        if (dig){ lw = (lockRaw?LOCKW.LOCK:0) | (pp&&pp.sc?LOCKW.COM:0) | rateBits(fs); if (!lockRaw) lw |= LOCKW.ERROR; }
        const led=[pkc[0]>0, pkc[1]>0];
        const W = words(vr, pr, hold, ph, led, lw);
        const dimBlank = !D.dip.BRIGHT && bit31 && !forced;
        frames.push({t, vr, pr, hold:hold.slice(), ph, y, led, lw, W, dimBlank, forced, bit31, fs, cal, dig});
      }
    }
    t += dt;
    const b = Math.floor(t*NB);
    if (t>=0 && b>bin){ while (bin<b && bin<NB){ bins.push({vu:vu.slice(), ppm:ppm.slice(), led:[pkc[0]>0,pkc[1]>0], y:(S_+Dd>=1e-4)?(S_-Dd)/(S_+Dd):0, st}); bin++; } }
  }
  while (bins.length<NB) bins.push(bins[bins.length-1]||{vu:[0,0],ppm:[0,0],led:[false,false],y:0,st:'run'});
  MT = {frames, bins, nIsr}; return MT;
}
/* translate_meter_results (v102): three MM5450 data lines × (left 18 bits + right 18 bits) */
function words(vr, pr, hold, ph, led, lw){
  const T=TBL, pk=i=>Math.min(261,i+6);
  const AL = T.vu1[vr[0]] | T.pk1[pk(pr[0])] | (led[0]?1<<17:0) | (T.pk1[pk(hold[0])] & ~2);
  const BL = T.vu2[vr[0]] | T.pk2[pk(pr[0])];
  const CL = T.vu3[vr[0]] | T.pk3[pk(pr[0])] | T.ph[Math.min(256,ph)];
  const AR = ((T.vu1[vr[1]] | T.pk1[pk(pr[1])] | (led[1]?1<<17:0) | T.pk1[pk(hold[1])]) >>> 1);     // right: the −1 mask is applied after the OR (no effect)
  const BR = (T.vu2[vr[1]] | T.pk2[pk(pr[1])]) >>> 1;
  const CR = ((T.vu3[vr[1]] | T.pk3[pk(pr[1])]) >>> 1) | lw;
  return {AL,BL,CL,AR,BR,CR};
}
/* bits → panel: lit[row][pos], phase[7], tallies */
function decode(W, blank){
  const lit=[new Array(42).fill(false), new Array(42).fill(false)], phase=new Array(7).fill(false); let lw=0;
  if (!W || blank) return {lit, phase, lw:0};
  for (let n=1;n<=16;n++){ if (W.AL>>n&1) lit[0][23+n]=true; if (W.BL>>n&1) lit[0][7+n]=true; }
  if (W.AL>>17&1) lit[0][41]=true;
  for (let n=1;n<=8;n++) if (W.CL>>n&1) lit[0][n-1]=true;
  for (let m=0;m<16;m++){ if (W.AR>>m&1) lit[1][24+m]=true; if (W.BR>>m&1) lit[1][8+m]=true; }
  if (W.AR>>16&1) lit[1][41]=true;
  for (let m=0;m<8;m++) if (W.CR>>m&1) lit[1][m]=true;
  PH_ORDER.forEach((b,i)=>{ if (W.CL>>b&1) phase[i]=true; });
  lw = W.CR & 0x3f00;
  return {lit, phase, lw};
}
function frameAt(t){ const F=meterRun().frames; let lo=0, hi=F.length-1, r=-1; while (lo<=hi){ const m=(lo+hi)>>1; if (F[m].t<=t){ r=m; lo=m+1; } else hi=m-1; } return r<0?null:F[r]; }
function displayAt(t){ const st=sharcState(t); if (st!=='run') return {st, d:decode(null,true), f:null};
  const f=frameAt(t); const r=lastResetBefore(t); if (!f || (r && f.t < r.t)) return {st:'flushed', d:decode(null,true), f:null};
  return {st, d:decode(f.W, false), f}; }
function binAt(t){ const B=meterRun().bins; return B[Math.max(0,Math.min(B.length-1,Math.floor(t*1000)))]; }
const msDb = ms => ms>1e-14 ? 10*Math.log10(ms) : -140;
function readings(t){ const f=frameAt(t); if (!f) return null; const vu=v=> (40 - v)/2, pk=v=>(34 - v)/2;
  return { vu:f.vr.map(vu), pk:f.pr.map(pk), hold:f.hold.map(h=>h>=255?null:pk(h)), ph:f.ph, y:f.y, led:f.led, f }; }

/* ======================= actions (each logs the real code path) ======================= */
const actK = makeActor(D, ()=>{ const r=readings(SIM.t); return `${digital()?'AES':'analog'} · ${r?'L VU '+fdb(r.vu[0])+' dB':'display dark'} · ${lockAt(SIM.t)?'LOCK':digital()?'ERROR':'no tallies'}`; });
const act = (name, fn) => actK(name, tr=>{ fn(tr); bump(); });
function markChange(){ const before = D._cfgBefore || cfgNow(); D.chg = {t:SIM.t, before}; }
const A = {
  dip(n){ const i=DIPS.indexOf(n); act(`Rear DIP ${i+1} ${n} → ${D.dip[n]?'OFF':'ON'}`, tr=>{
    D._cfgBefore = cfgNow(); D.dip[n]^=1;
    tr(`read_jumpers (next PIC pass): dip${i+1} on ${DIP_PIN[i]} — ${DIP_TEST[i]}. Lever ON pulls the pin low (10 k pull-up in R45/R47, 100 Ω in R44/R46).`);
    if (n==='A/D'){ markChange();
      if (digital()) tr('A/D ON → RD7 low → jumper0,1 = 0 → DIGITAL. (The 2003 manual says ON = Analog; the code reads it the other way.) digital_mode: CS8427 reg1 0000 0100 (RMCK), reg3 1000 1101, reg4 0100 1001; porte enables one AES receiver; autodetect starts.');
      else tr('A/D OFF → RD7 high → jumper0,1 = 1 → ANALOG. analog_mode: mode,0 set, CS8427 reg1 1000 0100 (OMCK), reg3 1000 1010, reg4 0100 0101; both AES receivers disabled (porte 0 and 1 high); resetsharcprocess pulses the SHARC reset once.');
      tr('SHARC sport0_isr tests anc_data[0] & 2 every sample: 0 → aes_input (dma_in_a), 1 → analog_input (dma_in_a+2/+3, the CS5333 words).'); }
    else if (n==='BS0') tr(`sample_rate_calc → update_meter_parameters: anc_data[0] & 4 → PPM decay = ${D.dip.BS0?'peak_decay_2 (type 1: 24 dB in 1.5 s)':'peak_decay_1 (type 2: 24 dB in 3 s)'} written into vumeter_wspace[2] on every sample.`);
    else if (n==='BS1') tr(D.dip.BS1?'BS1 ON (anc_data[0] & 8): ppm_hold_l / ppm_hold_r run every sample; a new peak at or above the held one restarts ppm_counter = 200,000 samples. Held dots show only through pk_data_1 (−1 … +14).':'BS1 OFF: bs1_is_off0 writes 255 into ppm_hold_left/right (no hold dot).');
    else if (n==='CAL0'||n==='CAL1') tr(`update_meter_cal: AES mode → meter_cal = meter_cal${calIdx()} = ${MCAL[D.dsp][calIdx()]}, a_out_cal = ${AOUT[D.dsp][calIdx()].toFixed(4)} → 0 VU = ${calRef()} dBFS and the analog output stays at +4 dBu. In analog mode the CAL levers are ignored (meter_cal0).`);
    else if (n==='A0'||n==='A1') tr(`address = ${address()} (dip7 → address,1 = MSB, dip8 → address,0 = LSB — the manual calls dip7 “Address0”). check_address compares the second byte of every RS-485 frame with it.`);
    else tr(D.dip.BRIGHT?'BRIGHT ON (anc_data[0] & 1): translate_meter_results writes every frame.':'BRIGHT OFF: translate_meter_results blanks every other frame (BIT31) — 50 % duty at 80 Hz. Skipped while AES is unlocked (jump bright).');
    tr('refresh_sharc_registers: jumper0 → sharc_out+5 → SPORT1 word 2 → SHARC anc_data[0] (DMA, every pass).'); delete D._cfgBefore; }); },
  plug(k){ const nm={bnc:'AES IN 75 Ω BNC',phx:'AES IN 110 Ω Phoenix',ana:'ANALOG IN L/R'}[k];
    act(`${D.in[k]?'Disconnect':'Connect'} ${nm}`, tr=>{ D._cfgBefore=cfgNow(); D.in[k]=!D.in[k]; if (k!=='ana') markChange(); delete D._cfgBefore;
      if (k==='ana') tr(digital()?'Analog is not metered in digital mode (sport0_isr takes dma_in_a).':'NE5532 (U11) → CS5333 A/D (U8) → SPORT0 B (ADC_DATA) → analog_input: ×1.013911 (a_in_cal), × POD23 trim.');
      else { tr('read8420s (twice per pass): select byte 0010 0000, map = 16, read 0010 0001 → shiftin; bit 4 of register 16 = 1 means no lock.');
        tr('The receivers: U10 75176 behind T2 + R12 75 Ω (SEL_75A = RE1) and U9 75176 behind T1 + R11 110 Ω (SEL_110A = RE0); both outputs drive CS8427 RXP. porte picks one.');
        tr(`autodetect: no lock → bcount −1 each pass; at 0 flip lock75_110_1,0 (porte) and reload 100 → ${SIM.fmtDur(DETECT*PASS)} per try. Lock → bcount1 = 7 passes to confirm, then mode,0 → cs8420lockprocess (every 10 passes) does run/stop and pulses the SHARC reset.`); } }); },
  closure(){ act(`${D.closure?'Open':'Close'} DB9 pin 1 to pin 9 (CONTROL)`, tr=>{ D._cfgBefore=cfgNow(); D.closure=!D.closure; markChange(); delete D._cfgBefore;
    tr('Netlist: J1-1 → R46 (100 Ω) → U6 pin 5 = RD7, with R47 10 k pull-up — the same pin as the A/D lever (P2-4). A closure = A/D ON = digital (2013 manual: “switches … to digital when a closure is made on pin 1”).');
    tr(`Mode now ${digital()?'DIGITAL':'ANALOG'}.`); }); },
  fs(v){ act(`AES sample rate → ${v/1000} kHz`, tr=>{ D._cfgBefore=cfgNow(); D.fs=v; markChange(); delete D._cfgBefore;
    tr(`sport0_isr reads emuclk each sample: ${Math.round(CORE/v)} core cycles per sample (49.152 MHz, inferred).`);
    tr(`sample_rate_calc: |516−Δ| ≤ 10 → 96K, |1025−Δ| ≤ 10 → 48K, |1110−Δ| ≤ 10 → 44.1K, else no rate LED → ${({[LOCKW.R96]:'96K',[LOCKW.R48]:'48K',[LOCKW.R441]:'44.1K'})[rateBits(v)]||'none'}; ballistics from update_meter_parameters_${({96000:'96',48000:'48',44100:'441',32000:'32'})[rateClass(v)]}.`);
    if (v<30000||v>108000) tr('Outside the CS8427 range in this model: no lock.'); }); },
  frame(kind){ const ad=address(); const F={
      up:  {bytes:[0xFF,ad,0,207], label:`level +6 dB to address ${ad}`}, zero:{bytes:[0xFF,ad,0,195], label:`level 0 dB to address ${ad}`},
      dn:  {bytes:[0xFF,ad,0,183], label:`level −6 dB to address ${ad}`}, other:{bytes:[0xFF,(ad+1)&3,0,207], label:`level +6 dB to address ${(ad+1)&3} (another POD22)`},
      delay:{bytes:[0xFF,ad,1,10], label:`delay 10 to address ${ad}`}, v100:{bytes:[0xFF,0,0,1,207,0xAA], label:'POD23A v100 frame FF 00 00 01 CF AA'} }[kind];
    act(`POD23 sends ${F.label}`, tr=>{ D.frames.push({t:SIM.t, bytes:F.bytes, label:F.label}); D.frames.sort((a,b)=>a.t-b.t);
      tr(`RS-485 at 9600 Bd (U7 75176, J1 pins 3/8): ${F.bytes.map(b=>hex(b)).join(' ')} — ${SIM.fmtDur(BYTE_T)} per byte.`);
      tr('uart_rx (one byte per PIC pass): FF → uart_count = 0; byte 1 → check_address; byte 2 → check_command; byte 3 → check_data (jump table: level, delay, target, ratio, range, threshold, peak limit).');
      tr('uart_process: level → sharc_out+9/11/13/15 with 3 in +8/10/12/14 → SHARC word 0x3xx = table 3 (halfdb_data) entry xx; serial_control,0 = 1 → COM; the parser is cleared, so bytes after the data byte are ignored.');
      tr(`tx_timer: ${TIMER_UART} passes later uart_tx turns the 75176 round and sends 81 (1000 0001, “no leveler data needed”). COM stays on for ${COM_HOLD.toLocaleString()} passes (≈ ${(COM_HOLD*PASS).toFixed(1)} s) after the last byte.`); }); },
  power(){ act('Power switched on (rocker) at the playhead', tr=>{ D.powerAt=SIM.t; D.chg=null; D.frames=D.frames.filter(f=>f.t>=SIM.t);
    tr(`init.asm: ports, CS8427 / SHARC / CS5333 held in reset, then delay loops pdelay1 (≈ ${(5*255*1027*TCY).toFixed(3)} s) and pdelay (≈ ${(255*1027*TCY).toFixed(3)} s).`);
    tr(`At +${INIT.release.toFixed(3)} s: bsf reset8420, bsf resetsharc → the SHARC boots from the AM29LV040B (BMS) and runs Init_dsp (flushes the MM5450s with 100 clocks) → start.`);
    tr(`At +${INIT.main.toFixed(3)} s: bsf reset_adc → PRE_MAIN (refresh8420_1) → MAIN. Autodetect starts on 75 Ω; bcount1 is loaded with 100 (not 7) at power-up, so the first lock takes ${SIM.fmtDur(DETECT*PASS)} to confirm.`);
    if (SIM.t>0.05) tr('Seek to 0 and press again to watch the whole start-up inside this one-second window.'); }); },
  dsp(v){ act(`DSP firmware → ${v==='v102'?'v1.02':'v1.02.1 custom'}`, tr=>{ D.dsp=v;
    tr(v==='v102'?'sharc/v102: meter_cal3 = 6 → CAL 3 = −14 dBFS.':'sharc/v102.1 (Jan 25 2006, a customer build): meter_cal3 = 10 and a_out_cal0[3] × 0.79342 → CAL 3 becomes −12 dBFS.'); }); },
  set(k,v,label){ act(label, tr=>{ D.prog[k]=v; tr('Programme changed; the SHARC ballistics are recomputed sample by sample.'); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.log=[]; bump(); SIM.refresh(); },
};

/* ======================= panels =======================
   Artwork 2026|59: assets/pod22-front.svg (GREEN + WHITE plates) and pod22-rear.svg are vector, straight from SILK/POD22-Silk.cdr
   (Jan 9 2003) via Inkscape, cut between its crop marks (0 px offset against the old PNGs). That file keeps live Arial text, which
   libcdr places without Corel's alignment: each label was slid to the position of the photo-checked PNG it replaces, and the
   rotated scale numbers (which libcdr lays flat and overlapping) are left out of the SVG and drawn here from SCALE. */
const ASSETS = 'siumulation-plugins/assets/';
function frontSVG(t){
  const {st,d,f} = displayAt(t); const powered = !(st==='off-before');
  const dim = !D.dip.BRIGHT && f && !f.forced; const op = dim ? 0.5 : 1;
  let s = `<svg viewBox="0 0 1714 321" role="img" aria-label="POD22 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p22g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="8" fill="#151311"/><rect x="2" y="2" width="1710" height="317" rx="7" fill="none" stroke="#2c2824" stroke-width="3"/>`;
  const L = (x,y,w,h,on,col,title) => `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="2" fill="${on?col:'#2a2622'}" ${on?`opacity="${op}" filter="url(#p22g)"`:''}>${title?`<title>${title}</title>`:''}</rect>`;
  [0,1].forEach(row=>{ for (let p=0;p<42;p++){ if (p===40) continue; s += L(segX(p), ROWY[row], 14, 12, d.lit[row][p], segColor(p), `${row?'R':'L'} ${SCALE[p]}`); } });
  for (let i=0;i<7;i++) s += L(PHX, PHY0+20*i, 14, 11, d.phase[i], PH_COL[i], 'PHASE LED '+(i+1));
  s += L(976, 96, 13, 10, powered, '#ff3b30', '0 VU marker (lit in both photos; not driven by the code — inferred hard-wired)') + L(976, 226, 13, 10, powered, '#ff3b30', '0 VU marker');
  TALLY.forEach(([n,x,bit])=>{ s += L(x, TALLY_Y, 13, 11, !!(d.lw & bit), n==='ERROR'?'#ff3b30':'#c9f03a', n+' tally'); });
  SCALE.forEach((lb,p)=>{ if (lb) s += `<text x="${segX(p)}" y="161" transform="rotate(90 ${segX(p)} 161)" text-anchor="middle" dominant-baseline="central" font-size="17" fill="#f4f4f0" font-family="Arial, Helvetica, sans-serif">${lb}</text>`; });
  s += `<image href="${ASSETS}${PREFIX}-front.svg" width="1714" height="321"/>`;
  [50,337,1477,1664].forEach(x=> s += screw(x,161));
  if (!powered) s += `<text x="857" y="300" text-anchor="middle" font-size="16" fill="#8a8580">(off)</text>`;
  else if (st==='held'||st==='boot') s += `<text x="1300" y="300" text-anchor="middle" font-size="15" fill="#8a8580">${st==='held'?'PIC init: SHARC held in reset':'SHARC booting from flash'}</text>`;
  return s + '</svg>';
}
function rearSVG(){
  const dipC = (x0,y0)=>{ let r=`<rect x="${x0}" y="${y0}" width="52" height="196" rx="4" fill="#2f6fbf" stroke="#1d4d8a" stroke-width="2"/><text x="${x0+26}" y="${y0-4}" text-anchor="middle" font-size="11" fill="#cfd8e4">ON →</text>`;
    DIPS.forEach((n,i)=>{ const on=!!D.dip[n], yy=53+24*i; r+=`<g class="p22dip" data-i="${i}" style="cursor:pointer"><title>${i+1} ${n}: ${on?'ON':'OFF'} — click to flip (key ${i+1})</title><rect x="${x0+6}" y="${yy-8}" width="40" height="16" fill="#e8ecef"/><rect x="${on?x0+26:x0+8}" y="${yy-6}" width="18" height="12" fill="#2a2d31"/></g>`; }); return r; };
  const db9 = `<g class="p22db9" style="cursor:pointer"><title>CONTROL (J1, DE9): pins 3/8 RS-485 (U7), pin 1 = A/D closure to RD7, pins 2/5/9 ground. Click to ${D.closure?'open':'make'} the pin 1–9 closure.</title>
    <rect x="1100" y="163" width="154" height="92" rx="12" fill="#b9bcbf" stroke="#6b6f73" stroke-width="3"/><path d="M1124 180 h106 l-10 58 h-86 z" fill="#151617"/>
    ${[0,1,2,3,4].map(k=>`<circle cx="${1140+k*18.5}" cy="196" r="4" fill="#777"/>`).join('')}${[0,1,2,3].map(k=>`<circle cx="${1149+k*18.5}" cy="220" r="4" fill="#777"/>`).join('')}
    ${D.closure?'<path d="M1140 196 C1150 250, 1220 250, 1204 220" stroke="#ffd23a" stroke-width="4" fill="none"/>':''}</g>`;
  const vents = [0,1,2,3].map(k=>`<rect x="1102" y="${32+k*30}" width="150" height="12" rx="6" fill="#050505"/>`).join('');
  const over = bnc(297,85,D.in.bnc,'p22bnc','AES INPUT 75 Ω BNC (T2, R12, U10) — click to plug/unplug',50) + bnc(447,85,false,'','AES OUTPUT 75 Ω BNC (T5, U17)',50)
    + phx(297,190,D.in.phx,'p22phx','AES INPUT 110 Ω (+ − G) (T1, R11, U9) — click') + phx(447,190,false,'','AES OUTPUT 110 Ω (T4, U16)')
    + phx(647,85,D.in.ana,'p22ana','ANALOG INPUT L — click') + phx(797,85,false,'','ANALOG OUTPUT L') + phx(647,190,D.in.ana,'p22ana','ANALOG INPUT R — click') + phx(797,190,false,'','ANALOG OUTPUT R')
    + dipC(946,40) + vents + db9
    + `<g class="p22pwr" style="cursor:pointer"><title>Fuse holder and power cord (115 V AC, ½ A S.B.) — click to switch the unit on at the playhead</title><circle cx="1374" cy="160" r="47" fill="#151617" stroke="#666" stroke-width="4"/><text x="1374" y="166" font-size="17" fill="#9a9a9a" text-anchor="middle">FUSE</text>
       <circle cx="1534" cy="160" r="36" fill="#0c0d0e"/><path d="M1534 160 h190" stroke="#0c0d0e" stroke-width="28"/></g>`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD22 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#1b1c1d"/>${over}<image href="${ASSETS}${PREFIX}-rear.svg" width="1714" height="321" style="pointer-events:none"/>${screw(50,138)}${screw(1664,138)}</svg>`;
}
function bindPanel(r){
  r.querySelectorAll('.p22dip').forEach(g=>g.onclick=()=>A.dip(DIPS[+g.dataset.i]));
  r.querySelectorAll('.p22bnc').forEach(g=>g.onclick=()=>A.plug('bnc')); r.querySelectorAll('.p22phx').forEach(g=>g.onclick=()=>A.plug('phx'));
  r.querySelectorAll('.p22ana').forEach(g=>g.onclick=()=>A.plug('ana')); r.querySelectorAll('.p22db9').forEach(g=>g.onclick=()=>A.closure());
  r.querySelectorAll('.p22pwr').forEach(g=>g.onclick=()=>A.power()); }
function controlsHTML(){ const P=D.prog; return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Programme <select id="p22pg">${[['tone','steady 1 kHz tone'],['bursts','120 ms bursts'],['step','tone from 200 ms'],['speech','speech-like'],['silence','silence']].map(([v,l])=>`<option value="${v}" ${v===P.type?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>AES <input id="p22ad" type="number" step="1" value="${P.dbfs}" style="width:56px"> dBFS</label><label>Analog <input id="p22an" type="number" step="1" value="${P.dbu}" style="width:56px"> dBu</label>
  <label>R vs L <select id="p22rm">${[['same','in phase'],['90','90°'],['180','180° (polarity)'],['lonly','L only'],['ronly','R only']].map(([v,l])=>`<option value="${v}" ${v===P.rmode?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>AES fs <select id="p22fs">${[32000,44100,48000,96000].map(f=>`<option value="${f}" ${f===D.fs?'selected':''}>${f/1000}k</option>`).join('')}</select></label>
  <label>DSP <select id="p22dsp"><option value="v102" ${D.dsp==='v102'?'selected':''}>v1.02</option><option value="v102.1" ${D.dsp==='v102.1'?'selected':''}>v1.02.1 custom</option></select></label></div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center">POD23 on CONTROL:
   <button data-f="up">level +6</button><button data-f="zero">level 0</button><button data-f="dn">level −6</button><button data-f="other">+6 to another address</button><button data-f="delay">delay</button><button data-f="v100" title="the POD23A v100 frame format (pod23.js)">POD23A v100 frame</button>
   <button id="p22pw" title="Switch on at the playhead">Power on here</button><button id="p22rs">Factory state</button></div>
  <div class="small muted">Click the rear: DIP levers (keys 1–8), BNC / Phoenix inputs, analog inputs, the DB9 (pin 1 closure) and the fuse/cord (power on). Press Play to watch the ballistics.</div>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if (!g('#p22pg')) return;
  g('#p22pg').onchange=e=>A.set('type',e.target.value,'Programme → '+e.target.selectedOptions[0].text);
  g('#p22ad').onchange=e=>A.set('dbfs',Math.min(0,+e.target.value),'AES level → '+e.target.value+' dBFS');
  g('#p22an').onchange=e=>A.set('dbu',+e.target.value,'Analog level → '+e.target.value+' dBu');
  g('#p22rm').onchange=e=>A.set('rmode',e.target.value,'R vs L → '+e.target.selectedOptions[0].text);
  g('#p22fs').onchange=e=>A.fs(+e.target.value); g('#p22dsp').onchange=e=>A.dsp(e.target.value);
  r.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>A.frame(b.dataset.f));
  g('#p22pw').onclick=()=>A.power(); g('#p22rs').onclick=()=>A.reset(); }
bindKeys('__pod22Active', ()=>{ const k={}; DIPS.forEach((n,i)=>k[''+(i+1)]=()=>A.dip(n)); return k; });

/* ======================= readouts ======================= */
function nowHTML(t){ const r=readings(t), p=passAt(t), st=sharcState(t), dig=digAt(t);
  const fsI = isrRate(t);
  return `<table class="kv">
  <tr><th>Mode / input</th><td class="mono">${dig?'DIGITAL (A/D ON or pin-1 closure)':'ANALOG (A/D OFF)'} · ${dig?(p?(p.port===75?'75 Ω BNC':'110 Ω Phoenix')+(p.lock?' · LOCK':' · trying'):'—'):'CS5333 A/D'}</td></tr>
  <tr><th>SHARC</th><td class="mono">${({run:'running',boot:'booting (inferred '+SIM.fmtDur(BOOT)+')',held:'held in reset by the PIC','off-before':'unit off'})[st]} · sport0_isr at ${(fsI/1000).toFixed(1)} kHz (${Math.round(CORE/fsI)} cycles)</td></tr>
  <tr><th>0 VU =</th><td class="mono">${dig?calRef()+' dBFS':'+4 dBu (−20 dBFS, CAL ignored)'} · decay ${D.dip.BS0?'type 1 (1.5 s/24 dB)':'type 2 (3 s/24 dB)'} · hold ${D.dip.BS1?'on':'off'}</td></tr>
  <tr><th>L: VU / peak / hold</th><td class="mono">${r?`${fdb(r.vu[0])} / ${fdb(r.pk[0])} / ${r.hold[0]==null?'—':fdb(r.hold[0])} dB · PK ${r.led[0]?'ON':'off'}`:'—'}</td></tr>
  <tr><th>R: VU / peak / hold</th><td class="mono">${r?`${fdb(r.vu[1])} / ${fdb(r.pk[1])} / ${r.hold[1]==null?'—':fdb(r.hold[1])} dB · PK ${r.led[1]?'ON':'off'}`:'—'}</td></tr>
  <tr><th>Phase</th><td class="mono">${r?`PhaseMeterGet = ${r.ph} (y = ${r.y.toFixed(2)})`:'—'}</td></tr>
  <tr><th>POD23 control</th><td class="mono">${p&&p.sc?`COM · level byte ${p.level} (${fdb((p.level-195)/2,1)} dB)`:'none (unity, word 0x3C3)'} · address ${address()}</td></tr></table>`; }
function levelsHTML(t){ const dig=digAt(t), p=passAt(t), lev=p?p.level:195, g=lev?(lev-195)/2:-200, ci=dig?calIdx():0;
  const aout = 20*Math.log10(AOUT[D.dsp][ci]);
  const inL = dig ? D.prog.dbfs : D.prog.dbu;
  const adc = dig ? D.prog.dbfs : Math.min(D.prog.dbu-ADC_FS, 0) + 20*Math.log10(A_IN_CAL);
  const post = adc + g;
  const st = [];
  if (dig){ st.push({name:'AES input (sine peak)', gain:null, lvl:inL, clip:0, unit:'dBFS', note:'CS8427 receiver → SPORT0 A (SD_OUT1)'}); }
  else { st.push({name:'Analog input (rms)', gain:null, lvl:inL, clip:ADC_FS, unit:'dBu', note:`NE5532 U11 → CS5333 U8; full scale ≈ +${ADC_FS.toFixed(2)} dBu ${inf}`});
         st.push({name:'A/D word × a_in_cal', gain:20*Math.log10(A_IN_CAL), lvl:adc, clip:0, unit:'dBFS', note:'analog_input / v102 a_in_cal_left/right = 1.013911'}); }
  st.push({name:'POD23 trim (halfdb_data['+lev+'])', gain:g, lvl:post, clip:0, unit:'dBFS', note:'same word to all four channels; ALUSAT clips at full scale'});
  st.push({name:'Meter: 0 VU reference', gain:null, lvl:post+3-((dig?calRef():-20)+3), clip:14, unit:'dB VU', note:'sine: VU reads peak dBFS − reference (scale top +14)'});
  st.push({name:'AES output', gain:0, lvl:post, clip:0, unit:'dBFS', note:'dma_out_a → CS8427 → U16/U17 → T4/T5'});
  st.push({name:'Analog output (rms)', gain:aout, lvl:post+aout+DAC_FS, clip:DAC_FS, unit:'dBu', note:`× −a_out_cal${ci} = ${(-AOUT[D.dsp][ci]).toFixed(4)} → CS4335 U18 → NE5532 U13/U14; full scale ≈ +${DAC_FS.toFixed(2)} dBu ${inf}`});
  return stageTable(st); }

/* ======================= timeline lanes ======================= */
function dbLane(label, fn, color, lo, hi){ lo=lo==null?-40:lo; hi=hi==null?16:hi; return { label, h:46, draw(c,X,t0,t1,y,h){ const Yv=v=>y+4+(1-(clamp(v,lo,hi)-lo)/(hi-lo))*(h-8);
  c.strokeStyle=SIM.css('--grid'); [lo,0,hi].forEach(v=>{ c.beginPath(); c.moveTo(X(t0),Yv(v)); c.lineTo(X(t1),Yv(v)); c.stroke(); });
  c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText('0',X(t0)+2,Yv(0)-2);
  c.strokeStyle=color; c.lineWidth=1.5; c.beginPath(); const N=Math.min(900,X(t1)-X(t0)); let started=false;
  for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=fn(tt); if (v==null){ started=false; continue; } const yy=Yv(v); if(!started){ c.moveTo(X(tt),yy); started=true; } else c.lineTo(X(tt),yy); } c.stroke(); }}; }
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), bad=SIM.css('--bad'), ink2=SIM.css('--ink2');
  const E=emulate();
  const fsNow = isrRate(SIM.t);
  const frameVal = (t,fn)=>{ const f=frameAt(t); const r=lastResetBefore(t); if (!f || sharcState(t)!=='run' || (r && f.t<r.t)) return null; return fn(f); };
  return [
    {label:`PIC MAIN passes (${SIM.fmtDur(PASS)}, inferred)`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0+0,t1,y,h,PASS,((E.tMain%PASS)+PASS)%PASS,PASS*0.25,ink2,'read8420s · autodetect · sharc · uart'); if (E.powered){ c.fillStyle=SIM.css('--chip'); c.fillRect(X(D.powerAt),y+2,Math.max(1,X(E.tMain)-X(D.powerAt)),h-4); c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText('init.asm delay loops',X(D.powerAt)+4,y+14); } }},
    {label:'porte: AES receiver enabled', h:22, draw(c,X,t0,t1,y,h){ const N=Math.min(400,(X(t1)-X(t0))/2); for (let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N, p=passAt(tt); if (!p) continue; c.fillStyle = p.port===75?b : p.port===110?wn : ink2; c.globalAlpha = p.port? (p.lock?1:0.35) : 0.15; c.fillRect(X(t0+(t1-t0)*i/N),y+4,(X(t1)-X(t0))/N+0.6,h-8); } c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText('blue 75 Ω (RE1) · amber 110 Ω (RE0) · faint = trying · grey = analog',X(t0)+4,y+15); }},
    boolLane('CS8427 lock (lock_8420,0)', t=>lockAt(t), '#3fbf5f'),
    boolLane('autodetect confirmed (mode,0)', t=>{ const p=passAt(t); return !!(p && p.m0 && digAt(t)); }, b),
    {label:'SHARC reset (porta,4) / boot', h:20, draw(c,X,t0,t1,y,h){ E.resets.forEach(r=>{ if (r.t>t1||r.t+BOOT<t0) return; c.fillStyle=bad; c.fillRect(X(r.t)-1,y+2,3,h-4); c.globalAlpha=.25; c.fillRect(X(r.t),y+4,Math.max(1,X(r.t+BOOT)-X(r.t)),h-8); c.globalAlpha=1; }); if (E.powered && D.powerAt>=t0){ c.fillStyle=SIM.css('--chip'); c.fillRect(X(D.powerAt),y+4,X(E.resets[0].t)-X(D.powerAt),h-8); } }},
    {label:`SPORT0 interrupts (${(fsNow/1000).toFixed(1)} kHz)`, h:20, draw(c,X,t0,t1,y,h){ if (sharcState((t0+t1)/2)!=='run') return; SIM.pulses(c,X,t0,t1,y,h,1/fsNow,0,0.35/fsNow,a,'sport0_isr: VUMeterCalc · PhaseMeterCalc · shifter'); }},
    {label:'Display frames (300 ISRs, 36-bit shift)', h:22, draw(c,X,t0,t1,y,h){ const F=meterRun().frames; let n=0; for (const f of F){ if (f.t<t0-0.01) continue; if (f.t>t1) break; n++; const w=72/f.fs; c.fillStyle=f.dimBlank?SIM.css('--grid'):wn; c.fillRect(X(f.t),y+4,Math.max(1.5,X(f.t+w)-X(f.t)),h-8); }
      if ((X(t1)-X(t0))/Math.max(1,n) < 3){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(`${n} frames (grey = blanked by BRIGHT OFF)`,X(t0)+4,y+15); } }},
    {label:'RS-485 bytes (in ↓ / reply ↑)', h:26, draw(c,X,t0,t1,y,h){ c.font='10px '+SIM.css('--mono'); E.bytes.forEach(o=>{ const s=o.t-BYTE_T; if (o.t<t0||s>t1) return; c.fillStyle=wn; c.fillRect(X(s),y+3,Math.max(2,X(o.t)-X(s)-1),9); if (X(o.t)-X(s)>18){ c.fillStyle=SIM.css('--ink'); c.fillText(hex(o.b),X(s)+2,y+11); } });
      E.replies.forEach(o=>{ if (o.t<t0-BYTE_T||o.t>t1) return; c.fillStyle=b; c.fillRect(X(o.t),y+14,Math.max(2,X(o.t+BYTE_T)-X(o.t)-1),9); if (X(o.t+BYTE_T)-X(o.t)>18){ c.fillStyle=SIM.css('--ink'); c.fillText('81',X(o.t)+2,y+22); } }); }},
    boolLane('serial_control,0 (COM)', t=>scAt(t), '#ffd23a'),
    waveLane('Input L (re full scale)', t=>srcSample(0,t,digAt(t)), -0.01, null, b, 32, Object.assign(t=>srcPeak(digAt(t))*env(t),{dense:(s,pw)=>s*D.prog.f>pw/3})),
    dbLane('VU L (dB re 0 VU, displayed)', t=>frameVal(t,f=>(40-f.vr[0])/2), a),
    dbLane('Peak bar L (pk_results+6)', t=>frameVal(t,f=>(34-f.pr[0])/2), wn),
    boolLane('PK LED L (> −3 dBFS, 200,000 ISRs)', t=>frameVal(t,f=>f.led[0])===true, bad),
    dbLane('PPM hold L (BS1)', t=>frameVal(t,f=>f.hold[0]>=255?null:(34-f.hold[0])/2), SIM.css('--play')),
    {label:'Phase (PhaseMeterGet, 0…256)', h:34, draw(c,X,t0,t1,y,h){ c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke(); c.strokeStyle=b; c.lineWidth=1.4; c.beginPath(); const N=Math.min(700,X(t1)-X(t0)); let s=false;
      for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=frameVal(tt,f=>f.ph); if (v==null){ s=false; continue; } const yy=y+h-3-(v/256)*(h-6); if(!s){c.moveTo(X(tt),yy); s=true;} else c.lineTo(X(tt),yy); } c.stroke(); }},
    boolLane('LOCK tally', t=>{ const d=displayAt(t).d; return !!(d.lw&LOCKW.LOCK); }, '#c9f03a'), boolLane('COM tally', t=>!!(displayAt(t).d.lw&LOCKW.COM), '#ffd23a'), boolLane('ERROR tally', t=>!!(displayAt(t).d.lw&LOCKW.ERROR), bad) ]; }

const viewSim = simView({flag:'__pod22Active', D, front:frontSVG, rear:rearSVG, bind:bindPanel, controls:controlsHTML, bindControls, now:nowHTML, levels:levelsHTML, lanes, labelW:230,
  frontTitle:'Front panel at the playhead (POD22-Silk.cdr; scale redrawn) — press Play', rearTitle:'Rear panel — DIP levers, inputs, CONTROL, power', artNote:true, nowTitle:'Readings at the playhead', levelsTitle:'Level through every stage (steady sine)',
  tlTitle:'Timeline — one second: PIC passes, autodetect, resets, SHARC interrupts, display frames, RS-485, meters, tallies', hint:'Flip a DIP lever, plug an input or send a POD23 frame.'});

/* ======================= tutorial (from POD22 MANUAL.pdf and the DIP table) ======================= */
const R = ()=>readings(SIM.t) || {vu:[-99,-99],pk:[-99,-99],hold:[null,null],ph:0,led:[false,false]};
const LESSONS = [
  {title:'Meet the POD22', body:`<p>The POD22 is a half-rack <b>stereo loudness meter</b> (manual, ${Y(2003)}). Two 40-segment bars show VU (the filled bar) and peak (the dot) together, from PR (signal present) through −36 … 0 … +14, with a PK lamp at the end. On the left a 7-LED <b>phase</b> column; under the bars six tallies: LOCK, COM, 44.1K, 48K, 96K, ERROR.</p><p>Inside, a PIC16F874 reads the rear DIP switch, the AES lock and the RS-485 port, and a SHARC DSP does the metering and drives the LEDs through three MM5450 shift registers.</p>`, check:()=>true, auto:true},
  {title:'1 · Lock to AES on the BNC', body:`<p>Set A/D <b>ON</b> (the second lever). The code reads that as <b>digital</b>, although the 2003 manual says ON = Analog. Plug the 75 Ω BNC input. After a few PIC passes LOCK and the rate tally light, and the bars move.</p><p><b>Goal:</b> digital mode, BNC plugged, LOCK lit.</p>`, check:()=>digital() && D.in.bnc && lockAt(Math.min(0.999,SIM.t+0.3)), hint:'Second DIP lever ON, then click the BNC marked INPUT if it is empty.'},
  {title:'2 · Read the sample rate', body:`<p>Change the AES rate to <b>44.1 kHz</b>. The SHARC times its own interrupts with emuclk (1115 cycles per sample) and lights 44.1K. At 32 kHz no rate tally lights.</p><p><b>Goal:</b> 44.1K lit.</p>`, check:()=>{ const d=displayAt(Math.min(0.999,SIM.t+0.3)).d; return !!(d.lw & LOCKW.R441); }, hint:'AES fs → 44.1k under the front panel. If LOCK went out, wait or press Play.'},
  {title:'3 · Set the calibration', body:`<p>CAL1/CAL0 choose 0 VU = −20, −18, −16 or −14 dBFS (Table 2). Set <b>−18 dBFS</b> (CAL1 OFF, CAL0 ON) and play a steady tone at −18 dBFS: both bars stop at <b>0</b>.</p><p><b>Goal:</b> CAL = −18, steady tone at −18 dBFS.</p>`, check:()=>digital() && calRef()===-18 && D.prog.type==='tone' && D.prog.dbfs===-18, hint:'Click CAL0 on the rear; programme = steady tone; AES = −18.'},
  {title:'4 · Ballistics', body:`<p>BS0 picks the peak decay: ON = PPM type 1 (24 dB in 1.5 s), OFF = type 2 (24 dB in 3 s). Play <b>120 ms bursts</b> with BS0 OFF and watch the peak dot fall slowly between bursts on the timeline.</p><p><b>Goal:</b> bursts, BS0 OFF.</p>`, check:()=>D.prog.type==='bursts' && !D.dip.BS0, hint:'Programme → 120 ms bursts; flip BS0 (third lever) OFF.'},
  {title:'5 · Peak hold', body:`<p>BS1 ON holds the highest peak as a separate dot. The code only shows the held dot from 0 up (pk_data_1), so it marks peaks <i>above nominal</i>, as the manual says. It holds for 200,000 samples (4.2 s at 48 kHz; the manual says 3 s).</p><p><b>Goal:</b> BS1 ON and a held dot visible on the left bar.</p>`, check:()=>D.dip.BS1 && R().hold[0]!=null && R().hold[0]>=-0.5, hint:'Flip BS1 ON. Use bursts at −8 dBFS so the peaks go above 0.'},
  {title:'6 · The PK lamp', body:`<p>The PK lamp lights when a sample goes above <b>−3 dBFS</b> (0.7079457) and stays on for 200,000 samples. Raise the AES level to <b>−2 dBFS</b>.</p><p><b>Goal:</b> PK lit.</p>`, check:()=>R().led[0], hint:'AES → −2 dBFS (steady tone).'},
  {title:'7 · Phase', body:`<p>The phase column compares the average of |L+R| with |L−R| (PhaseMeterCalc, α = 0.999). In phase lights only +1; a polarity flip lights all seven down to −1. With one channel silent it sits at the middle (4 LEDs).</p><p><b>Goal:</b> R vs L = 180°, 7 phase LEDs lit.</p>`, check:()=>D.prog.rmode==='180' && displayAt(SIM.t).d.phase.filter(x=>x).length===7, hint:'R vs L → 180°. Give it 0.1 s of simulated time.'},
  {title:'8 · Balanced AES (110 Ω)', body:`<p>Unplug the BNC and plug the <b>110 Ω Phoenix</b>. The PIC keeps trying 75 Ω for 100 passes (${SIM.fmtDur(DETECT*PASS)}), then flips porte to 110 Ω, locks, confirms for 7 passes and resets the SHARC. Watch the porte and reset lanes.</p><p><b>Goal:</b> Phoenix only, LOCK.</p>`, check:()=>!D.in.bnc && D.in.phx && digital() && lockAt(0.999), hint:'Click the BNC (unplug), then the green Phoenix under it. Seek past the flip.'},
  {title:'9 · Analog mode', body:`<p>Flip A/D <b>OFF</b>. The PIC switches the CS8427 to OMCK, disables both AES receivers and resets the SHARC once. 0 VU is now +4 dBu whatever CAL says, and all six tallies go dark — the SHARC clears lock_status in analog mode.</p><p><b>Goal:</b> analog mode with +4 dBu in: 0 VU.</p>`, check:()=>!digital() && D.in.ana && D.prog.dbu===4 && Math.abs(R().vu[0])<=0.5, hint:'Second lever OFF; Analog = 4 dBu; steady tone.'},
  {title:'10 · Brightness', body:`<p>BRIGHT OFF makes translate_meter_results send a blank frame every other time (BIT31), so the LEDs run at half duty, 80 Hz. The “One second” tab shows the blank frames.</p><p><b>Goal:</b> BRIGHT OFF.</p>`, check:()=>!D.dip.BRIGHT, hint:'First lever.'},
  {title:'11 · Serial control (POD23)', body:`<p>Back to digital with the BNC. Press <b>level +6</b>: a 4-byte RS-485 frame (FF, address, 00, level). The PIC sets serial_control (COM) and the SHARC adds 6 dB to the metered and output audio. Then press <b>+6 to another address</b>: check_address sees a different address, turns COM off and puts the gain back to unity.</p><p><b>Goal:</b> COM lit and the bar 6 dB up.</p>`, check:()=>digital() && scAt(SIM.t) && levelAt(SIM.t)===207, hint:'A/D ON, BNC in, steady tone, then “level +6” and seek a few ms later.'},
  {title:'Done', body:`<p>The Software tab shows the PIC main loop, the autodetect state machine, the SHARC table look-ups and the bit frames for the LED drivers. Findings lists what the code is up to.</p>`, check:()=>true, auto:true}];
let lessonIdx = 0;
function viewTutorial(m){ window.__pod22Active=true; tutorialView(m,{title:'Tutorial — operating a POD22',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:8px">${rearSVG()}</div>${controlsHTML()}<div class="small" style="margin-top:6px">${nowHTML(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }

/* ======================= one second, frame by frame ======================= */
function shiftGrid(f){
  if (!f) return '<p class="muted small">No frame (SHARC not running).</p>';
  const W=f.W, blank=f.dimBlank;
  const line=(nm,L,Rw,flag)=>{ let cells=''; for (let k=0;k<36;k++){ const bit = k<18 ? (blank? (k===0&&nm==='A'?1:0) : (L>>k)&1) : (blank?0:(Rw>>(k-18))&1);
      cells+=`<td style="padding:0;width:2.7%;text-align:center;background:${bit?(k===0?'var(--accent2)':'var(--accent)'):'var(--chip)'};color:${bit?'#fff':'var(--ink2)'};font-size:10px">${bit}</td>`; }
    return `<tr><th class="small" title="${flag} → chip ${nm}">${nm}</th>${cells}</tr>`; };
  return `<table class="kv mono" style="table-layout:fixed"><colgroup><col style="width:6%"></colgroup><tr><th></th>${[...Array(36)].map((_,k)=>`<td style="padding:0;text-align:center;font-size:9px;color:var(--ink2)">${k}</td>`).join('')}</tr>
    ${line('A',W.AL,W.AR,'FLAG4')}${line('B',W.BL,W.BR,'FLAG5')}${line('C',W.CL,W.CR,'FLAG6')}</table>
    <p class="small">Rows: A = FLAG4, B = FLAG5, C = FLAG6 (data lines to the three MM5450s). Clock 0 is the MM5450 start bit. Clocks 1–17 carry the <b>left</b> words (shift1/2/3), clocks 18–35 the <b>right</b> words (shift5/6/7, already shifted one place right). FLAG7 is the clock: one edge per sport0_isr, so a frame takes 72 interrupts (${SIM.fmtDur(72/f.fs)}). Chip C carries PR…−20, the phase column (left bits 11–17) and the tallies (right bits 8–13 → outputs 26–31).${blank?' <b>This frame is blanked (BRIGHT OFF, BIT31 set).</b>':''}</p>`; }
function picWords(t){ const p=passAt(t); const lev=p?p.level:195;
  const W=[['0','cal_l (sharc_out+0/1)',(2<<8)|121,'0x279 — never used by the SHARC (input_gain is not called)'],['1','cal_r (+2/3)',(2<<8)|121,'likewise; init loads 121 and the comment says “half dB table”, but 2 selects point_one_dB_table'],
    ['2','jumper0 (+4/5) → anc_data[0]',jumper0(),'BRIGHT, A/D (1 = analog), BS0, BS1, CAL0, CAL1'],['3','lock / COM (+6/7) → anc_data[1]',(p&&p.lock?1:0)|(p&&p.sc?2:0),'bit 0 lock_8420,0 · bit 1 serial_control,0'],
    ['4–7','trims (+8…15) → anc_data[2…5]',(3<<8)|lev,`table 3 = halfdb_data, entry ${lev} → ×${halfdb(lev).toFixed(4)}`],['8–11','v1…v4 (+16…23)',0x20,'0x20 = “on”, left over from the VMS44 map'],['12–15','l1…l4 (+24…31)',0,'lock flags of the VMS44 map, unused'],['16','delay (+32/33)',0,'sharc_out+33; v1.02 never reads it (spare17)']];
  return `<table class="kv"><tr><th>Word</th><th>PIC source</th><th>10-bit value</th><th>Meaning</th></tr>${W.map(w=>`<tr><td class="mono">${w[0]}</td><td class="small">${w[1]}</td><td class="mono">0x${hex(w[2],3)}</td><td class="small">${w[3]}</td></tr>`).join('')}</table>
  <p class="small">The PIC bit-bangs these 17 words MSB first on RD1 (frame sync), RD2 (clock) and RD3 (data) every pass; the SHARC receives them by chained DMA on SPORT1 into input_cal_fix, anc_data[14] and spare17, and sends back pic_out_data = 1, 2 … 16, 170 on DT1A → RD0. The PIC checks the last byte against brown_data = 0xAA; 20 misses in a row and it parks in <span class="mono">here: goto here</span> until the watchdog resets it (${inf}: the configuration word is not in the source).</p>`; }
function viewSecond(m){ window.__pod22Active=true;
  m.innerHTML = `${card('One second, broken down', `<div id="lad"></div>`)}
    <div class="grid2">${card('The MM5450 frame on the display bus at the playhead', `<div id="sg"></div>`)}${card('As seen by the display', `<div id="fp"></div><div id="rd" class="small"></div>`)}</div>
    <div class="grid2">${card('One AES3 frame at the playhead (CS8427 input)', `<canvas id="sc"></canvas>`)}${card('PIC → SHARC: the 17 words sent every pass', `<div id="pw"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, fs=isrRate(t), dig=digAt(t);
    m.querySelector('#lad').innerHTML = tableRows([
      ['AES3 frames / sport0_isr', fs.toLocaleString(), SIM.fmtDur(1/fs), `float by −31, trim, VUMeterCalc, PhaseMeterCalc, counters, sample_rate_calc, one shifter edge; ${Math.round(CORE/fs)} core cycles available`],
      ['SHARC background passes', '≈ 60,000 '+inf, '≈ 17 µs', 'main: VUMeterGet ×4 (MathLn), PhaseMeterGet ×1 (MathDiv)'],
      ['Display frames (mux_ctl)', (fs/MUX_RATE).toFixed(0), SIM.fmtDur(MUX_RATE/fs), 'mux_counter = 300; translate_meter_results builds six 18-bit words'],
      ['Shift clock (FLAG7)', (fs/2).toLocaleString(), SIM.fmtDur(2/fs), `36 clocks per frame = ${SIM.fmtDur(72/fs)}`],
      ['PIC MAIN passes', Math.round(1/PASS).toLocaleString()+' '+inf, SIM.fmtDur(PASS), `≈ ${PASS_CYC.toLocaleString()} instruction cycles at ${(FOSC/1e6).toFixed(4)} MHz`],
      ['PIC → SHARC words', Math.round(17/PASS).toLocaleString(), SIM.fmtDur(PASS/17), '17 × 10 bits per pass on SPORT1'],
      ['Autodetect try', '≈ '+(1/(DETECT*PASS)).toFixed(1), SIM.fmtDur(DETECT*PASS), 'detect_count = 100 passes per input'],
      ['Lock confirm', '—', SIM.fmtDur(DETECT1*PASS)+' (power-up: '+SIM.fmtDur(DETECT*PASS)+')', 'detect_count1 = 7 passes; init loads bcount1 with 100'],
      ['cs8420lockprocess', '≈ '+(1/(RSDELAY*PASS)).toFixed(0), SIM.fmtDur(RSDELAY*PASS), 'rsdelay = 10 passes'],
      ['RS-485 byte (9600 Bd)', '960', SIM.fmtDur(BYTE_T), `a 4-byte frame takes ${SIM.fmtDur(4*BYTE_T)}; one byte read per pass`],
      ['Reply 0x81', '—', `≈ ${SIM.fmtDur((TIMER_UART+2)*PASS)}`, 'tx_timer = 55 passes, then uart_tx'],
      ['COM hold', '—', `${(COM_HOLD*PASS).toFixed(1)} s`, `${COM_HOLD.toLocaleString()} passes (serial_timeout0/1 from 200)`],
      ['PK lamp / PPM hold', '—', SIM.fmtDur(HOLD_N/fs), '200,000 interrupts (manual: 3 s)'],
      ['VU / PPM attack / decay', '—', `24 dB in 300 ms / 5 ms / ${D.dip.BS0?'1.5':'3'} s`, 'update_meter_parameters_xx, per rate'],
      ['Phase average', '—', `τ = ${SIM.fmtDur(1000/fs)}`, 'PHMETER_ALPHA = 0.999'],
      ['Power-up', '—', `${INIT.release.toFixed(3)} s / ${INIT.main.toFixed(3)} s`, 'resets released / MAIN starts (init.asm delay loops)'] ]);
    const f = displayAt(t).f; m.querySelector('#sg').innerHTML = shiftGrid(f);
    m.querySelector('#fp').innerHTML = frontSVG(t); m.querySelector('#rd').innerHTML = nowHTML(t);
    const n=Math.floor(t*fs), s0=srcSample(0,t,dig)*halfdb(levelAt(t)), s1=srcSample(1,t,dig)*halfdb(levelAt(t));
    drawAesScope(m.querySelector('#sc'), aesSubframe(s0, n%192===0?'Z':'X', n%192, D.fs), aesSubframe(s1,'Y',n%192,D.fs), D.fs, dig&&lockAt(t)?1:0.05, `frame ${n.toLocaleString()} ·`);
    m.querySelector('#pw').innerHTML = picWords(t); };
  SIM.on('time', draw); }

/* ======================= block diagram ======================= */
const BLOCKS = {
  aesin:{x:16,y:20,w:180,h:96,t:'AES IN 75 / 110 Ω',s:['T2 + R12 → U10 75176','T1 + R11 → U9 75176','RO tied → CS8427 RXP'],d:'Two pulse transformers (PE-65612) with 75 Ω and 110 Ω terminations, each followed by a 75176 used as a receiver. The PIC enables one at a time (SEL_75A = RE1, SEL_110A = RE0); both outputs share one net into the CS8427. If both inputs carry signal the one that locks first stays — the manual calls it random.'},
  cs:{x:236,y:20,w:180,h:80,t:'CS8427 (U2)',s:['AES receiver / transmitter','reg 16 bit 4 = no lock','SPI to the PIC'],d:'The BOM and netlist fit a CS8427; every routine in the PIC code calls it cs8420. Its serial port is the I²S master for the SHARC, the CS5333 and the CS4335 (SCLK_IN1, LRCLK_IN1, RMCK1). Unlocked, the PIC switches it to OMCK (PLL1700E) so the clocks keep running.'},
  adc:{x:16,y:150,w:180,h:80,t:'Analog in → CS5333 (U8)',s:['NE5532 U11, 20k inputs','ADC_DATA → SPORT0 B'],d:'Balanced input buffer and a 24-bit A/D. The SHARC uses it when A/D is OFF. Full scale is about +24 dBu (inferred from a_in_cal and the +21 dBu PK threshold).'},
  pll:{x:16,y:270,w:180,h:70,t:'PLL1700E (U12), X1 27M',s:['SHARC_CLOCK, PIC_CLOCK','OMCK1 → CS8427'],d:'One crystal; the PLL makes every clock on the board (SHARC, PIC, CS8427 OMCK; only the PIC wire is drawn). Frequencies are not in the archive: 24.576 MHz for the SHARC and ≈ 8.6 MHz for the PIC are inferred from the code.'},
  dsp:{x:470,y:20,w:200,h:130,t:'ADSP-21065L SHARC (U4)',s:['sport0_isr every sample','VU / PPM / peak / phase','translate → MM5450 bits','boot: AM29LV040B (U5)','2× MT48LC1M16 SDRAM'],d:'vms44_main.asm (DSB, Oct 2002), adapted from the VMS44 meter. The ISR does the meter maths and one display clock edge; the background loop converts to 0–255 values. Display data leave on FLAG4/5/6 (data) and FLAG7 (clock).'},
  pic:{x:236,y:190,w:180,h:110,t:'PIC16F874 (U6)',s:['MAIN pass ≈ 1.3 ms','DIPs, autodetect, CS8427 regs','SPORT1: 17 words / pass','RS-485 9600 Bd'],d:'pod22v3.asm v1.03 (May 2006). Holds the SHARC, CS8427 and A/D in reset at power-up, then runs the MAIN loop: lock, mode, autodetect, DIPs, SHARC words, serial control.'},
  dac:{x:720,y:290,w:170,h:70,t:'CS4335 (U18) → out',s:['NE5532 U13/U14','× −a_out_cal'],d:'The DAC output stage. The SHARC multiplies by −a_out_cal so the output stays at +4 dBu for 0 VU on every CAL setting.'},
  aesout:{x:470,y:190,w:200,h:70,t:'AES OUT 75 / 110 Ω',s:['CS8427 TX → U16/U17','T4 (110) · T5 (75)'],d:'The metered (and trimmed) audio, re-transmitted by the CS8427.'},
  drv:{x:720,y:20,w:170,h:90,t:'DS26LS31C (U15)',s:['FLAG4–7 → differential','header H8 → display'],d:'RS-422 line drivers carry the three data lines and the clock to the display board. FLAG0/FLAG1 also go to H8 (pins 13/14) through Q2/Q1.'},
  disp:{x:720,y:130,w:170,h:100,t:'Display board (POD22-2)',s:['3 × MM5450 (inferred)','2 × 40 bar + PK','7 phase · 6 tallies'],d:'The board itself has no netlist in the archive (Pod22-2-ISS2.pcb only). The shifter comment names the MM5450; the bit map comes from the tables and translate_meter_results.'},
  rs:{x:236,y:350,w:180,h:60,t:'CONTROL DE9 (J1)',s:['U7 75176 · pin 1 = A/D'],d:'RS-485 on pins 3 and 8 to a POD23 panel; pin 1 is wired to the A/D DIP input.'},
  dip:{x:16,y:380,w:180,h:40,t:'DIP switch (P6, P2, P3)',s:[],d:'Eight levers to RB0–2, RB4, RD4–7 with 10 k pull-ups: ON = low.'} };
const WIRES = [['aesin','cs','AES'],['cs','dsp','I²S'],['adc','dsp','ADC_DATA'],['pll','pic','clocks'],['dip','pic',''],['rs','pic','RS-485'],['pic','cs','SPI'],['pic','dsp','SPORT1 + reset'],['dsp','drv','FLAG4–7'],['drv','disp','H8'],['dsp','dac','DAC_DATA'],['cs','aesout','TX']];
function viewBlock(m){ window.__pod22Active=false; blockView(m, BLOCKS, WIRES, 'dsp', [900,440], card('In one sentence', `<p>A PIC16F874 chooses the AES input (75 or 110 Ω, by trying each until the CS8427 locks) or the A/D, reads the DIP switch and an RS-485 port, and feeds settings to an ADSP-21065L SHARC that meters every sample and drives two 40-segment bars, a phase column and six tallies through three LED shift registers.</p><p class="small muted">From POD22 - Functional Diagram.pdf (A to D, transceiver, DSP, D to A, driver, stereo LED meter assembly) and the main-board netlist Pod22-1-ISS2.net.</p>`)); }

/* ======================= schematics (redrawn from Pod22-1-ISS2.net) ======================= */
const SHEETS = [
  {name:'1 · PIC16F874 (U6)', note:'Pins and nets from Pod22-1-ISS2.net (QFP44) with the functions from init.asm. TRIML/TRIMR (RA0/RA1) connect to nothing else: no trim pots on issue 2.', svg:()=>
    chip(300,40,190,'U6 PIC16F874 (QFP44)',[['2 RD4','P6-5 dip7 A0'],['3 RD5','P6-6 dip8 A1'],['4 RD6','P3-4 dip1 BRIGHT'],['5 RD7','P2-4 + J1-1 dip2 A/D'],['8 RB0','P6-2 dip4 BS1'],['9 RB1','P6-3 dip5 CAL0'],['10 RB2','P6-4 dip6 CAL1'],['14 RB4','P6-1 dip3 BS0'],['19 RA0','TRIML (open)'],['20 RA1','TRIMR (open)'],['30 OSC1','PIC_CLOCK (U12-14)']],
      [['15 RB5','CS1 → CS8427 /CS'],['23 RA4','SHARC_RESET_PIC'],['25 RE0','SEL_110A → U9 /RE'],['26 RE1','SEL_75A → U10 /RE'],['32 RC0','ADC_RESET'],['35 RC1','U7 DE//RE'],['36 RC2','8420_RESET'],['37 RC3','SCK'],['38 RD0','DT1A ← SHARC'],['39 RD1','SPORT1_FS'],['40 RD2','SPORT1_CLK'],['41 RD3','SPORT1_DATA_A'],['42 RC4','SDI ← CS8427 pin 1'],['43 RC5','SDO → CS8427'],['44 RC6','TX → U7 DI'],['1 RC7','RX ← U7 RO']],'v1.03, 8.6 MHz inferred')
    + txt(40,440,'Pull-ups R45/R47 (10 k), series R44/R46 (100 Ω) on the DIP lines. init.asm comments call the transceiver a CS8427 and swap RE0/RE1 (“RE0 SEL_75 (U9)”).',11)},
  {name:'2 · AES in/out and CS8427', note:'T1/T2/T4/T5 PE-65612, R11 110R, R12 75R, U9/U10/U16/U17 75176. The two receiver outputs (U9-1, U10-1) share net NET00044 → C6 → U2-4.', svg:()=>
    txt(30,40,'P5-6 ─ T1 ─┬─ R11 110 Ω ─┐',12,'var(--ink)')+txt(30,60,'              U9 75176 (/RE = SEL_110A, RE0) ── RO ─┐',12)+txt(30,96,'P5-1 ─ T2 ─┬─ R12 75 Ω ──┐',12)+txt(30,116,'              U10 75176 (/RE = SEL_75A, RE1) ── RO ─┴─ C6 ─ U2-4 RXP',12)
    + chip(420,150,250,'U2 CS8427 (symbol “CS8420”)',[['4 RXP','from U9/U10'],['1 SDA/CDOUT','SDI → PIC RC4'],['28 SCL/CCLK','SCK'],['27 CDIN','SDO'],['2 /CS','CS1'],['9 /RST','8420_RESET'],['21 OMCK','OMCK1 (PLL)']],[['10 RMCK','RMCK1 → U8, U18'],['12/17 ILRCK/OLRCK','LRCLK_IN1'],['13/16 ISCLK/OSCLK','SCLK_IN1'],['14 SDIN','SD_IN1 ← SHARC'],['18 SDOUT','SD_OUT1 → SHARC'],['26 TXP','U16/U17 DI'],['5/6','PLL filter']],'AES3 transceiver')
    + txt(30,420,'Out: U16 → R13/R51/R15 → T4 → P4-1/2 (110 Ω) · U17 → R25/R52 → T5 → P4-5/6 (75 Ω BNC).',11)},
  {name:'3 · SHARC, clocks, display bus', note:'U4 ADSP21065 (MQFP208). FLAG8–11 are unconnected although v1.02 toggles FLAG8/9 as “left/right select”. FLAG0/FLAG1 drive Q2/Q1 emitter followers to H8-13/14.', svg:()=>
    chip(300,40,200,'U4 ADSP-21065L',[['30 CLKIN','SHARC_CLOCK (U12-13)'],['157 /RESET','SHARC_RESET_PIC'],['4/8 SCLK0','SCLK_IN1'],['2/7 RFS0/TFS0','LRCLK_IN1'],['5 DR0A','SD_OUT1 (CS8427)'],['6 DR0B','ADC_DATA (CS5333)'],['11 DT0A','SD_IN1 (CS8427)'],['12 DT0B','DAC_DATA (CS4335)'],['13/15/16','SPORT1 ← PIC via R30/R26/R32'],['22 DT1A','→ PIC RD0']],
      [['138 FLAG4','U15-1 → H8-1/2'],['137 FLAG5','U15-7 → H8-3/4'],['136 FLAG6','U15-9 → H8-5/6'],['134 FLAG7','U15-15 → H8-7/8 (clock)'],['197 FLAG0','Q2 → H8-13'],['198 FLAG1','Q1 → H8-14'],['80/79 FLAG8/9','(no connection)'],['153 BMS','U5 /CE boot'],['PA0–15, D','U5, U1, U3']],'49.152 MHz core (inferred)')
    + chip(200,330,140,'U12 PLL1700E',[['5/6 XT','X1 27 MHz']],[['13','SHARC_CLOCK'],['14','PIC_CLOCK'],['17','OMCK1']],'')},
  {name:'4 · Display board bit map', note:'Redrawn from translate_meter_results and the sdm_*.dat tables (no netlist for the display board). MM5450 part from the shifter comment; outputs = clock numbers.', svg:()=>{
    let s=txt(30,34,'chip A (FLAG4)  out 1–16: L −1, 0, +1 … +14   · out 17: L PK   · out 18–33: R −1 … +14   · out 34: R PK',12)
     +txt(30,58,'chip B (FLAG5)  out 1–16: L 18, 16, 15 … 2         · out 18–33: R 18 … 2',12)
     +txt(30,82,'chip C (FLAG6)  out 1–8: L PR, 36, 32, 28, 26, 24, 22, 20 · out 11–17: phase · out 18–25: R PR … 20 · out 26–31: LOCK, COM, 44.1K, 48K, 96K, ERROR',12);
    s+=txt(30,120,'Table thresholds (VU value v = −2·10·log10(mean square) + meter_cal; 0 VU = 40):',12,'var(--accent2)');
    const th=[['PR','v ≤ 122 (−41)'],['36','≤ 114'],['32','≤ 106'],['28','≤ 98'],['26','≤ 94'],['24','≤ 90'],['22','≤ 86'],['20','≤ 82'],['18','≤ 78'],['16','≤ 74'],['15','≤ 70'],['…','2 per dB'],['−1','≤ 42'],['0','≤ 40'],['+1','≤ 38'],['+14','≤ 12']];
    th.forEach((x,i)=>{ s+=txt(40+(i%4)*200,146+Math.floor(i/4)*22,`${x[0]}: ${x[1]}`,11); });
    s+=txt(30,250,'Peak dot: pk_data at index pk_results + 6 (3 dB above the VU of a sine). Hold dot: pk_data_1 only, bit 1 masked (left).',11);
    s+=txt(30,272,'Phase: index = trunc(128·y + 128), 0 = out of phase (7 LEDs) … 256 = in phase (1 LED); bits 11–17, bit 11 comes on third (wiring order inferred).',11);
    return s; }},
  {name:'5 · Rear connectors', note:'J1 DE9, P2–P6 headers to the rear connectors. From Pod22-1-ISS2.net; connector-to-header wiring beyond the main board is not in the archive.', svg:()=>
    chip(220,60,150,'J1 DE9 CONTROL',[['1','A/D closure → RD7'],['2/5/9','GND']],[['3','RS-485 A (U7-6, R3)'],['8','RS-485 B (U7-7, R4)']],'')
    + chip(600,60,120,'P6 DIP header',[['1','BS0 → RB4'],['2','BS1 → RB0'],['3','CAL0 → RB1']],[['4','CAL1 → RB2'],['5','A0 → RD4'],['6','A1 → RD5']],'')
    + chip(220,280,150,'P3 analog in',[['1/2','L ± → R16/R17 → U11'],['5/6','R ± → R22/R62 → U11'],['4','BRIGHT lever → RD6']],[],'')
    + chip(600,280,120,'P2 analog out',[['1/2','R7/R8 ← U13/U14'],['5/6','R9/R10 ← U13/U14'],['4','A/D lever → RD7']],[],'')}];
function viewSchem(m){ window.__pod22Active=false; schemView(m, SHEETS, 'POD22-1 ISS2', 'Redrawn from POD22 - #Engineering/PCB/Pod22-1-ISS2.net and .bom (P-CAD, 2002|35–2003|36) plus the pin comments in init.asm; these are not the original CAD sheets.'); }

/* ======================= software ======================= */
function autodetectSVG(t){ const p=passAt(t), dig=digAt(t);
  const st = !p ? 'off' : !dig ? 'analog' : (p.lock && p.m0) ? 'run' : p.lock ? 'confirm' : p.port===75 ? 't75' : 't110';
  const S = {t75:[30,40,'TRY 75 Ω','porte: RE1 low','bcount 100 → 0'], t110:[30,170,'TRY 110 Ω','porte: RE0 low','bcount 100 → 0'], confirm:[290,100,'LOCKED, CONFIRMING','bcount1: 7 passes','(100 at power-up)'],
    run:[540,100,'CONFIRMED (mode,0)','cs8420lockprocess →','run/stop + SHARC reset'], analog:[540,220,'ANALOG','both receivers off','reset SHARC once'] };
  let s=`<svg viewBox="0 0 760 290" style="width:100%"><defs><marker id="p22ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  const ar=(x1,y1,x2,y2,l,dx)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#p22ar)"/><text x="${(x1+x2)/2+(dx==null?4:dx)}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)" ${dx===-6?'text-anchor="end"':''}>${l}</text>`;
  s+=ar(100,108,100,166,'no lock ×100',-6)+ar(140,166,140,108,'no lock ×100',6)+ar(200,70,288,110,'lock',4)+ar(200,200,288,160,'lock',4)+ar(460,130,538,130,'7 passes',-29)+ar(620,160,620,218,'A/D OFF')+ar(540,240,200,90,'');
  for (const k in S){ const [x,y,a,b,c]=S[k], on=k===st; s+=`<rect x="${x}" y="${y}" width="170" height="66" rx="9" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+10}" y="${y+20}" font-size="12.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${a}</text><text x="${x+10}" y="${y+38}" font-size="10.5" fill="${on?'#eef':'var(--ink2)'}">${b}</text><text x="${x+10}" y="${y+53}" font-size="10.5" fill="${on?'#eef':'var(--ink2)'}">${c}</text>`; }
  return s+'</svg>'; }
function translateHTML(t){ const f=displayAt(t).f; if (!f) return '<p class="muted small">SHARC not running at the playhead.</p>';
  const row=(ch)=>{ const v=f.vr[ch], p=f.pr[ch], h=f.hold[ch];
    return `<tr><td>${ch?'R':'L'}</td><td class="mono">${v}</td><td class="mono">${Math.min(261,p+6)}</td><td class="mono">${h>=255?'255 (off)':Math.min(261,h+6)}</td><td class="mono small">vu1 ${bin(TBL.vu1[v])}<br>vu2 ${bin(TBL.vu2[v])}<br>vu3 ${bin(TBL.vu3[v],9)}</td></tr>`; };
  const W=f.W;
  return `<table class="kv"><tr><th>Ch</th><th>vu_results → index</th><th>pk_results + 6</th><th>hold + 6</th><th>VU table words (bit 0 = start)</th></tr>${row(0)}${row(1)}</table>
    <p class="small mono">phase_results = ${f.ph} → sdm_phase_data[${f.ph}] = ${bin(TBL.ph[Math.min(256,f.ph)])} (${PH_ORDER.filter(b=>TBL.ph[Math.min(256,f.ph)]>>b&1).length} LEDs)</p>
    <table class="kv mono small"><tr><th>word</th><th>value (bits 17…0)</th></tr>${[['shift1 (A, L)',W.AL],['shift2 (B, L)',W.BL],['shift3 (C, L + phase)',W.CL],['shift5 (A, R) >>1',W.AR],['shift6 (B, R) >>1',W.BR],['shift7 (C, R >>1 | lock_status)',W.CR]].map(r=>`<tr><td>${r[0]}</td><td>${bin(r[1])}</td></tr>`).join('')}</table>
    <p class="small">meter_cal = ${f.cal} (${f.dig?'CAL '+calIdx():'analog: meter_cal0'}) is added to both the VU and the peak value in v1.02. ${f.forced?'<b>AES not locked: v1.02 forces vu/pk/phase to 255 (blank bars, phase at +1).</b>':''}</p>`; }
function regsHTML(t){ const p=passAt(t), j=jumper0(), f=displayAt(t).f, lw=f?f.lw:0;
  const bits=(v,names)=>names.map((n,i)=>`<td style="text-align:center;background:${(v>>(names.length-1-i))&1?'color-mix(in srgb,var(--accent) 30%,transparent)':'transparent'}" class="small">${n}<br><b>${(v>>(names.length-1-i))&1}</b></td>`).join('');
  return `<table class="kv"><tr><th>jumper0 → anc_data[0]</th>${bits(j,['–','–','CAL1','CAL0','BS1','BS0','A/D=1:ana','BRIGHT'])}</tr>
   <tr><th>address</th>${bits(address(),['–','–','–','–','–','–','dip7 A0','dip8 A1'])}</tr>
   <tr><th>anc_data[1]</th>${bits((p&&p.lock?1:0)|(p&&p.sc?2:0),['–','–','–','–','–','–','COM','lock'])}</tr>
   <tr><th>lock_status (v1.02)</th>${bits(lw>>8,['–','–','ERROR','96K','48K','44.1K','COM','LOCK'])}</tr></table>
   <p class="small">lock_status = (anc_data[1] ≪ 8) | sample_rate, plus ERROR when anc_data[1] bit 0 = 0; it is forced to 0 in analog mode, so COM never lights there.</p>`; }
function uartHTML(){ const E=emulate(); const L=E.uartLog.slice(-12);
  return L.length ? `<table class="kv"><tr><th>t</th><th>byte</th><th>what uart.asm did</th></tr>${L.map(u=>`<tr><td class="mono">${SIM.fmtT(u.t)}</td><td class="mono">${u.b!=null?hex(u.b):''}</td><td class="small">${u.note}</td></tr>`).join('')}</table>${E.replies.length?`<p class="small">Replies (0x81): ${E.replies.map(r=>SIM.fmtT(r.t)).join(', ')}</p>`:''}` : '<p class="muted small">No RS-485 traffic yet. Use the POD23 buttons.</p>'; }
const VERS = [
  ['PIC v1.00','Dec 24 '+Y(2002),'Software/v100 · working/com','First release, Issue 1 PCB; no POD23 protocol (working/no_com, Oct 2002, is the version without serial).'],
  ['PIC v1.01','Feb 18 '+Y(2003),'Software/v101','“SHARC V1.01 is for CS4336-KS (obsolete), V1.02 is for CS4334-KS” — the BOM fits a CS4335.'],
  ['PIC v1.02 (a)','Mar 17 '+Y(2003),'working/proto2 = POD23Com/POD22','“Issue 2 PCB”, adds the POD23 UART protocol (the copy the POD22A plugin traced).'],
  ['PIC #554265','Nov 2 '+Y(2004),'Software/554265','Custom: POD22 polls two POD23s (F0/F1), separate left/right levels, SPBRG 12.'],
  ['PIC v1.02 (b)','Feb 1 '+Y(2006),'Software/v102','Same number again, “Issue 1 PCB”: “fixed the noise issue when no lock occurs” (OMCK while unlocked).'],
  ['PIC v1.03','May 16 '+Y(2006),'Software/v103','Only cs8420reg4def_s changes, 0x45 → 0x49: “distorted audio outputs”. Modelled here.'],
  ['DSP v1.00–v1.02','Oct '+Y(2002)+' – Feb '+Y(2003),'sharc/v100…v102','sdm_* tables for this 41-segment face; v1.01 → v1.02 swaps the two analog output words and drops the CS4336 shift. Modelled here.'],
  ['DSP v1.02.1','Jan 25 '+Y(2006),'sharc/v102.1','Customer build: CAL 3 becomes −12 dBFS (meter_cal3 = 10).'],
  ['DSP v1.03','Jun '+Y(2011),'sharc/v103','slm1_* tables for the 57-point SLM1-4 board (the POD22A face); trims, PK lamp, brightness and the no-lock blanking removed.']];
function viewSoft(m){ window.__pod22Active=true;
  m.innerHTML = `${card('PIC16F874 MAIN loop (pod22v3.asm) — the running step follows the playhead', `<div id="ml"></div><div id="mst" class="small"></div>`)}
    ${card('Autodetect and lock (autodetect, cs8420lockprocess)', `<div id="ad" style="max-width:900px"></div>`)}${card('SHARC sport0_isr — every sample', `<div id="isr"></div><p class="small">Background (main): for each channel VUMeterGet(VU) + meter_cal, VUMeterGet(PPM) + meter_cal, clamp 0–255; PhaseMeterGet for channel 0. Values are −2·10·log10 of the mean square, so 0.5 dB per step and 0 VU at −20 dBFS = 40.</p>`)}
    ${card('translate_meter_results at the playhead — table look-ups to MM5450 words', `<div id="tr"></div>`)}
    <div class="grid2">${card('Register maps', `<div id="rg"></div>`)}${card('RS-485 frame parser (uart.asm v1.03)', `<div id="ua"></div>`)}</div>
    ${card('Version history in the folder', `<table class="kv"><tr><th>Version</th><th>Date</th><th>Folder</th><th>What changed</th></tr>${VERS.map(v=>`<tr><td>${v[0]}</td><td class="small">${v[1]}</td><td class="mono small">${v[2]}</td><td class="small">${v[3]}</td></tr>`).join('')}</table>`)}`;
  const ISR=[['save emuclk','sample-rate timer'],['A/D test','anc_data[0] & 2'],['float, trim','halfdb[level], a_in_cal'],['outputs','AES, −a_out_cal → DAC'],['VUMeterCalc','VU, PPM attack/decay'],['PhaseMeterCalc','|L+R|, |L−R|'],['mux_counter','300 → mux_ctl'],['PK / hold counters','200,000'],['shift_led_data','one FLAG7 edge'],['rate · lock · cal','sample_rate_calc …']];
  const draw=()=>{ const t=SIM.t, E=emulate();
    const ph = t<E.tMain ? -1 : ((t-E.tMain)%PASS); let k=-1; if (ph>=0) for (let i=0;i<STEP_T0.length;i++) if (ph>=STEP_T0[i]) k=i;
    m.querySelector('#ml').innerHTML = flowSVG(PASS_STEPS.slice(0,5).map(s=>({t:s[0],s:[s[1]+' cycles',s[2].slice(0,30)]})), k<5?k:-1) + flowSVG(PASS_STEPS.slice(5).map(s=>({t:s[0].split(' · ')[0],s:[s[1]+' cycles',s[2].slice(0,30)]})), k>=5?k-5:-1);
    const p=passAt(t);
    m.querySelector('#mst').innerHTML = k<0 ? (E.powered&&t<E.tMain ? 'PIC in init.asm (delay loops, resets held).' : '—') : `Pass ${Math.floor((t-E.tMain)/PASS).toLocaleString()} · step ${k+1}: <b>${PASS_STEPS[k][0]}</b> — ${PASS_STEPS[k][2]} · ${p?`port ${p.port||'—'} · lock ${p.lock} · mode,0 ${p.m0} · OMCK flag ${p.b6} · COM ${p.sc}`:''} <span class="muted">(cycle counts estimated from the code, ${inf})</span>`;
    m.querySelector('#ad').innerHTML = autodetectSVG(t);
    const fs=isrRate(t), n=Math.floor(t*fs), frac=(t*fs)%1; const ik=Math.min(ISR.length-1, Math.floor(frac*ISR.length));
    m.querySelector('#isr').innerHTML = flowSVG(ISR.slice(0,5).map(s=>({t:s[0],s:[s[1]]})), sharcState(t)==='run'&&ik<5?ik:-1)+flowSVG(ISR.slice(5).map(s=>({t:s[0],s:[s[1]]})), sharcState(t)==='run'&&ik>=5?ik-5:-1)+`<p class="small mono">interrupt ${n.toLocaleString()} · ${Math.round(CORE/fs)} cycles per sample · step shown spread over the period (${inf})</p>`;
    m.querySelector('#tr').innerHTML = translateHTML(t); m.querySelector('#rg').innerHTML = regsHTML(t); m.querySelector('#ua').innerHTML = uartHTML(); };
  SIM.on('time', draw); }

/* ======================= findings ======================= */
const FINDINGS = [
  '<b>The A/D lever works the other way from the manual.</b> <span class="mono">POD22 MANUAL.pdf</span> (Jan '+Y(2003)+') and both jumper notes say SW2 ON = Analog. <span class="mono">read_jumpers</span> in every PIC version replaces <span class="mono">btfss portd,7</span> with <span class="mono">btfsc portd,7</span>, so ON (pin low) = digital. The netlist ties DB9 pin 1 to the same pin (RD7, via R46), which is why the 2013 POD22A text says a closure on pin 1 selects digital; that later manual also corrects SW2 to ON = Digital.',
  '<b>Address bits swapped.</b> The manual calls SW7 “Address0” and SW8 “Address1”, but <span class="mono">read_jumpers</span> puts dip7 in <span class="mono">address,1</span> (MSB) and dip8 in <span class="mono">address,0</span>. The comments still say “auto level” / “manual level”, the functions of the Oct '+Y(2002)+' prototype (jumpers version 1_00).',
  '<b>“3 seconds” is 200,000 samples.</b> The manual gives 3 s for both the PK lamp and peak hold. <span class="mono">pk_hold</span> and <span class="mono">ppm_hold</span> are 200,000 interrupts: 4.17 s at 48 kHz, 4.54 s at 44.1 kHz, 2.08 s at 96 kHz, 6.25 s at 32 kHz. The ballistic time constants are recalculated per rate; these counters are not.',
  '<b>A frame for another address resets this one.</b> In <span class="mono">check_address</span> a mismatch does <span class="mono">clrf serial_control</span> (“turn com led when wrong address”) and writes 195 (unity) back to all four trims. With two POD22s on one RS-485 line, every frame for one cancels the other\'s correction and COM.',
  '<b>COM lasts 19 s and never lights in analog mode.</b> <span class="mono">uart_control</span> counts serial_timeout0/1 up from 0/200: 14,336 passes ≈ 18.9 s after the last byte (pass time '+inf+'). The SHARC\'s <span class="mono">refresh_lock_status</span> writes lock_status = 0 in analog mode, which also clears the COM bit, so a POD23 can change the gain of an analog unit without COM showing it.',
  '<b>A POD23A v100 frame would mute a v1.03 POD22.</b> pod23.js shows the POD23A sending <span class="mono">FF 00 00 01 &lt;level&gt; AA</span>. This parser takes the third byte (00) as command “level” and the fourth (01) as the level: halfdb_data[1] = −97 dB, applied to meter and outputs; <span class="mono">uart_process</span> then clears the parser, so the real level and AA are ignored. (Derived from the code; the two were probably never paired.)',
  '<b>The trims select one of four tables.</b> Each 10-bit word to the SHARC is a table number in the top 2 bits and an index in the low 8 (3 = halfdb_data, 195 = 0 dB; 2 = point_one_dB_table). <span class="mono">cal_l/cal_r = 73</span> and <span class="mono">input_gain</span> are dead: the SHARC never calls input_gain, and init.asm\'s comment “select half dB table” sits on a 0x02 that selects the 0.1 dB table.',
  '<b>DSP v1.03 (2011) is for the POD22A face.</b> It swaps the sdm_* tables for slm1_* (57 points, +20 … −60, SLM1-4 board), stops applying the POD23 trims (anc_data[2…5] are no longer read), removes the PK lamp, brightness and the no-lock blanking, and drops the CAL offset from the peak path (“Ali-Rem”). The misfiled test report <span class="mono">POD21 - #TESTREPORT/POD22-V103-13JUN11.pdf</span> agrees (“Brightness Control and Overload Peak Hold functions are removed”), and <span class="mono">SILK/POD22A-Silk.cdr</span> (Jun '+Y(2011)+') sits in this folder.',
  '<b>Two different “v1.02” PIC programs.</b> <span class="mono">working/proto2/pod22v2.asm</span> (Mar '+Y(2003)+', “Issue 2 PCB”, the POD23 copy) and <span class="mono">Software/v102/pod22v2.asm</span> (Feb '+Y(2006)+', “Issue 1 PCB”, OMCK-while-unlocked fix). v1.03 differs from the 2006 v1.02 in one constant (cs8420reg4def_s 0x45 → 0x49).',
  '<b>The missing POD22 master is here.</b> pod23.js could not find the POD22 firmware that polls the 2003 two-knob POD23 (#554265). <span class="mono">Software/554265/pod22v1.asm</span> (“Pod 22 communicating with 2 POD23s”, Nov '+Y(2004)+') is it: it sends F0/F1 (+8 updated, +2 AES lock), then level 1, level 2 and the display byte, accepts left/right levels clamped to 165–225, and changes SPBRG from 13 to 12 (+7.7 % baud at the same clock).',
  '<b>Part names disagree.</b> The BOM and netlist fit a <b>CS8427</b> (U2, schematic symbol “CS8420”) and a <b>CS4335</b> DAC (U18, symbol CS4330); the PIC code says cs8420 throughout and the header says CS4334 / CS4336.',
  '<b>init.asm swaps the receiver comments.</b> It lists “RE0 SEL_75 (U9)” and “RE1 SEL_110 (U10)”; the netlist names RE0\'s net SEL_110A and puts U9 behind T1 and the 110 Ω R11. The code (“allow 110 digital signal”: RE0 low) agrees with the netlist.',
  '<b>The SHARC is reset on every lock.</b> When autodetect confirms a lock, <span class="mono">force_runstop_1</span> stops and restarts the CS8427 and pulses <span class="mono">resetsharc</span>: the DSP reboots from flash and the meters restart from zero. Switching to analog does the same once (resetsharcprocess).',
  '<b>A SHARC heartbeat on SPORT1.</b> The SHARC sends pic_out_data = 1 … 16, 170; the PIC compares the last byte with <span class="mono">brown_data = 0xAA</span> and after 20 misses parks in <span class="mono">here: goto here</span>. The POD23 copy bypasses the check (<span class="mono">goto continue_shift</span>).',
  '<b>Right-channel hold mask has no effect (v1.02).</b> For the left channel the hold word is masked (<span class="mono">and</span> −1 mask) before it is OR-ed in; for the right the OR comes first, then r2 is overwritten as the shift count. The right hold dot can therefore sit on the −1 segment; the left cannot.',
  '<b>Dim mode is skipped while unlocked.</b> With no AES lock, translate_meter_results forces the values to 255 and jumps straight to <span class="mono">bright</span>, so ERROR shows at full brightness even with BRIGHT OFF.',
  '<b>Dead pins and leftovers.</b> FLAG8/FLAG9 are toggled as “left/right select” in v1.02 but are unconnected in the netlist (“no mux with sdm”). TRIML/TRIMR (RA0/RA1) reach no other part. <span class="mono">synch_test</span> and <span class="mono">input_gain</span> are never called; <span class="mono">sport1_isr</span> is a bare rti whose interrupt is never unmasked; <span class="mono">emuclk_prev+2</span> is saved but unused; FLAG0 is pulsed every sample with the VMS44 comment “resets altera audio clock counter”.',
  '<b>Array overrun by design.</b> <span class="mono">dma_in_a[2]</span> is declared with two words, but the analog path reads <span class="mono">dma_in_a+2</span> and <span class="mono">+3</span> — the next variable, dma_in_b, where SPORT0 B (the CS5333) lands. It works only because of declaration order. The first A/D word (“analog left”) goes to meter channel 1; whether that is a swap depends on board wiring the netlist alone does not settle.',
  '<b>Sample-rate detection has a fall-through.</b> <span class="mono">sample_rate_calc</span> measures emuclk cycles between interrupts (1024 at 48 kHz). Below about 24.6 kHz (Δ ≥ 2000) no test jumps and the code falls into update_meter_parameters_48. At 32 kHz no rate tally lights; the manual\'s range is 30–96 kHz.',
  '<b>Silence reads “90°”.</b> PhaseMeterGet returns 128 when |L+R| + |L−R| averages fall below 1e-4, which the phase table shows as four LEDs. With AES unlocked v1.02 forces 255 instead, a single LED at +1.',
  '<b>Artwork '+Y(2026)+': front/rear panels now from '+SIM.src('#POD #SERIES/XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/SILK/POD22-Silk.cdr','SILK/POD22-Silk.cdr')+' (Jan 9 2003).</b> It is the only full silk of the 41-point POD22 face. Its text is live (not curves), so libcdr loses the alignment: every label had to be re-anchored, and the 41 rotated scale numbers come out flat and overlapping (they are drawn by the simulator). The only curve version, '+SIM.src('#POD #SERIES/XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/SILK/POD22-S2curve.cdr','SILK/POD22-S2curve.cdr')+' (Sep 23 2002), is a rear panel alone and names DIP levers 7–8 <b>AUTO / MAN</b>; four months later POD22-Silk.cdr calls them <b>A0 / A1</b>, the RS-485 address bits the v1.0x code reads (see the swapped-address finding).',
  '<b>Misfiled and mislabelled files.</b> <span class="mono">MANUAL/Backup_of_Pod22manu.pdf</span> is a “POD 9 VIDEO SWITCHER” page. The 2002 mechanical drawings M1/M2 call for silkscreen “#POD22A-FRONT&amp;REAR-SILK”, a name from the later product (edited in). The POD33 folders <span class="mono">Sharc/POD22 v102</span> and <span class="mono">WORKING FILES/POD22 v102</span> are now empty. The 2003 silk keeps the 41-point scale; <span class="mono">POD22-Silk-iss2.cdr</span> (2006) already carries the 52 … +20 scale.'];
const ASSUMPTIONS = [
  'PIC clock ≈ 8.6016 MHz from SPBRG = 13 at 9600 Bd; one MAIN pass ≈ '+SIM.fmtDur(PASS)+' from an instruction count of the code. Every pass-based time (autodetect, COM, reply) scales with these.',
  'SHARC core 49.152 MHz (24.576 MHz × 2) from the emuclk numbers in sample_rate_calc\'s comments. Reboot after a reset: '+SIM.fmtDur(BOOT)+'. CS8427 lock time: '+SIM.fmtDur(TLOCK)+'.',
  'While unlocked the CS8427 clocks the SHARC from OMCK at 48 kHz, so the 48K tally shows with ERROR, and the audio it passes is silence.',
  'A/D full scale ≈ +24.1 dBu and D/A full scale ≈ +23.7 dBu, derived from a_in_cal/a_out_cal and 0 VU = +4 dBu; analog L/R are taken as wired straight.',
  'Display board: three MM5450 drivers, phase LED order (bit 12, 13, 11, 14…17 from +1 down) and the two red 0 VU markers being always on are inferred from the code and photos; there is no display-board netlist.',
  'PPM hold is evaluated once per display frame (every 300 samples) instead of every sample; the main loop is assumed to refresh vu/pk results faster than the frames.',
  'Only the last input/mode change in the second is remembered (it marks where the PIC state machine restarts).'];
const SOURCES = ['POD22 - #Engineering/sharc/v102/vms44_main.asm, vumeter.asm, phasemeter.asm, vms44_INIT.ASM, sdm_*.dat, halfdb_data.dat · v100, v101, v102.1, v103 for comparison',
  'POD22 - #Engineering/Software/v103/pod22v3.asm, init.asm, modes.asm, uart.asm · v100, v101, v102, working/*, 554265/*',
  'POD22 - #Engineering/PCB/Pod22-1-ISS2.net, Pod22-1-ISS2.bom, GERBERS/ISS2/notes.txt',
  'POD22 - #Engineering/MANUAL/POD22 MANUAL.pdf, jumpers version 1_00.pdf, jumpers version 1_01.wpd, POD22 Cutsheet.wpd, latest (oct.17 2013)/POD22 MANUAL.doc, Backup_of_Pod22manu.pdf',
  'POD22 - #Engineering/POD22 - Functional Diagram.pdf · SILK/POD22-Silk.cdr (→ assets/pod22-*.png), POD22-Silk-iss2.cdr, POD22A-Silk.cdr · Photos/POD22 Front @ 0.jpg, Front @ Full.jpg, Rear.jpg',
  'POD22 - #Mechanical #DA #2016/POD22-M1 ISS 1 (FRONT PANEL).pdf, POD22-M2 ISS 2 (REAR PANEL).pdf',
  '../POD21 - #Master/POD21 - #TESTREPORT/POD22-V103-13JUN11.pdf · ../POD23 - #Engineering/…/POD23Com/POD22/ · siumulation-plugins/pod22a.js, pod23.js, slm.js'];
const viewNotes = notesView('__pod22Active', 'What the POD22 and its firmware are up to', FINDINGS, ASSUMPTIONS, SOURCES);

/* ======================= register ======================= */
SIM.register({ id:'pod22', name:'POD22 · stereo loudness meter, AES or analog, SHARC + PIC ('+Y(2003)+')', duration:1, product:'POD22', year:2003,
  family:'Obsolete products', folder:'#POD #SERIES/XXX - POD22 - #Master # Obsolte',
  summary:'Half-rack stereo loudness meter: two 40-segment VU-plus-peak bars, a phase column and LOCK/COM/rate/ERROR tallies, fed from AES (75 or 110 Ω, found automatically) or analog. A PIC16F874 is emulated pass by pass (DIPs, autodetect, CS8427, RS-485 control from a POD23) and the ADSP-21065L SHARC meters every sample through the real display tables to the MM5450 bit frames.',
  highlights:['Real 2003 silkscreen, front and rear, with every LED driven from the SHARC tables','PIC MAIN loop, autodetect and SHARC resets emulated pass by pass','POD23 RS-485 frames, COM and the gain they apply','VU / PPM / hold / PK lamp / phase at sample level, per sample rate','Bit-level MM5450 display frames and PIC→SHARC words','Findings: inverted A/D lever, swapped address bits, the missing POD23 master'],
  depth:'Full model',
  stepUnits:[{label:'1 PIC pass', period:()=>PASS},{label:'1 display frame', period:()=>MUX_RATE/isrRate(SIM.t)},{label:'1 sample', period:()=>1/isrRate(SIM.t)},{label:'10 ms', period:()=>0.01},{label:'100 ms', period:()=>0.1}],
  zooms:[[1,'1 s'],[0.5,'500 ms (burst cycle)'],[0.25,'250 ms (autodetect)'],[0.05,'50 ms'],[0.01,'10 ms (frames)'],[0.002,'2 ms (passes, bytes)'],[0.0002,'200 µs (samples)']], defaultZoom:0,
  init(){ bump(); },
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second, frame by frame',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Software (PIC + SHARC)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}] });
})();
