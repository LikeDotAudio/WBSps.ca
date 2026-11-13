/* =====================================================================
   M6203A — openGear SD/HD/3G-SDI reclocking distribution amplifier, 1 in × 8 out (Ward-Beck Systems)
   Release package "M6203A - #Master #OPENGEAR": ISS3 Gerbers (2011|44) and the scanned test reports
   (2010|43 – 2013|46). Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   This folder has no code. The firmware lives in the sibling folder and is used here (linked):
   - M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Software/atmel/v101/
       v100w.c (main, wait), M6203A.c (READ_GS2975_STATUS, PROCESS_SDI_LOCK_STATUS_UPDATE,
       PROCESS_SDI_LOCK_STATUS), M6203.h (port map), Dashboard.c (OIDs 2.2 / 2.4, strings), v100w.s (cycles),
       wbs_ztcpack.txt;   …/atmel/C030000/ (S&L Technology build, “Ali-Add” unbranded strings)
   - …/M6203A/PCB/M6203A-iss3.net (U1 GS2974A, U3 GS2975A, U4–U7 GS2978, U11 AT90CAN128, LED1–5)
   - …/M6203A/Functional/M6203A-card-edge.cdr, M6203A-T6301.cdr, M6203A-T6401.cdr, MANUAL/M6203A LED Status.cdr
     (converted with Inkscape), M6203A-FUNCTIONAL.pdf
   - this folder: M6203A-ISS3 - #Gerbers.zip (TOP/TSM/TSS → assets/m6203a-pcb-top.png, openGear logo removed),
       #TESTREPORT/*.pdf (cable length, ASI pass, summary, V101/V1001/03AC0000 test outlines)
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
const inf=K.inf, card=K.card, ASSET='siumulation-plugins/assets/';
/* ---- CorelDRAW artwork (artwork pass 2026|59): the panels are the archive's .cdr drawings, converted with Inkscape
   (text kept live, re-anchored where libcdr lost alignment); the live parts sit on the drawn holes, in the drawing's pt coordinates. ---- */
const ART_CSS = `<style>.arthl{fill:transparent;stroke:transparent;stroke-width:.7}.og62-hot:hover .arthl,.arthot:hover .arthl{stroke:#2b8cff}</style>`;
function artSVG(o){ // o: {src, vb:[x,y,w,h], maxw, label, fid, body}
  const [x,y,w,h]=o.vb;
  return `<svg viewBox="${x} ${y} ${w} ${h}" style="width:100%;max-width:${o.maxw||300}px;display:block;margin:auto;background:#f4f4f0;border-radius:6px" role="img" aria-label="${o.label}">${ART_CSS}
    <defs><filter id="${o.fid}" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${ASSET}${o.src}" x="${x}" y="${y}" width="${w}" height="${h}"/>${o.body||''}</svg>`;
}
/* one LED lens drawn over the LED box in the card-edge drawing */
function artLed(o){ // {x,y,w,h, on, col, fid, attrs, title}
  return `<g ${o.attrs||''}><title>${o.title||''}</title><rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="1" fill="${o.on?o.col:'rgba(28,32,30,.55)'}" ${o.on?`filter="url(#${o.fid})"`:''}/><rect class="arthl" x="${o.x-1}" y="${o.y-1}" width="${o.w+2}" height="${o.h+2}" rx="1.5"/></g>`;
}
/* a connector on the rear-module drawing: hit area, optional plugged cable, live dot, scope highlight */
function artJack(o){ // {cx,cy,r, kind:'bnc'|'tb', w,h, conn, live, sel, attrs, title}
  const r=o.r||6, lv=o.live===undefined?'':`<circle cx="${o.cx+(o.kind==='tb'?o.w/2+2:r+0.6)}" cy="${o.cy+(o.kind==='tb'?-(o.h/2-1.5):r-0.6)}" r="1.7" fill="${o.live===true?'#2f8f46':o.live==='warn'?'#d9a21b':o.live==='err'?'#c0392b':'#8d9296'}" stroke="#fff" stroke-width=".35"/>`;
  let g='';
  if (o.conn) g+= o.kind==='tb'? `<rect x="${o.cx-o.w/2-.8}" y="${o.cy-o.h/2-.8}" width="${o.w+1.6}" height="${o.h+1.6}" rx="1" fill="#2b5f9e" opacity=".55"/>`
                               : `<circle cx="${o.cx}" cy="${o.cy}" r="${r*0.82}" fill="#2b5f9e" opacity=".8"/><circle cx="${o.cx}" cy="${o.cy}" r="${r*0.3}" fill="#9cc3ef"/>`;
  if (o.sel) g+=`<circle cx="${o.cx}" cy="${o.cy}" r="${r+1.6}" fill="rgba(255,210,60,.35)" stroke="#e5b21b" stroke-width=".5"/>`;
  const hit = o.kind==='tb'? `<rect class="arthl" x="${o.cx-o.w/2-1}" y="${o.cy-o.h/2-1}" width="${o.w+2}" height="${o.h+2}" rx="1"/>` : `<circle class="arthl" cx="${o.cx}" cy="${o.cy}" r="${r+0.6}"/>`;
  return `<g ${o.attrs||''}><title>${o.title||''}</title>${g}${lv}${hit}</g>`;
}
const SW='M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Software/atmel/';
/* ---------- timing from the code ---------- */
const CY = 1/8e6;                          // X1 8 MHz
const WAIT1000 = 1000*7*CY;                // _wait: wdr/subi/sbci/cpi/cpc/brne = 7 cycles per count (v100w.s)
const UPD = 101*15*CY;                     // PROCESS_SDI_LOCK_STATUS_UPDATE: 101 PINA samples, ≈15 cycles each (inferred from the C)
const PASS = WAIT1000 + UPD + 60e-6;       // + READ_GS2975_STATUS, PROCESS_SDI_LOCK_STATUS, CAN_FUNCTIONS (inferred)
const BOOT = 5*3000*7*CY + 100*30e-6;      // 5 × wait(3000) then 100 ADC slot samples (inferred conversion time)
const GS_T = 0.004;                        // GS2975A lock acquisition (inferred, datasheet-order value)
/* ---------- measured reach (test reports) ---------- */
const REACH_IN = { T6301:{SD:415,HD:160,'3G':57}, T6401:{SD:415,HD:160,'3G':57}, OEM:{SD:415,HD:160,'3G':85} };
const REACH_OUT = {SD:465, HD:210, '3G':125};   // M6203A-SUMMARY-NODATE.pdf, output cable lengths
const LOSS = {SD:9.5, HD:21, '3G':31};           // dB per 100 m at the half-bit-rate frequency, 1694A-class cable (inferred)
const RATE = {SD:{code:2,name:'270M',led:1}, HD:{code:5,name:'1.5G',led:2}, '3G':{code:6,name:'3G',led:3}};
const FMTS=['SD 525/59.94','SD 625/50','HD 1080i/59.94','HD 1080i/50','HD 720p/59.94','HD 1080p/23.98','3G 1080p/59.94','3G 1080p/50'];
const D={ in:{conn:true, fmt:'HD 1080i/59.94', len:50, asi:false}, rear:'T6301', build:'v101', slot:3, alarm:true,
  outLen:[10,10,10,10,10,10,10,10], ev:-1, prev:{lock:false, kind:'HD'}, boot:null, log:[], canQ:[] };
