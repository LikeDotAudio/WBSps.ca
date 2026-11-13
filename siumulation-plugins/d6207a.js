/* =====================================================================
   D6207A — openGear Dolby E / AC-3 decoder card (Ross DED-8420), Ward-Beck Systems, 2007|40–2012|45
   Plugin for the WBS Device Simulator (../siumulation.html) · Full model
   Firmware modelled: AT90CAN128 V102 (atmel/v102, 2010|43) and V201 (atmel/v201, 2012|45);
   FPGA: AMS81.qpf for EP1C12Q240C8 (Altera/Working/v102, v200) and the VD6207A-dtsupmix copy.
   Sources (all under #OPENGEAR #SERIES/D6207A - #Master #OPENGEAR/D6207A - #Engineering/):
     D6207A - #Software/atmel/v102: v100w.c (main), D6207A.c/.h (ALTERA_TRANSLATE_UART0, ALTERA_SORT,
       PROCESS_AUDIO_FORMAT), dolby.c/.h (RESET_DOLBY, DOLBY_CAT552_AUDIO_ERROR_CHECK), altera.c/.h, cs84xx.c,
       ADC.c, CAN.c (timers), Dashboard.c (OIDs, strings, PARAMETER_UPDATE), *.s listings (cycle counts)
     D6207A - #Software/atmel/v201 (Ali-Add CONF_DONE polling and AES1-lock decoder reset)
     D6207A - #Software/Altera/Working/v102/AMS81.qsf, AMS81.bdf (traced net by net), non_audio_detector.vhd,
       CATMAPERR.vhd, shift_in32.vhd, shifter_out_48bit.vhd, SR_DETECT_192.vhd, zero24_31.vhd, i2sx4_aes.vhd
     D6207A - #PCB: ISS2 gerbers (TOP/TSM/TSS → assets/d6207a-card-*.png), PNP, d6207-schematic.zip, ISS1 netlist/BOM/ECO
     D6207A - #Functional: D6207A-card-edge.cdr (converted with Inkscape), D6207A-T6305.pdf, D6207A-FUNCTIONAL.pdf
     ../D6207A - #TESTREPORT, ../../T6305 - #Master …/T6305.net, openGear #Manuals #OBSOLETE/D6207A Manual.pdf
   Anything not in those files is marked "inferred" on screen. No decoder-maker, Ross or openGear logos.
   ===================================================================== */
