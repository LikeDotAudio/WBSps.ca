/* =====================================================================
   DMS-1 — Digital Monitor System, Select Series (Ward-Beck Systems, front panel 1998|31, firmware 2001|34–2011|44,
   DEMUX-4 version 2014|47). Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under "MISC/"):
   - XXX - DMS - #OBSOLETE #Archive/PIC VERSIONS/Dms1v100, Dms1v101, Dms1v102/
       dms1v101.asm (main, eewrite, scan/debounce/closure/wait, translate, audio_on/aes_on/sdi_on, swap, gr1…swap7_8,
       communication_control, pole, scanuart, loss_of_com, processuart, settxdata/re_transmit, txuart, sdi_control,
       aes_control), init42~1.asm (INIT, RAM map, UART set-up SPBRG=7, delay loop "ali"), sdi42.asm (sdimode,
       sdidis1/2/3, no_sdi, no_audio, source_led), aes42.asm (aesmode, check_lock, no_lock), analog42.asm, eerw.asm
   - SA-DEMUX4 - #Master/DEMUX4 - #Engineering/Software/Atmel/V020300-DMS1/demux4.c (processUart, getAudioGroups,
       getSelectedInput "input = RX1; //DMS1-Add", timer0 reply) and the finished demux4.js / xtm4.js plugins
   - XXX - DMS1 - #Master #OBSOLETE/DMS1 - #TESTREPORT/DMS1-V102-15FEB11, -05APR11, -16AUG11, -28APR14.pdf
   - DMS1 - #Mechanical #DA #2016/DMS-1 FRONT ISS 4 (PANEL) .pdf, DMS-1 REAR ISS 4 (PANEL).pdf (hole positions)
   - …/Silks/DMS-1-FRONT-SILK (CURVE).cdr (Inkscape) → assets/dms1-front-green.png, dms1-front-white.png;
     …/Silks/DMS-1-REAR-SILK (CURVE).pdf (tools/silk_extract.py) → assets/dms1-rear-white.png
   - …/Silks/DMS1 Front.jpg, DMS1 Rear (Demux 4).jpg; XXX - DMS - …/DMS1-RearDemux3-1.jpg (plate layouts, LED colours)
   - XXX - DMS - …/DMS1-Functional.cdr (functional diagram), DMS1manu-Demux3.cdr (manual cover with both panels)
   Anything not in those files is marked "inferred" on screen.
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
const P='dms1', PW=3420, PH=330;
const hx = v => (v&255).toString(16).toUpperCase().padStart(2,'0');
const bn = v => (v&255).toString(2).padStart(8,'0');
/* ---------------- timing constants ---------------- */
const FOSC = 4.9152e6, TCY = 4/FOSC;             // SPBRG = 7, BRGH = 0 → 4.9152 MHz / (64·8) = 9600 Bd (init42: "9600 baud")
const PASS_CYC = 132, PASS = PASS_CYC*TCY;        // one main-loop pass ≈ 132 cycles ≈ 107 µs: dms.js cycle-counts 115–182, median 120–144 by mode; 132 = middle of the medians — inferred
const BIT = 1/9600, BYTE = 10*BIT;                // 8N1: start + 8 data + stop
const DELAY_V102 = (4*255*(255*3+5)+20)*TCY;      // v102 "ali" delay loop before main: ≈ 0.64 s
const EE_T = 0.02;                                // eewrite: four eew writes, bit-banged — inferred
const XTM41_DLY = 0.0015;                         // XTM41 answer delay after byte 2 — inferred
const D4_DLY = 34*1024/FOSC;                      // DEMUX-4 timer0: OCR0 = 34, clk/1024 → 7.08 ms (demux4.c initTimer0)
const DMX_DLY = 0.002;                            // DEMUX-3 answer delay — inferred
const D1_DLY = 0.0063, D1_FIRST = 119*4/4.9152e6;  // DEMUX-1 settx comout1: ≈65 passes ≈ 6.3 ms after each command; the first reply after power-up goes on the next pass (demux1.js)
const READY = { xtm41:0.25, D1:0.35, D3:0.6, D4:6.1 }; // power-up until each slave answers; D4 ≈ 5.94 s FPGA config (demux4.js) — others inferred
const BTN = ['AUDIO','AES','SDI','GR1','GR2','GR3','GR4','SWAP'];
const BTN_PIN = ['RA0','RA1','RA2','RA3','RA4','RA5','RC2','RC0'];
const LED_BIT = [0,1,2,3,4,5,7,6];                // PORTB bit for each button's LED (analog42/aes42/sdi42)
const MLEV = [-34,-28,-22,-19,-16,-13,-10,-7,-5,-3,-1,0,1,2,3,6,9,12];  // front silk meter scale
const DMX = { D1:{n:'DEMUX-1 (PIC, 2001–2011)', bncs:['SDI INPUT','SDI OUTPUT','AES 1','AES 2']}, D3:{n:'DEMUX-3 v400 (Apr 2011)', bncs:['SDI INPUT','SDI OUTPUT','AES 1','AES 2']}, D4:{n:'DEMUX-4 V020300-DMS1 (2014)', bncs:['NOT USED','SDI 2 (B)','SDI OUT','AES 1','AES 2']} };

/* ---------------- model state ---------------- */
const BASE0 = () => ({ mode:'sdi', grp:0, swap:false, aesIn:0,
  an:[{on:true,lvl:4},{on:true,lvl:0}], aesX:{on:true,lvl:-20}, aesB:{on:false,lvl:-20},
  sdi:{bnc:0, fmt:'HD', groups:[true,true,false,false], lvl:-20}, vol:0.75, hdst:false });
const D = { cfg:{dmx:'D4', fw:'v102', scn:'run', fault:false}, base:BASE0(), ev:[], log:[], sel:null };
const absT = () => SIM.t;
function addEv(e){ D.ev = D.ev.filter(x=>!(x.t>e.t-1e-9 && x.k===e.k && x.k!=='btn')); D.ev.push(e); D.ev.sort((a,b)=>a.t-b.t); KEY=''; }
/* world state (cables, sources) at time t: base + events */
function world(t){ const w = JSON.parse(JSON.stringify(D.base)); for (const e of D.ev){ if (e.t>t) break;
    if (e.k==='cable') w.sdi.bnc=e.v; else if (e.k==='an') w.an[e.i].on=e.v; else if (e.k==='aes') w[e.w].on=e.v; else if (e.k==='fmt') w.sdi.fmt=e.v; else if (e.k==='grp') w.sdi.groups=e.v.slice(); else if (e.k==='vol') w.vol=e.v; else if (e.k==='hdst') w.hdst=e.v; }
  return w; }
function btnDown(t){ let s=0; for (const e of D.ev){ if (e.k==='btn' && t>=e.t && t<e.t+e.dur) s|=1<<e.b; } return s; }

/* ---------------- the firmware, ported routine by routine (DMS1V10x) ---------------- */
let KEY='', SIMR=null;
const REGS = ['flag0','txflags','sources1','sources2','sourced','sourcea','disctl','uart0','portb','polecount0','polecount1','polecount2','lockflash2','bounce','read','lock','comout2','comout3','scan0','bcount'];
function initRegs(w, boot){
  const R={}; REGS.forEach(k=>R[k]=0); Object.assign(R,{pscan0:0, press_flag:0, tx0:0, tx1:0, lockflash0:0, lockflash1:5, lockflash3:5, lockflash4:0, bcount:6, bcount1:6, rem2:0, rem4:75, alvl1:64, dlvl1:40, slvl1:40, polecount1:10, polecount2:120, comout3:230});
  R.sourced=0x20; R.sources1=0x40; R.sources2=1; R.sourcea=0x80; R.flag0=4;           // INIT: analog on power-up, addresses 01 / 10, flag0,2 = new data
  // EEPROM restore ("aaaa" first-time marker at address 10): the last saved mode comes back
  if (w.mode==='aes'){ R.sourcea=0; R.sourced=0xA1|(w.aesIn?16:0); }
  else if (w.mode==='sdi'){ R.sourcea=0; const gb=[[0,1],[0,2],[2,4],[2,8],[4,16],[4,32],[6,64],[6,128]][w.grp*2+(w.swap?1:0)]; R.sources1=0xC0|0x10|gb[0]|(w.swap?1:0); R.sources2=gb[1]; }
  else R.sourcea=0x81;
  R.txflags = 1|64; R.sources1 &= ~32;                                                // nomatch: bsf txflags,0 / ,6; bcf sources1,5
  if (!boot){ R.polecount1=2; R.txflags=0; R.flag0=4; }                                // already running: first poll soon (phase inferred)
  return R; }
