/* =====================================================================
   M6205C / M6205CE — customer “Cxxx” builds of the M6205 MD-SDI embedded audio processor (Ward-Beck Systems, 2008|41–2010|43)
   Sales and documentation folder "M6205C - #Master #OPENGEAR": DashBoard screenshots of C100, C200, CE300, CE400, C500, C600
   and the working manual “M6205CE V3.00 MD-SDI Embedded Audio Processor with Dolby E/AC-3 Decoding” (2010).
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   No code here. The firmware and switching rules live in the sibling folder (linked):
   - M6205 - #Master #OPENGEAR/M6205 - #Engineering/Software/: m6205c100 … M6205C700 (one folder per build, README table),
       “M6205c ControlIO.doc” and “M6205 Operational Info May20,2009.doc” (C100 / C200 audio switching rules),
       m6205c300/atmel/v200/Dashboard.c (Input Signal / Metadata / Audio Processing strings), README (SYNC header, SHARC)
   - this folder: the 16 DashBoard JPGs (redrawn here, not copied) and the CE V3.00 manual (LEDs, DIP, Dolby tables, menus)
   Anything not in those files is marked "inferred" on screen. No third-party logos; DashBoard is redrawn in plain style.
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
const SWF='M6205 - #Master #OPENGEAR/M6205 - #Engineering/Software/';
const T=['—','PCM','Dolby E','Dolby AC-3'];
/* builds, from the screenshots (product, name, software rev, tabs) and the Software README table */
const B={
  C100:{product:'M6205C100', name:'MD-SDI Embedded Audio Processor w/ VANC Detection', rev:'1.04', who:'CTV', what:'Dolby-metadata-driven Lt/Rt or Lo/Ro downmix to AES1; GPI1 forces the downmix off, GPI2 forces mono', tabs:['Card Info','Input Signal','Metadata'], shot:'M6205C100 - #SalesInfo #Software #VC100/'},
  C200:{product:'M6205C', name:'MD-SDI Embedded Audio Processor w/ VANC Detection', rev:'2.04', who:'CTV', what:'described-video (DV) mix, Dolby E pass/mute, GPI-made DV on AES4', tabs:['Card Info','Input Signal','Metadata','Audio Processing'], shot:'M6205C200 - #SalesInfo #Software #vC200/'},
  CE300:{product:'M6205CE300', name:'MD-SDI Embedded Audio Processor w/ Dolby E/AC-3 Decoding', rev:'3.06', who:'Astral', what:'Dolby E / AC-3 decode re-embedded, PCM delay, metadata delay', tabs:['Card Info','Status'], shot:'M6205CE300 - #SalesInfo/'},
  CE400:{product:'M6205CE400', name:'MD-SDI Embedded Audio Processor w/ Dolby Decoding', rev:'1.01', who:'customer', what:'decoder with a selectable input pair AES1–AES4, dialnorm', tabs:['Card Info','Card Status','Card Settings'], shot:'M6205CE400 - #SalesInfo/'},
  C500:{product:'M6205C500', name:'MD-SDI Embedded Audio Processor', rev:'1.00', who:'customer', what:'external AES In1/In2, optional SRC to 48 kHz, embedded into the SDI', tabs:['Card Info','Card Status'], shot:'M6205C500 - #SalesInfo #Software #vC500/'},
  C600:{product:'M6205C600', name:'MD-SDI Embedded Audio Processor w/ VANC Detection', rev:'1.00', who:'customer', what:'group enable only; v1.01 fixed audio checksum errors', tabs:['Card Info','Input Signal','Metadata'], shot:'M6205C600 - #SalesInfo #Software #vC600/'} };