(function(){
const SIM = window.SIM;
/* ---------------- og62 kit: shared openGear card look (card edge, rear module, DashBoard panel,
   frame, views). This block is copied verbatim into each WBS openGear plugin so no plugin depends
   on another file. Drawn from: D6204-card-edge.pdf (card-edge layout, CorelDRAW X3, 2007|40),
   the openGear Rear Module Guides (10-position 2×5 grids, numbered 1–10), and DashBoard 2.x
   (parameter tree + tabbed parameter panel). ---------------- */
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

/* =====================================================================
   D6207A model
   ===================================================================== */
const inf = K.inf, card = K.card;
const ASSET = 'siumulation-plugins/assets/';
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
const ROOTP = '#OPENGEAR #SERIES/D6207A - #Master #OPENGEAR/D6207A - #Engineering/';
const SW = ROOTP+'D6207A - #Software/';
const hx = (n,w)=>(n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const bin = (n,w)=>(n>>>0).toString(2).padStart(w||8,'0');
const YR = y=>SIM.year(y);

/* ---- constants from the source (and the few estimates, flagged) ---- */
const C = {
  XTAL: 8e6,                                   // v100w.c: "Crystal: 8.0000Mhz"
  WAIT3000: 3000*7/8e6,                        // wait(): wdr, subi, sbci, cpi, cpc, brne = 7 cycles per count (v100w.s)
  RESET1000: 1000*6/8e6,                       // ALTERA_RESET(1000): ~6 cycles per count
  LOOP_T: 2.6e-3,                              // main-loop pass, estimated from altera.s (≈222 cycles × 80 bytes) + reads (inferred)
  RW_FRAC: 0.85,                               // share of a pass spent in ALTERA_read_write (80 bytes bit-banged)
  SLOT_T: 0.53,                                // ADC slot-address loop: COUNTER_CONSTANT 100 × 2 × wait(3000) (inferred)
  DOLBY_LOCK_COUNTER: 2000, RESET_CONSTANT: 200, CAT_ERR_COUNTER: 1000, RESET_VECTOR_CONSTANT: 100,   // dolby.h
  HOLD: 8191,                                  // non_audio_detector.vhd: count = "001111111111111" LRCLK periods
  HOLD_DTS: 32767,                             // VD6207A-dtsupmix copy: "111111111111111"
  LOCK_T: 0.010,                               // CS8416 lock time after a new input (inferred)
  T0: 1e-3, T1_LONG: 0.096, T1_SHORT: 96e-6,  // CAN.c timer0 (1 ms), timer1 (96 ms / 96 µs)
  TX_IDLE: 0.288,                              // timer1: TX_FIVE_SECONDS = 1 → CAN_TX_TIMER every 3rd 96 ms overflow
  TX_INIT: 10502*96e-6,                        // dashboard_initializing: TX_ONE_SECOND 10500 → ≈1.008 s
  DASH_INIT: 3.0,                              // DASHBOARD_COUNT_CONSTANT 3 quiet seconds (assumes a quiet bus)
  MAXU: 40,
};
const TYPES = {0:'none (unplugged)',1:'PCM',2:'AC-3',3:'Dolby E',4:'DTS (Pc 11)'};
const TSHORT = {0:'—',1:'PCM',2:'AC-3',3:'Dolby E',4:'DTS'};
const PC = {2:1, 3:28, 4:11};                  // SMPTE 338 data types; D6207A.h PC_DOLBY_AC3 1, PC_DOLBY_E 28
const LOCKN = {0:'Unlocked',1:'Locked-PCM',2:'Locked-Dolby AC3',3:'Locked-Dolby E',4:'N/A'};
const MODEN = {0:'Single AES Input w/ SRC (AES Input 1 Dolby/AES Input 2 SRC Ref)',1:'Dual AES Input w/ Auto Swap',2:'Single AES Input (AES Input 1 only)',3:'Dual AES Input (AES Input 1 Dolby/AES Input 2 PCM)'};
const MODES = {0:'Single w/ SRC',1:'Dual auto swap',2:'Single',3:'Dual (SAP ← AES2)'};
const REFN = {0:'AES Input 1',1:'Rear Module Input 2',2:'Frame Ref 1',3:'Frame Ref 2'};
const SIG24 = ['OK','No AES Audio Lock','AES Input 1 Unlocked','AES Input 2 Unlocked','AES Input 2 is a Dolby Signal','AES Input 1 is not a Dolby Signal','AES Input 2 is not a Dolby Signal'];
const SIG24S = [0,2,2,1,1,1,1];
const DEC2B = ['OK','Error','AES Input 1 Active','AES Input 2 Active'], DEC2BS=[0,2,0,0];
const FW = {
  v102:{name:'V102 (18 Jan 2010, '+YR(2010)+')', rev:'1.02', brand:'Ward-Beck Systems', product:'D6207A', web:true, src:'atmel/v102'},
  v201:{name:'V201 (20 Jul 2012, '+YR(2012)+')', rev:'1.01', brand:'Ross Video Ltd', product:'DED-8420', web:false, src:'atmel/v201'},
};
const FPGA = {
  v102:{name:'AMS81 Working/v102 (Jun 2009)', det:true, sr:true},
  v200:{name:'AMS81 v200 (Apr 2012 release)', det:true, sr:false},
  dts:{name:'VD6207A-dtsupmix v101 (Mar 2011)', det:false, sr:false},
};

/* ---- device / bench state ---- */
const D = {
  epoch:0, ver:1, fw:'v102', fpga:'v102', cfgT:0.080, mask:'black', video:29.97,
  init:{ in1:{type:3, fs:48000}, in2:{type:1, fs:48000}, ref1:true, ref2:false, module:true, fault:false,
         dip:[0,0,0,0,0,0,0,0] },                  // dip: 1 = ON (switch closed → line low)
  ee:{mode:0, ref:1, dialnorm:0, downmix:1, saved:false},
  ev:[], log:[], canQ:[],
};
const act = K.actor(D);
const U = ()=> D.epoch + SIM.t;                     // card uptime at the playhead
function addEv(k, v){ D.ev.push({u:U(), k, v}); D.ev.sort((a,b)=>a.u-b.u); D.ver++; }

/* configuration (bench + switches) at uptime u */
function cfgAt(u){
  const c = JSON.parse(JSON.stringify(D.init));
  c.in1.t0=0; c.in2.t0=0; c.ref1t=0; c.ref2t=0; c.modt=0; c.faultT=c.fault?0:-1;
  for (const e of D.ev){ if (e.u>u) break;
    if (e.k==='in1'||e.k==='in2'){ c[e.k]={type:e.v.type, fs:e.v.fs, t0:e.u}; }
    else if (e.k==='ref1'){ c.ref1=e.v; c.ref1t=e.u; } else if (e.k==='ref2'){ c.ref2=e.v; c.ref2t=e.u; }
    else if (e.k==='module'){ c.module=e.v; c.modt=e.u; }
    else if (e.k==='fault'){ c.fault=true; c.faultT=e.u; }
    else if (e.k==='dip'){ c.dip[e.v]=c.dip[e.v]?0:1; }
  }
  return c;
}
/* the four router sources (aes_input_router: Input1 AES_IN_1, Input2 AES_IN_2, Input3 REF_IN_1, Input4 REF_IN_2) */
function srcOf(c, s){
  if (s===0) return c.in1; if (s===1) return c.in2;
  if (s===2) return {type:c.ref1?1:0, fs:48000, t0:c.ref1t};
  if (s===3) return {type:c.ref2?1:0, fs:48000, t0:c.ref2t};
  return {type:0, fs:48000, t0:0};
}
function burstP(type, fs){ return type===2? 1536/fs : type===3? 1/D.video : type===4? 512/fs : 0; }
const burstPh = (P)=>P*0.5;                         // first burst half a period after the signal appears (inferred)
function lastBurst(seg, u){ const P=burstP(seg.type, seg.fs); if (!P) return -1; const a=seg.t0+burstPh(P); if (u<a) return -1; return a+Math.floor((u-a)/P)*P; }
const dipByte = dip=>{ let v=0; for (let i=0;i<8;i++) if (!dip[i]) v|=(0x80>>i); return v; };   // ALTERA1: dip1 → bit 7 (sent first)
const MIRROR = d=>{ let r=0; for (let i=0;i<8;i++) if (d&(1<<i)) r|=(0x80>>i); return r; };

/* ---------------------------------------------------------------------
   The simulation: boot sequence, then main() passes, written as the code is
   --------------------------------------------------------------------- */
let S=null;
function bootTimes(){
  const w=C.WAIT3000, tReset = w, tCfg0 = w + C.RESET1000, confDone = tCfg0 + D.cfgT, tInit = tCfg0 + 1e-4;
  const reads=[];
  if (D.fw==='v102'){ const r1=tInit+8*w; reads.push(r1); reads.push(r1+12*w+1e-4); }
  else { let t=tInit; for (const n of [30000,20000,20000,20000,20000]){ if (t<confDone) t+=n*7/8e6; else break; } reads.push(t); }
  const tSlot0 = reads[reads.length-1] + 1e-4, tSlot1 = tSlot0 + C.SLOT_T, tMain = tSlot1 + 2e-3 + 1000*7/8e6;
  return {tReset, tCfg0, confDone, tInit, reads, tSlot0, tSlot1, tMain};
}
function simulate(){
  const Umax = Math.min(C.MAXU, D.epoch+1) + 1e-9;
  if (S && S.ver===D.ver && S.fw===D.fw && S.fpga===D.fpga && S.cfgT===D.cfgT && S.video===D.video && S.Umax>=Umax) return S;
  const B = bootTimes(), FP = FPGA[D.fpga];
  const fpgaUp = u=> u>=B.confDone;
  const c0 = cfgAt(B.reads[B.reads.length-1]);
  const rawDip = fpgaUp(B.reads[B.reads.length-1]) ? dipByte(c0.dip) : 0xFF;   // unconfigured I/O read high (weak pull-ups, inferred)
  const bootDip = MIRROR(rawDip);
  const st = { mode:0, reference_sel:3, dialnorm_enable:0, downmix_type:1, dip_switches:bootDip,
    dip_switch_enabled: (bootDip&0x40)?1:0, dashboard_enabled: (bootDip&0x80)?1:0,
    reset_552:0xFF, Dolby_card_installed:0, Dolby_card_status:0, dolby_counter:0, reset_enable:0, reset_counter:C.RESET_CONSTANT,
    dialnorm_settings:0xFF, pdialnorm:0xFF, pdownmix:0xFF, prologic:1, ext2:0, aes1in:0, aes2in:1, cat:1, rmck:1, auto_swap:0, active:0,
    errCnt:0, notErrCnt:0, checkDone:0, catErr:0, catErrFired:-1,
    A:[0xFF,0,0,0,0,0xA8], L:4|32, aes1_led:0, aes2_led:0, AUDIO1:0, AUDIO2:0, aes1_lock:0, aes2_lock:0, compressed_set:0,
    catResetDone:0, catResetCntr:0, pAes1Lock:1, ee:{...D.ee} };
  /* boot: power-up parameter source */
  if (!st.dip_switch_enabled){ st.mode=st.ee.mode; st.reference_sel=st.ee.ref; st.dialnorm_enable=st.ee.dialnorm; st.downmix_type=st.ee.downmix; st.bootSrc='EEPROM (RESTORE_INFORMATION_EEPROM)'; }
  else { const d=bootDip; st.mode=((d&1)?0:1)+((d&2)?0:2); st.dialnorm_enable=(d&8)?0:1; st.downmix_type=(d&4)?1:0; let r=1; if(!(d&0x10)) r+=2; if(!(d&0x20)) r+=1; st.reference_sel=Math.min(r,3); st.bootSrc='DIP switch (dip_switches = MIRROR(ALTERA1))'; }
  const boot={rawDip, bootDip, mode:st.mode, ref:st.reference_sel, dialnorm:st.dialnorm_enable, downmix:st.downmix_type, src:st.bootSrc, dse:st.dip_switch_enabled, dbe:st.dashboard_enabled};
  /* FPGA side state */
  const F = { reg:0, regT:0, selT:0, catSelT:0, inReset:true, relT:Infinity, faultOn:false, faultT:-1,
    det:[{last:-1,pc:0},{last:-1,pc:0}] };
  /* DashBoard reporting */
  const P=[], CAN=[], dash={}; let pend=null; const pv={aes1:0xFF,aes2:0xFF,mode:0xFF,swap:0xFF,ref:0xFF,inst:0xFF};
  let nextTx = B.tMain + 0.01, uPrev = B.tMain, evI = 0;
  const evs = D.ev;
  const snapDash = ()=>({aes1:st.aes1_lock, aes2:st.mode===2?4:st.aes2_lock, mode:st.mode, swap:st.auto_swap, ref:st.reference_sel, dial:st.dialnorm_enable, dmx:st.downmix_type, sig:sig24(st), dec:dec2b(st), inst:st.Dolby_card_installed});
  let dashInit=false;
  for (let k=0;;k++){
    const u = B.tMain + k*C.LOOP_T; if (u>Umax) break;
    /* CAN receive: DashBoard sets that arrived since the last pass (can_rx_isr → DASHBOARD_RESPONSE_SETUP) */
    while (evI<evs.length && evs[evI].u<=u){ const e=evs[evI++]; if (e.u<B.tMain) { if (e.k==='dash'||e.k==='save') CAN.push({t:e.u,dir:'rx',n:1,label:'DashBoard set (card not running yet, lost)'}); continue; }
      if (e.k==='dash'){ CAN.push({t:e.u,dir:'rx',n:1,label:'MFC → card: set OID 0x'+e.v.oid.toString(16)}); CAN.push({t:e.u+3e-4,dir:'tx',n:1,label:'card → MFC: reply'});
        if (st.dashboard_enabled){ const v=+e.v.val; if (e.v.oid===0x302) st.mode=v; else if (e.v.oid===0x303) st.reference_sel=v; else if (e.v.oid===0x301) st.auto_swap=v; else if (e.v.oid===0x30D) st.dialnorm_enable=v; else if (e.v.oid===0x30E) st.downmix_type=v; } }
      else if (e.k==='save'){ CAN.push({t:e.u,dir:'rx',n:1,label:'MFC → card: set 0x30C Save'}); st.save=1; } }
    const c = cfgAt(u);
    /* 1 · DOLBY_CAT552_AUDIO_ERROR_CHECK (reads ALTERA2 bit 7 from the last pass) */
    if (!st.checkDone){
      if (st.A[1]&0x80){ st.notErrCnt=0; if (st.errCnt<=C.CAT_ERR_COUNTER) st.errCnt++; else { st.catErr=1; st.errCnt=0; st.checkDone=1; } }
      else { st.errCnt=0; if (st.notErrCnt<=C.CAT_ERR_COUNTER) st.notErrCnt++; else { st.catErr=0; st.notErrCnt=0; st.checkDone=1; } }
    }
    let catFire=false;
    if (st.catErr && !(D.fw==='v201' && st.catResetDone)){ st.catErr=0; st.reset_enable=1; st.reset_counter=C.RESET_VECTOR_CONSTANT; st.reset_552=0; catFire=true; st.catErrFired=u; }
    /* 2 · DOLBY_DECODER_STATUS → RESET_DOLBY.  DOLBY_INSTALLED = PINA bit 5 = net ALTERA2 = FPGA SOFT(inst40) ← DOLBY_ERR ← CAT552 ERR (P3-70, R82 1K to GND) */
    const pin = fpgaUp(u) ? (c.module?1:0) : 1;
    st.Dolby_card_status = pin?1:0;
    let dolbyReset=false;
    if (st.Dolby_card_status===0){ if (st.dolby_counter<=C.DOLBY_LOCK_COUNTER) st.dolby_counter++; else { st.Dolby_card_installed=0; st.dolby_counter=0; st.Dolby_card_status=1; st.reset_552=0; st.reset_enable=1; st.reset_counter=C.RESET_CONSTANT; dolbyReset=true; } }
    else st.Dolby_card_installed=1;
    /* 3 · RESET_COUNTER */
    if (st.reset_enable && st.reset_counter){ st.reset_counter--; } else if (st.reset_enable){ st.reset_enable=0; st.reset_552=0xFF; }
    /* 4 · Astatus = CS8416_READ_LOCK_ALL() (U2/U5 sees AES IN 1; U3/U6 sees what the router gives AES2) */
    const s2 = (F.reg>>3)&7, seg1=c.in1, seg2=srcOf(c, s2);
    const lock1 = fpgaUp(u) && seg1.type>0 && u-seg1.t0>=C.LOCK_T;
    const lock2 = fpgaUp(u) && seg2.type>0 && u-Math.max(seg2.t0, F.selT)>=C.LOCK_T;
    if (D.fw==='v201' && !st.reset_enable){   // Ali-Add: reset the CAT552 for 51 passes whenever AES1 locks
      if (st.catResetDone){ if (st.catResetCntr<50) st.catResetCntr++; else { st.catResetCntr=0; st.reset_552=0xFF; st.catResetDone=0; } }
      const aes1Lock = lock1?0:1; if (aes1Lock!==st.pAes1Lock && aes1Lock===0){ st.reset_552=0; st.catResetDone=1; } st.pAes1Lock=aes1Lock;
    }
    /* 5 · ALTERA_TRANSLATE_UART0 */
    st.rmck=0; st.aes1in=0; st.aes2in=1; st.prologic=1; st.ext2=0;
    const NO_LOCK=0;
    if (st.mode===1){ st.auto_swap=1; if (st.reference_sel===2) st.aes2in=2; else if (st.reference_sel===3) st.aes2in=3; else if (st.reference_sel===1) st.aes2in=1;
      if (st.Dolby_card_installed){
        if (st.compressed_set){ if (st.aes1_led!==0 && st.AUDIO1){ st.cat=0; st.rmck=0; st.active=0; } else if (st.aes2_led!==0 && st.AUDIO2){ st.cat=1; st.rmck=1; st.active=1; } }
        else if (st.aes1_lock!==NO_LOCK){ st.cat=0; st.rmck=0; st.active=0; }
        else if (st.aes2_lock!==NO_LOCK){ st.cat=1; st.rmck=1; st.active=1; }
        else { st.cat=0; st.rmck=0; st.active=0; }
      } else if (st.aes1_lock!==NO_LOCK){ st.cat=0; st.rmck=0; st.active=0; }
      else if (st.aes2_lock!==NO_LOCK){ st.cat=0; st.rmck=1; st.active=1; }
      else { st.cat=0; st.rmck=0; st.active=0; }
    } else if (st.mode===2){ st.auto_swap=0; st.cat=0; st.aes2in=0; st.rmck=0; st.active=0; }
    else if (st.mode===3){ st.auto_swap=0; st.cat=0; st.aes2in=0; st.rmck=0; st.ext2=1; st.active=0;
      if (st.reference_sel===2) st.aes2in=2; else if (st.reference_sel===3) st.aes2in=3; else if (st.reference_sel===1) st.aes2in=1; else { st.reference_sel=0; st.aes2in=0; } }
    else { st.mode=0; st.auto_swap=0; st.cat=0; st.rmck=1; st.active=0;
      if (st.reference_sel===2){ st.aes2in=2; if (st.aes2_lock===NO_LOCK) st.rmck=0; }
      else if (st.reference_sel===3){ st.aes2in=3; if (st.aes2_lock===NO_LOCK) st.rmck=0; }
      else if (st.reference_sel===1){ st.aes2in=1; if (st.aes2_lock===NO_LOCK) st.rmck=0; }
      else { st.reference_sel=0; st.aes2in=0; st.rmck=0; } }
    if (st.dip_switch_enabled && !st.dashboard_enabled){   // DIP live only when SW7 OFF and SW8 ON
      const d=st.dip_switches; st.mode=((d&1)?0:1)+((d&2)?0:2); st.dialnorm_enable=(d&8)?0:1; st.downmix_type=(d&4)?1:0; let r=1; if(!(d&0x10)) r+=2; if(!(d&0x20)) r+=1; st.reference_sel=Math.min(r,3); }
    let dmReset=false;
    if (!(D.fw==='v201' && st.catResetDone)){
      if (!st.reset_enable){ if (st.dialnorm_enable!==st.pdialnorm || st.downmix_type!==st.pdownmix){ st.pdialnorm=st.dialnorm_enable; st.pdownmix=st.downmix_type; st.reset_552=0; dmReset=true; st.dialnorm_settings = st.dialnorm_enable?0:0xE0; } else st.reset_552=0xFF; }
    }
    /* 6 · ALTERA_SORT → Reg 20, then ALTERA_read_write (640 bits; the FPGA keeps the last 64) */
    const b76=(st.dialnorm_settings&0xE0)|(st.reset_552&0x10)|(st.prologic<<3)|(st.ext2<<2)|st.rmck;
    const b77=((st.downmix_type&1)?0:0x80)|st.cat, b79=(st.aes2in<<3)|st.aes1in;
    const reg=((b76<<24)|(b77<<16)|b79)>>>0, tW=u+C.LOOP_T*C.RW_FRAC;
    if (fpgaUp(tW)){
      const old=F.reg; F.reg=reg; F.regT=tW;
      if (((old>>3)&7)!==((reg>>3)&7)) F.selT=tW;
      if (((old>>16)&1)!==((reg>>16)&1)) F.catSelT=tW;
      const rs=(reg>>>28)&1;
      if (!rs){ if (!F.inReset) F.resT=tW; F.inReset=true; if (F.faultOn) { F.faultOn=false; F.faultClr=tW; } }
      else if (F.inReset){ F.inReset=false; F.relT=tW; }
    }
    if (c.fault && c.faultT>F.faultT && !F.inReset){ F.faultOn=true; F.faultT=c.faultT; }
    /* FPGA status at read time: detectors, CAT552 */
    const tR = u + C.LOOP_T*0.9;
    const detSrc=[c.in1, srcOf(c,(F.reg>>3)&7)];
    for (let i=0;i<2;i++){ const sg=detSrc[i], lb=lastBurst(sg, tR); if (lb>=0 && lb>F.det[i].last){ F.det[i].last=lb; F.det[i].pc=PC[sg.type]||0; F.det[i].fs=sg.fs; } }
    const hold = (D.fpga==='dts'?C.HOLD_DTS:C.HOLD);
    const flag = i=> FP.det && F.det[i].last>=0 && (tR-F.det[i].last)<=hold/(F.det[i].fs||48000);
    const decSrc = ((F.reg>>16)&1) ? detSrc[1] : detSrc[0];
    const dec = decState(c, F, decSrc, tR);
    const mapErr = F.faultOn && (dec==='AC-3'||dec==='Dolby E');
    const mapZero = mapErr || !(dec==='AC-3'||dec==='Dolby E'||dec==='PCM');
    /* 7 · ALTERA_read: six bytes, first bit = MSB (cntrl_status[0] → ALTERA1 bit 7) */
    let A;
    if (fpgaUp(tR)) A=[dipByte(c.dip), (mapErr?0x80:0)|(mapZero?0x40:0)|(flag(0)?0x20:0)|(F.det[0].pc&0x1F), 0x00, (flag(1)?0x80:0)|(F.det[1].pc&0x7F), 0x00, 0xA8];
    else A=[0xFF,0xFF,0xFF,0xFF,0xFF,0xFF];
    st.A=A;
    /* 8 · PROCESS_AUDIO_INFORMATION, PROCESS_AUDIO_FORMAT, READ_DIP_SWITCHES, REFRESH_LEDS */
    st.AUDIO1=lock1?1:0; st.AUDIO2=lock2?1:0;
    st.aes1_led=0; st.aes2_led=0; st.compressed_set=0;
    if (A[1]&0x20){ st.aes1_led=1; st.compressed_set=1; const p=A[1]&0x1F; if (p===1) st.aes1_led=2; else if (p===28) st.aes1_led=3; }
    if (A[3]&0x80){ st.aes2_led=1; st.compressed_set=1; const p=A[3]&0x1F; if (p===1) st.aes2_led=2; else if (p===28) st.aes2_led=3; }
    st.dip_switches = MIRROR(A[0]);
    const L = refreshLeds(st, st.L); st.L=L;
    /* 9 · CAN_FUNCTIONS → PARAMETER_UPDATE */
    let fired=null;
    if (!pend){
      if (st.aes1_lock!==pv.aes1){ pv.aes1=st.aes1_lock; fired='AES1_LOCK'; pv.inst=255; st.sigChange=1; }
      else if (st.aes2_lock!==pv.aes2){ pv.aes2=st.aes2_lock; fired='AES2_LOCK'; pv.inst=255; st.sigChange=1; }
      else if (st.dialnorm_enable!==st.pdialnorm){ fired='DIALNORM'; }        // pgroup_sel1 = group_sel1 (copy-paste): pdialnorm_enable is not updated here
      else if (st.downmix_type!==st.pdownmix){ st.pdownmix=st.downmix_type; fired='DOWNMIX_TYPE'; }
      else if (st.mode!==pv.mode){ pv.mode=st.mode; fired='MODE'; st.sigChange=1; pv.inst=255; }
      else if (st.auto_swap!==pv.swap){ pv.swap=st.auto_swap; fired='AUTO_SWAP'; st.sigChange=1; }
      else if (st.reference_sel!==pv.ref){ pv.ref=st.reference_sel; fired='REFERENCE_SELECTOR'; st.sigChange=1; }
      else if (st.Dolby_card_installed!==pv.inst){ pv.inst=st.Dolby_card_installed; fired='DOLBY_DECODER'; }
      else if (st.sigChange){ st.sigChange=0; fired='SIGNAL_STATUS'; }
      if (fired) pend={name:fired, u};
    }
    /* timer1 → CAN_TX_TIMER: sends the pending report */
    while (nextTx<=u+C.LOOP_T){
      if (!dashInit){ dashInit=true; Object.assign(dash, snapDash()); CAN.push({t:nextTx, dir:'tx', n:12, label:'card → MFC: parameter dump (DashBoard connects)'}); }
      else if (pend){ const s=snapDash(); const key={AES1_LOCK:'aes1',AES2_LOCK:'aes2',DIALNORM:'dial',DOWNMIX_TYPE:'dmx',MODE:'mode',AUTO_SWAP:'swap',REFERENCE_SELECTOR:'ref',DOLBY_DECODER:'dec',SIGNAL_STATUS:'sig'}[pend.name];
        dash[key]=s[key]; if (key==='dec') dash.inst=s.inst; CAN.push({t:nextTx, dir:'tx', n:1, label:'card → MFC: report '+pend.name, rep:pend.name}); pend=null; }
      nextTx += (u-B.tMain < C.DASH_INIT) ? C.TX_INIT : C.TX_IDLE;
    }
    /* 10 · SAVE_INFORMATION_EEPROM */
    if (st.save){ st.save=0; st.ee={mode:st.mode, ref:st.reference_sel, dialnorm:st.dialnorm_enable, downmix:st.downmix_type, saved:true}; }
    P.push({u, k, mode:st.mode, ref:st.reference_sel, dial:st.dialnorm_enable, dmx:st.downmix_type, cat:st.cat, rmck:st.rmck, aes2in:st.aes2in, ext2:st.ext2, active:st.active,
      reset:st.reset_552?1:0, reg, A:A.slice(), L, aes1_led:st.aes1_led, aes2_led:st.aes2_led, aes1_lock:st.aes1_lock, aes2_lock:st.aes2_lock, AUDIO1:st.AUDIO1, AUDIO2:st.AUDIO2,
      inst:st.Dolby_card_installed, pin, dcnt:st.dolby_counter, errCnt:st.errCnt, notErrCnt:st.notErrCnt, checkDone:st.checkDone, catFire, dolbyReset, dmReset,
      dec, mapErr, mapZero, flag1:flag(0), flag2:flag(1), pc1:F.det[0].pc, pc2:F.det[1].pc, swap:st.auto_swap, fired, dash:{...dash}, sig:sig24(st), d2b:dec2b(st),
      faultOn:F.faultOn, inReset:F.inReset, c, catResetDone:st.catResetDone, ee:{...st.ee}, dse:st.dip_switch_enabled, dbe:st.dashboard_enabled, compressed_set:st.compressed_set});
    uPrev=u;
  }
  S = {ver:D.ver, fw:D.fw, fpga:D.fpga, cfgT:D.cfgT, video:D.video, Umax, B, P, CAN, boot, catFired:P.find(p=>p.catFire), lastEE:P.length?P[P.length-1].ee:D.ee};
  return S;
}
function decState(c, F, src, t){
  if (!c.module) return 'absent';
  if (F.inReset) return 'reset';
  if (!src || src.type===0) return 'no input';
  if (src.type===1) return 'PCM';
  if (src.type===4) return 'mute (DTS not decoded)';
  const P=burstP(src.type, src.fs), from=Math.max(F.relT, src.t0, F.catSelT||0);
  return (t-from >= 2*P) ? (src.type===2?'AC-3':'Dolby E') : 'sync';
}
/* REFRESH_LEDS (v100w.c), returns PORTB bits: 0 AES1, 1 DOLBY1, 2 ERROR, 3 AES2, 4 DOLBY2, 5 ERROR2, 6 COM */
function refreshLeds(st, prev){
  let L=prev||0; const on=b=>{L|=b;}, off=b=>{L&=~b;};
  const DD = st.aes1_led===2||st.aes2_led===2, E = st.aes1_led===3||st.aes2_led===3;
  const err1 = ()=>{ if (st.Dolby_card_installed) off(4); else on(4); };
  if (st.AUDIO1){
    if (st.aes1_led!==0){
      if (!E && !DD){ on(1); off(2); st.aes1_lock=1; err1(); }
      else if (st.aes1_led===2){ on(1); st.aes1_lock=2; err1(); on(2); }
      else if (st.aes1_led===3){ on(1); st.aes1_lock=3; err1(); on(2); }
      /* COMPRESSED with another Pc while AES2 carries AC-3/E: no branch matches, PORTB and aes1_lock keep their old values */
    } else { st.aes1_lock=1; on(1); off(2); err1(); }
  } else { st.aes1_lock=0; off(1); off(2); on(4); }
  if (st.mode===2){ off(8); off(16); off(32); }
  else if (st.AUDIO2){
    if (st.aes2_led!==0){
      if (!E && !DD){ st.aes2_lock=1; on(8); off(16); off(32); }
      else if (st.aes2_led===2){ st.aes2_lock=2; on(8); off(32); on(16); }
      else if (st.aes2_led===3){ st.aes2_lock=3; on(8); off(32); on(16); }
    } else { st.aes2_lock=1; on(8); off(16); off(32); }
  } else { st.aes2_lock=0; off(8); off(16); on(32); }
  return L & 63;
}
/* DashBoard Signal Status (OID 0x204) and Dolby Decoder (0x20B), as DASHBOARD_RESPONSE_SETUP builds them */
function sig24(st){
  const a1=st.aes1_lock, a2=st.aes2_lock;
  if (st.mode===3){ if (!a1&&!a2) return 1; if (!a1) return 2; if (!a2) return 3; if (a2>=3) return 4; return 0; }
  if (st.mode===0){ if (!a1&&!a2) return 1; if (!a1) return 2; if (!a2) return 3; return 0; }
  if (st.mode===2){ if (!a1&&!a2) return 1; if (!a1) return 2; return 0; }
  if (!a1&&!a2) return 1; if (st.active===0 && !a1) return 2; if (st.active===1 && !a2) return 3; return 0;
}
function dec2b(st){ if (!st.Dolby_card_installed) return 1; if (st.active===0) return st.aes1_lock?2:1; if (st.active===1) return st.aes2_lock?3:1; return 0; }

/* lookups */
function passAt(u){ const s=simulate(), P=s.P; if (!P.length || u<P[0].u) return null; let lo=0, hi=P.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (P[m].u<=u) lo=m; else hi=m-1; } return P[lo]; }
function phaseAt(u){ const B=simulate().B;
  if (u<B.tReset) return {n:'initialization(); DATA_INITIALIZATION(); wait(3000)', s:'init'};
  if (u<B.tCfg0) return {n:'ALTERA_RESET(1000): PG2 → Q1 pulls nCONFIG low', s:'reset'};
  if (u<B.reads[B.reads.length-1]) return {n:(D.fw==='v102'?'init_CS8416(); wait(3000) × 8 / × 12':'init_CS8416(); poll CONF_DONE (PINE bit 5), wait(30000/20000)'), s:'wait'};
  if (u<B.tSlot1) return {n:'AD_CONVERTER_SETUP / ADDRESS_TABLE: slot ID (counter 100)', s:'slot'};
  if (u<B.tMain) return {n:'DOLBY_DECODER_STATUS(); DATA_SETUP(); CAN_setup(); '+(simulate().boot.dse?'DIP → parameters':'RESTORE_INFORMATION_EEPROM()'), s:'setup'};
  return {n:'while(1) main loop', s:'main'};
}
/* What each output BNC carries (FPGA AES_OUT_n → board net → EL5263 → T6305 position) */
function outputs(p){
  const c=p?p.c:cfgAt(U()), dec=p?p.dec:'reset';
  const multi = dec==='AC-3'||dec==='Dolby E', pcm=dec==='PCM', fault=p&&p.faultOn&&multi;
  const loopSrc = p? ((p.reg>>16)&1 ? srcOf(c,(p.reg>>3)&7) : c.in1) : c.in1;
  const sapE = dec==='Dolby E';   // Dolby E carries an optional SAP pair; AC-3 does not (manual)
  return [
    {n:3, out:'AES_OUT_1', net:'AES_OUT1', amp:'U8:A', bnc:'BNC3', label:'L, R', on: (multi&&!fault)||pcm},
    {n:4, out:'AES_OUT_2', net:'AES_OUT5', amp:'U9:B', bnc:'BNC4', label:'C, LFE', on: multi},
    {n:5, out:'AES_OUT_3', net:'AES_OUT2', amp:'U8:B', bnc:'BNC5', label:'Ls, Rs', on: multi},
    {n:6, out:'AES_OUT_4', net:'AES_OUT6', amp:'U9:A', bnc:'BNC6', label: p&&p.ext2?'SAP ← AES2 (PCM)':'SAP', on: p&&p.ext2? srcOf(c,(p.reg>>3)&7).type>0 : sapE},
    {n:7, out:'AES_OUT_5', net:'AES_OUT3', amp:'U7:A', bnc:'BNC7', label: p&&!p.dmx?'Lt, Rt':'Lo, Ro', on: multi||pcm},
    {n:8, out:'AES_OUT_6', net:'AES_OUT4', amp:'U7:B', bnc:'BNC8', label:'input loop', on: loopSrc.type>0},
  ];
}

/* ---------------------------------------------------------------------
   Actions: each logs the code path it takes
   --------------------------------------------------------------------- */
const A_ = {
  input(k, type){ const cur=cfgAt(U())[k]; act(`${k==='in1'?'AES IN 1':'AES IN 2'} → ${TYPES[type]}`, tr=>{ addEv(k,{type:+type, fs:cur.fs});
      tr(`T6305 BNC${k==='in1'?1:2} → ${k==='in1'?'T1':'T2'} PE-65612 (75 Ω, R${k==='in1'?2:4}) → U1 DS34LV86T → FPGA ${k==='in1'?'AES_IN_1 (pin 48)':'AES_IN_2 (pin 47)'} → aes_input_router`);
      if (+type===0) { tr('CS8416 loses lock → CS8416_READ_LOCK_ALL() bit set → Astatus inverted → AUDIO'+(k==='in1'?1:2)+' = NO'); return; }
      tr(`CS8416 (${k==='in1'?'U2, “U5_” nets':'U3, “U6_” nets'}) locks in ≈${C.LOCK_T*1e3} ms ${inf('CS8416 lock time')} → I²S U5/U6_SDATA`);
      if (+type>=2){ const P=burstP(+type,cur.fs); tr(`non_audio_detector: two zero frames, then Pa/Pb = F872/4E1F (16-bit), 6F872/54E1F (20-bit) or 96F872/A54E1F (24-bit) → pa(6..0) = Pc = ${PC[+type]} → pa(7) detect_r = 1, held ${C.HOLD} LRCLK (${(C.HOLD/cur.fs*1e3).toFixed(1)} ms) after each burst (one every ${(P*1e3).toFixed(2)} ms)`);
        tr(`ALTERA_read → ${k==='in1'?'ALTERA2 bit 5 (cntrl_status[10] ← PA1[7]), bits 4..0 ← PA1[4..0]':'ALTERA4 bit 7 (cntrl_status[24] ← PA12[7]), bits 4..0 = Pc'} → PROCESS_AUDIO_FORMAT: ${+type===4?'Pc 11 ≠ 1 or 28 → aes_led = COMPRESSED (no Dolby LED)':'aes_led = '+(+type===2?'DOLBY_AC3':'DOLBY_E')}`); }
      else tr('No burst preamble: detector flag clears after the hold time → aes_led = PCM'); }); },
  fs(k, fs){ const cur=cfgAt(U())[k]; act(`${k} sample rate → ${fs/1000} kHz`, tr=>{ addEv(k,{type:cur.type, fs:+fs}); tr('CS8416 relocks; the CAT552 and the AES generators follow the recovered clock'); tr('Manual: 32, 44.1, 48 kHz nominal only'); }); },
  ref(n){ const on=!cfgAt(U())['ref'+n]; act(`Frame REF ${n} ${on?'present':'removed'}`, tr=>{ addEv('ref'+n, on); tr(`P2 REF${n} → C${n===1?8:13}/R${n===1?6:9} → U1 R${n===1?3:4} → REF_IN_${n} → aes_input_router Input${n+2}`); tr('Only used when Reg 20 bits 5..3 (AES2 select) = '+(n+1)+' — AES Input 2 Source = Frame Ref '+n); tr(`AES reference on the frame REF input ${inf('openGear REF inputs carry whatever the frame is fed; an AES (DARS) reference is assumed')}`); }); },
  module(){ const on=!cfgAt(U()).module; act(on?'Fit the CAT552 decoder module':'Pull the CAT552 decoder module', tr=>{ addEv('module', on);
      tr('P3 72-pin socket: pin 70 ERR → R82 1K to GND → FPGA DOLBY_ERR (pin 237) → SOFT inst40 → ALTERA2 (pin 128) → AVR PA5');
      tr('dolby.h: DOLBY_INSTALLED = PINA & BIT5 (the same pin altera.c reads as ALTERA_DATA_READ)');
      tr(on?'DOLBY_DECODER_STATUS: pin high → Dolby_card_status = OK → RESET_DOLBY: Dolby_card_installed = YES at once':`pin low → Dolby_card_status = ERROR → RESET_DOLBY counts dolby_counter to ${C.DOLBY_LOCK_COUNTER} passes (≈${(C.DOLBY_LOCK_COUNTER*C.LOOP_T).toFixed(1)} s) before Dolby_card_installed = NO; then reset_552 = 0 for ${C.RESET_CONSTANT} passes, and again every ≈${(2001*C.LOOP_T).toFixed(1)} s`); }); },
  fault(){ act('CAT552 maps L/R to silence (fault injected)', tr=>{ addEv('fault', true);
      tr('CATMAPERR.vhd: DADA (L/R) both zero while DADB (C/LFE) and DADC (Ls/Rs) are not → CATERR = 1 → MAP_ERR → cntrl_status[8] → ALTERA2 bit 7');
      const p=passAt(U()); if (p&&p.checkDone) tr(`DOLBY_CAT552_AUDIO_ERROR_CHECK already finished at boot (dolby_error_check_complete = YES) — nothing will reset the decoder now`);
      else tr(`DOLBY_CAT552_AUDIO_ERROR_CHECK counts ${C.CAT_ERR_COUNTER+1} passes with the flag set (≈${((C.CAT_ERR_COUNTER+1)*C.LOOP_T).toFixed(1)} s), then dolby_audio_cat_error → reset_552 = 0 for ${C.RESET_VECTOR_CONSTANT} passes`);
      tr(`The fault is assumed to clear when the decoder is reset ${inf('the start-up mapping glitch the V2000/V2001 test reports check for')}`); }); },
  dip(i){ act(`DIP SW${i+1} → ${cfgAt(U()).dip[i]?'OFF':'ON'}`, tr=>{ addEv('dip', i); const p=passAt(U());
      tr(`SW1-${i+1} grounds net to FPGA dip${i+1} (pin ${181+i}) → cntrl_status[${i}] → ALTERA1 bit ${7-i} → READ_DIP_SWITCHES: dip_switches = MIRROR(ALTERA1) bit ${i}`);
      if (i>=6) tr('SW7/SW8 are only read in main() at boot: restart the card');
      else if (p && p.dse && !p.dbe) tr('SW7 OFF + SW8 ON: ALTERA_TRANSLATE_UART0 re-applies the DIP every pass → takes effect now');
      else tr(`Ignored until the next boot: ALTERA_TRANSLATE_UART0 only applies the DIP when dip_switch_enabled == YES && dashboard_enabled == NO (SW7 OFF, SW8 ON); now ${p?('SW7 '+(p.dse?'OFF':'ON')+', SW8 '+(p.dbe?'OFF':'ON')+' latched at boot'):'booting'}`); }); },
  dash(id, v){
    const OID={mode:0x302, ref:0x303, swap:0x301, dial:0x30D, dmx:0x30E}[id];
    if (id==='save'){ act('DashBoard: Settings → Save (OID 0x30C)', tr=>{ addEv('save', 1); tr('CANRX → DASHBOARD_RESPONSE_SETUP: OID 3.0C → save_settings = INVERT_DATA(0) = 0xFF'); tr('main(): if (save_settings) SAVE_INFORMATION_EEPROM() — mode, reference_sel (address 15), dialnorm, downmix'); tr('Used at power-up only when SW7 is ON (RESTORE_INFORMATION_EEPROM)'); }); return; }
    if (OID==null) return;
    act(`DashBoard: OID 0x${OID.toString(16)} → ${v}`, tr=>{ addEv('dash', {oid:OID, val:+v}); const p=passAt(U());
      tr(`MFC-8310 → CAN 1 Mbit/s → can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP: buffer[1..2] = 03 ${hx(OID&0xFF)}`);
      if (p && !p.dbe){ tr('dashboard_enabled == NO (SW8 ON at boot) → value ignored; the reply carries the old value'); return; }
      const name={0x302:'mode',0x303:'reference_sel',0x301:'auto_swap',0x30D:'dialnorm_enable',0x30E:'downmix_type'}[OID];
      tr(`dashboard_enabled == YES → ${name} = ${v}`);
      if (OID===0x301) tr('Next pass ALTERA_TRANSLATE_UART0 recomputes auto_swap from mode (ENABLED only in MODE2) — the write is lost');
      if (OID===0x30D||OID===0x30E) tr('ALTERA_TRANSLATE_UART0: dialnorm/downmix ≠ previous → reset_552 = 0 for one pass, dialnorm_settings = '+(OID===0x30D?(+v?'000':'111'):'unchanged')+' → Reg 20 bits 31..29 (DLM2..0), bit 23 = INVERT_DATA(downmix) → MAP0');
      if (OID===0x302) tr(`ALTERA_TRANSLATE_UART0: ${MODES[+v]} → routing (Reg 20 bits 16, 24, 26, 5..3)`);
      if (p && p.dse && !p.dbe) tr('Note: the DIP overrides this on the next pass (SW7 OFF, SW8 ON)'); }); },
  restart(){ act('Restart the card (power cycle)', tr=>{ const s=simulate(), last=passAt(U()); D.init=cfgAt(U()); D.init.fault=false; D.ee=last?{...last.ee}:{...D.ee}; D.ev=[]; D.epoch=0; D.ver++; SIM.seek(0);
      const B=bootTimes(); tr(`Bootloader → main(): initialization(); DATA_INITIALIZATION() lights ERROR and ERROR2`);
      tr(`ALTERA_RESET(1000) at ${(B.tReset*1e3).toFixed(1)} ms → nCONFIG; EP1C12 reloads ≈2.3 Mbit from U5 M25P40 by Active Serial → CONF_DONE at ≈${(B.confDone*1e3).toFixed(0)} ms ${inf('configuration time (slider)')}`);
      tr(`${D.fw==='v102'?'V102 reads ALTERA1 at '+B.reads.map(r=>(r*1e3).toFixed(1)+' ms').join(' and '):'V201 polls CONF_DONE (PINE bit 5), reads ALTERA1 at '+(B.reads[0]*1e3).toFixed(1)+' ms'}: ${B.reads[B.reads.length-1]<B.confDone?'FPGA not configured yet — all bits read 1 ('+inf('weak pull-ups on unconfigured Cyclone I/O')+') → every switch looks OFF':'FPGA configured — real switch positions'}`);
      tr(`Main loop starts at ≈${(B.tMain*1e3).toFixed(0)} ms`); }); },
  next(){ if (D.epoch+1>=C.MAXU) return; D.epoch++; SIM.seek(0); SIM.refresh(); },
};

/* ---------------------------------------------------------------------
   Drawings
   --------------------------------------------------------------------- */
/* Card: D6207A-ISS2 gerbers (TOP + TSM pads, TSS silk) rendered at 120 dpi over x 2.45…15.33 in, y 5.58…8.64 in
   (1545 × 367 px); openGear logo regions removed from the silk. Parts from D6207A-iss2-PNP-TOP.pnp (origin 3300, 6050 mil). */
const PNP = (x,y)=>[(x/1000+3.3-2.45)*120, (8.64-(y/1000+6.05))*120];
const LEDS = [['LED1','AES 1','g',-310.3,2225],['LED2','DOLBY 1','y',-310.3,2120],['LED3','ERROR 1','r',-310.3,2020],['LED4','AES 2','g',-310.3,1820],['LED5','DOLBY 2','y',-310.3,1720],['LED6','ERROR 2','r',-310.3,1620],['LED7','COM ACTIVITY','g',-25.7,1271.6]];
function comOn(u){ const s=simulate(); return s.CAN.some(f=>f.t<=u && u-f.t<0.04); }
function ledBits(u){ const p=passAt(u); const B=simulate().B; if (!p) return (u>=0?4|32:0); return p.L | (comOn(u)?64:0); }
function cardSVG(u){
  const L=ledBits(u), c=cfgAt(u), p=passAt(u), B=simulate().B, cfgd=u>=B.confDone;
  const mask = D.mask==='green'? '#1d5a32' : '#121413';
  let s=`<svg viewBox="0 0 1545 367" style="width:100%;display:block;border-radius:6px" role="img" aria-label="D6207A ISS2 card, top side, from the gerbers">
   <defs><filter id="d7glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1545" height="367" fill="var(--panel2)"/>
   <path d="M5 5 H1482 L1505 28 V36 H1536 V288 H1505 V300 H1536 V354 H1505 V362 H48 L5 322 Z" fill="${mask}" stroke="#2a2f2c"/>
   <image href="${ASSET}d6207a-card-copper.png" width="1545" height="367"/>
   <image href="${ASSET}d6207a-card-silk.png" width="1545" height="367" opacity=".9"/>`;
  LEDS.forEach(([rd,nm,col],i)=>{ const [x,y]=PNP(LEDS[i][3],LEDS[i][4]), on=(L>>i)&1;
    s+=`<g class="og62-hot" data-cled="${i}"><title>${rd} ${nm} (${on?'lit':'off'}) — PB${i}</title><rect x="${x-10}" y="${y-5}" width="20" height="10" rx="2" fill="${on?K.LEDC[col]:'#2b2f2c'}" ${on?'filter="url(#d7glow)"':''}/></g>`; });
  const [dx,dy]=PNP(1820,1884.5);
  for (let i=0;i<8;i++){ const x=dx+(i-3.5)*11.8, on=c.dip[i];
    s+=`<g class="og62-hot" data-dip="${i}"><title>SW1-${i+1}: ${['Mode MSB (weight 1 in code)','Mode LSB (weight 2 in code)','Downmix (ON = Lt/Rt)','Dialnorm (ON = enabled)','AES2 source MSB','AES2 source LSB','Default: ON = memory, OFF = DIP','DashBoard disable'][i]} — ${on?'ON':'OFF'} (click)</title>
      <rect x="${x-5}" y="${dy-16}" width="10" height="32" rx="1.5" fill="#c33" stroke="#611"/><rect x="${x-3.5}" y="${on?dy-14:dy+2}" width="7" height="12" fill="#f2f2f2"/><rect x="${x-6}" y="${dy-22}" width="12" height="44" fill="transparent"/></g>`; }
  s+=`<text x="${dx-46}" y="${dy+30}" font-size="10" fill="#9fd3ff">1</text><text x="${dx+40}" y="${dy+30}" font-size="10" fill="#9fd3ff">8</text><text x="${dx-46}" y="${dy-24}" font-size="9" fill="#9fd3ff">ON ↑ (orientation inferred)</text>`;
  // CAT552 module on P3 (position from the ISS1 photographs, scaled to the gerber)
  if (c.module){ const st=p?p.dec:'reset';
    s+=`<g class="og62-hot" data-mod="1"><title>CAT552 decoder module on P3 (click to pull it)</title><rect x="417" y="52" width="566" height="241" rx="6" fill="#4f7d2e" stroke="#2c4818" opacity=".93"/>
      <rect x="470" y="78" width="80" height="80" fill="#222"/><rect x="760" y="92" width="58" height="58" fill="#222"/>${[0,1,2,3,4,5,6].map(i=>`<rect x="${600+i*30}" y="165" width="18" height="40" fill="#1a1a1a"/>`).join('')}
      <rect x="440" y="250" width="150" height="22" rx="3" fill="#e5b21b"/><text x="447" y="266" font-size="13" font-family="var(--mono)" fill="#222">CAT552</text>
      <text x="620" y="245" font-size="15" font-weight="700" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">decoder: ${K.svgT(st)}</text></g>`; }
  else s+=`<g class="og62-hot" data-mod="1"><title>P3 empty — click to fit the CAT552 module</title><rect x="417" y="52" width="566" height="241" rx="6" fill="transparent" stroke="#e5b21b" stroke-dasharray="8 6"/><text x="560" y="170" font-size="16" fill="#e5b21b">P3 empty (click to fit the module)</text></g>`;
  const lab=(x,y,t,go)=>`<text ${go?`class="og62-hot" data-go="${go}"`:''} x="${x}" y="${y}" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${t}</text>`;
  const pc=(X,Y)=>PNP(X,Y);
  let q;
  q=pc(7896.9,1302.4); s+=lab(q[0]-52,q[1]+4,'U4 EP1C12','software')+`<circle cx="${q[0]+60}" cy="${q[1]-62}" r="7" fill="${cfgd?'#5dff5a':'#553'}"><title>CONF_DONE ${cfgd?'high':'low (configuring)'}</title></circle>`;
  q=pc(5089.8,1674.4); s+=lab(q[0]-60,q[1]+4,'U6 AT90CAN128 (under the module)','software');
  q=pc(9473.7,2100.8); s+=lab(q[0]-20,q[1]+44,'U2');  q=pc(8978.7,2100.8); s+=lab(q[0]-20,q[1]+44,'U3 · CS8416');
  q=pc(10365,2000); s+=lab(q[0]-30,q[1]+40,'U1'); q=pc(8880,1405); s+=lab(q[0]-14,q[1]+28,'U5 EPCS');
  q=pc(10385,1235); s+=lab(q[0]-40,q[1]+30,'U10 RS-485'); q=pc(11235,-120); s+=lab(q[0]-70,q[1]-12,'U11 CAN');
  s+=lab(1405,24,'T1')+lab(1405,120,'T2')+lab(1440,212,'U8')+lab(1440,300,'U7');
  if (!p && u<B.tMain) s+=`<text x="1180" y="355" font-size="13" fill="#ffd36a">${K.svgT(phaseAt(u).n)}</text>`;
  return s+'</svg>';
}
/* Card edge: D6207A-card-edge.cdr (2008-05-08), LED boxes at x 359.5…365.2 pt, centres below (pt). */
const EDGE_ART = {src:'d6207a-edge.svg', vb:[236,238,160,318], ys:[253.5,274.6,297.8,325.7,346.9,370.1,413.9]};
const ARTCDR = {edge:'#OPENGEAR #SERIES/D6207A - #Master #OPENGEAR/D6207A - #Engineering/D6207A - #Functional/D6207A-card-edge.cdr',
  rear:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6207A - Rear Module Options.cdr',
  t6305:'#OPENGEAR #SERIES/D6207A - #Master #OPENGEAR/D6207A - #Engineering/D6207A - #Functional/D6207A-T6305.cdr'};
function edgeSVG(u){ const L=ledBits(u);
  const body=LEDS.map((l,i)=>artLed({x:359.6, y:EDGE_ART.ys[i]-6.1, w:5.5, h:12.2, on:(L>>i)&1, col:K.LEDC[l[2]], fid:'d7ag', attrs:`class="og62-hot" data-led="e${i}"`,
    title:`${['AES1','Dolby1','Error1','AES2','Dolby2','Error2','COM Activity'][i]}: ${l[0]} ${l[1]} (${(L>>i)&1?'lit':'off'})`})).join('');
  return artSVG({src:EDGE_ART.src, vb:EDGE_ART.vb, maxw:230, label:'D6207A card edge', fid:'d7ag', body})
    + `<div class="small muted" style="text-align:center">Card edge: ${SIM.src(ARTCDR.edge,'D6207A-card-edge.cdr')} (2008-05-08)</div>`; }
/* Rear: T6305(A) from the openGear Rear Module Guide (2012-01-16), BNC centres x 491.9 / 510.8 pt, rows 240.0…296.7 pt,
   Phoenix blocks 9/10 at y 315.5 pt. Position n is BNCn of T6305.net. */
const REAR_XY = n=> n<=8? [n%2?491.9:510.8, 240+Math.floor((n-1)/2)*18.9] : [n===9?491.4:511.3, 315.5];
function rearSVG(u){ const p=passAt(u), c=cfgAt(u), o=outputs(p);
  const J=(n,x)=>{ const [cx,cy]=REAR_XY(n); return artJack(Object.assign({cx,cy,r:5.85},x)); };
  let body = J(1,{conn:c.in1.type>0, live:c.in1.type>0?(p&&p.AUDIO1?true:'warn'):undefined, attrs:'class="og62-hot" data-jack="in1"', title:`1: AES IN 1 — ${TYPES[c.in1.type]} (click to ${c.in1.type?'unplug':'plug in'})`})
    + J(2,{conn:c.in2.type>0, live:c.in2.type>0?true:undefined, attrs:'class="og62-hot" data-jack="in2"', title:`2: AES IN 2 — ${TYPES[c.in2.type]} (click to ${c.in2.type?'unplug':'plug in'})`});
  o.forEach(x=>{ body+=J(x.n,{live:x.on?true:false, title:`${x.n}: OUT${x.n-2} ${x.label} — ${x.out} → net ${x.net} → ${x.amp} → ${x.bnc}`}); });
  body+=J(9,{kind:'tb', w:8.6, h:15.1, title:'9: GPI/O 1 (drawn “Reserved”) — AES4P/N edge pins → Q2 → PC1/PC2'})
      + J(10,{kind:'tb', w:8.6, h:15.1, live:p&&p.dec==='Dolby E'?true:false, title:'10: METADATA OUT — ADM3485 RS-485, 115 kbps (Dolby E only)'});
  return artSVG({src:'d6207a-rear-t6305a.svg', vb:[402,212,190,119], maxw:420, label:'T6305 rear module', fid:'d7ar', body})
    + `<div class="small muted" style="text-align:center">T6305A: ${SIM.src(ARTCDR.rear,'D6207A - Rear Module Options.cdr')} (2012-01-16) · BNCn = position n (T6305.net)</div>`;
}

/* DashBoard window, rows from Dashboard.c (decoded) */
function dashView(u){
  const p=passAt(u), fw=FW[D.fw];
  if (!p) return `<div class="og62-dash"><div class="tb"><span class="dot" style="background:#d9a21b"></span>${fw.product}<span class="sp"></span><span class="muted small" style="font-weight:400">DashBoard 2.x (redrawn)</span></div><div style="padding:16px" class="small">Card booting (${phaseAt(u).n}) — CAN not set up yet.</div></div>`;
  const d=p.dash, ro=!p.dbe;
  const tabs=[
    {name:'Status', rows:[{type:'status',label:'Signal Status',oid:'0x204',value:SIG24[d.sig],level:['ok','warn','err'][SIG24S[d.sig]]},
      {type:'status',label:(p.mode===1?'Main Audio Input':'AES Input 1'),oid:'0x202',value:LOCKN[d.aes1],level:d.aes1?'ok':'err'},
      {type:'status',label:'AES Input 2',oid:'0x203',value:LOCKN[d.aes2],level:d.aes2===4?'info':d.aes2?'ok':'warn'},
      {type:'status',label:'Dolby Decoder',oid:'0x20B',value:DEC2B[d.dec],level:['ok','err'][DEC2BS[d.dec]]||'ok'}],
      note:'Values are the last ones the card reported (one report per CAN_TX_TIMER tick, every ≈288 ms).'},
    {name:'Control', rows:[{type:'combo',id:'mode',label:'Program Mode',oid:'0x302',value:d.mode,options:[2,0,3,1].map(v=>[v,MODEN[v]]),ro},
      {type:'combo',id:'ref',label:'AES Input 2 Source',oid:'0x303',value:d.ref,options:[1,2,3,0].map(v=>[v,REFN[v]]),ro},
      {type:'combo',id:'swap',label:'Auto Swap',oid:'0x301',value:d.swap,options:[[0,'Disabled'],[1,'Enabled']],ro},
      {type:'combo',id:'dial',label:'Dialnorm',oid:'0x30D',value:d.dial,options:[[0,'Disabled'],[1,'Enabled']],ro},
      {type:'combo',id:'dmx',label:'Downmix Type',oid:'0x30E',value:d.dmx,options:[[0,'LtRt'],[1,'LoRo']],ro},
      {type:'button',id:'save',label:'Settings',text:'Save',oid:'0x30C'}],
      note: ro?'SW8 was ON at boot: dashboard_enabled = NO, sets are ignored.':(p.dse&&!p.dbe?'DIP is live (SW7 OFF, SW8 ON).':'Changes apply on the next main-loop pass.')},
    {name:'Card Info', rows:[{type:'text',label:'Product',oid:'0x105',value:fw.product},{type:'text',label:'Supplier',oid:'0x102',value:fw.brand},{type:'text',label:'Software Rev',oid:'0x10B',value:fw.rev},{type:'text',label:'Name',oid:'0x107',value:'Dolby Decoder'}].concat(fw.web?[{type:'text',label:'Website',oid:'0x104',value:'www.ward-beck.com'}]:[]),
      note:`common.h: ${D.fw==='v102'?'#define WARD_BECK':'#define ROSS_VIDEO'}. Software Rev = "1.0" + ('0' + SOFTWARE_VERSION).`},
  ];
  return K.dashHTML({key:'d7', title:`${fw.product} — slot 2`, alarm:SIG24S[d.sig]===2||DEC2BS[d.dec]===2, tabs,
    tree:[{name:'openGear frame'},{name:'MFC-8310',lvl:1},{name:'Slot 2: '+fw.product,lvl:1,sel:true}], foot:'redrawn from Dashboard.c (V102)'});
}
function bindAll(root){
  K.bind(root, {dash:(id,v)=>A_.dash(id,v), jack:{in1:()=>A_.input('in1', cfgAt(U()).in1.type?0:3), in2:()=>A_.input('in2', cfgAt(U()).in2.type?0:1)}});
  root.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A_.dip(+g.dataset.dip)));
  root.querySelectorAll('[data-mod]').forEach(g=>g.addEventListener('click',()=>A_.module()));
  root.querySelectorAll('[data-go]').forEach(g=>g.addEventListener('click',()=>SIM.openTab(g.dataset.go)));
  root.querySelectorAll('[data-in]').forEach(el=>el.addEventListener('change',()=>A_.input(el.dataset.in, +el.value)));
  root.querySelectorAll('[data-fs]').forEach(el=>el.addEventListener('change',()=>A_.fs(el.dataset.fs, +el.value)));
  root.querySelectorAll('[data-ref]').forEach(el=>el.addEventListener('change',()=>A_.ref(+el.dataset.ref)));
  root.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{ const a=b.dataset.act; if (a==='fault') A_.fault(); else if (a==='restart') A_.restart(); else if (a==='next') A_.next(); else if (a==='module') A_.module(); }));
  root.querySelectorAll('[data-set]').forEach(el=>el.addEventListener('change',()=>{ const k=el.dataset.set;
    if (k==='fw'){ D.fw=el.value; A_.restart(); } else if (k==='fpga'){ D.fpga=el.value; A_.restart(); } else if (k==='cfgT'){ D.cfgT=+el.value/1000; A_.restart(); }
    else if (k==='mask'){ D.mask=el.value; SIM.refresh(); } else if (k==='video'){ D.video=+el.value; D.ver++; SIM.refresh(); } }));
}
function benchHTML(u){
  const c=cfgAt(u), sel=(k)=>`<select data-in="${k}">${[0,1,2,3,4].map(t=>`<option value="${t}" ${c[k].type===t?'selected':''}>${TYPES[t]}</option>`).join('')}</select>
    <select data-fs="${k}">${[32000,44100,48000].map(f=>`<option value="${f}" ${c[k].fs===f?'selected':''}>${f/1000} kHz</option>`).join('')}</select>`;
  return `<table class="kv small"><tr><td>AES IN 1 (BNC 1)</td><td>${sel('in1')}</td></tr><tr><td>AES IN 2 (BNC 2)</td><td>${sel('in2')}</td></tr>
    <tr><td>Frame REF 1 / REF 2</td><td><label><input type="checkbox" data-ref="1" ${c.ref1?'checked':''}> AES on REF 1</label> <label><input type="checkbox" data-ref="2" ${c.ref2?'checked':''}> REF 2</label></td></tr>
    <tr><td>Dolby E video rate</td><td><select data-set="video"><option value="29.97" ${D.video===29.97?'selected':''}>29.97 Hz</option><option value="25" ${D.video===25?'selected':''}>25 Hz</option></select></td></tr>
    <tr><td>Decoder module</td><td><button data-act="module">${c.module?'Pull CAT552':'Fit CAT552'}</button> <button data-act="fault" ${c.module?'':'disabled'}>Inject L/R mapping fault</button></td></tr></table>`;
}
function buildHTML(){
  return `<table class="kv small"><tr><td>AVR firmware</td><td><select data-set="fw">${Object.keys(FW).map(k=>`<option value="${k}" ${D.fw===k?'selected':''}>${FW[k].name}</option>`).join('')}</select></td></tr>
    <tr><td>FPGA image</td><td><select data-set="fpga">${Object.keys(FPGA).map(k=>`<option value="${k}" ${D.fpga===k?'selected':''}>${FPGA[k].name}</option>`).join('')}</select></td></tr>
    <tr><td>EP1C12 configuration time ${inf('≈2.3 Mbit by Active Serial; not in the archive')}</td><td><input type="range" data-set="cfgT" min="40" max="150" step="5" value="${Math.round(D.cfgT*1000)}"> ${Math.round(D.cfgT*1000)} ms</td></tr>
    <tr><td>Solder mask</td><td><select data-set="mask"><option value="black" ${D.mask==='black'?'selected':''}>black (ISS1 photographs)</option><option value="green" ${D.mask==='green'?'selected':''}>green (ISS2 fab note 1)</option></select></td></tr></table>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button data-act="restart">⟲ Restart card</button><button data-act="next">Next second ▶ (N)</button><span class="small muted" style="align-self:center">uptime ${D.epoch}…${D.epoch+1} s</span></div>`;
}
function statusHTML(u){
  const p=passAt(u), s=simulate();
  if (!p) return `<div class="small"><b>Boot:</b> ${phaseAt(u).n}<br>FPGA ${u>=s.B.confDone?'configured':'configuring (CONF_DONE low)'} · DIP latched from ${s.boot.src} · raw ALTERA1 at the read = <span class="mono">${bin(s.boot.rawDip)}</span></div>`;
  return `<table class="kv small"><tr><td>Program mode</td><td>${p.mode} · ${MODES[p.mode]}</td></tr><tr><td>Decoder input</td><td>CAT${p.cat+1} ← ${p.cat?'U3 (AES2 path: '+REFN[p.aes2in]+')':'U2 (AES IN 1)'} · state <b>${p.dec}</b></td></tr>
    <tr><td>aes1_led / aes2_led</td><td>${['PCM','COMPRESSED','DOLBY_AC3','DOLBY_E'][p.aes1_led]} / ${['PCM','COMPRESSED','DOLBY_AC3','DOLBY_E'][p.aes2_led]}</td></tr>
    <tr><td>Downmix · dialnorm</td><td>${p.dmx?'Lo/Ro':'Lt/Rt'} · ${p.dial?'enabled':'disabled'}</td></tr>
    <tr><td>RESET_552</td><td>${p.reset?'high (run)':'<b>low (decoder held in reset)</b>'}</td></tr>
    <tr><td>Dolby_card_installed</td><td>${p.inst?'YES':'NO'} · dolby_counter ${p.dcnt}</td></tr>
    <tr><td>CAT error check</td><td>${p.checkDone?'complete (never runs again)':`counting ${p.errCnt||p.notErrCnt}/${C.CAT_ERR_COUNTER+1}`}${s.catFired?` · fired at ${s.catFired.u.toFixed(2)} s`:''}</td></tr>
    <tr><td>Parameters from</td><td>${s.boot.src}; DIP ${p.dse&&!p.dbe?'live':'boot only'}</td></tr></table>`;
}

