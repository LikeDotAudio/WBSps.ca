/* =====================================================================
   RD61 — Small Form Factor HDMI Video Player (Ward-Beck R&D register: Patrick, status "?", early 2013)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Register text: "small form factor HDMI video player. Similar size to USB Key."
   The folder holds a pencil sketch (photo.JPG, iPhone 4S, 24 Jan 2013): a USB-key body with a USB plug at
   one end and an HDMI plug at the other, a round PLAY/STOP button on top, a LOOP / PLAY ONCE slide switch
   on the side, and "caps to cover" both plugs. The other two files are a vendor e-mail advertising an
   HDMI extender and a design-services company overview (2009 PDF).
   This plugin builds the sketched device as a working model: plug it in, read the TV's EDID, play a clip
   from flash, loop or stop at the end, with the HDMI timing underneath.
   Sources (all in this archive):
   - RD61-SmallFormFactorHDMIVideoPlayer/photo.JPG (→ assets/rd61-hdmi-player-sketch.jpg, rotated upright)
   - …/SmallformFactorInterfaceDevices_List.txt · …/AMI-India CDC Corporate Overview.pdf · README.md · R&D_List.xls (row 61)
   HDMI/CEA-861 timing figures, the 55 mA HDMI +5 V limit and the USB 500 mA budget are standard values,
   not archive text: marked inferred. Body size is scaled from the sketch and a USB plug (inferred).
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
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
const MODES = {   // CEA-861 timings (inferred: standard values)
  '1080p60': { name:'1080p 60', pclk:148.5e6, htot:2200, vtot:1125, hact:1920, vact:1080, fps:60 },
  '720p60':  { name:'720p 60',  pclk:74.25e6, htot:1650, vtot:750,  hact:1280, vact:720,  fps:60 },
  '1080i60': { name:'1080i 30', pclk:74.25e6, htot:2200, vtot:1125, hact:1920, vact:1080, fps:30, interlaced:true },
};
const CLIPS = [ { name:'logo sting 0.40 s', len:0.40, fps:30 }, { name:'promo 24p, 10 s', len:10, fps:24 }, { name:'menu loop 30p, 30 s', len:30, fps:30 } ];
const T_HPD = 0.050, T_EDID = 128*9/100e3 + 0.002, T_BOOT = 0.020;    // hot-plug at 50 ms; 128-byte EDID over 100 kHz DDC (inferred)
const D = { usb:true, hdmi:true, tvBest:'1080p60', loop:true, clip:0, presses:[0.12], caps:false };
function reset(){ Object.assign(D,{ usb:true, hdmi:true, tvBest:'1080p60', loop:true, clip:0, presses:[0.12], caps:false }); LOG.items=[]; SIM.refresh(); }
const C = ()=> CLIPS[D.clip];
const mode = ()=> MODES[D.tvBest];
/* playback state over the second, from button presses, loop switch and clip length */
function segments(){
  const segs=[]; const ready = D.usb && D.hdmi ? T_HPD+T_EDID+T_BOOT : Infinity;
  let playing=false, start=0;
  const ev=[...D.presses].filter(t=>t>=ready).sort((a,b)=>a-b);
  let t=0, i=0;
  if (!(D.usb&&D.hdmi)) return [{a:0,b:1,st: !D.usb?'NO POWER':'NO HDMI', clipT:null}];
  segs.push({a:0,b:ready,st:'BOOT / EDID',clipT:null}); t=ready;
  while (t<1){
    const nextPress = ev[i]!==undefined ? ev[i] : Infinity;
    if (!playing){ const b=Math.min(1,nextPress); segs.push({a:t,b,st:'STOPPED',clipT:null}); t=b; if (nextPress<1){ playing=true; start=t; i++; } continue; }
    const end = start + C().len; const stopAt=Math.min(nextPress,1);
    if (end < stopAt){ segs.push({a:t,b:end,st:'PLAYING',clipT:start}); t=end; if (D.loop){ start=end; continue; } playing=false; continue; }
    segs.push({a:t,b:stopAt,st:'PLAYING',clipT:start}); t=stopAt; if (nextPress<1){ playing=false; i++; }
  }
  return segs;
}
const segAt = t => segments().find(s=>t>=s.a&&t<s.b) || {st:'—'};
function clipFrameAt(t){ const s=segAt(t); if (s.st!=='PLAYING') return null; return Math.floor((t-s.clipT)*C().fps); }
/* power: HDMI +5 V may supply 55 mA; the decoder needs ~2 W (both inferred) */
const P_NEED = 2.0, HDMI_5V = 0.055*5, USB2 = 0.5*5;

