/* =====================================================================
   RD45 — Dolby Digital (AC-3) research (Ward-Beck R&D register, status "?")
   Register text: "Dolby D AC3 Research".
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources:
   - RD45-DolbyD_AC3/tech3285s6.pdf — EBU Tech 3285 Supplement 6, the <dbmd> Dolby metadata chunk
       (Table 1 chunk structure, Table 2 segment ids, Table 3 segment, checksum pseudo-code, Table 4
       Dolby E payload, Table 5 programme configs, Table 6 frame rates, Table 7 timecode bytes,
       Table 8 Dolby Digital payload, Tables 9-14 bsmod/acmod/datarate/cmixlev/surmixlev/dsurmod,
       dialnorm text and its 25 → -6 dB example)
   - ../RD - a_52-2010.pdf (ATSC A/52, loose in the RD folder): syncword 0x0B77, 1536 samples per
       sync frame, six audio blocks, 384 kb/s example
   - RD50-ImproveSpeakerDesign/145_DM100_02.Manual.pdf — a Dolby bitstream analyser manual (misfiled)
   - #OPENGEAR #SERIES/D6207A (Dolby E/AC-3 decoder card, CAT552 module, non_audio_detector),
     POD31 (de-embedder with Dolby decode option), RD72 (CAT1100), RD26 (metadata in VANC)
   No Dolby artwork or logos are reproduced; the decoder is drawn as a plain block.
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

/* ================= product model (EBU Tech 3285 s6 + ATSC A/52) ================= */
const DR = [32,40,48,56,64,80,96,112,128,160,192,224,256,320,384,448,512,576,640];      // Table 11
const ACMOD = [['000','reserved',''],['001','1/0','C'],['010','2/0','L, R'],['011','3/0','L, C, R'],['100','2/1','L, R, S'],['101','3/1','L, C, R, S'],['110','2/2','L, R, Ls, Rs'],['111','3/2','L, C, R, Ls, Rs']];
const BSMOD = ['complete main (CM)','music and effects (ME)','visually impaired (VI)','hearing impaired (HI)','dialogue (D)','commentary (C)','emergency (E)','voice over (VO) / karaoke'];
const CMIX = [[0.707,'-3.0 dB'],[0.595,'-4.5 dB'],[0.5,'-6.0 dB'],[0.595,'reserved → -4.5 dB']];
const SMIX = [[0.707,'-3.0 dB'],[0.5,'-6.0 dB'],[0,'0 (off)'],[0.5,'reserved → -6 dB']];
const DSUR = ['not indicated','NOT Dolby Surround encoded','Dolby Surround encoded','reserved'];
const PCFG = ['5.1 + 2','5.1 + 1 + 1','4 + 4','4 + 2 + 2','4 + 2 + 1 + 1','4 + 1 + 1 + 1 + 1','2 + 2 + 2 + 2','2 + 2 + 2 + 1 + 1','2 + 2 + 1 + 1 + 1 + 1','2 + 1 + 1 + 1 + 1 + 1 + 1','1 × 8','5.1','4 + 2','4 + 1 + 1','2 + 2 + 2','2 + 2 + 1 + 1','2 + 1 + 1 + 1 + 1','1 × 6','4','2 + 2','2 + 1 + 1','1 + 1 + 1 + 1','7.1'];
const FRC = [null,[24000/1001,'23.98'],[24,'24'],[25,'25'],[30000/1001,'29.97'],[30,'30']];

const D0 = { acmod:7, lfeon:1, bsmod:0, dr:14, dialnorm:27, cmix:0, smix:0, dsur:0, langcode:0, copyright:1, origbs:1, pid:31, desc:'WBS RD45 test programme', withE:false, pcfg:0, frc:4, dialog:-24, scene:'match' };
const D = Object.assign({}, D0);
function reset(){ Object.assign(D, D0); LOG.items=[]; SIM.refresh(); }