/* ---------------------------------------------------------------------
   Timeline lanes (uptime = epoch + t)
   --------------------------------------------------------------------- */
const E0 = ()=>D.epoch;
function lanesAll(full){
  const s=simulate(), B=s.B, e0=E0(), ac=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn'), bad=SIM.css('--bad'), ink2=SIM.css('--ink2');
  const PA = t=>passAt(e0+t);
  const segLane=(label,fn,cols)=>({label, h:22, draw(c,X,t0,t1,y,h){ const N=Math.min(700,Math.max(60,(X(t1)-X(t0))/2)), sp=t1-t0; let prev=null, x0=X(t0);
      for (let i=0;i<=N;i++){ const tt=t0+sp*i/N, v=i<N?fn(tt):null; if (v!==prev || i===N){ if (prev!=null){ const x1=X(tt); c.fillStyle=cols(prev); c.globalAlpha=.75; c.fillRect(x0,y+3,x1-x0,h-6); c.globalAlpha=1; if (x1-x0>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(String(prev).slice(0,Math.floor((x1-x0)/6)), x0+3, y+h/2+3); } } x0=X(tt); prev=v; } } }});
  const L=[];
  L.push(segLane('Boot / main()', t=>phaseAt(e0+t).s, v=>({init:ink2,reset:bad,wait:warn,slot:a2,setup:a2,main:ac}[v])));
  L.push(K.boolLane('FPGA CONF_DONE', t=>e0+t>=B.confDone, ac));
  const inLane=(k,lab)=>({label:lab, h:28, draw(c,X,t0,t1,y,h){ const cfg=cfgAt(e0+(t0+t1)/2)[k]; if (!cfg.type){ c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('no signal', X(t0)+4, y+h/2+3); return; }
      SIM.pulses(c,X,t0,t1,y,h/2,1/cfg.fs,0,0.3/cfg.fs,a2,'AES frames @'+cfg.fs/1000+'k');
      const P=burstP(cfg.type,cfg.fs); if (P){ c.fillStyle=warn; for (let tb=lastBurst(cfg,e0+t1)-e0; tb>=t0 && tb>=cfg.t0-e0; tb-=P){ c.fillRect(X(tb)-1,y+h/2,3,h/2-2); } c.font='10px sans-serif'; c.fillText('Pa/Pb bursts ('+TSHORT[cfg.type]+', every '+SIM.fmtDur(P)+')', X(t0)+4, y+h-3); } }});
  L.push(inLane('in1','AES IN 1 → U2 CS8416'));
  if (full) L.push(inLane('in2','AES IN 2 (rear BNC 2)'));
  L.push(K.boolLane('U2 lock (AUDIO1)', t=>{const p=PA(t); return p&&p.AUDIO1;}, ac));
  L.push(K.boolLane('detector U5 PA1[7]', t=>{const p=PA(t); return p&&p.flag1;}, warn));
  if (full){ L.push(K.boolLane('U3 lock (AUDIO2)', t=>{const p=PA(t); return p&&p.AUDIO2;}, ac)); L.push(K.boolLane('detector U6 PA12[7]', t=>{const p=PA(t); return p&&p.flag2;}, warn)); }
  L.push({label:'AVR main() passes', h:24, draw(c,X,t0,t1,y,h){ const st=B.tMain-e0; if (t1<st) { c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('booting', X(Math.max(t0,0))+4, y+h/2+3); return; }
      const a=Math.max(t0,st); const pxPer=X(a+C.LOOP_T)-X(a);
      if (pxPer<3){ SIM.pulses(c,X,a,t1,y,h,C.LOOP_T,st,C.LOOP_T*0.1,ac,'main-loop passes'); return; }
      for (let n=Math.floor((a-st)/C.LOOP_T); st+n*C.LOOP_T<t1; n++){ const ts=st+n*C.LOOP_T; c.fillStyle=ac; c.globalAlpha=.35; c.fillRect(X(ts),y+4,X(ts+C.LOOP_T*0.05)-X(ts),h-8); c.globalAlpha=1;
        c.fillStyle=a2; c.fillRect(X(ts+C.LOOP_T*0.05), y+6, X(ts+C.LOOP_T*C.RW_FRAC)-X(ts+C.LOOP_T*0.05), h-12); c.fillStyle=warn; c.fillRect(X(ts+C.LOOP_T*C.RW_FRAC),y+6,X(ts+C.LOOP_T*0.95)-X(ts+C.LOOP_T*C.RW_FRAC),h-12);
        if (pxPer>220){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('ALTERA_read_write (80 bytes)', X(ts+C.LOOP_T*0.07), y+h/2+3); } } }});
  L.push(K.boolLane('RESET_552 low (Reg 20 bit 28)', t=>{const p=PA(t); return e0+t>=B.confDone && (!p || !p.reset);}, bad));
  L.push(segLane('CAT552 decoder', t=>{const p=PA(t); return p?p.dec:(cfgAt(e0+t).module?'reset':'absent');}, v=>({'AC-3':ac,'Dolby E':ac,PCM:a2,sync:warn,reset:bad,absent:ink2,'no input':ink2}[v]||warn)));
  if (full) L.push(K.boolLane('MAP_ERR (CATMAPERR)', t=>{const p=PA(t); return p&&p.mapErr;}, bad));
  L.push(K.waveLane('CAT error check counter', t=>{const p=PA(t); if(!p) return -1; return p.checkDone?-1:((p.errCnt||p.notErrCnt)/(C.CAT_ERR_COUNTER+1))*2-1;}, {h:26,cols:[warn]}));
  if (full) L.push(K.waveLane('RESET_DOLBY dolby_counter', t=>{const p=PA(t); return p? p.dcnt/C.DOLBY_LOCK_COUNTER*2-1 : -1;}, {h:26,cols:[bad]}));
  const ledLane=(i,nm,col)=>K.boolLane(nm, t=>((ledBits(e0+t)>>i)&1), K.LEDC[col]);
  [['AES1','g'],['Dolby1','y'],['Error1','r'],['AES2','g'],['Dolby2','y'],['Error2','r']].forEach(([n,cl],i)=>{ if (full || i<3) L.push(ledLane(i,'LED '+n,cl)); });
  if (full){ L.push(K.tickLane()); L.push({label:'timer1 → CAN_TX_TIMER', h:20, draw(c,X,t0,t1,y,h){ let t=B.tMain+0.01-e0; while(t<t1){ if (t>=t0){ c.fillStyle=a2; c.fillRect(X(t)-1,y+4,2,h-8); } t+= (t+e0-B.tMain<C.DASH_INIT)?C.TX_INIT:C.TX_IDLE; } }}); }
  L.push(K.canLane(s.CAN.map(f=>({...f, t:f.t-e0})), 'CAN 1 Mbit/s (DashBoard)'));
  if (full){
    L.push(segLane('AES OUT (live outputs)', t=>{const p=PA(t); if(!p) return 'muted'; const o=outputs(p).filter(x=>x.on).map(x=>x.n-2); return o.length?'OUT '+o.join(','):'muted';}, v=>v==='muted'?ink2:ac));
    L.push(K.boolLane('METADATA RS-485 (Dolby E)', t=>{const p=PA(t); return p&&p.dec==='Dolby E' && ((e0+t)*D.video%1)<0.25;}, a2));
  }
  return L;
}

