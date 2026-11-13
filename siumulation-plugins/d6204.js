/* =====================================================================
   D6204 (#PROBLEM folder) — D6204A AES/EBU → analog D/A converter, openGear (Ward-Beck Systems)
   OEM: Ross DAC-8416 / Cobalt 9262.  Full model of the V200 firmware + FPGA V200.
   Plugin for the WBS Device Simulator (../siumulation.html)

   Authoritative copy (see Findings): #OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/
     the hashtag tree "D6204 - #Software", "D6204 - #Functional", "D6204 - #PCB".
   Sources used (paths under that folder unless noted):
   - D6204 - #Software/D6204 - #atmel/D6204 - #altera #Bootloader #v200/  (AVR code, misnamed folder)
       v100w.c      main(), boot waits, DEBOUNCE_fs, REFRESH_LEDS, MIRROR, INVERT_DATA, READ_DIP_SWITCHES
       D6204A.c/.h  ALTERA_write (control word), PROCESS_MODES, EQ push-button debounce, port macros
       AK4396.c/.h  AK4396_RESET, REFRESH_AK4396 (regs 0x00–0x04), AK4396_write (header CAD1 CAD0 1 A4..A0)
       cs84xx.c/.h  init_CS8416 (regs 0x00–0x06), CS8416_READ_LOCK_ALL (0x0C), CS8416_READ_SAMPLE_RATE (0x0B)
       altera.c/.h  write_data / write_data_read_firmware (16-bit exchange with the FPGA)
       CAN.c        timer0_ovf_isr (1 ms, toggles PG0 = 500 Hz ref to the FPGA), timer1 96 µs, heartbeat 10 000 ticks,
                    FPGA file-upload pages (asProg / asVerify, 4 tries), compatibility check (product name, build)
       Dashboard.c  OIDs, SET_PARAM (dashboard_enabled gate), START/UPGRADE_PAGE/VERIFY, SAVE/RESTORE_INFORMATION_EEPROM
       as.c         asMain, asProgramStart, asBulkErase, asProg, asVerify, asProgramDone (Peter Lo, 2009-10-14)
       common.h     Active-serial pin map (PD0 nCONFIG, PD1 DCLK, PD2 ASDI, PG3 DATA, PG4 nCS, PC5 nCE …)
       *_ztcpack.txt, V100.mak (ICCAVR 7.15)
   - D6204 - #Software/D6204 - #altera/D6204 - #altera #v200/  D6201A.qpf/.qsf (EP1C3T100C8, pins), D6201A.bdf (top-level
       netlist, extracted wire by wire), SR_DETECT_192.vhd, dec2_4.vhd, tone_gen1.vhd, i2s8416_aes.vhd, shift_out.vhd,
       shift_in16_version_out.vhd, lpm_constant0-2.vhd, d6204*.bat, ztcpack.txt, the two prebuilt *_fpga_v200.bin
   - D6204 - #PCB/D6204Aiss4.net (every net named on the schematic sheets), D6204A-iss4.bom, D6204A-iss4.pnp (part positions),
       GERBERS/D6204A-ISS4.TOP + .TSM + .TSS → assets/d6204-copper.png, assets/d6204-silk.png (120 dpi)
   - D6204 - #Functional/D6204-FUNCTIONAL.pdf, D6204-card-edge.pdf, D6204-T6302.pdf, D6204-T6402.pdf, D6204A SPECIFICATIONS.doc
   - D6204A - #Master/D6204A - #TESTREPORT/D6204A-V200-26MAR10.pdf (scanned test outline: cable reach 300 m / 1000 m with EQ)
   - #OPENGEAR #SERIES/D6204A  #Engineering #TIM #PCB/D6204A Manual.doc (user controls, LEDs, rear modules)
   - XXX - ENGINEERING - 2016 RD FILES/RD80-Amplifier Project/Parts/CS8416_F3.pdf (register 0Bh, 96KHZ bit)
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

/* =====================================================================
   D6204A model (V200 AVR + FPGA V200), everything below is from the files listed at the top
   ===================================================================== */
