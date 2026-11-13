/* =====================================================================
   RD26 — Metadata VANC Inserter (Ward-Beck R&D register, Peter/Ali, status "?")
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD26 is a research folder, not a product: nothing was built. This plugin models
   the idea under study — carrying Dolby audio metadata (SMPTE RDD 6 serial frames)
   inside SDI vertical ancillary data (SMPTE 2020) — using the numbers in its documents:
   - RD26 …/Ali/SMPTE/Rdd06-2008.pdf  (115 200 baud 8-N-1 RS-485 serial stream; sync words
       0xCFFC / 0x3FF3 / 0x0A0A; 56-bit sync segment; data_segment_id table 5-6;
       2's-complement segment checksum; program_config table 6-2; frame_rate_code 6-3;
       DD essential payload table 7-21, complete payload table 7-1; subframe timing 4-2)
   - RD26 …/Documents/Application note Using s2020.pdf (Axon AppNote 10-01: Method A and B,
       Dolby E → PCM + s2020 at ingest)
   - RD26 …/Documents/app_FF_VANC_Insertion.pdf (FlipFactory: Method B only, value 3; one stream)
   - RD26 …/Documents/11 - COPPA - Metadata Tutorial.pdf ("Inserted into HDSDI VANC line 9")
   - RD26 …/Documents/Metadata Challenges for Today_s TV Broadcast Systems.pdf (VANC placement
       rule: second line after the switching line to the last line before active video)
   - "RD - Dolby E vs video rates explanation.pdf" (1 Dolby E frame per video frame, 1 per 2 for p59.94)
   - #OPENGEAR #SERIES/M6205 …/m6205c200/M6205c200 switching rules.doc and sharc/v104/backgnd.c
       (the WBS card that already READ VANC metadata: Reg 7 "Vanc Detected / meta data line#",
        refresh_meta_data, meta_bytes_indexing, meta_sort, dial_norm_extract)
   The panel is a concept drawing (no hardware or artwork exists); it is marked inferred.
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
/* ---------------- video formats (lines/samples from SMPTE 274/296/259 practice; switch lines from RP 168) ---------------- */
const FMTS = {
  '1080i': { name:'1080i 59.94', lines:1125, f2:563, spl:2200, act:1920, hanc:268, rate:30000/1001, inter:true,  sw:7,  firstActive:21, frcode:4, deRatio:1, hd:true },
  '1080i50':{ name:'1080i 50',   lines:1125, f2:563, spl:2640, act:1920, hanc:708, rate:25,         inter:true,  sw:7,  firstActive:21, frcode:3, deRatio:1, hd:true },
  '720p':  { name:'720p 59.94',  lines:750,  f2:0,   spl:1650, act:1280, hanc:362, rate:60000/1001, inter:false, sw:7,  firstActive:26, frcode:4, deRatio:2, hd:true },
  'NTSC':  { name:'525i 59.94 (SD)', lines:525, f2:263, spl:1716, act:1440, hanc:268, rate:30000/1001, inter:true, sw:10, firstActive:20, frcode:4, deRatio:1, hd:false },
  'PAL':   { name:'625i 50 (SD)',    lines:625, f2:313, spl:1728, act:1440, hanc:280, rate:25,         inter:true, sw:6,  firstActive:23, frcode:3, deRatio:1, hd:false },
};
/* RDD 6 table 6-2 (program_config → programs) */
const PCFG = [
  [2,8,'5.1 + 2',[6,2]],[3,8,'5.1 + 1 + 1',[6,1,1]],[2,8,'4 + 4',[4,4]],[3,8,'4 + 2 + 2',[4,2,2]],[4,8,'4 + 2 + 1 + 1',[4,2,1,1]],
  [5,8,'4 + 1 + 1 + 1 + 1',[4,1,1,1,1]],[4,8,'2 + 2 + 2 + 2',[2,2,2,2]],[5,8,'2 + 2 + 2 + 1 + 1',[2,2,2,1,1]],[6,8,'2 + 2 + 1 + 1 + 1 + 1',[2,2,1,1,1,1]],
  [7,8,'2 + 1 × 6',[2,1,1,1,1,1,1]],[8,8,'1 × 8',[1,1,1,1,1,1,1,1]],[1,6,'5.1',[6]],[2,6,'4 + 2',[4,2]],[3,6,'4 + 1 + 1',[4,1,1]],
  [3,6,'2 + 2 + 2',[2,2,2]],[4,6,'2 + 2 + 1 + 1',[2,2,1,1]],[5,6,'2 + 1 × 4',[2,1,1,1,1]],[6,6,'1 × 6',[1,1,1,1,1,1]],
  [1,4,'4',[4]],[2,4,'2 + 2',[2,2]],[3,4,'2 + 1 + 1',[2,1,1]],[4,4,'1 × 4',[1,1,1,1]],[1,8,'7.1',[8]],[1,8,'7.1 Screen',[8]],
];
const RATE_KBPS = [32,40,48,56,64,80,96,112,128,160,192,224,256,320,384,448,512,576,640];
const ACMOD = ['1+1','1/0 mono','2/0 stereo','3/0','2/1','3/1','2/2','3/2'];
const SEGNAME = {0:'end of subframe',1:'Dolby E complete',2:'Dolby E essential',3:'DD complete (ext BSI)',4:'DD essential (ext BSI)',5:'DD complete (no ext BSI)',6:'DD essential (no ext BSI)'};
/* RDD 6 table 7-1: Dolby Digital complete program metadata (with extended BSI) — field, bits */
const DD_COMPLETE = [['program_id',5],['ac3_datarate',5],['ac3_bsmod',3],['ac3_acmod',3],['ac3_cmixlev',2],['ac3_surmixlev',2],['ac3_dsurmod',2],['ac3_lfeon',1],['ac3_dialnorm',5],['ac3_langcode',1],['ac3_langcod',8],['ac3_audprodie',1],['ac3_mixlevel',5],['ac3_roomtyp',2],['ac3_copyrightb',1],['ac3_origbs',1],['ac3_xbsi1e',1],['ac3_dmixmod',2],['ac3_ltrtcmixlev',3],['ac3_ltrtsurmixlev',3],['ac3_lorocmixlev',3],['ac3_lorosurmixlev',3],['ac3_xbsi2e',1],['ac3_dsurexmod',2],['ac3_dheadphonmod',2],['ac3_adconvtyp',1],['reserved',8],['reserved',1],['ac3_hpfon',1],['ac3_bwlpfon',1],['ac3_lfelpfon',1],['ac3_sur90on',1],['ac3_suratton',1],['ac3_rfpremphon',1],['ac3_compre',1],['ac3_compr1',8],['ac3_dynrnge',1],['ac3_dynrng1',8],['ac3_dynrng2',8],['ac3_dynrng3',8],['ac3_dynrng4',8],['reserved',1]];
/* table 7-21: DD essential */
const DD_ESSENTIAL = [['program_id',5],['ac3_datarate',5],['ac3_bsmod',3],['ac3_acmod',3],['ac3_lfeon',1],['ac3_dialnorm',5],['ac3_compre',1],['ac3_compr2',8],['ac3_dynrnge',1],['ac3_dynrng5',8],['ac3_dynrng6',8],['ac3_dynrng7',8],['ac3_dynrng8',8]];
const BAUD = 115200, BYTE_T = 10/BAUD;           // 1 start + 8 data + 1 stop

/* ---------------- device / study state ---------------- */
function defaultProgs(pc){
  return PCFG[pc][3].map((ch,i)=>({
    acmod: ch>=6 ? 7 : ch===4 ? 6 : ch===2 ? 2 : 1, lfeon: ch>=6 ? 1 : 0,
    datarate: ch>=6 ? 15 : ch>=4 ? 13 : ch===2 ? 10 : 6, dialnorm: i===0 ? 24 : 27, bsmod: 0, compr: 1,
    cmix: 0, surmix: 0, ltrtc: 4, ltrts: 4, loroc: 4, loros: 4, dmixmod: 1 }));
}
const D = {
  fmt:'1080i', line:9, sdid:1, method:'A', source:'dolbyE', pc:0, progs: defaultProgs(0), sel:0,
  origId:0, inserter:true, reader:true, corrupt:false, routerHit:false,
};
function reset(){ Object.assign(D,{fmt:'1080i',line:9,sdid:1,method:'A',source:'dolbyE',pc:0,progs:defaultProgs(0),sel:0,origId:0,inserter:true,reader:true,corrupt:false,routerHit:false}); LOG.items=[]; tutor.i=tutor.i||0; SIM.refresh(); }
const F = ()=>FMTS[D.fmt];
const frameT = ()=> 1/F().rate;
const lineT = ()=> frameT()/F().lines;
const metaFrameT = ()=> frameT()*F().deRatio;      // one metadata (Dolby E) frame
const wordT = ()=> lineT()/F().spl;