const act=K.actor(D);
const kind=()=> D.in.asi?'SD':H8.F[D.in.fmt].kind;
const reach=()=> REACH_IN[D.rear][kind()];
function rawOK(){ return D.in.conn && D.in.len<=reach(); }
/* fraction of PA4 samples that read "unlocked" for the present cable: 0 well inside reach, rising to 1 past it */
function flick(){ if (!D.in.conn) return 1; const r=D.in.len/reach(); return r<0.9?0: r>1.02?1: (r-0.9)/0.12; }
const hash=n=>{ n=(n^61)^(n>>>16); n=n+(n<<3); n=n^(n>>>4); n=Math.imul(n,0x27d4eb2d); n=n^(n>>>15); return (n>>>0)/4294967296; };
/* lock60 debouncer, exactly as PROCESS_SDI_LOCK_STATUS_UPDATE: 101 samples per pass; unlocked → locked needs ≥ 95
   locked samples, locked → unlocked needs ≥ 5 unlocked samples. Simulated pass by pass from the last event. */
function passes(){ const out=[]; const t0=Math.max(0,D.ev); let st=D.prev.lock?0x10:0;
  const p=flick(); const tl=D.ev+GS_T;
  for (let t=(D.boot!==null?D.boot+BOOT:0); t<1.0001; t+=PASS){
    if (D.boot!==null && t<D.boot+BOOT) continue;
    let cnt=0; const bad = t<tl ? (D.prev.lock?0:1) : p;
    for (let i=0;i<=100;i++){ const unl = bad>=1?true: bad<=0?false: hash(Math.floor(t*1e5)*131+i)<bad; if (st===0 ? !unl : unl) cnt++; }
    if (st===0 && cnt>=95) st=0x10; else if (st===0x10 && cnt>=5) st=0;
    out.push({t, st, cnt}); }
  return out; }
let PC=null, PCkey='';
function passList(){ const k=JSON.stringify([D.in,D.rear,D.ev,D.prev,D.boot]); if (k!==PCkey){ PC=passes(); PCkey=k; } return PC; }
function stAt(t){ const L=passList(); let lo=0, hi=L.length-1, k=-1; while(lo<=hi){ const mid=(lo+hi)>>1; if (L[mid].t<=t){ k=mid; lo=mid+1; } else hi=mid-1; } return k<0?{lock:!!D.prev.lock&&D.boot===null, cnt:0}:{lock:L[k].st===0x10, cnt:L[k].cnt}; }
function booting(t){ return D.boot!==null && t>=D.boot && t<D.boot+BOOT; }
function ledsAt(t){ if (booting(t)) return {lock:0,r270:0,r15:0,r3:0,nolock:0};
  const s=stAt(t), k=kind(); if (!s.lock) return {lock:0,r270:0,r15:0,r3:0,nolock:1};
  return {lock:1, r270:k==='SD'?1:0, r15:k==='HD'?1:0, r3:k==='3G'?1:0, nolock:0}; }
/* outputs: T6301 = 8 outs; T6401 = 4 per card. GS2978 pairs: U4/U5 on DDO, U6/U7 on DDO1; SDO and /SDO each drive a BNC.
   Outputs 2, 4, 5, 8 are on the inverting side (ASI PASS report, 24 Jun 2010). */
const INV=[false,true,false,true,true,false,false,true];
function outCount(){ return D.rear==='T6401'?4:8; }
function outState(i,t){ const s=stAt(t); if (!s.lock||booting(t)) return {ok:false, why:'DDO_MUTE_ENABLED + SDI_OUTPUTS_DISABLED (no lock)'};
  if (D.outLen[i]>REACH_OUT[kind()]) return {ok:false, why:`${D.outLen[i]} m is past the ${REACH_OUT[kind()]} m output reach`};
  if (D.in.asi && INV[i]) return {ok:false, why:'ASI is polarity-sensitive: this BNC is fed from the inverting /SDO side'};
  return {ok:true, why:D.in.asi?'ASI passes':'reclocked SDI'}; }
