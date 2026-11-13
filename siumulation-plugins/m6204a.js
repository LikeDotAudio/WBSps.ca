/* =====================================================================
   M6204A — openGear HD/SD-SDI AES audio embedder (multiplexer), 8 AES in, Ward-Beck Systems (2009|42)
   Release package "M6204A - #Master #OPENGEAR": test reports V1001 (2009), C700 (2009), V1002 (2009), V3000 (2012)
   and the issue-3 top-side pick-and-place program (2010, filed 2016|49).
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   This folder has no code. The firmware and drawings live in the sibling folder (linked):
   - M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204A/Software/atmel/v300/ (3.0.0.0): v100w.c (ALTERA_SORT,
       REFRESH_LEDS, PROCESS_DIP_SWITCHES), M6204A.c, M6204.h (LED ports, EMB_AUDIO/AES_AUDIO/SRC_AUDIO/MUTE_AUDIO),
       Dashboard_b.c (the DashBoard file actually linked, per V100W.mak), Dashboard.c (unlinked), wbs_ztcpack.txt
   - M6204 - #Engineering/M6204A/M6204A operational  info.doc (128-bit register map, DIP), M6204A dip switch.pdf,
       M6204A SOFTWARE HISTORY.xls;  M6204 - #Engineering/M6204-card-edge.cdr, M6204A-T6301.cdr, M6204A-T6305.cdr (Inkscape)
   - this folder: M6204A-iss3 - #PNP #2016/M6204A-iss3-T.prg (271 placements → board drawing),
       M6204A - #TESTREPORT/*.pdf (scanned; V3000 notes page read by eye)
   Anything not in those files is marked "inferred" on screen. No third-party logos.
   ===================================================================== */