const ascii = s => [...s].map(c=>c.charCodeAt(0)&0x7F);
function le(v,n){ const b=[]; for (let i=0;i<n;i++) b.push((v>>>(8*i))&0xFF); return b; }
function checksum(size, payload){ let c = size & 0xFF; for (const d of payload) c = (c + d) & 0xFF; return ((~c) + 1) & 0xFF; }
const bcd = v => ((Math.floor(v/10))<<4) | (v%10);
function timecode(t){ const fr=FRC[D.frc][0], n=Math.round(fr), f=Math.floor(t*fr); const tc=[1, 0, 0, f % n];
  const b=new Array(8).fill(0); b[1]=bcd(tc[0])&0x3F; b[3]=bcd(tc[1])&0x7F; b[5]=bcd(tc[2])&0x7F; b[7]=(D.frc===4?0x40:0)|(bcd(tc[3])&0x3F); return { b, s:`01:00:00:${String(tc[3]).padStart(2,'0')}${D.frc===4?' (DF)':''}` }; }
function ddPayload(){
  const p=[];
  p.push(D.pid & 0x1F);
  p.push((D.lfeon<<6)|(D.bsmod<<3)|D.acmod);
  p.push(D.dr & 0x1F);
  p.push(0);
  p.push((D.cmix<<4)|(D.smix<<2)|D.dsur);
  p.push((D.langcode<<7)|(D.copyright<<6)|(D.origbs<<5)|(D.dialnorm&0x1F));
  p.push(0);                       // ac3_langcod
  p.push(0);                       // audio_prod_info (prodie = 0)
  p.push(0,0,0);                   // ext_bsi1_word1, ext_bsi1_word2, ext_bsi2_word1 (not set)
  p.push(0,0,0);                   // reserved × 3
  p.push(0,0);                     // ac3_compr1, ac3_dynrng1 (profiles not modelled)
  for (let i=0;i<21;i++) p.push(0);
  const t=ascii(D.desc.slice(0,32)); while (t.length<32) t.push(0); p.push(...t);
  return p;                        // 69 bytes (Table 8)
}
function ePayload(t){ const p=[D.pcfg&0x3F, D.frc, 0,0, ...timecode(t).b, 0]; for (let i=0;i<25+80;i++) p.push(0); return p; }   // 118 bytes (Table 4)
function build(t){
  const segs=[]; let body=[]; const marks={};
  const addSeg=(id,payload,name)=>{ const start=12+body.length; const ck=checksum(payload.length,payload);
    segs.push({id,name,size:payload.length,ck,start}); body.push(id, ...le(payload.length,2), ...payload, ck); };
  if (D.withE) addSeg(1, ePayload(t), 'Dolby E');
  addSeg(3, ddPayload(), 'Dolby Digital');
  body.push(0);                                   // metadata_segment_id 0 ends the chunk
  const size = 4 + body.length; const pad = size%2 ? [0] : [];
  const bytes=[...ascii('dbmd'), ...le(size + pad.length,4), ...le(0x01000006,4), ...body, ...pad];
  for (let i=0;i<4;i++) marks[i]='var(--accent2)';
  segs.forEach(s=>{ marks[s.start]='var(--warn)'; marks[s.start+1]=marks[s.start+2]='var(--ink2)'; marks[s.start+3+s.size]='var(--bad)';
    if (s.id===3){ marks[s.start+3+1]='var(--accent)'; marks[s.start+3+2]='var(--accent)'; marks[s.start+3+5]='var(--accent)'; } });
  return { bytes, segs, size, pad:pad.length, marks };
}
function ac3(){
  const kbps=DR[D.dr], fbytes=kbps*1000*0.032/8, nch=ACMOD[D.acmod][2].split(',').filter(Boolean).length+(D.lfeon?1:0);
  const atten = 31 - D.dialnorm;                         // line-mode: dialogue reproduced at -31 dBFS
  const out = D.dialog - atten;                          // where the actual dialogue ends up
  const C=CMIX[D.cmix][0], S=SMIX[D.smix][0];
  return { kbps, fbytes, words:fbytes/2, nch, atten, out, err: out + 31, C, S, fps:48000/1536 };
}
const A = {
  set(k, v, label){ act(label, tr=>{ D[k]=v; const a=ac3(), b=build(SIM.t);
    if (k==='acmod'||k==='lfeon') tr(`program_info = 0x${hex2((D.lfeon<<6)|(D.bsmod<<3)|D.acmod)} — lfeon ${D.lfeon}, bsmod ${D.bsmod}, acmod ${ACMOD[D.acmod][0]} (${ACMOD[D.acmod][1]}: ${ACMOD[D.acmod][2]||'reserved'}) → ${a.nch} channels`);
    if (k==='dr') tr(`ac3_datarate = ${D.dr} → ${a.kbps} kbit/s; AC-3 sync frame = ${a.kbps} × 32 ms ÷ 8 = ${a.fbytes} bytes (${a.words} 16-bit words)`);
    if (k==='dialnorm'||k==='dialog') tr(`dialnorm ${D.dialnorm}: decoder attenuates ${a.atten} dB (spec: 25 → −6 dB). Dialogue actually at ${D.dialog} dBFS → reproduced at ${a.out} dBFS (${a.err>=0?'+':''}${a.err} dB off the −31 target)`);
    if (k==='cmix'||k==='smix') tr(`downmix Lo = L + ${a.C}·C + ${a.S}·Ls (cmixlev ${CMIX[D.cmix][1]}, surmixlev ${SMIX[D.smix][1]})`);
    if (k==='withE') tr(D.withE? 'Dolby E segment (id 1, 118-byte payload) added before the Dolby Digital segment; program_config '+PCFG[D.pcfg] : 'Dolby E segment removed');
    if (k==='bsmod') tr(`bsmod ${D.bsmod} = ${BSMOD[D.bsmod]}`);
    b.segs.forEach(s=>tr(`segment id ${s.id} (${s.name}) size ${s.size} → checksum 0x${hex2(s.ck)}`));
    tr(`chunk_size = ${b.size} (0x${b.size.toString(16)}), ${b.bytes.length} bytes on disk${b.pad?' incl. 1 pad byte':''}`); }); },
};

