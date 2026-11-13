/* =====================================================================
   RD59 — IP Video to HDMI/SDI Converter (Ward-Beck R&D register: Wayne / Engineering, status "?", Jan 2013)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD59_Description.txt is a forwarded e-mail thread of 2 Jan 2013: after a conference call, a customer
   (Rushworks, an automation vendor) asked for a box that takes an IP camera stream and turns it into
   "real video" for a switcher. Their list: SDI with embedded audio, composite, balanced and unbalanced
   audio, RJ45 for stream input and control; H.264 + AAC and MJPEG (Flash, WMV less important); a web
   interface for IP address, admin and users, stream addresses and credentials, several stored streams
   with switching; automatic reconnect after a lost connection and on power-up; outputs 480i 29.97,
   720p 59.94 and 1080i 29.97; "if 2 could fit on a 1U shelf that would be great". Kevin's reply asks
   whether the box would convert a camera picked by IP address to SDI and analog.
   This plugin models that requirement: stream → jitter buffer → decoder → frame synchroniser → outputs,
   plus the reconnect behaviour the customer called "important".
   Sources: RD59-IPVideoToHDMIConverter/RD59_Description.txt · README.md · R&D_List.xls (row 59).
   Contact details in the e-mail headers are deliberately left out.
   Everything below the requirement level (packet sizes, buffer, GOP, RTSP, timeouts) is a design
   assumption marked inferred; no design work is archived.
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

/* ================= requirement data (from the e-mail) ================= */
const OUTS = {
  '480i':  { name:'480i 29.97', lines:525, rate:30000/1001, interlaced:true,  sdi:'SD-SDI 270 Mb/s', bitrate:270e6, comp:true },
  '720p':  { name:'720p 59.94', lines:750, rate:60000/1001, interlaced:false, sdi:'HD-SDI 1.485/1.001 Gb/s', bitrate:1.485e9/1.001, comp:false },
  '1080i': { name:'1080i 29.97', lines:1125, rate:30000/1001, interlaced:true, sdi:'HD-SDI 1.485/1.001 Gb/s', bitrate:1.485e9/1.001, comp:false },
};
const FMTS = {
  h264: { name:'H.264 + AAC', gop:30, kbI:180, kbP:12, audio:true },     // GOP and frame sizes inferred
  mjpeg:{ name:'MJPEG', gop:1, kbI:90, kbP:90, audio:false },
};
const STREAMS = [   // example stored streams (placeholders; no real addresses)
  { name:'Camera 1 · ski hill', ip:'192.0.2.21', fmt:'h264', fps:30 },
  { name:'Camera 2 · lobby',    ip:'192.0.2.22', fmt:'mjpeg', fps:15 },
  { name:'Camera 3 · tower',    ip:'192.0.2.23', fmt:'h264', fps:25 },
];
const PKT = 1400;                    // bytes of payload per packet (inferred)
const FS = 48000, AAC = 1024/FS;     // AAC frame = 1024 samples (inferred; AAC standard)

/* ================= state ================= */
const D = { s:0, out:'1080i', buf:0.20, jit:0.010, lossAt:0.40, loss:false, autoRe:true, power:true, port:'sdi',
  web:{ ip:'192.0.2.50', saved:true } };
function reset(){ Object.assign(D,{ s:0, out:'1080i', buf:0.20, jit:0.010, lossAt:0.40, loss:false, autoRe:true, power:true, port:'sdi' }); LOG.items=[]; SIM.refresh(); }
const S = ()=> STREAMS[D.s];
const F = ()=> FMTS[S().fmt];
const O = ()=> OUTS[D.out];

