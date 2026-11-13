/* =====================================================================
   RD20 — Verilog HDL (Ward-Beck R&D register, Peter, Z = completed 2011)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD20 was Verilog self-study. Folder (RD20-VerilogHDL/):
   - Behavioral_Verilog_Timescale.pdf (ECE 551 discussion, 18 Feb 2003: initial/always, blocking "=" vs
       non-blocking "<=", the `behave` example with #50 / #100, `timescale 10ps/1ps and nor #3.57 → 36 ps)
   - CummingsDesignCon2005_SystemVerilog_ImplicitPorts.pdf (positional, named, .name and .* connections; CALU)
   - ebook/ (Verilog Quickstart, The Verilog HDL, Digital Design: An Embedded Systems Approach, and one more)
   - vhdl-Operators.pdf (opens as PDF-1.2 but has no readable pages), Peter/Altera - stx_cookbook.pdf
   What the study fed into: the first WBS Verilog design in the archive, DEMUX-4 (RD31, 2013|46–2015|48),
   SA-DEMUX4 …/Software/Xilinx/V020100-StandAlone/SourceFiles/:
   - Audio/aes_tx_clkdiv.v (16-bit counter wrapping at 16'hBFFF; ce_bp, ce_bit, ce_word, frame0 on negedge)
   - Control/tx_ce_sd_gen.v (11-bit rotating clock-enable 11'b00001000001, written with blocking "=")
   - Audio/swap_audio.v (header says par_aud_sel_1_of_2), Control/ref_clk_select.v (module ref_clk_sel)
   The plugin is a small event-driven Verilog scheduler (active and NBA regions) running these modules.
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
const FCLK = 12.288e6;                 // 256·fs at 48 kHz — the clock aes_tx_clkdiv is written for (inferred from the 0xBFFF = 192×256 wrap)
const FSD = 148.5e6;                   // GTP TX user clock for HD/3G; SD = 2 of 11 enables → 27 MHz (inferred)
const WRAP = 0xBFFF;
const D = { mode:'nba', order:'q1first', split:false, sdMode:true, fifoFull:true, dPattern:0b10110010, timescale:'10ps/1ps', delay:3.57, pick:'clkdiv' };
function reset(){ Object.assign(D,{mode:'nba',order:'q1first',split:false,sdMode:true,fifoFull:true,dPattern:0b10110010,timescale:'10ps/1ps',delay:3.57,pick:'clkdiv'}); LOG.items=[]; SIM.refresh(); }

/* ---------- aes_tx_clkdiv: exact behaviour at time t ---------- */
function clkdivAt(t){
  const n = Math.floor(t*FCLK);                      // posedges seen
  const cnt = n % (WRAP+1);
  const negSeen = Math.floor(t*FCLK - 0.5);          // last negedge index
  const cAtNeg = negSeen>=0 ? (negSeen % (WRAP+1)) : 0;  // tx_clken_gen value sampled at that negedge
  return { n, cnt, frame: cnt>>8, clk: (t*FCLK)%1 < 0.5 ? 1 : 0,
    ce_bp: negSeen>=0 ? (cAtNeg&1) : 0, ce_bit: negSeen>=0 ? +((cAtNeg&3)===3) : 0, ce_word: negSeen>=0 ? +((cAtNeg&255)===255) : 0, frame0: negSeen>=0 ? +(cAtNeg===WRAP) : 0 };
}
/* ---------- tx_ce_sd_gen ---------- */
function sdgenAt(t){
  const n=Math.floor(t*FSD); let g = 0b00001000001;
  const rot = D.sdMode ? n % 11 : 0;                 // gen_sd_ce = {gen_sd_ce[9:0], gen_sd_ce[10]} each posedge
  for (let i=0;i<rot;i++) g = ((g<<1)&0x7FF) | ((g>>10)&1);
  const ce = D.fifoFull ? (g&1) : 0;                 // mux_sel latches fifo_part_full
  return { n, g, ce, clk:(t*FSD)%1<0.5?1:0 };
}
/* ---------- a two-stage shift register in a tiny Verilog scheduler ---------- */
function shiftSim(cycles){
  // returns per-cycle {d,q1,q2, events:[...]} with the event order of one posedge
  let q1=0,q2=0; const out=[];
  for (let k=0;k<cycles;k++){
    const d=(D.dPattern>>(k%8))&1; const ev=[]; const nba=[];
    const stmt=(lhs,rhs)=>{ const v = rhs==='d'?d: rhs==='q1'?q1:q2;
      if (D.mode==='blk'){ if(lhs==='q1') q1=v; else q2=v; ev.push(`active: ${lhs} = ${rhs} → ${v} (updated now)`); }
      else { nba.push([lhs,v]); ev.push(`active: evaluate ${rhs} = ${v}, schedule ${lhs} <= ${v}`); } };
    const order = D.order==='q1first' ? [['q1','d'],['q2','q1']] : [['q2','q1'],['q1','d']];
    if (D.split) ev.push(`two always blocks: simulator picks block order (${D.order==='q1first'?'q1 block first':'q2 block first'}) — a race if blocking`);
    order.forEach(([l,r])=>stmt(l,r));
    nba.forEach(([l,v])=>{ if(l==='q1') q1=v; else q2=v; ev.push(`NBA region: ${l} ← ${v}`); });
    out.push({d,q1,q2,ev});
  }
  return out;
}
const SR = ()=> shiftSim(16);
const flops = ()=>{ const s=SR(); // does q2 lag q1 by one cycle?
  let same=true; for(let k=1;k<s.length;k++) if (s[k].q2!==s[k-1].q1) same=false; return same?2:1; };
