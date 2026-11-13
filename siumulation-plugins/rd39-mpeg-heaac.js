/* =====================================================================
   RD39 — MPEG / HE-AAC encoding research (Ward-Beck R&D register, status "?")
   Register text: "Mpeg Encoding / ASI to SDI and vice versa."
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all in XXX - ENGINEERING - 2016 RD FILES/RD39-MPEG-HEAAC/ unless noted):
   - Notes.docx (16 Jan 2012): call with Fraunhofer — SHARC lacks executable memory; ARM9 or TI C64x
       suggested; satellite customers use >= 30 kbit/s; 24 kbit/s gives speech artefacts; USAC at 12 kbit/s
   - trev_305-moser.pdf (EBU Technical Review 305): AAC + SBR + PS, SBR 1-3 kbit/s per channel,
       PS side info 2-3 kbit/s, PS below ~36 kbit/s, crossover table 20/32/48 kbit/s
   - ATSC/a_153-Part-8-2009.pdf: HE AAC v2 Profile Level 2, profile-level-id=48, config=EB098800,
       constantDuration=2048, sizeLength=13 indexLength=3, max bitrate per core channel table
   - DSP/ADSP-21362…66.pdf: 3 Mbit SRAM, 4 Mbit mask ROM, 333 MHz;  DSP/DOC-1292…pdf (17 Jan 2012):
       the 213xx ROM is programmable only in production
   - Sample Audio/Winamp-Converted/*.md sidecars: sizes and durations of the listening-test files
   - ISO_14496-1_Systems.pdf, ISO_14496-3_Audio-Amd2 (1).pdf (reference only)
   - ../R&D_List.xls (register line), ../README.md
   Anything not in those files is marked "inferred" on screen.
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
/* listening-test files: [name, original kind, original kbit/s, HE-AAC bytes, duration s, container]
   sizes and durations from the Sample Audio sidecars; the two .aac files take the duration of their originals */
const TRACKS = [
  ['00006','MP3',128,662491,213.67,'m4a'],['00010','MP3',128,672055,216.74,'m4a'],['10002','MP3',128,154495,49.27,'m4a'],
  ['10004','MP3',128,437334,140.81,'m4a'],['10012','MP3',128,702095,226.49,'m4a'],
  ['Tchaikovsky','M4A',262.8,3321329,1106.29,'aac'],['The Sound Of Silence','M4A',264.6,1035543,344.35,'aac'],
  ['01 Mambo #5','WAV',1411.2,407278,131.05,'m4a'],['02 The Hustle','WAV',1411.2,661706,213.39,'m4a'],['03 Baby Elephant Walk','WAV',1411.2,522088,168.21,'m4a'],
  ['04 Tijuana Taxi','WAV',1411.2,405271,130.40,'m4a'],['05 Also Sprach Zarathustra','WAV',1411.3,350072,112.52,'m4a'],['06 Love Theme (Godfather)','WAV',1411.2,454943,146.47,'m4a'],
  ['07 Feels So Good','WAV',1411.2,701317,226.21,'m4a'],['08 A Fifth of Beethoven','WAV',1411.2,548783,176.84,'m4a'],['09 Theme from Shaft','WAV',1411.2,678217,218.73,'m4a'],
  ['10 Dueling Banjos','WAV',1411.2,589098,189.89,'m4a'],['11 Love’s Theme','WAV',1411.2,739344,238.52,'m4a'],['12 Spanish Flea','WAV',1411.3,405988,130.64,'m4a'],
  ['13 Unchained Melody','WAV',1411.2,640476,206.52,'m4a'],['14 Theme from M*A*S*H','WAV',1411.2,663746,214.04,'m4a'],['15 Tubular Bells','WAV',1411.2,816117,263.36,'m4a'],
  ['16 Children','WAV',1411.2,762729,246.09,'m4a'],
].map(r=>({ name:r[0], ok:r[1], okb:r[2], bytes:r[3], dur:r[4], box:r[5], kbps: r[3]*8/r[4]/1000 }));
/* EBU Technical Review 305 (Moser) crossover table: stereo bitrate → AAC range / SBR range (Hz) */
const XO = [[20,4500,15400],[32,6800,16900],[48,8300,16900]];
/* ATSC A/153 Part 8 Table 5.1: maximum bitrate per AAC core channel */
const A153MAX = [[48000,0,288],[44100,0,264.6],[32000,0,192],[24000,1,144],[22050,1,132.3],[16000,1,96]];
const PLAT = {
  sharc:{name:'ADI SHARC ADSP-21362', mhz:333, sramKB:3*1024/8, romKB:4*1024/8, note:'3 Mbit SRAM + 4 Mbit mask ROM (datasheet); ROM written only in production (DOC-1292, 17 Jan 2012). Fraunhofer: “not enough executable memory”.'},
  arm9:{name:'ARM9 (Fraunhofer suggestion)', mhz:50, sramKB:null, note:'Notes.docx: “Recommended using the ARM9 50Mhz”. External SDRAM assumed '+'(inferred).'},
  c64:{name:'TI C64x DSP', mhz:null, sramKB:null, note:'Notes.docx: “Most people in broadcast industry use the TI-C64 DSP.” No datasheet in the folder.'},
};
const MODES = { lc:{name:'AAC-LC', aot:2}, v1:{name:'HE-AAC (AAC + SBR)', aot:5}, v2:{name:'HE-AAC v2 (AAC + SBR + PS)', aot:29} };
const SFI = {96000:0,88200:1,64000:2,48000:3,44100:4,32000:5,24000:6,22050:7,16000:8,12000:9,11025:10,8000:11};
const BRS = [12,16,20,24,32,48,64,96,128];

