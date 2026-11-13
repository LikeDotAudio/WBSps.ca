/* =====================================================================
   RD47 — Analog to SDI video (Ward-Beck R&D register, Wayne / engineering, status "?")
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (XXX - ENGINEERING - 2016 RD FILES/RD47-AnalogToSDIVideo/):
   - Specifications and Requirements.xlsx (11 Jun 2012): interface with the Rushworks unit;
       4x component and composite analog video inputs, 4x SDI outputs; target production cost $250;
       AC power; POD metalwork est. $12; labour AMS16 $40, average POD $17
   - Analog2DigiIC/TDA9955HL.pdf (NXP, Rev. 01, 17 Mar 2008): triple 8-bit ADC, up to 170 MHz,
       1 V p-p input, two RGB/YPbPr sources (SOG1/2, HCSYNC1/2, VSYNC1/2), 4:2:2 BT.656 output with
       SAV/EAV, I2C slave 1001 11A0, MCLK 13.5 MHz, registers PLL_MNDIV_MSB 11h, PLL_NDIV_LSB 12h
       (default NDIV 360h), BRIGHT_* 1Ah–1Ch, matrix 81h–9Eh, V_PER/H_PER/HS_WIDTH 40h–44h,
       pin list (VPA/VPB/VPC, VCLK, HREF, VREF, DE, VAI_N, A0, SCL, SDA), 750 mW typ at 170 MHz
   - POD face size (217.7 × 40.8 mm) from siumulation-plugins/pod1-pod18-redesign.js (silk at 200 dpi)
   The POD panels are a concept drawn to that size; connector placement is inferred.
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
const STD = { ntsc:{name:'480i 59.94 (NTSC)', lines:525, fps:30000/1001, ppl:858, act:720}, pal:{name:'576i 50 (PAL)', lines:625, fps:25, ppl:864, act:720} };
const MCLK = 13.5e6;
const SIGS = { bars:'100 % colour bars', ramp:'luma ramp', black:'black' };
const BARS = [1,0.886,0.701,0.587,0.413,0.299,0.114,0];          // BT.601 Y of white … blue, black
const TYPES = { ypbpr:'Component YPbPr', cvbs:'Composite (CVBS)', off:'not used' };
const D0 = () => ({ std:'ntsc', sel:0, ch:[{type:'ypbpr',sig:'bars'},{type:'cvbs',sig:'bars'},{type:'ypbpr',sig:'ramp'},{type:'off',sig:'black'}], gainmV:1000, clamp:16, labour:17, adc:0, dec:0, ser:0, misc:0 });
const D = D0();
function reset(){ Object.assign(D, D0()); LOG.items=[]; SIM.refresh(); }
const S = () => STD[D.std];
function regs(){ const s=S(); const nd=s.ppl; return [
  ['11h','PLL_MNDIV_MSB',`MDIV=0, NDIV[11:8]=${(nd>>8)&0xF}`, (nd>>8)&0xF],
  ['12h','PLL_NDIV_LSB',`NDIV[7:0]=${hex2(nd)}h → ${nd} pixels/line`, nd&0xFF],
  ['1Ah','BRIGHT_GY',`Y clamp code ${D.clamp}`, D.clamp],
  ['1Bh','BRIGHT_BU','Cb clamp 80h (mid)', 0x80], ['1Ch','BRIGHT_RV','Cr clamp 80h (mid)', 0x80],
  ['9Fh','MAT_BYPASS','YPbPr in → YCbCr out: matrix bypass '+'(inferred bit use)', 0x01],
]; }
/* ADC: 1 V p-p full scale (datasheet), gain trims the span; 8-bit code */
function adcCode(v){ return clamp(Math.round(D.clamp + v/(D.gainmV/1000)*255*(219/255)), 0, 255); }
function lineY(x, sig){ if (sig==='black') return 0; if (sig==='ramp') return x; return BARS[Math.min(7,Math.floor(x*8))]*0.7/0.7; }
function chanState(i){ const c=D.ch[i]; const ok = c.type==='ypbpr'; return { ok, why: c.type==='cvbs'? 'TDA9955 has no composite decoder (no Y/C separation, no colour subcarrier demod)' : c.type==='off'? 'unused' : 'locked' }; }
function budget(){ const parts = 4*(D.adc+D.dec+D.ser) + D.misc; const left = 250 - 12 - D.labour; return { left, parts, perCh: left/4, over: parts>left }; }
function xyz(F,V,H){ const P3=V^H, P2=F^H, P1=F^V, P0=F^V^H; return (1<<7)|(F<<6)|(V<<5)|(H<<4)|(P3<<3)|(P2<<2)|(P1<<1)|P0; }
function posAt(t){ const s=S(), Tl=1/(s.fps*s.lines); const n=Math.floor(t/Tl); const line=n%s.lines+1, frame=Math.floor(n/s.lines); const x=(t-n*Tl)/Tl;
  const F = s===STD.ntsc ? (line>=266||line<4?1:0) : (line>=313?1:0); const V = s===STD.ntsc ? ((line<=19)||(line>=264&&line<=282)?1:0) : ((line<=22)||(line>=311&&line<=335)?1:0);
  return { line, frame, x, F, V, Tl, pix: Math.floor(x*s.ppl) }; }

