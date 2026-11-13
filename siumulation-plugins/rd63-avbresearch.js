/* =====================================================================
   RD63 — AVB (Audio Video Bridging) Research (Ward-Beck R&D register: kevin / engineering, priority C, 2013–2014)
   Plugin for the WBS Device Simulator (../siumulation.html)

   The folder is a research file: project scope (AVB audio, AVB video, AVB over Wi-Fi), notes from an AVB
   networking conference (28 Jan 2013), two background articles, an XMOS research sheet, licence notes for
   the DigiDesignCorp (DDC) FPGA IP, the DSP4YOU AVB dongle workspace, and the UMAN controller.
   This plugin models what the research was about: how many audio channels an AVB link can reserve, how the
   802.1 pieces (gPTP, SRP, credit-based shaping, 2 ms presentation time) behave in one second, and what each
   vendor route would cost, then links to where it went (RD79 AVB Monitor on an XMOS dongle copy).
   Sources (all in this archive, RD63-AVBResearch/):
   - Project Scope.docx · AVBNetworkingConference2012_notes.doc · Audio Video Bridging.docx (XMOS article:
       802.1AS/Qav/Qat, class A 2 ms / class B 50 ms max transit, 8 threads at 400 MIPS, 100 MHz timers)
   - Boradcast Engineering AVB article.docx (Layer 2 only; a non-AVB bridge breaks the guarantee; Figure 1)
   - xmos/XMOS Research.xlsx (vendor reply: 10/100 Ethernet today, GigE planned late 2014, "32 channels or less")
   - DigiDesignCorp AVB IP OEM/IP LIcense and OEM infot.txt (dev kit $14,999; site licence $100,000; project
       licence about $50,000; WBS volume 100–200 per year; 1 Gb link; Spartan-6 "grey box" netlist option)
   - DSP4YOU/Info-D4U-AVB-Dongle1/readme.txt (workspace 14 June 2013, TARGET = D4U-AVB-DG, i2c tx8 patch)
   - Final Research Notes.xlsx (one competitor row) · AVB Products Research/AVB Competitor Products.docx
   - ../RD79-AVB Monitor/README.md (outcome: WBS-AVB-DG, XS1-L16, 8-ch listener, CS4270 at 0x90/0x92)
   Vendor contact names and numbers in the source files are deliberately left out.
   Packet overheads, the 75 % reservation limit, sync intervals and AM824 sample size are 802.1/1722
   standard values, not archive text: marked inferred.
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
const plink = (id, txt) => `<a href="siumulation.html?plugin=${id}">${txt}</a>`;
/* level-per-symbol waveform (NRZ/NRZI/biphase cells); falls back to a counted band when too dense */
function bitsLane(c, X, t0, t1, y, h, T, levelFn, col, label){
  const px = X(t0+T)-X(t0);
  if (px < 2){ return SIM.pulses(c, X, t0, t1, y, h, T, 0, T/2, col, label); }
  const n0 = Math.floor(t0/T), n1 = Math.ceil(t1/T);
  c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath();
  let prev = null;
  for (let n=n0; n<=n1; n++){ const v = levelFn(n); const yy = y+4+(1-v)*(h-8); const xa = X(n*T), xb = X((n+1)*T);
    if (prev===null) c.moveTo(xa, yy); else c.lineTo(xa, yy); c.lineTo(xb, yy); prev = v; }
  c.stroke(); c.lineWidth = 1;
}
/* smooth function lane: fn(t) in −1…1 */
function waveLane(c, X, t0, t1, y, h, fn, col, N){
  N = N || 600; c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath();
  for (let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const v=fn(t); const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); }
  c.stroke(); c.lineWidth = 1;
}
/* deterministic pseudo-random 0/1 for symbol n (so the picture does not flicker) */
const prand = n => { let x = (n*2654435761)>>>0; x ^= x>>>13; x = Math.imul(x, 0x5bd1e995)>>>0; x ^= x>>>15; return x & 1; };

