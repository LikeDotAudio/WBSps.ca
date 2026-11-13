/* =====================================================================
   RD50 — Improve speaker design (Ward-Beck R&D register, WKW / engineering, priority A)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources:
   - RD50-ImproveSpeakerDesign/Ams8e-8_bassboost.sch (P-CAD 2002, "Power Amo Bass Boost", ISS.1, 5 Jun 2012;
       identical copy in AMS81 …/Ams8e-8 - #PCB #ISS3/WORKING/AMS8-8-Bass-Boost/): part list only —
       R2/R3/R7/R8 68K, R4/R6 10K, R1/R10 5K1, new R18/R19 5K1 and C17/C18 .01, NE5532 (OP2), LM4766
   - AMS81 …/Ams8e-8 - #PCB #ISS3/Ams8e-8iss3.net (netlist, 25 nets), Ams8e-8iss3-PNP.txt (SMD positions, mm),
       WORKING/Ams8e-8iss4.net (adds C62/C63 2.2 µF 100 V, P101/P103/P104)
   - siumulation-plugins/ams8e.js: AMS8E-8 test sheet 19 Oct 2006 (+7.8 dB, 22.8 dBu = 10.67 V = 14 W into 8 Ω,
       Iq 60/55 mA) and the 2006 C1/C2 100 pF → 27 pF fix
   - Datasheets in RD50: SSM3302 (2 × 8 W / 8 Ω at 12 V, 1 % THD, 90–91 % efficiency, 7–18 V),
       TFA9810 (8.5–9.5 W at 10 % / 6.5–7.5 W at 1 %, 8 Ω, 12 V, fosc 550 kHz), TPA032D01 EVM (10 W mono,
       25 dB gain, VDD 9–14 V, 4.6 A, 55 mA idle), UG-360 (SSM3302 eval board), 145_DM100_02.Manual.pdf (misfiled)
   The bass-boost topology is inferred from the changed part values; nets were not recoverable from the binary.
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
const TEST = { gain:7.8, vmax:10.67, pmax:14, iq:0.060, rl:8 };              // AMS8E-8 test sheet (via ams8e.js)
const RAIL = 18;                                                               // ±18 V rails (inferred from the 10.67 V rms clip)
const AMPS = {
  lm4766:{ name:'LM4766 class AB (fitted)', cls:'AB', p1:14, eff:null, note:'AMS8E-8 as built. 14 W into 8 Ω at clip (test sheet).' },
  ssm3302:{ name:'ADI SSM3302', cls:'D', p1:8, eff:0.90, vdd:12, note:'2 × 8 W into 8 Ω at 12 V, < 1 % THD+N; 90 % efficiency; filterless Σ-Δ; 7–18 V.' },
  tfa9810:{ name:'NXP TFA9810', cls:'D', p1:7.5, eff:0.88, vdd:12, fosc:550e3, note:'2 × 6.5–7.5 W (1 % THD) / 8.5–9.5 W (10 %) into 8 Ω at 12 V; fosc 550 kHz; efficiency figure '+'inferred.' },
  tpa032:{ name:'TI TPA032D01 (EVM)', cls:'D', p1:10, eff:0.85, vdd:12, idle:0.055, note:'10 W mono module, 25 dB fixed gain, VDD 9–14 V, 4.6 A max, 55 mA idle; efficiency '+'inferred.' },
};
const D0 = () => ({ board:'iss3', c17:10, r18:5.1, f:100, vin:-6, amp:'lm4766', pout:2, baffle:false, wcm:12, sel:'U2' });
let D = D0();
function reset(){ D=D0(); LOG.items=[]; SIM.refresh(); }
/* complex helpers */
const cx=(r,i)=>({r,i}), cadd=(a,b)=>cx(a.r+b.r,a.i+b.i), cmul=(a,b)=>cx(a.r*b.r-a.i*b.i,a.r*b.i+a.i*b.r), cdiv=(a,b)=>{ const d=b.r*b.r+b.i*b.i; return cx((a.r*b.r+a.i*b.i)/d,(a.i*b.r-a.r*b.i)/d); }, cabs=a=>Math.hypot(a.r,a.i), par=(a,b)=>cdiv(cmul(a,b),cadd(a,b)), zc=(C,w)=>cx(0,-1/(w*C));
function parts(){ return D.board==='bb'
  ? { rin:68e3, rgnd:10e3, r1:5.1e3, r18:D.r18*1e3, c17:D.c17*1e-9, label:'bass boost (2012)' }
  : { rin:20e3, rgnd:5.1e3, r1:5.1e3, r18:0, c17:0, label:'issue 3 as built' }; }
