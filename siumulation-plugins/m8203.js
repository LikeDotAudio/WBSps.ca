/* =====================================================================
   M8203 — Analog reference oscillator (tone) card (Ward-Beck, PCB 14-266, 1993|26)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model (no firmware on this card).

   Sources used:
   - #SERIALBOX #SERIES/SERIALBOXX - #AA100/aa103/PCB/14-266.PCB (Tango ASCII, title block
       "M8203 · 14-266.PCB · Oscillator Card · Gerry Bell · Feb 23,1993", silk "14-266 ISSUE 1"): MISFILED in a SerialBox
       folder. Copper, pads and silk rendered to scale → assets/m8203-board.png; every part value, and the silk
       "AGC", "DIST", "CAL", "0 dBu / +4 dBu / +8 dBu", "A B C" next to the links, comes from this file
   - …/aa103/PCB/14-266-UPDATE.pcb (P-CAD, 2007|40: strings "Oscillator Card", "POD32-ISS1")
   - MISC/BOM Summary Tool.xlsx ("14--266 … M8203 OSCILLATOR MODULE (SEE NOTES) ISSUE 1")
   - #MF8200 #SERIES/M8203 - #Master #MF82/M8203 - #Engineering/M8203_1trm.pdf, M8203_2trm.pdf (2007|40 terminal options:
       4 balanced outputs, "MIC OUT : 150 Ω -60 dBm", no input)
   - …/M8203 - #Engineering #DESIGN/M8203osc.DSN (OrCAD, NOV. 04, 1999 — a terminal-interface sheet, not the oscillator)
   - 8200 Series Rear Module options graphical Guides…/M8203 - rear module options.pdf ("M8203-Analog Reference
       Oscillator", TB8205P) → assets/m8203-rear-tb8205p.svg (vector from the .cdr's Corel PDF, Artwork 2026|59)
   - D8210 & D8212 - #Mechanical #DA #2016/8205-004 ISS 2 (HANDLE) .pdf
   No schematic of the oscillator survives; the circuit here is read from the board's parts and silk, and the
   topology (Wien bridge, JFET AGC) is marked inferred.
   ===================================================================== */
(function(){
/* ---------------- shared M82xx analog-card engine (inlined in each plugin; no globals) ---------------- */
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infw = w => `<span class="tag-inf" title="Not stated in the source; inferred from ${String(w).replace(/"/g,'&quot;')}">inferred</span>`;
const card = (t,b,cls,id)=>`<div class="card ${cls||''}"${id?` id="${id}"`:''}><h2>${t}</h2>${b}</div>`;
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const dB = x => 20*Math.log10(Math.max(x,1e-12));
const dBu2V = d => 0.7746*Math.pow(10,d/20);
const V2dBu = v => dB(v/0.7746);
const fmtDb = (v,u)=> (v<=-120?'−∞':(v>=0?'+':'−')+Math.abs(v).toFixed(1))+(u===undefined?' dBu':u);
const Y_ = y => SIM.year(y);
let P = null;   // the product description, filled in below
const noKeys = ()=>{ window['__'+P.id+'Active']=false; };

/* --- the action log: every user action records the real circuit path it exercises --- */
const LOG = [];
function act(name, fn){ const tr=[]; try{ fn(s=>tr.push(s)); }catch(e){ tr.push('error: '+e.message); } LOG.unshift({t:SIM.t,name,tr}); if(LOG.length>60) LOG.length=60; SIM.refresh(); }
function traceHTML(n){ if(!LOG.length) return `<div class="muted">${P.hint||'Click a part, trim or terminal. Each step through the circuit is listed here.'}</div>`;
  return LOG.slice(0,n||1).map((L,i)=>`<div${i?' class="muted"':''}><b>${esc(L.name)}</b> at ${SIM.fmtT(L.t)}</div>`+L.tr.map(s=>`<div${i?' class="muted"':''}>→ ${s}</div>`).join('')).join(''); }

/* --- waveform drawing: a sine (or any f(t)) with hard clipping at the stage's ceiling --- */
const FULL = 33;   // dBu at the top of a lane (±peak), so +24/+30 dBu clipping is visible
function waveLane(label, h, fnV, opts){ opts=opts||{};
  return {label, h:h||46, draw(c,X,t0,t1,y,hh){
    const col=opts.col||SIM.css('--accent'), mid=y+hh/2; let lv=opts.level; if(lv==null){ let mx=0; const ff=opts.f||1000; for(let k=0;k<64;k++){ const v=Math.abs(fnV(t0+k/(64*ff),false)); if(v>mx) mx=v; } lv=mx>1e-9? V2dBu(mx/Math.SQRT2) : -40; } const full=Math.max(lv+2, Math.min(opts.clip!=null?opts.clip+1:lv+2, lv+8)); const sc=(hh*0.44)/(Math.SQRT2*dBu2V(full));
    c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),mid); c.lineTo(X(t1),mid); c.stroke();
    if (opts.clip!=null && opts.clip<=full){ const yc=Math.SQRT2*dBu2V(opts.clip)*sc; c.setLineDash([3,3]); c.strokeStyle=SIM.css('--bad'); c.globalAlpha=.5; c.beginPath(); c.moveTo(X(t0),mid-yc); c.lineTo(X(t1),mid-yc); c.moveTo(X(t0),mid+yc); c.lineTo(X(t1),mid+yc); c.stroke(); c.setLineDash([]); c.globalAlpha=1; }
    const f=opts.f||1000, span=t1-t0, pw=X(t1)-X(t0);
    if (span*f > pw/3){ // too dense: draw the envelope
      c.fillStyle=col; c.globalAlpha=.28; const N=Math.min(400,Math.round(pw/2));
      for(let i=0;i<N;i++){ const ta=t0+span*i/N, tb=t0+span*(i+1)/N; let mx=0; for(let k=0;k<4;k++){ const v=Math.abs(fnV(ta+(tb-ta)*k/4, true)); if(v>mx) mx=v; } const yy=mx*sc; c.fillRect(X(ta),mid-yy,Math.max(1,X(tb)-X(ta)),2*yy); }
      c.globalAlpha=1; c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(`${Math.round(span*f).toLocaleString()} cycles in view (envelope) · zoom in`, X(t0)+6, y+11); return; }
    c.strokeStyle=col; c.lineWidth=1.4; c.beginPath();
    const N=Math.max(200,Math.round(pw)); for(let i=0;i<=N;i++){ const t=t0+span*i/N, v=fnV(t,false), yy=mid-v*sc; i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); c.lineWidth=1;
    if (opts.note){ c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(opts.note(), X(t0)+6, y+11); }
  }};
}
/* instantaneous voltage of a sine at level d dBu, clipped at clip dBu (peak) */
function sineV(t, d, f, clip, phase){ const pk=Math.SQRT2*dBu2V(d), v=pk*Math.sin(2*Math.PI*f*t+(phase||0)); if (clip==null) return v; const c=Math.SQRT2*dBu2V(clip); return clamp(v,-c,c); }
/* a slowly varying value (gain, CV) drawn as a line */
function valueLane(label, h, fnY, lo, hi, opts){ opts=opts||{}; return {label, h:h||34, draw(c,X,t0,t1,y,hh){
  const col=opts.col||SIM.css('--accent2'); c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); const N=300;
  for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, v=fnY(t), yy=y+hh-4-(clamp(v,lo,hi)-lo)/(hi-lo)*(hh-8); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); c.lineWidth=1;
  c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText((opts.fmt||(v=>v.toFixed(2)))(fnY(SIM.t)), X(t0)+6, y+11); }}; }
/* discrete events (e.g. user actions) */
function eventLane(label, evs, opts){ return {label, h:22, draw(c,X,t0,t1,y,hh){ c.fillStyle=SIM.css('--warn'); c.font='10px '+SIM.css('--sans');
  evs().forEach(e=>{ if(e.t<t0||e.t>t1) return; const x=X(e.t); c.fillRect(x-1,y+3,2,hh-6); c.fillText(e.name, x+4, y+hh-6); }); }}; }

/* --- level diagram: one bar per stage, against the stage ceiling --- */
function levelSVG(stages, w){ w=w||520; const H=34*stages.length+30, x0=170, xs=d=>x0+(clamp(d,-40,34)+40)/74*(w-x0-20);
  let s=`<svg viewBox="0 0 ${w} ${H}" style="width:100%;max-width:${w}px" role="img" aria-label="Level at each stage">`;
  [-40,-20,0,4,24,30].forEach(d=>{ s+=`<line x1="${xs(d)}" y1="14" x2="${xs(d)}" y2="${H-4}" stroke="var(--grid)"/><text x="${xs(d)}" y="11" font-size="9" text-anchor="middle" fill="var(--ink2)">${d>0?'+':''}${d}</text>`; });
  stages.forEach((st,i)=>{ const y=18+i*34, clip=st.max!=null && st.db>st.max+0.05;
    s+=`<g class="lvl" data-i="${i}" style="cursor:pointer"><title>${esc(st.name)}: ${st.db.toFixed(1)} dBu${st.max!=null?' (ceiling '+st.max+' dBu)':''}${st.note?' — '+esc(st.note):''}</title>
     <text x="0" y="${y+14}" font-size="11" fill="var(--ink)">${esc(st.name)}</text>
     <rect x="${x0}" y="${y+4}" width="${xs(st.db)-x0}" height="14" rx="2" fill="${clip?'var(--bad)':st.col||'var(--accent)'}"/>
     ${st.max!=null?`<line x1="${xs(st.max)}" y1="${y}" x2="${xs(st.max)}" y2="${y+22}" stroke="var(--bad)" stroke-dasharray="3 2"/>`:''}
     <text x="${Math.min(w-4,xs(st.db)+4)}" y="${y+15}" font-size="10" fill="var(--ink2)" text-anchor="${xs(st.db)>w-60?'end':'start'}">${fmtDb(st.db)}${clip?' CLIP':''}</text></g>`; });
  return s+'</svg>';
}