const A = {
  sel(i){ act('Select channel '+(i+1), tr=>{ D.sel=i; const c=D.ch[i], st=chanState(i); tr(`IN ${i+1}: ${TYPES[c.type]}, ${SIGS[c.sig]} → ${st.ok?'TDA9955 #'+(i+1)+' locked':st.why}`); tr(`I2C address: A0 pin selects 1001 11${i%2}x → 0x${hex2(0x98|(i%2)<<1)} write; two parts per I2C bus (only one A0 pin)`); }); },
  type(i){ act(`IN ${i+1} input type`, tr=>{ const order=['ypbpr','cvbs','off']; const c=D.ch[i]; c.type=order[(order.indexOf(c.type)+1)%3]; D.sel=i; const st=chanState(i);
    tr(`IN ${i+1} → ${TYPES[c.type]}`); tr(c.type==='cvbs'? '<b style="color:var(--bad)">no picture</b>: '+st.why+'. The requirement “component and composite” needs a separate video decoder per channel.' : st.why); }); },
  sig(v){ act('Test signal → '+SIGS[v], tr=>{ D.ch[D.sel].sig=v; tr(`IN ${D.sel+1} now carries ${SIGS[v]}`); }); },
  std(v){ act('Standard → '+STD[v].name, tr=>{ D.std=v; const s=S(); tr(`write PLL_MNDIV_MSB (11h) / PLL_NDIV_LSB (12h): NDIV = ${s.ppl} = 0x${s.ppl.toString(16).toUpperCase()}`); tr(`power-on default NDIV = 360h = 864 (576i); ${v==='ntsc'?'NTSC must overwrite it with 35Ah = 858':'PAL can keep the default'}`);
    tr(`H_PER read-back = MCLK / line rate = ${(MCLK/(s.fps*s.lines)).toFixed(1)} counts; V_PER (two fields) = ${Math.round(MCLK/s.fps).toLocaleString()} counts`); }); },
  gain(v){ act(`ADC span → ${v} mV`, tr=>{ D.gainmV=v; tr(`peak white 700 mV → code ${adcCode(0.7)} (BT.601 white = 235)`); tr(`one LSB = ${(v/255).toFixed(2)} mV vs 10-bit SDI step ${(700/876).toFixed(2)} mV`); }); },
  cost(k,v){ act(`Cost ${k} → $${v}`, tr=>{ D[k]=v; const b=budget(); tr(`$250 − $12 metalwork − $${D.labour} labour = $${b.left} for parts; this BOM $${b.parts} → ${b.over?'<b style="color:var(--bad)">over target</b>':'within target'}`); }); },
};

