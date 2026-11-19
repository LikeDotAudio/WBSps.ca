/* =====================================================================
   RLM — RLM12/RLM24 high-density AES rack meters and the RLM2 (Ward-Beck Systems), SHARC metering model
   Plugin for the WBS Device Simulator (../siumulation.htm). Full model of the ADSP-21262 "shell262" code.

   Sources used (all under "#RLM #SERIES/XXX - RLM  - #Master #obsolete/"):
   - RLM - #OBSOLETE #Archive/software/sharc/v100/ (production "SHARC V100"): backgnd.c (main, refresh), sample.c
       (SampleInit, SampleIRQ, input_map), vumeter.asm/.h (VUMeterCalc/Get/Edit/Init, TCONST_*), SSensor.asm/.h,
       SS_tallies.c, spi.c (SPIProcRX, parm_map), get_parms.c, shifter.asm, rlm24_vu_data.c, configdai.c (InitDAI),
       timer.c/.h, version.h, sysdef.h, rlm24.mak (what is built), rlm24_proc.c + refresh.c + shell262.dpj (not built)
   - …/software/sharc/last, nab2005, rlm12d, v100test, rlm24v100test (the other builds, diffed against v100)
   - …/software/ALTERA/V100/ (RLM24-2V100.bdf/.qsf, tdm_gen.vhd, shift_in_out32.vhd, display_clear.vhd, CS_8416.vhd,
       latch24.vhd, shift_in12x2.vhd), …/software/Atmel/RLM24/v101/v101.c (ALTERA_SORT, ALTERA_read_write, UART0)
   - RLM24-2/PCB/rlm24-2ISS2.net (main board), RLM24-1/PCB/rlm24-1iss2.net/.pnp/.bom (display board)
   - MANUAL/RLM12 RLM24 Manual.pdf, RLMCTL/554164 COMMUNICATION PROTOCOL.doc
   - RLM24 - #Mechanical #Obsolete/: Not in ERP/RLM24-1M3 ISS 1 (DISPLAY LENS).pdf, RLM24-1M4 ISS2, RLM24-1M5 ISS 1
       (L&R SIDE PLATE), Reference/RLM24-FRONT ASSEMBLY.pdf
   - RLM2 - #Mechanical #Obsolete/: RLM2-M1 ISS 1 (FRONT PANEL).pdf, RLM2-M2 ISS.2 (REAR PANEL).pdf,
       Silks/RLM2-REAR-SILK(CURVE).pdf (→ assets/rlm-rlm2-rear-white.png via tools/silk_extract.py), Silks/Pics/*.jpg
   - RLM - #OBSOLETE #Archive/SILK/RLM24REARCURVE.cdr, RLM12REARcurve.cdr (→ assets/rlm-rlm24-rear-white.png,
       rlm-rlm12-rear-white.png via Inkscape)
   Anything not in those files is marked "inferred" on screen.
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
/* Artwork 2026|59: rear panels are the CorelDRAW silks as vectors (assets/rlm-rlm24-rear.svg, rlm-rlm12-rear.svg, rlm-rlm2-rear.svg) */
const RLMA='#RLM #SERIES/XXX - RLM  - #Master #obsolete/RLM - #OBSOLETE #Archive/', RLM2S='#RLM #SERIES/XXX - RLM  - #Master #obsolete/RLM2 - #Mechanical #Obsolete/Silks/';
const FOOT=[
 {text:'The 2016 RLM2 rear silk cuts each input as an XLR-size D hole and prints “G − +” beside it, but the photographed RLM2D has a BNC fitted in that D hole: the pin legend is left over from the XLR (110 Ω) version.', src:RLM2S+'Pics/RLM2D Rear.jpg'},
 {text:'The RLM2 rear silk puts INPUT 2 on the left and INPUT 1 on the right; the photographed unit reads INPUT 1 then INPUT 2 from the left.', src:RLM2S+'RLM2-REAR-SILK(CURVE).cdr'},
 {text:'On the RLM2 rear a small round hole sits between the IEC inlet and the first screw with no legend, and each input has its own four-pin jumper window labelled BS1 BS0 CAL1 CAL0.', src:RLM2S+'RLM2-REAR-SILK(CURVE).cdr'},
 {text:'RLM2 rear silks exist in four saves: RLM2-REAR-SILK.cdr and -CURVE.cdr (Feb 2006), -ISS2.cdr and its Backup_of_ (9 May 2006), then the 2016 re-draw in the RLM2 mechanical folder (16–17 May 2016).', src:RLMA+'RLM2/SILK/RLM2-REAR-SILK-ISS2.cdr'},
 {text:'The RLM12 rear silk is the analog “RLM-12 LOUDNESS METER”: three identical four-input groups, numbered 9–12, 5–8 and 1–4 from left to right as seen from the rear, each with its own ON/OFF switch window and CAL0/CAL1/BS0/BS1/PH1–PH4 jumpers.', src:RLMA+'SILK/RLM12REARcurve.cdr'},
 {text:'The RLM12 rear reads “90-240 VAC, 50-60 Hz, MAINS FUSE 5A S.B.” while the RLM24 rear reads “90-230 VAC, 1A S.B.” and has two inlets, PS1 and PS2, with the caution “DISCONNECT BOTH AC POWER SOURCES”.', src:RLMA+'SILK/RLM24REARCURVE.cdr'},
 {text:'The RLM24 rear prints a maker’s block “WARD-BECK SYSTEMS LTD / MADE IN CANADA / RLM-24” with a CE mark, and numbers its 24 AES inputs 1–12 on the top strip and 13–24 on the bottom, with a single “+ − G” key at the left of each strip.', src:RLMA+'SILK/RLM24REARCURVE.cdr'},
 {text:'Each RLM silk is kept twice, as live text and as curves: RLM12REAR.cdr / RLM12REARcurve.cdr and RLM24REAR.cdr / RLM24REARCURVE.cdr, saved the same day.', src:RLMA+'SILK/RLM24REAR.cdr'},
];
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
const Y = y => SIM.year(y);
const ACT = '__rlmActive';
/* =====================================================================
   1. Constants, all from the files named next to them
   ===================================================================== */
const FS = 48000;                     // sysdef.h SAMPLE_RATE
const MCLK = 24.576e6;                // rlm24-2ISS2.net X1 "24.578M" (sic) on U1-142/143 (SHARC CLKIN) and the FPGA mclk
const TDM_BITS = 512;                 // tdm_gen.vhd: 9-bit counter, fsynch_sharc at "000000000"
const TIMER_RATE = 50000;             // timer.h: TIMER_RATE 50000 // 100000/2 "1 msec rate based on 100MHZ system freq"
const CCLKS = [
  {v:196.608e6, l:'196.608 MHz: CLKIN 24.576 MHz × PLLM16 ÷ PLLD2 (main() sets PLLM16; PLLD2 is the reset divisor)'},
  {v:147.456e6, l:'147.456 MHz: the 6:1 reset ratio, as if the PMCTL write had not taken'},
  {v:50e6,      l:'50 MHz: the clock TIMER_RATE 50000 would need for its “1 msec” comment'}];
const TC = { VU:0.000319752, PA:0.02276277, PD:0.000031978, SS:0.99968 };     // vumeter.asm, SSensor.asm TCONST_RMS
const VU_ALT = [0.000319752, 0.0003836906, 0.000639402];                     // TCONST_VU and its two commented-out values
const PD_ALT = [0.000031978, 0.000191863];                                   // TCONST_PPM_DECAY and the commented-out value
const t40 = T => 4/(FS*-Math.log10(1-T));            // vumeter.asm: tconst = 1.0 − 10^(−40/(10·time·FS)) → time for 40 dB
const tau = T => -1/(FS*Math.log(1-T));
/* meter (1…24) → SHARC channel index of its left side (right = +1): spi.c parm_map, identical to sample.c input_map */
const MAP = [16,18,20,22,8,12,10,14,0,4,2,6,40,42,44,46,32,36,34,38,24,28,26,30];
/* sample.c input_map[k]: TDM word k → audio_in_float index */
const IMAP = [16,17,32,33,44,45,40,41,42,43,46,47,36,37,18,19,4,5,10,11,20,21,22,23,12,13,8,9,14,15,0,1,24,25,28,29,38,39,2,3,6,7,34,35,30,31,26,27];
const IMAP12 = [16,17,26,27,26,27,26,27,26,27,26,27,26,27,20,21,38,39,42,43,8,9,10,11,2,3,0,1,46,47,36,37,26,27,26,27,26,27,28,29,30,31,26,27,26,27,26,27];   // rlm12d/v100/sample.c
const ZERO12 = [4,5,6,7,12,13,14,15,18,19,22,23,24,25,26,27,32,33,34,35,40,41,44,45];   // rlm12d backgnd.c: ss_results[n] = 0
const SLOT_M = IMAP.map(j=>({m:MAP.indexOf(j&~1)+1, s:j&1}));      // TDM word → rear input (meter) and side (RLM24 wiring)
const SPORT_OF = k => ['SPORT1 (DAI_P3)','SPORT3 (DAI_P4)','SPORT5 (DAI_P5)'][k>>4];
const BUILDS = {
  v100:   {l:'sharc/v100 — “SHARC V100” (RLM24/RLM12 V1000 listing)', yr:2005, cal:+1},
  last:   {l:'sharc/last — rlm24.dpj saved Aug 2007', yr:2007, cal:-1},
  nab2005:{l:'sharc/nab2005 — NAB 2005 show build', yr:2005, cal:+1},
  rlm12d: {l:'sharc/rlm12d — RLM12 build, Sep 2006', yr:2006, cal:+1}};
/* display tables, rlm24_vu_data.c, as run lengths (index = parameter value − 6 ± cal; 2 entries per dB) */
function rle(runs, n){ const a=new Array(n||256).fill(0); let i=0; runs.forEach(([v,c])=>{ for(let k=0;k<c;k++) a[i++]=v; }); return a; }
const VU1 = rle([[0x3ffffff,41], ...(()=>{ const r=[]; for(let v=0x1ffffff; v>=0x3ff; v=v>>>1) r.push([v,2]); return r; })(), [0x1ff,4],[0xff,4],[0x7f,4],[0x3f,4],[0x1f,4],[0xf,4],[0x7,8],[0x3,8],[0x1,143]]);
const VU2 = rle([[0xffff,1],[0x7fff,4],[0x3fff,4],[0x1fff,4],[0xfff,4],[0x7ff,2],[0x3ff,2],[0x1ff,2],[0xff,2],[0x7f,2],[0x3f,2],[0x1f,2],[0xf,2],[0x7,2],[0x3,2],[0x1,2],[0,1]]);
const PK1 = rle([[0,39], ...(()=>{ const r=[]; for(let v=0x2000000; v>=0x200; v=v>>>1) r.push([v,2]); return r; })(), [0x100,4],[0x80,4],[0x40,4],[0x20,4],[0x10,4],[0x8,4],[0x4,8],[0x2,8],[0x1,8],[0,1]]);
const PK2 = rle([[0x8000,2],[0x4000,4],[0x2000,4],[0x1000,4],[0x800,4],[0x400,2],[0x200,2],[0x100,2],[0x80,2],[0x40,2],[0x20,2],[0x10,2],[0x8,2],[0x4,2],[0x2,2],[0x1,2],[0,1]]);
/* 42 LEDs per bar, bottom → top: data1 bits 0…25, data2 bits 0…15 (rlm24_vu_data.c comments) */
const SCALE = [-40,-36,-32,-28,-26,-24,-22,-20,-18,-16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,14,16,18,20];
/* LED colours, rlm24-1iss2.pnp (bar L1_1…L1_42 sorted by Y): 19 GRN, 5 YEL, 3 GRN, 7 YEL, 8 red */
const ZONE = k => k<19?0 : k<24?1 : k<27?0 : k<34?1 : 2;
const ON_COL = ['#5dff6a','#ffd23a','#ff4a3a'], OFF_COL = ['#16301b','#33300f','#3a1613'];
/* RLM24-1M3 display lens: 24 pushbutton holes (.406 dia.) at y 2.969", pitch .700" */
const BTN = [.570,1.270,1.970,2.670,3.370,4.070,4.770,5.470,6.170,6.870,7.570,8.270,8.970,9.670,10.370,11.070,11.770,12.470,13.170,13.870,14.570,15.270,15.970,16.670];
const REFS = [-20,-18,-16,-14];       // manual: SW5/SW6 ON/ON −20, OFF/ON −18, ON/OFF −16, OFF/OFF −14 dBFS
/* inferred timing (cycle counts estimated from the loop bodies; see the Software tab) */
const ISR_CYC = 1050, PASS_CYC = 7200, REFRESH_CYC = 4300;
const AVR_WORD = 182e-6, AVR_CYCLE = 0.020, AVR_WORDS = 50;   // v101.c ALTERA_read_write: 200 bytes = 50 words; bit-bang speed inferred
const NB = 1000, WARM = 0.3;          // cache: 1 ms buckets over the second, 0.3 s warm-up

/* =====================================================================
   2. Device state
   ===================================================================== */
function mkIn(i){ return { plug:true, kind: i%6===4 ? 'tone' : 'program', lvl: i%6===4 ? -20 : -12-((i*7)%9), f:1000 }; }
function fresh(){ return { power:true, build:'v100', cclk:0, dip:Array(8).fill(true), ps:[true,true], gpi2:false,
  in:[...Array(24)].map((_,i)=>mkIn(i)), chg:Array(24).fill(null), thr:Array(48).fill(40), dly:Array(48).fill(10), ack:Array(24).fill(false),
  sil:[...Array(24)].map(()=>[null,null]), vclock:0, sel:0, rear:'rlm24', wi:{peak:0, vu:0, pd:0, fixPrec:false, fix31:false, fixCal:false},
  log:[], cmds:[], ver:0 }; }
const D = fresh();
const act = makeActor(D, ()=>status1());
function bump(){ D.ver++; }
const frameNo = ()=> 1 + (D.dip[0]?0:1) + (D.dip[1]?0:2) + (D.dip[2]?0:4) + (D.dip[3]?0:8);
const calIdx = ()=> (D.dip[4]?0:1) + (D.dip[5]?0:2);
const CAL = ()=> calIdx()*4;                                     // spi.c: cal = ((val>>12)&3)*4
const powered = ()=> D.power && (D.ps[0]||D.ps[1]);
const cclk = ()=> CCLKS[D.cclk].v;
const TICK = ()=> TIMER_RATE/cclk();
const ISR_T = ()=> ISR_CYC/cclk();
const LOAD = ()=> ISR_T()*FS;
const PASS_T = ()=> LOAD()>=1 ? Infinity : (PASS_CYC/cclk())/(1-LOAD());
const REFRESH_T = ()=> REFRESH_CYC/cclk()/(LOAD()>=1?1:(1-LOAD()));

/* state at time t of the current second (a change made at SIM.t applies from then on) */
function stateAt(m, t){ const c=D.chg[m]; return (c && t < c.t) ? c.prev : D.in[m]; }
const isSilent = (st, s) => !st.plug || st.kind==='silence' || (st.kind==='L only' && s===1);
/* deterministic stimulus: what reaches TDM word k (± full scale = ±1.0 after "float by −31") */
function hashN(n, seed){ let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed+1, 0xc2b2ae35); h ^= h>>>13; h = Math.imul(h, 0x27d4eb2f); h ^= h>>>16; return ((h>>>0)/4294967296)*2-1; }
function sig(m, s, t, n){
  if (!powered()) return 0;
  const st = stateAt(m, t); if (isSilent(st, s)) return 0;
  const A = Math.pow(10, st.lvl/20); let x;
  if (st.kind==='tone') x = A*Math.sin(2*Math.PI*st.f*t);
  else { const e = 0.15 + 0.85*Math.pow(Math.abs(Math.sin(2*Math.PI*(1.1+0.07*m)*t + m*1.3 + s*0.4)),2)*(0.75+0.25*Math.sin(2*Math.PI*0.41*t+m));
    x = A*e*(0.55*Math.sin(2*Math.PI*(110+23*m)*t + s) + 0.30*Math.sin(2*Math.PI*(900+37*m)*t + 2*s + m) + 0.15*hashN(n, m*2+s)); }
  return Math.max(-1, Math.min(1, x));
}
function envOf(m, s, t){ if(!powered()) return 0; const st=stateAt(m,t); if (isSilent(st,s)) return 0; const A=Math.pow(10,st.lvl/20);
  return st.kind==='tone'? A : A*(0.15 + 0.85*Math.pow(Math.abs(Math.sin(2*Math.PI*(1.1+0.07*m)*t + m*1.3 + s*0.4)),2)*(0.75+0.25*Math.sin(2*Math.PI*0.41*t+m))); }
