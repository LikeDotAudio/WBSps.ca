/* =====================================================================
   M8200 — TERMINATIONS: 8200-series rear termination modules (Ward-Beck, 1997–2005|30–38)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (#MF8200 #SERIES/M8200 - TERMINATIONS #MF82/…):
   - TERMINAL.DSN (OrCAD, 12 pages, 2005|38): pages TB8202, ST8202, TB8204, TB8204P, ST8204, TB8205, TB8205P,
       ST8205, BNC-1…BNC-4; CON20 / CON9 / CON4 / CON3 parts; titles "MF8212 TERMINAL BLOCK", "MF8210 BNC TERMINAL",
       "M8204T TERMINAL INTERFACE ASSEMBLY", "SA14-146 TERMINAL INTERFACE ASSEMBLY"; labels REM IN, WIPER, HIGH, LOW, 75R
   - TRM.CDR, TRMSALE1.CDR, TRMSALE2.CDR (1998|31 catalogue art "8200 SERIES TERMINATIONS": TB8202, TB8204, TB8205P,
       QC8200 QCP, ST8204, ST8200, TB8205P/75, BNC1–BNC4)
   - TB-BNC.PCB, M82BNC.PCB (Tango ASCII 1997|30: BNC / CONN20 / PHEN9 / PHEN3 positions in mils — drawn to scale)
   - M8204T.PCB (P-CAD 2005|38: CONN20 + 30R 1W "R2W" resistors), 82M49.DWG (1997|30 rear housing)
   - IMP1.PCB (Tango 1998|31: "ABS1-1, AUDIO BIT SPITTER" — a misfiled test instrument, drawn from its positions)
   - M8202MAN.pdf / M8202BMN.pdf (60 Ω vs 600 Ω outputs, REM IN 10 k pot), M8204 rear module guide PDFs
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- termination catalogue ---------------- */
const T = {
  TB8202:{kind:'screw', cards:'M8202 / M8208', io:'INPUT ±, SH · OUT 1–8 ± · G · REM IN (LOW, WIPER, HIGH)', outs:8, rs:30, rem:true, src:'TERMINAL.DSN p.TB8202 (CON20, CON9, CON3); TRM.CDR'},
  ST8202:{kind:'solder', cards:'M8202', io:'INPUT ±, SHIELD · OUT 1–4 ± · remote pot HIGH/WIPER/LOW', outs:4, rs:30, rem:true, src:'TERMINAL.DSN p.ST8202; M8202TR2.pdf'},
  TB8204:{kind:'screw', cards:'M8204 / M8204A', io:'AIN ±, SH · BIN ±, SH · A OUTPUTS 1–4 ± · B OUTPUTS 1–4 ± · G', outs:4, rs:30, src:'TERMINAL.DSN p.TB8204 (R on page); TRM.CDR'},
  TB8204P:{kind:'pluggable', cards:'M8204 / M8204A', io:'as TB8204, pluggable; 60 Ω build-outs on the module (M8204T, 30R 1W per leg)', outs:4, rs:30, src:'TERMINAL.DSN p.TB8204P; M8204T.PCB; rear-module guide'},
  'TB8204P/600':{kind:'pluggable', cards:'M8204 / M8204A', io:'as TB8204P with 600 Ω build-outs', outs:4, rs:300, src:'rear-module guide (TB8204P/600)'},
  ST8204:{kind:'solder', cards:'M8204', io:'AIN / BIN ±, OUT ±', outs:4, rs:30, src:'TERMINAL.DSN p.ST8204; TRM.CDR'},
  TB8205:{kind:'screw', cards:'M8205/B, M8206, M8203, D8202, D8201, D8207/110', io:'INPUT ±, SH · OUT 1–8 ± · G', outs:8, rs:0, src:'TERMINAL.DSN p.TB8205'},
  TB8205P:{kind:'pluggable', cards:'M8205/B, M8203, D8201, D8202', io:'as TB8205, pluggable', outs:8, rs:0, src:'TERMINAL.DSN p.TB8205P; TRM.CDR'},
  'TB8205P/75':{kind:'pluggable', cards:'D8201, D8202 (75 Ω input)', io:'UNBALANCED INPUT (BNC) + pluggable outputs', outs:8, rs:0, src:'TRMSALE2.CDR'},
  ST8205:{kind:'solder', cards:'M8205', io:'INPUT, OUT 1–8', outs:8, rs:0, src:'TERMINAL.DSN p.ST8205'},
  QC8200:{kind:'QCP', cards:'(quick-connect, any analog card)', io:'+ / − pairs', outs:8, rs:0, src:'TRM.CDR (QC8200 QCP TERMINALS)'},
  'BNC-1':{kind:'BNC', cards:'MF8212 BNC TERMINAL', io:'IN + 6 OUT', outs:6, rs:0, bnc:true, src:'TERMINAL.DSN p.BNC-1'},
  'BNC-3':{kind:'BNC', cards:'MF8210 BNC TERMINAL', io:'IN + LOOP + 8 OUT', outs:8, rs:0, bnc:true, loop:true, src:'TERMINAL.DSN p.BNC-3'},
};
/* Tango boards (mils) */
const TBBNC = { board:[4193,1043,11368,4912], bnc:[[4500,4100],[4500,3475],[4500,2850],[4500,2225],[4500,1600],[5100,3788],[5100,3163],[5100,2538],[5100,1913],[6300,1913],[6300,2538],[6300,3163],[6300,3788],[5700,1600],[5700,2225],[5700,2850],[5700,3475],[5700,4100],[8275,4100],[8275,3200],[8725,3650],[8725,2750],[8275,2300],[8725,1850],[8275,1400]], con:[[8500,3700]] };
const M82BNC = { board:[3495,12220,7305,18280], bnc:[[6225,13300],[6975,13775],[7000,13125],[6250,12625],[6975,12550],[4900,14475],[5800,14475],[7000,14400]], con:[[5100,17775],[5100,14625],[3950,14625],[3950,17775]], ph9:[[5375,16275],[4875,16275],[3725,16275],[3725,12900],[4225,12900],[4225,16275]], ph3:[[4875,15875],[4875,17775],[3725,14525],[3725,17775],[3725,15875]] };
const IMP1 = { board:[1910,3795,10505,8615], parts:[['U5 EPM7064S (PLCC44)',3000,5950],['U3/U4 CS8402A / CS8412',4500,4850],['U6 27C512',2600,6800],['X1',3725,6575],['JTAG',2150,6375],['XLR-3F',3650,8450],['LEFT jack',6675,8450],['RIGHT jack',6050,8450],['BAT',4400,7425],['K1 relay',4950,7550]], keys:[['PB1','OFF',7500,8075],['PB5','48',7500,7400],['PB6','32',9175,7400],['PB2','−12',9175,8075],['PB7','44',9675,7400],['PB8','EXT',10175,7400],['PB3','−20',9675,8075],['PB4','0dB',10175,8075]] };

