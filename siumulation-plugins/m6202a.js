/* =====================================================================
   M6202A — openGear MD-SDI embedded audio demultiplexer (Dolby-decoder ready), Ward-Beck Systems
   Release package "M6202A - #Master #OPENGEAR": M6202A-ISS3 Gerbers (2009-03-11). Firmware 1.0.0.3 (2009|42).
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   This folder holds only the Gerber zip. The firmware and drawings live in the sibling folder (linked):
   - M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Software/atmel/Obsolete/v103.zip and v102.zip
       (unpacked to read): v100w.c (boot DIP decision, REFRESH_LEDS), M6202A.c (PROCESS_DIP_SWITCHES,
       ALTERA_write group_data, PROCESS_AUDIO_FORMAT, PC_DOLBY_AC3 = 1 / PC_DOLBY_E = 28), M6202.h (LED ports,
       DOLBY_AC3 = 2, DOLBY_E = 3), Dashboard.c (menus, Parameter21–35, MESSAGE_CREATOR_PARAMETER_23_RESPONSE),
       dolby.c (Dolby_card_installed), common.h (WARD_BECK / ROSS_VIDEO builds)
   - …/M6202A/Software/M6202A SOFTWARE HISTORY.xls (1.0.0.0 – 1.0.0.4, OID sheet)
   - …/M6202A/Functional/M6202-card-edge.cdr, M6202A-T6301.cdr (Inkscape), M6202A-T6201.pdf, -T6204.pdf, -T6401.pdf
   - …/M6202 - #PNP #2016/ and siumulation-plugins/m6202.js (LED reference designators and port bits)
   - this folder: M6202A-ISS3 - #Gerbers.zip → assets/m6202a-pcb-top.png (TOP, TSM, TSS; openGear logo removed)
   Anything not in those files is marked "inferred" on screen. Format names are plain text; no third-party logos.
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
const SW='M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Software/';
const T=['—','PCM','Dolby E','Dolby AC-3'];               // content of an embedded AES pair (model)
const LOCKV={0:0,1:1,2:3,3:2};                              // model content → aesN_lock: PCM = LOCK (1), AC-3 = DOLBY_AC3 (2), E = DOLBY_E (3)
const PASS=2.2e-3, LAT=3*PASS;                              // AVR loop pass and detection latency (inferred)
const FMTS=['SD 525/59.94','SD 625/50','HD 1080i/59.94','HD 1080i/50','HD 720p/59.94'];
const D={ in:{conn:true, fmt:'HD 1080i/59.94', g:[[1,2],[1,1],[0,0],[0,0]]}, dip:[1,1,1,1,1,1,1,1], lat:{dipEn:true, dashEn:true}, sel:[0,1], swap:false,
  cat:true, alarm:true, build:'v103', rear:'T6301', slot:5, ev:-1, prev:null, boot:null, log:[], canQ:[] };
const act=K.actor(D);
/* DIP: SW n → ALTERA13 bit (n-1) after MIRROR; ON = 0 (pulled up). */
const dipByte=()=> D.dip.reduce((a,v,i)=>a|(v<<i),0);
function dipSel(){ const b=dipByte(); return [((b&2)?0:1)+((b&1)?0:2), ((b&8)?0:1)+((b&4)?0:2)]; }   // PROCESS_DIP_SWITCHES: BIT1 → +2 (audio1), BIT0 → +4; group_sel = audio >> 1
function effSel(){ return (D.lat.dipEn && !D.lat.dashEn)? dipSel() : D.sel; }
function compute(){ const f=H8.F[D.in.fmt], sel=effSel();
  if (!D.in.conn) return {lock:false, sel, aes:[0,0,0,0], fmt:f};
  const aes=[D.in.g[sel[0]][0], D.in.g[sel[0]][1], D.in.g[sel[1]][0], D.in.g[sel[1]][1]];
  return {lock:true, sel, aes, fmt:f}; }
function snapAt(t){ if (D.boot!==null && t>=D.boot && t<D.boot+0.55) return {lock:false, sel:effSel(), aes:[0,0,0,0], fmt:H8.F[D.in.fmt], boot:true};
  if (D.prev && t>=D.ev && t<D.ev+LAT) return D.prev; return compute(); }
function ledsAt(t){ const s=snapAt(t), k=s.fmt.kind; if (s.boot) return {sd:1,hd:1,err:1,a:[1,1,1,1],d:[0,0,0,0],com:0,cerr:0};
  const anyC=s.aes.some(v=>v>=2);
  return {sd:s.lock?1:0, hd:s.lock&&k!=='SD'?1:0, err:s.lock?0:1, a:s.aes.map(v=>v?1:0), d:s.aes.map(v=>anyC&&v>=2?1:0), com:D.canQ.some(q=>t>=q&&t<q+0.02)?1:0, cerr:0}; }
