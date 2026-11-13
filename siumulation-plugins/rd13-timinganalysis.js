/* =====================================================================
   RD13 — Timing Analysis (Ward-Beck R&D register, Peter, Z = completed, dated 2010-09-18)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD13 is Peter's TimeQuest / SDC training, taken over an Altera WebEx class on 14–15 Sep 2010|43
   ("Document Scrap …altera27.webex….shs", 14 Sep 2010). Sources used (folder RD13-TimingAnalysis/pETER/):
   - FPGATraining/TimingAnalysis/labs/QII10_0/Timing/: top.bdf (15 Sep 2010; port clk_in_100mhz, nets c100,
       c200, c100_out, aclr, pll_locked; instances a/b/x/y_regone/regtwo, mux_ax, mux_by, inst24 delay_8bits,
       mult TDM_mult, inst14/inst15 output DFFs, inst16 NOT, inst2/inst3 DFFE, inst1 main_pll),
       obsolete/top.bdf (5 May 2010; port clk_in, clk_x1/clk_x2/clk_o, "inclk0 period: 7.000 ns"),
       top.sdc and top.sdc.bak (Peter, 15 Sep 2010), test.sdc (write_sdc -expand, 14 Sep 2010, Quartus 9.0 SP2),
       top.qsf (28 Sep 2010: EP3C5F256C6, pin list, FAST_OUTPUT_REGISTER ON multout_*, CCPP removal OFF),
       main_pll.v (inclk0 7000 ps; c0 ×1, c1 ×2, c2 ×1, phase "0"), TDM_mult.v (lpm_mult 8×8, pipeline 3),
       mux_2to1.v, delay_8bits.bdf (11 LCELLs in series), PLLJ_PLLSPE_INFO.txt (jitter 29 ps, SPE +84/−53 ps),
       soln/top.sdc, soln/test.sdc (−45.000°)
   - …/Solutions/top.sdc (−38.51°, multicycle -to …mac_mult1~OBSERVABLEDATAB_REGOUT*), top_sdc.txt,
       Quartus II Design Series_Timing_10_0_Exercise_Solutions.doc (clk_out slacks 2.240/1.471/3.865/0.823
       before, 2.408/2.219/3.620/1.571 after; (0.823 − 2.240) ÷ 2 = −0.7085; −38.51°)
   - A-MNL-QII-TA-ALL-10-0-v1.pdf (course manual: Exercises 1–5, setup −1.863 / −1.923 on clk_x2, 96 aclr paths)
   - Intro/pipemult.sdc (6 ns clk1), VHDLBasics/DE0_v91/top.sdc, Project1/exercise2.qsf (no SDC)
   Products whose FPGAs the method then constrained (their SDC files are quoted, not copied):
   - #POD #SERIES/POD32 …/Altera/Progress/v100b…v100k, …/v100LD, …/POD32 - #Engineering/software/altera/v100/pod32.sdc
   - #OPENGEAR #SERIES/M6205 …/M6205C600/Altera/v101/m6205c.sdc; M6205-3G …/pETER/Altera/Hardware/…/SDC1.sdc
   - RD23 …/backup8-proper-inout-delays/V070000/ams163g.sdc; AMS81 …#V050000/AMS81.sdc; RD22 …/v050201/32ME.sdc
   Individual path delays are not in the archive. They are calibrated so the model reproduces the course's
   recorded slacks, and are marked "inferred" on screen.
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
const fmt = (v,d) => (v==null||isNaN(v)) ? '—' : (+v).toFixed(d==null?3:d);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const plink = (id, txt) => `<a href="siumulation.html?plugin=${id}">${txt}</a>`;

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
           : '<div class="muted">Change a constraint or press a report button. Each TimeQuest command the model runs, and the file it comes from, is listed here.</div>';
}
function bindActs(root, map){ root.querySelectorAll('[data-a]').forEach(b=>{ const f = map[b.dataset.a]; if (f) b.onclick = e=>{ e.preventDefault(); f(b.dataset.v, b); }; }); }
function flowSVG(steps, on, opts){
  opts = opts || {}; const w = opts.w || 520, rh = opts.rh || 34;
  return `<svg viewBox="0 0 ${w} ${steps.length*rh+10}" style="width:100%">${steps.map((s,i)=>{ const hot = i===on;
    return `<rect x="6" y="${6+i*rh}" width="${w-12}" height="${rh-8}" rx="6" fill="${hot?'color-mix(in srgb,var(--accent) 22%,var(--panel2))':'var(--panel2)'}" stroke="${hot?'var(--accent)':'var(--line)'}" stroke-width="${hot?2:1}"/>
      <text x="16" y="${6+i*rh+(rh-8)/2+4}" font-size="12" fill="var(--ink)">${s}</text>`; }).join('')}</svg>`;
}
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
function laneText(c, X, t0, y, h, s, col){ c.fillStyle = col || SIM.css('--ink2'); c.font = '11px '+SIM.css('--sans'); c.fillText(s, X(t0)+6, y+h/2+4); }
function bandAt(c, X, a, b, y, h, col, alpha, label){ c.fillStyle = col; c.globalAlpha = alpha==null?.6:alpha; c.fillRect(X(a), y+3, Math.max(1, X(b)-X(a)), h-6); c.globalAlpha = 1; if (label && X(b)-X(a) > c.measureText(label).width+8){ c.fillStyle = SIM.css('--ink'); c.font = '10px '+SIM.css('--sans'); c.fillText(label, X(a)+4, y+h/2+3); } }

/* ================= the lab design (Timing/top.bdf, top.qsf) ================= */
const NS = 1e-9;
const ROWS = 'ABCDEFGHJKLMNPRT';            // FBGA-256 ball rows (no I, O)
const BUS = {
  multout_ab:['R9','T8','N8','C6','D9','K8','L9','M6','R5','K9','P1','B7','N5','T2','E9','F7'],   // [0..15], top.qsf
  multout_xy:['R7','P8','M8','T6','F8','M7','T7','L8','T5','R8','P2','A7','R6','L7','D8','F6'],
  din_a:['B9','P6','N3','N9','M9','N14','L2','A9'], din_x:['E8','C8','R14','T11','T4','T9','T10','B8'],
  din_b:['T12','R11','L1','C9','R10','N11','L15','E10'], din_y:['R12','B10','K10','A8','N6','A15','L10','P9'],
};
const SINGLE = { clkout:'R4', reset:'E1', clk_in:'E2' };
const CONFIG = { C1:'~ALTERA_ASDO_DATA1~', D2:'~ALTERA_FLASH_nCE_nCSO~', H1:'~ALTERA_DCLK~', H2:'~ALTERA_DATA0~', F16:'~ALTERA_nCEO~' };
const ballRC = b => [ROWS.indexOf(b[0]), +b.slice(1)-1];
/* per-output-bit skew (data at pin − clkout at pin), calibrated to the solution .doc slacks */
const OUT_A0 = 1.713, OUT_A1 = 4.302, OUT_B = 0.108;   // s = a·k + b  (ns)   inferred calibration
const OUTBITS = (()=>{ const L=[]; ['multout_ab','multout_xy'].forEach(bus=> BUS[bus].forEach((b,i)=>{ const [r,c]=ballRC(b), [r0,c0]=ballRC(SINGLE.clkout); L.push({port:`${bus}[${i}]`, bus, bit:i, ball:b, dist:Math.hypot(r-r0,c-c0)}); }));
  const d0=Math.min(...L.map(x=>x.dist)), d1=Math.max(...L.map(x=>x.dist)); L.forEach(x=> x.a = OUT_A0 + (x.dist-d0)/(d1-d0)*(OUT_A1-OUT_A0)); return L; })();
const CORNERS = { slow85:{k:1, n:'Slow 1200mV 85C'}, slow0:{k:1.02, n:'Slow 1200mV 0C'}, fast:{k:0.6226, n:'Fast 1200mV 0C'} };
const TSU = 0.09, TH = 0.05, MINF = 0.85;              // register tsu/th and min/max spread  (inferred)
const ID_MAX = 0.7 - (-0.35) + 2.1, ID_MIN = 0.35 - 0.35 + 0.7;   // top.sdc expr: 3.15 / 0.70 ns
const OD = 0.35;                                       // Tsu = Th = 0.35 ns (0.7 ns data valid window)
const PH_STEP = 7*38.51/360/6;                         // MegaWizard c2 phase step so −0.7085 ns → −38.51°  (inferred)
const PHASES = [0, -38.51, -45];

/* path groups of top.bdf; d = slow-corner data delay in ns (inferred, calibrated) */
const PATHS = [
  { id:'in',   kind:'in',  from:'din_a/b/x/y[*] (pins)', to:'a/b/x/y_regone', n:32, L:['vir','r'], C:['x1','r'], d:1.65, note:'board → pin → first register bank' },
  { id:'r12',  kind:'reg', from:'*_regone', to:'*_regtwo', n:32, L:['x1','r'], C:['x1','r'], d:0.55, note:'second register bank' },
  { id:'ab',   kind:'reg', from:'a_regtwo, b_regtwo', to:'mult|mac_mult1 dataa/datab regs', n:16, L:['x1','r'], C:['x2','r'], d:1.42, note:'via mux_ax/mux_by "1" input (sel = clk_x1 high)' },
  { id:'x',    kind:'reg', from:'x_regtwo', to:'mult|…|mac_mult1~OBSERVABLEDATAA_REGOUT*', n:8, L:['x1','r'], C:['x2','r'], d:1.42, mc:'a', note:'via mux_ax "0" input (clk_x1 low)' },
  { id:'y',    kind:'reg', from:'y_regtwo', to:'mult|…|mac_mult1~OBSERVABLEDATAB_REGOUT*', n:8, L:['x1','r'], C:['x2','r'], d:1.42+3.853, mc:'b', note:'via inst24 delay_8bits (11 LCELLs) and mux_by' },
  { id:'mul',  kind:'reg', from:'mac_mult1 input regs', to:'mac_out result regs', n:16, L:['x2','r'], C:['x2','r'], d:2.6, note:'TDM_mult lpm_mult, LPM_PIPELINE 3' },
  { id:'pab',  kind:'reg', from:'mult result[15..0]', to:'inst15 (multout_ab regs)', n:16, L:['x2','r'], C:['x1','r'], d:1.35, note:'a·b product, captured on the rising edge' },
  { id:'pxy',  kind:'reg', from:'mult result[15..0]', to:'inst14 (multout_xy regs)', n:16, L:['x2','r'], C:['x1','f'], d:1.35, note:'x·y product, captured on the falling edge (inst16 NOT)' },
  { id:'oab',  kind:'out', bus:'multout_ab', from:'inst15', to:'multout_ab[*] (pins)', n:16, L:['x1','r'], note:'source-synchronous to clkout, rising edge' },
  { id:'oxy',  kind:'out', bus:'multout_xy', from:'inst14', to:'multout_xy[*] (pins)', n:16, L:['x1','f'], note:'source-synchronous to clkout, falling edge' },
  { id:'rst',  kind:'async', from:'reset (pin E1)', to:'inst1 areset, inst2, inst3', n:3, note:'asynchronous reset, synchronised by inst2 → inst3' },
  { id:'clko', kind:'clkdata', from:'inst1|…|pll1|clk[2]', to:'clkout (pin R4)', n:1, note:'clock-as-data path PLL c2 → output port' },
  { id:'rec',  kind:'rec', from:'inst3 (aclr)', to:'CLRN of 96 registers', n:96, L:['x1','r'], C:['x1','r'], d:2.4, note:'recovery / removal of the synchronised reset' },
];
const PATH = id => PATHS.find(p=>p.id===id);

/* ---- constraint presets, from the files ---- */
const PRESETS = {
  none:  { label:'No SDC (exercise2.qsf style)', file:'—', C:{clk:false, clkPort:'clk_in_100mhz', vir:false, pll:'none', clkout:false, unc:false, inp:false, inpX:false, out:'off', fpR:'none', fpC:'none', mcS:false, mcH:false, mcTo:'all', ph:0} },
  bak:   { label:'Peter · top.sdc.bak', file:'Timing/top.sdc.bak (15 Sep 2010)', C:{clk:true, clkPort:'clk_in_100mhz', vir:true, pll:'named', clkout:true, unc:true, inp:true, inpX:false, out:'fall', fpR:'inst', fpC:'typo', mcS:false, mcH:false, mcTo:'all', ph:0} },
  peter: { label:'Peter · top.sdc', file:'Timing/top.sdc (15 Sep 2010)', C:{clk:true, clkPort:'clk_in_100mhz', vir:true, pll:'named', clkout:true, unc:true, inp:true, inpX:false, out:'fall', fpR:'inst', fpC:'ok', mcS:false, mcH:false, mcTo:'all', ph:0} },
  txt:   { label:'Altera · top_sdc.txt answers', file:'Solutions/top_sdc.txt', C:{clk:true, clkPort:'clk_in', vir:true, pll:'named', clkout:true, unc:true, inp:true, inpX:true, out:'cfall', fpR:'port', fpC:'ok', mcS:true, mcH:true, mcTo:'all', ph:0} },
  soln:  { label:'Altera · Solutions/top.sdc', file:'Solutions/top.sdc = Timing/soln/top.sdc', C:{clk:true, clkPort:'clk_in', vir:true, pll:'named', clkout:true, unc:true, inp:true, inpX:false, out:'cfall', fpR:'port', fpC:'ok', mcS:true, mcH:true, mcTo:'datab', ph:-38.51} },
};
const DSN = { peter:{port:'clk_in_100mhz', file:'Timing/top.bdf (15 Sep 2010)', sym:'inclk0 frequency: 100.000 MHz · Cyclone II'}, altera:{port:'clk_in', file:'Timing/obsolete/top.bdf (5 May 2010)', sym:'inclk0 period: 7.000 ns · Cyclone III'} };

const D0 = () => ({ dsn:'peter', preset:'peter', C:Object.assign({}, PRESETS.peter.C), pllPh:0, corner:'slow85', net:'post_fit', an:'setup', rep:'summary', sel:'y', pin:null,
  flow:4, did:{}, prod:'pod32', prodMode:'a', ex1:{net:'post_map', phys:false} });
let D = D0();
function reset(){ D = D0(); LOG.items = []; SIM.refresh(); }