const A = {
  press(){ act('PLAY/STOP pressed', tr=>{ const t=SIM.t; D.presses.push(t); D.presses.sort((a,b)=>a-b); const s=segAt(t+1e-6); tr(`at ${SIM.fmtDur(t)} → ${s.st}`); tr('button debounced and read by the player SoC '+inf); }); },
  clearPresses(){ act('Clear button presses', tr=>{ D.presses=[]; }); },
  loop(){ act('Slide switch → '+(D.loop?'PLAY ONCE':'LOOP'), tr=>{ D.loop=!D.loop; tr(D.loop?'At the end of the clip, start again from frame 0':'At the end of the clip, stop (output shows black)'); }); },
  clip(i){ act('Clip on flash → '+CLIPS[i].name, tr=>{ D.clip=+i; const c=C(); tr(`${c.len} s at ${c.fps} fps → ${Math.round(c.len*c.fps)} frames`); if (c.fps===24) tr('24p on a 60 Hz output: 3:2 cadence (frames shown 3, 2, 3, 2 … times)'); }); },
  usb(){ act('USB '+(D.usb?'unplugged':'plugged in'), tr=>{ D.usb=!D.usb; tr(`Power budget: decoder ≈ ${P_NEED} W ${inf}; HDMI +5 V gives ≤ ${HDMI_5V.toFixed(2)} W; USB 2.0 port gives ${USB2} W ${inf}`); tr(D.usb?'USB powers the stick (and is where clips are copied on)':'Without USB the stick cannot run from HDMI power alone'); }); },
  hdmi(){ act('HDMI '+(D.hdmi?'unplugged':'plugged in'), tr=>{ D.hdmi=!D.hdmi; if (D.hdmi){ tr(`HPD high at ${T_HPD*1000} ms → read EDID block 0 over DDC (I²C 0xA0, 128 bytes, ≈ ${(T_EDID*1000).toFixed(1)} ms at 100 kHz) ${inf}`); tr('Pick the preferred timing from the detailed timing descriptor → '+mode().name); } }); },
  tv(v){ act('TV preferred mode (EDID) → '+MODES[v].name, tr=>{ D.tvBest=v; const md=mode(); tr(`pixel clock ${md.pclk/1e6} MHz, TMDS ${(md.pclk*10/1e9).toFixed(3)} Gb/s per channel × 3`); }); },
  caps(){ act(D.caps?'Caps off':'Caps on', tr=>{ D.caps=!D.caps; tr('“Caps to cover” both plugs (sketch)'); if (D.caps){ D.usb=false; D.hdmi=false; tr('Capped: unplugged from both'); } }); },
};

