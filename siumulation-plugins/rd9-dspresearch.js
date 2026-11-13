/* =====================================================================
   RD9 — DSP Research (Ward-Beck R&D register, status "Z" = completed)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD9 is a reading library (Peter, Ali) on Analog Devices DSPs: SHARC ADSP-21065L and ADSP-2126x
   datasheets, the 21065L EZ-KIT Lite manual, VisualDSP++ C-runtime / loader / linker manuals,
   app notes (EE-232 SRU, EE-33 timer, interrupt dispatchers), the 21065L Audio Tutorial, plus the
   16-bit ADSP-2100 family manuals. It is the groundwork for every WBS SHARC product: SLM-1 (21065L,
   then 21262), AMS81 / AMS8-2 (21065L), M6205C200 (21262), 32ME. The plugin models the question the
   library answers: how many cycles does one audio sample cost, and how much meter / filter / mix work
   fits between two sample interrupts? Numbers used (all in this archive):
   - Ali/datasheet/ADSP-21065L.pdf (66 MIPS, 198 MFLOPS peak, 544 Kbit SRAM, I²S SPORTs)
   - Ali/datasheet/ADSP-21262.pdf (200 MHz, 1200 MFLOPS peak, 400 MMACS, 2 Mbit SRAM + 4 Mbit ROM, SIMD, DAI/SRU)
   - Ali/datasheet/ADSP-21065Levaluation.pdf (EZ-KIT Lite: 60 MHz, AD1819A codec, FLAG0–3 buttons,
     FLAG4–9 LEDs, IRQ0–2 buttons, board layout Figure 5-2 → the board drawn here)
   - Peter/cInterrupts.pdf (normal / fast / super dispatchers ≈125 / 60 / 30 cycles)
   - Peter/dsp_digitalaudioapplications.pdf ("21065L Audio Tutorial": biquad 6 + 4·N cycles + 5 cache
     misses, FIR 6 + taps + 2 cache misses, 60 MIPS timer example)
   - Peter/EE-232SConfiguringSRU.pdf (SRU() routing syntax), Peter/TimerInCLanguage.pdf (EE-33)
   - Cross-references to the WBS code as modelled in slm.js, ams82.js and rd37-descriptivevideomandate.js,
     and RD39-MPEG-HEAAC/Notes.docx (16 Jan 2012: SHARC lacks program memory for HE-AAC)
   Anything not in those files is marked "inferred".
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

/* ================= processors and costs (from the RD9 library) ================= */
const PARTS = {
  ez:{n:'ADSP-21065L · EZ-KIT Lite', clk:60e6, simd:false, mem:'544 Kbit SRAM (2 blocks)', memK:544, src:'EZ-KIT manual: 30 MHz oscillator, “ADSP-21065L DSP running at 60MHz”', used:'evaluation board'},
  ams82:{n:'ADSP-21065L · AMS8-2', clk:49.152e6, simd:false, mem:'544 Kbit SRAM', memK:544, src:'clock inferred in ams82.js (timer 0 → 12.288 MHz)', used:'AMS81 / AMS8-2 monitors'},
  slm1:{n:'ADSP-21065L · SLM-1 (2002)', clk:60e6, simd:false, mem:'544 Kbit SRAM', memK:544, src:'slm.js: 2002 engine, 60 MHz core', used:'SLM-1 v1.02'},
  slm15:{n:'ADSP-21262 · SLM1-5 (2007)', clk:147.456e6, simd:true, mem:'2 Mbit SRAM + 4 Mbit ROM', memK:2048, src:'slm.js: 24.576 MHz × 6 (inferred)', used:'SLM-1D, M6205C200'},
  max262:{n:'ADSP-21262 · 200 MHz', clk:200e6, simd:true, mem:'2 Mbit SRAM + 4 Mbit ROM', memK:2048, src:'ADSP-21262 datasheet: 200 MHz (5 ns), 400 MMACS', used:'datasheet maximum'},
};
const DISP = { normal:[125,'interrupt()','saves scratch registers and the loop stack; nesting allowed'], fast:[60,'interruptf()','does not save the loop stack; no interrupt number passed'], super:[30,'interrupts()','loop stack not saved, nesting disabled; “all ADSP-2106x”'] };
const COST = { conv:3, vu:19, ppm:15, mix:2, phase:32, ms:2 };   // per channel (phase per pair) — inferred from slm.js / ams82.js ISR sizes
const bqCyc = n => n ? 6 + 4*n + 5 : 0;                          // Audio Tutorial: cascaded_biquad
const firCyc = n => n ? 6 + n + 2 : 0;                           // Audio Tutorial: FIR
const PRESETS = {
  ez:{n:'EZ-KIT talk-through + 5-band EQ', part:'ez', ch:2, disp:'normal', vu:0, ppm:0, bq:5, fir:0, mix:0, phase:0, ms:0, src:'Audio Tutorial EQ example on the AD1819A codec'},
  slm1:{n:'SLM-1 stereo meter (VU + phase)', part:'slm1', ch:2, disp:'super', vu:1, ppm:0, bq:0, fir:0, mix:0, phase:1, ms:0, src:'slm.js: sport0_isr, VUMeterCalc, PhaseMeterCalc'},
  ams82:{n:'AMS8-2: 8 ch VU + PPM + speaker mix', part:'ams82', ch:8, disp:'super', vu:1, ppm:1, bq:0, fir:0, mix:1, phase:0, ms:0, src:'ams82.js: sport0_isr runs VUMeterCalc on all 8, mix_gain'},
  m6205:{n:'M6205C200: 10-ch DV / Lt-Rt mix', part:'slm15', ch:10, disp:'fast', vu:0, ppm:0, bq:0, fir:0, mix:1, phase:0, ms:0, src:'rd37 plugin: sample.c on the ADSP-21262'},
  kw:{n:'Loudness: K-weighting on 8 ch', part:'slm15', ch:8, disp:'super', vu:0, ppm:0, bq:2, fir:0, mix:0, phase:0, ms:1, src:'two biquads per channel (BS.1770 K-weighting, inferred)'},
};
const BG_CYC = 640;            // background while(1) pass (slm.js, inferred)
const TIMER = 1e-3;            // 1 ms timer (slm timer.h comment; EE-33)

/* ================= state ================= */
const D0 = Object.assign({ preset:'ez', fs:48000, irqs:[], tone:true, pick:'dsp' }, PRESETS.ez);
const D = Object.assign({}, D0);
function reset(){ Object.assign(D, D0, {irqs:[]}); LOG.items=[]; SIM.refresh(); }
const PT = () => PARTS[D.part];

