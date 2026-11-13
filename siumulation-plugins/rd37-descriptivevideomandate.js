/* =====================================================================
   RD37 — Descriptive Video Mandate (Ward-Beck R&D register, Peter, status "?")
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD37 is regulatory and market research (2011|44): what the CRTC described-video (DV)
   rules would ask of a broadcaster's plant. The plugin models two things from the archive:
   1. The obligation and its cost, from the RD37 documents:
      - ResearchResources.xlsx/.xls (CRTC links; 2009-430 §114 working group within 12 months;
        working-group goal "year 2020 100% descriptive video"; Ryerson/CTV live-event trials)
      - ConnectursConsultingFinal_Report_Described_Video_Canadian_Private_Television.pdf
        (2 h/week rising to 4 h/week by Sept 2006; 21 h/week English OTA, 54 with specialty;
         4 / 18 h French; The Accessible Channel 168 h/week; $1,600/h English, $1,750/h French,
         closed captioning ~$300/h; 3–5 days English / 2 weeks French; Franklin $800 per half hour;
         ~$30,000/yr distribution; users turn on SAP)
   2. The audio plumbing a station needs, from the WBS card that already did it for CTV:
      #OPENGEAR #SERIES/M6205 …/m6205c200/  — "M6205c200 switching rules.doc" (5 input layouts,
      AES4 = DV/PGM mono, GPI1, metadata, Dolby E on AES2), sharc/v104/sample.c (the mix code),
      backgnd.c (refresh_data, dial_norm_extract, mix LUTs), RampAudio.c (RAMP_TC_LEVEL1),
      volume_data.c (gain table), M6205C200 SOFTWARE HISTORY.xls, T6307 rear module README.
   Card panel: openGear cards have no front panel; the card edge DIP switches (SW1–SW8) and the
   T6307 rear connector list are drawn from the switching-rules document and the T6307 README.
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
const FS = 48000;
const TAU_RAMP = 1/(0.00199999*FS);           // RampAudioCalc(…,1) once per sample IRQ → τ ≈ 10.4 ms (inferred rate)
const volDb = i => i<=0 ? -Infinity : Math.min(15, i-61);   // volume_data.c: idx 1 = −60 dB, 61 = 0 dB, ≥76 = +15 dB
const volLin = i => i<=0 ? 0 : Math.pow(10, volDb(i)/20);
const AC3_CMIX=[0.707,0.595,0.5,0], AC3_SMIX=[0.707,0.5,0,0], EXT_MIX=[1.414,1.189,1.0,0.841,0.707,0.595,0.5,0];
/* switching rules doc: expected input layouts (columns Input 1…5) */
const LAYOUT = [
  {n:1, aes:['L/R','—','—','—','—','—'], txt:'stereo only'},
  {n:2, aes:['L/R','—','—','DV','—','—'], txt:'stereo + DV'},
  {n:3, aes:['L/R','C/LFE','Ls/Rs','DV','St L/R','Dolby E'], txt:'5.1 + DV + stereo + Dolby E'},
  {n:4, aes:['L/R','C/LFE','Ls/Rs','DV','St L/R','—'], txt:'5.1 + DV + stereo'},
  {n:5, aes:['L/R','Dolby E','—','—','—','—'], txt:'stereo + Dolby E on AES2'},
];
const D = {
  layout:3, gpi1:false, meta:true, dolbyOn2:false, sw3:false,
  progIdx:61, mixIdx:61, dvIdx:61, dialnorm:24, dnEnable:true, acmod:7, extbsi:0, preferred:1, cmix:0, smix:0, ltrtc:4, ltrts:4,
  ramp:{ dv:{from:1,to:1,t0:0}, prog:{from:1,to:1,t0:0}, mix:{from:1,to:1,t0:0} },
  hours:4, lang:'EN', series:3, oblig:'2006',
};
function reset(){ Object.assign(D,{layout:3,gpi1:false,meta:true,dolbyOn2:false,sw3:false,progIdx:61,mixIdx:61,dvIdx:61,dialnorm:24,dnEnable:true,acmod:7,extbsi:0,preferred:1,cmix:0,smix:0,ltrtc:4,ltrts:4,hours:4,lang:'EN',series:3,oblig:'2006'});
  D.ramp={dv:{from:1,to:1,t0:0},prog:{from:1,to:1,t0:0},mix:{from:1,to:1,t0:0}}; LOG.items=[]; SIM.refresh(); }
const has = k => LAYOUT[D.layout-1].aes.includes(k);
function gainAt(r, t){ if (t<=r.t0) return r.from; return r.to + (r.from-r.to)*Math.exp(-(t-r.t0)/TAU_RAMP); }
function setRamp(key, idx){ const r=D.ramp[key]; const now=gainAt(r,SIM.t); D.ramp[key]={from:now,to:volLin(idx),t0:SIM.t}; }

