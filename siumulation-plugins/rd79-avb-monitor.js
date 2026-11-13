/* =====================================================================
   RD79 — AVB Monitor (Ward-Beck R&D register: priority C, 2013|46–2014|47)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What it is: an 8-channel IEEE 802.1 AVB / IEEE 1722 listener for the AMS8 and MLC8 1RU monitors, built
   on a DSP4YOU "AVB-DG" XMOS dongle (XS1-L16) whose I2S header feeds the monitor's Cyclone IV FPGA.
   The model RUNS the reference code's logic, transcribed from the archived workspace:
     - module_avb_1722/src/avb_1722_listener_support_audio.c   avb_1722_listener_process_packet()
         (DBC / channel detect, chan_lock 16 packets, rate table, SYT_INTERVAL timestamp sample index)
     - module_avb_audio/src/media_fifos/media_output_fifo.c      ZEROING → LOCKING → LOCKED, markers,
         media_output_fifo_maintain(), NOTIFICATION_PERIOD 250, BUF_CTL_ADJUST_FILL, BUF_CTL_RESET
     - module_avb_media_clock/src/media_clock_server.xc          manage_buffer(): sample_diff, STABLE_THRESHOLD 32,
         LOCK_COUNT_THRESHOLD 400, LOST_LOCK_THRESHOLD 24, MIN_FILL_LEVEL 5, ACCEPTABLE_FILL_ADJUST 50000
     - module_avb_media_clock/src/media_clock_support.c          update_media_clock(): PI loop Kp 32, Ki 1/4,
         WORDLEN_FRACTIONAL_BITS 24, CLOCK_RECOVERY_PERIOD 1<<21 ticks
     - module_gptp/src/gptp.c, gptp_config.h                     update_adjust() (weight 32, 2^30 precision),
         update_path_delay() (weight 32), set_new_role(), sync lock (0x100000, 5), log intervals −3 / 0 / 0
     - module_avb_1722/src/avb_1722_def.h, avb_1722_common.h     8 kHz packets, 61883-6 CIP defaults, 2 ms presentation
     - app_simple_avb_demo/src/main.xc, app_config.h, avb_conf.h, simple_demo_controller.c (threads, demo loop)
     - app_simple_avb_demo/xmos_board_info/WBS-AVB-DG/WBS-AVB-DG.xn, avb_app_board_config.h, aem_entity_strings.h.in
   WBS's own code (everything else is XMOS sw_avb 5.2.0 via DSP4YOU's 14 June 2013 workspace; diffed against
   RD63-AVBResearch/DSP4YOU/Info-D4U-AVB-Dongle1/workspace_avb_14062013.zip):
     - XMOS: Makefile TARGET/filter, the WBS-AVB-DG board folder (XN renamed), entity strings, ethernet board copy
     - FPGA (Software/FPGA/backup18, backup20): i2s_parallel.v, parallel_i2s.v, avbfifo.v, avb_i2s_resampler.bdf,
         AMS81.qsf (AVB_* pins), AMS81.sdc (AVB clocks)
     - Atmel front panel (Software/Atmel/AMS81 Front/backup2/v200w.c): the two //Avb-Add blocks
   Board drawing: DSP4YOU "AVB-DGK Quick start guide.pdf" p.4 (69 × 40 mm top view, J1/J2 pin-outs),
   D4U-AVB_Dongle_Schematic.pdf (LAN8710A, CS2300, AT25DF041A, PIC32MX250F128C, 24LC128) — both in RD63.
   AMS8-1A front panel: the real silk PNGs already cut for ams81.js (assets/ams81-*.png) and its meter geometry
   and SHARC vumeter.asm ballistics (credited there).
   Bench timings (when the controller connects, when the grandmaster's Announce lands, the GM's epoch,
   transit and processing times) are not in the archive: marked inferred on screen.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;

/* ---------- shared view kit (same shape as the other R&D plugins; no globals) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const infW = why => `<span class="tag-inf" title="Inferred: ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function kv(rows){ return `<table class="kv">${rows.map(r=>`<tr><th>${r[0]}</th><td${r[2]?' class="mono"':''}>${r[1]}</td></tr>`).join('')}</table>`; }
function tbl(head, rows, cls){ return `<table class="kv ${cls||''}"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }
const Y = y => SIM.year(y);
const fmt = (v,d) => (v==null||isNaN(v)) ? '—' : (+v).toFixed(d==null?2:d);
const hex2 = v => (v&0xFF).toString(16).toUpperCase().padStart(2,'0');
const plink = (id, txt) => `<a href="siumulation.html?plugin=${id}">${txt}</a>`;
const ROOT = 'ENGINEERING - 2016 RD FILES/RD79-AVB Monitor';

const LOG = { items: [] };
function act(name, fn){
  const trace = []; const tr = s => trace.push(s);
  try { fn(tr); } catch(e){ tr('error: '+e.message); console.error(e); }
  LOG.items.unshift({ t: SIM.t, sec: D.sec, name, trace });
  if (LOG.items.length > 60) LOG.items.length = 60;
  SIM.refresh();
}
function traceHTML(){
  const e = LOG.items[0];
  return e ? `<div><b>${e.name}</b> <span class="muted">at ${SIM.fmtT(e.sec+e.t)} after power-up</span></div>` + e.trace.map(s=>`<div>→ ${s}</div>`).join('')
           : '<div class="muted">Use the board, the network or the AMS8 panel. Each step the firmware takes (function, define, message) is listed here.</div>';
}
function logHTML(){ return LOG.items.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.sec+e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>'; }
function bindActs(root, map){ root.querySelectorAll('[data-a]').forEach(b=>{ const f = map[b.dataset.a]; if (f) b.onclick = e=>{ e.preventDefault(); f(b.dataset.v, b); }; }); }

function blockView(m, B, W, opts){
  opts = opts || {};
  let sel = opts.start || Object.keys(B)[0];
  const vw = opts.w || 760, vh = opts.h || 470;
  m.innerHTML = `<div class="grid2"><div>${card(opts.title||'Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${opts.side? card(opts.sideTitle||'In one sentence', opts.side) : ''}</div></div>`;
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 ${vw} ${vh}" style="width:100%"><defs><marker id="arBD79" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l])=>{ const A_=B[a], B_=B[b]; if(!A_||!B_) return; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1);
      const hot = sel===a || sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#arBD79)"/>`;
      if (l) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in B){ const b = B[k]; const on = sel===k; const live = b.live && b.live();
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${live?'color-mix(in srgb,var(--accent) 16%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>
        ${(b.s||[]).map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += '</svg>';
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick = ()=>{ sel = g.dataset.b; draw(); });
    const b = B[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${typeof b.d==='function'?b.d():b.d}</p>${b.src?`<p class="small muted mono">${b.src}</p>`:''}`;
  };
  draw();
  SIM.on('time', draw);
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
      <rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">RD79 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59, not original CAD</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML = SHEETS[i].note;
  };
  draw();
  SIM.on('time', draw);
}
function tutorialView(m, L, st, opts){
  m.innerHTML = `<div class="grid2">
    <div>${card(opts.title, `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card(opts.panelTitle||'The bench', `<div id="tpanel"></div>`)}${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}</div></div>`;
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
function bitsLane(c, X, t0, t1, y, h, T, levelFn, col, label){
  const px = X(t0+T)-X(t0);
  if (px < 2){ return SIM.pulses(c, X, t0, t1, y, h, T*2, 0, T, col, label); }
  const n0 = Math.floor(t0/T), n1 = Math.ceil(t1/T);
  c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath();
  let prev = null;
  for (let n=n0; n<=n1; n++){ const v = levelFn(n); const yy = y+4+(1-v)*(h-8); const xa = X(n*T), xb = X((n+1)*T);
    if (prev===null) c.moveTo(xa, yy); else c.lineTo(xa, yy); c.lineTo(xb, yy); prev = v; }
  c.stroke(); c.lineWidth = 1;
}
function laneText(c, X, t0, y, h, s, col){ c.fillStyle = col || SIM.css('--ink2'); c.font = '11px '+SIM.css('--sans'); c.fillText(s, X(t0)+6, y+h/2+4); }
const hash01 = n => { let x = (n*2654435761)>>>0; x ^= x>>>13; x = Math.imul(x, 0x5bd1e995)>>>0; x ^= x>>>15; return (x>>>0)/4294967296; };

/* ================================================================
   CONSTANTS (from the archived source unless marked)
   ================================================================ */
const C = {
  FS: 48000,                    // demo(): sample_rate = 48000; set_avb_sink_format(…48000)
  PKT_RATE: 8000,               // AVB1722_PACKET_RATE
  SPP: 6, NCH: 8,               // 48000/8000 samples per packet; AVB_DEMO_NUM_CHANNELS 8
  PRES: 0.002,                  // AVB_DEFAULT_PRESENTATION_TIME_DELAY_NS 2000000
  FIFO: 320,                    // MEDIA_OUTPUT_FIFO_WORD_SIZE = AVB_MAX_AUDIO_SAMPLE_RATE/300 ("Fix for Apple")
  NOTIFY: 250,                  // NOTIFICATION_PERIOD (samples)
  STABLE: 32, LOCK_COUNT: 400, LOST: 24, MIN_FILL: 5, MAXPKT: 12, ACCEPT: 50000,
  CR_TICKS: 1<<21,              // CLOCK_RECOVERY_PERIOD (100 MHz ticks = 20.97 ms)
  TIMER: 1e8,                   // XS1 reference timer 100 MHz
  SYNC_T: 0.125, PDELAY_T: 1, ANN_T: 1, ANN_TIMEOUT: 3,     // log intervals −3, 0, 0; RECV_ANNOUNCE_TIMEOUT 3×
  ADJ_W: 32, PD_W: 32, LOCK_VAR: 0x100000, LOCK_STAB: 5,     // PTP_ADJUST_WEIGHT, PTP_PATH_DELAY_WEIGHT, PTP_SYNC_LOCK_*
  POLL_T: 50e-6,                // PERIODIC_POLL_TIME 5000 ticks → avb_periodic() + simple_demo_controller()
  PTP_PERIODIC: 100e-6,         // PTP_PERIODIC_TIME 10000 ticks
  MCLK: 24.576e6, SCLK: 3.072e6, // MASTER_TO_WORDCLOCK_RATIO 512; mclk_to_bclk_ratio 512/64 = 8
  SYNC_OUT: 480,                // PLL_TO_WORD_MULTIPLIER 100 → p_fs toggles every 50 words (CS2300 reference)
  WIRE_BYTES: 266,              // 8 preamble + 18 MAC/VLAN + 24 AVTP + 8 CIP + 192 payload + 4 FCS + 12 IFG (frame layout from avb_1722_common.h; preamble/IFG standard)
  GM_PRIO1: 248,                // grandmaster priority1 — INFERRED typical AVB talker; ours is PTP_DEFAULT_GM_CAPABLE_PRIORITY1 250
  /* bench timings — INFERRED */
  T_CONNECT: 0.050, T_SRP: 0.175, T_ANN0: 0.310, T_SYNC0: 0.040, EPOCH: 0.73, TX_LAT: 20e-6,
};
C.WIRE_T = C.WIRE_BYTES*8/100e6;  // 21.28 µs on the LAN8710A's 100 Mb/s link
const ST_NAMES = ['DISABLED','ZEROING','LOCKING','LOCKED'];
const ST_COL = ()=>[SIM.css('--ink2'), SIM.css('--warn'), SIM.css('--accent2'), SIM.css('--accent')];
const BUILDS = {
  backup1: { name:'WBS AVB Dongle', date:'2014-03-03', dir:'Software/XMOS/backup1' },
  backup2: { name:'MLC8',           date:'2014-03-20', dir:'Software/XMOS/backup2-name is mlc8' },
  backup3: { name:'AMS8',           date:'2014-03-21', dir:'Software/XMOS/backup3-name is ams8' },
};
const OMEGA = 'Ω';

/* ================================================================
   STATE
   ================================================================ */
const DEF = { build:'backup3', host:'AMS8', talker:true, avbSw:true, connected:true, tppm:0, lppm:-30, loss:0, pd:600,
              cutAt:null, sec:0, source:'ANALOG', mapShift:0, toggleRemote:0, monPpm:20, j1pin:12 };
const D = Object.assign({}, DEF);
function reset(over){ Object.assign(D, DEF, over||{}); LOG.items = []; RKEY=''; MKEY=''; SIM.refresh(); }
const tAbs = () => D.sec + SIM.t;

/* ================================================================
   ENGINE — runs the reference code's state machines from power-up (0 … 12 s)
   ================================================================ */