const D = { mode:'v2', br:24, fs:48000, plat:'sharc', codeKB:420, track:-1 };
function reset(){ Object.assign(D,{ mode:'v2', br:24, fs:48000, plat:'sharc', codeKB:420, track:-1 }); LOG.items=[]; SIM.refresh(); }

function lerpXO(br){ if (br<=XO[0][0]) return [XO[0][1]*br/XO[0][0], XO[0][2]*Math.min(1,0.7+0.3*br/XO[0][0])];
  for (let i=0;i<XO.length-1;i++){ const a=XO[i], b=XO[i+1]; if (br<=b[0]){ const k=(br-a[0])/(b[0]-a[0]); return [a[1]+k*(b[1]-a[1]), a[2]+k*(b[2]-a[2])]; } }
  const k = Math.min(1,(br-48)/80); return [8300+k*(11000-8300), 16900+k*(19000-16900)]; }
function model(){
  const fs=D.fs, sbr = D.mode!=='lc', ps = D.mode==='v2';
  const coreFs = sbr? fs/2 : fs, N = sbr? 2048 : 1024, Tf = N/fs;
  const [xo, top] = lerpXO(D.br);
  const lcBw = Math.min(fs/2, 20000, 3000 + 115*D.br);                 // AAC-LC audio bandwidth (inferred)
  const bw = sbr? Math.min(top, fs/2) : lcBw;
  const coreTop = sbr? Math.min(xo, coreFs/2) : lcBw;
  const coreCh = ps? 1 : 2;
  const sbrK = sbr? 2*coreCh : 0, psK = ps? 2.5 : 0;                    // mid-points of 1–3 and 2–3 kbit/s
  const coreK = Math.max(1, D.br - sbrK - psK);
  const bitsF = D.br*1000*Tf, bytesF = bitsF/8;
  const verdict = D.br>=30? {c:'var(--accent)', t:'good — Fraunhofer’s satellite customers use ≥ 30 kbit/s'}
               : D.br>=24? {c:'var(--warn)', t:'usable for music; 24 kbit/s “will have audio artifacts in speech”'}
               : D.br>=12? {c:'var(--bad)', t:'below HE-AAC v2’s comfort zone; Fraunhofer said USAC (1–2 years away) would reach good quality at 12 kbit/s'}
               : {c:'var(--bad)', t:'too low'};
  const psWanted = D.br < 36;
  const a153 = A153MAX.find(r=>r[0]===coreFs);
  const P = PLAT[D.plat];
  const bufKB = (N*2*4*3 + 1024*coreCh*4*2)/1024;                     // in/out/look-ahead PCM + MDCT state (inferred)
  const memNeed = D.codeKB + bufKB;
  const fits = P.sramKB ? memNeed <= P.sramKB : null;
  return { fs, sbr, ps, coreFs, N, Tf, xo, top, bw, coreTop, coreCh, sbrK, psK, coreK, bitsF, bytesF, verdict, psWanted, a153, P, bufKB, memNeed, fits };
}
/* AudioSpecificConfig, built as in ISO 14496-3 explicit hierarchical signalling (A/153 example EB098800) */
function asc(){
  const m=model(); let bits='';
  const put=(v,n)=>{ bits += (v>>>0).toString(2).padStart(n,'0').slice(-n); };
  const fields=[];
  const F=(name,v,n)=>{ fields.push([name,v,n,bits.length]); put(v,n); };
  F('audioObjectType', MODES[D.mode].aot, 5);
  F('samplingFrequencyIndex', SFI[m.coreFs]!=null?SFI[m.coreFs]:15, 4);
  F('channelConfiguration', m.coreCh, 4);
  if (D.mode!=='lc'){ F('extensionSamplingFrequencyIndex', SFI[m.fs], 4); F('audioObjectType (core)', 2, 5); }
  F('frameLengthFlag', 0, 1); F('dependsOnCoreCoder', 0, 1); F('extensionFlag', 0, 1);
  while (bits.length%8) bits+='0';
  const bytes=[]; for (let i=0;i<bits.length;i+=8) bytes.push(parseInt(bits.slice(i,i+8),2));
  return { bits, bytes, hex: bytes.map(hex2).join(''), fields };
}
function frameAt(t){ const m=model(); const k=Math.floor(t/m.Tf); return { k, t0:k*m.Tf, ph:(t-k*m.Tf)/m.Tf, au: Math.round(m.bytesF + (k%3-1)*m.bytesF*0.08) }; }  /* AU size varies ±8 % around the mean (bit reservoir, inferred) */