function simulate(){
  const key=JSON.stringify([D.cfg,D.base,D.ev]); if (key===KEY && SIMR) return SIMR; KEY=key;
  const cfg=D.cfg, boot=cfg.scn==='boot', fw=cfg.fw, w0=world(0);
  const t0 = boot ? (fw==='v102'? DELAY_V102 : 0) + 0.005 : 0;                       // INIT + EEPROM reads ≈ 5 ms (inferred)
  const R = initRegs(w0, boot);
  const out = { t0, frames:[], leds:[{t:0,v:boot?0:-1}], closures:[], aesSel:[], xtm:[], dmx:[], snaps:[], passT:[], eeAt:null, notes:[] };
  const N = Math.floor((1-t0)/PASS)+1; const SN=new Uint8Array(N*REGS.length);
  // slaves
  const X = { mode:null, aesIn:0, swap:0, t:-1 };
  const M = { group:null, swap:0, stale: cfg.fault && cfg.dmx==='D4', t:-1, probed:false, nrep: boot?0:1 };
  { // state of the slaves at t = 0 in the running scenario
    if (!boot){ const m=w0.mode; X.mode = m==='analog'?0:m==='aes'?1:2; X.aesIn=w0.aesIn; X.swap=w0.swap?1:0; M.group=w0.grp; X.t=0; M.t=0; out.xtm.push({t:0,mode:X.mode,aesIn:X.aesIn,swap:X.swap}); out.dmx.push({t:0,group:M.group,stale:M.stale}); }
  }
  let tsrFree=0, pending=null, frame=null, lastPortb=-1, lastAes=-1;
  const inc=k=>R[k]=(R[k]+1)&255, dec=k=>R[k]=(R[k]-1)&255;
  const lockedOn = (w)=>{ if (cfg.dmx==='D4') return w.sdi.bnc===0; return w.sdi.bnc!==null && w.sdi.bnc!==undefined && w.sdi.bnc===0; };   // D4: input = RX1 (BNC1) forced; D1/D3: the single SDI INPUT
  for (let n=0; n<N; n++){
    const t = t0 + n*PASS, w = world(t);
    /* ---- scan: buttons are active low (btfss porta,x → bsf scan0,x) ---- */
    R.scan0 = btnDown(t);
    // debounce / closure / wait
    if (R.flag0&2){ if (R.scan0) R.bounce=0; inc('bounce'); if (R.bounce&128){ R.flag0&=~2; R.press_flag|=4; R.bounce=0; } }
    else if (R.scan0!==R.pscan0){ R.bounce=0; R.pscan0=R.scan0; }
    else if (R.scan0){ inc('bounce'); if (R.bounce&64){ R.flag0|=3; R.press_flag&=~4; R.rem2=0; R.rem4=75; R.txflags|=1; R.bounce=0; R.pscan0=R.scan0; out.closures.push({t,scan:R.scan0}); } }
    /* ---- translate ---- */
    if (R.flag0&1){ R.flag0&=~1; R.flag0|=4; const s=R.scan0||R.pscan0;
      const lf=(a)=>{ R.lockflash1=5; R.lockflash2&=~1; R.lockflash0=0; if(a){ R.lockflash3=5; R.lockflash2&=~6; } };
      const grp=(s2,b,sw)=>{ R.sources2=s2; R.sources1=(R.sources1&~7)|b; R.flag0|=128; R.lockflash1=5; R.lockflash2&=~2; R.lockflash0=0; R.lockflash3=5; R.lockflash2&=~4; };
      if (s&1){ R.sourcea|=128; R.sourced&=~128; R.sources1&=~128; lf(false); }
      else if (s&2){ R.sourcea&=~128; R.sourced|=128; R.sources1&=~128; lf(true); }
      else if (s&4){ R.sourcea&=~128; R.sourced&=~128; R.sources1|=128|16; lf(true); }
      else if (R.sources1&128){
        if (s&8) grp(1,0); else if (s&16) grp(4,2); else if (s&32) grp(16,4); else if (s&64) grp(64,6);
        else if (s&128){ const s2=R.sources2; if (s2&1) grp(2,1); else if (s2&2) grp(1,0); else if (s2&4) grp(8,3); else if (s2&8) grp(4,2); else if (s2&16) grp(32,5); else if (s2&32) grp(16,4); else if (s2&64) grp(128,7); else if (s2&128) grp(64,6); } } }
    /* ---- analogmode ---- */
    if ((R.sourcea&128) && (R.flag0&4)){ R.flag0&=~4; R.portb=1; R.sourcea=(R.sourcea|1)&~6; }
    /* ---- aesmode ---- */
    if (R.sourced&128){ let led=false;
      if (R.flag0&4){ R.flag0&=~4; led=true; }
      else { let go=true;
        if (R.read&32){ R.read&=~32; R.lock|=128;
          if (R.read&2){ dec('bcount'); if (R.bcount){ go=false; } else { R.bcount=R.bcount1=6; R.sourced^=16; R.lock|=1; } }
          else if (R.lock&1){ dec('bcount1'); if (R.bcount1){ go=false; } else { R.bcount1=R.bcount=6; R.lock&=~129; } }
          else { R.bcount=R.bcount1=6; R.lock&=~128; } }
        if (go){ if (!(R.disctl&1)) led=true; else { dec('lockflash0'); if (!R.lockflash0){ dec('lockflash1'); if (!R.lockflash1){ R.lockflash1=5; R.lockflash2^=1; } } if (R.lockflash2&1) R.portb&=~2; else led=true; } } }
      if (led){ R.portb=2; R.sourced=(R.sourced|1)&~6; } }
    /* ---- sdimode ---- */
    if ((R.sources1&128) && !(R.sources1&32)){ let path='out';
      if (R.flag0&4){ R.flag0&=~4; if (R.flag0&128) path='src'; else { R.portb=4; } }
      if (path==='out'){ if (R.disctl&2){ dec('lockflash4'); if (!R.lockflash4){ dec('lockflash3'); if (!R.lockflash3){ R.lockflash3=5; R.lockflash2^=4; R.lockflash2&=~2; } } path='d1'; }
        else if (R.disctl&1){ dec('lockflash0'); if (!R.lockflash0){ dec('lockflash1'); if (!R.lockflash1){ R.lockflash1=5; R.lockflash2^=2; R.lockflash2&=~4; } } path='d1'; }
        else path='src';
        if (path==='d1'){ if (R.lockflash2&4){ R.portb&=~4; if (fw==='v102') R.portb&=~0xF8; path='x'; } else if (R.lockflash2&2){ R.portb&=~0xF8; path='x'; } else path='src'; } }
      if (path==='src'){ R.portb|=4; R.flag0&=~128; const s2=R.sources2, g=s2&3?3:s2&12?4:s2&48?5:s2&192?7:-1, sw=!!(s2&0xAA);
        if (g>=0){ R.portb=(R.portb&~0xF8)|(1<<g)|(sw?64:0); } } }
    /* ---- communication_control (v101+) ---- */
    if (fw!=='v100' && (R.txflags&1)){ dec('polecount2'); if (!R.polecount2){ R.polecount2=150; R.txflags|=64; } }
    /* ---- pole ---- */
    if (!(R.txflags&8) && !(R.txflags&16)){ dec('polecount0'); if (!R.polecount0){ dec('polecount1'); if (!R.polecount1){ R.polecount1=10; R.txflags|=1; if (R.sourced&128){ if (R.disctl&1) R.read|=2; else R.read&=~2; } } } }
    /* ---- scanuart ---- */
    if ((R.txflags&16) && pending && t>=pending.t){ R.uart0=pending.b; R.txflags&=~16; R.read|=64; R.comout3=fw==='v100'?250:230; R.comout2=0; if (frame) frame.reply={t:pending.t,b:pending.b,who:pending.who}; pending=null; }
    /* ---- loss_of_com ---- */
    if (R.txflags&16){ inc('comout2'); if (!R.comout2){ inc('comout3'); if (!R.comout3){ R.comout3=fw==='v100'?250:230; R.txflags|=128; if (frame) frame.timeout=t; pending=null; } } }
    /* ---- processuart ---- */
    if (!(R.sources1&128)){ R.disctl = (R.disctl&~1)|(R.uart0&1); }
    else if ((R.read&64) && (R.sources1&32)){ R.disctl = (R.disctl&~3)|(R.uart0&3); }
    /* ---- settxdata / re_transmit ---- */
    let go = !!(R.txflags&128);
    if (!go && !(R.txflags&8) && !(R.txflags&16) && (R.txflags&(fw==='v100'?1:64))) go=true;
    if (go){ R.polecount1=10; let lv=R.slvl1; if (R.sourcea&128) lv=R.alvl1; if (R.sourced&128) lv=R.dlvl1; R.tx1=lv&127;
      if (R.txflags&128) R.sources1&=~32;
      let a=R.sources1; if (R.sourcea&128) a=R.sourcea; if (R.sourced&128) a=R.sourced; R.tx0=a|128; R.txflags=0b00001110; }
    /* ---- txuart ---- */
    if ((R.txflags&8) && t>=tsrFree){
      if (R.txflags&2){ R.txflags&=~2; tsrFree=t+BYTE; frame={t, tx0:R.tx0, tx1:R.tx1, addr:(R.tx0>>5)&3}; out.frames.push(frame); }
      else if (R.txflags&4){ R.txflags&=~4; tsrFree=t+BYTE; frame.t1=t; }
      else { R.txflags&=~8; R.txflags|=16; frame.tEnd=t;
        const a=frame.addr, ws=world(t);
        if (a<3){ if (t>=READY.xtm41 || !boot){ X.mode=a; if (a===1) X.aesIn=(frame.tx0>>4)&1; if (a===2) X.swap=frame.tx0&1; X.t=t+BYTE; out.xtm.push({t:X.t,mode:X.mode,aesIn:X.aesIn,swap:X.swap});
            const sig = a===1 ? (X.aesIn? ws.aesB.on : ws.aesX.on) : true;
            pending={t:t+XTM41_DLY+BYTE, b: a===1? (sig?0:1) : 0, who:'XTM41'}; } }
        else if (t>=READY[cfg.dmx] || !boot){ const g=(frame.tx0>>1)&3; if (M.group!==g){ M.group=g; M.stale=false; } M.swap=frame.tx0&1; out.dmx.push({t:t+BYTE, group:M.group, stale:M.stale});
          const lk = lockedOn(ws); let b = lk? 0:2; if (cfg.dmx==='D3' && lk && !ws.sdi.groups[g]) b|=1;            // DEMUX-4 (V020300) never sets bit 0
          if (cfg.dmx==='D1'){ if (frame.tx0&8) M.probed=true;                   // DEMUX-1: bit 3 → sdi_check → tx0 = 1110 0000 (the DMS1 never sets bit 3, hp)
            b = (M.probed?0xE0:0) | (lk?0:2) | ((lk && ws.sdi.groups[g])?0:1); }   // readgs9023: bit 0 = no audio lock (also with no carrier)
          const dly = cfg.dmx==='D4'?D4_DLY : cfg.dmx==='D1'? (M.nrep?D1_DLY:D1_FIRST) : DMX_DLY; M.nrep++;
          pending={t:t+dly+BYTE, b, who:cfg.dmx==='D4'?'DEMUX-4':cfg.dmx==='D3'?'DEMUX-3':'DEMUX-1'}; } } }
    /* ---- aes_control / sdi_control ---- */
    if ((R.sourced&128) && (R.read&64)){ R.read&=~64; R.read|=32; if (R.lock&128){ R.polecount1=1; R.polecount0=100; } }
    if ((R.sources1&128) && (R.read&64)){ R.read&=~64; R.sources1^=32; }
    /* ---- eewrite ---- */
    if (R.press_flag&4){ inc('rem2'); if (!R.rem2){ inc('rem4'); if (!R.rem4){ R.press_flag&=~4; out.eeAt=t; R.rem2=0; R.rem4=75; } } }
    /* ---- record ---- */
    if (R.portb!==lastPortb){ out.leds.push({t,v:R.portb}); lastPortb=R.portb; }
    const ai=(R.sourced>>4)&1; if (ai!==lastAes){ out.aesSel.push({t,v:ai}); lastAes=ai; }
    REGS.forEach((k,j)=>SN[n*REGS.length+j]=R[k]);
  }
  out.N=N; out.SN=SN; out.eeLeft = (R.press_flag&4)? ((255-R.rem4)*256+(256-R.rem2))*PASS : null;
  out.final={ sources1:R.sources1, sources2:R.sources2, sourced:R.sourced, sourcea:R.sourcea };
  // monitored audio + meter (1 ms steps)
  const mon=[], met=[[],[]]; let mL=-60, mR=-60;
  const xAt = t=>{ let s=null; for (const x of out.xtm){ if (x.t<=t) s=x; else break; } return s; };
  const dAt = t=>{ let s=null; for (const x of out.dmx){ if (x.t<=t) s=x; else break; } return s; };
  for (let i=0;i<=1000;i++){ const t=i/1000, ws=world(t), x=xAt(t), dm=dAt(t); let L=-Infinity, Rr=-Infinity, what='—';
    if (x){ if (x.mode===0){ L=ws.an[0].on? ws.an[0].lvl-4 : -Infinity; Rr=ws.an[1].on? ws.an[1].lvl-4 : -Infinity; what='ANALOG INPUT CH A / CH B'; }
      else if (x.mode===1){ const s=x.aesIn? ws.aesB : ws.aesX; L=Rr= s.on? s.lvl+20 : -Infinity; what='AES INPUT '+(x.aesIn?'75 Ω BNC':'110 Ω XLR'); }
      else { const g = dm? dm.group : null, ok = g!==null && lockedOn(ws) && ws.sdi.groups[g] && !(dm&&dm.stale) && (cfg.dmx!=='D4' || ws.sdi.fmt==='HD' || !D.cfg.fault || !(dm&&dm.stale));
        L=Rr= ok? ws.sdi.lvl+20 : -Infinity; what = g===null? 'SDI (no group yet)' : `SDI group ${g+1} ch ${x.swap?'3/4':'1/2'}`; } }
    mon.push({L,R:Rr,what});
    const step=(m,v)=>{ v = v>-60? v : -60; return v>m ? m+(v-m)*0.85 : Math.max(v, m-0.0133*1000*0.001*1); };   // fast attack, 13.3 dB/s fall (inferred)
    mL=step(mL,L); mR=step(mR,Rr); met[0].push(mL); met[1].push(mR); }
  out.mon=mon; out.met=met; out.xAt=xAt; out.dAt=dAt;
  SIMR=out; return out; }