/* ---------------- program material (synthetic, inferred): dialogue with a pause; DV narration fills the pause ---------------- */
const SPEECH = [[0.02,0.34],[0.62,0.97]], NARR = [[0.38,0.58]];
const inSeg = (t,S)=> S.some(([a,b])=>t>=a&&t<b);
const env = (t,S)=>{ for (const [a,b] of S) if (t>=a&&t<b) return Math.min(1,(t-a)/0.01,(b-t)/0.01); return 0; };
function inputs(t){
  const tw=2*Math.PI*t, dlg=env(t,SPEECH)*(0.6+0.4*Math.sin(2*Math.PI*4*t)), mus=0.35;
  const L = has('L/R') ? 0.10*dlg*Math.sin(tw*220) + 0.05*mus*Math.sin(tw*110) : 0;
  const R = has('L/R') ? 0.10*dlg*Math.sin(tw*220) + 0.05*mus*Math.sin(tw*165) : 0;
  const C = has('C/LFE') ? 0.12*dlg*Math.sin(tw*220) : 0, LFE = has('C/LFE') ? 0.03*Math.sin(tw*45) : 0;
  const Ls = has('Ls/Rs') ? 0.04*mus*Math.sin(tw*330) : 0, Rs = has('Ls/Rs') ? 0.04*mus*Math.sin(tw*440) : 0;
  const DV = has('DV') ? 0.10*env(t,NARR)*(0.6+0.4*Math.sin(2*Math.PI*5*t))*Math.sin(tw*180) + 0.05*mus*Math.sin(tw*110)*0.8 + 0.08*dlg*Math.sin(tw*220) : 0;  // a DV feed is the full mix + narration
  const StL = has('St L/R') ? L : 0, StR = has('St L/R') ? R : 0;
  return [L,R,C,LFE,Ls,Rs,DV,0,StL,StR];
}
/* sample.c (v104) for the CTV C200: audio_out_float[0..9] = AES1L … AES5R */
function process(t, trace){
  const tr = trace || (()=>{});
  const pg = gainAt(D.ramp.prog,t), mg = gainAt(D.ramp.mix,t), dg = gainAt(D.ramp.dv,t);
  const x = inputs(t); for (let i=0;i<6;i++) x[i]*=pg;                          // while(i<6) audio_in_float[i]*=program_gain
  const o = new Array(10).fill(0);
  o[0]=x[0]; o[1]=x[1]; let mono=(x[0]+x[1])/2;                                  // aes1 in → out always; mono from st aes1
  const dn = D.meta && D.dnEnable && D.dialnorm ? volLin(D.dialnorm+30) : 1;   // dial_norm_extract (dn_gain = 1.0 when dialnorm = 0)
  if (!D.meta){ o[8]=x[0]; o[9]=x[1]; o[2]=o[3]=o[4]=o[5]=0; tr('altera_data_in[6] bit 15 = 0 (no metadata) → AES5 = ST L/R from AES1; C, LFE, Ls, Rs outputs = 0'); }
  else {
    let Lm, Rm;
    if (D.extbsi===0){ const c=AC3_CMIX[D.cmix], s=AC3_SMIX[D.smix]; Lm=x[0]+c*x[2]-s*x[4]-s*x[5]; Rm=x[1]+c*x[2]+s*x[4]+s*x[5]; tr(`ext_bsi = 0 → Lt/Rt from ac3 cmix ${c} / smix ${s}`); }
    else if (D.preferred===2){ const c=EXT_MIX[D.ltrtc], s=EXT_MIX[D.ltrts]; Lm=x[0]+c*x[2]+s*x[4]; Rm=x[1]+c*x[2]+s*x[5]; tr(`preferred = 2 → Lo/Ro, cmix ${c}, smix ${s}`); }
    else { const c=EXT_MIX[D.ltrtc], s=EXT_MIX[D.ltrts]; Lm=x[0]+c*x[2]-s*x[4]-s*x[5]; Rm=x[1]+c*x[2]+s*x[4]+s*x[5]; tr(`Lt/Rt, ltrt cmix ${c}, smix ${s}`); }
    if (D.acmod===1){ mono=x[2]*dn; o[8]=x[2]; o[9]=x[2]; tr('ac_mode = 1 (mono) → mono = centre × dn_gain'); }
    else { mono=(Lm+Rm)*mg*dn; o[8]=Lm; o[9]=Rm; tr(`mono = (Lmix+Rmix) × mixdown_gain × dn_gain (the ×0.5 line above it is overwritten)`); }
    o[2]=x[2]; o[3]=x[3]; o[4]=x[4]; o[5]=x[5];
    o[8]*=mg*dn; o[9]*=mg*dn;
  }
  o[6]=x[6]*dg; o[7]=mono;                                                         // pass DV; mono program on AES4B always
  if (D.gpi1){ o[6]=mono; tr('GPI1 active (Reg 7 bit 25 low) → AES4A = mono program (create DV)'); }
  else tr(`GPI1 idle → AES4A = DV input × dv_gain (${fmt(20*Math.log10(Math.max(dg,1e-9)),1)} dB)`);
  for (let i=0;i<10;i++) o[i]=clamp(o[i],-1,0.9999999);                           // clip as in sample.c
  return o;
}
/* AES6: Dolby E path (TDM 11/12 passed straight through in v104) */
function aes6(){ if (has('Dolby E') || D.dolbyOn2) return D.dolbyOn2 && !has('Dolby E') ? 'Dolby E (from AES2, per doc)' : 'Dolby E pass'; return has('Dolby E')?'Dolby E':'AES6 in'; }
const OUTN = ['AES1 L','AES1 R','AES2 C','AES2 LFE','AES3 Ls','AES3 Rs','AES4 A (DV)','AES4 B (PGM mono)','AES5 L (Lt/Rt)','AES5 R'];
function levels(t, win){ win=win||0.01; const pk=new Array(10).fill(0); for(let k=0;k<96;k++){ const o=process(t-win*k/96); o.forEach((v,i)=>pk[i]=Math.max(pk[i],Math.abs(v))); } return pk.map(v=>v>1e-6?20*Math.log10(v):-99); }

/* ---------------- obligation / cost model (Connectus report figures) ---------------- */
const OBL = { '2002':{h:2,txt:'2001–2002 licence renewals: 2 h/week'}, '2006':{h:4,txt:'4 h/week by September 2006'}, '2020':{h:168,txt:'Working-group goal: 100 % by 2020|53 (24 × 7)'} };
function cost(){ const per = D.lang==='EN'?1600:1750, cc=300; const weeksNew = D.hours*52;
  return { per, cc, perYear: per*weeksNew, ccYear: cc*weeksNew, ratio: per/cc, franklin: 26*2*800, dist:30000, turn: D.lang==='EN'?'3–5 days':'2 weeks' }; }