/* timescale rounding (course example) */
function tsRound(){ const [u,p]=D.timescale.split('/'); const unit=parseFloat(u)*({ps:1,ns:1000}[u.replace(/[0-9.]/g,'')]); const prec=parseFloat(p)*({ps:1,ns:1000}[p.replace(/[0-9.]/g,'')]); const raw=D.delay*unit; return {raw, rounded:Math.round(raw/prec)*prec, unit, prec}; }

const A = {
  mode(v){ act(v==='blk'?'Use blocking  =':'Use non-blocking  <=', tr=>{ D.mode=v; const f=flops();
    tr(v==='blk' ? 'Blocking: “evaluates its RHS and updates its LHS before flow continues” (ECE 551 notes p. 2)' : 'Non-blocking: “all RHS of consecutive nonblocking statements evaluate before all their LHS update”');
    tr(`always @(posedge clk) begin ${D.order==='q1first'?`q1 ${v==='blk'?'=':'<='} d; q2 ${v==='blk'?'=':'<='} q1;`:`q2 ${v==='blk'?'=':'<='} q1; q1 ${v==='blk'?'=':'<='} d;`} end → behaves as <b>${f} flip-flop${f>1?'s':''}</b>`); }); },
  order(){ act('Swap statement order', tr=>{ D.order=D.order==='q1first'?'q2first':'q1first'; tr(`order now ${D.order==='q1first'?'q1 then q2':'q2 then q1'} → ${flops()} flip-flop(s)`); if (D.mode==='nba') tr('With <= the order does not matter: the NBA region updates after all evaluation'); }); },
  split(){ act(D.split?'One always block':'Two always blocks', tr=>{ D.split=!D.split; tr(D.split?'Each assignment in its own always @(posedge clk): with blocking, the result depends on which block the simulator runs first (a race); synthesis builds 2 flops regardless':'Single block'); }); },
  sd(){ act(D.sdMode?'sd_mode = 0':'sd_mode = 1', tr=>{ D.sdMode=!D.sdMode; tr(D.sdMode?'gen_sd_ce rotates every clock: 2 enables per 11 clocks → 148.5 × 2/11 = 27 MHz':'gen_sd_ce frozen at 11\'b00001000001'); }); },
  fifo(){ act(D.fifoFull?'fifo_part_full = 0 (before start)':'fifo_part_full = 1', tr=>{ D.fifoFull=!D.fifoFull; tr('mux_sel <= fifo_part_full while mux_sel = 0 (mux_sel_en = ~mux_sel): once set it stays set until reset'); }); },
  pat(){ act('New d pattern', tr=>{ D.dPattern=(D.dPattern*73+41)&0xFF; tr('d = '+D.dPattern.toString(2).padStart(8,'0')+' (LSB first)'); }); },
  ts(v){ act('`timescale '+v, tr=>{ D.timescale=v; const r=tsRound(); tr(`nor #${D.delay} → ${D.delay} × ${r.unit} ps = ${fmt(r.raw,2)} ps, rounded to precision ${r.prec} ps → <b>${r.rounded} ps</b>`); if (v==='10ps/1ps') tr('Course example: “The nor gate’s delay is 36 ps (3.57 x 10 = 35.7 ps rounded to 36)”'); }); },
  pick(v){ act('Module → '+v, tr=>{ D.pick=v; }); },
};

