/* =====================================================================
   M6202AE — openGear MD-SDI embedded audio demultiplexer with Dolby E / AC-3 decoding (Ward-Beck Systems)
   Release package "M6202AE - #Master #OPENGEAR": the scanned v2.02 comprehensive test outline (2010-03-03).
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   This folder holds only the test report. Firmware, manual and drawings live in the sibling folder (linked):
   - M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/Software/atmel/v202/ (M6202AE 2.02): M6202.h
       (BOARD_ISSUE 2, SOFTWARE_VERSION 2), Dashboard.c (status strings, downmix, metadata), wbs_ztcpack.txt
       (bin/m6202ae_v2_02.bin); M6202AE SOFTWARE HISTORY.xls
   - …/M6202A/Manual/v2000/M6202AE Manual .doc (LED table, DIP SW2–SW6, Table 2 output channel assignment, Table 3)
   - …/M6202A/Functional/M6202AE Rear Modules.cdr (T6204 / T6304 / T6306, Inkscape), M6202-card-edge.cdr
   - this folder: M6202AE - #TESTREPORT/M6202AE-V202-03MAR10.pdf (12 scanned pages, read by eye)
   The deep firmware model of v2.02 is in m6202.js; this plugin models the released card against its test outline.
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
const inf=K.inf, card=K.card;
const SW='M6202 - #Master #OPENGEAR/M6202 - #Engineering/M6202A/';
const T=['—','PCM','Dolby E','Dolby Digital'], TC=['-','P','E','D'];
/* Table 2 (M6202AE manual): decoder output channel assignment per programme config, channels 1–8 on AES1–AES4 */
const CFG={ '5.1+2':['1L','1R','1C','1LFE','1Ls','1Rs','2L','2R'], '5.1+1+1':['1L','1R','1C','1LFE','1Ls','1Rs','2C','3C'], '4+4':['1L','1R','1C','1S','2C','2S','2L','2R'],
  '2+2+2+2':['1L','1R','3L','3R','4L','4R','2L','2R'], '1+1+1+1+1+1+1+1':['1C','2C','3C','4C','5C','6C','7C','8C'], '5.1':['1L','1R','1C','1LFE','1Ls','1Rs','none','none'],
  '3/2L (Dolby Digital)':['1L','1R','1C','1LFE','1Ls','1Rs','none','none'], '2/0 (Dolby Digital)':['1L','1R','none','none','none','none','none','none'], 'PCM':['1L','1R','none','none','none','none','none','none'] };
const REACH={SD:280, HD:115, '3G':0};             // test report: HD “Min 200 m” measured 115 m; SD “Min 350 m” (struck) measured 280 m
const SPEC={SD:350, HD:200};
const FMTS=['SD 525/59.94','SD 625/50','HD 1080i/59.94','HD 1080i/50','HD 720p/59.94','HD 1080p/23.98'];
const D={ in:{conn:true, fmt:'HD 1080i/59.94', len:50, g:[[1,2],[1,1],[1,0],[0,0]], cfg:'5.1+2', tone:false},
  dip:[1,1,1,1,1,1,1,1], cat:true, downmix:'LtRt', dialnorm:false, rear:'T6306', slot:6, alarm:true, run:false, ev:-1, prev:null, log:[], canQ:[] };
const act=K.actor(D);
const on=i=>D.dip[i]===0;                                   // ON = closed = 0
const grpSel=()=> (on(4)?2:0)+(on(5)?1:0);                  // SW5 MSB, SW6 LSB → group 1–4
const decEn=()=> on(2);                                     // SW3 Dolby Enable
const decAes=()=> on(3)?1:0;                                // SW4 ON = AES2
const kind=()=>H8.F[D.in.fmt].kind;
const locked=()=> D.in.conn && D.in.len<=REACH[kind()];
function decIn(){ return D.in.g[grpSel()][decAes()]; }
function decoding(){ return locked() && decEn() && D.cat && decIn()>=2; }
function outs(){ const L=locked(); if (!L) return Array.from({length:6},(_,i)=>({n:i+1,src:'muted (no SDI)',ch:['',''],ok:false}));
  const g=grpSel(), raw=(gg,a)=>({src:`embedded group ${gg+1}, AES${a+1}`, ch:[T[D.in.g[gg][a]],T[D.in.g[gg][a]]], ok:D.in.g[gg][a]>0, type:D.in.g[gg][a]});
  let o;
  if (decEn() && D.cat){ const cf=CFG[decIn()===1?'PCM':D.in.cfg], dec=decIn()>=2;
    o=[0,1,2,3].map(k=>({src:dec?'Dolby decoder ch '+(2*k+1)+'/'+(2*k+2):(k===0?'decoder PCM pass':'none'), ch:[cf[2*k],cf[2*k+1]], ok:cf[2*k]!=='none'||cf[2*k+1]!=='none', type:1}));
    if (on(1)) o[3]={src:`decoder ${D.downmix==='LoRo'?'Lo/Ro':'Lt/Rt'} downmix of programme 1 (SW2 ON)`, ch:[D.downmix==='LoRo'?'Lo':'Lt',D.downmix==='LoRo'?'Ro':'Rt'], ok:true, type:1}; }
  else o=[raw(0,0),raw(0,1),raw(1,0),raw(1,1)];
  o.push(raw(g,0)); o.push(raw(g,1));
  return o.map((x,i)=>Object.assign({n:i+1},x)); }