const S = () => simulate();
function ledsAt(t){ const L=S().leds; let v=0; for (const e of L){ if (e.t<=t) v=e.v; else break; } return v<0? lastSteadyLeds() : v; }
function lastSteadyLeds(){ const f=S().final; return 0; }
function passAt(t){ const s=S(); const n=Math.floor((t-s.t0)/PASS); return n<0||n>=s.N? null : n; }
function regAt(t){ const s=S(), n=passAt(t); if (n===null) return null; const o={}; REGS.forEach((k,j)=>o[k]=s.SN[n*REGS.length+j]); return o; }
function frameAt(t){ const F=S().frames; let f=null; for (const x of F){ if (x.t<=t) f=x; else break; } return f; }
const meterAt = (ch,t)=> S().met[ch][Math.max(0,Math.min(1000,Math.round(t*1000)))];
const monAt = t => S().mon[Math.max(0,Math.min(1000,Math.round(t*1000)))];
const volDb = v => v<=0.004? -Infinity : 40*Math.log10(v);
const ADDR = ['00 analog (XTM41)','01 AES (XTM41)','10 SDI (XTM41)','11 DEMUX board'];

/* ---------------- actions ---------------- */
const act = makeActor(D, ()=>{ const r=regAt(absT()); return r? `sources1=0x${hx(r.sources1)} sources2=0x${hx(r.sources2)} PORTB=${bn(r.portb)}` : ''; });
const A = {
  btn(b){ act(`Press ${BTN[b]}`, tr=>{ const t=absT(); addEv({t, k:'btn', b, dur:0.08});
    tr(`${BTN[b]} pulls ${BTN_PIN[b]} low → scan: btfss → bsf scan0,${b}`);
    tr(`debounce/closure: scan0 must equal pscan0 for 64 passes (bounce,6) ≈ ${(64*PASS*1000).toFixed(1)} ms → bsf flag0,0 (pressed), flag0,1 (wait for release), txflags,0`);
    tr(b<3? `translate → ${['audio_on','aes_on','sdi_on'][b]}: set the mode bit 7 in ${['sourcea','sourced','sources1 (+bit 4)'][b]}, clear the others; lockflash timers reset` : b<7? `translate → gr${b-2} (only if sources1,7 = SDI mode): sources2 = one-hot, sources1 bits 2..0 = group code, flag0,7` : 'translate → swap: walks sources2 between grN and swapN (ch 1/2 ↔ 3/4); sources1,0 = swap bit');
    tr(`communication_control: polecount2 counts 150 passes ≈ ${(150*PASS*1000).toFixed(0)} ms, then txflags,6 → settxdata → txuart sends tx0, tx1 at 9600 Bd`);
    tr(`Release: 128 quiet passes (bounce,7) → press_flag,2 → eewrite saves the mode after rem2/rem4 count ${(181*256*PASS).toFixed(1)} s`); }); },
  cable(v){ act(v===null?'Unplug the SDI cable':`Plug SDI into plate BNC ${v+1} (“${DMX[D.cfg.dmx].bncs[v]}”)`, tr=>{ addEv({t:absT(), k:'cable', v});
    if (D.cfg.dmx==='D4') tr('DEMUX-4 V020300-DMS1 getSelectedInput(): “input = RX1; //DMS1-Add” — only BNC1 is ever used, whatever the host sends in bit 4');
    tr('The DMS1 learns the result only at the next DEMUX-addressed poll (reply bit 1 = no carrier → sdidis3 flashes the SDI LED)'); }); },
  src(k,i,v){ act(`${k==='an'?'Analog CH '+'AB'[i]:k==='aesX'?'AES XLR':'AES BNC'} ${v?'connected':'removed'}`, tr=>{ if (k==='an') addEv({t:absT(),k:'an',i,v}); else addEv({t:absT(),k:'aes',w:k,v});
    if (k!=='an') tr('XTM41 reports AES lock in reply bit 0; aesmode/check_lock counts 6 unlocked replies (bcount) and then toggles sourced,4 → the other AES input (auto search)'); }); },
  grps(g){ act(`SDI source: group ${g+1} ${D.base.sdi.groups[g]?'removed':'added'}`, tr=>{ const w=world(absT()); const v=w.sdi.groups.slice(); v[g]=!v[g]; addEv({t:absT(),k:'grp',v}); tr(D.cfg.dmx==='D4'?'DEMUX-4: the reply never reports missing audio (the AMS4-Add block is commented out), so the group LEDs cannot flash':'DEMUX reply bit 0 = no audio in the selected group → sdidis2 flashes the group LEDs'); }); },
  vol(dir){ act(`Turn VOLUME ${dir>0?'CW':'CCW'}`, tr=>{ const w=world(absT()); const v=clamp(+(w.vol+dir*0.05).toFixed(3),0,1); addEv({t:absT(),k:'vol',v}); tr(`Dual volume pot after SOURCE SELECT (functional drawing): monitor outputs and headset ${isFinite(volDb(v))?fdb(volDb(v))+' dB':'OFF'}; the LED meter is before it and does not move`); }); },
  hdst(){ act('Headset '+(world(absT()).hdst?'out':'in'), tr=>{ addEv({t:absT(),k:'hdst',v:!world(absT()).hdst}); tr('HEADSET jack in parallel with the monitor amplifiers (functional drawing)'); }); },
  cfg(k,v,l){ act(l, tr=>{ D.cfg[k]=v; D.ev=[]; KEY=''; tr(k==='fw'? (v==='v102'?'v102: 0.64 s “ali” delay before main, no_sdi falls through to no_audio':v==='v101'?'v101: communication_control added (150-pass gap), comout3 = 230':'v100 (PIC16C73B OTP): transmits as soon as txflags,0 is set — no communication_control') : k==='dmx'? DMX[v].n : k==='scn'? (v==='boot'?'Timeline starts at power-on':'Timeline starts with the unit already running') : 'Fault model '+(v?'on':'off')); }); },
  base(k,v,l){ act(l, tr=>{ D.base[k]=v; D.ev=[]; KEY=''; tr('Starting state changed (EEPROM-restored mode)'); }); },
  reset(){ D.cfg={dmx:'D4', fw:'v102', scn:'run', fault:false}; D.base=BASE0(); D.ev=[]; D.log=[]; KEY=''; SIM.refresh(); },
};

/* ---------------- panels ---------------- */
const BX=[1316,1516,1716,1866,2016,2166,2316,2466];          // DMS-1 FRONT ISS 4: 8 cut-outs .492 × .728 at these x (in) × 200
function panelSVG(side, inner){ const layers = side==='front'? ['front-green','front-white'] : ['rear-white'];
  return `<svg viewBox="0 0 ${PW} ${PH}" style="width:100%;max-width:1100px;display:block;border-radius:6px" role="img" aria-label="DMS-1 ${side} panel">
   <defs><filter id="glowfront" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="${PW}" height="${PH}" rx="8" fill="var(--dev)"/>${inner.under||''}${layers.map(l=>`<image href="${ASSET}${P}-${l}.png" width="${PW}" height="${PH}"/>`).join('')}${inner.over||''}</svg>`; }
