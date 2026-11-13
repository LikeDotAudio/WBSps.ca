/* =====================================================================
   D6202B — dual-input 110 Ω balanced AES/EBU distribution amplifier (2×4 / 1×8 / 1×8 SRC), openGear
   (Ward-Beck Systems, firmware V100, 2009|42) · Plugin for the WBS Device Simulator · Full model
   Sources (all in this archive):
   - #OPENGEAR #SERIES/D6202B - #Master #OPENGEAR/D6202B - #Engineering/Software/atmel/D6202B/v100:
       v100w.c (main loop), D6202B.c/.h (modes, EQ buttons, ALTERA_write), Dashboard.c (OIDs, status,
       restart trap, restore_start), CAN.c (timers, CAN), cs84xx.c, ADC.c, V100W.mak, wbs_ztcpack.txt,
       D6202B SOFTWARE HISTORY.xls
   - #OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/ (the D6202B shares this PCB):
       PCB/GERBERS/D6202A-ISS4.TOP/.TSM/.TSS/.OTL (card artwork, rendered 1:1 at 120 dpi),
       PCB/OBSOLETE/ISS3/D6202A-iss3.net + .bom (nets, parts), PCB/OBSOLETE/D6202B.bom,
       Functional/D6202B-T6203.cdr, D6202A-card-edge.cdr, Functional.cdr (converted with Inkscape),
       Photo/D6202B/*.jpg (colours: black mask, white silk, gold pads)
   - D6202A #Gerber #PNP/D6202A - #PNP #2016/D6202B-iss3-T.prg (part positions)
   - Comparison base: #OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/
       D6201B/Software/atmel/v102 (the D6201B code this V100 was copied from) and altera/v100 (FPGA)
   No D6202B manual exists (D6202B - #Manual is empty); operator steps follow the D6201B manual and the
   firmware. Anything not in those files is marked "inferred" on screen.
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

/* ================= D6202B model (V100 firmware, ISS3/ISS4 PCB shared with the D6202A) ================= */
const PID = 'D6202B';
const ASSET = 'siumulation-plugins/assets/';
const inf = K.inf, card = K.card;
const SRCD = '#OPENGEAR #SERIES/D6202B - #Master #OPENGEAR/D6202B - #Engineering/Software/atmel/D6202B/v100/';
const ENGA = '#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/';
const V102 = '#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201B/Software/atmel/v102/';
const FS_LIST = [32000,44100,48000,88200,96000,176400,192000];
const C = {
  LOOP_T: 250e-6,          // main-loop pass (inferred: 2 CS8416 reads + 2 writes + 16-bit FPGA shift, all bit-banged)
  DEBOUNCE: 255,           // EQ_PUSHBUTTON_DEBOUNCE (passes)
  T1: 96e-6,               // timer1: clk/64 (8 µs) × 12 counts, reload 0xFFF4
  HEARTBEAT: 10000,        // TX_HEARTBEAT (timer1 ticks) → 0.96 s
  TX_FRAMES: 10,           // ticks between frames of a multi-frame reply
  WAIT3000: 2.6e-3,        // wait(3000) ≈ 3000 × (WDR + decrement + test) at 8 MHz (inferred)
  ADC_T: 104e-6,           // ADCSRA 0xC6: clk/64 = 125 kHz, 13 cycles per conversion
  SRC_CONSTANT: 3,         // passes the AD1895 is held in reset
  LOSS: 8,                 // dB per 100 m of 110 Ω pair at 48 kHz (inferred)
  EQ_GAIN: 12,             // dB of HF boost on the RXP1 path (inferred)
  THRESH: -18,             // CS8416 lock limit, dB re. source (≈200 mV from a 2–7 V p-p source; inferred)
};
const D = {
  in1:{conn:true, fs:48000, len:50}, in2:{conn:true, fs:48000, len:100},
  ref:{1:true, 2:false},     // frame REF1 / REF2 carrying an AES reference (inferred)
  H1:110, H2:110, H3:'rear', H4:'ref1',
  eq1:false, eq2:false, mode:0, tone1:false, tone2:false,
  alarm:false,               // smpte_alarm_enabled = NO at power-up (Dashboard.c)
  a1:false, a2:false,        // firmware aes1_lock / aes2_lock (only refreshed while the input is ACTIVE)
  srcReset:0,                // passes left with src_reset = YES
  dip:[1,1,1,1,1,1,1,1],     // SW3-1..8, 1 = OFF (pull-up), 0 = ON
  lat:[1,1],                 // SW7, SW8 as read by main() at the last boot
  restore:0,                 // restore_start (OID 0xFF.07 / 0xFF.08)
  rear:'iss2', slot:4,
  eeprom:{valid:false, mode:0, t1:0, t2:0},
  bootAt:null, pressAt:null, pressSw:0, eq2Kicked:false,
  labels:true,
  log:[], canQ:[],
};
const act = K.actor(D);
const hex2 = v=>v.toString(16).toUpperCase().padStart(2,'0');
const bin8 = v=>(v&255).toString(2).padStart(8,'0');
const dipBits = ()=> D.dip.reduce((a,v,i)=>a|(v?1<<i:0),0);
const dipEnabled = ()=> D.lat[0]===1;          // BIT6 != 0 (SW7 OFF) → dip_switch_enabled = YES
const dashEnabled = ()=> D.lat[1]===1;         // BIT7 != 0 (SW8 OFF) → dashboard_enabled = YES
const dipMode = ()=>{ let m=0; if(D.dip[0]===0) m+=2; if(D.dip[1]===0) m+=1; return Math.min(m,2); };
const MODES = ['1x8','2x4','1x8 w/ SRC'], MODEC = ['OUTPUT_1x8','OUTPUT_2x4','OUTPUT_1x8_SRC'];
const input1 = ()=> true;                                  // PROCESS_MODES: every valid mode
const input2 = ()=> D.mode===1 || D.mode===2;              // OUTPUT_2x4 or OUTPUT_1x8_SRC

/* --- physical signal at each CS8416 --- */
function srcOf(k){
  if (k===2 && D.H3==='ref'){ const n=D.H4==='ref1'?1:2; return {conn:D.ref[n], fs:48000, len:3, ref:n}; }
  return k===1? D.in1 : D.in2;
}
function reachesCard(k){ if (k===2 && D.H3==='ref') return true; return D.rear==='iss2'; }   // ISS1 T6203 puts BNC9/10 (not BNC1/2) on terminals
function levelAt(k, withEq){
  const s=srcOf(k); if (!s.conn || !reachesCard(k)) return null;
  const term = k===1? D.H1 : D.H2, ref = s.ref;
  let l = -C.LOSS*s.len/100*Math.sqrt(s.fs/48000);
  if (!ref && term===75) l -= 3.5;                         // 110 Ω pair into the 75 Ω (R8) position: mismatch
  if (withEq) l += C.EQ_GAIN;
  return l;
}
function phys(k){ const eq = k===1?D.eq1:D.eq2; const l=levelAt(k, eq); return l!=null && l>C.THRESH; }
/* --- one firmware pass: PROCESS_MODES, REFRESH_LEDS, ALTERA_write side effects, PARAMETER_UPDATE src_reset --- */
function pass(){
  if (dipEnabled() && !dashEnabled()){ D.mode=dipMode(); D.tone1=D.dip[2]===0; D.tone2=D.dip[3]===0; }
  if (D.mode===0){ D.tone2=false; if (D.eq2){ D.eq2=false; D.eq2Kicked=true; } }
  else if (D.mode===2){ D.tone1=false; D.tone2=false; }
  const was2=D.a2;
  D.a1 = phys(1);
  if (input2()) D.a2 = phys(2);
  if (!was2 && D.a2) D.srcReset = C.SRC_CONSTANT;
}
function booting(t){ return D.bootAt!==null && t>=D.bootAt && t<D.bootAt+bootLen(); }
function bootLen(){ return 20*C.WAIT3000 + 200*C.ADC_T + 1000*0.9e-6; }
function leds(t){
  const z={l1:0,n1:0,e1:0,l2:0,n2:0,e2:0,com:0,err:0};
  if (booting(t)) return z;
  z.com = comAt(t)?1:0;
  z.l1 = D.a1?1:0; z.n1 = D.a1?0:1; z.e1 = D.eq1?1:0;
  if (input2()){ z.l2 = D.a2?1:0; z.n2 = D.a2?0:1; z.e2 = D.eq2?1:0; }
  return z;
}
/* Output routing as ALTERA_write asks for it. Group 1 = FPGA OUT1/OUT2 → AES1–4 (OUT1-1..4),
   group 2 = OUT3/OUT4 → AES5–8 (OUT2-1..4): netlist U13/U12 + D6202B-T6203.cdr labels. */
function routes(){
  const s1={kind:'AES1', fs:srcOf(1).fs, ok:D.a1, tone:D.tone1};
  if (D.mode===0) return {g1:s1, g2:s1, mode:'1×8'};
  if (D.mode===1) return {g1:s1, g2:{kind:D.H3==='ref'?'REF'+(D.H4==='ref1'?1:2):'AES2', fs:srcOf(2).fs, ok:D.a2, tone:D.tone2}, mode:'2×4'};
  if (D.a2){ const s={kind:'SRC', fs:srcOf(2).fs, ok:D.a1, tone:false, from:srcOf(1).fs}; return {g1:s, g2:s, mode:'1×8 SRC'}; }
  return {g1:{...s1,tone:false}, g2:{...s1,tone:false}, mode:'1×8 SRC (no reference → AES1 direct)'};
}
function ctlWord(){
  let lo=0;
  lo |= D.tone1?0:0x04; lo |= D.tone2?0:0x08; lo |= D.srcReset>0?0:0x20;
  if (D.mode===0) lo &= ~(0x10|0x02|0x01);
  else if (D.mode===1){ lo |= 0x02; lo &= ~(0x10|0x01); }
  else if (D.a2){ lo |= (0x10|0x04|0x02|0x01); lo &= ~0x08; }
  else { lo &= ~(0x10|0x02|0x01); lo |= (0x04|0x08); }
  const up = ((D.a1?0:1)<<7) | ((D.a2?0:1)<<6);
  return {up, lo};
}
/* SIGNAL_STATUS report (Dashboard.c CAN_TX_TIMER) */
function cardStatus(){
  if (!D.alarm) return ['OK','ok',0];
  if (!D.a1 && !D.a2) return ['No AES Audio Lock','err',0x02];
  if (!D.a1 && input1()) return ['AES Input #1 Unlocked','err',0x04];
  if (!D.a2 && input2()) return ['AES Input #2 Unlocked','err',0x08];
  return ['OK','ok',0];
}
function oidIn(k){ const a=k===1?D.a1:D.a2, act=k===1?input1():input2(); if (!a && act) return [0x04,'Unlocked','err']; if (!act) return [0x02,'Not Used','info']; return [0x01,'Locked','ok']; }
/* programme audio used to animate the outputs (illustrative, not from the archive) */
const PROG = {1:{f:440, db:-18}, 2:{f:997, db:-12}};
function sampleAt(k, t){ const s=srcOf(k); if (!phys(k)) return 0; if (s.ref) return 0; const n=Math.floor(t*s.fs), p=PROG[k]; return Math.pow(10,p.db/20)*Math.sin(2*Math.PI*p.f*n/s.fs); }
function toneAt(fs, t){ const n=Math.floor(t*fs); return 0.1*Math.sin(2*Math.PI*(n%48)/48); }
function outSample(g, t){
  if (booting(t)) return null; const r=routes()[g===1?'g1':'g2'];
  if (!r.ok) return null;
  if (r.kind==='SRC'){ const n=Math.floor(t*r.fs), p=PROG[1]; return Math.pow(10,p.db/20)*Math.sin(2*Math.PI*p.f*n/r.fs); }
  if (r.tone) return toneAt(r.fs, t);
  if (r.kind.startsWith('REF')) return 0;
  return sampleAt(r.kind==='AES2'?2:1, t);
}
/* main-loop schedule (v100w.c while(1)) */
const STEPS = [
  ['WDR · CS8416_READ_LOCK_ALL · INVERT_DATA', .16, 'CS8416_read1/2(0x0C): receiver-error register == 0 → locked; Astatus bit0/bit1'],
  ['PROCESS_EQ_PUSHBUTTONS', .07, 'READ_SWITCHES (PINE bit2 / bit6) → TRANSLATE_SWITCHES → DEBOUNCE_PUSHBUTTONS → TRANSLATE_EQ_PUSHBUTTONS'],
  ['PROCESS_MODES', .18, 'input1/input2 ACTIVE per mode; CS8416_write1/2(0x04, 0x80 = RXP0 flat, 0x89 = RXP1 EQ)'],
  ['READ_DIP_SWITCHES', .03, 'dip_switches = MIRROR(PINA)'],
  ['REFRESH_LEDS', .05, 'Lock / No Lock / EQ LEDs; aes1_lock, aes2_lock (only for ACTIVE inputs)'],
  ['ALTERA_write', .21, 'DIP override (SW7 OFF + SW8 ON), forced tone/EQ2 rules, 16 bits → FPGA, STROBE_WRITE'],
  ['CAN_FUNCTIONS · PARAMETER_UPDATE', .26, 'reboot check, CAN recovery, queue the next changed OID'],
  ['save_settings → SAVE_INFORMATION_EEPROM', .04, 'only after DashBoard OID 3.1 “Save”'],
];
const SF = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
function stepAt(t){
  if (booting(t)) return {boot:true, pass:-1, step:-1};
  const t0 = D.bootAt!==null && t>=D.bootAt? D.bootAt+bootLen() : 0;
  const rel=t-t0, p=Math.floor(rel/C.LOOP_T), f=(rel%C.LOOP_T)/C.LOOP_T; let k=0; SF.forEach((x,j)=>{ if (f>=x) k=j; });
  return {pass:p, step:k};
}
/* CAN traffic (CAN.c timer1_ovf_isr → CAN_TX_TIMER) */
const REFRESH = ['AES1_LOCK → OID 2.2','AES2_LOCK → OID 2.3','EQ1_ENABLE → OID 3.2','EQ2_ENABLE → OID 3.3','MODE → OID 3.10','TONE_GENERATION1 → OID 3.5','TONE_GENERATION2 → OID 3.6','SIGNAL_STATUS → OID 2.1'];
function canList(){
  const out=[], ph=(D.slot*0.0173)%0.9, hb=C.HEARTBEAT*C.T1;
  let start=ph;
  if (D.bootAt!==null && D.bootAt<1){ const b=D.bootAt+bootLen(); out.push({t:b+0.002, n:1, dir:'tx', label:'card → MFC: CANMSG_TRAP 0x11, CANTRAP_RESTART (sent once: restart_sent)'}); start=b+0.002+hb; }
  let i=0;
  for (let t=start; t<1; t+=hb, i++){ if (D.restore) continue; if (D.bootAt!==null && t<D.bootAt && t+hb>D.bootAt) continue;
    out.push({t, n:1, dir:'tx', label:'card → MFC: CANMSG_REPORT_PARAM 0x10, '+REFRESH[(i+D.slot)%8]}); }
  for (let t=0.21; t<1; t+=0.5){ out.push({t, n:1, dir:'rx', label:'MFC → card: CANMSG_GET_PARAM 0x49 (DashBoard poll)'}); out.push({t:t+0.0005, n:1, dir:'tx', label:'card → MFC: reply 0xC9'}); }
  D.canQ.forEach(t=>{ out.push({t, n:1, dir:'rx', label:'MFC → card: CANMSG_SET_PARAM 0x4A'}); out.push({t:t+0.0004, n:1, dir:'tx', label:'card → MFC: reply 0xCA (OID + new value)'}); });
  return out.filter(f=>!booting(f.t)).sort((a,b)=>a.t-b.t);
}
function comAt(t){ return canList().some(f=>f.dir==='tx' && /REPORT|TRAP/.test(f.label) && t>=f.t && t<f.t+0.0012); }
/* ADDRESS_TABLE (ADC.c, non-MF6220 build): mid-band raw value per slot */
const SLOT_ADC = [1017,996,964,932,899,867,836,804,772,740,709,675,644,611,578,548,517,487,453,421];