const FMTS=['SD 525/59.94','SD 625/50','HD 1080i/59.94','HD 1080i/50','HD 720p/59.94','HD 720p/60'];
const ACMOD=['1/0','2/0','3/2'];
const mk=()=>({conn:true, fmt:'HD 1080i/59.94', p:[1,2,1,1,0,0,0,0], meta:true, acmod:2, ext:false, loro:false, ext1:true, ext2:true, src2:true});
const D={ build:'CE300', in:mk(), gpi:[false,false], dip:[0,0,0,1,1,1,1,1], gains:[0,0,0], ce400sel:1, groups:4, dialnorm:false, rear:'T6301A', slot:1, log:[], canQ:[] };
const act=K.actor(D);
const on=i=>D.dip[i]===0;
const L=()=>D.in.conn;
const pairT=i=>D.in.p[i];
function chStr(){ return [0,1,2,3].map(g=>[0,1].map(a=>{ const v=pairT(g*2+a); const c=v===1?'P':v===2?'E':v===3?'D':'-'; return c+c; }).join('')).join(' '); }
function groupsEn(){ if (D.build==='CE400'||D.build==='C600') return D.groups; return 1+(on(1)?1:0)+(on(0)?2:0); }    // CE manual Table 1: MSB SW1, LSB SW2
/* output map: returns {pairs:[{label, src}], ch:[], note, state:[label, level]} per build */
function route(){ const b=D.build, p=D.in.p, md=D.in.meta, g1=D.gpi[0], g2=D.gpi[1];
  if (!L()) return {pairs:[], state:['SDI Unlocked','err'], branch:-1};
  if (b==='C100'){ let ch, br;
    if (g2){ ch=['ch8 (mono programme)','ch8 (mono programme)','0','0']; br=5; }
    else if (md && !g1 && H8.F[D.in.fmt].kind!=='SD'){ const a=D.in.acmod;
      if (a===0){ ch=['C in','C in','0','0']; br=0; } else if (a===1){ ch=['L in','R in','0','0']; br=1; }
      else if (!D.in.ext){ ch=['Lt (ac3 cmix/smix)','Rt','0','0']; br=2; } else { ch=D.in.loro?['Lo','Ro','0','0']:['Lt','Rt','0','0']; br=D.in.loro?3:4; } }
    else { ch=['AES1 L','AES1 R','AES1 L','AES1 R']; br=6; }
    return {pairs:[{label:'Emb ch1/ch2 (AES1)',src:ch[0]+' / '+ch[1]},{label:'Emb ch3/ch4 (AES2)',src:ch[2]+' / '+ch[3]},{label:'ch5–16',src:'0 (“Always Out7-16 = 0”)'}], state:['OK','ok'], branch:br}; }
  if (b==='C200'){ const de=p[1]===2; let o, br;
    if (!md&&!g1&&!de){ o=['in1','in2','in3','in4','in5','in6']; br=0; } else if (!md&&g1&&!de){ o=['in1','in2','in3','mono(in1) — DV','in1','mute']; br=1; }
    else if (!md&&!g1&&de){ o=['in1','mute','mute','in4 (pass DV)','in1','in2 (Dolby E)']; br=2; } else if (!md&&g1&&de){ o=['in1','mute','mute','mono(in1) — DV','in1','in2 (Dolby E)']; br=3; }
    else if (md&&!g1&&!de){ o=['in1','in2','in3','in4','Lt/Rt','in6']; br=4; } else if (md&&g1&&!de){ o=['in1','in2','in3','mono(Lt/Rt) — DV','Lt/Rt','in6']; br=5; } else { o=['in1','in2','in3','in4','in5','in6']; br=6; }
    return {pairs:o.map((s,i)=>({label:'AES out'+(i+1),src:s+(i===0?` · Program ${D.gains[0]>=0?'+':''}${D.gains[0]} dB`:i===3&&/DV/.test(s)?` · DV ${D.gains[1]>=0?'+':''}${D.gains[1]} dB`:i===4&&/Lt/.test(s)?` · MixDown ${D.gains[2]>=0?'+':''}${D.gains[2]} dB`:'')})), state:['OK','ok'], branch:br}; }
  if (b==='CE300'||b==='CE400'){ const inIdx=b==='CE300'?1:D.ce400sel, coded=p[inIdx]>=2, en=b==='CE300'?on(2):true;
    const dec=coded&&en; const pairs= dec? [['G1 AES1','L, R'],['G1 AES2','C, LFE'],['G2 AES1','Ls, Rs'],['G2 AES2','StL, StR (pass)']] : [['G1 AES1','L, R (pass)'],['G1 AES2','Mute'],['G2 AES1','Mute'],['G2 AES2','StL, StR (pass)']];
    const delay=(b==='CE300'&&on(4))?' · PCM delayed one frame':'';
    return {pairs:pairs.map(([l,s])=>({label:l,src:s+(dec&&/L, R|C, LFE|Ls/.test(s)&&((b==='CE300'&&on(5))||(b==='CE400'&&D.dialnorm))?' · dialnorm → −31 dB':'')+(/pass/.test(s)?delay:'')})), state:dec?['OK','ok']:(b==='CE400'?['Dolby Decoding Error','err']:['OK','ok']), branch:dec?1:0, dec, inIdx}; }
  if (b==='C500'){ const o=[{label:'Emb AES1',src:D.in.ext1?'External AES In1 (PCM)':'embedded AES1 (pass)'},{label:'Emb AES2',src:D.in.ext2?'External AES In2'+(D.in.src2?' via SRC → 48 kHz':''):'embedded AES2 (pass)'}].concat([2,3,4,5,6,7].map(i=>({label:'Emb AES'+(i+1),src:p[i]?T[p[i]]+' (pass)':'—'})));
    return {pairs:o, state:['OK','ok'], branch:0, note:inf('which embedded pairs the two inputs replace')}; }
  return {pairs:[0,1,2,3,4,5,6,7].map(i=>({label:'Emb AES'+(i+1),src:((i>>1)<groupsEn())?(p[i]?T[p[i]]+' re-embedded':'—'):'group disabled'})), state:['OK','ok'], branch:0}; }
function ledsAt(t){ const l=L(), k=H8.F[D.in.fmt].kind, gp=[0,1,2,3].map(g=>l&&(D.in.p[g*2]||D.in.p[g*2+1])?1:0);
  return {sd:l&&k==='SD'?1:0, hd:l&&k!=='SD'?1:0, err:l?0:1, aud:gp, meta:l&&D.in.meta&&(D.build!=='C500')?1:0}; }
const A={
  build(b){ act(`Firmware build → ${b} (${B[b].product} v${B[b].rev})`, tr=>{ D.build=b; tr(`${B[b].who}: ${B[b].what} (Software README table)`); tr(`DashBoard tabs (screenshot ${B[b].shot}): ${B[b].tabs.join(' · ')}`); }); },
  plug(){ act(`${L()?'Unplug':'Plug in'} SDI IN`, tr=>{ D.in.conn=!D.in.conn; tr(`Card state → ${L()?'OK':'SDI Unlocked (red) — as in every sales screenshot taken without a signal'}`); }); },
  fmt(v){ act(`Source → ${v}`, tr=>{ D.in.fmt=v; tr(`SDI status string “${v}”`); if (D.build==='C100'&&H8.F[v].kind==='SD') tr('C100 rule needs HD_lock = yes for the downmix branch: on SD it falls to the pass-through branch'); }); },
  pair(i,v){ act(`Embedded AES${i+1} → ${T[v]}`, tr=>{ D.in.p[i]=+v; tr(`Embedded Audio string → “${chStr()}” (C compressed, D Dolby Digital, E Dolby E, P PCM)`); const r=route(); if (r.dec!==undefined) tr(r.dec?`Dolby on AES${r.inIdx+1}: decoder outputs re-embedded (manual “Dolby Detected” table)`:'No Dolby on the decoder input: manual “Dolby Not Detected” table'); }); },
  meta(){ act(`Dolby metadata in VANC → ${D.in.meta?'absent':'present'}`, tr=>{ D.in.meta=!D.in.meta; tr(`Audio Metadata (VANC): ${D.in.meta?'Detected':'Not Detected'} → META DATA LED`); tr(`C100/C200 rule branch → ${route().branch}`); }); },
  acmod(v){ act(`Metadata ac3_acmod → ${ACMOD[v]}`, tr=>{ D.in.acmod=+v; tr('C100: 1/0 → centre to both; 2/0 → L/R; otherwise Lt/Rt from ac3_cmix and ac3_smix (or Lo/Ro when the extended bitstream prefers it)'); }); },
  ext(){ act(`Extended bitstream → ${D.in.ext?'no':'yes'}`, tr=>{ D.in.ext=!D.in.ext; }); },
  loro(){ act(`Preferred downmix → ${D.in.loro?'Lt/Rt':'Lo/Ro'}`, tr=>{ D.in.loro=!D.in.loro; }); },
  gpi(n){ act(`GPI${n+1} → ${D.gpi[n]?'open':'closed'}`, tr=>{ D.gpi[n]=!D.gpi[n]; tr(D.build==='C100'?(n===0?'MixDown (GPI1): forces the pass-through branch':'PGM Override (GPI2): mono programme from channel 8 on channels 1 and 2'):D.build==='C200'?'GPI1 creates the DV mono on AES out4':'not used by this build'); tr(`rule branch → ${route().branch}`); }); },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1; tr(`CE manual: ${['SW1 Group Enable MSB','SW2 Group Enable LSB','SW3 Dolby Decoder Enable','SW4 HD Audio Clock (ON = clock phase one, OFF = video lock)','SW5 PCM Delay (one frame)','SW6 Dial Norm (−31 dB)','SW7 Reserved','SW8 Reserved'][i]} → groups enabled ${groupsEn()}`); }); },
  dash(id,v){ act(`DashBoard: ${id} → ${v}`, tr=>{ D.canQ.push(SIM.t);
    if (/^g\d/.test(id)){ const k=+id[1]; D.gains[k]=+v; tr(`Audio Processing → ${['Program','DV','MixDown (AES5)'][k]} gain ${v} dB (−15 … +15): AVR writes the FPGA/SHARC volume register after the “SYNC” header 0x53 0x59 0x4E 0x43`); }
    if (id==='unity'){ D.gains=[0,0,0]; tr('Unity All'); }
    if (id==='sel'){ D.ce400sel=+v; tr(`Dolby Decoder Selector → AES ${+v+1}`); }
    if (id==='grp'){ D.groups=+v; tr(`Audio Groups Enabled → ${v}`); }
    if (id==='dn'){ D.dialnorm=!!+v; tr('Dialnorm → '+(+v?'Enabled':'Disabled')); }
    if (id==='save') tr('Settings saved to EEPROM'); if (id==='reboot') tr('Reboot'); if (id==='upload') tr('Upload: AVR .bin and, from C100 v2.0.0.0 on, an FPGA image through the “FPGA boot loader”'); }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; tr(RM[r].note); }); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; tr('Even slots only in a DFR-8320 (the card takes two)'); }); },
  reset(){ Object.assign(D,{build:'CE300',in:mk(),gpi:[false,false],dip:[0,0,0,1,1,1,1,1],gains:[0,0,0],ce400sel:1,groups:4,dialnorm:false,rear:'T6301A',slot:1,log:[],canQ:[]}); SIM.refresh(); },
};
/* ---- Artwork 2026|59: card edge and rear module from the archive's CorelDRAW drawings (assets/*.svg, cleaned by the
   artwork pass). Jacks and LEDs are placed on the BNC / LED centres read from those SVGs; same data-jack hooks as the kit. */
