/* =====================================================================
   D6204A — AES/EBU to analog audio converter, openGear: engineering documents folder (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   This folder: D6204A Manual.doc (only copy), D6204A SPECIFICATIONS.doc, D6204-card-edge.pdf,
   D6204-FUNCTIONAL.pdf, D6204-T6302/T6402.pdf, ekd4396-sbw1-01.pdf. Firmware from the sibling:
   - #OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/D6204 - #Software/
       D6204 - #atmel/D6204 - #altera #Bootloader #v200 (v100w.c, D6204A.c/.h, AK4396.c, as.c)
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

/* ---------------- D6204A model ---------------- */
const inf=K.inf, card=K.card;
const ENG='#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/';
const V200=ENG+'D6204 - #Software/D6204 - #atmel/D6204 - #altera #Bootloader #v200/';
const FS_LIST=[32000,44100,48000,88200,96000,176400,192000];
const CALN=['Disabled','−20 dBFS = +4 dBu','−18 dBFS = +4 dBu','−12 dBFS = +4 dBu'];
const FSDBU=[null,24,22,16];   // analog: 74HC4053 U8/U12 (ML1-3/MR1-3 from dec2_4) picks R66 6K49 / R73 8K06 / R75 16K2 → 0 dBFS = +24 / +22 / +16 dBu; DISABLED (00) = all switches off = both pairs muted (d6204.js, D6204Aiss4.net, dec2_4.vhd)
const RSN=['none (muted)','R66 6K49','R73 8K06','R75 16K2'];
const C={ LOOP_T:250e-6, DEB:255, T1:96e-6, HEARTBEAT:10000, PROG:0.6 };
const D={ in:{conn:true, fs:48000, len:150, dbfs:-20, f:1000}, term:75, eq:false, tone:false, cal:1, alarm:true,
  dip:[1,1,1,1,1,1,1,1], lat:[1,1], rear:'T6302', slot:4, fsAt:-1, pfs:'NORMAL', bootAt:null, progAt:null, saved:false, log:[], canQ:[] };
const act=K.actor(D);
const dipEn=()=>D.lat[0]===1, dashEn=()=>D.lat[1]===1;
function dipCal(){ const on=i=>D.dip[i]===0; const b0=on(0), b1=on(1); return (!b0&&!b1)?1:(!b1&&b0)?2:(!b0&&b1)?3:0; }   // v100w.c after MIRROR + INVERT_DATA: bit0 = SW1 ON, bit1 = SW2 ON (SW1 = PA7 … SW8 = PA0, D6204Aiss4.net)
function dipTone(){ return D.dip[2]===0; }   // bit2 = SW3 ON
function effCal(){ if (dipEn()&&!dashEn()) return dipCal(); return D.cal; }
function effTone(){ if (dipEn()&&!dashEn()) return dipTone(); return D.tone; }
function locked(){ const i=D.in; if (!i.conn) return false; if (D.term===110) return i.len<300; return i.len <= (D.eq?1200:600); }
function speed(fs){ return fs>100000?'QUAD':fs>50000?'DOUBLE':'NORMAL'; }
function speedAt(t){ return (t>=D.fsAt && t<D.fsAt+C.DEB*C.LOOP_T)? D.pfs : speed(D.in.fs); }   // DEBOUNCE_fs: 255 passes
function resetting(t){ return t>=D.fsAt+C.DEB*C.LOOP_T && t<D.fsAt+C.DEB*C.LOOP_T+0.002; }      // AK4396_RESET(1000) ≈ 2 ms (inferred)
function programming(t){ return D.progAt!==null && t>=D.progAt && t<D.progAt+C.PROG; }
function booting(t){ return D.bootAt!==null && t>=D.bootAt && t<D.bootAt+0.15; }
function srcDbfs(){ return effTone()? -20 : D.in.dbfs; }
function outDbfs(){ return srcDbfs(); }   // the digital path is not scaled: calibration is analog
function outDbu(){ const c=effCal(); return c? srcDbfs()+FSDBU[c] : null; }
function srcSample(t){ const fs=D.in.fs, n=Math.floor(t*fs); if (effTone()) return 0.1*Math.sin(2*Math.PI*(n%48)/48); return Math.pow(10,D.in.dbfs/20)*Math.sin(2*Math.PI*D.in.f*n/fs); }
function anaOut(t){ if (!locked()||booting(t)||programming(t)||resetting(t)) return 0; const c=effCal(); if(!c) return 0; const g=Math.pow(10,(FSDBU[c]-24)/20); return Math.max(-1,Math.min(1,srcSample(t)*g)); }   // ±1 = ±(+24 dBu peak)
function leds(t){ if (booting(t)) return {l:0,n:0,e:0,c:0,x:0}; if (programming(t)) return {l:1,n:1,e:0,c:1,x:0}; const k=locked(); return {l:k?1:0,n:k?0:1,e:D.eq?1:0,c:canList().some(f=>f.dir==='tx'&&t>=f.t&&t<f.t+0.0012)?1:0,x:0}; }
function canList(){ const out=[], ph=(D.slot*0.0173)%0.9; for (let t=ph;t<1;t+=C.HEARTBEAT*C.T1) out.push({t,n:1,dir:'tx',label:'card → MFC: heartbeat'});
  for (let t=0.21;t<1;t+=0.5){ out.push({t,n:1,dir:'rx',label:'MFC → card: GET_PARAM'}); out.push({t:t+0.0005,n:1,dir:'tx',label:'card → MFC: REPORT_PARAM'}); }
  D.canQ.forEach(t=>{ out.push({t,n:1,dir:'rx',label:'MFC → card: SET_PARAM'}); out.push({t:t+0.0004,n:2,dir:'tx',label:'card → MFC: reply'}); });
  if (D.progAt!==null) for (let k=0;k<40;k++) out.push({t:D.progAt+k*C.PROG/40,n:1,dir:'rx',label:'MFC → card: FPGA image page (asMain)'});
  return out.filter(f=>!booting(f.t)).sort((a,b)=>a.t-b.t); }