const T_END = 12;
let RC = null, RKEY = '';
const M32 = 4294967296;
const w32 = x => ((x % M32) + M32) % M32;
const s32 = x => { x = w32(x); return x >= 2147483648 ? x - M32 : x; };
function run(){
  const key = JSON.stringify([D.talker,D.avbSw,D.connected,D.tppm,D.lppm,D.loss,D.cutAt,D.pd,D.toggleRemote]);
  if (key === RKEY && RC) return RC; RKEY = key;
  const et = D.tppm*1e-6, el = D.lppm*1e-6;
  const Tpkt = 1/(C.PKT_RATE*(1+et)), fsT = C.FS*(1+et);
  const N = Math.ceil(T_END/Tpkt);
  const Lt = t => t*C.TIMER*(1+el);                       // dongle reference-timer ticks (25 MHz osc × PLL)
  const tOfL = l => l/(C.TIMER*(1+el));
  const link = t => D.cutAt==null || t < D.cutAt;
  const gmVis = D.talker && D.avbSw;
  const gmNs = t => t*1e9 + C.EPOCH*1e9;                  // grandmaster time (ns)
  const pdTrue = D.pd*1e-9;
  const R = { N, Tpkt, fsT, fill:new Int16Array(N), st:new Uint8Array(N), aud:new Uint8Array(N), ppm:new Float32Array(N), pk:new Uint8Array(N),
              ptpEv:[], roles:[], notes:[], clk:[], msgs:[], trans:[], srp:[], adjHist:[], pdHist:[], chanLockAt:null, rateHz:0, pt0:Infinity, n0:Infinity };
  const msg = (t, s, src) => R.msgs.push({t, s, src});
  /* ---- gPTP (gptp.c) ---- */
  const P = { role:'MASTER', gAdj:0, adjValid:false, prevValid:false, prevM:0, prevL:0, lock:false, cnt:0, pd:0, pdValid:false, ref:null, lastAnn:-1 };
  R.roles.push({t:0, role:'MASTER', lock:false});
  const setRole = (t, role) => {
    P.role = role;
    if (role==='SLAVE'){ P.pdValid=false; P.gAdj=0; P.prevValid=false; P.lock=false; P.cnt=0; msg(t,'PTP Role: Slave','gptp.c set_new_role()'); }
    else { P.gAdj=0; msg(t,'PTP Role: Master','gptp.c set_new_role()'); }
    R.roles.push({t, role, lock:P.lock});
  };
  const ptpOf = lt => P.ref ? P.ref.p + (lt - P.ref.l)*10*(1 + P.gAdj/1073741824) : lt*10;
  const ev = [];
  if (gmVis){ for (let t=C.T_ANN0; t<T_END; t+=C.ANN_T) ev.push([t,'ann']); for (let t=C.T_SYNC0, j=0; t<T_END; t+=C.SYNC_T, j++) ev.push([t,'sync',j]); }
  for (let t=0.0005; t<T_END; t+=C.SYNC_T) ev.push([t,'mysync']);
  for (let t=0.001; t<T_END; t+=C.ANN_T) ev.push([t,'myann']);
  for (let t=0.002, j=0; t<T_END; t+=C.PDELAY_T, j++) ev.push([t,'pdreq',j]);
  for (let l=C.CR_TICKS; tOfL(l)<T_END; l+=C.CR_TICKS) ev.push([tOfL(l),'cr']);
  for (let t=0.4; t<T_END; t+=1) ev.push([t,'mrp']);                       // MRP periodic timer 100 cs (phase inferred)
  ev.push([0.0003,'adp']); for (let t=5; t<T_END; t+=5) ev.push([t,'adp']); // AVB_1722_1_ADP_REPEAT_TIME (inferred 5 s)
  ev.sort((a,b)=>a[0]-b[0]);
  /* ---- stream: ACMP connect → MSRP Listener Ready → talker forwards through the bridge ---- */
  const tConn = (D.connected && !D.toggleRemote) ? C.T_CONNECT : null;
  if (tConn!=null && link(tConn)){
    R.srp.push({t:tConn, s:'ACMP CONNECT_RX_COMMAND → avb_listener_on_talker_connect(): non-XMOS talker → do_connect = 1; set_avb_sink_state(0, AVB_SINK_STATE_POTENTIAL)'});
    msg(tConn, 'CONNECTING Listener sink #0 -> Talker stream 0x0011223344550000, DA: 91:e0:f0:00:12:34', 'simple_demo_controller.c');
  }
  const srpOK = tConn!=null && gmVis && link(C.T_SRP);
  if (tConn!=null){
    R.srp.push({t:C.T_SRP, s: srpOK ? 'MSRP Listener Ready (JoinIn) on the MRP join timer (MRP_JOINTIMER_PERIOD_CENTISECONDS 20)' :
      (D.avbSw ? 'MSRP Listener declared, but there is no Talker Advertise (talker off)' : 'MSRP to 01-80-C2-00-00-0E: a plain 802.1D switch does not forward it — the talker never sees Listener Ready')});
  }
  const txLat = C.TX_LAT + 2*C.WIRE_T + pdTrue;           // talker processing + store-and-forward + cable (inferred)
  if (srpOK){ R.pt0 = C.T_SRP + 0.002; R.n0 = Math.ceil(R.pt0/Tpkt); }
  const capture = k => R.n0*Tpkt + Math.floor(k/6)*Tpkt - txLat - (5 - k%6)/fsT;   // talker capture time of sample k
  const presNs = k => gmNs(capture(k)) + C.PRES*1e9;
  /* ---- listener / FIFO / media clock state ---- */
  const LS = { prevDbc:0, prevNum:0, chanLock:0, ncp:0, rate:0 };
  const F = { state:0, Qw:0, Qr:0, marker:null, ptp:0, lts:0, zw:0, zero:1, sc:0, lastN:0, under:0 };
  const B = { lc:0, prev:0, stab:0 };
  const NOMW = Math.floor(C.TIMER*16777216/C.FS);         // init_media_clock_recovery(): (100000000LL << 24) / rate
  const K = { wordlen: NOMW, ierr:0, first:1, s1:null, s2:null };
  const wExt = () => Math.floor(K.wordlen/256);            // local_wordlen_to_external_wordlen() → WC_FRACTIONAL_BITS 16
  const trans = (t, st, why) => { F.state = st; R.trans.push({t, st, why}); };
  let tCur = 0;
  const advance = t => {
    if (t <= tCur) return;
    if (F.state){
      const r = C.TIMER*(1+el)/(wExt()/65536);
      let q = F.Qr + r*(t - tCur);
      if (F.marker!=null && !F.lts && F.Qr <= F.marker && q > F.marker && F.marker < F.Qw){ F.lts = Lt(tCur + (F.marker - F.Qr)/r) || 1; }
      if (q > F.Qw){ q = F.Qw; F.under++; }
      F.Qr = q;
    }
    tCur = t;
  };
  const fifoReset = t => { trans(t,1,'BUF_CTL_RESET'); F.zw = 0; F.zero = 1; };
  const manage = t => {                                   // media_clock_server.xc manage_buffer()
    const locked = F.state===3, fill = Math.floor(F.Qw - F.Qr);
    const outP = w32(ptpOf(F.lts)), diff = s32(outP - F.ptp);
    const nsw = Math.trunc(wExt()*10/65536);
    K.s2 = { l:F.lts, o:outP, p:F.ptp, locked, fill, valid:true };
    const sd = Math.trunc(diff/nsw);
    if (locked && B.lc < C.LOCK_COUNT) B.lc++;
    if (sd < C.ACCEPT && sd > -C.ACCEPT && sd-B.prev <= 1 && sd-B.prev >= -1) B.stab++; else B.stab = 0;
    let a = 'BUF_CTL_ACK';
    if (!locked && B.stab > C.STABLE){
      const maxAdj = C.FIFO - C.MAXPKT;
      if (fill - sd > maxAdj || fill - sd < -maxAdj){ a='BUF_CTL_RESET'; msg(t, `Media output 0 compensation too large: ${sd} samples`, 'manage_buffer()'); fifoReset(t); }
      else { a=`BUF_CTL_ADJUST_FILL ${sd}`; msg(t, `Media output 0 locked: ${sd} samples shorter`, 'manage_buffer()'); K.s2.valid=false; B.lc=0; F.Qw -= sd; F.zero=0; trans(t,3,'BUF_CTL_ADJUST_FILL'); }
    } else if (locked && B.lc===C.LOCK_COUNT && (sd > C.LOST || sd < -C.LOST || fill < C.MIN_FILL)){
      a='BUF_CTL_RESET'; msg(t, 'Media output 0 lost lock', 'manage_buffer()'); fifoReset(t);
    }
    R.notes.push({ t, sd, diff, stab:B.stab, lc:B.lc, fill, act:a, locked });
    B.prev = sd; F.ptp = 0; F.lts = 0; F.marker = null;   // BUF_CTL_REQUEST_INFO clears the marker
  };
  const crTick = t => {                                   // media_clock_support.c update_media_clock(), INPUT_STREAM_DERIVED
    let what = 'no new stream info → default';
    if (K.s2 && K.s2.valid){
      if (!K.s1 || !K.s1.valid){ K.s1 = Object.assign({}, K.s2); K.s2.valid = false; what = 'first stream info stored'; }
      else if (!K.s2.locked){ K.wordlen = NOMW; K.s1 = Object.assign({}, K.s2); K.s2.valid=false; K.first=1; K.ierr=0; what = 'stream unlocked → nominal wordlen'; }
      else {
        const dl = s32(K.s2.l - K.s1.l) || 1;
        const ie = s32(K.s2.o - K.s2.p) * 16777216;
        const pe = K.first ? 0 : ie - K.ierr; K.first = 0; K.ierr = ie;
        K.wordlen = K.wordlen - Math.trunc(pe/dl)*32 - Math.trunc(Math.trunc(ie/dl)/4);
        K.s1 = Object.assign({}, K.s2); K.s2.valid = false; what = `PI: ierror ${Math.round(s32(K.s2.o-K.s2.p))} ns`;
      }
    }
    R.clk.push({ t, wordlen:K.wordlen, ext:wExt(), what, ppm: rateppm() });
  };
  const rateppm = () => ((1+el)*(NOMW/256)/wExt() - 1)*1e6;   // true output-rate error of the recovered media clock
  const process = (t, seq) => {                           // avb_1722_listener_process_packet()
    const dbc = (seq*6) & 255; let dd = dbc - LS.prevDbc; LS.prevDbc = dbc; if (dd < 0) dd += 256;
    const ns = (200-8)>>2;                                 // packet_data_length 200 → 48 samples
    const prev = LS.prevNum; LS.prevNum = ns;
    if (LS.chanLock < 16){
      if (!prev || dd===0) return 'chan_lock: waiting';
      const nc = Math.trunc(prev/dd);
      if (!LS.ncp || LS.ncp !== nc){ LS.ncp = nc; LS.chanLock = 0; LS.rate = 0; }
      LS.rate += ns; LS.chanLock++;
      if (LS.chanLock === 16){ const r = Math.trunc(LS.rate/LS.ncp/16); R.rateHz = ({1:8000,2:16000,4:32000,5:44100,6:48000,11:88200,12:96000})[r]||0; R.chanLockAt = t; R.ncp = LS.ncp;
        msg(t, `chan_lock = 16: num_channels_in_payload = ${LS.ncp}, rate = ${R.rateHz}`, 'avb_1722_listener_support_audio.c'); }
      return 'chan_lock '+LS.chanLock;
    }
    if (F.state === 0){ F.Qw = F.Qr; F.zw = 0; F.zero = 1; F.sc = 0; F.marker = null; trans(t,1,'enable_media_output_fifo()'); }
    const sn = (8 - (dbc & 7)) & 7;
    if (sn <= 5 && F.marker == null){ F.marker = F.Qw + sn; F.ptp = w32(presNs(seq*6+sn)) || 1; F.lts = 0; }
    if (F.state === 1){ if (F.zw >= C.FIFO){ F.Qw = F.Qr + C.FIFO/2; F.marker = null; F.ptp = 0; F.lts = 0; F.zero = 1; trans(t,2,'*zero_marker == 0'); } }
    else if (F.ptp && F.lts && (F.lastN === 0 || F.sc - F.lastN > C.NOTIFY)){ manage(t); F.lastN = F.sc; }
    if (F.state === 1) F.zw += 6;
    F.Qw = Math.min(F.Qw + 6, F.Qr + C.FIFO - 1); F.sc += 6;
    return 'pushed';
  };
  let evi = 0;
  for (let n=0; n<N; n++){
    const t = n*Tpkt;
    while (evi < ev.length && ev[evi][0] <= t){
      const [te, k, j] = ev[evi++]; advance(te);
      if (!link(te)) continue;
      if (k==='ann'){ R.ptpEv.push({t:te, k:'Announce', d:'rx'}); P.lastAnn = te; if (P.role==='MASTER'){ msg(te, `BMCA: grandmasterPriority1 ${C.GM_PRIO1} < our ${250} → new best master`, 'bmca_update_roles()'); setRole(te,'SLAVE'); } }
      else if (k==='sync'){
        R.ptpEv.push({t:te, k:'Sync', d:'rx'}); R.ptpEv.push({t:te+0.00004, k:'Follow_Up', d:'rx'});
        if (P.role==='SLAVE'){
          const lt = Math.round(Lt(te + pdTrue) + (hash01(j*7+3)-0.5)*8);   // ingress stamp, ±40 ns MII nibble jitter (inferred)
          const mt = gmNs(te);
          if (P.prevValid){
            const md = mt - P.prevM, ld = (lt - P.prevL)*10;
            if (md && ld){
              const adj = Math.trunc((md - ld)/md*1073741824);
              if (P.adjValid){
                const df = Math.abs(adj - P.gAdj);
                if (!P.lock){ if (df < C.LOCK_VAR){ if (++P.cnt > C.LOCK_STAB){ P.lock = true; P.cnt = 0; msg(te,'PTP sync locked','update_adjust()'); R.roles.push({t:te, role:P.role, lock:true}); } } else P.cnt = 0; }
                else { if (df > C.LOCK_VAR){ if (++P.cnt > C.LOCK_STAB){ P.lock=false; P.cnt=0; msg(te,'PTP sync lock lost','update_adjust()'); R.roles.push({t:te, role:P.role, lock:false}); } } else P.cnt = 0; }
                P.gAdj = Math.trunc((P.gAdj*(C.ADJ_W-1) + adj)/C.ADJ_W);
              } else { P.gAdj = adj; P.adjValid = true; }
            }
          }
          P.prevM = mt; P.prevL = lt; P.prevValid = true;
          P.ref = { l: lt, p: mt + P.pd };                // update_reference_timestamps()
          R.adjHist.push({t:te, adj:P.gAdj, ppm:P.gAdj/1073741824*1e6, cnt:P.cnt, lock:P.lock});
        }
      }
      else if (k==='mysync'){ if (P.role==='MASTER'){ R.ptpEv.push({t:te, k:'Sync', d:'tx'}); R.ptpEv.push({t:te+0.00003, k:'Follow_Up', d:'tx'}); } }
      else if (k==='myann'){ if (P.role==='MASTER') R.ptpEv.push({t:te, k:'Announce', d:'tx'}); }
      else if (k==='pdreq'){
        R.ptpEv.push({t:te, k:'Pdelay_Req', d:'tx'});
        if (D.avbSw){
          R.ptpEv.push({t:te+0.00006, k:'Pdelay_Resp', d:'rx'}); R.ptpEv.push({t:te+0.0001, k:'Pdelay_Resp_FU', d:'rx'});
          const meas = Math.max(0, D.pd + (hash01(j*13+1)-0.5)*80);
          P.pd = P.pdValid ? Math.trunc((P.pd*(C.PD_W-1) + Math.trunc(meas))/C.PD_W) : Math.trunc(meas); P.pdValid = true;
          R.pdHist.push({t:te, pd:P.pd});
        }
      }
      else if (k==='cr') crTick(te);
      else if (k==='mrp') R.srp.push({t:te, s:'MRP periodic timer (MRP_PERIODIC_TIMER_PERIOD_CENTISECONDS 100)', minor:true});
      else if (k==='adp') R.srp.push({t:te, s:'ADP ENTITY_AVAILABLE from “'+BUILDS[D.build].name+'”', minor:true});
    }
    advance(t);
    if (P.role==='SLAVE' && P.lastAnn>=0 && t - P.lastAnn > C.ANN_TIMEOUT){ msg(t,'Announce receipt timeout (RECV_ANNOUNCE_TIMEOUT)','gptp.c'); setRole(t,'MASTER'); P.lastAnn = -1; }
    if (n >= R.n0 && D.talker && link(t)){
      const seq = n - R.n0;
      const lost = D.loss > 0 && hash01(seq*3+11) < D.loss/100;
      if (lost) R.pk[n] = 2;
      else { process(t, seq); R.pk[n] = (((8 - ((seq*6)&7)) & 7) <= 5) ? 3 : 1; }
    }
    R.fill[n] = F.state ? Math.round(F.Qw - F.Qr) : 0;
    R.st[n] = F.state;
    R.aud[n] = (F.state===3 && !F.zero && F.Qw - F.Qr >= 1) ? 1 : 0;
    R.ppm[n] = rateppm();
  }
  R.wordNom = NOMW;
  RC = R; return R;
}
/* ---- queries at an absolute time ---- */
function slotAt(t){ const R = run(); return Math.max(0, Math.min(R.N-1, Math.floor(t/R.Tpkt))); }
function lastBefore(arr, t){ let lo=0, hi=arr.length-1, r=null; while(lo<=hi){ const m=(lo+hi)>>1; if (arr[m].t<=t){ r=arr[m]; lo=m+1; } else hi=m-1; } return r; }
function roleAt(t){ return lastBefore(run().roles, t) || {role:'MASTER', lock:false}; }
function stAt(t){ return run().st[slotAt(t)]; }
function pktAt(t){ const R = run(), n = slotAt(t); if (n < R.n0) return null; return { n, seq:n-R.n0, kind:R.pk[n], t:n*R.Tpkt }; }

/* ================================================================
   TALKER CONTENT and AMS8 METERING (SHARC vumeter.asm ballistics, as in ams81.js)
   ================================================================ */
const CONTENT = [
  {kind:'tone', f:1000, lvl:-20, name:'1 kHz −20 dBFS'}, {kind:'tone', f:1000, lvl:-20, name:'1 kHz −20 dBFS'},
  {kind:'prog', seed:3, lvl:-18, name:'programme'}, {kind:'prog', seed:4, lvl:-21, name:'programme'},
  {kind:'prog', seed:5, lvl:-24, name:'programme'}, {kind:'prog', seed:6, lvl:-30, name:'programme (LFE)'},
  {kind:'prog', seed:7, lvl:-22, name:'programme'}, {kind:'prog', seed:8, lvl:-22, name:'programme'},
];   // the talker's test content — INFERRED (no test material is in the archive)
function progEnv(seed, t, lvl){
  const base = Math.pow(10, lvl/20);
  let a = base*(0.55 + 0.30*Math.sin(2*Math.PI*(0.7+0.13*seed)*t + seed) + 0.15*Math.sin(2*Math.PI*3.1*t + 2*seed));
  const per = 0.25 + 0.04*seed, ph = ((t + 0.05*seed) % per + per) % per;
  a *= 1 + 2.2*Math.exp(-ph/0.03);
  return Math.min(1, Math.max(0, a));
}
function sampleOf(ch, k){   // talker sample k of channel ch (−1…1)
  const c = CONTENT[ch], t = k/C.FS;
  if (c.kind==='tone') return Math.pow(10, c.lvl/20)*Math.sin(2*Math.PI*c.f*t);
  return progEnv(c.seed, t, c.lvl)*(hash01(k*8+ch)*2-1)*1.7;
}
function msOf(ch, t){ const c = CONTENT[ch]; if (c.kind==='tone'){ const a=Math.pow(10,c.lvl/20); return a*a/2; } const a = progEnv(c.seed, t, c.lvl); return a*a; }
const TC_VU = 0.000319752, TC_PA = 0.02276277, TC_PD = 0.000031978;     // vumeter.asm (via ams81.js)
const CAL_DATA = [-4,0,4,8,12,16,20,-1], CAL_I = 1;                      // cal −20 → cal_data[1]
const LED_UPPER = [12,16,20,24,28,32,34,36,38,40,42,44,46,48,52,56,60,64,74,82,94,114];
const MDT = 0.00025;
let MC = null, MKEY = '';
function meters(){
  const R = run(); const key = RKEY+'|'+D.sec+'|'+D.source+'|'+D.mapShift;
  if (key === MKEY && MC) return MC; MKEY = key;
  const n = Math.round(MDT*C.FS);
  const kv_ = 1-Math.pow(1-TC_VU,n), ka = 1-Math.pow(1-TC_PA,n), kd = Math.pow(1-TC_PD,n);
  const T0 = Math.max(0, D.sec-1.5), MN = Math.round((D.sec+1-T0)/MDT)+1;
  const vu=[], pk=[];
  for (let ch=0; ch<8; ch++){
    const src = (ch + D.mapShift) % 8;
    let v=1e-12, a=1e-12, d=1e-12; const V=new Float32Array(MN), Pk=new Float32Array(MN);
    for (let i=0;i<MN;i++){
      const t = T0 + i*MDT; const on = D.source==='ANALOG' && R.aud[slotAt(t)];
      const ms = on ? Math.max(1e-12, msOf(src, t)) : 1e-12;
      v += kv_*(ms-v); a += ka*(ms-a); d = Math.max(a, d*kd); V[i]=v; Pk[i]=d;
    }
    vu.push(V); pk.push(Pk);
  }
  MC = { T0, vu, pk }; return MC;
}
function meterIdx(ms, isVu){ let i = -20*Math.log10(Math.max(ms,1e-30)); i = Math.max(0, Math.min(255, Math.round(i))); i += CAL_DATA[CAL_I] + (isVu?-6:0); return Math.max(0, Math.min(255, i)); }
function segs(idx){ for (let k=0;k<LED_UPPER.length;k++) if (idx<=LED_UPPER[k]) return 22-k; return 0; }
function meterAt(ch, t){ const M = meters(); const i = Math.max(0, Math.min(M.vu[0].length-1, Math.round((t-M.T0)/MDT)));
  const vi = meterIdx(M.vu[ch][i], true), pi = meterIdx(M.pk[ch][i], false);
  return { vu:segs(vi), pk:segs(pi), vuDb: 10*Math.log10(Math.max(M.vu[ch][i],1e-30))+3, pkDb: 10*Math.log10(Math.max(M.pk[ch][i],1e-30)) }; }

/* ================================================================
   USER ACTIONS — each one logs the code path it follows
   ================================================================ */
