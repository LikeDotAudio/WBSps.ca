/* =====================================================================
   RD84 — Sabre Chips (Ward-Beck R&D register, status "?", Aug 2015|48)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD84 evaluated ESS Technology SABRE DACs and headphone amplifiers after a vendor presentation.
   The folder holds six datasheets and a distributor quote (100 pcs, 18 Aug 2015). The plugin models
   the question an engineer would ask: what does a 127–135 dB DAC buy in a WBS product, at what price,
   and what does it take to drive one. Sources (all in this archive):
   - RD84-Sabre/Ward-Beck ES9018-2M Datasheet v2.7.pdf (ES9018K2M: pins, register map, clocking,
     volume ramp, analog performance), …SABRE9018AQ2M v1.1, SABRE9018Q2C v1.3, ES9018S rev 1.91,
     SABRE9601K v1.5, SABRE9602Q v1.3 (headline figures and packages)
   - RD84-Sabre/Ward Beck Mail - FW_ SABER DAC information.pdf (part list and 100-pc prices; contacts omitted)
   - Comparison DACs already used or tried by WBS: PCM5100A and AK4430 (RD80-Amplifier Project/Parts/,
     measured PCM5100A in RD80 Final Sweeps/01_D2A.pdf, price in PCB/QubeAmp - #ISS3/parts_cube22.xls),
     CS4334 (RD9-DSPResearch/Ali/datasheet/cs4334-ks.pdf; the AMS81/AMS8E monitor DAC, see ams81.js)
   - RD80 Final Sweeps/09_PowerAmp_BTL_AnalogIn.pdf (class-D noise floor −78 dBu) for the speaker case
   - RD65_BrystonDACDesign_Description.txt (the related "Bryston DAC" idea)
   The datasheets are marked "CONFIDENTIAL ADVANCE INFORMATION"; only headline figures, pin names and
   register names are used here. Anything not in the files is marked "inferred".
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

/* ================= parts (headline figures from the datasheets in the archive) ================= */
const DACS = {
  CS4334:{n:'CS4334', kind:'dac', dnr:96, thd:-88, fsV:1.24, ch:2, price:null, pkg:'8-pin SOIC', mm:[4.9,3.9,6.0], pins:8, mw:null, where:'AMS81 / AMS8E monitors (4 per board, ams81.js)', src:'RD9-DSPResearch/Ali/datasheet/cs4334-ks.pdf (3.5 Vpp FS)'},
  PCM5100A:{n:'PCM5100A', kind:'dac', dnr:100, thd:-90, meas:-87, fsV:2.1, ch:2, price:2.40, pkg:'20-pin TSSOP', mm:[6.5,4.4,6.4], pins:20, mw:null, where:'QubeAmp / QUBE / AMS2 (RD80)', src:'RD80/Parts/pcm5100a.pdf; $2.40 in parts_cube22.xls; 0.0045 % measured (01_D2A)'},
  AK4430:{n:'AK4430', kind:'dac', dnr:104, thd:-91, fsV:2.0, ch:2, price:null, pkg:'16-pin TSSOP', mm:[5.0,4.4,6.4], pins:16, mw:null, where:'considered in RD80, not used', src:'RD80/Parts/AK4430ET.pdf (6.4 × 5.0 mm)'},
  K2M:{n:'ES9018K2M', kind:'dac', dnr:127, thd:-120, fsV:2.16, ch:2, price:15, pkg:'28-pin QFN', mm:[5,5], pins:28, mw:52, where:'quoted', src:'Ward-Beck ES9018-2M Datasheet v2.7 (Jul 2015)'},
  AQ2M:{n:'SABRE9018AQ2M', kind:'dac', dnr:129, thd:-120, fsV:2.16, ch:2, price:17, pkg:'32-pin QFN', mm:[5,5], pins:32, mw:83, where:'quoted', src:'Ward-Beck SABRE9018AQ2M Datasheet v1.1 (Jun 2015)'},
  Q2C:{n:'SABRE9018Q2C', kind:'dac', dnr:121, thd:-115, fsV:2.0, ch:2, price:18, pkg:'40-pin QFN', mm:[5,5], pins:40, mw:100, hp:{mw32:49, thd32:-100}, where:'quoted (DAC + headphone amp)', src:'SABRE9018Q2C Datasheet v1.3 (Jun 2015; 5 × 5 mm inferred)'},
  ES9018S:{n:'ES9018S', kind:'dac', dnr:129, mono:135, thd:-120, fsV:2.16, ch:8, price:48, pkg:'64-pin LQFP', mm:[10,10,12], pins:64, mw:100, where:'quoted (8 channels)', src:'Ward-Beck ES9018S DS rev 1.91 (Mar 2015)'},
};
const DOWN = {
  line:{n:'Line out, no further stage', dr:200, note:'the DAC alone'},
  ne5532:{n:'NE5532 headphone / line buffer (AMS81)', dr:110, note:'typical NE5532 stage '+'(inferred)'},
  hp9601:{n:'SABRE9601K headphone amp ($4)', dr:122, note:'+122 dB SNR, −117 dB THD+N 2 Vrms / 600 Ω, −100 dB at 30 mW / 32 Ω'},
  hp9602:{n:'SABRE9602Q headphone amp + switch ($6)', dr:122, note:'+122 dB SNR, −102 dB at 49 mW / 32 Ω'},
  qube:{n:'QubeAmp class-D speaker (RD80, BTL)', dr:104.3, note:'RD80 gain structure: DAC floor + 24.8 dB, amp floor −78 dBu (sweep 09), clip ≈ +26.3 dBu'},
};
const HPAS = { K9601:{n:'SABRE9601K', pkg:'20-pin QFN', mm:[3,3], pins:20, price:4}, Q9602:{n:'SABRE9602Q', pkg:'40-pin QFN', mm:[5,5], pins:40, price:6} };
const MCLKS = [[12.288e6,'12.288 MHz (256 fs, CS8416 RMCK)'],[24.576e6,'24.576 MHz (512 fs)'],[27e6,'27 MHz (datasheet test clock)'],[49.152e6,'49.152 MHz (AMS82 SHARC clock, inferred)'],[100e6,'100 MHz local oscillator']];
const I2C_HZ = 100e3;                                     // inferred standard-mode bus
const QUOTE = [['ES9018S','8-ch DAC',48],['ES9018K2M (SABRE9018K2M)','2-ch DAC',15],['SABRE9018AQ2M','2-ch DAC',17],['SABRE9018Q2C','2-ch DAC + HPA',18],['SABRE9601K','HPA',4],['SABRE9602Q','HPA + switch',6]];

