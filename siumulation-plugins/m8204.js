/* =====================================================================
   M8204 / M8204A — Dual channel analog audio distribution amplifier, 2 × (1 × 4) (Ward-Beck, 1995–2013|28–46)
   Plugin for the WBS Device Simulator (../siumulation.html). Hardware model (no firmware on this card).

   Sources used (#MF8200 #SERIES/M8204 - #Master #MF82/…):
   - M8204 - #Engineering/Manual/M8204MAN.WPD (2010|43): general text, mode jumpers, terminations, specs
   - M8204 - #Engineering/PCB/GERBERS/14-265ISS8.TOP/.BOT/.TSM/.TSS (P-CAD 2002, 22 Mar 2007): rendered at
       100 dpi → assets/m8204-board.png (the silk "MODE JUMPERS  STEREO J1 J4 / MONO J1 J3 / MIX J2 J3" is read from it)
   - M8204 - #Engineering/PCB/14-265ISS8.pnp, 14-265ISS8.bom (part positions, values, what is fitted)
   - M8204 - #Engineering/PCB/OBSOLETE/14-265iss7.net (Tango netlist: 147 parts, 79 nets) — the schematics,
       the mode-jumper maths and the P1 pin table here are worked out from it
   - M8204 - #Engineering/Manual/M8204-5.DSN - PAGE1.pdf (FEB 16,1999, "14-265 ISS 5", 30R / 300R note)
   - M8204 - #Engineering/PCB/GERBERS/Transcode Report.txt, M8204.STN, M8205B.STN
   - 8200 Series Rear Module options graphical Guides…/M8204 - … .pdf, M8204A - … .pdf (TB8204P, TB8204P/600)
       → assets m8204-rear-tb8204p.svg, m8204-rear-tb8204p600.svg (vector, Artwork 2026|59)
   - ../M8204-ASSY - #Assembly.pdf (2007|40), D8210 & D8212 - #Mechanical #DA #2016/8205-004 ISS 2 (HANDLE) .pdf
   Anything not in those files is marked "inferred" on screen.
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

const NET = {"c":{"R31":"10K","R30":"4R7","R33":"6K8","R32":"5K6","R35":"10K","R34":"3K6","R37":"5K6","R36":"4R7","R39":"10K","R38":"6K8","R71":"10K","R70":"137","R73":"10K","R72":"137","C3":"22p","C2":"68/10","C1":"68/10","C7":"22p","C6":"68/10","C5":"22p","C4":"22p","C9":"22p","C8":"68/10","D15":"1N4003","D14":"1N4148","D16":"1N4003","D11":"1N4148","D10":"1N4148","D13":"1N4148","D12":"1N4148","C12":"0.1","C13":"22p","C10":"22p","C11":"22p","C16":"22p","C17":"0.1","C14":"0.1","C15":"0.1","C18":"22p","C19":"47/63","R46":"4R7","R47":"4R7","R44":"4R7","R45":"4R7","R42":"4R7","R43":"4R7","R40":"3K6","R41":"10K","R48":"4R7","R49":"20K","D4":"1N4148","D5":"1N4148","D6":"1N4148","D7":"1N4148","D1":"1N4003","D2":"1N4003","D3":"1N4148","D8":"1N4148","D9":"1N4148","H1":"","H2":"","LK3":"0R","LK2":"0R","LK1":"0R","P1":"EDAC30\\156","C20":"47/63","R13":"1K24","R12":"10K","R11":"10K","R10":"43K2","R17":"4R7","R16":"4R7","R15":"10K","R14":"10K","R19":"4R7","R18":"4R7","R57":"30R","R56":"30R","R55":"30R","R54":"30R","R53":"20K","R52":"20K","R51":"10K","R50":"10K","R59":"30R","R58":"30R","Q10":"2N4401","Q11":"MJD29","Q12":"MJD30","Q1":"MJD29","Q3":"2N4401","Q2":"MJD30","Q5":"MJD30","Q4":"MJD29","Q7":"2N4401","Q6":"2N4401","Q9":"MJD30","Q8":"MJD29","U4":"NE5532","U1":"NE5532","U3":"NE5532","U2":"NE5532","CMRA":"2K","CMRB":"2K","R20":"3K6","R21":"6K8","R22":"5K6","R23":"5K6","R24":"4R7","R25":"3K6","R26":"6K8","R27":"10K","R28":"4R7","R29":"4R7","R64":"30R","R65":"30R","R66":"30R","C102":"0.1","R67":"30R","C103":"0.1","R60":"30R","C100":"0.1","R61":"30R","C101":"0.1","R62":"30R","C106":"0.1","R63":"30R","C107":"0.1","C104":"0.1","C105":"0.1","R68":"30R","R69":"30R","F2":"RXE050SM","F1":"RXE050SM","RV1":"2K","RV2":"2K","R2":"10K","R3":"10K","R1":"10K","R6":"43K2","R7":"1K24","R4":"137","R5":"10K","R8":"10K","R9":"137","LVLB":"5K","LVLA":"5K"},"n":{"V-":["P1-26","P1-25","F1-1"],"NET00000":["U1-7","C5-1","R49-2","R53-2","LVLA-ccw","R6-1"],"NET00002":["U3-2","R15-2","R49-1","C11-2","H2-2"],"NET00005":["R1-1","D4-K","D3-A","C1-1"],"NET00001":["U1-2","R3-2","C3-2","C1-2"],"NET00016":["D8-A","R8-1","C6-1","D7-K"],"NET00011":["R7-2","U1-6","C5-2","R5-1","C4-1","R6-2","C2-2"],"NET00010":["Q1-3","R16-2","R17-2"],"NET00008":["R2-1","D6-A","C2-1","D5-K"],"GNDD":["U3-3","U2-5","U4-5","P1-28","P1-27","P1-3","U1-5","U3-5","U4-3","C106-2","R73-1","D8-K","U1-3","C105-2","C19-1","C20-2","R71-1","D6-K","U2-3","LVLB-CW","LVLA-CW","C103-2","C102-2","D7-A","D4-A","D3-K","C104-2","C107-2","C101-2","C100-2","D5-A","D10-A","D9-K","LK3-2"],"NET00014":["R7-1","LVLA-w"],"A":["P1-1","R1-2"],"NET00012":["R5-2","CMRA-CW","RV1-3","R4-1"],"NET00027":["R71-2","CMRA-W","RV1-2"],"NET00015":["U1-1","C4-2","R4-2","C3-1","R70-1"],"NET00030":["R12-1","RV2-1","CMRB-CCW","R72-2"],"NET00023":["R3-1","CMRA-CCW","RV1-1","R70-2"],"AOUT+":["LK2-1","R16-1","R17-1","R15-1","R19-1","R31-2","R18-1","R69-2","C11-1","R62-2","R64-2","R68-2","R63-2"],"NET00022":["U3-6","R27-2","R31-1","C13-2"],"NET00009":["Q2-3","R19-2","R18-2"],"AOUT-":["R27-1","R24-1","R28-1","R29-1","LK1-1","C13-1","R30-1","R50-1","R56-2","R55-2","R61-2","R60-2","R54-2"],"NET00018":["Q3-2","Q2-1","R21-1","C12-2","D11-A","R22-2"],"BOUT+":["C18-1","LK2-2","R41-1","R44-1","R42-1","R43-1","R39-2","R36-1","R67-2","R65-2","R66-2"],"BOUT-":["R45-1","R35-1","C16-1","R48-1","R47-1","LK1-2","R46-1","R59-2","R58-2","R57-2"],"NET00021":["R11-1","C8-1","D10-K","D9-A"],"NET00003":["R50-2","H1-1"],"+VA":["D15-2","U3-8","U4-8","Q4-2","Q8-2","U1-8","Q1-2","Q11-2","C20-1","U2-8","C103-1","C104-1","C107-1","C101-1"],"NET00019":["Q3-1","R21-2","R20-1"],"NET00020":["U3-1","Q3-3","Q1-1","C12-1","D11-K","R20-2"],"NET00025":["U2-1","C10-2","C7-1","R9-2","R72-1"],"NET00026":["R12-2","U2-2","C7-2","C8-2"],"NET00004":["H1-3","R51-2"],"NET00028":["R13-1","LVLB-w"],"NET00024":["Q6-1","R26-2","R25-1"],"NET00031":["U2-6","R13-2","C9-2","C10-1","R14-1","C6-2","R10-2"],"NET00050":["Q9-1","R33-1","Q7-2","R32-2","C17-2","D14-A"],"NET00033":["R14-2","RV2-3","CMRB-CW","R9-1"],"NET00034":["U2-7","R52-1","C9-1","LVLB-ccw","R51-1","R10-1"],"NET00051":["R33-2","Q7-1","R40-1"],"NET00032":["R73-2","RV2-2","CMRB-W"],"NET00006":["R52-2","H2-3"],"NET00035":["Q4-3","R24-2","R28-2"],"NET00007":["R53-1","H2-1"],"NET00013":["D1-2","D15-1"],"NET00017":["D16-2","D2-1"],"-VA":["D16-1","U3-4","U4-4","Q5-2","Q9-2","C106-1","U1-4","Q2-2","C105-1","Q12-2","C19-2","U2-4","R32-1","C102-1","R22-1","R23-1","R37-1","C100-1"],"NET00039":["Q5-3","R29-2","R30-2"],"1":["P1-2","R2-2"],"NET00058":["U4-6","R35-2","C16-2","R39-1"],"NET00059":["Q10-1","R38-2","R34-1"],"NET00060":["U4-7","Q11-1","Q10-3","C15-1","D13-K","R34-2"],"NET00045":["U3-7","Q6-3","Q4-1","C14-1","D12-K","R25-2"],"D":["P1-7","R54-1"],"NET00048":["Q6-2","Q5-1","R26-1","C14-2","D12-A","R23-2"],"NET00062":["Q10-2","Q12-1","R38-1","C15-2","D13-A","R37-2"],"E":["P1-9","R55-1"],"V+":["P1-30","P1-29","F2-1"],"F":["P1-11","R56-1"],"H":["P1-13","R57-1"],"NET00111":["D1-1","F2-2"],"J":["P1-15","R58-1"],"NET00067":["U4-1","Q8-1","Q7-3","C17-1","D14-K","R40-2"],"K":["P1-17","R59-1"],"NET00069":["U4-2","C18-2","R41-2","H1-2"],"L":["P1-19","R60-1","LK3-1"],"NET00071":["Q9-3","R44-2","R36-2"],"M":["P1-21","R11-2","R61-1"],"NET00073":["Q8-3","R42-2","R43-2"],"4":["P1-8","R62-1"],"NET00075":["R45-2","Q11-3","R46-2"],"NET00076":["R48-2","R47-2","Q12-3"],"5":["P1-10","R63-1"],"6":["P1-12","R64-1"],"7":["P1-14","R65-1"],"8":["P1-16","R66-1"],"9":["P1-18","R67-1"],"10":["P1-20","R68-1"],"NET00106":["D2-2","F1-2"],"11":["P1-22","R8-2","R69-1"]}};
const PNP = [{"ref": "C1", "val": "68/10", "pat": "DCASE", "lay": "Top", "px": 224.5, "py": 56.0, "rot": 90.0}, {"ref": "C2", "val": "68/10", "pat": "DCASE", "lay": "Top", "px": 296.5, "py": 56.5, "rot": 90.0}, {"ref": "C3", "val": "27p", "pat": "1206", "lay": "Top", "px": 234.8, "py": 30.7, "rot": 270.0}, {"ref": "C4", "val": "27p", "pat": "1206", "lay": "Top", "px": 129.8, "py": 40.3, "rot": 90.0}, {"ref": "C5", "val": "27p", "pat": "1206", "lay": "Top", "px": 294.3, "py": 33.2, "rot": 270.0}, {"ref": "C6", "val": "68/10", "pat": "DCASE", "lay": "Top", "px": 224.5, "py": 133.0, "rot": 90.0}, {"ref": "C7", "val": "27p", "pat": "1206", "lay": "Top", "px": 283.3, "py": 157.8, "rot": 90.0}, {"ref": "C8", "val": "68/10", "pat": "DCASE", "lay": "Top", "px": 297.0, "py": 133.0, "rot": 90.0}, {"ref": "C9", "val": "27p", "pat": "1206", "lay": "Top", "px": 234.8, "py": 157.8, "rot": 90.0}, {"ref": "C10", "val": "27p", "pat": "1206", "lay": "Top", "px": 135.5, "py": 135.0, "rot": 0.0}, {"ref": "C11", "val": "27p", "pat": "1206", "lay": "Top", "px": 532.0, "py": 23.5, "rot": 0.0}, {"ref": "C12", "val": "0.1", "pat": "1206", "lay": "Top", "px": 725.8, "py": 47.3, "rot": 90.0}, {"ref": "C13", "val": "27p", "pat": "1206", "lay": "Top", "px": 533.8, "py": 76.3, "rot": 90.0}, {"ref": "C14", "val": "0.1", "pat": "1206", "lay": "Top", "px": 726.3, "py": 106.3, "rot": 90.0}, {"ref": "C15", "val": "0.1", "pat": "1206", "lay": "Top", "px": 726.3, "py": 240.8, "rot": 90.0}, {"ref": "C16", "val": "27p", "pat": "1206", "lay": "Top", "px": 534.3, "py": 231.3, "rot": 90.0}, {"ref": "C17", "val": "0.1", "pat": "1206", "lay": "Top", "px": 726.3, "py": 185.3, "rot": 90.0}, {"ref": "C18", "val": "27p", "pat": "1206", "lay": "Top", "px": 532.5, "py": 175.0, "rot": 0.0}, {"ref": "C19", "val": "47/63", "pat": "CAP4763E-SM", "lay": "Top", "px": 828.8, "py": 205.0, "rot": 0.0}, {"ref": "C20", "val": "47/63", "pat": "CAP4763E-SM", "lay": "Top", "px": 864.3, "py": 229.5, "rot": 0.0}, {"ref": "C100", "val": "0.1", "pat": "1206", "lay": "Top", "px": 260.0, "py": 52.0, "rot": 0.0}, {"ref": "C101", "val": "0.1", "pat": "1206", "lay": "Top", "px": 263.6, "py": 16.5, "rot": 180.0}, {"ref": "C102", "val": "0.1", "pat": "1206", "lay": "Top", "px": 262.1, "py": 137.0, "rot": 180.0}, {"ref": "C103", "val": "0.1", "pat": "1206", "lay": "Top", "px": 255.0, "py": 171.5, "rot": 0.0}, {"ref": "C104", "val": "0.1", "pat": "1206", "lay": "Top", "px": 553.8, "py": 50.8, "rot": 90.0}, {"ref": "C105", "val": "0.1", "pat": "1206", "lay": "Top", "px": 518.8, "py": 46.2, "rot": 270.0}, {"ref": "C106", "val": "0.1", "pat": "1206", "lay": "Top", "px": 518.8, "py": 199.7, "rot": 270.0}, {"ref": "C107", "val": "0.1", "pat": "1206", "lay": "Top", "px": 554.3, "py": 203.3, "rot": 90.0}, {"ref": "CMRA", "val": "2K", "pat": "TRIM-3314SM", "lay": "Top", "px": 168.8, "py": 42.5, "rot": 0.0}, {"ref": "CMRB", "val": "2K", "pat": "TRIM-3314SM", "lay": "Top", "px": 168.8, "py": 150.0, "rot": 0.0}, {"ref": "D1", "val": "1N4003", "pat": "S1D", "lay": "Top", "px": 934.6, "py": 245.5, "rot": 90.0}, {"ref": "D2", "val": "1N4003", "pat": "S1D", "lay": "Top", "px": 933.1, "py": 210.0, "rot": 270.0}, {"ref": "D3", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 243.3, "py": 70.5, "rot": 270.0}, {"ref": "D4", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 243.3, "py": 79.5, "rot": 90.0}, {"ref": "D5", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 303.8, "py": 79.5, "rot": 270.0}, {"ref": "D6", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 303.8, "py": 71.0, "rot": 90.0}, {"ref": "D7", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 243.3, "py": 117.5, "rot": 90.0}, {"ref": "D8", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 243.3, "py": 108.5, "rot": 270.0}, {"ref": "D9", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 304.8, "py": 107.5, "rot": 90.0}, {"ref": "D10", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 304.8, "py": 116.5, "rot": 270.0}, {"ref": "D11", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 735.8, "py": 45.5, "rot": 180.0}, {"ref": "D12", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 736.3, "py": 104.5, "rot": 180.0}, {"ref": "D13", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 736.3, "py": 239.0, "rot": 180.0}, {"ref": "D14", "val": "1N4148", "pat": "SOD323", "lay": "Top", "px": 736.3, "py": 185.5, "rot": 180.0}, {"ref": "D15", "val": "1N4003", "pat": "S1D", "lay": "Top", "px": 903.1, "py": 245.5, "rot": 90.0}, {"ref": "D16", "val": "1N4003", "pat": "S1D", "lay": "Top", "px": 902.1, "py": 210.0, "rot": 270.0}, {"ref": "F1", "val": "RXE050SM", "pat": "RXE050SMT", "lay": "Top", "px": 973.8, "py": 210.0, "rot": 90.0}, {"ref": "F2", "val": "RXE050SM", "pat": "RXE050SMT", "lay": "Top", "px": 974.3, "py": 245.0, "rot": 90.0}, {"ref": "LK1", "val": "0R", "pat": "1206", "lay": "Top", "px": 983.1, "py": 149.5, "rot": 180.0}, {"ref": "LK2", "val": "0R", "pat": "1206", "lay": "Top", "px": 894.8, "py": 108.2, "rot": 270.0}, {"ref": "LK3", "val": "0R", "pat": "1206", "lay": "Top", "px": 988.6, "py": 175.5, "rot": 180.0}, {"ref": "Q1", "val": "TIP29", "pat": "DPAK", "lay": "Top", "px": 597.3, "py": 35.0, "rot": 0.0}, {"ref": "Q2", "val": "TIP30", "pat": "DPAK", "lay": "Top", "px": 694.3, "py": 30.0, "rot": 0.0}, {"ref": "Q3", "val": "2N4401", "pat": "SOT-23", "lay": "Top", "px": 643.0, "py": 47.5, "rot": 90.0}, {"ref": "Q4", "val": "TIP29", "pat": "DPAK", "lay": "Top", "px": 597.8, "py": 91.5, "rot": 0.0}, {"ref": "Q5", "val": "TIP30", "pat": "DPAK", "lay": "Top", "px": 694.3, "py": 90.5, "rot": 0.0}, {"ref": "Q6", "val": "2N4401", "pat": "SOT-23", "lay": "Top", "px": 643.0, "py": 105.5, "rot": 90.0}, {"ref": "Q7", "val": "2N4401", "pat": "SOT-23", "lay": "Top", "px": 643.0, "py": 185.5, "rot": 90.0}, {"ref": "Q8", "val": "TIP29", "pat": "DPAK", "lay": "Top", "px": 597.8, "py": 170.0, "rot": 0.0}, {"ref": "Q9", "val": "TIP30", "pat": "DPAK", "lay": "Top", "px": 694.8, "py": 170.0, "rot": 0.0}, {"ref": "Q10", "val": "2N4401", "pat": "SOT-23", "lay": "Top", "px": 643.5, "py": 241.0, "rot": 90.0}, {"ref": "Q11", "val": "TIP29", "pat": "DPAK", "lay": "Top", "px": 597.8, "py": 222.5, "rot": 0.0}, {"ref": "Q12", "val": "TIP30", "pat": "DPAK", "lay": "Top", "px": 694.8, "py": 222.5, "rot": 0.0}, {"ref": "R1", "val": "10K", "pat": "1206", "lay": "Top", "px": 323.8, "py": 33.8, "rot": 90.0}, {"ref": "R2", "val": "10K", "pat": "1206", "lay": "Top", "px": 310.3, "py": 33.8, "rot": 90.0}, {"ref": "R3", "val": "10K", "pat": "1206", "lay": "Top", "px": 223.3, "py": 30.7, "rot": 270.0}, {"ref": "R4", "val": "150", "pat": "1206", "lay": "Top", "px": 141.3, "py": 40.3, "rot": 90.0}, {"ref": "R5", "val": "10K", "pat": "1206", "lay": "Top", "px": 135.0, "py": 58.5, "rot": 0.0}, {"ref": "R6", "val": "43K2", "pat": "1206", "lay": "Top", "px": 282.8, "py": 33.2, "rot": 270.0}, {"ref": "R7", "val": "1K", "pat": "1206", "lay": "Top", "px": 118.3, "py": 40.2, "rot": 270.0}, {"ref": "R8", "val": "10K", "pat": "1206", "lay": "Top", "px": 333.5, "py": 120.5, "rot": 0.0}, {"ref": "R9", "val": "150", "pat": "1206", "lay": "Top", "px": 141.3, "py": 153.3, "rot": 90.0}, {"ref": "R10", "val": "43K2", "pat": "1206", "lay": "Top", "px": 223.3, "py": 157.8, "rot": 90.0}, {"ref": "R11", "val": "10K", "pat": "1206", "lay": "Top", "px": 333.5, "py": 132.5, "rot": 0.0}, {"ref": "R12", "val": "10K", "pat": "1206", "lay": "Top", "px": 295.3, "py": 157.8, "rot": 90.0}, {"ref": "R13", "val": "1K", "pat": "1206", "lay": "Top", "px": 118.3, "py": 153.3, "rot": 90.0}, {"ref": "R14", "val": "10K", "pat": "1206", "lay": "Top", "px": 129.8, "py": 153.2, "rot": 270.0}, {"ref": "R15", "val": "10K", "pat": "1206", "lay": "Top", "px": 532.0, "py": 12.0, "rot": 0.0}, {"ref": "R16", "val": "4R7", "pat": "2010", "lay": "Top", "px": 644.8, "py": 20.0, "rot": 270.0}, {"ref": "R17", "val": "4R7", "pat": "2010", "lay": "Top", "px": 629.8, "py": 20.0, "rot": 270.0}, {"ref": "R18", "val": "4R7", "pat": "2010", "lay": "Top", "px": 743.3, "py": 20.0, "rot": 270.0}, {"ref": "R19", "val": "4R7", "pat": "2010", "lay": "Top", "px": 728.3, "py": 20.0, "rot": 270.0}, {"ref": "R20", "val": "3K6", "pat": "1206", "lay": "Top", "px": 629.8, "py": 47.8, "rot": 90.0}, {"ref": "R21", "val": "6K8", "pat": "1206", "lay": "Top", "px": 657.8, "py": 47.7, "rot": 270.0}, {"ref": "R22", "val": "5K6", "pat": "1206", "lay": "Top", "px": 691.5, "py": 50.5, "rot": 0.0}, {"ref": "R23", "val": "5K6", "pat": "1206", "lay": "Top", "px": 691.5, "py": 111.0, "rot": 0.0}, {"ref": "R24", "val": "4R7", "pat": "2010", "lay": "Top", "px": 632.3, "py": 76.0, "rot": 270.0}, {"ref": "R25", "val": "3K6", "pat": "1206", "lay": "Top", "px": 629.8, "py": 107.3, "rot": 90.0}, {"ref": "R26", "val": "6K8", "pat": "1206", "lay": "Top", "px": 657.3, "py": 107.2, "rot": 270.0}, {"ref": "R27", "val": "10K", "pat": "1206", "lay": "Top", "px": 522.3, "py": 76.3, "rot": 90.0}, {"ref": "R28", "val": "4R7", "pat": "2010", "lay": "Top", "px": 647.3, "py": 76.0, "rot": 270.0}, {"ref": "R29", "val": "4R7", "pat": "2010", "lay": "Top", "px": 728.8, "py": 76.0, "rot": 270.0}, {"ref": "R30", "val": "4R7", "pat": "2010", "lay": "Top", "px": 743.8, "py": 76.0, "rot": 270.0}, {"ref": "R31", "val": "10K", "pat": "1206", "lay": "Top", "px": 507.3, "py": 46.3, "rot": 90.0}, {"ref": "R32", "val": "5K6", "pat": "1206", "lay": "Top", "px": 691.5, "py": 190.5, "rot": 0.0}, {"ref": "R33", "val": "6K8", "pat": "1206", "lay": "Top", "px": 657.3, "py": 184.7, "rot": 270.0}, {"ref": "R34", "val": "3K6", "pat": "1206", "lay": "Top", "px": 629.8, "py": 240.8, "rot": 90.0}, {"ref": "R35", "val": "10K", "pat": "1206", "lay": "Top", "px": 522.8, "py": 231.3, "rot": 90.0}, {"ref": "R36", "val": "4R7", "pat": "2010", "lay": "Top", "px": 728.8, "py": 156.5, "rot": 270.0}, {"ref": "R37", "val": "5K6", "pat": "1206", "lay": "Top", "px": 690.0, "py": 243.0, "rot": 0.0}, {"ref": "R38", "val": "6K8", "pat": "1206", "lay": "Top", "px": 657.3, "py": 240.7, "rot": 270.0}, {"ref": "R39", "val": "10K", "pat": "1206", "lay": "Top", "px": 507.3, "py": 199.8, "rot": 90.0}, {"ref": "R40", "val": "3K6", "pat": "1206", "lay": "Top", "px": 629.8, "py": 184.8, "rot": 90.0}, {"ref": "R41", "val": "10K", "pat": "1206", "lay": "Top", "px": 532.5, "py": 163.5, "rot": 0.0}, {"ref": "R42", "val": "4R7", "pat": "2010", "lay": "Top", "px": 632.8, "py": 156.5, "rot": 270.0}, {"ref": "R43", "val": "4R7", "pat": "2010", "lay": "Top", "px": 647.8, "py": 156.5, "rot": 270.0}, {"ref": "R44", "val": "4R7", "pat": "2010", "lay": "Top", "px": 743.8, "py": 156.5, "rot": 270.0}, {"ref": "R45", "val": "4R7", "pat": "2010", "lay": "Top", "px": 632.3, "py": 213.0, "rot": 270.0}, {"ref": "R46", "val": "4R7", "pat": "2010", "lay": "Top", "px": 647.3, "py": 213.0, "rot": 270.0}, {"ref": "R47", "val": "4R7", "pat": "2010", "lay": "Top", "px": 728.8, "py": 213.0, "rot": 270.0}, {"ref": "R48", "val": "4R7", "pat": "2010", "lay": "Top", "px": 743.8, "py": 213.0, "rot": 270.0}, {"ref": "R49", "val": "20K", "pat": "1206", "lay": "Top", "px": 361.8, "py": 40.3, "rot": 90.0}, {"ref": "R50", "val": "10K", "pat": "1206", "lay": "Top", "px": 515.6, "py": 110.0, "rot": 180.0}, {"ref": "R51", "val": "10K", "pat": "1206", "lay": "Top", "px": 382.5, "py": 106.0, "rot": 0.0}, {"ref": "R52", "val": "20K", "pat": "1206", "lay": "Top", "px": 357.6, "py": 106.0, "rot": 180.0}, {"ref": "R53", "val": "20K", "pat": "1206", "lay": "Top", "px": 372.8, "py": 40.3, "rot": 90.0}, {"ref": "R54", "val": "30R1", "pat": "2010", "lay": "Top", "px": 985.8, "py": 61.5, "rot": 180.0}, {"ref": "R55", "val": "30R1", "pat": "2010", "lay": "Top", "px": 985.8, "py": 76.5, "rot": 180.0}, {"ref": "R56", "val": "30R1", "pat": "2010", "lay": "Top", "px": 985.8, "py": 91.5, "rot": 180.0}, {"ref": "R57", "val": "30R1", "pat": "2010", "lay": "Top", "px": 985.8, "py": 106.5, "rot": 180.0}, {"ref": "R58", "val": "30R1", "pat": "2010", "lay": "Top", "px": 985.8, "py": 121.5, "rot": 180.0}, {"ref": "R59", "val": "30R1", "pat": "2010", "lay": "Top", "px": 985.8, "py": 136.5, "rot": 180.0}, {"ref": "R60", "val": "30R1", "pat": "2010", "lay": "Top", "px": 985.8, "py": 162.5, "rot": 180.0}, {"ref": "R61", "val": "30R1", "pat": "2010", "lay": "Top", "px": 985.8, "py": 189.0, "rot": 180.0}, {"ref": "R62", "val": "30R1", "pat": "2010", "lay": "Top", "px": 916.8, "py": 70.0, "rot": 180.0}, {"ref": "R63", "val": "30R1", "pat": "2010", "lay": "Top", "px": 916.8, "py": 85.0, "rot": 180.0}, {"ref": "R64", "val": "30R1", "pat": "2010", "lay": "Top", "px": 916.8, "py": 100.0, "rot": 180.0}, {"ref": "R65", "val": "30R1", "pat": "2010", "lay": "Top", "px": 916.8, "py": 115.0, "rot": 180.0}, {"ref": "R66", "val": "30R1", "pat": "2010", "lay": "Top", "px": 916.8, "py": 130.0, "rot": 180.0}, {"ref": "R67", "val": "30R1", "pat": "2010", "lay": "Top", "px": 916.8, "py": 145.0, "rot": 180.0}, {"ref": "R68", "val": "30R1", "pat": "2010", "lay": "Top", "px": 916.8, "py": 160.0, "rot": 180.0}, {"ref": "R69", "val": "30R1", "pat": "2010", "lay": "Top", "px": 916.8, "py": 175.0, "rot": 180.0}, {"ref": "R70", "val": "150", "pat": "1206", "lay": "Top", "px": 229.1, "py": 12.5, "rot": 180.0}, {"ref": "R71", "val": "10K", "pat": "1206", "lay": "Top", "px": 196.3, "py": 41.8, "rot": 90.0}, {"ref": "R72", "val": "150", "pat": "1206", "lay": "Top", "px": 289.5, "py": 176.5, "rot": 0.0}, {"ref": "R73", "val": "10K", "pat": "1206", "lay": "Top", "px": 196.8, "py": 148.8, "rot": 90.0}, {"ref": "U1", "val": "NE5532", "pat": "SO8", "lay": "Top", "px": 259.3, "py": 34.0, "rot": 0.0}, {"ref": "U2", "val": "NE5532", "pat": "SO8", "lay": "Top", "px": 259.3, "py": 154.5, "rot": 180.0}, {"ref": "U3", "val": "NE5532", "pat": "SO8", "lay": "Top", "px": 536.3, "py": 46.5, "rot": 270.0}, {"ref": "U4", "val": "NE5532", "pat": "SO8", "lay": "Top", "px": 536.3, "py": 199.0, "rot": 270.0}];
const BRD = { img:'m8204-board.png', px:[1050,276], dpi:100, ox:0, oy:0, label:'PCB 14-265 ISS8 from its Gerbers',
  parts: PNP.map(p=>({ref:p.ref, v:p.val, pat:p.pat, x:p.px/100, y:p.py/100})).concat([{ref:'LVLA',v:'5K',pat:'MULTI',x:0.70,y:0.44},{ref:'LVLB',v:'5K',pat:'MULTI',x:0.70,y:2.28},{ref:'H2',v:'',pat:'H1X3 (J1/J2)',x:3.55,y:0.92},{ref:'H1',v:'',pat:'H1X3 (J3/J4)',x:3.95,y:1.18},{ref:'P1',v:'EDAC30\\156',pat:'EDGE30',x:10.35,y:1.4}]),
  note:'PCB 14-265 ISS8 rendered from the Gerbers in <span class="mono">PCB/GERBERS/</span> (top copper, bottom copper, solder mask, silk). SMT parts are clickable at their pick-and-place positions; LVLA/LVLB (multi-turn level) sit on the front edge; the MODE JUMPERS table is printed on the silk beside H1/H2.' };
const REARS = { 'TB8204P':{ img:'m8204-rear-tb8204p.svg', w:330, h:470, label:'TB8204P rear module', rows:[["TB8204P",0.2758,0.0292,0.665,0.0906],["Pluggable Screw Terminal",0.2938,0.1487,0.6622,0.1695],["SHIELD",0.2141,0.2789,0.3211,0.2963],["A IN -",0.2451,0.3076,0.3191,0.325],["INPUT",0.4873,0.3098,0.5726,0.3264],["A IN +",0.2386,0.3374,0.3201,0.3547],["SHIELD",0.2141,0.3837,0.3211,0.401],["OUT A2 +",0.6673,0.3843,0.7977,0.4017],["OUT A1 -",0.1982,0.4118,0.3211,0.4291],["OUT A2 -",0.6667,0.4134,0.7897,0.4307],["OUT A1 +",0.1917,0.4416,0.3221,0.4589],["SHIELD",0.6695,0.4405,0.7765,0.4579],["SHIELD",0.2141,0.4722,0.3211,0.4896],["OUT A4 +",0.6667,0.4712,0.7971,0.4885],["OUT A3 -",0.1982,0.4979,0.3211,0.5153],["OUT A4 -",0.667,0.5,0.7899,0.5173],["OUT A3+",0.1996,0.5281,0.3218,0.5455],["SHIELD",0.6686,0.5273,0.7757,0.5446],["SHIELD",0.2141,0.5608,0.3211,0.5782],["OUT B4 +",0.6667,0.5587,0.7987,0.576],["OUT B4 -",0.6667,0.5837,0.7913,0.601],["OUT B1-",0.2045,0.5887,0.3209,0.606],["OUT B1+",0.1981,0.6133,0.3219,0.6306],["SHIELD",0.6678,0.6141,0.7748,0.6314],["SHIELD",0.2141,0.6446,0.3211,0.662],["OUT B2 +",0.6667,0.6461,0.7987,0.6635],["OUT B3-",0.2045,0.6695,0.3209,0.6868],["OUT B2 -",0.6667,0.6752,0.7913,0.6926],["OUT B3+",0.1981,0.7027,0.3219,0.72],["SHIELD",0.6669,0.7033,0.774,0.7206],["SHIELD",0.2141,0.7476,0.3211,0.7649],["B IN -",0.2435,0.7736,0.3227,0.7909],["INPUT",0.4873,0.777,0.5726,0.7937],["B IN +",0.237,0.8038,0.3202,0.8211],["M8204 -Dual 1x4 / Stereo Analog Audio Distribution Amplifier",0.0287,0.9218,0.9798,0.9533],["-Lo Z 60 Ohm",0.1711,0.9576,0.3818,0.9801]] },
                'TB8204P/600':{ img:'m8204-rear-tb8204p600.svg', w:330, h:470, label:'TB8204P/600 rear module', rows:[["TB8204P/600",0.1849,0.0292,0.7558,0.0906],["Pluggable Screw Terminal",0.2749,0.1487,0.6433,0.1695],["SHIELD",0.2141,0.2789,0.3211,0.2963],["A IN -",0.2451,0.3076,0.3191,0.325],["INPUT",0.4873,0.3098,0.5726,0.3264],["A IN +",0.2386,0.3374,0.3201,0.3547],["SHIELD",0.2141,0.3837,0.3211,0.401],["OUT A2 +",0.6673,0.3843,0.7977,0.4017],["OUT A1 -",0.1982,0.4118,0.3211,0.4291],["OUT A2 -",0.6667,0.4134,0.7897,0.4307],["OUT A1 +",0.1917,0.4416,0.3221,0.4589],["SHIELD",0.6695,0.4405,0.7765,0.4579],["SHIELD",0.2141,0.4722,0.3211,0.4896],["OUT A4 +",0.6667,0.4712,0.7971,0.4885],["OUT A3 -",0.1982,0.4979,0.3211,0.5153],["OUT A4 -",0.667,0.5,0.7899,0.5173],["OUT A3+",0.1996,0.5281,0.3218,0.5455],["SHIELD",0.6686,0.5273,0.7757,0.5446],["SHIELD",0.2141,0.5608,0.3211,0.5782],["OUT B4 +",0.6667,0.5587,0.7987,0.576],["OUT B4 -",0.6667,0.5837,0.7913,0.601],["OUT B1-",0.2045,0.5887,0.3209,0.606],["OUT B1+",0.1981,0.6133,0.3219,0.6306],["SHIELD",0.6678,0.6141,0.7748,0.6314],["SHIELD",0.2141,0.6446,0.3211,0.662],["OUT B2 +",0.6667,0.6461,0.7987,0.6635],["OUT B3-",0.2045,0.6695,0.3209,0.6868],["OUT B2 -",0.6667,0.6752,0.7913,0.6926],["OUT B3+",0.1981,0.7027,0.3219,0.72],["SHIELD",0.6669,0.7033,0.774,0.7206],["SHIELD",0.2141,0.7476,0.3211,0.7649],["B IN -",0.2435,0.7736,0.3227,0.7909],["INPUT",0.4873,0.777,0.5726,0.7937],["B IN +",0.237,0.8038,0.3202,0.8211],["M8204A -Dual 1x4 / Stereo Analog Audio Distribution Amplifier",0.0287,0.9218,0.9519,0.9533],["-Hi Z 600 Ohm",0.2045,0.9573,0.4118,0.9781]] } };

/* ---------------- model ---------------- */
const VER = { M8204:{gmin:-14,gmax:18,max:30,rs:30.1,term:'TB8204P',z:'60 Ω balanced'}, M8204A:{gmin:-20,gmax:12,max:24,rs:300,term:'TB8204P/600',z:'600 Ω balanced'} };
const OP_CLIP = V2dBu((20-1.8)/Math.SQRT2);       // NE5532 on ±VA ≈ ±20 V after D15/D16 + F1/F2 (inferred)
const CARDMAX = 30;
const MODES = { STEREO:{h2:'J1',h1:'J4'}, MONO:{h2:'J1',h1:'J3'}, MIX:{h2:'J2',h1:'J3'} };
const D = {};
function reset(){ Object.assign(D,{ ver:'M8204', aDbu:4, bDbu:4, bPhase:0, f:1000, lvlA:null, lvlB:null, cmrA:0.4, cmrB:0.62, h2:'J1', h1:'J4', load:10000, cm:-30, sel:null, rsel:null, inserted:true, frame:'MF82/10', ev:[] }); D.lvlA=D.lvlB=detent(); }
const V = ()=>VER[D.ver];
function detent(){ const v=VER[D.ver||'M8204']; return (0-v.gmin)/(v.gmax-v.gmin); }
const gA = ()=> V().gmin+(V().gmax-V().gmin)*D.lvlA, gB = ()=> V().gmin+(V().gmax-V().gmin)*D.lvlB;
function mode(){ for (const k in MODES) if (MODES[k].h2===D.h2 && MODES[k].h1===D.h1) return k; return D.h2==='J2'&&D.h1==='J4'?'J2+J4 (not in the table)':'?'; }
const cmrr = x => clamp(100-170*Math.abs(x-0.5),55,100);
/* phasor sum of the A and B level-stage outputs in the U3A summing node (R49 20K + R53 or R52 20K, R15 10K) */
function sumDb(a,b,ph){ const va=dBu2V(a), vb=dBu2V(b); return V2dBu(Math.hypot(va+vb*Math.cos(ph), vb*Math.sin(ph))); }
function chain(){
  const v=V(), on=D.inserted?0:-200;
  const a1=D.aDbu+gA()+on, b1=D.bDbu+gB()+on;               // U1 (A) and U2 (B) outputs: diff amp + LVL in the feedback
  // U3A: −(R15/R49)·A − (R15/R53)·A  [J1]   or   −(R15/R49)·A − (R15/R52)·B  [J2]
  const aOut = D.h2==='J1' ? a1 : sumDb(a1,b1,D.bPhase) - 6.02;
  // U4A: −(R41/R50)·AOUT− [J3]  or  −(R41/R51)·B [J4]
  const bOut = D.h1==='J3' ? aOut : b1;
  const rs=v.rs, L=D.load, loss=dB(L/(L+2*rs));
  const clipA = a1>OP_CLIP || aOut>CARDMAX, clipB = b1>OP_CLIP || bOut>CARDMAX;
  const stages=[
    {name:'A input (TB8204P A IN ±)', db:D.aDbu+on, g:null, note:'30 kΩ balanced'},
    {name:'U1 A level (LVLA)', db:a1, g:gA(), max:OP_CLIP, note:'NE5532, R6 43K2 + LVLA 5K multi-turn, CMRA 2K trim'},
    {name:'B input (B IN ±)', db:D.bDbu+on, g:null, note:D.h1==='J3'&&D.h2==='J1'?'not used in MONO':''},
    {name:'U2 B level (LVLB)', db:b1, g:gB(), max:OP_CLIP, note:'NE5532, R10 43K2 + LVLB, CMRB'},
    {name:'A outputs (U3 → Q1/Q2, Q4/Q5)', db:aOut, g:aOut-a1, max:CARDMAX, note:D.h2==='J1'?'J1: A only, unity':'J2: (A+B)/2'},
    {name:'B outputs (U4 → Q8/Q9, Q11/Q12)', db:bOut, g:bOut-b1, max:CARDMAX, note:D.h1==='J3'?'J3: copies the A outputs':'J4: B only'},
    {name:'At a load ('+L+' Ω)', db:Math.max(aOut,bOut)+loss, g:loss, note:'2 × '+rs+' Ω build-out'},
  ];
  return { a1,b1,aOut,bOut,loss,aL:aOut+loss,bL:bOut+loss,clipA,clipB,stages,mode:mode(), humA:D.cm-cmrr(D.cmrA)+gA(), humB:D.cm-cmrr(D.cmrB)+gB() };
}