/* ---------------- RDD 6 frame builder (bit-exact to the tables) ---------------- */
function BitW(){ const b=[]; let acc=0,n=0; return { put(v,w){ for(let i=w-1;i>=0;i--){ acc=(acc<<1)|((v>>i)&1); n++; if(n===8){ b.push(acc); acc=0; n=0; } } }, bytes(){ if(n){ b.push(acc<<(8-n)); acc=0; n=0; } return b; } }; }
function packFields(list, vals){ const w=BitW(); let bits=0; list.forEach(([k,n])=>{ w.put(vals[k]||0, n); bits+=n; }); return {bytes:w.bytes(), bits}; }
function progVals(p, i, essential){
  return { program_id:i, ac3_datarate:p.datarate, ac3_bsmod:p.bsmod, ac3_acmod:p.acmod, ac3_cmixlev:p.cmix, ac3_surmixlev:p.surmix, ac3_dsurmod:0,
    ac3_lfeon:p.lfeon, ac3_dialnorm:p.dialnorm, ac3_mixlevel:0, ac3_xbsi1e:1, ac3_dmixmod:p.dmixmod, ac3_ltrtcmixlev:p.ltrtc, ac3_ltrtsurmixlev:p.ltrts,
    ac3_lorocmixlev:p.loroc, ac3_lorosurmixlev:p.loros, ac3_xbsi2e:1, ac3_hpfon:1, ac3_bwlpfon:1, ac3_lfelpfon:1, ac3_suratton:0,
    ac3_compre:1, ac3_compr1:p.compr, ac3_compr2:p.compr, ac3_dynrnge:0, ac3_dynrng1:p.compr, ac3_dynrng5:p.compr };
}
function deComplete(){
  const [cnt,ch] = PCFG[D.pc]; const w=BitW(); let bits=0; const put=(v,n)=>{ w.put(v,n); bits+=n; };
  put(D.pc,6); put(F().frcode,4); put(0,12); put(0,32); put(0,32); put(0,8);           // program_config, frame_rate_code, pitch_shift, SMPTE_time_code (64), reserved
  for(let p=0;p<cnt;p++){ put(0x20,8); put(0,2); }                                       // description_text (space) + reserved
  for(let c=0;c<ch;c++){ put(0,4); put(0,1); } for(let c=0;c<ch;c++){ put(0,10); put(0,10); }
  return {bytes:w.bytes(), bits};
}
function deEssential(){ const w=BitW(); w.put(D.pc,6); w.put(F().frcode,4); w.put(0,12); w.put(0,8); return {bytes:w.bytes(), bits:30}; }
function segment(id, payload){
  const size = payload.bytes.length & 0xFF;
  let cs = size; payload.bytes.forEach(b=> cs = (cs + b) & 0xFF); cs = ((~cs) + 1) & 0xFF;   // RDD 6 §5.1.2 pseudo-code
  return { id, size, payload: payload.bytes, bits: payload.bits, cs, bytes:[id, size, ...payload.bytes, cs] };
}
function subframe(n, fc){
  const sync = n===1 ? [0xCF,0xFC] : [0x3F,0xF3];
  const h = BitW(); h.put(0,4); h.put(D.origId,8); h.put(0,16); h.put(fc&0xFFFF,16); h.put(0,12);   // revision_id … reserved = 56 bits = 7 bytes
  const segs = [];
  const progs = PCFG[D.pc][0];
  if (n===1){
    if (D.source==='dolbyE') segs.push(segment(1, deComplete()));
    for (let i=0;i<progs;i++) segs.push(segment(3, packFields(DD_COMPLETE, progVals(D.progs[i], i))));
  } else {
    if (D.source==='dolbyE') segs.push(segment(2, deEssential()));
    for (let i=0;i<progs;i++) segs.push(segment(4, packFields(DD_ESSENTIAL, progVals(D.progs[i], i, true))));
  }
  let bytes = [...sync, ...h.bytes()]; const map = [{k:'sync',a:0,b:2},{k:'header',a:2,b:9}];
  segs.forEach(s=>{ map.push({k:'seg',id:s.id,a:bytes.length,b:bytes.length+s.bytes.length,s}); bytes = bytes.concat(s.bytes); });
  map.push({k:'end',a:bytes.length,b:bytes.length+1}); bytes.push(0x00);
  if (n===2){ map.push({k:'eof',a:bytes.length,b:bytes.length+2}); bytes.push(0x0A,0x0A); }
  if (D.corrupt && n===1 && segs.length){ const s = map.find(x=>x.k==='seg'&&x.id>=3) || map.find(x=>x.k==='seg'); bytes[s.a+2+3] ^= 0x10; }   // flip a payload bit, keep the old checksum
  return { bytes, map, segs };
}
function frameCountAt(t){ return Math.floor(t/metaFrameT()) & 0xFFFF; }
function rddFrame(t){ const fc=frameCountAt(t); return { fc, sf1: subframe(1,fc), sf2: subframe(2,fc) }; }

/* ---------------- SMPTE 291 ANC packet ---------------- */
const par = v=>{ let p=0; for(let i=0;i<8;i++) p^=(v>>i)&1; return p; };
const w10 = v=>{ const b8=par(v&0xFF); return (v&0xFF) | (b8<<8) | ((b8^1)<<9); };
function ancPacket(udwBytes, sdid){
  const did = w10(0x45), sd = w10(sdid), dc = w10(udwBytes.length & 0xFF);
  const udw = udwBytes.map(w10);
  let sum = 0; [did,sd,dc,...udw].forEach(x=> sum = (sum + (x & 0x1FF)) & 0x1FF);
  const cs = sum | ((((sum>>8)&1)^1)<<9);
  return { words:[0x000,0x3FF,0x3FF,did,sd,dc,...udw,cs], n: udw.length };
}
/* packets for the metadata frame at t: Method A = one per field / progressive frame (that subframe), Method B = the whole frame once */
function packetsFor(t){
  const R = rddFrame(t); const out = [];
  const split = (bytes, tag)=>{ for (let i=0;i<bytes.length;i+=255) out.push({ tag:tag+(bytes.length>255?` part ${1+i/255}`:''), pk: ancPacket(bytes.slice(i,i+255), D.sdid) }); };
  if (D.method==='A'){ split(R.sf1.bytes,'subframe 1'); split(R.sf2.bytes,'subframe 2'); }
  else split(R.sf1.bytes.concat(R.sf2.bytes),'whole frame');
  return { R, out };
}
function lineOK(){ const f=F(); return D.line >= f.sw+2 && D.line < f.firstActive; }
function lineIssue(){ const f=F(); if (D.line===f.sw) return 'this is the switching line itself'; if (D.line===f.sw+1) return 'the line after the switching point (reserved; HD audio also skips it)'; if (D.line<f.sw) return 'before the switching line: a router cut lands after it'; if (D.line>=f.firstActive) return 'inside active picture'; return ''; }

/* ---------------- what the WBS M6205C200 reader makes of it (sharc/v104/backgnd.c) ---------------- */
const VOL_DB = i => i<=0 ? -Infinity : Math.min(15, i-61);     // volume[] table: index 1 = −60 dB … 61 = 0 dB … ≥76 = +15 dB
function readerDecode(t){
  const {R} = packetsFor(t);
  const bytes = R.sf1.bytes.concat(new Array(400).fill(0)).slice(0,400);   // meta_data_bytes(): 100 × 32-bit regs → 400 bytes
  let meta_i = -1; for (let i=0;i<300;i++){ if (bytes[i]===0xCF && bytes[i+1]===0xFC){ meta_i=i+2; break; } }
  if (meta_i<0) return null;
  const segI = [meta_i+7]; for (let k=1;k<9;k++) segI.push(segI[k-1] + bytes[segI[k-1]+1] + 3);   // meta_bytes_indexing
  const progs = [];
  segI.forEach(si=>{ const id=bytes[si]; if (id===3||id===5){ const b=k=>bytes[si+k];
    const pgm=(b(2)>>3)&0x1F, acm=b(3)&7, lfe=(b(4)>>1)&1, dn=((b(4)&1)<<4)|((b(5)>>4)&0xF);
    let ok=true; { let cs=b(1); for(let j=0;j<b(1);j++) cs=(cs+b(2+j))&0xFF; cs=((~cs)+1)&0xFF; ok = cs===b(2+b(1)); }
    progs.push({pgm, acm, lfe, dn, ok, gainDb: dn? VOL_DB(dn+30) : 0}); } });
  return { meta_i, segI: segI.slice(0,4), progs };
}

