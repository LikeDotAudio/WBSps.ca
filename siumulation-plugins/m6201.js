/* =====================================================================
   M6201 — openGear “Embedded Audio AGC” card, engineering only (Ward-Beck Systems, 2006|39 – 2010|43, never released)
   Folder "M6201 - #Engineering #OPENGEAR": M6201-FUNCTIONAL.pdf/.dwg (functional drawing, issue 1), PCB/M6201A.sch,
   M6201A-TEST.sch (2006), M6201A.net / .ECO (2008-12-16), M6201A.pcb (2010-03-16), DDR datasheets. No firmware.
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   Sources (all in this folder):
   - M6201-FUNCTIONAL.pdf, read by eye: title block “WARD-BECK SYSTEMS · M6201 · EMBEDDED AUDIO AGC · FUNCTIONAL · ISSUE 1”;
       blocks S/P → DEMUX (+ optional DOLBY DECODER) → AGC/COMP/GATE/LEVELLER → MUX (+ optional VIDEO DELAY) → SDI 1–4;
       AES IN1 and “AES 4 or AES IN2” through SRCs; CONTROL with CAN, CAN ADDRESS and PSB IN/OUT 1 and 10 (LVDS, 400 Mb/s max);
       termination: SDI IN, AES IN, SDI OUT1–4, AES OUT1–4 on positions 1–10
   - PCB/M6201A.net (Tango-style netlist): every part, pin and net name used on the Schematics tab; M6201A.ECO; M6201A.pcb.md (layers)
   - 512MbDDR2.pdf, 512MBDDRx4x8x16.pdf, JESD79E.pdf, config_DDR_Modules.pdf (third-party memory references)
   No code exists for this card: the AGC behaviour, controls and LED meanings are design intent and marked "inferred".
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
const P='#OPENGEAR #SERIES/M6201 - #Engineering #OPENGEAR/';
const FMTS=['SD 525/59.94','SD 625/50','HD 1080i/59.94','HD 1080i/50','HD 720p/59.94'];
/* MT46V16M16 (U13): 4 M × 16 × 4 banks = 256 Mbit DDR SDRAM */
const DDR_BITS=256*1024*1024;
const D={ in:{conn:true, fmt:'HD 1080i/59.94', prog:'speech'}, agc:{on:true, target:-20, maxg:15, atk:10, rel:120, gate:-50, ratio:4, thr:-14}, dolby:false, vdelay:0, aesin:[true,false], slot:3, log:[], canQ:[] };
const act=K.actor(D);
/* programme envelope over the simulated second (dBFS) — test material, not from the archive */
function envIn(t){ const p=D.in.prog; if (!D.in.conn) return -120;
  if (p==='steps') return t<0.25?-30:t<0.5?-10:t<0.75?-40:-18;
  if (p==='music') return -16+6*Math.sin(2*Math.PI*1.5*t)+3*Math.sin(2*Math.PI*7*t);
  const w=Math.floor(t*5); return [-30,-12,-60,-34,-8][w%5] + 3*Math.sin(2*Math.PI*23*t); }
/* AGC / compressor / gate / leveller, 1 ms steps (design intent: a feed-forward leveller with attack/release smoothing) */
let CACHE=null, CK='';
function run(){ const k=JSON.stringify([D.agc,D.in]); if (k===CK) return CACHE; const N=1000, out=[]; let g=0;
  for (let i=0;i<N;i++){ const t=i/N, x=envIn(t); const gated=x<D.agc.gate; let want;
    if (!D.agc.on) want=0; else if (gated) want=g;                                   // gate: hold gain in silence
    else { want=Math.max(-D.agc.maxg,Math.min(D.agc.maxg,D.agc.target-x)); const y=x+want; if (y>D.agc.thr) want-= (y-D.agc.thr)*(1-1/D.agc.ratio); }
    const tc=(want<g?D.agc.atk:D.agc.rel)/1000, a=1-Math.exp(-0.001/tc); g+= (want-g)*a;
    out.push({t, x, g, y:x+g, gated}); }
  CACHE=out; CK=k; return out; }