/* ---------------- state ---------------- */
const D = { type:'TB8204P', inDbu:4, load:600, term:'75', loop:'open', abs:{fs:48,lvl:'0dB',on:false}, board:'TB-BNC', log:[] };
function reset(){ Object.assign(D,{type:'TB8204P',inDbu:4,load:600,term:'75',loop:'open',abs:{fs:48,lvl:'0dB',on:false},board:'TB-BNC'}); }

/* ---------------- model ---------------- */
function outLevel(){ const t=T[D.type]; if (t.bnc){ const lp=t.loop&&D.loop==='75'; let lvl= lp&&D.term==='75'?-6: D.term==='HIZ'&&!lp? +6 : 0; return {db:lvl, note: lp&&D.term==='75'?'double-terminated': D.term==='HIZ'&&!lp?'unterminated: reflections':'matched 75 Ω'}; }
  const Rs=2*t.rs, RL=D.load; const loss = Rs? 20*Math.log10(RL/(RL+Rs)) : 0; return {db:D.inDbu+loss, loss, Rs, note: Rs? `${Rs} Ω build-out into ${RL} Ω: ${loss.toFixed(2)} dB`:'no build-out on the module (on the card)'}; }

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>50) D.log.length=50; SIM.refresh(); }
const A = {
  type(v){ act('Fit '+v, tr=>{ D.type=v; const t=T[v]; tr(`${v} (${t.kind}) for ${t.cards}`); tr('Mates with the backplane through a 20-way CON20 socket (every page of TERMINAL.DSN has one)'); tr(t.io); tr('Source: '+t.src); }); },
  load(v){ act('Load on the outputs: '+v+' Ω', tr=>{ D.load=v; tr(outLevel().note); }); },
  term(v){ act('Card termination '+v, tr=>{ D.term=v; tr(outLevel().note); }); },
  loop(){ act('Loop '+(D.loop==='75'?'open':'to a terminated device'), tr=>{ D.loop=D.loop==='75'?'open':'75'; tr(outLevel().note); }); },
  absKey(k){ act('ABS-1 key '+k[1], tr=>{ const l=k[1]; if(l==='OFF'){ D.abs.on=!D.abs.on; } else if(['48','44','32','EXT'].includes(l)) D.abs.fs=l; else D.abs.lvl=l; D.abs.on=D.abs.on||l!=='OFF';
    tr(`IMP1.PCB is “ABS1-1, AUDIO BIT SPITTER”: PIC16C62-10 + EPM7064S + CS8402A transmitter, battery powered (MAX777L), XLR-F out`); tr(`Key ${k[0]} “${l}” → ${['48','44','32','EXT'].includes(l)?'sample rate '+l:l==='OFF'?'power '+(D.abs.on?'on':'off'):'tone level '+l} (key legends from the board text; behaviour ${'inferred'})`); }); },
  board(v){ D.board=v; SIM.refresh(); },
  reset(){ act('Start over', tr=>{ reset(); tr('TB8204P, +4 dBu in, 600 Ω loads'); }); },
};

