/* =====================================================================
   D6208A (2007 file) — openGear dual-input AES Dolby decoder platform saved under the D6208A number (Ward-Beck Systems, 2007|40)
   Folder "D6208A  #Engineering #TIM #PCB": D6208A.sch (2007-06-18), D6208A.pcb / .BAK (2007-11-07), OnlineDRC.ERR.txt.
   Plugin for the WBS Device Simulator (../siumulation.html) · Hardware model
   Sources:
   - this folder: D6208A.sch (P-CAD 2002 binary; parts and strings via D6208A.sch.md and `strings`): title block field
       “DRAWING NUMBER 2: EMBEDDED AUDIO PROCESSOR”, revision ISS.1, drawing number D6207A; parts U1 DS34LV86T, U2/U3 CS8416,
       U4 EP1C12-240 (symbol EP1C6), U5 M25P40 (symbol EPCS1), U6 AT90CAN128, U10 ADM3485, U11 SN65HVD233, P3 CAT_NO_552,
       T1/T2 PE-65612, LED1–LED7, SW1 DIP-8, X1 8 MHz; nets AES1P/N–AES8P/N, AES_OUT1–6, CS8416_SEL1/2, CS8416_RESET1/2,
       RESET_552, “DOLBY 1”, “DOLBY 2”; OnlineDRC.ERR.txt (0 errors, 0 warnings)
   - linked sibling folders: D6208 - #Engineering #OPENGEAR/D6208A/PCB/WORKING (the 2010 issue-1 D6208A, see d6208.js);
       D6207A - #Master #OPENGEAR (the D6207A decoder this file was cut from: firmware V102/V201, T6305 rear, LED names — see d6207a.js)
   There is no firmware for any D6208A; the behaviour is the D6207A platform’s and is marked "inferred".
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
const F='#OPENGEAR #SERIES/D6208A  #Engineering #TIM #PCB/';
const T=['—','PCM','Dolby E','Dolby AC-3'];
const PROG={ '5.1+2':['L','R','C','LFE','Ls','Rs','2L','2R'], '4+4':['L','R','C','S','2C','2S','2L','2R'], '5.1':['L','R','C','LFE','Ls','Rs','—','—'] };
const D={ in:[{conn:true,t:2,len:100},{conn:true,t:1,len:100}], term:75, prog:'5.1+2', dip:[1,1,1,1,1,1,1,1], cat:true, view:'2007', slot:2, log:[], canQ:[] };
const act=K.actor(D);
const on=i=>D.dip[i]===0;
const ok=i=> D.in[i].conn && D.in[i].len <= (D.term===75?600:300);       // D6201A-family AES front end reach (inferred)
function decSrc(){ if (!D.cat) return -1; if (ok(0)&&D.in[0].t>=2) return 0; if (ok(1)&&D.in[1].t>=2) return 1; return -1; }   // first coded input wins (D6207A practice, inferred)
function outs(){ const s=decSrc(), ch=PROG[D.in[s]?.t===3?'5.1':D.prog];
  const o=[0,1,2,3].map(k=> s>=0 ? {src:`decoder ch ${2*k+1}/${2*k+2}: ${ch[2*k]} / ${ch[2*k+1]}`, ok:ch[2*k]!=='—'} : {src:'muted (no coded input)', ok:false});
  o.push({src:ok(0)?'AES IN 1 loop ('+T[D.in[0].t]+')':'—', ok:ok(0)}); o.push({src:ok(1)?'AES IN 2 loop ('+T[D.in[1].t]+')':'—', ok:ok(1)}); return o; }
/* LED1–7 colours from this schematic: YEL, RED, GRN, YEL, RED, GRN, GRN. Function names by analogy with D6207A ISS2 (inferred). */
function ledsAt(t){ const s=decSrc(); return [ok(0)?1:0, D.in[0].conn&&!ok(0)?1:0, s===0?1:0, ok(1)?1:0, D.in[1].conn&&!ok(1)?1:0, s===1?1:0, D.canQ.some(q=>t>=q&&t<q+0.02)?1:0]; }
const LEDN=[['LED1','AES 1','y'],['LED2','ERROR 1','r'],['LED3','DOLBY 1','g'],['LED4','AES 2','y'],['LED5','ERROR 2','r'],['LED6','DOLBY 2','g'],['LED7','COM ACTIVITY','g']];
const A={
  plug(i){ act(`${D.in[i].conn?'Unplug':'Plug in'} AES IN ${i+1}`, tr=>{ D.in[i].conn=!D.in[i].conn; tr(`AES${i+1}P/N → T${i+1} PE-65612 (“DOLBY ${i+1}” net) → U1 DS34LV86T → U4 FPGA → CS8416 U${i+2} (CS8416_SEL${i+1}, CS8416_RESET${i+1})`); tr(ok(i)?'Receiver locks':'No lock'); }); },
  type(i,v){ act(`AES IN ${i+1} carries ${T[v]}`, tr=>{ D.in[i].t=+v; const s=decSrc(); tr(`FPGA burst detector (SMPTE 337 Pc: AC-3 = 1, Dolby E = 28) → ${s>=0?'route input '+(s+1)+' to P3 (CAT552)':'no coded input: decoder idle'} ${inf('D6207A AMS81 design')}`); }); },
  len(i,v){ act(`AES IN ${i+1} cable → ${v} m`, tr=>{ D.in[i].len=+v; tr(`${D.term} Ω input; reach ${D.term===75?600:300} m ${inf('D6201A-family front end')} → ${ok(i)?'locked':'no lock'}`); }); },
  term(){ act(`Input termination → ${D.term===75?110:75} Ω`, tr=>{ D.term=D.term===75?110:75; tr('T1/T2 PE-65612 transformers are fitted for both; the termination choice is '+inf('jumper not named on the strings')); }); },
  prog(v){ act(`Dolby programme config → ${v}`, tr=>{ D.prog=v; tr(`Decoder channels 1–8: ${PROG[v].join(', ')}`); }); },
  cat(){ act(`${D.cat?'Remove':'Fit'} the decoder module (P3)`, tr=>{ D.cat=!D.cat; tr(`P3 CAT_NO_552 (RESET_552 from the FPGA). ${D.cat?'Module present.':'Outputs 1–4 mute.'}`); }); },
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1; tr('SW1 DIPSW8SMT is on the schematic; its functions are not documented for this file '+inf('see the D6207A manual for the released card')); }); },
  view(v){ D.view=v; SIM.refresh(); },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; }); },
  reset(){ Object.assign(D,{in:[{conn:true,t:2,len:100},{conn:true,t:1,len:100}],term:75,prog:'5.1+2',dip:[1,1,1,1,1,1,1,1],cat:true,view:'2007',slot:2,log:[],canQ:[]}); SIM.refresh(); },
};
function rearSVG(){ const o=outs();
  const cells=[{n:1,label:'AES IN 1',id:'i0',conn:D.in[0].conn,live:D.in[0].conn?(ok(0)?true:'warn'):undefined},{n:2,label:'AES IN 2',id:'i1',conn:D.in[1].conn,live:D.in[1].conn?(ok(1)?true:'warn'):undefined}]
    .concat(o.map((x,k)=>({n:3+k,label:'AES OUT '+(k+1),live:x.ok?true:'err',title:x.src}))).concat([{n:9,label:'GPI / spare',kind:'tb',live:'off'},{n:10,label:'METADATA (U10)',kind:'tb',live:decSrc()>=0&&D.in[decSrc()].t===2?true:'off'}]);
  return K.rearSVG({name:'Rear (no module drawn)', sub:'AES_OUT1–6 and two inputs; layout as the D6207A T6305 (inferred)', id:'P1 MEDAC100 edge connector', cells}); }