/* ================= cycle model ================= */
function budget(){
  const p = PT(), simd = p.simd ? 0.5 : 1, ch = D.ch;
  const seg = [
    ['dispatch + return', DISP[D.disp][0], '--ink2'],
    ['input convert', COST.conv*ch, '--accent2'],
    ['biquads', bqCyc(D.bq)*ch*simd, '--accent'],
    ['FIR', firCyc(D.fir)*ch*simd, '--accent'],
    ['VU / PPM', (COST.vu*D.vu + COST.ppm*D.ppm)*ch, '--warn'],
    ['phase', COST.phase*D.phase*Math.ceil(ch/2), '--warn'],
    ['mean square', COST.ms*D.ms*ch, '--warn'],
    ['mix', COST.mix*D.mix*ch, '--bad'],
  ].filter(s=>s[1]>0);
  const isr = seg.reduce((a,s)=>a+s[1],0), per = p.clk/D.fs, load = isr/per;
  const perCh = (isr - DISP[D.disp][0]) / ch;
  const maxCh = perCh>0 ? Math.floor((per*0.9 - DISP[D.disp][0]) / perCh) : Infinity;   // keep 10 % for the background (inferred)
  return { seg, isr, per, load, perCh, maxCh, spare: per-isr, bgPasses: Math.max(0, Math.floor((per-isr)/BG_CYC)) };
}
function segAt(t){ const b = budget(), T = 1/D.fs, k = Math.floor(t/T), off = (t - k*T)*PT().clk; let acc=0; for (const s of b.seg){ if (off < acc + s[1]) return s[0]; acc += s[1]; } return 'background'; }

/* real biquad demo: RBJ low-pass 1 kHz, Q 0.707, cascaded D.bq times, on 100 Hz + 5 kHz */
function lpCoef(fs){ const f0=1000, q=0.7071, w=2*Math.PI*f0/fs, a=Math.sin(w)/(2*q), c=Math.cos(w), a0=1+a; return [(1-c)/2/a0,(1-c)/a0,(1-c)/2/a0,-2*c/a0,(1-a)/a0]; }
function inSig(n){ const t=n/D.fs; return 0.5*Math.sin(2*Math.PI*100*t) + 0.35*Math.sin(2*Math.PI*5000*t); }
function filtered(n0, n1){ const k = lpCoef(D.fs), N = Math.max(1, D.bq), z = Array.from({length:N},()=>[0,0,0,0]); const out=[]; const warm=Math.max(0,n0-400);
  for (let n=warm; n<=n1; n++){ let x=inSig(n); for (let s=0;s<N;s++){ const st=z[s]; const y=k[0]*x+k[1]*st[0]+k[2]*st[1]-k[3]*st[2]-k[4]*st[3]; st[1]=st[0]; st[0]=x; st[3]=st[2]; st[2]=y; x=y; } if (n>=n0) out.push(x); } return out; }

/* ================= actions ================= */
const A = {
  preset(k){ act('Program → '+PRESETS[k].n, tr=>{ Object.assign(D, PRESETS[k], {preset:k}); const b=budget(), p=PT();
    tr(`${p.n}: ${fmt(p.clk/1e6,3)} MHz → ${fmt(b.per,0)} cycles between ${D.fs/1000} kHz samples (${p.src})`);
    tr(`ISR = ${b.seg.map(s=>s[0]+' '+fmt(s[1],0)).join(' + ')} = ${fmt(b.isr,0)} cycles → ${fmt(b.load*100,1)} % load`);
    tr('Model source: '+PRESETS[k].src); }); },
  part(k){ act('Processor → '+PARTS[k].n, tr=>{ D.part=k; const b=budget(), p=PARTS[k]; tr(`${fmt(b.per,0)} cycles per sample; ${p.simd?'SIMD: PEx and PEy filter a channel pair at once (cost × 0.5, inferred)':'single PE'}; ${p.mem}`); tr(`Load ${fmt(b.load*100,1)} %, room for ≈${isFinite(b.maxCh)?b.maxCh:'∞'} channels of this work`); }); },
  disp(k){ act('Dispatcher → '+DISP[k][1], tr=>{ D.disp=k; tr(`cInterrupts.pdf: ${DISP[k][1]} ≈ ${DISP[k][0]} cycles — ${DISP[k][2]}`); tr(`= ${fmt(DISP[k][0]/PT().clk*1e6,2)} µs of every ${fmt(1e6/D.fs,2)} µs sample period`); }); },
  ch(d){ act(`Channels ${d>0?'+':'−'}`, tr=>{ const L=[1,2,4,8,10,16,24,32,48,64]; let i=L.indexOf(D.ch); i=clamp((i<0?1:i)+d,0,L.length-1); D.ch=L[i]; const b=budget(); tr(`${D.ch} channels → ISR ${fmt(b.isr,0)} cycles, load ${fmt(b.load*100,1)} %${b.load>1?' — OVERRUN: the next SPORT interrupt arrives before this one ends':''}`); }); },
  work(k,d){ act(`${k} ${d>0?'+':'−'}`, tr=>{ const max={bq:12,fir:256,vu:1,ppm:1,mix:1,phase:1,ms:1}[k]; const step = k==='fir'?16:1; D[k]=clamp(D[k]+d*step,0,max);
    if (k==='bq') tr(`cascaded_biquad: 6 + 4 × ${D.bq} + 5 cache misses = ${bqCyc(D.bq)} cycles per channel (21065L Audio Tutorial)`);
    else if (k==='fir') tr(`FIR: 6 + ${D.fir} taps + 2 cache misses = ${firCyc(D.fir)} cycles per channel (Audio Tutorial)`);
    else tr(`${k} ${D[k]?'on':'off'}: ${COST[k]} cycles per ${k==='phase'?'pair':'channel'} ${inf}`);
    const b=budget(); tr(`ISR ${fmt(b.isr,0)} cycles, load ${fmt(b.load*100,1)} %`); }); },
  fs(v){ act('fs → '+v, tr=>{ D.fs=+v; const b=budget(); tr(`${fmt(b.per,0)} cycles per sample; load ${fmt(b.load*100,1)} %`); }); },
  irq(n){ act('IRQ'+n+' button', tr=>{ const t=SIM.t, b=budget(), T=1/D.fs, k=Math.floor(t/T), off=(t-k*T)*PT().clk, inIsr = off < b.isr;
    const wait = (inIsr && D.disp!=='normal') ? (b.isr-off) : 0; const lat = wait + DISP[D.disp][0]/2;
    D.irqs.push({t, n, lat: lat/PT().clk}); if (D.irqs.length>8) D.irqs.shift();
    tr(`SW${[2,4,6][n]} → IRQ${n}${n===0?' (shared with the UART)':n===1?' (shared with EMAFE)':''}; MODE2 sets edge/level, IMASK must unmask it`);
    tr(inIsr ? `Arrives ${fmt(off,0)} cycles into the sample ISR: ${D.disp==='normal'?'normal dispatcher re-enables nesting → served at once':'nesting is off → waits '+fmt(b.isr-off,0)+' cycles'}` : 'Arrives in the background loop → served at once');
    tr(`Latency ≈ ${fmt(lat,0)} cycles = ${SIM.fmtDur(lat/PT().clk)} (half the dispatcher on entry, ${inf})`); }); },
  flag(n){ const L=['ez','slm1','ams82','m6205','kw']; if (n===0){ const i=(L.indexOf(D.preset)+1)%L.length; A.preset(L[i]); } else if (n===1) A.ch(1); else if (n===2){ const K=Object.keys(DISP); A.disp(K[(K.indexOf(D.disp)+1)%3]); } else { const K=Object.keys(PARTS); A.part(K[(K.indexOf(D.part)+1)%K.length]); } },
  pick(k){ D.pick=k; SIM.refresh(); },
};

