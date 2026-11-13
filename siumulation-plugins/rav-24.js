/* =====================================================================
   RAV 24 — RAV24 12 × 2 audio/video routing switcher with breakaway (Ward-Beck Systems "Select Series"), obsolete mechanical folder
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model with the real PIC firmware behaviour.

   Sources used:
   - #AV #SERIES/XXX - AVS - #OBSOLETE #Archive/XXX - RAV 24 - #Mechanical #Obsolete/Silks/RAV24-FRONT&REAR-SILK (CURVE).pdf (NOV.10/15) and its (CURVE).CDR → Inkscape → assets/rav-24-front.svg, rav-24-rear.svg (Artwork 2026|59)
   - …/XXX - RAV 24 - #Mechanical #Obsolete/*.dwg (bottom pan ISS 2, front ISS 2, rear ISS 5, spacer strip, BNC cover plate — DWG text only)
   - #AV #SERIES/XXX - AVS - #OBSOLETE #Archive/ (the engineering for this product):
       RAV24/V101/ravv101.asm (Tim Clarke, June 23 2000; PIC16C73A): MAIN, input, debounce, led_ctrl, switch_ctrl, chirp,
         led_output, switch_output (ARM / vid_count / force), recieve_uart, translate_uart (0xCF), audio1_table, video1_table1
       Custom Rav24 Dec 21/RAV24MANCUSTOM.WPD (operating manual + specs), RAV24 PROTOCOL (Preliminary).pdf (Nov 5 2001 ASCII protocol),
       Custom Rav24 Dec 21/working/rav24custom.asm (NOVEMBER 20, 2002, "RAV24 ISSUE 3", P16F76), RAV24 Control Interface Feb 29 04.html
       AVS24.ACF (crosspoint/LED CPLD project; EPM7256SQC208-7 there is only the first DEFAULT_DEVICES candidate), avs24.rpt (fitted device EPM7128SLC84-6, corrected 2026|59 per avs.js), RAV24ISS3.DSN, RAV24ISS4.DSN
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
const PREFIX='rav-24';
const RW=3420, RH=330;                       // 17.100 × 1.650 in at 200 px/in
/* ---------------- firmware timing (ravv101.asm) ---------------- */
const FOSC = 4.9152e6;                       // inferred: SPBRG = 7, BRGH = 0 → Fosc/(64·8) = 9600 baud, the protocol's factory default
const TCY = 4/FOSC;
const ROUT = [ // [label, instruction cycles per pass (counted from the listing; delay dominates)]
  ['re_init',14],['input',46],['debounce',26],['led_ctrl',42],['switch_ctrl',120],['chirp',30],['led_output',330],['switch_output',336],['recieve_uart',9],['translate_uart',12],['transmit_uart',9],['delay',256*31]];
const PASS = ROUT.reduce((a,r)=>a+r[1],0)*TCY;          // ≈ 7.4 ms per main-loop pass
const B_COUNT=3, CHIRP_PERIOD=0x17, CHIRP_DUTY=3, VID_NUM=4;
const NTSC_FIELD = 1001/60000;
/* ---------------- front panel geometry (silk label centres, px) ---------------- */
const BY=112, BS=74;
/* Artwork 2026|59: buttons sit on the .340 SQ. holes of RAV24-FRONT ISS 2 (2.775 … 14.325 in, 200 px/in), which the CorelDRAW
   squares match exactly; the 2015 silk's legends are printed 0.88 in to the left of them (see footnotes). */