function at(t){ const r=run(); return r[Math.max(0,Math.min(r.length-1,Math.floor(t*1000)))]; }
function ddrFrames(){ const f=H8.F[D.in.fmt]; const act=f.kind==='SD'?720*(f.lines===525?486:576):(f.lines===750?1280*720:1920*1080); const bits=act*20; return {bits, frames:Math.floor(DDR_BITS/bits), rate:bits*f.fps}; }
function ledsAt(t){ const l=D.in.conn, k=H8.F[D.in.fmt].kind, s=at(t); return {sd:l?1:0, hd:l&&k!=='SD'?1:0, err:l?0:1, a:[1,1,1,1].map(()=>l&&!s.gated?1:0), d:[D.dolby&&l?1:0,0,0,0], com:D.canQ.some(q=>t>=q&&t<q+0.02)?1:0, cerr:0}; }
const A={
  plug(){ act(`${D.in.conn?'Unplug':'Plug in'} SDI IN (rear 1)`, tr=>{ D.in.conn=!D.in.conn; tr(`BNC1_SIG (P1-97) → R1/L1 → U1 GS1574A (CD1 → U11 pin 6) → U2 GS1559: LOCK_60 → U11 pin 27`); tr('S/P → DEMUX on the functional drawing'); }); },
  fmt(v){ act(`Source → ${v}`, tr=>{ D.in.fmt=v; const d=ddrFrames(); tr(`U2 GS1559 SD/~HD → U11 pin 32; U6/U17 GS1528 slew select`); tr(`Video delay capacity in U13 (256 Mbit): ${d.frames} frames of ${(d.bits/1e6).toFixed(1)} Mbit active picture ${inf('10-bit 4:2:2, active area only')}`); }); },
  prog(v){ act(`Programme → ${v}`, tr=>{ D.in.prog=v; tr('Test envelope for the leveller (not from the archive)'); }); },
  agc(k,v){ act(`AGC ${k} → ${v}`, tr=>{ D.agc[k]=k==='on'?!!v:+v; D.canQ.push(SIM.t); tr(`CONTROL block → FPGA/SHARC: ${k} ${inf('no parameter set survives')}`); tr('ADSP-21262 (U20) DAI_P17/P20/P16 DATA_IN1–3 from the FPGA; output on DAI_P10_SDATA1'); }); },
  dolby(){ act(`${D.dolby?'Remove':'Fit'} the optional Dolby decoder (P5)`, tr=>{ D.dolby=!D.dolby; tr('P5 = CAT_NO_552_RA socket: DADA/DADB/DADC/DADD (decoded audio) and EAD/EAFS/EABC (encoded in) to FPGA U3; RESET_552 from U3-AC18; META_IN (P5-60) → U25 ADM3485 → 485±'); }); },
  vdelay(v){ act(`Video delay → ${v} frames`, tr=>{ const d=ddrFrames(); D.vdelay=Math.min(+v,d.frames); tr(`MUX path through U13 MT46V16M16 DDR (SDRAM_ADD0–12, BANK0–1, DATA0–15, CKP/CKN): write + read ≈ ${(2*d.rate/1e9).toFixed(2)} Gb/s for ${D.in.fmt}`); if (+v>d.frames) tr(`Capped at ${d.frames} frames: 256 Mbit is full`); }); },
  aes(i){ act(`${D.aesin[i]?'Unplug':'Plug in'} ${i?'AES IN2 (shares “AES 4”)':'AES IN1'}`, tr=>{ D.aesin[i]=!D.aesin[i]; tr(i?'Functional drawing: the fourth AES position is “AES 4 or AES IN2” (jumpered)':'AES IN (rear 2): BNC2_SIG → C38 → U12 DS34LV86T → SRC'); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; tr('AN_SLOTID / AN_BMID / AN_BMID2 on the AVR ADC'); }); },
  reset(){ Object.assign(D,{in:{conn:true,fmt:'HD 1080i/59.94',prog:'speech'},agc:{on:true,target:-20,maxg:15,atk:10,rel:120,gate:-50,ratio:4,thr:-14},dolby:false,vdelay:0,aesin:[true,false],slot:3,log:[],canQ:[]}); SIM.refresh(); },
};
const REAR=[[1,'SDI IN','in'],[2,'AES IN','ai'],[3,'SDI OUT1','so'],[4,'SDI OUT2','so'],[5,'SDI OUT3','so'],[6,'SDI OUT4','so'],[7,'AES OUT1','ao'],[8,'AES OUT2','ao'],[9,'AES OUT3','ao'],[10,'AES OUT4','ao']];
function rearSVG(){ const l=D.in.conn;
  return K.rearSVG({name:'Termination (drawn on M6201-FUNCTIONAL)', sub:'no rear-module part number exists', id:'BNC1–BNC10_SIG on P1', cells:REAR.map(([n,lb,k])=>{ if(k==='in') return {n,label:lb,id:'in',conn:l,live:l?true:undefined}; if(k==='ai') return {n,label:lb,id:'ai',conn:D.aesin[0],live:D.aesin[0]?true:undefined}; return {n,label:lb,live:l?true:'err'}; })}); }
