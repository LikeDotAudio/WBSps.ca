/* =====================================================================
   D6207A docs (TIM) — Dolby E / AC-3 decoder, openGear: control documents and SNMP MIB (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   This folder: D6207A operational ctl info 4oct07.doc / 3mar08.doc (register map), D6207x-CARD.mib,
   Defining a D6207A MIB.doc, D6207A-FUNCTIONAL.pdf, D6207A-T6305.pdf, D6207A-card-edge.cdr.
   Firmware cross-checked from the sibling: #OPENGEAR #SERIES/D6207A - #Master #OPENGEAR/
       D6207A - #Engineering/D6207A - #Software/atmel/v102 (D6207A.c/.h, dolby.c)
   Anything not in those files is marked "inferred" on screen. Format names are plain text only.
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

/* ---------------- D6207A (documents) model ---------------- */
const inf=K.inf, card=K.card;
const ASSET='siumulation-plugins/assets/';
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
const MST='#OPENGEAR #SERIES/D6207A - #Master #OPENGEAR/D6207A - #Engineering/D6207A - #Software/atmel/v102/';
const TYPES=['none','PCM','AC-3','Dolby E'];
const MODEN={0:'Single AES input with SRC',1:'Dual AES input with auto swap',2:'Single AES input',3:'Dual AES input (AES1 coded / AES2 PCM)'};   // MIB d6207xProgramMode
const MAN_DIP={0:'Single AES Input with SRC',1:'Dual AES Input with Auto Swap',2:'Single AES Input (AES1 only)',3:'Dual AES Input (AES1 coded / AES2 PCM)'};   // manual rows keyed by code value (SW1 = weight 1, SW2 = weight 2), despite the caption “SW1 MSB, SW2 LSB”
const SRCN={1:'Rear module input 2',2:'Frame Ref 1',3:'Frame Ref 2'};
const C={LOOP_T:300e-6, DOLBY_LOCK:2000, T1:96e-6, HEARTBEAT:10000};
const D={ in1:{type:3, fs:48000}, in2:{type:1, fs:48000}, refs:{2:true,3:false}, video:'NTSC',
  mode:0, src2:1, dialnorm:false, downmix:1, module:true, docRev:'3mar08', bitSense:'code',
  dip:[1,1,1,1,1,1,1,1], lat:[1,1], slot:4, removedAt:null, log:[], canQ:[] };
const act=K.actor(D);
const dipCtl=()=>D.lat[0]===1;    // SW7 OFF = parameters from the DIP switch (manual default)
const dashOK=()=>D.lat[1]===1;    // SW8 OFF = DashBoard may change parameters
function effMode(){ if (dipCtl()){ return (D.dip[0]===0?1:0)+(D.dip[1]===0?2:0); } return D.mode; }   // v100w.c: mode += 1 if SW1 ON (BIT0 == 0), += 2 if SW2 ON → MIB enum directly; the manual's rows agree, only its MSB/LSB captions are swapped
function effSrc2(){ if (dipCtl()){ const v=(D.dip[4]===0?2:0)+(D.dip[5]===0?1:0); return v===0?1:v===1?2:v===2?3:1; } return D.src2; }
function effDownmix(){ return dipCtl()? (D.dip[2]===0?0:1) : D.downmix; }   // ON = Lt/Rt (0)
function effDialnorm(){ return dipCtl()? D.dip[3]===0 : D.dialnorm; }
function in2(){ const s=effSrc2(); if (s===1) return D.in2; const on=D.refs[s]; return {type:on?1:0, fs:48000, ref:true}; }
const coded=t=>t===2||t===3;
function moduleOK(t){ if (!D.module) return false; return !(D.removedAt!==null && t>=D.removedAt && t<D.removedAt+0.3); }
function route(){   // which input feeds the CAT552
  const m=effMode(), a=D.in1, b=in2();
  if (m===1){ if (coded(a.type)) return {cat:1, sap:null}; if (coded(b.type)) return {cat:2, sap:null}; return {cat:1, sap:null}; }
  if (m===3) return {cat:1, sap:2};
  return {cat:1, sap:null};
}
function outputs(){
  const r=route(), src=r.cat===1?D.in1:in2(), t=src.type, m=effMode(), dm=effDownmix()?'Lo,Ro':'Lt,Rt';
  const fsMain = m===0 && in2().type? in2().fs : src.fs;
  if (!t) return {fs:fsMain, o:['—','—','—','—','—','—'], meta:'—'};
  if (t===1) return {fs:fsMain, o:['L,R (PCM)','muted','muted', r.sap?'SAP ← AES2':'muted', dm+' (PCM)', 'input loop'], meta:'—'};
  if (t===2) return {fs:fsMain, o:['L,R','C,LFE','Ls,Rs', r.sap?'SAP ← AES2':'(none in AC-3)', dm, 'input loop'], meta:'none (AC-3 carries no metadata — manual)'};
  return {fs:fsMain, o:['L,R','C,LFE','Ls,Rs', r.sap?'SAP ← AES2 (replaces Dolby E SAP)':'SAP (if present)', dm, 'input loop'], meta:'Dolby E metadata on Phoenix'};
}
function reg20(t){
  const r=route(); let v=0;
  v |= (effDialnorm()?0b001:0)<<29;
  const reset = !moduleOK(t); if (reset) v |= 1<<28;
  v |= 0<<27;                                            // prologic_disable = YES
  const rm = effMode()===0 && in2().type ? 1 : 6; v |= rm<<24;   // RMCK: 001 = rmck2 (AES2 ref) or 110 internal (inferred mapping)
  v |= (1<<(r.cat-1))<<16;                               // CAT552 input select (one-hot)
  v |= (4)<<12; v |= 4; v |= 5<<3;                       // AES5 ref, AES1/AES2 on 75 Ω inputs (4..)
  return v>>>0;
}
function alteraByte(k){   // ALTERA2 (AES1) / ALTERA4 (AES2) as the code reads them
  const i=k===1?D.in1:in2(); const comp=coded(i.type); const pc=i.type===2?1:i.type===3?28:0;
  if (k===1) return ((comp?1:0)<<5) | pc;               // code: BIT5 set = compressed; VHDL pa1(7) <= detect1_r, '1' on a burst → active-high (docs' “0=yes” is wrong)
  return ((comp?1:0)<<7) | pc;
}
function cardStatus(){ let s=0; const a=D.in1.type, b=in2().type; if(!a&&!b) s|=2; if(!a) s|=4; if(!b && (effMode()!==2)) s|=8; if (coded(b)) s|=16; if (D.in1.fs>48000||in2().fs>48000) s|=128; return s||1; }
function decStatus(t){ if (!moduleOK(t)) return 2; return route().cat===1?4:8; }
function leds(t){ const a=D.in1.type, b=in2().type, err=!moduleOK(t); return {a1:a?1:0,d1:coded(a)?1:0,e1:(!a||err)?1:0,a2:b?1:0,d2:coded(b)?1:0,e2:(!b&&effMode()!==2)?1:0,com:canList().some(f=>f.dir==='tx'&&t>=f.t&&t<f.t+0.0012)?1:0}; }
function canList(){ const out=[], ph=(D.slot*0.0173)%0.9; for (let t=ph;t<1;t+=C.HEARTBEAT*C.T1) out.push({t,n:1,dir:'tx',label:'card → MFC: heartbeat'}); for (let t=0.21;t<1;t+=0.5){ out.push({t,n:1,dir:'rx',label:'MFC → card: GET_PARAM / SNMP poll'}); out.push({t:t+0.0005,n:1,dir:'tx',label:'card → MFC: REPORT_PARAM'}); }
  D.canQ.forEach(t=>{ out.push({t,n:1,dir:'rx',label:'MFC → card: SET_PARAM'}); out.push({t:t+0.0004,n:2,dir:'tx',label:'card → MFC: reply'}); }); return out.sort((a,b)=>a.t-b.t); }