/* DashBoard status strings: v103 MESSAGE_CREATOR_PARAMETER_23_RESPONSE (p3 = AC3, p4 = E); v102 had them the other way round. */
function aesStr(v){ const l=LOCKV[v]; if (!l) return 'Unlocked'; if (l===1) return 'Locked - PCM'; const ac3=(l===2); return D.build==='v103'? (ac3?'Locked - Dolby AC3':'Locked - Dolby E') : (ac3?'Locked - Dolby E':'Locked - Dolby AC3'); }
function cardStatus(s){ if (!s.lock) return ['No SDI Input','err']; if (s.aes.every(v=>!v)) return ['No AES Audio Detected','warn']; if (!D.cat) return ['Dolby Decoder Error','warn']; return ['OK','ok']; }
function ev(fn){ D.prev=snapAt(SIM.t); fn(); D.ev=SIM.t; }
const A={
  plug(){ act(`${D.in.conn?'Unplug':'Plug in'} SDI IN (rear 1)`, tr=>{ ev(()=>{ D.in.conn=!D.in.conn; }); tr(`GS1574A EQ → GS1559 deserializer ${D.in.conn?'locks':'loses lock'} → FPGA (pod31) → ALTERA_read → sdi_format = ${D.in.conn?(H8.F[D.in.fmt].kind==='SD'?'SD':'HD'):'NO_LOCK'}`); tr(`REFRESH_LEDS: ${D.in.conn?'SD LED'+(H8.F[D.in.fmt].kind!=='SD'?' + HD LED':'')+' on':'ERR LED on'}; Card Status → “${cardStatus(compute())[0]}”`); }); },
  fmt(v){ act(`Source → ${v}`, tr=>{ ev(()=>{ D.in.fmt=v; }); const k=H8.F[v].kind; tr(`FPGA sd/hd demux select (Altera 15) → ${k==='SD'?'SD403 de-embedder (SMPTE 272M)':'HD group detector (SMPTE 299M)'}`); tr(`Parameter22 “SDI Input”: Unlocked / SD / HD — the v1 list has no rate detail`); }); },
  content(g,a,v){ act(`Embedded group ${g+1} AES${a+1} → ${T[v]}`, tr=>{ ev(()=>{ D.in.g[g][a]=+v; }); const s=compute();
    tr(`non_audio_detector.vhd: SMPTE 337 burst preamble Pa/Pb → data type ${v==3?'PC_DOLBY_AC3 (1)':v==2?'PC_DOLBY_E (28)':'none (PCM)'}`);
    tr(`PROCESS_AUDIO_FORMAT: aes${a+1}_led = ${v==3?'DOLBY_AC3 (2)':v==2?'DOLBY_E (3)':'PCM'}${(s.sel[0]===g||s.sel[1]===g)?'':' — this group is not selected, so no LED'}`);
    if (v>=2) tr(`DashBoard text: “${aesStr(+v)}”${D.build==='v102'?' — WRONG in v1.02: DOLBY_AC3 = 2 indexes the E string':''}`); }); },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ ev(()=>{ D.dip[i]=D.dip[i]?0:1; }); const b=dipByte();
    tr(`FPGA dip pins → ALTERA13; PROCESS_DIP_SWITCHES: ALTERA13 = MIRROR(ALTERA13) = 0x${b.toString(16).toUpperCase().padStart(2,'0')}`);
    if (i>=6) tr('SW7 (BIT6) and SW8 (BIT7) are read once in main() at power-up: dip_switch_enabled / dashboard_enabled. Reboot to apply.');
    else if (i>=4) tr('SW5/SW6: the POD31 mode, auto-swap and dolby_off_110 bits are commented out in v1.03 — no effect');
    else tr(D.lat.dipEn&&!D.lat.dashEn?`group_sel1 = ${dipSel()[0]+1}, group_sel2 = ${dipSel()[1]+1} → ALTERA_write group_data = audio1 | audio2<<3`:`Ignored: only used when dip_switch_enabled == YES && dashboard_enabled == NO (SW7 OFF, SW8 ON at boot); now ${D.lat.dipEn?'YES':'NO'} / ${D.lat.dashEn?'YES':'NO'}`); }); },
  dash(id,v){
    if (id==='reboot'){ act('DashBoard: Reboot', tr=>{ D.boot=SIM.t; const b=dipByte(); D.lat={dipEn:!!(b&64), dashEn:!!(b&128)}; tr('main(): ALTERA_RESET, ADC slot read, DOLBY_DECODER_STATUS, ALTERA13 = MIRROR(ALTERA13)'); tr(`(ALTERA13 & BIT6) → dip_switch_enabled = ${D.lat.dipEn?'YES':'NO'}; (ALTERA13 & BIT7) → dashboard_enabled = ${D.lat.dashEn?'YES':'NO'}`); tr(D.lat.dipEn?'DIP path: group selectors from SW1–SW4':'RESTORE_INFORMATION_EEPROM: group_sel1/2 = EEPROMread(12/13)'); }); return; }
    if (id==='upload'){ act('DashBoard: Upload…', tr=>tr('v1.0.0.3 has no bootloader (added in the unreleased 1.0.0.4): the card was programmed through ISP/JTAG')); return; }
    if (id==='mode'){ act('DashBoard: Mode (OID 3.2)', tr=>{ tr('Parameter32 is a WIDGET_TEXT_DISPLAY: the SET handler sets pod31_mode = 0 and replies “2 Group Demux (No Dolby Decoding)”; the four-mode code is commented out (history: “Took out Mode selection options”, 1.0.0.2).'); }); return; }
    if (id==='save'){ act('DashBoard: Save (OID 3.1)', tr=>{ tr('save_settings = YES → SAVE_INFORMATION_EEPROM: group_sel1 → 12, group_sel2 → 13'); D.canQ.push(SIM.t); }); return; }
    const nm={g1:'Group 1 Selector (OID 3.3)',g2:'Group 2 Selector (OID 3.4)',alarm:'Notify on Card Fault',swap:'Dolby Auto Swap (OID 3.5)'}[id];
    act(`DashBoard: ${nm} → ${id==='alarm'||id==='swap'?(v==='1'?'Enabled':'Disabled'):'Group '+(+v+1)}`, tr=>{ D.canQ.push(SIM.t);
      if (id==='g1'||id==='g2'){ const k=id==='g1'?0:1; if (D.lat.dashEn){ ev(()=>{ D.sel[k]=+v; }); tr(`dashboard_enabled == YES → group_sel${k+1} = ${v}; audio${k+1} = group_sel${k+1} << 1 → ALTERA_write group_data`); }
        else tr(`dashboard_enabled == NO → the reply echoes group_sel${k+1} = ${D.sel[k]}: DashBoard snaps back`);
        if (D.lat.dipEn&&!D.lat.dashEn) tr('…and PROCESS_DIP_SWITCHES overwrites the selectors from the DIP on its next pass'); }
      if (id==='alarm'){ D.alarm=v==='1'; tr(`smpte_alarm_enabled = ${D.alarm?'YES':'NO'} (v1.03 added psmpte_alarm_enabled so the change refreshes SIGNAL_STATUS)`); }
      if (id==='swap'){ D.swap=v==='1'; tr('auto_swap is set but nothing in the v1.03 loop reads it while pod31_mode = 0'); } }); },
  build(b){ act(`Firmware → ${b==='v103'?'1.0.0.3 (atmel v103)':'1.0.0.2 (atmel v102)'}`, tr=>{ D.build=b; tr(b==='v103'?'Dashboard.c: p3 = “Locked - Dolby AC3”, p4 = “Locked - Dolby E”; SOFTWARE_VERSION 3':'Dashboard.c v102: p3 = “Locked - Dolby E”, p4 = “Locked - Dolby AC3” — with DOLBY_AC3 = 2 and DOLBY_E = 3 the two are reported the wrong way round'); }); },
  cat(){ act(`${D.cat?'Remove':'Fit'} the Dolby decoder module (P5)`, tr=>{ D.cat=!D.cat; tr(`dolby.c DOLBY_DECODER_STATUS → Dolby_card_installed = ${D.cat?'YES':'NO'} → Parameter27 “Dolby Decoder” ${D.cat?'OK':'Error'}`); tr('In 1.0.0.3 the decoder is never routed (pod31_mode is forced to 0): the module only changes the status line'); }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; tr(RM[r].note); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; tr(`ADDRESS_TABLE → slot ${n}`); }); },
  reset(){ Object.assign(D,{in:{conn:true,fmt:'HD 1080i/59.94',g:[[1,2],[1,1],[0,0],[0,0]]},dip:[1,1,1,1,1,1,1,1],lat:{dipEn:true,dashEn:true},sel:[0,1],swap:false,cat:true,alarm:true,build:'v103',rear:'T6301',slot:5,ev:-1,prev:null,boot:null,log:[],canQ:[]}); SIM.refresh(); },
};
/* ---------- panels ---------- */
const RM={ T6301:{name:'T6301', sub:'single card (M6202A-T6301.cdr)', note:'T6301: SDI IN, SDI OUT, AES1–AES4 OUT on the left; positions 4 and 6 are drawn as AES5/AES6 OUT — outputs the M6202A does not have (they belong to the M6202AE).',
    cells:[[1,'SDI IN','in'],[2,'SDI OUT','sdo'],[3,'AES1 OUT',0],[4,'AES5 OUT','x'],[5,'AES2 OUT',1],[6,'AES6 OUT','x'],[7,'AES3 OUT',2],[8,'NOT USED','nc'],[9,'AES4 OUT',3],[10,'NOT USED','nc']]},
  T6201:{name:'T6201', sub:'DFR-8310 frame (M6202A-T6201.pdf)', note:'T6201: same layout as the T6301, for the 10-slot DFR-8310.',
    cells:[[1,'SDI IN','in'],[2,'SDI OUT','sdo'],[3,'AES OUT 1',0],[4,'AES OUT 5','x'],[5,'AES OUT 2',1],[6,'AES OUT 6','x'],[7,'AES OUT 3',2],[8,'NOT USED','nc'],[9,'AES OUT 4',3],[10,'NOT USED','nc']]},
  T6204:{name:'T6204', sub:'110 Ω, DFR-8310 (M6202A-T6204.pdf)', note:'T6204: balanced 110 Ω Phoenix outputs; AES1/2 = GRP 1, AES3/4 = GRP 2, AES5/6 and METADATA OUT drawn for the later AE.',
    cells:[[1,'SDI IN','in'],[2,'SDI OUT','sdo'],[3,'AES 1',0,'tb'],[4,'AES 5','x','tb'],[5,'AES 2',1,'tb'],[6,'AES 6','x','tb'],[7,'AES 3',2,'tb'],[8,'Reserved','nc'],[9,'AES 4',3,'tb'],[10,'METADATA OUT','x','tb']]},
  T6401:{name:'T6401', sub:'double card (M6202A-T6401.pdf)', note:'T6401: two M6202A cards; each gets SDI IN and AES1–4 OUT, no SDI OUT.', split:['M6202A-2','M6202A-1 (this card)'],
    cells:[[2,'SDI IN','in'],[1,'SDI IN',null],[4,'AES1 OUT',0],[3,'AES1 OUT',null],[6,'AES2 OUT',1],[5,'AES2 OUT',null],[8,'AES3 OUT',2],[7,'AES3 OUT',null],[10,'AES4 OUT',3],[9,'AES4 OUT',null]]} };
