/* =====================================================================
   RD29 — Modularization: "Modularity in products (stand alone options)"
   (Ward-Beck R&D register, Peter/Ali/Sales, priority B — open)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources:
   - RD29 …/ProductFeaturesList.xlsx (sheet "IO", A1:BD52, 16 Nov 2011): 50 product rows × 38 I/O,
     metering, control, power and metadata columns. Parsed cell by cell into the table below.
   - RD29 …/ManagingLargeProjects.pdf ("Modularizing C Code: Managing large projects", 2012)
   - R&D_List.xls (RD29 row), and the POD silkscreen PNGs already cut by the sister plugins
     (assets/pod1-…, pod10a-…, pod33-… etc.), shown for products that have them.
   The model treats each column as an I/O "module" and asks the RD29 question: which few modules,
   built once, would assemble most of the product line, and which stand-alone options they enable.
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
const HDR = {"1": "SDI Input", "2": "SDI Output", "3": "video ref", "4": "BNC input", "5": "BNC output", "6": "Phoenix in", "7": "Phoenix out", "8": "XLR In", "9": "XLR Out", "10": "SRC", "11": "BNC input", "12": "BNC output", "13": "Phoenix input", "14": "Phoenix output", "15": "XLR input", "16": "XLR output", "17": "Differential Speaker Output", "18": "Parallel Surround input", "19": "Parallel surround output", "20": "TRS Input", "21": "TRS Out", "22": "Speaker", "23": "gain", "24": "RCA", "25": "2 chan", "26": "8 chan", "27": "16chan", "28": "Needle Meter", "29": "RS422", "30": "Pushbutton", "31": "LED Indicator", "32": "Rotary Knob", "33": "Indented Rotary Screw", "35": "Char Display", "36": "DB-9 GPIO", "37": "DipSw", "38": "Phoenix style ouput", "40": "DB9 output"};
const PRODS = [["POD1", {"15": "2", "24": "1", "38": "DC Phoenix Output"}], ["POD2", {"13": "12", "14": "2", "29": "1"}], ["POD3A", {"13": "2", "37": "1"}], ["POD4", {"14": "6", "15": "2", "23": "1"}], ["POD5", {"13": "6", "21": "2", "23": "2"}], ["POD6", {}], ["POD8", {"13": "2", "14": "6", "23": "12", "29": "1"}], ["POD9", {"11": "2", "12": "6"}], ["POD10", {"4": "6", "5": "2"}], ["POD11A", {"6": "1", "25": "1", "37": "1"}], ["POD12", {"6": "1", "7": "6", "10": "6", "21": "1"}], ["POD13A", {"4": "2", "6": "2", "14": "4", "37": "1"}], ["POD14A", {"5": "2", "7": "2", "13": "4"}], ["POD15", {"11": "2", "12": "7", "30": "2"}], ["POD16", {"13": "4", "14": "4", "30": "6"}], ["POD17", {"4": "2", "5": "6", "21": "1", "29": "1", "30": "2", "31": "6"}], ["POD18", {"16": "4", "24": "2", "31": "4"}], ["POD19", {"5": "2", "9": "2", "30": "1", "31": "8"}], ["POD20", {"1": "1", "2": "6", "31": "6"}], ["POD21", {"1": "6", "2": "1", "29": "1", "30": "7"}], ["POD22", {"4": "1", "5": "1", "6": "1", "7": "1", "13": "2", "14": "2", "25": "1", "29": "1", "31": "6", "37": "8"}], ["POD24", {"15": "2", "17": "4", "23": "2", "30": "1", "31": "1", "32": "2"}], ["POD25", {"14": "6", "15": "2", "30": "1", "31": "5", "33": "2"}], ["POD26", {"13": "6", "14": "6", "23": "6", "33": "6"}], ["POD27", {"1": "1", "2": "2", "4": "2", "6": "2", "30": "2", "31": "10"}], ["POD28", {"1": "1", "2": "6", "31": "4"}], ["POD29", {"31": "1", "38": "3"}], ["POD30", {"1": "5", "2": "2", "30": "4", "31": "4"}], ["POD31", {"1": "1", "2": "2", "5": "4", "7": "4", "29": "1", "31": "14", "37": "8"}], ["POD32", {"4": "4", "5": "4", "29": "1", "31": "15", "37": "16"}], ["POD33", {"3": "1", "4": "1", "5": "4", "6": "1", "7": "4", "23": "4", "31": "4", "32": "2", "35": "1"}], ["ABB1", {"8": "1", "20": "2", "21": "1", "25": "1", "31": "8", "32": "1", "37": "1"}], ["ABS1", {"8": "1", "9": "1", "21": "2", "30": "8", "31": "10"}], ["MP", {"28": "1, 2, 3, 4"}], ["RLM12/24D", {"4": "24", "6": "24", "26": "6", "29": "1", "36": "1", "37": "8"}], ["SLM", {"4": "1 option", "6": "1 option", "13": "2?", "25": "1"}], ["SLM8", {"4": "4", "13": "4?", "19": "1", "37": "8"}], ["AMS4", {"1": "1", "2": "1", "4": "4", "5": "2", "6": "4", "13": "8", "21": "1", "22": "2", "30": "2", "32": "2", "35": "1"}], ["AMS8-1", {"1": "1", "2": "1", "4": "4", "5": "5", "6": "4", "7": "5", "18": "1", "20": "1", "22": "2", "26": "1", "29": "1", "30": "8", "32": "2", "35": "1", "40": "1"}], ["AMS8-2", {"1": "1", "2": "1", "4": "5", "5": "6", "6": "5", "7": "4", "14": "2", "18": "1", "19": "1", "22": "2", "26": "1", "29": "1", "30": "8", "32": "2", "35": "3", "40": "1"}], ["AMS16", {"1": "2", "2": "2", "5": "10", "19": "1", "21": "1", "22": "2", "27": "1", "30": "10", "32": "1", "40": "1"}], ["AMX6", {"13": "6", "14": "2", "21": "1", "22": "2", "32": "7"}], ["AMX9", {"13": "9", "16": "1", "21": "1", "22": "2", "32": "7"}], ["DMS1", {"1": "1", "2": "1", "4": "1", "8": "1", "15": "2", "16": "2", "21": "1", "25": "1", "30": "8", "32": "1"}], ["QSP2/QSP2D", {"6": "1", "13": "2", "21": "1", "30": "1", "32": "2"}], ["RAV24", {"11": "12", "12": "4", "13": "12", "14": "4", "29": "1", "30": "16"}], ["SMS4A", {"4": "4", "13": "8", "25": "4"}], ["VMS3/VMS33", {"11": "3", "12": "3", "29": "1", "37": "8"}], ["VMS4/VMS44", {"11": "4", "29": "1"}], ["XTM4", {"1": "1", "2": "1", "4": "1", "5": "2", "8": "1", "15": "2", "16": "2", "21": "4", "28": "4", "30": "4", "35": "1"}]];

const GROUPS = [['SDI',1,3],['Digital audio',4,10],['Analog video',11,12],['Analog audio',13,24],['Metering',25,28],['Control',29,37],['Power supply',38,39],['Metadata',40,40]];
const groupOf = c => (GROUPS.find(g=>c>=g[1]&&c<=g[2])||['?'])[0];
const COLS = Object.keys(HDR).map(Number).sort((a,b)=>a-b);
const colName = c => `${groupOf(c)} · ${HDR[c]}`;
const SHORT = {SDI:'SDI','Digital audio':'AES','Analog video':'Vid','Analog audio':'Ana',Metering:'Mtr',Control:'Ctl','Power supply':'Pwr',Metadata:'Meta'};
const sh = c => `${SHORT[groupOf(c)]} ${HDR[c]}`;
const qty = v => { const n=parseInt(v,10); return isNaN(n)?1:n; };
const ASSET = 'siumulation-plugins/assets/';
const ART = { POD1:['pod1-rear-white.png',1714,321,'pod1'], POD10:['pod10a-rear-white.png',1714,321,'pod10a'], POD11A:['pod11a-rear-white.png',1714,321,'pod11a'], POD12:['pod12a-rear-white.png',1714,321,'pod12a'],
  POD13A:['pod13a-rear-white.png',1714,321,'pod13a'], POD14A:['pod14a-rear-white.png',1713,321,'pod14a'], POD15:['pod15a-rear-white.png',1714,321,'pod15a'], POD18:['pod18-rear-white.png',1714,321,'pod18'],
  POD33:['pod33-rear-white.png',1704,311,'pod33'], XTM4:['xtm4-rear-white.png',3419,679,'xtm4'], ABB1:['abb1-rear-white.png',1140,569,'abb1'], ABS1:['abs1-rear-white.png',1330,690,'abs1'],
  AMS16:['ams16-rear-white.png',3447,680,'ams16'], 'AMS8-1':['ams81-rear-white.png',1707,163,'ams81'], 'AMS8-2':['ams82-rear-white.png',3448,679,'ams82'] };
const D = { sel:'POD33', need:{}, cut:3, sort:'use' };
function reset(){ D.sel='POD33'; D.need={}; D.cut=3; D.sort='use'; LOG.items=[]; SIM.refresh(); }
const prod = n => PRODS.find(p=>p[0]===n);
const feats = p => Object.keys(p[1]).map(Number);
function usage(){ const u={}; COLS.forEach(c=>u[c]=0); PRODS.forEach(p=>feats(p).forEach(c=>u[c]++)); return u; }
/* the "module kit": columns used by ≥ cut products */
function kit(){ const u=usage(); return COLS.filter(c=>u[c]>=D.cut); }
function coverage(){ const K=new Set(kit()); let full=0; const per=PRODS.map(p=>{ const f=feats(p); const miss=f.filter(c=>!K.has(c)); if (f.length && !miss.length) full++; return {n:p[0], f:f.length, miss}; }); return {full, per, kit:K}; }
function matches(){ const need=Object.keys(D.need).map(Number); if (!need.length) return [];
  return PRODS.map(p=>{ const have=need.filter(c=>p[1][c]!=null && qty(p[1][c])>=D.need[c]); const extra=feats(p).filter(c=>!(c in D.need)); return {n:p[0], score:have.length/need.length, extra:extra.length}; })
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.extra-b.extra).slice(0,8); }
function sim(a,b){ const A_=new Set(feats(prod(a))), B_=new Set(feats(prod(b))); const i=[...A_].filter(x=>B_.has(x)).length; const u=new Set([...A_,...B_]).size; return u? i/u : 0; }
const A = {
  sel(n){ act('Select '+n, tr=>{ D.sel=n; const p=prod(n); const f=feats(p);
    tr(`${n}: ${f.length} feature columns in ProductFeaturesList.xlsx row ${PRODS.indexOf(p)+3}`);
    f.forEach(c=>tr(`${colName(c)} = ${p[1][c]}`));
    if (!f.length) tr('Empty row: POD6 is listed with no features (RD76 “POD6”, priority A, appears later in the register)');
    const near=PRODS.filter(q=>q[0]!==n&&feats(q).length).map(q=>[q[0],sim(n,q[0])]).sort((a,b)=>b[1]-a[1]).slice(0,3); tr('Closest products by shared columns (Jaccard): '+near.map(x=>`${x[0]} ${fmt(x[1],2)}`).join(', ')); }); },
  need(c, d){ act(`Need ${colName(c)} ${d>0?'+1':'−1'}`, tr=>{ const v=(D.need[c]||0)+d; if (v<=0) delete D.need[c]; else D.need[c]=v; const M=matches(); tr(`Requirement: ${Object.keys(D.need).map(k=>HDR[k]+'×'+D.need[k]).join(', ')||'none'}`); tr(M.length? `Best existing fits: ${M.slice(0,4).map(x=>`${x.n} (${Math.round(x.score*100)} %${x.extra?', +'+x.extra+' unused':''})`).join(' · ')}` : 'No product has any of these'); }); },
  cut(d){ act(`Module threshold ${d>0?'+1':'−1'}`, tr=>{ D.cut=clamp(D.cut+d,1,18); const k=kit(), cv=coverage(); tr(`Module kit = every column used by ≥ ${D.cut} products → ${k.length} modules`); tr(`${cv.full} of ${PRODS.filter(p=>feats(p).length).length} products could be built entirely from the kit`); }); },
};