/* ---------------- clocks ---------------- */
function env(phaseDeg){
  const C = D.C, port = DSN[D.dsn].port, ign = [], unc = [], ck = {};
  const portOk = C.clk && C.clkPort === port;
  if (C.clk && !portOk) ign.push(['create_clock -name clk_in … [get_ports {'+C.clkPort+'}]', `no port "${C.clkPort}" in ${DSN[D.dsn].file.split(' ')[0]} (it is "${port}")`]);
  const baseName = portOk ? 'clk_in' : port;
  ck.base = { name:baseName, T: portOk?7:1, ph:0, type: portOk?'Base':'Base (default 1 GHz)', target:`[get_ports ${port}]`, ok:portOk };
  if (!portOk) unc.push(port);
  ck.vir = C.vir ? { name:'clk_in_vir', T:7, ph:0, type:'Virtual', target:'—', ok:true } : null;
  const longN = k => `inst1|altpll_component|auto_generated|pll1|clk[${k}]`;
  const mult = [1,2,1], names = ['clk_x1','clk_x2','clk_o'], role = ['x1','x2','o'];
  const phUsed = C.pll==='derive' ? D.pllPh : (phaseDeg==null ? C.ph : phaseDeg);
  role.forEach((r,k)=>{
    let ok = portOk && C.pll!=='none';
    if (C.pll==='named' && !portOk) ign.push([`create_generated_clock -name {${names[k]}} … -master_clock {clk_in}`, 'master clock clk_in does not exist']);
    if (C.pll==='derive' && !portOk && k===0) ign.push(['derive_pll_clocks', 'no clock on inclk[0]; nothing derived']);
    const T = ok ? 7/mult[k] : 1;
    const ph = (k===2 && ok) ? phUsed/360*T : 0;
    const nm = ok ? (C.pll==='named'? names[k] : longN(k)) : longN(k);
    ck[r] = { name:nm, T, ph, type: ok?'Generated':'Base (default 1 GHz)', target:`[get_pins ${longN(k)}]`, ok, mul:mult[k], deg: k===2&&ok? phUsed:0 };
    if (!ok) unc.push(longN(k));
  });
  ck.out = null;
  if (C.clkout){
    if (ck.o.ok) ck.out = { name:'clk_out', T:ck.o.T, ph:ck.o.ph, type:'Generated', target:'[get_ports clkout]', ok:true, deg:ck.o.deg };
    else ign.push(['create_generated_clock -name clk_out … [get_ports {clkout}]', 'source PLL clock clk_o not defined']);
  }
  if (C.inp && !C.vir) ign.push(['set_input_delay -clock clk_in_vir … [get_ports din*]', 'clock clk_in_vir not found']);
  if (C.inpX) ign.push(['set_input_delay -clock clk_in_100mhz -max 4.5 / -min 1.0 [get_ports din*]', 'no clock is named clk_in_100mhz (it is a port name, from the 100 MHz edition of the lab)']);
  if (C.out!=='off' && !ck.out) ign.push(['set_output_delay -clock [get_clocks {clk_out}] … [get_ports multout_*]', 'clock clk_out not found']);
  if (C.fpC==='typo') ign.push(['set_false_path -from [get_pins {inst1|…|pll1|clk2}] -to [get_ports {clkout}]', 'no pin matches "clk2" (the pin is clk[2])']);
  if ((C.mcS||C.mcH) && !ck.x1.ok) ign.push(['set_multicycle_path -from [get_pins {x_regtwo*|clk y_regtwo*|clk}] …', 'paths are not clocked by constrained clocks']);
  return { ck, ign, unc, phUsed };
}

/* setup / hold relationship by edge enumeration (TimeQuest rules, multicycle -end) */
function rel(Lc, le, Cc, ce, N, M){
  const per = Math.max(Lc.T, Cc.T)*4, eps = 1e-6;
  const lOff = Lc.ph + (le==='f'?Lc.T/2:0), cOff = Cc.ph + (ce==='f'?Cc.T/2:0);
  let best = null;
  for (let Li = lOff; Li < lOff + per; Li += Lc.T){
    const n = Math.floor((Li - cOff)/Cc.T + eps) + 1; let S = cOff + n*Cc.T; if (S <= Li + eps) S += Cc.T;
    S += (N-1)*Cc.T; const r = S - Li;
    if (!best || r < best.s - eps) best = { s:r, L:Li, S };
  }
  const h1 = (best.S - Cc.T*(1+M)) - best.L, h2 = (best.S - M*Cc.T) - (best.L + Lc.T);
  best.h = Math.max(h1, h2); best.hL = h1>=h2 ? best.L : best.L+Lc.T; best.hS = h1>=h2 ? best.S - Cc.T*(1+M) : best.S - M*Cc.T;
  return best;
}
function uncOf(a, b){ if (!D.C.unc) return 0; if (a==='vir'||b==='vir') return 0.05; return a===b ? 0.02 : 0.06; }  // from PLLJ_PLLSPE_INFO.txt (29 ps jitter, SPE) — inferred split
const netF = () => D.net==='post_map' ? 0.92 : 1;   // post-map estimates are optimistic (inferred)

function evalPath(p, E, corner){
  const C = D.C, ck = E.ck, k = CORNERS[corner].k * netF();
  const R = { p, n:p.n };
  if (p.kind==='async'){ if (C.fpR!=='none'){ R.st='false'; R.why = C.fpR==='inst'? 'set_false_path ×3 -to inst1|*, inst2|*, inst3|*' : 'set_false_path -from [get_ports reset]'; } else { R.st='unc'; R.why='input port reset has no input delay and no clock'; } return R; }
  if (p.kind==='clkdata'){ if (C.fpC==='ok'){ R.st='false'; R.why='set_false_path clk[2] → clkout'; } else { R.st='unc'; R.why = C.fpC==='typo' ? 'false path ignored (clk2 typo) — still unconstrained' : 'combinational clock-as-data path to an output port'; } return R; }
  if (p.kind==='in'){
    if (!(C.inp && C.vir)) { R.st='unc'; R.why='no set_input_delay on din*'; return R; }
    const lc = ck.vir, cc = ck.x1, r = rel(lc,'r',cc,'r',1,0), u = uncOf('vir','x1');
    Object.assign(R, { st:'ok', lc, cc, r, u,
      arrS: ID_MAX + p.d*k, reqS: r.s - TSU - u, arrH: ID_MIN + p.d*k*MINF, reqH: r.h + TH + u });
    R.setup = R.reqS - R.arrS; R.hold = R.arrH - R.reqH; return R;
  }
  if (p.kind==='out'){
    const xy = p.bus==='multout_xy';
    if (C.out==='off' || !ck.out){ R.st='unc'; R.why = C.out==='off'? 'no set_output_delay on '+p.bus+'*' : 'clk_out not created'; return R; }
    const ce = xy ? (C.out==='cfall' ? 'f' : 'r') : 'r';
    const lc = ck.x1, cc = ck.out, r = rel(lc, p.L[1], cc, ce, 1, 0);
    const uA = C.unc ? 0 : 0.05;   // calibration includes derive_clock_uncertainty
    const bits = OUTBITS.filter(b=>b.bus===p.bus).map(b=>{ const s = b.a*k + OUT_B;
      return { b, s, setup: r.s - OD - s + uA, hold: s - r.h - OD + uA }; });
    const ws = bits.reduce((a,x)=>x.setup<a.setup?x:a), wh = bits.reduce((a,x)=>x.hold<a.hold?x:a);
    Object.assign(R, { st:'ok', lc, cc, r, bits, ws, wh, setup:ws.setup, hold:wh.hold, ce,
      arrS: ws.s, reqS: r.s - OD, arrH: wh.s, reqH: r.h + OD, u:0 });
    if (xy && C.out==='fall') R.warn = '-fall makes the delay apply to falling data transitions; the check is against the RISING edge of clk_out';
    return R;
  }
  // reg / rec
  const lc = ck[p.L[0]], cc = ck[p.C[0]];
  const mcOn = p.mc && (C.mcTo==='all' || p.mc==='b');
  const N = mcOn && C.mcS && ck.x1.ok ? 2 : 1, M = mcOn && C.mcH && ck.x1.ok ? 1 : 0;
  const r = rel(lc, p.L[1], cc, p.C[1], N, M), u = uncOf(p.L[0], p.C[0]);
  const tsu = p.kind==='rec' ? 0.12 : TSU, th = p.kind==='rec' ? 0.1 : TH;
  Object.assign(R, { st:'ok', lc, cc, r, u, N, M, arrS: p.d*k, reqS: r.s - tsu - u, arrH: p.d*k*MINF, reqH: r.h + th + u });
  R.setup = R.reqS - R.arrS; R.hold = R.arrH - R.reqH; return R;
}
function run(corner, phaseDeg){ const E = env(phaseDeg); return { E, R: PATHS.map(p=>evalPath(p, E, corner||D.corner)) }; }
/* TimeQuest-style summary: per latch clock, setup/hold or recovery/removal */
function summary(res, an){
  const rows = {};
  res.R.forEach(r=>{ if (r.st!=='ok') return; const isRec = r.p.kind==='rec'; if ((an==='setup'||an==='hold') === isRec) return;
    const v = (an==='setup'||an==='recovery') ? r.setup : r.hold; const nm = r.cc.name;
    const row = rows[nm] || (rows[nm] = { clk:nm, worst:Infinity, tns:0, paths:[] });
    row.worst = Math.min(row.worst, v); row.paths.push(r);
    const nNeg = r.bits ? r.bits.filter(b=> ((an==='setup')? b.setup : b.hold) < 0).reduce((a,b)=>a+((an==='setup')?b.setup:b.hold),0) : (v<0 ? v*r.n : 0);
    row.tns += nNeg; });
  return Object.values(rows).sort((a,b)=>a.worst-b.worst);
}
function unconstrained(res){
  const by = id => res.R.find(r=>r.p.id===id);
  const inP = (by('in').st==='unc'?32:0) + (by('rst').st==='unc'?1:0), inPaths = (by('in').st==='unc'?32:0) + (by('rst').st==='unc'?3:0);
  const outP = (by('oab').st==='unc'?16:0) + (by('oxy').st==='unc'?16:0) + (by('clko').st==='unc'?1:0);
  return { clocks: res.E.unc.length, inP, inPaths, outP, outPaths: outP, list: res.R.filter(r=>r.st==='unc') };
}
const allOK = res => { const u = unconstrained(res); return res.E.ign.length===0 && u.clocks===0 && u.inP===0 && u.outP===0; };
const failing = res => res.R.filter(r=>r.st==='ok' && (r.setup<0 || r.hold<0));
function multicorner(phaseDeg){ return Object.keys(CORNERS).map(k=>{ const res = run(k, phaseDeg); const o = res.R.filter(r=>r.st==='ok' && r.p.kind==='out');
  return { k, res, outS: o.length? Math.min(...o.map(r=>r.setup)) : null, outH: o.length? Math.min(...o.map(r=>r.hold)) : null,
    s: Math.min(...res.R.filter(r=>r.st==='ok'&&r.p.kind!=='rec').map(r=>r.setup)), h: Math.min(...res.R.filter(r=>r.st==='ok'&&r.p.kind!=='rec').map(r=>r.hold)) }; }); }
const centreShift = mc => { const sl = mc.find(x=>x.k==='slow85'), fa = mc.find(x=>x.k==='fast'); if (sl.outS==null) return null; return (Math.min(fa.outH, sl.outH) - Math.min(sl.outS, fa.outS))/2; };
const quantPh = ns => { const st = Math.round(ns/PH_STEP); return { ns: st*PH_STEP, deg: +(st*PH_STEP/7*360).toFixed(2), steps:st }; };

/* ---------------- SDC text generated from the toggles ---------------- */
function sdcLines(){
  const C = D.C, L = [];
  const add = (txt, on, k) => L.push({ txt, on, k });
  add(`create_clock [get_ports {${C.clkPort}}] -name clk_in -period 7ns`, C.clk, 'clk');
  add(`create_clock -name clk_in_vir -period 7ns`, C.vir, 'vir');
  if (C.pll==='derive') add('derive_pll_clocks', true, 'pll');
  else ['clk_x1|1|0','clk_x2|2|1','clk_o|1|2'].forEach(s=>{ const [n,m,k]=s.split('|'); add(`create_generated_clock -name {${n}} -source [get_pins {inst1|altpll_component|auto_generated|pll1|inclk[0]}] -duty_cycle 50.000 -multiply_by ${m}${k==='2'&&C.ph?` -phase ${C.ph}`:''} -master_clock {clk_in} [get_pins {inst1|altpll_component|auto_generated|pll1|clk[${k}]}]`, C.pll==='named', 'pll'); });
  add(`create_generated_clock [get_ports {clkout}] -name clk_out -master_clock clk_o -source [get_pins {inst1|altpll_component|auto_generated|pll1|clk[2]}]`, C.clkout, 'clkout');
  add('derive_clock_uncertainty', C.unc, 'unc');
  add('set_input_delay -clock clk_in_vir -max [expr {0.7 - (-0.35) + 2.1}] [get_ports din*]', C.inp, 'inp');
  add('set_input_delay -clock clk_in_vir -min [expr {0.35 - 0.35 + 0.7}] [get_ports din*]', C.inp, 'inp');
  add('set_input_delay -clock clk_in_100mhz -max 4.5 [get_ports din*]   ;# top_sdc.txt', C.inpX, 'inpX');
  add('set_input_delay -clock clk_in_100mhz -min 1.0 [get_ports din*]   ;# top_sdc.txt', C.inpX, 'inpX');
  add('set_output_delay -clock [get_clocks {clk_out}] -max 0.35 [get_ports {multout_ab*}]', C.out!=='off', 'out');
  add('set_output_delay -clock [get_clocks {clk_out}] -min -0.35 [get_ports {multout_ab*}]', C.out!=='off', 'out');
  const fe = C.out==='fall' ? '-fall' : '-clock_fall';
  add(`set_output_delay -clock [get_clocks {clk_out}] -max 0.35 ${fe} [get_ports {multout_xy*}]`, C.out!=='off', 'out');
  add(`set_output_delay -clock [get_clocks {clk_out}] -min -0.35 ${fe} [get_ports {multout_xy*}]`, C.out!=='off', 'out');
  if (C.fpR==='port') add('set_false_path -from [get_ports reset]', true, 'fpR');
  else [1,2,3].forEach(i=> add(`set_false_path -from [get_ports {reset}] -to [get_pins -compatibility_mode {inst${i}|*}]`, C.fpR==='inst', 'fpR'));
  add(`set_false_path -from [get_pins {inst1|altpll_component|auto_generated|pll1|${C.fpC==='typo'?'clk2':'clk[2]'}}] -to [get_ports {clkout}]`, C.fpC!=='none', 'fpC');
  const to = C.mcTo==='datab' ? ' -to [get_registers {TDM_mult:mult|lpm_mult:lpm_mult_component|mult_mfq:auto_generated|mac_mult1~OBSERVABLEDATAB_REGOUT*}]' : '';
  add(`set_multicycle_path -from [get_pins {x_regtwo*|clk y_regtwo*|clk}]${to} -setup -end 2`, C.mcS, 'mcS');
  add(`set_multicycle_path -from [get_pins {x_regtwo*|clk y_regtwo*|clk}]${to} -hold -end 1`, C.mcH, 'mcH');
  return L;
}
function sdcHTML(maxH){ return `<div class="log" style="max-height:${maxH||260}px">${sdcLines().map(l=>`<div style="${l.on?'':'opacity:.35;text-decoration:line-through'}">${esc(l.txt)}</div>`).join('')}</div>`; }