const inf=K.inf, card=K.card;
const ASSET='siumulation-plugins/assets/';
const ROOT='#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/';
const ENG=ROOT+'D6204/D6204 - #Engineering/';
const AVR=ENG+'D6204 - #Software/D6204 - #atmel/D6204 - #altera #Bootloader #v200/';
const FPG=ENG+'D6204 - #Software/D6204 - #altera/D6204 - #altera #v200/';
const PCB=ENG+'D6204 - #PCB/';
const hx=(n,w)=>(n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const b8=v=>(v&255).toString(2).padStart(8,'0');

/* ---------- constants from the source ---------- */
const C={
  LOOP_T:400e-6,          // one main-loop pass: ~120 bit-banged SPI/shift bits + CAN_FUNCTIONS at 8 MHz — inferred (no timer in the loop)
  DEB:255,                // EQ_PUSHBUTTON_DEBOUNCE (D6204A.h), reused by DEBOUNCE_fs (v100w.c)
  WAIT_US:1e-6,           // wait(n): one WDR/decrement per count ≈ 1 µs at 8 MHz — inferred (D6203A code: "2 × wait(50000) 50ms")
  REF:1e-3,               // timer0_ovf_isr every 1 ms (clk/64, TCNT0 = 0x83) toggles PORTG bit0 → 500 Hz "ref" (SR_DETECT_192)
  DET:0.016,              // SR_DETECT_192: counter4 divides ref by 8; det_*_out latch once per 16 ms
  T1:96e-6, HEART:10000,  // timer1 reload 0xFFF4 → 12 × 8 µs = 96 µs; TX_HEARTBEAT 10000 ticks = 960 ms
  CS_LOCK:0.020,          // CS8416 PLL lock time — inferred
  AKRST:0.002,            // AK4396_RESET(1000): wait(1000) low + wait(1000) high ≈ 2 ms
  ERASE:3.0,              // CAN_UPGRADE_WAIT 0x0BB8 = 3000 ms requested by START_UPGRADE (Dashboard.c); real erase time inferred = this
  PAGE:0.025,             // one 256-byte page over CAN + asProg + asVerify — inferred
  PAGES:118,              // d6204a…_fpga_v200.bin = 30 002 bytes ⇒ ≈118 pages of 256 (header size inferred)
  CONFIG:0.10,            // Cyclone AS configuration from the flash after asProgramDone — inferred
  DACFS:1.98,             // AK4396 differential full scale ≈ 1.98 V rms — inferred (gives +24.0 dBu with the CAL −20 resistors)
  RAIL:10.5,              // NE5532 swing per leg on the ±12 V SUW1R5-1212 rails — inferred
};
/* boot sequence of main() in v100w.c, wait() counts × 1 µs (inferred) */
const BOOT=[
  [0.000,'initialization(); DATA_INITIALIZATION() → LOCK_LED_ON (!), others off; CAN_RX (PD4 = LBK)'],
  [0.090,'30 × wait(3000)'],
  [0.020,'100 × AD_CONVERTER_SETUP() (COUNTER_CONSTANT) → ADDRESS_TABLE → slot_address, moduleAddress()  '+'(ADC time inferred)'],
  [0.090,'30 × wait(3000)'],
  [0.020,'second 100-sample slot read (the first result is thrown away)'],
  [0.046,'ALTERA_RESET(1000) (PC0) + 15 × wait(3000)'],
  [0.034,'ALTERA_write() ×3 → ALTERA3/4 = FPGA version → setFPGASoftwareRevision() (4 EEPROM writes, ≈8.5 ms each — inferred)'],
  [0.002,'init_CS8416() regs 0x00–0x06 · AK4396_RESET(1000) · READ_DIP_SWITCHES → SW7 = dip_switch_enabled, SW8 = dashboard_enabled'],
  [0.045,'15 × wait(3000)'],
  [0.004,'RESTORE_INFORMATION_EEPROM · DATA_SETUP · CANinit (timer0/timer1 start) · DIP branch or second RESTORE · ALTERA_write'],
  [0.001,'wait(1000) · REFRESH_AK4396() · CAN_TX → while(1)'],
];
const BOOT_T=BOOT.reduce((a,b)=>a+b[0],0);
const CALN=['Disabled','−20 dBFS = +4 dBu','−18 dBFS = +4 dBu','−12 dBFS = +4 dBu'];
const CALK=['DISABLED','CAL_20DBFS','CAL_18DBFS','CAL_12DBFS'];
const RSEL=[null,6490,8060,16200];          // R66 / R73 / R75 via U8,U12 74HC4053 (ML1/ML2/ML3 = dec2_4 out1/out2/out3)
const RSN=['—','R66 6K49','R73 8K06','R75 16K2'];
const FS_LIST=[32000,44100,48000,88200,96000,176400,192000];
const BRANDS={ 'D6204A':{def:'WARD_BECK',bin:null}, 'DAC-8416':{def:'ROSS_VIDEO',bin:'d6204adac8416_fpga_v200.bin'}, '9262':{def:'COBALT',bin:'d6204a9262_fpga_v200.bin'} };

/* ---------- device state ---------- */
const D={ in:{conn:true, fs:48000, len:150, dbfs:-20, f:1000}, term:75,
  eq:false, cal:1, tone:false, alarm:false, ee:{cal:1,tone:false,alarm:false,eq:'(not stored)'},
  dip:[1,1,1,1,1,1,1,1],    // 1 = OFF (PINA pulled up). SW1 = PA7 … SW8 = PA0 (D6204Aiss4.net: SW2 pins 16…9 → R40…R47 → OUT1_1SW…OUT2_4SW)
  lat:[true,true],          // [dip_switch_enabled, dashboard_enabled] latched at power-up
  rv:[130,130],             // RV1 / RV2 (2K trims in the 20K feedback) — set so CAL −20 gives +24.0 dBu (factory trim inferred)
  fw:'v200', brand:'D6204A', rear:'T6302', slot:4, image:'d6204adac8416_fpga_v200.bin',
  fsAt:null, pfs:48000, lockAt:null, bootAt:null, glitch:false, up:null, saved:false, log:[], canQ:[] };
const act=K.actor(D);

/* ---------- derived functions ---------- */
const swOn=i=>D.dip[i]===0;
function dipCal(raw){ const b0=raw? D.dip[0]===1 : swOn(0), b1=raw? D.dip[1]===1 : swOn(1);   // after INVERT_DATA: bit0 = SW1 ON, bit1 = SW2 ON
  return (!b0&&!b1)?1 : (b0&&!b1)?2 : (!b0&&b1)?3 : 0; }
function dipTone(raw){ return raw? D.dip[2]===1 : swOn(2); }
const dipCtl=()=>D.lat[0]&&!D.lat[1];           // ALTERA_write: (dip_switch_enabled == YES) && (dashboard_enabled == NO)
function effCal(){ return dipCtl()? dipCal(false) : D.cal; }
function effTone(){ return dipCtl()? dipTone(false) : D.tone; }
function reach(){ if (D.term===110) return 100; return D.eq?1000:300; }   // test outline: 75 Ω 300 m / 1000 m with EQ; 110 Ω 100 m
function inputOk(){ const i=D.in; return i.conn && i.len<=reach() && i.fs>=30000 && i.fs<=192000; }
function booting(t){ return D.bootAt!==null && t>=D.bootAt && t<D.bootAt+BOOT_T; }
function bootStep(t){ if(!booting(t)) return -1; let a=D.bootAt; for(let i=0;i<BOOT.length;i++){ a+=BOOT[i][0]; if(t<a) return i; } return BOOT.length-1; }
function glitchWin(t){ return D.glitch && D.bootAt!==null && t>=D.bootAt+BOOT_T-0.0012 && t<D.bootAt+BOOT_T; }
function locked(t){ if(!inputOk()) return false; if(D.lockAt!==null && t>=D.lockAt && t<D.lockAt+C.CS_LOCK) return false; return true; }
/* fs flags: FPGA SR_DETECT_192 (det96 > 60 kHz, det192 > 125 kHz) and CS8416 reg 0x0B bit0 "96KHZ" (≥ 88.1 kHz) */
function flags(fs){ return {det96:fs>60000, det192:fs>125000, cs96:fs>=88100}; }
function speedOf(fs){ const f=flags(fs);
  if (D.fw==='v200'){ if (f.cs96) return 'NORMAL'; }       // v100w.c DEBOUNCE_fs: if (fs_flag & BIT2) fs = NORMAL_SPEED;
  else { if (!f.cs96) return 'NORMAL'; }                    // the commented-out V103 test: if (CS8416_READ_SAMPLE_RATE() == 0) NORMAL
  if (f.det96&&!f.det192) return 'DOUBLE'; if (f.det96&&f.det192) return 'QUAD'; return 'NORMAL'; }
function fsFlagBits(fs){ const f=flags(fs); return (f.det96?1:0)|(f.det192?2:0)|(f.cs96?4:0); }
/* After a rate change: SR_DETECT updates on the next 16 ms boundary, then DEBOUNCE_fs needs 256 passes */
function speedTimes(){ if (D.fsAt===null) return null; const det=Math.ceil((D.fsAt+C.CS_LOCK)/C.DET)*C.DET+0.004; const app=det+(C.DEB+1)*C.LOOP_T; return {det, app, rstEnd: app+C.AKRST}; }
function speedAt(t){ const st=speedTimes(); if(!st||t>=st.app) return speedOf(D.in.fs); if(t<D.fsAt) return speedOf(D.in.fs); return speedOf(D.pfs); }
function akReset(t){ const st=speedTimes(); if (st && speedOf(D.pfs)!==speedOf(D.in.fs) && t>=st.app && t<st.rstEnd) return true;
  if (D.lockAt!==null && t>=D.lockAt+C.CS_LOCK && t<D.lockAt+C.CS_LOCK+C.AKRST && inputOk()) return true; return false; }
function akInSpec(t){ const s=speedAt(t), fs=D.in.fs; return s==='NORMAL'? fs<=54000 : s==='DOUBLE'? fs>54000&&fs<=108000 : fs>108000; }
function pg4(t){ return speedAt(t)==='DOUBLE'? 0 : speedAt(t)==='QUAD'? 1 : (D.pg4!=null?D.pg4:1); }
/* FPGA upload over CAN (V200 "FPGA bootloader") */
function upEl(t){ if(!D.up) return null; const e=D.up.sec===0? t-D.up.at : D.up.sec-D.up.at+t; return e<0?null:e; }
function upPhase(t){ const e=upEl(t); if(e===null) return null; const u=D.up;
  if (!u.ok) return e<0.002?{k:'reject',e}:null;
  if (e<0.002) return {k:'start',e};
  if (e<C.ERASE) return {k:'erase',e};
  const pEnd=C.ERASE+C.PAGES*C.PAGE;
  if (e<pEnd) return {k:'pages',e,page:Math.floor((e-C.ERASE)/C.PAGE)};
  if (e<pEnd+C.CONFIG) return {k:'config',e};
  return {k:'done',e}; }
function fpgaOff(t){ const p=upPhase(t); return !!p && ['erase','pages','config'].includes(p.k); }
function audioGate(t){ if (booting(t)||fpgaOff(t)) return false; if(!locked(t)||akReset(t)) return false; return effCal()!==0; }
function gain(k){ const c=effCal(); return c? (20000+D.rv[k])/RSEL[c] : 0; }
function srcDbfs(t){ return (effTone()||glitchWin(t))? -20 : D.in.dbfs; }
function legRms(k,t){ return C.DACFS*Math.pow(10,srcDbfs(t)/20)*gain(k); }
function outDbu(k,t){ const v=2*legRms(k,t); return v>0? 20*Math.log10(v/0.7746) : null; }
function fsDbu(k){ const c=effCal(); if(!c) return null; return 20*Math.log10(2*C.DACFS*gain(k)/0.7746); }
function clipped(k,t){ return legRms(k,t)*Math.SQRT2>C.RAIL; }
function sample(t,k){ const fs=D.in.fs, n=Math.floor(t*fs);
  if (effTone()||glitchWin(t)) return 0.1*Math.sin(2*Math.PI*((n+1)%48)/48);    // tone_gen1: 48-step table, peak 0x0CCCCD = −20 dBFS
  return Math.pow(10,D.in.dbfs/20)*Math.sin(2*Math.PI*D.in.f*n/fs); }
function anaOut(t,k){ if(!audioGate(t)) return 0; const pk=C.DACFS*Math.SQRT2*gain(k||0)*sample(t,k)*2; return Math.max(-2*C.RAIL,Math.min(2*C.RAIL,pk))/(2*C.RAIL); }
/* AVR → FPGA control word (D6204A.c ALTERA_write) and FPGA → AVR status (shift_out p0..p15) */
function ctlWord(t){ let lo=0xFF; const tone=effTone()||glitchWin(t), c=glitchWin(t)? dipCal(true) : effCal();
  lo = tone? lo&~0x04 : lo|0x04;
  if(c===0) lo&=~0x03; else if(c===1) lo|=0x03; else if(c===2){ lo|=0x02; lo&=~0x01; } else { lo|=0x01; lo&=~0x02; }
  const up = locked(t)? 0x00 : 0x80; return {up, lo}; }
function mlLines(t){ if (fpgaOff(t)) return [1,1,1]; const w=ctlWord(t), in1=w.lo&1, in2=(w.lo>>1)&1, mute=(w.up>>7)&1;   // dec2_4.vhd
  return [ (!(in1&&in2))|mute, (!(!in1&&in2))|mute, (!(in1&&!in2))|mute ].map(x=>x?1:0); }
function altera12(){ const f=flags(D.in.fs); const a1=(f.det96?1:0)|(f.det192?2:0)|(f.det96?4:0)|(f.det192?8:0)|0xA0; return [a1,0xAA]; }
/* LEDs (D6204A.h PORTE): Lock PE0 (L2 GRN), No Lock PE1 (L3 RED), EQ PE3 (L4 YEL), COM PE4 (L5 GRN), Error PE5 (L6 RED) */
function leds(t){ if (booting(t)) return {l:1,n:0,e:0,c:0,x:0};      // DATA_INITIALIZATION() switches LOCK_LED_ON at power-up
  const p=upPhase(t); if (p&&p.k==='pages') return {l:1,n:1,e:D.eq?1:0,c:comLed(t),x:0};   // alteraProgStart == YES
  const k=locked(t); return {l:k?1:0,n:k?0:1,e:D.eq?1:0,c:comLed(t),x:0}; }      // COM_ERROR_LED is only ever switched off
function canList(){ const out=[], ph=0.42+(D.slot*0.0173)%0.3; for (let t=ph;t<1;t+=C.HEART*C.T1) out.push({t,n:1,dir:'tx',label:'card → MFC: heartbeat'});
  for (let t=0.21;t<1;t+=0.5){ out.push({t,n:1,dir:'rx',label:'MFC → card: GET_PARAM 2.1'}); out.push({t:t+0.0005,n:1,dir:'tx',label:'card → MFC: REPORT_PARAM'}); }
  D.canQ.forEach(t=>{ out.push({t,n:1,dir:'rx',label:'MFC → card: SET_PARAM'}); out.push({t:t+0.0004,n:2,dir:'tx',label:'card → MFC: reply (multi-frame)'}); });
  if (D.up){ const u=D.up; const add=(e,lab,dir,n)=>{ const t=u.sec===0? u.at+e : e-(u.sec-u.at); if(t>=0&&t<1) out.push({t,n:n||1,dir,label:lab}); };
    add(0,'MFC → card: START_UPGRADE (file type 1)','rx',4); add(0.001,u.ok?'card → MFC: CAN_UPGRADE_WAIT 0x0BB8':'card → MFC: CAN_INVALID_PRODUCT','tx');
    if(u.ok){ add(C.ERASE,'MFC → card: START_UPGRADE again','rx'); add(C.ERASE+0.0005,'card → MFC: CANRESP_OK','tx');
      for(let p=0;p<C.PAGES;p++){ add(C.ERASE+0.001+p*C.PAGE,'MFC → card: UPGRADE_PAGE '+p,'rx',33); add(C.ERASE+0.0055+p*C.PAGE+0.012,'card → MFC: OK page '+p,'tx'); }
      add(C.ERASE+C.PAGES*C.PAGE,'MFC → card: VERIFY_UPGRADE','rx'); add(C.ERASE+C.PAGES*C.PAGE+0.0005,'card → MFC: CANRESP_OK (file CRC)','tx'); } }
  return out.filter(f=>!booting(f.t)).sort((a,b)=>a.t-b.t); }
let CANCACHE=null, CANVER=-1; let VER=0;
function canNow(){ if (CANVER!==VER){ CANCACHE=canList(); CANVER=VER; } return CANCACHE; }
function comLed(t){ return canNow().some(f=>f.dir==='tx'&&f.n>1&&t>=f.t&&t<f.t+0.0012)?1:0; }   // MultiFrameMessageTransmission switches it on/off

/* ---------- actions (each logs the firmware path) ---------- */
function touch(){ VER++; }
const A={
  eq(){ act('Press EQ switch SW1 (card edge)', tr=>{ D.eq=!D.eq; touch();
    tr('PROCESS_EQ_PUSHBUTTONS → READ_SWITCHES: EQ1_SWITCH (PINE & BIT2) low → data_out bit0');
    tr('TRANSLATE_SWITCHES: pb = YES, eq_refresh = YES → TRANSLATE_EQ_PUSHBUTTONS: eq1_active ^= BIT0 → '+(D.eq?'YES':'NO'));
    tr(`PROCESS_MODES (every pass): CS8416_write1(0x04, ${D.eq?'0x89':'0x80'})  // ${D.eq?'GPO = IN1_EQ, OUT1 = IN1_EQ':'GPO = IN1, OUT1 = IN1'}`);
    tr(`REFRESH_LEDS: EQ_LED_${D.eq?'ON':'OFF'} (PE3, yellow L4). Release debounce: DEBOUNCE_PUSHBUTTONS 255 passes ≈ ${(255*C.LOOP_T*1000).toFixed(0)} ms`);
    tr(`Reach now ${reach()} m on ${D.term} Ω; cable ${D.in.len} m → ${inputOk()?'LOCK':'NO LOCK'}. eq1_active is not written to EEPROM (SAVE_INFORMATION_EEPROM stores 11, 13, 14 only)`); }); },
  plug(){ act(`${D.in.conn?'Unplug':'Plug in'} AES IN (rear position 1)`, tr=>{ D.in.conn=!D.in.conn; D.lockAt=SIM.t; touch();
    if (D.in.conn) { tr('T1 PE-65612 → H1 75/110 jumper → CS8416 RXP0 (and RXP1 through the EQ network) — CS8416 PLL locks ≈20 ms '+inf('lock time'));
      tr('Next pass: CS8416_READ_LOCK_ALL reads reg 0x0C = 0 → Astatus bit0 → REFRESH_LEDS: LOCK_LED_ON, aes1_lock was NO → AK4396_RESET(1000) + REFRESH_AK4396');
      tr('ALTERA_write: data_upper = INVERT_DATA(aes1_lock) << 7 = 0x00 → FPGA q15 no_lock = 0 → dec2_4 un-mutes ML/MR, i2s8416_aes "off" = 0'); }
    else { tr('CS8416 reg 0x0C ≠ 0 → Astatus bit0 = 0 → REFRESH_LEDS: NO_LOCK_LED_ON, aes1_lock = NO, AK4396_POWER_DOWN() (PB0 low) every pass');
      tr('ALTERA_write: data_upper = 0x80 → no_lock → dec2_4 drives ML1–3/MR1–3 high (all gain resistors grounded = analog mute), aes1 output held low'); } }); },
  len(v){ act(`AES cable → ${v} m`, tr=>{ D.in.len=+v; D.lockAt=SIM.t; touch(); tr(`Reach: 75 Ω 300 m without EQ / 1000 m with EQ; 110 Ω 100 m (D6204A-V200-26MAR10.pdf test outline). Now ${inputOk()?'locks':'NO LOCK'}`); }); },
  term(v){ act(`Jumper H1 → ${v} Ω`, tr=>{ D.term=+v; D.lockAt=SIM.t; touch(); tr(`H1 selects R30 75R or R33 110 across the T1 secondary (D6204Aiss4.net nets NET00005/NET00006) — ${inputOk()?'locked':'NO LOCK'} at ${D.in.len} m`); }); },
  fs(v){ act(`Source sample rate → ${(+v/1000)} kHz`, tr=>{ D.pfs=D.in.fs; D.in.fs=+v; D.fsAt=SIM.t; D.lockAt=SIM.t; touch(); const f=flags(+v), st=speedTimes();
    tr(`FPGA SR_DETECT_192: counter1 counts CS8416 RMCK (256·fs) while ref (PG0) is high for 1 ms → ${(256*v/1000).toFixed(0)} counts vs 15 360 (60 kHz) / 32 000 (125 kHz) → det_96 = ${+f.det96}, det_192 = ${+f.det192}; MCLK_4396 = mclk${f.det192?' ÷ 2':''}`);
    tr(`shift_out p0/p1 → ALTERA1 bits 1:0 (accepted only when ALTERA2 == 0xAA). CS8416_READ_SAMPLE_RATE: reg 0x0B bit0 "96KHZ" = ${+f.cs96} → fs_flag bit2`);
    tr(`fs_flag = 0b${fsFlagBits(+v).toString(2).padStart(3,'0')} → DEBOUNCE_fs counts ${C.DEB+1} passes (≈${((C.DEB+1)*C.LOOP_T*1000).toFixed(0)} ms ${inf('pass time')}), applied at ${SIM.fmtT(st.app)}`);
    const sp=speedOf(+v);
    tr(D.fw==='v200'? `As written: if (fs_flag & BIT2) fs = NORMAL_SPEED → ${sp}${f.cs96?' — the ≥ 88.1 kHz flag forces NORMAL, the DOUBLE/QUAD branches can never run':''}` : `Intended (commented V103 test): CS8416 < 88.1 kHz → NORMAL, else FPGA bits → ${sp}`);
    if (speedOf(D.pfs)!==sp) tr(`fs != pfs → AK4396_RESET(1000) → REFRESH_AK4396: reg 0x01 = ${sp==='DOUBLE'?'0x0A (DFS0)':sp==='QUAD'?'0x12 (DFS1)':'0x02'}; PORTG ${sp==='QUAD'?'|= BIT4':sp==='DOUBLE'?'&= ~BIT4':'untouched'} — PG4 is the flash nCS line on this board`);
    else tr('Speed unchanged → AK4396 not touched');
    if (!akInSpec(st.app+0.01)) tr(`AK4396 left in ${sp} speed at ${v/1000} kHz: outside the datasheet range ${inf('AK4396 data sheet, not in the archive')}`); }); },
  level(v){ act(`Programme level → ${v} dBFS`, tr=>{ D.in.dbfs=+v; touch(); const o=outDbu(0,SIM.t); tr(`Analog: ${v} dBFS × gain ${gain(0).toFixed(3)} (${RSN[effCal()]}) → ${o==null?'muted':o.toFixed(1)+' dBu balanced'}${clipped(0,SIM.t)?' — CLIPS the NE5532':''}`); }); },
  freq(v){ act(`Programme frequency → ${v} Hz`, tr=>{ D.in.f=+v; touch(); tr('No effect on the card: the path is flat to 20 kHz (2nd-order MFB filter in U9/U13 OP275)'); }); },
  rv(k,v){ act(`RV${k+1} ${k?'RIGHT':'LEFT'} trim → ${v} Ω`, tr=>{ D.rv[k]=+v; touch(); tr(`U${k?14:10}A feedback = R${k?89:64} 20K + RV${k+1} ${v} Ω → gain ${gain(k).toFixed(3)} → 0 dBFS = ${fsDbu(k)==null?'muted':fsDbu(k).toFixed(2)+' dBu'}`); }); },
  dip(i){ act(`DIP SW2 position ${i+1} → ${D.dip[i]?'ON':'OFF'}`, tr=>{ D.dip[i]=D.dip[i]?0:1; touch();
    tr(`READ_DIP_SWITCHES: dip_switches = MIRROR(PINA) = 0b${b8(dipByte())} (SW1 = PA7 → bit0 … SW8 = PA0 → bit7)`);
    if (i>=6) tr(`SW${i+1} is only read at power-up (${i===6?'dip_switch_enabled':'dashboard_enabled'}) — reboot to apply`);
    else if (i>=3) tr('SW4–SW6 are read but nothing in V200 uses them');
    else if (dipCtl()) tr(`ALTERA_write (DIP in control): INVERT_DATA → calibration = ${CALK[dipCal(false)]}, tone_generation = ${dipTone(false)?'YES':'NO'}`);
    else tr(`Ignored now: ALTERA_write uses DIPs only when dip_switch_enabled == YES && dashboard_enabled == NO (latched ${D.lat[0]?'YES':'NO'} / ${D.lat[1]?'YES':'NO'})`); }); },
  rear(r){ act(`Fit rear module ${r}`, tr=>{ D.rear=r; touch(); tr(RM[r].note); tr('moduleAddress(slot_address) reads AN_BMID / AN_BMID2 (PF1/PF2) at boot only'); }); },
  brand(b){ act(`Firmware build for ${b} (common.h #define ${BRANDS[b].def})`, tr=>{ D.brand=b; touch(); tr(`RESTORE_INFORMATION_EEPROM writes productName "${b}" to EEPROM 4060…4075; the FPGA upload compares it byte for byte with the .bin header`); }); },
  fw(v){ act(v==='v200'?'Firmware: V200 as written':'Firmware: DEBOUNCE_fs with the polarity fixed', tr=>{ D.fw=v; touch(); tr(v==='v200'?'if (fs_flag & BIT2) fs = NORMAL_SPEED;  // v100w.c line 260 (also V107)':'if ((fs_flag & BIT2) == 0) fs = NORMAL_SPEED;  // what the commented-out V103 code did — what-if only'); }); },
  dash(id,v){
    if (id==='reboot'){ act('DashBoard: Reboot', tr=>doBoot(tr,'CANMSG_REBOOT → reboot_device → watchdog reset')); return; }
    if (id==='upload'){ act('DashBoard: Upload AVR image (load type 0)', tr=>{ tr('CANMSG_START_UPGRADE with getCANFileUploadType() == 0 → CAN_UPGRADE_WAIT 0x0BB8, reboot_device = YES, upgrade_device = YES');
      tr('Ross OGP bootloader (D6204 - #altera #Bootloader/common/bootavr.c) takes over: UPGRADE_PAGE … VERIFY → REBOOT'); tr('zeuspack: bin/D6204A_v2_00.bin, DAC-8416_v2_00.bin, 9262_v2_00.bin (load type 0, compat 0.0.255.255)'); doBoot(tr,'after the loader'); }); return; }
    if (id==='fpga'){ startUpload(); return; }
    if (!D.lat[1]){ act(`DashBoard: change ${id}`, tr=>tr('SET_PARAM: dashboard_enabled == NO (SW8 ON at power-up) → value not accepted')); return; }
    const nm={eq:'EQ (OID 3.2)',cal:'Calibration (OID 3.4)',tone:'Tone Generator (OID 3.5)',alarm:'Notify on Card Fault',save:'Save Settings (OID 3.1)'}[id];
    act(`DashBoard: ${nm}${id==='save'?'':' → '+(id==='cal'?CALN[+v]:id==='alarm'?(+v?'Enabled':'Disabled'):(v?'Enabled':'Disabled'))}`, tr=>{
      tr('can_rx_isr → CAN_FUNCTIONS → DASHBOARD_RESPONSE_SETUP: CANMSG_SET_PARAM, dashboard_enabled == YES');
      if (id==='eq'){ D.eq=!!v; tr(`eq1_active = ${v?'YES':'NO'}, peq1_active too → PROCESS_MODES: CS8416 reg 0x04 = ${v?'0x89':'0x80'}`); }
      if (id==='cal'){ D.cal=+v; const w=ctlWord(SIM.t); tr(`calibration = ${CALK[+v]} → ALTERA_write data_lower bits 1:0 = ${b8(w.lo).slice(6)} → FPGA q1 q0 → dec2_4`);
        tr(+v? `dec2_4 out${+v} low → ${['','ML1/MR1','ML2/MR2','ML3/MR3'][+v]} → 74HC4053 connects ${RSN[+v]} to the U10A/U14A summing node → 0 dBFS = ${fsDbu(0).toFixed(1)} dBu` : 'dec2_4 "00 = reserved not used": out1–3 all high → every gain resistor grounded → BOTH ANALOG PAIRS MUTED (AES outputs unaffected)');
        if (dipCtl()) tr('…but dip_switch_enabled && !dashboard_enabled: the next ALTERA_write overwrites calibration from the DIPs'); }
      if (id==='tone'){ D.tone=!!v; tr(`tone_generation = ${v?'YES':'NO'} → data_lower bit2 = ${v?0:1} → FPGA q2 "dip3" → NOT → i2s8416_aes ext_sel = ${v?1:0}`); tr(v?'tone_gen1 (48-sample table, peak 0x0CCCCD = −20 dBFS, clocked by the CS8416 LRCLK) replaces the input on AES OUT 1–4 and both analog pairs':'Programme restored'); }
      if (id==='alarm'){ D.alarm=!!+v; tr(`smpte_alarm_enabled = ${D.alarm?'YES':'NO'} → OID 2.1 reports ${D.alarm?'BIT2 on no lock, BIT3 on FPGA error':'0 (OK) whatever happens'}`); }
      if (id==='save'){ D.saved=true; D.ee={cal:D.cal,tone:D.tone,alarm:D.alarm,eq:'(not stored)'}; tr('save_settings → SAVE_INFORMATION_EEPROM: 100 = 0xAA, 11 = smpte_alarm_enabled, 13 = calibration, 14 = tone_generation ("how the voiceover is mixed", "dim level1" comments left from another product)'); tr('eq1_active is not saved'); }
      D.canQ.push(SIM.t); touch(); });
  },
  slot(n){ act(`Move card to slot ${n}`, tr=>{ D.slot=n; touch(); tr(`ADC on PF0 (AN_SLOTID) → ADDRESS_TABLE → slot ${n}; heartbeat phase follows the slot (TX_INITIALIZE = 1000·slot_address)`); doBoot(tr,'hot-plug'); }); },
  next(){ if(!D.up) return; act('Upload: next second', tr=>{ D.up.sec = D.up.sec===0? 1 : D.up.sec+1; touch(); const p=upPhase(0.5); tr(`Window now ${D.up.sec}–${D.up.sec+1} s after START_UPGRADE · phase: ${p?p.k:'—'}`); }); },
  reset(){ Object.assign(D,{term:75,eq:false,cal:1,tone:false,alarm:false,ee:{cal:1,tone:false,alarm:false,eq:'(not stored)'},rv:[130,130],fw:'v200',brand:'D6204A',rear:'T6302',slot:4,fsAt:null,pfs:48000,lockAt:null,bootAt:null,glitch:false,up:null,saved:false,pg4:1});
    D.in={conn:true,fs:48000,len:150,dbfs:-20,f:1000}; D.dip=[1,1,1,1,1,1,1,1]; D.lat=[true,true]; D.log=[]; D.canQ=[]; touch(); SIM.refresh(); },
};
function dipByte(){ let r=0; for(let i=0;i<8;i++) if(D.dip[i]) r|=1<<i; return r; }    // MIRROR(PINA): SW(i+1) → bit i, 1 = OFF
function doBoot(tr,why){ D.bootAt=SIM.t; D.lockAt=SIM.t+BOOT_T-C.CS_LOCK; D.fsAt=null; D.up=null; D.eq=false;
  D.lat=[D.dip[6]===1, D.dip[7]===1]; D.glitch=D.lat[0]&&!D.lat[1];
  tr(`${why} → main(): boot ≈ ${(BOOT_T*1000).toFixed(0)} ms ${inf('wait() = 1 µs per count')}. Lock LED is lit the whole time (DATA_INITIALIZATION)`);
  tr(`SW7 ${D.dip[6]?'OFF':'ON'} → dip_switch_enabled = ${D.lat[0]?'YES':'NO'}; SW8 ${D.dip[7]?'OFF':'ON'} → dashboard_enabled = ${D.lat[1]?'YES':'NO'}`);
  if (D.lat[0]){ D.cal=dipCal(false); D.tone=dipTone(false); tr(`DIP branch: INVERT_DATA(dip_switches) → calibration = ${CALK[D.cal]}, tone = ${D.tone?'YES':'NO'} (overrides the EEPROM values)`); }
  else { D.cal=D.ee.cal; D.tone=D.ee.tone; tr(`RESTORE_INFORMATION_EEPROM: calibration = ${CALK[D.cal]}, tone = ${D.tone?'YES':'NO'}, alarm = ${D.ee.alarm?'YES':'NO'}`); }
  D.alarm=D.ee.alarm;
  if (D.glitch) tr(`SW7 OFF + SW8 ON: the DIP branch inverts dip_switches, then ALTERA_write inverts them again → for ≈1.1 ms (wait(1000) + REFRESH_AK4396) the FPGA gets calibration ${CALK[dipCal(true)]}, tone ${dipTone(true)?'ON':'off'} until the first loop pass re-reads the DIPs`);
  tr('eq1_active starts NO (never restored)'); touch(); }
function startUpload(){ act(`DashBoard: Upload FPGA image ${D.image}`, tr=>{ const hdr=D.image.includes('9262')?'9262':'DAC-8416', ok=hdr===D.brand;
  D.up={at:SIM.t, sec:0, ok, img:D.image}; touch();
  tr(`CANMSG_START_UPGRADE (multi-frame header) → rFileType = buffer[16] = 1 (FPGA). Build check: SOFTWARE_BUILD 2, 0.0 vs file ${hdr==='9262'?'2.00 … 255.255':'2.00 … 2.255'} → pass`);
  tr(`Product check: productName "${D.brand}" vs file "${hdr}" → ${ok?'compatibility = YES':'compatibility = NO → reply CAN_INVALID_PRODUCT (no D6204A-named FPGA .bin exists in the archive)'}`);
  if (!ok) return;
  tr('Reply CAN_UPGRADE_WAIT 0x0B 0xB8 (3000 ms), alteraProgReady = YES → next CAN_FUNCTIONS: asMain()');
  tr('asInit → asProgramStart: nCONFIG (PD0) low = FPGA unconfigured (no AES out, no I²S, ML lines float → analog silent '+inf('FPGA I/O state in reset')+'), nCE (PC5) high, nCS (PG4) high → asBulkErase (0xC7)');
  tr(`After 3 s the frame controller repeats START_UPGRADE → alteraEraseComplete == YES → CANRESP_OK, alteraProgStart = YES → main loop parks: LOCK + NO LOCK LEDs both on`);
  tr(`${C.PAGES} × UPGRADE_PAGE: asProg (AS_WRITE_ENABLE 0x06, AS_PAGE_PROGRAM 0x02, address = page·256) + asVerify, retried up to 4 times`);
  tr('CANMSG_VERIFY_UPGRADE → file CRC → asProgramDone: nCS/DCLK/ASDI to inputs, nCE low, nCONFIG released → Cyclone reloads from U7 (M25P40 on the EPCS1 footprint)');
  tr('Press "Next second ▶" to follow the upload past the first second.'); }); }

/* ---------- rear modules (D6204-T6302.pdf / D6204-T6402.pdf) ---------- */
const RM={ T6302:{name:'T6302A', sub:'single card (D6204-T6302.pdf)', note:'T6302A: AES IN on 1, AES OUT 1–4 on BNC, LEFT/RIGHT OUT #1/#2 on Phoenix (+ − G). Card nets: BNC1 = AES in (T1), AES3/AES7 = LEFT pairs, AES4/AES8 = RIGHT pairs.',
    cells:[[1,'AES IN','bnc','in'],[2,'NOT USED','nc'],[3,'AES OUT 1','bnc'],[4,'AES OUT 3','bnc'],[5,'AES OUT 2','bnc'],[6,'AES OUT 4','bnc'],[7,'LEFT OUT 1','tb'],[8,'LEFT OUT 2','tb'],[9,'RIGHT OUT 1','tb'],[10,'RIGHT OUT 2','tb']]},
  T6402:{name:'T6402A', sub:'double card (D6204-T6402.pdf)', note:'T6402A: two cards share one module; this card gets AES IN, OUT1/OUT2 and one stereo pair (#1 side).',
    cells:[[2,'AES IN #1','bnc','in'],[1,'AES IN #2','bnc'],[4,'OUT1 #1','bnc'],[3,'OUT1 #2','bnc'],[6,'OUT2 #1','bnc'],[5,'OUT2 #2','bnc'],[8,'LEFT #1','tb'],[7,'LEFT #2','tb'],[10,'RIGHT #1','tb'],[9,'RIGHT #2','tb']]} };
/* CorelDRAW artwork (artwork pass 2026|59): card edge and rear modules converted from the archive .cdr files
   to assets/d6204-*.svg; LED, switch and connector positions are the artwork's own coordinates (pt). */
const ART={edge:{"vb":[61,129,219,312],"led":[[177.41,151.59,5.74,12.58],[177.41,172.75,5.74,12.58],[177.52,195.94,5.74,12.58],[177.41,239.79,5.74,12.58],[177.52,262.98,5.74,12.58]],"sw":[[177.35,154.62,15.87,27.94]],"href":"d6204-edge.svg"},
 rear:{"T6302":{"vb":[315.5,211.5,147.5,186.5],"panel":[368.05,255.68,39.83,99.57],"s":1.006,"pos":{"1":[374.89,270.77],"2":[393.9,270.77],"3":[374.89,289.78],"4":[393.9,289.78],"5":[374.89,308.79],"6":[393.9,308.79],"7":[374.89,327.8],"8":[393.9,327.8],"9":[374.89,346.81],"10":[393.9,346.81]},"href":"d6204-rear-t6302.svg"},
  "T6402":{"vb":[463.8,211.5,148.7,186.5],"panel":[518.64,256.75,39.83,99.57],"s":1.006,"pos":{"1":[525.48,271.84],"2":[544.49,271.84],"3":[525.48,290.85],"4":[544.49,290.85],"5":[525.48,309.86],"6":[544.49,309.86],"7":[525.48,328.87],"8":[544.49,328.87],"9":[525.48,347.88],"10":[544.49,347.88]},"href":"d6204-rear-t6402.svg"}},
 edgeCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/D6204 - #Functional/D6204-card-edge.cdr','D6204-card-edge.cdr (2007-12-12)'),
 rearCite:()=>'Artwork: '+SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6204A - rear module options.cdr','D6204A - rear module options.cdr (2012-01-09): T6302A, T6402A')};
function rearSVG(t){ const r=RM[D.rear], aesOn=locked(t)&&!fpgaOff(t)&&!booting(t), anOn=audioGate(t), mine=l=>D.rear!=='T6402'||l.includes('#1');
  return K.rearSVG({art:ART.rear[D.rear], name:r.name, sub:r.sub, split:D.rear==='T6402'?['CARD 2','CARD 1 (this card)']:null, id:'ID read on AN_BMID (PF1) + AN_BMID2 (PF2)',
    cells:r.cells.map(([n,l,k,id])=>({n,label:l,kind:k,id,conn:id==='in'?D.in.conn:undefined,
      live:id==='in'?(D.in.conn?(locked(t)?true:'warn'):undefined):(k==='nc'||!mine(l))?undefined:(k==='tb'?(anOn?(clipped(0,t)?'warn':true):'err'):(aesOn?true:'err'))}))}); }
function edgeSVG(t){ const L=leds(t); return K.edgeSVG({art:ART.edge, label:D.brand==='D6204A'?'D6204A':D.brand, leds:[{name:'Lock',c:'g',on:L.l,y:60,title:'L2 GRN, PE0'},{name:'No Lock',c:'r',on:L.n,y:100,title:'L3 RED, PE1'},{name:'EQ',c:'y',on:L.e,y:150,title:'L4 YEL, PE3'},{name:'COM Activity',c:'g',on:L.c,y:240,title:'L5 GRN, PE4'},{name:'Error',c:'r',on:L.x,y:290,title:'L6 RED, PE5 — never switched on by V200'}],
  sws:[{id:'eq',name:'EQ Switch (SW1)',y:80,state:D.eq?'EQ IN':'EQ OUT'}], note:'Artwork: D6204-card-edge.cdr (label reads D6204A)'}); }

/* ---------- the card, from the ISS4 Gerbers ---------- */
const PNP=(x,y)=>[(x/1000+0.9)*120,(2.75-y/1000)*120];      // pnp origin (3350, 5850) mil; image box x 2.45…15.33 in, y 5.26…8.60 in at 120 dpi
const PARTS=[['U4','AT90CAN128',7611,2127],['U6','EP1C3T100',8906,1319],['U3','CS8416',8804,2171],['U16','AK4396',7189,936],['U7','M25P40 (EPCS1)',8005,1315],['U8','74HC4053 L',5035,565],['U12','74HC4053 R',5035,1295],['U9','OP275 L',6375,705],['U13','OP275 R',6375,1210],['U10','NE5532',4480,595],['U14','NE5532',4480,1300],['U11','NE5532',3945,330],['U15','NE5532',3940,1030],['U1','EL5263 in',10000,2290],['U2','EL5263 AES out',11045,1715],['U5','CAN xcvr',11185,105],['REG2','LM2676 3.3V',745,585],['REG5','SUW1R5 ±12V',2713,1215]];
const LEDP=[['l','Lock',-350.3,2450,'#5dff5a'],['n','No Lock',-350.3,2315,'#ff4a3d'],['e','EQ',-350.3,2180,'#ffd23a'],['c','COM',-335.3,1730,'#5dff5a'],['x','Error',-335.3,1595,'#ff4a3d']];
let HOT=null;
function cardSVG(t,opts){ opts=opts||{}; const L=leds(t);
  let s=`<svg viewBox="0 0 1545 400" role="img" aria-label="D6204A ISS4 card, top side, from the Gerbers" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="d64glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1545" height="400" fill="var(--panel2)"/>
   <rect x="2" y="2" width="1541" height="356" rx="4" fill="#111a14"/>
   <image href="${ASSET}d6204-copper.png" width="1545" height="400" opacity=".85"/>
   <image href="${ASSET}d6204-silk.png" width="1545" height="400"/>`;
  if (fpgaOff(t)) { const [x,y]=PNP(8906,1319); s+=`<rect x="${x-46}" y="${y-46}" width="92" height="92" fill="#c0392b" opacity=".35"/><text x="${x}" y="${y+64}" text-anchor="middle" font-size="14" fill="#ff8a7a" font-weight="700">unconfigured</text>`; }
  if (upPhase(t)&&upPhase(t).k==='pages'){ const [x,y]=PNP(8005,1315); s+=`<rect x="${x-22}" y="${y-18}" width="44" height="36" fill="#ffb43a" opacity=".55"/>`; }
  LEDP.forEach(([k,nm,x,y,col])=>{ const [px,py]=PNP(x,y), on=L[k]; s+=`<g><title>${nm} LED ${on?'lit':'off'}</title><rect x="${px-10}" y="${py-6}" width="20" height="12" rx="2" fill="${on?col:'#2b2f2c'}" ${on?'filter="url(#d64glow)"':''}/></g>`; });
  { const [px,py]=PNP(-65,2321.9); s+=`<g class="og62-hot" data-sw="eq"><title>SW1 EQ push-button — click</title><rect class="hl" x="${px-12}" y="${py-10}" width="24" height="20" rx="3" fill="#cfcfc8" stroke="#555"/><circle cx="${px}" cy="${py}" r="5" fill="${D.eq?'#ffd23a':'#777'}"/></g>`; }
  { const [dx,dy]=PNP(3290,2064.5); s+=`<rect x="${dx-50}" y="${dy-20}" width="100" height="40" rx="2" fill="#c0392b" stroke="#6a1a12"/>`;
    for(let i=0;i<8;i++){ const x=dx-43+i*12.3, off=D.dip[i]; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW2-${i+1} ${off?'OFF':'ON'} (${['cal bit0','cal bit1','tone','unused','unused','unused','dip_switch_enabled','dashboard_enabled'][i]}) — click</title><rect x="${x-5}" y="${dy-15}" width="10" height="30" rx="1.5" fill="#f2f2ee"/><rect x="${x-3.5}" y="${off?dy+1:dy-13}" width="7" height="12" fill="#222"/><rect x="${x-6}" y="${dy-22}" width="12" height="44" fill="transparent"/></g>`; }
    s+=`<text x="${dx-50}" y="${dy+34}" font-size="11" fill="#9fd3ff">SW2 · 1 … 8 · ON ↑ ${opts.small?'':'(pin-1 end inferred)'}</text>`; }
  if (opts.labels!==false) PARTS.forEach(([r,n,x,y])=>{ const [px,py]=PNP(x,y); const hot=HOT===r; s+=`<g data-part="${r}" style="cursor:pointer"><title>${r} ${n}</title><circle cx="${px}" cy="${py}" r="${hot?20:14}" fill="${hot?'#4cc38a':'#ffd36a'}" opacity="${hot?.45:.18}"/><text x="${px}" y="${py-16}" text-anchor="middle" font-size="13" font-weight="700" fill="${hot?'#7dff6a':'#ffd36a'}" stroke="#000" stroke-width="3" paint-order="stroke">${r} ${n}</text></g>`; });
  s+=`<text x="1530" y="200" text-anchor="end" font-size="13" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">P1 edge → midplane</text><text x="16" y="392" font-size="12" fill="var(--ink2)">Front edge on the left. Gerbers D6204A-ISS4.TOP/TSM/TSS (P-CAD 2002, 9 Oct 2009); parts from D6204A-iss4.pnp</text>`;
  if (booting(t)) s+=`<text x="420" y="40" font-size="20" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">booting: ${BOOT[bootStep(t)][1].slice(0,70)}</text>`;
  return s+'</svg>'; }

/* ---------- DashBoard ---------- */
function dashHTML(t){ const k=locked(t), ro=!D.lat[1], st=(!k&&D.alarm)?['AES no lock (BIT2)','err']:['OK','ok'];
  const p=upPhase(t);
  return K.dashHTML({key:'d6204', title:`Slot ${D.slot}: ${D.brand}`, alarm:!k&&D.alarm, tree:[{name:'openGear frame'},{name:'MFC-8310',lvl:1},{name:`Slot ${D.slot}: ${D.brand}`,lvl:1,sel:true}],
    tabs:[{name:'Card Info',rows:[{type:'text',label:'Product',value:D.brand,oid:'1.5'},{type:'text',label:'Supplier',value:'www.ward-beck.com',oid:'1.2'},{type:'text',label:'AVR Software Rev',value:'2.00',oid:'1.11'},{type:'text',label:'FPGA Software Rev',value:'letter 0 · build 2 · 0.0'}],note:'FPGA rev is shifted out by shift_in16_version_out (lpm_constant0 = 2, lpm_constant1 = 0 feeds both "letter" and "version_h", lpm_constant2 = 0).'},
      {name:'Card Status',rows:[{type:'status',label:'Card Status',value:st[0],level:st[1],oid:'2.1'},{type:'status',label:'AES Input',value:k?'Locked':'Unlocked',level:k?'ok':'err',oid:'2.2'},{type:'text',label:'Upload',value:p?p.k+(p.page!=null?' page '+p.page+'/'+C.PAGES:''):'—'}],note:D.alarm?'':'Notify on Card Fault is Disabled (EEPROM default NO): 2.1 stays OK even without lock.'},
      {name:'Settings',rows:[{type:'toggle',id:'eq',label:'EQ',value:D.eq,on:'Enabled',off:'Disabled',oid:'3.2'},{type:'combo',id:'cal',label:'Calibration',value:D.cal,options:CALN.map((n,i)=>[i,n]),oid:'3.4'},{type:'toggle',id:'tone',label:'Tone Generator',value:D.tone,on:'Enabled',off:'Disabled',oid:'3.5'},{type:'combo',id:'alarm',label:'Notify on Card Fault',value:D.alarm?1:0,options:[[1,'Enabled'],[0,'Disabled']]},{type:'button',id:'save',label:'Save Settings',text:'Save',oid:'3.1'}],note:ro?'SW8 was ON at power-up: dashboard_enabled = NO, every SET_PARAM is refused.':(dipCtl()?'':'')}],
    footer:[{id:'reboot',text:'Reboot'},{id:'upload',text:'Upload AVR…'},{id:'fpga',text:'Upload FPGA…'}], foot:'V200 · '+D.image}); }
function ctlHTML(){ const sel=(x,o,v)=>`<select data-x="${x}">${o.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center"><b>AES source</b><button data-x="plug">${D.in.conn?'Unplug':'Plug in'}</button>
   cable ${sel('len',[5,150,300,450,800,1000,1200].map(v=>[v,v+' m']),D.in.len)} rate ${sel('fs',FS_LIST.map(v=>[v,v/1000+' kHz']),D.in.fs)} level ${sel('lvl',[-40,-30,-20,-18,-12,-6,0].map(v=>[v,v+' dBFS']),D.in.dbfs)} tone of ${sel('f',[100,440,1000,10000].map(v=>[v,v+' Hz']),D.in.f)}</div>
   <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px"><b>Card</b> H1 ${sel('term',[[75,'75 Ω'],[110,'110 Ω']],D.term)} RV1 ${sel('rv0',[0,130,500,1000,2000].map(v=>[v,v+' Ω']),D.rv[0])} RV2 ${sel('rv1',[0,130,500,1000,2000].map(v=>[v,v+' Ω']),D.rv[1])}
   build ${sel('brand',Object.keys(BRANDS).map(k=>[k,k]),D.brand)} FPGA file ${sel('img',[['d6204adac8416_fpga_v200.bin','…dac8416_fpga_v200.bin'],['d6204a9262_fpga_v200.bin','…9262_fpga_v200.bin']],D.image)} rear ${sel('rear',Object.keys(RM).map(k=>[k,RM[k].name]),D.rear)} DEBOUNCE_fs ${sel('fw',[['v200','as written (V200)'],['fix','polarity fixed (what-if)']],D.fw)}
   ${D.up&&D.up.ok?'<button data-x="next" class="on">Next second ▶</button>':''} <button data-x="reset">Defaults</button></div>`; }
function dipSVG(){ let s=`<svg viewBox="0 0 560 104" style="width:100%;max-width:560px"><rect x="10" y="8" width="300" height="62" rx="4" fill="#c0392b"/><text x="16" y="21" font-size="10" fill="#fff">ON ▲  SW2 219-8MS  (SW1 = PA7 … SW8 = PA0)</text>`;
  D.dip.forEach((v,i)=>{ const x=22+i*36; s+=`<g data-dip="${i}" style="cursor:pointer"><title>SW${i+1} ${v?'OFF':'ON'}</title><rect x="${x}" y="27" width="22" height="38" rx="2" fill="#f2f2ee"/><rect x="${x+3}" y="${v?47:30}" width="16" height="15" fill="#222"/><text x="${x+11}" y="83" font-size="11" text-anchor="middle" fill="var(--ink)">${i+1}</text></g>`; });
  return s+`<text x="322" y="22" font-size="10.5" fill="var(--ink2)">1+2: calibration (OFF OFF = −20, ON OFF = −18,</text><text x="322" y="35" font-size="10.5" fill="var(--ink2)">     OFF ON = −12, ON ON = Disabled) · 3: tone</text><text x="322" y="48" font-size="10.5" fill="var(--ink2)">7 OFF: DIPs set the power-up defaults</text><text x="322" y="61" font-size="10.5" fill="var(--ink2)">8 ON: DashBoard locked out · 4–6 unused</text><text x="10" y="100" font-size="10.5" fill="var(--accent)">latched: dip_switch_enabled ${D.lat[0]?'YES':'NO'}, dashboard_enabled ${D.lat[1]?'YES':'NO'} · DIP ${dipCtl()?'in control every pass':'not in control'} · DIP says ${CALK[dipCal(false)]}, tone ${dipTone(false)?'on':'off'}</text></svg>`; }
function bindAll(r){ K.bind(r,{sw:{eq:()=>A.eq()}, jack:{in:()=>A.plug()}, slot:n=>A.slot(n), dash:(id,v)=>A.dash(id,v)});
  r.querySelectorAll('[data-dip]').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.dip)));
  r.querySelectorAll('[data-part]').forEach(g=>g.addEventListener('click',()=>{ HOT=g.dataset.part; SIM.refresh(); }));
  r.querySelectorAll('[data-x]').forEach(el=>{ const x=el.dataset.x, f=()=>{ const v=el.value;
    ({plug:()=>A.plug(),len:()=>A.len(v),fs:()=>A.fs(v),lvl:()=>A.level(v),f:()=>A.freq(v),term:()=>A.term(v),rv0:()=>A.rv(0,v),rv1:()=>A.rv(1,v),brand:()=>A.brand(v),img:()=>{D.image=v; touch(); SIM.refresh();},rear:()=>A.rear(v),fw:()=>A.fw(v),next:()=>A.next(),reset:()=>A.reset()}[x]||(()=>{}))(); };
    if(el.tagName==='BUTTON') el.onclick=f; else el.onchange=f; }); }

/* ---------- timeline ---------- */
function lanes(){ const css=SIM.css, fs=D.in.fs, ls=[];
  ls.push({label:`AES in @ ${fs/1000} kHz`, h:24, draw(c,X,t0,t1,y,h){ if(!inputOk()){ c.fillStyle=css('--bad'); c.font='11px sans-serif'; c.fillText(D.in.conn?'out of reach / no signal':'unplugged',X(t0)+6,y+h/2+4); return; } if(t1-t0<400/fs) SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.4/fs,css('--accent'),'frames'); else SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,css('--warn'),'channel-status blocks'); }});
  ls.push(K.boolLane('CS8416 locked (reg 0x0C = 0)', t=>locked(t), '#2f8f46'));
  ls.push({label:'PG0 ref 500 Hz (timer0 ISR)', h:22, draw(c,X,t0,t1,y,h){ if(X(t0+C.REF)-X(t0)<1.5){ SIM.pulses(c,X,t0,t1,y,h,2*C.REF,0,C.REF,css('--accent2'),'ref high (1 ms)'); return; } c.strokeStyle=css('--accent2'); c.beginPath(); for(let k=Math.floor(t0/C.REF);k<=Math.ceil(t1/C.REF);k++){ const a=k*C.REF, hi=k%2===0; c.lineTo(X(a),hi?y+4:y+h-4); c.lineTo(X(a+C.REF),hi?y+4:y+h-4);} c.stroke(); }});
  ls.push({label:'SR_DETECT counter1 / det update', h:30, draw(c,X,t0,t1,y,h){ const top=256*fs*C.REF, sc=v=>y+h-3-(v/50000)*(h-6);
      [[15360,'60k'],[32000,'125k']].forEach(([v,l])=>{ c.strokeStyle=css('--warn'); c.setLineDash([3,3]); c.beginPath(); c.moveTo(X(t0),sc(v)); c.lineTo(X(t1),sc(v)); c.stroke(); c.setLineDash([]); });
      if (fpgaOff(t0)&&fpgaOff(t1)) return; if (X(t0+C.REF)-X(t0)>3){ c.strokeStyle=css('--accent'); c.beginPath(); for(let k=Math.floor(t0/(2*C.REF));k<=Math.ceil(t1/(2*C.REF));k++){ const a=2*k*C.REF; c.moveTo(X(a),sc(0)); c.lineTo(X(a+C.REF),sc(top)); c.lineTo(X(a+C.REF),sc(0)); } c.stroke(); }
      c.fillStyle=css('--accent2'); for(let k=Math.ceil(t0/C.DET);k*C.DET<=t1;k++) c.fillRect(X(k*C.DET+0.004)-1,y+2,2,h-4);
      c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`${Math.round(top).toLocaleString()} MCLK counts per 1 ms (dashed: 60 k / 125 k thresholds; blue = det latch every 16 ms)`,X(t0)+4,y+10); }});
  ls.push({label:'DEBOUNCE_fs fs_counter', h:22, draw(c,X,t0,t1,y,h){ const st=speedTimes(); if(!st){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('fs_flag == pfs_flag: counter idle (change the sample rate)',X(t0)+4,y+h/2+3); return; }
      c.fillStyle=css('--warn'); c.globalAlpha=.6; c.fillRect(X(st.det),y+4,X(st.app)-X(st.det),h-8); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`0 → 255 passes, then fs = ${speedOf(D.in.fs)}_SPEED`,X(st.det)+3,y+h/2+3); }});
  ls.push({label:'AK4396 mode (reg 0x01)', h:24, draw(c,X,t0,t1,y,h){ const N=240; for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*i/N; const rs=akReset(tt)||!locked(tt)||booting(tt)||fpgaOff(tt), s=speedAt(tt);
      c.fillStyle=rs?css('--bad'):!akInSpec(tt)?'#d9a21b':s==='NORMAL'?css('--accent'):s==='DOUBLE'?css('--accent2'):'#8e5bd6'; c.fillRect(X(tt),y+4,(X(t1)-X(t0))/N+0.6,h-8); }
      const tm=(t0+t1)/2; c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText((akReset(tm)||!locked(tm)?'PDN low (reset / power-down)':speedAt(tm)+' speed'+(akInSpec(tm)?'':' — out of range for '+fs/1000+' kHz')),X(t0)+4,y+h/2+3); }});
  ls.push(K.waveLane('LEFT OUT (balanced, ±1 = rails)', t=>anaOut(t,0), {h:44}));
  ['ML1 (−20, R66)','ML2 (−18, R73)','ML3 (−12, R75)'].forEach((l,i)=>ls.push(K.boolLane(l+' low = on', t=>mlLines(t)[i]===0, SIM.css('--accent2'))));
  ls.push({label:'AVR main loop (≈400 µs, inferred)', h:22, draw(c,X,t0,t1,y,h){ const B=D.bootAt; if(B!==null){ c.fillStyle=css('--warn'); c.globalAlpha=.45; c.fillRect(X(B),y+3,X(B+BOOT_T)-X(B),h-6); c.globalAlpha=1; }
      if (D.up&&D.up.ok){ const a=D.up.sec===0?D.up.at:0; c.fillStyle=css('--bad'); c.globalAlpha=.3; c.fillRect(X(a),y+3,X(1)-X(a),h-6); c.globalAlpha=1; }
      SIM.pulses(c,X,t0,t1,y,h,C.LOOP_T,0,C.LOOP_T*0.9,css('--accent'),'passes (orange = boot, red = upload)'); }});
  ls.push({label:'timer1 96 µs tick', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T1,0,C.T1*0.1,css('--ink2'),'timer1_ovf_isr'); }});
  ls.push(K.canLane(canNow()));
  ls.push(K.boolLane('Lock LED', t=>leds(t).l, '#2f8f46')); ls.push(K.boolLane('No Lock LED', t=>leds(t).n, '#c0392b')); ls.push(K.boolLane('COM Activity LED', t=>leds(t).c, '#5dbf4a'));
  return ls; }
