/* =====================================================================
   POD11 — AES/EBU audio monitor (obsolete), Ward-Beck Systems, 1997|30–2010|43
   Plugin for the WBS Device Simulator (../siumulation.html). Full model.

   Sources (all in #POD #SERIES/XXX - POD11 - #Master  #OBSOLETE):
   - POD11 - #Software/POD11 - #Software #V100/PD11V100.ASM, PD11V101.ASM, PD11V10X.ASM (PIC16C73A, MPASM, 1998)
     and PD11V100.BKX (Intel HEX of a V1.01 build)
   - POD11 - #ISS3 #PCB /POD11-ISS3.net (P-CAD netlist with values, 2010) · ISS2/POD11.DSN (OrCAD, 1998)
   - POD11 - #SILK/POD11SLK.CDR (converted with Inkscape → assets/pod11-*.png) · #MANUAL #Obsolete/POD11MAN.CDR, POD11LYO.CDR
   - POD11 - Functional Diagram.cdr and POD11A MANUAL.pdf (for the POD11A findings)
   The POD-family helper kit below is the same code as in pod11a.js / pod33.js.
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
/* ======================= POD11-specific model ======================= */
const PREFIX='pod11';
const ART_SLK='#POD #SERIES/XXX - POD11 - #Master  #OBSOLETE/POD11 - #SILK/POD11SLK.CDR';
const DUR=3;                                    // 0–1 s is "the second"; the run goes to 3 s so the boot chase (1.76 s) and the watchdog (2.3 s) fit
const FOSC=6.144e6, TCY=4/FOSC;                 // X1 6M144 (netlist) → 1.536 MIPS ("1.53MHZ" in the DELAY comment)
const OUTER=1023;                               // cycles per DELAY outer pass: 255 × (CLRWDT, DECFSZ, GOTO) + reload
const T_INIT=255*OUTER*TCY, T_VIS=239*OUTER*TCY, T_VIS2=1*OUTER*TCY;
const T_WDT=0.018*128;                          // WDT 18 ms nominal × 1:128 (OPTION_REG never written → reset value, PSA=1, PS=111)
const PASS_CY=160;                              // instruction cycles in one MAIN pass, counted from the listing (approx.)
const NOP_GAP=22*TCY, NOP_GAP2=23*TCY;
const CBL_HI=32;                                // frames CBL stays high after block start (inferred)
const LOCK_T=0.02;                              // receiver lock time (inferred)
const PW=1720, PH=321;                          // silk pixels (200 dpi; 8.6 × 1.6 in face)
const WHITE='#f0f0ec', GREEN='rgb(52,168,83)';
/* PORTB bit → front LED, from the ISS3 netlist (P1-n ↔ J1-n) and the firmware */
const LEDS=[ // bit, name on silk, colour (netlist value), x, y, side of label
  {bit:2, sl:'SL1', name:'48K',        col:'#7dff6a', x:430, y:120, lab:'L'},
  {bit:1, sl:'SL2', name:'44.1K',      col:'#7dff6a', x:430, y:150, lab:'L'},
  {bit:0, sl:'SL3', name:'32K',        col:'#7dff6a', x:430, y:180, lab:'L'},
  {bit:7, sl:'SL4', name:'LOCK',       col:'#7dff6a', x:430, y:210, lab:'L'},
  {bit:6, sl:'SL5', name:'CRC ERR',    col:'#ff4a3a', x:481, y:120, lab:'R'},
  {bit:5, sl:'SL6', name:'CONFIDENCE', col:'#ffd23a', x:481, y:150, lab:'R'},
  {bit:4, sl:'SL7', name:'CONSUMER',   col:'#7dff6a', x:481, y:180, lab:'R'},
  {bit:3, sl:'SL8', name:'PHASE',      col:'#ff4a3a', x:481, y:210, lab:'R'}];
const TESTNAME={2:'48',1:'44',0:'32',7:'LOCK',6:'CONF',5:'CRC',4:'PHASE',3:'CONS'};   // the comments in TEST
const TEST_ORDER=[2,1,0,7,6,5,4,3];
/* CS8412 error and frequency codes (E2..E0, F2..F0) and the firmware's tables */
const ECODE=[['none','no error'],['validity','validity bit high'],['confidence','confidence flag'],['slip','slipped sample'],['crc','CRC error (pro only)'],['parity','parity error'],['biphase','bi-phase coding error'],['nolock','no lock']];
const TABLE1=[0x40,0x80,0x10,0x20,0x02,0x08,0x10,0x04];     // RETLW values, in order
const TABLE2=[0x00,0x04,0x02,0x01,0x04,0x02,0x00,0x01];
const T1C=['NOERR','VALIDITY BIT','CONFIDENCE','—','CRC ERROR','—','—','NO LOCK'], T2C=['OUT OF RANGE','48','44','32','48','44','OUT','32'];
const FSOPT=[[48000,4,'48 kHz'],[44100,5,'44.1 kHz'],[32000,7,'32 kHz'],[44056,6,'44.056 kHz (video pull-down)'],[96000,0,'96 kHz (out of range)']];
/* ---- bar thresholds, computed from the ISS3 netlist values ---- */
const VREF=1.25, G13=1+20/3.57, OFF13=(20/1000)*13.7;   // U13: 1 + R63/R62; offset R63/R64 × 13.7 V (see sheet 4)
const U17REF=1.25+ (1.25/1.62)*4.75;          // REFOUT = REFADJ + 1.25; REFADJ = 1.25/R75·R74
const lm = (fs,n) => fs*Math.pow(10,-3*(10-n)/20);   // LM3915 comparator n (1..10), 3 dB steps below full scale
const VU0 = lm(VREF,9);                               // 0 VU = U16 comparator 9 (0.885 V); then the top lands on 3, 6, 9, 12 like the printed legend
const THR=[].concat(
  [1,3,5,6,7,8,9,10].map(n=>({u:'U15',n,v:(lm(VREF,n)+OFF13)/G13})),
  [2,3,4,5,6,7,8,9,10].map(n=>({u:'U16',n,v:lm(VREF,n)})),
  [7,8,9].map(n=>({u:'U17',n,v:lm(U17REF,n)}))).sort((a,b)=>a.v-b.v);
THR.forEach(o=>o.db=20*Math.log10(o.v/VU0));
const LEGEND=['-36','-33','-30','-27','-24','-20','-10','-7','-5','-3','-1','0','1','2','3','6','9','12'];   // POD11MAN.CDR / POD11LYO.CDR
const BARX=i=>684+29.11*i;
/* VU detector: U10 (L) / U11 (R) full-wave + Rauch 2-pole low-pass: R46 1M, R47 100k, C24 1µ, C23 47n; inputs R51 200k / R48 100k */
const RIN=1/(1/200e3+1/100e3), W0=1/Math.sqrt(1e6*100e3*1e-6*47e-9), QF=Math.sqrt(1e-6*47e-9*1e6*100e3)/(47e-9*(1e6+100e3+1e6*100e3/RIN));
const KDET=1e6/200e3;                       // 5 × |v| (−5·v + 10·half-wave), averaged
const DACFS=1.0;                            // CS4330 full scale ≈ 1 V rms (inferred)
const U8G=1+20/20;                          // U8: R35/R34 = 20k/20k → LEFT = 2 × DAC
/* ---------------- device state ---------------- */
const D={ fw:'V101', wdt:true, power:true, powT:-1, plugged:true, plugT:-1, ver:'110',
  fsi:0, pro:true, err:'none', sig:{prog:'tone', f:1000, dbfs:-20, phase:0, rOff:0},
  trim:{LVU:0.983, RVU:0.983, LLVL:0.5, RLVL:0.5}, vol:0.5, hdst:false, log:[] };