/* ---------------- actions (TimeQuest console commands) ---------------- */
const FLOW = ['Analysis & Synthesis (quartus_map)','create_timing_netlist -post_map / -post_fit','read_sdc top.sdc','update_timing_netlist','report_clocks · report_ignored_constraints','report_sdc · report_ucp (unconstrained paths)','report_timing -setup / -hold · Report Worst-Case Path','Fitter (quartus_fit) with the SDC · back-annotate'];
function after(tr, flowStep){
  D.flow = flowStep==null ? 3 : flowStep;
  const res = run(); const u = unconstrained(res), f = failing(res);
  tr(`update_timing_netlist · ${CORNERS[D.corner].n} · ${D.net==='post_map'?'post-map (estimates)':'post-fit'} netlist`);
  if (res.E.ign.length) tr(`⚠ Ignored Constraints: ${res.E.ign.length} — ${res.E.ign.map(x=>x[1]).join('; ')}`);
  if (u.clocks) tr(`⚠ ${u.clocks} unconstrained clock node(s) → TimeQuest gives them 1 GHz (qts_qii53018: "a base clock with a 1 GHz requirement")`);
  tr(`Unconstrained: ${u.inP} input port(s) / ${u.inPaths} input path(s), ${u.outP} output port(s) / ${u.outPaths} output path(s)`);
  tr(f.length ? `<span style="color:var(--bad)">failing: ${f.map(r=>`${r.p.from}→${r.p.to} (${fmt(Math.min(r.setup,r.hold))} ns)`).join(', ')}</span>` : 'all analysed paths meet setup and hold');
}
const A = {
  preset(k){ act(`File ▸ Open ${PRESETS[k].file}`, tr=>{ D.preset = k; D.C = Object.assign({}, PRESETS[k].C); D.did['preset_'+k] = true;
    tr(`read_sdc ${PRESETS[k].file.split(' ')[0]}`); if (k==='soln' && D.dsn==='peter') tr('note: Altera’s file targets port clk_in; Peter’s top.bdf has clk_in_100mhz'); after(tr, 2); }); },
  dsn(k){ act(`Open ${DSN[k].file}`, tr=>{ D.dsn = k; tr(`top-level clock input port: ${DSN[k].port} · PLL symbol text "${DSN[k].sym}"`); tr('top.qsf: set_location_assignment PIN_E2 -to clk_in'+(k==='peter'?' → no node named clk_in; Fitter places clk_in_100mhz itself':'')); after(tr, 0); }); },
  tog(key, v){ act(`Edit top.sdc · ${key}`, tr=>{ const C = D.C; D.preset = 'custom';
    if (key==='clk') C.clk = !C.clk; else if (key==='clkPort') C.clkPort = v; else if (key==='vir') C.vir = !C.vir; else if (key==='pll') C.pll = v;
    else if (key==='clkout') C.clkout = !C.clkout; else if (key==='unc') C.unc = !C.unc; else if (key==='inp') C.inp = !C.inp; else if (key==='inpX') C.inpX = !C.inpX;
    else if (key==='out') C.out = v; else if (key==='fpR') C.fpR = v; else if (key==='fpC') C.fpC = v; else if (key==='mcS') C.mcS = !C.mcS; else if (key==='mcH') C.mcH = !C.mcH;
    else if (key==='mcTo') C.mcTo = v; else if (key==='ph') C.ph = +v;
    D.did[key] = true;
    const l = sdcLines().filter(x=>x.k===key); if (l.length) tr((l[0].on?'':'# ')+esc(l[0].txt)+(l.length>1?` (+${l.length-1} line${l.length>2?'s':''})`:''));
    if (key==='pll' && v==='named') tr('write_sdc -expand test.sdc → copied the 3 create_generated_clock lines and renamed them clk_x1 / clk_x2 / clk_o (Ex. 2 steps 7–11)');
    tr('reset_design'); after(tr, 3); }); },
  pllPh(v){ act(`MegaWizard altpll ▸ c2 phase shift ${v}°`, tr=>{ D.pllPh = +v; D.did.pllPh = true; const ns = (+v)/360*7;
    tr(`main_pll.v: altpll_component.clk2_phase_shift = "${Math.round(ns*1000)}" (ps) ${inf}`); tr('Update Symbol in top.bdf; recompile');
    if (D.C.pll==='named' && D.C.ph !== +v) tr(`⚠ top.sdc still says clk_o -phase ${D.C.ph}: TimeQuest will analyse ${D.C.ph}° while the silicon runs ${v}°`);
    after(tr, 7); }); },
  corner(k){ act(`Netlist ▸ Set Operating Conditions ▸ ${CORNERS[k].n}`, tr=>{ D.corner = k; D.did['c_'+k] = true; tr(`set_operating_conditions ${k==='fast'?'-model fast':'-model slow -temperature '+(k==='slow0'?'0':'85')} -voltage 1200`); after(tr, 1); }); },
  net(k){ act(`create_timing_netlist -${k}`, tr=>{ D.net = k; tr(k==='post_map' ? 'post-map: synthesis only, delays estimated (Ex. 2 step 5)' : 'post-fit: real placement and routing (after Start Compilation)'); after(tr, 1); }); },
  an(k){ act(`Report ${k[0].toUpperCase()+k.slice(1)} Summary`, tr=>{ D.an = k; D.rep = 'summary'; D.did['an_'+k] = true; const s = summary(run(), k);
    s.forEach(r=> tr(`${r.clk}: worst ${fmt(r.worst)} ns, TNS ${fmt(r.tns)}`)); if (!s.length) tr('no paths of this type'); D.flow = 6; }); },
  rep(k){ act(`Tasks ▸ ${({summary:'Summary',clocks:'Report Clocks',ucp:'Report Unconstrained Paths',ign:'Report Ignored Constraints',mc:'Multicorner summary'})[k]}`, tr=>{ D.rep = k; D.did['rep_'+k] = true;
    const res = run(); if (k==='clocks') tr(`report_clocks: ${Object.values(res.E.ck).filter(Boolean).length} clocks`);
    if (k==='ucp'){ const u = unconstrained(res); tr(`report_ucp: ${u.inP} in ports, ${u.inPaths} in paths, ${u.outP} out ports`); }
    if (k==='ign') tr(`report_ignored_constraints: ${res.E.ign.length}`);
    if (k==='mc'){ multicorner().forEach(x=> tr(`${CORNERS[x.k].n}: setup ${fmt(x.s)} · hold ${fmt(x.h)} · clk_out ${fmt(x.outS)} / ${fmt(x.outH)}`)); }
    D.flow = k==='clocks'||k==='ign' ? 4 : 5; }); },
  sel(id){ act(`Report Worst-Case Path · ${PATH(id).from} → ${PATH(id).to}`, tr=>{ D.sel = id; D.did['sel_'+id] = true; const r = run().R.find(x=>x.p.id===id);
    if (r.st!=='ok'){ tr(`not analysed: ${r.why}`); return; }
    tr(`report_timing -from_clock ${r.lc.name} -to_clock ${r.cc.name} -${D.an==='hold'?'hold':'setup'} -npaths 10 -detail path_only -panel_name "${D.an==='hold'?'Hold':'Setup'} (${r.lc.name} to ${r.cc.name})"`);
    tr(`setup relationship ${fmt(r.r.s)} ns${r.N>1?` (multicycle ${r.N})`:''}, hold relationship ${fmt(r.r.h)} ns`);
    tr(`Path #1: Setup Slack is ${fmt(r.setup)}${r.setup<0?' (VIOLATED)':''} · Hold Slack ${fmt(r.hold)}${r.hold<0?' (VIOLATED)':''}`); D.flow = 6; }); },
  pin(b){ act(`Pin Planner · ball ${b}`, tr=>{ D.pin = b; const o = OUTBITS.find(x=>x.ball===b);
    if (o){ D.sel = o.bus==='multout_ab' ? 'oab' : 'oxy'; const r = run().R.find(x=>x.p.id===D.sel); const bit = r.bits && r.bits.find(x=>x.b.ball===b);
      tr(`${o.port} at ${b}, ${fmt(o.dist,1)} balls from clkout (R4) → skew ${fmt(bit?bit.s:o.a,3)} ns ${inf}`); if (bit) tr(`setup ${fmt(bit.setup)} · hold ${fmt(bit.hold)} ns (${CORNERS[D.corner].n})`); }
    else tr(pinName(b) || 'unassigned ball'); }); },
  compile(){ act('Processing ▸ Start Compilation', tr=>{ D.net = 'post_fit'; D.did.compile = true; tr('quartus_map → quartus_fit (SDC-driven, OPTIMIZE_MULTI_CORNER_TIMING ON) → quartus_asm → quartus_sta'); after(tr, 7);
    const mc = multicorner(); tr('Multicorner: '+mc.map(x=>`${x.k} ${fmt(x.s)}/${fmt(x.h)}`).join(' · ')); }); },
  centre(){ act('Ex. 5 step 7 · centre the data valid window', tr=>{ const mc = multicorner(D.C.pll==='named'?D.C.ph:D.pllPh); const sh = centreShift(mc);
    if (sh==null){ tr('constrain the outputs first'); return; }
    const sl = mc.find(x=>x.k==='slow85'), fa = mc.find(x=>x.k==='fast');
    tr(`clk_out: slow setup ${fmt(sl.outS)} / hold ${fmt(sl.outH)} · fast setup ${fmt(fa.outS)} / hold ${fmt(fa.outH)}`);
    tr(`(smallest hold − smallest setup) ÷ 2 = (${fmt(Math.min(sl.outH,fa.outH))} − ${fmt(Math.min(sl.outS,fa.outS))}) ÷ 2 = ${fmt(sh,4)} ns`);
    const cur = (D.C.pll==='named'?D.C.ph:D.pllPh)/360*7, q = quantPh(cur + sh); tr(`MegaWizard c2: request ${fmt(cur+sh,2)} ns → actual ${fmt(q.ns,3)} ns = ${q.deg}° (${q.steps} VCO phase steps ${inf})`);
    D.suggest = q.deg; D.did.centre = true; }); },
  prod(k){ act(`Open ${PROD[k].name}`, tr=>{ D.prod = k; D.prodMode = 'a'; D.did['prod_'+k] = true; tr(PROD[k].file); tr(`${PROD[k].clocks.length} clocks, ${PROD[k].groups? 'set_clock_groups -exclusive':'no clock groups'}`); }); },
  prodMode(v){ act(`Active clock group → ${PROD[D.prod].groups?PROD[D.prod].groups[v==='a'?0:1]:v}`, tr=>{ D.prodMode = v; const P = PROD[D.prod];
    tr(`only clocks of group ${v.toUpperCase()} toggle; set_clock_groups -exclusive tells TimeQuest never to time ${P.groups?P.groups.join(' ↔ '):'—'} against each other`); }); },
  ex1(k, v){ act(`Exercise 1 · ${k} ${v}`, tr=>{ D.ex1[k] = v; const r = ex1Eval(); tr(`pipemult: setup ${fmt(r.setup)} · hold ${fmt(r.hold)} ns`); }); },
};
function pinName(b){ for (const k in BUS){ const i = BUS[k].indexOf(b); if (i>=0) return `${k}[${i}]`; } for (const k in SINGLE) if (SINGLE[k]===b) return k; return CONFIG[b] || null; }