/* ---------- code panel: the module source with the line active at the playhead lit ---------- */
const SRC = {
  clkdiv:['`timescale 1 ps / 1ps','module aes_tx_clkdiv (input wire clk, output wire ce_bp, ce_bit, ce_word, frame0);','  reg [15:0] tx_clken_gen = 16\'d0; // 16-bit counter','  assign tx_clk_gen_reset = (tx_clken_gen == 16\'hBFFF); //191','  always @ (posedge clk)','    if (tx_clk_gen_reset) tx_clken_gen <= 16\'d0;','    else tx_clken_gen <= tx_clken_gen + 16\'d1;','  always @ (negedge clk) ce_bp_int   <= tx_clken_gen[0];   // 2X bit rate','  always @ (negedge clk) ce_bit_int  <= &tx_clken_gen[1:0]; // bit rate','  always @ (negedge clk) ce_word_int <= &tx_clken_gen[7:0]; // sample rate','  always @ (negedge clk) frame0_int  <= tx_clk_gen_reset;','endmodule'],
  sdgen:['`timescale 1ns / 1ps','module tx_ce_sd_gen (input clk, rst, sd_mode, fifo_part_full, tx_rst, output fifo_rd_en, output [2:0] tx_ce);','  reg [10:0] gen_sd_ce = 11\'b00001000001;','  always @(posedge clk or posedge rst)','    if (rst) mux_sel <= 1\'b0; else if (mux_sel_en) mux_sel <= fifo_part_full;','  always @ (posedge clk or posedge rst)','    if (rst) gen_sd_ce = 11\'b00001000001;            // blocking "="','    else if (sd_mode) gen_sd_ce = {gen_sd_ce[9:0], gen_sd_ce[10]};','  assign ce_mux = mux_sel ? gen_sd_ce[0] : 1\'b0;','  always @ (negedge clk) tx_ce_int <= {4{ce_mux}};','  always @ (negedge clk) fifo_rd_en_int <= tx_ce_int[3];','endmodule'],
  shift:()=>['module shift2 (input clk, d, output reg q1, q2);   // study example (inferred)', D.split?'  always @(posedge clk) '+(D.mode==='blk'?'q1 = d;':'q1 <= d;'):'  always @(posedge clk) begin', ...(D.split?['  always @(posedge clk) '+(D.mode==='blk'?'q2 = q1;':'q2 <= q1;')]:(D.order==='q1first'?[`    q1 ${D.mode==='blk'?'=':'<='} d;`,`    q2 ${D.mode==='blk'?'=':'<='} q1;`]:[`    q2 ${D.mode==='blk'?'=':'<='} q1;`,`    q1 ${D.mode==='blk'?'=':'<='} d;`]).concat(['  end'])),'endmodule'],
  behave:['module behave;           // ECE 551 notes, p. 2','  reg [1:0] a, b;','  initial begin a = \'b1; b = \'b0; end','  always begin #50 a = ~a; end','  always #100 b = ~b;','endmodule'],
};
function lit(t){ if (D.pick==='clkdiv'){ const s=clkdivAt(t); return s.clk? [4,5,6] : [7,8,9,10]; } if (D.pick==='sdgen'){ const s=sdgenAt(t); return s.clk? [3,4,5,6,7]:[9,10]; } return []; }
function codeHTML(t){ const L = typeof SRC[D.pick]==='function' ? SRC[D.pick]() : SRC[D.pick]; const on=new Set(lit(t));
  return `<pre class="log" style="max-height:none;white-space:pre-wrap">${L.map((l,i)=>`<div class="${on.has(i)?'hl':''}">${String(i+1).padStart(2)}  ${l.replace(/</g,'&lt;')}</div>`).join('')}</pre>`; }