function rxLevel(){ return 800*Math.pow(10,-LOSS[kind()]*D.in.len/100/20); }
/* ---------- actions ---------- */
function event(fn){ const s=stAt(SIM.t); D.prev={lock:s.lock, kind:kind()}; fn(); D.ev=SIM.t; }
const A={
  plug(){ act(`${D.in.conn?'Unplug':'Plug in'} SDI IN (rear 1)`, tr=>{ event(()=>{ D.in.conn=!D.in.conn; }); tr(`GS2974A EQ → GS2975A reclocker ${rawOK()?'acquires lock (≈'+SIM.fmtDur(GS_T)+' '+inf('lock time')+')':'loses lock'} → LOCKED pin 28 → AT90CAN128 PA4 (pin 47)`);
    tr(`PROCESS_SDI_LOCK_STATUS_UPDATE: lock60 = ${D.prev.lock?'0x10':'0x00'}; next pass counts PA4 over 101 samples (≥95 to lock, ≥5 to drop)`);
    tr(rawOK()?'PROCESS_SDI_LOCK_STATUS: LOCK_LED_ON (PB0), BYPASS_MODE_OFF, DDO_MUTE_DISABLED (PA6), DATA_NOT_CLOCK_ENABLED (PA7), SDI_OUTPUTS_ENABLED (PD4); rate LED from ss = PINA[3:1]':'PROCESS_SDI_LOCK_STATUS: NO_LOCK_LED_ON (PB4), DDO_MUTE_ENABLED, SDI_OUTPUTS_DISABLED, sdi_format = NO_LOCK → DashBoard “Unlocked”'); }); },
  fmt(v){ act(`Source format → ${v}`, tr=>{ event(()=>{ D.in.fmt=v; D.in.asi=false; }); const k=kind();
    tr(`GS2975A SS[2:0] = ${RATE[k].code} (${RATE[k].name}) on PA1–PA3 → READ_GS2975_STATUS: ss = (PINA & 0x0E) >> 1`);
    tr(`sd_hd (PD7) = ${k==='SD'?'1 → sdi_format = SD_FORMAT':'0 → sdi_format = HD_FORMAT'} → SR_${k==='SD'?'270':k==='HD'?'1G5':'3G0'}_LED_ON`);
    if (k==='3G') tr('DashBoard “SDI Input” (OID 2.4) has only Locked / HD / SD / Unlocked: a 3G signal reports as HD; only OID 2.2 (rate code 3) tells them apart');
    tr(`Measured reach for ${k} on the ${D.rear==='OEM'?'OEM 3G rear (type A)':D.rear+'A'}: ${reach()} m — cable now ${D.in.len} m`); }); },
  asi(){ act(`Source → ${D.in.asi?'SDI':'DVB-ASI 270 Mb/s'}`, tr=>{ event(()=>{ D.in.asi=!D.in.asi; }); tr(D.in.asi?'ASI is 8b/10b at 270 Mb/s: the GS2975A reclocks it as an SD rate (ss = SR_270), so the card treats it as SD':'Back to SDI');
    if (D.in.asi) tr('Every GS2978 drives one BNC from SDO and one from /SDO. SDI (scrambled NRZI) does not care about polarity; ASI does. Outputs 2, 4, 5 and 8 carry inverted ASI (test report: “ASI on outputs 1, 3, 6 and 7”)'); }); },
  len(v){ act(`Input cable → ${v} m`, tr=>{ event(()=>{ D.in.len=+v; }); const f=flick();
    tr(`Signal at the GS2974A ≈ ${rxLevel().toFixed(0)} mV p-p (${(LOSS[kind()]*v/100).toFixed(1)} dB loss ${inf('cable data')})`);
    tr(f<=0?'Well inside the measured reach: PA4 stays high':f>=1?'Past the measured reach: the reclocker cannot hold lock':`Marginal: about ${(f*100).toFixed(0)} % of PA4 samples read unlocked — the 95/101 rule will not let lock60 latch, the 5/101 rule drops it`); }); },
  outLen(i,v){ act(`OUT${i+1} cable → ${v} m`, tr=>{ D.outLen[i]=+v; const s=outState(i,SIM.t); tr(`GS2978 driver, 800 mV nominal; output reach ${REACH_OUT[kind()]} m (${kind()}) per the summary sheet — ${s.ok?'downstream locks':s.why}`); }); },
  rear(r){ act(`Fit rear module ${r==='OEM'?'OEM 3G rear (type A)':r+'A'}`, tr=>{ event(()=>{ D.rear=r; }); tr(RM[r].note); }); },
  build(b){ act(`Firmware → ${b==='v101'?'M6203A v1.01':'03AC0000 (S&L Technology custom)'}`, tr=>{ D.build=b; tr(b==='v101'?'Dashboard.c: ParamProductName “M6203A”, ParamManuName “Ward-Beck Systems”, ParamSoftwareRev “1.01”':'C030000/Dashboard.c “Ali-Add”: ProductName, ManuName and SoftwareRev replaced by a single DASH; the Name string “MD-SDI Re-Clocking Distribution Amplifier” is left in');
    if (b!=='v101') tr('wbs_ztcpack.txt in C030000 still says /o bin/m6203a_v1_01.bin /v 1.01 /p M6203A — the custom image packs with the stock file name and version'); }); },
  reboot(){ act('DashBoard: Reboot', tr=>{ D.boot=SIM.t; D.prev={lock:false,kind:kind()}; D.ev=SIM.t; tr(`main(): initialization, DATA_INITIALIZATION (LEDs off, BYPASS_MODE_OFF, DDO_MUTE_DISABLED), CAN_RX, 5 × wait(3000) = ${SIM.fmtDur(5*3000*7*CY)}`); tr('100 ADC samples → ADDRESS_TABLE → slot_address → moduleAddress → DATA_SETUP → CANinit → CAN_TX → while(1)'); }); },
  alarm(v){ act(`DashBoard: Notify on Card Fault → ${v==='1'?'Enabled':'Disabled'}`, tr=>{ D.alarm=v==='1'; D.canQ.push(SIM.t); tr(`smpte_alarm_enabled = ${D.alarm?'YES':'NO'}: when sdi_format == NO_LOCK the SIGNAL_STATUS reply ${D.alarm?'raises the card fault':'stays quiet'}`); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; tr(`ADDRESS_TABLE(ad_result) → slot ${n}`); }); },
  reset(){ Object.assign(D,{in:{conn:true,fmt:'HD 1080i/59.94',len:50,asi:false},rear:'T6301',build:'v101',slot:3,alarm:true,outLen:[10,10,10,10,10,10,10,10],ev:-1,prev:{lock:false,kind:'HD'},boot:null,log:[],canQ:[]}); SIM.refresh(); },
};
/* ---------- panels ---------- */
const RM={ T6301:{name:'T6301A', sub:'single card (M6203A-T6301.cdr)', note:'T6301: 1 = SDI IN, 2 = not used, OUT1–OUT4 on the left (3,5,7,9), OUT5–OUT8 on the right (4,6,8,10). Measured reach: SD 415 m, HD 150 m (175 m fails), 3G 55 m (60 m fails).',
    cells:[[1,'SDI IN','in'],[2,'NOT USED','nc'],[3,'OUT1',0],[4,'OUT5',4],[5,'OUT2',1],[6,'OUT6',5],[7,'OUT3',2],[8,'OUT7',6],[9,'OUT4',3],[10,'OUT8',7]]},
  T6401:{name:'T6401A', sub:'double card (M6203A-T6401.cdr)', note:'T6401: two M6203A cards share the module; each gets SDI IN and four outputs (card -1 on the right, card -2 on the left).', split:['M6203A-2','M6203A-1 (this card)'],
    cells:[[2,'SDI IN','in'],[1,'SDI IN',null],[4,'OUT1',0],[3,'OUT1',null],[6,'OUT2',1],[5,'OUT2',null],[8,'OUT3',2],[7,'OUT3',null],[10,'OUT4',3],[9,'OUT4',null]]},
  OEM:{name:'OEM 3G rear (type A)', sub:'used for the cable tests (plain-text name only)', note:'The test reports use the frame maker’s 3G “type A” rear module: 3G reach 75 m (100 m fails) against 55 m on the T6301A.',
    cells:[[1,'SDI IN','in'],[2,'NOT USED','nc'],[3,'OUT1',0],[4,'OUT5',4],[5,'OUT2',1],[6,'OUT6',5],[7,'OUT3',2],[8,'OUT7',6],[9,'OUT4',3],[10,'OUT8',7]]} };
/* Artwork 2026|59: edge from M6203A LED Status.cdr (2010-04-28), rears from the openGear Rear Module Guide (2012-01-16);
   assets shared with the m6203 plugin. pt coordinates; BNC pitch 18.9 pt. The OEM rear has no Ward-Beck drawing: kept as before. */
const ARTC={edge:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/MANUAL/M6203A LED Status.cdr',
  rear:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6203A - rear module options.cdr',
  RM:{T6301:{src:'m6203-rear-t6301a.svg', vb:[336,220,122,148], x:[377.0,395.9], y0:277.0, name:'T6301A-3G'}, T6401:{src:'m6203-rear-t6401a.svg', vb:[470,220,130,148], x:[521.4,540.3], y0:277.4, name:'T6401A'}}};