/* ---------------- shared UI pieces ---------------- */
const btn = (a, v, label, on, title) => `<button data-a="${a}" data-v="${v==null?'':v}" class="${on?'on':''}"${title?` title="${esc(title)}"`:''}>${label}</button>`;
const slackTxt = v => v==null||!isFinite(v) ? '—' : `<span class="mono" style="color:${v<0?'var(--bad)':'var(--ink)'};font-weight:${v<0?700:400}">${fmt(v)}</span>`;
function ctlHTML(compact){
  const C = D.C, row = (lbl, body) => `<tr><th style="white-space:nowrap">${lbl}</th><td>${body}</td></tr>`;
  let s = `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${Object.keys(PRESETS).map(k=>btn('preset',k,PRESETS[k].label,D.preset===k)).join('')}</div>`;
  s += `<table class="kv">`;
  s += row('create_clock', btn('tog','clk',C.clk?'on':'off',C.clk)+` port ${btn('tog:clkPort','clk_in_100mhz','clk_in_100mhz',C.clkPort==='clk_in_100mhz')}${btn('tog:clkPort','clk_in','clk_in',C.clkPort==='clk_in')} · 7 ns`);
  s += row('virtual clock', btn('tog','vir',C.vir?'clk_in_vir 7 ns':'off',C.vir));
  s += row('PLL clocks', ['none','derive','named'].map(k=>btn('tog:pll',k,{none:'none',derive:'derive_pll_clocks',named:'clk_x1/x2/o (write_sdc -expand)'}[k],C.pll===k)).join(''));
  s += row('clk_out', btn('tog','clkout',C.clkout?'generated on clkout':'off',C.clkout)+' '+btn('tog','unc',C.unc?'derive_clock_uncertainty':'no uncertainty',C.unc));
  s += row('input delay', btn('tog','inp',C.inp?'din* max 3.15 / min 0.70':'off',C.inp)+' '+btn('tog','inpX',C.inpX?'+ clk_in_100mhz lines':'(top_sdc.txt extra lines)',C.inpX));
  s += row('output delay', [['off','off'],['fall','xy -fall (Peter)'],['cfall','xy -clock_fall']].map(([k,l])=>btn('tog:out',k,l,C.out===k)).join(''));
  s += row('false path reset', [['none','none'],['inst','-to inst1/2/3|* (Peter)'],['port','-from [get_ports reset]']].map(([k,l])=>btn('tog:fpR',k,l,C.fpR===k)).join(''));
  s += row('false path clkout', [['none','none'],['typo','…pll1|clk2 (.bak)'],['ok','…pll1|clk[2]']].map(([k,l])=>btn('tog:fpC',k,l,C.fpC===k)).join(''));
  s += row('multicycle', btn('tog','mcS',C.mcS?'-setup -end 2':'setup off',C.mcS)+btn('tog','mcH',C.mcH?'-hold -end 1':'hold off',C.mcH)+` -to ${btn('tog:mcTo','all','(none)',C.mcTo==='all')}${btn('tog:mcTo','datab','…OBSERVABLEDATAB_REGOUT*',C.mcTo==='datab')}`);
  s += row('clk_o -phase', PHASES.map(p=>btn('tog:ph',p,p+'°',C.ph===p)).join(''));
  if (!compact){
    s += row('design', Object.keys(DSN).map(k=>btn('dsn',k,k==='peter'?'Peter top.bdf (clk_in_100mhz)':'obsolete/top.bdf (clk_in)',D.dsn===k)).join(''));
    s += row('PLL c2 (MegaWizard)', PHASES.map(p=>btn('pllPh',p,p+'°',D.pllPh===p)).join(''));
  }
  s += row('operating condition', Object.keys(CORNERS).map(k=>btn('corner',k,CORNERS[k].n.replace('1200mV ',''),D.corner===k)).join(''));
  if (!compact) s += row('netlist', btn('net','post_map','post-map',D.net==='post_map')+btn('net','post_fit','post-fit',D.net==='post_fit')+' '+btn('compile','','▶ Start Compilation',false)+' '+btn('centre','','Centre clk_out window',false));
  return s + '</table>';
}
function bindCtl(root){
  bindActs(root, { preset:v=>A.preset(v), tog:v=>A.tog(v), 'tog:clkPort':v=>A.tog('clkPort',v), 'tog:pll':v=>A.tog('pll',v), 'tog:out':v=>A.tog('out',v), 'tog:fpR':v=>A.tog('fpR',v), 'tog:fpC':v=>A.tog('fpC',v), 'tog:mcTo':v=>A.tog('mcTo',v), 'tog:ph':v=>A.tog('ph',v),
    dsn:v=>A.dsn(v), pllPh:v=>A.pllPh(v), corner:v=>A.corner(v), net:v=>A.net(v), compile:()=>A.compile(), centre:()=>A.centre(), an:v=>A.an(v), rep:v=>A.rep(v), sel:v=>A.sel(v), pin:v=>A.pin(v), prod:v=>A.prod(v), prodMode:v=>A.prodMode(v), ex1:(v,b)=>A.ex1(b.dataset.k, b.dataset.k==='phys'? v==='1' : v) });
}
function reportHTML(){
  const res = run(), u = unconstrained(res);
  let s = `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${['setup','hold','recovery','removal'].map(k=>btn('an',k,k[0].toUpperCase()+k.slice(1),D.rep==='summary'&&D.an===k)).join('')}
    ${btn('rep','clocks','Clocks',D.rep==='clocks')}${btn('rep','ucp',`Unconstrained (${u.inP+u.outP+u.clocks})`,D.rep==='ucp')}${btn('rep','ign',`Ignored (${res.E.ign.length})`,D.rep==='ign')}${btn('rep','mc','Multicorner',D.rep==='mc')}</div>`;
  if (D.rep==='summary'){
    const sm = summary(res, D.an);
    s += `<div class="small muted">${D.an[0].toUpperCase()+D.an.slice(1)} Summary · ${CORNERS[D.corner].n}${D.net==='post_map'?' · post-map':''}</div>` + (sm.length ? tbl(['Clock','Slack','End Point TNS'], sm.map(r=>[`<span class="mono">${r.clk}</span>`, slackTxt(r.worst), slackTxt(r.tns)])) : '<p class="small muted">No paths of this type are constrained.</p>');
  } else if (D.rep==='clocks'){
    s += tbl(['Clock','Type','Period','Freq','Rise','Fall','Target'], Object.values(res.E.ck).filter(Boolean).map(c=>[`<span class="mono">${c.name}</span>`, c.type.startsWith('Base (')?`<span style="color:var(--bad)">${c.type}</span>`:c.type, fmt(c.T), (1000/c.T).toFixed(2)+' MHz', fmt(c.ph), fmt(c.ph+c.T/2), `<span class="mono small">${esc(c.target)}</span>`]));
  } else if (D.rep==='ucp'){
    s += kv([['Unconstrained clocks', u.clocks + (u.clocks? ` <span class="small muted">(${res.E.unc.join(', ')})</span>`:'')],['Unconstrained input ports / paths', `${u.inP} / ${u.inPaths}`],['Unconstrained output ports / paths', `${u.outP} / ${u.outPaths}`]])
      + (u.list.length ? tbl(['from','to','why'], u.list.map(r=>[esc(r.p.from), esc(r.p.to), r.why])) : '<p class="small" style="color:var(--accent)">All paths constrained.</p>');
  } else if (D.rep==='ign'){
    s += res.E.ign.length ? tbl(['Constraint','Reason'], res.E.ign.map(x=>[`<span class="mono small">${esc(x[0])}</span>`, x[1]])) : '<p class="small" style="color:var(--accent)">No ignored constraints.</p>';
  } else if (D.rep==='mc'){
    const mc = multicorner();
    s += tbl(['Model','worst setup','worst hold','clk_out setup','clk_out hold'], mc.map(x=>[CORNERS[x.k].n, slackTxt(x.s), slackTxt(x.h), slackTxt(x.outS), slackTxt(x.outH)]));
    const sh = centreShift(mc); if (sh!=null) s += `<p class="small">Centring shift for clk_o: (smallest hold − smallest setup) ÷ 2 = <b class="mono">${fmt(sh,4)} ns</b>${D.suggest!=null?` · MegaWizard gives ${D.suggest}°`:''}.</p>`;
  }
  const f = failing(res); s += `<p class="small" style="margin:6px 0 0">${res.E.ign.length||u.clocks||u.inP||u.outP?'<span style="color:var(--warn)">⚠ constraints incomplete</span> · ':''}${f.length?`<b style="color:var(--bad)">${f.length} path group(s) failing</b>`:'<span style="color:var(--accent)">no violations</span>'}</p>`;
  if (D.C.pll==='named' && D.C.ph !== D.pllPh) s += `<p class="small" style="color:var(--warn)">⚠ top.sdc says clk_o -phase ${D.C.ph}°, main_pll c2 is set to ${D.pllPh}°. The report does not describe the silicon.</p>`;
  return s;
}
function pathsHTML(){
  const res = run(), key = D.an==='hold'||D.an==='removal' ? 'hold' : 'setup';
  const rows = res.R.slice().sort((a,b)=> (a.st==='ok'?a[key]:1e9) - (b.st==='ok'?b[key]:1e9));
  return `<div class="small muted">Click a row for its worst-case path (${key}).</div><div class="scroll">` + tbl(['From','To','n','Launch → latch','rel.','Slack'], rows.map(r=>[
    `<a href="#" data-a="sel" data-v="${r.p.id}" style="${D.sel===r.p.id?'font-weight:700':''}">${esc(r.p.from)}</a>`, `<span class="small">${esc(r.p.to)}</span>`, r.n,
    r.st==='ok' ? `<span class="mono small">${r.lc.name.replace('inst1|altpll_component|auto_generated|pll1|','pll1|')} → ${r.cc.name.replace('inst1|altpll_component|auto_generated|pll1|','pll1|')}</span>` : `<span class="small muted">${r.st==='false'?'false path':'unconstrained'}</span>`,
    r.st==='ok' ? `<span class="mono">${fmt(key==='setup'?r.r.s:r.r.h,3)}</span>` : '', r.st==='ok' ? slackTxt(r[key]) : `<span class="small" style="color:${r.st==='unc'?'var(--warn)':'var(--ink2)'}">${r.st==='unc'?'unconstrained':'—'}</span>`])) + '</div>';
}
/* TimeQuest Waveform tab for the selected path */
function waveSVG(r, hold){
  if (!r || r.st!=='ok') return `<p class="small muted">${r? esc(r.p.from)+' → '+esc(r.p.to)+': '+r.why : ''}</p>`;
  const W = 640, H = 200, L = 110, T0 = -1, T1 = Math.max(9, r.r.s + 2, r.arrS + 1.5);
  const X = t => L + (t - T0)/(T1 - T0)*(W - L - 10);
  const cT = t => clamp(t, T0, T1);
  const wave = (y, ck, edge, col, name) => { let d = ''; for (let n = Math.floor((T0-ck.ph)/ck.T)-1; ck.ph+n*ck.T < T1; n++){ const r = ck.ph+n*ck.T, f = r+ck.T/2; d += `M${X(cT(r))},${y+16}L${X(cT(r))},${y}L${X(cT(f))},${y}L${X(cT(f))},${y+16}L${X(cT(r+ck.T))},${y+16}`; } return `<text x="6" y="${y+12}" font-size="11" fill="var(--ink)">${name}</text><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6"/>`; };
  const lE = hold ? r.r.hL : r.r.L, cE = hold ? r.r.hS : r.r.S, arr = lE + (hold ? r.arrH : r.arrS), req = cE + (hold ? (r.reqH - r.r.h) : (r.reqS - r.r.s)), slack = hold ? r.hold : r.setup;
  const css = SIM.css;
  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">`;
  for (let t = Math.ceil(T0); t <= T1; t++) s += `<line x1="${X(t)}" y1="10" x2="${X(t)}" y2="${H-18}" stroke="var(--grid)"/><text x="${X(t)}" y="${H-5}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${t}</text>`;
  s += wave(16, r.lc, 'r', css('--accent2'), 'launch '+r.lc.name.replace(/.*\|clk\[(\d)\]/,'pll1 c$1'));
  s += wave(56, r.cc, 'r', css('--accent'), 'latch '+r.cc.name.replace(/.*\|clk\[(\d)\]/,'pll1 c$1'));
  s += `<line x1="${X(lE)}" y1="10" x2="${X(lE)}" y2="${H-18}" stroke="var(--accent2)" stroke-dasharray="3 3"/><line x1="${X(cE)}" y1="10" x2="${X(cE)}" y2="${H-18}" stroke="var(--accent)" stroke-dasharray="3 3"/>`;
  s += `<text x="6" y="110" font-size="11" fill="var(--ink)">data arrival</text><rect x="${X(lE)}" y="98" width="${Math.max(1,X(arr)-X(lE))}" height="16" fill="var(--accent2)" opacity=".45"/><text x="${X(arr)+4}" y="110" font-size="10" fill="var(--ink)">${fmt(arr)}</text>`;
  s += `<text x="6" y="138" font-size="11" fill="var(--ink)">data required</text><rect x="${X(Math.min(cE,req))}" y="126" width="${Math.max(1,Math.abs(X(req)-X(cE)))}" height="16" fill="var(--accent)" opacity=".45"/><line x1="${X(req)}" y1="120" x2="${X(req)}" y2="148" stroke="var(--ink)" stroke-width="2"/><text x="${X(req)+4}" y="140" font-size="10" fill="var(--ink)">${fmt(req)}</text>`;
  const a = Math.min(arr, req), b = Math.max(arr, req);
  s += `<line x1="${X(a)}" y1="164" x2="${X(b)}" y2="164" stroke="${slack<0?css('--bad'):css('--accent')}" stroke-width="3"/><text x="${X(b)+6}" y="168" font-size="11.5" font-weight="700" fill="${slack<0?css('--bad'):css('--ink')}">${hold?'hold':'setup'} slack ${fmt(slack)} ns${slack<0?' (VIOLATED)':''}</text>`;
  s += `<text x="${W-10}" y="${H-5}" font-size="9.5" text-anchor="end" fill="var(--ink2)">ns</text></svg>`;
  return s;
}
function pathDetailHTML(){
  const res = run(), r = res.R.find(x=>x.p.id===D.sel), hold = D.an==='hold'||D.an==='removal';
  let s = `<div class="small"><b>${esc(r.p.from)}</b> → <b>${esc(r.p.to)}</b> · ${r.p.note}</div>` + waveSVG(r, hold);
  if (r.st==='ok'){
    const rows = [['Launch / latch clocks', `${r.lc.name} (${fmt(r.lc.T)} ns) → ${r.cc.name} (${fmt(r.cc.T)} ns)`, 1], ['Setup / hold relationship', `${fmt(r.r.s)} / ${fmt(r.r.h)} ns${r.N>1?` · multicycle setup ${r.N}, hold ${r.M}`:''}`, 1]];
    if (r.bits){ rows.push(['Worst setup bit', `${r.ws.b.port} (${r.ws.b.ball}) skew ${fmt(r.ws.s)} ns`, 1], ['Worst hold bit', `${r.wh.b.port} (${r.wh.b.ball}) skew ${fmt(r.wh.s)} ns`, 1], ['Output delay', `-max ${OD} / -min −${OD} (Tsu = Th = 0.35 ns)`, 1]); }
    else rows.push(['Data delay (max / min)', `${fmt(r.arrS)} / ${fmt(r.arrH)} ns ${inf}`, 1], ['tsu / th / uncertainty', `${TSU} / ${TH} / ${fmt(r.u,2)} ns ${inf}`, 1]);
    if (r.warn) rows.push(['⚠', `<span style="color:var(--warn)">${r.warn}</span>`]);
    s += kv(rows);
  }
  return s;
}
/* EP3C5F256C6 ball map (top.qsf) */
function pinSVG(){
  const res = run(), byBall = {}; ['oab','oxy'].forEach(id=>{ const r = res.R.find(x=>x.p.id===id); if (r.bits) r.bits.forEach(b=> byBall[b.b.ball] = b); });
  const p = 23, x0 = 30, y0 = 24; let s = `<svg viewBox="0 0 ${x0+16*p+170} ${y0+16*p+16}" style="width:100%">`;
  for (let c = 0; c < 16; c++) s += `<text x="${x0+c*p+p/2}" y="${y0-8}" font-size="9" text-anchor="middle" fill="var(--ink2)">${c+1}</text>`;
  for (let r = 0; r < 16; r++){ s += `<text x="${x0-10}" y="${y0+r*p+p/2+3}" font-size="9" text-anchor="middle" fill="var(--ink2)">${ROWS[r]}</text>`;
    for (let c = 0; c < 16; c++){ const b = ROWS[r]+(c+1), nm = pinName(b); let fill = 'var(--panel2)', stroke = 'var(--line)';
      if (nm){ if (/^multout/.test(nm)){ const bb = byBall[b]; const v = bb ? Math.min(bb.setup, bb.hold) : null; fill = v==null ? 'var(--chip)' : v<0 ? 'var(--bad)' : `color-mix(in srgb, var(--accent) ${Math.round(clamp(30+60*(1-v/3),25,90))}%, var(--panel2))`; }
        else if (/^din/.test(nm)) fill = 'color-mix(in srgb, var(--accent2) 45%, var(--panel2))'; else if (nm==='clkout'||nm==='clk_in') fill = 'var(--warn)'; else if (nm==='reset') fill = 'var(--ink2)'; else fill = 'var(--grid)'; stroke = 'var(--ink2)'; }
      if (D.pin===b) stroke = 'var(--play)';
      s += `<circle data-a="pin" data-v="${b}" cx="${x0+c*p+p/2}" cy="${y0+r*p+p/2}" r="${p*0.4}" fill="${fill}" stroke="${stroke}" stroke-width="${D.pin===b?2.5:1}" style="cursor:pointer"><title>${b} ${nm||''}</title></circle>`; } }
  const lx = x0+16*p+14; const leg = [['var(--warn)','clkout R4 · clk_in E2 (qsf)'],['color-mix(in srgb, var(--accent2) 45%, var(--panel2))','din_a/b/x/y'],['color-mix(in srgb, var(--accent) 60%, var(--panel2))','multout (green = slack)'],['var(--bad)','multout failing'],['var(--ink2)','reset E1'],['var(--grid)','configuration pins']];
  leg.forEach((l,i)=> s += `<circle cx="${lx+6}" cy="${y0+10+i*20}" r="6" fill="${l[0]}" stroke="var(--ink2)"/><text x="${lx+16}" y="${y0+14+i*20}" font-size="10" fill="var(--ink)">${l[1]}</text>`);
  s += `<text x="${lx}" y="${y0+140}" font-size="10" fill="var(--ink2)">Click a ball.</text>`;
  return s + '</svg>';
}
function pinInfoHTML(){
  if (!D.pin) return `<p class="small muted">EP3C5F256C6 ball map from top.qsf (Timing lab, 28 Sep 2010). In Peter's top.bdf the clock port is clk_in_100mhz, so the qsf assignment of E2 to clk_in matches nothing ${infW('Quartus warns that a node in an assignment does not exist')}.</p>`;
  const nm = pinName(D.pin), o = OUTBITS.find(x=>x.ball===D.pin);
  if (!o) return `<p class="small"><b>${D.pin}</b> · ${nm||'unassigned'}${D.pin==='E2'&&D.dsn==='peter'?' — orphan: the design has no node named clk_in':''}</p>`;
  const r = run().R.find(x=>x.p.id===(o.bus==='multout_ab'?'oab':'oxy')), b = r.bits && r.bits.find(x=>x.b.ball===D.pin);
  return `<p class="small"><b>${D.pin}</b> · ${o.port} · ${fmt(o.dist,1)} ball pitches from clkout ${inf} · skew ${b?fmt(b.s):'—'} ns · setup ${b?slackTxt(b.setup):'—'} · hold ${b?slackTxt(b.hold):'—'}</p>`;
}

