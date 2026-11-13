/* =====================================================================
   D6201B — dual-input 75 Ω AES/EBU distribution amplifier (2×4 / 1×8 / 1×8 SRC), openGear
   (Ward-Beck Systems, 2008|41) · Plugin for the WBS Device Simulator · Hardware model
   This product folder (D6201B - #Master) holds ISS5 BOMs, PNP files, quotes, photos and the
   V103 test report. The firmware, FPGA and P-CAD design live in the sibling engineering parent:
   - #OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/
       D6201B/Software/atmel/v102 + "v103 - not released" (D6201B.c, Dashboard.c, v100w.c, CAN.c),
       D6201B/Software/altera/v100 (FPGA), D6201A/PCB/D6201Aiss5.net, D6201A/Functional/
       D6201B-FUNCTIONAL.pdf, D6201B DIPSW.cdr, D6201B-card-edge.cdr
   - #OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6201B Manual.doc
   - D6201B - #TESTREPORT/D6201B-V103_29APR10.pdf, D6201B - #Master/D6201B ISS.5 BOM.xlsx, D6201B Photo.jpg
   Anything not in those files is marked "inferred" on screen.
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
    if (o.art) return artEdge(o);
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
    if (o.art) return artRear(o);
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
  /* CorelDRAW artwork mode (artwork pass 2026|59): o.art = {href, vb:[x,y,w,h] in the .cdr's own pt units,
     led:[[x,y,w,h]…] lens rects top→bottom, sw:[[x,y,w,h]…] switch bodies, pos:{n:[cx,cy]} rear positions 1–10,
     s: scale vs the 2012 guide (BNC Ø 11.7 pt), panel:[x,y,w,h]}. The artwork is assets/<id>-*.svg, converted
     from the archive .cdr with Inkscape; controls are drawn on the artwork's own coordinates. */
  const ARTP='siumulation-plugins/assets/';
  function artEdge(o){
    const A=o.art, [vx,vy,vw,vh]=A.vb, H=vh+(o.note?12:2);
    let s=`<svg class="og62-edge" viewBox="${vx} ${vy} ${vw} ${H}" style="width:100%;max-width:${o.maxw||340}px;display:block;margin:auto;border-radius:8px" role="img" aria-label="${o.label} card edge">
      <defs><filter id="og62glowA" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="${vx}" y="${vy}" width="${vw}" height="${H}" fill="#f4f4ef"/>
      <image href="${ARTP+A.href}" x="${vx}" y="${vy}" width="${vw}" height="${vh}"/>`;
    (o.sws||[]).forEach((w,i)=>{ const r=A.sw[w.art!=null?w.art:i]; if(!r) return;
      s+=`<g class="og62-hot" data-sw="${w.id}"><title>${w.name}: ${w.title||'click to operate'}</title>
        <rect class="hl" x="${r[0]-1}" y="${r[1]-1}" width="${r[2]+8}" height="${r[3]+2}" rx="1.5" fill="${w.down?'#000':'#fff'}" fill-opacity="${w.down?.3:.01}" stroke="#2b5f9e" stroke-width=".7" stroke-dasharray="2 1.2"/>
        ${w.pos!=null?`<text x="${r[0]+r[2]/2}" y="${r[1]+r[3]/2+2.5}" font-size="7" text-anchor="middle" fill="#fff" font-family="var(--mono)">${w.pos}</text>`:''}
        ${w.state?`<text x="${r[0]+r[2]+16}" y="${r[1]+r[3]+3}" font-size="7.5" fill="#1d6b2c" font-weight="700" font-family="var(--mono)">${w.state}</text>`:''}</g>`; });
    (o.leds||[]).forEach((l,i)=>{ const r=A.led[l.art!=null?l.art:i]; if(!r) return; const on=!!l.on, col=LEDC[l.c]||l.c;
      s+=`<g ${l.id?`class="og62-hot" data-led="${l.id}"`:''}><title>${l.name}: ${l.title||''} (${on?'lit':'off'})</title>
        <rect class="hl" x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="1.2" fill="${on?col:'#5a5f5a'}" fill-opacity="${on?1:.25}" stroke="#1b1918" stroke-width=".3" ${on?'filter="url(#og62glowA)"':''}/></g>`; });
    if (o.note) s+=`<text x="${vx+4}" y="${vy+vh+8}" font-size="6.5" fill="#55595c">${o.note}</text>`;
    return s+'</svg>';
  }
  function artRear(o){
    const A=o.art, [vx,vy,vw,vh]=A.vb, k=A.s||1, P=A.panel, ex=(o.sub?10:0)+(o.id?9:0), H=vh+ex+2;
    let s=`<svg class="og62-rear" viewBox="${vx} ${vy} ${vw} ${H}" style="width:100%;max-width:${o.maxw||360}px;display:block;margin:auto;border-radius:6px" role="img" aria-label="${o.name} rear module">
      <rect x="${vx}" y="${vy}" width="${vw}" height="${H}" fill="#f4f4ef"/>
      ${P?`<rect x="${P[0]}" y="${P[1]}" width="${P[2]}" height="${P[3]}" fill="#c8cbcd"/>`:''}
      <image href="${ARTP+A.href}" x="${vx}" y="${vy}" width="${vw}" height="${vh}"/>`;
    (o.cells||[]).forEach(c=>{ const p=A.pos[c.n]; if(!p) return; const [cx,cy]=p, left=c.n%2===1, kind=c.kind||'bnc';
      let g='';
      if (kind==='tb'){ g=`<rect class="hl" x="${cx-4.2*k}" y="${cy-7.6*k}" width="${8.4*k}" height="${15.2*k}" rx="${k}" fill="#fff" fill-opacity=".01" stroke="#2b5f9e" stroke-width="${.5*k}" stroke-dasharray="${1.5*k} ${k}"/>`;
        if (c.conn) g+=[-4.6,0,4.6].map(d=>`<line x1="${cx+(left?-3:3)*k}" y1="${cy+d*k}" x2="${cx+(left?-11:11)*k}" y2="${cy+d*k}" stroke="#2b5f9e" stroke-width="${1.6*k}" stroke-linecap="round"/>`).join(''); }
      else if (kind==='nc'){ g=`<circle cx="${cx}" cy="${cy}" r="${5.9*k}" fill="#fff" fill-opacity=".01"/>`; }
      else { g=`<circle class="hl" cx="${cx}" cy="${cy}" r="${6.2*k}" fill="#fff" fill-opacity=".01" stroke="#2b5f9e" stroke-width="${.5*k}" stroke-dasharray="${1.5*k} ${k}"/>`;
        if (c.conn) g+=`<circle cx="${cx}" cy="${cy}" r="${4.6*k}" fill="#3a74b8" opacity=".85"/><circle cx="${cx}" cy="${cy}" r="${1.4*k}" fill="#cfe0f5"/>`; }
      const live = c.live===undefined? '' : `<circle cx="${cx+(left?-7.4:7.4)*k}" cy="${cy+6*k}" r="${1.9*k}" stroke="#1b1918" stroke-width="${.3*k}" fill="${c.live===true?'#2f8f46':c.live==='warn'?'#d9a21b':c.live==='err'?'#c0392b':'#7d8286'}"/>`;
      s+=`<g ${c.id?`class="og62-hot" data-jack="${c.id}"`:''}><title>${c.n}: ${c.label}${c.title?' — '+c.title:''}${c.id?(c.conn?' (click to unplug)':' (click to plug in)'):''}</title>${g}${live}</g>`;
    });
    let y=vy+vh+8; if (o.sub){ s+=`<text x="${vx+vw/2}" y="${y}" text-anchor="middle" font-size="6.5" fill="#3d4245">${o.sub}</text>`; y+=9; }
    if (o.id) s+=`<text x="${vx+3}" y="${y}" font-size="5.2" fill="#55595c">${o.id}</text>`;
    return s+'</svg>';
  }
  return {svgT, inf, card, edgeSVG, rearSVG, frameSVG, dashHTML, bind, actor, traceHTML, logHTML, canFrames, canLane, tickLane, boolLane, waveLane, drawAES, aesSub, biphase, blockView, chip, schemView, tutorialView, levelSVG, CAN_BIT, TICK, FRAME_BITS, LEDC};
})();
/* ---------------- end og62 kit ---------------- */