/* connection timeline within the simulated second: returns phases [{a,b,st}] */
const TIMEOUT = 0.25, RTT = 0.030, BACKOFF = 0.10;      // inferred
function phases(){
  const P=[]; let t=0;
  if (!D.power) return [{a:0,b:1,st:'OFF'}];
  P.push({a:0,b:0.04,st:'CONNECT'}); t=0.04;
  if (!D.loss){ P.push({a:t,b:1,st:'STREAMING'}); return P; }
  P.push({a:t,b:D.lossAt,st:'STREAMING'});
  P.push({a:D.lossAt,b:D.lossAt+TIMEOUT,st:'STALLED'});
  if (!D.autoRe){ P.push({a:D.lossAt+TIMEOUT,b:1,st:'LOST'}); return P; }
  const r0=D.lossAt+TIMEOUT+BACKOFF; P.push({a:D.lossAt+TIMEOUT,b:r0,st:'RETRY WAIT'});
  P.push({a:r0,b:r0+3*RTT,st:'CONNECT'}); P.push({a:r0+3*RTT,b:1,st:'STREAMING'});
  return P;
}
const phaseAt = t => (phases().find(p=>t>=p.a&&t<p.b)||{st:'—'}).st;
/* camera frames that arrive at the box: [{n, tCam, tArr, I, kb}] */
function camFrames(){
  const s=S(), f=F(), out=[]; const ph=phases();
  const streaming = t => ph.some(p=>p.st==='STREAMING'&&t>=p.a&&t<p.b);
  let n=0, sinceStart=0, lastWasOff=true;
  for (let tc=0; tc<1; tc=++n/s.fps){
    const on=streaming(tc);
    if (!on){ lastWasOff=true; continue; }
    if (lastWasOff){ sinceStart=0; lastWasOff=false; }          // a new session starts with an I-frame (inferred)
    const I = (sinceStart % f.gop)===0; sinceStart++;
    const jit = D.jit*(prand(n*31)?1:0.3)*((prand(n*7+3)?1:-1)*0.5+0.5);
    out.push({ n, tCam:tc, tArr:tc+0.004+jit, I, kb:I?f.kbI:f.kbP });
  }
  return out;
}
/* output frames: which camera frame is shown, repeats and drops */
function outFrames(){
  const o=O(), cf=camFrames(), T=1/o.rate, res=[]; let last=-1, shown=null; let ready=[];
  for (let k=0;k*T<1;k++){
    const t=k*T; const avail=cf.filter(c=>c.tArr+D.buf<=t);
    // H.264 needs the first I-frame of a session before anything can be shown
    let cand=null; for (let i=avail.length-1;i>=0;i--){ cand=avail[i]; break; }
    if (cand && S().fmt==='h264'){ const sess=avail.filter(c=>c.n<=cand.n); const lastI=[...sess].reverse().find(c=>c.I); if(!lastI) cand=null; }
    const prev=shown; if (cand) shown=cand.n;
    const rep = prev!==null && shown===prev; const skipped = (prev!==null && shown!==null && shown>prev) ? (cf.filter(c=>c.n>prev&&c.n<shown).length) : 0;
    res.push({ k, t, cam:shown, rep, skipped, black: shown===null });
    last=shown;
  }
  return res;
}
const A = {
  stream(i){ act('Web UI: switch to '+STREAMS[i].name, tr=>{ D.s=+i; const s=S(); tr(`connect(${s.ip}) — ${FMTS[s.fmt].name}, ${s.fps} fps ${inf}`); tr(s.fmt==='h264'?'RTSP DESCRIBE → SETUP → PLAY (3 round trips), picture starts at the first I-frame '+inf:'HTTP GET of the MJPEG stream; every frame is a whole picture '+inf); tr('Stored streams with switching: “would be nice” (e-mail)'); }); },
  out(v){ act('Output standard → '+OUTS[v].name, tr=>{ D.out=v; const o=O(); tr(`${o.sdi}, ${o.lines} lines, ${o.rate.toFixed(3)} ${o.interlaced?'frames (2 fields)':'frames'}/s`); tr(o.comp?'Composite NTSC also available':'Composite output carries a down-converted 480i picture '+inf); }); },
  buf(v){ act(`Jitter buffer → ${v*1000} ms`, tr=>{ D.buf=+v; tr('Bigger buffer: fewer late frames, more delay '+inf); }); },
  jit(v){ act(`Network jitter → ${v*1000} ms`, tr=>{ D.jit=+v; const late=camFrames().filter(c=>c.tArr-c.tCam>D.buf).length; tr(`${late} frame(s) later than the buffer`); }); },
  loss(){ act(D.loss?'Network restored':'Pull the network cable at 0.40 s', tr=>{ D.loss=!D.loss; phases().forEach(p=>tr(`${SIM.fmtDur(p.a)} – ${SIM.fmtDur(p.b)}: ${p.st}`)); tr(D.autoRe?'Auto-reconnect is on: “important … viable for our automation customers”':'Auto-reconnect off: the picture stays frozen'); }); },
  autoRe(){ act('Auto-reconnect '+(D.autoRe?'off':'on'), tr=>{ D.autoRe=!D.autoRe; }); },
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if (D.power){ tr('boot → load_config(): last stream '+S().name+' '+inf); tr('“resume a connection on power up”: connect immediately, no operator'); } else tr('Outputs black'); }); },
  port(v){ act('Monitor output → '+v, tr=>{ D.port=v; }); },
};

