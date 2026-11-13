/* =====================================================================
   M6206A — openGear MD-SDI AES demultiplexer with Dolby decoding and voice-over mixing (Ward-Beck Systems, 2007|40)
   Production package "M6206A - #Master #OPENGEAR": pick-and-place programs M6206A-T.prg (top, 237 parts) and
   M6206Ab-B.prg (bottom, 89 parts), both saved 2007-11-06; plus a copy of the M6245A power-board P-CAD files.
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   The design, firmware and manuals live in the sibling engineering folder (linked):
   - M6206 - #Engineering #OPENGEAR/Software/atmel/v104/: M6206A.c (ALTERA_TRANSLATE_UART0 voice-over state machine,
       PROCESS_DIP_SWITCHES, DIM_Table), v100w.c (Dolby_card_installed → pod31_mode), M6206.h (LED ports, BOARD_ISSUE 1,
       SOFTWARE_VERSION 4);  Software/Sharc/v102/: backgnd.c (control packet 0x56323031 = “V201”, gain ramps),
       RampAudio.c (RampAudioCalc, RAMP_TC_LEVEL1–3), dim_data.c (41-step dim table);  M6206A SOFTWARE HISTORY.xls
   - M6206 Manual & DIP SWITCHES (Preliminary) rewrite.rtf, M6206A Manual (Preliminary).doc (modes, GPI, DashBoard)
   - M6206-card-edge.cdr, M6206A-T6304.pdf, M6206A-T6305.cdr (Inkscape), M6206-FUNCTIONAL.pdf
   - this folder: M6206A - #PNP #2016/*.prg (board drawings), M6245A - #Engineering/ (P-CAD power board copy)
   Anything not in those files is marked "inferred" on screen. No third-party logos; format names in plain text.
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
const ENG='M6206 - #Engineering #OPENGEAR/';
const PNP_T=[["C23","0.1-603","1",90,10.137,-2.16],["C29","0.1-603","1",0,9.952,-2.565],["C30","0.1-603","1",90,10.134,-2.465],["C32","0.1-603","1",0,9.817,-2.565],["L1","4.7n","2",90,11.41,-2.295],["L2","4.7n","2",90,11.173,-1.63],["L3","4.7n","2",90,11.183,-1.975],["LED6","GRN","3",270,-0.251,-0.914],["LED10","GRN","3",270,-0.251,-1.017],["LED13","GRN","3",270,-0.4,-2.29],["LED14","GRN","3",270,-0.4,-2.39],["LED2","YEL","4",270,0.125,-1.685],["LED3","YEL","4",270,-0.4,-1.785],["LED4","YEL","4",270,-0.4,-1.885],["LED5","YEL","4",270,0.125,-1.785],["LED7","YEL","4",270,0.125,-1.885],["LED8","YEL","4",270,0.125,-1.99],["LED9","YEL","4",270,-0.4,-1.685],["LED11","YEL","4",270,-0.4,-1.99],["Q2","2N4401","6",90,5.474,-0.923],["Q3","2N4401","6",90,4.935,-0.925],["Q1","2N4401","6",0,9.454,-1.324],["C18","10/10","7",270,10.326,-1.957],["C19","10/10","7",270,10.326,-1.652],["C22","10/10","7",0,10.37,-2.543],["C51","10/10","7",180,6.857,-1.603],["C94","10/10","7",180,6.93,-1.103],["C118","10/10","7",0,7.91,-0.365],["C5","4.7/10","8",270,10.861,-2.22],["C6","4.7/10","8",270,10.861,-2.315],["C38","4.7/10","8",90,11.368,-1.69],["C39","4.7/10","8",90,11.368,-1.91],["R14","220K","76",90,3.22,-1.135],["R129","220K","76",90,2.67,-1.09],["R6","4K75","77",0,10.117,-1.89],["R7","4K75","77",90,10.152,-1.705],["R48","1M","78",0,6.34,-1.51],["R71","1M","78",0,6.425,-1.005],["R16","280","79",90,10.147,-2.39],["R34","280","79",0,6.34,-1.67],["R72","280","79",0,6.5,-1.145],["C58","0.47","81",0,6.265,-1.67],["C95","0.47","81",0,6.35,-1.145],["C103","0.47","81",90,11.14,-2.475],["R100","49R9","82",0,11.055,-1.92],["R101","49R9","82",0,10.755,-1.92],["R102","49R9","82",0,10.98,-1.92],["R103","49R9","82",0,10.83,-1.92],["R38","2K","83",0,6.415,-1.51],["R50","2K","83",0,10.865,-0.425],["R53","2K","83",0,10.94,-0.425],["R55","2K","83",0,10.847,-1.147],["R58","2K","83",0,10.934,-1.147],["R73","2K","83",0,6.5,-1.005],["R75","2K","83",90,2.435,-2.35],["R76","2K","83",90,2.44,-1.825],["R77","2K","83",90,2.44,-2.18],["R78","2K","83",90,2.44,-2.005],["R79","2K","83",90,2.44,-2.265],["R80","2K","83",90,2.44,-2.09],["R81","2K","83",90,2.44,-1.92],["R82","2K","83",90,2.28,-2.09],["R83","2K","83",90,2.28,-2.18],["R84","2K","83",90,2.28,-2.265],["R85","2K","83",90,2.28,-2.35],["R86","2K","83",90,2.28,-2.005],["R87","2K","83",90,2.28,-1.92],["R88","2K","83",90,2.28,-1.825],["R104","2K","83",90,2.44,-1.735],["R105","2K","83",90,2.28,-1.735],["R4","1K","84",90,11.0,-2.4],["R5","1K","84",90,11.0,-2.475],["R21","1K","84",90,5.08,-0.981],["R27","1K","84",90,5.08,-1.056],["R41","1K","84",90,4.849,-1.06],["R60","1K","84",90,10.955,-0.295],["R62","1K","84",90,10.933,-1.037],["R67","1K","84",90,10.977,-1.443],["R68","1K","84",90,10.99,-0.695],["R127","1K","84",90,11.055,-0.2],["R130","1K","84",90,5.611,-1.063],["R131","1K","84",90,5.611,-0.988],["R132","1K","84",90,11.235,-0.2],["R133","1K","84",90,11.385,0.015],["R134","1K","84",90,7.321,-0.005],["R135","1K","84",90,5.471,-1.063],["R137","1K","84",0,10.544,-0.897],["R23","750","85",90,10.865,-1.605],["R52","750","85",90,11.125,-0.695],["R57","750","85",90,11.117,-1.443],["R63","750","85",90,11.071,-1.037],["R70","750","85",90,11.09,-0.295],["R24","332","86",90,0.29,-1.685],["R25","332","86",90,-0.235,-1.785],["R26","332","86",90,-0.235,-1.885],["R44","332","86",90,-0.235,-1.99],["R45","332","86",90,-0.24,-2.39],["R56","332","86",90,-0.084,-0.914],["R93","332","86",90,0.29,-1.785],["R94","332","86",90,0.29,-1.885],["R95","332","86",90,0.29,-1.99],["R96","332","86",90,-0.235,-1.685],["R97","332","86",90,-0.084,-1.017],["R98","332","86",90,-0.24,-2.29],["R99","332","86",90,-0.24,-2.19],["R36","10R","88",90,5.08,-0.906],["R89","10R","88",90,8.753,-1.17],["R90","10R","88",90,8.895,-1.125],["R91","10R","88",90,8.753,-1.241],["R92","10R","88",90,8.753,-1.312],["R106","10R","88",90,8.753,-1.399],["R107","10R","88",90,8.891,-1.351],["R125","10R","88",90,4.35,-2.24],["R136","10R","88",90,5.611,-0.913],["R22","10K","89",90,9.299,-1.365],["R35","10K","89",90,4.39,-1.355],["R37","10K","89",90,6.987,-1.665],["R39","10K","89",90,9.284,-1.769],["R40","10K","89",90,9.119,-1.365],["R42","10K","89",90,6.795,-2.26],["R43","10K","89",90,6.985,-2.56],["R46","10K","89",0,6.585,-2.395],["R69","10K","89",90,9.314,-1.275],["R119","10K","89",0,9.445,-0.105],["R122","10K","89",90,8.885,-0.545],["R124","10K","89",90,8.887,-0.135],["R1","75R","90",90,11.405,-2.23],["R2","75R","90",0,11.3,-2.125],["R10","75R","90",90,11.325,-0.83],["R17","75R","90",90,11.178,-1.835],["R18","75R","90",90,11.178,-1.765],["R19","75R","90",90,11.178,-1.695],["R20","75R","90",90,11.178,-1.91],["R32","75R","90",90,11.39,-1.995],["R54","75R","90",90,11.34,-0.62],["R59","75R","90",90,11.395,-1.444],["R61","75R","90",0,11.305,-0.43],["R64","75R","90",90,11.354,-1.037],["C62","27p","91",90,4.585,-1.42],["C63","27p","91",90,4.73,-1.42],["C1","1.0u","93",90,11.27,-2.23],["C2","1.0u","93",90,11.27,-2.3],["C3","1.0u","93",90,11.405,-2.155],["C4","1.0u","93",90,11.14,-2.4],["C17","1.0u","93",90,10.334,-2.032],["C20","1.0u","93",90,10.329,-1.732],["C21","1.0u","93",0,10.45,-2.53],["C35","1.0u","93",90,9.622,-2.0],["C43","1.0u","93",0,10.025,-2.58],["C45","1.0u","93",0,2.7,-1.275],["C47","1.0u","93",0,2.7,-0.985],["C84","1.0u","93",90,10.82,-0.295],["C85","1.0u","93",90,11.257,-1.443],["C86","1.0u","93",90,11.26,-0.695],["C87","1.0u","93",90,11.214,-1.037],["C88","1.0u","93",90,11.24,-0.295],["C89","1.0u","93",90,10.795,-1.037],["C91","1.0u","93",90,10.838,-1.442],["C93","1.0u","93",90,10.855,-0.695],["C100","1.0u","93",0,10.905,-1.92],["C7","0.1","95",90,10.97,-2.13],["C8","0.1","95",90,11.175,-2.13],["C9","0.1","95",90,10.152,-1.775],["C37","0.1","95",90,10.147,-2.315],["C42","0.1","95",0,11.288,-1.8],["C50","0.1","95",90,4.39,-1.425],["C56","0.1","95",0,6.78,-1.605],["C61","0.1","95",90,4.487,-2.24],["C65","0.1","95",90,10.395,-1.06],["C77","0.1","95",90,8.71,-1.54],["C90","0.1","95",0,11.222,-1.168],["C92","0.1","95",0,11.23,-0.43],["C97","0.1","95",0,6.855,-1.08],["C99","0.1","95",90,11.005,-1.605],["C102","0.1","95",90,10.651,-0.859],["C104","0.1","95",0,10.935,-0.06],["C111","0.1","95",90,10.651,-0.937],["C113","0.1","95",90,4.35,-2.315],["C114","0.1","95",0,7.995,-0.337],["C115","0.1","95",0,7.995,-0.472],["C116","0.1","95",0,8.455,-0.487],["C117","0.1","95",0,8.455,-0.352],["C148","0.1","95",0,10.06,-1.34],["C160","0.1","95",0,9.006,-0.189],["C175","0.1","95",90,5.469,-1.902],["D1","4148-SOD323","96",90,6.535,-1.275],["D2","4148-SOD323","96",270,6.535,-1.345],["D3","4148-SOD323","96",90,6.615,-0.765],["D4","4148-SOD323","96",270,6.615,-0.835],["C105","15p","1008",0,10.84,-0.01],["C13","2200p","1009",90,10.151,-2.015],["R15","0R-1206","1013",90,10.613,-2.48],["R8","0R-805","1012",90,10.152,-2.085],["R33","221-1206","1015",90,1.173,-0.445],["R3","37R5","1019",0,11.31,-2.405],["FB3","300R","1016",0,10.28,-1.841],["FB4","300R","1016",0,10.39,-1.841],["D7","1N4003","1007",90,9.248,-0.105],["X2","CSX750V-12.288","11",0,6.595,-1.54],["X3","CSX750V-12.288","11",0,6.68,-1.03],["U8","DS75176","13",0,10.323,-0.902],["C14","68/10","15",180,1.76,-0.842],["C15","68/10","15",180,1.955,-0.842],["C24","68/10","15",180,2.15,-0.842],["C25","68/10","15",270,2.182,-0.325],["C26","68/10","15",270,2.182,-0.52],["C49","68/10","15",180,3.225,-0.877],["C52","68/10","15",180,3.415,-0.877],["C53","68/10","15",0,3.225,-1.393],["C59","68/10","15",0,3.415,-1.393],["U14","EL5263IS","17",90,11.09,-0.495],["U15","EL5263IS","17",90,11.075,-1.246],["U9","SN65HDV233D","49.01",90,11.135,-0.045],["U25","ADM3485EAR","49.02",180,9.91,-1.41],["U6","GS1528","49.03",90,10.935,-1.745],["U10","AT25F512A","49.04",180,8.85,-0.34],["U7","M25P40-V","49.07",270,8.78,-1.678],["U1","GS1574A","1003",180,11.097,-2.263],["C40","100/25","25",270,0.34,-0.855],["C44","100/25","25",0,2.335,-1.36],["U5","GO1525","1006",0,9.927,-1.816],["U18-CS8416","","49.09",180,5.34,-1.7],["U17-AD1895","","49.08",0,5.778,-1.724],["U4","PLL1705","49.05",90,8.225,-0.392],["REG5","TPS70445","49.06",90,2.932,-1.126],["U11","AT90CAN128","1001",0,4.687,-1.833],["U12","ADSP-21262","1002",180,9.532,-0.666],["U2","GS1559","1005",180,9.848,-2.276],["U3","EP1C12-240","1004",180,7.797,-1.575],["FB1","BLM41P","1100",0,0.505,-0.45],["FB2","BLM41P","1100",0,2.32,-0.9],["F1","RXE-050/SM","1000",90,1.005,-0.185],["C41","1.0u-1206","1100",0,0.66,-0.788],["SW1","DIPSW8SMT","1100",0,1.72,-2.05],["LED12","RED","1100",270,-0.4,-2.19],["C57","sot","1100",0,6.415,-1.67],["C96","sot","1100",0,6.425,-1.145]], PNP_B=[["C31","0.1-603","1",90,1.219,0.26],["R9","39K2","74",0,1.245,0.555],["R116","47K5","75",90,5.585,0.96],["R123","1M","78",90,1.215,2.523],["R109","2K","83",0,0.222,1.225],["R110","2K","83",0,0.131,1.225],["R113","1K","84",90,0.082,1.503],["R115","1K","84",90,0.133,1.098],["R111","750","85",90,-0.056,1.503],["R112","750","85",90,-0.005,1.098],["C182","15nF","1011",0,5.818,0.608],["R47","10R","88",0,2.76,0.995],["R49","10R","88",0,3.79,0.99],["R118","10R","88",90,5.632,0.736],["R120","10R","88",90,0.945,1.825],["R121","10R","88",90,1.41,2.195],["R126","10K","89",90,0.765,2.025],["R128","10K","89",90,0.765,2.125],["R108","75R","90",90,-0.331,1.503],["R114","75R","90",90,-0.28,1.098],["C98","27p","91",90,1.353,2.523],["C211","27p","91",90,1.076,2.523],["C185","1nF","92",0,5.743,0.608],["C33","1.0u","93",0,1.389,0.37],["C81","1.0u","93",0,2.605,0.995],["C106","1.0u","93",90,0.223,1.504],["C107","1.0u","93",90,0.271,1.098],["C109","1.0u","93",90,-0.144,1.098],["C110","1.0u","93",90,-0.195,1.503],["C210","0.01","94",90,1.41,2.045],["C213","0.01","94",90,1.775,2.295],["C214","0.01","94",0,1.97,1.745],["C10","0.1","95",0,1.049,0.655],["C12","0.1","95",0,1.169,0.555],["C16","0.1","95",0,1.32,0.555],["C46","0.1","95",0,-0.151,1.225],["C48","0.1","95",90,3.261,1.646],["C54","0.1","95",0,1.83,0.01],["C55","0.1","95",90,2.305,-0.04],["C60","0.1","95",90,6.265,0.385],["C64","0.1","95",90,6.495,1.02],["C66","0.1","95",90,3.076,0.283],["C67","0.1","95",0,2.585,0.56],["C68","0.1","95",0,3.956,0.565],["C69","0.1","95",90,3.647,1.646],["C70","0.1","95",90,2.863,1.646],["C71","0.1","95",90,3.27,0.285],["C72","0.1","95",90,3.477,0.283],["C73","0.1","95",90,3.631,0.283],["C74","0.1","95",0,3.958,1.38],["C75","0.1","95",90,2.859,0.283],["C76","0.1","95",0,2.593,1.39],["C78","0.1","95",0,2.785,1.27],["C79","0.1","95",0,2.785,1.44],["C80","0.1","95",0,2.685,0.995],["C82","0.1","95",0,3.94,0.991],["C83","0.1","95",0,3.865,0.991],["C108","0.1","95",90,1.815,1.435],["C156","0.1","95",90,1.49,2.295],["C157","0.1","95",90,1.205,1.435],["C158","0.1","95",0,1.105,2.0],["C159","0.1","95",90,1.395,1.435],["C161","0.1","95",90,1.41,2.12],["C162","0.1","95",0,1.105,2.18],["C181","0.1","95",90,5.639,0.638],["C183","0.1","95",90,5.263,0.958],["C184","0.1","95",90,5.266,0.673],["C186","0.1","95",90,5.725,0.96],["C208","0.1","95",0,1.97,1.552],["C209","0.1","95",0,1.97,2.052],["C212","0.1","95",0,1.104,1.822],["C215","0.1","95",90,1.59,1.435],["C216","0.1","95",90,1.91,2.295],["C217","0.1","95",0,1.105,1.6],["R117","3K48","1014",90,5.784,0.736],["R65","47R","1016",90,2.915,1.13],["R13","221","1017",0,2.275,0.095],["R66","221","1017",90,2.915,1.055],["R11","100","1018",0,2.35,0.095],["C27","0.1-1206","5",0,2.135,0.622],["C28","0.1-1206","5",0,1.665,0.712],["C11","10/10","7",180,0.964,0.673],["C34","10/10","7",180,1.474,0.389],["C36","10/10","7",90,1.481,0.54],["REG3","LM1117-ADJ","1010",270,2.055,0.05],["REG4","LM1117-ADJ","1010",90,3.0,1.31],["C101","68/10","15",0,8.21,2.427],["U16","EL5263IS","17",270,-0.005,1.295],["REG1","LM1117-3.3V","19",270,1.902,0.645]];
const T=['—','PCM','Dolby E','Dolby AC-3'];
const TC=[1.0, 0.00199999, 0.000199999, 0.000019999];    // RampAudioCalc: cut, RAMP_TC_LEVEL1–3 (alpha per call)
const CALL=1/48000;                                     // RampAudioCalc call rate (inferred: once per sample period)
const FMTS=['SD 525/59.94','SD 625/50','HD 1080i/59.94','HD 1080i/50','HD 720p/59.94'];
const VOMODE=['Stereo Mix','L Only','R Only','Mono Mix'];
const D={ in:{conn:true, fmt:'HD 1080i/59.94', g:[[2,1],[1,1],[0,0],[0,0]], vo:true}, dip:[0,0,1,1,1,1,0,0], cat:true,
  dim:10, ramp:2, vomix:3, dialnorm:false, gpi:[], sel:null, side:'T', slot:4, log:[], canQ:[] };
/* gpi events: {t, n:1|2, on:bool} — GPI-1 sustained closure, GPI-2 toggle */
const act=K.actor(D);
const on=i=>D.dip[i]===0;
/* v104 PROCESS_DIP_SWITCHES reads raw ALTERA13: BIT7/BIT6 → group (same for both selectors), BIT1 → remote adjust, BIT0 → save.
   Raw BITk is SW(8-k) if the switch is wired as on the M6202A (MIRROR) — inferred. ON = 0. */