const FRAME={NTSC:1001/30000, PAL:1/25};
const A={
  type(k,v){ act(`AES ${k} input → ${TYPES[v]}`, tr=>{ (k===1?D.in1:D.in2).type=+v; if (k===2&&effSrc2()!==1) tr(`(AES2 source is ${SRCN[effSrc2()]} — the rear input is not used)`);
    tr(`FPGA non_audio_detector: ${coded(+v)?'SMPTE 337M burst found; Pc data-type = '+(+v===2?'1 (AC-3)':'28 (Dolby E)'):'no burst preamble → PCM'} → ALTERA${k===1?2:4} = 0x${alteraByte(k).toString(16).toUpperCase().padStart(2,'0')}`);
    tr(`D6207A.c: (ALTERA${k===1?'2 & BIT5':'4 & BIT7'}) != 0 → aes${k}_led = ${coded(+v)?'COMPRESSED → '+(+v===2?'DOLBY_AC3':'DOLBY_E'):'PCM'}`);
    tr(`Routing: ${MODEN[effMode()]} → CAT552 input ${route().cat} (Reg 20 bits 19..16 = ${(1<<(route().cat-1)).toString(2).padStart(4,'0')})`);
    tr(`SNMP d6207xAES${k}Input = ${+v}; d6207xCardStatus = ${cardStatus()} → d6207xCardStatusEvent`); }); },
  fs(k,v){ act(`AES ${k} sample rate → ${v/1000} kHz`, tr=>{ (k===1?D.in1:D.in2).fs=+v; tr(+v>48000?'Above 48 kHz: d6207xCardStatus bit aesInputgreaterthan48kHz (128). Manual: 32–48 kHz only.':'within 32–48 kHz (manual)'); }); },
  set(id,v){
    if (!dipCtl() && !dashOK()){ act(`DashBoard: ${id}`, tr=>tr('DashBoard disabled by DIP SW8')); return; }
    if (dipCtl()){ act(`DashBoard: ${id}`, tr=>tr('SW7 OFF (“get card parameters from the DIP switch”, the manual’s default): the DIP switch wins; reboot with SW7 ON to use DashBoard/SNMP settings')); return; }
    act(`DashBoard/SNMP: ${{mode:'d6207xProgramMode',src2:'d6207xAESInput2Source',dialnorm:'d6207xDialnorm',downmix:'d6207xDownmix'}[id]} → ${v}`, tr=>{
      if (id==='mode'){ D.mode=+v; tr(`${MODEN[+v]} (MIB value ${v}); routing now CAT552 ← AES${route().cat}${route().sap?', SAP ← AES2':''}`); }
      if (id==='src2'){ D.src2=+v; tr(`AES2 ← ${SRCN[+v]}: Reg 20 AES2 input select (bits 5..3) ${+v===1?'rear 75 Ω input':'frame reference path'} ${inf('select code for frame refs')}`); }
      if (id==='dialnorm'){ D.dialnorm=!!v; tr(`dialnorm_enable = ${v?'YES':'NO'} → Reg 20 bits 31..29`); }
      if (id==='downmix'){ D.downmix=+v; tr(`downmix_type = ${+v?'LORO':'LTRT'} (dolby.h LORO 1 / LTRT 0) → AES OUT 5 = ${+v?'Lo,Ro':'Lt,Rt'}`); }
      D.canQ.push(SIM.t); }); },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1; tr('DIP_SWITCHES_PIN is ALTERA1: the switch is wired to the FPGA and read back in the status bytes'); if(i>=6) tr('Takes effect at the next boot (SW7 default / SW8 DashBoard disable)'); else if (dipCtl()) tr(`Effective: ${MODEN[effMode()]}, AES2 ← ${SRCN[effSrc2()]}, downmix ${effDownmix()?'Lo/Ro':'Lt/Rt'}, dialnorm ${effDialnorm()?'on':'off'}`); else tr('Ignored: card is using stored (DashBoard) parameters'); }); },
  reboot(){ act('DashBoard: Reboot', tr=>{ D.lat=[D.dip[6],D.dip[7]]; tr(`SW7 → parameters from ${dipCtl()?'DIP switch':'EEPROM/DashBoard'}; SW8 → DashBoard ${dashOK()?'enabled':'read-only'}`); }); },
  module(){ act(`${D.module?'Remove':'Fit'} the Dolby decoder module (CAT552)`, tr=>{ D.module=!D.module; if (D.module) D.removedAt=SIM.t;
    tr(`DOLBY_DECODER_STATUS: DOLBY_INSTALLED (PINA bit 5) ${D.module?'high → Dolby_card_status = OK':'low → ERROR'}`);
    tr(D.module?'RESET_DOLBY: after the module appears, reset_552 = 0 is written (Reg 20 bit 28) and the CAT552 restarts — ≈0.3 s here '+inf('restart time'):`RESET_DOLBY counts ${C.DOLBY_LOCK} passes, then Dolby_card_installed = NO and reset_552 pulses`); tr(`d6207xDolbyDecoderStatus = ${decStatus(SIM.t+0.5)} → d6207xDolbyDecoderStatusEvent`); }); },
  ref(n){ act(`Frame REF ${n-1} ${D.refs[n]?'removed':'connected'}`, tr=>{ D.refs[n]=!D.refs[n]; tr(effSrc2()===n?`AES2 (from frame ref) now ${D.refs[n]?'present':'missing'}`:'not the selected AES2 source'); }); },
  doc(v){ D.docRev=v; SIM.refresh(); }, sense(v){ D.bitSense=v; SIM.refresh(); },
  reset(){ Object.assign(D,{mode:0,src2:1,dialnorm:false,downmix:1,module:true,slot:4,removedAt:null}); D.in1={type:3,fs:48000}; D.in2={type:1,fs:48000}; D.refs={2:true,3:false}; D.dip=[1,1,1,1,1,1,1,1]; D.lat=[1,1]; D.log=[]; D.canQ=[]; SIM.refresh(); },
};
/* Artwork 2026|59: the card edge is D6207A-card-edge.cdr (the copy in this folder, 2008-05-08) and the rear is the T6305A
   drawing in the openGear Rear Module Guide (2012-01-16); assets shared with the d6207a plugin. Coordinates in pt. */