function inspHTML(t){ const w=ctlWord(t), ml=mlLines(t), [a1,a2]=altera12(), p=upPhase(t), o0=outDbu(0,t), o1=outDbu(1,t);
  return `<table class="kv"><tr><th>Mode</th><td class="mono">${booting(t)?'boot step '+(bootStep(t)+1)+'/'+BOOT.length:p&&p.k!=='done'?'FPGA upload: '+p.k+(p.page!=null?' page '+p.page:''):'main loop'}${glitchWin(t)?' · DIP double-inversion window':''}</td></tr>
   <tr><th>ALTERA_write</th><td class="mono">data_upper ${b8(w.up)} · data_lower ${b8(w.lo)} → q15 no_lock ${w.up>>7} · q2 tone ${(w.lo>>2)&1?'off':'ON'} · q1q0 ${(w.lo&3).toString(2).padStart(2,'0')}</td></tr>
   <tr><th>FPGA → AVR</th><td class="mono">${fpgaOff(t)?'— (unconfigured)':`ALTERA1 = 0x${hx(a1)} (det96 ${a1&1}, det192 ${(a1>>1)&1}) · ALTERA2 = 0x${hx(a2)} (check 0xAA ✓)`}</td></tr>
   <tr><th>fs_flag</th><td class="mono">0b${fsFlagBits(D.in.fs).toString(2).padStart(3,'0')} (bit2 = CS8416 96KHZ) → ${speedAt(t)}_SPEED · PG4 (flash nCS) ${pg4(t)}</td></tr>
   <tr><th>CS8416</th><td class="mono">reg 0x04 = 0x${D.eq?'89':'80'} · 0x05 = 0xB0 (master, AES out) · reg 0x0C ${locked(t)?'0x00':'≠ 0'}</td></tr>
   <tr><th>AK4396</th><td class="mono">${akReset(t)||!locked(t)?'PDN low':`0x00 = 0x07 · 0x01 = ${speedAt(t)==='DOUBLE'?'0x0A':speedAt(t)==='QUAD'?'0x12':'0x02'} · 0x03/0x04 ATT = 255`}</td></tr>
   <tr><th>ML1-3 / MR1-3</th><td class="mono">${ml.join(' ')} → ${ml.every(x=>x)?'all grounded: MUTE':RSN[ml.indexOf(0)+1]+' in circuit'}</td></tr>
   <tr><th>Analog L / R</th><td class="mono">${audioGate(t)?`${o0.toFixed(1)} / ${o1.toFixed(1)} dBu${clipped(0,t)?' CLIP':''} (0 dBFS = ${fsDbu(0).toFixed(1)} dBu)`:'muted'}</td></tr></table>`; }