/* Artwork 2026|59: T6204, T6201, T6301 and T6401 from M6202 Rear Modules.cdr (2009-01-23), card edge from M6202-card-edge.cdr
   (2008-02-22, asset shared with m6202). Connector centres in pt on the drawing. */
const A2ART={edge:'#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Functional/M6202-card-edge.cdr',
  rear:'#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Functional/M6202 Rear Modules.cdr',
  guide:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6202A - rear module options.cdr',
  RM:{T6204:{src:'m6202a-rear-t6204.svg', vb:[100,26,216,254], bnc:[[204,84],[253,84]], br:16.2, tb:[201.4,250.5], ty:[122.4,159.1,195.5,232.0]},
      T6201:{src:'m6202a-rear-t6201.svg', vb:[316,26,216,254], cols:[413,461.3], rows:[70,112,155,197,239], br:16.2},
      T6301:{src:'m6202a-rear-t6301.svg', vb:[98,356,218,284], cols:[192,237], rows:[416,461,506,551,596], br:13.8},
      T6401:{src:'m6202a-rear-t6401.svg', vb:[316,356,216,284], cols:[402,447], rows:[416,461,506,551,596], br:13.8}},
  pos(rear,n,kd){ const A=this.RM[rear], i=n-1, col=i%2, row=Math.floor(i/2);
    if (A.cols) return {cx:A.cols[col], cy:A.rows[row], r:A.br};
    if (row===0) return {cx:A.bnc[col][0], cy:A.bnc[col][1], r:A.br};
    return {cx:A.tb[col], cy:A.ty[row-1], kind:'tb', w:20.5, h:36.6}; } };
function rearSVG(){ const r=RM[D.rear], s=snapAt(SIM.t), A=A2ART.RM[D.rear];
  const cells=r.cells.map(([n,l,o,kd])=>{ const kind=kd||'bnc';
    if (o==='nc') return {n,label:l}; if (o==='x') return {n,label:l,live:'off',title:'not driven by the M6202A'}; if (o===null) return {n,label:l,live:'off',other:true};
    if (o==='in') return {n,label:l,id:'in',conn:D.in.conn,live:D.in.conn?(s.lock?true:'warn'):undefined}; if (o==='sdo') return {n,label:l,live:s.lock?true:'err',title:'GS1528 reclocked loop'};
    const v=s.aes[o]; return {n,label:l,live:v?(v>=2?'warn':true):'err',title:v?T[v]:'no audio in the selected group'}; });
  const body=cells.map(c=>{ const P=A2ART.pos(D.rear,c.n); return artJack(Object.assign({}, P, {conn:c.conn, live:c.live, attrs:c.id?`class="og62-hot" data-jack="${c.id}"`:'',
      title:`${c.n}: ${c.label}${c.title?' — '+c.title:''}${c.other?' (the other card, M6202A-2)':''}${c.id?(c.conn?' (click to unplug)':' (click to plug in)'):''}`}))
      + (c.other?`<circle cx="${P.cx}" cy="${P.cy}" r="${P.r+0.4}" fill="rgba(80,84,88,.35)" pointer-events="none"/>`:''); }).join('');
  return artSVG({src:A.src, vb:A.vb, maxw:300, label:r.name+' rear module', fid:'m62aar', body})
    + `<div class="small muted" style="text-align:center">${r.name}${r.split?' · this card = M6202A-1 (right)':''}<br>${SIM.src(A2ART.rear,'M6202 Rear Modules.cdr')} (2009-01-23)</div>`; }