const MODEX={audio:555, video:695, av:835}, OUTX=[975,1115], SRCX=[1325,1465,1605,1745,1885,2025,2165,2305,2445,2585,2725,2865];
const SILK='#AV #SERIES/XXX - AVS - #OBSOLETE #Archive/XXX - RAV 24 - #Mechanical #Obsolete/Silks/RAV24-FRONT&REAR-SILK (CURVE).CDR';
const MECH='#AV #SERIES/XXX - AVS - #OBSOLETE #Archive/XXX - RAV 24 - #Mechanical #Obsolete/Not in ERP/';
const AVSF='#AV #SERIES/XXX - AVS - #OBSOLETE #Archive/RAV24/';
const FOOT=[
 {text:'The 2015 front silk prints every button legend (AUDIO VIDEO A/V, SWR OUT 1 2, SOURCE SELECT 1–12) 0.88 in to the left of the .340 in square holes drawn on the same sheet; “AUDIO” lands under the WBS logo. The squares match RAV24-FRONT ISS 2 (2.775 in to 14.325 in), so the legends are what moved.', src:SILK},
 {text:'The same 0.88 in shift is on the rear plate: AUDIO INPUTS 1–12 and AUDIO OUTPUTS 1–2 (+ − G) sit 0.88 in left of their terminal-block cut-outs (8.500–14.825 in and 15.525–16.600 in on RAV24-REAR ISS 5), and the BNC legends sit one BNC pitch (0.725 in) left: VIDEO OUTPUTS “1” is printed over the D-sub, and the right-most BNC column (7.725 in) has no number. The simulator keeps outputs on the first two columns and inputs 1–12 on the next six, as before.', src:SILK},
 {text:'The MODE header bar has only its right half: the left half, which would run into the WBS logo once the legends shifted left, is missing from the GREEN plate.', src:SILK},
 {text:'The 1999 line drawing RAV24LIN.CDR shows the intended layout: legends centred under red-LED buttons right after the logo, matching the drilling, and no “RAV24 BY WARD-BECK SYSTEMS” wordmark (added on the 2015 GREEN plate).', src:AVSF+'RAV24LIN.CDR'},
 {text:'Both RAV24 panel drawings say “SILKSCREEN TO ARTWORK # RAV24-FRONT&REAR-SILK”, but the rear drawing’s title block still reads “AMS4 REAR PANEL / AMS4-REAR” (14 02 98), the template it was copied from.', src:MECH+'RAV24-REAR ISS 5 (PANEL).pdf'},
 {text:'The rear silk numbers the BNC rows 1/2 for VIDEO OUTPUTS and then 1 3 5 7 9 11 over 2 4 6 8 10 12 for VIDEO INPUTS: odd inputs on the top row, even on the bottom.', src:SILK},
 {text:'On the rear plate the caution text “115 VAC, 1/2 A.S.B. DISCONNECT POWER BEFORE SERVICING” is printed straight across the upper Detail B hole, “CONTROL” sits 0.88 in left of the DB9 cut-out it names, and the lower Detail B hole and a small round hole beside the caution have no legend at all.', src:SILK},
 {text:'Four RAV24 silk generations are in the AVS folder: RAV24SLK.CDR and RAV24LIN.CDR (22 Feb 1999), Rav24slkWORK.cdr and Rav24slkWORKCURVE.cdr (15 Nov 2001), then the 2015 RAV24-FRONT&REAR-SILK pair; the RA24 (audio-only) silk RA24SILK.CDR (Dec 1998) predates them all.', src:AVSF+'RAV24SLK.CDR'},
];
/* ---------------- device + firmware state ---------------- */
const D = { power:true, mode:'av', out:0, xpt:[{a:1,v:1},{a:1,v:1}], lock:false, proto:'ascii', addr:'001', baud:9600, ev:null, uart:[], log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const cur = ()=> D.xpt[D.out];
/* timing of the last front-panel press (pass-accurate) */
function pressTiming(t){ const n0=Math.ceil(t/PASS); const det=(n0+B_COUNT-1)*PASS; return { press:t, det, led:det+ (ROUT.slice(0,6).reduce((a,r)=>a+r[1],0)+330)*TCY, arm:det, force:det+VID_NUM*PASS, vsw:Math.ceil(det/NTSC_FIELD)*NTSC_FIELD, release:t+0.12 }; }
/* chirp phase: chirp_count1 counts 23 passes, then 3 passes of the mixed (audio AND video) display */
function chirpOn(t){ const n=Math.floor(t/PASS)%(CHIRP_PERIOD+CHIRP_DUTY); return n>=CHIRP_PERIOD; }
/* LED state of source button s (1..12) at time t: 1 = on, 0.5 = chirp flash, 0 off */
function srcLed(s,t){ if(!D.power) return 0; const x=cur();
  if (D.mode==='audio'){ if (x.a===s) return 1; return (x.v===s && chirpOn(t)) ? 0.8 : 0; }
  if (D.mode==='video'){ if (x.v===s) return 1; return (x.a===s && chirpOn(t)) ? 0.8 : 0; }
  return (x.a===s||x.v===s) ? ((x.a===x.v)||chirpOn(t)?1:1) : 0; }
const S12 = s => '123456789abc'[s-1];
/* ---------------- actions: the firmware path for each ---------------- */
const act=makeActor(D, ()=>`OUT1 A${D.xpt[0].a}/V${D.xpt[0].v} · OUT2 A${D.xpt[1].a}/V${D.xpt[1].v} · mode ${D.mode.toUpperCase()}`);
function scanTrace(tr,group,bit,label){ const t=pressTiming(SIM.t); D.ev={...t,label};
  tr(`input: sel0/sel1/sel2 select group ${group}; PORTA read into input_${group} — bit ${bit} = 0 (${label} pressed)`);
  tr(`debounce: input_${group} equal to bounce_${group} for b_count = ${B_COUNT} passes → input_flag,0 set at ${SIM.fmtT(t.det)} (${SIM.fmtDur(t.det-t.press)} after the press; one pass = ${SIM.fmtDur(PASS)})`); }
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; tr(D.power?'RESET → INIT: SPBRG = 7 (9600 baud), TRIS set-up, then the 93C66 EEPROM is read (nonvol tables) and both outputs are restored (protocol note 9: “Recalls audio and video settings on power up”)':'All tallies dark; the crosspoints hold their last state until the rails fall (inferred)'); }); },
  mode(m){ if(D.lock) return A.locked(); act(`MODE ${({audio:'AUDIO',video:'VIDEO',av:'A/V'})[m]}`, tr=>{ scanTrace(tr,1,({audio:5,video:4,av:3})[m],({audio:'AUDIO',video:'VIDEO',av:'A/V (SLAVE in the code)'})[m]); D.mode=m;
    tr(m==='audio'?'led_ctrl: btfsc input_1,5 → AUDIO path: bcf led_1,7; led_2/led_3 ← audioX_outY registers (only the audio tally shows constantly)':m==='video'?'led_ctrl: check_sw2 → VIDEO path: bcf led_1,6; led registers ← videoX_outY':'led_ctrl: check_sw3 “Checking if SLAVE pressed”: bsf led_1,7; bsf led_1,6; bcf led_1,5 — audio follows video');
    tr('Manual: “Changing the switcher MODE does not affect the source selection.”'); }); },
  out(o){ if(D.lock) return A.locked(); act(`SWR OUT ${o+1}`, tr=>{ scanTrace(tr,1,o?1:2,'OUTPUT'+(o+1)); D.out=o;
    tr(`led_ctrl: check_sw${o?5:4}: store the other output's LEDs in out${o?1:2}_last1..3, restore out${o+1}_last1..3 → the source tallies now show switcher ${o+1}`); }); },
  src(s){ if(D.lock) return A.locked(); act(`SOURCE SELECT ${s} → SWR OUT ${D.out+1} (${D.mode==='av'?'A/V':D.mode.toUpperCase()})`, tr=>{ scanTrace(tr,s<=6?2:3,s<=6?6-s:12-s,`INPUT ${s} (check_sw${s+5})`); const x=cur();
    if (D.mode!=='video'){ x.a=s; tr(`switch_ctrl → do_audio${D.out+1}: erase_aud${D.out+1} clears the old bit (erase${D.out+1}_1..3), audio${D.out?2:1}_table returns the new relay bit for input ${s} → switch_1..5`); }
    if (D.mode!=='audio'){ x.v=s; tr(`video: video${D.out+1}_table1/2 return the mux code for input ${s} (the table pairs 1/3, 2/4: “video1, video3, video2, video4…”) and vid_flag,0 is set`);
      tr(`switch_output: 36 bits shifted (sft_out) to the CPLD, then bsf PORTB,ARM — ARM held for vid_num = ${VID_NUM} passes (${SIM.fmtDur(VID_NUM*PASS)}) so the CPLD can cut in the next vertical interval (manual: “video interval switching”) — then bcf ARM and the “force” strobe on PORTB,6`); }
    else tr('switch_output: 36 bits shifted (sft_out) to the CPLD, then the “force” strobe on PORTB,6 latches the audio relays (manual: “click less audio switching”)');
    tr(`led_output: led_1…led_5 (4 × 8 + 4 bits) shifted to the CPLD LED latch; strobe on PORTB,2. ${x.a!==x.v?'Audio and video now differ: chirp() will flash the other tally for '+CHIRP_DUTY+' passes every '+CHIRP_PERIOD+' passes':''}`); }); },
  locked(){ act('Front panel locked', tr=>tr('Protocol command J1 locked the front panel: button presses are ignored until J0')); },
  serial(txt){ act(`Serial in: ${txt}`, tr=>{ const r=parseAscii(txt,tr); D.uart.unshift({t:SIM.t,dir:'rx',s:txt}); if(r) D.uart.unshift({t:SIM.t+txt.length*10/D.baud,dir:'tx',s:r}); D.uart.length=Math.min(D.uart.length,30); }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); SIM.refresh(); },
};
/* RAV24 ASCII protocol (RAV24 PROTOCOL (Preliminary).pdf, Nov 5 2001) — implemented in the custom build (Custom Rav24 Dec 21) */
const hx = c => { const i='123456789abc'.indexOf(String(c).toLowerCase()); return i<0?null:i+1; };
function parseAscii(txt,tr){ const s=txt.trim(); const ms=s.match(/^#(\d{3})(.+)\$$/i);
  if(!ms){ tr('Rejected: a command must start with # and end with $ (rule 1)'); return null; }
  const addr=ms[1]; if(addr!=='000' && addr!==D.addr){ tr(`Address ${addr} is not ours (${D.addr}) and not 000 → ignored`); return null; }
  tr(`Address ${addr} accepted (${addr==='000'?'all units answer 000':'permanent address'})`);
  let body=ms[2], reply='\\x06 (ACK)', n=0;
  while(body.length && n<3){ const c=body[0].toLowerCase(); n++;
    if(c==='d'||c==='e'){ const o=c==='d'?0:1, a=hx(body[1]), v=hx(body[2]); if(!a||!v){ tr('Bad source digit (1-9, a, b, c)'); return null; }
      D.xpt[o].a=a; D.xpt[o].v=v; tr(`'${c.toUpperCase()}' switch out${o+1}: audio ${a}, video ${v} → crosspoint shift + ARM/force as for a front-panel press`); body=body.slice(3); }
    else if(c==='h'){ reply=`#${S12(D.xpt[0].a)}${S12(D.xpt[0].v)}${S12(D.xpt[1].a)}${S12(D.xpt[1].v)}:${D.addr}:$`; tr("'H' request status → crosspoint report"); body=body.slice(1); }
    else if(c==='i'){ reply=`${D.addr}:`; tr("'I' address status"); body=body.slice(1); }
    else if(c==='j'){ D.lock=body[1]==='1'; tr(`'J' front panel ${D.lock?'LOCKED':'unlocked'}`); body=body.slice(2); }
    else if(c==='k'){ D.baud=body[1]==='1'?19200:9600; tr(`'K' baud → ${D.baud} (stored in the EEPROM)`); body=body.slice(2); }
    else if(c==='f'){ tr(`'F' set extra address ${body.slice(1,4)} (up to 5)`); body=body.slice(4); }
    else if(c==='g'){ tr("'G' clear extra addresses"); body=body.slice(1); }
    else { tr(`Unknown command '${c}'`); return null; } }
  tr(`Reply: ${reply}`); return reply; }
/* ---------------- panels ---------------- */
function frontSVG(){ const t=SIM.t, on=D.power;
  let over='';
  [['audio','AUDIO'],['video','VIDEO'],['av','A/V']].forEach(([k,l])=>{ over+=pbtn(MODEX[k],BY,BS,on&&D.mode===k?1:0,'#ffd34a','md" data-m="'+k,`MODE ${l} — click`,'',k==='av'?'#1b1c1e':'#8d9196'); });
  OUTX.forEach((x,o)=>over+=pbtn(x,BY,BS,on&&D.out===o?1:0,'#ff5a3c','ot" data-o="'+o,`SWR OUT ${o+1} — click`));
  SRCX.forEach((x,i)=>over+=pbtn(x,BY,BS,srcLed(i+1,t),'#43e06a','sr" data-s="'+(i+1),`SOURCE ${i+1} — click`));
  over+=`<g class="pwr" style="cursor:pointer"><title>Power</title><circle cx="3290" cy="260" r="0"/></g>`;
  return layered({w:RW,h:RH,bg:'#111214',layers:[PREFIX+'-front.svg'],over,label:'RAV24 front panel (real silkscreen, Nov 2015)'}); }
function rearSVG(){
  const BX=[531,678,822,966,1110,1254,1401,1548];
  let over=''; BX.forEach((x,i)=>[72,210].forEach((y,r)=>{ const lab = i<2 ? `VIDEO OUTPUT ${i+1} feed ${r?'B':'A'} — switcher ${i+1}, source V${D.xpt[i].v}` : `VIDEO INPUT ${2*(i-2)+1+r}`; over+=bnc(x,y,i<2||((2*(i-2)+1+r)===D.xpt[0].v||(2*(i-2)+1+r)===D.xpt[1].v),'',lab,40); }));
  const ph=(x,y,hot,title)=>`<g><title>${title}</title><rect x="${x-46}" y="${y-24}" width="92" height="48" rx="3" fill="#26a356" stroke="#0e5d2b"/>${[-28,0,28].map(d=>`<rect x="${x+d-8}" y="${y-12}" width="16" height="24" fill="#0e4d25"/>`).join('')}${hot?`<rect x="${x-44}" y="${y-22}" width="88" height="14" fill="#2b5f9e" opacity=".85"/>`:''}</g>`;
  for(let k=1;k<=12;k++){ const x=1752.7+(k-1)*105.4; over+=ph(x,66,D.xpt[0].a===k||D.xpt[1].a===k,`AUDIO INPUT ${k} LEFT (+ − G)`)+ph(x,206,D.xpt[0].a===k||D.xpt[1].a===k,`AUDIO INPUT ${k} RIGHT`); }
  [0,1].forEach(o=>{ const x=3158.75+o*107.5; over+=ph(x,66,true,`AUDIO OUTPUT ${o+1} LEFT (source A${D.xpt[o].a})`)+ph(x,206,true,`AUDIO OUTPUT ${o+1} RIGHT`); });
  /* Artwork 2026|59: DB9 in the Detail C cut-out (1.607 in, 1.126 in on RAV24-REAR ISS 5); the upper Detail B double-D hole (.550, .375)
     takes the mains cord — the silk's caution text is printed across it (inferred: no inlet part is named) */
  over+=`<g><title>CONTROL — RS-232 DB9 in the Detail C cut-out (the silk prints “CONTROL” 0.88 in to its left)</title><rect x="271" y="198" width="100" height="56" rx="10" fill="#9a9da1" stroke="#555"/><rect x="285" y="211" width="72" height="30" rx="6" fill="#111"/></g>`
    +`<g><title>Mains cord entry, Detail B double-D .450 × .512 hole (${'inferred'}) — the caution legend is printed over it</title><circle cx="110" cy="75" r="46" fill="#26282b" stroke="#55595e" stroke-width="3"/><circle cx="110" cy="75" r="22" fill="#111"/></g>`;
  return layered({w:RW,h:RH,bg:'#111214',layers:[PREFIX+'-rear.svg'],over,label:'RAV24 rear panel (real silkscreen)'}); }
function bindPanel(r){ r.querySelectorAll('.md').forEach(g=>g.onclick=()=>A.mode(g.dataset.m)); r.querySelectorAll('.ot').forEach(g=>g.onclick=()=>A.out(+g.dataset.o)); r.querySelectorAll('.sr').forEach(g=>g.onclick=()=>A.src(+g.dataset.s)); }
function consoleHTML(){ return `<div class="small" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px"><label>RS-232 (${D.baud} baud) <input id="cmd" value="#001D35$" style="width:140px" class="mono"></label><button id="snd">Send</button>
  ${['#000H$','#001D3c$','#001E77$','#001J1$','#001J0$'].map(c=>`<button class="qk" data-c="${c}">${c}</button>`).join('')}</div>
  <div class="log small mono" id="ul" style="max-height:110px">${D.uart.map(u=>`<div>${SIM.fmtT(u.t)} ${u.dir==='rx'?'→ unit':'← unit'} ${u.s}</div>`).join('')||'<span class="muted">No serial traffic yet.</span>'}</div>`; }
function bindConsole(r){ const g=s=>r.querySelector(s); if(!g('#snd')) return; g('#snd').onclick=()=>A.serial(g('#cmd').value); r.querySelectorAll('.qk').forEach(b=>b.onclick=()=>A.serial(b.dataset.c)); }
bindKeys('__rav24Active', ()=>({a:()=>A.mode('audio'),v:()=>A.mode('video'),b:()=>A.mode('av'),'[':()=>A.out(0),']':()=>A.out(1),'1':()=>A.src(1),'2':()=>A.src(2),'3':()=>A.src(3),'4':()=>A.src(4),'5':()=>A.src(5),'6':()=>A.src(6),'7':()=>A.src(7),'8':()=>A.src(8),'9':()=>A.src(9),'0':()=>A.src(10),'-':()=>A.src(11),'=':()=>A.src(12)}));
/* ---------------- timeline ---------------- */
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), w=SIM.css('--warn'), e=D.ev;
  const mark=(label,fn,col)=>({label,h:20,draw(c,X,t0,t1,y,h){ if(!e){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('press a button',X(t0)+6,y+14); return; } const r=fn(e); if(!r) return; const [s0,s1]=r; if(s1<t0||s0>t1) return; c.fillStyle=col; c.fillRect(X(Math.max(t0,s0)),y+4,Math.max(2,X(Math.min(t1,s1))-X(Math.max(t0,s0))),h-8); }});
  return [
    {label:`Main-loop passes (${SIM.fmtDur(PASS)})`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,PASS,0,PASS-ROUT[ROUT.length-1][1]*TCY,b,'work (rest = delay)'); }},
    {label:'NTSC fields (house video)', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,NTSC_FIELD,0,0.0007,SIM.css('--ink2'),'V interval'); }},
    mark('Button held (contact)', e=>[e.press,e.release], SIM.css('--ink2')),
    mark('Debounce (b_count = 3)', e=>[e.press,e.det], w),
    mark('led_ctrl / switch_ctrl', e=>[e.det,e.det+PASS*0.3], a),
    mark('PORTB,ARM (video armed)', e=>D.mode!=='audio'?[e.arm,e.force]:null, SIM.css('--bad')),
    mark('“force” strobe PORTB,6', e=>[e.force,e.force+0.0004], a),
    mark('Video cut (next V interval)', e=>D.mode!=='audio'?[e.vsw,e.vsw+0.0006]:null, b),
    boolLane('Chirp display (AND of A and V)', t=>chirpOn(t), SIM.css('--warn')),
    {label:'UART (9600 8N1)', h:22, draw(c,X,t0,t1,y,h){ D.uart.forEach(u=>{ const d=u.s.length*10/D.baud; if(u.t+d<t0||u.t>t1) return; c.fillStyle=u.dir==='rx'?b:a; c.fillRect(X(Math.max(t0,u.t)),y+4,Math.max(2,X(Math.min(t1,u.t+d))-X(Math.max(t0,u.t))),h-8); c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(u.s,X(Math.max(t0,u.t))+3,y+15); }); }},
  ]; }