/* ================= model ================= */
const FS = 48000;
const CLS = { A:{ name:'Class A', rate:8000, maxT:0.002 }, B:{ name:'Class B', rate:4000, maxT:0.050 } };   // 2 ms / 50 ms: XMOS article
const OVH = 8+14+4+24+8+4+12;      // preamble, MAC, VLAN, 1722 header, CIP, FCS, IFG (bytes, inferred)
const BYTES_PER_SAMPLE = 4;        // AM824 (inferred)
const RESERVABLE = 0.75;           // 802.1Qav default (inferred)
const SYNC_I = 0.125, PDELAY_I = 1.0;   // gPTP intervals (inferred)
const D = { link:100, cls:'A', streams:[8,8,8,8,8], nonAvb:false, wifi:false, sel:0, units:150, years:5, route:'xmos' };
function reset(){ Object.assign(D,{ link:100, cls:'A', streams:[8,8,8,8,8], nonAvb:false, wifi:false, sel:0, units:150, years:5, route:'xmos' }); LOG.items=[]; SIM.refresh(); }
function streamBw(ch){ const c=CLS[D.cls]; const spp=FS/c.rate; const bytes=ch*spp*BYTES_PER_SAMPLE+OVH; return { spp, bytes, bps: bytes*8*c.rate, txT: bytes*8/(D.link*1e6) }; }
function srp(){
  const cap=D.link*1e6*RESERVABLE; let used=0; const res=D.streams.map((ch,i)=>{ const b=streamBw(ch); const ok=!D.nonAvb && !D.wifi && used+b.bps<=cap; if (ok) used+=b.bps; return { i, ch, ...b, ok, why: D.nonAvb?'non-AVB bridge in the path: no SRP domain':D.wifi?'802.11 not part of 802.1BA in 2013':ok?'reserved':'over 75 % of the link' }; });
  return { res, used, cap, chans: res.filter(r=>r.ok).reduce((a,r)=>a+r.ch,0) };
}
const ROUTES = {
  xmos:{ name:'XMOS reference design', dev:0, lic:0, note:'Reference design and tools free; 10/100 now, GigE “late 2014”; best for ≤ 32 channels (XMOS Research.xlsx).' },
  ddcP:{ name:'DDC FPGA IP, project licence', dev:14999, lic:50000, note:'Dev kit $14,999 + project licence “about $50,000” (IP LIcense and OEM infot.txt).' },
  ddcS:{ name:'DDC FPGA IP, site licence', dev:14999, lic:100000, note:'Dev kit $14,999 + $100,000 site licence.' },
  ddcO:{ name:'DDC OEM board / grey box', dev:0, lic:0, note:'Offered for 100–200 units a year; price not stated (“up for discussions”).' },
  xil:{ name:'Xilinx Ethernet AVB LogiCORE', dev:0, lic:0, note:'DS677 / UG492 in the folder; no price recorded.' },
};
function cost(){ const r=ROUTES[D.route]; const n=D.units*D.years; return { ...r, n, perUnit:(r.dev+r.lic)/n }; }
const A = {
  link(v){ act(`Link → ${v} Mb/s`, tr=>{ D.link=+v; const s=srp(); tr(`Reservable ${(s.cap/1e6).toFixed(0)} Mb/s (75 % ${inf}); ${s.chans} channels reserved`); if (v==1000) tr('DDC baseline: “Network - 1GB link”; XMOS GigE only “late in 2014”'); }); },
  cls(v){ act(`Stream class → ${v}`, tr=>{ D.cls=v; const c=CLS[v]; tr(`${c.rate} packets/s per stream, ${FS/c.rate} samples per packet, max transit ${c.maxT*1000} ms (XMOS article)`); }); },
  add(){ act('Add an 8-channel talker stream', tr=>{ D.streams.push(8); const s=srp(), r=s.res[s.res.length-1]; tr(`MSRP Talker Advertise → bridge checks bandwidth: ${(r.bps/1e6).toFixed(2)} Mb/s → ${r.ok?'Listener Ready, reserved':'<b style="color:var(--bad)">Talker Failed</b> ('+r.why+')'} ${inf}`); }); },
  rm(){ act('Remove the last stream', tr=>{ D.streams.pop(); }); },
  ch(v){ act(`Stream ${D.sel+1} → ${v} channels`, tr=>{ D.streams[D.sel]=+v; const b=streamBw(+v); tr(`${b.spp} samples × ${v} ch × 4 B + ${OVH} B overhead = ${b.bytes} B per packet → ${(b.bps/1e6).toFixed(2)} Mb/s`); }); },
  sel(i){ act('Select stream '+(+i+1), tr=>{ D.sel=+i; }); },
  nonAvb(){ act(D.nonAvb?'Replace with an AVB bridge':'Insert a non-AVB switch', tr=>{ D.nonAvb=!D.nonAvb; tr('Broadcast Engineering article: “The introduction of a non-AVB bridge or a non-AVB end point to an AVB-compliant cloud means that AVB performance cannot be guaranteed.”'); tr('XMOS article: a switch without AVB support splits the network into two domains'); }); },
  wifi(){ act(D.wifi?'Back to wired':'Try AVB over Wi-Fi (Project Scope item)', tr=>{ D.wifi=!D.wifi; tr('Project Scope.docx: “Look into possibility of sending AVB data through wifi”. Articles: 802.11 support “anticipated in the future”.'); }); },
  route(v){ act('Vendor route → '+ROUTES[v].name, tr=>{ D.route=v; const c=cost(); tr(ROUTES[v].note); tr(`${D.units}/yr × ${D.years} yr = ${c.n} units → $${c.perUnit.toFixed(2)} of up-front cost per unit`); }); },
  units(v){ act(`Volume → ${v} per year`, tr=>{ D.units=+v; tr('WBS told DDC 100–200 units per year'); }); },
};

