/* =====================================================================
   M8206 / M8206B — Matrixing audio distribution amplifier, 2 in → 6 out (Ward-Beck, 1998|31)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model (no firmware on this card).

   Sources used (#MF8200 #SERIES/M8206 - #Engineering #MF82/…):
   - m8206.pdf (2002|35) and M8206MAN.WPD (1999|32): general text and specifications
   - M8206.DSN / M8206.DBK (OrCAD, title block "M8206/B MATRIXING AUDIO DISTRIBUTION AMPLIFIER", AUG 26,1998,
       internal file name "M8204B.DSN"): part references (U1–U4, R14A/B, R32A/B, R45–R50, R60–R65 …), net labels
       LEFT INPUT / RIGHT INPUT / SH / +22 V / −22 V, the note "*R45-R50 AND R60-R65 ARE 30R FOR M8206B",
       and a library cache holding parts from other designs
   - M8206TRM.CDR (1998|31, "M8206/B TERMINAL OPTIONS": TB8205 / QC8200 / ST8200; terminal names from its sidecar)
   - Artwork 2026|59: its TB8205 panel → assets/m8206-rear-tb8205.svg (CorelDRAW → SVG; labels re-set, order inferred)
   - M8206MAN.CDR (1998|31) — a frame/power-supply brochure page, not this card
   - D8210 & D8212 - #Mechanical #DA #2016/8205-004 ISS 2 (HANDLE) .pdf; card size from the manual
   No PCB file for this card survives: the card outline is drawn to the manual's dimensions and the
   control positions are inferred. Anything not in those files is marked "inferred" on screen.
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

const TERMS = {
  TB8205:{ title:'TB8205', sub:'Screw terminal (M8206TRM.CDR)', left:['LEFT IN +','LEFT IN −','LEFT SH','OUT 1 +','OUT 2 +','OUT 3 +','OUT 4 +','OUT 5 +','OUT 6 +','GND'], right:['RIGHT IN +','RIGHT IN −','RIGHT SH','OUT 1 −','OUT 2 −','OUT 3 −','OUT 4 −','OUT 5 −','OUT 6 −','GND'], foot:'M8206/B terminal options: TB8205 screw, QC8200 QCP, ST8200 solder' } };
// Rear module art: the TB8205 panel of M8206TRM.CDR (CorelDRAW 5, 1998) converted to SVG (Artwork 2026|59).
// libcdr drops CorelDRAW 5 text, so the labels are re-set into the drawing's own dashed label boxes; which name goes in
// which box is inferred from the order of the text objects in the sidecar (listed bottom-up per column).
const REAR6 = { img:'m8206-rear-tb8205.svg', w:330, h:611, label:'TB8205 screw terminal (M8206TRM.CDR)', rows:[["LEFT IN +",0.0813,0.2715,0.4990,0.3054],["LEFT IN −",0.0813,0.3029,0.4990,0.3357],["LEFT SH",0.0813,0.3336,0.4990,0.3644],["OUT 1 −",0.0819,0.4184,0.4990,0.4516],["OUT 2 −",0.0819,0.4513,0.4990,0.4845],["OUT 3 −",0.0819,0.4823,0.4990,0.5155],["OUT 4 −",0.0819,0.5143,0.4990,0.5475],["OUT 5 −",0.0819,0.5453,0.4990,0.5785],["OUT 6 −",0.0819,0.5762,0.4990,0.6094],["RIGHT IN −",0.0819,0.6390,0.4990,0.6722],["GND",0.0819,0.6700,0.4990,0.7032],["OUT 1 +",0.4950,0.4184,0.9120,0.4516],["OUT 2 +",0.4950,0.4513,0.9120,0.4845],["OUT 3 +",0.4950,0.4823,0.9120,0.5155],["OUT 4 +",0.4950,0.5143,0.9120,0.5475],["OUT 5 +",0.4950,0.5453,0.9120,0.5785],["OUT 6 +",0.4950,0.5762,0.9120,0.6094],["RIGHT SH",0.4950,0.6081,0.9120,0.6413],["RIGHT IN +",0.4950,0.6390,0.9120,0.6722],["GND",0.4950,0.6700,0.9120,0.7032]],
  draw(){ const W=this.w, H=this.h; let t=`<text x="${W/2}" y="${0.17*H}" text-anchor="middle" font-size="15" font-weight="700" fill="#111">TB8205</text><text x="${W/2}" y="${0.17*H+16}" text-anchor="middle" font-size="10.5" fill="#111">SCREW TERMINAL</text>`;
    this.rows.forEach(r=>{ t+=`<text x="${(r[1]+r[3])/2*W}" y="${(r[2]+r[4])/2*H+3.3}" text-anchor="middle" font-size="9" fill="#222">${esc(r[0])}</text>`; });
    return t+`<text x="${W/2}" y="${0.735*H}" text-anchor="middle" font-size="8.5" fill="#555">left: − · right: +</text>`; } };
const VER={ M8206:{rs:300,z:'600 Ω balanced'}, M8206B:{rs:30,z:'60 Ω balanced'} };
const MAXOUT=30, OP_CLIP=V2dBu(16.3/Math.SQRT2);
const D={};
function reset(){ Object.assign(D,{ ver:'M8206', lDbu:4, rDbu:4, rPh:0, rF:1000, sensL:null, sensR:null, mix:0.5, load:600, sel:null, rsel:null, ev:[], inserted:true }); D.sensL=D.sensR=(0-(-6))/36; }
const V=()=>VER[D.ver];
const gL=()=>-6+36*D.sensL, gR=()=>-6+36*D.sensR;
function sumDb(a,b,ph){ const va=dBu2V(a), vb=dBu2V(b); return V2dBu(Math.hypot(va+vb*Math.cos(ph), vb*Math.sin(ph))); }
function chain(){ const on=D.inserted?0:-200, l1=D.lDbu+gL()+on, r1=D.rDbu+gR()+on;
  // proportional mix: each preamp feeds the summing stage; equal weights give a mono sum at −6 dB each (inferred weights)
  const wl=dB(D.mix*2), wr=dB((1-D.mix)*2), lw=l1+wl-6.02, rw=r1+wr-6.02;
  const sum = D.rF===1000 ? sumDb(lw,rw,D.rPh) : V2dBu(Math.hypot(dBu2V(lw),dBu2V(rw)));
  const L=D.load, atL=Math.min(sum,MAXOUT)+dB(L/(L+2*V().rs));
  const stages=[{name:'LEFT IN',db:D.lDbu+on,g:null},{name:'Left preamp (sensitivity)',db:l1,g:gL(),max:OP_CLIP,note:'NE5534, single-turn −6…+30 dB'},{name:'RIGHT IN',db:D.rDbu+on,g:null},{name:'Right preamp (sensitivity)',db:r1,g:gR(),max:OP_CLIP},{name:'Matrix sum',db:sum,g:null,max:MAXOUT,note:`L ${Math.round(D.mix*100)} % : R ${Math.round((1-D.mix)*100)} %`},{name:'Outputs 1–6 at '+L+' Ω',db:atL,g:dB(L/(L+2*V().rs)),note:'2 × '+V().rs+' Ω (R45–R50, R60–R65)'}];
  return {l1,r1,sum,atL,stages,clip:l1>OP_CLIP||r1>OP_CLIP||sum>MAXOUT}; }
const NM={sensL:'Left SENSITIVITY',sensR:'Right SENSITIVITY',mix:'Mix proportion'};
const A={
  set(k,v,log){ D[k]=v; D.ev.push({t:SIM.t,name:NM[k].split(' ')[0]}); if(log) act(NM[k]+' turned', tr=>{ const c=chain(); if(k==='mix') tr(`Proportion L ${Math.round(D.mix*100)} % / R ${Math.round((1-D.mix)*100)} % into the summing amplifier ${inf}`); else tr(`${NM[k]}: ${(k==='sensL'?gL():gR()).toFixed(1)} dB (single-turn, −6 to +30 dB per m8206.pdf) → ${fmtDb(k==='sensL'?c.l1:c.r1)}`); tr(`All six outputs: ${fmtDb(c.atL)} across ${D.load} Ω`); }); },
  ver(v){ act('Version '+v, tr=>{ D.ver=v; tr(`${v}: ${VER[v].z}. DSN note: “*R45-R50 AND R60-R65 ARE 30R FOR M8206B”`); }); },
  part(r){ act('Part '+r, tr=>{ D.sel=r; tr(PARTS[r]||'From the M8206.DSN part list'); }); },
  rrow(i){ const lab=REAR6.rows[i][0]; act('Terminal '+lab, tr=>{ D.rsel=i; tr(rearSig(lab)||lab); }); },
  insert(){ act(D.inserted?'Pull the card out':'Slide the card in', tr=>{ D.inserted=!D.inserted; tr(D.inserted?'±22 V DC, 45 mA idling (spec); pins 1 and A at the top in an MF82/10 or /12':'Silent'); }); },
  reset(){ act('Start over', tr=>{ reset(); tr('Both sensitivities at 0 dB, equal mix, in phase'); }); },
};
const PARTS={U1:'U1 NE5534: left preamp (inferred)',U2:'U2 NE5534: right preamp (inferred)',U3:'U3 NE5534: + output leg (inferred)',U4:'U4A/U4B: summing / − leg (inferred)',R14A:'R14A/R14B: dual pot (a sensitivity control, inferred)',R32A:'R32A/R32B: dual pot (the other sensitivity, inferred)',R45:'R45–R50: build-outs, + legs of outputs 1–6 (30R on the M8206B)',R60:'R60–R65: build-outs, − legs (30R on the M8206B)',LM317:'LM317 regulator (library and parts list)'};
function rearSig(lab){ const c=chain(); if(/LEFT IN/.test(lab)) return `${lab}: ${fmtDb(D.lDbu)}`; if(/RIGHT IN/.test(lab)) return `${lab}: ${fmtDb(D.rDbu)}`; if(/OUT \d/.test(lab)) return `${lab}: ${fmtDb(c.atL)} (all six identical)`; return null; }

/* ---------------- drawing: no PCB file — outline to the manual's 10.60 × 2.75 in ---------------- */
function cardSVG(){ const S=95, W=10.6*S, H=2.75*S, c=chain(); const knob=(k,x,y,lab)=>{ const v=D[k], a=(-135+270*v)*Math.PI/180; return `<g class="kn" data-k="${k}" style="cursor:pointer"><title>${lab} — click right/left half, scroll to fine-tune</title><circle cx="${x}" cy="${y}" r="17" fill="#d9d4c7" stroke="#ffd34d" stroke-width="2"/><line x1="${x}" y1="${y}" x2="${(x+14*Math.sin(a)).toFixed(1)}" y2="${(y-14*Math.cos(a)).toFixed(1)}" stroke="#111" stroke-width="3"/><text x="${x+24}" y="${y+4}" font-size="11" fill="#fff">${lab}</text></g>`; };
  const ic=(x,y,r,t)=>`<g class="pp" data-r="${r}" style="cursor:pointer"><rect x="${x}" y="${y}" width="70" height="30" rx="3" fill="#222"/><text x="${x+35}" y="${y+19}" font-size="10" text-anchor="middle" fill="#fff">${r} ${t}</text></g>`;
  let s=`<svg viewBox="0 0 ${W+10} ${H+30}" style="width:100%" role="img" aria-label="M8206 card outline"><rect x="5" y="5" width="${W}" height="${H}" rx="4" fill="#1f6b3a" stroke="#0d3a1f"/><text x="${W/2}" y="${H-14}" text-anchor="middle" font-size="18" fill="rgba(255,255,255,.22)">no PCB file in the archive — outline only</text>`;
  for(let i=0;i<15;i++) s+=`<rect x="${W-20}" y="${18+i*15.5}" width="22" height="9" fill="#d4af37"/>`;
  s+=knob('sensL',45,60,'L SENS')+knob('sensR',45,190,'R SENS')+knob('mix',45,125,'MIX');
  s+=ic(200,45,'U1','NE5534')+ic(200,180,'U2','NE5534')+ic(420,110,'U4','(sum)')+ic(620,45,'U3','+ leg')+ic(620,180,'U4B','− leg');
  s+=`<g class="pp" data-r="R45" style="cursor:pointer"><rect x="800" y="40" width="90" height="70" fill="none" stroke="#c8a24a" stroke-dasharray="4 3"/><text x="845" y="80" text-anchor="middle" font-size="10" fill="#fff">R45–R50</text></g><g class="pp" data-r="R60" style="cursor:pointer"><rect x="800" y="150" width="90" height="70" fill="none" stroke="#c8a24a" stroke-dasharray="4 3"/><text x="845" y="190" text-anchor="middle" font-size="10" fill="#fff">R60–R65</text></g>`;
  s+=`<text x="10" y="${H+24}" font-size="11" fill="var(--ink2)">Outline 10.60 × 2.75 in (manual). Parts from M8206.DSN; their positions and the knob placement are ${'inferred'} — no layout survives.</text></svg>`;
  return s; }