const LIVEC={true:'#2f8f46',warn:'#d9a21b',err:'#c0392b',off:'#7d8286'};
function artRear(a, cells, cap){ const v=a.vb, r=a.r;
  let s=`<svg viewBox="${v.join(' ')}" style="width:100%;max-width:${a.maxw||280}px;display:block;margin:auto;border-radius:6px" role="img" aria-label="${a.name} rear module (archive drawing)">
    <image href="${a.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  cells.forEach(c=>{ const i=c.n-1, cx=a.cols[i%2], cy=a.ys? a.ys[Math.floor(i/2)] : a.y0+Math.floor(i/2)*a.dy;
    s+=`<g ${c.id?`class="og62-hot" data-jack="${c.id}" style="cursor:pointer"`:''}><title>${c.n}: ${c.label}${c.title?' — '+c.title:''}${c.id?(c.conn?' (click to unplug)':' (click to plug in)'):''}</title>
      ${c.conn?(c.kind==='tb'?`<rect x="${cx+r*.6}" y="${cy-r*.9}" width="${r*1.2}" height="${r*.5}" rx="${r*.15}" fill="#2b5f9e"/><rect x="${cx+r*.6}" y="${cy+r*.4}" width="${r*1.2}" height="${r*.5}" rx="${r*.15}" fill="#2b5f9e"/>`
        :`<rect x="${cx-r*.28}" y="${cy}" width="${r*.56}" height="${r*1.9}" fill="#2b5f9e"/><circle cx="${cx}" cy="${cy}" r="${r*.78}" fill="#3a74b8" opacity=".88"/>`):''}
      ${c.live===undefined?'':`<circle cx="${cx+r*.95}" cy="${cy+r*.95}" r="${r*.2}" fill="${LIVEC[c.live]||LIVEC.off}" stroke="#222" stroke-width="${r*.03}"/>`}
      <rect x="${cx-r*1.15}" y="${cy-r*1.15}" width="${r*2.3}" height="${r*2.3}" fill="transparent"/></g>`; });
  return s+`</svg><div class="small muted" style="margin-top:2px">${cap||''}</div>`; }
function artEdge(a, leds, label, cap){ const v=a.vb, lc={g:'#5dff5a', r:'#ff4a3d', y:'#ffd23a', a:'#ffb43a', b:'#59b6ff', w:'#f4f4ea'};
  let s=`<svg viewBox="${v.join(' ')}" style="width:100%;max-width:${a.maxw||170}px;display:block;margin:auto;border-radius:6px" role="img" aria-label="${label} card edge (archive drawing)">
    <defs><filter id="${a.fid}" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${a.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  leds.forEach(l=>{ const on=!!l.on, col=lc[l.c]||l.c; s+=`<circle cx="${l.x||a.x}" cy="${l.y}" r="4.2" fill="${on?col:'#2c332c'}" fill-opacity="${on?1:.55}" ${on?`filter="url(#${a.fid})"`:''}><title>${l.name} LED${l.title?': '+l.title:''} (${on?'lit':'off'})</title></circle>`; });
  return s+(a.extra||'')+`<text transform="translate(238.5 554.5) rotate(-90)" text-anchor="middle" font-size="9" font-weight="700" fill="#111">${label}</text></svg><div class="small muted" style="margin-top:2px">${cap||''}</div>`; }
const M5DIR='#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/';
const REAR_ART={ T6301A:{name:'T6301A', href:'siumulation-plugins/assets/m6205c-rear-t6301a.svg', vb:[287,293,267.5,348], cols:[383.2,443.3], y0:365.47, dy:59.8, r:18.7, src:()=>SIM.src(M5DIR+'CUSTOM/M6205CE300/M6205CE300-IO.cdr','CUSTOM/M6205CE300/M6205CE300-IO.cdr')+' (2010-10-14)'},
  T6307A:{name:'T6307A', href:'siumulation-plugins/assets/m6205-rear-t6307.svg', vb:[262,328,274,348], cols:[359.86,419.86], ys:[400.5,460.5,520.5,580.5,639.7], r:18.7, src:()=>SIM.src(M5DIR+'PCB/OBSOLETE/ISSUE4/M6205-T6307.cdr','PCB/OBSOLETE/ISSUE4/M6205-T6307.cdr')+' (2008-11-17; no CE-specific T6307 drawing)'} };
const EDGE_ART={href:'siumulation-plugins/assets/m6205-edge.svg', vb:[58,168,204,418], x:243.8, fid:'m65cGlow', ys:[189.2,217.4,248.3,295.3,319.2,343.4,367.2,401.4,425.1,468.3], src:()=>SIM.src(M5DIR+'M6205-card-edge-v10.cdr','M6205-card-edge-v10.cdr')+' (2008-10-30)'};
[EDGE_ART.href, ...Object.values(REAR_ART).map(a=>a.href)].forEach(u=>{ const im=new Image(); im.src=u; });   // warm the image cache: panels are redrawn every tick
/* Positions as drawn (Artwork 2026|59): T6301A from M6205CE300-IO.cdr, T6307A from the M6205 T6307 drawing. */
const RM={ T6301A:{name:'T6301A', sub:'M6205CE300-IO.cdr', note:'T6301A (M6205CE300-IO.cdr): SDI IN on 1, GPIO on 2, AES OUT1–4 on 3–6, 7 and 8 not used, SDI OUT1/2 on 9/10.', cells:[[1,'SDI IN','in'],[2,'GPIO','g0'],[3,'AES OUT1 (L/R or Embd PCM1)',0],[4,'AES OUT2 (C/LFE or Mute)',1],[5,'AES OUT3 (Ls/Rs or Mute)',2],[6,'AES OUT4 (StL/StR or Embd PCM1)',3],[7,'NOT USED','nc'],[8,'NOT USED','nc'],[9,'SDI OUT1','o'],[10,'SDI OUT2','o']]},
  T6307A:{name:'T6307A', sub:'M6205-T6307.cdr', note:'T6307A (M6205-T6307.cdr): SDI IN, GPI/O1 and GPI/O2 blocks, AES OUT1 (L,R), BNC4 (C,LFE), AES OUT2 (Ls,Rs), META DATA block, AES IN1, SDI OUT1/2.', cells:[[1,'SDI IN','in'],[2,'GPI/O1','g0','tb'],[3,'AES OUT1 (L, R)',0],[4,'BNC4 (C, LFE)',1],[5,'AES OUT2 (Ls, Rs)',2],[6,'META DATA','m'],[7,'AES IN1','nc'],[8,'GPI/O2','g1','tb'],[9,'SDI OUT1','o'],[10,'SDI OUT2','o']]} };
function rearSVG(){ const r=RM[D.rear], R=route(), a=REAR_ART[D.rear];
  return artRear(a, r.cells.map(([n,l,k,kind])=>{ if(k==='in') return {n,label:l,id:'in',conn:L(),live:L()?true:undefined}; if (k==='o') return {n,label:l,live:L()?true:'err'}; if (k==='nc') return {n,label:l,title:'not used by the CE builds'};
    if (k==='m') return {n,label:l,kind:'tb',live:D.in.meta&&L()?true:'off'}; if (k==='g0'||k==='g1'){ const g=+k[1]; return {n,label:l,kind:kind||'bnc',id:k,conn:D.gpi[g],title:'GPI'+(g+1)+' contact '+(D.gpi[g]?'closed':'open')}; }
    const pr=R.pairs[k]; return {n,label:l,live:pr&&!/Mute|mute|—|0 \(/.test(pr.src)?true:'err',title:pr?pr.src:''}; }), `${a.name}: ${a.src()}`); }
function edgeSVG(t){ const l=ledsAt(t); const names=['SD','HD','ERR','AUDIO 1','AUDIO 2','AUDIO 3','AUDIO 4','AES 1','AES 2','META DATA'], st=[l.sd,l.hd,l.err,...l.aud,0,0,l.meta];
  return artEdge(EDGE_ART, names.map((n,i)=>({name:n,c:i===2?'r':i>=3&&i<=6?'y':'g',on:st[i],y:EDGE_ART.ys[i],title:i===7||i===8?'reserved in the CE V3.00 manual':''})), 'M6205C', 'Card edge: '+EDGE_ART.src()); }
function dashHTML(){ const b=B[D.build], R=route(), f=D.in.fmt, l=L();
  const info={name:'Card Info',rows:[{type:'text',label:'Product',value:b.product},{type:'text',label:'Name',value:b.name},{type:'text',label:'Supplier',value:'Ward-Beck Systems'},{type:'text',label:'Software Rev',value:b.rev},{type:'text',label:'Website',value:'www.ward-beck.com'}]};
  const sdi={type:'status',label:'SDI',value:l?f:'Unlocked',level:l?'ok':'err'}, emb={type:'text',label:'Embedded Audio',value:l?chStr():'---- ---- ---- ----'};
  const meta={name:'Metadata',rows:[{type:'sec',label:'Dolby E'},{type:'text',label:'Configuration',value:D.in.meta&&l?'5.1+2 '+inf(''):'No Metadata'},{type:'text',label:'Frame Rate',value:D.in.meta&&l?f.split('/')[1]:''},{type:'sec',label:'Dolby AC-3 · PGM 1'},{type:'text',label:'ac3_acmod',value:D.in.meta&&l?ACMOD[D.in.acmod]:''},{type:'text',label:'Preferred Downmix',value:D.in.meta&&l?(D.in.ext?(D.in.loro?'Lo/Ro':'Lt/Rt'):'(no extended bitstream)'):''}]};
  let tabs=[info];
  if (D.build==='C100'||D.build==='C600'||D.build==='C200') tabs.push({name:'Input Signal',rows:[sdi,emb,{type:'text',label:'Audio Metadata (VANC)',value:D.in.meta&&l?'Detected':'Not Detected'},...(D.build==='C100'?[{type:'text',label:'MixDown (GPI1)',value:D.gpi[0]?'Enabled':'Disabled'},{type:'text',label:'PGM Override (GPI2)',value:D.gpi[1]?'Enabled':'Disabled'}]:[])]},meta);
  if (D.build==='C200') tabs.push({name:'Audio Processing',rows:[{type:'sec',label:'Gain Processing (dB)'},...['Program','DV','MixDown (AES5)'].map((n,k)=>({type:'slider',id:'g'+k,label:n,min:-15,max:15,value:D.gains[k],unit:'dB'})),{type:'button',id:'unity',label:'All',text:'Unity All'}]});
  if (D.build==='CE300') tabs.push({name:'Status',rows:[{type:'sec',label:'Inputs'},sdi,emb,{type:'sec',label:'Outputs'},...R.pairs.slice(0,4).map((p,i)=>({type:'status',label:'AES '+(i+1),value:/Mute/.test(p.src)?'Mute':R.dec?['L/R','C/LFE','Ls/Rs','PCM'][i]:'PCM',level:/Mute/.test(p.src)?'warn':'ok'})),{type:'sec',label:'Settings'},{type:'text',label:'Dialnorm',value:on(5)?'Enabled':'Disabled'},{type:'text',label:'PCM Delay',value:on(4)?'On':'Off'},{type:'text',label:'MetaData Delay',value:'7 Frames'}]});
  if (D.build==='CE400') tabs.push({name:'Card Status',rows:[sdi,emb,{type:'status',label:'Dolby Decoding',value:R.dec?'OK':'Error',level:R.dec?'ok':'err'}]},{name:'Card Settings',rows:[{type:'combo',id:'grp',label:'Audio Groups Enabled',value:D.groups,options:[[1,'1'],[2,'2'],[3,'3'],[4,'4']]},{type:'combo',id:'sel',label:'Dolby Decoder Selector',value:D.ce400sel,options:[[0,'AES 1'],[1,'AES 2'],[2,'AES 3'],[3,'AES 4']]},{type:'combo',id:'dn',label:'Dialnorm',value:D.dialnorm?1:0,options:[[1,'Enabled'],[0,'Disabled']]},{type:'button',id:'save',label:'Settings',text:'Save'}]});
  if (D.build==='C500') tabs.push({name:'Card Status',rows:[sdi,emb,{type:'status',label:'AES 1',value:D.in.ext1?'Locked-PCM':'Unlocked',level:D.in.ext1?'ok':'err'},{type:'status',label:'AES 2',value:D.in.ext2?'Locked-PCM'+(D.in.src2?' (SRC Enabled)':''):'Unlocked',level:D.in.ext2?'ok':'err'}]});
  if (D.build==='C600') tabs.splice(1,0);
  return K.dashHTML({key:'m6205c-'+D.build, title:`Slot ${D.slot}: ${b.product}`, alarm:R.state[1]==='err', sub:`Card state: ${R.state[0]} · redrawn from ${b.shot}`, tree:[{name:'Test Department frame'},{name:'Slot 0: MFC-8310-N',lvl:1},{name:`Slot ${D.slot}: ${b.product}`,lvl:1,sel:true}], tabs, footer:[{id:'refresh',text:'Refresh'},{id:'upload',text:'Upload'},{id:'reboot',text:'Reboot'}], foot:'v'+b.rev}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`, i=D.in;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>Build</b>${sel('build',Object.keys(B).map(k=>[k,k+' — '+B[k].who]),D.build)} <b>SDI</b><button data-x="plug">${L()?'Unplug':'Plug in'}</button>${sel('fmt',FMTS.map(f=>[f,f]),i.fmt)} rear ${sel('rear',[['T6301A','T6301A'],['T6307A','T6307A']],D.rear)} <button data-x="reset">Defaults</button></div>
   <div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px"><button data-x="meta" class="${i.meta?'on':''}">VANC metadata</button> acmod ${sel('acmod',ACMOD.map((a,k)=>[k,a]),i.acmod)} <button data-x="ext" class="${i.ext?'on':''}">extended bitstream</button> <button data-x="loro" class="${i.loro?'on':''}">prefers Lo/Ro</button> <button data-x="g0" class="${D.gpi[0]?'on':''}">GPI1</button><button data-x="g1" class="${D.gpi[1]?'on':''}">GPI2</button></div>
   <table class="kv small" style="margin-top:6px"><tr>${[0,1,2,3].map(g=>`<th>Group ${g+1}</th>`).join('')}</tr><tr>${[0,1,2,3].map(g=>`<td>${[0,1].map(a=>`AES${g*2+a+1} ${sel('p'+(g*2+a),T.map((n,k)=>[k,n]),i.p[g*2+a])}`).join('<br>')}</td>`).join('')}</tr></table><div>${dipSVG()}</div>`; }
function dipSVG(){ let s=`<svg viewBox="0 0 560 104" style="width:100%;max-width:560px"><rect x="10" y="8" width="300" height="62" rx="4" fill="#c0392b"/><text x="16" y="21" font-size="10" fill="#fff">ON ▲  DIP (CE V3.00 manual)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${v?'OFF':'ON'}</title><rect x="${x}" y="27" width="22" height="38" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?47:30}" width="16" height="15" fill="#222"/><text x="${x+11}" y="84" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  return s+`<text x="322" y="22" font-size="10.5" fill="var(--ink2)">1–2 groups (MSB/LSB) · 3 decoder enable</text><text x="322" y="38" font-size="10.5" fill="var(--ink2)">4 HD audio clock · 5 PCM delay · 6 dialnorm</text><text x="322" y="54" font-size="10.5" fill="var(--ink2)">7–8 reserved</text><text x="10" y="100" font-size="10.5" fill="var(--accent)">${groupsEn()} groups · decoder ${on(2)?'enabled':'disabled'} · ${on(3)?'clock phase one':'video lock'} · PCM delay ${on(4)?'on':'off'} · dialnorm ${on(5)?'on':'off'}</text></svg>`; }
function bindAll(r){ K.bind(r,{jack:{in:()=>A.plug(), g0:()=>A.gpi(0), g1:()=>A.gpi(1)}, slot:n=>A.slot(n), dash:(id,v)=>A.dash(id,v)}); r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip)));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='build')A.build(el.value); else if(x==='plug')A.plug(); else if(x==='fmt')A.fmt(el.value); else if(x==='rear')A.rear(el.value); else if(x==='reset')A.reset(); else if(x==='meta')A.meta(); else if(x==='acmod')A.acmod(el.value); else if(x==='ext')A.ext(); else if(x==='loro')A.loro(); else if(x==='g0')A.gpi(0); else if(x==='g1')A.gpi(1); else if(x[0]==='p')A.pair(+x.slice(1),+el.value); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
function lanes(){ const css=SIM.css, f=H8.F[D.in.fmt], l=L(), ls=[], R=route();
  ls.push(H8.frameLane(f,!l)); ls.push(H8.lineLane(f,!l)); ls.push(H8.hancLane(f,groupsEn(),!l));
  ls.push({label:'VANC Dolby metadata packets', h:20, draw(c,X,t0,t1,y,h){ if(!l||!D.in.meta) return; SIM.pulses(c,X,t0,t1,y,h,1/f.fps,0.0006,0.0008,css('--accent2'),'one per frame (SMPTE 2020) '+'— inferred spacing'); }});
  if (D.build==='CE300'&&on(4)) ls.push({label:'PCM delay: one video frame', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--warn'); c.fillRect(X(t0),y+5,Math.max(0,X(Math.min(t1,1/f.fps))-X(t0)),h-10); }});
  (R.pairs||[]).slice(0,6).forEach(p=>ls.push(H8.audioLane(`${p.label}: ${p.src}`.slice(0,60),48000,l&&!/Mute|mute|—|^0|disabled/.test(p.src))));
  ls.push(K.canLane(K.canFrames({poll:0.5, phase:(D.slot*0.0173)%0.4, q:D.canQ})));
  return ls; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Build, source, GPI, DIP', `<div id="ctl"></div>`)}${card('DashBoard (redrawn from the sales screenshots)', `<div id="dash"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear module', `<div id="rear"></div>`)}</div>${card('What the card did', `<div id="trace" class="log"></div>`)}${card('Routing at the playhead', `<div id="rt"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t, R=route();
    m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG();
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D);
    m.querySelector('#rt').innerHTML=`<div class="small muted">${D.build}: ${B[D.build].what}</div><table class="kv small">${(R.pairs||[]).map(p=>`<tr><th>${p.label}</th><td>${p.src}</td></tr>`).join('')||'<tr><td>no SDI</td></tr>'}</table>${R.note?`<div class="small">${R.note}</div>`:''}`;
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second of the M6205C', `<div id="lad"></div>`)}<div class="grid2">${card('Builds side by side', `<div id="cmp"></div>`)}${card('Card edge', `<div id="edge"></div>`)}</div>`;
  const draw=()=>{ const f=H8.F[D.in.fmt];
    const rows=[['Video frames',f.fps.toFixed(3),SIM.fmtDur(1/f.fps),f.name],['Video lines',Math.round(H8.lineRate(f)).toLocaleString(),SIM.fmtDur(1/H8.lineRate(f)),''],['Embedded samples per channel','48 000',SIM.fmtDur(1/48000),H8.spf(f).toFixed(1)+' per frame'],['Channels de-embedded / re-embedded',(groupsEn()*4)+'','',groupsEn()+' groups'],['Metadata packets (VANC)',D.in.meta?f.fps.toFixed(2):'0','',inf('one per frame')],['Dolby E decode latency','','1 frame',`CE builds; CE300 shows “MetaData Delay 7 Frames”`],['DashBoard polls','2','500 ms',inf('MFC rate')]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#cmp').innerHTML=`<table class="kv small"><tr><th>Build</th><th>Product string</th><th>Rev</th><th>For</th><th>Does</th></tr>${Object.keys(B).map(k=>`<tr style="${k===D.build?'font-weight:700':''}"><td>${k}</td><td class="mono">${B[k].product}</td><td class="mono">${B[k].rev}</td><td>${B[k].who}</td><td>${B[k].what}</td></tr>`).join('')}</table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); };
  SIM.on('time', draw);
}
const BLOCKS={ sdi:{x:10,y:40,w:140,h:70,t:'SDI IN',s:['EQ + deserializer'],d:'Rear position 1.'},
  fpga:{x:190,y:30,w:180,h:120,t:'EP2C35 FPGA',s:['SD/HD demux + mux','VANC metadata detector','“SYNC” control registers'],d:'De-embeds, routes through the DSP and re-embeds. HD embed core licensed IP.'},
  dsp:{x:420,y:30,w:170,h:110,t:'ADSP-21262 SHARC',s:['gain, downmix, DV mix','RLM24 / shell262 code'],d:'Level trim, Lt/Rt or Lo/Ro downmix with the metadata cmixlev/smixlev, DV mix (C200).'},
  dec:{x:420,y:180,w:170,h:70,t:'Dolby decoder (CE)',s:['E / AC-3 → PCM'],d:'CE300/CE400 builds only.'},
  out:{x:630,y:30,w:140,h:90,t:'SDI OUT ×2, AES OUT',s:['T6301A / T6307A'],d:'Re-embedded SDI and AES copies.'},
  mcu:{x:190,y:200,w:180,h:80,t:'AT90CAN128',s:['DIP, GPI, DashBoard','one firmware per build'],d:'m6205c100 … M6205C700 folders.'},
  dash:{x:10,y:200,w:140,h:70,t:'DashBoard',s:['per-build menus'],d:'Redrawn from the screenshots in this folder.'} };
const WIRES=[['sdi','fpga',''],['fpga','dsp','TDM'],['dsp','fpga','TDM'],['fpga','dec','coded'],['dec','dsp','PCM'],['fpga','out','SDI/AES'],['mcu','fpga','SYNC regs'],['mcu','dash','CAN']];
const SHEETS=[{name:'1 · C100 rules', note:'“M6205 Operational Info May20,2009.doc” (C100, with GPI2).', h:440, svg:()=>{ const R=route(), rules=['meta & !GPI1 & HD: acmod 1/0 → out1 = out2 = C','acmod 2/0 → out1 = L, out2 = R','no extended bitstream → Lt / Rt (ac3_cmix, ac3_smix)','extended, preferred Lo/Ro → Lo / Ro','extended, otherwise → Lt / Rt','GPI2 → mono programme from ch8 on 1 and 2','else → out1/2 = AES1 L/R, out3/4 = AES1 L/R'];
    return rules.map((r,i)=>`<rect x="40" y="${30+i*52}" width="740" height="38" rx="6" fill="${D.build==='C100'&&R.branch===i?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="54" y="${54+i*52}" font-size="12.5" fill="${D.build==='C100'&&R.branch===i?'#fff':'var(--ink)'}">${r}</text>`).join(''); }},
  {name:'2 · C200 rules', note:'“M6205c ControlIO.doc” (C200, no Dolby decoder).', h:440, svg:()=>{ const R=route(), rules=['!meta !GPI1 !E: out1–6 = in1–6','!meta GPI1 !E: out4 = mono(in1) DV, out5 = in1, out6 mute','!meta !GPI1 E on AES2: out2/3 mute, out4 = in4, out6 = in2 (E)','!meta GPI1 E: out4 = mono(in1) DV, out6 = in2 (E)','meta !GPI1 !E: out5 = Lt/Rt','meta GPI1 !E: out4 = mono(Lt/Rt) DV, out5 = Lt/Rt','else: pass all'];
    return rules.map((r,i)=>`<rect x="40" y="${30+i*52}" width="740" height="38" rx="6" fill="${D.build==='C200'&&R.branch===i?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="54" y="${54+i*52}" font-size="12.5" fill="${D.build==='C200'&&R.branch===i?'#fff':'var(--ink)'}">${r}</text>`).join(''); }}];
const TUT={i:0};
const LESSONS=[
  {title:'Meet the M6205C family', body:'<p>Each “Cxxx” build is the same M6205 card with different firmware for one customer. Pick a build at the top; the DashBoard, outputs and rules change with it. This tutorial follows the CE V3.00 manual.</p>', check:()=>true, auto:true},
  {title:'1 · CE300: Dolby detected', body:'<p>Build <b>CE300</b>, SW3 ON (decoder enabled). Group 1 AES2 carries Dolby E: outputs become L/R, C/LFE, Ls/Rs and StL/StR.</p>', check:()=>D.build==='CE300'&&route().dec, hint:'Keep CE300; DIP 3 ON; group 1 AES2 = Dolby E.'},
  {title:'2 · CE300: Dolby not detected', body:'<p>Change group 1 AES2 to <b>PCM</b>: AES2 and AES3 mute, exactly like the CE300 status screenshot (PCM, Mute, Mute, PCM).</p>', check:()=>D.build==='CE300'&&!route().dec&&L(), hint:'Group 1 AES2 → PCM.'},
  {title:'3 · CE400: choose the decoder input', body:'<p>Switch to <b>CE400</b> and set Dolby Decoder Selector to the pair carrying Dolby. With the wrong pair the card state is “Dolby Decoding Error”, as in the screenshot.</p>', check:()=>D.build==='CE400'&&route().dec, hint:'Build CE400; Card Settings → Dolby Decoder Selector; put Dolby on that pair.'},
  {title:'4 · C100: metadata downmix', body:'<p>Build <b>C100</b> with VANC metadata, acmod 3/2: channel 1/2 become Lt/Rt. Press <b>GPI1</b> (MixDown) and the card falls back to AES1 L/R.</p>', check:()=>D.build==='C100'&&D.gpi[0], hint:'Build C100; press GPI1.'},
  {title:'5 · C200: make DV', body:'<p>Build <b>C200</b>, GPI1 closed: AES out4 becomes a mono DV mix. Adjust the DV gain on the Audio Processing tab.</p>', check:()=>D.build==='C200'&&D.gpi[0]&&D.gains[1]!==0, hint:'Build C200, GPI1, Audio Processing → DV slider.'},
  {title:'Done', body:'<p>See <b>Findings</b> for what the screenshots and the manual give away.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — the M6205C/CE builds (from the CE V3.00 manual and screenshots)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2"><div>${card('Active rule set (live)', `<div id="flow"></div>`)}</div><div>${card('How the parts talk', `<ul class="small"><li>AVR → FPGA: 32-bit control registers after the sync header <span class="mono">SYNC</span> = 0x53 0x59 0x4E 0x43 (volume, DV and programme gain, active groups, dialnorm, delay, Dolby input selector) — Software README.</li><li>FPGA → AVR: lock, format, group detect, non-PCM flags, VANC metadata.</li><li>SHARC: TDM/DMA audio, gains, Lt/Rt / Lo/Ro downmix with cmixlev/smixlev.</li><li>Upload: AVR .bin; FPGA .rbf through the AVR (“FPGA boot loader”, from C100 v2.0.0.0).</li></ul>`)}${card('Firmware folders', `<table class="kv small">${['m6205c100 — CTV, downmix','m6205c200 — CTV, DV/voice-over','m6205c300 — Astral CE300, decode','M6205CE-400 — decoder input select','M6205C-500 — external AES in','M6205C600 — group enable','M6205C700 — CTV, not released','M6205CEE-800 — reports “M6205C500”'].map(s=>`<tr><td class="mono">${s}</td></tr>`).join('')}</table>`)}</div></div>`;
  const draw=()=>{ const R=route(), b=D.build; let st;
    if (b==='C100') st=['meta & !GPI1 & HD → acmod 1/0','acmod 2/0','no extended bitstream → Lt/Rt','extended & Lo/Ro','extended → Lt/Rt','GPI2 → mono ch8','else → pass AES1'];
    else if (b==='C200') st=['pass all','GPI1: DV from in1','Dolby E on AES2: mute 2/3, pass E on 6','GPI1 + E: DV + E','meta: Lt/Rt on out5','meta + GPI1: DV from Lt/Rt','else pass'];
    else if (b==='CE300'||b==='CE400') st=['Dolby not detected → L/R, Mute, Mute, StL/StR','Dolby detected → L/R, C/LFE, Ls/Rs, StL/StR'];
    else st=[b==='C500'?'External AES In1/In2 → embedded pairs 1/2 (SRC optional)':'Re-embed the enabled groups'];
    m.querySelector('#flow').innerHTML=L()?H8.flowSVG(st,Math.max(0,R.branch)):H8.flowSVG(['SDI unlocked'],0,true); };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>Artwork 2026|59: rear modules and card edge now from the CorelDRAW files.</b> T6301A: ${REAR_ART.T6301A.src()}; T6307A: ${REAR_ART.T6307A.src()}; card edge: ${EDGE_ART.src()}. The CE300 drawing fixes the T6301A positions this model used to guess: SDI OUT1/2 are on 9/10 (not 2/4), GPIO is on 2, AES OUT1–4 are 3–6 and 7/8 are unused. It also spells out the per-output choices (“L/R or Embd PCM1”, “C/LFE or Mute”, “Ls/Rs or Mute”, “StL/StR or Embd PCM1”) — the same switch the rule sets make. The CE400/C500/C600 drawings in CUSTOM/ use the same T6301 grid with other labels; the C600 one (${SIM.src(M5DIR+'CUSTOM/M6205C600/V1.0.0.0/M6205C600-T6301.cdr','M6205C600-T6301.cdr')}) marks only SDI IN, AES OUT1–4 and SDI OUT1/2.`,
  `<b>Every sales screenshot shows a dead card.</b> C200, C500, C600 and CE400 were captured with “Card state: SDI Unlocked” (CE400: “Dolby Decoding Error”) and empty metadata fields; only C100 and CE300 show a locked HD 1080i/59.94 input with “PPPP PPPP PPPP PPPP”.`,
  `<b>The C200 calls itself “M6205C”.</b> Its Card Info product string is “M6205C”, software 2.04; the firmware README calls the build “M6205A-C200”. The other builds report their full build number.`,
  `<b>Name drift.</b> The CE manual gives the Card Info name as “MD-SDI Embedded Audio Processor with VANC Detection”; the CE300 screenshot says “… w/ Dolby E/AC-3 Decoding”, and CE400 “… w/ Dolby Decoding”.`,
  `<b>MetaData Delay is undocumented.</b> The CE300 Status screenshot shows “MetaData Delay 7 Frames”; the manual’s Settings list has only Dialnorm and PCM Delay.`,
  `<b>Manual LED table collides.</b> AES 1 and META DATA are both “eighth from the top”; AES 1 / AES 2 are “Reserved”.`,
  `<b>SW3 text vs tables.</b> The manual says Dolby Decoder Enable “swaps embedded channels 8–16 with Dolby decoder outputs”; its own tables show the decoder outputs on group 1 AES1/AES2 and group 2 AES1, and say groups 3 and 4 are not active.`,
  `<b>Rear-module grammar.</b> The manual: “Two variations of the rear module are offered. The T6301A and T6307A are for use with the twenty slot DFR8320 frame. The T6301A and T6307A is for use with a single card and requires two slots” — so the card always uses even slots. Positions are not given in the manual; the M6205CE300-IO.cdr drawing gives them (first finding).`,
  `<b>Copied comments in the rules.</b> ControlIO.doc’s C200 metadata branch labels “AES out4 = AES in4” as “create DV” and “out6 = in6” as “Dolby E” — comments carried from the branches above.`,
  `<b>Empty DTS skeletons.</b> “M6205C400DTS” and “M6205CE300DTS” folders (names ending in spaces) hold only empty Atmel/Altera/“nab 08” folders: DTS versions were planned for NAB 2008 but nothing survives.`];
const ASSUME=['C500: which embedded pairs the external inputs replace '+inf('screens show AES 1 / AES 2 only'),'Metadata packet one per frame '+inf('SMPTE 2020 practice'),'CE400 output mapping as CE300 '+inf('same manual family'),'C100 GPI2 “mono program on 8 to 1 and 2” read as channel 8 → channels 1 and 2 '+inf('wording')];
const SOURCES=['#OPENGEAR #SERIES/M6205C - #Master #OPENGEAR/M6205CE V300 MANUAL WORKINGl  #Manual .doc','#OPENGEAR #SERIES/M6205C - #Master #OPENGEAR/M6205C100 … M6205C600, M6205CE300, M6205CE400 sales folders: 16 DashBoard JPGs (redrawn, not copied)',SWF+'README.md (build table, SYNC header, SHARC role)',SWF+'M6205c ControlIO.doc, M6205 Operational Info May20,2009.doc',SWF+'m6205c300/atmel/v200/Dashboard.c (string list)'];
const FOOTNOTES = [
 {
  "text": "Rear and card-edge artwork (2026|59): CUSTOM/M6205CE300/M6205CE300-IO.cdr (2010-10-14) for the T6301A, the M6205 T6307 drawing for the T6307A, M6205-card-edge-v10.cdr for the edge.",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/CUSTOM/M6205CE300/M6205CE300-IO.cdr"
 },
 {
  "text": "The CE300 drawing puts SDI OUT1/2 on 9/10 and GPIO on 2; the model had guessed 2 and 4 for the SDI outputs.",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/CUSTOM/M6205CE300/M6205CE300-IO.cdr"
 },
 {
  "text": "The CE300 drawing offers “Embd PCM1” on two outputs: AES OUT1 (L/R or Embd PCM1) and AES OUT4 (StL/StR or Embd PCM1).",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/CUSTOM/M6205CE300/M6205CE300-IO.cdr"
 },
 {
  "text": "The CE300 folder’s backup is named Backup_of_M6205C300-IO.cdr — C300, not CE300.",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/CUSTOM/M6205CE300/Backup_of_M6205C300-IO.cdr"
 },
 {
  "text": "There is no CE-specific T6307A drawing; the T6307A positions come from the generic M6205 T6307 drawing.",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/PCB/OBSOLETE/ISSUE4/M6205-T6307.cdr"
 },
 {
  "text": "The C600 drawing reuses the T6301 grid with AES OUT4 as “Lt / Rt” and BNC 2, 7, 8 not used.",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/CUSTOM/M6205C600/V1.0.0.0/M6205C600-T6301.cdr"
 }
];
SIM.register({footnotes:FOOTNOTES,  id:'m6205c', product:'M6205C', name:'M6205C · customer builds of the MD-SDI embedded audio processor, openGear: sales and manual (2008|41)', year:2008,
  folder:'#OPENGEAR #SERIES/M6205C - #Master #OPENGEAR', family:'openGear',
  summary:'The M6205C/CE builds are the M6205 SDI audio processor with one firmware per customer: metadata downmix (C100), described-video mix (C200), Dolby decoding (CE300/CE400), external AES embedding (C500) and plain re-embedding (C600). This folder holds DashBoard screenshots and the CE V3.00 manual; the model switches builds and follows their routing rules.',
  highlights:['Six builds, each with its DashBoard redrawn from the screenshots','C100 and C200 audio switching rules, live','CE300 Dolby detected / not detected tables','What the screenshots and manual give away'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 audio sample',period:()=>1/48000},{label:'1 video line',period:()=>1/H8.lineRate(H8.F[D.in.fmt])},{label:'1 frame',period:()=>1/H8.F[D.in.fmt].fps}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.04,'40 ms'],[0.002,'2 ms'],[0.0002,'200 µs']], defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:790,h:300,sel:'dsp'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'M6205C',sheets:SHEETS,title:'Rule sheets (redrawn from the operational documents, not CAD)',foot:'REDRAWN from ControlIO.doc and Operational Info — not the original CAD. No PCB data is filed in this folder.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:m=>H8.findingsView(m,'What the M6205C builds (and their folder) are up to',FINDINGS,ASSUME,SOURCES)}],
});
})();
