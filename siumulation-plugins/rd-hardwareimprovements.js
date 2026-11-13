/* =====================================================================
   RD - HardwareImprovements (Ward-Beck R&D folder, not a numbered register item)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Component-sourcing research, 2011|44–2012|45. Sources (all in RD - HardwareImprovements/):
   - HardwareImprovements.xlsx: sheets Power (LM2647, LP3878-ADJ), PLL (CY22394), AnalogAudio (LM833,
       DG441B/442B), CAN TXRX (MAX3058/3059), SDI (M21424, LMH0387)
   - BM-SDI2Audio/bmd.xls: reference designators → parts of a studied SDI-to-audio board
       (U20 M21424, U27 LMH0341, U2 CS4265, U5 LP3878, U1 LM2647, U10 LM833, U24 441B, U8 CY7C68013A,
        U17 LP38693, U13 CY22394, U3 M24C64, U12 MAX3058; blank rows under a part)
   - YB-MuxDemux/pdm1284b.xls + top.jpg / bottom.jpg: numbered placement map of a studied mux/demux
       board (top 1–13, bottom 1–5) — redrawn here from the two images' coordinates
   - Oscillators/Task.xlsx (2012-09-25: quote ~60 ¢ cheaper than the last batch; EAU 200 pcs/yr each of
       "24.256" and 12.288 MHz), TranskoPrices_G1088-Ward Beck.pdf (TSMV-H50CQ33ST5C VCXO, 12.288 / 24.576 /
       22.5792 MHz, $1.32 at 1000, 8 weeks, 26 Sep 2012), tsmv.pdf (VCXO family spec)
   - Datasheets: LP3878-ADJ (VADJ 1.00 V, 800 mA, dropout 475 mV typ @ 800 mA, 18 µVrms, 2.5–16 V),
       LM2647 (5.5–28 V, 200–500 kHz dual synchronous buck, FB 0.6 V), M21424 (2.97 Gb/s 100 m, 1.485 Gb/s
       200 m, 270 Mb/s 400 m on Belden 1694A; 120 m / 300 m on 8281)
   People's names and e-mail addresses in Task.xlsx and the quote are not reproduced.
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
/* BM-SDI2Audio board: designators in sheet order; a blank row is read as another instance of the part above (inferred) */
const BM = [['U20','M21424','SDI cable equaliser'],['U31','M21424',''],['U27','LMH0341','SDI deserialiser'],['U2','CS4265','stereo audio codec (DAC)'],['U9','CS4265',''],
  ['U5','LP3878','LDO'],['U6','LP3878',''],['U7','LP3878',''],['U26','LP3878',''],['U1','LM2647','dual buck controller'],['U10','LM833','dual audio op-amp'],['U16','LM833',''],['U21','LM833',''],['U32','LM833',''],
  ['U24','DG441B','analog switch'],['U25','DG441B',''],['U35','DG441B',''],['U36','DG441B',''],['U37','DG441B',''],['U38','DG441B',''],['U39','DG441B',''],['U40','DG441B',''],
  ['U8','CY7C68013A','USB controller'],['U17','LP38693','LDO'],['U13','CY22394','3-PLL clock'],['U3','M24C64','64 kbit EEPROM'],['U12','MAX3058','CAN transceiver']];
/* YB-MuxDemux placement maps, from top.jpg / bottom.jpg pixel boxes (board outline 155,118 – 850,587) */
const YB_TOP = [[1,'LP38691','LDO',208,247,16,16],[2,'LP3878','LDO',246,277,16,16],[3,'LMH0341','SDI deserialiser',261,186,38,38],[4,'(FPGA)','FPGA — part number left blank',382,201,98,99],[5,'SI5338','clock generator',374,133,38,30],
  [6,'ICS662-03','HDTV clock generator',442,133,38,30],[7,'SRC4184','4-channel SRC',540,171,38,38],[8,'MAX3042','RS-485/422 transmitter',540,239,38,23],[9,'ISL32177','RS-485/422 receiver',518,300,38,22],[10,'LT3507','triple step-down regulator',208,398,38,22],
  [11,'C8051F346','MCU with USB',646,519,38,38],[12,'SST25VF016B','16 Mbit serial flash',631,443,38,38],[13,'(blank)','row 13 has no part',722,473,38,38]];