/* ---------------- views ---------------- */
function xptTable(){ return tbl(['Switcher','Audio source','Video source','Breakaway?'],[0,1].map(o=>[`OUT ${o+1}${o===D.out?' (selected)':''}`,`A ${D.xpt[o].a}`,`V ${D.xpt[o].v}`,D.xpt[o].a!==D.xpt[o].v?'<b>yes</b> — the other tally chirps':'no']),true); }
function viewSim(m){ window.__rav24Active=true;
  m.innerHTML=`${card('Front panel — RAV24-FRONT&REAR-SILK (CURVE).pdf; click MODE, SWR OUT and SOURCE SELECT',`<div id="fp"></div><div class="small muted">Keys: A/V/B = AUDIO/VIDEO/A-V, [ ] = SWR OUT 1/2, 1…9 0 - = = sources 1…12. Flashing source tally = the other (breakaway) source, as the manual describes.</div>`)}
   ${card('Rear panel',`<div id="rp"></div><div class="small muted" style="margin-top:3px">Artwork: GREEN + WHITE front plates and the REAR WHITE plate of ${SIM.src(SILK,'RAV24-FRONT&REAR-SILK (CURVE).CDR')} (NOV.10/15), CorelDRAW vector, registered on one panel; faint lines = cut geometry. Controls sit on the holes of ${SIM.src(MECH+'RAV24-FRONT ISS 2 (PANEL).pdf','RAV24-FRONT ISS 2')} / ${SIM.src(MECH+'RAV24-REAR ISS 5 (PANEL).pdf','RAV24-REAR ISS 5')}; the silk legends print 0.88 in to their left, as on the sheet.</div>`)}
   <div class="grid2">${card('Firmware path of the last action',`<div id="trace" class="log"></div>`)}<div>${card('Crosspoints',`<div id="xp"></div>`)}${card('RS-232 control (ASCII protocol)',`<div id="con"></div>`)}</div></div>
   ${card('Timeline — zoom to 100 ms after a press to see debounce, ARM and the vertical-interval cut',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG();
    m.querySelector('#trace').innerHTML=traceHTML(D,'Press a button: the trace follows ravv101.asm.'); m.querySelector('#xp').innerHTML=xptTable();
    const ce=m.querySelector('#con'); const keep=ce.querySelector('#cmd')?ce.querySelector('#cmd').value:null; ce.innerHTML=consoleHTML(); if(keep) ce.querySelector('#cmd').value=keep; bindConsole(ce);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:210}); };
  SIM.on('time',draw); }
const LESSONS=[
  {title:'Meet the RAV24', body:`<p>From the manual (<span class="mono">RAV24MANCUSTOM.WPD</span>): “a 12 input, 2 output Audio/Video switcher with break away capability … video interval switching, click less audio switching, and an RS232 data port for external control.” MODE picks what the source buttons switch, SWR OUT picks which of the two switchers you are working on.</p>`, check:()=>true, auto:true},
  {title:'1 · Audio follows video', body:`<p>With MODE <b>A/V</b> and SWR OUT <b>1</b>, press SOURCE <b>3</b>. Audio and video of switcher 1 both move to input 3.</p>`, check:()=>D.xpt[0].a===3&&D.xpt[0].v===3, hint:'Press B (A/V), [, then 3.'},
  {title:'2 · Breakaway', body:`<p>Press MODE <b>AUDIO</b>, then SOURCE <b>7</b>. Only the audio moves. Source 7 lights steadily; source 3 (the video) flashes briefly — the firmware's <span class="mono">chirp</span> routine shows the AND of the audio and video registers for ${CHIRP_DUTY} passes every ${CHIRP_PERIOD}.</p>`, check:()=>D.xpt[0].a===7&&D.xpt[0].v===3, hint:'A key, then 7.'},
  {title:'3 · The second switcher', body:`<p>Press SWR OUT <b>2</b>. The tallies now show switcher 2 (still on input 1). Select MODE <b>VIDEO</b> and source <b>12</b>.</p>`, check:()=>D.xpt[1].v===12&&D.xpt[1].a===1, hint:'], V, then =.'},
  {title:'4 · Remote control', body:`<p>Send <span class="mono">#000H$</span> from the RS-232 box: the unit replies with the four crosspoints. Then send <span class="mono">#001D3c$</span> to put switcher 1 on audio 3, video 12.</p>`, check:()=>D.xpt[0].a===3&&D.xpt[0].v===12, hint:'Use the quick buttons in the RS-232 card.'},
  {title:'Done', body:`<p>The <b>Software</b> tab steps through the main loop; <b>Findings</b> lists what the code shows.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__rav24Active=true; tutorialView(m,{title:'Tutorial — operating the RAV24',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG()}<div class="small">${xptTable()}</div><div id="con2">${consoleHTML()}</div>`, bind:r=>{ bindPanel(r); bindConsole(r); }}); }
