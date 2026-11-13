/* =====================================================================
   AVS — AVS24 12 × 2 audio/video routing switcher platform (Ward-Beck Systems, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html). Full model: the AVS24 main board,
   its Altera CPLD at gate level (from the compiler's own equations) and the PIC firmware that drives it.

   The AVS is the common electronics of the RAV24 (audio + video) and RA24 (audio only) switchers:
   one Tango-PCB panel holds AVS-24-1 (main board), AVS-24-2 (17-button switch board) and AVS-24-3
   (rear terminal-block board). The RAV24 and RA24 plugins (rav-24.js, ra24.js) model those two
   products from the operator's side; this plugin models the board they share.

   Sources used (folder #AV #SERIES/XXX - AVS - #OBSOLETE #Archive/):
   - avs24.rpt (MAX+plus II 9.6, compiled 11/02/2006): device EPM7128SLC84-6, the EQUATIONS section
       (|LPM_SHIFTREG:1|dffs0..35, |LPM_LATCH:29| sw1..17, |LPM_LATCH:70| X1..36, node :76 = _LC055) — simulated gate by gate
   - AVS24.GDF / AVS24TT.GDF (net and annotation names AX0-n, AX1-n, RX0, RX1, VX0..4-1/-2, "shifts on pos edge"),
       AVS24.ACF, AVS24TT.ACF (board pin map, CHIP avs24tt), avs24tt.rpt (Oct 2005, "No fit"), AVS24.SCF, AVS24.HIF, AVS24.WAS
   - PCB/AVS24-2.PCB (Tango-PCB PLUS ASCII, ISSUE.2, June 2000) → assets/avs-pcb.svg (redrawn from the file's LINE/PAD/VIA/ARC/TEXT records),
       PCB/AVS24.PCB, RAV24ISS.PCB, Avs24-3.*, Avs24-4.* (revision history), AVS24RER.BAK (1999 rear-panel DWG, read with libredwg)
   - RAV24-AVS FUNCTIONAL DIAGRAM.cdr (Sept 2003) → assets/avs-functional.svg (Inkscape)
   - RAV24/V101/ravv101.asm (Tim Clarke, June 23 2000, PIC16C73A): INIT, MAIN, led_output, sft_out, switch_ctrl, do_audio1/2,
       sw_vid_1/2, erase_aud1/2, switch_output (ARM / vid_count / force), translate_uart (0xCF frames), DELAY
   - RAV24/V101/remv102.asm (remote panel), RAV24/V100/OLD/AVS1V100.ASM + AVSTEST*.ASM (1998 bring-up code)
   - RAV24/RAV24ISS3.DSN, RAV24ISS4.DSN (OrCAD part names), Custom Rav24 Dec 21/RAV24MANCUSTOM.WPD (manual + specs),
       RAV24V1.c + RAV24 Control Interface Feb 29 04.html (Rabbit web page)
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
/* ---------- shared helper kit (inlined; the same code appears in each of these plugin files) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
function card(t,b,cls){ return `<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`; }
const ASSET = 'siumulation-plugins/assets/';
const dbu2v = d => 0.7746*Math.pow(10,d/20);           // dBu -> V rms
const v2dbu = v => v>1e-9 ? 20*Math.log10(v/0.7746) : -200;
const sgn = x => (x>=0?'+':'') ;
const fdb = (d,n) => d<-150 ? '−∞' : (d>=0?'+':'−')+Math.abs(d).toFixed(n==null?1:n);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
function bnc(x,y,plugged,cls,title,r){ r=r||46;
  return `<g class="${cls||''}" style="${cls?'cursor:pointer':''}">${title?`<title>${title}</title>`:''}<circle cx="${x}" cy="${y}" r="${r}" fill="#b9a25a" stroke="#6e5d22" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r*0.64}" fill="#e2d3a0"/><circle cx="${x}" cy="${y}" r="${r*0.22}" fill="#7a5f12"/>
    ${plugged?`<circle cx="${x}" cy="${y}" r="${r*0.9}" fill="#2b5f9e" opacity=".9"/><circle cx="${x}" cy="${y}" r="${r*0.4}" fill="#3a74b8"/>`:''}</g>`; }
function phx(x,y,plugged,cls,title){   // 3-pin 3.81 mm Phoenix header, centre (x,y)
  return `<g class="${cls||''}" style="${cls?'cursor:pointer':''}">${title?`<title>${title}</title>`:''}<rect x="${x-50}" y="${y-28}" width="100" height="56" rx="4" fill="#26a356" stroke="#0e5d2b" stroke-width="2"/>${[-30,0,30].map(d=>`<rect x="${x+d-11}" y="${y-14}" width="22" height="28" fill="#0e4d25"/>`).join('')}
    ${plugged?`<rect x="${x-46}" y="${y-24}" width="92" height="22" fill="#2b5f9e" opacity=".85"/>`:''}</g>`; }
/* ---- action log: every user action logs the circuit path it exercises ---- */
function makeActor(D, getSummary){
  return function act(name, fn){
    const trace=[]; const tr=s=>trace.push(s);
    fn(tr);
    D.log.unshift({t:SIM.t, name, trace, sum:getSummary?getSummary():''}); if (D.log.length>60) D.log.length=60;
    SIM.refresh();
  };
}
function traceHTML(D, hint){ return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : `<div class="muted">${hint||'Use a control. The circuit path it exercises is listed here.'}</div>`; }
function logHTML(D){ return D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span>${e.sum?' → '+e.sum:''}</div>`).join('') || '<div class="muted">No actions yet.</div>'; }
function textLane(label, fn, h){ return {label, h:h||22, draw(c,X,t0,t1,y,hh){ c.fillStyle=SIM.css('--ink2'); c.font='11px '+SIM.css('--mono'); c.fillText(fn(t0,t1), X(t0)+6, y+hh/2+4); }}; }
function boolLane(label, fn, color, h){ return {label, h:h||20, draw(c,X,t0,t1,y,hh){ const N=Math.min(800,Math.max(60,(X(t1)-X(t0))/2)), span=t1-t0; c.fillStyle=color||SIM.css('--accent');
  for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; if (fn(tt)) c.fillRect(X(t0+span*i/N), y+4, (X(t1)-X(t0))/N+0.6, hh-8); } }}; }

/* ---- tutorial engine ---- */
function tutorialView(m, T){
  // T: {lessons, unitHTML(), bind(root), reset(), flag, getIdx(), setIdx(i), D}
  m.innerHTML = `<div class="grid2"><div>${card(T.title, `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="unit"></div>`)}${card('What the circuit did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw=()=>{
    m.querySelector('#unit').innerHTML = T.unitHTML(); T.bind(m.querySelector('#unit'));
    m.querySelector('#trace').innerHTML = traceHTML(T.D);
    const idx=T.getIdx(), L=T.lessons;
    m.querySelector('#lessons').innerHTML = L.map((l,i)=>`<li style="cursor:pointer;${i===idx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<idx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ T.setIdx(+li.dataset.i); draw(); });
    const le=L[idx], ok=le.check();
    m.querySelector('#lesson').innerHTML = `<h2>${le.title}</h2>${le.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(le.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(le.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${idx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${idx<L.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory state)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ T.setIdx(Math.max(0,idx-1)); draw(); };
    m.querySelector('#nxt').onclick=()=>{ T.setIdx(Math.min(L.length-1,idx+1)); draw(); };
    m.querySelector('#rs').onclick=()=>{ T.reset(); T.setIdx(0); draw(); };
  };
  SIM.on('time', draw);
}

/* ---- block diagram engine ---- */
function blockView(m, BLOCKS, WIRES, first, vb, side){
  let sel=first;
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${side||''}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 ${vb[0]} ${vb[1]}" style="width:100%"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${(b.s||[]).map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---- schematic sheets (redrawn, net-label style) ---- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
/* schematic symbols */
function res(x1,y1,x2,y2,lbl,val){ const mx=(x1+x2)/2,my=(y1+y2)/2, hz=y1===y2; const L=hz?Math.abs(x2-x1):Math.abs(y2-y1), z=Math.min(36,L*0.6);
  let p; if(hz){ const a=mx-z/2; p=`M${x1} ${y1}H${a}`+[...Array(6)].map((_,i)=>`L${a+z*(i+.5)/6} ${y1+(i%2?6:-6)}`).join('')+`L${a+z} ${y1}H${x2}`; }
  else { const a=my-z/2; p=`M${x1} ${y1}V${a}`+[...Array(6)].map((_,i)=>`L${x1+(i%2?6:-6)} ${a+z*(i+.5)/6}`).join('')+`L${x1} ${a+z}V${y2}`; }
  return `<path d="${p}" fill="none" stroke="var(--ink)"/>`+(lbl?`<text x="${hz?mx:x1+10}" y="${hz?y1-10:my-4}" font-size="10" ${hz?'text-anchor="middle"':''} fill="var(--ink)">${lbl}</text><text x="${hz?mx:x1+10}" y="${hz?y1+18:my+9}" font-size="10" ${hz?'text-anchor="middle"':''} fill="var(--ink2)">${val||''}</text>`:''); }
function cap(x1,y1,x2,y2,lbl,val){ const hz=y1===y2, mx=(x1+x2)/2, my=(y1+y2)/2;
  return hz? `<path d="M${x1} ${y1}H${mx-4}M${mx+4} ${y1}H${x2}M${mx-4} ${y1-10}v20M${mx+4} ${y1-10}v20" stroke="var(--ink)" fill="none"/><text x="${mx}" y="${y1-14}" font-size="10" text-anchor="middle" fill="var(--ink)">${lbl||''}</text><text x="${mx}" y="${y1+22}" font-size="10" text-anchor="middle" fill="var(--ink2)">${val||''}</text>`
            : `<path d="M${x1} ${y1}V${my-4}M${x1} ${my+4}V${y2}M${x1-10} ${my-4}h20M${x1-10} ${my+4}h20" stroke="var(--ink)" fill="none"/><text x="${x1+14}" y="${my}" font-size="10" fill="var(--ink)">${lbl||''}</text><text x="${x1+14}" y="${my+11}" font-size="10" fill="var(--ink2)">${val||''}</text>`; }
function opamp(x,y,name,flip){ // inputs at left (x, y-12 '-' / y+12 '+'), output at (x+60,y)
  return `<path d="M${x} ${y-30}L${x+60} ${y}L${x} ${y+30}Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+5}" y="${y-8}" font-size="13" fill="var(--ink)">${flip?'+':'−'}</text><text x="${x+5}" y="${y+18}" font-size="12" fill="var(--ink)">${flip?'−':'+'}</text><text x="${x+20}" y="${y+44}" font-size="10" fill="var(--ink2)">${name}</text>`; }
function gnd(x,y){ return `<path d="M${x} ${y}v8M${x-9} ${y+8}h18M${x-6} ${y+12}h12M${x-3} ${y+16}h6" stroke="var(--ink)" fill="none"/>`; }
function wire(pts){ return `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--ink)"/>`; }
function dot(x,y){ return `<circle cx="${x}" cy="${y}" r="3" fill="var(--ink)"/>`; }
function net(x,y,t,anchor){ return `<text x="${x}" y="${y+4}" font-size="10.5" ${anchor?`text-anchor="${anchor}"`:''} fill="var(--accent2)">${t}</text>`; }
function txt(x,y,t,sz,col,anchor){ return `<text x="${x}" y="${y}" font-size="${sz||11}" ${anchor?`text-anchor="${anchor}"`:''} fill="${col||'var(--ink)'}">${t}</text>`; }
function schemView(m, SHEETS, prod, srcNote){
  let i=0;
  m.innerHTML = card('Schematic set (redrawn from the archive — not the original CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">${srcNote}</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">${prod} · sheet ${i+1}/${SHEETS.length} · REDRAWN 2026|59, not the original CAD</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML = SHEETS[i].note;
  };
  draw();
}
/* ---- signal-path flow strip (software tab for hardware products): highlight a stage ---- */
function flowSVG(stages, hot){
  const w=Math.max(120, Math.floor(900/stages.length)-8);
  let s=`<svg viewBox="0 0 ${stages.length*(w+12)+10} 116" style="width:100%"><defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  stages.forEach((st,i)=>{ const x=6+i*(w+12), on=i===hot, bad=st.bad;
    s+=`<g data-st="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="${w}" height="96" rx="7" fill="${bad?'var(--bad)':on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="${x+8}" y="26" font-size="11.5" font-weight="700" fill="${on||bad?'#fff':'var(--ink)'}">${st.t}</text>
      ${(st.s||[]).map((l,k)=>`<text x="${x+8}" y="${44+k*14}" font-size="10" fill="${on||bad?'#eef':'var(--ink2)'}">${l}</text>`).join('')}</g>`;
    if (i<stages.length-1) s+=`<line x1="${x+w}" y1="56" x2="${x+w+11}" y2="56" stroke="var(--ink2)" marker-end="url(#fa)"/>`; });
  return s+'</svg>';
}
/* keyboard helper */
function bindKeys(flag, mapFn){ document.addEventListener('keydown', e=>{ if (!window[flag] || (e.target.matches && e.target.matches('input,select,textarea'))) return; const f=mapFn()[e.key.toLowerCase()]; if (f){ f(); e.preventDefault(); } }); }
function pbtn(x,y,s,lit,col,cls,title,data,cap){
  const on = lit>0.01, f = on ? `fill="${col}" ${lit>0.6?'filter="url(#glowfront)"':''} opacity="${0.35+0.65*lit}"` : `fill="${cap||'#3a3d42'}"`;
  return `<g class="${cls||''}" ${data||''} style="cursor:pointer"><title>${title||''}</title><rect x="${x-s/2-5}" y="${y-s/2-5}" width="${s+10}" height="${s+10}" rx="5" fill="#0b0c0d" stroke="#2c2f33" stroke-width="2"/>
    <rect x="${x-s/2}" y="${y-s/2}" width="${s}" height="${s}" rx="4" ${f}/><rect x="${x-s/2+4}" y="${y-s/2+3}" width="${s-8}" height="${s*0.25}" rx="2" fill="#fff" opacity=".12"/></g>`;
}
/* rotary knob, frac 0..1 = fully CCW..CW (300° travel) */
function kvt(rows){ return `<table class="kv">${rows.map(r=>`<tr><th>${r[0]}</th><td${r[2]?' class="mono"':''}>${r[1]}</td></tr>`).join('')}</table>`; }
function tbl(head, rows, small){ return `<table class="kv ${small?'small':''}"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }
/* main-loop / state diagram: steps laid out in a ring-like row with the running step highlighted */
function loopSVG(steps, hot, title){
  const n=steps.length, cols=Math.min(n, 5), rows=Math.ceil(n/cols), bw=170, bh=62, gx=22, gy=34, W=cols*(bw+gx)+30, H=rows*(bh+gy)+40;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%"><defs><marker id="la" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  if (title) s+=`<text x="10" y="16" font-size="12" fill="var(--ink2)">${title}</text>`;
  steps.forEach((st,i)=>{ const r=Math.floor(i/cols), cc=r%2? cols-1-(i%cols) : i%cols, x=15+cc*(bw+gx), y=26+r*(bh+gy), on=i===hot;
    s+=`<g data-step="${i}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="${x+8}" y="${y+18}" font-size="11.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}" font-family="var(--mono)">${st.t}</text>
      ${(st.s||[]).map((l,k)=>`<text x="${x+8}" y="${y+34+k*13}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${l}</text>`).join('')}</g>`;
    if (i<n-1){ const r2=Math.floor((i+1)/cols), c2=r2%2? cols-1-((i+1)%cols) : (i+1)%cols, x2=15+c2*(bw+gx), y2=26+r2*(bh+gy);
      if (r2===r) s+=`<line x1="${cc<c2?x+bw:x}" y1="${y+bh/2}" x2="${cc<c2?x2:x2+bw}" y2="${y2+bh/2}" stroke="var(--ink2)" marker-end="url(#la)"/>`;
      else s+=`<line x1="${x+bw/2}" y1="${y+bh}" x2="${x2+bw/2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#la)"/>`; }
  });
  const last=n-1, rl=Math.floor(last/cols), cl=rl%2? cols-1-(last%cols) : last%cols;
  s+=`<path d="M${15+cl*(bw+gx)+bw/2} ${26+rl*(bh+gy)+bh} v14 H8 V${26+bh/2} H15" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3" marker-end="url(#la)"/>`;
  return s+'</svg>';
}
/* pin header / connector drawn as a pin table */
function pinRow(x,y,pins,pitch,lab){ let s=''; pins.forEach((p,i)=>{ const xx=x+i*pitch; s+=`<rect x="${xx-7}" y="${y-7}" width="14" height="14" fill="#d4af37" stroke="#7a5f12"/><text x="${xx}" y="${y-12}" text-anchor="middle" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${xx}" y="${y+22}" text-anchor="middle" font-size="9" fill="var(--accent2)">${p[1]||''}</text>`; }); return s+(lab?`<text x="${x-14}" y="${y+4}" text-anchor="end" font-size="11" font-weight="700" fill="var(--ink)">${lab}</text>`:''); }
/* ---------- end of kit ---------- */
/* =====================================================================
   AVS model
   ===================================================================== */
const PREFIX='avs';
/* ---------------- PIC timing (ravv101.asm) ---------------- */
const FOSC = 4.9152e6;                       // inferred: INIT sets SPBRG = 7, BRGH = 0 → Fosc/(64·8) = 9600 baud
const TCY = 4/FOSC;
// [routine, instruction cycles in a pass where something is switched] — counted from the listing; DELAY2 is never reloaded → 256 outer loops
const ROUT = [['re_init',14],['input',46],['debounce',26],['led_ctrl',42],['switch_ctrl',120],['chirp',30],['led_output',406],['switch_output',410],['recieve_uart',9],['translate_uart',12],['transmit_uart',9],['delay',256*31]];
const OFF = {}; { let a=0; ROUT.forEach(r=>{ OFF[r[0]]=a; a+=r[1]; }); }
const PASS = ROUT.reduce((a,r)=>a+r[1],0)*TCY;   // ≈ 7.5 ms
const B_COUNT=3, VID_NUM=4, CHIRP_PERIOD=0x17, CHIRP_DUTY=3;
const STD = { NTSC:{field:1001/60000, H:1001/15750000, vbi:21, vs:3}, PAL:{field:0.02, H:64e-6, vbi:25, vs:2.5} };
const LM_W = 230e-6;                          // inferred: LM1881 vertical-output pulse width (typical, datasheet); rising edge is the CPLD clock
/* ---------------- firmware tables (ravv101.asm, verbatim) ---------------- */
const AST=[0,0x81,0x82,0x83,0x84,0x41,0x42,0x43,0x44,0x21,0x22,0x23,0x24];   // audio_set_table
const A1T=[0,0x40,0x10,0x04,0x01], A2T=[0,0xC0,0x30,0x0C,0x03];           // audio1_table (bus 1), audio2_table (bus 2)
const V1T1=[0,0xED,0xEF,0xED,0xEF,0xF5,0xF7,0xF5,0xF7,0xFC,0xFE,0xFC,0xFE], V1T2=[0,0x70,0x70,0xF0,0xF0,0x70,0x70,0xF0,0xF0,0x70,0x70,0xF0,0xF0];
const V2T1=[0,0xDF,0xDF,0xDF,0xDF,0xFF,0xFF,0xFF,0xFF,0xFB,0xFB,0xFB,0xFB], V2T2=[0,0xC0,0xE0,0xD0,0xF0,0x80,0xA0,0x90,0xB0,0xC0,0xE0,0xD0,0xF0];
const hx2=v=>'0x'+v.toString(16).toUpperCase().padStart(2,'0'), b8=v=>v.toString(2).padStart(8,'0');
function mkFW(){ return { sw:[0x40,0x00,0x00,0x8D,0x4F], e1:[0x3F,0xFF,0xFF], e2:[0xFF,0xFF,0xFF], a:[1,1] }; }   // INIT (second write of switch_4/5)
const RX0=f=>(f.sw[3]>>6)&1, RX1=f=>(f.sw[3]>>7)&1;
function setRX(f,r0,r1){ f.sw[3]=(f.sw[3]&0x3F)|(r0<<6)|(r1<<7); }
function progBus(f,bus,src,tr){ const c=AST[src], g=c&0x80?0:c&0x40?1:2, v=(bus===1?A1T:A2T)[c&0x0F]; f.sw[g]|=v; const e=bus===1?f.e1:f.e2; e[0]=e[1]=e[2]=0xFF; e[g]=(~v)&0xFF;
  tr&&tr(`${bus===1?'no_erase1':'no_erase2'}: audio_set_table[${src}] = ${hx2(c)} → switch_${g+1} |= audio${bus}_table[${c&15}] = ${hx2(v)}; erase${bus}_${g+1} = ${hx2(e[g])} (input ${src} → bus ${bus})`); }
function eraseBus(f,bus,tr){ const e=bus===1?f.e1:f.e2; for(let i=0;i<3;i++) f.sw[i]&=e[i]; tr&&tr(`erase_aud${bus}: switch_1..3 &= erase${bus}_1..3 (${e.map(hx2).join(' ')}) — the old source leaves bus ${bus}`); }
/* do_audio1 / do_audio2, ported branch for branch */
function doAudio(f,o,src,tr){ f.a[o]=src; const same=f.a[0]===f.a[1], r0=RX0(f), r1=RX1(f);
  tr&&tr(`do_audio${o+1}: check_aud${o+1} = ${src}; audio regs of OUT1 ${same?'==':'!='} OUT2 · RX0 (switch_4,6) = ${r0}, RX1 (switch_4,7) = ${r1}`);
  if(o===0){
    if(same){ if(r0){ if(r1){ eraseBus(f,2,tr); setRX(f,0,1); tr&&tr('setup_check1 → setup_2: RX0 = 0, RX1 = 1 — both outputs now listen to bus 1'); } else tr&&tr('setup_check1: already sharing — return'); }
      else if(!r1){ eraseBus(f,1,tr); setRX(f,1,0); tr&&tr('setup_1: RX0 = 1, RX1 = 0 — OUT1 borrows bus 2 (an input can sit on only one bus)'); } else tr&&tr('RX1 already set — return'); return; }
    if(r0){ if(r1){ tr&&tr('test_switch1 → nxt_audio1_chck → switch2_okay (outputs swapped: OUT1 lives on bus 2)'); eraseBus(f,2,tr); progBus(f,2,src,tr); }
            else { setRX(f,0,0); tr&&tr('nxt_audio1_chck: OUT1 was borrowing bus 2 → RX0 = RX1 = 0'); progBus(f,1,src,tr); } }
    else if(r1){ setRX(f,1,1); tr&&tr('switch2_setup: OUT2 was borrowing bus 1 → keep it there, put OUT1 on bus 2: RX0 = RX1 = 1 (swapped)'); progBus(f,2,src,tr); }
    else { tr&&tr('switch1_okay'); eraseBus(f,1,tr); progBus(f,1,src,tr); }
  } else {
    if(same){ if(r1){ if(r0){ eraseBus(f,1,tr); setRX(f,1,0); tr&&tr('setup_check2 → setup_1: RX0 = 1, RX1 = 0 — both outputs listen to bus 2'); } else tr&&tr('setup_check2: already sharing — return'); }
      else if(!r0){ eraseBus(f,2,tr); setRX(f,0,1); tr&&tr('setup_2: RX0 = 0, RX1 = 1 — OUT2 borrows bus 1'); } else tr&&tr('RX0 already set — return'); return; }
    if(r1){ if(r0){ tr&&tr('test_switch2 → nxt_audio2_chck → switch1_okay (swapped: OUT2 lives on bus 1)'); eraseBus(f,1,tr); progBus(f,1,src,tr); }
            else { setRX(f,0,0); tr&&tr('nxt_audio2_chck: OUT2 was borrowing bus 1 → RX0 = RX1 = 0'); progBus(f,2,src,tr); } }
    else if(r0){ setRX(f,1,1); tr&&tr('switch1_setup: OUT1 was borrowing bus 2 → keep it, put OUT2 on bus 1: RX0 = RX1 = 1 (swapped)'); progBus(f,1,src,tr); }
    else { tr&&tr('switch2_okay'); eraseBus(f,2,tr); progBus(f,2,src,tr); }
  } }
function swVid(f,o,src,tr){
  if(o===0){ f.sw[3]|=0x1B; f.sw[4]|=0x80; f.sw[3]&=V1T1[src]; f.sw[4]&=V1T2[src]; tr&&tr(`sw_vid_1: bsf switch_4,0/1/3/4 + switch_5,7 (all off), then andwf video1_table1[${src}] = ${hx2(V1T1[src])}, video1_table2[${src}] = ${hx2(V1T2[src])}; bsf vid_flag,0`); }
  else { f.sw[3]|=0x24; f.sw[4]|=0x70; f.sw[3]&=V2T1[src]; f.sw[4]&=V2T2[src]; tr&&tr(`sw_vid_2: bsf switch_4,2/5 + switch_5,4/5/6, then andwf video2_table1[${src}] = ${hx2(V2T1[src])}, video2_table2[${src}] = ${hx2(V2T2[src])}; bsf vid_flag,0`); } }
/* ---------------- 36-bit words ---------------- */
// bit k of a word = the k-th bit shifted (MSB first); after 36 clocks it sits in dffs k and drives sw(k+1) / X(k+1)
function bytesToWord(by){ const w=[]; for(let i=0;i<5;i++) for(let b=7;b>=(i<4?0:4);b--) w.push((by[i]>>b)&1); return w; }
const swWord = f => bytesToWord(f.sw);
/* LED registers (1 = off, 0 = on): led_1 = AUDIO VIDEO A/V OUT1 OUT2 S1 S2 S3, led_2 = S4..S11, led_3 bit 7 = S12; led_4/led_5 = 0xFF */
function ledBytes(st, chirp){ const x=st.xpt[st.out]; const on=new Set();
  if(st.mode==='audio'){ on.add(x.a); if(chirp) on.add(x.v); } else if(st.mode==='video'){ on.add(x.v); if(chirp) on.add(x.a); } else { on.add(x.v); if(chirp) on.add(x.a); }
  const L=Array(17).fill(1); L[{audio:0,video:1,av:2}[st.mode]]=0; L[3+st.out]=0; on.forEach(s=>L[4+s]=0);
  const by=[0,0,0,0xFF,0xFF]; for(let k=0;k<17;k++) if(L[k]) by[k>>3]|=0x80>>(k&7); by[2]|=0x7F; return by; }
const ledWord = (st,chirp) => bytesToWord(ledBytes(st,chirp));
const chirpAt = m => (((m%(CHIRP_PERIOD+CHIRP_DUTY))+CHIRP_PERIOD+CHIRP_DUTY)%(CHIRP_PERIOD+CHIRP_DUTY))>=CHIRP_PERIOD;
/* X-line meaning (firmware bit → CPLD output), GDF annotation names in brackets */
function xName(k){ // k = 1..36
  if(k<=24){ const n=Math.floor((k-1)/2)+1; return k%2 ? `AX1-${n} (in ${n} addr B)` : `AX0-${n} (in ${n} addr A)`; }
  return {25:'RX1 (OUT2 ← bus 1)',26:'RX0 (OUT1 ← bus 2)',27:'OUT2 /EN 1–4',28:'OUT1 /EN 1–4',29:'OUT1 /EN 5–8',30:'OUT2 /EN 9–12',31:'OUT1 A0',32:'OUT1 /EN 9–12',33:'OUT1 A1',34:'OUT2 /EN 5–8',35:'OUT2 A0',36:'OUT2 A1'}[k]; }
function xReg(k){ const i=Math.floor((k-1)/8), b=7-((k-1)%8); return `switch_${i+1},${b}`; }
function decodeX(X){ // X: array[36] of 0/1 (X1 = X[0])
  const x=k=>X[k-1];
  const bus={1:[],2:[]}, bad=[];
  for(let n=1;n<=12;n++){ const c=x(2*n-1)*2+x(2*n); if(c===1) bus[1].push(n); else if(c===3) bus[2].push(n); else if(c===2) bad.push(n); }
  const r0=x(26), r1=x(25);
  const vdec=(en,a0,a1)=>{ const act=en.map((e,i)=>e?i:-1).filter(i=>i>=0); if(!act.length) return {src:0,txt:'no chip enabled (black)'}; if(act.length>1) return {src:-1,txt:'bus contention: '+act.length+' HA4314 enabled'}; return {src:act[0]*4+a0+2*a1+1, g:act[0], txt:''}; };
  const v1=vdec([!x(28),!x(29),!x(32)],x(31),x(33)), v2=vdec([!x(27),!x(34),!x(30)],x(35),x(36));
  const pick=b=>bus[b].length===1?bus[b][0]:bus[b].length?-1:0;
  return { bus, bad, r0, r1, a1: pick(r0?2:1), a2: pick(r1?1:2), v1, v2 };
}
/* ---------------- device state ---------------- */
const D = { power:true, build:'RAV24', std:'NTSC', mode:'av', out:0, xpt:[{a:1,v:1},{a:1,v:1}], vin:Array(13).fill(true), fw:mkFW(), tx:null, uart:[], log:[], sel:'U20', lastCut:null };
let FACT=null;
const snap = ()=>({mode:D.mode,out:D.out,xpt:D.xpt.map(x=>({...x}))});
const S = ()=>STD[D.std];
/* ---------------- one transaction: from the button (or UART byte) to the latched crosspoint ---------------- */
function passOf(t){ return Math.floor(t/PASS); }
const bitT = (t0,k)=> t0 + (6 + (k>>3)*8 + k*10 + 3)*TCY;     // led_clk rising edge of bit k inside sft_out (10 cycles a bit, 8 per byte call)
const WORD_CYC = 402;
function lmPresent(src){ return D.build==='RAV24' && src>0 && D.vin[src]; }
function vsEdgesIn(t0,t1,src){ if(!lmPresent(src)) return []; const s=S(), r=[]; for(let k=Math.floor((t0-LM_W)/s.field); k*s.field<=t1; k++){ const e=k*s.field+s.vs*s.H+LM_W; if(e>t0&&e<=t1) r.push(e); } return r; }
function makeTx(n, kind, before, beforeSt, beforeFW){
  const vid = kind==='video';
  const tDet=n*PASS, tLed=tDet+OFF.led_output*TCY, tSw=tDet+OFF.switch_output*TCY, tStrb=tLed+WORD_CYC*TCY, tSwEnd=tSw+WORD_CYC*TCY;
  const tx={ n, kind, vid, tDet, tLed, tSw, tStrb, oldSt:beforeSt, newSt:snap(), oldX:before, newX:swWord(D.fw), oldFW:beforeFW, newFW:JSON.parse(JSON.stringify(D.fw)) };
  if(vid){ tx.tArmOn=tSwEnd+3*TCY; tx.tArmOff=(n+VID_NUM-1)*PASS+(OFF.switch_output-WORD_CYC+3+5)*TCY; tx.tForce=tx.tArmOff+3*TCY;
    const ref = decodeX(before).v1.src; const e=vsEdgesIn(tx.tArmOn,tx.tArmOff,ref); tx.refSrc=ref; tx.tVS=e.length?e[0]:null; tx.tCut=tx.tVS!=null?tx.tVS:tx.tForce; tx.viaVS=tx.tVS!=null; }
  else { tx.tForce=tSwEnd+4*TCY; tx.tCut=tx.tForce; tx.viaVS=false; }
  tx.changed = before.some((b,i)=>b!==tx.newX[i]);
  return tx;
}
/* state at time t */
function Xat(t){ const tx=D.tx; if(!tx) return swWord(D.fw); return t>=tx.tCut ? tx.newX : tx.oldX; }
function stAt(t){ const tx=D.tx; if(!tx) return snap(); return t>=tx.tDet ? tx.newSt : tx.oldSt; }
function armedSkip(m){ const tx=D.tx; return !!(tx&&tx.vid&&m>tx.n&&m<tx.n+VID_NUM); }   // passes where ARM is already high: led_output + switch_output skip the shifting
function ledWordForPass(m){ return ledWord(D.tx&&m<D.tx.n?D.tx.oldSt:stAt(Infinity), chirpAt(m)); }
function swWordForPass(m){ return D.tx&&m<D.tx.n?D.tx.oldX:(D.tx?D.tx.newX:swWord(D.fw)); }
/* the CPLD, gate by gate, at time t (|LPM_SHIFTREG:1|, |LPM_LATCH:29|, |LPM_LATCH:70|, :76) */
function cpldAt(t){ const m=passOf(t), p0=m*PASS;
  let sh=swWordForPass(m-1).slice(), clocks=0, lastBit=null;
  const shiftWord=(w,t0)=>{ for(let k=0;k<36;k++){ if(bitT(t0,k)<=t){ sh=sh.slice(1).concat([w[k]]); clocks++; lastBit=w[k]; } } };
  let swL = ledWordForPass(m-1).slice(0,17), ledRun=!armedSkip(m) && !(D.tx&&D.tx.vid&&m===D.tx.n+VID_NUM-1);
  if(ledRun){ const lw=ledWordForPass(m); shiftWord(lw, p0+OFF.led_output*TCY); if(t>=p0+(OFF.led_output+WORD_CYC)*TCY) swL=lw.slice(0,17); }
  if(ledRun){ shiftWord(swWordForPass(m), p0+OFF.switch_output*TCY); }
  const tx=D.tx; const arm = !!(tx&&tx.vid&&t>=tx.tArmOn&&t<tx.tArmOff);
  const lc055 = !!(tx&&tx.vid&&tx.tVS!=null&&t>=tx.tVS&&t<tx.tArmOff);
  const s=S(), fk=Math.floor(t/s.field), vlow = lmPresent(decodeX(Xat(t)).v1.src) && (t-fk*s.field)>=s.vs*s.H && (t-fk*s.field)<s.vs*s.H+LM_W;
  const forceNow = (()=>{ const fp = ledRun ? p0+(OFF.switch_output+WORD_CYC+4)*TCY : (tx&&tx.vid&&m===tx.n+VID_NUM-1? tx.tForce : null); return fp!=null && t>=fp && t<fp+TCY; })();
  return { sh, swL, X:Xat(t), arm, lc055, vsync:!vlow, force:forceNow, gate:forceNow||lc055, clocks, m, ledRun };
}
const srcName = s => s>0?'IN '+s:(s===0?'—':'?');
function outNow(t){ const d=decodeX(Xat(t)); return d; }
/* ---------------- actions: each logs the real code path ---------------- */
const act=makeActor(D, ()=>`OUT1 A${D.xpt[0].a}/V${D.xpt[0].v} · OUT2 A${D.xpt[1].a}/V${D.xpt[1].v} · RX0 ${RX0(D.fw)} RX1 ${RX1(D.fw)}`);
const BTN = ['AUDIO','VIDEO','A/V','SWR OUT 1','SWR OUT 2','1','2','3','4','5','6','7','8','9','10','11','12'];
// front-panel scan: input_1 bits 5..1 = SW1..SW5, input_2 bits 5..0 = SW6..SW11, input_3 bits 5..0 = SW12..SW17 (input / check_swN in ravv101.asm)
function scanOf(k){ return k<=5 ? [1,6-k] : k<=11 ? [2,11-k] : [3,17-k]; }
function begin(tr, kind, detPass, label, apply){
  const t=SIM.t, before=Xat(t), beforeSt=snap(), beforeFW=JSON.parse(JSON.stringify(D.fw));
  const n = detPass;
  apply();
  D.tx = makeTx(n, kind, before, beforeSt, beforeFW);
  const tx=D.tx;
  tr(`led_output (pass ${n}, ${SIM.fmtT(tx.tLed)}): led_1…led_5 → sft_out, 4 × 8 + 4 = 36 bits on RB7 sft_dat / RB5 led_clk, then RB2 strb high for 1 cycle (${SIM.fmtDur(TCY)}) → CPLD |LPM_LATCH:29| copies dffs0..16 to sw1..sw17 (the 17 button lamps, low = lit)`);
  if(kind==='led'){ tr('No crosspoint changed: switch_output re-sends the same 36-bit switch word and pulses FORCE; X1..X36 do not move.'); return; }
  tr(`switch_output (${SIM.fmtT(tx.tSw)}): switch_1…switch_5 → sft_out (36 bits). The X latch (|LPM_LATCH:70|) is closed while FORCE = 0 and node :76 = 0, so the shifting does not disturb the crosspoints.`);
  if(tx.vid){
    tr(`btfss vid_flag,0 → bsf PORTB,ARM at ${SIM.fmtT(tx.tArmOn)}. CPLD node :76 (_LC055) = DFFE(D = ARM, clock = VSYNCH, clrn = ARM) is now released from clear.`);
    tr(tx.viaVS ? `LM1881 VSYNCH rises at ${SIM.fmtT(tx.tVS)} (field ${Math.floor(tx.tVS/S().field)}, line ${Math.floor((tx.tVS%S().field)/S().H)+1} — inside the vertical interval) → _LC055 = 1 → X latch transparent: video${tx.newSt.mode==='av'?' and audio':''} cut here`
      : `No VSYNCH edge (${D.build==='RA24'?'RA24 build: LM1881 not fitted':'no video on '+srcName(tx.refSrc)+', the LM1881 reference'}) → the cut waits for FORCE`);
    tr(`its_armed: vid_count ${VID_NUM}→0 over ${VID_NUM-1} more passes (led_output and the shift are skipped while ARM is high, so the lamps freeze), then bcf PORTB,ARM at ${SIM.fmtT(tx.tArmOff)} (clears :76) and the FORCE pulse on RB6 at ${SIM.fmtT(tx.tForce)}${tx.viaVS?' re-latches the same word':' — the crosspoints change NOW, mid-field'}`);
  } else tr(`btfss vid_flag,0 → switch_norm: bsf/bcf PORTB,6 (FORCE, 1 cycle) at ${SIM.fmtT(tx.tForce)} → X latch transparent for ${SIM.fmtDur(TCY)}: audio crosspoints cut at once, wherever the waveform is`);
  const d=decodeX(tx.newX);
  tr(`Result on the board: OUT1 = audio ${srcName(d.a1)} / video ${srcName(d.v1.src)}, OUT2 = audio ${srcName(d.a2)} / video ${srcName(d.v2.src)}; bus 1 = [${d.bus[1].join(',')||'—'}], bus 2 = [${d.bus[2].join(',')||'—'}], RX0 ${d.r0} RX1 ${d.r1}`);
}
const A={
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if(D.power){ const keep=D.build, std=D.std, vin=D.vin; Object.assign(D, JSON.parse(JSON.stringify(FACT)), {build:keep,std,vin,log:D.log}); D.power=true;
      tr('RESET → INIT: SPBRG = 7 (9600 baud), TRIS, switch_4/5 written twice (0x3D/0x40 then 0x8D/0x4F), audio1_out1 … video1_out2 = input 1, erase1_1 = 0x3F; the CPLD powers up with every latch at 0 (LPM_AVALUE = 0) until the first FORCE');
      tr('Note: ravv101.asm never reads the 93C66 at power-up; the 2001 protocol (custom build) adds “recalls audio and video settings on power up”.'); }
    else tr('Rails fall: the lamps go out; the HA4314 and 74HC4052 lose their address latches (inferred).'); }); },
  btn(k){ if(!D.power) return; const [grp,bit]=scanOf(k), t=SIM.t, n=Math.ceil(t/PASS)+B_COUNT-1;
    act(`Button SW${k} (${BTN[k-1]})`, tr=>{
      tr(`input: sel0 (RA5) / sel1 (RB0) / sel2 (RC0) select group ${grp}; PORTA + RB1 read into input_${grp}; bit ${bit} = 0 (${BTN[k-1]})`);
      tr(`debounce: the same pattern ${B_COUNT} passes running (b_count) → input_flag set in pass ${n} (${SIM.fmtT(n*PASS)}, ${SIM.fmtDur(n*PASS-t)} after the press; one pass = ${SIM.fmtDur(PASS)})`);
      if(k<=3){ const m=['audio','video','av'][k-1]; begin(tr,'led',n,'',()=>{ D.mode=m; });
        tr(`led_ctrl: ${['check_sw1 → bcf led_1,7 (AUDIO lamp)','check_sw2 → bcf led_1,6 (VIDEO lamp)','check_sw3 “SLAVE”: bsf led_1,7/6, bcf led_1,5 (A/V lamp)'][k-1]} — switch_ctrl will test led_1,7 and led_1,6 to decide audio, video or both`); return; }
      if(k<=5){ begin(tr,'led',n,'',()=>{ D.out=k-4; }); tr(`led_ctrl: check_sw${k}: OUTPUT${k-3} lamp (led_1,${k===4?4:3}); the other output's lamps are parked in out${k===4?2:1}_last1..3 and out${k-3}_last1..3 restored`); return; }
      const src=k-5, o=D.out, mode=D.mode, vid=mode!=='audio', aud=mode!=='video';
      tr(`led_ctrl: check_sw${k} (INPUT ${src}) → switch_check = ${src}; switch_ctrl: btfsc led_1,4 → OUTPUT ${o+1}; btfsc led_1,7 → ${vid?'VIDEO first (sw_vid_'+(o+1)+')':'AUDIO only (do_audio'+(o+1)+')'}`);
      begin(tr, vid?'video':'audio', n, '', ()=>{ if(vid){ D.xpt[o].v=src; swVid(D.fw,o,src,tr); } if(aud){ D.xpt[o].a=src; doAudio(D.fw,o,src,tr); } });
      D.lastCut=D.tx; });
  },
  build(b){ act(`Board stuffed as ${b}`, tr=>{ D.build=b; tr(b==='RA24'?'AVS-24-1 built as an RA24: the parts marked “DO NOT INSTALL ON RA24” (HA4314 ×6, EL2044 ×2, LM1881, video BNC/75 Ω network) are left off. The CPLD and firmware are unchanged, so with no VSYNCH every cut falls back to FORCE.':'AVS-24-1 fully stuffed (RAV24): video crosspoint, output amps and LM1881 sync separator fitted.'); }); },
  std(s){ act(`House video ${s}`, tr=>{ D.std=s; tr(`Field = ${SIM.fmtDur(STD[s].field)}, H = ${SIM.fmtDur(STD[s].H)}. The ARM window (${VID_NUM-1} passes ≈ ${SIM.fmtDur((VID_NUM-1)*PASS)}) is longer than one field, so one VSYNCH edge always falls inside it.`); }); },
  vin(n){ act(`Video input ${n} ${D.vin[n]?'unplugged':'plugged in'}`, tr=>{ D.vin[n]=!D.vin[n]; tr(`IN ${n} ${D.vin[n]?'now carries video':'is now black / no sync'}. The LM1881 (U19) takes its sync from video output 1 (${inf}), so this matters when IN ${n} is the OUT1 video source.`); }); },
  cf(b2){ if(!D.power) return; const t=SIM.t, bt=10/9600; const p1=Math.ceil((t+bt-OFF.recieve_uart*TCY)/PASS), p2=Math.max(p1+1, Math.ceil((t+2*bt-OFF.recieve_uart*TCY)/PASS)), n=p2+1;
    D.uart.unshift({t,dir:'rx',s:'CF '+hx2(b2).slice(2)}); D.uart.length=Math.min(D.uart.length,24);
    act(`Remote frame 0xCF ${hx2(b2)}`, tr=>{
      tr(`DS75176 (U22) receiver → RC7/RX. recieve_uart takes one byte per pass from RCREG: 0xCF in pass ${p1}, ${hx2(b2)} in pass ${p2} (bytes last ${SIM.fmtDur(bt)} each at 9600 8N1)`);
      tr('translate_uart: 0xCF is the address byte (it sets transmit_flag,1; note the label CF_is_okay is the path for every OTHER byte)');
      if(b2===0){ const r=`${hx2(D.xpt[0].a)} ${hx2(D.xpt[1].a)}`; tr(`Command 0x00 = status → just_transmit: check_aud1/check_aud2 sent back on RC6/TX: ${r}`); D.uart.unshift({t:t+4*bt,dir:'tx',s:r}); return; }
      let src=b2&0x0F; if(src===0){ tr('Source nibble 0: switch_check = 0, and the tables (addwf PCL; nop; retlw …) return the input-1 entry for 0 as well'); src=1; }
      if(src>=13){ tr(`Source ${src} ≥ 13 → “sublw 0x0D / btfsc STATUS,C / return” rejects it`); return; }
      const o=(b2>>6)&1, au=(b2>>4)&1, vi=(b2>>5)&1;
      tr(`Command ${b8(b2)}: bits 0–3 source ${src}, bit 4 audio = ${au}, bit 5 video = ${vi}, bit 6 OUTPUT ${o+1}, bit 7 update display = ${(b2>>7)&1}`);
      if(!au&&!vi){ tr('Neither audio nor video bit set → nothing switched'); return; }
      begin(tr, vi?'video':'audio', n, '', ()=>{ if(au){ tr(`audset${o+1} then do_audio${o+1}`); D.xpt[o].a=src; doAudio(D.fw,o,src,tr); } if(vi){ tr(`vidset${o+1} then sw_vid_${o+1}`); D.xpt[o].v=src; swVid(D.fw,o,src,tr); } if((b2>>7)&1){ D.out=o; D.mode=au&&vi?'av':au?'audio':'video'; } });
      D.lastCut=D.tx; }); },
  reset(){ const b=D.build,s=D.std; Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.build=b; D.std=s; lessonIdx=lessonIdx||0; SIM.refresh(); },
};
/* ---------------- panels ---------------- */
// Front: 17.1 × 1.65 in at 200 px/in. Button x from AVS24-2.PCB (SW1 x = 4025 mil … SW17 = 15575 mil, 700 mil pitch, 1050 mil gap after SW5),
// panel origin at PCB x = 2135 mil (checked against the RAV24 silk, where MODE AUDIO sits at 1.895 in).
const FW_=3420, FH_=330, SWX=[4025,4725,5425,6125,6825,7875,8575,9275,9975,10675,11375,12075,12775,13475,14175,14875,15575].map(x=>(x-2135)/5);
function frontSVG(t){ const C=cpldAt(t); const lit=k=>D.power && C.swL[k-1]===0;
  let s=`<svg viewBox="0 0 ${FW_} ${FH_}" style="width:100%;max-width:1100px;display:block;border-radius:8px" role="img" aria-label="AVS24 front panel"><defs><filter id="glowfront" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="${FW_}" height="${FH_}" rx="8" fill="#1a1c1f"/><rect x="0" y="0" width="${FW_}" height="${FH_}" rx="8" fill="none" stroke="#3a3d42" stroke-width="3"/>
   <text x="60" y="60" font-size="30" font-weight="700" fill="#e9e6dc">WARD-BECK SYSTEMS</text><text x="60" y="96" font-size="22" fill="#a9b0b5">AVS24 · 12 × 2 AUDIO/VIDEO SWITCHER</text>
   <text x="${(SWX[0]+SWX[2])/2}" y="48" text-anchor="middle" font-size="22" fill="#e9e6dc">MODE</text><text x="${(SWX[3]+SWX[4])/2}" y="48" text-anchor="middle" font-size="22" fill="#e9e6dc">SWR OUT</text>
   <text x="${(SWX[5]+SWX[16])/2}" y="48" text-anchor="middle" font-size="22" fill="#e9e6dc">SOURCE SELECT</text>`;
  SWX.forEach((x,i)=>{ const k=i+1, col=k<=3?'#ffd34a':k<=5?'#ff5a3c':'#43e06a', cap=k===3?'#1b1c1e':k<=2?'#8d9196':'#3a3d42';
    s+=pbtn(x,150,74,lit(k)?1:0,col,'fb" data-k="'+k,`SW${k} ${BTN[k-1]} — lamp = CPLD output sw${k} (${C.swL[k-1]?'high: off':'low: lit'})`,'',cap)+`<text x="${x}" y="226" text-anchor="middle" font-size="20" fill="#e9e6dc">${k<=3?BTN[k-1]:k<=5?(k-3):k-5}</text>`; });
  s+=`<g class="pw" style="cursor:pointer"><title>Power (rear switch on the main board, PWR SW) — click</title><circle cx="3290" cy="150" r="22" fill="${D.power?'#9dff6a':'#2c332c'}" ${D.power?'filter="url(#glowfront)"':''}/><text x="3290" y="226" text-anchor="middle" font-size="18" fill="#e9e6dc">POWER</text></g>`;
  [[40,40],[40,290],[3380,40],[3380,290]].forEach(([x,y])=>s+=`<circle cx="${x}" cy="${y}" r="11" fill="#6d7175" stroke="#33363a" stroke-width="2"/>`);
  return s+'</svg>'; }
// Rear: drawn to scale from AVS24RER.BAK (Jan 1999): 17.1 × 1.648 in, 16 BNC at 2.650–7.725 in, two 6.325 in terminal-block slots from 8.5 in,
// two output blocks at 15.525–16.6 in, D-sub punch 0.465 × 0.768 in at 1.223 in, two Ø.450 × .500 double-D holes at 0.55 in.
function rearSVG(t){ const d=decodeX(Xat(t)), P=x=>x*200;
  let s=`<svg viewBox="0 0 ${FW_} ${FH_}" style="width:100%;max-width:1100px;display:block;border-radius:8px" role="img" aria-label="AVS24 rear panel"><rect width="${FW_}" height="${FH_}" rx="6" fill="#1a1c1f" stroke="#3a3d42" stroke-width="3"/>`;
  [96,234].forEach((y,i)=>s+=`<g><title>Ø.450 × .500 double-D hole (AVS24RER.BAK) — power entry / fuse (inferred)</title><path d="M${P(.55)-45} ${y-50}h90v100h-90z" fill="#0b0c0d" stroke="#555"/><circle cx="${P(.55)}" cy="${y}" r="30" fill="#2a2d31"/></g>`);
  s+=`<g class="db9"><title>D-sub punch 0.465 × 0.768 in, screws 0.984 in apart: the DB9 serial port J3A (0xCF frames from the remote panel; RS-422 via DS75176)</title><rect x="${P(1.223)}" y="${P(.89)}" width="${P(.768)}" height="${P(.465)}" rx="12" fill="#9a9da1"/><rect x="${P(1.29)}" y="${P(.95)}" width="${P(.634)}" height="${P(.345)}" rx="10" fill="#111"/>${[1.115,2.099].map(x=>`<circle cx="${P(x)}" cy="${P(1.123)}" r="12" fill="#bbb"/>`).join('')}<text x="${P(1.607)}" y="${P(.82)}" text-anchor="middle" font-size="16" fill="#ddd">SERIAL</text></g>`;
  const BX=[2.65,3.375,4.1,4.825,5.55,6.275,7.0,7.725];
  BX.forEach((x,i)=>[75,213].forEach((y,r)=>{ const isOut=i<2, n=2*(i-2)+1+r, title=isOut?`VIDEO OUT ${i+1} feed ${r?'B':'A'} (two 75 Ω splits) — now ${srcName(i?d.v2.src:d.v1.src)}`:`VIDEO IN ${n} — click to ${D.vin[n]?'unplug':'plug in'}`;
    const lit = isOut ? D.build==='RAV24' : D.vin[n]; const used = !isOut && (d.v1.src===n||d.v2.src===n);
    s+=`<g class="${isOut?'':'vb'}" data-n="${n}" style="cursor:${isOut?'default':'pointer'}"><title>${title}</title><circle cx="${P(x)}" cy="${y}" r="44" fill="${D.build==='RA24'?'#3a3d42':'#b9a25a'}" stroke="#6e5d22" stroke-width="3"/><circle cx="${P(x)}" cy="${y}" r="27" fill="#e2d3a0"/><circle cx="${P(x)}" cy="${y}" r="9" fill="#7a5f12"/>${lit&&D.build==='RAV24'?`<circle cx="${P(x)}" cy="${y}" r="38" fill="${used||isOut?'#2b5f9e':'#3a4f6a'}" opacity=".85"/>`:''}<text x="${P(x)}" y="${y+6}" text-anchor="middle" font-size="18" fill="#fff">${isOut?'O'+(i+1)+(r?'B':'A'):n}</text></g>`; }));
  if(D.build==='RA24') s+=`<text x="${P(5.2)}" y="${FH_-8}" text-anchor="middle" font-size="18" fill="#ffb43a">RA24: video BNCs blanked</text>`;
  const ph=(x,y,n,hot,title)=>`<g><title>${title}</title><rect x="${x-48}" y="${y-26}" width="96" height="52" rx="3" fill="#26a356" stroke="#0e5d2b"/>${[-30,0,30].map(dx=>`<rect x="${x+dx-9}" y="${y-13}" width="18" height="26" fill="#0e4d25"/>`).join('')}${hot?`<rect x="${x-46}" y="${y-24}" width="92" height="12" fill="${hot}" opacity=".9"/>`:''}<text x="${x}" y="${y+44}" text-anchor="middle" font-size="15" fill="#ddd">${n}</text></g>`;
  for(let n=1;n<=12;n++){ const x=P(8.5+0.527*(n-0.5)); const hot=d.bus[1].includes(n)?'#5aa9e6':d.bus[2].includes(n)?'#e3a35a':''; s+=ph(x,P(.331),'',hot,`AUDIO IN ${n} LEFT (+ − G) — ${hot?'on bus '+(d.bus[1].includes(n)?1:2):'not routed'}`)+ph(x,P(1.03),n,hot,`AUDIO IN ${n} RIGHT`); }
  [0,1].forEach(o=>{ const x=P(15.525+0.537*(o+.5)); s+=ph(x,P(.331),'',D.power?'#4cc38a':'',`AUDIO OUT ${o+1} LEFT — hears ${srcName(o?d.a2:d.a1)}`)+ph(x,P(1.03),'OUT'+(o+1),D.power?'#4cc38a':'',`AUDIO OUT ${o+1} RIGHT`); });
  s+=`<text x="${P(11.66)}" y="${FH_-6}" text-anchor="middle" font-size="16" fill="#aaa">AUDIO INPUTS 1–12 (top L, bottom R) · blue = bus 1, amber = bus 2</text>`;
  return s+'</svg>'; }
function bindPanels(r){ r.querySelectorAll('.fb').forEach(g=>g.onclick=()=>A.btn(+g.dataset.k)); r.querySelectorAll('.pw').forEach(g=>g.onclick=()=>A.power()); r.querySelectorAll('.vb').forEach(g=>g.onclick=()=>A.vin(+g.dataset.n)); }
bindKeys('__avsActive', ()=>({a:()=>A.btn(1),v:()=>A.btn(2),b:()=>A.btn(3),'[':()=>A.btn(4),']':()=>A.btn(5),'1':()=>A.btn(6),'2':()=>A.btn(7),'3':()=>A.btn(8),'4':()=>A.btn(9),'5':()=>A.btn(10),'6':()=>A.btn(11),'7':()=>A.btn(12),'8':()=>A.btn(13),'9':()=>A.btn(14),'0':()=>A.btn(15),'-':()=>A.btn(16),'=':()=>A.btn(17)}));
/* ---------------- the board (AVS24-2.PCB) ---------------- */
// hot spots in board-SVG units (mil; x − 3200, 15600 − y), from the COMP records of AVS24-2.PCB
const HS={U20:[5145,10471,1410,1633],U21:[8830,11598,1500,462],X1:[9546,12121,574,208],U22:[10380,11695,566,409],U23:[10930,11695,566,409],U24:[10380,12120,450,459],JTAG:[6695,12070,859,459],
  U11:[10071,7598,434,907],U12:[10071,8573,434,882],U13:[11746,7598,459,907],U14:[11771,8573,434,882],U15:[13471,7598,434,907],U16:[13471,8573,434,882],U17:[14321,7820,559,360],U18:[14296,9020,584,360],U19:[15695,9248,651,507],
  LVL1:[14845,8470,499,409],LVL2:[14845,7270,449,409],U7:[845,8273,360,907],U9:[696,9180,509,850],U25:[721,10098,484,882],U27:[671,10980,534,850],
  U3:[645,6630,360,524],U4:[645,7630,360,524],U5:[1545,6630,360,524],U6:[1545,7630,360,524],U8:[1655,8645,620,360],U10:[1655,9495,666,360],U26:[1655,10445,666,360],U28:[1655,11295,641,360],
  T1:[12595,11645,3066,2547],REG2:[13021,10171,904,508],REG3:[14600,10171,904,508],REG5:[11721,11596,508,904],REG1:[571,12221,408,331],REG4:[15846,9098,229,331],J3A:[15005,5096,1225,374],
  P1:[2420,4698,1210,212],P2:[4520,4698,1210,212],P3:[6620,4698,1210,212],H1:[4495,13640,1330,120],H2:[6595,13640,1330,120],H3:[8695,13640,1330,120]};
const COLX=[2470,2995,3520,4045,4570,5095,5620,6145,6670,7195,7720,8245];        // the 12 columns of 74HC4052 pairs (V24A… / V24AA…), input order L→R ${inf}
COLX.forEach((x,i)=>HS['AX'+(i+1)]=[x,6630,360,1750]);
const SWPCB=[620,1320,2020,2720,3420,4470,5170,5870,6570,7270,7970,8670,9370,10070,10770,11470,12170]; SWPCB.forEach((x,i)=>HS['SW'+(i+1)]=[x,3845,410,485]);
const VXP={U16:[0,0],U14:[0,1],U12:[0,2],U15:[1,0],U13:[1,1],U11:[1,2]};        // [output 0/1, group A/B/C] ${inf}: rows by the LVL trims, columns by the IN 1–12 BNC order
const RA24_OFF=new Set(['U11','U12','U13','U14','U15','U16','U17','U18','U19','LVL1','LVL2']);
const INFO={
  U20:['EPM7128SLC84-6 CPLD (silk “EPM7128S”, PLCC-84 socket)','The crosspoint latch. avs24.rpt: 36-bit LPM_SHIFTREG (clock clkled, data), 17-bit LED latch sw1..17 (gate strb), 36-bit crosspoint latch X1..36 (gate FORCE # :76), and node :76 = DFFE(ARM, VSYNCH, clrn ARM). 90/128 logic cells, 60/64 I/O.'],
  U21:['PIC16C63A / PIC16C73A microcontroller','Silk says PIC16C63A; ravv101.asm is LIST P=16C73A. Scans the 17 buttons, keeps the crosspoint registers, shifts LED and switch words to U20, talks 9600-baud serial.'],
  X1:['Crystal','4.9152 MHz '+inf+' — the value that makes SPBRG = 7 give 9600 baud.'],
  U22:['DS75176 RS-485/422 transceiver','Serial link to the remote panel (REMV102/REMV103 firmware) — the functional diagram calls it “RS-422 SERIAL CONTROL”.'],U23:['DS75176 RS-485/422 transceiver','Second half of the 4-wire RS-422 port (one chip per direction, '+inf+').'],
  U24:['93C66 serial EEPROM (“PIC93C66” in the code)','ewen / with_address / shift_nonvol on PORTC (CS RC2, CLK RC3, DI RC4, DO RC1). Holds nonvol_sw1/2 and the display bytes.'],
  JTAG:['JTAG header (IDC10)','ByteBlaster programming of U20 (MAX7000S_ENABLE_JTAG = ON in both ACFs).'],
  U17:['EL2044 video amplifier — OUT2 '+inf,'Wired-OR outputs of three HA4314 → EL2044 → two 75 Ω back-terminated feeds (75R ×4 at the BNC edge). Gain set by 680R/330R 1 % and the LVL trims.'],
  U18:['EL2044 video amplifier — OUT1 '+inf,'As U17, for output 1.'],
  U19:['LM1881 sync separator','Vertical output → CPLD VSYNCH (pin 2, global clock). Fed from video output 1 '+inf+'. Board note: “DO NOT INSTALL ON RA24”.'],
  LVL1:['LVL1 trim (500R) + CV 2–25 pF','Output level / HF trim for one video output. AVS24.WAS records the rename “D8 LVL1 / D7 LVL2”.'],LVL2:['LVL2 trim (500R) + CV 2–25 pF','Output level / HF trim for the other video output.'],
  U7:['74HC4053 bus selector','RX0/RX1 choose whether each audio output listens to bus 1 or bus 2 (4 × 74HC4053 for 2 outputs × L/R, '+inf+').'],U9:['74HC4053 bus selector','See U7.'],U25:['74HC4053 bus selector','See U7.'],U27:['74HC4053 bus selector','See U7.'],
  U3:['NE5532 audio stage','Eight NE5532: bus receivers and balanced output drivers, 60 Ω out, +27 dBu max (manual).'],U4:['NE5532 audio stage','See U3.'],U5:['NE5532 audio stage','See U3.'],U6:['NE5532 audio stage','See U3.'],U8:['NE5532 audio stage','See U3.'],U10:['NE5532 audio stage','See U3.'],U26:['NE5532 audio stage','See U3.'],U28:['NE5532 audio stage','See U3.'],
  T1:['Toroidal mains transformer','Silk wire colours OR/WH/BR/BK and 110/220 tap — the manual: factory set for 240 V, internal jumpers for 120 V.'],
  REG2:['LM337 (−V analog)','With LM317: the ± rails for the NE5532s and video amps.'],REG3:['LM317 (+V analog)','“HEATSINK REQ’D” on the silk is next to the 7805.'],REG5:['LM7805 (+5 V logic)','PIC, CPLD, HC logic. Silk: HEATSINK REQ’D.'],REG1:['LM7805 (second +5 V)','Near the audio section; feeds the 74HC405x ('+inf+').'],REG4:['MC34164 (TO-92) reset supervisor','Named in the Avs24-4 value list; holds the PIC in reset until +5 V is good ('+inf+' role).'],
  J3A:['DB9 serial connector (right-angle)','Manual (RS-232 build): RX pin 2, TX pin 3, GND 5, 9.'],
  P1:['P1 ribbon (switch board → main H1)','Buttons and lamps of SW1–SW6 ('+inf+' split).'],P2:['P2 ribbon','SW7–SW12.'],P3:['P3 ribbon','SW13–SW17.'],H1:['H1 header (main board)','To P1 on the switch board.'],H2:['H2 header','To P2.'],H3:['H3 header','To P3.'],
};
for(let i=1;i<=12;i++) INFO['AX'+i]=['74HC4052 pair — audio input '+i+' '+inf,`Two dual 4-channel muxes (“24 X 74HC4052N” on the silk): address B,A = AX1-${i}, AX0-${i} = X${2*i-1}, X${2*i}. 00 = off, 01 = bus 1, 11 = bus 2 (from audio1_table / audio2_table).`];
for(let i=1;i<=17;i++) INFO['SW'+i]=['SW'+i+' — '+BTN[i-1]+' (AVS-24-2 switch board)','Illuminated push button (SWKSD footprint). Its lamp is CPLD output sw'+i+' (active low, LED word bit '+(i-1)+').'];
['U11','U12','U13','U14','U15','U16'].forEach(u=>{ const [o,g]=VXP[u]; INFO[u]=[`HA4314 4 × 1 video crosspoint — OUT${o+1}, inputs ${g*4+1}–${g*4+4} ${inf}`,`Selected by /EN = ${o?['X27','X34','X30'][g]:['X28','X29','X32'][g]} and A0/A1 = ${o?'X35/X36':'X31/X33'}. Three per output, outputs wired-OR into the EL2044.`]; });
const plain = h => String(h).replace(/<[^>]+>/g,'');
function boardSVG(){ return `<svg viewBox="0 0 17400 14800" style="width:100%;display:block;border-radius:8px;background:#14532d" role="img" aria-label="AVS24-2.PCB redrawn">
  <image href="${ASSET}avs-pcb.svg" width="17400" height="14800"/><g id="hot"></g></svg>`; }
function hotSVG(t){ const d=decodeX(Xat(t)), C=cpldAt(t); let s='';
  const box=(k,col,w,dash,op)=>{ const [x,y,ww,hh]=HS[k]; return `<rect x="${Math.min(x,x+ww)-40}" y="${y-40}" width="${Math.abs(ww)+80}" height="${hh+80}" rx="40" fill="${col}" fill-opacity="${op==null?.18:op}" stroke="${col}" stroke-width="${w||40}" ${dash?'stroke-dasharray="120 80"':''}/>`; };
  for(const k in HS){ let col=null, op=.0;
    if(D.build==='RA24' && RA24_OFF.has(k)){ s+=`<g data-hs="${k}" style="cursor:pointer"><title>${plain(INFO[k][0])} — not fitted on an RA24</title>${box(k,'#111',30,true,.75)}</g>`; continue; }
    if(k==='U20' && (C.gate||C.arm)) { col=C.gate?'#ffd34a':'#ff7a6e'; op=.3; }
    if(VXP[k]){ const [o,g]=VXP[k], v=o?d.v2:d.v1; if(v.g===g && v.src>0) { col=o?'#e3a35a':'#5aa9e6'; op=.25; } }
    if(k.startsWith('AX')){ const n=+k.slice(2); if(d.bus[1].includes(n)) col='#5aa9e6'; if(d.bus[2].includes(n)) col='#e3a35a'; op=.25; }
    if(k.startsWith('SW')){ const n=+k.slice(2); if(D.power && C.swL[n-1]===0){ col='#43e06a'; op=.35; } }
    if(k==='U19' && !C.vsync){ col='#ff7a6e'; op=.4; }
    if(k===D.sel) s+=`<g data-hs="${k}" style="cursor:pointer"><title>${INFO[k]?plain(INFO[k][0]):k}</title>${box(k,'#ffffff',60,true,.12)}</g>`;
    else s+=`<g data-hs="${k}" style="cursor:pointer"><title>${INFO[k]?plain(INFO[k][0]):k}</title>${col?box(k,col,40,false,op):box(k,'#ffffff',0,false,0)}</g>`; }
  s+=`<text x="300" y="14650" font-size="260" fill="#f2f2ea" opacity=".85">AVS-24-3 (top) · AVS-24-2 switch board · AVS-24-1 main board — click a part</text>`;
  return s; }
function partInfo(t){ const k=D.sel, I=INFO[k]||[k,'']; const C=cpldAt(t), d=decodeX(C.X); let live='';
  if(k==='U20') live=`<div class="mono small">ARM ${C.arm?1:0} · VSYNCH ${C.vsync?1:0} · :76 ${C.lc055?1:0} · FORCE ${C.force?1:0} → X-latch gate ${C.gate?'<b>OPEN</b>':'closed'} · clocks this pass ${C.clocks}</div>`;
  if(VXP[k]){ const [o,g]=VXP[k], v=o?d.v2:d.v1; live=`<div class="small">${v.g===g&&v.src>0?`<b>Enabled</b>: passing IN ${v.src} to OUT${o+1}`:'Disabled (/EN high): output high-impedance'}</div>`; }
  if(k.startsWith('AX')){ const n=+k.slice(2); live=`<div class="small mono">X${2*n-1} X${2*n} = ${C.X[2*n-2]}${C.X[2*n-1]} → ${d.bus[1].includes(n)?'bus 1':d.bus[2].includes(n)?'bus 2':'off'}</div>`; }
  if(/^U(7|9|25|27)$/.test(k)) live=`<div class="small mono">RX0 = ${d.r0} (OUT1 ← bus ${d.r0?2:1}) · RX1 = ${d.r1} (OUT2 ← bus ${d.r1?1:2})</div>`;
  if(k==='U19') live=`<div class="small">${D.build==='RA24'?'Not fitted (RA24).':lmPresent(d.v1.src)?'Sync found on OUT1 (IN '+d.v1.src+') — VSYNCH '+(C.vsync?'high':'<b>low</b>'):'<b>No sync</b> on OUT1 → VSYNCH idle; cuts fall back to FORCE.'}</div>`;
  if(k.startsWith('SW')){ const n=+k.slice(2); live=`<div class="small mono">sw${n} = ${C.swL[n-1]} → lamp ${C.swL[n-1]?'off':'lit'} <button class="pb" data-k="${n}">press</button></div>`; }
  return `<h3>${k}: ${I[0]}</h3><p class="small">${I[1]}</p>${live}${D.build==='RA24'&&RA24_OFF.has(k)?'<p class="small" style="color:var(--warn)">Not fitted on an RA24 (silk: DO NOT INSTALL ON RA24).</p>':''}`; }
/* ---------------- timeline ---------------- */
const SRC_COL = s => s<=0 ? '#555' : `hsl(${(s*67)%360} 62% 52%)`;
const audF = s => 180 + 55*s;                                   // a distinct test tone per input (display only)
function audioOut(o,t){ const d=decodeX(Xat(t)), s=o?d.a2:d.a1; return s>0 ? Math.sin(2*Math.PI*audF(s)*t) : 0; }
function lanes(){ const a=SIM.css('--accent'), b=SIM.css('--accent2'), w=SIM.css('--warn'), bad=SIM.css('--bad'), ink2=SIM.css('--ink2'), tx=D.tx, s=S();
  const seg=(c,X,t0,t1,y,h,ta,tb,col)=>{ if(tb<t0||ta>t1) return; c.fillStyle=col; c.fillRect(X(Math.max(t0,ta)),y+4,Math.max(1.5,X(Math.min(t1,tb))-X(Math.max(t0,ta))),h-8); };
  const note=(c,X,t0,y,txt)=>{ c.fillStyle=ink2; c.font='11px sans-serif'; c.fillText(txt,X(t0)+6,y+14); };
  // per-pass bursts of led_clk: drawn bit by bit when zoomed in
  const clkLane={label:'led_clk RB5 → clkled (pin 83)', h:24, draw(c,X,t0,t1,y,h){ const m0=passOf(t0)-1, m1=passOf(t1)+1;
    if((t1-t0)/PASS>40){ SIM.pulses(c,X,t0,t1,y,h,PASS,OFF.led_output*TCY,(2*WORD_CYC+4)*TCY,b,'72-clock bursts'); return; }
    for(let m=Math.max(0,m0); m<=m1; m++){ if(armedSkip(m)) continue; const p0=m*PASS; [OFF.led_output,OFF.switch_output].forEach((o,wi)=>{ const st=p0+o*TCY;
      if(st+WORD_CYC*TCY<t0||st>t1) return; const px=X(st+TCY*10)-X(st);
      if(px<3){ seg(c,X,t0,t1,y,h,st,st+WORD_CYC*TCY,wi?a:b); return; }
      for(let k=0;k<36;k++){ const r=bitT(st,k); if(r>t1||r+2*TCY<t0) continue; c.fillStyle=wi?a:b; c.fillRect(X(r),y+4,Math.max(1,X(r+2*TCY)-X(r)),h-8); } }); } }};
  const datLane={label:'sft_dat RB7 → data (pin 80)', h:24, draw(c,X,t0,t1,y,h){ if((t1-t0)>0.004){ note(c,X,t0,y,'zoom to < 4 ms to read the bits'); return; }
    for(let m=Math.max(0,passOf(t0)-1); m<=passOf(t1)+1; m++){ if(armedSkip(m)) continue; const p0=m*PASS; [[OFF.led_output,ledWordForPass(m)],[OFF.switch_output,swWordForPass(m)]].forEach(([o,wd],wi)=>{ const st=p0+o*TCY;
      for(let k=0;k<36;k++){ const r=bitT(st,k); if(r+7*TCY<t0||r-3*TCY>t1) continue; const hi=wd[k]; c.fillStyle=wi?a:b; if(hi) c.fillRect(X(r-TCY),y+4,Math.max(1,X(r+6*TCY)-X(r-TCY)),h-8); else { c.fillStyle=ink2; c.fillRect(X(r-TCY),y+h-6,Math.max(1,X(r+6*TCY)-X(r-TCY)),2); }
        if(X(r+10*TCY)-X(r)>16){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText((wi?'X':'sw')+(k+1)+'='+hi, X(r-TCY)+2, y+h/2+4); } } }); } }};
  const strbLane={label:'strb RB2 (LED latch gate)', h:18, draw(c,X,t0,t1,y,h){ for(let m=Math.max(0,passOf(t0)-1); m<=passOf(t1)+1; m++){ if(armedSkip(m)) continue; const ts=m*PASS+(OFF.led_output+WORD_CYC)*TCY; seg(c,X,t0,t1,y,h,ts,ts+TCY,a); } }};
  const armLane={label:'ARM RB3 → pin 1', h:18, draw(c,X,t0,t1,y,h){ if(!tx||!tx.vid){ note(c,X,t0,y,tx?'audio-only cut: ARM not used':'switch a video source'); return; } seg(c,X,t0,t1,y,h,tx.tArmOn,tx.tArmOff,bad); }};
  const vsLane={label:'LM1881 VSYNCH → pin 2', h:18, draw(c,X,t0,t1,y,h){ const src=decodeX(Xat((t0+t1)/2)).v1.src; if(!lmPresent(src)){ note(c,X,t0,y,D.build==='RA24'?'LM1881 not fitted (RA24)':'no sync on OUT1 (IN '+src+')'); return; }
    for(let k=Math.floor(t0/s.field)-1;k*s.field<=t1;k++){ const a0=k*s.field+s.vs*s.H; seg(c,X,t0,t1,y,h,a0,a0+LM_W,ink2); } }};
  const lcLane={label:'node :76 (_LC055, armed)', h:18, draw(c,X,t0,t1,y,h){ if(tx&&tx.vid&&tx.tVS!=null) seg(c,X,t0,t1,y,h,tx.tVS,tx.tArmOff,w); }};
  const forceLane={label:'FORCE RB6 → pin 81', h:18, draw(c,X,t0,t1,y,h){ for(let m=Math.max(0,passOf(t0)-1); m<=passOf(t1)+1; m++){ let tf=null; if(!armedSkip(m)) tf=m*PASS+(OFF.switch_output+WORD_CYC+4)*TCY; if(tx&&tx.vid&&m===tx.n+VID_NUM-1) tf=tx.tForce; if(tx&&tx.vid&&m===tx.n) tf=null; if(tf!=null) seg(c,X,t0,t1,y,h,tf,tf+TCY,a); } }};
  const gateLane={label:'X-latch gate (FORCE # :76)', h:18, draw(c,X,t0,t1,y,h){ if(tx&&tx.vid&&tx.tVS!=null) seg(c,X,t0,t1,y,h,tx.tVS,tx.tArmOff,w); forceLane.draw(c,X,t0,t1,y,h); if(tx){ const xc=X(tx.tCut); if(xc>=X(t0)&&xc<=X(t1)){ c.strokeStyle=bad; c.lineWidth=2; c.beginPath(); c.moveTo(xc,y); c.lineTo(xc,y+h); c.stroke(); } } }};
  const vidLane=o=>({label:`VIDEO OUT ${o+1} (HA4314 → EL2044)`, h:24, draw(c,X,t0,t1,y,h){ if(D.build==='RA24'){ note(c,X,t0,y,'not fitted on an RA24'); return; }
    const cut=tx?tx.tCut:Infinity; [[t0,Math.min(t1,cut)],[Math.max(t0,cut),t1]].forEach(([ta,tb])=>{ if(tb<=ta) return; const v=(o?decodeX(Xat(ta)).v2:decodeX(Xat(ta)).v1).src; seg(c,X,t0,t1,y,h,ta,tb,SRC_COL(v)); c.fillStyle='#fff'; c.font='bold 11px sans-serif'; if(X(tb)-X(ta)>40) c.fillText(srcName(v)+(v>0&&!D.vin[v]?' (black)':''),X(ta)+6,y+h/2+4); });
    if((t1-t0)<0.003){ for(let k=Math.floor(t0/s.H);k*s.H<=t1;k++){ const ln=Math.floor((k*s.H%s.field)/s.H+1e-9)+1; c.fillStyle='#000'; c.fillRect(X(k*s.H),y+4,Math.max(1,X(k*s.H+4.7e-6)-X(k*s.H)),h-8); if(X((k+1)*s.H)-X(k*s.H)>26){ c.fillStyle=ln<=s.vbi?'#ffd34a':'#fff'; c.font='10px sans-serif'; c.fillText('L'+ln,X(k*s.H)+5,y+11); } } } }});
  const audLane=o=>({label:`AUDIO OUT ${o+1} L (4052 bus → 4053 → NE5532)`, h:38, draw(c,X,t0,t1,y,h){ const N=Math.min(1200,Math.max(200,(X(t1)-X(t0))*1.5)), span=t1-t0; const dense = span*800 > (X(t1)-X(t0))/3;
    c.strokeStyle=o?SIM.css('--warn'):b; c.lineWidth=1.2; c.beginPath();
    if(dense){ c.fillStyle=o?SIM.css('--warn'):b; c.globalAlpha=.3; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; const cut=tx?tx.tCut:-1; if(cut>t0&&cut<t1){ c.fillStyle=bad; c.fillRect(X(cut)-1,y,2,h); } note(c,X,t0,y,'tone '+(o?decodeX(Xat(t1)).a2:decodeX(Xat(t1)).a1)+' — zoom in to see the cut'); return; }
    for(let i=0;i<=N;i++){ const tt=t0+span*i/N, v=audioOut(o,tt); const yy=y+h/2-v*(h/2-4); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }});
  const uartLane={label:'Serial RC7 (9600 8N1)', h:20, draw(c,X,t0,t1,y,h){ D.uart.forEach(u=>{ const d=(u.s.split(' ').length)*10/9600; if(u.t+d<t0||u.t>t1) return; seg(c,X,t0,t1,y,h,u.t,u.t+d,u.dir==='rx'?b:a); c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(u.s,X(Math.max(t0,u.t))+3,y+14); }); }};
  return [
    {label:`PIC main-loop passes (${SIM.fmtDur(PASS)})`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,PASS,0,(PASS-ROUT[ROUT.length-1][1]*TCY),SIM.css('--ink2'),'passes (bar = work, gap = DELAY)'); }},
    {label:'Button / frame → pass detected', h:18, draw(c,X,t0,t1,y,h){ if(!tx){ note(c,X,t0,y,'press a button or send a frame'); return; } seg(c,X,t0,t1,y,h,tx.tDet,tx.tDet+PASS*0.06,w); }},
    clkLane, datLane, strbLane, armLane, vsLane, lcLane, forceLane, gateLane, vidLane(0), vidLane(1), audLane(0), audLane(1), uartLane ];
}
/* ---------------- views ---------------- */
function xptCard(t){ const d=decodeX(Xat(t));
  return tbl(['Output','Audio heard (bus)','Video (HA4314)','Firmware wanted'],[0,1].map(o=>[`OUT ${o+1}`,`${srcName(o?d.a2:d.a1)} (bus ${o?(d.r1?1:2):(d.r0?2:1)})`, D.build==='RA24'?'not fitted':(o?d.v2:d.v1).src>0?`IN ${(o?d.v2:d.v1).src}`:(o?d.v2:d.v1).txt, `A${D.xpt[o].a} / V${D.xpt[o].v}`]),true)
    +`<div class="small mono" style="margin-top:4px">bus 1 = [${d.bus[1].join(', ')||'—'}] · bus 2 = [${d.bus[2].join(', ')||'—'}] · RX0 ${d.r0} RX1 ${d.r1}${d.bad.length?' · <b style="color:var(--bad)">illegal code 10 on '+d.bad.join(',')+'</b>':''}</div>`; }
function remoteHTML(){ const q=[['OUT1 A/V ← 3',0xB3],['OUT1 audio ← 7',0x97],['OUT2 video ← 12',0xEC],['OUT2 A/V ← 12',0xFC],['status',0x00],['source 0 (!)',0xB0]];
  return `<div class="small" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${q.map(([l,v])=>`<button class="cfq" data-v="${v}">0xCF ${hx2(v).slice(2)} · ${l}</button>`).join('')}
   <label>byte 2 <input id="cfb" value="B5" style="width:50px" class="mono"></label><button id="cfs">Send 0xCF + byte</button></div>
   <div class="log small mono" style="max-height:110px;margin-top:6px">${D.uart.map(u=>`<div>${SIM.fmtT(u.t)} ${u.dir==='rx'?'→ AVS':'← AVS'} ${u.s}</div>`).join('')||'<span class="muted">No serial traffic yet. Byte 2: bits 0–3 source, 4 audio, 5 video, 6 output 2, 7 update display (translate_uart).</span>'}</div>`; }
function bindRemote(r){ r.querySelectorAll('.cfq').forEach(b=>b.onclick=()=>A.cf(+b.dataset.v)); const s=r.querySelector('#cfs'); if(s) s.onclick=()=>{ const v=parseInt(r.querySelector('#cfb').value,16); if(!isNaN(v)) A.cf(v&255); }; }
function cutSummary(){ const tx=D.tx; if(!tx||tx.kind==='led') return '<span class="muted">No crosspoint change yet.</span>';
  const s=S(), f=Math.floor(tx.tCut/s.field), ln=Math.floor((tx.tCut-f*s.field)/s.H)+1;
  return `${tx.vid?'Video':'Audio'} cut at <b>${SIM.fmtT(tx.tCut)}</b> — ${tx.viaVS?`on the VSYNCH edge, field ${f}, line ${ln} (vertical interval = lines 1–${s.vbi}) ✓`:tx.vid?`<b style="color:var(--bad)">by FORCE, field ${f} line ${ln} (picture area: visible glitch)</b>`:'by FORCE (audio only, no ARM)'} · ${SIM.fmtDur(tx.tCut-(D.log[0]?D.log[0].t:0))} after the action <button id="jc">Jump to the cut</button>`; }
function viewSim(m){ window.__avsActive=true;
  m.innerHTML=`<div class="card"><h2>AVS24 — front panel (drawn to scale from the switch positions in AVS24-2.PCB) · lamps are the CPLD's sw1..sw17 latch</h2><div id="fp"></div>
     <div class="small muted">Keys: A / V / B = AUDIO / VIDEO / A-V, [ ] = SWR OUT 1 / 2, 1…9 0 - = = sources 1…12. Builds: <button id="bR" class="${D.build==='RAV24'?'on':''}">RAV24 (A/V)</button> <button id="bA" class="${D.build==='RA24'?'on':''}">RA24 (audio only)</button> · house video <button id="sN" class="${D.std==='NTSC'?'on':''}">525/59.94</button> <button id="sP" class="${D.std==='PAL'?'on':''}">625/50</button> · sister plugins: <a href="siumulation.html?plugin=rav-24#sim">RAV24</a>, <a href="siumulation.html?plugin=ra24#sim">RA24</a></div></div>
   ${card('Rear panel (AVS24RER.BAK, Jan 1999) — click a video input BNC to unplug it',`<div id="rp"></div>`)}
   <div class="grid2"><div>${card('The board: AVS24-2.PCB (ISSUE.2), redrawn from the Tango-PCB file — click a part',`<div id="bd"></div>`)}</div><div>${card('Part',`<div id="pi"></div>`)}${card('Crosspoints on the board (decoded from X1..X36)',`<div id="xp"></div><div id="cs" class="small" style="margin-top:6px"></div>`)}</div></div>
   <div class="grid2">${card('Firmware + CPLD path of the last action',`<div id="trace" class="log"></div>`)}${card('Remote panel / serial (0xCF frames, ravv101.asm translate_uart)',`<div id="rm"></div>`)}</div>
   ${card('Timeline — zoom “100 ms” after a press for the ARM window, “2 ms” for the shift bursts, “50 µs” for single bits',`<canvas id="tl"></canvas>`)}${card('Action log',`<div id="log" class="log"></div>`)}`;
  const g=s=>m.querySelector(s);
  g('#bR').onclick=()=>A.build('RAV24'); g('#bA').onclick=()=>A.build('RA24'); g('#sN').onclick=()=>A.std('NTSC'); g('#sP').onclick=()=>A.std('PAL');
  g('#bd').innerHTML=boardSVG(); const hot=g('#hot');
  hot.addEventListener('click',e=>{ const h=e.target.closest('[data-hs]'); if(h){ D.sel=h.dataset.hs; SIM.refresh(); } });
  let lastB=null, lastRm=null;
  const draw=()=>{ const t=SIM.t;
    ['#bR','#bA'].forEach((q,i)=>g(q).classList.toggle('on',D.build===(i?'RA24':'RAV24'))); ['#sN','#sP'].forEach((q,i)=>g(q).classList.toggle('on',D.std===(i?'PAL':'NTSC')));
    g('#fp').innerHTML=frontSVG(t); g('#rp').innerHTML=rearSVG(t); bindPanels(g('#fp')); bindPanels(g('#rp'));
    hot.innerHTML=hotSVG(t); g('#pi').innerHTML=partInfo(t); g('#pi').querySelectorAll('.pb').forEach(b=>b.onclick=()=>A.btn(+b.dataset.k));
    g('#xp').innerHTML=xptCard(t); g('#cs').innerHTML=cutSummary(); const jc=g('#jc'); if(jc) jc.onclick=()=>{ SIM.win=0.002; const zs=document.querySelector('#zoomSel'); if(zs){ [...zs.options].forEach((o,i)=>{ if(Math.abs(+o.value-0.002)<1e-9) zs.selectedIndex=i; }); } SIM.seek(D.tx.tCut); };
    g('#trace').innerHTML=traceHTML(D,'Press a button: the trace follows ravv101.asm into the CPLD equations of avs24.rpt.');
    const rk=D.uart.length+':'+(D.uart[0]?D.uart[0].t:0); if(rk!==lastRm){ lastRm=rk; const keep=g('#cfb')?g('#cfb').value:null; g('#rm').innerHTML=remoteHTML(); if(keep) g('#cfb').value=keep; bindRemote(g('#rm')); }
    g('#log').innerHTML=logHTML(D); SIM.drawLanes(g('#tl'),lanes(),{labelW:220}); };
  SIM.on('time',draw); }
/* ---------------- tutorial ---------------- */
const LESSONS=[
  {title:'The AVS board', body:`<p>The AVS24 is the switcher electronics shared by the <b>RAV24</b> (12 × 2 audio + video) and the <b>RA24</b> (audio only). The manual (<span class="mono">RAV24MANCUSTOM.WPD</span>): “video interval switching, click less audio switching”. A PIC reads the buttons and shifts 36-bit words into an Altera CPLD; the CPLD holds the crosspoints and waits for the vertical interval before it lets a video change through.</p><p>The front-panel lamps you see are the CPLD's own <span class="mono">sw1..sw17</span> latch outputs.</p>`, check:()=>true, auto:true},
  {title:'1 · An audio-follow-video cut', body:`<p>Press <b>SWR OUT 1</b>, <b>A/V</b>, then source <b>4</b>. Watch the timeline: three debounce passes, the 72 clock bursts, <b>ARM</b> rising, and the cut on the next <b>VSYNCH</b> edge.</p>`, check:()=>D.xpt[0].a===4&&D.xpt[0].v===4, hint:'Keys [, B, 4.'},
  {title:'2 · Where exactly did it cut?', body:`<p>Press <b>Jump to the cut</b> under the crosspoint table. The playhead lands on the LM1881 edge; the video lane shows the line numbers (yellow = vertical interval).</p>`, check:()=>D.tx&&D.tx.vid&&Math.abs(SIM.t-D.tx.tCut)<0.0005, hint:'The button appears after a video change.'},
  {title:'3 · Breakaway audio', body:`<p>Press <b>SWR OUT 2</b>, <b>AUDIO</b>, source <b>9</b>. Only the audio moves; no ARM — FORCE latches the new 4052 address at once (see the waveform step in AUDIO OUT 2).</p>`, check:()=>D.xpt[1].a===9&&D.xpt[1].v===1, hint:'], A, 9.'},
  {title:'4 · Two outputs, one input', body:`<p>Now put <b>OUT 1 audio</b> on source <b>9</b> too (SWR OUT 1, AUDIO, 9). An input's 74HC4052 pair can feed only one bus, so <span class="mono">do_audio1 → setup_1</span> erases bus 1 and sets <b>RX0</b>: OUT 1 borrows bus 2 through the 74HC4053.</p>`, check:()=>D.xpt[0].a===9&&D.xpt[1].a===9&&RX0(D.fw)===1, hint:'[, A, 9.'},
  {title:'5 · Lose the reference', body:`<p>OUT 1 video is on input 4. On the rear panel, click <b>VIDEO IN 4</b> to unplug it, then switch OUT 1 video to source <b>6</b> (MODE VIDEO, 6). With no sync the LM1881 is silent, and the cut happens when FORCE arrives ${VID_NUM-1} passes later — in the middle of the picture.</p>`, check:()=>D.tx&&D.tx.vid&&!D.tx.viaVS, hint:'Rear BNC “4”, then V and 6.'},
  {title:'6 · The remote panel', body:`<p>Send <span class="mono">0xCF FC</span> (output 2, audio + video, source 12, update display) from the remote card — this is what <span class="mono">remv102.asm</span> transmits.</p>`, check:()=>D.xpt[1].a===12&&D.xpt[1].v===12, hint:'Use the “OUT2 A/V ← 12” quick button.'},
  {title:'7 · Build it as an RA24', body:`<p>Switch the build to <b>RA24</b>. On the board the parts silk-marked “DO NOT INSTALL ON RA24” go dark; video lanes report “not fitted”, and every cut is a FORCE cut.</p>`, check:()=>D.build==='RA24', hint:'The RA24 button above the front panel.'},
  {title:'Done', body:`<p><b>Software</b> shows the CPLD cells and the PIC loop live; <b>Findings</b> lists what the files reveal. The operator-side models are in the <a href="siumulation.html?plugin=rav-24#tutorial">RAV24</a> and <a href="siumulation.html?plugin=ra24#tutorial">RA24</a> plugins.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){ window.__avsActive=true; tutorialView(m,{title:'Tutorial — inside the AVS24',lessons:LESSONS,D,getIdx:()=>lessonIdx,setIdx:i=>lessonIdx=i,reset:()=>{ A.reset(); D.build='RAV24'; },
  unitHTML:()=>`${frontSVG(SIM.t)}${rearSVG(SIM.t)}<div class="small">${xptCard(SIM.t)}<div style="margin-top:4px">${cutSummary()}</div></div><div style="margin-top:6px">${remoteHTML()}</div><div class="small" style="margin-top:6px">Build: <button class="tb" data-b="RAV24">RAV24</button> <button class="tb" data-b="RA24">RA24</button></div>`,
  bind:r=>{ bindPanels(r); bindRemote(r); r.querySelectorAll('.tb').forEach(b=>b.onclick=()=>A.build(b.dataset.b)); const jc=r.querySelector('#jc'); if(jc) jc.onclick=()=>SIM.seek(D.tx.tCut); }}); }
/* ---------------- one second ---------------- */
function viewSecond(m){ window.__avsActive=false;
  m.innerHTML=`${card('One second inside the AVS24',`<div id="tab"></div>`)}<div class="grid2">${card('The pass at the playhead',`<div id="pass"></div>`)}${card('One field around the last video cut',`<canvas id="fld"></canvas><p class="small muted">Range: the field that contains the cut (or the current field), first 30 lines. LM1881 low pulse from line ${STD.NTSC.vs+1} (${inf}: datasheet typical ${SIM.fmtDur(LM_W)}); the CPLD clocks on its rising edge.</p>`)}</div>
   ${card('Timeline',`<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, n=passOf(t), ph=(t-n*PASS)/TCY, s=S(); let acc=0, hot=0; ROUT.forEach((r,i)=>{ if(ph>=acc) hot=i; acc+=r[1]; });
    m.querySelector('#tab').innerHTML=tbl(['Event','per second','period / width','where it comes from'],[
      ['PIC instruction cycles',(1/TCY).toLocaleString(),SIM.fmtDur(TCY),'Fosc/4 = 4.9152 MHz/4 '+inf],
      ['Main-loop passes',(1/PASS).toFixed(1),SIM.fmtDur(PASS),'MAIN … call delay; DELAY = 256 × 7 inner loops (DELAY2 never reloaded)'],
      ['led_clk edges into the CPLD',Math.round(72/PASS).toLocaleString(),'2 cycles high = '+SIM.fmtDur(2*TCY),'led_output + switch_output: 36 + 36 bits every pass (none while ARM is high)'],
      ['strb (LED latch)',(1/PASS).toFixed(1),SIM.fmtDur(TCY),'bsf/bcf PORTB,strb after the LED word'],
      ['FORCE pulses',(1/PASS).toFixed(1),SIM.fmtDur(TCY),'switch_norm, every pass: the X latch re-loads the same word'],
      ['Video fields',(1/s.field).toFixed(2),SIM.fmtDur(s.field),D.std+' house video'],
      ['VSYNCH edges at the CPLD',D.build==='RA24'?'0 (RA24)':(1/s.field).toFixed(2),SIM.fmtDur(LM_W)+' low','LM1881 vertical output, global clock of node :76'],
      ['Video lines',(1/s.H).toFixed(0),SIM.fmtDur(s.H),'cuts land in lines 1–'+s.vbi+' when synced'],
      ['ARM window (video change)','—',SIM.fmtDur((VID_NUM-1)*PASS),'vid_num = 4 → 3 more passes: > 1 field, so one VSYNCH always falls inside'],
      ['Chirp (breakaway flash)',(1/((CHIRP_PERIOD+CHIRP_DUTY)*PASS)).toFixed(2),SIM.fmtDur(CHIRP_DUTY*PASS)+' on','chirp_period 0x17, chirp_duty 3 — rides on the same LED word'],
      ['Serial bytes (9600 8N1)','≤ 960',SIM.fmtDur(10/9600),'recieve_uart takes one byte per pass — a 0xCF frame needs 2 passes']]);
    m.querySelector('#pass').innerHTML=`<p class="small">Pass ${n} · ${(ph*TCY*1e3).toFixed(3)} ms in · running <b class="mono">${ROUT[hot][0]}</b>${armedSkip(n)?' · <b>ARM high: no shifting this pass</b>':''}</p>`+loopSVG(ROUT.map(r=>({t:r[0],s:[`${r[1]} cycles`,SIM.fmtDur(r[1]*TCY)]})),hot,'MAIN (ravv101.asm)');
    const tx=D.tx, ref=tx&&tx.vid?tx.tCut:t, f0=Math.floor(ref/s.field)*s.field;
    SIM.drawLanes(m.querySelector('#fld'),[lanes()[6],lanes()[7],lanes()[9],lanes()[10]],{labelW:200,range:[f0,f0+30*s.H]});
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:220}); };
  SIM.on('time',draw); }
/* ---------------- block diagram ---------------- */
const BLOCKS={
  sw:{x:20,y:20,w:200,h:76,t:'Switch board AVS-24-2',s:['SW1–SW17 lit buttons','P1–P3 ribbons → H1–H3'],d:'17 illuminated push buttons on their own board (AVS-24-2). The PIC scans them in three groups (sel0/sel1/sel2) and the CPLD drives their lamps (sw1..sw17, active low).'},
  pic:{x:280,y:20,w:220,h:76,t:'PIC16C63A / 16C73A',s:['ravv101.asm, 4.9152 MHz '+'(inferred)','button scan, registers, UART'],d:'Runs MAIN every ≈ 7.5 ms: input, debounce, led_ctrl, switch_ctrl, chirp, led_output, switch_output, UART. Owns RB7 sft_dat, RB5 led_clk, RB2 strb, RB3 ARM, RB6 FORCE.'},
  ee:{x:280,y:130,w:220,h:56,t:'93C66 EEPROM (U24)',s:['nonvol_sw1/2, display bytes'],d:'Microwire EEPROM on PORTC (ewen, with_address, shift_nonvol, shift_read).'},
  ser:{x:20,y:130,w:200,h:76,t:'Serial port J3A',s:['DS75176 ×2 (RS-422)','later DS14C232 (RS-232)'],d:'0xCF frames from the remote panel (remv102.asm / remv103.asm). The manual of the custom build documents RS-232 with an ASCII protocol; the functional diagram says RS-422.'},
  cpld:{x:560,y:20,w:230,h:110,t:'EPM7128S CPLD (U20)',s:['36-bit shift register (clkled)','sw latch 17 (strb)','X latch 36 (FORCE # :76)','node :76 = DFF(ARM, VSYNCH)'],d:'The crosspoint memory. The PIC can shift freely; nothing reaches the crosspoints until FORCE or the armed vertical-sync flip-flop opens the X latch.'},
  sync:{x:560,y:170,w:230,h:56,t:'LM1881 sync separator (U19)',s:['vertical out → VSYNCH pin 2'],d:'Reference from video output 1 (inferred). Not fitted on an RA24.'},
  vx:{x:850,y:20,w:220,h:76,t:'Video crosspoint',s:['6 × HA4314 (4 × 1)','/EN + A0/A1 from X27–X36'],d:'Three HA4314 per output, one per group of four inputs; their outputs are wired-OR.'},
  va:{x:1120,y:20,w:180,h:76,t:'EL2044 × 2',s:['2 × 75 Ω feeds per output','LVL1/LVL2 trims'],d:'Video output amplifiers with back-termination (75R) and level/HF trims (500R + 2–25 pF).'},
  ax:{x:850,y:130,w:220,h:76,t:'Audio crosspoint',s:['24 × 74HC4052','per input: off / bus 1 / bus 2'],d:'Each input has a pair of dual 4-channel muxes addressed by AX1-n/AX0-n (X1–X24). An input can sit on one bus only.'},
  ab:{x:1120,y:130,w:180,h:76,t:'Bus select + outputs',s:['4 × 74HC4053 (RX0/RX1)','8 × NE5532'],d:'RX0 lets OUT1 listen to bus 2, RX1 lets OUT2 listen to bus 1 — the firmware uses this when both outputs want the same input.'},
  rear:{x:850,y:260,w:450,h:56,t:'Rear: AVS-24-3 terminal board + BNCs',s:['14 × 2 Phoenix 3-pin (12 in + 2 out, L/R)','16 BNC (12 in, 2 × 2 out)'],d:'TB1/TB2 rows on the AVS-24-3 board (“TERMINAL BLOCKS ON SOLDER SIDE”).'},
  psu:{x:20,y:250,w:200,h:66,t:'Power',s:['T1 toroid 110/220','LM317/LM337, 2 × LM7805, MC34164'],d:'Linear supply: ± rails for audio/video, +5 V logic, a reset supervisor.'},
  rem:{x:280,y:250,w:220,h:66,t:'Remote panel / sister units',s:['REMV102 (RAV24), REMV103 (RA24)','plugins: RAV24, RA24'],d:'The same board is built as the RAV24 (audio + video) or the RA24 (audio only, video parts not fitted). Each has a remote-panel firmware that sends 0xCF frames. Open the RAV24 and RA24 plugins for the operator side.'},
};
const WIRES=[['sw','pic','scan'],['pic','sw',''],['pic','cpld','data/clk/strb/ARM/FORCE'],['ee','pic',''],['ser','pic','RX/TX'],['sync','cpld','VSYNCH'],['cpld','vx','X27–X36'],['vx','va',''],['cpld','ax','X1–X24'],['ax','ab','bus 1/2'],['cpld','ab','X25 X26'],['va','rear',''],['ab','rear',''],['cpld','sw','sw1..17'],['rem','ser','0xCF'],['psu','pic','']];
function viewBlock(m){ window.__avsActive=false; blockView(m,BLOCKS,WIRES,'cpld',[1320,330],'');
  const gd=m.querySelector('.grid2'); if(gd) gd.style.gridTemplateColumns='minmax(0,1fr)';
  m.insertAdjacentHTML('beforeend','<div class="grid2">'+card('The archive’s own drawing',`<div style="background:#fff;border-radius:8px;padding:6px"><img src="${ASSET}avs-functional.svg" alt="RAV24 audio video router functional diagram" style="width:100%;display:block"></div><p class="small muted">RAV24-AVS FUNCTIONAL DIAGRAM.cdr (Sept 2003), converted with Inkscape: 12 audio inputs on two stereo buses, 12 video inputs on two video buses, CONTROL with FRONT PANEL, NON-VOL RAM and “RS-422 SERIAL CONTROL”. RAV24-AVS.cdr is a byte-identical copy.</p>`)
  +card('In one sentence',`<p>A PIC scans 17 buttons and shifts 36-bit words into an EPM7128S; the CPLD holds 24 audio-mux, 2 bus-select and 10 video-crosspoint lines, and only lets a video change through on the LM1881's vertical-sync edge.</p>`)+'</div>'); }
/* ---------------- schematics (redrawn) ---------------- */
const BOARDPIN={data:80,clkled:84,strb:77,ARM:1,VSYNCH:2,FORCE:81,sw1:54,sw2:57,sw3:56,sw4:58,sw5:61,sw6:60,sw7:63,sw8:64,sw9:65,sw10:67,sw11:68,sw12:69,sw13:70,sw14:73,sw15:74,sw16:76,sw17:75,
  X1:22,X2:21,X3:25,X4:24,X5:28,X6:27,X7:30,X8:29,X9:33,X10:31,X11:35,X12:34,X13:37,X14:36,X15:41,X16:40,X17:45,X18:44,X19:49,X20:48,X21:51,X22:50,X23:55,X24:52,X25:18,X26:20,X27:9,X28:8,X29:17,X30:15,X31:11,X32:5,X33:4,X34:16,X35:12,X36:10};
const SHEETS=[
  {name:'1 · CPLD U20', note:'Pin numbers from CHIP avs24tt in AVS24TT.ACF (the board map; the 2006 compile in avs24.rpt let the fitter choose pins). Logic from the EQUATIONS section of avs24.rpt.', svg:()=>{
    let s=chip(200,40,200,'U20 EPM7128SLC84-6',[['80 data','sft_dat'],['84 clkled','led_clk'],['77 strb','strb'],['1 ARM','ARM'],['2 VSYNCH','LM1881 V'],['81 FORCE','FORCE']],
      Array.from({length:17},(_,i)=>[`${BOARDPIN['sw'+(i+1)]} sw${i+1}`,`SW${i+1} lamp`]),'avs24.gdf · lpm_shiftreg ×36 · lpm_latch 17 + 36');
    s+=txt(570,28,'X outputs (board pin, net):',11,'var(--ink)');
    for(let k=1;k<=36;k++){ const col=Math.floor((k-1)/18), row=(k-1)%18; s+=txt(570+col*140,44+row*12,`${BOARDPIN['X'+k]} X${k} ${xName(k)}`,8,'var(--accent2)'); }
    s+=txt(40,392,'sw(k) = strb ? dffs(k−1) : sw(k)',11,'var(--ink2)')+txt(40,408,'X(k) = (FORCE # :76) ? dffs(k−1) : X(k)',11,'var(--ink2)')+txt(40,424,':76 = DFFE(ARM, ↑VSYNCH, clrn = ARM)',11,'var(--ink2)')+txt(40,440,'dffs35 ← data, dffs(k) ← dffs(k+1) on ↑clkled',11,'var(--ink2)');
    return s; }},
  {name:'2 · PIC, EEPROM, serial', note:'Port use from ravv101.asm (equ lines, INIT, sft_out, shift_nonvol). DS75176 ×2 from the AVS24-2.PCB value text; RS-232 parts (MAX232 in RAV24ISS3/4.DSN, DS14C232 in Avs24-4.pcb) belong to later issues.', svg:()=>
    chip(300,50,220,'U21 PIC16C63A (code: 16C73A)',[['RA0–RA4','button returns'],['RA5 sel0','scan group 1'],['RB0 sel1','scan group 2'],['RB1','button return'],['RB2 strb','→ U20-77'],['RB3 ARM','→ U20-1'],['RB5 led_clk','→ U20-84'],['RB6 FORCE','→ U20-81'],['RB7 sft_dat','→ U20-80']],
      [['RC0 sel2','scan group 3'],['RC1 DO','← 93C66 DO'],['RC2 CS','→ 93C66 CS'],['RC3 CLK','→ 93C66 SK'],['RC4 DI','→ 93C66 DI'],['RC5','“BSF PORTC,5” (v101)'],['RC6 TX','→ DS75176 D'],['RC7 RX','← DS75176 R'],['OSC1/2','X1 4.9152 MHz '+'(inf.)']],'MPASM, OTP')
    +chip(640,330,120,'U24 93C66',[['CS',''],['SK',''],['DI',''],['DO','']],[],'Microwire 4 kbit')+chip(140,330,140,'U22/U23 DS75176',[['D','TX'],['R','RX'],['DE/RE','']],[['A/B','J3A pairs']],'RS-422 ×2')
    +txt(40,450,'RC5 is set in INIT of v101 “to allow for serial communication” — it most likely enables a transceiver (inferred).',11,'var(--ink2)')},
  {name:'3 · Video crosspoint (one output)', note:'Three HA4314 per output, enables and addresses from video1_table1/2 and video2_table1/2. Output stage values (680R 1 %, 330R 1 %, 75R, 500R trim, CV 2–25 pF) are the value texts of AVS24-2.PCB; the topology between them is inferred.', svg:()=>{
    let s=''; ['1–4','5–8','9–12'].forEach((g,i)=>{ const x=120+i*250, y=40; s+=chip(x,y,110,`HA4314 (in ${g})`,[['IN0',`IN ${i*4+1}`],['IN1',`IN ${i*4+2}`],['IN2',`IN ${i*4+3}`],['IN3',`IN ${i*4+4}`],['A0','X31/X35'],['A1','X33/X36'],['/EN',['X28/X27','X29/X34','X32/X30'][i]]],[['OUT','']],i?'':'OUT1 / OUT2 nets'); s+=wire([[x+144,y+22],[x+160,y+22],[x+160,240]]); });
    s+=wire([[280,240],[780,240],[780,270],[420,270],[420,312]])+net(300,232,'wired-OR video bus (one chip enabled at a time)');
    s+=opamp(420,300,'EL2044')+res(480,300,600,300,'75R','feed A')+wire([[540,300],[540,380]])+res(540,380,660,380,'75R','feed B')+net(610,300,'BNC OUT A')+net(670,380,'BNC OUT B');
    s+=res(450,330,450,390,'680R 1%','')+res(450,390,450,440,'330R 1%','')+gnd(450,440)+txt(620,420,'LVL trim 500R + CV 2–25 pF',11)+txt(620,440,'LM1881 ← OUT1 (inferred)',11,'var(--accent2)'); return s; }},
  {name:'4 · Audio crosspoint (one input, one leg)', note:'Two 74HC4052 per input (“24 X 74HC4052N”), address B/A = AX1-n/AX0-n. Codes from audio1_table (01 = bus 1) and audio2_table (11 = bus 2). Which sections carry hot/cold and L/R is inferred.', svg:()=>
    chip(120,60,170,'74HC4052 (input n, L)',[['X','IN n L+'],['Y','IN n L−'],['A','AX0-n = X2n'],['B','AX1-n = X2n−1'],['/INH','GND']],[['X0/Y0','(off)'],['X1/Y1','bus 1'],['X2/Y2','(unused)'],['X3/Y3','bus 2']],'one of 24')
    +chip(520,60,170,'74HC4053 (OUT1 L)',[['X0','bus 1 L'],['X1','bus 2 L'],['A','RX0 = X26']],[['X','→ NE5532']],'4 of these: OUT1/OUT2 × L/R')
    +chip(520,240,170,'74HC4053 (OUT2 L)',[['X0','bus 2 L'],['X1','bus 1 L'],['A','RX1 = X25']],[['X','→ NE5532']])
    +opamp(760,120,'NE5532')+txt(40,420,'Manual: unity gain, +27 dBu max in/out, 40 kΩ balanced in, 60 Ω balanced out, < 0.01 % THD+N.',11,'var(--ink2)')},
  {name:'5 · Power', note:'Parts from AVS24-2.PCB (T1 TOROID3, D1–D4 bridge, LM317, LM337, LM7805 ×2, 470/25 reservoirs) and the Avs24-4 value list (MC34164). The 110/220 tap is on the T1 silk; the manual says factory set to 240 V.', svg:()=>
    txt(40,60,'MAINS → PWR SW → T1 toroid (OR/WH/BR/BK, 110/220 taps)',12)+txt(40,90,'→ D1–D4 bridge → 4 × 470 µF/25 V → LM317 (+V) / LM337 (−V): NE5532, EL2044, HA4314',12)
    +txt(40,120,'→ LM7805 (REG5, “HEATSINK REQ’D”): PIC, CPLD, 74HC logic, DS75176, 93C66',12)+txt(40,150,'→ LM7805 (REG1): audio-side logic (inferred)',12)+txt(40,180,'MC34164 (REG4, TO-92): power-on reset for the PIC (inferred role)',12)
    +txt(40,230,'Manual: 120 VAC/60 Hz 10 VA, 240 VAC/50 Hz 6 VA; 19 × 1.75 × 10.75 in, 7.85 lb.',12,'var(--ink2)')},
];
function viewSchem(m){ window.__avsActive=false; schemView(m,SHEETS,'AVS24','Sources: avs24.rpt, AVS24TT.ACF, ravv101.asm, AVS24-2.PCB value texts, RAV24ISS3/4.DSN part names, RAV24MANCUSTOM.WPD. All sheets are REDRAWN, not the original CAD.'); }
/* ---------------- software ---------------- */
function cpldSVG(t){ const C=cpldAt(t), cell=(x,y,v,lab,hl)=>`<rect x="${x}" y="${y}" width="22" height="22" rx="3" fill="${v?'var(--accent)':'var(--panel2)'}" stroke="${hl?'var(--warn)':'var(--line)'}" stroke-width="${hl?2:1}"/><text x="${x+11}" y="${y+15}" text-anchor="middle" font-size="11" fill="${v?'#fff':'var(--ink)'}" font-family="var(--mono)">${v}</text>${lab?`<text x="${x+11}" y="${y-4}" text-anchor="middle" font-size="8.5" fill="var(--ink2)">${lab}</text>`:''}`;
  let s=`<svg viewBox="0 0 1000 400" style="width:100%"><text x="10" y="16" font-size="12" fill="var(--ink2)">|LPM_SHIFTREG:1| — dffs0…35 (data enters at dffs35, shifts toward dffs0 on ↑clkled; clocks this pass: ${C.clocks})</text>`;
  for(let k=0;k<36;k++) s+=cell(10+k*27,40,C.sh[k],k%4===0?k:'',false);
  s+=`<text x="10" y="92" font-size="12" fill="var(--ink2)">|LPM_LATCH:29| sw1…sw17 (gate = strb) → lamps SW1–SW17 (0 = lit)</text>`;
  for(let k=0;k<17;k++) s+=cell(10+k*27,112,C.swL[k],'sw'+(k+1),false);
  s+=`<text x="10" y="164" font-size="12" fill="var(--ink2)">|LPM_LATCH:70| X1…X36 (gate = FORCE # :76) — ${C.gate?'<tspan fill="var(--warn)" font-weight="700">OPEN</tspan>':'closed'}</text>`;
  const prev=D.tx?D.tx.oldX:C.X;
  for(let k=0;k<36;k++) s+=cell(10+k*27,184,C.X[k],k<24?(k%2?'A':'B'):k<26?'RX':'V',C.X[k]!==prev[k]);
  s+=`<text x="10" y="226" font-size="10" fill="var(--ink2)">X1–X24 audio (AX1-n/AX0-n pairs) · X25–X26 RX1/RX0 · X27–X36 video (/EN, A0, A1) · amber outline = changed by the last action</text>`;
  const g=(x,y,lab,on)=>`<rect x="${x}" y="${y}" width="90" height="26" rx="5" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+45}" y="${y+17}" text-anchor="middle" font-size="11" fill="${on?'#fff':'var(--ink)'}">${lab}</text>`;
  s+=g(10,270,'ARM = '+(C.arm?1:0),C.arm)+g(10,320,'VSYNCH = '+(C.vsync?1:0),!C.vsync)+`<rect x="160" y="270" width="140" height="76" rx="6" fill="var(--panel2)" stroke="var(--ink)"/><text x="230" y="290" text-anchor="middle" font-size="12" fill="var(--ink)">node :76 (_LC055)</text><text x="230" y="308" text-anchor="middle" font-size="10" fill="var(--ink2)">D = ARM, clk = ↑VSYNCH</text><text x="230" y="324" text-anchor="middle" font-size="10" fill="var(--ink2)">clrn = ARM</text><text x="230" y="340" text-anchor="middle" font-size="13" font-weight="700" fill="${C.lc055?'var(--warn)':'var(--ink)'}">Q = ${C.lc055?1:0}</text>`
    +wire([[100,283],[160,290]])+wire([[100,333],[160,320]])+g(360,320,'FORCE = '+(C.force?1:0),C.force)+`<path d="M520 280 q30 25 0 50 h-30 q20 -25 0 -50z" fill="${C.gate?'var(--warn)':'var(--panel2)'}" stroke="var(--ink)"/><text x="505" y="350" font-size="10" fill="var(--ink2)">OR2</text>`
    +wire([[300,300],[495,290]])+wire([[450,333],[495,320]])+wire([[548,305],[640,305]])+txt(650,300,`gate → X latch ${C.gate?'transparent':'holding'}`,12)+txt(650,320,'avs24.rpt: X1 = !FORCE & !_LC055 & X1 # FORCE & _LC066 # _LC055 & _LC066 # _LC066 & X1',10,'var(--ink2)');
  return s+'</svg>'; }
function rxSVG(){ const r0=RX0(D.fw), r1=RX1(D.fw), st=[[0,0,'normal','OUT1 ← bus 1, OUT2 ← bus 2'],[1,0,'OUT1 borrows bus 2','both hear OUT2’s input'],[0,1,'OUT2 borrows bus 1','both hear OUT1’s input'],[1,1,'swapped','OUT1 ← bus 2, OUT2 ← bus 1']];
  let s=`<svg viewBox="0 0 760 250" style="width:100%"><defs><marker id="rxa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  const pos=[[20,90],[270,10],[270,170],[520,90]];
  st.forEach(([a,b,n,d],i)=>{ const [x,y]=pos[i], on=a===r0&&b===r1; s+=`<rect x="${x}" y="${y}" width="220" height="62" rx="8" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+10}" y="${y+20}" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">RX0 ${a} RX1 ${b}: ${n}</text><text x="${x+10}" y="${y+40}" font-size="10.5" fill="${on?'#eef':'var(--ink2)'}">${d}</text>`; });
  const ar=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#rxa)"/><text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="9.5" fill="var(--ink2)">${l}</text>`;
  s+=ar(180,90,270,50,'setup_1')+ar(270,58,190,96,'nxt_audio1_chck')+ar(180,152,270,190,'setup_2')+ar(270,182,190,148,'nxt_audio2_chck')+ar(490,50,560,90,'switch1_setup')+ar(490,190,560,152,'switch2_setup')+ar(520,110,490,60,'setup_1 (via check2)')+ar(520,140,490,190,'setup_2 (via check1)');
  return s+'</svg>'; }
function viewSoft(m){ window.__avsActive=false;
  m.innerHTML=`${card('The CPLD at the playhead (avs24.rpt equations, simulated cell by cell)',`<div id="cp"></div>`)}
   <div class="grid2">${card('PIC MAIN — ravv101.asm (running step follows the playhead)',`<div id="lp"></div>`)}${card('Audio bus state (switch_4 bits 6/7) — do_audio1 / do_audio2',`<div id="rx"></div><p class="small muted">An input's 4052 pair holds one 2-bit code, so it can be on bus 1 or bus 2 but not both. When both outputs want the same input the firmware erases one bus and points that output at the other bus. A port of the branches was run on 200 000 random sequences of presses: every one ended with each output hearing exactly the input it asked for.</p>`)}</div>
   <div class="grid2">${card('X-line map (firmware register → CPLD output → board)',`<div id="xm" class="scroll" style="max-height:420px"></div>`)}<div>${card('switch_1 … switch_5 now',`<div id="sr"></div>`)}${card('Remote frame map (translate_uart / remv102.asm)',tbl(['Byte','Bits','Meaning'],[['1','1100 1111','0xCF address byte'],['2','b0–b3','source 1–12 (0 acts as 1, ≥ 13 ignored)'],['2','b4 / b5','switch audio / switch video'],['2','b6','0 = OUTPUT 1, 1 = OUTPUT 2'],['2','b7','update display (move the panel to that output)'],['2','0x00','status request → check_aud1, check_aud2']],true))}</div></div>`;
  const draw=()=>{ const t=SIM.t, n=passOf(t), ph=(t-n*PASS)/TCY; let acc=0, hot=0; ROUT.forEach((r,i)=>{ if(ph>=acc) hot=i; acc+=r[1]; });
    m.querySelector('#cp').innerHTML=cpldSVG(t);
    m.querySelector('#lp').innerHTML=loopSVG(ROUT.map(r=>({t:r[0],s:[`${r[1]} cycles`,r[0]==='led_output'&&armedSkip(n)?'skipped: ARM high':SIM.fmtDur(r[1]*TCY)]})),hot,`pass ${n}`);
    m.querySelector('#rx').innerHTML=rxSVG();
    const X=Xat(t), prev=D.tx?D.tx.oldX:X;
    m.querySelector('#xm').innerHTML=tbl(['X','board pin','register bit','meaning','now'],Array.from({length:36},(_,i)=>[`X${i+1}`,BOARDPIN['X'+(i+1)],xReg(i+1),xName(i+1),`<b${X[i]!==prev[i]?' style="color:var(--warn)"':''}>${X[i]}</b>`]),true);
    m.querySelector('#sr').innerHTML=tbl(['register','hex','bits'],D.fw.sw.map((v,i)=>[`switch_${i+1}`,hx2(v),`<span class="mono">${b8(v)}</span>`]).concat([['erase1_1..3',D.fw.e1.map(hx2).join(' '),''],['erase2_1..3',D.fw.e2.map(hx2).join(' '),'']]),true); };
  SIM.on('time',draw); }
/* ---------------- findings ---------------- */
function viewNotes(m){ window.__avsActive=false;
  m.innerHTML=card('What the AVS files show — findings',`<ol>
   <li><b>The CPLD is an EPM7128S, not an EPM7256S.</b> The archive README (and the RAV24 plugin) read “EPM7256SQC208-7” from <span class="mono">AVS24.ACF</span>, but that is only the first line of its DEFAULT_DEVICES list. <span class="mono">avs24.rpt</span> fits <b>EPM7128SLC84-6</b> (90/128 cells, 60/64 I/O, “less than 20 % of pins available”), the PCB silk says “EPM7128S” on a PLCC-84 socket, and the older OrCAD sheets (<span class="mono">RAV24ISS3/4.DSN</span>) still name an EPM7096.</li>
   <li><b>Vertical-interval switching is two cells of logic.</b> Node <span class="mono">:76</span> = DFFE(D = ARM, clock = VSYNCH, clear = ARM) and every X output is a latch with gate <span class="mono">FORCE # :76</span>. The PIC raises ARM, the next LM1881 edge opens the latch, and dropping ARM clears it.</li>
   <li><b>FORCE always wins.</b> <span class="mono">switch_output</span> pulses FORCE when it drops ARM, ${VID_NUM-1} passes (≈ ${SIM.fmtDur((VID_NUM-1)*PASS)}) later. With sync present the latch already took the word on the VSYNCH edge, so FORCE re-latches the same bits. With no sync on the reference (or on an RA24, where the LM1881 is not fitted) the cut simply happens at FORCE, anywhere in the picture.</li>
   <li><b>The ARM window is sized to catch one field.</b> ${VID_NUM-1} passes ≈ ${SIM.fmtDur((VID_NUM-1)*PASS)} is longer than a 525-line field (${SIM.fmtDur(STD.NTSC.field)}) and a 625-line field (20 ms), so one VSYNCH edge always falls inside it, for either standard.</li>
   <li><b>Audio switched with video also waits for the vertical interval.</b> The 36-bit X latch is one latch: in A/V mode the new 74HC4052 addresses arrive on the same VSYNCH edge. Audio-only changes go out on the FORCE pulse at once, at any point of the waveform — so the manual's “click less audio switching” comes from the CMOS muxes, not from any zero-cross timing (${inf}).</li>
   <li><b>The lamps freeze during a video cut.</b> <span class="mono">led_output</span> returns at once while ARM is high, so for ≈ ${SIM.fmtDur((VID_NUM-1)*PASS)} the button lamps and the breakaway chirp stop updating.</li>
   <li><b>19 wasted bits every pass.</b> The LED latch takes only the first 17 bits (<span class="mono">led_1</span>, <span class="mono">led_2</span>, <span class="mono">led_3,7</span>); <span class="mono">led_4</span> and the 4 bits of <span class="mono">led_5</span> are shifted for nothing — about ${19*10} instruction cycles a pass.</li>
   <li><b>The X-line names in the CPLD files do not match the firmware.</b> The GDF annotates AX0-n/AX1-n, RX0/RX1 and contiguous VX0..VX4-1 / VX0..VX4-2. The firmware's bit use is interleaved: OUT1 video = X28, X29, X31, X32, X33 and OUT2 video = X27, X30, X34, X35, X36; it calls switch_4,6 “RX0” (= X26) and switch_4,7 “RX1” (= X25), while <span class="mono">AVS24TT.ACF</span> places RX0 on X25's pin 18 (${inf}: the TT pin map is the board's).</li>
   <li><b>AVS24TT (Oct 2005) is a different, unfinished design.</b> Its X latch gate is <span class="mono">ARM # FORCE</span> — no VSYNCH flip-flop at all (“Reserved unused input pin 'VSYNCH'”) — and the compile ends “Error: No fit found”, with warnings for stale RX0/RX1/VX… pin assignments that share pins with X25–X36.</li>
   <li><b>The 2006 compile ignores the board pinout.</b> <span class="mono">AVS24.ACF</span> has no CHIP block, so <span class="mono">avs24.rpt</span> placed pins freely (sw1 on pin 20, data on pin 10…) while the board map in AVS24TT.ACF has sw1 on 54 and data on 80. A POF built from that report would not drive this PCB correctly (${inf}).</li>
   <li><b>The archive's only CPLD simulation covers the LEDs.</b> <span class="mono">AVS24.SCF</span> (March 1998) lists strb, data, clkled and sw17…sw1 — the X latch and the VSYNCH path were never simulated in a saved waveform.</li>
   <li><b>Video table comments run 1, 3, 2, 4.</b> <span class="mono">video1_table1/2</span> and <span class="mono">video2_table2</span> are commented “video1, video3, video2, video4…”, while the bits they set give the HA4314 address A0 + 2·A1 in plain button order — the comments most likely record the board's crossed A0/A1 wiring to the chips (${inf}).</li>
   <li><b>INIT writes switch_4/switch_5 twice</b> (0x3D/0x40, then 0x8D/0x4F a few lines later): a leftover. Only the second pair matches the start state (both outputs on input 1, RX1 = 1 so OUT2 shares bus 1).</li>
   <li><b>translate_uart quirks.</b> The branch label <span class="mono">CF_is_okay</span> is taken for every byte that is <i>not</i> 0xCF; a source nibble of 0 behaves as source 1 (the <span class="mono">addwf PCL / nop / retlw</span> tables return entry 1 for both); values ≥ 13 are rejected.</li>
   <li><b>ravv101.asm says it is “for the Audio Switcher”.</b> The header was copied from the remote/RA24 files; the code is the RAV24's A/V firmware (it has sw_vid_1/2 and ARM). The remote firmware <span class="mono">remv102.asm</span> has the same header text.</li>
   <li><b>Serial interface drifted.</b> The functional diagram says RS-422; AVS24-2.PCB has two DS75176 RS-485/422 transceivers; the ISS3/ISS4 OrCAD sheets add a MAX232, Avs24-4.pcb (2003) a DS14C232, and the custom manual documents RS-232 on pins 2, 3, 5, 9.</li>
   <li><b>PIC part numbers disagree.</b> Silk: PIC16C63A. Code: <span class="mono">LIST P=16C73A</span> (the 16C73A adds the A/D that <span class="mono">re_init</span> switches off through ADCON1 every pass). Both are 28-pin and pin-compatible.</li>
   <li><b>Duplicates and mislabels in PCB/.</b> <span class="mono">RAV24ISS.PCB</span> is <span class="mono">AVS24.PCB</span> (ISSUE.1) with its records in a different order — identical once sorted. <span class="mono">AVS24-2.PCB</span> (ISSUE.2) adds D5/D6 and swaps the LVL pots for TRIM1 footprints. <span class="mono">Avs24-3.p01</span> = <span class="mono">Avs24-3.pcb</span> byte for byte. <span class="mono">Avs24-3.bom</span> is titled “D8205” and lists 565 designators with no values. <span class="mono">RAV24-AVS.cdr</span> and <span class="mono">RAV24-AVS FUNCTIONAL DIAGRAM.cdr</span> are byte-identical.</li>
   <li><b>One board, two products.</b> The panel silk reads “12X2 AUDIO\\VIDEO SWITCHER AVS-24-1”, and the video section carries “DO NOT INSTALL ON RA24”: the RA24 is this board without HA4314s, EL2044s and the LM1881. <span class="mono">AVS24.WAS</span> holds one rename record (“D8 LVL1 / D7 LVL2”).</li>
   <li><b>The web page sends bad frames for inputs 10–12.</b> <span class="mono">RAV24V1.c</span> builds <span class="mono">"#000D%d%dE%d%d$"</span> with <span class="mono">%d</span>, so source 10 prints “10” instead of the protocol's “a”, which shifts every later field. The same file e-mails each change through a hard-coded SMTP server and staff address (not reproduced here).</li>
   <li><b>The bus-borrowing scheme is sound.</b> A JavaScript port of <span class="mono">do_audio1/do_audio2</span> (erase_aud, audio_set_table, RX0/RX1) was driven with 200 000 random press sequences; every output always heard exactly one input, the one it asked for.</li>
  </ol>`)
  +card('Assumptions in this simulation',`<ul class="small">
   <li>Fosc 4.9152 MHz (from SPBRG = 7 at 9600 baud); cycle counts per routine estimated from the listing; the pass length is held constant even in the shorter armed passes (${inf}).</li>
   <li>The LM1881 takes its sync from video output 1, and its vertical pulse starts on line ${STD.NTSC.vs+1} and lasts ${SIM.fmtDur(LM_W)} (datasheet typical) (${inf}).</li>
   <li>Mapping of HA4314 chips and 74HC4052 columns to inputs and outputs follows the BNC order and trim positions on the PCB (${inf}); the 4052 codes 00 = off, 01 = bus 1, 11 = bus 2 come from the firmware tables.</li>
   <li>Lamp states use the firmware's LED-register layout (led_1 = AUDIO VIDEO A/V OUT1 OUT2 S1 S2 S3 …); in A/V mode the tally shows the video source with the audio chirping (as in the RAV24 manual's breakaway description).</li>
   <li>Front panel drawn from the AVS-24-2 switch positions; the 1999 front DWG (AVS24FRT.BAK) could not be converted. Rear panel from AVS24RER.BAK dimensions; which BNC is which follows the 2015 RAV24 silk (${inf}).</li>
  </ul>`)
  +card('Sources',`<ul class="small mono"><li>XXX - AVS - #OBSOLETE #Archive/avs24.rpt, avs24tt.rpt, AVS24.GDF, AVS24TT.GDF, AVS24.ACF, AVS24TT.ACF, AVS24.SCF, AVS24.HIF, AVS24.WAS</li><li>…/PCB/AVS24-2.PCB (→ assets/avs-pcb.svg), AVS24.PCB, RAV24ISS.PCB, Avs24-3.pcb/.p01/.bom, Avs24-4.pcb</li><li>…/AVS24RER.BAK (rear-panel DWG, via libredwg), RAV24-AVS FUNCTIONAL DIAGRAM.cdr (→ assets/avs-functional.svg)</li><li>…/RAV24/V101/ravv101.asm, remv102.asm; RAV24/V100/OLD/AVS1V100.ASM; RAV24/RAV24ISS3.DSN, RAV24ISS4.DSN</li><li>…/Custom Rav24 Dec 21/RAV24MANCUSTOM.WPD; RAV24V1.c; RAV24 Control Interface Feb 29 04.html</li></ul>`); }
/* ---------------- register ---------------- */
FACT=JSON.parse(JSON.stringify(D));
SIM.register({
  id:'avs', name:'AVS · AVS24 12 × 2 audio/video switcher board with CPLD crosspoint (1998|31–2006|39)', duration:1, product:'AVS', year:1998, family:'Obsolete products', folder:'#AV #SERIES/XXX - AVS - #OBSOLETE #Archive',
  summary:'The AVS24 is the board inside the RAV24 and RA24 routing switchers: a PIC scans 17 buttons and shifts 36-bit words into an Altera EPM7128S that holds the audio-mux, bus-select and video-crosspoint lines. This model runs the CPLD gate by gate from the compiler report and the PIC firmware branch by branch, so every press can be followed down to the LM1881 edge where the video cuts.',
  highlights:['Real AVS24-2 PCB redrawn from the Tango-PCB file, with clickable parts','CPLD simulated from the avs24.rpt equations: shift register, LED latch, X latch, ARM/VSYNCH flip-flop','Vertical-interval cut traced to the field and line, with the FORCE fallback when sync is lost','Audio bus borrowing (RX0/RX1) ported from do_audio1/2','RAV24 and RA24 builds of the same board; 0xCF remote frames'],
  depth:'Full model',
  stepUnits:[{label:'1 main-loop pass',period:()=>PASS},{label:'1 field',period:()=>S().field},{label:'1 video line',period:()=>S().H},{label:'1 shift bit (10 cycles)',period:()=>10*TCY},{label:'1 instruction cycle',period:()=>TCY},{label:'1 ms',period:()=>0.001}],
  zooms:[[1,'1 s'],[0.1,'100 ms (a press)'],[0.04,'40 ms (ARM window)'],[0.01,'10 ms'],[0.002,'2 ms (one burst)'],[0.0005,'500 µs'],[0.00005,'50 µs (bits)']], defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