/* which TDM word feeds SHARC channel j in the selected build */
function srcOf(j){
  if (D.build==='nab2005') return {m:13, s:j&1, k:6+(j&1)};                 // nab2005 sample.c: TDM_in[i], i = 6,7,6,7…
  const map = D.build==='rlm12d' ? IMAP12 : IMAP; let k=-1;
  for (let q=0;q<48;q++) if (map[q]===j) k=q;                                // audio_in_float[input_map[k]]: the last write wins
  return k<0 ? null : {m:SLOT_M[k].m, s:SLOT_M[k].s, k};
}
const chOf = j => 2*MAP.indexOf(j&~1) + (j&1);                               // ATmega channel (0…47) whose word sets SSensor j via parm_map
const rxThr = j => D.thr[chOf(j)] + 3;                                       // v101.c ALTERA_SORT: threshold[n] + 3
const rxDly = j => { const d=D.dly[chOf(j)]; return D.wi.fix31 ? d : d & ~1; };  // get_parms.c: 31 clocks → bit 0 never read

/* =====================================================================
   3. The SHARC per-sample maths, run once per change and cached in 1 ms buckets
      VUMeterCalc: VU += (in²−VU)·Tvu; PPM += max((in²−PPM)·TppmA, (in²−PPM)·TppmD)
      SSensorCalc: MS = (MS−in²)·0.99968 + in²; count reload / decrement; DET_TIME 0 → 255 hack
   ===================================================================== */
const cache = {};
function sigKey(j){ const src=srcOf(j); if(!src) return 'none|'+rxThr(j)+'|'+rxDly(j);
  const m=src.m-1, sl=D.sil[m][src.s];
  return JSON.stringify([src, D.in[m], D.chg[m], rxThr(j), rxDly(j), D.wi.peak, D.wi.vu, D.wi.pd, powered(), sl==null?null:Math.round((D.vclock-sl.since)*100)/100, sl&&sl.fall]); }
function compute(j){
  const key = sigKey(j); if (cache[j] && cache[j].key===key) return cache[j];
  const src = srcOf(j), thrMs = Math.pow(10, -rxThr(j)/10), det = rxDly(j)*FS;
  const Tvu = VU_ALT[D.wi.vu], Ta = D.wi.peak?1:TC.PA, Td = D.wi.peak?0:PD_ALT[D.wi.pd];
  const vu=new Float32Array(NB), pk=new Float32Array(NB), ms=new Float32Array(NB), cnt=new Int32Array(NB);
  let v=0, p=0, q=0, pm=0, c = det===0 ? 255 : det;
  /* silence that began before the warm-up window: start the counter part-way down */
  const st0 = src ? stateAt(src.m-1, -WARM) : null;
  if (!src) c = 0;
  else if (isSilent(st0, src.s)) { const sl=D.sil[src.m-1][src.s]; const el = sl ? (D.vclock-WARM) - sl.since - sl.fall : 0;
    if (el>0 && det>0) c = Math.max(0, det - Math.round(el*FS)); }
  const n0 = -Math.round(WARM*FS);
  for (let n=n0; n<FS; n++){
    const t=n/FS, x = src ? sig(src.m-1, src.s, t, n) : 0, x2=x*x;
    v += (x2-v)*Tvu; const d=x2-p; p += Math.max(d*Ta, d*Td); if (x2>pm) pm=x2;
    q = (q-x2)*TC.SS + x2;
    let r1=c, r2=det; if (det===0){ r1=255; r2=255; } if (q<=thrMs) r2=r1-1; if (r2<0) r2=0; c=r2;
    if (n>=0 && (n+1)%48===0){ const b=(n+1)/48-1; vu[b]=v; pk[b]=D.wi.peak?pm:p; ms[b]=q; cnt[b]=c; if (D.wi.peak){ p=0; } pm=0; }
  }
  return (cache[j] = {key, vu, pk, ms, cnt, thrMs, det});
}
const bucket = t => Math.max(0, Math.min(NB-1, Math.floor(t*1000)));
/* VUMeterGet: dB = 10·log10(value); parameter = −2·dB, limited to 255, "fix" (round to nearest, MODE1 TRUNC clear — inferred) */
const vget = val => val<=0 ? 255 : Math.min(255, Math.round(-20*Math.log10(val)));
function chanAt(j, t){
  const C = compute(j), b = bucket(t);
  const vuP = vget(C.vu[b]), pkP = vget(C.pk[b]);
  const vr = Math.max(vuP, 6), pr = Math.max(pkP, 2);                       // backgnd.c: max(VUMeterGet(…),6), max(…,2)
  const sgn = (D.build==='last' && !D.wi.fixCal) ? -1 : +1, cal = CAL();
  const vi = vr - 6 + sgn*cal, pi = pr + cal;
  const rd = (tb, i) => i<0 ? null : (tb[i]||0);
  const a1=rd(VU1,vi), a2=rd(VU2,vi), b1=rd(PK1,pi), b2=rd(PK2,pi);
  const d1 = ((a1||0)|(b1||0))>>>0, d2 = ((a2||0)|(b2||0))>>>0;
  let ss = C.cnt[b]===0 ? 1 : 0; if (D.build==='rlm12d' && ZERO12.includes(j)) ss = 0;
  return { j, vu:C.vu[b], pk:C.pk[b], ms:C.ms[b], cnt:C.cnt[b], vuP, pkP, vr, pr, vi, pi, d1, d2, ss, neg: vi<0||pi<0, thrMs:C.thrMs, det:C.det,
    lit: k => k<26 ? (d1>>>k)&1 : (d2>>>(k-26))&1, vuTop: (()=>{ let top=-1; for(let k=0;k<42;k++) if (k<26 ? ((a1||0)>>>k)&1 : ((a2||0)>>>(k-26))&1) top=k; return top; })() };
}
const meterJ = (m, s) => MAP[m] + s;                                       // panel meter m (0-based), side s → SHARC index
const pairAlarm = (m, t) => powered() && (chanAt(meterJ(m,0),t).ss | chanAt(meterJ(m,1),t).ss) === 1;
const flashOn = t => Math.floor(t/(500*TICK()))%2===1;                      // GP_TIMER0 500 ticks: test2 0x00 ↔ 0xff
const ackEff = (m, t) => D.ack[m] && pairAlarm(m, t);                      // pb_ack = (pressed | pb_ack) & pbdata
const pbLed = (m, t) => pairAlarm(m, t) && (flashOn(t) || ackEff(m, t));   // refresh(): pbdata & (test2 | pb_ack), mux phase 0 only
const anyUnacked = t => { for (let m=0;m<24;m++) if (pairAlarm(m,t) && !ackEff(m,t)) return true; return false; };
const alarmOut = t => D.wi.fixPrec ? anyUnacked(t) : false;                // SS_tallies precedence bug: SRU(HIGH, DAI_PB20_I) never runs
/* display multiplex: GP_TIMER1 reloaded with 1 → one phase per tick; mux_count 6,5,4,3,2,1,0,7,6… */
const muxAt = t => { const n=Math.floor(t/TICK())+1; return ((7-n)%8+8)%8; };
/* ATmega → FPGA → SHARC words (v101.c ALTERA_SORT layout) */
function dipByte(){ let b=0; for(let i=0;i<8;i++) if(!D.dip[i]) b|=1<<i; return b; }          // raw PIND: ON = 0
function lockBytes(){ const lk=[0,0,0]; for(let i=0;i<24;i++) if(!D.in[i].plug) lk[i>>3] |= 1<<(i&7); return lk; }   // CS8416_READ_LOCK_ALL: 1 = not locked (byte order inferred)
function word(w){
  if (w<48) return ((1<<24) | (w<<16) | (((D.thr[w]+3)&0xff)<<8) | (D.dly[w]&0xff))>>>0;
  if (w===48){ let psu=(D.ps[1]?2:0)|(D.ps[0]?1:0); if (D.dip[6]) psu=3;   // ALTERA_TRANSLATE_UART0: SW7 = PSU alarm disable → 0x03 (switch sense inferred)
    return ((4<<24) | (dipByte()<<8) | psu)>>>0; }
  const lk=lockBytes(); return ((5<<24) | (lk[2]<<16) | (lk[1]<<8) | lk[0])>>>0;
}
const rxWord = w => D.wi.fix31 ? w : (w & ~1)>>>0;
function wordAt(t){ const ph=t%AVR_CYCLE, i=Math.floor(ph/AVR_WORD); return i<AVR_WORDS ? i : AVR_WORDS-1; }
function decode(v){ const cmd=v>>>24;
  if (cmd===1){ const ch=(v>>>16)&0xff; return `SPICMD_SET_SS_CHAN: chan ${ch} → parm_map → SSensor ${MAP[ch>>1]+(ch&1)}; THRESHOLD ${(v>>>8)&0xff} (10^(−${(v>>>8)&0xff}/10)); DET_TIME ${v&0xff} s`; }
  if (cmd===4) return `SPICMD_STATUS_PSU: cal = ((val>>12)&3)·4 = ${((v>>>12)&3)*4}; psu bits ${v&3}`;
  if (cmd===5) return `SPICMD_STATUS_LOCK: lock_stat = 0x${(v&0xffffff).toString(16).padStart(6,'0')} (stored, never used)`;
  return 'SPICMD_NOP'; }
const hex = (v,n) => '0x'+(v>>>0).toString(16).padStart(n||8,'0');
function status1(){ return `${powered()?'running':'off'} · ${BUILDS[D.build].l.split(' — ')[0]} · ref ${REFS[calIdx()]} dBFS · frame ${frameNo()}`; }
/* silence bookkeeping in virtual seconds, so that "Skip +10 s" can mature a 10 s detect time */
function noteSilence(m, s, before, after, t){
  const was=isSilent(before,s), now=isSilent(after,s);
  if (!was && now){ const ms = before.kind==='tone' ? before.lvl-3 : before.lvl-9;   // mean-square level before the cut (approx.)
    const thr = D.thr[2*m+s]+3, fall = Math.max(0, tau(1-TC.SS)*Math.log(10)*(ms + thr)/10);
    D.sil[m][s] = {since: D.vclock + t, fall}; }
  if (was && !now) D.sil[m][s] = null;
}
function setInput(m, patch, t){
  const before = {...stateAt(m, t)}, after = {...D.in[m], ...patch};
  D.chg[m] = {t, prev: before}; D.in[m] = after;
  noteSilence(m, 0, before, after, t); noteSilence(m, 1, before, after, t); bump();
}
/* every pass through the second is one more second of virtual time */
let lastT = 0;
function onTime(){ if (SIM.t < lastT - 0.5){ D.vclock += 1; D.chg.fill(null); bump(); }
  lastT = SIM.t; for (let m=0;m<24;m++) if (D.ack[m] && !pairAlarm(m, SIM.t)) D.ack[m]=false; }

/* =====================================================================
   4. Actions — each logs the real code path
   ===================================================================== */
const A = {
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; bump();
    if (D.power){ tr('ATmega128 v101.c main(): RESET_SHARC() → SHARC_RESET (PORTE.7) low, then SHARC_ACTIVE; the ADSP-21262 boots from the AT25F512A (U2) over SPI (BOOTCFG0 from the FPGA)');
      tr('backgnd.c main(): asm("bit set mode1 CBUFEN|NESTM") — nested interrupts on');
      tr(`PMCTL: bit set CLKOUTEN|PLLM16|PLLBP; bit clr PLLM8|PLLM4|PLLM2; lcntr=0xffffff do pllwait — ${(0xffffff/MCLK).toFixed(2)} s at the bypass clock (${inf}); bit clr PLLBP → CCLK ${(cclk()/1e6).toFixed(3)} MHz`);
      tr('ClrIOPBits(SPICTL,SPIEN); FLG0 set; FLG12 clr (SPORT frame sync gated off) → InitDAI() → TimerInit() → SampleInit() (VUMeterInit, SSensorInit, SPORT0–5 TDM, DMA chains, interrupts(SIG_SP1,SampleIRQ))');
      tr('asm("bit set FLAGS FLG12") — fsynch enabled through the FPGA: SampleIRQ starts at 48 kHz, while(1) background loop starts'); }
    else tr('Supplies off: TDM stops, the LED drivers (A6276) lose VLED — every bar goes dark'); }); },
  ps(k){ act(`PS${k+1} ${D.ps[k]?'removed':'fitted'}`, tr=>{ D.ps[k]=!D.ps[k]; bump();
    tr(`ATmega READ_ADC(): power_supply${k+1}_status = ${D.ps[k]?'YES':'NO'} → PSU_altera_out = ${(D.ps[1]?2:0)|(D.ps[0]?1:0)}${D.dip[6]?' — but SW7 (PSU alarm disable) forces 0x03':''}`);
    tr(`Word 48 → SHARC SPIProcRX case SPICMD_STATUS_PSU: psu1_stat is set only if (val & 0x1) — bit 0 never arrives (get_parms reads 31 bits), so PSU1 is never seen; psu2_stat is written but not used`);
    tr(powered()?'Manual: “The system will operate properly with only one supply” — the meters keep running':'Both supplies out: unit dark'); }); },
  dip(k){ act(`SETUP SW${k+1} → ${D.dip[k]?'OFF':'ON'}`, tr=>{ D.dip[k]=!D.dip[k]; bump();
    tr(`ATmega: dip_switch = INVERT_DATA(READ_SWITCHES(PIND)) = raw PIND = ${hex(dipByte(),2)} → word 48 byte 2 (bits 8–15)`);
    if (k>=4 && k<=5){ tr(`SHARC SPIProcRX(SPICMD_STATUS_PSU): cal = ((val>>12)&3)*4 = ${CAL()} → reference ${REFS[calIdx()]} dBFS`);
      tr(`refresh(): rlm24_vu_data*[vu_results − 6 ${D.build==='last'&&!D.wi.fixCal?'− cal':'+ cal'}] | rlm24_pk_data*[pk_results + cal]`); }
    else if (k<4) tr(`Frame address ${frameNo()} — used by the ATmega for the RS-422 control network (the SHARC ignores it)`);
    else tr(k===6?'SW7: PSU alarm enable/disable (ATmega)':'SW8: silence alarm enable/disable, audible only (ATmega); the SHARC pushbutton LEDs are not affected'); }); },
  plug(m){ const t=SIM.t; act(`Input ${m+1} ${D.in[m].plug?'unplugged':'plugged in'}`, tr=>{ setInput(m, {plug:!D.in[m].plug}, t);
    const k=IMAP.indexOf(MAP[m]);
    tr(`CS8416 for input ${m+1} ${D.in[m].plug?'locks':'loses lock'} → its AD1895 feeds TDM words ${k},${k+1} (${SPORT_OF(k)}, slots ${k%16},${k%16+1}) ${D.in[m].plug?'with audio':'with zeros'}`);
    tr(`ATmega CS8416_READ_LOCK_ALL() → word 49 (SPICMD_STATUS_LOCK) → SHARC lock_stat — stored and never read: no immediate indication`);
    if (!D.in[m].plug){ const j=MAP[m]; tr(`SampleIRQ: audio_in_float[${j}], [${j+1}] = 0 → SSensorCalc: MS falls below 10^(−${rxThr(j)}/10) in about ${D.sil[m][0]?D.sil[m][0].fall.toFixed(2):'0.3'} s, then DET_COUNT counts down ${rxDly(j)} s (${(rxDly(j)*FS).toLocaleString()} samples)`);
      tr(rxDly(j)===0?'DET_TIME is 0 → the SSensorCalc patch reloads 255 every sample: this channel can never alarm':'Use “Skip +10 s” to let the detect time run out'); }
    else tr('MS rises above the threshold → DET_COUNT reloaded with DET_TIME → bit 0 of SSensorGet clears'); }); },
  setIn(m, patch, label){ const t=SIM.t; act(label, tr=>{ setInput(m, patch, t); const j=MAP[m];
    tr(`TDM word ${IMAP.indexOf(j)} → SampleIRQ float by −31 → audio_in_float[${j}] (input_map) → VUMeterCalc / SSensorCalc`);
    const c=chanAt(j, Math.min(0.999,t+0.4)); tr(`400 ms later: VUMeterGet → ${c.vuP} (=${(-c.vuP/2).toFixed(1)} dB re FS power), PPM → ${c.pkP}; bar index ${c.vi}, peak index ${c.pi}`); }); },
  press(m){ const t=SIM.t; act(`Pushbutton ${m+1} pressed`, tr=>{ const al=pairAlarm(m,t);
    tr(`74HC165 on the RLM24-1 board → refresh(): pb_data_in = shifter(12,0,0) reads FLG13/FLG14 after the display latch (imask = 0x3 around it)`);
    if (al){ D.ack[m]=true; tr(`SS_tallies(): pb_ack[g] = ((pb_data_in bits) | pb_ack[g]) & pbdata[g] → acknowledged: LED stops flashing and stays lit while the alarm lasts`);
      tr(`alarm = ⋃(pbdata ^ pb_ack) → ${anyUnacked(t)?'still other unacknowledged pairs':'no unacknowledged pairs left'}`); }
    else tr('pbdata bit is 0 (no silence on this pair) → “& pbdata[g]” clears the press at once: nothing happens'); }); },
  skip(){ act('Skip ahead 10 s', tr=>{ D.vclock+=10; D.chg.fill(null); bump(); tr('Virtual clock +10 s: every silence counter has run 480 000 more samples (a 1 s simulation cannot show a 10 s DET_TIME otherwise)'); }); },
  cmd(s){ act(`Control panel → ${s}`, tr=>{ D.cmds.unshift({t:SIM.t, s}); if (D.cmds.length>12) D.cmds.length=12;
    const m = s.trim().match(/^#F(\d{1,2})A(\d{2})(?:T-?(\d{2})D(\d{1,3}|OFF)|Q)\$$/i);
    if (!m){ tr('UART0_translate(): not a #F<frame>A<nn>T<tt>D<ddd>$ or #F<frame>A<nn>Q$ frame → ignored (554164 ASCII PROTOCOL)'); return; }
    const f=+m[1], ad=+m[2];
    if (f!==frameNo()){ tr(`frame_hold ${f} ≠ frame_number ${frameNo()} (SETUP SW1–SW4) → not for this frame`); return; }
    if (ad<1 || ad>48){ tr(`address_hold ${ad} > CHANNELS → invalid_data`); return; }
    if (m[3]==null){ tr(`Data request: channel ${ad}: threshold −${D.thr[ad-1]} dB, delay ${D.dly[ad-1]} s`); return; }
    const th=+m[3], dl = /off/i.test(m[4]) ? 0 : +m[4];
    if (th<20 || th>75){ tr('threshold outside 20…75 → invalid_data'); return; }
    if (dl>240){ tr('delay > 240 s → invalid_data'); return; }
    D.thr[ad-1]=th; D.dly[ad-1]=dl; bump(); const j=MAP[(ad-1)>>1]+((ad-1)&1);
    tr(`ATmega: threshold[${ad}] = ${th}, delay[${ad}] = ${dl} → SAVE_PARAMETERS_IN_EEPROM(); ALTERA_SORT(): word ${ad-1} = {01, ${ad-1}, ${th}+3, ${dl}} = ${hex(word(ad-1))}`);
    tr(`ALTERA_read_write(): 4 bytes MSB first into shift_in_out32, strobed into “data”; SHARC get_parms() latches it (DAI_PB12) and clocks 31 bits (DAI_PB13) from FLG15 → ${hex(rxWord(word(ad-1)))}`);
    tr(`SPIProcRX → parm_map[${ad-1}] = SSensor ${j}: SSensorEdit(THRESHOLD ${th+3} → 10^(−${(th+3)/10}) = ${Math.pow(10,-(th+3)/10).toExponential(2)}), SSensorEdit(DET_TIME ${rxDly(j)} → ${(rxDly(j)*FS).toLocaleString()} samples)`);
    if (rxDly(j)!==dl) tr(`<b>Bit 0 lost:</b> the panel set ${dl} s, the SHARC times ${rxDly(j)} s${rxDly(j)===0?' — and 0 disables the channel':''}`); }); },
  build(b){ act(`Firmware build → ${b}`, tr=>{ D.build=b; bump(); tr(BUILDS[b].l);
    if (b==='nab2005') tr('sample.c: input_map not used — audio_in_float[k] = TDM_in[i], i = 6,7,6,7… → every meter shows TDM words 6/7 (input 13)');
    if (b==='last') tr('backgnd.c refresh(): VU index “− 6 − cal”, peak index “+ cal” — bar and peak move in opposite directions off −20 dBFS');
    if (b==='rlm12d') tr('sample.c: twelve words mapped, the rest all written to 26/27; backgnd.c forces ss_results[n] = 0 for the 24 unused channels every pass'); }); },
  whatif(k, v, label){ act(label, tr=>{ D.wi[k]=v; bump();
    const msg = {peak:'VUMeterEdit(VUMETER_PARM_PEAKMODE) — never called in any RLM build; PEAK mode = attack 1.0, decay 0.0, cleared on each read',
      vu:'TCONST_VU — the two commented-out values in vumeter.asm', pd:'TCONST_PPM_DECAY — the commented-out value (40 dB in 1 s)',
      fixPrec:'SS_tallies: ((*(ulong*)DAI_PIN_STAT & 0x80000) == 0) — the parentheses the code is missing', fix31:'get_parms: 32 clocks instead of 31, so bit 0 arrives',
      fixCal:'refresh(): use + cal for the VU index as v100 does'}[k];
    tr('What-if: '+msg); }); },
  cclk(i){ act(`Assume CCLK ${(CCLKS[i].v/1e6).toFixed(3)} MHz`, tr=>{ D.cclk=i; bump(); tr(CCLKS[i].l); tr(`Core timer: TIMER_RATE 50000 → tick ${SIM.fmtDur(TICK())}; ISR load ${(LOAD()*100).toFixed(0)} %${LOAD()>=1?' — SampleIRQ would not fit in 20.8 µs':''}`); }); },
  reset(){ const keep=D.log, f=fresh(); Object.keys(f).forEach(k=>{ D[k]=f[k]; }); D.log=keep; for (const k in cache) delete cache[k]; lastT=SIM.t; act('Factory state', tr=>tr('All SETUP switches ON (frame 1, −20 dBFS), thresholds 40 dB (INITIAL_THRESHOLD), delays 10 s (INITIAL_DELAY)')); },
};

