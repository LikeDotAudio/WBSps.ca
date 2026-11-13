/* =====================================================================
   RD38 — Serial Box vs openGear (Ward-Beck R&D register, no owner, status "?")
   "Serial box to OpenGear conversion for unavailable open gear cards."
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all in this archive):
   - RD38 …/Serial Box Open Gear.xlsx (7 Dec 2011) and Serial Box Open Gearv2.xlsx (14 Dec 2011):
       function → Serialboxx card (+ termination) → openGear card cross-reference
   - xxx-OBSOLETE …/#SERIALBOX #SERIES/SERIALBOXX - #mf100/MF100man.wpd (2RU, 10 cards, 1 in + 8 out BNC
       per card, TB101/TB102/TB103 terminations, MF100REF, 130 VA, 19 × 3.5 × 13.25 in, 7.65 kg)
   - …/m8245aspecs.wpd (M8245A supply: 85–264 VAC, +21 V @ 4 A, −21 V @ 3 A)
   - …/OBSOLETE - SERIALBOXX/Serialboxx.wpd (NAB 2001 launch list) · MF100 Rear w REF.jpg (rear layout)
   - #OPENGEAR #SERIES/README.md (card index), XXX - MF6220 … README (20 slots in 2RU, slot pitch 0.650/0.670 in,
       PSU plan 200 W, −7.5 V ≤ 200 mA per double slot), T6301 README (10 BNC single-slot rear)
   The MF100 rear is drawn to scale from the manual's dimensions and laid out from the rear photo.
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
/* the two spreadsheet versions, row by row: [function, serialbox, openGear, v1?, v2?, kind] */
const ROWS = [
  ['Audio DA','AA101A with TB101','AA6201A',1,1,'aa'],
  ['400/1000 Hz oscillator','AA103A with TB101','',1,1,'osc'],
  ['Video DA, differential input','AV201A','AV6202A',1,1,'vid'],
  ['Video DA, clamping input','AV202A','AV6201A',1,1,'vid'],
  ['Utility video DA','AV203A','',1,1,'vid'],
  ['AES and D-to-A converter','DA301 (v1) / DA301A with TB102 (v2)','D6204A',1,1,'aes'],
  ['AES DA','DA301B','',0,1,'aes'],
  ['DARS generator (75 Ω)','DA302','',1,1,'aes'],
  ['DARS generator 110 Ω','DA302 with TB103','',0,1,'aes'],
  ['AES A-to-D converter','DA303','D6203A',1,1,'aes'],
  ['AES SRC 75 Ω','DA304A','D6201B',1,1,'aes'],
  ['AES SRC 110 Ω','DA304A with TB103','D6202B',1,1,'aes'],
  ['AES reclocking DA 75 Ω','DA304B','D6201A',1,1,'aes'],
  ['AES reclocking DA 110 Ω','DA304B with TB103','D6202A',1,1,'aes'],
  ['AES processing amplifier 75 Ω','DA305A','',1,1,'aes'],
  ['AES processing amplifier 110 Ω','DA305 with TB102','',1,1,'aes'],
  ['SDI DA','SD401A','',1,1,'sdi'],
  ['SDI reclocking DA','SD402A','M6203A',1,1,'sdi'],
  ['SDI demuxer, analog outputs','SD403A with TB102','',1,1,'sdi'],
  ['SDI dual-group demuxer 75 Ω','SD403B','M6202A',1,1,'sdi'],
  ['… 75 Ω with Dolby decoder','','M6202AE',1,1,'sdi'],
  ['SDI dual-group demuxer 110 Ω','SD403C with TB102','M6202A',1,1,'sdi'],
  ['… 110 Ω with Dolby decoder','','M6202AE',1,1,'sdi'],
  ['SDI dual-group muxer 75 Ω','SD404A','M6204A',1,1,'sdi'],
  ['… 75 Ω with Dolby decoder','','M6204A',1,1,'sdi'],
  ['SDI dual-group muxer 110 Ω','SD404B with TB102','M6204A',1,1,'sdi'],
  ['… 110 Ω with Dolby decoder','','M6204A',1,1,'sdi'],
  ['SDI single-group muxer (75 Ω)','SD405A','',1,1,'sdi'],
  ['SDI single-group muxer, analog inputs','SD405 with TB102','',0,1,'sdi'],
  ['SDI NTSC/PAL monitoring DA','SD406A','',1,1,'sdi'],
  ['SDI demuxer, analog A/V outputs','SD406B','',1,1,'sdi'],
  ['Dolby E/AC-3 decoder module','','D6207A',1,1,'aes'],
  ['HD/SDI embedded audio processing','','M6205A',1,1,'sdi'],
];
const SB_CARDS = ROWS.filter(r=>r[1]).map((r,i)=>({ i:ROWS.indexOf(r), name:r[1].replace(' (v1) / ',' / '), fn:r[0], og:r[2], kind:r[5] }));
const MF100 = { ru:2, slots:10, bncPerCard:9, va:130, w:19, h:3.5, d:13.25, kg:7.65, psu:'M8245A: +21 V @ 4 A, −21 V @ 3 A' };
const OGF = { ru:2, slots:20, bncPerRear:10, pitch:'0.650 / 0.670 in alternating', psu:'200 W PPS-200 plan; −7.5 V ≤ 200 mA per double slot' };
const KIND = { aes:{name:'AES3 48 kHz', rate:48000*128, unit:'biphase cells'}, sdi:{name:'SD-SDI 270 Mb/s', rate:27e6, unit:'10-bit words'}, vid:{name:'NTSC analog video', rate:15734.26, unit:'H lines'}, aa:{name:'analog audio', rate:1000, unit:'1 kHz tone cycles'}, osc:{name:'oscillator 400/1000 Hz', rate:1000, unit:'cycles'} };