const VARIANT = 'B';
/* ================= common model for D6201A / D6201B (same ISS5 PCB, firmware differs) ================= */
const B = VARIANT==='B';
const PID = B?'D6201B':'D6201A', OEM = B?'Cobalt 9253':'Ross ADA-8401-A / Cobalt 9251';
const FW = B? {ver:'V103', dir:'D6201B/Software/atmel/v102 (V102) and "v103 - not released"', file:'D6201B.c'} : {ver:'V104', dir:'D6201A/Software/atmel/v104', file:'D6201A.c'};
const ENG = '#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/';
const inf = K.inf;
const FS_LIST = [32000,44100,48000,88200,96000,176400,192000];
const C = {
  LOOP_T: 250e-6,          // main-loop pass: inferred (CS8416 + FPGA bit-bang writes every pass)
  DEBOUNCE: 255,           // EQ_PUSHBUTTON_DEBOUNCE (passes)
  T1: 96e-6,               // timer1: clk/64, reload 0xFFF4 → 12 × 8 µs = 96 µs
  HEARTBEAT: 10000,        // TX_HEARTBEAT (timer1 ticks) → 0.96 s
  TX_FRAMES: 10,           // ticks between frames of a multi-frame message → ≈1.06 ms
  WAIT3000: 2.6e-3,        // wait(3000): WDR + decrement loop ≈ 7 cycles @ 8 MHz (inferred)
  NO_EQ_REACH: 600,        // manual: 600 m (2000 ft) without equalisation
  EQ_REACH: 1200,          // inferred
};
const D = {
  in1:{conn:true, fs:48000, len:150}, in2:{conn:B, fs:48000, len:80, src:'rear'},  // src: rear | ref1 | ref2 (H3/H4)
  ref:{1:true, 2:false},
  eq1:false, eq2:false, mode:0, tone1:false, tone2:false,
  dip:[1,1,1,1,1,1,1,1], lat:[1,1],   // lat = SW7/SW8 as latched by main() at the last boot
      // SW3 positions 1..8, 1 = OFF (pull-up), 0 = ON
  alarm:true,                // "Notify on Card Fault" (smpte_alarm_enabled)
  rear:'T6301', slot:4, term1:75, term2:75,
  bootAt:null, pressAt:null, pressSw:0, saved:null,
  log:[], canQ:[],
};
const act = K.actor(D);
/* DIP switch state as the firmware sees it (READ_DIP_SWITCHES: MIRROR(PINA); switch ON pulls low) */
const dipBits = ()=> D.dip.reduce((a,v,i)=>a|(v?1<<i:0),0);
const dipEnabled = ()=> B && D.lat[0]===1;        // BIT6 != 0 → dip_switch_enabled (SW7 OFF)
const dashEnabled = ()=> !B || D.lat[1]===1;      // BIT7 != 0 → dashboard_enabled (SW8 OFF)
function effMode(){
  if (!B) return 0;
  if (dipEnabled() && !dashEnabled()){ let m=0; if(D.dip[0]===0) m+=2; if(D.dip[1]===0) m+=1; return Math.min(m,2); }
  return D.mode;
}
function effTone(k){
  if (!B) return false;
  let t = k===1? D.tone1 : D.tone2;
  if (dipEnabled() && !dashEnabled()) t = D.dip[k===1?2:3]===0;
  const m=effMode(); if (m===2) return false; if (m===0 && k===2) return false; return t;
}
function inAt(k){ const i=k===1?D.in1:D.in2; if (k===2 && B && D.in2.src!=='rear') return {conn:D.ref[D.in2.src==='ref1'?1:2], fs:48000, len:5, ref:true}; return i; }
function locked(k){
  if (k===2 && !B) return false;
  const i=inAt(k), eq = k===1? D.eq1 : D.eq2, term = k===1?D.term1:D.term2;
  if (!i.conn) return false;
  if (term===110) return i.len < 300;         // 75 Ω source into 110 Ω: mismatch reflections (inferred reach)
  return i.len <= (eq? C.EQ_REACH : C.NO_EQ_REACH);
}
function active(k){ if (k===1) return true; if (!B) return false; const m=effMode(); return m===1||m===2; }  // PROCESS_MODES input1/input2
function booting(t){ return D.bootAt!==null && t>=D.bootAt && t<D.bootAt+bootLen(); }
function bootLen(){ return 50*C.WAIT3000 + 100*0.104e-3; }
function leds(t){
  if (booting(t)) return {l1:0,n1:0,e1:0,l2:0,n2:0,e2:0,com:0,err:0};
  const o={l1:0,n1:0,e1:0,l2:0,n2:0,e2:0,com:comAt(t)?1:0,err:0};
  if (active(1)){ o.l1=locked(1)?1:0; o.n1=locked(1)?0:1; o.e1=D.eq1?1:0; }
  if (B && active(2)){ o.l2=locked(2)?1:0; o.n2=locked(2)?0:1; o.e2=D.eq2?1:0; }
  return o;
}
/* Output routing (ALTERA_write → FPGA sw2x2x1x24 / switch4x1) */
function routes(){
  const m=effMode(), l1=locked(1), l2=locked(2);
  const src = {kind:'AES1', fs:inAt(1).fs, ok:l1, tone:effTone(1)};
  if (!B) return {g1:src, g2:src, mode:'1×8'};
  if (m===0) return {g1:src, g2:src, mode:'1×8'};
  if (m===1) return {g1:src, g2:{kind:'AES2', fs:inAt(2).fs, ok:l2, tone:effTone(2)}, mode:'2×4'};
  if (l2) { const s={kind:'SRC', fs:inAt(2).fs, ok:l1, tone:false, from:inAt(1).fs}; return {g1:s, g2:s, mode:'1×8 SRC'}; }
  return {g1:src, g2:src, mode:'1×8 SRC (no reference → AES1 direct)'};
}
/* 16-bit control word (data_upper, data_lower) as written by ALTERA_write() */
function ctlWord(){
  let up=0, lo=0;
  if (!B){ lo |= 0x04; lo &= ~(0x10|0x02|0x01|0x20); up = (locked(1)?0:1)<<7; return {up,lo}; }
  const m=effMode(); lo = 0;
  lo |= effTone(1)?0:0x04; lo |= effTone(2)?0:0x08; lo |= 0x20;             // src_reset released after SRC_CONSTANT passes
  if (m===0) lo &= ~(0x10|0x02|0x01);
  else if (m===1){ lo |= 0x02; lo &= ~(0x10|0x01); }
  else if (locked(2)){ lo |= (0x10|0x04|0x02|0x01); lo &= ~0x08; }
  else { lo &= ~(0x10|0x02|0x01); lo |= (0x04|0x08); }
  up = ((locked(1)?0:1)<<7) | ((locked(2)?0:1)<<6);
  return {up,lo};
}
const hex2 = v=>v.toString(16).toUpperCase().padStart(2,'0');
const bin8 = v=>v.toString(2).padStart(8,'0');
function cardStatus(){
  const a1=locked(1), a2=locked(2);
  if (!B) return a1? ['OK','ok'] : ['No AES Audio Lock','err'];
  const m=effMode();
  if (m===0) return a1? ['OK','ok'] : ['No AES Audio Lock','err'];
  if (!a1 && !a2) return ['No AES Audio Lock','err'];
  if (!a1) return ['AES Input #1 Unlocked','err'];
  if (!a2) return ['AES Input #2 Unlocked', m===2?'warn':'err'];
  return ['OK','ok'];
}
/* OID 2.2 value as sent in MESSAGE for AES1_LOCK (see Findings: comments swapped) */
function oid22(){ if (!locked(1)) return D.alarm? 0x04 : 0x02; return 0x01; }
/* audio content used in the simulation (illustrative programme tones, not from the archive) */
const PROG = {1:{f:440, db:-18}, 2:{f:997, db:-12}};
function sampleAt(k, t){   // what AES input k carries
  const i=inAt(k); if (!locked(k)) return 0; const n=Math.floor(t*i.fs); const p=PROG[k];
  return Math.pow(10,p.db/20)*Math.sin(2*Math.PI*p.f*n/i.fs);
}
function toneAt(fs, t){ const n=Math.floor(t*fs); return 0.1*Math.sin(2*Math.PI*(n%48)/48); }   // tone_gen1: 48-entry table, −20 dBFS
function outSample(g, t){
  const r=routes()[g===1?'g1':'g2']; if (booting(t)) return null;
  if (r.kind==='SRC'){ if(!r.ok) return null; const n=Math.floor(t*r.fs); const p=PROG[1]; return Math.pow(10,p.db/20)*Math.sin(2*Math.PI*p.f*n/r.fs); }
  if (!r.ok) return null;                      // FPGA mute flag (data_upper bit 7/6 = NOT lock) — inferred meaning
  if (r.tone) return toneAt(r.fs, t);
  return sampleAt(r.kind==='AES2'?2:1, t);
}
/* main-loop schedule */
const STEPS = [
  ['WDR · CS8416_READ_LOCK_ALL · INVERT_DATA', .14, 'Read the lock bits of both CS8416 receivers → Astatus'],
  ['PROCESS_EQ_PUSHBUTTONS', .08, 'READ_SWITCHES → TRANSLATE_SWITCHES → DEBOUNCE_PUSHBUTTONS → TRANSLATE_EQ_PUSHBUTTONS'],
  ['PROCESS_MODES', .18, B?'Enable inputs for the mode; CS8416_write1/2(0x04, 0x80 or 0x89)':'CS8416_write1(0x04, 0x80 or 0x89): plain or EQ input'],
  ['READ_DIP_SWITCHES', .03, 'dip_switches = MIRROR(PINA)'],
  ['REFRESH_LEDS', .05, 'Lock / No Lock / EQ LEDs from Astatus'],
  ['ALTERA_write', .22, 'Shift data_upper, data_lower (16 bits) into the FPGA, then strobe'],
  ['CAN_FUNCTIONS · PARAMETER_UPDATE', .26, 'Queue OID reports that changed; recover the CAN controller if needed'],
  ['save_settings → SAVE_INFORMATION_EEPROM', .04, 'Only when DashBoard pressed Save'],
];
const SF = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
function stepAt(t){
  if (booting(t)) return {boot:true, pass:-1, step:-1};
  const t0 = D.bootAt!==null && t>=D.bootAt? D.bootAt+bootLen() : 0;
  const rel=t-t0, pass=Math.floor(rel/C.LOOP_T), f=(rel%C.LOOP_T)/C.LOOP_T; let k=0; SF.forEach((x,j)=>{ if (f>=x) k=j; });
  return {pass, step:k};
}
/* CAN traffic model (CAN.c timer1_ovf_isr) */
function canList(){
  const out=[], ph = (D.slot*0.0173)%0.9;
  for (let t=ph; t<1; t+=C.HEARTBEAT*C.T1) out.push({t, n:1, dir:'tx', label:'card → MFC: heartbeat / status report'});
  for (let t=0.21; t<1; t+=0.5) { out.push({t, n:1, dir:'rx', label:'MFC → card: GET_PARAM (DashBoard poll)'}); out.push({t:t+0.0005, n:1, dir:'tx', label:'card → MFC: REPORT_PARAM 0x10'}); }   // poll rate inferred
  D.canQ.forEach(t=>{ out.push({t, n:1, dir:'rx', label:'MFC → card: SET_PARAM 0x4A'}); for (let k=0;k<3;k++) out.push({t:t+0.0004+k*C.TX_FRAMES*C.T1*1.1, n:1, dir:'tx', label:'card → MFC: multi-frame reply'}); });
  return out.filter(f=>!booting(f.t)).sort((a,b)=>a.t-b.t);
}
function comAt(t){ return canList().some(f=>f.dir==='tx' && t>=f.t && t<f.t+0.0012); }