/* ---------------- actions ---------------- */
const A = {
  fmt(v){ act('Video format → '+FMTS[v].name, tr=>{ D.fmt=v; const f=F();
    tr(`${f.lines} lines, ${f.spl} words per line per stream, ${fmt(f.rate,3)} frames/s; switching line ${f.sw} (SMPTE RP 168 ${inf})`);
    tr(`frame_rate_code = ${f.frcode} (RDD 6 table 6-3). Dolby E / metadata frame = ${f.deRatio===2?'2 video frames (progressive >30 fps, “Dolby E vs video rates explanation.pdf”)':'1 video frame'}`);
    if (!lineOK()){ D.line = f.sw+2; tr(`VANC line moved to ${D.line} — the first legal line (“second line after the switching line”, Metadata Challenges… Note 9)`); } }); },
  line(d){ act(`VANC line ${d>0?'+1':'−1'}`, tr=>{ const f=F(); D.line = clamp(D.line+d, 1, f.firstActive+2);
    tr(`Inserter line register → ${D.line}${f.inter?` (and ${D.line+f.f2} in field 2)`:''}`);
    tr(lineOK()? `Legal: lines ${f.sw+2}–${f.firstActive-1} lie between the second line after the switching line and active video.` : `<b style="color:var(--bad)">Not allowed</b>: ${lineIssue()}.`);
    if (D.line===9 && f.hd) tr('Line 9 is where CBS inserts it in HD (COPPA Metadata Tutorial, p. 25).'); }); },
  method(v){ act('SMPTE 2020 method → '+v, tr=>{ D.method=v; const P=packetsFor(SIM.t);
    tr(v==='A' ? 'Method A (SMPTE 2020-2): one ANC packet per field, each carrying the subframe the serial stream sends in that field '+inf : 'Method B (SMPTE 2020-3): the whole metadata frame in one packet per frame '+inf);
    tr(`${P.out.length} ANC packet(s) per metadata frame: ${P.out.map(o=>o.tag+' = '+o.pk.n+' UDW').join(', ')}`);
    tr('FlipFactory supports Method B only (MetadataInsertionMethod = 3); the Axon GEP/HEP100 auto-detects A and B (AppNote 10-01).'); }); },
  source(v){ act('Metadata source → '+({dolbyE:'decoded Dolby E',serial:'RS-485 RDD 6 serial in',preset:'internal preset'})[v], tr=>{ D.source=v;
    tr(v==='dolbyE' ? 'Metadata is lifted from the Dolby E stream as it is decoded to PCM (the s2020 app-note workflow); segments 1/2 (Dolby E) are included.' :
       v==='serial' ? 'RDD 6 bytes arrive on the 115 200 baud RS-485 port and are re-timed into VANC (RDD 6 §4).' :
       'An internally generated set: only the Dolby Digital segments (3/4) are sent; no Dolby E segments.');
    const P=packetsFor(SIM.t); tr(`Subframe 1 = ${P.R.sf1.bytes.length} bytes, subframe 2 = ${P.R.sf2.bytes.length} bytes`); }); },
  pc(d){ act(`program_config ${d>0?'+1':'−1'}`, tr=>{ D.pc=(D.pc+d+24)%24; D.progs=defaultProgs(D.pc); D.sel=0;
    tr(`program_config = ${D.pc}: ${PCFG[D.pc][2]} (${PCFG[D.pc][0]} programs on ${PCFG[D.pc][1]} channels, RDD 6 table 6-2)`);
    const P=packetsFor(SIM.t); tr(`Frame grows to ${P.R.sf1.bytes.length+P.R.sf2.bytes.length} bytes = ${fmt((P.R.sf1.bytes.length)*BYTE_T*1e3,2)} ms of serial time for subframe 1`);
    if (P.out.some(o=>/part/.test(o.tag))) tr('<b>More than 255 user data words</b>: the DC word is 8 bits, so the packet must be split '+inf); }); },
  prog(d){ act('Select program '+((D.sel+d+PCFG[D.pc][0])%PCFG[D.pc][0]), tr=>{ D.sel=(D.sel+d+PCFG[D.pc][0])%PCFG[D.pc][0]; tr(`Editing program ${D.sel}`); }); },
  dialnorm(d){ act(`Dialnorm ${d>0?'+1':'−1'} (program ${D.sel})`, tr=>{ const p=D.progs[D.sel]; const o=p.dialnorm; p.dialnorm=clamp(p.dialnorm+d,1,31);
    tr(`ac3_dialnorm[${D.sel}] ${o} → ${p.dialnorm} = dialogue at −${p.dialnorm} dBFS (5-bit field, RDD 6 §7.1.2)`);
    const s = packetsFor(SIM.t).R.sf1.segs.find(x=>x.id===3); if (s) tr(`DD complete segment checksum becomes 0x${hex2(packetsFor(SIM.t).R.sf1.segs.filter(x=>x.id===3)[D.sel].cs)}`);
    tr(`A WBS M6205C200 reading this would set dn_gain = volume[${p.dialnorm}+30] = ${VOL_DB(p.dialnorm+30)} dB (dial_norm_extract)`); }); },
  rate(d){ act(`Data rate ${d>0?'up':'down'}`, tr=>{ const p=D.progs[D.sel]; p.datarate=clamp(p.datarate+d,0,18); tr(`ac3_datarate[${D.sel}] = ${p.datarate} → ${RATE_KBPS[p.datarate]} kb/s (table 7-22)`); }); },
  acmod(d){ act('Channel mode', tr=>{ const p=D.progs[D.sel]; p.acmod=(p.acmod+d+8)%8; tr(`ac3_acmod[${D.sel}] = ${p.acmod} (${ACMOD[p.acmod]})`); }); },
  sdid(d){ act('SDID', tr=>{ D.sdid=clamp(D.sdid+d,1,9); tr(`SDID = ${hex2(D.sdid)}h (DID 45h / SDID 01h–09h: SMPTE 2020-1, not in the archive ${inf})`); }); },
  corrupt(){ act(D.corrupt?'Clear corruption':'Corrupt one payload bit', tr=>{ D.corrupt=!D.corrupt;
    if (D.corrupt){ tr('One bit of the first Dolby Digital payload flips after the checksum was computed.');
      tr('An RDD 6 receiver must reject the segment: checksum ≠ 2’s complement of (size + payload).');
      tr('<b>M6205C200 v104 does not check it</b>: meta_sort() reads the bytes regardless (see Findings).'); } }); },
  inserter(){ act(D.inserter?'Inserter bypass':'Inserter on', tr=>{ D.inserter=!D.inserter; tr(D.inserter?'Packets are written onto the chosen VANC line':'Bypass: SDI passes untouched; the M6205C200 sees Reg 7 bit 15 (Vanc Detected) = 0 and zeroes Reg 11–110'); }); },
};