/* ================= panel: network ================= */
function netSVG(){
  const s0=srp(); const n=D.streams.length;
  let s=`<svg viewBox="0 0 900 300" style="width:100%" role="img" aria-label="AVB network"><defs><marker id="ar63" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  s+=`<rect x="10" y="10" width="${D.nonAvb?430:880}" height="280" rx="16" fill="color-mix(in srgb,var(--accent) 6%,transparent)" stroke="var(--accent)" stroke-dasharray="6 6"/><text x="22" y="30" font-size="12" fill="var(--accent)">AVB cloud (one gPTP domain)</text>`;
  s0.res.forEach((r,i)=>{ const y=50+i*(220/Math.max(1,n-1||1)); const yy=n===1?150:y; s+=`<g data-a="sel" data-v="${i}" style="cursor:pointer"><rect x="40" y="${yy-16}" width="150" height="32" rx="6" fill="${r.ok?'var(--panel2)':'color-mix(in srgb,var(--bad) 20%,var(--panel2))'}" stroke="${D.sel===i?'var(--accent)':'var(--line)'}" stroke-width="${D.sel===i?2.5:1}"/><text x="50" y="${yy+5}" font-size="12" fill="var(--ink)">Talker ${i+1} · ${r.ch} ch</text></g><line x1="190" y1="${yy}" x2="330" y2="150" stroke="${r.ok?'var(--accent)':'var(--bad)'}" stroke-width="${r.ok?2:1}" ${r.ok?'':'stroke-dasharray="4 4"'}/>`; });
  s+=`<g data-a="nonAvb" style="cursor:pointer"><rect x="330" y="120" width="120" height="60" rx="8" fill="${D.nonAvb?'color-mix(in srgb,var(--bad) 25%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="390" y="146" text-anchor="middle" font-size="13" fill="var(--ink)">${D.nonAvb?'plain switch':'AVB bridge'}</text><text x="390" y="164" text-anchor="middle" font-size="11" fill="var(--ink2)">${D.link} Mb/s · click</text></g>`;
  s+=`<line x1="450" y1="150" x2="560" y2="150" stroke="var(--ink2)" stroke-width="2" marker-end="url(#ar63)"/><text x="460" y="140" font-size="11" fill="var(--ink2)">${(s0.used/1e6).toFixed(1)} / ${(s0.cap/1e6).toFixed(0)} Mb/s</text>`;
  s+=`<rect x="560" y="110" width="200" height="80" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="570" y="134" font-size="13" font-weight="700" fill="var(--ink)">Listener: AMS8 / MLC8</text><text x="570" y="152" font-size="11" fill="var(--ink2)">XMOS WBS-AVB-DG, 8-ch sink (RD79)</text><text x="570" y="170" font-size="11" fill="var(--ink2)">${s0.chans} channels reserved on link</text>`;
  if (D.wifi) s+=`<text x="560" y="230" font-size="13" fill="var(--bad)">Wi-Fi hop: outside 802.1BA (2013) — no reservation</text>`;
  s+='</svg>';
  return s;
}
function ctlHTML(){
  const b=(a,v,l,on)=>`<button data-a="${a}" data-v="${v}" class="${on?'on':''}">${l}</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span class="small muted">link</span>${b('link',100,'100 Mb/s',D.link===100)}${b('link',1000,'1 Gb/s',D.link===1000)}
   <span class="small muted">| class</span>${b('cls','A','A (2 ms)',D.cls==='A')}${b('cls','B','B (50 ms)',D.cls==='B')}
   <span class="small muted">| streams</span>${b('add','','+ 8-ch talker',false)}${b('rm','','− talker',false)}
   <span class="small muted">| stream ${D.sel+1}</span>${[2,8,16,32].map(v=>b('ch',v,v+' ch',D.streams[D.sel]===v)).join('')}
   ${b('nonAvb','',D.nonAvb?'plain switch in path':'insert plain switch',D.nonAvb)}${b('wifi','',D.wifi?'Wi-Fi hop on':'Wi-Fi hop',D.wifi)}</div>`;
}
function costHTML(){
  const c=cost(); const b=(a,v,l,on)=>`<button data-a="${a}" data-v="${v}" class="${on?'on':''}">${l}</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px">${Object.keys(ROUTES).map(k=>b('route',k,ROUTES[k].name,D.route===k)).join('')}</div>
   <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><span class="small muted">units / year</span>${[100,150,200].map(v=>b('units',v,v,D.units===v)).join('')}</div>
   ${kv([['Route',c.name],['Up-front',`$${(c.dev+c.lic).toLocaleString()}`],['Units over '+D.years+' years',c.n],['Up-front cost per unit',`$${c.perUnit.toFixed(2)}`],['Note',c.note]])}`;
}
function bindAll(root){ bindActs(root,{ link:v=>A.link(v), cls:v=>A.cls(v), add:()=>A.add(), rm:()=>A.rm(), ch:v=>A.ch(v), sel:v=>A.sel(v), nonAvb:()=>A.nonAvb(), wifi:()=>A.wifi(), route:v=>A.route(v), units:v=>A.units(v) }); }