const rawBit=k=>D.dip[7-k];
function v104Group(){ return ((rawBit(7)?2:0)+(rawBit(6)?1:0)); }      // audio1 = 4·BIT7 + 2·BIT6, group_sel1 = audio1 >> 1
function manGroup(a,b){ return (D.dip[a]?2:0)+(D.dip[b]?1:0); }        // manual Table 1/2: ON ON = 1 … OFF OFF = 4
function gpiAt(n,t){ let s=false; for (const e of D.gpi) if (e.n===n && e.t<=t) s=e.on; return s; }
/* ALTERA_TRANSLATE_UART0 (v104): gpi1 = automation, gpi2 = push-button */
function voAt(t){ const g1=gpiAt(1,t), g2=gpiAt(2,t);
  if (g1&&g2) return {vo:false, st:'Override', led:'chirp', t1:true, t2:'chirp', why:'gpi1 && gpi2: “override voiceover with pb control”'};
  if (g1) return {vo:true, st:'Active', led:true, t1:true, t2:true, why:'gpi1 only: automation activates voice-over'};
  if (g2) return {vo:true, st:'Override', led:true, t1:false, t2:true, why:'gpi2 only: “activate voiceover with pb control” — status shows Override but voice-over is ON'};
  return {vo:false, st:'Inactive', led:false, t1:false, t2:false, why:'no GPI: inactive'}; }