const D = { ver:2, slots:[0,2,5,9,10,12,15,17,19,23].map(i=>SB_CARDS.findIndex(c=>c.i===i)), sel:0, show:'all' };
function reset(){ D.ver=2; D.slots=[0,2,5,9,10,12,15,17,19,23].map(i=>SB_CARDS.findIndex(c=>c.i===i)); D.sel=0; D.show='all'; LOG.items=[]; SIM.refresh(); }
const rowsFor = v => ROWS.filter(r=> v===1 ? r[3] : r[4]);
function convert(){
  const cards = D.slots.map(k=> k<0? null : SB_CARDS[k]);
  const filled = cards.filter(Boolean);
  const mapped = filled.filter(c=>c.og), gaps = filled.filter(c=>!c.og);
  const ogCards = mapped.length, ogFrames = Math.ceil(ogCards/OGF.slots) || 0;
  return { filled, mapped, gaps, ogCards, ogFrames, sbBNC: filled.length*MF100.bncPerCard, ogBNC: ogCards*OGF.bncPerRear,
    sbPerRU: MF100.slots/MF100.ru, ogPerRU: OGF.slots/OGF.ru, freeSlots: ogFrames*OGF.slots - ogCards };
}
const A = {
  slot(k){ act(`MF100 slot ${k+1} — choose card`, tr=>{ D.sel=k; const c=SB_CARDS[D.slots[k]]; tr(c? `Slot ${k+1}: ${c.name} — ${c.fn}` : `Slot ${k+1} empty`); if (c) tr(c.og? `openGear equivalent: <b>${c.og}</b> (${D.ver===1?'Serial Box Open Gear.xlsx':'…Gearv2.xlsx'})` : '<b style="color:var(--bad)">No openGear equivalent</b> — the gap RD38 was about'); }); },
  setCard(k, ci){ act(`Slot ${k+1} ← ${ci<0?'empty':SB_CARDS[ci].name}`, tr=>{ D.slots[k]=ci; const v=convert(); tr(`Rack now: ${v.filled.length} cards, ${v.gaps.length} without an openGear card`); tr(`openGear needs ${v.ogCards} slot(s) in ${v.ogFrames} frame(s); MF100 BNC ${v.sbBNC} vs openGear rear BNC ${v.ogBNC}`); }); },
  ver(v){ act('Spreadsheet version '+v, tr=>{ D.ver=v; const a=rowsFor(1).length, b=rowsFor(2).length; tr(`v1 (7 Dec 2011) ${a} rows; v2 (14 Dec 2011) ${b} rows plus a frame line “4 or 10 Card Frames | 10 or 20 Card Frames”`); tr('v2 adds DA301B, a 110 Ω DARS row, a single-group muxer with analog inputs, and renames DA301 → DA301A with TB102'); }); },
  show(v){ act('Show '+v, tr=>{ D.show=v; }); },
};