/* =====================================================================
   5. Panels
   RLM24 front, drawn to scale (1 unit = 0.01"): 19" × 3.470" (RLM24-1M5 side plate with .875" ears),
   bronze Plexiglas lens 17.240" × 3.304" (RLM24-1M3), LED geometry from rlm24-1iss2.pnp (0805 LEDs,
   1.524 mm pitch, bars of a pair 5.06 mm apart, pairs on the .700" pushbutton pitch).
   ===================================================================== */
const FW=1900, FH=347, LX=87.5, LY=8.3;
const ledX = (m,s) => LX + BTN[m]*100 + (s ? 9.96 : -9.96);
const ledY = k => LY + 268 - k*6;                   // bottom LED 2.68" below the lens top (vertical placement inferred)
const btnXY = m => [LX + BTN[m]*100, LY + 296.9];
function frontSVG(id){
  let s = `<svg viewBox="0 0 ${FW} ${FH}" role="img" aria-label="RLM24 front: 24 stereo bar graphs and 24 lit pushbuttons" style="width:100%;display:block;border-radius:6px">
    <rect width="${FW}" height="${FH}" rx="6" fill="#141516"/>`;
  [[0,87.5],[1812.5,87.5]].forEach(([x,w])=>{ s+=`<rect x="${x}" y="0" width="${w}" height="${FH}" fill="#1c1d1f"/>`; [23.5,323.5].forEach(yy=>{ const cx = x<10 ? 34.4 : FW-34.4; s+=`<rect x="${cx-20.3}" y="${yy-12.5}" width="40.6" height="25" rx="12.5" fill="#050505"/>`; }); });
  s += `<rect x="${LX}" y="${LY}" width="1724" height="330.4" rx="3" fill="#2a1b0f" stroke="#3b2a1a" stroke-width="2"/>`;
  s += `<rect x="${LX}" y="${LY}" width="1724" height="330.4" fill="url(#${id}sh)" opacity=".35"/>`;
  s += `<defs><linearGradient id="${id}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
  for (let m=0;m<24;m++){
    s += `<rect class="rlmPick" data-m="${m}" x="${ledX(m,0)-14}" y="${ledY(41)-8}" width="48" height="262" fill="transparent" style="cursor:pointer"><title>Meter ${m+1} (inputs ${m+1} L/R): click to select</title></rect>`;
    for (let sd=0;sd<2;sd++) for (let k=0;k<42;k++) s += `<rect id="${id}L${m}_${sd}_${k}" x="${(ledX(m,sd)-4).toFixed(2)}" y="${(ledY(k)-2.3).toFixed(2)}" width="8" height="4.6" rx="1" fill="${OFF_COL[ZONE(k)]}" pointer-events="none"/>`;
    const [bx,by] = btnXY(m);
    s += `<g class="rlmPb" data-m="${m}" style="cursor:pointer"><title>Pushbutton ${m+1} (meter ${m+1}): lit = silence alarm on this pair; click to acknowledge</title><circle cx="${bx}" cy="${by}" r="24" fill="#0b0b0b" stroke="#3b2a1a"/><circle id="${id}B${m}" cx="${bx}" cy="${by}" r="17" fill="#2b2d30"/><circle cx="${bx-5}" cy="${by-6}" r="5" fill="#fff" opacity=".12"/></g>`;
  }
  [[3.02,.335],[5.82,.335],[11.42,.335],[14.22,.335],[.92,2.969],[3.72,2.969],[7.22,2.969],[10.02,2.969],[13.52,2.969],[16.32,2.969]].forEach(([x,y])=>{ s+=`<circle cx="${LX+x*100}" cy="${LY+y*100}" r="6.5" fill="#0d0d0e" stroke="#444" stroke-width="1"/><circle cx="${LX+x*100}" cy="${LY+y*100}" r="2" fill="#222"/>`; });
  s += `<rect id="${id}sel" x="0" y="${ledY(41)-9}" width="46" height="${ledY(0)-ledY(41)+18}" rx="4" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="6 4"/>`;
  return s + '</svg>';
}
function bindFront(root, id){
  const els = {L:[], B:[]}; for (let m=0;m<24;m++){ els.L[m]=[[],[]]; for(let sd=0;sd<2;sd++) for(let k=0;k<42;k++) els.L[m][sd][k]=root.querySelector(`#${id}L${m}_${sd}_${k}`); els.B[m]=root.querySelector(`#${id}B${m}`); }
  els.sel = root.querySelector(`#${id}sel`); root._fp = {els, st:{}};
  root.querySelectorAll('.rlmPb').forEach(g=>g.onclick=()=>A.press(+g.dataset.m));
  root.querySelectorAll('.rlmPick').forEach(g=>g.onclick=()=>{ D.sel=+g.dataset.m; SIM.refresh(); });
}
function updateFront(root, t){
  const F=root._fp; if(!F) return; const st=F.st, on=powered();
  for (let m=0;m<24;m++){
    for (let sd=0;sd<2;sd++){ const c = on ? chanAt(meterJ(m,sd), t) : null;
      for (let k=0;k<42;k++){ const v = c ? c.lit(k) : 0, key=m*100+sd*50+k; if (st[key]!==v){ st[key]=v; F.els.L[m][sd][k].setAttribute('fill', v?ON_COL[ZONE(k)]:OFF_COL[ZONE(k)]); } } }
    const b = on && pbLed(m,t) ? 1 : 0, kb='b'+m; if (st[kb]!==b){ st[kb]=b; F.els.B[m].setAttribute('fill', b?'#ff3b30':'#2b2d30'); }
  }
  F.els.sel.setAttribute('x', ledX(D.sel,0)-13);
}
/* close-up of the selected pair with the scale from rlm24_vu_data.c */
function closeSVG(m){
  const P=11, y0 = k => 470 - k*P;
  let s=`<svg viewBox="0 0 330 520" style="width:100%;max-width:330px;display:block;margin:auto"><rect width="330" height="520" rx="8" fill="#2a1b0f"/>`;
  for (let k=0;k<42;k++){ const lab=SCALE[k]; s+=`<text x="128" y="${y0(k)+3.5}" text-anchor="end" font-size="9" fill="${lab===0?'#ffd23a':'#c9b9a5'}" font-family="var(--mono)">${lab>0?'+':''}${lab}</text>`;
    for (let sd=0;sd<2;sd++) s+=`<rect id="rlmC${sd}_${k}" x="${150+sd*44}" y="${y0(k)-3.5}" width="26" height="7" rx="1.5" fill="${OFF_COL[ZONE(k)]}"/>`; }
  s+=`<text x="163" y="20" text-anchor="middle" font-size="12" fill="#e8dccd">L</text><text x="207" y="20" text-anchor="middle" font-size="12" fill="#e8dccd">R</text>
    <text x="250" y="${y0(25)+4}" font-size="10" fill="#ffd23a">← reference</text><text x="250" y="${y0(25)+16}" font-size="9" fill="#c9b9a5">(SW5/SW6)</text>
    <g class="rlmPb" data-m="${m}" style="cursor:pointer"><title>Pushbutton ${m+1}</title><circle cx="185" cy="500" r="14" fill="#0b0b0b"/><circle id="rlmCB" cx="185" cy="500" r="10" fill="#2b2d30"/></g>
    <text x="10" y="20" font-size="12" font-weight="700" fill="#e8dccd">Meter ${m+1}</text></svg>`;
  return s;
}
function updateClose(root, t){
  const m=D.sel, on=powered();
  for (let sd=0;sd<2;sd++){ const c = on?chanAt(meterJ(m,sd),t):null; for (let k=0;k<42;k++){ const e=root.querySelector(`#rlmC${sd}_${k}`); if(e) e.setAttribute('fill', c&&c.lit(k)?ON_COL[ZONE(k)]:OFF_COL[ZONE(k)]); } }
  const b=root.querySelector('#rlmCB'); if (b) b.setAttribute('fill', on&&pbLed(m,t)?'#ff3b30':'#2b2d30');
}
const dbs = v => v<=0 ? '−∞' : (10*Math.log10(v)).toFixed(1);
function readoutHTML(t){
  const m=D.sel; if (!powered()) return '<p class="muted">Unit off.</p>';
  const c=[0,1].map(sd=>chanAt(meterJ(m,sd),t)), src=srcOf(meterJ(m,0));
  const row=(n,f,mono)=>`<tr><th>${n}</th>${c.map(x=>`<td class="${mono?'mono':''}">${f(x)}</td>`).join('')}</tr>`;
  return `<table class="kv"><tr><th></th><th>L (SHARC ch ${meterJ(m,0)})</th><th>R (ch ${meterJ(m,1)})</th></tr>
    ${row('fed by', x=>{ const s=srcOf(x.j); return s?`TDM word ${s.k} = input ${s.m} ${s.s?'R':'L'}`:'<span class="muted">nothing (never written)</span>'; })}
    ${row('VU (mean square)', x=>dbs(x.vu)+' dB FS²',1)}${row('VUMeterGet → vu_results', x=>`${x.vuP} → ${x.vr}`,1)}
    ${row('PPM', x=>dbs(x.pk)+' dB FS²',1)}${row('VUMeterGet → pk_results', x=>`${x.pkP} → ${x.pr}`,1)}
    ${row('table index VU / peak', x=>`${x.vi} / ${x.pi}${x.neg?' ⚠ before the table':''}`,1)}
    ${row('data1 | data2 (26 + 16 bits)', x=>hex(x.d1,7)+' '+hex(x.d2,4),1)}
    ${row('bar top', x=>x.vuTop<0?'—':(SCALE[x.vuTop]>0?'+':'')+SCALE[x.vuTop],1)}
    ${row('MS vs threshold', x=>`${dbs(x.ms)} / ${dbs(x.thrMs)} dB`,1)}
    ${row('DET_COUNT', x=>x.det===0?`${x.cnt} (DET_TIME 0: disabled)`:`${x.cnt.toLocaleString()} of ${x.det.toLocaleString()}`,1)}
    ${row('SSensorGet bit 0', x=>x.ss?'<b style="color:var(--bad)">1 silence</b>':'0',1)}</table>
    <p class="small muted">Pair alarm ${pairAlarm(m,t)?'<b style="color:var(--bad)">ON</b>':'off'} · acknowledged ${ackEff(m,t)?'yes':'no'} · flash phase ${flashOn(t)?'on':'off'} · DAI_PB20 alarm out ${alarmOut(t)?'HIGH':'low'}${!D.wi.fixPrec&&anyUnacked(t)?' (it should be HIGH: precedence bug)':''}</p>`;
}
/* RLM24 rear on the RLM24REARCURVE.cdr artwork (1800 × 350 = 18" × 3.5" at 100 dpi) */
const IN_X = [928,983,1037,1091,1167,1222,1276,1330,1407,1462,1516,1570];
function rearSVG(){
  let o='';
  [[41,55,126,153],[41,206,126,304]].forEach(([x0,y0,x1,y1],k)=>{ o+=`<g class="rlmPs" data-k="${k}" style="cursor:pointer"><title>PS${k+1}: ${D.ps[k]?'fitted — click to remove':'removed — click to fit'}</title>${D.ps[k]?iec(x0,y0,x1,y1):`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="#050505" stroke="#ff3b30" stroke-width="3"/>`}</g>`; });
  o+=`<rect x="737" y="96" width="24" height="68" fill="#3d7bc9" stroke="#1d4d8a"/>`;
  D.dip.forEach((on,k)=>{ o+=`<g class="rlmDip" data-k="${k}" style="cursor:pointer"><title>SETUP SW${k+1} ${on?'ON':'OFF'} — ${['A0','A1','A2','A3','CAL0','CAL1','PSU alarm','silence alarm'][k]} — click</title><rect x="740" y="${98.5+k*8}" width="18" height="6.5" fill="#e8ecef"/><rect x="${on?741:750}" y="${99.5+k*8}" width="7" height="4.5" fill="#222"/></g>`; });
  [[880,'RS-422 loop IN'],[1040,'RS-422 loop OUT'],[1185,'GPIO (GPO pin 3, GPI-2 pin 2)']].forEach(([x,l])=>{ o+=`<g><title>${l} (DB9; position from the silk brackets, ${'inferred'})</title><rect x="${x-34}" y="58" width="68" height="34" rx="8" fill="#9a9da1" stroke="#555"/><rect x="${x-24}" y="66" width="48" height="18" rx="5" fill="#111"/></g>`; });
  o+=`<g><title>OUTPUTS 1–4: printed on the silk; the RLM24-2 netlist has no AES transmitter (inferred unused)</title><rect x="1390" y="40" width="192" height="26" rx="3" fill="#20402a" stroke="#0e5d2b" stroke-dasharray="5 3"/></g>`;
  for (let i=0;i<24;i++){ const x=IN_X[i%12], y=i<12?157:280, on=D.in[i].plug;
    o+=`<g class="rlmIn" data-m="${i}" style="cursor:pointer"><title>AES INPUT ${i+1} (+ − G, 110 Ω): ${on?'connected — click to unplug':'unplugged — click to plug in'}</title><rect x="${x-23}" y="${y-26}" width="46" height="52" rx="3" fill="#26a356" stroke="#0e5d2b"/>${[-14,0,14].map(d=>`<rect x="${x+d-5}" y="${y-14}" width="10" height="20" fill="#0e4d25"/>`).join('')}${on?`<rect x="${x-21}" y="${y-24}" width="42" height="16" fill="#2b5f9e"/><rect x="${x-3}" y="${y-40}" width="6" height="16" fill="#555"/>`:''}${i===D.sel?`<rect x="${x-26}" y="${y-29}" width="52" height="58" fill="none" stroke="var(--accent)" stroke-width="3"/>`:''}</g>`; }
  return layered({w:1800,h:350,bg:'#151617',layers:['rlm-rlm24-rear.svg'],over:o,label:'RLM24 rear panel (RLM24REARCURVE.cdr)'});
}
function rear12SVG(){ return layered({w:1716,h:345,bg:'#151617',layers:['rlm-rlm12-rear.svg'],label:'RLM-12 LOUDNESS METER rear silk (RLM12REARcurve.cdr)'}); }
/* RLM2: front drawn from RLM2-M1 (19" × 1.720", four 3.2" × 1.0" windows) and RLM2D Front.jpg; rear on the RLM2-REAR-SILK(CURVE).pdf artwork */
function rlm2FrontSVG(t){
  let s=`<svg viewBox="0 0 1900 172" style="width:100%;display:block;border-radius:6px"><rect width="1900" height="172" fill="#141516"/>`;
  [[34.4,23.5],[34.4,148.5],[1865.6,23.5],[1865.6,148.5]].forEach(([x,y])=>s+=`<rect x="${x-20.3}" y="${y-12.5}" width="40.6" height="25" rx="12.5" fill="#050505"/>`);
  s+=`<text x="160" y="29" font-size="15" font-weight="700" fill="#34c26a">RLM SERIES</text><text x="1745" y="29" text-anchor="end" font-size="15" font-weight="700" fill="#34c26a">WARD-BECK SYSTEMS</text><rect x="160" y="150" width="1585" height="6" fill="#2fa65a"/>`;
  [375,725,1175,1525].forEach((cx,w)=>{ const m=w>>1, sd=w&1, c = powered()? chanAt(meterJ(m,sd),t) : null;
    s+=`<rect x="${cx-160}" y="36" width="320" height="100" rx="12.5" fill="#0b0b0c" stroke="#333"/><text x="${cx-118}" y="54" font-size="9" fill="#ddd">VU RANGE</text><text x="${cx+60}" y="54" font-size="9" fill="#ddd">PEAK RANGE</text>`;
    for (let k=0;k<42;k++){ const a=(-42+84*k/41)*Math.PI/180, x=cx+95*Math.sin(a), y=152-95*Math.cos(a), on=c&&c.lit(k); s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.3" fill="${on?ON_COL[ZONE(k)]:OFF_COL[ZONE(k)]}"/>`; }
    if (!sd){ const lk=powered()&&D.in[m].plug; s+=`<circle cx="${cx-30}" cy="124" r="3.5" fill="${lk?'#5dff6a':'#16301b'}"/><text x="${cx-22}" y="127" font-size="9" fill="#ddd">LOCK</text>`; }
    s+=`<text x="${cx}" y="131" text-anchor="middle" font-size="8" fill="#777">${sd?'R':'L'}${m+1}</text>`; });
  return s+'</svg>';
}
function rlm2RearSVG(){
  let o=`<g class="rlmPw" style="cursor:pointer"><title>IEC inlet — click to switch the unit ${D.power?'off':'on'}</title>${iec(97,54,346,270)}</g>`;
  [[1500,1],[2900,0]].forEach(([x,m])=>{ const on=D.in[m].plug; o+=`<g class="rlmIn" data-m="${m}" style="cursor:pointer"><title>INPUT ${m+1} per the 2016 silk (BNC, 75 Ω AES) — ${on?'click to unplug':'click to plug in'}</title>${bnc(x,237,on,'','',52)}</g>`; });
  [1085,2485].forEach(x=>{ o+=`<rect x="${x+8}" y="76" width="86" height="42" fill="#0e4d25" stroke="#26a356"/>`; for(let p=0;p<4;p++) o+=`<circle cx="${x+22+p*20}" cy="90" r="4" fill="#d4af37"/><circle cx="${x+22+p*20}" cy="106" r="4" fill="#d4af37"/>`; });
  return layered({w:3340,h:324,bg:'#151617',layers:['rlm-rlm2-rear.svg'],over:o,label:'RLM2 rear (RLM2-REAR-SILK)'});
}
function bindRear(r){
  r.querySelectorAll('.rlmPs').forEach(g=>g.onclick=()=>A.ps(+g.dataset.k));
  r.querySelectorAll('.rlmDip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.k));
  r.querySelectorAll('.rlmIn').forEach(g=>g.onclick=()=>{ D.sel=+g.dataset.m; A.plug(+g.dataset.m); });
  r.querySelectorAll('.rlmPw').forEach(g=>g.onclick=()=>A.power());
}
/* controls for the selected input, the control-panel link and the what-ifs */
function controlsHTML(){ const s=D.in[D.sel];
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
    <label>Meter / input <select id="rlmSel">${D.in.map((_,i)=>`<option value="${i}" ${i===D.sel?'selected':''}>${i+1}</option>`).join('')}</select></label>
    <label>content <select id="rlmKind">${['program','tone','silence','L only'].map(k=>`<option ${k===s.kind?'selected':''}>${k}</option>`).join('')}</select></label>
    <label>peak level <input id="rlmLvl" type="number" step="1" min="-80" max="0" value="${s.lvl}" style="width:58px"> dBFS</label>
    <label>tone <input id="rlmF" type="number" step="10" min="20" max="20000" value="${s.f}" style="width:70px"> Hz</label>
    <button id="rlmPlug">${s.plug?'Unplug':'Plug in'} input ${D.sel+1}</button><button id="rlmSkip">Skip +10 s</button><button id="rlmPow">${D.power?'Power off':'Power on'}</button></div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px">Control panel (RLMCTL, RS-485) <input id="rlmCmd" class="mono" value="#F${frameNo()}A${String(2*D.sel+1).padStart(2,'0')}T40D015$" style="width:150px"><button id="rlmSend">Send</button>
    <span class="muted">#F&lt;frame&gt;A&lt;channel 01–48&gt;T&lt;20–75&gt;D&lt;0–240&gt;$ — channel 2n−1 = meter n L</span></div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:6px">
    <label>DSP build <select id="rlmBuild">${Object.keys(BUILDS).map(b=>`<option value="${b}" ${b===D.build?'selected':''}>${b}</option>`).join('')}</select></label>
    <label>assumed CCLK ${inf} <select id="rlmClk">${CCLKS.map((c,i)=>`<option value="${i}" ${i===D.cclk?'selected':''}>${(c.v/1e6).toFixed(3)} MHz</option>`).join('')}</select></label></div>
  <details class="small" style="margin-top:6px"><summary>What-if switches (code that exists but is not used, and fixes for the bugs)</summary>
    <label><input type="checkbox" data-wi="peak" ${D.wi.peak?'checked':''}> PEAK mode (VUMETER_PARM_PEAKMODE = 1)</label><br>
    <label>VU time constant <select data-wis="vu">${VU_ALT.map((v,i)=>`<option value="${i}" ${i===D.wi.vu?'selected':''}>${v} (${t40(v).toFixed(2)} s / 40 dB)</option>`).join('')}</select></label><br>
    <label>PPM decay <select data-wis="pd">${PD_ALT.map((v,i)=>`<option value="${i}" ${i===D.wi.pd?'selected':''}>${v} (${t40(v).toFixed(1)} s / 40 dB)</option>`).join('')}</select></label><br>
    <label><input type="checkbox" data-wi="fixPrec" ${D.wi.fixPrec?'checked':''}> fix SS_tallies operator precedence (alarm output)</label><br>
    <label><input type="checkbox" data-wi="fix31" ${D.wi.fix31?'checked':''}> fix get_parms to clock 32 bits</label><br>
    <label><input type="checkbox" data-wi="fixCal" ${D.wi.fixCal?'checked':''}> fix the “last” build’s VU cal sign</label></details>`; }
function bindControls(r){ const g=s=>r.querySelector(s); if(!g('#rlmSel')) return; const m=()=>D.sel;
  g('#rlmSel').onchange=e=>{ D.sel=+e.target.value; SIM.refresh(); };
  g('#rlmKind').onchange=e=>A.setIn(m(),{kind:e.target.value},`Input ${m()+1} → ${e.target.value}`);
  g('#rlmLvl').onchange=e=>A.setIn(m(),{lvl:Math.max(-80,Math.min(0,+e.target.value))},`Input ${m()+1} level → ${e.target.value} dBFS`);
  g('#rlmF').onchange=e=>A.setIn(m(),{f:Math.max(20,Math.min(20000,+e.target.value))},`Input ${m()+1} tone → ${e.target.value} Hz`);
  g('#rlmPlug').onclick=()=>A.plug(m()); g('#rlmSkip').onclick=()=>A.skip(); g('#rlmPow').onclick=()=>A.power();
  g('#rlmSend').onclick=()=>A.cmd(g('#rlmCmd').value);
  g('#rlmBuild').onchange=e=>A.build(e.target.value); g('#rlmClk').onchange=e=>A.cclk(+e.target.value);
  r.querySelectorAll('[data-wi]').forEach(x=>x.onchange=()=>A.whatif(x.dataset.wi, x.checked?(x.dataset.wi==='peak'?1:true):(x.dataset.wi==='peak'?0:false), `What-if: ${x.dataset.wi} ${x.checked?'on':'off'}`));
  r.querySelectorAll('[data-wis]').forEach(x=>x.onchange=()=>A.whatif(x.dataset.wis, +x.value, `What-if: ${x.dataset.wis} = ${x.value}`));
}

/* =====================================================================
   6. Timeline lanes
   ===================================================================== */
function dbLane(label, h){ return {label, h:h||70, draw(c,X,t0,t1,y,hh){
  const m=D.sel, C=compute(meterJ(m,0)), top=0, bot=-80, Yd=d=>y+5+(top-Math.max(bot,Math.min(top,d)))/(top-bot)*(hh-10);
  c.strokeStyle=SIM.css('--grid'); c.lineWidth=1; [-20,-40,-60].forEach(d=>{ c.beginPath(); c.moveTo(X(t0),Yd(d)); c.lineTo(X(t1),Yd(d)); c.stroke(); });
  const b0=Math.max(0,Math.floor(t0*1000)-1), b1=Math.min(NB-1,Math.ceil(t1*1000));
  const plot=(arr,col)=>{ c.strokeStyle=col; c.lineWidth=1.4; c.beginPath(); let first=true;
    for (let b=b0;b<=b1;b++){ const d=arr[b]>0?10*Math.log10(arr[b]):-200, xa=X(b/1000), xb=X((b+1)/1000), yy=Yd(d); if(first){ c.moveTo(xa,yy); first=false; } else c.lineTo(xa,yy); c.lineTo(xb,yy); } c.stroke(); };
  if (powered()){ plot(C.ms, SIM.css('--accent2')); plot(C.vu, SIM.css('--accent')); plot(C.pk, SIM.css('--warn')); }
  c.setLineDash([5,4]); c.strokeStyle=SIM.css('--bad'); c.beginPath(); c.moveTo(X(t0),Yd(10*Math.log10(C.thrMs))); c.lineTo(X(t1),Yd(10*Math.log10(C.thrMs))); c.stroke(); c.setLineDash([]);
  c.font='10px '+SIM.css('--mono'); [['VU',SIM.css('--accent')],['PPM',SIM.css('--warn')],['MS (silence)',SIM.css('--accent2')],['threshold',SIM.css('--bad')]].forEach(([l,col],i)=>{ c.fillStyle=col; c.fillText(l, X(t0)+6+i*78, y+12); });
  c.fillStyle=SIM.css('--ink2'); c.fillText('0 … −80 dB FS²', X(t1)-96, y+hh-4); }}; }
function cntLane(){ return {label:`DET_COUNT, meter ${D.sel+1} L`, h:30, draw(c,X,t0,t1,y,hh){
  const C=compute(meterJ(D.sel,0)), b0=Math.max(0,Math.floor(t0*1000)-1), b1=Math.min(NB-1,Math.ceil(t1*1000)), det=C.det||255;
  c.strokeStyle=SIM.css('--accent2'); c.lineWidth=1.4; c.beginPath(); for(let b=b0;b<=b1;b++){ const yy=y+hh-4-(C.cnt[b]/det)*(hh-8); b===b0?c.moveTo(X(b/1000),yy):c.lineTo(X(b/1000),yy); c.lineTo(X((b+1)/1000),yy); } c.stroke();
  c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(`${C.cnt[bucket(SIM.t)].toLocaleString()} / ${C.det?C.det.toLocaleString():'0 (disabled)'}`, X(t0)+6, y+12); }}; }
function passLane(){ return {label:'Background while(1) passes', h:24, draw(c,X,t0,t1,y,hh){
  const P=PASS_T(); if(!isFinite(P)){ c.fillStyle=SIM.css('--bad'); c.font='11px sans-serif'; c.fillText('SampleIRQ takes longer than a frame at this CCLK — the loop never runs', X(t0)+6, y+15); return; }
  const n0=Math.floor(t0/P), n1=Math.ceil(t1/P);
  if ((X(t1)-X(t0))/(n1-n0+1) < 6){ SIM.pulses(c,X,t0,t1,y,hh,P,0,P*0.62,SIM.css('--accent'),'passes'); return; }
  for (let n=n0;n<=n1;n++){ const a=n*P; [[0,.62,'--accent','VU/PPM/SS get'],[.62,.8,'--ink2','timers · SS_tallies'],[.8,.97,'--warn','get_parms'],[.97,1,'--accent2','SPIProcRX']].forEach(([u,v,col,l])=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.75; const xa=X(a+u*P), xb=X(a+v*P); c.fillRect(xa,y+4,Math.max(1,xb-xa-1),hh-8); c.globalAlpha=1; if (xb-xa>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(l, xa+3, y+15); } }); } }}; }
function refreshLane(){ return {label:'Core timer tick → refresh() (mux phase)', h:24, draw(c,X,t0,t1,y,hh){
  const T=TICK(), R=REFRESH_T(), n0=Math.floor(t0/T), n1=Math.ceil(t1/T);
  if ((X(t1)-X(t0))/(n1-n0+1) < 4){ SIM.pulses(c,X,t0,t1,y,hh,T,0,R,SIM.css('--accent2'),'refreshes'); return; }
  for (let n=n0;n<=n1;n++){ const a=n*T, xa=X(a), xb=X(a+R); c.fillStyle=SIM.css('--accent2'); c.fillRect(xa,y+4,Math.max(1.5,xb-xa),hh-8);
    if (X(a+T)-xa>26){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText('m'+muxAt(a+R/2), Math.max(xa,xb)+3, y+15); } } }}; }
function wordLane(){ return {label:'ATmega word latched for get_parms '+'(rate inferred)', h:22, draw(c,X,t0,t1,y,hh){
  const k0=Math.floor(t0/AVR_CYCLE), k1=Math.ceil(t1/AVR_CYCLE);
  for (let k=k0;k<=k1;k++){ const base=k*AVR_CYCLE; if (X(base+AVR_WORD*AVR_WORDS)-X(base) < 50){ c.fillStyle=SIM.css('--warn'); c.globalAlpha=.4; c.fillRect(X(base),y+5,X(base+AVR_WORD*AVR_WORDS)-X(base),hh-10); c.globalAlpha=1; continue; }
    for (let w=0;w<AVR_WORDS;w++){ const a=base+w*AVR_WORD, xa=X(a), xb=X(a+AVR_WORD); if (xb<X(t0)-2||xa>X(t1)+2) continue; c.fillStyle=SIM.css(w<48?'--warn':'--bad'); c.globalAlpha=.55; c.fillRect(xa,y+4,Math.max(1,xb-xa-1),hh-8); c.globalAlpha=1;
      if (xb-xa>22){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(w<48?'w'+w:(w===48?'PSU':'LOCK'), xa+2, y+14); } } } }}; }
function selWave(){ const m=D.sel; return waveLane(`Input ${m+1} L into TDM word ${IMAP.indexOf(MAP[m])}`, t=>sig(m,0,t,Math.round(t*FS)), -0.02, 1.0, SIM.css('--accent'), 44, Object.assign(t=>envOf(m,0,t), {dense:(span,pw)=>span*1000/pw > 0.4})); }
function simLanes(){ return [ selWave(), dbLane(`Meter ${D.sel+1} L: VU, PPM, MS (1 ms buckets)`), cntLane(),
  boolLane(`Pair ${D.sel+1} silence (SSensorGet bit 0)`, t=>pairAlarm(D.sel,t), SIM.css('--bad')), boolLane(`Pushbutton ${D.sel+1} LED`, t=>powered()&&pbLed(D.sel,t), SIM.css('--bad')),
  refreshLane() ]; }
function allLanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2');
  return [
    {label:'TDM frame sync (tdm_gen, 48 kHz)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/FS,0,1/MCLK,b,'fsynch_sharc'); }},
    {label:'TDM bit clock 24.576 MHz', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/MCLK,0,0.5/MCLK,SIM.css('--ink2'),'sclk'); }},
    {label:'SampleIRQ (SIG_SP1, DMA chain done)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/FS,32/MCLK,Math.min(ISR_T(),1/FS),a,`SampleIRQ ≈ ${SIM.fmtDur(ISR_T())} (${inf.replace(/<[^>]+>/g,'')})`); }},
    passLane(), refreshLane(),
    {label:'FLG10 latch (DAI_PB06)', h:18, draw(c,X,t0,t1,y,h){ const n=SIM.pulses(c,X,t0,t1,y,h,TICK(),0,7/cclk(),SIM.css('--warn'),'latch pairs'); if (Math.abs(X(t0+TICK())-X(t0))>=2.2) SIM.pulses(c,X,t0,t1,y,h,TICK(),REFRESH_T()*0.92,7/cclk(),SIM.css('--warn'),''); }},
    {label:'FLG11 low: bits being shifted', h:16, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,TICK(),0,REFRESH_T()*0.92,SIM.css('--ink2'),'shift bursts'); }},
    boolLane('test2: pushbutton flash phase', t=>flashOn(t), SIM.css('--warn'), 16),
    wordLane(),
    selWave(), dbLane(`Meter ${D.sel+1} L: VU, PPM and silence MS`), cntLane(),
    boolLane(`Pushbutton ${D.sel+1} LED`, t=>powered()&&pbLed(D.sel,t), SIM.css('--bad')),
    boolLane('DAI_PB20 alarm out', t=>alarmOut(t), SIM.css('--bad'), 16),
  ]; }

/* =====================================================================
   7. Views
   ===================================================================== */
function hook(fn){ SIM.on('time', ()=>{ onTime(); fn(); }); }
function viewSim(m){ window[ACT]=true;
  m.innerHTML = `${card('RLM24 front — bronze lens RLM24-1M3, 48 bars of 42 LEDs (rlm24-1iss2.pnp), 24 lit pushbuttons. Click a bar to select it, a button to acknowledge.',`<div id="rlmFront">${frontSVG('rf')}</div><p class="small muted" id="rlmLeg"></p>`)}
    <div class="grid2"><div>${card('Selected meter: what the SHARC computes',`<div id="rlmRead"></div>`)}${card('Controls',`<div id="rlmCtl"></div>`)}</div>
      <div>${card('Close-up (scale from rlm24_vu_data.c)',`<div id="rlmClose"></div>`)}</div></div>
    ${card('Rear',`<div class="small" style="margin-bottom:6px">${[['rlm24','RLM24 (RLM24REARCURVE.cdr)'],['rlm12','RLM-12 analog silk (RLM12REARcurve.cdr)'],['rlm2','RLM2 1 RU (front from RLM2-M1, rear silk)']].map(([k,l])=>`<button data-rear="${k}" class="${D.rear===k?'on':''}">${l}</button>`).join(' ')}</div><div id="rlmRear"></div><p class="small muted" id="rlmRearNote"></p><div class="small muted">Artwork: ${SIM.src(RLMA+'SILK/RLM24REARCURVE.cdr','RLM24REARCURVE.cdr')} · ${SIM.src(RLMA+'SILK/RLM12REARcurve.cdr','RLM12REARcurve.cdr')} · ${SIM.src(RLM2S+'RLM2-REAR-SILK(CURVE).cdr','RLM2-REAR-SILK(CURVE).cdr')} — CorelDRAW vectors (white ink); faint lines = cut-outs.</div>`)}
    <div class="grid2">${card('Code path of the last action',`<div id="rlmTrace" class="log"></div>`)}${card('Action log',`<div id="rlmLog" class="log"></div>`)}</div>
    ${card('Timeline — the selected meter through one second (zoom to 2 ms to see the mux phases)',`<canvas id="rlmTl"></canvas>`)}`;
  const fr=m.querySelector('#rlmFront'); bindFront(fr,'rf');
  m.querySelectorAll('[data-rear]').forEach(b=>b.onclick=()=>{ D.rear=b.dataset.rear; m.querySelectorAll('[data-rear]').forEach(x=>x.classList.toggle('on',x===b)); lastRear=''; SIM.refresh(); });
  let lastSel=-1, lastCtl='', lastRear='', lastClose='';
  hook(()=>{ const t=SIM.t;
    updateFront(fr, t);
    if (D.sel!==lastSel){ lastSel=D.sel; m.querySelector('#rlmClose').innerHTML=closeSVG(D.sel); m.querySelectorAll('#rlmClose .rlmPb').forEach(g=>g.onclick=()=>A.press(+g.dataset.m)); }
    updateClose(m.querySelector('#rlmClose'), t);
    m.querySelector('#rlmRead').innerHTML = readoutHTML(t);
    const ck = D.ver+'|'+D.sel; if (ck!==lastCtl){ lastCtl=ck; m.querySelector('#rlmCtl').innerHTML=controlsHTML(); bindControls(m.querySelector('#rlmCtl')); }
    const rk = D.rear+'|'+D.ver+'|'+D.sel+(D.rear==='rlm2'?'|'+Math.floor(t*50):'');
    if (rk!==lastRear){ lastRear=rk; const r=m.querySelector('#rlmRear');
      r.innerHTML = D.rear==='rlm24' ? rearSVG() : D.rear==='rlm12' ? rear12SVG() : `<div style="margin-bottom:8px">${rlm2FrontSVG(t)}</div>${rlm2RearSVG()}`; bindRear(r);
      m.querySelector('#rlmRearNote').innerHTML = D.rear==='rlm24' ? 'Click PS1/PS2, the eight SETUP switches and any of the 24 AES inputs. The OUTPUTS block is on the silk but no AES transmitter is on the RLM24-2 netlist.'
        : D.rear==='rlm12' ? 'This RLM12 rear silk is a different, analog product: “RLM-12 LOUDNESS METER”, 12 stereo inputs (L/R), switches CAL0 0 dBu/+4 dBu, CAL1 phase meter dot/bar, BS0 PPM decay slow/fast, BS1 peak hold. The SHARC library still has those modes (PEAK mode, phase meter, two decay constants) — try them under “What-if”.'
        : `RLM2: two inputs (BNC), four arc windows, jumpers BS1/BS0/CAL1/CAL0 per input. Its electronics are SLM-1 boards (see the SLM plugin); the arcs here are driven by the RLM24 maths on inputs 1 and 2 (${inf}). The 2016 silk labels the BNC at 7.5" INPUT 2 — the photographed RLM2D has INPUT 1 there.`; }
    m.querySelector('#rlmTrace').innerHTML = traceHTML(D, 'Use a control on the panels or below. The firmware path it exercises is listed here.');
    m.querySelector('#rlmLog').innerHTML = logHTML(D);
    m.querySelector('#rlmLeg').innerHTML = `${powered()?'Running':'Off'} · ${BUILDS[D.build].l} · reference ${REFS[calIdx()]} dBFS (cal ${CAL()}) · frame ${frameNo()} · core tick ${SIM.fmtDur(TICK())} → one mux phase per tick, ${(1/(8*TICK())).toFixed(0)} Hz frame · flash ${(1/(1000*TICK())).toFixed(2)} Hz · virtual time ${(D.vclock+t).toFixed(2)} s`;
    SIM.drawLanes(m.querySelector('#rlmTl'), simLanes(), {labelW:200});
  });
}
/* ---------------- tutorial ---------------- */
let lessonIdx=0;
const topK = (m,s)=>{ if(!powered()) return -1; const c=chanAt(meterJ(m,s),SIM.t); return c.vuTop; };
const LESSONS = [
  {title:'1 · Two supplies', body:`<p>The RLM24 has two removable power supplies, each with its own IEC inlet (manual: “dual redundant configuration… The system will operate properly with only one supply”).</p><p>On the rear, click <b>PS1</b> to pull it. The meters keep running from PS2.</p>`, check:()=>!D.ps[0]&&D.ps[1]&&powered(), hint:'PS1 is the upper IEC block at the far left of the rear panel.'},
  {title:'2 · Refit PS1', body:`<p>Click PS1 again. The ATmega reports the supply state to the SHARC in word 48 — but bit 0 (PS1) never arrives, because <span class="mono">get_parms()</span> clocks only 31 of the 32 bits. The PSU alarm itself is the ATmega’s job.</p>`, check:()=>D.ps[0]&&D.ps[1], hint:'Click the red empty slot where PS1 was.'},
  {title:'3 · Frame address', body:`<p>Each frame on the RS-422 control network has an address on SETUP SW1–SW4 (manual table). Set <b>frame 3</b>: SW1 ON, SW2 OFF, SW3 ON, SW4 ON.</p>`, check:()=>frameNo()===3, hint:'SETUP is the blue switch block left of the RS-422 LOOP label. Switch 2 is the second from the top.'},
  {title:'4 · Reference level', body:`<p>SW5/SW6 set where “0” sits: ON/ON −20, OFF/ON −18, ON/OFF −16, OFF/OFF −14 dBFS. The ATmega sends the raw switch byte; the SHARC turns it into <span class="mono">cal = ((val&gt;&gt;12)&amp;3)*4</span> half-dB steps and adds it to the table index.</p><p>Set <b>−18 dBFS</b> (SW5 OFF, SW6 ON).</p>`, check:()=>calIdx()===1, hint:'SW5 is the fifth switch from the top.'},
  {title:'5 · Line up a tone', body:`<p>Select meter 1, set the content to <b>tone</b> and the level to <b>−18</b> dBFS. The VU bar should stop at the “0” LED — the middle of the green window (−1, 0, +1) on the RLM24-1 board.</p><p class="small muted">VUMeterCalc averages in² (τ ${(tau(TC.VU)*1000).toFixed(0)} ms), so a sine reads 3 dB below its peak; the table index offset of 6 puts that back: −18 dBFS sine → 10·log10(A²/2) = −21 dB → parameter 42 → index 42 − 6 + 4 = 40 → “0”.</p>`, check:()=>D.in[0].kind==='tone'&&D.in[0].lvl===-18&&D.in[0].plug&&topK(0,0)===25, hint:'Use the Controls card: meter 1, content tone, peak level −18.'},
  {title:'6 · VU and peak together', body:`<p>Each bar shows VU and PPM at once: the PPM (attack ${(t40(TC.PA)*1000).toFixed(1)} ms per 40 dB, decay ${t40(TC.PD).toFixed(1)} s per 40 dB) lights a single LED above the bar. Set meter 2 to <b>program</b> and watch the dot ride above the bar.</p>`, check:()=>D.in[1].kind==='program'&&D.in[1].plug&&powered(), hint:'Meter 2 → content program.'},
  {title:'7 · Loss of signal', body:`<p>Unplug <b>AES input 3</b> on the rear. The SHARC sees zeros; its silence sensor waits for the delay (10 s by default) before raising bit 0. Click <b>Skip +10 s</b> until pushbutton 3 flashes.</p><p class="small muted">Lock loss reaches the SHARC as word 49 (<span class="mono">lock_stat</span>) but nothing reads it, so the alarm always waits for the silence timer.</p>`, check:()=>pairAlarm(2,SIM.t), hint:'Input 3 is the third green Phoenix block in the top row; then press Skip +10 s twice (10 s delay plus the time MS takes to fall).'},
  {title:'8 · Acknowledge', body:`<p>Press <b>pushbutton 3</b> on the front. <span class="mono">SS_tallies()</span> sets the pb_ack bit, so the LED stops flashing and stays lit while the signal is missing (manual: “The LED will remain illuminated until the signal is restored”).</p>`, check:()=>ackEff(2,SIM.t), hint:'Click the round button under meter 3.'},
  {title:'9 · Restore', body:`<p>Plug input 3 back in. MS climbs above the threshold, DET_COUNT reloads, bit 0 clears and <span class="mono">pb_ack &amp;= pbdata</span> forgets the acknowledgement.</p>`, check:()=>D.in[2].plug&&!pairAlarm(2,SIM.t), hint:'Click input 3 on the rear again.'},
  {title:'10 · Settings from the control panel', body:`<p>The central control panel sends ASCII frames (554164 protocol) to the ATmega, which packs them into 32-bit words for the SHARC. Send <b class="mono">#F3A07T50D015$</b>: frame 3, channel 7 (meter 4 L), threshold −50 dB, delay 15 s.</p><p>Read the trace: the SHARC receives a 14 s delay, because <span class="mono">get_parms()</span> never reads bit 0.</p>`, check:()=>D.thr[6]===50&&D.dly[6]===15, hint:'Type the frame into the Control panel box and press Send (frame must be 3 from lesson 3).'},
];
function viewTutorial(m){ window[ACT]=true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — commissioning an RLM24 (manual: RLM12/RLM24 High Density Digital Audio Meter System)',`<ol id="rlmLs" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="rlmLesson"></div>${card('What the firmware did',`<div id="rlmTr" class="log"></div>`)}</div>
    <div>${card('Front',`<div id="rlmTF">${frontSVG('tf')}</div>`)}${card('Rear',`<div id="rlmTR"></div>`)}${card('Controls',`<div id="rlmTC"></div>`)}</div></div>`;
  const fr=m.querySelector('#rlmTF'); bindFront(fr,'tf'); let lastL='', lastR='', lastC='';
  hook(()=>{ const t=SIM.t; updateFront(fr,t);
    const rk=D.ver+'|'+D.sel; if (rk!==lastR){ lastR=rk; const r=m.querySelector('#rlmTR'); r.innerHTML=rearSVG(); bindRear(r); }
    if (rk!==lastC){ lastC=rk; const c=m.querySelector('#rlmTC'); c.innerHTML=controlsHTML(); bindControls(c); }
    const L=LESSONS[lessonIdx], ok=L.check(), lk=lessonIdx+'|'+ok;
    if (lk!==lastL){ lastL=lk;
      m.querySelector('#rlmLs').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
      m.querySelectorAll('#rlmLs li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; lastL=''; SIM.refresh(); });
      m.querySelector('#rlmLesson').innerHTML = `<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?'✓ Goal reached.':'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
        <div style="display:flex;gap:6px;margin-top:10px"><button id="rlmPrv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="rlmNxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rlmRs">Start over (factory state)</button></div>`;
      m.querySelector('#rlmPrv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); lastL=''; SIM.refresh(); };
      m.querySelector('#rlmNxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); lastL=''; SIM.refresh(); };
      m.querySelector('#rlmRs').onclick=()=>{ A.reset(); lessonIdx=0; lastL=''; SIM.refresh(); }; }
    m.querySelector('#rlmTr').innerHTML = traceHTML(D);
  });
}
/* ---------------- one second ---------------- */
function pbWords(t){ const pd=[0,0,0,0,0,0], pa=[0,0,0,0,0,0];
  const pat=[[0,4,2,6],[8,12,10,14],[16,18,20,22]];      // SS_tallies.c: bits 2,3,4,5 of pbdata[g]
  for (let g=0;g<6;g++){ const base=g<3?0:24, P=pat[g%3]; P.forEach((jb,i)=>{ const j=base+jb, mm=MAP.indexOf(j);
    const a = powered() && (chanAt(j,t).ss|chanAt(j+1,t).ss); if (a) pd[g]|=1<<(i+2); if (mm>=0 && ackEff(mm,t)) pa[g]|=1<<(i+2); }); }
  return {pd, pa}; }