function panelHTML(){ const c=chain(); return card(`The card — ${D.ver}, six outputs ${fmtDb(c.atL)}`, cardSVG()+controlsHTML())+`<div class="grid2">${card('Front edge', handleSVG(D.ver==='M8206'?'M8206':'M8206B', `<g class="hnd" style="cursor:pointer"><title>Click: slide the card ${D.inserted?'out':'in'}</title><rect x="10" y="80" width="60" height="100" fill="transparent"/></g><text x="80" y="140" font-size="11" fill="${D.inserted?'var(--accent)':'var(--warn)'}">${D.inserted?'in the frame':'pulled out'}</text>`))}${card('Rear module TB8205', rearSVG(Object.assign(REAR6,{sig:rearSig}),{sel:D.rsel})+`<div class="small muted">CorelDRAW art (vector): the TB8205 panel of ${SIM.src('#MF8200 #SERIES/M8206 - #Engineering #MF82/M8206TRM.CDR','M8206TRM.CDR')} (1998|31). Its CorelDRAW 5 text does not convert, so the names (from the file's text objects) are re-set in its own label boxes; their order is <span class="tag-inf">inferred</span>. Click a terminal label.</div>`)}</div>`; }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
  <label>Version <select data-c="ver">${Object.keys(VER).map(k=>`<option ${k===D.ver?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>LEFT in <input type="range" data-c="l" min="-20" max="24" value="${D.lDbu}"> <span class="mono">${fmtDb(D.lDbu)}</span></label>
  <label>RIGHT in <input type="range" data-c="r" min="-20" max="24" value="${D.rDbu}"> <span class="mono">${fmtDb(D.rDbu)}</span></label>
  <label>RIGHT signal <select data-c="rs">${[['0','1 kHz, in phase'],['180','1 kHz, reversed'],['400','400 Hz (different programme)']].map(([v,l])=>`<option value="${v}" ${(v==='400'?D.rF===400:D.rF===1000&&Math.round(D.rPh*180/Math.PI)===+v)?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Load <select data-c="load">${[600,10000].map(v=>`<option value="${v}" ${v===D.load?'selected':''}>${v>=1000?v/1000+' k':v} Ω</option>`).join('')}</select></label>
  <button data-c="reset">Start over</button></div>`; }
function bind(root){ root.querySelectorAll('.kn').forEach(g=>{ const k=g.dataset.k; g.onclick=e=>{ const r=g.getBoundingClientRect(); A.set(k,clamp(Math.round((D[k]+((e.clientX-r.left)>r.width/2?0.05:-0.05))*100)/100,0,1),true); }; g.addEventListener('wheel',e=>{ e.preventDefault(); D[k]=clamp(Math.round((D[k]+(e.deltaY<0?0.01:-0.01))*100)/100,0,1); SIM.refresh(); },{passive:false}); });
  root.querySelectorAll('.pp').forEach(g=>g.onclick=()=>A.part(g.dataset.r)); root.querySelectorAll('.rrow').forEach(g=>g.onclick=()=>A.rrow(+g.dataset.i)); root.querySelectorAll('.hnd').forEach(g=>g.onclick=()=>A.insert());
  root.querySelectorAll('[data-c]').forEach(e=>{ const c=e.dataset.c; if(c==='reset') e.onclick=()=>A.reset(); else if(c==='l'||c==='r') e.oninput=()=>{ D[c==='l'?'lDbu':'rDbu']=+e.value; SIM.refresh(); };
    else e.onchange=()=>{ const v=e.value; if(c==='ver') A.ver(v); else if(c==='rs'){ if(v==='400'){ D.rF=400; D.rPh=0; } else { D.rF=1000; D.rPh=+v*Math.PI/180; } SIM.refresh(); } else if(c==='load'){ D.load=+v; SIM.refresh(); } }; }); }
function stateHTML(){ const c=chain(); return `<table class="kv"><tr><th>Left / right gain</th><td class="mono">${gL().toFixed(1)} / ${gR().toFixed(1)} dB</td></tr><tr><th>Mix</th><td class="mono">L ${Math.round(D.mix*100)} % : R ${Math.round((1-D.mix)*100)} % ${inf}</td></tr><tr><th>Sum</th><td class="mono">${fmtDb(c.sum)}${c.clip?' CLIP':''}</td></tr><tr><th>Outputs 1–6</th><td class="mono">${fmtDb(c.atL)} across ${D.load} Ω (${V().z})</td></tr><tr><th>Noise</th><td class="mono">better than −92 dBu (spec)</td></tr></table>`; }
function lanes(){ const c=chain(), lw=c.l1+dB(D.mix*2)-6.02, rw=c.r1+dB((1-D.mix)*2)-6.02; const lim=v=>{ const p=Math.SQRT2*dBu2V(MAXOUT); return clamp(v,-p,p); };
  return [ waveLane('LEFT IN', 38, t=>sineV(t,D.lDbu,1000), {f:1000, col:SIM.css('--ink2')}),
    waveLane('RIGHT IN', 38, t=>sineV(t,D.rDbu,D.rF,null,D.rPh), {f:D.rF, col:SIM.css('--ink2')}),
    waveLane('Left preamp', 38, t=>sineV(t,c.l1,1000,OP_CLIP), {f:1000, clip:OP_CLIP}),
    waveLane('Right preamp', 38, t=>sineV(t,c.r1,D.rF,OP_CLIP,D.rPh), {f:D.rF, clip:OP_CLIP}),
    waveLane('Outputs 1–6 (matrix sum)', 50, t=>lim(sineV(t,lw,1000)+sineV(t,rw,D.rF,null,D.rPh)), {f:1000, clip:MAXOUT, col:SIM.css('--accent2'), level:Math.max(lw,rw)+6}),
    eventLane('Your adjustments', ()=>D.ev) ]; }
function secondHTML(){ const c=chain(); return `<table class="kv"><tr><th>Left</th><td class="mono">1000 cycles</td></tr><tr><th>Right</th><td class="mono">${D.rF} cycles${D.rF===1000?', '+Math.round(D.rPh*180/Math.PI)+'°':''}</td></tr><tr><th>Sum</th><td class="mono">${fmtDb(c.sum)}</td></tr><tr><th>In phase vs reversed</th><td class="mono">${fmtDb(sumDb(c.l1-6.02,c.r1-6.02,0))} vs ${fmtDb(sumDb(c.l1-6.02,c.r1-6.02,Math.PI))}</td></tr><tr><th>Each output</th><td class="mono">${(dBu2V(Math.min(c.sum,MAXOUT))/(D.load+2*V().rs)*1000).toFixed(2)} mA rms</td></tr><tr><th>Supply</th><td class="mono">±22 V, 45 mA idling (spec)</td></tr></table><p class="small">A mono sum of a stereo pair: in phase the two halves add, reversed they cancel, and two different programmes add as powers (+3 dB).</p>`; }
const lessons=[
  {title:'The card', auto:true, check:()=>true, body:'<p>The M8206 makes six balanced outputs from a proportional mix of two inputs — for example a mono sum of a stereo signal. Each input has its own low-noise preamplifier with a single-turn sensitivity control, −6 to +30 dB (m8206.pdf).</p>'},
  {title:'1 · A mono sum', check:()=>Math.abs(gL())<0.6&&Math.abs(gR())<0.6&&D.rF===1000&&D.rPh===0, hint:'Start over sets both preamps to 0 dB with an in-phase right signal.', body:'<p>Both preamps at unity, the same tone on both inputs, in phase: the outputs carry the mono sum.</p><p><b>Goal:</b> both sensitivities at 0 dB, right in phase.</p>'},
  {title:'2 · Spot a polarity error', check:()=>D.rPh>3, hint:'RIGHT signal → “1 kHz, reversed”.', body:'<p>Reverse the right input. The sum collapses — the reason a matrix DA needs correctly wired stereo feeds.</p><p><b>Goal:</b> reversed right input.</p>'},
  {title:'3 · Weight the mix', check:()=>D.mix>0.7, hint:'Click the right half of the MIX knob.', body:'<p>Shift the proportion towards the left.</p><p><b>Goal:</b> more than 70 % left.</p>'},
  {title:'4 · Gain for a weak source', check:()=>gL()>=20, hint:'Turn L SENS up (right half of the knob).', body:'<p>The preamps reach +30 dB: enough to bring a −20 dBu feed to line level.</p><p><b>Goal:</b> left sensitivity ≥ +20 dB.</p>'},
  {title:'Done', auto:true, check:()=>true, body:'<p>See <b>Findings</b>.</p>'} ];
const blocks={ w:800, h:260, note:'From the manual and the M8206.DSN part list; stage roles inferred.', nodes:{
  li:{x:10,y:30,w:110,h:52,t:'LEFT IN ±',s:['SH'],lv:()=>fmtDb(D.lDbu),info:'TB8205 LEFT IN +, −, LEFT SH.'},
  ri:{x:10,y:170,w:110,h:52,t:'RIGHT IN ±',s:['SH'],lv:()=>fmtDb(D.rDbu),info:'TB8205 RIGHT IN +, −, RIGHT SH.'},
  lp:{x:150,y:30,w:150,h:52,t:'Left preamp',s:['−6 … +30 dB'],lv:()=>fmtDb(chain().l1),info:'Low-noise preamplifier with single-turn sensitivity.'},
  rp:{x:150,y:170,w:150,h:52,t:'Right preamp',s:['−6 … +30 dB'],lv:()=>fmtDb(chain().r1),info:'Second preamplifier.'},
  mx:{x:340,y:100,w:130,h:52,t:'Matrix sum',s:['proportional mix'],lv:()=>fmtDb(chain().sum),info:'The two preamp outputs are summed in proportion.'},
  ob:{x:500,y:100,w:130,h:52,t:'Output stage',s:['+ / − legs'],info:'NE5534 output legs (U3, U4).'},
  out:{x:660,y:100,w:130,h:52,t:'OUT 1–6 ±',s:['R45–R50 / R60–R65'],lv:()=>fmtDb(chain().atL),info:()=>`${V().z}.`} },
  edges:[['li','lp'],['ri','rp'],['lp','mx'],['rp','mx'],['mx','ob'],['ob','out']] };
const DSNPARTS='C18 C19 C20 C21 C22 C23 C24 C25 C26 C27 C28 C29 C30 C31 C32 C33 C34 C35 C36 C37 C38 C39 C40 C41 C42 C43 CR1 CR2 CR3 CR4 CR5 CR6 CR7 CR8 CR9 CR10 R14A R14B R18 R19 R20 R21 R22 R23 R26 R27 R28 R29 R30 R31 R32A R32B R35 R36 R37 R38 R39 R40 R41 R42 R43 R44 R45 R46 R47 R48 R49 R50 R51 R52 R53 R54 R55 R56 R57 R58 R59 R60 R61 R62 R63 R64 R65 R66 R67 R68 R69 R70 R71 R72 R73 U1 U2 U3 U4A U4B'.split(' ');
function dsnSheet(hl){ const H=(hl&&hl[0]||'').toUpperCase(); return `<svg viewBox="0 0 900 420" style="width:100%;min-width:760px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><text x="20" y="28" font-size="14" font-weight="700" fill="var(--ink)">M8206/B MATRIXING AUDIO DISTRIBUTION AMPLIFIER — AUG 26,1998 (internal name M8204B.DSN)</text>
  <text x="20" y="50" font-size="11" fill="var(--ink2)">Part references found in the OrCAD file (positions and wiring are not recoverable from it):</text>
  ${DSNPARTS.map((p,i)=>`<text x="${20+(i%14)*62}" y="${78+Math.floor(i/14)*22}" font-size="11" fill="${H&&p.includes(H)?'var(--warn)':'var(--accent2)'}" font-weight="${H&&p.includes(H)?700:400}">${p}</text>`).join('')}
  <text x="20" y="270" font-size="11" fill="var(--ink)">Net labels: LEFT INPUT · RIGHT INPUT · SH · +22 V · −22 V · GND SIGNAL · VCC</text>
  <text x="20" y="292" font-size="11" fill="var(--ink)">Values: 1/35 · 240R · NE5534 ×4 · LF353 · LM317 · CAP POL · BRIDGE · TRANSFORMER</text>
  <text x="20" y="314" font-size="11" fill="var(--warn)">Note: *R45-R50 AND R60-R65 ARE 30R FOR M8206B</text>
  <text x="20" y="350" font-size="11" fill="var(--ink2)">Library cache leftovers: PIC16C73 (RA0–RC7, OSC1/2, /MCLR) · 75176 (RS-485) · 4053 / 14053 analog switch ·</text>
  <text x="20" y="368" font-size="11" fill="var(--ink2)">a 32-bit numeric part with X0–X31, Y0–Y31, T0–T31, ZR OV UF INX NAN DIVZ flags · RS81S.OLB · MX6.OLB · HEADER 15X2</text></svg>`; }
const sheets=[{name:'M8206.DSN — what the file holds', svg:dsnSheet, note:'The OrCAD binary gives part references, net labels, values and notes, but not the drawing. This sheet lists them as found.'}];
function softHTML(){ const c=chain(); return `<div class="grid2">${card('Signal path, stage by stage', stageTable(c.stages))}${card('Level diagram', levelSVG(c.stages))}</div>${card('Matrix maths', `<p class="small">out = w<sub>L</sub>·L·g<sub>L</sub> + w<sub>R</sub>·R·g<sub>R</sub>, with w<sub>L</sub> + w<sub>R</sub> = 1 ${inf}. In-phase identical signals: out = signal. Reversed: out → 0 (at equal weights). Unrelated programmes add as powers.</p>`)}`; }
const findings=[
  `<b>Artwork ${SIM.year(2026)}: rear module now from the CorelDRAW drawing.</b> The TB8205 panel is vector art from ${SIM.src('#MF8200 #SERIES/M8206 - #Engineering #MF82/M8206TRM.CDR','M8206TRM.CDR')} (1998-08-31): outline, the three LEFT IN boxes and a 9-row × 2 label table. The table's “−” column has only 8 boxes — the gap sits on the RIGHT SH row, which has no partner — and that, with the bottom-up order of the text objects, fixes the label placement ${inf}. Oddity: LEFT IN gets its own three boxes at the top while RIGHT IN shares the output table. The folder's ${SIM.src('#MF8200 #SERIES/M8206 - #Engineering #MF82/TB8205P.CDR','TB8205P.CDR')} (1999, titled “M8206/B”) is the pluggable TB8205P version (LEFT IN/RIGHT IN blocks of three, OUT 1–6 ±, two NC); its text converts as garbage, so it is not used.`,
  `<b>The OrCAD file calls itself the M8204B.</b> <span class="mono">M8206.DSN</span>'s title block is “M8206/B MATRIXING AUDIO DISTRIBUTION AMPLIFIER”, AUG 26,1998, but its file-name field reads “M8204B.DSN” — the design was started from a copy of an M8204 sheet.`,
  `<b>Its library cache drags in a digital product.</b> The same DSN carries symbols for a PIC16C73, a 75176 RS-485 transceiver, 4053/14053 analog switches, a transformer and bridge, and a 32-bit arithmetic part (X0–X31, Y0–Y31, T0–T31, ZR/OV/UF/NAN/DIVZ flags) from libraries RS81S.OLB and MX6.OLB — none of which belong on an analog matrix DA.`,
  `<b>The “M8206/B MANUAL” CorelDRAW file is a frame brochure.</b> <span class="mono">M8206MAN.CDR</span> holds “8200 SERIES DISTRIBUTION SYSTEM … REDUNDANT POWER SUPPLIES … 4, 10, OR 12 CARD FRAMES” and a caution about power-supply modules (PS1, PS2, V-ADJ) — no M8206 text.`,
  `<b>No board survives.</b> There is no PCB, Gerber or netlist for the M8206 anywhere in the archive, so this plugin draws the card as an outline and says so.`,
  `<b>Six outputs, twelve build-outs.</b> The DSN note “*R45-R50 AND R60-R65 ARE 30R FOR M8206B” gives one resistor per leg for six balanced outputs; the M8206 (600 Ω) value is not stated (300R ${inf}).`,
  `<b>Manual dates.</b> M8206MAN.WPD (1999-10-22) and m8206.pdf (2002-07-30) carry the same text; the “Specifications” heading appears twice (once over the general description).`,
];
const assume=[`Mix weights and the MIX control ${inf}: the manual says “proportionally mixed” without naming a control.`,`Stage roles of U1–U4 and the dual pots R14A/B, R32A/B ${inf}.`,`Card drawing: outline from the manual's dimensions; part positions ${inf}.`,`300 Ω build-outs on the M8206 ${inf}.`];
P={ id:'m8206', product:'M8206', year:1998, family:'8200 Distribution Series', folder:'#MF8200 #SERIES/M8206 - #Engineering #MF82',
  name:'M8206 · Matrixing analog audio DA, 2 → 6 (1998|31)',
  summary:'A matrixing distribution amplifier: two low-noise preamplifiers (−6 to +30 dB) summed in proportion to six balanced outputs, for example a mono sum of a stereo pair. No board survives, so the card is drawn as an outline; the model shows sums, polarity errors and the 600/60 Ω versions.',
  highlights:['Mono sum of a stereo pair, with a polarity check','Two preamps −6 to +30 dB, six outputs','Terminal names from M8206TRM.CDR','The DSN thinks it is an M8204B','A brochure page filed as the manual'],
  hint:'Click L SENS, R SENS or MIX on the card, a part, or a rear terminal.',
  reset, chain, lanes, panelHTML, bind, stateHTML, secondHTML, lessons, blocks, sheets, softHTML, findings, footnotes:[{text:"The TB8205 rear module is the panel from M8206TRM.CDR (1998); its CorelDRAW 5 text does not convert, so the names are re-set in the drawing's own label boxes in an inferred order.",src:"#MF8200 #SERIES/M8206 - #Engineering #MF82/M8206TRM.CDR"},{text:"The TB8205 label table's “−” column has 8 boxes and the “+” column 9: RIGHT SH has no partner.",src:"#MF8200 #SERIES/M8206 - #Engineering #MF82/M8206TRM.CDR"},{text:"LEFT IN has its own three boxes at the top of the TB8205 panel while RIGHT IN shares the output table.",src:"#MF8200 #SERIES/M8206 - #Engineering #MF82/M8206TRM.CDR"},{text:"TB8205P.CDR (1999, titled “M8206/B”) is a pluggable version with two NC terminals; its text converts as garbage.",src:"#MF8200 #SERIES/M8206 - #Engineering #MF82/TB8205P.CDR"},{text:"M8206MAN.CDR, filed as the card's manual, is a frame/power-supply brochure page.",src:"#MF8200 #SERIES/M8206 - #Engineering #MF82/M8206MAN.CDR"}], assume,
  tutPanel:()=>card('The card', cardSVG()+controlsHTML())+card('State', stateHTML()),
  sources:['M8206 - #Engineering #MF82/m8206.pdf, M8206MAN.WPD','M8206 - #Engineering #MF82/M8206.DSN, M8206.DBK','M8206 - #Engineering #MF82/M8206TRM.CDR (+ sidecar), TB8205P.CDR','M8206 - #Engineering #MF82/M8206MAN.CDR (+ sidecar)','8205-004 ISS 2 (HANDLE) .pdf'] };
reset();
register();

})();
