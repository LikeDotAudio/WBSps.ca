/* =====================================================================
   RD54 — Inexpensive switcher (Ward-Beck R&D register, Wayne / Engineering, status "?")
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources:
   - RD54-InexpensiveSwitcher/RD54_InexpensiveSwitcherMeetingNotes.docx (17 Oct 2012): customer request,
       probably audio; price point unknown; "the most difficult part of this product is not the matrix
       portion but the hardware user panel"; multiple users and signal names complicate it; one openGear
       card with a custom rear module extending multiple slots; mini-BNC considered
   - siumulation-plugins/rd38-serialboxvsopengear.js and rd19-hd-bnc.js: openGear 20 slots in 2RU, slot pitch
       0.650/0.670 in, T6301 = 10 BNC per single-slot rear; HD-BNC pitch is an inferred estimate there too
   - #POD #SERIES README lines: POD2 (6×1 analog audio), POD10A (AES 8×1 or dual 4×1, issue 3 = RD75, 2013),
       POD21 (6×1 SDI, RS-485 9600 8N1), POD30 (4×1 HD/SD-SDI, switching timed to reference)
   The switcher itself was never designed: matrix size, panel and protocol are inferred and marked so.
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
/* flow chart of steps; the step 'on' is highlighted (used for live loops) */
function flowSVG(steps, on, opts){
  opts = opts || {}; const w = opts.w || 520, rh = opts.rh || 34;
  return `<svg viewBox="0 0 ${w} ${steps.length*rh+10}" style="width:100%">${steps.map((s,i)=>{ const hot = i===on;
    return `<rect x="6" y="${6+i*rh}" width="${w-12}" height="${rh-8}" rx="6" fill="${hot?'color-mix(in srgb,var(--accent) 22%,var(--panel2))':'var(--panel2)'}" stroke="${hot?'var(--accent)':'var(--line)'}" stroke-width="${hot?2:1}"/>
      <text x="16" y="${6+i*rh+(rh-8)/2+4}" font-size="12" fill="var(--ink)">${s}</text>`; }).join('')}</svg>`;
}
/* hex dump rows of a byte array; mark = {index: css colour} */
function hexDump(bytes, mark){
  mark = mark || {}; let s = '';
  for (let o=0; o<bytes.length; o+=16){
    const row = bytes.slice(o, o+16);
    s += `<div><span class="muted">${o.toString(16).padStart(4,'0')}</span>  ${row.map((b,i)=>{ const c = mark[o+i]; return c? `<span style="color:${c};font-weight:700">${hex2(b)}</span>` : hex2(b); }).join(' ')}  <span class="muted">${row.map(b=> b>31&&b<127? String.fromCharCode(b).replace(/&/,'&amp;').replace(/</,'&lt;') : '.').join('')}</span></div>`;
  }
  return `<div class="log" style="max-height:260px">${s}</div>`;
}
/* x–y line plot in SVG; series = [{pts:[[x,y]...], col, label, dash}] */
function plotSVG(series, o){
  o = o || {}; const W = o.w||620, H = o.h||240, L = 46, R = 12, T = 14, B = 30;
  const xlog = !!o.xlog; const fx = v => xlog? Math.log10(v) : v;
  const [x0,x1] = o.xr, [y0,y1] = o.yr;
  const X = v => L + (fx(v)-fx(x0))/(fx(x1)-fx(x0))*(W-L-R), Yp = v => T + (1-(v-y0)/(y1-y0))*(H-T-B);
  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">`;
  (o.xt||[]).forEach(v=>{ s += `<line x1="${X(v)}" y1="${T}" x2="${X(v)}" y2="${H-B}" stroke="var(--grid)"/><text x="${X(v)}" y="${H-B+14}" font-size="10" text-anchor="middle" fill="var(--ink2)">${o.xf?o.xf(v):v}</text>`; });
  (o.yt||[]).forEach(v=>{ s += `<line x1="${L}" y1="${Yp(v)}" x2="${W-R}" y2="${Yp(v)}" stroke="var(--grid)"/><text x="${L-4}" y="${Yp(v)+3}" font-size="10" text-anchor="end" fill="var(--ink2)">${v}</text>`; });
  if (o.xl) s += `<text x="${(L+W-R)/2}" y="${H-3}" font-size="10.5" text-anchor="middle" fill="var(--ink2)">${o.xl}</text>`;
  if (o.yl) s += `<text x="10" y="${T+6}" font-size="10.5" fill="var(--ink2)">${o.yl}</text>`;
  (o.bands||[]).forEach(b=>{ s += `<rect x="${X(b[0])}" y="${T}" width="${Math.max(0,X(b[1])-X(b[0]))}" height="${H-T-B}" fill="${b[2]}" opacity="${b[3]||.15}"/>${b[4]?`<text x="${X(b[0])+4}" y="${T+12}" font-size="10" fill="var(--ink2)">${b[4]}</text>`:''}`; });
  series.forEach((sr,k)=>{ const d = sr.pts.filter(p=>isFinite(p[1])).map((p,i)=>`${i?'L':'M'}${X(p[0]).toFixed(1)},${Yp(clamp(p[1],y0,y1)).toFixed(1)}`).join('');
    s += `<path d="${d}" fill="none" stroke="${sr.col}" stroke-width="${sr.w||2}" ${sr.dash?`stroke-dasharray="${sr.dash}"`:''}/>`;
    if (sr.label) s += `<text x="${W-R-4}" y="${T+14+k*13}" font-size="10.5" text-anchor="end" fill="${sr.col}">${sr.label}</text>`; });
  (o.marks||[]).forEach(mk=>{ s += `<circle cx="${X(mk[0])}" cy="${Yp(clamp(mk[1],y0,y1))}" r="4" fill="${mk[2]||'var(--play)'}"/>${mk[3]?`<text x="${X(mk[0])+6}" y="${Yp(clamp(mk[1],y0,y1))-6}" font-size="10.5" fill="var(--ink)">${mk[3]}</text>`:''}`; });
  return s + '</svg>';
}