function viewSim(m){
  m.innerHTML=`${card('D6204A ISS4 — the real board (click the EQ button, the DIP switches or a chip)', `<div id="card"></div><div id="part" class="small" style="margin-top:6px"></div>`)}
   <div class="grid2"><div>${card('DashBoard (redrawn, generic)', `<div id="dash"></div>`)}${card('Signal, jumpers, trims and firmware', `<div id="ctl"></div><div id="dip" style="margin-top:6px"></div>`)}</div>
   <div><div class="grid2" style="grid-template-columns:1fr 1fr">${card('Card edge', `<div id="edge"></div><div class="small" style="margin-top:4px">${ART.edgeCite()}</div>`)}${card('Rear module', `<div id="rear"></div><div class="small" style="margin-top:4px">${ART.rearCite()}</div>`)}</div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
   ${card('Timeline — one second, zoomable', `<canvas id="tl"></canvas>`)}<div class="grid2">${card('Scope: AES3 frame at the input (CS8416 RXP0)', `<canvas id="scope"></canvas>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t; m.querySelector('#card').innerHTML=cardSVG(t); m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#ctl').innerHTML=ctlHTML(); m.querySelector('#dip').innerHTML=dipSVG();
    m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#trace').innerHTML=K.traceHTML(D); m.querySelector('#log').innerHTML=K.logHTML(D); m.querySelector('#insp').innerHTML=inspHTML(t);
    const pp=HOT&&PARTS.find(p=>p[0]===HOT); m.querySelector('#part').innerHTML=pp?`<b>${pp[0]} ${pp[1]}</b> — ${PARTINFO[pp[0]]||''}`:'<span class="muted">Click a highlighted part for its role.</span>';
    bindAll(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    const n=Math.floor(t*D.in.fs), v=sample(t,0); K.drawAES(m.querySelector('#scope'),{fs:D.in.fs,a:v,b:v,n,dead:!inputOk()}); };
  SIM.on('time', draw); }