const FACT=JSON.parse(JSON.stringify(D));
const FS=()=>FSOPT[D.fsi][0];
const at = (t0,state,t)=> t0<0 ? state : (t>=t0 ? state : !state);
const powered = t => at(D.powT, D.power, t);
const plugged = t => at(D.plugT, D.plugged, t);
function onSince(t){ const a = D.powT>=0 && D.power && t>=D.powT ? D.powT : -1e9; const b = D.plugT>=0 && D.plugged && t>=D.plugT ? D.plugT : -1e9; return Math.max(a,b); }
function lock(t){ return powered(t) && plugged(t) && (t - onSince(t)) >= LOCK_T; }
function errCode(t){ if (!lock(t)) return 7; const e=ECODE.findIndex(x=>x[0]===D.err); if (e===4 && !D.pro) return 0; return e; }   // receiver checks CRC only in pro mode (inferred)
/* ---------------- the firmware, pass by pass ---------------- */
function readPass(t){   // what CBLOK…DIGMUX computes from the receiver
  const ec=errCode(t), ERR=TABLE1[ec]; let FREQ=TABLE2[FSOPT[D.fsi][1]];
  const C0 = D.pro?1:0;                   // RA5 = C0 with SEL high = channel-status bit 0 (PRO)
  if (C0) FREQ|=0x10;                     // "TEST FOR PRO\CONSUMER  BTFSC STAT,5 / BSF FREQ,4"
  if (ERR&0x02) FREQ|=0x40;               // CRC
  if (FREQ&0x10) FREQ&=~0x40;             // "NO CRC IN CONSUMER MODE"
  if (!(ERR&0x04)) FREQ|=0x80;            // in lock
  if (ERR&0x10) FREQ|=0x20;               // confidence
  const lk=!(ERR&0x04); if (!lk) FREQ=0;  // "BLANK DISPLAY IF NO LOCK"
  return {ec, ERR, FREQ, lk, C0};
}
let EV=null, EVKEY='';
function events(){
  const key=JSON.stringify([D.fw,D.wdt,D.power,D.powT,D.plugged,D.plugT,D.fsi,D.pro,D.err]); if (key===EVKEY) return EV; EVKEY=key;
  const ev=[]; const fs=FS(); const blk=192/fs;
  let t=0, mux=0, portb=0, side=null, lastClr=0;
  const push=(o)=>{ ev.push(Object.assign({portb, side, lastClr},o)); };
  const boot=(tb,why)=>{ portb=0; side=null; push({t:tb,kind:'boot',label:`${why} → RESET: CALL INIT · DELAY (DELAY2 = 0xFF, ${SIM.fmtDur(T_INIT)})`,pc:'INIT'});
    let tt=tb+T_INIT; TEST_ORDER.forEach(b=>{ portb=1<<b; push({t:tt,kind:'test',label:`TEST: BSF PORTB,${b} ;${TESTNAME[b]} · CALL DELVIS (${SIM.fmtDur(T_VIS)})`,pc:'TEST',bit:b}); tt+=T_VIS; });
    portb=0; push({t:tt,kind:'boot',label:'RESET: CALL DELVIS · CALL DELVIS (dark)',pc:'RESET'}); tt+=2*T_VIS; mux=0; return tt; };
  // where do we start?
  if (!powered(0)){ push({t:0,kind:'off',label:'Power off',pc:'—'}); if (D.powT>=0 && D.power){ t=boot(D.powT,'Power on'); } else { EV=ev; return ev; } }
  else if (D.powT===0 && D.power){ t=boot(0,'Power on'); }
  else { const r0=readPass(0); portb=r0.FREQ; side=r0.lk?'L':null; mux=1; push({t:0,kind:'bar',label:'MAIN loop already running (powered and locked before t = 0); L bar enabled',pc:'DIGMUX',r:r0}); }
  const offAt = (D.powT>0 && !D.power) ? D.powT : 1e9;
  let guard=0;
  while (t<DUR && guard++<20000){
    if (t>=offAt){ portb=0; side=null; push({t:offAt,kind:'off',label:'Power off',pc:'—'}); break; }
    lastClr=t;                                          // MAIN: CLRWDT
    let tk;
    if (D.fw==='V10X'){ tk=t+T_VIS2+12*TCY; }          // CALL DELVIS2, no CBL sync
    else {
      tk=Math.ceil((t+1e-9)/blk)*blk;                   // CBL0: wait for CBL = 1
      if (!lock(tk)){                                   // no CBL edges while unlocked (inferred) → stuck in CBL0
        const tr = lastClr + T_WDT;
        push({t, kind:'stall', label:'CBL0: BTFSS PORTC,3 / GOTO CBL0 — no CBL edge, waiting'+(D.wdt?` (WDT fires at ${SIM.fmtT(tr)})`:' (watchdog disabled: forever)'), pc:'CBL0'});
        let tl=-1; for (let s=tk; s<Math.min(DUR,offAt); s+=0.001){ if (lock(s)){ tl=s; break; } }
        if (tl>=0 && (!D.wdt || tl<tr)){ t=tl; continue; }
        if (D.wdt && tr<Math.min(DUR,offAt)){ t=boot(tr,'Watchdog time-out'); continue; }
        break;
      }
    }
    const r=readPass(tk), st=SIM.fmtDur;
    push({t:tk,kind:'read',label:`CBLOK: ${D.fw==='V101'?'CLRWDT · ':''}SEL low → E2..E0 = ${r.ec.toString(2).padStart(3,'0')} → TABLE1 = ${r.ERR.toString(2).padStart(8,'0')}; F → TABLE2; SEL high, CS12 0/1 → C-bits`,pc:'CBLOK',r});
    if (D.fw==='V101') lastClr=tk;
    const td = D.fw==='V10X' ? tk+70*TCY : tk+CBL_HI/fs;      // READSTAT: wait for CBL to go low
    if (D.fw!=='V10X') push({t:tk+70*TCY,kind:'wait',label:'READSTAT: BTFSC PORTC,3 — waiting for CBL to go low',pc:'READSTAT',r});
    portb=r.FREQ; side=null;
    push({t:td,kind:'dig',label:`DIGMUX: MOVF FREQ,W / MOVWF PORTB = ${portb.toString(2).padStart(8,'0')} · BCF PORTC,4..7 (both bars and switches off)`,pc:'DIGMUX',r});
    const s = mux? 'R':'L';
    if (r.lk){ push({t:td+6*TCY+NOP_GAP,kind:'sw',label:`BSF PORTC,${s==='L'?7:6} — ${s==='L'?'L_SEL':'R_SEL'}: 74HC4053 routes the ${s} detector to HIGH`,pc:s==='L'?'DIGMUX':'MUX1D',r});
      side=s; push({t:td+8*TCY+NOP_GAP+NOP_GAP2,kind:'bar',label:`BSF PORTC,${s==='L'?5:4} — ${s==='L'?'LBAR → Q3 → Q4':'RBAR → Q2 → Q1'}: ${s} bar rail on`,pc:s==='L'?'DIGMUX':'MUX1D',r}); }
    mux^=1;
    t = td + PASS_CY*TCY*0.6;
  }
  EV=ev; return ev;
}
function evAt(t){ const ev=events(); let lo=0, hi=ev.length-1, k=-1; while(lo<=hi){ const m=(lo+hi)>>1; if (ev[m].t<=t){ k=m; lo=m+1; } else hi=m-1; } return k<0? {t:0,kind:'off',portb:0,side:null,label:'—',pc:'—'} : ev[k]; }
function evIndex(t){ const ev=events(); let k=0; for (let i=0;i<ev.length;i++){ if (ev[i].t<=t) k=i; else break; } return k; }
/* ---------------- programme and analog detectors ---------------- */
function amp(ch,t){ if (!lock(t)) return 0; const s=D.sig;   // DAC output muted without lock (inferred)
  let a=Math.pow(10,(s.dbfs+(ch?s.rOff:0))/20);
  if (s.prog==='bursts') a*= (t%0.5)<0.12?1:0; else if (s.prog==='step') a*= t>=0.2?1:0;
  else if (s.prog==='speech'){ const e=0.5+0.5*Math.sin(2*Math.PI*3.1*t)*Math.sin(2*Math.PI*0.7*t+1); a*=Math.max(0,e)*(1+0.4*Math.sin(2*Math.PI*11*t)); }
  return a; }
const sample=(ch,t)=>amp(ch,t)*Math.sin(2*Math.PI*D.sig.f*t+(ch?D.sig.phase*Math.PI/180:0));
const vLeft=(ch,t)=>amp(ch,t)*DACFS*U8G;                     // V rms at LEFT / RIGHT
let DC=null, DKEY='';
function det(){
  const key=JSON.stringify([D.sig,D.trim,D.power,D.powT,D.plugged,D.plugT,D.fsi]); if (key===DKEY) return DC; DKEY=key;
  const dt=0.00025, N=Math.round(DUR/dt)+1, out=[[],[]];
  for (let ch=0;ch<2;ch++){ const tr=ch?D.trim.RVU:D.trim.LVU; let y=KDET*0.9003*vLeft(ch,0)*tr, yd=0;   // settled at t = 0
    for (let n=0;n<N;n++){ const t=n*dt, x=KDET*0.9003*vLeft(ch,t)*tr;      // rectified mean of a sine = 0.9003 × rms
      const acc=W0*W0*(x-y)-(W0/QF)*yd; yd+=acc*dt; y+=yd*dt; out[ch].push(clamp(y,-0.6,5.6)); } }   // D14/D15 1N752A clamp at 5.6 V
  DC={dt,out}; return DC; }
const vdet=(ch,t)=>{ const c=det(); return c.out[ch][clamp(Math.round(t/c.dt),0,c.out[ch].length-1)]; };
const vuDb=(ch,t)=>{ const v=vdet(ch,t); return v>1e-4? 20*Math.log10(v/VU0) : -99; };
const litN=(ch,t)=>{ const v=vdet(ch,t); let n=0; THR.forEach(o=>{ if (v>=o.v) n++; }); return n; };
function phaseLed(t){ // U9 zero-cross comparators (62 mV), U19 XOR, R39/C87 47k·0.1µ, U20 vs 3.09 V (R43/R82)
  const thr=0.062*Math.SQRT1_2;   // peak must pass R44/R40 13.7 V × 1k/221k if (vLeft(0,t)<thr || vLeft(1,t)<thr || !powered(t)) return false;
  const ph=Math.abs(((D.sig.phase%360)+360)%360); const p=ph>180?360-ph:ph; return p/180 > 3.09/5; }
/* front-panel state at t; persist = show what the eye sees (both bars) rather than the 4 ms multiplex */
function panelState(t, persist){
  const e=evAt(t), on=powered(t);
  const st={ pwr:on, portb:on?e.portb:0, side:on?e.side:null, ev:e, bars:[0,0] };
  const running = e.r && e.r.lk && e.kind!=='stall';
  [0,1].forEach(ch=>{ const s=ch?'R':'L'; const shown = persist && running ? true : e.side===s;
    st.bars[ch] = on && shown ? litN(ch,t) : 0; });
  return st; }