function rearSVG(){ const r=RM[D.rear], t=SIM.t, A=ARTC.RM[D.rear];
  const cells=r.cells.map(([n,l,o])=>{ if (o==='nc') return {n,label:l,kind:'nc'}; if (o==='in') return {n,label:l,id:'in',conn:D.in.conn,live:D.in.conn?(stAt(t).lock?true:'warn'):undefined};
    if (o===null) return {n,label:l,live:'off',other:true}; const st=outState(o,t); return {n,label:l+(D.in.asi&&INV[o]?' (inv)':''),live:st.ok?true:'err',title:st.why}; });
  if (!A) return K.rearSVG({name:r.name, sub:r.sub, split:r.split, id:'AN_BMID / AN_BMID2 identify the module', cells});
  const body=cells.map(c=>{ const cx=A.x[(c.n-1)%2], cy=A.y0+Math.floor((c.n-1)/2)*18.9;
    return artJack({cx, cy, r:5.9, conn:c.conn, live:c.kind==='nc'?undefined:c.live, attrs:c.id?`class="og62-hot" data-jack="${c.id}"`:'', title:`${c.n}: ${c.label}${c.title?' — '+c.title:''}${c.other?' (the other card)':''}${c.id?(c.conn?' (click to unplug)':' (click to plug in)'):''}`})
      + (c.other?`<circle cx="${cx}" cy="${cy}" r="6.2" fill="rgba(80,84,88,.35)" pointer-events="none"/>`:''); }).join('');
  return artSVG({src:A.src, vb:A.vb, maxw:300, label:A.name+' rear module', fid:'m63aar', body})
    + `<div class="small muted" style="text-align:center">${A.name}: ${SIM.src(ARTC.rear,'M6203A - rear module options.cdr')} (2012-01-16)${r.split?' · this card = card 1 (right)':''}</div>`; }
function edgeSVG(t){ const L=ledsAt(t);
  const body=[['LOCK','g',L.lock,'LED1 GRN, PB0'],['270M','y',L.r270,'LED2 YEL, PB1'],['1.5G','y',L.r15,'LED3 YEL, PB2'],['3G','y',L.r3,'LED4 YEL, PB3'],['NO LOCK','r',L.nolock,'LED5 RED, PB4']]
    .map(([n,c,on,ti],i)=>artLed({x:275.7, y:[350.6,370.1,389.6,409.4,427.4][i]-6.1, w:5.3, h:12.2, on, col:K.LEDC[c], fid:'m63aag', title:`${n} LED: ${ti} (${on?'lit':'off'})`})).join('');
  return artSVG({src:'m6203-edge.svg', vb:[186,290,120,350], maxw:200, label:'M6203A card edge', fid:'m63aag', body})
    + `<div class="small muted" style="text-align:center">${SIM.src(ARTC.edge,'M6203A LED Status.cdr')} (2010-04-28)</div>`; }