/* ---------------- actions ---------------- */
function after(tr){ pass(); tr(`Next pass: aes1_lock = ${D.a1?'YES':'NO'}, aes2_lock = ${D.a2?'YES':'NO'}${input2()?'':' (input2 INACTIVE: not refreshed)'}; Card Status = “${cardStatus()[0]}”`); }
const A = {
  pressEq(k){ act(`Press EQ${k} switch (SW${k}) on the card edge`, tr=>{
    D.pressAt=SIM.t; D.pressSw=k; D.eq2Kicked=false;
    tr(`READ_SWITCHES: EQ${k}_SWITCH (PINE & BIT${k===1?2:6}) reads 0 → data_out |= BIT${k-1}`);
    tr('TRANSLATE_SWITCHES: pb_release == NO && pb == NO → pb = YES, eq_refresh = YES');
    const was = k===1?D.eq1:D.eq2; if (k===1) D.eq1=!was; else D.eq2=!was;
    tr(`TRANSLATE_EQ_PUSHBUTTONS: eq${k}_active ^= BIT0 → ${!was?'YES':'NO'}`);
    if (k===2 && !input2()) tr('PROCESS_MODES: mode == OUTPUT_1x8 → input2 INACTIVE, CS8416_write2 is skipped');
    else tr(`PROCESS_MODES: CS8416_write${k}(0x04, ${!was?'0x89':'0x80'}) → RXSEL = RXP${!was?1:0} (${!was?'EL5263 equaliser output IN'+k+'_EQ':'flat buffer output IN'+k})`);
    pass();
    if (k===2 && D.eq2Kicked) tr('ALTERA_write: mode == OUTPUT_1x8 → eq2_active = NO again in the same pass. PARAMETER_UPDATE reports OID 3.3 twice (on, then off)');
    else tr(`REFRESH_LEDS: EQ${k}_LED_${(k===1?D.eq1:D.eq2)?'ON':'OFF'} (PORTE bit ${k===1?3:7})`);
    tr(`On release: DEBOUNCE_PUSHBUTTONS waits ${C.DEBOUNCE} passes (≈${(C.DEBOUNCE*C.LOOP_T*1e3).toFixed(0)} ms ${inf('pass time')}) before another press counts`);
    after(tr);
  }); },
  plug(k){ const i=k===1?D.in1:D.in2; act(`${i.conn?'Unplug':'Connect'} IN${k} on the rear terminal block`, tr=>{
    i.conn=!i.conn;
    if (!reachesCard(k)) tr(`T6203 ISS1 wiring: terminal ${k} is BNC${k===1?9:10}_SIG, which the card does not use — the signal never reaches T1${k===1?'A':'B'}`);
    else if (k===2 && D.H3==='ref') tr('H3 selects the frame REF for input 2, so the rear IN2 pair only reaches the T1B/H2 termination');
    else tr(`IN${k}+/− → C${k===1?1:11} → T1${k===1?'A':'B'} PE-65612 → H${k} ${k===1?D.H1:D.H2} Ω → EL5263 U${k===1?1:3} → CS8416 U${k===1?5:6} ${phys(k)?'locks':'cannot lock'}`);
    tr(`CS8416_READ_LOCK_ALL: CS8416_read${k}(0x0C) ${phys(k)?'== 0':'!= 0'} → Astatus bit${k-1} = ${phys(k)?1:0} after INVERT_DATA`);
    pass();
    tr(`ALTERA_write: data_upper bit ${k===1?7:6} = INVERT_DATA(aes${k}_lock) & 1 = ${(k===1?D.a1:D.a2)?0:1}`);
    tr(`PARAMETER_UPDATE: aes${k}_lock != paes${k}_lock → report OID 2.${k+1}, then SIGNAL_STATUS (2.1)`);
    after(tr);
  }); },
  cable(k, len){ act(`IN${k} cable length → ${len} m`, tr=>{ (k===1?D.in1:D.in2).len=+len;
    const l=levelAt(k,false), le=levelAt(k,true);
    tr(`At the CS8416: ${l==null?'no signal':l.toFixed(1)+' dB flat (RXP0), '+le.toFixed(1)+' dB through the EQ (RXP1)'}; lock limit ${C.THRESH} dB ${inf('loss per metre and the receiver limit')}`);
    tr(`Input ${k} ${phys(k)?'locks':'does NOT lock'}${!phys(k)&&!(k===1?D.eq1:D.eq2)&&le!=null&&le>C.THRESH?' — press EQ'+k+' to switch to the equalised path':''}`);
    after(tr); }); },
  fs(k, fs){ act(`IN${k} source sample rate → ${fs/1000} kHz`, tr=>{ (k===1?D.in1:D.in2).fs=+fs;
    tr('The CS8416 re-locks; the FPGA re-encodes the stream at the same rate. Cable loss is worse at higher rates (the bit cell is shorter) '+inf('√f loss model'));
    pass(); if (D.mode===2 && D.a2) tr(`1×8 SRC: AD1895 converts ${srcOf(1).fs/1000} kHz → ${srcOf(2).fs/1000} kHz (ratio ${(srcOf(2).fs/srcOf(1).fs).toFixed(4)})`);
    if (D.tone1||D.tone2) tr(`tone_gen1 steps a 48-entry table once per frame: ${(fs/48).toFixed(0)} Hz at this rate`);
    after(tr); }); },
  dash(id, v){
    const ro = !dashEnabled() && ['mode','eq1','eq2','tone1','tone2','src','sel2'].includes(id);
    const map = {
      eq1:['AES Input 1 · Equalizer','3.2', ()=>{ D.eq1=!!v; }],
      eq2:['AES Input 2 · Equalizer','3.3', ()=>{ D.eq2=!!v; }],
      tone1:['AES Input 1 · Tone Generator','3.5', ()=>{ if (D.mode!==2) D.tone1=!!v; }],
      tone2:['AES Input 2 · Tone Generator','3.6', ()=>{ if (D.mode===1) D.tone2=!!v; }],
      mode:['Mode','3.10', ()=>{ D.mode=+v===0?0:+v===1?1:2; }],
      alarm:['Notify on Card Fault','4.0', ()=>{ D.alarm=(v==='1'||v===true||v===1); }],
      save:['Save Settings','3.1', ()=>{ D.eeprom={valid:true, mode:D.mode, t1:D.tone1?1:0, t2:D.tone2?1:0}; }],
      reboot:['Reboot','CANMSG_REBOOT 0x43', ()=>{}],
      restore7:['hidden OID 0xFF.07','FF.07', ()=>{ D.restore = v?1:0; }],
      restore8:['hidden OID 0xFF.08','FF.08', ()=>{ D.restore = (v?0:1); }],
    };
    const e=map[id]; if (!e) return;
    if (id==='reboot'){ A.reboot(); return; }
    act(`DashBoard: ${e[0]}${id==='save'?'':' → '+(id==='mode'?MODES[+v]:id==='alarm'?(D.alarm!==undefined&&(v==='1'||v===true)?'Enabled':'Disabled'):id.startsWith('restore')?(v?'1':'0'):(v?'Enabled':'Disabled'))}`, tr=>{
      tr(`can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP: CANMSG_SET_PARAM (0x4A), OID ${e[1]}`);
      if (ro){ tr('dashboard_enabled == NO (SW8 was ON at boot): the handler echoes the current value and changes nothing'); D.canQ.push(SIM.t); return; }
      e[2]();
      if (id==='eq1'||id==='eq2'){ const k=id==='eq1'?1:2; tr(`eq${k}_active = ${v?'YES':'NO'}`); pass(); if (k===2&&D.mode===0) tr('ALTERA_write: mode == OUTPUT_1x8 → eq2_active = NO (forced on every pass)'); else tr(`PROCESS_MODES: CS8416_write${k}(0x04, ${v?'0x89':'0x80'}); EQ${k} LED ${v?'on':'off'}`); }
      if (id==='tone1') tr(D.mode===2? 'mode == OUTPUT_1x8_SRC → the handler leaves tone_generation1 alone and echoes NO' : `tone_generation1 = ${v?'YES':'NO'} → ALTERA_write data_lower bit2 = ${v?0:1} (0 = tone on group 1)`);
      if (id==='tone2') tr(D.mode!==1? 'mode != OUTPUT_2x4 → tone_generation2 stays NO' : `tone_generation2 = ${v?'YES':'NO'} → data_lower bit3 = ${v?0:1} (0 = tone on group 2)`);
      if (id==='mode'){ pass(); const r=routes(); tr(`mode = ${MODEC[D.mode]} (any value other than 0 or 1 becomes OUTPUT_1x8_SRC)`); tr(`PROCESS_MODES: input2 ${input2()?'ACTIVE':'INACTIVE'}${D.mode===0?'; ALTERA_write forces tone_generation2 = NO, eq2_active = NO':D.mode===2?'; ALTERA_write forces both tones NO':''}`);
        if (D.a2) { D.srcReset=C.SRC_CONSTANT; tr(`PARAMETER_UPDATE: mode != pmode and aes2_lock == YES → src_reset = YES for ${C.SRC_CONSTANT} passes (data_lower bit5 low)`); }
        const w=ctlWord(); tr(`ALTERA_write: data_lower = ${bin8(w.lo)}b → group 1 ← ${r.g1.kind}, group 2 ← ${r.g2.kind}`); }
      if (id==='alarm') tr(`smpte_alarm_enabled = ${D.alarm?1:0} (not saved to EEPROM; back to 0 after every reset)`);
      if (id==='save') tr(`save_settings = INVERT_DATA(value) → main loop: SAVE_INFORMATION_EEPROM: [10]=0xAA, [11]=mode ${D.mode}, [13]=tone1 ${D.eeprom.t1}, [14]=tone2 ${D.eeprom.t2} (EQ and Notify are not saved)`);
      if (id.startsWith('restore')) tr(`restore_start = ${D.restore} → CAN_TX_TIMER ${D.restore?'stops sending REPORT_PARAM / SIGNAL_STATUS (only replies go out)':'resumes the round-robin status reports'}`);
      D.canQ.push(SIM.t); after(tr);
    });
  },
  reboot(){ act('DashBoard: Reboot (CANMSG_REBOOT 0x43)', tr=>{
    D.bootAt=SIM.t; D.lat=[D.dip[6],D.dip[7]];
    tr('Dashboard.c: reboot_device = YES → CAN_FUNCTIONS: CLI(); while(1); — no WDR, the watchdog (WDTCR = 0x08) resets the AVR');
    tr('C start-up re-initialises RAM: eq1/eq2_active = NO, smpte_alarm_enabled = NO, mode = 0, restart_sent = NO, restore_start = NO');
    D.eq1=false; D.eq2=false; D.alarm=false; D.restore=0; D.mode=0; D.tone1=false; D.tone2=false; D.a1=false; D.a2=false;
    tr(`main(): CAN_RX (LBK high) → 5 × wait(3000) → 100 ADC samples of AN_SLOTID → slot ${D.slot} → 5 × wait → 100 more samples (the slot is read twice) → ALTERA_RESET(1000) → 5 × wait → init_CS8416 (5 more waits)`);
    tr(`READ_DIP_SWITCHES: SW7 ${D.dip[6]?'OFF':'ON'} → dip_switch_enabled = ${dipEnabled()?'YES':'NO'}; SW8 ${D.dip[7]?'OFF':'ON'} → dashboard_enabled = ${dashEnabled()?'YES':'NO'}`);
    if (dipEnabled()){ D.mode=dipMode(); D.tone1=D.dip[2]===0; D.tone2=D.dip[3]===0; tr(`dip_switch_enabled == YES → mode and tones from SW1–SW4: ${MODES[D.mode]}${D.eeprom.valid?' (the EEPROM copy is ignored)':''}`); }
    else if (D.eeprom.valid){ D.mode=D.eeprom.mode; D.tone1=!!D.eeprom.t1; D.tone2=!!D.eeprom.t2; tr(`RESTORE_INFORMATION_EEPROM: [10] == 0xAA → mode ${MODES[D.mode]}, tone1 ${D.eeprom.t1}, tone2 ${D.eeprom.t2}`); }
    else tr('RESTORE_INFORMATION_EEPROM: [10] != 0xAA (never saved) → defaults');
    tr(`moduleAddress(${D.slot}) → DATA_SETUP → CANinit (1 Mbit/s) → CAN_TX → ALTERA_write → while(1). First transmission: CANMSG_TRAP / CANTRAP_RESTART, once`);
    tr(`Boot ≈ ${(bootLen()*1000).toFixed(0)} ms ${inf('wait(3000) ≈ 2.6 ms')}`);
    pass(); D.canQ=[];
  }); },
  dipToggle(i){ act(`DIP SW3-${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{
    D.dip[i]=D.dip[i]?0:1;
    tr(`READ_DIP_SWITCHES: dip_switches = MIRROR(PINA) = ${bin8(dipBits())}b (net ${['OUT1_1SW','OUT1_2SW','OUT1_3SW','OUT1_4SW','OUT2_1SW','OUT2_2SW','OUT2_3SW','OUT2_4SW'][i]}, PA${7-i})`);
    if (i>=6) tr('SW7/SW8 are only looked at in main() at power-up. Reboot to apply.');
    else if (dipEnabled() && !dashEnabled()){ pass(); tr(`ALTERA_write: DIP in control → mode ${MODES[D.mode]}, tone1 ${D.tone1?'on':'off'}, tone2 ${D.tone2?'on':'off'}`); }
    else tr(`ALTERA_write only obeys SW1–SW4 when dip_switch_enabled == YES and dashboard_enabled == NO (SW7 OFF and SW8 ON at boot). Now: ${dipEnabled()?'YES':'NO'} / ${dashEnabled()?'YES':'NO'} → ignored`);
    after(tr); }); },
  jumper(which, v){ act(`Jumper ${which} → ${v}`, tr=>{
    if (which==='H1') D.H1=+v; else if (which==='H2') D.H2=+v; else if (which==='H3') D.H3=v; else D.H4=v;
    if (which==='H1'||which==='H2') tr(`H${which[1]} links T1${which==='H1'?'A':'B'} pin 3 to ${+v===75?'R'+(which==='H1'?8:30)+' 75 Ω':'R'+(which==='H1'?9:31)+' 110 Ω'} — ${+v===110?'matched to a 110 Ω AES3 pair':'75 Ω: a 3.5 dB mismatch on a 110 Ω pair '+inf('loss figure')}`);
    if (which==='H3') tr(`H3 pin 2 (R29 → EL5263 U3) now joins ${v==='ref'?'pin 3: REF from the Q2 emitter follower (C58)':'pin 1: T1B / rear IN2'}`);
    if (which==='H4') tr(`H4 feeds midplane ${v==='ref1'?'REF1 (P2-14)':'REF2 (P2-10)'} to R61 → Q2 2N4401 → C58 → REF`);
    after(tr); }); },
  rear(r){ act(`Fit T6203 ${r==='iss2'?'ISS2/ISS3':'ISS1'}`, tr=>{ D.rear=r;
    tr(r==='iss2'? 'T6203-iss2.net: TB1/TB2 = BNC1/BNC2 SIG+GND (the two balanced inputs), TB3–TB10 = AES1, AES5, AES2, AES6 … AES8 — the D6202B-T6203.cdr pinout':'T6203.net (ISS1): TB1–TB8 = AES1–AES8, TB9/TB10 = BNC9/BNC10. The D6202B has nothing on BNC9/10, so both inputs are lost and the outputs move');
    tr('Both issues carry AN_BMID 3K57 / AN_BMID2 9K76; the D6202B firmware never reads AN_BMID (ADC1/ADC2) anyway');
    after(tr); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; const raw=SLOT_ADC[n-1];
    tr(`At boot the AN_SLOTID divider (P2-6) is sampled 2 × 100 times; the average ≈ ${raw} → ADDRESS_TABLE() → slot_address = ${n}`);
    tr(`moduleAddress(${n}) → mod_address is part of every CAN ID: CAN_FRAME_ID_HIGH = (mod_address << 6) | destination`);
    tr(`While DashBoard is busy (≥ 10 frames/s) reports are paced by TX_INITIALIZE = 1000 × slot = ${1000*n} timer1 ticks (≈${(1000*n*C.T1).toFixed(2)} s)`); }); },
  refToggle(n){ act(`Frame REF ${n} ${D.ref[n]?'removed':'connected'}`, tr=>{ D.ref[n]=!D.ref[n];
    tr(`Midplane REF${n} (P2-${n===1?14:10}) ${D.ref[n]?'now carries':'no longer carries'} an AES reference ${inf('the midplane REF lines carry an AES/DARS reference here')}; ${D.H3==='ref'&&D.H4==='ref'+n?'it is selected by H3/H4':'not selected by H3/H4'}`);
    after(tr); }); },
  reset(){ Object.assign(D,{eq1:false,eq2:false,mode:0,tone1:false,tone2:false,alarm:false,H1:110,H2:110,H3:'rear',H4:'ref1',rear:'iss2',slot:4,bootAt:null,restore:0,srcReset:0,eq2Kicked:false,eeprom:{valid:false,mode:0,t1:0,t2:0}});
    Object.assign(D.in1,{conn:true,fs:48000,len:50}); Object.assign(D.in2,{conn:true,fs:48000,len:100}); D.ref={1:true,2:false}; D.dip=[1,1,1,1,1,1,1,1]; D.lat=[1,1]; D.log=[]; D.canQ=[]; pass(); SIM.refresh(); },
};
pass();

/* ---------------- drawing: the real card (D6202A-ISS4 gerbers; the D6202B is this PCB fully stuffed) ---------------- */
/* 120 dpi, board x −0.05…12.84 in, y −0.05…3.075 in → 1546 × 375. Card edge (front) on the left, P1/P2 (rear) on the right.
   Part centres from D6202B-iss3-T.prg: px = 60 + (X + 0.095)·120, py = 47 + (Y + 2.2)·120. */
const PNPP = {L2:[60,47],L3:[60,69.8],L4:[60,92.6],L5:[60,124.4],L6:[60,149],L7:[60,173.6],L8:[147,218],L9:[147,233],SW1:[94.2,70.2],SW2:[94.7,149.2],
  U1:[1320.6,60.1],U3:[1308,120.3],U5:[1152.2,77.1],U6:[1069.4,77.6],U7:[853.6,167.6],U8:[1444,328.5],U9:[1146,288],U10:[1115.3,183.2],U11:[1007.3,183.4],U12:[1204,279.1],U13:[1214.9,214.9],X2:[1061.3,265],Q2:[1313,335]};
const XF = {T1:[1446,192],T2:[1400,192],T3:[1354,192],T4:[1308,192],T5:[1446,258],T6:[1400,258],T7:[1354,258],T8:[1308,258],T1A:[1430,58],T1B:[1430,112]};
function cardSVG(t){
  const L=leds(t), r=routes(), w=ctlWord(), on=(x,c)=>x?c:'#30332f';
  let s=`<svg viewBox="0 0 1546 375" role="img" aria-label="D6202B card (D6202A ISS4 PCB), top side, real gerber artwork" style="width:100%;display:block;border-radius:6px;background:var(--panel2)">
   <defs><filter id="d62bglow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <image href="${ASSET}d6202b-pcb.png" width="1546" height="375"/><image href="${ASSET}d6202b-silk.png" width="1546" height="375" opacity=".93"/>`;
  [['L2',L.l1,'#5dff5a','LOCK1'],['L3',L.n1,'#ff4a3d','NO LOCK1'],['L4',L.e1,'#ffd23a','EQ1'],['L5',L.l2,'#5dff5a','LOCK2'],['L6',L.n2,'#ff4a3d','NO LOCK2'],['L7',L.e2,'#ffd23a','EQ2'],['L8',L.com,'#5dff5a','COM ACTIVITY'],['L9',L.err,'#ff4a3d','ERROR']].forEach(([k,v,c,n])=>{ const [x,y]=PNPP[k];
    s+=`<rect x="${x-9}" y="${y-5}" width="18" height="10" rx="2" fill="${on(v,c)}" ${v?'filter="url(#d62bglow)"':''}><title>${k} ${n}: ${v?'lit':'off'}</title></rect>`; });
  [['SW1',1],['SW2',2]].forEach(([k,n])=>{ const [x,y]=PNPP[k], dn=D.pressSw===n&&D.pressAt!=null&&SIM.t-D.pressAt>=0&&SIM.t-D.pressAt<0.05;
    s+=`<g class="og62-hot" data-sw="eq${n}"><title>${k} EVQPP — EQ${n} push-button (click)</title><rect class="hl" x="${x-11}" y="${y-13}" width="22" height="26" rx="3" fill="#cfcfc6" stroke="#555"/><circle cx="${x}" cy="${y}" r="${dn?5:7}" fill="#8d8d86"/></g>`; });
  // SW3 219-8MS: pad columns 419.5 … 503.5 (12 px pitch), body y 81–107. Switch 1 at the left and ON = up: inferred
  for (let i=0;i<8;i++){ const x=419.5+i*12, v=D.dip[i];
    s+=`<g class="og62-hot" data-dip="${i}"><title>SW3-${i+1}: ${v?'OFF':'ON'} — click to flip</title><rect class="hl" x="${x-5}" y="81" width="10" height="26" rx="1.5" fill="#c0392b" stroke="#6d1d14"/><rect x="${x-3.5}" y="${v?94:83}" width="7" height="11" fill="#f2f2ee"/></g>`; }
  s+=`<text x="413" y="78" font-size="9" fill="#ffd36a">ON ↑ ${'(inferred)'}</text>`;
  const jv=(x,y,k,top,title)=>`<g class="og62-hot" data-jp="${k}"><title>${title} — click to move</title><rect class="hl" x="${x-6}" y="${y-14}" width="12" height="28" rx="2" fill="#111" stroke="#777"/><rect x="${x-5}" y="${top?y-13:y}" width="10" height="13" rx="2" fill="#e8c23a"/></g>`;
  const jh=(x,y,k,right,title)=>`<g class="og62-hot" data-jp="${k}"><title>${title} — click to move</title><rect class="hl" x="${x-19}" y="${y-6}" width="38" height="12" rx="2" fill="#111" stroke="#777"/><rect x="${right?x:x-18}" y="${y-5}" width="18" height="10" rx="2" fill="#e8c23a"/></g>`;
  s+= jv(1389,58,'H1',D.H1===75,`H1 input-1 termination: ${D.H1} Ω (pins 1–2 = 75 Ω R8, 2–3 = 110 Ω R9)`) + jv(1381,107,'H2',D.H2===75,`H2 input-2 termination: ${D.H2} Ω`)
     + jv(1368,107,'H3',D.H3==='rear',`H3 input-2 source: ${D.H3==='rear'?'rear IN2 (pins 1–2)':'frame REF (pins 2–3)'} — pin order inferred`) + jh(1371,330,'H4',D.H4==='ref1',`H4 frame reference: ${D.H4==='ref1'?'REF1 (pins 1–2)':'REF2 (pins 2–3)'}`);
  // live signal on the transformers: inputs T1A/T1B, outputs T1–T4 (group 1) and T5–T8 (group 2)
  const live=(k,ok)=>{ const [x,y]=XF[k]; return `<circle cx="${x+16}" cy="${y-20}" r="5" fill="${ok?'#5dff5a':'#555'}" stroke="#000"><title>${k}: ${ok?'signal':'idle / muted'}</title></circle>`; };
  s+= live('T1A', phys(1)) + live('T1B', D.H3==='rear'? phys(2) : (srcOf(2).conn && reachesCard(2) && D.in2.conn));
  ['T1','T2','T3','T4'].forEach(k=>s+=live(k, r.g1.ok&&!booting(t))); ['T5','T6','T7','T8'].forEach(k=>s+=live(k, r.g2.ok&&!booting(t)));
  if (D.labels){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke" text-anchor="middle">${txt}</text>`;
    s+= lab(853,215,'AT90CAN128') + lab(1115,238,'EP1C3') + lab(1069,52,'CS8416 #2') + lab(1152,52,'CS8416 #1') + lab(1146,322,'AD1895 SRC') + lab(1212,250,'DS34LV87T ×2') + lab(1314,92,'EL5263 EQ') + lab(1377,152,'8 × PE-65612') + lab(1430,30,'IN xfmrs') + lab(1061,296,'24.576 MHz') + lab(462,135,'SW3 DIP') + lab(1500,170,'P1') + lab(1500,360,'P2');
  }
  if (booting(t)) s+=`<text x="300" y="200" font-size="22" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">main() initialising — LEDs dark, CAN in loop-back (LBK)</text>`;
  s+=`<text x="1540" y="370" text-anchor="end" font-size="10" fill="#9aa">gerbers: D6202A-ISS4 TOP/TSM/TSS (logo blanked) · word ${bin8(w.up)} ${bin8(w.lo)}</text></svg>`;
  return s;
}
function edgeSVG(t){
  const L=leds(t);
  const ls=[{name:'Lock 1',c:'g',on:L.l1,y:60},{name:'No Lock 1',c:'r',on:L.n1,y:100},{name:'EQ 1',c:'y',on:L.e1,y:140},
    {name:'Lock 2',c:'g',on:L.l2,y:200},{name:'No Lock 2',c:'r',on:L.n2,y:240},{name:'EQ 2',c:'y',on:L.e2,y:280},
    {name:'COM Activity',c:'g',on:L.com,y:350,title:'COM_ACTIVITY_LED_ON in CAN_TX_TIMER'},{name:'Error',c:'r',on:L.err,y:390,title:'never driven: every COM_ERROR_LED_ON is commented out'}];
  const sws=[{id:'eq1',name:'EQ1 Switch',y:80,state:D.eq1?'EQ IN':'EQ OUT',down:D.pressSw===1&&D.pressAt!=null&&SIM.t-D.pressAt>=0&&SIM.t-D.pressAt<0.05},{id:'eq2',name:'EQ2 Switch',y:220,state:D.eq2?'EQ IN':'EQ OUT',down:D.pressSw===2&&D.pressAt!=null&&SIM.t-D.pressAt>=0&&SIM.t-D.pressAt<0.05}];
  return K.edgeSVG({art:ART.edge, label:PID, leds:ls, sws, note:'Artwork: D6202A-card-edge.cdr (dual card)'});
}
/* Rear module T6203 (labels from D6202B-T6203.cdr; wiring from T6203-iss2.net / T6203.net as used by t6203.js) */
function rearCells(){
  const r=routes(), bt=booting(SIM.t), lv=g=> bt?'off' : r[g].ok? true : 'err';
  const inLive=k=>{ const i=k===1?D.in1:D.in2; return i.conn? (phys(k)||(k===2&&D.H3==='ref')?true:'warn') : undefined; };
  if (D.rear==='iss2'){
    const c=[{n:1,label:'IN1',kind:'tb',id:'in1',conn:D.in1.conn,live:inLive(1)},{n:2,label:'IN 2',kind:'tb',id:'in2',conn:D.in2.conn,live:inLive(2),title:D.H3==='ref'?'H3 selects the frame REF instead':''}];
    for (let k=0;k<4;k++){ c.push({n:3+2*k,label:`OUT1-${k+1}`,kind:'tb',live:lv('g1'),title:`AES${k+1} pair`}); c.push({n:4+2*k,label:`OUT2-${k+1}`,kind:'tb',live:lv('g2'),title:`AES${k+5} pair`}); }
    return c;
  }
  const c=[]; for (let n=1;n<=8;n++) c.push({n,label:`AES${n} = OUT${n<=4?1:2}-${(n-1)%4+1}`,kind:'tb',live:lv(n<=4?'g1':'g2')});
  c.push({n:9,label:'BNC9 (IN1 wired here)',kind:'tb',id:'in1',conn:D.in1.conn,live:D.in1.conn?'err':undefined,title:'card has no BNC9 connection'});
  c.push({n:10,label:'BNC10 (IN2 wired here)',kind:'tb',id:'in2',conn:D.in2.conn,live:D.in2.conn?'err':undefined});
  return c;
}
/* CorelDRAW artwork (artwork pass 2026|59): card edge and rear modules converted from the archive .cdr files
   to assets/d6202b-*.svg; LED, switch and connector positions are the artwork's own coordinates (pt). */
const ART={edge:{"vb":[63,129,225,311],"led":[[179.7,135.58,5.74,12.58],[179.7,156.74,5.74,12.58],[179.81,179.93,5.74,12.58],[179.7,207.85,5.74,12.58],[179.7,229.0,5.74,12.58],[179.81,252.19,5.74,12.58],[179.7,296.04,5.74,12.58],[179.81,319.23,5.74,12.58]],"sw":[[179.64,138.61,15.87,27.94],[179.64,210.87,15.87,27.94]],"href":"d6202b-edge.svg"},
 rear:{"iss1":{"vb":[205,250,187,324],"pos":{"1":[274.78,311.0],"2":[324.53,311.0],"3":[274.78,348.0],"4":[324.53,348.0],"5":[274.78,385.0],"6":[324.53,385.0],"7":[274.78,421.0],"8":[324.53,421.0],"9":[274.78,458.0],"10":[324.53,458.0]},"s":2.41,"panel":[250.1,273.7,95.4,223.2],"href":"d6202b-rear-t6203.svg"},
  "iss2":{"vb":[205,250,187,324],"pos":{"1":[274.78,311.0],"2":[324.53,311.0],"3":[274.78,348.0],"4":[324.53,348.0],"5":[274.78,385.0],"6":[324.53,385.0],"7":[274.78,421.0],"8":[324.53,421.0],"9":[274.78,458.0],"10":[324.53,458.0]},"s":2.41,"panel":[250.1,273.7,95.4,223.2],"href":"d6202b-rear-t6203.svg"}},
 edgeCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-card-edge.cdr','D6202A-card-edge.cdr (2008-05-08; no D6202B card-edge file exists)'),
 rearCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202B-T6203.cdr','D6202B-T6203.cdr (2008-10-08)')};
function rearSVG(){ return K.rearSVG({art:ART.rear[D.rear], name:'T6203', sub:D.rear==='iss2'?'ISS2/ISS3 · DFR-8310 single card':'ISS1 wiring (pinout mismatch)', cells:rearCells(), id:'AN_BMID 3K57 · AN_BMID2 9K76 (both issues)'}); }
function dipSVG(){
  const lab=['Mode bit (+2)','Mode bit (+1)','Tone 1','Tone 2','not read','not read','DIP / EEPROM at boot','DashBoard enable'];
  let s=`<svg viewBox="0 0 520 215" style="width:100%;max-width:520px"><rect x="10" y="10" width="300" height="70" rx="4" fill="#c0392b"/><text x="16" y="24" font-size="10" fill="#fff">ON ▲  SW3 (219-8MS)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g class="og62-hot" data-dip="${i}"><title>SW3-${i+1}: ${lab[i]} — ${v?'OFF':'ON'} (click)</title><rect x="${x}" y="30" width="22" height="42" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?52:33}" width="16" height="16" fill="#222"/><text x="${x+11}" y="94" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  lab.forEach((l,i)=>{ s+=`<text x="330" y="${22+i*18}" font-size="10.5" fill="var(--ink2)">${i+1}: ${l}</text>`; });
  s+=`<text x="10" y="168" font-size="10.5" fill="var(--ink2)">From v100w.c / ALTERA_write (no D6202B DIP drawing). SW1+SW2: OFF/OFF 1×8 · OFF/ON 2×4 · ON/x SRC</text>
    <text x="10" y="186" font-size="10.5" fill="var(--ink2)">Schematic nets still call them OUT1_1SW … OUT2_4SW (U7 PA7 … PA0)</text>
    <text x="10" y="204" font-size="10.5" fill="var(--accent)">Boot: dip_sw_en=${dipEnabled()?'YES':'NO'} · dash_en=${dashEnabled()?'YES':'NO'} → ${dipEnabled()&&!dashEnabled()?'DIP rules every pass':dipEnabled()?'DIP once at boot, then DashBoard':'EEPROM at boot, then DashBoard'}</text></svg>`;
  return s;
}
function dashHTML(){
  const cs=cardStatus(), ro=!dashEnabled(), i1=oidIn(1), i2=oidIn(2);
  const settings=[{type:'combo',id:'alarm',label:'Notify on Card Fault',value:D.alarm?1:0,options:[[1,'Enabled'],[0,'Disabled']],oid:'4.0'},
    {type:'combo',id:'mode',label:'Mode',value:D.mode,options:[[0,'1x8'],[1,'2x4'],[2,'1x8 w/ SRC']],oid:'3.10'},
    {type:'sec',label:'AES Input 1 <span class="muted small">(7.11, title header “Metadata”)</span>'},{type:'toggle',id:'eq1',label:'Equalizer',value:D.eq1,on:'Enabled',off:'Disabled',oid:'3.2'},{type:'toggle',id:'tone1',label:'Tone Generator',value:D.tone1,on:'Enabled',off:'Disabled',oid:'3.5'},
    {type:'sec',label:'AES Input 2 <span class="muted small">(7.12)</span>'},{type:'toggle',id:'eq2',label:'Equalizer',value:D.eq2,on:'Enabled',off:'Disabled',oid:'3.3'},{type:'toggle',id:'tone2',label:'Tone Generator',value:D.tone2,on:'Enabled',off:'Disabled',oid:'3.6'}];
  if (!ro) settings.push({type:'button',id:'save',label:'Settings',text:'Save',oid:'3.1'});
  settings.push({type:'text',label:'AD Result',value:String(SLOT_ADC[D.slot-1])+' (raw AN_SLOTID ADC)',oid:'3.8'});
  const tabs=[
    {name:'Card Info', rows:[{type:'text',label:'Product',value:PID,oid:'1.5'},{type:'text',label:'Name',value:'Dual Balanced AES Audio Distribution Amplifier',oid:'1.7'},{type:'text',label:'Manufacturer',value:'Ward-Beck Systems',oid:'1.2'},{type:'text',label:'Software Rev',value:'1.00',oid:'1.11'},{type:'text',label:'Website',value:'www.ward-beck.com',oid:'1.4'}]},
    {name:'Card Status', rows:[{type:'status',label:'Card Status',value:cs[0],level:cs[1],oid:'2.1'},{type:'status',label:'AES Input #1',value:i1[1],level:i1[2],oid:'2.2'},{type:'status',label:'AES Input #2',value:i2[1],level:i2[2],oid:'2.3'},
      {type:'text',label:'raw values',value:`2.1 = 0x${hex2(cs[2])} · 2.2 = 0x${hex2(i1[0])} · 2.3 = 0x${hex2(i2[0])}`}]},
    {name:'Card Settings', rows:settings, note: ro?'SW8 was ON at boot: dashboard_enabled = NO → Menu3OID (no Save button); every SET is echoed back unchanged.':'Menu1OID order: 4.0, 3.10, 7.11, 3.2, 3.5, 7.12, 3.3, 3.6, 3.1, 3.8.'},
    {name:'Hidden OIDs', rows:[{type:'sec',label:'Answered by the firmware, not in any menu'},{type:'combo',id:'restore7',label:'0xFF.07 → restore_start = value',value:D.restore,options:[[0,'0'],[1,'1']],oid:'FF.07'},{type:'combo',id:'restore8',label:'0xFF.08 → restore_start = NOT value',value:D.restore?0:1,options:[[0,'0'],[1,'1']],oid:'FF.08'},{type:'text',label:'restore_start',value:D.restore?'1 — status reports suppressed':'0 — status reports running'},{type:'text',label:'3.4 SRC Enable · 3.11 AES2 · 7.13 “Outputs”',value:'defined, past the 18-OID count'}], note:'Who sends 0xFF.07/0xFF.08 is not documented '+inf('probably the frame controller around a settings restore')+'.'},
  ];
  return K.dashHTML({key:PID, title:`Slot ${D.slot}: ${PID}`, alarm:cs[1]==='err', tree:[{name:'DFR-8310 frame'},{name:'MFC-8310 frame controller',lvl:1},{name:`Slot ${D.slot}: ${PID}`,lvl:1,sel:true}], tabs, footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload…'}], foot:'V100 · BOARD_ISSUE 3'+(D.eeprom.valid?' · EEPROM saved (mode '+MODES[D.eeprom.mode]+')':'')});
}
function bindAll(root){
  K.bind(root, {sw:{eq1:()=>A.pressEq(1), eq2:()=>A.pressEq(2)}, jack:{in1:()=>A.plug(1), in2:()=>A.plug(2)}, slot:n=>A.slot(n),
    dash:(id,v)=>{ if (id==='upload'){ act('DashBoard: Upload…', tr=>{ tr('CANMSG_START_UPGRADE 0x40 → reply CAN_UPGRADE_WAIT, 0x03E8; reboot_device = YES, upgrade_device = YES → Ross OGP bootloader'); tr('zeuspack /f wbs_ztcpack.txt → bin/D6202b_v1_00.bin, product “D6202B”, compat 0.0.255.255 (the bin/ folder is empty in the archive)'); tr('CANMSG_UPGRADE_PAGE 0x41 × 256-byte pages → CANMSG_VERIFY_UPGRADE 0x42 → CANMSG_REBOOT 0x43'); }); return; }
      if (id==='restore7'||id==='restore8') v=+v; A.dash(id, v); }});
  root.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dipToggle(+g.dataset.dip)));
  root.querySelectorAll('[data-jp]').forEach(g=>g.addEventListener('click',()=>{ const k=g.dataset.jp;
    if (k==='H1') A.jumper('H1', D.H1===110?75:110); else if (k==='H2') A.jumper('H2', D.H2===110?75:110); else if (k==='H3') A.jumper('H3', D.H3==='rear'?'ref':'rear'); else A.jumper('H4', D.H4==='ref1'?'ref2':'ref1'); }));
}
function inputCtlHTML(){
  const one=k=>{ const i=k===1?D.in1:D.in2; return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:3px 0"><b>IN${k}</b>
    <button data-x="plug${k}">${i.conn?'Unplug':'Connect'}</button>
    <label>cable <select data-x="len${k}">${[2,50,100,200,250,300,400,500].map(v=>`<option ${v===i.len?'selected':''}>${v}</option>`).join('')}</select> m</label>
    <label>rate <select data-x="fs${k}">${FS_LIST.map(v=>`<option value="${v}" ${v===i.fs?'selected':''}>${v/1000} kHz</option>`).join('')}</select></label>
    <label>H${k} <select data-x="term${k}">${[110,75].map(v=>`<option ${v===(k===1?D.H1:D.H2)?'selected':''}>${v}</option>`).join('')}</select> Ω</label></div>`; };
  return one(1)+one(2)+`<div class="small" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">
    <label>H3 <select data-x="h3"><option value="rear" ${D.H3==='rear'?'selected':''}>IN2 from rear</option><option value="ref" ${D.H3==='ref'?'selected':''}>IN2 from frame REF</option></select></label>
    <label>H4 <select data-x="h4"><option value="ref1" ${D.H4==='ref1'?'selected':''}>REF1</option><option value="ref2" ${D.H4==='ref2'?'selected':''}>REF2</option></select></label>
    <button data-x="ref1">REF1 ${D.ref[1]?'on':'off'}</button><button data-x="ref2">REF2 ${D.ref[2]?'on':'off'}</button>
    <label>Rear <select data-x="rear"><option value="iss2" ${D.rear==='iss2'?'selected':''}>T6203 ISS2/3</option><option value="iss1" ${D.rear==='iss1'?'selected':''}>T6203 ISS1</option></select></label>
    <button data-x="labels">${D.labels?'Hide':'Show'} chip labels</button><button data-x="reset">Factory defaults</button></div>`;
}
function bindInputs(root){
  root.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x;
    const f=()=>{ if (x==='plug1') A.plug(1); else if (x==='plug2') A.plug(2); else if (x.startsWith('len')) A.cable(+x[3], +el.value); else if (x.startsWith('fs')) A.fs(+x[2], +el.value);
      else if (x==='term1') A.jumper('H1', +el.value); else if (x==='term2') A.jumper('H2', +el.value); else if (x==='h3') A.jumper('H3', el.value); else if (x==='h4') A.jumper('H4', el.value);
      else if (x==='rear') A.rear(el.value); else if (x==='ref1') A.refToggle(1); else if (x==='ref2') A.refToggle(2); else if (x==='labels'){ D.labels=!D.labels; SIM.refresh(); } else if (x==='reset') A.reset(); };
    if (el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; });
}

/* ---------------- timeline ---------------- */
function lanes(){
  const css=SIM.css, ls=[];
  [1,2].forEach(k=>{ const s=srcOf(k);
    ls.push({label:`IN${k}${s.ref?' (REF'+s.ref+')':''}: AES3 @ ${s.fs/1000} kHz`, h:26, draw(c,X,t0,t1,y,h){ if(!phys(k)){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText(!s.conn?'not connected':!reachesCard(k)?'not wired to the card (T6203 ISS1)':'no lock (cable too long / termination / EQ off)', X(t0)+6, y+h/2+4); return; }
      if (t1-t0<400/s.fs) SIM.pulses(c,X,t0,t1,y,h,1/s.fs,0,0.5/s.fs,css('--accent'),'frames'); else SIM.pulses(c,X,t0,t1,y,h,192/s.fs,0,1/s.fs,css('--warn'),'192-frame blocks (Z preamble)'); }}); });
  ls.push({label:'AVR main loop (v100w.c)', h:30, draw(c,X,t0,t1,y,h){
    const px=X(t0+C.LOOP_T)-X(t0);
    if (D.bootAt!==null && D.bootAt<t1 && D.bootAt+bootLen()>t0){ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(Math.max(t0,D.bootAt)),y+3,X(Math.min(t1,D.bootAt+bootLen()))-X(Math.max(t0,D.bootAt)),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('main(): 20 × wait(3000), 2 × 100 slot ADC samples, init_CS8416, CANinit', Math.max(X(t0),X(D.bootAt))+4, y+h/2+4); }
    if (px<2){ c.fillStyle=css('--accent'); c.globalAlpha=.3; c.fillRect(X(t0),y+8,X(t1)-X(t0),h-16); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`≈${Math.round((t1-t0)/C.LOOP_T).toLocaleString()} passes of ≈${C.LOOP_T*1e6} µs (inferred)`, X(t0)+6, y+h/2+4); return; }
    const p0=Math.floor(t0/C.LOOP_T), p1=Math.ceil(t1/C.LOOP_T);
    for (let p=p0;p<=p1;p++){ const ta=p*C.LOOP_T; if (booting(ta)) continue;
      if (px>80) STEPS.forEach((st,j)=>{ const a=ta+SF[j]*C.LOOP_T, b=a+st[1]*C.LOOP_T; c.fillStyle=j===5?css('--accent2'):css('--accent'); c.globalAlpha=j%2?.5:.8; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-1),h-6); c.globalAlpha=1; if (X(b)-X(a)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(st[0].split(' · ')[0].slice(0,26),X(a)+3,y+h/2+3); } });
      else { c.fillStyle=p%2?css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(ta),y+3,Math.max(1,px-0.5),h-6); c.globalAlpha=1; } } }});
  ls.push({label:'ALTERA_write (16 bits + STROBE)', h:22, draw(c,X,t0,t1,y,h){ const px=X(t0+C.LOOP_T)-X(t0); const w=ctlWord();
    if (px<2){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('every pass: data_upper '+bin8(w.up)+' · data_lower '+bin8(w.lo), X(t0)+6, y+h/2+4); return; }
    c.fillStyle=css('--accent2'); const p0=Math.floor(t0/C.LOOP_T), p1=Math.ceil(t1/C.LOOP_T); for (let p=p0;p<=p1;p++){ const a=(p+SF[5])*C.LOOP_T; if(!booting(a)) c.fillRect(X(a),y+5,Math.max(1,X(a+STEPS[5][1]*C.LOOP_T)-X(a)),h-10); } }});
  ls.push({label:'Timer1 ISR (96 µs) · CAN pacing', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T1,0,8e-6,css('--ink2'),'timer1_ovf_isr'); }});
  ls.push({label:'Timer0 ISR (1 ms) · frames-per-second counter', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1e-3,0,30e-6,css('--ink2'),'timer0_ovf_isr'); }});
  ls.push(K.canLane(canList(), 'CAN 1 Mbit/s (Ward-Beck CAN.c / Dashboard.c)'));
  ls.push(K.boolLane('COM Activity LED', t=>leds(t).com, '#5dbf4a'));
  ls.push(K.boolLane('Lock 1 LED', t=>leds(t).l1, '#2f8f46'));
  ls.push(K.boolLane('Lock 2 LED', t=>leds(t).l2, '#2f8f46'));
  ls.push(K.waveLane('OUT1-1 (AES1 pair) audio', t=>{ const v=outSample(1,t); return v==null?0:v/0.2; }, {h:30}));
  ls.push(K.waveLane('OUT2-1 (AES5 pair) audio', t=>{ const v=outSample(2,t); return v==null?0:v/0.2; }, {h:30, cols:[SIM.css('--accent2')]}));
  return ls;
}
function inspHTML(t){
  const st=stepAt(t), r=routes(), w=ctlWord(), L=leds(t);
  return `<table class="kv">
    <tr><th>Main loop</th><td class="mono">${st.boot?'booting (main init)':'pass #'+st.pass.toLocaleString()+' · '+STEPS[st.step][0]}</td></tr>
    <tr><th>Astatus</th><td class="mono">bit0 = ${phys(1)?1:0} · bit1 = ${phys(2)?1:0} · aes1_lock ${D.a1?'YES':'NO'} · aes2_lock ${D.a2?'YES':'NO'}${input2()?'':' (frozen)'}</td></tr>
    <tr><th>CS8416 reg 0x04</th><td class="mono">U5 = 0x${D.eq1?'89':'80'} · U6 = ${input2()?'0x'+(D.eq2?'89':'80'):'not written (input2 INACTIVE)'}</td></tr>
    <tr><th>ALTERA_write</th><td class="mono">data_upper ${bin8(w.up)}b · data_lower ${bin8(w.lo)}b</td></tr>
    <tr><th>Mode</th><td class="mono">${r.mode} · DIP ${dipEnabled()&&!dashEnabled()?'in control':'ignored'}</td></tr>
    <tr><th>Outputs</th><td class="mono">OUT1-x (AES1–4): ${r.g1.kind}${r.g1.tone?' + TONE':''} @ ${r.g1.fs/1000} kHz ${r.g1.ok?'':'(muted)'}<br>OUT2-x (AES5–8): ${r.g2.kind}${r.g2.tone?' + TONE':''} @ ${r.g2.fs/1000} kHz ${r.g2.ok?'':'(muted)'}</td></tr>
    <tr><th>LEDs</th><td class="mono">Lock1 ${L.l1} NoLock1 ${L.n1} EQ1 ${L.e1} · Lock2 ${L.l2} NoLock2 ${L.n2} EQ2 ${L.e2} · COM ${L.com} · Error ${L.err}</td></tr>
    <tr><th>Card Status</th><td class="mono">${cardStatus()[0]}${D.alarm?'':' (Notify disabled → always OK)'}</td></tr></table>`;
}