const PARTINFO={U4:'AT90CAN128 at 8 MHz (X1): main loop, CAN to the frame controller, bit-bangs the CS8416 (PC1–PC3, PC6/PC7), AK4396 (PB0–PB3), FPGA shift (PB4–PB6, PG1/PG2) and the configuration flash (PD0–PD3, PG3/PG4, PC5).',
  U6:'EP1C3T100C8, project D6201A.qpf: i2s8416_aes (AES encoder for OUT 1–4), tone_gen1, SR_DETECT_192, dec2_4 (gain-switch decoder), shift_in16_version_out, shift_out.',
  U3:'CS8416 receiver, master mode (reg 0x05 = 0xB0); RXP0 = IN1, the EQ path IN1_EQ goes to a second input; reg 0x04 0x80/0x89 picks between them.',
  U16:'AK4396VFP 24-bit DAC; serial control CSN/CCLK/CDTI, PDN = RESET_4396 (PB0). MCLK from the FPGA (÷2 above 125 kHz).',
  U7:'M25P40 4-Mbit serial flash on the EPCS1 footprint (BOM). The FPGA boots from it; V200 rewrites it from DashBoard through as.c.',
  U8:'74HC4053: ML1/ML2/ML3 from the FPGA switch R66/R73/R75 between the LEFT gain stage summing node and ground.',
  U12:'74HC4053: MR1/MR2/MR3, same as U8 for the RIGHT channel (driven by the same dec2_4 outputs).',
  U9:'OP275: L+ / L− differential to single-ended with two MFB low-pass stages (R69/R65/R70/C57/C59 and R71/R68/R72/C60/C62).',
  U13:'OP275: same filter for the RIGHT channel.', U10:'NE5532: A = gain stage (−Rf/Rsel, Rf = R64 20K + RV1), B = unity inverter → balanced LEFT OUT 1 through two 30R (R63/R67).',
  U14:'NE5532: RIGHT gain stage and inverter (RV2 trim).', U11:'NE5532 followers → LEFT OUT 2 (R80/R81 30R).', U15:'NE5532 followers → RIGHT OUT 2 (R100/R101 30R).',
  U1:'EL5263: AES input buffer / equaliser stage between T1 and the CS8416.', U2:'EL5263: drives the four AES outputs (BNC3–BNC6 via R10/R12/R20/R22) from FPGA OUT1/OUT2.',
  U5:'SN65HVD233 CAN transceiver; LBK on PD4 (CAN_RX/CAN_TX macros).', REG2:'LM2676 3.3 V switcher from +12 V.', REG5:'SUW1R5-1212 isolated DC/DC: ±VA for the op-amps.'};

/* ---------- One second ---------- */
function viewSecond(m){
  m.innerHTML=`${card('One second, broken down', `<div id="lad"></div>`)}<div class="grid2">${card('Level through each stage (LEFT)', `<div id="path"></div>`)}${card('Calibration resistors', `<div id="calt"></div>`)}</div>${card('Power-up, step by step (main() in v100w.c)', `<div id="boot"></div>`)}`;
  const draw=()=>{ const fs=D.in.fs, sp=speedAt(SIM.t), t=SIM.t;
    const rows=[['AES3 frames in',fs.toLocaleString(),SIM.fmtDur(1/fs),'CS8416 RXP0 → I²S to the FPGA'],['Channel-status blocks',(fs/192).toFixed(1),SIM.fmtDur(192/fs),'i2s8416_aes block_counter 0…191'],['AES bits out (×4 BNC)',(fs*64).toLocaleString(),SIM.fmtDur(1/(fs*64)),'built from RMCK 256·fs: 4 MCLK per bit cell'],
      ['DAC samples / channel',fs.toLocaleString(),'',`AK4396 ${sp} speed`],['Tone (if on)',(fs/48).toFixed(0)+' Hz','48 samples','tone_gen1 table'],['timer0 ISR (ref toggle)','1 000','1 ms','PG0 → SR_DETECT ref (500 Hz)'],['SR_DETECT latch','62.5','16 ms','counter4 ÷ 8'],
      ['AVR loop passes','≈'+Math.round(1/C.LOOP_T).toLocaleString(),SIM.fmtDur(C.LOOP_T),inf('pass time')],['timer1 ticks','10 417','96 µs','CAN_TX_TIMER'],['CAN heartbeat','1.04','960 ms','TX_HEARTBEAT 10000'],['DEBOUNCE_fs hold','','≈'+((C.DEB+1)*C.LOOP_T*1000).toFixed(0)+' ms','256 passes'],['EQ release debounce','','≈'+(C.DEB*C.LOOP_T*1000).toFixed(0)+' ms','DEBOUNCE_PUSHBUTTONS']];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    const g=gain(0), src=srcDbfs(t), dv=C.DACFS*Math.pow(10,src/20), on=audioGate(t);
    const db=v=>20*Math.log10(v/0.7746);
    m.querySelector('#path').innerHTML=K.levelSVG([{name:'AES input (dBFS + 24)',level:src+24,note:effTone()?'tone_gen1 −20 dBFS':'programme'},{name:'AK4396 diff. out (L+ − L−)',level:on?db(dv):null,note:inf('1.98 V rms full scale')},{name:'U9 OP275 MFB filters (×1)',level:on?db(dv):null,note:'R65/R69, R68/R71'},{name:`U10A gain ×${g.toFixed(3)} (${RSN[effCal()]})`,level:on?db(dv*g):null,note:'one leg'},{name:'U10B inverter → balanced 60 Ω',level:on?outDbu(0,t):null,col:clipped(0,t)?'var(--bad)':null,note:'two legs'}],{lo:-20,hi:30,clip:26,clipLabel:'+26 dBu max (manual)',unit:'dBu'});
    m.querySelector('#calt').innerHTML=`<table class="kv"><tr><th>Setting</th><th>q1 q0</th><th>dec2_4</th><th>resistor</th><th>gain</th><th>0 dBFS</th></tr>${[1,2,3,0].map(c=>{ const gg=c?(20000+D.rv[0])/RSEL[c]:0; return `<tr class="${effCal()===c?'hl':''}"><td>${CALN[c]}</td><td class="mono">${['00','11','10','01'][c]}</td><td class="mono">${c?'out'+c+' low':'all high'}</td><td>${RSN[c]}</td><td class="mono">${c?gg.toFixed(3):'0'}</td><td class="mono">${c?(20*Math.log10(2*C.DACFS*gg/0.7746)).toFixed(1)+' dBu':'muted'}</td></tr>`; }).join('')}</table><p class="small muted">Rf = R64 20K + RV1 (${D.rv[0]} Ω). The three gains land on +24 / +22 / +16 dBu at 0 dBFS, i.e. +4 dBu at −20 / −18 / −12 dBFS.</p>`;
    let a=0; m.querySelector('#boot').innerHTML=`<table class="kv"><tr><th>#</th><th>starts</th><th>takes</th><th>what</th></tr>${BOOT.map((b,i)=>{ const r=`<tr class="${bootStep(t)===i?'hl':''}"><td>${i+1}</td><td class="mono">${(a*1000).toFixed(0)} ms</td><td class="mono">${(b[0]*1000).toFixed(0)} ms</td><td class="small">${b[1]}</td></tr>`; a+=b[0]; return r; }).join('')}</table><p class="small muted">Total ≈ ${(BOOT_T*1000).toFixed(0)} ms ${inf('wait() timing')}. Press Reboot in the DashBoard to watch it on the timeline.</p>`; };
  SIM.on('time', draw); }