function frontSVG(t){ const pb=ledsAt(t), w=world(t); let over='';
  [0,1].forEach(ch=>{ const m=meterAt(ch,t); MLEV.forEach((lv,k)=>{ const on=m>=lv-0.01, col=lv>=6?'#ff3b2f':lv>=0?'#ffd23a':'#9cff4a'; over+=led(339+32*k, ch?185:145, on, col, 11); }); });
  BX.forEach((x,b)=>{ const on=!!(pb&(1<<LED_BIT[b])), dn=!!(btnDown(t)&(1<<b));
    over+=`<g class="db" data-b="${b}" style="cursor:pointer"><title>${BTN[b]} (${BTN_PIN[b]}; LED on RB${LED_BIT[b]}) — click to press at the playhead</title><rect x="${x-49}" y="${92+(dn?4:0)}" width="98" height="146" rx="6" fill="#0d0e0f" stroke="#3a3d40" stroke-width="3"/>
      <rect x="${x-40}" y="${100+(dn?4:0)}" width="80" height="130" rx="4" fill="#17191b"/><circle cx="${x}" cy="${118+(dn?4:0)}" r="9" fill="${on?'#ff3324':'#3a1412'}" ${on?'filter="url(#glowfront)"':''}/></g>`; });
  const v=w.vol, a=(-150+300*v)*Math.PI/180;
  over+=`<g class="vol" style="cursor:pointer"><title>VOLUME — click right/left half or scroll</title><circle cx="2992" cy="165" r="56" fill="transparent"/><circle cx="2992" cy="165" r="40" fill="#1f8f4a" stroke="#0b0c0d" stroke-width="4"/><line x1="2992" y1="165" x2="${2992+Math.sin(a)*38}" y2="${165-Math.cos(a)*38}" stroke="#f2f2ee" stroke-width="7" stroke-linecap="round"/></g>`;
  over+=`<g class="hd" style="cursor:pointer"><title>HEADSET — click to ${w.hdst?'unplug':'plug in'}</title><circle cx="3220" cy="165" r="48" fill="#0a0b0c" stroke="#55595c" stroke-width="5"/><circle cx="3220" cy="165" r="24" fill="#000"/>${w.hdst?'<circle cx="3220" cy="165" r="36" fill="#2b5f9e"/>':''}</g>`;
  return panelSVG('front',{over}); }
function rearSVG(t){ const w=world(t), dm=D.cfg.dmx; let under=iec(310,41,526,289)+screw(120,165);
  const X4=[1278,1432,1586,1735,1855], X3=[1393,1539,1695,1834];
  under+=`<rect x="1150" y="8" width="900" height="300" rx="6" fill="#141517" stroke="#2c2f33" stroke-width="3"/>`;
  let over='';
  const xs = dm==='D4'? X4 : X3;
  xs.forEach((x,i)=>{ const isIn = dm==='D4'? i<2 : i===0, plugged = isIn && w.sdi.bnc===i;
    over+=bnc(x,86,plugged, isIn?'sb':'', `${DMX[dm].bncs[i]}${isIn?' — click to plug/unplug the SDI source here':''}`, 44).replace('<g class="sb"',`<g class="sb" data-i="${i}"`);
    over+=`<text x="${x}" y="${dm==='D4'?160:158}" text-anchor="middle" font-size="22" fill="#e8e8e4" font-family="Arial">${DMX[dm].bncs[i].replace('SDI INPUT','INPUT').replace('SDI OUTPUT','OUTPUT').replace('AES ','')}</text>`; });
  over+=`<text x="${(xs[dm==='D4'?1:0]+xs[dm==='D4'?2:1])/2}" y="232" text-anchor="middle" font-size="22" fill="#e8e8e4" font-family="Arial">SDI</text><text x="${(xs[dm==='D4'?3:2]+xs[dm==='D4'?4:3])/2}" y="232" text-anchor="middle" font-size="20" fill="#e8e8e4" font-family="Arial">DISEMBEDDED AES OUTPUTS</text>`;
  over+=bnc(800,186,w.aesB.on,'ab','AES INPUT 75 Ω BNC — click to connect / remove the source',44)+xlr(1052,186,false,w.aesX.on,'ax','AES INPUT 110 Ω XLR — click to connect / remove');
  over+=xlr(2112,186,true,true,'','MONITOR OUTPUT CH A')+xlr(2392,186,true,true,'','MONITOR OUTPUT CH B')+xlr(2692,186,false,w.an[0].on,'a0','ANALOG INPUT CH A — click')+xlr(3092,186,false,w.an[1].on,'a1','ANALOG INPUT CH B — click');
  return panelSVG('rear',{under,over}); }
function bindPanel(root){
  root.querySelectorAll('.db').forEach(g=>g.onclick=()=>A.btn(+g.dataset.b));
  bindTrim(root,'vol',d=>A.vol(d)); root.querySelectorAll('.hd').forEach(g=>g.onclick=()=>A.hdst());
  root.querySelectorAll('.sb').forEach(g=>g.onclick=()=>{ const i=+g.dataset.i; A.cable(world(absT()).sdi.bnc===i? null : i); });
  root.querySelectorAll('.ab').forEach(g=>g.onclick=()=>A.src('aesB',0,!world(absT()).aesB.on)); root.querySelectorAll('.ax').forEach(g=>g.onclick=()=>A.src('aesX',0,!world(absT()).aesX.on));
  root.querySelectorAll('.a0').forEach(g=>g.onclick=()=>A.src('an',0,!world(absT()).an[0].on)); root.querySelectorAll('.a1').forEach(g=>g.onclick=()=>A.src('an',1,!world(absT()).an[1].on)); }
function controlsHTML(){ const c=D.cfg, b=D.base, w=world(absT());
  const sel=(id,opts,cur)=>`<select id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;align-items:center">
   <label>DEMUX board ${sel('c_dmx',Object.keys(DMX).map(k=>[k,DMX[k].n]),c.dmx)}</label><label>Front firmware ${sel('c_fw',[['v100','DMS1V100 (2001)'],['v101','DMS1V101 (Nov 2001)'],['v102','DMS1V102 (Feb 2011)']],c.fw)}</label>
   <label>Timeline ${sel('c_scn',[['run','already running'],['boot','power-on at 0 s']],c.scn)}</label>
   <label>Saved mode ${sel('c_mode',[['analog','AUDIO'],['aes','AES'],['sdi','SDI']],b.mode)}</label><label>group ${sel('c_grp',[[0,'GR1'],[1,'GR2'],[2,'GR3'],[3,'GR4']],b.grp)}</label>
   <label>SDI ${sel('c_fmt',[['HD','HD'],['SD','SD']],w.sdi.fmt)}</label><span>groups in the SDI: ${[0,1,2,3].map(g=>`<label><input type="checkbox" data-g="${g}" ${w.sdi.groups[g]?'checked':''}>${g+1}</label>`).join(' ')}</span>
   ${c.dmx==='D4'?`<label><input type="checkbox" id="c_fault" ${c.fault?'checked':''}> 2014 “SD audio lost at start-up” fault ${inf}</label>`:''}</div>
   <div class="small muted">Click a front button to press it at the playhead (held 80 ms). Click the plate BNCs to plug SDI, the AES / ANALOG connectors to add or remove sources. Keys: A AUDIO, E AES, S SDI, 1–4 groups, W SWAP.</div>`; }
function bindControls(root){ const q=s=>root.querySelector(s); if (!q('#c_dmx')) return;
  q('#c_dmx').onchange=e=>A.cfg('dmx',e.target.value,'DEMUX board → '+DMX[e.target.value].n); q('#c_fw').onchange=e=>A.cfg('fw',e.target.value,'Front-panel firmware → '+e.target.value);
  q('#c_scn').onchange=e=>A.cfg('scn',e.target.value,'Timeline → '+e.target.selectedOptions[0].text); q('#c_mode').onchange=e=>A.base('mode',e.target.value,'Saved mode → '+e.target.value);
  q('#c_grp').onchange=e=>A.base('grp',+e.target.value,'Saved group → GR'+(+e.target.value+1)); q('#c_fmt').onchange=e=>{ act('SDI format → '+e.target.value, tr=>{ addEv({t:absT(),k:'fmt',v:e.target.value}); tr('SD: the DEMUX-4 keeps its demux core in reset until the Si5324 calibration locks (demux4.c)'); }); };
  root.querySelectorAll('[data-g]').forEach(c=>c.onchange=()=>A.grps(+c.dataset.g)); if (q('#c_fault')) q('#c_fault').onchange=e=>A.cfg('fault',e.target.checked,'SD start-up fault '+(e.target.checked?'on':'off')); }
bindKeys('__dms1Active', ()=>({a:()=>A.btn(0),e:()=>A.btn(1),s:()=>A.btn(2),1:()=>A.btn(3),2:()=>A.btn(4),3:()=>A.btn(5),4:()=>A.btn(6),w:()=>A.btn(7)}));