function ctlWord(){ let lo=0xFF; lo = effTone()? lo&~0x04 : lo|0x04; const c=effCal(); if(c===0) lo&=~0x03; else if(c===1) lo|=0x03; else if(c===2){ lo|=0x02; lo&=~0x01; } else { lo|=0x01; lo&=~0x02; } return {up:(locked()?0:1)<<7, lo}; }
const b8=v=>v.toString(2).padStart(8,'0');
const A={
  eq(){ act('Press EQ switch (SW1)', tr=>{ D.eq=!D.eq; tr('READ_SWITCHES: EQ1_SWITCH (PINE bit 2) low → TRANSLATE_SWITCHES → eq1_active ^= 1'); tr(`PROCESS_MODES: CS8416_write1(0x04, ${D.eq?'0x89':'0x80'}) — RXP${D.eq?1:0}`); tr(`EQ_LED ${D.eq?'on':'off'} (PE3); input ${locked()?'locked':'not locked'} at ${D.in.len} m`); }); },
  plug(){ act(`${D.in.conn?'Unplug':'Plug in'} AES IN (rear 1)`, tr=>{ D.in.conn=!D.in.conn; tr(`CS8416 ${locked()?'locks':'loses lock'} → Astatus → LOCK_LED / NO_LOCK_LED (PE0 / PE1)`); tr(`ALTERA_write data_upper bit 7 = NOT aes1_lock = ${locked()?0:1}; analog outputs ${locked()?'carry audio':'mute'}`); }); },
  len(v){ act(`AES cable → ${v} m`, tr=>{ D.in.len=v; tr(`600 m without EQ (D6201A manual, same front end), ${inf('1200 m with EQ')}; now ${locked()?'locked':'NOT locked'}`); }); },
  fs(v){ act(`Source sample rate → ${v/1000} kHz`, tr=>{ D.pfs=speed(D.in.fs); D.in.fs=v; D.fsAt=SIM.t;
    tr(`FPGA SR_DETECT_192 → ALTERA1 bits 1:0 (valid when ALTERA2 == 0xAA); CS8416_READ_SAMPLE_RATE → fs_flag bit 2`);
    tr(`DEBOUNCE_fs: fs_flag must hold for ${C.DEB} passes (≈${(C.DEB*C.LOOP_T*1000).toFixed(0)} ms ${inf('pass time')}) → fs = ${speed(v)}_SPEED`);
    if (speed(v)!==D.pfs) tr(`fs != pfs → AK4396_RESET(1000) then REFRESH_AK4396: reg 0x01 = ${speed(v)==='DOUBLE'?'0x0A (DFS double)':speed(v)==='QUAD'?'0x12 (DFS quad)':'0x02 (normal)'}; PORTG bit 4 ${speed(v)==='QUAD'?'high':'low'}`); else tr('Same speed band — DAC not touched');
    if (v>96000) tr('The spec sheet (D6204A SPECIFICATIONS.doc) stops at 96 kHz; the manual and code go to 192 kHz'); }); },
  level(v){ act(`Programme level on the AES input → ${v} dBFS`, tr=>{ D.in.dbfs=v; tr(`Analog out = ${outDbfs().toFixed(1)} dBFS → ${outDbu()==null?'muted (Calibration: Disabled)':outDbu().toFixed(1)+' dBu via '+RSN[effCal()]}`); }); },
  dash(id,v){
    if (id==='reboot'){ act('DashBoard: Reboot', tr=>{ D.bootAt=SIM.t; D.lat=[D.dip[6],D.dip[7]]; tr('CANMSG_REBOOT → watchdog reset → main(): CAN_RX (PORTD bit 4 = LBK), ADC slot read, init_CS8416, init_AK4396, ALTERA_RESET'); tr(`SW7 ${D.dip[6]?'OFF':'ON'} → dip_switch_enabled = ${dipEn()?'YES':'NO'}, SW8 ${D.dip[7]?'OFF':'ON'} → dashboard_enabled = ${dashEn()?'YES':'NO'}${dashEn()?'':' (DashBoard locked out)'}`); if (dipEn()){ D.cal=dipCal(); D.tone=dipTone(); tr(`DIP branch: INVERT_DATA(dip_switches) → calibration = ${['DISABLED','CAL_20DBFS','CAL_18DBFS','CAL_12DBFS'][D.cal]} (SW1/SW2), tone = ${D.tone?'YES':'NO'} (SW3) as power-up defaults`); } else tr('RESTORE_INFORMATION_EEPROM: calibration and tone from EEPROM'); }); return; }
    if (id==='fpga'){ act('DashBoard: Upload FPGA image (d6204a…_fpga_v200.bin)', tr=>{ D.progAt=SIM.t; tr('V200 “FPGA bootloader”: Dashboard.c → alteraProgStart = YES; main loop stops normal work'); tr('as.c (Active Serial loader): AS_WRITE_ENABLE → AS_ERASE_BULK → AS_PAGE_PROGRAM × (file_size / 256) pages into the EPCS1'); tr('While programming: LOCK and NO LOCK LEDs both on (v100w.c: alteraProgStart == YES)'); tr(`Then reconfigure the FPGA; ≈${C.PROG} s here ${inf('real time depends on CAN throughput')}`); }); return; }
    if (id==='upload'){ act('DashBoard: Upload AVR image', tr=>{ tr('Ross OGP bootloader: START_UPGRADE 0x40 → UPGRADE_PAGE 0x41 … → VERIFY 0x42 → REBOOT 0x43'); tr('zeuspack images: D6204A_v2_00.bin / DAC-8416_v2_00.bin / 9262_v2_00.bin (load type 0)'); }); return; }
    if (!dashEn()){ act(`DashBoard: change ${id}`, tr=>tr('dashboard_enabled = NO (SW8 ON): SET_PARAM ignored')); return; }
    const nm={eq:'EQ (OID 3.2)',cal:'Calibration (OID 3.4)',tone:'Tone Generator (OID 3.5)',alarm:'Notify on Card Fault (OID 4.0)',save:'Save Settings (OID 3.1)'}[id];
    act(`DashBoard: ${nm}${id==='save'?'':' → '+(id==='cal'?CALN[+v]:id==='alarm'?(v==='1'?'Enabled':'Disabled'):(v?'Enabled':'Disabled'))}`, tr=>{
      if (id==='eq'){ D.eq=!!v; tr(`eq1_active = ${v?'YES':'NO'} → CS8416 reg 0x04 = ${v?'0x89':'0x80'}`); }
      if (id==='cal'){ D.cal=+v; tr(`calibration = ${['DISABLED','CAL_20DBFS','CAL_18DBFS','CAL_12DBFS'][+v]} → data_lower bits 1:0 = ${b8(ctlWord().lo).slice(6)}`); tr(+v? `dec2_4 out${+v} low → 74HC4053 U8/U12 switch ${RSN[+v]} into the output stage → 0 dBFS = +${FSDBU[+v]} dBu; +4 dBu ${['','= −20 dBFS','= −18 dBFS','= −12 dBFS'][+v]}; a −20 dBFS input comes out at ${(-20+FSDBU[+v]).toFixed(0)} dBu` : 'dec2_4 “00 = reserved not used”: ML1–3/MR1–3 all high → no gain resistor switched in → BOTH analog pairs muted (AES outputs unaffected)'); }
      if (id==='tone'){ D.tone=!!v; tr(`tone_generation = ${v?'YES':'NO'} → data_lower bit 2 = ${v?0:1} → FPGA tone_gen1 (−20 dBFS, 48 steps) replaces the input on AES OUT 1–4 and both analog pairs`); }
      if (id==='alarm'){ D.alarm=v==='1'; tr('smpte_alarm_enabled'); }
      if (id==='save'){ D.saved=true; tr('save_settings → SAVE_INFORMATION_EEPROM'); }
      D.canQ.push(SIM.t); });
  },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1; tr('READ_DIP_SWITCHES: dip_switches = MIRROR(PINA) (SW1 = PA7 → bit0 … SW8 = PA0 → bit7)'); tr(i>=6?'SW7/SW8 are read at power-up only — reboot to apply (SW7 OFF = DIPs set power-up defaults, SW8 ON = DashBoard lockout)':i>=3?'SW4–SW6 are read but nothing in V200 uses them':dipEn()&&!dashEn()?`ALTERA_write uses them: calibration ${CALN[effCal()]} (SW1/SW2), tone ${effTone()?'on':'off'} (SW3)`:'live only when SW7 OFF and SW8 ON (else used as power-up defaults when SW7 OFF)'); }); },
  term(v){ act(`Jumper 75/110 → ${v} Ω`, tr=>{ D.term=+v; tr(`Input termination ${v} Ω (functional drawing); ${locked()?'locked':'not locked'}`); }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; tr(RM[r].note); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; tr(`ADDRESS_TABLE → slot ${n}`); }); },
  reset(){ Object.assign(D,{term:75,eq:false,tone:false,cal:1,alarm:true,rear:'T6302',slot:4,fsAt:-1,pfs:'NORMAL',bootAt:null,progAt:null,saved:false}); D.in={conn:true,fs:48000,len:150,dbfs:-20,f:1000}; D.dip=[1,1,1,1,1,1,1,1]; D.lat=[1,1]; D.log=[]; D.canQ=[]; SIM.refresh(); },
};
const RM={ T6302:{name:'T6302A', sub:'single card (D6204-T6302.pdf)', note:'T6302A: AES IN, AES OUT 1–4 on BNC, two stereo analog outputs on Phoenix (+ − G).',
    cells:[[1,'AES IN','bnc','in'],[2,'NOT USED','nc'],[3,'AES OUT 1','bnc'],[4,'AES OUT 3','bnc'],[5,'AES OUT 2','bnc'],[6,'AES OUT 4','bnc'],[7,'LEFT OUT 1','tb'],[8,'LEFT OUT 2','tb'],[9,'RIGHT OUT 1','tb'],[10,'RIGHT OUT 2','tb']]},
  T6402:{name:'T6402A', sub:'double card (D6204-T6402.pdf)', note:'T6402A: two cards; each gets AES IN, AES OUT1/OUT2 and one stereo analog pair.',
    cells:[[2,'AES IN #1','bnc','in'],[1,'AES IN #2','bnc'],[4,'OUT1 #1','bnc'],[3,'OUT1 #2','bnc'],[6,'OUT2 #1','bnc'],[5,'OUT2 #2','bnc'],[8,'LEFT #1','tb'],[7,'LEFT #2','tb'],[10,'RIGHT #1','tb'],[9,'RIGHT #2','tb']]} };