/* stage gains at frequency f */
function stages(f, b){ b=b||parts(); const w=2*Math.PI*f;
  let zf = cx(b.r1,0); if (b.r18) zf = cadd(zf, par(cx(b.r18,0), zc(b.c17,w)));
  zf = par(zf, zc(27e-12,w));                                                    // C1 27 pF
  const g1 = cdiv(zf, cx(b.rin,0));                                              // differential stage
  const zg = cadd(cx(5.1e3,0), zc(68e-6,w)), zf2 = par(cx(20e3,0), zc(27e-12,w)); // R12 + C9, R11 ∥ C8
  const g2 = cadd(cx(1,0), cdiv(zf2, zg));
  const zob = cadd(cx(30,0), zc(6.8e-9,w)); const rl=cx(TEST.rl,0); const load=par(rl,zob);
  return { g1:cabs(g1), g2:cabs(g2), tot:cabs(g1)*cabs(g2), zobel:cabs(zob), load:cabs(load) };
}
const dB = v => 20*Math.log10(v);
function baffle(f){ if (!D.baffle) return 0; const f3 = 115/(D.wcm/100); const x=f/f3; return dB(Math.sqrt((0.25+x*x)/(1+x*x))); }   // −6 dB below f3 (inferred model)
function shelf(){ const b=parts(); if (!b.r18) return null; const fp=1/(2*Math.PI*b.r18*b.c17), fz=(b.r1+b.r18)/(2*Math.PI*b.r1*b.r18*b.c17); return { fp, fz, lf:dB((b.r1+b.r18)/b.rin), hf:dB(b.r1/b.rin), boost:dB((b.r1+b.r18)/b.r1) }; }
function level(){ const s=stages(D.f), vin=0.7746*Math.pow(10,D.vin/20); let vout=vin*s.tot; const clip=vout>TEST.vmax; const vo=Math.min(vout,TEST.vmax);
  return { s, vin, vout, vo, clip, p:vo*vo/TEST.rl, dbu:dB(vo/0.7746), head:dB(TEST.vmax/vout) }; }
function heat(ampKey, P){ const a=AMPS[ampKey];
  if (a.cls==='AB'){ const ipk=Math.sqrt(2*P/TEST.rl); const pdc = 2*RAIL*ipk/Math.PI + 2*RAIL*TEST.iq/2; return { pdc, loss:pdc-P, eff:P/pdc }; }   // per channel: two rails, half the IC's 60 mA idle
  const idle=(a.idle||0.02)*a.vdd/(a.idle?1:2); const pdc = P/a.eff + idle; return { pdc, loss:pdc-P, eff:P/pdc }; }