function viewSecond(m){ window.__rav24Active=true;
  m.innerHTML=`${card('One second inside the RAV24',`<div id="tab"></div>`)}${card('The main-loop pass at the playhead',`<div id="pass"></div>`)}`;
  const draw=()=>{ const n=Math.floor(SIM.t/PASS), ph=(SIM.t%PASS)/TCY; let acc=0, hot=0; ROUT.forEach((r,i)=>{ if(ph>=acc) hot=i; acc+=r[1]; });
    m.querySelector('#tab').innerHTML=tbl(['Event','per second','period','source'],[
      ['Main-loop passes',(1/PASS).toFixed(1),SIM.fmtDur(PASS),'MAIN … call delay; cycles counted from ravv101.asm, Fosc '+inf],
      ['Button scans (3 groups)',(1/PASS).toFixed(1),SIM.fmtDur(PASS),'input: sel0/sel1/sel2'],
      ['Debounce decision','—',SIM.fmtDur(B_COUNT*PASS),'b_count = 3 identical scans'],
      ['Chirp flashes',(1/((CHIRP_PERIOD+CHIRP_DUTY)*PASS)).toFixed(2),SIM.fmtDur((CHIRP_PERIOD+CHIRP_DUTY)*PASS),`chirp_period 0x17, chirp_duty 3 → ${SIM.fmtDur(CHIRP_DUTY*PASS)} on`],
      ['LED shift-outs',(1/PASS).toFixed(1),SIM.fmtDur(36*9*TCY),'36 bits, sft_out (skipped while ARM is high)'],
      ['Video fields (NTSC)',(1/NTSC_FIELD).toFixed(2),SIM.fmtDur(NTSC_FIELD),'the CPLD cuts in the vertical interval while ARM is high'],
      ['UART bytes at 9600 8N1','up to 960',SIM.fmtDur(10/9600),'recieve_uart reads one byte per pass: the 2-byte hardware FIFO covers the 0xCF + info pair']]);
    m.querySelector('#pass').innerHTML=`<p class="small">Pass ${n} · ${(ph*TCY*1e3).toFixed(3)} ms into the pass · running <b class="mono">${ROUT[hot][0]}</b></p>`+loopSVG(ROUT.map(r=>({t:r[0],s:[`${r[1]} cycles`,SIM.fmtDur(r[1]*TCY)]})),hot,'MAIN (ravv101.asm)'); };
  SIM.on('time',draw); }