/* ---------------- actions ---------------- */
const A = {
  lvl(k,v,log){ D[k]=v; D.ev.push({t:SIM.t,name:(k==='lvlA'?'LVLA ':'LVLB ')+(k==='lvlA'?gA():gB()).toFixed(1)}); if(log) act((k==='lvlA'?'LVLA':'LVLB')+' multi-turn level turned', tr=>{ const c=chain(), g=k==='lvlA'?gA():gB(); tr(`${k==='lvlA'?'LVLA':'LVLB'} 5K multi-turn in the ${k==='lvlA'?'U1':'U2'} feedback (wiper through ${k==='lvlA'?'R7':'R13'} to pin 6, track from pin 7 to ground): ${g>=0?'+':''}${g.toFixed(1)} dB (range ${V().gmin} … +${V().gmax})`); tr(`${k==='lvlA'?'U1':'U2'}-7 now ${fmtDb(k==='lvlA'?c.a1:c.b1)}${(k==='lvlA'?c.a1:c.b1)>OP_CLIP?' — CLIPPING':''}`); tr(`Mode ${c.mode}: A outputs ${fmtDb(c.aOut)}, B outputs ${fmtDb(c.bOut)}`); }); },
  cmr(k,v,log){ D[k]=v; if(log) act((k==='cmrA'?'CMRA':'CMRB')+' 2K trim adjusted', tr=>{ tr(`${k==='cmrA'?'CMRA (with RV1)':'CMRB (with RV2)'} balances the difference-amplifier arms R3/R5 (${k==='cmrA'?'A':'B'} side)`); tr(`CMRR ≈ ${cmrr(D[k]).toFixed(0)} dB (spec > 80 dB)`); }); },
  jump(h){ act('Move the '+h+' jumper', tr=>{ if(h==='H2') D.h2=D.h2==='J1'?'J2':'J1'; else D.h1=D.h1==='J4'?'J3':'J4'; const c=chain();
    tr(`H2 on ${D.h2}: U3-2 summing node gets ${D.h2==='J1'?'A again through R53 20K (NET00007)':'B through R52 20K (NET00006)'} besides A through R49 20K; feedback R15 10K`);
    tr(`H1 on ${D.h1}: U4-2 is fed ${D.h1==='J3'?'from AOUT− through R50 10K (NET00003): the B outputs copy the A outputs':'from U2-7 (B level) through R51 10K (NET00004)'}`);
    tr(`Silk table: STEREO J1 J4 · MONO J1 J3 · MIX J2 J3 → now <b>${c.mode}</b>`); }); },
  setMode(k){ act('Set mode '+k, tr=>{ D.h2=MODES[k].h2; D.h1=MODES[k].h1; tr(`H2 → ${D.h2}, H1 → ${D.h1}`); tr(k==='MONO'?'Manual: in mono mode only the “A” input on the termination is used':k==='MIX'?'A and B are summed, each at half: a mono sum of a stereo pair on all eight outputs':'Two independent 1 × 4 amplifiers'); }); },
  ver(v){ act('Version '+v, tr=>{ D.ver=v; D.lvlA=D.lvlB=detent(); tr(`${v}: ${VER[v].z} outputs, gain ${VER[v].gmin} … +${VER[v].gmax} dB (spec table), max +${VER[v].max} dBm, rear module ${VER[v].term}`); }); },
  part(r){ act('Part '+r, tr=>{ D.sel=r; const p=BRD.parts.find(q=>q.ref===r); tr(`${r}: ${p&&p.v?p.v:'—'} · ${p?p.pat:''}`); const nets=Object.entries(NET.n).filter(([n,m])=>m.some(x=>x.split('-')[0]===r)).map(([n,m])=>`${m.filter(x=>x.split('-')[0]===r).map(x=>'pin '+x.split('-').slice(1).join('-')).join(', ')} → ${n}`); if(nets.length) tr('ISS7 netlist: '+nets.join(' · ')); }); },
  rrow(i){ const R=REARS[V().term]; act('Rear terminal '+R.rows[i][0], tr=>{ D.rsel=i; tr(rearSig(R.rows[i][0])||'Label on the '+V().term+' artwork'); }); },
  insert(){ act(D.inserted?'Pull the card out':'Slide the card in', tr=>{ D.inserted=!D.inserted; tr(D.inserted?'P1 (EDAC 30-way): V+ on 29/30, V− on 25/26, ground 3/27/28 through polyfuses F1/F2 (RXE050) and diodes D1/D2, D15/D16':'All outputs silent'); }); },
  reset(){ act('Start over', tr=>{ reset(); tr('M8204, STEREO, both channels at unity'); }); },
};
function rearSig(lab){ const c=chain(); if(/A IN/.test(lab)) return `${lab}: ${fmtDb(D.aDbu)} → P1-1 (A) / P1-2 (1)`; if(/B IN/.test(lab)) return `${lab}: ${fmtDb(D.bDbu)} → P1-21 (M) / P1-22 (11)${c.mode==='MONO'?' — not used in MONO':''}`;
  let m=lab.match(/OUT\s*A\s*(\d)/); if(m) return `OUT A${m[1]}: ${fmtDb(c.aL)} across ${D.load} Ω`; m=lab.match(/OUT\s*B\s*(\d)/); if(m) return `OUT B${m[1]}: ${fmtDb(c.bL)} across ${D.load} Ω`; if(/SHIELD/.test(lab)) return 'Shield → GNDD'; return null; }