const ARTCDR={edge:'#OPENGEAR #SERIES/D6207A  #Engineering #TIM #PCB/D6207A-card-edge.cdr', rear:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6207A - Rear Module Options.cdr', t6305:'#OPENGEAR #SERIES/D6207A  #Engineering #TIM #PCB/D6207A-T6305.cdr'};
const EDGE_YS=[253.5,274.6,297.8,325.7,346.9,370.1,413.9];
function edgeSVG(t){ const L=leds(t);
  const body=[['AES1','g',L.a1],['Dolby1','y',L.d1],['Error1','r',L.e1],['AES2','g',L.a2],['Dolby2','y',L.d2],['Error2','r',L.e2],['COM Activity','g',L.com]]
    .map(([n,c,on],i)=>artLed({x:359.6, y:EDGE_YS[i]-6.1, w:5.5, h:12.2, on, col:K.LEDC[c], fid:'d7dg', title:`${n} LED (${on?'lit':'off'})`})).join('');
  return artSVG({src:'d6207a-edge.svg', vb:[236,238,160,318], maxw:230, label:'D6207A card edge', fid:'d7dg', body})
    + `<div class="small muted" style="text-align:center">${SIM.src(ARTCDR.edge,'D6207A-card-edge.cdr')} (this folder, 2008-05-08) / manual table 1</div>`; }
const REAR_XY = n=> n<=8? [n%2?491.9:510.8, 240+Math.floor((n-1)/2)*18.9] : [n===9?491.4:511.3, 315.5];
function rearSVG(){ const o=outputs().o, J=(n,x)=>{ const [cx,cy]=REAR_XY(n); return artJack(Object.assign({cx,cy,r:5.85},x)); };
  const body=[J(1,{conn:!!D.in1.type, live:D.in1.type?true:undefined, title:'1: AES In 1'}), J(2,{conn:!!D.in2.type, live:effSrc2()===1&&D.in2.type?true:undefined, title:'2: AES In 2'}),
    J(3,{live:o[0]!=='—'?true:'err', title:'3: AES OUT1 L, R'}), J(4,{live:o[1].startsWith('C')?true:'off', title:'4: AES OUT2 C, LFE'}), J(5,{live:o[2].startsWith('L')?true:'off', title:'5: AES OUT3 Ls, Rs'}),
    J(6,{live:o[3].startsWith('SAP')?true:'off', title:'6: SAP'}), J(7,{live:o[4]!=='—'?true:'err', title:'7: Lo,Ro / Lt,Rt'}), J(8,{live:o[5]!=='—'?true:'off', title:'8: input loop through'}),
    J(9,{kind:'tb', w:8.6, h:15.1, title:'9: Reserved (Phoenix)'}), J(10,{kind:'tb', w:8.6, h:15.1, live:D.in1.type===3?true:'off', title:'10: Metadata OUT (Phoenix, RS-485)'})].join('');
  return artSVG({src:'d6207a-rear-t6305a.svg', vb:[402,212,190,119], maxw:420, label:'T6305A rear module', fid:'d7dr', body})
    + `<div class="small muted" style="text-align:center">T6305A, 2 slots: ${SIM.src(ARTCDR.rear,'D6207A - Rear Module Options.cdr')} (2012-01-16)</div>`; }
function dashHTML(t){ const cs=cardStatus(), ds=decStatus(t), ro=dipCtl()||!dashOK();
  return K.dashHTML({key:'d6207', title:`Slot ${D.slot}: D6207A`, alarm:cs!==1, tree:[{name:'Ward-Beck frame agent (SNMP)'},{name:`Slot ${D.slot}: D6207A`,lvl:1,sel:true}],
    tabs:[{name:'Status',rows:[{type:'status',label:'Card Status',value:cs===1?'OK':['noAESAudioLock','aes1unlocked','aes2Unlocked','aes2isDolby','','','aesInput>48kHz'].filter((n,i)=>cs&(2<<i)).join(', '),level:cs===1?'ok':(cs&2||cs&4)?'err':'warn'},{type:'status',label:'AES 1 Input',value:TYPES[D.in1.type],level:D.in1.type?'ok':'err'},{type:'status',label:'AES 2 Input',value:effMode()===2?'Not Used':TYPES[in2().type],level:in2().type||effMode()===2?'ok':'err'},{type:'status',label:'Dolby Decoder',value:['','Ok','Error','','AES1 Active','','','','AES2 Active'][ds],level:ds===2?'err':'ok'}]},
      {name:'Settings',rows:[{type:'combo',id:'mode',label:'Program Mode',value:D.mode,options:[0,1,2,3].map(v=>[v,MODEN[v]])},{type:'combo',id:'src2',label:'AES Input 2 Source',value:D.src2,options:[1,2,3].map(v=>[v,SRCN[v]])},{type:'toggle',id:'dialnorm',label:'Dialnorm',value:D.dialnorm,on:'Enabled',off:'Disabled'},{type:'combo',id:'downmix',label:'Downmix',value:D.downmix,options:[[0,'Lt/Rt'],[1,'Lo/Ro']]}],note:ro?(dipCtl()?'SW7 OFF: the DIP switch is in control (manual default). Values here are stored but not used.':'SW8: DashBoard read-only.'):''},
      {name:'SNMP (MIB)',rows:[{type:'text',label:'d6207xCardMib',value:'1.3.6.1.4.1.25030.1.1.11'},{type:'text',label:'…ProgramMode (.3.1.1)',value:effMode()},{type:'text',label:'…AESInput2Source (.3.1.2)',value:effSrc2()},{type:'text',label:'…Dialnorm (.3.1.3)',value:effDialnorm()?1:0},{type:'text',label:'…Downmix (.3.1.4)',value:effDownmix()},{type:'text',label:'…CardStatus (.4.1.1)',value:cs},{type:'text',label:'…AES1Input (.4.1.2)',value:D.in1.type},{type:'text',label:'…AES2Input (.4.1.3)',value:effMode()===2?4:in2().type},{type:'text',label:'…DolbyDecoderStatus (.4.1.4)',value:ds}],note:'OID arcs from D6207x-CARD.mib: openGearObjects 11 → objects 1 → tables 2/3/4 → entry 1 → column. enterprises 25030 = Ward-Beck (WARD-BECK.mib).'}],
    footer:[{id:'reboot',text:'Reboot'}], foot:'V102 firmware (sibling folder)'}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>AES 1</b>${sel('t1',TYPES.map((n,i)=>[i,n]),D.in1.type)} ${sel('f1',[32000,44100,48000,96000].map(v=>[v,v/1000+' kHz']),D.in1.fs)} <b>AES 2</b>${sel('t2',TYPES.map((n,i)=>[i,n]),D.in2.type)} ${sel('f2',[32000,44100,48000,96000].map(v=>[v,v/1000+' kHz']),D.in2.fs)}
   <button data-x="r2">Frame REF 1 ${D.refs[2]?'on':'off'}</button><button data-x="r3">Frame REF 2 ${D.refs[3]?'on':'off'}</button><button data-x="mod">${D.module?'Remove':'Fit'} decoder module</button> video ${sel('vid',[['NTSC','29.97 fps'],['PAL','25 fps']],D.video)} <button data-x="reset">Defaults</button></div><div style="margin-top:6px">${dipSVG()}</div>`; }
function dipSVG(){ const lab=['Mode Sel “MSB” (code weight 1)','Mode Sel “LSB” (code weight 2)','Downmix (ON = Lt/Rt)','Dialnorm (ON = on)','AES2 Source MSB','AES2 Source LSB','Default (DIP/memory)','DashBoard disable'];
  let s=`<svg viewBox="0 0 540 170" style="width:100%;max-width:540px"><rect x="10" y="10" width="300" height="70" rx="4" fill="#c0392b"/><text x="16" y="24" font-size="10" fill="#fff">ON ▲ manual figure 4 · read via ALTERA1</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${lab[i]} — ${v?'OFF':'ON'}</title><rect x="${x}" y="30" width="22" height="42" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?52:33}" width="16" height="16" fill="#222"/><text x="${x+11}" y="94" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  lab.forEach((l,i)=>{ s+=`<text x="330" y="${22+i*17}" font-size="10.5" fill="var(--ink2)">${i+1}: ${l}</text>`; });
  return s+`<text x="10" y="160" font-size="10.5" fill="var(--accent)">${dipCtl()?'DIP in control':'stored parameters in control'} · ${MODEN[effMode()]}</text></svg>`; }
function bindAll(r){ K.bind(r,{dash:(id,v)=>{ if(id==='reboot') A.reboot(); else A.set(id,v); }});
  r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip)));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='t1')A.type(1,el.value); else if(x==='t2')A.type(2,el.value); else if(x==='f1')A.fs(1,el.value); else if(x==='f2')A.fs(2,el.value); else if(x==='r2')A.ref(2); else if(x==='r3')A.ref(3); else if(x==='mod')A.module(); else if(x==='vid'){ D.video=el.value; SIM.refresh(); } else if(x==='reset')A.reset(); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
