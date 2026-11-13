/* =====================================================================
   AV6201A — analog video distribution amplifier, openGear (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   This product folder holds release files only (BOMs, Gerbers, test report). Design and
   AT90CAN128 firmware are in the sibling folder and are used here:
   - #OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201 - #Engineering/AV6201A/ (Software, PCB, Functional, SNMP)
   - #OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/AV6201A Manual.pdf
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

const VARIANT = '1';
/* ================= common model for AV6201A / AV6202A analog video DAs ================= */
const A1 = VARIANT==='1';
const PID = A1?'AV6201A':'AV6202A', OEM = A1?'Cobalt 9231 / Ross ADC-8432':'Cobalt 9233';
const SIB = A1?'#OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201 - #Engineering/AV6201A/':'#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/AV6202A/';
const FW = A1? {ver:'V101', dir:SIB+'Software/atmel/v101'} : {ver:'V200', dir:SIB+'Software/atmel/v200'};
const inf=K.inf, card=K.card;
const STD = {
  NTSC:{name:'NTSC 525/59.94', H:1001/60000/262.5, field:1001/60000, lines:262.5, code:[260,259], sync:-286, burstF:3579545, burstCyc:9, fmt:1, setup:54},
  PAL:{name:'PAL 625/50', H:64e-6, field:0.02, lines:312.5, code:[310,309], sync:-300, burstF:4433619, burstCyc:10, fmt:2, setup:0},
};
const C = { LOOP_T:150e-6, NO_VIDEO:1000, NO_HSYNC:12500, LOSS:2.6 /* dB/100 m at 3.58 MHz, inferred */, T1:96e-6, HEARTBEAT:10000 };
const D = {
  src:{conn:true, std:'NTSC', len:120, hum:60, ext:false},   // ext = cable also terminated elsewhere (looped)
  term:75, bal:true, clamp:true, eq:0, level:0,               // EQ pot = metres compensated, level pot dB (±3)
  ext:'EXT', ref:1, refs:{1:'NTSC', 2:null},                  // AV6202A only: EXT/REF and REF 1/2 jumpers
  alarm:true, rear:'T6301', slot:4, bootAt:null, pformat:0, latchStd:null,
  log:[], canQ:[],
};
const act = K.actor(D);
/* the signal the card actually sees */
function feed(){
  if (!A1 && D.ext==='REF'){ const s=D.refs[D.ref]; return s? {conn:true, std:s, len:2, hum:5, ext:true, ref:true} : {conn:false, std:'NTSC', len:0, hum:0, ext:true, ref:true}; }
  return D.src;
}
function termGain(){ const f=feed(); const n=(D.term===75?1:0)+(f.ext?1:0); return n===0?2: n===1?1: 0.5; }   // number of 75 Ω loads on the line
const chromaLossDb = len=> C.LOSS*len/100;
function eqDb(){ return A1? C.LOSS*D.eq/100 : 0; }
function lvl(){ return Math.pow(10, D.level/20); }
/* gains: luma (LF) and chroma (3.58/4.43 MHz) from input BNC to output BNC */
function gains(){
  const f=feed(); const tg=termGain()*lvl();
  const c = Math.pow(10,(-chromaLossDb(f.len)+eqDb())/20);
  return {luma:tg, chroma:tg*c, humOut: (D.bal?0.03:1) * (A1&&D.clamp?0.02:1)};
}
function syncOk(){ const f=feed(); if (!f.conn) return false; const s=Math.abs(STD[f.std].sync)*gains().luma; return s>100 && s<700; }   // LMH1981 threshold, inferred
function detFmt(){ return syncOk()? STD[feed().std].fmt : 0; }
/* what DashBoard is told: AV6202A V200 latches pformat (see Findings) */
function reportedFmt(){ const f=detFmt(); if (!A1){ if (!f) return 0; return D.pformat||f; } return f; }
function booting(t){ return D.bootAt!==null && t>=D.bootAt && t<D.bootAt+0.15; }
function leds(t){ if (booting(t)) return {s:0,n:0}; const ok=syncOk(); return {s:ok?1:0, n:ok?0:1}; }
/* one composite line, mV, at time tl into the line (input side) */
function lineIn(std, tl, n){
  const S=STD[std], H=S.H*1e6, u=tl*1e6;
  if (u<4.7) return S.sync;
  if (u>=5.3 && u<5.3+S.burstCyc/S.burstF*1e6) return 143*Math.sin(2*Math.PI*S.burstF*tl);
  if (u<10.9 || u>H-1.5) return 0;
  const bar = Math.min(7,Math.floor((u-10.9)/(H-12.4)*8)), Y=[700,620,500,420,300,230,100,0][bar]+(bar===7?S.setup:0)*0, ch=[0,300,420,380,380,420,300,0][bar];
  return (bar===7? S.setup : Math.max(S.setup,Y*0.75)) + ch*0.5*Math.sin(2*Math.PI*S.burstF*tl+bar);
}
/* output line: cable chroma loss, EQ, termination, level, hum, clamp */
function lineOut(t){
  const f=feed(); if (!f.conn || booting(t)) return null; const S=STD[f.std], tl=t%S.H, g=gains();
  const base=lineIn(f.std, tl), chromaPart = base - lumaOf(f.std, tl);
  const hum = f.hum * Math.sin(2*Math.PI*(f.std==='PAL'?50:60)*t) * g.humOut;
  return lumaOf(f.std, tl)*g.luma + chromaPart*g.chroma + hum;
}
function lumaOf(std, tl){ const S=STD[std], u=tl*1e6, H=S.H*1e6; if (u<4.7) return S.sync; if (u<10.9||u>H-1.5) return 0; const bar=Math.min(7,Math.floor((u-10.9)/(H-12.4)*8)); return bar===7? S.setup : Math.max(S.setup,[700,620,500,420,300,230,100,0][bar]*0.75); }
function inSample(t){ const f=feed(); if(!f.conn) return 0; const S=STD[f.std]; return lineIn(f.std, t%S.H) + f.hum*Math.sin(2*Math.PI*(f.std==='PAL'?50:60)*t); }
function outLevel(){ return 1000*gains().luma; }   // mV for a 1 V p-p input
/* main loop: LMH1981_VIDEO_DETECT stalls inside vertical sync */
let SCH=null, SKEY='';
function sched(){
  const key=[syncOk(),feed().std,D.bootAt].join('|'); if (key===SKEY) return SCH; SKEY=key;
  const ps=[]; let t=0, i=0; const ok=syncOk(), S=STD[feed().std];
  while (t<1.0001){ let T=C.LOOP_T, stall=0;
    if (D.bootAt!==null && t>=D.bootAt && t<D.bootAt+0.15){ ps.push({i:-1,t0:t,t1:D.bootAt+0.15,boot:true}); t=D.bootAt+0.15; i=0; continue; }
    if (ok){ const ph=t%S.field, vs=3*S.H; if (ph<vs){ stall=(vs-ph)+11*S.H; T+=stall; } }
    ps.push({i, t0:t, t1:t+T, stall}); t+=T; i++; }
  SCH={ps}; return SCH;
}
function passAt(t){ const ps=sched().ps; let lo=0,hi=ps.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(ps[m].t0<=t) lo=m; else hi=m-1; } return ps[lo]; }
function canList(){ const out=[], ph=(D.slot*0.0173)%0.9; for (let t=ph;t<1;t+=C.HEARTBEAT*C.T1) out.push({t,n:1,dir:'tx',label:'card → MFC: heartbeat'});
  for (let t=0.21;t<1;t+=0.5){ out.push({t,n:1,dir:'rx',label:'MFC → card: GET_PARAM (poll)'}); out.push({t:t+0.0005,n:1,dir:'tx',label:'card → MFC: REPORT_PARAM'}); }
  D.canQ.forEach(t=>{ out.push({t,n:1,dir:'rx',label:'MFC → card: SET_PARAM'}); out.push({t:t+0.0004,n:2,dir:'tx',label:'card → MFC: reply'}); });
  return out.filter(f=>!booting(f.t)).sort((a,b)=>a.t-b.t); }