/* ---------------- actions ---------------- */
const A = {
  gpi(){ act(D.gpi1?'GPI1 released':'GPI1 closed (create DV)', tr=>{ D.gpi1=!D.gpi1; tr('Reg 7 bit 25 (gpi1) read by sample.c every sample: (altera_data_in[7] & 0x02000000)==0 → active'); process(SIM.t,tr); tr('Use: a station with no described version on air can still put a mono program on the SAP/DV path, so the second audio service is never silent.'); }); },
  meta(){ act(D.meta?'Metadata lost':'Metadata present', tr=>{ D.meta=!D.meta; tr(D.meta?'Reg 7 bit 15 (Vanc Detected) = 1 → refresh_meta_data parses acmod, mix levels, dialnorm':'No metadata → doc says “pass all”'); process(SIM.t,tr); }); },
  layout(n){ act('Input layout '+n, tr=>{ D.layout=+n; tr(`Switching rules column Input ${n}: ${LAYOUT[n-1].aes.join(' · ')}`); }); },
  dolby2(){ act('Dolby E on AES2 '+(D.dolbyOn2?'off':'on'), tr=>{ D.dolbyOn2=!D.dolbyOn2; tr('Doc: with Dolby E on AES2 and no decoder, AES2/AES3 out mute and AES6 = AES in2. v104 sample.c has that echo commented out (TDM_out[11/12] = TDM_in[11/12])'); }); },
  sw3(){ act('SW3 Dolby decoder '+(D.sw3?'off':'on'), tr=>{ D.sw3=!D.sw3; tr('SW3: swap embedded channels 8–16 with the Dolby decoder outputs (Reg 110 bit 17); doc adds “Add Vanc meta data”'); }); },
  gain(key, d){ const nm={dv:'DV gain',prog:'Program gain',mix:'Mixdown gain'}[key]; act(`${nm} ${d>0?'+1':'−1'} dB`, tr=>{
    const f={dv:'dvIdx',prog:'progIdx',mix:'mixIdx'}[key]; D[f]=clamp(D[f]+d,0,76); setRamp(key,D[f]);
    const reg={dv:'Reg 3 bits 31..24',prog:'Reg 2 bits 15..8',mix:'Reg 2 bits 7..0'}[key];
    tr(`DashBoard slider (v1.0.4) → Atmel writes index ${D[f]} into ${reg}`);
    tr(`refresh_data(): ${key}_gain_target = volume[${D[f]}] = ${volDb(D[f])===-Infinity?'mute':volDb(D[f])+' dB'}; ${key}_gain = RampAudioCalc(current, target, 1)`);
    tr(`RAMP_TC_LEVEL1 = 0.002 per call → τ ≈ ${fmt(TAU_RAMP*1e3,1)} ms if called once per sample (${inf})`); }); },
  dialnorm(d){ act(`Dialnorm ${d>0?'+':'−'}1`, tr=>{ D.dialnorm=clamp(D.dialnorm+d,1,31); tr(`ac3_dialnorm = ${D.dialnorm} → dn_gain = volume[${D.dialnorm}+30] = ${volDb(D.dialnorm+30)} dB, applied to the mono and the AES5 downmix only`); }); },
  acmod(){ act('acmod '+(D.acmod===7?'→ 1 (mono)':'→ 7 (3/2)'), tr=>{ D.acmod = D.acmod===7?1:7; tr(`ac_mode = ${D.acmod}: ${D.acmod===1?'mono source → DV mono is the centre channel':'3/2 → mono is the Lt/Rt fold-down'}`); }); },
  dmix(){ act('Downmix mode', tr=>{ if (D.extbsi===0){ D.extbsi=1; D.preferred=1; } else if (D.preferred===1) D.preferred=2; else D.extbsi=0;
    tr(D.extbsi===0?'ext_bsi = 0: legacy ac3 cmix/smix LUTs {0.707,0.595,0.5,0}':D.preferred===2?'extended BSI, preferred = Lo/Ro':'extended BSI, preferred = Lt/Rt (ext_mix_lut)'); }); },
  hours(d){ act('Hours per week', tr=>{ const opts=[2,4,8,14,21,54,168]; let i=opts.indexOf(D.hours); i=clamp((i<0?1:i)+d,0,opts.length-1); D.hours=opts[i]; const c=cost(); tr(`${D.hours} h/week of new DV × 52 × $${c.per} = $${c.perYear.toLocaleString()} per year (Connectus, ${D.lang==='EN'?'English':'French'} rate)`); }); },
  lang(){ act('Language', tr=>{ D.lang=D.lang==='EN'?'FR':'EN'; tr(`${D.lang==='EN'?'English: $1,600/h, 3–5 days':'French: $1,750/h, 2 weeks'} turnaround (Connectus §4)`); }); },
  oblig(k){ act('Obligation → '+OBL[k].txt, tr=>{ D.oblig=k; D.hours=OBL[k].h; tr(OBL[k].txt); if (k==='2020') tr('ResearchResources.xlsx: “year 2020 100% descriptive video: goal of Working Group” (CRTC transcript tb1204, 2011)'); }); },
};