function regHTML(t){ const v=reg20(t), b=v.toString(2).padStart(32,'0');
  const f=[[31,29,'Dialnorm settings'],[28,28,'Reset_552'],[27,27,'prologic enabled'],[26,24,'ref RMCK select (000–101 rmck1–5, 110 internal)'],[23,20,'reserved'],[19,16,'CAT552 input select 4..1 (one-hot)'],[15,15,'reserved'],[14,12,'AES5 input select (Ref.)'],[11,9,'AES4 input select (CS8416-1)'],[8,6,'AES3 input select (CS8416-2)'],[5,3,'AES2 input select (CS8416-3)'],[2,0,'AES1 input select (CS8416-4)']];
  const by=k=>alteraByte(k), sense=D.bitSense==='doc';
  return `<p class="small">Reg 20 “Routing control 1” = <span class="mono">0x${v.toString(16).toUpperCase().padStart(8,'0')}</span></p><table class="kv">${f.map(([h,l,n])=>`<tr><td class="mono">${h===l?h:h+'..'+l}</td><td class="mono">${b.slice(31-h,32-l)}</td><td>${n}</td></tr>`).join('')}</table>
  <p class="small" style="margin-top:8px">FPGA → AVR status bytes (${D.docRev==='4oct07'?'4 Oct 2007 map: ALTERA2 and ALTERA3 both “AES1 Audio Info”':'3 Mar 2008 map'}):</p>
  <table class="kv"><tr><th>byte</th><th>value</th><th>meaning</th></tr><tr><td class="mono">ALTERA1</td><td class="mono">${D.dip.map(x=>x).reverse().join('')}</td><td>${D.docRev==='4oct07'?'7..0 Reserved (DIP switch)':'7 DashBoard enabled · 6 restore from DIP · 2 downmix (1 = LoRo) · 1 dialnorm disabled · 0 mode (0 = decoder w/ SRC, 1 = 2×1 switcher)'}</td></tr>
  <tr><td class="mono">ALTERA2</td><td class="mono">${(sense?by(1)^0x20:by(1)).toString(2).padStart(8,'0')}</td><td>AES1: ${D.docRev==='4oct07'?'5 Compressed (0 = yes)':'7 CAT_MAPPING_ERR · 6 CAT_SILENCE · 5 Compressed (0 = yes)'} · 4..0 Dolby indicator (Pc)</td></tr>
  <tr><td class="mono">ALTERA4</td><td class="mono">${(sense?by(2)^0x80:by(2)).toString(2).padStart(8,'0')}</td><td>AES2: 7 Compressed (0 = yes) · 4..0 Dolby indicator</td></tr><tr><td class="mono">ALTERA18</td><td class="mono">10100000</td><td>Alignment check (ALIGNED_DATA 0xA0)</td></tr></table>
  <p class="small muted">Showing the compressed bit as ${sense?'the document defines it (0 = yes — the documents are wrong: the VHDL sets it to 1 on a burst)':'the V102 code reads it, matching the VHDL (1 = compressed: “if bit is set compressed audio is received”)'} — see Findings.</p>`; }