/* --- DWG redraw (geometry from the R12 drawing, inserts expanded) --- */
function dwgSVG(J, o){ o=o||{}; const [x0,y0,x1,y1]=J.bb, m=0.25, W=x1-x0+2*m, H=y1-y0+2*m, X=x=>(x-x0+m).toFixed(3), Y=y=>(y1-y+m).toFixed(3);
  const sw=o.sw||0.012, ink='var(--ink)', txt=o.txt||'var(--accent2)', hl=(o.hl||[]).map(h=>h.toUpperCase());
  let s=`<svg viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" style="width:${o.width||'100%'};${o.minw?'min-width:'+o.minw+'px;':''}background:var(--lane);border:1px solid var(--line);border-radius:8px" role="img" aria-label="${esc(o.label||'Drawing')}"><g stroke="${ink}" stroke-width="${sw}" fill="none" stroke-linecap="round">`;
  let d=''; J.L.forEach(l=>{ d+=`M${X(l[0])} ${Y(l[1])}L${X(l[2])} ${Y(l[3])}`; }); s+=`<path d="${d}"/>`;
  (J.P||[]).forEach(p=>{ let q=''; for(let i=0;i<p.length;i+=2) q+=(i?'L':'M')+X(p[i])+' '+Y(p[i+1]); s+=`<path d="${q}"/>`; });
  (J.C||[]).forEach(c=>{ s+=`<circle cx="${X(c[0])}" cy="${Y(c[1])}" r="${c[2].toFixed(3)}"/>`; });
  (J.A||[]).forEach(a=>{ const [cx,cy,r,a0,a1]=a, R=Math.PI/180, sw_=((a1-a0)%360+360)%360; s+=`<path d="M${X(cx+r*Math.cos(a0*R))} ${Y(cy+r*Math.sin(a0*R))}A${r.toFixed(3)} ${r.toFixed(3)} 0 ${sw_>180?1:0} 0 ${X(cx+r*Math.cos(a1*R))} ${Y(cy+r*Math.sin(a1*R))}"/>`; });
  s+='</g><g fill="'+ink+'">'; (J.S||[]).forEach(p=>{ let q=''; for(let i=0;i<p.length;i+=2) q+=(i?'L':'M')+X(p[i])+' '+Y(p[i+1]); s+=`<path d="${q}Z"/>`; }); s+='</g>';
  J.T.forEach((t,i)=>{ const anc=t[4]===1||t[4]===4?'middle':t[4]===2?'end':'start', on=hl.length&&hl.some(h=>o.exact? t[5].toUpperCase()===h : t[5].toUpperCase().includes(h));
    s+=`<text class="dt" data-i="${i}" x="${X(t[0])}" y="${Y(t[1])}" font-size="${(t[2]*1.05).toFixed(3)}" text-anchor="${anc}" fill="${on?'var(--warn)':txt}"${on?' font-weight="700"':''}${t[3]?` transform="rotate(${(-t[3]).toFixed(1)} ${X(t[0])} ${Y(t[1])})"`:''} style="cursor:pointer">${esc(t[5])}</text>`;
    if(on){ const w=t[2]*0.62*Math.max(1,t[5].length), xx=anc==='middle'?+X(t[0])-w/2:anc==='end'?+X(t[0])-w:+X(t[0]); s+=`<rect x="${xx.toFixed(3)}" y="${(+Y(t[1])-t[2]*1.1).toFixed(3)}" width="${w.toFixed(3)}" height="${(t[2]*1.4).toFixed(3)}" fill="none" stroke="var(--warn)" stroke-width="${sw*2}"/>`; } });
  return s+'</svg>';
}
/* nearest texts around a clicked label (to show a part's value next to its designator) */
function dwgNear(J, i, r){ const t=J.T[i]; r=r||0.35; return J.T.filter((u,k)=>k!==i && Math.hypot(u[0]-t[0],u[1]-t[1])<r).sort((a,b)=>Math.hypot(a[0]-t[0],a[1]-t[1])-Math.hypot(b[0]-t[0],b[1]-t[1])).slice(0,4).map(u=>u[5]); }

/* --- board view: rendered copper/silk PNG + clickable parts + live controls at their real positions --- */
function boardSVG(B, o){ o=o||{}; const W=B.px[0], H=B.px[1], S=B.dpi, ox=B.ox*S, oy=B.oy*S;
  const sel=o.sel;
  let s=`<svg viewBox="0 0 ${W} ${H+18}" style="width:100%;display:block" role="img" aria-label="${esc(B.label)}"><image href="${ASSET}${B.img}" x="0" y="0" width="${W}" height="${H}"/>`;
  (B.parts||[]).forEach(p=>{ const x=ox+p.x*S, y=oy+p.y*S, on=sel===p.ref; s+=`<g class="bpart" data-r="${esc(p.ref)}" style="cursor:pointer"><title>${esc(p.ref)} ${esc(p.v||'')}${p.pat?' · '+esc(p.pat):''}</title><rect x="${x-7}" y="${y-7}" width="14" height="14" fill="${on?'rgba(255,211,77,.35)':'transparent'}" stroke="${on?'#ffd34d':'none'}" stroke-width="2"/></g>`; });
  (B.ctl||[]).forEach(k=>{ const x=ox+k.x*S, y=oy+k.y*S, v=k.get();
    if (k.kind==='jumper'){ s+=`<g class="bctl" data-k="${k.k}" style="cursor:pointer"><title>${esc(k.label)} — click to move</title><rect x="${x-20}" y="${y-9}" width="40" height="18" rx="3" fill="#ffd84a" stroke="#000"/><text x="${x}" y="${y+4}" font-size="10" text-anchor="middle" fill="#000" font-weight="700">${esc(k.show())}</text></g>`; }
    else { const a=(-135+270*v)*Math.PI/180; s+=`<g class="bctl" data-k="${k.k}" style="cursor:pointer"><title>${esc(k.label)} — click right half to raise, left half to lower; scroll to fine-tune</title><circle cx="${x}" cy="${y}" r="13" fill="${k.kind==='multi'?'#2a4fa0':'#d9d4c7'}" stroke="#ffd34d" stroke-width="2"/><line x1="${x}" y1="${y}" x2="${(x+11*Math.sin(a)).toFixed(1)}" y2="${(y-11*Math.cos(a)).toFixed(1)}" stroke="#111" stroke-width="3"/><text x="${x}" y="${k.ly!=null?oy+k.ly*S:(y>H/2?y-17:y+25)}" font-size="10" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="2.4" paint-order="stroke" font-weight="700">${esc(k.short||k.label)}</text></g>`; }
  });
  (o.extra||'') && (s+=o.extra);
  s+=`<text x="4" y="${H+13}" font-size="11" fill="var(--ink2)">◂ front edge (handle)</text><text x="${W-4}" y="${H+13}" font-size="11" fill="var(--ink2)" text-anchor="end">P1 edge connector to the frame ▸</text></svg>`;
  return s+`<div class="small muted">${B.note}</div>`;
}
function bindBoard(root, B, onPart){
  root.querySelectorAll('.bpart').forEach(g=>g.onclick=()=>onPart(g.dataset.r));
  root.querySelectorAll('.bctl').forEach(g=>{ const k=(B.ctl||[]).find(c=>c.k===g.dataset.k); if(!k) return;
    g.onclick=e=>{ if(k.kind==='jumper'){ k.click(); return; } const r=g.getBoundingClientRect(); const up=(e.clientX-r.left)>r.width/2; k.set(clamp(Math.round((k.get()+(up?0.05:-0.05))*100)/100,0,1), true); };
    g.addEventListener('wheel', e=>{ if(k.kind==='jumper') return; e.preventDefault(); k.set(clamp(Math.round((k.get()+(e.deltaY<0?0.01:-0.01))*100)/100,0,1), false); SIM.refresh(); }, {passive:false});
  });
}

/* --- card front edge: the 8205-004 PCB handle (1.000 × .700 in, two 2-56 taps) on the 2.73 in board edge --- */
function handleSVG(ident, extras){ const S=80, bh=2.73*S, w=1.0*S;
  let s=`<svg viewBox="0 0 ${w+150} ${bh+40}" style="width:100%;max-width:260px" role="img" aria-label="Card front edge with the handle">
   <rect x="60" y="20" width="10" height="${bh}" fill="#1f6b3a" stroke="#0d3a1f"/>
   <rect x="${60-0.35*S}" y="${20+(2.73-1.0)/2*S}" width="${0.35*S+10}" height="${1.0*S}" fill="#c9ccd0" stroke="#666"/>
   <rect x="${60-0.35*S}" y="${20+(2.73-1.0)/2*S}" width="${0.05*S}" height="${1.0*S}" fill="#9a9ea3"/>
   <text transform="translate(${60-0.18*S} ${20+(2.73-1.0)/2*S+6}) rotate(90)" font-size="13" font-weight="700" fill="#111" font-family="var(--sans)">${esc(ident)}</text>`;
  s+=(extras||'');
  s+=`<text x="${60+20}" y="${20+12}" font-size="10" fill="var(--ink2)">pin 1 / A at the top</text><text x="${60+20}" y="${20+bh}" font-size="10" fill="var(--ink2)">2.73 in board</text>
   <text x="2" y="${bh+36}" font-size="9.5" fill="var(--ink2)">Handle 8205-004 ISS 2: 1.000 × .700 in, .051 galv.</text></svg>`;
  return s;
}

/* --- rear module: real guide artwork with clickable rows (positions from the PDF text layer) --- */
function rearSVG(R, o){ o=o||{}; const W=R.w, H=R.h; let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${o.max||330}px;display:block;margin:auto;background:#fff;border-radius:6px" role="img" aria-label="${esc(R.label)}">`;
  if (R.img) s+=`<image href="${ASSET}${R.img}" x="0" y="0" width="${W}" height="${H}"/>`;
  if (R.draw) s+=R.draw();
  (R.rows||[]).forEach((r,i)=>{ const x=r[1]*W, y=r[2]*H, w=(r[3]-r[1])*W, h=(r[4]-r[2])*H, on=o.sel===i, sig=R.sig?R.sig(r[0]):null;
    s+=`<g class="rrow" data-i="${i}" style="cursor:pointer"><title>${esc(r[0])}${sig?' — '+esc(sig):''}</title><rect x="${x-2}" y="${y-1.5}" width="${w+4}" height="${h+3}" fill="${on?'rgba(255,190,40,.45)':sig?'rgba(31,122,77,.10)':'transparent'}" stroke="${on?'#d08a00':'none'}"/></g>`; });
  return s+'</svg>';
}

