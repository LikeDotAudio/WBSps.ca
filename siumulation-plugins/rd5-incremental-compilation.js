/* =====================================================================
   RD5 — Understand SignalTap / incremental compilation (Ward-Beck R&D register, Peter, Z = completed 2011)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources:
   - RD5…/Peter/Notes_IncrementalCompilation.xlsx (5 Nov 2010): Peter's seven excerpted rules
       (≈2,000 LE minimum, isolate changing logic, register boundaries, merge timing-critical
       partitions, no constant propagation, unconnected ports, Partition Merge statistics)
   - RD5…/Peter/IncrementalCompilatoinBestPractices.pdf (= …PartitionsandFloorplanAssignments.pdf,
       identical file): Quartus II 10.0 Handbook vol. 1 ch. 8 — Source File / Post-Synthesis / Post-Fit,
       Fitter Preservation Level, Rapid Recompile, LogicLock
   - #POD #SERIES/POD31 …/software/altera/v101/pod31.qsf (13 Jul 2007): EP1C12Q240C6, Quartus 5.1 SP0.15,
       partitions SDdemux:inst52, group_detectorHD:inst3, non_audio_detector:inst86 (POST_SYNTH),
       dcfifo0:inst67, dcfifo0:inst68, Top — all others POST_FIT, preservation PLACEMENT
   - …/POD31/…/altera/v101/talkback/pod31.{map,fit,asm,tan}.talkback.xml (29 Jan 2007): 3:11, 13:42, 0:07,
       0:22; 7,640 / 12,060 LEs; "N/A until Partition Merge"
   - AMS16 - #Master/…/AMS16A - #software/altera/v103/talkback/AMS16A.*.talkback.xml (21 Jul 2008):
       EP2C35F484C8, 13,190 / 33,216 LEs, 9,868 registers, 57,671 / 483,840 memory bits, flat project;
       fmax requirements 27.0 and 74.25 MHz
   - …/AMS16A - #software/altera/V070001/AMS16TEST.qsf (2014): Quartus 11.1, EP4CE30F23C8, root partition
       SOURCE, USE_SIGNALTAP_FILE stp1.stp, ENABLE_SIGNALTAP OFF
   Partition sizes inside each design are not recorded and are marked "inferred" on screen.
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
const NT = { SOURCE:'Source File', POST_SYNTH:'Post-Synthesis', POST_FIT:'Post-Fit' };
const DES = {
  pod31:{ name:'POD31 v101 (Jan 2007|40)', dev:'EP1C12Q240C6', max:12060, les:7640, mem:239616, q:'Quartus II 5.1 SP0.15',
    t:{map:191, merge:0, fit:822, asm:7, tan:22}, tsrc:'pod31.*.talkback.xml, 29 Jan 2007',
    parts:[ ['Top','no_file_for_top_partition','POST_FIT',2660],['SDdemux:inst52','inst5_de7d48…','POST_FIT',2400],['group_detectorHD:inst3','inst3_d99158…','POST_FIT',1800],
            ['non_audio_detector:inst86','inst8_6baaa6…','POST_SYNTH',600],['dcfifo0:inst67','inst6_f02366…','POST_FIT',90],['dcfifo0:inst68','inst6_cce662…','POST_FIT',90] ],
    clocks:[['SD parallel (27 MHz)',27e6],['HD parallel (74.25 MHz)',74.25e6]] },
  ams16:{ name:'AMS16A v101 (Jul 2008|41)', dev:'EP2C35F484C8', max:33216, les:13190, mem:483840, used:57671, q:'Quartus II 5.1 Build 216',
    t:{map:528, merge:0, fit:398, asm:82, tan:74}, tsrc:'AMS16A.*.talkback.xml, 21 Jul 2008 (as recorded per file)',
    parts:[ ['Top','no_file_for_top_partition','SOURCE',2690],['demux16','—','SOURCE',2600],['hd_demux16','—','SOURCE',3000],['SDdemux','—','SOURCE',2000],
            ['group_detector','—','SOURCE',1500],['tdmxI2S_10','—','SOURCE',1100],['aes_outputs','—','SOURCE',900],['phase_detect','—','SOURCE',400] ],
    clocks:[['fmax req. 27.0 MHz',27e6],['fmax req. 74.25 MHz',74.25e6]] },
};
const D0 = () => ({ des:'pod31', parts:JSON.parse(JSON.stringify(DES.pod31.parts)).map(p=>({name:p[0],hash:p[1],nt:p[2],les:p[3],dirty:false,reg:true,on:true})), last:null, hist:[], stpDepth:1024, stpWidth:64 });
let D = D0();
function loadDes(k){ D.des=k; D.parts=DES[k].parts.map(p=>({name:p[0],hash:p[1],nt:p[2],les:p[3],dirty:false,reg:true,on:k==='pod31'||p[0]==='Top'})); D.last=null; }
function reset(){ D=D0(); LOG.items=[]; SIM.refresh(); }
const des = () => DES[D.des];
/* the partitions that are actually defined (others fold into Top) */
function effParts(){ const on=D.parts.filter(p=>p.on); const top=on.find(p=>p.name==='Top'); const folded=D.parts.filter(p=>!p.on).reduce((a,p)=>a+p.les,0);
  return on.map(p=> p===top? Object.assign({},p,{les:p.les+folded, dirty:p.dirty||D.parts.some(q=>!q.on&&q.dirty)}) : p); }