/* Downmix of the test signal (E5.1, every channel −20 dBFS, 400 Hz, in phase).
   Lt = L + c·C − s·(Ls+Rs), Rt = R + c·C + s·(Ls+Rs) (unnormalised); Lo = k·(L + c·C + s·Ls) with k = 0.707/(1+c+s). c = s = −3 dB. */
function downmixLevels(){ const c=Math.SQRT1_2, s=Math.SQRT1_2, a=Math.pow(10,-20/20), dB=v=>20*Math.log10(Math.max(1e-9,Math.abs(v)));
  const lt=a*(1+c-2*s), rt=a*(1+c+2*s), k=Math.SQRT1_2/(1+c+s), lo=a*k*(1+c+s);
  return {lt:dB(lt), rt:Math.min(0,dB(rt)), lo:dB(lo), ro:dB(lo)}; }
function ledsAt(t){ const L=locked(), k=kind(); const g=D.in.g.map(x=>x[0]||x[1]?1:0);
  return {sd:L?1:0, hd:L&&k!=='SD'?1:0, err:L?0:1, a:g.map(x=>L?x:0), com:D.canQ.some(q=>t>=q&&t<q+0.02)?1:0, cerr:0}; }
function embStr(){ return D.in.g.map(g=>g.map(v=>TC[v]+TC[v]).join('')).join(' '); }
const A={
  plug(){ act(`${D.in.conn?'Unplug':'Plug in'} SDI IN (rear 1)`, tr=>{ D.in.conn=!D.in.conn; D.canQ.push(SIM.t); tr(`GS1574A / GS1559 ${locked()?'lock':'unlock'} → sdi_format → Card State ${locked()?'OK':'“SDI Unlocked” (red)'}`); tr(locked()?'AES1–6 follow Table '+(decEn()&&D.cat?'2':'3'):'All six AES outputs mute; metadata output idle'); }); },
  fmt(v){ act(`Source → ${v}`, tr=>{ D.in.fmt=v; tr(`Reach for ${kind()} on the test bench: ${REACH[kind()]} m (cable now ${D.in.len} m) → ${locked()?'locked':'NOT locked'}`); }); },
  len(v){ act(`SDI cable → ${v} m`, tr=>{ D.in.len=+v; tr(`Test outline “Max cable length HD/SD using Delco 394167 cable”: HD spec min 200 m, measured 115 m; SD spec min 350 m (struck through), measured 280 m`); tr(locked()?'Locked':'Beyond the measured reach: SDI Unlocked'); }); },
  content(g,a,v){ act(`Embedded group ${g+1} AES${a+1} → ${T[v]}`, tr=>{ D.in.g[g][a]=+v; tr(`Embedded Audio status string → “${embStr()}” (- none, P PCM, E Dolby E, D Dolby Digital, C other)`); if (g===grpSel()&&a===decAes()) tr(decoding()?'Decoder input is coded: CAT552 decodes, AES1–AES4 follow Table 2':'Decoder input is PCM: AES1 = 1L/1R, the rest “none” (Table 2, PCM row)'); }); },
  cfg(v){ act(`Dolby programme config → ${v}`, tr=>{ D.in.cfg=v; tr(`Table 2: ${CFG[v].map((c,i)=>'ch'+(i+1)+' '+c).join(', ')}`); }); },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1;
    const what=['Reserved','Program 7/8 vs Lt/Rt downmix on AES4','Dolby Enable','Dolby Decoder Input AES selector','AES5/AES6 + decoder group MSB','AES5/AES6 + decoder group LSB','Reserved','Reserved'][i];
    tr(`${what} (manual DIP table) → now: decoder ${decEn()?'enabled':'disabled'}, input group ${grpSel()+1} AES${decAes()+1}, AES4 = ${on(1)?'downmix':'channels 7/8'}`); tr('v2.02 routes from the DIP pins inside the FPGA; DashBoard only reports it (see m6202.js)'); }); },
  cat(){ act(`${D.cat?'Remove':'Fit'} the Dolby decoder module`, tr=>{ D.cat=!D.cat; tr(`Dolby Decoder Status → ${D.cat?(decEn()?'Ok':'N/A'):'Error'} (manual: red “Error” = not installed)`); tr(D.cat?'':'Test outline “Dolby card 1 · Test functionality of card with Dolby card removed … Dolby Disabled functionality of card”: outputs fall back to Table 3'); }); },
  dash(id,v){ if (id==='reboot'){ act('DashBoard: Reboot', tr=>{ tr('Bootloader V1.00 (test report) → application v2.02 → DataSafe restores settings'); }); return; }
    if (id==='upload'){ act('DashBoard: Upload…', tr=>tr('M6202AE 2.0.0.1 added the bootloader: bin/m6202ae_v2_02.bin through the frame (manual still says “Reserved”)')); return; }
    act(`DashBoard: ${id==='downmix'?'Downmix → '+v:id==='dialnorm'?'Dialnorm → '+(v==='1'?'Enabled':'Disabled'):'Notify on Card Fault → '+(v==='1'?'Enabled':'Disabled')}`, tr=>{ D.canQ.push(SIM.t);
      if (id==='downmix'){ D.downmix=v; tr(`Dashboard.c v202 offers “LtRt” and “LoRo”; the manual only describes Lt/Rt on AES4 (SW2 ON)`); }
      if (id==='dialnorm'){ D.dialnorm=v==='1'; tr('Dialnorm applied by the decoder module'); }
      if (id==='alarm'){ D.alarm=v==='1'; tr('smpte_alarm_enabled'); } }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; tr(RM[r].note); }); },
  run(){ act('Run the V202 test outline against the model', tr=>{ D.run=true; const r=TESTS.flatMap(s=>s.items).filter(i=>i.check).map(i=>i.check()); tr(`${r.filter(x=>x===true).length} pass, ${r.filter(x=>x===false).length} fail, ${r.filter(x=>x!==true&&x!==false).length} informational`); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; }); },
  reset(){ Object.assign(D,{in:{conn:true,fmt:'HD 1080i/59.94',len:50,g:[[1,2],[1,1],[1,0],[0,0]],cfg:'5.1+2',tone:false},dip:[1,1,1,1,1,1,1,1],cat:true,downmix:'LtRt',dialnorm:false,rear:'T6306',slot:6,alarm:true,run:false,log:[],canQ:[]}); SIM.refresh(); },
};
/* ---------- test outline (scanned report, ticks as written) ---------- */
const TESTS=[
  {h:'Header', items:[{t:'Hardware M6202AE · Firmware V202 · PCB ISS.3 · Bootloader V1.00 · 1 h comprehensive test · 3 Mar 2010 · customer: a Taiwanese systems integrator',mark:'y'}]},
  {h:'Basics', items:[{t:'1 Check that all LEDs function correctly',mark:'y',check:()=>locked()?true:'unplugged'},{t:'2 Check all ins and outs',mark:'y',check:()=>outs().every(o=>o.ok)||'some outputs silent (see map)'},{t:'3 Check slot address on all slots',mark:'y'},{t:'4 Repetitive initialization — DashBoard info, output quality, mapping',mark:'y'},{t:'5 Multiple cards in frame, no loss of DashBoard comms',mark:'y'},{t:'6 48 h soak · 7 ICs not excessively hot',mark:'y'},{t:'10 Power measurements, 11 hardware changes',mark:''}]},
  {h:'AES audio output', items:[{t:'2 Audio quality: waveform, amplitude/frequency, active bits, no error flags, artifacts',mark:'y'},{t:'3 Output voltage 1 V p-p (75 Ω) / 3–10 V p-p (110 Ω)',mark:'y',check:()=>D.rear==='T6306'?'1 V p-p 75 Ω':'110 Ω balanced'},{t:'5 Sample rates 32–192 kHz',mark:''}]},
  {h:'AES input / Analog sections', items:[{t:'Not applicable to this card (template sections)',mark:'na'}]},
  {h:'Alarm functionality', items:[{t:'1 Alarm off: no alarm when faulted · 2 Alarm on: alarm when faulted',mark:'y',check:()=>D.alarm?(locked()?true:'card fault raised'):'alarm disabled'}]},
  {h:'Bootloader · DashBoard · DataSafe · DIP', items:[{t:'Atmel and FPGA configured with no errors (DSP: n/a)',mark:'y'},{t:'Card Info, General Tasks, menus, refresh on pull',mark:'y'},{t:'Settings restored after reboot with DataSafe',mark:'y'},{t:'Functionality of all DIP switches',mark:'y'}]},
  {h:'Dolby card', items:[{t:'1 Card with Dolby card removed: DashBoard status, Dolby-disabled function',mark:'y',check:()=>D.cat?'module fitted':(outs()[0].src.includes('embedded')||!locked())},{t:'2 Dolby detect LEDs',mark:'y'},{t:'3 Pull input while decoding: no mapping errors',mark:'y'},{t:'4 Dolby enabled, PCM only: routing (AES, L/R)',mark:'y',check:()=>decIn()===1&&decEn()?outs()[0].ch.join('/')==='1L/1R':'set decoder input to PCM'},{t:'5 Transition Dolby → PCM: artifacts, mapping',mark:'y'}]},
  {h:'Downmix from Dolby card (E5.1, −20 dBFS, 400 Hz in)', items:[{t:'1 Lt/Rt −27 / −10 dBFS, 0° phase',mark:'y',check:()=>{ const d=downmixLevels(); return `model ${d.lt.toFixed(1)} / ${d.rt.toFixed(1)} dBFS`; }},{t:'1 Lo/Ro −23 / −23 dBFS',mark:'',check:()=>{ const d=downmixLevels(); return `model ${d.lo.toFixed(1)} / ${d.ro.toFixed(1)} dBFS`; }},{t:'3 Repetitive initialization: downmix quality',mark:'y'}]},
  {h:'Downmix without Dolby card', items:[{t:'Lt/Rt −30 / −10 dBFS',mark:'na'}]},
  {h:'SDI output', items:[{t:'HD and SD: eye, jitter, picture, vector, 800 mV nominal',mark:'y'},{t:'Monitor video status 1 h on a waveform monitor',mark:''}]},
  {h:'SDI input', items:[{t:'Pull input: mapping/quality of all outputs, SD and HD',mark:'y'},{t:'Try all formats HD and SD',mark:'y'},{t:'Max cable HD: Min 200 m',mark:'y',note:'handwritten: 115 m',check:()=>`model reach ${REACH.HD} m (< spec ${SPEC.HD} m)`},{t:'Max cable SD: Min 350 m (struck)',mark:'y',note:'handwritten: 280 m',check:()=>`model reach ${REACH.SD} m (< ${SPEC.SD} m)`}]},
  {h:'SRC converter', items:[{t:'PCM 17–96 kHz converted to 48 kHz; Dolby through SRC not corrupted',mark:'na'}]},
  {h:'Metadata output', items:[{t:'1 Validate metadata correctness · 2 pinout configuration',mark:'y',check:()=>decoding()&&decIn()===2?'Dolby E metadata streaming':'no Dolby E at the decoder'}]}];