const YB_BOT = [[1,'LMH0302','SDI cable driver',215,436,30,30],[2,'LMH0344','SDI cable equaliser',223,511,30,30],[3,'ICS661','audio clock source',306,466,38,38],[4,'SRC4184','4-channel SRC',624,511,45,46],[5,'ADG1434','quad switch',616,413,30,30]];
const RATES = { '3G':[2.97e9,100,null], 'HD':[1.485e9,200,120], 'SD':[270e6,400,300] };
const D = { side:'top', pick:4, vin:5.0, r1:15, r2:10, iload:0.5, theta:40, tamb:40, bin:12, rt:4.5, rb:1, fsw:300e3, osc:12.288e6, vc:1.65, pull:100, rate:'HD', cable:'1694A', meters:150, ref48:0 };
function reset(){ Object.assign(D,{side:'top',pick:4,vin:5.0,r1:15,r2:10,iload:0.5,theta:40,tamb:40,bin:12,rt:4.5,rb:1,fsw:300e3,osc:12.288e6,vc:1.65,pull:100,rate:'HD',cable:'1694A',meters:150,ref48:0}); LOG.items=[]; SIM.refresh(); }
/* LP3878-ADJ */
const ldo = ()=>{ const vout=1.0*(1+D.r1/D.r2); const drop=D.iload<=0.0001?0.002:D.iload<=0.2?0.15*D.iload/0.2:0.15+(0.475-0.15)*(D.iload-0.2)/0.6; const ok=D.vin-vout>=drop && D.vin>=2.5 && D.vin<=16; const p=(D.vin-vout)*D.iload; return {vout, drop, ok, p, tj:D.tamb+p*D.theta, hd:D.vin-vout}; };
/* LM2647 */
const buck = ()=>{ const vout=0.6*(1+D.rt/D.rb); const duty=vout/D.bin; return {vout, duty, ok:D.bin>=5.5&&D.bin<=28&&duty<0.9, ton:duty/D.fsw}; };
/* VCXO */
const vcxo = ()=>{ const ppm=(D.vc-1.65)/1.35*D.pull; const f=D.osc*(1+ppm*1e-6); const div=Math.round(D.osc/48000)||256; const fs=f/(D.osc===22.5792e6?512:div); return {ppm,f,fs,div:D.osc===22.5792e6?512:div}; };
const A = {
  pick(side,i){ act(`Board part ${side} ${i}`, tr=>{ D.side=side; D.pick=i; const L=side==='top'?YB_TOP:YB_BOT; const p=L.find(x=>x[0]===i); tr(`pdm1284b.xls sheet ${side==='top'?'TOP':'Bottom'}, row ${i}: ${p[1]} — ${p[2]}`); tr(`placement box at ${p[3]},${p[4]} px in ${side}.jpg (board outline 155–850 × 118–587)`);
    const inBM=BM.some(b=>p[1].startsWith(b[1].slice(0,6))); tr(inBM?'Same part family also on the BM-SDI2Audio board':'Not on the BM-SDI2Audio board'); }); },
  ldo(k,d){ act(`LP3878 ${k} ${d>0?'+':'−'}`, tr=>{ const st={vin:0.1,r1:1,r2:1,iload:0.05,theta:5}[k]; D[k]=+clamp(D[k]+d*st, k==='vin'?2.5:k==='iload'?0:1, k==='vin'?16:k==='iload'?0.8:k==='theta'?120:100).toFixed(2); const L=ldo();
    tr(`Vout = VADJ (1.00 V) × (1 + R1/R2) = ${fmt(L.vout,3)} V`); tr(`dropout at ${fmt(D.iload*1000,0)} mA ≈ ${fmt(L.drop*1000,0)} mV (datasheet typ: 150 mV @ 200 mA, 475 mV @ 800 mA) → ${L.ok?'in regulation':'<b style="color:var(--bad)">DROPOUT</b>'}`); tr(`P = ${fmt(L.p,2)} W → Tj ≈ ${fmt(L.tj,0)} °C at θJA ${D.theta} °C/W ${inf}`); }); },
  buck(k,d){ act(`LM2647 ${k} ${d>0?'+':'−'}`, tr=>{ if (k==='fsw'){ D.fsw=clamp(D.fsw+d*50e3,200e3,500e3); } else { const st={bin:1,rt:0.1,rb:0.1}[k]; D[k]=+clamp(D[k]+d*st,k==='bin'?4:0.1,k==='bin'?30:20).toFixed(2); }
    const B=buck(); tr(`Vout = 0.6 V × (1 + Rt/Rb) = ${fmt(B.vout,2)} V; duty = ${fmt(B.duty*100,1)} %; f = ${D.fsw/1000} kHz (200–500 kHz)`); if (!B.ok) tr('<b style="color:var(--bad)">outside 5.5–28 V input range or duty too high</b>'); }); },
  osc(f){ act('VCXO → '+(f/1e6)+' MHz', tr=>{ D.osc=f; const V=vcxo(); tr(`TSMV-H50CQ33ST5C-${(f/1e6).toFixed(f===22.5792e6?4:3)}M: ${(f/1e6)} MHz = ${V.div} × ${f===22.5792e6?'44.1':'48'} kHz`); tr('Transko quote G1088: $1.32 each at 1000, 8 weeks lead time (26 Sep 2012)'); }); },
  vc(d){ act(`VCXO control ${d>0?'+':'−'}0.15 V`, tr=>{ D.vc=+clamp(D.vc+d*0.15,0.3,3.0).toFixed(2); const V=vcxo(); tr(`Vc = ${D.vc} V (range 1.65 ± 1.35 V for 3.3 V parts, tsmv.pdf) → ${fmt(V.ppm,1)} ppm → f = ${fmt(V.f/1e6,6)} MHz`); tr(`word clock = ${fmt(V.fs,3)} Hz`); }); },
  rate(r){ act('SDI rate '+r, tr=>{ D.rate=r; const R=RATES[r]; tr(`M21424: ${R[1]} m on Belden 1694A${R[2]?`, ${R[2]} m on 8281`:''}`); }); },
  meters(d){ act(`Cable ${d>0?'+':'−'}25 m`, tr=>{ D.meters=clamp(D.meters+d*25,0,500); const R=RATES[D.rate], lim=D.cable==='1694A'?R[1]:R[2]; tr(`${D.meters} m of ${D.cable} at ${D.rate}: ${lim==null?'no 8281 figure given for 3G':D.meters<=lim?'within the equaliser’s typical reach':'<b style="color:var(--bad)">beyond typical reach</b>'}`); }); },
  cable(){ act('Cable type', tr=>{ D.cable=D.cable==='1694A'?'8281':'1694A'; tr('Belden '+D.cable); }); },
};
/* ---------------- board drawing: YB-MuxDemux placement map, redrawn (top/bottom) ---------------- */
function boardSVG(){
  const L=D.side==='top'?YB_TOP:YB_BOT; let s=`<svg viewBox="140 100 730 505" style="width:100%;max-width:760px;display:block;background:var(--lane);border:1px solid var(--line);border-radius:8px" role="img" aria-label="YB-MuxDemux placement map">
    <rect x="155" y="118" width="695" height="469" fill="color-mix(in srgb,var(--accent) 12%,var(--panel2))" stroke="var(--ink)" stroke-width="3"/>
    <text x="165" y="580" font-size="13" fill="var(--ink2)">YB-MuxDemux ${D.side} (redrawn from ${D.side}.jpg, 23 May 2012) — click a part</text>`;
  L.forEach(p=>{ const on=D.pick===p[0]; s+=`<g data-a="pk" data-v="${D.side},${p[0]}" style="cursor:pointer"><rect x="${p[3]-p[5]/2}" y="${p[4]-p[6]/2}" width="${p[5]}" height="${p[6]}" fill="${on?'var(--accent)':'var(--panel)'}" stroke="var(--accent2)" stroke-width="2.5"/><text x="${p[3]}" y="${p[4]+4}" text-anchor="middle" font-size="12" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="${p[3]+p[5]/2+4}" y="${p[4]+4}" font-size="11" fill="var(--ink2)">${p[1]}</text></g>`; });
  return s+'</svg>';
}
function bmChainSVG(){
  const n=k=>BM.filter(b=>b[1]===k).length; const box=(x,y,w,t,sub,live)=>`<rect x="${x}" y="${y}" width="${w}" height="46" rx="6" fill="${live?'color-mix(in srgb,var(--accent) 18%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+8}" y="${y+19}" font-size="12" font-weight="700" fill="var(--ink)">${t}</text><text x="${x+8}" y="${y+36}" font-size="10.5" fill="var(--ink2)">${sub}</text>`;
  const ar=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#arH)"/>`;
  return `<svg viewBox="0 0 900 260" style="width:100%"><defs><marker id="arH" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    ${box(10,20,150,'SDI in ×'+n('M21424'),'M21424 EQ (U20, U31)',true)}${ar(160,43,190,43)}${box(190,20,150,'LMH0341','deserialiser (U27)',true)}${ar(340,43,370,43)}${box(370,20,150,'(FPGA)','not in the list '+'– inferred',false)}${ar(520,43,550,43)}
    ${box(550,20,150,'CS4265 ×'+n('CS4265'),'codec (U2, U9)',true)}${ar(700,43,730,43)}${box(730,20,160,'LM833 ×'+n('LM833'),'line drivers',true)}
    ${box(550,110,150,'DG441B ×'+n('DG441B'),'analog switches',false)}${ar(625,66,625,110)}
    ${box(10,110,150,'LM2647','dual buck (U1)',false)}${box(190,110,150,'LP3878 ×'+n('LP3878'),'+ LP38693 LDOs',false)}${ar(160,133,190,133)}
    ${box(370,110,150,'CY22394','3-PLL clocks (U13)',false)}${ar(445,110,445,66)}
    ${box(10,200,150,'CY7C68013A','USB (U8)',false)}${box(190,200,150,'MAX3058','CAN (U12)',false)}${box(370,200,150,'M24C64','EEPROM (U3)',false)}
    <text x="550" y="230" font-size="11" fill="var(--ink2)">bmd.xls: 27 designators, 12 part numbers</text></svg>`;
}
function bindAll(r){ bindActs(r,{ pk:v=>{ const [s,i]=v.split(','); A.pick(s,+i); }, side:v=>{ D.side=v; SIM.refresh(); }, l:v=>{ const [k,d]=v.split(','); A.ldo(k,+d); }, b:v=>{ const [k,d]=v.split(','); A.buck(k,+d); }, osc:v=>A.osc(+v), vc:v=>A.vc(+v), rate:v=>A.rate(v), m:v=>A.meters(+v), cab:()=>A.cable(), rst:()=>reset() }); }
function calcHTML(){
  const L=ldo(), B=buck(), V=vcxo(), R=RATES[D.rate], lim=D.cable==='1694A'?R[1]:R[2];
  const pm=(a,k,lbl,val)=>`<span class="small muted">${lbl} ${val}</span><button data-a="${a}" data-v="${k},-1">−</button><button data-a="${a}" data-v="${k},1">+</button>`;
  return `<h3>LP3878-ADJ LDO</h3><div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${pm('l','vin','Vin',D.vin+' V')}${pm('l','r1','R1',D.r1+' k')}${pm('l','r2','R2',D.r2+' k')}${pm('l','iload','I',fmt(D.iload*1000,0)+' mA')}${pm('l','theta','θJA',D.theta)}</div>
    ${kv([['Vout',`${fmt(L.vout,3)} V`,1],['Headroom / dropout',`${fmt(L.hd,2)} V / ${fmt(L.drop*1000,0)} mV → ${L.ok?'regulating':'<b style="color:var(--bad)">dropout</b>'}`,1],['Dissipation, Tj',`${fmt(L.p,2)} W, ${fmt(L.tj,0)} °C`,1],['Noise','18 µVrms (10 nF bypass, 100 Hz–100 kHz)',1]])}
    <h3>LM2647 buck</h3><div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${pm('b','bin','Vin',D.bin+' V')}${pm('b','rt','Rt',D.rt+' k')}${pm('b','rb','Rb',D.rb+' k')}${pm('b','fsw','fsw',D.fsw/1000+' kHz')}</div>
    ${kv([['Vout / duty',`${fmt(B.vout,2)} V / ${fmt(B.duty*100,1)} % ${B.ok?'':'<b style="color:var(--bad)">out of range</b>'}`,1]])}
    <h3>VCXO (Transko TSMV)</h3><div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center"><button data-a="osc" data-v="12288000" class="${D.osc===12.288e6?'on':''}">12.288</button><button data-a="osc" data-v="24576000" class="${D.osc===24.576e6?'on':''}">24.576</button><button data-a="osc" data-v="22579200" class="${D.osc===22.5792e6?'on':''}">22.5792</button><span class="small muted">Vc ${D.vc} V</span><button data-a="vc" data-v="-1">−</button><button data-a="vc" data-v="1">+</button></div>
    ${kv([['Pulled frequency',`${fmt(V.f/1e6,6)} MHz (${fmt(V.ppm,1)} ppm, ±${D.pull} ppm pull ${inf})`,1],['÷'+V.div,`${fmt(V.fs,3)} Hz word clock`,1]])}
    <h3>M21424 cable reach</h3><div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${Object.keys(RATES).map(r=>`<button data-a="rate" data-v="${r}" class="${D.rate===r?'on':''}">${r}</button>`).join('')}<button data-a="cab">Belden ${D.cable}</button><span class="small muted">${D.meters} m</span><button data-a="m" data-v="-1">−</button><button data-a="m" data-v="1">+</button></div>
    ${kv([['Typical reach',lim==null?'not given for 3G on 8281':`${lim} m — ${D.meters<=lim?'✓ within':'<b style="color:var(--bad)">✗ beyond</b>'}`,1]])}`;
}
function lanes(){
  const css=SIM.css, V=vcxo(), B=buck();
  return [
    {label:`VCXO ${fmt(V.f/1e6,4)} MHz`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/V.f,0,0.5/V.f,css('--accent'),'clock cycles'); }},
    {label:`÷${V.div} word clock ${fmt(V.fs,1)} Hz`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/V.fs,0,0.5/V.fs,css('--accent2'),'samples'); }},
    {label:'Drift vs a 48 kHz reference', h:22, draw(c,X,t0,t1,y,h){ const slip=Math.abs(V.fs-48000*(D.osc===22.5792e6?44.1/48:1)); laneText(c,X,t0,y,h, slip<1e-6?'locked (Vc centred)':`slips one sample every ${SIM.fmtDur(1/slip)} unless the PLL pulls Vc`, slip<1e-6?css('--ink2'):css('--warn')); }},
    {label:`LM2647 switching ${D.fsw/1000} kHz`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/D.fsw,0,B.ton,css('--warn'),'high-side on'); }},
    {label:`SDI ${D.rate} words`, h:22, draw(c,X,t0,t1,y,h){ const br=RATES[D.rate][0], w=D.rate==='SD'?10:20; SIM.pulses(c,X,t0,t1,y,h,w/br,0,1/br,css('--ink2'),'words'); }},
  ];
}
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('YB-MuxDemux board (studied) — placement map', `<div style="display:flex;gap:6px;margin-bottom:6px"><button data-a="side" data-v="top" class="${D.side==='top'?'on':''}">top</button><button data-a="side" data-v="bottom" class="${D.side==='bottom'?'on':''}">bottom</button></div><div id="bd"></div>`)}${card('BM-SDI2Audio board (studied) — signal chain from bmd.xls', `<div id="bm"></div>`)}</div>
    <div>${card('What the model did', `<div id="trace" class="log"></div>`)}${card('Candidate parts — live calculators', `<div id="calc"></div>`)}</div></div>
    ${card('Timeline — clocks, switching and data in one second', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const bd=m.querySelector('#bd'); bd.innerHTML=boardSVG(); bindAll(bd); m.querySelector('#bm').innerHTML=bmChainSVG(); m.querySelector('#trace').innerHTML=traceHTML(); const c=m.querySelector('#calc'); c.innerHTML=calcHTML(); bindAll(c);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); };
  bindAll(m); SIM.on('time',draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'What this folder was', body:`<p>In 2011|44–2012|45 engineering collected parts for improving existing boards: two competitor/partner boards were taken apart on paper (a “BM” SDI-to-audio box and a “YB” mux/demux), their parts tabulated, and the useful ones copied into <span class="mono">HardwareImprovements.xlsx</span>. Oscillator sourcing ran alongside.</p>`, check:()=>true, auto:true },
  { title:'1 · Read the YB board', body:`<p>Click part <b>4</b> on the top side: the FPGA, whose part number the sheet leaves blank. Then part <b>7</b>, the SRC4184 four-channel sample-rate converter.</p>`, check:()=>D.side==='top'&&D.pick===7, hint:'Click box 4, then box 7.' },
  { title:'2 · Size an LDO', body:`<p>The BM board uses four LP3878-ADJ. Set R1/R2 for <b>3.3 V</b> (R1 = 23 k, R2 = 10 k) and load it with 800 mA from 5 V: is there enough headroom over the 475 mV dropout, and how hot does it get?</p>`, check:()=>Math.abs(ldo().vout-3.3)<0.01&&D.iload>=0.8, hint:'R1 + until 23; I + until 800 mA.' },
  { title:'3 · Pull the VCXO', body:`<p>Choose the <b>12.288 MHz</b> VCXO (256 × 48 kHz). Move the control voltage off centre: the word clock drifts and would slip a sample every few seconds unless a PLL steers it, which is the job of a VCXO.</p>`, check:()=>D.osc===12.288e6&&D.vc!==1.65, hint:'12.288, then Vc + once.' },
  { title:'4 · Check cable reach', body:`<p>Pick <b>3G</b> and 150 m of Belden 1694A: beyond the M21424’s 100 m. Drop to 100 m.</p>`, check:()=>D.rate==='3G'&&D.meters<=100&&D.cable==='1694A', hint:'3G; Cable − twice.' },
  { title:'Done', body:`<p><b>Findings</b> explains the “24.256” typo and what the parts list really is.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m,LESSONS,tutor,{ title:'Tutorial — working through the parts study', panelTitle:'Board and calculators', reset, panel(el){ el.innerHTML=`<div style="display:flex;gap:6px;margin-bottom:6px"><button data-a="side" data-v="top">top</button><button data-a="side" data-v="bottom">bottom</button></div>`+boardSVG()+calcHTML(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML=card('One second of the candidate parts at work', `<div id="lad"></div>`);
  const draw=()=>{ const V=vcxo(); m.querySelector('#lad').innerHTML=tbl(['Event','per second','period','part'],[['VCXO cycles',Math.round(V.f).toLocaleString(),SIM.fmtDur(1/V.f),'Transko TSMV'],['Word clock',fmt(V.fs,2),SIM.fmtDur(1/V.fs),'÷'+V.div],['AES3 biphase cells',Math.round(V.fs*128).toLocaleString(),SIM.fmtDur(1/V.fs/128),'= VCXO ÷ 2 at 256·fs'],['Buck cycles',(D.fsw).toLocaleString(),SIM.fmtDur(1/D.fsw),'LM2647'],['SDI bits',RATES[D.rate][0].toLocaleString(),SIM.fmtDur(1/RATES[D.rate][0]),'M21424 / LMH0341']].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="mono">${r[2]}</span>`,r[3]])); };
  SIM.on('time',draw);
}
function viewBlock(m){
  blockView(m,{
    bm:{x:20,y:30,w:200,h:80,t:'BM-SDI2Audio',s:['27 designators','12 parts'],d:'bmd.xls with a datasheet set; “BM” is not expanded anywhere (the folder README guesses a competitor comparison, cf. RD36 Black Magic).'},
    yb:{x:20,y:170,w:200,h:80,t:'YB-MuxDemux',s:['18 placements','top + bottom map'],d:'pdm1284b.xls and two placement images (23 May 2012).'},
    hi:{x:300,y:100,w:200,h:100,t:'HardwareImprovements.xlsx',s:['Power · PLL · AnalogAudio','CAN · SDI'],d:'The shortlist: every entry except LMH0387 also appears on the BM board.'},
    osc:{x:300,y:260,w:200,h:80,t:'Oscillators',s:['12.288 / 24.576 / 22.5792','TSMV VCXO $1.32'],d:'Task.xlsx and the Transko quote: samples requested to cut cost on WBS audio clocks.'},
    wbs:{x:580,y:160,w:180,h:90,t:'WBS boards',s:['audio clocks 256·fs','SDI EQ, LDOs'],d:'The 12.288/24.576 MHz clocks feed designs like DEMUX-4’s aes_tx_clkdiv (counter wraps at 49 152 = 192 × 256) — see RD20.'},
  },[['bm','hi','parts'],['yb','hi',''],['hi','wbs','candidates'],['osc','wbs','clocks']],{start:'hi',h:380});
}
const SHEETS=[
  { name:'1 · LP3878-ADJ application', note:'From the LP3878-ADJ datasheet: VADJ = 1.00 V; Vout = 1.00 × (1 + R1/R2); bypass cap sets noise.', svg:()=>chip(330,80,180,'LP3878-ADJ',[['IN','Vin '+D.vin+' V'],['EN','to IN'],['BYPASS','10 nF']],[['OUT',fmt(ldo().vout,2)+' V'],['ADJ','R1 '+D.r1+'k / R2 '+D.r2+'k'],['GND','']],'800 mA LDO') },
  { name:'2 · LM2647 channel', note:'From the LM2647 datasheet: FB regulates at 0.6 V; 200–500 kHz; synchronous N-FETs.', svg:()=>chip(330,80,180,'LM2647 (one ch.)',[['VIN',D.bin+' V'],['FB1','0.6 V'],['SS1','0.1 µF']],[['HDRV1','high FET'],['LDRV1','low FET'],['SW1','L → '+fmt(buck().vout,2)+' V']],'dual sync buck') },
  { name:'3 · VCXO in a 256·fs PLL', note:`TSMV control range 1.65 ± 1.35 V (3.3 V parts). Loop filter and phase detector ${inf}.`, svg:()=>chip(140,100,150,'Phase detector',[['REF','48 kHz from video/AES'],['FB','÷256']],[['UP/DN','loop filter']],'(FPGA)')+chip(520,100,170,'TSMV VCXO',[['Vc',D.vc+' V']],[['OUT',fmt(vcxo().f/1e6,4)+' MHz']],'HCMOS, 3.3 V') },
];
function viewSchem(m){ sheetsView(m,SHEETS,'the folder datasheets','The folder has no WBS schematics; these are the datasheet application circuits for the candidate parts.'); }
function viewSoft(m){
  m.innerHTML=card('Part-number decode — TSMV-H50CQ33ST5C', tbl(['Field','Value','Meaning (tsmv.pdf)'],[['TSMV','model','VCXO family'],['H','output','HCMOS'],['50','?','stability ±50 ppm '+inf],['C','pull','±100 ppm (code C)'],['Q','?','not decoded '+inf],['33','supply','3.3 V'],['S','symmetry','45/55 %'],['T5C','?','packaging / temperature, not in the spec sheet '+inf]]))+
    card('BM → shortlist cross-check (what the model computes)', `<div id="cx"></div>`);
  const draw=()=>{ const short=['LM2647','LP3878','CY22394','LM833','DG441B','MAX3058','M21424','LMH0387']; m.querySelector('#cx').innerHTML=tbl(['Shortlist part','on BM board?','designators'],short.map(p=>{ const d=BM.filter(b=>b[1].startsWith(p.slice(0,6))).map(b=>b[0]); return [p,d.length?'yes':'<b>no</b>',d.join(', ')||'—']; })); };
  SIM.on('time',draw);
}
function viewFindings(m){
  m.innerHTML=card('What the folder decided, and what became of it',`<ol>
    <li><b>Not a numbered RD item.</b> It sits beside the register as “RD - HardwareImprovements”. Dates: datasheets and sheets 2011|44–2012|45; oscillator quote 26 Sep 2012|45.</li>
    <li><b>The shortlist is the BM board’s BOM.</b> Every part in HardwareImprovements.xlsx except the LMH0387 is on <span class="mono">bmd.xls</span>. The sheet is a teardown sorted into categories, not an independent selection.</li>
    <li><b>“24.256” is a typo for 24.576 MHz.</b> Task.xlsx asks for EAU 200 pcs/yr of “24.256” and 12.288 MHz; the Transko quote it refers to lists 12.288, 24.576 and 22.5792 MHz. 24.256 MHz is not an audio clock multiple; 24.576 = 512 × 48 kHz.</li>
    <li><b>The quote outcome:</b> ~60 ¢ below the last batch, $1.32 each at 1000, 8 weeks. The to-do left open is “test samples and approve its implementation”.</li>
    <li><b>Duplicate datasheets.</b> LM833, DG441B, LM2647, M21424, MAX3058 and CS4265 exist both at the top level and in BM-SDI2Audio (identical SHA-256 for those checked), LP3878-ADJ both in its own folder and in BM-SDI2Audio, LMH0341 in both board folders.</li>
    <li><b>YB board gaps.</b> Top row 4 (the FPGA) and row 13 have no part number; the “jpg” files are drawn placement maps, not photos.</li>
    <li><b>Where the clocks went.</b> 12.288/24.576 MHz is exactly what WBS audio FPGAs divide down: DEMUX-4’s <span class="mono">aes_tx_clkdiv.v</span> wraps a counter at 0xBFFF (49 152 = 192 frames × 256 clocks).</li>
    <li><b>Privacy:</b> the supplier contact’s name and e-mail in Task.xlsx and the quote are not reproduced.</li>
  </ol>`)+card('Assumptions',`<ul class="small"><li>Blank rows in bmd.xls are further instances of the part above (${inf}).</li><li>Dropout between datasheet points is interpolated; θJA is user-set (${inf}).</li><li>VCXO pull ±100 ppm (code C) and linear tuning (${inf}).</li></ul>`)+card('Sources',`<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD - HardwareImprovements/HardwareImprovements.xlsx, BM-SDI2Audio/bmd.xls, YB-MuxDemux/pdm1284b.xls, top.jpg, bottom.jpg, Oscillators/*, *.pdf</li><li>SA-DEMUX4 - #Master/DEMUX4 - #Engineering/Software/Xilinx/V020100-StandAlone/SourceFiles/Audio/aes_tx_clkdiv.v</li></ul>`);
}
SIM.register({
  id:'rd-hardwareimprovements', name:'RD Hardware Improvements · parts-sourcing study (2012|45)', duration:1,
  product:'RD - HardwareImprovements', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD - HardwareImprovements',
  summary:'Engineering’s 2011–2012 component study: two outside boards tabulated part by part, a shortlist of regulators, clocks, SDI and audio parts, and an oscillator quote. The model redraws the studied board, chains the SDI-to-audio parts, and runs the LDO, buck, VCXO and cable-reach numbers from the datasheets.',
  highlights:['YB-MuxDemux placement map, clickable','BM-SDI2Audio signal chain from its BOM','LP3878 / LM2647 / VCXO / M21424 calculators','The “24.256 MHz” typo explained','Shortlist = teardown BOM finding'],
  depth:'Hardware model',
  stepUnits:[{label:'1 VCXO cycle',period:()=>1/vcxo().f},{label:'1 word clock',period:()=>1/vcxo().fs},{label:'1 buck cycle',period:()=>1/D.fsw},{label:'1 ms',period:()=>0.001}],
  zooms:[[1,'1 s'],[0.001,'1 ms'],[0.00005,'50 µs'],[2e-6,'2 µs'],[2e-7,'200 ns']],
  defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: the parts study',render:viewTutorial},{id:'second',label:'One second of clocks',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
