/* =====================================================================
   RD56 — Raspberry Pi HDMI signage dongle (Ward-Beck R&D register, Kevin / engineering, status "?")
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (XXX - ENGINEERING - 2016 RD FILES/RD56-RaspberryPI/HDMIDongle/):
   - Notes.txt (19 Oct 2012): Pi as an adapter dongle connecting an LCD TV to the LAN; a remote-control
       and playout station streams content to every Pi; application: malls with many LCD TVs; idea 2:
       RFID in cell phones to track shoppers and target the advert on the TV they pass
   - FlowDiagram.pdf (19 Oct 2012, Google drawing): three TVs, each "+ Raspberry PI", HDMI OUT,
       "Wired Network In or Wireless dongle option"; per monitor: Monitor Name, Location, Raspberry PI
       Mac Address, Browse Video Uploader; "Possibility of Infinite Monitors on the network";
       "Raspberry PI's all controlled over openGear network" (an openGear frame drawn at the bottom)
   The diagram is redrawn in SVG with plain labels (no TV brand, no openGear logo).
   Pi hardware, network rates, video bitrates and the client software are not in the archive and are
   marked "inferred" on screen.
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
const LINK = { wired:{name:'Wired Ethernet', mbps:100, eff:0.9}, wifi:{name:'USB Wi-Fi dongle', mbps:20, eff:0.6} };   // Pi model B 10/100; dongle effective rate (inferred)
const MODE = { uni:'Stream, unicast (one copy per Pi)', multi:'Stream, multicast (one copy for all)', local:'Upload files, play from SD card' };
const ADS = ['Mall promo','Food court','Shoe store','Cinema trailer','Bookshop','Electronics'];
const LOCS = ['Entrance A','Food court','Level 2 east','Level 2 west','Cinema','Parking'];
const mac = i => 'B8:27:EB:' + [0x3a+i*7, 0x91+i*13, 0x10+i*29].map(v=>hex2(v)).join(':');      // Pi Foundation OUI, rest made up (inferred)
function mkMon(i){ return { name:'MON-'+String(i+1).padStart(2,'0'), loc:LOCS[i%LOCS.length], mac:mac(i), link: i%4===3?'wifi':'wired', ad:i%ADS.length, state:4, sw:null }; }
const D0 = () => ({ n:6, mons:Array.from({length:6},(_,i)=>mkMon(i)), mode:'uni', br:4, up:100, gop:1, sel:0, rfid:false, shopper:-1, fileMB:60 });
let D = D0();
function reset(){ D=D0(); LOG.items=[]; SIM.refresh(); }
function setN(n){ while (D.mons.length<n) D.mons.push(mkMon(D.mons.length)); D.mons.length=n; D.n=n; D.sel=Math.min(D.sel,n-1); }
function net(){ const per=D.br*1.06;    // + IP/UDP/RTP overhead (inferred 6 %)
  const server = D.mode==='uni'? per*D.n : D.mode==='multi'? per : 0;
  const cap = D.up*0.9; const maxUni = Math.floor(cap/per);
  const wifiOk = per <= LINK.wifi.mbps*LINK.wifi.eff;
  const upload = D.fileMB*8/(D.up*0.9)*D.n;                // seconds to push one file to every Pi, one after another
  return { per, server, cap, util: server/cap, maxUni, wifiOk, upload, pps: per*1e6/(1316*8) }; }
const A = {
  n(v){ act(`Monitors → ${v}`, tr=>{ setN(v); const k=net(); tr(`${v} TVs, each “+ Raspberry PI”`); tr(`${MODE[D.mode]}: server link ${k.server.toFixed(1)} of ${k.cap.toFixed(0)} Mbit/s (${(k.util*100).toFixed(0)} %)${k.util>1?' — <b style="color:var(--bad)">overloaded</b>':''}`); }); },
  mode(v){ act('Delivery → '+MODE[v], tr=>{ D.mode=v; const k=net(); if (v==='uni') tr(`each Pi gets its own ${k.per.toFixed(1)} Mbit/s stream; a ${D.up} Mbit/s server port carries at most ${k.maxUni} TVs`); if (v==='multi') tr('one stream for every TV that shows the same thing: “infinite monitors” holds, as long as the switches handle multicast (IGMP, inferred)'); if (v==='local') tr(`files go up once through the “Browse Video Uploader”; ${D.fileMB} MB to all ${D.n} Pis takes ${SIM.fmtDur(k.upload)}; the network is then idle`); }); },
  br(v){ act(`Video bitrate → ${v} Mbit/s`, tr=>{ D.br=v; const k=net(); tr(`${k.pps.toFixed(0)} packets/s of 1316 bytes (7 TS packets each, inferred)`); if (!k.wifiOk) tr('<b style="color:var(--bad)">too much for the Wi-Fi dongle option</b>'); }); },
  up(v){ act(`Server port → ${v} Mbit/s`, tr=>{ D.up=v; tr(`unicast ceiling ${net().maxUni} TVs`); }); },
  sel(i){ if (!D.mons[i]) return; act('Select '+D.mons[i].name, tr=>{ D.sel=i; const m=D.mons[i]; tr(`${m.name} · ${m.loc} · ${m.mac} · ${LINK[m.link].name} · playing “${ADS[m.ad]}”`); }); },
  link(i){ if (!D.mons[i]) return; act(`${D.mons[i].name}: network`, tr=>{ const m=D.mons[i]; m.link = m.link==='wired'?'wifi':'wired'; tr(`“Wired Network In or Wireless dongle option” → ${LINK[m.link].name}`); if (m.link==='wifi' && !net().wifiOk && D.mode!=='local') tr('<b style="color:var(--bad)">stream will stall on Wi-Fi at this bitrate</b>'); }); },
  ad(i){ if (!D.mons[i]) return; act(`${D.mons[i].name}: next content`, tr=>{ const m=D.mons[i]; m.ad=(m.ad+1)%ADS.length; const t=SIM.t, at = D.mode==='local'? t+0.05 : Math.ceil(t/D.gop+1e-9)*D.gop + 0.1; m.sw={t, at}; tr(`playlist change sent to ${m.mac}`); tr(D.mode==='local'? 'local file: switch after ~50 ms (inferred)' : `stream switch waits for the next key frame (GOP ${D.gop} s) + 100 ms buffer → on screen at ${SIM.fmtT(at)}`); }); },
  rfid(){ act('RFID shopper targeting '+(D.rfid?'off':'on'), tr=>{ D.rfid=!D.rfid; tr(D.rfid? 'Notes idea 2: phones with RFID identify shoppers; the TV they pass changes its advert. Not built; see Findings.' : 'off'); }); },
  shopper(i){ if (!D.mons[i]) return; act(`Shopper passes ${D.mons[i].name}`, tr=>{ D.shopper=i; if (!D.rfid){ tr('targeting is off: the TV keeps its playlist'); return; } const m=D.mons[i]; const was=m.ad; m.ad=(i+3)%ADS.length; const t=SIM.t, at = D.mode==='local'? t+0.05 : Math.ceil(t/D.gop+1e-9)*D.gop+0.1; m.sw={t,at}; tr(`tag read near ${m.loc} → server picks “${ADS[m.ad]}” (was “${ADS[was]}”)`); tr(`on screen ${SIM.fmtDur(at-t)} later; a shopper walking 1.2 m/s has moved ${((at-t)*1.2).toFixed(1)} m (inferred)`); }); },
};

/* ---------------- views ---------------- */
function diagramSVG(){
  const n=Math.min(D.n,8), W=760, rowH=62, H=110+n*rowH, k=net();
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:920px;display:block;border-radius:8px;background:var(--lane);border:1px solid var(--line)" role="img" aria-label="RD56 flow diagram, redrawn">
    <text x="12" y="20" font-size="12" fill="var(--ink2)">Redrawn from FlowDiagram.pdf (19 Oct 2012). Click a TV to select, its Pi to change network, its screen to change content.</text>`;
  for (let i=0;i<n;i++){ const m=D.mons[i], y=34+i*rowH, on=i===D.sel, sw=m.sw && SIM.t>=m.sw.t && SIM.t<m.sw.at;
    s+=`<g data-a="ad" data-v="${i}" style="cursor:pointer"><rect x="20" y="${y}" width="120" height="50" rx="3" fill="#111" stroke="${on?'var(--accent)':'#555'}" stroke-width="${on?3:1.5}"/><rect x="26" y="${y+5}" width="108" height="38" fill="${sw?'#333':['#1f5f8a','#7a4a1f','#1f7a4d','#6a1f7a','#7a6a1f','#1f6a7a'][m.ad]}"/><text x="80" y="${y+28}" font-size="10" text-anchor="middle" fill="#fff">${sw?'waiting key frame…':ADS[m.ad]}</text></g>
      <text x="150" y="${y+16}" font-size="9" fill="var(--ink2)">HDMI</text><line x1="146" y1="${y+25}" x2="186" y2="${y+25}" stroke="var(--ink)"/>
      <g data-a="link" data-v="${i}" style="cursor:pointer"><rect x="186" y="${y+8}" width="62" height="34" rx="3" fill="var(--panel2)" stroke="var(--ink)"/><text x="217" y="${y+22}" font-size="9.5" text-anchor="middle" fill="var(--ink)">Raspberry</text><text x="217" y="${y+34}" font-size="9.5" text-anchor="middle" fill="var(--ink)">PI</text></g>
      <text x="186" y="${y+56}" font-size="9" fill="${m.link==='wifi'&&!k.wifiOk&&D.mode!=='local'?'var(--bad)':'var(--ink2)'}">${m.link==='wired'?'wired network in':'wireless dongle'}</text>
      <g data-a="sel" data-v="${i}" style="cursor:pointer">${[['Monitor Name',m.name],['Location',m.loc],['Pi MAC',m.mac],['Browse Video Uploader','']].map((b,j)=>`<rect x="${280+j*118}" y="${y+10}" width="112" height="30" rx="12" fill="var(--panel)" stroke="${on?'var(--accent)':'var(--ink2)'}"/><text x="${336+j*118}" y="${y+23}" font-size="9" text-anchor="middle" fill="var(--ink2)">${b[0]}</text><text x="${336+j*118}" y="${y+35}" font-size="9.5" text-anchor="middle" fill="var(--ink)" font-family="var(--mono)">${b[1]}</text>`).join('')}</g>
      ${D.rfid?`<g data-a="shopper" data-v="${i}" style="cursor:pointer"><circle cx="160" cy="${y+48}" r="7" fill="${D.shopper===i?'var(--warn)':'var(--chip)'}" stroke="var(--ink2)"/><text x="160" y="${y+51}" font-size="8" text-anchor="middle" fill="var(--ink)">RF</text></g>`:''}
      <line x1="217" y1="${y+42}" x2="217" y2="${H-50}" stroke="var(--ink2)" stroke-dasharray="${m.link==='wifi'?'3 3':''}"/>`; }
  s+=`<rect x="160" y="${H-50}" width="440" height="38" rx="4" fill="var(--dev)" stroke="#555"/><text x="172" y="${H-26}" font-size="11" fill="#cfd3d6">WBS openGear frame — playout / control</text>
    <text x="612" y="${H-36}" font-size="10.5" fill="${k.util>1?'var(--bad)':'var(--ink2)'}">server link</text><text x="612" y="${H-22}" font-size="10.5" fill="${k.util>1?'var(--bad)':'var(--ink2)'}">${k.server.toFixed(1)} / ${k.cap.toFixed(0)} Mbit/s</text>`;
  if (D.n>n) s+=`<text x="20" y="${H-58}" font-size="11" fill="var(--ink2)">+ ${D.n-n} more monitors (“Possibility of Infinite Monitors on the network”)</text>`;
  return s+'</svg>';
}
function ctlHTML(){ const k=net();
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${Object.keys(MODE).map(x=>`<button data-a="mode" data-v="${x}" class="${D.mode===x?'on':''}">${MODE[x]}</button>`).join('')}</div>
   <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:6px">
    <label class="small">monitors <select data-r="n">${[1,3,6,12,25,50,100].map(v=>`<option ${v===D.n?'selected':''}>${v}</option>`).join('')}</select></label>
    <label class="small">video <select data-r="br">${[1,2,4,8,12].map(v=>`<option ${v===D.br?'selected':''}>${v}</option>`).join('')}</select> Mbit/s ${inf}</label>
    <label class="small">server port <select data-r="up">${[100,1000].map(v=>`<option ${v===D.up?'selected':''}>${v}</option>`).join('')}</select> Mbit/s</label>
    <button data-a="rfid" class="${D.rfid?'on':''}">RFID shopper idea ${D.rfid?'on':'off'}</button></div>
   <p class="small" style="color:${k.util>1?'var(--bad)':'var(--ink)'}">Server link ${(k.util*100).toFixed(0)} % · unicast ceiling ${k.maxUni} TVs · Wi-Fi ${k.wifiOk?'ok':'too slow'} for ${k.per.toFixed(1)} Mbit/s${D.mode==='local'?` · upload ${D.fileMB} MB to all: ${SIM.fmtDur(k.upload)}`:''}</p>`; }