function edgeSVG(t){ const L=ledsAt(t); const names=['SD','HD','ERR','AES1','AES2','AES3','AES4','COM','COM Error'], st=[L.sd,L.hd,L.err,...L.a,L.com,L.cerr], ys=[50,80,110,160,190,220,250,320,350];
  return K.edgeSVG({label:'M6201A', maxw:260, note:'LED2–LED14 on U11; names by analogy with the M6202A (inferred)', leds:names.map((n,i)=>({name:n,c:i===2||i===8?'r':i>=3&&i<=6?'y':'g',on:st[i],y:ys[i]}))}); }
function dashHTML(){ const s=at(SIM.t), d=ddrFrames();
  return K.dashHTML({key:'m6201', title:'M6201A — design-intent panel', sub:'no firmware: parameters inferred from the functional drawing', tree:[{name:'(never released)'},{name:'M6201A',lvl:1,sel:true}],
    tabs:[{name:'Status',rows:[{type:'status',label:'SDI',value:D.in.conn?D.in.fmt:'Unlocked',level:D.in.conn?'ok':'err'},{type:'text',label:'Programme in',value:D.in.conn?s.x.toFixed(1)+' dBFS':'—'},{type:'text',label:'AGC gain',value:(s.g>=0?'+':'')+s.g.toFixed(1)+' dB'},{type:'status',label:'Gate',value:s.gated?'closed (gain held)':'open',level:s.gated?'warn':'ok'},{type:'text',label:'Programme out',value:D.in.conn?s.y.toFixed(1)+' dBFS':'—'}]},
      {name:'AGC',rows:[{type:'toggle',id:'on',label:'AGC / leveller',value:D.agc.on},{type:'slider',id:'target',label:'Target level',min:-30,max:-10,value:D.agc.target,unit:'dBFS'},{type:'slider',id:'maxg',label:'Max gain',min:0,max:20,value:D.agc.maxg,unit:'dB'},{type:'slider',id:'atk',label:'Attack',min:1,max:100,value:D.agc.atk,unit:'ms'},{type:'slider',id:'rel',label:'Release',min:50,max:2000,step:50,value:D.agc.rel,unit:'ms'},{type:'slider',id:'gate',label:'Gate threshold',min:-70,max:-30,value:D.agc.gate,unit:'dBFS'},{type:'slider',id:'thr',label:'Compressor threshold',min:-24,max:0,value:D.agc.thr,unit:'dBFS'},{type:'slider',id:'ratio',label:'Ratio',min:1,max:20,value:D.agc.ratio,unit:':1'}],note:'All parameters '+inf('no DashBoard or firmware exists for the M6201')},
      {name:'Delay',rows:[{type:'slider',id:'vdelay',label:'Video delay (optional)',min:0,max:d.frames,value:D.vdelay,unit:'frames'},{type:'text',label:'DDR capacity',value:`${d.frames} frames (${D.in.fmt})`}]}],
    footer:[], foot:''}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>SDI in</b><button data-x="plug">${D.in.conn?'Unplug':'Plug in'}</button>${sel('fmt',FMTS.map(f=>[f,f]),D.in.fmt)} programme ${sel('prog',[['speech','speech-like bursts'],['steps','level steps'],['music','music-like']],D.in.prog)}
   <button data-x="dolby" class="${D.dolby?'on':''}">Dolby decoder (optional)</button> <button data-x="a1">${D.aesin[1]?'Unplug':'Plug in'} AES IN2</button> <button data-x="reset">Defaults</button></div>`; }
function bindAll(r){ K.bind(r,{jack:{in:()=>A.plug(), ai:()=>A.aes(0)}, dash:(id,v)=>{ if(id==='vdelay') A.vdelay(v); else A.agc(id,v); }});
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='plug')A.plug(); else if(x==='fmt')A.fmt(el.value); else if(x==='prog')A.prog(el.value); else if(x==='dolby')A.dolby(); else if(x==='a1')A.aes(1); else if(x==='reset')A.reset(); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
/* to-scale card outline (12.800 × 3.025 in, openGear card size from the M6205CE manual) with the netlist’s large parts at true package size;
   positions inferred by analogy with the M6202A ISS3 layout (no placement data survives: no Gerbers, binary .pcb) */
const PARTS=[['U3','EP2C35F672','FBGA-672 27 mm',7.6,1.5,1.06,1.06],['U20','ADSP-21262','LQFP-144 20 mm',5.4,1.0,0.79,0.79],['U13','MT46V16M16TG','TSOP-66',6.2,2.3,0.87,0.4],['U11','AT90CAN128','TQFP-64',3.6,1.4,0.55,0.55],['U2','GS1559','BGA-100',10.2,2.2,0.43,0.43],['U19','GS1531','BGA-100',10.2,0.8,0.43,0.43],['U1','GS1574A','QFN-16',11.4,2.4,0.16,0.16],['U6','GS1528','SO-8',11.6,1.0,0.2,0.16],['U17','GS1528','SO-8',11.6,0.6,0.2,0.16],['U12','DS34LV86T','SO-16',11.0,1.6,0.4,0.16],['U25','ADM3485EAR','SO-8',9.4,2.6,0.2,0.16],['P5','CAT_NO_552_RA','SIMM socket',3.0,2.65,3.6,0.3],['SW1','DIPSW8SMT','DIP-8',1.6,0.5,0.6,0.25],['REG5','PTH12050','power module',1.4,2.0,0.75,0.6],['P1','MEDAC100','edge connector',12.55,1.5,0.25,2.4],['P2','MEDAC20','edge connector',12.55,0.25,0.25,0.4]];
function boardSVG(){ const S=80, W=12.8*S, H=3.025*S; let s=`<svg viewBox="-10 -10 ${W+20} ${H+40}" style="width:100%;background:var(--dev);border-radius:6px"><rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="#1d4f2f" stroke="#0e2a18"/>`;
  PARTS.forEach(([d,v,pk,x,y,w,h])=>{ s+=`<g><title>${d} ${v} (${pk}) — from M6201A.net; position inferred</title><rect x="${(x-w/2)*S}" y="${(y-h/2)*S}" width="${w*S}" height="${h*S}" rx="2" fill="${/^P/.test(d)?'#b98d4a':'#16181a'}" stroke="#888"/><text x="${x*S}" y="${y*S+4}" text-anchor="middle" font-size="${Math.min(13,w*S/5)}" fill="#e6e8e9">${d}</text></g>`; });
  const L=ledsAt(SIM.t), on=[L.sd,L.hd,L.err,...L.a,L.com,L.cerr]; on.forEach((o,i)=>{ s+=`<rect x="6" y="${30+i*14}" width="12" height="8" rx="2" fill="${o?(i===2||i===8?'#ff4a3d':i>=3&&i<=6?'#ffd23a':'#5dff5a'):'#3a3f3a'}"/>`; });
  return s+`<text x="0" y="${H+24}" font-size="12" fill="#aeb3b6">To scale: 12.800 × 3.025 in card; part sizes from their packages; placement ${'inferred'} (no Gerbers or PNP for the M6201; PCB/GERBERS is empty). 8 copper layers per M6201A.pcb.</text></svg>`; }
function lanes(){ const css=SIM.css, f=H8.F[D.in.fmt], l=D.in.conn, ls=[];
  ls.push(H8.frameLane(f,!l)); ls.push(H8.hancLane(f,2,!l));
  const lev=(label,fn,col)=>({label,h:46,draw(c,X,t0,t1,y,h){ const N=Math.min(1000,Math.max(100,X(t1)-X(t0))); c.strokeStyle=css('--grid'); [-10,-20,-30,-40,-50].forEach(v=>{ const yy=y+3+(-v/60)*(h-6); c.beginPath(); c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); });
    c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=Math.max(-60,Math.min(0,fn(tt))); const yy=y+3+(-v/60)*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.lineWidth=1; }});
  ls.push(lev('Programme in (dBFS, 0 top / −60 bottom)', t=>at(t).x, css('--ink2')));
  ls.push({label:`AGC gain (±${D.agc.maxg} dB)`, h:36, draw(c,X,t0,t1,y,h){ const N=Math.min(1000,Math.max(100,X(t1)-X(t0))); c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke(); c.strokeStyle=css('--warn'); c.beginPath(); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, g=at(tt).g; const yy=y+h/2-g/Math.max(1,D.agc.maxg)*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }});
  ls.push(K.boolLane('Gate closed (gain held)', t=>at(t).gated&&l, css('--bad')));
  ls.push(lev(`Programme out (target ${D.agc.target} dBFS)`, t=>at(t).y, css('--accent')));
  ls.push({label:`Video through DDR (${D.vdelay} frame delay)`, h:20, draw(c,X,t0,t1,y,h){ if(!l) return; const d=D.vdelay/f.fps; c.fillStyle=css('--bad'); c.fillRect(X(t0),y+5,Math.max(0,X(Math.min(t1,d))-X(t0)),h-10); SIM.pulses(c,X,Math.max(t0,d),t1,y,h,1/f.fps,d,0.0012,css('--accent2'),'delayed frames'); }});
  ls.push(K.canLane(K.canFrames({poll:0.5, phase:0.11, q:D.canQ}),'CAN bus 1 Mbit/s (planned: CAND/CANR on U11)'));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Source and options', `<div id="ctl"></div>`)}${card('Design-intent panel (no DashBoard exists)', `<div id="dash"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear termination', `<div id="rear"></div>`)}</div>${card('What the card would do', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('The board: M6201A to scale (parts from the netlist)', `<div id="pcb"></div>`)}${card('Timeline — one second of levelling, zoomable', `<canvas id="tl"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); m.querySelector('#rear').innerHTML=rearSVG(); m.querySelector('#pcb').innerHTML=boardSVG();
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D); bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second through the M6201 (design)', `<div id="lad"></div>`)}<div class="grid2">${card('Level through each stage at the playhead', `<div id="lvl"></div>`)}${card('Video delay memory (U13)', `<div id="ddr"></div>`)}</div>`;
  const draw=()=>{ const f=H8.F[D.in.fmt], d=ddrFrames(), s=at(SIM.t);
    const rows=[['Serial bits in',(f.rate/1e6).toFixed(1)+' M','','GS1574A → GS1559 (20-bit parallel D0–D19)'],['Video frames',f.fps.toFixed(3),SIM.fmtDur(1/f.fps),f.name],['Audio samples per channel','48 000',SIM.fmtDur(1/48000),'to the SHARC over DAI (TDM/I²S)'],['AGC gain updates','1 000','1 ms',inf('control rate of the model')],['Active video into DDR',(d.rate/1e6).toFixed(0)+' Mbit/s','','write, and the same again for read'],['PSB links','≤ 400 Mbit/s','','LVDS mid-plane, functional drawing']];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#lvl').innerHTML=K.levelSVG([{name:'Programme in',level:D.in.conn?s.x:null},{name:'De-embedded (DEMUX)',level:D.in.conn?s.x:null},{name:`AGC gain ${s.g.toFixed(1)} dB`,level:D.in.conn?s.x+Math.max(0,s.g):null,col:'var(--warn)',note:s.gated?'gate holding':''},{name:'Compressor / leveller out',level:D.in.conn?s.y:null},{name:'Re-embedded (MUX) → SDI OUT1–4, AES OUT1–4',level:D.in.conn?s.y:null}],{lo:-60,hi:0,unit:'dBFS',clip:0,clipLabel:'0 dBFS'});
    m.querySelector('#ddr').innerHTML=`<table class="kv small"><tr><th>Part on the board</th><td>U13 MT46V16M16TG (TSOP-66): 16 M × 16 DDR = 256 Mbit</td></tr><tr><th>Datasheets filed here</th><td>512Mb DDR2, 512Mb x4/x8/x16 DDR — a bigger, different part</td></tr><tr><th>${D.in.fmt}</th><td>${(d.bits/1e6).toFixed(1)} Mbit per frame → ${d.frames} frames max ${inf('10-bit active picture')}</td></tr><tr><th>Bandwidth</th><td>${(2*d.rate/1e9).toFixed(2)} Gbit/s read + write; a 16-bit DDR bus needs ≥ ${Math.ceil(2*d.rate/32/1e6)} MHz clock ${inf('no overhead')}</td></tr></table>`; };
  SIM.on('time', draw);
}
const BLOCKS={ sp:{x:10,y:30,w:130,h:70,t:'S/P',s:['GS1574A + GS1559'],d:'Functional drawing “S/P”: U1 equaliser and U2 deserializer (20-bit D0–D19 to the FPGA).'},
  dmx:{x:180,y:30,w:150,h:70,t:'DEMUX',s:['EP2C35F672 (U3)'],d:'Extracts the embedded audio.'},
  dol:{x:180,y:140,w:150,h:60,t:'DOLBY DECODER',s:['optional, P5 CAT552'],d:'Optional on the drawing; P5 socket on the netlist.',dim:true},
  agc:{x:370,y:30,w:170,h:90,t:'AGC/COMP/GATE/LEVELLER',s:['ADSP-21262 (U20)'],d:'The card’s purpose per its title block: “EMBEDDED AUDIO AGC”. Algorithm not in the archive.'},
  vd:{x:370,y:160,w:170,h:60,t:'VIDEO DELAY',s:['optional, U13 DDR'],d:'Optional on the drawing; U13 MT46V16M16 on the netlist.',dim:true},
  mux:{x:580,y:30,w:150,h:70,t:'MUX → SDI 1–4',s:['GS1531 + 2× GS1528'],d:'Re-embeds and serialises; four SDI outputs.'},
  aes:{x:580,y:140,w:150,h:70,t:'AES IN/OUT',s:['2 SRC in, 4 out'],d:'AES IN1, “AES 4 or AES IN2”, SRC, four AES outputs.'},
  ctl:{x:180,y:250,w:150,h:70,t:'CONTROL',s:['AT90CAN128 (U11)'],d:'CAN, CAN address, PSB in/out (LVDS, 400 Mb/s max).'} };