/* ================= timeline ================= */
function lanes(){
  const css=SIM.css, c=CLS[D.cls], s0=srp(), r=s0.res[D.sel]||s0.res[0];
  return [
    { label:'gPTP Sync (125 ms) / Pdelay (1 s)', h:22, draw(cx,X,t0,t1,y,h){ SIM.pulses(cx,X,t0,t1,y,h,SYNC_I,0.01,0.0004,css('--warn'),'Sync'); SIM.pulses(cx,X,t0,t1,y+h/2,h/2,PDELAY_I,0.3,0.0004,css('--bad'),'Pdelay'); } },
    { label:'Audio samples (48 kHz)', h:20, draw(cx,X,t0,t1,y,h){ SIM.pulses(cx,X,t0,t1,y,h,1/FS,0,0.5/FS,css('--accent2'),'samples'); } },
    { label:`Talker ${D.sel+1} packets (${c.rate}/s, ${r?r.spp:0} samples)`, h:24, draw(cx,X,t0,t1,y,h){ if(!r||!r.ok){ laneText(cx,X,t0,y,h,'stream not reserved: '+(r?r.why:''),css('--bad')); return; } SIM.pulses(cx,X,t0,t1,y,h,1/c.rate,0.00002,r.txT,css('--accent'),'AVTP packets'); } },
    { label:'All reserved streams on the wire', h:24, draw(cx,X,t0,t1,y,h){ const P=1/c.rate; if ((X(t0+P)-X(t0))<4){ bandAt(cx,X,t0,t1,y,h,css('--accent'),.3,`${s0.res.filter(q=>q.ok).length} streams, ${(s0.used/1e6).toFixed(1)} Mb/s`); return; }
      for (let k=Math.floor(t0/P);k*P<t1;k++){ let a=k*P+0.00002; s0.res.forEach((q,i)=>{ if(!q.ok) return; cx.fillStyle=i===D.sel?css('--accent'):css('--accent2'); cx.fillRect(X(a),y+4,Math.max(1,X(a+q.txT)-X(a)),h-8); a+=q.txT; }); } } },
    { label:'Best-effort traffic (shaped behind AVB)', h:22, draw(cx,X,t0,t1,y,h){ const P=1/c.rate; if ((X(t0+P)-X(t0))<4){ laneText(cx,X,t0,y,h,`${(D.link*(1-s0.used/(D.link*1e6))).toFixed(0)} Mb/s left for other traffic`); return; }
      for (let k=Math.floor(t0/P);k*P<t1;k++){ const busy=s0.res.filter(q=>q.ok).reduce((a,q)=>a+q.txT,0); const a=k*P+0.00002+busy; cx.fillStyle=css('--ink2'); cx.globalAlpha=.4; cx.fillRect(X(a),y+6,Math.max(1,X(k*P+P)-X(a)-1),h-12); cx.globalAlpha=1; } } },
    { label:`Presentation time (+${c.maxT*1000} ms) at listener`, h:22, draw(cx,X,t0,t1,y,h){ if(!r||!r.ok) return; SIM.pulses(cx,X,t0,t1,y,h,1/c.rate,0.00002+c.maxT,1/c.rate*0.3,css('--warn'),'samples presented'); } },
  ];
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `${card('AVB network — click a talker or the bridge', `<div id="net"></div><div id="ctl"></div>`)}
   <div class="grid2"><div>${card('Stream reservation (SRP)', `<div id="srp"></div>`)}</div><div>${card('What the model did', `<div id="trace" class="log"></div>`)}${card('Vendor routes (cost per unit)', `<div id="cost"></div>`)}</div></div>
   ${card('Timeline — clock, packets and presentation time', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const n=m.querySelector('#net'); n.innerHTML=netSVG(); bindAll(n); const c=m.querySelector('#ctl'); c.innerHTML=ctlHTML(); bindAll(c);
    const s0=srp(); m.querySelector('#srp').innerHTML=tbl(['Stream','ch','B/packet','Mb/s','SRP'], s0.res.map(r=>[r.i+1,r.ch,r.bytes,(r.bps/1e6).toFixed(2),r.ok?'reserved':`<span style="color:var(--bad)">${r.why}</span>`])) + `<p class="small">Reserved ${s0.chans} channels, ${(s0.used/1e6).toFixed(1)} of ${(s0.cap/1e6).toFixed(0)} Mb/s.</p>`;
    m.querySelector('#trace').innerHTML=traceHTML(); const co=m.querySelector('#cost'); co.innerHTML=costHTML(); bindAll(co);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The research question', body:`<p>2013|46: should WBS products speak AVB? The scope lists three things: AVB audio, AVB video, AVB over Wi-Fi. Peter went to an AVB conference (notes dated 28 Jan 2013) and collected vendor material. Work through the numbers he needed.</p>`, check:()=>true, auto:true },
  { title:'1 · How many channels on 100 Mb/s?', body:`<p>Start with the XMOS route: a 100 Mb/s link, class A. Five 8-channel talkers are offered. Read the SRP table: only four fit inside 75 % of the link. That is the “32 channels or less” XMOS gave as its sweet spot.</p>`, check:()=>D.link===100&&D.cls==='A'&&srp().chans===32, hint:'Press “Start over” if you changed the defaults.' },
  { title:'2 · Gigabit', body:`<p>Switch to <b>1 Gb/s</b> (the DDC baseline). Every stream is reserved, with room for many more.</p>`, check:()=>D.link===1000, hint:'Press 1 Gb/s.' },
  { title:'3 · Class B', body:`<p>Back to 100 Mb/s and choose <b>class B</b>. Half the packets, twice the samples per packet: less header overhead, but the latency allowance grows from 2 ms to 50 ms.</p>`, check:()=>D.link===100&&D.cls==='B', hint:'100 Mb/s, then class B.' },
  { title:'4 · A plain switch', body:`<p>Back to class A. Click the bridge, or press <b>insert plain switch</b>. Both articles warn that one non-AVB device ends the guarantee: every reservation fails.</p>`, check:()=>D.nonAvb&&D.cls==='A', hint:'Class A, then the switch.' },
  { title:'5 · Wi-Fi', body:`<p>Restore the AVB bridge and try the <b>Wi-Fi hop</b> from the project scope. In 2013 802.11 was outside 802.1BA, so nothing can be reserved.</p>`, check:()=>!D.nonAvb&&D.wifi, hint:'Click the switch again, then Wi-Fi hop.' },
  { title:'6 · What does the IP cost?', body:`<p>Turn Wi-Fi off. In the vendor panel choose <b>DDC FPGA IP, project licence</b> at <b>150</b> units a year: about $86 of up-front cost in every unit over five years, before any parts. The XMOS reference design had no licence fee.</p>`, check:()=>!D.wifi&&D.route==='ddcP'&&D.units===150, hint:'Wi-Fi off, DDC project licence, 150.' },
  { title:'Done', body:`<p>XMOS won: RD79 built the WBS-AVB-DG listener for the AMS8 and MLC8. See the Findings tab.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — sizing AVB for WBS', panelTitle:'Network, reservation and vendors', reset,
  panel(el){ const s0=srp(); el.innerHTML = netSVG()+ctlHTML()+`<p class="small">Reserved ${s0.chans} channels.</p>`+costHTML(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second on an AVB link', `<div id="lad"></div>`)}${card('Conference notes: the alternatives (28 Jan 2013)', `<div id="alt"></div>`)}`;
  const draw=()=>{ const c=CLS[D.cls], s0=srp(), r=s0.res[D.sel];
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','note'],[
      ['Audio samples per channel','48,000',''],[`Packets per stream (${c.name})`,c.rate.toLocaleString(),`${FS/c.rate} samples each`],['Packets, all reserved streams',(c.rate*s0.res.filter(q=>q.ok).length).toLocaleString(),''],
      ['Bits reserved',Math.round(s0.used).toLocaleString(),`of ${Math.round(s0.cap).toLocaleString()} reservable ${inf}`],['gPTP Sync messages','8',`every 125 ms ${inf}`],['Pdelay exchanges','1',`every 1 s ${inf}`],
      ['Selected stream wire time per packet',r?SIM.fmtDur(r.txT):'—',`${r?r.bytes:0} bytes at ${D.link} Mb/s`],
    ]);
    m.querySelector('#alt').innerHTML = tbl(['System','Note from the conference'],[['CobraNet','debuted 1994; largest installed base; 5¼ ms latency'],['EtherSound','2002, Digigram; 64 × 64; intolerant of other data; broadcast, not switch friendly'],['Dante / Q-LAN / RAVENNA','VoIP timing; QoS needs manual switch setup, “prioritization is NOT a guarantee”; single-vendor'],['AVB','open IEEE standard; needs AVB switches and endpoints; full duplex; ≤ 2 ms to all listeners']]);
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    tk:{x:20,y:150,w:170,h:80,t:'Talker',s:['1722 AVTP packets','e.g. mic, console'],d:'“Talker – device that puts audio avb onto the network” (conference notes).'},
    br:{x:260,y:150,w:170,h:80,t:'AVB bridge',s:['802.1Qat SRP','802.1Qav shaper'],d:'Reserves bandwidth per stream; credit-based shaper releases class A packets every 125 µs.',live:()=>!D.nonAvb},
    ls:{x:500,y:150,w:170,h:80,t:'Listener',s:['presentation time','media clock'],d:'Plays each sample at its presentation time: all listeners within 2 ms (conference notes).'},
    gm:{x:260,y:30,w:170,h:70,t:'Grandmaster',s:['802.1AS gPTP'],d:'Best-master selection gives one clock for the cloud (XMOS article).'},
    ctl:{x:500,y:30,w:170,h:70,t:'Controller',s:['1722.1 discovery','UMAN unosVision'],d:'AVDECC device discovery and connection; UMAN controller drafts are in the folder.'},
    wbs:{x:500,y:290,w:220,h:80,t:'WBS listener (RD79)',s:['XMOS WBS-AVB-DG','I2S → AMS8/MLC8 FPGA'],d:'Where the research went: an 8-ch XMOS listener feeding the monitor FPGA.'},
  };
  blockView(m,B,[['tk','br','stream'],['br','ls','stream'],['gm','br','sync'],['gm','tk',''],['gm','ls',''],['ctl','ls','1722.1'],['ls','wbs','is']],{start:'br',w:760,h:390,side:'<p>The four 802.1 pieces: time (AS), reservation (Qat), shaping (Qav), and the profile tying them together (BA).</p>'});
}
const SHEETS=[
  { name:'1 · DSP4YOU AVB dongle (RD79 base)', note:'From RD79 README and the DSP4YOU readme: XS1-L16 (two XS1-L8A tiles), 25 MHz oscillator, AT25DF041A boot flash, two CS4270 codecs at I²C 0x90 / 0x92, I2S master. Pin names simplified.', svg:()=>
    chip(330,50,220,'XS1-L16 (XS1-LnA-128-QF124)',[['MII','Ethernet PHY'],['SPI','AT25DF041A'],['XTAG','JTAG debug'],['OSC','25 MHz']],[['I2S','MCLK/BCLK/LRCLK/SD'],['SCL','I²C (tx8 patch)'],['SDA','I²C']],'500 MHz, 2 tiles') +
    chip(680,300,150,'CS4270 #1',[['SCL/SDA','addr 0x90']],[['AOUT','ch 1–2']],'codec') + chip(680,140,150,'CS4270 #2',[['SCL/SDA','addr 0x92']],[['AOUT','ch 3–4']],'codec') },
  { name:'2 · i2c.xc tx8 patch', note:'DSP4YOU readme: the code the WBS build had to patch into module_i2c_simple/src/i2c.xc (bit-reversed shift-out, MSB first).', svg:()=>
    `<text x="40" y="60" font-size="13" font-family="monospace" fill="var(--ink)">static int tx8(port i2c_scl, port i2c_sda, unsigned data) {</text>
     <text x="60" y="82" font-size="13" font-family="monospace" fill="var(--ink)">unsigned CtlAdrsData = ((unsigned) bitrev(data)) &gt;&gt; 24;</text>
     <text x="60" y="104" font-size="13" font-family="monospace" fill="var(--ink)">for (int i = 8; i != 0; i--) {</text>
     <text x="80" y="126" font-size="13" font-family="monospace" fill="var(--ink)">i2c_sda &lt;: CtlAdrsData &amp; SDA_HIGH;  CtlAdrsData &gt;&gt;= 1;  highPulse(i2c_scl);</text>
     <text x="60" y="148" font-size="13" font-family="monospace" fill="var(--ink)">}  return highPulseSample(i2c_scl, i2c_sda);  }</text>
     <text x="40" y="200" font-size="12" fill="var(--ink2)">Makefile: TARGET = D4U-AVB-DG (RD79 renamed it WBS-AVB-DG)</text>` },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the DSP4YOU readme and RD79 README', 'RD63 holds third-party schematics only (XMOS endpoint kit, DSP4YOU dongle); these sheets redraw the board WBS actually adopted, by function.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('XMOS endpoint: one task per thread (article: 8 threads per core)', `<div id="th"></div>`)}${card('SRP admission, step by step', `<div id="sp"></div>`)}</div>`;
  const draw=()=>{ const c=CLS[D.cls]; const ph=(SIM.t%(1/c.rate))*c.rate; const T=['Ethernet MAC RX/TX','gPTP (802.1AS)','SRP / MAAP','1722 talker/listener','media clock recovery','I2S to codecs / FPGA','1722.1 entity','application'];
    const cur=Math.floor(ph*T.length);
    m.querySelector('#th').innerHTML = `<svg viewBox="0 0 520 ${T.length*36+10}" style="width:100%">${T.map((s,i)=>`<rect x="6" y="${6+i*36}" width="508" height="28" rx="6" fill="${i===cur?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${25+i*36}" font-size="12" fill="var(--ink)">thread ${i}: ${s}</text>`).join('')}</svg><p class="small muted">Deterministic round-robin; the highlight sweeps once per ${SIM.fmtDur(1/c.rate)} packet period. Thread allocation ${inf}.</p>`;
    const s0=srp(); let used=0;
    m.querySelector('#sp').innerHTML = tbl(['Step','Stream','Need','Running total','Result'], s0.res.map(r=>{ if(r.ok) used+=r.bps; return ['Talker Advertise → bridge',r.i+1,(r.bps/1e6).toFixed(2)+' Mb/s',(used/1e6).toFixed(2)+' Mb/s',r.ok?'Listener Ready':'Talker Failed']; }));
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD63 decided, and what became of it', `<ol>
    <li><b>XMOS was chosen.</b> The decision is not written down in RD63, but RD79 (AVB Monitor) built the XMOS <span class="mono">app_simple_avb_demo</span> for a board target WBS-AVB-DG, a copy of the DSP4YOU D4U-AVB-DG dongle whose June 2013 workspace sits in this folder. Its 1722.1 entity name went “WBS AVB Dongle” → “MLC8” → “AMS8”.</li>
    <li><b>The volume decided the vendor.</b> DDC quoted a $14,999 dev kit and $50,000 (project) or $100,000 (site) for the IP against WBS's 100–200 units a year. XMOS gave its reference design away and said its 10/100 solution suits “32 channels or less”, and RD79 needed 8.</li>
    <li><b>100 Mb/s really is about 32 channels.</b> In the model, class A 8-channel streams cost 17.0 Mb/s each, and 75 % of 100 Mb/s holds four of them (${inf}: overheads and the 75 % limit are standard values).</li>
    <li><b>Video and Wi-Fi went nowhere.</b> The scope's “AVB video” and “AVB data through wifi” have no follow-up; the only video item is one competitor row (S-Video/composite to AVB over CAT5).</li>
    <li><b>Folder names.</b> “Boradcast Engineering AVB article.docx” is misspelt. The README notes some vendor files date from 2010|43, before the project started.</li>
    <li><b>“AVB” means three things in this archive.</b> RD63/RD79 Audio Video Bridging; the AVB1 “VIDBuddy” Audio/Video Buddy of 2002 (xxx-OBSOLETE); and RD69's “Vid Buddy”. They are unrelated.</li>
    <li><b>Successor.</b> RD85 (Archwave RAVENNA monitor) and the 32ME-N (uNet RAVENNA module) moved WBS from AVB to RAVENNA/AES67 (${plink('32me','32ME')}).</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Packet overhead (${OVH} B), AM824 4-byte samples, the 75 % reservable share and the gPTP intervals are IEEE 802.1/1722 defaults (${inf}).</li><li>XMOS thread allocation is illustrative (${inf}).</li><li>Per-unit cost spreads only the up-front fees over five years; part costs are not in the archive.</li></ul>`) +
  card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD63-AVBResearch/ (Project Scope.docx, AVBNetworkingConference2012_notes.doc, Audio Video Bridging.docx, Boradcast Engineering AVB article.docx, Final Research Notes.xlsx, xmos/XMOS Research.xlsx, DigiDesignCorp AVB IP OEM/IP LIcense and OEM infot.txt, DSP4YOU/Info-D4U-AVB-Dongle1/readme.txt)</li><li>…/RD79-AVB Monitor/README.md · R&amp;D_List.xls rows 63, 79, 85</li></ul>`);
}