/* ---------------- 1-second timeline (ns-scale behaviour) ---------------- */
const LOCK_T = 1e-3, T7 = 7*NS;   // reset released at t=0, PLL lock after ~1 ms (inferred)
function sq(c, X, t0, t1, y, h, T, ph, col, label, from){
  const st = from||0; if (t1 < st) return; const a = Math.max(t0, st);
  const pxPer = Math.abs(X(a+T)-X(a)); c.strokeStyle = col; c.fillStyle = col;
  if (pxPer < 6){ c.globalAlpha=.3; c.fillRect(X(a), y+5, X(t1)-X(a), h-10); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`${Math.round((t1-a)/T).toLocaleString()} × ${label} (every ${SIM.fmtDur(T)})`, X(a)+6, y+h/2+4); return; }
  c.lineWidth = 1.5; c.beginPath(); const n0 = Math.floor((a-ph)/T)-1;
  for (let n = n0; ph+n*T < t1; n++){ const r = ph+n*T, f = r+T/2; const yy = y+4, yl = y+h-4;
    c.moveTo(X(Math.max(r,a)), yl); c.lineTo(X(Math.max(r,a)), yy); c.lineTo(X(Math.max(f,a)), yy); c.lineTo(X(Math.max(f,a)), yl); c.lineTo(X(Math.max(r+T,a)), yl); }
  c.stroke();
}
function lanes(){
  const res = run(), ck = res.E.ck, css = SIM.css, k = CORNERS[D.corner].k;
  const T = ck.x1.ok ? 7*NS : 1*NS, phO = ck.o.ok ? D.pllPh/360*7*NS : 0;   // silicon runs the MegaWizard phase
  const yR = res.R.find(r=>r.p.id==='y'), oab = res.R.find(r=>r.p.id==='oab');
  const CLKPIN = 2.0*NS;   // clock path to the clkout ball (inferred)
  const sMin = OUTBITS.reduce((a,b)=>Math.min(a,b.a),9)*k+OUT_B, sMax = OUTBITS.reduce((a,b)=>Math.max(a,b.a),0)*k+OUT_B;
  return [
    { label:`clk_in_100mhz pin (7 ns, 142.86 MHz)`, h:22, draw(c,X,t0,t1,y,h){ sq(c,X,t0,t1,y,h,7*NS,0,css('--ink2'),'clk_in'); } },
    { label:`pll1 c0 = clk_x1 / c100`, h:22, draw(c,X,t0,t1,y,h){ sq(c,X,t0,t1,y,h,7*NS,0,css('--accent2'),'clk_x1',LOCK_T); if (t0<LOCK_T) laneText(c,X,t0,y,h,'PLL not locked '+inf.replace(/<[^>]+>/g,'')); } },
    { label:`pll1 c1 = clk_x2 / c200 (3.5 ns)`, h:22, draw(c,X,t0,t1,y,h){ sq(c,X,t0,t1,y,h,3.5*NS,0,css('--accent'),'clk_x2',LOCK_T); } },
    { label:'mux_ax/mux_by sel (= clk_x1)', h:22, draw(c,X,t0,t1,y,h){ if (X(t0+T)-X(t0) < 30){ laneText(c,X,t0,y,h,'a·b while clk_x1 high, x·y while low'); return; } for (let n=Math.floor(t0/T); n*T<t1; n++){ bandAt(c,X,n*T,n*T+T/2,y,h,css('--accent2'),.35,'a·b'); bandAt(c,X,n*T+T/2,n*T+T,y,h,css('--warn'),.35,'x·y'); } } },
    { label:`y_regtwo → delay_8bits → mult (${yR.st==='ok'?fmt(yR.setup)+' ns':'—'})`, h:24, draw(c,X,t0,t1,y,h){ if (yR.st!=='ok' || X(t0+T)-X(t0) < 30){ laneText(c,X,t0,y,h, yR.st==='ok'? `data takes ${fmt(yR.arrS)} ns; latch at ${fmt(yR.r.s)} ns` : 'not analysed'); return; }
        for (let n=Math.floor(t0/T)-1; n*T<t1; n++){ const a=n*T, arr=a+yR.arrS*NS, lat=a+yR.r.s*NS; bandAt(c,X,a,arr,y,h,yR.setup<0?css('--bad'):css('--accent2'),.45); c.fillStyle=css('--ink'); c.fillRect(X(lat)-1,y+2,2,h-4); } } },
    { label:'TDM_mult result (pipeline 3)', h:22, draw(c,X,t0,t1,y,h){ const t2=3.5*NS; if (X(t0+t2)-X(t0) < 28){ laneText(c,X,t0,y,h,'285.7 M products / s'); return; } for (let n=Math.floor(t0/t2); n*t2<t1; n++){ bandAt(c,X,n*t2+0.3*NS,n*t2+t2,y,h,n%2?css('--accent2'):css('--warn'),.3,n%2?'a·b':'x·y'); } } },
    { label:`multout_ab at the pins (${CORNERS[D.corner].n.split(' ')[0]})`, h:24, draw(c,X,t0,t1,y,h){ if (X(t0+T)-X(t0) < 30){ laneText(c,X,t0,y,h,'142.86 M words / s per bus'); return; }
        for (let n=Math.floor(t0/T)-1; n*T<t1; n++){ const a=n*T+CLKPIN; bandAt(c,X,a+sMin*NS,a+sMax*NS,y,h,css('--ink2'),.5,'switching'); } } },
    { label:`clkout pin (c2 ${D.pllPh}°) ±0.35 ns window`, h:24, draw(c,X,t0,t1,y,h){ sq(c,X,t0,t1,y,h,7*NS,CLKPIN+phO,css('--warn'),'clkout',LOCK_T);
        if (X(t0+T)-X(t0) >= 30 && oab.st==='ok') for (let n=Math.floor(t0/T)-1; n*T<t1; n++){ const e = n*T+CLKPIN+phO+7*NS; c.fillStyle=css('--play'); c.globalAlpha=.25; c.fillRect(X(e-OD*NS), y, X(e+OD*NS)-X(e-OD*NS), h); c.globalAlpha=1; } } },
    { label:'reset → inst2 → inst3 (aclr)', h:22, draw(c,X,t0,t1,y,h){ const rel = LOCK_T + 2*T; bandAt(c,X,0,Math.min(rel,t1),y,h,css('--bad'),.35,'aclr asserted'); if (rel<t1) bandAt(c,X,rel,t1,y,h,css('--accent'),.25,'running'); } },
  ];
}

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('TimeQuest · top.sdc (Timing lab, Quartus II 9.0 SP2)', `<div id="ctl"></div>`)}${card('top.sdc as the toggles write it', `<div id="sdc"></div>`)}${card('EP3C5F256C6 · Pin Planner from top.qsf', `<div id="pins"></div><div id="pinfo"></div>`)}</div>
    <div>${card('TimeQuest report', `<div id="rep"></div>`)}${card('Report Timing', `<div id="paths"></div>`)}${card('Worst-case path · Waveform', `<div id="pd"></div>`)}${card('Console (last action)', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('The lab design running: 1 s of clock, zoom to see each 7 ns cycle', `<canvas id="tl"></canvas><p class="small muted">The clocks are drawn at the PLL phase the silicon runs (MegaWizard c2), not the phase top.sdc claims. Clock path to clkout (2.0 ns), PLL lock time (≈1 ms) and the output switching spread are ${inf}.</p>`)}`;
  const draw = ()=>{ const ctl = m.querySelector('#ctl'); ctl.innerHTML = ctlHTML(false); bindCtl(ctl);
    m.querySelector('#sdc').innerHTML = sdcHTML(220);
    const pn = m.querySelector('#pins'); pn.innerHTML = pinSVG(); bindCtl(pn); m.querySelector('#pinfo').innerHTML = pinInfoHTML();
    const rp = m.querySelector('#rep'); rp.innerHTML = reportHTML(); bindCtl(rp);
    const pt = m.querySelector('#paths'); pt.innerHTML = pathsHTML(); bindCtl(pt);
    m.querySelector('#pd').innerHTML = pathDetailHTML(); m.querySelector('#trace').innerHTML = traceHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:250}); };
  SIM.on('time', draw);
}

const tutor = { i:0 };
const R0 = () => run();
const LESSONS = [
  { title:'Why RD13 existed', auto:true, check:()=>true, body:`<p>In September 2010|43 the POD32 FPGA was being brought up with an SDC file that had been converted from the old Classic Timing Analyzer (its header says <span class="mono">Project: m6205c</span>, 18 Aug 2010). Peter took Altera's "Quartus II Software Design Series: Timing Analysis" class over WebEx on 14–15 September and kept the labs. The register closes RD13 on 2010-09-18.</p><p>This tutorial repeats his lab on the real lab files. The panel on the right is the same TimeQuest model as the Simulator tab.</p>` },
  { title:'1 · A design with no SDC', body:`<p>Press <b>No SDC</b>. That is how Project1/exercise2.qsf from the FPGA 101 class was left. TimeQuest then gives every clock node 1 GHz, so every path fails. Open <b>Clocks</b> to see the "default 1 GHz" clocks.</p>`, check:()=>D.preset==='none'&&D.rep==='clocks', hint:'No SDC, then the Clocks report button.' },
  { title:'2 · Ex. 2: base, virtual and PLL clocks', body:`<p>Switch <b>create_clock</b> on (7 ns on <span class="mono">clk_in_100mhz</span>, Peter's port name), add the <b>virtual clock</b>, then <b>derive_pll_clocks</b> and <b>derive_clock_uncertainty</b>. Report Clocks: one base, one virtual and three generated clocks, all rising at 0.000.</p>`, check:()=>{ const r=R0(); return D.C.clk&&D.C.vir&&D.C.pll!=='none'&&D.C.unc&&r.E.unc.length===0; }, hint:'create_clock on with port clk_in_100mhz, virtual clock on, PLL = derive_pll_clocks, uncertainty on.' },
  { title:'3 · write_sdc -expand and rename', body:`<p>The lab has you run <span class="mono">write_sdc -expand test.sdc</span>, copy the three expanded <span class="mono">create_generated_clock</span> lines and rename them. Peter's test.sdc is that file (14 Sep 2010, Quartus 9.0 SP2). Choose <b>clk_x1/x2/o</b>.</p>`, check:()=>D.C.pll==='named'&&R0().E.ign.length===0, hint:'PLL clocks → clk_x1/x2/o.' },
  { title:'4 · The port-name trap', body:`<p>The Altera solution names the port <span class="mono">clk_in</span>. Peter's top.bdf calls it <span class="mono">clk_in_100mhz</span>, a name left over from the 100 MHz edition of this lab. Set the create_clock port to <b>clk_in</b> and look at <b>Ignored</b>: the base clock disappears, and every clock built on it goes with it. Then set it back.</p>`, check:()=>D.did['clkPort']&&D.C.clkPort==='clk_in_100mhz'&&LOG.items.some(e=>/clkPort/.test(e.name)), hint:'Port clk_in, look at Ignored, then port clk_in_100mhz again.' },
  { title:'5 · Ex. 3: system-centric input delays', body:`<p>Turn on <b>input delay</b>. Max = board 0.7 − skew (−0.35) + tco 2.1 = <b>3.15 ns</b>; min = 0.35 − 0.35 + 0.7 = <b>0.70 ns</b>. These are the <span class="mono">expr</span> lines in Peter's file. Unconstrained now shows 1 input port and 3 input paths (the reset), as the manual says.</p>`, check:()=>{ const u=unconstrained(R0()); return D.C.inp&&u.inP===1&&u.inPaths===3; }, hint:'input delay on; reset false path off.' },
  { title:'6 · Ex. 4: the source-synchronous outputs', body:`<p>Create <b>clk_out</b> on the clkout port and set the output delays the way Peter did (<b>xy -fall</b>). Select the <span class="mono">inst14 → multout_xy</span> path. <span class="mono">-fall</span> is about falling <i>data</i> transitions, not the falling <i>clock</i> edge, so the check runs against the rising edge of clk_out with only 3.5 ns. Fix it with <b>-clock_fall</b>.</p>`, check:()=>D.C.clkout&&D.C.out==='cfall'&&D.did.sel_oxy, hint:'clk_out on, output delay → xy -fall, click the inst14 row, then xy -clock_fall.' },
  { title:'7 · Ex. 5: false paths, and the .bak typo', body:`<p>Load <b>Peter · top.sdc.bak</b>. Its clkout false path names pin <span class="mono">…pll1|clk2</span>. No pin has that name, so the line is ignored and clkout stays unconstrained. Load <b>Peter · top.sdc</b> (15 Sep): it is fixed to <span class="mono">clk[2]</span>. Peter cuts the reset with three <span class="mono">-to inst1|*, inst2|*, inst3|*</span> lines, which matches the "3 unconstrained input paths" exactly.</p>`, check:()=>D.did.preset_bak&&D.preset==='peter', hint:'Load top.sdc.bak, look at Ignored, then load top.sdc.' },
  { title:'8 · Compile and find the failure', body:`<p>Peter's file stops here, so set the xy edge to <b>-clock_fall</b>, press <b>Start Compilation</b>, then <b>Setup</b>. clk_x2 fails. Click the <span class="mono">y_regtwo</span> row: <b>−1.923 ns</b>, the number in the manual. All eight paths go through <span class="mono">inst24 delay_8bits</span>, a chain of 11 LCELLs.</p>`, check:()=>D.did.compile&&D.sel==='y'&&D.did.an_setup, hint:'Output delay xy -clock_fall, Start Compilation, Setup, click y_regtwo.' },
  { title:'9 · Multicycle: setup and hold together', body:`<p>x/y data is only used while clk_x1 is low, so it has 7 ns, not 3.5. Add <b>-setup -end 2</b> on its own and check <b>Hold</b>: the hold edge moves out with the setup edge and now fails. Add <b>-hold -end 1</b> to put it back.</p>`, check:()=>D.C.mcS&&D.C.mcH&&failing(R0()).length===0&&LOG.items.some(e=>/mcS/.test(e.name)), hint:'multicycle setup on, look at Hold, then hold on.' },
  { title:'10 · Centre the data valid window', body:`<p>Press <b>Centre clk_out window</b>. It reproduces the solution sheet: (0.823 − 2.240) ÷ 2 = −0.7085 ns. The MegaWizard rounds this to <b>−38.51°</b>. Set the <b>PLL c2</b> to −38.51° <i>and</i> the <b>clk_o -phase</b> to −38.51°. If you change only one, the report and the silicon disagree.</p>`, check:()=>D.did.centre&&D.pllPh===-38.51&&D.C.ph===-38.51, hint:'Centre, then PLL c2 −38.51° and clk_o -phase −38.51°.' },
  { title:'11 · Take it to POD32', body:`<p>Open the <b>Software</b> tab and pick <b>POD32 v100</b>. The same commands are there: two clocks on one pin with <span class="mono">-add</span> (HD 13.468 ns, SD 37.04 ns), <span class="mono">set_clock_groups -exclusive</span>, the <span class="mono">-compatibility_mode inst43|*</span> false-path idiom, and source-synchronous <span class="mono">set_output_delay</span> on Cout/Yout from v100g (5 Oct 2010) onward, three weeks after the class.</p>`, check:()=>D.did.prod_pod32||D.prod!=='pod32'&&Object.keys(D.did).some(k=>/^prod_/.test(k)), hint:'Software tab → POD32 v100 button.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — the RD13 timing lab, as Peter ran it', panelTitle:'TimeQuest (same model as the Simulator tab)', reset,
  panel(el){ el.innerHTML = ctlHTML(false) + `<div style="margin-top:8px">${reportHTML()}</div><details open><summary class="small">Report Timing</summary>${pathsHTML()}</details><details><summary class="small">Worst-case path</summary>${pathDetailHTML()}</details>`; bindCtl(el); } }); }