/* ================= EZ-KIT Lite board (redrawn from manual Figure 5-2) ================= */
const tx = x => (x-138)*2, ty = y => (y-215)*2;
function ezSVG(){
  const b = budget(), lit = Math.round(clamp(b.load,0,1)*5);   // demo program: FLAG4–8 show load in fifths, FLAG9 = monitor alive
  const box = (x1,y1,x2,y2,t,k,fs)=>`<g ${k?`data-ez="${k}" style="cursor:pointer"`:''}><rect x="${tx(x1)}" y="${ty(y1)}" width="${(x2-x1)*2}" height="${(y2-y1)*2}" rx="3" fill="${k&&D.pick===k?'#2b5a8a':'#1d2a22'}" stroke="#9fb3a5"/><text x="${tx((x1+x2)/2)}" y="${ty((y1+y2)/2)+4}" text-anchor="middle" font-size="${fs||12}" fill="#e7efe9">${t}</text></g>`;
  let s = `<svg viewBox="0 0 790 730" style="width:100%;max-width:790px;display:block;border-radius:8px" role="img" aria-label="ADSP-21065L EZ-KIT Lite layout">
    <rect x="0" y="0" width="790" height="730" rx="10" fill="#0f5132"/><rect x="6" y="20" width="778" height="700" rx="6" fill="#136b3f" stroke="#0a3d24"/>`;
  s += box(158,228,176,250,'J7',null,10)+box(212,228,230,250,'J8',null,10)+`<text x="${tx(150)}" y="${ty(258)}" font-size="10" fill="#cfe">Line Out   Mic/Line In</text>`;
  s += box(295,233,380,283,'5V Supply')+box(398,233,483,283,'3.3V Supply')+box(500,248,520,268,'J1',null,10)+box(497,290,528,345,'RS232',null,10);
  s += box(148,330,162,500,'J4',null,9)+box(166,330,180,500,'J2',null,9);
  s += box(218,308,262,334,'Codec','codec')+box(205,355,228,410,'SDRAM','sdram',10)+box(245,355,268,410,'SDRAM','sdram',10);
  s += box(318,315,380,345,'30 MHz osc','osc',11)+box(400,438,412,482,'PGM',null,8)+box(423,445,470,480,'CPLD',null,11)+box(395,508,432,530,'UART','uart',11);
  s += `<g data-ez="dsp" style="cursor:pointer"><rect x="${tx(214)}" y="${ty(420)}" width="${58*2}" height="${55*2}" fill="${D.pick==='dsp'?'#2b5a8a':'#111'}" stroke="#ccc"/><text x="${tx(243)}" y="${ty(447)}" text-anchor="middle" font-size="15" font-weight="700" fill="#eee">21065L</text><text x="${tx(243)}" y="${ty(458)}" text-anchor="middle" font-size="10" fill="#bbb">${fmt(PT().clk/1e6,1)} MHz</text></g>`;
  s += box(330,410,375,500,'EPROM','eprom')+box(232,512,272,530,'JTAG J10',null,10)+box(502,355,518,548,'EMAFE J6',null,8);
  [['JP3',268,322],['JP4',308,460],['JP5',308,503],['JP8',178,520],['JP7',178,532],['JP6',178,553]].forEach(([n,x,y])=> s+=`<text x="${tx(x)}" y="${ty(y)}" font-size="9.5" fill="#cfe">${n}</text>`);
  // reset
  s += `<g data-ez="reset" style="cursor:pointer"><rect x="${tx(463)}" y="${ty(338)}" width="26" height="26" rx="4" fill="#ccc"/><text x="${tx(462)}" y="${ty(360)}" font-size="10" fill="#cfe">Reset</text></g>`;
  // buttons
  s += `<text x="${tx(215)}" y="${ty(541)}" font-size="11" fill="#e7efe9">Flag In</text><text x="${tx(308)}" y="${ty(541)}" font-size="11" fill="#e7efe9">IRQ</text><text x="${tx(360)}" y="${ty(541)}" font-size="11" fill="#e7efe9">Power</text><text x="${tx(430)}" y="${ty(541)}" font-size="11" fill="#e7efe9">Flag Out</text>`;
  const fl = ['preset','channels','dispatcher','processor'];
  [3,2,1,0].forEach((n,i)=>{ const x=tx(205+i*21); s+=`<g data-ez="flag${n}" style="cursor:pointer"><rect x="${x-11}" y="${ty(546)}" width="22" height="22" rx="3" fill="#ddd" stroke="#555"/><circle cx="${x}" cy="${ty(546)+11}" r="6" fill="#999"/><text x="${x}" y="${ty(574)}" text-anchor="middle" font-size="11" fill="#e7efe9">${n}</text><title>FLAG${n} (${['SW3','SW5','SW7','SW8'][n]}, order inferred): demo program → ${fl[n]}</title></g>`; });
  [2,1,0].forEach((n,i)=>{ const x=tx(296+i*22); s+=`<g data-ez="irq${n}" style="cursor:pointer"><rect x="${x-11}" y="${ty(546)}" width="22" height="22" rx="3" fill="#ddd" stroke="#555"/><circle cx="${x}" cy="${ty(546)+11}" r="6" fill="#c55"/><text x="${x}" y="${ty(574)}" text-anchor="middle" font-size="11" fill="#e7efe9">${n}</text><title>IRQ${n} (SW${[2,4,6][n]})</title></g>`; });
  s += `<circle cx="${tx(368)}" cy="${ty(557)}" r="7" fill="var(--led-a)"/><text x="${tx(368)}" y="${ty(574)}" text-anchor="middle" font-size="11" fill="#e7efe9">0</text>`;
  [9,8,7,6,5,4].forEach((f,i)=>{ const on = f===9 ? true : (f-4) < lit; const over = b.load>1; s+=`<circle cx="${tx(393+i*19.5)}" cy="${ty(557)}" r="7" fill="${on?(over&&f!==9?'#ff4a3a':'var(--led-g)'):'var(--led-off)'}"><title>FLAG${f}</title></circle><text x="${tx(393+i*19.5)}" y="${ty(574)}" text-anchor="middle" font-size="11" fill="#e7efe9">${f}</text>`; });
  s += `<text x="12" y="14" font-size="11" fill="#cfe">Redrawn from ADSP-21065L EZ-KIT Lite manual Figure 5-2 (layout, not to scale). LEDs: demo program shows CPU load (inferred).</text>`;
  return s + '</svg>';
}
function bindEz(root){ root.querySelectorAll('[data-ez]').forEach(g=> g.onclick = ()=>{ const k=g.dataset.ez;
  if (k.startsWith('flag')) A.flag(+k.slice(4)); else if (k.startsWith('irq')) A.irq(+k.slice(3)); else if (k==='reset') act('Reset (SW1)', tr=>{ reset(); tr('ADM708T reset → DSP boots: BMS selects the EPROM, the first 256 instructions (1536 bytes) load by DMA, then the loader kernel pulls in the rest (manual §5.3.1)'); tr('Monitor: all LEDs flash, then FLAG9 and power stay lit'); }); else A.pick(k); }); }
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <label class="small">program <select data-s="preset">${Object.keys(PRESETS).map(k=>`<option value="${k}" ${k===D.preset?'selected':''}>${PRESETS[k].n}</option>`).join('')}</select></label>
    <label class="small">DSP <select data-s="part">${Object.keys(PARTS).map(k=>`<option value="${k}" ${k===D.part?'selected':''}>${PARTS[k].n}</option>`).join('')}</select></label>
    <label class="small">dispatcher <select data-s="disp">${Object.keys(DISP).map(k=>`<option value="${k}" ${k===D.disp?'selected':''}>${DISP[k][1]} ≈${DISP[k][0]}</option>`).join('')}</select></label>
    <label class="small">fs <select data-s="fs">${[44100,48000,96000,192000].map(f=>`<option ${f===D.fs?'selected':''}>${f}</option>`).join('')}</select></label>
    <span class="small muted">ch ${D.ch}</span><button data-a="ch" data-v="-1">−</button><button data-a="ch" data-v="1">+</button>
    <span class="small muted">biquads ${D.bq}</span><button data-a="w" data-v="bq,-1">−</button><button data-a="w" data-v="bq,1">+</button>
    <span class="small muted">FIR ${D.fir}</span><button data-a="w" data-v="fir,-1">−</button><button data-a="w" data-v="fir,1">+</button>
    ${['vu','ppm','phase','ms','mix'].map(k=>`<button data-a="tg" data-v="${k}" class="${D[k]?'on':''}">${({vu:'VU',ppm:'PPM',phase:'phase',ms:'mean sq.',mix:'mix'})[k]}</button>`).join('')}
    <button data-a="rst">defaults</button></div>`;
}
function bindControls(root){
  bindActs(root, { ch:v=>A.ch(+v), w:v=>{ const [k,d]=v.split(','); A.work(k,+d); }, tg:v=>A.work(v, D[v]?-1:1), rst:()=>reset() });
  root.querySelectorAll('[data-s]').forEach(s=> s.onchange = e=>({preset:A.preset, part:A.part, disp:A.disp, fs:A.fs})[s.dataset.s](e.target.value));
}
function budgetHTML(){
  const b = budget(), p = PT();
  const bar = `<svg viewBox="0 0 500 34" style="width:100%">${(()=>{ let x=0, s=''; b.seg.forEach(sg=>{ const w=500*sg[1]/b.per; s+=`<rect x="${x}" y="4" width="${Math.max(0.5,w)}" height="22" fill="${SIM.css(sg[2])}" opacity=".85"><title>${sg[0]}: ${fmt(sg[1],0)} cycles</title></rect>`; x+=w; }); s+=`<rect x="0" y="4" width="500" height="22" fill="none" stroke="var(--line)"/>`; if (b.load>1) s+=`<text x="490" y="20" text-anchor="end" font-size="12" fill="#fff" font-weight="700">OVERRUN</text>`; return s; })()}</svg>`;
  return bar + kv([
    ['Cycles per sample', `${fmt(b.per,0)} (${fmt(p.clk/1e6,3)} MHz ÷ ${D.fs/1000} kHz)`,1],
    ['Sample ISR', `${fmt(b.isr,0)} cycles = ${SIM.fmtDur(b.isr/p.clk)} → <b>${fmt(b.load*100,1)} %</b>`,1],
    ['Breakdown', b.seg.map(s=>`${s[0]} ${fmt(s[1],0)}`).join(' · ')],
    ['Per channel', `${fmt(b.perCh,1)} cycles → fits ≈${isFinite(b.maxCh)?b.maxCh:'∞'} channels (90 % ceiling ${inf})`],
    ['Background', `${fmt(Math.max(0,b.spare),0)} cycles left ≈ ${b.bgPasses} passes of a ${BG_CYC}-cycle loop per sample ${inf}`],
    ['Memory', p.mem + (p.memK<4096?' — HE-AAC would not fit (RD39 Fraunhofer call, 2012)':'')],
  ]);
}

/* ================= timeline ================= */
function lanes(){
  const css=SIM.css, L=[], b=budget(), clk=PT().clk, T=1/D.fs;
  L.push({label:`SPORT0 RX frame sync (${D.fs/1000} kHz)`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,T,0,0.15*T,css('--accent2'),'sample in'); }});
  L.push({label:'Sample ISR (cycles)', h:30, draw(c,X,t0,t1,y,h){
    if (X(t0+T)-X(t0) < 6){ c.fillStyle=b.load>1?css('--bad'):css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+4,X(t1)-X(t0),h-8); c.globalAlpha=1; laneText(c,X,t0,y,h,`${Math.round((t1-t0)*D.fs).toLocaleString()} ISRs, each ${fmt(b.isr,0)} cycles (${fmt(b.load*100,1)} %) — zoom in`); return; }
    for (let k=Math.floor(t0/T); k*T<t1; k++){ let tt=k*T; b.seg.forEach(sg=>{ const d=sg[1]/clk; c.fillStyle=css(sg[2]); c.globalAlpha=.85; c.fillRect(X(tt),y+4,Math.max(1,X(tt+d)-X(tt)),h-8); c.globalAlpha=1; if (X(tt+d)-X(tt)>60){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(sg[0],X(tt)+2,y+h/2+3); } tt+=d; }); } }});
  L.push({label:'Background loop', h:22, draw(c,X,t0,t1,y,h){ if (X(t0+T)-X(t0) < 6){ laneText(c,X,t0,y,h,`${(b.bgPasses*D.fs).toLocaleString()} passes / s ${'(inferred)'}`); return; }
    for (let k=Math.floor(t0/T); k*T<t1; k++){ const a=k*T+b.isr/clk; for (let j=0;j<b.bgPasses;j++){ const s=a+j*BG_CYC/clk; bandAt(c,X,s,s+BG_CYC/clk*0.92,y,h,css('--ink2'),.3,''); } } }});
  L.push({label:'Timer IRQ (1 ms)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,TIMER,0,DISP[D.disp][0]/clk,css('--warn'),'TMZHI → refresh / LED mux'); }});
  L.push({label:'IRQ0–2 buttons', h:22, draw(c,X,t0,t1,y,h){ if (!D.irqs.length){ laneText(c,X,t0,y,h,'press an IRQ button on the board'); return; } D.irqs.forEach(q=>{ c.fillStyle=css('--bad'); c.fillRect(X(q.t)-1,y+2,2,h-4); bandAt(c,X,q.t,q.t+q.lat,y,h,css('--bad'),.5,'IRQ'+q.n+' '+SIM.fmtDur(q.lat)); }); }});
  L.push({label: D.bq? `Biquad demo: in (grey) / out (${D.bq} × LP 1 kHz)` : 'Biquad demo (add biquads)', h:46, draw(c,X,t0,t1,y,h){
    const n0=Math.floor(t0*D.fs), n1=Math.ceil(t1*D.fs); if (n1-n0 > 6000){ laneText(c,X,t0,y,h,'zoom to 100 ms or less to see the samples'); return; }
    const out = D.bq? filtered(n0,n1) : null, sc=(h/2-3)/0.9;
    c.strokeStyle=css('--ink2'); c.globalAlpha=.5; c.beginPath(); for(let n=n0;n<=n1;n++){ const yy=y+h/2-inSig(n)*sc; n===n0?c.moveTo(X(n/D.fs),yy):c.lineTo(X(n/D.fs),yy);} c.stroke(); c.globalAlpha=1;
    if (out){ c.strokeStyle=css('--accent'); c.lineWidth=1.6; c.beginPath(); out.forEach((v,i)=>{ const xx=X((n0+i+1)/D.fs), yy=y+h/2-v*sc; i?c.lineTo(xx,yy):c.moveTo(xx,yy); }); c.stroke(); c.lineWidth=1; } }});
  return L;
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>
    ${card('ADSP-21065L EZ-KIT Lite (Flag In 0–3 change the program, IRQ 0–2 inject interrupts, click chips)', `<div id="ez"></div>`)}
    </div><div>
    ${card('Cycle budget for one sample', `<div id="bud"></div>${controlsHTML()}`)}
    ${card('What the DSP did (last action)', `<div id="trace" class="log"></div>`)}
    ${card('Part', `<div id="part"></div>`)}</div></div>
    ${card('Timeline — one second of sample interrupts (zoom to 100 µs to see one ISR)', `<canvas id="tl"></canvas>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  bindControls(m);
  const draw=()=>{ const ez=m.querySelector('#ez'); ez.innerHTML=ezSVG(); bindEz(ez);
    m.querySelector('#bud').querySelector && (m.querySelector('#bud').innerHTML = budgetHTML());
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#log').innerHTML=logHTML();
    const info = { dsp:[PT().n, PT().src+'. '+PT().mem+'. Used in: '+PT().used], codec:['AD1819A SoundPort codec','16-bit, 48 kHz, line or mic in, line out; connects to the DSP serial port (EZ-KIT manual §3.3.2).'], sdram:['SDRAM 1M × 32','External memory; uses a separate address line (A10) for refresh.'], osc:['30 MHz oscillator','SaRonix NCH089B-30.0000; the DSP doubles it to 60 MHz.'], eprom:['Boot EPROM','Socketed, 128K × 8 up to 1M × 8. BMS/BSEL boot: first 256 instructions (1536 bytes) load automatically.'], uart:['16550 UART','RS-232 to the PC at 115200 baud (9600 fails, per the manual); interrupts on IRQ0.'] }[D.pick] || ['',''];
    m.querySelector('#part').innerHTML = `<h3>${info[0]}</h3><p class="small">${info[1]}</p>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'What RD9 was for', body:`<p>Before writing SHARC code for the meters, Peter and Ali gathered the manuals: datasheets, the EZ-KIT Lite board, the C runtime and its interrupt dispatchers, the 21065L Audio Tutorial with cycle counts for filters. The engineering question for every WBS meter: <b>how much work fits between two samples?</b></p>`, check:()=>true, auto:true },
  { title:'1 · The budget', body:`<p>On the EZ-KIT the 21065L runs at 60 MHz. At 48 kHz that is <b>1250 cycles</b> per sample. Select the <b>EZ-KIT</b> program and read the cycle budget.</p><p><b>Goal:</b> EZ-KIT program at 48 kHz.</p>`, check:()=>D.preset==='ez'&&D.fs===48000, hint:'Program menu → EZ-KIT talk-through, or press FLAG0 until it comes round.' },
  { title:'2 · The dispatcher tax', body:`<p>The C <span class="mono">interrupt()</span> dispatcher costs about 125 cycles, 10 % of the budget, before any audio work. Switch to the super dispatcher <span class="mono">interrupts()</span> (≈30 cycles). The SLM firmware uses exactly that: <span class="mono">interrupts(SIG_SP0, SampleIRQ)</span>.</p><p><b>Goal:</b> super dispatcher.</p>`, check:()=>D.disp==='super', hint:'Dispatcher menu, or FLAG2.' },
  { title:'3 · Count the filters', body:`<p>Each biquad costs 4 cycles plus 6 overhead and about 5 cache misses per channel (Audio Tutorial). Add biquads until the 2-channel EQ uses more than 25 % of the processor. Zoom the timeline to 100 µs to see the ISR blocks, and to 20 ms to see the filter work on 100 Hz + 5 kHz.</p><p><b>Goal:</b> load over 25 %.</p>`, check:()=>budget().load>0.25, hint:'biquads + several times; or channels +.' },
  { title:'4 · An 8-channel monitor', body:`<p>Load the <b>AMS8-2</b> program: 8 channels of VU and PPM plus the speaker mix, on a 21065L at 49.152 MHz (${inf} in ams82.js). It fits, with room for the LED strobing in the background.</p><p><b>Goal:</b> AMS8-2 program.</p>`, check:()=>D.preset==='ams82', hint:'Program menu.' },
  { title:'5 · Break it', body:`<p>Raise the channel count until the ISR no longer fits: the next SPORT interrupt arrives before the last one ends and the LEDs turn red.</p><p><b>Goal:</b> overrun.</p>`, check:()=>budget().load>1, hint:'channels + until OVERRUN.' },
  { title:'6 · The 21262 answer', body:`<p>Switch the processor to the <b>ADSP-21262</b>. At 147 MHz with SIMD (two processing elements) the same work drops below the line. This is the step the SLM-1 took between 2002 and 2007.</p><p><b>Goal:</b> 21262 and no overrun.</p>`, check:()=>PT().simd&&budget().load<=1, hint:'DSP menu → ADSP-21262 · SLM1-5, or FLAG3.' },
  { title:'7 · Interrupt latency', body:`<p>Press <b>IRQ0</b> on the board while the playhead is inside a sample ISR (zoom to 100 µs, step to the start of a sample). With nesting disabled the button waits for the ISR to finish; the IRQ lane shows how long.</p><p><b>Goal:</b> one IRQ pressed.</p>`, check:()=>D.irqs.length>0, hint:'Click a red-dot IRQ button on the board.' },
  { title:'Done', body:`<p>That is the arithmetic behind every WBS SHARC product. The <b>Findings</b> tab lists what the library contains, what is mislabelled, and where the knowledge went.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — budgeting a SHARC', panelTitle:'Board and budget', reset,
  panel(el){ el.innerHTML = `<div id="tz"></div><div style="margin-top:8px">${budgetHTML()}</div>${controlsHTML()}`; const z=el.querySelector('#tz'); z.innerHTML=ezSVG(); bindEz(z); bindControls(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second inside the DSP', `<div id="lad"></div>`)}<div class="grid2">${card('At the playhead', `<div id="dev"></div>`)}${card('Dispatchers (cInterrupts.pdf)', `<div id="dsp"></div>`)}</div>`;
  const draw=()=>{ const b=budget(), p=PT();
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','each','note'],[
      ['Core cycles', `<span class="mono">${p.clk.toLocaleString()}</span>`, `<span class="mono">${SIM.fmtDur(1/p.clk)}</span>`, p.src],
      ['SPORT0 sample interrupts', `<span class="mono">${D.fs.toLocaleString()}</span>`, `<span class="mono">${fmt(b.per,0)} cycles</span>`, 'one per stereo / TDM frame'],
      ['Cycles in the sample ISR', `<span class="mono">${Math.round(b.isr*D.fs).toLocaleString()}</span>`, `<span class="mono">${fmt(b.isr,0)}</span>`, `${fmt(b.load*100,1)} % of the core`],
      ['Background passes', `<span class="mono">${(b.bgPasses*D.fs).toLocaleString()}</span>`, `<span class="mono">${BG_CYC}</span>`, 'LED strobing, UART, meter translation '+inf],
      ['Timer interrupts', '<span class="mono">1,000</span>', '<span class="mono">1 ms</span>', 'EE-33 / SLM timer.h “1 msec rate”'],
      ['Biquad sections run', `<span class="mono">${(D.bq*D.ch*D.fs).toLocaleString()}</span>`, `<span class="mono">4 cycles</span>`, '+6 call overhead, +5 cache misses'],
    ].map(r=>r.map((x,i)=>i===3?`<span class="small">${x}</span>`:x)));
    const T=1/D.fs, k=Math.floor(SIM.t/T), off=(SIM.t-k*T)*p.clk;
    m.querySelector('#dev').innerHTML = kv([['Sample #',k.toLocaleString(),1],['Cycle in period',`${fmt(off,0)} / ${fmt(b.per,0)}`,1],['Running',segAt(SIM.t),1],['ISR / background',`${fmt(b.isr,0)} / ${fmt(Math.max(0,b.spare),0)} cycles`,1]]);
    m.querySelector('#dsp').innerHTML = tbl(['Call','≈ cycles','% at '+fmt(p.clk/1e6,1)+' MHz, '+D.fs/1000+' kHz','behaviour'], Object.keys(DISP).map(k=>[`<span class="mono">${DISP[k][1]}</span>`, DISP[k][0], fmt(DISP[k][0]/b.per*100,1)+' %', `<span class="small">${DISP[k][2]}</span>`]));
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B = {
    codec:{x:20,y:30,w:170,h:66,t:'AD1819A / CS8416',s:['audio in (EZ-KIT / WBS)'],d:'On the EZ-KIT the AD1819A codec; on WBS boards a CS8416 (AES) or CS8427 transceiver feeding the SPORT.'},
    sport:{x:240,y:30,w:170,h:66,t:'SPORT0/1 + DMA',s:['I²S / TDM frames'],d:'21065L: I²S on eight channels each way; 21262: six SPORTs routed through the SRU / DAI.'},
    irq:{x:240,y:140,w:170,h:66,t:'Interrupt controller',s:['IMASK / IRPTL / MODE1-2'],d:'Vectors the SPORT, timer and IRQ0–2 interrupts; the dispatcher saves context.',live:()=>budget().load>0},
    core:{x:460,y:90,w:200,h:110,t:'SHARC core',s:['PEx (+ PEy on 21262 SIMD)','DAG1/DAG2, zero-overhead loops','instruction cache'],d:'One multiply, one ALU op and two memory moves per cycle; 40-bit extended float.'},
    mem:{x:460,y:240,w:200,h:66,t:'On-chip SRAM',s:[PT().mem],d:'The limit Fraunhofer named in 2012 for HE-AAC (RD39).'},
    boot:{x:20,y:240,w:170,h:66,t:'Boot EPROM / SPI flash',s:['256 instructions by DMA'],d:'EZ-KIT: EPROM via BMS. SLM1-5: AT25F512A SPI flash with the 26x_spi kernel (slm.js).'},
    flags:{x:240,y:270,w:170,h:66,t:'FLAG pins',s:['buttons, LEDs, shift regs'],d:'EZ-KIT: FLAG0–3 buttons, FLAG4–9 LEDs. WBS meters strobe MM5450 / shift-register LED bars from the flags.'},
    out:{x:20,y:140,w:170,h:66,t:'Audio / meter out',s:['DAC, LED bars'],d:'The results: processed audio back out of the SPORT and meter values to the LED drivers.'},
  };
  blockView(m, B, [['codec','sport','serial'],['sport','irq','RX done'],['irq','core','vector'],['core','mem',''],['boot','mem','load'],['core','flags',''],['core','sport','TX'],['sport','out','']], {start:'core', w:700, h:360, side:'<p>Each sample: the SPORT interrupts, the dispatcher saves context, the ISR does the per-channel work, and whatever cycles remain go to the background loop.</p>'});
}
const SHEETS=[
  { name:'1 · EZ-KIT DSP I/O', note:'From the EZ-KIT Lite manual §3.2.1 (flags, interrupts), §5.3 (layout, EPROM, LEDs) and its bill of materials.', svg:()=> chip(320,40,220,'ADSP-21065L',[['CLKIN','30 MHz osc (×2)'],['FLAG0–3','SW3, SW5, SW7, SW8'],['IRQ0','SW2 + UART'],['IRQ1','SW4 + EMAFE'],['IRQ2','SW6'],['BMS / BSEL','boot EPROM'],['RESET','SW1 via ADM708T']],[['FLAG4–9','LEDs D1–D6'],['FLAG10','EMAFE'],['FLAG11','monitor: codec on'],['SPORT0/1','AD1819A'],['SDCLK0','SDRAM 1M×32'],['MS / A','16550 UART'],['JTAG','J10']],'208-MQFP / 196 mini-BGA') },
  { name:'2 · 21262 SRU routing', note:'SRU() lines from EE-232; the SLM1-5 routing as described in slm.js (InitDAI).', svg:()=> { const L=[['EE-232 example','SRU(DAI_P07_O, SPORT4_FS_I);'],['','SRU(DAI_P06_O, SPORT0_CLK_I);'],['','SRU(TIMER0_O, DAI_P14_I);  SRU(HIGH, PBEN14_I);'],['SLM1-5 (slm.js)','CS8416 SDOUT → DAI_P10 → SPORT0 data (SampleIRQ)'],['','SPORT4/5 → DAI_P16–20 → MM5450 display link'],['','DAI_PB14 low → CS8416 held in reset at start-up'],['','SPCTL0 = 0x00CC89F1 · SPCTL4 = 0x03BC75F9']];
      return L.map((r,i)=>`<text x="40" y="${70+i*48}" font-size="12" fill="var(--ink2)">${r[0]}</text><rect x="200" y="${50+i*48}" width="620" height="32" rx="5" fill="var(--panel2)" stroke="var(--line)"/><text x="212" y="${71+i*48}" font-size="12.5" font-family="var(--mono)" fill="var(--ink)">${r[1]}</text>`).join(''); } },
  { name:'3 · Biquad section', note:'Direct form I biquad as in the Audio Tutorial’s cascaded_biquad: 4 coefficients + gain per section, 2 delays per section.', svg:()=> { const bx=(x,y,t)=>`<rect x="${x}" y="${y}" width="60" height="34" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+30}" y="${y+22}" text-anchor="middle" font-size="12" fill="var(--ink)">${t}</text>`;
      return `<text x="40" y="80" font-size="13" fill="var(--ink)">x[n]</text><line x1="80" y1="76" x2="360" y2="76" stroke="var(--ink)"/>${bx(140,120,'z⁻¹')}${bx(140,200,'z⁻¹')}${bx(260,40,'× b0')}${bx(260,120,'× b1')}${bx(260,200,'× b2')}<circle cx="400" cy="140" r="18" fill="none" stroke="var(--ink)"/><text x="400" y="146" text-anchor="middle" font-size="16" fill="var(--ink)">Σ</text>${bx(520,120,'z⁻¹')}${bx(520,200,'z⁻¹')}${bx(440,240,'× a1')}${bx(440,300,'× a2')}<line x1="418" y1="140" x2="700" y2="140" stroke="var(--ink)"/><text x="710" y="145" font-size="13" fill="var(--ink)">y[n]</text><text x="40" y="380" font-size="12" fill="var(--ink2)">Cycle count: 6 + 4 × sections + 5 cache misses (one multiply-accumulate with dual fetch per cycle)</text><text x="40" y="402" font-size="12" fill="var(--ink2)">Demo coefficients here: RBJ low-pass 1 kHz, Q 0.707 at ${D.fs/1000} kHz → b0 ${fmt(lpCoef(D.fs)[0],5)}, a1 ${fmt(lpCoef(D.fs)[3],5)}, a2 ${fmt(lpCoef(D.fs)[4],5)} (inferred demo)</text>`; } },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'RD9 manuals (EZ-KIT Lite, EE-232, Audio Tutorial)', 'RD9 holds no WBS schematic; these sheets redraw the evaluation board and the routing / filter structures the library documents.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Sample ISR flow (lit = running at the playhead)', `<div id="fl"></div>`)}${card('Processors compared at this workload', `<div id="cmp"></div>`)}</div><div class="grid2">${card('Memory', `<div id="mem"></div>`)}${card('Where the library went', `<div id="where"></div>`)}</div>`;
  const draw=()=>{ const b=budget(), now=segAt(SIM.t);
    const steps=[['SPORT0 RX interrupt → vector',true],['dispatch + return',now==='dispatch + return'],['input convert',now==='input convert'],['biquads',now==='biquads'],['FIR',now==='FIR'],['VU / PPM',now==='VU / PPM'],['phase',now==='phase'],['mean square',now==='mean square'],['mix',now==='mix'],['RTI → background loop',now==='background']];
    m.querySelector('#fl').innerHTML = `<svg viewBox="0 0 520 ${steps.length*34+8}" style="width:100%">${steps.map((s,i)=>{ const seg=b.seg.find(x=>x[0]===s[0]); const used = i===0||i===steps.length-1||seg; return `<rect x="6" y="${4+i*34}" width="508" height="28" rx="5" fill="${s[1]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" opacity="${used?1:.4}"/><text x="16" y="${22+i*34}" font-size="12" font-family="var(--mono)" fill="${s[1]?'#fff':'var(--ink)'}">${s[0]}${seg?' — '+fmt(seg[1],0)+' cycles':''}</text>`; }).join('')}</svg>`;
    const save = D.part; m.querySelector('#cmp').innerHTML = tbl(['Processor','cycles / sample','load','fits ch'], Object.keys(PARTS).map(k=>{ D.part=k; const bb=budget(); const r=[PARTS[k].n, fmt(bb.per,0), `<b style="color:${bb.load>1?'var(--bad)':'inherit'}">${fmt(bb.load*100,1)} %</b>`, isFinite(bb.maxCh)?bb.maxCh:'∞']; return r; })); D.part=save;
    m.querySelector('#mem').innerHTML = `<svg viewBox="0 0 520 132" style="width:100%"><rect x="10" y="20" width="${500*544/6144}" height="26" fill="var(--accent2)"/><text x="${14+500*544/6144}" y="38" font-size="12" fill="var(--ink)">21065L: 544 Kbit SRAM</text><rect x="10" y="64" width="${500*2048/6144}" height="26" fill="var(--accent)"/><rect x="${10+500*2048/6144}" y="64" width="${500*4096/6144}" height="26" fill="var(--grid)"/><text x="16" y="82" font-size="12" fill="#fff">21262: 2 Mbit SRAM</text><text x="${20+500*2048/6144}" y="82" font-size="12" fill="var(--ink)">+ 4 Mbit mask ROM</text><text x="10" y="110" font-size="11" fill="var(--ink2)">RD39 (16 Jan 2012): “Sharc DSP does not have enough executable memory”</text><text x="10" y="125" font-size="11" fill="var(--ink2)">for HE-AAC → ARM9 or TI C64x suggested</text></svg>`;
    m.querySelector('#where').innerHTML = tbl(['Product','DSP','How it is used (plugin)'],[
      ['SLM-1 (2002)','ADSP-21065L','asm sport0_isr, 41-LED tables (slm.js, comparison engine)'],
      ['AMS81 / AMS8-2','ADSP-21065L','10-slot TDM, VUMeterCalc ×8, speaker mix (ams81.js, ams82.js)'],
      ['SLM-1D, SLM1-5 (2007)','ADSP-21262','C SampleIRQ via interrupts(), SRU / DAI routing (slm.js)'],
      ['M6205C200 (2008)','ADSP-21262','sample.c DV / Lt-Rt mix (rd37 plugin)'],
      ['32ME, RD22, RD86','SHARC','MADI monitor and SLM1D work (own plugins)'],
      ['HE-AAC encoder (RD39)','—','rejected: not enough program memory'],
    ]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD9 decided, and what became of it', `<ol>
    <li><b>Completed, and it stuck.</b> Register row RD9 “DSP research” is status Z. Every WBS meter and monitor afterwards uses a SHARC: the 21065L in SLM-1 and AMS81 / AMS8-2, the 21262 in SLM1-5 / SLM-1D and the M6205C200. No WBS product uses the 16-bit ADSP-2100 family that half the folder documents.</li>
    <li><b>Ali’s folder is the 2002 meter platform’s parts kit.</b> <span class="mono">Ali/datasheet/</span> holds the ADSP-21065L, CS8427 transceiver, MM5450 LED driver (the SLM1-4 head uses three), CS4334 DAC (AMS81 uses four) and CS5333 ADC: the chip set of the 21065L-era products, plus the 21262 that replaced the DSP.</li>
    <li><b>The budget explains the code style.</b> 60 MHz ÷ 48 kHz = 1250 cycles; the normal C dispatcher alone takes ≈125. WBS code uses hand-written assembly ISRs on the 21065L (<span class="mono">sport0_isr</span>) and the super dispatcher <span class="mono">interrupts(SIG_SP0, SampleIRQ)</span> on the 21262 (see slm.js).</li>
    <li><b>Mislabelled files.</b> <span class="mono">Ali/datasheet/ADSP-21065Lhardware.pdf</span> is the <i>ADSP-21161</i> Hardware Reference (rev 4.0, Feb 2005, 1064 pages). <span class="mono">Peter/236999443isr_21xxx.pdf</span> is the ADSP-21160 Instruction Set Reference, not an ISR note. <span class="mono">MultiCycleInstructions_Latency_EEnote.pdf</span> is EE-197 for Blackfin; <span class="mono">Performance_Tuning_slides.pdf</span> and <span class="mono">Prog_Opt_C_Code_on_Blackfin_slides.pdf</span> are Blackfin too. <span class="mono">TimerInCLanguage.pdf</span> (EE-33) and <span class="mono">DebuggerTutor6.pdf</span> are for the 16-bit ADSP-21xx.</li>
    <li><b>Duplicates.</b> <span class="mono">coremanual.pdf</span> and <span class="mono">48568486206214648452126x_HRM.pdf</span> are the same file (ADSP-2126x Core Hardware Reference); <span class="mono">21160_instructionsetref.pdf</span> and <span class="mono">236999443isr_21xxx.pdf</span> are the same file. The three ADSP-2100 manuals are kept both as chapter PDFs and as the original zips.</li>
    <li><b>“21xx” is two families.</b> The README calls <span class="mono">users_manual/</span>, <span class="mono">21xxfamily_manual_vol1/</span> and <span class="mono">vol2/</span> “ADSP-21xx”; their text is the ADSP-2100 family (16-bit fixed point) user manual and applications handbook, not SHARC (ADSP-21xxx, 32-bit float).</li>
    <li><b>The cycle numbers used here come from the folder.</b> Dispatchers ≈125 / 60 / 30 cycles (cInterrupts.pdf); biquad 6 + 4N + 5 misses and FIR 6 + taps + 2 misses (the 1998 “21065L Audio Tutorial”, <span class="mono">dsp_digitalaudioapplications.pdf</span>); 66 MIPS / 198 MFLOPS and 544 Kbit (21065L datasheet); 200 MHz, 400 MMACS, 2 Mbit + 4 Mbit ROM (21262 datasheet).</li>
    <li><b>The memory ceiling ended one idea.</b> RD39’s call notes (16 Jan 2012) record Fraunhofer’s view that the SHARC lacks executable memory for HE-AAC, and suggest an ARM9 or TI C64x. No WBS encoder followed.</li>
    <li><b>EZ-KIT detail worth knowing.</b> The monitor link wants 115200 baud; at 9600 the manual says the board “operate[s] very slowly and can also … hang”; FLAG11 is reserved by the monitor; IRQ0 is shared with the UART and IRQ1 with the EMAFE connector, so only IRQ2 is free for experiments.</li>
  </ol>`) + card('Assumptions in this model', `<ul class="small"><li>Per-channel costs of convert, VU, PPM, phase, mean square and mix, the 640-cycle background pass and the 90 % ceiling (${inf}, sized from the ISR descriptions in slm.js / ams82.js).</li><li>SIMD halves filter cost on the 21262 (${inf}).</li><li>AMS8-2 and SLM1-5 core clocks are the inferred values of those plugins.</li><li>The EZ-KIT “load bar” demo program and the FLAG button functions are this model’s, not Analog Devices’ monitor.</li><li>Interrupt latency: half the dispatcher on entry plus any wait for a non-nesting ISR (${inf}).</li></ul>`) + card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD9-DSPResearch/Ali/datasheet/*.pdf, Peter/*.pdf, Peter/21065L/, users_manual/, 21xxfamily_manual_vol1/, 21xx_Family_manual_vol2/ · R&amp;D_List.xls</li><li>RD39-MPEG-HEAAC/Notes.docx · siumulation-plugins/slm.js, ams82.js, ams81.js, rd37-descriptivevideomandate.js</li></ul>`);
}