/* ---------------- views ---------------- */
function keys(on){ window.__d6202bActive=!!on; }
if (!window.__d6202bKeys){ window.__d6202bKeys=true; document.addEventListener('keydown', e=>{ if (!window.__d6202bActive || /INPUT|SELECT|TEXTAREA/.test((e.target||{}).tagName||'')) return;
  const k=e.key.toLowerCase(); if (k==='1') A.pressEq(1); else if (k==='2') A.pressEq(2); else if (k==='m') A.dash('mode', (D.mode+1)%3); else if (k==='u') A.plug(1); else if (k==='r') A.reboot(); }); }
function viewSim(m){
  keys(true);
  m.innerHTML = `${card('The card — D6202B on the D6202A ISS4 PCB (real gerber artwork; click SW1/SW2, SW3, H1–H4)', `<div id="pcb"></div><div id="ins" style="margin-top:6px"></div><p class="small muted">Keys: 1 / 2 press EQ1 / EQ2 · M next mode · U unplug/plug IN1 · R reboot.</p>`)}
    <div class="grid2"><div>
      ${card('DashBoard — the operator’s window on the card (redrawn)', `<div id="dash"></div>`)}
      ${card('DIP switch SW3', `<div id="dip"></div>`)}
    </div><div>
      <div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge (front of frame)', `<div id="edge"></div><div class="small" style="margin-top:4px">${ART.edgeCite()}</div>`)}${card('Rear module T6203', `<div id="rear"></div><div class="small" style="margin-top:4px">${ART.rearCite()}</div>`)}</div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div></div>
    ${card('Frame — click a slot to move the card', `<div id="frame"></div>`)}
    ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Pass length ${inf('no timer paces the loop; estimated from the bit-banged CS8416 and FPGA transfers')} ${C.LOOP_T*1e6} µs. Timer1 reloads 0xFFF4 at clk/64 (96 µs); status reports every TX_HEARTBEAT = 10 000 ticks (0.96 s) round-robin through PARAMETER_UPDATE; DashBoard polls ${inf('poll rate is set by the frame controller')} twice a second.</p>`)}
    <div class="grid2">${card('Scope: AES3 frame on OUT1-1 at the playhead', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#pcb').innerHTML=cardSVG(t); m.querySelector('#ins').innerHTML=inputCtlHTML();
    m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#dip').innerHTML=dipSVG(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG();
    m.querySelector('#frame').innerHTML=K.frameSVG({slots:10, cardSlots:[D.slot], label:PID, ledOn:leds(t).l1, title:'DFR-8310 frame, front, door off — the T6203 is a single-slot rear (D6202B-T6203.cdr: “SINGLE CARD TERMINATION DFR-8310”)'});
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D); m.querySelector('#insp').innerHTML=inspHTML(t);
    bindAll(m); bindInputs(m);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    const r=routes().g1, n=Math.floor(t*r.fs), v=outSample(1,t);
    const F=K.drawAES(m.querySelector('#scope'), {fs:r.fs, a:v||0, b:(v||0)*0.8, n, dead:v==null});
    m.querySelector('#bits').innerHTML = v==null? 'Output muted or card booting '+inf('data_upper bits 7/6 = NOT lock are taken as an output mute') : `A = ${v.toFixed(5)} → 24-bit 0x${F.A.raw.toString(16).toUpperCase().padStart(6,'0')} · source ${r.kind}${r.tone?' (tone_gen1, −20 dBFS)':''} · ${r.fs/1000} kHz · bit cell ${SIM.fmtDur(1/(r.fs*128))} · DS34LV87T → PE-65612 → TB3`;
  };
  SIM.on('time', draw);
}
function viewSecond(m){
  keys(false);
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the card', `<div id="dev"></div>`)}${card('As seen on the card edge and in DashBoard', `<div id="edge"></div><div id="dash" style="margin-top:8px"></div>`)}</div>
    ${card('Signal path, stage by stage (input 1, from the ISS3 netlist)', `<div id="path"></div><div id="path2"></div>`)}`;
  const draw=()=>{ const t=SIM.t, s1=srcOf(1), r=routes();
    const rows=[
      ['AES IN1 frames', s1.fs.toLocaleString(), SIM.fmtDur(1/s1.fs), 'CS8416 U5 recovers clock and data; the FPGA re-encodes'],
      ['AES IN1 blocks (192 frames)', (s1.fs/192).toFixed(2), SIM.fmtDur(192/s1.fs), 'Z preamble; channel status passes through'],
      ['AES bit cells (biphase)', (128*s1.fs/1e6).toFixed(3)+' M', SIM.fmtDur(1/(128*s1.fs)), 'reclocked from X2 (CSX750V 24.576 MHz VCXO, steered by FPGA UP/DN) '+inf('PLL role of UP/DN')],
      ['AVR main-loop passes', '≈'+Math.round(1/C.LOOP_T).toLocaleString(), SIM.fmtDur(C.LOOP_T), 'v100w.c while(1) '+inf('pass time')],
      ['ALTERA_write words', '≈'+Math.round(1/C.LOOP_T).toLocaleString(), '', '16 bits + STROBE_WRITE every pass'],
      ['CS8416 0x0C reads', '≈'+Math.round(2/C.LOOP_T).toLocaleString(), '', 'two per pass (U5, U6)'],
      ['Timer1 interrupts', Math.round(1/C.T1).toLocaleString(), '96 µs', 'CAN transmit pacing'],
      ['Timer0 interrupts', '1,000', '1 ms', 'counts CAN frames per second (DashBoard busy detector)'],
      ['Status reports on CAN', D.restore?'0 (restore_start)':(1/(C.HEARTBEAT*C.T1)).toFixed(2), SIM.fmtDur(C.HEARTBEAT*C.T1), 'TX_HEARTBEAT 10 000 × 96 µs; one OID per report'],
      ['CAN bit time', '1,000,000', '1 µs', 'CANBT1 0x00, CANBT2 0x04 → 8 TQ × 125 ns'],
      ['Tone (if on)', (r.g1.fs/48).toFixed(0)+' Hz', SIM.fmtDur(48/r.g1.fs), 'tone_gen1: 48-step table per frame'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    const st=stepAt(t), n=Math.floor(t*s1.fs);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>IN1</th><td class="mono">frame ${n.toLocaleString()} · ${n%192}/191 of block ${Math.floor(n/192)} · sample ${sampleAt(1,t).toFixed(4)}</td></tr>
      <tr><th>AVR</th><td class="mono">${st.boot?'booting':'pass #'+st.pass+' — '+STEPS[st.step][0]}<br><span class="muted">${st.boot?'':STEPS[st.step][2]}</span></td></tr>
      <tr><th>FPGA</th><td class="mono">${r.mode} · group 1 ← ${r.g1.kind} · group 2 ← ${r.g2.kind}</td></tr>
      <tr><th>AD1895 SRC</th><td class="mono">${r.g1.kind==='SRC'?`${srcOf(1).fs/1000} → ${r.g1.fs/1000} kHz, ratio ${(r.g1.fs/srcOf(1).fs).toFixed(5)}`:'bypassed (BYPASS from FPGA pin 50)'}</td></tr>
      <tr><th>CAN</th><td class="mono">${canList().filter(f=>t>=f.t&&t<f.t+K.FRAME_BITS*K.CAN_BIT).map(f=>f.label).join(', ')||'idle'}</td></tr></table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#dash').innerHTML=dashHTML(); bindAll(m);
    const lf=levelAt(1,false), le=levelAt(1,true), sel=D.eq1?le:lf;
    m.querySelector('#path').innerHTML = K.levelSVG([
      {name:'Source: AES3 balanced, 2–7 V p-p', level:0, note:'reference 0 dB'},
      {name:`110 Ω pair, ${s1.len} m @ ${s1.fs/1000} kHz`, level:lf==null?null:-C.LOSS*s1.len/100*Math.sqrt(s1.fs/48000), col:'var(--warn)', note:inf(C.LOSS+' dB per 100 m at 48 kHz')},
      {name:`T1A → H1 ${D.H1} Ω (${D.H1===75?'R8':'R9'})`, level:lf, note:D.H1===110?'matched':'mismatch −3.5 dB'},
      {name:'U1 A → IN1 → RXP0 (flat)', level:lf, col:D.eq1?'var(--ink2)':'var(--accent)', note:'CS8416 reg 0x04 = 0x80'},
      {name:'U1 B EQ net → IN1_EQ → RXP1', level:le, col:D.eq1?'var(--accent2)':'var(--ink2)', note:'0x89 · +'+C.EQ_GAIN+' dB '+inf('boost')},
      {name:'CS8416 U5 lock limit', level:C.THRESH, col:'var(--bad)', note:inf('≈200 mV')},
      {name:'selected input at U5', level:sel, col:phys(1)?'var(--accent)':'var(--bad)', note:phys(1)?'locked':'no lock'},
      {name:'FPGA U10 reclock → DS34LV87T U13', level:D.a1?0:null, note:D.a1?'regenerated':'muted'},
      {name:'T1–T4 PE-65612 → AES1–4 → TB3/5/7/9', level:D.a1?0:null, note:'OUT1-1 … OUT1-4'},
    ], {lo:-50, hi:20, unit:'dB', clip:null});
    m.querySelector('#path2').innerHTML=`<p class="small muted">The receiver limit, cable loss and EQ boost are not in the archive ${inf('chosen so a plain input reaches ≈225 m and an equalised one ≈375 m at 48 kHz')}. The stage list itself (parts and nets) is from D6202A-iss3.net.</p>`;
  };
  SIM.on('time', draw);
}
/* block diagram */
const BLOCKS = {
  rear:{x:10,y:20,w:160,h:92,t:'T6203 rear',s:['TB1/TB2 = IN1/IN2','TB3–10 = OUT1-x / OUT2-x','P1 MEDAC100'],d:'Ten Phoenix terminal blocks. On ISS2/ISS3 TB1/TB2 carry BNC1/BNC2 SIG + GND (used here as the two balanced inputs) and TB3–TB10 the AES1–AES8 pairs. Labels from D6202B-T6203.cdr; wiring from the T6203 netlists.'},
  inx:{x:10,y:150,w:160,h:90,t:'T1A / T1B',s:['PE-65612 input xfmrs','H1/H2: 75 Ω (R8/R30)','or 110 Ω (R9/R31)'],d:'Each input passes C1/C11, a Pulse PE-65612 transformer and a termination picked by H1/H2 (silk “75” / “110”). D6202A-iss3.net.'},
  ref:{x:10,y:285,w:160,h:80,t:'REF select',s:['H4: REF1 / REF2','Q2 2N4401 follower','H3: IN2 ← rear or REF'],d:'H4 picks midplane REF1 (P2-14) or REF2 (P2-10); Q2 buffers it onto REF through C58; H3 joins either T1B or REF to the input-2 equaliser (R29 → U3). That lets the SRC follow the frame reference.'},
  eq:{x:205,y:150,w:160,h:100,t:'EL5263 ×2 (U1, U3)',s:['A: flat buffer → IN1/IN2','B: EQ network → INx_EQ','D1–D4 clamps to ±5 V'],d:'The cable equaliser is a fixed network (C4, C5, C7, R12 on input 1) around the second amplifier of each EL5263. Both versions are always present; the firmware only chooses which CS8416 input to listen to.'},
  rx:{x:205,y:20,w:160,h:92,t:'CS8416 ×2 (U5, U6)',s:['RXP0 flat · RXP1 EQ','reg 0x04 = 0x80 / 0x89','reg 0x0C = errors'],d:'Cirrus CS8416 receivers, set up by init_CS8416 (0x00←00, 01←04, 02←0B, 03←BB, 04←80, 05←B0, 06←10). Lock is read as “register 0x0C is zero”.'},
  fpga:{x:405,y:110,w:180,h:150,t:'EP1C3T100 (U10)',s:['i2s8416_aes · sw2x2x1x24','switch4x1 · tone_gen1','shift_in (16-bit word)','OUT1–OUT4 · X2 24.576 MHz'],d:'Altera Cyclone EP1C3, configured from an M25P40 (U11). It re-encodes both inputs, routes AES1, AES2 or the SRC output to two groups, inserts the tone and takes the AVR control word on FPGA1–FPGA4. The design is the D6201B Quartus project (software history sheet).'},
  src:{x:405,y:300,w:180,h:66,t:'AD1895 (U9)',s:['1×8 SRC mode','BYPASS / U9_RESET from FPGA'],d:'Asynchronous sample-rate converter. In 1×8 SRC mode input 1 is converted to the rate of input 2 (or the frame REF), and ALTERA_write holds it in reset for SRC_CONSTANT = 3 passes after the reference locks or the mode changes.'},
  drv:{x:625,y:110,w:160,h:110,t:'DS34LV87T ×2',s:['U13: OUT1, OUT2 → AES1–4','U12: OUT3, OUT4 → AES5–8','each FPGA pin feeds 2'],d:'Quad RS-422 drivers. Every FPGA output drives two driver channels, so FPGA OUT1/OUT2 make group 1 (AES1–4 = OUT1-1…4) and OUT3/OUT4 make group 2 (AES5–8 = OUT2-1…4).'},
  oxf:{x:625,y:255,w:160,h:80,t:'T1–T8 PE-65612',s:['8 output transformers','→ P1 AES1P/N … AES8P/N'],d:'Transformer-coupled 110 Ω balanced outputs to the rear connector (P1 pins 49–70).'},
  mcu:{x:405,y:10,w:180,h:80,t:'AT90CAN128 (U7)',s:['8 MHz · v100w.c super-loop','EQ switches, LEDs, SW3'],d:'Runs Ward-Beck’s own main loop (not zeuslib): reads the receivers, the buttons and the DIP switch, drives the LEDs, writes the FPGA word and talks to DashBoard through its own CAN.c / Dashboard.c.'},
  can:{x:625,y:10,w:160,h:80,t:'SN65HVD233 (U8)',s:['CAN 1 Mbit/s','LBK = PD7 during boot'],d:'3.3 V CAN transceiver to the midplane (P2-11/13). main() holds LBK high (loop-back) until CANinit is done.'},
  edge:{x:205,y:285,w:160,h:80,t:'Card edge',s:['8 LEDs · SW1, SW2','DIP SW3 on the board'],d:'Lock / No Lock / EQ per input, COM Activity, Error (never lit). D6202A-card-edge.cdr shows exactly this dual layout.'},
};
const WIRES=[['rear','inx','IN1/IN2'],['ref','eq','H3'],['inx','eq',''],['eq','rx','RXP0/RXP1'],['rx','fpga','I²S, MCLK'],['fpga','src',''],['src','fpga',''],['fpga','drv','OUT1–4'],['drv','oxf',''],['oxf','rear',''],['mcu','fpga','16-bit word'],['mcu','rx','SPI'],['edge','mcu',''],['mcu','can','CAND/CANR']];
function viewBlock(m){ keys(false); K.blockView(m, {blocks:BLOCKS, wires:WIRES, w:800, h:380, sel:'fpga', side:card('Rear-module drawing (D6202B-T6203.cdr, converted)', `<img src="${ASSET}d6202b-t6203-drawing.png" alt="D6202B-T6203 drawing" style="width:100%;max-width:300px;display:block;margin:auto;background:#fff;border-radius:6px"><p class="small muted">CorelDRAW file converted with Inkscape; the Ω in “DUAL 110 Ω AES DA” comes out as Σ (symbol font). It names the frame DFR-8310 (10 slots).</p>`)}); }
/* schematics (redrawn from D6202A-iss3.net) */
function chain(items, y){ let s='', x=30; items.forEach((it,i)=>{ const w=it.w||104; s+=`<rect x="${x}" y="${y}" width="${w}" height="46" rx="5" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+19}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--ink)">${it.t}</text><text x="${x+w/2}" y="${y+35}" text-anchor="middle" font-size="10" fill="var(--ink2)">${it.s||''}</text>`;
  if (i<items.length-1){ s+=`<line x1="${x+w}" y1="${y+23}" x2="${x+w+22}" y2="${y+23}" stroke="var(--ink)"/>${it.net?`<text x="${x+w+11}" y="${y+16}" text-anchor="middle" font-size="9.5" fill="var(--accent2)">${it.net}</text>`:''}`; } x+=w+22; }); return s; }