/* ---------------- timeline ---------------- */
function lanes(){ const s=S(), a=SIM.css('--accent'), b=SIM.css('--accent2'), wn=SIM.css('--warn'), ink=SIM.css('--ink2'); const L=[];
  if (s.t0>0) L.push({label:'INIT + start-up delay', h:18, draw(c,X,t0,t1,y,h){ c.fillStyle=wn; c.globalAlpha=.5; c.fillRect(X(0),y+3,X(s.t0)-X(0),h-6); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(D.cfg.fw==='v102'?'v102 “ali” delay loop':'INIT', X(Math.max(t0,0))+4, y+13); }});
  L.push({label:`main() passes (${(PASS*1e6).toFixed(0)} µs ${'inferred'})`, h:18, draw(c,X,t0,t1,y,h){ const pw=X(t1)-X(t0); if ((t1-t0)/PASS > pw/3){ c.fillStyle=ink; c.globalAlpha=.25; c.fillRect(X(Math.max(t0,s.t0)),y+4,X(t1)-X(Math.max(t0,s.t0)),h-8); c.globalAlpha=1; return; } SIM.pulses(c,X,t0,t1,y,h,PASS,s.t0,PASS*0.15,ink,'passes'); }});
  L.push({label:'Buttons (raw / debounced ▲)', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=b; D.ev.filter(e=>e.k==='btn').forEach(e=>{ c.fillRect(X(e.t),y+5,Math.max(2,X(e.t+e.dur)-X(e.t)),h-10); c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(BTN[e.b],X(e.t)+3,y+h-2); c.fillStyle=b; });
    c.fillStyle=SIM.css('--play'); s.closures.forEach(e=>{ const x=X(e.t); c.beginPath(); c.moveTo(x,y+2); c.lineTo(x-4,y+9); c.lineTo(x+4,y+9); c.fill(); }); }});
  L.push({label:'RS-485 9600 Bd (DMS1 → / ← reply)', h:34, draw(c,X,t0,t1,y,h){ const pw=X(t1)-X(t0), fine=(t1-t0)<0.006;
    const byte=(ts,v,col)=>{ if (fine){ c.strokeStyle=col; c.beginPath(); const bits=[0]; for(let k=0;k<8;k++) bits.push((v>>k)&1); bits.push(1); let px=X(ts), yy=y+h/2; c.moveTo(X(ts-BIT),y+6); bits.forEach((bt,k)=>{ const yv=bt?y+6:y+h-6; c.lineTo(X(ts+k*BIT),yv); c.lineTo(X(ts+(k+1)*BIT),yv); }); c.stroke(); c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText('0x'+hx(v),X(ts)+2,y+h/2+3); }
      else { c.fillStyle=col; c.fillRect(X(ts),y+6,Math.max(2,X(ts+BYTE)-X(ts)),h-12); if (X(ts+BYTE)-X(ts)>26){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(hx(v),X(ts)+2,y+h/2+3); } } };
    s.frames.forEach(f=>{ if (f.t>t1 || (f.tEnd||f.t)+0.02<t0) return; const col=f.addr===3?wn:a; byte(f.t,f.tx0,col); if (f.t1!==undefined) byte(f.t1,f.tx1,col); if (f.reply) byte(f.reply.t-BYTE,f.reply.b,f.reply.who==='XTM41'?b:SIM.css('--bad'));
      if (f.timeout){ c.fillStyle=SIM.css('--bad'); c.font='10px sans-serif'; c.fillText('no reply → loss_of_com', X(f.timeout)+3, y+12); } });
    if (!fine && (t1-t0)>0.05){ c.fillStyle=ink; c.font='10px sans-serif'; c.fillText('green = to XTM41 · orange = to DEMUX · blue/red = replies — zoom to 5 ms for bits', X(t0)+4, y+h-1); } }});
  L.push({label:'Talking to (sources1,5)', h:20, draw(c,X,t0,t1,y,h){ s.frames.forEach((f,i)=>{ const e=(s.frames[i+1]||{t:1}).t; if (e<t0||f.t>t1) return; c.fillStyle=f.addr===3?wn:a; c.globalAlpha=.35; c.fillRect(X(f.t),y+4,X(e)-X(f.t),h-8); c.globalAlpha=1; if (X(e)-X(f.t)>60){ c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(ADDR[f.addr],X(f.t)+3,y+h-5); } }); }});
  BTN.forEach((nm,i)=>L.push(boolLane(nm+' LED (RB'+LED_BIT[i]+')', t=>!!(ledsAt(t)&(1<<LED_BIT[i])), i<3?'#ff3324':'#ff6a3a', 14)));
  L.push({label:'AES input searched (sourced,4)', h:18, draw(c,X,t0,t1,y,h){ s.aesSel.forEach((e,i)=>{ const en=(s.aesSel[i+1]||{t:1}).t; c.fillStyle=e.v?b:a; c.globalAlpha=.4; c.fillRect(X(Math.max(e.t,t0)),y+3,X(Math.min(en,t1))-X(Math.max(e.t,t0)),h-6); c.globalAlpha=1; if (X(en)-X(e.t)>40){ c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(e.v?'BNC 75 Ω':'XLR 110 Ω',X(Math.max(e.t,t0))+3,y+13); } }); }});
  L.push({label:'Monitored by XTM41', h:18, draw(c,X,t0,t1,y,h){ let prev=null; for (let i=0;i<=1000;i+=5){ const tt=i/1000; if (tt<t0||tt>t1) continue; const m=s.mon[i].what; if (m!==prev){ c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(m,X(tt)+2,y+13); c.fillStyle=ink; c.fillRect(X(tt),y+2,1,h-4); prev=m; } } }});
  L.push({label:'LED meter L (dB, 0 = +4 dBu / −20 dBFS)', h:40, draw(c,X,t0,t1,y,h){ c.fillStyle=a; c.globalAlpha=.6; c.beginPath(); c.moveTo(X(t0),y+h); for (let i=Math.max(0,Math.floor(t0*1000)); i<=Math.min(1000,Math.ceil(t1*1000)); i++){ const tt=i/1000, v=Math.max(0,Math.min(1,(s.met[0][i]+40)/52)); c.lineTo(X(tt),y+h-v*(h-4)); } c.lineTo(X(t1),y+h); c.closePath(); c.fill(); c.globalAlpha=1; }});
  return L; }

/* ---------------- views ---------------- */
function nowHTML(t){ const r=regAt(t), f=frameAt(t), mon=monAt(t), w=world(t);
  return `<table class="kv"><tr><th>Playhead</th><td class="mono">${SIM.fmtT(t)} ${r?'· pass '+passAt(t):'· still in INIT'}</td></tr>
   <tr><th>Mode bits</th><td class="mono">${r?`sourcea 0x${hx(r.sourcea)} · sourced 0x${hx(r.sourced)} · sources1 0x${hx(r.sources1)} · sources2 ${bn(r.sources2)}`:'—'}</td></tr>
   <tr><th>Last frame</th><td class="mono">${f?`0x${hx(f.tx0)} 0x${hx(f.tx1)} → ${ADDR[f.addr]}${f.reply?` · reply 0x${hx(f.reply.b)} from ${f.reply.who}`:f.timeout?' · no reply':''}`:'none yet'}</td></tr>
   <tr><th>disctl / uart0</th><td class="mono">${r?`${bn(r.disctl).slice(6)} / 0x${hx(r.uart0)}`:'—'}</td></tr><tr><th>Monitoring</th><td>${mon.what} · meter L ${meterAt(0,t).toFixed(1)} dB</td></tr>
   <tr><th>Monitor outputs</th><td class="mono">${mon.L>-150? fdb(mon.L+4+volDb(w.vol))+' dBu' : 'silent'} ${inf}</td></tr>${S().eeLeft?`<tr><th>EEPROM</th><td>eewrite will save the mode ${S().eeLeft.toFixed(1)} s after the end of this second</td></tr>`:''}</table>`; }