/* ---------------------------------------------------------------------
   Views
   --------------------------------------------------------------------- */
function keys(){ if (window.__d6207aKeys) return; window.__d6207aKeys=true;
  document.addEventListener('keydown', e=>{ if (!window.__d6207aActive || e.target.closest('input,select,textarea')) return;
    const k=e.key.toLowerCase(), c=cfgAt(U());
    if (k==='1') A_.input('in1',(c.in1.type+1)%5); else if (k==='2') A_.input('in2',(c.in2.type+1)%5);
    else if (k==='m') A_.module(); else if (k==='n') A_.next(); else if (k==='r') A_.restart(); else return; e.preventDefault(); }); }
function viewSim(m){
  window.__d6207aActive=true; keys();
  m.innerHTML = `${card('D6207A ISS2 — top side from the gerbers (click the DIP switch, the module, U4/U6)', `<div id="cardv"></div><div class="small muted" style="margin-top:4px">Copper and silk rendered from D6207A-ISS2.TOP/.TSM/.TSS; parts placed from D6207A-iss2-PNP-TOP.pnp; module outline from the ISS1 photographs. Keys: 1/2 cycle AES IN 1/2 · M module · N next second · R restart.</div>`)}
   <div class="grid2"><div>${card('Bench: inputs and module', `<div id="bench"></div>`)}${card('Card build', `<div id="build"></div>`)}${card('Firmware state at the playhead', `<div id="stat"></div>`)}</div>
   <div>${card('DashBoard', `<div id="dash"></div>`)}<div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear: T6305', `<div id="rear"></div>`)}</div></div></div>
   <div class="grid2">${card('What the card did', `<div id="trace" class="log"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>
   ${card('Timeline (uptime '+D.epoch+'…'+(D.epoch+1)+' s; click to seek)', `<canvas id="tl"></canvas>`)}`;
  let lastBench=-1, lastBuild='';
  SIM.on('time', ()=>{ const u=U();
    m.querySelector('#cardv').innerHTML=cardSVG(u); m.querySelector('#edge').innerHTML=edgeSVG(u); m.querySelector('#rear').innerHTML=rearSVG(u);
    m.querySelector('#dash').innerHTML=dashView(u); m.querySelector('#stat').innerHTML=statusHTML(u);
    const bk=D.ver+':'+Math.floor(u*1000); if (bk!==lastBench){ lastBench=bk; m.querySelector('#bench').innerHTML=benchHTML(u); bindAll(m.querySelector('#bench')); }
    const bd=D.fw+D.fpga+D.cfgT+D.mask+D.epoch; if (bd!==lastBuild){ lastBuild=bd; m.querySelector('#build').innerHTML=buildHTML(); bindAll(m.querySelector('#build')); }
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    ['#cardv','#edge','#rear','#dash'].forEach(s=>bindAll(m.querySelector(s)));
    SIM.drawLanes(m.querySelector('#tl'), lanesAll(false), {labelW:190});
  });
}

/* ---- Tutorial (from the D6207A manual v1.01, 2008|41) ---- */
const TUT = {i:0};
const pNow = ()=>passAt(U());
const LESSONS = [
  {title:'1 · Power up', body:`<p>The D6207A plugs into an <b>even</b> slot of a DFR-8300 frame; its T6305 rear module takes two slots (manual, “Board Installation”). Press <b>Restart card</b>, then play or drag the playhead through the first second.</p><p>Watch the edge: <b>Error1</b> and <b>Error2</b> light at once (DATA_INITIALIZATION), the FPGA reloads from the serial flash, the AVR reads the DIP switch and the slot ID, and the main loop starts at about 0.6 s.</p>`, check:()=>U()>=simulate().B.tMain, hint:'Move the playhead past ≈0.6 s.'},
  {title:'2 · Feed PCM', body:'<p>Set <b>AES IN 1</b> to <b>PCM</b>. The CS8416 locks, no burst preamble is found, and <b>AES1</b> lights green with <b>Dolby1</b> dark. DashBoard: AES Input 1 = Locked-PCM.</p><p>Manual: with PCM the card outputs L,R and Lo/Ro plus the input loop; the other outputs are muted.</p>', check:()=>{const p=pNow(); return p&&p.aes1_lock===1&&cfgAt(U()).in1.type===1;}, hint:'Bench → AES IN 1 → PCM, then let time run a few ms.'},
  {title:'3 · Feed Dolby E', body:'<p>Set <b>AES IN 1</b> to <b>Dolby E</b>. The FPGA finds Pa/Pb and Pc = 28, <b>Dolby1</b> lights yellow, and after two bursts the decoder fills all six outputs (and the metadata output).</p>', check:()=>{const p=pNow(); return p&&p.aes1_lock===3;}, hint:'AES IN 1 → Dolby E.'},
  {title:'4 · Dual inputs with auto swap', body:'<p>In DashBoard → Control set <b>Program Mode</b> to “Dual AES Input w/ Auto Swap”. Then make AES IN 1 <b>PCM</b> and AES IN 2 <b>AC-3</b>: ALTERA_TRANSLATE_UART0 sees the compressed flag on AES2 and routes it to the decoder (CAT2, RMCK2). DashBoard → Dolby Decoder reads “AES Input 2 Active”.</p>', check:()=>{const p=pNow(); return p&&p.mode===1&&p.cat===1;}, hint:'Program Mode → Dual auto swap; AES IN 1 PCM; AES IN 2 AC-3.'},
  {title:'5 · Downmix', body:'<p>Set <b>Downmix Type</b> to <b>LtRt</b>. Reg 20 bit 23 (MAP0 on the module) flips, and the code pulls RESET_552 low for one pass so the CAT552 restarts with the new setting — watch the RESET_552 lane and the decoder lane.</p>', check:()=>{const p=pNow(); return p&&p.dmx===0;}, hint:'DashBoard → Control → Downmix Type → LtRt.'},
  {title:'6 · The DIP switch at power-up', body:`<p>Manual: SW7 OFF = take parameters from the DIP switch. Set <b>SW1 ON</b> (dual with auto swap) on the card drawing and press <b>Restart card</b> with firmware <b>V102</b>: the mode stays 0, because V102 reads ALTERA1 before the FPGA has finished configuring. Now choose <b>V201</b> (it waits for CONF_DONE) — the mode comes up as 1.</p>`, check:()=>{const s=simulate(); return D.fw==='v201' && s.boot.mode===1;}, hint:'Click SW1-1 on the card, choose V201 in Card build (that restarts the card).'},
  {title:'7 · Pull the decoder', body:`<p>Click the module to pull it. The ERR line from P3 goes low through R82, but RESET_DOLBY waits ${C.DOLBY_LOCK_COUNTER} passes (≈${(C.DOLBY_LOCK_COUNTER*C.LOOP_T).toFixed(1)} s) before it believes it. Use <b>Next second</b> until <b>Error1</b> lights and DashBoard shows “Error”.</p>`, check:()=>{const p=pNow(); return p&&!p.inst;}, hint:'Pull the module, then press Next second (N) five or six times.'},
  {title:'8 · The mapping-error watchdog', body:`<p>Fit the module, set AES IN 1 to Dolby E and <b>Restart</b>. Within the first ≈2.6 s press <b>Inject L/R mapping fault</b>: the check counts ${C.CAT_ERR_COUNTER+1} passes and resets the decoder, which clears it. Try again after 3 s: the check has already completed and never runs again, so L/R stays silent.</p>`, check:()=>!!simulate().catFired, hint:'Restart, then inject the fault before t ≈ 2.6 s and press Next second.'},
  {title:'9 · Save and lock', body:'<p>Press <b>Save</b> in DashBoard → Control (SAVE_INFORMATION_EEPROM). Turn <b>SW7 ON</b> and restart: the card now restores from EEPROM. Turn <b>SW8 ON</b> and restart: DashBoard becomes read-only.</p>', check:()=>{const p=pNow(); return p&&p.ee.saved;}, hint:'DashBoard → Control → Save.'},
  {title:'Done', body:'<p>Open the Software tab for the main loop and Reg 20, and the Findings tab for what the code does that the manual does not say.</p>', check:()=>true, auto:true},
];
function viewTut(m){
  window.__d6207aActive=true; keys();
  K.tutorialView(m, {title:'Operator tutorial (D6207A manual v1.01)', L:LESSONS, st:TUT, D,
    side:()=>{ const u=U(); return `<div class="grid2" style="grid-template-columns:1fr 1.4fr;gap:8px"><div>${edgeSVG(u)}</div><div>${card('Bench', benchHTML(u)+`<div style="margin-top:6px">${buildHTML()}</div>`)}</div></div>${dashView(u)}<div style="margin-top:8px">${cardSVG(u)}</div>`; },
    bindSide:(r)=>bindAll(r), reset:()=>{ D.init={ in1:{type:1, fs:48000}, in2:{type:0, fs:48000}, ref1:true, ref2:false, module:true, fault:false, dip:[0,0,0,0,0,0,0,0] }; D.ee={mode:0,ref:1,dialnorm:0,downmix:1,saved:false}; D.fw='v102'; D.ev=[]; D.epoch=0; D.ver++; SIM.seek(0); }});
}

/* ---- One second ---- */
function viewSecond(m){
  window.__d6207aActive=true; keys();
  m.innerHTML = `${card(`One second of uptime (${D.epoch}…${D.epoch+1} s) — zoom with the transport; step by pass, AES frame or burst`, `<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap"><button data-act="restart">⟲ Restart (boot at t = 0)</button><button data-act="next">Next second ▶</button><span class="small muted" style="align-self:center">Main-loop pass ≈${(C.LOOP_T*1e3).toFixed(1)} ms ${inf('instruction count in altera.s at 8 MHz')} · ${Math.round(1/C.LOOP_T)} passes/s · timer0 1 ms · CAN_TX_TIMER every 288 ms (1.008 s for the first 3 s)</span></div><canvas id="tl"></canvas>`)}
    <div class="grid2">${card('AES3 frame on AES IN 1 at the playhead', `<canvas id="aes"></canvas><div id="aesn" class="small muted"></div>`)}${card('At the playhead', `<div id="here"></div>`)}</div>`;
  bindAll(m);
  SIM.on('time', ()=>{ const u=U(), c=cfgAt(u);
    SIM.drawLanes(m.querySelector('#tl'), lanesAll(true), {labelW:200});
    const fs=c.in1.fs, n=Math.floor(u*fs), seg=c.in1, P=burstP(seg.type,fs), lb=lastBurst(seg,u);
    let a=Math.sin(2*Math.PI*1000*n/fs)*0.5, b=Math.sin(2*Math.PI*1000*n/fs+1)*0.5, note='PCM: 1 kHz tone (illustration)';
    if (P && lb>=0){ const k=Math.round((u-lb)*fs); const words=[0xF872,0x4E1F,PC[seg.type],0x3800]; const w=k>=0&&k<2? words[k*2] : null;
      if (w!=null){ a=((w<<8)-(w&0x8000?1<<24:0))/8388608; b=((words[k*2+1]<<8))/8388608; note=`burst start: Pa = ${hx(words[k*2],4)}, Pb = ${hx(words[k*2+1],4)} (16-bit in the top of the 24-bit word)`; }
      else { a=((n*2654435761)%65536-32768)/32768*0.8; b=((n*40503)%65536-32768)/32768*0.8; note=`${TSHORT[seg.type]} payload frame ${k} of the burst (data, not audio)`; } }
    if (!seg.type) note='no signal';
    K.drawAES(m.querySelector('#aes'), {fs, a, b, n, dead:!seg.type}); m.querySelector('#aesn').textContent=note;
    const p=passAt(u); m.querySelector('#here').innerHTML = statusHTML(u) + (p?`<p class="small mono">Reg 20 = 0x${hx(p.reg,8)} · ALTERA1..6 = ${p.A.map(x=>hx(x)).join(' ')}</p>`:'');
  });
}

/* ---- Block diagram ---- */
const BLOCKS = {
  rear:{x:10,y:20,w:150,h:84,t:'T6305 rear',s:['BNC1/2 in, BNC3–8 out','TB9 GPI/O, TB10 meta'],d:'Passive single-card termination (T6305.net): BNCn on the module = BNCn on the D6207A edge connector P1. AN_BMID2 2K55 identifies it.'},
  rx:{x:10,y:130,w:150,h:84,t:'T1/T2 + U1',s:['PE-65612, 75 Ω','DS34LV86T receivers'],d:'Sheet 1: each AES input is transformer-coupled and terminated in 75 Ω (R2, R4), then squared up by the DS34LV86T. REF1/REF2 from the midplane come in through C8/C13 and 1K resistors.'},
  router:{x:200,y:20,w:170,h:84,t:'aes_input_router',s:['Reg 20 bits 14..0','IN1, IN2, REF1, REF2'],d:'In AMS81.bdf the router feeds U2 (AES8416_1) and U3 (AES8416_2). Inputs 5–8 are tied to GND. Select code 0 = AES IN 1, 1 = AES IN 2, 2 = REF 1, 3 = REF 2.'},
  cs:{x:200,y:130,w:170,h:84,t:'U2 / U3 CS8416',s:['I²S out (U5_/U6_ nets)','GPO0 = AES pass-through'],d:'init_CS8416 writes registers 0–6 (reg 5 = 0x85: master, I²S). Lock is read by CS8416_READ_LOCK_ALL (register 0x0C). GPO0 carries the input for the loop output.'},
  det:{x:410,y:20,w:180,h:84,t:'non_audio_detector ×2',s:['inst44 on U2, inst45 on U3','Pa/Pb + Pc → PA1, PA12'],d:'Shifts each I²S word in, looks for two all-zero frames then Pa/Pb (16, 20 or 24-bit), latches Pc bits 6..0 and holds a flag for 8191 frames. Only the first of each instance’s two channels is wired.'},
  catsw:{x:410,y:130,w:180,h:84,t:'switch_i2s_2x1 (inst)',s:['cntrl[16]: U2 or U3','→ EAD/EABC/EAFS'],d:'Picks which receiver feeds the decoder (CAT1/CAT2). The same bit switches AES OUT 6 (input loop) between U2 and U3 GPO0.'},
  cat:{x:630,y:130,w:180,h:84,t:'CAT552 module (P3)',s:['DLM2..0, MAP0, RST','DADA/B/C/D/M out, ERR'],d:'Plug-in decoder on a 72-pin right-angle socket. The FPGA drives RESET_552 (bit 28), DLM2..0 (dialnorm, bits 31..29) and MAP0 (bit 23, downmix). PLE, PLS, PRG0–2, PDN, ACS, MAP1 are tied high and PGP low inside AMS81.bdf.'},
  out:{x:630,y:20,w:180,h:84,t:'i2sx4_aes ×2 + switch2x1',s:['OUT1–3 = DADA/B/C','OUT4 SAP · OUT5 DADM · 6 loop'],d:'zero24_31 keeps 24 bits of each slot, i2sx4_aes builds AES3 from DABC/DAFS clocked by ref_mclk (U5 or U6 MCLK, bit 24). Bit 26 swaps OUT 4 between the decoder’s fourth pair and the AES2 pass-through.'},
  amp:{x:850,y:20,w:140,h:84,t:'U7–U9 EL5263',s:['gain −750/1470','75 Ω back-terminated'],d:'Each FPGA output → 10R → 1µF → 1K47 into an inverting stage with 750 Ω feedback, then 1µF + 75R to the BNC: ≈1.7 Vp-p unloaded, ≈0.85 Vp-p into 75 Ω (manual: 1 Vp-p).'},
  map:{x:850,y:130,w:140,h:84,t:'CATMAPERR',s:['MAP_ERR, MAP_ZERO','→ ALTERA2 bits 7, 6'],d:'CATERR = L/R (DADA) silent while C/LFE (DADB) and Ls/Rs (DADC) both carry samples. The AVR resets the decoder if this lasts 1001 passes during the first check.'},
  fpga:{x:410,y:240,w:180,h:80,t:'U4 EP1C12Q240C8',s:['AMS81.qpf, Quartus 4.1 → 9.0','U5 M25P40 Active Serial'],d:'One Cyclone holds all of the above. Configured from the M25P40 (EPCS footprint) after ALTERA_RESET pulls nCONFIG through Q1.'},
  avr:{x:200,y:240,w:170,h:80,t:'U6 AT90CAN128',s:['8 MHz, PA = ALTERA7..0','PB0–6 LEDs, PF0–2 IDs'],d:'Runs main() in v100w.c. Talks to the FPGA over a bit-banged link (PA0 FSYNCH/strobe, PA1 read strobe, PA2 clock, PA7 data out, PA6 status in, PA5 DOLBY_ERR in).'},
  can:{x:10,y:240,w:150,h:80,t:'U11 SN65HVD233',s:['CAN 1 Mbit/s','→ MFC → DashBoard'],d:'CANBT1 0x00, CANBT2 0x04, CANBT3 0x12 at 8 MHz. DashBoard parameter reports leave on CAN_TX_TIMER ticks.'},
  dip:{x:630,y:240,w:180,h:80,t:'SW1 DIP + ALTERA1',s:['dip1..8 → cntrl_status[0..7]','read back, MIRROR()'],d:'The switch is wired to the FPGA, not the AVR. The AVR sees it only through the status stream, and only once the FPGA is configured.'},
  meta:{x:850,y:240,w:140,h:80,t:'U10 ADM3485',s:['META_IN → META','RS-485 115 kbps'],d:'Metadata from the CAT552 (P3-60) passes through the FPGA (SOFT inst39) to the RS-485 driver and rear TB10. Manual: Dolby E only.'},
};
const WIRES=[['rear','rx','AES in'],['rx','router','AES_IN_1/2, REF'],['router','cs','2 streams'],['cs','det','I²S'],['cs','catsw','I²S'],['catsw','cat','EAD'],['cat','out','DADx'],['out','amp','AES_OUT_n'],['amp','rear',''],['cat','map','DADA/B/C'],['map','fpga','MAP_ERR'],['det','fpga','PA1/PA12'],['fpga','avr','ALTERA1–6'],['avr','fpga','Reg 20'],['avr','can',''],['dip','fpga','dip1..8'],['cat','meta','META_IN']];

/* ---- Schematics (redrawn) ---- */
const SHEETS = [
  {name:'1 · AES inputs', note:'Redrawn from d6207-sch[Sheet1].pdf (ISS2, 26 Feb 2012) and the ISS1 netlist.', svg:()=>K.chip(170,60,150,'T1 / T2 PE-65612',[['1','BNC1_SIG / BNC2_SIG'],['2','BNCn_GND']],[['3,4','75R (R2/R4)']],'transformer, 75 Ω')+K.chip(330,230,170,'U1 DS34LV86T',[['R1±','T1'],['R2±','T2'],['R3±','REF1 (C8, R6 1K)'],['R4±','REF2 (C13, R9 1K)']],[['OUT1','→ AES_IN_1'],['OUT2','→ AES_IN_2'],['OUT3','→ REF_IN_1'],['OUT4','→ REF_IN_2']],'quad RS-422 receiver')+K.chip(590,60,130,'U2 CS8416',[['RXP0','RXP0_U5'],['RST','CS8416_RESET1'],['CS','CS8416_SEL1']],[['SDATA','U5_SDATA'],['SCLK','U5_SCLK'],['FSYNC','U5_LRCLK'],['MCLK','U5_MCLK'],['GPO0','U5_GPO0']],'AES IN 1 receiver')+K.chip(590,300,130,'U3 CS8416',[['RXP0','RXP0_U6'],['RST','CS8416_RESET2'],['CS','CS8416_SEL2']],[['SDATA','U6_SDATA'],['SCLK','U6_SCLK'],['FSYNC','U6_LRCLK'],['MCLK','U6_MCLK'],['GPO0','U6_GPO0']],'AES2-path receiver')},
  {name:'2 · FPGA U4', note:'Pin names from AMS81.qsf (Working/v102), connections from AMS81.bdf traced net by net. ALTERA0..7 are the AVR link.', h:520, svg:()=>K.chip(300,50,230,'U4 EP1C12Q240C8',[['48/47','AES_IN_1/2'],['49/46','REF_IN_1/2'],['53/68','AES8416_1/2'],['54–60','U5_ LRCLK…GPO2'],['61–67','U6_ GPO2…LRCLK'],['181–188','dip1…dip8'],['133','ALTERA0 ← cntrl_data'],['123','ALTERA7 ← cntrl_strb'],['125','ALTERA5 ← cntrl_clk'],['124','ALTERA6 ← read strobe'],['126','ALTERA4 → SR ref'],['237','DOLBY_ERR'],['236','META_IN']],[['19,20,18','AES_OUT_1/2/3'],['21,17,16','AES_OUT_4/5/6'],['132','ALTERA1 → status'],['128','ALTERA2 ← DOLBY_ERR'],['194','RESET_552'],['206–208','DLM0–2'],['195,196','MAP0, MAP1'],['216/217/224/225','DADA/B/C/D'],['223','DADM'],['226/227','DAFS/DABC'],['218/222/219','EAD/EABC/EAFS'],['23','META'],['100,101,98,99…','TP1–TP7']],'AMS81.qsf · config EPCS1 named, M25P40 fitted')},
  {name:'3 · AVR U6 and LEDs', note:'Redrawn from d6207-sch[Sheet3].pdf. LED colours from the 13 Mar 2008 ECO (GRN/YEL/RED).', h:470, svg:()=>K.chip(330,60,200,'U6 AT90CAN128',[['PA7','ALTERA0 (data out)'],['PA6','ALTERA1 (status in)'],['PA5','ALTERA2 (DOLBY_ERR)'],['PA4','ALTERA3'],['PA3','ALTERA4'],['PA2','ALTERA5 (clock)'],['PA1','ALTERA6 (read strobe)'],['PA0','ALTERA7 (FSYNCH)'],['PF0/1/2','AN_SLOTID/BMID/BMID2'],['PE5','CONF_DONE'],['PG2','ALTERA_RESET → Q1']],[['PB0','LED1 AES 1 (GRN)'],['PB1','LED2 DOLBY 1 (YEL)'],['PB2','LED3 ERROR 1 (RED)'],['PB3','LED4 AES 2 (GRN)'],['PB4','LED5 DOLBY 2 (YEL)'],['PB5','LED6 ERROR 2 (RED)'],['PB6','LED7 COM ACTIVITY'],['PD5/PD6','CAN TX/RX'],['PD0–4, PG3/4','CS8416 SPI'],['PC1/PC2','GPIO1 N/P'],['XTAL','8 MHz']],'332 Ω LED resistors')},
  {name:'4 · AES output amps', note:'Redrawn from d6207-sch[Sheet4].pdf with the netlist; FPGA pin names differ from the board net names.', svg:()=>{ let s=''; outputs(passAt(U())).forEach((o,i)=>{ const y=50+i*62; s+=`<text x="30" y="${y}" font-size="12" fill="var(--ink)">FPGA ${o.out}</text><line x1="140" y1="${y-4}" x2="250" y2="${y-4}" stroke="var(--ink)"/><text x="150" y="${y-8}" font-size="10" fill="var(--accent2)">net ${o.net}</text><text x="260" y="${y}" font-size="12" fill="var(--ink)">10R · 1µF · 1K47 → ${o.amp} EL5263 (750 Ω fb) → 1µF · 75R → ${o.bnc}</text><text x="690" y="${y}" font-size="12" font-weight="700" fill="${o.on?'var(--accent)':'var(--ink2)'}">T6305 pos ${o.n}: ${o.label}</text>`; }); return s; }},
  {name:'5 · CAT552 socket P3', note:'Redrawn from d6207-sch[Sheet5].pdf (P3 CAT_NO_552_RA, 72 pins) and AMS81.bdf tie-offs.', h:520, svg:()=>K.chip(330,40,200,'P3 CAT552 (72-pin)',[['70 ERR','→ DOLBY_ERR, R82 1K'],['3 RST','RESET_552'],['33–31 DLM2..0','Reg 20 31..29'],['7/6 MAP1/0','VCC / bit 23'],['12–10 PRG2..0','VCC'],['35/34 PLS/PLE','VCC'],['36 PGP','GND'],['17/18 PDN/ACS','VCC'],['50–48 EABC/EAFS/EAD','encoded in'],['60 MATE','META_IN']],[['45/46 DADA/DADB','OUT1, OUT2'],['53/52 DADC/DADM','OUT3, OUT5'],['54 DADD','OUT4 (SAP)'],['55/56 DAFS/DABC','frame / bit clock'],['69 SYNC, 67 VFS','n.c. to FPGA'],['68–61 LTC…BSF0','n.c.'],['+5V 2, 25, 47, 71','REG3 PTH12050']],'module pin names from the schematic; functions inferred from use')+K.chip(580,330,130,'U10 ADM3485',[['DI','META'],['DE','U10_EN']],[['A/B','AES8P/N → TB10']],'metadata')},
  {name:'6 · Edge, CAN, power', note:'Redrawn from d6207-sch[Sheet6].pdf and T6305.net.', svg:()=>K.chip(200,50,170,'P1 MEDAC100 (rear)',[['97/92','BNC1/BNC2_SIG'],['75/80','BNC3/BNC4_SIG'],['37/34','BNC5/BNC6_SIG'],['17/22','BNC7/BNC8_SIG'],['51/49','AES4P/N (GPIO1)'],['52/50','AES8P/N (metadata)'],['2/1','AN_BMID/AN_BMID2']],[],'to T6305')+K.chip(560,50,170,'P2 (midplane)',[['14/10','REF1/REF2'],['13/11','CANH/CANL'],['6','AN_SLOTID (R86 1K)'],['3,5,7','+12V'],['2','−7.5V']],[],'')+K.chip(560,280,170,'Power',[['F1','RXE-050 fuse'],['REG3','PTH12050 → +5V'],['REG2','LM1117-3.3 → 3V'],['REG1','LM1117-ADJ → VCC_INT']],[],'manual 5 W max; tests 11–14 W')},
];

/* ---- Software ---- */
const LOOP = [
  ['WDR(); DOLBY_CAT552_AUDIO_ERROR_CHECK()', .01, 'counts ALTERA2 bit 7 (MAP_ERR) until it decides, once'],
  ['if (dolby_audio_cat_error) reset_552 = 0', .01, 'reset_counter = RESET_VECTOR_CONSTANT (100)'],
  ['DOLBY_DECODER_STATUS(); RESET_COUNTER()', .01, 'PINA bit 5 = DOLBY_ERR; RESET_DOLBY counts 2000'],
  ['Astatus = INVERT_DATA(CS8416_READ_LOCK_ALL())', .03, 'SPI reads of register 0x0C on U2 and U3'],
  ['ALTERA_TRANSLATE_UART0()', .01, 'routing from mode, locks and formats; DIP override; dialnorm/downmix reset'],
  ['ALTERA_SORT()', .01, '80 bytes: regs 1–19 zero, reg 20 routing'],
  ['ALTERA_read_write()', .78, '640 bits bit-banged, MSB first; the FPGA keeps the last 64'],
  ['ALTERA_read()', .05, '6 status bytes: ALTERA1 DIP, 2 AES1, 3 SR, 4 AES2, 5 –, 6 0xA8'],
  ['PROCESS_AUDIO_INFORMATION / _FORMAT', .02, 'AUDIO1/2, aes1_led/aes2_led from bit 5 / bit 7 and Pc'],
  ['READ_DIP_SWITCHES(); REFRESH_LEDS()', .02, 'dip_switches = MIRROR(ALTERA1); PORTB'],
  ['CAN_FUNCTIONS() → PARAMETER_UPDATE()', .04, 'queues one DashBoard report at a time'],
  ['if (save_settings) SAVE_INFORMATION_EEPROM()', .01, ''],
];
const REG20 = [[31,29,'dialnorm_settings','DLM2..0 (111 off, 000 on)'],[28,28,'reset_552 & 0x10','RESET_552 (0 = reset)'],[27,27,'prologic_disable','not connected in AMS81.bdf'],[26,26,'external_secondary_audio','switch2x1 inst24: OUT4 = AES2'],[25,25,'reserved',''],[24,24,'altera_reference_input','ref_mclk: U5 (0) / U6 (1) MCLK'],[23,23,'INVERT_DATA(downmix_type)','MAP0 on the CAT552'],[22,17,'0',''],[16,16,'altera_audio_input','decoder + loop: U2 (CAT1) / U3 (CAT2)'],[15,6,'0','TP4–TP6 test points on 13–15'],[5,3,'altera_aes2_input','router → U3: 0 IN1, 1 IN2, 2 REF1, 3 REF2'],[2,0,'altera_aes1_input','router → U2 (always 0)']];
const STAT = [['ALTERA1','cntrl_status[0..7] ← dip1..dip8','DIP: bit 7 = SW1 … bit 0 = SW8 (MIRROR → dip_switches)'],['ALTERA2','[8] MAP_ERR · [9] MAP_ZERO · [10] PA1[7] · [11..15] PA1[4..0]','7 CAT_MAPPING_ERR · 6 CAT_SILENCE · 5 compressed (1 = yes) · 4..0 Pc'],['ALTERA3','[22] det192 · [23] det96 (Working/v102 only)','never read by V102'],['ALTERA4','[24..31] PA12[7..0] (U3 detector)','7 compressed · 6..0 Pc'],['ALTERA5','[32..39]','not used'],['ALTERA6','fixed 1,0,1,0,1,0,0,0','0xA8: alignment (docs: ALTERA18) — not checked']];
function viewSoft(m){
  window.__d6207aActive=false;
  m.innerHTML = `<div class="grid2">${card('main() — the pass running at the playhead', `<div id="loop"></div>`)}${card('Boot sequence (v100w.c main)', `<div id="boot"></div>`)}</div>
   <div class="grid2">${card('Reg 20 “Routing control 1” — AVR → FPGA (live)', `<div id="reg"></div>`)}${card('Status bytes — FPGA → AVR (live)', `<div id="stb"></div>`)}</div>
   <div class="grid2">${card('Format detection pipeline (non_audio_detector.vhd)', `<div id="det"></div>`)}${card('State machines (dolby.c, D6207A.c)', `<div id="sm"></div>`)}</div>
   ${card('Who decides the parameters', `<div id="prec"></div>`)}`;
  SIM.on('time', ()=>{ const u=U(), s=simulate(), p=passAt(u), B=s.B;
    let ph=p? (u-p.u)/C.LOOP_T : -1, acc=0;
    m.querySelector('#loop').innerHTML = p? `<table class="kv small">${LOOP.map(([f,w,n])=>{ const on=ph>=acc&&ph<acc+w; acc+=w; return `<tr style="${on?'background:color-mix(in srgb,var(--accent) 22%,transparent);font-weight:700':''}"><td class="mono">${f}</td><td class="muted">${n}</td></tr>`; }).join('')}</table><p class="small muted">Pass ${p.k} at ${p.u.toFixed(4)} s; widths from instruction counts ${inf('ICCAVR listing, 8 MHz')}.</p>` : `<p>Booting: <b>${phaseAt(u).n}</b></p>`;
    const rows=[['initialization(); DATA_INITIALIZATION()',0],['wait(3000)',0],['ALTERA_RESET(1000) → nCONFIG',B.tReset],['FPGA configuring from U5 …',B.tCfg0],['CONF_DONE',B.confDone]].concat(B.reads.map((r,i)=>[`ALTERA_read(); READ_DIP_SWITCHES() #${i+1}`,r]),[['slot ID: AD_CONVERTER_SETUP ×100',B.tSlot0],['DOLBY_DECODER_STATUS; DATA_SETUP; CAN_setup; '+(s.boot.dse?'DIP → parameters':'RESTORE_INFORMATION_EEPROM'),B.tSlot1],['while(1)',B.tMain]]);
    m.querySelector('#boot').innerHTML=`<table class="kv small">${rows.sort((a,b)=>a[1]-b[1]).map(([n,t])=>`<tr style="${Math.abs(u-t)<0.004?'font-weight:700':''}"><td class="mono">${(t*1e3).toFixed(1)} ms</td><td>${n}</td></tr>`).join('')}</table>
      <p class="small">DIP read at ${(B.reads[B.reads.length-1]*1e3).toFixed(1)} ms ${B.reads[B.reads.length-1]<B.confDone?'<b style="color:var(--bad)">before CONF_DONE</b> → ALTERA1 = 0xFF':'after CONF_DONE'} → mode ${s.boot.mode}, AES2 source ${REFN[s.boot.ref]}, ${s.boot.src}.</p>`;
    const reg=p?p.reg:0;
    m.querySelector('#reg').innerHTML=`<div class="mono small" style="margin-bottom:6px">0x${hx(reg,8)} = ${bin(reg,32).replace(/(.{8})/g,'$1 ')}</div><table class="kv small"><tr><th>bits</th><th>value</th><th>code</th><th>FPGA (AMS81.bdf)</th></tr>${REG20.map(([h,l,n,f])=>{ const v=(reg>>>l)&((1<<(h-l+1))-1); return `<tr><td class="mono">${h===l?h:h+'..'+l}</td><td class="mono">${bin(v,h-l+1)}</td><td class="mono">${n}</td><td>${f}</td></tr>`; }).join('')}</table><p class="small muted">Two chained shift_in32 (inst6, inst25) keep only the last 64 of the 640 bits sent each pass.</p>`;
    const A=p?p.A:[0,0,0,0,0,0];
    m.querySelector('#stb').innerHTML=`<table class="kv small"><tr><th>byte</th><th>value</th><th>source (cntrl_status)</th><th>V102 reads</th></tr>${STAT.map(([n,src,r],i)=>`<tr><td class="mono">${n}</td><td class="mono">${bin(A[i])}</td><td>${src}</td><td>${r}</td></tr>`).join('')}</table><p class="small muted">shifter_out_48bit sends shift_data(0) first; read_data shifts it into the MSB, so every byte arrives bit-reversed — hence MIRROR() for the DIP and the crossed PA1[4..0] → cntrl_status[11..15] bus.</p>`;
    const c=cfgAt(u), seg=c.in1, lb=lastBurst(seg,u), P=burstP(seg.type,seg.fs);
    const words = (seg.type>=2)? ['000000','000000','000000','000000','F87200','4E1F00',hx(PC[seg.type]<<8,6),'…','…','…'] : ['(PCM samples)'];
    m.querySelector('#det').innerHTML = `<p class="small">Pipeline x1…x10 (A and B words of five frames), checked on each LRCLK rising edge:</p><div class="mono small" style="display:flex;gap:4px;flex-wrap:wrap">${words.map((w,i)=>`<span style="padding:2px 5px;border:1px solid var(--line);border-radius:4px;background:${i<4?'var(--chip)':i<6?'color-mix(in srgb,var(--warn) 25%,transparent)':i===6?'color-mix(in srgb,var(--accent) 25%,transparent)':'transparent'}">x${i+1}: ${w}</span>`).join('')}</div>
      <ul class="small"><li>x1..x4 = 0 (two zero frames), x5/x6 = Pa/Pb in 16-bit (F87200/4E1F00), 20-bit (6F8720/54E1F0) or 24-bit (96F872/A54E1F) form</li><li>pa(6..0) ← x7(14..8) = Pc; detect → detect_r = 1 and count = 8191 LRCLK; the flag drops when the count reaches 0</li><li>AES IN 1 now: ${TYPES[seg.type]}${P?`, last burst ${lb>=0?((u-lb)*1e3).toFixed(1)+' ms ago':'not yet'}, flag ${p&&p.flag1?'set':'clear'}, Pc ${p?p.pc1:0}`:''}</li><li>FPGA image: ${FPGA[D.fpga].name} — ${FPGA[D.fpga].det?'detector present':'<b>detector removed</b>: the AVR sees PCM on both inputs'}</li></ul>`;
    m.querySelector('#sm').innerHTML = p? `<table class="kv small"><tr><td>RESET_DOLBY</td><td>Dolby_card_status ${p.pin?'OK':'ERROR'} · dolby_counter ${p.dcnt}/${C.DOLBY_LOCK_COUNTER} · installed ${p.inst?'YES':'NO'}</td></tr>
      <tr><td>RESET_COUNTER</td><td>reset_552 ${p.reset?'0xFF':'0x00'}${p.dolbyReset?' · RESET_DOLBY fired':''}${p.catFire?' · CAT error fired':''}${p.dmReset?' · dialnorm/downmix change':''}</td></tr>
      <tr><td>DOLBY_CAT552_AUDIO_ERROR_CHECK</td><td>${p.checkDone?'dolby_error_check_complete = YES (one-shot, done)':`error ${p.errCnt} / not-error ${p.notErrCnt} of ${C.CAT_ERR_COUNTER+1}`}</td></tr>
      <tr><td>PARAMETER_UPDATE</td><td>${p.fired?'queued '+p.fired:'idle'} · next report on CAN_TX_TIMER</td></tr>${D.fw==='v201'?`<tr><td>v201 catResetDone</td><td>${p.catResetDone?'resetting after AES1 lock':'idle'}</td></tr>`:''}</table>`:'<p>Booting.</p>';
    m.querySelector('#prec').innerHTML = `<table class="kv small"><tr><th>SW7 (Default)</th><th>SW8 (DashBoard disable)</th><th>at boot</th><th>each pass</th><th>DashBoard sets</th></tr>
      <tr><td>OFF</td><td>OFF (factory)</td><td>DIP → parameters</td><td>no DIP</td><td>accepted</td></tr><tr><td>OFF</td><td>ON</td><td>DIP</td><td><b>DIP re-applied</b></td><td>ignored</td></tr><tr><td>ON</td><td>OFF</td><td>EEPROM</td><td>no DIP</td><td>accepted</td></tr><tr><td>ON</td><td>ON</td><td>EEPROM</td><td>no DIP</td><td>ignored</td></tr></table>
      <p class="small">Now: SW7 ${s.boot.dse?'OFF':'ON'}, SW8 ${s.boot.dbe?'OFF':'ON'} as latched at boot (raw ALTERA1 <span class="mono">${bin(s.boot.rawDip)}</span>). From v100w.c main() and D6207A.c ALTERA_TRANSLATE_UART0.</p>`;
  });
}