/* ---------- panels ---------- */
const RM={ T6204:{name:'T6204', sub:'110 Ω, DFR-8310 (M6202AE Rear Modules.cdr)', note:'T6204: SDI IN/OUT on BNC, AES1–AES6 and METADATA OUT on 3-pin Phoenix (110 Ω).', tb:true},
  T6304:{name:'T6304', sub:'110 Ω, DFR-8320', note:'T6304: as the T6204 for the 20-slot DFR-8320.', tb:true},
  T6306:{name:'T6306', sub:'75 Ω, DFR-8320', note:'T6306: AES1–AES6 on 75 Ω BNC, METADATA OUT on Phoenix (position 10).', tb:false} };
function rearSVG(){ const r=RM[D.rear], o=outs(), L=locked(), kd=r.tb?'tb':'bnc';
  const cells=[{n:1,label:'SDI IN',id:'in',conn:D.in.conn,live:D.in.conn?(L?true:'warn'):undefined},{n:2,label:'SDI OUT',live:L?true:'err'},
    {n:3,label:'AES 1',kind:kd,live:o[0].ok?true:'err'},{n:4,label:'AES 5',kind:kd,live:o[4].ok?true:'err'},{n:5,label:'AES 2',kind:kd,live:o[1].ok?true:'err'},{n:6,label:'AES 6',kind:kd,live:o[5].ok?true:'err'},
    {n:7,label:'AES 3',kind:kd,live:o[2].ok?true:'err'},{n:8,label:'NOT USED',kind:'nc'},{n:9,label:'AES 4',kind:kd,live:o[3].ok?true:'err'},{n:10,label:'METADATA OUT',kind:'tb',live:decoding()&&decIn()===2?true:'off'}];
  return K.rearSVG({name:r.name, sub:r.sub, id:'AN_BMID / AN_BMID2', cells}); }