/* ---------------- card edge + rear module drawing ---------------- */
function cardSVG(t){
  const lv = levels(t), meter=(x,y,db,lbl)=>{ const n=Math.round(clamp((db+60)/60,0,1)*20); let s=`<text x="${x}" y="${y-4}" font-size="11" fill="#cfd3d6">${lbl}</text>`; for(let i=0;i<20;i++) s+=`<rect x="${x+i*9}" y="${y}" width="7" height="12" fill="${i<n?(i>16?'#e3453a':i>12?'#e8b23a':'#3fbf5f'):'#2a2f2a'}"/>`; return s+`<text x="${x+186}" y="${y+10}" font-size="10" fill="#cfd3d6">${db>-99?fmt(db,1):'—'}</text>`; };
  const dip=(i,on,lbl)=>`<g data-a="dip" data-v="${i}" style="cursor:pointer"><rect x="${60+i*44}" y="60" width="30" height="56" rx="3" fill="#c33" /><rect x="${64+i*44}" y="${on?64:90}" width="22" height="22" fill="#eee"/><text x="${75+i*44}" y="132" text-anchor="middle" font-size="11" fill="#cfd3d6">${i+1}</text><title>SW${i+1}: ${lbl}</title></g>`;
  const sws=[[false,'groups enabled (1)'],[false,'groups enabled (0)'],[D.sw3,'Dolby decoder enable'],[false,'HD audio clock'],[false,'delay PCM'],[D.dnEnable,'dialnorm'],[true,'default from memory'],[false,'DashBoard disable']];
  const bnc=(x,y,lbl,col)=>`<circle cx="${x}" cy="${y}" r="15" fill="#9c8233" stroke="#5e4d1c" stroke-width="2"/><circle cx="${x}" cy="${y}" r="6" fill="#7a5f12"/><text x="${x+24}" y="${y+4}" font-size="11" fill="${col||'#cfd3d6'}">${lbl}</text>`;
  return `<svg viewBox="0 0 1000 420" style="width:100%;max-width:980px;border-radius:8px;display:block" role="img" aria-label="M6205C200 card edge and T6307 rear module">
    <rect width="1000" height="420" rx="10" fill="var(--dev)"/>
    <text x="30" y="34" font-size="16" font-weight="700" fill="#e6e8ea">M6205C200 card edge — DIP SW1–SW8</text>
    ${sws.map((s,i)=>dip(i,s[0],s[1])).join('')}
    <text x="30" y="160" font-size="12" fill="#9aa0a5">SW3 decoder · SW6 dialnorm are live; the rest are shown at their default (switching rules doc)</text>
    <text x="30" y="196" font-size="14" font-weight="700" fill="#e6e8ea">Output meters (peak over 10 ms)</text>
    ${[0,1,2,4,6,7,8,9].map((k,j)=>meter(30+(j%2)*240,222+Math.floor(j/2)*36,lv[k],OUTN[k])).join('')}
    <rect x="560" y="20" width="420" height="380" rx="8" fill="#141618" stroke="#30333a"/>
    <text x="580" y="46" font-size="14" font-weight="700" fill="#e6e8ea">T6307 rear module (single slot)</text>
    ${bnc(600,90,'SDI IN')}${bnc(600,130,'SDI OUT 1')}${bnc(600,170,'SDI OUT 2')}${bnc(800,90,'AES OUT1 L/R')}${bnc(800,130,'BNC4 C/LFE')}${bnc(800,170,'AES OUT2 Ls/Rs')}${bnc(800,210,'AES IN1')}
    <g data-a="gpi" style="cursor:pointer"><rect x="585" y="240" width="190" height="44" rx="5" fill="#1f8a45" stroke="#0e4d25"/><text x="600" y="267" font-size="13" fill="#fff">GPI/O TB · GPI1 ${D.gpi1?'CLOSED':'open'}</text><title>Click to close / open GPI1 (create DV)</title></g>
    <circle cx="760" cy="262" r="8" fill="${D.gpi1?'var(--led-a)':'var(--led-off)'}"/>
    <g data-a="meta" style="cursor:pointer"><rect x="585" y="296" width="190" height="44" rx="5" fill="#1f8a45" stroke="#0e4d25"/><text x="600" y="323" font-size="13" fill="#fff">METADATA TB · ${D.meta?'present':'none'}</text></g>
    <text x="580" y="372" font-size="11" fill="#9aa0a5">7 BNC + 3 Phoenix TB, connector list from M6205-T6307.pdf via the T6307 README;</text>
    <text x="580" y="388" font-size="11" fill="#9aa0a5">positions drawn for clarity (inferred).</text>
  </svg>`;
}
function bindCard(root){ bindActs(root, { gpi:()=>A.gpi(), meta:()=>A.meta(), dip:v=>{ if(+v===2) A.sw3(); else if(+v===5) act('SW6 dialnorm',tr=>{ D.dnEnable=!D.dnEnable; tr('SW6 → Reg 2 bit 16 dialnorm on/off: '+(D.dnEnable?'on':'off')); }); else act('SW'+(+v+1),tr=>tr('Shown for reference; not modelled')); } }); }
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <label class="small">Input layout <select id="lay">${LAYOUT.map(l=>`<option value="${l.n}" ${l.n===D.layout?'selected':''}>${l.n}: ${l.txt}</option>`).join('')}</select></label>
    <button data-a="gpi">GPI1 ${D.gpi1?'open':'close'}</button><button data-a="meta">metadata ${D.meta?'off':'on'}</button>
    <span class="small muted">DV</span><button data-a="g" data-v="dv,-1">−</button><button data-a="g" data-v="dv,1">+</button>
    <span class="small muted">PGM</span><button data-a="g" data-v="prog,-1">−</button><button data-a="g" data-v="prog,1">+</button>
    <span class="small muted">Mixdown</span><button data-a="g" data-v="mix,-1">−</button><button data-a="g" data-v="mix,1">+</button>
    <button data-a="dn" data-v="-1">dialnorm −</button><button data-a="dn" data-v="1">dialnorm +</button><button data-a="ac">acmod</button><button data-a="dm">downmix</button><button data-a="d2">Dolby E on AES2</button><button data-a="rst">defaults</button></div>`;
}
function bindControls(root){ bindActs(root, { gpi:()=>A.gpi(), meta:()=>A.meta(), g:v=>{ const [k,d]=v.split(','); A.gain(k,+d); }, dn:v=>A.dialnorm(+v), ac:()=>A.acmod(), dm:()=>A.dmix(), d2:()=>A.dolby2(), rst:()=>reset() });
  const s=root.querySelector('#lay'); if (s) s.onchange=e=>A.layout(e.target.value); }
function routingTable(){
  const o = process(SIM.t); const src = [
    'AES1 L in', 'AES1 R in', D.meta?'AES2 C in':'0 (no metadata)', D.meta?'AES2 LFE in':'0', D.meta?'AES3 Ls in':'0', D.meta?'AES3 Rs in':'0',
    D.gpi1?'mono program':'AES4 A in (DV) × dv_gain', D.meta&&D.acmod===1?'centre × dn_gain':D.meta?'(Lt+Rt) × mixdown × dn_gain':'(L+R)/2 of AES1',
    D.meta?'Lt (or Lo) × mixdown × dn_gain':'AES1 L', D.meta?'Rt (or Ro) × mixdown × dn_gain':'AES1 R'];
  return tbl(['Output','Source in v104 sample.c','now'], OUTN.map((n,i)=>[n,src[i],`<span class="mono">${fmt(o[i],4)}</span>`]).concat([['AES6','TDM_out[11/12] = TDM_in[11/12]',aes6()]]));
}

/* ---------------- timeline ---------------- */
function lanes(){
  const css=SIM.css, ls=[];
  ls.push({label:'SHARC SampleIRQ (48 kHz)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/FS,0,0.2/FS,css('--accent'),'sample IRQ → sample.c mix'); }});
  ls.push({label:'Programme dialogue (inferred)', h:22, draw(c,X,t0,t1,y,h){ SPEECH.forEach(([a,b])=>bandAt(c,X,a,b,y,h,css('--accent2'),.45,'dialogue')); }});
  ls.push({label:'DV narration in pauses (AES4 A in)', h:22, draw(c,X,t0,t1,y,h){ if (!has('DV')){ laneText(c,X,t0,y,h,'no DV input in this layout'); return; } NARR.forEach(([a,b])=>bandAt(c,X,a,b,y,h,css('--warn'),.6,'described narration')); }});
  ls.push({label:'GPI1 / metadata', h:22, draw(c,X,t0,t1,y,h){ laneText(c,X,t0,y,h,`GPI1 ${D.gpi1?'ACTIVE → AES4A = mono program':'idle'} · metadata ${D.meta?'present':'absent'}`, D.gpi1?css('--warn'):css('--ink2')); }});
  ls.push({label:'dv_gain ramp (RampAudioCalc)', h:30, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--accent'); c.beginPath(); const N=300; for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const g=gainAt(D.ramp.dv,t); const db=g>0?20*Math.log10(g):-60; const yy=y+h-3-(clamp(db,-30,15)+30)/45*(h-6); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('−30…+15 dB', X(t1)-70, y+10); }});
  [0,6,7,8].forEach(k=> ls.push({label:OUTN[k], h:34, draw(c,X,t0,t1,y,h){
    const N=Math.min(1600,Math.max(200,(X(t1)-X(t0))*1.5)); const span=t1-t0; c.strokeStyle=k===6?css('--warn'):k===7?css('--bad'):css('--accent'); c.lineWidth=1; c.beginPath();
    const sc=(h/2-3)/0.25;
    if (span>0.03){ const px=Math.max(50,Math.floor(X(t1)-X(t0))); c.fillStyle=c.strokeStyle; c.globalAlpha=.55;
      for(let i=0;i<px;i+=2){ let pk=0; for(let j=0;j<6;j++){ const tt=t0+span*(i+j/6)/px; pk=Math.max(pk,Math.abs(process(tt)[k])); } const a=clamp(pk*sc,0,h/2-2); c.fillRect(X(t0)+i,y+h/2-a,2,2*a); }
      c.globalAlpha=1; return; }
    for(let i=0;i<=N;i++){ const t=t0+span*i/N; const tt=span>0.02? Math.round(t*FS)/FS : Math.floor(t*FS)/FS; const v=process(tt)[k]; const yy=y+h/2-clamp(v*sc,-h/2+2,h/2-2); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); }}));
  return ls;
}

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>
    ${card('The DV path a station needed — M6205C200 card edge and T6307 rear (click GPI1, METADATA, SW3, SW6)', `<div id="cd"></div>${controlsHTML()}`)}
    ${card('Routing at the playhead (sharc/v104/sample.c)', `<div id="rt"></div>`)}</div><div>
    ${card('What the code did (last action)', `<div id="trace" class="log"></div>`)}
    ${card('Obligation and cost (Connectus report, 2008|41)', `<div id="ob"></div>`)}</div></div>
    ${card('Timeline — one second of programme, zoomable', `<canvas id="tl"></canvas><p class="small muted">The programme and narration envelopes are ${inf}: the archive has no audio. Everything after the inputs is the v104 mix code.</p>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t;
    const cd=m.querySelector('#cd'); cd.innerHTML=cardSVG(t); bindCard(cd);
    m.querySelector('#rt').innerHTML=routingTable(); m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#log').innerHTML=logHTML();
    const c=cost(); m.querySelector('#ob').innerHTML = kv([
      ['Obligation', `<select id="obs">${Object.keys(OBL).map(k=>`<option value="${k}" ${k===D.oblig?'selected':''}>${OBL[k].txt}</option>`).join('')}</select>`],
      ['New DV hours / week', `${D.hours} <button data-a="h" data-v="-1">−</button><button data-a="h" data-v="1">+</button> <button data-a="lang">${D.lang==='EN'?'English':'French'}</button>`],
      ['Versioning cost', `$${c.per.toLocaleString()}/h → <b>$${c.perYear.toLocaleString()}</b>/year if every hour is new`],
      ['Closed captioning, same hours', `$${c.ccYear.toLocaleString()}/year ($300/h): DV is ${fmt(c.ratio,1)}× the cost`],
      ['Turnaround', c.turn],
      ['Distribution (BDU)', '≈ $30,000/year; each described track ≈ 300 MHz of bandwidth (Bell ExpressVu, as quoted); one encoder per channel per head end'],
      ['How viewers get it', 'turn on SAP — so the plant must always feed the second audio service (GPI1 “create DV”)'],
    ]);
    const ob=m.querySelector('#obs'); if (ob) ob.onchange=e=>A.oblig(e.target.value);
    bindActs(m.querySelector('#ob'), { h:v=>A.hours(+v), lang:()=>A.lang() });
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  bindControls(m); SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The question RD37 asked', body:`<p>In 2011|44 the CRTC was moving described video (DV) from a few hours a week toward a working-group goal of <b>100 % by 2020</b>. Peter’s RD37 folder gathers the CRTC links and the CAB-commissioned Connectus report. The engineering question: what does a station’s audio plant need to carry a <b>second, described audio service</b> on every program, and what does it cost?</p><p>WBS had already built the plumbing once, for CTV: the <b>M6205C200</b> openGear card. This tutorial uses its real mix code.</p>`, check:()=>true, auto:true },
  { title:'1 · Size the obligation', body:`<p>Set the obligation to <b>4 h/week by September 2006</b> (the rule for CTV, Canwest, CHUM and TVA) and read the cost: about $1,600 per programme hour in English, five times closed captioning.</p><p><b>Goal:</b> obligation 2006, English.</p>`, check:()=>D.oblig==='2006'&&D.lang==='EN', hint:'Use the Obligation menu in the cost card.' },
  { title:'2 · Look at 2020', body:`<p>Switch to the <b>2020</b> goal: 168 hours a week. Most of that cannot be versioned; acquired US programming rarely has DV on SAP. So the plant must always put <i>something</i> on the DV path.</p><p><b>Goal:</b> obligation 2020.</p>`, check:()=>D.oblig==='2020', hint:'Obligation → Working-group goal 2020.' },
  { title:'3 · A described programme', body:`<p>Choose input layout <b>3</b> (5.1 + DV + stereo + Dolby E). The DV feed arrives on AES4 A. With GPI1 open, the card passes it to AES4 A out. Scrub to 0.45 s: the narration fills the pause in dialogue.</p><p><b>Goal:</b> layout 3, GPI1 open, playhead in the pause (0.38–0.58 s).</p>`, check:()=>D.layout===3&&!D.gpi1&&SIM.t>0.38&&SIM.t<0.58, hint:'Layout menu → 3; drag the playhead to about 0.45 s.' },
  { title:'4 · No described version: close GPI1', body:`<p>For programmes with no DV, automation closes <b>GPI1</b>. <span class="mono">sample.c</span> then puts the <b>mono program</b> on AES4 A, so a viewer on SAP still hears the show.</p><p><b>Goal:</b> GPI1 closed.</p>`, check:()=>D.gpi1, hint:'Click the GPI/O terminal block on the T6307, or “GPI1 close”.' },
  { title:'5 · Metadata shapes the mono', body:`<p>With Dolby metadata present, the mono is the <b>Lt/Rt fold-down</b> of the 5.1, scaled by <span class="mono">dn_gain = volume[dialnorm+30]</span>. Set dialnorm to <b>31</b> and the gain is 0 dB; 24 gives −7 dB.</p><p><b>Goal:</b> dialnorm 31.</p>`, check:()=>D.dialnorm===31, hint:'dialnorm + until 31.' },
  { title:'6 · Lose the metadata', body:`<p>Turn metadata <b>off</b>. The document says “pass all”. The v104 code instead <b>zeroes C, LFE, Ls and Rs</b> and makes AES5 a copy of AES1. Check the meters and the routing table.</p><p><b>Goal:</b> metadata off.</p>`, check:()=>!D.meta, hint:'Click the METADATA terminal block.' },
  { title:'7 · Trim the DV level', body:`<p>Release GPI1 and turn metadata back on. Lower the <b>DV gain</b> by 6 dB with the DashBoard slider added in v1.0.4. The change ramps in through <span class="mono">RampAudioCalc</span> (τ ≈ 10 ms, ${inf}); see the dv_gain lane.</p><p><b>Goal:</b> DV gain −6 dB, GPI1 open, metadata on.</p>`, check:()=>D.dvIdx===55&&!D.gpi1&&D.meta, hint:'DV − six times; GPI1 open; metadata on.' },
  { title:'Done', body:`<p>That is the RD37 study as an engineer would run it: the rule, the cost, and the switching a plant needs. <b>Findings</b> covers what the register says happened and the mismatches between the switching-rules document and the shipped code.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — the described-video investigation', panelTitle:'Card, rear module and cost', reset,
  panel(el){ const c=cost(); el.innerHTML = cardSVG(SIM.t) + controlsHTML() + `<div style="margin-top:8px">${kv([['Obligation', `<select id="obs">${Object.keys(OBL).map(k=>`<option value="${k}" ${k===D.oblig?'selected':''}>${OBL[k].txt}</option>`).join('')}</select> <button data-a="lang">${D.lang}</button>`],['Cost / year', `$${c.perYear.toLocaleString()} (${D.hours} h/week)`],['Playhead',SIM.fmtT(SIM.t)]])}</div>`;
    bindCard(el); bindControls(el); bindActs(el,{lang:()=>A.lang()}); const ob=el.querySelector('#obs'); if (ob) ob.onchange=e=>A.oblig(e.target.value); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second, broken down', `<div id="lad"></div>`)}<div class="grid2">${card('Inside the card at the playhead', `<div id="dev"></div>`)}${card('What a viewer on SAP hears', `<div id="vw"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, o=process(t), lv=levels(t);
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','period','note'],[
      ['SHARC SampleIRQ','<span class="mono">48,000</span>','<span class="mono">20.83 µs</span>','sample.c: float convert, mix, clip, fix → TDM'],
      ['TDM slots out','<span class="mono">'+(48000*20).toLocaleString()+'</span>','','TDM_out[0..19] per sample (slot 0/19 echoed)'],
      ['Gain ramp step','≤ 48,000 '+inf,'',`RampAudioCalc α = 0.002 → τ ≈ ${fmt(TAU_RAMP*1e3,1)} ms`],
      ['Metadata parse','≈ background loop '+inf,'','refresh_meta_data + dial_norm_extract each pass'],
      ['Video frames (1080i)','<span class="mono">29.97</span>','<span class="mono">33.37 ms</span>','metadata arrives once per frame in VANC'],
    ].map(r=>r.map((c,i)=>i===3?`<span class="small">${c}</span>`:c)));
    m.querySelector('#dev').innerHTML = kv([['Sample',`${Math.floor(t*FS).toLocaleString()}`,1],['dv_gain',fmt(gainAt(D.ramp.dv,t),4),1],['program_gain',fmt(gainAt(D.ramp.prog,t),4),1],['dn_gain',D.meta&&D.dnEnable?fmt(volLin(D.dialnorm+30),4):'1.0000',1],['AES4 A / B',`${fmt(o[6],4)} / ${fmt(o[7],4)}`,1],['segment', inSeg(t,NARR)?'narration (pause)':inSeg(t,SPEECH)?'dialogue':'music bed',1]]);
    m.querySelector('#vw').innerHTML = `<p>SAP / DV service = <b>AES4 A</b>: ${D.gpi1?'mono of the main programme (no description)':'the described mix from the DV house'} at ${lv[6]>-99?fmt(lv[6],1)+' dBFS peak':'silence'}.</p><p>Main service = AES1 / AES5 at ${lv[0]>-99?fmt(lv[0],1):'—'} / ${lv[8]>-99?fmt(lv[8],1):'—'} dBFS.</p>`;
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    sdi:{x:20,y:30,w:180,h:70,t:'SDI in (T6307)',s:['embedded AES1–8 groups'],d:'De-embedded on the EP2C35 FPGA; group select from SW1/SW2 (Reg 2 bits 31..30).'},
    dv:{x:20,y:140,w:180,h:70,t:'DV house mix',s:['arrives on AES4 A'],d:'Described version: the full mix plus narration, produced in 3–5 days (English) or 2 weeks (French) per Connectus.',live:()=>!D.gpi1&&has('DV')},
    meta:{x:20,y:250,w:180,h:70,t:'Dolby metadata',s:['VANC → Reg 7, Reg 11–110'],d:'acmod, cmix/smix, Lt/Rt-Lo/Ro levels and dialnorm, parsed by meta_sort() (see RD26).',live:()=>D.meta},
    gpi:{x:20,y:360,w:180,h:60,t:'GPI1 (automation)',s:['Reg 7 bit 25, active low'],d:'Closed = “create DV”: put the programme mono on AES4 A.',live:()=>D.gpi1},
    dsp:{x:280,y:130,w:220,h:170,t:'ADSP-21262 sample.c',s:['program_gain on in 0–5','Lt/Rt or Lo/Ro fold-down','mono × mixdown × dn_gain','AES4A = DV × dv_gain | mono','AES4B = mono always','clip ±1'],d:'One function per sample. The whole C200 behaviour is about 80 lines of C in v104.'},
    at:{x:280,y:20,w:220,h:80,t:'AT90CAN128 + DashBoard',s:['DV / PGM / mixdown sliders','DIP SW1–8'],d:'Writes the gain indexes into Reg 2/3 every pass; v1.0.4 added the three sliders (SOFTWARE HISTORY 2.0.0.3, 25 Feb 2009|42).'},
    out:{x:570,y:60,w:180,h:120,t:'AES out',s:['AES1 L/R','AES2 C/LFE · AES3 Ls/Rs','AES4 DV / PGM mono','AES5 Lt/Rt · AES6 Dolby E'],d:'Re-embedded into SDI OUT 1/2 and on the T6307 BNCs.'},
    tx:{x:570,y:260,w:180,h:90,t:'Transmitter / BDU',s:['main + SAP (DV)'],d:'The viewer selects SAP. BDUs need an encoder per channel per head end and ~300 MHz per described track (Connectus, quoting Bell ExpressVu).'},
  };
  blockView(m,B,[['sdi','dsp','PCM'],['dv','dsp','AES4A'],['meta','dsp','coefficients'],['gpi','dsp','create DV'],['at','dsp','Reg 2/3 gains'],['dsp','out','TDM'],['out','tx','SDI']],{start:'dsp',h:440,side:'<p>Every programme gets a second audio service: the <b>described mix</b> when one exists, otherwise a <b>mono of the programme</b>, switched by GPI1 and levelled by metadata.</p>'});
}
const SHEETS=[
  { name:'1 · DV signal path', note:'Redrawn from sharc/v104/sample.c: each box is a line of the code.', svg:()=>{
    const box=(x,y,w,t)=>`<rect x="${x}" y="${y}" width="${w}" height="34" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+8}" y="${y+21}" font-size="11.5" fill="var(--ink)">${t}</text>`;
    return box(40,60,170,'AES1 L/R × program_gain')+box(40,120,170,'C, Ls, Rs × program_gain')+box(270,90,200,'Lt/Rt (or Lo/Ro) mix')+box(520,90,140,'× mixdown × dn_gain')+box(700,60,120,'AES4B mono')+
      box(40,240,170,'AES4 A in (DV)')+box(270,240,170,'× dv_gain (ramped)')+box(520,240,140,'GPI1 switch')+box(700,240,120,'AES4A out')+
      `<line x1="210" y1="77" x2="270" y2="105" stroke="var(--ink)"/><line x1="210" y1="137" x2="270" y2="110" stroke="var(--ink)"/><line x1="470" y1="107" x2="520" y2="107" stroke="var(--ink)"/><line x1="660" y1="107" x2="700" y2="77" stroke="var(--ink)"/><line x1="210" y1="257" x2="270" y2="257" stroke="var(--ink)"/><line x1="440" y1="257" x2="520" y2="257" stroke="var(--ink)"/><line x1="660" y1="257" x2="700" y2="257" stroke="var(--ink)"/><line x1="660" y1="107" x2="590" y2="240" stroke="var(--accent2)" stroke-dasharray="4 3"/><text x="600" y="190" font-size="11" fill="var(--accent2)">mono when GPI1</text>`; } },
  { name:'2 · Register and DIP map', note:'From “M6205c200 switching rules.doc” (Control I/O, DIP switch settings).', svg:()=>
    chip(320,40,220,'Atmel → FPGA → SHARC',[['Reg1','SYNC 0x53594E43'],['Reg2[31:30]','group select'],['Reg2[16]','dialnorm on'],['Reg2[15:8]','program gain idx'],['Reg2[7:0]','mixdown idx'],['Reg3[31:24]','DV gain idx']],[['Reg7[31]','SMPTE lock'],['Reg7[25]','gpi1'],['Reg7[15]','Vanc Detected'],['Reg7[10:0]','meta line#'],['Reg8[23:8]','Dolby detect'],['Reg110[17]','decoder in use']],'32-bit control registers') },
  { name:'3 · T6307 rear', note:'Connector list from the T6307 README (M6205-T6307.pdf); placement drawn, not measured.', svg:()=>
    ['SDI IN','SDI OUT1','SDI OUT2','AES OUT1 L/R','BNC4 C/LFE','AES OUT2 Ls/Rs','AES IN1'].map((n,i)=>`<circle cx="120" cy="${50+i*48}" r="14" fill="none" stroke="var(--ink)"/><text x="145" y="${55+i*48}" font-size="12" fill="var(--ink)">${n}</text>`).join('') +
    ['GPI/O 1–2','METADATA','(TB 3)'].map((n,i)=>`<rect x="420" y="${60+i*70}" width="90" height="36" fill="none" stroke="var(--ink)"/><text x="525" y="${83+i*70}" font-size="12" fill="var(--ink)">${n}</text>`).join('') + `<text x="420" y="300" font-size="11" fill="var(--ink2)">ID resistor AN_BMID2: 1K91 allocated, 5K36 in T6307-iss1.net</text>` },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'M6205C200 code and documents', 'RD37 holds no drawings. These sheets document the existing WBS DV path the study would build on.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Switching rules — the case in force (doc vs v104 code)', `<div id="sr"></div>`)}${card('sample.c per-sample flow (lit = taken now)', `<div id="fl"></div>`)}</div>${card('Gain table and ramp', `<canvas id="gt"></canvas>`)}`;
  const draw=()=>{
    const doc = (()=>{ const m_=D.meta, g=D.gpi1, de=D.dolbyOn2;
      if (!m_&&!g&&!de) return ['pass all: out1–6 = in1–6','C/LFE/Ls/Rs = 0; AES4B = mono; AES5 = AES1'];
      if (!m_&&g&&!de) return ['out1–3 = in1–3; out4 = mono(in1); out5 = in1; out6 = mute','out2/3 = 0; AES6 passes (TDM 11/12)'];
      if (!m_&&!g&&de) return ['out2/3 mute; out4 = in4; out6 = in2 (Dolby E)','Dolby E echo to AES6 is commented out'];
      if (!m_&&g&&de) return ['out4 = mono(in1); out6 = in2','Dolby E echo commented out'];
      if (m_&&!g) return ['out1–4 = in1–4; out5 = Lt/Rt; out6 = in6','matches (AES4B = mono added)'];
      return ['out4 = mono(Lt/Rt); out5 = Lt/Rt','matches']; })();
    m.querySelector('#sr').innerHTML = kv([['Inputs',`metadata ${D.meta?'yes':'no'} · GPI1 ${D.gpi1?'yes':'no'} · Dolby E on AES2 ${D.dolbyOn2?'yes':'no'}`],['Document says',doc[0]],['v104 code does',doc[1]]]);
    const steps=[['while(i<6) in[i] *= program_gain',true],['out0/1 = in0/1; mono = (L+R)/2',true],['if no metadata: out8/9 = L/R, out2..5 = 0',!D.meta],['else ext_bsi==0 → ac3 LUT Lt/Rt',D.meta&&D.extbsi===0],['else preferred==2 → Lo/Ro',D.meta&&D.extbsi&&D.preferred===2],['else → Lt/Rt (ext LUT)',D.meta&&D.extbsi&&D.preferred!==2],['ac_mode==1 → mono = C × dn_gain',D.meta&&D.acmod===1],['else mono = (Lm+Rm) × mixdown × dn_gain',D.meta&&D.acmod!==1],['out6 = in6 × dv_gain; out7 = mono',true],['if GPI1 → out6 = mono',D.gpi1],['clip to ±1, fix by 23 → TDM_out',true]];
    m.querySelector('#fl').innerHTML = `<svg viewBox="0 0 520 ${steps.length*34+8}" style="width:100%">${steps.map((s,i)=>`<rect x="6" y="${4+i*34}" width="508" height="28" rx="5" fill="${s[1]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${22+i*34}" font-size="11.5" font-family="var(--mono)" fill="${s[1]?'#fff':'var(--ink)'}">${s[0]}</text>`).join('')}</svg>`;
    const {c,w,h}=SIM.canvas(m.querySelector('#gt'),170); c.strokeStyle=SIM.css('--line'); c.strokeRect(40,10,w-60,130);
    c.strokeStyle=SIM.css('--accent'); c.beginPath(); for(let i=1;i<=100;i++){ const x=40+(w-60)*i/100, db=volDb(i); const y=140-(db+60)/75*130; i>1?c.lineTo(x,y):c.moveTo(x,y);} c.stroke();
    [['dv',D.dvIdx,'--warn'],['prog',D.progIdx,'--accent2'],['mix',D.mixIdx,'--bad']].forEach(([k,ix,col])=>{ const x=40+(w-60)*ix/100; c.fillStyle=SIM.css(col); c.fillRect(x-2,10,4,130); c.fillText(k+' '+ix,x+4,20+(k==='prog'?12:k==='mix'?24:0)); });
    c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('volume[] index 0…100 → dB (1 dB/step from −60 at 1; flat +15 from 76 to 255)',40,160);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD37 decided, and what became of it', `<ol>
    <li><b>Register status “?” (Peter): research only.</b> <span class="mono">R&amp;D_List.xls</span> row RD37. The folder has a CRTC link list, the 2008|41 Connectus report for the CAB, and one unrelated paper. No WBS design followed it in the archive.</li>
    <li><b>The plumbing already existed.</b> The CTV <span class="mono">M6205C200</span> (V100 27 Oct 2008|41; “output4 changed to DV/PGM mono” 20 Nov 2008) carries DV on AES4 A, a programme mono on AES4 B, and a GPI to create DV when none is supplied. Releases ran to 3.0.0.1 (22 Mar 2011|44), the year of RD37. The Astral M6206 adds voice-over mixing.</li>
    <li><b>Document and code disagree when metadata is absent.</b> The switching rules say “pass all”. <span class="mono">sample.c</span> v104 sets C, LFE, Ls and Rs out to 0 and copies AES1 to AES5. A 5.1 feed without metadata loses its centre and surrounds on this card.</li>
    <li><b>AES4 B is always the mono.</b> The doc’s “pass all” would put input AES4 B out; the code writes <span class="mono">audio_out_float[7] = mono</span> on every sample.</li>
    <li><b>Dolby E re-routing is commented out.</b> The doc moves Dolby E from AES2 to AES6. In v104 the lines that would do it are inside <span class="mono">//</span>; TDM 11/12 pass straight through.</li>
    <li><b>A dead line.</b> <span class="mono">mono=(Lmix+Rmix)*0.5;</span> is immediately overwritten by <span class="mono">mono=(Lmix+Rmix)*mixdown_gain*dn_gain;</span>, so the fold-down mono is 6 dB hotter than the first line intended unless mixdown is set to −6 dB.</li>
    <li><b>GPI1 is active low.</b> <span class="mono">if ((altera_data_in[7] &amp; 0x02000000)==0)</span> creates DV; an unconnected input with no pull-up would decide the SAP content (${inf} from the test polarity).</li>
    <li><b>Dialnorm becomes a level change.</b> <span class="mono">dn_gain = volume[dialnorm+30]</span> normalises dialogue to −31 dBFS on the mono and downmix only.</li>
    <li><b>Mis-filed paper.</b> <span class="mono">CMF_response_ paper_CAB.pdf</span> is the CAB response to the Canada Media Fund consultation (online/mobile content). It does not mention described video.</li>
    <li><b>Numbers the study rested on:</b> DV ≈ $1,600/h English, $1,750/h French, captioning ≈ $300/h; 3–5 days vs 2 weeks; 21 (54) English and 4 (18) French h/week available; The Accessible Channel 168 h/week; distribution ≈ $30,000/year.</li>
  </ol>`) + card('Assumptions in this model', `<ul class="small"><li>Programme, dialogue pauses and narration are synthetic (${inf}).</li><li>RampAudioCalc runs once per sample (${inf}: <span class="mono">interrupt_flag</span> is set in the sample IRQ, and the background loop rate is not recorded).</li><li>Rear connector placement is drawn, not measured.</li><li>Cost per year assumes every required hour is newly versioned; repeats would lower it.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>XXX - ENGINEERING - 2016 RD FILES/RD37-DescriptiveVideoMandate/ResearchResources.xlsx, .xls, ConnectursConsultingFinal_Report_….pdf, CMF_response_ paper_CAB.pdf · R&amp;D_List.xls</li>
    <li>#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/Software/m6205c200/ (switching rules.doc, SOFTWARE HISTORY.xls, sharc/v104/sample.c, backgnd.c, RampAudio.c, volume_data.c) · T6307 README</li></ul>`);
}

SIM.register({
  id:'rd37-descriptivevideomandate', name:'RD37 Descriptive Video Mandate · DV audio routing study (2011|44)', duration:1,
  product:'RD37 Descriptive Video Mandate', year:2011, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD37-DescriptiveVideoMandate',
  summary:'Regulatory and cost research on the CRTC described-video rules, modelled together with the audio path a station needed: the M6205C200 card’s real DV / programme-mono routing, GPI switching, metadata fold-down and gain ramps.',
  highlights:['CRTC hours and Connectus cost model','Real sample.c DV / PGM-mono mix, per sample','GPI1 “create DV” and metadata cases','Document vs shipped code mismatches','Clickable card DIP switches and T6307 rear'],
  depth:'Hardware model',
  stepUnits:[{label:'1 sample (20.8 µs)',period:()=>1/FS},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'1 frame (33.4 ms)',period:()=>1001/30000},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms'],[0.005,'5 ms'],[0.001,'1 ms (48 samples)']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the DV study', render:viewTutorial},
    {id:'second', label:'One second, sample by sample', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});

})();
