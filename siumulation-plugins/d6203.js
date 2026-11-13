/* =====================================================================
   D6203 — D6203A stereo analog-to-AES converter, openGear: pick-and-place folder (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   This folder holds only D6203Aiss3-T.prg/.mdb and VOID/D6203Aiss2-T.prg/.mdb (L Series PNP).
   The placements are drawn as the board; the card is run from the sibling D6203A platform:
   - #OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Software/atmel/v104 (d6203_test.c, D6203A.c/.h)
   - #OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6203A Manual.pdf
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

const PNP3=[["L2","GRN","1",270,-0.078,-2.201],["L3","GRN","1",270,-0.078,-2.066],["L4","GRN","1",270,-0.078,-1.931],["L8","GRN","1",270,-0.078,-1.481],["L5","YEL","2",270,-0.078,-1.796],["L6","RED","3",270,-0.077,-1.626],["R42","2K","70",90,5.618,0.18],["R43","2K","70",90,5.485,0.18],["R72","2K","70",90,5.61,-0.8],["R74","2K","70",90,5.47,-0.8],["R16","374","71",90,11.215,-1.81],["R41","374","71",90,11.125,-1.22],["C56","15pF","72",0,11.125,0.183],["R51","221","73",90,8.695,-0.055],["R56","47R","74",0,8.655,-0.176],["R46","3K48","75",0,9.625,-2.195],["R45","47K5","76",0,9.93,-1.685],["R9","90R9","77",0,5.975,-0.502],["R33","90R9","77",0,5.98,-1.453],["R2","21K5","78",0,5.075,-0.552],["R32","21K5","78",0,5.075,-1.492],["R1","21K5","78",90,5.19,0.178],["R8","21K5","78",90,5.795,-0.787],["R10","21K5","78",90,5.11,-0.786],["R11","21K5","78",90,5.875,0.179],["R5","150","79",0,5.835,-1.452],["R6","150","79",90,5.42,-1.596],["R7","150","79",90,5.42,-0.643],["R25","150","79",0,5.835,-0.501],["C98","10p","81",90,11.215,-1.739],["C99","10p","81",90,11.125,-1.29],["R20","110","82",90,10.535,-1.043],["R22","110","82",90,10.535,-0.849],["R23","110","82",90,10.535,-0.773],["R24","110","82",90,10.535,-1.119],["R31","110","82",90,10.8,-1.995],["R35","110","82",90,4.5,-2.022],["R36","110","82",90,4.295,-2.023],["R37","110","82",90,4.5,-2.107],["R38","110","82",90,4.295,-2.106],["R62","110","82",90,4.295,-2.277],["R63","110","82",90,4.5,-2.276],["R64","110","82",90,4.295,-2.192],["R65","110","82",90,4.5,-2.192],["C80","6n8","83",0,5.905,-0.501],["C81","6n8","83",0,5.91,-1.452],["R50","1K","84",90,10.34,-0.067],["R53","1K","84",90,7.975,0.03],["R54","1K","84",90,7.975,-0.051],["R55","1K","84",90,10.9,0.237],["R75","1K","84",90,10.65,-0.068],["R13","750","85",90,11.355,-1.67],["R17","750","85",90,11.215,-1.67],["R18","750","85",90,11.3,-1.27],["R40","750","85",90,11.125,-1.36],["R67","750","85",90,0.36,-2.2],["R68","750","85",90,0.36,-2.065],["R69","750","85",90,0.36,-1.93],["R70","750","85",90,0.36,-1.795],["R71","750","85",90,0.36,-1.625],["R73","750","85",90,0.355,-1.48],["R39","30R","86",90,9.595,-1.207],["R58","30R","86",90,9.595,-1.137],["R76","36K","69",0,5.15,-1.493],["R77","36K","69",0,5.15,-0.554],["C30","15nF","64",90,9.66,-2.303],["R44","10R","65",0,9.775,-2.193],["R57","10R","65",0,8.605,-1.102],["R66","10R","65",90,7.33,-1.596],["R3","10K","66",0,5.445,-0.297],["R4","10K","66",0,5.22,-0.554],["R12","10K","66",0,5.52,-0.298],["R26","10K","66",0,5.765,-0.502],["R27","10K","66",0,5.535,-1.255],["R28","10K","66",0,5.695,-1.452],["R29","10K","66",0,5.46,-1.254],["R34","10K","66",0,5.29,-1.493],["R47","10K","66",90,8.305,-1.436],["R48","10K","66",180,9.945,-0.478],["R49","10K","66",180,9.55,-0.478],["R52","10K","66",0,9.745,-0.478],["R59","10K","66",90,8.395,-0.005],["R60","10K","66",90,8.245,-0.006],["R61","10K","66",90,9.595,-1.057],["R79","10K","66",90,7.875,-0.431],["R80","10K","66",0,7.97,-0.322],["R14","75R","67",90,11.497,-1.73],["R15","75R","67",90,11.497,-1.605],["R19","75R","67",90,11.441,-1.27],["R21","75R","67",90,11.44,-1.185],["R30","75R","67",0,10.831,-2.21],["C4","27p","68",90,7.156,-0.346],["C5","27p","68",90,7.146,-0.905],["C35","27p","68",0,8.275,-1.775],["C36","27p","68",0,8.275,-1.91],["C51","27p","68",180,5.59,-0.296],["C52","27p","68",0,5.61,-1.251],["C53","27p","68",0,5.695,-0.501],["C54","27p","68",0,5.765,-1.451],["C57","27p","68",0,5.39,-1.25],["C60","27p","68",0,5.29,-0.551],["C76","27p","68",0,5.22,-1.491],["C83","27p","68",0,5.375,-0.297],["C93","27p","68",90,9.144,-2.248],["C94","27p","68",90,8.725,-2.248],["C29","1nF","63",0,9.7,-2.194],["C63","1.0u","93",0,8.673,-1.101],["C39","0.01","94",0,0.8,-0.525],["C100","0.01","94",90,7.388,-0.348],["C101","0.01","94",90,7.28,-0.908],["C1","0.1","95",90,11.591,-2.065],["C2","0.1","95",90,5.486,-0.186],["C3","0.1","95",90,5.5,-1.14],["C6","0.1","95",90,7.28,-0.974],["C7","0.1","95",90,7.39,-0.282],["C9","0.1","95",0,11.438,-1.406],["C10","0.1","95",0,11.157,-1.538],["C11","0.1","95",90,10.67,-1.044],["C15","0.1","95",90,10.67,-0.849],["C16","0.1","95",90,10.671,-1.121],["C20","0.1","95",0,10.497,-0.195],["C26","0.1","95",0,9.85,-2.191],["C27","0.1","95",90,9.8,-1.719],["C28","0.1","95",0,9.925,-2.192],["C31","0.1","95",0,7.442,-2.011],["C32","0.1","95",0,8.274,-1.636],["C33","0.1","95",90,8.305,-1.521],["C34","0.1","95",0,7.458,-1.684],["C42","0.1","95",0,2.905,-0.178],["C43","0.1","95",0,2.905,-0.327],["C48","0.1","95",0,1.1,-0.838],["C49","0.1","95",90,2.62,-1.13],["C50","0.1","95",90,2.451,-1.13],["C55","0.1","95",0,11.234,0.129],["C58","0.1","95",90,5.561,-0.64],["C59","0.1","95",90,7.331,-1.526],["C61","0.1","95",0,8.46,-1.097],["C62","0.1","95",0,8.745,-1.099],["C64","0.1","95",0,9.07,-0.616],["C65","0.1","95",0,9.282,-1.53],["C66","0.1","95",0,9.275,-0.627],["C67","0.1","95",0,9.075,-1.527],["C68","0.1","95",90,8.702,-0.952],["C69","0.1","95",0,8.998,-0.617],["C70","0.1","95",90,9.593,-0.985],["C71","0.1","95",0,9.348,-0.626],["C72","0.1","95",0,9.355,-1.53],["C73","0.1","95",0,9.001,-1.527],["C74","0.1","95",90,10.728,0.005],["C75","0.1","95",90,5.641,-1.596],["C77","0.1","95",90,10.258,0.009],["C78","0.1","95",0,8.833,-0.021],["C79","0.1","95",90,8.958,-0.047],["C82","0.1","95",90,5.255,-0.411],["C84","0.1","95",90,5.26,-1.367],["C85","0.1","95",90,10.569,0.007],["C87","0.1","95",90,10.418,0.006],["C89","0.1","95",0,9.138,-1.721],["C90","0.1","95",0,8.732,-1.716],["C91","0.1","95",0,8.732,-1.869],["C92","0.1","95",0,9.138,-1.871],["C95","0.1","95",0,9.972,-0.936],["C96","0.1","95",90,10.669,-0.775],["C97","0.1","95",90,10.681,-2.302],["Q3","2N4401","4",0,7.865,-0.314],["C8","10/10","5",0,11.53,-1.438],["C88","10/10","5",180,9.23,-1.773],["C38","1.0u","6",0,0.57,-0.213],["C21","22u","7",90,6.957,-0.927],["C22","22u","7",90,6.962,-0.331],["C25","22u","7",90,7.023,-0.231],["C86","22u","7",0,7.07,-1.105],["FB1","BLM41P","9",90,3.43,0.17],["FB2","BLM41P","9",90,1.895,-0.915],["FB3","BLM41P","9",90,3.43,-0.23],["FB4","BLM41P","9",90,7.164,-1.325],["FB5","BLM41P","9",90,7.385,0.07],["C37","6.8u","11",180,0.42,-0.147],["C40","68/10","13",180,1.44,-0.777],["C41","68/10","13",180,1.245,-0.777],["C44","68/10","13",180,1.635,-0.777],["C45","68/10","13",180,2.135,-0.777],["C47","68/10","13",180,2.33,-0.777],["U2","EL5263","15",90,11.302,-1.471],["REG3","LM1117-3.3V","17",0,2.49,-1.35],["C12","22/35","19",90,7.326,-1.13],["C13","22/35","19",270,7.381,-0.125],["C14","22/35","19",270,5.5,-0.01],["C17","22/35","19",270,5.5,-0.965],["C46","22/35","19",0,3.141,-0.146],["REG2","L79L05AC","21",270,2.735,-0.218],["REG4","LM1117-ADJ","23",0,8.83,-0.27],["D5","SK33","27",90,0.54,-0.506],["U8","SN65HDV233D","49.01",90,11.44,0.146],["U11","M25P40-VMN6P","49.02",90,8.26,-1.063],["U13","PLL1705","49.03",270,8.932,-1.797],["U6","CS8416","49.04",180,9.78,-1.917],["U4","DS34LV87T","49.06",0,10.241,-0.869],["U9","SN75HVD10D","49.07",90,10.625,-2.144],["U12","SN75HVD10D","49.07",180,10.651,-0.265],["U14","SN75HVD10D","49.07",180,10.341,-0.268],["U3","NE5532","39",0,5.49,-0.487],["U5","NE5532","39",0,5.49,-1.439],["F1","RXE-050/SM","32",90,3.845,-0.23],["F2","RXE-050/SM","32",90,3.85,0.17],["X2","27MEG","35",90,8.935,-2.099],["H11","SAMT-HLE-2X5","48",90,8.285,-0.24],["JTAG1","SAMT-HLE-2X5","48",0,7.182,-1.905],["C18","100/25","29",0,6.82,-1.234],["C19","100/25","29",270,6.63,-0.85],["C23","100/25","29",180,6.746,-0.03],["C24","100/25","29",270,6.626,-0.464],["C102","100/25","29",180,5.15,-1.091],["C103","100/25","29",180,5.835,-1.092],["C104","100/25","29",180,5.152,-0.128],["C105","100/25","29",180,5.835,-0.127],["L1","IDCP-3020-47UH-","37",90,0.825,-0.82],["U1","AK5394AVSP","49.05",0,7.295,-0.627],["REG1","LM2676","49.08",270,0.945,-0.182],["U7","AT90CAN128","1001",0,7.866,-1.879],["U10","EP1C3T100","1002",90,9.141,-1.066]];
const PNP2X=[["JTAG1-HLE","","25",0,7.182,-1.905],["H1-HLE","","25",90,8.285,-0.24]];
const PNP2=Object.fromEntries([["L2","GRN",-0.08,-2.197],["L3","GRN",-0.08,-2.061],["L4","GRN",-0.08,-1.928],["L8","GRN",-0.08,-1.477],["L5","YEL",-0.08,-1.792],["L6","RED",-0.08,-1.621],["R76","36K",5.15,-1.488],["R77","36K",5.15,-0.545],["R42","2K",5.62,0.186],["R43","2K",5.485,0.187],["R72","2K",5.61,-0.795],["R74","2K",5.47,-0.793],["R16","374",11.215,-1.81],["R41","374",11.125,-1.22],["C56","15pF",11.125,0.18],["R51","221",8.695,-0.049],["R56","47R5",8.655,-0.175],["R46","3K48",9.625,-2.195],["R45","47K5",9.93,-1.685],["R9","90R9",5.975,-0.501],["R33","90R9",5.98,-1.45],["R1","21K5",5.19,0.181],["R8","21K5",5.795,-0.783],["R10","21K5",5.11,-0.783],["R11","21K5",5.875,0.182],["R5","150",5.834,-1.447],["R6","150",5.42,-1.594],["R7","150",5.42,-0.638],["R25","150",5.835,-0.505],["C98","10p",11.215,-1.74],["C99","10p",11.125,-1.29],["R20","110",10.535,-1.045],["R22","110",10.535,-0.85],["R23","110",10.535,-0.775],["R24","110",10.535,-1.12],["R31","110",10.8,-1.995],["R35","110",4.5,-2.019],["R36","110",4.295,-2.018],["R37","110",4.5,-2.104],["R38","110",4.295,-2.103],["R62","110",4.295,-2.273],["R63","110",4.5,-2.273],["R64","110",4.296,-2.188],["R65","110",4.501,-2.188],["C80","6n8",5.905,-0.505],["C81","6n8",5.91,-1.455],["R50","1K",10.34,-0.066],["R53","1K",7.975,0.031],["R54","1K",7.975,-0.049],["R55","1K",10.9,0.239],["R75","1K",10.65,-0.066],["R13","750",11.355,-1.67],["R17","750",11.215,-1.67],["R18","750",11.3,-1.27],["R40","750",11.125,-1.36],["R67","750",0.359,-2.196],["R68","750",0.36,-2.061],["R69","750",0.36,-1.93],["R70","750",0.36,-1.795],["R71","750",0.36,-1.625],["R73","750",0.355,-1.48],["R39","30R",9.595,-1.21],["R58","30R",9.595,-1.14],["C30","15nF",9.66,-2.301],["R44","10R",9.775,-2.195],["R57","10R",8.605,-1.105],["R66","10R",7.33,-1.593],["R3","10K",5.445,-0.3],["R29","10K",5.46,-1.255],["R4","10K",5.22,-0.555],["R12","10K",5.52,-0.3],["R26","10K",5.765,-0.505],["R27","10K",5.535,-1.255],["R28","10K",5.695,-1.455],["R34","10K",5.29,-1.495],["R47","10K",8.305,-1.44],["R48","10K",9.945,-0.48],["R49","10K",9.55,-0.48],["R52","10K",9.745,-0.48],["R59","10K",8.395,-0.01],["R60","10K",8.245,-0.01],["R61","10K",9.595,-1.06],["R79","10K",7.875,-0.429],["R80","10K",7.97,-0.325],["R14","75R",11.495,-1.73],["R15","75R",11.495,-1.605],["R19","75R",11.44,-1.27],["R21","75R",11.44,-1.185],["R30","75R",10.834,-2.21],["C4","27p",7.156,-0.344],["C5","27p",7.146,-0.903],["C35","27p",8.275,-1.78],["C36","27p",8.275,-1.915],["C51","27p",5.59,-0.3],["C52","27p",5.61,-1.255],["C53","27p",5.695,-0.505],["C54","27p",5.765,-1.455],["C57","27p",5.39,-1.255],["C60","27p",5.29,-0.555],["C76","27p",5.22,-1.495],["C83","27p",5.375,-0.3],["C93","27p",9.145,-2.245],["C94","27p",8.725,-2.246],["C29","1nF",9.7,-2.195],["C63","1.0u",8.675,-1.105],["C39","0.01",0.8,-0.525],["C100","0.01",7.39,-0.344],["C101","0.01",7.28,-0.905],["C1","0.1",11.59,-2.065],["C2","0.1",5.485,-0.182],["C3","0.1",5.5,-1.138],["C6","0.1",7.28,-0.969],["C7","0.1",7.39,-0.277],["C9","0.1",11.442,-1.41],["C10","0.1",11.16,-1.54],["C11","0.1",10.67,-1.045],["C15","0.1",10.67,-0.85],["C16","0.1",10.67,-1.12],["C20","0.1",10.5,-0.2],["C26","0.1",9.85,-2.195],["C27","0.1",9.8,-1.717],["C28","0.1",9.925,-2.195],["C31","0.1",7.445,-2.015],["C32","0.1",8.275,-1.64],["C33","0.1",8.305,-1.519],["C34","0.1",7.46,-1.69],["C42","0.1",2.905,-0.18],["C43","0.1",2.905,-0.33],["C48","0.1",1.1,-0.84],["C49","0.1",2.62,-1.124],["C50","0.1",2.45,-1.124],["C55","0.1",11.235,0.125],["C58","0.1",5.56,-0.637],["C59","0.1",7.33,-1.525],["C61","0.1",8.46,-1.1],["C62","0.1",8.745,-1.105],["C64","0.1",9.07,-0.62],["C65","0.1",9.28,-1.535],["C66","0.1",9.275,-0.63],["C67","0.1",9.075,-1.531],["C68","0.1",8.702,-0.951],["C69","0.1",9.0,-0.62],["C70","0.1",9.595,-0.985],["C71","0.1",9.35,-0.63],["C72","0.1",9.355,-1.535],["C73","0.1",9.0,-1.531],["C74","0.1",10.73,0.008],["C75","0.1",5.64,-1.593],["C77","0.1",10.26,0.009],["C78","0.1",8.835,-0.025],["C79","0.1",8.96,-0.045],["C82","0.1",5.255,-0.408],["C84","0.1",5.26,-1.362],["C85","0.1",10.57,0.009],["C87","0.1",10.42,0.009],["C89","0.1",9.14,-1.725],["C90","0.1",8.735,-1.72],["C91","0.1",8.735,-1.875],["C92","0.1",9.14,-1.875],["C95","0.1",9.975,-0.94],["C96","0.1",10.67,-0.775],["C97","0.1",10.68,-2.3],["Q3","2N4401",7.862,-0.312],["C8","10/10",11.53,-1.438],["C88","10/10",9.23,-1.773],["FB1","BLM41P",3.43,0.17],["FB2","BLM41P",1.895,-0.915],["FB3","BLM41P",3.43,-0.23],["FB4","BLM41P",7.164,-1.325],["FB5","BLM41P",7.385,0.07],["C38","1.0u",0.57,-0.213],["C21","22u",6.957,-0.925],["C22","22u",6.962,-0.329],["C25","22u",7.023,-0.227],["C86","22u",7.07,-1.107],["C37","6.8u",0.42,-0.147],["C40","68/10",1.44,-0.777],["C41","68/10",1.245,-0.777],["C44","68/10",1.635,-0.777],["C45","68/10",2.135,-0.777],["C47","68/10",2.33,-0.777],["REG2","L79L05AC",2.735,-0.214],["U2","EL5263",11.3,-1.47],["REG3","LM1117-3.3V",2.49,-1.35],["REG4","LM1117-ADJ",8.83,-0.27],["C12","22/35",7.326,-1.13],["C13","22/35",7.381,-0.125],["C14","22/35",5.5,-0.01],["C17","22/35",5.5,-0.965],["C46","22/35",3.14,-0.145],["U9","SN75HVD",10.625,-2.145],["U12","SN75HVD",10.65,-0.27],["U14","SN75HVD",10.34,-0.27],["D5","SK33",0.54,-0.506],["F1","RXE-050/SM",3.845,-0.23],["F2","RXE-050/SM",3.85,0.17],["U8","SN65HDV233D",11.44,0.145],["U11","M25P40-VMN6P",8.26,-1.065],["U13","PLL1705",8.935,-1.797],["U6","CS8416",9.778,-1.918],["U4","DS34LV87T",10.24,-0.87],["U3","NE5532",5.49,-0.49],["U5","NE5532",5.49,-1.445],["X2","27MEG",8.935,-2.1],["JTAG1-HLE","",7.182,-1.905],["H1-HLE","",8.285,-0.24],["C18","100/25",6.82,-1.235],["C19","100/25",6.63,-0.85],["C23","100/25",6.745,-0.035],["C24","100/25",6.63,-0.465],["C102","100/25",5.15,-1.095],["C103","100/25",5.835,-1.095],["C104","100/25",5.15,-0.13],["C105","100/25",5.835,-0.13],["L1","IDCP-3020-47UH-",0.825,-0.82],["U1","AK5394AVSP",7.295,-0.624],["REG1","LM2676",0.952,-0.18],["U7","AT90CAN128",7.866,-1.877],["U10","EP1C3T100",9.142,-1.064],["R2","21K5",5.075,-0.546],["R32","21K5",5.075,-1.485]].map(r=>[r[0],r]));
/* ---------------- D6203 (D6203A platform) model ---------------- */
const inf=K.inf, card=K.card;
const SIB='#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/';
const REFN=['Frame Ref 1','Frame Ref 2','External Ref','Internal Ref'];   // REFERENCE_1 0, REFERENCE_2 1, EXTERNAL_REF 2, INTERNAL_REF 3
const SRN=['32 kHz','44.1 kHz','48 kHz','96 kHz','192 kHz'], SRV=[32000,44100,48000,96000,192000];
const C={ LOOP_T:175e-6 /* d6203_test.c: “1 cycle = 175us” */, ADC_RESET:5714, CHIRP_ON:1000, CHIRP_OFF:7000, LOCK:200 /* LOCK_CONSTANT, value inferred */, T1:96e-6, HEARTBEAT:10000 };
const D={
  L:{dbu:4, f:1000}, R:{dbu:4, f:400}, hr:{L:-20, R:-20},       // H1/H2 headroom jumpers: +4 dBu = −20 or −18 dBFS
  reference:3, sample_rate:2, refs:{0:true,1:false,2:false}, extFs:48000, h3:75,
  dip:[1,1,1,1,1,1,1,1], lat:[1,1], rear:'T6302', slot:4,
  changeAt:-10, lockAt:-10, bootAt:null, saved:false, pnpIss:3, pnpSel:'U1',
  log:[], canQ:[],
};
const act=K.actor(D);
const dipEn=()=>D.lat[0]===1, dashEn=()=>D.lat[1]===1;
function eff(){   // reference / sample_rate after ALTERA_write's DIP handling
  let ref=D.reference, sr=D.sample_rate;
  if (dipEn() && !dashEn()){ const on=i=>D.dip[i]===0; ref=(on(1)?1:0)+(on(0)?2:0); sr=Math.min(4,(on(4)?1:0)+(on(3)?2:0)+(on(2)?4:0)); }
  return {ref, sr};
}
function refPresent(r){ return r===3? true : r===2? D.refs[2] : D.refs[r]; }
function refFs(r){ return r===2? D.extFs : 48000; }       // frame refs: DARS at 48 kHz (inferred)
function stable(t){ return t-D.lockAt >= C.LOCK*C.LOOP_T; }
function refSel(t){ const e=eff(); if (e.ref===3) return 3; return (refPresent(e.ref) && stable(t))? e.ref : 3; }
function outFs(t){ const r=refSel(t); return r===3? SRV[eff().sr] : refFs(r); }
function calAt(t){ return t>=D.changeAt && t<D.changeAt+C.ADC_RESET*C.LOOP_T; }
function chirp(t){ const p=Math.floor(t/C.LOOP_T)%(C.CHIRP_ON+C.CHIRP_OFF); return p<C.CHIRP_ON; }
function booting(t){ return D.bootAt!==null && t>=D.bootAt && t<D.bootAt+0.15; }
function leds(t){
  if (booting(t)) return {r1:0,r2:0,ex:0,in:0,cal:0,com:0};
  const e=eff(), lk=refPresent(e.ref), o={r1:0,r2:0,ex:0,in:0,cal:calAt(t)?1:0,com:canList().some(f=>f.dir==='tx'&&t>=f.t&&t<f.t+0.0012)?1:0};
  if (e.ref===3) o.in=1;
  else { const k=e.ref===0?'r1':e.ref===1?'r2':'ex'; if (lk){ o[k]=1; } else { o.in=1; o[k]=chirp(t)?1:0; } }
  return o;
}
const dBFS = ch=> D[ch].dbu - 4 + D.hr[ch];          // +4 dBu → −20 (or −18) dBFS
function sample(ch, t){ const fs=outFs(t), n=Math.floor(t*fs), a=Math.pow(10,dBFS(ch)/20); const v=a*Math.sin(2*Math.PI*D[ch].f*n/fs); return calAt(t)?0:Math.max(-1,Math.min(1,v)); }
function ctl(t){ const e=eff(), rs=refSel(t); return (0<<7)|(rs<<5)|(e.sr<<2)|(e.ref); }   // data_lower in ALTERA_write (da_disabled code commented out)
function canList(){ const out=[], ph=(D.slot*0.0173)%0.9; for (let t=ph;t<1;t+=C.HEARTBEAT*C.T1) out.push({t,n:1,dir:'tx',label:'card → MFC: heartbeat'});
  for (let t=0.21;t<1;t+=0.5){ out.push({t,n:1,dir:'rx',label:'MFC → card: GET_PARAM'}); out.push({t:t+0.0005,n:1,dir:'tx',label:'card → MFC: REPORT_PARAM'}); }
  D.canQ.forEach(t=>{ out.push({t,n:1,dir:'rx',label:'MFC → card: SET_PARAM'}); out.push({t:t+0.0004,n:2,dir:'tx',label:'card → MFC: reply'}); }); return out.sort((a,b)=>a.t-b.t); }