const EDGE=[['SD','g','sd'],['HD','g','hd'],['ERR','r','err'],['AES1','y','a0'],['AES2','y','a1'],['AES3','y','a2'],['AES4','y','a3'],['COM Activity','g','com'],['Error','r','cerr']];
function edgeSVG(t){ const L=ledsAt(t), on=k=>k[0]==='a'?L.a[+k[1]]:L[k], Y=[141.9,163.0,186.2,222.8,244.0,267.2,290.5,323.4,346.6];
  let body=EDGE.map(([n,c,k],i)=>artLed({x:179.9, y:Y[i]-6.1, w:5.3, h:12.2, on:on(k), col:K.LEDC[c], fid:'m62aag', title:`${n} LED (${on(k)?'lit':'off'})`})).join('');
  body+=[0,1,2,3].map(i=>artLed({x:187.6, y:Y[3+i]-4.5, w:4.2, h:9, on:L.d[i], col:'#ffd23a', fid:'m62aag', title:`DOLBY${i+1} LED (${['PB4','PB5','PB6','PG1'][i]}) — not on the card-edge drawing; placed from the PNP/ports`})).join('')
    + `<text x="189.7" y="214" font-size="5" text-anchor="middle" fill="#555">D</text>`;
  return artSVG({src:'m6202-edge.svg', vb:[60,126,156,318], maxw:230, label:'M6202A card edge', fid:'m62aag', body})
    + `<div class="small muted" style="text-align:center">${SIM.src(A2ART.edge,'M6202-card-edge.cdr')} (2008-02-22); D = Dolby LEDs from the PNP/ports</div>`; }