/* ---------------- frame drawings (to scale: 19 in = 1900 units) ---------------- */
function mf100Rear(){
  const U=100, W=19*U, H=3.5*U; const v=convert();
  let s=`<svg viewBox="0 0 ${W} ${H+30}" style="width:100%;border-radius:8px;display:block" role="img" aria-label="MF100 rear, drawn to scale">
    <rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="var(--dev)"/>
    <rect x="${0.35*U}" y="${0.25*U}" width="${3.0*U}" height="${3.0*U}" fill="#141618" stroke="#333"/>
    <text x="${0.5*U}" y="${0.6*U}" font-size="22" fill="#cfd3d6">PS1 · PS2 (M8245A)</text><rect x="${0.5*U}" y="${0.8*U}" width="70" height="55" fill="#222" stroke="#555"/><rect x="${0.5*U}" y="${1.8*U}" width="70" height="55" fill="#222" stroke="#555"/>
    <text x="${1.4*U}" y="${1.05*U}" font-size="18" fill="#cfd3d6">AUX1 · AUX2</text><circle cx="${2.4*U}" cy="${1.9*U}" r="22" fill="#9c8233"/><text x="${1.4*U}" y="${2.45*U}" font-size="18" fill="#cfd3d6">REFERENCE (MF100REF)</text>`;
  const x0=3.55*U, cw=(W-x0-0.3*U)/10;
  for (let k=0;k<10;k++){ const slotNo=10-k; const ci=D.slots[slotNo-1]; const c=ci>=0?SB_CARDS[ci]:null; const x=x0+k*cw; const on=D.sel===slotNo-1;
    const col = !c ? '#2a2f2a' : c.og ? '#1f6a3d' : '#7a2a24';
    s+=`<g data-a="slot" data-v="${slotNo-1}" style="cursor:pointer"><rect x="${x+3}" y="${0.25*U}" width="${cw-6}" height="${3.0*U}" rx="4" fill="${col}" stroke="${on?'var(--accent)':'#0d2b18'}" stroke-width="${on?6:2}"/>
      <text x="${x+cw/2}" y="${0.45*U}" text-anchor="middle" font-size="18" fill="#fff">IN ${slotNo}</text>`;
    for (let b=0;b<9;b++){ const col2 = b===0?0:(b-1)%2, row = b===0?0:1+Math.floor((b-1)/2); const bx=x+cw*(b===0?0.3:col2?0.72:0.3), by=0.75*U+row*0.5*U; s+=`<circle cx="${bx}" cy="${by}" r="15" fill="#c9b469" stroke="#7a5f12" stroke-width="3"/>`; }
    s+=`<text x="${x+cw/2}" y="${3.2*U}" text-anchor="middle" font-size="15" fill="#fff">${c?c.name.split(' ')[0]:'—'}</text><title>${c?c.name+' → '+(c.og||'no openGear card'):'empty'}</title></g>`; }
  s+=`<text x="10" y="${H+24}" font-size="20" fill="var(--ink2)">MF100 rear, 19 × 3.5 in, to scale (MF100man.wpd); card order IN 10 … IN 1 and the 1 + 8 BNC pattern from “MF100 Rear w REF.jpg”. Green = has an openGear card, red = gap.</text></svg>`;
  return s;
}
function ogRear(){
  const U=100, W=19*U, H=3.5*U; const v=convert(); const list=v.mapped;
  let s=`<svg viewBox="0 0 ${W} ${H+30}" style="width:100%;border-radius:8px;display:block" role="img" aria-label="openGear 20-slot frame rear (to scale)">
    <rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="var(--dev)"/>`;
  const x0=1.1*U, sw=0.66*U;
  for (let k=0;k<20;k++){ const c=list[k]; const x=x0+k*sw;
    s+=`<rect x="${x+2}" y="${0.2*U}" width="${sw-4}" height="${3.1*U}" rx="3" fill="${c?'#1f5f8a':'#22272b'}" stroke="#0b2236"/>`;
    for (let b=0;b<10;b++){ const bx=x+sw*(b%2?0.68:0.32), by=0.45*U+b*0.28*U; s+=`<circle cx="${bx}" cy="${by}" r="${c?11:9}" fill="${c?'#c9b469':'#3a3f44'}" stroke="#7a5f12" stroke-width="${c?2:0}"/>`; }
    if (c) s+=`<text x="${x+sw/2}" y="${3.45*U}" text-anchor="middle" font-size="12" fill="#cfd3d6" transform="rotate(-90 ${x+sw/2} ${3.0*U})">${c.og}</text>`; }
  s+=`<rect x="${x0+20*sw+10}" y="${0.2*U}" width="${W-(x0+20*sw)-30}" height="${3.1*U}" rx="4" fill="#141618"/><text x="${x0+20*sw+20}" y="${0.6*U}" font-size="18" fill="#cfd3d6">PSU / REF</text>
    <text x="10" y="${H+24}" font-size="20" fill="var(--ink2)">openGear 2RU / 20 slots (MF6220 README; slot pitch ≈ 0.66 in). Rear modules drawn as T6301 10-BNC (2 staggered columns ${'— inferred'}). ${v.ogFrames>1?v.ogFrames+' frames needed; first shown.':''}</text></svg>`;
  return s;
}