/* ---------------- actions ---------------- */
const A = {
  pressEq(k){ act(`Press EQ${B?k:''} switch (SW${k}) on the card edge`, tr=>{
    if (k===2 && !B){ tr('No SW2 on the D6201A card edge (AES2_AVAILABLE is not defined)'); return; }
    D.pressAt = SIM.t; D.pressSw=k;
    tr(`READ_SWITCHES: EQ${k}_SWITCH (PINE & BIT${k===1?2:6}) reads 0 → eq_pushbuttons |= BIT${k-1}`);
    tr('TRANSLATE_SWITCHES: pb_release == NO && pb == NO → pb = YES, eq_refresh = YES');
    const was = k===1?D.eq1:D.eq2; if (k===1) D.eq1=!was; else D.eq2=!was;
    tr(`TRANSLATE_EQ_PUSHBUTTONS: eq${k}_active ^= BIT0 → ${!was?'YES':'NO'}`);
    tr(`PROCESS_MODES: CS8416_write${k}(0x04, ${!was?'0x89':'0x80'}) → receiver input RXSEL = RXP${!was?1:0} (${!was?'equalised path':'plain path'})`);
    tr(`REFRESH_LEDS: EQ${k}_LED_${!was?'ON':'OFF'} (PORTE bit ${k===1?3:7})`);
    tr(`On release: DEBOUNCE_PUSHBUTTONS counts ${C.DEBOUNCE} passes (≈${(C.DEBOUNCE*C.LOOP_T*1e3).toFixed(0)} ms ${inf('pass time')}) before another press is accepted`);
    tr(`Input ${k}: ${locked(k)?'locked':'not locked'} (cable ${inAt(k).len} m)`);
  }); },
  plug(k){ act(`${(k===1?D.in1:D.in2).conn?'Unplug':'Plug in'} AES ${k} on the rear module`, tr=>{
    if (k===2 && !B){ tr('Position 2 of the rear module is “NC” for the D6201A'); return; }
    const i=k===1?D.in1:D.in2; i.conn=!i.conn;
    tr(`CS8416 U${k===1?5:6} ${locked(k)?'locks':'loses lock'}; CS8416_READ_LOCK_ALL → Astatus bit ${k-1} = ${locked(k)?1:0}`);
    tr(`REFRESH_LEDS: LOCK${k}_LED_${locked(k)?'ON':'OFF'}, NO_LOCK${k}_LED_${locked(k)?'OFF':'ON'}; aes${k}_lock = ${locked(k)?'YES':'NO'}`);
    tr(`ALTERA_write: data_upper bit ${k===1?7:6} = INVERT_DATA(aes${k}_lock) = ${locked(k)?0:1}`);
    tr(`PARAMETER_UPDATE: aes${k}_lock != paes${k}_lock → OID 2.${k+1} report queued; Card Status (2.1) = “${cardStatus()[0]}”`);
  }); },
  cable(k, len){ act(`Set AES ${k} cable length to ${len} m`, tr=>{ (k===1?D.in1:D.in2).len=len;
    tr(`Line loss grows with length; without EQ the manual quotes 600 m of 75 Ω cable, with EQ about ${C.EQ_REACH} m ${inf('manual says only “in excess of 600 m”')}`);
    tr(`Input ${k} is now ${locked(k)?'locked':'NOT locked'}${!locked(k)&&!(k===1?D.eq1:D.eq2)?' — press EQ to insert the equaliser':''}`); }); },
  fs(k, fs){ act(`AES ${k} source sample rate → ${fs/1000} kHz`, tr=>{ (k===1?D.in1:D.in2).fs=fs;
    tr('CS8416 re-locks to the new rate (30–192 kHz per the manual); the DA passes the stream unchanged');
    if (B && effMode()===2) tr(`SRC mode: AD1895 converts ${inAt(1).fs/1000} kHz → ${inAt(2).fs/1000} kHz (ratio ${(inAt(2).fs/inAt(1).fs).toFixed(4)})`);
    if (effTone(1)||effTone(2)) tr(`tone_gen1 steps a 48-entry table once per LRCLK, so the tone is ${(fs/48/1000).toFixed(3)} kHz at this rate`); }); },
  dash(id, v){
    if (!dashEnabled() && id!=='reboot'){ act(`DashBoard: change ${id}`, tr=>{ tr('dashboard_enabled = NO (DIP SW8 ON): the SET_PARAM handler ignores the value and replies with the current setting'); }); return; }
    const map = {
      eq1:['EQ'+(B?'1':''), 'OID 3.2', ()=>{ D.eq1=!!v; }],
      eq2:['EQ2','OID 3.3', ()=>{ D.eq2=!!v; }],
      tone1:['AES1 Tone Generator','OID 3.5', ()=>{ D.tone1=!!v; }],
      tone2:['AES2 Tone Generator','OID 3.6', ()=>{ D.tone2=!!v; }],
      mode:['Mode','OID 3.10', ()=>{ D.mode=+v; }],
      alarm:['Notify on Card Fault','OID 4.0', ()=>{ D.alarm=(v==='1'||v===true); }],
      save:['Save Settings','OID 3.1', ()=>{ D.saved=JSON.stringify({eq1:D.eq1,eq2:D.eq2,mode:D.mode,tone1:D.tone1,tone2:D.tone2,alarm:D.alarm}); }],
      reboot:['Reboot','CANMSG_REBOOT 0x43', ()=>{ D.bootAt=SIM.t; D.lat=[D.dip[6],D.dip[7]]; }],
    };
    const e=map[id]; if (!e) return;
    act(`DashBoard: ${e[0]}${id==='reboot'||id==='save'?'':' → '+(id==='mode'?['1 x 8','1 x 4 (dual)','1 x 8 w/SRC'][+v]:id==='alarm'?(v==='1'||v===true?'Enabled':'Disabled'):typeof v==='boolean'?(v?'Enabled':'Disabled'):v)}`, tr=>{
      e[2]();
      if (id==='reboot'){ tr('Dashboard.c: CANMSG_REBOOT → reboot_device = YES'); tr('CAN_FUNCTIONS: while(1) CLI(); — interrupts off, no WDR → the watchdog (WDTCR = 0x08) resets the AVR');
        tr(`main(): initialization → CAN_RX (PORTD bit 7 high = SN65HVD233 LBK loop-back) → 15 × wait(3000) → 100 ADC samples of AN_SLOTID → ADDRESS_TABLE → slot ${D.slot}`);
        tr('ALTERA_RESET(1000) → init_CS8416 (regs 0x00–0x06) → READ_DIP_SWITCHES → 25 × wait(3000) → moduleAddress → CANinit (1 Mbit/s) → CAN_TX (LBK low)');
        tr(`Boot ≈ ${(bootLen()*1000).toFixed(0)} ms ${inf('wait(3000) ≈ 2.6 ms each')}; then RESTORE_INFORMATION_EEPROM${B?' (when SW7 OFF … see Findings)':''}`); return; }
      tr(`CANRX ISR: message type CANMSG_SET_PARAM (0x4A), OID ${e[1].replace('OID ','')} → Dashboard.c handler`);
      if (id==='eq1'||id==='eq2'){ const k=id==='eq1'?1:2; tr(`eq${k}_active = ${v?'YES':'NO'}; peq${k}_active updated so PARAMETER_UPDATE does not echo it back`); tr(`PROCESS_MODES: CS8416_write${k}(0x04, ${v?'0x89':'0x80'}); EQ${k} LED ${v?'on':'off'}`); }
      if (id==='tone1'||id==='tone2'){ const k=id==='tone1'?1:2; const m=effMode();
        if (k===1 && m===2) tr('mode == OUTPUT_1x8_SRC → tone_generation1 forced to NO (SRC disables tones)');
        else if (k===2 && m!==1) tr('mode != OUTPUT_2x4 → tone_generation2 forced to NO');
        tr(`ALTERA_write: data_lower bit ${k===1?2:3} = ${effTone(k)?0:1} (0 = tone on) → FPGA tone_gen1 replaces the audio on ${k===1?'OUT1-x':'OUT2-x'}`); }
      if (id==='mode'){ const r=routes(); tr(`mode = ${['OUTPUT_1x8','OUTPUT_2x4','OUTPUT_1x8_SRC'][+v]}`); tr(`PROCESS_MODES: input1 ACTIVE, input2 ${active(2)?'ACTIVE':'INACTIVE'}`);
        const w=ctlWord(); tr(`ALTERA_write: data_lower = ${bin8(w.lo)}b (bit4 SRC path, bit1 group-2 source, bit0 SRC select, bit5 SRC reset)`); tr(`Outputs: group 1 = ${r.g1.kind}, group 2 = ${r.g2.kind}${+v===2?' — needs a reference on AES 2 (rear BNC 2 or midplane REF via H3/H4)':''}`); }
      if (id==='alarm') tr(`smpte_alarm_enabled = ${D.alarm?1:0}; OID 2.2 now reports 0x0${oid22()} when the input is unlocked`);
      if (id==='save') tr('save_settings = INVERT_DATA(value) → main loop: SAVE_INFORMATION_EEPROM() (EEPROM; restored at power-up)');
      D.canQ.push(SIM.t);
    });
  },
  dipToggle(i){ act(`DIP SW3-${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{
    if (!B){ tr('The D6201A firmware reads SW3 every pass (READ_DIP_SWITCHES) but main() forces dip_switch_enabled = NO and dashboard_enabled = YES, so nothing changes'); D.dip[i]=D.dip[i]?0:1; return; }
    D.dip[i]=D.dip[i]?0:1;
    tr(`READ_DIP_SWITCHES: dip_switches = MIRROR(PINA) = ${bin8(dipBits())}b`);
    if (i>=6) tr('SW7/SW8 are read only once, at power-up (main: BIT6 → dip_switch_enabled, BIT7 → dashboard_enabled). Reboot the card to apply.');
    else if (dipEnabled() && !dashEnabled()) tr(`ALTERA_write: DIP switches in control → mode = ${['1×8','2×4','1×8 SRC'][effMode()]}, tone1 ${effTone(1)?'on':'off'}, tone2 ${effTone(2)?'on':'off'}`);
    else tr('ALTERA_write only obeys the DIP switches when dip_switch_enabled == YES AND dashboard_enabled == NO (SW7 OFF and SW8 ON) — ignored now');
  }); },
  jumper(which, v){ act(`Jumper ${which} → ${v}`, tr=>{
    if (which==='H1') D.term1=+v; else if (which==='H2') D.term2=+v; else D.in2.src=v;
    if (which==='H3') tr(`AES 2 input now comes from ${v==='rear'?'the rear module BNC 2':'the midplane REF '+(v==='ref1'?'1':'2')+' (P2 pin '+(v==='ref1'?14:10)+') via H4'}`);
    else tr(`Input ${which==='H1'?1:2} terminated in ${v} Ω (75 Ω for coax, 110 Ω for twisted pair); input ${which==='H1'?1:2} ${locked(which==='H1'?1:2)?'locked':'NOT locked'}`);
  }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; tr(RM[r].note); tr(`AN_BMID / AN_BMID2 (P1 pins 2 / 1) present the module's ID resistors to the AVR ADC (ADC1, ADC2)`); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; const raw=SLOT_ADC[n-1];
    tr(`At boot, 100 ADC samples of AN_SLOTID (P2 pin 6) average to ≈${raw} → ADDRESS_TABLE() → slot_address = ${n}`);
    tr(`moduleAddress(${n}) → mod_address goes into every CAN ID: CAN_FRAME_ID_HIGH = (mod_address << 6) | destination`);
    tr(`During DashBoard start-up the card spaces its first replies by TX_INITIALIZE = 1000 × slot = ${1000*n} timer1 ticks (≈${(1000*n*C.T1).toFixed(2)} s)`);
    if (D.rear==='T6301' && n%2) tr('Note: with a T6301 the manual asks for even slots (2, 4 … 20)'); }); },
  refToggle(n){ act(`Frame reference REF ${n} ${D.ref[n]?'removed':'connected'}`, tr=>{ D.ref[n]=!D.ref[n]; tr(`Midplane REF${n} → H4 → H3 → AES 2 input: ${B&&D.in2.src==='ref'+n?(locked(2)?'locked':'no lock'):'not selected by H3/H4'}`); }); },
  reset(){ Object.assign(D,{eq1:false,eq2:false,mode:0,tone1:false,tone2:false,alarm:true,rear:'T6301',slot:4,term1:75,term2:75,bootAt:null,saved:null});
    Object.assign(D.in1,{conn:true,fs:48000,len:150}); Object.assign(D.in2,{conn:B,fs:48000,len:80,src:'rear'}); D.ref={1:true,2:false}; D.dip=[1,1,1,1,1,1,1,1]; D.lat=[1,1]; D.log=[]; D.canQ=[]; SIM.refresh(); },
};
/* ADDRESS_TABLE thresholds (ADC.c, non-MF6220 build) → mid-band raw value per slot */
const SLOT_ADC = [1017,996,964,932,899,867,836,804,772,740,709,675,644,611,578,548,517,487,453,421];

/* ---------------- rear modules (manual figure 2, rear module guides, D6201B-FUNCTIONAL) ---------------- */
const RM = {
  T6301:{name:'T6301A', sub:'single-card rear, 2 slots, DFR-8320', note:'T6301A: one card, all 10 BNCs: IN 1 (1), '+(B?'IN 2 (2)':'NC (2)')+', 8 outputs.'},
  T6401:{name:'T6401A', sub:'dual-card rear, 2 slots, DFR-8320', note:'T6401A: two cards share one module; each card gets IN + 4 outputs (BNC 1–10 split by card). Only OUT 1–4 of this card reach a connector.'},
  T6201:{name:'T6201A', sub:'single-card rear, DFR-8310 only', note:'T6201A: same 10-BNC layout as the T6301A, for the 10-slot DFR-8310 frame.'},
};
function rearCells(){
  const r=routes(), l1=locked(1), l2=locked(2);
  const live = g=>{ const x=r[g]; return booting(SIM.t)?'off': x.ok?true:'err'; };
  if (D.rear==='T6401'){
    const cells=[{n:2,label:'IN (card 1)',id:'in1',conn:D.in1.conn,live:D.in1.conn?(l1?true:'warn'):undefined}, {n:1,label:'IN (card 2)'}];
    for (let k=0;k<4;k++){ cells.push({n:4+2*k,label:`OUT ${k+1}`,live:live('g1')}); cells.push({n:3+2*k,label:`OUT ${k+1} (card 2)`}); }
    return cells;
  }
  const cells=[{n:1,label:'IN 1',id:'in1',conn:D.in1.conn,live:D.in1.conn?(l1?true:'warn'):undefined},
    B? {n:2,label:'IN 2',id:'in2',conn:D.in2.conn,live:D.in2.conn?(l2?true:'warn'):undefined,title:D.in2.src!=='rear'?'H3 selects the midplane REF instead':''} : {n:2,label:'NC',kind:'nc'}];
  for (let k=0;k<4;k++){ cells.push({n:3+2*k,label:B?`OUT 1-${k+1}`:`OUT ${k+1}`,live:live('g1')}); cells.push({n:4+2*k,label:B?`OUT 2-${k+1}`:`OUT ${k+5}`,live:live('g2')}); }
  return cells;
}
/* CorelDRAW artwork (artwork pass 2026|59): card edge and rear modules converted from the archive .cdr files
   to assets/d6201b-*.svg; LED, switch and connector positions are the artwork's own coordinates (pt). */