/* ================= product model ================= */
const SLOT_IN = 0.66, REAR_H = 3.1;                     // openGear slot pitch (avg of 0.650/0.670), rear module height (inferred)
const CONN = {
  bnc:{ name:'BNC (T6301 style)', per:10, sig:'aes', note:'10 per single-slot rear (T6301).' },
  mini:{ name:'mini-BNC / HD-BNC', per:20, sig:'aes', note:'≈ 2 columns at ~0.33 in pitch (inferred, as in RD19).' },
  phx:{ name:'Phoenix (analog, balanced)', per:8, sig:'ana', note:'8 balanced channels (3 pins each) per slot (inferred).' },
};
const SIG = { aes:{name:'AES3 (75 Ω)', unit:'AES frame', period:1/48000}, ana:{name:'analog audio', unit:'zero-cross window (inferred)', period:1/48000}, vid:{name:'SD video', unit:'line 10 switch point', period:1001/60000} };
const NAMES = ['CAM 1 MIC','CAM 2 MIC','HOST','GUEST','PHONE','SAT RX','PLAYOUT A','PLAYOUT B','TONE','SILENCE','NEWS','PROMO','MUSIC','REMOTE 1','REMOTE 2','SPARE'];
const USERS = [{id:'MCR', col:'#0d5c8c'},{id:'Studio A', col:'#1f7a4d'},{id:'Studio B', col:'#b5651d'}];
function freshXpt(n){ return Array.from({length:n},(_,i)=>i%n); }
const D0 = () => ({ conn:'bnc', slots:2, sig:'aes', user:0, src:0, dst:0, names:NAMES.slice(), xpt:freshXpt(10), owner:Array(10).fill(-1), lock:Array(10).fill(false), pend:null, refused:0, takes:0 });
let D = D0();
function reset(){ D=D0(); LOG.items=[]; SIM.refresh(); }
function size(){ const c=CONN[D.conn], tot=c.per*D.slots; const n=Math.floor(tot/2); return { tot, n, card: D.slots }; }
function resize(){ const n=size().n; D.xpt=Array.from({length:n},(_,i)=>D.xpt[i]!=null?Math.min(D.xpt[i],n-1):i); D.owner=Array.from({length:n},(_,i)=>D.owner[i]!=null?D.owner[i]:-1); D.lock=Array.from({length:n},(_,i)=>!!D.lock[i]); D.src=Math.min(D.src,n-1); D.dst=Math.min(D.dst,n-1); }
const nm = i => D.names[i % D.names.length] + (i>=D.names.length?' '+(Math.floor(i/D.names.length)+1):'');
function nextEdge(t){ const p=SIG[D.sig].period; return Math.ceil(t/p+1e-9)*p; }
const A = {
  conn(k){ act('Rear connectors → '+CONN[k].name, tr=>{ D.conn=k; D.sig = k==='phx'?'ana':'aes'; resize(); const s=size(); tr(`${CONN[k].note} × ${D.slots} slot(s) = ${s.tot} connectors → ${s.n} × ${s.n} matrix`); }); },
  slots(v){ act(`Rear module width → ${v} slot(s)`, tr=>{ D.slots=v; resize(); const s=size(); tr(`one card + a ${v}-slot rear (${(v*SLOT_IN).toFixed(2)} in wide): ${s.tot} connectors → ${s.n} × ${s.n}`); if (v>1) tr(`the ${v-1} slot(s) behind the extra rear width hold no card: frame capacity drops to ${Math.floor(20/v)} switchers per 2RU frame`); }); },
  sig(v){ act('Signal → '+SIG[v].name, tr=>{ D.sig=v; tr(v==='vid'? 'video: switches must land in the vertical interval (POD30 times switching to reference)' : `switch on the next ${SIG[v].unit}`); tr('the notes left this open: “clarification on audio or video switcher”'); }); },
  user(i){ act('Panel → '+USERS[i].id, tr=>{ D.user=i; const mine=D.owner.map((o,k)=>o===i?k:-1).filter(k=>k>=0); tr(`${USERS[i].id} owns ${mine.length? mine.map(k=>'OUT '+(k+1)).join(', ') : 'no destinations'}`); }); },
  src(i){ D.src=i; SIM.refresh(); },
  dst(i){ act(`${USERS[D.user].id}: select OUT ${i+1}`, tr=>{ D.dst=i; tr(`OUT ${i+1} = ${nm(D.xpt[i])}; owner ${D.owner[i]<0?'none':USERS[D.owner[i]].id}${D.lock[i]?' (locked)':''}`); }); },
  take(){ act(`${USERS[D.user].id}: TAKE ${nm(D.src)} → OUT ${D.dst+1}`, tr=>{ const d=D.dst, o=D.owner[d];
    tr(`panel key → CAN message to the card: {dest ${d}, src ${D.src}, user ${D.user}} (protocol inferred)`);
    if (D.lock[d] && o!==D.user){ D.refused++; tr(`<b style="color:var(--bad)">refused</b>: OUT ${d+1} locked by ${USERS[o].id} — the multi-user problem the notes describe`); return; }
    const at=nextEdge(SIM.t); D.pend={d, s:D.src, at, t:SIM.t}; D.xpt[d]=D.src; if (o<0) D.owner[d]=D.user; D.takes++;
    tr(`XPT[${d}] ← ${D.src}; executes at ${SIM.fmtT(at)} (next ${SIG[D.sig].unit}, ${SIM.fmtDur(at-SIM.t)} later)`); tr(`tally: OUT ${d+1} = ${nm(D.src)}`); }); },
  lock(){ act(`${USERS[D.user].id}: LOCK OUT ${D.dst+1}`, tr=>{ const d=D.dst, o=D.owner[d]; if (o>=0 && o!==D.user){ tr(`<b style="color:var(--bad)">refused</b>: owned by ${USERS[o].id}`); return; } D.owner[d]=D.user; D.lock[d]=!D.lock[d]; tr(D.lock[d]?`OUT ${d+1} locked to ${USERS[D.user].id}`:'unlocked'); }); },
  rename(i){ act(`Rename IN ${i+1}`, tr=>{ const was=nm(i); const pool=['VO BOOTH','LINE 1','LINE 2','ISO','BACKUP','FEED A','FEED B']; D.names[i % D.names.length]=pool[(pool.indexOf(D.names[i%D.names.length])+1)%pool.length]; tr(`“${was}” → “${nm(i)}” — must reach every panel and DashBoard (name table sync, inferred)`); }); },
};