/* ---------------- panel: the selected product's rear (real silkscreen when a sister plugin cut it) ---------------- */
function rearSVG(){
  const n=D.sel, a=ART[n], p=prod(n);
  if (a){ const [file,w,h,id]=a; return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${h>w?220:980}px;border-radius:8px;display:block;background:var(--dev)" role="img" aria-label="${n} rear silkscreen"><rect width="${w}" height="${h}" fill="var(--dev)"/><image href="${ASSET}${file}" width="${w}" height="${h}"/></svg><p class="small muted">Real rear silkscreen of ${n}, cut from its 2016|49 SILK PDF by the <span class="mono">${id}</span> plugin (assets/${file}).</p>`; }
  // drawn half-rack outline with one glyph per I/O column (inferred layout)
  const f=feats(p); let x=40; let s=`<svg viewBox="0 0 1704 311" style="width:100%;max-width:980px;border-radius:8px;display:block"><rect width="1704" height="311" rx="10" fill="var(--dev)"/><text x="30" y="40" font-size="22" fill="#cfd3d6">${n} — no silkscreen cut yet; connectors drawn from the feature row (${'inferred'} layout)</text>`;
  f.forEach(c=>{ const q=Math.min(qty(p[1][c]),24); const g=groupOf(c); const bnc=/BNC|SDI|video ref/.test(HDR[c]); const xlr=/XLR/.test(HDR[c]);
    for (let i=0;i<q && x<1660;i++){ const col = g==='Control'?'#555':g==='Metering'?'#3fbf5f':bnc?'#c9b469':xlr?'#888':'#1f8a45';
      s += bnc||xlr ? `<circle cx="${x+18}" cy="160" r="${xlr?22:17}" fill="${col}" stroke="#222"/>` : `<rect x="${x}" y="140" width="34" height="40" rx="4" fill="${col}" stroke="#0e4d25"/>`; x+= xlr?50:42; }
    s+=`<text x="${x-40}" y="230" font-size="13" fill="#cfd3d6" transform="rotate(-30 ${x-40} 230)">${HDR[c]}</text>`; x+=16; });
  return s+'</svg>';
}
function matrixHTML(){
  const u=usage(); const K=new Set(kit());
  const cols = D.sort==='use' ? COLS.slice().sort((a,b)=>u[b]-u[a]) : COLS;
  let h=`<div class="scroll" style="max-height:520px"><table class="kv small" style="font-size:11px"><tr><th>Product</th>${cols.map(c=>`<th title="${colName(c)} — used by ${u[c]}" style="writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;${K.has(c)?'color:var(--accent)':''}">${sh(c)} (${u[c]})</th>`).join('')}</tr>`;
  PRODS.forEach(p=>{ const on=p[0]===D.sel; h+=`<tr data-a="sel" data-v="${p[0]}" style="cursor:pointer;${on?'background:color-mix(in srgb,var(--accent) 16%,transparent)':''}"><td><b>${p[0]}</b></td>${cols.map(c=>{ const v=p[1][c]; return `<td style="text-align:center;${v!=null?(K.has(c)?'background:color-mix(in srgb,var(--accent) 22%,transparent)':'background:color-mix(in srgb,var(--warn) 22%,transparent)'):''}">${v!=null?String(v).replace('DC Phoenix Output','DC'):''}</td>`; }).join('')}</tr>`; });
  return h+'</table></div>';
}
function needHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:4px">${COLS.map(c=>`<span class="chip" style="${D.need[c]?'background:var(--accent);color:#fff':''}">${sh(c)} <a href="#" data-a="nd" data-v="${c},-1">−</a> ${D.need[c]||0} <a href="#" data-a="nd" data-v="${c},1">+</a></span>`).join('')}</div>`;
}
function bindAll(r){ bindActs(r,{ sel:v=>A.sel(v), nd:v=>{ const [c,d]=v.split(','); A.need(+c,+d); }, cut:v=>A.cut(+v), sort:()=>{ D.sort=D.sort==='use'?'sheet':'use'; SIM.refresh(); }, rst:()=>reset() }); }