function bindAll(r){ bindActs(r,{ mode:v=>A.mode(v), order:()=>A.order(), split:()=>A.split(), sd:()=>A.sd(), fifo:()=>A.fifo(), pat:()=>A.pat(), ts:v=>A.ts(v), pick:v=>A.pick(v), rst:()=>reset() }); }
function controlsHTML(){ return `<div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">
  ${[['clkdiv','aes_tx_clkdiv.v'],['sdgen','tx_ce_sd_gen.v'],['shift','shift register'],['behave','behave (notes)']].map(([k,l])=>`<button data-a="pick" data-v="${k}" class="${D.pick===k?'on':''}">${l}</button>`).join('')}</div>
  <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:6px"><button data-a="mode" data-v="blk" class="${D.mode==='blk'?'on':''}">=</button><button data-a="mode" data-v="nba" class="${D.mode==='nba'?'on':''}">&lt;=</button><button data-a="order">swap order</button><button data-a="split">${D.split?'one block':'two blocks'}</button><button data-a="pat">new d</button>
  <button data-a="sd">sd_mode ${D.sdMode?1:0}</button><button data-a="fifo">fifo_part_full ${D.fifoFull?1:0}</button>
  ${['10ps/1ps','1ns/1ps','1ns/100ps'].map(v=>`<button data-a="ts" data-v="${v}" class="${D.timescale===v?'on':''}">\`timescale ${v}</button>`).join('')}<button data-a="rst">defaults</button></div>`; }
/* ---------- timeline ---------- */
function digital(c,X,t0,t1,y,h,fn,col,period){ const span=t1-t0; if (span/period>3000){ return false; } const N=Math.min(6000,Math.max(400,Math.ceil(span/period*8))); c.strokeStyle=col; c.beginPath(); let prev=null; for(let i=0;i<=N;i++){ const t=t0+span*i/N; const v=fn(t); const yy=y+h-5-v*(h-10); if(prev===null) c.moveTo(X(t),yy); else if(v!==prev){ c.lineTo(X(t),y+h-5-prev*(h-10)); c.lineTo(X(t),yy);} prev=v; } c.lineTo(X(t1),y+h-5-prev*(h-10)); c.stroke(); return true; }
function lanes(){
  const css=SIM.css, T=1/FCLK;
  const L=[
    {label:'clk 12.288 MHz (256·fs)', h:22, draw(c,X,t0,t1,y,h){ if(!digital(c,X,t0,t1,y,h,t=>clkdivAt(t).clk,css('--ink2'),T)) SIM.pulses(c,X,t0,t1,y,h,T,0,T/2,css('--ink2'),'clk'); }},
    {label:'tx_clken_gen[15:0]', h:24, draw(c,X,t0,t1,y,h){ if ((t1-t0)/T>60){ laneText(c,X,t0,y,h,`counts 0…0xBFFF; [15:8] = frame 0–191, [7:0] = clock in frame · now ${clkdivAt(SIM.t).cnt.toString(16).toUpperCase()}h`); return; }
      const n0=Math.floor(t0*FCLK), n1=Math.ceil(t1*FCLK); c.font='10px '+css('--mono'); for(let n=n0;n<=n1;n++){ const x=X(n*T); c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(x,y+3); c.lineTo(x,y+h-3); c.stroke(); c.fillStyle=css('--ink'); c.fillText((n%(WRAP+1)).toString(16).toUpperCase(), x+2, y+h/2+4); } }},
    {label:'ce_bp (2× bit rate)', h:20, draw(c,X,t0,t1,y,h){ if(!digital(c,X,t0,t1,y,h,t=>clkdivAt(t).ce_bp,css('--accent'),T)) SIM.pulses(c,X,t0,t1,y,h,2*T,1.5*T,T,css('--accent'),'ce_bp (6.144 MHz)'); }},
    {label:'ce_bit (bit rate)', h:20, draw(c,X,t0,t1,y,h){ if(!digital(c,X,t0,t1,y,h,t=>clkdivAt(t).ce_bit,css('--accent'),T)) SIM.pulses(c,X,t0,t1,y,h,4*T,3.5*T,T,css('--accent'),'ce_bit (3.072 MHz)'); }},
    {label:'ce_word (48 kHz)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,256*T,255.5*T,T,css('--accent2'),'ce_word'); }},
    {label:'frame0 (every 192 frames)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,(WRAP+1)*T,(WRAP+0.5)*T,T,css('--warn'),'frame0 (250 Hz)'); }},
    {label:'tx_ce (SD, 148.5 MHz clk)', h:20, draw(c,X,t0,t1,y,h){ if(!digital(c,X,t0,t1,y,h,t=>sdgenAt(t-0.5/FSD).ce,css('--bad'),1/FSD)) laneText(c,X,t0,y,h,`${Math.round((t1-t0)*FSD*2/11).toLocaleString()} enables (2 of every 11 clocks = 27 MHz) — zoom to 100 ns`); }},
    {label:`shift: d / q1 / q2 (${D.mode==='blk'?'=':'<='})`, h:34, draw(c,X,t0,t1,y,h){ const s=SR(); const P=1e-6; const k0=Math.floor(t0/P);
      if ((t1-t0)/P>200){ laneText(c,X,t0,y,h,`study example clocked at 1 MHz: ${flops()} flip-flop(s) — zoom to 10 µs`); return; }
      [['d',css('--ink2')],['q1',css('--accent')],['q2',css('--warn')]].forEach(([k,col],j)=>{ c.strokeStyle=col; c.beginPath(); for(let kk=Math.max(0,k0-1);kk*P<=t1;kk++){ const v=s[kk%16][k]; const yy=y+4+j*10+(1-v)*7; c.moveTo(X(kk*P),yy); c.lineTo(X((kk+1)*P),yy); } c.stroke(); }); }},
  ];
  return L;
}
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Source at the playhead (lit lines = the always blocks firing on this clock edge)', `<div id="code"></div><div id="ctl"></div>`)}${card('Scheduler trace for one posedge (shift register)', `<div id="ev" class="log"></div>`)}</div>
    <div>${card('What the model did', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="st"></div>`)}</div></div>
    ${card('Timeline — one second of aes_tx_clkdiv and friends, down to single clocks', `<canvas id="tl"></canvas><p class="small muted">The 12.288 MHz clock is ${inf} from the 0xBFFF wrap (49 152 = 192 frames × 256 clocks at 48 kHz) and the clocks quoted in RD - HardwareImprovements. The 148.5 MHz SD-generator clock is ${inf} from the Spartan-6 GTP reference design.</p>`)}`;
  const draw=()=>{ const t=SIM.t; m.querySelector('#code').innerHTML=codeHTML(t); const ct=m.querySelector('#ctl'); ct.innerHTML=controlsHTML(); bindAll(ct);
    const s=SR(); const k=Math.floor(t/1e-6)%16; m.querySelector('#ev').innerHTML=`<div><b>cycle ${k}</b>: d = ${s[k].d}</div>`+s[k].ev.map(e=>`<div>→ ${e}</div>`).join('')+`<div>result q1 = ${s[k].q1}, q2 = ${s[k].q2} → ${flops()} flip-flop(s)</div>`;
    m.querySelector('#trace').innerHTML=traceHTML();
    const a=clkdivAt(t), g=sdgenAt(t), r=tsRound();
    m.querySelector('#st').innerHTML=kv([['posedges',a.n.toLocaleString(),1],['tx_clken_gen',`0x${a.cnt.toString(16).toUpperCase().padStart(4,'0')} (frame ${a.frame}, clock ${a.cnt&255})`,1],['ce_bp ce_bit ce_word frame0',`${a.ce_bp} ${a.ce_bit} ${a.ce_word} ${a.frame0}`,1],['gen_sd_ce',g.g.toString(2).padStart(11,'0')+` → tx_ce ${g.ce}`,1],['`timescale',`${D.timescale}: nor #${D.delay} = ${r.rounded} ps`,1]]);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); };
  bindAll(m); SIM.on('time',draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'What RD20 was', body:`<p>WBS FPGAs were VHDL and schematic (.bdf) in Quartus. In 2011 Peter worked through Verilog: course notes on blocking vs non-blocking and <span class="mono">\`timescale</span>, Cummings’ paper on implicit ports, and four e-books. The register marks RD20 complete in 2011. This tutorial replays the lessons, then runs the WBS Verilog that came later.</p>`, check:()=>true, auto:true },
  { title:'1 · Blocking collapses a pipeline', body:`<p>Choose the <b>shift register</b> and <b>=</b> (blocking). With <span class="mono">q1 = d; q2 = q1;</span> q2 takes the new d at once: one flip-flop, not two. Zoom to 10 µs to see q1 and q2 move together.</p>`, check:()=>D.pick==='shift'&&D.mode==='blk'&&flops()===1, hint:'Press “shift register”, then “=”.' },
  { title:'2 · Non-blocking restores it', body:`<p>Press <b>&lt;=</b>. Every right-hand side is read first; the updates happen together in the NBA region. Now <b>swap the order</b>: still two flip-flops.</p>`, check:()=>D.mode==='nba'&&D.order==='q2first'&&flops()===2, hint:'Press “<=”, then “swap order”.' },
  { title:'3 · `timescale rounding', body:`<p>The notes’ example: <span class="mono">\`timescale 10ps/1ps</span> and <span class="mono">nor #3.57</span> give 35.7 ps, rounded to <b>36 ps</b>. Try 1ns/100ps.</p>`, check:()=>D.timescale==='1ns/100ps', hint:'Press `timescale 1ns/100ps.' },
  { title:'4 · The WBS clock divider', body:`<p>Choose <b>aes_tx_clkdiv.v</b> from DEMUX-4. One 16-bit counter makes every AES3 timing enable: biphase cells (÷2), bits (÷4), samples (÷256) and the 192-frame block (wrap at 0xBFFF; the comment says “//191”, the last frame). Zoom to <b>1 µs</b> to see single clocks.</p>`, check:()=>D.pick==='clkdiv'&&SIM.win<=1.01e-6, hint:'Press aes_tx_clkdiv.v; Zoom window → 1 µs.' },
  { title:'5 · Blocking in real code', body:`<p>Choose <b>tx_ce_sd_gen.v</b>. Its rotating enable is written with <b>blocking</b> <span class="mono">=</span> inside a clocked block, the pattern the notes warn about. It works because nothing else reads <span class="mono">gen_sd_ce</span> inside that block; the outputs are re-registered on the falling edge.</p>`, check:()=>D.pick==='sdgen', hint:'Press tx_ce_sd_gen.v.' },
  { title:'Done', body:`<p><b>Findings</b> lists what the notes get wrong and what the study turned into.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m,LESSONS,tutor,{ title:'Tutorial — the Verilog study, lesson by lesson', panelTitle:'Code and controls', reset, panel(el){ const s=SR(); el.innerHTML=codeHTML(SIM.t)+controlsHTML()+`<p class="small">Shift register: ${flops()} flip-flop(s) · q1/q2 over 8 cycles: ${s.slice(0,8).map(x=>x.q1+''+x.q2).join(' ')}</p>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML=card('One second of aes_tx_clkdiv', `<div id="lad"></div>`);
  const draw=()=>{ m.querySelector('#lad').innerHTML=tbl(['Signal','per second','period','from'],[['clk posedges','12,288,000','81.4 ns','12.288 MHz VCXO '+inf],['ce_bp','6,144,000','162.8 ns','tx_clken_gen[0]'],['ce_bit','3,072,000','325.5 ns','&tx_clken_gen[1:0]'],['ce_word','48,000','20.83 µs','&tx_clken_gen[7:0]'],['frame0','250','4 ms','== 16\'hBFFF'],['tx_ce (SD)','27,000,000','37 ns avg','2 of 11 × 148.5 MHz '+inf]].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="mono">${r[2]}</span>`,`<span class="mono small">${r[3]}</span>`])); };
  SIM.on('time',draw);
}
function viewBlock(m){
  blockView(m,{
    notes:{x:20,y:30,w:200,h:80,t:'Course notes',s:['= vs <=','`timescale'],d:'Behavioral_Verilog_Timescale.pdf (ECE 551, 2003).'},
    cum:{x:20,y:150,w:200,h:80,t:'Cummings 2005',s:['.name and .*','CALU example'],d:'Implicit port connections: shorter top levels, stricter size checks.'},
    books:{x:20,y:270,w:200,h:80,t:'E-books',s:['Quickstart, Verilog HDL','Digital Design'],d:'Four obfuscated-name PDFs in ebook/.'},
    study:{x:300,y:150,w:180,h:80,t:'RD20 (2011)',s:['Peter, completed'],d:'R&D_List.xls row 20: Z, 2011.'},
    demux:{x:560,y:60,w:200,h:90,t:'DEMUX-4 FPGA (RD31)',s:['Spartan-6, ISE 14','Verilog, 2013–2015'],d:'First WBS Verilog in the archive: aes_tx_clkdiv, tx_ce_sd_gen, swap_audio, spi, sdi_tx_control, plus the Xilinx XAPP1076 triple-rate SDI core.'},
    vhdl:{x:560,y:230,w:200,h:90,t:'Altera products',s:['VHDL + .bdf','Quartus II'],d:'Cyclone designs (AMS, POD, openGear) stayed VHDL/schematic.'},
  },[['notes','study',''],['cum','study',''],['books','study',''],['study','demux','Verilog'],['study','vhdl','unchanged']],{start:'demux',h:380});
}
const SHEETS=[
  { name:'1 · aes_tx_clkdiv (RTL view)', note:'Redrawn from aes_tx_clkdiv.v: one counter, a compare, four negedge registers.', svg:()=>chip(140,120,170,'tx_clken_gen[15:0]',[['clk','posedge'],['reset','== BFFFh']],[['[0]','→ ce_bp'],['&[1:0]','→ ce_bit'],['&[7:0]','→ ce_word']],'+1 counter')+chip(560,120,160,'negedge regs ×4',[['D','from counter'],['clk','negedge']],[['ce_bp',''],['ce_bit',''],['ce_word',''],['frame0','']],'(* KEEP = "TRUE" *)') },
  { name:'2 · tx_ce_sd_gen (RTL view)', note:'Redrawn from tx_ce_sd_gen.v.', svg:()=>chip(140,100,180,'gen_sd_ce[10:0]',[['clk','posedge'],['sd_mode','rotate en'],['rst','async']],[['[0]','→ ce_mux']],'rotate left')+chip(560,100,170,'mux_sel / tx_ce',[['fifo_part_full','latched once'],['ce_mux','']],[['tx_ce[2:0]','| tx_rst'],['fifo_rd_en','tx_ce_int[3] delayed']],'negedge') },
];
function viewSchem(m){ sheetsView(m,SHEETS,'the DEMUX-4 Verilog','RD20 itself has no designs; these RTL views are of the WBS Verilog the study led to.'); }
function viewSoft(m){
  m.innerHTML=`<div class="grid2">${card('Verilog scheduling regions (one time step)', `<div id="rg"></div>`)}${card('Port connection styles (Cummings 2005)', `<pre class="log" style="max-height:none">// positional\nswap_audio u1 (clk, swap, a1, a2, o1, o2);\n// named\nswap_audio u1 (.clk(clk), .swap(swap), .audio1_in(a1), …);\n// .name  (SystemVerilog)\nswap_audio u1 (.clk, .swap, .audio1_in, .audio2_in, …);\n// .*     (SystemVerilog)\nswap_audio u1 (.*);</pre><p class="small muted">“.name and .* implicit ports are not allowed to be mixed in the same instantiation”; both require matching sizes and declared nets. DEMUX-4 uses named connections throughout (ISE 14 Verilog-2001).</p>`)}</div>`;
  const draw=()=>{ const blk=D.mode==='blk'; const R=[['Active','evaluate RHS; blocking = updates immediately',true],['Inactive','#0 events',false],['NBA','non-blocking <= updates',!blk],['Monitor','$monitor / $strobe',false]];
    m.querySelector('#rg').innerHTML=`<svg viewBox="0 0 460 220" style="width:100%">${R.map((r,i)=>`<rect x="20" y="${10+i*50}" width="420" height="40" rx="6" fill="${r[2]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="32" y="${35+i*50}" font-size="12" fill="${r[2]?'#fff':'var(--ink)'}"><tspan font-weight="700">${r[0]}</tspan> — ${r[1]}</text>`).join('')}</svg><p class="small">Current shift register: ${blk?'blocking — all work in Active':'non-blocking — updates wait for NBA'} → ${flops()} flip-flop(s).</p>`; };
  SIM.on('time',draw);
}
function viewFindings(m){
  m.innerHTML=card('What RD20 decided, and what became of it',`<ol>
    <li><b>Register: RD20 “Verilog HDL”, Peter, Z = completed 2011.</b> No design files in the folder.</li>
    <li><b>The study paid off on DEMUX-4.</b> The first in-house WBS Verilog product design in the archive appears to be the DEMUX-4 Spartan-6 design (RD31, 2013|46–2015|48): <span class="mono">aes_tx_clkdiv.v</span>, <span class="mono">tx_ce_sd_gen.v</span>, <span class="mono">swap_audio.v</span>, <span class="mono">spi.v</span>, wrapped around the Xilinx triple-rate SDI reference. The Altera products stayed VHDL. (Earlier Verilog in the M6205-3G / DTS folders came with an outside hand-off in 2010|43, so DEMUX-4 is the first in-house use — ${inf}.)</li>
    <li><b>The course notes’ table is misleading.</b> Behavioral_Verilog_Timescale.pdf tabulates “Blocking — Sequential flow — Sequential logic; Nonblocking — Parallel — Combinational”. Standard practice is the reverse for logic: non-blocking for clocked (sequential) logic, blocking for combinational.</li>
    <li><b>“\`timescale … Must be used in synthesis designs”</b> (same notes): synthesis ignores <span class="mono">\`timescale</span>; it matters only to simulation.</li>
    <li><b>Blocking in a clocked block, shipped.</b> <span class="mono">tx_ce_sd_gen.v</span> rotates <span class="mono">gen_sd_ce</span> with <span class="mono">=</span> inside <span class="mono">always @(posedge clk or posedge rst)</span>. It is safe only because no other statement in that block reads it.</li>
    <li><b>The divider encodes the AES block.</b> <span class="mono">16'hBFFF</span> with the comment “//191”: the top byte is the frame number 0–191, the low byte the clock within the frame at 256·fs. One counter gives biphase, bit, word and block enables.</li>
    <li><b>Mixed timescales.</b> <span class="mono">aes_tx_clkdiv.v</span> uses <span class="mono">\`timescale 1 ps / 1ps</span>; its neighbours use <span class="mono">1ns / 1ps</span>. Harmless without # delays, but exactly the trap the notes describe.</li>
    <li><b>Copy-paste headers.</b> <span class="mono">swap_audio.v</span>’s header says “Module Name: par_aud_sel_1_of_2”; <span class="mono">ref_clk_select.v</span> declares <span class="mono">module ref_clk_sel</span>.</li>
    <li><b>Folder housekeeping.</b> <span class="mono">vhdl-Operators.pdf</span> starts like a PDF 1.2 file but has no readable pages. <span class="mono">Peter/Altera - stx_cookbook.pdf</span> is byte-identical to <span class="mono">RD - stx_cookbook.pdf</span> in the parent folder (SHA-256 6b00bd64…). The e-book file names are random strings.</li>
  </ol>`)+card('Assumptions',`<ul class="small"><li>Clock frequencies for the DEMUX-4 modules (${inf}).</li><li>The two-flop shift register is the textbook example the notes describe, not a file in the folder (${inf}).</li></ul>`)+card('Sources',`<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD20-VerilogHDL/* · R&amp;D_List.xls</li><li>SA-DEMUX4 - #Master/DEMUX4 - #Engineering/Software/Xilinx/V020100-StandAlone/SourceFiles/Audio/aes_tx_clkdiv.v, swap_audio.v; Control/tx_ce_sd_gen.v, ref_clk_select.v</li></ul>`);
}
SIM.register({
  id:'rd20-veriloghdl', name:'RD20 Verilog HDL · self-study and the DEMUX-4 Verilog it led to (2011|44)', duration:1,
  product:'RD20 Verilog HDL', year:2011, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD20-VerilogHDL',
  summary:'Peter’s 2011 Verilog study, simulated: blocking vs non-blocking in a small event scheduler, `timescale rounding, implicit ports, and the WBS Verilog that followed on DEMUX-4 — the AES3 clock divider and SD clock-enable generator — run cycle by cycle across one second.',
  highlights:['Event scheduler with Active and NBA regions','aes_tx_clkdiv.v cycle-exact across a full second','tx_ce_sd_gen.v 2-of-11 enable pattern','Course-note errors and the shipped blocking assignment','Live source with the firing lines lit'],
  depth:'Full model',
  stepUnits:[{label:'1 clk (81.4 ns)',period:()=>1/FCLK},{label:'1 ce_word (20.8 µs)',period:()=>256/FCLK},{label:'1 µs (shift clock)',period:()=>1e-6},{label:'1 AES block (4 ms)',period:()=>(WRAP+1)/FCLK}],
  zooms:[[1,'1 s'],[0.01,'10 ms'],[1e-5,'10 µs'],[1e-6,'1 µs'],[1e-7,'100 ns']],
  defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: the Verilog study',render:viewTutorial},{id:'second',label:'One second, clock by clock',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