function rerun(){ RKEY=''; MKEY=''; }
const A = {
  build(v){ act(`Flash snapshot ${v} (“${BUILDS[v].name}”)`, tr=>{ D.build=v; rerun();
    tr(`${BUILDS[v].dir}/testws4/app_simple_avb_demo: xmake with TARGET = WBS-AVB-DG → bin/app_simple_avb_demo.xe (1,470,844 bytes, dated ${BUILDS[v].date})`);
    tr(`xflash writes the AT25DF041A boot flash on tile[0] (XN: <Boot><Source Location="SPI:bootFlash"/>); tile[1] boots over the XLINK`);
    tr(`aem_entity_strings.h.in: AVB_1722_1_ENTITY_NAME_STRING “${BUILDS[v].name}”, VENDOR “WBS”, MODEL “WBS-AVB-DG”, FIRMWARE “1.00”, SERIAL “0123456789”`);
    tr('That string is the only source difference between the three snapshots; it appears in ADP/AEM ENTITY descriptors, so an AVDECC controller lists the dongle under this name'); }); },
  host(v){ act(`Host monitor → ${v}`, tr=>{ D.host=v;
    if (v==='MLC8'){ tr('Software/FPGA/backup20-mlc8 version-with aes receivers (24 Mar 2014): avb_i2s_resampler.bdf = 4 × (i2s_parallel → avbfifo 16×64 → parallel_i2s)');
      tr('AMS81.sdc: avb_mclk_24M576 → PLL ×4 → avbpllout_98M304 clocks the AES receivers and the Altera SRC core (inst81, src_aes_example_top)'); }
    else { tr('Software/FPGA/backup18-new for AMS81 (21 Mar 2014): AVB_I2S1..4_IN → i2s_2_aes3 → AVB_AES1..4_IN into aes_input_router; no avbfifo');
      tr('Front panel: Software/Atmel/AMS81 Front/backup2/v200w.c with the //Avb-Add label'); }
    tr('Both FPGA folders are labelled “timing not optimized” — neither was a release'); }); },
  talker(){ act(D.talker?'Switch the talker / grandmaster off':'Switch the talker / grandmaster on', tr=>{ D.talker=!D.talker; rerun();
    tr(D.talker? `The talker sends Announce (priority1 ${C.GM_PRIO1}, ${inf}) every 1 s and Sync/Follow_Up every 125 ms; bmca_update_roles() makes it our master` :
      'No Announce arrives: ptp_state stays PTP_MASTER (the reset value in gptp.c); the dongle sends its own Sync every SYNC_PERIOD (125 ms) and no stream exists'); }); },
  sw(){ act(D.avbSw?'Replace the AVB switch with a plain switch':'Put the AVB switch back', tr=>{ D.avbSw=!D.avbSw; rerun();
    if (!D.avbSw){ tr('gPTP (PTP_8021AS_DEST_ADDR 01:80:C2:00:00:0E) and MSRP (AVB_SRP_MACADDR, same address) are link-local: an 802.1D bridge does not forward them ('+inf+', 802.1D reserved range)');
      tr('No Pdelay_Resp → ptp_path_delay never valid; no Announce → we stay PTP_MASTER; no Listener Ready reaches the talker → no 1722 stream (RD63: “a non-AVB bridge … breaks the guarantee”)'); }
    else tr('The bridge answers Pdelay_Req, relays Sync/Announce from the grandmaster and reserves bandwidth for the stream'); }); },
  connect(){ act(D.connected?'Controller: disconnect the stream (ACMP DISCONNECT_RX)':'Controller: connect talker → AMS8 (ACMP CONNECT_RX)', tr=>{ D.connected=!D.connected; rerun();
    if (D.connected){ tr('An AVDECC controller (the DSP4YOU guide recommends UNOS Vision, RD63) sends ACMP CONNECT_RX_COMMAND to sink 0');
      tr('avb_listener_on_talker_connect(): (talker_guid->l >> 40) != XMOS_VENDOR_ID>>8 → “Non XMOS talker”, do_connect = 1');
      tr('set_avb_sink_sync(0,0); set_avb_sink_channels(0, 8); set_avb_sink_map(0, {0..7}); set_avb_sink_id(); set_avb_sink_addr(); set_avb_sink_state(0, AVB_SINK_STATE_POTENTIAL)');
      tr('MSRP Listener Ready is declared on the next Join timer (≤ 200 ms) — the bridge then forwards the talker’s 8 kHz packets'); }
    else tr('set_avb_sink_state(0, AVB_SINK_STATE_DISABLED): MSRP Leave; the bridge stops forwarding the stream'); }); },
  tppm(v){ act(`Talker media clock → ${v} ppm against gPTP`, tr=>{ D.tppm=+v; rerun(); tr(`The talker now sends ${(8000*(1+v*1e-6)).toFixed(3)} packets/s in grandmaster time; presentation timestamps move with it`); tr('update_media_clock() must slew the dongle word clock to follow (INPUT_STREAM_DERIVED)'); }); },
  lppm(v){ act(`Dongle 25 MHz crystal → ${v} ppm`, tr=>{ D.lppm=+v; rerun(); tr(`The XS1 100 MHz reference timer runs ${v} ppm off; update_adjust() measures it as g_ptp_adjust ≈ ${(-v).toFixed(0)} ppm (in 2^-30 units: ${Math.round(-v*1073.741824)})`); tr('The media clock starts at the nominal wordlen in local ticks, so the word clock is '+v+' ppm off until clock recovery corrects it'); }); },
  loss(v){ act(`Packet loss → ${v} %`, tr=>{ D.loss=+v; rerun(); tr('A lost packet never reaches avb_1722_listener_process_packet(): 6 samples are missing, every later sample comes out 6 samples early'); tr('manage_buffer() sees sample_diff step by −6; update_media_clock() reads that as a timing error and slows the word clock; after LOCK_COUNT_THRESHOLD a step beyond ±24 samples → “lost lock” → BUF_CTL_RESET'); }); },
  pd(v){ act(`Cable + bridge path delay → ${v} ns`, tr=>{ D.pd=+v; rerun(); tr('update_path_delay(): ((local_ingress − local_egress) − (master_egress − master_ingress)) / 2, averaged with PTP_PATH_DELAY_WEIGHT 32'); }); },
  cut(){ act(D.cutAt==null?'Unplug the Ethernet cable (RJ45 J21)':'Plug the Ethernet cable back in (from power-up)', tr=>{
    if (D.cutAt==null){ D.cutAt = Math.max(0.001, tAbs()); tr(`Link down at ${SIM.fmtT(D.cutAt)}: no more packets, Sync or Announce`);
      tr('media_output_fifo_maintain() only runs when a packet arrives, so nothing in the listener notices: the FIFO drains, media_output_fifo_pull_sample() returns 0 (underflow), the state stays LOCKED');
      tr('gPTP notices 3 s later: RECV_ANNOUNCE_TIMEOUT → set_new_role(PTP_MASTER)'); }
    else { D.cutAt=null; tr('Link restored; the model replays from power-up'); }
    rerun(); }); },
  reboot(){ act('Press S1 (reset)', tr=>{ D.cutAt=null; D.sec=0; rerun(); SIM.seek(0);
    tr('RST_N low → both tiles reboot from the AT25DF041A (tile[0] SPI boot, tile[1] over the XLINK)');
    tr('main(): par { avb_ethernet_server · media_clock_server · i2s_master · avb_1722_talker · avb_1722_listener · gpio_task · { avb_init(); demo(); } }');
    tr('ptp_state = PTP_MASTER until a better Announce arrives; the media FIFO is DISABLED until a stream is connected'); }); },
  sec(v){ D.sec=+v; MKEY=''; SIM.refresh(); },
  src(dir){ act(`AMS8 SELECT ${dir>0?'clockwise':'counter-clockwise'} (input source)`, tr=>{
    const L=['AES75','AES110','ANALOG']; const i=(L.indexOf(D.source)+(dir>0?1:2))%3; D.source=L[i]; MKEY='';
    tr(`PROCESS_SOURCE_${dir>0?'INCREMENT':'DECREMENT'} (control.c) → source = ${D.source}`);
    if (D.source==='ANALOG'){ tr('v200w.c case ANALOG: the //Avb-Rem block (“ Analog ”) is commented out; //Avb-Add writes SPACE SPACE chA chV chB SPACE SPACE SPACE → “  AVB   ”');
      tr('SOURCE_CHANGE(analog_input_source) is unchanged: the FPGA takes the AVB I2S where the analog input used to be ('+inf+')'); }
    else tr('An AES input is selected: the meters follow that input (nothing is plugged into it here)'); }); },
  chanSel(){ act('gpio_task: CHAN_SEL (virtual — PORT_BUTTONS is a dummy port on WBS-AVB-DG)', tr=>{
    tr('WBS-AVB-DG.xn: <Port Location="XS1_PORT_4D" Name="PORT_SHARED_IN"/> under “Dummy Port to match the code” → PORT_BUTTONS; nothing is wired to it');
    D.mapShift=(D.mapShift+2)%8; MKEY='';
    tr('If it could be pressed: demo() case CHAN_SEL → set_avb_sink_state(DISABLED) → map[j] += 2 (mod 8) → set_avb_sink_map() → state POTENTIAL');
    tr(`Meter CH1 now shows AVB channel ${1+D.mapShift}`); }); },
  remoteSel(){ act('gpio_task: REMOTE_SEL (virtual)', tr=>{ D.toggleRemote = D.toggleRemote?0:1; rerun();
    tr('demo(): toggle_remote = !toggle_remote → simple_demo_controller() on the next 50 µs periodic pass');
    tr('avb_1722_1_controller_disconnect_all_listeners(0, c_tx); '+(D.toggleRemote?'avb_1722_1_acmp_controller_deinit() — the built-in controller is off, our sink is dropped':'avb_1722_1_acmp_controller_init(); entity_database_flush(); adp_discover_all()')); }); },
  mon(v){ act(`Monitor house clock → ${v} ppm against the AVB word clock`, tr=>{ D.monPpm=+v; tr(`avbfifo is 16 words deep; started half full it slips after 8 / (48000 × ${Math.abs(v)}e-6) = ${v? (8/(48000*Math.abs(v)*1e-6)).toFixed(2)+' s':'never'}`); }); },
  pin(p){ D.j1pin=+p; SIM.refresh(); },
};

/* ================================================================
   DRAWINGS
   ================================================================ */
/* WBS-AVB-DG = DSP4YOU AVB-DG board, drawn to scale (10 px per mm) from “AVB-DGK Quick start guide.pdf” p.4
   (69 mm × 40 mm top view; positions measured off that drawing, ±0.5 mm). */
const J1 = { 1:'I2S OUT ch1&2', 2:'I2S IN ch1&2', 3:'I2S OUT ch3&4', 4:'I2S IN ch3&4', 5:'I2S OUT ch5&6', 6:'I2S IN ch5&6', 7:'I2S OUT ch7&8', 8:'I2S IN ch7&8', 9:'MCLK OUT', 10:'SCLK', 11:'GND', 12:'LRCLK' };
const J1NET = { 1:'PORT_SDATA_OUT0 (tile[1] 1O)', 3:'PORT_SDATA_OUT1 (1P)', 5:'PORT_SDATA_OUT2 (1A)', 7:'PORT_SDATA_OUT3 (1B)', 2:'PORT_SDATA_IN0 (1N)', 4:'PORT_SDATA_IN1 (1M)', 6:'PORT_SDATA_IN2 (1F)', 8:'PORT_SDATA_IN3 (1E)', 9:'PORT_MCLK (1L) / CS2300 out', 10:'PORT_SCLK (1D)', 12:'PORT_LRCLK (1C)', 11:'GND' };
const J1FPGA = { 1:'AVB_I2S1 · PIN_F1', 3:'AVB_I2S2 · PIN_E1', 5:'AVB_I2S3 · PIN_D2', 7:'AVB_I2S4 · PIN_C1', 9:'AVB_MCLK_IN · PIN_T1', 10:'AVB_SCLK_IN · PIN_T2', 12:'AVB_LRCLK_IN · PIN_J5' };
function dongleSVG(t){
  const R = run(), pk = pktAt(t), linked = D.cutAt==null || t < D.cutAt, act_ = pk && pk.kind && linked && Math.floor(t*12)%2===0;
  const S = 10, mm = v => v*S;
  const hdr = (x0, y0, rows, cols, id, pitch) => { let s=''; for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){ const pin = r*cols+c+1, x = mm(x0)+c*pitch+pitch/2, y = mm(y0)+r*pitch+pitch/2;
      const sel = id==='J1' && D.j1pin===pin;
      s += `<g ${id==='J1'?`class="j1p" data-p="${pin}" style="cursor:pointer"`:''}><title>${id} pin ${pin}${id==='J1'?': '+J1[pin]:''}</title><rect x="${x-pitch/2+1}" y="${y-pitch/2+1}" width="${pitch-2}" height="${pitch-2}" fill="${sel?'var(--accent)':'#1b1b1b'}"/><circle cx="${x}" cy="${y}" r="${pitch*0.22}" fill="#d9b44a"/></g>`; }
    return s; };
  let s = `<svg viewBox="-30 -30 760 470" style="width:100%;display:block" role="img" aria-label="WBS-AVB-DG board top view, to scale">
   <rect x="0" y="0" width="${mm(69)}" height="${mm(40)}" rx="8" fill="#1f5a32" stroke="#0e2d18" stroke-width="2"/>
   <g class="rj" style="cursor:pointer"><title>J21 RJ45 (embedded magnetics) to the LAN8710A PHY — click to ${linked?'unplug':'plug in'} the cable</title>
     <rect x="${mm(-1.5)}" y="${mm(11.8)}" width="${mm(27.5)}" height="${mm(16.9)}" rx="3" fill="#b9bcc0" stroke="#55585c" stroke-width="2"/>
     <rect x="${mm(-1.5)}" y="${mm(14.5)}" width="${mm(9)}" height="${mm(11.5)}" fill="#202224"/>
     <circle cx="${mm(3)}" cy="${mm(13.2)}" r="6" fill="${linked?'#4dff4a':'#203020'}"/><circle cx="${mm(3)}" cy="${mm(27.3)}" r="6" fill="${act_?'#ffc41f':'#302810'}"/>
     ${linked?`<rect x="${mm(-3)}" y="${mm(15.5)}" width="${mm(6)}" height="${mm(9.5)}" fill="#2b5f9e"/><rect x="-30" y="${mm(18)}" width="30" height="${mm(4.5)}" fill="#3a74b8"/>`:''}
     <text x="${mm(13)}" y="${mm(21)}" font-size="22" text-anchor="middle" fill="#2a2c2e">J21</text></g>
   <rect x="${mm(2.4)}" y="${mm(3.5)}" width="${mm(9.6)}" height="${mm(6.1)}" fill="none" stroke="#c9d6cc" stroke-dasharray="4 3"/><rect x="${mm(2.4)}" y="${mm(30.4)}" width="${mm(9.6)}" height="${mm(8.7)}" fill="none" stroke="#c9d6cc" stroke-dasharray="4 3"/>
   <g class="s1" style="cursor:pointer"><title>S1 reset switch — click to reboot the dongle</title><rect x="${mm(16)}" y="${mm(3.5)}" width="${mm(5.5)}" height="${mm(3.5)}" fill="#d0d2d4" stroke="#333"/><rect x="${mm(17.7)}" y="${mm(4.4)}" width="${mm(2.1)}" height="${mm(1.7)}" fill="#333"/><text x="${mm(18.7)}" y="${mm(9.8)}" font-size="20" text-anchor="middle" fill="#e8efe9">S1</text></g>
   ${hdr(44,2.6,2,1,'J4',26)}<text x="${mm(45.3)}" y="${mm(10.5)}" font-size="18" text-anchor="middle" fill="#e8efe9">J4 +5V</text>
   <g><title>J5 mini-USB (power in)</title><rect x="${mm(61)}" y="${mm(3.5)}" width="${mm(8.5)}" height="${mm(7.8)}" fill="#b9bcc0" stroke="#555"/><text x="${mm(65)}" y="${mm(8.3)}" font-size="18" text-anchor="middle" fill="#333">J5</text></g>
   ${hdr(57.9,13.6,6,2,'J1',21)}<text x="${mm(60.1)}" y="${mm(12.8)}" font-size="18" text-anchor="middle" fill="#e8efe9">J1</text>
   ${hdr(63.1,13.6,6,2,'J2',21)}<text x="${mm(65.3)}" y="${mm(12.8)}" font-size="18" text-anchor="middle" fill="#e8efe9">J2</text>
   ${hdr(45.6,27.8,2,4,'J14',21)}<text x="${mm(49.8)}" y="${mm(35.4)}" font-size="18" text-anchor="middle" fill="#e8efe9">J14 XTAG</text>
   ${hdr(66.3,28.7,5,1,'J3',21)}<text x="${mm(64.6)}" y="${mm(38.6)}" font-size="16" text-anchor="end" fill="#e8efe9">J3 ICSP</text>
   ${hdr(14.2,36.5,1,2,'J9',26)}<text x="${mm(23)}" y="${mm(38.6)}" font-size="16" fill="#e8efe9">J9 PoE</text>
   <g font-size="14" fill="#c9d6cc"><text x="${mm(28.5)}" y="${mm(17)}">On the board (D4U schematic, positions</text><text x="${mm(28.5)}" y="${mm(19.2)}">not shown in the quick-start drawing):</text><text x="${mm(28.5)}" y="${mm(22)}">XS1-L16 · LAN8710A · CS2300</text><text x="${mm(28.5)}" y="${mm(24.2)}">PIC32MX250F128C · AT25DF041A · 24LC128</text></g>
   <text x="0" y="${mm(40)+28}" font-size="16" fill="var(--ink2)">0</text><line x1="0" y1="${mm(40)+12}" x2="${mm(69)}" y2="${mm(40)+12}" stroke="var(--ink2)"/><text x="${mm(69)}" y="${mm(40)+28}" font-size="16" text-anchor="end" fill="var(--ink2)">69 mm (quick-start p.4)</text>
   <text x="${mm(69)+8}" y="${mm(20)}" font-size="16" fill="var(--ink2)" transform="rotate(90 ${mm(69)+8} ${mm(20)})">40 mm</text>
  </svg>`;
  return s;
}
function bindDongle(root){
  const rj = root.querySelector('.rj'); if (rj) rj.onclick = ()=>A.cut();
  const s1 = root.querySelector('.s1'); if (s1) s1.onclick = ()=>A.reboot();
  root.querySelectorAll('.j1p').forEach(g=> g.onclick = ()=>A.pin(g.dataset.p));
}
/* J1 pin at the playhead: the live level */
function j1Level(pin, t){
  if (pin===11) return 0; if ([2,4,6,8].includes(pin)) return 0;
  if (pin===9) return Math.floor(t*C.MCLK*2)%2; if (pin===10) return Math.floor(t*C.SCLK*2)%2;
  if (pin===12) return Math.floor(t*C.FS*2)%2;
  return sdataBit((pin-1)/2, Math.floor(t*C.SCLK));
}
/* I2S SDATA: MSB one SCLK after the LRCLK edge, 24 of 32 bits per half (i2s_master, 64 SCLK per word) */
function sdataBit(line, nb){
  const R = run(); const fr = Math.floor(nb/64), pos = nb%64, half = pos<32?0:1, idx = (pos%32)-1;
  if (idx<0 || idx>23) return 0;
  const t = fr/C.FS; if (!R.aud[slotAt(t)]) return 0;
  const ch = (line*2+half + D.mapShift)%8, k = Math.round((t-C.PRES)*C.FS);
  let v = Math.round(sampleOf(ch, k)*8388607); if (v<0) v += 1<<24;
  return (v >> (23-idx)) & 1;
}

/* AMS8-1A front panel on the real silk (assets cut for ams81.js; geometry from ams81.js GEO) */
const ASSET = 'siumulation-plugins/assets/';
const GEO = { meterX:[459,494,528.6,563.3,612.7,647.6,682,716.6], pairX:[476.6,546,630.2,699.3], segTop:14.7, segPitch:5.93,
  btnX:[801.5,846,890.5,935], btnY:[51.25,110.75], disp:{cx:1109.8, cy:51.8, w:183.2, h:49.5}, sel:{x:1040.5,y:111.2}, vol:{x:1179.1,y:111.2},
  jack:{x:1281.5,y:81.5,r:19.3}, screws:[[420,32],[420,131],[753.6,32],[753.6,131],[1082,111.2],[1109.8,111.2],[1137.7,111.2],[1226.1,81.5]], lensX:438.35, lensW:297 };
const XG = { 'Ω':[14,17,17,17,10,10,27] };
function dotText(text, x, y, pitch, on, off){ let s=''; for (let i=0;i<text.length;i++){ const ch=text[i], cx=x+i*pitch*6.2;
  if (XG[ch]){ const g=XG[ch], r=pitch*0.38; for (let row=0;row<7;row++) for (let col=0;col<5;col++){ const b=(g[row]>>(4-col))&1; s+=`<circle cx="${(cx+col*pitch).toFixed(1)}" cy="${(y+row*pitch).toFixed(1)}" r="${r.toFixed(2)}" fill="${b?on:off}"/>`; } }
  else s += SIM.dotMatrix(ch, cx, y, pitch, on, off); } return s; }