const PCB = [ // [ref, x, y (mm, PNP), value, role]
  ['C1',63.729,79.426,'27p','A: feedback cap across R1'],['C2',80.112,79.426,'27p','B: feedback cap across R10'],['C3',74.778,85.141,'0.1','U2 +V decoupling'],['C4',72.111,73.330,'0.1','U2 −V decoupling'],
  ['C5',91.288,109.017,'0.1','U1 VCC decoupling'],['C6',65.710,115.087,'0.1','VEE decoupling'],['C7',68.021,112.370,'0.1','VCC decoupling'],['C8',76.352,99.263,'27p','A: LM4766 feedback cap'],
  ['C10',90.703,99.136,'27p','B: LM4766 feedback cap'],['C12',97.460,95.174,'100p','MUTE filter'],['C13',60.122,112.293,'6800p','A: Zobel'],['C14',68.682,93.269,'6800p','B: Zobel'],
  ['C15',86.690,103.886,'1000p','B: across LM4766 inputs (2006 fix)'],['C16',78.283,103.886,'1000p','A: across LM4766 inputs (2006 fix)'],
  ['R1',66.319,79.451,'5K1','A: diff-amp feedback'],['R2',64.033,73.355,'20K','A: − input'],['R3',69.494,73.355,'20K','A: + input'],['R4',66.650,73.330,'5K1','A: + leg to ground'],
  ['R5',66.573,85.928,'1K','A: NE5532 → LM4766 +IN'],['R6',74.524,73.330,'5K1','B: + leg to ground'],['R7',77.368,73.355,'20K','B: + input'],['R8',80.162,73.355,'20K','B: − input'],
  ['R9',77.495,86.055,'1K','B: NE5532 → LM4766 +IN'],['R10',77.495,79.451,'5K1','B: diff-amp feedback'],['R11',73.508,99.238,'20K','A: LM4766 feedback'],['R12',79.146,99.263,'5K1','A: LM4766 gain leg (+C9)'],
  ['R13',87.859,99.238,'20K','B: LM4766 feedback'],['R14',84.988,99.263,'5K1','B: LM4766 gain leg (+C11)'],['R15',94.539,95.174,'3K3','MUTE pull'],['R16',60.122,109.372,'30R','A: Zobel'],['R17',65.888,93.142,'30R','B: Zobel'],
  ['U2',72.009,79.248,'NE5532','dual op-amp: balanced receivers'],
];
const BBCHG = { R2:'68K', R3:'68K', R7:'68K', R8:'68K', R4:'10K', R6:'10K' };
const A = {
  board(v){ act(v==='bb'?'Fit the 2012 bass-boost values':'Back to issue 3', tr=>{ D.board=v; const b=parts();
    if (v==='bb'){ tr('R2, R3, R7, R8: 20K → 68K (input resistors); R4, R6: 5K1 → 10K; add R18, R19 5K1 and C17, C18 .01 µF (Ams8e-8_bassboost.sch part list)'); const s=shelf(); tr(`inferred: R18 ∥ C17 in series with R1 → DC gain (5K1 + 5K1)/68K = ${s.lf.toFixed(1)} dB, HF 5K1/68K = ${s.hf.toFixed(1)} dB → ${s.boost.toFixed(1)} dB low shelf between ${Math.round(s.fz)} and ${Math.round(s.fp)} Hz`); tr('R4 = 10K matches R1 + R18 = 10.2K at DC: the + leg divider still balances (CMRR)'); }
    else tr('NE5532 stage gain 5K1/20K = −11.9 dB, LM4766 stage 1 + 20K/5K1 = +13.8 dB → +1.9 dB overall (netlist)'); }); },
  pcb(r){ act('Board → '+r, tr=>{ D.sel=r; const p=PCB.find(x=>x[0]===r); if (p){ tr(`${p[0]} ${D.board==='bb'&&BBCHG[r]?BBCHG[r]+' (was '+p[3]+')':p[3]} at (${p[1]}, ${p[2]}) mm — ${p[4]}`); } }); },
  c17(v){ act(`C17/C18 → ${v} nF`, tr=>{ D.c17=v; const s=shelf(); if (s) tr(`shelf moves to ${Math.round(s.fz)}–${Math.round(s.fp)} Hz`); else tr('fit the bass-boost values first'); }); },
  r18(v){ act(`R18/R19 → ${v} kΩ`, tr=>{ D.r18=v; const s=shelf(); if (s) tr(`boost ${s.boost.toFixed(1)} dB; shelf ${Math.round(s.fz)}–${Math.round(s.fp)} Hz`); }); },
  f(v){ act(`Test tone → ${v} Hz`, tr=>{ D.f=v; const l=level(); tr(`${D.vin} dBu in → ${l.dbu.toFixed(1)} dBu out (${l.p.toFixed(2)} W into 8 Ω)${l.clip?' — <b style="color:var(--bad)">LM4766 clips</b>':''}`); }); },
  vin(v){ D.vin=v; SIM.refresh(); },
  amp(k){ act('Amplifier → '+AMPS[k].name, tr=>{ D.amp=k; const a=AMPS[k], h=heat(k,D.pout); tr(a.note); tr(`at ${D.pout} W out: ${h.pdc.toFixed(1)} W from the supply, ${h.loss.toFixed(1)} W heat per channel (${(h.eff*100).toFixed(0)} %)`); if (D.pout>a.p1) tr(`<b style="color:var(--bad)">${D.pout} W is above this part’s ${a.p1} W rating into 8 Ω</b>`); }); },
  pout(v){ D.pout=v; SIM.refresh(); },
  baffle(){ act('Baffle-step speaker model '+(D.baffle?'off':'on'), tr=>{ D.baffle=!D.baffle; tr(`f3 = 115 / ${D.wcm/100} m = ${Math.round(115/(D.wcm/100))} Hz; a small box loses up to 6 dB below it (inferred speaker model)`); }); },
};