/* one second: counts, and the cycle under the playhead with real TDM pipeline values */
const din = (bus, j) => ({ a:(j*37+11)&255, b:(j*91+3)&255, x:(j*53+29)&255, y:(j*17+200)&255 })[bus];   // test pattern (inferred; the lab has no vectors)
function viewSecond(m){
  m.innerHTML = `${card('One second of the lab design', `<div id="ev"></div>`)}<div class="grid2">${card('The 7 ns cycle under the playhead', `<div id="cy"></div>`)}${card('How many timing checks one second contains', `<div id="ck"></div>`)}</div>${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  const draw = ()=>{
    const per = 7e-9, live = SIM.t > LOCK_T, n0 = Math.ceil(LOCK_T/per), N_ = Math.floor(SIM.t/per + 1e-9), n = Math.max(0, N_ - n0), ph = SIM.t/per - N_;
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','from'], [
      ['clk_in / clk_x1 / clk_o rising edges', (1e9/7).toLocaleString(undefined,{maximumFractionDigits:0}), 'create_clock -period 7 · main_pll c0, c2 ×1'],
      ['clk_x2 rising edges', (2e9/7).toLocaleString(undefined,{maximumFractionDigits:0}), 'main_pll c1 ×2 (-multiply_by 2)'],
      ['Products out of TDM_mult', (2e9/7).toLocaleString(undefined,{maximumFractionDigits:0}), 'one multiplier, two products per clk_x1 cycle'],
      ['Words on multout_ab and on multout_xy', (1e9/7).toLocaleString(undefined,{maximumFractionDigits:0})+' each', 'inst15 on rising, inst14 on falling clk_x1'],
      ['Data bits leaving the FPGA', (32e9/7).toLocaleString(undefined,{maximumFractionDigits:0}), '32 pins'],
      ['PLL lock / aclr release', '1 (at ≈1 ms)', `inst2 → inst3 synchroniser ${inf}`]].map(r=>[r[0], `<span class="mono">${r[1]}</span>`, r[2]]));
    if (!live){ m.querySelector('#cy').innerHTML = `<p class="small">t = ${SIM.fmtT(SIM.t)}: the PLL is still locking and aclr holds all 96 registers clear ${inf}. Move the playhead past 1 ms.</p>`; }
    else {
      const j = n;   // sample index entering regone at this edge
      const rows = [['regone (captured at this rising edge)', `a=${din('a',j)} b=${din('b',j)} x=${din('x',j)} y=${din('y',j)}`],
        ['regtwo', `a=${din('a',j-1)} b=${din('b',j-1)} x=${din('x',j-1)} y=${din('y',j-1)}`],
        ['mux / mult input', ph<0.5? `a·b of sample ${j-1}: ${din('a',j-1)}×${din('b',j-1)} (captured at +3.5 ns)` : `x·y of sample ${j-1}: ${din('x',j-1)}×${din('y',j-1)} (captured at the next rising edge)`],
        ['inst15 → multout_ab', `${din('a',j-3)}×${din('b',j-3)} = <b>${din('a',j-3)*din('b',j-3)}</b>`],
        ['inst14 → multout_xy', `${din('x',j-3)}×${din('y',j-3)} = <b>${din('x',j-3)*din('y',j-3)}</b> (changes at the falling edge)`]];
      m.querySelector('#cy').innerHTML = `<p class="small">clk_x1 cycle <b class="mono">${n.toLocaleString()}</b> since lock, ${Math.round(ph*7*1000)} ps into it (${ph<0.5?'clk_x1 high → mux passes a/b':'clk_x1 low → mux passes x/y'}).</p>` + kv(rows) + `<p class="small muted">The pipeline depth follows TDM_mult.v (LPM_PIPELINE = 3, taken as input, pipeline and output registers ${inf}). With it a·b lands on an odd clk_x2 edge, ready for inst15's rising edge, and x·y lands in time for inst14's falling edge. The din values are a test pattern ${inf}.</p>`;
    }
    const res = run(); const ends = res.R.filter(r=>r.st==='ok').reduce((a,r)=>a + (r.p.kind==='rec'?96:r.n), 0);
    m.querySelector('#ck').innerHTML = kv([['Analysed path groups', res.R.filter(r=>r.st==='ok').length+' of '+PATHS.length],['Endpoints checked', ends],['Checks the silicon must pass each second', `≈ ${(ends*2*1e9/7).toExponential(2)} (setup + hold at every clk_x1 edge)`],['Report Timing', 'checks each endpoint once per relationship, in milliseconds']]) + `<p class="small">That is the point of static timing analysis: one worst-case relationship per path stands in for every one of the 142,857,143 cycles in this second.</p>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:250});
  };
  SIM.on('time', draw);
}

/* block diagram of top.bdf with live slack colours */
function viewBlock(m){
  const st = id => { const r = run().R.find(x=>x.p.id===id); if (!r || r.st==='unc') return 'unc'; if (r.st==='false') return 'fp'; return (r.setup<0||r.hold<0)?'bad':'ok'; };
  const B = {
    din:{x:14,y:110,w:118,h:84,t:'din_a/b/x/y',s:['4 × 8 pins','in delay 3.15/0.70'],d:'Four 8-bit inputs. Ex. 3 constrains them against the virtual clock clk_in_vir with the system-centric equations.',p:'in'},
    r1:{x:160,y:110,w:110,h:84,t:'*_regone',s:['DFF ×4 (c100)','aclr'],d:'First register bank: a_regone, b_regone, x_regone, y_regone.',p:'in'},
    r2:{x:296,y:110,w:110,h:84,t:'*_regtwo',s:['DFF ×4 (c100)'],d:'Second bank. x_regtwo and y_regtwo are the -from of the multicycle exception.',p:'r12'},
    dly:{x:296,y:222,w:110,h:56,t:'inst24',s:['delay_8bits','11 LCELLs'],d:'Placed on purpose after y_regtwo "to represent some logical delay" (manual Ex. 5). It is why clk_x2 fails by −1.923 ns.',p:'y'},
    mux:{x:432,y:110,w:108,h:84,t:'mux_ax / mux_by',s:['lpm_mux 2:1 ×8','sel = c100 (clk_x1)'],d:'mux_2to1.v. The select line is the clock itself. a/b pass while clk_x1 is high, x/y while it is low.',p:'x'},
    mult:{x:566,y:110,w:116,h:84,t:'mult',s:['TDM_mult 8×8','pipeline 3, c200'],d:'TDM_mult.v: lpm_mult, UNSIGNED, MAXIMIZE_SPEED=5, LPM_PIPELINE 3, clocked by clk_x2 (285.71 MHz).',p:'mul'},
    o15:{x:708,y:72,w:100,h:62,t:'inst15',s:['DFF ×16 rise','→ multout_ab'],d:'Captures a·b on the rising edge of clk_x1. FAST_OUTPUT_REGISTER ON multout_* (top.qsf).',p:'oab'},
    o14:{x:708,y:168,w:100,h:62,t:'inst14 + inst16',s:['DFF ×16, NOT clk','→ multout_xy'],d:'Captures x·y on the falling edge (clock through inst16 NOT). Ex. 4 needs -clock_fall here. Peter wrote -fall.',p:'oxy'},
    pll:{x:432,y:300,w:150,h:84,t:'inst1 main_pll',s:['c0 ×1 · c1 ×2 · c2 ×1','inclk0 7000 ps'],d:'main_pll.v (altpll, NORMAL mode, compensate CLK0). The symbol in top.bdf reads "inclk0 frequency: 100.000 MHz" and "Cyclone II", but the HDL and SDC say 7 ns on Cyclone III.',p:'clko'},
    clko:{x:708,y:300,w:100,h:62,t:'clkout',s:['pin R4','clk_out generated'],d:'c100_out → clkout. A clock-as-data path that needs a false path (Ex. 5 step 2).',p:'clko'},
    rst:{x:14,y:300,w:118,h:84,t:'reset',s:['pin E1','async'],d:'Asynchronous reset. In this model a false path from the port (solution) or to inst1|*, inst2|*, inst3|* (Peter) covers it.',p:'rst'},
    sync:{x:160,y:300,w:150,h:84,t:'inst2 → inst3',s:['DFFE synchroniser','→ aclr (96 CLRN)'],d:'Reset synchroniser (inst4 VCC, inst5 NOT). Its output aclr reaches 96 register CLRN pins: the 96 recovery/removal paths in Ex. 5 step 6.',p:'rec'},
  };
  const W = [['din','r1','din*'],['r1','r2',''],['r2','mux','a,b,x'],['r2','dly','y'],['dly','mux','y′'],['mux','mult','dataa/datab'],['mult','o15','result'],['mult','o14','result'],['pll','mult','c200'],['pll','mux','c100'],['pll','clko','c100_out'],['rst','sync',''],['rst','pll','areset'],['sync','r1','aclr']];
  let sel = 'dly';
  m.innerHTML = `<div class="grid2"><div>${card('top.bdf (Timing lab) — click a block; colour = its paths now', `<div id="bd"></div><p class="small muted">Green: meets timing · red: failing · amber: unconstrained · grey: false path. Change top.sdc on the Simulator tab and come back.</p>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('In one sentence', '<p>Two 8×8 products share one multiplier by running it at twice the clock and switching its inputs with the clock itself. Every timing exception in the lab exists to tell TimeQuest which edges really matter.</p>')}</div></div>`;
  const col = s => ({ok:'color-mix(in srgb,var(--accent) 18%,var(--panel2))', bad:'color-mix(in srgb,var(--bad) 22%,var(--panel2))', unc:'color-mix(in srgb,var(--warn) 22%,var(--panel2))', fp:'var(--chip)'})[s];
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 830 400" style="width:100%"><defs><marker id="arBD13" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l])=>{ const A_=B[a], B_=B[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot = sel===a||sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#arBD13)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in B){ const b = B[k], on = sel===k;
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${col(st(b.p))}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+19}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${(b.s||[]).map((l,i)=>`<text x="${b.x+8}" y="${b.y+36+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s + '</svg>';
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick = ()=>{ sel = g.dataset.b; D.sel = B[sel].p; draw(); });
    const b = B[sel], r = run().R.find(x=>x.p.id===b.p);
    m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d}</p>` + (r.st==='ok' ? kv([['Path', `${esc(r.p.from)} → ${esc(r.p.to)}`],['Setup slack', slackTxt(r.setup)+' ns'],['Hold slack', slackTxt(r.hold)+' ns'],['Clocks', `${r.lc.name} → ${r.cc.name}`, 1]]) : `<p class="small muted">${r.st==='false'?'False path':'Unconstrained'}: ${r.why}</p>`);
  };
  draw(); SIM.on('time', draw);
}

/* products whose FPGAs the method constrained (SDC files quoted) */
const PROD = {
  pod32:{ name:'POD32 v100 · pod32.sdc (12 Nov 2010)', plug:'pod32', file:'#POD #SERIES/POD32 - #Master/POD32 - #Engineering/software/altera/v100/pod32.sdc · EP2C35F484C8, Quartus 9.0 SP2', groups:['…_a (HD)','…_b (SD)'],
    clocks:[['pclk_in_pin_a','pclk_in','13.468','a','HD Pclk 74.25 MHz'],['pclk_in_pin_b','pclk_in (-add)','37.04','b','SD Pclk 27 MHz'],['pclk_in_c0_a','inst53 pll c0, -phase 180','13.468','a','defined twice in the file'],['pclk_in_c0_b','inst53 pll c0 (-add)','37.04','b',''],
      ['pclk_out_a / _b','TP6','13.468 / 37.04','ab','pclk out to GS1531'],['ref662','ref662 (port)','13.468','a','to ICS662'],['clock662_27','-divide_by 3','40.40','a','comment says "divide by 2.75" (27 MHz)'],['pll1705_27_a / _b','pll1705_27','40.40 / 37.04','ab','muxed 27 MHz'],
      ['pll_1705_mclk_a / _b','-divide_by 2','80.81 / 74.08','ab','comment says "divide by 2.2"'],['lrclk_a / _b','inst35|FSYNCH, /256','20.69 µs / 18.96 µs','ab',''],['sclk_a / _b','inst35|SCLK, /4','323 / 296','ab','']],
    io:[['Cout* / Yout*','set_output_delay ±5 ns to pclk_in_c0_a, and with -add_delay to pclk_in_c0_b','HD: 13.468 − 5 = 8.468 ns budget; SD: 32.04 ns'],['inst43|*','set_false_path -from pclk_in_c0_a -to [get_pins -compatibility_mode {inst43|*}]','the idiom of Peter\'s lab reset lines']] },
  m6205c:{ name:'M6205C v101 · m6205c.sdc (5 Oct 2010)', plug:'m6205', file:'#OPENGEAR #SERIES/M6205 …/Software/M6205C600/Altera/v101/m6205c.sdc', groups:['…_a (HD)','…_b (SD)'],
    clocks:[['pclk_in_pin_a','pclk_in_pin','13.468','a','HD'],['pclk_in_pin_b','pclk_in_pin (-add)','37.04','b','SD'],['pclk_in_c0_a / _b','inst53 pll c0, phase 180','13.468 / 37.04','ab',''],['pclk_in_c1_a / _b','inst53 pll c1, phase 90','13.468 / 37.04','ab',''],['pclk_out_a / _b','pclk_out','13.468 / 37.04','ab',''],['ref662 → clock662_27 …','as POD32','','a','']],
    io:[['—','no I/O delays','clock tree + exclusive groups + one false path']] },
  m63g:{ name:'M6205-3G (RD1) · SDC1.sdc v100cv1 (24 Dec 2010)', plug:'m6205-3g', file:'#OPENGEAR #SERIES/M6205-3G …/pETER/Altera/Hardware/Progress/v100cv1/SDC1.sdc (and PeterV1.sdc, 20 Dec 2010)', groups:['…_3G','…_SD'],
    clocks:[['RECEIVER_PCLK_PLL_3G','RECEIVER_PCLK_PLL','6.734','a','148.5 MHz'],['RECEIVER_PCLK_PLL_SD','same port (-add)','37.04','b','27 MHz'],['PLL1705_AUDIO_CLOCK_3G','-divide_by 12','80.81','a','12.375 MHz; a real 48 kHz MCLK is 12.288'],['lrclk_3G','i2s_clk_gen_cuz|FSYNCH /256','20.69 µs','a',''],['sclk_3G','…|SCLK /4','323','a','']],
    io:[['sd_demux*, group_detector*, par_sel_*','set_false_path from the 3G / lrclk clocks','PeterV1.sdc instead lists 20 pairwise false paths after derive_pll_clocks -use_tan_name']] },
  ams16:{ name:'AMS16 3G · ams163g.sdc backup8 (28 Jul 2014)', plug:'rd23-ams16-3g', file:'XXX - ENGINEERING - 2016 RD FILES/RD23AMS163GSDIUpgrade/Software/FPGA/backup8-proper-inout-delays/V070000/ams163g.sdc', groups:['…_3G','…_SD'],
    clocks:[['RECEIVER_PCLK_PLL_3G','RCVR_PCLK','6.734','a','3G'],['RECEIVER_PCLK_PLL_SD','RCVR_PCLK (-add)','37','b','SD'],['PLL1705_AUDIO_CLOCK_3G / _SD','AUDIO_CLOCK','81.38','ab','12.288 MHz'],['lrclk_3G, lrclk_groupdet_3G, sclk_3G','i2s_clk_gen_cuz nets','','a','']],
    io:[['RCVR_DOUT*','set_input_delay -clock RECEIVER_PCLK_PLL_3G 3.7','"##Ali-Add": the first input delay in a WBS file'],['SRL_DIN*','set_output_delay … -reference_pin [get_ports SRL_PCLK] 0.8','source-synchronous to the serialiser clock']] },
  ams81:{ name:'AMS81 V050000 · AMS81.sdc (31 Jan 2013)', plug:'ams81', file:'AMS81 - #Master/…/AMS8 - #Software #Altera #V050000/AMS81.sdc', groups:null,
    clocks:[['cs8416ref_12M288','AES5_REF_MCLK','81.38','a','12.288 MHz'],['dspref_12M288','DSPCLK1','81.38','a',''],['cs8416pllout_98M304 / dsppllout_98M304','PLL ×8','10.17','a','98.304 MHz'],['clkdivout_*_12M288','clk_div8 /8','81.38','a',''],['lrm, sclkm …','i2s_tx /2048 …','20.83 µs','a','48 kHz']],
    io:[['—','derive_clock_uncertainty; no I/O delays, no clock groups','16 generated clocks']] },
  me32:{ name:'32ME v050201 · 32ME.sdc (9 Dec 2015)', plug:'32me', file:'XXX - ENGINEERING - 2016 RD FILES/RD22-MADI/Software/FPGA/v050201/32ME.sdc', groups:['i64 MADI clocks','DSP clocks'],
    clocks:[['MCLK_I64','MCLK_IN_I64','81.38','a','i64 MADI module, 12.288 MHz'],['FSYNC_I64','FSYNC_IN_I64','20.833 µs','a','48 kHz'],['pllout_i64_98M / _12M','inst6 PLL ×8 / ×1','10.17 / 81.38','a',''],['lrclk192k / 96k / 48k','smux_to_i2s /64','','a',''],['DSPCLK1','DSPCLK1','40.69','b','24.576 MHz'],['pllout_98M','inst20 PLL','10.17','b','']],
    io:[['—','derive_pll_clocks + derive_clock_uncertainty + set_clock_groups -exclusive','']] },
};
const POD32_HIST = [['v100b','2010-08-27',284,24,0,'4 dcfifo false paths, 1 clock group'],['v100c','2010-09-02',279,12,0,''],['v100d','2010-09-07',284,12,0,'1 false path'],['v100e','2010-09-17',284,10,0,'week of the class'],['v100g','2010-10-05',362,16,8,'first set_output_delay, Tcl variables'],['v100H','2010-10-29',362,16,8,''],['v100k','2010-11-01',254,14,8,'trimmed'],['v100 (Eng.)','2010-11-12',265,15,8,'released copy (9 identical copies)'],['v100LD','2010-12-07',265,16,8,'pclk_in_pin_a typed as 12.468 ns']];
function prodSVG(){
  const P = PROD[D.prod], mode = D.prodMode; let s = `<svg viewBox="0 0 800 ${40+P.clocks.length*30}" style="width:100%">`;
  P.clocks.forEach((c,i)=>{ const y = 18+i*30, act_ = c[3].includes(mode) || !P.groups; const colr = c[3]==='ab' ? 'var(--accent2)' : c[3]==='a' ? 'var(--accent)' : 'var(--warn)';
    s += `<rect x="8" y="${y}" width="230" height="22" rx="5" fill="${act_?'color-mix(in srgb,'+colr+' 22%,var(--panel2))':'var(--panel2)'}" stroke="${colr}" opacity="${act_?1:.45}"/><text x="14" y="${y+15}" font-size="11" fill="var(--ink)" class="mono">${c[0]}</text>
      <text x="246" y="${y+15}" font-size="10.5" fill="var(--ink2)">${c[1]}</text><text x="440" y="${y+15}" font-size="10.5" fill="var(--ink)">${c[2]}${/µs/.test(c[2])||!c[2]?'':' ns'}</text><text x="530" y="${y+15}" font-size="9.5" fill="var(--warn)">${c[4]}</text>`;
    if (i) s += `<line x1="20" y1="${y-8}" x2="20" y2="${y}" stroke="var(--ink2)"/>`; });
  return s + '</svg>';
}
function prodHTML(){
  const P = PROD[D.prod];
  return `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${Object.keys(PROD).map(k=>btn('prod',k,PROD[k].name.split(' · ')[0],D.prod===k)).join('')}</div>
    <div class="small mono muted">${esc(P.file)}</div>` + (P.groups ? `<div style="margin:6px 0">${btn('prodMode','a',`clocks running: ${P.groups[0]}`,D.prodMode==='a')}${btn('prodMode','b',`clocks running: ${P.groups[1]}`,D.prodMode==='b')}</div>` : '')
    + prodSVG() + tbl(['Ports / nodes','Constraint','Note'], P.io.map(r=>[`<span class="mono small">${esc(r[0])}</span>`, `<span class="mono small">${esc(r[1])}</span>`, r[2]])) + `<p class="small">Simulator: ${plink(P.plug, P.plug)}</p>`;
}
/* Exercise 1: pipemult.sdc (Intro) */
function ex1Eval(){ const e = D.ex1; const pm = e.net==='post_map'; const hold = pm ? -0.032 : (e.phys ? 0.071 : -0.018); const setup = 6 - 4.5 - (pm?1.12:1.21) - TSU - 0.03;
  return { setup, hold }; }   // magnitudes inferred: the manual only says hold "just fails" and physical synthesis fixes it
function ex1HTML(){ const r = ex1Eval(), e = D.ex1;
  return `<pre class="log" style="max-height:none">create_clock -period 6 -name clk1 [get_ports {clk1}]