/* ---------------- timeline: what flows through the selected card in one second ---------------- */
function lanes(){
  const css=SIM.css, c0=SB_CARDS[D.slots[D.sel]]||SB_CARDS[0], K=KIND[c0.kind];
  const ls=[];
  ls.push({label:`Signal: ${K.name}`, h:26, draw(c,X,t0,t1,y,h){
    if (c0.kind==='aes'){ SIM.pulses(c,X,t0,t1,y,h,192/48000,0,1/48000,css('--warn'),'AES blocks'); if (t1-t0<0.002) SIM.pulses(c,X,t0,t1,y+h/2,h/2,1/48000,0,1/96000,css('--accent'),'frames'); }
    else if (c0.kind==='sdi'){ SIM.pulses(c,X,t0,t1,y,h,1001/60000,0,20/15734.26,css('--accent2'),'fields'); if (t1-t0<0.001) SIM.pulses(c,X,t0,t1,y+h/2,h/2,1/15734.26,0,1/27e6*268,css('--ink2'),'lines'); }
    else if (c0.kind==='vid'){ SIM.pulses(c,X,t0,t1,y,h,1001/60000,0,20/15734.26,css('--accent2'),'fields'); SIM.pulses(c,X,t0,t1,y+h/2,h/2,1/15734.26,0,4.7e-6,css('--ink2'),'H sync'); }
    else { c.strokeStyle=css('--accent'); c.beginPath(); const N=800; for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const f=c0.kind==='osc'&&t%1<0.5?400:1000; const v=Math.sin(2*Math.PI*f*t); const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); }
  }});
  ls.push({label:`Serialboxx ${c0.name.split(' ')[0]}: 1 in → 8 out`, h:24, draw(c,X,t0,t1,y,h){ laneText(c,X,t0,y,h,`fan-out to 8 BNC; termination ${/TB10\d/.test(c0.name)?c0.name.match(/TB10\d/)[0]:'BNC back panel'}; control: card-edge jumpers / PIC firmware, no remote`, css('--ink')); }});
  ls.push({label:`openGear ${c0.og||'(none)'}`, h:24, draw(c,X,t0,t1,y,h){ if(!c0.og){ laneText(c,X,t0,y,h,'no openGear card exists for this function — RD38 gap', css('--bad')); return; } laneText(c,X,t0,y,h,`same signal; AT90CAN128 on the openGear CAN bus → DashBoard (poll rate not recorded ${'– inferred'})`, css('--ink')); }});
  ls.push({label:'Mains (60 Hz) into M8245A', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/60,0,1/240,css('--ink2'),'mains half-cycles'); }});
  return ls;
}