/* ---------------- concept panel (inferred) ---------------- */
function led(x,y,on,col,lbl){ return `<circle cx="${x}" cy="${y}" r="11" fill="#0a0b0b"/><circle cx="${x}" cy="${y}" r="8" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#g26)"':''}/><text x="${x}" y="${y+28}" text-anchor="middle" font-size="12" fill="#cfd3d6">${lbl}</text>`; }
function btn(x,y,w,lbl,a,v){ return `<g data-a="${a}" data-v="${v==null?'':v}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="34" rx="6" fill="#2a2e31" stroke="#4a4f53"/><text x="${x+w/2}" y="${y+22}" text-anchor="middle" font-size="14" fill="#e6e8ea">${lbl}</text></g>`; }
function panelSVG(t){
  const f=F(), P=packetsFor(t), ok=lineOK(), Rd=D.reader?readerDecode(t):null;
  const inVanc = D.inserter && ok;
  const pr=D.progs[D.sel];
  const l1 = `${D.method} L${String(D.line).padStart(2,'0')} ${PCFG[D.pc][2].replace(/ /g,'')}`.slice(0,16).padEnd(16);
  const l2 = `P${D.sel} DN-${pr.dialnorm} ${RATE_KBPS[pr.datarate]}k`.slice(0,16).padEnd(16);
  return `<svg viewBox="0 0 1704 330" style="width:100%;max-width:980px;border-radius:8px;display:block" role="img" aria-label="RD26 concept inserter panel (inferred)">
    <defs><filter id="g26" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1704" height="330" rx="10" fill="var(--dev)"/>
    <text x="40" y="44" font-size="22" font-weight="700" fill="#e6e8ea">RD26 · METADATA VANC INSERTER</text>
    <text x="40" y="70" font-size="13" fill="#9aa0a5">concept only — RD26 never reached hardware (register status “?”)</text>
    ${led(70,130,true,'var(--led-g)','REF')}${led(150,130,D.source!=='preset','var(--led-g)','META IN')}${led(230,130,inVanc,'var(--led-g)','VANC')}${led(310,130,!ok||D.corrupt,'var(--led-a)','ALARM')}
    <rect x="420" y="96" width="640" height="104" rx="4" fill="#040504" stroke="#26292b" stroke-width="2"/>
    <g filter="url(#g26)">${SIM.dotMatrix(l1,436,110,5.4,'var(--vfd)','rgba(140,200,90,.07)')}${SIM.dotMatrix(l2,436,160,5.4,'var(--vfd)','rgba(140,200,90,.07)')}</g>
    ${btn(1100,96,120,'SOURCE','src')}${btn(1230,96,90,'A / B','meth')}${btn(1330,96,70,'LINE−','line',-1)}${btn(1410,96,70,'LINE+','line',1)}${btn(1490,96,80,'BYPASS','ins')}
    ${btn(1100,150,90,'CFG−','pc',-1)}${btn(1200,150,90,'CFG+','pc',1)}${btn(1300,150,80,'PGM','prog',1)}${btn(1390,150,80,'DN−','dn',-1)}${btn(1480,150,80,'DN+','dn',1)}
    <text x="40" y="250" font-size="13" fill="#9aa0a5">Rear (concept): SDI IN · SDI OUT · REF · METADATA IN (RS-485, 115 200 baud 8-N-1 per RDD 6 §4) · METADATA OUT</text>
    ${['SDI IN','SDI OUT','REF','META IN','META OUT'].map((n,i)=>`<g><circle cx="${90+i*150}" cy="290" r="16" fill="${i<3?'#9c8233':'#2b5f9e'}"/><text x="${118+i*150}" y="295" font-size="12" fill="#cfd3d6">${n}</text></g>`).join('')}
    <text x="900" y="290" font-size="13" fill="#cfd3d6">Packets/frame: ${P.out.length} · UDW: ${P.out.map(o=>o.pk.n).join('+')} · frame_count ${P.R.fc}</text>
    <text x="900" y="312" font-size="13" fill="${Rd&&Rd.progs[0]?'#cfd3d6':'#777'}">M6205C200 readback: ${Rd&&Rd.progs[0]? `dialnorm ${Rd.progs[0].dn} → dn_gain ${Rd.progs[0].gainDb} dB${Rd.progs[0].ok?'':' (bad checksum, accepted)'}`:'—'}</text>
  </svg>`;
}
const PANEL_MAP = { src:()=>A.source(D.source==='dolbyE'?'serial':D.source==='serial'?'preset':'dolbyE'), meth:()=>A.method(D.method==='A'?'B':'A'),
  line:v=>A.line(+v), ins:()=>A.inserter(), pc:v=>A.pc(+v), prog:()=>A.prog(1), dn:v=>A.dialnorm(+v) };

/* ---------------- VANC line view (the "scope") ---------------- */
function lineSVG(t){
  const f=F(), P=packetsFor(t); const pk = P.out[0].pk.words; const sp=f.spl;
  const W=1000, x0=20, pw=W-40, X=n=>x0+n/sp*pw;
  const eavEnd=4, lnEnd=f.hd?8:4, hancEnd=lnEnd+f.hanc, savEnd=hancEnd+4;
  let s=`<svg viewBox="0 0 ${W} 170" style="width:100%"><text x="20" y="16" font-size="12" fill="var(--ink)">Line ${D.line} (${f.hd?'Y stream':'multiplexed 4:2:2 words'}) — ${sp} words, ${SIM.fmtDur(lineT())}; one word = ${SIM.fmtDur(wordT())}</text>`;
  const seg=(a,b,col,lbl)=>{ s+=`<rect x="${X(a)}" y="26" width="${Math.max(1,X(b)-X(a))}" height="34" fill="${col}" opacity=".75"/>`+(X(b)-X(a)>38?`<text x="${X(a)+3}" y="47" font-size="10.5" fill="#fff">${lbl}</text>`:''); };
  seg(0,eavEnd,'#7a5f12','EAV'); if (f.hd) seg(eavEnd,lnEnd,'#555','LN/CRC'); seg(lnEnd,hancEnd,'var(--accent2)','HANC (embedded audio)'); seg(hancEnd,savEnd,'#7a5f12','SAV');
  seg(savEnd,sp,'var(--grid)','active portion of a blanking line');
  if (D.inserter && lineOK()) seg(savEnd, savEnd+pk.length, 'var(--accent)', 'ANC');
  s+=`<text x="20" y="80" font-size="11" fill="var(--ink2)">${D.inserter&&lineOK()?`ANC packet: ${pk.length} words = ${SIM.fmtDur(pk.length*wordT())} starting right after SAV`:'No packet on this line ('+(D.inserter?lineIssue():'bypass')+')'}</text>`;
  // first 24 words of the packet
  const show=pk.slice(0,22); const names=['ADF','ADF','ADF','DID','SDID','DC'];
  show.forEach((w,i)=>{ const x=20+i*44; const nm=i<6?names[i]:(i===show.length-1&&pk.length<=22?'CS':'UDW'+(i-6)); s+=`<rect x="${x}" y="92" width="40" height="40" rx="3" fill="${i<3?'var(--chip)':i<6?'color-mix(in srgb,var(--accent2) 25%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+20}" y="108" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="var(--ink)">${hex3(w)}</text><text x="${x+20}" y="125" text-anchor="middle" font-size="9" fill="var(--ink2)">${nm}</text>`; });
  s+=`<text x="20" y="155" font-size="11" fill="var(--ink2)">10-bit words: b0–7 data, b8 even parity, b9 = NOT b8 (SMPTE 291, inferred). CS = 9-bit sum of DID…last UDW = ${hex3(pk[pk.length-1])}h</text></svg>`;
  return s;
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const f=F(), css=SIM.css, Tf=frameT(), Tl=lineT(), Tm=metaFrameT();
  const ls=[];
  ls.push({label:`Video ${f.name}: ${f.inter?'fields':'frames'} (switch line ${f.sw})`, h:30, draw(c,X,t0,t1,y,h){
    const per = f.inter? Tf/2 : Tf;
    SIM.pulses(c,X,t0,t1,y,h,per,(f.sw-1)*Tl,Tl,css('--accent2'),f.inter?'fields':'frames');
    if (t1-t0 < 40*Tl) SIM.pulses(c,X,t0,t1,y+h*0.55,h*0.45,Tl,0,Tl*0.04,css('--ink2'),'lines');
  }});
  ls.push({label:'Dolby E / metadata frame', h:24, draw(c,X,t0,t1,y,h){
    const n0=Math.floor(t0/Tm), n1=Math.ceil(t1/Tm); if (n1-n0>200){ laneText(c,X,t0,y,h,`${Math.round((t1-t0)/Tm)} metadata frames (${fmt(1/Tm,2)}/s)`); return; }
    for(let n=n0;n<n1;n++) bandAt(c,X,n*Tm+(f.sw-1)*Tl,(n+1)*Tm+(f.sw-1)*Tl-Tl,y,h,n%2?css('--accent'):css('--accent2'),.35,`frame_count ${n&0xFFFF}`);
  }});
  ls.push({label:'RDD 6 serial, RS-485 115 200 baud', h:30, draw(c,X,t0,t1,y,h){
    const n0=Math.floor(t0/Tm)-1, n1=Math.ceil(t1/Tm);
    if (n1-n0>120){ laneText(c,X,t0,y,h,'bursts every metadata frame: nulls → subframe 1 … subframe 2 → idle'); return; }
    for(let n=n0;n<=n1;n++){ if(n<0) continue; const R=rddFrame(n*Tm); const base=n*Tm;
      const s1=base+(f.sw+1)*Tl, e1=s1+R.sf1.bytes.length*BYTE_T;
      const half = f.inter? Tf/2 : Tf; const s2=Math.max(e1, base+half+(f.sw+1)*Tl), e2=s2+R.sf2.bytes.length*BYTE_T;
      bandAt(c,X,base,s1,y,h,css('--ink2'),.18,'nulls'); bandAt(c,X,s1,e1,y,h,css('--accent'),.75,`SF1 ${R.sf1.bytes.length} B`); bandAt(c,X,e1,s2,y,h,css('--ink2'),.12,'');
      bandAt(c,X,s2,e2,y,h,css('--warn'),.75,`SF2 ${R.sf2.bytes.length} B`);
      if (X(e1)-X(s1) > 900){ const bw=BYTE_T; const k0=Math.max(0,Math.floor((t0-s1)/bw)), k1=Math.min(R.sf1.bytes.length-1,Math.ceil((t1-s1)/bw)); c.font='10px '+css('--mono'); c.fillStyle=css('--ink');
        for(let k=k0;k<=k1;k++){ const xa=X(s1+k*bw); c.fillText(hex2(R.sf1.bytes[k]), xa+2, y+h-6); c.fillRect(xa,y+3,1,h-6); } }
    }
  }});
  ls.push({label:`VANC line ${D.line} ANC packets (Method ${D.method})`, h:26, draw(c,X,t0,t1,y,h){
    if (!D.inserter || !lineOK()){ laneText(c,X,t0,y,h, !D.inserter?'bypass — no packets':'line not allowed: '+lineIssue(), css('--bad')); return; }
    const P=packetsFor(t0); const per = f.inter? Tf/2 : Tf; const lineOff=(D.line-1)*Tl, l2off=f.inter?(D.line-1+f.f2)*Tl:0;
    const n0=Math.floor(t0/Tf)-1, n1=Math.ceil(t1/Tf);
    if (n1-n0>100){ SIM.pulses(c,X,t0,t1,y,h,D.method==='A'?per:Tm,lineOff,Tl,css('--accent'),'packets'); return; }
    for(let n=n0;n<=n1;n++){ if(n<0) continue; const base=n*Tf; const first = (base % Tm) < Tf*0.5;
      const pkt=(tt,lbl,len)=>bandAt(c,X,tt,tt+Math.max(len*wordT(),Tl*0.2),y,h,css('--accent'),.85,lbl);
      if (D.method==='A'){ if (f.inter){ pkt(base+lineOff,'SF1',P.out[0].pk.words.length); pkt(base+l2off,'SF2',P.out[P.out.length-1].pk.words.length); }
        else pkt(base+lineOff, first?'SF1':'SF2', P.out[first?0:P.out.length-1].pk.words.length); }
      else if (first) pkt(base+lineOff,'frame',P.out[0].pk.words.length);
    }
  }});
  ls.push({label:'Line structure (zoom to ≤ 1 line)', h:26, draw(c,X,t0,t1,y,h){
    if (t1-t0 > 3*Tl){ laneText(c,X,t0,y,h,`${Math.round((t1-t0)/Tl).toLocaleString()} lines in view; zoom to “1 line” to see EAV · HANC · SAV · ANC`); return; }
    const wT=wordT(); const l0=Math.floor(t0/Tl), l1=Math.ceil(t1/Tl);
    for (let L=l0; L<=l1; L++){ const b=L*Tl; const ln=(L % f.lines)+1; const hancEnd=(f.hd?8:4)+f.hanc;
      bandAt(c,X,b,b+4*wT,y,h,'#7a5f12',.9); bandAt(c,X,b+4*wT,b+hancEnd*wT,y,h,css('--accent2'),.4,'HANC');
      bandAt(c,X,b+hancEnd*wT,b+(hancEnd+4)*wT,y,h,'#7a5f12',.9);
      const vl = ln===D.line || (f.inter && ln===D.line+f.f2);
      if (vl && D.inserter && lineOK()) bandAt(c,X,b+(hancEnd+4)*wT,b+(hancEnd+4+packetsFor(b).out[0].pk.words.length)*wT,y,h,css('--accent'),.95,'ANC');
      c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); if (X(b+Tl)-X(b)>60) c.fillText('line '+ln, X(b)+3, y+11); }
  }});
  ls.push({label:'M6205C200 reader (Reg 7 bit 15)', h:22, draw(c,X,t0,t1,y,h){
    const on = D.inserter && lineOK() && D.reader; c.fillStyle = on? css('--accent'):css('--grid'); c.globalAlpha=.4; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1;
    laneText(c,X,t0,y,h, on? `Vanc Detected = 1, meta data line# = ${D.line}${D.corrupt?' · corrupt bit accepted (no checksum test)':''}` : 'Vanc Detected = 0 → Reg 11–110 cleared', css('--ink'));
  }});
  return ls;
}