/* ================= panels ================= */
function deviceSVG(){
  const s0=segAt(SIM.t), playing=s0.st==='PLAYING';
  const U=6;   // px per mm; body ≈ 62 × 22 × 10 mm (inferred from a USB plug 12 mm wide in the sketch)
  let s=`<svg viewBox="0 0 640 230" style="width:100%;display:block" role="img" aria-label="The sketched player, drawn from the sketch">
   <rect x="${20}" y="${70}" width="${12*U*0.95}" height="${4.5*U*2.6}" rx="3" fill="${D.usb?'#c7c9cc':'#9aa'}" stroke="#555"/>
   <rect x="${30}" y="${92}" width="22" height="10" fill="#555"/><rect x="${30}" y="${116}" width="22" height="10" fill="#555"/>
   <text x="${40}" y="${66}" text-anchor="middle" font-size="12" fill="var(--ink2)">USB</text>
   <rect x="${20+12*U*0.95}" y="${45}" width="${62*U*0.95}" height="${22*U*0.95}" rx="14" fill="#2d3136" stroke="#111"/>
   <rect x="${20+12*U*0.95+62*U*0.95}" y="${72}" width="${15*U*0.9}" height="${11*U*1.05}" rx="2" fill="${D.hdmi?'#c7c9cc':'#9aa'}" stroke="#555"/>
   <text x="${20+12*U*0.95+62*U*0.95+40}" y="${66}" text-anchor="middle" font-size="12" fill="var(--ink2)">HDMI</text>
   <g data-a="press" style="cursor:pointer"><circle cx="300" cy="111" r="34" fill="#1a1c1f" stroke="${playing?'#2bd46b':'#888'}" stroke-width="5"/>${playing?'<rect x="288" y="99" width="24" height="24" fill="#2bd46b"/>':'<path d="M292,96 L316,111 L292,126 Z" fill="#ddd"/>'}<title>PLAY / STOP</title></g>
   <g data-a="loop" style="cursor:pointer"><rect x="160" y="160" width="70" height="18" rx="9" fill="#111" stroke="#777"/><circle cx="${D.loop?172:218}" cy="169" r="8" fill="#d33"/><text x="195" y="198" text-anchor="middle" font-size="12" fill="var(--ink)">${D.loop?'LOOP':'PLAY ONCE'}</text><title>LOOP / PLAY ONCE</title></g>
   <circle cx="470" cy="80" r="5" fill="${playing?'#2bd46b':D.usb?'#ffb000':'#333'}"/><text x="482" y="84" font-size="11" fill="#bbb">${s0.st}</text>`;
  if (D.caps) s+=`<rect x="12" y="62" width="${12*U*0.95+16}" height="${4.5*U*2.6+16}" rx="6" fill="#444" opacity=".85"/><rect x="${20+12*U*0.95+62*U*0.95-6}" y="64" width="${15*U*0.9+14}" height="${11*U*1.05+16}" rx="6" fill="#444" opacity=".85"/>`;
  s+=`<text x="10" y="222" font-size="12" fill="var(--ink2)">From photo.JPG (24 Jan 2013); size inferred. Click button / switch.</text></svg>`;
  return s;
}
function tvSVG(){
  const t=SIM.t, s0=segAt(t), f=clipFrameAt(t), md=mode();
  const col = f===null ? '#000' : `hsl(${(f*37)%360} 55% 40%)`;
  return `<svg viewBox="0 0 480 300" style="width:100%;max-width:520px;display:block;margin:auto" role="img" aria-label="TV">
    <rect x="0" y="0" width="480" height="270" rx="4" fill="${col}" stroke="#222" stroke-width="6"/>
    ${f===null?`<text x="240" y="140" text-anchor="middle" font-size="18" fill="#888" font-family="monospace">${s0.st}</text>`:`<circle cx="${80+(f%20)*16}" cy="140" r="30" fill="rgba(255,255,255,.8)"/><text x="16" y="32" font-size="16" fill="#fff" font-family="monospace">${C().name} · frame ${f}</text>`}
    <rect x="0" y="272" width="480" height="28" fill="var(--panel2)"/><text x="10" y="291" font-size="13" fill="var(--ink)">TV · ${D.hdmi&&D.usb?md.name:'no signal'} · EDID preferred ${md.name}</text></svg>`;
}
function ctlHTML(){
  const b=(a,v,l,on)=>`<button data-a="${a}" data-v="${v}" class="${on?'on':''}">${l}</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    ${b('usb','',D.usb?'USB in':'USB out',D.usb)}${b('hdmi','',D.hdmi?'HDMI in':'HDMI out',D.hdmi)}${b('caps','',D.caps?'caps on':'caps off',D.caps)}
    <span class="small muted">| TV EDID</span>${Object.keys(MODES).map(k=>b('tv',k,MODES[k].name,D.tvBest===k)).join('')}
    <span class="small muted">| clip</span>${CLIPS.map((c,i)=>b('clip',i,c.name,D.clip===i)).join('')}
    ${b('press','','press PLAY/STOP at playhead',false)}${b('clearPresses','','clear presses',false)}</div>
    <p class="small muted">Button presses so far: ${D.presses.map(t=>SIM.fmtDur(t)).join(', ')||'none'} (the model replays them every second).</p>`;
}
function bindAll(root){ bindActs(root,{ press:()=>A.press(), clearPresses:()=>A.clearPresses(), loop:()=>A.loop(), clip:v=>A.clip(+v), usb:()=>A.usb(), hdmi:()=>A.hdmi(), tv:v=>A.tv(v), caps:()=>A.caps() }); }