/* ---- Findings ---- */
const F_ = (t,b,src)=>`<b>${t}</b> ${b}${src?` <span class="small muted mono">${src}</span>`:''}`;
const FINDINGS = [
  F_('V102 reads the DIP switch before the FPGA is configured.', 'main() pulses ALTERA_RESET (nCONFIG through Q1), then reads ALTERA1 after 8 and 20 × wait(3000) (≈25 and ≈57 ms). An EP1C12 loading ≈2.3 Mbit by Active Serial is not ready that fast '+inf('configuration time not in the archive')+', so the read sees 0xFF and every switch looks OFF. The V2001 test report says the fix was for “the FPGA would not initialize completely at startup”; v201 replaces the waits with up to five CONF_DONE polls (PINE bit 5).', 'v100w.c main(); v201/v100w.c //Ali-Add; D6207A-V2001-20JUL12.pdf'),
  F_('“Dolby installed” is the decoder’s ERR pin.', 'DOLBY_INSTALLED = PINA & BIT5. On the board PA5 is net ALTERA2 (FPGA pin 128), which AMS81.bdf drives from DOLBY_ERR (pin 237) = P3-70 ERR with R82 1K to ground. altera.c also reads the same pin as ALTERA_DATA_READ during every write; the bytes land in ALTERA_BUFFER_in and are never used.', 'dolby.h, altera.h; AMS81.bdf SOFT inst40; D6207A.net ERR'),
  F_('The compressed flag is active-high; the documents are wrong.', 'non_audio_detector sets pa1(7) <= detect_r = 1 when it finds a burst, and the V102 code tests bit 5 / bit 7 set = compressed. Both register-map documents say “0 = yes”. This settles the open question in the docs plugin.', 'non_audio_detector.vhd; D6207A.c PROCESS_AUDIO_FORMAT'),
  F_('Program-mode codes: the manual’s table is right, its labels are not.', 'v100w.c gives SW1 weight 1 (mode += 1 if BIT0 == 0) and SW2 weight 2, so the manual’s table rows (SW1 ON = auto swap = 1, SW2 ON = single = 2) agree with the MIB and DashBoard. Only the “MSB/LSB” captions are swapped. The manual also calls “Single AES Input” Mode2 and “auto swap” Mode3, the reverse of the MODE2/MODE3 macros in D6207A.h. DashBoard lists the four modes in the order 2, 0, 3, 1.', 'v100w.c; D6207A.h; Dashboard.c Parameter32'),
  F_('With factory switch settings the DIP is read once.', 'ALTERA_TRANSLATE_UART0 re-applies the switch only when dip_switch_enabled == YES and dashboard_enabled == NO (SW7 OFF and SW8 ON). With both OFF (the manual’s defaults) the switch is read at boot and DashBoard changes win from then on. SW7 and SW8 themselves are read only at boot.', 'D6207A.c'),
  F_('The mapping-error watchdog runs once per power-up.', 'DOLBY_CAT552_AUDIO_ERROR_CHECK sets dolby_error_check_complete = YES after 1001 passes either way and nothing clears it, so after ≈2.6 s a CAT552 that maps silence onto L/R is never reset. v201 adds a different cure: reset the CAT552 for 51 passes whenever AES1 locks.', 'dolby.c; v201/v100w.c'),
  F_('MAP_ERR means “L/R silent, centre and surrounds not”.', 'CATMAPERR raises CATERR when DADA is zero in both channels while DADB and DADC are both non-zero; ZERO (CAT_SILENCE) is DADA silent alone.', 'CATMAPERR.vhd'),
  F_('76 of the 80 bytes written each pass go nowhere.', 'ALTERA_SORT fills registers 1–19 with zeros; the FPGA has two chained shift_in32 blocks, so only the last 64 bits (Reg 19 and 20) are kept. Shifting the zeros takes most of each ≈2.6 ms pass.', 'D6207A.c ALTERA_SORT; AMS81.bdf inst6/inst25'),
  F_('Reg 20 against the netlist.', 'Bit 27 (prologic_disable) is not connected; the module’s PLE pin is tied high in the FPGA. Bit 23 is INVERT_DATA(downmix_type) and drives MAP0; bits 31..29 drive DLM2..0. The input selects are 0 = AES IN 1, 1 = AES IN 2, 2 = REF 1, 3 = REF 2 (router inputs 5–8 grounded), not “0–3 = 110 Ω inputs, 4–6 = 75 Ω” as the 2008 map says.', 'AMS81.bdf; D6207A operational ctl info 3mar08.doc'),
  F_('Status bytes arrive bit-reversed, and only six are read.', 'shifter_out_48bit sends shift_data(0) first and read_data puts the first bit in the MSB. MIRROR() undoes this for the DIP; PA1[4..0] is crossed onto cntrl_status[11..15] so Pc lands right. The 0xA8 alignment byte is ALTERA6 (the document says ALTERA18), and only ALTERA1_read is defined, so the alignment is never checked.', 'shifter_out_48bit.vhd; altera.c/.h'),
  F_('The sample-rate detector cannot work.', 'SR_DETECT_192 (Working/v102 only) expects “500 Hz square wave from atmel” on its ref input, which is the ALTERA4 net from AVR PA3. port_init makes PA3 an input with pull-up and TIMER0_GENERATE_500HZ is not defined, so ref sits high and counter1 never clears. ALTERA3, where its det96/det192 flags go, is never read.', 'SR_DETECT_192.vhd; v100w.c port_init; CAN.c timer0_ovf_isr'),
  F_('NO_CAT is CAT1.', 'dolby.h defines CAT1 0 and NO_CAT 0, so the “no decoder” branches in auto-swap mode still send AES1 to the decoder input.', 'dolby.h; D6207A.c'),
  F_('A flipped AC-3 input is not reported in mode 3.', 'The manual says DashBoard shows an error if AES1 is PCM and AES2 is coded in “Dual AES Input”. SIGNAL_STATUS flags “AES Input 2 is a Dolby Signal” only for aes2_lock >= DOLBY_E, so AC-3 on AES2 reads OK.', 'Dashboard.c SIGNAL_STATUS'),
  F_('The Auto Swap control does nothing.', 'OID 0x301 is read/write, but ALTERA_TRANSLATE_UART0 recomputes auto_swap from mode on every pass.', 'Dashboard.c; D6207A.c'),
  F_('A copy-paste in PARAMETER_UPDATE.', 'The DIALNORM branch updates pgroup_sel1 instead of pdialnorm_enable (M6204 leftover). ALTERA_TRANSLATE_UART0 normally updates pdialnorm/pdownmix first, so DashBoard never gets an unsolicited dialnorm or downmix report when the DIP changes them; during a decoder reset the branch fires on every pass and blocks the others.', 'Dashboard.c PARAMETER_UPDATE'),
  F_('LED leftovers.', 'COM_ACTIVITY_LED and DOLBY3_LED are both PB6 (the schematic has only COM ACTIVITY there); the HD/SD and AES3–AES8 LED macros, format_alternate (never changes) and NO_LOCK_CHIRP/METADATA_CHIRP prototypes (never defined) come from the M6204A code that sits unlinked in the folder.', 'D6207A.h; v100w.c; M6204A.c'),
  F_('Pulling the module takes ≈5 s to show.', 'RESET_DOLBY counts DOLBY_LOCK_COUNTER (2000) passes before Dolby_card_installed = NO, then pulses reset_552 low for 200 passes, and repeats every ≈5.2 s while the module is out.', 'dolby.c'),
  F_('Version strings.', 'Software Rev is "1.0" + SOFTWARE_VERSION: V102 reports 1.02, but v201 sets SOFTWARE_VERSION 1 and reports 1.01. v201 is built only as the Ross DED-8420 (ROSS_VIDEO), which also drops the Website OID. The history sheet gives V102 the ALTERA V101 image although the working FPGA folder is named v102, and keeps a “SHARC” column; main() still says “read data from sharc via ALTERA”.', 'D6207A.h; common.h; D6207A SOFTWARE HISTORY.xls'),
  F_('Inherited names.', 'The ISS2 schematic title block reads “EMBEDDED AUDIO PROCESSOR”, the ISS2 pick-and-place report header says M6202A-ISS2, and v100w.c’s header says D6027A.', 'd6207-sch[Sheet1–6].pdf; D6207A-iss2-PNP-TOP.pnp; v100w.c'),
  F_('Output net names do not match the FPGA pins.', 'FPGA AES_OUT_2 drives board net AES_OUT5 → U9:B → BNC4, AES_OUT_5 drives AES_OUT3 → U7:A → BNC7, and so on. End to end, the outputs land where manual figure 2 says (pos 3 L,R … pos 8 input loop).', 'AMS81.qsf; D6207A.net; T6305.net'),
  F_('Power.', 'The manual specifies “+12V, 5 Watts Max”; the V2000 and V2001 test reports measured 11–14 W.', 'D6207A Manual.pdf; D6207A-V2000-03APR12.pdf'),
  F_('Mask colour.', 'ISS2 fabrication note 1 says “SOLDER MASK: GREEN”; the ISS1 photographs show a black board.', 'D6207A-ISS2.TSS; D6207A Iss1.jpg'),
  F_('The DTS-upmix FPGA does not match its note.', 'The history says “implemented JRTI SPI control block”, but the archived AMS81.bdf (Mar 2011) has no SPI block at the top level; the PB0/1/2_SPI pins are assigned in the .qsf of every version but wired in none. The non_audio_detector is removed, audio_i2s_to_msbaligned appears as a symbol with no HDL (the project cannot compile), SignalTap is switched on, and the detector copy holds for 32767 frames instead of 8191. Its AVR folder is empty.', 'VD6207A-dtsupmix/software/Altera/v101'),
  F_('The detector needs a gap.', 'It only accepts a burst preceded by two all-zero frames (x1..x4), and each of the two instances uses only its first channel (I2S_2 and PA2 unconnected).', 'non_audio_detector.vhd; AMS81.bdf inst44/inst45'),
  F_('Artwork '+YR(2026)+': card edge and rear panel now from the CorelDRAW files.', 'Card edge from '+SIM.src(ARTCDR.edge,'D6207A-card-edge.cdr')+' (2008-05-08); rear module from '+SIM.src(ARTCDR.rear,'D6207A - Rear Module Options.cdr')+' (openGear Rear Module Guide, 2012-01-16). The LEDs and connectors sit on the drawn boxes and holes. The edge drawing shows exactly the seven LEDs the code drives (LED1–LED7 on PB0–PB6).', ''),
  F_('The two rear drawings disagree.', 'The 2012 guide names the module T6305A and calls position 9 “Reserved” and position 7 “AES OUT (Lo/Ro, Lt, Rt)”; the 2007 sheet '+SIM.src(ARTCDR.t6305,'D6207A-T6305.cdr')+' calls 9 “GPI/O 1”, and in its Inkscape conversion only the two input BNCs are drawn (positions 3–10 carry numbers and labels only). Both are the same pins: AES4P/N (GPIO1) on the rear connector (T6305.net), which this model does not drive.', ''),
];
const ASSUME = [
  `Main-loop pass ≈${(C.LOOP_T*1e3).toFixed(1)} ms: ≈222 cycles per byte in ALTERA_read_write_data (altera.s) × 80 bytes plus reads, at 8 MHz.`,
  `EP1C12 configuration time ${Math.round(D.cfgT*1e3)} ms (slider), and unconfigured FPGA pins reading 1.`,
  'Slot-address loop ≈0.53 s (COUNTER_CONSTANT 100 × 2 × wait(3000)).',
  'CS8416 lock 10 ms; first burst half a period after a signal appears; the decoder needs two bursts after a reset or a new input.',
  'CAT552 ERR stays high while the module is fitted; a mapping fault clears when the module is reset.',
  'Frame REF inputs carry an AES reference when “present”. DashBoard stays in its 3-second initialising mode after boot.',
  'DIP switch 1 is at the left of SW1 and ON is up on the drawing. CAT552 behaviour with PCM and the output list per format come from the manual; DTS is muted.',
];
const SOURCES = [SW+'atmel/v102/ (v100w.c, D6207A.c/.h, dolby.c/.h, altera.c/.h, cs84xx.c, ADC.c, CAN.c, Dashboard.c, common.h, *.s)', SW+'atmel/v201/', SW+'Altera/Working/v102/ and v200/ (AMS81.qsf, AMS81.bdf, non_audio_detector.vhd, CATMAPERR.vhd, shift_in32.vhd, shifter_out_48bit.vhd, SR_DETECT_192.vhd, zero24_31.vhd, i2sx4_aes.vhd)', SW+'D6207A - #Software #VD6207A-dtsupmix/', SW+'D6207A SOFTWARE HISTORY.xls', ROOTP+'D6207A - #PCB/GERBERS/D6207A-ISS2.TOP/.TSM/.TSS → assets/d6207a-card-copper.png, d6207a-card-silk.png', ROOTP+'D6207A - #PCB/D6207A-iss2-PNP-TOP.pnp, d6207-schematic.zip (6 sheets), OBSOLETE/D6207A.net, .bom, .ECO', ROOTP+'D6207A - #Functional/D6207A-card-edge.cdr (Inkscape), D6207A-T6305.pdf, D6207A-FUNCTIONAL.pdf, D6207A.cdr', ROOTP+'D6207A - #Photo/', '#OPENGEAR #SERIES/D6207A - #Master #OPENGEAR/D6207A - #TESTREPORT/', '#OPENGEAR #SERIES/T6305 - #Master #OPENGEAR #TERMINATION/T6305 - #ENGINEERING/T6305 - #PCB/T6305.net', '#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6207A Manual.pdf (v1.01, 2008)', 'Artwork '+YR(2026)+': '+SIM.src(ARTCDR.edge,'D6207A-card-edge.cdr')+' → assets/d6207a-edge.svg; '+SIM.src(ARTCDR.rear,'D6207A - Rear Module Options.cdr')+' → assets/d6207a-rear-t6305a.svg'];
function viewFindings(m){ window.__d6207aActive=false;
  m.innerHTML = card('What the D6207A and its code are up to', `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:7px">${f}</li>`).join('')}</ol>`)
    + `<div class="grid2">${card('Assumptions (marked inferred on screen)', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`)}${card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${s}</li>`).join('')}</ul><p class="small muted">Plain text names only: no decoder-maker or Ross logos are reproduced. The openGear logo was removed from the silk layer.</p>`)}</div>`; }