const SEGCOL = i => i<4 ? '#ff3b2f' : i<12 ? '#ffc41f' : '#4dff4a';
function amsText(){ return D.source==='ANALOG' ? '  AVB   ' : D.source==='AES110' ? '110'+OMEGA+'LoRo' : '75'+OMEGA+' LoRo'; }
function amsSVG(t){
  const d = GEO.disp, pitch = 3.0, x0 = d.cx - (8*6.2*pitch - pitch*1.2)/2, y0 = d.cy - 3*pitch;
  let s = `<svg viewBox="380 0 960 163" role="img" aria-label="AMS8-1A front panel (real silkscreen) showing the RD79 AVB source" style="width:100%;border-radius:6px;display:block">
    <defs><filter id="r79glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1707" height="163" rx="6" fill="#202326"/><rect x="${GEO.lensX}" y="0" width="${GEO.lensW}" height="163" fill="#0c0b0b"/>
    <image href="${ASSET}ams81-front-cut.png" width="1707" height="163" opacity=".55"/>`;
  for (let ch=0; ch<8; ch++){ const m = meterAt(ch, t), x = GEO.meterX[ch];
    for (let i=0;i<22;i++){ const y = GEO.segTop + i*GEO.segPitch - 2.1, fb = 22-i, lit = fb <= m.vu || fb === m.pk, col = lit ? SEGCOL(i) : '#1d1a17';
      s += `<rect x="${x-6.2}" y="${y}" width="5.4" height="4.2" rx=".8" fill="${col}"${lit?' filter="url(#r79glow)"':''}/><rect x="${x+0.8}" y="${y}" width="5.4" height="4.2" rx=".8" fill="${col}"/>`; } }
  s += `<image href="${ASSET}ams81-lens-white.png" x="${GEO.lensX}" y="0" width="${GEO.lensW}" height="163"/>
    <image href="${ASSET}ams81-front-green.png" width="1707" height="163"/><image href="${ASSET}ams81-front-white.png" width="1707" height="163"/>`;
  for (let k=0;k<4;k++) for (let r=0;r<2;r++){ const x=GEO.btnX[k], y=GEO.btnY[r], yel=r===1; s += `<rect x="${x-16.5}" y="${y-16.5}" width="33" height="33" rx="2.5" fill="#0c0d0e"/><rect x="${x-14}" y="${y-14}" width="28" height="28" rx="2" fill="${yel?'#e9d21c':'#3a3d41'}"/><rect x="${x-6}" y="${y-3.5}" width="12" height="7" rx="1" fill="${(!yel&&k===0)?'#ff3a4c':(yel?'#d8c64a':'#a9adb2')}"/>`; }
  s += `<rect x="${d.cx-d.w/2}" y="${d.cy-d.h/2}" width="${d.w}" height="${d.h}" rx="3" fill="#050605" stroke="#2a2d2f"/>
    <g filter="url(#r79glow)">${dotText(amsText(), x0, y0, pitch, 'var(--vfd)', 'rgba(140,200,90,.08)')}</g>`;
  [['sel',GEO.sel,'SELECT: left half = turn CCW, right half = turn CW (input source)'],['vol',GEO.vol,'VOLUME (not modelled here — see the AMS8-1A plugin)']].forEach(([id,k,tt])=>{
    s += `<g class="r79knob" data-k="${id}" style="cursor:pointer"><title>${tt}</title><circle cx="${k.x}" cy="${k.y}" r="30" fill="transparent"/><circle cx="${k.x}" cy="${k.y}" r="20.5" fill="#101112" stroke="#2c2f31" stroke-width="1.5"/><circle cx="${k.x}" cy="${k.y}" r="16" fill="#1b1c1e" stroke="#060606" stroke-width="2"/><circle cx="${k.x-5}" cy="${k.y-6}" r="6" fill="#3a3c40" opacity=".55"/></g>`; });
  s += GEO.screws.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5.5" fill="#56595c" stroke="#2a2c2e"/>`).join('');
  s += `<circle cx="${GEO.jack.x}" cy="${GEO.jack.y}" r="${GEO.jack.r-2}" fill="#7d8084" stroke="#3a3c3f" stroke-width="2"/><circle cx="${GEO.jack.x}" cy="${GEO.jack.y}" r="7" fill="#0b0b0b"/></svg>`;
  return s;
}
function bindAms(root){ root.querySelectorAll('.r79knob').forEach(g=> g.onclick = e=>{ if (g.dataset.k!=='sel') return; const r=g.getBoundingClientRect(); A.src((e.clientX-r.left)/r.width < 0.5 ? -1 : 1); }); }

/* the bench: talker/GM → bridge → dongle → AMS8, plus the AVDECC controller */
function benchSVG(t){
  const ro = roleAt(t), st = stAt(t), linked = D.cutAt==null || t<D.cutAt;
  const box = (x,y,w,h,cls,title,lines,on,tip)=>`<g class="${cls}" style="cursor:pointer"><title>${tip}</title><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${on?'color-mix(in srgb,var(--accent) 15%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="1.6"/><text x="${x+10}" y="${y+20}" font-size="13" font-weight="700" fill="var(--ink)">${title}</text>${lines.map((l,i)=>`<text x="${x+10}" y="${y+37+i*14}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`;
  return `<svg viewBox="0 0 760 200" style="width:100%">
    ${box(8,20,170,80,'bt','Talker + gPTP GM',[D.talker?'on: 8-ch 48 kHz class A':'off', D.talker?`media clock ${D.tppm>=0?'+':''}${D.tppm} ppm`:'', `priority1 ${C.GM_PRIO1} (inferred)`],D.talker,'Click to switch the talker / grandmaster on or off')}
    ${box(220,20,150,80,'bs',D.avbSw?'AVB bridge':'Plain switch',[D.avbSw?'gPTP, MSRP, Qav shaping':'drops 01-80-C2-00-00-0E','path delay '+D.pd+' ns'],D.avbSw,'Click to swap AVB bridge ↔ plain 802.1D switch')}
    ${box(410,20,170,80,'bd','WBS-AVB-DG “'+BUILDS[D.build].name+'”',['gPTP '+ro.role+(ro.lock?' · locked':''), 'media FIFO '+ST_NAMES[st], linked?'link up 100 Mb/s':'cable unplugged'],st===3,'The dongle (click the board drawing for RJ45 / S1)')}
    ${box(615,20,138,80,'bh',D.host,[D.host==='AMS8'?'FPGA backup18':'FPGA backup20', 'source '+(D.source==='ANALOG'?'AVB':D.source)],D.source==='ANALOG'&&st===3,'Click to switch host AMS8 ↔ MLC8 FPGA build')}
    ${box(220,128,250,60,'bc','AVDECC controller',[D.connected?'sink 0 ← talker stream 0 (connected)':'not connected', 'click to '+(D.connected?'disconnect':'connect')],D.connected,'Click: ACMP CONNECT_RX / DISCONNECT_RX')}
    <line x1="178" y1="60" x2="220" y2="60" stroke="var(--ink2)" stroke-width="2"/><line x1="370" y1="60" x2="410" y2="60" stroke="${linked?'var(--ink2)':'var(--bad)'}" stroke-width="2" ${linked?'':'stroke-dasharray="4 4"'}/>
    <line x1="580" y1="60" x2="615" y2="60" stroke="var(--accent2)" stroke-width="3"/><text x="582" y="52" font-size="9.5" fill="var(--ink2)">J1 I2S</text>
    <line x1="345" y1="128" x2="345" y2="100" stroke="var(--ink2)" stroke-dasharray="3 3"/><text x="350" y="118" font-size="10" fill="var(--ink2)">ACMP / ADP (1722.1)</text></svg>`;
}
function bindBench(root){ const m = {bt:()=>A.talker(), bs:()=>A.sw(), bh:()=>A.host(D.host==='AMS8'?'MLC8':'AMS8'), bc:()=>A.connect()}; for (const k in m){ const g=root.querySelector('.'+k); if (g) g.onclick=m[k]; } }

/* ================================================================
   THE 1722 PACKET AT THE PLAYHEAD
   ================================================================ */