const A={
  level(ch,v){ act(`${ch==='L'?'LEFT':'RIGHT'} input level → ${v>0?'+':''}${v} dBu`, tr=>{ D[ch].dbu=v; const f=dBFS(ch); tr(`Balanced input (>20 kΩ) → NE5532 stage → AK5394A: ${f.toFixed(1)} dBFS ${f>0?'— CLIPPED (over full scale)':f>-1?'— 1 dB from full scale':''}`); tr(`H${ch==='L'?1:2} on ${D.hr[ch]}: +4 dBu = ${D.hr[ch]} dBFS, full scale = +${4-D.hr[ch]} dBu`); }); },
  hr(ch,v){ act(`Jumper H${ch==='L'?1:2} → ${v} dB`, tr=>{ D.hr[ch]=+v; tr(`Reference level +4 dBu now maps to ${v} dBFS (headroom ${-v} dB, clip at +${4-v} dBu) — functional drawing H1/H2 “−20 / −18”`); }); },
  ref(r, src){ const e0=eff(); act(`${src||'DashBoard'}: Reference → ${REFN[r]}`, tr=>{ D.reference=+r; const now=SIM.t; D.changeAt=now; D.lockAt=now;
    tr(`${src?'DIP':'SET_PARAM OID (REFERENCE)'} → reference = ${r} (${['REFERENCE_1','REFERENCE_2','EXTERNAL_REF','INTERNAL_REF'][r]})`);
    tr('main loop: reference_sel != preference_sel → reset_adc = YES, no_of_adc_resets = 0 → CAL LED on');
    tr(`ALTERA_write: reference_sel = ${refPresent(+r)?'reference once Astatus locked and clocks_stable (LOCK_CONSTANT passes)':'INTERNAL_REF (selected reference missing)'}; data_lower = ${ctl(now+1).toString(2).padStart(8,'0')}b`);
    tr(`reset_count runs to ADC_RESET_CONSTANT = 5714 passes (“= 1 sec”), then reset_adc = NO, CAL off`);
    if (!refPresent(+r)) tr(`REFRESH_LEDS: INTERNAL on, ${['REF1','REF2','EXTERNAL'][r]||''} LED chirps (1000 passes on / 7000 off ≈ ${(C.CHIRP_ON*C.LOOP_T).toFixed(2)} s / ${(C.CHIRP_OFF*C.LOOP_T).toFixed(2)} s)`); }); },
  sr(v){ act(`DashBoard: Sample Rate → ${SRN[v]}`, tr=>{ D.sample_rate=+v; tr(`sample_rate = SR_${['32','44','48','96','192'][v]} → ALTERA_write bits 4:2`); if (refSel(SIM.t)===3){ D.changeAt=SIM.t; tr('reference_sel == INTERNAL_REF → reset_adc = YES (CAL LED, 1 s) — FPGA mclk_sel / altpll switch the internal clock'); } else tr(`Locked to ${REFN[refSel(SIM.t)]}: output follows the reference rate (${refFs(refSel(SIM.t))/1000} kHz); the setting only applies on internal`); }); },
  frameRef(n){ act(`Frame REF ${n+1} ${D.refs[n]?'removed':'connected (48 kHz DARS)'}`, tr=>{ D.refs[n]=!D.refs[n]; D.lockAt=SIM.t; tr(`CS8416 (U6): CS8416_READ_LOCK_ALL → Astatus ${refPresent(eff().ref)?'locked':'0'} for the selected reference`); tr(eff().ref===n? (D.refs[n]? 'clocks_stable after LOCK_CONSTANT passes → reference_sel = reference' : 'reference_sel falls back to INTERNAL_REF immediately; REF LED chirps') : 'not the selected reference: no effect'); }); },
  ext(){ act(`External AES reference ${D.refs[2]?'unplugged':'plugged in'} (rear REF IN)`, tr=>{ D.refs[2]=!D.refs[2]; D.lockAt=SIM.t; tr(`Rear REF IN → H3 (${D.h3} Ω) → CS8416 → FPGA SR_DETECT_192 counts its MCLK against the AVR’s 500 Hz square wave`); tr(eff().ref===2?(D.refs[2]?'locks; EXTERNAL LED on':'lost: INTERNAL LED on, EXTERNAL chirps'):'(External is not the selected reference)'); }); },
  extFs(v){ act(`External reference rate → ${v/1000} kHz`, tr=>{ D.extFs=+v; D.lockAt=SIM.t; tr(`SR_DETECT_192: ≈${Math.round(+v*256/1000)} MCLK edges per 1 ms half-period ${inf('MCLK = 256 fs')} → FPGA reports the rate in ALTERA1 bits 1:0 → main loop sees a change → reset_adc`); D.changeAt=SIM.t; }); },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1; tr(`READ_DIP_SWITCHES each pass; ALTERA_write uses them only when dip_switch_enabled && !dashboard_enabled ${inf('same rule as the D6201B; SW7/SW8 read at power-up')}`); if (i>=6) tr('SW7/SW8 take effect after a reboot'); else tr(dipEn()&&!dashEn()?`DIP in control: ${REFN[eff().ref]}, ${SRN[eff().sr]}`:'ignored (DashBoard in control)'); if (dipEn()&&!dashEn()){ D.changeAt=SIM.t; D.lockAt=SIM.t; } }); },
  reboot(){ act('DashBoard: Reboot', tr=>{ D.bootAt=SIM.t; D.lat=[D.dip[6],D.dip[7]]; D.changeAt=SIM.t+0.15; tr('CANMSG_REBOOT → watchdog reset → main() in d6203_test.c (ICC application-builder skeleton, “Target: M128, Crystal 8 MHz”)'); tr(`SW7 → dip_switch_enabled = ${dipEn()?'YES':'NO'}, SW8 → dashboard_enabled = ${dashEn()?'YES':'NO'}`); }); },
  save(){ act('DashBoard: Save Settings', tr=>{ D.saved=true; tr('save_settings → SAVE_INFORMATION_EEPROM()'); D.canQ.push(SIM.t); }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; tr(RM[r].note); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; tr(`ADDRESS_TABLE → slot ${n}`); }); },
  pnp(iss){ D.pnpIss=iss; SIM.refresh(); },
  reset(){ Object.assign(D,{reference:3,sample_rate:2,extFs:48000,h3:75,rear:'T6302',slot:4,changeAt:-10,lockAt:-10,bootAt:null,saved:false}); D.L={dbu:4,f:1000}; D.R={dbu:4,f:400}; D.hr={L:-20,R:-20}; D.refs={0:true,1:false,2:false}; D.dip=[1,1,1,1,1,1,1,1]; D.lat=[1,1]; D.log=[]; D.canQ=[]; SIM.refresh(); },
};
const RM={
  T6302:{name:'T6302A', sub:'single card, 75 Ω, DFR-8320', note:'T6302A: REF IN (1), OUT 1–4 on BNC (3–6), LEFT/RIGHT on 3-pin Phoenix (7, 9).', cells:[[1,'REF IN','bnc','ext'],[2,'N/C','nc'],[3,'OUT1','bnc'],[4,'OUT3','bnc'],[5,'OUT2','bnc'],[6,'OUT4','bnc'],[7,'LEFT','tb','L'],[8,'N/C','nc'],[9,'RIGHT','tb','R'],[10,'N/C','nc']]},
  T6402:{name:'T6402A', sub:'double card, 75 Ω', note:'T6402A: two cards; each gets REF IN, OUT1, OUT2 and a stereo input.', cells:[[2,'REF IN #1','bnc','ext'],[1,'REF IN #2','bnc'],[4,'OUT1 #1','bnc'],[3,'OUT1 #2','bnc'],[6,'OUT2 #1','bnc'],[5,'OUT2 #2','bnc'],[8,'LEFT #1','tb','L'],[7,'LEFT #2','tb'],[10,'RIGHT #1','tb','R'],[9,'RIGHT #2','tb']]},
  T6303:{name:'T6303A', sub:'single card, 110 Ω (all Phoenix)', note:'T6303A: everything on 3-pin Phoenix: balanced 110 Ω REF IN and OUT 1–4, LEFT, RIGHT.', cells:[[1,'REF IN','tb','ext'],[2,'N/C','nc'],[3,'OUT1','tb'],[4,'OUT3','tb'],[5,'OUT2','tb'],[6,'OUT4','tb'],[7,'LEFT','tb','L'],[8,'N/C','nc'],[9,'RIGHT','tb','R'],[10,'N/C','nc']]},
};
/* CorelDRAW artwork (artwork pass 2026|59): card edge and rear modules converted from the archive .cdr files
   to assets/d6203-*.svg; LED, switch and connector positions are the artwork's own coordinates (pt). */