function lanes(){ const css=SIM.css, ls=[], fr=FRAME[D.video], fs=D.in1.fs;
  ls.push({label:`Video frames (${D.video})`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,fr,0,fr*0.03,css('--accent2'),'video frames'); }});
  ls.push({label:`AES1 ${TYPES[D.in1.type]} frames`, h:26, draw(c,X,t0,t1,y,h){ const t=D.in1.type; if(!t){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText('no signal',X(t0)+6,y+h/2+4); return; }
    if (t===3) SIM.pulses(c,X,t0,t1,y,h,fr,fr*0.05,fr*0.9,css('--warn'),'Dolby E frames (one per video frame)'); else if (t===2) SIM.pulses(c,X,t0,t1,y,h,1536/fs,0,1536/fs*0.9,css('--warn'),'AC-3 frames (1536 samples)'); else SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,css('--accent'),'PCM AES blocks'); }});
  ls.push({label:'SMPTE 337M burst preambles (Pa Pb Pc Pd)', h:20, draw(c,X,t0,t1,y,h){ const t=D.in1.type; if(!coded(t)) return; const p=t===3?fr:1536/fs; SIM.pulses(c,X,t0,t1,y,h,p,t===3?fr*0.05:0,4/fs,css('--bad'),'Pc = '+(t===3?28:1)); }});
  ls.push({label:'CAT552 decoded output', h:26, draw(c,X,t0,t1,y,h){ const t=route().cat===1?D.in1.type:in2().type; if(!coded(t)||!D.module){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(!D.module?'no decoder module':'PCM: bypass (L,R + downmix only)',X(t0)+6,y+h/2+4); return; } const lat=t===3?fr:1536/fs; c.fillStyle=css('--accent'); c.globalAlpha=.7; const p=t===3?fr:1536/fs; for(let k=Math.floor((t0-lat)/p);k*p+lat<t1;k++){ const a=k*p+lat+(t===3?fr*0.05:0); c.fillRect(X(a),y+4,Math.max(1,X(a+p*0.9)-X(a)),h-8); } c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`latency ≈ 1 ${t===3?'video':'AC-3'} frame (${SIM.fmtDur(lat)}) ${'(inferred)'}`,X(t0)+4,y+h-4); }});
  ls.push({label:'AVR loop (≈300 µs, inferred)', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.LOOP_T,0,C.LOOP_T*0.9,css('--accent'),'passes'); }});
  ls.push(K.canLane(canList(),'CAN 1 Mbit/s · SNMP via frame agent'));
  ls.push(K.boolLane('Dolby1 LED', t=>leds(t).d1, '#d9a21b')); ls.push(K.boolLane('Error1 LED', t=>leds(t).e1, '#c0392b'));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('DashBoard / SNMP (redrawn from the MIB in this folder)', `<div id="dash"></div>`)}${card('Inputs and DIP switch', `<div id="ctl"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear module T6305A', `<div id="rear"></div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}${card('Outputs (manual “Please note”)', `<div id="outs"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}<div class="grid2">${card('Register map, live (operational ctl info .doc)', `<div style="display:flex;gap:6px;margin-bottom:6px"><button data-doc="4oct07">4 Oct 2007</button><button data-doc="3mar08">3 Mar 2008</button><button data-sense="code">bit as coded</button><button data-sense="doc">bit as documented</button></div><div id="reg"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  m.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>A.doc(b.dataset.doc)); m.querySelectorAll('[data-sense]').forEach(b=>b.onclick=()=>A.sense(b.dataset.sense));
  const draw=()=>{ const t=SIM.t, o=outputs(); m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(); m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    m.querySelector('#outs').innerHTML=`<table class="kv">${['AES OUT 1','AES OUT 2','AES OUT 3','AES OUT 4 (SAP)','AES OUT 5 (downmix)','AES OUT 6'].map((n,i)=>`<tr><th>${n}</th><td class="mono">${o.o[i]}</td></tr>`).join('')}<tr><th>Metadata</th><td>${o.meta}</td></tr><tr><th>Routing</th><td class="mono">${MODEN[effMode()]} → CAT552 ← AES${route().cat}</td></tr></table>`;
    m.querySelector('#reg').innerHTML=regHTML(t); m.querySelectorAll('[data-doc]').forEach(b=>b.classList.toggle('on',b.dataset.doc===D.docRev)); m.querySelectorAll('[data-sense]').forEach(b=>b.classList.toggle('on',b.dataset.sense===D.bitSense));
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); };
  SIM.on('time', draw);
}
function viewSecond(m){ m.innerHTML=`${card('One second, broken down', `<div id="lad"></div>`)}${card('Card edge and status at the playhead', `<div class="grid2" style="grid-template-columns:1fr 2fr"><div id="edge"></div><div id="dash"></div></div>`)}`;
  const draw=()=>{ const fs=D.in1.fs, fr=FRAME[D.video]; const rows=[['Video frames',(1/fr).toFixed(3),SIM.fmtDur(fr),'Dolby E is framed to video'],['Dolby E frames',(1/fr).toFixed(3),SIM.fmtDur(fr),'one SMPTE 337M burst each, Pc = 28'],['AC-3 frames',(fs/1536).toFixed(3),SIM.fmtDur(1536/fs),'1536 samples, Pc = 1'],['AES frames',fs.toLocaleString(),SIM.fmtDur(1/fs),'CS8416 ×4 + ref'],['AVR passes','≈'+Math.round(1/C.LOOP_T).toLocaleString(),SIM.fmtDur(C.LOOP_T),inf('pass time')],['Module-missing reset',`after ${C.DOLBY_LOCK} passes`,SIM.fmtDur(C.DOLBY_LOCK*C.LOOP_T),'RESET_DOLBY / DOLBY_LOCK_COUNTER'],['CAN heartbeat','1.04','960 ms','CAN.c']];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); m.querySelector('#dash').innerHTML=dashHTML(SIM.t); bindAll(m); };
  SIM.on('time', draw); }