SIM.register({
  id:'rd9-dspresearch', name:'RD9 DSP Research · SHARC cycle-budget workbench (2011|44)', duration:1,
  product:'RD9 DSP Research', year:2011, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD9-DSPResearch',
  summary:'The Analog Devices DSP library behind every WBS meter. The model turns its numbers (dispatcher overheads, biquad and FIR cycle counts, clock rates, memory) into a live per-sample cycle budget on a redrawn ADSP-21065L EZ-KIT Lite, with the SLM-1, AMS8-2 and M6205 workloads as presets.',
  highlights:['Per-sample cycle budget with ISR breakdown','Normal / fast / super interrupt dispatchers','21065L vs 21262 (SIMD) on real WBS workloads','A real cascaded biquad running on the timeline','EZ-KIT Lite board with FLAG buttons, IRQs and LEDs'],
  depth:'Hardware model',
  stepUnits:[{label:'1 sample',period:()=>1/D.fs},{label:'100 cycles',period:()=>100/PT().clk},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms (biquad demo)'],[0.001,'1 ms (48 samples)'],[0.0001,'100 µs (ISR blocks)'],[0.00002,'20 µs (one sample)']],
  defaultZoom:4,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: budgeting', render:viewTutorial},
    {id:'second', label:'One second, sample by sample', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