function dashHTML(){ const s=stAt(SIM.t), k=kind(), sl=D.build!=='v101';
  const st=s.lock?(k==='SD'?'SD':'HD'):'Unlocked';
  return K.dashHTML({key:'m6203a', title:`Slot ${D.slot}: ${sl?'-':'M6203A'}`, alarm:!s.lock&&D.alarm, tree:[{name:'DFR-8320 frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: ${sl?'-':'M6203A'}`,lvl:1,sel:true}],
    tabs:[{name:'Card Info',rows:[{type:'text',label:'Product',value:sl?'-':'M6203A',oid:'1.5'},{type:'text',label:'Name',value:'MD-SDI Re-Clocking Distribution Amplifier',oid:'1.6'},{type:'text',label:'Supplier',value:sl?'-':'Ward-Beck Systems',oid:'1.2'},{type:'text',label:'Board Rev',value:'Iss.1',oid:'1.7'},{type:'text',label:'Software Rev',value:sl?'-':'1.01',oid:'1.11'}]},
      {name:'Status',rows:[{type:'status',label:'SDI Input',value:st,level:s.lock?'ok':'err',oid:'2.4'},{type:'text',label:'Data rate (OID 2.2, not in a menu)',value:s.lock?['','1 (270 Mb/s)','2 (1.5 Gb/s)','3 (3 Gb/s)'][k==='SD'?1:k==='HD'?2:3]:'0'}]},
      {name:'Settings',rows:[{type:'combo',id:'alarm',label:'Notify on Card Fault',value:D.alarm?1:0,options:[[1,'Enabled'],[0,'Disabled']],oid:'3.x'}]}],
    footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload…'}], foot:sl?'03AC0000':'v1.01'}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>SDI in</b><button data-x="plug">${D.in.conn?'Unplug':'Plug in'}</button>
    ${sel('fmt',FMTS.map(f=>[f,f]),D.in.fmt)} <button data-x="asi" class="${D.in.asi?'on':''}">ASI</button> cable ${sel('len',[5,25,50,55,60,75,100,140,150,175,215,290,340,415,450].map(v=>[v,v+' m']),D.in.len)}
    rear ${sel('rear',[['T6301','T6301A'],['T6401','T6401A'],['OEM','OEM 3G (type A)']],D.rear)} build ${sel('build',[['v101','v1.01'],['C030000','03AC0000 S&L']],D.build)} <button data-x="reset">Defaults</button></div>
    <div class="small" style="margin-top:6px">Output cables: ${Array.from({length:outCount()},(_,i)=>`OUT${i+1} ${sel('o'+i,[10,25,50,75,100,125,150,210,250,465,500].map(v=>[v,v+'m']),D.outLen[i])}`).join(' ')}</div>`; }
function bindAll(r){ K.bind(r,{jack:{in:()=>A.plug()}, slot:n=>A.slot(n), dash:(id,v)=>{ if(id==='reboot') A.reboot(); else if(id==='alarm') A.alarm(v); else if(id==='upload') act('DashBoard: Upload…', tr=>{ tr('Ross OGP bootloader (atmel/Bootloader, bootavr.c): START_UPGRADE → pages → VERIFY → REBOOT; image bin/m6203a_v1_01.bin from zeuspack'); }); }});
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='plug')A.plug(); else if(x==='fmt')A.fmt(el.value); else if(x==='asi')A.asi(); else if(x==='len')A.len(el.value); else if(x==='rear')A.rear(el.value); else if(x==='build')A.build(el.value); else if(x==='reset')A.reset(); else if(x[0]==='o')A.outLen(+x.slice(1),el.value); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; });
  r.querySelectorAll('[data-led]').forEach(()=>{}); }
function pcbHTML(t){ const L=ledsAt(t); const ly=[47,66,86,104,123];
  return H8.pcbSVG({src:ASSET+'m6203a-pcb-top.png', w:1277, h:290, leds:[['Lock','g',L.lock],['270M','y',L.r270],['1.5G','y',L.r15],['3G','y',L.r3],['No Lock','r',L.nolock]].map(([n,c,on],i)=>({x:16,y:ly[i],c,on,name:n})),
    marks:[{x:30,y:20,label:'front edge: LED1–LED5'},{x:1060,y:20,label:'P1 → rear module'}], note:'M6203A-ISS3 Gerbers (TOP copper, TSM mask, TSS silk), 12.76 × 2.89 in, rendered 100 dpi; LEDs lit live'}); }
/* ---------- timeline ---------- */
function lanes(){ const css=SIM.css, f=H8.F[D.in.asi?'SD 525/59.94':D.in.fmt], ls=[];
  const dead=t=>!stAt(t).lock;
  ls.push(H8.frameLane(f,!D.in.conn)); ls.push(H8.lineLane(f,!D.in.conn));
  ls.push({label:'GS2975A LOCKED → PA4 (raw)', h:20, draw(c,X,t0,t1,y,h){ const N=Math.min(1600,Math.max(100,(X(t1)-X(t0)))), sp=t1-t0, p=flick(); c.fillStyle='#2f8f46'; for(let i=0;i<N;i++){ const tt=t0+sp*(i+.5)/N; let ok; if (tt<D.ev+GS_T) ok=D.prev.lock; else ok = p<=0?true:p>=1?false: hash(Math.floor(tt*1e5)*131+i%101)>=p; if(ok) c.fillRect(X(t0+sp*i/N),y+4,(X(t1)-X(t0))/N+0.6,h-8); } }});
  ls.push({label:'AVR main-loop passes (≈'+SIM.fmtDur(PASS)+')', h:22, draw(c,X,t0,t1,y,h){ passList().forEach(p=>{ if(p.t+PASS<t0||p.t>t1) return; c.fillStyle=p.st?css('--accent'):css('--bad'); c.fillRect(X(p.t),y+4,Math.max(1,X(p.t+UPD)-X(p.t)),h-8); c.fillStyle=css('--grid'); c.fillRect(X(p.t+UPD),y+8,Math.max(1,X(p.t+PASS)-X(p.t+UPD)),h-16);
      if (X(p.t+PASS)-X(p.t)>110){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`${p.cnt}/101 → lock60 ${p.st?'0x10':'0x00'}`,X(p.t)+2,y+h-3); } }); if (D.boot!==null){ c.fillStyle=css('--warn'); c.globalAlpha=.4; c.fillRect(X(D.boot),y+2,X(D.boot+BOOT)-X(D.boot),h-4); c.globalAlpha=1; } }});
  ls.push(K.boolLane('lock60 (debounced)', t=>stAt(t).lock, css('--accent')));
  ls.push(K.boolLane('Lock LED (PB0)', t=>ledsAt(t).lock, '#2f8f46'));
  ls.push(K.boolLane('No Lock LED (PB4)', t=>ledsAt(t).nolock, '#c0392b'));
  ls.push(K.boolLane(`Rate LED ${RATE[kind()].name}`, t=>{ const L=ledsAt(t); return L.r270||L.r15||L.r3; }, '#d9a21b'));
  ls.push(K.boolLane('~DDO_MUTE high = outputs live (PA6)', t=>!dead(t)&&!booting(t), css('--accent2')));
  ls.push(K.canLane(K.canFrames({poll:0.5, phase:(D.slot*0.0173)%0.4, q:D.canQ})));
  return ls; }
/* ---------- views ---------- */
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Source, cables, rear module', `<div id="ctl"></div>`)}${card('DashBoard (redrawn)', `<div id="dash"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear module', `<div id="rear"></div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('The board (ISS3 Gerbers in this folder)', `<div id="pcb"></div>`)}${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}<div class="grid2">${card('State at the playhead', `<div id="insp"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, s=stAt(t), k=kind();
    m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(); m.querySelector('#pcb').innerHTML=pcbHTML(t);
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    const ok=Array.from({length:outCount()},(_,i)=>outState(i,t).ok?'●':'○').join(' ');
    m.querySelector('#insp').innerHTML=`<table class="kv"><tr><th>PINA</th><td class="mono">PA4 LOCKED = ${s.lock?1:0} · PA3:1 SS = ${s.lock?RATE[k].code.toString(2).padStart(3,'0'):'000'} · PA6 ~DDO_MUTE = ${s.lock?1:0}</td></tr><tr><th>lock60</th><td class="mono">${s.lock?'0x10':'0x00'} (last pass ${s.cnt}/101)</td></tr><tr><th>sdi_format</th><td class="mono">${s.lock?(k==='SD'?'SD_FORMAT (1)':'HD_FORMAT (2)'):'NO_LOCK (0)'}</td></tr>
      <tr><th>Signal at EQ</th><td class="mono">${D.in.conn?rxLevel().toFixed(0)+' mV p-p after '+D.in.len+' m':'—'}</td></tr><tr><th>Outputs</th><td class="mono">${ok}</td></tr></table>`;
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second of the M6203A', `<div id="lad"></div>`)}<div class="grid2">${card('Signal through the card', `<div id="path"></div>`)}${card('Cable reach (test reports)', `<div id="reach"></div>`)}</div>`;
  const draw=()=>{ const f=H8.F[D.in.asi?'SD 525/59.94':D.in.fmt], k=kind();
    const rows=[['Serial bits in',(f.rate/1e6).toFixed(2)+' M','',`${k} through GS2974A EQ and GS2975A reclocker`],['Video frames',f.fps.toFixed(3),SIM.fmtDur(1/f.fps),f.name],['Video lines',Math.round(H8.lineRate(f)).toLocaleString(),SIM.fmtDur(1/H8.lineRate(f)),''],
      ['AVR main-loop passes','≈'+Math.round(1/PASS),SIM.fmtDur(PASS),'wait(1000) = 7000 cycles + 101-sample lock check '+inf('rest of pass')],['PA4 lock samples','≈'+Math.round(101/PASS).toLocaleString(),'','PROCESS_SDI_LOCK_STATUS_UPDATE'],
      ['Lock latency','',SIM.fmtDur(GS_T+PASS),'reclocker lock '+inf('time')+' + one pass'],['Boot to first pass','',SIM.fmtDur(BOOT),'5 × wait(3000) + ADC slot read'],['DashBoard polls','2',"500 ms",inf('MFC poll rate')]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    const lossIn=LOSS[k]*D.in.len/100;
    m.querySelector('#path').innerHTML=K.levelSVG([{name:'Source 800 mV p-p (0 dB)',level:0},{name:`Input cable ${D.in.len} m`,level:-lossIn,note:(LOSS[k])+' dB/100 m '+inf('cable data')},{name:'GS2974A adaptive EQ',level:D.in.len<=reach()?0:-lossIn,col:D.in.len<=reach()?'var(--accent2)':'var(--bad)',note:D.in.len<=reach()?'restored':'past reach'},{name:'GS2975A reclock',level:stAt(SIM.t).lock?0:null},{name:'GS2978 × 4 (8 BNC, 800 mV)',level:stAt(SIM.t).lock?0:null},{name:`OUT1 after ${D.outLen[0]} m`,level:stAt(SIM.t).lock?-LOSS[k]*D.outLen[0]/100:null}],{lo:-40,hi:5,unit:'dB'});
    m.querySelector('#reach').innerHTML=`<table class="kv"><tr><th></th><th>3G 1080p/59.94</th><th>HD 1080i/59.94</th><th>SD 525i/59.94</th></tr>
      <tr><td>Input, OEM 3G rear (06DEC10)</td><td class="mono">75 ✓ · 100 ✗</td><td class="mono">150 ✓ · 175 ✗</td><td class="mono">415 ✓</td></tr>
      <tr><td>Input, T6301A (06DEC10)</td><td class="mono">55 ✓ · 60 ✗</td><td class="mono">150 ✓ · 175 ✗</td><td class="mono">415 ✓</td></tr>
      <tr><td>Input, summary sheet / 4 Nov 2011</td><td class="mono">75 / 75</td><td class="mono">150 / 140</td><td class="mono">400 / 400</td></tr>
      <tr><td>Output, summary sheet</td><td class="mono">125</td><td class="mono">210</td><td class="mono">465</td></tr>
      <tr><td>Input, undated ASI sheet</td><td colspan="3" class="mono">T6301A: 50 ✓ 75 ✗ · OEM: 50 ✓ 75 ✓ 100 ✗ · outputs at 25 m: “audio &amp; pic OK, bad eye”</td></tr></table>
      <p class="small muted">Metres of coax, hand-written in the scanned reports. Failures were “Audio No lock”. The model interpolates between the last pass and first fail ${inf('the exact limit')}.</p>`; };
  SIM.on('time', draw);
}
const BLOCKS={ rin:{x:10,y:40,w:150,h:70,t:'Rear BNC 1',s:['SDI IN, 75 Ω','T6301A / T6401A'],d:'Rear module position 1 (M6203A-T6301.cdr). P1 pin 97 = BNC1_SIG.'},
  eq:{x:200,y:40,w:150,h:70,t:'GS2974A',s:['adaptive cable EQ','U1'],d:'Gennum adaptive equaliser (U1, M6203A-iss3.net). Its reach was the weak point in the test reports.'},
  rc:{x:390,y:40,w:160,h:90,t:'GS2975A',s:['reclocker U3, X2 GO1535','LOCKED, SS0–2, LOS','BYPASS, ~DDO_MUTE'],d:'Multi-rate reclocker. LOCKED → PA4, SS[2:0] → PA1–PA3, LOS → PA5, BYPASS ← PA0, ~DDO_MUTE ← PA6.'},
  drv:{x:600,y:30,w:160,h:110,t:'GS2978 × 4',s:['U4/U5 on DDO','U6/U7 on DDO1','SDO and /SDO → 8 BNC'],d:'Four dual-output cable drivers. Each drives a BNC from SDO and one from /SDO, so half the outputs are inverted — invisible to SDI, fatal to ASI (outputs 2, 4, 5, 8).'},
  out:{x:600,y:190,w:160,h:70,t:'OUT1–OUT8',s:['rear 3–10'],d:'Eight reclocked copies on the T6301A (four per card on the T6401A).'},
  mcu:{x:390,y:190,w:160,h:90,t:'AT90CAN128',s:['U11, 8 MHz','LED1–5, CAN (SN65HVD233)'],d:'v1.01 firmware: reads the reclocker, debounces lock (95/101, 5/101), drives five LEDs and mute, answers DashBoard.'},
  can:{x:200,y:190,w:150,h:70,t:'Frame CAN',s:['MFC-8310 → DashBoard'],d:'openGear CAN at 1 Mbit/s through the SN65HVD233 transceiver (U9).'},
  pwr:{x:10,y:190,w:150,h:70,t:'LM2676 3.3 V',s:['switching regulator'],d:'REG1 LM2676-3.3V from the frame 12 V, fuse F2 RXE050.'} };
const WIRES=[['rin','eq',''],['eq','rc','SDI'],['rc','drv','DDO / DDO1'],['drv','out',''],['rc','mcu','lock, rate'],['mcu','rc','mute, bypass'],['mcu','can','OGP'],['pwr','mcu','3.3 V']];
const SHEETS=[
  {name:'1 · Signal path', note:'Net names from M6203A-iss3.net.', svg:()=>K.chip(60,60,140,'U1 GS2974A',[['SDI','BNC1_SIG (P1-97)']],[['SDO','→ U3']],'adaptive EQ')+K.chip(370,60,170,'U3 GS2975A',[['SDI','from U1'],['19','BYPASS'],['36','~DDO_MUTE']],[['28','LOCKED'],['29','LOS'],['24–26','SS0–SS2'],['DDO','DDO / ~DDO'],['DDO1','DDO1 / ~DDO1']],'reclocker, X2 GO1535')+K.chip(360,300,120,'U4/U5 GS2978',[['1','DDO'],['2','~DDO']],[['SDO','OUT'],['/SDO','OUT (inv)']],'U5 = “-X” footprint')+K.chip(670,300,120,'U6/U7 GS2978',[['1','DDO1'],['2','~DDO1']],[['SDO','OUT'],['/SDO','OUT (inv)']],'U6 = “-X” footprint')},
  {name:'2 · Controller', note:'Pins from the netlist; port bits from M6203.h. Note LOS: wired to pin 46 (PA5) but M6203.h reads BIT3 (PA3).', svg:()=>K.chip(330,40,210,'U11 AT90CAN128',[['10 PB0','LED1 Lock'],['11 PB1','LED2 270M'],['12 PB2','LED3 1.5G'],['13 PB3','LED4 3G'],['14 PB4','LED5 No Lock'],['32 PD7','SD/HD (sd_hd)']],[['51 PA0','BYPASS'],['50–48 PA1–3','SS0–SS2'],['47 PA4','LOCKED (lock60)'],['46 PA5','LOS'],['45 PA6','~DDO_MUTE'],['PD4','SDI_OUTPUTS_ENABLED']],'8 MHz · v1.01')}];
const TUT={i:0};
const LESSONS=[
  {title:'Meet the M6203A', body:'<p>The M6203A is a <b>reclocking distribution amplifier</b>: one SD/HD/3G-SDI input, eight reclocked outputs (T6301A rear). There is no manual in the archive; this tutorial follows the card-edge and LED-status drawings and the test department’s reports.</p>', check:()=>true, auto:true},
  {title:'1 · Lock an HD signal', body:'<p>Plug in SDI IN. <b>Lock</b> and <b>1.5G</b> light; DashBoard “SDI Input” shows HD.</p>', check:()=>stAt(SIM.t).lock&&kind()==='HD', hint:'Click SDI IN on the rear (position 1), then move the playhead a few ms.'},
  {title:'2 · Go 3G', body:'<p>Choose <b>3G 1080p/59.94</b>. The 3G LED lights, but DashBoard still says “HD” — the status list has no 3G entry.</p>', check:()=>kind()==='3G'&&stAt(SIM.t).lock, hint:'Format menu → 3G 1080p/59.94.'},
  {title:'3 · Find the cable limit', body:'<p>Set the input cable to <b>60 m</b>. On the T6301A the test department lost lock here (“60 m failed”). Watch the raw PA4 lane flicker and the 95-of-101 rule refuse to latch.</p>', check:()=>kind()==='3G'&&D.in.len>=60&&D.rear==='T6301'&&!stAt(SIM.t).lock, hint:'cable → 60 m with 3G selected and the T6301A fitted.'},
  {title:'4 · Swap the rear module', body:'<p>Fit the <b>OEM 3G rear (type A)</b>. The same card now reaches 75 m at 3G.</p>', check:()=>D.rear==='OEM'&&kind()==='3G'&&D.in.len>=60&&stAt(SIM.t).lock, hint:'rear → OEM 3G (type A).'},
  {title:'5 · Pass ASI', body:'<p>Switch the source to <b>ASI</b>. Outputs 2, 4, 5 and 8 go red: they come from the inverting side of the GS2978 drivers.</p>', check:()=>D.in.asi&&stAt(SIM.t).lock, hint:'Press ASI (cable under 400 m).'},
  {title:'6 · Card fault alarm', body:'<p>With <b>Notify on Card Fault</b> enabled, unplug the input: No Lock lights, outputs mute (~DDO_MUTE) and DashBoard flags the card.</p>', check:()=>!D.in.conn&&D.alarm, hint:'Unplug SDI IN.'},
  {title:'Done', body:'<p>See <b>Findings</b> for the polarity story, the wrong LOS pin, and the unbranded 2013 build.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — using the M6203A (from the drawings and test reports)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2"><div>${card('main() while(1) in v100w.c — running step', `<div id="flow"></div>`)}${card('lock60 state machine (PROCESS_SDI_LOCK_STATUS_UPDATE)', `<div id="fsm"></div>`)}</div><div>${card('How the parts are driven', `<table class="kv small"><tr><th>Name (M6203.h)</th><th>Pin</th><th>Set when</th></tr>
  <tr><td>LOCK_LED / NO_LOCK_LED</td><td class="mono">PB0 / PB4</td><td>lock60 ≠ 0 / = 0</td></tr><tr><td>SR_270 / SR_1G5 / SR_3G0 LED</td><td class="mono">PB1 / PB2 / PB3</td><td>ss = 2 / 5 / 6 and sd_hd</td></tr>
  <tr><td>BYPASS_MODE_ON/OFF</td><td class="mono">PA0</td><td>only ever OFF — and STROBE_WRITE uses PA0 too (template)</td></tr><tr><td>DDO_MUTE_ENABLED/DISABLED</td><td class="mono">PA6</td><td>no lock / lock</td></tr>
  <tr><td>DATA_NOT_CLOCK_ENABLED</td><td class="mono">PA7</td><td>on lock</td></tr><tr><td>SDI_OUTPUTS_ENABLED</td><td class="mono">PD4</td><td>lock (disabled on loss)</td></tr><tr><td>COM_ACTIVITY / ERROR LED</td><td class="mono">PG0 / PE6</td><td>defined, but no LED on the ISS3 netlist</td></tr></table>`)}${card('DashBoard parameters', `<table class="kv small"><tr><td class="mono">2.4 SDI Input</td><td>bitmask: BIT1 HD, BIT2 SD, BIT3 Unlocked</td></tr><tr><td class="mono">2.2</td><td>rate code 0–3 (ss & sdi_format)</td></tr><tr><td class="mono">Notify on Card Fault</td><td>smpte_alarm_enabled</td></tr><tr><td class="mono">1.x Card Info</td><td>M6203A · Ward-Beck Systems · Iss.1 · 1.01 (all “-” in 03AC0000)</td></tr></table>`)}</div></div>`;
  const draw=()=>{ const t=SIM.t; if (booting(t)){ m.querySelector('#flow').innerHTML=H8.flowSVG(['initialization() · DATA_INITIALIZATION()','CAN_RX · 5 × wait(3000)','100 × AD_CONVERTER_SETUP → ADDRESS_TABLE','DATA_SETUP · CANinit · CAN_TX'],Math.min(3,Math.floor((t-D.boot)/BOOT*4)),true); }
    else { const L=passList(); const p=L.filter(x=>x.t<=t).pop(); const ph=p?(t-p.t):0; const k=ph<UPD?1:ph<UPD+20e-6?2:ph<UPD+WAIT1000?3:4;
      m.querySelector('#flow').innerHTML=H8.flowSVG(['WDR(); READ_GS2975_STATUS(): los, sd_hd (PD7), ss = PINA[3:1]','PROCESS_SDI_LOCK_STATUS_UPDATE(): 101 × read PA4 (PC1 strobe)','PROCESS_SDI_LOCK_STATUS(): LEDs, mute, outputs, sdi_format','wait(1000) — 7000 cycles = '+SIM.fmtDur(WAIT1000),'CAN_FUNCTIONS(): DashBoard replies'],k); }
    const s=stAt(t); m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 520 170" style="width:100%"><rect x="20" y="50" width="170" height="60" rx="10" fill="${!s.lock?'var(--bad)':'var(--panel2)'}" stroke="var(--line)"/><text x="105" y="77" text-anchor="middle" font-size="13" fill="${!s.lock?'#fff':'var(--ink)'}">lock60 = 0x00</text><text x="105" y="96" text-anchor="middle" font-size="10.5" fill="${!s.lock?'#fff':'var(--ink2)'}">count LOCKED samples</text>
      <rect x="330" y="50" width="170" height="60" rx="10" fill="${s.lock?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="415" y="77" text-anchor="middle" font-size="13" fill="${s.lock?'#fff':'var(--ink)'}">lock60 = 0x10</text><text x="415" y="96" text-anchor="middle" font-size="10.5" fill="${s.lock?'#fff':'var(--ink2)'}">count UNLOCKED samples</text>
      <path d="M190 62 L330 62" stroke="var(--ink2)" marker-end="url(#og62ar)"/><text x="260" y="55" text-anchor="middle" font-size="10.5" fill="var(--ink)">≥ 95 of 101</text><path d="M330 100 L190 100" stroke="var(--ink2)"/><text x="260" y="118" text-anchor="middle" font-size="10.5" fill="var(--ink)">≥ 5 of 101 (comment says 10)</text>
      <text x="20" y="160" font-size="11" fill="var(--ink2)">last pass: ${s.cnt}/101 counted</text></svg>`; };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>Artwork ${SIM.year(2026)}: panels now from the CorelDRAW files.</b> Card edge from ${SIM.src(ARTC.edge,'M6203A LED Status.cdr')} (2010-04-28: LOCK, 270M, 1.5G, 3G, NO LOCK); T6301A-3G and T6401A rears from ${SIM.src(ARTC.rear,'M6203A - rear module options.cdr')} (2012-01-16), LEDs and BNCs placed on the drawn boxes and holes. The OEM “type A” rear has no Ward-Beck drawing and keeps the plain sketch. The guide captions the dual T6401A “M6203A-3G/HD/SD-SDI DA- <b>NOT 3G</b>”: two cards on one module were only offered for HD/SD.`,
  `<b>Why ASI only works on half the outputs.</b> The test report (24 Jun 2010) found ASI on outputs 1, 3, 6, 7 only; the summary sheet calls the rest “the negative side of the differential transmitter”. The netlist confirms it: each GS2978 (U4–U7) feeds one BNC from SDO and one from /SDO. Polarity is irrelevant to scrambled SDI but inverts 8b/10b ASI.`,
  `<b>Reach below expectation.</b> Cable tests: 3G 55 m on the T6301A against 75 m on the OEM 3G rear; HD 150 m; SD 415 m. The summary says it plainly: “as a Distribution Amplifier, the cable lengths are not impressive”, and the output eye “could be improved”.`,
  `<b>3G is invisible on DashBoard.</b> Dashboard.c’s “SDI Input” list is Locked / HD / SD / Unlocked; PROCESS_SDI_LOCK_STATUS sets sdi_format = HD_FORMAT for 3G. Only the hidden rate code (OID 2.2 = 3) and the 3G LED tell 3G from HD.`,
  `<b>Debounce comment is wrong.</b> PROCESS_SDI_LOCK_STATUS_UPDATE’s header says lock drops after 10 bad samples out of 100; the code sets lock60_nolock_limit = 5 and loops i = 0…100 (101 samples).`,
  `<b>LOS read from the wrong pin.</b> M6203.h: los_mask = BIT3 (PA3), but the ISS3 netlist wires LOS to pin 46 (PA5); PA3 is SS2. It does no harm only because the LOS test is commented out.`,
  `<b>Template leftovers.</b> M6203A.c still declares Dolby, AES-lock and ERROR_CHECK variables from the M6202A; altera.c is linked although the board has no FPGA, and STROBE_WRITE_HIGH and BYPASS_MODE_ON share PA0. BYPASS_MODE_ON is never called.`,
  `<b>Board issue mismatch.</b> M6203.h has BOARD_ISSUE 1, so DashBoard reports “Iss.1” on the ISS3 board whose Gerbers are in this folder (dated 2011-12-06).`,
  `<b>Unbranded build keeps the stock name.</b> 03AC0000 (S&L Technology, 2013) blanks Product, Supplier and Software Rev with “-” (Ali-Add blocks), but leaves “MD-SDI Re-Clocking Distribution Amplifier” and packs as bin/m6203a_v1_01.bin, version 1.01.`,
  `<b>No COM or error LED.</b> COM_ACTIVITY_LED (PG0) and ERROR_LED (PE6) are defined, but the ISS3 netlist has only LED1–LED5 (Lock, 270M, 1.5G, 3G, No Lock).`,
  `<b>PC1 test strobe.</b> PROCESS_SDI_LOCK_STATUS_UPDATE raises PORTC bit 1 before each 101-sample burst and clears it inside the loop — a scope trigger left in the release.`];
const ASSUME=['Main-loop pass ≈ '+SIM.fmtDur(PASS)+': wait(1000) is exact from v100w.s (7 cycles × 1000); the lock check and CAN time '+inf('estimated from the C'),'GS2975A lock time '+SIM.fmtDur(GS_T)+' '+inf('datasheet-order value'),'Cable loss per 100 m '+inf('1694A-class coax'),'Reach limits interpolated between the last pass and first fail in the reports '+inf('hand-written data'),'DashBoard poll every 500 ms '+inf('MFC behaviour')];
const SOURCES=['#OPENGEAR #SERIES/M6203A - #Master #OPENGEAR/M6203A-ISS3 - #Gerbers.zip (TOP, TSM, TSS)','#OPENGEAR #SERIES/M6203A - #Master #OPENGEAR/M6203A - #TESTREPORT/: CABLE_LENGTH-06DEC10, CABLE LENGTH-NODATE, ASI PASS-24JUN10, SUMMARY-NODATE, V101-28APR10, V1001-17NOV11, V1001-09JAN12, 03AC0000-17JUN13',SW+'v101/v100w.c, M6203A.c, M6203.h, Dashboard.c, v100w.s, wbs_ztcpack.txt (firmware — sibling folder, linked)',SW+'C030000/Dashboard.c, wbs_ztcpack.txt','M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/PCB/M6203A-iss3.net','M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Functional/M6203A-card-edge.cdr, M6203A-T6301.cdr, M6203A-T6401.cdr; MANUAL/M6203A LED Status.cdr','Artwork '+SIM.year(2026)+': '+SIM.src(ARTC.edge,'M6203A LED Status.cdr')+' → assets/m6203-edge.svg; '+SIM.src(ARTC.rear,'M6203A - rear module options.cdr')+' → assets/m6203-rear-t6301a.svg, m6203-rear-t6401a.svg (shared with m6203)'];
SIM.register({ id:'m6203a', product:'M6203A', name:'M6203A · SDI reclocking distribution amplifier, openGear: release package (2010|43)', year:2010,
  folder:'#OPENGEAR #SERIES/M6203A - #Master #OPENGEAR', family:'openGear',
  summary:'The M6203A reclocks one SD/HD/3G-SDI input to eight outputs (GS2974A EQ, GS2975A reclocker, four GS2978 drivers). This release folder holds the ISS3 Gerbers and the test department’s reports; the model runs the v1.01 firmware from the M6203 engineering folder against the measured cable reach.',
  highlights:['Board drawn from the ISS3 Gerbers in this folder','Lock debouncer (95 of 101 / 5 of 101) pass by pass','Measured cable reach per rear module','Why ASI passes on outputs 1, 3, 6, 7 only','The unbranded S&L build'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 main-loop pass',period:()=>PASS},{label:'1 video line',period:()=>1/H8.lineRate(H8.F[D.in.fmt])},{label:'1 frame',period:()=>1/H8.F[D.in.fmt].fps},{label:'1 ms',period:()=>1e-3}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms'],[0.005,'5 ms'],[0.0005,'500 µs'],[0.00005,'50 µs']], defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:780,h:300,sel:'rc'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'M6203A',sheets:SHEETS,foot:'REDRAWN from M6203A-iss3.net pin and net names and M6203.h — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:m=>H8.findingsView(m,'What the M6203A (and its folder) are up to',FINDINGS,ASSUME,SOURCES)}],
});
})();