/* ================= timeline ================= */
const STC = { PLAYING:'--accent', STOPPED:'--line', 'BOOT / EDID':'--warn', 'NO POWER':'--bad', 'NO HDMI':'--bad' };
function lanes(){
  const css=SIM.css, md=mode(), c=C(), segs=segments(), outT=1/60;
  return [
    { label:'Player state', h:24, draw(cx,X,t0,t1,y,h){ segs.forEach(s=>bandAt(cx,X,Math.max(t0,s.a),Math.min(t1,s.b),y,h,css(STC[s.st]||'--ink2'),.6,s.st)); D.presses.forEach(p=>{ if(p<t0||p>t1) return; cx.fillStyle=css('--bad'); cx.fillRect(X(p)-1,y,3,h); }); } },
    { label:'HPD / DDC EDID read', h:22, draw(cx,X,t0,t1,y,h){ if(!(D.usb&&D.hdmi)) return; bandAt(cx,X,T_HPD,T_HPD+T_EDID,y,h,css('--warn'),.7,'EDID 128 B @100 kHz'); if ((X(t0+9/100e3)-X(t0))>3) SIM.pulses(cx,X,Math.max(t0,T_HPD),Math.min(t1,T_HPD+T_EDID),y,h,9/100e3,T_HPD,1/100e3,css('--ink'),'bytes'); } },
    { label:`Clip frames (${c.fps} fps)`, h:24, draw(cx,X,t0,t1,y,h){ segs.filter(s=>s.st==='PLAYING').forEach(s=>{ for(let k=0;;k++){ const a=s.clipT+k/c.fps; if(a>=s.b||a>t1) break; if(a+1/c.fps<t0||a<s.a) continue; bandAt(cx,X,a,Math.min(s.b,a+1/c.fps)-0.0005,y,h,css(k%2?'--accent':'--accent2'),.55,'f'+k); } }); } },
    { label:`HDMI frames out (${md.name}${c.fps===24&&md.fps===60?', 3:2':''})`, h:24, draw(cx,X,t0,t1,y,h){ if(!(D.usb&&D.hdmi)) return; const T=1/md.fps; for(let k=Math.floor(t0/T);k*T<t1;k++){ const t=k*T; const f=clipFrameAt(t+T/2); cx.fillStyle=f===null?css('--line'):`hsl(${(f*37)%360} 55% 45%)`; cx.fillRect(X(t)+1,y+4,Math.max(1,X(t+T)-X(t)-2),h-8); } } },
    { label:`Lines (${md.vtot} per frame)`, h:20, draw(cx,X,t0,t1,y,h){ if(!(D.usb&&D.hdmi)) return; SIM.pulses(cx,X,t0,t1,y,h,md.htot/md.pclk,0,(md.htot-md.hact)/md.pclk,css('--ink2'),'H blanking'); } },
    { label:`TMDS pixel clock ${md.pclk/1e6} MHz`, h:20, draw(cx,X,t0,t1,y,h){ if(!(D.usb&&D.hdmi)) return; SIM.pulses(cx,X,t0,t1,y,h,1/md.pclk,0,0.5/md.pclk,css('--accent2'),'pixels'); } },
  ];
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('The player (from the sketch)', `<div id="dev"></div>`)}${card('The sketch itself', `<img src="${ASSET}rd61-hdmi-player-sketch.jpg" alt="Pencil sketch of the player" style="width:100%;border-radius:6px">`)}</div>
     <div>${card('TV', `<div id="tv"></div>`)}${card('Controls', `<div id="ctl"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('Timeline — button, EDID, frames and HDMI timing', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const d=m.querySelector('#dev'); d.innerHTML=deviceSVG(); bindAll(d); m.querySelector('#tv').innerHTML=tvSVG(); const c=m.querySelector('#ctl'); c.innerHTML=ctlHTML(); bindAll(c); m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The idea', body:`<p>Early 2013|46, Patrick's register entry: an HDMI video player “similar size to USB Key”. The sketch shows how it would be used: copy a clip on over USB, plug it into a display, press PLAY.</p>`, check:()=>true, auto:true },
  { title:'1 · Why the USB end?', body:`<p>Unplug <b>USB</b>. The trace explains: an HDMI source port may only take about 55 mA from the display's +5 V pin, far too little for a video decoder, so the stick needs USB power.</p>`, check:()=>!D.usb, hint:'Press “USB in”.' },
  { title:'2 · Plug in', body:`<p>Plug <b>USB</b> back in. At 50 ms the TV raises hot-plug; the stick reads the 128-byte EDID over DDC (about 13 ms) and picks the TV's preferred mode.</p>`, check:()=>D.usb&&D.hdmi, hint:'Press “USB out” to plug it back in.' },
  { title:'3 · Play once', body:`<p>Set the slide switch to <b>PLAY ONCE</b> (click it on the drawing). With the 0.40 s clip the picture goes black when the clip ends.</p>`, check:()=>!D.loop&&D.clip===0, hint:'Click the red slider.' },
  { title:'4 · Loop', body:`<p>Back to <b>LOOP</b>. Now the clip restarts at frame 0 every 0.40 s: signage-style playback.</p>`, check:()=>D.loop, hint:'Click the slider again.' },
  { title:'5 · Stop with the button', body:`<p>Move the playhead to about 0.7 s and press <b>PLAY/STOP</b> (the round button). Playback stops there; the red tick marks the press.</p>`, check:()=>D.presses.some(t=>t>0.5), hint:'Drag the playhead past 0.5 s, then click the round button.' },
  { title:'6 · A 24p clip', body:`<p>Choose the <b>24p promo</b>. On a 60 Hz output the HDMI frame lane shows the 3:2 cadence: each film frame is held for 3, then 2, output frames.</p>`, check:()=>D.clip===1, hint:'Press “promo 24p, 10 s”.' },
  { title:'7 · An older TV', body:`<p>Set the TV's EDID to <b>720p 60</b>. The pixel clock halves to 74.25 MHz and each frame has 750 lines instead of 1125.</p>`, check:()=>D.tvBest==='720p60', hint:'Press 720p 60.' },
  { title:'Done', body:`<p>Nothing beyond the sketch was archived. The Findings tab says what the other two files are.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — using the stick', panelTitle:'Player, TV and controls', reset,
  panel(el){ el.innerHTML = deviceSVG()+tvSVG()+ctlHTML(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second of HDMI output', `<div id="lad"></div>`)}${card('At the playhead', `<div id="dev"></div>`)}`;
  const draw=()=>{ const md=mode(), t=SIM.t;
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','period','note'],[
      ['Output frames',md.fps,SIM.fmtDur(1/md.fps),md.name],['Lines',(md.vtot*md.fps).toLocaleString(),SIM.fmtDur(md.htot/md.pclk),`${md.vtot} per frame, ${md.vact} active`],
      ['Pixels (incl. blanking)',md.pclk.toLocaleString(),SIM.fmtDur(1/md.pclk),`${md.htot} × ${md.vtot}`],['TMDS bits per channel',(md.pclk*10).toLocaleString(),SIM.fmtDur(1/(md.pclk*10)),'8b/10b, three data channels + clock'],
      ['Clip frames decoded',C().fps,SIM.fmtDur(1/C().fps),C().name],['EDID read','once','≈ '+(T_EDID*1000).toFixed(1)+' ms','after hot-plug'],
    ].map(r=>r.map((c,i)=>i===1||i===2?`<span class="mono">${c}</span>`:c)));
    const fr=Math.floor(t*md.fps), line=Math.floor(((t*md.fps)%1)*md.vtot);
    m.querySelector('#dev').innerHTML = kv([['Output frame',fr,1],['Line in frame',line+' / '+md.vtot,1],['Clip frame',clipFrameAt(t)===null?'—':clipFrameAt(t),1],['State',segAt(t).st]]);
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    usb:{x:20,y:150,w:150,h:70,t:'USB plug',s:['5 V power','clip upload'],d:'Sketch: USB at one end. Power and file transfer (inferred roles).'},
    fl:{x:220,y:40,w:160,h:70,t:'Flash storage',s:['clip file'],d:'Holds the clip (inferred).'},
    soc:{x:220,y:150,w:160,h:90,t:'Player SoC',s:['video decoder','HDMI transmitter'],d:'Decodes the clip and drives HDMI (inferred; no part chosen in the archive).',live:()=>segAt(SIM.t).st==='PLAYING'},
    ui:{x:220,y:280,w:160,h:70,t:'Button + switch',s:['PLAY/STOP','LOOP/PLAY ONCE'],d:'Exactly the two controls in the sketch.'},
    hdmi:{x:440,y:150,w:150,h:70,t:'HDMI plug',s:['TMDS ×3 + clock','DDC, HPD, +5 V'],d:'Sketch: HDMI at the other end.'},
    tv:{x:640,y:150,w:150,h:70,t:'Display',s:['EDID','preferred mode'],d:'The display reports its timings in EDID.'},
  };
  blockView(m,B,[['usb','soc','5 V'],['fl','soc',''],['ui','soc',''],['soc','hdmi','TMDS'],['hdmi','tv',''],['tv','hdmi','EDID/HPD']],{start:'soc',w:820,h:380,side:'<p>Everything inside the body is inferred: the archive has the outside (sketch) and the size target (“USB key”).</p>'});
}
const SHEETS=[
  { name:'1 · HDMI plug (Type A)', note:'Type A pinout as a schematic symbol (standard; inferred). The sketch only shows the plug.', svg:()=>
    chip(330,40,220,'HDMI Type A plug',[['1/3','TMDS D2+/−'],['4/6','TMDS D1+/−'],['7/9','TMDS D0+/−'],['10/12','TMDS CLK+/−']],[['13','CEC'],['15/16','DDC SCL/SDA'],['18','+5 V (≤ 55 mA)'],['19','HPD']],'source side') },
  { name:'2 · USB plug and power', note:'Why USB is on the sketch: power. Figures inferred (USB 2.0: 500 mA).', svg:()=>
    chip(120,80,200,'USB A plug',[['1','VBUS 5 V'],['2/3','D− / D+'],['4','GND']],[['5 V','→ regulators']],'') + chip(520,80,200,'Player SoC',[['VIN','from USB'],['GPIO','PLAY/STOP'],['GPIO','LOOP']],[['TMDS','→ HDMI'],['DDC','EDID']],'inferred') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the RD61 sketch and connector standards', 'There is no circuit in the archive. These sheets list what the two plugs in the sketch must carry.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Player state machine — state at the playhead', `<div id="sm"></div>`)}${card('Segments this second', `<div id="sg"></div>`)}</div>`;
  const draw=()=>{ const cur=segAt(SIM.t).st;
    const N=[['BOOT / EDID',30,30],['STOPPED',230,30],['PLAYING',230,140],['NO POWER',30,140]];
    let s=`<svg viewBox="0 0 520 220" style="width:100%"><defs><marker id="ar61" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    const P=Object.fromEntries(N.map(n=>[n[0],n]));
    [['BOOT / EDID','STOPPED','EDID read'],['STOPPED','PLAYING','PLAY'],['PLAYING','STOPPED','STOP or end (PLAY ONCE)'],['NO POWER','BOOT / EDID','USB + HDMI in']].forEach(([a,b,l],i)=>{ const A_=P[a],B_=P[b]; s+=`<line x1="${A_[1]+70+(i===2?20:0)}" y1="${A_[2]+18}" x2="${B_[1]+70+(i===1?-20:0)}" y2="${B_[2]+18}" stroke="var(--ink2)" marker-end="url(#ar61)"/><text x="${(A_[1]+B_[1])/2+80}" y="${(A_[2]+B_[2])/2+14}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    s+=`<path d="M370,160 C450,140 450,200 370,180" fill="none" stroke="var(--ink2)" marker-end="url(#ar61)"/><text x="440" y="200" font-size="10" fill="var(--ink2)">end (LOOP)</text>`;
    N.forEach(([n,x,y])=>{ s+=`<rect x="${x}" y="${y}" width="140" height="36" rx="8" fill="${n===cur?'color-mix(in srgb,var(--accent) 35%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+70}" y="${y+22}" text-anchor="middle" font-size="12" fill="var(--ink)">${n}</text>`; });
    m.querySelector('#sm').innerHTML = s+'</svg>';
    m.querySelector('#sg').innerHTML = tbl(['From','To','State'], segments().map(g=>[SIM.fmtDur(g.a),SIM.fmtDur(g.b),g.st]));
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD61 decided, and what became of it', `<ol>
    <li><b>The sketch is the design.</b> photo.JPG (taken 24 Jan 2013) is a pencil drawing: USB plug, HDMI plug, PLAY/STOP button, LOOP/PLAY ONCE switch, caps for both ends. Nothing else about the product exists in the archive; the register (owner Patrick) keeps it at “?”.</li>
    <li><b>The file named “…InterfaceDevices_List.txt” is not a list.</b> It is a two-line unsolicited vendor message advertising an HDMI extender (“One Sender, One Receiver…”).</li>
    <li><b>The PDF is a design-services brochure.</b> “AMI-India CDC Corporate Overview” (31 pages, file created 2009, saved here Feb 2013) describes a hardware/software design house. Keeping it in RD61 suggests outsourcing the design was considered (${inf}).</li>
    <li><b>USB is there for power.</b> An HDMI source cannot run a decoder from the display's +5 V pin (≤ 55 mA, ${inf}); the sketch's USB end solves that, and doubles as the way to load clips.</li>
    <li><b>Related register items.</b> RD56 “Raspberry PI” and RD71 “Touch Screen Display” are the other small-computer ideas of the same period; none became a product.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Body dimensions, internal blocks, clip lengths, EDID timing and HDMI timings are model values (${inf}).</li><li>Button presses are replayed each simulated second so the playback states can be seen.</li></ul>`) +
  card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD61-SmallFormFactorHDMIVideoPlayer/photo.JPG (asset rd61-hdmi-player-sketch.jpg), SmallformFactorInterfaceDevices_List.txt, AMI-India CDC Corporate Overview.pdf, README.md</li><li>R&amp;D_List.xls row 61</li></ul>`);
}

SIM.register({
  id:'rd61-hdmi-player', name:'RD61 Small Form Factor HDMI Video Player · the USB-key sketch as a working model ('+Y(2013)+')', duration:1,
  product:'RD61 HDMI player stick', year:2013, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD61-SmallFormFactorHDMIVideoPlayer',
  summary:'An early-2013 idea for a USB-key-sized HDMI video player, known only from a pencil sketch: USB plug, HDMI plug, a PLAY/STOP button and a LOOP/PLAY ONCE switch. The model makes the sketch work: hot-plug and EDID, playback with loop or stop, and the HDMI frame, line and pixel timing underneath.',
  highlights:['The original sketch, and a clickable drawing of it','PLAY/STOP and LOOP/PLAY ONCE state machine','EDID read and mode choice at hot-plug','24p clip on a 60 Hz output: 3:2 cadence','Why the USB end exists: power'],
  depth:'Hardware model',
  stepUnits:[{label:'1 output frame',period:()=>1/mode().fps},{label:'1 clip frame',period:()=>1/C().fps},{label:'1 ms',period:()=>0.001},{label:'1 line',period:()=>mode().htot/mode().pclk}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.05,'50 ms'],[1/60,'1 frame'],[1e-4,'100 µs (lines)'],[1e-7,'100 ns (pixels)']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the stick', render:viewTutorial},
    {id:'second', label:'One second of HDMI', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