SIM.register({
  id:'rd63-avbresearch', name:'RD63 AVB Research · Audio Video Bridging sizing and vendor model ('+Y(2013)+')', duration:1,
  product:'RD63 AVB research', year:2013, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD63-AVBResearch',
  summary:'The 2013–2014 research into IEEE AVB networked audio for WBS monitors. The model reserves talker streams on a 100 Mb/s or 1 Gb/s link, shows gPTP, shaped AVTP packets and the 2 ms presentation time in slow motion, breaks the cloud with a plain switch, and compares the XMOS and DDC licence routes that led to the RD79 XMOS listener.',
  highlights:['SRP admission: why 100 Mb/s means about 32 channels','Class A vs class B packets in slow motion','Non-AVB switch and Wi-Fi break the reservation','DDC licence vs XMOS reference design per unit','Leads to RD79 WBS-AVB-DG and RD85 RAVENNA'],
  depth:'Hardware model',
  stepUnits:[{label:'1 class A packet (125 µs)',period:()=>1/8000},{label:'1 sample',period:()=>1/FS},{label:'1 ms',period:()=>0.001},{label:'1 Sync (125 ms)',period:()=>SYNC_I}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[2.5e-4,'250 µs (2 packets)'],[2e-5,'20 µs']],
  defaultZoom:3,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: sizing AVB', render:viewTutorial},
    {id:'second', label:'One second on the link', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