function bindAll(root){ bindActs(root,{ mode:v=>A.mode(v), sel:v=>A.sel(+v), link:v=>A.link(+v), ad:v=>A.ad(+v), rfid:()=>A.rfid(), shopper:v=>A.shopper(+v) });
  root.querySelectorAll('[data-r]').forEach(e=>{ const k=e.dataset.r; e.onchange=()=>A[k](+e.value); }); }
function lanes(){ const css=SIM.css, k=net(), m=D.mons[D.sel];
  return [
    {label:'HDMI refresh (60 Hz)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/60,0,0.002,css('--ink2'),'refreshes'); }},
    {label:'Video frames (30 fps, inferred)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/30,0,0.004,css('--accent2'),'frames'); }},
    {label:`Key frames (GOP ${D.gop} s, inferred)`, h:20, draw(c,X,t0,t1,y,h){ if (D.mode==='local'){ laneText(c,X,t0,y,h,'local playback: no stream to join'); return; } SIM.pulses(c,X,t0,t1,y,h,D.gop,0,0.01,css('--warn'),'I-frames'); }},
    {label:`Packets to ${m.name}`, h:22, draw(c,X,t0,t1,y,h){ if (D.mode==='local'){ laneText(c,X,t0,y,h,'none while playing from the SD card'); return; } SIM.pulses(c,X,t0,t1,y,h,1/k.pps,0,1316*8/(LINK[m.link].mbps*1e6),m.link==='wifi'&&!k.wifiOk?css('--bad'):css('--accent'),'1316-byte packets'); }},
    {label:'Server port load', h:22, draw(c,X,t0,t1,y,h){ bandAt(c,X,t0,t1,y,h,k.util>1?css('--bad'):css('--accent'),Math.min(.9,.15+k.util*.6), `${k.server.toFixed(1)} Mbit/s (${(k.util*100).toFixed(0)} %)`); }},
    {label:'Content change on screen', h:22, draw(c,X,t0,t1,y,h){ const sw=D.mons.filter(x=>x.sw); if (!sw.length){ laneText(c,X,t0,y,h,'click a TV screen to change its content'); return; } sw.forEach(x=>{ bandAt(c,X,x.sw.t,x.sw.at,y,h,css('--warn'),.5,x.name); c.fillStyle=css('--accent'); c.fillRect(X(x.sw.at)-1,y+2,3,h-4); }); }},
    {label:'Pi status poll (1 Hz, inferred)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1,0.3,0.004,css('--accent2'),'polls'); }},
  ]; }
function viewSim(m){
  m.innerHTML = `${card('Mall signage network (FlowDiagram.pdf, redrawn)', `<div id="dg"></div><div id="ctl"></div>`)}
    <div class="grid2">${card('One second at the selected TV', `<canvas id="tl"></canvas>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div>`;
  const draw=()=>{ const dg=m.querySelector('#dg'); dg.innerHTML=diagramSVG(); bindAll(dg); const c=m.querySelector('#ctl'); if(!c.contains(document.activeElement)){ c.innerHTML=ctlHTML(); bindAll(c); }
    m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The idea', body:`<p>October 2012|45, eight months after the Raspberry Pi went on sale ${inf}: plug a Pi into every LCD TV in a mall, and let a playout station (controlled from a WBS openGear frame) decide what each one shows.</p>`, check:()=>true, auto:true },
  { title:'1 · Scale up unicast', body:`<p>With <b>unicast</b> streams, set <b>monitors</b> to <b>50</b>. At 4 Mbit/s each, a 100 Mbit/s server port runs out at ${Math.floor(90/(4*1.06))} TVs.</p>`, check:()=>D.n>=50&&D.mode==='uni', hint:'monitors → 50.' },
  { title:'2 · “Infinite monitors”', body:`<p>Switch to <b>multicast</b>. One copy serves every TV showing the same content; the diagram’s “infinite monitors” is only true this way, or with local files.</p>`, check:()=>D.mode==='multi', hint:'Press the multicast button.' },
  { title:'3 · The Wi-Fi option', body:`<p>Set the bitrate to <b>12</b> Mbit/s. The wireless-dongle Pis turn red: the dongle cannot carry it.</p>`, check:()=>D.br===12, hint:'video → 12.' },
  { title:'4 · Change one screen', body:`<p>Click a TV’s screen. Streamed content waits for the next key frame before it changes; the timeline shows the wait.</p>`, check:()=>D.mons.some(x=>x.sw), hint:'Click any TV picture.' },
  { title:'5 · The RFID idea', body:`<p>Turn on the <b>RFID shopper idea</b> and click an RF marker. The note’s targeting would change the advert as a shopper passes; Findings covers why nothing came of it.</p>`, check:()=>D.rfid&&D.shopper>=0, hint:'RFID on, then click an RF circle.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — a mall full of Pis', panelTitle:'Network', reset,
  panel(el){ if (el.contains(document.activeElement)) return; el.innerHTML = diagramSVG()+ctlHTML(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('Events in one second', `<div id="ev"></div>`)}${card('Monitor table (what the uploader page lists)', `<div id="mt"></div>`)}`;
  const draw=()=>{ const k=net();
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','note'],[['HDMI refreshes / TV','60',''],['Video frames / TV','30 '+inf,''],['Packets / TV',D.mode==='local'?'0':k.pps.toFixed(0),'1316-byte UDP payloads '+inf],['Bits leaving the server',(k.server*1e6).toExponential(2),MODE[D.mode]],['Frames shown on all TVs',(30*D.n).toLocaleString(),D.n+' TVs']].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,r[2]]));
    m.querySelector('#mt').innerHTML = `<div class="scroll" style="max-height:320px">`+tbl(['Monitor name','Location','Pi MAC '+inf,'network','content'], D.mons.map((x,i)=>[`<a href="#" data-a="sel" data-v="${i}">${x.name}</a>`,x.loc,`<span class="mono">${x.mac}</span>`,LINK[x.link].name,ADS[x.ad]]))+'</div>';
    bindAll(m.querySelector('#mt'));
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    og:{x:20,y:180,w:190,h:80,t:'openGear frame',s:['playout / control','DashBoard'],d:'“Raspberry PI\'s all controlled over openGear network” (diagram).'},
    srv:{x:20,y:40,w:190,h:80,t:'Playout station',s:['streams or uploads','uploader page'],d:'Notes: “Remote control and playout station streams content”. Diagram: “Browse Video Uploader”.'},
    sw:{x:260,y:110,w:150,h:70,t:'Mall LAN',s:['switches, Wi-Fi'],d:'Wired or wireless per Pi.'},
    pi:{x:460,y:110,w:150,h:70,t:'Raspberry Pi ×N',s:['name, location, MAC'],d:'Each Pi registers with its name, location and MAC (diagram fields).'},
    tv:{x:660,y:110,w:130,h:70,t:'LCD TV',s:['HDMI in'],d:'Any TV with HDMI.'},
    rf:{x:460,y:230,w:150,h:60,t:'RFID reader?',s:['idea 2'],d:'Notes: phones with RFID identify shoppers. No hardware named.', live:()=>D.rfid},
  };
  blockView(m,B,[['srv','sw','video'],['og','srv','control'],['sw','pi',''],['pi','tv','HDMI'],['rf','srv','tag reads']],{start:'pi',w:810,h:310,side:'<p>A Pi per TV turns any screen into a networked display; the open questions were how content gets there and who controls it.</p>'});
}
const SHEETS=[
  { name:'1 · One display node', note:'Raspberry Pi model B connections are general knowledge, not from the archive (inferred).', svg:()=> chip(330,70,200,'Raspberry Pi (model B)',[['micro USB','5 V power'],['RJ45','10/100 Ethernet'],['USB','Wi-Fi dongle option'],['SD card','OS + video files']],[['HDMI','to the TV'],['GPIO','RFID reader? (idea 2)']],'inferred') },
  { name:'2 · Network', note:'Per the diagram: every Pi on one network with the playout/openGear side. Port speeds inferred.', svg:()=> chip(120,80,180,'Playout / openGear',[['ETH','100 or 1000 Mbit/s']],[['streams','uni- or multicast']],'') + chip(520,80,180,'Switch / AP',[['uplink','']],[['ports 1…N','Pis'],['Wi-Fi','dongles']],'inferred') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the RD56 notes and flow diagram', 'RD56 is a concept with no hardware design. These sheets show the node and network the diagram implies.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Pi client state machine (selected TV, inferred)', `<div id="fl"></div>`)}${card('Server-side jobs', `<div id="sv"></div>`)}</div>`;
  const draw=()=>{ const x=D.mons[D.sel]; const st=['boot from SD card','DHCP: get an address','register: name, location, MAC','fetch playlist','play (HDMI out)','content change? → wait for key frame / open file','poll server every second'];
    const on = x.sw && SIM.t>=x.sw.t && SIM.t<x.sw.at ? 5 : (Math.floor(SIM.t*10)%10===3 ? 6 : 4);
    m.querySelector('#fl').innerHTML = flowSVG(st,on);
    m.querySelector('#sv').innerHTML = tbl(['job','from'],[['monitor list: name, location, MAC','diagram fields'],['“Browse Video Uploader” per monitor','diagram'],['stream content to all Pis','Notes.txt'],['control from the openGear frame','diagram'],['pick adverts from RFID tag reads','Notes.txt idea 2']]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD56 decided, and what became of it', `<ol>
    <li><b>Outcome: idea only.</b> Two files from 19 Oct 2012|45; the register leaves RD56 at “?”. No Pi software, enclosure or test exists in the archive.</li>
    <li><b>The notes and the diagram disagree on delivery.</b> Notes.txt has the playout station <i>streaming</i> to every Pi. The diagram gives each monitor a “Browse Video Uploader”, which means <i>uploading files</i> to each Pi. The model has both; only uploads or multicast support the diagram’s “Possibility of Infinite Monitors”.</li>
    <li><b>Unicast does not scale.</b> At 4 Mbit/s per TV ${inf}, one 100 Mbit/s port feeds about ${Math.floor(90/(4*1.06))} TVs.</li>
    <li><b>The Wi-Fi option limits bitrate.</b> “Wired Network In or Wireless dongle option”: a USB dongle on a 2012 Pi manages perhaps 10–20 Mbit/s in practice ${inf}.</li>
    <li><b>openGear as the controller.</b> The diagram puts a WBS openGear frame in charge (“controlled over openGear network”). That is the one link to the product line: DashBoard as the control surface. No openGear card for it was designed.</li>
    <li><b>The RFID idea.</b> It assumed phones would carry RFID and that shoppers could be identified and tracked as they passed screens. Nothing was built. It would also have meant collecting personal data about shoppers.</li>
    <li><b>Siblings.</b> RD59 (IP video to HDMI/SDI converter) and RD61 (small HDMI video player the size of a USB key) are listed right after it and chase the same market.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Pi model, network speeds, bitrates, GOP length, packet size and the client software are ${inf}.</li><li>MAC addresses use the Raspberry Pi Foundation prefix with made-up endings ${inf}.</li><li>The TV brand on the original diagram and the openGear logo are left out.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD56-RaspberryPI/HDMIDongle/Notes.txt · FlowDiagram.pdf</li><li>R&amp;D_List.xls (RD56, RD59, RD61)</li></ul>`);
}

SIM.register({
  id:'rd56-raspberrypi', name:'RD56 Raspberry Pi · mall signage network concept (2012|45)', duration:1,
  product:'RD56 Raspberry Pi', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD56-RaspberryPI',
  summary:'The October 2012 idea of a Raspberry Pi behind every LCD TV in a mall, controlled from an openGear frame. The flow diagram is redrawn as a working network: add monitors, compare unicast, multicast and uploaded files, switch content, and try the RFID-targeting idea.',
  highlights:['Flow diagram redrawn and clickable','Unicast vs multicast vs local files','Server-port load and the “infinite monitors” claim','Content changes wait for the next key frame','Notes vs diagram disagreement'],
  depth:'Hardware model',
  stepUnits:[{label:'1 video frame',period:()=>1/30},{label:'1 HDMI refresh',period:()=>1/60},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.05,'50 ms'],[0.005,'5 ms']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: a mall of Pis', render:viewTutorial},
    {id:'second', label:'One second of signage', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