/* ================= state ================= */
const D0 = { dac:'K2M', down:'line', dbfs:-60, freq:1000, fs:48000, mclk:0, input:'i2s', att:0, volRate:2, mute:false, sync:false, ev:null, cfg:'2', pick:'K2M' };
const D = Object.assign({}, D0);
function reset(){ Object.assign(D, D0); D.ev=null; LOG.items=[]; SIM.refresh(); }
const P = () => DACS[D.dac];
const sum = (a,b) => -10*Math.log10(Math.pow(10,-a/10)+Math.pow(10,-b/10));
/* speaker case: RD80 gain structure — DAC FS (dBu) + 5.28 dB BTL mixer + 19.55 dB power stage; amp floor −78 dBu; clip +26.3 dBu */
const SPK = { gain:5.28+19.55, floor:-78, clip:26.3, sens:81.8 };
function spkNoise(p){ const fsDbu = 20*Math.log10(p.fsV/0.7746); const dacN = fsDbu - p.dnr + SPK.gain; return 10*Math.log10(Math.pow(10,dacN/10)+Math.pow(10,SPK.floor/10)); }
function chainDR(p, k){ const dn = DOWN[k]; if (k==='qube') return SPK.clip - spkNoise(p); return dn.dr>=200 ? p.dnr : sum(p.dnr, dn.dr); }
function hissSPL(p){ const v = 0.7746*Math.pow(10, spkNoise(p)/20); return SPK.sens + 10*Math.log10(v*v/8); }
function sysDNR(){ const p=P(); return { dac:p.dnr, down:DOWN[D.down].dr, sys: chainDR(p, D.down) }; }
const rate = () => 0.0078125*D.fs/Math.pow(2, D.volRate-5);      // dB/s, register 6 vol_rate
function attAt(t){ // volume ramp after the last I2C write (register 15/16)
  const e = D.ev; const target = D.mute ? 127.5 : D.att;
  if (!e) return target;
  const tStart = e.t + e.dur; if (t < tStart) return e.from;
  const dir = Math.sign(e.to - e.from), d = (t - tStart)*rate();
  return Math.abs(e.to-e.from) <= d ? e.to : e.from + dir*d;
}
function clockCheck(){ const m = MCLKS[D.mclk][0], fs = D.fs;
  const need = D.input==='spdif' ? 386*fs : (D.sync ? 128*fs : 192*fs);
  const dvdd = m > 50e6 || fs > 192000;
  return { m, need, ok: D.input==='spdif' ? m > need : (D.sync ? m >= 128*fs : m > need), dvdd, ratio: m/fs };
}
function levelOut(t){ const a = attAt(t); return D.dbfs - a; }   // dBFS at the DAC output
function thdn(lvl){ const p=P(), noise = -sysDNR().sys;   // noise floor re full scale
  const dist = Math.pow(10, p.thd/20);
  const nr = Math.pow(10, (noise - lvl)/20);
  return 20*Math.log10(Math.hypot(dist, nr)); }

/* ================= actions ================= */
function i2cBytes(reg, val){ return [0x90, reg, val]; }   // ADDR pin low → chip address 0x90
const A = {
  dac(k){ act('Candidate → '+DACS[k].n, tr=>{ D.dac=k; D.pick=k; const p=DACS[k], s=sysDNR();
    tr(`${p.n}: ${p.dnr} dB DNR${p.mono?' ('+p.mono+' dB mono)':''}, THD+N ${p.thd} dB, ${p.pkg}, ${p.price!=null?'$'+p.price.toFixed(2)+' at 100 pcs':'price not in the archive'}`);
    tr(`Source: ${p.src}`); tr(`With “${DOWN[D.down].n}” the chain reaches ${fmt(s.sys,1)} dB`); if (D.down==='qube') tr(`Speaker hiss at 1 m: ${fmt(hissSPL(p),1)} dB SPL (TC2X4FC, 81.8 dB/W)`); }); },
  down(k){ act('Downstream → '+DOWN[k].n, tr=>{ D.down=k; const s=sysDNR(); tr(DOWN[k].note); tr(k==='qube' ? `DAC floor at the speaker ${fmt(20*Math.log10(P().fsV/0.7746)-P().dnr+SPK.gain,1)} dBu ⊕ amp floor −78 dBu = ${fmt(spkNoise(P()),1)} dBu; clip +26.3 dBu → ${fmt(s.sys,1)} dB; hiss ${fmt(hissSPL(P()),1)} dB SPL at 1 m` : `DAC ${s.dac} dB ⊕ stage ${DOWN[k].dr>=200?'—':DOWN[k].dr+' dB'} → system ${fmt(s.sys,1)} dB (noise powers add)`); }); },
  level(v){ act('Signal level '+v+' dBFS', tr=>{ D.dbfs=clamp(+v,-140,0); tr(`I²S data at ${D.dbfs} dBFS; output ${fmt(levelOut(SIM.t),1)} dBFS after the volume stage`); }); },
  vol(d){ act(`Volume ${d>0?'down':'up'} ${Math.abs(d)} dB`, tr=>{ const from = attAt(SIM.t); D.att = clamp(D.att + d, 0, 127.5); const v = Math.round(D.att*2);
    const by = i2cBytes(15, v); const dur = 4*9/I2C_HZ;
    D.ev = { t:SIM.t, dur, from, to: D.mute?127.5:D.att, bytes:by };
    tr(`I²C START · 0x${hex2(by[0])} (chip address, ADDR = 0, write) · 0x${hex2(by[1])} (register 15, Volume 1) · 0x${hex2(by[2])} (= ${D.att} dB × 2) · STOP`);
    tr(`≈${fmt(dur*1e6,0)} µs on the bus at 100 kHz ${inf}; register 16 (Volume 2) would follow for the right channel`);
    tr(`Soft ramp at 0.0078125 × fs / 2^(vol_rate−5) = ${fmt(rate(),2)} dB/s → ${fmt(Math.abs(D.ev.to-from)/rate()*1000,1)} ms to settle`); }); },
  volRate(d){ act('vol_rate '+(D.volRate+d), tr=>{ D.volRate = clamp(D.volRate+d,0,7); const v = 0x48 | D.volRate;
    tr(`Register 6 ← 0x${hex2(v)} (deemph_bypass = 1, reserved bit 3 = 1, vol_rate = ${D.volRate}); default 0x4A`);
    tr(`Ramp ${fmt(rate(),2)} dB/s at ${D.fs/1000} kHz${D.volRate===7?' — the Rev W setting for lowest THD':''}`); }); },
  mute(){ act(D.mute?'Unmute':'Mute', tr=>{ const from=attAt(SIM.t); D.mute=!D.mute; D.ev={t:SIM.t,dur:3*9/I2C_HZ,from,to:D.mute?127.5:D.att,bytes:[0x90,7,D.mute?0x81:0x80]};
    tr(`Register 7 ← 0x${D.mute?'81':'80'} (mute bit 0 = ${D.mute?1:0}); output ramps to ${D.mute?'−∞':'the volume setting'} at the vol_rate speed without changing registers 15/16`); }); },
  mclk(i){ act('MCLK → '+MCLKS[+i][1], tr=>{ D.mclk=+i; const c=clockCheck(); tr(`MCLK / fs = ${fmt(c.ratio,1)}; needs > ${D.input==='spdif'?'386':'192'} × fs = ${fmt(c.need/1e6,3)} MHz${D.sync?' (or exactly 128 fs in sync mode)':''} → ${c.ok?'locks':'WILL NOT LOCK'}`); if (c.dvdd) tr('MCLK > 50 MHz: the internal DVDD regulator is not enough; supply DVDD externally (Rev V note)'); }); },
  input(v){ act('Input → '+v.toUpperCase(), tr=>{ D.input=v; tr(`Register 1 input_select ← ${v==='i2s'?"2'd0 (I²S)":"2'd1 (SPDIF)"}; default 0x8C = 32-bit, I²S, auto-select I²S/SPDIF/DSD`); const c=clockCheck(); tr(`Clock rule now MCLK > ${D.input==='spdif'?386:192} fs: ${c.ok?'met':'not met'} with ${MCLKS[D.mclk][1]}`); }); },
  sync(){ act('Synchronous MCLK '+(D.sync?'off':'on'), tr=>{ D.sync=!D.sync; tr(`Register 10 bit 4 sync_mode = ${D.sync?1:0} (Revision V only): MCLK may then be 128 × fs`); }); },
  fs(v){ act('fs → '+v, tr=>{ D.fs=+v; const c=clockCheck(); tr(`${v/1000} kHz: MCLK ratio ${fmt(c.ratio,1)} fs, ${c.ok?'OK':'too low'}`); }); },
  cfg(v){ act('Product case → '+v, tr=>{ D.cfg=v; tr(costRows().map(r=>r[0]+': '+r[2]).join(' · ')); }); },
  pick(k){ D.pick=k; if (DACS[k]) A.dac(k); else SIM.refresh(); },
};