const grp=()=>v104Group();
function decIn(){ const g=D.in.g[grp()]; return g[0]>=2?0:g[1]>=2?1:-1; }     // first Dolby stream: AES1, then AES2
function decoding(){ return D.in.conn && D.cat && decIn()>=0; }
function outs(){ if (!D.in.conn) return ['muted','muted','muted','muted'];
  const g=D.in.g[grp()]; if (decoding()){ const k=decIn(), other=g[1-k]; return ['L / R (decoded)','C / LFE (decoded)','Ls / Rs (decoded)', other?T[other]+' (other AES of the group, 5-frame delay v102)':'—']; }
  return [g[0]===1?'PCM (AES1 of group)':'—','silent','silent',g[1]===1?'PCM (AES2 of group)':'—']; }
/* gain ramp: dim gain follows target with alpha per call; closed form for constant target: g(t) = tgt + (g0−tgt)(1−α)^(t/CALL) */
function gainAt(t, which){ const a=TC[D.ramp], tgt=vo=> which==='dim'?(vo?Math.pow(10,-D.dim/20):1):(vo?1:0);
  const evs=D.gpi.map(e=>e.t).sort((x,y)=>x-y); let cur=voAt(0).vo, g=tgt(cur), last=0;
  for (const te of evs){ if (te>t) break; g=tgt(cur)+(g-tgt(cur))*Math.pow(1-a,(te-last)/CALL); last=te; cur=voAt(te+1e-9).vo; }
  return tgt(cur)+(g-tgt(cur))*Math.pow(1-a,(t-last)/CALL); }
const dB=g=>g<=1e-6?-120:20*Math.log10(g);
function ledsAt(t){ const L=D.in.conn, k=H8.F[D.in.fmt].kind, s=voAt(t), g=grp(), G=D.in.g;
  const chirp=s.led==='chirp'? (Math.floor(t*4)%2===0) : !!s.led;
  return {sd:L?1:0, hd:L&&k!=='SD'?1:0, err:L?0:1, aes:G.map(x=>L&&(x[0]||x[1])?1:0), dol:G.map(x=>L&&D.cat&&(x[0]>=2||x[1]>=2)?1:0), com:D.canQ.some(q=>t>=q&&t<q+0.02)?1:0, vo:chirp?1:0}; }