/* ---------- Block diagram (from the netlist and D6204-FUNCTIONAL.pdf) ---------- */
const BLOCKS={ rin:{x:10,y:30,w:160,h:84,t:'AES IN (BNC1)',s:['T1 PE-65612','H1 75 Ω / 110 Ω','U1 EL5263 + EQ net'],d:'BNC1_SIG → C19 → T1 (PE-65612) → H1 jumper (R30 75R / R33 110) → U1 EL5263. Two nets reach the CS8416: IN1 and IN1_EQ (R30/C29/R11). Functional drawing: "EQ ON/OFF", "75 110".',src:'D6204Aiss4.net, D6204-FUNCTIONAL.pdf'},
  rx:{x:210,y:30,w:150,h:84,t:'U3 CS8416',s:['reg 0x04: 0x80 / 0x89','master, RMCK 256·fs','0x0B 96KHZ, 0x0C errors'],d:'Receiver. PROCESS_MODES rewrites reg 0x04 every pass (0x80 = IN1, 0x89 = IN1_EQ). Lock from reg 0x0C, rate flag from reg 0x0B bit 0.',src:'cs84xx.c, D6204A.c'},
  fpga:{x:400,y:20,w:200,h:150,t:'U6 EP1C3T100',s:['i2s8416_aes → OUT1/OUT2','tone_gen1 (ext_sel)','SR_DETECT_192 (ref = PG0)','dec2_4 → ML1-3 / MR1-3','shift regs ↔ AVR'],d:'D6201A.bdf (copied from the D6201 DA): the AES output is re-encoded from the CS8416 I²S using MCLK; tone_gen1 replaces it when q2 = 0; SR_DETECT counts MCLK per 1 ms of the AVR ref; dec2_4 turns the calibration bits into one active gain resistor, or none when no_lock.',src:'D6201A.bdf, *.vhd'},
  aes:{x:650,y:20,w:150,h:70,t:'U2 EL5263 → AES OUT 1–4',s:['BNC3–BNC6, 75 Ω'],d:'OUT1 and OUT2 pins carry the same aes1 signal; U2 fans it out to four BNCs. Held low when no_lock ("off").',src:'D6201A.bdf, D6204Aiss4.net'},
  flash:{x:650,y:110,w:150,h:70,t:'U7 M25P40',s:['EPCS1 footprint','AS config + as.c'],d:'Configuration flash. nCS on PG4 is shared with the AVR (as.c) — and with the DOUBLE/QUAD code in DEBOUNCE_fs.',src:'BOM, common.h, v100w.c'},
  dac:{x:400,y:210,w:150,h:76,t:'U16 AK4396',s:['reg 0x01 DFS speed','PDN = PB0'],d:'24-bit DAC. REFRESH_AK4396: 0x00 = 0x07, 0x01 = 0x02 / 0x0A / 0x12, 0x02 = 0x00, 0x03/0x04 = 255. Held in power-down without lock.',src:'AK4396.c'},
  filt:{x:580,y:210,w:150,h:76,t:'U9/U13 OP275',s:['diff → single, ×1','2 × MFB low-pass'],d:'L+ and L− → stage A (R69, R65, R70, C57, C59; L− halved by R76/R79) → stage B (R71, R68, R72, C60, C62). Net gain +1.',src:'D6204Aiss4.net'},
  gain:{x:760,y:210,w:150,h:76,t:'U8/U12 + U10A/U14A',s:['74HC4053 gain select','Rf 20K + RV1/RV2'],d:'Inverting stage whose input resistor is chosen by the FPGA: R66 6K49 (−20), R73 8K06 (−18), R75 16K2 (−12). With none selected the output is silent.',src:'D6204Aiss4.net, dec2_4.vhd'},
  out:{x:760,y:320,w:150,h:76,t:'Balanced outs ×2 pairs',s:['U10B/U14B invert','U11/U15 followers, 30R'],d:'LEFT 1 = AES3P/N, LEFT 2 = AES7P/N, RIGHT 1 = AES4P/N, RIGHT 2 = AES8P/N on P1 (the rear-module pin names are generic). 2 × 30R = 60 Ω balanced.',src:'D6204Aiss4.net, D6204-T6302.pdf'},
  mcu:{x:210,y:210,w:150,h:120,t:'U4 AT90CAN128',s:['v100w.c main loop','CAN.c / Dashboard.c','as.c FPGA loader','DIP SW2, EQ SW1, LEDs'],d:'Reads lock and rate, runs DEBOUNCE_fs, writes the 16-bit control word, answers DashBoard, rewrites the configuration flash (V200).',src:'v100w.c and friends'},
  can:{x:10,y:240,w:160,h:70,t:'U5 CAN → frame',s:['1 Mbit/s, OGP','DashBoard via MFC'],d:'SN65HVD233 to the openGear midplane (P2 CANH/CANL).',src:'D6204Aiss4.net'} };
const WIRES=[['rin','rx','IN1 / IN1_EQ'],['rx','fpga','I²S + RMCK'],['fpga','aes','aes1'],['fpga','dac','BICK LRCK SDATA'],['dac','filt','L± R±'],['filt','gain',''],['gain','out',''],['fpga','gain','ML/MR'],['mcu','fpga','FPGA0-5'],['mcu','dac','CSN CCLK CDTI'],['mcu','rx','SPI'],['mcu','flash','AS pins'],['flash','fpga','config'],['can','mcu','CAND/CANR']];