const BLOCKS={ in:{x:10,y:40,w:150,h:80,t:'AES In 1 / In 2',s:['T6305A, 75 Ω','or frame REF 1/2'],d:'Two rear inputs; AES2 can come from a frame reference (d6207xAESInput2Source).'},
  rx:{x:200,y:40,w:150,h:80,t:'CS8416 ×4 + ref',s:['AES1–AES5 input selects','110 Ω 1–4 / 75 Ω'],d:'Reg 20 bits 14..0 choose each receiver’s input (0–3 = 110 Ω, 4–6 = 75 Ω).'},
  fpga:{x:400,y:40,w:180,h:120,t:'EP1C12Q240 (AMS81.qpf)',s:['non_audio_detector (337M)','CAT552_switch, CATMAPERR','router, quad_selector, i2sx4_aes'],d:'Detects coded audio and its Pc type, routes the chosen input to the decoder, assembles the six outputs and the status bytes.'},
  cat:{x:400,y:210,w:180,h:80,t:'Dolby decoder module (CAT552)',s:['Reg 20: Reset_552, dialnorm','downmix LoRo/LtRt'],d:'Plug-in decoder (DOLBY_INSTALLED on PINA bit 5). Plain-text name; no logos.'},
  out:{x:620,y:40,w:150,h:120,t:'T6305A outputs',s:['L,R · C,LFE · Ls,Rs','SAP · Lo/Ro or Lt/Rt','input loop · metadata'],d:'Six AES outputs plus metadata on Phoenix (manual figure 2).'},
  mcu:{x:200,y:210,w:150,h:80,t:'AT90CAN128',s:['dolby.c, D6207A.c','DashBoard + SNMP MIB'],d:'Writes Reg 20, reads ALTERA1–18, resets the decoder, reports to DashBoard and (via the frame agent) to SNMP.'} };