/* ---------------- views ---------------- */
function selHTML(){
  const k=D.sel; return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <label class="small">Slot ${k+1} card <select id="cardSel"><option value="-1">— empty —</option>${SB_CARDS.map((c,i)=>`<option value="${i}" ${D.slots[k]===i?'selected':''}>${c.name} · ${c.fn}</option>`).join('')}</select></label>
    <button data-a="ver" data-v="1" class="${D.ver===1?'on':''}">v1 sheet</button><button data-a="ver" data-v="2" class="${D.ver===2?'on':''}">v2 sheet</button><button data-a="rst">reset rack</button></div>`;
}
function bindAll(root){ bindActs(root,{ slot:v=>A.slot(+v), ver:v=>A.ver(+v), rst:()=>reset(), show:v=>A.show(v) }); const s=root.querySelector('#cardSel'); if (s) s.onchange=e=>A.setCard(D.sel,+e.target.value); }
function compareTable(){
  const v=convert();
  return tbl(['','Serialboxx (MF100)','openGear'],[
    ['Frame','2RU, 10 cards (MF104: 4) — “4 or 10 card frames”','2RU, 20 slots — “10 or 20 card frames”'],
    ['Cards per RU','5','10'],
    ['BNC per card position','9 (1 in + 8 out)','10 (T6301 single slot)'],
    ['This rack',`${v.filled.length} cards · ${v.sbBNC} BNC · 2RU`,`${v.ogCards} cards · ${v.ogBNC} BNC · ${v.ogFrames*2}RU (${v.freeSlots} free slots)`],
    ['No equivalent',`${v.gaps.length}: ${v.gaps.map(g=>g.name.split(' ')[0]).join(', ')||'none'}`,'—'],
    ['Power','130 VA max; M8245A +21 V @ 4 A, −21 V @ 3 A (147 W out)','MF6220 plan 200 W; −7.5 V ≤ 200 mA per double slot'],
    ['Control','none remote (PIC, CPLD, jumpers)','CAN → frame controller → DashBoard, SNMP on later cards'],
  ]);
}
function xrefTable(){
  const rows=rowsFor(D.ver).filter(r=> D.show==='all' || (D.show==='gap'? !r[2] : !r[1]));
  return `<div style="display:flex;gap:6px;margin-bottom:6px"><button data-a="show" data-v="all" class="${D.show==='all'?'on':''}">all ${rowsFor(D.ver).length}</button><button data-a="show" data-v="gap" class="${D.show==='gap'?'on':''}">no openGear card (${rowsFor(D.ver).filter(r=>!r[2]).length})</button><button data-a="show" data-v="new" class="${D.show==='new'?'on':''}">openGear only (${rowsFor(D.ver).filter(r=>!r[1]).length})</button></div>`+
    tbl(['Function','Serialboxx card','openGear card'], rows.map(r=>[r[0], r[1]||'<span class="muted">—</span>', r[2]? `<b>${r[2]}</b>` : '<span style="color:var(--bad)">none</span>']));
}
function viewSim(m){
  m.innerHTML = `${card('MF100 Serialboxx frame, rear — click a card position', `<div id="sb"></div>${'<div id="ctl"></div>'}`)}
    ${card('The same rack converted to openGear', `<div id="og"></div>`)}
    <div class="grid2">${card('Comparison', `<div id="cmp"></div>`)}<div>${card('What the model did', `<div id="trace" class="log"></div>`)}${card('Cross-reference (RD38 sheet)', `<div id="xr"></div>`)}</div></div>
    ${card('Timeline — one second through the selected card', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const sb=m.querySelector('#sb'); sb.innerHTML=mf100Rear(); m.querySelector('#ctl').innerHTML=selHTML(); bindAll(sb); bindAll(m.querySelector('#ctl'));
    m.querySelector('#og').innerHTML=ogRear(); m.querySelector('#cmp').innerHTML=compareTable(); m.querySelector('#trace').innerHTML=traceHTML();
    const xr=m.querySelector('#xr'); xr.innerHTML=xrefTable(); bindAll(xr);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The question RD38 asked', body:`<p>By 2011|44 WBS sold openGear cards, but customers still had MF100 <b>Serialboxx</b> frames. RD38: “Serial box to OpenGear conversion for unavailable open gear cards”. Which Serialboxx functions can be replaced by an openGear card, and which have no card at all?</p><p>The two spreadsheets (7 and 14 Dec 2011) are the whole study. This tutorial walks a customer rack through them.</p>`, check:()=>true, auto:true },
  { title:'1 · Inspect a slot', body:`<p>Click card position <b>IN 4</b> on the MF100 rear. The trace shows the card and its openGear equivalent.</p>`, check:()=>D.sel===3, hint:'Click the column labelled IN 4.' },
  { title:'2 · Put in a card with no equivalent', body:`<p>Change that slot to the <b>DA305A</b> AES processing amplifier. It turns red: no openGear card. (RD43, “Make DA305 an opengear product”, was raised for exactly this.)</p>`, check:()=>SB_CARDS[D.slots[3]]&&SB_CARDS[D.slots[3]].name.startsWith('DA305A'), hint:'With IN 4 selected, choose DA305A in the card menu.' },
  { title:'3 · Count the gaps', body:`<p>Show only rows with <b>no openGear card</b> in the cross-reference. In v2 there are 13: the oscillator, utility video DA, AES DA, both DARS, both processing amps, the non-reclocking SDI DA, three demux/mux variants and both SD406 cards.</p>`, check:()=>D.show==='gap', hint:'Press “no openGear card”.' },
  { title:'4 · Compare v1 and v2', body:`<p>Switch to the <b>v1</b> sheet. One week later v2 split DARS into 75/110 Ω, added DA301B and an analog-input SD405 row, and the frame line.</p>`, check:()=>D.ver===1, hint:'Press “v1 sheet”.' },
  { title:'5 · Density and power', body:`<p>Back to v2. Read the comparison: openGear fits twice the cards per RU, and each slot gets 10 BNC instead of 9. A full rack of mapped cards fits in one 20-slot frame with room to spare.</p>`, check:()=>D.ver===2, hint:'Press “v2 sheet”.' },
  { title:'Done', body:`<p>The study stopped at the cross-reference: the register still shows RD38 as “?”. <b>Findings</b> lists what the sheets reveal.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — converting a Serialboxx rack', panelTitle:'MF100 rack and cross-reference', reset,
  panel(el){ el.innerHTML = mf100Rear() + selHTML() + `<div style="margin-top:8px">${xrefTable()}</div>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second through each kind of card', `<div id="lad"></div>`)}${card('Selected card at the playhead', `<div id="dev"></div>`)}`;
  const draw=()=>{ const t=SIM.t, c0=SB_CARDS[D.slots[D.sel]]||SB_CARDS[0];
    m.querySelector('#lad').innerHTML = tbl(['Kind','events per second','period','cards'],[
      ['AES3 frames','48,000','20.83 µs','DA301–DA305 / D62xx'],['AES3 biphase cells','6,144,000','163 ns','8 outputs each'],['SD-SDI words','27,000,000','37 ns','SD401–SD406 / M62xx (270 Mb/s serial)'],
      ['NTSC lines','15,734','63.6 µs','AV20x / AV620x'],['Oscillator','400 or 1,000','2.5 / 1 ms','AA103A (no openGear card)'],['Mains half-cycles','120','8.33 ms','M8245A supplies (85–264 VAC)'],
    ].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="mono">${r[2]}</span>`,`<span class="small">${r[3]}</span>`]));
    const K=KIND[c0.kind]; m.querySelector('#dev').innerHTML = kv([['Slot',`${D.sel+1}: ${c0.name}`],['Signal',K.name],['Events so far',Math.floor(t*K.rate).toLocaleString()+' '+K.unit,1],['openGear',c0.og||'none']]);
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    sbf:{x:20,y:30,w:200,h:90,t:'MF100 frame',s:['2RU · 10 cards','2 × M8245A ±21 V','MF100REF ref input'],d:'MF100man.wpd: hinged vented front, two separately fused supplies (130 VA max), BNC back panel 1 in + 8 out per card.'},
    sbc:{x:20,y:170,w:200,h:90,t:'Serialboxx card',s:['PIC / CPLD / SHARC','no remote control'],d:'From the Serialboxx README: PIC16Cxx/16F87x controllers, MAX CPLDs, one SHARC (DA305).'},
    term:{x:20,y:310,w:200,h:90,t:'TB101 / TB102 / TB103',s:['Phoenix, 110 Ω AES','mount over the BNCs'],d:'TB101 analog audio DAs and oscillator; TB102 analog I/O and 110 Ω embed/demux; TB103 transformer 110 Ω AES for DA304 (only 6 balanced outputs).'},
    map:{x:290,y:160,w:200,h:110,t:'RD38 cross-reference',s:['33 rows (v2)','13 with no openGear card','6 openGear-only'],d:'Serial Box Open Gear(v2).xlsx: one row per function. Blank openGear cell = gap.'},
    ogf:{x:560,y:30,w:180,h:90,t:'openGear frame',s:['2RU · 20 slots','MFC-8310 controller'],d:'Ross DFR-8310 or the WBS MF6220 (obsolete). Slot pitch 0.650/0.670 in alternating (MF6220 design notes).'},
    ogc:{x:560,y:170,w:180,h:90,t:'openGear card',s:['AT90CAN128 + DashBoard','FPGA / SHARC'],d:'D62xx, M62xx, AA/AV62xx (openGear README).'},
    rear:{x:560,y:310,w:180,h:90,t:'T62xx/T63xx/T64xx rear',s:['T6301: 10 BNC','T6303: 110 Ω TBs'],d:'Passive rear modules identified by AN_BMID2 resistor.'},
  };
  blockView(m,B,[['sbf','sbc',''],['sbc','term',''],['sbc','map','function'],['term','map','impedance'],['map','ogc','equivalent'],['ogf','ogc',''],['ogc','rear','']],{start:'map',h:420,side:'<p>RD38 maps each Serialboxx card and termination to the openGear card plus rear module that does the same job, and flags the functions that have none.</p>'});
}
const SHEETS=[
  { name:'1 · MF100 rear (per card)', note:'1 in + 8 out BNC per card position, from MF100man.wpd and the rear photo. TB terminations plug onto Berg headers behind the card and mount over the BNCs.', svg:()=>{
    let s=''; for(let b=0;b<9;b++){ s+=`<circle cx="${100+(b===0?0:((b-1)%2)*60)}" cy="${60+(b===0?0:1+Math.floor((b-1)/2))*60}" r="16" fill="none" stroke="var(--ink)"/><text x="${125+(b===0?0:((b-1)%2)*60)}" y="${64+(b===0?0:1+Math.floor((b-1)/2))*60}" font-size="11" fill="var(--accent2)">${b===0?'IN':'OUT'+b}</text>`; }
    return s + chip(420,60,200,'Berg header (card ↔ TB)',[['TB101','analog audio (AA101A/102A/103A)'],['TB102','analog / 110 Ω (DA301A, DA303A, SD403A, SD405A, SD406B)'],['TB103','110 Ω xfmr AES (DA304A/B): 6 outs']],[],'termination options'); } },
  { name:'2 · Power', note:'M8245A from m8245aspecs.wpd; frame figures from MF100man.wpd and the MF6220 README.', svg:()=>
    chip(120,80,200,'M8245A ×2',[['L/N','85–264 VAC'],['','47–63 Hz, 3.3 A max']],[['+21 V','4 A'],['−21 V','3 A'],['','redundancy diodes']],'switch-mode, hot-swappable') + chip(520,80,220,'MF100 backplane',[['+21 V','to 10 cards'],['−21 V','to 10 cards']],[['','130 VA frame max'],['','≈ 13 VA per card (inferred)']],'') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'MF100 manual, M8245A specs and RD38 sheets', 'No schematic belongs to RD38 itself. These sheets redraw the frame-level facts the conversion depends on.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Conversion procedure (what the model runs on every change)', `<div id="fl"></div>`)}${card('v1 → v2 differences', `<div id="df"></div>`)}</div>`;
  const draw=()=>{ const v=convert();
    const st=['for each MF100 slot 1–10: card or empty','look up the function row in the chosen sheet','openGear cell blank? → gap list',`count mapped cards → ${v.ogCards}`,`frames = ceil(${v.ogCards} / 20) = ${v.ogFrames}`,`BNC: ${v.sbBNC} (9 per card) → ${v.ogBNC} (10 per T6301)`];
    m.querySelector('#fl').innerHTML = `<svg viewBox="0 0 520 ${st.length*40+10}" style="width:100%">${st.map((s,i)=>`<rect x="6" y="${6+i*40}" width="508" height="30" rx="6" fill="${i===2&&v.gaps.length?'var(--warn)':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${26+i*40}" font-size="12" fill="var(--ink)">${s}</text>`).join('')}</svg>`;
    m.querySelector('#df').innerHTML = tbl(['Change','v1','v2'],[['Frame line','—','4 or 10 card frames | 10 or 20 card frames'],['D-to-A','DA301','DA301A with TB102'],['AES DA','—','DA301B (no openGear)'],['DARS','DA302','DA302 (75 Ω) + DA302 with TB103 (110 Ω)'],['Single-group muxer','SD405A','SD405A (75 Ω) + SD405 with TB102 (analog inputs)'],['Rows','30','33']]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD38 decided, and what became of it', `<ol>
    <li><b>Register: RD38 “?”, no owner, no date.</b> The study is the two cross-reference sheets of 7 and 14 Dec 2011|44. No conversion product followed in the archive; the Serialboxx line now sits under <span class="mono">xxx-OBSOLETE - To Delete</span>.</li>
    <li><b>13 of 33 functions had no openGear card</b> (v2): AA103A oscillator, AV203A, DA301B, DA302 (75 and 110 Ω), DA305A / DA305, SD401A, SD403A, SD405A, SD405 + TB102, SD406A, SD406B.</li>
    <li><b>Related register items.</b> RD43 “Digital Fader: Make DA305 an opengear product” (priority C) targets one of the gaps; RD41 “OpenGear Light” (?) sits next to it. Neither is marked complete.</li>
    <li><b>The sheet documents a difference nobody else did.</b> The openGear README says the AV6201/AV6202 difference is undocumented. RD38 maps AV201A (differential input) → <b>AV6202A</b> and AV202A (clamping input) → <b>AV6201A</b>.</li>
    <li><b>“Muxer with Dolby decoder” → plain M6204A.</b> Both “with Dolby decoder” muxer rows point at M6204A, not an “E” variant, while the demux rows correctly use M6202AE. The openGear index lists an M6204AE, so this looks like a copy error.</li>
    <li><b>Card naming disagrees with the launch sheet.</b> Serialboxx.wpd (NAB 2001) lists DA302A = AES processing amplifier and DA302B = DARS generator. RD38 calls DA302 the DARS generator and gives processing to DA305.</li>
    <li><b>Impedance is a rear-module choice on openGear.</b> 75 Ω and 110 Ω demux both map to M6202A; on Serialboxx the 110 Ω version was a different card (SD403C) plus TB102.</li>
    <li><b>Density.</b> MF100: 10 cards and 90 BNC in 2RU. openGear: 20 slots and up to 200 BNC in 2RU. Any full MF100 converts into one openGear frame with at least 10 slots spare.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>openGear rear BNC layout (two staggered columns) is drawn, not measured (${inf}).</li><li>Per-card power share of the MF100 (≈ 13 VA) is the frame maximum divided by 10 (${inf}).</li><li>The default rack contents are an example, not a customer list.</li></ul>`) + card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD38-SerialBoxVsOpenGear/Serial Box Open Gear.xlsx, …v2.xlsx · R&amp;D_List.xls</li><li>#SERIALBOX #SERIES/SERIALBOXX - #mf100/MF100man.wpd, m8245aspecs.wpd · …/OBSOLETE - SERIALBOXX/Serialboxx.wpd · MF100 Rear w REF.jpg</li><li>#OPENGEAR #SERIES/README.md · XXX - MF6220 - FRAME … /README.md · T6301 README</li></ul>`);
}

SIM.register({
  id:'rd38-serialboxvsopengear', name:'RD38 Serial Box vs openGear · card cross-reference model (2011|44)', duration:1,
  product:'RD38 Serial Box vs openGear', year:2011, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD38-SerialBoxVsOpenGear',
  summary:'The December 2011 cross-reference of Serialboxx MF100 cards against Ward-Beck openGear cards, as a working conversion model: load an MF100 rack, see the openGear frame it becomes, and which functions have no openGear card.',
  highlights:['MF100 rear drawn to scale, clickable slots','Live conversion to a 20-slot openGear frame','13 functions with no openGear card','v1 vs v2 spreadsheet differences','Density and power comparison'],
  depth:'Hardware model',
  stepUnits:[{label:'1 AES frame',period:()=>1/48000},{label:'1 video line',period:()=>1/15734.26},{label:'1 field',period:()=>1001/60000},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1001/60000,'1 field'],[0.004,'1 AES block (4 ms)'],[0.0005,'500 µs']],
  defaultZoom:1,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: converting a rack', render:viewTutorial},
    {id:'second', label:'One second, by card type', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});

})();