/* LED designators (PNP) ↔ function: M6202A family map (m6202.js); LED6 is green here and drives VOICEOVER_LED on PB7 (inferred) */
const LEDF={LED14:l=>l.sd,LED13:l=>l.hd,LED12:l=>l.err,LED11:l=>l.aes[0],LED4:l=>l.aes[1],LED3:l=>l.aes[2],LED9:l=>l.aes[3],LED8:l=>l.dol[0],LED7:l=>l.dol[1],LED5:l=>l.dol[2],LED2:l=>l.dol[3],LED10:l=>l.com,LED6:l=>l.vo};
const LEDC={LED12:'#ff4a3d',LED11:'#ffd23a',LED4:'#ffd23a',LED3:'#ffd23a',LED9:'#ffd23a',LED8:'#ffd23a',LED7:'#ffd23a',LED5:'#ffd23a',LED2:'#ffd23a'};
function ledCol(d){ const f=LEDF[d]; if(!f) return null; return f(ledsAt(SIM.t))?(LEDC[d]||'#5dff5a'):null; }
const A={
  plug(){ act(`${D.in.conn?'Unplug':'Plug in'} SDI IN (rear 1)`, tr=>{ D.in.conn=!D.in.conn; tr(`GS1574A → GS1559 → EP1C12 “pod31” de-embed → ${D.in.conn?'SD'+(H8.F[D.in.fmt].kind!=='SD'?' and HD':'')+' LED':'ERR LED, Signal Status “No SDI Unlocked” (critical)'}`); }); },
  fmt(v){ act(`Source → ${v}`, tr=>{ D.in.fmt=v; tr('SDI Format: HD = 1.485 or 1.4835 Gb/s, SD = 270 Mb/s (manual)'); }); },
  content(g,a,v){ act(`Embedded group ${g+1} AES${a+1} → ${T[v]}`, tr=>{ D.in.g[g][a]=+v; tr(`dolby.c: first Dolby stream in the selected group goes to the CAT552 — AES1 first, then AES2 (manual Mode 2)`); tr(decoding()?`Decoding group ${grp()+1} AES${decIn()+1}: AES1 = L/R, AES2 = C/LFE, AES3 = Ls/Rs, one frame of delay`:'No Dolby in the selected group: AES1 carries the PCM; AES2 and AES3 are silent (manual)'); }); },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1;
    tr(`Manual: ${['SW1 DIP switch override','SW2 group selector 1 MSB','SW3 group selector 1 LSB','SW4 group selector 2 MSB','SW5 group selector 2 LSB','SW6 reserved','SW7 voice-over input mode MSB','SW8 voice-over input mode LSB'][i]}`);
    tr(`v1.04 code reads raw ALTERA13: BIT7/BIT6 → group_sel1 = ${v104Group()+1} and group_sel2 = group_sel1; BIT1 → remote_parameter_adjustment = ${rawBit(1)?'NO':'YES'}; BIT0 → parameter_save_enabled = ${rawBit(0)?'NO':'YES'} ${inf('raw bit ↔ switch order')}`);
    tr(`The manual’s tables would give group ${manGroup(1,2)+1} / ${manGroup(3,4)+1} and ${VOMODE[(D.dip[6]?2:0)+(D.dip[7]?1:0)]}`); }); },
  gpi(n){ const now=gpiAt(n,SIM.t); act(`GPI-${n} ${n===1?(now?'open (release)':'close to ground'):'press (toggle)'}`, tr=>{ D.gpi.push({t:SIM.t,n,on:!now}); D.gpi.sort((a,b)=>a.t-b.t); const s=voAt(SIM.t+1e-9);
    tr(`ALTERA_TRANSLATE_UART0: gpi1_active = ${gpiAt(1,SIM.t+1e-9)?'YES':'NO'}, gpi2_active = ${gpiAt(2,SIM.t+1e-9)?'YES':'NO'} → ${s.why}`);
    tr(`voiceover = ${s.vo?'YES':'NO'}, voiceover_status = ${s.st.toUpperCase()}; GPI1_TALLEY ${s.t1?'ON':'OFF'}, GPI2_TALLEY ${s.t2===true?'ON':s.t2==='chirp'?'chirps with the LED':'OFF'}`);
    tr(`AVR → FPGA → SHARC packet “V201” (0x56323031): voiceover_active, dim index ${D.dim} → dim_gain_target = ${s.vo?'−'+D.dim+' dB':'0 dB'}; RampAudioCalc type ${D.ramp} (α = ${TC[D.ramp]})`);
    if (n===2) tr('Manual: “If the voice-over function has been activated, triggering GPI-2 will override or cancel” — the code also turns voice-over ON from GPI-2 alone'); }); },
  dash(id,v){ if (id==='reboot'){ act('DashBoard: Reboot', tr=>tr('main(): DOLBY_DECODER_STATUS → pod31_mode = Dolby_card_installed; SHARC held in reset until the AVR releases it (sharc.c)')); return; }
    if (id==='save'){ act('DashBoard: Save', tr=>{ tr(rawBit(0)?'parameter_save_enabled = NO (BIT0): nothing saved':'SAVE_INFORMATION_EEPROM'); }); return; }
    const lab={dim:'Pgm Dim Level',ramp:'Voiceover ramp type',vomix:'Type of Voiceover Input',dialnorm:'Dialnorm'}[id];
    act(`DashBoard: ${lab} → ${id==='dim'?'−'+v+' dB':id==='ramp'?['cut','level 1','level 2','level 3'][v]:id==='vomix'?VOMODE[v]:(v?'Enabled':'Disabled')}`, tr=>{ D.canQ.push(SIM.t); if (rawBit(1)){ tr('remote_parameter_adjustment = NO (BIT1 = 1): DashBoard cannot change settings'); return; }
      if (id==='dim'){ D.dim=+v; tr(`DIM_Table → index ${v} → dim[${v}] = ${Math.pow(10,-v/20).toFixed(4)} (dim_data.c, 41 steps, 0 to −40 dB)`); }
      if (id==='ramp'){ D.ramp=+v; tr(`ramping_type = ${v} → RAMP_TC = ${TC[v]}: time constant ≈ ${v?SIM.fmtDur(CALL/TC[v]):'0 (cut)'} at one call per sample ${inf('call rate')}`); }
      if (id==='vomix'){ D.vomix=+v; tr(`voiceover_mix → ALTERA_BUFFER_out[4] → SHARC mixes ${VOMODE[v]} into L, R (AES1) and AES4`); }
      if (id==='dialnorm'){ D.dialnorm=!!v; tr('Decoder applies the metadata dialnorm to the main programme'); } }); },
  cat(){ act(`${D.cat?'Remove':'Fit'} the Dolby decoder module`, tr=>{ D.cat=!D.cat; tr(`Dolby Decoder Installed: ${D.cat?'Yes':'No'} → pod31_mode = ${D.cat?'YES (Mode 2)':'NO (Mode 1, plain 2-group demux)'}`); }); },
  vo(){ act(`${D.in.vo?'Unplug':'Plug in'} VOICEOVER IN (rear 7)`, tr=>{ D.in.vo=!D.in.vo; tr(`CS8416 on the voice-over input → Voiceover Input ${D.in.vo?'Locked':'Unlocked'}${D.in.vo?'':' → Signal Status “No Voiceover Audio Unlocked” (warning)'}`); }); },
  part(d){ const L=D.side==='T'?PNP_T:PNP_B; const p=L.find(x=>x[0]===d); if(!p) return; D.sel=d; act(`Board: ${d}`, tr=>{ tr(`${d} ${p[1]} · feeder ${p[2]} · ${p[3]}° · X ${p[4]} Y ${p[5]} in (${D.side==='T'?'M6206A-T.prg':'M6206Ab-B.prg'})`); const r=ROLE(d,p[1]); if(r) tr(r); }); },
  side(s){ D.side=s; D.sel=null; SIM.refresh(); },
  clear(){ act('Clear GPI history', tr=>{ D.gpi=[]; tr('All GPIs open'); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; }); },
  reset(){ Object.assign(D,{in:{conn:true,fmt:'HD 1080i/59.94',g:[[2,1],[1,1],[0,0],[0,0]],vo:true},dip:[0,0,1,1,1,1,0,0],cat:true,dim:10,ramp:2,vomix:3,dialnorm:false,gpi:[],sel:null,side:'T',slot:4,log:[],canQ:[]}); SIM.refresh(); },
};
function ROLE(d,v){ const R=[[/ADSP-21262/,'SHARC DSP: voice-over mix, dim and ramps (shell262.dpj, from the RLM meter code)'],[/EP1C12/,'Cyclone FPGA “pod31”: de-embed, routing, SHARC/CAT552 data paths'],[/AT90CAN/,'Control processor (v1.04)'],[/GS1574/,'SDI equaliser'],[/GS1559/,'SDI deserializer'],[/GS1528/,'SDI cable driver (reclocked output)'],[/GO1525/,'VCO for the Gennum chipset'],[/M25P40/,'Serial flash (SHARC boot, inferred)'],[/AT25F512/,'Serial flash (FPGA configuration or SHARC, inferred)'],[/PLL1705/,'Audio clock PLL'],[/SN65HDV/,'CAN transceiver'],[/ADM3485|DS75176/,'RS-485: metadata output'],[/CS8416/,'AES receiver (voice-over input)'],[/AD1895/,'Sample-rate converter for the voice-over input'],[/DIPSW/,'DIP switch SW1'],[/LM1117/,'Linear regulator'],[/EL5263/,'Video/AES line driver']];
  for (const [re,s] of R) if (re.test(d+' '+v)) return s; return /^LED/.test(d)?'Card-edge LED':''; }