/* ---------------- actions (each logs the firmware/circuit path) ---------------- */
const act=makeActor(D, ()=>{ const e=evAt(SIM.t); return `${e.pc} · PORTB ${e.portb.toString(2).padStart(8,'0')}`; });
const A={
  power(){ act(D.power?'Power rocker → O (off)':'Power rocker → I (on)', tr=>{ D.power=!D.power; D.powT=SIM.t; EVKEY=''; DKEY='';
    if (D.power){ tr('PWRSW → T1 toroid → D1–D4 bridge → LM317 (REG1, R77 221 / R76 2K2 ≈ +13.7 V on the net called “+5V”) → 7805 (REG2) → +5VC for the PIC and CS8412');
      tr(`PIC16C73A reset vector ORG 0 → CALL INIT: DELAY with DELAY2 = 0xFF (${SIM.fmtDur(T_INIT)}), CLRF PORTB/PORTC, TRISB = 0, TRISC = 0b00001000`);
      tr(`TEST: BSF PORTB,2 / 1 / 0 / 7 / 6 / 5 / 4 / 3, each followed by DELVIS (DELAY2 = 0xEF → ${SIM.fmtDur(T_VIS)}, then CLRF PORTB): a one-at-a-time chase`);
      tr(`Timer 2 set up (PR2 = 0x4F, TMR2IE) but T2CON = 0 and INTCON = 0, so T2INT never runs`);
      tr(`RESET: CALL DELVIS twice, GOTO MAIN at ≈ ${SIM.fmtT(SIM.t+T_INIT+10*T_VIS)}`); }
    else tr('All rails collapse: PORTB, bars and the PWR lamp go dark'); }); },
  plug(){ act(D.plugged?'Unplug the AES input':'Plug in the AES input', tr=>{ D.plugged=!D.plugged; D.plugT=SIM.t; EVKEY=''; DKEY='';
    if (D.plugged){ tr(`AES ${D.ver==='110'?'XLR-F → T2 PE-65612 transformer, R4 110 Ω':'BNC adaptor (BNCADAPT.DWG) → T2'} → CS8412 RXP/RXN (pins 9/10)`); tr(`CS8412 locks (≈${LOCK_T*1000} ms, ${inf}); E2..E0 leave 111; CBL starts pulsing every 192 frames`); }
    else { tr('CS8412 reports E2..E0 = 111 (NO LOCK) and mutes the DAC data (inferred)');
      if (D.fw==='V10X') tr('V10X has no CBL wait: next pass reads ERR = 0x04 → CLRF FREQ → PORTB = 0, bars not re-enabled. Clean blank.');
      else { tr(`${D.fw}: MAIN reaches CBL0 and waits for CBL = 1, which no longer comes (${inf}). PORTB and the last enabled bar stay as they were: LOCK stays lit.`);
        tr(D.wdt?`No CLRWDT inside CBL0 → watchdog resets the PIC ${SIM.fmtDur(T_WDT)} after the last CLRWDT → INIT and the LED chase again, then stuck again`:'Watchdog disabled in the config word: the display freezes for good'); } } }); },
  fs(i){ act(`Source sample rate → ${FSOPT[i][2]}`, tr=>{ D.fsi=i; EVKEY=''; const c=FSOPT[i][1];
    tr(`FCK = 6.144 MHz (X1 through U1 74HC00, gated by RC0 “CS12_OSC”) lets the CS8412 measure the rate: F2..F0 = ${c.toString(2).padStart(3,'0')}`);
    tr(`Firmware: BTFSC PORTA,2/0/1 → FREQ → CALL TABLE2 → RETLW ${TABLE2[c].toString(2).padStart(8,'0')} ;${T2C[c]}`);
    tr(`Loop rate follows CBL: one pass per 192 frames = ${(FSOPT[i][0]/192).toFixed(1)} passes/s, each bar refreshed ${(FSOPT[i][0]/384).toFixed(1)} times a second`); }); },
  pro(v){ act(`Source channel status → ${v?'professional':'consumer'}`, tr=>{ D.pro=v; EVKEY='';
    tr(`Channel-status byte 0 bit 0 = ${v?1:0}; with SEL high the CS8412 shows it on pin 6 (C0) → RA5 → STAT,5`);
    tr(`BTFSC STAT,5 / BSF FREQ,4 → RB4 → SL7 “CONSUMER” ${v?'LIGHTS for a professional stream':'stays dark for a consumer stream'} (see Findings)`); }); },
  err(k){ act(`Inject receiver condition → ${ECODE.find(x=>x[0]===k)[1]}`, tr=>{ D.err=k; EVKEY=''; const e=ECODE.findIndex(x=>x[0]===k), ec=(e===4&&!D.pro)?0:e;
    tr(`CS8412 E2..E0 = ${ec.toString(2).padStart(3,'0')} → RA3..RA5 → ERR → CALL TABLE1 → RETLW ${TABLE1[ec].toString(2).padStart(8,'0')} ;${T1C[ec]}`);
    const lit = ec===4&&D.pro? 'nothing (CRC is masked: FREQ,4 is set for pro)' : ec===2||ec===6 ? 'CONFIDENCE (ERR,4)' : ec===0? 'nothing' : 'nothing: the code never tests this TABLE1 bit';
    tr(`LED: ${lit}`); }); },
  set(k,v,l){ act(l, tr=>{ D.sig[k]=v; DKEY=''; tr(k==='phase'?`U9 LM393 zero-cross comparators → U19 74HC00 XOR → R39/C87 (4.7 ms) → U20 vs 3.09 V: PHASE ${phaseLed(SIM.t)?'lights':'stays dark'} (lights above 111°)`:'CS4330 output → U8 (×2) → LEFT/RIGHT → LVU/RVU trims → U10/U11 detectors'); }); },
  trim(k,d){ act(`Trim ${k} ${d>0?'clockwise':'counter-clockwise'}`, tr=>{ D.trim[k]=clamp(D.trim[k]+d*0.02,0,1); DKEY='';
    tr(k[1]==='V'?`${k} wiper = ${(D.trim[k]*100).toFixed(0)} % of ${k[0]==='L'?'LEFT':'RIGHT'} → R50/R51 into ${k[0]==='L'?'U10':'U11'}. A −20 dBFS tone now reads ${fdb(20*Math.log10(Math.max(1e-6,KDET*0.9003*0.1*DACFS*U8G*D.trim[k])/VU0))} VU`:`${k} sets the ${k[0]} balanced output gain (U${k[0]==='L'?6:5}) (${inf})`); }); },
  vol(d){ act(`HEADSET volume ${d>0?'up':'down'}`, tr=>{ D.vol=clamp(D.vol+d*0.05,0,1); tr(`RV1 (TOCOS dual pot) wiper ${(D.vol*100).toFixed(0)} % → U14 NE5532 → R67/R68 30 Ω → HDST tip/ring`); }); },
  ver(v){ act(`Rear version → POD11 / ${v} REAR`, tr=>{ D.ver=v; tr(v==='110'?'XLR-F input (POD11MAN.CDR “POD11 / 110 REAR”; AESIN XLR3F in the netlist)':'BNC input (“POD11 / 75 REAR”; BNCADAPT.DWG)'); }); },
  fw(v){ act(`Firmware → ${v}`, tr=>{ D.fw=v; EVKEY=''; tr(v==='V10X'?'PD11V10X.ASM: MAIN calls DELVIS2 (0.67 ms) instead of waiting for CBL — free-running, handles loss of lock':v==='V100'?'PD11V100.ASM: CLRWDT only at MAIN':'PD11V101.ASM: adds CLRWDT at CBLOK (“WATCH DOG timer is cleared in the CBL loop”)'); }); },
  wdt(){ act(`Config word: watchdog ${D.wdt?'off':'on'}`, tr=>{ D.wdt=!D.wdt; EVKEY=''; tr(`No __CONFIG in the source, so the WDTE fuse was set in the programmer (${inf})`); }); },
  scen(n){ act(`Scenario: ${n}`, tr=>{ Object.assign(D, JSON.parse(JSON.stringify(FACT)), {log:D.log}); EVKEY=''; DKEY='';
    if (n==='power-up at 0.1 s'){ D.power=true; D.powT=0.1; tr('Rocker switched on at 0.1 s: INIT, LED chase, then MAIN at ≈1.86 s'); }
    if (n==='unplug at 0.4 s'){ D.plugged=false; D.plugT=0.4; tr('Cable pulled at 0.4 s'); }
    if (n==='bursts'){ D.sig.prog='bursts'; D.sig.dbfs=-10; tr('120 ms bursts at −10 dBFS: the VU filter (2.3 Hz, Q 0.56) never reaches the burst level'); } }); },
  reset(){ Object.assign(D, JSON.parse(JSON.stringify(FACT))); EVKEY=''; DKEY=''; SIM.refresh(); },
};
/* ---------------- panels (POD11SLK.CDR separations + re-anchored text) ---------------- */
function T(x,y,s,sz,anchor,col,extra){ return `<text x="${x}" y="${y}" font-size="${sz||17}" fill="${col||WHITE}" ${anchor?`text-anchor="${anchor}"`:''} ${extra||''} style="font-family:Arial,Helvetica,sans-serif">${s}</text>`; }
function panelSVG(side, under, over, label){
  return `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${label}" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="glowfront" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${PW}" height="${PH}" rx="10" fill="#17191b"/>${under||''}
    <image href="${ASSET}${PREFIX}-${side}.svg" width="${PW}" height="${PH}"/>
    ${over||''}${screw(51,160)}${screw(1672,160)}</svg>`; }
function knob(x,y,frac){ const a=(-135+270*frac)*Math.PI/180; return `<g class="vol" style="cursor:pointer"><title>HEADSET volume (RV1): click right half to turn up, left half down, or use the wheel</title><circle cx="${x}" cy="${y}" r="44" fill="transparent"/>
  <circle cx="${x}" cy="${y}" r="36" fill="#2a2d31" stroke="#55595c" stroke-width="3"/>${[...Array(18)].map((_,i)=>{ const b=i*20*Math.PI/180; return `<line x1="${x+Math.sin(b)*31}" y1="${y-Math.cos(b)*31}" x2="${x+Math.sin(b)*36}" y2="${y-Math.cos(b)*36}" stroke="#45484c" stroke-width="3"/>`; }).join('')}
  <line x1="${x}" y1="${y}" x2="${x+Math.sin(a)*28}" y2="${y-Math.cos(a)*28}" stroke="${WHITE}" stroke-width="4" stroke-linecap="round"/></g>`; }
function jack(x,y,plugged){ return `<g class="hj" style="cursor:pointer"><title>HEADSET jack (HDST): click to plug headphones in or out</title><circle cx="${x}" cy="${y}" r="34" fill="#b9bcbf" stroke="#6b6f73" stroke-width="3"/><circle cx="${x}" cy="${y}" r="24" fill="#0c0d0e"/><circle cx="${x}" cy="${y}" r="9" fill="#333"/>${plugged?`<circle cx="${x}" cy="${y}" r="22" fill="#2b5f9e"/><rect x="${x-8}" y="${y+18}" width="16" height="60" fill="#2b5f9e"/>`:''}</g>`; }
function frontSVG(t, persist){
  const s=panelState(t, persist);
  let o = T(388,31,'POD-11 AES/EBU MONITOR',16.5,'middle') + T(1665,300,'by Ward-Beck Systems',22,'end',GREEN) + T(55,300,'PODS',30,'start',WHITE,'font-weight="700" letter-spacing="3"')
    + T(660,80,'CHANNEL  A',15,'end') + T(660,255,'CHANNEL  B',15,'end') + T(1522,108,'HEADSET',15,'middle');
  LEGEND.forEach((l,i)=>{ o+=T(BARX(i+2).toFixed(1),167,l,13,'middle'); });
  LEDS.forEach(L=>{ o += T(L.lab==='L'?L.x-18:L.x+18, L.y+5, L.name, 12.5, L.lab==='L'?'end':'start'); });
  o += rocker(s.pwr || D.power, 124, 66);
  o += led(300,222,s.pwr,'#7dff6a',8);
  LEDS.forEach(L=>{ const on = L.bit===3 ? (phaseLed(t) && s.pwr) : !!(s.portb>>L.bit & 1); o+=led(L.x,L.y,on,L.col,8); });
  [0,1].forEach(ch=>{ const y=ch?236:58, n=s.bars[ch];
    for (let i=0;i<20;i++){ const on=i<n, db=THR[i].db, col=db>=3?'#ff3b30':db>=0?'#ffb43a':'#7dff6a';
      o+=`<rect x="${(BARX(i)-10).toFixed(1)}" y="${y}" width="20" height="28" rx="2" fill="${on?col:'#2a2f2a'}" ${on?'filter="url(#glowfront)"':''}><title>${ch?'R':'L'} LED ${i+1}: ${THR[i].u} comparator ${THR[i].n}, ${THR[i].v.toFixed(3)} V at the detector = ${fdb(db)} VU (computed)</title></rect>`; } });
  o += knob(1366,225,D.vol) + jack(1522,160,D.hdst);
  return panelSVG('front','',o,'POD11 front panel (silk from POD11SLK.CDR, text re-anchored)'); }
function rearSVG(){
  let o = T(264,52,'ANALOG  OUTPUTS',15,'middle') + T(264,72,'UNBAL',13,'middle') + T(735,52,'ANALOG  OUTPUTS',15,'middle') + T(735,72,'BAL',13,'middle')
    + T(1121,72,'AES  INPUT',15,'middle') + T(1121,92,D.ver==='110'?'110 Ω':'75 Ω',12,'middle')
    + T(205,232,'A',14,'middle') + T(325,232,'B',14,'middle') + T(652,268,'A',14,'middle') + T(818,268,'B',14,'middle')
    + T(1367,112,'FUSE',13,'middle') + T(1450,276,'115 VAC, 1/2 A.S.B.',13,'middle') + T(1450,296,'DISCONNECT POWER BEFORE SERVICING',11,'middle');
  o += rca(205,160,'#e8e8e8',false) + rca(325,160,'#d33a2c',false) + xlr(652,175,true,false) + xlr(818,175,true,false);
  o += D.ver==='110' ? xlr(1121,175,false,D.plugged,'inp','AES INPUT (XLR-F, 110 Ω) — click to plug/unplug') : bnc(1121,175,D.plugged,'inp','AES INPUT (75 Ω BNC adaptor) — click to plug/unplug',40);
  o += `<circle cx="1367" cy="164" r="34" fill="#1d2023" stroke="#55595c" stroke-width="3"/><rect x="1352" y="158" width="30" height="12" rx="2" fill="#55595c"/>`;
  o += `<rect x="1500" y="118" width="80" height="100" rx="20" fill="#0c0d0e" stroke="#2c2f33" stroke-width="3"/><path d="M1540 168 C1600 168 1620 240 1640 321" stroke="#0c0d0e" stroke-width="30" fill="none"/>`;
  return panelSVG('rear','',o,'POD11 rear panel (silk from POD11SLK.CDR, connectors from POD11MAN.CDR)'); }