/* ---------------- drawings ---------------- */
function tangoSVG(){
  const b = D.board==='TB-BNC'? TBBNC : D.board==='M82BNC'? M82BNC : IMP1, [x0,y0,x1,y1]=b.board, S=Math.min(480/(x1-x0), 300/(y1-y0)); const X=v=>10+(v-x0)*S, Y=v=>10+(y1-v)*S;
  let s=`<svg viewBox="0 0 ${(x1-x0)*S+20} ${(y1-y0)*S+20}" style="width:100%;max-width:520px"><rect x="10" y="10" width="${(x1-x0)*S}" height="${(y1-y0)*S}" fill="#1f6b3a" stroke="#0d3a1f"/>`;
  (b.bnc||[]).forEach(([x,y])=>s+=`<circle cx="${X(x)}" cy="${Y(y)}" r="${190*S}" fill="#b9bcbf" stroke="#555"/><circle cx="${X(x)}" cy="${Y(y)}" r="${110*S}" fill="#222"/>`);
  (b.con||[]).forEach(([x,y])=>s+=`<rect x="${X(x)-50*S}" y="${Y(y)}" width="${100*S}" height="${2000*S}" fill="#111" stroke="#d4af37"/><text x="${X(x)+8}" y="${Y(y)+12}" font-size="9" fill="#fff">CON20</text>`);
  (b.ph9||[]).forEach(([x,y])=>s+=`<rect x="${X(x)-100*S}" y="${Y(y)}" width="${200*S}" height="${1800*S}" fill="#2b8a3e" stroke="#000"/>`);
  (b.ph3||[]).forEach(([x,y])=>s+=`<rect x="${X(x)-100*S}" y="${Y(y)}" width="${200*S}" height="${600*S}" fill="#2b8a3e" stroke="#000"/>`);
  (b.parts||[]).forEach(([n,x,y])=>s+=`<rect x="${X(x)-6}" y="${Y(y)-6}" width="12" height="12" fill="#222"/><text x="${X(x)+8}" y="${Y(y)+4}" font-size="9" fill="#fff">${n}</text>`);
  (b.keys||[]).forEach(k=>{ const on=(k[1]===String(D.abs.fs))||(k[1]===D.abs.lvl)||(k[1]==='OFF'&&D.abs.on); s+=`<g class="tkey" data-k="${k.join('|')}" style="cursor:pointer"><title>${k[0]} “${k[1]}”</title><rect x="${X(k[2])-14}" y="${Y(k[3])-10}" width="28" height="20" rx="3" fill="${on?'#ffd84a':'#ddd'}" stroke="#333"/><text x="${X(k[2])}" y="${Y(k[3])+4}" font-size="8.5" text-anchor="middle" fill="#000">${k[1]}</text></g>`; });
  return s+`</svg><div class="small muted">Drawn to scale from <span class="mono">${D.board==='IMP1'?'IMP1':D.board}.PCB</span> component positions (Tango ASCII, mils).</div>`;
}
/* ---------------- CorelDRAW artwork for each module (2026|59 artwork pass) ----------------
   assets/m8200-terminations-*.svg are single modules cut from the rear-module guides with Inkscape (sheet titles and
   neighbouring modules removed, headings re-centred, hairlines widened, Symbol “W” restored to Ω). The 1998
   catalogue sheets TRM.CDR / TRMSALE1.CDR / TRMSALE2.CDR are CorelDRAW 5: their outlines survive but every legend is
   scrambled by libcdr, so they are cited, not drawn. */