const RM_CELLS=[[1,'SDI IN','in'],[2,'SDI OUT','o'],[3,'AES1 OUT',0],[4,'AES2 OUT',1],[5,'AES3 OUT',2],[6,'AES4 OUT',3],[7,'VOICEOVER IN','vo'],[8,'GPI/O 2','g2'],[9,'GPI/O 1','g1'],[10,'METADATA OUTPUT','m']];
function rearSVG(){ const o=outs(), L=D.in.conn, s=voAt(SIM.t);
  return K.rearSVG({name:'T6304', sub:'M6206A-T6304.pdf (single card)', id:'EMBEDDED AUDIO PROCESSOR', cells:RM_CELLS.map(([n,l,k])=>{ if(k==='in') return {n,label:l,id:'in',conn:L,live:L?true:undefined}; if(k==='o') return {n,label:l,live:L?true:'err'};
    if (k==='vo') return {n,label:l,id:'vo',conn:D.in.vo,live:D.in.vo?true:undefined}; if (k==='g1') return {n,label:l,kind:'tb',id:'g1',conn:gpiAt(1,SIM.t),live:s.t1?true:'off',title:'GPI-1 automation (sustained closure), GPO-1 tally'};
    if (k==='g2') return {n,label:l,kind:'tb',id:'g2',conn:gpiAt(2,SIM.t),live:s.t2?true:'off',title:'GPI-2 push-button (toggle), GPO-2 tally'}; if (k==='m') return {n,label:l,kind:'tb',live:decoding()&&D.in.g[grp()][decIn()]===2?true:'off'};
    return {n,label:l,live:/silent|—|muted/.test(o[k])?'err':true,title:o[k]}; })}); }
function edgeSVG(t){ const L=ledsAt(t); const names=['SD','HD','ERR','AES1','AES2','AES3','AES4','COM Activity','Voice OVER'], st=[L.sd,L.hd,L.err,...L.aes,L.com,L.vo], ys=[40,70,100,150,180,210,240,320,350];
  const extra=[0,1,2,3].map(i=>`<g><title>Dolby ${i+1} LED</title><rect x="188" y="${ys[3+i]-6}" width="9" height="12" rx="2" fill="${L.dol[i]?'#ffd23a':'#3a3f3a'}" ${L.dol[i]?'filter="url(#og62glow)"':''}/><text x="202" y="${ys[3+i]+4}" font-size="10" fill="#b7bcbf">${i+1} Dolby</text></g>`);
  return K.edgeSVG({label:'M6206A', maxw:270, note:'M6206-card-edge.cdr', extra, leds:names.map((n,i)=>({name:n,c:i===2?'r':i>=3&&i<=6?'y':'g',on:st[i],y:ys[i]}))}); }