/* ---------------- drawings ---------------- */
function ctl(){ return [
  {k:'lvlA', label:'LVLA 5K multi-turn (A level)', short:'LVLA', kind:'multi', x:0.70, y:0.44, ly:0.95, get:()=>D.lvlA, set:(v,l)=>A.lvl('lvlA',v,l)},
  {k:'lvlB', label:'LVLB 5K multi-turn (B level)', short:'LVLB', kind:'multi', x:0.70, y:2.28, ly:1.95, get:()=>D.lvlB, set:(v,l)=>A.lvl('lvlB',v,l)},
  {k:'cmrA', label:'CMRA 2K (A common-mode)', short:'CMRA', kind:'trim', x:1.688, y:0.425, ly:0.12, get:()=>D.cmrA, set:(v,l)=>A.cmr('cmrA',v,l)},
  {k:'cmrB', label:'CMRB 2K (B common-mode)', short:'CMRB', kind:'trim', x:1.688, y:1.50, ly:1.95, get:()=>D.cmrB, set:(v,l)=>A.cmr('cmrB',v,l)},
  {k:'h2', label:'H2: J1 (A) / J2 (B into the A bus)', kind:'jumper', x:3.55, y:0.80, get:()=>0, show:()=>'H2 '+D.h2, click:()=>A.jump('H2')},
  {k:'h1', label:'H1: J3 (copy A) / J4 (B)', kind:'jumper', x:4.05, y:1.32, get:()=>0, show:()=>'H1 '+D.h1, click:()=>A.jump('H1')} ]; }