function viewSim(m){ window.__dms1Active=true;
  m.innerHTML=`${card('Front panel (real silkscreen, DMS-1-FRONT-SILK)',`<div id="fp"></div>`)}${card('Rear panel (DMS-1-REAR-SILK + DEMUX plate from the photos)',`<div id="rp"></div><div id="ctl"></div>`)}
   <div class="grid2">${card('What the firmware did (last action)',`<div id="trace" class="log"></div>`)}${card('At the playhead',`<div id="now"></div>`)}</div>
   ${card('Timeline — one second as the front-panel PIC sees it. Zoom to 5 ms to read the UART bits.',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  const ctl=m.querySelector('#ctl'); ctl.innerHTML=controlsHTML(); bindControls(ctl);
  let lastCfg='';
  const draw=()=>{ const t=SIM.t; const ck=JSON.stringify([D.cfg,D.base.mode,D.base.grp]); if (ck!==lastCfg){ ctl.innerHTML=controlsHTML(); bindControls(ctl); lastCfg=ck; }
    const fp=m.querySelector('#fp'); fp.innerHTML=frontSVG(t); bindPanel(fp); const rp=m.querySelector('#rp'); rp.innerHTML=rearSVG(t); bindPanel(rp);
    m.querySelector('#trace').innerHTML=traceHTML(D,'Press SDI, a group button or SWAP, or plug the SDI cable.'); m.querySelector('#now').innerHTML=nowHTML(t);
    m.querySelector('#log').innerHTML=logHTML(D); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:210}); };
  SIM.on('time',draw); }
const pbAt = t => ledsAt(t);
const LESSONS=[
  {title:'Meet the DMS-1', body:`<p>From <span class="mono">Dms1v100.asm</span>: “This software is used to communicate with the XTM41 main board and DEMUX-1 module to create DMS-1 monitoring system. This module is the user interface, as it allows the user to select the type of audio in which they would like to monitor.”</p><p>The front panel has three source buttons (<b>AUDIO, AES, SDI</b>), four group buttons and <b>SWAP</b>, an 18-step stereo LED meter, VOLUME and HEADSET. The rear has the analog and AES inputs, the monitor outputs and the DEMUX plate. Settings start with DEMUX-4 and DMS1V102, the 2014 build.</p>`, check:()=>true, auto:true},
  {title:'1 · Listen to the analog inputs', body:`<p>Press <b>AUDIO</b>. Scrub forward ≈ 30 ms: the press must stay steady for 64 passes, then <span class="mono">audio_on</span> runs, the AUDIO LED lights and 150 passes later a frame goes to the XTM41 (address 00).</p>`, check:()=>!!(pbAt(SIM.t)&1), hint:'Click AUDIO (key A), then move the playhead about 30 ms later.'},
  {title:'2 · AES and the auto search', body:`<p>Press <b>AES</b>. On the rear, remove the AES XLR source and connect the 75 Ω BNC instead. The XTM41 answers “unlocked” (reply bit 0); after 6 unlocked replies <span class="mono">no_lock</span> toggles <span class="mono">sourced,4</span> and the box tries the other input. The AES LED flashes while unlocked.</p><p><b>Goal:</b> the “AES input searched” lane switches to BNC within the second.</p>`, check:()=>S().aesSel.some(e=>e.v===1 && e.t>0.01), hint:'Press AES early in the second, click the XLR (remove) and the BNC (add) at that time, then look at the lane.'},
  {title:'3 · SDI and a group', body:`<p>Press <b>SDI</b>, then <b>GR2</b>. In SDI mode the PIC alternates: one frame to the XTM41 (10), the next to the DEMUX (11), toggling <span class="mono">sources1,5</span> after every reply (<span class="mono">sdi_control</span>).</p><p><b>Goal:</b> the GR2 LED is lit at the playhead.</p>`, check:()=>!!(pbAt(SIM.t)&16), hint:'Press SDI, then GR2 (key 2), then scrub 50 ms later.'},
  {title:'4 · SWAP to channels 3/4', body:`<p>Press <b>SWAP</b>. <span class="mono">swap</span> walks <span class="mono">sources2</span> from gr2 to swap3_4 and sets <span class="mono">sources1,0</span>. The XTM41 uses this bit to pick the other AES pair from the DEMUX ${inf}. The DEMUX-4 DMS1 build ignores it (its swap block is commented out).</p>`, check:()=>!!(pbAt(SIM.t)&64), hint:'Key W, then scrub forward.'},
  {title:'5 · Which BNC is the input?', body:`<p>The DEMUX-4 plate says <b>NOT USED</b>, <b>SDI 2 (B)</b>, SDI OUT, AES 1, AES 2. Plug the SDI cable into <b>SDI 2 (B)</b>. At the next DEMUX poll the reply is <span class="mono">0x02</span> (no video lock) and the SDI LED flashes, because the DMS1 build of the DEMUX-4 firmware says <span class="mono">input = RX1;</span> — BNC1, the one labelled NOT USED. Move the cable to BNC1 to get lock.</p>`, check:()=>D.cfg.dmx==='D4' && D.ev.some(e=>e.k==='cable'&&e.v===1) && world(SIM.t).sdi.bnc===0 && !!(pbAt(SIM.t)&4), hint:'Click the second plate BNC, then the first one, and scrub past the next orange (DEMUX) frame.'},
  {title:'6 · The 2011 start-up fix', body:`<p>Set Timeline → <b>power-on at 0 s</b>, DEMUX → <b>DEMUX-1</b> and firmware <b>DMS1V101</b>. INIT sends its first frame about 5 ms after power-on, before the other boards are up (start-up times ${inf}). Nobody answers, so <span class="mono">loss_of_com</span> waits 256 × 26 passes (≈0.8 s) before it tries again — the LEDs show the restored mode but say nothing true about the signal.</p><p>Now choose <b>DMS1V102</b>: the 0.64 s “ali” delay before <span class="mono">main</span> lets the boards boot first, the first frame is answered and the DEMUX is polled within the second (test report 15 FEB 2011: “correct the SDI LED lost lock sometime when startup”).</p>`, check:()=>D.cfg.scn==='boot' && D.cfg.fw==='v102' && S().frames.some(f=>f.addr===3&&f.reply), hint:'Timeline → power-on, DEMUX board → DEMUX-1, Front firmware → DMS1V102.'},
  {title:'Done', body:`<p>The <b>Software</b> tab shows the main loop and the frame bits live; <b>Findings</b> lists what the code and the reports reveal.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__dms1Active=true; tutorialView(m,{title:'Tutorial — operating the DMS-1',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>A.reset(),
  unitHTML:()=>`${frontSVG(SIM.t)}<div style="margin-top:6px">${rearSVG(SIM.t)}</div>${controlsHTML()}<div class="small" style="margin-top:6px">${nowHTML(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindControls(r); }}); }
function viewSecond(m){ window.__dms1Active=false;
  m.innerHTML=`<div class="grid2">${card('What one second contains',`<div id="rows"></div>`)}${card('The frame at the playhead, bit by bit',`<canvas id="sc"></canvas><div id="fb" class="small mono"></div>`)}</div>${card('Timeline (same as the Simulator tab)',`<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const s=S(), t=SIM.t, fr=s.frames.filter(f=>f.t<1);
    const rows=[['main() passes',s.N.toLocaleString(),SIM.fmtDur(PASS),`${PASS_CYC} instruction cycles at ${(TCY*1e6).toFixed(3)} µs ${inf}`],['Debounce (closure)','—',SIM.fmtDur(64*PASS),'64 equal scans (bounce,6)'],['Release','—',SIM.fmtDur(128*PASS),'128 quiet scans (bounce,7)'],
      ['Poll interval','≈'+(1/(2560*PASS+150*PASS)).toFixed(1),SIM.fmtDur(2560*PASS+150*PASS),'polecount0 × polecount1 (256 × 10) + communication_control (150)'],['Frames sent',fr.length,'2 bytes · '+SIM.fmtDur(2*BYTE),'tx0 (bit 7 = 1, address, mode bits), tx1 (bit 7 = 0, level)'],
      ['LED flash half-period','—',SIM.fmtDur(256*5*PASS),'lockflash0 (256) × lockflash1 (5) — only counted while sdimode is not waiting on the DEMUX'],['Reply time-out','—',SIM.fmtDur(256*26*PASS),'comout2 (256) × comout3 (230→0) → re_transmit'],['EEPROM save','—',SIM.fmtDur(181*256*PASS),'rem2 × rem4 after the last release'],['DEMUX-4 reply delay','—',SIM.fmtDur(D4_DLY),'timer0: OCR0 = 34, clk/1024']];
    m.querySelector('#rows').innerHTML=`<table class="kv"><tr><th>Event</th><th>per s</th><th>period</th><th>from</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const f=frameAt(t)||fr[0]; const {c,w}=SIM.canvas(m.querySelector('#sc'),150);
    if (f){ const seq=[[f.tx0,'tx0'],[f.tx1,'tx1']].concat(f.reply?[[f.reply.b,'reply']]:[]); const bw=(w-20)/ (seq.length*10+2);
      c.font='10px '+SIM.css('--mono'); let x=10; c.strokeStyle=SIM.css('--accent'); c.lineWidth=2; c.beginPath(); c.moveTo(x,30);
      seq.forEach(([v,l],k)=>{ const bits=[0]; for(let i=0;i<8;i++) bits.push((v>>i)&1); bits.push(1); bits.forEach((b,i)=>{ const yy=b?30:80; c.lineTo(x,yy); c.lineTo(x+bw,yy); x+=bw; }); });
      c.stroke(); x=10; seq.forEach(([v,l])=>{ c.fillStyle=SIM.css('--ink'); c.fillText(`${l} 0x${hx(v)}`,x,105); c.fillStyle=SIM.css('--ink2'); 'S01234567P'.split('').forEach((ch,i)=>c.fillText(ch,x+i*bw+bw/2-3,120)); x+=bw*10; });
      m.querySelector('#fb').innerHTML=`tx0 = ${bn(f.tx0)} : framing 1 · address ${(f.tx0>>5)&3} (${ADDR[(f.tx0>>5)&3]}) · bit4 ${(f.tx0>>4)&1} (term / SDI input) · bit3 ${(f.tx0>>3)&1} (hp) · s2..s0 ${f.tx0&7}<br>tx1 = ${bn(f.tx1)} : level ${f.tx1} (64 = “+4” analog, 40 = “−20” digital, init42)<br>Each bit ${(BIT*1e6).toFixed(1)} µs, LSB first; start S = 0, stop P = 1.`; }
    else m.querySelector('#fb').textContent='No frame in this second.';
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:210}); };
  SIM.on('time',draw); }
const BLOCKS={
  fp:{x:20,y:20,w:200,h:96,t:'Front board XTM4-5',s:['PIC16F73 @ 4.9152 MHz','DMS1V102','8 buttons, 8 LEDs'],d:'The user interface (test report: “Front Panel Controller: XTM4-5 issue 1, DMS1V102”). It scans RA0–RA5, RC0, RC2, drives the button LEDs on PORTB and is the RS-485 master.'},
  bus:{x:260,y:40,w:160,h:60,t:'RS-485 9600 8N1',s:['RC5 = driver enable'],d:'Two-byte frames, address in tx0 bits 6–5. The PIC waits for one reply byte after every frame (txflags,4).'},
  xtm:{x:460,y:20,w:200,h:96,t:'Main board XTM4-1',s:['XTM41V203/V204','relays, CS8420, DAC'],d:'The XTM4 test meter main board reused: it switches analog / AES / SDI-AES to the monitor path and answers AES lock status (addresses 00, 01, 10).'},
  dmx:{x:460,y:160,w:200,h:96,t:'DEMUX board',s:['DEMUX-1 → 3 → 4','address 11'],d:'SDI de-embedder. DEMUX-1 (PIC) until 2011, DEMUX-3 (ATmega128 + Cyclone) from April 2011, DEMUX-4 (ATmega128 + Spartan-6, build V020300-DMS1) in 2014 with an adaptor plate.'},
  ana:{x:20,y:180,w:200,h:76,t:'Analog / AES inputs',s:['CH A/B XLR · AES XLR + BNC'],d:'Analog CH A/B balanced inputs; AES 110 Ω XLR and 75 Ω BNC (transformer-coupled receivers in the functional drawing).'},
  src:{x:700,y:90,w:170,h:80,t:'Source select',s:['SRC → DAC','(functional)'],d:'The functional drawing: digital sources go through an SRC and DAC, then a source-select block chooses analog or converted audio.'},
  met:{x:910,y:20,w:150,h:76,t:'LED meter',s:['18 × 2 LEDs','−34 … +12'],d:'Before the volume control. The drawing says −27 … +12; the panel silk −34 … +12.'},
  vol:{x:910,y:160,w:150,h:96,t:'VOLUME → outputs',s:['MONITOR OUTPUT CH A/B','HEADSET'],d:'Dual pot and output amplifiers feed the rear MONITOR OUTPUT XLRs and the front HEADSET jack.'},
};
const WIRES=[['fp','bus','tx0 tx1'],['bus','xtm','00/01/10'],['bus','dmx','11'],['ana','xtm',''],['dmx','xtm','AES 1/2 internal'],['xtm','src',''],['src','met',''],['src','vol','']];
function viewBlock(m){ window.__dms1Active=false; blockView(m,BLOCKS,WIRES,'fp',[1080,280],card('In one sentence',`<p>A front-panel PIC tells an XTM4 main board and a DEMUX board, over a 9600 Bd RS-485 bus, which source to monitor; they switch the audio and report lock, and the PIC shows it on the button LEDs.</p><p class="small muted">From DMS1-Functional.cdr, the firmware and the test reports.</p>`)); }
const SHEETS=[
  {name:'1 · Front-panel PIC (XTM4-5)', note:'Pin use taken from init42~1.asm, analog42/aes42/sdi42.asm and the scan routine. PORTD/PORTE are configured for an 8-character display and a phase meter that the DMS-1 does not have (XTM42 leftovers).', svg:()=> chip(330,50,200,'U? PIC16F73 (v100: PIC16C73B)',[['RA0','AUDIO button'],['RA1','AES button'],['RA2','SDI button'],['RA3','GR1 button'],['RA4','GR2 button'],['RA5','GR3 button'],['RC0','SWAP button'],['RC2','GR4 button / EE data'],['RC3','EE clock'],['RC5','RS-485 DE'],['RC6/TX','RS-485 DI'],['RC7/RX','RS-485 RO'],['OSC1/2','4.9152 MHz']],[['RB0','AUDIO LED'],['RB1','AES LED'],['RB2','SDI LED'],['RB3','GR1 LED'],['RB4','GR2 LED'],['RB5','GR3 LED'],['RB6','SWAP LED'],['RB7','GR4 LED'],['RD0-2','display a0-a2 (unused)'],['RD5','display WR (unused)'],['RE0-2','phase meter (unused)']],'MPASM · DMS1V102 · ICSP')},
  {name:'2 · RS-485 bus', note:'Addresses from the txuart comment block ("a1,a0 = 00 analog, 01 aes, 10 sdi, 11 spare") and the DEMUX-4 processUart() test (cmd & 0xE0) == 0xE0. Transceivers inferred to be the ADM3485 / 75176 class used on the XTM4 and DEMUX-4.', svg:()=>{ let s=wire([[60,200],[800,200]])+wire([[60,240],[800,240]])+net(20,204,'A')+net(20,244,'B');
    [[90,'Front PIC','master · RC5 DE'],[330,'XTM41 main','00 · 01 · 10'],[570,'DEMUX','11 (0xE0 | select)']].forEach(([x,n,a])=>{ s+=`<rect x="${x}" y="70" width="180" height="70" rx="6" fill="var(--panel2)" stroke="var(--ink)"/>`+txt(x+10,95,n,13)+txt(x+10,118,a,11,'var(--ink2)')+wire([[x+60,140],[x+60,200]])+wire([[x+120,140],[x+120,240]])+dot(x+60,200)+dot(x+120,240); });
    return s+txt(60,300,'tx0 = 1 a1 a0 term hp s2 s1 s0   ·   tx1 = 0 l6 … l0   ·   reply: 1 byte (bit0 = AES / group unlock, bit1 = no SDI carrier)',12)+txt(60,330,'9600 Bd: SPBRG = 7 with BRGH = 0 at 4.9152 MHz.',11,'var(--ink2)'); }},
  {name:'3 · DEMUX-4 plate', note:'Plate labels from DMS1 Rear (Demux 4).jpg; DEMUX-4 BNC numbering and RX1 from the demux4.js plugin and V020300-DMS1/demux4.c.', svg:()=>{ let s=''; DMX.D4.bncs.forEach((l,i)=>{ const x=120+i*140; s+=`<circle cx="${x}" cy="150" r="32" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="${x}" cy="150" r="8" fill="var(--ink)"/>`+txt(x,210,l,12,'var(--ink)','middle')+txt(x,232,'BNC'+(i+1),11,'var(--accent2)','middle'); });
    return s+txt(120,300,['BNC1 → LMH0394 U2 → RX1 (GTP X0Y0): the only input the DMS1 build uses (input = RX1)','BNC2 → LMH0394 U9 → RX2: labelled “SDI 2 (B)” on the plate','BNC3 SDI out · BNC4 / BNC5 AES outputs (group 1 ch 1/2, ch 3/4 in the host FPGA build)'].join('  |  ').slice(0,0),11)
      +txt(60,300,'BNC1 → LMH0394 U2 → RX1 (GTP X0Y0) — the only input the DMS1 build reads (“input = RX1; //DMS1-Add”).',11)+txt(60,320,'BNC2 → LMH0394 U9 → RX2 — the plate calls it “SDI 2 (B)”.',11)+txt(60,340,'BNC3 SDI re-clocked out · BNC4 / BNC5 disembedded AES (host-build FPGA V020000: group ch 1/2 and 3/4).',11); }},
  {name:'4 · Audio path (functional)', note:'Redrawn from DMS1-Functional.cdr: analog inputs, AES110/AES75 receivers with transformers, DEMUX, SRC, DAC, SOURCE SELECT, LED METER (−27 … +12 on the drawing), VOLUME CONTROL, HEADSET JACK, ANALOG OUTPUT.', svg:()=>{ const bx=(x,y,w,h,t)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/>`+txt(x+w/2,y+h/2+4,t,11,'var(--ink)','middle');
    return net(20,60,'ANALOG L')+net(20,100,'ANALOG R')+opamp(110,60,'')+opamp(110,100,'')+net(20,160,'AES110')+net(20,200,'AES75')+bx(110,145,80,30,'RCVR')+bx(110,185,80,30,'RCVR')+net(20,270,'SDI IN')+bx(110,250,80,50,'DEMUX')
     +bx(240,180,60,30,'SRC')+bx(320,180,60,30,'DAC')+bx(420,40,120,260,'SOURCE SELECT')+wire([[170,60],[420,60]])+wire([[170,100],[420,100]])+wire([[190,160],[215,160],[215,195],[240,195]])+wire([[190,200],[215,200]])+wire([[190,275],[215,275],[215,200]])+wire([[300,195],[320,195]])+wire([[380,195],[420,195]])
     +wire([[540,70],[600,70]])+opamp(600,70,'meter amp')+bx(680,55,140,30,'LED METER L/R')+wire([[540,250],[600,250]])+`<rect x="600" y="230" width="16" height="40" fill="none" stroke="var(--ink)"/>`+txt(580,290,'VOLUME',10)+opamp(640,250,'')+net(720,240,'MONITOR OUT A/B')+net(720,270,'HEADSET'); }},
];
function viewSchem(m){ window.__dms1Active=false; schemView(m,SHEETS,'DMS-1','Redrawn from the firmware pin use, the functional drawing, the panel drawings and the DEMUX-4 source — no DMS-1 schematic or netlist is archived.'); }
const LOOP=['clrwdt','scan','translate','analogmode','aesmode','sdimode','communication_control','pole','scanuart','loss_of_com','processuart','settxdata','txuart','aes_control','sdi_control','eewrite'];
const LOOPW=[1,14,6,4,22,26,5,9,6,5,7,12,9,5,5,4];        // relative cycle share per routine — inferred
function viewSoft(m){ window.__dms1Active=true;
  m.innerHTML=`${card('main — the routine running at the playhead',`<div id="ml"></div>`)}<div class="grid2">${card('Registers at the playhead',`<div id="rg"></div>`)}${card('Who the PIC talks to (sources1,5 state machine)',`<div id="sm"></div>`)}</div>
   ${card('tx0 bit map (txuart comment block)',`<div id="bm"></div>`)}${card('LED decisions in sdimode (sdi42.asm)',`<div id="ld"></div>`)}`;
  const draw=()=>{ const t=SIM.t, s=S(), n=passAt(t); let k=-1;
    if (n!==null){ const fr=((t-s.t0)/PASS)%1, tot=LOOPW.reduce((a,b)=>a+b,0); let acc=0; for (let i=0;i<LOOPW.length;i++){ acc+=LOOPW[i]/tot; if (fr<acc){ k=i; break; } } }
    m.querySelector('#ml').innerHTML=`<svg viewBox="0 0 980 120" style="width:100%">${LOOP.map((r,i)=>{ const x=6+(i%8)*121, y=6+Math.floor(i/8)*56, on=i===k; return `<rect x="${x}" y="${y}" width="115" height="48" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+8}" y="${y+28}" font-size="${r.length>14?9.5:11.5}" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">call ${r}</text>`; }).join('')}</svg>
      <p class="small muted">${n===null? 'The PIC is still in INIT (or the start-up delay).' : `Pass ${n} of ${s.N}. One pass ≈ ${(PASS*1e6).toFixed(0)} µs; the split between routines is ${inf}.`} Then <span class="mono">goto main</span>.</p>`;
    const r=regAt(t);
    m.querySelector('#rg').innerHTML = r? `<table class="kv">${[['flag0','closure · wait · new data · … · source change'],['txflags','set · tx0 · tx1 · busy · wait · … · tx6 · retransmit'],['sources1','sdi active · addr · addr toggle · input · hp · s2 s1 s0'],['sources2','one-hot: gr1 sw1 gr2 sw2 gr3 sw3 gr4 sw4'],['sourced','aes active · 0 · 1 · term · … · rear'],['sourcea','analog active · 0 0 · … · rear'],['disctl','bit1 no carrier · bit0 unlock'],['portb','LEDs GR4 SWAP GR3 GR2 GR1 SDI AES AUDIO'],['polecount1','poll divider'],['comout3','reply time-out (230 → 0)'],['lockflash2','flash phases'],['bounce','debounce counter']].map(([k2,d])=>`<tr><th class="mono">${k2}</th><td class="mono">${bn(r[k2])} <span class="muted">0x${hx(r[k2])}</span></td><td class="small">${d}</td></tr>`).join('')}</table>` : '<p class="muted">INIT</p>';
    const f=frameAt(t), a5 = r? (r.sources1>>5)&1 : 0, sdi = r && (r.sources1&128);
    m.querySelector('#sm').innerHTML=`<svg viewBox="0 0 420 170" style="width:100%"><defs><marker id="dar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${[[20,'XTM41 (10)',0],[240,'DEMUX (11)',1]].map(([x,l,v])=>`<rect x="${x}" y="50" width="160" height="60" rx="30" fill="${sdi&&a5===v?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+80}" y="85" text-anchor="middle" font-size="13" fill="${sdi&&a5===v?'#fff':'var(--ink)'}">${l}</text>`).join('')}
      <path d="M180 65 Q210 30 240 65" fill="none" stroke="var(--ink2)" marker-end="url(#dar)"/><path d="M240 95 Q210 130 180 95" fill="none" stroke="var(--ink2)" marker-end="url(#dar)"/><text x="210" y="28" text-anchor="middle" font-size="10" fill="var(--ink2)">reply → sdi_control: xorwf sources1 (bit 5)</text><text x="210" y="150" text-anchor="middle" font-size="10" fill="var(--ink2)">reply, or a time-out → re_transmit clears bit 5</text></svg>
      <p class="small">${sdi? `SDI mode: next frame goes to the ${a5?'DEMUX':'XTM41'}. While bit 5 is set, <span class="mono">sdimode</span> returns at once, so button LEDs and flash timers freeze for that half of the cycle.` : 'Not in SDI mode: every frame goes to the XTM41 with the mode\'s own address (00 or 01).'}</p>`;
    m.querySelector('#bm').innerHTML = f? `<table class="kv"><tr>${['7 framing','6 a1','5 a0','4 term / input','3 hp','2 s2','1 s1','0 s0'].map(h=>`<th class="small">${h}</th>`).join('')}</tr><tr>${[7,6,5,4,3,2,1,0].map(b=>`<td class="mono">${(f.tx0>>b)&1}</td>`).join('')}</tr></table><p class="small">Last tx0 = 0x${hx(f.tx0)} → ${ADDR[f.addr]}. For the DEMUX-4, (tx0 &amp; 0xE0) == 0xE0 → audio_select1 = tx0 &amp; 6, audio_swap1 = tx0 &amp; 1 (ignored), input_select1 = tx0 &amp; 0x10 (ignored: input = RX1).</p>` : '<p class="muted">No frame yet.</p>';
    const fw=D.cfg.fw; m.querySelector('#ld').innerHTML=flowSVG([{t:'flag0,2 ?',s:['closure → clear PORTB','light SDI']},{t:'disctl,1 ?',s:['no carrier','→ sdidis3 (flash SDI)']},{t:'disctl,0 ?',s:['group unlocked','→ sdidis2 (flash GR)']},{t:'no_sdi',s:['bcf portb,2',fw==='v102'?'v102: falls into no_audio':'v100/101: return']},{t:'source_led',s:['SDI on','GRn (+SWAP) from sources2']}], r? ((r.disctl&2)?1:(r.disctl&1)?2:4) : 0); };
  SIM.on('time',draw); }
function viewNotes(m){ window.__dms1Active=false;
  m.innerHTML=card('Findings',`<ol>
   <li><b>The plate's input is not the firmware's input.</b> The DEMUX-4 build for the DMS-1 (<span class="mono">V020300-DMS1/demux4.c getSelectedInput()</span>) replaces the input switch with <span class="mono">input = RX1; //DMS1-Add</span>. RX1 is BNC1, which the DMS-1 adaptor plate (photo <span class="mono">DMS1 Rear (Demux 4).jpg</span>) labels <b>NOT USED</b>; the plate's live-looking input is “SDI 2 (B)” = BNC2. Unless the board sits on the plate in a different order (not documented), the cable must go in the “NOT USED” socket.</li>
   <li><b>SWAP does nothing on the DEMUX-4.</b> The DMS-1 sends the swap bit in tx0 bit 0 to both boards, but the DEMUX-4 swap block is commented out (“XTM4-Add … */”). Only the XTM41 can act on it ${inf}.</li>
   <li><b>The DEMUX-4 never reports missing audio.</b> Its reply is only 0x02 (video unlocked) or 0x00; the “AMS4-Add” block that sets bits 2–5 is commented out, and nothing ever sets bit 0. So with a DEMUX-4 the DMS-1 group LEDs can never flash for “no audio” (<span class="mono">sdidis2</span> is dead code).</li>
   <li><b>LEDs freeze half the time in SDI mode.</b> <span class="mono">sdimode</span> starts with <span class="mono">btfsc sources1,5 / return</span>. While the frame is addressed to the DEMUX, the LED code and its flash counters (<span class="mono">lockflash0–4</span>) do not run, so the SDI flash rate is irregular.</li>
   <li><b>v102's fix is a 0.64 s delay.</b> DMS1V102 (comment “FEBRUERY 18, 2011”) adds a 4 × 255 × 255 delay loop marked <span class="mono">;ali</span> before <span class="mono">goto main</span>, and in <span class="mono">no_sdi</span> comments out the <span class="mono">return</span>, so a lost carrier also blanks the group LEDs. The test report that approves it is dated <b>15 FEB 2011</b>, three days before the date in the source.</li>
   <li><b>GR4 shares a pin with the EEPROM.</b> <span class="mono">scan</span> reads GR4 on RC2, and <span class="mono">eewrite</span> drives RC2 as the EEPROM data line (<span class="mono">bcf portc,2 ;data</span>) after changing TRISC. The comments say “change portc,0,1 to outputs” but the value <span class="mono">B'10000011'</span> makes RC0/RC1 inputs and RC2–RC6 outputs.</li>
   <li><b>XTM42 leftovers.</b> <span class="mono">init42~1.asm</span> still defines the 8-character display macros (PORTD address/write lines), all the CHARA…CHAR9 codes, the “phase meter” on PORTE and “auto inc” flags. The DMS-1 has none of them. The front board is listed as “XTM4-5” in the 2014 test report.</li>
   <li><b>sources1 is saved twice.</b> <span class="mono">eewrite</span> stores <span class="mono">sources1</span> as both setup bytes at address 3, and INIT restores it twice; harmless. The save happens about ${(181*256*PASS).toFixed(1)} s after the last button release (rem2/rem4), so a power cut sooner loses the change.</li>
   <li><b>History from the test reports.</b> 15 FEB 2011: DMS1V102 with DEMUX-1, XTM41V203. 5 APR 2011: DEMUX-3 (2.0.0.5) replaces DEMUX-1/2; XTM41 upgraded to V204 because of a communication conflict. 16 AUG 2011: DEMUX-3 v400 fixes “unstable tallies” (the form is headed “OPENGEAR comprehensive test outline” although the DMS-1 is not openGear). 28 APR 2014: DEMUX-4 (Atmel v020300, FPGA v020000); “SD audio loss lock at startup sometime … restored when pressing any SD group select button”, and the +15 V rail unregulated because the transformer is under-rated (AMVECO 62063 ordered).</li>
   <li><b>A possible cause of the 2014 SD fault</b> ${inf}: the DEMUX-4 writes the group registers only when <span class="mono">group1 != pGroup1</span>; for SD, the demux core leaves reset only after the Si5324 calibration, later than for HD. If that reset loses the group selection, nothing rewrites it until a different group is chosen. The report says <i>any</i> group button helps, which this explanation only covers for a different group. Tick the fault box to try it.</li>
   <li><b>The meter scale differs between drawings.</b> The functional drawing says −27 … +12; the panel silk −34 … +12; the DEMUX-3 manual cover prints “3 8 9 12” where the silk has “3 6 9 12”.</li>
   <li><b>Drawing issues.</b> <span class="mono">DMS-1 REAR ISS 4 (PANEL).pdf</span> shows issue <b>5</b> in its title block (28-06-16 “changed ground stud to FH 440-5”); the front panel drawing dates from 18-06-98, three years before the first firmware.</li>
   <li><b>v100 → v101.</b> V101 (Nov 2001) moved to the flash PIC16F73, added <span class="mono">communication_control</span> (a 150-pass gap before sending “to avoid data collisions … framing and overrun errors”) and shortened the reply time-out reload from 250 to 230.</li>
   <li><b>Corrected 2026|59: DEMUX-1 reply and pass length.</b> The DEMUX-1 reply was modelled as 0x00/0x02 (+1) 2 ms after the frame. Its source (<span class="mono">demux-1.asm</span>: <span class="mono">sdi_check</span>, <span class="mono">settx</span>, <span class="mono">readgs9023</span>) answers 0xE0–0xE3 once probed by a command with bit 3 set, and 0x00–0x03 otherwise. The DMS-1 never sets bit 3 (hp), so here it always reads 0x00–0x03; bit 0 (no audio lock) is also set when there is no carrier. Each reply comes ≈ 6.3 ms after the command, except the first after power-up, which goes on the DEMUX's next pass. The front-panel pass was assumed to be 150 cycles; cycle-counting the real code gives 115–182, median 120–144 depending on the mode, so the model now uses ${PASS_CYC} (${inf}, middle of the medians) (see demux1.js, dms.js).</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small"><li>Main-loop pass ${PASS_CYC} cycles (${(PASS*1e6).toFixed(0)} µs) and the per-routine split (${inf}); all counter limits are from the source.</li><li>Reply delays: XTM41 1.5 ms, DEMUX-3 2 ms (${inf}); DEMUX-1 ≈ 6.3 ms (first reply after power-up on its next pass) from its settx counter (demux1.js); DEMUX-4 7.08 ms from its timer0 set-up.</li><li>Start-up times of the XTM41 (0.25 s), DEMUX-1 (0.35 s), DEMUX-3 (0.6 s) are ${inf}; DEMUX-4 ≈ 6 s comes from the FPGA configuration time in demux4.js.</li><li>XTM41 reply byte: bit 0 = AES unlocked (from the way processuart / aes_control use it).</li><li>Meter: 0 dB = +4 dBu analog or −20 dBFS digital (init42: alvl1 = 64 “+4”, dlvl1 = 40 “−20”); fast attack, 13 dB/s fall (${inf}).</li><li>Running scenario: the first poll happens about 60 ms into the second (${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>XXX - DMS - #OBSOLETE #Archive/PIC VERSIONS/Dms1v100 · Dms1v101 · Dms1v102</li><li>SA-DEMUX4 - #Master/…/Software/Atmel/V020300-DMS1/demux4.c</li><li>XXX - DMS1 - #Master #OBSOLETE/DMS1 - #TESTREPORT/*.pdf · DMS1 - #Mechanical #DA #2016/*.pdf · Silks/*</li><li>XXX - DMS - #OBSOLETE #Archive/DMS1-Functional.cdr · DMS1manu-Demux3.cdr · DMS1-RearDemux3-1.jpg</li></ul>`); }
SIM.register({
  id:'dms1', name:'DMS-1 · Digital Monitor System ('+SIM.year(2001)+')', duration:1, product:'DMS1', year:2001,
  family:'Obsolete products', folder:'#DMS #SERIES/XXX - DMS1 - #Master #OBSOLETE',
  summary:'A 1RU Select Series monitor: a PIC16F73 front panel picks analog, AES or SDI-embedded audio and talks over 9600 Bd RS-485 to an XTM4 main board and a DEMUX board (DEMUX-1, -3, later -4). The model runs the DMS1V100–V102 firmware routine by routine against the DEMUX-4 DMS1 build.',
  highlights:['Real front and rear silkscreen with working buttons, LEDs and LED meter','Firmware ported pass by pass: debounce, polling, frames, LED flashing','RS-485 frames down to the bit, alternating XTM41 / DEMUX','DEMUX-1 / -3 / -4 and firmware v100 / v101 / v102 compared','Findings: the plate labels the firmware\'s only input “NOT USED”; SWAP ignored by DEMUX-4'],
  depth:'Hardware model',
  stepUnits:[{label:'1 main() pass',period:()=>PASS},{label:'1 UART bit',period:()=>BIT},{label:'1 UART byte',period:()=>BYTE},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.35,'350 ms (one poll)'],[0.05,'50 ms'],[0.01,'10 ms (a frame)'],[0.003,'3 ms (bits)'],[0.0005,'500 µs (passes)']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