/* ================= cost cases ================= */
function costRows(){
  if (D.cfg==='2') return [['Powered speaker (QUBE / AMS2)','PCM5100A, as built','$2.40'],['  with ES9018K2M','+$12.60 per board','$15.00'],['  range at the speaker', `${fmt(chainDR(DACS.PCM5100A,'qube'),1)} → ${fmt(chainDR(DACS.K2M,'qube'),1)} dB`, '+'+fmt(chainDR(DACS.K2M,'qube')-chainDR(DACS.PCM5100A,'qube'),1)+' dB'],['  hiss at 1 m (TC2X4FC)', `${fmt(hissSPL(DACS.PCM5100A),1)} → ${fmt(hissSPL(DACS.K2M),1)} dB SPL`, 'inaudible either way']];
  if (D.cfg==='8') return [['8-ch monitor outputs (AMS8E-1)','4 × CS4334 (price not in archive)','—'],['  4 × ES9018K2M','$60.00 ($7.50/ch)','$60.00'],['  1 × ES9018S','$48.00 ($6.00/ch)','$48.00'],['  + SABRE9601K headphone amp','$4.00','$4.00']];
  return [['RD58-style 8-in/8-out POD (D/A side)','1 × ES9018S','$48.00'],['  or 4 × SABRE9018AQ2M','$68.00','$68.00'],['  RD65 “Bryston DAC” idea','1 × ES9018S in mono mode, 135 dB','$48.00']];
}