const ASSET = 'siumulation-plugins/assets/';
const G_DIR = '#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/', MASTER = G_DIR+'8200 Series - Rear module drawing Master.cdr', TR2 = '#MF8200 #SERIES/M8202A - #Engineering #MF82/M8202A - 14-212/M8202TR2.CDR', D8204RO = G_DIR+'D8204 - rear module options.cdr';
const ART = {
  TB8202:{f:'tb8202', vb:[1629,4515,226,418], src:MASTER, page:'“M8208 TERMINAL OPTIONS” page (2011-12-22)'},
  ST8202:{f:'st8202', vb:[527,122,298,555], src:TR2, page:'“M8202 TERMINAL OPTIONS” (2005-01-20)'},
  TB8204:{f:'tb8204', vb:[2181,2846,297,417], src:MASTER, page:'“M8204/A TERMINAL OPTIONS” page (2011-12-22)'},
  TB8204P:{f:'tb8204p', vb:[1079,2830,224,417], src:MASTER, page:'“M8204 & M8204A TERMINAL OPTIONS” page (2011-12-22)'},
  'TB8204P/600':{f:'tb8204p', vb:[1079,2830,224,417], src:MASTER, page:'“M8204 & M8204A TERMINAL OPTIONS” page — drawn once for both builds'},
  ST8204:{f:'st8204', vb:[1893,2846,292,417], src:MASTER, page:'“M8204/A TERMINAL OPTIONS” page (2011-12-22)'},
  TB8205:{f:'tb8205', vb:[2340.3,2336,224,416], src:MASTER, page:'“M8203 TERMINAL OPTIONS” page (2011-12-22), legends as wired for the M8203'},
  TB8205P:{f:'tb8205p', vb:[1380.7,2336,224,416], src:MASTER, page:'“M8203 TERMINAL OPTIONS” page (2011-12-22), legends as wired for the M8203'},
  'TB8205P/75':{f:'tb8205p75', vb:[2193.7,-1417.5,224,417], src:MASTER, page:'“D8201 TERMINAL OPTIONS” page (2011-12-22)'},
  QC8200:{f:'qc8200', vb:[2124.3,2336,224,416], src:MASTER, page:'“M8203 TERMINAL OPTIONS” page (2011-12-22)'},
  'BNC-1':{f:'bnc1', vb:[328,192,112,208], src:D8204RO, page:'BNC1 on the D8204 sheet (2012-01-16)'},
  'BNC-3':{f:'bnc3', vb:[512,196,124,204], src:D8204RO, page:'BNC3 on the D8204 sheet (2012-01-16)', loop:[589.7,227.5]},
};
function artPanel(){ const a=ART[D.type];
  if (!a) return `<p class="small muted">No drawing of the ${D.type} in any CorelDRAW sheet: the rear-module guides draw the ST8200, not an ST8205, and the 1998 TRM sheets have lost their legends. The terminal list above comes from TERMINAL.DSN.</p>`;
  const [x,y,w,h]=a.vb; let s=`<svg viewBox="${x} ${y} ${w} ${h}" style="width:100%;max-width:330px;display:block;margin:auto;border-radius:4px" role="img" aria-label="${D.type} from the CorelDRAW guide"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/><image href="${ASSET}m8200-terminations-${a.f}.svg" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  if (a.loop) s+=`<g class="tloop" style="cursor:pointer"><title>INPUT LOOP — click to ${D.loop==='75'?'disconnect':'connect'} the loop cable</title><circle cx="${a.loop[0]}" cy="${a.loop[1]}" r="14" fill="rgba(0,0,0,0)"/>${D.loop==='75'?`<circle cx="${a.loop[0]}" cy="${a.loop[1]}" r="13.6" fill="none" stroke="#2f7de1" stroke-width="2.2"/>`:''}</g>`;
  return s+`</svg><div class="small muted" style="text-align:center">CorelDRAW artwork: ${a.page}, ${SIM.src(a.src, a.src.split('/').pop())}.</div>`; }
function termSVG(){
  const t=T[D.type], o=outLevel(); const rows=t.outs; let s=`<svg viewBox="0 0 420 ${rows*22+120}" style="width:100%;max-width:420px"><text x="0" y="16" font-size="13" font-weight="700" fill="var(--ink)">${D.type}</text><text x="0" y="32" font-size="10.5" fill="var(--ink2)">${t.kind} · for ${t.cards}</text>`;
  const col = t.bnc? '#b9bcbf' : t.kind==='solder'? '#c0c0c0' : '#2b8a3e';
  s+=`<rect x="0" y="44" width="150" height="${rows*22+40}" rx="4" fill="#26292c"/>`;
  s+=`<g><title>Input</title><rect x="10" y="52" width="24" height="16" fill="${col}"/><text x="40" y="64" font-size="10.5" fill="#eee">INPUT ${t.bnc?'':'± SH'}</text></g>`;
  if (t.loop) s+=`<g class="tloop" style="cursor:pointer"><title>INPUT LOOP — click</title><circle cx="130" cy="60" r="8" fill="${D.loop==='75'?'var(--accent2)':'#777'}"/></g>`;
  for (let i=0;i<rows;i++){ const y=80+i*22; s+=`<rect x="10" y="${y}" width="24" height="16" fill="${col}"/><text x="40" y="${y+12}" font-size="10.5" fill="#eee">OUT ${i+1}${t.bnc?'':' ±'}</text><line x1="150" y1="${y+8}" x2="230" y2="${y+8}" stroke="var(--ink2)"/>${t.rs?`<rect x="160" y="${y+3}" width="30" height="10" fill="none" stroke="var(--ink)"/><text x="175" y="${y+11}" font-size="8" text-anchor="middle" fill="var(--ink)">${t.rs}R</text>`:''}<text x="236" y="${y+12}" font-size="10.5" fill="var(--accent2)">${o.db.toFixed(1)} ${t.bnc?'dB rel.':'dBu'} @ ${t.bnc?'75 Ω':D.load+' Ω'}</text>`; }
  if (t.rem) s+=`<text x="10" y="${80+rows*22+12}" font-size="10.5" fill="var(--ink)">REM IN: LOW · WIPER · HIGH (10 k linear pot)</text>`;
  return s+`</svg>`;
}
function bindPanel(m){ m.querySelectorAll('.tkey').forEach(g=>g.onclick=()=>A.absKey(g.dataset.k.split('|'))); m.querySelectorAll('.tloop').forEach(g=>g.onclick=()=>A.loop()); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
  <label>Termination <select id="tt">${Object.keys(T).map(k=>`<option ${k===D.type?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>Card output <input type="range" id="ti" min="-10" max="24" value="${D.inDbu}"> <span id="tiv" class="mono"></span></label>
  <label>Load <select id="tl2">${[600,10000,75].map(v=>`<option value="${v}" ${v===D.load?'selected':''}>${v} Ω</option>`).join('')}</select></label>
  <label>Card input (BNC) <select id="tm">${['75','HIZ'].map(v=>`<option ${v===D.term?'selected':''}>${v}</option>`).join('')}</select></label>
  <label>Board drawing <select id="tb">${['TB-BNC','M82BNC','IMP1'].map(v=>`<option ${v===D.board?'selected':''}>${v}</option>`).join('')}</select></label>
  <button id="tr0">Start over</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#tt')) return; const u=()=>q('#tiv').textContent=D.inDbu+' dBu'; u();
  q('#tt').onchange=e=>A.type(e.target.value); q('#ti').oninput=e=>{D.inDbu=+e.target.value; u(); SIM.refresh();}; q('#tl2').onchange=e=>A.load(+e.target.value); q('#tm').onchange=e=>A.term(e.target.value); q('#tb').onchange=e=>A.board(e.target.value); q('#tr0').onclick=()=>A.reset(); }

/* ---------------- lanes ---------------- */
function lanes(){ const css=SIM.css, t=T[D.type], o=outLevel(); return [
  {label: t.bnc? 'AES at OUT 1 (bit cells)' : 'Card output (1 kHz, '+D.inDbu+' dBu)', h:50, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,t.bnc?3.072e6:1000, t.bnc?1:Math.pow(10,(D.inDbu-24)/20), css('--ink2'), t.bnc); }},
  {label: t.bnc? 'At the far end ('+o.note+')' : 'At the load ('+(o.Rs||0)+' Ω → '+D.load+' Ω)', h:50, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,t.bnc?3.072e6:1000, t.bnc?Math.pow(10,o.db/20)*0.5:Math.pow(10,(o.db-24)/20), css('--accent'), t.bnc); }},
];}
function wave(c,X,t0,t1,y,h,f,A_,col,sq){ const span=t1-t0, pw=X(t1)-X(t0); c.strokeStyle=col; if (span*f>pw/3){ c.fillStyle=col; c.globalAlpha=.3; c.fillRect(X(t0),y+h/2-A_*h*0.45,pw,2*A_*h*0.45); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='10px monospace'; c.fillText(`${(span*f).toFixed(0)} cycles in view — zoom in`,X(t0)+6,y+12); return; }
  c.beginPath(); for(let i=0;i<=800;i++){ const t=t0+span*i/800; const v=sq? Math.sign(Math.sin(2*Math.PI*f*t)) : Math.sin(2*Math.PI*f*t); const yy=y+h/2-v*A_*h*0.45; i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); }