function compileModel(){
  const d=des(), P=effParts(), N=P.length, tot=d.les;
  const synth = P.filter(p=>p.dirty||p.nt==='SOURCE'), refit = P.filter(p=>p.dirty||p.nt!=='POST_FIT');
  const fs = synth.reduce((a,p)=>a+p.les,0)/tot, ff = refit.reduce((a,p)=>a+p.les,0)/tot;
  const flat = N===1;
  const ovh = flat? 0 : 0.12 + 0.01*N;                                   // bookkeeping overhead per compile (inferred)
  const map = d.t.map*(flat?1:Math.max(0.08, fs+ovh)), merge = flat?0:(4+2*N), fit = d.t.fit*(flat?1:Math.max(0.1, 0.15+0.85*ff)), asm=d.t.asm, tan=d.t.tan;
  const warn=[];
  P.forEach(p=>{ if (!flat && p.les<2000) warn.push(`${p.name}: ≈ ${p.les} LEs, under the ~2,000 LE guideline (note 1)`);
    if (!flat && !p.reg && p.name!=='Top') warn.push(`${p.name}: unregistered boundary — inter-partition paths can't be retimed (notes 3–4)`); });
  if (!flat) warn.push('constants and unconnected ports are not optimised across boundaries (notes 5–6)');
  const lePenalty = flat? 0 : P.filter(p=>p.name!=='Top').reduce((a,p)=>a+ (p.reg?8:30) + 0.02*p.les, 0);   // lost cross-boundary optimisation (inferred)
  return { P, N, flat, map, merge, fit, asm, tan, total: map+merge+fit+asm+tan, full: d.t.map+d.t.fit+d.t.asm+d.t.tan, warn, les: Math.round(tot+lePenalty), fs, ff };
}
const mmss = s => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
function qsfLines(){ return effParts().map(p=>[
  `set_global_assignment -name PARTITION_NETLIST_TYPE ${p.nt} -section_id ${p.name==='Top'?'Top':'"'+p.name+'"'}`,
  `set_global_assignment -name PARTITION_FITTER_PRESERVATION_LEVEL PLACEMENT -section_id ${p.name==='Top'?'Top':'"'+p.name+'"'}`,
  `set_instance_assignment -name PARTITION_HIERARCHY ${p.hash==='—'?'(new)':p.hash} -to ${p.name==='Top'?'|':'"'+p.name+'"'} -section_id ${p.name==='Top'?'Top':'"'+p.name+'"'}`]).flat(); }
function stp(){ const d=des(); const free = d.mem - (d.used || Math.round(d.mem*0.3)); const bits=D.stpDepth*D.stpWidth; return { free, bits, ok: bits<=free, win: D.stpDepth/d.clocks[0][1], usedKnown: !!d.used }; }