const BLOCKS={
  fp:{x:15,y:20,w:180,h:90,t:'Front panel',s:['17 lit pushbuttons','3 scan groups'],d:'MODE (AUDIO, VIDEO, A/V), SWR OUT 1/2, SOURCE SELECT 1–12. Read by the PIC through sel0/sel1/sel2 and PORTA.'},
  pic:{x:225,y:20,w:180,h:90,t:'PIC16C73A',s:['ravv101.asm','4.9152 MHz ('+'inferred'+')'],d:'Main loop: input → debounce → led_ctrl → switch_ctrl → chirp → led_output → switch_output → UART.'},
  ee:{x:225,y:140,w:180,h:70,t:'93C66 EEPROM',s:['DI/CLK/CS/DO'],d:'Non-volatile crosspoints and (custom build) addresses and baud rate.'},
  cpld:{x:440,y:20,w:190,h:90,t:'Altera EPM7128S',s:['AVS24.GDF','LED + switch latches'],d:'EPM7128SLC84-6 (avs24.rpt: 90/128 logic cells). Receives 36-bit LED and 36-bit switch words by shift register; ARM/force handshake; vertical-interval video cut.'},
  vid:{x:665,y:20,w:180,h:80,t:'Video crosspoint',s:['12 → 2, 2 feeds each'],d:'75 Ω inputs, 2 back-terminated BNC feeds per switcher (manual).'},
  aud:{x:665,y:130,w:180,h:80,t:'Audio crosspoint',s:['12 stereo → 2','40 kΩ in, 60 Ω out'],d:'Unity gain, +27 dBu max, click-less (manual).'},
  rs:{x:15,y:140,w:180,h:70,t:'RS-232 (DB9)',s:['RX 2, TX 3, GND 5,9'],d:'9600 baud by default. v101: 0xCF + info byte; Dec 2001 custom: ASCII #aaaC…$.'},
};
const WIRES=[['fp','pic','scan'],['pic','cpld','36+36 bits'],['cpld','vid',''],['cpld','aud',''],['pic','ee',''],['rs','pic','UART']];
function viewBlock(m){ window.__rav24Active=false; blockView(m,BLOCKS,WIRES,'pic',[860,230],card('In one sentence',`<p>A PIC scans 17 buttons, keeps four crosspoint registers (audio and video for two switchers), and shifts LED and switch words into an Altera CPLD that drives the audio relays and cuts the video during the vertical interval.</p>`)); }
const SHEETS=[
  {name:'1 · PIC16C73A pin use (from the code)', note:'From the EQU and TRIS set-up in ravv101.asm; the schematic (RAV24ISS3/4.DSN, OrCAD) could not be read here.', svg:()=>
    chip(300,40,220,'PIC16C73A (ravv101.asm)',[['RA0–RA4','button returns (input_1..3)'],['RA5 sel0','scan select'],['RB0 sel1','scan select'],['RB1','button return (bit 5)'],['RB2 strb','LED latch strobe'],['RB3 ARM','video arm'],['RB5 led_clk','shift clock'],['RB6 force','switch latch'],['RB7 sft_dat','shift data']],[['RC0 sel2','scan select'],['RC1 DO','93C66 data out'],['RC2 CS','93C66 select'],['RC3 CLK','93C66 clock'],['RC4 DI','93C66 data in'],['RC5','“BSF PORTC,5” (v101 fix)'],['RC6 TX','RS-232 (via driver)'],['RC7 RX','RS-232']],'OTP, MPASM')
    +txt(40,430,'RC5 is the line the June 23 2000 revision note mentions: it is set in INIT “to allow for serial communication” (inferred: enables the RS-232 driver).',11)},
  {name:'2 · Shift chain to the CPLD', note:'led_output and switch_output each send 4 × 8 + 4 = 36 bits MSB first (sft_out), then strobe.', svg:()=>
    [['led_1','MODE/OUT LEDs'],['led_2','sources'],['led_3','sources'],['led_4',''],['led_5 (4 bits)','']].map((r,i)=>chip(40+i*160,60,130,r[0],[['',r[1]]],[],'')).join('')
    +txt(40,200,'RB7 sft_dat, RB5 led_clk → EPM7128S; RB2 strb latches the LED word.',12)
    +[['switch_1','audio relays'],['switch_2',''],['switch_3',''],['switch_4','rx0/rx1 + video'],['switch_5 (4)','']].map((r,i)=>chip(40+i*160,260,130,r[0],[['',r[1]]],[],'')).join('')
    +txt(40,400,'RB6 “force” latches the switch word; RB3 ARM is held for vid_num = 4 passes before it when vid_flag is set.',12)},
];
function viewSchem(m){ window.__rav24Active=false; schemView(m,SHEETS,'RAV24','Redrawn from the firmware listing (pin assignments) and the manual; the OrCAD schematics RAV24ISS3/ISS4.DSN are binary and are not reproduced.'); }
function viewSoft(m){ window.__rav24Active=true; let hot=null;
  m.innerHTML=`${card('MAIN — ravv101.asm (the running step follows the playhead; click a step)',`<div id="lp"></div><div id="det" class="card small"></div>`)}<div class="grid2">${card('LED registers (1 = off, 0 = on)',`<div id="regs"></div>`)}${card('Protocol map',`<div id="pm"></div>`)}</div>`;
  const DET={re_init:'Re-writes ADCON1/TRIS every pass (the code distrusts its own set-up).',input:'Three scans: sel0/sel1/sel2 pick a group; PORTA plus RB1 give 6 bits each.',debounce:'A new pattern must be seen b_count = 3 times; release also needs 3 clean passes.',led_ctrl:'Decodes the pressed button and rebuilds led_1..led_3 from the audio/video registers of the selected output.',switch_ctrl:'Erases the old crosspoint bit (erase_audX) and ORs in the new one from audio1_table / video tables.',chirp:'Every 23 passes shows audio AND video for 3 passes: the breakaway flash.',led_output:'36 bits to the CPLD unless ARM is high.',switch_output:'36 bits; if vid_flag, set ARM and wait vid_num = 4 passes before “force”.',recieve_uart:'One byte per pass from RCREG; FERR/OERR clear CREN.',translate_uart:'0xCF = address byte; next byte: bits 0–3 source, bit 6 output 2, bit 7 update display; 0x00 = status request.',transmit_uart:'Sends check_aud1/check_aud2 (low nibbles) in a special_loop.',delay:'DELAY1 = 7 inner loops × DELAY2, and DELAY2 is never reloaded in MAIN — it starts at 0, so every call runs 256 outer loops.'};
  const draw=()=>{ const ph=(SIM.t%PASS)/TCY; let acc=0, run=0; ROUT.forEach((r,i)=>{ if(ph>=acc) run=i; acc+=r[1]; }); const h=hot==null?run:hot;
    m.querySelector('#lp').innerHTML=loopSVG(ROUT.map(r=>({t:r[0],s:[r[1]+' cycles']})),h,`Pass ${Math.floor(SIM.t/PASS)} · ${SIM.fmtDur(PASS)} per pass`); m.querySelectorAll('[data-step]').forEach(g=>g.onclick=()=>{ hot=+g.dataset.step; draw(); });
    m.querySelector('#det').innerHTML=`<b class="mono">${ROUT[h][0]}</b>: ${DET[ROUT[h][0]]}`;
    const bits=x=>{ let s=''; for(let k=1;k<=12;k++) s+=(x===k?'0':'1'); return s; }, x=cur();
    m.querySelector('#regs').innerHTML=kvt([['led_1 bits 7/6/5 (AUDIO/VIDEO/A-V)',D.mode==='audio'?'0 1 1':D.mode==='video'?'1 0 1':'1 1 0',1],['led_1 bits 4/3 (OUT1/OUT2)',D.out?'1 0':'0 1',1],['audio sources 1…12',bits(x.a),1],['video sources 1…12',bits(x.v),1],['chirp now',chirpOn(SIM.t)?'mixed display':'normal']]);
    m.querySelector('#pm').innerHTML=tbl(['Firmware','Frame','Meaning'],[['v101 (2000)','0xCF, info','info bits 0–3 source 1–12 (≥ 13 rejected), bit 6 = output 2, bit 7 = update display; 0x00 = status'],['custom (2001–2003)','#aaa D av $','D/E switch out1/out2 (sources 1-9,a,b,c); H status; I addresses; F/G addresses; J lock; K baud'],['web (2004)','HTML form','Video/Audio 1–2 source 1–12 (Rabbit Dynamic C, RAV24V1.c)']],true); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__rav24Active=false;
  m.innerHTML=card('What the RAV24 files show — findings',`<ol>
   <li><b>The A/V button is “SLAVE” in the code.</b> <span class="mono">led_ctrl</span> → <span class="mono">check_sw3</span> “Checking if SLAVE pressed”: audio slaved to video.</li>
   <li><b>The breakaway flash is a routine called chirp.</b> Every 0x17 = 23 passes it shows audio AND video tallies for 3 passes — about ${SIM.fmtDur(CHIRP_DUTY*PASS)} every ${SIM.fmtDur((CHIRP_PERIOD+CHIRP_DUTY)*PASS)}. The manual describes it as “the flashing tally indicates the accompanying video source”.</li>
   <li><b>Video cuts wait four passes.</b> <span class="mono">switch_output</span> raises PORTB,ARM and counts <span class="mono">vid_num</span> = 4 passes (≈ ${SIM.fmtDur(VID_NUM*PASS)}, longer than one field) before the “force” strobe; LED updates are skipped while ARM is high.</li>
   <li><b>The delay is longer than it looks.</b> <span class="mono">DELAY</span> loads DELAY1 = 7 but MAIN never loads DELAY2, which is left at 0 after each call — so every pass waits 256 × 7 inner loops. The comment “DELAY2 = 15 FOR RELAY PULSE(5mS)” does not apply here.</li>
   <li><b>Clock vs comment.</b> The delay comment uses “1/1.53MHZ”, but SPBRG = 7 with BRGH = 0 only gives the documented 9600 baud with a 4.9152 MHz crystal (${inf}). Both cannot be right.</li>
   <li><b>Case-insensitive labels.</b> MAIN calls <span class="mono">delay</span> and jumps to <span class="mono">main</span>, but the labels are <span class="mono">DELAY</span> and <span class="mono">MAIN</span>: the project must be assembled with case sensitivity off.</li>
   <li><b>Video table order.</b> <span class="mono">video1_table1</span> comments run “video1, video3, video2, video4 …” with repeated codes (0xED, 0xEF, 0xED, 0xEF…): the mux wiring pairs inputs 1/3 and 2/4 and a second table finishes the code.</li>
   <li><b>A copy-paste slip in led_ctrl.</b> For output 1 the AUDIO branch does <span class="mono">bsf led_1,3</span> (OUT2 tally off), but the VIDEO branch does <span class="mono">bsf led_1,5</span> — a bit the 0xA7 mask has already set. It is harmless only because bit 3 is already set whenever output 1 is selected.</li>
   <li><b>Three control protocols.</b> v101 uses a two-byte 0xCF frame; the 2001 custom build uses ASCII (#000H$…), rewritten into modules (init, startup, processing, eerw) on a PIC16F76; a 2004 Rabbit web page sets the same four sources. The ASCII spec says RAV24 #1 is serial 57101.</li>
   <li><b>Voltage mismatch.</b> The custom manual says “factory set for 240 V”; the silk says “115 VAC, 1/2 A.S.B.”</li>
   <li><b>Corrected 2026|59:</b> the CPLD is an EPM7128SLC84-6, not an EPM7256S. <span class="mono">avs24.rpt</span> (MAX+plus II) fits the design into EPM7128SLC84-6 with 90/128 logic cells; “EPM7256SQC208-7” is only the first AUTO_DEVICE in the DEFAULT_DEVICES candidate list of <span class="mono">AVS24.ACF</span>. (see avs.js)</li>
   <li><b>Artwork 2026|59: front/rear panels now from</b> ${SIM.src(SILK,'RAV24-FRONT&REAR-SILK (CURVE).CDR')} (NOV.10/15), the CorelDRAW vector of the same sheet the PNG cuts came from. Converting it to vectors and laying it on the drilling showed the legend shift below; the buttons and terminal blocks were moved onto the holes.</li>
   ${FOOT.map(f=>`<li>${f.text} <span class="muted small">— ${SIM.src(f.src)}</span></li>`).join('')}
   <li><b>Mechanical folder.</b> Front ISS 2, rear ISS 5, BNC cover plate and spacer strip sit in “Not in ERP”; two drawings are shared with XTM4 (same chassis).</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Fosc 4.9152 MHz; instruction counts per routine estimated from the listing (${inf}).</li><li>The CPLD applies a video cut at the first NTSC vertical interval after ARM rises (${inf}).</li><li>The ASCII protocol is the custom build’s; the standard v101 unit used 0xCF frames (both shown).</li><li>Button positions are the drilled .340 in squares (RAV24-FRONT ISS 2), not the silk legends, which are printed 0.88 in to the left (Artwork 2026|59; before that the simulator used the legend centres).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>XXX - RAV 24 - #Mechanical #Obsolete/Silks/RAV24-FRONT&amp;REAR-SILK (CURVE).pdf and its .CDR (→ assets/rav-24-front.svg, rav-24-rear.svg, Artwork 2026|59)</li><li>XXX - AVS - #OBSOLETE #Archive/RAV24/V101/ravv101.asm, remv102.asm</li><li>…/Custom Rav24 Dec 21/RAV24MANCUSTOM.WPD, RAV24 PROTOCOL (Preliminary).pdf, working/rav24custom.asm</li><li>…/RAV24 Control Interface Feb 29 04.html, AVS24.ACF</li></ul>`); }
SIM.register({
  id:'rav-24', name:'RAV 24 · RAV24 12 × 2 audio/video switcher with breakaway (2000|33–2015|48)', duration:1, product:'RAV 24', year:2000, family:'Obsolete products', folder:'#AV #SERIES/XXX - AVS - #OBSOLETE #Archive/XXX - RAV 24 - #Mechanical #Obsolete',
  summary:'A 1 RU “Select Series” routing switcher: 12 video + stereo audio inputs, two independent switchers with audio-follow-video or breakaway, lit pushbuttons and RS-232 control. The panel is the 2015 silk; the behaviour follows the PIC16C73A firmware ravv101.asm and the 2001 ASCII protocol.',
  highlights:['Real RAV24 silkscreen with 17 working lit pushbuttons','Breakaway “chirp” tally timing from the firmware constants','Debounce, ARM and vertical-interval video cut on the timeline','ASCII RS-232 console (#000H$ …)','Main loop stepped routine by routine'],
  depth:'Hardware model',
  footnotes:FOOT,
  stepUnits:[{label:'1 main-loop pass',period:()=>PASS},{label:'1 field',period:()=>NTSC_FIELD},{label:'1 ms',period:()=>0.001},{label:'1 UART bit',period:()=>1/9600}],
  zooms:[[1,'1 s'],[0.25,'250 ms (chirp)'],[0.1,'100 ms (a press)'],[0.02,'20 ms'],[PASS,'1 pass'],[0.002,'2 ms']], defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (from code)',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