/* ---------------- timeline: one second inside the selected product's I/O modules ---------------- */
const RATE = { 1:[27e6/10,'SD-SDI words /10 shown',inf], 2:[27e6/10,'SDI words',inf], 3:[30000/1001,'video ref frames',''], 4:[48000,'AES frames (48 kHz)',inf], 5:[48000,'AES frames',inf], 6:[48000,'AES frames (110 Ω)',inf], 7:[48000,'AES frames (110 Ω)',inf],
  10:[48000,'SRC output frames',inf], 11:[15734.26,'NTSC lines',''], 12:[15734.26,'NTSC lines',''], 25:[100,'meter refresh',inf], 26:[100,'meter refresh',inf], 27:[100,'meter refresh',inf], 29:[38400/10,'RS-422 bytes (38.4 kbaud)',inf], 31:[2,'LED flash',inf], 35:[50,'display refresh',inf] };
function lanes(){
  const p=prod(D.sel), css=SIM.css, f=feats(p); const ls=[];
  f.forEach(c=>{ const r=RATE[c]; ls.push({label:`${sh(c)} × ${p[1][c]}`, h:22, draw(cx,X,t0,t1,y,h){
    if (r) SIM.pulses(cx,X,t0,t1,y,h,1/r[0],0,0.3/r[0],groupOf(c)==='Control'?css('--warn'):css('--accent'),r[1]);
    else if (groupOf(c)==='Analog audio'){ cx.strokeStyle=css('--accent2'); cx.beginPath(); const N=600; for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const yy=y+h/2-Math.sin(2*Math.PI*1000*t)*(h/2-3); i?cx.lineTo(X(t),yy):cx.moveTo(X(t),yy);} cx.stroke(); }
    else laneText(cx,X,t0,y,h,'static (no clocked signal)'); }}); });
  if (!ls.length) ls.push({label:'(empty row)', h:22, draw(c,X,t0,t1,y,h){ laneText(c,X,t0,y,h,'POD6 has no features in the sheet'); }});
  return ls;
}

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('Selected product — rear panel', `<div id="rp"></div>`)}${card('Feature matrix (ProductFeaturesList.xlsx, sheet IO) — click a row', `<div style="display:flex;gap:6px;margin-bottom:6px"><button data-a="sort">${D.sort==='use'?'sheet column order':'sort columns by use'}</button><span class="small muted">module threshold ≥ ${D.cut} products</span><button data-a="cut" data-v="-1">−</button><button data-a="cut" data-v="1">+</button><button data-a="rst">reset</button></div><div id="mx"></div><p class="small muted">Green cells use a column that is in the module kit; orange cells would need a one-off design.</p>`)}</div>
    <div>${card('What the model did', `<div id="trace" class="log"></div>`)}${card('Stand-alone option builder — what do you need?', `<div id="nd"></div><div id="mt" style="margin-top:8px"></div>`)}${card('Module kit at this threshold', `<div id="kt"></div>`)}</div></div>
    ${card('Timeline — one second through the selected product’s I/O', `<canvas id="tl"></canvas><p class="small muted">Signal rates per column type are ${inf}: the sheet lists connectors, not rates.</p>`)}`;
  const draw=()=>{ m.querySelector('#rp').innerHTML=rearSVG(); const mx=m.querySelector('#mx'); mx.innerHTML=matrixHTML(); bindAll(mx);
    m.querySelector('#trace').innerHTML=traceHTML(); const nd=m.querySelector('#nd'); nd.innerHTML=needHTML(); bindAll(nd);
    const M=matches(); m.querySelector('#mt').innerHTML = M.length? tbl(['Existing product','covers','unused columns'], M.map(x=>[`<a href="#" data-a="sel" data-v="${x.n}">${x.n}</a>`, Math.round(x.score*100)+' %', x.extra])) : '<p class="muted small">Add requirements with + to find the nearest existing product.</p>'; bindAll(m.querySelector('#mt'));
    const cv=coverage(); m.querySelector('#kt').innerHTML = `<p><b>${cv.kit.size}</b> modules; <b>${cv.full}</b> of ${PRODS.filter(p=>feats(p).length).length} products buildable entirely from them.</p><div>${[...cv.kit].map(c=>`<span class="chip">${colName(c)}</span>`).join('')}</div>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  bindAll(m); SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The question RD29 asked', body:`<p>RD29, “Modularity in products (stand alone options)”, was owned by Peter, Ali and <b>Sales</b> at priority B. In Nov 2011|44 someone tabulated every product’s connectors and controls: 50 rows, 38 columns. The idea: if a few I/O blocks recur everywhere, design them once and assemble products (and stand-alone options of openGear functions) from them.</p>`, check:()=>true, auto:true },
  { title:'1 · Read one row', body:`<p>Click <b>POD33</b> in the matrix. Its row matches the real unit: 1 video ref, AES BNC and Phoenix in, 4 BNC + 4 Phoenix outputs, 2 knobs, a character display.</p>`, check:()=>D.sel==='POD33'&&LOG.items.some(e=>/Select POD33/.test(e.name)), hint:'Click the POD33 row.' },
  { title:'2 · Find the common blocks', body:`<p>Sort columns by use. The most common are <b>pushbutton</b> (18), <b>BNC AES input</b> and <b>Phoenix analog input</b> (16 each), LED indicators (16), then RS-422 (13).</p>`, check:()=>D.sort==='use', hint:'Press “sort columns by use”.' },
  { title:'3 · Size a module kit', body:`<p>Raise the threshold to <b>6</b>: only columns used by six or more products become modules. Watch how many products can still be built entirely from the kit.</p>`, check:()=>D.cut===6, hint:'Threshold + three times.' },
  { title:'4 · Spec a stand-alone option', body:`<p>Sales asks for a box with <b>1 SDI input</b> and <b>4 AES BNC outputs</b>. Add those requirements and read the nearest existing products.</p>`, check:()=>D.need[1]>=1&&D.need[5]>=4, hint:'SDI Input +1; BNC output (digital audio) + four times.' },
  { title:'Done', body:`<p>The study never got past this table: RD29 is still open in the register. The <b>Findings</b> tab lists what the sheet shows, including its own errors.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m,LESSONS,tutor,{ title:'Tutorial — reading the product line as modules', panelTitle:'Matrix and builder', reset, panel(el){ el.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:6px"><button data-a="sort">${D.sort==='use'?'sheet order':'sort columns by use'}</button><span class="small">threshold ${D.cut}</span><button data-a="cut" data-v="-1">−</button><button data-a="cut" data-v="1">+</button></div>`+matrixHTML()+'<h3>Requirements</h3>'+needHTML()+(matches().length?tbl(['fit','%'],matches().slice(0,4).map(x=>[x.n,Math.round(x.score*100)])):''); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = card('One second in the selected product', `<div id="lad"></div>`);
  const draw=()=>{ const p=prod(D.sel); const f=feats(p);
    m.querySelector('#lad').innerHTML = `<p><b>${D.sel}</b>: ${f.length} I/O columns.</p>`+tbl(['Column','qty','events / s','what'], f.map(c=>{ const r=RATE[c]; return [colName(c), p[1][c], r? Math.round(r[0]*qty(p[1][c])).toLocaleString()+' '+(r[2]||'') : groupOf(c)==='Analog audio'?'continuous':'—', r? r[1] : '' ]; })); };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={}; GROUPS.forEach((g,i)=>{ B['g'+i]={x:20+(i%4)*185,y:30+Math.floor(i/4)*120,w:170,h:90,t:g[0],s:[`columns ${g[1]}–${g[2]}`, `${COLS.filter(c=>c>=g[1]&&c<=g[2]).length} types`],d:'Columns: '+COLS.filter(c=>c>=g[1]&&c<=g[2]).map(c=>HDR[c]).join(', '), live:()=>feats(prod(D.sel)).some(c=>c>=g[1]&&c<=g[2])}; });
  B.core={x:280,y:290,w:200,h:90,t:'Common core',s:['MCU + FPGA','(ATmega128, Cyclone)'],d:'What every modular product would share; the archive’s POD/AMS designs already reuse the ATmega128 + Altera + SHARC platform (RD folder README).'};
  B.out={x:560,y:290,w:180,h:90,t:'Product / option',s:['POD, AMS, openGear twin'],d:'A stand-alone option = an openGear function rebuilt as a POD from the same modules.'};
  blockView(m,B,GROUPS.map((g,i)=>['g'+i,'core','']).concat([['core','out','']]),{start:'core',h:400,side:'<p>Lit blocks are the column groups the selected product uses.</p>'});
}
const SHEETS=[{ name:'1 · Sheet layout', note:'Header rows 1–2 of the IO sheet, redrawn; merged cells B1:C1, E1:K1, L1:M1, N1:Y1, Z1:AB1.', svg:()=> GROUPS.map((g,i)=>`<rect x="${30+i*100}" y="60" width="96" height="40" fill="var(--panel2)" stroke="var(--ink)"/><text x="${34+i*100}" y="84" font-size="11" fill="var(--ink)">${g[0]}</text>`+COLS.filter(c=>c>=g[1]&&c<=g[2]).map((c,j)=>`<text x="${34+i*100}" y="${120+j*15}" font-size="9.5" fill="var(--accent2)">${c}: ${HDR[c]}</text>`).join('')).join('') }];
function viewSchem(m){ sheetsView(m,SHEETS,'ProductFeaturesList.xlsx','RD29 has no circuits; the only “drawing” is the sheet’s own structure.'); }
function viewSoft(m){
  m.innerHTML=card('What the model computes', `<div id="al" class="small"></div>`)+card('ManagingLargeProjects.pdf — the other meaning of “modular”', `<p>The second file in RD29 is about <b>modularising C code</b>: one header per C module, <span class="mono">Main.h</span> including <span class="mono">ADC.h</span>, and so on. It is about firmware structure, not product I/O, and fits the ICCAVR projects that put every routine in one large file (e.g. POD33’s <span class="mono">pod33v102.c</span>).</p>`);
  const draw=()=>{ const u=usage(), cv=coverage();
    m.querySelector('#al').innerHTML = `<ol><li>usage[c] = number of product rows with a value in column c</li><li>kit = { c : usage[c] ≥ ${D.cut} } → ${cv.kit.size} columns</li><li>product buildable ⇔ every non-empty column ∈ kit → ${cv.full}</li><li>fit(product, need) = |need columns with qty ≥ asked| / |need|</li><li>similarity = Jaccard of the two column sets</li></ol>`+tbl(['Column','used by'], COLS.slice().sort((a,b)=>u[b]-u[a]).slice(0,10).map(c=>[colName(c),u[c]])); };
  SIM.on('time',draw);
}
function viewFindings(m){
  m.innerHTML=card('What RD29 decided, and what became of it', `<ol>
    <li><b>Register: RD29, priority B, Peter/Ali/Sales, never closed.</b> The work product is one sheet (16 Nov 2011|44). No modular platform followed in the archive; later products kept their own boards.</li>
    <li><b>The common blocks are clear.</b> Pushbutton (18 products), AES BNC input (16), Phoenix analog input (16), LED indicators (16), AES BNC output (13), RS-422 (13), SDI in/out (12 each), Phoenix AES in (12), TRS out (12).</li>
    <li><b>POD6 is an empty row.</b> RD76 “POD6” later appears at priority A.</li>
    <li><b>POD7 and POD23 are missing</b> from the POD list (POD1–POD33).</li>
    <li><b>Probable misplaced cell:</b> POD12 has “6” under <i>SRC</i> and 6 Phoenix outputs. RD52 calls POD12 a 75 Ω/110 Ω DA; 6 BNC outputs shifted into the SRC column is the likely intent (${inf}).</li>
    <li><b>Unlabelled columns.</b> Column AH (34) has no header and no data; column AM (39) has no header. Power-supply and metadata headers sit one column off their only entries (“DC Phoenix Output” text under POD1).</li>
    <li><b>Free-text cells</b> (“1 option”, “2?”, “4?”, “1, 2, 3, 4”) show the sheet was a working draft (SLM, SLM8, MP).</li>
    <li><b>Two meanings of modular.</b> The other file in the folder is a C-code modularisation tutorial, not product modularity.</li>
  </ol>`)+card('Assumptions',`<ul class="small"><li>Signal rates per column type in the timeline (${inf}).</li><li>Rear panels for products without a cut silkscreen are drawn from the row, not from artwork (${inf}).</li></ul>`)+card('Sources',`<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD29-Modularization/ProductFeaturesList.xlsx, ManagingLargeProjects.pdf · R&amp;D_List.xls</li><li>siumulation-plugins/assets/pod*-rear-white.png etc. (cut by the sister plugins from the 2016|49 SILK PDFs)</li></ul>`);
}
SIM.register({
  id:'rd29-modularization', name:'RD29 Modularization · product I/O feature-matrix model (2011|44)', duration:1,
  product:'RD29 Modularization', year:2011, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD29-Modularization',
  summary:'The 2011 feature matrix of 50 Ward-Beck products against 38 I/O and control types, turned into a module-kit model: which blocks recur, how many products a small kit could build, and which existing product fits a requested stand-alone option.',
  highlights:['All 50 × 38 sheet cells, clickable','Module-kit coverage at any threshold','Stand-alone option builder with nearest-product fit','Real rear silkscreens where cut','Sheet errors and gaps listed'],
  depth:'Hardware model',
  stepUnits:[{label:'1 AES frame',period:()=>1/48000},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[0.0001,'100 µs']],
  defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: modules from the matrix',render:viewTutorial},{id:'second',label:'One second in the product',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