/* CorelDRAW artwork (artwork pass 2026|59): card edge and rear modules converted from the archive .cdr files
   to assets/d6204a-*.svg; LED, switch and connector positions are the artwork's own coordinates (pt). */
const ART={edge:{"vb":[61,129,219,312],"led":[[177.41,151.59,5.74,12.58],[177.41,172.75,5.74,12.58],[177.52,195.94,5.74,12.58],[177.41,239.79,5.74,12.58],[177.52,262.98,5.74,12.58]],"sw":[[177.35,154.62,15.87,27.94]],"href":"d6204a-edge.svg"},
 rear:{"T6302":{"vb":[315.5,211.5,147.5,186.5],"panel":[368.05,255.68,39.83,99.57],"s":1.006,"pos":{"1":[374.89,270.77],"2":[393.9,270.77],"3":[374.89,289.78],"4":[393.9,289.78],"5":[374.89,308.79],"6":[393.9,308.79],"7":[374.89,327.8],"8":[393.9,327.8],"9":[374.89,346.81],"10":[393.9,346.81]},"href":"d6204a-rear-t6302.svg"},
  "T6402":{"vb":[463.8,211.5,148.7,186.5],"panel":[518.64,256.75,39.83,99.57],"s":1.006,"pos":{"1":[525.48,271.84],"2":[544.49,271.84],"3":[525.48,290.85],"4":[544.49,290.85],"5":[525.48,309.86],"6":[544.49,309.86],"7":[525.48,328.87],"8":[544.49,328.87],"9":[525.48,347.88],"10":[544.49,347.88]},"href":"d6204a-rear-t6402.svg"}},
 edgeCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/D6204 - #Functional/D6204-card-edge.cdr','D6204-card-edge.cdr (2007-12-12)'),
 rearCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6204A - rear module options.cdr','D6204A - rear module options.cdr (2012-01-09): T6302A, T6402A')};
function rearSVG(){ const r=RM[D.rear], t=SIM.t, ok=locked()&&!programming(t), mine=l=>D.rear!=='T6402'||l.includes('#1');
  return K.rearSVG({art:ART.rear[D.rear], name:r.name, sub:r.sub, split:D.rear==='T6402'?['CARD 2','CARD 1 (this card)']:null, id:'AN_BMID 3K57 + AN_BMID2', cells:r.cells.map(([n,l,k,id])=>({n,label:l,kind:k,id,conn:id==='in'?D.in.conn:undefined,live:id==='in'?(D.in.conn?(ok?true:'warn'):undefined):(k!=='nc'&&mine(l))?(ok?(k==='tb'&&outDbfs()>=0?'warn':true):'err'):undefined}))}); }
function edgeSVG(t){ const L=leds(t); return K.edgeSVG({art:ART.edge, label:'D6204A', leds:[{name:'Lock',c:'g',on:L.l,y:60},{name:'No Lock',c:'r',on:L.n,y:100},{name:'EQ',c:'y',on:L.e,y:150},{name:'COM Activity',c:'g',on:L.c,y:240},{name:'Error',c:'r',on:L.x,y:290,title:'COM_ERROR_LED (PE5)'}], sws:[{id:'eq',name:'EQ Switch (SW1)',y:80,state:D.eq?'EQ IN':'EQ OUT'}], note:'Artwork: D6204-card-edge.cdr'}); }
function dashHTML(){ const ok=locked(), ro=!dashEn();
  return K.dashHTML({key:'d6204a', title:`Slot ${D.slot}: D6204A`, alarm:!ok&&D.alarm, tree:[{name:'DFR-8320 frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: D6204A`,lvl:1,sel:true}],
    tabs:[{name:'Card Info',rows:[{type:'text',label:'Product',value:'D6204A'},{type:'text',label:'Supplier',value:'www.ward-beck.com'},{type:'text',label:'AVR Software Rev',value:'2.00'},{type:'text',label:'FPGA Software Rev',value:'2.00 (shift_in16_version_out)'}]},
      {name:'Card Status',rows:[{type:'status',label:'Card Status',value:ok?'OK':'No AES Audio Lock',level:ok?'ok':'err',oid:'2.1'},{type:'status',label:'AES Input',value:ok?'Locked':'Unlocked',level:ok?'ok':'err',oid:'2.2'},{type:'text',label:'DAC speed',value:speedAt(SIM.t)+' ('+D.in.fs/1000+' kHz)'}]},
      {name:'Settings',rows:[{type:'toggle',id:'eq',label:'EQ',value:D.eq,on:'Enabled',off:'Disabled',oid:'3.2'},{type:'combo',id:'cal',label:'Calibration',value:D.cal,options:CALN.map((n,i)=>[i,n]),oid:'3.4'},{type:'toggle',id:'tone',label:'Tone Generator',value:D.tone,on:'Enabled',off:'Disabled',oid:'3.5'},{type:'combo',id:'alarm',label:'Notify on Card Fault',value:D.alarm?1:0,options:[[1,'Enabled'],[0,'Disabled']],oid:'4.0'},{type:'button',id:'save',label:'Save Settings',text:'Save',oid:'3.1'}],note:ro?'DIP SW8 ON: read-only.':''}],
    footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload AVR…'},{id:'fpga',text:'Upload FPGA…'}], foot:'V200'}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>AES in</b><button data-x="plug">${D.in.conn?'Unplug':'Plug in'}</button> cable ${sel('len',[5,150,450,600,800,1100].map(v=>[v,v+' m']),D.in.len)} rate ${sel('fs',FS_LIST.map(v=>[v,v/1000+' kHz']),D.in.fs)} level ${sel('lvl',[-30,-20,-18,-12,-6,0].map(v=>[v,v+' dBFS']),D.in.dbfs)} term ${sel('term',[[75,'75 Ω'],[110,'110 Ω']],D.term)} rear ${sel('rear',Object.keys(RM).map(k=>[k,RM[k].name]),D.rear)} <button data-x="reset">Defaults</button></div>
  <div style="margin-top:6px">${dipSVG()}</div>`; }
function dipSVG(){ let s=`<svg viewBox="0 0 520 110" style="width:100%;max-width:520px"><rect x="10" y="10" width="300" height="60" rx="4" fill="#c0392b"/><text x="16" y="22" font-size="10" fill="#fff">ON ▲ DIP (OUT1_SWITCH1–4, OUT2_SWITCH1–4)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${v?'OFF':'ON'}</title><rect x="${x}" y="28" width="22" height="38" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?48:31}" width="16" height="15" fill="#222"/><text x="${x+11}" y="84" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  return s+`<text x="330" y="22" font-size="10.5" fill="var(--ink2)">1+2: cal (OFF OFF −20, ON OFF −18,</text><text x="330" y="35" font-size="10.5" fill="var(--ink2)">  OFF ON −12, ON ON Disabled) · 3: tone</text><text x="330" y="48" font-size="10.5" fill="var(--ink2)">4–6 unused · 7 OFF: DIP defaults</text><text x="330" y="61" font-size="10.5" fill="var(--ink2)">8 ON: DashBoard lockout</text><text x="10" y="104" font-size="10.5" fill="var(--accent)">DIP ${dipEn()&&!dashEn()?'in control':'ignored'} · cal ${CALN[effCal()]} · tone ${effTone()?'on':'off'}</text></svg>`; }
function bindAll(r){ K.bind(r,{sw:{eq:()=>A.eq()}, jack:{in:()=>A.plug()}, slot:n=>A.slot(n), dash:(id,v)=>A.dash(id,v)}); r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip)));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='plug')A.plug(); else if(x==='len')A.len(+el.value); else if(x==='fs')A.fs(+el.value); else if(x==='lvl')A.level(+el.value); else if(x==='term')A.term(el.value); else if(x==='rear')A.rear(el.value); else if(x==='reset')A.reset(); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
function lanes(){ const css=SIM.css, fs=D.in.fs, ls=[];
  ls.push({label:`AES in @ ${fs/1000} kHz`, h:24, draw(c,X,t0,t1,y,h){ if(!locked()){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText('no lock',X(t0)+6,y+h/2+4); return; } if(t1-t0<400/fs) SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.4/fs,css('--accent'),'frames'); else SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,css('--warn'),'blocks'); }});
  ls.push(K.waveLane('LEFT analog out (±1 = +24 dBu peak)', anaOut, {h:40}));
  ls.push({label:'AK4396 speed (DFS)', h:22, draw(c,X,t0,t1,y,h){ const N=200; for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*i/N, s=speedAt(tt); c.fillStyle=resetting(tt)?css('--bad'):s==='NORMAL'?css('--accent'):s==='DOUBLE'?css('--accent2'):css('--warn'); c.fillRect(X(tt),y+4,(X(t1)-X(t0))/N+0.6,h-8); } c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(speedAt((t0+t1)/2)+' speed (red = AK4396_RESET)',X(t0)+4,y+h/2+3); }});
  ls.push({label:'AVR main loop (≈250 µs, inferred)', h:22, draw(c,X,t0,t1,y,h){ if (D.progAt!==null){ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(D.progAt),y+3,X(D.progAt+C.PROG)-X(D.progAt),h-6); c.globalAlpha=1; } SIM.pulses(c,X,t0,t1,y,h,C.LOOP_T,0,C.LOOP_T*0.9,css('--accent'),'passes (orange = alteraProgStart, loop parked)'); }});
  ls.push(K.canLane(canList()));
  ls.push(K.boolLane('Lock LED', t=>leds(t).l, '#2f8f46')); ls.push(K.boolLane('No Lock LED', t=>leds(t).n, '#c0392b')); ls.push(K.boolLane('COM Activity LED', t=>leds(t).c, '#5dbf4a'));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('DashBoard (redrawn)', `<div id="dash"></div>`)}${card('AES input, jumper, DIP', `<div id="ctl"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div><div class="small" style="margin-top:4px">${ART.edgeCite()}</div>`)}${card('Rear module', `<div id="rear"></div><div class="small" style="margin-top:4px">${ART.rearCite()}</div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}<div class="grid2">${card('Scope: AES3 input frame', `<canvas id="scope"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, w=ctlWord(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(); m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    m.querySelector('#insp').innerHTML=`<table class="kv"><tr><th>CS8416 reg 0x04</th><td class="mono">0x${D.eq?'89':'80'}</td></tr><tr><th>ALTERA_write</th><td class="mono">data_upper ${b8(w.up)}b · data_lower ${b8(w.lo)}b</td></tr><tr><th>AK4396</th><td class="mono">reg 0x01 = ${speedAt(t)==='DOUBLE'?'0x0A':speedAt(t)==='QUAD'?'0x12':'0x02'} · ATT L/R = 255 (0 dB)</td></tr><tr><th>Analog out</th><td class="mono">${locked()&&outDbu()!=null?`${outDbfs().toFixed(1)} dBFS → ${outDbu().toFixed(1)} dBu (${RSN[effCal()]})`:locked()?'muted (Calibration: Disabled)':'muted'}</td></tr><tr><th>Mode</th><td class="mono">${programming(t)?'FPGA programming (as.c)':booting(t)?'booting':'running'}</td></tr></table>`;
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); const n=Math.floor(t*D.in.fs), v=srcSample(t); K.drawAES(m.querySelector('#scope'),{fs:D.in.fs,a:v,b:v,n,dead:!locked()}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second, broken down', `<div id="lad"></div>`)}<div class="grid2">${card('Level through each stage', `<div id="path"></div>`)}${card('Card edge', `<div id="edge"></div>`)}</div>`;
  const draw=()=>{ const fs=D.in.fs;
    const rows=[['AES frames in',fs.toLocaleString(),SIM.fmtDur(1/fs),'CS8416 → FPGA'],['AES blocks',(fs/192).toFixed(2),SIM.fmtDur(192/fs),''],['DAC samples per channel',fs.toLocaleString(),'','AK4396 '+speed(fs)+' speed'],['AK4396 oversampled rate',(fs*(speed(fs)==='NORMAL'?128:speed(fs)==='DOUBLE'?64:32)/1e6).toFixed(3)+' M','',inf('datasheet oversampling ratio')],['AVR loop passes','≈'+Math.round(1/C.LOOP_T).toLocaleString(),SIM.fmtDur(C.LOOP_T),inf('pass time')],['DEBOUNCE_fs hold','',SIM.fmtDur(C.DEB*C.LOOP_T),'255 passes before a speed change'],['CAN heartbeat','1.04','960 ms','CAN.c'],['Tone (if on)',(fs/48).toFixed(0)+' Hz','','48-step table']];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#path').innerHTML=K.levelSVG([{name:'AES input (dBFS + 24)',level:srcDbfs()+24,note:effTone()?'tone_gen1 −20 dBFS':'programme'},{name:'FPGA (no scaling)',level:srcDbfs()+24,note:'calibration bits only drive dec2_4'},{name:`Output stage, 74HC4053 → ${RSN[effCal()]}`,level:locked()?outDbu():null,note:effCal()?`0 dBFS = +${FSDBU[effCal()]} dBu`:'Disabled: muted'},{name:'Balanced out, 60 Ω',level:locked()?outDbu():null}],{lo:-20,hi:30,clip:24,clipLabel:'+24 dBu = 0 dBFS',unit:'dBu'});
    m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); };
  SIM.on('time', draw);
}
const BLOCKS={ rin:{x:10,y:40,w:150,h:70,t:'AES IN',s:['transformer, 75/110 jumper','EQ ON/OFF'],d:'D6204-FUNCTIONAL.pdf: AES IN → transformer → 75/110 termination jumper → EQ (switchable) → re-clocker.'},
  rx:{x:200,y:40,w:150,h:70,t:'CS8416',s:['receiver, reg 0x04 EQ select'],d:'Recovers the AES3 stream; the AVR reads lock and the rate flag.'},
  fpga:{x:390,y:40,w:170,h:110,t:'EP1C3T100',s:['re-clocker, SR_DETECT_192','tone_gen1, dec2_4 (cal select)','AES OUT 1–4 encoder'],d:'Project D6201A.qpf (copied from the D6201 DA). Measures the sample rate, inserts tone, decodes the calibration bits into ML1–3/MR1–3 for the analog switches, and regenerates four AES outputs.'},
  dac:{x:390,y:200,w:170,h:70,t:'AK4396',s:['24-bit DAC, DFS speed bits'],d:'AKM AK4396 (ekd4396-sbw1-01.pdf in this folder). REFRESH_AK4396 sets reg 0x01 for normal/double/quad speed and full-scale attenuation.'},
  aout:{x:600,y:200,w:150,h:70,t:'Analog out ×2 pairs',s:['74HC4053 cal: R66/R73/R75','+24/+22/+16 dBu max, 60 Ω bal.'],d:'Two balanced stereo pairs (LEFT/RIGHT OUT #1, #2) on Phoenix connectors. Calibration is analog: U8/U12 74HC4053 switch R66 6K49 / R73 8K06 / R75 16K2 into the output stage (0 dBFS = +24 / +22 / +16 dBu); with none switched in (Disabled) both pairs are muted.'},
  aes:{x:600,y:40,w:150,h:70,t:'AES OUT 1–4',s:['75 Ω BNC'],d:'Four regenerated AES outputs (T6302A).'},
  mcu:{x:200,y:200,w:150,h:90,t:'AT90CAN128',s:['v100w.c, AK4396.c','as.c FPGA loader (V200)'],d:'Runs the loop, sets the DAC speed, writes the FPGA control word and, from V200, reprograms the EPCS1 over CAN.'} };
const WIRES=[['rin','rx',''],['rx','fpga','I²S'],['fpga','aes','AES'],['fpga','dac','I²S'],['dac','aout',''],['mcu','fpga','ctl + AS prog'],['mcu','dac','serial'],['rx','mcu','lock/rate']];
const SHEETS=[{name:'1 · AVR', note:'Port bits from D6204A.h (V200).', svg:()=>K.chip(330,50,200,'AT90CAN128',[['PE0','LOCK LED'],['PE1','NO LOCK LED'],['PE2','EQ1 SWITCH'],['PE3','EQ LED'],['PE4','COM ACTIVITY'],['PE5','COM ERROR'],['PA7–4','OUT1_SWITCH1–4 = DIP SW1–4'],['PA3–0','OUT2_SWITCH1–4 = DIP SW5–8']],[['PD4','CAN LBK (CAN_TX/RX)'],['PG4','QUAD flag'],['SPI-ish','AK4396 CS/CCLK/CDTI'],['FPGA','ALTERA1–4 shift'],['AS','EPCS1 (as.c)']],'V200 · ICCAVR 7.15')},
  {name:'2 · DAC', note:'AK4396 register writes from AK4396.c.', svg:()=>K.chip(330,60,200,'AK4396',[['SDTI/BICK/LRCK','from FPGA'],['MCLK','FPGA'],['PDN','AK4396_RESET']],[['AOUTL±','LEFT'],['AOUTR±','RIGHT']],'reg0 0x07 · reg1 0x02/0x0A/0x12 · reg3/4 ATT')+`<text x="40" y="330" font-size="11" fill="var(--ink2)">Attenuation table: 0 dB→255, −3→180, −4→160, −6→127, −10→80 … (ATT is linear: dB = 20·log(ATT/255)).</text>`}];
const TUT={i:0};
const LESSONS=[
  {title:'Meet the D6204A', body:'<p>The D6204A turns one AES3 digital input into <b>analog stereo</b> (two balanced pairs) and also passes the AES on to four outputs. Its front edge has Lock, No Lock, EQ, COM and Error LEDs and an EQ push-button (manual figure 5).</p>', check:()=>true, auto:true},
  {title:'1 · Connect and lock', body:'<p>Plug in the AES input. <b>Lock</b> lights; analog appears on LEFT/RIGHT OUT.</p>', check:()=>locked(), hint:'Click AES IN on the rear.'},
  {title:'2 · Long cable, EQ', body:'<p>Set the cable to 800 m: No Lock. Press the <b>EQ</b> switch to recover.</p>', check:()=>D.in.len>=800&&locked(), hint:'cable 800 m, then EQ switch.'},
  {title:'3 · Calibrate the level', body:'<p>With a −20 dBFS input, Calibration “−20 dBFS = +4 dBu” gives +4 dBu out. Change to <b>−18 dBFS = +4 dBu</b>: the output stage switches from R66 to R73 (0 dBFS = +22 dBu), so −18 dBFS now gives +4 dBu and the same −20 dBFS input comes out 2 dB quieter, at +2 dBu.</p>', check:()=>D.cal===2, hint:'Settings → Calibration → −18 dBFS.'},
  {title:'4 · Line-up tone', body:'<p>Enable the <b>Tone Generator</b>: a −20 dBFS tone replaces the programme on every output.</p>', check:()=>effTone(), hint:'Settings → Tone Generator.'},
  {title:'5 · 96 kHz', body:'<p>Set the source to <b>96 kHz</b>. After the 255-pass debounce the AVR resets the AK4396 into double-speed mode (watch the speed lane).</p>', check:()=>D.in.fs===96000, hint:'rate → 96 kHz.'},
  {title:'6 · New FPGA image', body:'<p>Press <b>Upload FPGA…</b>. V200 programs the FPGA’s configuration memory itself; Lock and No Lock both light while it works.</p>', check:()=>D.progAt!==null, hint:'DashBoard footer → Upload FPGA….'},
  {title:'Done', body:'<p>See <b>Findings</b> for the “#PROBLEM” duplicate folders and the manual vs spec differences.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — using the D6204A (from the D6204A manual in this folder)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2">${card('Main loop (V200 v100w.c)', `<div id="flow"></div>`)}${card('How the controls did things', `<ol class="small"><li><b>EQ</b> (switch or OID 3.2) → eq1_active → CS8416 reg 0x04 0x80/0x89 → EQ LED.</li><li><b>Sample rate</b> → FPGA SR_DETECT_192 → ALTERA1[1:0] (+ CS8416 rate flag) → DEBOUNCE_fs (255 passes) → AK4396_RESET + REFRESH_AK4396 (reg 0x01 DFS).</li><li><b>Calibration / Tone</b> (OID 3.4 / 3.5 or DIP SW1–2 / SW3) → ALTERA_write data_lower bits 1:0 / 2 → dec2_4 → 74HC4053 picks R66/R73/R75 (analog gain); Disabled mutes both pairs.</li><li><b>FPGA upload</b> → alteraProgStart → asMain(): erase EPCS1, 256-byte pages → reconfigure.</li></ol>`)}</div>`;
  const draw=()=>{ const p=programming(SIM.t); const st=p?['alteraProgStart == YES → LOCK + NO LOCK on','CAN_FUNCTIONS → asMain() page program']:['WDR · CS8416_READ_LOCK_ALL','ALTERA2 == 0xAA → fs_flag = ALTERA1 & 3; CS8416_READ_SAMPLE_RATE','DEBOUNCE_fs → AK4396 speed','PROCESS_EQ_PUSHBUTTONS · PROCESS_MODES','READ_DIP_SWITCHES · REFRESH_LEDS','ALTERA_write (+ read firmware rev)','CAN_FUNCTIONS · save_settings']; const k=Math.floor(((SIM.t%C.LOOP_T)/C.LOOP_T)*st.length);
    m.querySelector('#flow').innerHTML=`<svg viewBox="0 0 540 ${st.length*38+20}" style="width:100%">${st.map((s,j)=>`<rect x="10" y="${8+j*38}" width="520" height="30" rx="6" fill="${j===k?(p?'var(--warn)':'var(--accent)'):'var(--panel2)'}" stroke="var(--line)"/><text x="20" y="${28+j*38}" font-size="11" font-family="var(--mono)" fill="${j===k?'#fff':'var(--ink)'}">${s}</text>`).join('')}</svg>`; };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>Artwork 2026|59: card edge and rear modules now from the CorelDRAW files.</b> Card edge: ${SIM.src('#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/D6204 - #Functional/D6204-card-edge.cdr')} (2007-12-12|40; identical copies in both #Functional folders; the ejector reads D6204A). T6302A and T6402A: ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6204A - rear module options.cdr')} (2012-01-09|45). Assets: <span class="mono">assets/d6204a-*.svg</span>; LEDs, SW1 and the connectors sit on the drawing's coordinates.`,
  `<b>“AES OUT34” on the T6302A.</b> Position 4 of the 2012 guide reads “AES OUT3” followed by a stray “4” in a separate text run, so it shows as “AES OUT34”. The model treats position 4 as AES OUT 3.`,
  `<b>An unbuilt DFR-8310 module.</b> ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/T6XXX/D6204Terms.cdr')} (2008-04-08|41) also draws a T6202A “REAR MODULE For DFR8310” (single card, BNC + Phoenix). It is in neither 2012 guide and is not modelled.`,
  `<b>The “#PROBLEM”.</b> The D6204 engineering folder holds the same project twice (D6204A/… and the hashtag “D6204 - #…” tree; no file differs, the hashtag tree only adds files) and this TIM folder is a third partial copy with an empty software skeleton. This folder is still the only home of <span class="mono">D6204A Manual.doc</span>.`,
  `<b>Misnamed firmware folders.</b> The AVR source lives in “D6204 - #altera #Bootloader #v107 / #v200”; the FPGA project is called D6201A.qpf (copied from the AES DA).`,
  `<b>Manual vs spec sheet.</b> The manual says “all sampling frequencies up to 192 kHz”; D6204A SPECIFICATIONS.doc says 30–96 kHz. The V200 code does handle quad speed (AK4396 reg 0x01 = 0x12, PORTG bit 4).`,
  `<b>Template leftover.</b> The manual’s rear-module figure caption reads “Rear Module Installation (UDC-8225 not shown)” — text from the Ross 8225-UDC example manual WBS started from.`,
  `<b>Speed switching moved, not removed.</b> V200 comments out the inline DOUBLE/QUAD code in the main loop and does it in DEBOUNCE_fs(), so a rate change takes 255 passes before the DAC is reset — an audible gap is deliberate.`,
  `<b>V200 = FPGA bootloader.</b> as.c (“EEPROM Data Loader used for Active Serial configuring of the Altera Cyclone I/II”, 2009-10-14) lets the AVR erase and page-program the EPCS1 from a DashBoard upload; during it both Lock and No Lock LEDs are lit.`,
  `<b>Corrected 2026|59: calibration is analog, and the DIP map comes from the netlist.</b> Calibration is not an FPGA gain: <span class="mono">dec2_4.vhd</span> turns data_lower bits 1:0 into ML1–3/MR1–3, and the U8/U12 74HC4053s switch R66 6K49 / R73 8K06 / R75 16K2 into the output stage (<span class="mono">D6204Aiss4.net</span>), giving 0 dBFS = +24 / +22 / +16 dBu. “Calibration: Disabled” (“00 = reserved not used”) switches none in, so both analog pairs are muted; the AES outputs are unaffected. DIPs (SW2 pins 16…9 → PA7…PA0, then <span class="mono">MIRROR()</span> and <span class="mono">INVERT_DATA()</span> in <span class="mono">v100w.c</span>): SW1/SW2 = calibration, SW3 = tone, SW4–6 unused, SW7 OFF = DIPs set the power-up defaults (<span class="mono">dip_switch_enabled</span>), SW8 ON = DashBoard lockout. The earlier model used SW6–SW8 for cal/tone and scaled the level digitally. (see d6204.js)`,
  `<b>Different LBK pin.</b> CAN_TX/CAN_RX use PORTD bit 4 here, bit 7 on the D6201A — the transceiver loop-back line moved between boards.`,
  `<b>Specs typo.</b> “Stereo Separation better than 105 dBu” (should be dB).`,
];
const ASSUME=['0 dBFS = +24/+22/+16 dBu per calibration resistor, assuming the factory trim (RV1/RV2) sets +24.0 dBu on R66 '+inf('as in d6204.js'),'AVR pass ≈ 250 µs '+inf('no timer'),'Cable reach 600 m / 1200 m with EQ '+inf('D6201A manual; D6204A manual gives none'),'FPGA programming takes 0.6 s here '+inf('real time not documented')];
const SOURCES=['#OPENGEAR #SERIES/D6204A  #Engineering #TIM #PCB/D6204A Manual.doc, D6204A SPECIFICATIONS.doc, D6204-card-edge.pdf, D6204-FUNCTIONAL.pdf, D6204-T6302.pdf, D6204-T6402.pdf, ekd4396-sbw1-01.pdf (this folder)',V200+'v100w.c, D6204A.c/.h, AK4396.c, as.c, CAN.c, Dashboard.c (firmware — sibling folder, linked)',ENG+'D6204 - #Software/README.md'];
function viewFindings(m){ m.innerHTML=card('What the D6204A (and its folders) are up to', `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join('')}</ol>`)+card('Assumptions', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`)+card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${s}</li>`).join('')}</ul>`); }
/* footnotes (artwork pass 2026|59): one small detail per entry, with the archive file that shows it */
const FOOTNOTES=[
{
"text": "Position 4 of the T6302A legend reads “AES OUT34”: “AES OUT3” plus a stray “4” in a separate text run.",
"src": "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6204A - rear module options.cdr"
},
{
"text": "A T6202A “REAR MODULE For DFR8310” is drawn here but appears in neither 2012 guide (unbuilt variant).",
"src": "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/T6XXX/D6204Terms.cdr"
},
{
"text": "The card-edge drawing's ejector always reads “D6204A”, whichever brand the card is built as.",
"src": "#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/D6204 - #Functional/D6204-card-edge.cdr"
},
{
"text": "D6204-card-edge.cdr is stored twice, byte-identical, in the D6204A/Functional and D6204 - #Functional folders.",
"src": "#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/D6204A/Functional/D6204-card-edge.cdr"
},
{
"text": "The D6201A card-edge drawing has the same LED and switch layout as the D6204 one (5 LEDs, one EQ switch).",
"src": "#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201A-card-edge.cdr"
},
{
"text": "The 2012 guide puts Analog OUT Left 1 / Right 1 on positions 7/9 and Left 2 / Right 2 on 8/10.",
"src": "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6204A - rear module options.cdr"
},
{
"text": "The combined 2011 guide spells the module “T6302” (no A) and its T6302 legend also reads “AES OUT34”.",
"src": "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6203A - D6204A rear module options.cdr"
}
];
SIM.register({ footnotes:FOOTNOTES, id:'d6204a', product:'D6204A', name:'D6204A · AES-to-analog converter, openGear: manual and drawings (2007|40)', year:2007,
  folder:'#OPENGEAR #SERIES/D6204A  #Engineering #TIM #PCB', family:'openGear',
  summary:'The D6204A turns one 75 Ω AES3 input into two balanced analog stereo pairs (+24 dBu max) plus four AES outputs (Ross DAC-8416 / Cobalt 9262). This folder holds the manual, specs and drawings; the model runs the V200 firmware from the duplicated D6204 #PROBLEM engineering tree.',
  highlights:['Card edge and rear modules from the drawings in this folder','Calibration, tone and dBFS → dBu ladder','AK4396 speed switching after a rate change','V200 FPGA self-programming','The “#PROBLEM” duplicate-folder answer'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 sample',period:()=>1/D.in.fs},{label:'1 AES block',period:()=>192/D.in.fs},{label:'1 loop pass',period:()=>C.LOOP_T},{label:'1 ms',period:()=>1e-3}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:770,h:310,sel:'fpga'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'D6204A',sheets:SHEETS,foot:'REDRAWN from D6204A.h / AK4396.c names and the functional drawing — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