function dashHTML(){ const L=D.in.conn, s=voAt(SIM.t), g=D.in.g[grp()], ro=rawBit(1)===1;
  const lockS=v=>v===2?'Locked - Dolby E':v===3?'Locked - Dolby AC-3':v===1?'Locked - PCM':'Unlocked';
  const sig=!L?['No SDI Unlocked','err']:!g[0]?['No AES1 Unlocked','warn']:!g[1]?['No AES2 Unlocked','warn']:!D.in.vo?['No Voiceover Audio Unlocked','warn']:['OK','ok'];
  return K.dashHTML({key:'m6206a', title:`Slot ${D.slot}: M6206A`, alarm:sig[1]==='err', tree:[{name:'DFR-8320 frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: M6206A`,lvl:1,sel:true}],
    tabs:[{name:'Card Info',rows:[{type:'text',label:'Product',value:'M6206A'},{type:'text',label:'Name',value:'MD-SDI Audio Demultiplexer with Voiceover Mixing'},{type:'text',label:'Manufacturer',value:'Ward-Beck Systems'},{type:'text',label:'Board Rev',value:'Iss.1'},{type:'text',label:'Software Rev',value:'1.04'}]},
      {name:'Card Status',rows:[{type:'status',label:'Signal Status',value:sig[0],level:sig[1]},{type:'status',label:'SDI Format',value:L?(H8.F[D.in.fmt].kind==='SD'?'SD':'HD'):'Unlocked',level:L?'ok':'err'},{type:'status',label:'Embedded AES1 Lock',value:L?lockS(g[0]):'Unlocked',level:L&&g[0]?'ok':'warn'},{type:'status',label:'Embedded AES2 Lock',value:L?lockS(g[1]):'Unlocked',level:L&&g[1]?'ok':'warn'},{type:'status',label:'Dolby Decoder Installed',value:D.cat?'Yes':'No',level:D.cat?'ok':'warn'}]},
      {name:'Voiceover Status',rows:[{type:'status',label:'Voiceover Input',value:D.in.vo?'Locked':'Unlocked',level:D.in.vo?'ok':'warn'},{type:'status',label:'Voiceover Status',value:s.st,level:s.vo?'ok':'info'}]},
      {name:'Voiceover Settings',rows:[{type:'slider',id:'dim',label:'Pgm Dim Level (−dB)',min:0,max:40,value:D.dim,unit:'dB'},{type:'combo',id:'vomix',label:'Type of Voiceover Input',value:D.vomix,options:VOMODE.map((n,i)=>[i,n])},{type:'combo',id:'ramp',label:'Ramp (ramping_type)',value:D.ramp,options:[[0,'cut'],[1,'level 1'],[2,'level 2'],[3,'level 3']]},{type:'toggle',id:'dialnorm',label:'Dialnorm',value:D.dialnorm,on:'Enabled',off:'Disabled'},{type:'button',id:'save',label:'Save',text:'Save'}],note:(ro?'remote_parameter_adjustment = NO: read-only. ':'')+'The ramp selector is shown here for study; the manual lists Dim, Voiceover Status, Type and Dialnorm.'}],
    footer:[{id:'reboot',text:'Reboot'}], foot:'v1.04'}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`, s=voAt(SIM.t);
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>SDI in</b><button data-x="plug">${D.in.conn?'Unplug':'Plug in'}</button>${sel('fmt',FMTS.map(f=>[f,f]),D.in.fmt)} <button data-x="vo">${D.in.vo?'Unplug':'Plug in'} voice-over</button> <button data-x="cat">${D.cat?'Remove':'Fit'} decoder</button> <button data-x="reset">Defaults</button></div>
    <div class="small" style="display:flex;gap:8px;align-items:center;margin-top:6px"><b>GPI</b><button data-x="g1" class="${gpiAt(1,SIM.t)?'on':''}">GPI-1 automation ${gpiAt(1,SIM.t)?'(closed)':'(open)'}</button><button data-x="g2" class="${gpiAt(2,SIM.t)?'on':''}">GPI-2 push-button ${gpiAt(2,SIM.t)?'(on)':'(off)'}</button><button data-x="clr">Clear GPI history</button><span>→ voice-over <b>${s.st}</b></span></div>
    <table class="kv small" style="margin-top:6px"><tr><th>Embedded</th><th>AES1</th><th>AES2</th></tr>${D.in.g.map((g,i)=>`<tr><td>Group ${i+1}${i===grp()?' ◀ selected':''}</td>${g.map((v,a)=>`<td>${sel('c'+i+a,T.map((n,k)=>[k,n]),v)}</td>`).join('')}</tr>`).join('')}</table><div>${dipSVG()}</div>`; }
function dipSVG(){ let s=`<svg viewBox="0 0 560 104" style="width:100%;max-width:560px"><rect x="10" y="8" width="300" height="62" rx="4" fill="#c0392b"/><text x="16" y="21" font-size="10" fill="#fff">ON ▲  SW1 DIP-8</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${v?'OFF':'ON'}</title><rect x="${x}" y="27" width="22" height="38" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?47:30}" width="16" height="15" fill="#222"/><text x="${x+11}" y="84" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  return s+`<text x="322" y="22" font-size="10.5" fill="var(--ink2)">Manual: 1 override, 2–3 grp sel 1, 4–5 grp sel 2,</text><text x="322" y="38" font-size="10.5" fill="var(--ink2)">7–8 voice-over input mode</text><text x="322" y="54" font-size="10.5" fill="var(--ink2)">v1.04 code: 1–2 group, 7 remote adj., 8 save ${'(order inferred)'}</text><text x="10" y="100" font-size="10.5" fill="var(--accent)">code → group ${grp()+1} for both selectors · manual → ${manGroup(1,2)+1} / ${manGroup(3,4)+1}, ${VOMODE[(D.dip[6]?2:0)+(D.dip[7]?1:0)]}</text></svg>`; }
function bindAll(r){ K.bind(r,{jack:{in:()=>A.plug(), vo:()=>A.vo(), g1:()=>A.gpi(1), g2:()=>A.gpi(2)}, slot:n=>A.slot(n), dash:(id,v)=>A.dash(id,v)});
  r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip))); r.querySelectorAll('[data-part]').forEach(g=>g.addEventListener('click',()=>A.part(g.dataset.part)));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='plug')A.plug(); else if(x==='fmt')A.fmt(el.value); else if(x==='vo')A.vo(); else if(x==='cat')A.cat(); else if(x==='reset')A.reset(); else if(x==='g1')A.gpi(1); else if(x==='g2')A.gpi(2); else if(x==='clr')A.clear(); else if(x==='sideT')A.side('T'); else if(x==='sideB')A.side('B'); else if(x[0]==='c')A.content(+x[1],+x[2],+el.value); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
function boardHTML(){ const top=D.side==='T';
  return `<div style="margin-bottom:6px"><button data-x="sideT" class="${top?'on':''}">Top (M6206A-T.prg, 237)</button> <button data-x="sideB" class="${top?'':'on'}">Bottom (M6206Ab-B.prg, 89)</button></div>`+H8.pnpSVG({parts:top?PNP_T:PNP_B, x0:-0.6, x1:11.6, y0:top?-2.75:-0.25, y1:top?0.2:2.7, scale:68, sel:D.sel, ledOn:ledCol, mirror:!top,
    note:top?'Top side from M6206A-T.prg (saved 2007-11-06 15:05). Front edge on the left; LEDs glow live. Click a part.':'Bottom side from M6206Ab-B.prg (saved 2007-11-06 10:21), drawn mirrored so it lines up with the top view '+'(orientation inferred)',
    labels:top?[{x:-0.55,y:0.1,t:'front edge'},{x:11.5,y:0.1,t:'rear (P1)',a:'end'}]:[{x:0,y:2.6,t:'bottom: regulators, decoupling'}]}); }
function lanes(){ const css=SIM.css, f=H8.F[D.in.fmt], L=D.in.conn, ls=[], fr=1/f.fps;
  ls.push(H8.frameLane(f,!L)); ls.push(H8.hancLane(f,D.in.g.filter(g=>g[0]||g[1]).length,!L));
  ls.push(K.boolLane('GPI-1 automation (closed)', t=>gpiAt(1,t), css('--accent2'))); ls.push(K.boolLane('GPI-2 push-button (toggled on)', t=>gpiAt(2,t), css('--warn')));
  ls.push(K.boolLane('voiceover (to SHARC)', t=>voAt(t).vo, css('--accent')));
  ls.push({label:`Programme dim gain (−${D.dim} dB target, ramp ${D.ramp})`, h:40, draw(c,X,t0,t1,y,h){ const N=400; c.strokeStyle=css('--accent'); c.beginPath(); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=Math.max(-40,dB(gainAt(tt,'dim'))); const yy=y+4+(-v/40)*(h-8); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(`${dB(gainAt(SIM.t,'dim')).toFixed(1)} dB at playhead`,X(t0)+4,y+12); }});
  ls.push({label:'Voice-over gain (0 dB when active)', h:30, draw(c,X,t0,t1,y,h){ const N=400; c.strokeStyle=css('--warn'); c.beginPath(); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, g=gainAt(tt,'vo'); const yy=y+h-4-g*(h-8); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }});
  ls.push(K.waveLane('AES1 L out: programme 1 kHz + voice-over 400 Hz', t=>{ if(!L) return 0; const p=0.3*Math.sin(2*Math.PI*1000*t)*gainAt(t,'dim'), v=(D.in.vo?0.3*Math.sin(2*Math.PI*400*t):0)*gainAt(t,'vo')*(D.vomix===2?0:1); return p+v; }, {h:40}));
  ls.push({label:'Decoder output (one frame late)', h:20, draw(c,X,t0,t1,y,h){ if(!decoding()) return; c.fillStyle=css('--accent'); const a=Math.max(t0,fr); if(a<t1) c.fillRect(X(a),y+4,X(t1)-X(a),h-8); }});
  ls.push(K.boolLane('Voice OVER LED (PB7)', t=>ledsAt(t).vo, '#5dff5a'));
  ls.push(K.canLane(K.canFrames({poll:0.5, phase:(D.slot*0.0173)%0.4, q:D.canQ})));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Source, GPI, DIP', `<div id="ctl"></div>`)}${card('DashBoard (redrawn from the preliminary manual)', `<div id="dash"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear module', `<div id="rear"></div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}${card('Outputs at the playhead', `<div id="out"></div>`)}</div></div>
    ${card('The board (pick-and-place programs in this folder)', `<div id="pcb"></div>`)}${card('Timeline — one second, zoomable (press GPI-1, then move the playhead)', `<canvas id="tl"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t, o=outs(), s=voAt(t);
    m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(); m.querySelector('#pcb').innerHTML=boardHTML();
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    m.querySelector('#out').innerHTML=`<table class="kv small">${o.map((x,i)=>`<tr><th>AES${i+1}</th><td>${x}${(i===0||i===3)&&s.vo&&D.in.vo?` + voice-over (${VOMODE[D.vomix]})`:''}</td></tr>`).join('')}<tr><th>Dim now</th><td class="mono">${dB(gainAt(t,'dim')).toFixed(2)} dB</td></tr></table>`;
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second of the M6206A', `<div id="lad"></div>`)}<div class="grid2">${card('Voice-over ramp: what the numbers mean', `<div id="ramp"></div>`)}${card('Level through the mix', `<div id="lvl"></div>`)}</div>`;
  const draw=()=>{ const f=H8.F[D.in.fmt];
    const rows=[['Video frames',f.fps.toFixed(3),SIM.fmtDur(1/f.fps),f.name],['Audio samples per channel','48 000',SIM.fmtDur(1/48000),H8.spf(f).toFixed(1)+' per frame'],['Dolby E frames',f.fps.toFixed(2),SIM.fmtDur(1/f.fps),'decoded one frame late (manual)'],['AES4 extra delay','','5 frames = '+SIM.fmtDur(5/f.fps),'v102 history note'],['Gain ramp updates','48 000',SIM.fmtDur(CALL),'RampAudioCalc '+inf('call rate')],['Control packets “V201”','≈400','≈2.5 ms',inf('AVR → FPGA → SHARC rate')],['DashBoard polls','2','500 ms',inf('MFC rate')]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#ramp').innerHTML=`<table class="kv small"><tr><th>ramping_type</th><th>α per call</th><th>time constant</th><th>to within 1 dB of −${D.dim} dB</th></tr>${[0,1,2,3].map(k=>{ const tau=k?CALL/TC[k]:0; const tt=k?tau*Math.log((1-Math.pow(10,-D.dim/20))/(Math.pow(10,(-D.dim+1)/20)-Math.pow(10,-D.dim/20))):0; return `<tr style="${k===D.ramp?'font-weight:700':''}"><td>${k} ${['cut','LEVEL1','LEVEL2','LEVEL3'][k]}</td><td class="mono">${TC[k]}</td><td class="mono">${k?SIM.fmtDur(tau):'0'}</td><td class="mono">${k?SIM.fmtDur(Math.max(0,tt)):'0'}</td></tr>`; }).join('')}</table><p class="small muted">g ← g + (target − g)·α (RampAudio.c). One call per 48 kHz sample is assumed; backgnd.c actually calls it once per received control packet, so the real time depends on that packet rate ${inf('')}.</p>`;
    const v=voAt(SIM.t).vo; m.querySelector('#lvl').innerHTML=K.levelSVG([{name:'Programme in',level:-20},{name:'Dim stage',level:-20+dB(gainAt(SIM.t,'dim')),note:v?'voice-over active':'no dim'},{name:'Voice-over in',level:D.in.vo?-20:null},{name:'Voice-over gain',level:D.in.vo?-20+Math.max(-100,dB(gainAt(SIM.t,'vo'))):null},{name:'AES1 L out (sum, uncorrelated)',level:10*Math.log10(Math.pow(10,(-20+dB(gainAt(SIM.t,'dim')))/10)+(D.in.vo?Math.pow(10,(-20+Math.max(-100,dB(gainAt(SIM.t,'vo'))))/10):0))}],{lo:-60,hi:0,unit:'dBFS',clip:0,clipLabel:'0 dBFS'}); };
  SIM.on('time', draw);
}
const BLOCKS={ sdi:{x:10,y:30,w:140,h:70,t:'SDI IN',s:['GS1574A','GS1559'],d:'Rear position 1; GS1528 drives the reclocked SDI OUT (position 2).'},
  fpga:{x:190,y:20,w:170,h:110,t:'EP1C12 “pod31”',s:['de-embed 2 groups','Dolby detect','routes to CAT552 / SHARC'],d:'The POD31/M6202A FPGA design.'},
  cat:{x:190,y:170,w:170,h:70,t:'Dolby decoder (CAT552)',s:['E / AC-3 → 5.1 PCM'],d:'Decodes the first Dolby stream of the selected group, one frame late.'},
  vo:{x:10,y:170,w:140,h:80,t:'VOICEOVER IN',s:['CS8416 + AD1895'],d:'Rear position 7: PCM AES only.'},
  sharc:{x:410,y:90,w:170,h:110,t:'ADSP-21262 SHARC',s:['dim, ramp, VO mix','RampAudioCalc','“V201” packets'],d:'shell262 project (from the RLM meter series): gains ramp toward targets set over SPI.'},
  out:{x:620,y:20,w:150,h:90,t:'AES1–AES4 OUT',s:['L/R + VO, C/LFE, Ls/Rs, AES4 + VO'],d:'75 Ω BNC on the T6304.'},
  gpi:{x:620,y:150,w:150,h:70,t:'GPI/O 1, 2',s:['automation, push-button'],d:'Phoenix 3-pin; open-collector tallies.'},
  mcu:{x:410,y:240,w:170,h:70,t:'AT90CAN128',s:['v1.04, voice-over FSM'],d:'ALTERA_TRANSLATE_UART0 turns the GPIs into voiceover / status / tallies.'} };
const WIRES=[['sdi','fpga',''],['fpga','cat','coded'],['cat','sharc','PCM'],['fpga','sharc','PCM'],['vo','sharc','VO'],['sharc','out','AES'],['gpi','mcu','GPI'],['mcu','gpi','tally'],['mcu','fpga','packets']];
const SHEETS=[{name:'1 · Main ICs (PNP)', note:'Reference designators, values, feeders and X/Y (inches) from M6206A-T.prg.', svg:()=>[[150,50,'U11 AT90CAN128','1001','4.687, −1.833','control'],[420,50,'U3 EP1C12-240','1004','7.797, −1.575','FPGA'],[690,50,'U12 ADSP-21262','1002','9.532, −0.666','SHARC'],[150,250,'U1 GS1574A / U2 GS1559','1003 / 1005','11.1 / 9.85, −2.3','SDI in'],[420,250,'U18 CS8416 / U17 AD1895','49.09 / 49.08','5.34 / 5.78, −1.7','voice-over input'],[690,250,'U7 M25P40 / U10 AT25F512A','49.07 / 49.04','8.78 / 8.85','serial flash']].map(([x,y,n,f,xy,sub])=>K.chip(x,y,150,n,[['feeder',f],['X, Y',xy]],[],sub)).join('')},
  {name:'2 · Voice-over FSM', note:'ALTERA_TRANSLATE_UART0 (M6206A.c v1.04).', svg:()=>`${[['GPI1 and GPI2','voiceover = NO, status OVERRIDE, LED chirps'],['GPI1 only','voiceover = YES, status ACTIVE, both tallies ON'],['GPI2 only','voiceover = YES, status OVERRIDE (!), tally 2 ON'],['neither','voiceover = NO, INACTIVE, tallies OFF']].map((r,i)=>`<rect x="60" y="${50+i*80}" width="220" height="50" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="170" y="${80+i*80}" text-anchor="middle" font-size="13" fill="var(--ink)">${r[0]}</text><line x1="280" y1="${75+i*80}" x2="360" y2="${75+i*80}" stroke="var(--ink2)"/><text x="370" y="${80+i*80}" font-size="12.5" fill="var(--accent2)">${r[1]}</text>`).join('')}`}];
const TUT={i:0};
const LESSONS=[
  {title:'Meet the M6206A', body:'<p>The M6206A (built for Astral Media) de-embeds an SDI group, decodes an embedded Dolby stream to 5.1 and <b>mixes a voice-over</b> into the programme, dimming the programme while the voice-over is on (preliminary manual, 2007).</p>', check:()=>true, auto:true},
  {title:'1 · Lock and decode', body:'<p>With the decoder fitted, group 1 AES1 carries Dolby E: AES1 = L/R, AES2 = C/LFE, AES3 = Ls/Rs, AES4 = the other AES of the group.</p>', check:()=>decoding(), hint:'Plug in SDI IN; keep the decoder fitted.'},
  {title:'2 · Start the voice-over', body:'<p>Press <b>GPI-1</b> (automation closure). Voice-over status turns Active, the Voice OVER LED lights and the programme ramps down by the Pgm Dim Level. Move the playhead to watch the ramp.</p>', check:()=>voAt(SIM.t).st==='Active', hint:'Press GPI-1, then drag the playhead forward.'},
  {title:'3 · Deeper dim', body:'<p>Set <b>Pgm Dim Level</b> to 20 dB.</p>', check:()=>D.dim>=20, hint:'Voiceover Settings → slider.'},
  {title:'4 · Override from the push-button', body:'<p>Press <b>GPI-2</b> while GPI-1 is closed: voice-over is overridden and the LED chirps.</p>', check:()=>voAt(SIM.t).st==='Override'&&!voAt(SIM.t).vo, hint:'Press GPI-2 with GPI-1 still closed.'},
  {title:'5 · The odd case', body:'<p>Release GPI-1 (press it again). With only GPI-2 on, the code turns the voice-over <b>on</b> and still calls it “Override”.</p>', check:()=>!gpiAt(1,SIM.t)&&gpiAt(2,SIM.t), hint:'Press GPI-1 again to open it.'},
  {title:'6 · Change the ramp', body:'<p>Set the ramp to <b>level 3</b> and repeat: the dim now takes about a second.</p>', check:()=>D.ramp===3, hint:'Voiceover Settings → Ramp.'},
  {title:'Done', body:'<p>See <b>Findings</b> for the DIP switch mismatch and the M6245A files in this folder.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — voice-over on the M6206A (from the preliminary manual)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2"><div>${card('Voice-over decision (ALTERA_TRANSLATE_UART0), live', `<div id="fsm"></div>`)}${card('SHARC background loop (backgnd.c)', `<div id="sh"></div>`)}</div><div>${card('Control packet AVR → FPGA → SHARC', `<table class="kv small"><tr><td class="mono">altera_data[0]</td><td>0x56323031 (“V201”) — packet valid</td></tr><tr><td class="mono">[1]</td><td>voiceover_mix · pcm_mode · voiceover_active · mode</td></tr><tr><td class="mono">[2]</td><td>ramping_type</td></tr><tr><td class="mono">[10]</td><td>output_gain_target[0–3] (volume table)</td></tr><tr><td class="mono">[11–16]</td><td>L_gain / R_gain [0–9]</td></tr><tr><td class="mono">[13] low bytes</td><td>voiceover_gain_target, dim_gain_target (dim table, 41 steps)</td></tr></table>`)}${card('Ports (M6206.h)', `<table class="kv small"><tr><td>VOICEOVER_LED</td><td class="mono">PB7</td></tr><tr><td>DOLBY1–4 LED</td><td class="mono">PB4–PB6, PG1</td></tr><tr><td>ERROR_LED</td><td class="mono">PE6</td></tr><tr><td>COM_ACTIVITY_LED</td><td class="mono">PG0</td></tr></table>`)}</div></div>`;
  const draw=()=>{ const g1=gpiAt(1,SIM.t), g2=gpiAt(2,SIM.t), k=g1&&g2?0:g1?1:g2?2:3;
    m.querySelector('#fsm').innerHTML=H8.flowSVG(['gpi1 && gpi2 → override: voiceover = NO, LED chirp','gpi1 only → ACTIVE: voiceover = YES','gpi2 only → voiceover = YES, status OVERRIDE','neither → INACTIVE'],k);
    const st=['if altera_data[0] == 0x56323031 (“V201”)','unpack voiceover_mix, pcm_mode, voiceover_active, mode','ramping_type = altera_data[2]','output_gain[n] = RampAudioCalc(…)','voiceover_gain = RampAudioCalc(…)','dim_gain = RampAudioCalc(…)'];
    m.querySelector('#sh').innerHTML=H8.flowSVG(st,Math.floor((SIM.t*400)%st.length)); };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>The DIP switch does not match the manual.</b> The manual: SW1 override, SW2–SW3 group selector 1, SW4–SW5 group selector 2, SW7–SW8 voice-over input mode. v1.04’s PROCESS_DIP_SWITCHES reads ALTERA13 BIT7/BIT6 as one group selector (and copies it to group_sel2), BIT1 as remote_parameter_adjustment and BIT0 as parameter_save_enabled. There is no voice-over mode switch in the code.`,
  `<b>GPI-2 alone turns voice-over on.</b> The manual says GPI-2 overrides or cancels an active voice-over. ALTERA_TRANSLATE_UART0 has a branch “activate voiceover with pb control”: gpi2 without gpi1 sets voiceover = YES while reporting OVERRIDE.`,
  `<b>Ramp speed set by the packet rate.</b> backgnd.c calls RampAudioCalc once per accepted control packet (header 0x56323031, ASCII “V201”), not per sample, so RAMP_TC_LEVEL1–3 (0.002, 0.0002, 0.00002) give a ramp time that depends on how often the AVR sends packets.`,
  `<b>Manual copied from the M6202A.</b> The preliminary manual says “The M6202A can be configured for two modes…” and describes Mode 1/Mode 2 although no switch or menu selects a mode: pod31_mode follows Dolby_card_installed.`,
  `<b>Meter code underneath.</b> The SHARC project still carries rlm24.mak, rlm24_vu_data.c and slm1-1.mak from the RLM/SLM meter series; RampAudio.c includes vumeter.h and phasemeter.h.`,
  `<b>A power board in the wrong folder.</b> “M6245A - #Engineering/” here holds the M6245A P-CAD set; its .pcb is dated 2009-02-06, newer than the copy in the M6245A folder (2007-05-11). Nothing in M6206A references it.`,
  `<b>Two serial flashes.</b> The PNP places both an M25P40 (U7) and an AT25F512A (U10); the README notes the schematic lists EPCS1 for the FPGA.`,
  `<b>History warnings.</b> v104 (2008-11-18) is marked “do not use”: a temporary fix for Dolby in group 1 on HD that needed the new HD embed core. v102 added 5 frames of delay on AES4.`,
  `<b>Board issue.</b> M6206.h has BOARD_ISSUE 1, matching “M6206A Iss1.jpg”; the PNP programs (2007-11-06) are the only production data in this folder.`];
const ASSUME=['RampAudioCalc called at 48 kHz for the timeline '+inf('actual rate is per control packet'),'Raw ALTERA13 bit ↔ DIP switch order mirrored as on the M6202A '+inf('wiring'),'LED6 = Voice OVER, LED10 = COM, other LED designators as on the M6202A '+inf('PNP + m6202.js'),'Default dim 10 dB (manual factory default), ramp level 2 '+inf('default ramp'),'Bottom PNP view mirrored to line up with the top '+inf('orientation')];
const SOURCES=['#OPENGEAR #SERIES/M6206A - #Master #OPENGEAR/M6206A - #PNP #2016/M6206A-T.prg, M6206Ab-B.prg','#OPENGEAR #SERIES/M6206A - #Master #OPENGEAR/M6245A - #Engineering/ (P-CAD power board copy)',ENG+'Software/atmel/v104/M6206A.c, v100w.c, M6206.h (firmware — sibling folder, linked)',ENG+'Software/Sharc/v102/backgnd.c, RampAudio.c, dim_data.c',ENG+'Software/M6206A SOFTWARE HISTORY.xls',ENG+'M6206 Manual & DIP SWITCHES (Preliminary) rewrite.rtf, M6206A Manual (Preliminary).doc',ENG+'M6206-card-edge.cdr, M6206A-T6304.pdf, M6206A-T6305.cdr'];
SIM.register({ id:'m6206a', product:'M6206A', name:'M6206A · SDI audio demuxer with Dolby decoding and voice-over, openGear: production package (2007|40)', year:2007,
  folder:'#OPENGEAR #SERIES/M6206A - #Master #OPENGEAR', family:'openGear',
  summary:'The M6206A de-embeds an SDI audio group, decodes an embedded Dolby stream to 5.1 and mixes a voice-over into the programme with a ramped dim, under GPI control. This folder holds the pick-and-place programs (drawn here part by part) and a stray copy of the M6245A power board; the model runs the v1.04 AVR and v102 SHARC code from the M6206 engineering folder.',
  highlights:['Top and bottom board drawn from the PNP programs in this folder','Voice-over state machine from GPI-1 and GPI-2','Programme dim ramp from RampAudioCalc','Manual vs code: the DIP switch and GPI-2'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 audio sample',period:()=>1/48000},{label:'1 frame',period:()=>1/H8.F[D.in.fmt].fps},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.05,'50 ms'],[0.005,'5 ms']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:790,h:330,sel:'sharc'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'M6206A',sheets:SHEETS,foot:'REDRAWN from the PNP programs and the v1.04 source — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:m=>H8.findingsView(m,'What the M6206A (and its folder) are up to',FINDINGS,ASSUME,SOURCES)}],
});
})();