/* ================= panels ================= */
function rearSVG(){
  const U=100, W=8.5*U, H=1.72*U, on=D.power, ph=phaseAt(SIM.t);
  const items=[ ['RJ45','rj','LAN / control'], ['SDI OUT','bnc','SDI + embedded audio'], ['COMP','bnc','composite'], ['L','xlr','balanced audio'], ['R','xlr','balanced audio'], ['L','rca','unbalanced'], ['R','rca','unbalanced'], ['12 V','dc','power'] ];
  let s=`<svg viewBox="0 0 ${W} ${H+56}" style="width:100%;display:block" role="img" aria-label="Rear panel of the proposed box (inferred layout)">
   <rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="#2a2d30" stroke="#111"/>`;
  let x=0.45*U;
  items.forEach(([l,k,d],i)=>{ const cy=H/2+4, port = k==='bnc'? (i===1?'sdi':'comp') : k==='xlr'?'bal':k==='rca'?'unbal':k;
    const sel=D.port===port;
    s+=`<g data-a="port" data-v="${port}" style="cursor:pointer">`;
    if (k==='rj'){ s+=`<rect x="${x-26}" y="${cy-22}" width="52" height="44" rx="3" fill="#ccc" stroke="#555"/><rect x="${x-16}" y="${cy-8}" width="32" height="22" fill="#222"/><circle cx="${x-18}" cy="${cy-30}" r="5" fill="${on&&ph==='STREAMING'?'#2bd46b':on?'#ffb000':'#333'}"/>`; x+=0.95*U; }
    else if (k==='bnc'){ s+=`<circle cx="${x}" cy="${cy}" r="26" fill="#c9b469" stroke="${sel?'var(--accent)':'#7a5f12'}" stroke-width="${sel?5:3}"/><circle cx="${x}" cy="${cy}" r="9" fill="#222"/>`; x+=0.85*U; }
    else if (k==='xlr'){ s+=`<circle cx="${x+10}" cy="${cy}" r="38" fill="#888" stroke="${sel?'var(--accent)':'#444'}" stroke-width="${sel?5:2}"/><circle cx="${x+10}" cy="${cy}" r="26" fill="#222"/>`; x+=1.05*U; }
    else if (k==='rca'){ s+=`<circle cx="${x}" cy="${cy}" r="18" fill="${l==='L'?'#eee':'#d33'}" stroke="${sel?'var(--accent)':'#444'}" stroke-width="${sel?5:2}"/><circle cx="${x}" cy="${cy}" r="6" fill="#222"/>`; x+=0.6*U; }
    else { s+=`<circle cx="${x+10}" cy="${cy}" r="18" fill="#111" stroke="#666" stroke-width="3"/>`; x+=0.6*U; }
    s+=`<text x="${x-(k==='rj'?0.95:k==='bnc'?0.85:k==='xlr'?1.05:0.6)*U+(k==='xlr'?10:0)}" y="${H-10}" text-anchor="middle" font-size="13" fill="#ddd">${l}</text><title>${d}</title></g>`; });
  s+=`<text x="4" y="${H+22}" font-size="13" fill="var(--ink2)">Half-rack 1 RU (8.5 × 1.72 in) so two fit a 1U shelf, as asked. Connector list from the e-mail; layout and sizes ${'inferred'}.</text>
    <text x="4" y="${H+42}" font-size="13" fill="var(--ink2)">Link LED: ${on?ph:'off'}. Click a connector to watch that output below.</text></svg>`;
  return s;
}
/* "monitor" showing what leaves the selected output at the playhead */
function monitorSVG(){
  const t=SIM.t, of=outFrames(), o=O(), k=Math.min(of.length-1, Math.floor(t*o.rate)), f=of[k]||{black:true};
  const ph=phaseAt(t), col = f.black? '#000' : `hsl(${(f.cam*23)%360} 45% 38%)`;
  let s=`<svg viewBox="0 0 480 300" style="width:100%;max-width:520px;display:block;margin:auto;border-radius:6px" role="img" aria-label="Output monitor">
   <rect x="0" y="0" width="480" height="270" fill="${col}"/>`;
  if (!f.black){ s+=`<path d="M0,210 L120,120 L200,180 L300,90 L480,200 L480,270 L0,270 Z" fill="rgba(255,255,255,.75)"/><text x="16" y="34" font-size="20" fill="#fff" font-family="monospace">${S().name}</text><text x="16" y="60" font-size="16" fill="#fff" font-family="monospace">camera frame ${f.cam}${f.rep?' (repeat)':''}</text>`; }
  else s+=`<text x="240" y="140" text-anchor="middle" font-size="20" fill="#888" font-family="monospace">${D.power?'NO PICTURE YET (move the playhead)':'NO POWER'}</text>`;
  s+=`<rect x="0" y="270" width="480" height="30" fill="var(--panel2)"/><text x="10" y="290" font-size="13" fill="var(--ink)">${D.port.toUpperCase()} · ${D.port==='comp'?'480i NTSC composite':o.name} · out frame ${k} · ${ph}</text></svg>`;
  return s;
}
function webUI(){
  return `<div style="border:1px solid var(--line);border-radius:8px;overflow:hidden">
   <div style="background:var(--chip);padding:6px 10px" class="small mono">http://${D.web.ip}/  — device web page ${inf}</div>
   <div style="padding:8px 10px" class="small">
    <div><b>Network</b> IP ${D.web.ip} · admin / users (credentials not shown)</div>
    <div style="margin-top:6px"><b>Stored streams</b></div>
    ${STREAMS.map((s,i)=>`<div style="display:flex;gap:6px;align-items:center;margin:3px 0"><button data-a="stream" data-v="${i}" class="${D.s===i?'on':''}">${D.s===i?'● ':''}${s.name}</button><span class="mono muted">${s.ip} · ${FMTS[s.fmt].name} · ${s.fps} fps</span></div>`).join('')}
    <div style="margin-top:6px"><b>Output</b> ${Object.keys(OUTS).map(k=>`<button data-a="out" data-v="${k}" class="${D.out===k?'on':''}">${OUTS[k].name}</button>`).join('')}</div>
    <div style="margin-top:6px"><b>Behaviour</b> <button data-a="autoRe" class="${D.autoRe?'on':''}">auto-reconnect ${D.autoRe?'ON':'OFF'}</button> <button data-a="power">${D.power?'power off':'power on'}</button></div>
   </div></div>`;
}
function netCtl(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px"><span class="small muted">network</span>
    <button data-a="loss" class="${D.loss?'on':''}">${D.loss?'cable pulled at 0.40 s':'pull cable at 0.40 s'}</button>
    <span class="small muted">| jitter</span>${[0.005,0.010,0.050,0.150].map(v=>`<button data-a="jit" data-v="${v}" class="${D.jit===v?'on':''}">${v*1000} ms</button>`).join('')}
    <span class="small muted">| buffer</span>${[0.05,0.20,0.50].map(v=>`<button data-a="buf" data-v="${v}" class="${D.buf===v?'on':''}">${v*1000} ms</button>`).join('')}</div>`;
}
function bindAll(root){ bindActs(root,{ stream:v=>A.stream(+v), out:v=>A.out(v), buf:v=>A.buf(+v), jit:v=>A.jit(+v), loss:()=>A.loss(), autoRe:()=>A.autoRe(), power:()=>A.power(), port:v=>A.port(v) }); }

/* ================= timeline ================= */
const STCOL = { CONNECT:'--warn', STREAMING:'--accent', STALLED:'--bad', 'RETRY WAIT':'--ink2', LOST:'--bad', OFF:'--line' };
function lanes(){
  const css=SIM.css, cf=camFrames(), of=outFrames(), o=O(), f=F();
  return [
    { label:'Connection state', h:24, draw(c,X,t0,t1,y,h){ phases().forEach(p=>bandAt(c,X,Math.max(p.a,t0),Math.min(p.b,t1),y,h,css(STCOL[p.st]),.6,p.st)); } },
    { label:`Packets in (${PKT} B, ${inf.replace(/<[^>]+>/g,'')})`, h:22, draw(c,X,t0,t1,y,h){ cf.forEach(fr=>{ const n=Math.ceil(fr.kb*1000/PKT); for(let i=0;i<n;i++){ const t=fr.tArr+i*PKT*8/100e6; if(t<t0||t>t1) continue; c.fillStyle=fr.I?css('--warn'):css('--accent2'); c.fillRect(X(t),y+5,Math.max(1,X(t+PKT*8/100e6)-X(t)),h-10); } }); } },
    { label:`Camera frames arriving (${S().fps} fps, ${f.gop>1?'I = orange':'all intra'})`, h:26, draw(c,X,t0,t1,y,h){ cf.forEach(fr=>{ if(fr.tArr<t0-0.1||fr.tArr>t1) return; c.fillStyle=fr.I?css('--warn'):css('--accent2'); c.fillRect(X(fr.tArr),y+4,Math.max(2,X(fr.tArr+0.004)-X(fr.tArr)),h-8); if ((X(t0+1/S().fps)-X(t0))>26){ c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText((fr.I?'I':'P')+fr.n, X(fr.tArr)+3, y+h-6); } }); } },
    { label:`Decoded, after ${D.buf*1000} ms buffer`, h:22, draw(c,X,t0,t1,y,h){ cf.forEach(fr=>{ const t=fr.tArr+D.buf; if(t<t0||t>t1) return; c.fillStyle=css('--accent'); c.fillRect(X(t),y+5,Math.max(2,X(t+0.003)-X(t)),h-10); }); } },
    { label:`Output frames ${o.name} (red = repeat, ✕ = drop)`, h:26, draw(c,X,t0,t1,y,h){ const T=1/o.rate; of.forEach(fr=>{ if(fr.t+T<t0||fr.t>t1) return; c.fillStyle=fr.black?css('--line'):fr.rep?css('--bad'):css('--accent'); c.globalAlpha=.7; c.fillRect(X(fr.t)+1,y+4,Math.max(1,X(fr.t+T)-X(fr.t)-2),h-8); c.globalAlpha=1; if (fr.skipped && (X(t0+T)-X(t0))>10){ c.fillStyle=css('--warn'); c.fillText('✕'+fr.skipped, X(fr.t)+2, y+h-6); } }); } },
    { label:o.interlaced?'Fields (59.94 Hz)':'Frames (59.94 Hz)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1001/60000,0,1001/60000*0.06,css('--ink2'),o.interlaced?'fields':'frames'); } },
    { label:`SDI lines (${o.lines} per frame)`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/(o.rate*o.lines),0,1/(o.rate*o.lines)*0.15,css('--ink2'),'lines'); } },
    { label:f.audio?'AAC frames (1024 samples, 21.3 ms)':'Audio: none in MJPEG', h:20, draw(c,X,t0,t1,y,h){ if(!f.audio){ laneText(c,X,t0,y,h,'MJPEG carries no audio: SDI audio is silent '+'(inferred)'); return; } SIM.pulses(c,X,t0,t1,y,h,AAC,0,AAC*0.8,css('--accent2'),'AAC frames'); } },
  ];
}
function stats(){ const of=outFrames(), cf=camFrames(); return { reps:of.filter(f=>f.rep).length, drops:of.reduce((a,f)=>a+f.skipped,0), black:of.filter(f=>f.black).length, late:cf.filter(c=>c.tArr-c.tCam>D.buf).length, frames:of.length, cam:cf.length, delay:(D.buf+0.004+D.jit/2) }; }

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('Output monitor', `<div id="mon"></div>`)}${card('Rear panel (proposed)', `<div id="rear"></div>`)}</div>
     <div>${card('Device web page', `<div id="web"></div><div id="net"></div>`)}${card('This second', `<div id="st"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('Timeline — packets to pictures', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ m.querySelector('#mon').innerHTML=monitorSVG(); const r=m.querySelector('#rear'); r.innerHTML=rearSVG(); bindAll(r); const w=m.querySelector('#web'); w.innerHTML=webUI(); bindAll(w); const n=m.querySelector('#net'); n.innerHTML=netCtl(); bindAll(n);
    const st=stats(); m.querySelector('#st').innerHTML=kv([['Camera frames received',st.cam],['Output frames',st.frames+' ('+O().name+')'],['Repeated / dropped',st.reps+' / '+st.drops],['Black (no picture yet)',st.black],['Frames later than buffer',st.late],['Glass-to-output delay ≈',Math.round(st.delay*1000)+' ms '+inf]]);
    m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The request', body:`<p>2 Jan 2013|46: a customer told Wayne that broadcasters were putting IP cameras at remote sites (the example: a ski hill) and watching them on a PC. To get that picture to air they needed a PC plus a scaler. They asked for a box that does it directly, and said every supplier made the reverse but not this.</p><p>Walk through the box as the customer would use it.</p>`, check:()=>true, auto:true },
  { title:'1 · Pick a camera', body:`<p>On the web page, select <b>Camera 1</b> (H.264). The monitor shows its pictures; the timeline shows each I-frame (orange) followed by P-frames.</p>`, check:()=>D.s===0&&LOG.items.some(e=>/Camera 1/.test(e.name)), hint:'Press “Camera 1 · ski hill”.' },
  { title:'2 · Output standard', body:`<p>Set the output to <b>720p 59.94</b>. A 30 fps camera now feeds a 59.94 Hz output: almost every camera frame is shown twice (red repeats in the output lane).</p>`, check:()=>D.out==='720p', hint:'Press 720p 59.94.' },
  { title:'3 · A 25 fps camera', body:`<p>Switch to <b>Camera 3</b> (25 fps) and output <b>1080i 29.97</b>. The frame synchroniser repeats about five frames a second to make 29.97.</p>`, check:()=>D.s===2&&D.out==='1080i', hint:'Camera 3, then 1080i 29.97.' },
  { title:'4 · Network jitter', body:`<p>Set jitter to <b>150 ms</b> with the 50 ms buffer. Frames arrive after their turn and the output repeats. Then raise the buffer to <b>500 ms</b>: smooth, but half a second late.</p>`, check:()=>D.jit===0.15&&D.buf===0.5, hint:'Press 150 ms jitter, then 500 ms buffer.' },
  { title:'5 · Lose the connection', body:`<p>Back to 10 ms jitter and 200 ms buffer. Press <b>pull cable at 0.40 s</b>. The picture freezes, the box times out, waits, and reconnects. With H.264 the picture only returns at the first I-frame of the new session.</p>`, check:()=>D.loss&&D.jit===0.01, hint:'Press 10 ms, then “pull cable”.' },
  { title:'6 · Without auto-reconnect', body:`<p>Turn <b>auto-reconnect off</b>. The picture stays frozen: the reason the customer called reconnect “important … viable for our automation customers”.</p>`, check:()=>D.loss&&!D.autoRe, hint:'Press auto-reconnect.' },
  { title:'7 · Power cycle', body:`<p>Turn auto-reconnect back on, then <b>power off</b> and <b>on</b>. The box must reload the last stream and reconnect without anyone at the web page.</p>`, check:()=>D.autoRe&&D.power&&LOG.items.some(e=>e.name==='Power on'), hint:'Press power off, then power on.' },
  { title:'Done', body:`<p>The thread ends with Kevin's question; the register keeps RD59 at “?”. See the Findings tab.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — the IP-to-video box', panelTitle:'Web page, network and monitor', reset,
  panel(el){ el.innerHTML = webUI()+netCtl()+`<div style="margin-top:8px">${monitorSVG()}</div>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second through the box', `<div id="lad"></div>`)}${card('Output standards asked for', `<div id="os"></div>`)}`;
  const draw=()=>{ const s=S(), f=F(), o=O(), st=stats(); const pk=Math.round(camFrames().reduce((a,c)=>a+Math.ceil(c.kb*1000/PKT),0));
    m.querySelector('#lad').innerHTML = tbl(['Stage','per second','note'],[
      ['Network packets',pk.toLocaleString(),`${PKT} B payload ${inf}`],['Camera frames',st.cam,`${s.fps} fps, ${f.gop>1?'GOP '+f.gop:'all intra'} ${inf}`],
      ['Output frames',st.frames,o.name],['Repeats / drops',`${st.reps} / ${st.drops}`,'frame synchroniser'],
      ['SDI lines',Math.round(o.rate*o.lines).toLocaleString(),o.sdi],['SDI bits',Math.round(o.bitrate).toLocaleString(),'serial rate'],
      ['AAC frames',f.audio?'46.9':'0','1024 samples each at 48 kHz'],
    ]);
    m.querySelector('#os').innerHTML = tbl(['Standard','Lines','Rate','SDI','Composite'], Object.values(OUTS).map(o=>[o.name,o.lines,o.rate.toFixed(3),o.sdi,o.comp?'native':'down-convert '+inf]));
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    rj:{x:20,y:160,w:150,h:70,t:'RJ45',s:['streams + control'],d:'“RJ45 for stream inputs and control” (e-mail).'},
    web:{x:20,y:40,w:150,h:80,t:'Web server',s:['IP, admin, users','stream list'],d:'Log in, set IP address and admin credentials, add users, enter stream addresses and their credentials, store several streams and switch.'},
    rx:{x:220,y:160,w:170,h:70,t:'Stream client',s:['RTSP/RTP or HTTP '+'(inferred)','reconnect logic'],d:'Auto-reconnect when the connection is lost; resume on power-up (e-mail). Protocols are inferred.',live:()=>phaseAt(SIM.t)==='STREAMING'},
    jb:{x:430,y:160,w:150,h:70,t:'Jitter buffer',s:[`${D.buf*1000} ms`],d:'Absorbs network delay variation (inferred).'},
    dec:{x:620,y:110,w:170,h:70,t:'Decoder',s:['H.264 + AAC','MJPEG'],d:'H.264 with AAC and MJPEG required; Flash/WMV “less important”.'},
    fs:{x:620,y:220,w:170,h:70,t:'Frame sync / scaler',s:['camera fps → 29.97/59.94'],d:'Repeats or drops frames; scales to 480i, 720p or 1080i.'},
    sdi:{x:840,y:60,w:150,h:70,t:'SDI out',s:['embedded audio'],d:'SDI with embedded audio.'},
    cmp:{x:840,y:160,w:150,h:70,t:'Composite out',s:['NTSC'],d:'Composite video.'},
    aud:{x:840,y:260,w:150,h:70,t:'Audio out',s:['balanced + unbalanced'],d:'Balanced and unbalanced audio.'},
  };
  blockView(m,B,[['web','rx','config'],['rj','rx',''],['rx','jb',''],['jb','dec',''],['dec','fs',''],['fs','sdi',''],['fs','cmp',''],['dec','aud','AAC']],{start:'rx',w:1000,h:360,side:'<p>The customer described inputs, outputs and behaviour; the internal blocks are the minimum that list implies.</p>'});
}
const SHEETS=[
  { name:'1 · Interface list', note:'Every connector named in the e-mail, as a connector schedule. No electrical design exists.', svg:()=>
    chip(330,60,220,'IP-to-video box',[['RJ45','LAN: streams, web, control'],['DC','power '+'(inferred)']],[['BNC','SDI + embedded audio'],['BNC','composite'],['XLR ×2','balanced audio'],['RCA ×2','unbalanced audio']],'RD59 requirement') },
  { name:'2 · Output timing', note:'Line and rate figures for the three standards the customer asked for.', svg:()=>
    chip(80,60,200,'480i 29.97',[['lines','525'],['fields','59.94 Hz']],[['SDI','270 Mb/s']],'SD') + chip(340,60,200,'720p 59.94',[['lines','750'],['frames','59.94 Hz']],[['SDI','1.485/1.001 Gb/s']],'HD') + chip(600,60,200,'1080i 29.97',[['lines','1125'],['fields','59.94 Hz']],[['SDI','1.485/1.001 Gb/s']],'HD') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the RD59 e-mail requirement', 'RD59 never reached a schematic. The sheets restate the interface and timing requirements in schematic form.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Reconnect state machine — state at the playhead', `<div id="sm"></div>`)}${card('Phases in this second', `<div id="ph"></div>`)}</div>`;
  const draw=()=>{ const cur=phaseAt(SIM.t);
    const N=[['OFF',60,40],['CONNECT',220,40],['STREAMING',400,40],['STALLED',400,150],['RETRY WAIT',220,150],['LOST',60,150]];
    const pos=Object.fromEntries(N.map(n=>[n[0],n]));
    const E=[['OFF','CONNECT','power on → load_config'],['CONNECT','STREAMING','PLAY / first frame'],['STREAMING','STALLED','no data'],['STALLED','RETRY WAIT',`> ${TIMEOUT*1000} ms, auto on`],['RETRY WAIT','CONNECT',`${BACKOFF*1000} ms`],['STALLED','LOST','auto off']];
    let s=`<svg viewBox="0 0 520 210" style="width:100%"><defs><marker id="ar59" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    E.forEach(([a,b,l])=>{ const A_=pos[a], B_=pos[b]; s+=`<line x1="${A_[1]+50}" y1="${A_[2]+18}" x2="${B_[1]+50}" y2="${B_[2]+18}" stroke="var(--ink2)" marker-end="url(#ar59)"/><text x="${(A_[1]+B_[1])/2+52}" y="${(A_[2]+B_[2])/2+12}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    N.forEach(([n,x,y])=>{ s+=`<rect x="${x}" y="${y}" width="100" height="36" rx="8" fill="${n===cur?'color-mix(in srgb,var(--accent) 35%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+50}" y="${y+22}" text-anchor="middle" font-size="11" fill="var(--ink)">${n}</text>`; });
    m.querySelector('#sm').innerHTML = s+'</svg><p class="small muted">States and timings are a design sketch ('+inf+'); the e-mail asks only for reconnect after loss and on power-up.</p>';
    m.querySelector('#ph').innerHTML = tbl(['From','To','State'], phases().map(p=>[SIM.fmtDur(p.a),SIM.fmtDur(p.b),p.st]));
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD59 decided, and what became of it', `<ol>
    <li><b>No decision is recorded.</b> The thread stops at Kevin's clarifying question (2 Jan 2013|46, 11:28). The register entry (“IP video to HDMI/SDI? Converter”, Wayne / Engineering) stays “?”, and no IP-video product appears anywhere in the archive.</li>
    <li><b>The folder name says HDMI; the customer never did.</b> The e-mail asks for SDI with embedded audio, composite and analog audio. HDMI appears only in the register's question-marked title and the folder name.</li>
    <li><b>The hard part is behaviour, not decoding.</b> The customer singled out automatic reconnect after a lost connection and on power-up as “one important feature”. In the model, H.264 recovery also waits for the first I-frame of the new session, which MJPEG does not.</li>
    <li><b>Frame-rate conversion is unavoidable.</b> IP cameras run 30, 25 or 15 fps; every requested output is a 1000/1001 rate. The frame synchroniser must repeat or drop frames every second (see the output lane).</li>
    <li><b>Density target.</b> “If 2 could fit on a 1U shelf” means a half-rack box, the same width class as the POD family.</li>
    <li><b>Where WBS went instead.</b> WBS's network work in 2013–2016 was audio: RD63 AVB research, RD79 AVB monitor, RD85 RAVENNA/AES67 monitor and the 32ME-N (${plink('rd63-avbresearch','RD63')}, ${plink('32me','32ME')}).</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Packet size, GOP length, frame sizes, jitter buffer, timeouts, back-off and protocols (RTSP/RTP, HTTP for MJPEG) are model choices (${inf}).</li><li>Rear-panel layout, half-rack size and DC power are drawn from the connector list only (${inf}).</li><li>Stored streams use documentation-range IP addresses as placeholders; no real addresses or credentials are used.</li></ul>`) +
  card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD59-IPVideoToHDMIConverter/RD59_Description.txt · README.md · R&amp;D_List.xls</li></ul>`);
}

SIM.register({
  id:'rd59-ipvideotohdmiconverter', name:'RD59 IP Video to SDI/HDMI Converter · customer requirement model ('+Y(2013)+')', duration:1,
  product:'RD59 IP-to-video box', year:2013, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD59-IPVideoToHDMIConverter',
  summary:'A January 2013 customer request for a box that turns IP camera streams (H.264 + AAC, MJPEG) into SDI, composite and analog audio, managed from a web page and able to reconnect by itself. The model runs a stream through jitter buffer, decoder and frame synchroniser into 480i, 720p or 1080i, and shows what a lost connection does to the picture.',
  highlights:['Packets → camera frames → output frames, with repeats and drops','Three output standards from the e-mail','Reconnect state machine and power-up resume','H.264 waits for an I-frame; MJPEG does not','Half-rack rear panel from the connector list'],
  depth:'Hardware model',
  stepUnits:[{label:'1 output frame',period:()=>1/O().rate},{label:'1 field',period:()=>1001/60000},{label:'1 AAC frame',period:()=>AAC},{label:'10 ms',period:()=>0.01},{label:'1 SDI line',period:()=>1/(O().rate*O().lines)}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.1,'100 ms'],[1001/30000,'1 frame'],[0.002,'2 ms'],[1e-4,'100 µs (lines)']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the box', render:viewTutorial},
    {id:'second', label:'One second through it', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