const SHEETS = [
  {name:'1 · AVR (U7)', note:'AT90CAN128 TQFP64 pins and nets from D6202A-iss3.net; port use from D6202B.h, altera.h, cs84xx.c. PB2/PB3 (REF1/REF2 LED macros) have no net.', svg:()=>K.chip(330,50,200,'U7 AT90CAN128',[['2 PE0','LOCK1'],['3 PE1','NO_LOCK1'],['4 PE2','SW1'],['5 PE3','EQ1'],['6 PE4','LOCK2'],['7 PE5','NO_LOCK2'],['8 PE6','SW2'],['9 PE7','EQ2'],['10 PB0','COM_ACTIVITY'],['11 PB1','ERROR'],['14–17 PB4–7','FPGA4…FPGA1'],['59/60/61','AN_BMID2 / AN_BMID / AN_SLOTID']],
    [['30 PD5','CAND'],['31 PD6','CANR'],['32 PD7','LBK'],['35 PC0','ALTERA_RESET'],['36 PC1','CS8416_OUT'],['37 PC2','CS8416_CLK'],['38 PC3','CS8416_IN'],['39/41','CS8416_SEL2 / SEL1'],['40/42','CS8416_RESET2 / RESET1'],['44–51 PA7–0','OUT1_1SW … OUT2_4SW (SW3)'],['23/24','X1 8 MHz']],'8 MHz · ICCAVR 7.15 · JTAG1')},
  {name:'2 · FPGA (U10)', note:'EP1C3T100 pins from the netlist (same names as the D6201A.qsf of the D6201B Quartus project). OUT1–OUT4 drive U13/U12.', svg:()=>K.chip(330,40,200,'U10 EP1C3T100',[['2–5','FPGA4…FPGA1'],['76/77','U5_LRCLK / U5_SCLK'],['86/87','U5_SDATA / U5_MCLK'],['88–90','U5_GPO0–2'],['91/92','U6_LRCLK / U6_SCLK'],['97/98','U6_SDATA / U6_MCLK'],['99/100/1','U6_GPO0–2'],['10','VCO_OUT (X2)'],['36/37','DN / UP'],['21–25','TP5…TP1 (H5)']],
    [['75 / 74','OUT1 / OUT2'],['69 / 68','OUT3 / OUT4'],['49 / 50','U9_RESET / BYPASS'],['51–53','LRCLK_I / SCLK_I / SDATA_I'],['54','MCLKOUT'],['55–57','SDATA / LRCLK / SCLK'],['6/7/8','NCS / CONF_DATA / N_CONFIG'],['13/16/17','NCE / DCLK / ASDI'],['60/61','CONF_DONE / N_STATUS'],['62–67','JTAG (H11)']],'config U11 M25P40 (footprint “EPCS1”)')},
  {name:'3 · Input 1', note:'TB1 (BNC1_SIG/BNC1_GND) → C1 → T1A → H1 (R8 75 Ω / R9 110 Ω) → R7 → U1 EL5263. U1-1 → R11 → IN1 → C52 → U5 RXP0; U1-7 → R5 → IN1_EQ → C51 → U5 RXP1. D1/D2 clamp the amplifier input to ±5 V. Input 2 is the same with T1B, H2 (R30/R31), R29, U3 and U6.', h:300, svg:()=>chain([{t:'TB1',s:'BNC1_SIG/GND',net:'P1-97/95'},{t:'C1 + T1A',s:'PE-65612',net:'NET00096'},{t:'H1',s:'R8 75 / R9 110',net:''},{t:'R7 → U1 A',s:'EL5263 flat',net:'IN1'},{t:'C52 → U5-4',s:'RXP0',w:110}],60)+chain([{t:'U1 B',s:'EQ: C4 C5 C7 R12',net:'IN1_EQ'},{t:'R5 75 Ω',s:'',net:''},{t:'C51 → U5-3',s:'RXP1',w:110}],170)+`<text x="40" y="262" font-size="11.5" fill="var(--ink)">CS8416_write1(0x04, 0x80) listens to RXP0 · CS8416_write1(0x04, 0x89) listens to RXP1 (and passes it to GPO)</text>`},
  {name:'4 · Input 2 / REF', note:'H3 pin 1 = T1B secondary (NET00033), pin 2 = R29 to U3, pin 3 = REF. H4: pin 1 = REF1 (P2-14), pin 2 = R61 → Q2 base, pin 3 = REF2 (P2-10). Q2 2N4401 emitter (R59 to −7.5 V, R60) → C58 → REF. Pin order on the board is read from the silk; which end H3 pin 1 is on is inferred.', h:300, svg:()=>chain([{t:'TB2',s:'BNC2_SIG/GND',net:''},{t:'C11 + T1B',s:'PE-65612',net:'NET00033'},{t:'H2',s:'R30 75 / R31 110',net:''},{t:'H3 1–2',s:'rear',net:'R29'},{t:'U3 EL5263',s:'→ IN2 / IN2_EQ',net:''},{t:'U6 CS8416',s:'RXP0 / RXP1',w:100}],60)+chain([{t:'P2-14 / P2-10',s:'REF1 / REF2',net:''},{t:'H4',s:'1–2 REF1, 2–3 REF2',net:'R61'},{t:'Q2 2N4401',s:'emitter follower',net:'C58'},{t:'H3 2–3',s:'REF → R29',w:110}],170)},
  {name:'5 · SRC (U9)', note:'AD1895 pins from the netlist. MCLKOUT, the input and output I²S ports and BYPASS/RESET all go to the FPGA.', svg:()=>K.chip(360,60,190,'U9 AD1895',[['2','MCLKOUT'],['4 SDATA_I','SDATA_I'],['5 SCLK_I','SCLK_I'],['6 LRCLK_I','LRCLK_I'],['9 BYPASS','BYPASS'],['13 RESET','U9_RESET']],[['23 SDATA_O','SDATA'],['24 LRCLK_O','LRCLK'],['25 SCLK_O','SCLK'],['14/15','NET00018 (mode pins tied)']],'asynchronous sample-rate converter')},
  {name:'6 · Output drivers', note:'DS34LV87T pin 1/7/9/15 are the A inputs, 2/6/10/14 the Y outputs. U13: OUT1 → 3Y (T1 → AES1) and 4Y (T2 → AES2); OUT2 → 1Y (T3 → AES3), 2Y (T4 → AES4). U12: OUT3 → T6/T5 (AES6/AES5), OUT4 → T7/T8 (AES7/AES8).', svg:()=>K.chip(140,60,170,'U13 DS34LV87T',[['1 1A','OUT2'],['7 2A','OUT2'],['9 3A','OUT1'],['15 4A','OUT1']],[['2 1Y','T3 → AES3'],['6 2Y','T4 → AES4'],['10 3Y','T1 → AES1'],['14 4Y','T2 → AES2']],'group 1')+K.chip(560,60,170,'U12 DS34LV87T',[['1 1A','OUT4'],['7 2A','OUT4'],['9 3A','OUT3'],['15 4A','OUT3']],[['2 1Y','T7 → AES7'],['6 2Y','T8 → AES8'],['10 3Y','T6 → AES6'],['14 4Y','T5 → AES5']],'group 2')},
  {name:'7 · Edge connectors', note:'P1 MEDAC100 (rear module) and P2 MEDAC20 (midplane) from the netlist.', svg:()=>K.chip(140,60,170,'P1 (rear)',[['97 / 95…100','BNC1_SIG / BNC1_GND'],['92 / 89…94','BNC2_SIG / BNC2_GND'],['5, 12, 17, 22…','BNC3–10_SIG (unused)'],['2 / 1','AN_BMID / AN_BMID2']],[['69/67','AES1P/N'],['63/61','AES2P/N'],['57/55','AES3P/N'],['51/49','AES4P/N'],['70/68','AES5P/N'],['64/62','AES6P/N'],['58/56','AES7P/N'],['52/50','AES8P/N']])+K.chip(600,60,150,'P2 (midplane)',[['1/3/5','+12V'],['2','−7.5V'],['6','AN_SLOTID'],['11/13','CANL / CANH']],[['14','REF1'],['10','REF2'],['17–20','PSB_IN± / PSB_OUT±']])},
];
function viewSchem(m){ keys(false); K.schemView(m, {product:PID, sheets:SHEETS, foot:`Built from ${ENGA}PCB/OBSOLETE/ISS3/D6202A-iss3.net (title block of its BOM: “D6201B”) and D6202B-iss3-T.prg. These sheets are REDRAWN guides, not the original P-CAD schematic (D6202A-iss3.sch). Blue labels are net names.`}); }
/* software */
function viewSoft(m){
  keys(false);
  m.innerHTML = `<div class="grid2">${card('Main loop (v100w.c) — the lit box runs at the playhead', `<div id="flow"></div>`)}
    <div>${card('EQ push-button state machine', `<div id="pb"></div>`)}${card('FPGA control word (ALTERA_write), live', `<div id="cw"></div>`)}</div></div>
    <div class="grid2">${card('Status reporting (CAN_TX_TIMER) — what V100 changed', `<div id="tx"></div>`)}${card('DashBoard OID map (Dashboard.c)', `<div id="oid"></div>`)}</div>
    <div class="grid2">${card('V100 against the D6201B V102 it was copied from', `<div id="diff"></div>`)}${card('CAN frame ID and boot sequence', `<div id="can"></div>`)}</div>`;
  const draw=()=>{ const st=stepAt(SIM.t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*44+70}" style="width:100%"><rect x="120" y="6" width="280" height="26" rx="13" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="12" fill="var(--ink)">main(): init, 2× slot ADC, init_CS8416, CANinit</text>`;
    STEPS.forEach((p,j)=>{ const y=44+j*44, on=st.step===j; s+=`<line x1="260" y1="${y-12}" x2="260" y2="${y}" stroke="var(--ink2)"/><rect x="30" y="${y}" width="460" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="40" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="40" y="${y+27}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[2].length>80?p[2].slice(0,78)+'…':p[2]}</text>`; });
    const yb=44+STEPS.length*44; s+=`<path d="M490 ${yb-28} h18 V40 h-18" fill="none" stroke="var(--ink2)"/><text x="30" y="${yb+16}" font-size="11" fill="var(--ink2)">${st.boot?'Booting — main() not in the loop yet':'Pass #'+st.pass.toLocaleString()}. No timer paces the loop; timer0, timer1 and CAN interrupts run in between.</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    const since=D.pressAt==null?1e9:SIM.t-D.pressAt, passes=Math.floor(since/C.LOOP_T); const ph = since<0||since>1e8?'idle': passes<2?'pb = YES (pressed)': passes<2+C.DEBOUNCE?`pb_release = YES, pb_counter = ${Math.min(255,passes-2)}`:'idle (pb = NO)';
    m.querySelector('#pb').innerHTML=`<svg viewBox="0 0 520 110" style="width:100%">${[['idle',20],['pb = YES',190],['pb_release / counting',350]].map(([n,x],i)=>`<rect x="${x}" y="30" width="${i===2?160:140}" height="40" rx="18" fill="${(i===0&&ph.startsWith('idle'))||(i===1&&ph.startsWith('pb ='))||(i===2&&ph.startsWith('pb_release'))?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+(i===2?80:70)}" y="55" text-anchor="middle" font-size="12" fill="var(--ink)">${n}</text>`).join('')}
      <text x="165" y="22" font-size="10" fill="var(--ink2)">switch low → eq_refresh</text><text x="330" y="22" font-size="10" fill="var(--ink2)">released</text><text x="20" y="96" font-size="10" fill="var(--ink2)">after ${C.DEBOUNCE} passes (EQ_PUSHBUTTON_DEBOUNCE) → idle; one pb flag for both</text></svg><p class="small mono">Now: ${ph}</p>`;
    const w=ctlWord(); const bits=(v,names)=>names.map((n,i)=>`<tr><td class="mono">${7-i}</td><td class="mono">${(v>>(7-i))&1}</td><td>${n}</td></tr>`).join('');
    m.querySelector('#cw').innerHTML=`<table class="kv"><tr><th colspan="3">data_upper = ${bin8(w.up)}b</th></tr>${bits(w.up,['NOT aes1_lock','NOT aes2_lock','0','0','0','0','0','0'])}<tr><th colspan="3">data_lower = ${bin8(w.lo)}b</th></tr>${bits(w.lo,['0','0','src_reset released (0 = AD1895 in reset)','SRC path','tone 2 off (0 = on)','tone 1 off (0 = on)','group 2 ← AES2','SRC select'])}</table><p class="small muted">Meanings from the comments in D6202B.c. In 1×8 SRC with a locked reference bit 3 is cleared — see Findings. The FPGA side (shift_in q0–q15 in D6201A.bdf) was not traced bit by bit ${inf('bit wiring')}.</p>`;
    const rr=D.restore;
    m.querySelector('#tx').innerHTML=`<svg viewBox="0 0 520 76" style="width:100%">
      ${[['boot',10,'restart_sent = NO'],['TRAP RESTART',150,'once → restart_sent = YES'],[rr?'reports held':'round-robin reports',320,rr?'restore_start ≠ 0':'restore_start == 0']].map(([n,x,sub],i)=>`<rect x="${x}" y="14" width="${i===2?190:130}" height="46" rx="16" fill="${(i===2)?(rr?'var(--warn)':'var(--accent)'):'var(--panel2)'}" stroke="var(--line)"/><text x="${x+(i===2?95:65)}" y="34" text-anchor="middle" font-size="12" fill="${i===2?'#fff':'var(--ink)'}">${n}</text><text x="${x+(i===2?95:65)}" y="50" text-anchor="middle" font-size="9.5" fill="${i===2?'#fff':'var(--ink2)'}">${sub}</text>`).join('')}
      <line x1="140" y1="37" x2="150" y2="37" stroke="var(--ink2)"/><line x1="280" y1="37" x2="320" y2="37" stroke="var(--ink2)"/></svg>
      <p class="small"><b>V102 (D6201B):</b> <span class="mono">if (frame_count == 0 &amp;&amp; start_parameter_dump == NO)</span> → TRAP RESTART, again and again until the frame controller sends CANMSG_GET_NUMPARAMS (and after every ENABLE_MODE).</p>
      <p class="small"><b>V100 (D6202B):</b> <span class="mono">if (frame_count == 0 &amp;&amp; restart_sent == NO)</span> → one TRAP; <span class="mono">else if (restore_start == NO)</span> → report.</p>
      <p class="small muted">Report order (PARAMETER_UPDATE): changes first (2.2, 2.3, 3.2, 3.3, 3.10, 3.5, 3.6, 2.1), then round-robin 0…7.</p>
      <p class="small">Try it: <button data-r="1">send 0xFF.07 = 1</button> <button data-r="0">send 0xFF.07 = 0</button> — watch the CAN lane on the Simulator tab.</p>`;
    m.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>A.dash('restore7', +b.dataset.r));
    const oids=[['1.5 / 1.7 / 1.2 / 1.11 / 1.4','Card Info','D6202B · “Dual Balanced AES Audio Distribution Amplifier” · Ward-Beck Systems · 1.00 · www.ward-beck.com'],['2.1','Card Status','alarm table: OK 0 · No AES Audio Lock bit1 · AES Input #1 Unlocked bit2 · #2 bit3 — only when Notify is on'],['2.2 / 2.3','AES Input #1 / #2','0x01 Locked · 0x02 Not Used · 0x04 Unlocked'],['3.1','Save Settings','save_settings = INVERT_DATA(v)'],['3.2 / 3.3','Equalizer','eq1_active / eq2_active'],['3.5 / 3.6','Tone Generator','refused in SRC mode / outside 2x4'],['3.10','Mode','0 1x8 · 1 2x4 · anything else 1x8 w/ SRC'],['3.8','AD Result','raw slot ADC (ad_result_upper/lower) — in the menu'],['4.0','Notify on Card Fault','smpte_alarm_enabled, default 0, not saved'],['7.11 / 7.12 / 7.13','title headers','name “Metadata”, value “AES Input 1 / 2”, “Outputs”'],['3.4 / 3.11','SRC Enable / AES2','defined, outside the 18-OID count, not in any menu'],['FF.07 / FF.08','(hidden)','restore_start = v / NOT v']];
    m.querySelector('#oid').innerHTML=`<table class="kv"><tr><th>OID</th><th>Name</th><th>Firmware meaning</th></tr>${oids.map(o=>`<tr><td class="mono">${o[0]}</td><td>${o[1]}</td><td class="small">${o[2]}</td></tr>`).join('')}</table>`;
    const df=[['D6202B.c / .h','D6201B.c / .h byte for byte except the file name comment; SOFTWARE_VERSION 0 (V102 had 2)'],['v100w.c, cs84xx.c, ADC.c, altera.c','identical (v100w.c still says “PRODUCT: OPEN GEAR (D6201B)”)'],['Dashboard.c','name string Unbalanced → Balanced (49 → 47 chars); product “D6202B”; Ross string “ADA-8401-B” (the D6202A’s); Cobalt block deleted'],['Dashboard.c','restart_sent: TRAP RESTART only once; restore_start + OIDs 0xFF.07 / 0xFF.08 added'],['Dashboard.c','“buffer[2] = buffer[2] = …” doubled assignment in GET_PARAM_OIDS; “__flash” + cstrlen edit made inside a commented-out function'],['common.h','includes D6202B.h; //#define COBALT line removed'],['CAN.c','one blank line removed']];
    m.querySelector('#diff').innerHTML=`<table class="kv"><tr><th>File</th><th>Change (diff against ${V102.split('/').slice(-4,-1).join('/')})</th></tr>${df.map(o=>`<tr><td class="mono small">${o[0]}</td><td class="small">${o[1]}</td></tr>`).join('')}</table>`;
    const hi=(D.slot<<6)|0x00, lo=0x10<<8, cs=cardStatus();
    m.querySelector('#can').innerHTML=`<p class="small">This card (mod_address ${D.slot}) reporting Card Status to the frame controller: <span class="mono">CAN_FRAME_ID_HIGH = (${D.slot} &lt;&lt; 6) | 0 = 0x${hi.toString(16).toUpperCase()}</span>, <span class="mono">CAN_FRAME_ID_LOW = CANMSG_REPORT_PARAM 0x10 &lt;&lt; 8 = 0x${lo.toString(16).toUpperCase()}</span>; payload <span class="mono">00 02 01 02 00 ${hex2(cs[2])}</span> (return code, OID 2.1, ALARM_PARAM_SIZE 2, value).</p>
      <ol class="small"><li>initialization(): ports (DDRE 0xBB: LEDs out, PE2/PE6 buttons in), watchdog WDTCR 0x08, ADC 0xC6</li><li>DATA_INITIALIZATION: all LEDs off; CAN_RX = PORTD bit 7 high → SN65HVD233 LBK loop-back</li><li>5 × wait(3000); 100 samples of AN_SLOTID → ADDRESS_TABLE; 5 × wait; 100 samples again → slot_address</li><li>ALTERA_RESET(1000); 5 × wait; init_CS8416 (reset both, 5 × wait, registers 0x00–0x06)</li><li>READ_DIP_SWITCHES: SW7 → dip_switch_enabled, SW8 → dashboard_enabled</li><li>moduleAddress, DATA_SETUP (message CRCs), CANinit, CAN_TX</li><li>dip_switch_enabled == NO → RESTORE_INFORMATION_EEPROM; else mode/tones from SW1–SW4</li><li>ALTERA_write; while(1) … Boot ≈ ${(bootLen()*1000).toFixed(0)} ms ${inf('wait(3000) time')}</li></ol>`;
  };
  SIM.on('time', draw);
}
/* tutorial */
const TUT = {i:0};
function tutSide(){ return card('The card', `<div id="tpcb"></div><div class="grid2" style="grid-template-columns:1fr 1fr;margin-top:6px"><div id="te"></div><div id="tr2"></div></div><div id="td" style="margin-top:8px"></div><div id="ti" style="margin-top:6px"></div><div id="tdip"></div>`); }
function tutBind(root){ root.querySelector('#tpcb').innerHTML=cardSVG(SIM.t); root.querySelector('#te').innerHTML=edgeSVG(SIM.t); root.querySelector('#tr2').innerHTML=rearSVG(); root.querySelector('#td').innerHTML=dashHTML(); root.querySelector('#ti').innerHTML=inputCtlHTML(); root.querySelector('#tdip').innerHTML=dipSVG(); bindAll(root); bindInputs(root); }
function viewTut(m){ keys(false); K.tutorialView(m, {D, st:TUT, title:'Tutorial — installing and running the D6202B (no D6202B manual exists: steps follow the D6201B manual and the V100 firmware)', L:LESSONS, side:tutSide, bindSide:tutBind, reset:A.reset}); }
/* findings */
function viewFindings(m){
  keys(false);
  m.innerHTML = card(`What the ${PID} is up to`, `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>`) +
    card('Assumptions in this simulation', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`) +
    card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${s}</li>`).join('')}</ul>`);
}
const LESSONS = [
  {title:'Meet the D6202B', body:`<p>The D6202B is a <b>dual-input, 110 Ω balanced</b> AES3 distribution amplifier on one openGear card. Each input and all eight outputs are transformer-coupled pairs on Phoenix terminal blocks (rear module <b>T6203</b>). It has three modes:</p><ul><li><b>1x8</b>: IN1 to all eight outputs</li><li><b>2x4</b>: IN1 to OUT1-1…1-4, IN2 to OUT2-1…2-4</li><li><b>1x8 w/ SRC</b>: IN1, sample-rate converted to the rate of IN2 (or the frame reference), to all eight</li></ul><p>The card above is drawn from the real ISS4 gerbers; its silkscreen still says D6202A, because both products use this board.</p>`, check:()=>true, auto:true},
  {title:'1 · Turn on the alarm', body:`<p>Out of reset the firmware sets <b>Notify on Card Fault</b> to <i>Disabled</i>, so Card Status always says OK. In DashBoard → Card Settings set it to <b>Enabled</b>, then <b>unplug IN1</b>. Card Status should now read an error.</p>`, check:()=>D.alarm&&!D.in1.conn&&cardStatus()[1]==='err', hint:'Card Settings → Notify on Card Fault → Enabled, then click IN1 on the rear module (or “Unplug” for IN1).'},
  {title:'2 · Two inputs', body:`<p>Reconnect IN1. Set <b>Mode</b> to <b>2x4</b>. Input 2 becomes ACTIVE: its Lock LED lights and AES Input #2 changes from “Not Used” to “Locked”.</p>`, check:()=>D.in1.conn&&D.mode===1&&D.a1&&D.a2, hint:'Connect IN1, then Card Settings → Mode → 2x4.'},
  {title:'3 · A long run', body:`<p>Set the IN2 cable to <b>300 m</b>. The flat receiver input can’t recover it: No Lock 2 lights. Press <b>EQ2</b> on the card edge (or SW2 on the board) — the CS8416 switches to the equalised EL5263 output and locks.</p>`, check:()=>D.in2.len>=300&&D.eq2&&D.a2, hint:'IN2 cable → 300 m, then click the EQ2 switch.'},
  {title:'4 · EQ2 in 1x8 mode', body:`<p>Set Mode back to <b>1x8</b> and press <b>EQ2</b> again. Nothing sticks: ALTERA_write clears <span class="mono">eq2_active</span> on every pass while the mode is 1x8 (see the trace).</p>`, check:()=>D.mode===0&&D.eq2Kicked, hint:'Mode → 1x8, then press EQ2.'},
  {title:'5 · Sample-rate conversion', body:`<p>Set Mode to <b>1x8 w/ SRC</b>. Set the IN1 source to <b>44.1 kHz</b>, keep IN2 (the reference) at 48 kHz. All eight outputs now carry IN1’s audio at 48 kHz through the AD1895.</p>`, check:()=>D.mode===2&&srcOf(1).fs===44100&&D.a2&&routes().g1.kind==='SRC', hint:'Mode → 1x8 w/ SRC, IN1 rate → 44.1 kHz (IN2 must stay locked; 300 m needs EQ2).'},
  {title:'6 · Reference from the frame', body:`<p>Move jumper <b>H3</b> so input 2 comes from the frame reference, with <b>H4</b> on REF1 (click H3 on the board, or use the list). The SRC now follows the house reference on the midplane.</p>`, check:()=>D.mode===2&&D.H3==='ref'&&D.H4==='ref1'&&D.a2, hint:'Click H3 on the card (or H3 → “IN2 from frame REF”). REF1 must be on.'},
  {title:'7 · Saving, and SW7', body:`<p>Press <b>Save</b> in Card Settings. Then <b>Reboot</b>. With SW7 OFF (the default) the card takes its mode from the DIP switch at boot and ignores what you saved. Set <b>SW3-7 ON</b>, reboot again, and the saved mode comes back.</p>`, check:()=>D.eeprom.valid&&D.eeprom.mode===2&&D.lat[0]===0&&D.mode===2, hint:'Save, then click SW3 switch 7 (to ON) and press Reboot.'},
  {title:'Done', body:`<p>You have used every control on the D6202B. The <b>Software</b> tab shows the control word and what V100 changed from the D6201B code; <b>Findings</b> lists the surprises — including the alarm default and the Save/SW7 rule you just met.</p>`, check:()=>true, auto:true},
];
const FINDINGS = [
  `<b>Artwork 2026|59: card edge and rear module now from the CorelDRAW files.</b> No D6202B card-edge file exists, so the edge is ${SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-card-edge.cdr')} (2008-05-08|41), which already shows the dual card (8 LEDs, EQ1 and EQ2). The T6203 is ${SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202B-T6203.cdr')} (2008-10-08|41): IN 1 / IN 2, OUT1-x / OUT2-x, “DUAL 110Ω AES DA”, DFR-8310. Assets: <span class="mono">assets/d6202b-*.svg</span>. The same drawing is used for ISS1 and ISS2 because it carries no issue mark.`,
  `<b>The 2012 guide offers different rear modules.</b> ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6202B - rear module options.cdr')} (2012-01-16|45) lists the T6303A (single) and T6403A (dual) for the D6202B, not the T6203. Those two are not modelled here (see the D6202A plugin). Its T6403A legend repeats “OUT 3 Card 2” at position 9, where OUT 4 Card 2 is meant.`,
  `<b>Ω came through as Σ.</b> The CorelDRAW text set the Ω in the “WP Greek Helve” font; libcdr wrote it as U+03A3 (Σ). The asset was corrected to Ω.`,
  `<b>V100 is the D6201B V102 code with a new name.</b> D6202B.c/.h are byte-identical to D6201B.c/.h apart from the file-name comment and <span class="mono">SOFTWARE_VERSION 0</span>; v100w.c, cs84xx.c, ADC.c and altera.c are unchanged (v100w.c still says “PRODUCT: OPEN GEAR (D6201B)”). The “110 Ω” product differs from the 75 Ω D6201B only in hardware. Dashboard.c holds the real changes (Software tab).`,
  `<b>Built inside the D6202A tree, with leftovers.</b> V100W.mak compiles from <span class="mono">H:\\OPENGE~1\\D62XX\\D6202A\\Software\\atmel\\D6202B\\v100</span>. The folder still holds D6201A.c/.lis and D6201B.c/.lis that are not in FILES, and <span class="mono">ross_ztcpack.txt</span> / <span class="mono">cobalt_ztcpack.txt</span> are stale D6202A v1.04 configs (ADA-8401-B / 9252). The ROSS_VIDEO branch of Dashboard.c also names the card “ADA-8401-B”, the D6202A’s Ross name.`,
  `<b>RESTART trap only once.</b> V102 kept sending CANMSG_TRAP / CANTRAP_RESTART until the frame controller asked CANMSG_GET_NUMPARAMS. V100 sends it once (<span class="mono">restart_sent</span>), so a frame controller that misses it is never told again ${inf('consequence; DashBoard still finds the card by polling')}.`,
  `<b>Hidden OIDs 0xFF.07 / 0xFF.08.</b> SET_PARAM to 0xFF.07 stores the value in <span class="mono">restore_start</span>; 0xFF.08 stores the inverted bit 0. While it is non-zero CAN_TX_TIMER sends no status reports at all, so lock changes are no longer pushed. Neither OID is in the parameter list or any menu, and nothing in the archive says who sends them.`,
  `<b>The alarm starts off and is never saved.</b> <span class="mono">smpte_alarm_enabled = NO</span> at reset and SAVE_INFORMATION_EEPROM does not store it. Until someone sets Notify on Card Fault after each power-up, Card Status (2.1) reports OK even with both inputs dead.`,
  `<b>Save Settings usually does nothing.</b> Only mode and the two tones are saved (EEPROM 10 = 0xAA, 11, 13, 14; EQ is not). They are restored only when <span class="mono">dip_switch_enabled == NO</span>, i.e. SW3-7 ON. With the switches in their default OFF position the card boots from SW1–SW4 and ignores the EEPROM.`,
  `<b>DIP switches only rule with DashBoard locked out.</b> ALTERA_write applies SW1–SW4 on every pass only when SW7 is OFF <i>and</i> SW8 is ON; with SW8 OFF they are read once at boot. SW7/SW8 are read only at power-up. ON/ON on SW1/SW2 (“not used”) becomes 1×8 SRC.`,
  `<b>EQ2 and tone 2 can’t be kept in 1x8 mode.</b> ALTERA_write sets <span class="mono">tone_generation2 = NO</span> and <span class="mono">eq2_active = NO</span> on every pass in OUTPUT_1x8, so a press of EQ2 lights nothing and DashBoard sees OID 3.3 flip on and off.`,
  `<b>aes2_lock freezes while input 2 is unused.</b> REFRESH_LEDS only updates it for an ACTIVE input, and it starts at NO. In 1x8 mode with the alarm on, losing IN1 therefore reports “No AES Audio Lock” instead of “AES Input #1 Unlocked”.`,
  `<b>SRC mode clears the “tone 2 on” bit.</b> With a locked reference ALTERA_write does <span class="mono">data_lower |= BIT4|BIT2|BIT1|BIT0; data_lower &amp;= ~BIT3</span>. Bit 3 low means “tone 2 on” in the other modes; whether the FPGA ignores it in SRC mode was not traced ${inf('D6201A.bdf wiring')}.`,
  `<b>Lock means “no receiver error”.</b> CS8416_READ_LOCK_ALL treats any non-zero value in register 0x0C as unlocked. Per the CS8416 data sheet that register also flags validity, parity and confidence errors ${inf('data sheet, not archived')}, so a stream with the V bit set would show “Unlocked”.`,
  `<b>Menu and OID-list leftovers.</b> Card Settings shows OID 3.8 “AD Result”: the raw slot-ID ADC reading, an engineering readout. The GET_PARAM_OIDS list says 18 entries, which stops before 3.8, 3.11 (“AES2” source) and 3.4 (“SRC Enable”). Header 7.13 “Outputs” is listed but in no menu, and all three headers are named “Metadata”. A static 5-entry Card Status descriptor with “Voiceover Unlocked” (copied from a voice-over card) is built and CRC’d in DATA_SETUP but never sent.`,
  `<b>Dead macros.</b> D6202B.h defines REF1/REF2 LEDs on PB2/PB3 (no net in D6202A-iss3.net) and REF1/REF2/OUT switches on PINA bits that are really DIP switches. The Error LED is never lit: every COM_ERROR_LED_ON is commented out.`,
  `<b>DIP nets keep their old names.</b> The netlist calls SW3 OUT1_1SW … OUT2_4SW (per-output switches), but the firmware uses them as mode, tone, “DIP or EEPROM” and “DashBoard enable”.`,
  `<b>The “D6202B” BOM is not a D6202B.</b> <span class="mono">PCB/OBSOLETE/D6202B.bom</span> lists one CS8416, one EVQPP switch, one EL5263, no AD1895, nine PE-65612 and five LEDs: a single-input card. The dual parts list (2 CS8416, AD1895, 2 EL5263, 10 PE-65612, 8 LEDs, 24 × 110 Ω) is <span class="mono">ISS3/D6202A-iss3.bom</span>, whose title block reads “D6201B”. D6202B.sch and D6202A-iss3.sch are the same size (622,573 bytes) but not identical.`,
  `<b>One PCB, two products.</b> The photos in Photo/D6202B show boards silked “D6202A, ISS2” (Nov 2008|41) and “D6202A, ISS3” (Mar 2009|42). The ISS2 board carries an Altera Cyclone, although the D6202A README puts the Lattice LFXP3 on issue 2. The PNP folder has separate D6202B-iss2/iss3 programs, so the B is a stuffing option.`,
  `<b>Drawings swapped.</b> <span class="mono">D6202A-card-edge.cdr</span> shows the dual layout (Lock1/2, EQ1/2 switches), which is the D6202B. <span class="mono">Functional.cdr</span> shows the single-input D6202A with T6203A “IN1 / N/C”.`,
  `<b>Rear module issue matters.</b> D6202B-T6203.cdr (IN1, IN 2, OUT1-1 … OUT2-4; “SINGLE CARD TERMINATION DFR-8310”) matches only T6203 ISS2/ISS3 wiring. ISS1 puts AES1–8 on TB1–8 and BNC9/10 on TB9/10, and has the same 3K57/9K76 ID, so neither the card nor the frame can tell. The firmware never reads AN_BMID anyway.`,
  `<b>History sheet.</b> D6202B SOFTWARE HISTORY.xls (2009-10-20) gives V100 1.0.0.0, ICC V7.15 and the FPGA from <span class="mono">H:\\OPENGEAR\\D62XX\\D6201B\\SOFTWARE\\ALTERA\\</span>. Its “OIDs - Prototype” sheet is an SDI/Dolby/voice-over template that has nothing to do with this card.`,
];
const ASSUME = [
  `Main-loop pass ≈ ${C.LOOP_T*1e6} µs ${inf('no timer paces the loop')}; the EQ debounce is therefore ≈ ${(C.DEBOUNCE*C.LOOP_T*1e3).toFixed(0)} ms.`,
  `wait(3000) ≈ 2.6 ms ${inf('WDR/decrement loop at 8 MHz')}; with 20 waits and 200 ADC conversions a reboot takes ≈ ${(bootLen()*1000).toFixed(0)} ms.`,
  `Cable: ${C.LOSS} dB per 100 m of 110 Ω pair at 48 kHz, scaled by √(fs/48 kHz); EQ adds ${C.EQ_GAIN} dB; lock needs better than ${C.THRESH} dB; a 75 Ω termination costs 3.5 dB ${inf('no D6202B or D6202A manual exists')}.`,
  `The midplane REF1/REF2 lines are treated as carrying an AES reference when switched on ${inf('the netlist only shows a Q2 buffer from H4 to H3')}.`,
  `Output groups: FPGA OUT1/OUT2 → AES1–4 (OUT1-x), OUT3/OUT4 → AES5–8 (OUT2-x), from the U12/U13 netlist and the D6202B-T6203.cdr labels; which FPGA output the bitstream assigns to which group is ${inf('FPGA not traced')}.`,
  `data_upper bits 7/6 (NOT lock) are shown as an output mute ${inf('FPGA behaviour not documented')}. DashBoard polls twice a second ${inf('set by the frame controller')}.`,
  `SW3 orientation (switch 1 at the left, ON up) and the pin-1 ends of H2/H3 are ${inf('read from the silkscreen; no assembly drawing')}.`,
  'Programme audio on the inputs (440 Hz −18 dBFS, 997 Hz −12 dBFS) is illustrative.',
];
const SOURCES = [
  SRCD+'v100w.c, D6202B.c/.h, Dashboard.c/.h, CAN.c/.h, cs84xx.c, ADC.c/.h, altera.c/.h, common.c/.h, V100W.mak, wbs_ztcpack.txt, ross_/cobalt_ztcpack.txt',
  '#OPENGEAR #SERIES/D6202B - #Master #OPENGEAR/D6202B - #Engineering/Software/atmel/D6202B/D6202B SOFTWARE HISTORY.xls',
  V102+'Dashboard.c, CAN.c, D6201B.c/.h, v100w.c (comparison) · ../../altera/v100/D6201A.bdf, tone_gen1.vhd',
  ENGA+'PCB/GERBERS/D6202A-ISS4.TOP/.TSM/.TSS/.OTL → assets/d6202b-pcb.png, d6202b-silk.png (rendered 120 dpi, logo blanked)',
  ENGA+'PCB/OBSOLETE/ISS3/D6202A-iss3.net, D6202A-iss3.bom · PCB/OBSOLETE/D6202B.bom, D6202B.sch',
  ENGA+'Functional/D6202B-T6203.cdr (→ assets/d6202b-t6203-drawing.png), D6202A-card-edge.cdr, Functional.cdr',
  ENGA+'Photo/D6202B/D6202B.jpg, D6202B Iss3.jpg',
  '#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A #Gerber #PNP/D6202A - #PNP #2016/D6202B-iss3-T.prg',
  '#OPENGEAR #SERIES/T6203 - #Master #OPENGEAR #TERMINATION (via t6203.js: T6203.net, T6203-iss2.net, ID 3K57/9K76)',
];
SIM.register({
  id:'d6202b', product:'D6202B', name:'D6202B · dual-input 110 Ω balanced AES distribution amplifier, openGear (2009|42)', year:2009,
  folder:'#OPENGEAR #SERIES/D6202B - #Master #OPENGEAR', family:'openGear',
  summary:'Dual-input, transformer-coupled 110 Ω AES3 DA on the D6202A ISS3/ISS4 board: 1×8, 2×4, or 1×8 through an AD1895 sample-rate converter that follows input 2 or the frame reference. The model runs the V100 firmware (a renamed copy of the D6201B V102 code) on the card drawn from its real gerbers.',
  highlights:['Card drawn from the ISS4 gerbers with live LEDs, SW1/SW2, DIP SW3 and jumpers H1–H4','DashBoard window with the real OIDs, including the hidden 0xFF.07/0xFF.08','Balanced input chain traced from the netlist: transformer, termination, EL5263 equaliser, CS8416','One-shot RESTART trap and restore_start, the V100 changes','Findings: alarm off at power-up, Save ignored with SW7 OFF, mislabelled BOM and drawings'],
  depth:'Full model', duration:1,
  stepUnits:[{label:'1 AES frame', period:()=>1/srcOf(1).fs},{label:'1 AES block (192 frames)', period:()=>192/srcOf(1).fs},{label:'1 loop pass', period:()=>C.LOOP_T},{label:'96 µs timer1 tick', period:()=>C.T1},{label:'1 ms', period:()=>1e-3},{label:'100 ms', period:()=>0.1}],
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