/* --- tutorial engine --- */
let lesson=0;
function viewTut(m){ noKeys();
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — '+esc(P.tutTitle||'operating the card'), `<ol id="ls" class="small" style="padding-left:18px;margin:0"></ol>`)}<div class="card" id="lz"></div>${card('What happened', '<div id="tr" class="log"></div>')}</div><div id="tp"></div></div>`;
  const draw=()=>{ const L=P.lessons[lesson], ok=!!L.check();
    m.querySelector('#ls').innerHTML=P.lessons.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; draw(); });
    m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Read this, then go on.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv">◀ Back</button><button id="nx">Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{ lesson=Math.max(0,lesson-1); draw(); }; m.querySelector('#nx').onclick=()=>{ lesson=Math.min(P.lessons.length-1,lesson+1); draw(); }; m.querySelector('#r0').onclick=()=>{ P.reset(); LOG.length=0; lesson=0; SIM.refresh(); };
    m.querySelector('#tr').innerHTML=traceHTML(2);
    const tp=m.querySelector('#tp'); tp.innerHTML=P.tutPanel(); P.bind(tp);
  };
  SIM.on('time', draw);
}

/* --- simulator tab --- */
function viewSim(m){ noKeys();
  m.innerHTML=`<div class="grid2"><div id="pn"></div><div>${card('What happened', '<div id="tr" class="log"></div>')}${card('State', '<div id="st"></div>')}</div></div>
   ${card('Timeline — the signal at each stage (click to move the playhead)', '<canvas id="tl"></canvas><p class="small muted">'+(P.tlNote||'Zoom to 2 ms to see single cycles of the 1 kHz test tone; 1 s shows the slow controls.')+'</p>')}`;
  SIM.on('time', ()=>{ const pn=m.querySelector('#pn'); pn.innerHTML=P.panelHTML(); P.bind(pn); m.querySelector('#tr').innerHTML=traceHTML(3); m.querySelector('#st').innerHTML=P.stateHTML(); SIM.drawLanes(m.querySelector('#tl'), P.lanes(), {labelW:200}); });
}
function viewSecond(m){ noKeys();
  m.innerHTML=`<div class="grid2"><div>${card('One second, as the card sees it', '<div id="sx"></div>')}</div><div>${card('Level at every stage (live)', '<div id="lv"></div>')}</div></div>${card('Zoomable timeline', '<canvas id="z"></canvas><p class="small muted">Use the Zoom window and the step buttons in the transport. Step units: one tone cycle, 10 µs, 1 ms.</p>')}`;
  SIM.on('time', ()=>{ m.querySelector('#sx').innerHTML=P.secondHTML(); const lv=m.querySelector('#lv'); lv.innerHTML=levelSVG(P.chain().stages); SIM.drawLanes(m.querySelector('#z'), P.secondLanes?P.secondLanes():P.lanes(), {labelW:200}); });
}
/* --- block diagram tab --- */
function viewBlock(m){ noKeys(); let sel=Object.keys(P.blocks.nodes)[0];
  const draw=()=>{ const N=P.blocks.nodes, W=P.blocks.w||760, H=P.blocks.h||300; const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%" role="img" aria-label="Block diagram"><defs><marker id="${P.id}ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    P.blocks.edges.forEach(([a,b,lab])=>{ const A=N[a],B=N[b]; const [ax,ay]=ctr(A),[bx,by]=ctr(B); let x1=ax,y1=ay,x2=bx,y2=by;
      if (Math.abs(bx-ax)>Math.abs(by-ay)){ x1=ax+(bx>ax?A.w/2:-A.w/2); x2=bx-(bx>ax?B.w/2:-B.w/2); y2=by; y1=Math.abs(by-ay)<Math.min(A.h,B.h)/2?by:ay; } else { y1=ay+(by>ay?A.h/2:-A.h/2); y2=by-(by>ay?B.h/2:-B.h/2); x2=bx; x1=Math.abs(bx-ax)<Math.min(A.w,B.w)/2?bx:ax; }
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.5" marker-end="url(#${P.id}ar)"/>${lab?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-4}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${esc(lab)}</text>`:''}`; });
    for (const k in N){ const b=N[k], on=k===sel, lv=b.lv?b.lv():null; s+=`<g class="blk" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${on?'color-mix(in srgb,var(--accent) 18%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2:1}"/><text x="${b.x+8}" y="${b.y+17}" font-size="12" font-weight="700" fill="var(--ink)">${esc(b.t)}</text>${(b.s||[]).map((l,i)=>`<text x="${b.x+8}" y="${b.y+32+i*13}" font-size="10" fill="var(--ink2)">${esc(l)}</text>`).join('')}${lv!=null?`<text x="${b.x+b.w-6}" y="${b.y+b.h-6}" font-size="10" text-anchor="end" fill="var(--accent)">${esc(lv)}</text>`:''}</g>`; }
    s+='</svg>';
    const b=N[sel];
    m.innerHTML=`${card('Block diagram — click a block', `<div style="max-width:1100px">${s}</div><p class="small muted">${P.blocks.note||''}</p>`)}${card(esc(b.t), (typeof b.info==='function'?b.info():b.info)+(b.src?`<p class="small muted">Source: <span class="mono">${esc(b.src)}</span></p>`:''))}`;
    m.querySelectorAll('.blk').forEach(g=>g.onclick=()=>{ sel=g.dataset.k; draw(); });
  };
  SIM.on('time', draw);
}
/* --- schematic set tab: sheets redrawn from the archive's own drawings / netlists --- */
let sheetI=0, sheetHL='', sheetZoom=1;
function viewSchem(m){ noKeys();
  const SH=P.sheets;
  m.innerHTML=card('Schematic set — redrawn from the archive files (not the original CAD output)', `<div id="sb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div>
    <div class="small" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><label>Find a designator or net <input id="sf" value="${esc(sheetHL)}" placeholder="e.g. R11, DBX, OUTPUT" style="font:inherit;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--ink)"></label><label>Zoom <input type="range" id="sz" min="1" max="4" step="0.25" value="${sheetZoom}"></label><span id="si" class="muted"></span></div>
    <div id="sv" class="scroll" style="max-height:760px"></div><div id="sn" class="small muted" style="margin-top:6px"></div>`);
  const draw=()=>{ const S=SH[sheetI];
    m.querySelector('#sb').innerHTML=SH.map((s,k)=>`<button class="${k===sheetI?'on':''}" data-i="${k}">${esc(s.name)}</button>`).join('');
    m.querySelectorAll('#sb button').forEach(b=>b.onclick=()=>{ sheetI=+b.dataset.i; draw(); });
    const hl=sheetHL.trim()?[sheetHL.trim()]:(S.hl?S.hl():[]);
    const svg = S.J ? dwgSVG(S.J,{hl, width:(100*sheetZoom)+'%', minw:900, label:S.name}) : S.svg(hl);
    m.querySelector('#sv').innerHTML = S.J? svg : `<div style="width:${100*sheetZoom}%">${svg}</div>`;
    m.querySelector('#sn').innerHTML=S.note||'';
    if (S.J) m.querySelectorAll('#sv .dt').forEach(t=>t.onclick=()=>{ const i=+t.dataset.i, s=S.J.T[i][5]; const nb=dwgNear(S.J,i); m.querySelector('#si').innerHTML=`<b>${esc(s)}</b> · nearby: ${nb.map(esc).join(' · ')||'—'}${P.onSheetText?' · '+P.onSheetText(s):''}`; });
  };
  m.querySelector('#sf').oninput=e=>{ sheetHL=e.target.value; draw(); };
  m.querySelector('#sz').oninput=e=>{ sheetZoom=+e.target.value; draw(); };
  draw();
}
function viewSoft(m){ noKeys(); m.innerHTML=`<div id="sw"></div>`; SIM.on('time', ()=>{ const sw=m.querySelector('#sw'); sw.innerHTML=P.softHTML(); P.softBind && P.softBind(sw); }); }
function viewFind(m){ noKeys(); m.innerHTML=card('What this folder is up to — findings', '<ol>'+P.findings.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join('')+'</ol>')+card('Assumptions (marked inferred on screen)', '<ul class="small">'+P.assume.map(a=>`<li>${a}</li>`).join('')+'</ul>')+card('Sources used', '<ul class="small mono">'+P.sources.map(s=>`<li>${esc(s)}</li>`).join('')+'</ul>'); }

function stageTable(stages){ return `<table class="kv"><tr><th>Stage</th><th>Gain</th><th>Level</th><th>Ceiling</th><th>Note</th></tr>${stages.map(s=>`<tr><td>${esc(s.name)}</td><td class="mono">${s.g==null?'—':(s.g>=0?'+':'')+s.g.toFixed(1)+' dB'}</td><td class="mono" style="color:${s.max!=null&&s.db>s.max+0.05?'var(--bad)':'inherit'}">${fmtDb(s.db)}</td><td class="mono">${s.max==null?'—':'+'+s.max.toFixed(1)+' dBu'}</td><td class="small">${s.note||''}</td></tr>`).join('')}</table>`; }

function register(){
  SIM.register({ footnotes:P.footnotes, id:P.id, name:P.name, product:P.product, year:P.year, family:P.family, folder:P.folder, summary:P.summary, highlights:P.highlights, depth:'Hardware model',
    duration:1, init(){ noKeys(); },
    stepUnits:[{label:'1 tone cycle ('+(P.toneF?P.toneF():1000)+' Hz)', period:()=>1/(P.toneF?P.toneF():1000)},{label:'10 µs',period:()=>1e-5},{label:'1 ms',period:()=>1e-3},{label:'100 ms',period:()=>0.1}],
    zooms:[[1,'1 s (whole)'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms (cycles)'],[0.0002,'200 µs']], defaultZoom:P.defaultZoom==null?3:P.defaultZoom,
    tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewFind}],
  });
}

/* --- a screw-terminal module drawn from its terminal list (used where the artwork has lost its text) --- */
function tbSVG(T, o){ o=o||{}; const n=Math.max(T.left.length,T.right.length), RH=17, H=n*RH+90, W=330;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${o.max||330}px;display:block;margin:auto" role="img" aria-label="${esc(T.title)}"><rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="#fff" stroke="#999"/>
   <text x="${W/2}" y="24" text-anchor="middle" font-size="17" font-weight="700" fill="#111">${esc(T.title)}</text><text x="${W/2}" y="40" text-anchor="middle" font-size="10" fill="#333">${esc(T.sub||'')}</text>
   <rect x="${W/2-38}" y="50" width="76" height="${n*RH+20}" fill="none" stroke="#222" stroke-width="1.5"/>`;
  const row=(lab,i,side)=>{ if(!lab) return ''; const y=62+i*RH, x=side?W/2+12:W/2-32, idx=side?1000+i:i, on=o.sel===idx, sig=T.sig?T.sig(lab):null;
    return `<g class="rrow" data-i="${idx}" style="cursor:pointer"><title>${esc(lab)}${sig?' — '+esc(sig):''}</title><rect x="${side?W/2:8}" y="${y-8}" width="${W/2-8}" height="${RH-2}" fill="${on?'rgba(255,190,40,.45)':sig?'rgba(31,122,77,.10)':'transparent'}"/><rect x="${x}" y="${y-6}" width="20" height="13" fill="#e8e8e8" stroke="#333"/><circle cx="${x+10}" cy="${y+0.5}" r="4" fill="none" stroke="#333"/><text x="${side?W/2+44:W/2-44}" y="${y+4}" font-size="10" text-anchor="${side?'start':'end'}" fill="#111">${esc(lab)}</text></g>`; };
  T.left.forEach((l,i)=>s+=row(l,i,0)); T.right.forEach((l,i)=>s+=row(l,i,1));
  return s+`<text x="${W/2}" y="${H-10}" text-anchor="middle" font-size="9.5" fill="#444">${esc(T.foot||'')}</text></svg>`; }
const tbLabel=(T,i)=> i>=1000? T.right[i-1000] : T.left[i];

/* ---------------- product ---------------- */

const BRD = Object.assign({"px":[1069,282],"dpi":100,"ox":0.04,"oy":0.04,"parts":[{"ref":"Q1","v":"J174","pat":"TO-92","x":1.95,"y":2.33},{"ref":"C36","v":"22/25","pat":"CAP47/25","x":7.45,"y":1.805},{"ref":"C35","v":"22/25","pat":"CAP47/25","x":7.45,"y":0.93},{"ref":"R28","v":"6K49-1/4W-1%","pat":"R1/4","x":7.225,"y":1.555},{"ref":"R27","v":"10K2-1/4W-1%","pat":"R1/4","x":7.125,"y":1.555},{"ref":"R26","v":"16K2-1/4W-1%","pat":"R1/4","x":7.025,"y":1.555},{"ref":"C32","v":"100/25","pat":"EC100A","x":8.4,"y":0.505},{"ref":"C31","v":"100/25","pat":"EC100A","x":8.1,"y":1.505},{"ref":"C5","v":"47P","pat":"CAP.2","x":2.35,"y":0.28},{"ref":"R13","v":"150K-1/4W-5%","pat":"R1/4","x":2.3,"y":2.355},{"ref":"C8","v":"0.1/100","pat":"CAP.1","x":2.3,"y":2.23},{"ref":"R16","v":"200-1/4W-5%","pat":"R1/4","x":2.3,"y":2.08},{"ref":"C9","v":"1/35","pat":"CAP.1","x":2.7,"y":1.955},{"ref":"R12","v":"33K-1/4W-5%","pat":"R1/4","x":2.3,"y":2.455},{"ref":"R15","v":"220K-1/4W-5%","pat":"R1/4","x":2.3,"y":1.83},{"ref":"R14","v":"150K-1/4W-5%","pat":"R1/4","x":2.3,"y":1.73},{"ref":"C7","v":"0.1/100","pat":"CAP.1","x":2.8,"y":0.805},{"ref":"R9","v":"15K-1/4W-1%","pat":"R1/4","x":2.3,"y":0.93},{"ref":"R10","v":"4K75-1/4W-1%","pat":"R1/4","x":2.3,"y":1.03},{"ref":"R22","v":"5K","pat":"VTRIM","x":4.0,"y":1.58},{"ref":"R11","v":"5K","pat":"VTRIM","x":2.6,"y":1.58},{"ref":"R47","v":"SOT","pat":"R1/4","x":6.8,"y":2.23},{"ref":"R46","v":"SOT","pat":"R1/4","x":5.6,"y":2.23},{"ref":"R50","v":"24K3-1/4W-1%","pat":"R1/4","x":6.7,"y":2.23},{"ref":"R49","v":"10K-1/4W-1%","pat":"R1/4","x":5.7,"y":2.23},{"ref":"R48","v":"10K-1/4W-1%","pat":"R1/4","x":5.8,"y":2.23},{"ref":"C28","v":"820P","pat":"CAP.2","x":6.6,"y":2.13},{"ref":"C27","v":"820P","pat":"CAP.2","x":5.9,"y":2.13},{"ref":"U5","v":"NE5538N","pat":"IC8","x":6.1,"y":2.18},{"ref":"R30","v":"SOT","pat":"R1/4","x":6.8,"y":0.83},{"ref":"R33","v":"33K2-1/4W-1%","pat":"R1/4","x":6.7,"y":0.83},{"ref":"R29","v":"SOT","pat":"R1/4","x":5.6,"y":0.83},{"ref":"R32","v":"10K-1/4W-1%","pat":"R1/4","x":5.7,"y":0.83},{"ref":"R31","v":"10K-1/4W-1%","pat":"R1/4","x":5.8,"y":0.83},{"ref":"R64","v":"4K7-1/4W-5%","pat":"R1/4","x":7.3,"y":2.08},{"ref":"R66","v":"30K-1/4W-5%","pat":"R1/4","x":7.3,"y":2.28},{"ref":"R62","v":"100-1/2W-5%","pat":"R1/4","x":7.3,"y":2.18},{"ref":"R65","v":"30K-1/4W-5%","pat":"R1/4","x":7.3,"y":0.455},{"ref":"R61","v":"100-1/2W-5%","pat":"R1/4","x":7.3,"y":0.555},{"ref":"R63","v":"4K7-1/4W-5%","pat":"R1/4","x":7.3,"y":0.655},{"ref":"R41","v":"R01MF-30","pat":"R1W","x":8.775,"y":1.205},{"ref":"R40","v":"R01MF-30","pat":"R1W","x":8.775,"y":1.055},{"ref":"R39","v":"R01MF-30","pat":"R1W","x":8.775,"y":0.905},{"ref":"R38","v":"R01MF-30","pat":"R1W","x":8.775,"y":0.755},{"ref":"R37","v":"R01MF-30","pat":"R1W","x":9.525,"y":1.205},{"ref":"R36","v":"R01MF-30","pat":"R1W","x":9.525,"y":1.055},{"ref":"R35","v":"R01MF-30","pat":"R1W","x":9.525,"y":0.905},{"ref":"R34","v":"R01MF-30","pat":"R1W","x":9.525,"y":0.755},{"ref":"C34","v":"10/35","pat":"CAP.1","x":7.825,"y":2.18},{"ref":"C33","v":"10/35","pat":"CAP.1","x":7.825,"y":0.455},{"ref":"C30","v":"22/35","pat":"TCAP.2","x":7.975,"y":1.755},{"ref":"P1","v":"","pat":"EDGE30/156","x":10.525,"y":0.28},{"ref":"U4","v":"NE5538N","pat":"IC8","x":6.1,"y":0.78},{"ref":"C21","v":"820P","pat":"CAP.2","x":5.9,"y":0.73},{"ref":"C22","v":"330P","pat":"CAP.2","x":6.6,"y":0.73},{"ref":"R55","v":"1K5-1/4W-5%","pat":"R1/4","x":9.725,"y":1.63},{"ref":"R56","v":"1K5-1/4W-5%","pat":"R1/4","x":9.725,"y":1.53},{"ref":"R54","v":"82-1/4W-5%","pat":"R1/4","x":9.2,"y":1.73},{"ref":"R51","v":"8K2-1/4W-5%","pat":"R1/4","x":9.2,"y":1.53},{"ref":"R58","v":"82-1/4W-5%","pat":"R1/4","x":9.725,"y":1.83},{"ref":"R57","v":"82-1/4W-5%","pat":"R1/4","x":9.725,"y":1.73},{"ref":"R53","v":"82-1/4W-5%","pat":"R1/4","x":9.2,"y":1.63},{"ref":"R52","v":"8K2-1/4W-5%","pat":"R1/4","x":9.2,"y":1.83},{"ref":"C29","v":"22/35","pat":"TCAP.2","x":8.175,"y":2.08},{"ref":"R1","v":"10K-1/4W-1%","pat":"R1/4","x":1.05,"y":1.13},{"ref":"R2","v":"10K-1/4W-1%","pat":"R1/4","x":1.05,"y":2.055},{"ref":"R3","v":"619-1/4W-1%","pat":"R1/4","x":0.95,"y":1.13},{"ref":"R4","v":"619-1/4W-1%","pat":"R1/4","x":0.95,"y":2.055},{"ref":"R5","v":"14K3-1/4W-1%","pat":"R1/4","x":1.15,"y":1.13},{"ref":"R6","v":"14K3-1/4W-1%","pat":"R1/4","x":1.15,"y":2.055},{"ref":"R7","v":"1K58-1/4W-1%","pat":"R1/4","x":1.25,"y":1.13},{"ref":"R8","v":"1K58-1/4W-1%","pat":"R1/4","x":1.25,"y":2.055},{"ref":"C1","v":"0.015","pat":"ASCAP.15","x":1.4,"y":0.73},{"ref":"C2","v":"0.010","pat":"ASCAP.15","x":1.4,"y":0.98},{"ref":"C3","v":"0.015","pat":"ASCAP.15","x":1.4,"y":1.655},{"ref":"C4","v":"0.010","pat":"ASCAP.15","x":1.4,"y":1.905},{"ref":"R21","v":"5K","pat":"VTRIM","x":3.3,"y":1.58},{"ref":"R17","v":"15K-1/4W-5%","pat":"R1/4","x":3.0,"y":1.03},{"ref":"R23","v":"5K","pat":"VTRIM","x":4.7,"y":1.58},{"ref":"R42","v":"5K","pat":"VTRIM","x":5.4,"y":1.58},{"ref":"CR1","v":"1N4148","pat":"1N4148","x":3.0,"y":1.73},{"ref":"CR2","v":"1N4148","pat":"1N4148","x":3.0,"y":1.83},{"ref":"R18","v":"15K-1/4W-5%","pat":"R1/4","x":3.0,"y":1.955},{"ref":"R24","v":"4K3-1/4W-5%","pat":"R1/4","x":4.4,"y":1.73},{"ref":"R25","v":"91-1/4W-5%","pat":"R1/4","x":4.4,"y":1.83},{"ref":"U2","v":"NE5538N","pat":"IC8","x":3.1,"y":0.705},{"ref":"U1","v":"NE5534N","pat":"IC8","x":2.35,"y":0.705},{"ref":"C6","v":"0.1/100","pat":"CAP.1","x":2.125,"y":0.405},{"ref":"R19","v":"47K-1/4W-5%","pat":"R1/4","x":3.55,"y":0.755},{"ref":"C12","v":"0.1/100","pat":"CAP.1","x":3.675,"y":0.805},{"ref":"C11","v":"0.1/100","pat":"CAP.1","x":2.875,"y":0.405},{"ref":"C14","v":"0.1/100","pat":"CAP.1","x":3.825,"y":0.405},{"ref":"U3","v":"NE5534N","pat":"IC8","x":4.05,"y":0.705},{"ref":"R43","v":"4K3-1/4W-5%","pat":"R1/4","x":4.9,"y":1.03},{"ref":"R44","v":"91-1/4W-5%","pat":"R1/4","x":4.9,"y":0.905},{"ref":"R20","v":"15K-1/4W-5%","pat":"R1/4","x":3.7,"y":1.03},{"ref":"C23","v":"SOT","pat":"ASCAP.25","x":5.6,"y":1.455},{"ref":"C26","v":"0.1/100","pat":"CAP.1","x":6.5,"y":2.33},{"ref":"C24","v":"SOT","pat":"ASCAP.25","x":6.8,"y":1.705},{"ref":"C10","v":"47/25","pat":"TCAP.2L","x":1.4,"y":0.58},{"ref":"C16","v":"47/25","pat":"TCAP.2L","x":4.525,"y":0.58},{"ref":"C25","v":"0.1/100","pat":"CAP.1","x":5.9,"y":2.33},{"ref":"C19","v":"0.1/100","pat":"CAP.1","x":6.0,"y":0.38},{"ref":"C13","v":"47P","pat":"CAP.2","x":4.05,"y":0.28},{"ref":"C15","v":"0.1/100","pat":"CAP.1","x":4.475,"y":0.805},{"ref":"C17","v":"SOT","pat":"ASCAP.25","x":5.6,"y":0.955},{"ref":"C20","v":"0.1/100","pat":"CAP.1","x":6.2,"y":1.03},{"ref":"C18","v":"SOT","pat":"ASCAP.25","x":6.8,"y":1.205},{"ref":"R45","v":"4K75-1/4W-1%","pat":"R1/4","x":6.0,"y":1.33},{"ref":"L1","v":"1502-2","pat":"LUG","x":5.3,"y":1.805},{"ref":"LK1","v":"929705-01-03","pat":"CON3","x":0.65,"y":1.005},{"ref":"LK2","v":"929705-01-03","pat":"CON3","x":0.65,"y":1.555},{"ref":"LK3","v":"929715-01-6","pat":"CON6","x":7.425,"y":1.255},{"ref":"Q3","v":"2N3906","pat":"TO-92","x":7.05,"y":2.18},{"ref":"Q2","v":"2N3904","pat":"TO-92","x":7.05,"y":0.555}]}, {img:'m8203-board.png', label:'PCB 14-266 Oscillator Card', note:'PCB 14-266 ISSUE 1 drawn to scale from <span class="mono">14-266.PCB</span> (found in a SerialBox folder). The AGC, DIST and CAL trims, the A/B/C frequency links and the 0 / +4 / +8 dBu level link are live at their COMP positions.'});
const REAR = { img:'m8203-rear-tb8205p.svg', w:330, h:470, label:'TB8205P (M8203 guide)', rows:[["TB8205P",0.2758,0.0292,0.665,0.0906],["Pluggable Screw Terminal",0.2938,0.1487,0.6622,0.1695],["NOT CONNECTED",0.0692,0.3066,0.2985,0.3239],["NOT CONNECTED",0.645,0.309,0.8743,0.3263],["NOT CONNECTED",0.0692,0.3385,0.2985,0.3558],["NOT CONNECTED",0.645,0.3409,0.8743,0.3582],["NOT CONNECTED",0.0692,0.3701,0.2985,0.3875],["NOT CONNECTED",0.645,0.3725,0.8743,0.3899],["OUTPUT 1+",0.1364,0.4595,0.2815,0.4769],["1",0.5923,0.4597,0.6094,0.4844],["NOT CONNECTED",0.6486,0.459,0.8779,0.4763],["1",0.4275,0.4616,0.4446,0.4863],["OUTPUT 1-",0.1411,0.49,0.2797,0.5074],["2",0.4275,0.4905,0.4446,0.5151],["2",0.5923,0.4885,0.6094,0.5132],["NOT CONNECTED",0.6486,0.4927,0.8779,0.5101],["OUTPUT 2+",0.1364,0.5242,0.2815,0.5416],["3",0.5923,0.5232,0.6094,0.5479],["NOT CONNECTED",0.6486,0.524,0.8779,0.5414],["3",0.4275,0.5252,0.4446,0.5498],["4",0.5923,0.5522,0.6094,0.5769],["OUTPUT 2-",0.1411,0.5566,0.2797,0.574],["4",0.4275,0.5542,0.4446,0.5788],["NOT CONNECTED",0.6486,0.5559,0.8779,0.5733],["5",0.4275,0.583,0.4446,0.6077],["5",0.5923,0.5811,0.6094,0.6057],["OUTPUT 3+",0.1364,0.5901,0.2815,0.6074],["NOT CONNECTED",0.6469,0.5875,0.8762,0.6048],["6",0.5923,0.6158,0.6094,0.6404],["6",0.4275,0.6177,0.4446,0.6424],["NOT CONNECTED",0.6469,0.6195,0.8762,0.6368],["OUTPUT 3-",0.1411,0.6208,0.2797,0.6382],["7",0.5923,0.6446,0.6094,0.6693],["7",0.4275,0.6466,0.4446,0.6712],["OUTPUT 4+",0.1364,0.6511,0.2815,0.6684],["MIC OUT+",0.6471,0.6521,0.7737,0.6695],["8",0.5923,0.6793,0.6094,0.704],["8",0.4275,0.6813,0.4446,0.7059],["MIC OUT-",0.6469,0.6829,0.7654,0.7002],["OUTPUT 4-",0.1411,0.6836,0.2797,0.7009],["G",0.5923,0.7083,0.6162,0.733],["G",0.4275,0.7103,0.4514,0.7349],["GND",0.2054,0.7167,0.2639,0.734],["GND",0.6469,0.7149,0.7054,0.7322],["MIC OUT :150",0.6432,0.7574,0.8131,0.7747],["-60 dBm",0.8474,0.7574,0.947,0.7747],["W",0.8199,0.758,0.9413,0.7748],["M8203 -Analog Reference Oscillator",0.1994,0.922,0.7485,0.9533]] };

/* ---------------- model ---------------- */
const RA = 10000+619, RB = 14300+1580, C1 = 15e-9, C2 = 10e-9;          // R1+R3, R5+R7 (and R2+R4, R6+R8); C1/C3 0.015, C2/C4 0.010 (14-266.PCB)
const FREQ = { 'A–B': 1/(2*Math.PI*RA*C1), 'B–C': 1/(2*Math.PI*(RA+RB)*C1) };   // link wiring inferred: 999 Hz / 400 Hz
const LEVELS = { '0 dBu':0, '+4 dBu':4, '+8 dBu':8 };
const TAU_AGC = 150e3*1e-6, DT=0.0005, N=2000;                          // R14 150K × C9 1/35 (inferred pairing)
const D = {};
function reset(){ Object.assign(D,{ lk:'A–B', lvl:'+4 dBu', agc:0.5, agc2:0.5, dist:0.4, cal1:0.55, cal2:0.45, tOn:0, on:true, load:600, out:1, sel:null, rsel:null, ev:[] }); }
const f0 = ()=> FREQ[D.lk];
const agcTrim = ()=> D.lk==='A–B'? D.agc : D.agc2;                       // two AGC trims, R11 and R22 (one per frequency, inferred)
const exc0 = ()=> 0.005+0.06*D.dist;                                      // DIST sets the AGC loop's excess gain (inferred)
let ENV=null, EKEY='';
function envelope(){ const key=[D.lk,D.agc,D.agc2,D.dist,D.tOn,D.on].join(); if(key===EKEY) return ENV; EKEY=key;
  const A=new Float32Array(N), Vc=new Float32Array(N), Ex=new Float32Array(N); const Aset=0.9*Math.pow(10,(agcTrim()-0.5)*0.15); const w=2*Math.PI*f0();
  let a=1e-5, v=0;
  for(let i=0;i<N;i++){ const t=i*DT; if(!D.on||t<D.tOn){ a=1e-5; v=0; A[i]=0; Vc[i]=0; Ex[i]=0; continue; }
    const e=exc0()*(1-v/Aset); a=Math.max(1e-6, a*Math.exp(w*e/2*DT)); a=Math.min(a,7.5);            // σ ≈ ω·ΔG/6, ΔG = 3e
    v += (a>v? DT/0.004 : DT/TAU_AGC)*(a-v); /* peak detector: CR1/CR2 charge C9 fast, R13/R14 bleed it */ A[i]=a; Vc[i]=v; Ex[i]=e; }
  ENV={A,Vc,Ex,Aset}; return ENV; }
const idx=t=>clamp(Math.floor(t/DT),0,N-1);
function chain(t){ t=t==null?SIM.t:t; const E=envelope(), i=idx(t), a=E.A[i], rel=a/E.Aset, nom=LEVELS[D.lvl];
  const osc = a>0? V2dBu(a/Math.SQRT2) : -200;
  const line = a>0? nom + dB(rel) + (D.out<=2? (D.cal1-0.5)*2 : (D.cal2-0.5)*2) : -200;     // CAL trims R23 (outs 1–2) / R42 (outs 3–4), inferred split
  const atL = line + dB(D.load/(D.load+60));
  const mic = a>0? -60 + dB(rel) : -200;
  const thd = 0.004 + 2.4*Math.pow(exc0(),1.5)*10;                      // % (inferred): more loop gain, faster start, more AGC ripple
  const stages=[{name:'Wien oscillator U1 (NE5534)', db:osc, g:null, note:`${f0().toFixed(1)} Hz`},{name:'Level set LK3 ('+D.lvl+')', db:nom+dB(rel), g:null, note:'R26 16K2 / R27 10K2 / R28 6K49'},{name:'Line out '+D.out+' (U4/U5 + 2 × 30R1)', db:line, g:null, max:24},{name:'At '+D.load+' Ω', db:atL, g:dB(D.load/(D.load+60))},{name:'MIC OUT (150 Ω pad)', db:mic, g:null, note:'R51–R58 8K2 / 82 / 1K5'}];
  return {a, rel, osc, line, atL, mic, thd, stages, vc:E.Vc[i], ex:E.Ex[i], settled: a>0 && Math.abs(rel-1)<0.01}; }

/* ---------------- actions ---------------- */
const NM={agc:'AGC trim R11',agc2:'AGC trim R22',dist:'DIST trim R21',cal1:'CAL trim R23',cal2:'CAL trim R42'};
const A={
  set(k,v,log){ D[k]=v; D.ev.push({t:SIM.t,name:NM[k].split(' ')[0]+' '+k.slice(-1)}); if(log) act(NM[k]+' adjusted', tr=>{ const c=chain(SIM.duration-0.001);
    if(k==='agc'||k==='agc2') tr(`${NM[k]} (silk “AGC”) sets where the J174 JFET (Q1) settles: oscillator ${fmtDb(c.osc)} ${inf}${(k==='agc')!==(D.lk==='A–B')?' — this trim serves the other frequency position':''}`);
    if(k==='dist') tr(`DIST (R21) trades start-up speed against distortion: loop excess ${(exc0()*100).toFixed(1)} %, THD ≈ ${c.thd.toFixed(3)} % ${inf}. Press “Power on” to see the new start-up.`);
    if(k==='cal1'||k==='cal2') tr(`${NM[k]} (silk “CAL”) trims the ${k==='cal1'?'first':'second'} output pair: line out ${fmtDb(c.line)} ${inf}`); }); },
  link(){ act('Frequency links LK1 / LK2 → '+(D.lk==='A–B'?'B–C':'A–B'), tr=>{ D.lk=D.lk==='A–B'?'B–C':'A–B'; D.tOn=SIM.t; tr(`LK1/LK2 (3-pin, silk A B C) switch the Wien arms: ${D.lk==='A–B'?'R1+R3 = 10.62 kΩ':'R1+R3+R5+R7 = 26.50 kΩ'} with C1/C3 0.015 µF → f = 1/(2πRC) = ${f0().toFixed(1)} Hz ${inf}`); tr('The oscillator re-settles (restart shown from the playhead)'); }); },
  level(){ const ks=Object.keys(LEVELS); act('Level link LK3 → '+ks[(ks.indexOf(D.lvl)+1)%3], tr=>{ D.lvl=ks[(ks.indexOf(D.lvl)+1)%3]; tr(`LK3 (6-pin, silk A 0 dBu / B +4 dBu / C +8 dBu) selects ${D.lvl} on the line outputs`); }); },
  power(){ act('Power on (start-up from the playhead)', tr=>{ D.on=true; D.tOn=SIM.t; tr('±22 V applied: the oscillator starts from noise and grows at σ ≈ ω·ΔG/6 until the AGC (Q1 J174 with CR1/CR2 1N4148, C9 1 µF) pulls the loop gain back to 3'); tr(`Expected settling ≈ ${(5*TAU_AGC*1000).toFixed(0)} ms (AGC filter ${inf})`); }); },
  part(r){ act('Part '+r, tr=>{ D.sel=r; const p=BRD.parts.find(q=>q.ref===r); tr(`${r}: ${p&&p.v?p.v:'—'} · ${p?p.pat:''}`); if(ROLE[r]) tr(ROLE[r]); }); },
  rrow(i){ act('Terminal '+REAR.rows[i][0], tr=>{ D.rsel=i; tr(rearSig(REAR.rows[i][0])||REAR.rows[i][0]); const m=REAR.rows[i][0].match(/OUTPUT (\d)/); if(m){ D.out=+m[1]; } }); },
  reset(){ act('Start over', tr=>{ reset(); tr('Power on at 0 s; 1 kHz; +4 dBu'); }); },
};
const ROLE={Q1:'Q1 J174 P-channel JFET: the AGC element (variable resistance in the Wien loop, inferred)',U1:'U1 NE5534N: the oscillator amplifier (inferred)',U2:'U2 (silk NE5538N): buffer / AGC rectifier stage',U3:'U3 NE5534N',U4:'U4 (silk NE5538N): output driver, outputs 1–2',U5:'U5 (silk NE5538N): output driver, outputs 3–4',LK1:'LK1 3-pin (A B C): frequency arm',LK2:'LK2 3-pin (A B C): frequency arm',LK3:'LK3 6-pin: 0 / +4 / +8 dBu',R11:'R11 PT10V-5K “AGC”',R22:'R22 PT10V-5K “AGC”',R21:'R21 PT10V-5K “DIST”',R23:'R23 PT10V-5K “CAL”',R42:'R42 PT10V-5K “CAL”',C1:'C1 0.015 µF (C50PF-153): Wien capacitor',C2:'C2 0.010 µF',C3:'C3 0.015 µF',C4:'C4 0.010 µF',R1:'R1 10K 1 %: Wien arm',R3:'R3 619 1 %: Wien arm (10K + 619 = 10.62K)',R5:'R5 14K3 1 %',R7:'R7 1K58 1 % (14K3 + 1K58 = 15.88K)',Q2:'Q2 2N3904',Q3:'Q3 2N3906',L1:'L1 lug'};
for(let i=34;i<=41;i++) ROLE['R'+i]='R'+i+' 30R1 1 W (R01MF-30): output build-out — 8 resistors for 4 balanced outputs';
function rearSig(lab){ const c=chain(); const m=lab.match(/OUTPUT (\d)([+-])/); if(m) return `OUTPUT ${m[1]}${m[2]}: ${fmtDb(c.line)} balanced (${f0().toFixed(0)} Hz)`; if(/MIC OUT/.test(lab)) return `MIC OUT: ${fmtDb(c.mic,' dBm')} into 150 Ω`; if(/NOT CONNECTED/.test(lab)) return 'Not connected — the M8203 has no input'; return null; }

/* ---------------- drawings ---------------- */
function ctl(){ const k=(key,x,y,short,ly)=>({k:key,label:NM[key],short,kind:'trim',x,y,ly,get:()=>D[key],set:(v,l)=>A.set(key,v,l)});
  return [k('agc',2.6,1.58,'AGC R11',2.05), k('dist',3.3,1.58,'DIST',2.05), k('agc2',4.0,1.58,'AGC R22',1.15), k('cal1',4.7,1.58,'CAL R23',2.05), k('cal2',5.4,1.58,'CAL R42',1.15),
    {k:'lk',label:'LK1 / LK2 frequency links',kind:'jumper',x:0.65,y:1.28,get:()=>0,show:()=>D.lk,click:()=>A.link()},
    {k:'lk3',label:'LK3 level link',kind:'jumper',x:7.425,y:1.255,get:()=>0,show:()=>D.lvl.replace(' dBu',''),click:()=>A.level()}]; }
function panelHTML(){ BRD.ctl=ctl(); const c=chain();
  return card(`The card — M8203 oscillator · ${f0().toFixed(1)} Hz at ${D.lvl}${c.a>0&&!c.settled?' (settling)':''}`, boardSVG(BRD,{sel:D.sel})+controlsHTML())+`<div class="grid2">${card('Front edge', handleSVG('M8203'))}${card('Rear module TB8205P', rearSVG(Object.assign(REAR,{sig:rearSig}),{sel:D.rsel})+`<div class="small muted">CorelDRAW art (vector): ${SIM.src('#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8203 - rear module options.cdr','M8203 - rear module options.cdr')} (2012|45) as Corel printed it to ${SIM.src('#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8203 - rear module options.pdf','.pdf')}: four line outputs and MIC OUT; the input terminals are “NOT CONNECTED”.</div>`)}</div>`; }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
  <button data-c="power">⏻ Power on at the playhead</button>
  <label>Watch output <select data-c="out">${[1,2,3,4].map(n=>`<option ${n===D.out?'selected':''}>${n}</option>`).join('')}</select></label>
  <label>Load <select data-c="load">${[600,10000].map(v=>`<option value="${v}" ${v===D.load?'selected':''}>${v>=1000?v/1000+' k':v} Ω</option>`).join('')}</select></label>
  <button data-c="reset">Start over</button></div>`; }
function bind(root){ bindBoard(root,BRD,r=>A.part(r)); root.querySelectorAll('.rrow').forEach(g=>g.onclick=()=>A.rrow(+g.dataset.i));
  root.querySelectorAll('[data-c]').forEach(e=>{ const c=e.dataset.c; if(c==='reset') e.onclick=()=>A.reset(); else if(c==='power') e.onclick=()=>A.power(); else e.onchange=()=>{ D[c]=+e.value; SIM.refresh(); }; }); }
function stateHTML(){ const c=chain(); return `<table class="kv"><tr><th>Frequency</th><td class="mono">${f0().toFixed(1)} Hz (links ${D.lk}) ${inf}</td></tr><tr><th>Oscillator</th><td class="mono">${c.a>0?(c.a*1).toFixed(3)+' V peak':'off'} · ${c.settled?'settled':'settling'}</td></tr><tr><th>AGC control</th><td class="mono">${c.vc.toFixed(3)} V · loop excess ${(c.ex*100).toFixed(2)} %</td></tr><tr><th>Line outputs</th><td class="mono">${fmtDb(c.line)} (${D.lvl} nominal), ${fmtDb(c.atL)} at ${D.load} Ω</td></tr><tr><th>MIC OUT</th><td class="mono">${fmtDb(c.mic,' dBm')} · 150 Ω</td></tr><tr><th>THD</th><td class="mono">≈ ${c.thd.toFixed(3)} % ${inf}</td></tr></table>`; }
function lanes(){ const E=envelope(), f=f0(); return [
  waveLane('Oscillator U1 (envelope grows from noise)', 50, (t)=>{ const a=E.A[idx(t)]; return a*Math.sin(2*Math.PI*f*(t-D.tOn)); }, {f, col:SIM.css('--accent'), level:V2dBu(E.Aset/Math.SQRT2)}),
  valueLane('AGC control (Q1 gate, C9)', 30, t=>E.Vc[idx(t)], 0, E.Aset*1.3, {fmt:v=>v.toFixed(3)+' V', col:SIM.css('--warn')}),
  valueLane('Loop excess gain ΔG/3', 30, t=>E.Ex[idx(t)]*100, -2, 7, {fmt:v=>v.toFixed(2)+' %', col:SIM.css('--bad')}),
  waveLane('Line output '+D.out+' ('+D.lvl+')', 46, t=>{ const c=chain(t); return c.a>0? sineV(t-D.tOn,c.line,f,24) : 0; }, {f, col:SIM.css('--accent2'), level:LEVELS[D.lvl]+1}),
  waveLane('MIC OUT (−60 dBm, ×1000)', 34, t=>{ const c=chain(t); return c.a>0? sineV(t-D.tOn,c.mic+60,f) : 0; }, {f, col:SIM.css('--ink2'), level:1}),
  eventLane('Your adjustments', ()=>D.ev) ]; }
function secondHTML(){ const E=envelope(); let ts=null; for(let i=0;i<N;i++){ if(E.A[i]>0 && Math.abs(E.A[i]/E.Aset-1)<0.01){ let ok=true; for(let j=i;j<Math.min(N,i+100);j++) if(Math.abs(E.A[j]/E.Aset-1)>=0.01){ ok=false; break; } if(ok){ ts=i*DT; break; } } }
  let pk=0; for(let i=0;i<N;i++) pk=Math.max(pk,E.A[i]/E.Aset);
  return `<table class="kv"><tr><th>Cycles</th><td class="mono">≈ ${Math.round(f0()*(1-D.tOn))} of ${f0().toFixed(1)} Hz</td></tr><tr><th>Power on</th><td class="mono">${SIM.fmtT(D.tOn)}</td></tr><tr><th>Settled to 1 %</th><td class="mono">${ts!=null?SIM.fmtT(ts):'not within this second'}</td></tr><tr><th>Overshoot</th><td class="mono">${((pk-1)*100).toFixed(1)} %</td></tr><tr><th>Wien maths</th><td class="mono">A–B: 1/(2π·10.62 kΩ·15 nF) = ${FREQ['A–B'].toFixed(1)} Hz; B–C: 1/(2π·26.50 kΩ·15 nF) = ${FREQ['B–C'].toFixed(1)} Hz</td></tr></table><p class="small">An oscillator's first second is its start-up: from noise, the amplitude grows exponentially while the loop gain is above 3, then the JFET AGC catches it — with an overshoot set by how much excess gain the DIST trim allows. The 1 kHz and 400 Hz figures fall straight out of the 1 % resistor values on the board.</p>`; }
const lessons=[
  {title:'The card', auto:true, check:()=>true, body:'<p>The M8203 is the 8200-series “Analog Reference Oscillator” (rear-module guide): a line-up tone source with four balanced line outputs and a 150 Ω MIC OUT at −60 dBm, and no input. No manual or schematic survives: everything here is read from the PCB file 14-266 (Gerry Bell, Feb 1993). Zoom window: <b>1 s</b>.</p>'},
  {title:'1 · Watch it start', check:()=>SIM.win>=0.99&&D.on, hint:'Zoom window → 1 s; press “Power on” with the playhead at 0.', body:'<p>Power the card at 0 s and look at the first lane: the tone grows out of noise, overshoots and settles.</p><p><b>Goal:</b> view the whole second.</p>'},
  {title:'2 · 400 Hz', check:()=>D.lk==='B–C', hint:'Click the LK1/LK2 jumper on the left of the board.', body:'<p>The A/B/C links switch the Wien arms. The values on the board give 999 Hz with 10K + 619 Ω and 400 Hz with 14K3 + 1K58 added in series — both against 0.015 µF.</p><p><b>Goal:</b> select 400 Hz.</p>'},
  {title:'3 · +8 dBu line-up', check:()=>D.lvl==='+8 dBu', hint:'Click the LK3 jumper until it reads +8.', body:'<p>LK3 is silk-screened 0 dBu / +4 dBu / +8 dBu.</p><p><b>Goal:</b> +8 dBu on the outputs.</p>'},
  {title:'4 · Faster start, more distortion', check:()=>D.dist>0.75, hint:'Raise the DIST trim (R21), then press Power on at 0 s.', body:'<p>More excess loop gain starts the oscillator sooner but leaves more AGC ripple — more distortion. Compare the settling time in the One second tab.</p><p><b>Goal:</b> DIST above 75 %.</p>'},
  {title:'Done', auto:true, check:()=>true, body:'<p>See <b>Findings</b> — including where this board was hiding.</p>'} ];
const blocks={ w:820, h:290, note:'Read from the parts and silk of 14-266.PCB; topology inferred (no schematic survives).', nodes:{
  wien:{x:10,y:30,w:170,h:60,t:'Wien network',s:['R1–R8 1 %, C1–C4','LK1 / LK2 (A B C)'],lv:()=>f0().toFixed(1)+' Hz',info:'Two RC arms per side; the links pick 999 Hz or 400 Hz.'},
  osc:{x:210,y:30,w:150,h:60,t:'U1 NE5534',s:['oscillator amplifier'],lv:()=>fmtDb(chain().osc),info:'Gain held at exactly 3 by the AGC.'},
  agc:{x:210,y:160,w:150,h:60,t:'AGC',s:['Q1 J174, CR1/CR2','R11 / R22 “AGC”, C9'],lv:()=>chain().vc.toFixed(2)+' V',info:'Rectifies the output and turns the JFET\'s resistance to hold the amplitude.'},
  dist:{x:10,y:160,w:170,h:60,t:'DIST R21',s:['loop excess gain'],info:'Trades start-up time against distortion.'},
  lvl:{x:390,y:30,w:150,h:60,t:'LK3 level',s:['0 / +4 / +8 dBu','R26–R28'],lv:()=>D.lvl,info:'Level select by link.'},
  out:{x:570,y:30,w:160,h:60,t:'U4 / U5 drivers',s:['CAL R23 / R42','R34–R41 30R1 1 W'],lv:()=>fmtDb(chain().line),info:'Two drivers, four balanced 60 Ω outputs.'},
  mic:{x:570,y:160,w:160,h:60,t:'MIC OUT pad',s:['R51–R58 8K2 / 82 / 1K5'],lv:()=>fmtDb(chain().mic,' dBm'),info:'150 Ω, −60 dBm (terminal sheets).'} },
  edges:[['wien','osc'],['osc','agc'],['agc','osc','JFET'],['dist','agc'],['osc','lvl'],['lvl','out'],['out','mic']] };
function wienSheet(hl){ const H=(hl&&hl[0]||'').toUpperCase(), P=r=>BRD.parts.find(p=>p.ref===r)||{v:''}, on=r=>H&&r.toUpperCase()===H, col=r=>on(r)?'var(--warn)':'var(--ink)';
  const R=(x,y,r)=>`<g><path d="M${x} ${y}h8l3 -5l6 10l6 -10l6 10l6 -10l3 5h8" fill="none" stroke="${col(r)}" stroke-width="1.4"/><text x="${x+23}" y="${y-9}" font-size="10" text-anchor="middle" fill="var(--accent2)">${r}</text><text x="${x+23}" y="${y+18}" font-size="9" text-anchor="middle" fill="var(--ink2)">${esc(P(r).v)}</text></g>`;
  const C=(x,y,r)=>`<g><path d="M${x} ${y}h18M${x+18} ${y-9}v18M${x+24} ${y-9}v18M${x+24} ${y}h18" fill="none" stroke="${col(r)}" stroke-width="1.4"/><text x="${x+21}" y="${y-13}" font-size="10" text-anchor="middle" fill="var(--accent2)">${r}</text><text x="${x+21}" y="${y+22}" font-size="9" text-anchor="middle" fill="var(--ink2)">${esc(P(r).v)}</text></g>`;
  const W=d=>`<path d="${d}" fill="none" stroke="var(--ink)" stroke-width="1.3"/>`, T=(x,y,t,c)=>`<text x="${x}" y="${y}" font-size="10" fill="${c||'var(--ink2)'}">${t}</text>`;
  let s=`<svg viewBox="0 0 900 380" style="width:100%;min-width:780px;background:var(--lane);border:1px solid var(--line);border-radius:8px" role="img" aria-label="Wien network as read from the board">`;
  s+=T(20,24,'Series arm (top row of the board) — values from 14-266.PCB; connection order inferred','var(--ink)');
  s+=W('M20 70H40')+R(40,70,'R1')+R(96,70,'R3')+W('M152 70H180')+`<rect x="180" y="56" width="50" height="28" rx="4" fill="#ffd84a" stroke="#000"/><text x="205" y="74" text-anchor="middle" font-size="11">LK1 ${D.lk==='B–C'?'B–C':'A–B'}</text>`+W('M230 70H250')+R(250,70,'R5')+R(306,70,'R7')+W('M362 70H390')+C(390,70,'C1')+W('M432 70H460')+T(466,74,'→ U1 + (oscillator)','var(--accent2)');
  s+=W('M200 84V110H420V70')+T(250,124,D.lk==='A–B'?'A–B: R5+R7 shorted → 10.62 kΩ':'B–C: R5+R7 in series → 26.50 kΩ','var(--warn)');
  s+=T(20,184,'Shunt arm','var(--ink)')+W('M20 230H40')+R(40,230,'R2')+R(96,230,'R4')+W('M152 230H180')+`<rect x="180" y="216" width="50" height="28" rx="4" fill="#ffd84a" stroke="#000"/><text x="205" y="234" text-anchor="middle" font-size="11">LK2</text>`+W('M230 230H250')+R(250,230,'R6')+R(306,230,'R8')+W('M362 230H390')+C(390,230,'C3')+W('M432 230H460')+T(466,234,'→ ground / U1 +','var(--accent2)');
  s+=C(390,300,'C2')+C(520,300,'C4')+T(390,345,'C2 / C4 0.010 µF: role not determined (third frequency? trimming?)');
  s+=T(620,74,'f = 1 / (2π R C)','var(--ink)')+T(620,94,`A–B: ${FREQ['A–B'].toFixed(1)} Hz`)+T(620,112,`B–C: ${FREQ['B–C'].toFixed(1)} Hz`)+T(620,150,'AGC: Q1 J174 (JFET), CR1/CR2 1N4148,')+T(620,166,'R12 33K, R13/R14 150K, R15 220K, C9 1/35');
  return s+'</svg>'; }
function dsnSheet(){ const L=['LINE OUTPUTS','-60dBm OUT','MIC','CON20','SA14-146 TERMINAL INTERFACE ASSEMBLY','ST8205 · SOLDER TERMINAL INTERFACE ASSEMBLY','TERMINAL.DSN · NOV. 04, 1999','CHMR-FM TURRET INTERFACE (title-block template)'];
  return `<svg viewBox="0 0 700 300" style="width:100%;max-width:700px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="40" y="40" width="80" height="220" fill="none" stroke="var(--ink)"/><text x="80" y="34" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">CON20</text>${L.map((l,i)=>`<text x="150" y="${70+i*26}" font-size="12" fill="${i<3?'var(--accent2)':'var(--ink2)'}">${esc(l)}</text>`).join('')}</svg>`; }
const sheets=[
  {name:'Wien network (read from the board)', svg:wienSheet, note:'There is no oscillator schematic in the archive. This sheet places the board\'s own part values in the arrangement that makes the 1 kHz and 400 Hz arithmetic work — the arrangement is inferred.'},
  {name:'M8203osc.DSN contents', svg:dsnSheet, note:'The file named “M8203osc.DSN” holds only a terminal-interface page (CON20 to line outputs and MIC −60 dBm), copied from TERMINAL.DSN. The strings shown are all it contains.'},
  {name:'14-266 parts list', svg:hl=>{ const H=(hl&&hl[0]||'').toUpperCase(); return `<table class="kv small"><tr><th>Ref</th><th>Value</th><th>Footprint</th><th>Note</th></tr>${BRD.parts.filter(p=>!H||p.ref.toUpperCase().includes(H)||p.v.toUpperCase().includes(H)).sort((a,b)=>a.ref.localeCompare(b.ref,undefined,{numeric:true})).map(p=>`<tr><td class="mono">${esc(p.ref)}</td><td class="mono">${esc(p.v)}</td><td class="mono">${esc(p.pat)}</td><td>${ROLE[p.ref]||''}</td></tr>`).join('')}</table>`; }, note:'All 122 COMP records of 14-266.PCB.'} ];
function softHTML(){ const c=chain(); return `<div class="grid2">${card('Signal path at the playhead', stageTable(c.stages))}${card('Level diagram', levelSVG(c.stages))}</div>${card('Oscillator start-up model', `<p class="small">Envelope: dA/dt = A · ω · ΔG / 6, with ΔG = 3 · e and e = e₀ · (1 − V<sub>AGC</sub> / A<sub>set</sub>); dV<sub>AGC</sub>/dt = (A − V<sub>AGC</sub>) / τ. e₀ from DIST (now ${(exc0()*100).toFixed(1)} %), τ = 150 kΩ × 1 µF = ${(TAU_AGC*1000).toFixed(0)} ms. All ${inf} — a standard Wien-bridge/JFET-AGC description fitted to this board's parts.</p>`)}`; }
const findings=[
  `<b>Artwork ${SIM.year(2026)}: rear module now from the CorelDRAW guide.</b> TB8205P is vector art from ${SIM.src('#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8203 - rear module options.cdr','M8203 - rear module options.cdr')} (2012-01-16, via CorelDRAW's own PDF; libcdr turns its terminal-number text into giant glyphs). The guide offers only TB8205P, but the older ${SIM.src('#MF8200 #SERIES/M8203 - #Master #MF82/M8203 - #Engineering/M8203_1trm.cdr','M8203_1trm.cdr')} / ${SIM.src('#MF8200 #SERIES/M8203 - #Master #MF82/M8203 - #Engineering/M8203_2trm.cdr','M8203_2trm.cdr')} (2002) also list ST8200 solder, QC8200 QCP and TB8205 screw modules, each printed with “MIC OUT :150 Ω -60 dBm”, and ${SIM.src('#MF8200 #SERIES/M8203 - #Master #MF82/M8203 - #Engineering/M8203TRM.CDR','M8203TRM.CDR')} (1998) is a three-panel CorelDRAW 5 sheet whose text does not convert.`,
  `<b>The M8203's PCB was filed under SerialBox.</b> <span class="mono">#SERIALBOX #SERIES/SERIALBOXX - #AA100/aa103/PCB/14-266.PCB</span> has the title block “M8203 · 14-266.PCB · Oscillator Card · Gerry Bell · Feb 23,1993”. The BOM tool confirms “14--266 … M8203 OSCILLATOR MODULE (SEE NOTES) ISSUE 1”. The M8203 folder itself has no board.`,
  `<b>The “oscillator” design file is not the oscillator.</b> <span class="mono">M8203osc.DSN</span> (NOV. 04, 1999) is a copy of a TERMINAL.DSN page — “SA14-146 TERMINAL INTERFACE ASSEMBLY”, ST8205, CON20, “-60dBm OUT MIC”, with a CHMR-FM turret-interface title-block template.`,
  `<b>The board's values pin down the tones.</b> 10K + 619 Ω (1 %) against 0.015 µF gives 999 Hz; adding 14K3 + 1K58 gives 400.4 Hz — the two classic line-up tones, to within 0.1 % ${inf}.`,
  `<b>Its level options are printed on the silk.</b> LK3: “0 dBu”, “+4 dBu”, “+8 dBu”; the trims are labelled AGC (R11 and R22), DIST (R21) and CAL (R23, R42).`,
  `<b>A part number that does not exist.</b> The silk names three ICs “NE5538N”, beside NE5534N parts; it is probably a mistyped NE5532/NE5534.`,
  `<b>A 2007 update file belongs to a POD.</b> <span class="mono">14-266-UPDATE.pcb</span> (P-CAD) contains “Oscillator Card” but also “POD32-ISS1”, and is exactly the same size as <span class="mono">aa103iss1.pcb</span> (294 903 bytes) beside it.`,
  `<b>Terminal sheets agree.</b> Both 2007 sheets and the 2012 guide show four balanced outputs, MIC OUT 150 Ω −60 dBm, and every input terminal “NOT CONNECTED”. The README's “4 outputs plus mic out” is confirmed.`,
];
const assume=[`Wien-bridge topology, link wiring and the 999 Hz / 400 Hz pairing ${inf} from the 1 % values.`,`JFET-AGC start-up model, its time constant and the THD law ${inf}.`,`Which CAL trim serves which output pair, and the two AGC trims one per frequency, ${inf}.`,`Line outputs 60 Ω (2 × 30R1) from the eight R01MF-30 parts.`];
P={ id:'m8203', product:'M8203', year:1993, family:'8200 Distribution Series', folder:'#MF8200 #SERIES/M8203 - #Master #MF82',
  name:'M8203 · Analog reference oscillator (1993|26)', defaultZoom:0, tlNote:'At 1 s you see the start-up envelope and the AGC settling; zoom to 2 ms to see the tone itself.', toneF:()=>f0(),
  summary:'The 8200-series line-up tone card: a Wien-bridge oscillator with JFET AGC, 1 kHz or 400 Hz by link, 0/+4/+8 dBu, four balanced outputs and a −60 dBm mic output. Its board was found misfiled in a SerialBox folder and is drawn from that Tango file; watch the oscillator start from noise and settle.',
  highlights:['PCB 14-266 found misfiled and rendered to scale','999 Hz / 400 Hz worked out from the 1 % parts','Oscillator start-up and AGC settling over one second','AGC, DIST and CAL trims, frequency and level links','The “M8203osc.DSN” file is a terminal sheet'],
  hint:'Click a trim (AGC, DIST, CAL), the LK1/LK2 or LK3 links, a part, or a rear terminal; press Power on.',
  reset, chain, lanes, panelHTML, bind, stateHTML, secondHTML, lessons, blocks, sheets, softHTML, findings, footnotes:[{text:"The TB8205P rear module is drawn from the 2012 CorelDRAW guide via CorelDRAW's own PDF (libcdr turns its terminal numbers into giant glyphs).",src:"#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8203 - rear module options.cdr"},{text:"On the M8203's TB8205P all six input-side terminals and six of the right-hand terminals are NOT CONNECTED; only OUTPUT 1–4 ±, MIC OUT ± and GND are used.",src:"#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8203 - rear module options.pdf"},{text:"The 2002 terminal sheets also offer ST8200 solder, QC8200 QCP and TB8205 screw modules, each printed “MIC OUT :150 Ω -60 dBm”; the 2012 guide keeps only TB8205P.",src:"#MF8200 #SERIES/M8203 - #Master #MF82/M8203 - #Engineering/M8203_1trm.cdr"},{text:"M8203TRM.CDR (1998) is a three-panel CorelDRAW 5 sheet whose text does not convert.",src:"#MF8200 #SERIES/M8203 - #Master #MF82/M8203 - #Engineering/M8203TRM.CDR"}], assume,
  tutPanel:()=>card('The card', boardSVG(Object.assign(BRD,{ctl:ctl()}),{sel:D.sel})+controlsHTML())+card('State', stateHTML()),
  sources:['#SERIALBOX #SERIES/SERIALBOXX - #AA100/aa103/PCB/14-266.PCB, 14-266-UPDATE.pcb, aa103iss1.pcb','MISC/BOM Summary Tool.xlsx','M8203 - #Master #MF82/M8203 - #Engineering/M8203_1trm.pdf, M8203_2trm.pdf, M8203TRM.CDR','M8203 - #Master #MF82/M8203 - #Engineering #DESIGN/M8203osc.DSN','8200 Series Rear Module options graphical Guides…/M8203 - rear module options.pdf','8205-004 ISS 2 (HANDLE) .pdf'] };
reset();
register();

})();