create_clock -period 6 -name clk1_in_virt
create_clock -period 6 -name clk1_out_virt
derive_clock_uncertainty
set_input_delay  -clock { clk1_in_virt }  -max 4.5  [get_ports data*]
set_input_delay  -clock { clk1_in_virt }  -min 1.75 [get_ports data*]
set_output_delay -clock { clk1_out_virt } -max 0.7  [get_ports q*]
set_output_delay -clock { clk1_out_virt } -min 0.0  [get_ports q*]
set_input_delay  -clock { clk1_in_virt }  -max 2.5 / -min 1.0 [get_ports {rdaddress* wraddress* wren}]</pre>
  <div style="display:flex;gap:4px;flex-wrap:wrap">${btn('ex1','post_map','post-map',e.net==='post_map').replace('data-a','data-k="net" data-a')}${btn('ex1','post_fit','post-fit',e.net==='post_fit').replace('data-a','data-k="net" data-a')}${btn('ex1',e.phys?'0':'1',e.phys?'physical synthesis ON (pipemult_lc_phys_syn.qsf)':'physical synthesis off',e.phys).replace('data-a','data-k="phys" data-a')}</div>`
  + kv([['clk1 setup (data* → regs)', slackTxt(r.setup)+' ns '+inf],['clk1 hold', slackTxt(r.hold)+' ns '+inf]]) + `<p class="small muted">Course manual Ex. 1: "it just fails hold timing … close enough that it can be fixed by using physical synthesis". The slack magnitudes are ${inf}.</p>`; }
function viewSoft(m){
  m.innerHTML = `<div class="grid2"><div>${card('TimeQuest flow (step of the last action highlighted)', `<div id="fl"></div>`)}${card('Slack equations, live for the selected path', `<div id="eq"></div>`)}${card('Clock-domain transfers (launch → latch)', `<div id="cd"></div>`)}</div>
    <div>${card('top.sdc written by the current toggles', `<div id="sdc"></div><p class="small muted">Struck-through lines are switched off. Compare the presets: Peter's file stops after Ex. 5 step 2.</p>`)}${card('Exercise 1 · Intro/pipemult.sdc (EP3C5F256C6, 6 ns)', `<div id="e1"></div>`)}</div></div>
    ${card('Where the method went: SDC files in Ward-Beck products', `<div class="grid2"><div id="pr"></div><div><h3>pod32.sdc, version by version</h3><div id="ph"></div></div></div>`)}`;
  const draw = ()=>{
    m.querySelector('#fl').innerHTML = flowSVG(FLOW, D.flow, {w:520, rh:30});
    const r = run().R.find(x=>x.p.id===D.sel);
    m.querySelector('#eq').innerHTML = r.st!=='ok' ? `<p class="small muted">${esc(r.p.from)} → ${esc(r.p.to)} is ${r.st==='false'?'a false path':'unconstrained'}.</p>` :
      (r.bits ? `<p class="small mono">Setup Slack = T − Tco − Tdata − output delay(max)<br>= ${fmt(r.r.s)} − ${fmt(r.ws.s)} − ${OD} = <b>${fmt(r.setup)}</b> ns (${r.ws.b.port})<br><br>Hold Slack = output delay(min) + Tco + Tdata − hold rel.<br>= −${OD} + ${fmt(r.wh.s)} − (${fmt(r.r.h)}) = <b>${fmt(r.hold)}</b> ns (${r.wh.b.port})</p>`
      : `<p class="small mono">Setup Slack = Data Required − Data Arrival<br>= (${fmt(r.r.s)} − tsu ${TSU} − unc ${fmt(r.u,2)}) − ${fmt(r.arrS)} = <b>${fmt(r.setup)}</b> ns<br><br>Hold Slack = Data Arrival − Data Required<br>= ${fmt(r.arrH)} − (${fmt(r.r.h)} + th ${TH} + unc ${fmt(r.u,2)}) = <b>${fmt(r.hold)}</b> ns</p>`)
      + `<p class="small muted">Equations as on the course slides "Setup Slack" / "Hold Slack" (A-MNL-QII-TA-ALL-10-0, pp. 26–27 and the I/O appendix).</p>`;
    const res = run(), cells = {}; res.R.filter(x=>x.st==='ok').forEach(x=>{ const k = x.lc.name+'→'+x.cc.name; (cells[k] = cells[k] || { a:x.lc.name, b:x.cc.name, s:Infinity, h:Infinity, n:0 }); cells[k].s = Math.min(cells[k].s, x.setup); cells[k].h = Math.min(cells[k].h, x.hold); cells[k].n += x.n; });
    m.querySelector('#cd').innerHTML = tbl(['Launch','Latch','paths','setup','hold'], Object.values(cells).map(c=>[`<span class="mono small">${c.a.replace('inst1|altpll_component|auto_generated|pll1|','pll1|')}</span>`, `<span class="mono small">${c.b.replace('inst1|altpll_component|auto_generated|pll1|','pll1|')}</span>`, c.n, slackTxt(c.s), slackTxt(c.h)]));
    m.querySelector('#sdc').innerHTML = sdcHTML(300);
    const e1 = m.querySelector('#e1'); e1.innerHTML = ex1HTML(); bindCtl(e1);
    const pr = m.querySelector('#pr'); pr.innerHTML = prodHTML(); bindCtl(pr);
    m.querySelector('#ph').innerHTML = tbl(['folder','date','lines','gen. clocks','out delays','note'], POD32_HIST.map(h=>[`<span class="mono">${h[0]}</span>`, h[1].slice(0,4)+'|'+(+h[1].slice(0,4)-1967)+h[1].slice(4), h[2], h[3], h[4]? `<b>${h[4]}</b>` : '0', h[5]])) + `<p class="small muted">Counts of command lines in each …/POD32 - #RD #RD3/POD32/Altera/…/pod32.sdc (comments excluded).</p>`;
  };
  SIM.on('time', draw);
}