const A = {
  des(k){ act('Open project → '+DES[k].name, tr=>{ loadDes(k); const d=des(); tr(`${d.dev}, ${d.les.toLocaleString()} / ${d.max.toLocaleString()} LEs, ${d.q}`); tr(k==='pod31'? 'pod31.qsf: 6 partitions — 5 Post-Fit, non_audio_detector Post-Synthesis, Fitter preservation PLACEMENT' : 'AMS16A.qsf: one partition (no_file_for_top_partition, SOURCE) — a flat compile'); }); },
  edit(i){ act(`Edit source of ${D.parts[i].name}`, tr=>{ const p=D.parts[i]; p.dirty=!p.dirty; tr(p.dirty? `${p.name}.vhd/.bdf changed → Quartus will resynthesise ${p.on?'this partition':'Top (the entity has no partition of its own)'} automatically` : 'edit undone'); }); },
  nt(i){ act(`Netlist type of ${D.parts[i].name}`, tr=>{ const p=D.parts[i], k=Object.keys(NT); p.nt=k[(k.indexOf(p.nt)+1)%3]; tr(`PARTITION_NETLIST_TYPE ${p.nt} — ${p.nt==='SOURCE'?'resynthesise and refit':p.nt==='POST_SYNTH'?'keep synthesis, refit':'keep placement and routing'}`); }); },
  part(i){ act(`${D.parts[i].on?'Remove':'Create'} partition ${D.parts[i].name}`, tr=>{ const p=D.parts[i]; if (p.name==='Top') { tr('Top cannot be removed'); return; } p.on=!p.on; tr(p.on? `design partition created for ${p.name} (≈ ${p.les} LEs ${'inferred'})` : `${p.name} folded back into Top`); }); },
  reg(i){ act(`Boundary registers on ${D.parts[i].name}`, tr=>{ const p=D.parts[i]; p.reg=!p.reg; tr(p.reg?'inputs and outputs registered (note 3)':'boundary left combinational'); }); },
  compile(){ act('Processing ▸ Start Compilation', tr=>{ const c=compileModel(); D.last=c; D.hist.unshift({des:D.des, total:c.total, flat:c.flat, n:c.N}); if (D.hist.length>8) D.hist.length=8;
    tr(`quartus_map: ${c.flat?'full synthesis':'resynthesise '+Math.round(c.fs*100)+' % of the logic'} → ${mmss(c.map)}`); if (!c.flat) tr(`Partition Merge → ${mmss(c.merge)} (totals “N/A until Partition Merge” before this, as in pod31.map.talkback.xml)`);
    tr(`quartus_fit: ${c.flat?'full place & route':'re-place '+Math.round(c.ff*100)+' % of the logic'} → ${mmss(c.fit)}`); tr(`quartus_asm ${mmss(c.asm)} · quartus_tan ${mmss(c.tan)}`);
    tr(`total ${mmss(c.total)} vs ${mmss(c.full)} recorded for the ${c.flat?'same flat':'first'} compile`); c.warn.forEach(w=>tr('⚠ '+w));
    D.parts.forEach(p=>p.dirty=false); }); },
  depth(v){ act(`SignalTap depth → ${v}`, tr=>{ D.stpDepth=v; const s=stp(); tr(`${v} samples × ${D.stpWidth} signals = ${s.bits.toLocaleString()} bits of M4K; free ≈ ${s.free.toLocaleString()} → ${s.ok?'fits':'too big'}`); tr(`window at ${des().clocks[0][0]}: ${SIM.fmtDur(s.win)}`); }); },
};