/* ================= the parts plate: packages to scale ================= */
function plateSVG(){
  const S = 22, items = [['CS4334',DACS.CS4334],['PCM5100A',DACS.PCM5100A],['AK4430',DACS.AK4430],['K2M',DACS.K2M],['AQ2M',DACS.AQ2M],['Q2C',DACS.Q2C],['ES9018S',DACS.ES9018S],['K9601',HPAS.K9601],['Q9602',HPAS.Q9602]];
  let s = `<svg viewBox="0 0 1000 500" style="width:100%;display:block;border-radius:8px" role="img" aria-label="Candidate packages to scale"><rect width="1000" height="500" rx="10" fill="var(--dev)"/>
    <text x="20" y="28" font-size="15" font-weight="700" fill="#e6e8ea">Candidate parts to scale (22 px = 1 mm) — click to evaluate</text>`;
  // 10 mm scale bar
  s += `<rect x="20" y="480" width="${10*S}" height="6" fill="#cfd3d6"/><text x="${20+10*S+8}" y="487" font-size="11" fill="#cfd3d6">10 mm</text>`;
  let x = 30, y = 70, rowH = 0;
  items.forEach(([k,p])=>{
    const w = p.mm[0]*S, h = p.mm[1]*S, lead = p.mm[2] ? (p.mm[2]-p.mm[1])/2*S : 0;
    const qfp = /LQFP/.test(p.pkg), so = /SOIC|TSSOP/.test(p.pkg);
    const W = qfp ? p.mm[2]*S : w, H = qfp ? p.mm[2]*S : (so ? p.mm[2]*S : h);
    if (x + W > 980){ x = 30; y += rowH + 54; rowH = 0; }
    const sel = D.pick===k || D.dac===k;
    const ox = x + (W-w)/2, oy = y + (H-h)/2;
    let leads = '';
    if (so){ const n = p.pins/2; for(let i=0;i<n;i++){ const lx = ox + (i+0.5)*w/n - 3; leads += `<rect x="${lx}" y="${y}" width="6" height="${oy-y}" fill="#b9bec4"/><rect x="${lx}" y="${oy+h}" width="6" height="${oy-y}" fill="#b9bec4"/>`; } }
    if (qfp){ const n = p.pins/4; for(let i=0;i<n;i++){ const o=(i+0.5)*w/n-2; leads += `<rect x="${ox+o}" y="${y}" width="4" height="${oy-y}" fill="#b9bec4"/><rect x="${ox+o}" y="${oy+h}" width="4" height="${oy-y}" fill="#b9bec4"/><rect x="${x}" y="${oy+o}" width="${ox-x}" height="4" fill="#b9bec4"/><rect x="${ox+w}" y="${oy+o}" width="${ox-x}" height="4" fill="#b9bec4"/>`; } }
    if (/QFN/.test(p.pkg)){ const n = p.pins/4; for(let i=0;i<n;i++){ const o=(i+0.5)*w/n-2; leads += `<rect x="${ox+o}" y="${oy+1}" width="4" height="7" fill="#b9bec4"/><rect x="${ox+o}" y="${oy+h-8}" width="4" height="7" fill="#b9bec4"/><rect x="${ox+1}" y="${oy+o}" width="7" height="4" fill="#b9bec4"/><rect x="${ox+w-8}" y="${oy+o}" width="7" height="4" fill="#b9bec4"/>`; } }
    s += `<g data-pk="${k}" style="cursor:pointer">${leads}<rect x="${ox}" y="${oy}" width="${w}" height="${h}" rx="3" fill="#202326" stroke="${sel?'var(--accent)':'#555'}" stroke-width="${sel?3:1.2}"/><circle cx="${ox+10}" cy="${oy+10}" r="3" fill="#888"/>
      <text x="${x+W/2}" y="${y+H+16}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${sel?'#7fd0ff':'#e6e8ea'}">${p.n}</text><text x="${x+W/2}" y="${y+H+30}" text-anchor="middle" font-size="10" fill="#9aa0a5">${p.pkg}${p.price!=null?' · $'+p.price.toFixed(2):''}</text><title>${p.n}: ${p.pkg}${p.dnr?', '+p.dnr+' dB DNR':''}</title></g>`;
    x += Math.max(W, 110) + 24; rowH = Math.max(rowH, H);
  });
  const c = clockCheck();
  s += `<g><rect x="700" y="400" width="280" height="80" rx="8" fill="#141618" stroke="#30333a"/><text x="712" y="422" font-size="12" fill="#e6e8ea">Register 64 (chip status) — ${P().n}</text>
    <circle cx="722" cy="445" r="8" fill="${c.ok?'var(--led-g)':'var(--led-off)'}"/><text x="736" y="449" font-size="11.5" fill="#cfd3d6">lock_status</text>
    <circle cx="842" cy="445" r="8" fill="${attAt(SIM.t)>=127||D.dbfs<=-140?'var(--led-a)':'var(--led-off)'}"/><text x="856" y="449" font-size="11.5" fill="#cfd3d6">automute / mute</text>
    <text x="712" y="470" font-size="11" fill="#9aa0a5">MCLK ${fmt(c.m/1e6,3)} MHz = ${fmt(c.ratio,0)} fs</text></g>`;
  return s + '</svg>';
}
function bindPlate(root){ root.querySelectorAll('[data-pk]').forEach(g=> g.onclick = ()=>A.pick(g.dataset.pk)); }
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <label class="small">DAC <select data-s="dac">${Object.keys(DACS).map(k=>`<option value="${k}" ${k===D.dac?'selected':''}>${DACS[k].n}</option>`).join('')}</select></label>
    <label class="small">after it <select data-s="down">${Object.keys(DOWN).map(k=>`<option value="${k}" ${k===D.down?'selected':''}>${DOWN[k].n}</option>`).join('')}</select></label>
    <label class="small">signal <input type="range" data-r="lvl" min="-140" max="0" value="${D.dbfs}" style="width:110px"> <span class="mono">${D.dbfs} dBFS</span></label>
    <span class="small muted">volume</span><button data-a="vol" data-v="-6">+6 dB</button><button data-a="vol" data-v="6">−6 dB</button><button data-a="vol" data-v="40">−40 dB</button><button data-a="vol" data-v="-127.5">0 dB</button><button data-a="mute" class="${D.mute?'on':''}">mute</button>
    <span class="small muted">vol_rate ${D.volRate}</span><button data-a="vr" data-v="-1">−</button><button data-a="vr" data-v="1">+</button>
    <label class="small">MCLK <select data-s="mclk">${MCLKS.map((m,i)=>`<option value="${i}" ${i===D.mclk?'selected':''}>${m[1]}</option>`).join('')}</select></label>
    <label class="small">input <select data-s="input"><option value="i2s" ${D.input==='i2s'?'selected':''}>I²S (from CS8416)</option><option value="spdif" ${D.input==='spdif'?'selected':''}>SPDIF direct</option></select></label>
    <label class="small">fs <select data-s="fs">${[44100,48000,96000,192000].map(f=>`<option ${f===D.fs?'selected':''}>${f}</option>`).join('')}</select></label>
    <button data-a="sync" class="${D.sync?'on':''}">sync MCLK</button><button data-a="rst">defaults</button></div>`;
}
function bindControls(root){
  bindActs(root, { vol:v=>A.vol(+v), mute:()=>A.mute(), vr:v=>A.volRate(+v), sync:()=>A.sync(), rst:()=>reset() });
  root.querySelectorAll('[data-r="lvl"]').forEach(r=> r.onchange = e=>A.level(e.target.value));
  root.querySelectorAll('[data-s]').forEach(s=> s.onchange = e=>{ const k=s.dataset.s, v=e.target.value; ({dac:A.dac, down:A.down, mclk:A.mclk, input:A.input, fs:A.fs, cfg:A.cfg})[k](v); });
}
function meterHTML(){
  const s = sysDNR(), lv = levelOut(SIM.t), c = clockCheck(), p = P();
  const noiseFS = -s.sys;                      // noise floor re full scale
  const audible = lv > noiseFS;
  return kv([
    ['Candidate', `${p.n} · ${p.ch} ch · ${p.pkg} · ${p.price!=null?'$'+p.price.toFixed(2):'—'} · ${p.where}`],
    ['DAC / chain DNR', `${s.dac} dB / <b>${fmt(s.sys,1)} dB</b> with ${DOWN[D.down].n}`],
    ['Output now', `${c.ok?fmt(lv,1)+' dBFS':'<b style="color:var(--bad)">muted: no lock</b>'} · volume −${fmt(attAt(SIM.t),2)} dB`,1],
    ['Noise floor', `${fmt(noiseFS,1)} dBFS (A-wtd, 20 Hz–20 kHz) → signal ${audible?'above':'<b>below</b>'} the floor by ${fmt(Math.abs(lv-noiseFS),1)} dB`],
    ['THD+N at this level', `${fmt(thdn(lv),1)} dB (${fmt(100*Math.pow(10,thdn(lv)/20),5)} %)`,1],
    ['Clock', `${MCLKS[D.mclk][1]}: ${c.ok?'lock':'<b style="color:var(--bad)">no lock</b>'} (needs > ${fmt(c.need/1e6,3)} MHz)${c.dvdd?' · external DVDD needed':''}`],
  ]);
}
function spectrum(cv){
  const {c,w,h} = SIM.canvas(cv, 220); const lv = levelOut(SIM.t), s = sysDNR(), p = P(), ok = clockCheck().ok;
  const x = f => 40 + (w-50)*Math.log10(f/20)/3, y = d => 16 + (h-46)*(-d)/180;
  c.strokeStyle = SIM.css('--grid'); c.fillStyle = SIM.css('--ink2'); c.font='10px sans-serif';
  for (let d=0; d>=-180; d-=20){ c.beginPath(); c.moveTo(40,y(d)); c.lineTo(w-10,y(d)); c.stroke(); c.fillText(d, 8, y(d)+3); }
  [20,100,1000,10000,20000].forEach(f=>{ c.beginPath(); c.moveTo(x(f),16); c.lineTo(x(f),h-30); c.stroke(); c.fillText(f>=1000?f/1000+'k':f, x(f)-8, h-16); });
  const binFloor = -s.sys - 10*Math.log10(16384/2*20000/(D.fs/2));   // 16k-point FFT, noise spread over the bins in 20 kHz
  c.strokeStyle = SIM.css('--accent2'); c.beginPath(); for (let i=0;i<=300;i++){ const f=20*Math.pow(1000,i/300); const n=binFloor + 3*Math.sin(i*1.7)*Math.sin(i*0.37); const yy=y(n); i?c.lineTo(x(f),yy):c.moveTo(x(f),yy); } c.stroke();
  if (ok && lv > -170){ c.strokeStyle = SIM.css('--accent'); c.lineWidth=2; c.beginPath(); c.moveTo(x(D.freq),y(binFloor)); c.lineTo(x(D.freq),y(lv)); c.stroke();
    const h2 = lv + p.thd; if (h2 > binFloor){ c.strokeStyle=SIM.css('--bad'); [2,3].forEach(k=>{ c.beginPath(); c.moveTo(x(D.freq*k),y(binFloor)); c.lineTo(x(D.freq*k),y(h2-(k-2)*6)); c.stroke(); }); } c.lineWidth=1; }
  c.fillStyle = SIM.css('--ink2'); c.fillText(`16k-point FFT (inferred): floor per bin ≈ ${fmt(binFloor,0)} dBFS; tone ${fmt(lv,1)} dBFS; harmonics at THD ${p.thd} dB`, 46, 12);
}

/* ================= timeline ================= */
function lanes(){
  const css=SIM.css, L=[];
  L.push({label:`LRCK (${D.fs/1000} kHz)`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/D.fs,0,0.5/D.fs,css('--accent2'),'I²S frames'); }});
  L.push({label:'BCLK (64 fs)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/(64*D.fs),0,0.5/(64*D.fs),css('--accent2'),'32-bit slots (inferred)'); }});
  L.push({label:'MCLK', h:20, draw(c,X,t0,t1,y,h){ const m=MCLKS[D.mclk][0]; SIM.pulses(c,X,t0,t1,y,h,1/m,0,0.5/m,clockCheck().ok?css('--accent'):css('--bad'),MCLKS[D.mclk][1]); }});
  L.push({label:'I²C (0x90)', h:24, draw(c,X,t0,t1,y,h){ const e=D.ev; if(!e){ laneText(c,X,t0,y,h,'no write yet — press a volume button'); return; }
    const bit=1/I2C_HZ; for (let b=0;b<e.bytes.length;b++){ const a=e.t+b*9*bit; if (a>t1||a+9*bit<t0) continue; bandAt(c,X,a,a+8*bit,y,h,css('--warn'),.7,'0x'+hex2(e.bytes[b])); bandAt(c,X,a+8*bit,a+9*bit,y,h,css('--ink2'),.5,''); } }});
  L.push({label:'Volume (dB attenuation)', h:40, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--accent'); c.beginPath(); const N=400; for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const a=attAt(t); const yy=y+4+(h-8)*clamp(a,0,127.5)/127.5; i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(`0…−127.5 dB · ${fmt(rate(),1)} dB/s`, X(t1)-150, y+12); }});
  L.push({label:'DAC output (re noise floor)', h:44, draw(c,X,t0,t1,y,h){ const s=sysDNR(), floor=-s.sys, ok=clockCheck().ok, span=t1-t0, px=Math.max(60,Math.floor(X(t1)-X(t0)));
    c.fillStyle=css('--accent2'); c.globalAlpha=.25; const fh=(h-6)*clamp((floor+140)/140,0,1); c.fillRect(X(t0),y+h-3-fh,X(t1)-X(t0),fh); c.globalAlpha=1;
    c.strokeStyle=css('--warn'); c.beginPath(); for(let i=0;i<=px;i+=2){ const t=t0+span*i/px; const lv=ok?levelOut(t):-200; const yy=y+h-3-(h-6)*clamp((lv+140)/140,0,1); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke();
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(`tone level (line) vs floor ${fmt(floor,0)} dBFS (band), −140…0`, X(t0)+6, y+12); }});
  L.push({label:'Register 64 lock_status', h:20, draw(c,X,t0,t1,y,h){ const ok=clockCheck().ok; bandAt(c,X,t0,t1,y,h,ok?css('--accent'):css('--bad'),.35, ok?'locked (bit 0 = 1)':'no lock: MCLK below the minimum'); }});
  return L;
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>
    ${card('The RD84 bench: candidates to scale, clocking and volume (click a part)', `<div id="pl"></div>${controlsHTML()}<p class="small muted">Package sizes from each datasheet's mechanical page; CS4334 and PCM5100A outlines and the Q2C body are ${inf}.</p>`)}
    ${card('Spectrum at the DAC output', `<canvas id="sp"></canvas>`)}</div><div>
    ${card('Analyser readout', `<div id="mt"></div>`)}
    ${card('What the chip did (last action)', `<div id="trace" class="log"></div>`)}
    ${card('Where would it go? (quote prices, 100 pcs)', `<div id="cost"></div>`)}</div></div>
    ${card('Timeline — one second: clocks, an I²C volume write and the soft ramp', `<canvas id="tl"></canvas>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  bindControls(m);
  const draw = ()=>{
    const pl=m.querySelector('#pl'); pl.innerHTML=plateSVG(); bindPlate(pl);
    m.querySelector('#mt').innerHTML = meterHTML(); spectrum(m.querySelector('#sp'));
    const co = m.querySelector('#cost'); co.innerHTML = `<label class="small">case <select data-s="cfg"><option value="2" ${D.cfg==='2'?'selected':''}>2-ch powered speaker</option><option value="8" ${D.cfg==='8'?'selected':''}>8-ch monitor</option><option value="pod" ${D.cfg==='pod'?'selected':''}>8-ch D/A POD / Bryston idea</option></select></label>` + tbl(['Option','Parts','Cost'], costRows()); bindControls(co);
    m.querySelector('#trace').innerHTML = traceHTML(); m.querySelector('#log').innerHTML = logHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
  };
  SIM.on('time', draw);
}
const tutor = {i:0};
const LESSONS = [
  { title:'The question RD84 asked', body:`<p>In August 2015|48 a distributor presented ESS SABRE converters to WBS. Ali picked six parts, asked for datasheets, dev-kit prices and a 100-piece quote (ES9018K2M $15 … ES9018S $48, 8 weeks). The question: would a 127–135 dB DAC improve a WBS product enough to pay for itself?</p>`, check:()=>true, auto:true },
  { title:'1 · The DAC WBS already used', body:`<p>Select the <b>PCM5100A</b> (QubeAmp, 100 dB) and set the signal to <b>−100 dBFS</b>. The tone sits right at the noise floor.</p><p><b>Goal:</b> PCM5100A at −100 dBFS.</p>`, check:()=>D.dac==='PCM5100A'&&D.dbfs===-100, hint:'Click the PCM5100A on the plate; drag the signal slider to −100.' },
  { title:'2 · Swap in the ES9018K2M', body:`<p>Click the <b>ES9018K2M</b> (28-QFN, 5 × 5 mm). The floor drops 27 dB and the −100 dBFS tone stands clear.</p><p><b>Goal:</b> ES9018K2M.</p>`, check:()=>D.dac==='K2M', hint:'Click the 28-pin QFN.' },
  { title:'3 · Put it in a powered speaker', body:`<p>Set “after it” to the <b>QubeAmp class-D speaker</b>. With RD80’s gain structure the PCM5100A’s floor, amplified 24.8 dB, sits above the amp’s own −78 dBu, so the SABRE does widen the range by about 11 dB. But look at the hiss: a few dB SPL at 1 m either way, below hearing. The trace shows the numbers.</p><p><b>Goal:</b> downstream QubeAmp.</p>`, check:()=>D.down==='qube', hint:'“after it” menu.' },
  { title:'4 · Where it would show: headphones', body:`<p>Choose the <b>SABRE9601K</b> headphone amp ($4, 122 dB). Now the DAC is the limit again. Compare with the NE5532 stage of the AMS81.</p><p><b>Goal:</b> downstream SABRE9601K.</p>`, check:()=>D.down==='hp9601', hint:'“after it” → SABRE9601K.' },
  { title:'5 · Will it lock to an AES feed?', body:`<p>WBS products recover the clock with a CS8416, whose master clock is 256 fs = 12.288 MHz. Choose input <b>SPDIF direct</b>: the SABRE’s SPDIF receiver needs MCLK above 386 fs, so it will not lock. Back on I²S (192 fs minimum) it does.</p><p><b>Goal:</b> SPDIF selected with 12.288 MHz (no lock).</p>`, check:()=>D.input==='spdif'&&D.mclk===0&&!clockCheck().ok, hint:'input → SPDIF direct.' },
  { title:'6 · Fix the clock', body:`<p>Either return to <b>I²S</b> from the CS8416, or give the chip its own <b>100 MHz</b> oscillator (then DVDD must be supplied externally, MCLK > 50 MHz).</p><p><b>Goal:</b> lock restored.</p>`, check:()=>clockCheck().ok, hint:'input → I²S, or MCLK → 100 MHz.' },
  { title:'7 · Volume and the soft ramp', body:`<p>Press <b>−40 dB</b>. The ATmega would write register 15 over I²C (0x90, 0x0F, 0x50). The chip ramps at 0.0078125 × fs / 2^(vol_rate−5) dB/s: 3000 dB/s at the default vol_rate 2 (≈13 ms). Watch the I²C and Volume lanes.</p><p><b>Goal:</b> attenuation 40 dB.</p>`, check:()=>D.att===40, hint:'Press −40 dB once from 0.' },
  { title:'8 · The Rev W catch', body:`<p>The datasheet says Rev W silicon needs <b>vol_rate = 7</b> for lowest THD. That slows the ramp to 93.75 dB/s: a 40 dB change now takes 0.43 s. Set vol_rate to 7 and press <b>0 dB</b>, then play the second.</p><p><b>Goal:</b> vol_rate 7 and volume back at 0 dB.</p>`, check:()=>D.volRate===7&&D.att===0, hint:'vol_rate + until 7, then “0 dB”.' },
  { title:'Done', body:`<p>That is the RD84 evaluation: the SABRE parts are 6× the price of the PCM5100A, invisible behind a class-D speaker stage, useful only on line and headphone outputs, and need clock and volume handling of their own. The <b>Findings</b> tab says what came of it.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — the SABRE evaluation', panelTitle:'Parts, clock and analyser', reset,
  panel(el){ el.innerHTML = `<div id="tp"></div>${controlsHTML()}<div style="margin-top:8px">${meterHTML()}</div>`; const tp=el.querySelector('#tp'); tp.innerHTML=plateSVG(); bindPlate(tp); bindControls(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second through the DAC', `<div id="lad"></div>`)}<div class="grid2">${card('At the playhead', `<div id="dev"></div>`)}${card('Volume ramp arithmetic (register 6)', `<div id="vr"></div>`)}</div>`;
  const draw=()=>{ const m_=MCLKS[D.mclk][0];
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','period','note'],[
      ['LRCK frames', `<span class="mono">${D.fs.toLocaleString()}</span>`, `<span class="mono">${SIM.fmtDur(1/D.fs)}</span>`, 'one stereo sample'],
      ['BCLK', `<span class="mono">${(64*D.fs).toLocaleString()}</span>`, `<span class="mono">${SIM.fmtDur(1/(64*D.fs))}</span>`, '64 fs '+inf+'; register 1 i2s_length default 32-bit'],
      ['MCLK', `<span class="mono">${m_.toLocaleString()}</span>`, `<span class="mono">${SIM.fmtDur(1/m_)}</span>`, `${fmt(m_/D.fs,1)} fs; minimum 192 fs (I²S), 386 fs (SPDIF), 128 fs (sync mode)`],
      ['Volume steps', '0.5 dB each', '', 'each step up to 64 intermediate levels'],
      ['I²C write (3 bytes + address)', '', `<span class="mono">${SIM.fmtDur(4*9/I2C_HZ)}</span>`, '100 kHz bus '+inf],
    ].map(r=>r.map((x,i)=>i===3?`<span class="small">${x}</span>`:x)));
    m.querySelector('#dev').innerHTML = kv([['Volume',`−${fmt(attAt(SIM.t),3)} dB`,1],['Output',`${fmt(levelOut(SIM.t),2)} dBFS`,1],['Register 15',`0x${hex2(Math.round(attAt(SIM.t)*2))} (live)`,1],['Lock',clockCheck().ok?'yes':'no',1],['Chain DNR',fmt(sysDNR().sys,1)+' dB',1]]);
    m.querySelector('#vr').innerHTML = tbl(['vol_rate','dB/s at '+D.fs/1000+' kHz','40 dB takes'], [0,1,2,3,4,5,6,7].map(v=>{ const r=0.0078125*D.fs/Math.pow(2,v-5); return [v+(v===2?' (default)':v===7?' (Rev W, lowest THD)':''), fmt(r,2), SIM.fmtDur(40/r)]; }));
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B = {
    aes:{x:20,y:40,w:160,h:66,t:'AES3 in',s:['CS8416 receiver'],d:'As on every WBS digital product: the CS8416 recovers the clock (RMCK 256 fs) and outputs I²S.'},
    mcu:{x:20,y:180,w:160,h:66,t:'ATmega128',s:['I²C master'],d:'Writes the SABRE registers (chip address 0x90 / 0x92 by the ADDR pin) '+inf+'.'},
    dac:{x:240,y:90,w:200,h:110,t:'SABRE DAC',s:['HyperStream, 32-bit','Jitter Eliminator / DPLL','vol, mute, filters (I²C)'],d:'ES9018K2M: 127 dB DNR (differential current mode), −120 dB THD+N, 52 mW, 28-QFN.',live:()=>clockCheck().ok},
    iv:{x:500,y:40,w:160,h:66,t:'I/V + filter',s:['current mode → volts'],d:'The DNR figure is for differential current mode; voltage mode gives 0.924 × AVCC p-p per leg (≈2.16 Vrms differential).'},
    hp:{x:500,y:160,w:160,h:66,t:'SABRE9601K / 9602Q',s:['headphone amp'],d:'122 dB SNR; 30 / 49 mW into 32 Ω; charge-pump negative rail.',live:()=>/hp/.test(D.down)},
    spk:{x:500,y:280,w:160,h:66,t:'Class-D speaker',s:['QubeAmp (RD80)'],d:'−78 dBu floor caps the system at ≈101 dB.',live:()=>D.down==='qube'},
    out:{x:720,y:120,w:140,h:66,t:'Outputs',s:['line / phones / speaker'],d:'Where the extra dynamic range would, or would not, reach the listener.'},
  };
  blockView(m, B, [['aes','dac','I²S + MCLK'],['mcu','dac','I²C'],['dac','iv','DACL/DACLB'],['dac','hp',''],['dac','spk',''],['iv','out','line'],['hp','out','phones'],['spk','out','speaker']], {start:'dac', w:880, h:380, side:'<p>The SABRE replaces only the converter. What the listener gets is limited by whichever stage after it is noisiest.</p>'});
}
const SHEETS = [
  { name:'1 · ES9018K2M pins', note:'Pin names and numbers from the ES9018K2M datasheet v2.7 pin table (28-QFN).', svg:()=> chip(330,40,200,'U? ES9018K2M',[['1 DGND',''],['3 SCL','I2C_SCL'],['4 SDA','I2C_SDA'],['5 ADDR','GND → 0x90'],['6 XO',''],['7 XI (MCLK)','MCLK'],['25 DATA2','I2S_DATA'],['26 DATA1','LRCK'],['27 DATA_CLK','BCLK'],['28 RESETB','DAC_RST']],[['13 DACL','OUT_L+'],['14 DACLB','OUT_L−'],['9 DACR','OUT_R+'],['10 DACRB','OUT_R−'],['15 AVCC_L','3V3A'],['16 AVCC_R','3V3A'],['17 VCCA','3V3 (osc)'],['18 DVCC','1.8–3.3 V'],['21 DVDD','2.2 µF'],['23/24 GPIO','']],'SABRE32 stereo DAC') },
  { name:'2 · Headphone stage (proposed)', note:'SABRE9601K pin names from its datasheet (20-QFN); the connection to the DAC is a proposal, not a WBS drawing.', svg:()=> chip(330,60,200,'SABRE9601K',[['19 INL','OUT_L+'],['18 INBL','OUT_L−'],['7 INR','OUT_R+'],['8 INBR','OUT_R−'],['6 PDB','HP_EN']],[['OUTL','4.7 Ω → TIP'],['OUTR','4.7 Ω → RING'],['15 AVCC_L','3V3'],['14 AVCC_R','3V3'],['PNEG/ANEG','charge pump']],'headphone driver')+`<text x="40" y="400" font-size="12" fill="var(--ink2)">Datasheet: a 4.7 Ω resistor between each output and the jack; < 9 mA quiescent.</text>` },
  { name:'3 · Clocking rules', note:'From the ES9018K2M analog-performance table and the clocking notes.', svg:()=> { const rows=[['PCM normal mode','MCLK > 192 × fs',192],['PCM, OSF bypass (Rev V)','MCLK > 24 × fs',24],['Synchronous MCLK (Rev V, reg 10 bit 4)','MCLK = 128 × fs',128],['DSD','MCLK > 3 × fs (fs = 2.8224 MHz …)',null],['SPDIF input','MCLK > 386 × fs',386],['Internal DVDD only if','MCLK ≤ 50 MHz and fs ≤ 192 kHz',null]];
      return rows.map((r,i)=>`<rect x="40" y="${50+i*56}" width="780" height="44" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="56" y="${77+i*56}" font-size="13" fill="var(--ink)">${r[0]}</text><text x="420" y="${77+i*56}" font-size="13" font-family="var(--mono)" fill="var(--accent)">${r[1]}</text>${r[2]?`<text x="700" y="${77+i*56}" font-size="12" fill="var(--ink2)">${fmt(r[2]*D.fs/1e6,3)} MHz @ ${D.fs/1000}k</text>`:''}`).join(''); } },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'RD84 datasheets (ES9018K2M, SABRE9601K)', 'RD84 holds no WBS schematic. These sheets redraw the datasheet pinouts and rules the design would have started from.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('ES9018K2M register map (live)', `<div id="rm"></div>`)}${card('Start-up and volume state machine (lit = now)', `<div id="smv"></div>`)}</div>${card('Dynamic range by chain (dB)', `<canvas id="dr"></canvas>`)}`;
  const draw=()=>{ const a=attAt(SIM.t), c=clockCheck();
    m.querySelector('#rm').innerHTML = tbl(['Reg','Name','Value','Meaning'],[
      ['0','System Settings','0x00','osc_drv full bias, soft_reset 0'],
      ['1','Input Configuration',`0x${hex2(0x8C|(D.input==='spdif'?1:0))}`,`32-bit, I²S, auto-select; input_select ${D.input==='spdif'?'SPDIF':'I²S'}`],
      ['4/5','Automute time / level','0x00 / 0x68','automute disabled by default'],
      ['6','Soft Volume 3 / de-emphasis',`0x${hex2(0x48|D.volRate)}`,`vol_rate ${D.volRate} → ${fmt(rate(),2)} dB/s`],
      ['7','General Settings',`0x${D.mute?'81':'80'}`,`mute ${D.mute?1:0}`],
      ['10','Master Mode Control (Rev V)',`0x${D.sync?'10':'00'}`,`sync_mode ${D.sync?1:0}`],
      ['11','Channel Mapping','—','Volume 1/2 to left/right'],
      ['14','Soft Start Settings','—','soft_start ramps outputs to ground before reset'],
      ['15/16','Volume 1 / 2',`0x${hex2(Math.round(a*2))}`,`−${fmt(a,1)} dB (0.5 dB steps to −127.5)`],
      ['17–20','Master Trim','0x7FFFFFFF','0 dB reference, 32-bit signed'],
      ['26–30','Programmable filter (Rev V)','—','coefficient address / data / control'],
      ['64','Chip Status (read)',`0b${c.ok?'0010000'+'1':'00100000'}`,`revision bit 5, chip_id, automute_status, lock_status ${c.ok?1:0}`],
    ].map(r=>[`<span class="mono">${r[0]}</span>`,r[1],`<span class="mono">${r[2]}</span>`,`<span class="small">${r[3]}</span>`]));
    const e=D.ev, ramping = e && SIM.t>=e.t+e.dur && Math.abs(attAt(SIM.t)-e.to)>1e-6, writing = e && SIM.t>=e.t && SIM.t<e.t+e.dur;
    const st=[['RESETB high, read register 64 (revision)',true],['Register 1 input select, register 6 vol_rate',true],[c.ok?'DPLL locked to MCLK/data (lock_status 1)':'Waiting for lock (MCLK too low)',c.ok],['I²C write to register 15/16',!!writing],['Soft ramp toward the new volume',!!ramping],[D.mute?'Muted (register 7 bit 0)':'Playing',!ramping&&!writing&&c.ok]];
    m.querySelector('#smv').innerHTML = `<svg viewBox="0 0 520 ${st.length*40+8}" style="width:100%">${st.map((s,i)=>`<rect x="6" y="${4+i*40}" width="508" height="32" rx="6" fill="${s[1]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${25+i*40}" font-size="12" fill="${s[1]?'#fff':'var(--ink)'}">${s[0]}</text>`).join('')}</svg>`;
    const {c:cx,w,h}=SIM.canvas(m.querySelector('#dr'),230); const keys=Object.keys(DACS), downs=['line','hp9601','ne5532','qube'], cols=['--accent','--accent2','--warn','--bad'];
    const bw=(w-180)/keys.length, y=d=>200-(d-80)/60*180;
    cx.strokeStyle=SIM.css('--grid'); cx.fillStyle=SIM.css('--ink2'); cx.font='10px sans-serif';
    [80,90,100,110,120,130,140].forEach(d=>{ cx.beginPath(); cx.moveTo(30,y(d)); cx.lineTo(w-150,y(d)); cx.stroke(); cx.fillText(d,4,y(d)+3); });
    keys.forEach((k,i)=>{ const p=DACS[k]; downs.forEach((dn,j)=>{ const v = chainDR(p, dn); cx.fillStyle=SIM.css(cols[j]); cx.globalAlpha = k===D.dac?1:.55; cx.fillRect(34+i*bw+j*(bw-8)/4, y(v), (bw-8)/4-2, 200-y(v)); }); cx.globalAlpha=1; cx.fillStyle=SIM.css('--ink'); cx.fillText(p.n.replace('SABRE',''), 34+i*bw, 216); });
    downs.forEach((dn,j)=>{ cx.fillStyle=SIM.css(cols[j]); cx.fillRect(w-140,20+j*20,12,12); cx.fillStyle=SIM.css('--ink2'); cx.fillText(DOWN[dn].n.split(' (')[0].slice(0,26), w-124, 30+j*20); });
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD84 decided, and what became of it', `<ol>
    <li><b>Nothing was built.</b> Register row RD84 “Sabre Chips” has status “?” and no owner. No SABRE part number appears anywhere else in the archive (searched across source, BOMs and sidecars). The folder ends with the 18 Aug 2015|48 quote.</li>
    <li><b>The price gap is large.</b> ES9018K2M $15 vs the PCM5100A at $2.40 (parts_cube22.xls): 6.25× for 27 dB more DNR. Per channel the 8-channel ES9018S ($48, $6/ch) beats four ES9018K2M ($7.50/ch). Lead time 8 weeks.</li>
    <li><b>In a powered speaker it buys nothing audible.</b> Using RD80’s gain structure (24.8 dB after the DAC, class-D floor −78 dBu, clip ≈ +26.3 dBu): PCM5100A ≈ ${fmt(chainDR(DACS.PCM5100A,'qube'),1)} dB, ES9018K2M ≈ ${fmt(chainDR(DACS.K2M,'qube'),1)} dB of range. The hiss at 1 m from the TC2X4FC driver is ${fmt(hissSPL(DACS.PCM5100A),1)} vs ${fmt(hissSPL(DACS.K2M),1)} dB SPL, below hearing either way. The speaker products (QUBE, AMS2) kept the PCM5100A.</li>
    <li><b>Where it would matter: monitor line and headphone outputs.</b> The AMS81 / AMS8E use four CS4334s (96 dB, −88 dB THD+N). A SABRE9601K ($4, 122 dB) or SABRE9602Q ($6, with a source switch) is the cheap part of the upgrade.</li>
    <li><b>Clocking constrains the design.</b> WBS boards clock DACs from the CS8416 at 256 fs (12.288 MHz). That meets the SABRE’s I²S rule (> 192 fs) but not its SPDIF-input rule (> 386 fs), so the SABRE’s own SPDIF receiver could not replace the CS8416 without a faster MCLK. Above 50 MHz MCLK, DVDD must be supplied externally.</li>
    <li><b>The headline DNR needs an external I/V stage.</b> 127 dB is specified in differential current mode; voltage mode delivers 0.924 × AVCC p-p per leg. An op-amp I/V converter (NE5532 class, ${inf}) would set the real floor.</li>
    <li><b>Volume ramp trade-off.</b> Default vol_rate 2 ramps at 3000 dB/s at 48 kHz; the datasheet asks Rev W parts to use vol_rate 7 “for lowest THD”, i.e. 93.75 dB/s, so a full mute takes about 1.4 s. Firmware must read register 64 bit 5 to know the revision; registers 9/10 and 21–30 differ between Rev V and Rev W.</li>
    <li><b>The email asked for dev-kit prices; none are in the folder.</b> The quote lists parts only.</li>
    <li><b>Paperwork.</b> Five datasheets are personalised “Ward-Beck …” and marked “CONFIDENTIAL ADVANCE INFORMATION”; SABRE9018Q2C has no prefix. The email subject spells “SABER”. Distributor contact details are in the email and are left out here.</li>
    <li><b>Related.</b> RD65 “Bryston DAC design” (Kevin, status “?”) is a two-link note pointing at the Bryston BDA-1; the ES9018S’s 135 dB mono mode is the part that would suit it.</li>
  </ol>`) + card('Assumptions in this model', `<ul class="small"><li>Noise powers of the DAC and the following stage add; the speaker case uses RD80’s measured gains and an 8 Ω driver; THD+N combines the datasheet THD with the noise floor (${inf}).</li><li>NE5532 stage ≈110 dB, FFT size, I²C rate 100 kHz and BCLK 64 fs (${inf}).</li><li>The QubeAmp figure is RD80’s measurement, not a SABRE test.</li><li>Package sizes for CS4334, PCM5100A and SABRE9018Q2C (${inf}).</li></ul>`) + card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD84-Sabre/*.pdf · R&amp;D_List.xls · RD65_BrystonDACDesign_Description.txt</li><li>RD80-Amplifier Project/Parts/pcm5100a.pdf, AK4430ET.pdf, Final Sweeps/01_D2A.pdf, 08/09_PowerAmp_BTL_*.pdf, PCB/QubeAmp - #ISS3/parts_cube22.xls</li><li>RD9-DSPResearch/Ali/datasheet/cs4334-ks.pdf · siumulation-plugins/ams81.js (CS4334 use)</li></ul>`);
}

SIM.register({
  id:'rd84-sabre', name:'RD84 Sabre · ESS SABRE DAC evaluation (2015|48)', duration:1,
  product:'RD84 Sabre', year:2015, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD84-Sabre',
  summary:'An evaluation of ESS SABRE DACs and headphone amplifiers against the converters WBS already used. The model compares dynamic range through each kind of output stage, checks the clocking rules against a CS8416-clocked design, and replays an I²C volume write with the chip’s soft ramp.',
  highlights:['Seven DACs to scale, with quote prices','Chain dynamic range: line, headphone, NE5532, class-D speaker','MCLK rules: I²S, SPDIF and sync mode','Register 15 volume write and vol_rate ramp in slow motion','Live ES9018K2M register map'],
  depth:'Hardware model',
  stepUnits:[{label:'1 frame',period:()=>1/D.fs},{label:'1 I²C byte (90 µs)',period:()=>9/I2C_HZ},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms'],[0.002,'2 ms (I²C write)'],[0.0001,'100 µs'],[0.000002,'2 µs (clocks)']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the evaluation', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Registers & control', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