/* ---------- Schematics (redrawn from net names) ---------- */
const SHEETS=[
 {name:'1 · Analog out (LEFT)', h:520, note:'Redrawn from D6204Aiss4.net. RIGHT is the same with U13/U12/U14/U15, R84–R101, RV2. Values from D6204A-iss4.bom.', svg:()=>{ const t=(x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" fill="${(o&&o.c)||'var(--ink)'}" ${o&&o.a?`text-anchor="${o.a}"`:''}>${s}</text>`, ln=(a,b,c,d)=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="var(--ink)"/>`, R=(x,y,l,v,vert)=>vert?`<rect x="${x-5}" y="${y}" width="10" height="34" fill="none" stroke="var(--ink)"/>${t(x+9,y+14,l,{fs:10})}${t(x+9,y+26,v,{fs:10,c:'var(--accent2)'})}`:`<rect x="${x}" y="${y-5}" width="34" height="10" fill="none" stroke="var(--ink)"/>${t(x,y-9,l,{fs:10})}${t(x,y+18,v,{fs:10,c:'var(--accent2)'})}`, op=(x,y,l)=>`<path d="M${x} ${y-26} L${x} ${y+26} L${x+46} ${y} Z" fill="var(--panel2)" stroke="var(--ink)"/>${t(x+4,y-8,'−',{fs:12})}${t(x+4,y+16,'+',{fs:12})}${t(x+2,y+42,l,{fs:10})}`;
   const ml=mlLines(SIM.t); let s=t(20,30,'U16 AK4396',{fs:13})+t(20,48,'L+ (pin 23)',{})+t(20,98,'L− (pin 22)',{});
   s+=ln(90,44,120,44)+R(120,44,'R69','10K')+ln(154,44,180,44)+ln(180,44,180,70)+`<line x1="180" y1="70" x2="180" y2="90" stroke="var(--ink)"/>`+t(150,128,'C57 1n→G',{fs:9})+ln(180,44,200,44)+R(200,44,'R70','3K32')+ln(234,44,250,44)+op(250,58,'U9A OP275');
   s+=ln(90,94,120,94)+R(120,94,'R76','10K')+ln(154,94,170,94)+t(150,140,'R79 10K→G',{fs:9})+ln(170,94,200,94)+R(200,94,'R77','3K32')+ln(234,94,240,94)+ln(240,94,240,70)+ln(240,70,250,70);
   s+=ln(296,58,320,58)+ln(320,58,320,12)+ln(320,12,180,12)+ln(180,12,180,44)+t(230,24,'R65 10K / C59 220p',{fs:9})+ln(320,58,340,58)+R(340,58,'R71','10K')+ln(374,58,420,58)+R(420,58,'R72','3K32')+ln(454,58,470,58)+op(470,72,'U9B OP275')+t(372,96,'C60 1n→G',{fs:9});
   s+=ln(516,72,540,72)+ln(540,72,540,20)+ln(540,20,374,20)+t(430,16,'R68 10K / C62 220p',{fs:9})+ln(540,72,560,72)+t(560,64,'NET00104 = L+ − L−',{fs:10,c:'var(--accent2)'});
   [[1,'R66 6K49','C56','ML1'],[2,'R73 8K06','C61','ML2'],[3,'R75 16K2','C63','ML3']].forEach(([k,r,c,nm],i)=>{ const y=150+i*70, on=ml[i]===0;
     s+=ln(560,72,560,y)+ln(560,y,580,y)+R(580,y,r.split(' ')[0],r.split(' ')[1])+ln(614,y,640,y)+t(616,y-8,c,{fs:9})+`<circle cx="660" cy="${y}" r="3" fill="var(--ink)"/>`+`<line x1="660" y1="${y}" x2="${on?700:690}" y2="${on?y:y+22}" stroke="${on?'var(--accent)':'var(--bad)'}" stroke-width="2.5"/>`+ln(640,y,660,y)+t(668,y-10,`U8 ${nm} = ${ml[i]}`,{fs:10,c:on?'var(--accent)':'var(--bad)'})+t(686,y+34,'GND',{fs:9})+ln(700,y,740,y)+ln(740,y,740,420); });
   s+=t(734,436,'NET00054 summing node',{fs:10,c:'var(--accent2)',a:'end'})+ln(740,420,760,420)+op(760,434,'U10A NE5532')+ln(760,446,750,446)+t(722,462,'+ → G',{fs:9})+ln(806,434,830,434)+ln(830,434,830,380)+ln(830,380,790,380)+R(756,380,'R64+RV1','20K+'+D.rv[0]+'Ω')+ln(756,380,740,380)+ln(740,380,740,420);
   s+=ln(830,434,840,434)+t(20,400,'U10A out → R63 30R → AES3N; U10B ×−1 → R67 30R → AES3P (LEFT 1)',{fs:10})+t(20,416,'U11 followers → R80/R81 30R → AES7N/P (LEFT 2)',{fs:10});
   return s+t(20,450,`Gain = (20K + RV1) / R(selected) · now ${CALN[effCal()]} → ${gain(0).toFixed(3)}`,{fs:12,c:'var(--accent)'})+t(20,468,'ML low = 74HC4053 channel X0 = resistor into the summing node; high = resistor to ground.',{fs:10,c:'var(--ink2)'}); }},
 {name:'2 · AVR pins', h:520, note:'AT90CAN128 TQFP64 pins from D6204Aiss4.net, port names from D6204A.h, altera.h, cs84xx.h, AK4396.h, common.h.', svg:()=>K.chip(330,40,200,'U4 AT90CAN128',[['2 PE0','LOCK1 → L2'],['3 PE1','NO_LOCK1 → L3'],['4 PE2','SW1 (EQ)'],['5 PE3','EQ1 → L4'],['6 PE4','COM_ACTIVITY → L5'],['7 PE5','ERROR → L6'],['8 PE6','N_STATUS'],['9 PE7','MSEL0'],['10 PB0','RESET_4396'],['11 PB1','CDTI'],['12 PB2','CCLK'],['13 PB3','CSN'],['14 PB4','FPGA4 clock'],['15 PB5','FPGA3 data in'],['16 PB6','FPGA2 strobe'],['19 PG4','NCS (flash)'],['18 PG3','CONF_DATA'],['24/23','X1 8 MHz'],['44-51 PA7-0','SW2-1…8']],[['25 PD0','N_CONFIG'],['26 PD1','DCLK'],['27 PD2','ASDI'],['28 PD3','CONF_DONE'],['29 PD4','LBK (CAN)'],['30 PD5','CAND'],['31 PD6','CANR'],['33 PG0','FPGA5 ref 500 Hz'],['34 PG1','FPGA1 status in'],['43 PG2','FPGA0 version in'],['35 PC0','ALTERA_RESET'],['36 PC1','CS8416_OUT'],['37 PC2','CS8416_CLK'],['38 PC3','CS8416_IN'],['40 PC5','NCE'],['41 PC6','CS8416_SEL1'],['42 PC7','CS8416_RESET1'],['61 PF0','AN_SLOTID'],['60/59 PF1/2','AN_BMID / BMID2']],'ICCAVR 7.15 · V100.mak')},
 {name:'3 · FPGA top level', h:520, note:'Extracted from D6201A.bdf (V200): every wire followed to its symbol port. Pins from D6201A.qsf.', svg:()=>K.chip(330,40,210,'U6 EP1C3T100C8 (D6201A.bdf)',[['U5_SDATA/SCLK/LRCLK','i2s8416_aes in'],['U5_MCLK 97','SR_DETECT + AES clock'],['FPGA5 88','SR_DETECT ref'],['FPGA3 4','shift_in16 data'],['FPGA4 5','shift clock'],['FPGA2 3','strobe'],['U5_GPO1 99','(unused)'],['TMR_IN/OCCA','(unused)']],[['OUT1 75 / OUT2 74','aes1 (same)'],['BICK 25','sclk_out'],['LRCK 23','lrclk_out'],['SDATA 24','audio_out'],['MCLK_4396 26','mclk or ÷2'],['ML1/MR1 27/22','dec2_4 out1'],['ML2/MR2 28/21','dec2_4 out2'],['ML3/MR3 29/20','dec2_4 out3'],['FPGA1 87','shift_out (det bits)'],['FPGA0 86','version out'],['TP3-5','GND']],'q0,q1 → dec2_4 · q2 → NOT → ext_sel · q15 → no_lock · q13/q14 "tone_aes/tone_analog" unconnected')},
 {name:'4 · Config flash', h:420, note:'AS chain from D6204Aiss4.net and common.h; commands from as.h.', svg:()=>K.chip(120,60,170,'U4 AT90CAN128',[],[['PD0','N_CONFIG'],['PD1','DCLK'],['PD2','ASDI'],['PG3','CONF_DATA'],['PG4','NCS'],['PC5','NCE'],['PD3','CONF_DONE'],['PE6','N_STATUS']])+K.chip(560,60,160,'U7 M25P40 (EPCS1 footprint)',[['1 S','NCS'],['2 Q','CONF_DATA'],['5 D','ASDI'],['6 C','DCLK']],[],'also wired to U6 and header H2')+`<text x="40" y="330" font-size="11" fill="var(--ink)">as.c: AS_WRITE_ENABLE 0x06 · AS_ERASE_BULK 0xC7 · AS_PAGE_PROGRAM 0x02 · AS_READ_BYTES 0x03 · AS_READ_STATUS 0x05</text><text x="40" y="350" font-size="11" fill="var(--ink2)">asProgramStart: nCONFIG low, nCE high, nCS high · asProgramDone: pins back to inputs, nCE low, nCONFIG released</text><text x="40" y="370" font-size="11" fill="var(--warn)">DEBOUNCE_fs also writes PORTG bit 4 (= NCS) for DOUBLE / QUAD speed.</text>`}];

/* ---------- Software tab ---------- */
function viewSoft(m){ m.innerHTML=`<div class="grid2">${card('Main loop (v100w.c while(1)) — running step lit', `<div id="flow"></div>`)}${card('DEBOUNCE_fs decision table', `<div id="dfs"></div>`)}</div>
   <div class="grid2">${card('Control word AVR → FPGA (ALTERA_write → shift_in16_version_out)', `<div id="cw"></div>`)}${card('Status word FPGA → AVR (shift_out p0…p15)', `<div id="sw"></div>`)}</div>
   <div class="grid2">${card('FPGA upload state machine (V200)', `<div id="up"></div>`)}${card('How the controls did things', `<ol class="small"><li><b>EQ</b> (SW1 or OID 3.2) → eq1_active → CS8416 reg 0x04 0x80/0x89 every pass → EQ LED. Not saved.</li><li><b>Calibration</b> (OID 3.4, or DIP 1–2) → data_lower[1:0] → dec2_4 → one 74HC4053 switch per channel → R66/R73/R75 → analog gain. “Disabled” mutes the analog outputs.</li><li><b>Tone</b> (OID 3.5 or DIP 3) → data_lower bit2 → ext_sel → tone_gen1 on all outputs.</li><li><b>Sample rate</b> → SR_DETECT_192 + CS8416 0x0B → fs_flag → DEBOUNCE_fs → AK4396 reg 0x01.</li><li><b>Lock</b> → reg 0x0C → REFRESH_LEDS (LEDs, AK4396 power-down) and data_upper bit7 → FPGA mutes AES + analog.</li><li><b>Upload FPGA</b> → START_UPGRADE → asMain (erase) → UPGRADE_PAGE × N → asProg/asVerify → VERIFY → asProgramDone.</li></ol>`)}</div>`;
  const draw=()=>{ const t=SIM.t, p=upPhase(t), parked=p&&p.k==='pages', boot=booting(t);
    const st=['WDR · Astatus = INVERT_DATA(CS8416_READ_LOCK_ALL())','if (ALTERA2 == 0xAA) fs_flag = ALTERA1 & 3; CS8416_READ_SAMPLE_RATE → bit2','DEBOUNCE_fs()','PROCESS_EQ_PUSHBUTTONS · PROCESS_MODES (CS8416 reg 0x04)','READ_DIP_SWITCHES · REFRESH_LEDS','ALTERA_write() (+ version read)','CAN_FUNCTIONS (asMain when alteraProgReady)','if (save_settings) SAVE_INFORMATION_EEPROM'];
    const k=Math.floor(((t%C.LOOP_T)/C.LOOP_T)*st.length);
    m.querySelector('#flow').innerHTML=`<svg viewBox="0 0 560 ${st.length*36+46}" style="width:100%">${boot?`<text x="10" y="18" font-size="12" fill="var(--warn)">boot: ${K.svgT(BOOT[bootStep(t)][1]).slice(0,80)}</text>`:parked?`<text x="10" y="18" font-size="12" fill="var(--warn)">alteraProgStart == YES: only LOCK+NO LOCK on, then CAN_FUNCTIONS</text>`:`<text x="10" y="18" font-size="12" fill="var(--ink2)">pass ≈ ${C.LOOP_T*1e6} µs (inferred)</text>`}
      ${st.map((s,j)=>{ const on=!boot&&(parked? j>=6&&j===6 : j===k); return `<rect x="10" y="${28+j*36}" width="540" height="28" rx="6" fill="${on?(parked?'var(--warn)':'var(--accent)'):'var(--panel2)'}" stroke="var(--line)" opacity="${parked&&j<6?.4:1}"/><text x="20" y="${47+j*36}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${s}</text>`; }).join('')}</svg>`;
    const cur=fsFlagBits(D.in.fs);
    m.querySelector('#dfs').innerHTML=`<table class="kv"><tr><th>fs</th><th>bit2 CS8416 ≥88.1k</th><th>bit1 det192</th><th>bit0 det96</th><th>V200 as written</th><th>intended</th><th>AK4396 range</th></tr>${FS_LIST.map(fs=>{ const f=flags(fs); const sv=(fw)=>{ const o=D.fw; D.fw=fw; const r=speedOf(fs); D.fw=o; return r; }; const a=sv('v200'), b=sv('fix'); const ok=s=>s==='NORMAL'?fs<=54000:s==='DOUBLE'?fs<=108000&&fs>54000:fs>108000;
      return `<tr class="${fs===D.in.fs?'hl':''}"><td class="mono">${fs/1000}k</td><td>${+f.cs96}</td><td>${+f.det192}</td><td>${+f.det96}</td><td style="color:${ok(a)?'var(--ink)':'var(--bad)'}">${a}</td><td>${b}</td><td class="small">${ok(a)?'ok':'out of range'}</td></tr>`; }).join('')}</table>
      <p class="small">v100w.c line 260: <span class="mono">if (fs_flag &amp; BIT2) fs = NORMAL_SPEED;</span> replaces the commented-out <span class="mono">if (CS8416_READ_SAMPLE_RATE() == 0)</span>. The polarity flipped: every rate ≥ 88.1 kHz is forced to NORMAL, below that det96 is 0 — so V107/V200 never leave normal speed. Current fs_flag = 0b${cur.toString(2).padStart(3,'0')}. AK4396 ranges ${inf('AK4396 data sheet; only the eval-board guide is in the archive')}. The scanned V200 test outline lists “Check Sample Rates: 32, 44.1, 48, 96, 192 kHz” but its boxes are not ticked.</p>`;
    const w=ctlWord(t), bits=(v,names)=>`<tr>${names.map((n,i)=>`<td class="mono small" style="text-align:center;background:${(v>>(7-i))&1?'color-mix(in srgb,var(--accent) 25%,transparent)':'transparent'}">${n}<br>${(v>>(7-i))&1}</td>`).join('')}</tr>`;
    m.querySelector('#cw').innerHTML=`<table class="kv">${bits(w.up,['q15 no_lock','q14 tone_analog*','q13 tone_aes*','q12','q11','q10','q9','q8'])}${bits(w.lo,['q7 dip8','q6 dip7','q5 dip6','q4 dip5','q3 dip4','q2 dip3→tone','q1 dip2','q0 dip1'])}</table><p class="small muted">Sent MSB first with write_data() on PB5/PB4, latched by STROBE_WRITE (PB6). * labelled in D6201A.bdf but not connected: separate AES/analog tone was planned, never wired. Names "dip1…dip8" are from the D6201 DA this FPGA was copied from.</p>`;
    const [a1,a2]=altera12();
    m.querySelector('#sw').innerHTML=`<table class="kv"><tr><th>ALTERA1</th><td class="mono">0x${hx(a1)} = p7…p0: 1 0 1 0 · det192_125 ${(a1>>3)&1} · det96_60 ${(a1>>2)&1} · det192 ${(a1>>1)&1} · det96 ${a1&1}</td></tr><tr><th>ALTERA2</th><td class="mono">0x${hx(a2)} = p15…p8 tied VCC/GND → the “FPGA alive” check</td></tr><tr><th>ALTERA3/4</th><td class="mono">version shifted out on FPGA0: letter 0 · build 2 · 0 · 0 → setFPGASoftwareRevision; 0x00 0x00 ⇒ fpga_firmware_check = ERROR (OID 2.1 BIT3)</td></tr></table><p class="small muted">write_data() assembles the reply LSB-first (data_in &gt;&gt;= 1, bit7 = PG1) while write_data_read_firmware() assembles MSB-first from PG2 — two opposite bit orders in one transfer.</p>`;
    const ph=[['START_UPGRADE (type 1)','compat: build 2 in range, productName == file product','CAN_UPGRADE_WAIT 0x0BB8'],['asMain: asInit, asProgramStart, asBulkErase','FPGA unconfigured, audio gone, Lock LED still follows the CS8416','≈3 s '+inf('erase time')],['START_UPGRADE again','alteraEraseComplete → alteraProgStart = YES','LOCK + NO LOCK lit'],[`UPGRADE_PAGE × ${C.PAGES}`,'asProg + asVerify, ≤ 4 tries (no re-erase, so retries rarely help)',`${(C.PAGES*C.PAGE).toFixed(1)} s ${inf('page time')}`],['VERIFY_UPGRADE','file CRC → asProgramDone → nCONFIG released','FPGA reloads, audio back']];
    const pk=p?p.k:null, idx={start:0,reject:0,erase:1,pages:3,config:4,done:4}[pk];
    m.querySelector('#up').innerHTML=`<svg viewBox="0 0 560 ${ph.length*58+10}" style="width:100%">${ph.map((r,j)=>`<rect x="8" y="${6+j*58}" width="544" height="50" rx="7" fill="${j===idx?'var(--warn)':'var(--panel2)'}" stroke="var(--line)"/><text x="18" y="${24+j*58}" font-size="12" font-weight="700" fill="${j===idx?'#111':'var(--ink)'}">${r[0]}</text><text x="18" y="${40+j*58}" font-size="10.5" fill="${j===idx?'#111':'var(--ink2)'}">${K.svgT(r[1])} · ${K.svgT(r[2])}</text>`).join('')}</svg><p class="small muted">${D.up?(D.up.ok?`Upload running: ${SIM.fmtDur(Math.max(0,upEl(t)||0))} after START_UPGRADE.`:'Last upload refused: CAN_INVALID_PRODUCT.'):'Press Upload FPGA… in the DashBoard (Simulator tab). With the build set to D6204A it is refused.'}</p>`; };
  SIM.on('time', draw); }

/* ---------- Tutorial (D6204A Manual.doc) ---------- */
const TUT={i:0};
const LESSONS=[
  {title:'Meet the D6204A', body:'<p>From the manual: the D6204A converts one AES/EBU input to <b>stereo analog</b> (two balanced pairs on the T6302A) and passes the AES signal on to four outputs. The card edge has <b>Lock</b> (green), <b>No Lock</b> (red), <b>EQ</b> (yellow), <b>COM Activity</b> (green) and <b>Error</b> (red), and the <b>EQ switch SW1</b>.</p><p>Fit it in an even slot with a T6302A (one card, two slots) or any slot with a T6402A (two cards).</p>', check:()=>true, auto:true},
  {title:'1 · Connect the AES input', body:'<p>Unplug the AES input on the rear (position 1): <b>No Lock</b> lights and both analog pairs go silent. Plug it back in: <b>Lock</b> returns.</p>', check:()=>D.log.some(l=>/Plug in AES/.test(l.name))&&locked(SIM.t), hint:'Click AES IN on the rear module twice.'},
  {title:'2 · Long cable: insert the EQ', body:'<p>The test outline specifies 300 m without EQ and 1000 m with EQ (75 Ω). Set the cable to <b>800 m</b>: No Lock. Press <b>SW1</b> (card edge or board): the yellow EQ LED lights and the input locks.</p>', check:()=>D.in.len>=800&&D.eq&&locked(SIM.t), hint:'cable 800 m, then the EQ switch.'},
  {title:'3 · Choose the calibration', body:'<p>DashBoard → Settings → <b>Calibration</b>. “−20 dBFS = +4 dBu” is the default (0 dBFS = +24 dBu). Pick <b>−18 dBFS = +4 dBu</b> and watch ML2 go low on the timeline: the FPGA has swapped R66 for R73 in the gain stage.</p>', check:()=>effCal()===2, hint:'Settings → Calibration → −18 dBFS.'},
  {title:'4 · Line-up tone', body:'<p>Enable the <b>Tone Generator</b>: a −20 dBFS, 48-sample sine (1 kHz at 48 kHz) replaces the programme on every AES and analog output.</p>', check:()=>effTone(), hint:'Settings → Tone Generator.'},
  {title:'5 · Save', body:'<p>Press <b>Save</b>. Calibration, tone and the alarm setting go to EEPROM. Note that EQ is not among them: after a reboot the EQ is always off.</p>', check:()=>D.saved, hint:'Settings → Save.'},
  {title:'6 · DIP switches', body:'<p>No DIP table in the manual; this one comes from the code. Turn <b>SW8 ON</b> (DashBoard lock-out) and <b>Reboot</b>. Now the DashBoard refuses changes and DIP 1–3 set calibration and tone live.</p>', check:()=>!D.lat[1], hint:'click DIP 8, then DashBoard → Reboot.'},
  {title:'7 · 96 kHz source', body:'<p>The manual promises “all sampling frequencies up to 192 kHz”. Set the source to <b>96 kHz</b> and look at the AK4396 lane: the V200 code leaves the DAC in normal speed. Switch DEBOUNCE_fs to “polarity fixed” to see the DOUBLE speed switch the code was meant to make.</p>', check:()=>D.in.fs===96000, hint:'rate → 96 kHz.'},
  {title:'8 · New FPGA image', body:'<p>Set the build to <b>DAC-8416</b> (a Ross-branded card) and press <b>Upload FPGA…</b>. The AVR erases the configuration flash itself; press <b>Next second ▶</b> a few times to follow it. With the build set to D6204A the upload is refused: no D6204A-named FPGA file exists.</p>', check:()=>!!(D.up&&D.up.ok), hint:'build DAC-8416, then Upload FPGA….'},
  {title:'Done', body:'<p>See <b>Findings</b> for the #PROBLEM folder answer, the sample-rate bug and the other leftovers.</p>', check:()=>true, auto:true}];
function viewTut(m){ window.__d6204Active=false; K.tutorialView(m,{D,st:TUT,title:'Tutorial — operating the D6204A (from D6204A Manual.doc and the V200 code)',L:LESSONS,
  side:()=>card('The card', `<div id="tcard"></div><div class="grid2" style="grid-template-columns:1fr 1fr;margin-top:6px"><div id="te"></div><div id="tr2"></div></div><div id="tc" style="margin:8px 0"></div><div id="tdp"></div><div id="td"></div>`),
  bindSide:r=>{ const t=SIM.t; r.querySelector('#tcard').innerHTML=cardSVG(t,{labels:false,small:true}); r.querySelector('#te').innerHTML=edgeSVG(t); r.querySelector('#tr2').innerHTML=rearSVG(t); r.querySelector('#tc').innerHTML=ctlHTML(); r.querySelector('#tdp').innerHTML=dipSVG(); r.querySelector('#td').innerHTML=dashHTML(t); bindAll(r); }, reset:A.reset}); }

/* ---------- Findings ---------- */
const FINDINGS=[
  `<b>Artwork 2026|59: card edge and rear modules now from the CorelDRAW files.</b> Card edge: ${SIM.src('#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR/D6204/D6204 - #Engineering/D6204 - #Functional/D6204-card-edge.cdr')} (2007-12-12|40; identical copies in both #Functional folders; the ejector reads D6204A). T6302A and T6402A: ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6204A - rear module options.cdr')} (2012-01-09|45). Assets: <span class="mono">assets/d6204-*.svg</span>; LEDs, SW1 and the connectors sit on the drawing's coordinates.`,
  `<b>“AES OUT34” on the T6302A.</b> Position 4 of the 2012 guide reads “AES OUT3” followed by a stray “4” in a separate text run, so it shows as “AES OUT34”. The model treats position 4 as AES OUT 3.`,
  `<b>An unbuilt DFR-8310 module.</b> ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/T6XXX/D6204Terms.cdr')} (2008-04-08|41) also draws a T6202A “REAR MODULE For DFR8310” (single card, BNC + Phoenix). It is in neither 2012 guide and is not modelled.`,
  `<b>The “#PROBLEM”: which copy is authoritative.</b> <span class="mono">D6204/D6204 - #Engineering/</span> holds the project twice. Mapping folder to folder (<span class="mono">D6204A/Software/atmel/v200</span> ↔ <span class="mono">D6204 - #atmel/D6204 - #altera #Bootloader #v200</span>, and so on), <span class="mono">diff -rq</span> finds no file that differs and no file that exists only in <span class="mono">D6204A/</span>. The hashtag tree adds the files needed to build: <span class="mono">Ross Video/</span> headers, both prebuilt <span class="mono">*_fpga_v200.bin</span>, <span class="mono">D6201A.qpf</span> (v101), <span class="mono">shift_out.vhd</span>, the bootloader <span class="mono">common/</span> sources and the obsolete zips. <b>Authoritative: the hashtag tree</b> (<span class="mono">D6204 - #Software / #Functional / #PCB</span>). <span class="mono">D6204A/</span> is a redundant subset. The series-level <span class="mono">D6204A  #Engineering #TIM #PCB</span> is a third partial copy (same functional files byte for byte, empty software folders), but it is the only home of <span class="mono">D6204A Manual.doc</span>. At the top of the #PROBLEM folder, <span class="mono">D6204A-ISS4 - #Gerbers.zip</span> (twice) equals <span class="mono">GERBERS/D6204A-ISS4.zip</span> (MD5 4f0e2b42…), the assembly PDF equals <span class="mono">#PCB/D6204Aiss4-ASSY.pdf</span>, and the two “different” <span class="mono">ISSUE 4 FINAL BOM.xlsx</span> files differ only in zip timestamps (identical contents).`,
  `<b>V200 never switches the DAC to double or quad speed.</b> <span class="mono">v100w.c DEBOUNCE_fs()</span>: <span class="mono">if (fs_flag &amp; BIT2) fs = NORMAL_SPEED;</span>. Bit 2 is set from <span class="mono">CS8416_READ_SAMPLE_RATE()</span>, i.e. CS8416 register 0Bh bit 0 “96KHZ” = 1 at ≥ 88.1 kHz (CS8416_F3.pdf). The commented-out V103 code tested <span class="mono">== 0</span>. So at 88.2–192 kHz the AK4396 stays in normal speed (reg 0x01 = 0x02), outside its normal-speed range ${inf('AK4396 data sheet ranges')}, and below 88.1 kHz det96 is 0 anyway. The same line is in V107. The manual claims 192 kHz; the spec sheet says 96 kHz; the V200 test outline’s sample-rate boxes are blank.`,
  `<b>“Calibration: Disabled” mutes the analog outputs.</b> DashBoard and DIP 1+2 ON both offer it. <span class="mono">dec2_4.vhd</span>: “00 = reserved not used”; out4 is unconnected in <span class="mono">D6201A.bdf</span>, so ML1–3/MR1–3 all stay high and every gain resistor is switched to ground. AES outputs are unaffected.`,
  `<b>Calibration is an analog gain switch, not DSP.</b> Netlist: the FPGA’s ML1/ML2/ML3 (pins 27–29) drive U8 74HC4053, which puts R66 6K49, R73 8K06 or R75 16K2 into the U10A summing node (Rf = R64 20K + RV1 2K trim). Gains 3.10 / 2.50 / 1.24 give +24 / +22 / +16 dBu at 0 dBFS, i.e. +4 dBu at −20 / −18 / −12 dBFS. The same lines mute on no-lock (dec2_4 <span class="mono">mute</span> = data_upper bit7). The sibling D6204A docs plugin modelled this as FPGA gain; the netlist corrects that.`,
  `<b>DIP switch map, worked out from the netlist.</b> SW2 pin 16…9 → R40…R47 → PA7…PA0, then <span class="mono">MIRROR()</span>: SW1 → bit0 … SW8 → bit7. Result: SW1/SW2 = calibration, SW3 = tone, SW7 OFF = DIPs set power-up defaults (<span class="mono">dip_switch_enabled</span>), SW8 ON = DashBoard locked out. SW4–SW6 are unused. Note the polarity: the switch is “enabled” when it is <i>OFF</i>. The manual has no DIP section at all.`,
  `<b>Double inversion at boot.</b> With SW7 OFF and SW8 ON, <span class="mono">main()</span> inverts <span class="mono">dip_switches</span>, sets calibration/tone, then calls <span class="mono">ALTERA_write()</span>, which inverts them again and recomputes. For about 1 ms (<span class="mono">wait(1000)</span> + <span class="mono">REFRESH_AK4396</span>) the FPGA gets the opposite settings, typically tone ON with calibration Disabled, until the first loop pass re-reads the switches.`,
  `<b>DEBOUNCE_fs toggles the flash chip-select.</b> DOUBLE speed does <span class="mono">PORTG &amp;= ~BIT4</span> and QUAD does <span class="mono">PORTG |= BIT4</span>. On this board PG4 (pin 19) is <span class="mono">NCS</span> of U7, the configuration flash (common.h <span class="mono">NCSPIN (1&lt;&lt;PORTG4)</span>). It is leftover from a board where PG4 selected something else. NORMAL never restores it. Because of the bug above, this code is dead in V200.`,
  `<b>No D6204A-branded FPGA load exists.</b> The CAN upload checks <span class="mono">productName</span> (16 bytes) against the .bin header. The archive holds only <span class="mono">d6204adac8416_fpga_v200.bin</span> (product “DAC-8416”) and <span class="mono">d6204a9262_fpga_v200.bin</span> (“9262”). <span class="mono">d6204a.bat</span> exists but its output does not, so a Ward-Beck-named card answers CAN_INVALID_PRODUCT. The two bins differ only in 15 header bytes. The DAC-8416 one is compatible with build 2.00–2.255 and the 9262 one with 2.00–255.255. <span class="mono">ztcpack.txt</span> in the FPGA folder still says “configuration file for D6202A” and lists ADA-8401-B / 9252, the A/D card’s OEM names.`,
  `<b>The “compatibility” check compares the AVR software build, not the board issue.</b> <span class="mono">CAN.c</span> compares <span class="mono">SOFTWARE_BUILD 2 / SOFTWARE_MAJOR 0 / SOFTWARE_VERSION 0</span> with file bytes 20–23. The board issue (<span class="mono">BOARD_ISSUE 1</span> in D6204A.h, though the PCB is ISS4) is never used.`,
  `<b>EPCS1 that is really an M25P40.</b> The BOM fits <span class="mono">M25P40-VMN6P</span> (4 Mbit) on footprint <span class="mono">EPCS1</span>; <span class="mono">D6201A.cdf</span> targets an EPCS1. as.h defines silicon IDs but as.c never reads them; it bulk-erases whatever is there. The page retry loop (up to 4 × <span class="mono">asProg</span> + <span class="mono">asVerify</span>) cannot fix a bad page without an erase.`,
  `<b>EQ is not remembered.</b> <span class="mono">SAVE_INFORMATION_EEPROM</span> stores addresses 11 (alarm), 13 (calibration) and 14 (tone) only, with comments “how the voiceover is mixed” and “dim level1” copied from another product. eq1_active always starts NO.`,
  `<b>The Error LED never lights.</b> <span class="mono">COM_ERROR_LED_ON</span> is never called in V200 (only <span class="mono">_OFF</span>). The manual says it shows CAN errors. Meanwhile <span class="mono">DATA_INITIALIZATION()</span> lights the <i>Lock</i> LED for the whole ≈${(BOOT_T*1000).toFixed(0)} ms boot.`,
  `<b>Card Status hides no-lock by default.</b> OID 2.1 reports BIT2 (no lock) and BIT3 (FPGA version 00 00) only when <span class="mono">smpte_alarm_enabled</span>, which defaults to NO. The variable name comes from a video card.`,
  `<b>Leftovers from the DA and multi-input products.</b> <span class="mono">v100w.c/D6204A.c</span> define <span class="mono">MODE1–MODE6</span> “OUT1 = IN1 … REF2”; the FPGA project is <span class="mono">D6201A.qpf</span> (created 8 Nov 2006, Quartus 5.1) with control bits named dip1–dip8; cs84xx.h maps CS8416 #2–#8 chip-selects onto PD4 (the CAN loop-back pin) and the LED port. The P-CAD BOM title line reads <b>D6203A</b> although the file is <span class="mono">D6204A-iss4.pcb</span>. <span class="mono">shift_in16_version_out</span>’s “letter” and “version_h” are fed by the same <span class="mono">lpm_constant1</span>. bdf labels <span class="mono">tone_aes</span>/<span class="mono">tone_analog</span> (q13/q14) go nowhere.`,
  `<b>Misnamed folders.</b> The AVR sources sit in “D6204 - #altera #Bootloader #v107/#v200”. <span class="mono">as.h</span> in that folder has a PORTA pin map, which would clash with the DIP switches, but it is commented out; the live map is in common.h. CAN.c includes it as <span class="mono">"AlteraActiveSerialDriver/as.h"</span>, a path not in the archive.`,
  `<b>Manual vs specs vs code.</b> Manual: 30–192 kHz, +26 dBu max, THD 0.01 %, “refer to the subsequent chapter for menu descriptions” (no such chapter), and the figure caption “Rear Module Installation (UDC-8225 not shown)” from the template. Spec sheet: 30–96 kHz, 0.005 %, “Stereo Separation better than 105 dBu” (dB).`,
];
const ASSUME=['Main-loop pass ≈ 400 µs '+inf('bit-bang count; no timer in the loop'),'wait(n) ≈ n µs '+inf('D6203A code comment'),'CS8416 lock 20 ms '+inf(''),'AK4396 full scale 1.98 V rms differential, NE5532 swing ±10.5 V '+inf('chosen so the CAL −20 resistors give +24 dBu'),'Flash erase ≈ the 3 s CAN_UPGRADE_WAIT, 25 ms per page, 118 pages, 0.1 s reconfiguration '+inf(''),'DIP pin-1 end on the board drawing '+inf('pnp rotation only'),'Cable reach from the generic openGear test outline '+inf('not a D6204A measurement')];
const SOURCES=[AVR+'v100w.c, D6204A.c/.h, AK4396.c, cs84xx.c, altera.c, CAN.c, Dashboard.c, as.c, common.h, *_ztcpack.txt',FPG+'D6201A.bdf/.qsf, SR_DETECT_192.vhd, dec2_4.vhd, tone_gen1.vhd, i2s8416_aes.vhd, shift_*.vhd, lpm_constant*.vhd, *.bat, ztcpack.txt, *_fpga_v200.bin',PCB+'D6204Aiss4.net, D6204A-iss4.bom, D6204A-iss4.pnp, GERBERS/D6204A-ISS4.TOP/.TSM/.TSS',ENG+'D6204 - #Functional/ (functional, card edge, T6302/T6402, specs)',ROOT+'D6204A - #Master/D6204A - #TESTREPORT/D6204A-V200-26MAR10.pdf','#OPENGEAR #SERIES/D6204A  #Engineering #TIM #PCB/D6204A Manual.doc','XXX - ENGINEERING - 2016 RD FILES/RD80-Amplifier Project/Parts/CS8416_F3.pdf'];
function viewFindings(m){ window.__d6204Active=false; m.innerHTML=card('What the D6204A and its folders are up to', `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:7px">${f}</li>`).join('')}</ol>`)+card('Assumptions (marked inferred on screen)', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`)+card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${s}</li>`).join('')}</ul>`); }