/* ---------------- actions ---------------- */
const A = {
  plug(){ act(`${D.src.conn?'Unplug':'Plug in'} video IN (rear position 1)`, tr=>{ D.src.conn=!D.src.conn; if (!A1 && D.ext==='REF') tr('EXT/REF jumper is on REF: the rear BNC is not connected to the input amplifier');
    tr(`LMH1981 (U2) ${syncOk()?'separates sync: HSOUT/VSOUT/VFOUT toggle':'sees no sync'} → LMH1981_VIDEO_DETECT ${syncOk()?'finds VSOUT low, counts 11 HSOUT edges shifting VFOUT into video_format = '+STD[feed().std].code[0]:'times out: video_detect_counter climbs to NO_VIDEO_CONSTANT (1000 passes, ≈'+(C.NO_VIDEO*C.LOOP_T*1000).toFixed(0)+' ms '+inf('pass time')+')'}`);
    tr(`REFRESH_LEDS: hsynch_detected ${syncOk()?'YES → SYNCH_LED_ON (PB1), ERROR_LED_OFF':'NO → SYNCH_LED_OFF, ERROR_LED_ON (PB2)'}`);
    if (!A1 && !syncOk()) { D.pformat=0; tr('Dashboard.c: format == 0 → pformat = 0 (the V200 latch is cleared only here)'); }
    else if (!A1 && !D.pformat) { D.pformat=detFmt(); }
    tr(`Card Status OID 2.1 → ${syncOk()?'Locked (green dot)':'No Video Detected (red dot)'}; Video Status → ${['Not Available','NTSC','PAL'][reportedFmt()]}`); }); },
  std(s){ act(`Source standard → ${STD[s].name}`, tr=>{ const was=reportedFmt(); D.src.std=s; if (!A1 && D.ext==='REF') tr('(the card is on REF; this changes the rear input only)');
    tr(`LMH1981 VFOUT now shifts out ${STD[feed().std].code.join(' / ')} lines per field → format = ${['NO_LOCK','NTSC480','PAL576'][detFmt()]}`);
    if (!A1 && was && syncOk()) tr(`Dashboard.c (V200): pformat is already ${['','NTSC','PAL'][D.pformat]} and only resets when format == 0, so DashBoard and SNMP keep reporting ${['','NTSC','PAL'][D.pformat]} (value ${1<<D.pformat}) — see Findings`);
    else tr(`Video Status OID → value 1 << format = ${1<<detFmt()}`); }); },
  cable(len){ act(`Input cable → ${len} m`, tr=>{ D.src.len=len; tr(`Coax loss at ${(STD[feed().std].burstF/1e6).toFixed(2)} MHz ≈ ${chromaLossDb(len).toFixed(1)} dB ${inf('≈2.6 dB/100 m for 75 Ω video coax')}: chroma and burst shrink, luma and sync hardly change`);
    tr(A1? `EQ pot is set for ${D.eq} m → residual ${(chromaLossDb(len)-eqDb()).toFixed(1)} dB at subcarrier` : 'The AV6202A has no cable equaliser (utility DA): the loss passes straight through'); }); },
  eq(m){ act(`EQ pot (0–300 m) → ${m} m`, tr=>{ if(!A1){ tr('No EQ pot on the AV6202A'); return; } D.eq=m; tr(`Variable HF boost ≈ ${eqDb().toFixed(1)} dB at subcarrier in the ISL55002 input stage ${inf('EQ network not traced')}; residual chroma error ${(eqDb()-chromaLossDb(feed().len)).toFixed(1)} dB`); tr('Pure analogue: no firmware involved (the AVR never reads the pots)'); }); },
  level(db){ act(`Level pot → ${db>0?'+':''}${db} dB`, tr=>{ D.level=db; tr(`Output = ${(outLevel()).toFixed(0)} mV p-p for a 1 V input (±3 dB range per the manual). Analogue only — DashBoard cannot see it.`); }); },
  jumper(j, v){ act(`Jumper ${j} → ${v}`, tr=>{
    if (j==='TERM'){ D.term=v==='75'?75:'HiZ'; tr(`Input load ${D.term==='HiZ'?'high impedance (bridging)':'75 Ω'}; the line now has ${(D.term===75?1:0)+(feed().ext?1:0)} termination(s) → level × ${termGain()}`); if(!A1&&D.ext==='REF'&&D.term===75) tr('Manual: “Must be set for HiZ when using the frame reference” — 75 Ω here double-terminates the frame REF for every card in the frame'); }
    if (j==='BAL'){ D.bal=v==='ON'; tr(`${D.bal?'Differential':'Single-ended'} input: common-mode hum is ${D.bal?'rejected (≈30 dB)':'passed'} ${inf('jumper function from the manual, CMRR figure assumed')}`); }
    if (j==='CLAMP'){ if(!A1){ tr('No clamp on the AV6202A'); return; } D.clamp=v==='ON'; tr(`GB4571 (U3) ${D.clamp?'clamps the back porch to 0 V on each line, keyed by LMH1981 BPOUT (U2 pin 13 → U3 pin 4)':'is bypassed: low-frequency hum and tilt pass to the outputs'}`); }
    if (j==='EXT'){ D.ext=v; tr(v==='REF'? `Input taken from frame reference ${D.ref} on the midplane (P2) — black-burst distribution`:'Input taken from the rear-module BNC'); tr(`Sync ${syncOk()?'detected':'not detected'}`); }
    if (j==='REF'){ D.ref=+v; tr(`Frame reference ${v} selected (${D.refs[D.ref]?D.refs[D.ref]+' black burst':'nothing on it'})`); }
    SKEY=''; }); },
  frameRef(n){ act(`Frame REF ${n} ${D.refs[n]?'removed':'connected (NTSC black)'}`, tr=>{ D.refs[n]=D.refs[n]?null:'NTSC'; tr(!A1?`Card is on ${D.ext}${D.ext==='REF'?' '+D.ref:''}: sync ${syncOk()?'detected':'lost'}`:'The AV6201A cannot take its input from the frame reference'); SKEY=''; }); },
  hum(mv){ act(`Ground-loop hum on the feed → ${mv} mV`, tr=>{ D.src.hum=mv; tr(`At the outputs: ${(mv*gains().humOut).toFixed(1)} mV of ${feed().std==='PAL'?50:60} Hz ${A1&&D.clamp?'(clamp + differential input)':D.bal?'(differential input only)':'(no rejection)'}`); }); },
  loop(v){ act(`Feed ${v?'looped through (terminated elsewhere)':'ends at this card'}`, tr=>{ D.src.ext=v; tr(`Terminations on the line: ${(D.term===75?1:0)+(v?1:0)} → ${termGain()===1?'correct level':termGain()>1?'+6 dB (unterminated)':'−6 dB (double terminated)'}`); SKEY=''; }); },
  dash(id, v){
    if (id==='reboot'){ act('DashBoard: Reboot', tr=>{ D.bootAt=SIM.t; SKEY=''; tr('CANMSG_REBOOT → reboot_device → while(1) CLI() → watchdog reset'); tr('main(): CAN_RX (LBK loop-back), wait(3000) × n, slot ADC, CANinit, CAN_TX — ≈150 ms '+inf('same framework as D6201A')); }); return; }
    if (id==='upload'){ act('DashBoard: Upload…', tr=>{ tr(`Ross OGP bootloader (added in ${A1?'V101':'V101'}): START_UPGRADE 0x40 → UPGRADE_PAGE 0x41 … → VERIFY 0x42 → REBOOT 0x43`); tr(`Image: zeuspack → ${A1?'av6201a_v1_01.bin / 9231_v1_01.bin / adc-8432_v1_03.bin':'av6202a_v2_00.bin'}`); }); return; }
    if (id==='alarm'){ act(`DashBoard: Notify on Card Fault → ${v==='1'?'Enabled':'Disabled'}`, tr=>{ D.alarm=v==='1'; tr('CANMSG_SET_PARAM 0x4A, OID 4.0 → smpte_alarm_enabled'); tr('Card Status keeps reporting; only the frame alarm (audible) follows this flag'); D.canQ.push(SIM.t); }); return; }
  },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; tr(`ADC reads AN_SLOTID → ADDRESS_TABLE → slot ${n}; mod_address ${n} in every CAN ID`); if (D.rear==='T6301'&&n%2) tr('T6301A: use even slots (manual)'); }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; tr(RM[r].note); }); },
  reset(){ Object.assign(D,{term:75,bal:true,clamp:true,eq:0,level:0,ext:'EXT',ref:1,alarm:true,rear:'T6301',slot:4,bootAt:null,pformat:0}); Object.assign(D.src,{conn:true,std:'NTSC',len:120,hum:60,ext:false}); D.refs={1:'NTSC',2:null}; D.log=[]; D.canQ=[]; SKEY=''; if(!A1) D.pformat=detFmt(); SIM.refresh(); },
};
D.pformat = A1?0:detFmt();
const RM = {
  T6301:{name:'T6301A', sub:'single card, DFR-8320 (2 slots)', note:'T6301A: IN (1), N/C (2), OUT 1–8 on 3–10.'},
  T6401:{name:'T6401A', sub:'double card, DFR-8320 (2 slots)', note:'T6401A: each card gets IN + OUT 1–4; card 2 on the left column, card 1 on the right (manual figure 2).'},
  T6201:{name:'T6201A', sub:'single card, DFR-8310 only', note:'T6201A: same IN/N/C + 8 outputs layout for the 10-slot DFR-8310.'},
};
/* ---------- panel art (CorelDRAW, converted with Inkscape; positions measured on the converted art) ----------
   AV6201A: card edge AV6201-card-edge.cdr (2008-05-12); T6301A/T6401A from "AV6201A - rear module options.cdr" (2012-01-16);
            T6201 from AV6201-REAR-MODULES.cdr (2008-08-07).
   AV6202A: card edge AV6202A-card-edge.cdr (2008-10-21); T6301A/T6401A from "AV6202A - rear module options.cdr" (2012-01-16);
            T6201 from AV6202-card-edge.cdr (2008-10-21), which in fact holds the T6201/T6301/T6401 sheet, not a card edge. */