/* schematics (redrawn) */
const SHEETS = [
  { name:'1 · Datapath (top.bdf)', note:'Redrawn from Timing/top.bdf (15 Sep 2010): instance and net names as in the file. Bus widths from the pin names and TDM_mult.v. Wire routing simplified.', svg:()=>{
    let s=''; const reg=(x,y,n,c)=>`<rect x="${x}" y="${y}" width="64" height="40" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+32}" y="${y+16}" font-size="10" text-anchor="middle" fill="var(--ink)" font-weight="700">${n}</text><text x="${x+32}" y="${y+31}" font-size="9" text-anchor="middle" fill="var(--accent2)">${c}</text>`;
    ['a','x','b','y'].forEach((v,i)=>{ const y=50+i*80; s+=`<text x="14" y="${y+24}" font-size="10.5" fill="var(--ink)">din_${v}[7..0]</text><line x1="84" y1="${y+20}" x2="110" y2="${y+20}" stroke="var(--ink)"/>`+reg(110,y,v+'_regone','c100 · aclr')+`<line x1="174" y1="${y+20}" x2="200" y2="${y+20}" stroke="var(--ink)"/>`+reg(200,y,v+'_regtwo','c100 · aclr'); });
    s+=`<rect x="290" y="300" width="90" height="34" fill="var(--panel2)" stroke="var(--bad)"/><text x="335" y="315" font-size="10" text-anchor="middle" fill="var(--ink)" font-weight="700">inst24</text><text x="335" y="328" font-size="9" text-anchor="middle" fill="var(--ink2)">delay_8bits</text><line x1="264" y1="310" x2="290" y2="317" stroke="var(--ink)"/>`;
    s+=chip(420,70,90,'mux_ax',[['data1x','a_regtwo'],['data0x','x_regtwo'],['sel','c100']],[['result','dataa']],'lpm_mux');
    s+=chip(420,230,90,'mux_by',[['data1x','b_regtwo'],['data0x','inst24 dout'],['sel','c100']],[['result','datab']],'lpm_mux');
    s+=chip(560,140,160,'mult',[['dataa[7..0]',''],['datab[7..0]',''],['clock','c200']],[['result[15..0]','']],'TDM_mult · pipe 3');
    s+=chip(780,60,50,'inst15',[['D',''],['CLK','c100']],[['Q','']],'DFF ×16');
    s+=chip(780,250,50,'inst14',[['D',''],['CLK','inst16 ¬c100']],[['Q','']],'DFF ×16');
    s+=`<text x="760" y="140" font-size="10" fill="var(--accent2)">→ multout_ab[15..0]</text><text x="760" y="330" font-size="10" fill="var(--accent2)">→ multout_xy[15..0]</text>`;
    s+=`<text x="20" y="420" font-size="10.5" fill="var(--ink2)">Nets: c100 = pll c0 (clk_x1), c200 = pll c1 (clk_x2), aclr from inst3. Clock nets keep the names of the 100 MHz edition of the lab.</text>`;
    return s; } },
  { name:'2 · main_pll and clkout', note:'Redrawn from main_pll.v (10 May 2010) and the PLL symbol text in top.bdf. The symbol text (100 MHz, Cyclone II) disagrees with the HDL (7000 ps, Cyclone III).', svg:()=> chip(330,80,200,'inst1 · main_pll',[['inclk0','clk_in_100mhz'],['areset','reset (inferred)']],[['c0','c100 (×1, 0°)'],['c1','c200 (×2, 0°)'],['c2','c100_out (×1, '+D.pllPh+'°)'],['locked','pll_locked']],'altpll NORMAL, compensate CLK0')
      + `<text x="330" y="220" font-size="11" fill="var(--ink)">symbol: "inclk0 frequency: 100.000 MHz" · "Cyclone II"</text><text x="330" y="238" font-size="11" fill="var(--ink)">main_pll.v: inclk0_input_frequency = 7000 · clk2_phase_shift = "0"</text><text x="330" y="256" font-size="11" fill="var(--ink)">PLLJ_PLLSPE_INFO.txt: PLLJITTER 29 · PLLSPEmax 84 · PLLSPEmin −53 (ps)</text>`
      + `<line x1="600" y1="138" x2="700" y2="138" stroke="var(--ink)"/><rect x="700" y="124" width="40" height="28" fill="var(--panel2)" stroke="var(--ink)"/><text x="720" y="142" font-size="9" text-anchor="middle" fill="var(--ink)">inst</text><text x="720" y="170" font-size="9" text-anchor="middle" fill="var(--ink2)">WIRE</text><line x1="740" y1="138" x2="790" y2="138" stroke="var(--ink)"/><text x="795" y="142" font-size="10.5" fill="var(--accent2)">clkout · R4</text>` },
  { name:'3 · Reset synchroniser', note:'Instances from top.bdf (inst2, inst3 DFFE; inst4 VCC; inst5 NOT; nets aclr, pll_locked). The exact pin wiring is inferred from the layout and the course manual.', svg:()=> chip(170,120,90,'inst2',[['D','inst4 VCC'],['ENA','pll_locked'],['CLK','c100'],['CLRN','inst5 ¬reset']],[['Q','']],'DFFE') + chip(450,120,90,'inst3',[['D','inst2 Q'],['ENA','pll_locked'],['CLK','c100'],['CLRN','inst5 ¬reset']],[['Q','aclr']],'DFFE')
      + `<text x="430" y="300" font-size="11" fill="var(--ink)">aclr → CLRN of a/b/x/y_regone, *_regtwo (8 × 8) + inst14, inst15 (2 × 16) = 96 registers</text><text x="430" y="320" font-size="11" fill="var(--ink2)">= the 96 recovery/removal paths of Ex. 5 step 6 ${'(inferred wiring)'}</text>` },
  { name:'4 · delay_8bits', note:'Redrawn from delay_8bits.bdf (20 Apr 2006): 11 LCELL primitives in series on the 8-bit bus, in x order inst, inst11–inst15, inst26–inst29, inst16.', svg:()=>{ const n=['inst','inst11','inst12','inst13','inst14','inst15','inst26','inst27','inst28','inst29','inst16']; let s=`<text x="20" y="214" font-size="11" fill="var(--accent2)">input[7..0]</text>`;
    n.forEach((x,i)=>{ const X0=90+i*68; s+=`<line x1="${X0-14}" y1="210" x2="${X0}" y2="210" stroke="var(--ink)"/><rect x="${X0}" y="194" width="50" height="32" fill="var(--panel2)" stroke="var(--ink)"/><text x="${X0+25}" y="208" font-size="9" text-anchor="middle" fill="var(--ink)">LCELL</text><text x="${X0+25}" y="220" font-size="8.5" text-anchor="middle" fill="var(--ink2)">${x}</text>`; });
    return s+`<line x1="838" y1="210" x2="850" y2="210" stroke="var(--ink)"/><text x="790" y="250" font-size="11" fill="var(--accent2)">dout[7..0]</text><text x="90" y="290" font-size="11" fill="var(--ink)">11 LUT levels × ≈0.35 ns ≈ 3.85 ns ${'(inferred)'} → the −1.923 ns clk_x2 violation</text>`; } },
  { name:'5 · Pins (top.qsf)', note:'All set_location_assignment lines of Timing/top.qsf (28 Sep 2010), EP3C5F256C6, 2.5 V default I/O.', svg:()=>{ let s=''; let y=40; Object.keys(BUS).forEach(k=>{ s+=`<text x="20" y="${y}" font-size="11" font-weight="700" fill="var(--ink)">${k}</text><text x="130" y="${y}" font-size="10.5" fill="var(--ink2)" font-family="monospace">${BUS[k].map((b,i)=>i+':'+b).join('  ')}</text>`; y+=26; });
    s+=`<text x="20" y="${y+10}" font-size="11" fill="var(--ink)">clkout R4 · reset E1 · clk_in E2 (no such node in Peter's top.bdf) · config C1 D2 H1 H2 F16</text>`; return s; } },
  { name:'6 · POD32 clock tree (pod32.sdc)', note:'Redrawn from …/POD32 - #Engineering/software/altera/v100/pod32.sdc (12 Nov 2010). Every clock exists twice, _a (HD) and _b (SD), and the two sets are exclusive.', svg:()=>{ const n=[['pclk_in pin','13.468 / 37.04 ns'],['inst53 PLL c0','phase 180'],['ref662 port','→ ICS662'],['clock662_27','/3 (real /2.75)'],['pll1705_27','muxed'],['pll_1705_mclk','/2 (real /2.2)'],['inst35 FSYNCH / SCLK','/256, /4']]; let s='';
    n.forEach((x,i)=>{ const X0=20+i*120; s+=`<rect x="${X0}" y="170" width="106" height="56" rx="6" fill="var(--panel2)" stroke="var(--ink)"/><text x="${X0+53}" y="192" font-size="10" text-anchor="middle" font-weight="700" fill="var(--ink)">${x[0]}</text><text x="${X0+53}" y="210" font-size="9.5" text-anchor="middle" fill="var(--accent2)">${x[1]}</text>`; if(i) s+=`<line x1="${X0-14}" y1="198" x2="${X0}" y2="198" stroke="var(--ink)"/>`; });
    return s+`<text x="20" y="290" font-size="11" fill="var(--ink)">set_clock_groups -exclusive -group {… _a} -group {… _b} · TP6 = pclk_out_a/_b · Cout*/Yout* ±5 ns</text>`; } },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the RD13 Timing lab files (top.bdf, main_pll.v, delay_8bits.bdf, top.qsf) and pod32.sdc', 'RD13 is a training folder. These sheets redraw the lab design Peter constrained, plus the clock tree of the product he went on to constrain.'); }

function withC(over, fn){ const keep = D.C; D.C = Object.assign({}, PRESETS.soln.C, {clkPort:DSN[D.dsn].port}, over); try { return fn(); } finally { D.C = keep; } }
function viewFindings(m){
  const sh = withC({ph:0}, ()=> centreShift(multicorner(0))), xyFall = withC({out:'fall', ph:0}, ()=> run('slow85',0).R.find(x=>x.p.id==='oxy').setup);
  m.innerHTML = card('What RD13 decided, and what became of it', `<ol>
    <li><b>Decided: constrain every FPGA with a hand-written SDC file, and stop trusting converted Classic-Timing-Analyzer constraints.</b> The register closes RD13 on 2010-09-18 (Peter, Z). Three weeks later pod32.sdc v100g (5 Oct 2010) gains Tcl variables and its first eight <span class="mono">set_output_delay</span> lines on Cout*/Yout*. Before that, from v100b (27 Aug) to v100e (17 Sep), it held only clocks and FIFO false paths. ${plink('pod32','POD32')}</li>
    <li><b>What became of it: the habit spread unevenly.</b> M6205C (Oct 2010) and Peter's M6205-3G SDC1.sdc (Dec 2010) use the same <span class="mono">-add</span> dual-standard clocks and exclusive groups (${plink('m6205','M6205')}, ${plink('m6205-3g','M6205-3G')}). The next real I/O delays in the archive are Ali's "proper-inout-delays" in ams163g.sdc (Jul 2014|47: <span class="mono">set_input_delay 3.7</span> on RCVR_DOUT*, <span class="mono">-reference_pin SRL_PCLK</span>) (${plink('rd23-ams16-3g','AMS16 3G')}). AMS81 (2013) and 32ME (2015) constrain clocks and uncertainty only (${plink('ams81','AMS81')}, ${plink('32me','32ME')}). RD4 (2011|44, Peter) followed on: "take POD32 project and modify cores to remove timing dependencies".</li>
    <li><b>Peter's top.sdc stops at Exercise 5 step 2.</b> It has clocks, input and output delays and both false paths, but no multicycle and no phase shift. Compiled as it stands, clk_x2 fails by −1.923 ns (the manual's worst-case path; its Setup Summary quotes −1.863 for the same failure).</li>
    <li><b><span class="mono">-fall</span> where the lab needs <span class="mono">-clock_fall</span>.</b> Peter's multout_xy output delays use <span class="mono">-fall</span>, which selects falling <i>data</i> transitions. The solution uses <span class="mono">-clock_fall</span> (relative to the falling clock edge). In this model the xy check lands on the rising edge of clk_out with only 3.5 ns, and setup fails (${slackTxt(xyFall)} ns) ${inf}.</li>
    <li><b>The .bak shows a fixed typo.</b> top.sdc.bak cuts <span class="mono">…pll1|clk2</span>. No pin has that name, so TimeQuest ignores the false path and clkout stays unconstrained. top.sdc, saved the same day, has <span class="mono">clk[2]</span>.</li>
    <li><b>The lab files mix two editions of the course.</b> Peter's top.bdf (15 Sep 2010) has port <span class="mono">clk_in_100mhz</span>, nets c100/c200/c100_out, and a PLL symbol reading "inclk0 frequency: 100.000 MHz · Cyclone II". The HDL (main_pll.v: 7000 ps), the SDC (7 ns) and the device (EP3C5F256C6, Cyclone III) are the 142.86 MHz edition, and so is obsolete/top.bdf (clk_in, clk_x1/x2/o, "7.000 ns"). Altera's own top_sdc.txt still carries two <span class="mono">set_input_delay -clock clk_in_100mhz</span> lines; no clock has that name, so they are ignored constraints.</li>
    <li><b>top.qsf assigns PIN_E2 to clk_in</b>, but in Peter's top.bdf the port is clk_in_100mhz, so the assignment matches nothing. The Altera solution SDC (<span class="mono">get_ports {clk_in}</span>) dropped onto Peter's design would lose its base clock and every PLL clock built on it.</li>
    <li><b>Three phase values for one answer.</b> The solution .doc computes (0.823 − 2.240) ÷ 2 = −0.7085 ns and quotes −38.51°. Solutions/top.sdc uses <span class="mono">-phase -38.51</span>. Timing/soln/test.sdc (Altera internal build 195, May 2010) was written with <span class="mono">-phase -45.000</span>. top_sdc.txt keeps <span class="mono">-phase 0</span> in a commented example. This model's centring gives ${fmt(sh,4)} ns at 0°.</li>
    <li><b>The recorded "after" slacks don't follow from the shift alone.</b> A −0.749 ns shift moves the fast hold from 0.823 to 1.572 (recorded 1.571), but would cut the slow setup from 2.240 to ≈1.49. The sheet records 2.408. The step-7 back-annotation and recompile probably re-routed the outputs ${inf}. The lab also says to record the <i>larger</i> of the two slow-corner setup slacks, then calls it the "smallest" in the formula.</li>
    <li><b>The solution's multicycle is narrower than the answer sheet's.</b> Solutions/top.sdc adds <span class="mono">-to …mult_mfq:auto_generated|mac_mult1~OBSERVABLEDATAB_REGOUT*</span>, so only the y (datab) side is relaxed. That name contains the generated hash <span class="mono">mult_mfq</span>, so the constraint is silently lost if the multiplier is regenerated ${inf}. top_sdc.txt has no -to.</li>
    <li><b>Peter's per-instance reset false paths</b> (<span class="mono">-to [get_pins -compatibility_mode {inst1|*}]</span> ×3) match the manual's "3 unconstrained input paths" exactly. The same idiom reappears in pod32.sdc (<span class="mono">-from pclk_in_c0_a -to … {inst43|*}</span>).</li>
    <li><b>pod32.sdc leftovers.</b> Its header says <span class="mono">Project: m6205c</span> (converted 18 Aug 2010). <span class="mono">pclk_in_c0_a</span> is created twice. The ICS662 and PLL1705 ratios are rounded to integers (<span class="mono">-divide_by 3</span> for "divide by 2.75", <span class="mono">-divide_by 2</span> for "2.2"), so the 27 MHz and MCLK clocks are analysed at 24.75 MHz and 12.375 MHz. v100LD (7 Dec 2010) has <span class="mono">-period "12.468 ns"</span> for 74.25 MHz HD.</li>
    <li><b>FPGA 101 leftovers.</b> Project1/exercise2.qsf has no SDC at all (all clocks default to 1 GHz) and points MISC_FILE at an absolute path on the instructor's desktop. The plasi ASI core and asi-library are example IP. DE0_v91/top.sdc constrains only CLOCK_50 and CLOCK_50_2 (20 ns).</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Every path delay is ${inf}. They are calibrated so the model gives −1.923 ns on y_regtwo → mult and the solution sheet's clk_out slacks (2.240 / 1.471 slow, 3.865 / 0.823 fast).</li><li>Per-bit output skew is spread by each ball's distance from clkout (R4) in top.qsf ${inf}. The fast corner scales delays by 0.6226 (fitted to the sheet) and slow 0 °C by 1.02 ${inf}.</li><li>Uncertainty (0.02 / 0.05 / 0.06 ns), tsu/th, the 0.85 min/max spread, the 2.0 ns clock path to R4, the PLL lock time and the reset wiring are ${inf}.</li><li>The MegaWizard phase step is set so −0.7085 ns rounds to −38.51° ${inf}.</li><li>Exercise 1 slack magnitudes are ${inf}. The manual only says hold "just fails".</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD13-TimingAnalysis/pETER/FPGATraining/TimingAnalysis/labs/QII10_0/Timing/: top.bdf, obsolete/top.bdf, top.sdc, top.sdc.bak, test.sdc, top.qsf, main_pll.v, TDM_mult.v, mux_2to1.v, delay_8bits.bdf, PLLJ_PLLSPE_INFO.txt, soln/*.sdc, Document Scrap …shs</li><li>…/Solutions/top.sdc, top_sdc.txt, Quartus II Design Series_Timing_10_0_Exercise_Solutions.doc · …/Intro/pipemult.sdc</li><li>…/TimingAnalysis/A-MNL-QII-TA-ALL-10-0-v1.pdf · pETER/qts_qii53018TimeQuestTimingAnalyzer.pdf</li><li>…/VHDLBasics/DE0_v91/top.sdc · Project1/exercise2.qsf</li><li>POD32 …/Altera/Progress/v100b–v100k, v100LD, …/#Engineering/software/altera/v100/pod32.sdc</li><li>M6205 …/M6205C600/Altera/v101/m6205c.sdc · M6205-3G …/pETER/Altera/Hardware/…/SDC1.sdc, PeterV1.sdc</li><li>RD23 …/backup8-proper-inout-delays/V070000/ams163g.sdc · AMS81 …#V050000/AMS81.sdc · RD22 …/v050201/32ME.sdc</li><li>R&amp;D_List.xls (RD4, RD13)</li></ul>`);
}

SIM.register({
  id:'rd13-timinganalysis', name:'RD13 Timing Analysis · TimeQuest/SDC lab and the products it constrained (2010|43)', duration:1,
  product:'RD13 Timing Analysis', year:2010, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD13-TimingAnalysis',
  summary:'Peter’s September 2010 TimeQuest course, run on its real lab files. Toggle each line of his top.sdc, compare it with Altera’s solution, and watch clocks, slack and clock domains change on the PLL-driven time-multiplexed multiplier. The same commands are then traced into the POD32, M6205, AMS16 and AMS81 SDC files.',
  highlights:['Static timing engine: edges, multicycle setup/hold, false paths, corners','Peter’s top.sdc vs Altera’s solution, ignored constraints included','−1.923 ns y_regtwo violation and the −38.51° clk_out centring reproduced','Pin Planner from top.qsf with per-ball output slack','Clock trees of pod32.sdc and five later product SDC files'],
  depth:'Full model',
  stepUnits:[{label:'1 clk_x2 (3.5 ns)',period:()=>3.5e-9},{label:'1 clk_x1 (7 ns)',period:()=>7e-9},{label:'1 µs',period:()=>1e-6},{label:'1 ms',period:()=>1e-3}],
  zooms:[[1,'1 s'],[0.002,'2 ms'],[1e-6,'1 µs'],[1e-7,'100 ns'],[2.1e-8,'21 ns (3 cycles)']],
  defaultZoom:4,
  init(S){ S.seek(0.0012); },   // start just after PLL lock, where the cycles are interesting
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the timing lab', render:viewTutorial},
    {id:'second', label:'One second, cycle by cycle', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