SIM.register({ id:'d6204', product:'D6204', name:'D6204 · AES-to-analog D/A converter, openGear (2008|41)', year:2008,
  folder:'#OPENGEAR #SERIES/D6204 - #PROBLEM #OPENGEAR', family:'openGear',
  summary:'The D6204A turns one 75 Ω AES3 input into two balanced stereo analog pairs and four AES outputs (Ross DAC-8416 / Cobalt 9262). This model runs the V200 AVR firmware and the D6201A-derived FPGA, on the real ISS4 board drawn from its Gerbers. It also settles which of the duplicated #PROBLEM folders is authoritative.',
  highlights:['ISS4 card from the Gerbers, with clickable EQ and DIP switches','Calibration traced to a 74HC4053 gain switch','DEBOUNCE_fs polarity bug: DAC stuck in normal speed','V200 FPGA self-upload, step by step','#PROBLEM answer: the hashtag tree is authoritative'],
  depth:'Full model', duration:1,
  init(){ touch(); },
  stepUnits:[{label:'1 AES frame',period:()=>1/D.in.fs},{label:'1 loop pass',period:()=>C.LOOP_T},{label:'1 ms (timer0)',period:()=>1e-3},{label:'16 ms (SR latch)',period:()=>C.DET}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms'],[0.004,'4 ms'],[0.0004,'400 µs'],[0.00005,'50 µs']], defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:m=>{ window.__d6204Active=false; viewSim(m); }},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:m=>K.blockView(m,{blocks:BLOCKS,wires:WIRES,w:930,h:410,sel:'gain'})},
    {id:'schematic',label:'Schematics',render:m=>{ K.schemView(m,{product:'D6204A ISS4',sheets:SHEETS,foot:'REDRAWN from D6204Aiss4.net, D6204A-iss4.bom, D6201A.bdf/.qsf and the AVR headers. Not the original P-CAD schematic.'}); }},
    {id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});
})();