function dashHTML(){ const s=snapAt(SIM.t), cs=cardStatus(s), ro=!D.lat.dashEn;
  return K.dashHTML({key:'m6202a', title:`Slot ${D.slot}: M6202A`, alarm:cs[1]==='err'&&D.alarm, tree:[{name:'DFR-8320 frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: M6202A`,lvl:1,sel:true}],
    tabs:[{name:'Card Info',rows:[{type:'text',label:'Product',value:'M6202A',oid:'1.5'},{type:'text',label:'Name',value:'MD-SDI Embedded Audio Demultiplexer',oid:'1.7'},{type:'text',label:'Manufacturer',value:'Ward-Beck Systems',oid:'1.2'},{type:'text',label:'Software Rev',value:D.build==='v103'?'1.03':'1.02',oid:'1.11'},{type:'text',label:'Website',value:'www.ward-beck.com',oid:'1.4'}]},
      {name:'Card Status',rows:[{type:'status',label:'Card Status',value:cs[0],level:cs[1],oid:'2.1'},{type:'status',label:'SDI Input',value:s.lock?(s.fmt.kind==='SD'?'SD':'HD'):'Unlocked',level:s.lock?'ok':'err',oid:'2.2'},
        ...[0,1,2,3].map(i=>({type:'status',label:['Gr 1 Embd AES 1','Gr 1 Embd AES 2','Gr 2 Embd AES 1','Gr 2 Embd AES 2'][i],value:aesStr(s.aes[i]),level:s.aes[i]?'ok':'err',oid:'2.'+(3+i)})),
        {type:'status',label:'Dolby Decoder',value:D.cat?'OK':'Error',level:D.cat?'ok':'warn',oid:'2.7'}],note:'“Gr 1 / Gr 2” are the two selected groups, not embedded groups 1 and 2.'},
      {name:'Card Settings',rows:[{type:'button',id:'save',label:'Settings',text:'Save',oid:'3.1'},{type:'button',id:'mode',label:'Mode: 2 Group Demux (No Dolby Decoding)',text:'Change…',oid:'3.2'},
        {type:'combo',id:'g1',label:'Group 1 Selector',value:effSel()[0],options:[0,1,2,3].map(i=>[i,String(i+1)]),oid:'3.3'},{type:'combo',id:'g2',label:'Group 2 Selector',value:effSel()[1],options:[0,1,2,3].map(i=>[i,String(i+1)]),oid:'3.4'},
        {type:'combo',id:'swap',label:'Dolby Auto Swap',value:D.swap?1:0,options:[[0,'Disabled'],[1,'Enabled']],oid:'3.5'},{type:'combo',id:'alarm',label:'Notify on Card Fault',value:D.alarm?1:0,options:[[1,'Enabled'],[0,'Disabled']]}],note:ro?'dashboard_enabled = NO (SW8 ON at boot): settings echo back unchanged.':''}],
    footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload…'}], foot:'1.0.0.'+(D.build==='v103'?3:2)}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>SDI in</b><button data-x="plug">${D.in.conn?'Unplug':'Plug in'}</button>${sel('fmt',FMTS.map(f=>[f,f]),D.in.fmt)}
    rear ${sel('rear',Object.keys(RM).map(k=>[k,RM[k].name]),D.rear)} firmware ${sel('build',[['v103','1.0.0.3'],['v102','1.0.0.2']],D.build)} <button data-x="cat">${D.cat?'Remove':'Fit'} decoder module</button> <button data-x="reset">Defaults</button></div>
    <table class="kv small" style="margin-top:6px"><tr><th>Embedded</th><th>AES1</th><th>AES2</th></tr>${D.in.g.map((g,i)=>`<tr><td>Group ${i+1}</td>${g.map((v,a)=>`<td>${sel('c'+i+a,T.map((n,k)=>[k,n]),v)}</td>`).join('')}</tr>`).join('')}</table><div>${dipSVG()}</div>`; }
function dipSVG(){ let s=`<svg viewBox="0 0 560 104" style="width:100%;max-width:560px"><rect x="10" y="8" width="300" height="62" rx="4" fill="#c0392b"/><text x="16" y="21" font-size="10" fill="#fff">ON ▲  SW1 (DIP-8, read by the FPGA)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${v?'OFF':'ON'}</title><rect x="${x}" y="27" width="22" height="38" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?47:30}" width="16" height="15" fill="#222"/><text x="${x+11}" y="84" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  const ds=dipSel(); return s+`<text x="322" y="22" font-size="10.5" fill="var(--ink2)">1–2: group selector 1 · 3–4: group selector 2</text><text x="322" y="38" font-size="10.5" fill="var(--ink2)">5–6: unused in 1.0.0.3</text><text x="322" y="54" font-size="10.5" fill="var(--ink2)">7: DIP enable · 8: DashBoard enable (boot)</text><text x="10" y="100" font-size="10.5" fill="var(--accent)">DIP says groups ${ds[0]+1} / ${ds[1]+1} · ${D.lat.dipEn&&!D.lat.dashEn?'DIP in control':'DIP ignored (DashBoard / EEPROM)'} · in use: ${effSel()[0]+1} / ${effSel()[1]+1}</text></svg>`; }
function bindAll(r){ K.bind(r,{jack:{in:()=>A.plug()}, slot:n=>A.slot(n), dash:(id,v)=>A.dash(id,v)}); r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip)));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='plug')A.plug(); else if(x==='fmt')A.fmt(el.value); else if(x==='rear')A.rear(el.value); else if(x==='build')A.build(el.value); else if(x==='cat')A.cat(); else if(x==='reset')A.reset(); else if(x[0]==='c')A.content(+x[1],+x[2],+el.value); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
function pcbHTML(t){ const L=ledsAt(t);
  const leds=[['SD','g',L.sd,45,34],['HD','g',L.hd,45,44],['ERR','r',L.err,45,54],['AES1','y',L.a[0],45,74],['AES2','y',L.a[1],45,84],['AES3','y',L.a[2],45,94],['AES4','y',L.a[3],45,104],['Dolby1','y',L.d[0],97,74],['Dolby2','y',L.d[1],97,84],['Dolby3','y',L.d[2],97,94],['Dolby4','y',L.d[3],97,104],['COM','g',L.com,60,172],['COM error','r',L.cerr,60,182]].map(([n,c,on,x,y])=>({name:n,c,on,x,y}));
  return H8.pcbSVG({src:ASSET+'m6202a-pcb-top.png', w:1275, h:298, leds, marks:[{x:120,y:16,label:'front edge: 13 LEDs, DIP'},{x:790,y:16,label:'FPGA EP1C12 (pod31)'},{x:500,y:16,label:'AT90CAN128 '+inf('placement')},{x:1040,y:16,label:'P1 → rear module'},{x:350,y:290,label:'P5: Dolby decoder module socket'}], note:`M6202A-ISS3 Gerbers in this folder (12.74 × 2.97 in, 100 dpi). LED spots placed on the silk pads ${'(positions read from the render)'}`}); }
function lanes(){ const css=SIM.css, s=snapAt(SIM.t), f=s.fmt, ls=[];
  ls.push(H8.frameLane(f,!D.in.conn)); ls.push(H8.lineLane(f,!D.in.conn)); ls.push(H8.hancLane(f,D.in.g.filter(g=>g[0]||g[1]).length,!D.in.conn));
  [0,1,2,3].forEach(i=>{ const v=s.aes[i]; ls.push({label:`AES${i+1} out (${['Gr1 sel. AES1','Gr1 sel. AES2','Gr2 sel. AES1','Gr2 sel. AES2'][i]}) ${T[v]}`, h:20, draw(c,X,t0,t1,y,h){ const sv=snapAt((t0+t1)/2).aes[i]; if(!sv){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('no audio',X(t0)+6,y+h/2+3); return; }
    if (sv>=2){ const fr=1/f.fps; SIM.pulses(c,X,t0,t1,y,h,fr,0,fr*(sv===2?0.88:0.6),css('--warn'),sv===2?'Dolby E bursts (one per video frame, guard band)':'AC-3 bursts (1536 samples each)'); } else SIM.pulses(c,X,t0,t1,y,h,1/48000,0,0.35/48000,css('--accent'),'48 kHz PCM frames'); }}); });
  ls.push(H8.loopLane('AVR main loop (≈'+SIM.fmtDur(PASS)+' '+'inferred)', PASS));
  ls.push(K.boolLane('ERR LED', t=>ledsAt(t).err, '#c0392b')); ls.push(K.boolLane('Dolby LEDs (any)', t=>ledsAt(t).d.some(x=>x), '#ffd23a'));
  ls.push(K.canLane(K.canFrames({poll:0.5, phase:(D.slot*0.0173)%0.4, q:D.canQ})));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Source, DIP switch, rear module', `<div id="ctl"></div>`)}${card('DashBoard (redrawn)', `<div id="dash"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear module', `<div id="rear"></div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
    ${card('The board (ISS3 Gerbers in this folder)', `<div id="pcb"></div>`)}${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t, s=snapAt(t), sel=effSel();
    m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(); m.querySelector('#pcb').innerHTML=pcbHTML(t);
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    const gd=(sel[0]<<1)|((sel[1]<<1)<<3);
    m.querySelector('#insp').innerHTML=`<table class="kv"><tr><th>ALTERA13 (DIP)</th><td class="mono">0x${dipByte().toString(16).toUpperCase().padStart(2,'0')} after MIRROR</td></tr><tr><th>boot latch</th><td class="mono">dip_switch_enabled ${D.lat.dipEn?'YES':'NO'} · dashboard_enabled ${D.lat.dashEn?'YES':'NO'}</td></tr>
      <tr><th>group_data</th><td class="mono">audio1 | audio2&lt;&lt;3 = 0x${gd.toString(16).toUpperCase().padStart(2,'0')} (groups ${sel[0]+1} / ${sel[1]+1})</td></tr><tr><th>pod31_mode</th><td class="mono">0 — “2 Group Demux (No Dolby Decoding)”</td></tr><tr><th>aes1–4_lock</th><td class="mono">${s.aes.map(v=>LOCKV[v]).join(' · ')} (1 PCM, 2 AC3, 3 E)</td></tr></table>`;
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second of the M6202A', `<div id="lad"></div>`)}<div class="grid2">${card('Where each output comes from', `<div id="map"></div>`)}${card('Card edge', `<div id="edge"></div>`)}</div>`;
  const draw=()=>{ const s=snapAt(SIM.t), f=s.fmt, sel=effSel(), n=H8.spf(f);
    const rows=[['Video frames',f.fps.toFixed(3),SIM.fmtDur(1/f.fps),f.name],['Video lines',Math.round(H8.lineRate(f)).toLocaleString(),SIM.fmtDur(1/H8.lineRate(f)),'HANC carries the audio packets'],['Audio samples per channel','48 000',SIM.fmtDur(1/48000),n.toFixed(1)+' per frame'+(f.fps%1?' (1602/1601 five-frame sequence)':'')],
      ['Embedded channels de-embedded','4 × 48 000','','two selected groups × 2 AES pairs'],['Dolby E bursts (if present)',f.fps.toFixed(2),SIM.fmtDur(1/f.fps),'one per video frame (detected only)'],['AC-3 frames (if present)','31.25','32 ms','1536 samples'],['AVR passes','≈'+Math.round(1/PASS),SIM.fmtDur(PASS),inf('pass time')],['DashBoard polls','2','500 ms',inf('MFC poll rate')]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#map').innerHTML=`<table class="kv"><tr><th>Output</th><th>Source</th><th>Carries</th></tr>${[0,1,2,3].map(i=>`<tr><td>AES${i+1}</td><td>embedded group ${sel[i>>1]+1}, AES${(i&1)+1}</td><td>${T[s.aes[i]]}${s.aes[i]>=2?' (passed through coded — not decoded)':''}</td></tr>`).join('')}</table><p class="small muted">pod31_mode = 0 in 1.0.0.3, so Dolby streams leave the card still coded; the decoder module is only checked for presence.</p>`;
    m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); };
  SIM.on('time', draw);
}
const BLOCKS={ rin:{x:10,y:40,w:140,h:70,t:'SDI IN',s:['GS1574A EQ','GS1559 deserializer'],d:'Rear BNC 1 → Gennum EQ and deserializer (schematic part list in the M6202 README).'},
  fpga:{x:200,y:30,w:180,h:120,t:'EP1C12 “pod31”',s:['SD403 / HD group detect','non_audio_detector (337)','group_data from AVR','4 × AES out'],d:'The POD31 FPGA design: de-embeds the two selected groups, flags SMPTE 337 data types, drives four AES outputs.'},
  cat:{x:200,y:200,w:180,h:70,t:'P5 Dolby decoder',s:['CAT552 module socket'],d:'Present and status-checked (dolby.c), but not routed in 1.0.0.3: pod31_mode stays 0.',dim:true},
  aes:{x:430,y:30,w:150,h:80,t:'AES1–AES4 OUT',s:['75 Ω BNC or 110 Ω'],d:'Rear positions 3, 5, 7, 9 (T6301/T6201).'},
  loop:{x:430,y:130,w:150,h:60,t:'SDI OUT',s:['GS1528 driver'],d:'Reclocked loop output, rear position 2.'},
  mcu:{x:430,y:220,w:150,h:80,t:'AT90CAN128',s:['v1.03, 13 LEDs','DIP via ALTERA13'],d:'Reads the FPGA status bytes, sets group_data, reports to DashBoard.'},
  dash:{x:630,y:220,w:130,h:70,t:'DashBoard',s:['via MFC-8310 CAN'],d:'Card Info, Card Status (Gr 1/Gr 2 Embd AES), Card Settings.'} };
const WIRES=[['rin','fpga','10-bit'],['fpga','aes','AES'],['rin','loop',''],['fpga','cat','I²S (unused)'],['mcu','fpga','group_data'],['fpga','mcu','status'],['mcu','dash','CAN']];
const SHEETS=[{name:'1 · Controller', note:'Port bits from M6202.h (v103); LED reference designators from the M6202A PNP (see m6202.js).', svg:()=>K.chip(330,40,200,'AT90CAN128',[['PE2','SD LED (LED14)'],['PE5','HD LED (LED13)'],['PE6','ERR LED (LED12)'],['PB0–PB3','AES1–4 LED'],['PB4–PB6, PG1','DOLBY1–4 LED'],['PG0','COM ACTIVITY'],['PB7','COM ERROR']],[['PORTC','Altera 0–7 (SD shift)'],['PB1/PB2','CAT552 metadata'],['PB3–PB5','HD/SD bits'],['PB6/PB7','HD, sd/hd select'],['CAN','SN65HVD233']],'8 MHz · ICCAVR 7.15')},
  {name:'2 · group_data', note:'ALTERA_write (M6202A.c v103).', svg:()=>`<text x="40" y="60" font-size="13" fill="var(--ink)">group_data = audio1 | (audio2 &lt;&lt; 3) | (dolby_off_110 &lt;&lt; 6)</text><text x="40" y="90" font-size="12" fill="var(--ink2)">audio1 = group_sel1 &lt;&lt; 1   (DIP: SW2 ON → +2, SW1 ON → +4)</text><text x="40" y="115" font-size="12" fill="var(--ink2)">audio2 = group_sel2 &lt;&lt; 1   (DIP: SW4 ON → +2, SW3 ON → +4)</text><text x="40" y="140" font-size="12" fill="var(--ink2)">reset_data = RESET_VECTOR1 &lt;&lt; 5 | RESET_VECTOR → two bytes</text>`}];
const TUT={i:0};
const LESSONS=[
  {title:'Meet the M6202A', body:'<p>The M6202A takes an SD or HD SDI signal and pulls <b>two embedded audio groups</b> out to four AES outputs. It has a socket for a Dolby decoder module, but the released 1.0.0.3 firmware only <i>detects</i> Dolby streams. No manual survives in this folder; the steps follow the card-edge and rear-module drawings and the firmware.</p>', check:()=>true, auto:true},
  {title:'1 · Lock the input', body:'<p>Plug in SDI IN. SD and HD LEDs light for an HD signal (HD lights both).</p>', check:()=>snapAt(SIM.t).lock, hint:'Click SDI IN on the rear module.'},
  {title:'2 · Pick the groups', body:'<p>On DashBoard, set <b>Group 2 Selector</b> to 2. AES3/AES4 now carry embedded group 2.</p>', check:()=>effSel()[1]===1&&D.lat.dashEn, hint:'Card Settings → Group 2 Selector.'},
  {title:'3 · Spot the Dolby stream', body:'<p>Group 1 AES2 carries Dolby E: the <b>Dolby2</b> LED lights and DashBoard says “Locked - Dolby E”. Change it to <b>Dolby AC-3</b>.</p>', check:()=>D.in.g[effSel()[0]][1]===3, hint:'Embedded table → Group 1 AES2 → Dolby AC-3.'},
  {title:'4 · The 1.0.0.2 bug', body:'<p>Switch the firmware to <b>1.0.0.2</b>. The same AC-3 stream is now reported as “Dolby E” — the swap that 1.0.0.3 fixed (software history, 2009-02-13).</p>', check:()=>D.build==='v102'&&snapAt(SIM.t).aes.includes(3), hint:'firmware → 1.0.0.2.'},
  {title:'5 · Hand control to the DIP', body:'<p>Turn <b>SW7 OFF</b> (already) and <b>SW8 ON</b>, then <b>Reboot</b>. Now SW1–SW4 choose the groups and DashBoard edits bounce back.</p>', check:()=>D.lat.dipEn&&!D.lat.dashEn, hint:'Click DIP 8 so it reads ON, then Reboot.'},
  {title:'6 · Try the Mode', body:'<p>Press <b>Mode</b>: it is display-only and always “2 Group Demux (No Dolby Decoding)”.</p>', check:()=>D.log.some(l=>/Mode/.test(l.name)), hint:'Card Settings → Mode.'},
  {title:'Done', body:'<p>See <b>Findings</b> for the board-issue mismatch and the leftovers from the voice-over card.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — using the M6202A 1.0.0.3 (from the drawings and firmware)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2"><div>${card('Main loop (v100w.c, 1.0.0.3) — running step', `<div id="flow"></div>`)}${card('Boot decision', `<div id="boot"></div>`)}</div><div>${card('Dolby type → DashBoard text', `<div id="map"></div>`)}${card('DashBoard parameter map (Dashboard.c v103)', `<table class="kv small"><tr><td class="mono">2.1</td><td>Card Status: OK / No SDI Input / No AES Audio Detected / Dolby Decoder Error / <b>Voiceover Unlocked</b></td></tr><tr><td class="mono">2.2</td><td>SDI Input: Unlocked / SD / HD</td></tr><tr><td class="mono">2.3–2.6</td><td>Gr n Embd AES n (string replies)</td></tr><tr><td class="mono">2.7</td><td>Dolby Decoder OK / Error / NA</td></tr><tr><td class="mono">3.1</td><td>Save</td></tr><tr><td class="mono">3.2</td><td>Mode (text display)</td></tr><tr><td class="mono">3.3 / 3.4</td><td>Group 1 / 2 Selector</td></tr><tr><td class="mono">3.5</td><td>Dolby Auto Swap</td></tr></table>`)}</div></div>`;
  const draw=()=>{ const st=['WDR · ALTERA_read (status bytes)','PROCESS_CARRIER_DETECT · sdi_format','PROCESS_AUDIO1/2_DETECT · PROCESS_AUDIO_FORMAT (PC 1 / 28)','PROCESS_DIP_SWITCHES (ALTERA13 = MIRROR)','REFRESH_LEDS (AES / DOLBY LEDs)','ALTERA_write (group_data, reset_data)','CAN_FUNCTIONS (DashBoard)'];
    m.querySelector('#flow').innerHTML=H8.flowSVG(st,Math.floor(((SIM.t%PASS)/PASS)*st.length));
    const b=dipByte(); m.querySelector('#boot').innerHTML=`<table class="kv small"><tr><th>ALTERA13 at boot</th><td class="mono">0x${b.toString(16).toUpperCase().padStart(2,'0')}</td></tr><tr><th>BIT6 (SW7)</th><td>${b&64?'OFF → dip_switch_enabled = YES':'ON → NO'}</td></tr><tr><th>BIT7 (SW8)</th><td>${b&128?'OFF → dashboard_enabled = YES':'ON → NO'}</td></tr><tr><th>then</th><td>${b&64?'group_sel from DIP (only when DashBoard disabled)':'RESTORE_INFORMATION_EEPROM'}</td></tr></table>`;
    m.querySelector('#map').innerHTML=`<table class="kv small"><tr><th>Burst Pc</th><th>aesN_led</th><th>aesN_lock</th><th>1.0.0.2 text</th><th>1.0.0.3 text</th></tr><tr><td class="mono">1 (AC-3)</td><td class="mono">DOLBY_AC3</td><td class="mono">2</td><td style="color:var(--bad)">Locked - Dolby E</td><td>Locked - Dolby AC3</td></tr><tr><td class="mono">28 (E)</td><td class="mono">DOLBY_E</td><td class="mono">3</td><td style="color:var(--bad)">Locked - Dolby AC3</td><td>Locked - Dolby E</td></tr></table><p class="small muted">The fix swapped p3/p4 in MESSAGE_CREATOR_PARAMETER_23_RESPONSE. The static choice list in Parameter23_Message still reads Unlocked / PCM / Dolby E / Dolby AC3.</p>`; };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>T6401 sheet half drawn.</b> In the Inkscape conversion of M6202A-T6401.cdr (2006-12-04) only the two top BNCs are drawn, so the 2009 rear-module sheet is used.`,
  `<b>Artwork ${SIM.year(2026)}: rear modules and card edge now from the CorelDRAW files.</b> T6204, T6201, T6301 and T6401 from ${SIM.src(A2ART.rear,'M6202 Rear Modules.cdr')} (2009-01-23); edge from ${SIM.src(A2ART.edge,'M6202-card-edge.cdr')} (2008-02-22). The rear sheet groups the outputs as “1st SEL” (AES1/2, and AES5/6 on the right) and “2nd SEL” (AES3/4), i.e. the AE’s selectable groups, on every module including the T6401; the edge drawing has nine LEDs and no DOLBY 1–4. The 2012 ${SIM.src(A2ART.guide,'rear module guide')} offers only the T6301A (2 = “Not Connected”, 4/6 = AES OUT5/6) and the T6401A for the M6202A.`,
  `<b>A demuxer that never decodes.</b> In 1.0.0.3 every path sets pod31_mode = 0: PROCESS_DIP_SWITCHES has the mode lines commented out, and the Mode SET handler (OID 3.2, now a text display) forces “2 Group Demux (No Dolby Decoding)”. The P5 decoder module is only checked for presence (dolby.c → Parameter27).`,
  `<b>The AC-3/E swap fix was a string swap.</b> Software history 1.0.0.3: “Fixed issue with Dolby AC-3 and E indications reversed”. Diffing v102.zip against v103.zip shows the only functional change in Dashboard.c: p3/p4 swapped in MESSAGE_CREATOR_PARAMETER_23_RESPONSE (DOLBY_AC3 = 2, DOLBY_E = 3). The unused choice list in Parameter23_Message is still in the old order.`,
  `<b>Board issue mismatch.</b> The Gerbers in this folder are ISS3 (2009-03-11), but M6202.h in v103 says BOARD_ISSUE 2; 1.0.0.3 (2009-02-13) predates the ISS3 films.`,
  `<b>Voice-over leftovers.</b> Card Status (Parameter21) includes “Voiceover Unlocked”, and the software-history OID sheet lists Dim Level and Voiceover Active — copied from the M6206A.`,
  `<b>Name on OID 1.7.</b> The product description “MD-SDI Embedded Audio Demultiplexer” is sent as OID 1.7, which the M6203A and others use for Board Rev.`,
  `<b>OEM build switch.</b> common.h selects WARD_BECK or ROSS_VIDEO; the OEM build changes only the manufacturer string and drops the website from Card Info.`,
  `<b>Rear drawings ahead of the card.</b> M6202A-T6301.cdr and -T6204.pdf label AES5/AES6 OUT and METADATA OUT — outputs that only the M6202AE (firmware 2.x) drives.`,
  `<b>Empty skeletons.</b> “M6202A - #Manual/” and “M6202A - #Engineering #PCB #GERBER #TIM/” hold no files; the Gerber zip is the whole release package.`];
const ASSUME=['AVR pass ≈ '+SIM.fmtDur(PASS)+' and three-pass detection latency '+inf('no timer in the loop'),'LED pad positions on the PCB image read from the render '+inf('silk is illegible at 100 dpi'),'Dolby burst drawing (E once per frame, AC-3 1536-sample frames) '+inf('SMPTE 337/340 general knowledge'),'GS1574A/GS1559 part names from the family README (no ISS3 netlist in this folder)'];
const SOURCES=['#OPENGEAR #SERIES/M6202A - #Master #OPENGEAR/M6202A-ISS3 - #Gerbers.zip (TOP, TSM, TSS; 2009-03-11)',SW+'atmel/Obsolete/v103.zip, v102.zip (v100w.c, M6202A.c, M6202.h, Dashboard.c, dolby.c, common.h) — firmware, sibling folder, linked',SW+'M6202A SOFTWARE HISTORY.xls','M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Functional/M6202-card-edge.cdr, M6202A-T6301.cdr, M6202A-T6201.pdf, M6202A-T6204.pdf, M6202A-T6401.pdf','siumulation-plugins/m6202.js (LED designators and ports from the M6202A PNP)','Artwork '+SIM.year(2026)+': '+SIM.src(A2ART.rear,'M6202 Rear Modules.cdr')+' → assets/m6202a-rear-t6204/t6201/t6301/t6401.svg; '+SIM.src(A2ART.edge,'M6202-card-edge.cdr')+' → assets/m6202-edge.svg (shared with m6202)'];
SIM.register({ id:'m6202a',
  footnotes:[{text:'Rear and card-edge artwork from the CorelDRAW files (2026|59): M6202 Rear Modules.cdr (2009-01-23: T6204, T6201, T6301, T6401) and M6202-card-edge.cdr (2008-02-22).', src:'#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Functional/M6202 Rear Modules.cdr'},
    {text:'The rear sheet groups outputs as “1st SEL” and “2nd SEL” on every module, the selectable groups of the later M6202AE.', src:'#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Functional/M6202 Rear Modules.cdr'},
    {text:'The single-card drawings label positions 4 and 6 AES5/AES6 OUT, outputs only the M6202AE drives.', src:'#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Functional/M6202A-T6301.cdr'},
    {text:'The card-edge drawing has nine LEDs and no DOLBY 1–4, although the PNP places four more yellow LEDs.', src:'#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Functional/M6202-card-edge.cdr'},
    {text:'The 2012 guide offers only the T6301A (position 2 “Not Connected”) and T6401A for the M6202A.', src:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6202A - rear module options.cdr'},
    {text:'In the Inkscape conversion of M6202A-T6401.cdr (2006-12-04) only the two top BNCs are drawn.', src:'#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Functional/M6202A-T6401.cdr'}],
   product:'M6202A', name:'M6202A · MD-SDI embedded audio demultiplexer, openGear: release package (2008|41)', year:2008,
  folder:'#OPENGEAR #SERIES/M6202A - #Master #OPENGEAR', family:'openGear',
  summary:'The M6202A de-embeds two selected audio groups from SD/HD-SDI to four AES outputs and flags embedded Dolby E / AC-3. This release folder holds only the ISS3 Gerbers; the model runs firmware 1.0.0.3 (and 1.0.0.2 for comparison) from the M6202 engineering folder.',
  highlights:['Board drawn from the ISS3 Gerbers in this folder','Group selection by DIP or DashBoard, latched at boot','The 1.0.0.2 Dolby E / AC-3 swap, side by side','Why the Dolby decoder socket does nothing in 1.0.0.3'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 audio sample',period:()=>1/48000},{label:'1 video line',period:()=>1/H8.lineRate(H8.F[D.in.fmt])},{label:'1 frame',period:()=>1/H8.F[D.in.fmt].fps},{label:'1 AVR pass',period:()=>PASS}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.04,'40 ms'],[0.005,'5 ms'],[0.0005,'500 µs'],[0.0001,'100 µs']], defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:780,h:320,sel:'fpga'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'M6202A',sheets:SHEETS,foot:'REDRAWN from M6202.h / M6202A.c names — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:m=>H8.findingsView(m,'What the M6202A (and its folder) are up to',FINDINGS,ASSUME,SOURCES)}],
});
})();