/* ---------------- views ---------------- */
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Pick a termination, change the load, or click the keys on the IMP1 (ABS-1) board.</div>'; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('Termination module — outputs at the playhead', `<div id="tm2"></div>${controlsHTML()}`)}${card('The module as the rear-module guide draws it', `<div id="ta"></div>`)}${card('Old boards in this folder (to scale)', `<div id="tg"></div>`)}</div><div>${card('What happened', `<div id="tr" class="log"></div>`)}${card('State', `<div id="in"></div>`)}</div></div>
   ${card('Timeline — signal through the termination', `<canvas id="tl"></canvas><p class="small muted">Zoom to 5 ms for audio or 1 µs for AES.</p>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ m.querySelector('#tm2').innerHTML=termSVG(); m.querySelector('#ta').innerHTML=artPanel(); m.querySelector('#tg').innerHTML=tangoSVG(); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML(); const t=T[D.type], o=outLevel();
    m.querySelector('#in').innerHTML=`<table class="kv"><tr><th>Module</th><td class="mono">${D.type} (${t.kind})</td></tr><tr><th>Cards</th><td>${t.cards}</td></tr><tr><th>Terminals</th><td class="small">${t.io}</td></tr><tr><th>Level</th><td class="mono">${o.db.toFixed(2)} ${t.bnc?'dB rel.':'dBu'} · ${o.note}</td></tr><tr><th>Source</th><td class="small mono">${t.src}</td></tr></table>`;
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:200}); });
}
let lesson=0;
const LESSONS=[
  {title:'What a termination module does', body:`<p>8200-series cards have no connectors of their own. Each slot's <b>rear termination module</b> carries the screw, solder, quick-connect or BNC terminals and plugs into the backplane with a <b>20-way CON20</b> socket. One card can take several module types.</p>`, check:()=>true, auto:true},
  {title:'1 · 60 Ω vs 600 Ω outputs', body:`<p>Pick <b>TB8204P</b> (60 Ω: 30 Ω per leg, on M8204T) and set the load to 600 Ω. The loss is under 1 dB. Now pick <b>TB8204P/600</b>: the 600 Ω build-out halves the voltage into 600 Ω (−6 dB) — the classic matched 600 Ω plant.</p><p><b>Goal:</b> TB8204P/600 into 600 Ω.</p>`, check:()=>D.type==='TB8204P/600'&&D.load===600, hint:'Termination → TB8204P/600, Load → 600 Ω.'},
  {title:'2 · Remote control terminals', body:`<p>The <b>TB8202</b> for the M8202 adds REM IN (LOW, WIPER, HIGH) for a 10 k linear pot, up to 300 m away.</p><p><b>Goal:</b> fit a TB8202.</p>`, check:()=>D.type==='TB8202', hint:'Termination → TB8202.'},
  {title:'3 · BNC loop-through', body:`<p>Pick <b>BNC-3</b>, connect the INPUT LOOP and set the card input to HiZ.</p><p><b>Goal:</b> matched loop-through.</p>`, check:()=>D.type==='BNC-3'&&D.loop==='75'&&D.term==='HIZ', hint:'BNC-3, click the loop dot, Card input → HIZ.'},
  {title:'4 · Something that isn\'t a termination', body:`<p>Switch the board drawing to <b>IMP1</b>. Its own silkscreen says “ABS1-1, AUDIO BIT SPITTER”: a battery AES test generator with sample-rate and level keys. Press a few keys.</p><p><b>Goal:</b> select 44 kHz and −20.</p>`, check:()=>D.abs.fs==='44'&&D.abs.lvl==='−20', hint:'Board drawing → IMP1, click “44” and “−20”.'},
  {title:'Done', body:`<p>See <b>Findings</b>.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — choosing terminations', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div></div><div>${card('Module', `<div id="tm2"></div>${controlsHTML()}`)}${card('Board', `<div id="tg"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#tm2').innerHTML=termSVG(); m.querySelector('#tg').innerHTML=tangoSVG(); bindPanel(m);
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i;draw();});
    const L=LESSONS[lesson], ok=L.check(); m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#r0').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time',draw);
}
function viewSecond(m){ const o=outLevel(), t=T[D.type];
  m.innerHTML=`<div class="grid3">${card('Through one output in one second', `<table class="kv"><tr><th>Signal</th><td class="mono">${t.bnc?'48 000 AES frames':'1000 cycles of 1 kHz'}</td></tr><tr><th>Level at load</th><td class="mono">${o.db.toFixed(2)} ${t.bnc?'dB rel.':'dBu'}</td></tr>${t.bnc?'':`<tr><th>Power in load</th><td class="mono">${(Math.pow(0.775*Math.pow(10,o.db/20),2)/D.load*1000).toFixed(3)} mW</td></tr><tr><th>Heat in build-outs</th><td class="mono">${t.rs?((Math.pow(0.775*Math.pow(10,D.inDbu/20)/(2*t.rs+D.load),2)*2*t.rs)*1000).toFixed(3)+' mW':'—'}</td></tr>`}</table>`)}${card('Module family', `<table class="kv small">${Object.keys(T).map(k=>`<tr><td class="mono">${k}</td><td>${T[k].kind}</td></tr>`).join('')}</table>`)}${card('Connectors', `<table class="kv"><tr><th>To backplane</th><td class="mono">CON20 (20-way)</td></tr><tr><th>Remote</th><td class="mono">CON9 / CON3 (TB8202)</td></tr><tr><th>BNC-2 extras</th><td class="mono">4 × CON4</td></tr><tr><th>BNC-4 extras</th><td class="mono">8 × CON3</td></tr></table>`)}</div>${card('Zoom', `<canvas id="z"></canvas>`)}`;
  SIM.on('time',()=>SIM.drawLanes(m.querySelector('#z'),lanes(),{labelW:200})); }