/* ---------------- views ---------------- */
function projHTML(){
  const c=compileModel(), d=des();
  let s=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${Object.keys(DES).map(k=>`<button data-a="des" data-v="${k}" class="${D.des===k?'on':''}">${DES[k].name}</button>`).join('')}<button data-a="compile" class="on">▶ Start Compilation</button></div>`;
  s+=`<div class="small muted">${d.dev} · ${d.q} · ${d.les.toLocaleString()} / ${d.max.toLocaleString()} LEs (${Math.round(d.les/d.max*100)} %)</div>`;
  s+=tbl(['Design partition','≈ LEs '+inf,'netlist type','boundary','edit'], D.parts.map((p,i)=>[
    `<a href="#" data-a="part" data-v="${i}" title="create / remove partition" style="${p.on?'font-weight:700':'opacity:.55'}">${p.on?'▣':'□'} ${p.name}</a>`,
    `<span class="mono" style="color:${p.on&&p.les<2000&&!c.flat?'var(--warn)':'inherit'}">${p.les.toLocaleString()}</span>`,
    p.on? `<button data-a="nt" data-v="${i}">${NT[p.nt]}</button>` : '<span class="muted">(in Top)</span>',
    p.on&&p.name!=='Top'? `<button data-a="reg" data-v="${i}" class="${p.reg?'on':''}">${p.reg?'registered':'combinational'}</button>`:'',
    `<button data-a="edit" data-v="${i}" class="${p.dirty?'on':''}">${p.dirty?'edited ✎':'edit'}</button>`]));
  return s;
}
function ganttSVG(){
  const c=D.last||compileModel(), d=des(), W=640, full=c.full, scale=(W-170)/Math.max(full, c.total);
  const row=(y,label,stages)=>{ let x=120, s=`<text x="6" y="${y+15}" font-size="11" fill="var(--ink)">${label}</text>`; stages.forEach(([n,t,col])=>{ const w=t*scale; if (w>0) s+=`<rect x="${x}" y="${y}" width="${Math.max(1,w)}" height="22" fill="${col}" opacity=".8"/>${w>34?`<text x="${x+3}" y="${y+15}" font-size="10" fill="#fff">${n}</text>`:''}`; x+=w; }); return s+`<text x="${x+4}" y="${y+15}" font-size="11" fill="var(--ink)">${mmss(stages.reduce((a,s)=>a+s[1],0))}</text>`; };
  const css=SIM.css, cols=[css('--accent2'),css('--ink2'),css('--accent'),css('--warn'),css('--bad')];
  return `<svg viewBox="0 0 ${W} 100" style="width:100%">${row(10,'recorded ('+D.des+')',[['map',d.t.map,cols[0]],['fit',d.t.fit,cols[2]],['asm',d.t.asm,cols[3]],['tan',d.t.tan,cols[4]]])}${row(46,D.last?'this compile':'(not compiled yet)',[['map',c.map,cols[0]],['merge',c.merge,cols[1]],['fit',c.fit,cols[2]],['asm',c.asm,cols[3]],['tan',c.tan,cols[4]]])}
    <text x="6" y="92" font-size="10" fill="var(--ink2)">Recorded times: ${d.tsrc}. Incremental times scale with the logic that must be redone ${'(inferred model)'}.</text></svg>`;
}
function resultHTML(){ const c=D.last; if (!c) return '<p class="muted small">Press Start Compilation.</p>';
  return kv([['Partitions',c.N+(c.flat?' (flat)':'')],['Elapsed',`${mmss(c.total)} (recorded full: ${mmss(c.full)})`],['Saving',`${Math.round((1-c.total/c.full)*100)} %`],['LEs after merge',`≈ ${c.les.toLocaleString()} ${inf}`]])+(c.warn.length?`<ul class="small">${c.warn.map(w=>`<li style="color:var(--warn)">${w}</li>`).join('')}</ul>`:''); }
function stpHTML(){ const s=stp(), d=des();
  return `<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center"><span class="small muted">sample depth</span>${[128,512,1024,4096,8192].map(v=>`<button data-a="depth" data-v="${v}" class="${D.stpDepth===v?'on':''}">${v}</button>`).join('')}</div>`+
    kv([['Signals tapped',`${D.stpWidth} ${inf}`],['Buffer',`${s.bits.toLocaleString()} bits`],['Free memory',`${s.free.toLocaleString()} bits ${s.usedKnown?'(483,840 − 57,671 used, talkback)':'(EP1C12 M4K total; usage '+inf+')'}`],['Fits?',s.ok?'yes':'<b style="color:var(--bad)">no</b>'],['Capture window',`${SIM.fmtDur(s.win)} at ${d.clocks[0][0]}`]]); }