const ASSET = 'siumulation-plugins/assets/';
const GUIDE = '#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/';
const ARTDIR = A1? '#OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201 - #Engineering/AV6201A/Functional/' : '#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/AV6202A/Functional/';
const G_T63 = {w:146,h:169, r:5.85, plate:[44,36,52,115], c:[[56.8,58.3],[75.7,58.3],[56.8,77.2],[75.7,77.2],[56.8,96.1],[75.7,96.1],[56.8,115.0],[75.7,115.0],[56.8,133.9],[75.7,133.9]]};
const G_T64 = {w:146,h:169, r:5.85, plate:[47,36,52,115], c:[[60.0,59.4],[78.9,59.4],[60.0,78.3],[78.9,78.3],[60.0,97.2],[78.9,97.2],[60.0,116.1],[78.9,116.1],[60.0,135.0],[78.9,135.0]]};
const ART = A1? {
  edge:{w:170,h:220, vb:'0 0 170 220', led:{s:[127.6,46.3], n:[127.6,25.1]}, pot:{level:[136.4,108.4], eq:[136.4,172.8]}, clamp:[135.8,78.6], eqfix:[135.8,203.9],
        file:'AV6201-card-edge.cdr', dir:ARTDIR, date:'2008|41'},
  rear:{T6301:{...G_T63, file:'AV6201A - rear module options.cdr', dir:GUIDE, date:'2012|45'}, T6401:{...G_T64, file:'AV6201A - rear module options.cdr', dir:GUIDE, date:'2012|45'},
        T6201:{w:195,h:310, r:16, plate:[40,22,108,245], c:[[73.6,54.5],[121.9,54.5],[73.6,96.7],[121.9,96.7],[74.1,139.8],[122.5,139.8],[73.6,181.9],[121.9,181.9],[74.0,223.5],[122.4,223.5]], file:'AV6201-REAR-MODULES.cdr', dir:ARTDIR, date:'2008|41'}}
} : {
  edge:{w:170,h:220, vb:'8 8 160 100', led:{s:[127.6,65.6], n:[127.6,86.7]}, pot:{level:[136.4,33.2]},
        file:'AV6202A-card-edge.cdr', dir:ARTDIR, date:'2008|41'},
  rear:{T6301:{...G_T63, file:'AV6202A - rear module options.cdr', dir:GUIDE, date:'2012|45'}, T6401:{...G_T64, file:'AV6202A - rear module options.cdr', dir:GUIDE, date:'2012|45'},
        T6201:{w:140,h:220, r:11.5, plate:[28,8,82,180], c:[[54.5,31.6],[90.2,31.6],[54.5,62.7],[90.2,62.7],[54.9,94.4],[90.6,94.4],[54.5,125.5],[90.2,125.5],[54.9,156.1],[90.5,156.1]], file:'AV6202-card-edge.cdr', dir:ARTDIR, date:'2008|41'}}
};
const artSrc = a => `${SIM.src(a.dir+a.file, a.file)} (CorelDRAW, ${a.date})`;
function rearSVG(opts){
  opts=opts||{};
  const ok=syncOk(), live=booting(SIM.t)?'off':ok?true:'err', inConn=D.src.conn, R=ART.rear[D.rear];
  let cells;
  if (D.rear==='T6401'){ cells=[{n:2,label:'IN (card 1)',id:'in',conn:inConn,live:inConn?(ok?true:'warn'):undefined},{n:1,label:'IN (card 2)',other:true}]; for(let k=0;k<4;k++){ cells.push({n:4+2*k,label:'OUT '+(k+1),live}); cells.push({n:3+2*k,label:'OUT '+(k+1)+' (c2)',other:true}); } }
  else { cells=[{n:1,label:'IN',id:'in',conn:inConn,live:inConn?(ok?true:'warn'):undefined},{n:2,label:'N/C',kind:'nc'}]; for(let k=0;k<8;k++) cells.push({n:3+k,label:'OUT '+(k+1),live}); }
  const vb = opts.compact? (()=>{ const xs=R.c.map(p=>p[0]), ys=R.c.map(p=>p[1]), m=R.r*1.5; const x0=Math.min(...xs)-m, y0=Math.min(...ys)-m*1.6; return [x0,y0,Math.max(...xs)+m-x0,Math.max(...ys)+m*1.3-y0].map(v=>v.toFixed(1)).join(' '); })() : `0 0 ${R.w} ${R.h}`, r=R.r;
  let s=`<svg class="og62-rear" viewBox="${vb}" style="width:100%;max-width:${opts.compact?160:340}px;display:block;margin:auto;border-radius:6px" role="img" aria-label="${RM[D.rear].name} rear module (CorelDRAW art)">
    <image href="${ASSET}av6201a-rear-${D.rear}.svg" width="${R.w}" height="${R.h}"/>`;
  cells.forEach(c=>{ const [cx,cy]=R.c[c.n-1];
    let g='';
    if (c.conn) g+=`<circle cx="${cx}" cy="${cy}" r="${r*0.75}" fill="#2b5f9e" opacity=".88"/><rect x="${cx-r*0.28}" y="${cy}" width="${r*0.56}" height="${r*1.1}" fill="#2b5f9e" opacity=".88"/>`;
    if (c.kind==='nc'||c.other) g+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" opacity=".13"/>`;
    if (c.live!==undefined) g+=`<circle cx="${cx+r*0.95}" cy="${cy-r*0.95}" r="${Math.max(1.4,r*0.22)}" fill="${c.live===true?'#2f8f46':c.live==='warn'?'#d9a21b':c.live==='err'?'#c0392b':'#7d8286'}"/>`;
    s+=`<g ${c.id?`class="og62-hot" data-jack="${c.id}"`:''}><title>${c.n}: ${c.label}${c.id?(c.conn?' (click to unplug)':' (click to plug in)'):''}</title>${g}<circle class="hl" cx="${cx}" cy="${cy}" r="${r+1}" fill="transparent" stroke="none"/></g>`; });
  return s+'</svg>';
}
function edgeSVG(t){
  const L=leds(t), E=ART.edge;
  const led=(k,on,col,tip)=>{ const [x,y]=E.led[k]; return `<rect x="${x-2.85}" y="${y-6.3}" width="5.7" height="12.6" rx="1" fill="${on?col:'#2b2f2c'}" stroke="#555" stroke-width=".3" ${on?'filter="url(#og62glowE)"':''}><title>${tip} (${on?'lit':'off'})</title></rect>`; };
  const pot=(id,val,lab)=>{ const [x,y]=E.pot[id], a=(-135+270*val)*Math.PI/180; return `<g class="og62-hot" data-pot="${id}" data-half="1"><title>${lab}: click left half to turn down, right half to turn up</title><circle class="hl" cx="${x}" cy="${y}" r="4.6" fill="#9a9a9a" stroke="#333" stroke-width=".4"/><line x1="${x-3.6*Math.sin(a)}" y1="${y+3.6*Math.cos(a)}" x2="${x+3.6*Math.sin(a)}" y2="${y-3.6*Math.cos(a)}" stroke="#111" stroke-width="1.3"/><rect x="${x-11}" y="${y-10}" width="22" height="20" fill="transparent"/></g><text x="${x+11}" y="${y+3}" font-size="7.5" fill="#2b5f9e" font-weight="700">${lab.replace(/^.*\((.*)\)$/,'$1')}</text>`; };
  let s=`<svg viewBox="${E.vb}" style="width:100%;max-width:300px;display:block;margin:auto;border-radius:6px" role="img" aria-label="${PID} card edge (CorelDRAW art)">
    <defs><filter id="og62glowE" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${ASSET}av6201a-edge.svg" width="${E.w}" height="${E.h}"/>
    ${led('s',L.s,'#5dff5a','SYNCH: sync detected')}${led('n',L.n,'#ff4a3d',(A1?'ERROR':'NO SYNCH')+': ERROR_LED (PB2) = no sync')}
    ${pot('level',(D.level+3)/6,`Level POT (${D.level>0?'+':''}${D.level} dB)`)}`;
  if (A1){ s+=pot('eq',D.eq/300,`EQ POT (${D.eq} m)`);
    const [x,y]=E.clamp; s+=`<g class="og62-hot" data-sw="clamp"><title>Clamp switch: click to toggle (${D.clamp?'ON':'OFF'})</title><circle class="hl" cx="${x}" cy="${y}" r="7.3" fill="${D.clamp?'#2b5f9e':'transparent'}" opacity=".55"/><rect x="${x-10}" y="${y-10}" width="34" height="20" fill="transparent"/></g><text x="${x+11}" y="${y+3}" font-size="7.5" font-weight="700" fill="${D.clamp?'#2b5f9e':'#777'}">${D.clamp?'ON':'OFF'}</text>`;
    const [ex,ey]=E.eqfix; s+=`<circle cx="${ex}" cy="${ey}" r="8" fill="transparent"><title>EQ Fixed Switch on the drawing — a jumper (H3) on ISS3, not modelled here</title></circle>`; }
  return s+'</svg>';
}
function jumperHTML(){
  const sel=(j,opts,cur)=>`<label>${j} <select data-j="${j}">${opts.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('')}</select></label>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
    <b>Feed</b><button data-x="plug">${D.src.conn?'Unplug':'Plug in'}</button>${sel('std',['NTSC','PAL'],D.src.std)}
    <label>cable <select data-x="len">${[2,50,120,200,300,450].map(v=>`<option ${v===D.src.len?'selected':''}>${v}</option>`).join('')}</select> m</label>
    <label>hum <select data-x="hum">${[0,20,60,150].map(v=>`<option ${v===D.src.hum?'selected':''}>${v}</option>`).join('')}</select> mV</label>
    <label><input type="checkbox" data-x="loop" ${D.src.ext?'checked':''}> looped (terminated elsewhere)</label></div>
    <div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px"><b>Jumpers</b>${sel('TERM',['75','HiZ'],String(D.term))}${sel('BAL',['ON','OFF'],D.bal?'ON':'OFF')}${A1?sel('CLAMP',['ON','OFF'],D.clamp?'ON':'OFF'):sel('EXT',['EXT','REF'],D.ext)+sel('REF',['1','2'],String(D.ref))}
    ${A1?`<label>EQ pot <select data-x="eq">${[0,50,100,120,150,200,250,300].map(v=>`<option ${v===D.eq?'selected':''}>${v}</option>`).join('')}</select> m</label>`:`<button data-x="ref1">frame REF 1 ${D.refs[1]?'on':'off'}</button><button data-x="ref2">frame REF 2 ${D.refs[2]?'on':'off'}</button>`}
    <label>Level <select data-x="level">${[-3,-2,-1,0,1,2,3].map(v=>`<option ${v===D.level?'selected':''}>${v}</option>`).join('')}</select> dB</label>
    <label>Rear <select data-x="rear">${Object.keys(RM).map(k=>`<option value="${k}" ${k===D.rear?'selected':''}>${RM[k].name}</option>`).join('')}</select></label><button data-x="reset">Defaults</button></div>`;
}
function dashHTML(){
  const ok=syncOk(), rf=reportedFmt();
  const tabs=[{name:'Card Info',rows:[{type:'text',label:'Product',value:PID,oid:'1.5'},{type:'text',label:'Name',value:'Analog Video Distribution Amplifier',oid:'1.6'},{type:'text',label:'Supplier',value:'Ward-Beck Systems Ltd.',oid:'1.2'},{type:'text',label:'Software Rev.',value:FW.ver,oid:'1.11'},{type:'text',label:'Web site',value:'www.ward-beck.com',oid:'1.4'}]},
    {name:A1?'Card Status':'Input Signal',rows:[{type:'status',label:'Card Status',value:ok?'Locked':'No Video Detected',level:ok?'ok':'err',oid:'2.1'},{type:'status',label:'Video Status',value:['Not Available','NTSC','PAL'][rf],level:rf?(rf!==detFmt()?'warn':'ok'):'err',oid:A1?'2.2':'2.4'},{type:'text',label:'raw value (1 << format)',value:'0x'+(1<<rf).toString(16).padStart(4,'0')}]},
    {name:'Card Settings',rows:[{type:'combo',id:'alarm',label:'Notify on Card Fault',value:D.alarm?1:0,options:[[1,'Enabled'],[0,'Disabled']],oid:'4.0'}],note:'Level, EQ and clamp are analogue pots and jumpers: DashBoard can only monitor this card.'}];
  if (!A1) tabs.push({name:'SNMP (V200)',rows:[{type:'text',label:'SNMP base OID',value:'1.3.6.1.4.1.25030.1.1.6'},{type:'text',label:'av6202VideoStatus',value:`${1<<rf} (${['No_Video_Detected','NTSC','PAL'][rf]})`},{type:'text',label:'AV6202VideoStatusEvent',value:'notification 0.3 on change'},{type:'text',label:'AV6202NumberOfCards',value:'1'}],note:'From AV6202-CARD.mib (SNMP/v200) and MESSAGE_CREATOR_GET_SNMP_BASE_RESPONSE in Dashboard.c.'});
  return K.dashHTML({key:PID, title:`Slot ${D.slot}: ${PID}`, alarm:!ok&&D.alarm, tree:[{name:'DFR-8320 frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: ${PID}`,lvl:1,sel:true}], tabs, footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload…'}], foot:FW.ver});
}
function bindAll(root){
  K.bind(root,{jack:{in:()=>A.plug()}, sw:{clamp:()=>A.jumper('CLAMP',D.clamp?'OFF':'ON')}, slot:n=>A.slot(n), dash:(id,v)=>A.dash(id,v)});
  root.querySelectorAll('[data-pot]').forEach(g=>g.addEventListener('click',e=>{ const r=g.getBoundingClientRect(), up=(e.clientX-r.left)>r.width*(g.dataset.half?0.5:0.12); const id=g.dataset.pot;
    if (id==='level') A.level(Math.max(-3,Math.min(3,D.level+(up?1:-1)))); else A.eq(Math.max(0,Math.min(300,D.eq+(up?50:-50)))); }));
  root.querySelectorAll('[data-j]').forEach(s=>s.onchange=()=>{ if (s.dataset.j==='std') A.std(s.value); else A.jumper(s.dataset.j, s.value); });
  root.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x; const f=()=>{ if(x==='plug')A.plug(); else if(x==='len')A.cable(+el.value); else if(x==='hum')A.hum(+el.value); else if(x==='loop')A.loop(el.checked); else if(x==='eq')A.eq(+el.value); else if(x==='level')A.level(+el.value); else if(x==='rear')A.rear(el.value); else if(x==='ref1')A.frameRef(1); else if(x==='ref2')A.frameRef(2); else if(x==='reset')A.reset(); };
    if (el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; });
}
/* scope: one line in and out */
function drawLine(cv, t){
  const f=feed(), S=STD[f.std], {c,w}=SIM.canvas(cv,190), t0=t-(t%S.H), N=Math.min(1600,w*2);
  const Y=v=>110-v/1000*130; c.strokeStyle=SIM.css('--grid'); [0,-300,700].forEach(v=>{ c.beginPath(); c.moveTo(40,Y(v)); c.lineTo(w-6,Y(v)); c.stroke(); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(v+' mV',2,Y(v)+3); });
  const plot=(fn,col)=>{ c.strokeStyle=col; c.lineWidth=1.2; c.beginPath(); for(let i=0;i<=N;i++){ const tt=t0+S.H*i/N, v=fn(tt); const x=40+(w-46)*i/N; i?c.lineTo(x,Y(v??0)):c.moveTo(x,Y(v??0)); } c.stroke(); };
  plot(inSample, SIM.css('--ink2')); if (lineOut(t)!==null) plot(lineOut, SIM.css('--accent'));
  const px=40+(w-46)*((t%S.H)/S.H); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,10); c.lineTo(px,180); c.stroke();
  c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`line ${Math.floor((t%S.field)/S.H)+1} of field ${Math.floor(t/S.field)} · grey = at the input BNC · green = at an output · H = ${SIM.fmtDur(S.H)}`,40,186);
}
function lanes(){
  const css=SIM.css, f=feed(), S=STD[f.std], ls=[];
  ls.push({label:`${f.std} fields / H lines`, h:30, draw(c,X,t0,t1,y,h){ if(!f.conn){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText('no input',X(t0)+6,y+h/2+4); return; } const sp=t1-t0; if (sp<60*S.H) SIM.pulses(c,X,t0,t1,y+h*.45,h*.55,S.H,0,4.7e-6,css('--ink2'),'H sync'); SIM.pulses(c,X,t0,t1,y,h*(sp<60*S.H?.5:1),S.field,0,3*S.H,css('--accent2'),'fields'); }});
  ls.push(K.waveLane('Composite at an output (mV/1000)', t=>{ const v=lineOut(t); return v==null?0:v/800; }, {h:40}));
  ls.push(K.boolLane('LMH1981 VSOUT low (vertical sync)', t=>syncOk() && (t%S.field)<3*S.H, css('--accent2')));
  ls.push({label:'LMH1981 BPOUT → clamp pulse', h:20, draw(c,X,t0,t1,y,h){ if(!(syncOk()&&A1&&D.clamp)){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(A1?'clamp off / no sync':'no clamp on this card',X(t0)+6,y+h/2+4); return; } SIM.pulses(c,X,t0,t1,y,h,S.H,5.0e-6,4e-6,css('--warn'),'back-porch clamp pulses'); }});
  ls.push({label:'AVR main loop (LMH1981_VIDEO_DETECT)', h:30, draw(c,X,t0,t1,y,h){ const ps=sched().ps, px=X(t0+C.LOOP_T)-X(t0); let shown=0;
    for (const p of ps){ if (p.t1<t0||p.t0>t1) continue; shown++; c.fillStyle=p.boot?css('--warn'):p.stall?css('--warn'):(p.i%2?css('--accent'):css('--accent2')); c.globalAlpha=.75; c.fillRect(X(p.t0),y+3,Math.max(1,X(p.t1)-X(p.t0)-0.5),h-6); c.globalAlpha=1;
      if (p.stall && X(p.t1)-X(p.t0)>200){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('waiting in VSOUT, then counting 11 HSOUT edges (VFOUT → video_format)', X(p.t0)+4, y+h/2+3); } }
    if (px<2){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${shown} passes in view; orange = stalled on vertical sync (once per field)`, X(t0)+6, y+h/2+4); } }});
  ls.push(K.canLane(canList(),'CAN 1 Mbit/s (CAN.c)'));
  ls.push(K.boolLane('SYNCH LED', t=>leds(t).s, '#2f8f46'));
  ls.push(K.boolLane(A1?'ERROR LED':'NO SYNCH LED', t=>leds(t).n, '#c0392b'));
  return ls;
}
function pathSVG(){ const f=feed(), g=gains(), fL=chromaLossDb(f.len), db=v=>20*Math.log10(v);
  return K.levelSVG([
    {name:'Source (1 V p-p, 75 Ω out)', level:0},
    {name:`Termination (${D.term===75?'75 Ω':'Hi-Z'}${f.ext?' + external':''})`, level:db(termGain()), note:termGain()===1?'one 75 Ω load: correct':termGain()>1?'unterminated: +6 dB':'double-terminated: −6 dB'},
    {name:`Chroma after ${f.len} m coax`, level:db(termGain())-fL, col:'var(--warn)', note:inf('2.6 dB/100 m at subcarrier')},
    ...(A1?[{name:`EQ pot (${D.eq} m)`, level:db(termGain())-fL+eqDb(), col:'var(--accent2)'}]:[]),
    {name:`Level pot ${D.level>0?'+':''}${D.level} dB — luma`, level:db(g.luma)},
    {name:'Level pot — chroma', level:db(g.chroma), note:Math.abs(db(g.chroma)-db(g.luma))>0.5?'chroma/luma gain error '+(db(g.chroma)-db(g.luma)).toFixed(1)+' dB':'flat'},
    {name:`Hum at output (${(f.hum*g.humOut).toFixed(1)} mV)`, level:f.hum? db(f.hum*g.humOut/1000):null, col:'var(--bad)', note:`${A1&&D.clamp?'clamp + ':''}${D.bal?'differential':'single-ended'}`},
  ], {lo:-40, hi:8, unit:'dB rel. 1 V', clip:3, clipLabel:'+3 dB: out of spec'}); }

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('DashBoard (redrawn) — monitoring only', `<div id="dash"></div>`)}${card('Feed, jumpers and pots', `<div id="ctl"></div>`)}
    ${card('Scope: one video line at the playhead', `<canvas id="scope"></canvas>`)}</div>
    <div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div><div class="small muted">${artSrc(ART.edge)}</div>`)}${card('Rear module', `<div id="rear"></div><div class="small muted">T6301A / T6401A: ${artSrc(ART.rear.T6301)} · T6201: ${artSrc(ART.rear.T6201)}</div>`)}</div>
    ${card('What the card did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
    ${card('Frame — click a slot', `<div id="frame"></div>`)}
    ${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas><p class="small muted">The AVR loop is ≈${C.LOOP_T*1e6} µs per pass ${inf('no timer paces it')} but LMH1981_VIDEO_DETECT busy-waits while VSOUT is low and then for 11 H lines, so once per field one pass stretches to ≈${((3+11)*STD[feed().std].H*1e3).toFixed(2)} ms (orange). The video itself never touches the processor: the amplifiers are purely analogue.</p>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#ctl').innerHTML=jumperHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG();
    m.querySelector('#frame').innerHTML=K.frameSVG({cardSlots:[D.slot], cover:D.rear==='T6401'?[]:[D.slot%2?D.slot+1:D.slot-1], label:PID, ledOn:leds(t).s});
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    const p=passAt(t), f=feed(), S=STD[f.std], g=gains();
    m.querySelector('#insp').innerHTML=`<table class="kv"><tr><th>Input</th><td class="mono">${f.ref?'frame REF '+D.ref:'rear BNC'} · ${f.conn?S.name:'none'} · line ${Math.floor((t%S.field)/S.H)+1}</td></tr>
      <tr><th>Gain luma / chroma</th><td class="mono">${(20*Math.log10(g.luma)).toFixed(2)} dB / ${(20*Math.log10(g.chroma)).toFixed(2)} dB</td></tr>
      <tr><th>Output sync tip</th><td class="mono">${(STD[f.std].sync*g.luma).toFixed(0)} mV (nominal ${STD[f.std].sync})</td></tr>
      <tr><th>AVR</th><td class="mono">${p.boot?'booting':'pass #'+p.i}${p.stall?' — inside LMH1981_VIDEO_DETECT (VSOUT)':''}</td></tr>
      <tr><th>format / hsynch_detected</th><td class="mono">${['NO_LOCK','NTSC480','PAL576'][detFmt()]} / ${syncOk()?'YES':'NO'}${!A1?' · pformat '+D.pformat:''}</td></tr></table>`;
    bindAll(m); drawLine(m.querySelector('#scope'), t); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second, broken down', `<div id="lad"></div>`)}<div class="grid2">${card('Signal path, stage by stage', `<div id="path"></div>`)}${card('As seen on the card edge and DashBoard', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="edge"></div><div id="dash"></div></div>`)}</div>${card('Zoom: one line', `<canvas id="scope"></canvas>`)}`;
  const draw=()=>{ const f=feed(), S=STD[f.std];
    const rows=[['Fields', (1/S.field).toFixed(3), SIM.fmtDur(S.field), 'LMH1981 VSOUT; AVR stalls here once per field'],['Frames', (0.5/S.field).toFixed(3), SIM.fmtDur(2*S.field), 'two interlaced fields'],['Lines (H)', Math.round(1/S.H).toLocaleString(), SIM.fmtDur(S.H), `${S.lines*2} per frame; LMH1981 HSOUT`],
      ['Colour subcarrier cycles', (S.burstF/1e6).toFixed(6)+' M', SIM.fmtDur(1/S.burstF), `${S.burstCyc} cycles of burst on each back porch`],['Clamp pulses', A1&&D.clamp?Math.round(1/S.H).toLocaleString():'—', A1&&D.clamp?SIM.fmtDur(S.H):'', A1?'GB4571 keyed by BPOUT':'no clamp on AV6202A'],
      ['AVR loop passes', '≈'+Math.round(sched().ps.length).toLocaleString()+' '+inf('pass time'), '', 'about '+Math.round(1/S.field)+' of them stretched by vertical sync'],['CAN heartbeat', (1/(C.HEARTBEAT*C.T1)).toFixed(2), SIM.fmtDur(C.HEARTBEAT*C.T1), 'CAN.c TX_HEARTBEAT'],['No-video timeout', '', SIM.fmtDur(C.NO_VIDEO*C.LOOP_T), 'NO_VIDEO_CONSTANT = 1000 passes before format = NO_LOCK']];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#path').innerHTML=pathSVG(); m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); m.querySelector('#dash').innerHTML=dashHTML(); bindAll(m); drawLine(m.querySelector('#scope'), SIM.t); };
  SIM.on('time', draw);
}
const BLOCKS = {
  rear:{x:10,y:30,w:140,h:80,t:'Rear module',s:[RM[D.rear].name,'IN + 8 × OUT (BNC)'],d:'Passive T6201A / T6301A / T6401A BNC modules (manual figure 2).'},
  ...(A1?{}:{ref:{x:10,y:150,w:140,h:70,t:'Midplane REF 1/2',s:['frame black burst','EXT/REF + REF 1/2 jumpers'],d:'AV6202A only: jumpers (AV6202A BERGS.cdr: EXT/REF, REF 1/2) take the input from a frame reference instead of the rear BNC — black-burst distribution.'}}),
  inp:{x:200,y:30,w:170,h:90,t:'Input stage',s:['TERM 75 Ω / Hi-Z','BAL (differential)',A1?'EQ pot 0–300 m':'no EQ'],d:A1?'Differential input amplifier (ISL55002, schematic symbol EL2244) with a 2 K trimpot cable equaliser (EQ) and the TERM/BAL jumpers.':'Differential input amplifier (EL2244) with TERM and BAL jumpers. No equaliser on this “utility” DA.'},
  clamp:{x:200,y:160,w:170,h:70,t:A1?'GB4571 clamp (U3)':'(no clamp)',s:A1?['back-porch clamp','keyed by BPOUT']:['AV6202A has no GB4571'],d:A1?'Gennum GB4571 video buffer with DC restoration, switched by the CLAMP jumper; its clamp pulse is the LMH1981 back-porch output (netlist: U2 pin 13 → U3 pin 4).':'The AV6202 ISS2 BOM has no GB4571: no input clamp.',dim:!A1},
  lvl:{x:420,y:30,w:150,h:70,t:'Level pot',s:['±3 dB','LVL 2 K trimpot'],d:'Front-edge level trim. Analogue only; the firmware never reads it.'},
  drv:{x:420,y:140,w:150,h:90,t:A1?'ISL55002 ×4':'EL2244 ×3',s:['8 × 75 Ω outputs','1 V p-p terminated'],d:'Dual op-amps driving the eight 75 Ω outputs (manual spec: diff. gain/phase better than 0.15 %/0.15°).'},
  sync:{x:200,y:270,w:170,h:80,t:'LMH1981 (U2)',s:['HSOUT, VSOUT, VFOUT','BPOUT, CSOUT, OEOUT'],d:'National LMH1981 sync separator on the input video. Its outputs go to the AVR (PA2–PA7) and, on the AV6201A, BPOUT keys the clamp.'},
  mcu:{x:420,y:270,w:150,h:80,t:'AT90CAN128 (U8)',s:['LMH1981_VIDEO_DETECT','SYNCH / ERROR LEDs'],d:'Watches sync, works out NTSC/PAL from the VFOUT line-count code (260/259, 310/309 …) and reports it to DashBoard over CAN. It has no control over the video path.'},
  can:{x:620,y:270,w:130,h:80,t:'SN65HVD233 (U7)',s:['CAN 1 Mbit/s'],d:'CAN transceiver to the frame midplane.'},
};
const WIRES=[['rear','inp','IN'],...(A1?[]:[['ref','inp','REF']]),['inp','clamp',''],['clamp','lvl',''],['inp','lvl',''],['lvl','drv',''],['drv','rear','8 OUT'],['inp','sync','video'],['sync','clamp','BPOUT'],['sync','mcu','H/V/VF'],['mcu','can','CAN']];
function viewBlock(m){ K.blockView(m,{blocks:BLOCKS, wires:WIRES, w:770, h:370, sel:'sync', side:card('In one sentence', `<p>The video path is purely analogue (input amplifier${A1?', equaliser, clamp':''}, level trim, eight drivers); the AVR only watches the sync separator and tells DashBoard whether there is video and which standard.</p><p class="small muted">Sources: ${PID} Manual.pdf (figure 1), ${A1?'AV6201-iss3.net, AV6201A-ISS3_ISS4-BOM Final.xlsx':'AV6202-iss2.net / .bom'}.</p>`)}); }
const SHEETS=[
  {name:'1 · AVR', note:`AT90CAN128 pins from ${A1?'AV6201-iss3.net':'AV6202-iss2.net'}; port bits from ${PID}.h / LMH1981.h.`, svg:()=>K.chip(330,60,200,'U8 AT90CAN128',[['11 PB1','SYNCH (LED1 green)'],['12 PB2','NO_SYNCH (LED2 red)'],['49 PA2','HSYNCH (HSOUT)'],['48 PA3','VSOUT'],['47 PA4','FSOUT (VFOUT)'],['46 PA5','CSOUT'],['44 PA7','OEOUT'],['59/60/61','AN_BMID2/AN_BMID/AN_SLOTID']],[['30 PD5','CAND'],['31 PD6','CANR'],['32 PD7','LBK'],['XTAL','X1 8 MHz'],['JTAG','JTAG1 (HLE 2×5)']],'8 MHz · ICCAVR 7.15')},
  {name:'2 · Sync separator', note:'LMH1981 TSSOP14 pins from the netlist (net FSOUT is the LMH1981 VFOUT pin). On the AV6201A, BPOUT also goes to the GB4571 clamp (U3 pin 4).', svg:()=>K.chip(330,60,190,'U2 LMH1981',[['1','video in (via coupling)'],['3/6/11','+3V3'],['2/5/10','GNDD']],[['7 HSOUT','HSYNCH → PA2'],['8 VSOUT','VSOUT → PA3'],['9 VFOUT','FSOUT → PA4'],['12 CSOUT','CSOUT → PA5'],['13 BPOUT','BPOUT'+(A1?' → U3 clamp':'')],['14 OEOUT','OEOUT → PA7']],'video sync separator')},
  {name:'3 · Video path', note:A1?'ISS3/ISS4: U1, U4, U5, U6 ISL55002IBZ (placed on EL2244 footprints), U3 GB4571, EQ and LVL 2 K trimpots, jumpers TERM, BAL, CLAMP (BOM note: H1–H3 silkscreened TERM, BAL, CLAMP, EQ).':'ISS2: U1, U5, U6 EL2244, LVL pot, jumpers TERM, BAL, H4 (EXT/REF, REF 1/2). No clamp, no EQ.', svg:()=>{ let s=''; const st=[['IN BNC',40],['TERM/BAL',150],[A1?'EQ + U1':'U1',270],[A1?'GB4571':'—',390],['LVL',500],[A1?'U4/U5/U6':'U5/U6',610]]; st.forEach(([n,x],i)=>{ s+=`<rect x="${x}" y="150" width="90" height="50" rx="6" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+45}" y="180" text-anchor="middle" font-size="12" fill="var(--ink)">${n}</text>`; if(i) s+=`<line x1="${x-30}" y1="175" x2="${x}" y2="175" stroke="var(--ink)"/>`; }); for(let k=0;k<8;k++) s+=`<line x1="700" y1="175" x2="760" y2="${110+k*18}" stroke="var(--ink)"/><text x="765" y="${114+k*18}" font-size="10.5" fill="var(--accent2)">OUT ${k+1}</text>`; return s+`<text x="40" y="320" font-size="11" fill="var(--ink2)">Block-level redraw: amplifier internals and EQ network values were not traced from the P-CAD .sch.</text>`; }},
];
function viewSchem(m){ K.schemView(m,{product:PID, sheets:SHEETS, foot:`Original P-CAD design: ${SIB}PCB/${A1?'AV6201-iss3.sch/.net':'AV6202-iss3.sch, OBSOLETE/ISS2/AV6202-iss2.net'}. These sheets are REDRAWN from netlist names, not the original CAD.`}); }
function viewSoft(m){
  m.innerHTML=`<div class="grid2">${card('Main loop (v100w.c) — what is left of the D6201A template', `<div id="flow"></div>`)}<div>${card('LMH1981_VIDEO_DETECT state machine', `<div id="fsm"></div>`)}${card('Format codes (LMH1981.c)', `<div id="codes"></div>`)}</div></div>
    ${card('How the controls did things', `<ol class="small"><li><b>Level / EQ pots, TERM, BAL${A1?', CLAMP':', EXT/REF'} jumpers</b> → analogue only; no code path. DashBoard cannot see or change them.</li><li><b>Video in / out</b> → LMH1981 → PA2–PA4 → LMH1981_VIDEO_DETECT → hsynch_detected → REFRESH_LEDS (PB1/PB2) → PARAMETER_UPDATE → CAN REPORT_PARAM (OID ${A1?'2.1/2.2':'2.1/2.4'}).</li><li><b>Notify on Card Fault</b> → SET_PARAM OID 4.0 → smpte_alarm_enabled.</li>${A1?'':'<li><b>SNMP (V200)</b> → DashBoard asks GET_SNMP_OID → card answers base “25030.1.1.6”; the frame controller maps the OIDs to AV6202-CARD.mib.</li>'}</ol>`)}`;
  const draw=()=>{ const p=passAt(SIM.t);
    const steps=[['WDR',1],['// CS8416_READ_LOCK_ALL (commented out)',0],['// PROCESS_EQ_PUSHBUTTONS · PROCESS_MODES · READ_DIP_SWITCHES (commented out)',0],['hsynch_detected = LMH1981_VIDEO_DETECT(hsynch_detected)',1],['REFRESH_LEDS',1],['// ALTERA_write / ALTERA_read (commented out)',0],['CAN_FUNCTIONS',1]];
    m.querySelector('#flow').innerHTML=`<svg viewBox="0 0 540 ${steps.length*40+40}" style="width:100%">${steps.map((s,j)=>{ const on=(j===3&&p.stall)||(j===4&&!p.stall&&!p.boot); return `<rect x="10" y="${10+j*40}" width="510" height="30" rx="6" fill="${on?'var(--accent)':s[1]?'var(--panel2)':'var(--bg)'}" stroke="var(--line)" ${s[1]?'':'stroke-dasharray="4 3"'}/><text x="20" y="${30+j*40}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':s[1]?'var(--ink)':'var(--ink2)'}">${s[0]}</text>`; }).join('')}<text x="10" y="${steps.length*40+30}" font-size="11" fill="var(--ink2)">${p.boot?'booting':'pass #'+p.i+(p.stall?' — stalled in vertical sync':'')}</text></svg>`;
    const st=!syncOk()?'no sync: counting to NO_VIDEO_CONSTANT':p.stall?'VSOUT low → count HSOUT, shift VFOUT':'between fields';
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 520 100" style="width:100%">${[['wait VSOUT low',20],['3 HSOUT edges',150],['11 lines: shift VFOUT',280],['decode format',410]].map(([n,x],i)=>`<rect x="${x}" y="30" width="105" height="40" rx="16" fill="${(i===2&&p.stall)||(i===0&&!p.stall)?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+52}" y="54" text-anchor="middle" font-size="10.5" fill="var(--ink)">${n}</text>`).join('')}</svg><p class="small mono">${st}. NO_HSYNCH_CONSTANT = 12 500 spins before giving up inside a field.</p>`;
    m.querySelector('#codes').innerHTML=`<table class="kv"><tr><th>video_format</th><th>format</th><th>DashBoard</th></tr>${[['260 / 259','NTSC480 (1)','NTSC'],['310 / 309','PAL576 (2)','PAL'],['522','PRO480 (3)','480p'],['622','PRO576 (4)','576p'],['747','PRO720 (5)','720p'],['560 / 559','INT1080 (6)','1080i'],['1122','PRO1080 (7)','1080p'],['anything else','detect = YES, format unchanged','(see Findings)']].map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table><p class="small muted">Now: ${['NO_LOCK','NTSC480','PAL576'][detFmt()]}, reported value 1 << format = ${1<<reportedFmt()}.</p>`; };
  SIM.on('time', draw);
}
const TUT={i:0};
function tutSide(){ return card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div class="small muted">Card edge: ${artSrc(ART.edge)} · rear: ${artSrc(ART.rear[D.rear])}</div><div id="ctl" style="margin:8px 0"></div><canvas id="sc"></canvas><div id="td" style="margin-top:8px"></div>`); }
function tutBind(r){ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#ctl').innerHTML=jumperHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); drawLine(r.querySelector('#sc'), SIM.t); }
function viewTut(m){ K.tutorialView(m,{D, st:TUT, title:`Tutorial — setting up the ${PID} (from the ${PID} manual)`, L:LESSONS, side:tutSide, bindSide:tutBind, reset:A.reset}); }
function viewFindings(m){ m.innerHTML=card(`What the ${PID} is up to`, `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>`)+card('Assumptions in this simulation', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`)+card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${s}</li>`).join('')}</ul>`); }
const ASSUME=[`Coax loss ≈ ${C.LOSS} dB per 100 m at the colour subcarrier ${inf('typical 75 Ω video cable; the manual only says “EQ 0–300 m”')}; luma is treated as lossless.`,
  `AVR pass ≈ ${C.LOOP_T*1e6} µs ${inf('no timer paces the loop')}; VSOUT low ≈ 3 lines.`,
  `LMH1981 detects sync between 100 and 700 mV of sync amplitude ${inf('datasheet-style threshold, not in the archive')}.`,
  `${D.bal?'':''}Differential input rejects common-mode hum by ≈30 dB${A1?'; the clamp removes another ≈34 dB':''} ${inf('no CMRR or clamp figures in the archive')}.`,
  'The test line is a stylised colour-bar line; sync, burst timing and levels follow NTSC/PAL practice.'];
/* ---------------- AV6201A specifics ---------------- */
const LESSONS=[
  {title:'Meet the AV6201A', body:`<p>The AV6201A is an openGear <b>analog video distribution amplifier</b>: one composite (NTSC or PAL) input, eight identical 75 Ω outputs. It has a <b>differential input</b>, a <b>clamp</b> to remove hum, a <b>cable equaliser</b> (0–300 m) and a <b>±3 dB level</b> trim.</p><p>The video path is all analogue. A small processor only watches for sync and reports to DashBoard.</p>`, check:()=>true, auto:true},
  {title:'1 · Feed it video', body:`<p>Plug a video source into <b>IN</b> (position 1 of the rear module). The green <b>SYNCH</b> LED lights and DashBoard shows <b>Locked</b> with <b>Video Status: NTSC</b>.</p>`, check:()=>syncOk(), hint:'Click BNC 1 or “Plug in”.'},
  {title:'2 · Terminate once', body:`<p>A video line must be terminated in 75 Ω exactly once. If the feed is <b>looped</b> on to other equipment that terminates it, set the <b>TERM</b> jumper to <b>HiZ</b>. Tick “looped”, then set TERM to HiZ, and watch the output level return to 1 V.</p>`, check:()=>D.src.ext&&D.term==='HiZ', hint:'Tick “looped”, then TERM → HiZ.'},
  {title:'3 · Long cable', body:`<p>Set the cable to <b>200 m</b>. Look at the scope: the colour burst and the chroma on the bars shrink; sync and brightness barely change. That is high-frequency cable loss.</p>`, check:()=>D.src.len>=200, hint:'cable → 200 m.'},
  {title:'4 · Equalise', body:`<p>Turn the <b>EQ pot</b> to match the cable length (200 m). The chroma comes back to full size. The pot is calibrated in metres, 0 to 300.</p>`, check:()=>Math.abs(D.eq-D.src.len)<=25&&D.src.len>=200, hint:'EQ pot → 200 m.'},
  {title:'5 · Kill the hum', body:`<p>Set the hum on the feed to <b>150 mV</b> and switch the <b>CLAMP</b> off: the whole line wobbles up and down at mains rate. Turn <b>CLAMP</b> back on: the GB4571 pulls each line’s back porch to 0 V, keyed by the LMH1981’s back-porch pulse.</p>`, check:()=>D.src.hum>=150&&D.clamp, hint:'hum → 150 mV, then Clamp ON.'},
  {title:'6 · Trim the level', body:`<p>Use the <b>Level pot</b> to set the outputs <b>1 dB</b> hot. The pot covers ±3 dB.</p>`, check:()=>D.level===1, hint:'Level → 1 dB (or click the right half of the Level pot).'},
  {title:'7 · Lose the input', body:`<p>Unplug the input. <b>SYNCH</b> goes off and the red <b>ERROR</b> LED lights. DashBoard reports <b>No Video Detected</b>. If “Notify on Card Fault” is enabled, the frame raises its alarm.</p>`, check:()=>!D.src.conn, hint:'Unplug BNC 1.'},
  {title:'Done', body:`<p>That is every control on the AV6201A. See <b>Software</b> for the busy-wait sync detector and <b>Findings</b> for the leftovers from the AES DA firmware it was copied from.</p>`, check:()=>true, auto:true},
];
const FINDINGS=[
  `<b>Firmware copied from the D6201A AES DA.</b> AV6201A.c still says “D6201A.C” in its header; v100w.c keeps the D6201A calls (CS8416_READ_LOCK_ALL, PROCESS_EQ_PUSHBUTTONS, PROCESS_MODES, ALTERA_write) commented out, and Dashboard.c carries unused “External AES Input 1/2”, “Locked-Dolby E/AC3” and “VANC Detected Line 1…” strings.`,
  `<b>The README overstates the firmware.</b> It says the AVR “handles front-edge EQ pushbuttons”; in V101 PROCESS_EQ_PUSHBUTTONS is commented out, and the card edge has an EQ <i>pot</i>, not a switch. EQ, level and clamp are purely analogue.`,
  `<b>Amplifier part changed.</b> README and schematic symbols say Elantec EL2244; the ISS3/ISS4 final BOM fits Intersil <b>ISL55002IBZ</b> on those footprints (U1, U4, U5, U6) plus a Gennum <b>GB4571</b> (U3) for the clamp.`,
  `<b>Clamp keyed by the sync separator.</b> The netlist ties LMH1981 BPOUT (U2 pin 13) to GB4571 pin 4, so the clamp only works while the LMH1981 sees sync.`,
  `<b>LED colour mismatch.</b> The manual's LED table says NO SYNCH is green; the BOM fits a red LED (LED2) and the functional diagram says “NO SYNCH RD”. The firmware calls it ERROR_LED (PB2), and the card-edge drawing labels it “ERROR LED”.`,
  `<b>Unknown formats count as video.</b> LMH1981_VIDEO_DETECT ends with <span class="mono">else { detect = YES; }</span>: any line-count code that is not in the table still counts as “detected” and leaves <span class="mono">format</span> unchanged, so a corrupted reading never turns the ERROR LED on.`,
  `<b>Card-edge drawing vs ISS3 board.</b> AV6201-card-edge.cdr shows an “EQ Fixed Switch” and a “Clamp Switch”; the ISS3/4 BOM has jumpers (H1–H3, TERM) silkscreened TERM, BAL, CLAMP, EQ instead.`,
  `<b>Version numbers.</b> Source is V101 (bootloader + DataSafe, 2009|42-11-10) but the Ross zeuspack config names the image adc-8432_v1_03.bin.`,,
  `<b>Artwork 2026|59: card edge and rear modules now from CorelDRAW.</b> Card edge from ${artSrc(ART.edge)}; T6301A and T6401A from ${artSrc(ART.rear.T6301)}; T6201 from ${artSrc(ART.rear.T6201)} (the 2012 guide no longer shows T6201). The 2012 guide labels T6301A position 2 “Not Connected” (the 2008 sheet said “IN”) and numbers the outputs OUT 1–4 down the left column and OUT 5–8 down the right, while the 2008 sheet and this simulation alternate OUT1/OUT2 across each row. The card-edge art puts ERROR above SYNCH, the reverse of the ISS3 board, and draws Clamp and EQ Fixed as push-buttons where ISS3 has jumpers. Text in the guide is live Arial; libcdr kept the words, not their alignment.`
];
const SOURCES=[`${SIB}Software/atmel/v101/AV6201A.c/.h, v100w.c, LMH1981.c/.h, Dashboard.c (firmware — sibling folder, linked)`,`${SIB}Software/AV6201A SOFTWARE HISTORY.xls`,`${SIB}PCB/AV6201-iss3.net, .bom · Functional/AV6201-card-edge.cdr, AV6201-REAR-MODULES.pdf`,
  '#OPENGEAR #SERIES/AV6201A - #Master #OPENGEAR/AV6201A - #Master/AV6201A-ISS3_ISS4-BOM Final.xlsx, ISS4 Gerbers (this folder)','#OPENGEAR #SERIES/AV6201A - #Master #OPENGEAR/AV6201A - #TESTREPORT/AV6201A-V101-04NOV09.pdf','#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/AV6201A Manual.pdf (2009|42-01-23)'];
SIM.register({
  footnotes:[
    {text:"The 2012 guide labels T6301A position 2 “Not Connected”; the 2008 sheet labels it “IN”.", src:"#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/AV6201A - rear module options.cdr"},
    {text:"The 2012 guide numbers T6301A outputs OUT 1–4 down the left column and OUT 5–8 down the right; the 2008 sheet alternates OUT1/OUT2 across each row.", src:"#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/AV6201A - rear module options.cdr"},
    {text:"The card edge (labelled AV6201A on the ejector) draws “Clamp Switch” and “EQ Fixed Switch” as push-buttons; the board has jumpers.", src:"#OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201 - #Engineering/AV6201A/Functional/AV6201-card-edge.cdr"},
    {text:"The guide shows only T6301A and T6401A; the T6201 art here comes from the 2008 AV6201-REAR-MODULES sheet.", src:"#OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201 - #Engineering/AV6201A/Functional/AV6201-REAR-MODULES.cdr"}], id:'av6201a', product:'AV6201A', name:'AV6201A · analog video DA with differential input, clamp and EQ, openGear (2008|41)', year:2008,
  folder:'#OPENGEAR #SERIES/AV6201A - #Master #OPENGEAR', family:'openGear',
  summary:'openGear composite-video distribution amplifier: differential input, back-porch clamp, 0–300 m cable EQ, ±3 dB level, eight 75 Ω outputs (Cobalt 9231 / Ross ADC-8432). This folder holds the ISS3/ISS4 production files; the model uses the V101 firmware and P-CAD netlist from the sibling AV6201 folder.',
  highlights:['One video line in and out: cable loss, EQ, hum and clamp','Termination and level ladder','LMH1981 sync detect stalling the AVR loop once per field','Card edge pots, jumpers, rear modules and DashBoard','Firmware leftovers from the D6201A'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 video line', period:()=>STD[feed().std].H},{label:'1 field', period:()=>STD[feed().std].field},{label:'1 µs', period:()=>1e-6},{label:'1 ms', period:()=>1e-3}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.04,'2 fields'],[0.002,'2 ms'],[0.0002,'3 lines'],[0.00007,'1 line']], defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