function shiftFrame(t){ const ph=muxAt(t), {pd,pa}=pbWords(t), mask=g=> ph===0 ? ((flashOn(t)?0xff:0)|pa[g]) : 0;
  const rows=[[],[]];
  for (let bd=0;bd<2;bd++){ for (let g=0;g<3;g++){ const j=ph+8*g+24*bd, c=powered()?chanAt(j,t):{d1:0,d2:0}, pb=pd[g+3*bd]&mask(g+3*bd);
      for(let b=5;b>=0;b--) rows[bd].push({v:(pb>>b)&1, seg:'pb', g}); for(let b=15;b>=0;b--) rows[bd].push({v:(c.d2>>>b)&1, seg:'top', g, j}); for(let b=25;b>=0;b--) rows[bd].push({v:(c.d1>>>b)&1, seg:'bot', g, j}); }
    for(let b=0;b<8;b++) rows[bd].push({v:0, seg:'zero'}); const sel=1<<ph; for(let b=7;b>=0;b--) rows[bd].push({v:(sel>>b)&1, seg:'sel'}); }
  return {ph, rows}; }
function viewSecond(m){ window[ACT]=false;
  m.innerHTML = `${card('One second inside the RLM24 SHARC',`<div id="rlmRate"></div>`)}
    <div class="grid2">${card('One TDM frame: three SPORTs, 16 × 32-bit words each (sample.c input_map, RLM24 wiring)',`<canvas id="rlmTdm"></canvas>`)}${card('At the playhead',`<div id="rlmNow"></div>`)}</div>
    ${card('The 160-bit display frame refresh() shifts for the current mux phase (FLG1 → board 1, FLG2 → board 2, FLG3 clock, then FLG10 latch)',`<canvas id="rlmShift"></canvas><p class="small muted">Per group: shifter(6, push-button bits) · shifter(16, top LEDs +1…+20) · shifter(26, bottom LEDs −40…0) — three groups, then shifter(8,0,0) and shifter(8,mux_sel,mux_sel). On the RLM24-1 the first chip (U3, A6276) takes the select byte and drives SEL1–SEL8; U4/U5/U2, U9/U11/U8, U13/U12/U10 take the three 48-bit groups (rlm24-1iss2.net).</p>`)}
    ${card('Timeline (zoom 100 µs for SampleIRQ, 2 ms for the mux, 100 ms for the ATmega words)',`<canvas id="rlmTl2"></canvas>`)}`;
  hook(()=>{ const t=SIM.t, P=PASS_T();
    m.querySelector('#rlmRate').innerHTML = tbl(['Event','per second','period','where (file · function)'],[
      ['TDM frames = SampleIRQ calls','48 000',SIM.fmtDur(1/FS),'tdm_gen.vhd fsynch_sharc → SPORT1/3/5 DMA chains → interrupts(SIG_SP1,SampleIRQ)'],
      ['TDM bits per chain','24 576 000',SIM.fmtDur(1/MCLK),'X1 24.576 MHz: 16 words × 32 bits × 48 kHz'],
      ['Samples processed','2 304 000','—','48 channels: float by −31, VUMeterCalc, SSensorCalc'],
      ['Core clock CCLK',(cclk()/1e6).toFixed(3)+' M',SIM.fmtDur(1/cclk()),'PMCTL PLLM16 ('+inf+')'],
      ['SampleIRQ time','—',SIM.fmtDur(ISR_T()),`≈ ${ISR_CYC} cycles: 48 × (copy, convert, VU 6, SSensor 9) + entry (${inf}); load ${(LOAD()*100).toFixed(0)} %`],
      ['Background passes',isFinite(P)?Math.round(1/P).toLocaleString():'0',isFinite(P)?SIM.fmtDur(P):'—',`≈ ${PASS_CYC} cycles: 96 VUMeterGet (MathLn), 48 SSensorGet, SS_tallies, get_parms (${inf})`],
      ['Core timer ticks',Math.round(1/TICK()).toLocaleString(),SIM.fmtDur(TICK()),'timer.h TIMER_RATE 50000 — the comment says 1 ms'],
      ['Display mux phases (refresh())',Math.round(1/TICK()).toLocaleString(),SIM.fmtDur(TICK()),'SetTimer(GP_TIMER1,1): 8 phases, 3 bars per board per phase'],
      ['Full display frames',(1/(8*TICK())).toFixed(0),SIM.fmtDur(8*TICK()),'each LED lit 1/8 of the time'],
      ['Push-button flash toggles',(1/(500*TICK())).toFixed(1),SIM.fmtDur(500*TICK()),'SetTimer(GP_TIMER0,500): test2 0x00 ↔ 0xff — the “500 ms” runs '+(0.5/(500*TICK())).toFixed(1)+'× fast'],
      ['ATmega words',Math.round(AVR_WORDS/AVR_CYCLE).toLocaleString(),SIM.fmtDur(AVR_WORD),`ALTERA_read_write(): 200 bytes = 50 words per pass (${inf} rate)`],
      ['VU / PPM / MS buckets in this simulator','1 000','1 ms','the per-sample maths is run exactly and sampled every 48 samples']]);
    const cv=m.querySelector('#rlmTdm'), {c,w}=SIM.canvas(cv,150), ph=(t*FS)%1, cur=Math.floor(ph*16);
    for (let p=0;p<3;p++) for (let k=0;k<16;k++){ const word=p*16+k, x=90+k*(w-100)/16, yy=10+p*42, src = D.build==='nab2005' ? null : SLOT_M[word];
      c.fillStyle = word%2? SIM.css('--accent2'):SIM.css('--accent'); c.globalAlpha = k===cur ? .9 : .25; c.fillRect(x,yy,(w-100)/16-2,30); c.globalAlpha=1;
      c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(src?`${src.m}${src.s?'R':'L'}`:'', x+3, yy+19); }
    c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; ['SPORT1','SPORT3','SPORT5'].forEach((l,p)=>c.fillText(l,6,30+p*42)); c.fillText('numbers = rear input L/R carried in each word (input_map → parm_map)', 90, 142);
    const sf=shiftFrame(t), cs=m.querySelector('#rlmShift'), S=SIM.canvas(cs,92), cw=(S.w-70)/160;
    sf.rows.forEach((row,bd)=>row.forEach((b,i)=>{ const x=60+i*cw, yy=8+bd*34; const col={pb:'--bad',top:'--warn',bot:'--accent',zero:'--ink2',sel:'--accent2'}[b.seg];
      S.c.fillStyle=SIM.css(col); S.c.globalAlpha = b.v ? .95 : .15; S.c.fillRect(x,yy,Math.max(1,cw-0.6),24); S.c.globalAlpha=1; }));
    S.c.fillStyle=SIM.css('--ink'); S.c.font='11px sans-serif'; S.c.fillText('FLG1',6,24); S.c.fillText('FLG2',6,58);
    S.c.fillStyle=SIM.css('--ink2'); S.c.font='10px sans-serif'; S.c.fillText(`mux phase ${sf.ph}: SHARC channels ${sf.ph}, ${sf.ph+8}, ${sf.ph+16} (board 1) and ${sf.ph+24}, ${sf.ph+32}, ${sf.ph+40} (board 2) · red = push-button bits (phase 0 only) · amber = top 16 · green = bottom 26 · blue = select`, 60, 86);
    const sel=meterJ(D.sel,0), ch=powered()?chanAt(sel,t):null, wd=wordAt(t);
    m.querySelector('#rlmNow').innerHTML = kvt([['Time',SIM.fmtT(t),1],['TDM frame / bit',`${Math.floor(t*FS)} / ${Math.floor(ph*TDM_BITS)} (word ${Math.floor(ph*16)} of each SPORT)`,1],
      ['tdm_idx (DMA buffer being processed)', String(Math.floor(t*FS)%2),1],['Core tick / mux_count / mux_sel',`${Math.floor(t/TICK())} / ${muxAt(t)} / ${hex(1<<muxAt(t),2)}`,1],
      ['test2 (flash)', flashOn(t)?'0xff':'0x00',1],['Latched ATmega word',`w${wd} = ${hex(word(wd))} → SHARC ${hex(rxWord(word(wd)))}`,1],['SPIProcRX',decode(rxWord(word(wd))),0],
      [`Meter ${D.sel+1} L`, ch?`VU ${dbs(ch.vu)} dB, PPM ${dbs(ch.pk)} dB, index ${ch.vi}/${ch.pi}`:'off',1]]);
    SIM.drawLanes(m.querySelector('#rlmTl2'), allLanes(), {labelW:210});
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS={
  in:  {x:12, y:20, w:150,h:78,t:'24 AES inputs',s:['110 Ω Phoenix / 75 Ω BNC','DS26LS32A ×7'],d:'Rear panel (RLM24REARCURVE.cdr): two rows of twelve 3-pin inputs. RLM24-6 / TB8201AP termination boards for BNC (see the RLM24-2 plugin).'},
  rx:  {x:180,y:20, w:150,h:78,t:'CS8416 ×24',s:['AES receivers','lock → ATmega'],d:'One receiver per input; the ATmega reads the lock bits (CS8416_READ_LOCK_ALL) and resets a receiver when it re-locks. Unlocked → its converter sends zeros.'},
  src: {x:348,y:20, w:160,h:78,t:'AD1895 ×24',s:['to 48 kHz','3 TDM chains of 8'],d:'Each converter outputs its own pair, then passes on what its TDM_IN (pin 20) receives: U10→U7→U5→U3→U400→U402→U404→U406→FPGA on chain 1 (nets TDM1_2…TDM1_8, rlm24-2ISS2.net).'},
  fpga:{x:526,y:20, w:180,h:96,t:'EP1C6Q240C8 (U21)',s:['tdm_gen: 512-bit frame','shift_in_out32: ATmega word','display_clear · CS_8416'],d:'RLM24-2V100.bdf (Quartus 5.1): tdm_gen divides the 24.576 MHz mclk by 512 for the SHARC frame sync; shift_in_out32 holds one 32-bit word from the ATmega for the SHARC; display_clear shifts zeros into the LED drivers while FLG11 is high; CS_8416 decodes the 5-bit receiver select; CLKCFG0/1 tied low, BOOTCFG0 high.'},
  dsp: {x:730,y:20, w:200,h:120,t:'ADSP-21262 SHARC (U1)',s:['SampleIRQ 48 kHz: 48 ch','VUMeterCalc · SSensorCalc','while(1): Get, SS_tallies','refresh(): 160-bit shift','get_parms(): 31 clocks'],d:'sharc/v100: backgnd.c, sample.c, vumeter.asm, SSensor.asm, shifter.asm, get_parms.c, spi.c. Boots from AT25F512A (U2) over SPI. Click the other blocks to follow the data.'},
  disp:{x:730,y:170,w:200,h:96,t:'RLM24-1 display ×2',s:['A6276 ×10 (160 bits)','SEL1–8 via 2N4403','74HC165 ×2 (buttons)'],d:'Each board: 1008 0805 LEDs (24 bars × 42), 12 lit pushbuttons, DS26LS32A receiver for DATA_IN, DRVR_CLK, DRVR_LE, DRVR_OE. U3 drives SEL1–SEL8 (one mux phase per tick); U4/U5/U2 etc. sink 42 LEDs + 4 pushbutton LEDs per group.'},
  link:{x:526,y:170,w:180,h:96,t:'DS26LS31C ×2 → ZIF30',s:['DATA_OUT1–8','RS-422 to the boards'],d:'FPGA data_out1–8 → U17/U19 (DS26LS31C) → H3 (ZIF30H) flat cable → the two RLM24-1 boards: data, clock, latch and output enable per board.'},
  avr: {x:280,y:170,w:200,h:96,t:'ATmega128 (U14)',s:['v101.c, 4.9152 MHz','50 words / pass → FPGA','SETUP, PSU, lock, RS-485'],d:'ALTERA_SORT() packs {cmd, channel, threshold+3, delay} for 48 channels, then {4, 0, dip_switch, PSU} and {5, lock3, lock2, lock1}; ALTERA_read_write() shifts them MSB first. Also releases SHARC_RESET.'},
  ctl: {x:12, y:170,w:200,h:96,t:'RLMCTL control panel',s:['554164 ASCII protocol','#F f A nn T tt D ddd $','RS-422/485 daisy chain'],d:'Optional ½-rack panel (job 554164): four encoders choose frame, channel, threshold (−20…−70) and delay (0…240 s). The ATmega’s UART0_translate() decodes the frames.'},
};
const WIRES=[['in','rx',''],['rx','src','I²S'],['src','fpga','TDM ×3'],['fpga','dsp','DAI P1–P5'],['dsp','fpga','FLG1–3, 10, 11'],['fpga','link',''],['link','disp','ZIF30'],['disp','fpga','pb data'],['avr','fpga','word link'],['ctl','avr','RS-485'],['avr','rx','SPI']];
function viewBlock(m){ window[ACT]=false; blockView(m,BLOCKS,WIRES,'dsp',[945,285],card('In one sentence',`<p>Twenty-four AES receivers and rate converters feed three 24.576 MHz TDM chains through a Cyclone FPGA into a SHARC; the SHARC computes VU, PPM and a silence detector for 48 channels every sample, shifts 160 bits per tick to two LED boards, and takes its settings one 32-bit word at a time from the ATmega.</p>`)); }

/* ---------------- schematics (redrawn) ---------------- */
const SHEETS=[
 {name:'SHARC U1', note:'ADSP-21262 (QFP144) pins and nets from rlm24-2ISS2.net. X1 is labelled “24.578M”; the TDM maths needs 24.576 MHz. CLKCFG0/1 and BOOTCFG0 come from the FPGA (tied low / high in RLM24-2V100.bdf → 6:1 reset ratio, SPI-master boot from U2).', svg:()=>
   chip(330,60,150,'U1 ADSP-21262',[['142 CLKIN','X1 24.578M'],['143 XTAL','X1'],['2 CLKCFG0','U21-160 (0)'],['3 CLKCFG1','U21-161 (0)'],['4 BOOTCFG0','U21-162 (1)'],['121 RESET','SHARC_RESET ← U14-9'],['125 SPICLK','→ U2-6 AT25F512A'],['127 MOSI','MOSO → U2-5'],['126 MISO','← U2-2'],['15 FLAG0','FLAG0_CS → U2-1'],['16 FLAG1','U21-163 data 1'],['97 FLAG2','U21-143 data 2'],['98 FLAG3','U21-144 clock']],
     [['53 DAI_P1','U21-159 frame sync'],['56 DAI_P2','U21-158 bit clock'],['57 DAI_P3','U21-141 TDM 1'],['62 DAI_P4','U21-140 TDM 2'],['63 DAI_P5','U21-139 TDM 3'],['64 DAI_P6','U21-138 FLAG10 latch'],['65 DAI_P7','U21-137 FLAG11 zero'],['70 DAI_P8','U21-136 FLAG12 fs en'],['71 DAI_P9','U21-135 FLAG13 pb 1'],['77 DAI_P10','U21-132 FLAG14 pb 2'],['79 DAI_P12','U21-134 output_le'],['80 DAI_P13','U21-128 output_clock'],['82 DAI_P15','U21-126 FLAG15 data'],['94 DAI_P20','U21-121 alarm']],'CCLK = 24.576 MHz × 16 ÷ 2 ('+inf.replace(/<[^>]+>/g,'')+')')
   +txt(40,410,'InitDAI(): PB01→SPORT1/3/5_FS, PB02→SPORT0…5_CLK, PB03/04/05→SPORT1/3/5_DA;',10.5,'var(--ink2)')+txt(40,426,'FLAG10/11/12→PB06/07/08 out; PB09/10/15→FLAG13/14/15 in; PB12, PB13, PB20 driven LOW',10.5,'var(--ink2)')},
 {name:'FPGA U21', note:'EP1C6Q240C8 pin assignments from RLM24-2V100.qsf, nets from rlm24-2ISS2.net. The .qsf puts “clkcfg0” on pin 161, which the board wires to the SHARC’s CLKCFG1 (and the other way round) — harmless, both are driven low.', svg:()=>
   chip(265,40,300,'U21 EP1C6Q240C8',[['58 tdm_sclk1','SCLK1'],['59 tdm_fsnch1','LRCLK1'],['60 tdm_data_in1','TDM1 ← U406-23'],['62 tdm_sclk2','SCLK2'],['61 tdm_fsnch2','LRCLK2'],['116 tdm_data_in2','TDM2'],['120 tdm_sclk3','SCLK3'],['119 tdm_fsnch3','LRCLK3'],['118 tdm_data_in3','TDM3'],['56 master_src_clk','MASTER_SRC_CLK'],['16–20 sel_in[4:0]','SPI_SEL0–4 ← U14'],['8 data_atmel','← ATmega'],['127 data_to_atmel','→ ATmega'],['2 pbdata1','← board 1'],['3 pbdata2','← board 2'],['4 alarm','→ ATmega']],
     [['159 tdm_fsnch_sharc','DAI_P1'],['158 tdm_sclk_sharc','DAI_P2'],['141 tdm_data_out1','DAI_P3'],['140 tdm_data_out2','DAI_P4'],['139 tdm_data_out3','DAI_P5'],['163/143/144 flag1–3','FLAG1–3'],['138 flag10_dai6','latch'],['137 flag11_dai7','zero shift'],['136 flag12_dai8','fs enable'],['134 output_le','DAI_P12'],['128 output_clock','DAI_P13'],['126 flag15','DAI_P15'],['121 DAI_20','DAI_P20'],['233–240 data_out1–8','U17/U19'],['161/160 clkcfg0/1','U1-3/U1-2'],['162 bootcfg0','U1-4']],'Cyclone, EPCS1, Quartus II 5.1 SP0.15')},
 {name:'TDM chain 1', note:'AD1895 TDM daisy chain on chain 1 (rlm24-2ISS2.net nets TDM1_2…TDM1_8; pin 20 = TDM_IN, 23 = data out). The converter nearest the FPGA sends its own pair first ('+inf.replace(/<[^>]+>/g,'')+' from the AD1895 TDM mode), so U406 fills words 0/1 and U10 words 14/15. Chains 2 and 3 (TDM2_*, TDM3_*) are the same.', svg:()=>{
   const U=['U10','U7','U5','U3','U400','U402','U404','U406']; let s='';
   U.forEach((u,i)=>{ const x=30+i*100, y=150; s+=`<rect x="${x}" y="${y}" width="80" height="90" fill="var(--panel2)" stroke="var(--ink)"/>`+txt(x+40,y-8,u,12,'var(--ink)','middle')+txt(x+40,y+20,'AD1895',10.5,'var(--ink2)','middle')+txt(x+6,y+46,'20 TDM_IN',9.5)+txt(x+74,y+66,'23 OUT',9.5,'var(--ink)','end')+txt(x+40,y+84,`words ${14-2*i},${15-2*i}`,9.5,'var(--accent2)','middle');
     if (i<7) s+=wire([[x+80,y+62],[x+100,y+62],[x+100,y+42],[x+100,y+42]])+net(x+82,y+110,['TDM1_8','TDM1_7','TDM1_6','TDM1_5','TDM1_4','TDM1_3','TDM1_2'][i]); });
   s+=wire([[830,212],[845,212]])+net(848,262,'TDM1 → U21-60','end')+txt(40,300,'SCLK1, LRCLK1 common to all eight (and to U21-58/59); MCLKOUT1…5 chain the converters’ master clocks; TDM1_5 also taps U21-57.',10.5,'var(--ink2)');
   return s+txt(40,330,'SPORT1 receives these 16 words; sample.c input_map sends word k to audio_in_float[input_map[k]] — e.g. words 0/1 → channels 16/17 = meter 1.',10.5,'var(--ink2)'); }},
 {name:'RLM24-1 board', note:'Display board from rlm24-1iss2.net/.pnp: ten A6276 16-bit LED sinks in one chain (DATA_IN → … → DATA_IN4 to the next board), DRVR_CLK/LE/OE common. Order of the unnamed links between chips is '+inf.replace(/<[^>]+>/g,'')+' from the shift order in backgnd.c.', svg:()=>{
   const C=[['U3','SEL1–8','select byte'],['U4','D0–D15','group 1'],['U5','D16–D31','group 1'],['U2','D32–41, PBLED1–4','group 1'],['U9','D2_0–15','group 2'],['U11','D2_16–31','group 2'],['U8','D2_32–41, PBLED5–8','group 2'],['U13','D3_0–15','group 3'],['U12','D3_16–31','group 3'],['U10','D3_32–41, PBLED9–12','group 3']]; let s='';
   C.forEach(([u,o,g],i)=>{ const x=20+(i%5)*166, y=60+Math.floor(i/5)*170; s+=`<rect x="${x}" y="${y}" width="130" height="80" fill="var(--panel2)" stroke="var(--ink)"/>`+txt(x+65,y-8,u+' A6276',11.5,'var(--ink)','middle')+txt(x+6,y+18,'2 SDI  22 SDO',9.5)+txt(x+6,y+36,'3 CLK 4 LE 21 OE',9.5)+txt(x+6,y+56,o,9.5,'var(--accent2)')+txt(x+6,y+72,g,9.5,'var(--ink2)');
     if (i%5<4) s+=wire([[x+130,y+40],[x+166,y+40]]); });
   s+=wire([[749,140],[749,170],[85,170],[85,230]]);
   s+=net(20,30,'DATA_IN (U6-13 DS26LS32A) → U3-2')+net(520,30,'DRVR_CLK, DRVR_LE, DRVR_OE → all ten')+net(700,400,'U10-22 → DATA_IN4','start');
   s+=txt(20,420,'Each D-line drives the same LED of 8 bars (L1_k, L1_(k+42) … L4_…); SEL1–8 switch the bar anodes (2N4403). 528 GRN + 288 YEL + 192 red = 1008 LEDs.',10.5,'var(--ink2)');
   return s+txt(20,438,'Pushbuttons PB1–PB12 → 74HC165 U14/U7 → shifted back on pbdata1/2 → FLG13/FLG14 (shifter(12,0,0)).',10.5,'var(--ink2)'); }},
 {name:'Display link', note:'FPGA → DS26LS31C differential drivers → H3 (ZIF30H) on the RLM24-2; DS26LS32A U6 on each RLM24-1 (rlm24-1iss2.net: pin 13 DATA_IN, 3 DRVR_CLK, 5 DRVR_LE, 11 DRVR_OE). Which data_out goes to which board signal is '+inf.replace(/<[^>]+>/g,'')+'.', svg:()=>
   chip(200,60,120,'U17 DS26LS31C',[['1 A in','DATA_OUT1 ← U21-233'],['7 B in','DATA_OUT2 ← U21-234'],['9 C in','DATA_OUT3 ← U21-236'],['15 D in','DATA_OUT4 ← U21-235']],[['2/3','H3-2/H3-1'],['6/5','H3-5/H3-4'],['10/11','H3-8/H3-7'],['14/13','H3-11/H3-10']])
   +chip(200,250,120,'U19 DS26LS31C',[['1','DATA_OUT5 ← U21-238'],['7','DATA_OUT6 ← U21-237'],['9','DATA_OUT7 ← U21-239'],['15','DATA_OUT8 ← U21-240']],[['2/3','H3-14/H3-13'],['6/5','H3-17/H3-16'],['10/11','H3-20/H3-19'],['14/13','H3-23/H3-22']])
   +chip(590,140,130,'U6 DS26LS32A (RLM24-1)',[['in A','ZIF30V H1/H2'],['in B',''],['in C',''],['in D','']],[['13','DATA_IN'],['3','DRVR_CLK'],['5','DRVR_LE'],['11','DRVR_OE']])
   +wire([[450,150],[540,150]])+txt(455,140,'flat cable',10.5,'var(--ink2)')},
];
function viewSchem(m){ window[ACT]=false; schemView(m,SHEETS,'RLM24-2 / RLM24-1','Redrawn from rlm24-2ISS2.net, rlm24-1iss2.net/.pnp and RLM24-2V100.qsf/.bdf. Pin numbers and net names are real; layout is not the original CAD.'); }

/* ---------------- software ---------------- */
const STEPS=[{t:'VUMeterGet ×96',s:['vu_results = max(·,6)','pk_results = max(·,2)']},{t:'SSensorGet ×48',s:['ss_results[k] (bit 0)','phase meter: commented']},
  {t:'GP_TIMER0',s:['every 500 ticks','test2 0x00 ↔ 0xff']},{t:'GP_TIMER1 → refresh()',s:['every tick: mux_count−−','160 bits, latch, read 12']},
  {t:'SS_tallies()',s:['pbdata, pb_ack, alarm','DAI_PB20 (never HIGH)']},{t:'get_parms()',s:['latch DAI_PB12, 31 clocks','DAI_PB13, data FLG15']},{t:'SPIProcRX(parms)',s:['cmd 1 SS chan, 4 PSU/cal','5 lock (unused)']}];
function stepAt(t){ const P=PASS_T(); if(!isFinite(P)) return 0; const f=(t%P)/P; return f<.5?0 : f<.62?1 : f<.68?2 : f<.74?3 : f<.8?4 : f<.97?5 : 6; }
const ISR_ST=[{t:'SIG_SP1',s:['SPORT1 RX chain','TCB done (PCI)']},{t:'swap tdm_idx',s:['double buffer','TDM_audio_in1/2']},{t:'echo',s:['TDM_out[k] = TDM_in[k]','(TX pins unrouted)']},{t:'float by −31',s:['audio_in_float[','input_map[k]]']},{t:'VUMeterCalc',s:['48 ch, 6 cycles each','VU, PPM in²']},{t:'SSensorCalc',s:['9·N + 13 cycles','MS, DET_COUNT']}];
function viewSoft(m){ window[ACT]=true;
  m.innerHTML = `${card('Main loop — backgnd.c while(1) (the running step follows the playhead; pass ≈ <span id="rlmPt"></span>, '+inf+')',`<div id="rlmLoop"></div>`)}
   ${card('SampleIRQ — sample.c, once per 48 kHz TDM frame (rlm24_proc.c, the shell262 original, is in the folder but not built)',`<div id="rlmIsr"></div>`)}
   <div class="grid2"><div>${card('Live variables at the playhead',`<div id="rlmVars"></div>`)}${card('VU/PPM/silence constants (vumeter.asm, SSensor.asm)',`<div id="rlmK"></div>`)}</div>
     <div>${card('ATmega → FPGA → SHARC words (v101.c ALTERA_SORT, get_parms.c, spi.c)',`<div id="rlmW" class="scroll" style="max-height:330px"></div>`)}${card('Clock and cycle budget',`<div id="rlmClkB"></div>`)}</div></div>
   <div class="grid2">${card('SPORT, DMA and SRU set-up (SampleInit, InitDAI)',tbl(['Register','Value','Meaning'],[
      ['SPCTL0…5','SCHEN_A | SDEN_A | SLEN32','DMA on, 32-bit words, slave (DIV0/DIV1 = 0)'],['SPMCTL01/23/45','NCH15 | MCEA','multichannel (TDM), 16 channels, enabled last'],
      ['MR1CS0, MR3CS0, MR5CS0','0xffff','receive all 16 words on SPORT1/3/5'],['MT0CS0, MT2CS0, MT4CS0','0xffff','transmit 16 words on SPORT0/2/4 (the echo)'],
      ['rx1a_tcb1/2','{…,16,1,TDM_audio_in1/2}','chained, CP + 0x80000 (PCI → interrupt) on SPORT1 only'],['rx3a/rx5a TCBs','TDM_audio_in + 16 / + 32','chained, no PCI bit'],
      ['CPSP0A/2A/4A','tx TCBs','sample.c; rlm24_proc.c wrote these to CPSP1A/3A/5A by mistake'],['interrupts(SIG_SP1,…)','SampleIRQ','one interrupt per frame'],
      ['SRU PB01 → SPORT1/3/5_FS','DAI_P1','frame sync from tdm_gen'],['SRU PB02 → SPORT0…5_CLK','DAI_P2','24.576 MHz bit clock'],['SRU PB03/04/05 → SPORT1/3/5_DA','DAI_P3/4/5','three TDM chains'],
      ['FLAG10/11/12 → PB06/07/08','outputs','latch, zero-shift enable, fsync enable'],['PB09/PB10/PB15 → FLAG13/14/15','inputs','push-button data 1/2, ATmega data'],['PB12, PB13','LOW (toggled via SRU_PIN2 bits 6 and 12)','get_parms latch and clock'],['PB20','LOW','alarm output'],['DAI_PIN_PULLUP','0xfffe0','pull-ups on unused pins']],1))}
     ${card('The builds in software/sharc',tbl(['Folder','Differences from v100','Date'],[
      ['v100','reference: input_map, +cal, TIMER_RATE 50000, SS DET_TIME 0 patch',Y(2005)],['last','VU index “−6−cal”, peak “+cal”; rlm24.dpj',Y(2007)],
      ['nab2005','input_map unused: all meters = TDM words 6/7',Y(2005)],['rlm12d','12-input input_map, ss_results zeroed for 24 channels',Y(2006)],
      ['v100test, rlm24v100test','TIMER_RATE 100000, no spi.c/get_parms.c, older tables (122 entries), no DET_TIME patch',Y(2005)],['ams81 test (+ test rlm24-1 with ams81)','AMS8-1 ADSP-21065L code used to light an RLM24-1 board','—']],1))}</div>`;
  let lastStep=-1, lastIsr=-1, lastV=-1;
  hook(()=>{ const t=SIM.t, st=stepAt(t);
    m.querySelector('#rlmPt').textContent = isFinite(PASS_T())?SIM.fmtDur(PASS_T()):'never';
    if (st!==lastStep){ lastStep=st; m.querySelector('#rlmLoop').innerHTML=loopSVG(STEPS, st, 'backgnd.c main(): after InitDAI(), TimerInit(), SampleInit() and FLG12 set'); }
    const ph=(t*FS)%1, isr = ph*(1/FS) < ISR_T() ? Math.min(5, Math.floor(ph*FS*(1/FS)/ISR_T()*6)) : -1;
    if (isr!==lastIsr){ lastIsr=isr; m.querySelector('#rlmIsr').innerHTML=flowSVG(ISR_ST, isr)+`<p class="small muted">${isr<0?'Between interrupts: the background loop is running.':'Inside SampleIRQ.'} ${D.build==='nab2005'?'nab2005 build: audio_in_float[k] = TDM_in[6 or 7].':''}</p>`; }
    const j=meterJ(D.sel,0), c=powered()?chanAt(j,t):null, {pd,pa}=pbWords(t), wd=wordAt(t);
    m.querySelector('#rlmVars').innerHTML = c ? kvt([
      ['meter / SHARC channel',`${D.sel+1} L → ${j} (parm_map[${chOf(j)}])`,1],['vumeter_wspace[5+2·'+j+'], [6+2·'+j+']',`PPM ${c.pk.toExponential(3)}, VU ${c.vu.toExponential(3)}`,1],
      ['VUMeterGet(…,VU) / (…,PPMPEAK)',`${c.vuP} / ${c.pkP}`,1],['vu_results / pk_results',`${c.vr} / ${c.pr}`,1],['cal',`${CAL()} (${D.build==='last'&&!D.wi.fixCal?'VU uses −cal':'+cal'})`,1],
      ['rlm24_vu_data1/2[…]',`[${c.vi}] → ${hex(VU1[c.vi]||0,7)} / ${hex(VU2[c.vi]||0,4)}`,1],['rlm24_pk_data1/2[…]',`[${c.pi}] → ${hex(PK1[c.pi]||0,7)} / ${hex(PK2[c.pi]||0,4)}`,1],
      ['ssensor_wspace MS / THRES',`${c.ms.toExponential(3)} / ${c.thrMs.toExponential(3)}`,1],['DET_TIME / DET_COUNT',`${c.det.toLocaleString()} / ${c.cnt.toLocaleString()}`,1],
      ['pbdata[0…5]',pd.map(v=>hex(v,2)).join(' '),1],['pb_ack[0…5]',pa.map(v=>hex(v,2)).join(' '),1],['alarm (SS_tallies)',anyUnacked(t)?'≠ 0':'0',1],
      ['mux_count / mux_sel / test2',`${muxAt(t)} / ${hex(1<<muxAt(t),3)} / ${flashOn(t)?'0xff':'0x00'}`,1],['parms (get_parms)',`${hex(rxWord(word(wd)))} = word ${wd}`,1]]) : '<p class="muted">Unit off.</p>';
    if (D.ver+wd*1000!==lastV){ lastV=D.ver+wd*1000; const rows=[]; for (let w=0;w<AVR_WORDS;w++){ const v=word(w), r=rxWord(v); rows.push([`<span class="${w===wd?'hl':''}">${w}</span>`, `<span class="mono">${hex(v)}</span>`, `<span class="mono">${hex(r)}</span>`, `<span class="small">${decode(r)}${v!==r?' <b style="color:var(--bad)">bit 0 lost</b>':''}</span>`]); }
      m.querySelector('#rlmW').innerHTML = tbl(['word','ATmega sends','SHARC reads','SPIProcRX'], rows); }
    m.querySelector('#rlmK').innerHTML = tbl(['Constant','Value','Means'],[
      ['TCONST_VU',TC.VU+(D.wi.vu?` (what-if ${VU_ALT[D.wi.vu]})`:''),`τ ${(tau(VU_ALT[D.wi.vu])*1000).toFixed(0)} ms on in² — 40 dB in ${t40(VU_ALT[D.wi.vu]).toFixed(2)} s`],
      ['TCONST_PPM_ATTACK',TC.PA,`τ ${(tau(TC.PA)*1000).toFixed(2)} ms — 40 dB in ${(t40(TC.PA)*1000).toFixed(1)} ms`],
      ['TCONST_PPM_DECAY',PD_ALT[D.wi.pd],`40 dB in ${t40(PD_ALT[D.wi.pd]).toFixed(2)} s = 24 dB in ${(t40(PD_ALT[D.wi.pd])*0.6).toFixed(2)} s (manual: 3.0 s / 24 dB)`],
      ['VUMETER_PARM_PEAKMODE',D.wi.peak?'1 (what-if)':'0 (vumeter_parms = {0})','PPM; PEAK mode would use attack 1.0, decay 0.0 and clear on read'],
      ['TCONST_RMS (SSensor)',TC.SS,`τ ${(tau(1-TC.SS)*1000).toFixed(0)} ms`],['DEFAULT_THRES / DET_TIME','1e-6 / SAMPLE_RATE·2','−60 dB / 2 s (comment: “1 second”) — overwritten by the ATmega words'],
      ['Threshold word','threshold + 3','10^(−(t+3)/10): +3 turns a sine’s peak dBFS into mean square']],1);
    m.querySelector('#rlmClkB').innerHTML = `<p class="small"><select id="rlmClk2" style="max-width:100%">${CCLKS.map((c2,i)=>`<option value="${i}" ${i===D.cclk?'selected':''}>${c2.l}</option>`).join('')}</select></p>`+kvt([
      ['Core tick (TIMER_RATE 50000)',SIM.fmtDur(TICK()),1],['SampleIRQ ≈ '+ISR_CYC+' cycles',SIM.fmtDur(ISR_T())+` (${(LOAD()*100).toFixed(0)} % of 20.83 µs)`,1],
      ['Background pass ≈ '+PASS_CYC+' cycles',isFinite(PASS_T())?SIM.fmtDur(PASS_T()):'never runs',1],['refresh() ≈ '+REFRESH_CYC+' cycles (160 + 12 bits bit-banged)',SIM.fmtDur(REFRESH_T()),1],
      ['PLL settle loop (0xffffff × 1 cycle at bypass)',((0xffffff)/MCLK).toFixed(2)+' s',1]])+`<p class="small muted">Cycle counts are ${inf} from the instruction counts in vumeter.asm, SSensor.asm (“9*N + 13”) and shifter.asm. At 50 MHz SampleIRQ alone would not fit in a frame, so the “1 msec” comment cannot describe the shipped clock.</p>`;
    const s2=m.querySelector('#rlmClk2'); if (s2) s2.onchange=e=>A.cclk(+e.target.value);
  });
}
/* ---------------- findings ---------------- */
function viewNotes(m){ window[ACT]=false;
  const f=(h,b)=>`<li><b>${h}</b> ${b}</li>`;
  m.innerHTML = card('Artwork 2026|59',`<ol><li><b>Artwork 2026|59: rear panels now from</b> ${SIM.src(RLMA+'SILK/RLM24REARCURVE.cdr','RLM24REARCURVE.cdr')} (24 Feb 2005), ${SIM.src(RLMA+'SILK/RLM12REARcurve.cdr','RLM12REARcurve.cdr')} (30 Mar 2004) and ${SIM.src(RLM2S+'RLM2-REAR-SILK(CURVE).cdr','RLM2-REAR-SILK(CURVE).cdr')} (17 May 2016) as vectors, replacing the PNG cuts. The archive has no CorelDRAW front panel for any RLM (the RLM24 front is a lens, the RLM2 front is drawn from RLM2-M1).</li>${FOOT.map(f=>`<li>${f.text} <span class="muted small">— ${SIM.src(f.src)}</span></li>`).join('')}</ol>`) + card('What the RLM SHARC code is up to — findings',`<ol>
   ${f('Settings lose their lowest bit.','<span class="mono">get_parms.c</span> clocks 31 bits (<span class="mono">for(k=0;k&lt;31;k++)</span>) out of the 32-bit <span class="mono">shift_in_out32</span> word, reading before each clock and shifting after, so bits 31…1 land in place and bit 0 is always 0. The delay byte is bits 0–7: an odd silence delay arrives one second short (15 → 14 s), and 1 s arrives as 0, which the SSensorCalc patch treats as “never alarm”. PSU1’s status (word 48 bit 0) and input 1’s lock bit never arrive either. The debug compare <span class="mono">if (atmel_data_in != 0x0100280a)</span> (channel 0, threshold 40, delay 10 — before the +3 was added) has bit 0 clear, so it never noticed.')}
   ${f('The alarm output is never raised.','<span class="mono">SS_tallies.c</span>: <span class="mono">if (*(unsigned long*)DAI_PIN_STAT&amp;0x80000==0) SRU(HIGH,DAI_PB20_I);</span> — <span class="mono">==</span> binds tighter than <span class="mono">&amp;</span>, so the test is <span class="mono">x &amp; 0</span> and never true. The matching LOW branch tests bit 0 (DAI_P1, the frame sync) instead of bit 19. DAI_PB20 stays LOW in every build.')}
   ${f('The “last” build moves bar and peak in opposite directions.','In <span class="mono">sharc/last/v100/backgnd.c</span> refresh() indexes the VU tables with <span class="mono">vu_results−6−cal</span> but the peak tables with <span class="mono">pk_results+cal</span>; v100, nab2005 and rlm12d use <span class="mono">+cal</span> for both. At −18…−14 dBFS reference the bar reads 2…6 dB high while the peak reads 2…6 dB low, and near full scale the VU index goes negative (reads before <span class="mono">rlm24_vu_data1</span>). Try it: build “last”, SW5 OFF.')}
   ${f('Lock loss is received and ignored.','The ATmega sends the 24 lock bits as word 49 (SPICMD_STATUS_LOCK); <span class="mono">spi.c</span> stores them in <span class="mono">lock_stat</span> and nothing reads it (v100 even has an empty “test for NO Lock status” comment). An unplugged input alarms only after the silence delay, although the manual lists “interruption” as a loss-of-signal cause.')}
   ${f('PPM decay vs the manual.','<span class="mono">TCONST_PPM_DECAY 0.000031978</span> gives 40 dB in 6.0 s = 24 dB in 3.6 s; the manual promises “3.0 Second /24dB decay”. 3.0 s / 24 dB is exactly the SLM-1’s <span class="mono">peak_decay_2_48 = 0.0000383757</span>. The commented-out value 0.000191863 (40 dB in 1 s) shows the decay was slowed sixfold during development.')}
   ${f('The software timers run about four times fast.','<span class="mono">TIMER_RATE 50000 // 100000/2 … 1 msec rate based on 100MHZ</span>, but main() raises the PLL to PLLM16. With the 24.576 MHz CLKIN that is 196.608 MHz (if PLLD stays ÷2, '+inf+'), a 254 µs tick: the “500 ms” push-button flash toggles every 127 ms (≈3.9 Hz) and the 8-phase LED multiplex runs at ≈490 Hz. At the 50 MHz the comment implies, SampleIRQ (≈1050 cycles, '+inf+') would not fit in a 20.8 µs frame.')}
   ${f('shell262 leftovers, and one bug they had.','<span class="mono">rlm24_proc.c</span>, <span class="mono">refresh.c</span> and <span class="mono">shell262.dpj</span> are in every build folder but not in <span class="mono">rlm24.mak</span>. rlm24_proc.c — the framework later copied into the SLM-1, AMS16 and M6206 — writes the transmit DMA chain pointers into <span class="mono">CPSP1A/3A/5A</span>, the receive registers it had just set; sample.c fixes this with CPSP0A/2A/4A.')}
   ${f('An echo to nowhere.','SampleIRQ copies all 48 TDM inputs to <span class="mono">TDM_audio_out</span> every sample and SPORT0/2/4 transmit them, but InitDAI() routes no SPORT0/2/4 data pin. The rear silk has an “OUTPUTS 1–4” block; the RLM24-2 netlist has no AES transmitter.')}
   ${f('Disabled features in the library.','<span class="mono">PhaseMeterCalc</span> is commented out (its 48-float workspace is still allocated), <span class="mono">phase_results</span> is never filled, and <span class="mono">VUMeterEdit(PEAKMODE)</span> is never called. The RLM12 rear silk (RLM12REARcurve.cdr, “RLM-12 LOUDNESS METER”) advertises exactly these: PHASE METER DOT/BAR, PPM DECAY SLOW/FAST, PEAK HOLD, and 0 dBu/+4 dBu analog inputs with L/R per channel — an earlier analog RLM-12, not the AES RLM12 of the manual.')}
   ${f('A trade-show build.','<span class="mono">sharc/nab2005/v100/sample.c</span> skips input_map: <span class="mono">audio_in_float[k] = TDM_in[i]; i = i^1</span> starting at 6, so all 48 bars show TDM words 6/7 — input 13 — on every meter.')}
   ${f('RLM12 = an RLM24 with half the map.','<span class="mono">sharc/rlm12d</span>: twelve TDM pairs mapped; the other twelve all write channels 26/27 (the last one wins), and backgnd.c sets <span class="mono">ss_results[n] = 0</span> for the 24 channels nothing feeds — every pass.')}
   ${f('The silence-sensor patch.','v100 added <span class="mono">r2=pass r2; if ne jump(pc,3); r1=255; r2=255;</span> to SSensorCalc so DET_TIME 0 means “off” (the counter is reloaded with 255 and can never reach 0). <span class="mono">DEFAULT_DET_TIME SAMPLE_RATE*2 // 1 second</span> is 2 s. The ATmega adds 3 to every threshold so that a sine’s peak dBFS compares with the mean-square detector.')}
   ${f('Dead code in spi.c.','<span class="mono">SPICMD_ALARMS_1TO24</span>: <span class="mono">val&gt;&gt;1;</span> discards its result, so only bit 0 would ever be tested — but the ATmega never sends commands 2 or 3. The parm_map comments are off by one for meters 16–21, and SS_tallies labels two buttons “sw16”.')}
   ${f('Table details.','<span class="mono">rlm24_pk_data2</span> starts with two +20 entries where <span class="mono">rlm24_vu_data2</span> has one, so at index 39 the peak lights both the 0 and +1 LEDs. The bottom VU LED (−40) has 143 entries of 0x1 and stays lit for any signal at all (a pilot light). The scale runs −40…+20 = 60 dB on 42 LEDs; the manual says “Meter Range 52 dB”.')}
   ${f('Hardware labels.','X1 (SHARC CLKIN and the TDM master clock) is “24.578M” on the netlist; it must be 24.576 MHz. RLM24-2V100.qsf assigns <span class="mono">clkcfg0</span> to pin 161, which the board wires to the SHARC’s CLKCFG1 — harmless, the .bdf ties both low. The 2016 RLM2 rear silk swaps INPUT 1 and INPUT 2 compared with the photographed RLM2D.')}
   ${f('Versioning.','<span class="mono">version.h</span> says 0.1 in every build; the WBS listing calls the released code “SHARC V100”. The project is still named rlm24.dpj in the RLM12 build, and SS_tallies.c refers to “RLM24-1#1/#2”.')}</ol>`)
  + card('Assumptions in this simulation',`<ul class="small">
    <li>CCLK 196.608 MHz (PLLM16 ÷ 2), selectable (${inf}). Cycle counts for SampleIRQ, the background pass and refresh() are estimates from the instruction counts (${inf}).</li>
    <li>VUMeterGet’s <span class="mono">fix</span> rounds to nearest (MODE1 TRUNC clear, ${inf}). The per-sample maths is exact; the panel shows it in 1 ms steps.</li>
    <li>Programme material is a synthetic, repeatable mix of two tones, noise and a syllabic envelope; “level” is its peak (${inf}).</li>
    <li>An unplugged input gives zeros on its TDM words (${inf}: the AD1895 behaviour on lost input is not in the archive).</li>
    <li>Meter n sits above pushbutton n, left to right; board 1 (SHARC channels 0–23) is meters 1–12 (${inf}). LED vertical placement on the lens is ${inf}; bar spacing and pitch are from the .pnp.</li>
    <li>ATmega word timing: ${SIM.fmtDur(AVR_WORD)} per word, a 50-word pass every ${AVR_CYCLE*1000} ms (${inf}).</li>
    <li>The RLM2 arcs reuse the RLM24 maths and 42-step scale; the RLM2 is built from SLM-1 boards (${inf} from the SLM-1-3 front panel drawings in RLM2/Ref and the two jumper blocks on its rear).</li>
    <li>Silence that began before the simulated second is carried in a virtual clock (Skip +10 s, and +1 s each time playback wraps).</li></ul>`)
  + card('Sources',`<ul class="small mono">
    <li>#RLM #SERIES/XXX - RLM  - #Master #obsolete/RLM - #OBSOLETE #Archive/software/sharc/{v100,last,nab2005,rlm12d,v100test,rlm24v100test}/</li>
    <li>…/software/ALTERA/V100/RLM24-2V100.bdf, .qsf, tdm_gen.vhd, shift_in_out32.vhd, display_clear.vhd, CS_8416.vhd · …/software/Atmel/RLM24/v101/v101.c</li>
    <li>…/RLM24-2/PCB/rlm24-2ISS2.net · …/RLM24-1/PCB/rlm24-1iss2.net, .pnp, .bom · …/MANUAL/RLM12 RLM24 Manual.pdf · …/RLMCTL/554164 COMMUNICATION PROTOCOL.doc</li>
    <li>RLM24 - #Mechanical #Obsolete/Not in ERP/RLM24-1M3 ISS 1 (DISPLAY LENS).pdf, RLM24-1M4 ISS2 (FRONT PANEL).pdf · RLM24-1M5 ISS 1 ( L&amp;R SIDE PLATE).pdf · Reference/RLM24-FRONT ASSEMBLY.pdf</li>
    <li>RLM2 - #Mechanical #Obsolete/RLM2-M1 ISS 1 (FRONT PANEL).pdf, RLM2-M2 ISS.2 (REAR PANEL).pdf, Silks/RLM2-REAR-SILK(CURVE).pdf, Silks/Pics/RLM2D Front.jpg, RLM2D Rear.jpg</li>
    <li>SILK/RLM24REARCURVE.cdr, RLM12REARcurve.cdr → assets/rlm-rlm24-rear.svg, rlm-rlm12-rear.svg · RLM2-REAR-SILK(CURVE).cdr → assets/rlm-rlm2-rear.svg (Artwork 2026|59, CorelDRAW vectors; the PNG cuts are no longer used)</li>
    <li>Related plugins: rlm24-2.js (ATmega/hardware), slm.js and ams16.js (later users of this SHARC code)</li></ul>`);
}
/* keys on the Simulator / Tutorial / Software tabs: 1–9 select a meter, U unplug, B press its button, K skip 10 s */
bindKeys(ACT, ()=>{ const k={ u:()=>A.plug(D.sel), b:()=>A.press(D.sel), k:()=>A.skip() }; for (let i=1;i<=9;i++) k[String(i)]=()=>{ D.sel=i-1; SIM.refresh(); }; return k; });

SIM.register({
  id:'rlm', product:'RLM', year:2005, family:'Obsolete products', folder:'#RLM #SERIES/XXX - RLM  - #Master #obsolete',
  name:'RLM · RLM12/RLM24 SHARC rack meters and RLM2 ('+Y(2005)+')', duration:1, depth:'Full model', footnotes:FOOT,
  summary:'The RLM24 shows 24 AES stereo inputs on 48 LED bars, each with VU and peak, and flashes a pushbutton when a pair goes silent. This model runs the ADSP-21262 code (sample.c, vumeter.asm, SSensor.asm, backgnd.c) sample by sample for all 48 channels, drives the real 160-bit display frame, and takes its settings over the 31-bit ATmega word link. The front is drawn to scale from the lens drawing and the LED pick-and-place; the rears use the real silks.',
  highlights:['48-channel VU/PPM/silence maths from vumeter.asm and SSensor.asm, per sample','1:8 multiplexed display: rlm24_vu_data tables, 160-bit shift, push-button flash and acknowledge','Four DSP builds: v100, last (cal sign bug), nab2005 demo, rlm12d','ATmega words through get_parms(): bit 0 is lost (odd delays, 1 s = off)','What-ifs for the unused PEAK mode, old time constants and the bug fixes','RLM24, analog RLM-12 and RLM2 rear panels from the real silks'],
  stepUnits:[{label:'1 core tick (mux phase)',period:()=>TICK()},{label:'1 sample (48 kHz)',period:()=>1/FS},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms (mux)'],[1e-4,'100 µs (frames)'],[2e-6,'2 µs (bits)']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