const A = {
  mode(v){ act('Codec mode → '+MODES[v].name, tr=>{ D.mode=v; const m=model();
    tr(`audioObjectType = ${MODES[v].aot}; core runs at ${m.coreFs} Hz, ${m.coreCh} channel(s); frame = ${m.N} output samples (${SIM.fmtDur(m.Tf)})`);
    if (v!=='lc') tr(`SBR rebuilds ${Math.round(m.coreTop)}–${Math.round(m.bw)} Hz from ≈ ${m.sbrK} kbit/s side data (Moser: 1–3 kbit/s per channel)`);
    if (v==='v2') tr('PS: core is mono; ≈ 2.5 kbit/s of IID/ICC/IPD parameters rebuild the stereo image (Moser: 2–3 kbit/s)');
    tr('ASC = '+asc().hex+(v==='v2'&&D.fs===48000?' — the config string in A/153 Part 8 (EB098800)':'')); }); },
  br(v){ act(`Bitrate → ${v} kbit/s`, tr=>{ D.br=v; D.track=-1; const m=model();
    tr(`bits per frame = ${v} kbit/s × ${SIM.fmtDur(m.Tf)} = ${Math.round(m.bitsF)} bits (${Math.round(m.bytesF)} bytes)`);
    if (D.mode!=='lc') tr(`crossover ≈ ${Math.round(m.xo)} Hz, SBR up to ${Math.round(m.top)} Hz (interpolated from Moser’s 20/32/48 kbit/s table)`);
    tr(`core gets ≈ ${m.coreK.toFixed(1)} kbit/s after SBR ${m.sbrK} + PS ${m.psK}`);
    tr(`verdict: ${m.verdict.t}`); if (m.psWanted && D.mode!=='v2') tr('below ~36 kbit/s Moser recommends Parametric Stereo (HE-AAC v2)'); }); },
  fs(v){ act(`Sample rate → ${v} Hz`, tr=>{ D.fs=v; const m=model(); tr(`core fs = ${m.coreFs} Hz; A/153 Level 2 limit for that core: ${m.a153? m.a153[2]+' kbit/s per core channel':'not in Table 5.1'}`); }); },
  plat(v){ act('Target processor → '+PLAT[v].name, tr=>{ D.plat=v; const m=model(); tr(PLAT[v].note);
    if (m.P.sramKB) tr(`code + tables ${D.codeKB} KB + buffers ${m.bufKB.toFixed(0)} KB = ${m.memNeed.toFixed(0)} KB vs ${m.P.sramKB} KB on-chip SRAM → ${m.fits?'fits':'<b style="color:var(--bad)">does not fit</b>'}`);
    else tr('no memory figure in the archive for this part; the external memory makes code size a non-issue '+'(inferred)'); }); },
  code(v){ D.codeKB=v; SIM.refresh(); },
  track(i){ act('Listening bench → '+TRACKS[i].name, tr=>{ const T=TRACKS[i]; D.track=i; D.fs=44100; D.mode='v2'; D.br=Math.round(T.kbps);
    tr(`${T.name}: original ${T.ok} ${T.okb} kbit/s → HE-AAC ${T.box} ${T.bytes.toLocaleString()} bytes / ${T.dur} s = <b>${T.kbps.toFixed(2)} kbit/s</b>`);
    if (T.ok==='MP3') tr('source is already a 128 kbit/s MP3: the test hears MP3 artefacts re-coded (tandem coding)');
    tr(`model set to HE-AAC v2, 44.1 kHz, ${D.br} kbit/s — the Winamp encoder setting implied by the file sizes`); }); },
};