(function(){
const SIM = window.SIM;
/* ---------------- og62 kit: shared openGear card look (card edge, rear module, DashBoard panel,
   frame, views). This block is copied verbatim into each WBS openGear plugin so no plugin depends
   on another file. Drawn from: D6204-card-edge.pdf (card-edge layout, CorelDRAW X3, 2007|40),
   the openGear Rear Module Guides (10-position 2×5 grids, numbered 1–10), and DashBoard 2.x
   (parameter tree + tabbed parameter panel). ---------------- */
const K = (()=>{
  const inf = (why)=>`<span class="tag-inf" title="${why?('Not stated in the source; inferred from '+why):'Not stated in the source; inferred'}">inferred</span>`;
  const card = (title, body, cls)=>`<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;
  if (!document.getElementById('og62css')){
    const st=document.createElement('style'); st.id='og62css';
    st.textContent=`
.og62-dash{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel2);font-size:12.5px}
.og62-dash .tb{display:flex;align-items:center;gap:8px;padding:5px 9px;background:color-mix(in srgb,var(--accent2) 18%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.og62-dash .tb .sp{flex:1}.og62-dash .tb .dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.og62-dash .bd{display:grid;grid-template-columns:150px minmax(0,1fr);min-height:220px}
.og62-dash .tree{border-right:1px solid var(--line);padding:6px 4px;font-size:12px;background:var(--panel)}
.og62-dash .tree div{padding:1px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.og62-dash .tree .sel{background:var(--accent2);color:#fff;border-radius:3px}
.og62-dash .tabs{display:flex;gap:2px;padding:6px 8px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
.og62-dash .tabs button{border-radius:6px 6px 0 0;border-bottom:none;padding:3px 10px;font-size:12px;background:transparent}
.og62-dash .tabs button.on{background:var(--panel);color:var(--ink);border-color:var(--line);font-weight:700;box-shadow:inset 0 2px 0 var(--accent2)}
.og62-dash table{width:100%;border-collapse:collapse;background:var(--panel)}
.og62-dash td{padding:3px 8px;border-bottom:1px solid var(--grid);vertical-align:middle}
.og62-dash td.l{color:var(--ink2);width:44%}
.og62-dash .st{display:inline-block;min-width:120px;padding:1px 8px;border-radius:3px;font-family:var(--mono);font-size:12px}
.og62-dash .ok{background:#2f8f46;color:#fff}.og62-dash .warn{background:#d9a21b;color:#111}.og62-dash .err{background:#c0392b;color:#fff}.og62-dash .info{background:var(--chip);color:var(--ink)}
.og62-dash .sec td{background:var(--panel2);font-weight:700;color:var(--ink);font-size:12px}
.og62-dash input[type=range]{width:60%;vertical-align:middle;accent-color:var(--accent2)}
.og62-dash select,.og62-dash button{font-size:12px;padding:2px 6px}
.og62-dash .ft{display:flex;gap:6px;padding:6px 8px;border-top:1px solid var(--line);background:var(--panel2)}
.og62-edge text,.og62-rear text{font-family:var(--sans)}
.og62-hot{cursor:pointer}.og62-hot:hover rect.hl,.og62-hot:hover circle.hl{stroke:var(--accent);stroke-width:3}
`;
    document.head.appendChild(st);
  }
  /* HTML inside SVG <text> breaks out of the SVG (HTML parser), so convert tags first */
  const svgT = x=> String(x==null?'':x).replace(/<span class="tag-inf"[^>]*>inferred<\/span>/g,'<tspan fill="var(--warn)" font-weight="700">inferred</tspan>').replace(/<(?!\/?tspan)[^>]+>/g,'');
  const LEDC = {g:'#5dff5a', r:'#ff4a3d', y:'#ffd23a', a:'#ffb43a', b:'#59b6ff', w:'#f4f4ea'};

  /* Card edge, drawn as in D6204-card-edge.pdf: the PCB edge runs top to bottom, the parts that poke
     through the front of the frame sit on its right, and the ejector carries the product name.
     Scale: 3.025" card height (D6201A/D6204A manual specifications) = 500 units. */
  function edgeSVG(o){
    const H=600, ex=150;
    let s=`<svg class="og62-edge" viewBox="0 0 420 ${H}" style="width:100%;max-width:${o.maxw||300}px;display:block;margin:auto" role="img" aria-label="${o.label} card edge">
      <defs><filter id="og62glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="0" y="0" width="420" height="${H}" rx="8" fill="var(--dev)"/>
      <rect x="${ex}" y="14" width="22" height="500" fill="#2f6b3c" stroke="#1a3d22"/>
      <rect x="${ex+3}" y="14" width="3" height="500" fill="#c9a94a" opacity=".55"/>
      <text x="${ex+11}" y="10" font-size="9" fill="#8a8f93" text-anchor="middle">PCB edge</text>`;
    (o.leds||[]).forEach(l=>{
      const y=l.y, on=!!l.on, col=LEDC[l.c]||l.c;
      s+=`<g ${l.id?`class="og62-hot" data-led="${l.id}"`:''}><title>${l.name}: ${l.title||''} (${on?'lit':'off'})</title>
        <rect x="${ex+22}" y="${y-9}" width="14" height="18" rx="2" fill="#d8d8d0" stroke="#777"/>
        <rect x="${ex+25}" y="${y-6}" width="9" height="12" rx="2" fill="${on?col:'#3a3f3a'}" ${on?'filter="url(#og62glow)"':''}/>
        <line x1="${ex-6}" y1="${y}" x2="${ex-58}" y2="${y}" stroke="#7d8286" stroke-width="1"/>
        <text x="${ex-62}" y="${y+4}" font-size="12.5" text-anchor="end" fill="#e6e8e9">${l.name}</text></g>`;
    });
    (o.sws||[]).forEach(w=>{
      const y=w.y;
      s+=`<g class="og62-hot" data-sw="${w.id}"><title>${w.name}: ${w.title||'click to operate'}</title>
        <rect class="hl" x="${ex+22}" y="${y-22}" width="40" height="44" rx="3" fill="#4a4c4f" stroke="#222"/>
        <rect class="hl" x="${ex+62}" y="${y-8+(w.down?2:0)}" width="${w.down?9:15}" height="16" rx="2" fill="#d6d6d0" stroke="#666"/>
        ${w.pos!=null?`<text x="${ex+42}" y="${y+4}" font-size="11" text-anchor="middle" fill="#fff" font-family="var(--mono)">${w.pos}</text>`:''}
        <line x1="${ex+82}" y1="${y}" x2="${ex+118}" y2="${y}" stroke="#7d8286"/>
        <text x="${ex+122}" y="${y+4}" font-size="12.5" fill="#e6e8e9">${w.name}</text>${w.state?`<text x="${ex+122}" y="${y+19}" font-size="10.5" fill="#b7d98a" font-family="var(--mono)">${w.state}</text>`:''}</g>`;
    });
    (o.extra||[]).forEach(x=>{ s+=x; });
    s+=`<rect x="${ex-6}" y="514" width="34" height="18" fill="#e9e9e2" stroke="#666"/>
      <rect x="${ex-6}" y="532" width="34" height="60" fill="#f6f6f1" stroke="#666"/>
      <text transform="translate(${ex+17} 588) rotate(-90)" font-size="15" font-weight="700" fill="#111">${o.label}</text>
      ${o.note?`<text x="10" y="${H-10}" font-size="10" fill="#8a8f93">${o.note}</text>`:''}
    </svg>`;
    return s;
  }

  /* Rear module, drawn like the openGear Rear Module Guides: positions 1–10 in a 2 × 5 grid,
     odd numbers on the left. cells: {n, label, kind:'bnc'|'tb'|'nc', id, conn, live} */
  function rearSVG(o){
    const cols=o.cols||2, rows=o.rows||5, cw=150, rh=86, W=cols*cw+40, H=rows*rh+90;
    let s=`<svg class="og62-rear" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${o.maxw||(cols>2?520:280)}px;display:block;margin:auto" role="img" aria-label="${o.name} rear module">
      <rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="#c8cbcd" stroke="#8b9093"/>
      <text x="${W/2}" y="24" text-anchor="middle" font-size="15" font-weight="700" fill="#16191b">${o.name}</text>
      ${o.sub?`<text x="${W/2}" y="40" text-anchor="middle" font-size="10.5" fill="#3d4245">${o.sub}</text>`:''}`;
    if (o.split) s+=`<line x1="${W/2}" y1="46" x2="${W/2}" y2="${H-30}" stroke="#7d8286" stroke-dasharray="4 4"/>${o.split.map((t,i)=>`<text x="${i?W*0.75:W*0.25}" y="${H-12}" text-anchor="middle" font-size="11" font-weight="700" fill="#16191b">${t}</text>`).join('')}`;
    (o.cells||[]).forEach(c=>{
      const i=c.n-1, col=i%cols, row=Math.floor(i/cols), cx=20+col*cw+cw/2, cy=56+row*rh+rh/2-6;
      let g='';
      if (c.kind==='tb'){
        g=`<rect class="hl" x="${cx-42}" y="${cy-20}" width="84" height="40" rx="3" fill="#1f8a45" stroke="#0e4d25" stroke-width="2"/>${[-26,0,26].map(d=>`<circle cx="${cx+d}" cy="${cy}" r="8" fill="#0d3a1c"/><line x1="${cx+d-5}" y1="${cy}" x2="${cx+d+5}" y2="${cy}" stroke="#7fbf8f" stroke-width="2"/>`).join('')}
           <text x="${cx}" y="${cy+32}" text-anchor="middle" font-size="9.5" fill="#16191b">+ &nbsp; − &nbsp; G</text>`;
        if (c.conn) g+=`<rect x="${cx-46}" y="${cy-28}" width="92" height="12" rx="3" fill="#2b5f9e"/>`;
      } else if (c.kind==='nc'){
        g=`<circle cx="${cx}" cy="${cy}" r="24" fill="#b4b7b9" stroke="#8b9093" stroke-dasharray="3 3"/>`;
      } else {
        g=`<circle class="hl" cx="${cx}" cy="${cy}" r="27" fill="#a98d3a" stroke="#5e4d1c" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="17" fill="#e0cb84"/><circle cx="${cx}" cy="${cy}" r="6" fill="#7a5f12"/>`;
        if (c.conn) g+=`<rect x="${cx-12}" y="${cy-4}" width="24" height="${rh/2}" fill="#2b5f9e" opacity=".9"/><rect x="${cx-20}" y="${cy-14}" width="40" height="22" rx="6" fill="#3a74b8"/>`;
      }
      const live = c.live===undefined? '' : `<circle cx="${cx+34}" cy="${cy-24}" r="6" fill="${c.live===true?'#2f8f46':c.live==='warn'?'#d9a21b':c.live==='err'?'#c0392b':'#7d8286'}"/>`;
      s+=`<g ${c.id?`class="og62-hot" data-jack="${c.id}"`:''}><title>${c.n}: ${c.label}${c.title?' — '+c.title:''}${c.id?(c.conn?' (click to unplug)':' (click to plug in)'):''}</title>
        ${g}${live}
        <text x="${cx-cw/2+8}" y="${cy-30}" font-size="10" fill="#4a4f52">${c.n}</text>
        <text x="${cx}" y="${cy+(c.kind==='tb'?46:44)}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#16191b">${c.label}</text></g>`;
    });
    if (o.id) s+=`<text x="10" y="${H-(o.split?28:12)}" font-size="9.5" fill="#3d4245">${o.id}</text>`;
    return s+'</svg>';
  }

  /* openGear frame (DFR-8310 10 slots / DFR-8320 or MF6220 20 slots), front view. */
  function frameSVG(o){
    const n=o.slots||20, W=880, sw=(W-40)/n;
    let s=`<svg viewBox="0 0 ${W} 150" style="width:100%;display:block" role="img" aria-label="openGear frame">
      <rect x="0" y="0" width="${W}" height="150" rx="6" fill="var(--dev)"/>
      <text x="12" y="16" font-size="11" fill="#aeb3b6">${o.title||'DFR-8320 frame, front (door removed) — slot 1 is on the left'}</text>`;
    for (let i=1;i<=n;i++){ const x=20+(i-1)*sw, me=(o.cardSlots||[]).includes(i), cov=(o.cover||[]).includes(i);
      s+=`<g class="og62-hot" data-slot="${i}"><title>Slot ${i}${me?': '+o.label:''}</title><rect class="hl" x="${x+2}" y="26" width="${sw-4}" height="100" rx="2" fill="${me?'#2f6b3c':cov?'#3b4146':'#202427'}" stroke="#4a4f52"/>
        ${me?`<rect x="${x+sw/2-3}" y="36" width="6" height="7" fill="${o.ledOn?'#5dff5a':'#3a3f3a'}"/><text transform="translate(${x+sw/2+4} 120) rotate(-90)" font-size="10" fill="#fff">${o.label}</text>`:''}
        <text x="${x+sw/2}" y="142" text-anchor="middle" font-size="9.5" fill="#aeb3b6">${i}</text></g>`; }
    return s+'</svg>';
  }

  /* DashBoard 2.x-style card window. tabs: [{name, rows:[...]}]. Row types: sec, text, status, combo,
     slider, toggle, button. */
  const dashTab = {};
  function dashHTML(o){
    const k=o.key||'d', ti=Math.min(dashTab[k]||0, o.tabs.length-1), tab=o.tabs[ti];
    const row = r=>{
      if (r.type==='sec') return `<tr class="sec"><td colspan="2">${r.label}</td></tr>`;
      let w='';
      if (r.type==='status') w=`<span class="st ${r.level||'info'}">${r.value}</span>`;
      else if (r.type==='text') w=`<span class="mono">${r.value}</span>`;
      else if (r.type==='combo') w=`<select data-dash="${r.id}" ${r.ro?'disabled':''}>${r.options.map(([v,l])=>`<option value="${v}" ${String(v)===String(r.value)?'selected':''}>${l}</option>`).join('')}</select>`;
      else if (r.type==='slider') w=`<input type="range" data-dash="${r.id}" min="${r.min}" max="${r.max}" step="${r.step||1}" value="${r.value}"> <span class="mono">${(+r.value).toFixed(r.dp||0)} ${r.unit||''}</span>`;
      else if (r.type==='toggle') w=`<label><input type="checkbox" data-dash="${r.id}" ${r.value?'checked':''}> ${r.value?(r.on||'On'):(r.off||'Off')}</label>`;
      else if (r.type==='button') w=`<button data-dash="${r.id}" data-v="1">${r.text||r.label}</button>`;
      return `<tr><td class="l" ${r.oid?`title="OID ${r.oid}"`:''}>${r.label}${r.oid?` <span class="muted mono" style="font-size:10px">${r.oid}</span>`:''}</td><td>${w}</td></tr>`;
    };
    return `<div class="og62-dash" data-dkey="${k}">
      <div class="tb"><span class="dot" style="background:${o.alarm?'#c0392b':'#2f8f46'}"></span>${o.title}<span class="sp"></span><span class="muted small" style="font-weight:400">${o.sub||'DashBoard 2.x (redrawn)'}</span></div>
      <div class="bd"><div class="tree">${(o.tree||[]).map(t=>`<div class="${t.sel?'sel':''}" style="padding-left:${4+(t.lvl||0)*10}px">${t.name}</div>`).join('')}</div>
      <div><div class="tabs">${o.tabs.map((t,i)=>`<button class="${i===ti?'on':''}" data-dtab="${i}">${t.name}</button>`).join('')}</div>
      <table>${tab.rows.map(row).join('')}</table>${tab.note?`<div class="small muted" style="padding:6px 8px">${tab.note}</div>`:''}</div></div>
      <div class="ft">${(o.footer||[]).map(b=>`<button data-dash="${b.id}" data-v="1">${b.text}</button>`).join('')}<span class="small muted" style="align-self:center">${o.foot||''}</span></div></div>`;
  }

  /* Bind every interactive part inside root. h = {sw:{id:fn}, jack:{id:fn}, led:{id:fn}, slot:fn(n), dash:fn(id,value)} */
  function bind(root, h){
    root.querySelectorAll('[data-sw]').forEach(g=>g.addEventListener('click',()=>{ const f=h.sw&&h.sw[g.dataset.sw]; f&&f(); }));
    root.querySelectorAll('[data-jack]').forEach(g=>g.addEventListener('click',()=>{ const f=h.jack&&h.jack[g.dataset.jack]; f&&f(); }));
    root.querySelectorAll('[data-led]').forEach(g=>g.addEventListener('click',()=>{ const f=h.led&&h.led[g.dataset.led]; f&&f(); }));
    root.querySelectorAll('[data-slot]').forEach(g=>g.addEventListener('click',()=>{ h.slot&&h.slot(+g.dataset.slot); }));
    root.querySelectorAll('[data-dtab]').forEach(b=>b.addEventListener('click',()=>{ const k=b.closest('.og62-dash').dataset.dkey; dashTab[k]=+b.dataset.dtab; SIM.refresh(); }));
    root.querySelectorAll('[data-dash]').forEach(el=>{
      const fire=()=>{ if(!h.dash) return; let v = el.type==='checkbox'? el.checked : el.dataset.v? true : el.value; if (el.type==='range') v=+v; h.dash(el.dataset.dash, v); };
      if (el.tagName==='BUTTON') el.addEventListener('click', fire); else el.addEventListener('change', fire);
    });
  }

  /* Action logger: every user action records the firmware path it takes. */
  function actor(D){
    return function act(name, fn){
      const tr=[]; try{ fn(s=>tr.push(s)); }catch(e){ tr.push('error: '+e.message); }
      D.log.unshift({t:SIM.t, name, trace:tr}); if (D.log.length>60) D.log.length=60;
      if (D.canQ) D.canQ.push(SIM.t);
      SIM.refresh();
    };
  }
  const traceHTML = D=> D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">@ ${SIM.fmtT(D.log[0].t)}</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press a card-edge switch, change a DashBoard parameter or plug a rear connector. The code path appears here.</div>';
  const logHTML = D=> D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';

  /* openGear CAN bus. candrv.c: CANBT1 BRP=0, CANBT2 PRS=2, CANBT3 PHS1=1 PHS2=1 at 8 MHz → 1+3+2+2 = 8 TQ of
     125 ns = 1 µs per bit = 1 Mbit/s. clock.c: Timer0 CTC, clk/64, OCR0 = 124 → 1 ms GearOS tick. */
  const CAN_BIT = 1e-6, TICK = 1e-3;
  function canFrames(opts){   // opts: {poll, phase, q:[t...], extra:[{t,label,n}]}
    const out=[], poll=opts.poll||0.5, ph=opts.phase||0.0123;
    for (let t=ph; t<1; t+=poll){ out.push({t, n:1, dir:'rx', label:'MFC → card: OGP get (status OIDs)'}); out.push({t:t+0.0004, n:opts.reply||3, dir:'tx', label:'card → MFC: OGP reply'}); }
    (opts.q||[]).forEach(t=>{ out.push({t, n:1, dir:'rx', label:'MFC → card: OGP set'}); out.push({t:t+0.0003, n:2, dir:'tx', label:'card → MFC: ack + new value'}); });
    (opts.extra||[]).forEach(e=>out.push(e));
    return out.sort((a,b)=>a.t-b.t);
  }
  const FRAME_BITS = 131;   // 29-bit-ID CAN frame with 8 data bytes, before stuffing (inferred: OGP uses extended IDs)
  function canLane(frames, label){
    return {label: label||'CAN bus 1 Mbit/s (OGP via MFC-8310)', h:30, draw(c,X,t0,t1,y,h){
      const a2=SIM.css('--accent2'), ac=SIM.css('--accent'); let n=0;
      frames.forEach(f=>{ for (let k=0;k<f.n;k++){ const a=f.t+k*FRAME_BITS*CAN_BIT*1.05, b=a+FRAME_BITS*CAN_BIT; if (b<t0||a>t1) continue; n++;
        c.fillStyle=f.dir==='rx'?a2:ac; c.fillRect(X(a), y+5, Math.max(2,X(b)-X(a)), h-10);
        if (X(b)-X(a)>120){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(f.label, X(a)+3, y+h/2+3); } } });
      if (X(t0+0.001)-X(t0) < 0.05 && n){ c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(n+' CAN frames in view (blue = from frame controller, green = from card)', X(t0)+6, y+h-4); }
    }};
  }
  function tickLane(){ return {label:'GearOS tick (Timer0, 1 ms)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,TICK,0,TICK*0.08,SIM.css('--ink2'),'Timer0 compare IRQ'); }}; }
  function boolLane(label, fn, col){ return {label, h:20, draw(c,X,t0,t1,y,h){ const N=Math.min(800,Math.max(80,(X(t1)-X(t0))/2)), sp=t1-t0; c.fillStyle=col||SIM.css('--accent');
      for(let i=0;i<N;i++){ const tt=t0+sp*(i+.5)/N; if (fn(tt)) c.fillRect(X(t0+sp*i/N), y+4, (X(t1)-X(t0))/N+0.6, h-8); } }}; }
  function waveLane(label, fn, opts){ opts=opts||{}; return {label, h:opts.h||36, draw(c,X,t0,t1,y,h){ const pw=X(t1)-X(t0), N=Math.min(1600,Math.max(200,pw*2)), sp=t1-t0;
      (opts.cols||[SIM.css('--accent'),SIM.css('--bad')]).slice(0,opts.n||1).forEach((col,k)=>{ c.strokeStyle=col; c.lineWidth=1; c.beginPath();
        for(let i=0;i<=N;i++){ const tt=t0+sp*i/N; const v=Math.max(-1,Math.min(1,fn(tt,k))); const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); });
      c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke(); }}; }

  /* AES3 biphase-mark helpers (from pod33.js) */
  function aesSub(v, pre, frameInBlock, cs0){
    let s=Math.round(Math.max(-1,Math.min(1,v))*8388607); if (s<0) s+=1<<24;
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
    bits[30] = frameInBlock<8 ? ((cs0||0x85)>>frameInBlock)&1 : 0;
    let p=0; for (let b=4;b<31;b++) p^=bits[b]; bits[31]=p; return {pre, bits, raw:s, v};
  }
  function biphase(pre, bits, start){
    const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=[]; const inv=start?0:1;
    P.forEach(b=>lv.push(inv?1-b:b)); let cur=lv[lv.length-1];
    for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv;
  }
  /* Draw one AES3 frame: o = {fs, a, b, n} (a, b = samples −1..1, n = frame number) */
  function drawAES(cv, o){
    const fr=o.n%192, A=aesSub(o.a, fr===0?'Z':'X', fr, o.cs0), B=aesSub(o.b,'Y',fr,o.cs0);
    const lvA=biphase(A.pre,A.bits,0), lvB=biphase('Y',B.bits,lvA[lvA.length-1]), lv=lvA.concat(lvB);
    const {c,w}=SIM.canvas(cv, 140); const cw=(w-20)/lv.length;
    const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
    [[0,8,SIM.css('--warn'),'pre'],[8,16,ink2,'aux'],[16,56,SIM.css('--accent'),'audio'],[56,64,SIM.css('--accent2'),'VUCP']].forEach(([a,b,col,lb])=>[0,64].forEach(off=>{ c.fillStyle=col; c.globalAlpha=.13; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,64); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if((b-a)*cw>24) c.fillText(lb,12+(off+a)*cw,98); }));
    c.strokeStyle=o.dead?SIM.css('--ink2'):ink; c.lineWidth=1.5; c.beginPath();
    lv.forEach((v,i)=>{ const x=10+i*cw, yy=o.dead?52:(v?28:76); i?c.lineTo(x,yy):c.moveTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
    c.fillStyle=ink; c.font='11px '+SIM.css('--mono');
    c.fillText(o.dead?'no signal (output muted / input missing)':`Subframe A (${A.pre})`,12,14); if(!o.dead) c.fillText('Subframe B (Y)',12+64*cw,14);
    c.fillText(`frame ${o.n.toLocaleString()} · ${fr}/191 of block · bit cell ${SIM.fmtDur(1/(o.fs*128))} · frame ${SIM.fmtDur(1/o.fs)}`,10,124);
    return {A,B};
  }

  /* Views shared by every card plugin */
  function blockView(m, o){   // o: {blocks, wires, w, h, sel, side}
    let sel=o.sel||Object.keys(o.blocks)[0];
    m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${o.side||''}</div></div>`;
    const draw=()=>{
      const B=o.blocks, ctr=b=>[b.x+b.w/2,b.y+b.h/2];
      let s=`<svg viewBox="0 0 ${o.w||720} ${o.h||470}" style="width:100%"><defs><marker id="og62ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
      o.wires.forEach(([a,b,l])=>{ const A_=B[a],B_=B[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
        const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
        [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
        s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#og62ar)"/>`;
        if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
      for (const k in B){ const b=B[k];
        s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${b.dim?'var(--bg)':'var(--panel2)'}" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}" ${b.dim?'stroke-dasharray="5 4"':''}/>
          <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>
          ${(b.s||[]).map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="11" fill="var(--ink2)">${svgT(l)}</text>`).join('')}</g>`; }
      m.querySelector('#bd').innerHTML=s+'</svg>';
      m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
      const b=B[sel]; m.querySelector('#bdinfo').innerHTML=`<h3 style="margin-top:0">${b.t}</h3><p>${b.d}</p>${b.src?`<p class="small muted mono">${b.src}</p>`:''}`;
    };
    draw();
  }
  function chip(x,y,w,name,left,right,sub){
    const n=Math.max(left.length,right.length), h=26+n*18;
    let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
      <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
    left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
    right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
    return s;
  }
  function schemView(m, o){  // o: {sheets:[{name, note, svg()}], title, foot, product, h}
    let i=0;
    m.innerHTML = card(o.title||'Schematic set (redrawn from source net names, not the original CAD)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">${o.foot||''}</p>`);
    const draw=()=>{
      m.querySelector('#tabs2').innerHTML=o.sheets.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
      m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
      const H=o.sheets[i].h||o.h||470;
      m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 ${H}" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
        <rect x="6" y="6" width="848" height="${H-12}" fill="none" stroke="var(--line)"/><text x="840" y="${H-15}" text-anchor="end" font-size="10" fill="var(--ink2)">${o.product} · sheet ${i+1}/${o.sheets.length} · REDRAWN 2026|59 — not the original CAD</text>${o.sheets[i].svg()}</svg>`;
      m.querySelector('#shn').innerHTML=o.sheets[i].note;
    };
    draw();
  }
  function tutorialView(m, o){  // o: {L:[{title, body, check, hint, auto}], st:{i}, side(), bindSide(root), reset()}
    m.innerHTML = `<div class="grid2"><div>${card(o.title||'Tutorial', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
      <div><div id="side"></div>${card('What the card did', `<div id="trace" class="log"></div>`)}</div></div>`;
    const draw=()=>{
      m.querySelector('#side').innerHTML=o.side(); o.bindSide(m.querySelector('#side'));
      m.querySelector('#trace').innerHTML=traceHTML(o.D);
      const L=o.L; m.querySelector('#lessons').innerHTML=L.map((l,i)=>`<li style="cursor:pointer;${i===o.st.i?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<o.st.i?' ✓':''}</li>`).join('');
      m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ o.st.i=+li.dataset.i; draw(); });
      const l=L[o.st.i], ok=l.check();
      m.querySelector('#lesson').innerHTML=`<h2>${l.title}</h2>${l.body}
        <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(l.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(l.hint||'')+'</span>'}</div>
        <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${o.st.i?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${o.st.i<L.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
      m.querySelector('#prv').onclick=()=>{ o.st.i=Math.max(0,o.st.i-1); draw(); };
      m.querySelector('#nxt').onclick=()=>{ o.st.i=Math.min(L.length-1,o.st.i+1); draw(); };
      m.querySelector('#rs').onclick=()=>{ o.reset(); o.st.i=0; draw(); };
    };
    SIM.on('time', draw);
  }
  /* Signal-path ladder: stages [{name, gain (dB) or fn, note}] → level table and bar chart */
  function levelSVG(stages, o){
    o=o||{}; const W=820, rowH=30, H=stages.length*rowH+40, lo=o.lo??-40, hi=o.hi??30, x0=290, pw=W-x0-150, X=v=>x0+(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*pw;
    let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%">`;
    for (let v=Math.ceil(lo/10)*10; v<=hi; v+=10) s+=`<line x1="${X(v)}" y1="14" x2="${X(v)}" y2="${H-8}" stroke="var(--grid)"/><text x="${X(v)}" y="11" font-size="10" text-anchor="middle" fill="var(--ink2)">${v}</text>`;
    if (o.clip!=null) s+=`<line x1="${X(o.clip)}" y1="14" x2="${X(o.clip)}" y2="${H-8}" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="${X(o.clip)+3}" y="${H-10}" font-size="10" fill="var(--bad)">${o.clipLabel||'clip'}</text>`;
    stages.forEach((st,i)=>{ const y=20+i*rowH, v=st.level; const bad=o.clip!=null && v>o.clip;
      s+=`<text x="6" y="${y+16}" font-size="11.5" fill="var(--ink)">${svgT(st.name)}</text><text x="${x0-8}" y="${y+16}" font-size="11" text-anchor="end" fill="var(--ink2)" font-family="var(--mono)">${st.unitTxt|| (v==null?'—':v.toFixed(1)+' '+(o.unit||'dBu'))}</text>
        ${v==null?'':`<rect x="${X(lo)}" y="${y+5}" width="${Math.max(1,X(v)-X(lo))}" height="16" rx="3" fill="${bad?'var(--bad)':st.col||'var(--accent)'}" opacity=".8"/>`}
        ${st.note?`<text x="${X(hi)+6}" y="${y+16}" font-size="10" fill="var(--ink2)">${svgT(st.note)}</text>`:''}`; });
    return s+'</svg>';
  }
  return {svgT, inf, card, edgeSVG, rearSVG, frameSVG, dashHTML, bind, actor, traceHTML, logHTML, canFrames, canLane, tickLane, boolLane, waveLane, drawAES, aesSub, biphase, blockView, chip, schemView, tutorialView, levelSVG, CAN_BIT, TICK, FRAME_BITS, LEDC};
})();
/* ---------------- end og62 kit ---------------- */
/* ---------------- og8 helpers: SDI timing lanes, PCB (Gerber) and pick-and-place board views,
   test-outline checklists, live flow diagrams and the Findings page. Copied into each of the
   M6201/M6202A/M6202AE/M6203A/M6204A/M6205C/M6206A/D6208A plugins so none depends on another file. -------- */
const H8 = (()=>{
  const inf = K.inf, card = K.card;
  /* SMPTE video formats: total lines per frame and frame rate. Line rate = lines × frame rate. */
  const F = {};
  const add=(n,kind,lines,fps,il,rate)=>{ F[n]={name:n,kind,lines,fps,il,rate}; };
  add('SD 525/59.94','SD',525,30000/1001,true,270e6); add('SD 625/50','SD',625,25,true,270e6);
  add('HD 1080i/59.94','HD',1125,30000/1001,true,1.485e9/1.001); add('HD 1080i/50','HD',1125,25,true,1.485e9); add('HD 1080i/60','HD',1125,30,true,1.485e9);
  add('HD 720p/59.94','HD',750,60000/1001,false,1.485e9/1.001); add('HD 720p/60','HD',750,60,false,1.485e9); add('HD 720p/50','HD',750,50,false,1.485e9);
  add('HD 720p/23.98','HD',750,24000/1001,false,1.485e9/1.001); add('HD 720p/24','HD',750,24,false,1.485e9); add('HD 720p/25','HD',750,25,false,1.485e9); add('HD 720p/29.97','HD',750,30000/1001,false,1.485e9/1.001); add('HD 720p/30','HD',750,30,false,1.485e9);
  add('HD 1080p/23.98','HD',1125,24000/1001,false,1.485e9/1.001); add('HD 1080p/24','HD',1125,24,false,1.485e9); add('HD 1080p/25','HD',1125,25,false,1.485e9); add('HD 1080p/29.97','HD',1125,30000/1001,false,1.485e9/1.001); add('HD 1080p/30','HD',1125,30,false,1.485e9);
  add('3G 1080p/59.94','3G',1125,60000/1001,false,2.97e9/1.001); add('3G 1080p/50','3G',1125,50,false,2.97e9); add('3G 1080p/60','3G',1125,60,false,2.97e9);
  const lineRate = f => f.lines*f.fps;
  const spf = (f,fs) => (fs||48000)/f.fps;    // audio samples per video frame (1601.6 at 29.97)
  /* lanes */
  function frameLane(f, dead){ return {label:`Video frames${f.il?' / fields':''} (${f.name})`, h:24, draw(c,X,t0,t1,y,h){ if(dead){ c.fillStyle=SIM.css('--bad'); c.font='11px sans-serif'; c.fillText('no SDI lock',X(t0)+6,y+h/2+4); return; }
      if (f.il) SIM.pulses(c,X,t0,t1,y,h,1/(2*f.fps),0,0.0004,SIM.css('--accent2'),'fields'); SIM.pulses(c,X,t0,t1,y,h,1/f.fps,0,0.0012,SIM.css('--accent'),'frames'); }}; }
  function lineLane(f, dead){ const lr=lineRate(f); return {label:`Video lines (${(lr/1000).toFixed(3)} kHz, ${f.lines}/frame)`, h:22, draw(c,X,t0,t1,y,h){ if(dead) return; SIM.pulses(c,X,t0,t1,y,h,1/lr,0,0.12/lr,SIM.css('--ink2'),'H (line) — HANC audio packets ride here'); }}; }
  function audioLane(label, fs, on, col){ return {label, h:20, draw(c,X,t0,t1,y,h){ if(!on){ c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText('silent / muted',X(t0)+6,y+h/2+3); return; } SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.35/fs,col||SIM.css('--accent'),fs/1000+' kHz samples'); }}; }
  function hancLane(f, groups, dead){ const lr=lineRate(f), per=48000/lr; return {label:`HANC audio packets (${groups} group${groups===1?'':'s'}, ≈${per.toFixed(2)} samples/line)`, h:22, draw(c,X,t0,t1,y,h){ if(dead||!groups) return;
      const pxL=(X(t0+1/lr)-X(t0)); if (pxL<2){ c.fillStyle=SIM.css('--warn'); c.globalAlpha=.5; c.fillRect(X(t0),y+5,X(t1)-X(t0),h-10); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(`${Math.round(lr*(t1-t0)).toLocaleString()} lines in view, each carrying ${groups} audio packet(s)`,X(t0)+6,y+h/2+3); return; }
      const n0=Math.floor(t0*lr), n1=Math.ceil(t1*lr); for(let n=n0;n<=n1;n++){ const ta=n/lr+0.02/lr; for(let g=0;g<groups;g++){ c.fillStyle=['#2f8f46','#0d5c8c','#b5651d','#7a3ea8'][g]; c.fillRect(X(ta+g*0.025/lr),y+4,Math.max(1,X(ta+(g+1)*0.025/lr)-X(ta+g*0.025/lr)-0.5),h-8); } } }}; }
  function loopLane(label, period, col){ return {label, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,period,0,period*0.85,col||SIM.css('--accent2'),'passes'); }}; }
  /* Live flow diagram: list of steps, the running one highlighted. */
  function flowSVG(steps, k, warn){ return `<svg viewBox="0 0 560 ${steps.length*36+16}" style="width:100%">${steps.map((s,j)=>`<rect x="8" y="${8+j*36}" width="544" height="28" rx="6" fill="${j===k?(warn?'var(--warn)':'var(--accent)'):'var(--panel2)'}" stroke="var(--line)"/><text x="18" y="${27+j*36}" font-size="11" font-family="var(--mono)" fill="${j===k?'#fff':'var(--ink)'}">${K.svgT(s)}</text>`).join('')}</svg>`; }
  /* PCB top view from a Gerber render (assets/<id>-pcb-top.png), with LEDs placed on the board. */
  function pcbSVG(o){ // o: {src, w, h, leds:[{x,y,on,c,name}], hot:[{x,y,w,h,id,label}], marks:[{x,y,label}], note}
    let s=`<svg viewBox="0 0 ${o.w} ${o.h+26}" style="width:100%;display:block;background:var(--dev);border-radius:6px" role="img" aria-label="board">
      <defs><filter id="h8glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <image href="${o.src}" x="0" y="0" width="${o.w}" height="${o.h}"/>`;
    (o.hot||[]).forEach(z=>{ s+=`<g class="og62-hot" data-pcb="${z.id}"><title>${z.label}</title><rect class="hl" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="rgba(255,255,255,0.04)" stroke="${z.sel?'var(--accent)':'rgba(255,255,255,.35)'}" stroke-width="${z.sel?3:1}" stroke-dasharray="${z.sel?'':'4 3'}"/></g>`; });
    (o.leds||[]).forEach(l=>{ const col=K.LEDC[l.c]||l.c; s+=`<g><title>${l.name} (${l.on?'lit':'off'})</title><rect x="${l.x-6}" y="${l.y-4}" width="12" height="8" rx="2" fill="${l.on?col:'#3a3f3a'}" ${l.on?'filter="url(#h8glow)"':''}/></g>`; });
    (o.marks||[]).forEach(mk=>{ s+=`<text x="${mk.x}" y="${mk.y}" font-size="11" fill="#fff" stroke="#000" stroke-width="2.4" paint-order="stroke">${K.svgT(mk.label)}</text>`; });
    return s+`<text x="6" y="${o.h+17}" font-size="11" fill="#aeb3b6">${K.svgT(o.note||'')}</text></svg>`;
  }
  /* Board drawn from a pick-and-place program (.prg): every placed part at its X/Y, sized by package. */
  function pkg(d,v){ v=v||''; d=d||'';
    if (/EP2C35/.test(v)) return [0.9,0.9]; if (/EP1C12|EP1C6/.test(v)) return [1.25,1.25]; if (/ADSP-2126/.test(v)) return [0.95,0.95];
    if (/AT90CAN/.test(v)) return [0.55,0.55]; if (/GS15(59|31)|GS29/.test(v)) return [0.4,0.4]; if (/CS8416|AD1895/.test(d+v)) return [0.38,0.22]; if (/PLL1705|ICS662|GO1525|GS1574/.test(v)) return [0.25,0.25];
    if (/DIPSW|SW8|SW1/.test(v+d)) return [0.65,0.3]; if (/^U/.test(d)) return [0.22,0.18]; if (/^LED/.test(d)) return [0.07,0.05]; if (/LM1117|TPS7/.test(v)) return [0.26,0.26]; if (/^(L|FB|F)\d/.test(d)) return [0.12,0.1];
    if (/68\/10|100\/25|10\/10|4\.7\/10/.test(v)) return [0.2,0.16]; if (/^Q|^D/.test(d)) return [0.1,0.08]; return [0.07,0.04]; }
  function pnpSVG(o){ // o: {parts:[[des,val,fdr,rot,x,y]], x0,x1,y0,y1, sel, ledOn:fn(des)->col|null, note, mirror}
    const S=o.scale||70, W=(o.x1-o.x0)*S, Hh=(o.y1-o.y0)*S, PX=x=>(o.mirror?(o.x1-x):(x-o.x0))*S, PY=y=>(o.y1-y)*S;
    let s=`<svg viewBox="-10 -10 ${W+20} ${Hh+40}" style="width:100%;display:block;background:var(--dev);border-radius:6px" role="img" aria-label="pick-and-place map">
      <defs><filter id="h8glow2" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="0" y="0" width="${W}" height="${Hh}" rx="6" fill="#1d4f2f" stroke="#0e2a18"/>`;
    o.parts.forEach(p=>{ const [d,v,f,r,x,y]=p; let [w,h]=pkg(d,v); if (r===90||r===270){ const t=w; w=h; h=t; }
      const led=/^LED/.test(d), col=led&&o.ledOn?o.ledOn(d):null, ic=/^U/.test(d)||/^SW/.test(d), sel=o.sel===d;
      s+=`<g class="og62-hot" data-part="${d}"><title>${d} ${v} · feeder ${f} · ${r}° · X ${x} Y ${y} in</title><rect class="hl" x="${PX(x)-w*S/2}" y="${PY(y)-h*S/2}" width="${w*S}" height="${h*S}" rx="1.5"
        fill="${led?(col||'#3a3f3a'):ic?'#16181a':/^C/.test(d)?'#b98d4a':'#d9d2c4'}" stroke="${sel?'var(--accent)':ic?'#888':'none'}" stroke-width="${sel?3:1}" ${col?'filter="url(#h8glow2)"':''}/>
        ${ic&&w*S>26?`<text x="${PX(x)}" y="${PY(y)+4}" text-anchor="middle" font-size="${Math.min(12,w*S/6)}" fill="#e6e8e9">${d}</text>`:''}</g>`; });
    (o.labels||[]).forEach(l=>{ s+=`<text x="${PX(l.x)}" y="${PY(l.y)}" font-size="11" fill="#fff" stroke="#000" stroke-width="2.4" paint-order="stroke" text-anchor="${l.a||'start'}">${K.svgT(l.t)}</text>`; });
    return s+`<text x="0" y="${Hh+22}" font-size="11" fill="#aeb3b6">${K.svgT(o.note||'')}</text></svg>`;
  }
  /* Test outline (openGear comprehensive test outline) with the simulated card run against it. */
  function checklistHTML(sections, run){ // sections: [{h, items:[{t, mark, note, check}]}]; run: true to evaluate check()
    return sections.map(sec=>`<div style="margin-bottom:8px"><div style="font-weight:700;font-size:12.5px;border-bottom:1px solid var(--line)">${sec.h}</div><table class="kv" style="font-size:12px">${sec.items.map(it=>{ let r=''; if (run && it.check){ const v=it.check(); r=`<span class="mono" style="color:${v===true?'var(--accent)':v===false?'var(--bad)':'var(--warn)'}">${v===true?'PASS':v===false?'FAIL':v}</span>`; }
      return `<tr><td style="width:56%">${it.t}</td><td class="mono" style="width:14%">${it.mark==='y'?'☑ tested':it.mark==='na'?'☒ N/A':it.mark==='x'?'✗ failed':'☐'}</td><td style="width:30%">${it.note?`<span class="small" style="color:var(--accent2)">${it.note}</span> `:''}${r}</td></tr>`; }).join('')}</table></div>`).join('');
  }
  function findingsView(m, title, F_, A_, S_){ m.innerHTML=card(title, `<ol>${F_.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>`)+card('Assumptions (marked inferred on screen)', `<ul class="small">${A_.map(a=>`<li>${a}</li>`).join('')}</ul>`)+card('Sources (all in this archive)', `<ul class="small mono">${S_.map(s=>`<li>${s}</li>`).join('')}</ul>`); }
  const db = v => v<=-120?'−∞':(v>=0?'+':'−')+Math.abs(v).toFixed(1);
  return {F, lineRate, spf, frameLane, lineLane, audioLane, hancLane, loopLane, flowSVG, pcbSVG, pnpSVG, checklistHTML, findingsView, db, inf, card};
})();
/* ---------------- end og8 helpers ---------------- */
const inf=K.inf, card=K.card;
const SW='M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204A/';
/* M6204A-iss3-T.prg: designator, value, feeder, rotation, X, Y (inches) */
const PNP=[["U18","CS8416","28",0,4.987,-0.737],["U19","CS8416","28",0,5.447,-0.737],["U21","CS8416","28",0,5.906,-0.734],["U24","CS8416","28",0,6.366,-0.737],["U26","CS8416","28",180,6.013,-2.282],["U29","CS8416","28",180,6.47,-2.283],["U30","CS8416","28",180,5.555,-2.283],["U31","CS8416","28",180,5.09,-2.283],["U17","AD1895","28",180,4.966,-1.168],["U20","AD1895","28",180,5.442,-1.168],["U22","AD1895","28",180,5.918,-1.168],["U23","AD1895","28",180,6.389,-1.168],["U27","AD1895","28",180,5.989,-1.845],["U28","AD1895","28",180,6.444,-1.845],["U32","AD1895","28",180,5.529,-1.845],["U33","AD1895","28",180,5.064,-1.845],["R19","0R","603",90,9.875,-2.165],["C114","0.01","603",270,7.58,-1.177],["C118","0.01","603",270,8.595,-1.125],["C133","0.01","603",90,8.599,-2.0],["C134","0.01","603",90,7.58,-2.048],["C137","0.01","603",270,7.58,-1.57],["C7","0.1","603",180,10.755,-2.19],["C8","0.1","603",0,10.94,-2.19],["C38","0.1","603",0,9.797,-2.649],["C42","0.1","603",270,9.901,-2.254],["C73","0.1","603",90,9.508,-2.614],["C80","0.1","603",90,9.71,-2.614],["C108","0.1","603",0,9.901,-2.466],["C115","0.1","603",270,7.521,-1.177],["C117","0.1","603",90,8.662,-2.0],["C119","0.1","603",90,7.521,-2.048],["C135","0.1","603",270,7.517,-1.57],["C136","0.1","603",270,8.654,-1.125],["R4","1K","603",180,10.785,-2.46],["R5","1K","603",0,10.786,-2.521],["C1","1.0u","603",180,11.055,-2.29],["C2","1.0u","603",180,11.055,-2.36],["R3","37R5","603",90,11.085,-2.455],["R1","75R","603",0,11.175,-2.29],["R2","75R","603",90,11.075,-2.175],["R22","280","603",180,9.797,-2.589],["C69","2200p","603",270,9.875,-2.054],["L1","4n7","603",270,11.175,-2.355],["L3","4n7","603",0,9.521,-0.339],["L4","4n7","603",0,9.596,-0.339],["L9","4n7","603",0,10.155,-0.311],["L10","4n7","603",0,9.966,-0.315],["L11","4n7","603",180,10.887,-0.551],["L12","4n7","603",0,10.887,-0.815],["C45","1.0u","1206",90,0.435,-0.952],["R36","221","1206",90,1.253,-0.605],["FB3","BLM41P","1806",90,2.035,-1.285],["FB4","BLM41P","1806",270,0.23,-0.495],["U13","GS1531","0",90,9.584,-0.77],["U7","GS1559","0",180,9.607,-2.325],["C46","100/25","0",0,0.155,-0.985],["C99","100/25","0",0,0.445,-1.92],["C153","100/25","0",180,1.945,-1.885],["X4","CSX750V-24.576","0",90,8.469,-0.39],["C31","68/10","0",180,1.93,-0.992],["C32","68/10","0",180,1.735,-0.992],["C33","68/10","0",180,2.12,-0.992],["C34","68/10","0",180,1.54,-0.992],["C35","68/10","0",180,2.315,-0.992],["C100","68/10","0",180,1.445,-1.617],["C101","68/10","0",0,1.455,-2.128],["C102","68/10","0",0,1.26,-2.128],["C104","68/10","0",180,1.255,-1.617],["C149","68/10","0",0,2.955,-2.113],["C150","68/10","0",180,2.76,-1.597],["C151","68/10","0",180,2.955,-1.597],["C152","68/10","0",0,2.76,-2.113],["SW1","SW8-SMT","0",0,1.785,-0.225],["FB1","300","0",270,10.13,-1.958],["FB2","300","0",270,10.256,-1.958],["U3","EP2C35F-484","0",0,8.088,-1.588],["1","Value","0",0,7.632,-2.141],["2","Value","0",0,8.735,-1.051],["3","Value","0",0,9.124,-0.411],["4","Value","0",0,9.839,-1.054],["5","Value","0",0,9.39,-1.974],["6","Value","0",0,9.899,-2.567],["7","Value","0",0,-0.13,-0.06],["8","Value","0",0,11.052,-2.723],["U9","GO1525","0",90,9.666,-1.86],["U14","GO1525","0",0,9.162,-0.651],["H3","H2X4SM","0",0,8.297,-2.524],["H11","HLE-SAMT-2X5","0",0,7.229,-2.537],["JTAG1","HLE-SAMT-2X5","0",0,3.833,-2.452],["JTAG2","HLE-SAMT-2X5","0",0,7.78,-2.537],["C5","4.7/10","0",90,10.636,-2.28],["C6","4.7/10","0",90,10.636,-2.375],["C178","4.7/10","0",270,11.038,-0.795],["C179","4.7/10","0",270,11.04,-0.529],["C13","10/10","0",270,8.449,-0.184],["C16","10/10","0",90,9.939,-0.801],["C17","10/10","0",90,9.939,-0.584],["C22","10/10","0",0,10.177,-2.608],["C59","10/10","0",270,7.904,-0.585],["C66","10/10","0",270,10.193,-2.072],["C77","10/10","0",270,10.193,-1.843],["C157","10/10","0",0,9.544,-1.541],["LED2","GRN","0",180,-0.625,-1.49],["LED3","GRN","0",180,-0.625,-1.39],["LED4","GRN","0",180,-0.625,-1.29],["LED8","GRN","0",180,-0.625,-2.45],["LED9","GRN","0",180,-0.625,-2.35],["LED11","GRN","0",180,-0.625,-2.069],["LED12","GRN","0",180,-0.625,-1.97],["LED13","GRN","0",180,-0.625,-1.87],["LED14","GRN","0",180,-0.625,-1.77],["LED15","GRN","0",180,-0.625,-1.59],["LED10","RED","0",180,-0.63,-2.25],["LED7","YEL","0",180,-0.555,-0.91],["U6","PLL1705","0",90,9.25,-1.444],["U1","GS1574A","0",180,10.872,-2.323],["R11","0R","0",90,9.416,-0.427],["R14","0R","0",90,10.369,-2.65],["R15","0R","0",90,10.369,-2.58],["R29","0R","0",90,8.859,-0.566],["C55","0.01","0",0,9.86,-0.928],["C145","0.01","0",270,9.554,-0.494],["C163","0.01","0",270,9.554,-0.246],["C166","0.01","0",270,10.058,-0.474],["C167","0.01","0",270,10.058,-0.407],["C169","0.01","0",270,10.058,-0.273],["C171","0.01","0",90,9.728,-0.425],["C29","0.1","0",90,10.633,-1.49],["C49","0.1","0",270,10.863,-0.265],["C50","0.1","0",90,3.555,-1.425],["C54","0.1","0",0,9.93,-0.928],["C56","0.1","0",270,7.884,-0.665],["C61","0.1","0",90,3.651,-2.241],["C71","0.1","0",90,9.912,-1.838],["C84","0.1","0",0,3.45,-2.243],["C144","0.1","0",270,9.554,-0.427],["C148","0.1","0",180,9.775,-1.458],["C158","0.1","0",0,9.454,-1.516],["C159","0.1","0",0,9.052,-1.366],["C160","0.1","0",0,9.458,-1.374],["C161","0.1","0",180,9.052,-1.512],["C164","0.1","0",270,9.554,-0.179],["C168","0.1","0",270,10.058,-0.34],["C170","0.1","0",270,10.058,-0.207],["C173","0.1","0",180,10.659,-0.476],["C174","0.1","0",270,10.042,-0.695],["C175","0.1","0",180,4.775,-0.848],["C180","0.1","0",270,10.924,-0.714],["C190","0.1","0",180,5.235,-0.848],["C202","0.1","0",180,5.705,-0.848],["C206","0.1","0",180,6.17,-0.848],["C214","0.1","0",0,6.225,-2.173],["C216","0.1","0",0,6.674,-2.173],["C222","0.1","0",0,5.765,-2.173],["C231","0.1","0",0,5.299,-2.173],["C4","0.47","0",90,10.918,-2.46],["C10","0.47","0",0,8.722,-0.461],["C105","0.47","0",90,10.918,-2.53],["R30","1K","0",180,11.056,-1.819],["R31","1K","0",0,10.639,-1.619],["R32","1K","0",180,10.64,-1.868],["R37","1K","0",0,11.052,-1.567],["R45","1K","0",180,1.835,-0.533],["R50","1K","0",180,1.935,-0.533],["R51","1K","0",180,1.735,-0.533],["R52","1K","0",180,2.035,-0.533],["R54","1K","0",180,1.635,-0.533],["R56","1K","0",180,2.135,-0.533],["R58","1K","0",0,10.905,-1.043],["R59","1K","0",180,10.905,-1.298],["R61","1K","0",180,10.485,-1.343],["R62","1K","0",0,10.48,-1.093],["R63","1K","0",180,1.535,-0.533],["R64","1K","0",180,1.435,-0.533],["R116","1K","0",0,7.06,-0.198],["R158","1K","0",180,10.405,-0.173],["R159","1K","0",180,10.323,-0.173],["R160","1K","0",180,10.475,-0.173],["R7","1M","0",270,8.684,-0.566],["C3","1.0u","0",90,11.183,-2.215],["C18","1.0u","0",0,10.565,-1.868],["C19","1.0u","0",90,10.537,-1.661],["C20","1.0u","0",270,11.161,-1.782],["C21","1.0u","0",0,10.262,-2.613],["C23","1.0u","0",270,11.157,-1.606],["C48","1.0u","0",270,10.183,-1.768],["C65","1.0u","0",180,0.775,-1.733],["C67","1.0u","0",90,9.294,-2.084],["C72","1.0u","0",270,10.183,-2.15],["C81","1.0u","0",270,11.157,-1.531],["C85","1.0u","0",90,10.537,-1.581],["C87","1.0u","0",270,11.161,-1.857],["C88","1.0u","0",0,10.64,-2.0],["C89","1.0u","0",270,11.013,-1.255],["C90","1.0u","0",270,11.011,-1.01],["C91","1.0u","0",90,10.373,-1.06],["C95","1.0u","0",90,10.383,-1.3],["C96","1.0u","0",90,10.383,-1.38],["C97","1.0u","0",270,11.013,-1.335],["C98","1.0u","0",0,0.765,-2.018],["C103","1.0u","0",90,10.373,-1.135],["C154","1.0u","0",0,2.275,-1.998],["C155","1.0u","0",180,2.28,-1.715],["C156","1.0u","0",270,11.011,-1.085],["C177","1.0u","0",90,10.18,-0.695],["R8","2K","0",0,8.651,-0.461],["R20","4K75","0",90,9.912,-1.767],["R42","4K75","0",180,9.879,-1.938],["R35","10K","0",90,3.555,-1.355],["R78","10K","0",270,8.629,-1.612],["R25","10R","0",0,8.37,-1.038],["R60","10R","0",180,3.525,-2.243],["C47","15p","0",90,10.597,-0.037],["C25","22n","0",90,9.282,-0.427],["C62","27p","0",90,3.75,-1.42],["C63","27p","0",270,3.89,-1.42],["R18","49R9","0",270,9.416,-0.494],["R100","49R9","0",270,9.909,-0.726],["R101","49R9","0",270,9.909,-0.659],["R102","49R9","0",270,10.31,-0.671],["R103","49R9","0",270,10.31,-0.742],["R21","75R","0",0,11.264,-1.569],["R26","75R","0",0,10.429,-1.619],["R27","75R","0",180,11.27,-1.823],["R41","75R","0",180,10.565,-2.005],["R43","75R","0",0,11.12,-1.048],["R46","75R","0",0,10.265,-1.093],["R55","75R","0",180,10.275,-1.343],["R57","75R","0",180,11.12,-1.298],["R77","75R","0",270,10.787,-0.734],["R85","75R","0",180,10.825,-0.558],["R86","75R","0",270,10.787,-0.667],["R88","75R","0",0,10.815,-0.838],["R10","220K","0",270,0.733,-1.835],["R12","220K","0",90,1.268,-1.875],["R13","220K","0",90,2.771,-1.855],["R17","220K","0",270,2.243,-1.825],["R9","280","0",270,8.68,-0.285],["R69","280","0",270,9.728,-0.494],["R39","750","0",270,-0.458,-1.29],["R40","750","0",270,-0.463,-1.39],["R84","750","0",180,10.438,-0.476],["R125","750","0",270,-0.468,-1.77],["R126","750","0",270,-0.468,-1.97],["R127","750","0",270,-0.468,-2.069],["R128","750","0",270,-0.468,-1.87],["R129","750","0",270,-0.458,-2.45],["R130","750","0",270,-0.458,-2.35],["R132","750","0",270,-0.393,-0.91],["R133","750","0",270,-0.458,-2.25],["R135","750","0",270,-0.463,-1.49],["R156","750","0",270,-0.463,-1.59],["C30","DNI","0",180,8.37,-0.908],["C57","DNI","0",90,9.278,-0.856],["R6","DNI","0",0,8.647,-0.669],["C11","sot","0",270,8.684,-0.356],["C172","SOT","0",0,10.753,-0.559],["C176","SOT","0",180,10.745,-0.838],["F1","RXE-100/SM","0",90,0.685,-0.495],["U25","ADM3485EAR","0",90,9.92,-1.385],["U16","GS1528","0",0,10.548,-0.655],["U2","ICS662-03","0",90,7.891,-0.875],["U10","SN65HDV233D","0",0,10.859,-0.112],["U4","DS34LV86T","0",180,10.852,-1.721],["U5","DS34LV86T","0",0,10.69,-1.195],["D5","N4148","0",180,8.568,-0.683],["D6","N4148","0",0,8.493,-0.683],["U11","AT90CAN128","0",0,3.852,-1.839],["REG7","TPS70445","0",0,2.493,-1.862],["REG6","TPS70451","0",0,0.987,-1.874]];
const T=['—','PCM','Dolby E','Dolby AC-3'];
const SRCN=['EMB_AUDIO (cascade)','AES_AUDIO (direct)','SRC_AUDIO (48 kHz SRC)','MUTE_AUDIO'];
const NAMED=['SD 525/59.94','SD 625/50','HD 1080i/59.94','HD 1080i/50','HD 720p/59.94','HD 720p/60'];   // formats the status bits can name
const FMTS=NAMED.concat(['HD 1080p/23.98','HD 1080p/24','HD 1080p/25','HD 1080p/29.97','HD 1080p/30','HD 720p/50','HD 720p/23.98','HD 720p/24','HD 720p/25','HD 720p/29.97','HD 720p/30']);
const BAD720=['HD 720p/23.98','HD 720p/24','HD 720p/25','HD 720p/29.97','HD 720p/30'];  // V3000 notes: “not working on the card”
const PASS=2.5e-3;   // AVR loop pass (inferred)
const mkIn=()=>[[1,48000],[1,44100],[2,48000],[1,48000],[0,48000],[0,48000],[3,48000],[0,48000]].map(([t,fs])=>({t,fs}));
const D={ sdi:{conn:true, fmt:'HD 1080i/59.94', emb:[1,1,1,1,0,0,0,0]}, ext:mkIn(), src:[1,1,1,1,0,0,0,0], auto:[1,1,1,1,1,1,1,1],
  dip:[1,1,0,0,0,0,1,1], lat:{dipEn:true, dashEn:true}, rear:'T6301', build:'v300', slot:7, sel:null, log:[], canQ:[] };
const act=K.actor(D);
const on=i=>D.dip[i]===0;
const kind=()=>H8.F[D.sdi.fmt].kind;
const locked=()=>D.sdi.conn && !(D.build==='v300'&&BAD720.includes(D.sdi.fmt));
const rearHas=i=> D.rear==='T6301'? i<7 : i!==5;      // T6301 has no AES IN8; T6305 drawing labels IN8 twice and has no IN6
const extLock=i=> rearHas(i) && D.ext[i].t>0;
/* effective source per embedded pair: DIP cascade bits when DIP mode, else DashBoard (Dashboard_b.c) */
function pairSrc(i){ if (D.lat.dipEn && !D.lat.dashEn) return on(2+(i>>1))?0:1; return D.src[i]; }
function resolved(i){ const s=pairSrc(i); if (s!==1) return s; return D.auto[i] ? (D.ext[i].t>1?1:2) : 1; }   // ALTERA_SORT: auto_src and aesN_lock > PCM → AES_AUDIO, else SRC_AUDIO
function groupsDip(){ return 1+(on(1)?1:0)+(on(0)?2:0); }                     // PROCESS_DIP_SWITCHES: SW2 → +1, SW1 → +2 (capped 3)
function groupsSent(){ return D.build==='v300'? 4 : groupsDip(); }            // v300 ALTERA_SORT: number_of_groups = 3 (= 4 groups)
function outPair(i){ if (!locked()) return {c:0, how:'no SDI'}; const r=resolved(i), g=(i>>1)+1;
  if (g>groupsSent()) return {c:0, how:`group ${g} not enabled`};
  if (r===3) return {c:0, how:'muted'}; if (r===0) return {c:D.sdi.emb[i], how:'cascade (incoming embedded)'};
  if (!extLock(i)) return {c:0, how:`External AES ${i+1} unlocked${rearHas(i)?'':' — no connector on this rear module'}`};
  const e=D.ext[i]; if (r===2) return {c:e.t, how:`SRC ${e.fs/1000} → 48 kHz`, bits:kind()==='SD'?20:21};
  return {c:e.t, how:e.fs===48000?'direct (48 kHz)':`direct at ${e.fs/1000} kHz — not locked to video: slips`, slip:e.fs!==48000, bits:kind()==='SD'?20:24}; }
function bitsSeen(i){ const o=outPair(i); if (!o.c) return '—'; if (kind()==='SD') return '20'; return o.bits?String(o.bits):'24'; }
function ledsAt(t){ const L=locked(); return {sd:L?1:0, hd:L&&kind()!=='SD'?1:0, err:L?0:1, aes:D.ext.map((e,i)=>extLock(i)?1:0), cas:L&&D.src.some((s,i)=>pairSrc(i)===0&&D.sdi.emb[i])?1:0, com:D.canQ.some(q=>t>=q&&t<q+0.02)?1:0}; }
const LEDMAP={sd:'LED8',hd:'LED9',err:'LED10',aes:['LED11','LED12','LED13','LED14','LED15','LED2','LED3','LED4'],cas:'LED7'};   // order matched to M6204-card-edge.cdr (inferred)
function ledCol(des){ const L=ledsAt(SIM.t); if (des===LEDMAP.sd) return L.sd?'#5dff5a':null; if (des===LEDMAP.hd) return L.hd?'#5dff5a':null; if (des===LEDMAP.err) return L.err?'#ff4a3d':null; if (des===LEDMAP.cas) return L.cas?'#ffd23a':null; const k=LEDMAP.aes.indexOf(des); return k>=0&&L.aes[k]?'#5dff5a':null; }
function sdiStatus(){ if (!locked()) return 'Unlocked'; return NAMED.includes(D.sdi.fmt)? D.sdi.fmt : 'OK'; }
function regBytes(){ const r=[0,1,2,3,4,5,6,7].map(resolved); const b=new Array(16).fill(0); b[0]=(r[3]<<6)|(r[2]<<4)|(r[1]<<2)|r[0]; b[1]=(r[7]<<6)|(r[6]<<4)|(r[5]<<2)|r[4]; b[12]=D.build==='v300'?3:groupsDip()-1; b[14]=(0<<7)|(1<<6); b[15]=0xAA; return b; }
const hx=v=>v.toString(16).toUpperCase().padStart(2,'0');
const A={
  plug(){ act(`${D.sdi.conn?'Unplug':'Plug in'} SDI IN (rear 1)`, tr=>{ D.sdi.conn=!D.sdi.conn; tr(`GS1574A → GS1559 → FPGA; ALTERA_SORT: ALTERA_BUFFER_in[1] bit 7 smpte = ${locked()?1:0}`); tr(`REFRESH_LEDS: ${locked()?(kind()==='SD'?'SD_LED_ON':'HD_LED_ON and SD_LED_ON'):'ERROR_LED_ON'}`); }); },
  fmt(v){ act(`Source → ${v}`, tr=>{ D.sdi.fmt=v; tr(`Status bits: sd/hd, 50/60 Hz, lock 1080/720/525/625, 59.94 vs 60 → DashBoard “${sdiStatus()}”${!NAMED.includes(v)&&locked()?' (V3000 notes: “shows OK on Dashboard”)':''}`); if (D.build==='v300'&&BAD720.includes(v)) tr('V3000 notes: “The following 720p formats are not working on the card: 23.98, 24.00, 25.00, 29.97 and 30”'); }); },
  ext(i,k,v){ act(`External AES ${i+1} ${k==='t'?'→ '+T[v]:'rate → '+v/1000+' kHz'}`, tr=>{ D.ext[i][k]=+v; tr(`CS8416 #${i+1} → ${extLock(i)?'aes'+(i+1)+'_lock = '+(D.ext[i].t>1?'compressed (> PCM)':'PCM'):'unlocked'} → AES${i+1} LED${rearHas(i)?'':' (no rear connector!)'}`); if (resolved(i)===2) tr(`AD1895 SRC ${D.ext[i].fs/1000} → 48 kHz`); else if (pairSrc(i)===1&&D.auto[i]) tr('auto_src: coded audio bypasses the SRC (aes_lock > PCM → AES_AUDIO)'); }); },
  emb(i,v){ act(`Incoming embedded pair ${i+1} → ${T[v]}`, tr=>{ D.sdi.emb[i]=+v; tr('Only reaches the output where that pair is set to cascade (EMB_AUDIO)'); }); },
  src(i,v){ act(`DashBoard: Group ${(i>>1)+1} / AES${i+1} source → ${['Embedded (cascade)','External AES','',`Mute`][v]}`, tr=>{ D.canQ.push(SIM.t); if (!D.lat.dashEn){ tr('Dashboard disable (SW8 ON at boot): change refused'); return; } D.src[i]=+v; const b=regBytes(); tr(`emb_aes${i+1}_cha = ${['EMB_AUDIO','AES_AUDIO','','MUTE_AUDIO'][v]} → ALTERA_SORT packs 2 bits per pair: OUT[0] = 0x${hx(b[0])}, OUT[1] = 0x${hx(b[1])}`); if (D.lat.dipEn&&!D.lat.dashEn) tr('…but DIP mode overrides it'); }); },
  auto(i){ act(`DashBoard: Group ${(i>>1)+1} SRC (pair ${i+1}) → ${D.auto[i]?'Off':'Auto'}`, tr=>{ D.auto[i]=D.auto[i]?0:1; D.canQ.push(SIM.t); tr(`auto_src[${i}] = ${D.auto[i]?'YES':'NO'} → pair ${i+1} = ${SRCN[resolved(i)]}`); tr(`V3000 notes: HD with SRC auto shows 21 bits on the analyser, SRC off 24 bits; SD always 20 bits — here: ${bitsSeen(i)} bits`); }); },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1; tr(`READ_DIP_SWITCHES: dip_switches = MIRROR(DIP_SWITCHES_PIN)`);
    if (i<2) tr(`PROCESS_DIP_SWITCHES: audio_groups_enabled = ${groupsDip()-1} (${groupsDip()} groups)${D.build==='v300'?' — but v3.00 ALTERA_SORT always sends number_of_groups = 3':''}`);
    else if (i<6) tr(`cascade group ${i-1} ${on(i)?'enabled (EMB_AUDIO)':'disabled (AES_AUDIO)'} — used only when DIP is in control`);
    else tr('SW7 (default from DIP or memory) and SW8 (DashBoard disable) are latched at boot: Reboot to apply'); }); },
  reboot(){ act('DashBoard: Reboot', tr=>{ D.lat={dipEn:!on(6), dashEn:!on(7)}; tr(`SW7 ${on(6)?'ON → parameters from non-volatile memory':'OFF → parameters from the DIP'}; SW8 ${on(7)?'ON → DashBoard status only':'OFF → full DashBoard control'}`); }); },
  build(b){ act(`Firmware → ${b==='v300'?'3.0.0.0 (v300, 2012)':'1.0.0.2 (v102, 2010)'}`, tr=>{ D.build=b; tr(b==='v300'?'New HD-embed core (fixes group-1 CRC errors), 60 Hz audio-clock fix; 720p 23.98–30 fail on test':'v102: group 3/4 external embedding (board iss3); groups from the DIP'); }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; tr(RM[r].note); }); },
  part(d){ const p=PNP.find(x=>x[0]===d); if(!p) return; D.sel=d; act(`Board: ${d}`, tr=>{ tr(`${d} ${p[1]} · feeder ${p[2]} · ${p[3]}° · X ${p[4]} in, Y ${p[5]} in (M6204A-iss3-T.prg)`); const role=ROLE(d,p[1]); if (role) tr(role); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; }); },
  reset(){ Object.assign(D,{sdi:{conn:true,fmt:'HD 1080i/59.94',emb:[1,1,1,1,0,0,0,0]},ext:mkIn(),src:[1,1,1,1,0,0,0,0],auto:[1,1,1,1,1,1,1,1],dip:[1,1,0,0,0,0,1,1],lat:{dipEn:true,dashEn:true},rear:'T6301',build:'v300',slot:7,sel:null,log:[],canQ:[]}); SIM.refresh(); },
};
function ROLE(d,v){ if (/CS8416/.test(v)) return 'AES receiver, one per external input (8 on the board)'; if (/AD1895/.test(v)) return 'Asynchronous sample-rate converter feeding SRC_AUDIO'; if (/EP2C35/.test(v)) return 'Cyclone II FPGA: HD/SD embedder, router (2 bits per pair in v3.00)';
  if (/AT90CAN/.test(v)) return 'Control processor (v3.00 firmware)'; if (/GS1574/.test(v)) return 'SDI adaptive equaliser'; if (/GS1559/.test(v)) return 'SDI deserializer'; if (/GS1531/.test(v)) return 'SDI serializer (output with embedded audio)'; if (/GS1528/.test(v)) return 'SDI cable driver'; if (/SW8/.test(v)) return 'DIP switch SW1'; if (/^LED/.test(d)) return 'Card-edge LED'; return ''; }
const RM={ T6301:{name:'T6301', sub:'M6204A-T6301.cdr', note:'T6301: SDI IN, AES IN1–IN7, SDI OUT1, SDI OUT2. There is no AES IN8 connector.', cells:[[1,'SDI IN','in'],[2,'AES IN7',6],[3,'AES IN1',0],[4,'AES IN2',1],[5,'AES IN3',2],[6,'AES IN4',3],[7,'AES IN5',4],[8,'AES IN6',5],[9,'SDI OUT1','o'],[10,'SDI OUT2','o']]},
  T6305:{name:'T6305', sub:'M6204A-T6305.cdr', note:'T6305 drawing: AES IN8 appears at both 8 and 9 (no IN6), METADATA at 10, and no SDI output at all.', cells:[[1,'SDI IN','in'],[2,'AES IN7',6],[3,'AES IN1',0],[4,'AES IN2',1],[5,'AES IN3',2],[6,'AES IN4',3],[7,'AES IN5',4],[8,'AES IN8 (sic)',7],[9,'AES IN8',7,'bnc'],[10,'META DATA','m']]} };
function rearSVG(){ const r=RM[D.rear], L=locked();
  return K.rearSVG({name:r.name, sub:r.sub, id:'HDTV AUDIO MULTIPLEXER · single card', cells:r.cells.map(([n,l,o])=>{ if(o==='in') return {n,label:l,id:'in',conn:D.sdi.conn,live:D.sdi.conn?(L?true:'warn'):undefined}; if (o==='o') return {n,label:l,live:L?true:'err'}; if (o==='m') return {n,label:l,kind:'tb',live:'off'};
    return {n,label:l,id:'x'+o,conn:D.ext[o].t>0,live:D.ext[o].t>0?true:undefined,title:T[D.ext[o].t]+' '+D.ext[o].fs/1000+' kHz'}; })}); }
function edgeSVG(t){ const L=ledsAt(t); const names=['SD','HD','ERR','AES1','AES2','AES3','AES4','AES5','AES6','AES7','AES8','Cascade On'];
  const st=[L.sd,L.hd,L.err,...L.aes,L.cas], ys=[40,64,88,128,152,176,200,240,264,288,312,370];
  return K.edgeSVG({label:'M6204A', maxw:260, note:'M6204-card-edge.cdr', leds:names.map((n,i)=>({name:n,c:i===2?'r':i===11?'y':'g',on:st[i],y:ys[i]}))}); }
function dashHTML(){ const L=locked(), ro=!D.lat.dashEn;
  return K.dashHTML({key:'m6204a', title:`Slot ${D.slot}: M6204A`, alarm:!L, tree:[{name:'DFR-8320 frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: M6204A`,lvl:1,sel:true}],
    tabs:[{name:'Card Info',rows:[{type:'text',label:'Product',value:'M6204A'},{type:'text',label:'Name',value:'MD-SDI Embedded Audio Multiplexer'},{type:'text',label:'Manufacturer',value:'Ward-Beck Systems'},{type:'text',label:'Board Rev',value:'Iss.3'},{type:'text',label:'Software Rev',value:D.build==='v300'?'3.00':'1.02'}]},
      {name:'Card Status',rows:[{type:'status',label:'SDI',value:sdiStatus(),level:L?'ok':'err'},{type:'sec',label:'External AES Inputs'},...D.ext.map((e,i)=>({type:'status',label:'External AES '+(i+1),value:extLock(i)?'Locked-'+(e.t===1?'PCM':e.t===2?'Dolby E':'Dolby AC3'):'Unlocked',level:extLock(i)?'ok':'err'})),{type:'text',label:'Embedded Audio',value:D.sdi.emb.map(v=>v?'P':'-').join('')}]},
      {name:'Routing',rows:[0,1,2,3].flatMap(g=>[{type:'sec',label:'Group '+(g+1)},...[0,1].map(a=>{ const i=g*2+a; return {type:'combo',id:'s'+i,label:`Embedded AES${i+1} Output`,value:D.src[i],options:[[0,'Embedded (cascade)'],[1,'External AES '+(i+1)],[3,'Mute']]}; }),{type:'toggle',id:'a'+g,label:'Group '+(g+1)+' SRC',value:!!D.auto[g*2],on:'Auto',off:'Off'}]),note:ro?'SW8 ON at boot: read-only.':'Labels from Dashboard_b.c; the per-group grouping of the controls is '+inf('control layout')},
      {name:'Settings',rows:[{type:'text',label:'Number of Groups Enabled',value:String(groupsDip())+(D.build==='v300'?' (FPGA always gets 4)':'')},{type:'button',id:'save',label:'Settings',text:'Save'}]}],
    footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload…'}], foot:D.build==='v300'?'3.0.0.0':'1.0.0.2'}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>SDI in</b><button data-x="plug">${D.sdi.conn?'Unplug':'Plug in'}</button>${sel('fmt',FMTS.map(f=>[f,f]),D.sdi.fmt)} rear ${sel('rear',[['T6301','T6301'],['T6305','T6305']],D.rear)} firmware ${sel('build',[['v300','3.0.0.0'],['v102','1.0.0.2']],D.build)} <button data-x="reset">Defaults</button></div>
    <table class="kv small" style="margin-top:6px"><tr><th>Pair</th><th>External AES in</th><th>rate</th><th>Incoming embedded</th><th>→ embedded out</th></tr>${D.ext.map((e,i)=>{ const o=outPair(i); return `<tr><td>${i+1}</td><td>${sel('t'+i,T.map((n,k)=>[k,n]),e.t)}</td><td>${sel('f'+i,[32000,44100,48000,96000].map(v=>[v,v/1000+'k']),e.fs)}</td><td>${sel('e'+i,[[0,'—'],[1,'PCM']],D.sdi.emb[i])}</td><td style="color:${o.c?(o.slip?'var(--warn)':'var(--accent)'):'var(--bad)'}">${T[o.c]} · ${o.how}</td></tr>`; }).join('')}</table><div>${dipSVG()}</div>`; }
function dipSVG(){ let s=`<svg viewBox="0 0 560 104" style="width:100%;max-width:560px"><rect x="10" y="8" width="300" height="62" rx="4" fill="#c0392b"/><text x="16" y="21" font-size="10" fill="#fff">ON ▲  SW1 (M6204A dip switch.pdf)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${v?'OFF':'ON'}</title><rect x="${x}" y="27" width="22" height="38" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?47:30}" width="16" height="15" fill="#222"/><text x="${x+11}" y="84" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  return s+`<text x="322" y="22" font-size="10.5" fill="var(--ink2)">1–2: groups enabled (MSB, LSB)</text><text x="322" y="38" font-size="10.5" fill="var(--ink2)">3–6: cascade group 1–4 (ON = yes)</text><text x="322" y="54" font-size="10.5" fill="var(--ink2)">7: defaults from DIP / memory · 8: DashBoard disable</text><text x="10" y="100" font-size="10.5" fill="var(--accent)">DIP: ${groupsDip()} groups · ${D.lat.dipEn&&!D.lat.dashEn?'DIP in control':D.lat.dashEn?'DashBoard in control':'memory'} · FPGA gets ${groupsSent()} groups</text></svg>`; }
function bindAll(r){ K.bind(r,{jack:{in:()=>A.plug()}, slot:n=>A.slot(n), dash:(id,v)=>{ if(id==='reboot')A.reboot(); else if(id==='upload') act('DashBoard: Upload…',tr=>tr('Bootloader since 1.0.0.1: zeuspack image — the v300 wbs_ztcpack.txt still writes bin/m6204a_v1_02.bin, version 1.02')); else if(id==='save') act('DashBoard: Save',tr=>tr('SAVE_INFORMATION_EEPROM (DataSafe)')); else if(id[0]==='s') A.src(+id.slice(1),+v); else if(id[0]==='a'){ const g=+id.slice(1); A.auto(g*2); D.auto[g*2+1]=D.auto[g*2]; } }});
  r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip))); r.querySelectorAll('[data-part]').forEach(g=>g.addEventListener('click',()=>A.part(g.dataset.part)));
  r.querySelectorAll('[data-jack]').forEach(g=>{ const j=g.dataset.jack; if (j[0]==='x') g.addEventListener('click',()=>{ const i=+j.slice(1); A.ext(i,'t',D.ext[i].t?0:1); }); });
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='plug')A.plug(); else if(x==='fmt')A.fmt(el.value); else if(x==='rear')A.rear(el.value); else if(x==='build')A.build(el.value); else if(x==='reset')A.reset(); else if(x[0]==='t')A.ext(+x.slice(1),'t',+el.value); else if(x[0]==='f')A.ext(+x.slice(1),'fs',+el.value); else if(x[0]==='e')A.emb(+x.slice(1),+el.value); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
function boardHTML(){ return H8.pnpSVG({parts:PNP, x0:-0.75, x1:11.45, y0:-2.85, y1:0.1, scale:70, sel:D.sel, ledOn:ledCol, note:'Drawn from M6204A-iss3-T.prg (top side, 271 placements, saved 2010-06-25). Click a part. Front edge on the left; LEDs glow live.',
  labels:[{x:-0.7,y:0.0,t:'front edge'},{x:11.4,y:0.0,t:'rear (P1)',a:'end'},{x:5.7,y:-0.45,t:'CS8416 ×4'},{x:5.7,y:-2.55,t:'CS8416 ×4'},{x:5.7,y:-1.4,t:'AD1895 ×8'}]}); }
function lanes(){ const css=SIM.css, f=H8.F[D.sdi.fmt], L=locked(), ls=[];
  ls.push(H8.frameLane(f,!L)); ls.push(H8.lineLane(f,!L)); ls.push(H8.hancLane(f,groupsSent(),!L));
  [0,1,2,3,4,5,6,7].forEach(i=>{ const e=D.ext[i], o=outPair(i); if (i>=4 && !extLock(i) && !o.c) return; ls.push({label:`Ext AES ${i+1} in (${extLock(i)?e.fs/1000+' kHz':'—'}) → ${o.c?(resolved(i)===2?'SRC':'direct'):'—'}`, h:20, draw(c,X,t0,t1,y,h){ if(!extLock(i)) return; SIM.pulses(c,X,t0,t1,y,h,1/e.fs,0,0.35/e.fs,o.slip?css('--warn'):css('--accent2'),e.fs/1000+' kHz frames'); }}); });
  ls.push(H8.audioLane('Embedded out, 48 kHz video-locked', 48000, L, SIM.css('--accent')));
  ls.push(H8.loopLane('AVR main loop (≈'+SIM.fmtDur(PASS)+' '+'inferred)', PASS));
  ls.push(K.boolLane('ERR LED', t=>ledsAt(t).err, '#c0392b')); ls.push(K.boolLane('Cascade On LED', t=>ledsAt(t).cas, '#ffd23a'));
  ls.push(K.canLane(K.canFrames({poll:0.5, phase:(D.slot*0.0173)%0.4, q:D.canQ})));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Inputs, routing and DIP', `<div id="ctl"></div>`)}${card('DashBoard (redrawn)', `<div id="dash"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear module', `<div id="rear"></div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}${card('AVR → FPGA register at the playhead', `<div id="insp"></div>`)}</div></div>
    ${card('The board (from the issue-3 pick-and-place program in this folder)', `<div id="pcb"></div>`)}${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t, b=regBytes();
    m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(); m.querySelector('#pcb').innerHTML=boardHTML();
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    m.querySelector('#insp').innerHTML=`<table class="kv"><tr><th>OUT[0..1]</th><td class="mono">${hx(b[0])} ${hx(b[1])} — 2 bits per pair: ${[0,1,2,3,4,5,6,7].map(i=>resolved(i)).join('')}</td></tr><tr><th>OUT[12]</th><td class="mono">number_of_groups = ${b[12]}</td></tr><tr><th>OUT[14]</th><td class="mono">0x${hx(b[14])} (swap&lt;&lt;7 | 1&lt;&lt;6)</td></tr><tr><th>OUT[15]</th><td class="mono">0xAA ALIGNED_DATA</td></tr><tr><th>Bits at analyser</th><td class="mono">${[0,1,2,3,4,5,6,7].map(bitsSeen).join(' · ')}</td></tr></table>`;
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second of the M6204A', `<div id="lad"></div>`)}<div class="grid2">${card('Rate conversion per input', `<div id="src"></div>`)}${card('Card edge', `<div id="edge"></div>`)}</div>`;
  const draw=()=>{ const f=H8.F[D.sdi.fmt];
    const rows=[['Video frames',f.fps.toFixed(3),SIM.fmtDur(1/f.fps),f.name],['Video lines',Math.round(H8.lineRate(f)).toLocaleString(),SIM.fmtDur(1/H8.lineRate(f)),'audio packets inserted in HANC'],['Embedded samples per channel','48 000',SIM.fmtDur(1/48000),H8.spf(f).toFixed(1)+' per frame'],['Embedded channels out',(groupsSent()*4)+' × 48 000','',groupsSent()+' groups × 4 channels'],['Register exchange','≈'+Math.round(1/PASS),SIM.fmtDur(PASS),'128 bits each way, 0xAA sync '+inf('pass time')],['DashBoard polls','2','500 ms',inf('MFC rate')]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#src').innerHTML=`<table class="kv small"><tr><th>In</th><th>rate</th><th>path</th><th>samples in / out per second</th></tr>${D.ext.map((e,i)=>{ const o=outPair(i), r=resolved(i); return `<tr><td>${i+1}</td><td class="mono">${e.fs/1000}k</td><td>${o.c?SRCN[r]:'—'}</td><td class="mono">${o.c?e.fs.toLocaleString()+' → 48 000'+(r===1&&e.fs!==48000?' (slip '+Math.abs(e.fs-48000).toLocaleString()+'/s)':''):''}</td></tr>`; }).join('')}</table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); };
  SIM.on('time', draw);
}
const BLOCKS={ sdi:{x:10,y:30,w:140,h:70,t:'SDI IN',s:['GS1574A EQ','GS1559 deser.'],d:'Rear position 1.'},
  aes:{x:10,y:150,w:140,h:90,t:'AES IN 1–8',s:['DS34LV86T ×2','CS8416 ×8'],d:'Eight external AES inputs (seven on the T6301 rear).'},
  src:{x:190,y:150,w:140,h:90,t:'AD1895 ×8',s:['async SRC → 48 kHz','bypassed for coded audio'],d:'auto_src: PCM goes through the SRC, Dolby E / AC-3 goes direct (aes_lock > PCM).'},
  fpga:{x:380,y:30,w:180,h:150,t:'EP2C35 FPGA',s:['HD/SD de-embed + embed','router: 2 bits per pair (v3.00)','HD embed core (v3.00)','status back to AVR'],d:'Cascades incoming pairs or replaces them with external audio, then re-embeds.'},
  out:{x:610,y:30,w:150,h:70,t:'SDI OUT 1–2',s:['GS1531 ser., GS1528'],d:'Two outputs on the T6301 (none on the T6305 drawing).'},
  mcu:{x:380,y:230,w:180,h:80,t:'AT90CAN128',s:['v3.00, Dashboard_b.c','DIP SW1, 12 LEDs'],d:'Builds the 128-bit control word and reports status.'},
  dash:{x:610,y:230,w:150,h:70,t:'DashBoard',s:['Card Status, Routing'],d:'Via the frame controller.'} };
const WIRES=[['sdi','fpga',''],['aes','src','I²S'],['aes','fpga','direct'],['src','fpga','48k'],['fpga','out','SDI'],['mcu','fpga','128 bits'],['fpga','mcu','status'],['mcu','dash','CAN']];
const SHEETS=[{name:'1 · Register map', note:'“M6204A operational info.doc” (2009-02-25) against the v3.00 code.', h:430, svg:()=>`<text x="30" y="40" font-size="13" font-weight="700" fill="var(--ink)">AVR → FPGA (128 bits, bit 0 first)</text>
  <text x="30" y="66" font-size="12" fill="var(--ink)">Doc: bits 47…0 router, 6 bits × 16 outputs   ← 96 bits, does not fit in 48</text>
  <text x="30" y="88" font-size="12" fill="var(--ink)">v1 code (commented-out ALTERA_SORT): 6-bit codes packed into OUT[0]…OUT[11] = 96 bits</text>
  <text x="30" y="110" font-size="12" fill="var(--accent)">v3.00: OUT[0..1] = 2 bits per embedded pair (EMB 0, AES 1, SRC 2, MUTE 3); OUT[12] = number_of_groups; OUT[15] = 0xAA</text>
  <text x="30" y="150" font-size="13" font-weight="700" fill="var(--ink)">FPGA → AVR (128 bits, bit 127 first)</text>
  ${['127…120 0xAA','111…104 SD demux equal (aes8…aes1)','103…88 SD channel active','87…80 HD group detect','79…48 embedded non-audio flags','47…16 external AES non-audio flags','15…0 SDI status: smpte/sd/hd lock, 50/60 Hz, 1080/720/525/625 lines, 59.94 vs 60'].map((s,i)=>`<text x="30" y="${176+i*22}" font-size="12" fill="var(--ink2)" font-family="var(--mono)">${s}</text>`).join('')}`},
  {name:'2 · Controller', note:'Port bits from M6204.h (v300).', svg:()=>K.chip(330,40,210,'U11 AT90CAN128',[['PA7','SD LED'],['PA6','HD LED'],['PA5','ERROR LED'],['PA4…PA0','AES1–5 LED'],['PE4…PE6','AES6–8 LED'],['PE7','CASCADE LED']],[['PB4–PB6, PG1','DOLBY1–4 (unused)'],['PG3','COM ACTIVITY'],['PD7','CAN_TX/RX (LBK)'],['FPGA','128-bit shift'],['SW1','DIP_SWITCHES_PIN']],'8 MHz · ICCAVR 7.15')}];
const TUT={i:0};
const LESSONS=[
  {title:'Meet the M6204A', body:'<p>The M6204A <b>embeds</b> external AES audio into an SD/HD-SDI signal: eight AES inputs (CS8416 receivers, AD1895 converters) and two SDI outputs. Each embedded pair either passes the incoming audio (cascade) or is replaced by an external input. No manual survives; this follows the DIP sheet, the operational-info document and the firmware.</p>', check:()=>true, auto:true},
  {title:'1 · Lock the video', body:'<p>Plug in SDI IN. On HD both the <b>SD</b> and <b>HD</b> LEDs light (REFRESH_LEDS turns on both).</p>', check:()=>locked(), hint:'Click SDI IN on the rear.'},
  {title:'2 · Replace a pair', body:'<p>In DashBoard → Routing, set <b>Embedded AES5 Output</b> to External AES 5, and give input 5 some PCM.</p>', check:()=>pairSrc(4)===1&&outPair(4).c===1, hint:'Routing → Embedded AES5 Output; then Inputs table pair 5 → PCM.'},
  {title:'3 · SRC or direct', body:'<p>Input 2 runs at 44.1 kHz. With Group 1 SRC on <b>Auto</b> it is converted to 48 kHz. Turn it <b>Off</b> and the audio slips against video.</p>', check:()=>!D.auto[0]&&outPair(1).slip, hint:'Routing → Group 1 SRC → Off.'},
  {title:'4 · Dolby bypasses the SRC', body:'<p>Input 3 carries Dolby E: even with SRC on Auto it goes direct (aes3_lock &gt; PCM), so the coded data is not destroyed.</p>', check:()=>D.ext[2].t>=2&&resolved(2)===1, hint:'Make sure input 3 is Dolby E.'},
  {title:'5 · A 720p failure', body:'<p>Choose <b>HD 720p/25</b>. With 3.0.0.0 the card loses it — the V3000 report lists 720p at 23.98, 24, 25, 29.97 and 30 as not working.</p>', check:()=>BAD720.includes(D.sdi.fmt)&&!locked(), hint:'Format → HD 720p/25.'},
  {title:'6 · Check the rear module', body:'<p>Fit the <b>T6305</b>: input 6 has no connector on its drawing (AES IN8 is drawn twice).</p>', check:()=>D.rear==='T6305', hint:'rear → T6305.'},
  {title:'Done', body:'<p>See <b>Findings</b>.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — using the M6204A (from the DIP sheet, operational info and test reports)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2"><div>${card('Main loop (v100w.c, v3.00) — running step', `<div id="flow"></div>`)}</div><div>${card('ALTERA_SORT decision per pair (live)', `<div id="dec"></div>`)}</div></div>`;
  const draw=()=>{ const st=['WDR · ALTERA read/write (16 bytes each way)','ALIGNED_DATA check (IN[15] == 0xAA)','decode sdi status, group detect, formats','READ_DIP_SWITCHES · PROCESS_DIP_SWITCHES','ALTERA_SORT: per-pair EMB / AES / SRC / MUTE','REFRESH_LEDS','CAN_FUNCTIONS (Dashboard_b.c)'];
    m.querySelector('#flow').innerHTML=H8.flowSVG(st,Math.floor(((SIM.t%PASS)/PASS)*st.length));
    m.querySelector('#dec').innerHTML=`<table class="kv small"><tr><th>Pair</th><th>emb_aesN_cha</th><th>auto_src</th><th>aesN_lock</th><th>→ code</th></tr>${[0,1,2,3,4,5,6,7].map(i=>`<tr><td>${i+1}</td><td class="mono">${['EMB_AUDIO','AES_AUDIO','','MUTE_AUDIO'][pairSrc(i)]}</td><td class="mono">${D.auto[i]?'YES':'NO'}</td><td class="mono">${extLock(i)?(D.ext[i].t>1?'> PCM':'PCM'):'0'}</td><td class="mono">${resolved(i)} ${['EMB','AES','SRC','MUTE'][resolved(i)]}</td></tr>`).join('')}</table>`; };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>The group count switch does nothing in 3.0.0.0.</b> PROCESS_DIP_SWITCHES still turns SW1/SW2 into audio_groups_enabled, but the live ALTERA_SORT starts with number_of_groups = 3 and sends that in OUT[12] — always four groups.`,
  `<b>Register map doc does not add up.</b> The operational-info doc gives “bits 47…0 audio router, 6 bits for each of 16 outputs” (96 bits), and both external and embedded sources start at code 000000. The code shows two schemes: a 6-bit-per-channel packing over 12 bytes (left commented out) and, in v3.00, 2 bits per embedded pair (EMB / AES / SRC / MUTE).`,
  `<b>DashBoard says “OK” instead of a format.</b> V3000 notes: 1080p 23.98–30, 1080i 60, 720p 50 and 60 show “OK”; 525, 625, 1080i 59.94/50 and 720p 59.94 show the format. The status bits only carry 1080/720/525/625 lines and 50/60 Hz.`,
  `<b>720p low frame rates broken in 3.0.0.0.</b> V3000 notes: “The following 720p formats are not working on the card: 23.98, 24.00, 25.00, 29.97 and 30”.`,
  `<b>Bit depth depends on the path.</b> V3000 notes: SD always 20 bits; HD shows 21 bits with SRC on Auto and 24 bits with SRC off. The 21 bits are not explained in the code.`,
  `<b>Board bodge.</b> V3000 test report (CTV, serials 84413–84414): AES4 input SCLK noisy on issue 3, fixed with a wire from U24 OSCLK to TP7. U24 is a CS8416 in the PNP file in this folder.`,
  `<b>Both SD and HD LEDs on HD.</b> REFRESH_LEDS turns on HD_LED and SD_LED for HD_FORMAT; the SD LED is effectively “locked”.`,
  `<b>Cascade LED means “anything cascaded”.</b> CASCADE_LED is lit when any emb_aesN_cha is EMB_AUDIO, not from the DIP cascade switches.`,
  `<b>Rear drawings disagree with eight inputs.</b> M6204A-T6301.cdr has AES IN1–IN7 (no IN8); M6204A-T6305.cdr labels AES IN8 twice, has no IN6 and no SDI output.`,
  `<b>Dead DashBoard file with voice-over menus.</b> V100W.mak links Dashboard_b.o; the unlinked Dashboard.c in the same folder still has “Voiceover Status/Settings” menus and “1st/2nd Group Selector” from the M6206A.`,
  `<b>Version string not bumped.</b> v300’s wbs_ztcpack.txt still writes bin/m6204a_v1_02.bin with /v 1.02.`,
  `<b>Unused Dolby LEDs.</b> M6204.h defines DOLBY1–4 LEDs (PB4–PB6, PG1); the card-edge drawing and PNP show no Dolby LEDs (one yellow LED, Cascade).`];
const ASSUME=['LED designator ↔ function: edge order of the PNP Y coordinates matched to M6204-card-edge.cdr '+inf('order'),'AVR pass ≈ '+SIM.fmtDur(PASS)+' '+inf('no timer'),'DashBoard control grouping (two pairs per group, one SRC switch per group) '+inf('Dashboard_b.c strings'),'Direct (non-SRC) input at a non-48 kHz rate modelled as slipping '+inf('embedder needs video-locked 48 kHz')];
const SOURCES=['#OPENGEAR #SERIES/M6204A - #Master #OPENGEAR/M6204A-iss3  - #PNP #2016/M6204A-iss3-T.prg','#OPENGEAR #SERIES/M6204A - #Master #OPENGEAR/M6204A - #TESTREPORT/M6204A-V3000-21MAR12.pdf (notes page 13), V1001-30SEP09, V1002-02DEC09, C700-25NOV09',SW+'Software/atmel/v300/v100w.c, M6204A.c, M6204.h, Dashboard_b.c, Dashboard.c, V100W.mak, wbs_ztcpack.txt (firmware — sibling folder, linked)',SW+'M6204A operational  info.doc, M6204A dip switch.pdf, M6204A SOFTWARE HISTORY.xls','M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204-card-edge.cdr, M6204A-T6301.cdr, M6204A-T6305.cdr'];
SIM.register({ id:'m6204a', product:'M6204A', name:'M6204A · HD/SD-SDI AES audio embedder, openGear: test reports and PNP (2009|42)', year:2009,
  folder:'#OPENGEAR #SERIES/M6204A - #Master #OPENGEAR', family:'openGear',
  summary:'The M6204A embeds up to eight external AES inputs into an SD/HD-SDI signal, cascading or replacing each embedded pair, with sample-rate conversion that coded audio bypasses. This folder holds the test reports and the issue-3 pick-and-place program; the model runs firmware 3.0.0.0 from the M6204 engineering folder.',
  highlights:['Board drawn part by part from the PNP program in this folder','Per-pair cascade / external / SRC / mute, as ALTERA_SORT packs it','Dolby inputs bypass the SRC automatically','The V3000 test notes: “OK” formats, 720p failures, 21-bit HD','The group-count DIP that v3.00 ignores'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 audio sample',period:()=>1/48000},{label:'1 video line',period:()=>1/H8.lineRate(H8.F[D.sdi.fmt])},{label:'1 frame',period:()=>1/H8.F[D.sdi.fmt].fps},{label:'1 AVR pass',period:()=>PASS}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:780,h:330,sel:'fpga'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'M6204A',sheets:SHEETS,foot:'REDRAWN from the operational-info register map and M6204.h — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:m=>H8.findingsView(m,'What the M6204A (and its folder) are up to',FINDINGS,ASSUME,SOURCES)}],
});
})();