const ART={edge:{"vb":[61,129,152,311],"led":[[179.7,135.58,5.74,12.58],[179.7,156.74,5.74,12.58],[179.81,179.93,5.74,12.58],[179.7,207.85,5.74,12.58],[179.7,229.0,5.74,12.58],[179.81,252.19,5.74,12.58]],"sw":[],"href":"d6203-edge.svg"},
 rear:{"T6302":{"vb":[175.2,167.5,148.0,187.0],"panel":[231.56,211.55,35.98,89.9],"s":0.909,"pos":{"1":[237.74,225.18],"2":[254.91,225.18],"3":[237.74,242.35],"4":[254.91,242.35],"5":[237.74,259.52],"6":[254.91,259.52],"7":[237.74,276.7],"8":[254.91,276.7],"9":[237.74,293.87],"10":[254.91,293.87]},"href":"d6203-rear-t6302.svg"},
  "T6303":{"vb":[323.6,167.5,148.9,187.0],"panel":[378.95,210.15,35.98,89.9],"s":0.909,"pos":{"1":[385.13,223.78],"2":[402.3,223.78],"3":[385.13,240.95],"4":[402.3,240.95],"5":[385.13,258.12],"6":[402.3,258.12],"7":[385.13,275.3],"8":[402.3,275.3],"9":[385.13,292.47],"10":[402.3,292.47]},"href":"d6203-rear-t6303.svg"},
  "T6402":{"vb":[473,167.5,148,187.0],"panel":[531.76,212.84,35.98,89.9],"s":0.909,"pos":{"1":[537.94,226.47],"2":[555.11,226.47],"3":[537.94,243.64],"4":[555.11,243.64],"5":[537.94,260.81],"6":[555.11,260.81],"7":[537.94,277.99],"8":[555.11,277.99],"9":[537.94,295.16],"10":[555.11,295.16]},"href":"d6203-rear-t6402.svg"}},
 edgeCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Functional/D6203A-card-edge.cdr','D6203A-card-edge.cdr (2008-05-08)'),
 rearCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6203A - rear module options.cdr','D6203A - rear module options.cdr (2012-01-16): T6302A, T6303A, T6402A')};
function rearSVG(){ const r=RM[D.rear], t=SIM.t; const live=calAt(t)||booting(t)?'warn':true;
  return K.rearSVG({art:ART.rear[D.rear], name:r.name, sub:r.sub, split:D.rear==='T6402'?['CARD #2','CARD #1 (this card)']:null, id:'AN_BMID 3K57 + module AN_BMID2', cells:r.cells.map(([n,l,k,id])=>({n,label:l,kind:k,id:id==='ext'?'ext':undefined,conn:id==='ext'?D.refs[2]:id==='L'||id==='R'?true:undefined,live:l.startsWith('OUT')&&(D.rear!=='T6402'||l.endsWith('#1'))?live:id==='ext'?(D.refs[2]?true:undefined):undefined}))}); }
function edgeSVG(t){ const L=leds(t); return K.edgeSVG({art:ART.edge, label:'D6203A', leds:[{name:'REF1',c:'g',on:L.r1,y:50},{name:'REF2',c:'g',on:L.r2,y:95},{name:'External',c:'g',on:L.ex,y:140},{name:'Internal',c:'y',on:L.in,y:185},{name:'CAL',c:'r',on:L.cal,y:230,title:'reset_adc (self-calibration)'},{name:'COM Activity',c:'g',on:L.com,y:275}], note:'Artwork: D6203A-card-edge.cdr'}); }
function dashHTML(){ const t=SIM.t, rs=refSel(t), e=eff(), ok=rs===e.ref, ro=!dashEn();
  return K.dashHTML({key:'d6203', title:`Slot ${D.slot}: D6203A`, alarm:!ok, tree:[{name:'DFR-8320 frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: D6203A`,lvl:1,sel:true}],
    tabs:[{name:'Card Status',rows:[{type:'status',label:'Card Status',value:ok?'OK':'Reference Missing',level:ok?'ok':'warn'},{type:'status',label:'Ref Input',value:e.ref===3?'Internal':refPresent(e.ref)?'Locked':'Unlocked',level:e.ref===3||refPresent(e.ref)?'ok':'err'},{type:'text',label:'Sample Rate (output)',value:(outFs(t)/1000)+' kHz'},{type:'text',label:'Locked to',value:REFN[rs]}]},
      {name:'Card Settings',rows:[{type:'combo',id:'ref',label:'Reference',value:D.reference,options:REFN.map((n,i)=>[i,n])},{type:'combo',id:'sr',label:'Internal Sample Rate',value:D.sample_rate,options:SRN.map((n,i)=>[i,n])},{type:'button',id:'save',label:'Save Settings',text:'Save'}],note:ro?'DIP SW8 ON: DashBoard is read-only (manual).':'Input level and headroom are set by jumpers H1/H2, not in DashBoard.'}],
    footer:[{id:'reboot',text:'Reboot'}], foot:'V104 (D6203A firmware)'}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>Analog in</b>L ${sel('lL',[-10,0,4,8,14,18,24,28].map(v=>[v,(v>0?'+':'')+v+' dBu']),D.L.dbu)} R ${sel('lR',[-10,0,4,8,14,18,24,28].map(v=>[v,(v>0?'+':'')+v+' dBu']),D.R.dbu)} H1 ${sel('hL',[[-20,'−20'],[-18,'−18']],D.hr.L)} H2 ${sel('hR',[[-20,'−20'],[-18,'−18']],D.hr.R)}</div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px"><b>References</b><button data-x="f0">Frame REF 1 ${D.refs[0]?'on':'off'}</button><button data-x="f1">Frame REF 2 ${D.refs[1]?'on':'off'}</button><button data-x="ex">Ext REF ${D.refs[2]?'on':'off'}</button> rate ${sel('exfs',SRV.map(v=>[v,v/1000+' kHz']),D.extFs)} Rear ${sel('rear',Object.keys(RM).map(k=>[k,RM[k].name]),D.rear)} <button data-x="reset">Defaults</button></div>`; }
function dipSVG(){ const lab=['Ref Sel (MSB)','Ref Sel (LSB)','SR Sel (MSB)','SR Sel','SR Sel (LSB)','Reserved','Default (DIP/memory)','DashBoard enable'];
  let s=`<svg viewBox="0 0 520 170" style="width:100%;max-width:520px"><rect x="10" y="10" width="300" height="70" rx="4" fill="#c0392b"/><text x="16" y="24" font-size="10" fill="#fff">ON ▲ (manual figure 4)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1}: ${lab[i]} — ${v?'OFF':'ON'}</title><rect x="${x}" y="30" width="22" height="42" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?52:33}" width="16" height="16" fill="#222"/><text x="${x+11}" y="94" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  lab.forEach((l,i)=>{ s+=`<text x="330" y="${22+i*17}" font-size="10.5" fill="var(--ink2)">${i+1}: ${l}</text>`; });
  return s+`<text x="10" y="160" font-size="10.5" fill="var(--accent)">DIP ${dipEn()&&!dashEn()?'in control':'ignored'} · effective: ${REFN[eff().ref]}, ${SRN[eff().sr]}</text></svg>`; }
function bindAll(r){ K.bind(r,{jack:{ext:()=>A.ext()}, slot:n=>A.slot(n), dash:(id,v)=>{ if(id==='ref') A.ref(+v); else if(id==='sr') A.sr(+v); else if(id==='save') A.save(); else if(id==='reboot') A.reboot(); }});
  r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip)));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='lL')A.level('L',+el.value); else if(x==='lR')A.level('R',+el.value); else if(x==='hL')A.hr('L',el.value); else if(x==='hR')A.hr('R',el.value); else if(x==='f0')A.frameRef(0); else if(x==='f1')A.frameRef(1); else if(x==='ex')A.ext(); else if(x==='exfs')A.extFs(+el.value); else if(x==='rear')A.rear(el.value); else if(x==='reset')A.reset(); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; });
  r.querySelectorAll('[data-pnp]').forEach(g=>g.addEventListener('click',()=>{ D.pnpSel=g.dataset.pnp; SIM.refresh(); }));
  r.querySelectorAll('[data-iss]').forEach(b=>b.onclick=()=>A.pnp(+b.dataset.iss)); }
/* placement map from the PNP program (the folder's own content) */
function pnpSVG(){
  const iss=D.pnpIss, rows=iss===3?PNP3:PNP3.filter(r=>PNP2[r[0]]).map(r=>{ const o=PNP2[r[0]]; return [r[0],o[1],r[2],r[3],o[2],o[3]]; }).concat(iss===2?PNP2X:[]);
  const W=900, X=x=>20+(x+0.2)/12*W*0.96, Y=y=>40+(0.35-y)/2.8*230;
  let s=`<svg viewBox="0 0 ${W+40} 300" style="width:100%"><rect x="${X(-0.15)}" y="${Y(0.32)}" width="${X(11.75)-X(-0.15)}" height="${Y(-2.4)-Y(0.32)}" rx="6" fill="#1f6b3a" stroke="#0d3a1c"/>
    <text x="20" y="20" font-size="12" fill="var(--ink)">D6203A issue ${iss} top side — ${rows.length} placements (${iss===3?'D6203Aiss3-T.prg, saved 2013-10-08':'VOID/D6203Aiss2-T.prg, saved 2008-09-26'}) · X/Y in inches from the fiducial</text>
    <text x="${X(11.6)}" y="${Y(-2.55)+12}" font-size="10" text-anchor="end" fill="var(--ink2)">edge connectors (midplane / rear) →</text><text x="${X(-0.15)}" y="${Y(-2.55)+12}" font-size="10" fill="var(--ink2)">← front card edge (LEDs L2–L8)</text>`;
  rows.forEach(r=>{ const [ref,val,fdr,rot,x,y]=r, big=/^U|^X|^REG|^T\d/.test(ref), col=/^U/.test(ref)?'#151515':/^L\d/.test(ref)?(val.includes('GRN')?'#5dff5a':val.includes('YEL')?'#ffd23a':'#ff4a3d'):/^C/.test(ref)?'#c9a25a':/^R/.test(ref)?'#2b2b2b':'#777';
    const chg = iss===3 && (!PNP2[ref] || PNP2[ref][1]!==val || Math.abs(PNP2[ref][2]-x)>0.004 || Math.abs(PNP2[ref][3]-y)>0.004);
    const w=big?(ref==='U10'||ref==='U7'?26:16):5, h=big?(ref==='U10'||ref==='U7'?26:12):3;
    s+=`<g data-pnp="${ref}" style="cursor:pointer"><title>${ref} ${val} · feeder ${fdr} · rot ${rot}° · (${x}, ${y})</title><rect x="${X(x)-w/2}" y="${Y(y)-h/2}" width="${w}" height="${h}" fill="${col}" stroke="${D.pnpSel===ref?'#fff':chg?'#ff9d2e':'none'}" stroke-width="${D.pnpSel===ref||chg?2:0}"/>${big?`<text x="${X(x)}" y="${Y(y)-h/2-3}" font-size="9" text-anchor="middle" fill="#e8f5e9">${ref}</text>`:''}</g>`; });
  return s+'</svg>';
}
function pnpInfo(){ const r=PNP3.find(x=>x[0]===D.pnpSel)||PNP2X.find(x=>x[0]===D.pnpSel); if(!r) return ''; const o=PNP2[r[0]];
  return `<table class="kv"><tr><th>${r[0]}</th><td class="mono">${r[1]} · feeder ${r[2]} · ${r[3]}° · X ${r[4]} Y ${r[5]}</td></tr><tr><th>issue 2</th><td class="mono">${o?`${o[1]} · X ${o[2]} Y ${o[3]}`:'not in the iss2 program'}</td></tr><tr><th>role</th><td>${ROLE[r[0]]||ROLE[r[0].replace(/\d+$/,'')]||'passive'}</td></tr></table>`; }
const ROLE={U1:'AK5394A 24-bit stereo ADC (the converter itself)',U3:'NE5532 balanced input stage, left',U5:'NE5532 balanced input stage, right',U6:'CS8416 reference receiver',U7:'AT90CAN128 controller',U8:'SN65HVD233 CAN transceiver',U9:'SN75HVD10 RS-485 driver (110 Ω AES out)',U12:'SN75HVD10 RS-485 driver',U14:'SN75HVD10 RS-485 driver',U10:'EP1C3T100 FPGA (clocks, AES encoding)',U11:'M25P40 configuration flash',U13:'PLL1705 audio clock generator',U2:'EL5263 75 Ω AES drivers',U4:'DS34LV87T RS-422 driver',X2:'27 MHz oscillator (PLL1705 master)',L:'card-edge LED',JTAG:'AVR JTAG header',H:'header / jumper'};
/* timeline */
function lanes(){ const css=SIM.css, ls=[];
  ls.push(K.waveLane('LEFT analog in (scaled to full scale)', t=>{ const a=Math.pow(10,dBFS('L')/20); return a*Math.sin(2*Math.PI*D.L.f*t); }, {h:34}));
  ls.push({label:'AK5394A samples → AES frames', h:24, draw(c,X,t0,t1,y,h){ const fs=outFs((t0+t1)/2); if(t1-t0<400/fs) SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.4/fs,css('--accent'),'samples'); else SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,css('--warn'),'AES blocks'); }});
  ls.push(K.waveLane('LEFT digital out (dBFS, clipped at 0)', t=>sample('L',t), {h:34}));
  ls.push({label:'AVR 500 Hz to FPGA (PB3, timer0)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,2e-3,0,1e-3,css('--accent2'),'TOGGLE_500HZ_PIN'); }});
  ls.push({label:'AVR main loop (175 µs/pass)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.LOOP_T,0,C.LOOP_T*0.9,css('--accent'),'passes'); }});
  ls.push(K.boolLane('CAL LED (reset_adc)', t=>leds(t).cal, '#c0392b'));
  ls.push(K.boolLane('Internal LED', t=>leds(t).in, '#d9a21b'));
  ls.push(K.boolLane('Selected-ref LED (REF1/REF2/External)', t=>{ const L=leds(t); return L.r1||L.r2||L.ex; }, '#2f8f46'));
  ls.push(K.canLane(canList()));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('DashBoard (redrawn)', `<div id="dash"></div>`)}${card('Inputs, jumpers, references', `<div id="ctl"></div><div id="dip" style="margin-top:8px"></div>`)}</div>
    <div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div><div class="small" style="margin-top:4px">${ART.edgeCite()}</div>`)}${card('Rear module', `<div id="rear"></div><div class="small" style="margin-top:4px">${ART.rearCite()}</div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas><p class="small muted">Loop time is from the source: <span class="mono">ADC_RESET_CONSTANT 5714 // 1 cycle = 175us or 5714 cycles = 1 sec</span> (d6203_test.c). The chirp is 1000 passes on / 7000 off. LOCK_CONSTANT’s value is ${inf('not found in the v104 headers')} (200 passes used).</p>`)}
    <div class="grid2">${card('Scope: AES3 output frame at the playhead', `<canvas id="scope"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, fs=outFs(t), n=Math.floor(t*fs);
    m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dip').innerHTML=dipSVG(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG();
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    m.querySelector('#insp').innerHTML=`<table class="kv"><tr><th>reference / reference_sel</th><td class="mono">${REFN[eff().ref]} / ${REFN[refSel(t)]}</td></tr><tr><th>Output rate</th><td class="mono">${fs/1000} kHz · frame ${n.toLocaleString()}</td></tr><tr><th>Levels</th><td class="mono">L ${dBFS('L').toFixed(1)} dBFS · R ${dBFS('R').toFixed(1)} dBFS${dBFS('L')>0||dBFS('R')>0?' <b style="color:var(--bad)">CLIP</b>':''}</td></tr><tr><th>ALTERA_write data_lower</th><td class="mono">${ctl(t).toString(2).padStart(8,'0')}b (da_disabled · reference_sel ·· sample_rate ··· reference ··)</td></tr><tr><th>reset_adc</th><td class="mono">${calAt(t)?'YES — counting to 5714':'NO'}</td></tr></table>`;
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); K.drawAES(m.querySelector('#scope'),{fs, a:sample('L',t), b:sample('R',t), n, dead:booting(t)}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second, broken down', `<div id="lad"></div>`)}<div class="grid2">${card('Analog level through each stage (LEFT)', `<div id="path"></div>`)}${card('Card edge', `<div id="edge"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, fs=outFs(t);
    const rows=[['ADC samples per channel',fs.toLocaleString(),SIM.fmtDur(1/fs),'AK5394A (U1)'],['AES3 frames',fs.toLocaleString(),SIM.fmtDur(1/fs),'FPGA i2s_gen_cuv adds C/U/V; i2sx4_aes encodes'],['AES3 blocks',(fs/192).toFixed(2),SIM.fmtDur(192/fs),'channel-status block'],['AES bit cells',(128*fs/1e6).toFixed(3)+' M',SIM.fmtDur(1/128/fs),'to EL5263 (75 Ω) and SN75HVD10 (110 Ω) drivers'],
      ['500 Hz edges to FPGA','1,000','1 ms','timer0 → PB3; SR_DETECT_192 window'],['AVR loop passes','5,714','175 µs','stated in d6203_test.c'],['CAL after a change','—',SIM.fmtDur(C.ADC_RESET*C.LOOP_T),'ADC_RESET_CONSTANT 5714 passes'],['Missing-ref chirp',(1/((C.CHIRP_ON+C.CHIRP_OFF)*C.LOOP_T)).toFixed(2),SIM.fmtDur((C.CHIRP_ON+C.CHIRP_OFF)*C.LOOP_T),'1000 on / 7000 off passes'],['CAN heartbeat',(1/(C.HEARTBEAT*C.T1)).toFixed(2),'960 ms','CAN.c'],['Tone at '+D.L.f+' Hz',D.L.f,SIM.fmtDur(1/D.L.f),`${(fs/D.L.f).toFixed(1)} samples per cycle`]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    const fsDbu=4-D.hr.L;
    m.querySelector('#path').innerHTML=K.levelSVG([{name:'LEFT input (dBu)',level:D.L.dbu,note:'nominal +4 dBu (spec)'},{name:'NE5532 balanced stage (U3)',level:D.L.dbu,note:'unity '+inf('gain not traced')},{name:`H1 scaling (${D.hr.L})`,level:D.L.dbu,note:`full scale = +${fsDbu} dBu`},{name:'AK5394A full scale',level:fsDbu,col:'var(--ink2)'},{name:'Digital out (dBFS + '+fsDbu+')',level:Math.min(fsDbu,D.L.dbu),col:D.L.dbu>fsDbu?'var(--bad)':'var(--accent)',note:dBFS('L').toFixed(1)+' dBFS'}],{lo:-20,hi:30,clip:fsDbu,clipLabel:'0 dBFS'});
    m.querySelector('#edge').innerHTML=edgeSVG(t); };
  SIM.on('time', draw);
}
function viewPNP(m){
  m.innerHTML=card('The folder’s own content: pick-and-place programs (click a part)', `<div style="display:flex;gap:6px;margin-bottom:6px"><button data-iss="3" class="${D.pnpIss===3?'on':''}">Issue 3 (current)</button><button data-iss="2" class="${D.pnpIss===2?'on':''}">Issue 2 (VOID)</button><span class="small muted" style="align-self:center">Orange outline (issue 3 view) = moved, renamed or new since issue 2.</span></div><div id="pnp"></div><div id="pi"></div>`)
    + card('Issue 2 → issue 3 differences (from the two .prg files)', `<ul class="small"><li>221 placements in both.</li><li>New designators in iss3: <b>H11, JTAG1</b>; dropped: <b>H1-HLE, JTAG1-HLE</b> (the JTAG header footprint renamed).</li><li>Value fixes: R56 47R5 → <b>47R</b>; U9, U12, U14 “SN75HVD” → <b>SN75HVD10D</b> (full part number).</li><li>24 parts nudged by 2–9 thou (R42, R43, R72, R74, R51, R2, R32, R7, R36, R76, R77, C35, C36, C6, C20, C34, C49, C50, C62, C91, U12, U5, C23, REG1) — re-taught positions ${inf('no reason given')}.</li><li>Program header: “L Series Pick and Place Program, FILE_FORMAT=2, SINGLE_HEAD”; iss2 saved 2008-09-26, iss3 saved 2013-10-08 (the 2016 tag is the archive date).</li><li>No issue-4 program exists although the D6203A master is at ISS4 (README).</li></ul>`);
  const draw=()=>{ m.querySelector('#pnp').innerHTML=pnpSVG(); m.querySelector('#pi').innerHTML=pnpInfo(); m.querySelectorAll('[data-iss]').forEach(b=>b.classList.toggle('on',+b.dataset.iss===D.pnpIss)); bindAll(m); };
  SIM.on('time', draw);
}
const BLOCKS={
  ain:{x:10,y:30,w:150,h:80,t:'LEFT / RIGHT in',s:['balanced, >20 kΩ','Phoenix + − G'],d:'Stereo analog input on 3-pin Phoenix terminal blocks (all rear modules). Nominal +4 dBu.'},
  amp:{x:200,y:30,w:150,h:80,t:'NE5532 ×2 (U3, U5)',s:['balanced receiver','H1/H2: −20 / −18'],d:'Input stages; jumpers H1/H2 set whether +4 dBu lands at −20 or −18 dBFS (functional drawing).'},
  adc:{x:390,y:30,w:150,h:80,t:'AK5394A (U1)',s:['24-bit ΔΣ ADC','32–192 kHz'],d:'AKM AK5394A stereo converter. Reset/recalibrated (CAL LED) whenever the reference or rate changes.'},
  fpga:{x:390,y:160,w:170,h:110,t:'EP1C3T100 (U10)',s:['SR_DETECT_192, mclk_sel','i2s_gen_cuv, i2sx4_aes','altpll0/1/2'],d:'Detects the reference rate (MCLK counted against the AVR’s 500 Hz), selects clocks, packs the samples into AES3 with C/U/V bits.'},
  pll:{x:200,y:160,w:150,h:70,t:'PLL1705 (U13) + 27 MHz (X2)',s:['audio master clocks'],d:'TI PLL1705 multi-clock generator from a 27 MHz oscillator — the internal reference.'},
  rx:{x:10,y:160,w:150,h:80,t:'CS8416 (U6)',s:['REF IN / frame REF 1/2','H3 75/110 Ω'],d:'AES reference receiver; its lock bit is Astatus.'},
  drv:{x:600,y:120,w:150,h:90,t:'AES drivers',s:['EL5263 (75 Ω)','SN75HVD10 ×3, DS34LV87T (110 Ω)'],d:'OUT1–OUT4 on BNC (T6302A) or balanced Phoenix (T6303A).'},
  mcu:{x:200,y:290,w:170,h:80,t:'AT90CAN128 (U7)',s:['d6203_test.c main loop','LEDs, DIP, 500 Hz'],d:'Reference selection and fallback, CAL control, DashBoard over CAN (SN65HVD233, U8).'},
};
const WIRES=[['ain','amp',''],['amp','adc',''],['adc','fpga','I²S'],['pll','fpga','MCLK'],['rx','fpga','ref MCLK'],['fpga','drv','AES'],['mcu','fpga','ctl word + 500 Hz'],['rx','mcu','lock'],['fpga','pll','']];
const SHEETS=[{name:'1 · Converter', note:'Redrawn from the PNP part list (designators/values) and the D6203A functional drawing; pin-level nets were not available in this folder.', svg:()=>K.chip(120,80,160,'U3/U5 NE5532',[['IN+/−','LEFT/RIGHT ±']],[['OUT','→ AK5394A']],'balanced input')+K.chip(420,80,180,'U1 AK5394A',[['AINL±','from U3'],['AINR±','from U5'],['RST','reset_adc'],['MCLK','FPGA mclk_sel']],[['SDATA','→ FPGA'],['LRCK/SCLK','← FPGA']],'24-bit ADC')},
  {name:'2 · Clocks and reference', note:'U13 PLL1705 + X2 27 MHz, U6 CS8416, U10 EP1C3T100 (designators from D6203Aiss3-T.prg).', svg:()=>K.chip(100,80,160,'U6 CS8416',[['RXP','REF IN (H3)'],['RXP','frame REF 1/2']],[['RMCK','→ SR_DETECT_192'],['lock','→ AVR Astatus']])+K.chip(420,80,180,'U10 EP1C3T100',[['500 Hz','AVR PB3'],['ctl','ALTERA_write'],['MCLK','U13 PLL1705']],[['AES','OUT1–4 drivers'],['ALTERA1[1:0]','rate → AVR']],'Quartus project D6203.qpf')},
  {name:'3 · Controller', note:'AVR port bits from D6203A.h.', svg:()=>K.chip(330,60,200,'U7 AT90CAN128',[['PE2','REF1 LED'],['PE3','REF2 LED'],['PE4','EXTERNAL LED'],['PE5','INTERNAL LED'],['PE6','CAL LED'],['PE7','COM ACTIVITY'],['PB0','COM ERROR (not fitted: no L7)']],[['PB2','ADC RESET'],['PB3','500 Hz → FPGA'],['PB4','FPGA4'],['PINA','DIP SW1–8'],['PD7','CAN LBK']],'8 MHz · V104')}];
const TUT={i:0};
const LESSONS=[
  {title:'What this folder is', body:`<p>The <b>D6203</b> folder holds only the <b>pick-and-place programs</b> that loaded parts onto the <b>D6203A</b> board — an openGear stereo <b>analog-to-AES converter</b>. Open the <b>Placement</b> tab to see the board as the machine saw it. This tutorial runs the card those parts make.</p>`, check:()=>true, auto:true},
  {title:'1 · Set the input level', body:`<p>Feed +4 dBu tone into LEFT and RIGHT. With jumper <b>H1/H2 = −20</b>, +4 dBu becomes <b>−20 dBFS</b>: 20 dB of headroom. Push LEFT to <b>+28 dBu</b> and watch the output clip.</p>`, check:()=>D.L.dbu>=28, hint:'Analog in L → +28 dBu.'},
  {title:'2 · Less headroom', body:`<p>Bring LEFT back to +4 dBu and set H1 to <b>−18</b>. Now +4 dBu = −18 dBFS and full scale is +22 dBu.</p>`, check:()=>D.L.dbu===4&&D.hr.L===-18, hint:'L → +4 dBu, H1 → −18.'},
  {title:'3 · Lock to frame reference 1', body:`<p>In DashBoard set <b>Reference</b> to <b>Frame Ref 1</b>. The red <b>CAL</b> LED lights for about a second (the AK5394A is reset and recalibrated), then <b>REF1</b> lights.</p>`, check:()=>D.reference===0&&refSel(SIM.t)===0, hint:'Card Settings → Reference → Frame Ref 1 (then move the playhead on a little).'},
  {title:'4 · Lose the reference', body:`<p>Turn frame REF 1 off. The card falls back to its <b>internal</b> clock at once (yellow Internal LED) and the REF1 LED <b>chirps</b> to say the reference you chose is missing.</p>`, check:()=>D.reference===0&&!D.refs[0], hint:'Click “Frame REF 1 on” to switch it off.'},
  {title:'5 · External reference at 96 kHz', body:`<p>Plug in an external AES reference (click REF IN on the rear), set its rate to <b>96 kHz</b> and select <b>External Ref</b>. The output now runs at 96 kHz, whatever the internal sample-rate setting says.</p>`, check:()=>D.reference===2&&D.refs[2]&&D.extFs===96000, hint:'Ext REF on, rate 96 kHz, Reference → External Ref.'},
  {title:'Done', body:`<p>Now open the <b>Placement</b> tab and compare issue 2 and issue 3 of the board, or read <b>Findings</b>.</p>`, check:()=>true, auto:true},
];
function viewTut(m){ K.tutorialView(m,{D, st:TUT, title:'Tutorial — operating the D6203A (from the D6203A manual)', L:LESSONS, side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`), bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); }, reset:A.reset}); }
function viewSoft(m){
  m.innerHTML=`<div class="grid2">${card('Main loop (d6203_test.c, V104)', `<div id="flow"></div>`)}${card('Reference fallback (ALTERA_write + REFRESH_LEDS)', `<div id="fsm"></div>`)}</div>${card('How the controls did things', `<ol class="small"><li><b>Reference / Sample Rate</b> (DashBoard or DIP when SW7 OFF + SW8 ON) → reference, sample_rate → ALTERA_write packs <span class="mono">(da_disabled&lt;&lt;7)|(reference_sel&lt;&lt;5)|(sample_rate&lt;&lt;2)|reference</span> → FPGA picks clocks.</li><li><b>Any change</b> of reference_sel, sample_rate (on internal) or the FPGA-measured rate (ALTERA1 bits 1:0) → reset_adc = YES → AK5394A held/recalibrated for 5714 passes (1 s) → CAL LED.</li><li><b>Reference missing</b> → Astatus = 0 → reference_sel = INTERNAL_REF; NO_LOCK_CHIRP flashes the chosen reference’s LED.</li><li><b>Input level, H1/H2</b> → analogue only.</li></ol>`)}`;
  const draw=()=>{ const t=SIM.t;
    const st=['WDR · READ_DIP_SWITCHES','CS8416_READ_LOCK_ALL → Astatus','ALTERA_write (16 bits)','reference_sel / ALTERA1 changed? → reset_adc','reset_adc count to ADC_RESET_CONSTANT','NO_LOCK_CHIRP','REFRESH_LEDS','CAN_FUNCTIONS · save_settings','sample_rate / Astatus change → clocks_stable'];
    const k=Math.floor(((t%C.LOOP_T)/C.LOOP_T)*st.length);
    m.querySelector('#flow').innerHTML=`<svg viewBox="0 0 520 ${st.length*38+20}" style="width:100%">${st.map((s,j)=>`<rect x="10" y="${8+j*38}" width="500" height="30" rx="6" fill="${j===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="20" y="${28+j*38}" font-size="11.5" font-family="var(--mono)" fill="${j===k?'#fff':'var(--ink)'}">${s}</text>`).join('')}</svg>`;
    const e=eff(), rs=refSel(t);
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 520 180" style="width:100%">${[['selected ref',20,60,e.ref!==3],['locked + clocks_stable?',190,60,e.ref!==3],['use it',370,20,rs===e.ref&&e.ref!==3],['INTERNAL_REF + chirp',370,110,rs===3&&e.ref!==3],['Internal selected',20,140,e.ref===3]].map(([n,x,y,on])=>`<rect x="${x}" y="${y}" width="140" height="36" rx="16" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+70}" y="${y+22}" text-anchor="middle" font-size="11" fill="${on?'#fff':'var(--ink)'}">${n}</text>`).join('')}<path d="M160 78 H190 M330 70 L370 40 M330 86 L370 125" stroke="var(--ink2)" fill="none"/></svg><p class="small mono">reference = ${REFN[e.ref]} → reference_sel = ${REFN[rs]}</p>`; };
  SIM.on('time', draw);
}
const FINDINGS=[
  `<b>Artwork 2026|59: card edge and rear modules now from the CorelDRAW files.</b> Card edge: ${SIM.src('#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Functional/D6203A-card-edge.cdr')} (2008-05-08|41): six LEDs (REF1, REF2, External, Internal, CAL, COM Activity), no switch, no Error LED. T6302A, T6303A and T6402A: ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6203A - rear module options.cdr')} (2012-01-16|45). Assets: <span class="mono">assets/d6203-*.svg</span>; the controls sit on the drawing's coordinates.`,
  `<b>A fourth rear module is not modelled.</b> The same guide also offers the T6403A (dual card, 110 Ω, all Phoenix). In the combined ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6203A - D6204A rear module options.cdr')} (2011-12-01|44) the T6403 card-1 legends are placeholders (BNC1-2, AES1-2 … AES4-2) rather than REF IN / AES OUT names.`,
  `<b>The guide's T6302A footer reads “Analog to DigitalAudio Converter-75 Ohm”</b>, a missing space and a different wording from the other three modules (“Analog to Digital Converter”).`,
  `<b>This folder is only machine data.</b> D6203Aiss3-T.prg (2013-10-08) and VOID/D6203Aiss2-T.prg (2008-09-26) are “L Series” single-head pick-and-place programs: 221 placements each, feeder number, rotation and X/Y in inches. The firmware, FPGA and manual for the card are in the sibling <span class="mono">D6203A - #Master #OPENGEAR</span> folder (linked; the openGear plugin covers that card as a system).`,
  `<b>Issue 2 → 3:</b> JTAG header footprint renamed (H1-HLE/JTAG1-HLE → H11/JTAG1), R56 47R5 → 47R, the three SN75HVD10 drivers given full part numbers, 24 parts re-taught by a few thou. No issue-4 program although the board is at ISS4.`,
  `<b>No Error LED fitted.</b> D6203A.h defines COM_ERROR_LED on PB0, but the PNP program places only L2–L6 and L8 (four green, one yellow, one red) — no L7. The manual's card-edge figure also shows six LEDs.`,
  `<b>The loop time is written down.</b> d6203_test.c: <span class="mono">#define ADC_RESET_CONSTANT 5714 //1 cycle = 175us or 5714 cycles = 1 sec</span>. That makes the calibration hold 1 s and the missing-reference chirp 0.175 s on / 1.225 s off.`,
  `<b>Main file is an application-builder skeleton.</b> V104’s main() is in d6203_test.c (“Target: M128, Crystal 8 MHz”, 3/4/2008); there is no v100w.c in that build, unlike the other D62xx cards.`,
  `<b>Manual says the opposite direction.</b> The D6203A manual overview says it “provides digital to analog audio conversion”; the card is an analog-to-AES converter (AK5394A ADC).`,
  `<b>“Disable outputs” is commented out.</b> ALTERA_write keeps bit 7 for da_disabled but the DIP code that sets it is commented out, so the bit is always 0.`,
  `<b>Two names, one card.</b> README and OEM tables give Ross ADC-8432 for both this card and the AV6201A video DA (AV6201A README) — one of them is wrong ${inf('Ross ADC- prefix suggests the A-D converter')}.`,
];
const ASSUME=['Frame references are 48 kHz DARS '+inf('not stated'),'LOCK_CONSTANT = 200 passes '+inf('value not in the v104 headers'),'MCLK = 256 fs for SR_DETECT_192 counts '+inf('FPGA source not traced'),'NE5532 stage is unity gain; H1/H2 just set the ADC scaling '+inf('functional drawing only gives “−20 / −18”')];
const SOURCES=['#OPENGEAR #SERIES/D6203 - #Master #OPENGEAR/D6203 - #PNP #2016/D6203Aiss3-T.prg, VOID/D6203Aiss2-T.prg (this folder)',SIB+'D6203A #Software/atmel/v104/d6203_test.c, D6203A.c/.h, altera.h (firmware — sibling folder, linked)',SIB+'D6203A #Software/README.md (FPGA blocks) · D6203A #Functional/D6203A-card-edge.cdr, D6203A-FUNCTIONAL.cdr','#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6203A Manual.pdf'];
function viewFindings(m){ m.innerHTML=card('What the D6203 folder and its card are up to', `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>`)+card('Assumptions', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`)+card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${s}</li>`).join('')}</ul>`); }
SIM.register({ id:'d6203', product:'D6203', name:'D6203 · D6203A stereo A-to-AES converter: pick-and-place programs (2008|41)', year:2008,
  folder:'#OPENGEAR #SERIES/D6203 - #Master #OPENGEAR', family:'openGear',
  summary:'This folder holds only the issue 2 and issue 3 pick-and-place programs for the D6203A openGear analog-to-AES converter. The plugin draws the board from those placements and runs the card itself (AK5394A, reference fallback, CAL) from the V104 firmware in the sibling D6203A folder.',
  highlights:['Board drawn from the PNP program, issue 2 vs 3 diff','Analog level → dBFS with H1/H2 headroom','Reference fallback and chirp from the real 175 µs loop','CAL self-calibration timing','DIP switch and DashBoard'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 sample @ output',period:()=>1/outFs(SIM.t)},{label:'1 loop pass (175 µs)',period:()=>C.LOOP_T},{label:'1 ms',period:()=>1e-3},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms (500 Hz cycle)'],[0.0002,'200 µs']], defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'pnp',label:'Placement (PNP)',render:viewPNP},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:770,h:390,sel:'fpga'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'D6203A',sheets:SHEETS,foot:'REDRAWN from designators in the PNP program, D6203A.h and the functional drawing — not the original CAD (the D6203A P-CAD files are in the sibling folder).'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