/* ---------------------------------------------------------------------
   Register
   --------------------------------------------------------------------- */
SIM.register({
  id:'d6207a', product:'D6207A', name:'D6207A · openGear Dolby E / AC-3 decoder, Ross DED-8420 ('+YR(2008)+')', year:2008,
  folder:'#OPENGEAR #SERIES/D6207A - #Master #OPENGEAR', family:'openGear',
  summary:'The D6207A openGear decoder card (sold as Ross DED-8420): two AES inputs, an EP1C12 that finds SMPTE 337 bursts and routes them to a plug-in CAT552 decoder module, and an AT90CAN128 running the V102 or V201 firmware. The model runs main() pass by pass from power-up, with the real ISS2 board artwork, the DIP switch, DashBoard and the T6305 rear module.',
  highlights:['Card drawn from the ISS2 gerbers, with live LEDs, DIP switch and decoder module','Boot race: V102 reads the DIP before the FPGA is configured, V201 waits for CONF_DONE','FPGA burst detector, Reg 20 and status bytes traced from AMS81.bdf','PCM / AC-3 / Dolby E / DTS inputs, auto swap, LoRo/LtRt and decoder resets','DashBoard reports paced by CAN_TX_TIMER','24 findings, including the one-shot mapping-error watchdog and the DTS-upmix FPGA'],
  depth:'Full model', duration:1,
  stepUnits:[{label:'1 main-loop pass (≈2.6 ms)', period:()=>C.LOOP_T},{label:'1 ms (timer0)', period:()=>C.T0},{label:'1 AES frame', period:()=>1/cfgAt(U()).in1.fs},{label:'1 AC-3 burst (1536 frames)', period:()=>1536/cfgAt(U()).in1.fs},{label:'1 Dolby E burst (video frame)', period:()=>1/D.video},{label:'CAN_TX_TIMER (288 ms)', period:()=>C.TX_IDLE},{label:'100 ms', period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms'],[0.05,'50 ms'],[0.01,'10 ms (4 passes)'],[0.003,'3 ms (one pass)'],[0.0005,'500 µs'],[4/48000,'4 AES frames @48k']], defaultZoom:0,
  init(){ D.ver++; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial', render:viewTut},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram', render:m=>{ window.__d6207aActive=false; K.blockView(m,{blocks:BLOCKS, wires:WIRES, w:1000, h:340, sel:'fpga', side:card('Live routing', `<div id="br"></div>`)}); SIM.on('time',()=>{ const el=m.querySelector('#br'); if (el) el.innerHTML=statusHTML(U()); }); }},
    {id:'schematic', label:'Schematics', render:m=>{ window.__d6207aActive=false; K.schemView(m,{product:'D6207A ISS2', sheets:SHEETS, title:'Schematic set — REDRAWN from the ISS2 schematic PDFs, netlists, AMS81.qsf/.bdf (not the original CAD)', foot:'REDRAWN 2026|59 from d6207-sch[Sheet1–6].pdf, D6207A.net, AMS81.qsf and AMS81.bdf. Not the original P-CAD drawing.'}); }},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