function edgeSVG(t){ const L=ledsAt(t);
  return K.edgeSVG({label:'M6202AE', maxw:260, note:'M6202-card-edge.cdr · manual LED table', leds:[['SD','g',L.sd],['HD','g',L.hd],['ERR','r',L.err],['AES1','y',L.a[0]],['AES2','y',L.a[1]],['AES3','y',L.a[2]],['AES4','y',L.a[3]],['Com Activity','g',L.com],['Error','r',0]].map(([n,c,o],i)=>({name:n,c,on:o,y:[50,80,110,160,190,220,250,320,350][i],title:i>=3&&i<=6?'group '+(i-2)+' present':''}))}); }
function dashHTML(){ const L=locked(), o=outs(), f=H8.F[D.in.fmt], ds=D.cat?(decEn()?'Ok':'N/A'):'Error';
  return K.dashHTML({key:'m6202ae', title:`Slot ${D.slot}: M6202AE`, alarm:!L&&D.alarm, tree:[{name:'DFR-8320 frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: M6202AE`,lvl:1,sel:true}],
    tabs:[{name:'Card Info',rows:[{type:'text',label:'Product',value:'M6202AE'},{type:'text',label:'Name',value:'MD-SDI Embedded Audio Demultiplexer w/ Dolby Decoding'},{type:'text',label:'Manufacturer',value:'Ward-Beck Systems Ltd.'},{type:'text',label:'Software Rev',value:'2.02'},{type:'text',label:'Website',value:'www.ward-beck.com'}]},
      {name:'Status',rows:[{type:'sec',label:'Inputs'},{type:'status',label:'SDI',value:L?f.name:'Unlocked',level:L?'ok':'err'},{type:'text',label:'Embedded Audio',value:L?embStr():'---- ---- ---- ----'},{type:'status',label:'Dolby Decoder Status',value:ds,level:ds==='Error'?'err':'ok'},
        {type:'sec',label:'Outputs'},...o.map(x=>({type:'status',label:'AES'+x.n,value:x.ok?x.ch.join(' / '):'—',level:x.ok?'ok':'err'})),
        {type:'sec',label:'Settings'},{type:'text',label:'Dolby Decoding',value:decEn()?'Enabled':'Disabled'},{type:'text',label:'Dolby Decoder Input',value:`Emb. Audio Grp ${grpSel()+1} - AES${decAes()+1}`},{type:'text',label:'Group 3 Output Selector (AES5/AES6)',value:`Emb. Audio Grp ${grpSel()+1}`},{type:'text',label:'Secondary Audio Selector (AES4)',value:on(1)?'Dolby Decoder Main Program Downmix':'Dolby Decoder Ch7/8'}]},
      {name:'Settings',rows:[{type:'combo',id:'downmix',label:'Downmix',value:D.downmix,options:[['LtRt','LtRt'],['LoRo','LoRo']]},{type:'combo',id:'dialnorm',label:'Dialnorm',value:D.dialnorm?1:0,options:[[0,'Disabled'],[1,'Enabled']]},{type:'combo',id:'alarm',label:'Notify on Card Fault',value:D.alarm?1:0,options:[[1,'Enabled'],[0,'Disabled']]}],note:'Routing settings are read-only: the DIP switches set them.'}],
    footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload…'}], foot:'v2.02'}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>SDI in</b><button data-x="plug">${D.in.conn?'Unplug':'Plug in'}</button>${sel('fmt',FMTS.map(f=>[f,f]),D.in.fmt)} cable ${sel('len',[10,50,100,115,150,200,280,350].map(v=>[v,v+' m']),D.in.len)}
    Dolby config ${sel('cfg',Object.keys(CFG).filter(k=>k!=='PCM').map(k=>[k,k]),D.in.cfg)} rear ${sel('rear',Object.keys(RM).map(k=>[k,k]),D.rear)} <button data-x="cat">${D.cat?'Remove':'Fit'} decoder</button> <button data-x="reset">Defaults</button></div>
    <table class="kv small" style="margin-top:6px"><tr><th>Embedded</th><th>AES1</th><th>AES2</th></tr>${D.in.g.map((g,i)=>`<tr><td>Group ${i+1}</td>${g.map((v,a)=>`<td>${sel('c'+i+a,T.map((n,k)=>[k,n]),v)}</td>`).join('')}</tr>`).join('')}</table><div>${dipSVG()}</div>`; }
function dipSVG(){ let s=`<svg viewBox="0 0 560 104" style="width:100%;max-width:560px"><rect x="10" y="8" width="300" height="62" rx="4" fill="#c0392b"/><text x="16" y="21" font-size="10" fill="#fff">ON ▲  SW1 DIP-8</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${v?'OFF':'ON'}</title><rect x="${x}" y="27" width="22" height="38" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?47:30}" width="16" height="15" fill="#222"/><text x="${x+11}" y="84" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  return s+`<text x="322" y="22" font-size="10.5" fill="var(--ink2)">2: Lt/Rt on AES4 · 3: Dolby enable</text><text x="322" y="38" font-size="10.5" fill="var(--ink2)">4: decoder input AES2 · 5/6: group (MSB/LSB)</text><text x="322" y="54" font-size="10.5" fill="var(--ink2)">1, 7, 8: reserved</text><text x="10" y="100" font-size="10.5" fill="var(--accent)">decoder ${decEn()?'ON':'off'} · input group ${grpSel()+1} AES${decAes()+1} (${T[decIn()]}) · AES4 = ${on(1)?'downmix':'ch 7/8'}</text></svg>`; }
function bindAll(r){ K.bind(r,{jack:{in:()=>A.plug()}, slot:n=>A.slot(n), dash:(id,v)=>A.dash(id,v)}); r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip)));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='plug')A.plug(); else if(x==='fmt')A.fmt(el.value); else if(x==='len')A.len(el.value); else if(x==='cfg')A.cfg(el.value); else if(x==='rear')A.rear(el.value); else if(x==='cat')A.cat(); else if(x==='reset')A.reset(); else if(x==='run')A.run(); else if(x[0]==='c')A.content(+x[1],+x[2],+el.value); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
function lanes(){ const css=SIM.css, f=H8.F[D.in.fmt], L=locked(), ls=[], fr=1/f.fps;
  ls.push(H8.frameLane(f,!L)); ls.push(H8.lineLane(f,!L)); ls.push(H8.hancLane(f,D.in.g.filter(g=>g[0]||g[1]).length,!L));
  ls.push({label:`Decoder input: group ${grpSel()+1} AES${decAes()+1} (${T[decIn()]})`, h:22, draw(c,X,t0,t1,y,h){ if(!L) return; const v=decIn(); if (v>=2) SIM.pulses(c,X,t0,t1,y,h,v===2?fr:0.032,0,(v===2?fr:0.032)*(v===2?0.88:0.55),css('--warn'),v===2?'Dolby E frames (video-locked)':'AC-3 frames, 32 ms'); else if (v===1) SIM.pulses(c,X,t0,t1,y,h,1/48000,0,0.35/48000,css('--accent'),'PCM'); }});
  ls.push({label:'Decoded PCM out (one frame later)', h:22, draw(c,X,t0,t1,y,h){ if(!decoding()) { c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(decEn()?'decoder idle (input not coded or module missing)':'decoder disabled (SW3 OFF) — Table 3 raw de-embed',X(t0)+6,y+h/2+3); return; } c.fillStyle=css('--accent'); const a=Math.max(t0,fr); if (a<t1) c.fillRect(X(a),y+5,X(t1)-X(a),h-10); c.fillStyle=css('--bad'); c.fillRect(X(t0),y+5,Math.max(0,X(Math.min(fr,t1))-X(t0)),h-10); c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('first frame: latency',X(t0)+4,y+h/2+3); }});
  outs().forEach(o=>ls.push(H8.audioLane(`AES${o.n}: ${o.ch.join('/')}`, 48000, o.ok)));
  ls.push({label:'METADATA OUT (RS-485, '+'115.2 kbit/s inferred)', h:20, draw(c,X,t0,t1,y,h){ if(!(decoding()&&decIn()===2)) return; SIM.pulses(c,X,t0,t1,y,h,fr,0.002,0.006,css('--accent2'),'metadata burst per frame'); }});
  ls.push(K.canLane(K.canFrames({poll:0.5, phase:(D.slot*0.0173)%0.4, q:D.canQ})));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Source, DIP switch, rear module', `<div id="ctl"></div>`)}${card('DashBoard (redrawn from the manual)', `<div id="dash"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear module', `<div id="rear"></div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}${card('Output map at the playhead', `<div id="map"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}<div class="grid2">${card('Test outline M6202AE-V202-03MAR10 (scanned; ticks as written) <button data-x="run" style="float:right">Run against the model</button>', `<div id="test"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG();
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D); m.querySelector('#test').innerHTML=H8.checklistHTML(TESTS,D.run);
    m.querySelector('#map').innerHTML=`<table class="kv small"><tr><th>Out</th><th>Source</th><th>Ch A / B</th></tr>${outs().map(o=>`<tr><td>AES${o.n}</td><td>${o.src}</td><td class="mono">${o.ch.join(' / ')}</td></tr>`).join('')}</table>`;
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second of the M6202AE', `<div id="lad"></div>`)}<div class="grid2">${card('Downmix of the test signal', `<div id="dm"></div>`)}${card('Cable reach: spec against the bench', `<div id="reach"></div>`)}</div>`;
  const draw=()=>{ const f=H8.F[D.in.fmt];
    const rows=[['Video frames',f.fps.toFixed(3),SIM.fmtDur(1/f.fps),f.name],['Video lines',Math.round(H8.lineRate(f)).toLocaleString(),SIM.fmtDur(1/H8.lineRate(f)),''],['Audio samples per channel','48 000',SIM.fmtDur(1/48000),H8.spf(f).toFixed(1)+' per frame'],
      ['Dolby E frames',f.fps.toFixed(2),SIM.fmtDur(1/f.fps),'one per video frame; decoded one frame late (POD31/M6206A manuals)'],['AC-3 frames','31.25','32 ms','1536 samples each'],['AES outputs × channels','6 × 2 × 48 000','','12 channels out'],['Metadata output','≈'+f.fps.toFixed(0)+' bursts','',inf('RS-485 rate and framing')],['DashBoard polls','2','500 ms',inf('MFC rate')]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    const d=downmixLevels();
    m.querySelector('#dm').innerHTML=K.levelSVG([{name:'Each E5.1 channel in',level:-20},{name:'Lt (L + 0.707 C − 0.707 S)',level:d.lt,note:'sheet: −27'},{name:'Rt (R + 0.707 C + 0.707 S)',level:d.rt,note:'sheet: −10'},{name:'Lo (normalised, −3 dB)',level:d.lo,note:'sheet: −23 '+inf('normalisation')},{name:'Ro',level:d.ro,note:'sheet: −23'}],{lo:-45,hi:0,unit:'dBFS'})+`<p class="small muted">With every channel in phase, the matrix-surround term cancels in Lt and doubles in Rt — which is why the sheet expects −27 / −10 rather than equal levels. The test without the decoder (−30 / −10) matches the unnormalised matrix.</p>`;
    m.querySelector('#reach').innerHTML=`<table class="kv"><tr><th></th><th>Outline target</th><th>Measured (hand-written)</th></tr><tr><td>HD</td><td class="mono">Min 200 m</td><td class="mono" style="color:var(--bad)">115 m</td></tr><tr><td>SD</td><td class="mono"><s>Min 350 m</s></td><td class="mono" style="color:var(--bad)">280 m</td></tr></table><p class="small muted">Cable named on the sheet: Delco 394167. Both boxes are ticked although both results miss the target.</p>`; };
  SIM.on('time', draw);
}
const BLOCKS={ rin:{x:10,y:40,w:140,h:70,t:'SDI IN',s:['GS1574A EQ','GS1559 deserializer'],d:'Rear position 1. Measured reach: HD 115 m, SD 280 m.'},
  fpga:{x:200,y:30,w:180,h:120,t:'EP1C12 FPGA',s:['de-embed 4 groups','SMPTE 337 detect','DIP-driven routing (v201)'],d:'FPGA v201 (only in Obsolete/v201.zip). Routes the selected group/AES to the decoder and to AES5/AES6.'},
  cat:{x:200,y:200,w:180,h:80,t:'Dolby decoder module',s:['CAT552 socket','8 ch + Lt/Rt downmix'],d:'Decodes Dolby E / Dolby Digital to 8 channels (Table 2) and makes the programme-1 downmix for AES4.'},
  aes:{x:430,y:30,w:150,h:90,t:'AES1–AES6',s:['AES1–4: decoder or grp 1/2','AES5/6: DIP group'],d:'Table 2 when the decoder is enabled, Table 3 when disabled.'},
  meta:{x:430,y:150,w:150,h:60,t:'METADATA OUT',s:['RS-485, Phoenix pos. 10'],d:'Serial Dolby metadata. Manual: Metadata+ to PC serial pin 2, ground to pin 5.'},
  mcu:{x:430,y:240,w:150,h:70,t:'AT90CAN128',s:['v2.02 + bootloader V1.00'],d:'Status reporting and DataSafe. Routing comes from the DIP.'},
  dash:{x:630,y:240,w:130,h:70,t:'DashBoard',s:['status; downmix, dialnorm'],d:'Card Info, Status (Inputs, Outputs, Settings).'} };
const WIRES=[['rin','fpga',''],['fpga','cat','coded AES'],['cat','fpga','PCM'],['fpga','aes','AES'],['cat','meta','metadata'],['mcu','fpga','status'],['mcu','dash','CAN']];
const SHEETS=[{name:'1 · Output assignment', note:'Table 2 of the M6202AE manual (selection).', h:420, svg:()=>{ let s='<text x="30" y="40" font-size="12" font-weight="700" fill="var(--ink)">Config</text>'+['AES1 A','AES1 B','AES2 A','AES2 B','AES3 A','AES3 B','AES4 A','AES4 B'].map((h,i)=>`<text x="${230+i*72}" y="40" font-size="11" fill="var(--ink2)">${h}</text>`).join('');
    Object.keys(CFG).forEach((k,j)=>{ s+=`<text x="30" y="${70+j*34}" font-size="11.5" fill="${k===D.in.cfg?'var(--accent)':'var(--ink)'}">${k}</text>`+CFG[k].map((c,i)=>`<text x="${230+i*72}" y="${70+j*34}" font-size="11.5" fill="var(--accent2)" font-family="var(--mono)">${c}</text>`).join(''); }); return s; }},
  {name:'2 · DIP', note:'DIP table of the M6202AE manual.', svg:()=>K.chip(330,50,200,'SW1 DIP-8',[['1','Reserved'],['2','AES4: ch7/8 or Lt/Rt'],['3','Dolby Enable'],['4','Decoder input AES1/AES2']],[['5','Group MSB (AES5/6 + decoder)'],['6','Group LSB'],['7','Reserved'],['8','Reserved']],'ON = closed')}];
const TUT={i:0};
const LESSONS=[
  {title:'Meet the M6202AE', body:'<p>The M6202AE de-embeds SDI audio to <b>six AES outputs</b> and, with the decoder module fitted, decodes an embedded Dolby E or Dolby Digital stream to eight channels (manual Table 2), with an Lt/Rt downmix and a metadata output.</p>', check:()=>true, auto:true},
  {title:'1 · Lock', body:'<p>Plug in SDI IN.</p>', check:()=>locked(), hint:'Click SDI IN on the rear.'},
  {title:'2 · Enable decoding', body:'<p>Turn <b>SW3 ON</b> (Dolby Enable) and <b>SW4 ON</b> (decode AES2 — group 1 AES2 carries Dolby E). AES1–AES4 now carry 1L/1R, 1C/1LFE, 1Ls/1Rs, 2L/2R.</p>', check:()=>decoding(), hint:'Click DIP 3 and DIP 4.'},
  {title:'3 · Lt/Rt on AES4', body:'<p>Turn <b>SW2 ON</b>: AES4 becomes the programme-1 Lt/Rt downmix.</p>', check:()=>on(1)&&decoding(), hint:'Click DIP 2.'},
  {title:'4 · Pick the group for AES5/6', body:'<p>Set SW5/SW6 to <b>group 2</b> (SW5 OFF, SW6 ON). AES5/AES6 carry embedded group 2 — and the decoder now looks at group 2 as well.</p>', check:()=>grpSel()===1, hint:'Make DIP 5 OFF and DIP 6 ON.'},
  {title:'5 · Pull the decoder', body:'<p>Remove the decoder module. Dolby Decoder Status turns red “Error” and the outputs fall back.</p>', check:()=>!D.cat, hint:'Press “Remove decoder”.'},
  {title:'6 · Run the test outline', body:'<p>Press <b>Run against the model</b> under the test outline. Note the cable-length lines: the bench measured HD 115 m and SD 280 m against targets of 200 m and 350 m.</p>', check:()=>D.run, hint:'Simulator tab → Test outline → Run.'},
  {title:'Done', body:'<p>See <b>Findings</b>.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — using the M6202AE (from the M6202AE manual draft)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2"><div>${card('Routing decision (manual + v2.02), live', `<div id="flow"></div>`)}</div><div>${card('How the controls did things', `<ol class="small"><li><b>SW3</b> Dolby Enable → decoder on; outputs per Table 2 (else Table 3).</li><li><b>SW4</b> → decoder input AES1 or AES2 of the selected group.</li><li><b>SW5/SW6</b> → one group for both AES5/AES6 and the decoder input.</li><li><b>SW2</b> → AES4 = Lt/Rt downmix (or channels 7/8).</li><li>DashBoard: status, Downmix LtRt/LoRo, Dialnorm, Notify on Card Fault. The routing items are read-only (see m6202.js for the v2.02 code path).</li></ol>`)}${card('Release chain', `<table class="kv small"><tr><td>M6202AE 2.0.0.0</td><td>2009-06-08, Atmel v200 / Altera v200</td></tr><tr><td>2.0.0.1</td><td>2009-08-25, bootloader</td></tr><tr><td>2.0.0.2</td><td>2010-03-04, DataSafe — tested 2010-03-03 (this folder)</td></tr><tr><td>zeuspack</td><td class="mono">/o bin/m6202ae_v2_02.bin /v 2.02 /p M6202AE</td></tr></table>`)}</div></div>`;
  const draw=()=>{ const st=[`SDI ${locked()?'locked':'unlocked'} (${D.in.fmt}, ${D.in.len} m)`,`SW3 Dolby Enable: ${decEn()?'ON':'OFF'}`,`decoder module: ${D.cat?'fitted':'missing'}`,`input = group ${grpSel()+1} AES${decAes()+1}: ${T[decIn()]}`,`→ ${decoding()?'Table 2 ('+D.in.cfg+')':'Table 3 raw de-embed'}`,`AES4 = ${on(1)&&decEn()&&D.cat?'Lt/Rt downmix':'per table'}`,`AES5/6 = group ${grpSel()+1}`];
    const k=!locked()?0:!decEn()?1:!D.cat?2:4; m.querySelector('#flow').innerHTML=H8.flowSVG(st,k,!locked()); };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>Cable reach missed, boxes ticked.</b> Page 11 of the scan: “Max cable length HD/SD using Delco 394167 cable — HD: Min 200 m” with “115 m” written beside it, and “SD: Min 350 m” struck through with “280 m”. Both are ticked as tested.`,
  `<b>Board issue mismatch.</b> The report says PCB ISS.3; v2.02’s M6202.h still has BOARD_ISSUE 2, so DashBoard would report Iss.2.`,
  `<b>Lt/Rt levels explained.</b> The sheet expects −27 / −10 dBFS for Lt/Rt from an all-channel −20 dBFS tone: the matrix surround term cancels in Lt and adds in Rt. The “without Dolby card” case (−30 / −10) matches the unnormalised matrix within 1 dB ${inf('coefficients')}.`,
  `<b>One group, two jobs.</b> SW5/SW6 choose both the AES5/AES6 group and the decoder input group (manual) — you cannot decode group 1 while sending group 3 to AES5/6.`,
  `<b>LoRo exists in code, not in the manual.</b> Dashboard.c v202 lists LtRt and LoRo; the manual describes only Lt/Rt on AES4. The sheet’s Lo/Ro line (−23 / −23) is not ticked.`,
  `<b>Template test outline.</b> The generic openGear outline still lists AES input, analog audio/video and SRC sections that do not apply; they are left blank or N/A.`,
  `<b>Empty manual folder.</b> “M6202AE - #Manual/” is empty; the draft manual is in M6202 - #Engineering/M6202A/Manual/v2000/. It still calls the frame “DFR5320” in one place.`,
  `<b>Upload marked Reserved.</b> The manual’s General Tasks table says UPLOAD is reserved, yet 2.0.0.1 added the bootloader and the test outline checks it.`];
const ASSUME=['Downmix coefficients c = s = −3 dB; Lo/Ro normalisation '+inf('chosen to match the sheet'),'Metadata output 115.2 kbit/s RS-485, one burst per frame '+inf('D6207A-family practice'),'Reach is a hard limit at the measured length '+inf('single measurement'),'Program-config selection is a subset of Table 2'];
const SOURCES=['#OPENGEAR #SERIES/M6202AE - #Master #OPENGEAR/M6202AE - #TESTREPORT/M6202AE-V202-03MAR10.pdf (12 pages, scanned)',SW+'Software/atmel/v202/M6202.h, Dashboard.c, wbs_ztcpack.txt (firmware — sibling folder, linked)',SW+'Software/M6202AE SOFTWARE HISTORY.xls',SW+'Manual/v2000/M6202AE Manual .doc',SW+'Functional/M6202AE Rear Modules.cdr, M6202-card-edge.cdr'];
SIM.register({ id:'m6202ae', product:'M6202AE', name:'M6202AE · MD-SDI audio demultiplexer with Dolby decoding, openGear: test release (2009|42)', year:2009,
  folder:'#OPENGEAR #SERIES/M6202AE - #Master #OPENGEAR', family:'openGear',
  summary:'The M6202AE de-embeds SDI audio to six AES outputs and decodes embedded Dolby E / Dolby Digital to eight channels with an Lt/Rt downmix and metadata output. This folder holds the scanned v2.02 test outline; the model routes by the manual’s DIP and Table 2 and runs the outline against itself.',
  highlights:['Table 2 decoder output assignment, live','DIP-driven routing: SW2–SW6','The test outline, run against the model','Cable reach: 115 m HD against a 200 m target','Why Lt/Rt reads −27 / −10 dBFS'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 audio sample',period:()=>1/48000},{label:'1 video line',period:()=>1/H8.lineRate(H8.F[D.in.fmt])},{label:'1 frame',period:()=>1/H8.F[D.in.fmt].fps}],
  zooms:[[1,'1 s'],[0.2,'200 ms'],[0.05,'50 ms'],[0.005,'5 ms'],[0.0005,'500 µs']], defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:780,h:330,sel:'cat'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'M6202AE',sheets:SHEETS,foot:'REDRAWN from the M6202AE manual tables — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:m=>H8.findingsView(m,'What the M6202AE (and its folder) are up to',FINDINGS,ASSUME,SOURCES)}],
});
})();