function panelHTML(){ BRD.ctl=ctl(); const c=chain(), R=REARS[V().term];
  return card(`The card — ${D.ver}, mode ${c.mode}`, boardSVG(BRD,{sel:D.sel})+controlsHTML())
   + `<div class="grid2">${card('Front edge', handleSVG(D.ver, `<g class="hnd" style="cursor:pointer"><title>Click: slide the card ${D.inserted?'out':'in'}</title><rect x="10" y="80" width="60" height="100" fill="transparent"/></g><text x="80" y="140" font-size="11" fill="${D.inserted?'var(--accent)':'var(--warn)'}">${D.inserted?'in the frame':'pulled out'}</text>`))}${card('Rear module '+V().term, rearSVG(Object.assign(R,{sig:rearSig}),{sel:D.rsel})+`<div class="small muted">CorelDRAW art (vector): ${D.ver==='M8204A'?SIM.src('#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8204A - rear module options.cdr','M8204A - rear module options.cdr'):SIM.src('#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8204 - rear module options.cdr','M8204 - rear module options.cdr')} (2012|45), as Corel printed it to PDF. Click a terminal label.</div>`)}</div>`; }
function controlsHTML(){ const c=chain(); return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
  <label>Version <select data-c="ver">${Object.keys(VER).map(k=>`<option ${k===D.ver?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>Mode <select data-c="mode">${Object.keys(MODES).map(k=>`<option ${k===c.mode?'selected':''}>${k}</option>`).join('')}${MODES[c.mode]?'':'<option selected>'+c.mode+'</option>'}</select></label>
  <label>A in <input type="range" data-c="a" min="-20" max="24" value="${D.aDbu}"> <span class="mono">${fmtDb(D.aDbu)}</span></label>
  <label>B in <input type="range" data-c="b" min="-20" max="24" value="${D.bDbu}"> <span class="mono">${fmtDb(D.bDbu)}</span></label>
  <label>B phase vs A <select data-c="ph">${[[0,'0° (mono-compatible)'],[90,'90°'],[180,'180° (out of phase)']].map(([v,l])=>`<option value="${v}" ${Math.round(D.bPhase*180/Math.PI)===v?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Load <select data-c="load">${[600,10000].map(v=>`<option value="${v}" ${v===D.load?'selected':''}>${v>=1000?v/1000+' k':v} Ω</option>`).join('')}</select></label>
  <label>Common-mode hum <input type="range" data-c="cm" min="-60" max="0" value="${D.cm}"></label>
  <button data-c="reset">Start over</button></div>`; }
function bind(root){ bindBoard(root,BRD,r=>A.part(r)); root.querySelectorAll('.rrow').forEach(g=>g.onclick=()=>A.rrow(+g.dataset.i)); root.querySelectorAll('.hnd').forEach(g=>g.onclick=()=>A.insert());
  root.querySelectorAll('[data-c]').forEach(e=>{ const c=e.dataset.c; if(c==='reset') e.onclick=()=>A.reset();
    else if(c==='a'||c==='b'||c==='cm') e.oninput=()=>{ D[{a:'aDbu',b:'bDbu',cm:'cm'}[c]]=+e.value; SIM.refresh(); };
    else e.onchange=()=>{ const v=e.value; if(c==='ver') A.ver(v); if(c==='mode'&&MODES[v]) A.setMode(v); if(c==='ph'){ D.bPhase=+v*Math.PI/180; SIM.refresh(); } if(c==='load'){ D.load=+v; SIM.refresh(); } }; }); }
function stateHTML(){ const c=chain(); return `<table class="kv"><tr><th>Mode</th><td><b>${c.mode}</b> (H2 ${D.h2}, H1 ${D.h1})</td></tr><tr><th>Gain A / B</th><td class="mono">${gA().toFixed(1)} / ${gB().toFixed(1)} dB</td></tr><tr><th>A outputs 1–4</th><td class="mono">${fmtDb(c.aL)}${c.clipA?' CLIP':''}</td></tr><tr><th>B outputs 1–4</th><td class="mono">${fmtDb(c.bL)}${c.clipB?' CLIP':''}</td></tr><tr><th>Hum A / B</th><td class="mono">${fmtDb(c.humA)} / ${fmtDb(c.humB)}</td></tr><tr><th>Output Z</th><td>${V().z}</td></tr></table>`; }
function lanes(){ const c=chain(), f=D.f, ph=D.bPhase;
  const sum=(t,clip)=>{ if(D.h2==='J1') return sineV(t,c.a1,f,clip); return 0.5*(sineV(t,c.a1,f,null)+sineV(t,c.b1,f,null,ph)); };
  const lim=v=>{ const p=Math.SQRT2*dBu2V(CARDMAX); return clamp(v,-p,p); };
  return [
    waveLane('A input', 40, t=>sineV(t,D.aDbu,f), {f, col:SIM.css('--ink2')}),
    waveLane('B input', 40, t=>sineV(t,D.bDbu,f,null,ph), {f, col:SIM.css('--ink2')}),
    waveLane('U1-7 (A level)', 40, t=>sineV(t,c.a1,f,OP_CLIP), {f, clip:OP_CLIP}),
    waveLane('U2-7 (B level)', 40, t=>sineV(t,c.b1,f,OP_CLIP,ph), {f, clip:OP_CLIP}),
    waveLane('A outputs (AOUT±)', 46, t=>lim(sum(t)), {f, clip:CARDMAX, col:SIM.css('--accent2')}),
    waveLane('B outputs (BOUT±)', 46, t=>lim(D.h1==='J3'?sum(t):sineV(t,c.b1,f,null,ph)), {f, clip:CARDMAX, col:SIM.css('--warn')}),
    eventLane('Your adjustments', ()=>D.ev) ]; }
function secondHTML(){ const c=chain(); return `<table class="kv"><tr><th>Tone cycles</th><td class="mono">${D.f} per channel in 1 s</td></tr><tr><th>Mode</th><td>${c.mode}</td></tr><tr><th>A out / B out</th><td class="mono">${fmtDb(c.aOut)} / ${fmtDb(c.bOut)} at the card</td></tr><tr><th>Into each load</th><td class="mono">${(dBu2V(c.aOut)/(D.load+2*V().rs)*1000).toFixed(2)} mA rms</td></tr><tr><th>Stereo → MIX</th><td class="mono">L+R in phase: ${fmtDb(sumDb(c.a1,c.b1,0)-6.02)}; 180° out of phase: ${fmtDb(sumDb(c.a1,c.b1,Math.PI)-6.02)}</td></tr><tr><th>Supply</th><td class="mono">±22 V via F1/F2 RXE050 polyfuses, D1/D2 + D15/D16 1N4003 → ±VA; 80 mA idling (spec)</td></tr></table><p class="small">In MIX the two channels are summed in U3's virtual earth, so a 180° (polarity-reversed) stereo pair cancels — the classic mono-compatibility check.</p>`; }

const lessons=[
  {title:'The card', auto:true, check:()=>true, body:'<p>The M8204 is two discrete low-noise DAs on one card: each takes a balanced input and feeds four balanced outputs. Each channel has a multi-turn level pot (−14 to +18 dB). The M8204 has 60 Ω outputs, the M8204A 600 Ω (M8204MAN.WPD).</p>'},
  {title:'1 · Unity on both channels', check:()=>Math.abs(gA())<0.3&&Math.abs(gB())<0.3&&D.aDbu===4, hint:'A in +4 dBu; LVLA and LVLB at 0.0 dB (Start over sets this).', body:'<p>Feed +4 dBu and set LVLA and LVLB so each output equals its input.</p><p><b>Goal:</b> both gains at 0 dB with +4 dBu in.</p>'},
  {title:'2 · Mono mode', check:()=>mode()==='MONO', hint:'Click the H1 jumper on the board until it reads J3 (H2 stays J1).', body:'<p>The silk table: <b>MONO = J1 J3</b>. With H1 on J3 the B output amplifier is fed from the A outputs, so all eight outputs carry input A and the B input is ignored.</p><p><b>Goal:</b> MONO, by moving the jumper on the board.</p>'},
  {title:'3 · Mix a stereo pair', check:()=>mode()==='MIX'&&D.bPhase===0, hint:'Move H2 to J2 (and H1 to J3). B phase 0°.', body:'<p><b>MIX = J2 J3</b>: A and B are summed at half each into the A bus, and H1 copies it to the B outputs: a mono sum on all eight.</p><p><b>Goal:</b> MIX with an in-phase pair.</p>'},
  {title:'4 · The polarity check', check:()=>mode()==='MIX'&&Math.abs(D.bPhase-Math.PI)<0.01, hint:'B phase → 180°. Watch the A outputs lane.', body:'<p>Reverse one leg of the B input (180°). In MIX the sum cancels: this is how an engineer finds a polarity error in a stereo feed.</p><p><b>Goal:</b> MIX with B at 180°.</p>'},
  {title:'5 · 600 Ω plant', check:()=>D.ver==='M8204A'&&D.load===600, hint:'Version M8204A, Load 600 Ω.', body:'<p>The M8204A uses the TB8204P/600 termination. Into a 600 Ω load the output drops 6 dB.</p><p><b>Goal:</b> M8204A into 600 Ω.</p>'},
  {title:'Done', auto:true, check:()=>true, body:'<p>See <b>Findings</b>.</p>'},
];

const blocks={ w:820, h:330, note:'Redrawn from the 14-265 ISS7 netlist. H2 and H1 are the mode jumpers.', nodes:{
  ai:{x:10,y:30,w:110,h:52,t:'A IN ±',s:['P1-1 (A), P1-2 (1)'],lv:()=>fmtDb(D.aDbu),info:'Through R1/R2 10K and the D3–D6 clamps into U1.'},
  bi:{x:10,y:230,w:110,h:52,t:'B IN ±',s:['P1-21 (M), P1-22 (11)'],lv:()=>fmtDb(D.bDbu),info:'Through R11/R8 10K and D7–D10 into U2.'},
  u1:{x:150,y:30,w:150,h:52,t:'U1 NE5532',s:['diff amp + LVLA','CMRA, RV1'],lv:()=>fmtDb(chain().a1),info:()=>`A level: ${gA().toFixed(1)} dB.`},
  u2:{x:150,y:230,w:150,h:52,t:'U2 NE5532',s:['diff amp + LVLB','CMRB, RV2'],lv:()=>fmtDb(chain().b1),info:()=>`B level: ${gB().toFixed(1)} dB.`},
  h2:{x:330,y:120,w:110,h:52,t:'H2 '+'(J1/J2)',s:['R53 / R52 20K'],info:'Chooses whether the A bus sums A+A (J1, unity) or A+B (J2, half each).'},
  u3:{x:470,y:30,w:160,h:52,t:'U3 + Q1/Q2, Q4/Q5',s:['AOUT+ / AOUT−'],lv:()=>fmtDb(chain().aOut),info:'U3A drives AOUT+ (MJD29/MJD30 with 2N4401 Q3 limit); U3B inverts it for AOUT−. 4R7 emitter resistors.'},
  h1:{x:330,y:200,w:110,h:52,t:'H1 (J3/J4)',s:['R50 / R51 10K'],info:'Feeds U4 from AOUT− (J3, copy A) or from U2 (J4, B).'},
  u4:{x:470,y:230,w:160,h:52,t:'U4 + Q8/Q9, Q11/Q12',s:['BOUT+ / BOUT−'],lv:()=>fmtDb(chain().bOut),info:'Same output stage for the B bus.'},
  ao:{x:660,y:30,w:150,h:52,t:'A outs 1–4',s:['R54–R56, R60–R64, R68–R69','30R1 to P1'],lv:()=>fmtDb(chain().aL),info:'Build-outs to P1 4,5,6,10,11 (+) and D,E,F,L,M (−).'},
  bo:{x:660,y:230,w:150,h:52,t:'B outs 1–4',s:['R57–R59, R65–R67','30R1 to P1'],lv:()=>fmtDb(chain().bL),info:'Build-outs to P1 7,8,9 (+) and H,J,K (−).'} },
  edges:[['ai','u1'],['bi','u2'],['u1','u3','R49'],['u1','h2'],['u2','h2'],['h2','u3'],['u3','ao'],['u3','h1','AOUT−'],['u2','h1'],['h1','u4'],['u4','bo']] };

/* ---------------- schematics redrawn from the netlist ---------------- */
function netTable(hl){ const H=(hl&&hl[0]||'').toUpperCase(); const rows=Object.entries(NET.n).filter(([n,m])=>!H||n.toUpperCase().includes(H)||m.some(x=>x.toUpperCase().startsWith(H+'-')||x.toUpperCase()===H));
  return `<table class="kv small"><tr><th>Net</th><th>Members (part-pin)</th></tr>${rows.map(([n,m])=>`<tr><td class="mono">${esc(n)}</td><td class="mono">${m.map(x=>`${esc(x)}<span class="muted">${NET.c[x.split('-')[0]]?' ('+esc(NET.c[x.split('-')[0]])+')':''}</span>`).join(' · ')}</td></tr>`).join('')}</table>`; }
function chanSheet(hl){ // channel A, placed by hand, every value and net name from 14-265iss7.net
  const H=(hl&&hl[0]||'').toUpperCase(), on=r=>H&&r.toUpperCase()===H;
  const R=(x,y,ref,horiz)=>{ const v=NET.c[ref]||''; return horiz? `<g><path d="M${x} ${y}h8l3 -5l6 10l6 -10l6 10l6 -10l3 5h8" fill="none" stroke="${on(ref)?'var(--warn)':'var(--ink)'}" stroke-width="${on(ref)?2.5:1.3}"/><text x="${x+23}" y="${y-9}" font-size="10" text-anchor="middle" fill="var(--accent2)">${ref}</text><text x="${x+23}" y="${y+18}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${esc(v)}</text></g>` : `<g><path d="M${x} ${y}v8l-5 3l10 6l-10 6l10 6l-10 6l5 3v8" fill="none" stroke="${on(ref)?'var(--warn)':'var(--ink)'}" stroke-width="${on(ref)?2.5:1.3}"/><text x="${x+9}" y="${y+22}" font-size="10" fill="var(--accent2)">${ref}</text><text x="${x+9}" y="${y+34}" font-size="9.5" fill="var(--ink2)">${esc(v)}</text></g>`; };
  const OA=(x,y,ref,pins)=>`<g><path d="M${x} ${y-28}L${x+56} ${y}L${x} ${y+28}Z" fill="var(--panel)" stroke="${on(ref.split(/[AB]$/)[0])?'var(--warn)':'var(--ink)'}" stroke-width="1.4"/><text x="${x+6}" y="${y-12}" font-size="10" fill="var(--ink)">−${pins[0]}</text><text x="${x+6}" y="${y+18}" font-size="10" fill="var(--ink)">+${pins[1]}</text><text x="${x+22}" y="${y+4}" font-size="10" font-weight="700" fill="var(--accent2)">${ref}</text><text x="${x+58}" y="${y-4}" font-size="9" fill="var(--ink2)">${pins[2]}</text></g>`;
  const W=(d)=>`<path d="${d}" fill="none" stroke="var(--ink)" stroke-width="1.3"/>`, N=(x,y,t,a)=>`<text x="${x}" y="${y}" font-size="10" font-weight="700" text-anchor="${a||'start'}" fill="var(--warn)">${t}</text>`, Dt=(x,y)=>`<circle cx="${x}" cy="${y}" r="2.6" fill="var(--ink)"/>`;
  let s=`<svg viewBox="0 0 1100 520" style="width:100%;min-width:900px;background:var(--lane);border:1px solid var(--line);border-radius:8px" role="img" aria-label="Channel A redrawn from 14-265iss7.net">`;
  s+=N(20,96,'P1-1 (A)')+W('M20 100H70')+R(70,100,'R1',true)+W('M126 100H160V120H200')+N(20,226,'P1-2 (1)')+W('M20 230H70')+R(70,230,'R2',true)+W('M126 230H160V180H200');
  s+=OA(200,150,'U1A',['2','3','1'])+W('M256 150H300')+N(262,142,'NET00015')+W('M300 150V60H380')+R(380,60,'R70',true)+W('M436 60H470')+N(440,48,'NET00023 → CMRA/RV1')+R(300,160,'R4',false);
  s+=W('M300 150H330V250H360')+R(360,250,'R5',true)+W('M416 250H460')+OA(460,280,'U1B',['6','5','7'])+W('M516 280H560')+Dt(560,280)+N(530,272,'NET00000');
  s+=W('M560 280V360')+`<rect x="545" y="360" width="30" height="60" fill="none" stroke="${on('LVLA')?'var(--warn)':'var(--ink)'}" stroke-width="1.5"/><text x="582" y="390" font-size="10" fill="var(--accent2)">LVLA</text><text x="582" y="402" font-size="9.5" fill="var(--ink2)">5K multi</text>`+W('M560 420V450')+N(548,466,'GNDD')+W('M545 390H500V320H470')+R(470,320,'R7',false)+N(440,330,'NET00014')+R(600,280,'R6',true)+W('M560 280H600M656 280H680V250H460');
  s+=W('M560 280H700')+R(700,280,'R49',true)+W('M756 280H800')+Dt(800,280)+N(770,270,'NET00002');
  s+=`<g><rect x="700" y="330" width="90" height="24" rx="4" fill="#ffd84a" stroke="#000"/><text x="745" y="347" font-size="11" text-anchor="middle" fill="#000">H2 ${D.h2}</text></g>`+R(700,380,'R53',true)+W('M700 380H680V280M756 380H780V354')+R(700,430,'R52',true)+W('M756 430H800V354')+N(600,445,'U2-7 (B level)')+W('M680 430H700');
  s+=W('M800 280H830')+OA(830,280,'U3A',['2','3','1'])+W('M886 280H920')+N(890,270,'NET00020 → Q1/Q3')+W('M920 280V200H960')+`<rect x="960" y="185" width="80" height="30" fill="none" stroke="var(--ink)"/><text x="1000" y="204" font-size="10" text-anchor="middle" fill="var(--ink)">Q1 Q2 Q3</text>`+W('M1040 200H1080')+N(1080,194,'AOUT+','end')+W('M1060 200V120H830V280');
  s+=R(870,120,'R15',true)+N(20,500,'Redrawn from 14-265iss7.net (values from its parts list). Pin numbers are the netlist\'s; layout is ours.');
  return s+'</svg>'; }
const sheets=[
  {name:'Channel A — level stage and mode jumper', svg:chanSheet, note:'Hand-placed redraw; every designator, value, pin and net name comes from <span class="mono">PCB/OBSOLETE/14-265iss7.net</span>. Search highlights a part.'},
  {name:'Netlist 14-265 ISS7 (79 nets)', svg:netTable, note:'All nets of the ISS7 board with each member part\'s value. Type a designator (e.g. H1, LVLA, P1) or a net name to filter.'},
  {name:'P1 pin-out (from the netlist)', svg:()=>{ const pins=Object.entries(NET.n).flatMap(([n,m])=>m.filter(x=>x.startsWith('P1-')).map(x=>[+x.split('-')[1],n,m.filter(y=>!y.startsWith('P1-')).join(', ')])).sort((a,b)=>a[0]-b[0]); return `<table class="kv small"><tr><th>P1 pin</th><th>Net</th><th>Connected to</th></tr>${pins.map(p=>`<tr><td class="mono">${p[0]}</td><td class="mono">${esc(p[1])}</td><td class="mono">${esc(p[2])}</td></tr>`).join('')}</table>`; }, note:'Net names A, 1, D–M, 4–11 are the P1 contact letters used on the schematic.'},
];

function softHTML(){ const c=chain(); return `<div class="grid2">${card('Signal path, stage by stage', stageTable(c.stages))}${card('Level diagram', levelSVG(c.stages))}</div>
 <div class="grid2">${card('Mode jumpers — the summing maths', `<table class="kv"><tr><th>Mode</th><th>H2</th><th>H1</th><th>A bus (U3A)</th><th>B bus (U4A)</th></tr>
  <tr${c.mode==='STEREO'?' class="hl"':''}><td>STEREO</td><td>J1</td><td>J4</td><td class="mono">−R15·(A/R49 + A/R53) = A</td><td class="mono">−R41·B/R51 = B</td></tr>
  <tr${c.mode==='MONO'?' class="hl"':''}><td>MONO</td><td>J1</td><td>J3</td><td class="mono">A</td><td class="mono">−R41·AOUT−/R50 = A</td></tr>
  <tr${c.mode==='MIX'?' class="hl"':''}><td>MIX</td><td>J2</td><td>J3</td><td class="mono">−R15·(A/R49 + B/R52) = (A+B)/2</td><td class="mono">copy of A bus</td></tr></table>
  <p class="small">R15 = R41 = R50 = R51 = 10K, R49 = R52 = R53 = 20K (ISS7 parts list). Sign is handled by the output stage; magnitudes shown.</p>`)}
  ${card('Output fan-out', `<table class="kv"><tr><th>Output</th><th>Level at ${D.load} Ω</th></tr>${[1,2,3,4].map(n=>`<tr><td>A${n}</td><td class="mono">${fmtDb(c.aL)}</td></tr>`).join('')}${[1,2,3,4].map(n=>`<tr><td>B${n}</td><td class="mono">${fmtDb(c.bL)}</td></tr>`).join('')}</table>`)}</div>`; }

const findings=[
  `<b>Artwork ${SIM.year(2026)}: rear modules now from the CorelDRAW guides.</b> TB8204P and TB8204P/600 are vector art from ${SIM.src('#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8204 - rear module options.cdr','M8204 - rear module options.cdr')} and ${SIM.src('#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8204A - rear module options.cdr','M8204A - rear module options.cdr')} (2012-01-16, via CorelDRAW's own PDFs). The newest card sheet, ${SIM.src('#MF8200 #SERIES/M8204 - #Master #MF82/M8204 - #Engineering/Manual/M8204_1trm.cdr','M8204_1trm.cdr')} (2010), lists three module families — ST8204 & ST8204/600 solder, TB8204P & TB8204P/600 pluggable and a screw block titled “<b>TB204</b> & TB8204/600” (a typo for TB8204) — and ${SIM.src('#MF8200 #SERIES/M8204 - #Master #MF82/M8204 - #Engineering/Manual/M8204_2trm.cdr','M8204_2trm.cdr')} (2004) an ST8201A solder option for the M8204/A; the 2012 guide keeps only the pluggable ones. libcdr draws the Swis721 terminal legends of these sheets about ten times too large, so the guide's Corel PDF supplies the curves.`,
  `<b>The mode jumpers are a summing amplifier.</b> The silk table (STEREO J1 J4, MONO J1 J3, MIX J2 J3) works because U3A's virtual earth always gets A through R49 20K and, through H2, either A again (R53, J1: unity) or B (R52, J2: half of each). H1 then feeds the B output stage either from B (R51) or from the A bus (R50, AOUT−). Worked out from <span class="mono">14-265iss7.net</span>.`,
  `<b>The manual's gain range disagrees with itself.</b> M8204MAN.WPD's General text says each section adjusts −14 to +18 dB; its spec table gives the M8204A −20 to +12 dB. The simulator follows the table.`,
  `<b>One PCB, three products.</b> The ISS8 BOM title on the BOM tool is “RoHS M8204A/M8205/M8205B AUDIO DA”; the Gerber folder holds <span class="mono">M8205B.STN</span> next to <span class="mono">M8204.STN</span>. Links LK1 and LK2 join AOUT− to BOUT− and AOUT+ to BOUT+ — fitted, the two output busses become one 1 × 8 (the M8205 build).`,
  `<b>The ISS8 BOM fits those links.</b> <span class="mono">14-265ISS8.bom</span> lists LK1–LK3 (0R) as fitted, which would short the two channels of a dual M8204 together: that BOM is the mono (M8205/M8205B) build, not the M8204 — ${inf} from the netlist roles of LK1/LK2.`,
  `<b>Shared P1 pins.</b> In the ISS7 netlist P1-21 (M) and P1-22 (11) carry both the B input (R11, R8) and A-output build-outs (R61, R69), and P1-19 (L) has R60 plus LK3 to ground. Which parts are fitted decides whether those contacts are an input or an output.`,
  `<b>The 30R/300R choice moved.</b> The 1999 schematic (<span class="mono">M8204-5.DSN - PAGE1.pdf</span>, ISS5) says “30R FOR M8204, AND 300R FOR THE M8204A” on the card; the ISS8 SMT board fits sixteen 30R1 on every build, and the 600 Ω version is made by the TB8204P/600 rear module (the termination plugin found 30R 1 W parts on M8204T.PCB).`,
  `<b>Output transistors changed package.</b> ISS5: TIP29C/TIP30C (through-hole). ISS7/8: MJD29/MJD30 DPAK, with 4R7 2010 emitter resistors and RXE050 polyfuses F1/F2 in the supply.`,
  `<b>Empty and misnamed folders.</b> <span class="mono">M8402 - BOM</span> (typo for M8204) and <span class="mono">M8204 - QUOTE</span> hold copies; the loose <span class="mono">M8204-ASSY - #Assembly.pdf</span> at the series root duplicates <span class="mono">PCB/M8204-ASSY.pdf</span>. The Gerbers were re-imported in 2013|46 (<span class="mono">Transcode Report.txt</span>, D25 → D100 aperture renumbering).`,
];
const assume=[`NE5532 swing (±18.2 V on about ±20 V after the diodes) ${inf}.`,`The CMR trim curve ${inf}; 80 dB is the spec.`,`Through-hole part positions (LVLA, LVLB, H1, H2) are read off the rendered silk; SMT positions come from the pick-and-place file.`,`The TB8204P/600 build-out value ${inf} (600 Ω total per output).`];

P={ id:'m8204', product:'M8204', year:1999, family:'8200 Distribution Series', folder:'#MF8200 #SERIES/M8204 - #Master #MF82',
  name:'M8204 · Dual 1×4 analog audio DA (1999|32)',
  summary:'Two low-noise analog distribution amplifiers on one MF82 card, each one balanced input to four balanced outputs, with on-board jumpers for stereo, mono or mix. The board is rendered from the ISS8 Gerbers and the circuit is worked out from the ISS7 netlist.',
  highlights:['14-265 ISS8 Gerbers rendered to scale','Mode jumpers H1/H2 clickable on the board','Mix mode as a summing amplifier, with a polarity check','Netlist sheets: 79 nets, P1 pin table','One PCB serves M8204, M8204A, M8205 and M8205B'],
  hint:'Click LVLA / LVLB at the front edge, the CMRA/CMRB trims, the H1/H2 jumpers, any SMT part, or a rear terminal.',
  reset, chain, lanes, panelHTML, bind, stateHTML, secondHTML, lessons, blocks, sheets, softHTML, findings, footnotes:[{text:"TB8204P and TB8204P/600 are drawn from the 2012 CorelDRAW guides via CorelDRAW's own PDFs.",src:"#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8204 - rear module options.cdr"},{text:"The 2010 terminal sheet titles the screw module “TB204 & TB8204/600 SCREW TERMINAL” — TB204 is a typo for TB8204.",src:"#MF8200 #SERIES/M8204 - #Master #MF82/M8204 - #Engineering/Manual/M8204_1trm.cdr"},{text:"The 2010 sheet offers solder (ST8204, ST8204/600) and screw (TB8204, TB8204/600) modules that the 2012 guide no longer lists.",src:"#MF8200 #SERIES/M8204 - #Master #MF82/M8204 - #Engineering/Manual/M8204_1trm.cdr"},{text:"A 2004 sheet adds an ST8201A solder option for the M8204/A.",src:"#MF8200 #SERIES/M8204 - #Master #MF82/M8204 - #Engineering/Manual/M8204_2trm.cdr"},{text:"The TB8204P footers differ only in impedance: M8204 “Lo Z 60 Ohm”, M8204A “Hi Z 600 Ohm”.",src:"#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/M8204A - rear module options.pdf"}], assume,
  tutPanel:()=>card('The card', boardSVG(Object.assign(BRD,{ctl:ctl()}),{sel:D.sel})+controlsHTML())+card('State', stateHTML()),
  sources:['M8204 - #Engineering/Manual/M8204MAN.WPD','M8204 - #Engineering/PCB/GERBERS/14-265ISS8.TOP, .BOT, .TSM, .TSS, Transcode Report.txt','M8204 - #Engineering/PCB/14-265ISS8.pnp, 14-265ISS8.bom','M8204 - #Engineering/PCB/OBSOLETE/14-265iss7.net','M8204 - #Engineering/Manual/M8204-5.DSN - PAGE1.pdf','8200 Series Rear Module options graphical Guides…/M8204 - rear module options.pdf, M8204A - rear module options.pdf','8205-004 ISS 2 (HANDLE) .pdf','MISC/BOM Summary Tool.xlsx'] };
reset();
register();

})();