function bindAll(root){ bindActs(root,{ des:v=>A.des(v), compile:()=>A.compile(), edit:v=>A.edit(+v), nt:v=>A.nt(+v), part:v=>A.part(+v), reg:v=>A.reg(+v), depth:v=>A.depth(+v) }); }
function lanes(){
  const d=des(), css=SIM.css, s=stp(), trig=0.5;
  return [
    {label:d.clocks[0][0], h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/d.clocks[0][1],0,0.5/d.clocks[0][1],css('--ink2'),'clocks'); }},
    {label:d.clocks[1][0], h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/d.clocks[1][1],0,0.5/d.clocks[1][1],css('--ink2'),'clocks'); }},
    {label:'Video lines (525/59.94)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/15734.27,0,4.7e-6,css('--accent2'),'lines'); }},
    {label:'AES frames out (48 kHz)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,0,1/96000,css('--accent'),'AES frames'); }},
    {label:'Group change (example trigger)', h:20, draw(c,X,t0,t1,y,h){ if (trig>=t0&&trig<=t1){ c.fillStyle=css('--bad'); c.fillRect(X(trig)-1,y+3,3,h-6); } laneText(c,X,t0,y,h,'trigger at 0.5 s'); }},
    {label:`SignalTap buffer (${D.stpDepth} samples)`, h:24, draw(c,X,t0,t1,y,h){ const a=trig - s.win*0.5, b=trig + s.win*0.5; if (b<t0||a>t1){ laneText(c,X,t0,y,h,`capture window ${SIM.fmtDur(s.win)} around the trigger — zoom to 0.5 s`); return; } bandAt(c,X,a,b,y,h,s.ok?css('--warn'):css('--bad'),.7,'acquisition'); }},
    {label:'JTAG upload to PC (USB-Blaster)', h:20, draw(c,X,t0,t1,y,h){ const up=s.bits/(6e6*0.5); bandAt(c,X,trig+s.win,trig+s.win+up,y,h,css('--accent2'),.6,'upload'); laneText(c,X,Math.max(t0,trig+s.win+up),y,h,` ≈ ${SIM.fmtDur(up)} at ~3 Mbit/s effective ${'(inferred)'}`); }},
  ];
}
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('Quartus project — Design Partitions window', `<div id="pj"></div>`)}${card('Compilation time', `<div id="gt"></div>`)}</div>
    <div>${card('Partition Merge report', `<div id="rs"></div>`)}${card('SignalTap II budget', `<div id="st"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('One second of the compiled design running, with a SignalTap capture', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const pj=m.querySelector('#pj'); pj.innerHTML=projHTML(); bindAll(pj); m.querySelector('#gt').innerHTML=ganttSVG(); m.querySelector('#rs').innerHTML=resultHTML();
    const st=m.querySelector('#st'); st.innerHTML=stpHTML(); bindAll(st); m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'Why RD5 existed', body:`<p>In November 2010|43 Peter summarised Altera’s incremental-compilation chapter into seven rules. A POD31 full compile took about 17 minutes in 2007; most edits touch one block. Incremental compilation keeps the untouched blocks’ results.</p>`, check:()=>true, auto:true },
  { title:'1 · Open POD31', body:`<p>Select <b>POD31 v101</b>. Its .qsf really has six partitions, five set to Post-Fit.</p>`, check:()=>D.des==='pod31', hint:'Press “POD31 v101”.' },
  { title:'2 · Change one block', body:`<p>Press <b>edit</b> on <span class="mono">non_audio_detector:inst86</span>, then <b>Start Compilation</b>. Only that partition is resynthesised; the rest keep their placement.</p>`, check:()=>D.last&&D.des==='pod31'&&LOG.items.some(e=>/non_audio/.test(e.name)), hint:'edit non_audio_detector, then Start Compilation.' },
  { title:'3 · Read the warnings', body:`<p>The two <span class="mono">dcfifo0</span> partitions are tiny, far under Peter’s rule 1 (~2,000 LEs). Click <b>dcfifo0:inst67</b> to remove its partition and compile again.</p>`, check:()=>!D.parts.find(p=>p.name==='dcfifo0:inst67').on && D.last, hint:'Click the dcfifo0:inst67 name, then compile.' },
  { title:'4 · A flat design', body:`<p>Open <b>AMS16A</b>. It is flat (one partition), so every compile is a full one — about 18 minutes from its talkback files. Create a partition for <b>hd_demux16</b>, edit it, and compile.</p>`, check:()=>D.des==='ams16'&&D.parts.find(p=>p.name==='hd_demux16').on&&D.last&&!D.last.flat, hint:'AMS16A → click hd_demux16 → edit → Start Compilation.' },
  { title:'5 · The other half: SignalTap', body:`<p>Set SignalTap depth to <b>8192</b>. The AMS16’s free memory (from its fit report) still holds it; the capture window is only ~300 µs of a 27 MHz clock.</p>`, check:()=>D.stpDepth===8192, hint:'Press 8192.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — incremental compilation', panelTitle:'Project', reset,
  panel(el){ el.innerHTML = projHTML()+ganttSVG()+resultHTML()+`<details><summary class="small">SignalTap</summary>${stpHTML()}</details>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second of the design, and one compile', `<div id="ev"></div>`)}${card('Compile progress if the 1 s timeline were the whole compile', `<div id="cp"></div>`)}`;
  const draw=()=>{ const d=des(), c=D.last||compileModel(), s=stp();
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','note'],[[d.clocks[0][0],d.clocks[0][1].toLocaleString(),'SignalTap sample clock in the model'],[d.clocks[1][0],d.clocks[1][1].toLocaleString(),''],['Video lines','15,734','525/59.94'],['AES frames','48,000',''],['SignalTap samples kept',D.stpDepth.toLocaleString(),`one capture of ${SIM.fmtDur(s.win)}`],['Compile (this model)',mmss(c.total),'= '+Math.round(c.total*d.clocks[0][1]).toExponential(2)+' clock cycles of the running design']].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,r[2]]));
    const T=c.total, at=SIM.t*T; const st=[['quartus_map',c.map],['Partition Merge',c.merge],['quartus_fit',c.fit],['quartus_asm',c.asm],['quartus_tan',c.tan]]; let acc=0, on=0; st.forEach((x,i)=>{ if (at>=acc) on=i; acc+=x[1]; });
    m.querySelector('#cp').innerHTML = flowSVG(st.map(x=>`${x[0]} — ${mmss(x[1])}`), on)+`<p class="small">Playhead ${SIM.t.toFixed(3)} s → ${mmss(at)} into the compile.</p>`;
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    src:{x:20,y:30,w:150,h:70,t:'Source files',s:['.vhd / .bdf / .qsf'],d:'Edited files mark their partition for resynthesis automatically (Handbook ch. 8).'},
    map:{x:210,y:30,w:160,h:70,t:'Analysis & Synthesis',s:['per partition'],d:'quartus_map. Partitions set to Source File or edited are resynthesised; others reuse the post-synthesis netlist.'},
    merge:{x:410,y:30,w:160,h:70,t:'Partition Merge',s:['joins netlists'],d:'Totals are “N/A until Partition Merge” — exactly what pod31.map.talkback.xml says.', live:()=>!compileModel().flat},
    fit:{x:610,y:30,w:150,h:70,t:'Fitter',s:['place & route'],d:'Post-Fit partitions keep placement (preservation level PLACEMENT in pod31.qsf).'},
    asm:{x:610,y:150,w:150,h:60,t:'Assembler',s:['.sof / .pof'],d:'quartus_asm; unaffected by partitions.'},
    tan:{x:410,y:150,w:160,h:60,t:'Timing Analyzer',s:['tan (5.1) / TimeQuest'],d:'quartus_tan in Quartus 5.1; RD13 covers TimeQuest/SDC.'},
    stp:{x:210,y:150,w:160,h:60,t:'SignalTap II',s:['stp1.stp, M4K buffer'],d:'The other half of the RD5 title. Inserting or changing taps is itself a small incremental change.'},
    db:{x:20,y:150,w:150,h:60,t:'Partition database',s:['db/ incremental_db/'],d:'Where preserved netlists live between compiles (inferred folder names).'},
  };
  blockView(m,B,[['src','map',''],['map','merge',''],['merge','fit',''],['fit','asm',''],['asm','tan',''],['stp','map','taps'],['db','map','reuse'],['fit','db','save']],{start:'merge',w:780,h:240,side:'<p>Incremental compilation splits the netlist into partitions and redoes only the ones that changed, at the cost of no optimisation across their boundaries.</p>'});
}
const SHEETS=[
  { name:'1 · POD31 partition hierarchy', note:'Redrawn from pod31.qsf (v101, 2007): section ids, PARTITION_HIERARCHY names (truncated) and netlist types. LE sizes are inferred.', svg:()=>{ const P=DES.pod31.parts; let s=`<rect x="330" y="30" width="200" height="50" fill="var(--panel2)" stroke="var(--ink)"/><text x="430" y="52" text-anchor="middle" font-size="12" fill="var(--ink)" font-weight="700">Top (pod31.bdf)</text><text x="430" y="70" text-anchor="middle" font-size="10" fill="var(--accent2)">POST_FIT · no_file_for_top_partition</text>`;
    P.slice(1).forEach((p,i)=>{ const x=30+i*165; s+=`<line x1="430" y1="80" x2="${x+75}" y2="170" stroke="var(--ink)"/><rect x="${x}" y="170" width="150" height="80" fill="var(--panel2)" stroke="${p[2]==='POST_SYNTH'?'var(--warn)':'var(--ink)'}"/><text x="${x+6}" y="190" font-size="11" fill="var(--ink)" font-weight="700">${p[0].split(':')[0]}</text><text x="${x+6}" y="205" font-size="10" fill="var(--ink2)">:${p[0].split(':')[1]}</text><text x="${x+6}" y="222" font-size="10" fill="var(--accent2)">${p[2]}</text><text x="${x+6}" y="238" font-size="10" fill="var(--ink2)">${p[1]}</text>`; });
    return s+`<text x="30" y="300" font-size="11" fill="var(--ink)">EP1C12Q240C6 · 7,640 / 12,060 LEs · PARTITION_FITTER_PRESERVATION_LEVEL PLACEMENT on all six</text>`; } },
  { name:'2 · AMS16 projects (flat)', note:'AMS16A.qsf v100–v104 (2008–2009) and AMS16TEST.qsf (2014) each define only the root partition with netlist type SOURCE.', svg:()=> chip(300,70,260,'AMS16A / AMS16TEST',[['PARTITION_HIERARCHY','no_file_for_top_partition / root_partition'],['PARTITION_NETLIST_TYPE','SOURCE'],['FITTER_PRESERVATION','PLACEMENT_AND_ROUTING (2014)']],[['DEVICE','EP2C35F484C8 → EP4CE30F23C8'],['LAST_QUARTUS_VERSION','5.1 → 9.0 SP2 → 11.1'],['SIGNALTAP','stp1.stp, ENABLE OFF (2014)']],'one partition = flat compile') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'pod31.qsf and the AMS16 .qsf files', 'RD5 has no design of its own. These sheets redraw the partition assignments found in the Ward-Beck projects it was about.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Netlist-type decision per partition (Handbook ch. 8)', `<div id="dt"></div>`)}${card('The .qsf lines this project would write', `<div id="qs" class="log"></div>`)}</div>${card('Peter’s seven notes, checked against the project', `<div id="pn"></div>`)}`;
  const draw=()=>{ const c=compileModel();
    m.querySelector('#dt').innerHTML = tbl(['partition','type','edited','synthesis','fitter'], c.P.map(p=>[p.name,NT[p.nt],p.dirty?'yes':'',p.dirty||p.nt==='SOURCE'?'<b>redo</b>':'reuse',p.dirty||p.nt!=='POST_FIT'?'<b>redo</b>':'reuse placement']));
    m.querySelector('#qs').innerHTML = qsfLines().map(l=>`<div>${l}</div>`).join('');
    const small=c.P.filter(p=>p.les<2000&&!c.flat).map(p=>p.name);
    m.querySelector('#pn').innerHTML = tbl(['#','rule (Notes_IncrementalCompilation.xlsx)','this project'],[
      [1,'partitions more than ~2,000 LEs/ALMs', c.flat?'flat — n/a': small.length? `<span style="color:var(--warn)">${small.join(', ')}</span>`:'ok'],
      [2,'isolate logic that changes from logic that doesn’t', 'edited: '+(D.parts.filter(p=>p.dirty).map(p=>p.name).join(', ')||'none')],
      [3,'register partition inputs/outputs', c.P.filter(p=>!p.reg&&p.name!=='Top').map(p=>p.name).join(', ')||'all registered'],
      [4,'merge partitions with timing-critical paths between them','not modelled'],
      [5,'no constant propagation across boundaries','applies to every boundary'],
      [6,'unconnected ports can’t be optimised away; use a wrapper','applies'],
      [7,'check Partition Merge ▸ Partition Statistics', D.last? 'see the Partition Merge report':'compile first']]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD5 decided, and what became of it', `<ol>
    <li><b>Completed; partitions stayed with the de-embedder family.</b> The register marks RD5 “Z”, completed 2011|44. The only Ward-Beck projects with partitions descend from the de-embedder FPGA: pod31.qsf (POD31, reused in M6202A v102 and SD403B) and DEMUX3 v103–v105 (Quartus 9.1 SP2, copied into RD60 in 2013), which sets <span class="mono">SDdemux:inst5</span>, <span class="mono">group_detectorHD:inst3</span> and <span class="mono">i2sx4_aes:inst4</span> to Post-Synthesis. The larger AMS16A (v100–v104) and AMS16TEST (2014, Quartus 11.1) projects stay flat, with only the root partition set to SOURCE.</li>
    <li><b>POD31 used partitions three years earlier.</b> pod31.qsf (Quartus 5.1, Jan–Jul 2007|40) has six partitions, five Post-Fit and non_audio_detector Post-Synthesis. Its map talkback reads “N/A until Partition Merge”. The recorded compile took 3:11 map + 13:42 fit + 0:07 asm + 0:22 tan ≈ 17:22.</li>
    <li><b>POD31 breaks rule 1.</b> Two partitions are single <span class="mono">dcfifo0</span> instances (inst67, inst68), far below the ~2,000 LE guideline Peter copied out. A small FIFO is likely under 200 LEs ${inf}.</li>
    <li><b>The two Altera PDFs are the same file.</b> IncrementalCompilatoinBestPractices.pdf and IncrementalCompilationPartitionsandFloorplanAssignments.pdf are identical (same size and SHA-256); one name is misspelt.</li>
    <li><b>Half the title has no notes.</b> The register says “Understand signal tap / incremental compilation”, but the folder has nothing on SignalTap. SignalTap was in use anyway: stp1.stp files sit in the AMS16 (v600, v700, V070000/1), Demux4 and RD79 projects.</li>
    <li><b>The AMS16 talkback times look out of order.</b> The v103 talkback set records map 8:48, fit 6:38, asm 1:22, tan 1:14 and EDA 6:09. A map longer than the fit is unusual; the XML may hold times from different runs.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Partition sizes are not recorded anywhere; they are shares of the known totals ${inf}.</li><li>Incremental compile times scale with the logic to be redone, plus a bookkeeping overhead ${inf}.</li><li>SignalTap width (64 signals), EP1C12 M4K total and JTAG upload speed are ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD5…/Peter/Notes_IncrementalCompilation.xlsx · IncrementalCompilatoinBestPractices.pdf</li><li>#POD #SERIES/POD31 - #Master/…/software/altera/v101/pod31.qsf · talkback/pod31.*.talkback.xml</li><li>AMS16 - #Master/…/altera/v103/talkback/AMS16A.*.talkback.xml · …/V070001/AMS16TEST.qsf</li><li>R&amp;D_List.xls (RD5)</li></ul>`);
}

SIM.register({
  id:'rd5-incremental-compilation', name:'RD5 Incremental compilation · Quartus partition model (2010|43)', duration:1,
  product:'RD5 Incremental Compilation', year:2010, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD5-Incremental Compilation #Software #Altera #NOTES',
  summary:'Peter’s 2010 notes on Quartus incremental compilation, applied to two real Ward-Beck projects: POD31 (which used partitions in 2007) and the flat AMS16A. Edit a block, set netlist types, compile, and compare with the recorded compile times; size a SignalTap buffer.',
  highlights:['Real POD31 partitions from pod31.qsf','Recorded compile times from talkback files','Peter’s seven rules checked live','Compile-time Gantt: flat vs incremental','SignalTap buffer budget from the AMS16 fit report'],
  depth:'Full model',
  stepUnits:[{label:'1 video line',period:()=>1/15734.27},{label:'1 AES frame',period:()=>1/48000},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.001,'1 ms'],[0.0001,'100 µs'],[0.000001,'1 µs']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: partitions', render:viewTutorial},
    {id:'second', label:'One second / one compile', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