/* ---------------- views ---------------- */
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <label class="small">Format <select id="fmtSel">${Object.keys(FMTS).map(k=>`<option value="${k}" ${k===D.fmt?'selected':''}>${FMTS[k].name}</option>`).join('')}</select></label>
    <button data-a="line" data-v="-1">line −</button><button data-a="line" data-v="1">line +</button>
    <button data-a="meth">Method ${D.method==='A'?'→ B':'→ A'}</button><button data-a="src">source</button>
    <button data-a="pc" data-v="-1">config −</button><button data-a="pc" data-v="1">config +</button>
    <button data-a="prog">program</button><button data-a="dn" data-v="-1">dialnorm −</button><button data-a="dn" data-v="1">dialnorm +</button>
    <button data-a="rate" data-v="-1">rate −</button><button data-a="rate" data-v="1">rate +</button><button data-a="sdid" data-v="1">SDID +</button>
    <button data-a="bad">${D.corrupt?'clear corruption':'corrupt a bit'}</button><button data-a="ins">${D.inserter?'bypass':'insert'}</button><button data-a="rst">defaults</button></div>`;
}
function bindAll(root){
  bindActs(root, Object.assign({}, PANEL_MAP, { rate:v=>A.rate(+v), sdid:v=>A.sdid(+v), bad:()=>A.corrupt(), rst:()=>reset() }));
  const fs=root.querySelector('#fmtSel'); if (fs) fs.onchange=e=>A.fmt(e.target.value);
}
function stateTable(t){
  const P=packetsFor(t), R=P.R, f=F(), Rd=readerDecode(t);
  return kv([
    ['Format', `${f.name} · line ${Math.floor((t%frameT())/lineT())+1} of ${f.lines}`, 1],
    ['Metadata frame', `frame_count ${R.fc} · program_config ${D.pc} (${PCFG[D.pc][2]}) · frame_rate_code ${f.frcode}`, 1],
    ['Subframe 1', `${R.sf1.bytes.length} bytes = ${fmt(R.sf1.bytes.length*BYTE_T*1e3,2)} ms at 115 200 baud · segments ${R.sf1.segs.map(s=>s.id).join(', ')}`, 1],
    ['Subframe 2', `${R.sf2.bytes.length} bytes · segments ${R.sf2.segs.map(s=>s.id).join(', ')} · then 0A 0A`, 1],
    ['ANC packets', P.out.map(o=>`${o.tag}: DID 45 SDID ${hex2(D.sdid)} DC ${o.pk.n}`).join('<br>'), 1],
    ['VANC line', `${D.line}${f.inter?' / '+(D.line+f.f2):''} — ${lineOK()?'legal':'<b style="color:var(--bad)">'+lineIssue()+'</b>'}`, 1],
    ['M6205C200 readback', Rd? Rd.progs.slice(0,4).map(p=>`pgm ${p.pgm}: acmod ${p.acm} lfe ${p.lfe} dialnorm ${p.dn} → ${p.gainDb} dB${p.ok?'':' <b style="color:var(--warn)">bad CS (accepted)</b>'}`).join('<br>') : '—', 1],
  ]);
}
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>
      ${card('Concept inserter at the playhead — buttons drive the model', `<div id="pn"></div>${controlsHTML()}<p class="small muted">The panel is ${inf}: RD26 produced no hardware or artwork. It is laid out from the controls the documents call for (source, Method A/B, VANC line, program metadata) and the RDD 6 serial port.</p>`)}
      ${card('VANC line at the playhead', `<div id="ln"></div>`)}
    </div><div>
      ${card('What the model did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="st"></div>`)}
    </div></div>
    ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Serial timing follows RDD 6 §4.2: nulls from vertical sync, subframe 1 from the second line after the switching point, subframe 2 in the next field. The line-structure lane shows where the packet lands in the line. Zoom to “1 line” and step by words.</p>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t;
    const pn=m.querySelector('#pn'); pn.innerHTML=panelSVG(t); bindAll(pn);
    m.querySelector('#ln').innerHTML=lineSVG(t)+`<p class="small muted">Word layout per SMPTE 291 is ${inf}: the standard is not in the archive.</p>`;
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#st').innerHTML=stateTable(t); m.querySelector('#log').innerHTML=logHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
  };
  bindAll(m); SIM.on('time', draw);
}
const tutor = { i:0 };
const LESSONS = [
  { title:'The question RD26 asked', body:`<p>In 2010|43–2011|44 Peter and Ali looked at <b>keeping Dolby audio metadata with the picture</b> once Dolby E is decoded to PCM. Dialnorm, downmix coefficients and the program layout normally ride inside the Dolby E stream. Decode it, and they are lost unless something carries them.</p><p>The answer in their folder is <b>SMPTE 2020</b>: put the RDD 6 metadata bytes into a VANC (vertical ancillary) packet in the SDI signal. The panel on the right is a <i>concept</i> inserter (${inf}); every value it shows is computed from the standards in the folder.</p>`, check:()=>true, auto:true },
  { title:'1 · Pick the format and line', body:`<p>CBS inserts metadata on <b>HD-SDI line 9</b> (COPPA tutorial). The rule from “Metadata Challenges…” is: any line from the <b>second line after the switching line</b> to the last line before active picture.</p><p><b>Goal:</b> 1080i 59.94, VANC line 9.</p>`, check:()=>D.fmt==='1080i'&&D.line===9, hint:'Choose 1080i 59.94 in Format, then LINE− / LINE+ until it reads L09.' },
  { title:'2 · See why line 8 is wrong', body:`<p>Move to <b>line 8</b>. That is the line right after the switching line (7). A router that cuts on line 7 can corrupt it, and the HD audio standard also skips it. The ALARM LED lights and nothing is inserted.</p><p><b>Goal:</b> line 8, then come back to 9.</p>`, check:()=>LOG.items.some(e=>/VANC line/.test(e.name))&&D.line===9&&tutor.saw8, hint:'Press LINE− once (to 8), then LINE+ once.' },
  { title:'3 · Build a metadata frame', body:`<p>The serial frame has two subframes. Subframe 1 (sync <span class="mono">CF FC</span>) carries the <i>complete</i> segments; subframe 2 (sync <span class="mono">3F F3</span>) the <i>essential</i> ones. Each subframe starts with a 7-byte header holding <span class="mono">frame_count</span>.</p><p>Change the program configuration and watch the byte counts in “State” and the RDD 6 lane.</p><p><b>Goal:</b> program_config 6 (2 + 2 + 2 + 2: four stereo programs).</p>`, check:()=>D.pc===6, hint:'CFG+ six times from 0.' },
  { title:'4 · Set a dialnorm', body:`<p>Go back to <b>5.1 + 2</b> (config 0). Program 0 is the 5.1 mix. Set its <b>dialnorm to 27</b> (dialogue at −27 dBFS). The segment checksum changes with it.</p><p><b>Goal:</b> config 0, program 0, dialnorm 27.</p>`, check:()=>D.pc===0&&D.progs[0].dialnorm===27, hint:'CFG− to 0, then DN+ three times (24 → 27).' },
  { title:'5 · Method A or B', body:`<p>Switch to <b>Method B</b>. Method A sends one packet per field; Method B sends the whole frame once (${inf}). FlipFactory only writes Method B; the Axon card reads both.</p><p><b>Goal:</b> Method B.</p>`, check:()=>D.method==='B', hint:'Press A / B.' },
  { title:'6 · Progressive video', body:`<p>Choose <b>720p 59.94</b>. Dolby E (and so the metadata frame) cannot run faster than 30 frames per second, so one metadata frame spans <b>two</b> video frames. See the “Dolby E / metadata frame” lane.</p><p><b>Goal:</b> 720p 59.94.</p>`, check:()=>D.fmt==='720p', hint:'Format → 720p 59.94.' },
  { title:'7 · What a WBS card reads back', body:`<p>WBS already had a card that <b>read</b> SMPTE 2020: the CTV <b>M6205C200</b>. Its FPGA flags VANC metadata in Reg 7 and its SHARC parses the bytes (<span class="mono">refresh_meta_data → meta_sort → dial_norm_extract</span>). Corrupt a bit and watch the readback: the checksum is <b>never tested</b>.</p><p><b>Goal:</b> corrupt a bit.</p>`, check:()=>D.corrupt, hint:'Press “corrupt a bit”.' },
  { title:'Done', body:`<p>You have walked the RD26 study: legal VANC lines, the RDD 6 frame, Method A/B and frame cadence. The <b>Software</b> tab shows the frame map and the M6205C200 parser; <b>Findings</b> says what came of it.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){
  tutorialView(m, LESSONS, tutor, { title:'Tutorial — the RD26 investigation, step by step', panelTitle:'Concept inserter',
    panel(el){ el.innerHTML = panelSVG(SIM.t) + controlsHTML(); bindAll(el); if (D.line===8) tutor.saw8=true; }, reset(){ reset(); tutor.saw8=false; } });
}
function viewSecond(m){
  m.innerHTML = `${card('One second, broken down', `<div id="lad"></div>`)}<div class="grid2">${card('As seen by the inserter at the playhead', `<div id="dev"></div>`)}${card('As seen by a downstream reader', `<div id="rd"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, f=F(), P=packetsFor(t), Tm=metaFrameT();
    const rows=[
      ['Video frames', fmt(f.rate,3), SIM.fmtDur(frameT()), f.inter?'2 fields each':'progressive'],
      ['Metadata (Dolby E) frames', fmt(1/Tm,3), SIM.fmtDur(Tm), 'frame_count +1 each'],
      ['RDD 6 serial bytes (max)', (BAUD/10).toLocaleString(), SIM.fmtDur(BYTE_T), '115 200 baud, 10 bits per byte'],
      ['RDD 6 bytes actually sent', ((P.R.sf1.bytes.length+P.R.sf2.bytes.length)/Tm).toFixed(0), '', `${P.R.sf1.bytes.length}+${P.R.sf2.bytes.length} bytes per frame = ${fmt(100*(P.R.sf1.bytes.length+P.R.sf2.bytes.length)*BYTE_T/Tm,1)} % duty`],
      ['ANC packets on line '+D.line, fmt(P.out.length/Tm*(D.method==='A'&&f.deRatio===1?1:1),2), '', `Method ${D.method}`],
      ['Video lines', Math.round(f.lines*f.rate).toLocaleString(), SIM.fmtDur(lineT()), ''],
      ['Words per stream', Math.round(f.spl*f.lines*f.rate).toLocaleString(), SIM.fmtDur(wordT()), f.hd?'Y and C streams interleave at 2× this':'4:2:2 multiplexed'],
      ['ANC words per second', Math.round(P.out.reduce((a,o)=>a+o.pk.words.length,0)/Tm).toLocaleString(), '', 'out of '+Math.round(f.spl*f.lines*f.rate).toLocaleString()],
    ];
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','period','note'], rows.map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="mono">${r[2]}</span>`,`<span class="small">${r[3]}</span>`]));
    const ln=Math.floor((t%frameT())/lineT())+1, w=Math.floor((t%lineT())/wordT());
    m.querySelector('#dev').innerHTML = kv([['Time',SIM.fmtT(t),1],['Line / word',`${ln} / ${w}`,1],['Serial port', (()=>{ const base=Math.floor(t/Tm)*Tm, s1=base+(f.sw+1)*lineT(); const k=Math.floor((t-s1)/BYTE_T); return (k>=0&&k<P.R.sf1.bytes.length)?`sending SF1 byte ${k} = ${hex2(P.R.sf1.bytes[k])}`:'nulls / idle'; })(),1],['Next packet', `line ${D.line}, ${P.out[0].pk.words.length} words`,1]]);
    const Rd=readerDecode(t);
    m.querySelector('#rd').innerHTML = Rd? kv([['sync found at', 'byte '+(Rd.meta_i-2)+' (0xCFFC)',1],['segment indexes', Rd.segI.join(', '),1],['programs', Rd.progs.map(p=>`${p.pgm}: dialnorm ${p.dn}, ${p.ok?'CS ok':'CS bad'}`).join('<br>'),1]]) : '<p class="muted">No sync word.</p>';
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    sdi:{x:20,y:30,w:170,h:70,t:'SDI in',s:['3G/HD/SD','2× input (backup)'],d:'Program video with embedded PCM (decoded from Dolby E upstream). The Axon GEP/HEP100 app note shows a 2×1 backup input switch ahead of the de-embedder.'},
    de:{x:20,y:150,w:170,h:80,t:'Dolby E decoder',s:['metadata out','PCM 8 ch'],d:'Source A: the decoder hands over the metadata it found inside the Dolby E stream (s2020 AppNote: “take the metadata embedded into Dolby E into metadata embedded into VANC”).',live:()=>D.source==='dolbyE'},
    ser:{x:20,y:270,w:170,h:70,t:'RS-485 metadata in',s:['RDD 6, 115 200 8-N-1'],d:'Source B: an external serial metadata stream timed to the video (RDD 6 §4).',live:()=>D.source==='serial'},
    pre:{x:20,y:380,w:170,h:60,t:'Internal presets',s:['DD segments only'],d:'Source C: an internally generated set (Axon: “not all parameters adjustable, only the most important ones”).',live:()=>D.source==='preset'},
    proc:{x:260,y:150,w:200,h:120,t:'Metadata processor',s:['build/patch RDD 6 frame','frame_count, checksums','Method A / B packing'],d:'Assembles subframes 1 and 2 with their sync segments and data segments, recomputes each 2’s-complement checksum and splits into SMPTE 291 packets of ≤255 user words.'},
    ins:{x:260,y:30,w:200,h:80,t:'VANC inserter',s:[`line ${D.line}, DID 45h SDID ${hex2(D.sdid)}h`],d:'Writes the packet into the chosen blanking line, right after SAV, in the Y stream (HD). Legal lines start at the second line after the switching line.'},
    out:{x:540,y:30,w:190,h:80,t:'SDI out',s:['video + audio + s2020'],d:'Down the plant to the transmission Dolby Digital encoder, which reads the VANC and sets dialnorm, downmix, data rate.'},
    rd:{x:540,y:180,w:190,h:110,t:'Reader (M6205C200)',s:['Reg 7: Vanc Detected, line#','SHARC meta_sort()','dialnorm → dn_gain'],d:'The WBS openGear card (2008|41–2011|44) that already de-embedded VANC metadata: Lt/Rt or Lo/Ro downmix from the metadata and dialnorm-driven gain. See the RD37 plugin for its DV routing.'},
  };
  const W=[['sdi','ins','video'],['de','proc','metadata'],['ser','proc',''],['pre','proc',''],['proc','ins','ANC packets'],['ins','out',''],['out','rd','SDI']];
  blockView(m,B,W,{start:'proc',h:460,side:`<p>The inserter <b>takes metadata</b> from Dolby E, a serial port or presets, <b>packs</b> it as an RDD 6 frame, and <b>writes</b> it into one VANC line of every field or frame, so it travels with the picture after Dolby E has been decoded.</p>`});
}
const SHEETS=[
  { name:'1 · Concept inserter', note:`Concept only (${inf}). Interfaces from RDD 6 §4 (RS-485, 115 200 baud) and the Axon block schematic (2×1 input, de-embedder, s2020 reader/inserter, delay).`, svg:()=>
    chip(80,70,170,'RS-485 RX',[['A/B','META IN']],[['RO','UART_RX']],'TIA-485-A') +
    chip(360,60,200,'FPGA (concept)',[['UART_RX','115 200 8-N-1'],['SDI_RX[9:0]','deserialiser'],['VSYNC','frame timing'],['LINE_SEL','reg']],[['SDI_TX[9:0]','serialiser'],['ANC_EN',''],['ALARM','LED'],['FC[15:0]','frame_count']],'ANC insert after SAV') +
    chip(660,80,140,'SDI driver',[['D[9:0]','SDI_TX']],[['OUT','SDI OUT']],'') },
  { name:'2 · M6205C200 register map', note:'From “M6205c200 switching rules.doc”: the FPGA hands VANC metadata to the SHARC in Reg 11–110 and flags it in Reg 7.', svg:()=>{
    const rows=[['Reg 1','SYNC header 0x53594E43'],['Reg 2','control: groups, dialnorm on/off (bit 16), volume'],['Reg 7 bit 15','Vanc Detected'],['Reg 7 bits 10..0','meta data line#'],['Reg 8 bits 23..8','Dolby detect on AES1/AES2'],['Reg 11','complete segment id 1 (Dolby E): program type'],['Reg 13–16','program 1: seg id, pgm id, data rate, bsmod, acmod, cmix, smix, LFE, dialnorm, Lt/Rt & Lo/Ro mix'],['Reg 21–76','programs 2–8, 8 registers each'],['Reg 110','grp enable, dialnorm enable, decoder in use']];
    return rows.map((r,i)=>`<rect x="60" y="${40+i*42}" width="160" height="32" fill="var(--panel2)" stroke="var(--ink)"/><text x="70" y="${61+i*42}" font-size="12" font-family="var(--mono)" fill="var(--accent2)">${r[0]}</text><text x="235" y="${61+i*42}" font-size="12" fill="var(--ink)">${r[1]}</text>`).join(''); } },
  { name:'3 · ANC packet words', note:`SMPTE 291 packet as built by ancPacket(); the word layout is ${inf} from SMPTE 291 (not in the archive).`, svg:()=>{
    const P=packetsFor(SIM.t).out[0].pk.words.slice(0,14); return P.map((w,i)=>`<rect x="${40+i*56}" y="120" width="52" height="60" fill="var(--panel2)" stroke="var(--ink)"/><text x="${66+i*56}" y="150" text-anchor="middle" font-size="12" font-family="var(--mono)" fill="var(--ink)">${hex3(w)}</text><text x="${66+i*56}" y="170" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${['ADF','ADF','ADF','DID','SDID','DC'][i]||'UDW'}</text>`).join('') + `<text x="40" y="230" font-size="12" fill="var(--ink2)">b9 b8 | b7 … b0 → for DID 45h: 45h has 3 ones → b8 = 1, b9 = 0 → 145h</text>`; } },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'RD26 documents and the M6205C200 register map', 'RD26 has no schematics. Sheet 1 is a concept; sheets 2 and 3 are redrawn from the M6205C200 switching-rules document and the packet format.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('RDD 6 frame at the playhead (click a segment)', `<div id="fr"></div><div id="seg" class="small"></div>`)}
    ${card('Inserter state machine (serial side, RDD 6 §4.2)', `<div id="fsm"></div>`)}</div>
    <div class="grid2">${card('M6205C200 parser — sharc/v104/backgnd.c', `<div id="par"></div>`)}${card('Checksum, worked', `<div id="cs" class="mono small"></div>`)}</div>`;
  let pick=null;
  const draw=()=>{ const t=SIM.t, R=rddFrame(t), f=F();
    const all=[...R.sf1.map.map(x=>Object.assign({sf:1},x)), ...R.sf2.map.map(x=>Object.assign({sf:2},x))];
    const total=R.sf1.bytes.length+R.sf2.bytes.length; let off=0;
    let s=`<svg viewBox="0 0 700 90" style="width:100%">`;
    all.forEach((x,i)=>{ const a=(x.sf===2?R.sf1.bytes.length:0)+x.a, b=(x.sf===2?R.sf1.bytes.length:0)+x.b; const X0=10+a/total*680, Wd=Math.max(2,(b-a)/total*680);
      const col = x.k==='sync'?'#7a5f12': x.k==='header'?'var(--accent2)': x.k==='seg'?(x.id<=2?'var(--warn)':'var(--accent)'):'var(--ink2)';
      s+=`<g data-i="${i}" style="cursor:pointer"><rect x="${X0}" y="20" width="${Wd}" height="40" fill="${col}" opacity="${pick===i?1:.7}" stroke="var(--panel)"/>${Wd>26?`<text x="${X0+3}" y="44" font-size="10" fill="#fff">${x.k==='seg'?'id '+x.id:x.k}</text>`:''}</g>`; });
    s+=`<text x="10" y="80" font-size="11" fill="var(--ink2)">SF1 ${R.sf1.bytes.length} B | SF2 ${R.sf2.bytes.length} B · total ${total} B = ${fmt(total*BYTE_T*1e3,2)} ms of the ${fmt(metaFrameT()*1e3,2)} ms frame</text></svg>`;
    m.querySelector('#fr').innerHTML=s;
    m.querySelectorAll('#fr [data-i]').forEach(g=>g.onclick=()=>{ pick=+g.dataset.i; draw(); });
    const x = pick!=null? all[pick] : all.find(z=>z.k==='seg');
    const sf = x.sf===1?R.sf1:R.sf2; const bytes=sf.bytes.slice(x.a,x.b);
    m.querySelector('#seg').innerHTML = `<p><b>${x.k==='seg'?`data segment ${x.id}: ${SEGNAME[x.id]}`:x.k}</b> (subframe ${x.sf}, bytes ${x.a}–${x.b-1})</p><p class="mono">${bytes.map(hex2).join(' ')}</p>${x.k==='seg'?`<p>size ${x.s.size} bytes · payload ${x.s.bits} bits + ${x.s.size*8-x.s.bits} unused · checksum ${hex2(x.s.cs)}</p>`:''}`;
    // FSM
    const ph = (()=>{ const Tm=metaFrameT(), base=Math.floor(t/Tm)*Tm, s1=base+(f.sw+1)*lineT(), e1=s1+R.sf1.bytes.length*BYTE_T, half=f.inter?frameT()/2:frameT(), s2=Math.max(e1,base+half+(f.sw+1)*lineT()), e2=s2+R.sf2.bytes.length*BYTE_T; return t<s1?0:t<e1?1:t<s2?2:t<e2?3:4; })();
    const st=['NULLS after V sync','SEND SUBFRAME 1','NULL FILL','SEND SUBFRAME 2','IDLE until next frame'];
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 460 250" style="width:100%">${st.map((n,i)=>`<rect x="20" y="${10+i*46}" width="300" height="34" rx="6" fill="${ph===i?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="30" y="${32+i*46}" font-size="12" fill="${ph===i?'#fff':'var(--ink)'}">${n}</text>${i<4?`<line x1="170" y1="${44+i*46}" x2="170" y2="${56+i*46}" stroke="var(--ink2)"/>`:''}`).join('')}<path d="M320 ${10+4*46+17} h40 V27 h-40" fill="none" stroke="var(--ink2)"/><text x="366" y="130" font-size="10.5" fill="var(--ink2)">next frame</text></svg>`;
    const steps=['refresh_meta_data(): Reg 7 bit 15 set?','meta_data_bytes(): Reg 10–109 → meta_bytes[400]','search i<300 for CF FC → meta_i','meta_bytes_indexing(): seg1 = meta_i+7, next = seg + size + 3','meta_sort(): ids 1, 3, 5 → Reg 11, 13–76','refresh: ac_mode, ext_bsi, Cmix/Smix LUTs','dial_norm_extract(): dn_gain = volume[dialnorm+30]'];
    const on = D.inserter && lineOK();
    m.querySelector('#par').innerHTML = `<svg viewBox="0 0 640 ${steps.length*40+10}" style="width:100%">${steps.map((p,i)=>`<rect x="10" y="${6+i*40}" width="440" height="30" rx="6" fill="${on?'var(--panel2)':i===0?'var(--warn)':'var(--panel2)'}" stroke="var(--line)"/><text x="20" y="${26+i*40}" font-size="11.5" font-family="var(--mono)" fill="var(--ink)">${p}</text>`).join('')}</svg><p class="small muted">No step checks a data_segment_checksum, and only the first subframe’s sync (CF FC) is searched.</p>`;
    const sg=R.sf1.segs[R.sf1.segs.length-1]; let c=sg.size, lines=[`checksum = data_segment_size = ${sg.size} (0x${hex2(sg.size)})`];
    sg.payload.forEach((b,j)=>{ c=(c+b)&0xFF; if (j<6 || j===sg.payload.length-1) lines.push(`+ payload[${j}] 0x${hex2(b)} → 0x${hex2(c)}`); else if (j===6) lines.push('…'); });
    lines.push(`2’s complement: (~0x${hex2(c)} + 1) & 0xFF = 0x${hex2(((~c)+1)&0xFF)}`);
    m.querySelector('#cs').innerHTML = lines.map(l=>`<div>${l}</div>`).join('');
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD26 decided, and what became of it', `<ol>
    <li><b>Register status: “?” — never started as hardware.</b> <span class="mono">R&amp;D_List.xls</span> row RD26 “Metadata VANC Inserter”, Peter/Ali, no completion date. The folder holds only reference documents filed 2010|43–2011|44 (Axon app note dated 21 Jul 2010, FlipFactory note, COPPA tutorial, RDD 6-2008, Dolby Cat. 552 manual).</li>
    <li><b>WBS already read SMPTE 2020 on a shipping card.</b> The CTV <span class="mono">M6205C200</span> (2008|41–2011|44) reports “Vanc Detected” and the metadata line number in Reg 7, and its SHARC parses the RDD 6 bytes in <span class="mono">refresh_meta_data()</span> / <span class="mono">meta_sort()</span> to drive Lt/Rt and Lo/Ro downmix and a dialnorm gain. Release 2.0.0.0 passed VANC from the decoder; 2.0.0.1 stopped passing it (SOFTWARE HISTORY.xls). An inserter was the missing half.</li>
    <li><b>The reader never checks the segment checksum.</b> <span class="mono">backgnd.c</span> finds <span class="mono">CF FC</span>, then walks segments by <span class="mono">size + 3</span>. RDD 6 §5.1.2 defines a 2’s-complement checksum, but no code compares it. A corrupted byte goes straight into dialnorm. Try “corrupt a bit”.</li>
    <li><b>Dialnorm gain is normalised to −31.</b> <span class="mono">dn_gain = volume[dialnorm+30]</span>, and the <span class="mono">volume[]</span> table has 0 dB at index 61. So dialnorm 31 gives 0 dB, dialnorm 24 gives −7 dB: the card turns every program down to a −31 dBFS dialogue level.</li>
    <li><b>A harmless mask overlap.</b> <span class="mono">meta_sort()</span> builds ac3_Smix with <span class="mono">(b&lt;&lt;4) &amp; 0x700</span>, which also picks up the low bit of cmixlev. The later <span class="mono">&amp; 0x3</span> discards it, so the result is right.</li>
    <li><b>Only one sync, fixed window.</b> The search stops at byte 300 of the 400-byte buffer and ignores subframe 2 (<span class="mono">3F F3</span>) and the end-of-frame word <span class="mono">0A 0A</span>.</li>
    <li><b>The documents disagree on methods.</b> FlipFactory inserts Method B only (<span class="mono">MetadataInsertionMethod = 3</span>) and only one audio stream; Axon’s cards auto-detect A and B. An inserter would need both.</li>
    <li><b>Frame cadence matters for progressive video.</b> “RD - Dolby E vs video rates explanation.pdf” (in the parent folder): one Dolby E (and metadata) frame per video frame for interlaced formats, and one per <i>two</i> frames for 1080p/720p 59.94 and 50.</li>
    <li><b>Folder contents.</b> <span class="mono">ebu-production09-report.pdf</span> is a general EBU production report, not specific to metadata. The Cat. 552 manual is for the Dolby decoder module used on the WBS Dolby cards (M6202AE, D6207A).</li>
  </ol>`) + card('Assumptions in this model', `<ul class="small">
    <li>DID 45h / SDID 01h–09h and the SMPTE 291 word format come from SMPTE 2020-1 and 291, which are not in the archive (${inf}).</li>
    <li>Method A = one packet per field; Method B = the whole frame in one packet (${inf}). The documents name the methods but do not define them.</li>
    <li>Switching lines (RP 168) and line counts per format are standard values, not from the folder (${inf}).</li>
    <li>Payload values that RDD 6 leaves to the user (language, mix level, compression) use plain defaults.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>XXX - ENGINEERING - 2016 RD FILES/RD26-Metadata VANC Inserter/Ali/SMPTE/Rdd06-2008.pdf · …/Documents/*.pdf · …/DOLBY/Cat. No. 552 Implementation Manual v. 3.pdf</li>
    <li>XXX - ENGINEERING - 2016 RD FILES/RD - Dolby E vs video rates explanation.pdf · R&amp;D_List.xls</li>
    <li>#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/Software/m6205c200/M6205c200 switching rules.doc, M6205C200 SOFTWARE HISTORY.xls, sharc/v104/backgnd.c, volume_data.c</li></ul>`);
}

SIM.register({
  id:'rd26-metadata-vanc-inserter', name:'RD26 Metadata VANC Inserter · SMPTE 2020 / RDD 6 study (2011|44)', duration:1,
  product:'RD26 Metadata VANC Inserter', year:2011, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD26-Metadata VANC Inserter',
  summary:'R&D study (Peter/Ali, never built) into carrying Dolby audio metadata in SDI vertical ancillary data. The model builds bit-exact RDD 6 frames, packs them into SMPTE 2020 packets on a legal VANC line, and shows what the WBS M6205C200 card would read back.',
  highlights:['Bit-exact RDD 6 subframes, segments and checksums','VANC line placement and switching-line rule','Method A vs B packet cadence, 1080i/720p/SD','M6205C200 parser readback, including its missing checksum test','Serial 115 200 baud timing against video lines'],
  depth:'Hardware model',
  stepUnits:[ {label:'1 video frame', period:()=>frameT()}, {label:'1 metadata frame', period:()=>metaFrameT()}, {label:'1 video line', period:()=>lineT()}, {label:'1 RDD 6 byte (86.8 µs)', period:()=>BYTE_T}, {label:'1 SDI word', period:()=>wordT()} ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[1001/30000,'1 frame (33.4 ms)'],[1001/60000,'1 field (16.7 ms)'],[0.002,'2 ms (serial bytes)'],[1001/30000/1125,'1 line (29.7 µs)'],[0.000004,'4 µs (words)']],
  defaultZoom:2,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the RD26 study', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});

})();