/* ---------------- views ---------------- */
function rearSVG(){
  const U=100, W=Math.max(4, D.slots+2)*SLOT_IN*U, H=REAR_H*U+40; const c=CONN[D.conn], s=size();
  let o=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${Math.min(520, 140+D.slots*90)}px;display:block;border-radius:8px;background:var(--dev)" role="img" aria-label="Custom multi-slot rear module, drawn to openGear slot pitch">`;
  for (let k=0;k<Math.max(4,D.slots+2);k++) o+=`<rect x="${k*SLOT_IN*U+2}" y="6" width="${SLOT_IN*U-4}" height="${REAR_H*U}" rx="3" fill="${k>=1&&k<=D.slots?'#1f5f8a':'#22272b'}" stroke="#0b2236"/>`;
  const x0=SLOT_IN*U, wR=D.slots*SLOT_IN*U, per=c.per*D.slots, cols=D.conn==='bnc'?2*D.slots:D.conn==='mini'?4*D.slots:2*D.slots, rows=Math.ceil(per/cols);
  for (let i=0;i<per;i++){ const col=i%cols, row=Math.floor(i/cols), x=x0+(col+0.5)*wR/cols, y=20+(row+0.5)*(REAR_H*U-30)/rows, isIn=i<s.n, r=D.conn==='bnc'?11:D.conn==='mini'?7:6;
    o+= D.conn==='phx'? `<rect x="${x-14}" y="${y-8}" width="28" height="16" fill="#2a8a3a" stroke="#0f4a1e"/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="#c9b469" stroke="${isIn?'#7a5f12':'#7a2a24'}" stroke-width="2"/>`; }
  return o+`</svg><p class="small muted">${D.slots}-slot rear · ${per} × ${c.name} · ${s.n} in + ${s.n} out. Slot pitch 0.66 in; rear height and connector placement ${inf}.</p>`;
}
function matrixSVG(){
  const s=size(), n=Math.min(s.n,16), cell=26, L=110, T=90, W=L+n*cell+10, H=T+n*cell+10, u=USERS[D.user];
  let o=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:560px;display:block">`;
  for (let i=0;i<n;i++){ o+=`<g data-a="rename" data-v="${i}" style="cursor:pointer"><text transform="translate(${L+i*cell+cell/2+4},${T-6}) rotate(-60)" font-size="10" fill="${i===D.src?'var(--accent)':'var(--ink2)'}">${nm(i)}</text></g>`;
    const own=D.owner[i]; o+=`<g data-a="dst" data-v="${i}" style="cursor:pointer"><text x="${L-6}" y="${T+i*cell+cell/2+4}" font-size="10.5" text-anchor="end" fill="${i===D.dst?'var(--accent)':'var(--ink)'}">${D.lock[i]?'🔒 ':''}OUT ${i+1}</text>${own>=0?`<rect x="2" y="${T+i*cell+6}" width="6" height="${cell-12}" fill="${USERS[own].col}"/>`:''}</g>`; }
  for (let d=0; d<n; d++) for (let sIdx=0; sIdx<n; sIdx++){ const on=D.xpt[d]===sIdx, pend=D.pend&&D.pend.d===d&&D.pend.s===sIdx&&SIM.t<D.pend.at;
    o+=`<rect x="${L+sIdx*cell+1}" y="${T+d*cell+1}" width="${cell-2}" height="${cell-2}" rx="3" fill="${on?(pend?'var(--warn)':'var(--accent)'):'var(--panel2)'}" stroke="${d===D.dst&&sIdx===D.src?u.col:'var(--line)'}" stroke-width="${d===D.dst&&sIdx===D.src?2.5:1}" data-a="xp" data-v="${d},${sIdx}" style="cursor:pointer"/>`; }
  return o+`</svg>${s.n>16?`<p class="small muted">Showing 16 of ${s.n} × ${s.n}.</p>`:''}<p class="small muted">Click a cell to pick source + destination, then TAKE on the panel. Click a source name to rename it.</p>`;
}
function panelSVG(){
  const u=USERS[D.user], n=Math.min(size().n,8);
  let o=`<svg viewBox="0 0 640 170" style="width:100%;display:block;border-radius:8px;background:#2a2d30" role="img" aria-label="Hardware user panel concept">
    <text x="12" y="20" font-size="12" fill="#cfd3d6">USER PANEL — ${u.id} (concept, inferred)</text><text x="628" y="20" font-size="11" text-anchor="end" fill="#9fdc9f">OUT ${D.dst+1}: ${nm(D.xpt[D.dst])}</text>`;
  for (let i=0;i<n;i++){ const x=12+i*76, on=i===D.src; o+=`<g data-a="srcb" data-v="${i}" style="cursor:pointer"><rect x="${x}" y="34" width="70" height="44" rx="5" fill="${on?'#ffcc33':'#45494d'}" stroke="#111"/><text x="${x+35}" y="60" font-size="9.5" text-anchor="middle" fill="${on?'#111':'#e6e6e6'}">${nm(i)}</text></g>`; }
  [['take','TAKE','#c33'],['lock','LOCK','#555']].forEach(([a,l,c],k)=>{ o+=`<g data-a="${a}" style="cursor:pointer"><rect x="${12+k*90}" y="100" width="80" height="44" rx="5" fill="${c}" stroke="#111"/><text x="${52+k*90}" y="127" font-size="13" text-anchor="middle" fill="#fff" font-weight="700">${l}</text></g>`; });
  USERS.forEach((x,k)=>{ o+=`<g data-a="user" data-v="${k}" style="cursor:pointer"><rect x="${300+k*110}" y="100" width="100" height="44" rx="5" fill="${k===D.user?x.col:'#45494d'}" stroke="#111"/><text x="${350+k*110}" y="127" font-size="12" text-anchor="middle" fill="#fff">${x.id}</text></g>`; });
  return o+'</svg>';
}
function ctlHTML(){ return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${Object.keys(CONN).map(k=>`<button data-a="conn" data-v="${k}" class="${D.conn===k?'on':''}">${CONN[k].name}</button>`).join('')}</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px"><span class="small muted">rear width</span>${[1,2,3,4].map(v=>`<button data-a="slots" data-v="${v}" class="${D.slots===v?'on':''}">${v} slot${v>1?'s':''}</button>`).join('')}
  <span class="small muted" style="margin-left:8px">signal</span>${Object.keys(SIG).map(k=>`<button data-a="sig" data-v="${k}" class="${D.sig===k?'on':''}">${SIG[k].name}</button>`).join('')}</div>`; }
function bindAll(root){ bindActs(root,{ conn:v=>A.conn(v), slots:v=>A.slots(+v), sig:v=>A.sig(v), user:v=>A.user(+v), srcb:v=>A.src(+v), dst:v=>A.dst(+v), take:()=>A.take(), lock:()=>A.lock(), rename:v=>A.rename(+v),
  xp:v=>{ const [d,s]=v.split(',').map(Number); D.dst=d; D.src=s; SIM.refresh(); } }); }
function lanes(){ const css=SIM.css, p=SIG[D.sig].period;
  return [
    {label:`Switch points (${SIG[D.sig].unit})`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,p,0,Math.min(p*0.3,2e-6),css('--ink2'),'switch points'); }},
    {label:'Panel key scan (100 Hz, inferred)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,0.01,0,0.0005,css('--accent2'),'scans'); }},
    {label:'Panel ↔ card messages (inferred)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,0.1,0.002,0.0015,css('--accent2'),'status polls'); LOG.items.filter(e=>/TAKE|LOCK/.test(e.name)).forEach(e=>{ if (e.t>=t0&&e.t<=t1){ c.fillStyle=css('--warn'); c.fillRect(X(e.t),y+3,Math.max(3,X(e.t+0.0012)-X(e.t)),h-6); } }); }},
    {label:'Crosspoint change', h:24, draw(c,X,t0,t1,y,h){ if (!D.pend){ laneText(c,X,t0,y,h,'press TAKE to see the request wait for the next switch point'); return; } const a=D.pend.t, b=D.pend.at; bandAt(c,X,a,b,y,h,css('--warn'),.5,'wait'); c.fillStyle=css('--accent'); c.fillRect(X(b)-1,y+2,3,h-4); }},
    {label:'AES frames / video fields', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,D.sig==='vid'?1001/60000:1/48000,0,D.sig==='vid'?0.0013:1/96000,css('--accent'),D.sig==='vid'?'fields':'AES frames'); }},
  ]; }
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('Hardware user panel (the hard part, per the notes)', `<div id="pn"></div>`)}${card('Crosspoint matrix', `<div id="mx"></div>`)}</div>
    <div>${card('One openGear card + custom multi-slot rear', `<div id="rr"></div><div id="ctl"></div><div id="sz" class="small" style="margin-top:6px"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('One second of switching', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ ['pn','mx','rr','ctl'].forEach(id=>{ const el=m.querySelector('#'+id); el.innerHTML = id==='pn'?panelSVG(): id==='mx'?matrixSVG(): id==='rr'?rearSVG(): ctlHTML(); bindAll(el); });
    const s=size(); m.querySelector('#sz').innerHTML = kv([['Matrix',`${s.n} × ${s.n} (${s.n*s.n} crosspoints)`],['Frame use',`${D.slots} slot(s) of 20 → ${Math.floor(20/D.slots)} switchers per 2RU`],['Takes / refused',`${D.takes} / ${D.refused}`]]);
    m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The meeting', body:`<p>17 Oct 2012|45. Wayne had a request for an “inexpensive switcher”, probably audio, price unknown. The notes: the matrix is easy; the <b>user panel</b> is hard, especially with several users and named signals. Proposed: one openGear card with a custom rear spanning several slots, maybe mini-BNC.</p>`, check:()=>true, auto:true },
  { title:'1 · Size the rear', body:`<p>Choose <b>mini-BNC</b> and a <b>3-slot</b> rear. One card now has 60 connectors: a 30 × 30 AES matrix.</p>`, check:()=>D.conn==='mini'&&D.slots===3, hint:'mini-BNC, then 3 slots.' },
  { title:'2 · Make a take', body:`<p>On the MCR panel pick <b>HOST</b>, select <b>OUT 1</b> in the matrix, then press <b>TAKE</b>. The timeline shows the take waiting for the next AES frame.</p>`, check:()=>D.takes>0, hint:'Click HOST, OUT 1, TAKE.' },
  { title:'3 · Lock it', body:`<p>Press <b>LOCK</b> to protect OUT 1 for MCR.</p>`, check:()=>D.lock.some(x=>x), hint:'Press LOCK.' },
  { title:'4 · Second user', body:`<p>Switch the panel to <b>Studio A</b>, select OUT 1 and press TAKE. It is refused: this is the multi-user problem the notes worry about.</p>`, check:()=>D.refused>0, hint:'Studio A → OUT 1 → TAKE.' },
  { title:'5 · Names', body:`<p>Click a source name above the matrix to rename it. Every panel and DashBoard has to learn the new name: the second complication in the notes.</p>`, check:()=>LOG.items.some(e=>/Rename/.test(e.name)), hint:'Click a source name.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — the cheap switcher', panelTitle:'Panel, matrix and rear', reset,
  panel(el){ el.innerHTML = panelSVG()+matrixSVG()+rearSVG()+ctlHTML(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('Events in one second', `<div id="ev"></div>`)}${card('Crosspoint table at the playhead', `<div id="xt"></div>`)}`;
  const draw=()=>{ const s=size(), p=SIG[D.sig].period;
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','note'],[[`Switch points (${SIG[D.sig].unit})`,(1/p).toFixed(2),`a take waits at most ${SIM.fmtDur(p)}`],['AES samples moved',(48000*2*s.n).toLocaleString(),`${s.n} stereo outputs`],['Panel key scans','100 '+inf,''],['Status polls','10 '+inf,'per panel']].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,r[2]]));
    const n=Math.min(s.n,16); m.querySelector('#xt').innerHTML = tbl(['OUT','source','owner','lock'], Array.from({length:n},(_,d)=>[d+1, nm(D.xpt[d]) + (D.pend&&D.pend.d===d&&SIM.t<D.pend.at?' <span style="color:var(--warn)">(pending)</span>':''), D.owner[d]<0?'—':USERS[D.owner[d]].id, D.lock[d]?'yes':'']));
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    rear:{x:20,y:40,w:170,h:80,t:'Custom rear',s:['1–4 slots wide','BNC / mini-BNC / Phoenix'],d:'Notes: “a custom rear module extending multiple slots”; mini-BNC discussed.'},
    xpt:{x:240,y:40,w:170,h:80,t:'Crosspoint (FPGA)',s:['N × N','switch on frame edge'],d:'“Not the matrix portion” — the easy part. Implementation not stated (FPGA inferred from other WBS openGear cards).'},
    mcu:{x:460,y:40,w:170,h:80,t:'Card controller',s:['AT90CAN128 (as other WBS cards)'],d:'Holds the crosspoint, lock and name tables (inferred).'},
    dash:{x:680,y:40,w:150,h:80,t:'DashBoard',s:['openGear frame network'],d:'Software control path every openGear card already has.'},
    pan:{x:460,y:180,w:170,h:90,t:'Hardware user panel',s:['the hard part','users, locks, names'],d:'Notes: “The most difficult part of this product is not the matrix portion but the hardware user panel.”'},
    users:{x:680,y:180,w:150,h:90,t:'Several users',s:['MCR / Studio A / B'],d:'“Complication happens when control is given to multiple users.”'},
  };
  blockView(m,B,[['rear','xpt','I/O'],['xpt','mcu',''],['mcu','dash','CAN'],['mcu','pan','panel bus'],['pan','users','']],{start:'pan',w:850,h:300,side:'<p>The matrix fits on one card; the money and effort go into the panel and the multi-user rules around it.</p>'});
}
const SHEETS=[
  { name:'1 · Card and rear (concept)', note:'Concept only; slot pitch and per-slot BNC count from the openGear notes, the rest inferred.', svg:()=> chip(100,70,170,'Rear module',[['IN 1…N','75 Ω / balanced'],['OUT 1…N','']],[['to card','multi-slot header']],`${D.slots} slot(s), ${size().tot} connectors`) + chip(420,70,170,'Crosspoint FPGA',[['AES_IN[N]',''],['XPT_WR','from MCU']],[['AES_OUT[N]',''],['FRAME_EDGE','switch strobe']],'inferred') + chip(680,70,140,'AT90CAN128',[['CAN','frame']],[['PANEL_TX/RX','RS-485 (inferred)']],'inferred') },
  { name:'2 · Panel bus (concept)', note:'POD21 already used RS-485 at 9600 baud, 8N1 for remote control; a similar bus is assumed here.', svg:()=> chip(120,80,170,'Panel MCU',[['KEYS[16]','sources'],['TAKE/LOCK','']],[['RS-485','to card'],['LCD','names']],'one per user (inferred)') + chip(520,80,170,'Card',[['RS-485','panels 1–3']],[['tally','per destination']],'') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the RD54 meeting notes and openGear rear data', 'RD54 has no drawings. These sheets show the card the meeting proposed.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('TAKE handler (step at the playhead)', `<div id="fl"></div>`)}${card('Tables the card must keep', `<div id="tb"></div>`)}</div>`;
  const draw=()=>{ const st=['panel: key → {user, src, dest}','card: dest locked by another user? → refuse','card: dest unowned? → owner = user','XPT[dest] ← src (shadow register)','wait for next switch point','FPGA: copy shadow → live crosspoint','tally to every panel + DashBoard'];
    const on = D.pend? (SIM.t<D.pend.at?4:6) : Math.floor(SIM.t*7)%7;
    m.querySelector('#fl').innerHTML = flowSVG(st,on)+`<p class="small muted">Handler and tables are ${inf}; the notes name the problems, not the design.</p>`;
    const n=Math.min(size().n,8); m.querySelector('#tb').innerHTML = tbl(['table','entries','example'],[['crosspoint',size().n,`XPT[0] = ${D.xpt[0]}`],['owner',size().n,`OWN[0] = ${D.owner[0]}`],['lock',size().n,`LOCK[0] = ${D.lock[0]?1:0}`],['source names',size().n,`“${nm(0)}”`],['destination names',size().n,'“OUT 1”']]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD54 decided, and what became of it', `<ol>
    <li><b>Decided: get more information.</b> The one action from the 17 Oct 2012|45 meeting was for Wayne to find the price point and whether the customer meant audio or video. Nothing else in the folder follows; the register stays at “?”.</li>
    <li><b>What became of it.</b> No openGear switcher card appears in the archive. The low-cost switching need was met by POD products: POD2 (6×1 analog audio), POD21 (6×1 SDI) and POD30 (4×1 HD/SD-SDI) earlier, and in 2013|46 POD10A issue 3 (RD75), an AES switcher configurable as 8×1 or dual 4×1 with master/slave linking.</li>
    <li><b>The notes put the cost in the right place.</b> The matrix fits easily on one card. Ownership, locks, name tables and panels for several users are where the effort goes, as the model shows.</li>
    <li><b>Wide rears cost frame space.</b> A rear spanning several slots leaves card slots empty behind it: a 4-slot rear allows only 5 switchers per 20-slot frame.</li>
    <li><b>Mini-BNC doubles density.</b> At ~0.33 in pitch (RD19’s estimate), one slot takes ~20 connectors instead of T6301’s 10 ${inf}. RD19, the 2010 high-density BNC study, is the same idea.</li>
    <li><b>Same week as RD53 and RD56.</b> RD53 and RD56 date from 17–19 Oct 2012 too.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Matrix size from connector count, panel design, bus, controller and timing rules are ${inf}.</li><li>Mini-BNC and Phoenix per-slot counts are ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD54-InexpensiveSwitcher/RD54_InexpensiveSwitcherMeetingNotes.docx</li><li>#POD #SERIES/POD2, POD10A, POD21, POD30 README · RD19 · R&amp;D_List.xls (RD54, RD75)</li><li>siumulation-plugins/rd38-serialboxvsopengear.js, rd19-hd-bnc.js (openGear slot data)</li></ul>`);
}

SIM.register({
  id:'rd54-inexpensiveswitcher', name:'RD54 Inexpensive switcher · openGear matrix concept (2012|45)', duration:1,
  product:'RD54 Inexpensive Switcher', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD54-InexpensiveSwitcher',
  summary:'The October 2012 idea of a low-cost switcher on one openGear card with a wide custom rear. Size the rear and matrix, then run takes, locks and renames from three user panels: the multi-user problem the meeting notes called the hard part.',
  highlights:['Multi-slot rear drawn at openGear slot pitch','Matrix size from connector type and rear width','Three user panels with ownership and locks','Takes wait for the next frame or field','What happened next: POD10A issue 3 (RD75)'],
  depth:'Hardware model',
  stepUnits:[{label:'1 switch point',period:()=>SIG[D.sig].period},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms'],[0.0002,'200 µs']],
  defaultZoom:1,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: users and takes', render:viewTutorial},
    {id:'second', label:'One second of switching', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