/* ---------------- panels: POD concept, drawn to POD face size ---------------- */
const MM = 4;   // svg units per mm; face 217.7 × 40.8 mm
function rearSVG(){
  const W=217.7*MM, H=40.8*MM; let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;border-radius:8px" role="img" aria-label="RD47 concept rear panel, POD size">
    <rect width="${W}" height="${H}" rx="6" fill="var(--dev)"/><text x="10" y="16" font-size="11" fill="#cfd3d6">RD47 CONCEPT · REAR</text>`;
  const pitch=13.5*MM;
  for (let i=0;i<4;i++){ const c=D.ch[i], st=chanState(i), x0=8*MM+i*3*pitch*0.98;
    ['Y/CVBS','Pb','Pr'].forEach((lab,k)=>{ const x=x0+k*pitch*0.9+6*MM, y=17*MM, used=c.type==='ypbpr'||(c.type==='cvbs'&&k===0);
      s+=`<g data-a="type" data-v="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${4.8*MM}" fill="#c9b469" stroke="${D.sel===i?'var(--accent)':'#7a5f12'}" stroke-width="${D.sel===i?5:2}" opacity="${used?1:.35}"/><circle cx="${x}" cy="${y}" r="${1.6*MM}" fill="#3a3220"/><text x="${x}" y="${y-6*MM}" font-size="10" text-anchor="middle" fill="#cfd3d6">${lab}</text><title>IN ${i+1} ${lab} — click to change input type</title></g>`; });
    const sx=x0+1.0*pitch*0.9+6*MM, sy=33*MM;
    s+=`<g data-a="sel" data-v="${i}" style="cursor:pointer"><circle cx="${sx}" cy="${sy}" r="${4.8*MM}" fill="#c9b469" stroke="${st.ok?'#1f7a4d':'#7a2a24'}" stroke-width="4"/><circle cx="${sx}" cy="${sy}" r="${1.6*MM}" fill="#3a3220"/><text x="${sx+6*MM}" y="${sy+3}" font-size="10" fill="#cfd3d6">SDI ${i+1}</text></g>
      <text x="${x0+6*MM-14}" y="${H-4}" font-size="10" fill="${st.ok?'#7dff6a':c.type==='off'?'#888':'#ff8a7a'}">IN ${i+1}: ${TYPES[c.type]}</text>`; }
  s+=`<rect x="${W-26*MM}" y="${10*MM}" width="${20*MM}" height="${14*MM}" rx="4" fill="#111" stroke="#666"/><text x="${W-16*MM}" y="${29*MM}" font-size="10" text-anchor="middle" fill="#cfd3d6">AC IN</text>`;
  return s+`</svg><p class="small muted">Drawn to the POD face size (217.7 × 40.8 mm). 12 input + 4 output BNC at ≈ 13 mm pitch and the AC inlet are a layout guess (inferred). Click an input BNC to change its type, an SDI BNC to select the channel.</p>`;
}
function frontSVG(){
  const W=217.7*MM, H=40.8*MM; let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;border-radius:8px;margin-bottom:6px" role="img" aria-label="RD47 concept front panel">
    <rect width="${W}" height="${H}" rx="6" fill="#d9dbdc"/><text x="12" y="${H/2+5}" font-size="20" font-weight="700" fill="#222">ANALOG → SDI ×4</text><text x="12" y="${H/2+24}" font-size="10" fill="#333">concept (RD47, 2012|45)</text>`;
  for (let i=0;i<4;i++){ const st=chanState(i), x=W*0.5+i*20*MM, on = st.ok && Math.floor(SIM.t*4)%8!==7;
    s+=`<g data-a="sel" data-v="${i}" style="cursor:pointer"><circle cx="${x}" cy="${H*0.42}" r="${2.4*MM}" fill="${st.ok?(on?'#3ddc6a':'#1d5a2c'):D.ch[i].type==='off'?'#555':'#d23'}" stroke="${D.sel===i?'#0d5c8c':'#444'}" stroke-width="${D.sel===i?4:1.5}"/><text x="${x}" y="${H*0.78}" font-size="11" text-anchor="middle" fill="#222">CH ${i+1}</text></g>`; }
  return s+`<circle cx="${W-12*MM}" cy="${H*0.42}" r="${2.2*MM}" fill="#3ddc6a"/><text x="${W-12*MM}" y="${H*0.78}" font-size="10" text-anchor="middle" fill="#222">POWER</text></svg>`;
}
function scopeSVG(){
  const c=D.ch[D.sel], st=chanState(D.sel), s=S(), W=640, H=230, L=40, R=10;
  const X=x=>L+x*(W-L-R), Yv=v=>150-v*170;   // volts: -0.3 … 0.75
  let p=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">`;
  [0,0.3,0.7].forEach(v=>p+=`<line x1="${L}" y1="${Yv(v)}" x2="${W-R}" y2="${Yv(v)}" stroke="var(--grid)"/><text x="${L-4}" y="${Yv(v)+3}" font-size="10" text-anchor="end" fill="var(--ink2)">${v*1000}</text>`);
  let a='', d='';
  const syncEnd=4.7/63.556, actS=10.9/63.556;
  for (let i=0;i<=400;i++){ const x=i/400; let v; if (x<syncEnd) v=-0.3; else if (x<actS) v=0; else v=0.7*lineY((x-actS)/(1-actS), c.sig);
    if (c.type==='cvbs' && x>actS && c.sig==='bars') v += 0.15*Math.sin(2*Math.PI*227.5*x)*(BARS[Math.min(7,Math.floor((x-actS)/(1-actS)*8))]>0&&BARS[Math.min(7,Math.floor((x-actS)/(1-actS)*8))]<1?1:0);
    if (c.type==='cvbs' && x>syncEnd+0.01 && x<syncEnd+0.05) v += 0.14*Math.sin(2*Math.PI*227.5*x);
    a += (i?'L':'M')+X(x).toFixed(1)+','+Yv(c.type==='off'?0:v).toFixed(1); }
  for (let i=0;i<=200;i++){ const x=actS+(1-actS)*i/200; const code=adcCode(0.7*lineY(i/200,c.sig)); d += (i?'L':'M')+X(x).toFixed(1)+','+(Yv(0)-(code-16)/219*0.7*170).toFixed(1); }
  p+=`<path d="${a}" fill="none" stroke="var(--accent2)" stroke-width="1.6"/>`;
  if (st.ok) p+=`<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="1 0"/>`;
  else if (c.type==='cvbs') p+=`<text x="${X(0.35)}" y="${Yv(0.38)}" font-size="13" fill="var(--bad)" font-weight="700">TDA9955 cannot decode composite</text>`;
  p+=`<text x="${L}" y="14" font-size="11" fill="var(--ink2)">IN ${D.sel+1} one line (${(1/(s.fps*s.lines)*1e6).toFixed(2)} µs): blue = analog (mV) · green = 8-bit codes after the TDA9955 (16 = black, 235 = white)</text>
    <text x="${L}" y="${H-8}" font-size="10.5" fill="var(--ink2)">peak white → code ${adcCode(0.7)} · LSB ${(D.gainmV/255).toFixed(2)} mV (8-bit) vs ${(700/876).toFixed(2)} mV (10-bit SDI) · H sync 4.7 µs</text></svg>`;
  return p;
}
function ctlHTML(){
  const c=D.ch[D.sel], b=budget();
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px"><span class="small muted">IN ${D.sel+1} signal</span>${Object.keys(SIGS).map(k=>`<button data-a="sig" data-v="${k}" class="${c.sig===k?'on':''}">${SIGS[k]}</button>`).join('')}
    <span class="small muted" style="margin-left:8px">standard</span>${Object.keys(STD).map(k=>`<button data-a="std" data-v="${k}" class="${D.std===k?'on':''}">${STD[k].name}</button>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:6px"><label class="small">ADC span <input type="range" min="700" max="1000" step="10" value="${D.gainmV}" data-r="gain"> <span class="mono">${D.gainmV} mV</span></label></div>`;
}
function costHTML(){
  const b=budget(), row=(k,label,max)=>`<label class="small" style="display:block">${label} <input type="range" min="0" max="${max}" value="${D[k]}" data-c="${k}"> <span class="mono">$${D[k]}</span></label>`;
  return kv([['Target production cost','$250 (sheet)'],['POD metalwork','$12 (sheet)'],['Labour',`$${D.labour} — <button data-a="lab" data-v="17" class="${D.labour===17?'on':''}">POD avg $17</button> <button data-a="lab" data-v="40" class="${D.labour===40?'on':''}">AMS16 $40</button>`],['Left for parts',`<b>$${b.left}</b> = $${b.perCh.toFixed(2)} per channel`]])+
    `<p class="small">Per-channel part prices are not in the archive ${inf}; set them to test the target:</p>${row('adc','TDA9955HL',40)}${row('dec','composite decoder',40)}${row('ser','SDI serialiser + driver',40)}${row('misc','PSU, MCU, PCB, BNC (whole unit)',150)}
    <p class="small" style="color:${b.over?'var(--bad)':'var(--accent)'}">Parts $${b.parts} of $${b.left} → ${b.over?'over the $250 target by $'+(b.parts-b.left):'$'+(b.left-b.parts)+' to spare'}</p>`;
}
function bindAll(root){ bindActs(root,{ sel:v=>A.sel(+v), type:v=>A.type(+v), sig:v=>A.sig(v), std:v=>A.std(v), lab:v=>A.cost('labour',+v) });
  root.querySelectorAll('input[data-r="gain"]').forEach(r=>r.onchange=()=>A.gain(+r.value));
  root.querySelectorAll('input[data-c]').forEach(r=>r.onchange=()=>A.cost(r.dataset.c,+r.value)); }

function lanes(){
  const s=S(), css=SIM.css, Tl=1/(s.fps*s.lines), Tfld=1/(2*s.fps);
  return [
    {label:`Fields (${(2*s.fps).toFixed(2)} Hz)`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,Tfld,0,Tfld*(s===STD.ntsc?20:25)/(s.lines/2),css('--accent2'),'fields (V blank shaded)'); }},
    {label:`Lines (${(1/Tl).toFixed(1)} Hz)`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,Tl,0,4.7e-6,css('--ink2'),'H sync'); }},
    {label:'EAV / SAV codes (BT.656)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,Tl,0,4/27e6,css('--warn'),'EAV'); SIM.pulses(c,X,t0,t1,y,h,Tl,(s.ppl-720)*2/27e6-4/27e6,4/27e6,css('--accent'),'SAV'); }},
    {label:'Pixel clock 13.5 MHz (VCLK)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/13.5e6,0,0.5/13.5e6,css('--ink2'),'pixels'); }},
    {label:'BT.656 words 27 MHz (Cb Y Cr Y)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/27e6,0,0.5/27e6,css('--accent'),'words'); }},
    {label:'SDI bits 270 Mb/s (10 per word)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/270e6,0,0.5/270e6,css('--bad'),'bits'); }},
    {label:'I²C set-up at power-on (400 kbit/s)', h:22, draw(c,X,t0,t1,y,h){ const n=regs().length*4; for (let k=0;k<n;k++){ const a=k*27/400e3+0.001; if (a>t1||a+27/400e3<t0) continue; bandAt(c,X,a,a+27/400e3*0.9,y,h,css('--warn'),.7); } laneText(c,X,Math.max(t0,0.004),y,h,`${n} writes × 27 bits for 4 channels ≈ ${(n*27/400).toFixed(1)} ms`); }},
  ];
}
function viewSim(m){
  m.innerHTML = `${card('Concept POD — front and rear (click to drive the model)', `<div id="fp"></div><div id="rp"></div>`)}
    <div class="grid2"><div>${card('One video line through the selected channel', `<div id="sc"></div><div id="ctl"></div>`)}</div><div>${card('Can it make $250?', `<div id="cost"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('One second of video, line by line', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const fp=m.querySelector('#fp'); fp.innerHTML=frontSVG(); bindAll(fp); const rp=m.querySelector('#rp'); rp.innerHTML=rearSVG(); bindAll(rp);
    m.querySelector('#sc').innerHTML=scopeSVG(); const c=m.querySelector('#ctl'); if(!c.contains(document.activeElement)){ c.innerHTML=ctlHTML(); bindAll(c); }
    const co=m.querySelector('#cost'); if(!co.contains(document.activeElement)){ co.innerHTML=costHTML(); bindAll(co); }
    m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The request', body:`<p>June 2012|45. A customer with a Rushworks unit needed four analog video sources on SDI. The requirement sheet asks for <b>4 × component and composite inputs, 4 × SDI outputs, AC power, $250 production cost</b>, in a POD. Wayne’s candidate converter chip was the NXP TDA9955HL.</p>`, check:()=>true, auto:true },
  { title:'1 · A component input', body:`<p>Click the <b>SDI 1</b> connector (or the CH 1 LED). IN 1 is YPbPr colour bars: the trace shows the TDA9955 locking, and the scope shows the analog line and the 8-bit codes.</p>`, check:()=>D.sel===0, hint:'Click SDI 1 on the rear.' },
  { title:'2 · A composite input', body:`<p>Select <b>channel 2</b>, which is set to composite. The TDA9955 takes RGB or YPbPr only, so there is no picture: composite needs its own decoder chip.</p>`, check:()=>D.sel===1&&D.ch[1].type==='cvbs', hint:'Click SDI 2 or the CH 2 LED.' },
  { title:'3 · NTSC needs a register write', body:`<p>Switch the standard to <b>576i</b> and back to <b>480i</b>. The chip powers up with NDIV = 360h (864, the 576i line). NTSC needs 35Ah (858).</p>`, check:()=>D.std==='ntsc'&&LOG.items.some(e=>/576i/.test(e.name)), hint:'Press the PAL button, then the NTSC button.' },
  { title:'4 · 8 bits into a 10-bit link', body:`<p>Move the <b>ADC span</b> to 700 mV. White lands on code 235 at best. The TDA9955 has 8-bit ADCs, so the SDI output carries 8-bit video with two zero LSBs.</p>`, check:()=>D.gainmV<=720, hint:'Drag ADC span to 700.' },
  { title:'5 · Cost it', body:`<p>Choose the <b>AMS16 $40</b> labour figure, then set part prices. After metalwork and labour there is $198–$221 for four channels of decoder, ADC and serialiser.</p>`, check:()=>D.labour===40, hint:'Press “AMS16 $40”.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — scoping the converter', panelTitle:'Concept POD', reset,
  panel(el){ if (el.contains(document.activeElement)) return; el.innerHTML = rearSVG()+frontSVG()+scopeSVG()+ctlHTML()+`<details><summary class="small">Cost</summary>${costHTML()}</details>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('Events in one second (per channel)', `<div id="ev"></div>`)}<div class="grid2">${card('At the playhead', `<div id="ph"></div>`)}${card('Timing reference words', `<div id="tr"></div>`)}</div>`;
  const draw=()=>{ const s=S(), p=posAt(SIM.t);
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','period','×4 channels'],[
      ['Frames',s.fps.toFixed(3),SIM.fmtDur(1/s.fps),''],['Fields',(2*s.fps).toFixed(3),SIM.fmtDur(1/(2*s.fps)),''],['Lines',(s.fps*s.lines).toFixed(1),SIM.fmtDur(1/(s.fps*s.lines)),''],
      ['Pixels (VCLK)','13,500,000','74.07 ns',`${s.ppl} per line, 720 active`],['BT.656 words','27,000,000','37.04 ns','8-bit from the TDA9955'],['SDI bits','270,000,000','3.70 ns','1.08 Gb/s total out'],
      ['ADC samples (3 ADCs)','40,500,000','','three channels at 13.5 MHz each']].map(r=>r.map((c,i)=>i===1||i===2?`<span class="mono">${c}</span>`:c)));
    m.querySelector('#ph').innerHTML = kv([['Frame',p.frame,1],['Line',p.line+' of '+s.lines,1],['Field bit F',p.F,1],['V blank bit V',p.V,1],['Pixel',p.pix+' of '+s.ppl,1],['In active video',(p.pix>=s.ppl-720 && !p.V)?'yes':'no',1]]);
    const e=xyz(p.F,p.V,1), sv=xyz(p.F,p.V,0);
    m.querySelector('#tr').innerHTML = tbl(['','words (8-bit)','XY = 1 F V H P3 P2 P1 P0'],[['EAV',`<span class="mono">FF 00 00 ${hex2(e)}</span>`,`<span class="mono">${e.toString(2)}</span>`],['SAV',`<span class="mono">FF 00 00 ${hex2(sv)}</span>`,`<span class="mono">${sv.toString(2)}</span>`]])+`<p class="small muted">Bit layout from the TDA9955 SAV/EAV table; on SDI each word becomes 10 bits (3FF 000 000 XYZ). Line numbers for F and V follow BT.656 ${inf}.</p>`;
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    in:{x:20,y:40,w:150,h:80,t:'Analog in ×4',s:['YPbPr (3 BNC)','or CVBS (1 BNC)'],d:'Spec sheet: “4x Component and Composite analog video inputs”.'},
    dec:{x:210,y:150,w:170,h:70,t:'Composite decoder',s:['Y/C separation','not in RD47'],d:'Needed for CVBS; no part is named in the folder (inferred).', live:()=>D.ch.some(c=>c.type==='cvbs')},
    adc:{x:210,y:30,w:170,h:90,t:'TDA9955HL',s:['3 × 8-bit ADC, ≤170 MHz','clamp, gain, PLL','BT.656 out'],d:'NXP triple ADC for HDTV front ends; two analog sources, I²C controlled.', live:()=>D.ch.some(c=>c.type==='ypbpr')},
    ser:{x:430,y:30,w:170,h:90,t:'SDI serialiser',s:['10-bit parallel → 270 Mb/s','cable driver'],d:'Takes BT.656 (8 bits padded to 10) to SD-SDI. Part not named (inferred).'},
    out:{x:640,y:40,w:130,h:70,t:'SDI out ×4',s:['75 Ω BNC'],d:'To the Rushworks unit.'},
    mcu:{x:430,y:170,w:170,h:70,t:'Controller',s:['I²C master 400 kbit/s'],d:'Writes NDIV, clamps, matrix; reads V_PER/H_PER to detect the standard. MCU not named (inferred; WBS PODs used ATmega parts).'},
    psu:{x:640,y:170,w:130,h:70,t:'AC power',s:['1.8 V + 3.3 V'],d:'Spec sheet asks for AC power. TDA9955: 1.8 V core, 3.3 V I/O, 750 mW typ.'},
  };
  blockView(m,B,[['in','adc','YPbPr'],['in','dec','CVBS'],['dec','ser','656'],['adc','ser','BT.656 8-bit'],['ser','out',''],['mcu','adc','I²C'],['psu','mcu','']],{start:'adc',w:790,h:270,side:'<p>Each channel needs an ADC (component) or a decoder (composite), then a serialiser. The chip in the folder covers only the component half.</p>'});
}
const SHEETS=[
  { name:'1 · TDA9955HL', note:'Pin names and numbers from the TDA9955HL pin description (LQFP100). Only signal pins are drawn.', svg:()=>
    chip(320,40,220,'U1 TDA9955HL',[['SOG1 (48)','Y1 / G1'],['HCSYNC1 (59)','H/C sync 1'],['VSYNC1 (61)','V sync 1'],['SOG2 (47)','Y2 / G2'],['HCSYNC2 (60)',''],['VSYNC2 (62)',''],['MCLK (63)','13.5 MHz'],['SCL (69)','I2C_SCL'],['SDA (70)','I2C_SDA'],['A0 (67)','addr bit 0'],['CLAMP (64), COAST (65)','external mode']],
      [['VPA0–7 (76–85)','Y / CbYCrY'],['VPB0–7 (88–97)',''],['VPC0–7 (100, 1–11)',''],['VCLK (14)','pixel clock'],['HREF/HS (17)',''],['VREF/VS (16)',''],['FREF/CS (15)','field'],['DE (18)','data enable'],['VAI_N (19)','activity → LED']],'triple 8-bit ADC, 1.8 V / 3.3 V') },
  { name:'2 · One channel', note:'Concept chain; only U1 is from the archive. Decoder, serialiser and cable driver are placeholders (inferred).', svg:()=>
    chip(60,90,150,'J1–J3 BNC',[['Y','75 Ω'],['Pb',''],['Pr','']],[['to U1','AC-coupled']],'inferred') + chip(330,90,160,'U1 TDA9955HL',[['SOG1/B1/R1','']],[['VPA[7:0]','BT.656'],['VCLK','27 MHz']],'') + chip(620,90,170,'U2 serialiser',[['PD[9:2]','← VPA[7:0]'],['PD[1:0]','tied low'],['PCLK','← VCLK']],[['SDO','270 Mb/s → BNC']],'inferred') },
  { name:'3 · Power and I²C', note:'Supply rails and I²C addressing from the datasheet; with one A0 pin, only two TDA9955 can share a bus.', svg:()=>
    chip(100,80,200,'I²C bus A',[['SCL/SDA','400 kbit/s']],[['U1 A0=0','0x98/0x99'],['U5 A0=1','0x9A/0x9B']],'channels 1–2') + chip(480,80,200,'I²C bus B',[['SCL/SDA','']],[['U9 A0=0',''],['U13 A0=1','']],'channels 3–4') + `<text x="100" y="330" font-size="12" fill="var(--ink)">4 × TDA9955: 4 × 750 mW typ (945 max) at 170 MHz; far less at 13.5 MHz ${'(inferred)'}</text>` },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the TDA9955HL datasheet and the RD47 requirement sheet', 'No schematic was drawn for RD47. Sheet 1 is the candidate IC from its datasheet; sheets 2–3 are the concept around it.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Controller loop (step at the playhead)', `<div id="fl"></div>`)}${card('I²C set-up for the selected channel', `<div id="rg"></div>`)}</div>`;
  const draw=()=>{ const s=S();
    const st=['power-on: hold RESET, wait for 1.8 / 3.3 V', `for ch 1–4: address 0x${hex2(0x98)} / 0x${hex2(0x9A)} on bus A/B`, 'write 11h/12h: PLL NDIV', 'write 1Ah–1Ch: clamp levels', 'write 81h–9Fh: colour matrix / bypass', 'read 40h–44h: V_PER, H_PER, HS_WIDTH', `H_PER ≈ ${(MCLK/(s.fps*s.lines)).toFixed(0)}? → standard ok`, 'VAI_N low? → channel LED on', 'every 100 ms: re-read activity '+'(inferred)'];
    m.querySelector('#fl').innerHTML = flowSVG(st, Math.floor(SIM.t*10)%st.length);
    m.querySelector('#rg').innerHTML = tbl(['reg','name','value','meaning'], regs().map(r=>[`<span class="mono">${r[0]}</span>`,r[1],`<span class="mono">${hex2(r[3])}h</span>`,r[2]]))+`<p class="small muted">Register names and addresses from the datasheet; values for this model.</p>`;
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD47 decided, and what became of it', `<ol>
    <li><b>Outcome: not built.</b> The register leaves RD47 at “?”. The folder has the one-page requirement sheet (11 Jun 2012|45) and one datasheet. No schematic, BOM or quote followed. Ward-Beck’s analog video line stayed DAs (AV6201/AV6202 openGear, POD15A) and SDI DAs.</li>
    <li><b>The candidate chip covers only half the requirement.</b> The TDA9955HL digitises RGB or YPbPr. It has no composite decoder, so “component and composite” inputs need a second chip per channel.</li>
    <li><b>8 bits into 10-bit SDI.</b> The TDA9955 ADCs are 8-bit; SD-SDI carries 10-bit words. Each LSB is ${(1000/255).toFixed(2)} mV at full span against ${(700/876).toFixed(2)} mV for 10-bit video.</li>
    <li><b>Power-on default is the 576i line.</b> NDIV resets to 360h = 864 pixels (PAL). An NTSC box must write 35Ah = 858 at every power-up.</li>
    <li><b>Two parts per I²C bus.</b> There is a single address pin (A0), so four channels need two buses or a mux.</li>
    <li><b>The money.</b> $250 − $12 metalwork − $17 labour leaves $221 for parts, about $55 per channel for ADC or decoder, serialiser, cable driver and connectors. The sheet itself asks whether $17 is right, quoting $40 for the AMS16.</li>
    <li><b>Sixteen BNCs fit a POD rear.</b> 12 inputs (YPbPr ×4) and 4 outputs in two rows at ≈ 13 mm pitch fit the 217.7 mm face with room for the AC inlet ${inf}.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Panel layout, decoder and serialiser parts, and the controller are not in the archive ${inf}.</li><li>BT.656 F/V line numbers and colour-bar levels are standard values, not from RD47 ${inf}.</li><li>The MAT_BYPASS bit use is read from the register name only ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD47-AnalogToSDIVideo/Specifications and Requirements.xlsx</li><li>RD47-AnalogToSDIVideo/Analog2DigiIC/TDA9955HL.pdf</li><li>siumulation-plugins/pod1-pod18-redesign.js (POD face 1714 × 321 px at 200 dpi) · R&amp;D_List.xls</li></ul>`);
}

SIM.register({
  id:'rd47-analogtosdivideo', name:'RD47 Analog to SDI video · 4-channel POD concept (2012|45)', duration:1,
  product:'RD47 Analog to SDI', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD47-AnalogToSDIVideo',
  summary:'The 2012 concept for a four-channel analog-to-SDI POD, modelled around the TDA9955HL converter in the folder. Pick inputs on a POD-size rear panel, watch a line being digitised, step through the I²C set-up, and test the $250 cost target.',
  highlights:['POD-size concept panels that drive the model','Analog line vs 8-bit codes on a scope','EAV/SAV words live at the playhead','TDA9955 register set-up and NDIV default','$250 cost target calculator'],
  depth:'Hardware model',
  stepUnits:[{label:'1 line',period:()=>1/(S().fps*S().lines)},{label:'1 field',period:()=>1/(2*S().fps)},{label:'1 µs',period:()=>1e-6}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1/59.94,'1 field'],[0.0002,'3 lines'],[0.000004,'4 µs']],
  defaultZoom:2,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: scoping it', render:viewTutorial},
    {id:'second', label:'One second of video', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