/* ---------------- views ---------------- */
function fileHTML(){
  const b=build(SIM.t), a=ac3();
  return `<div class="small" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px"><span><span style="color:var(--accent2)">■</span> chunk id</span><span><span style="color:var(--warn)">■</span> segment id</span><span><span style="color:var(--accent)">■</span> program_info / datarate / dialnorm</span><span><span style="color:var(--bad)">■</span> checksum</span></div>`+hexDump(b.bytes, b.marks)+
    `<p class="small muted">RIFF/BWF file: … &lt;fmt &gt; &lt;bext&gt; <b>&lt;dbmd&gt;</b> &lt;data&gt; … — the dbmd chunk travels with the PCM so an encoder downstream can pick up the metadata.</p>`;
}
function sel(k, opts, label){ return `<label class="small">${label} <select data-k="${k}">${opts.map((o,i)=>`<option value="${o[0]}" ${String(D[k])===String(o[0])?'selected':''}>${o[1]}</option>`).join('')}</select></label>`; }
function ctlHTML(){
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px">
    ${sel('acmod', ACMOD.map((r,i)=>[i,`${r[0]} · ${r[1]} ${r[2]}`]).slice(1), 'acmod')}
    ${sel('lfeon', [[0,'off'],[1,'on']], 'LFE')}
    ${sel('bsmod', BSMOD.map((r,i)=>[i,`${i} · ${r}`]), 'bsmod')}
    ${sel('dr', DR.map((r,i)=>[i,`${i} · ${r} kbit/s`]), 'ac3_datarate')}
    ${sel('cmix', CMIX.slice(0,3).map((r,i)=>[i,r[1]]), 'cmixlev')}
    ${sel('smix', SMIX.slice(0,3).map((r,i)=>[i,r[1]]), 'surmixlev')}
    ${sel('dsur', DSUR.map((r,i)=>[i,r]), 'dsurmod')}
    ${sel('withE', [[false,'Dolby Digital segment only'],[true,'+ Dolby E segment']], 'segments')}
    ${D.withE? sel('pcfg', PCFG.map((r,i)=>[i,`${i} · ${r}`]), 'program_config') + sel('frc', [1,2,3,4,5].map(i=>[i,FRC[i][1]+' Hz']), 'frame_rate_code') : ''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;align-items:center">
     <label class="small">dialnorm <input type="range" min="1" max="31" value="${D.dialnorm}" data-r="dialnorm"> <b class="mono">${D.dialnorm}</b></label>
     <label class="small">actual dialogue level <input type="range" min="-40" max="-10" value="${D.dialog}" data-r="dialog"> <b class="mono">${D.dialog} dBFS</b></label></div>`;
}
function bindAll(root){
  root.querySelectorAll('select[data-k]').forEach(s=> s.onchange=()=>{ const k=s.dataset.k; let v=s.value; v = v==='true'?true: v==='false'?false: +v; A.set(k, v, `${k} → ${s.options[s.selectedIndex].text}`); });
  root.querySelectorAll('input[data-r]').forEach(r=> r.onchange=()=>{ const k=r.dataset.r; A.set(k, +r.value, `${k} → ${r.value}`); });
}
function decoderSVG(){
  const a=ac3(), W=640, H=210; const chans=(ACMOD[D.acmod][2]||'').split(',').map(s=>s.trim()).filter(Boolean).concat(D.lfeon?['LFE']:[]);
  const lvl = v => clamp((v+60)/60,0,1);
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;border-radius:8px;background:var(--dev)" role="img" aria-label="Decoder output meters (generic, not a real product panel)">
    <text x="14" y="22" font-size="13" fill="#cfd3d6" font-weight="700">AC-3 decoder output (line mode) — generic block (inferred)</text>`;
  chans.forEach((c,i)=>{ const x=20+i*52, base = c==='LFE'? a.out-10 : c==='C'? a.out : a.out-4, h=150*lvl(base);
    s+=`<rect x="${x}" y="40" width="30" height="150" fill="#101213" stroke="#333"/><rect x="${x}" y="${190-h}" width="30" height="${h}" fill="${base>-20?'#ffb43a':'#7dff6a'}"/><text x="${x+15}" y="204" font-size="11" text-anchor="middle" fill="#cfd3d6">${c}</text>`; });
  const y31=190-150*lvl(-31); s+=`<line x1="14" y1="${y31}" x2="${20+chans.length*52}" y2="${y31}" stroke="#ff5a4a" stroke-dasharray="4 3"/><text x="${24+chans.length*52}" y="${y31+4}" font-size="11" fill="#ff8a7a">−31 dBFS target</text>`;
  s+=`<g transform="translate(${W-230},40)"><text x="0" y="12" font-size="11.5" fill="#cfd3d6">dialnorm ${D.dialnorm} → −${a.atten} dB</text><text x="0" y="30" font-size="11.5" fill="#cfd3d6">dialogue in ${D.dialog} → out ${a.out} dBFS</text>
    <text x="0" y="48" font-size="11.5" fill="${Math.abs(a.err)>2?'#ff8a7a':'#7dff6a'}">${Math.abs(a.err)<=2?'matched to other programmes':'mismatch: '+(a.err>0?'+':'')+a.err+' dB vs others'}</text>
    <text x="0" y="74" font-size="11.5" fill="#cfd3d6">${a.kbps} kbit/s · ${a.fbytes} B / 32 ms frame</text><text x="0" y="92" font-size="11.5" fill="#cfd3d6">bsmod ${D.bsmod}: ${BSMOD[D.bsmod]}</text>
    <text x="0" y="110" font-size="11.5" fill="#cfd3d6">Lo = L + ${a.C}·C + ${a.S}·Ls</text></g></svg>`;
  return s;
}
function lanes(){
  const a=ac3(), css=SIM.css, Tf=1536/48000, fr=FRC[D.frc][0];
  return [
    {label:'PCM 48 kHz (per channel)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,0,1/96000,css('--ink2'),'samples'); }},
    {label:'AC-3 audio blocks (256 samples)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,256/48000,0,250/48000,css('--accent2'),'blocks'); }},
    {label:`AC-3 sync frames (${a.fbytes} B)`, h:28, draw(c,X,t0,t1,y,h){ const k0=Math.floor(t0/Tf), k1=Math.ceil(t1/Tf);
      if (k1-k0>200){ SIM.pulses(c,X,t0,t1,y,h,Tf,0,Tf*0.95,css('--accent'),'sync frames'); return; }
      for (let k=k0;k<k1;k++) bandAt(c,X,k*Tf,(k+0.98)*Tf,y,h,k%2?css('--accent'):css('--accent2'),.7,'0x0B77 · frame '+k); }},
    {label:`AES3 burst (SMPTE 337, ${inf.replace(/<[^>]+>/g,'')})`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,Tf,0,(a.words+4)/48000,css('--warn'),'data bursts'); }},
    {label:`Video frames ${FRC[D.frc][1]} Hz`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/fr,0,0.002,css('--ink'),'frames'); }},
    {label:'Dolby E frame (one per video frame)', h:22, draw(c,X,t0,t1,y,h){ if (!D.withE){ laneText(c,X,t0,y,h,'no Dolby E segment — add one to see the E frame cadence'); return; } SIM.pulses(c,X,t0,t1,y,h,1/fr,1/fr*0.05,1/fr*0.85,css('--bad'),'Dolby E frames'); }},
  ];
}
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('Metadata editor (EBU Tech 3285 s6 fields)', `<div id="ctl"></div>`)}${card('Decoder at the far end', `<div id="dec"></div>`)}</div>
    <div>${card('The &lt;dbmd&gt; chunk, byte by byte', `<div id="file"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('One second of AC-3 on an AES pair', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const c=m.querySelector('#ctl'); if (!c.contains(document.activeElement)){ c.innerHTML=ctlHTML(); bindAll(c); }
    m.querySelector('#dec').innerHTML=decoderSVG(); m.querySelector('#file').innerHTML=fileHTML(); m.querySelector('#trace').innerHTML=traceHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The question RD45 asked', body:`<p>By 2012|45 Ward-Beck already sold Dolby decoding (the D6207A openGear card, the POD31 decoder option). RD45 collected what a product would need to read or write Dolby Digital metadata. The one document in the folder is the EBU spec for the <span class="mono">&lt;dbmd&gt;</span> chunk in Broadcast Wave files.</p>`, check:()=>true, auto:true },
  { title:'1 · A 5.1 programme', body:`<p>Set <b>acmod</b> to <span class="mono">111 · 3/2</span> with <b>LFE on</b>. Watch byte 0x10 of the dump (program_info) become <span class="mono">0x47</span>.</p>`, check:()=>D.acmod===7&&D.lfeon===1, hint:'acmod 111 and LFE on (the defaults).' },
  { title:'2 · Pick the data rate', body:`<p>Set <b>ac3_datarate</b> to <b>14 · 384 kbit/s</b>, the A/52 example rate. Each 32 ms sync frame is then 1536 bytes.</p>`, check:()=>D.dr===14, hint:'Choose 14 · 384 kbit/s.' },
  { title:'3 · Get dialnorm wrong', body:`<p>Leave the dialogue at −24 dBFS and set <b>dialnorm</b> to <b>31</b>. The decoder does not attenuate, so dialogue plays 7 dB louder than the −31 dBFS target.</p>`, check:()=>D.dialnorm===31, hint:'Drag dialnorm to 31.' },
  { title:'4 · Get it right', body:`<p>Set <b>dialnorm 24</b> to match the measured dialogue. The decoder takes off 7 dB and the programme lands on −31 dBFS like every other one. This is the loudness problem behind the CALM Act (FCC 11-84, also in the RD folder) and RD21’s loudness logger.</p>`, check:()=>D.dialnorm===24&&D.dialog===-24, hint:'dialnorm 24, dialogue −24.' },
  { title:'5 · Wrap it for Dolby E', body:`<p>Choose <b>+ Dolby E segment</b>. A 118-byte segment with program_config and SMPTE timecode is added, and both checksums are recomputed. The timeline now shows one Dolby E frame per video frame.</p>`, check:()=>D.withE, hint:'segments → + Dolby E segment.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — writing Dolby Digital metadata', panelTitle:'Editor and decoder', reset,
  panel(el){ if (el.contains(document.activeElement)) return; el.innerHTML = ctlHTML()+`<div style="margin-top:8px">${decoderSVG()}</div><details style="margin-top:6px"><summary class="small">dbmd bytes</summary>${fileHTML()}</details>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('Events in one second', `<div id="ev"></div>`)}<div class="grid2">${card('At the playhead', `<div id="ph"></div>`)}${card('Dolby E timecode in the file (Table 7)', `<div id="tc"></div>`)}</div>`;
  const draw=()=>{ const a=ac3(), Tf=0.032, k=Math.floor(SIM.t/Tf), fr=FRC[D.frc][0];
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','period','note'],[
      ['PCM samples / channel','48,000','20.83 µs',`${a.nch} channels into the encoder`],['AC-3 audio blocks','187.5','5.333 ms','256 new samples each (six per frame, A/52)'],
      ['AC-3 sync frames','31.25','32 ms',`${a.fbytes} bytes each, start with 0x0B77`],['Bytes per second',(a.kbps*125).toLocaleString(),'',`${a.kbps} kbit/s`],
      ['Video frames',fr.toFixed(3),SIM.fmtDur(1/fr),'Dolby E frames follow the video rate (Table 6)'],['AC-3 frames per video frame',(31.25/fr).toFixed(4),'','not an integer: AC-3 frames drift against video']].map(r=>r.map((c,i)=>i===1||i===2?`<span class="mono">${c}</span>`:c)));
    m.querySelector('#ph').innerHTML = kv([['AC-3 frame',k,1],['Audio block',Math.floor(SIM.t/(256/48000))%6+' of 0–5',1],['Sample',Math.floor(SIM.t*48000).toLocaleString(),1],['Video frame',Math.floor(SIM.t*fr),1],['Frame offset vs video',((k*Tf*fr)%1*100).toFixed(1)+' % of a video frame',1]]);
    const tc=timecode(SIM.t); m.querySelector('#tc').innerHTML = `<p>Timecode ${tc.s}</p>`+tbl(['byte','bits 7…0','meaning'], tc.b.map((v,i)=>[i,`<span class="mono">${v.toString(2).padStart(8,'0')}</span>`,['bits 63–52','H20 H10 H8 H4 H2 H1','bits 47–36','M40…M1','bits 31–20','S40…S1','bits 15–4','DF F20 F10 F8…F1'][i]]));
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    src:{x:20,y:30,w:170,h:70,t:'Programme audio',s:['5.1 PCM, 48 kHz'],d:'Up to 5.1 channels (acmod 3/2 + LFE).'},
    meas:{x:20,y:140,w:170,h:70,t:'Dialogue measurement',s:['→ dialnorm 1–31'],d:'Someone has to measure the dialogue level; RD21 (loudness logging) and the CALM Act PDF sit in the same RD folder.'},
    bwf:{x:240,y:80,w:180,h:80,t:'BWF file + <dbmd>',s:['segment 3: Dolby Digital','segment 1: Dolby E'],d:'EBU Tech 3285 s6: metadata carried beside the PCM in a Broadcast Wave file.'},
    enc:{x:470,y:30,w:160,h:70,t:'AC-3 encoder',s:['1536 samples / 32 ms'],d:'Reads the dbmd fields into the bitstream (bsi: acmod, dialnorm, cmixlev…).'},
    aes:{x:470,y:140,w:160,h:70,t:'AES3 / SDI carriage',s:['data bursts '+'(SMPTE 337)'],d:'Compressed audio rides an AES pair as non-PCM data (the D6207A FPGA has a non_audio_detector for it). Burst framing details are inferred.'},
    dec:{x:680,y:80,w:140,h:90,t:'Decoder',s:['D6207A / POD31','CAT552 module'],d:'Ward-Beck’s decoders used Dolby OEM modules; RD72 looked at the CAT1100.'},
  };
  blockView(m,B,[['src','bwf','PCM'],['meas','bwf','dialnorm'],['bwf','enc','metadata'],['enc','aes','AC-3'],['aes','dec',''],['src','enc','']],{start:'bwf',w:840,h:250,side:'<p>RD45’s document is about keeping Dolby metadata with the audio in a file, so that dialnorm, downmix levels and channel format survive until the encoder.</p>'});
}
const SHEETS=[
  { name:'1 · Chunk (Tables 1–3)', note:'Redrawn from EBU Tech 3285 s6 Tables 1–3. All multi-byte fields are little-endian.', svg:()=>{ const f=[['chunk_id','4','dbmd'],['chunk_size','4','bytes after this field'],['version','4','1.0.0.6 → 0x01000006'],['segment_id','1','1 E · 3 DD · 7 DD+ · 8 info · 0 end'],['segment_size','2','payload bytes'],['payload','n',''],['checksum','1','2’s complement'],['… repeat …','',''],['segment_id = 0','1','end'],['padding','0/1','even size']];
    return f.map((r,i)=>`<rect x="60" y="${30+i*40}" width="${r[1]==='n'?300:r[1]==='4'?220:r[1]==='2'?150:110}" height="30" fill="var(--panel2)" stroke="var(--ink)"/><text x="68" y="${50+i*40}" font-size="12" fill="var(--ink)">${r[0]} (${r[1]})</text><text x="400" y="${50+i*40}" font-size="11" fill="var(--accent2)">${r[2]}</text>`).join(''); } },
  { name:'2 · Dolby Digital payload (Table 8)', note:'69-byte payload. Bit fields per §4.2.1–4.2.7.', svg:()=>{ const p=ddPayload(); const rows=[['0','ac3_program_id','000 + 5 b'],['1','program_info','0 lfeon bsmod[3] acmod[3]'],['2','datarate_info','000 + ac3_datarate[5]'],['3','reserved',''],['4','surround_config','00 cmixlev surmixlev dsurmod'],['5','dialnorm_info','langcode copyrightb origbs dialnorm[5]'],['6','ac3_langcod',''],['7','audio_prod_info','prodie mixlevel roomtyp'],['8–10','ext_bsi words',''],['11–13','reserved',''],['14–15','compr1, dynrng1',''],['16–36','reserved (21)',''],['37–68','description text (32)','ASCII']];
    return rows.map((r,i)=>{ const idx=parseInt(r[0]); return `<text x="40" y="${40+i*31}" font-size="12" font-family="var(--mono)" fill="var(--ink2)">${r[0]}</text><rect x="90" y="${24+i*31}" width="200" height="24" fill="var(--panel2)" stroke="var(--ink)"/><text x="96" y="${40+i*31}" font-size="12" fill="var(--ink)">${r[1]}</text><text x="300" y="${40+i*31}" font-size="11" fill="var(--accent2)">${r[2]}</text>${!isNaN(idx)&&r[0].indexOf('–')<0?`<text x="640" y="${40+i*31}" font-size="12" font-family="var(--mono)" fill="var(--accent)">0x${hex2(p[idx])} = ${p[idx].toString(2).padStart(8,'0')}</text>`:''}`; }).join(''); } },
  { name:'3 · Where it plugs in (WBS)', note:'Ward-Beck decoder chain as documented in the D6207A and POD31 folders; the dbmd path is RD45’s proposal.', svg:()=> chip(80,80,170,'AES / SDI in',[['AES1','non-PCM pair']],[['AUD','to FPGA']],'T6301 / POD31 rear') + chip(360,80,170,'FPGA',[['AUD_IN','']],[['non_audio_detector','flag'],['CAT_DATA','to module']],'EP1C12 (D6207A)') + chip(650,80,160,'Dolby module',[['DATA_IN','']],[['PCM 1–8','decoded'],['META','SPI to AVR']],'CAT552 (OEM)') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'EBU Tech 3285 s6 tables and the D6207A/POD31 folders', 'RD45 has no circuit. The sheets redraw the data structures; sheet 3 places them in the existing WBS decoder chain.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('dbmd reader (Table 1 loop), step at the playhead', `<div id="fl"></div>`)}${card('Checksum (§3.3 pseudo-code), live', `<div id="ck" class="log"></div>`)}</div>${card('Decoded fields', `<div id="fd"></div>`)}`;
  const draw=()=>{ const b=build(SIM.t);
    const st=['read chunk_id = "dbmd", chunk_size, version', 'while(1): read metadata_segment_id', 'id == 0 ? → break', 'read metadata_segment_size (2 bytes, LE)', 'read payload[size]', 'checksum = size; add payload bytes & 0xFF; 2’s complement', 'compare with metadata_segment_checksum', 'dispatch: 1 → Dolby E, 3 → Dolby Digital, 7 → DD+, 8 → info', 'skip padding byte if chunk_size is odd'];
    m.querySelector('#fl').innerHTML = flowSVG(st, Math.floor((SIM.t*31.25)%1*st.length));
    m.querySelector('#ck').innerHTML = b.segs.map(s=>`<div>segment ${s.id}: checksum = ${s.size}; … sum of ${s.size} payload bytes … → ~c + 1 = <b>0x${hex2(s.ck)}</b></div>`).join('')+`<div class="muted">Note: size is a 2-byte field but the pseudo-code starts from it as if it were one byte; for sizes over 255 only the low byte can matter.</div>`;
    m.querySelector('#fd').innerHTML = tbl(['field','value','meaning'],[['acmod',ACMOD[D.acmod][0],ACMOD[D.acmod][1]+' — '+ACMOD[D.acmod][2]],['lfeon',D.lfeon,D.lfeon?'LFE on':'off'],['bsmod',D.bsmod,BSMOD[D.bsmod]],['ac3_datarate',D.dr,DR[D.dr]+' kbit/s'],['cmixlev',D.cmix,CMIX[D.cmix][1]],['surmixlev',D.smix,SMIX[D.smix][1]],['dsurmod',D.dsur,DSUR[D.dsur]],['dialnorm',D.dialnorm,`−${D.dialnorm} dBFS dialogue; attenuate ${31-D.dialnorm} dB`],['copyrightb / origbs',`${D.copyright} / ${D.origbs}`,''],['ac3_program_id',D.pid,D.pid===31?'ignore (not from Dolby E)':'programme '+D.pid],['description',`"${D.desc}"`,'32 bytes']]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD45 decided, and what became of it', `<ol>
    <li><b>Outcome: research only.</b> The register leaves RD45 at “?”. The folder holds one document, saved 8 Feb 2012|45. No WBS product writes or reads <span class="mono">&lt;dbmd&gt;</span> chunks. The Dolby work that shipped is decode-only: the D6207A openGear card and the POD31 decoder option, both built around Dolby OEM modules (CAT552), and RD72’s later CAT1100 study.</li>
    <li><b>The folder covers files, not coding.</b> Tech 3285 s6 is about carrying metadata in Broadcast Wave files. The AC-3 bitstream itself (syncword 0x0B77, 1536 samples, six blocks) is in <span class="mono">RD - a_52-2010.pdf</span>, loose one level up.</li>
    <li><b>A Dolby analyser manual is misfiled in RD50.</b> <span class="mono">RD50-ImproveSpeakerDesign/145_DM100_02.Manual.pdf</span> (DM100 Bitstream Analyzer, saved 20 Aug 2012) belongs with RD45/RD72, not with the speaker study.</li>
    <li><b>Checksum ambiguity in the spec.</b> The pseudo-code starts the checksum with <span class="mono">metadata_segment_size</span>, a 2-byte field, then masks with 0xFF. The Dolby E segment (118) and Dolby Digital segment (69) are both under 256, so the model gives the same answer either way.</li>
    <li><b>Dolby E needs a Dolby Digital segment.</b> §4.1: a Dolby E segment “implies the existence of at least one Dolby Digital metadata segment for each Dolby Digital programme that it contains”. The model always writes segment 3, and writes segment 1 before it when you ask for Dolby E.</li>
    <li><b>dialnorm is the reason this mattered in 2012|45.</b> 25 → −6 dB, 17 → −14 dB (spec). The FCC CALM Act rules (FCC-11-84, loose in the RD folder) and RD21 loudness logging are the same problem. A wrong dialnorm gives a jump of exactly the mismatch in dB, as the decoder panel shows.</li>
    <li><b>Reserved codes.</b> ac3_datarate 19–30 are reserved, 31 means “not specified”; dialnorm 0 is read as 31. The editor offers only the valid codes.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>AES3 carriage as SMPTE 337 data bursts is general knowledge, not in RD45 ${inf}.</li><li>The decoder panel is a generic block, not a drawing of any Dolby or Ward-Beck product ${inf}.</li><li>audio_prod_info, ext_bsi words and the compression profiles are written as zero.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD45-DolbyD_AC3/tech3285s6.pdf · RD - a_52-2010.pdf · RD - FCC-11-84A1.pdf</li><li>RD50-ImproveSpeakerDesign/145_DM100_02.Manual.pdf (misfiled)</li><li>#OPENGEAR #SERIES/D6207A · #POD #SERIES/POD31 · RD72-Cat1100 · RD26 · R&amp;D_List.xls</li></ul>`);
}

SIM.register({
  id:'rd45-dolbyd-ac3', name:'RD45 Dolby Digital (AC-3) · metadata chunk model (2012|45)', duration:1,
  product:'RD45 Dolby Digital AC-3', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD45-DolbyD_AC3',
  summary:'The EBU <dbmd> Dolby metadata chunk as a live editor: set channel format, data rate, downmix and dialnorm, and see the bytes, checksums, AC-3 frame timing and what a decoder does with dialnorm.',
  highlights:['dbmd chunk built byte by byte with checksums','Dolby E segment with live SMPTE timecode','dialnorm → decoder level, mismatch shown in dB','AC-3 sync frames vs video frames on one timeline','Links to the D6207A and POD31 decoders'],
  depth:'Hardware model',
  stepUnits:[{label:'1 AC-3 frame (32 ms)',period:()=>0.032},{label:'1 audio block',period:()=>256/48000},{label:'1 video frame',period:()=>1/FRC[D.frc][0]}],
  zooms:[[1,'1 s'],[0.2,'200 ms'],[0.07,'70 ms'],[0.01,'10 ms']],
  defaultZoom:1,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: metadata', render:viewTutorial},
    {id:'second', label:'One second of AC-3', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