/* ---------------- views ---------------- */
function boardSVG(){
  const x0=55, y0=66, W=50, H=56, k=12; let s=`<svg viewBox="0 0 ${W*k} ${H*k}" style="width:100%;max-width:560px;display:block;border-radius:8px;background:#0e3a22" role="img" aria-label="AMS8E-8 issue 3 SMD area, from the PNP file">
    <rect x="4" y="4" width="${W*k-8}" height="${H*k-8}" rx="10" fill="#14532f" stroke="#c9b469" stroke-width="2"/>
    <text x="14" y="26" font-size="14" fill="#e8e1b8">AMS8E-8 ISS3 — SMD placement (Ams8e-8iss3-PNP.txt, mm)</text>`;
  const X=x=>(x-x0)*k, Yc=y=>(y-y0)*k;
  // through-hole parts, positions inferred
  s+=`<rect x="${X(68)}" y="${Yc(112)}" width="${30*k}" height="${5*k}" fill="#1b1b1b" stroke="#999"/><text x="${X(69)}" y="${Yc(115.5)}" font-size="12" fill="#ddd">U1 LM4766 (TA15A) — on the heatsink edge (position inferred)</text>`;
  [['C9',83,90],['C11',95,90],['C61',58,100],['C64',58,86]].forEach(([r,x,y])=>{ s+=`<circle cx="${X(x)}" cy="${Yc(y)}" r="${2.6*k}" fill="#2a3a5a" stroke="#99a"/><text x="${X(x)}" y="${Yc(y)+4}" text-anchor="middle" font-size="11" fill="#dde">${r}</text>`; });
  [['P4 in',60,70],['P3 pwr',99,70],['P1/P2 out',99,82],['P5 mute',99,104]].forEach(([r,x,y])=>{ s+=`<rect x="${X(x)-18}" y="${Yc(y)-8}" width="36" height="16" fill="#eee" stroke="#666"/><text x="${X(x)}" y="${Yc(y)+22}" text-anchor="middle" font-size="10" fill="#e8e1b8">${r}</text>`; });
  PCB.forEach(([r,x,y,v])=>{ const chg = D.board==='bb' && BBCHG[r]; const on=D.sel===r; const w = r==='U2'? 5*k : 3.2*k, h = r==='U2'? 4*k : 1.6*k;
    s+=`<g data-a="pcb" data-v="${r}" style="cursor:pointer"><rect x="${X(x)-w/2}" y="${Yc(y)-h/2}" width="${w}" height="${h}" fill="${r[0]==='C'?'#b8865a':r==='U2'?'#222':'#2b2b2b'}" stroke="${on?'#ffd23f':chg?'#ff6a5a':'#d9d9d9'}" stroke-width="${on||chg?3:1}"/><text x="${X(x)}" y="${Yc(y)-h/2-3}" text-anchor="middle" font-size="10" fill="${chg?'#ff9a8a':'#e8e1b8'}">${r}${chg?' '+chg:''}</text><title>${r} ${v}</title></g>`; });
  if (D.board==='bb') [['R18',70,88],['R19',82,88],['C17',70,91],['C18',82,91]].forEach(([r,x,y])=>{ s+=`<rect x="${X(x)-19}" y="${Yc(y)-9}" width="38" height="18" fill="none" stroke="#ff6a5a" stroke-dasharray="4 3"/><text x="${X(x)+22}" y="${Yc(y)+4}" font-size="10" fill="#ff9a8a">${r}</text>`; });
  return s+`</svg><p class="small muted">SMD positions from the issue-3 PNP file (a panel, so the origin is not the board corner). Through-hole parts and the added bass-boost parts (dashed red) are placed by hand ${inf}.</p>`;
}
function respSVG(){
  const fs=[]; for (let e=1;e<=5;e+=0.02) fs.push(Math.pow(10,e));
  const save=D.board;
  D.board='iss3'; const pa=parts(); D.board='bb'; const pb=parts(); D.board=save;
  const A_=fs.map(f=>[f, dB(stages(f,pa).tot)+baffle(f)]), B_=fs.map(f=>[f, dB(stages(f,pb).tot)+baffle(f)]);
  const series=[{pts:A_, col:'var(--accent2)', label:'issue 3 (netlist)'},{pts:B_, col:'var(--bad)', label:'bass boost (inferred topology)'}];
  if (D.baffle) series.push({pts:fs.map(f=>[f,baffle(f)]), col:'var(--ink2)', dash:'4 3', label:'baffle step of the box'});
  const l=level();
  return plotSVG(series,{xr:[10,100000], yr:[-16,8], xlog:true, xt:[10,100,1000,10000,100000], xf:v=>v>=1000?v/1000+'k':v, yt:[-15,-10,-5,0,5], xl:'Hz', yl:'dB, input → speaker terminals'+(D.baffle?' (+ box)':''), marks:[[D.f, dB(l.s.tot)+baffle(D.f), 'var(--play)', `${D.f} Hz`]]});
}
function headroomSVG(){
  const fs=[]; for (let e=1;e<=4.3;e+=0.03) fs.push(Math.pow(10,e));
  const vin=0.7746*Math.pow(10,D.vin/20); const pts=fs.map(f=>[f, dB(TEST.vmax/(vin*stages(f).tot))]);
  return plotSVG([{pts, col:'var(--accent)', label:`to clip, ${D.vin} dBu in`}],{xr:[10,20000], yr:[-10,30], xlog:true, xt:[10,100,1000,10000], xf:v=>v>=1000?v/1000+'k':v, yt:[-10,0,10,20,30], xl:'Hz', yl:'dB headroom', h:180});
}
function ampTable(){
  return tbl(['amplifier','class','8 Ω rating','supply in','heat / ch','eff.'], Object.keys(AMPS).map(k=>{ const a=AMPS[k], h=heat(k,D.pout), over=D.pout>a.p1;
    return [`<a href="#" data-a="amp" data-v="${k}" style="${D.amp===k?'font-weight:700;color:var(--accent)':''}">${a.name}</a>`, a.cls, a.p1+' W', `${h.pdc.toFixed(1)} W`, `<span style="color:${over?'var(--bad)':'inherit'}">${h.loss.toFixed(1)} W${over?' (over rating)':''}</span>`, (h.eff*100).toFixed(0)+' %']; }))+
    `<label class="small">output power per channel <input type="range" min="0.5" max="14" step="0.5" value="${D.pout}" data-r="pout"> <b class="mono">${D.pout} W</b></label><p class="small muted">Class AB: ±18 V rails (${inf}) and 60 mA idle (test sheet). Class D: datasheet efficiency; TFA9810/TPA032 efficiency ${inf}.</p>`;
}
function ctlHTML(){ const s=shelf(), l=level();
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button data-a="board" data-v="iss3" class="${D.board==='iss3'?'on':''}">Issue 3 (as built)</button><button data-a="board" data-v="bb" class="${D.board==='bb'?'on':''}">Bass boost (2012)</button>
    <button data-a="baffle" class="${D.baffle?'on':''}">speaker box model ${D.baffle?'on':'off'}</button></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
      <label class="small">tone <select data-r="f">${[40,63,100,250,500,1000,3000,10000].map(f=>`<option ${f===D.f?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
      <label class="small">input <input type="range" min="-20" max="20" step="1" value="${D.vin}" data-r="vin"> <b class="mono">${D.vin} dBu</b></label>
      ${D.board==='bb'?`<label class="small">C17/C18 <select data-r="c17">${[4.7,10,22,47,100,220].map(v=>`<option ${v===D.c17?'selected':''}>${v}</option>`).join('')}</select> nF</label><label class="small">R18/R19 <select data-r="r18">${[2.2,5.1,10,20].map(v=>`<option ${v===D.r18?'selected':''}>${v}</option>`).join('')}</select> kΩ</label>`:''}</div>
    <p class="small">${D.f} Hz, ${D.vin} dBu in → <b>${l.dbu.toFixed(1)} dBu</b> (${l.p.toFixed(2)} W) ${l.clip?'<b style="color:var(--bad)">CLIPPED</b>':`headroom ${l.head.toFixed(1)} dB`}${s?` · shelf +${s.boost.toFixed(1)} dB below ${Math.round(s.fz)}–${Math.round(s.fp)} Hz`:''}</p>`; }
function bindAll(root){ bindActs(root,{ board:v=>A.board(v), pcb:v=>A.pcb(v), amp:v=>A.amp(v), baffle:()=>A.baffle() });
  root.querySelectorAll('[data-r]').forEach(e=>{ const k=e.dataset.r; e.onchange=()=>{ const v=+e.value; if (k==='vin') A.vin(v); else if (k==='pout') A.pout(v); else A[k](v); }; }); }
function lanes(){
  const css=SIM.css, l=level(), f=D.f, vmax=TEST.vmax*Math.SQRT2;
  const wave=(c,X,t0,t1,y,h,amp,full,col,clipAt)=>{ const span=t1-t0, pw=X(t1)-X(t0); if (span*f>pw/3){ c.fillStyle=col; c.globalAlpha=.3; const A_=Math.min(1,amp/full)*(h/2-2); c.fillRect(X(t0),y+h/2-A_,pw,2*A_); c.globalAlpha=1; laneText(c,X,t0,y,h,`${f} Hz × ${Math.round(span*f)} cycles`); return; }
    c.strokeStyle=col; c.beginPath(); for (let i=0;i<=600;i++){ const t=t0+span*i/600; let v=amp*Math.sin(2*Math.PI*f*t); if (clipAt) v=clamp(v,-clipAt,clipAt); const yy=y+h/2-v/full*(h/2-2); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); };
  return [
    {label:`Input (${D.vin} dBu, balanced)`, h:34, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,l.vin*Math.SQRT2,4,css('--accent2')); }},
    {label:`NE5532 out (×${l.s.g1.toFixed(3)})`, h:34, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,l.vin*Math.SQRT2*l.s.g1,4,css('--accent2')); }},
    {label:`LM4766 out (×${l.s.g2.toFixed(2)})`, h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,l.vout*Math.SQRT2,18,l.clip?css('--bad'):css('--accent'),vmax); }},
    {label:'Rail current (class AB, |sin|)', h:28, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,l.vo*Math.SQRT2/TEST.rl,3,css('--warn')); }},
    {label:'Class-D carrier (TFA9810 550 kHz)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/550e3,0,0.5/550e3,css('--ink2'),'PWM periods'); }},
    {label:'Mains (60 Hz)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/120,0,1/480,css('--ink2'),'half-cycles'); }},
  ];
}
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('AMS8E-8 speaker-amp board (click parts)', `<div id="bd"></div>`)}${card('Amplifier options in the folder', `<div id="am"></div>`)}</div>
    <div>${card('Frequency response, input to speaker', `<div id="rs"></div><div id="ctl"></div>`)}${card('Headroom before the LM4766 clips', `<div id="hr"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('One second through the amplifier', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const bd=m.querySelector('#bd'); bd.innerHTML=boardSVG(); bindAll(bd); const am=m.querySelector('#am'); if(!am.contains(document.activeElement)){ am.innerHTML=ampTable(); bindAll(am); }
    m.querySelector('#rs').innerHTML=respSVG(); const c=m.querySelector('#ctl'); if(!c.contains(document.activeElement)){ c.innerHTML=ctlHTML(); bindAll(c); }
    m.querySelector('#hr').innerHTML=headroomSVG(); m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The brief', body:`<p>RD50, priority A (2012|45): make the AMS8E monitor speakers sound better. Two paths are in the folder: a <b>bass-boost</b> change to the AMS8E-8 amp board, and <b>class-D</b> amplifier datasheets.</p>`, check:()=>true, auto:true },
  { title:'1 · Look at the board', body:`<p>Click <b>R2</b> on the board. It is the 20K input resistor of the balanced receiver (NE5532, U2).</p>`, check:()=>D.sel==='R2', hint:'Click the part labelled R2 near the top-left.' },
  { title:'2 · Fit the bass boost', body:`<p>Press <b>Bass boost (2012)</b>. Six resistors change value (red) and R18/R19 with C17/C18 are added. The response gains a 6 dB low shelf.</p>`, check:()=>D.board==='bb', hint:'Press “Bass boost (2012)”.' },
  { title:'3 · Where is the shelf?', body:`<p>With .01 µF the shelf sits at about 3–6 kHz: a baffle-step correction, not a sub-bass lift. Set C17 to <b>100 nF</b> to move it down a decade.</p>`, check:()=>D.c17===100, hint:'C17/C18 → 100 nF.' },
  { title:'4 · Check the headroom', body:`<p>Set the tone to <b>63 Hz</b> and the input to <b>+12 dBu</b>. The headroom plot shows how much sooner the LM4766 now clips in the bass.</p>`, check:()=>D.f===63&&D.vin>=12, hint:'tone 63 Hz, input +12 dBu.' },
  { title:'5 · The class-D path', body:`<p>Click <b>ADI SSM3302</b> and set output to <b>4 W</b>. Compare heat per channel with the LM4766.</p>`, check:()=>D.amp==='ssm3302'&&D.pout===4, hint:'Click SSM3302, slide to 4 W.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — improving the AMS8E speaker', panelTitle:'Board and response', reset,
  panel(el){ if (el.contains(document.activeElement)) return; el.innerHTML = boardSVG()+respSVG()+ctlHTML()+headroomSVG()+ampTable(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second through each stage', `<div id="ev"></div>`)}${card('Stage by stage at the tone frequency', `<div id="st"></div>`)}`;
  const draw=()=>{ const l=level();
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','note'],[[`Tone cycles`,D.f,'test tone'],['Mains half-cycles','120','rail ripple, 60 Hz'],['TFA9810 PWM periods','550,000','fosc (datasheet)'],['Energy into 8 Ω',l.p.toFixed(2)+' J',''],['Heat in the amp',heat(D.amp,l.p).loss.toFixed(2)+' J',AMPS[D.amp].name]].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,r[2]]));
    const v=l.vin*Math.SQRT2*Math.sin(2*Math.PI*D.f*SIM.t);
    m.querySelector('#st').innerHTML = tbl(['stage','parts','gain','level (dBu)','now (V)'],[
      ['Balanced input','P4, JUMP1/2','—',D.vin.toFixed(1),v.toFixed(3)],
      ['Differential receiver','U2 NE5532, R1–R4 (+R18, C17)',dB(l.s.g1).toFixed(1)+' dB',(D.vin+dB(l.s.g1)).toFixed(1),(v*l.s.g1).toFixed(3)],
      ['Series R','R5 1K, C16 1000p','0 dB','',''],
      ['Power amp','U1 LM4766, R11/R12, C9',dB(l.s.g2).toFixed(1)+' dB',l.dbu.toFixed(1),clamp(v*l.s.tot,-TEST.vmax*1.414,TEST.vmax*1.414).toFixed(2)],
      ['Zobel','R16 30R + C13 6800p',`|Z| ${l.s.zobel.toFixed(0)} Ω at ${D.f} Hz`,'',''],
      ['Speaker','P1/P2, 8 Ω',l.clip?'<b style="color:var(--bad)">clipped</b>':'',`${l.p.toFixed(2)} W`,'']]);
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    in:{x:20,y:40,w:140,h:70,t:'Balanced in',s:['P4 (PAN500)','JUMP1/2 polarity'],d:'Line-level feed from the AMS8E main board.'},
    rx:{x:200,y:40,w:170,h:80,t:'NE5532 receiver',s:['R1–R4 / R6–R10','bass boost: +R18, C17'],d:'Differential stage; the bass-boost change lives here.', live:()=>D.board==='bb'},
    pa:{x:410,y:40,w:170,h:80,t:'LM4766 power amp',s:['+13.8 dB','14 W / 8 Ω clip'],d:'Dual class-AB amp, mute on P5.', live:()=>D.amp==='lm4766'},
    zob:{x:620,y:40,w:140,h:70,t:'Zobel + out',s:['30R + 6800p','P1/P2'],d:'Output network and speaker connectors.'},
    spk:{x:620,y:160,w:140,h:70,t:'Speaker',s:['8 Ω, small box'],d:'Driver and box not documented in RD50 (inferred).'},
    cd:{x:410,y:170,w:170,h:80,t:'Class-D option',s:['SSM3302 / TFA9810','TPA032D01'],d:'Datasheets in RD50: ~90 % efficient, 8–10 W into 8 Ω from 12 V.', live:()=>D.amp!=='lm4766'},
    tw:{x:200,y:170,w:170,h:70,t:'Iss4: C62/C63',s:['2.2 µF 100 V','P101 → P103/P104'],d:'Issue-4 working netlist adds two series capacitors on extra output pins: a tweeter high-pass (≈ 9 kHz into 8 Ω, inferred).'},
  };
  blockView(m,B,[['in','rx',''],['rx','pa',''],['pa','zob',''],['zob','spk',''],['rx','cd','alt.'],['cd','spk',''],['zob','tw','']],{start:'rx',w:780,h:270,side:'<p>RD50 looked at both ends of the chain: the receiver gain shape (bass boost) and the power stage (class D).</p>'});
}
const SHEETS=[
  { name:'1 · Receiver, channel A (iss3)', note:'Redrawn from Ams8e-8iss3.net: NET00029 (U2-2, R2, C1, R1), NET00028 (U2-3, R4, R3), NET00027 (U2-1, R5, C1, R1), NET00030/31 (JUMP1/2, P4).', svg:()=>
    chip(360,80,160,'U2A NE5532',[['2 (−IN)','NET00029: R2 20K, R1 5K1, C1 27p'],['3 (+IN)','NET00028: R3 20K, R4 5K1→GND']],[['1 (OUT)','NET00027: R1, C1, R5 1K'],['8 / 4','VCC / VEE']],'balanced → single-ended, −11.9 dB') },
  { name:'2 · Power amp (iss3)', note:'Redrawn from the netlist and the LM4766 pin names in the .sch (OUTA, −INA, +INA, MUTEA…).', svg:()=>
    chip(340,60,180,'U1 LM4766',[['8 (+INA)','NET00048: R5, C16 1000p'],['7 (−INA)','NET00047: R11 20K, R12 5K1+C9, C8, C16'],['13 (+INB)','NET00050: R9, C15'],['12 (−INB)','NET00049: R13, R14+C11, C10, C15'],['6, 11 (MUTE)','NET00046: R15 3K3, C12 → P5']],[['3 (OUTA)','NET00045: P1-1, P2-1, R16 30R+C13'],['1 (OUTB)','NET00053: P1-2, P2-2, R17+C14'],['2, 15 (VCC)',''],['4 (VEE)',''],['5, 10 (GND)','']],'gain 1 + 20K/5K1 = +13.8 dB') },
  { name:'3 · Bass boost (inferred)', note:'From the part list of Ams8e-8_bassboost.sch only. R18 ∥ C17 in series with R1 is inferred: it is the arrangement in which R4 = 10K balances R1 + R18 = 10.2K.', svg:()=>
    chip(360,80,160,'OP2A NE5532',[['−IN','R2 68K in; Zf = R1 + (R18 ∥ C17)'],['+IN','R3 68K, R4 10K → GND']],[['OUT','→ R5 → LM4766']],'LF gain −16.5 dB, HF −22.5 dB') +
    `<rect x="560" y="260" width="250" height="90" fill="none" stroke="var(--bad)" stroke-dasharray="5 4"/><text x="570" y="282" font-size="12" fill="var(--ink)">R1 5K1 ── (R18 5K1 ∥ C17 .01µ)</text><text x="570" y="302" font-size="11" fill="var(--ink2)">pole 1/(2π·R18·C17) ≈ 3.1 kHz</text><text x="570" y="320" font-size="11" fill="var(--ink2)">zero ≈ 6.2 kHz · step 6.0 dB</text>` },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'Ams8e-8iss3.net and the Ams8e-8_bassboost.sch part list', 'Sheets 1–2 follow the issue-3 netlist exactly. Sheet 3 is a reconstruction.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Signal path (hardware only), at the tone frequency', `<div id="sp"></div>`)}${card('Bass-boost arithmetic', `<div id="ba"></div>`)}</div>`;
  const draw=()=>{ const l=level(), s=shelf();
    const st=[`P4 balanced in: ${D.vin} dBu`, `U2 diff stage: ${dB(l.s.g1).toFixed(1)} dB (${parts().label})`, 'R5 1K + C16 1000p: RF filter (2006 fix)', `U1 LM4766: +${dB(l.s.g2).toFixed(1)} dB, C9 68 µ → 0.46 Hz HP`, `clip at 10.67 V rms: ${l.clip?'CLIPPING':'ok'}`, 'Zobel 30R + 6800p → 8 Ω speaker'];
    m.querySelector('#sp').innerHTML = flowSVG(st, Math.floor(SIM.t*D.f*6)%6);
    m.querySelector('#ba').innerHTML = s? kv([['DC feedback','R1 + R18 = '+(5.1+D.r18).toFixed(1)+'K'],['HF feedback','R1 = 5.1K'],['Input R','68K'],['LF gain',s.lf.toFixed(2)+' dB'],['HF gain',s.hf.toFixed(2)+' dB'],['Step',s.boost.toFixed(2)+' dB'],['Pole / zero',`${Math.round(s.fp)} / ${Math.round(s.fz)} Hz`],['vs issue 3',`LF ${(s.lf-dB(5.1/20)).toFixed(1)} dB, HF ${(s.hf-dB(5.1/20)).toFixed(1)} dB`]]) : '<p class="small">Fit the bass-boost values to see the arithmetic. Issue 3: 5K1/20K = −11.85 dB, flat.</p>';
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD50 decided, and what became of it', `<ol>
    <li><b>Outcome: a schematic, not a product change.</b> RD50 is priority A but never marked complete. The bass-boost schematic (5 Jun 2012|45) has no netlist, PCB or BOM; the AMS8E-8 board continued as issue 3, with an issue-4 working copy. The class-D thread resurfaced later as RD80, the QubeAmp class-D amplifier.</li>
    <li><b>The “bass boost” is a 6 dB shelf at a few kHz.</b> If R18 ∥ C17 sits in series with R1 (the only arrangement in which R4 = 10K balances the receiver), the shelf runs from about 3.1 to 6.2 kHz. That corrects baffle step and lowers the treble, rather than lifting deep bass ${inf}.</li>
    <li><b>It costs gain.</b> The new input resistors (68K) cut the receiver from −11.9 dB to −16.5 dB in the bass and −22.5 dB in the treble. A source that drove the speaker to clipping before now has 4.6 dB more headroom in the bass.</li>
    <li><b>Issue 4 adds tweeter capacitors.</b> Ams8e-8iss4.net (WORKING) adds C62/C63, 2.2 µF 100 V, between new connector P101 and P103/P104. In series with an 8 Ω tweeter that is a ≈ 9 kHz high-pass ${inf}.</li>
    <li><b>The netlist gain does not match the 2006 test sheet.</b> From the issue-3 values: −11.9 dB (NE5532) + 13.8 dB (LM4766) = +1.9 dB. The 19 Oct 2006 sheet records +7.8 dB. Either the test fed one leg or the sheet describes an earlier issue.</li>
    <li><b>Housekeeping.</b> The schematic title reads “Power Amo Bass Boost”. The op-amp is OP2 in the bass-boost sheet and U2 in issue 3. The RD50 file is identical to the copy in AMS81 …/WORKING/AMS8-8-Bass-Boost. <span class="mono">145_DM100_02.Manual.pdf</span> is a Dolby bitstream analyser manual and belongs with RD45/RD72. “TDA032D01” in the file name is the TI TPA032D01.</li>
    <li><b>Class-D numbers.</b> At 12 V into 8 Ω, the SSM3302 and TFA9810 give 7.5–8 W at 1 % THD, about half the LM4766’s 14 W. They would run cool but would lower the clip point unless the supply went up (the SSM3302 allows 18 V).</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Bass-boost topology and the added parts’ positions are inferred from values only.</li><li>±18 V rails are inferred from the 10.67 V rms clip; class-AB loss uses the textbook sine-wave formula.</li><li>Speaker box (baffle step) model and tweeter impedance are ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD50-ImproveSpeakerDesign/Ams8e-8_bassboost.sch · SSM3302.pdf · TFA9810 class D amp.pdf · TDA032D01 Class D module.pdf · UG-360.pdf</li><li>AMS81 - #Master/AMS8 - #Engineering/AMS8E - #PCB/Ams8e-8 - #PCB #ISS3/Ams8e-8iss3.net · -PNP.txt · WORKING/Ams8e-8iss4.net</li><li>siumulation-plugins/ams8e.js (test sheet 19 Oct 2006) · R&amp;D_List.xls (RD50, RD80)</li></ul>`);
}

SIM.register({
  id:'rd50-improvespeakerdesign', name:'RD50 Improve speaker design · AMS8E-8 bass boost and class-D model (2012|45)', duration:1,
  product:'RD50 Improve Speaker Design', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD50-ImproveSpeakerDesign',
  summary:'The 2012 attempt to improve the AMS8E monitor speakers. The AMS8E-8 amp board is drawn from its pick-and-place file and modelled from its netlist; switch in the bass-boost values to see the shelf it makes, check clipping headroom, and compare the class-D amplifiers in the folder.',
  highlights:['AMS8E-8 board from the PNP file, clickable parts','Issue 3 vs bass-boost frequency response','Headroom to the LM4766 clip point','Class AB vs three class-D parts: heat per channel','Issue-4 tweeter capacitors found in the netlist'],
  depth:'Hardware model',
  stepUnits:[{label:'1 tone cycle',period:()=>1/D.f},{label:'1 ms',period:()=>0.001},{label:'1 mains half-cycle',period:()=>1/120}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.03,'30 ms'],[0.005,'5 ms'],[0.00001,'10 µs']],
  defaultZoom:2,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the speaker study', render:viewTutorial},
    {id:'second', label:'One second, stage by stage', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Signal path', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