const WIRES=[['sp','dmx','20-bit'],['dmx','dol','coded'],['dol','agc','PCM'],['dmx','agc','audio'],['agc','mux',''],['dmx','vd','video'],['vd','mux',''],['aes','agc','SRC'],['agc','aes',''],['ctl','agc','params']];
const NETS={u11:[['2/3','CPU_RX / CPU_TX'],['4','LED14'],['5','N_CONFIG'],['6','CD1 (GS1574A)'],['7/8','LED13 / LED12'],['9','~RC_BYP'],['10–17','LED11, LED4, LED3, LED9, LED8, LED7, LED5, LED6'],['18','SMPTE']],u11r:[['25–29','SDOUT_60, CS_60, LOCK_60, SDCLK_60, SDIN_60'],['30/31','CAND / CANR'],['32','SD/~HD'],['33/34','LED10 / LED2'],['35–42','ALTERA15…ALTERA8'],['43','ALTERA_RESET'],['44–51','ALTERA0…ALTERA7']]};
const SHEETS=[{name:'1 · Controller', note:'U11 pins from M6201A.net.', svg:()=>K.chip(310,40,220,'U11 AT90CAN128',NETS.u11,NETS.u11r,'GS1559 host interface via the _60 nets')},
  {name:'2 · DSP and memory', note:'U20 and U13 pins from M6201A.net.', h:500, svg:()=>K.chip(330,50,200,'U20 ADSP-21262',[['87','DAI_P17_DATA_IN1'],['94','DAI_P20_DATA_IN2'],['86','DAI_P16_DATA_IN3'],['70/71','DAI_P9_SCLK / P8_FSYNCH'],['88','DAI_P18_CLK'],['121','SHARC_RESET (U4)']],[['77','DAI_P10_SDATA1'],['78–82','U4OUT/CLK/IN/RESET/SEL'],['125–127','SPICLK, MISO, MOSI'],['134','DSP_CLK_OUT'],['15…46','FLAG0–11']],'SHARC; SHARC_RESET also on U4 AT25F512A pin 3')+K.chip(330,280,200,'U13 MT46V16M16TG',[['29–42','SDRAM_ADD0–12'],['26/27','BANK0/1'],['22/23/21','COLN/ROWN/WRITEN'],['24','CSELN']],[['2…65','SDRAM_DATA0–15'],['45/46','CKP / CKN'],['44','CLKEN'],['16/51','LSTRB / USTRB'],['49','VREF_DDR']],'256 Mbit DDR, U3 controller')},
  {name:'3 · Decoder socket', note:'P5 (CAT_NO_552_RA) from M6201A.net.', svg:()=>K.chip(330,40,200,'P5 CAT552 socket',[['3','RESET_552'],['7/8','MAP0/MAP1'],['11–13','PRG0–2'],['17/18','PDN / ACS'],['31–33','DLM0–2'],['34–36','PLE / PLS / PGP']],[['45/46/53/54','DADA–DADD'],['52/55/56','DADM / DAFS / DABC'],['49–51','EAD / EAFS / EABC'],['57–59','PB2 / PB0 / PB1'],['60','META_IN → U25'],['69/70','SYNC / ERR']],'Dolby decoder module (optional)')}];