const ART={edge:{"vb":[63,129,225,311],"led":[[179.7,135.58,5.74,12.58],[179.7,156.74,5.74,12.58],[179.81,179.93,5.74,12.58],[179.7,207.85,5.74,12.58],[179.7,229.0,5.74,12.58],[179.81,252.19,5.74,12.58],[179.7,296.04,5.74,12.58],[179.81,319.23,5.74,12.58]],"sw":[[179.64,138.61,15.87,27.94],[179.64,210.87,15.87,27.94]],"href":"d6201b-edge.svg"},
 rear:{"T6301":{"vb":[315.5,211.5,147.5,186.5],"panel":[361.27,256.33,39.83,99.57],"s":1.006,"pos":{"1":[368.11,271.42],"2":[387.12,271.42],"3":[368.11,290.43],"4":[387.12,290.43],"5":[368.11,309.44],"6":[387.12,309.44],"7":[368.11,328.45],"8":[387.12,328.45],"9":[368.11,347.46],"10":[387.12,347.46]},"href":"d6201b-rear-t6301.svg"},
  "T6401":{"vb":[463.8,211.5,148.7,186.5],"panel":[511.13,256.33,39.83,99.57],"s":1.006,"pos":{"1":[517.97,271.42],"2":[536.98,271.42],"3":[517.97,290.43],"4":[536.98,290.43],"5":[517.97,309.44],"6":[536.98,309.44],"7":[517.97,328.45],"8":[536.98,328.45],"9":[517.97,347.46],"10":[536.98,347.46]},"href":"d6201b-rear-t6401.svg"},
  "T6201":{"vb":[130,183,145,219],"panel":[168,199.5,68,159],"s":1.98,"pos":{"1":[188,215],"2":[222,215],"3":[188,245],"4":[222,245],"5":[188,276],"6":[222,276],"7":[188,306],"8":[222,306],"9":[188,336],"10":[222,336]},"href":"d6201b-rear-t6201.svg"}},
 edgeCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B-card-edge.cdr','D6201B-card-edge.cdr (2007-12-19)'),
 rearCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6201B - rear module options.cdr','D6201B - rear module options.cdr (2012-01-16): T6301A, T6401A')+' · '+SIM.src('#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B Rear Mod.cdr','D6201B Rear Mod.cdr (2008-10-23): T6201')};
function rearSVG(){ const r=RM[D.rear]; return K.rearSVG({art:ART.rear[D.rear], name:r.name, sub:r.sub, cells:rearCells(), split:D.rear==='T6401'?['CARD 2','CARD 1 (this card)']:null, id:'Ward-Beck rear: AN_BMID 3K57 + AN_BMID2 per module (OpenGear Frame Address ID.xls)'}); }

/* ---------------- card edge (D6201A/B-card-edge.cdr text, manual figure 3, BOM: 3 green, 3 red, 2 yellow) ---------------- */
function edgeSVG(t){
  const L=leds(t);
  const ls = B? [
    {name:'Lock 1',c:'g',on:L.l1,y:60,title:'valid AES on input 1'},{name:'No Lock 1',c:'r',on:L.n1,y:96},{name:'EQ 1',c:'y',on:L.e1,y:132},
    {name:'Lock 2',c:'g',on:L.l2,y:190},{name:'No Lock 2',c:'r',on:L.n2,y:226},{name:'EQ 2',c:'y',on:L.e2,y:262},
    {name:'COM Activity',c:'g',on:L.com,y:330,title:'COM_ACTIVITY_LED_ON in MultiFrameMessageTransmission'},{name:'Error',c:'r',on:L.err,y:370,title:'never driven in the firmware (all COM_ERROR_LED_ON calls are commented out)'}]
   : [{name:'Lock',c:'g',on:L.l1,y:60},{name:'No Lock',c:'r',on:L.n1,y:100},{name:'EQ',c:'y',on:L.e1,y:150},
      {name:'COM Activity',c:'g',on:L.com,y:240},{name:'Error',c:'r',on:L.err,y:290,title:'never driven in the firmware'}];
  const sws = B? [{id:'eq1',name:'EQ1 Switch (SW1)',y:96,state:D.eq1?'EQ IN':'EQ OUT',down:D.pressSw===1&&SIM.t-D.pressAt<0.05},{id:'eq2',name:'EQ2 Switch (SW2)',y:226,state:D.eq2?'EQ IN':'EQ OUT'}]
               : [{id:'eq1',name:'EQ Switch (SW1)',y:80,state:D.eq1?'EQ IN':'EQ OUT'}];
  return K.edgeSVG({art:ART.edge, label:PID, leds:ls, sws, note:'Artwork: '+PID+'-card-edge.cdr'});
}
function dipSVG(){
  const lab = ['Single/Dual*','SRC On/Off*','Tone1 On/Off','Tone2 On/Off','Reserved','Reserved','Default (DIP/memory)','DashBoard enable'];
  let s=`<svg viewBox="0 0 520 225" style="width:100%;max-width:520px"><rect x="10" y="10" width="300" height="70" rx="4" fill="#c0392b"/><text x="16" y="24" font-size="10" fill="#fff">ON ▲  SW3 (219-8MS)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW3-${i+1}: ${lab[i]} — ${v?'OFF':'ON'} (click)</title><rect x="${x}" y="30" width="22" height="42" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?52:33}" width="16" height="16" fill="#222"/><text x="${x+11}" y="94" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  lab.forEach((l,i)=>{ s+=`<text x="330" y="${22+i*18}" font-size="10.5" fill="var(--ink2)">${i+1}: ${l}</text>`; });
  s+=`<text x="10" y="172" font-size="10.5" fill="var(--ink2)">* labels from D6201B DIPSW.cdr; manual (and firmware) use SW1+SW2 together:</text><text x="10" y="188" font-size="10.5" fill="var(--ink2)">OFF/OFF 1×8 · OFF/ON dual 1×4 · ON/OFF 1×8 SRC · ON/ON not used (firmware → SRC)</text>
    <text x="10" y="210" font-size="10.5" fill="var(--accent)">Firmware sees: dip_switch_enabled=${dipEnabled()?'YES':'NO'} · dashboard_enabled=${dashEnabled()?'YES':'NO'} · effective mode ${['1×8','2×4','1×8 SRC'][effMode()]}</text></svg>`;
  return s;
}
function dashHTML(){
  const cs=cardStatus(), ro=!dashEnabled();
  const lockTxt = k=> locked(k)? 'Locked' : 'Unlocked';
  const tabs=[
    {name:'Card Info', rows:[{type:'text',label:'Product',value:PID,oid:'1.5'},{type:'text',label:'Name',value:B?'Dual Unbalanced AES Distribution Amplifier':'AES DA',oid:'1.6'},{type:'text',label:'Supplier',value:'Ward-Beck Systems',oid:'1.2'},{type:'text',label:'Software Rev.',value:FW.ver,oid:'1.11'},{type:'text',label:'Web site',value:'www.ward-beck.com',oid:'1.4'},{type:'text',label:'Slot / mod_address',value:`${D.slot} / ${D.slot}`}]},
    {name:'Card Status', rows:[{type:'status',label:'Card Status',value:cs[0],level:cs[1],oid:'2.1'},
      {type:'status',label:B?'AES Input 1':'AES Input',value:lockTxt(1),level:locked(1)?'ok':'err',oid:'2.2'},
      ...(B?[{type:'status',label:'AES Input 2',value:active(2)?lockTxt(2):'Not Used',level:!active(2)?'info':locked(2)?'ok':'err',oid:'2.3'}]:[]),
      {type:'text',label:'OID 2.2 raw value',value:'0x000'+oid22()}]},
    {name:'Card Settings', rows:[
      ...(B?[{type:'combo',id:'mode',label:'Mode',value:D.mode,options:[[0,'1 x 8'],[1,'1 x 4 (dual)'],[2,'1 x 8 w/SRC']],oid:'3.10',ro}]:[]),
      {type:'sec',label:B?'AES INPUT 1':'AES INPUT'},{type:'toggle',id:'eq1',label:'Equalizer',value:D.eq1,on:'Enabled',off:'Disabled',oid:'3.2'},
      ...(B?[{type:'toggle',id:'tone1',label:'Tone Generator',value:D.tone1,on:'Enabled',off:'Disabled',oid:'3.5'},
        {type:'sec',label:'AES INPUT 2'},{type:'toggle',id:'eq2',label:'Equalizer',value:D.eq2,on:'Enabled',off:'Disabled',oid:'3.3'},{type:'toggle',id:'tone2',label:'Tone Generator',value:D.tone2,on:'Enabled',off:'Disabled',oid:'3.6'}]:[]),
      {type:'sec',label:'Alarms'},{type:'combo',id:'alarm',label:'Notify on Card Fault',value:D.alarm?1:0,options:[[1,'Enabled'],[0,'Disabled']],oid:'4.0'},
      {type:'button',id:'save',label:'Save Settings',text:'Save',oid:'3.1'}], note: ro?'DIP SW8 is ON: “Only card status is available on DashBoard” — the firmware ignores every SET_PARAM.':(B?'':'The D6201A v104 menu has only Equalizer; the tone code is commented out in ALTERA_write.')}];
  return K.dashHTML({key:PID, title:`Slot ${D.slot}: ${PID}`, alarm:cs[1]==='err'&&D.alarm, tree:[{name:'DFR-8320 frame'},{name:'MFC-8310 (frame controller)',lvl:1},{name:`Slot ${D.slot}: ${PID}`,lvl:1,sel:true}], tabs, footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload…'}], foot:FW.ver+(D.saved?' · settings saved':'')});
}
function bindAll(root){
  K.bind(root, {sw:{eq1:()=>A.pressEq(1), eq2:()=>A.pressEq(2)}, jack:{in1:()=>A.plug(1), in2:()=>A.plug(2)}, slot:n=>A.slot(n),
    dash:(id,v)=>{ if (id==='upload'){ act('DashBoard: Upload…', tr=>{ tr(`V103+${B?' (B: V102+)':''} has the Ross OGP bootloader: CANMSG_START_UPGRADE 0x40 → eepromWriteByte(BOOT_CONTROL, BOOTC_RUNLDR) → reboot into the loader`); tr(`The .bin comes from zeuspack: ${B?'D6201b_v1_0x.bin / 9253_v1_0x.bin':'D6201a_v1_04.bin / ada-8401-a_v1_04.bin / 9251_v1_04.bin'}`); tr('CANMSG_UPGRADE_PAGE 0x41 × 256-byte pages → CANMSG_VERIFY_UPGRADE 0x42 → CANMSG_REBOOT 0x43'); }); return; }
      A.dash(id, v); }});
  root.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dipToggle(+g.dataset.dip)));
}
function inputCtlHTML(){
  const one = k=>{ const i=k===1?D.in1:D.in2; return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:3px 0"><b>AES ${k}</b>
    <button data-x="plug${k}">${i.conn?'Unplug':'Plug in'}</button>
    <label>cable <select data-x="len${k}">${[5,150,450,600,800,1100,1500].map(v=>`<option ${v===i.len?'selected':''}>${v}</option>`).join('')}</select> m</label>
    <label>rate <select data-x="fs${k}">${FS_LIST.map(v=>`<option value="${v}" ${v===i.fs?'selected':''}>${v/1000} kHz</option>`).join('')}</select></label>
    <label>${k===1?'H1':'H2'} <select data-x="term${k}">${[75,110].map(v=>`<option ${v===(k===1?D.term1:D.term2)?'selected':''}>${v}</option>`).join('')}</select> Ω</label>
    ${k===2?`<label>H3/H4 <select data-x="src2">${[['rear','rear BNC 2'],['ref1','midplane REF 1'],['ref2','midplane REF 2']].map(([v,l])=>`<option value="${v}" ${v===D.in2.src?'selected':''}>${l}</option>`).join('')}</select></label>`:''}</div>`; };
  return one(1) + (B? one(2) : '') + `<div class="small" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">Rear module <select data-x="rear">${Object.keys(RM).map(k=>`<option value="${k}" ${k===D.rear?'selected':''}>${RM[k].name}</option>`).join('')}</select>
    ${B?`<button data-x="ref1">REF 1 ${D.ref[1]?'on':'off'}</button><button data-x="ref2">REF 2 ${D.ref[2]?'on':'off'}</button>`:''}<button data-x="reset">Factory defaults</button></div>`;
}
function bindInputs(root){
  root.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x;
    const f = ()=>{ if (x==='plug1') A.plug(1); else if (x==='plug2') A.plug(2); else if (x.startsWith('len')) A.cable(+x[3], +el.value); else if (x.startsWith('fs')) A.fs(+x[2], +el.value);
      else if (x==='term1') A.jumper('H1', el.value); else if (x==='term2') A.jumper('H2', el.value); else if (x==='src2') A.jumper('H3', el.value); else if (x==='rear') A.rear(el.value);
      else if (x==='ref1') A.refToggle(1); else if (x==='ref2') A.refToggle(2); else if (x==='reset') A.reset(); };
    if (el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; });
}