function edgeSVG(t){ const L=ledsAt(t); return K.edgeSVG({label:'D6208A', maxw:260, note:'LED colours from D6208A.sch; names inferred from the D6207A', leds:LEDN.map(([d,n,c],i)=>({name:n,c,on:L[i],y:[40,80,120,180,220,260,340][i],title:d}))}); }
function dashHTML(){ const s=decSrc(), o=outs();
  return K.dashHTML({key:'d6208a', title:'D6208A (2007 file) — design-intent panel', sub:'no firmware for any D6208A', tree:[{name:'(never released)'},{name:'D6208A.sch 2007',lvl:1,sel:true}],
    tabs:[{name:'Inputs',rows:[0,1].map(i=>({type:'status',label:'AES IN '+(i+1),value:D.in[i].conn?(ok(i)?'Locked - '+T[D.in[i].t]:'Unlocked'):'—',level:ok(i)?'ok':'err'})).concat([{type:'status',label:'Decoder',value:s>=0?'decoding input '+(s+1):'idle',level:s>=0?'ok':'warn'}])},
      {name:'Outputs',rows:o.map((x,k)=>({type:'status',label:'AES OUT '+(k+1),value:x.src,level:x.ok?'ok':'err'}))},
      {name:'Title block',rows:[{type:'text',label:'Drawing number',value:'D6207A'},{type:'text',label:'Drawing number 2',value:'EMBEDDED AUDIO PROCESSOR'},{type:'text',label:'Revision',value:'ISS.1'},{type:'text',label:'File',value:'D6208A.sch, 2007-06-18'}]}], footer:[], foot:''}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<table class="kv small"><tr><th>Input</th><th></th><th>carries</th><th>cable</th></tr>${[0,1].map(i=>`<tr><td>AES IN ${i+1}</td><td><button data-x="p${i}">${D.in[i].conn?'Unplug':'Plug in'}</button></td><td>${sel('t'+i,T.map((n,k)=>[k,n]),D.in[i].t)}</td><td>${sel('l'+i,[10,100,300,450,600,800].map(v=>[v,v+' m']),D.in[i].len)}</td></tr>`).join('')}</table>
   <div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">Dolby E config ${sel('prog',Object.keys(PROG).map(k=>[k,k]),D.prog)} <button data-x="term">${D.term} Ω</button> <button data-x="cat">${D.cat?'Remove':'Fit'} decoder (P3)</button> <button data-x="reset">Defaults</button></div><div>${dipSVG()}</div>`; }
function dipSVG(){ let s=`<svg viewBox="0 0 330 92" style="width:100%;max-width:330px"><rect x="10" y="8" width="300" height="62" rx="4" fill="#c0392b"/><text x="16" y="21" font-size="10" fill="#fff">ON ▲  SW1 DIPSW8SMT (functions not documented)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${v?'OFF':'ON'}</title><rect x="${x}" y="27" width="22" height="38" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?47:30}" width="16" height="15" fill="#222"/><text x="${x+11}" y="84" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; }); return s+'</svg>'; }
function bindAll(r){ K.bind(r,{jack:{i0:()=>A.plug(0), i1:()=>A.plug(1)}, slot:n=>A.slot(n)}); r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip)));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ if(x==='prog')A.prog(el.value); else if(x==='term')A.term(); else if(x==='cat')A.cat(); else if(x==='reset')A.reset(); else if(x.startsWith('v_'))A.view(x.slice(2)); else if(x[0]==='p')A.plug(+x[1]); else if(x[0]==='t')A.type(+x[1],el.value); else if(x[0]==='l')A.len(+x[1],el.value); }; if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }
/* The three designs that carry the D6208A number */
const DESIGNS={ '2007':{t:'D6208A.sch, 2007-06-18 (this folder)', parts:[['AES in','2 (T1/T2 PE-65612, DS34LV86T)'],['Receivers','CS8416 × 2 (U2, U3)'],['FPGA','EP1C12-240 (symbol EP1C6), config M25P40 on an EPCS1 symbol'],['Decoder','P3 CAT_NO_552'],['AES out','AES_OUT1–6'],['Control','AT90CAN128 U6, 8 MHz; SN65HVD233 CAN; ADM3485 metadata'],['LEDs','7: YEL, RED, GRN, YEL, RED, GRN, GRN'],['Title','“EMBEDDED AUDIO PROCESSOR”, drawing number D6207A']]},
  '2009':{t:'D6204A-iss1.sch, 2009-10-27 (in D6208 WORKING)', parts:[['What','a copy of the D6204A AES-to-analog schematic'],['Role','probably the starting point for the 2010 board (README)']]},
  '2010':{t:'D6208A-iss1.sch/.net, 2010-04-01 (D6208 - #Engineering)', parts:[['AES in','8 (BNC3–BNC10 through DS34LV86T)'],['Receivers','CS8416 × 8, AD1895 SRCs'],['FPGA','Cyclone II EP2C35F484, EPCS16 symbol / M25P16'],['Decoder','P5 CAT-559-E-D'],['AES out','none wired — only metadata leaves on the AES8 pair'],['See','d6208.js']]} };
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Inputs, decoder, DIP', `<div id="ctl"></div>`)}${card('Design-intent panel', `<div id="dash"></div>`)}</div><div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div>`)}${card('Rear', `<div id="rear"></div>`)}</div>${card('What the card would do', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('Three designs under one number', `<div id="des"></div>`)}${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dash').innerHTML=dashHTML(); m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); m.querySelector('#rear').innerHTML=rearSVG();
    m.querySelector('#des').innerHTML=`<div style="margin-bottom:6px">${Object.keys(DESIGNS).map(k=>`<button data-x="v_${k}" class="${D.view===k?'on':''}">${k}</button>`).join(' ')}</div><div class="small muted">${DESIGNS[D.view].t}</div><table class="kv small">${DESIGNS[D.view].parts.map(p=>`<tr><th>${p[0]}</th><td>${p[1]}</td></tr>`).join('')}</table>`;
    m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D); bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
function lanes(){ const css=SIM.css, ls=[], s=decSrc(), fr=1001/30000;
  [0,1].forEach(i=>{ const x=D.in[i]; ls.push({label:`AES IN ${i+1}: ${ok(i)?T[x.t]:'no lock'}`, h:22, draw(c,X,t0,t1,y,h){ if(!ok(i)) return; if (x.t===2) SIM.pulses(c,X,t0,t1,y,h,fr,0,fr*0.88,css('--warn'),'Dolby E frames (29.97 assumed)'); else if (x.t===3) SIM.pulses(c,X,t0,t1,y,h,0.032,0,0.032*0.55,css('--warn'),'AC-3 frames, 32 ms'); else SIM.pulses(c,X,t0,t1,y,h,1/48000,0,0.35/48000,css('--accent'),'48 kHz frames'); }}); });
  ls.push({label:'CAT552 decoded PCM (one frame late)', h:22, draw(c,X,t0,t1,y,h){ if(s<0) return; const lat=D.in[s].t===2?fr:0.032; c.fillStyle=css('--bad'); c.fillRect(X(t0),y+5,Math.max(0,X(Math.min(t1,lat))-X(t0)),h-10); c.fillStyle=css('--accent'); const a=Math.max(t0,lat); if(a<t1) c.fillRect(X(a),y+5,X(t1)-X(a),h-10); }});
  outs().forEach((o,k)=>ls.push(H8.audioLane(`AES OUT ${k+1}: ${o.src}`.slice(0,60),48000,o.ok)));
  LEDN.forEach(([d,n,c],i)=>{ if (i===6) return; ls.push(K.boolLane(`${d} ${n} ${'(inferred name)'}`, t=>ledsAt(t)[i], c==='r'?'#c0392b':c==='y'?'#d9a21b':'#2f8f46')); });
  return ls; }
function viewSecond(m){
  m.innerHTML=`${card('One second of the D6207A-based design', `<div id="lad"></div>`)}<div class="grid2">${card('Channel map (Dolby E programme config)', `<div id="map"></div>`)}${card('Card edge', `<div id="edge"></div>`)}</div>`;
  const draw=()=>{ const rows=[['AES frames per input','48 000',SIM.fmtDur(1/48000),'CS8416 U2/U3'],['Dolby E frames','29.97',SIM.fmtDur(1001/30000),inf('video rate')],['AC-3 frames','31.25','32 ms','1536 samples'],['Decoder latency','','≈1 frame','D6207A manual practice '+inf('')],['AES outputs × channels','6 × 2 × 48 000','','AES_OUT1–6'],['AVR clock','8 MHz','125 ns','X1']];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#map').innerHTML=`<table class="kv small">${outs().map((o,k)=>`<tr><th>AES OUT ${k+1}</th><td>${o.src}</td></tr>`).join('')}</table><p class="small muted">Output assignment ${inf('modelled on the D6207A; the 2007 file has no routing documentation')}</p>`;
    m.querySelector('#edge').innerHTML=edgeSVG(SIM.t); };
  SIM.on('time', draw);
}
const BLOCKS={ in:{x:10,y:40,w:150,h:80,t:'AES IN 1, 2',s:['T1/T2 PE-65612','“DOLBY 1”, “DOLBY 2”'],d:'Two transformer-coupled inputs (strings in D6208A.sch).'},
  rx:{x:200,y:20,w:150,h:60,t:'DS34LV86T (U1)',s:['line receivers'],d:'Quad differential receiver into the FPGA.'},
  fpga:{x:200,y:110,w:170,h:100,t:'EP1C12-240 (U4)',s:['symbol EP1C6','burst detect, routing'],d:'FPGA; configuration U5 M25P40 on an EPCS1 symbol.'},
  cs:{x:410,y:20,w:150,h:60,t:'CS8416 × 2',s:['U2, U3'],d:'Receivers with CS8416_SEL1/2 and CS8416_RESET1/2.'},
  cat:{x:410,y:110,w:150,h:70,t:'P3 CAT552',s:['Dolby decoder module'],d:'RESET_552 from the FPGA.'},
  out:{x:600,y:60,w:150,h:80,t:'AES_OUT1–6',s:['six outputs'],d:'Net names AES_OUT1 … AES_OUT6.'},
  mcu:{x:410,y:220,w:150,h:70,t:'AT90CAN128 (U6)',s:['8 MHz, CAN, LED1–7, SW1'],d:'Controller; SN65HVD233 (U11) CAN; ADM3485 (U10) metadata.'} };
const WIRES=[['in','rx',''],['rx','fpga',''],['fpga','cs','select'],['cs','fpga','I²S'],['fpga','cat','coded'],['cat','fpga','PCM'],['fpga','out','AES'],['mcu','fpga','control']];
const SHEETS=[{name:'1 · Parts (strings)', note:'Recovered from the binary D6208A.sch (P-CAD 2002); pins are not recoverable, so this sheet lists parts and the named nets only.', h:440, svg:()=>K.chip(110,60,220,'Active parts',[['U1','DS34LV86T'],['U2, U3','CS8416'],['U4','EP1C12-240 (EP1C6)'],['U5','M25P40 (EPCS1)'],['U6','AT90CAN128'],['U10','ADM3485EAR'],['U11','SN65HVD233D'],['P3','CAT_NO_552']],[],'D6208A.sch, 2007')+K.chip(520,60,220,'Named nets',[['AES1P/N…AES8P/N','edge pairs'],['AES_OUT1–6','outputs'],['CS8416_SEL1/2','select'],['CS8416_RESET1/2','reset'],['CS8416_IN/OUT/CLK','control'],['RESET_552','decoder'],['DOLBY 1 / 2','input labels']],[],'strings')}];
const TUT={i:0};
const LESSONS=[
  {title:'What this file is', body:'<p>This 2007 schematic is saved as <b>D6208A</b> but its title block says drawing number <b>D6207A</b>: two AES inputs, two CS8416 receivers, a Cyclone FPGA and a CAT552 Dolby decoder socket — the D6207A decoder platform. The behaviour here follows the D6207A and is design intent.</p>', check:()=>true, auto:true},
  {title:'1 · Decode input 1', body:'<p>AES IN 1 carries Dolby E: it goes to the decoder and AES OUT 1–4 carry the eight decoded channels.</p>', check:()=>decSrc()===0, hint:'Keep input 1 on Dolby E and plugged in.'},
  {title:'2 · Move the stream', body:'<p>Make input 1 PCM and input 2 <b>Dolby AC-3</b>: the decoder follows the coded input.</p>', check:()=>decSrc()===1&&D.in[1].t===3, hint:'Input 1 → PCM; input 2 → Dolby AC-3.'},
  {title:'3 · Long cable', body:'<p>Set input 2 to 800 m: it loses lock and the decoder goes idle.</p>', check:()=>D.in[1].len>=800, hint:'Input 2 cable → 800 m.'},
  {title:'4 · Compare the designs', body:'<p>Under “Three designs under one number”, press <b>2010</b> to see the later eight-input D6208A.</p>', check:()=>D.view==='2010', hint:'Press 2010.'},
  {title:'Done', body:'<p>See <b>Findings</b>.</p>', check:()=>true, auto:true}];
function viewTut(m){ K.tutorialView(m,{D,st:TUT,title:'Tutorial — the 2007 D6208A file (D6207A platform)',L:LESSONS,side:()=>card('The card', `<div class="grid2" style="grid-template-columns:1fr 1fr"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="td"></div>`),bindSide:r=>{ r.querySelector('#te').innerHTML=edgeSVG(SIM.t); r.querySelector('#tr2').innerHTML=rearSVG(); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#td').innerHTML=dashHTML(); bindAll(r); },reset:A.reset}); }
function viewSoft(m){ m.innerHTML=`<div class="grid2"><div>${card('Signal path (live)', `<div id="flow"></div>`)}</div><div>${card('No software', `<p class="small">No firmware exists for any D6208A. The released D6207A (V102/V201) runs DOLBY_CAT552_AUDIO_ERROR_CHECK, RESET_DOLBY and an FPGA burst detector on the same parts (see d6207a.js); this model borrows only that routing idea ${inf('')}.</p>`)}${card('DRC log', `<p class="small mono">OnlineDRC.ERR.txt: NETLIST 0/0, CLEARANCE 0/0, WIDTH 0/0 (warnings / errors)</p><p class="small">D6208A.pcb and D6208A.BAK are the same size and date (2007-11-07).</p>`)}</div></div>`;
  const draw=()=>{ const s=decSrc(); m.querySelector('#flow').innerHTML=H8.flowSVG([`AES IN 1: ${ok(0)?T[D.in[0].t]:'no lock'}`,`AES IN 2: ${ok(1)?T[D.in[1].t]:'no lock'}`,'FPGA: first coded input → P3',`CAT552: ${s>=0?'decoding input '+(s+1):'idle'}`,'AES_OUT1–4 decoded, OUT5/6 loops'],s<0?2:3,s<0); };
  SIM.on('time', draw); }
const FINDINGS=[
  `<b>A D6207A under another name.</b> D6208A.sch (2007-06-18) carries the drawing number D6207A in its title block, and the parts and nets of the D6207A decoder: two inputs, two CS8416, an EP1C12 FPGA, a CAT552 socket, AES_OUT1–6.`,
  `<b>Title copied from another card.</b> The “DRAWING NUMBER 2” field reads “EMBEDDED AUDIO PROCESSOR” — the M6205 card’s description — so the sheet template came from the M6205.`,
  `<b>Symbol vs part.</b> U4 uses the EP1C6 symbol with value EP1C12-240; U5 uses the EPCS1 symbol with value M25P40 — the generic-flash-on-an-EPCS-footprint habit seen on other WBS boards.`,
  `<b>LED colours differ from the D6207A board.</b> Here LED1–LED7 are YEL, RED, GRN, YEL, RED, GRN, GRN; the D6207A ISS2 board has AES1 green, DOLBY1 yellow, ERROR1 red (d6207a.js).`,
  `<b>Eight input pairs on the edge, two inputs used.</b> AES1P/N … AES8P/N exist as nets, but only two transformers (T1, T2) and two receivers are fitted.`,
  `<b>Three designs, one number.</b> This 2007 file; a 2009 copy of the D6204A schematic in the D6208 WORKING folder; and the 2010 eight-input D6208A issue 1 (EP2C35, eight CS8416, CAT-559), which has no AES outputs wired (d6208.js).`,
  `<b>Clean DRC, no outputs.</b> The P-CAD DRC log reports 0 errors and 0 warnings, but there are no Gerbers, BOM or firmware: the 2007 layout was never released.`];
const ASSUME=['All behaviour from the D6207A platform '+inf('no D6208A firmware'),'LED names by position against the D6207A '+inf('colours differ'),'Rear layout as the D6207A T6305 '+inf('no rear drawing'),'Input reach 600 m at 75 Ω '+inf('D6201A family'),'Output assignment: OUT1–4 decoder, OUT5/6 input loops '+inf('')];
const SOURCES=[F+'D6208A.sch (strings via D6208A.sch.md), D6208A.pcb, D6208A.BAK, OnlineDRC.ERR.txt, README.md','#OPENGEAR #SERIES/D6208 - #Engineering #OPENGEAR/D6208A/PCB/WORKING/ (linked; see siumulation-plugins/d6208.js)','#OPENGEAR #SERIES/D6207A - #Master #OPENGEAR (linked; see siumulation-plugins/d6207a.js)'];
SIM.register({ id:'d6208a', product:'D6208A', name:'D6208A · 2007 schematic: a D6207A-based Dolby decoder layout, openGear (2007|40)', year:2007,
  folder:'#OPENGEAR #SERIES/D6208A  #Engineering #TIM #PCB', family:'openGear',
  summary:'This folder’s D6208A.sch is really the D6207A dual-input Dolby decoder platform saved under the D6208A number: two AES inputs, CS8416 receivers, an EP1C12 FPGA and a CAT552 decoder socket feeding six AES outputs. The model runs that platform as design intent and compares the three designs that share the D6208A name.',
  highlights:['Parts and nets recovered from the binary schematic','Two inputs, one decoder: the coded input wins','The three D6208A designs side by side','Title block copied from the M6205'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 audio sample',period:()=>1/48000},{label:'1 Dolby E frame',period:()=>1001/30000},{label:'1 ms',period:()=>1e-3}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.0005,'500 µs']], defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:770,h:310,sel:'fpga'})},{id:'schematic',label:'Schematics',render:m=>K.schemView(m,{product:'D6208A (2007)',sheets:SHEETS,foot:'REDRAWN from strings in the binary D6208A.sch — not the original CAD.'})},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:m=>H8.findingsView(m,'What the 2007 D6208A file is up to',FINDINGS,ASSUME,SOURCES)}],
});
})();