/* ---------------- views: spectrum "panel" and listening bench ---------------- */
function spectrumSVG(){
  const m=model(), W=640, H=190, L=30, R=14, ny=m.fs/2, X=f=>L+f/ny*(W-L-R);
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px" role="img" aria-label="Audio band split">`;
  for (let f=0; f<=ny; f+=2000){ s+=`<line x1="${X(f)}" y1="20" x2="${X(f)}" y2="${H-34}" stroke="var(--grid)"/><text x="${X(f)}" y="${H-20}" font-size="10" text-anchor="middle" fill="var(--ink2)">${f/1000}k</text>`; }
  s+=`<rect x="${X(0)}" y="40" width="${X(m.coreTop)-X(0)}" height="70" fill="var(--accent)" opacity=".75"/><text x="${X(0)+6}" y="58" font-size="12" fill="#fff" font-weight="700">AAC core ${m.coreCh===1?'(mono)':'(stereo)'}</text><text x="${X(0)+6}" y="74" font-size="11" fill="#fff">0–${Math.round(m.coreTop)} Hz · ${m.coreK.toFixed(1)} kbit/s</text>`;
  if (m.sbr) s+=`<rect x="${X(m.coreTop)}" y="40" width="${Math.max(0,X(m.bw)-X(m.coreTop))}" height="70" fill="var(--accent2)" opacity=".55"/><text x="${X(m.coreTop)+6}" y="58" font-size="12" fill="var(--ink)" font-weight="700">SBR (rebuilt)</text><text x="${X(m.coreTop)+6}" y="74" font-size="11" fill="var(--ink)">${Math.round(m.coreTop)}–${Math.round(m.bw)} Hz · ${m.sbrK} kbit/s</text>`;
  if (m.ps) s+=`<rect x="${X(0)}" y="116" width="${X(m.bw)-X(0)}" height="18" fill="var(--warn)" opacity=".55"/><text x="${X(0)+6}" y="129" font-size="11" fill="var(--ink)">Parametric Stereo: L/R rebuilt from mono + ${m.psK} kbit/s (IID, ICC, IPD/OPD)</text>`;
  s+=`<text x="${W-R}" y="16" font-size="11" text-anchor="end" fill="${m.verdict.c}">${D.br} kbit/s · ${m.verdict.t}</text><text x="${L}" y="16" font-size="11" fill="var(--ink2)">0 – ${ny/1000} kHz (fs ${m.fs/1000} kHz)</text>`;
  if (m.bw < ny) s+=`<rect x="${X(m.bw)}" y="40" width="${X(ny)-X(m.bw)}" height="70" fill="var(--chip)"/><text x="${X(m.bw)+4}" y="100" font-size="10" fill="var(--ink2)">not coded</text>`;
  return s+`<text x="${L}" y="${H-4}" font-size="10" fill="var(--ink2)">Band split: EBU Tech. Review 305 table (20/32/48 kbit/s), interpolated; AAC-LC bandwidth inferred</text></svg>`;
}
function ctlHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    ${Object.keys(MODES).map(k=>`<button data-a="mode" data-v="${k}" class="${D.mode===k?'on':''}">${MODES[k].name}</button>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:6px"><span class="small muted">kbit/s</span>${BRS.map(b=>`<button data-a="br" data-v="${b}" class="${D.br===b?'on':''}">${b}</button>`).join('')}
    <span class="small muted" style="margin-left:8px">fs</span>${[44100,48000].map(f=>`<button data-a="fs" data-v="${f}" class="${D.fs===f?'on':''}">${f/1000} k</button>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:6px"><span class="small muted">target</span>${Object.keys(PLAT).map(k=>`<button data-a="plat" data-v="${k}" class="${D.plat===k?'on':''}">${PLAT[k].name}</button>`).join('')}</div>`;
}
function memHTML(){
  const m=model(); if (!m.P.sramKB) return `<p class="small">${m.P.note}</p>`;
  const W=520, tot=Math.max(m.P.sramKB, m.memNeed)*1.05, X=v=>v/tot*(W-20);
  return `<svg viewBox="0 0 ${W} 88" style="width:100%"><rect x="10" y="10" width="${X(m.P.sramKB)}" height="22" fill="none" stroke="var(--ink)" stroke-dasharray="4 3"/><text x="${10+X(m.P.sramKB)-4}" y="45" font-size="10.5" text-anchor="end" fill="var(--ink)">SRAM ${m.P.sramKB} KB (3 Mbit)</text>
    <rect x="10" y="14" width="${X(D.codeKB)}" height="14" fill="var(--accent2)"/><rect x="${10+X(D.codeKB)}" y="14" width="${X(m.bufKB)}" height="14" fill="var(--warn)"/>
    <text x="10" y="62" font-size="11" fill="${m.fits?'var(--accent)':'var(--bad)'}">code+tables ${D.codeKB} KB + PCM/MDCT buffers ${m.bufKB.toFixed(0)} KB = ${m.memNeed.toFixed(0)} KB → ${m.fits?'fits':'does not fit'}</text><text x="10" y="80" font-size="11" fill="var(--ink2)">ROM ${m.P.romKB} KB (4 Mbit) can only be masked at the factory</text></svg>
    <label class="small">encoder code + tables (KB, ${inf}) <input id="codeKB" type="range" min="100" max="800" step="10" value="${D.codeKB}"> <span class="mono">${D.codeKB}</span></label>`;
}
function benchHTML(){
  return `<div class="scroll" style="max-height:260px">`+tbl(['Track','original','HE-AAC','kbit/s'], TRACKS.map((T,i)=>[`<a href="#" data-a="track" data-v="${i}" style="${D.track===i?'font-weight:700;color:var(--accent)':''}">${T.name}</a>`, `${T.ok} ${T.okb}`, T.box, `<span class="mono">${T.kbps.toFixed(2)}</span>`]))+`</div>
    <p class="small muted">kbit/s = file bytes × 8 ÷ duration (sidecars). Mean of all ${TRACKS.length}: <b>${(TRACKS.reduce((a,T)=>a+T.kbps,0)/TRACKS.length).toFixed(2)} kbit/s</b>.</p>`;
}
function bindAll(root){ bindActs(root,{ mode:v=>A.mode(v), br:v=>A.br(+v), fs:v=>A.fs(+v), plat:v=>A.plat(v), track:v=>A.track(+v) }); const c=root.querySelector('#codeKB'); if (c) c.onchange=e=>A.code(+e.target.value); }

/* ---------------- timeline ---------------- */
function lanes(){
  const m=model(), css=SIM.css; const L=[];
  L.push({label:`PCM in, ${m.fs/1000} kHz × 2`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/m.fs,0,0.4/m.fs,css('--ink2'),'samples'); }});
  if (m.sbr) L.push({label:'QMF analysis slot (64 bands)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,64/m.fs,0,32/m.fs,css('--accent2'),'QMF slots'); }});
  L.push({label:`Encoder frame (${m.N} samples)`, h:28, draw(c,X,t0,t1,y,h){ const k0=Math.floor(t0/m.Tf), k1=Math.ceil(t1/m.Tf);
    if (k1-k0>400){ SIM.pulses(c,X,t0,t1,y,h,m.Tf,0,m.Tf*0.95,css('--accent'),'frames'); return; }
    for (let k=k0;k<k1;k++){ bandAt(c,X,k*m.Tf,(k+0.97)*m.Tf,y,h,k%2?css('--accent'):css('--accent2'),.7,'frame '+k); } }});
  if (m.sbr) L.push({label:`SBR${m.ps?' + PS':''} side data`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,m.Tf,m.Tf*0.8,m.Tf*0.18*(m.sbrK+m.psK)/D.br*4,css('--warn'),'SBR/PS payloads'); }});
  L.push({label:`Access unit (≈ ${Math.round(m.bytesF)} B)`, h:30, draw(c,X,t0,t1,y,h){ const k0=Math.floor(t0/m.Tf), k1=Math.ceil(t1/m.Tf);
    if (k1-k0>400){ laneText(c,X,t0,y,h,`${Math.round(1/m.Tf*10)/10} AU/s, mean ${Math.round(m.bytesF)} bytes`); return; }
    for (let k=k0;k<k1;k++){ const f=frameAt(k*m.Tf+1e-9); const hh=(h-6)*clamp(f.au/(m.bytesF*1.2),0.1,1); c.fillStyle=css('--accent'); c.globalAlpha=.6; c.fillRect(X(k*m.Tf+m.Tf*0.98), y+h-3-hh, Math.max(2,X(m.Tf*0.25)-X(0)), hh); c.globalAlpha=1; } }});
  L.push({label:'RTP packet (A/153: 1 AU, AU-header 16 b)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,m.Tf,m.Tf*0.99,Math.max(m.Tf*0.02,(m.bytesF+16)*8/2e6),css('--ink'),'RTP packets'); }});
  L.push({label:'MPEG-2 TS on ASI (188 B)', h:22, draw(c,X,t0,t1,y,h){ const per=184*8/(D.br*1000); SIM.pulses(c,X,t0,t1,y,h,per,0,188*8/270e6*1.25,css('--bad'),'TS packets for this PID (ASI 270 Mb/s, inferred)'); }});
  return L;
}

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('HE-AAC encoder model — band split', `<div id="sp"></div><div id="ctl"></div>`)}${card('Will it fit the DSP?', `<div id="mem"></div>`)}</div>
    <div>${card('Listening bench (RD39 Sample Audio)', `<div id="bench"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('One second of encoding — zoom in to see single frames', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ m.querySelector('#sp').innerHTML=spectrumSVG(); const c=m.querySelector('#ctl'); c.innerHTML=ctlHTML(); bindAll(c);
    const me=m.querySelector('#mem'); me.innerHTML=memHTML(); bindAll(me); const b=m.querySelector('#bench'); b.innerHTML=benchHTML(); bindAll(b);
    m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The question RD39 asked', body:`<p>January 2012|45. Customers wanted MPEG audio encoding next to SDI and ASI. Ali and Peter called Fraunhofer to ask what an HE-AAC v2 encoder needs, and whether Ward-Beck’s usual SHARC DSP could run one. This walk-through repeats the study with the numbers they collected.</p>`, check:()=>true, auto:true },
  { title:'1 · Start where quality is easy', body:`<p>Choose <b>HE-AAC v2</b> and <b>48</b> kbit/s. Moser’s table puts the AAC core at 0–8.3 kHz and SBR at 8.3–16.9 kHz.</p>`, check:()=>D.mode==='v2'&&D.br===48, hint:'Press “HE-AAC v2” then “48”.' },
  { title:'2 · Squeeze to 24 kbit/s', body:`<p>Press <b>24</b>. The core shrinks to ≈ 5.5 kHz and the verdict turns amber: Fraunhofer said 24 kbit/s “will have audio artifacts in speech”.</p>`, check:()=>D.br===24, hint:'Press “24”.' },
  { title:'3 · Listen like the engineers did', body:`<p>Fraunhofer suggested a Winamp HE-AAC v2 encode. Click <b>Tchaikovsky</b> on the listening bench: the file sizes show every test file was made at about 24–25 kbit/s.</p>`, check:()=>D.track===5, hint:'Click “Tchaikovsky” in the bench table.' },
  { title:'4 · The satellite threshold', body:`<p>Press <b>32</b>. At ≥ 30 kbit/s Fraunhofer’s satellite customers get good quality. Note that Parametric Stereo is still worth using below ~36 kbit/s.</p>`, check:()=>D.br>=30&&D.br<=36, hint:'Press “32”.' },
  { title:'5 · Try it on the SHARC', body:`<p>Choose the <b>ADSP-21362</b>. Move the code-size slider: with 3 Mbit of SRAM shared by code, tables and buffers there is little room, and the 4 Mbit ROM can only be masked at the factory (the FAQ downloaded the next day).</p>`, check:()=>D.plat==='sharc', hint:'Press “ADI SHARC ADSP-21362”.' },
  { title:'6 · The suggested way out', body:`<p>Choose <b>TI C64x</b>, which Fraunhofer said most broadcast encoders use. The register never moved past “?”, and no WBS encoder followed; see <b>Findings</b>.</p>`, check:()=>D.plat==='c64', hint:'Press “TI C64x DSP”.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — sizing an HE-AAC v2 encoder', panelTitle:'Encoder model', reset,
  panel(el){ el.innerHTML = spectrumSVG()+ctlHTML()+`<div style="margin-top:8px">${memHTML()}</div><details style="margin-top:6px"><summary class="small">Listening bench</summary>${benchHTML()}</details>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('Events in one second', `<div id="ev"></div>`)}<div class="grid2">${card('Frame at the playhead', `<div id="fr"></div>`)}${card('RTP payload at the playhead (A/153 mpeg4-generic, AAC-hbr)', `<div id="rtp"></div>`)}</div>`;
  const draw=()=>{ const M=model(), f=frameAt(SIM.t);
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','period','note'],[
      ['PCM sample pairs', M.fs.toLocaleString(), SIM.fmtDur(1/M.fs), 'AES3 input frames'],
      M.sbr? ['QMF time slots', (M.fs/64).toFixed(0), SIM.fmtDur(64/M.fs), '64-band analysis; 32 slots per frame'] : ['—','','',''],
      ['Encoder frames / access units', (1/M.Tf).toFixed(3), SIM.fmtDur(M.Tf), `${M.N} output samples (core ${M.N/(M.sbr?2:1)} at ${M.coreFs} Hz)`],
      ['Bits per AU (mean)', Math.round(M.bitsF).toLocaleString(), '', `${D.br} kbit/s`],
      ['TS packets for this PID', (D.br*1000/(184*8)).toFixed(1), SIM.fmtDur(184*8/(D.br*1000)), 'ASI 270 Mb/s (27 Mbyte/s after 8b/10b) carries ≈ 143,600 packets/s; audio uses ≈ 0.01 % '+inf],
    ].map(r=>r.map((c,i)=>i===1||i===2?`<span class="mono">${c}</span>`:c)));
    m.querySelector('#fr').innerHTML = kv([['Frame number',f.k,1],['Samples',`${(f.k*M.N).toLocaleString()} … ${((f.k+1)*M.N-1).toLocaleString()}`,1],['Phase in frame',(f.ph*100).toFixed(1)+' %',1],['AU size',f.au+' bytes '+inf,1],['Core / SBR / PS',`${M.coreK.toFixed(1)} / ${M.sbrK} / ${M.psK} kbit/s`],['Audio bandwidth',`${Math.round(M.bw)} Hz`]]);
    const auh=(f.au<<3)|0, b=[0x00,0x10,(auh>>8)&0xFF,auh&0xFF];
    m.querySelector('#rtp').innerHTML = `<p class="small">AU-headers-length = 16 bits; AU-header = AU-size (13 b) = ${f.au} + AU-Index (3 b) = 0. Then the ${f.au}-byte access unit.</p>`+hexDump(b.concat([0x21,0x1B,0x94,0xA7,0x32,0x10,0x5C,0xE0]),{2:'var(--accent)',3:'var(--accent)'})+`<p class="small muted">Payload bytes after the header are placeholders ${inf}. sizeLength=13; indexLength=3; constantDuration=2048 (A/153 Part 8 SDP).</p>`;
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    in:{x:20,y:30,w:150,h:70,t:'AES3 / SDI audio',s:['48 kHz PCM pair'],d:'The input a WBS card would take (de-embedded SDI audio or AES3). 2048 samples are gathered per HE-AAC frame.'},
    qmf:{x:200,y:30,w:160,h:70,t:'QMF analysis',s:['64 bands × 32 slots'],d:'SBR and PS work in a 64-band QMF domain (Moser, “Spectral Band Replication”).', live:()=>model().sbr},
    ps:{x:390,y:30,w:160,h:70,t:'PS encoder',s:['IID / ICC / IPD','2–3 kbit/s'],d:'Parametric Stereo extracts stereo parameters and downmixes to mono; used below ~36 kbit/s.', live:()=>model().ps},
    sbr:{x:390,y:130,w:160,h:70,t:'SBR encoder',s:['envelope above crossover','1–3 kbit/s per ch'],d:'Codes the spectral envelope of the upper band; the decoder rebuilds it from the core.', live:()=>model().sbr},
    ds:{x:200,y:130,w:160,h:70,t:'Down-sample ÷2',s:['core at fs/2'],d:'The AAC core runs at half the output rate (24 kHz for 48 kHz audio).', live:()=>model().sbr},
    aac:{x:200,y:230,w:160,h:80,t:'AAC core',s:['MDCT 1024','psychoacoustics','quantise + Huffman'],d:'AAC-LC: transparent at ~128 kbit/s (Moser); degrades below without SBR.'},
    mux:{x:390,y:230,w:160,h:80,t:'AU / RTP / TS mux',s:['AudioSpecificConfig','RTP (A/153) or TS'],d:'ATSC M/H carries HE AAC v2 over RTP (mpeg4-generic). The register also asks for ASI ↔ SDI.'},
    asi:{x:580,y:230,w:160,h:80,t:'ASI out',s:['270 Mb/s','188-byte TS packets'],d:'Not covered by any file in RD39; DVB-ASI facts are '+'inferred.'},
    dsp:{x:580,y:30,w:160,h:110,t:'Processor',s:['SHARC 21362?','ARM9? TI C64x?'],d:'The open question of the 16 Jan 2012 call. Fraunhofer: SHARC lacks executable memory.'},
  };
  blockView(m,B,[['in','qmf',''],['qmf','ps',''],['qmf','sbr',''],['in','ds',''],['ds','aac',''],['sbr','mux',''],['ps','mux',''],['aac','mux',''],['mux','asi',''],['dsp','mux','runs']],{start:'aac',h:340,side:'<p>HE-AAC v2 = AAC core at half rate + SBR for the top octave + PS for the stereo image. RD39 asked which processor could run all three in real time.</p>'});
}
const SHEETS=[
  { name:'1 · ADSP-21362 (candidate DSP)', note:'Pin groups from the ADSP-2136x datasheet pin list (DAI_P20–1, SPI, BOOT_CFG1–0, AD15–0, FLAG3–0). Memory sizes from the feature table.', svg:()=>
    chip(140,60,220,'ADSP-21362 SHARC',[['DAI_P1–4','AES/I²S in (SPORT via SRU)'],['DAI_P5–8','I²S out'],['SPICLK/MOSI/MISO','host / boot flash'],['BOOT_CFG1–0','SPI master boot'],['CLKIN, XTAL','crystal'],['RESET','']],[['AD15–0','parallel port'],['FLAG3–0','status'],['EMU, TCK…','JTAG']],'333 MHz · 3 Mbit SRAM · 4 Mbit ROM') +
    `<rect x="520" y="70" width="280" height="150" fill="none" stroke="var(--ink)"/><text x="530" y="90" font-size="12" fill="var(--ink)" font-weight="700">On-chip memory</text>
     <rect x="530" y="100" width="${3/7*250}" height="28" fill="var(--accent2)" opacity=".5"/><text x="534" y="119" font-size="11" fill="var(--ink)">SRAM 3 Mbit = 384 KB</text>
     <rect x="530" y="136" width="${4/7*250}" height="28" fill="var(--warn)" opacity=".5"/><text x="534" y="155" font-size="11" fill="var(--ink)">ROM 4 Mbit = 512 KB (mask only)</text>
     <text x="530" y="190" font-size="10.5" fill="var(--ink2)">DOC-1292: ROM “only programmable during production”</text>` },
  { name:'2 · Encoder card concept', note:'No schematic exists for RD39. This sheet shows the chain the register line implies (SDI/AES in → encoder → ASI out). Everything on it is inferred.', svg:()=>
    chip(90,80,160,'SDI receiver',[['SDI_IN','270 Mb/s']],[['AUD_DATA','de-embedded AES']],'inferred') + chip(380,80,170,'Encoder DSP',[['I2S_IN','PCM 48 kHz'],['SPI','config']],[['AU_OUT','HE-AAC AUs'],['TS_CLK','']],'C64x / ARM9 (inferred)') + chip(660,80,140,'ASI transmitter',[['TS_DATA','188-byte packets']],[['ASI_OUT','270 Mb/s']],'inferred') },
  { name:'3 · AudioSpecificConfig', note:'Bit fields of the config string, as signalled in the ATSC A/153 Part 8 SDP example (config=EB098800 for HE AAC v2 at 48 kHz). Change the codec mode in the Simulator to redraw.', svg:()=>{ const a=asc(); let s='', x=40;
    a.fields.forEach(([n,v,b],i)=>{ const w=b*24; s+=`<rect x="${x}" y="120" width="${w}" height="40" fill="${i%2?'var(--panel2)':'color-mix(in srgb,var(--accent) 14%,var(--panel2))'}" stroke="var(--ink)"/><text x="${x+w/2}" y="145" text-anchor="middle" font-size="12" font-family="var(--mono)" fill="var(--ink)">${v.toString(2).padStart(b,'0')}</text><text x="${x+3}" y="${i%2?185:108}" font-size="10" fill="var(--accent2)">${n} = ${v}</text>`; x+=w; });
    return s+`<text x="40" y="240" font-size="14" font-family="var(--mono)" fill="var(--ink)">config = ${a.hex}</text>`; } },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the ADSP-2136x datasheet, A/153 Part 8 and RD39 notes', 'RD39 holds no CAD. The DSP sheet is redrawn from the datasheet; the card is a concept.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Per-frame encoder loop (step at the playhead)', `<div id="fl"></div>`)}<div>${card('AudioSpecificConfig (live)', `<div id="asc"></div>`)}${card('SDP that announces it (A/153 Part 8 pattern)', `<div id="sdp" class="log"></div>`)}</div></div>`;
  const draw=()=>{ const M=model(), f=frameAt(SIM.t);
    const st=[`read ${M.N} PCM samples × 2 ch`, M.sbr?'QMF analysis: 64 bands × 32 slots':'(no QMF in AAC-LC)', M.ps?'PS: IID/ICC/IPD, stereo → mono':'(no PS)', M.sbr?'SBR: envelope + noise floor above crossover':'(no SBR)', M.sbr?'decimate ÷2 → core input':'(core at full rate)', 'AAC: MDCT 1024, psychoacoustic model', 'rate loop: quantise + Huffman into the bit reservoir', 'raw_data_block + SBR/PS fill element → AU', 'RTP: AU-header (size 13 b, index 3 b) + AU'];
    const on=Math.min(st.length-1, Math.floor(f.ph*st.length));
    m.querySelector('#fl').innerHTML = flowSVG(st,on)+`<p class="small muted">The step split per frame is even for display; real cycle counts are unknown ${inf}.</p>`;
    const a=asc(); m.querySelector('#asc').innerHTML = tbl(['field','bits','value'], a.fields.map(([n,v,b])=>[n,`<span class="mono">${v.toString(2).padStart(b,'0')}</span>`,v]))+`<p class="mono">config=${a.hex}</p>`;
    m.querySelector('#sdp').innerHTML = [`m=audio 5000 RTP/AVP 37`,`a=rtpmap:37 mpeg4-generic/${M.fs}/2`,`a=fmtp:37 streamType=5; profile-level-id=${D.mode==='lc'?'(n/a)':'48'}; mode=AAC-hbr; config=${a.hex}; sizeLength=13; indexLength=3; indexDeltaLength=3; constantDuration=${M.N}`].map(s=>`<div>${s}</div>`).join('');
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  const mean=TRACKS.reduce((a,T)=>a+T.kbps,0)/TRACKS.length, m4a=TRACKS.filter(T=>T.box==='m4a'), aac=TRACKS.filter(T=>T.box==='aac');
  m.innerHTML = card('What RD39 decided, and what became of it', `<ol>
    <li><b>Decision: the SHARC platform was ruled out for HE-AAC.</b> Notes.docx (16 Jan 2012|45): “Sharc DSP does not have enough executable memory.” The next day someone saved Analog Devices FAQ DOC-1292: the 2136x ROM can only be written in production, with a minimum order. So the 4 Mbit ROM could not hold the encoder either.</li>
    <li><b>What became of it: nothing shipped.</b> The register still shows RD39 “?”. There is no encoder code or schematic in the archive. RD40 (Dolby Digital Plus) next to it is an empty folder. Ward-Beck’s SHARC products (M6205 with an ADSP-21262; AMS monitors) stayed decoders and meters.</li>
    <li><b>The test files sit exactly at Fraunhofer’s warning rate.</b> All ${TRACKS.length} HE-AAC files work out at ${Math.min(...TRACKS.map(T=>T.kbps)).toFixed(1)}–${Math.max(...TRACKS.map(T=>T.kbps)).toFixed(1)} kbit/s (mean ${mean.toFixed(2)}). The .m4a files average ${(m4a.reduce((a,T)=>a+T.kbps,0)/m4a.length).toFixed(2)} and the raw .aac files ${(aac.reduce((a,T)=>a+T.kbps,0)/aac.length).toFixed(2)} kbit/s, so the encoder was set to 24 kbit/s and the MP4 box adds ≈ 0.8 kbit/s ${inf}. Fraunhofer had said 24 kbit/s “will have audio artifacts in speech”. No encode was made at the 30 kbit/s they recommended.</li>
    <li><b>Five of the test sources are already lossy.</b> 00006, 00010, 10002, 10004 and 10012 are 128 kbit/s MP3s. Re-coding them tests MP3 + HE-AAC in tandem, not HE-AAC alone. The Instrumental Gold set comes from 1411 kbit/s WAVs and is the clean test.</li>
    <li><b>The folder answers half the register line.</b> The register says “Mpeg Encoding / ASI to SDI and vice versa”. Nothing in RD39 covers ASI or SDI. The ATSC A/153 set is the mobile DTV (M/H) standard, which carries HE AAC v2 over RTP/IP, not over ASI.</li>
    <li><b>A/153’s config string is explicit hierarchical signalling.</b> config=EB098800 decodes to AOT 29 (PS), 24 kHz core, 1 core channel, 48 kHz extension, AOT 2 core. The Software tab rebuilds it bit by bit.</li>
    <li><b>The README is slightly out.</b> It says the Notes recommended “≥30 kbit/s for good quality”; the note says satellite customers use a minimum of 30 kbit/s. It lists WAVs; they exist only for the Instrumental Gold set. <span class="mono">ISO_14496-3_Audio-Amd2 (1).pdf</span> is a browser re-download name.</li>
    <li><b>USAC.</b> Fraunhofer expected USAC within 1–2 years at good quality at 12 kbit/s, replacing HE-AAC v2. Nothing later in the archive picks this up.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Crossover between Moser’s 20/32/48 kbit/s points is interpolated; outside them it is extrapolated ${inf}.</li><li>SBR and PS side data use the middle of the ranges Moser gives (2 kbit/s per channel, 2.5 kbit/s).</li><li>Encoder code size and buffer sizes are not in the archive ${inf}; the slider lets you test the SHARC verdict against them.</li><li>ASI packet rates (270 Mb/s, 188-byte packets) are general DVB knowledge ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD39-MPEG-HEAAC/Notes.docx · trev_305-moser.pdf · ATSC/a_153-Part-8-2009.pdf · DSP/ADSP-21362_….pdf · DSP/DOC-1292….pdf</li><li>RD39-MPEG-HEAAC/Sample Audio/Winamp-Converted/*.md (sizes, durations)</li><li>R&amp;D_List.xls (RD39, RD40) · #OPENGEAR #SERIES (M6205 ADSP-21262)</li></ul>`);
}

SIM.register({
  id:'rd39-mpeg-heaac', name:'RD39 MPEG / HE-AAC · encoder sizing model (2012|45)', duration:1,
  product:'RD39 MPEG / HE-AAC', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD39-MPEG-HEAAC',
  summary:'The January 2012 study of an HE-AAC v2 encoder, as a working model. Set the bitrate and codec mode to see the AAC/SBR/PS split, frame timing and config string, and check the SHARC memory problem that ended the idea.',
  highlights:['AAC / SBR / PS band split from the EBU paper','Bitrates of all 23 listening-test files','SHARC memory check vs Fraunhofer’s advice','A/153 AudioSpecificConfig rebuilt bit by bit','RTP and TS packet timing'],
  depth:'Hardware model',
  stepUnits:[{label:'1 HE-AAC frame',period:()=>model().Tf},{label:'1 QMF slot',period:()=>64/model().fs},{label:'1 ms',period:()=>0.001}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.1,'100 ms'],[0.02,'20 ms'],[0.003,'3 ms']],
  defaultZoom:1,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: sizing the encoder', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