const WIRES=[['in','rx',''],['rx','fpga','I²S'],['fpga','cat','coded'],['cat','fpga','PCM'],['fpga','out','AES'],['mcu','fpga','Reg 20'],['fpga','mcu','ALTERA1–18'],['mcu','cat','reset']];
const SHEETS=[{name:'1 · Control link', note:'From the operational control information .docs (this folder) and D6207A.h (V102).', svg:()=>K.chip(140,60,180,'AT90CAN128',[['PB0/PB3','AES1/AES2 LED'],['PB1/PB4','DOLBY1/2 LED'],['PB2/PB5','ERROR/ERROR2 LED'],['PB6','COM ACTIVITY (also DOLBY3!)'],['PINA5','DOLBY_INSTALLED']],[['ALTERA_read_write','Reg 20 out'],['ALTERA1–18','status in']],'V102')+K.chip(560,60,190,'EP1C12Q240',[['shift_in32','Reg 20'],['shifter_out_48bit','status']],[['CAT552_switch','decoder in'],['non_audio_detector','Pc / compressed']],'AMS81.qpf')}];
const TUT={i:0};
const LESSONS=[
  {title:'What this folder is', body:'<p>This is the D6207A <b>documents</b> folder: the AVR ⇄ FPGA register map (two dated versions), the <b>SNMP MIB</b> and its design note, and the functional, card-edge and rear-module drawings. The tutorial operates the Dolby decoder card those documents describe.</p>', check:()=>true, auto:true},
  {title:'1 · Decode Dolby E', body:'<p>Feed <b>Dolby E</b> on AES 1. The <b>Dolby1</b> LED lights and the outputs carry L,R · C,LFE · Ls,Rs · SAP · downmix, plus metadata.</p>', check:()=>D.in1.type===3, hint:'AES 1 → Dolby E.'},
  {title:'2 · Pick the downmix with the DIP', body:'<p>The manual’s default is “parameters from the DIP switch”. Set <b>SW3 ON</b> to put <b>Lt/Rt</b> on AES OUT 5.</p>', check:()=>effDownmix()===0, hint:'Click DIP 3.'},
  {title:'3 · Auto swap', body:'<p>Set SW1 ON (SW2 OFF): Dual AES input with auto swap. Now make AES 1 <b>PCM</b> and AES 2 <b>AC-3</b>: the card routes AES 2 to the decoder.</p>', check:()=>effMode()===1&&route().cat===2, hint:'DIP 1 ON, AES1 PCM, AES2 AC-3.'},
  {title:'4 · Read it over SNMP', body:'<p>Open the <b>SNMP (MIB)</b> tab in the DashBoard window and find d6207xProgramMode. It reads <b>1</b>, which the MIB names “dualAESInputwAutoSwap”. The manual’s DIP table row for auto swap (SW1 ON, SW2 OFF) gives the same 1, because the code weights SW1 as 1; only the manual’s “SW1 MSB / SW2 LSB” captions are backwards. See Findings.</p>', check:()=>true, auto:true},
  {title:'5 · Pull the decoder module', body:'<p>Click <b>Remove decoder module</b>. Error1 lights and d6207xDolbyDecoderStatus becomes 2 (error).</p>', check:()=>!D.module, hint:'Remove decoder module.'},
  {title:'Done', body:'<p>Compare the two register-map dates in the Simulator tab and read the Findings.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — the D6207A as the documents describe it',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(SIM.t); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2">${card('MIB tree (D6207x-CARD.mib vs “Defining a D6207A MIB.doc”)', `<div id="mib"></div>`)}${card('Format detection (D6207A.c)', `<ol class="small"><li>FPGA non_audio_detector looks for the SMPTE 337M preamble and the Pc data type.</li><li>AVR reads ALTERA2 (AES1) / ALTERA4 (AES2): bit 5 / bit 7 set → COMPRESSED; bits 4..0 = 1 → DOLBY_AC3, 28 → DOLBY_E.</li><li>aes1_led / aes2_led drive Dolby LEDs and OIDs; routing writes CAT552 input select.</li><li>dolby.c: DOLBY_DECODER_STATUS → RESET_DOLBY (2000 passes) → reset_552; DOLBY_CAT552_AUDIO_ERROR_CHECK resets on CAT_MAPPING_ERR.</li></ol>`)}</div>`;
  const tree=[['d6207xCardMib','1.3.6.1.4.1.25030.1.1.11',''],['  Notifications (0)','',''],['    .1','d6207xCardStatusEvent','doc: d6207xInputStatusEvent'],['    .2','d6207xDolbyDecoderStatusEvent',''],['  Objects (1)','',''],['    .1','d6207xNumberOfCards',''],['    .2','d6207xProductTable (… .8 SupplierWebsite)',''],['    .3.1.1','d6207xProgramMode','0 SRC · 1 autoSwap · 2 single · 3 dual'],['    .3.1.2','d6207xAESInput2Source','1 rear · 2 ref1 · 3 ref2'],['    .3.1.3','d6207xDialnorm',''],['    .3.1.4','d6207xDownmix','0 ltrt · 1 loro'],['    .4.1.1','d6207xCardStatus','doc: d6207xInputStatus'],['    .4.1.2/.3','d6207xAES1Input / AES2Input',''],['    .4.1.4','d6207xDolbyDecoderStatus','']];
  m.querySelector('#mib').innerHTML=`<table class="kv">${tree.map(r=>`<tr><td class="mono" style="white-space:pre">${r[0]}</td><td class="mono">${r[1]}</td><td class="small muted">${r[2]}</td></tr>`).join('')}</table><p class="small muted">MIB LAST-UPDATED 2009-02-10; design note dated 17 February 2009, “Prototype”.</p>`; }
const FINDINGS=[
  `<b>Artwork ${SIM.year(2026)}: card edge and rear panel now from the CorelDRAW files.</b> Edge: ${SIM.src(ARTCDR.edge,'D6207A-card-edge.cdr')} (2008-05-08, seven LEDs: AES1, Dolby1, Error1, AES2, Dolby2, Error2, COM Activity); rear: ${SIM.src(ARTCDR.rear,'D6207A - Rear Module Options.cdr')} (2012-01-16). The guide puts <b>Reserved on position 9 and Metadata OUT on position 10</b>; this plugin had them the other way round (corrected). The 2007 sheet ${SIM.src(ARTCDR.t6305,'D6207A-T6305.cdr')} in this folder calls position 9 “GPI/O 1” and the module “T6305” without the A.`,
  `<b>Compressed flag polarity: the documents are wrong.</b> Both register-map documents say “Compressed Flag (0=yes)”; V102 D6207A.c tests <span class="mono">(ALTERA2 &amp; BIT5) != 0</span> and <span class="mono">(ALTERA4 &amp; BIT7) != 0</span> with the comment “if bit is set compressed audio is received”, and the FPGA agrees: <span class="mono">non_audio_detector.vhd</span> sets <span class="mono">detect1_r &lt;= '1'</span> on a burst and drives <span class="mono">pa1(7) &lt;= detect1_r</span>. The flag is active-high.`,
  `<b>Program-mode codes: the manual’s rows are right, its captions are not.</b> MIB: singleAESInputwSRC(0), dualAESInputwAutoSwap(1), singleAESInput(2), dualAESInput(3). The manual’s DIP rows (SW1 ON = auto swap, SW2 ON = single) agree with it, because <span class="mono">v100w.c</span> adds 1 for SW1 ON and 2 for SW2 ON. Only the manual’s “SW1 MSB / SW2 LSB” captions are swapped, and its prose calls “Single AES Input” Mode2 and “Auto Swap” Mode 3, the reverse of <span class="mono">D6207A.h</span> (MODE2 = 1, MODE3 = 2). The older register map has only two modes (ALTERA1 bit 0: decoder with SRC / 2×1 switcher).`,
  `<b>Corrected 2026|59:</b> this plugin used to leave the compressed-flag polarity open and to call program-mode codes 1 and 2 swapped between the manual and the MIB. The VHDL shows the flag is active-high (the two register-map documents are wrong, not the code), and the manual’s mode table agrees with the MIB once SW1 is read as weight 1. (see d6207a.js)`,
  `<b>MIB vs its design note.</b> The note names d6207xInputStatusEvent / d6207xInputStatus; the MIB has d6207xCardStatusEvent / d6207xCardStatus. The note also spells “d6207xCardMibCompiliances”.`,
  `<b>4 Oct 2007 → 3 Mar 2008 map.</b> The later map fills in ALTERA1 (DIP bits: DashBoard enabled, restore from DIP, downmix, dialnorm, mode) and adds CAT_MAPPING_ERR / CAT_SILENCE to ALTERA2; the earlier one lists ALTERA2 and ALTERA3 both as “AES1 Audio Info”.`,
  `<b>Input-select coding is short one value.</b> “0-3 = 110 ohm 1-4 / 4..6 = 75 ohm 1-4” gives three codes for four 75 Ω inputs, and AES1 maps to CS8416-4, AES4 to CS8416-1 (reverse order).`,
  `<b>LED pin clash in V102.</b> D6207A.h defines both COM_ACTIVITY_LED and DOLBY3_LED on PORTB bit 6, plus SD/HD and AES3–AES8 LEDs this card does not have — leftovers from the M6204A (M6204A.c sits unlinked in the folder).`,
  `<b>FPGA project name.</b> The Master’s FPGA project is AMS81.qpf (from the AMS-8 monitor), with an unrelated SD-SDI demux sub-project in every version folder.`,
  `<b>Sample rates.</b> Manual: 32–48 kHz only; the MIB has a CardStatus bit “aesInputgreaterthan48kHz” (128) to flag anything faster.`,
];
const ASSUME=['AVR pass ≈ 300 µs '+inf('no timer'),'Decoder latency one Dolby E (video) frame or one AC-3 frame '+inf('not in the documents'),'RMCK select codes and the frame-ref input-select codes in Reg 20 '+inf('document gives field widths only'),'Module restart 0.3 s '+inf('not documented')];
const SOURCES=['#OPENGEAR #SERIES/D6207A  #Engineering #TIM #PCB/D6207A operational ctl info 4oct07.doc, … 3mar08.doc, D6207x-CARD.mib, Defining a D6207A MIB.doc, D6207A-card-edge.cdr, D6207A-T6305.pdf, D6207A-FUNCTIONAL.pdf (this folder)',MST+'D6207A.c/.h, dolby.c/.h, v100w.c (firmware — sibling folder, linked)','#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6207A Manual.pdf','#OPEN GEAR - #Engineering/…/SNMP Tools/MIBs (WARD-BECK.mib, enterprise 25030)', 'Artwork '+SIM.year(2026)+': '+SIM.src(ARTCDR.edge,'D6207A-card-edge.cdr')+' and '+SIM.src(ARTCDR.rear,'D6207A - Rear Module Options.cdr')+' → assets/d6207a-edge.svg, d6207a-rear-t6305a.svg (shared with the d6207a plugin)'];
function viewFindings(m){ m.innerHTML=card('What the documents (and the card) are up to', `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>`)+card('Assumptions', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`)+card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${s}</li>`).join('')}</ul>`); }
SIM.register({ id:'d6207a-docs',
  footnotes:[{text:'Card edge and rear panel artwork from the CorelDRAW files (2026|59): D6207A-card-edge.cdr in this folder (2008-05-08) and the 2012 openGear Rear Module Guide.', src:'#OPENGEAR #SERIES/D6207A  #Engineering #TIM #PCB/D6207A-card-edge.cdr'},
    {text:'The guide puts Reserved on rear position 9 and Metadata OUT on 10; this plugin used to have them the other way round.', src:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6207A - Rear Module Options.cdr'},
    {text:'The 2007 sheet in this folder calls position 9 “GPI/O 1” and the module “T6305” (no A).', src:'#OPENGEAR #SERIES/D6207A  #Engineering #TIM #PCB/D6207A-T6305.cdr'},
    {text:'This folder’s card-edge, T6305 and D6207A drawings (and their Backup_of_ copies) are byte-identical to the ones in the Master Functional folder.', src:'#OPENGEAR #SERIES/D6207A - #Master #OPENGEAR/D6207A - #Engineering/D6207A - #Functional/D6207A-card-edge.cdr'},
    {text:'The MIB design note names d6207xInputStatus / d6207xInputStatusEvent, but the MIB has d6207xCardStatus / d6207xCardStatusEvent, and the note spells “d6207xCardMibCompiliances”.', src:'#OPENGEAR #SERIES/D6207A  #Engineering #TIM #PCB/Defining a D6207A MIB.doc'}],
   product:'D6207A docs (TIM)', name:'D6207A docs · Dolby E / AC-3 decoder register map and SNMP MIB, openGear (2007|40)', year:2007,
  folder:'#OPENGEAR #SERIES/D6207A  #Engineering #TIM #PCB', family:'openGear',
  summary:'Documents for the D6207A openGear Dolby E / AC-3 decoder (Ross DED-8420): the AVR ⇄ FPGA register map in two versions, the SNMP MIB and its design note, and the card-edge and T6305 drawings. The model drives the live register map and MIB from a decoder simulation and checks them against the V102 firmware in the sibling Master folder.',
  highlights:['Live Reg 20 and status bytes, both document dates','SNMP MIB tree with live values','Format detection, routing modes and outputs','Dolby E frames locked to video','Where documents, MIB, manual and code disagree'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 video frame',period:()=>FRAME[D.video]},{label:'1 AC-3 frame',period:()=>1536/D.in1.fs},{label:'1 ms',period:()=>1e-3},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.2,'200 ms'],[0.1,'100 ms'],[0.04,'40 ms'],[0.001,'1 ms']], defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:790,h:320,sel:'fpga'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'D6207A',sheets:SHEETS,foot:'REDRAWN from the register-map documents and D6207A.h — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