/* ---------------- timeline ---------------- */
function lanes(){
  const css=SIM.css, ls=[];
  [1,2].filter(k=>k===1||B).forEach(k=>{ const i=inAt(k);
    ls.push({label:`AES ${k} in: blocks/frames @ ${i.fs/1000}k`, h:26, draw(c,X,t0,t1,y,h){ if(!locked(k)){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText(i.conn?'no lock (cable too long / termination)':'not connected', X(t0)+6, y+h/2+4); return; }
      const sp=t1-t0; if (sp<400/i.fs) SIM.pulses(c,X,t0,t1,y,h,1/i.fs,0,0.5/i.fs,css('--accent'),'frames'); else SIM.pulses(c,X,t0,t1,y,h,192/i.fs,0,1/i.fs,css('--warn'),'blocks of 192 frames (Z preamble)'); }}); });
  ls.push(K.waveLane('AES 1 audio (programme)', t=>sampleAt(1,t)/0.2, {h:30}));
  ls.push({label:'AVR main loop (v100w.c)', h:30, draw(c,X,t0,t1,y,h){
    const pxPass=X(t0+C.LOOP_T)-X(t0);
    if (D.bootAt!==null && D.bootAt<t1 && D.bootAt+bootLen()>t0){ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(D.bootAt),y+3,X(D.bootAt+bootLen())-X(D.bootAt),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('main(): 50 × wait(3000), ADC slot read, init_CS8416, CANinit', Math.max(X(t0),X(D.bootAt))+4, y+h/2+4); }
    if (pxPass<2){ c.fillStyle=css('--accent'); c.globalAlpha=.3; c.fillRect(X(t0),y+8,X(t1)-X(t0),h-16); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`≈${Math.round((t1-t0)/C.LOOP_T).toLocaleString()} passes of ≈${C.LOOP_T*1e6} µs (inferred)`, X(t0)+6, y+h/2+4); return; }
    const p0=Math.floor(t0/C.LOOP_T), p1=Math.ceil(t1/C.LOOP_T);
    for (let p=p0;p<=p1;p++){ const ta=p*C.LOOP_T; if (booting(ta)) continue;
      if (pxPass>80) STEPS.forEach((s,j)=>{ const a=ta+SF[j]*C.LOOP_T, b=a+s[1]*C.LOOP_T; c.fillStyle=j===5?css('--accent2'):css('--accent'); c.globalAlpha=j%2?.5:.8; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-1),h-6); c.globalAlpha=1; if (X(b)-X(a)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' · ')[0].slice(0,26),X(a)+3,y+h/2+3); } });
      else { c.fillStyle=p%2?css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(ta),y+3,Math.max(1,pxPass-0.5),h-6); c.globalAlpha=1; } } }});
  ls.push({label:'FPGA control word (16 bits)', h:22, draw(c,X,t0,t1,y,h){ const pxPass=X(t0+C.LOOP_T)-X(t0); c.fillStyle=css('--accent2');
    if (pxPass<2){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('ALTERA_write every pass: data_upper '+bin8(ctlWord().up)+' · data_lower '+bin8(ctlWord().lo), X(t0)+6, y+h/2+4); return; }
    const p0=Math.floor(t0/C.LOOP_T), p1=Math.ceil(t1/C.LOOP_T); for (let p=p0;p<=p1;p++){ const a=(p+SF[5])*C.LOOP_T; if(!booting(a)) c.fillRect(X(a),y+5,Math.max(1,X(a+STEPS[5][1]*C.LOOP_T)-X(a)),h-10); } }});
  ls.push({label:'Timer1 ISR (96 µs) · CAN TX pacing', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T1,0,8e-6,css('--ink2'),'timer1_ovf_isr'); }});
  ls.push({label:'Timer0 ISR (1 ms) · DashBoard rx counter', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1e-3,0,30e-6,css('--ink2'),'timer0_ovf_isr'); }});
  ls.push(K.canLane(canList(), 'CAN 1 Mbit/s (own CAN.c, not zeuslib)'));
  ls.push(K.boolLane('COM Activity LED', t=>leds(t).com, '#5dbf4a'));
  ls.push(K.boolLane('Lock 1 LED', t=>leds(t).l1, '#2f8f46'));
  if (B) ls.push(K.boolLane('Lock 2 LED', t=>leds(t).l2, '#2f8f46'));
  ls.push(K.waveLane(B?'OUT 1-1 (group 1) audio':'OUT 1…8 audio', t=>{ const v=outSample(1,t); return v==null?0:v/0.2; }, {h:30}));
  if (B) ls.push(K.waveLane('OUT 2-1 (group 2) audio', t=>{ const v=outSample(2,t); return v==null?0:v/0.2; }, {h:30, cols:[SIM.css('--accent2')]}));
  return ls;
}
function inspHTML(t){
  const st=stepAt(t), r=routes(), w=ctlWord(), L=leds(t);
  return `<table class="kv">
    <tr><th>Main loop</th><td class="mono">${st.boot?'booting (main init)':'pass #'+st.pass.toLocaleString()+' · '+STEPS[st.step][0]}</td></tr>
    <tr><th>Astatus</th><td class="mono">bit0 AES1 = ${locked(1)?1:0}${B?' · bit1 AES2 = '+(locked(2)?1:0):''}</td></tr>
    <tr><th>CS8416 reg 0x04</th><td class="mono">U5 = 0x${D.eq1?'89':'80'}${B?' · U6 = 0x'+(active(2)?(D.eq2?'89':'80'):'— (input2 INACTIVE, not written)'):''}</td></tr>
    <tr><th>ALTERA_write</th><td class="mono">data_upper ${bin8(w.up)}b · data_lower ${bin8(w.lo)}b</td></tr>
    <tr><th>Mode</th><td class="mono">${r.mode}${B?` · DIP ${dipEnabled()&&!dashEnabled()?'in control':'ignored'}`:''}</td></tr>
    <tr><th>Outputs</th><td class="mono">${B?'OUT 1-x':'OUT 1–8'}: ${r.g1.kind}${r.g1.tone?' + TONE':''} @ ${r.g1.fs/1000} kHz ${r.g1.ok?'':'(muted)'}${B?`<br>OUT 2-x: ${r.g2.kind}${r.g2.tone?' + TONE':''} @ ${r.g2.fs/1000} kHz ${r.g2.ok?'':'(muted)'}`:''}</td></tr>
    <tr><th>LEDs</th><td class="mono">Lock ${L.l1} · NoLock ${L.n1} · EQ ${L.e1}${B?` · Lock2 ${L.l2} · NoLock2 ${L.n2} · EQ2 ${L.e2}`:''} · COM ${L.com} · Error ${L.err}</td></tr>
    <tr><th>Card Status (2.1)</th><td class="mono">${cardStatus()[0]}</td></tr></table>`;
}

