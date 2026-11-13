/* =====================================================================
   RD19 — High Density BNC (Amphenol) (Ward-Beck R&D register, Peter, status "?")
   Plugin for the WBS Device Simulator (../siumulation.html)

   The RD19 folder holds one file: Peter/ContactsInterestedinHighDensityBNC.xlsx (25 Nov 2010),
   a one-row list of customer interest (CBC, for use in their trucks; their engineers had begun
   initial QA testing). Personal names in that sheet are deliberately not reproduced.
   The plugin models what the question was about — how many 75 Ω connectors fit on a rear panel,
   and what a connector does to a 3G-SDI edge — using WBS numbers from the archive:
   - #OPENGEAR #SERIES/T6301 README (10× BNC single-slot rear, 7× 75 Ω terminations, 10× 4n7 inductors)
   - XXX - MF6220 … README (20 slots in 2RU; slot pitch 0.650 / 0.670 in alternating)
   - xxx-OBSOLETE …/SERIALBOXX - #mf100/MF100man.wpd and MF100 Rear w REF.jpg (10 cards × 9 BNC in 2RU)
   - RD - HardwareImprovements/M21424Datasheet.pdf (3G-SDI 2.97 Gb/s, 100 m Belden 1694A; HD 200 m; SD 400 m)
   Amphenol HD-BNC dimensions are not in the archive: they are entered as adjustable, inferred values.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
/* ---------- shared view kit (copied into each R&D plugin; no globals) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const infW = why => `<span class="tag-inf" title="Inferred: ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function kv(rows){ return `<table class="kv">${rows.map(r=>`<tr><th>${r[0]}</th><td${r[2]?' class="mono"':''}>${r[1]}</td></tr>`).join('')}</table>`; }
function tbl(head, rows, cls){ return `<table class="kv ${cls||''}"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }
const Y = y => SIM.year(y);
const fmt = (v,d) => (v==null||isNaN(v)) ? '—' : (+v).toFixed(d==null?2:d);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const hex2 = v => (v&0xFF).toString(16).toUpperCase().padStart(2,'0');
const hex3 = v => (v&0x3FF).toString(16).toUpperCase().padStart(3,'0');

/* action log: every user action records the code/document path it follows */
const LOG = { items: [] };
function act(name, fn){
  const trace = []; const tr = s => trace.push(s);
  try { fn(tr); } catch(e){ tr('error: '+e.message); console.error(e); }
  LOG.items.unshift({ t: SIM.t, name, trace });
  if (LOG.items.length > 60) LOG.items.length = 60;
  SIM.refresh();
}
function traceHTML(){
  const e = LOG.items[0];
  return e ? `<div><b>${e.name}</b> <span class="muted">at ${SIM.fmtT(e.t)}</span></div>` + e.trace.map(s=>`<div>→ ${s}</div>`).join('')
           : '<div class="muted">Use the controls. Each step the model takes (and the file or function it comes from) is listed here.</div>';
}
function logHTML(){ return LOG.items.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>'; }

/* generic clickable block diagram */
function blockView(m, B, W, opts){
  opts = opts || {};
  let sel = opts.start || Object.keys(B)[0];
  const vw = opts.w || 760, vh = opts.h || 470;
  m.innerHTML = `<div class="grid2"><div>${card(opts.title||'Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${opts.side? card(opts.sideTitle||'In one sentence', opts.side) : ''}</div></div>`;
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 ${vw} ${vh}" style="width:100%"><defs><marker id="arBD" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l])=>{ const A_=B[a], B_=B[b]; if(!A_||!B_) return; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1);
      const hot = sel===a || sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#arBD)"/>`;
      if (l) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in B){ const b = B[k]; const on = sel===k; const live = b.live && b.live();
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${live?'color-mix(in srgb,var(--accent) 14%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>
        ${(b.s||[]).map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += '</svg>';
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick = ()=>{ sel = g.dataset.b; draw(); });
    const b = B[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d}</p>${b.src?`<p class="small muted mono">${b.src}</p>`:''}`;
  };
  draw();
  SIM.on('time', draw);
}

/* schematic sheets (redrawn, net-label style) */
function chip(x,y,w,name,left,right,sub){
  const n = Math.max(left.length, right.length), h = 26 + n*18;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
function sheetsView(m, SHEETS, label, caption){
  let i = 0;
  m.innerHTML = card(`Schematic set — redrawn from ${label}, not the original CAD`, `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">${caption}</p>`);
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=> b.onclick = ()=>{ i = +b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">${label} · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML = SHEETS[i].note;
  };
  draw();
  SIM.on('time', draw);
}

/* tutorial engine: lessons with live goal checks and hints */
function tutorialView(m, L, st, opts){
  m.innerHTML = `<div class="grid2">
    <div>${card(opts.title, `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card(opts.panelTitle||'The model', `<div id="tpanel"></div>`)}${card('What the model did (last action)', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw = ()=>{
    opts.panel(m.querySelector('#tpanel'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = L.map((l,i)=>`<li style="cursor:pointer;${i===st.i?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<st.i?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick = ()=>{ st.i = +li.dataset.i; draw(); });
    const l = L[st.i]; let ok = false; try { ok = !!l.check(); } catch(e){ ok = false; }
    m.querySelector('#lesson').innerHTML = `<h2>${l.title}</h2>${l.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (l.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(l.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${st.i?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${st.i<L.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick = ()=>{ st.i = Math.max(0, st.i-1); draw(); };
    m.querySelector('#nxt').onclick = ()=>{ st.i = Math.min(L.length-1, st.i+1); draw(); };
    m.querySelector('#rs').onclick = ()=>{ opts.reset(); st.i = 0; draw(); };
  };
  SIM.on('time', draw);
}

/* small helpers for the timeline */
function laneText(c, X, t0, y, h, s, col){ c.fillStyle = col || SIM.css('--ink2'); c.font = '11px '+SIM.css('--sans'); c.fillText(s, X(t0)+6, y+h/2+4); }
function bandAt(c, X, a, b, y, h, col, alpha, label){ c.fillStyle = col; c.globalAlpha = alpha==null?.6:alpha; c.fillRect(X(a), y+3, Math.max(1, X(b)-X(a)), h-6); c.globalAlpha = 1; if (label && X(b)-X(a) > c.measureText(label).width+8){ c.fillStyle = '#fff'; c.font = '10px '+SIM.css('--sans'); c.fillText(label, X(a)+4, y+h/2+3); } }
/* bind [data-a] buttons inside root to a map of functions */
function bindActs(root, map){ root.querySelectorAll('[data-a]').forEach(b=>{ const f = map[b.dataset.a]; if (f) b.onclick = e=>{ e.preventDefault(); f(b.dataset.v, b); }; }); }

/* ================= product model ================= */
const IN = 100;                         // drawing units per inch
const SLOT = 0.66, RU = 1.75;           // openGear slot pitch (0.650/0.670 avg), rack unit
const CONN = {
  bnc:  { name:'Standard BNC', pitch:0.56, body:0.39, src:'pitch from T6301: 10 BNC in a 0.66 in × ~3.1 in slot, 2 staggered columns (inferred)' },
  hd:   { name:'HD-BNC (Amphenol)', pitch:0.33, body:0.24, src:'not in the archive — adjustable estimate (inferred)' },
};
const RATES = { '3G':{name:'3G-SDI', br:2.97e9, reach:100}, 'HD':{name:'HD-SDI', br:1.485e9, reach:200}, 'SD':{name:'SD-SDI', br:270e6, reach:400} };
const D = { type:'bnc', hdPitch:0.33, rows:2, rate:'3G', zConn:68, lenMM:20, cable:30, frameRU:2, mated:new Set([0,1,2]), sel:0 };
function reset(){ Object.assign(D,{type:'bnc',hdPitch:0.33,rows:2,rate:'3G',zConn:68,lenMM:20,cable:30,frameRU:2,sel:0}); D.mated=new Set([0,1,2]); LOG.items=[]; SIM.refresh(); }
const pitch = t => t==='hd' ? D.hdPitch : CONN.bnc.pitch;
function perSlot(t){ const usableH = 2*RU - 0.4; const cols = t==='hd' ? 2 : 2; const rowsN = Math.floor(usableH / (pitch(t)*(t==='hd'?1:1)) ) ; return t==='bnc' ? 10 : Math.min(cols*rowsN, 2*Math.floor(usableH/pitch(t))); }
function density(){ const b=perSlot('bnc'), h=perSlot('hd'); return { b, h, bFrame:b*20, hFrame:h*20, mf100:90, ratio:h/b }; }
/* connector as a short 75 Ω-mismatched line: reflection and return loss */
const gamma = ()=> (D.zConn-75)/(D.zConn+75);
const tdConn = ()=> D.lenMM*1e-3/ (3e8*0.66);           // ~ PTFE dielectric, velocity 0.66 c (inferred)
const RL = ()=> -20*Math.log10(Math.abs(gamma())||1e-9);
/* received 3G eye at time t: NRZI-ish random bits, with a reflection echo of the edge after 2·Td */
function bitAt(n){ let x = (n*2654435761)>>>0; x ^= x>>>13; x = Math.imul(x, 0x5bd1e995)>>>0; return (x>>>7)&1; }
function wave(t){ const R=RATES[D.rate], ui=1/R.br; const n=Math.floor(t/ui); const tr=ui*0.3;
  const lvl=k=> bitAt(k)?0.4:-0.4; const frac=(t-n*ui)/tr; const v0=lvl(n-1), v1=lvl(n); let v = frac<1 ? v0+(v1-v0)*(0.5-0.5*Math.cos(Math.PI*frac)) : v1;
  if (D.mated.has(D.sel)){ const g=gamma(), d=2*tdConn(); const t2=t-d; const m=Math.floor(t2/ui); if (m>0){ const f2=(t2-m*ui)/tr; const a0=lvl(m-1), a1=lvl(m); const step = f2<1 ? (a1-a0)*(0.5-0.5*Math.cos(Math.PI*f2)) : (a1-a0); v += g*(step - 0)*0.9; } }
  return v; }
const A = {
  type(t){ act('Connector → '+CONN[t].name, tr=>{ D.type=t; const d=density(); tr(`${CONN[t].name}: ${t==='bnc'?d.b:d.h} per openGear slot → ${t==='bnc'?d.bFrame:d.hFrame} per 2RU frame (20 slots)`); tr(t==='hd'?'Pitch '+D.hdPitch+' in is an estimate (no Amphenol drawing in RD19) '+inf:CONN.bnc.src); }); },
  pitch(d){ act(`HD-BNC pitch ${d>0?'+':'−'}0.01 in`, tr=>{ D.hdPitch=+clamp(D.hdPitch+d*0.01,0.2,0.56).toFixed(2); const x=density(); tr(`pitch ${D.hdPitch} in → ${x.h} per slot, ${x.hFrame} per frame (${fmt(x.ratio,2)}× BNC)`); }); },
  rate(r){ act('Signal → '+RATES[r].name, tr=>{ D.rate=r; tr(`UI = ${SIM.fmtDur(1/RATES[r].br)}; M21424 reach on Belden 1694A: ${RATES[r].reach} m`); }); },
  z(d){ act(`Connector impedance ${d>0?'+':'−'}1 Ω`, tr=>{ D.zConn=clamp(D.zConn+d,50,90); tr(`Γ = (${D.zConn}−75)/(${D.zConn}+75) = ${fmt(gamma(),3)} → return loss ${fmt(RL(),1)} dB`); tr(`echo arrives ${SIM.fmtDur(2*tdConn())} after each edge = ${fmt(2*tdConn()*RATES[D.rate].br,2)} UI`); }); },
  len(d){ act(`Discontinuity length ${d>0?'+':'−'}5 mm`, tr=>{ D.lenMM=clamp(D.lenMM+d*5,5,60); tr(`Td = ${SIM.fmtDur(tdConn())} at 0.66 c ${inf}`); }); },
  mate(i){ act(`Connector J${i+1} ${D.mated.has(i)?'unmated':'mated'}`, tr=>{ D.sel=i; if (D.mated.has(i)) D.mated.delete(i); else D.mated.add(i); tr(D.mated.has(i)?'Cable on: the eye below shows this connector’s echo':'Open: the T6301 75 Ω termination (7 fitted) holds the line'); }); },
};

/* ---------------- rear module drawings, to scale (1 in = 100) ---------------- */
function rearSVG(){
  const H=2*RU*IN, W=4*SLOT*IN+60; const types=['bnc','hd']; let s=`<svg viewBox="0 0 ${2*W+40} ${H+60}" style="width:100%;max-width:900px;display:block" role="img" aria-label="Two openGear rear slots, BNC vs HD-BNC, to scale">`;
  types.forEach((t,ti)=>{ const ox=ti*(W+40); const n=t==='bnc'?10:perSlot('hd'); const p=pitch(t)*IN, r=(t==='bnc'?CONN.bnc.body:Math.min(D.hdPitch*0.72,0.3))*IN/2;
    s+=`<rect x="${ox}" y="0" width="${W}" height="${H}" rx="6" fill="var(--dev)" stroke="${D.type===t?'var(--accent)':'var(--line)'}" stroke-width="${D.type===t?4:1}"/>`;
    for (let k=0;k<4;k++){ const x=ox+30+k*SLOT*IN; s+=`<rect x="${x+2}" y="10" width="${SLOT*IN-4}" height="${H-20}" fill="#1b3a2a" stroke="#0d2b18"/>`;
      const perCol=Math.ceil(n/2); for (let b=0;b<n;b++){ const col=b%2, row=Math.floor(b/2); const cx=x+SLOT*IN*(col?0.68:0.32), cy=25+r+(row+col*0.5)*(H-50-2*r)/Math.max(1,perCol-0.5);
        const id=k*100+b; const mated=k===0&&D.mated.has(b)&&t===D.type;
        s+=`<g ${k===0&&t===D.type?`data-a="mate" data-v="${b}" style="cursor:pointer"`:''}><circle cx="${cx}" cy="${cy}" r="${r}" fill="${mated?'#2b5f9e':'#c9b469'}" stroke="#7a5f12" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r*0.35}" fill="#7a5f12"/></g>`; } }
    s+=`<text x="${ox+10}" y="${H+22}" font-size="16" fill="var(--ink)" font-weight="700">${CONN[t].name}: ${n} per slot</text><text x="${ox+10}" y="${H+44}" font-size="13" fill="var(--ink2)">4 slots shown (2.64 in), 2RU = 3.5 in tall</text>`; });
  return s+'</svg>';
}
function eyeSVG(t){
  const R=RATES[D.rate], ui=1/R.br, W=520, Hh=200; let s=`<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">`;
  for (let k=0;k<60;k++){ const n0=Math.floor(t/ui)+k*7; let d=''; for (let i=0;i<=80;i++){ const tt=(n0-0.5+2*i/80)*ui; const v=wave(tt); const x=10+i/80*(W-20), y=Hh/2-v*180; d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1); } s+=`<path d="${d}" fill="none" stroke="var(--accent)" stroke-opacity=".25"/>`; }
  s+=`<text x="10" y="16" font-size="11" fill="var(--ink)">${R.name} eye, 2 UI (${SIM.fmtDur(2*ui)}), through J${D.sel+1} ${D.mated.has(D.sel)?'(mated)':'(open)'} · Γ ${fmt(gamma(),3)} · RL ${fmt(RL(),1)} dB</text></svg>`;
  return s;
}
function lanes(){
  const css=SIM.css, R=RATES[D.rate], ui=1/R.br;
  return [
    {label:'Video fields (1080i 59.94)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1001/60000,0,1001/60000/562.5*20,css('--accent2'),'fields'); }},
    {label:`${R.name} words (${fmt(R.br/(R.name==='SD-SDI'?10:20)/1e6,2)} M/s)`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,(R.name==='SD-SDI'?10:20)/R.br,0,ui,css('--ink2'),'words'); }},
    {label:`${R.name} bits, UI ${SIM.fmtDur(ui)}`, h:36, draw(c,X,t0,t1,y,h){ if ((t1-t0)/ui > 4000){ laneText(c,X,t0,y,h,`${Math.round((t1-t0)/ui).toLocaleString()} bits in view — zoom to “10 ns”`); return; }
      c.strokeStyle=css('--accent'); c.beginPath(); const N=1200; for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const yy=y+h/2-wave(tt)*(h-6)*1.1; i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); }},
    {label:'Connector echo (2·Td after each edge)', h:22, draw(c,X,t0,t1,y,h){ laneText(c,X,t0,y,h,`${SIM.fmtDur(2*tdConn())} = ${fmt(2*tdConn()/ui,2)} UI · amplitude ${fmt(Math.abs(gamma())*100,1)} % of the edge`, Math.abs(gamma())>0.05?css('--warn'):css('--ink2')); }},
  ];
}
function controlsHTML(){ return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
  <button data-a="type" data-v="bnc" class="${D.type==='bnc'?'on':''}">BNC</button><button data-a="type" data-v="hd" class="${D.type==='hd'?'on':''}">HD-BNC</button>
  <span class="small muted">HD pitch ${D.hdPitch} in</span><button data-a="p" data-v="-1">−</button><button data-a="p" data-v="1">+</button>
  ${Object.keys(RATES).map(r=>`<button data-a="rate" data-v="${r}" class="${D.rate===r?'on':''}">${r}</button>`).join('')}
  <span class="small muted">Z ${D.zConn} Ω</span><button data-a="z" data-v="-1">−</button><button data-a="z" data-v="1">+</button>
  <span class="small muted">length ${D.lenMM} mm</span><button data-a="l" data-v="-1">−</button><button data-a="l" data-v="1">+</button><button data-a="rst">defaults</button></div>`; }
function bindAll(r){ bindActs(r,{type:v=>A.type(v),p:v=>A.pitch(+v),rate:v=>A.rate(v),z:v=>A.z(+v),l:v=>A.len(+v),mate:v=>A.mate(+v),rst:()=>reset()}); }
function densTable(){ const d=density(); return tbl(['','per slot','per 2RU frame','per RU'],[
  ['MF100 Serialboxx (BNC)','9','90','45'],['openGear T6301 (BNC)',''+d.b,''+d.bFrame,''+d.bFrame/2],[`openGear HD-BNC ${inf}`,''+d.h,''+d.hFrame,''+d.hFrame/2]]); }
function viewSim(m){
  m.innerHTML = `${card('Two openGear rear slots at 1:1 scale — BNC vs HD-BNC (click a connector on the selected type to mate a cable)', `<div id="rr"></div><div id="cc"></div>`)}
   <div class="grid2"><div>${card('Eye at the playhead', `<div id="eye"></div>`)}${card('Density', `<div id="dn"></div>`)}</div><div>${card('What the model did', `<div id="trace" class="log"></div>`)}${card('The RD19 record', `<p>One spreadsheet, dated 25 Nov 2010|43: a single customer row. The organisation was <b>CBC</b>, “interested in using this product in their trucks. Their engineers have begun doing initial QA testing.” Names in the sheet are not reproduced here.</p>`)}</div></div>
   ${card('Timeline — zoom from fields to single bits', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const rr=m.querySelector('#rr'); rr.innerHTML=rearSVG(); bindAll(rr); const cc=m.querySelector('#cc'); cc.innerHTML=controlsHTML(); bindAll(cc);
    m.querySelector('#eye').innerHTML=eyeSVG(SIM.t); m.querySelector('#dn').innerHTML=densTable(); m.querySelector('#trace').innerHTML=traceHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The question RD19 asked', body:`<p>In late 2010|43 Amphenol’s high-density BNC promised more 75 Ω connections in the same panel space. A truck engineer at CBC was already testing it. Peter opened RD19 to ask: should WBS rear modules use it?</p><p>Two things matter: <b>how many</b> fit, and whether the connector <b>stays 75 Ω</b> at 3G-SDI rates.</p>`, check:()=>true, auto:true },
  { title:'1 · Count today’s BNCs', body:`<p>A T6301 single-slot rear carries 10 BNC; an MF100 card position carries 9. Read the density table.</p><p><b>Goal:</b> select BNC.</p>`, check:()=>D.type==='bnc', hint:'Press BNC.' },
  { title:'2 · Try HD-BNC', body:`<p>Switch to HD-BNC. The connector pitch is an estimate (${inf}); change it and see the slot count move. At 0.33 in pitch a slot holds about twice as many.</p><p><b>Goal:</b> HD-BNC selected, at least 18 per slot.</p>`, check:()=>D.type==='hd'&&perSlot('hd')>=18, hint:'Press HD-BNC; lower the pitch if needed.' },
  { title:'3 · Mate a cable at 3G', body:`<p>Choose <b>3G</b> and click a connector on the HD-BNC slot to mate it. The eye shows the echo from a connector whose impedance is not quite 75 Ω.</p><p><b>Goal:</b> 3G, a mated connector.</p>`, check:()=>D.rate==='3G'&&D.mated.size>0&&D.type==='hd', hint:'Press 3G, then click a connector on the highlighted rear.' },
  { title:'4 · Make it 75 Ω', body:`<p>Raise the connector impedance to <b>75 Ω</b>: the echo disappears and the return loss goes to infinity. A real connector is specified by its return loss up to 3 GHz; the T6301 adds 4n7 inductors per BNC to tune the launch.</p><p><b>Goal:</b> Z = 75 Ω.</p>`, check:()=>D.zConn===75, hint:'Z + until 75.' },
  { title:'Done', body:`<p>The register shows RD19 as “?”: no rear module with HD-BNC exists in the archive. See <b>Findings</b>.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — evaluating HD-BNC', panelTitle:'Rear slots, eye and density', reset, panel(el){ el.innerHTML=rearSVG()+controlsHTML()+eyeSVG(SIM.t)+densTable(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML=card('One second on one 3G-SDI connector', `<div id="lad"></div>`)+card('At the playhead', `<div id="dev"></div>`);
  const draw=()=>{ const R=RATES[D.rate];
    m.querySelector('#lad').innerHTML=tbl(['Event','per second','period'],[['Fields (1080i)','59.94','16.68 ms'],['Lines','33,716','29.66 µs'],[R.name+' words',(R.br/(D.rate==='SD'?10:20)).toLocaleString(),SIM.fmtDur((D.rate==='SD'?10:20)/R.br)],[R.name+' bits',R.br.toLocaleString(),SIM.fmtDur(1/R.br)],['Connector round trip','—',SIM.fmtDur(2*tdConn())+' '+inf]].map(r=>r.map((c,i)=>i?`<span class="mono">${c}</span>`:c)));
    m.querySelector('#dev').innerHTML=kv([['Bit index',Math.floor(SIM.t*R.br).toLocaleString(),1],['Level',fmt(wave(SIM.t),3),1],['Echo',`${fmt(gamma()*100,1)} %`,1],['M21424 reach',R.reach+' m Belden 1694A',1]]); };
  SIM.on('time', draw);
}
function viewBlock(m){
  blockView(m,{
    card:{x:20,y:60,w:180,h:80,t:'openGear card',s:['cable driver / EQ'],d:'e.g. M6203A 3G DA (GS2978 driver) or an M21424 equaliser input.'},
    mec:{x:250,y:60,w:160,h:80,t:'MEC1-150 edge',s:['card ↔ rear'],d:'Edge connector between card and passive rear module (T6301 README).'},
    rear:{x:460,y:60,w:200,h:80,t:'T6301 rear',s:['10 × BNC','7 × 75 Ω, 10 × 4n7'],d:'Passive: terminations and launch-tuning inductors per BNC.'},
    conn:{x:460,y:200,w:200,h:80,t:'BNC or HD-BNC',s:['75 Ω, return loss'],d:'The part RD19 would change. Density vs impedance control.',live:()=>D.type==='hd'},
    cable:{x:240,y:200,w:180,h:80,t:'Belden 1694A',s:[`${RATES[D.rate].reach} m at ${D.rate}`],d:'M21424 equalised reach figures (RD - HardwareImprovements).'},
    truck:{x:20,y:200,w:180,h:80,t:'Truck patch / router',s:['space-limited'],d:'The use case on the RD19 sheet (CBC trucks).'},
  },[['card','mec',''],['mec','rear',''],['rear','conn',''],['conn','cable',''],['cable','truck','']],{start:'conn',h:320});
}
const SHEETS=[{ name:'1 · T6301 channel (one BNC)', note:'From the T6301 README parts list (75 Ω termination, 4n7 inductor, 0.1 µF). Exact topology not traced from T6301-iss4.sch (inferred).', svg:()=>
  chip(120,80,160,'MEC1-150',[['pin n','from card']],[['pin n','SDI_n']],'edge') + `<line x1="314" y1="102" x2="420" y2="102" stroke="var(--ink)"/><path d="M420 102 q8 -10 16 0 q8 -10 16 0 q8 -10 16 0" fill="none" stroke="var(--ink)"/><text x="425" y="85" font-size="11" fill="var(--ink2)">4n7</text><line x1="468" y1="102" x2="600" y2="102" stroke="var(--ink)"/><circle cx="615" cy="102" r="14" fill="none" stroke="var(--ink)"/><text x="640" y="106" font-size="12" fill="var(--ink)">BNC (or HD-BNC)</text><rect x="530" y="130" width="14" height="40" fill="none" stroke="var(--ink)"/><line x1="537" y1="102" x2="537" y2="130" stroke="var(--ink)"/><text x="552" y="155" font-size="11" fill="var(--ink2)">75 Ω (fitted on 7 of 10)</text>` }];
function viewSchem(m){ sheetsView(m,SHEETS,'T6301 parts list','RD19 has no drawings; this is the existing rear channel an HD-BNC would replace.'); }
function viewSoft(m){
  m.innerHTML=card('Reflection arithmetic (what the model computes)', `<div id="ar" class="mono small"></div>`)+card('Density arithmetic', `<div id="da" class="mono small"></div>`);
  const draw=()=>{ m.querySelector('#ar').innerHTML=[`Γ = (Zc − 75)/(Zc + 75) = (${D.zConn} − 75)/(${D.zConn} + 75) = ${fmt(gamma(),4)}`,`RL = −20·log10|Γ| = ${fmt(RL(),2)} dB`,`Td = ${D.lenMM} mm / (0.66 × c) = ${SIM.fmtDur(tdConn())}`,`echo delay 2·Td = ${fmt(2*tdConn()*RATES[D.rate].br,3)} UI at ${RATES[D.rate].name}`].map(x=>`<div>${x}</div>`).join('');
    const d=density(); m.querySelector('#da').innerHTML=[`usable slot height ≈ 2 × 1.75 − 0.4 = 3.1 in`,`HD-BNC: 2 columns × floor(3.1 / ${D.hdPitch}) = ${d.h} per slot`,`× 20 slots = ${d.hFrame} per 2RU (vs ${d.bFrame} BNC, ${d.mf100} on an MF100)`].map(x=>`<div>${x}</div>`).join(''); };
  SIM.on('time',draw);
}
function viewFindings(m){
  m.innerHTML=card('What RD19 decided, and what became of it', `<ol>
    <li><b>Register: RD19 “High Density BNC - Amphenol”, Peter, status “?”.</b> No completion date and no design files.</li>
    <li><b>The whole folder is one contact row</b> (<span class="mono">ContactsInterestedinHighDensityBNC.xlsx</span>, 25 Nov 2010|43, file created from a 2006 template). One customer: CBC, for trucks, already QA-testing. The sheet holds a person’s name; it is not reproduced.</li>
    <li><b>No WBS rear module uses HD-BNC.</b> Every openGear rear in the archive (T62xx, T63xx, T64xx) uses standard BNCs or Phoenix blocks; the 3G variants (T6301A-3G) kept BNC.</li>
    <li><b>The density case was real.</b> openGear already doubled MF100 density (10 vs 5 card positions per RU). HD-BNC would roughly double it again (${inf}: the connector size is not in the archive).</li>
    <li><b>Signal integrity was the open question</b>, and the archive’s answer sits elsewhere: the T6301 tunes each BNC with a 4n7 inductor, and 3G-SDI (2.97 Gb/s, M21424 100 m reach) leaves little margin for a connector echo.</li>
  </ol>`)+card('Assumptions',`<ul class="small"><li>HD-BNC pitch and body size, BNC row pitch and the 0.66 c dielectric are estimates (${inf}).</li><li>The eye is a simple bit-pattern model with one connector echo; no cable loss.</li></ul>`)+card('Sources',`<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD19-HD BNC/Peter/ContactsInterestedinHighDensityBNC.xlsx · R&amp;D_List.xls</li><li>#OPENGEAR #SERIES/T6301 … /README.md · XXX - MF6220 … /README.md · RD - HardwareImprovements/M21424Datasheet.pdf · SERIALBOXX - #mf100/MF100man.wpd</li></ul>`);
}
SIM.register({
  id:'rd19-hd-bnc', name:'RD19 High Density BNC · connector density and 3G-SDI echo model (2010|43)', duration:1,
  product:'RD19 HD BNC', year:2010, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD19-HD BNC',
  summary:'A one-line R&D item (Peter, 2010) asking whether WBS rear modules should move to Amphenol high-density BNC. The model compares connectors per openGear slot and frame, and shows what an imperfect 75 Ω connector does to a 3G-SDI eye.',
  highlights:['Two openGear rear slots at 1:1 scale','BNC vs HD-BNC density per slot, frame and RU','3G / HD / SD eye with connector echo','Return-loss arithmetic live','Privacy-safe summary of the contact sheet'],
  depth:'Hardware model',
  stepUnits:[{label:'1 bit (3G, 337 ps)',period:()=>1/RATES[D.rate].br},{label:'1 word',period:()=>(D.rate==='SD'?10:20)/RATES[D.rate].br},{label:'1 line',period:()=>1001/30000/1125},{label:'1 field',period:()=>1001/60000}],
  zooms:[[1,'1 s'],[1001/60000,'1 field'],[0.00003,'1 line (30 µs)'],[1e-7,'100 ns'],[1e-8,'10 ns (bits)']],
  defaultZoom:4,
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: evaluating HD-BNC',render:viewTutorial},{id:'second',label:'One second, bit by bit',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