function bindPanel(root){
  root.querySelectorAll('.pwr').forEach(g=>g.onclick=()=>A.power());
  root.querySelectorAll('.inp').forEach(g=>g.onclick=()=>A.plug());
  root.querySelectorAll('.hj').forEach(g=>g.onclick=()=>act(D.hdst?'Unplug headphones':'Plug in headphones', tr=>{ D.hdst=!D.hdst; tr('HDST TRS jack: tip/ring from U14 via R67/R68 30 Ω'); }));
  bindTrim(root,'vol',d=>A.vol(d)); }
function trimStrip(){ const k=['LVU','RVU','LLVL','RLVL'];
  return `<svg viewBox="0 0 640 96" style="width:100%;max-width:520px;background:#0e5d2b;border-radius:6px">${k.map((n,i)=>trim(60+i*150,46,D.trim[n],'tr'+n,`${n} (20 k trimmer)`)+`<text x="${60+i*150}" y="90" text-anchor="middle" font-size="13" fill="#e8f5e9">${n} ${(D.trim[n]*100).toFixed(0)}%</text>`).join('')}</svg>`; }
function bindTrims(root){ ['LVU','RVU','LLVL','RLVL'].forEach(n=>bindTrim(root,'tr'+n,d=>A.trim(n,d))); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;align-items:center">
  <label>Programme <select id="pg">${[['tone','steady tone'],['bursts','120 ms bursts'],['step','tone from 200 ms'],['speech','speech-like']].map(([v,l])=>`<option value="${v}" ${v===D.sig.prog?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Level <input id="lv" type="number" step="1" value="${D.sig.dbfs}" style="width:56px"> dBFS</label>
  <label>R phase <select id="ph">${[0,45,90,135,180].map(p=>`<option ${p===D.sig.phase?'selected':''}>${p}</option>`).join('')}</select>°</label>
  <label>Rate <select id="fsr">${FSOPT.map((f,i)=>`<option value="${i}" ${i===D.fsi?'selected':''}>${f[2]}</option>`).join('')}</select></label>
  <label>Status <select id="pro"><option value="1" ${D.pro?'selected':''}>professional</option><option value="0" ${D.pro?'':'selected'}>consumer</option></select></label>
  <label>Receiver <select id="er">${ECODE.slice(0,7).map(e=>`<option value="${e[0]}" ${e[0]===D.err?'selected':''}>${e[1]}</option>`).join('')}</select></label>
  <label>Firmware <select id="fw">${['V100','V101','V10X'].map(v=>`<option ${v===D.fw?'selected':''}>${v}</option>`).join('')}</select></label>
  <label><input type="checkbox" id="wd" ${D.wdt?'checked':''}> watchdog on</label>
  <label>Rear <select id="vr"><option value="110" ${D.ver==='110'?'selected':''}>110 Ω XLR</option><option value="75" ${D.ver==='75'?'selected':''}>75 Ω BNC</option></select></label></div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">Scenarios: <button data-sc="power-up at 0.1 s">Power up at 0.1 s</button><button data-sc="unplug at 0.4 s">Unplug at 0.4 s</button><button data-sc="bursts">Bursts</button><button data-sc="steady">Steady (factory)</button></div>
  <div class="small muted">Click the rocker, the rear AES input, the headset jack and volume knob. Keys: P power, I input, 1–3 rate, C consumer/pro. The internal trims are on the board strip below.</div>`; }
function bindControls(root){ const g=s=>root.querySelector(s); if (!g('#pg')) return;
  g('#pg').onchange=e=>A.set('prog',e.target.value,'Programme → '+e.target.selectedOptions[0].text);
  g('#lv').onchange=e=>A.set('dbfs',Math.min(0,+e.target.value),'Level → '+e.target.value+' dBFS');
  g('#ph').onchange=e=>A.set('phase',+e.target.value,'R phase → '+e.target.value+'°');
  g('#fsr').onchange=e=>A.fs(+e.target.value); g('#pro').onchange=e=>A.pro(e.target.value==='1'); g('#er').onchange=e=>A.err(e.target.value);
  g('#fw').onchange=e=>A.fw(e.target.value); g('#wd').onchange=()=>A.wdt(); g('#vr').onchange=e=>A.ver(e.target.value);
  root.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{ if (b.dataset.sc==='steady') { A.reset(); act('Scenario: steady (factory)',tr=>tr('Powered and locked before t = 0; 48 kHz professional, −20 dBFS tone')); } else A.scen(b.dataset.sc); }); }
bindKeys('__pod11Active', ()=>({p:()=>A.power(), i:()=>A.plug(), '1':()=>A.fs(0), '2':()=>A.fs(1), '3':()=>A.fs(2), c:()=>A.pro(!D.pro)}));
/* ---------------- timeline ---------------- */
function dbLane(label, fn, color){ return { label, h:46, draw(c,X,t0,t1,y,h){ const Y=v=>y+4+(1-(clamp(v,-30,15)+30)/45)*(h-8);
  c.strokeStyle=SIM.css('--grid'); [-20,-10,0,10].forEach(v=>{ c.beginPath(); c.moveTo(X(t0),Y(v)); c.lineTo(X(t1),Y(v)); c.stroke(); });
  c.fillStyle=SIM.css('--ink2'); c.font='9px sans-serif'; c.fillText('0 VU',X(t0)+2,Y(0)-1); c.fillText('−20',X(t0)+2,Y(-20)-1);
  c.strokeStyle=color; c.lineWidth=1.5; c.beginPath(); const N=Math.min(900,X(t1)-X(t0)); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=fn(tt); i?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); } c.stroke(); }}; }
const KCOL={boot:'#8a8f95',test:'#e3a35a',read:'#5aa9e6',wait:'#3d6f99',dig:'#4cc38a',sw:'#2f9e6a',bar:'#1f7a4d',stall:'#ff5a4a',off:'#444'};
function evLane(){ return {label:'PIC MAIN (pc)', h:30, draw(c,X,t0,t1,y,h){ const ev=events(); const px=X(t1)-X(t0);
  for (let i=0;i<ev.length;i++){ const a=ev[i].t, b=i+1<ev.length?ev[i+1].t:DUR; if (b<t0||a>t1) continue;
    const xa=Math.max(X(t0),X(a)), xb=Math.min(X(t1),X(b)); c.fillStyle=KCOL[ev[i].kind]||'#888'; c.fillRect(xa,y+4,Math.max(0.6,xb-xa),h-8);
    if (xb-xa>46){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(ev[i].pc, xa+3, y+h/2+4); } } }}; }
function portbLane(bit,name){ return boolLane(`RB${bit} ${name}`, t=>powered(t)&&!!(evAt(t).portb>>bit&1), bit===6||bit===3?'#e3453a':bit===5?'#d9b82a':'#3fbf5f', 13); }
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), w=SIM.css('--warn'), fs=FS();
  return [
    {label:`AES3 frames (${(fs/1000).toFixed(fs%1000?3:0)} kHz)`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.25/fs,b,'frames'); }},
    boolLane('CBL (block start, 192 fr)', t=>lock(t) && ((t*fs)%192)<CBL_HI, b, 16),
    evLane(),
    ...LEDS.map(L=>portbLane(L.bit,L.name)),
    boolLane('L_SEL / LBAR (RC7/RC5)', t=>powered(t)&&evAt(t).side==='L', '#3fbf5f', 14),
    boolLane('R_SEL / RBAR (RC6/RC4)', t=>powered(t)&&evAt(t).side==='R', '#5aa9e6', 14),
    waveLane('LEFT (V, U8 out)', t=>sample(0,t)*DACFS*U8G*Math.SQRT2, -0.05, 12.2, b, 34, Object.assign(t=>vLeft(0,t)*Math.SQRT2,{dense:(s,pw)=>s*D.sig.f>pw/3})),
    dbLane('L detector (U10) re 0 VU', t=>vuDb(0,t), a),
    {label:'Bar L / R lit LEDs (of 20)', h:26, draw(c,X,t0,t1,y,h){ const N=Math.min(400,(X(t1)-X(t0))/2), per=SIM.win>0.02;
      for (let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N, s=panelState(tt,per); [0,1].forEach(ch=>{ c.fillStyle=ch?b:a; c.fillRect(X(t0+(t1-t0)*i/N), y+2+ch*12, (X(t1)-X(t0))/N+0.5, 10*s.bars[ch]/20+0.3); }); } }},
    boolLane('PHASE (U20, analog)', t=>phaseLed(t), '#e3453a', 14),
    {label:'Watchdog (since CLRWDT)', h:20, draw(c,X,t0,t1,y,h){ const N=Math.min(400,X(t1)-X(t0)); c.fillStyle=w; for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*i/N, e=evAt(tt); if(!powered(tt)||!D.wdt) continue; const f=clamp((tt-e.lastClr)/T_WDT,0,1); c.fillRect(X(tt),y+h-2-f*(h-4),(X(t1)-X(t0))/N+0.5,f*(h-4)); } }},
  ]; }
/* ---------------- views ---------------- */
function nowTable(t){ const e=evAt(t), s=panelState(t,true), r=readPass(t);
  return `<table class="kv"><tr><th>PIC</th><td class="mono small">${e.label}</td></tr>
   <tr><th>Receiver</th><td class="mono">${lock(t)?'locked':'NO LOCK'} · E = ${errCode(t).toString(2).padStart(3,'0')} (${ECODE[errCode(t)][1]}) · ${FSOPT[D.fsi][2]} · ${D.pro?'PRO':'consumer'}</td></tr>
   <tr><th>PORTB</th><td class="mono">${s.portb.toString(2).padStart(8,'0')} → ${LEDS.filter(L=>L.bit!==3&&(s.portb>>L.bit&1)).map(L=>L.name).join(', ')||'all dark'}${phaseLed(t)?' · PHASE (analog)':''}</td></tr>
   <tr><th>Bar enabled now</th><td class="mono">${s.side||'none'} (PORTC ${s.side==='L'?'RC7+RC5':s.side==='R'?'RC6+RC4':'—'})</td></tr>
   <tr><th>Detectors</th><td class="mono">L ${vdet(0,t).toFixed(3)} V = ${fdb(vuDb(0,t))} VU (${litN(0,t)} LEDs) · R ${vdet(1,t).toFixed(3)} V = ${fdb(vuDb(1,t))} VU</td></tr></table>`; }