function viewBlock(m){ const BL={card:{x:10,y:70,w:130,h:60,t:'Card',s:['P1 30-way edge']},bp:{x:180,y:70,w:150,h:60,t:'Backplane',s:['EDAC 30 ↔ SSW-120 20']},mod:{x:370,y:70,w:150,h:60,t:'Termination',s:['CON20 → terminals']},fld:{x:560,y:70,w:120,h:60,t:'Field wiring',s:['screw / solder / BNC']}};
  let s=`<svg viewBox="0 0 700 200" style="width:100%"><defs><marker id="ta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`; ['card','bp','mod'].forEach((k,i)=>{ const a=BL[k], b=BL[['bp','mod','fld'][i]]; s+=`<line x1="${a.x+a.w}" y1="100" x2="${b.x}" y2="100" stroke="var(--ink2)" marker-end="url(#ta)"/>`; });
  for(const k in BL){ const b=BL[k]; s+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="${b.x+8}" y="${b.y+20}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text><text x="${b.x+8}" y="${b.y+40}" font-size="10.5" fill="var(--ink2)">${b.s[0]}</text>`; }
  m.innerHTML=`<div class="grid2">${card('Where a termination sits', s+'</svg><p class="small">Card → backplane (30 contacts) → 20-way socket → the module. Only 20 of the card\'s 30 contacts reach the rear; power and ground stay on the backplane.</p>')}${card('Which module for which card', `<table class="kv small"><tr><th>Module</th><th>Cards</th></tr>${Object.keys(T).map(k=>`<tr><td class="mono">${k}</td><td>${T[k].cards}</td></tr>`).join('')}</table>`)}</div>`; }
function viewSchem(m){ let i=0; const pages=['TB8202','ST8202','TB8204','TB8204P','ST8204','TB8205','TB8205P','ST8205','BNC-1','BNC-2','BNC-3','BNC-4'];
  const SH=pages.map(p=>({name:p, svg:()=>{ const t=T[p]||{io:p==='BNC-2'?'IN + 4 OUT BNC + 4 × CON4 (analog L/R)':'IN + LOOP + 4 OUT BNC + 8 × CON3 (pluggable analog)',outs:p==='BNC-2'||p==='BNC-4'?4:8,rs:0,kind:'BNC'}; let s=`<rect x="300" y="40" width="40" height="${20*16}" fill="var(--panel2)" stroke="var(--ink)"/><text x="320" y="32" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">CON20</text>`;
    const labels=['INPUT +','INPUT −','SHIELD'].concat(Array.from({length:t.outs},(_,k)=>['OUT '+(k+1)+' +','OUT '+(k+1)+' −'])).flat().slice(0,19); labels.forEach((l,k)=>{ const y=52+k*16; s+=`<text x="296" y="${y+4}" text-anchor="end" font-size="10" fill="var(--ink)">${k+1}</text><line x1="340" y1="${y}" x2="${t.rs?440:520}" y2="${y}" stroke="var(--ink)"/>${t.rs&&/OUT/.test(l)?`<rect x="440" y="${y-5}" width="40" height="10" fill="none" stroke="var(--ink)"/><text x="460" y="${y+3}" font-size="8" text-anchor="middle" fill="var(--ink)">${t.rs}R</text><line x1="480" y1="${y}" x2="520" y2="${y}" stroke="var(--ink)"/>`:''}<text x="526" y="${y+4}" font-size="10.5" fill="var(--accent2)">${l}</text>`; });
    return s+`<text x="40" y="60" font-size="12" font-weight="700" fill="var(--ink)">${p}</text><text x="40" y="80" font-size="10.5" fill="var(--ink2)">${t.io}</text><text x="40" y="380" font-size="10" fill="var(--ink2)">CON20 pin order ${'inferred'}; terminal names from TERMINAL.DSN / TRM.CDR</text>`; }}));
  m.innerHTML=card('TERMINAL.DSN — the twelve pages, redrawn (not the OrCAD sheets)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SH.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();}); m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 400" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><text x="840" y="392" text-anchor="end" font-size="10" fill="var(--ink2)">TERMINAL.DSN · page ${i+1}/12 · redrawn 2026|59</text>${SH[i].svg()}</svg>`; }; draw(); }
function viewSoft(m){ m.innerHTML=`<div class="grid2">${card('Signal path, stage by stage', `<div id="sp"></div>`)}${card('Build-out resistor maths', `<p class="small">V<sub>load</sub> = V<sub>card</sub> × R<sub>L</sub> / (R<sub>L</sub> + 2R<sub>s</sub>). 60 Ω source (2 × 30R) into 600 Ω: −0.83 dB; into 10 kΩ: −0.05 dB. 600 Ω source (2 × 300R) into 600 Ω: −6.02 dB. M8204T.PCB carries the 30R 1 W parts (“X 30R 1W”).</p>`)}</div>`;
  SIM.on('time',()=>{ const t=T[D.type], o=outLevel(); m.querySelector('#sp').innerHTML=`<table class="kv"><tr><th>Card driver</th><td class="mono">${t.bnc?'75 Ω AES':D.inDbu+' dBu'}</td></tr><tr><th>Backplane</th><td class="mono">EDAC 30 → SSW-120 20</td></tr><tr><th>Module</th><td class="mono">${D.type}${t.rs?' · 2 × '+t.rs+'R':''}</td></tr><tr><th>Load</th><td class="mono">${t.bnc?'75 Ω':D.load+' Ω'}</td></tr><tr><th>Result</th><td class="mono">${o.db.toFixed(2)} · ${o.note}</td></tr></table>`; }); }
function viewNotes(m){ m.innerHTML=card('What this folder is up to — findings', `<ol>
   <li><b>IMP1.PCB is not a termination.</b> Its own text reads “ABS1-1, AUDIO BIT SPITTER”: a battery-powered AES test generator (PIC16C62-10, EPM7064S with JTAG, CS8402A transmitter, CS8412, CS4330, 27C512, MAX777L/MAX1044, XLR-F, LEFT/RIGHT jacks) with eight keys OFF/48/44/32/EXT/0dB/−12/−20. The README guessed “impedance or adapter PCB”. It is a sibling of the ABB-1 Audio Bit Buddy named in the D8205/D8208 manual text.</li>
   <li><b>TERMINAL.DSN is the whole termination family.</b> Twelve pages (TB8202, ST8202, TB8204, TB8204P, ST8204, TB8205, TB8205P, ST8205, BNC-1…4), each with a 20-way CON20 to the backplane, titled “MF8212 TERMINAL BLOCK”, “MF8210 BNC TERMINAL” and an “SA14-146 TERMINAL INTERFACE ASSEMBLY”.</li>
   <li><b>…and it carries an amplifier's parts list.</b> The same file's library cache holds 5532, LF353, TIP29C/TIP30C, 2N4401 and the values 36K, 8K25, 16K2 that also appear in M8202.DSN — the M8202 remote-gain amplifier's parts. The design was started from the M8202 schematic.</li>
   <li><b>Build-out resistors live on the termination for the M8204.</b> M8204T.PCB holds “30R 1W” resistors, so TB8204P (60 Ω) and TB8204P/600 differ only in the module. M8204T.PCB also contains the string “D8205” — a leftover.</li>
   <li><b>The 1998 catalogue offered more than the 2012 sheets.</b> TRM/TRMSALE CDRs list QC8200 quick-connect, ST8200/ST8204 solder and TB8205P/75 terminals. The 2012 per-card “rear module options” sheets show only TB and BNC modules. The 2011 master (${SIM.src(MASTER,'8200 Series - Rear module drawing Master.cdr')}) still draws every one of them, which is where the artwork here comes from.</li>
   <li><b>Artwork ${SIM.year(2026)}: every module now has its CorelDRAW drawing</b>, except the ST8205, which no sheet draws. The modules are cut from the 2011 master, from ${SIM.src(TR2,'M8202TR2.CDR')} (ST8202) and from ${SIM.src(D8204RO,'D8204 - rear module options.cdr')} (BNC1/BNC3). The folder’s own ${SIM.src('#MF8200 #SERIES/M8200 - TERMINATIONS #MF82/TRM.CDR','TRM.CDR')}, ${SIM.src('#MF8200 #SERIES/M8200 - TERMINATIONS #MF82/TRMSALE1.CDR','TRMSALE1.CDR')} and ${SIM.src('#MF8200 #SERIES/M8200 - TERMINATIONS #MF82/TRMSALE2.CDR','TRMSALE2.CDR')} (Oct 1998, CorelDRAW 5) convert as six module outlines per sheet, with every legend scrambled into one column of wrong characters, so they could not be used as panels.</li>
   <li><b>The guide draws one module per card, and the legends change with the card.</b> On the M8203 page the TB8205 brings out only OUT 1–4 and a “MIC OUT” pair (“MIC OUT : 150 Ω, −60 dBm”), and the TB8205P marks its input positions “NOT CONNECTED” beside a passive input loop. On the D8201 page the TB8205P/75 carries a BNC “INPUT”. The board is the same in each case.</li>
   <li><b>The QC8200 on the M8203 page is mostly empty.</b> Of its 20 quick-connect tabs, only OUT 1–4, GND and MIC OUT have legends.</li>

   <li><b>M82BNC.PCB is half TB8202.</b> Its PHEN9 J52/J53, PHEN3 J54/J55 and R400UP J64–J69 parts are the same designators as <span class="mono">TB8202-2.PCB</span> in the TB8202 folder — a panel combining TB8202 screw terminals with eight BNCs.</li>
   <li><b>Overlap.</b> The BNC boards here (M82BNC 1997|30, TB-BNC 1997|30) predate the BNC1–BNC4 set in “M8200 Extender, handle”, which is the current one. The empty OnlineDRC report is dated 09-Jun-10.</li>
  </ol>`)+card('Assumptions', `<ul class="small"><li>CON20 pin order and the per-page terminal lists are reconstructed from labels, ${inf}.</li><li>ABS-1 key behaviour ${inf} from key legends.</li><li>Card output level and the ideal resistive model ${inf}.</li></ul>`)+card('Sources', `<ul class="small mono"><li>M8200 - TERMINATIONS #MF82/TERMINAL.DSN, TRM.CDR, TRMSALE1/2.CDR</li><li>…/TB-BNC.PCB, M82BNC.PCB, M8204T.PCB, IMP1.PCB, 82M49.DWG</li><li>M8202A - #Engineering/M8202MAN.pdf · rear module options PDFs</li></ul>`); }
SIM.register({
  id:'m8200-terminations', name:'M8200 · Termination modules (1997–2005|30–38)', duration:1,
  product:'M8200 - TERMINATIONS', year:1998, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/M8200 - TERMINATIONS #MF82',
  summary:'The rear termination family for 8200-series cards: screw, pluggable, solder, quick-connect and BNC modules that plug into the frame backplane with a 20-way connector. Try 60 Ω and 600 Ω build-outs into real loads, BNC loop-through, and the misfiled “Audio Bit Spitter” test board.',
  highlights:['Each module drawn from the CorelDRAW rear-module guides','13 module types from TERMINAL.DSN and the 1998 catalogue','60 Ω vs 600 Ω build-out maths','Old BNC boards drawn from Tango coordinates','IMP1.PCB is an AES test generator','Amplifier parts left in the terminal schematic'],
  footnotes:[
    {text:'TRM.CDR, TRMSALE1.CDR and TRMSALE2.CDR (1998) keep their module outlines but lose every legend in conversion; the rendered TRM.pdf shows the text as a column of “?” glyphs.', src:'#MF8200 #SERIES/M8200 - TERMINATIONS #MF82/TRM.pdf'},
    {text:'No CorelDRAW sheet draws an ST8205: the rear-module guides use the ST8200 solder terminal for those cards.', src:MASTER},
    {text:'On the M8203 page the TB8205 carries a “MIC OUT : 150 Ω, −60 dBm” pair in place of outputs 5–8.', src:MASTER},
    {text:'On the M8203 page the TB8205P’s input positions read “NOT CONNECTED”, beside a “PASSIVE INPUT LOOP” block.', src:MASTER},
    {text:'The 2011 master draws the TB8204P and the TB8204P/600 as one drawing headed “TB8204P & TB8204P/600”.', src:MASTER},
    {text:'The screw-terminal TB8204 is headed “TB204 & TB8204/600” on the M8204 & M8204A page, with the 8 missing.', src:MASTER},
  ],
  depth:'Hardware model',
  stepUnits:[{label:'1 µs',period:()=>1e-6},{label:'1 ms',period:()=>0.001}],
  zooms:[[1,'1 s'],[0.005,'5 ms (audio)'],[0.000002,'2 µs (AES)']],
  defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