/* ---------------- views ---------------- */
const card=K.card;
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>
      ${card('DashBoard — the operator’s window on the card (redrawn)', `<div id="dash"></div>`)}
      ${card('Inputs, jumpers and rear module', `<div id="ins"></div>${B?`<div id="dip" style="margin-top:8px"></div>`:''}`)}
    </div><div>
      <div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge (front of frame)', `<div id="edge"></div><div class="small" style="margin-top:4px">${ART.edgeCite()}</div>`)}${card('Rear module', `<div id="rear"></div><div class="small" style="margin-top:4px">${ART.rearCite()}</div>`)}</div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div></div>
    ${card('Frame — click a slot to move the card', `<div id="frame"></div>`)}
    ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Main-loop pass length is ${inf('the loop does two bit-banged CS8416 writes and a 16-bit FPGA shift each pass; no timer paces it')} (${C.LOOP_T*1e6} µs). CAN timings come from CAN.c: timer1 reloads 0xFFF4 at clk/64 (96 µs), heartbeat after TX_HEARTBEAT = 10 000 ticks, multi-frame replies every TX_FRAMES = 10 ticks. The DashBoard poll rate is ${inf('not in the card code; set by the MFC-8310 / DashBoard')}.</p>`)}
    <div class="grid2">${card('Scope: AES3 frame on the output at the playhead', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG();
    m.querySelector('#ins').innerHTML=inputCtlHTML(); if (B) m.querySelector('#dip').innerHTML=dipSVG();
    m.querySelector('#frame').innerHTML=K.frameSVG({cardSlots:[D.slot], cover:D.rear==='T6401'?[]:[D.slot%2?D.slot+1:D.slot-1], label:PID, ledOn:leds(t).l1, title:'DFR-8320 front, door off — '+(D.rear==='T6401'?'T6401A: any slot':'T6301A covers two slots: use even slots (manual)')});
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D); m.querySelector('#insp').innerHTML=inspHTML(t);
    bindAll(m); bindInputs(m);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    const r=routes().g1, n=Math.floor(t*r.fs), v=outSample(1,t);
    const F=K.drawAES(m.querySelector('#scope'), {fs:r.fs, a:v||0, b:(v||0)*0.8, n, dead:v==null});
    m.querySelector('#bits').innerHTML = v==null? 'Output muted or card booting — the FPGA holds the line idle '+inf('meaning of data_upper bits 7/6 from the FPGA project name “mute” is not stated') : `A = ${v.toFixed(5)} → 24-bit 0x${F.A.raw.toString(16).toUpperCase().padStart(6,'0')} · source ${r.kind}${r.tone?' (tone_gen1, −20 dBFS)':''} · ${r.fs/1000} kHz · bit cell ${SIM.fmtDur(1/(r.fs*128))}`;
  };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the card', `<div id="dev"></div>`)}${card('As seen on the card edge and in DashBoard', `<div id="edge"></div><div id="dash" style="margin-top:8px"></div>`)}</div>
    ${card('Signal path, stage by stage (input 1)', `<div id="path"></div>`)}`;
  const draw=()=>{ const t=SIM.t, i1=inAt(1), r=routes();
    const rows=[
      ['AES 1 frames (samples per channel)', i1.fs.toLocaleString(), SIM.fmtDur(1/i1.fs), 'CS8416 U5 recovers clock + data; FPGA i2s8416_aes re-encodes'],
      ['AES 1 blocks (192 frames)', (i1.fs/192).toFixed(2), SIM.fmtDur(192/i1.fs), 'Z preamble; carries channel status — passed through untouched'],
      ['AES bit cells (biphase)', (128*i1.fs/1e6).toFixed(3)+' M', SIM.fmtDur(1/(128*i1.fs)), 'Reclocked by the FPGA from the 24.576 MHz X2 / CS8416 MCLK '+inf('clock tree')],
      ['AVR main-loop passes', '≈'+Math.round(1/C.LOOP_T).toLocaleString()+' '+inf('pass time'), SIM.fmtDur(C.LOOP_T), 'v100w.c while(1)'],
      ['ALTERA_write control words', '≈'+Math.round(1/C.LOOP_T).toLocaleString(), '', '16 bits shifted each pass'],
      ['Timer1 interrupts', Math.round(1/C.T1).toLocaleString(), '96 µs', 'CAN transmit pacing'],
      ['Timer0 interrupts', '1,000', '1 ms', 'counts received CAN frames per second (DashBoard start-up detector)'],
      ['Card heartbeat on CAN', (1/(C.HEARTBEAT*C.T1)).toFixed(2), SIM.fmtDur(C.HEARTBEAT*C.T1), 'TX_HEARTBEAT = 10 000 × 96 µs'],
      ['CAN bit time', '1,000,000', '1 µs', 'CANBT1 0x00, CANBT2 0x04, CANBT3 0x12 → 8 TQ × 125 ns'],
      ['Tone (if on)', (r.g1.fs/48).toFixed(0)+' Hz', SIM.fmtDur(48/r.g1.fs), 'tone_gen1: 48-step table at the output LRCLK'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    const st=stepAt(t), n=Math.floor(t*i1.fs);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>AES 1</th><td class="mono">frame ${n.toLocaleString()} · ${n%192}/191 of block ${Math.floor(n/192)} · sample ${sampleAt(1,t).toFixed(4)}</td></tr>
      <tr><th>AVR</th><td class="mono">${st.boot?'booting':'pass #'+st.pass+' — '+STEPS[st.step][0]}<br><span class="muted">${st.boot?'':STEPS[st.step][2]}</span></td></tr>
      <tr><th>FPGA</th><td class="mono">${r.mode} · group 1 ← ${r.g1.kind}${B?' · group 2 ← '+r.g2.kind:''}</td></tr>
      ${B?`<tr><th>AD1895 SRC</th><td class="mono">${r.g1.kind==='SRC'?`${inAt(1).fs/1000} → ${r.g1.fs/1000} kHz, ratio ${(r.g1.fs/inAt(1).fs).toFixed(5)}`:'bypassed (BYPASS pin from FPGA)'}</td></tr>`:''}
      <tr><th>CAN</th><td class="mono">${canList().filter(f=>t>=f.t&&t<f.t+FRAME_T()).map(f=>f.label).join(', ')||'idle'}</td></tr></table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#dash').innerHTML=dashHTML(); bindAll(m);
    const len=inAt(1).len, loss = -len/600*16;   // cable loss model, inferred
    m.querySelector('#path').innerHTML = K.levelSVG([
      {name:'Source (AES3-id, 1 V p-p into 75 Ω)', level:0, note:'SMPTE 276M level'},
      {name:`Coax, ${len} m`, level:loss, col:'var(--warn)', note:inf('≈16 dB of HF loss per 600 m')},
      {name:`T1 PE-65612 + ${D.term1} Ω (H1)`, level:loss-(D.term1===110?3.5:0), note:D.term1===110?'mismatch':'matched'},
      {name:`EQ ${D.eq1?'IN (RXP1)':'OUT (RXP0)'}`, level:loss-(D.term1===110?3.5:0)+(D.eq1?16:0), col:D.eq1?'var(--accent2)':'var(--accent)', note:D.eq1?'CS8416 reg 0x04 = 0x89':'CS8416 reg 0x04 = 0x80'},
      {name:'CS8416 receiver threshold', level:-10, col:'var(--ink2)', note:inf('lock limit set to match the manual’s 600 m')},
      {name:'FPGA reclock → EL5263 driver', level:locked(1)?0:null, note:locked(1)?'regenerated, jitter < 5 ns (spec)':'muted'},
      {name:'Output BNC (1 V p-p, 75 Ω)', level:locked(1)?0:null},
    ], {lo:-40, hi:6, unit:'dB rel. 1 V p-p', clip:null});
  };
  SIM.on('time', draw);
}
const FRAME_T = ()=>K.FRAME_BITS*K.CAN_BIT;
/* block diagram */
const BLOCKS = {
  rear:{x:10,y:20,w:150,h:90,t:'Rear module',s:[RM[D.rear].name, B?'IN 1, IN 2 + 8 OUT':'IN + 8 OUT','P1 edge: BNC1–10_SIG'],d:'T6301A / T6401A / T6201A passive BNC modules. The card edge connector P1 (MEDAC100) carries BNC1_SIG … BNC10_SIG plus balanced AES1–8 P/N pairs for 110 Ω rears, and AN_BMID / AN_BMID2 for the module ID.'},
  xfmr:{x:10,y:150,w:150,h:80,t:'T1/T2 PE-65612',s:['transformer balance','H1/H2: 75 / 110 Ω'],d:'Pulse PE-65612 AES transformers isolate each input. Jumpers H1 and H2 pick the termination (75 Ω coax or 110 Ω pair) — D6201B-FUNCTIONAL.pdf.'},
  eq:{x:10,y:270,w:150,h:70,t:'Cable EQ',s:['plain → RXP0','equalised → RXP1'],d:'The equaliser is a fixed network in front of the CS8416 second input. The firmware does not switch analogue parts: it changes CS8416 register 0x04 (RXSEL) from 0x80 (RXP0) to 0x89 (RXP1).'},
  rx:{x:200,y:150,w:160,h:90,t:B?'CS8416 ×2 (U5, U6)':'CS8416 (U5)',s:['AES3 receiver, 32–192 kHz','I²S + MCLK to FPGA','lock → GPO / SPI'],d:'Cirrus CS8416 receivers, set up by init_CS8416 (regs 0x00–0x06; 0x05 = 0xB0). U6 is fitted on the shared ISS5 board but the D6201A firmware never enables it.'},
  fpga:{x:400,y:120,w:180,h:150,t:'EP1C3T100 (U10)',s:['i2s8416_aes · i2sx4_aes','sw2x2x1x24 · switch4x1','tone_gen1 (−20 dBFS)','shifter_out_192bit · shift_in'],d:'Cyclone EP1C3, configured from an M25P40 (U11, footprint named EPCS1). Re-encodes AES, routes the inputs (or the SRC) to two output groups, inserts the tone and takes the 16-bit control word from the AVR on FPGA1–FPGA4.'},
  src:{x:400,y:310,w:180,h:70,t:'AD1895 SRC (U9)',s:['1×8 SRC mode','BYPASS / U9_RESET from FPGA'],d:'Analog Devices AD1895 asynchronous sample-rate converter. In 1×8 SRC mode the input-1 audio is converted to the rate of input 2 (or a frame REF selected by H3/H4).',dim:!B},
  drv:{x:620,y:120,w:150,h:110,t:'EL5263 ×4 (U1–U4)',s:['8 output line drivers','75 Ω build-out'],d:'Elantec/Intersil EL5263 dual video amplifiers drive the eight 75 Ω outputs (1 V p-p nominal, spec sheet). The schematic part name is EL2280C (an older part number).'},
  mcu:{x:400,y:10,w:180,h:80,t:'AT90CAN128 (U7)',s:['8 MHz · v100w.c','EQ switches, LEDs, DIP SW3'],d:'Runs the main loop, reads the EQ push-buttons and DIP switch, drives the LEDs, writes the CS8416s and the FPGA control word, and speaks to DashBoard through its own CAN.c / Dashboard.c (not zeuslib).'},
  can:{x:620,y:10,w:150,h:80,t:'SN65HVD233 (U8)',s:['CAN 1 Mbit/s','LBK pin = PD7'],d:'3.3 V CAN transceiver to the midplane (P2 pins 11/13). main() holds LBK high (loop-back) until the card is ready: CAN_RX / CAN_TX macros.'},
  edge:{x:200,y:10,w:160,h:90,t:'Card edge',s:[B?'8 LEDs, SW1, SW2':'5 LEDs, SW1','DIP SW3 (on board)'],d:'Lock / No Lock / EQ per input, COM Activity, Error. The Error LED is never lit by v104 / v102 firmware.'},
};
const WIRES=[['rear','xfmr','AES in'],['xfmr','eq',''],['eq','rx','RXP0/RXP1'],['xfmr','rx',''],['rx','fpga','I²S, MCLK'],['fpga','src',''],['src','fpga',''],['fpga','drv','OUT1–4'],['drv','rear','8 × BNC'],['mcu','fpga','FPGA1–4: 16-bit word'],['mcu','rx','SPI'],['edge','mcu','SW / LED'],['mcu','can','CAND/CANR'],['can','edge','']];
function viewBlock(m){ K.blockView(m, {blocks:BLOCKS, wires:WIRES, w:790, h:400, sel:'fpga', side:card('Signal flow in one sentence', `<p>An AES3 stream enters through a transformer, is optionally equalised, is recovered by a CS8416, then the FPGA re-encodes and reclocks it and fans it out to ${B?'two groups of four':'eight'} 75 Ω drivers; the AVR only sets things up and reports to DashBoard.</p><p class="small muted">Sources: D6201B-FUNCTIONAL.pdf, ${PID} BOM ISS5, D6201Aiss5.net, ${FW.dir}.</p>`)}); }
/* schematics (redrawn from D6201Aiss5.net and the ISS5 BOM) */
const SHEETS = [
  {name:'1 · AVR (U7)', note:'AT90CAN128 TQFP64: pin numbers and nets from D6201Aiss5.net; port bits from '+FW.file+' / .h.', svg:()=>K.chip(330,50,200,'U7 AT90CAN128',[['2 PE0','LOCK1'],['3 PE1','NO_LOCK1'],['4 PE2','SW1'],['5 PE3','EQ1'],['6 PE4','LOCK2'],['7 PE5','NO_LOCK2'],['8 PE6','SW2'],['9 PE7','EQ2'],['10 PB0','COM_ACTIVITY'],['11 PB1','ERROR'],['14–17 PB4–7','FPGA4…FPGA1'],['59/60/61','AN_BMID2 / AN_BMID / AN_SLOTID']],
    [['30 PD5','CAND (TXCAN)'],['31 PD6','CANR (RXCAN)'],['32 PD7','LBK'],['35 PC0','ALTERA_RESET'],['36 PC1','CS8416_OUT'],['37 PC2','CS8416_CLK'],['38 PC3','CS8416_IN'],['39/41','CS8416_SEL2 / SEL1'],['40/42','CS8416_RESET2 / RESET1'],['44–51 PA7–0','OUT1_1SW … OUT2_4SW (SW3)'],['XTAL','X1 8 MHz']],'8 MHz · ICCAVR 7.15 · JTAG1')},
  {name:'2 · FPGA (U10)', note:'EP1C3T100C8 pins from D6201Aiss5.net (names match D6201A.qsf). OUT1–OUT4 go to the EL5263 drivers.', svg:()=>K.chip(330,40,200,'U10 EP1C3T100C8',[['2–5','FPGA4…FPGA1'],['76/77','U5_LRCLK / U5_SCLK'],['86/87','U5_SDATA / U5_MCLK'],['88–90','U5_GPO0–2'],['91/92','U6_LRCLK / U6_SCLK'],['97/98','U6_SDATA / U6_MCLK'],['99/100/1','U6_GPO0–2'],['21–25','TP5…TP1'],['10','VCO_OUT'],['36/37','DN / UP']],
    [['49','U9_RESET'],['50','BYPASS'],['51–53','LRCLK_I / SCLK_I / SDATA_I'],['54','MCLKOUT'],['55–57','SDATA / LRCLK / SCLK'],['6/7/8','NCS / CONF_DATA / N_CONFIG'],['13/16/17','NCE / DCLK / ASDI'],['60/61','CONF_DONE / N_STATUS'],['62–67','JTAG']],'Quartus II 9.1 SP1 · config U11 M25P40')},
  {name:'3 · AES receivers', note:'CS8416 U5 (and U6, same wiring with suffix 2). Inputs: BNC → T1/T2 PE-65612 → H1/H2 termination → RXP0 direct / RXP1 via EQ. Register writes from cs84xx.c; pin functions from the CS8416 data sheet.', svg:()=>K.chip(360,60,190,'U5 CS8416',[['4 RXP0','AES1 plain'],['3 RXP1','AES1 EQ'],['9 RST','CS8416_RESET1'],['14 AD0/CS','CS8416_SEL1'],['15 CDIN','CS8416_IN'],['16 CCLK','CS8416_CLK'],['17 CDOUT','CS8416_OUT']],[['18–20 GPO2–0','U5_GPO2…0'],['24 OMCK/RMCK','U5_MCLK'],['26 SDOUT','U5_SDATA'],['27 OSCLK','U5_SCLK'],['28 OLRCK','U5_LRCLK']],'reg 0x04 = 0x80 / 0x89')+`<text x="40" y="330" font-size="11.5" fill="var(--ink)">init_CS8416: 0x00←0x00 · 0x01←0x04 · 0x02←0x0B · 0x03←0xBB (GPO1/2 pass-through) · 0x04←0x80 · 0x05←0xB0 · 0x06←0x10</text>`},
  {name:'4 · SRC (U9)', note:'AD1895 pins from the netlist. Fitted on every ISS5 board; only the D6201B firmware uses it.', svg:()=>K.chip(360,60,190,'U9 AD1895',[['2','MCLKOUT'],['4 SDATA_I','SDATA_I'],['5 SCLK_I','SCLK_I'],['6 LRCLK_I','LRCLK_I'],['9 BYPASS','BYPASS'],['13 RESET','U9_RESET']],[['23 SDATA_O','SDATA'],['24 LRCLK_O','LRCLK'],['25 SCLK_O','SCLK'],['14/15','NET00018 (mode)']],'asynchronous sample-rate converter')},
  {name:'5 · Edge connectors', note:'P1 MEDAC100 (rear module) and P2 MEDAC20 (midplane) — signal pins from D6201Aiss5.net.', svg:()=>K.chip(140,60,170,'P1 (rear, MEDAC100)',[['97','BNC1_SIG'],['92','BNC2_SIG'],['75','BNC3_SIG'],['80','BNC4_SIG'],['37','BNC5_SIG'],['34','BNC6_SIG'],['17','BNC7_SIG'],['22','BNC8_SIG'],['5','BNC9_SIG'],['12','BNC10_SIG'],['2 / 1','AN_BMID / AN_BMID2']],[['69/67','AES1P/N'],['63/61','AES2P/N'],['57/55','AES3P/N'],['51/49','AES4P/N'],['70/68','AES5P/N'],['64/62','AES6P/N'],['58/56','AES7P/N'],['52/50','AES8P/N']])+K.chip(600,60,150,'P2 (midplane)',[['1/3/5','+12V'],['2','−7.5V'],['6','AN_SLOTID'],['11/13','CANL / CANH']],[['14','REF1'],['10','REF2'],['17–20','PSB_IN± / PSB_OUT±']])},
];
function viewSchem(m){ K.schemView(m, {product:PID, sheets:SHEETS, foot:`The original P-CAD files are ${ENG}D6201A/PCB/D6201Aiss5.sch / .pcb / .net. These sheets are a readable guide built from the netlist and the firmware; they are REDRAWN, not the original CAD. Blue labels are net names.`}); }
/* software */
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card(`Main loop (${FW.file.replace('.c','')} / v100w.c) — the lit box is running at the playhead`, `<div id="flow"></div>`)}
    <div>${card('EQ push-button state machine', `<div id="pb"></div>`)}${card('FPGA control word (ALTERA_write), live', `<div id="cw"></div>`)}</div></div>
    <div class="grid2">${card('How the controls did things', `<div id="how"></div>`)}${card('DashBoard OID map (from Dashboard.c, not the spreadsheet)', `<div id="oid"></div>`)}</div>
    ${card('CAN frame ID (CAN_FRAME_ID_SETUP) and boot sequence', `<div id="can"></div>`)}`;
  const draw=()=>{ const st=stepAt(SIM.t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*44+70}" style="width:100%"><rect x="140" y="6" width="240" height="26" rx="13" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="12" fill="var(--ink)">main(): init, slot ADC, init_CS8416, CANinit</text>`;
    STEPS.forEach((p,j)=>{ const y=44+j*44, on=st.step===j; s+=`<line x1="260" y1="${y-12}" x2="260" y2="${y}" stroke="var(--ink2)"/><rect x="30" y="${y}" width="460" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="40" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="40" y="${y+27}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${p[2]}</text>`; });
    const yb=44+STEPS.length*44; s+=`<path d="M490 ${yb-28} h18 V40 h-18" fill="none" stroke="var(--ink2)"/><text x="30" y="${yb+16}" font-size="11" fill="var(--ink2)">${st.boot?'Booting — main() not in the loop yet':'Pass #'+st.pass.toLocaleString()}. No timer paces the loop; the ISRs (timer0, timer1, CAN) run in between.</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    const since=D.pressAt==null?1e9:SIM.t-D.pressAt, passes=Math.floor(since/C.LOOP_T); const ph = since<0?'idle': passes<2?'pb = YES (pressed)': passes<2+C.DEBOUNCE?`pb_release = YES, pb_counter = ${Math.min(255,passes-2)}`:'idle (pb = NO)';
    m.querySelector('#pb').innerHTML=`<svg viewBox="0 0 520 110" style="width:100%">${[['idle',20],['pb = YES',190],['pb_release / counting',350]].map(([n,x],i)=>`<rect x="${x}" y="30" width="${i===2?160:140}" height="40" rx="18" fill="${ph.startsWith(n.split(' ')[0])||(i===2&&ph.startsWith('pb_release'))?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+(i===2?80:70)}" y="55" text-anchor="middle" font-size="12" fill="var(--ink)">${n}</text>`).join('')}
      <text x="165" y="22" font-size="10" fill="var(--ink2)">switch low → eq_refresh</text><text x="330" y="22" font-size="10" fill="var(--ink2)">released</text><text x="160" y="96" font-size="10" fill="var(--ink2)">after ${C.DEBOUNCE} passes (EQ_PUSHBUTTON_DEBOUNCE) → back to idle</text></svg><p class="small mono">Now: ${ph}</p>`;
    const w=ctlWord(); const bits=(v,names)=>names.map((n,i)=>`<tr><td class="mono">${7-i}</td><td class="mono">${(v>>(7-i))&1}</td><td>${n}</td></tr>`).join('');
    m.querySelector('#cw').innerHTML=`<table class="kv"><tr><th colspan="3">data_upper = ${bin8(w.up)}b</th></tr>${bits(w.up,['NOT aes1_lock','NOT aes2_lock'+(B?'':' (always 0 in A)'),'0','0','0','0','0','0'])}<tr><th colspan="3">data_lower = ${bin8(w.lo)}b</th></tr>${bits(w.lo,['0','0','src_reset (0 = held in reset)','SRC path select','tone 2 off','tone 1 off','group-2 source = AES2','SRC select'])}</table><p class="small muted">Bit meanings come from the comments in ${FW.file}; the FPGA side (shifter_out_192bit, 192-bit register) only uses these 16 bits ${inf('D6201A.bdf wiring not traced bit by bit')}.</p>`;
    m.querySelector('#how').innerHTML=`<ol class="small">
      <li><b>EQ switch</b> → PINE bit ${B?'2/6':'2'} low → TRANSLATE_SWITCHES → eq${B?'n':'1'}_active toggles → PROCESS_MODES writes CS8416 reg 0x04 = 0x89 (RXP1) or 0x80 (RXP0) on every pass → REFRESH_LEDS lights EQ.</li>
      <li><b>DashBoard set</b> → CAN RX ISR → Dashboard.c matches buffer[1].buffer[2] (OID) → variable updated → next pass writes hardware → PARAMETER_UPDATE reports back (COM Activity LED blinks for the multi-frame reply).</li>
      ${B?'<li><b>Mode</b> (OID 3.10) → mode = OUTPUT_1x8 / _2x4 / _1x8_SRC → PROCESS_MODES enables input 2 → ALTERA_write sets data_lower bits 0, 1, 4 → FPGA switch4x1 / sw2x2x1x24 picks the source for each output group.</li><li><b>DIP SW3</b> → only read inside ALTERA_write when SW7 = OFF and SW8 = ON (see Findings).</li>':''}
      <li><b>Unplug input</b> → CS8416 drops lock → Astatus bit clears → LEDs swap → data_upper NOT-lock bit set → Card Status OID 2.1 changes.</li></ol>`;
    const oids = B? [['1.2–1.11','Card info','read-only'],['2.1','Card Status','OK / AES Input #1 Unlocked / #2 Unlocked / No AES Audio Lock'],['2.2','AES Input 1','value 0x01 locked / 0x02 or 0x04 unlocked'],['2.3','AES Input 2','Locked / Not Used / Unlocked'],['3.1','Save Settings','save_settings = INVERT_DATA(v)'],['3.2 / 3.3','EQ1 / EQ2','eq1/eq2_active'],['3.4','(src_select)','stored, never used'],['3.5 / 3.6','AES1 / AES2 Tone','tone_generation1/2'],['3.8','(handler empty)','—'],['3.10','Mode','0 1×8 · 1 2×4 · 2 1×8 SRC'],['4.0','Notify on Card Fault','smpte_alarm_enabled']]
      : [['1.2–1.11','Card info','read-only'],['2.1','Card Status','OK / No AES Audio Lock'],['2.2','AES Input','value 0x01 locked / 0x02 or 0x04 unlocked'],['3.1','Save Settings','save_settings'],['3.2','EQ','eq1_active (spreadsheet says 3.3)'],['4.0','Notify on Card Fault','smpte_alarm_enabled']];
    m.querySelector('#oid').innerHTML=`<table class="kv"><tr><th>OID</th><th>Name</th><th>Firmware variable / values</th></tr>${oids.map(o=>`<tr><td class="mono">${o[0]}</td><td>${o[1]}</td><td class="small">${o[2]}</td></tr>`).join('')}</table>`;
    const hi=(D.slot<<6)|0x00, lo=0x10<<8;
    m.querySelector('#can').innerHTML=`<p class="small">Example: this card (mod_address ${D.slot}) reports a parameter to the frame controller (destination 0): <span class="mono">CAN_FRAME_ID_HIGH = (${D.slot} &lt;&lt; 6) | 0 = 0x${hi.toString(16).toUpperCase()}</span>, <span class="mono">CAN_FRAME_ID_LOW = 0x10 (CANMSG_REPORT_PARAM) &lt;&lt; 8 = 0x${lo.toString(16).toUpperCase()}</span>; payload <span class="mono">00 02 02 02 00 0${oid22()}</span> (return code, OID 2.2, length 2, value).</p>
      <ol class="small"><li>initialization(): ports, watchdog (WDTCR 0x08), ADC</li><li>CAN_RX: PORTD bit 7 high — transceiver LBK (loop-back), so nothing reaches the bus during boot</li><li>15 × wait(3000), 100 ADC samples of AN_SLOTID → ADDRESS_TABLE → slot_address</li><li>5 × wait, ALTERA_RESET(1000), 5 × wait, init_CS8416, READ_DIP_SWITCHES${B?' (SW7 → dip_switch_enabled, SW8 → dashboard_enabled)':' (then forced: dip_switch_enabled = NO, dashboard_enabled = YES)'}</li><li>25 × wait, moduleAddress, DATA_SETUP, CANinit (1 Mbit/s), CAN_TX</li><li>${B?'RESTORE_INFORMATION_EEPROM when dip_switch_enabled == NO; ':''}ALTERA_write; setBaseProductInfo("Ward-Beck Systems", "${PID}", …) or the Ross / Cobalt strings, chosen by #define</li><li>while(1) …</li></ol>`;
  };
  SIM.on('time', draw);
}
/* tutorial */
const TUT = {i:0};
function tutSide(){ return card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="td" style="margin-top:8px"></div><div id="ti" style="margin-top:6px"></div>${B?'<div id="tdip"></div>':''}`); }
function tutBind(root){ root.querySelector('#te').innerHTML=edgeSVG(SIM.t); root.querySelector('#tr2').innerHTML=rearSVG(); root.querySelector('#td').innerHTML=dashHTML(); root.querySelector('#ti').innerHTML=inputCtlHTML(); if (B) root.querySelector('#tdip').innerHTML=dipSVG(); bindAll(root); bindInputs(root); }
function viewTut(m){ K.tutorialView(m, {D, st:TUT, title:`Tutorial — installing and using the ${PID} (from the ${PID} manual)`, L:LESSONS, side:tutSide, bindSide:tutBind, reset:A.reset}); }
/* findings */
function viewFindings(m){
  m.innerHTML = card(`What the ${PID} is up to`, `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>`) +
    card('Assumptions in this simulation', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`) +
    card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${s}</li>`).join('')}</ul>`);
}
const ASSUME = [
  `Main-loop pass ≈ ${C.LOOP_T*1e6} µs ${inf('code size; no timer paces the loop')}; EQ debounce therefore ≈ ${(C.DEBOUNCE*C.LOOP_T*1e3).toFixed(0)} ms.`,
  `wait(3000) ≈ 2.6 ms ${inf('7-cycle WDR/decrement loop at 8 MHz')}, so a reboot takes about ${(bootLen()*1000).toFixed(0)} ms before CAN comes up.`,
  `Cable reach: 600 m without EQ (manual), ${C.EQ_REACH} m with EQ and 300 m into a 110 Ω termination ${inf('the manual gives no EQ figure')}; the HF-loss bars use ≈16 dB per 600 m.`,
  `DashBoard polls each card twice a second ${inf('poll rate is set by the frame controller, not in this code')}.`,
  `data_upper bits 7/6 (NOT lock) are treated as an output mute ${inf('the FPGA mute behaviour is not documented')}.`,
  'Programme audio on the inputs (440 Hz −18 dBFS, 997 Hz −12 dBFS) is illustrative.',
];