const TUT={i:0};
const LESSONS=[
  {title:'Meet the M6201', body:'<p>The M6201 was to be an <b>embedded audio AGC</b>: de-embed SDI audio, level it (AGC, compressor, gate, leveller), and re-embed it, with an optional Dolby decoder and optional video delay. Only the functional drawing and the PCB design survive; the controls here are design intent.</p>', check:()=>true, auto:true},
  {title:'1 · Lock and listen', body:'<p>With SDI plugged in, the speech-like programme jumps between −8 and −32 dBFS. Look at the timeline: input above, output near the −20 dBFS target.</p>', check:()=>D.in.conn, hint:'Plug in SDI IN.'},
  {title:'2 · Slow the release', body:'<p>Set <b>Release</b> to 1500 ms. Quiet passages now come up more slowly.</p>', check:()=>D.agc.rel>=1500, hint:'Panel → AGC → Release.'},
  {title:'3 · Gate the silence', body:'<p>Raise the <b>Gate threshold</b> to −30 dBFS: more passages count as silence and the gain is held (red lane).</p>', check:()=>D.agc.gate>=-30, hint:'AGC → Gate threshold.'},
  {title:'4 · Use the delay memory', body:'<p>Set a <b>video delay</b>. In HD the 256 Mbit DDR holds only a few frames; switch to SD and see how many more fit.</p>', check:()=>D.vdelay>0, hint:'Delay tab → slider.'},
  {title:'Done', body:'<p>See <b>Findings</b> for what the drawings tell us.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — the M6201 idea (from the functional drawing)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2"><div>${card('Signal path, stage by stage (live)', `<div id="flow"></div>`)}</div><div>${card('No software exists', `<p class="small">There is no firmware, FPGA or DSP source for the M6201. The netlist shows the same control wiring as the M6202 family (AT90CAN128 with ALTERA0–15 shift lines, CAN, LED2–LED14, GS1559 host interface), so the card would have used the same openGear firmware pattern ${inf('family resemblance')}.</p>`)}${card('Leveller law used here', `<p class="small mono">want = clamp(target − in, ±max)\nif in + want &gt; thr: want −= (in + want − thr)(1 − 1/ratio)\nif in &lt; gate: hold gain\ng += (want − g)(1 − e^(−1 ms/τ)), τ = attack or release</p><p class="small">${inf('design-intent model, not Ward-Beck code')}</p>`)}</div></div>`;
  const draw=()=>{ const s=at(SIM.t); const st=[`S/P: ${D.in.conn?D.in.fmt:'no input'}`,`DEMUX: programme ${s.x.toFixed(1)} dBFS`,`${D.dolby?'Dolby decoder → PCM':'Dolby decoder not fitted'}`,`AGC: gain ${s.g.toFixed(1)} dB${s.gated?' (gate holding)':''}`,`COMP/LEVELLER → ${s.y.toFixed(1)} dBFS`,`VIDEO DELAY ${D.vdelay} frames`,'MUX → SDI 1–4, AES 1–4'];
    m.querySelector('#flow').innerHTML=H8.flowSVG(st,s.gated?3:4,!D.in.conn); };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>The card’s purpose is on its drawing.</b> The README says the purpose “is not stated anywhere”, but the title block of M6201-FUNCTIONAL.pdf (text is vector art, so not extractable) reads “WARD-BECK SYSTEMS · M6201 · EMBEDDED AUDIO AGC · FUNCTIONAL · ISSUE 1”, with blocks AGC/COMP/GATE/LEVELLER, optional DOLBY DECODER and optional VIDEO DELAY.`,
  `<b>Wrong memory datasheets.</b> The netlist’s memory is U13 MT46V16M16TG (256 Mbit DDR, TSOP-66). The datasheets filed beside it are for 512 Mbit DDR2 and 512 Mbit DDR parts.`,
  `<b>A floating driver pin.</b> Net SD/HD_28 has only one node (U17 pin 6): the second GS1528 cable driver’s SD/HD slew select is unconnected, while U6’s is on SD/~HD.`,
  `<b>Same control skeleton as the M6202.</b> U11 carries ALTERA0–15, ALTERA_RESET, N_CONFIG, CAND/CANR and LED2–LED14 on the same kind of pins as the M6202 family; the GS1559 nets keep a “_60” suffix (LOCK_60, SDIN_60 …), as if drawn from a GS1560 symbol.`,
  `<b>Eight copper layers.</b> M6201A.pcb lists Top, GND1, SIG1, GND, PWR, SIG2, GND2, Bottom — twice the four signal/plane films of the M6202A ISS3 board, needed for the 672-ball FPGA and DDR.`,
  `<b>Long life, no release.</b> M6201A-TEST.sch is from 2006-09-27, the netlist and ECO from 2008-12-16, the .pcb from 2010-03-16. There is no BOM, PNP, Gerber (PCB/GERBERS is empty), test report or manual.`,
  `<b>Extra I/O on the drawing.</b> PSB IN/OUT 1 and 10 (LVDS, “400 Mb/s max”) on the mid-plane and “AES 4 or AES IN2” sharing a rear position.`];
const ASSUME=['All AGC parameters and the leveller law '+inf('no code'),'LED names by analogy with the M6202A '+inf('same LED2–LED14 wiring'),'Board placement to scale but positions '+inf('no placement data'),'DDR capacity for 10-bit active picture only '+inf('no blanking stored'),'Programme envelopes are test material'];
const SOURCES=[P+'M6201-FUNCTIONAL.pdf (read by eye), M6201-FUNCTIONAL.dwg',P+'PCB/M6201A.net (parts, pins, nets), M6201A.ECO, M6201A.sch, M6201A-TEST.sch, M6201A.pcb (layer list via M6201A.pcb.md)',P+'512MbDDR2.pdf, 512MBDDRx4x8x16.pdf, JESD79E.pdf, config_DDR_Modules.pdf','#OPENGEAR #SERIES/M6205C - #Master #OPENGEAR/M6205CE V300 MANUAL (openGear card size 3.025 × 12.800 in)'];
SIM.register({ id:'m6201', product:'M6201', name:'M6201 · embedded audio AGC card, openGear: engineering design (2008|41)', year:2008,
  folder:'#OPENGEAR #SERIES/M6201 - #Engineering #OPENGEAR', family:'openGear',
  summary:'The M6201 was designed as an “Embedded Audio AGC”: de-embed SDI audio, level it with AGC, compressor, gate and leveller in a SHARC DSP, and re-embed it, with an optional Dolby decoder and optional video delay in DDR memory. Only the functional drawing and the P-CAD design survive; the model runs the idea with design-intent controls.',
  highlights:['Purpose recovered from the functional drawing’s title block','Leveller, gate and compressor over one second','DDR video-delay capacity per format','Board drawn to scale from the netlist’s parts'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 ms',period:()=>1e-3},{label:'1 frame',period:()=>1/H8.F[D.in.fmt].fps},{label:'1 audio sample',period:()=>1/48000}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.05,'50 ms'],[0.005,'5 ms']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:760,h:340,sel:'agc'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'M6201A',sheets:SHEETS,foot:'REDRAWN from M6201A.net pin and net names — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:m=>H8.findingsView(m,'What the M6201 (and its folder) are up to',FINDINGS,ASSUME,SOURCES)}],
});
})();