function packetBytes(seq){
  const R = run(), dbc = (seq*6)&255, sn = (8-(dbc&7))&7, tv = sn<=5;
  const ts = tv ? w32((seq*6+sn)/R.fsT*1e9 + C.EPOCH*1e9 + R.n0*R.Tpkt*1e9 + 2e6) >>> 0 : 0;
  const b = [];
  b.push(0x91,0xE0,0xF0,0x00,0x12,0x34);            // DA: MAAP pool address (example, inferred)
  b.push(0x00,0x22,0x97,0x00,0x55,0x01);            // SA: talker MAC (example, inferred)
  b.push(0x81,0x00, (3<<5)|0, 0x02);                // 802.1Q TPID, PCP 3 (AVB_DEFAULT_PCP), VID 2 (AVB_DEFAULT_VID)
  b.push(0x22,0xF0);                                // AVB_1722_ETHERTYPE
  b.push(0x00, 0x80|(tv?1:0), seq&255, 0x00);       // subtype 0 (61883/IIDC), sv=1 version 0 tv; sequence_number; tu
  b.push(0x00,0x11,0x22,0x33,0x44,0x55,0x00,0x00);  // stream_id (example)
  b.push((ts>>>24)&255,(ts>>>16)&255,(ts>>>8)&255,ts&255);
  b.push(0,0,0,0);                                  // gateway_info
  b.push(0x00,0xC8);                                // packet_data_length 200 = 8 CIP + 6 × 8 × 4
  b.push((1<<6)|31, (0xA<<4)|0);                    // tag 1, channel 31, tcode 0xA, sy 0
  b.push(63, 8, 0, dbc, (2<<6)|0x10, 0x02, 0xFF, 0xFF); // CIP: SID 63, DBS 8 (inferred = channels), FN/QPC/SPH 0, DBC, EOH2|FMT 0x10, FDF 2, SYT 0xFFFF
  const smp = [];
  for (let k=0;k<6;k++) for (let ch=0;ch<8;ch++){ let v = Math.round(sampleOf(ch, seq*6+k)*8388607); if (v<0) v += 1<<24; smp.push(v); b.push(0x40, (v>>16)&255, (v>>8)&255, v&255); }  // MBLA_24BIT label 0x40
  return { b, dbc, sn, tv, ts, smp };
}
function packetHTML(t){
  const p = pktAt(t);
  if (!p || !p.kind) return `<p class="muted">No 1722 packet near the playhead. ${!D.connected?'The stream is not connected (controller).':!D.avbSw?'A plain switch blocks MSRP, so the talker never starts.':!D.talker?'The talker is off.':D.cutAt!=null&&t>=D.cutAt?'The cable is unplugged.':'The stream starts at '+SIM.fmtT(run().pt0)+' after power-up.'}</p>`;
  const P = packetBytes(p.seq);
  const lost = p.kind===2;
  const cls = i => i<18?'MAC/VLAN':i<42?'AVTP':i<50?'CIP':'payload';
  const col = {'MAC/VLAN':'var(--ink2)','AVTP':'var(--accent2)','CIP':'var(--warn)','payload':'var(--accent)'};
  const dump = P.b.slice(0,74).map((v,i)=>`<span style="color:${col[cls(i)]}" title="byte ${i} · ${cls(i)}">${hex2(v)}</span>`).join(' ');
  return `${kv([
    ['Packet', `slot ${p.n.toLocaleString()} · stream packet #${p.seq.toLocaleString()} · arrives ${SIM.fmtT(p.t)} ${lost?'<b style="color:var(--bad)">LOST on the wire</b>':''}`, 1],
    ['Frame on the wire', `${C.WIRE_BYTES} bytes incl. preamble/IFG = ${SIM.fmtDur(C.WIRE_T)} at 100 Mb/s · ${(C.WIRE_BYTES*8*8000/1e6).toFixed(2)} Mb/s for the stream`, 1],
    ['sequence_number', `${p.seq & 255}`, 1],
    ['DBC (data block count)', `${P.dbc} = 6 × seq mod 256 · dbc_diff = 6 → num_channels = 48 / 6 = 8`, 1],
    ['tv / avtp_timestamp', P.tv ? `tv = 1 · 0x${(P.ts>>>0).toString(16).toUpperCase().padStart(8,'0')} = presentation time of sample ${P.sn} (index = (8 − DBC % 8) % 8, SYT_INTERVAL 8)` : 'tv = 0 — no sample with DBC % 8 = 0 in this packet (1 packet in 4 at 48 kHz)', 1],
    ['packet_data_length', '200 → num_samples_in_payload = (200 − 8) >> 2 = 48 (6 per channel)', 1],
    ['Sample 0, ch 1..8', P.smp.slice(0,8).map(v=>'0x'+v.toString(16).toUpperCase().padStart(6,'0')).join(' '), 1],
  ])}<div class="small mono" style="margin-top:6px;line-height:1.7;word-break:break-all">${dump} …</div>
  <p class="small muted">Colours: MAC + 802.1Q · AVTP header (24 B) · 61883-6 CIP (8 B) · AM824 payload (0x40 label + 24 bits). Field values are the defaults in <span class="mono">avb_1722_def.h</span>; MAC addresses and stream ID are examples (${inf}).</p>`;
}

/* ================================================================
   TIMELINE LANES (shown second = D.sec … D.sec+1 of the run from power-up)
   ================================================================ */
const off = () => D.sec;
function ticks(c, X, t0, t1, y, h, list, colFn, lblFn){
  const a = t0+off(), b = t1+off(); let n = 0, lastX = -99;
  c.font = '10px '+SIM.css('--sans');
  for (const e of list){ if (e.t < a || e.t > b) continue; n++; const x = X(e.t-off()); c.fillStyle = colFn(e); c.fillRect(x, y+4, 2, h-8);
    const l = lblFn && lblFn(e); if (l && x-lastX > c.measureText(l).width+8){ c.fillStyle = SIM.css('--ink'); c.fillText(l, x+4, y+h/2+3); lastX = x; } }
  return n;
}
function bandLane(c, X, t0, t1, y, h, valFn, colFn, lblFn){
  const x0 = X(t0), x1 = X(t1), W = Math.max(1, Math.round(x1-x0)); let prev = null, start = x0;
  const flush = (xe)=>{ if (prev==null) return; c.fillStyle = colFn(prev); c.globalAlpha = .7; c.fillRect(start, y+4, Math.max(1,xe-start), h-8); c.globalAlpha = 1;
    const l = lblFn(prev); c.font='10.5px '+SIM.css('--sans'); if (l && xe-start > c.measureText(l).width+8){ c.fillStyle = '#fff'; c.fillText(l, start+4, y+h/2+3); } };
  for (let i=0;i<=W;i++){ const x = x0+i, t = t0 + (t1-t0)*i/W; const v = valFn(t+off()); if (v !== prev){ flush(x); prev = v; start = x; } }
  flush(x1);
}
function valueLane(c, X, t0, t1, y, h, fn, lo, hi, col, fmtL){
  const x0 = X(t0), x1 = X(t1), W = Math.max(1, Math.round(x1-x0));
  c.strokeStyle = SIM.css('--grid'); c.beginPath(); c.moveTo(x0, y+h/2); c.lineTo(x1, y+h/2); c.stroke();
  c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath();
  for (let i=0;i<=W;i++){ const t = t0+(t1-t0)*i/W, v = fn(t+off()); const yy = y+h-3-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(h-6); i?c.lineTo(x0+i,yy):c.moveTo(x0,yy); }
  c.stroke(); c.lineWidth = 1;
  c.fillStyle = SIM.css('--ink2'); c.font = '10px '+SIM.css('--mono'); c.fillText(fmtL(fn(SIM.t+off())), x1-150, y+11);
}
function packetLane(c, X, t0, t1, y, h){
  const R = run(), a = t0+off(), b = t1+off(); const n0 = Math.max(R.n0, Math.floor(a/R.Tpkt)), n1 = Math.min(R.N-1, Math.ceil(b/R.Tpkt));
  if (n1 < n0){ laneText(c, X, t0, y, h, R.n0===Infinity ? 'no stream (see the state inspector)' : 'stream starts at '+SIM.fmtT(R.pt0)); return; }
  const px = X(t0+R.Tpkt)-X(t0);
  if (px < 3){
    let ok=0, lost=0; for (let n=n0;n<=n1;n++){ if (R.pk[n]===2){ lost++; c.fillStyle=SIM.css('--bad'); c.fillRect(X(n*R.Tpkt-off()), y+2, 2, h-4); } else if (R.pk[n]) ok++; }
    c.fillStyle = SIM.css('--accent'); c.globalAlpha=.35; c.fillRect(X(n0*R.Tpkt-off()), y+h*0.3, X(n1*R.Tpkt-off())-X(n0*R.Tpkt-off()), h*0.4); c.globalAlpha=1;
    c.fillStyle = SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`${ok.toLocaleString()} packets (every ${SIM.fmtDur(R.Tpkt)})${lost?` · ${lost} lost`:''}`, X(n0*R.Tpkt-off())+6, y+h/2+4); return;
  }
  for (let n=n0;n<=n1;n++){ const k = R.pk[n]; if (!k) continue; const ta = n*R.Tpkt-off();
    c.fillStyle = k===2 ? SIM.css('--bad') : k===3 ? SIM.css('--accent') : SIM.css('--accent2');
    c.fillRect(X(ta-C.WIRE_T), y+4, Math.max(2, X(ta)-X(ta-C.WIRE_T)), h-8);
    if (px > 60){ c.fillStyle = SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(`#${n-R.n0} dbc ${((n-R.n0)*6)&255}${k===3?' tv':''}${k===2?' LOST':''}`, X(ta)+3, y+h/2+3); } }
}
function lanesMain(){
  const R = run();
  const L = [
    { label:'gPTP messages (▲ rx · ▽ tx)', h:28, draw(c,X,t0,t1,y,h){ ticks(c,X,t0,t1,y,h,R.ptpEv, e=> e.d==='rx'? (e.k==='Sync'||e.k==='Follow_Up'?SIM.css('--accent'):SIM.css('--accent2')) : SIM.css('--warn'), e=> (e.d==='rx'?'▲':'▽')+e.k); } },
    { label:'gPTP role · sync_lock', h:24, draw(c,X,t0,t1,y,h){ bandLane(c,X,t0,t1,y,h, t=>{ const r=roleAt(t); return r.role+(r.lock?' · locked':''); }, v=> v.startsWith('SLAVE')? (v.includes('locked')?SIM.css('--accent'):SIM.css('--accent2')) : SIM.css('--warn'), v=>'PTP_'+v); } },
    { label:'ACMP · MSRP · ADP · MRP', h:24, draw(c,X,t0,t1,y,h){ ticks(c,X,t0,t1,y,h,R.srp, e=> e.minor?SIM.css('--ink2'):SIM.css('--accent2'), e=> e.s.split(/[ (:→]/)[0]+' '+(e.s.split(' ')[1]||'')); } },
    { label:'1722 packets in (8 kHz, class A)', h:28, draw:packetLane },
    { label:'Listener: chan_lock → rate', h:22, draw(c,X,t0,t1,y,h){ bandLane(c,X,t0,t1,y,h, t=> t < R.pt0 ? 0 : (R.chanLockAt==null || t < R.chanLockAt) ? 1 : 2, v=>[SIM.css('--grid'),SIM.css('--warn'),SIM.css('--accent')][v], v=>['','counting 16 packets', `${R.ncp||8} ch × ${R.rateHz/1000} kHz`][v]); } },
    { label:'Media output FIFO state', h:24, draw(c,X,t0,t1,y,h){ bandLane(c,X,t0,t1,y,h, t=>stAt(t), v=>ST_COL()[v], v=>ST_NAMES[v]); } },
    { label:'FIFO fill (0–320 samples)', h:34, draw(c,X,t0,t1,y,h){ valueLane(c,X,t0,t1,y,h, t=>R.fill[slotAt(t)], 0, 320, SIM.css('--accent2'), v=>`fill ${v} samples`); } },
    { label:'manage_buffer(): sample_diff', h:30, draw(c,X,t0,t1,y,h){ const a=t0+off(), b=t1+off(); let k=0, lastX=-99; c.font='10px '+SIM.css('--mono');
        for (const e of R.notes){ if (e.t<a||e.t>b) continue; k++; const x=X(e.t-off()); const big=Math.abs(e.sd)>24; const yy = y+h/2 - Math.max(-1,Math.min(1,e.sd/30))*(h/2-4);
          c.fillStyle = e.act.startsWith('BUF_CTL_RESET')?SIM.css('--bad'): e.act.startsWith('BUF_CTL_ADJ')?SIM.css('--accent'): big?SIM.css('--warn'):SIM.css('--ink2'); c.fillRect(x-1.5, yy-1.5, 3, 3);
          if (e.act!=='BUF_CTL_ACK' && x-lastX>80){ c.fillText(e.act.replace('BUF_CTL_',''), x+4, y+10); lastX=x; } }
        if (!k) laneText(c,X,t0,y,h,'no manage_buffer() call in this window (one every ≈5.3 ms while a stream is locking or locked)'); } },
    { label:'Recovered word clock (ppm)', h:30, draw(c,X,t0,t1,y,h){ const lim = Math.max(5, Math.abs(D.lppm)+Math.abs(D.tppm)+5, D.loss?1200:0); valueLane(c,X,t0,t1,y,h, t=>R.ppm[slotAt(t)], -lim, lim, SIM.css('--warn'), v=>`${v>=0?'+':''}${v.toFixed(2)} ppm vs 48 kHz`); } },
    { label:'I2S LRCLK (J1-12) 48 kHz', h:22, draw(c,X,t0,t1,y,h){ bitsLane(c,tt=>X(tt-off()),t0+off(),t1+off(),y,h,1/96000, n=>n%2, SIM.css('--ink'), 'LRCLK'); } },
    { label:'I2S SCLK (J1-10) 3.072 MHz', h:22, draw(c,X,t0,t1,y,h){ bitsLane(c,tt=>X(tt-off()),t0+off(),t1+off(),y,h,1/(2*C.SCLK), n=>n%2, SIM.css('--ink2'), 'SCLK'); } },
    { label:'J1-1 SDATA (AVB ch 1/2)', h:22, draw(c,X,t0,t1,y,h){ const T=1/C.SCLK; if (X(t0+T)-X(t0) < 2){ laneText(c,X,t0,y,h, `24-bit words, MSB first, 64 SCLK per frame — zoom to ≤ 100 µs to see bits`); return; } bitsLane(c,tt=>X(tt-off()),t0+off(),t1+off(),y,h,T, n=>sdataBit(0,n), SIM.css('--accent'), ''); } },
    { label:'SYNC_OUT → CS2300 (480 Hz)', h:22, draw(c,X,t0,t1,y,h){ bitsLane(c,tt=>X(tt-off()),t0+off(),t1+off(),y,h,1/(2*C.SYNC_OUT), n=>n%2, SIM.css('--accent2'), 'sync'); } },
    { label: D.host==='MLC8' ? 'FPGA avbfifo fill (16 × 64 bit)' : 'FPGA (backup18): i2s_2_aes3', h:30, draw(c,X,t0,t1,y,h){
        if (D.host!=='MLC8'){ laneText(c,X,t0,y,h,'AVB I2S → AES3 encoders → aes_input_router (no dual-clock FIFO in backup18)'); return; }
        valueLane(c,X,t0,t1,y,h, t=>fpgaFill(t), 0, 16, SIM.css('--accent'), v=>`${v.toFixed(1)} of 16 words`); } },
    { label:'AMS8 meter CH1 (VU, dB)', h:30, draw(c,X,t0,t1,y,h){ valueLane(c,X,t0,t1,y,h, t=>{ const m=meterAt(0, t); return Math.max(-60, m.vuDb); }, -60, 0, SIM.css('--accent'), v=>`${v.toFixed(1)} dB`); } },
  ];
  return L;
}
/* FPGA dual-clock FIFO (avbfifo, 16 words): written at the AVB LRCLK, read at the monitor clock.
   wrreq = NOT wrfull, rdreq = NOT rdempty (avb_i2s_resampler.bdf) → on a slip it skips or repeats a word.
   Read clock = monitor house clock — which clock really reads it is INFERRED (see Findings). */
function fpgaFill(t){ const d = D.monPpm*1e-6*C.FS*t; let f = 8 - d; f = ((f % 16) + 16) % 16; return f; }

/* ================================================================
   VIEWS
   ================================================================ */
function ctlHTML(){
  const sel = (a, cur, opts) => `<select data-sel="${a}">${opts.map(([v,l])=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px">
    <label>Snapshot ${sel('build', D.build, Object.keys(BUILDS).map(k=>[k, k+' “'+BUILDS[k].name+'”']))}</label>
    <label>Host ${sel('host', D.host, [['AMS8','AMS8 (FPGA backup18)'],['MLC8','MLC8 (FPGA backup20)']])}</label>
    <label>Dongle crystal ${sel('lppm', D.lppm, [[-100,'−100 ppm'],[-30,'−30 ppm'],[0,'0 ppm'],[50,'+50 ppm']])}</label>
    <label>Talker media clock ${sel('tppm', D.tppm, [[-50,'−50 ppm'],[0,'0 ppm (locked to GM)'],[25,'+25 ppm']])}</label>
    <label>Loss ${sel('loss', D.loss, [[0,'0 %'],[0.01,'0.01 %'],[0.1,'0.1 %'],[1,'1 %']])}</label>
    <label>Path delay ${sel('pd', D.pd, [[100,'100 ns'],[600,'600 ns'],[5000,'5 µs']])}</label>
    ${D.host==='MLC8'?`<label>Monitor clock ${sel('mon', D.monPpm, [[0,'0 ppm'],[5,'+5 ppm'],[20,'+20 ppm'],[100,'+100 ppm']])}</label>`:''}
    <button data-a="chan">CHAN_SEL (virtual)</button><button data-a="remote">REMOTE_SEL (virtual)</button><button data-a="rst">Bench defaults</button></div>`;
}
function bindCtl(root){
  root.querySelectorAll('[data-sel]').forEach(s=> s.onchange = ()=>{ const v=s.value, k=s.dataset.sel; ({build:A.build, host:A.host, lppm:A.lppm, tppm:A.tppm, loss:A.loss, pd:A.pd, mon:A.mon})[k](v); });
  bindActs(root, { chan:()=>A.chanSel(), remote:()=>A.remoteSel(), rst:()=>reset(), sec:v=>A.sec(v) });
}
function secHTML(){ return `<div class="small" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">Second shown (from power-up): ${[0,1,2,3,11].map(s=>`<button data-a="sec" data-v="${s}" class="${D.sec===s?'on':''}">${s===11?'11–12 s (steady)':s+'–'+(s+1)+' s'}</button>`).join('')} <span class="muted">· playhead = ${SIM.fmtT(tAbs())} after power-up</span></div>`; }
function inspHTML(t){
  const R = run(), ro = roleAt(t), st = stAt(t), n = slotAt(t), nt = lastBefore(R.notes, t), adj = lastBefore(R.adjHist, t), pd = lastBefore(R.pdHist, t), ck = lastBefore(R.clk, t);
  return kv([
    ['Entity (ADP/AEM)', `“${BUILDS[D.build].name}” · vendor WBS · model WBS-AVB-DG · fw 1.00`, 1],
    ['gPTP', `ptp_state = PTP_${ro.role}${ro.lock?' · sync_lock':''} · g_ptp_adjust ${adj? adj.adj+' ('+adj.ppm.toFixed(3)+' ppm)':'0'} · ptp_path_delay ${pd? pd.pd+' ns':'not valid'}`, 1],
    ['Stream', R.pt0===Infinity ? 'none' : `from ${SIM.fmtT(R.pt0)} · ${R.chanLockAt!=null && t>=R.chanLockAt ? `${R.ncp} ch, ${R.rateHz} Hz (chan_lock 16)` : 'chan_lock counting'}`, 1],
    ['Media output FIFO', `${ST_NAMES[st]} · fill ${R.fill[n]} / 320 · zero_flag ${R.aud[n]?0:1}`, 1],
    ['Last manage_buffer()', nt? `${SIM.fmtT(nt.t)} · sample_diff ${nt.sd} · stability_count ${nt.stab} · lock_count ${nt.lc} · ${nt.act}` : '—', 1],
    ['Media clock', ck? `wordlen ${ck.wordlen.toLocaleString()} (2^-24 ticks) → ${(ck.ext/65536).toFixed(5)} ticks/word · ${ck.ppm>=0?'+':''}${ck.ppm.toFixed(3)} ppm · ${ck.what}` : `nominal ${R.wordNom.toLocaleString()}`, 1],
    ['Clocks out', `MCLK ${(C.MCLK*(1+R.ppm[n]*1e-6)/1e6).toFixed(6)} MHz · SCLK 3.072 MHz · LRCLK ${(48000*(1+R.ppm[n]*1e-6)).toFixed(3)} Hz`, 1],
    ['AMS8 display', `“${amsText()}”${D.source==='ANALOG'?' (//Avb-Add)':''} · meters ${D.source==='ANALOG'&&R.aud[n]?'AVB ch '+(1+D.mapShift)+'–'+(((D.mapShift+7)%8)+1):'no AVB audio'}`, 1],
  ]);
}
function msgsHTML(t){ const L = run().msgs.filter(m=>m.t<=t).slice(-14).reverse(); return L.map(m=>`<div><span class="muted">${SIM.fmtT(m.t)}</span> ${m.s} <span class="muted">(${m.src})</span></div>`).join('') || '<div class="muted">No console output yet.</div>'; }

function viewSim(m){
  window.__rd79Active = false;
  m.innerHTML = `<div class="grid2"><div>
      ${card('The bench — click the boxes', `<div id="bench"></div>${ctlHTML()}`)}
      ${card('WBS-AVB-DG board, to scale — click J21 (cable), S1 (reset) or a J1 pin', `<div id="dg"></div><div id="j1" class="small mono" style="margin-top:6px"></div>`)}
      ${card('Host: AMS8-1A front panel (real silk) — turn SELECT to pick the AVB input', `<div id="ams"></div>`)}
    </div><div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
      ${card('Console (simple_printf / printstr from the reference code)', `<div id="msgs" class="log"></div>`)}
      ${card('Action log', `<div id="log" class="log"></div>`)}
    </div></div>
    ${card('Timeline — one second of the run from power-up, zoomable (click to seek)', `<div id="secs"></div><canvas id="tl"></canvas>
      <p class="small muted">The model runs the reference code from power-up: gPTP <span class="mono">update_adjust()</span>, the listener's <span class="mono">chan_lock</span>, the output FIFO states, <span class="mono">manage_buffer()</span> and <span class="mono">update_media_clock()</span>. When the controller connects (${SIM.fmtT(C.T_CONNECT)}), when MSRP declares (${SIM.fmtT(C.T_SRP)}), when the grandmaster's first Announce lands (${SIM.fmtT(C.T_ANN0)}) and its time-of-day are ${inf}. The talker's test content (1 kHz −20 dBFS on 1/2, programme on 3–8) is ${inf}.</p>`)}
    ${card('Scope: the IEEE 1722 / 61883-6 packet at the playhead', `<div id="pkt"></div>`)}`;
  const draw = ()=>{
    const t = tAbs();
    m.querySelector('#bench').innerHTML = benchSVG(t); bindBench(m.querySelector('#bench'));
    m.querySelector('#dg').innerHTML = dongleSVG(t); bindDongle(m.querySelector('#dg'));
    const p = D.j1pin; m.querySelector('#j1').innerHTML = `J1-${p} ${J1[p]} · XMOS ${J1NET[p]||'—'} · FPGA ${J1FPGA[p]||'not connected ('+'inferred'+')'} · level now ${j1Level(p,t)}`;
    m.querySelector('#ams').innerHTML = amsSVG(t); bindAms(m.querySelector('#ams'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = inspHTML(t);
    m.querySelector('#msgs').innerHTML = msgsHTML(t);
    m.querySelector('#log').innerHTML = logHTML();
    m.querySelector('#secs').innerHTML = secHTML(); bindActs(m.querySelector('#secs'), {sec:v=>A.sec(v)});
    SIM.drawLanes(m.querySelector('#tl'), lanesMain(), {labelW:200});
    m.querySelector('#pkt').innerHTML = packetHTML(t);
  };
  bindCtl(m);
  SIM.on('time', draw);
}

/* ================================================================
   TUTORIAL — the evaluation as an engineer ran it
   ================================================================ */
const tutor = { i:0 };
const atPlay = () => tAbs();
const LESSONS = [
  { title:'The bench', auto:true, check:()=>true, body:`<p>Spring ${Y(2014)}. RD63 has picked XMOS over FPGA IP. On the bench: a DSP4YOU <b>AVB-DG</b> dongle (bought as a ready XMOS XS1-L16 module), an <b>AVB bridge</b>, a talker that is also the <b>gPTP grandmaster</b>, an AVDECC controller on a PC, and an <b>AMS8-1A</b> whose FPGA takes the dongle's I2S on header J1.</p>
    <p>The question RD79 had to answer: <i>can an AMS8 or MLC8 listen to 8 channels of AVB with this module, and what does the monitor have to change?</i></p>
    <p class="muted">The right-hand panel is the live bench. Every tab of this plugin runs the same model.</p>` },
  { title:'1 · Pick and flash a firmware snapshot', check:()=>D.build==='backup3', hint:'Choose snapshot backup3 “AMS8” in the controls.',
    body:`<p>The XMOS work is the DSP4YOU workspace of 14 June 2013 with the board renamed <span class="mono">WBS-AVB-DG</span>. Three snapshots exist; only the 1722.1 entity name differs: “WBS AVB Dongle” (3 Mar), “MLC8” (20 Mar), “AMS8” (21 Mar 2014).</p><p><b>Goal:</b> flash <b>backup3 “AMS8”</b> — the one meant for the AMS8 host.</p>` },
  { title:'2 · Cable it through an AVB bridge', check:()=>D.cutAt==null && D.avbSw && D.talker, hint:'The cable must be in J21, the bridge must be the AVB one and the talker on (click the boxes).',
    body:`<p>Plug the dongle's RJ45 (J21, 10/100 LAN8710A PHY) into the <b>AVB bridge</b>, with the talker on. AVB only works end-to-end through 802.1AS/Qat/Qav bridges.</p><p><b>Goal:</b> link up, AVB bridge, talker on.</p>` },
  { title:'3 · Watch gPTP pick a master', check:()=>roleAt(atPlay()).role==='SLAVE', hint:`Second 0–1 s: drag the playhead past ${C.T_ANN0*1000} ms.`,
    body:`<p>At reset <span class="mono">gptp.c</span> starts as <span class="mono">PTP_MASTER</span> and sends its own Sync every 125 ms. When the grandmaster's Announce arrives, <span class="mono">bmca_update_roles()</span> compares priority1 (theirs ${C.GM_PRIO1} ${inf}, ours 250) and calls <span class="mono">set_new_role(PTP_SLAVE)</span>.</p><p>From then every Sync/Follow_Up pair feeds <span class="mono">update_adjust()</span>: the dongle's 25 MHz crystal error appears as <span class="mono">g_ptp_adjust</span> (≈ +30 ppm on this bench).</p><p><b>Goal:</b> put the playhead where the dongle is a gPTP slave.</p>` },
  { title:'4 · Connect the stream', check:()=>D.connected && !D.toggleRemote, hint:'Click the AVDECC controller box (it toggles connect / disconnect). If REMOTE_SEL was pressed, press it again.',
    body:`<p>The built-in demo controller only auto-connects XMOS talkers to XMOS listeners. A third-party talker needs an AVDECC controller to send <b>ACMP CONNECT_RX</b>. <span class="mono">avb_listener_on_talker_connect()</span> sees a non-XMOS GUID, sets the sink to 8 channels and <span class="mono">AVB_SINK_STATE_POTENTIAL</span>, and MSRP declares Listener Ready.</p><p><b>Goal:</b> the stream is connected.</p>` },
  { title:'5 · The listener works out the format', check:()=>{ const R=run(); return R.chanLockAt!=null && atPlay()>=R.chanLockAt; }, hint:'Move the playhead past the end of the orange “counting 16 packets” band in second 0.',
    body:`<p>The listener is not told the channel count or rate. <span class="mono">avb_1722_listener_process_packet()</span> divides the previous packet's sample count by the DBC step (48 / 6 = 8 channels) and, after 16 packets, divides again to get 6 samples per packet per channel → <b>48 000 Hz</b>. No audio is pushed during those 2 ms.</p><p><b>Goal:</b> playhead after <span class="mono">chan_lock</span> reached 16.</p>` },
  { title:'6 · Lock the media output FIFO', check:()=>stAt(atPlay())===3, hint:'Look at the “Media output FIFO state” lane in second 0; move to where it turns LOCKED (≈ 0.6 s).',
    body:`<p>The 320-sample FIFO is zeroed, then started half full (LOCKING). Every ≈250 samples <span class="mono">manage_buffer()</span> compares when a time-stamped sample really leaves the I2S port with its presentation time (capture + 2 ms) and gets <span class="mono">sample_diff</span>.</p><p>Watch the console: until the dongle has a gPTP reference, <span class="mono">sample_diff</span> is a stable but meaningless ~−35 000 samples, so the code resets with “compensation too large”. Once it is a slave with a reference, 33 steady readings give <span class="mono">BUF_CTL_ADJUST_FILL</span> — “locked: 72 samples shorter” — and the audio is unmuted.</p><p><b>Goal:</b> playhead in LOCKED.</p>` },
  { title:'7 · Read a packet', check:()=>{ const p=pktAt(atPlay()); return p && p.kind===1; }, hint:'Zoom to 1 ms, then use the 125 µs step until the packet card shows tv = 0.',
    body:`<p>Zoom in on the 1722 lane. Each 125 µs packet carries 6 samples × 8 channels in AM824 quadlets. Only packets that contain a sample with DBC % 8 = 0 carry a timestamp (SYT_INTERVAL 8), so <b>one packet in four has tv = 0</b>.</p><p><b>Goal:</b> stop on a packet with tv = 0.</p>` },
  { title:'8 · Clock recovery against a bad crystal', check:()=>D.lppm<=-100 && D.sec>=1, hint:'Set the dongle crystal to −100 ppm and view second 1–2 or later.',
    body:`<p>The word clock the dongle outputs comes from the CS2300 PLL, driven by <span class="mono">SYNC_OUT</span> at 480 Hz from <span class="mono">media_clock_server</span>. Once locked, <span class="mono">update_media_clock()</span> runs every 2<sup>21</sup> ticks (21 ms): a PI loop on the presentation-time error (Kp 32, Ki ¼) adjusts <span class="mono">wordlen</span>.</p><p><b>Goal:</b> set the crystal to −100 ppm and look at a later second: the word-clock lane starts at −100 ppm and is pulled to within a few ppm.</p>` },
  { title:'9 · Try a plain switch', check:()=>!D.avbSw, hint:'Click the bridge box to swap it for a plain switch.',
    body:`<p>RD63's reading warned that a non-AVB bridge breaks the guarantees. Swap the bridge for a plain switch: gPTP and MSRP use link-local multicast that an 802.1D switch does not forward, so the dongle stays gPTP master, the talker never sees Listener Ready, and no stream flows.</p><p><b>Goal:</b> plain switch in place (then put the AVB bridge back).</p>` },
  { title:'10 · Packet loss', check:()=>D.avbSw && D.loss>=0.1, hint:'AVB bridge back, then loss 0.1 % or 1 %.',
    body:`<p>With the AVB bridge back, set packet loss to 0.1 %. Every lost packet makes the following samples come out 6 samples early. <span class="mono">manage_buffer()</span> sees that as a timing error and the clock-recovery loop slows the word clock — by about 1000 ppm on average at 0.1 % loss. The code has no way to tell a lost packet from a slow clock.</p><p><b>Goal:</b> AVB bridge and ≥ 0.1 % loss. Look at the word-clock lane in second 2–3.</p>` },
  { title:'11 · Listen on the AMS8', check:()=>D.source==='ANALOG' && D.loss===0, hint:'Set loss back to 0 %, then turn the AMS8 SELECT knob until the display reads AVB.',
    body:`<p>The AMS8 front panel firmware (<span class="mono">v200w.c</span>) got just two <span class="mono">//Avb-Add</span> blocks: the <i>Analog</i> source is renamed <b>AVB</b>. The FPGA takes the dongle's I2S where the analog input was. Meters CH1–CH8 now show the AVB channels through the SHARC ballistics.</p><p><b>Goal:</b> loss 0 % and the display reads <span class="mono">AVB</span>.</p>` },
  { title:'12 · The MLC8 build and the clock crossing', check:()=>D.host==='MLC8', hint:'Choose host MLC8 in the controls.',
    body:`<p>The monitor runs from its own clock; the dongle's word clock follows the network. The MLC8 FPGA build adds <span class="mono">avb_i2s_resampler</span>: four 16-word dual-clock FIFOs. Start one half full, and a 20 ppm mismatch slips it in 8 / (48 000 × 20 ppm) ≈ 8 s. That is why the same build also brings in AES receivers and the Altera sample-rate converter.</p><p><b>Goal:</b> host MLC8. Watch the FPGA FIFO lane.</p>` },
  { title:'Done — the decision', auto:true, check:()=>true, body:`<p>It worked on the bench, with a third-party module, the reference code almost unchanged, and a monitor FPGA that was never timing-closed. RD79 stayed at priority C. The network-audio input the //Avb-Add code created shipped later as <b>AES67</b> (RAVENNA, Archwave uNet, RD85) in the AMS8-1AN. See <b>Findings</b>.</p>` },
];
function viewTutorial(m){
  window.__rd79Active = false;
  tutorialView(m, LESSONS, tutor, { title:'Tutorial — evaluating the AVB listener (RD79)', panelTitle:'The bench at the playhead', reset:()=>{ reset({connected:false, build:'backup1', source:'AES75'}); SIM.seek(0); },
    panel(el){ const t=tAbs(); el.innerHTML = `${secHTML()}${benchSVG(t)}<canvas class="r79tl"></canvas>${dongleSVG(t)}${amsSVG(t)}${ctlHTML()}<div class="small" style="margin-top:6px">${inspHTML(t)}</div>`;
      const L = lanesMain(); SIM.drawLanes(el.querySelector('.r79tl'), [L[1],L[3],L[4],L[5],L[7],L[8]], {labelW:170});
      bindBench(el); bindDongle(el); bindAms(el); bindCtl(el); bindActs(el,{sec:v=>A.sec(v)}); } });
}

/* ================================================================
   ONE SECOND, AS THE DEVICE AND ITS DISPLAYS SEE IT
   ================================================================ */
const THREADS = [
  ['tile[0]','mii_rx_pins','receives every frame nibble by nibble (25 MHz MII)'],
  ['tile[0]','ethernet_filter','MAC/ethertype filter, hands frames to clients'],
  ['tile[0]','ethernet_rx_server','c_mac_rx[0..2]: PTP/media-clock, control (demo), 1722 listener'],
  ['tile[0]','mii_tx_pins','sends frames'],
  ['tile[0]','ethernet_tx_server','c_mac_tx[0..2]: PTP, control, 1722 talker'],
  ['tile[0]','demo() + avb_init()','select: control packets · 50 µs avb_periodic() + simple_demo_controller() · c_gpio_ctl'],
  ['tile[1]','media_clock_server + ptp','COMBINE_MEDIA_CLOCK_AND_PTP: gPTP, manage_buffer, update_media_clock, SYNC_OUT'],
  ['tile[1]','avb_1722_listener','avb_1722_listener_process_packet() per packet'],
  ['tile[1]','i2s_master','MCLK-clocked loop: 4 SDATA out + 4 in, 64 SCLK per word'],
  ['tile[1]','avb_1722_talker','enabled (AVB_DEMO_ENABLE_TALKER 1) but no source stream connected'],
  ['tile[1]','gpio_task','waits on PORT_BUTTONS = dummy port 4D — never fires'],
];
function threadLanes(){
  const R = run();
  const busy = (c,X,t0,t1,y,h,list,col,label) => { const a=t0+off(), b=t1+off(); let n=0, tot=0; c.fillStyle=col;
    for (const [s,e] of list){ if (e<a||s>b) continue; n++; tot+=e-s; c.fillRect(X(s-off()), y+5, Math.max(1, X(e-off())-X(s-off())), h-10); }
    if (!n) laneText(c,X,t0,y,h,label||'idle'); };
  const pk = (a,b,f) => { const L=[]; const n0=Math.max(R.n0, Math.floor(a/R.Tpkt)), n1=Math.min(R.N-1, Math.ceil(b/R.Tpkt)); if (n1-n0>4000) return null; for (let n=n0;n<=n1;n++) if (R.pk[n]===1||R.pk[n]===3) L.push(f(n*R.Tpkt)); return L; };
  const evs = (a,b,d,f) => R.ptpEv.filter(e=>e.d===d && e.t>=a-0.001 && e.t<=b).map(e=>f(e.t));
  const dense = (c,X,t0,t1,y,h,txt,all)=>{ const s = all ? t0 : Math.max(t0, Math.min(t1, R.pt0-off())); if (!all && s>=t1){ laneText(c,X,t0,y,h,'idle (no stream)'); return; } c.fillStyle=SIM.css('--accent2'); c.globalAlpha=.3; c.fillRect(X(s),y+6,X(t1)-X(s),h-12); c.globalAlpha=1; laneText(c,X,s,y,h,txt); };
  const mk = (i, fn) => ({ label: THREADS[i][0]+' '+THREADS[i][1], h:22, draw(c,X,t0,t1,y,h){ fn(c,X,t0,t1,y,h, t0+off(), t1+off()); } });
  return [
    mk(0,(c,X,t0,t1,y,h,a,b)=>{ const L=pk(a,b,t=>[t-C.WIRE_T,t]); if(!L) return dense(c,X,t0,t1,y,h,'8000 frames/s · '+SIM.fmtDur(C.WIRE_T)+' each ('+(C.WIRE_T*8000*100).toFixed(1)+' % busy)'); busy(c,X,t0,t1,y,h,L.concat(evs(a,b,'rx',t=>[t-0.6e-6,t])),SIM.css('--accent2')); }),
    mk(1,(c,X,t0,t1,y,h,a,b)=>{ const L=pk(a,b,t=>[t,t+1.5e-6]); if(!L) return dense(c,X,t0,t1,y,h,'one filter pass per frame (≈1.5 µs, inferred)'); busy(c,X,t0,t1,y,h,L,SIM.css('--accent2')); }),
    mk(2,(c,X,t0,t1,y,h,a,b)=>{ const L=pk(a,b,t=>[t+1.5e-6,t+3e-6]); if(!L) return dense(c,X,t0,t1,y,h,'queues frames to c_mac_rx[2] (listener)'); busy(c,X,t0,t1,y,h,L,SIM.css('--accent2')); }),
    mk(3,(c,X,t0,t1,y,h,a,b)=>busy(c,X,t0,t1,y,h,evs(a,b,'tx',t=>[t,t+0.7e-6]),SIM.css('--warn'),'idle (only gPTP / MRP / ADP frames go out)')),
    mk(4,(c,X,t0,t1,y,h,a,b)=>busy(c,X,t0,t1,y,h,evs(a,b,'tx',t=>[t-2e-6,t]),SIM.css('--warn'),'idle')),
    mk(5,(c,X,t0,t1,y,h,a,b)=>{ if ((b-a)/C.POLL_T > 3000) return dense(c,X,t0,t1,y,h,'avb_periodic() every 50 µs = 20 000 / s',true); const L=[]; for (let t=Math.ceil(a/C.POLL_T)*C.POLL_T; t<=b; t+=C.POLL_T) L.push([t,t+1.5e-6]); busy(c,X,t0,t1,y,h,L,SIM.css('--ink2')); }),
    mk(6,(c,X,t0,t1,y,h,a,b)=>{ const L=R.notes.filter(e=>e.t>=a&&e.t<=b).map(e=>[e.t,e.t+3e-6]).concat(evs(a,b,'rx',t=>[t,t+5e-6])).concat(R.clk.filter(e=>e.t>=a&&e.t<=b).map(e=>[e.t,e.t+4e-6]));
      if ((b-a) < 0.002){ for (let t=Math.ceil(a/C.PTP_PERIODIC)*C.PTP_PERIODIC; t<=b; t+=C.PTP_PERIODIC) L.push([t,t+1e-6]); for (let t=Math.ceil(a*1920)/1920; t<=b; t+=1/1920) L.push([t,t+0.5e-6]); }
      busy(c,X,t0,t1,y,h,L,SIM.css('--accent')); }),
    mk(7,(c,X,t0,t1,y,h,a,b)=>{ const L=pk(a,b,t=>[t+3e-6,t+7e-6]); if(!L) return dense(c,X,t0,t1,y,h,'8000 calls/s of avb_1722_listener_process_packet() (≈4 µs each, inferred)'); busy(c,X,t0,t1,y,h,L,SIM.css('--accent')); }),
    mk(8,(c,X,t0,t1,y,h)=>{ c.fillStyle=SIM.css('--accent'); c.globalAlpha=.45; c.fillRect(X(t0),y+5,X(t1)-X(t0),h-10); c.globalAlpha=1; laneText(c,X,t0,y,h,'always busy: one port write per 8 MCLK, pulls 8 samples per LRCLK','#fff'); }),
    mk(9,(c,X,t0,t1,y,h)=>laneText(c,X,t0,y,h,'blocked: no source stream (talker enabled in app_config.h)')),
    mk(10,(c,X,t0,t1,y,h)=>laneText(c,X,t0,y,h,'blocked on p_buttons when pinsneq — PORT_SHARED_IN is a dummy port')),
  ];
}
function presentSVG(t){
  const R = run(), p = pktAt(t);
  if (!p || !p.kind) return `<p class="muted">No packet at the playhead. ${R.pt0===Infinity?'There is no stream with this bench set-up.':'The stream starts '+SIM.fmtT(R.pt0)+' after power-up; move the playhead there, or choose the 11–12 s (steady) second.'}</p>`;
  const nt = lastBefore(R.notes, t), sd = nt ? nt.sd : 0;
  const k0 = p.seq*6, txLat = C.TX_LAT + 2*C.WIRE_T + D.pd*1e-9;
  const cap0 = p.t - txLat - 5/R.fsT, arr = p.t, pres = cap0 + C.PRES, out = pres + sd/C.FS;
  const t0 = cap0 - 0.0002, span = 0.0026, X = v => 40 + (v - t0)/span*680;
  const row = (y, a, b, col, lbl) => `<rect x="${X(a)}" y="${y}" width="${Math.max(2,X(b)-X(a))}" height="16" rx="3" fill="${col}" opacity=".75"/>${X(b)-X(a) > 250 ? `<text x="${X(a)+6}" y="${y+12}" font-size="11" fill="var(--ink)">${lbl}</text>` : X(b) > 420 ? `<text x="${X(a)-6}" y="${y+12}" font-size="11" text-anchor="end" fill="var(--ink)">${lbl}</text>` : `<text x="${X(b)+6}" y="${y+12}" font-size="11" fill="var(--ink)">${lbl}</text>`}`;
  return `<svg viewBox="0 0 760 170" style="width:100%">
    ${row(14, cap0, cap0+5/R.fsT, SIM.css('--accent2'), 'talker captures samples '+k0+'…'+(k0+5)+' ('+SIM.fmtDur(5/R.fsT)+')')}
    ${row(40, arr-C.WIRE_T, arr, SIM.css('--warn'), 'on the wire + bridge store-and-forward, arrives '+SIM.fmtDur(arr-cap0)+' after capture')}
    ${row(66, arr, Math.max(arr, out), SIM.css('--grid'), 'waits in the 320-sample media output FIFO ('+R.fill[p.n]+' samples)')}
    ${row(92, out, out+1/C.FS, SIM.css('--accent'), 'i2s_master outputs sample '+k0+' at capture + '+SIM.fmtDur(out-cap0))}
    <line x1="${X(pres)}" y1="8" x2="${X(pres)}" y2="120" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="${X(pres)-4}" y="134" font-size="11" text-anchor="end" fill="var(--bad)">presentation time = capture + 2 ms</text>
    <line x1="40" y1="150" x2="720" y2="150" stroke="var(--ink2)"/>${[0,0.5,1,1.5,2,2.5].map(ms=>`<line x1="${X(cap0+ms/1000)}" y1="146" x2="${X(cap0+ms/1000)}" y2="154" stroke="var(--ink2)"/><text x="${X(cap0+ms/1000)}" y="166" font-size="10" text-anchor="middle" fill="var(--ink2)">${ms} ms</text>`).join('')}</svg>
    <p class="small muted">${stAt(t)===3 ? `Locked: the last <span class="mono">manage_buffer()</span> found the output ${sd} samples off the presentation time.` : 'Not locked yet: the output is muted (zero_flag = 1) and its timing is not yet aligned.'} Transit times (talker 20 µs, store-and-forward ${SIM.fmtDur(C.WIRE_T)} per hop) are ${inf}.</p>`;
}
function viewSecond(m){
  window.__rd79Active = false;
  m.innerHTML = `${card('One second, broken down', `<div id="lad"></div>`)}
    <div class="grid2">${card('As seen by the dongle: one packet from capture to I2S', `<div id="pres"></div>`)}
      ${card('As seen by the displays: AMS8-1A at the playhead', `<div id="ams"></div><p class="small muted">Meters: SHARC <span class="mono">vumeter.asm</span> constants (VU 0.6 s / 40 dB, PPM attack 8.33 ms, decay 6 s / 40 dB) and the <span class="mono">ams81_vu_data.dat</span> LED table, as modelled in the ${plink('ams81','AMS8-1A plugin')}. They only move once the media FIFO is LOCKED.</p>`)}</div>
    ${card('Wire level and XMOS logical cores (11 of 16 used) — zoom to 1 ms or 125 µs', `<div id="secs"></div><canvas id="tl"></canvas><p class="small muted">Thread placement is from <span class="mono">main.xc</span> and <span class="mono">avb_app_board_config.h</span> (AVB_AUDIO_TILE 1, AVB_CONTROL_TILE 0, ETHERNET_DEFAULT_TILE tile[0]); the five Ethernet cores are the <span class="mono">par</span> in <span class="mono">ethernet_server_full()</span>. Busy times per call are ${inf}.</p>`)}`;
  const draw = ()=>{
    const R = run(), t = tAbs(), n = slotAt(t);
    const rows = [
      ['1722 packets (class A)', '8000', SIM.fmtDur(1/8000), 'AVB1722_PACKET_RATE; 6 samples × 8 ch each; 1 in 4 without timestamp'],
      ['Audio samples per channel', '48 000', SIM.fmtDur(1/48000), 'AM824 quadlets, 0x40 label + 24 bits'],
      ['Bits on the wire for the stream', (C.WIRE_BYTES*8*8000/1e6).toFixed(2)+' Mb', SIM.fmtDur(C.WIRE_T)+' per frame', '17 % of the 100 Mb/s LAN8710A link; class A may reserve 75 % '+inf],
      ['gPTP Sync + Follow_Up', '8 + 8', '125 ms', 'PTP_LOG_SYNC_INTERVAL −3 → update_adjust(), update_reference_timestamps()'],
      ['gPTP Announce / Pdelay_Req', '1 / 1', '1 s', 'PTP_LOG_ANNOUNCE_INTERVAL 0, PTP_LOG_MIN_PDELAY_REQ_INTERVAL 0'],
      ['manage_buffer() notifications', '≈ '+Math.round(48000/256), '≈ 5.3 ms', 'NOTIFICATION_PERIOD 250 samples + wait for the next timestamped packet'],
      ['update_media_clock() (clock recovery)', (1e8/C.CR_TICKS).toFixed(1), SIM.fmtDur(C.CR_TICKS/1e8), 'CLOCK_RECOVERY_PERIOD (1<<21) ticks'],
      ['demo() periodic pass', '20 000', '50 µs', 'PERIODIC_POLL_TIME 5000 → avb_periodic(), simple_demo_controller()'],
      ['SYNC_OUT edges to the CS2300', '960', SIM.fmtDur(1/960), 'PLL_TO_WORD_MULTIPLIER 100 → 480 Hz reference; the CS2300 multiplies to 24.576 MHz'],
      ['I2S: MCLK / SCLK / LRCLK', '24.576 M / 3.072 M / 48 k', '40.7 ns / 326 ns / 20.8 µs', 'MASTER_TO_WORDCLOCK_RATIO 512; AMS81.sdc: 40.690 ns / 325.52 ns'],
      ['FPGA: AVB MCLK × 4 → SRC clock', '98.304 MHz', '10.2 ns', 'AMS81.sdc avbpllout_98M304; SRC LRCLK = ÷2048'],
      ['AMS8 meter LED refresh', '80 per channel '+inf, '12.5 ms', 'SHARC Timer1 shifter (see the AMS8-1A plugin)'],
      ['MRP periodic / Join / LeaveAll', '1 / ≤5 / 0.1', '1 s / 200 ms / 10 s', 'MRP_*_PERIOD_CENTISECONDS 100, 20, 1000'],
    ];
    m.querySelector('#lad').innerHTML = tbl(['Event','Per second','Period','From the code'], rows) + `<p class="small muted">State at the playhead (${SIM.fmtT(t)} after power-up): ${ST_NAMES[R.st[n]]}, fill ${R.fill[n]}, word clock ${R.ppm[n]>=0?'+':''}${R.ppm[n].toFixed(2)} ppm, gPTP ${roleAt(t).role}.</p>`;
    m.querySelector('#pres').innerHTML = presentSVG(t);
    m.querySelector('#ams').innerHTML = amsSVG(t); bindAms(m.querySelector('#ams'));
    m.querySelector('#secs').innerHTML = secHTML(); bindActs(m.querySelector('#secs'), {sec:v=>A.sec(v)});
    const L = [ lanesMain()[3], { label:'I2S LRCLK 48 kHz', h:20, draw(c,X,t0,t1,y,h){ bitsLane(c,tt=>X(tt-off()),t0+off(),t1+off(),y,h,1/96000,n=>n%2,SIM.css('--ink'),'LRCLK'); } }, ...threadLanes() ];
    SIM.drawLanes(m.querySelector('#tl'), L, {labelW:250});
  };
  SIM.on('time', draw);
}

/* ================================================================
   BLOCK DIAGRAM
   ================================================================ */
function viewBlock(m){
  window.__rd79Active = false;
  const live = () => stAt(tAbs())===3;
  const B = {
    gm:{x:10,y:20,w:170,h:70,t:'Talker + gPTP GM',s:['8 ch 48 kHz, class A','Announce / Sync'],live:()=>D.talker,d:'The AVB source and grandmaster on the bench (not in the archive: '+inf+'). Sends 8000 packets/s and gPTP messages.'},
    sw:{x:210,y:20,w:150,h:70,t:'AVB bridge',s:['802.1AS / Qat / Qav'],live:()=>D.avbSw,d:'Answers Pdelay_Req, relays Sync/Announce, reserves bandwidth after MSRP Listener Ready. A plain switch breaks all three.'},
    phy:{x:390,y:20,w:160,h:70,t:'LAN8710A PHY',s:['10/100, MII 25 MHz','J21 RJ45'],live:()=>D.cutAt==null,d:'SMSC LAN8710A on the dongle (D4U schematic). MII to tile[0] ports 1P/1E/1L/1F/1K/4C/4D, SMI on 1N/1M, reset 1O (WBS-AVB-DG.xn).'},
    t0:{x:390,y:120,w:200,h:95,t:'XS1-L16 tile[0]',s:['MII + 4 Ethernet cores','demo(): avb_init, 1722.1','ADP / ACMP / AECP, MRP, MAAP','boots from AT25DF041A'],live:()=>true,d:'ETHERNET_DEFAULT_TILE tile[0] and AVB_CONTROL_TILE 0. Runs ethernet_server_full (mii_rx_pins, mii_tx_pins, ethernet_tx_server, ethernet_rx_server, ethernet_filter) and the control task demo(): avb_periodic() every 50 µs, 1722.1 entity name from aem_entity_strings.h.in.'},
    t1:{x:620,y:120,w:200,h:110,t:'XS1-L16 tile[1]',s:['media_clock_server + gPTP','avb_1722_listener','i2s_master (MCLK 512 fs)','avb_1722_talker (idle)','gpio_task (dummy port)'],live,d:'AVB_AUDIO_TILE 1. The listener writes the 320-sample media output FIFOs; i2s_master pulls them; media_clock_server runs gPTP (COMBINE_MEDIA_CLOCK_AND_PTP) and the clock recovery and toggles SYNC_OUT.'},
    pll:{x:620,y:20,w:180,h:70,t:'CS2300 PLL',s:['SYNC_OUT 480 Hz in','24.576 MHz MCLK out'],live,d:'Cirrus CS2300 (U6) set up by audio_clock_CS2300CP_init() over I2C (4A/4B). It multiplies the 480 Hz reference into MCLK for the XMOS I2S and J1-9. PLL bandwidth is not set in the code shown ('+inf+').'},
    pic:{x:180,y:120,w:180,h:70,t:'PIC32MX250 + 24LC128',s:['DSP4YOU co-processor','not used by WBS code'],live:()=>false,d:'Microchip coprocessor and EEPROM on the dongle. The XN names PORT_PIC_MCLR (tile[0] 1G) etc., but main.xc never drives them; DSP4YOU supplied “AVB-Dongle_Disable_PIC.pdf” (RD63).'},
    j1:{x:620,y:260,w:200,h:70,t:'J1 I2S header',s:['4 × SDATA out, MCLK','SCLK, LRCLK (12 pins)'],live,d:'Quick-start p.4 pin-out. Pins 1/3/5/7 carry AVB ch 1&2…7&8; 9 MCLK, 10 SCLK, 12 LRCLK. Inputs 2/4/6/8 (talker side) are not wired to the FPGA in the QSF ('+inf+').'},
    fpga:{x:340,y:260,w:240,h:95,t:'Cyclone IV FPGA (AMS81)',s:['AVB_MCLK_IN T1, SCLK T2, LRCLK J5','AVB_I2S1..4 F1/E1/D2/C1','backup20: avbfifo + Altera SRC','backup18: i2s_2_aes3 → router'],live,d:()=>`EP4CE40F23C6 / EP4CE30F23I7, Quartus 11.1. ${D.host==='MLC8'?'backup20 (MLC8): avb_i2s_resampler = 4 × (i2s_parallel → avbfifo 16×64 → parallel_i2s); AVB MCLK × 4 = 98.304 MHz clocks the AES receivers and the SRC (inst81).':'backup18 (AMS81): the four AVB I2S lines are turned into AES3 and enter aes_input_router.'} Both labelled “timing not optimized”.`},
    dsp:{x:90,y:260,w:220,h:70,t:'SHARC metering',s:['vumeter.asm: VU + PPM','8 meters, speaker mix'],live,d:'Unchanged AMS8 SHARC code: the AVB channels arrive in the TDM slots of the selected input and are metered like any other source.'},
    fp:{x:90,y:370,w:330,h:70,t:'ATmega128 front panel (v200w.c)',s:['//Avb-Add: “Analog” shows as “AVB”','revision 06VA0002'],live:()=>D.source==='ANALOG',d:'The only front-panel change: two //Avb-Add blocks. The source is still ANALOG internally; only the 8-character label changes.'},
  };
  const W = [['gm','sw','1722 + gPTP'],['sw','phy','100 Mb/s'],['phy','t0','MII'],['t0','t1','XLINK channels'],['t1','pll','SYNC_OUT ↑ / MCLK ↓'],['t1','j1','I2S'],['j1','fpga','ribbon'],['fpga','dsp','TDM'],['dsp','fp','UART'],['pic','t0','']];
  blockView(m, B, W, { w:840, h:460, start:'t1', side:`<p>An off-the-shelf XMOS AVB dongle, running the XMOS reference code with a WBS board name, feeds 8 channels of I2S into the monitor's FPGA. There the network word clock has to be brought into the monitor's own clock domain. The front panel calls the input “AVB”.</p><p class="small">Related: ${plink('rd63-avbresearch','RD63 AVB research')} · ${plink('ams81','AMS8-1A')} · ${plink('mlc8','MLC8A')} · ${plink('ams8e','AMS8E boards')}</p>` });
}

/* ================================================================
   SCHEMATICS (redrawn)
   ================================================================ */
const SHEETS = [
  { name:'1 · XS1-L16 tile[0]', note:'From WBS-AVB-DG.xn (tile[0] port map) and ethernet_board_conf.h (PHY address 0). Ball numbers are not in the XN; the D4U schematic lists X0D/X1D signals only.', svg:()=>
    chip(330,70,200,'XS1-L8A-64 node 0 → tile[0]',[['1A','SPI_MISO'],['1B','SPI_SS'],['1C','SPI_CLK'],['1D','SPI_MOSI'],['1G','PIC_MCLR'],['1H','PIC_RPC9'],['1I','PIC_RPB1'],['1J','PIC_RPB7'],['4E','UART_RX'],['4F','UART_TX']],
      [['1P','ETH_RXCLK'],['1E','ETH_RXER'],['1F','ETH_RXDV'],['4D','ETH_RXD[3:0]'],['1L','ETH_TXCLK'],['1K','ETH_TXEN'],['4C','ETH_TXD[3:0]'],['1N','ETH_MDIO'],['1M','ETH_MDC'],['1O','ETH_RSTN']],'25 MHz osc · 500 MHz · boots SPI:bootFlash') +
    chip(40,90,110,'AT25DF041A',[],[['SO',''],['CS',''],['SCK',''],['SI','']],'U2 boot flash') + chip(690,90,120,'LAN8710A',[['RXCLK',''],['RXER',''],['RXDV',''],['RXD',''],['TXCLK',''],['TXEN',''],['TXD',''],['MDIO',''],['MDC',''],['nRST','']],[],'PHY → J21 RJ45') },
  { name:'2 · XS1-L16 tile[1]', note:'From WBS-AVB-DG.xn tile[1]. 4C/4D/4E are declared under the comment “Dummy Port to match the code”: PORT_SHARED_OUT (mute/remote LED), PORT_SHARED_IN (PORT_BUTTONS) and PORT_LEDS have no hardware.', svg:()=>
    chip(320,60,220,'XS1-L8A-64 node 1 → tile[1]',[['4A','I2C_SDA'],['4B','I2C_SCL'],['1K','SYNC_OUT'],['1L','MCLK (in)'],['4C','SHARED_OUT (dummy)'],['4D','SHARED_IN (dummy)'],['4E','LEDS (dummy)'],['4F','MODE'],['1G..1J','PIC_RPB13/15, RPC3, RPB0']],
      [['1C','LRCLK'],['1D','SCLK'],['1O','SDATA_OUT0'],['1P','SDATA_OUT1'],['1A','SDATA_OUT2'],['1B','SDATA_OUT3'],['1N','SDATA_IN0'],['1M','SDATA_IN1'],['1F','SDATA_IN2'],['1E','SDATA_IN3']],'boots over the XLINK (4 × 5-wire links)') +
    chip(60,330,140,'CS2300 (U6)',[['CLK_IN','SYNC_OUT'],['SCL','I2C_SCL'],['SDA','I2C_SDA']],[['CLK_OUT','MCLK'],['AUX_OUT','']],'I2C, PLL_TYPE_CS2300 1') },
  { name:'3 · J1 header → AMS81 FPGA', note:'J1 pin-out: AVB-DGK Quick start guide p.4. FPGA pins: AMS81.qsf in backup18/backup20 (set_location_assignment PIN_T1 -to AVB_MCLK_IN …). Which J1 pin lands on which FPGA ball is matched by signal name; the ribbon itself is not documented ('+'inferred'+').', svg:()=>
    chip(120,70,150,'J1 (AVB-DG)',[['1','I2S OUT ch1&2'],['3','I2S OUT ch3&4'],['5','I2S OUT ch5&6'],['7','I2S OUT ch7&8'],['9','MCLK OUT'],['10','SCLK'],['12','LRCLK'],['11','GND'],['2,4,6,8','I2S IN (unused)']],[['1',''],['3',''],['5',''],['7',''],['9',''],['10',''],['12','']],'2 × 6, 12 pins') +
    chip(560,70,190,'EP4CE40F23C6 (AMS81)',[['F1','AVB_I2S1'],['E1','AVB_I2S2'],['D2','AVB_I2S3'],['C1','AVB_I2S4'],['T1','AVB_MCLK_IN'],['T2','AVB_SCLK_IN'],['J5','AVB_LRCLK_IN']],[['','→ avb_i2s_resampler'],['','→ PLL inst39 ×4'],['','98.304 MHz → SRC']],'Quartus II 11.1, EPCS1') +
    [0,1,2,3,4,5,6].map(i=>`<line x1="304" y1="${92+i*18}" x2="526" y2="${92+i*18}" stroke="var(--accent2)" stroke-dasharray="${i>3?'0':'0'}"/>`).join('') },
  { name:'4 · avb_i2s_resampler (backup20)', note:'avb_i2s_resampler.bdf: four identical lanes. i2s_parallel.v shifts SDATA on posedge SCLK into a 64-bit register and latches it on the LRCLK falling edge. avbfifo.v is an LPM dcfifo, 16 words × 64 bits, showahead off; wrreq = NOT wrfull, rdreq = NOT rdempty. parallel_i2s.v reloads its shift register when a 33-bit LRCLK delay line shows a rising edge 32 SCLKs late, then shifts out MSB first on negedge SCLK.', svg:()=>{
    let s=''; for (let i=0;i<4;i++){ const y=50+i*100;
      s += `<rect x="60" y="${y}" width="140" height="56" fill="var(--panel2)" stroke="var(--ink)"/><text x="130" y="${y+22}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">i2s_parallel</text><text x="130" y="${y+40}" text-anchor="middle" font-size="10" fill="var(--ink2)">par_audio[63..0]</text>
        <rect x="300" y="${y}" width="160" height="56" fill="var(--panel2)" stroke="var(--ink)"/><text x="380" y="${y+22}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">avbfifo</text><text x="380" y="${y+40}" text-anchor="middle" font-size="10" fill="var(--ink2)">64 bits × 16 words</text>
        <rect x="560" y="${y}" width="140" height="56" fill="var(--panel2)" stroke="var(--ink)"/><text x="630" y="${y+22}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">parallel_i2s</text><text x="630" y="${y+40}" text-anchor="middle" font-size="10" fill="var(--ink2)">sdata, test = load_en</text>
        <line x1="200" y1="${y+28}" x2="300" y2="${y+28}" stroke="var(--ink)" stroke-width="2.5"/><line x1="460" y1="${y+28}" x2="560" y2="${y+28}" stroke="var(--ink)" stroke-width="2.5"/>
        <text x="20" y="${y+32}" font-size="10" fill="var(--accent2)">IN_SDATA[${i}]</text><text x="710" y="${y+32}" font-size="10" fill="var(--accent2)">OUT_SDATA[${i}]</text>
        <text x="300" y="${y+70}" font-size="9.5" fill="var(--ink2)">wrclk = lrclk (AVB) · rdclk = OUTPUT_LRCLK · fifo${i}_not_full / fifo${i}_not_empty</text>`; }
    return s; } },
];
function viewSchem(m){ window.__rd79Active = false; sheetsView(m, SHEETS, 'WBS-AVB-DG.xn, the DSP4YOU quick-start and schematic (RD63), AMS81.qsf/.sdc and the Verilog', 'There is no RD79 PCB: the dongle is a bought module and the monitor boards are the existing AMS8E-1 issue 5. These sheets show the nets the archived files actually name.'); }

/* ================================================================
   SOFTWARE
   ================================================================ */
function threadMapSVG(t){
  const st = stAt(t), ro = roleAt(t), p = pktAt(t);
  const box = (x,y,w,name,sub,on) => `<rect x="${x}" y="${y}" width="${w}" height="40" rx="6" fill="${on?'color-mix(in srgb,var(--accent) 22%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}"/><text x="${x+8}" y="${y+17}" font-size="11.5" font-weight="700" fill="var(--ink)">${name}</text><text x="${x+8}" y="${y+32}" font-size="9.5" fill="var(--ink2)">${sub}</text>`;
  const pk = p && p.kind && p.kind!==2;
  return `<svg viewBox="0 0 860 300" style="width:100%">
    <rect x="6" y="6" width="420" height="200" rx="10" fill="none" stroke="var(--ink2)" stroke-dasharray="5 4"/><text x="16" y="24" font-size="12" font-weight="700" fill="var(--ink)">tile[0] — Ethernet + control (6 cores)</text>
    <rect x="436" y="6" width="418" height="200" rx="10" fill="none" stroke="var(--ink2)" stroke-dasharray="5 4"/><text x="446" y="24" font-size="12" font-weight="700" fill="var(--ink)">tile[1] — audio + clocks (5 cores)</text>
    ${box(20,40,190,'mii_rx_pins','MII RXD 4D, RXDV 1F',pk)}${box(222,40,190,'ethernet_filter','→ rx clients',pk)}
    ${box(20,95,190,'ethernet_rx_server','c_mac_rx[0..2]',pk)}${box(222,95,190,'ethernet_tx_server','c_mac_tx[0..2]',ro.role==='MASTER')}
    ${box(20,150,190,'mii_tx_pins','TXD 4C, TXEN 1K',ro.role==='MASTER')}${box(222,150,190,'demo()','50 µs periodic · 1722.1',true)}
    ${box(450,40,195,'media_clock_server','+ gPTP ('+ro.role+')',true)}${box(655,40,190,'avb_1722_listener','process_packet()',pk)}
    ${box(450,95,195,'i2s_master','512 fs · 4 out / 4 in',true)}${box(655,95,190,'avb_1722_talker','no source connected',false)}
    ${box(450,150,195,'gpio_task','dummy PORT_BUTTONS',false)}
    <text x="20" y="225" font-size="10.5" fill="var(--ink2)">c_mac_rx[0] → media_clock_server (PTP) · c_mac_rx[1] → demo (control) · c_mac_rx[2] → listener (1722)</text>
    <text x="20" y="242" font-size="10.5" fill="var(--ink2)">c_ptp[0] → avb_init (control) · c_ptp[1] → talker · c_buf_ctl[0] listener ↔ media_clock_server · c_media_ctl[0] i2s ↔ avb_init</text>
    <text x="20" y="259" font-size="10.5" fill="var(--ink2)">c_listener_ctl, c_talker_ctl, c_media_clock_ctl from avb_init() · c_gpio_ctl gpio_task → demo()</text>
    <text x="20" y="280" font-size="10.5" fill="var(--accent)">Highlighted: busy at the playhead (FIFO ${ST_NAMES[st]}).</text></svg>`;
}
function fsmSVG(t){
  const st = stAt(t), N = [['DISABLED',40],['ZEROING',230],['LOCKING',420],['LOCKED',610]];
  return `<svg viewBox="0 0 800 150" style="width:100%"><defs><marker id="ar79f" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    ${N.map(([n,x],i)=>`<rect x="${x}" y="30" width="150" height="44" rx="22" fill="${i===st?ST_COL()[i]:'var(--panel2)'}" stroke="var(--line)"/><text x="${x+75}" y="57" text-anchor="middle" font-size="12.5" font-weight="700" fill="${i===st?'#fff':'var(--ink)'}">${n}</text>`).join('')}
    <line x1="190" y1="52" x2="228" y2="52" stroke="var(--ink2)" marker-end="url(#ar79f)"/><line x1="380" y1="52" x2="418" y2="52" stroke="var(--ink2)" marker-end="url(#ar79f)"/><line x1="570" y1="52" x2="608" y2="52" stroke="var(--ink2)" marker-end="url(#ar79f)"/>
    <path d="M685,74 C685,130 305,130 305,76" fill="none" stroke="var(--bad)" marker-end="url(#ar79f)"/><path d="M495,74 C495,110 320,110 312,78" fill="none" stroke="var(--bad)" stroke-dasharray="4 3" marker-end="url(#ar79f)"/>
    <text x="150" y="20" font-size="10" fill="var(--ink2)">enable_media_output_fifo()</text><text x="330" y="20" font-size="10" fill="var(--ink2)">*zero_marker == 0 → wrptr = dptr + 160</text><text x="560" y="20" font-size="10" fill="var(--ink2)">BUF_CTL_ADJUST_FILL (sample_diff)</text>
    <text x="400" y="142" font-size="10" text-anchor="middle" fill="var(--bad)">BUF_CTL_RESET: lost lock (|sample_diff| > 24 or fill < 5 after 400) · compensation too large</text></svg>`;
}
function viewSoft(m){
  window.__rd79Active = false;
  m.innerHTML = `<div id="secs"></div>
    ${card('XMOS threads and channels (main.xc) — live', `<div id="thr"></div>`)}
    <div class="grid2">${card('Media output FIFO state machine (media_output_fifo.c) — live', `<div id="fsm"></div><div id="mb"></div>`)}
      ${card('Clock recovery: update_media_clock() — live', `<div id="cr"></div>`)}</div>
    <div class="grid2">${card('gPTP (gptp.c) — live', `<div id="ptp"></div>`)}
      ${card('avb_1722_listener_process_packet() for the packet at the playhead', `<div id="pp"></div>`)}</div>
    <div class="grid2">${card('Which code is WBS’s own', `<div id="own"></div>`)}
      ${card('The WBS code, verbatim', `<div id="code"></div>`)}</div>`;
  const draw = ()=>{
    const t = tAbs(), R = run(), ro = roleAt(t), nt = lastBefore(R.notes, t), ck = lastBefore(R.clk, t), adj = lastBefore(R.adjHist, t), pd = lastBefore(R.pdHist, t), p = pktAt(t);
    m.querySelector('#secs').innerHTML = card('Playhead', secHTML()); bindActs(m.querySelector('#secs'), {sec:v=>A.sec(v)});
    m.querySelector('#thr').innerHTML = threadMapSVG(t);
    m.querySelector('#fsm').innerHTML = fsmSVG(t);
    m.querySelector('#mb').innerHTML = nt ? kv([['last notification', SIM.fmtT(nt.t),1],['diff (ns)', `ptp_outgoing_actual − presentation_timestamp = ${nt.diff.toLocaleString()}`,1],['sample_diff', `diff / ((wordLength × 10) >> 16) = ${nt.sd}`,1],['stability_count / lock_count', `${nt.stab} (lock after > ${C.STABLE}) / ${nt.lc} of ${C.LOCK_COUNT}`,1],['fill', `${nt.fill} of 320`,1],['action', nt.act,1]]) : '<p class="muted">No manage_buffer() call yet.</p>';
    m.querySelector('#cr').innerHTML = kv([
      ['Nominal', `(100000000 << 24) / 48000 = ${R.wordNom.toLocaleString()}`,1],
      ['wordlen now', ck ? ck.wordlen.toLocaleString() : R.wordNom.toLocaleString(),1],
      ['Word clock', ck ? `${ck.ppm>=0?'+':''}${ck.ppm.toFixed(3)} ppm (true rate, dongle crystal ${D.lppm} ppm)` : '—',1],
      ['Last update', ck ? `${SIM.fmtT(ck.t)}: ${ck.what}` : '—',1],
      ['Law', 'wordlen −= (perror / diff_local) × 32 + (ierror / diff_local) / 4   (“Now Kp = 32, Ki = 4”)',1],
      ['Output', 'wordlen >> 8 → media_clocks[0].wordLength → do_media_clock_output() → p_fs (SYNC_OUT) → CS2300',1]]);
    m.querySelector('#ptp').innerHTML = kv([
      ['ptp_state', 'PTP_'+ro.role+(ro.lock?' · sync_lock = 1':''),1],
      ['g_ptp_adjust', adj ? `${adj.adj} / 2^30 = ${adj.ppm.toFixed(3)} ppm` : '0 (no Sync as slave yet)',1],
      ['sync_count', adj ? `${adj.cnt} (lock when > ${C.LOCK_STAB} with |Δadjust| < 0x100000 = ${(C.LOCK_VAR/1073741824*1e6).toFixed(0)} ppm)` : '—',1],
      ['ptp_path_delay', pd ? `${pd.pd} ns (true ${D.pd} ns)` : 'not valid (first Pdelay pending)',1],
      ['Priorities', `ours 250 (PTP_DEFAULT_GM_CAPABLE_PRIORITY1) · GM ${C.GM_PRIO1} ${inf}`,1],
      ['Messages', 'ethertype 0x88F7 to 01:80:C2:00:00:0E; transportSpecific 1 (802.1AS)',1]]);
    let steps;
    if (!p || !p.kind) steps = ['no packet'];
    else if (p.kind===2) steps = ['frame lost on the wire — the function is never called; the 6 samples are simply missing'];
    else { const ch = R.chanLockAt!=null && p.t>=R.chanLockAt; const P = packetBytes(p.seq);
      steps = ['Buf[12] == 0x81 → 18-byte Ethernet header (VLAN tagged)','AVBTP_CD == DATA, AVBTP_SV == 1 ✓',
        `dbc_value = ${P.dbc}; dbc_diff = 6; num_samples_in_payload = (200 − 8) >> 2 = 48`,
        ch ? `chan_lock = 16 already → skip format detection` : `chan_lock < 16 → num_channels = prev_num_samples / dbc_diff = 8; rate += 48; return 0 (no audio yet)`];
      if (ch){ steps.push(P.tv ? `AVBTP_TV == 1 → sample_num = (8 − (${P.dbc} & 7)) & 7 = ${P.sn} → media_output_fifo_set_ptp_timestamp()` : 'AVBTP_TV == 0 → no timestamp in this packet');
        steps.push('media_output_fifo_maintain() for each mapped channel'); steps.push('media_output_fifo_strided_push(): 6 samples per channel, stride 8, __builtin_bswap32, & 0xFFFFFF'); } }
    m.querySelector('#pp').innerHTML = `<ol class="small mono">${steps.map(s=>`<li>${s}</li>`).join('')}</ol>`;
    m.querySelector('#own').innerHTML = tbl(['Part','WBS','Reference (third party)'],[
      ['XMOS app','Makefile: TARGET = WBS-AVB-DG and the module filter (2 lines); xmos_board_info/WBS-AVB-DG/ (XN copied from D4U-AVB-DG, name changed); aem_entity_strings.h.in (vendor WBS, model, fw 1.00, entity name); module_ethernet_board_support/WBS-AVB-DG (copy)','app_simple_avb_demo main.xc, app_config.h, avb_conf.h, simple_demo_controller.c — byte-identical to DSP4YOU’s 14 June 2013 workspace'],
      ['XMOS stack','—','sw_avb 5.2.0 (module_avb, _1722, _1722_1, _1722_maap, _srp, _gptp, _media_clock, _audio), sc_ethernet, sc_i2c (DSP4YOU tx8 patch), sc_util, sc_otp, tests and examples'],
      ['FPGA','i2s_parallel.v, parallel_i2s.v, avbfifo (MegaWizard), avb_i2s_resampler.bdf, AVB pins/clocks in AMS81.qsf/.sdc, top-level wiring','AESRXSRC/: Altera SRC reference design (resampler.sv © 2005 Altera), aes3_2_i2s / i2s_2_aes3'],
      ['Front panel','two //Avb-Add blocks in v200w.c (≈ 20 lines)','—'],
    ]);
    m.querySelector('#code').innerHTML = `<pre class="small mono" style="white-space:pre-wrap;margin:0">// v200w.c case ANALOG (both blocks alike)
/*Avb-Rem Start  … chA chn cha chl cho chg …  //Avb-Rem End */
//Avb-Add Start
  *(line2 + Audio_Offset + 2) = chA;
  *(line2 + Audio_Offset + 3) = chV;
  *(line2 + Audio_Offset + 4) = chB;   // others SPACE
//Avb-Add End

// i2s_parallel.v
always @(posedge sclk) input_reg &lt;= {input_reg[62:0],sdata};
always @(negedge lrclk) par_audio &lt;= input_reg;

// parallel_i2s.v
input reg [63:0] par_audio,          // “input reg”: not legal Verilog-2001
assign load_en = (lrclk_shift_reg[32] ^ lrclk_shift_reg[31]) &amp; lrclk_shift_reg[31];
always @(negedge sclk) if (load_en) input_reg &lt;= par_audio; else input_reg &lt;= {input_reg[62:0],1'b0};

// aem_entity_strings.h.in (backup3)
#define AVB_1722_1_ENTITY_NAME_STRING "AMS8"
#define AVB_1722_1_SERIAL_NUMBER_STRING "0123456789"</pre>`;
  };
  SIM.on('time', draw);
}

/* ================================================================
   FINDINGS
   ================================================================ */
function viewFindings(m){
  window.__rd79Active = false;
  const li = (h, b) => `<li><b>${h}</b> ${b}</li>`;
  m.innerHTML = card('What was decided, and what became of it', `
    <ol>
      ${li('The decision (RD63 → RD79):', `RD63 compared XMOS reference designs with DigiDesignCorp FPGA IP (dev kit $14,999 plus a $50,000–100,000 licence) and Xilinx's LogiCORE. WBS took the cheapest route: buy DSP4YOU's XMOS AVB-DG dongle and run the free XMOS stack. RD79 is the result: an 8-channel listener on header J1, feeding the AMS8/MLC8 FPGA. See ${plink('rd63-avbresearch','RD63 AVB Research')}.`)}
      ${li('How far it got:', `Three firmware snapshots between 3 and 21 March ${Y(2014)}, two FPGA snapshots (21 and 24 March ${Y(2014)}), both folder-named “timing not optimized”, and a front panel that shows “AVB”. There is no PCB, test report or release. The R&D register leaves RD79 (and RD63) at priority <b>C</b>.`)}
      ${li('What became of it:', `The <span class="mono">//Avb-Add</span> code line survived. In RD85 (Archwave uNet RAVENNA/AES67, ${Y(2015)}–${Y(2016)}) the same blocks write “AES67” instead of “AVB”. That firmware shipped as AMS8 front-panel <b>V040100</b> in the AMS8-1AN (06AV0100, ${Y(2016)}) — see the variants table in the ${plink('ams81','AMS8-1A plugin')}. Network audio reached WBS monitors as AES67, not AVB.`)}
      ${li('Metering was reused unchanged:', `The AVB channels enter the AMS8/MLC8 FPGA in place of the analog input and are metered by the existing SHARC <span class="mono">vumeter.asm</span>. See the ${plink('ams81','AMS8-1A')}, ${plink('mlc8','MLC8A')} and ${plink('ams8e','AMS8E')} plugins.`)}
      ${li('Not related:', `${plink('avb-vid-buddy','AVB VID BUDDY')} is the ${Y(2002)} “Audio/Video Buddy” portable monitor (AVB1). It only shares the letters. RD69's “Vid Buddy” is a third product.`)}
    </ol>`) + card('Findings in the code', `<ol>
      ${li('Almost none of the XMOS code is WBS’s.', `Diffing <span class="mono">testws4</span> against DSP4YOU's <span class="mono">workspace_avb_14062013.zip</span> (RD63) leaves: the Makefile's <span class="mono">TARGET</span> and filter line, a copied board folder <span class="mono">WBS-AVB-DG</span> whose XN differs only in <span class="mono">&lt;Name&gt;WBS-AVB-Dongle (L16)</span>, the 1722.1 strings, and a copied <span class="mono">module_ethernet_board_support/WBS-AVB-DG</span>. <span class="mono">main.xc</span>, <span class="mono">app_config.h</span>, <span class="mono">avb_conf.h</span> and <span class="mono">simple_demo_controller.c</span> are byte-identical to DSP4YOU's (14 June 2013), on XMOS sw_avb 5.2.0.`)}
      ${li('It is a talker and a listener, not a listener only.', `The archive READMEs say “talker disabled”, but <span class="mono">app_config.h</span> has <span class="mono">AVB_DEMO_ENABLE_TALKER 1</span> and <span class="mono">AVB_DEMO_ENABLE_LISTENER 1</span>. So <span class="mono">avb_1722_talker</span> runs on tile[1], MAAP reserves a talker address, and the 1722.1 controller is enabled (<span class="mono">AVB_1722_1_CONTROLLER_ENABLED 1</span>). <span class="mono">avb_entity_on_new_entity_available()</span> will auto-connect the dongle's own talker to the first XMOS listener it discovers ${inf}.`)}
      ${li('No codecs are initialised.', `The CS4270 set-up at I²C 0x90/0x92 that the READMEs mention sits inside <span class="mono">#if AVB_XA_SK_AUDIO_SLICE</span>, which only the SLICEKIT-L2 board config defines. On WBS-AVB-DG <span class="mono">audio_hardware_setup()</span> only calls <span class="mono">audio_clock_CS2300CP_init(r_i2c, 512)</span>. The dongle schematic has no codec: J1 is raw I2S.`)}
      ${li('Tiles are the other way round from the README.', `<span class="mono">WBS-AVB-DG.xn</span> puts the Ethernet MII, the SPI boot flash and the PIC lines on <b>tile[0]</b>, and I²C, SYNC_OUT, MCLK and I2S on <b>tile[1]</b>. <span class="mono">avb_app_board_config.h</span> agrees: AVB_AUDIO_TILE 1, AVB_I2C_TILE 1, AVB_CONTROL_TILE 0.`)}
      ${li('The demo buttons go nowhere.', `<span class="mono">PORT_BUTTONS</span> = <span class="mono">PORT_SHARED_IN</span> = tile[1] port 4D, declared under “Dummy Port to match the code”, as are the mute/remote LED and channel LEDs. <span class="mono">gpio_task</span> waits forever, so STREAM_SEL, CHAN_SEL and REMOTE_SEL can never happen. Routing and channel offset need an external AVDECC controller (the sim's CHAN_SEL/REMOTE_SEL buttons are virtual).`)}
      ${li('Three builds that differ by one string.', `<span class="mono">AVB_1722_1_ENTITY_NAME_STRING</span> is “WBS AVB Dongle” → “MLC8” → “AMS8”. Each <span class="mono">.xe</span> is 1,470,844 bytes and contains its own name, so each was rebuilt. All three keep <span class="mono">SERIAL_NUMBER "0123456789"</span>, group “XMOS AVB Group” and firmware “1.00”, and leave DSP4YOU's original D4U-AVB-DG folder in place with WBS strings pasted in.`)}
      ${li('The front-panel build carries a production revision.', `RD79's <span class="mono">v200w.c</span> is production V040002 plus the two <span class="mono">//Avb-Add</span> blocks, and its <span class="mono">common.h</span> still reports <b>06VA0002</b> — the same revision as shipping AMS8-1A units (test report 18 May ${Y(2016)}). An AVB unit and a standard unit would show the same firmware number. The label is the full word “AVB”, not “AV…” as the archive README says.`)}
      ${li('AVB takes over the analog input.', `The source is still <span class="mono">ANALOG</span> internally (<span class="mono">SOURCE_CHANGE(analog_input_source)</span>, <span class="mono">analog_enabled</span>); only the display text changes. The FPGA wiring of the AVB path into that slot is ${inf} from the label.`)}
      ${li('The listener does not notice when a stream stops.', `<span class="mono">media_output_fifo_maintain()</span> (and so <span class="mono">manage_buffer()</span>) only runs when a packet arrives. Unplug the cable and the FIFO underflows to silence while the state stays LOCKED; only gPTP reacts, 3 s later (RECV_ANNOUNCE_TIMEOUT). Try it with J21 in the simulator.`)}
      ${li('Before gPTP slave, lock attempts are thrown away.', `While the dongle is still its own gPTP master, <span class="mono">sample_diff</span> compares two unrelated timebases. It can be perfectly stable (≈ −35 000 samples here), so after 33 readings <span class="mono">manage_buffer()</span> prints “compensation too large” and resets the FIFO. <span class="mono">stability_count</span> is not cleared on reset, so it repeats on every notification until a gPTP reference exists. The size of the number depends on the grandmaster's time of day (${inf}).`)}
      ${li('Packet loss is read as clock error.', `A lost packet shifts later samples 6 earlier. <span class="mono">update_media_clock()</span> cannot tell that from drift, so 0.1 % loss pulls the recovered word clock about 1000 ppm slow. Lock is only dropped when one step exceeds ±24 samples. AVB relies on reserved bandwidth for this.`)}
      ${li('gPTP “sync locked” is a loose test.', `<span class="mono">PTP_SYNC_LOCK_ACCEPTABLE_VARIATION 0x100000</span> in 2<sup>-30</sup> units is about 977 ppm between consecutive rate estimates, so “PTP sync locked” prints after six Syncs on almost any link. Nothing else uses the flag (XMOS reference code).`)}
      ${li('FPGA: the clock crossing.', `<span class="mono">avbfifo</span> is 16 × 64 bits (333 µs) with <span class="mono">wrreq = NOT wrfull</span> and <span class="mono">rdreq = NOT rdempty</span>. With any steady difference between the AVB word clock and the monitor clock it slips (8 / (48 000 × Δ): about 8 s at 20 ppm) and silently drops or repeats a word. The MLC8 build (“with aes receivers”) therefore also clocks the Altera SRC from AVB MCLK × 4 (<span class="mono">avbpllout_98M304</span>). Its SDC comment reads “CLOCK LOCATION COULD BE WRONG!”. Which clock reads the FIFO is ${inf}.`)}
      ${li('Verilog that only Quartus would accept.', `<span class="mono">parallel_i2s.v</span> declares <span class="mono">input reg [63:0] par_audio</span> (inputs cannot be <span class="mono">reg</span> in Verilog-2001), keeps an unused commented edge detector, and exports <span class="mono">load_en</span> on a <span class="mono">test</span> pin. It finds the frame edge with a 33-bit LRCLK delay line rather than a counter.`)}
      ${li('Leftovers and duplicates.', `Every XMOS snapshot carries DSP4YOU's <span class="mono">workspace_avb_14062013.zip</span> (also in RD63), and backup1 a <span class="mono">testws4.zip</span>. About 50 unused XMOS apps and tests sit in the workspace. <span class="mono">MEDIA_OUTPUT_FIFO_WORD_SIZE</span> is sized for 96 kHz (“Fix for Apple”). The QSF's search path <span class="mono">c:/ali/projects/avb audio monitor/…</span> names the project and Ali's machine.`)}
    </ol>`) + card('Assumptions in this simulation', `<ul class="small">
      <li>Bench timings (${inf}): controller connects at ${C.T_CONNECT*1000} ms, MSRP Listener Ready at ${C.T_SRP*1000} ms, first grandmaster Announce at ${C.T_ANN0*1000} ms, GM Sync phase ${C.T_SYNC0*1000} ms, GM epoch offset ${C.EPOCH} s, talker processing 20 µs, one store-and-forward bridge. GM priority1 ${C.GM_PRIO1}.</li>
      <li>The media FIFO is enabled by the first packet after <span class="mono">chan_lock</span> (in the stack it follows the sink becoming active). The CS2300 follows SYNC_OUT instantly. MII timestamp jitter ±40 ns.</li>
      <li>Talker content (1 kHz −20 dBFS on 1/2, programme on 3–8), MAC addresses and the stream ID are examples. The FPGA FIFO is read from an independent monitor clock.</li>
      <li>Everything else — packet layout, DBC/TV rules, FIFO sizes, thresholds, PI gains, gPTP weights and intervals — is the archived code's.</li></ul>`) + card('Sources', `<ul class="small mono">
      <li>${ROOT}/README.md · Software/XMOS/README.md · Software/FPGA/README.md · Software/Atmel/README.md · ../R&amp;D_List.xls.md (RD79 “C”)</li>
      <li>Software/XMOS/backup1, backup2-name is mlc8, backup3-name is ams8 /testws4/app_simple_avb_demo (Makefile, src/*, xmos_board_info/WBS-AVB-DG/*, bin/*.xe)</li>
      <li>…/testws4/module_avb_1722, module_avb_audio, module_avb_media_clock, module_gptp, module_avb_srp, module_avb_1722_1, module_ethernet (XMOS)</li>
      <li>Software/FPGA/backup18…, backup20…/v050000: i2s_parallel.v, parallel_i2s.v, avbfifo.v, avb_i2s_resampler.bdf, AMS81.qsf, AMS81.sdc, AESRXSRC/resampler.sv</li>
      <li>Software/Atmel/AMS81 Front/backup2: v200w.c, common.h · AMS81 - #Master/…/#V040002, #V040100 (comparison)</li>
      <li>RD63-AVBResearch/DSP4YOU: AVB-DGK Quick start guide.pdf, D4U-AVB_Dongle_Schematic.pdf, Info-D4U-AVB-Dongle1/readme.txt, workspace_avb_14062013.zip</li>
      <li>RD85-Archwave Ravenna Monitor/README.md · siumulation-plugins/ams81.js (panel assets, meter ballistics)</li></ul>`);
}

/* ================================================================
   REGISTER
   ================================================================ */
SIM.register({
  id:'rd79-avb-monitor', name:'RD79 AVB Monitor · XMOS AVB listener for the AMS8 / MLC8 ('+Y(2014)+')', duration:1,
  product:'RD79-AVB Monitor', year:2014, family:'R&D register', folder:ROOT,
  summary:'R&D listener that brings 8 channels of IEEE 802.1 AVB / 1722 audio into the AMS8 and MLC8 monitors through a DSP4YOU XMOS XS1-L16 dongle, a Cyclone IV FPGA clock crossing and a front panel relabelled “AVB”. The model runs the XMOS reference code (gPTP, 1722 listener, media FIFO, clock recovery) from power-up, packet by packet.',
  highlights:['8 kHz class-A packets decoded byte by byte (DBC, tv, AM824)','gPTP BMCA, update_adjust and path delay from gptp.c','Media FIFO lock and PI clock recovery exactly as coded','11 XMOS logical cores on two tiles, live','Real AMS8-1A silk with AVB metering','What is WBS’s own: about 10 lines of XMOS config'],
  depth:'Full model',
  stepUnits:[
    {label:'1 packet (125 µs)', period:()=>1/C.PKT_RATE},
    {label:'1 sample (20.8 µs)', period:()=>1/C.FS},
    {label:'1 gPTP Sync (125 ms)', period:()=>C.SYNC_T, phase:()=>C.T_SYNC0},
    {label:'1 clock-recovery step (21 ms)', period:()=>C.CR_TICKS/C.TIMER},
    {label:'1 ms', period:()=>0.001},
    {label:'1 SCLK bit (326 ns)', period:()=>1/C.SCLK},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.02,'20 ms (clock recovery)'],[0.002,'2 ms (presentation delay)'],[0.0005,'500 µs (4 packets)'],[0.000125,'125 µs (1 packet)'],[0.00003,'30 µs (I2S bits)']],
  defaultZoom:0,
  init(){ RKEY=''; MKEY=''; window.__rd79Active = false; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: evaluating AVB', render:viewTutorial},
    {id:'second', label:'One second on the wire', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