function viewSim(m){ window.__pod11Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Front panel at the playhead',`<div id="fp"></div>${controlsHTML()}`)}${card('Rear panel',`<div id="rp"></div><div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART_SLK,'POD11 - #SILK/POD11SLK.CDR')} (Aug 29 1997), vector GREEN + WHITE front plates and WHITE rear plate; lettering re-anchored from POD11MAN.CDR (libcdr loses the text positions).</div>`)}${card('Board trims (seen with the lid off)',`<div id="tr"></div>`)}</div>
   <div>${card('What the firmware and circuit did (last action)',`<div id="trace" class="log"></div>`)}${card('At the playhead',`<div id="now"></div>`)}${card('Action log',`<div id="log" class="log"></div>`)}</div></div>
   ${card('Timeline: 0–3 s (the second you care about is 0–1 s), zoomable down to single instructions',`<canvas id="tl"></canvas><p class="small muted">Zoom to 10 ms or less to see the 4 ms L/R multiplex: each bar is lit only while its rail is switched on. At 1 s zoom the panel shows what the eye sees.</p>`)}
   ${card('Scope: one AES3 frame at the playhead (channel-status bit 0 = PRO in frame 0 of each block)',`<canvas id="sc"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t, SIM.win>0.02); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp')); m.querySelector('#tr').innerHTML=trimStrip(); bindTrims(m.querySelector('#tr'));
    m.querySelector('#trace').innerHTML=traceHTML(D,'Click the rocker or the AES input, or change the source. Each step the PIC and the circuit take is listed here.');
    m.querySelector('#now').innerHTML=nowTable(t); m.querySelector('#log').innerHTML=logHTML(D);
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:190});
    const fs=FS(), n=Math.floor(t*fs), fr=n%192, sA=sample(0,t), sB=sample(1,t);
    const sub=(v,pre)=>{ const o=aesSub(v,pre,fr,D.pro); return o; };
    drawAesScope(m.querySelector('#sc'), sub(sA,fr===0?'Z':'X'), sub(sB,'Y'), fs, plugged(t)?1:0.05, `frame ${fr} of block ·`); };
  bindControls(m); SIM.on('time',draw); }
function aesSub(sample, pre, fr, pro){ let s=Math.round(clamp(sample,-1,0.99999988)*8388607); if (s<0) s+=1<<24;
  const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
  const cs0 = pro ? 0x01|0x04|0x20 : 0x04;   // pro: PRO=1, emphasis none, 48 kHz (bits 6-7 = 01 → 0x40 omitted for brevity); consumer: copy permitted (inferred)
  bits[30] = fr<8 ? (cs0>>fr)&1 : 0; let p=0; for (let b=4;b<31;b++) p^=bits[b]; bits[31]=p; return {pre,bits,raw:s}; }
const LESSONS=[
  {title:'Meet the POD11', body:`<p>The POD-11 AES/EBU MONITOR (1997|30) is a half-rack box that listens to one AES/EBU input. It converts the audio to analog for the rear <b>BAL</b> and <b>UNBAL</b> outputs and the front <b>HEADSET</b> jack, and shows each channel on a 20-LED bar (<b>CHANNEL A</b> and <b>CHANNEL B</b>). Eight status lamps show the sample rate (48K, 44.1K, 32K), LOCK, CONFIDENCE, CONSUMER, PHASE and CRC ERR.</p><p class="muted">No POD11 operating text survives. These steps follow the panel drawings (POD11MAN.CDR, POD11SLK.CDR), the firmware and the ISS3 netlist.</p>`, check:()=>true, auto:true},
  {title:'1 · Switch on and watch the lamp test', body:`<p>Click the rocker twice: off, then on. Then press <b>Play</b> or drag the playhead. The PIC waits ${SIM.fmtDur(T_INIT)}, then lights each status lamp alone for ${SIM.fmtDur(T_VIS)}: 48K, 44.1K, 32K, LOCK, CRC ERR, CONFIDENCE, CONSUMER, PHASE. It then stays dark for another ${SIM.fmtDur(2*T_VIS)} before the meters start.</p>`, check:()=>D.log.some(e=>e.name.includes('→ I (on)')), hint:'Click the rocker on the left of the front panel.'},
  {title:'2 · Connect the source', body:`<p>With the input plugged in, <b>LOCK</b> and <b>48K</b> light and the bars come alive. If the input is unplugged, click the rear AES INPUT.</p>`, check:()=>D.plugged&&D.power&&D.fsi===0, hint:'Rear panel: click the AES INPUT connector. Rate: 48 kHz.'},
  {title:'3 · Line up the meter', body:`<p>Send a steady tone at <b>−20 dBFS</b>. Adjust the <b>LVU</b> trim on the board strip until the CHANNEL A bar just lights the LED marked <b>0</b> (the detector reads 0 ±1 VU).</p>`, check:()=>D.sig.prog==='tone'&&D.sig.dbfs===-20&&Math.abs(vuDb(0,0.99))<1, hint:'Programme: steady tone, Level −20. The LVU trim is the first one on the green strip.'},
  {title:'4 · Change the sample rate', body:`<p>Set the source to <b>44.1 kHz</b>. The 44.1K lamp takes over. Then try <b>44.056 kHz</b>: the CS8412 reports it (code 110), but TABLE2 maps it to “OUT”, so no rate lamp lights.</p>`, check:()=>D.fsi===3, hint:'Rate → 44.056 kHz.'},
  {title:'5 · Professional or consumer?', body:`<p>Switch the source between <b>professional</b> and <b>consumer</b> channel status and watch the <b>CONSUMER</b> lamp. It lights for the professional stream. Findings explains why.</p>`, check:()=>D.log.some(e=>e.name.includes('→ consumer'))&&D.log.some(e=>e.name.includes('→ professional')), hint:'Status → consumer, then back to professional.'},
  {title:'6 · Check the phase', body:`<p>Set R phase to <b>180°</b>. The PHASE lamp lights: the U9/U19/U20 comparator chain sees the channels out of phase for more than 62 % of the time.</p>`, check:()=>D.sig.phase>=135, hint:'R phase → 180.'},
  {title:'7 · Lose the input', body:`<p>Use <b>Unplug at 0.4 s</b> and play through 3 s. With V1.01 the lamps freeze (LOCK stays lit) until the watchdog restarts the PIC at about 2.7 s. Then switch Firmware to <b>V10X</b> and run the same test: the panel blanks at once.</p>`, check:()=>!D.plugged&&D.fw==='V10X', hint:'Click “Unplug at 0.4 s”, then Firmware → V10X.'},
  {title:'Done', body:`<p>See <b>Findings</b> for the lamp-label mix-up, the CONSUMER inversion and the ISS2/ISS3 scale change.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__pod11Active=true; tutorialView(m,{title:'Tutorial: operating the POD11',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>{ A.reset(); D.log.length=0; },
  unitHTML:()=>`${frontSVG(SIM.t,true)}<div style="margin-top:8px">${rearSVG()}</div><div style="margin-top:6px">${trimStrip()}</div>${controlsHTML()}<div class="small">${nowTable(SIM.t)}</div>`, bind:r=>{ bindPanel(r); bindTrims(r); bindControls(r); }}); }
function viewSecond(m){ window.__pod11Active=true;
  m.innerHTML=`${card('One second, broken down',`<div id="tb"></div>`)}<div class="grid2">${card('The PIC at the playhead',`<div id="pc"></div>`)}${card('The panel at the playhead (instantaneous, no persistence of vision)',`<div id="fp"></div>`)}</div>${card('Zoom ladder: the L/R multiplex inside 20 ms',`<canvas id="lad"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, fs=FS();
    const rows=[['AES3 frames','<b>'+fs.toLocaleString()+'</b>',SIM.fmtDur(1/fs),'CS8412, 128 bit cells per frame ('+(fs*128/1e6).toFixed(3)+' Mbaud)'],
      ['Channel-status blocks (CBL)',(fs/192).toFixed(1),SIM.fmtDur(192/fs),'CBL rises on frame 0 of each 192-frame block; the V1.0x loop waits for it'],
      ['MAIN passes (V1.00/V1.01)',(fs/192).toFixed(1),SIM.fmtDur(192/fs),'one per block: CBL0 → CBLOK → READSTAT → DIGMUX'],
      ['MAIN passes (V10X)',(1/(T_VIS2+PASS_CY*TCY)).toFixed(0),SIM.fmtDur(T_VIS2+PASS_CY*TCY),'DELVIS2 (DELAY2 = 1) instead of CBL'],
      ['Bar refresh, each channel',(fs/384).toFixed(1),SIM.fmtDur(384/fs),'MUX,0 toggles each pass, so 50 % duty per bar'],
      ['PIC instruction cycle','1,536,000',SIM.fmtDur(TCY),'X1 6.144 MHz / 4 (also FCK for the CS8412)'],
      ['Break-before-make in DIGMUX','—',SIM.fmtDur(NOP_GAP)+' + '+SIM.fmtDur(NOP_GAP2),'22 NOPs after the switch-off, 23 more between the 4053 switch and the bar rail'],
      ['Lamp test step (DELVIS)','—',SIM.fmtDur(T_VIS),'DELAY2 = 0xEF × 1023 cycles. The comment “255·1/1.53MHz·2” predicts half that'],
      ['Watchdog','—',SIM.fmtDur(T_WDT),'18 ms × 1:128 prescaler (OPTION reset value) ('+inf+')'],
      ['VU detector','—',`f₀ ${(W0/2/Math.PI).toFixed(2)} Hz, Q ${QF.toFixed(2)}`,'U10/U11 Rauch low-pass: R46 1M, R47 100k, C24 1µ, C23 47n'],
      ['Phase filter','—','τ 4.7 ms','R39 47k × C87 0.1 µ after the U19 XOR']];
    m.querySelector('#tb').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>source</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#pc').innerHTML=nowTable(t)+`<p class="small mono">frame ${Math.floor(t*fs)%192} of block ${Math.floor(t*fs/192)} · instruction ${Math.floor(t/TCY).toLocaleString()}</p>`;
    m.querySelector('#fp').innerHTML=frontSVG(t,false);
    const {c,w}=SIM.canvas(m.querySelector('#lad'),150), spans=[0.02,0.005,0.0002]; const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
    spans.forEach((sp,i)=>{ const y=8+i*46, t0=clamp(t-sp/2,0,DUR-sp), x0=170, pw=w-x0-10; c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(SIM.fmtDur(sp)+' window',6,y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('green L rail · blue R rail · ticks = events',6,y+28);
      const N=Math.min(800,pw); for (let k=0;k<N;k++){ const tt=t0+sp*k/N, e=evAt(tt); c.fillStyle=e.side==='L'?'#3fbf5f':e.side==='R'?'#5aa9e6':SIM.css('--chip'); c.fillRect(x0+pw*k/N,y+4,pw/N+0.6,22); }
      events().forEach(e=>{ if (e.t>=t0&&e.t<=t0+sp){ c.fillStyle=ink; c.fillRect(x0+(e.t-t0)/sp*pw,y,1,30); } });
      c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(x0+(t-t0)/sp*pw,y); c.lineTo(x0+(t-t0)/sp*pw,y+32); c.stroke(); }); };
  SIM.on('time',draw); }
const BLOCKS={
  in:{x:20,y:20,w:170,h:80,t:'AES input',s:['XLR-F 110 Ω or BNC 75 Ω','T2 PE-65612, R4 110 Ω'],d:'AESIN XLR3F → C19 → T2 transformer → CS8412 pins 9/10. The 75 Ω rear uses a BNC adaptor (BNCADAPT.DWG).'},
  rx:{x:230,y:20,w:180,h:100,t:'CS8412 receiver (U2)',s:['E2..E0, F2..F0 / C-bits','CBL, SEL, CS12/FCK','I²S → CS4330'],d:'Crystal CS8412. With SEL low the six C pins carry the error and rate codes; with SEL high they carry channel-status bits, A or B picked by CS12. FCK gets 6.144 MHz from U1 (74HC00) for the rate measurement.'},
  pic:{x:230,y:160,w:180,h:100,t:'PIC16C73A (U3)',s:['RA0–5 ← C pins','RB0–7 → status LEDs','RC4–7 → bar multiplex'],d:'PD11V101.ASM. Polls the receiver once per channel-status block, writes PORTB, and alternates the L/R bar. Clock 6.144 MHz from U1. The ISS3 netlist calls the part PIC16C62-10 (symbol PIC16C63A).'},
  dac:{x:450,y:20,w:170,h:80,t:'CS4330 DAC (U4)',s:['AOUTL/R → C15/C16','U8 ×2 → LEFT/RIGHT'],d:'Pins 1–4 from CS8412 SDATA/SCK/FSYNC/MCK. U8 (NE5532) gain 1 + R35/R34 = 2.'},
  out:{x:660,y:20,w:170,h:100,t:'Outputs',s:['U5/U6 balanced → XLR-M','U7 → RCA (R20/R25 30 Ω)','U14 → HEADSET (RV1)'],d:'NE5532 stages on ±13.7 V (LM317/LM337; the nets are called +5V/−5V). LLVL/RLVL trim the balanced level.'},
  det:{x:450,y:160,w:170,h:100,t:'VU detectors',s:['U10 (L), U11 (R) LF353','full-wave + 2-pole 2.3 Hz','LVU / RVU / LOFF / ROFF'],d:'Precision rectifier (D9/D10, D11/D12) summed into a Rauch low-pass, Q 0.56. That is the classic VU ballistic. D14/D15 1N752A clamp the outputs at 5.6 V.'},
  mux:{x:660,y:160,w:170,h:100,t:'74HC4053 + U13',s:['L_SEL / R_SEL pick a detector','HIGH → U16, U17','LOW = 6.6 × HIGH → U15'],d:'U12 routes the left or right detector to the shared HIGH node. U13 amplifies it by 1 + R63/R62 = 6.6 for the low-range driver.'},
  bar:{x:870,y:90,w:170,h:110,t:'Display board',s:['3 × LM3915 (U15–U17)','2 × 20 LEDs, shared drivers','Q1–Q4 switch the L/R rail','SL1–SL8 status LEDs'],d:'The same three bar drivers serve both channels. The PIC enables one LED rail at a time through Q3/Q4 (LBAR) or Q2/Q1 (RBAR), so each bar is lit half the time.'},
  ph:{x:20,y:160,w:170,h:100,t:'Phase detector',s:['U9 LM393 zero-cross','U19 74HC00 XOR','U20 LM393 → PHASE LED'],d:'Analog. Comparator thresholds 62 mV (R44/R40). The XOR is averaged by R39/C87 and compared with 3.09 V (R82/R43). It shares the RB3 line with the PIC.'},
};
const WIRES=[['in','rx','AES3'],['rx','dac','I²S'],['rx','pic','C pins'],['dac','out',''],['dac','det','LEFT/RIGHT'],['det','mux',''],['mux','bar','HIGH/LOW'],['pic','mux','L_SEL/R_SEL'],['pic','bar','PORTB, LBAR/RBAR'],['dac','ph',''],['ph','bar','PHASE']];
function viewBlock(m){ window.__pod11Active=false; blockView(m,BLOCKS,WIRES,'pic',[1060,280],card('In one sentence',`<p>A CS8412 decodes the AES input into a CS4330 DAC. Analog VU detectors drive one set of LM3915 bar drivers that the PIC switches between the two channels every block. The PIC also turns the receiver's error and rate codes into status lamps.</p>`)); }
const SHEETS=[
  {name:'1 · Receiver + PIC', note:'From POD11-ISS3.net. CS8412/PIC pin functions are from the parts\' standard pin-outs; the net names (CA…CE, C0, SEL, CBL, CS12_SEL, CS12_OSC, L_SEL, R_SEL, LBAR, RBAR, P1_n) are the netlist\'s.', svg:()=>
    chip(120,70,150,'U2 CS8412',[['9 RXP','T2-4'],['10 RXN','T2-3'],['13 CS12/FCK','U1-11'],['16 SEL','SEL'],['15 CBL','CBL']],[['5 Ca','CA'],['4 Cb','CB'],['3 Cc','CC'],['2 Cd','CD'],['27 Ce','CE'],['6 C0','C0'],['26 SDATA','U4-1'],['12 SCK','U4-2'],['11 FSYNC','U4-3'],['19 MCK','U4-4']],'AES receiver')
    +chip(520,70,160,'U3 PIC16C73A',[['2 RA0','CD'],['3 RA1','CE'],['4 RA2','CC'],['5 RA3','CB'],['6 RA4','CA'],['7 RA5','C0'],['9 OSC1','U1-6'],['1 MCLR','R6 22M']],[['11 RC0','CS12_OSC'],['12 RC1','CS12_SEL'],['13 RC2','SEL'],['14 RC3','CBL'],['15 RC4','RBAR'],['16 RC5','LBAR'],['17 RC6','R_SEL'],['18 RC7','L_SEL'],['21–28 RB0–7','P1_1…P1_8']],'ISS3 part: PIC16C62-10')
    +txt(120,360,'U1 74HC00: X1 6.144 MHz, R2 10M, R3 4K7, C7/C8 22p → PIC OSC1 and, gated by RC0/RC1, CS8412 FCK.',11)
    +txt(120,380,'AES in: AESIN-2 → C19 0.1µ → T2 PE-65612 → R4 110 Ω across RXP/RXN.  E-codes on C0/Ca/Cb (SEL low) → ERR bit0/1/2 in firmware.',11)
    +txt(120,400,'F-codes on Cc/Cd/Ce → FREQ bit0 ← RA2, bit1 ← RA0, bit2 ← RA1.',11)},
  {name:'2 · DAC + outputs', note:'U4 CS4330 pins from the netlist; gains from the resistor values (R34/R35 20k/20k = ×2). The balanced driver topology is simplified.', svg:()=>
    chip(80,80,130,'U4 CS4330',[['1 SDATA','U2-26'],['2 SCLK','U2-12'],['3 LRCK','U2-11'],['4 MCLK','U2-19']],[['8 AOUTL','C15'],['5 AOUTR','C16']],'DAC')
    +cap(244,102,300,102,'C15','1µ')+res(300,102,360,102,'R30','2K2')+opamp(380,114,'U8A NE5532')+wire([[440,114],[520,114]])+net(526,114,'LEFT')
    +res(380,170,440,170,'R34','20k')+res(440,170,500,170,'R35','20k')+txt(380,215,'gain 1 + R35/R34 = 2',11)
    +txt(80,280,'LEFT → U6 (R15/R16 20k, R18 4K7, R19 10k, LLVL trim) → R14/R17 30 Ω → LBAL XLR-M pins 2/3',11)
    +txt(80,300,'LEFT → U7A (R23 10k / R24 20k) → R25 30 Ω → LRCA            RIGHT → U5 / U7B → RBAL, RRCA',11)
    +txt(80,320,'LEFT, RIGHT → RV1 (TOCOS dual) → U14 NE5532 → R67/R68 30 Ω → HDST',11)
    +txt(80,350,'Rails: REG1 LM317 (R77 221, R76 2K2) ≈ +13.7 V on net “+5V”; REG3 LM337 (R78/R79) ≈ −13.7 V on net “−5V”; REG2 7805 → +5VC',11,'var(--warn)')},
  {name:'3 · VU detector + mux', note:'U10 (left) shown; U11 is the same with RVU/ROFF, D11/D12, R53–R58. The Rauch low-pass values give f₀ = 2.32 Hz, Q = 0.56.', svg:()=>
    net(30,100,'LEFT')+res(70,100,140,100,'LVU','20k trim')+wire([[140,100],[160,100]])+dot(150,100)+res(160,100,240,100,'R50','20k')+wire([[240,100],[260,100]])
    +opamp(260,112,'U10A (D9, D10)')+wire([[260,124],[250,124],[250,134]])+gnd(250,134)+wire([[245,100],[245,50]])+res(245,50,335,50,'R49','20k')+wire([[335,50],[335,112],[320,112]])
    +res(335,112,430,112,'R48','100k')+wire([[430,112],[450,112],[450,200]])
    +wire([[150,100],[150,200]])+res(150,200,300,200,'R51','200k')+wire([[300,200],[470,200]])+dot(400,200)+dot(450,200)+dot(460,200)
    +wire([[400,200],[400,215]])+cap(400,215,400,265,'C24','1µ')+gnd(400,265)
    +res(470,200,550,200,'R47','100k')+wire([[550,200],[560,200]])+opamp(560,212,'U10B')+wire([[560,224],[552,224],[552,236]])+gnd(552,236)
    +wire([[555,200],[555,150]])+cap(555,150,640,150,'C23','47n')+wire([[640,150],[640,212],[620,212]])
    +wire([[640,212],[680,212],[680,320]])+res(460,320,680,320,'R46','1M')+wire([[460,320],[460,200]])
    +wire([[680,212],[700,212]])+res(700,212,770,212,'R83','1k')+net(776,212,'→ U12 2Y1')
    +txt(60,380,'U12 74HC4053: S2 = L_SEL (RC7) connects 2Y1 → 2Z = HIGH; S1 = R_SEL (RC6) connects 1Y1 (R84, U11) → 1Z = HIGH',11)
    +txt(60,400,'U13A: HIGH → +in; R62 3K57 to ground, R63 20k feedback, R64 1M to +13.7 V → LOW = 6.6 × HIGH − 0.27 V',11)
    +txt(60,420,'D14/D15 1N752A (5.6 V) clamp each detector output.  R85 22M: LOFF offset trim into U10B −in.',11)},
  {name:'4 · LED drivers + multiplex', note:'From the J1/J2 side of the netlist. LM3915 pin functions from the part\'s pin-out. Physical LED order is assumed to follow the thresholds.', svg:()=>
    chip(150,60,130,'U15 LM3915',[['5 SIG','LOW J2-11'],['7/6 REF/RHI','R71 1K5'],['8 RADJ','GND'],['9 MODE','+V bar']],[['1 LED1','L1'],['17 LED3','L2'],['15…10','L3…L8']],'LOW range')
    +chip(560,60,130,'U16 LM3915',[['5 SIG','HIGH J2-10'],['7/6','R73 1K5'],['8','R72 0R'],['9','+V']],[['18…10','L9…L17']],'')
    +chip(360,190,130,'U17 LM3915',[['5 SIG','HIGH'],['7/6','R75 1K62'],['8','R74 4K75'],['9','+V']],[['13…11','L18…L20']],'REF 4.91 V')
    +txt(40,330,'Each driver output joins Ln-K (left bar, anodes on L_BAR) and Ln_1-A (right bar, cathodes on R_BAR).',11)
    +txt(40,350,'L_BAR = J1-11 ← P1-11 ← Q4 TIP30C ← Q3 2N3904 ← R80 ← LBAR (RC5)        R_BAR = J1-12 ← P1-12 ← Q1 ← Q2 ← R81 ← RBAR (RC4)',11)
    +txt(40,370,'Status: RB0→SL3 32K · RB1→SL2 44.1K · RB2→SL1 48K · RB3→SL8 PHASE (+U20)',11)+txt(40,384,'RB4→SL7 CONSUMER · RB5→SL6 CONFIDENCE · RB6→SL5 CRC ERR (+U18) · RB7→SL4 LOCK',11)
    +txt(40,404,'VLED (Q1/Q4 emitters, P1-10 → +V) is fed through D5, which the ISS3 netlist marks DNI. R26–R29 (U18 peak inputs) and R89 (SL8 pull-up) are DNI too.',11,'var(--warn)')},
  {name:'5 · Phase detector', note:'U9/U19/U20 from the netlist. Threshold values computed from R44/R40 and R82/R43. The LED polarity is inferred.', svg:()=>
    chip(220,70,120,'U9 LM393',[['5 +','LEFT via R38 47k'],['3 +','RIGHT via R45 47k'],['2/6 −','62 mV ref']],[['7','U19-1,10'],['1','U19-4,9']],'zero-cross')
    +chip(560,70,120,'U19 74HC00',[['1,10 / 4,9','U9 outs']],[['11','XOR']],'4-NAND XOR')
    +chip(560,230,120,'U20 LM393',[['5 +','XOR via R39/C87'],['6 −','3.09 V ref']],[['7','RB3 / SL8']],'')
    +txt(40,340,'Input low-pass: R38 47k × C20 3900p (L), R45 × C21 (R) → 868 Hz corner before each comparator.',11)
    +txt(40,360,'R44 220k / R40 1k from +13.7 V → 62 mV comparator reference;  τ = R39·C87 = 4.7 ms;  PHASE when XOR duty > 62 % (≈ 111°).',11)},
];
function viewSchem(m){ window.__pod11Active=false; schemView(m,SHEETS,'POD11 ISS3','Sources: POD11 - #ISS3 #PCB /POD11-ISS3.net (2010-04-15, 255 parts, 188 nets) and its resistor values. ISS2 (POD11.DSN, 1998) used a PIC16C73, LF353s and LM3914s. Pin functions of the CS8412, CS4330, PIC and LM3915 come from their standard pin-outs.'); }
function viewSoft(m){ window.__pod11Active=true;
  m.innerHTML=`${card('MAIN loop (PD11V101.ASM): the running step is highlighted',`<div id="f"></div><p class="small mono" id="lab"></p>`)}<div class="grid2">${card('Port map',`<div id="pm"></div>`)}${card('TABLE1 / TABLE2 (RETLW tables) — current row highlighted',`<div id="tbl"></div>`)}</div>${card('Boot and watchdog state machine',`<div id="sm"></div>`)}`;
  const draw=()=>{ const t=SIM.t, e=evAt(t), r=readPass(t), order=['INIT','TEST','RESET','CBL0','CBLOK','READSTAT','DIGMUX','MUX1D'];
    const st=[{t:'INIT',s:['DELAY 0xFF','ports, TRIS']},{t:'TEST',s:['8 × BSF PORTB','DELVIS each']},{t:'RESET',s:['DELVIS ×2','GOTO MAIN']},{t:'CBL0',s:['wait CBL = 1',D.fw==='V10X'?'(V10X: DELVIS2)':'no CLRWDT']},{t:'CBLOK',s:['E → TABLE1','F → TABLE2','C-bits OR']},{t:'READSTAT',s:['wait CBL = 0']},{t:'DIGMUX',s:['PORTB = FREQ','L switch, L bar']},{t:'MUX1D',s:['R switch','R bar']}];
    m.querySelector('#f').innerHTML=flowSVG(st, order.indexOf(e.pc)); m.querySelector('#lab').textContent=SIM.fmtT(t)+' · '+e.label;
    const pb=e.portb;
    m.querySelector('#pm').innerHTML=`<table class="kv"><tr><th>Pin</th><th>Net</th><th>Firmware use</th><th>Now</th></tr>
      ${[['RA5','C0','E0 (SEL low) / C0 = PRO (SEL high) → ERR,0 / STAT,5'],['RA4','CA','E1 → ERR,1'],['RA3','CB','E2 → ERR,2'],['RA2','CC','F0 → FREQ,0'],['RA0','CD','F1 → FREQ,1'],['RA1','CE','F2 → FREQ,2'],['RC0','CS12_OSC','FCK gate / subframe 0'],['RC1','CS12_SEL','subframe 1'],['RC2','SEL','error/rate ↔ channel status'],['RC3','CBL','block start (input)'],['RC4','RBAR','R bar rail'],['RC5','LBAR','L bar rail'],['RC6','R_SEL','4053 R'],['RC7','L_SEL','4053 L']].map(x=>`<tr><td class="mono">${x[0]}</td><td class="mono">${x[1]}</td><td class="small">${x[2]}</td><td class="mono">${x[0]==='RC4'||x[0]==='RC6'?(e.side==='R'?1:0):x[0]==='RC5'||x[0]==='RC7'?(e.side==='L'?1:0):''}</td></tr>`).join('')}
      ${LEDS.slice().sort((a,b)=>b.bit-a.bit).map(L=>`<tr><td class="mono">RB${L.bit}</td><td class="mono">P1_${L.bit+1} → ${L.sl}</td><td class="small">test comment “${TESTNAME[L.bit]}”, panel ${L.name}</td><td class="mono">${pb>>L.bit&1}</td></tr>`).join('')}</table>`;
    const ec=errCode(t), fc=FSOPT[D.fsi][1];
    m.querySelector('#tbl').innerHTML=`<table class="kv"><tr><th>E2..E0</th><th>CS8412 meaning</th><th>RETLW</th><th>comment</th><th>tested?</th></tr>${ECODE.map((x,i)=>`<tr class="${i===ec?'hl':''}"><td class="mono">${i.toString(2).padStart(3,'0')}</td><td>${x[1]}</td><td class="mono">${TABLE1[i].toString(2).padStart(8,'0')}</td><td class="small">${T1C[i]}</td><td class="small">${[0x02,0x04,0x10].includes(TABLE1[i])?'yes':'<span style="color:var(--bad)">no</span>'}</td></tr>`).join('')}</table>
      <table class="kv" style="margin-top:8px"><tr><th>F2..F0</th><th>RETLW</th><th>comment</th></tr>${TABLE2.map((v,i)=>`<tr class="${i===fc?'hl':''}"><td class="mono">${i.toString(2).padStart(3,'0')}</td><td class="mono">${v.toString(2).padStart(8,'0')}</td><td class="small">${T2C[i]}</td></tr>`).join('')}</table>`;
    const k=e.kind; const box=(id,x,y,l,s)=>`<g><rect x="${x}" y="${y}" width="150" height="54" rx="8" fill="${id===k||(id==='run'&&['read','wait','dig','sw','bar'].includes(k))?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+10}" y="${y+22}" font-size="12.5" font-weight="700" fill="var(--ink)">${l}</text><text x="${x+10}" y="${y+40}" font-size="10.5" fill="var(--ink2)">${s}</text></g>`;
    m.querySelector('#sm').innerHTML=`<svg viewBox="0 0 900 150" style="width:100%"><defs><marker id="sa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${box('off',10,40,'Power off','')}${box('boot',190,40,'INIT / RESET',SIM.fmtDur(T_INIT)+' + 2 × DELVIS')}${box('test',370,40,'TEST chase','8 × '+SIM.fmtDur(T_VIS))}${box('run',550,40,'MAIN loop','one pass per CBL')}${box('stall',730,40,'Stuck in CBL0','no lock, no CBL')}
      ${[[160,190],[340,370],[520,550],[700,730]].map(([a,b])=>`<line x1="${a}" y1="67" x2="${b}" y2="67" stroke="var(--ink2)" marker-end="url(#sa)"/>`).join('')}
      <path d="M805 40 C805 0 265 0 265 38" fill="none" stroke="var(--warn)" stroke-dasharray="5 4" marker-end="url(#sa)"/><text x="535" y="14" text-anchor="middle" font-size="11" fill="var(--warn)">watchdog ${SIM.fmtDur(T_WDT)} ${D.wdt?'':'(disabled)'}</text>
      <text x="625" y="128" font-size="11" fill="var(--ink2)" text-anchor="middle">${D.fw==='V10X'?'V10X never stalls: it blanks instead':'V1.00 / V1.01'}</text></svg>`; };
  SIM.on('time',draw); }
function viewNotes(m){ window.__pod11Active=false;
  m.innerHTML=card('Does this folder hold the missing POD11 / POD11A firmware?',`<ul>
    <li><b>POD11: yes.</b> <span class="mono">POD11 - #Software/POD11 - #Software #V100/</span> has the complete PIC16C73A source in three versions: <span class="mono">PD11V100.ASM</span>, <span class="mono">PD11V101.ASM</span> (adds a CLRWDT), and the experimental <span class="mono">PD11V10X.ASM</span>, plus their <span class="mono">.$$$</span> backups. <span class="mono">PD11V100.BKX</span> (1999-04-22) is an Intel-HEX image, not a backup source. Its code holds the extra CLRWDT at 0x058, so it is a <b>V1.01 build</b>, even though the project (<span class="mono">PD11V100.PJT</span>) targets pd11v100.</li>
    <li><b>POD11A: no.</b> Nothing here is SHARC code. The folder does hold three POD11A items that the POD11A folder lacks: <span class="mono">POD11A MANUAL.pdf/.docx</span>, <span class="mono">POD11AMANUAL.cdr</span>, and <span class="mono">POD11 - Functional Diagram.cdr</span> (2004, titled “POD11A AES/EBU MONITOR”). The diagram shows “AES RECEIVER → Typical SLM Digital Input / SLM1D Input → DSP → @STEREO LED METER ASSEMBLY” with Sw1–Sw4. So POD11A is an SLM-1D (digital SLM-1) in a POD case. Its firmware should be the digital SLM-1 SHARC master in <span class="mono">#SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/sharc/slm-1-v1.0x</span>, not the POD3A “SLM-1 Analog” code (${inf}). The 2-dB CAL steps on the POD11A rear still need checking against that code.</li>
    <li>The POD11A manual answers questions <span class="mono">pod11a.js</span> left open. <b>BS1 ON = Peak Hold OFF</b> (the silk is right, and the reverse of the natural reading). PPM type 1 = 1.5 s per 24 dB and type 2 = 3.0 s per 24 dB. The peak LED holds peaks above −3 dBFS for 3 s. The input range is 30–96 kHz, the input level 0.2–5 V p-p, and each bar has 41 LEDs (the 2014 silk has 57).</li></ul>`)
  +card('What the POD11 and its firmware are up to',`<ol>
    <li><b>The lamp-test comments name the wrong lamps.</b> <span class="mono">TEST</span> labels RB3 “CONS”, RB4 “PHASE”, RB5 “CRC” and RB6 “CONF”. MAIN uses RB4 for consumer (FREQ,4), RB5 for confidence and RB6 for CRC. The netlist agrees with MAIN: RB6 → SL5 red, RB5 → SL6 yellow, RB4 → SL7 green, RB3 → SL8 red together with the analog phase comparator. So the power-up chase runs 48K, 44.1K, 32K, LOCK, CRC ERR, CONFIDENCE, CONSUMER, PHASE. Two pairs are labelled the wrong way round.</li>
    <li><b>The CONSUMER lamp lights for professional streams.</b> MAIN reads RA5 with SEL high and CS12 low, then high. On the CS8412 that pin is C0, channel-status bit 0, which is 1 for <i>professional</i> (CS8412 pin-out, ${inf}). <span class="mono">BTFSC STAT,5 / BSF FREQ,4</span> therefore lights CONSUMER on pro audio. The next line, <span class="mono">BTFSC FREQ,4 / BCF FREQ,6 ;NO CRC IN CONSUMER MODE</span>, then hides CRC errors on exactly the streams that carry a CRC. Also, “OR”-ing subframes A and B means any 1 in either subframe counts.</li>
    <li><b>Half of TABLE1 goes unread.</b> The CS8412 codes for validity (0x80), slip (0x20), parity (0x08) and “no error” (0x40) set bits that MAIN never tests. Only CRC (0x02), no-lock (0x04) and confidence (0x10, used for both confidence and bi-phase) reach a lamp. TABLE2 maps code 110 (44.056 kHz, the video pull-down rate) to “OUT”, so a 44.056 kHz feed shows no rate lamp.</li>
    <li><b>Losing the input freezes the panel.</b> V1.00 and V1.01 wait for CBL in a tight loop (<span class="mono">CBL0</span>) without CLRWDT. If CBL stops when lock is lost (${inf}), PORTB stays as it was, so LOCK stays lit and one bar stays enabled. Only the watchdog (about ${SIM.fmtDur(T_WDT)}, if the fuse was set; no <span class="mono">__CONFIG</span> in the source) restarts the PIC, which then runs the 1.8 s lamp chase and sticks again. The V1.01 change (“WATCH DOG timer is cleared in the CBL loop”) adds CLRWDT at CBLOK, which runs only when CBL <i>is</i> present. V10X drops the CBL wait and blanks the panel properly. It was the open file in MPLAB's window list (<span class="mono">.CFG</span>, <span class="mono">.PJT</span>), but no build of it is archived.</li>
    <li><b>Leftovers.</b> MAIN's header says it “tests power switch position for analog or digital and sets input relay”, and DELAY mentions a “RELAY PULSE(5mS)”. The POD11 has no relay. Timer 2 is set up (PR2 = 0x4F, TMR2IE) but never started, and T2INT is only RETFIE. The SEL0–SEL5 constants are commented out. <span class="mono">MOVLW 0XFF</span> before <span class="mono">CLRF PORTB</span> appears four times and does nothing.</li>
    <li><b>The delay comment is off by 2×.</b> It says DELAY = 255 × 1/1.53 MHz × 2 × DELAY2. The inner loop is CLRWDT + DECFSZ + GOTO, 4 cycles, so DELVIS is ${SIM.fmtDur(T_VIS)}, not about 80 ms. The comment predates the CLRWDT in the loop.</li>
    <li><b>The PIC part differs in each file.</b> Source and WBS listing: PIC16C73A. ISS2 schematic: PIC16C73. ISS3 netlist (2010): value “PIC16C62-10” on a PIC16C63A symbol. The 16C62/63 have no ADCON1, so the code's <span class="mono">BSF ADCON1,PCFG2/1</span> writes go nowhere. Harmless, but they show the code was written for the '73.</li>
    <li><b>The bar was redesigned between ISS2 and ISS3.</b> ISS2 (1998) used three LM3914 (linear) drivers. ISS3 uses LM3915 (3 dB/step) parts on a footprint called “LM3916”. With the ISS3 resistor values the top LEDs fall at 0, 3, 5.9, 8.9 and 11.9 VU, which matches the printed “3 6 9 12”. The printed −1 / 1 / 2 steps and the bottom end of −36 only fit a linear driver. The ISS3 bottom range reaches only about ${fdb(THR[0].db,0)} VU, and three U15/U16 pairs fire within 0.4 dB of each other (computed).</li>
    <li><b>The rails are not what they are called.</b> The nets “+5V” and “−5V” come from an LM317/LM337 set by 221 Ω / 2.2 kΩ, which gives about ±13.7 V. Only “+5VC” (7805) is 5 V.</li>
    <li><b>DNI parts on live paths (ISS3).</b> D5 feeds VLED, the supply for the LED rails and the display board. R89 is SL8's pull-up and R26–R29 are the U18 peak-comparator inputs. All are marked DNI. As netlisted, the LED rail would be unpowered. Links were probably fitted (${inf}). The U18 outputs and the PIC both drive the SL5 line, and U20 and RB3 both drive SL8. RB3 is always an output at 0 (FREQ,3 is never set). Here the RB3 line only follows the analog phase detector (${inf}).</li>
    <li><b>Abandoned layouts.</b> <span class="mono">POD11LYO.CDR</span> (Aug 1997) has NO LOCK and “> OUT OF RANGE” lamps and is captioned “POD-3 AES/EBU MONITOR”: the drawing was copied from POD3. The shipped silk (<span class="mono">POD11SLK.CDR</span>, Aug 1997) has LOCK and CRC ERR instead. The two copies of POD11SLK.CDR (SILK and ISS2) differ from byte 5 onwards.</li>
    <li><b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src(ART_SLK,'POD11SLK.CDR')} (Aug 29 1997).</b> The three plates (front GREEN, front WHITE, rear WHITE) are converted to vector (assets/pod11-front.svg, pod11-rear.svg) and register on the earlier PNG cuts with zero offset, so every LED, the knob and the jack keep their places. The sheet carries only hairline drill crosshairs (mounting screws and two small holes left of the bars), no outline or connector cut-outs, and its 43 text objects are live Arial that libcdr throws to the wrong positions, so the lettering stays re-anchored in code. An older copy, ${SIM.src('#POD #SERIES/XXX - POD11 - #Master  #OBSOLETE/POD11 - #PCB #OBSOLETE/ISS2/POD11SLK.CDR','ISS2/POD11SLK.CDR')} (Aug 26 1997), sits with the ISS2 PCB. The 2016 ${SIM.src('#POD #SERIES/POD11A - #Master/POD11A - #ARTWORK #DA #2016/POD11A-FRONT&REAR-SILK(CURVE).cdr','POD11A-FRONT&REAR-SILK(CURVE).cdr')} is the POD11A meter, a different panel, and is not used here.</li></ol>`)
  +card('Assumptions in this simulation',`<ul class="small">
    <li>The panel uses the three POD11SLK.CDR separations (green bar layer, white tick layer, white rear layer), recoloured to the POD inks. libcdr lost every text position, so all lettering and status-lamp positions are re-anchored from POD11MAN.CDR. No POD11 photo is archived (${inf}).</li>
    <li>The bar legend printed is the manual's 18-value scale. LED thresholds come from the ISS3 values, and the physical LED order is assumed to follow the threshold order. DAC full scale is 1 V rms, so a −20 dBFS tone reads 0 VU at LVU ≈ 98 % (${inf}).</li>
    <li>CBL is high for 32 frames and stops without lock. Lock takes 20 ms, and the DAC is muted when unlocked. MAIN pass ≈ ${PASS_CY} cycles. The receiver checks CRC only in pro mode. Status-lamp colours come from the netlist values (all ${inf}).</li></ul>`)
  +card('Sources',`<ul class="small mono"><li>POD11 - #Software/POD11 - #Software #V100/PD11V100.ASM, PD11V101.ASM, PD11V10X.ASM, *.$$$, PD11V100.BKX, .PJT, .CFG, .ERR</li><li>POD11 - #ISS3 #PCB /POD11-ISS3.net (+ .sch, .pcb) · POD11 - #PCB #OBSOLETE/ISS2/POD11.DSN, ARCHIVE/</li><li>POD11 - #SILK/POD11SLK.CDR → assets/pod11-front-green.png, pod11-front-white.png, pod11-rear-white.png</li><li>POD11 - #MANUAL #Obsolete/POD11MAN.CDR, POD11LYO.CDR, POD11A MANUAL.pdf, POD11AMANUAL.cdr</li><li>POD11 - Functional Diagram.cdr (POD11A, 2004) · POD11 - #MECHANICAL/*.DWG (outline only)</li></ul>`); }
SIM.register({
  footnotes: [
    { text: "POD11SLK.CDR (Aug 29 1997) has no panel outline or cut-outs, only hairline crosshairs at the two mounting screws and two small holes left of the bars; all 43 text objects are live Arial whose positions libcdr loses.", src: "#POD #SERIES/XXX - POD11 - #Master  #OBSOLETE/POD11 - #SILK/POD11SLK.CDR" },
    { text: "A second POD11SLK.CDR three days older (Aug 26 1997) sits with the ISS2 PCB and differs from byte 5 onwards.", src: "#POD #SERIES/XXX - POD11 - #Master  #OBSOLETE/POD11 - #PCB #OBSOLETE/ISS2/POD11SLK.CDR" },
    { text: "POD11LYO.CDR (Aug 1997) is captioned “POD-3 AES/EBU MONITOR” and has NO LOCK and OUT OF RANGE lamps: a layout copied from the POD3.", src: "#POD #SERIES/XXX - POD11 - #Master  #OBSOLETE/POD11 - #MANUAL #Obsolete/POD11LYO.CDR" },
    { text: "POD11A-Silk-iss2.cdr is stored both in the obsolete POD11 silk folder and in the POD11A artwork folder (same size and date).", src: "#POD #SERIES/XXX - POD11 - #Master  #OBSOLETE/POD11 - #SILK/POD11A-Silk-iss2.cdr" },
    { text: "No photo of the POD11 is archived; the lettering positions come from POD11MAN.CDR.", src: "#POD #SERIES/XXX - POD11 - #Master  #OBSOLETE/POD11 - #MANUAL #Obsolete/POD11MAN.CDR" }
  ],
  id:'pod11', name:'POD11 · AES/EBU monitor, PIC-polled CS8412 + LM3915 bars (1997|30)', duration:DUR, product:'POD11', year:1997, family:'Obsolete products', folder:'#POD #SERIES/XXX - POD11 - #Master  #OBSOLETE',
  summary:'Half-rack AES/EBU monitor: a CS8412 receiver feeds a CS4330 DAC for balanced, unbalanced and headset outputs, analog VU detectors drive two 20-LED bars, and a PIC16C73A turns the receiver\'s error and rate codes into eight status lamps while multiplexing the bars. Modelled from the archived V1.00/V1.01/V10X assembly source and the ISS3 netlist.',
  highlights:['Real silkscreen separations from POD11SLK.CDR with live bars and lamps','Pass-by-pass model of the PIC firmware: CBL sync, TABLE1/TABLE2, L/R multiplex','Power-up lamp chase and the watchdog-only recovery from loss of lock','VU ballistics computed from the Rauch filter values (2.3 Hz, Q 0.56)','Finds the swapped lamp-test labels and the CONSUMER/PRO inversion','Answers where POD11A\'s firmware is (SLM-1D, not POD3A)'],
  depth:'Full model',
  stepUnits:[{label:'1 MAIN pass (4 ms @48k)',period:()=>192/FS()},{label:'1 frame',period:()=>1/FS()},{label:'1 instruction',period:()=>TCY},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[3,'3 s (boot + watchdog)'],[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms (multiplex)'],[0.001,'1 ms'],[0.0001,'100 µs (DIGMUX)']], defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second, pass by pass',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Software (PIC)',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