/* ---------------- D6201B specifics ---------------- */
const LESSONS = [
  {title:'Meet the D6201B', body:`<p>The D6201B is a <b>dual</b> AES3 distribution amplifier on one openGear card. It has two 75 Ω inputs and eight outputs, and three ways to use them:</p><ul><li><b>1 × 8</b>: input 1 to all eight outputs</li><li><b>Dual 1 × 4</b>: input 1 to OUT 1-1…1-4, input 2 to OUT 2-1…2-4</li><li><b>1 × 8 with SRC</b>: input 1 is sample-rate converted to the rate of a reference on input 2</li></ul><p>You set it from DashBoard or from an 8-way DIP switch on the board.</p>`, check:()=>true, auto:true},
  {title:'1 · Two inputs, one card', body:`<p>In DashBoard open <b>Card Settings</b> and set <b>Mode</b> to <b>1 x 4 (dual)</b>. Input 2 becomes active: its Lock LED lights and AES Input 2 reads Locked.</p>`, check:()=>effMode()===1&&locked(2), hint:'Card Settings → Mode → 1 x 4 (dual).'},
  {title:'2 · Equalise input 2', body:`<p>Set the AES 2 cable to <b>800 m</b>. Input 2 loses lock (No Lock 2 is red; Card Status reads “AES Input #2 Unlocked”). Press <b>EQ2</b> on the card edge to recover it.</p>`, check:()=>D.in2.len>=800&&D.eq2&&locked(2), hint:'Choose 800 m for AES 2, then click the EQ2 switch.'},
  {title:'3 · Line-up tone', body:`<p>Turn on the <b>Tone Generator</b> for AES INPUT 2. The FPGA replaces the audio on OUT 2-1…2-4 with a <b>−20 dBFS</b> tone: 1 kHz at 48 kHz. Look at the OUT 2-1 lane on the timeline.</p><p class="muted">The tone is a 48-step table clocked by the output word clock, so at 96 kHz it becomes 2 kHz.</p>`, check:()=>effTone(2), hint:'Card Settings → AES INPUT 2 → Tone Generator.'},
  {title:'4 · Sample-rate conversion', body:`<p>Set Mode to <b>1 x 8 w/SRC</b>. The tones switch off (SRC mode forces both off). Now set the AES 1 source to <b>44.1 kHz</b> while AES 2 (the reference) stays at 48 kHz.</p><p>All eight outputs now carry input 1’s audio at 48 kHz: the AD1895 converts it.</p>`, check:()=>effMode()===2&&inAt(1).fs===44100&&locked(2), hint:'Mode → 1 x 8 w/SRC, then AES 1 rate → 44.1 kHz.'},
  {title:'5 · Reference from the frame', body:`<p>Instead of a rear BNC, the reference can come from the frame: jumpers <b>H3/H4</b> on the card route midplane <b>REF 1</b> or <b>REF 2</b> to input 2. Choose “midplane REF 1” in the H3/H4 list.</p>`, check:()=>D.in2.src==='ref1'&&locked(2), hint:'H3/H4 → midplane REF 1 (REF 1 must be on).'},
  {title:'6 · Lose the reference', body:`<p>Switch <b>REF 1</b> off. Without a reference the firmware falls back to <b>AES 1 direct</b> on all outputs (data_lower bits 0/1/4 cleared). Card Status warns that input 2 is unlocked.</p>`, check:()=>effMode()===2&&!locked(2), hint:'Click “REF 1 on” to turn it off.'},
  {title:'7 · DIP switch control', body:`<p>The DIP switch only takes over when <b>SW7 is OFF</b> (“get parameters from the DIP switch”) <b>and SW8 is ON</b> (DashBoard locked out). Set SW8 ON, then press <b>Reboot</b> in DashBoard: SW7 and SW8 are only read at power-up.</p><p>Then set SW1 ON / SW2 OFF to choose 1×8 SRC from the switch.</p>`, check:()=>D.dip[7]===0&&!dashEnabled()&&D.dip[0]===0&&D.dip[1]===1&&effMode()===2, hint:'Click DIP 8 (to ON), Reboot, then DIP 1 to ON.'},
  {title:'Done', body:`<p>You have used every control on the D6201B. The <b>Software</b> tab shows the control word sent to the FPGA, and <b>Findings</b> lists where the manual, the drawings and the firmware disagree — including the DIP switch rule you just met.</p>`, check:()=>true, auto:true},
];
const FINDINGS = [
  `<b>Artwork 2026|59: card edge and rear modules now from the CorelDRAW files.</b> Card edge: ${SIM.src('#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B-card-edge.cdr')} (2007-12-19|40): 8 LEDs and the EQ1/EQ2 switches. T6301A and T6401A: ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6201B - rear module options.cdr')} (2012-01-16|45). T6201: ${SIM.src('#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B Rear Mod.cdr')} (2008-10-23|41). Converted with Inkscape to <span class="mono">assets/d6201b-*.svg</span>; the controls sit on the drawing's own coordinates.`,
  `<b>CARD 1 changes sides on the T6401A.</b> ${SIM.src('#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B Rear Mod.cdr')} (2008) labels CARD 1 on the left; the 2012 guide marks “2 CARD 1” (card 1 on the right, even positions). The simulator follows the 2012 guide.`,
  `<b>The D6202A card edge is this drawing.</b> ${SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-card-edge.cdr')} has the same eight LEDs and two switches as ${SIM.src('#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B-card-edge.cdr')}; only the ejector label differs.`,
  `<b>DIP switches only work with DashBoard locked out.</b> ALTERA_write() in D6201B.c applies SW1–SW4 only when <span class="mono">dip_switch_enabled == YES && dashboard_enabled == NO</span>, i.e. SW7 OFF <i>and</i> SW8 ON. The manual describes SW7 alone (“OFF — get card parameters from the DIP switch”). With SW8 OFF the mode and tone switches are silently ignored.`,
  `<b>SW1/SW2 labels changed, drawing not updated.</b> D6201B DIPSW.cdr and D6201B-FUNCTIONAL.pdf label SW1 “Single/Dual” and SW2 “SRC On/Off”. The manual and firmware use the pair as a code (SW1 ON = +2, SW2 ON = +1: OFF/OFF 1×8, OFF/ON dual, ON/OFF SRC). The V103 test report (29 Apr 2010|43) notes: “Mode SW1 & SW2 setting changed. Manual info needs to update.”`,
  `<b>“Not used” is not rejected.</b> SW1 ON + SW2 ON gives mode 3, which the code clamps to 2 (1×8 SRC). Any other DashBoard value except 0/1 also becomes SRC.`,
  `<b>SRC without a reference falls back quietly.</b> In 1×8 SRC mode the FPGA is told to use the SRC only <span class="mono">if (aes2_lock == YES)</span>; otherwise all eight outputs carry AES 1 at its own rate. Tones stay forced off.`,
  `<b>Tone frequency follows the sample rate.</b> tone_gen1.vhd steps a 48-entry, −20 dBFS sine table once per sample: 1 kHz only at 48 kHz.`,
  `<b>OID 3.4 “src_select” is dead.</b> Dashboard.c stores it but nothing reads it (the use in PARAMETER_UPDATE is commented out). OID 3.8 has an empty handler.`,
  `<b>OID spreadsheet copy-paste errors.</b> D6201B SOFTWARE HISTORY.xls gives OID 3.1 to both “AES Output 1” and “Save Settings”, says AES Output 1 “calibrates the AES input to +4 dBu” and EQ2 “saves the current settings”. The firmware uses 3.10 for Mode and 3.1 for Save.`,
  `<b>Same PCB as the D6201A.</b> The board silkscreen in the production photo reads “D6201A, ISS5”; the P-CAD BOM in both Master folders is the same file. The B uses the AD1895 and second CS8416 that are fitted (but idle) on the A.`,
  `<b>Misfiled BOMs.</b> <span class="mono">D6201B - iss6.bom</span> and <span class="mono">d8201iss6.bom</span> in this folder are identical and are the MF8200-series D8201 BOM, not a D6201B BOM.`,
  `<b>Error LED never lit; LBK held during boot.</b> As on the A: every COM_ERROR_LED_ON is commented out, and CAN_RX/CAN_TX drive the SN65HVD233 loop-back pin (PD7 → LBK in the netlist) rather than a direction control.`,
  `<b>Config memory.</b> README says EPCS1; BOM fits an M25P40 on a footprint called EPCS1.`,
];
const SOURCES = [
  `${ENG}D6201B/Software/atmel/v102/D6201B.c/.h, v100w.c, Dashboard.c, CAN.c (firmware — sibling folder, linked); “v103 - not released”`,
  `${ENG}D6201B/Software/D6201B SOFTWARE HISTORY.xls · altera/v100/D6201A.qsf, tone_gen1.vhd`,
  `${ENG}D6201A/PCB/D6201Aiss5.net · D6201A/Functional/D6201B-FUNCTIONAL.pdf, D6201B DIPSW.cdr, D6201B-card-edge.cdr, D6201B Rear Mod.cdr`,
  '#OPENGEAR #SERIES/D6201B - #Master #OPENGEAR/D6201B - #Master/D6201B ISS.5 BOM.xlsx, D6201B Photo.jpg, D6201B - iss6.bom (this folder)',
  '#OPENGEAR #SERIES/D6201B - #Master #OPENGEAR/D6201B - #TESTREPORT/D6201B-V103_29APR10.pdf',
  '#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6201B Manual.doc',
];
/* footnotes (artwork pass 2026|59): one small detail per entry, with the archive file that shows it */
const FOOTNOTES=[
{
"text": "CARD 1 sits on the left of the T6401A in the 2008 drawing.",
"src": "#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B Rear Mod.cdr"
},
{
"text": "The 2012 guide marks “2 CARD 1”, so CARD 1 moved to the right (even positions); the simulator follows 2012.",
"src": "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6201B - rear module options.cdr"
},
{
"text": "The D6201B card edge has 8 LEDs and two EQ switches (EQ1, EQ2).",
"src": "#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B-card-edge.cdr"
},
{
"text": "The D6202A card-edge drawing is identical to the D6201B one apart from the ejector label.",
"src": "#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-card-edge.cdr"
},
{
"text": "The 2006 T6201/T6301 label sheets, filed as D6201A, are already labelled for the dual card (“DUAL 75Ω AES DA”, IN1/IN2).",
"src": "#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201A-T6201.cdr"
},
{
"text": "The 2008 sheet titles the T6201 “SINGLE CARD REAR MODULE FOR DFR-8310” and the T6301A/T6401A “FOR DFR-8320”.",
"src": "#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B Rear Mod.cdr"
},
{
"text": "The 2012 guide footer reads “D6201B-1x8 / 2x4 AES DA 75 Ohm” for the T6301A.",
"src": "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6201B - rear module options.cdr"
}
];
SIM.register({ footnotes:FOOTNOTES,
  id:'d6201b', product:'D6201B', name:'D6201B · dual 75 Ω AES distribution amplifier with SRC, openGear (2008|41)', year:2008,
  folder:'#OPENGEAR #SERIES/D6201B - #Master #OPENGEAR', family:'openGear',
  summary:'Dual-input openGear AES3 DA (Cobalt 9253): 1×8, dual 1×4, or 1×8 through an AD1895 sample-rate converter locked to a reference on input 2 or the frame REF. Built on the D6201A ISS5 board; the model runs the V102/V103 firmware from the sibling D6201 engineering folder.',
  highlights:['Mode, EQ, tone and SRC through DashBoard or the DIP switch','16-bit FPGA control word decoded live','SRC with rear or midplane reference (H3/H4)','The DIP-switch rule the manual misses','Same PCB as the D6201A'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 AES frame', period:()=>1/inAt(1).fs},{label:'1 AES block (192 frames)', period:()=>192/inAt(1).fs},{label:'1 loop pass', period:()=>C.LOOP_T},{label:'96 µs timer1 tick', period:()=>C.T1},{label:'1 ms', period:()=>1e-3},{label:'100 ms', period:()=>0.1}],
  zooms:[[1,'1 s (whole)'],[0.1,'100 ms'],[0.004,'1 AES block (4 ms)'],[0.001,'1 ms'],[0.0005,'500 µs (2 loop passes)'],[1/48000*4,'4 AES frames (83 µs)']],
  defaultZoom:1,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial', render:viewTut},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});

})();
