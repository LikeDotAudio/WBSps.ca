/* =====================================================================
   M8201 — Announce channel control module (Ward-Beck, Jan 1996|29)
   Plugin for the WBS Device Simulator (../siumulation.html)

   The folder holds one drawing, twice: M8201 - #Engineering #MF82/FA8201.DWG and "M8201 - FA8201.DWG"
   (byte-identical, AutoCAD R11/R12, 1996-01-23). Its title block reads
     "WARD-BECK SYSTEMS · M8201 · ANNOUNCE CHANNEL CONTROL MODULE · FUNCTIONAL · B 8201-01-001 · ISS. 1".
   This plugin decodes the DWG's entity section directly (LINE, CIRCLE, ARC, TEXT, INSERT records) and redraws the
   functional diagram from those coordinates; the text labels are the drawing's own:
     BALANCED AUDIO INPUT (0 TO +8 dBu) · FRONT PANEL SENSITIVITY · (−6dB) ×2 · ANNOUNCE INTERCOM (+4 dBu) ·
     SWITCHED OUTPUT (+4 dBu) · EXTERNAL CHANNEL ON OUTPUT (24V DC 50 mA) · CHANNEL ON / CHANNEL OFF TALLY SINK (20 mA) ·
     LATCH (S, T, R, Q, Q̄) · CHANNEL ON · TOGGLE · CHANNEL OFF · blocks RESISTOR, NPN, LOGO1.
   No schematic, PCB, BOM or manual exists for the M8201; every circuit value here is inferred and marked.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- FA8201.DWG entities (decoded; inches) ---------------- */
const ENT = [["I",0,3.0,6.9],["L",3.0,6.9,5.0,6.9],["I",1,5.0,6.9],["L",5.35,6.7,5.35,5.9],["I",2,5.35,5.9],["L",5.7,6.9,7.0,6.9],["L",7.0,7.1,7.4,6.7],["L",7.4,7.1,7.0,6.7],["L",7.4,6.9,8.4,6.9],["I",1,9.8,6.9],["I",2,8.5,6.9],["L",8.6,6.9,9.8,6.9],["L",8.6,8.1,9.8,8.1],["I",2,8.5,8.1],["I",1,9.8,8.1],["L",6.4,8.1,8.4,8.1],["L",6.4,6.9,6.4,8.1],["L",10.5,8.1,11.6,8.1],["L",10.5,6.9,11.6,6.9],["I",0,11.6,8.1],["I",0,11.6,6.9],["I",0,3.0,4.3],["L",3.0,4.3,4.8,4.3],["L",3.0,3.5,4.8,3.5],["I",0,3.0,3.5],["I",0,3.0,2.7],["L",3.0,2.7,4.8,2.7],["L",5.8,4.3,7.2,4.3],["L",7.2,4.3,7.2,6.7],["L",7.2,4.3,9.0,4.3],["I",4,9.0,4.3],["L",9.2,4.05,9.2,3.9],["I",5,9.2,3.9],["I",6,10.2,4.7],["L",9.224,5.8,9.224,4.55],["L",9.026,5.677,9.373,5.899],["L",8.95,4.9,9.05,4.9],["L",8.95,5.3,9.05,5.3],["C",8.991,5.68,0.04],["C",9.391,5.68,0.04],["L",9.25,4.9,9.25,5.3],["L",9.2,5.3,9.2,4.9],["A",9.05,5.2,0.1,4.712,1.571],["A",9.05,5.0,0.1,4.712,1.571],["L",9.05,5.1,8.95,5.1],["L",11.6,4.7,9.224,4.7],["L",9.425,5.675,11.6,5.675],["L",11.6,6.1,8.8,6.1],["L",8.8,6.1,8.8,5.675],["L",8.8,5.675,8.95,5.675],["I",0,11.6,5.675],["I",0,11.6,6.1],["I",0,11.6,4.7],["I",5,9.2,2.3],["L",9.2,2.45,9.2,2.3],["I",4,9.0,2.7],["L",7.2,2.7,9.0,2.7],["L",5.8,2.7,7.2,2.7],["L",9.2,2.95,9.2,3.1],["L",9.2,3.1,11.6,3.1],["I",0,11.6,3.1],["T",4.85,4.25,0.1,"S"],["T",4.85,3.45,0.1,"T"],["T",4.85,2.65,0.1,"R"],["T",5.674,2.65,0.1,"Q"],["L",5.75,2.775,5.675,2.775],["T",5.674,4.25,0.1,"Q"],["T",5.031,2.125,0.1,"LATCH"],["T",1.898,4.25,0.1,"CHANNEL ON"],["T",2.317,3.45,0.1,"TOGGLE"],["T",1.817,2.65,0.1,"CHANNEL OFF"],["T",1.924,7.1,0.1,"BALANCED"],["T",2.088,6.929,0.1,"AUDIO"],["T",2.093,6.757,0.1,"INPUT"],["T",1.721,6.586,0.1,"(0 TO +8 dBu)"],["T",5.119,5.4,0.1,"FRONT"],["T",5.121,5.229,0.1,"PANEL"],["T",4.929,5.057,0.1,"SENSITIVITY"],["T",8.245,6.375,0.1,"(-6dB)"],["T",8.245,7.575,0.1,"(-6dB)"],["T",11.905,8.225,0.1,"ANNOUNCE"],["T",11.95,8.054,0.1,"INTERCOM"],["T",11.955,7.882,0.1,"(+4 dBu)"],["T",11.952,7.025,0.1,"SWITCHED"],["T",12.017,6.854,0.1,"OUTPUT"],["T",11.955,6.682,0.1,"(+4 dBu)"],["T",12.086,6.125,0.1,"EXTERNAL"],["T",11.974,5.954,0.1,"CHANNEL ON"],["T",12.167,5.782,0.1,"OUTPUT"],["T",11.802,5.611,0.1,"(24V DC 50 mA)"],["T",11.749,4.825,0.1,"CHANNEL ON"],["T",11.804,4.654,0.1,"TALLY SINK"],["T",11.911,4.482,0.1,"(20 mA)"],["T",11.911,2.882,0.1,"(20 mA)"],["T",11.804,3.054,0.1,"TALLY SINK"],["T",11.708,3.225,0.1,"CHANNEL OFF"],["T",11.765,0.068,0.09,"B 8201-01-001"],["T",14.18,0.068,0.09,"ISS."],["T",14.554,0.068,0.09,"1"],["T",12.66,1.008,0.09,"WARD-BECK SYSTEMS"],["T",11.756,0.525,0.09,"ANNOUNCE CHANNEL CONTROL MODULE"],["T",12.745,0.325,0.09,"FUNCTIONAL"],["T",12.97,0.725,0.09,"M8201"],["I",7,11.775,0.923]];
// Block (INSERT) table indices → what each symbol is. RESISTOR, NPN and LOGO1 are named in the DWG's block table; the others are inferred from placement.
const BLK = {0:'terminal',1:'amplifier',2:'attenuator / pot',4:'RESISTOR',5:'NPN',6:'diode (relay coil clamp)',7:'LOGO1'};

/* ---------------- state ---------------- */
const D = { inDbu:4, sens:0.5, q:false, ev:[], relayT:0.006, log:[] };   // ev: [{t,k}] presses of S / T / R
function reset(){ Object.assign(D,{inDbu:4, sens:0.5, q:false, ev:[]}); }
const sensDb = ()=> -8 + 16*D.sens;      // FRONT PANEL SENSITIVITY: maps 0…+8 dBu to +4 dBu ⇒ about ±4 dB needed; ±8 dB assumed
function qAt(t){ let q=D.q0===undefined?false:D.q0; for (const e of D.ev){ if (e.t>t) break; q = e.k==='S'? true : e.k==='R'? false : !q; } return q; }
function relayAt(t){ // contact follows Q after an operate/release time (inferred)
  let last=null; for (const e of D.ev){ if (e.t>t) break; last=e; } const q=qAt(t); if(!last) return q; return (t-last.t)>=D.relayT ? q : qAt(last.t-1e-9); }
function levels(t){ const pre = D.inDbu + sensDb(); const after = pre - 6; const makeup = 6;   // amplifier after the −6 dB pad restores +4 dBu nominal (inferred)
  return { pre, intercom: after+makeup, sw: qAt(t)? after+makeup : -Infinity }; }

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>50) D.log.length=50; SIM.refresh(); }
const A = {
  press(k){ act({S:'CHANNEL ON',T:'TOGGLE',R:'CHANNEL OFF'}[k]+' input', tr=>{ const before=qAt(SIM.t); D.ev.push({t:SIM.t,k}); D.ev.sort((a,b)=>a.t-b.t); const q=qAt(SIM.t+1e-9);
    tr(`LATCH ${k} input at ${SIM.fmtT(SIM.t)} → Q ${before?1:0} → ${q?1:0}`);
    tr(q? 'Q drives the audio switch (the ✕ on the drawing): the SWITCHED OUTPUT carries programme' : 'Audio switch opens: SWITCHED OUTPUT silent; ANNOUNCE INTERCOM is unaffected (it branches before the switch)');
    tr(`Q → RESISTOR → NPN → relay coil: EXTERNAL CHANNEL ON OUTPUT contacts ${q?'close':'open'} after ≈${D.relayT*1000} ms ${'(inferred)'} — rated 24 V DC 50 mA`);
    tr(`Tally sinks (20 mA): CHANNEL ON ${q?'sinking':'off'}, CHANNEL OFF (from Q̄) ${q?'off':'sinking'}`); }); },
  sens(v){ D.sens=v; SIM.refresh(); },
  sensLog(){ act('FRONT PANEL SENSITIVITY adjusted', tr=>{ const l=levels(SIM.t); tr(`${sensDb().toFixed(1)} dB (range ±8 dB ${'inferred'}) → ${l.pre.toFixed(1)} dBu before the −6 dB pads → outputs ${l.intercom.toFixed(1)} dBu (target +4 dBu)`); }); },
  reset(){ act('Start over', tr=>{ reset(); tr('Channel off, sensitivity centred'); }); },
};

/* ---------------- the drawing, live ---------------- */
function drawingSVG(t, opts){
  opts=opts||{}; const S=58, H=9.2, X=x=>10+x*S, Y=y=>10+(H-y)*S, q=qAt(t), rl=relayAt(t), lv=levels(t);
  const hot=(e)=>{ // colour lines that carry live signal or control
    const [_,x1,y1,x2,y2]=e; const isAud=(Math.min(y1,y2)>=6.6) || (x1===6.4&&x2===6.4);
    if (isAud){ const afterSw = Math.min(x1,x2)>=7.4 && Math.max(y1,y2)<7.5; if (afterSw) return q? 'var(--accent)':'var(--ink2)'; return 'var(--accent)'; }
    if (Math.abs(y1-4.3)<0.01&&Math.abs(y2-4.3)<0.01 || (x1===7.2&&x2===7.2)) return q?'var(--warn)':'var(--ink2)';
    if (Math.abs(y1-2.7)<0.01&&Math.abs(y2-2.7)<0.01) return q?'var(--ink2)':'var(--warn)';
    if (Math.abs(y1-5.675)<0.01 || Math.abs(y1-6.1)<0.01 || (x1===8.8)) return rl?'var(--accent2)':'var(--ink2)';
    return 'var(--ink)'; };
  let s=`<svg viewBox="0 0 ${16*S} ${H*S+20}" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">`;
  for (const e of ENT){
    if (e[0]==='L') s+=`<line x1="${X(e[1])}" y1="${Y(e[2])}" x2="${X(e[3])}" y2="${Y(e[4])}" stroke="${hot(e)}" stroke-width="2"/>`;
    else if (e[0]==='C') s+=`<circle cx="${X(e[1])}" cy="${Y(e[2])}" r="${e[3]*S}" fill="none" stroke="var(--ink)" stroke-width="1.5"/>`;
    else if (e[0]==='A'){ const [_,cx,cy,r]=e; s+=`<path d="M${X(cx)} ${Y(cy-r)} A ${r*S} ${r*S} 0 0 1 ${X(cx)} ${Y(cy+r)}" fill="none" stroke="var(--ink)" stroke-width="1.5"/>`; }
    else if (e[0]==='T'){ const sm=e[3]<0.095; s+=`<text x="${X(e[1])}" y="${Y(e[2])}" font-size="${sm?9.5:10.5}" fill="${sm?'var(--ink2)':'var(--ink)'}" font-family="var(--mono)">${e[4]}</text>`; }
    else if (e[0]==='I'){ const [_,b,x,y]=e;
      if (b===0){ const io = x<5; const k = io? (Math.abs(y-4.3)<.01?'S':Math.abs(y-3.5)<.01?'T':Math.abs(y-2.7)<.01?'R':null) : null;
        s+= k? `<g class="m1in" data-k="${k}" style="cursor:pointer"><title>${{S:'CHANNEL ON',T:'TOGGLE',R:'CHANNEL OFF'}[k]} input — click to pulse</title><circle cx="${X(x)}" cy="${Y(y)}" r="12" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/><text x="${X(x)}" y="${Y(y)+4}" font-size="11" text-anchor="middle" fill="var(--accent)">${k}</text></g>` : `<circle cx="${X(x)}" cy="${Y(y)}" r="6" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.5"/>`; }
      else if (b===1) s+=`<polygon points="${X(x)},${Y(y)-0.3*S} ${X(x)},${Y(y)+0.3*S} ${X(x+0.7)},${Y(y)}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.5"/>`;
      else if (b===2){ const isPot = Math.abs(y-5.9)<.01; s+= isPot? `<g class="m1pot" style="cursor:ns-resize"><title>FRONT PANEL SENSITIVITY — click to step, scroll to adjust (${sensDb().toFixed(1)} dB)</title><rect x="${X(x)-0.18*S}" y="${Y(y)-0.18*S}" width="${0.36*S}" height="${0.36*S}" fill="var(--panel2)" stroke="var(--accent2)" stroke-width="2"/><line x1="${X(x)-0.15*S}" y1="${Y(y)+0.15*S}" x2="${X(x)+0.15*S}" y2="${Y(y)-0.15*S}" stroke="var(--accent2)" stroke-width="2"/></g>` : `<rect x="${X(x-0.1)}" y="${Y(y)-0.12*S}" width="${0.2*S}" height="${0.24*S}" fill="var(--panel2)" stroke="var(--ink)"/>`; }
      else if (b===4) s+=`<rect x="${X(x)}" y="${Y(y)-0.06*S}" width="${0.2*S}" height="${0.12*S}" fill="none" stroke="var(--ink)" stroke-width="1.5"/>`;
      else if (b===5){ const on = Math.abs(y-3.9)<.01 ? q : !q; s+=`<circle cx="${X(x)}" cy="${Y(y+0.4)}" r="${0.18*S}" fill="${on?'color-mix(in srgb,var(--warn) 35%,transparent)':'none'}" stroke="var(--ink)" stroke-width="1.5"/><text x="${X(x)+14}" y="${Y(y+0.4)+4}" font-size="9" fill="var(--ink2)">NPN</text>`; }
      else if (b===6) s+=`<polygon points="${X(x)-6},${Y(y)-6} ${X(x)-6},${Y(y)+6} ${X(x)+4},${Y(y)}" fill="var(--ink)"/>`;
      else if (b===7) s+=`<rect x="${X(x)}" y="${Y(y)-0.25*S}" width="${0.9*S}" height="${0.3*S}" rx="8" fill="none" stroke="var(--ink2)"/><text x="${X(x+0.45)}" y="${Y(y)-0.04*S}" font-size="11" text-anchor="middle" fill="var(--ink2)">WBS</text>`;
    } }
  // live annotations
  s+=`<rect x="${X(4.8)}" y="${Y(4.45)}" width="${1.0*S}" height="${1.9*S}" fill="${q?'color-mix(in srgb,var(--warn) 18%,transparent)':'none'}" stroke="var(--ink)" stroke-width="1.5"/><text x="${X(5.05)}" y="${Y(3.5)}" font-size="14" font-weight="700" fill="${q?'var(--warn)':'var(--ink2)'}">Q=${q?1:0}</text>`;
  s+=`<text x="${X(12)}" y="${Y(7.3)}" font-size="11" fill="var(--accent)" font-family="var(--mono)">${isFinite(lv.sw)?lv.sw.toFixed(1)+' dBu':'muted'}</text><text x="${X(12)}" y="${Y(8.45)}" font-size="11" fill="var(--accent)" font-family="var(--mono)">${lv.intercom.toFixed(1)} dBu</text><text x="${X(12)}" y="${Y(5.35)}" font-size="11" fill="var(--accent2)" font-family="var(--mono)">contacts ${rl?'CLOSED':'open'}</text>`;
  return s+`</svg><div class="small muted">Redrawn from the entity records of <span class="mono">FA8201.DWG</span> (coordinates in inches, decoded from the R12 file). Symbols for INSERT blocks 0–2 and 6 are drawn as ${'interpreted'} (terminal, amplifier, attenuator, diode); RESISTOR and NPN are named in the DWG. Click S / T / R to pulse the latch inputs; click the SENSITIVITY pot.</div>`;
}
// Front edge — nothing in the archive shows it; a 1″ × 2.75″ MF82 card edge with the sensitivity control and tallies is inferred.
function frontSVG(t){ const q=qAt(t), a=-135+270*D.sens;
  return `<svg viewBox="0 0 220 330" style="width:100%;max-width:220px"><rect x="20" y="20" width="100" height="275" rx="3" fill="#1b5e33"/><circle cx="70" cy="50" r="7" fill="${q?'#7dff6a':'var(--led-off)'}"/><text x="128" y="54" font-size="11" fill="var(--ink)">ON tally</text><circle cx="70" cy="72" r="7" fill="${!q?'#ff4a3a':'var(--led-off)'}"/><text x="128" y="76" font-size="11" fill="var(--ink)">OFF tally</text>
   <g class="m1pot" style="cursor:ns-resize"><title>FRONT PANEL SENSITIVITY</title><circle cx="70" cy="130" r="16" fill="#dfe3ea" stroke="#555"/><line x1="70" y1="130" x2="${70+14*Math.cos((a-90)*Math.PI/180)}" y2="${130+14*Math.sin((a-90)*Math.PI/180)}" stroke="#000" stroke-width="3"/></g><text x="128" y="134" font-size="11" fill="var(--ink)">SENSITIVITY</text>
   <rect x="42" y="215" width="56" height="70" rx="6" fill="#c9c9c2"/><text x="70" y="250" font-size="11" text-anchor="middle" fill="#222" transform="rotate(90 70 250)">M8201</text><text x="4" y="320" font-size="9.5" fill="var(--ink2)">Front edge entirely ${'inferred'} (no artwork exists)</text></svg>`; }
function bindPanel(m){ m.querySelectorAll('.m1in').forEach(g=>g.onclick=()=>A.press(g.dataset.k)); m.querySelectorAll('.m1pot').forEach(g=>{ g.onclick=()=>{ D.sens=Math.round(((D.sens+0.125)%1.0001)*1000)/1000; A.sensLog(); }; g.onwheel=e=>{ e.preventDefault(); D.sens=Math.max(0,Math.min(1,D.sens+(e.deltaY<0?0.02:-0.02))); SIM.refresh(); }; }); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center"><label>Input <input type="range" id="m1i" min="-4" max="12" value="${D.inDbu}"> <span id="m1iv" class="mono"></span></label><label>Sensitivity <input type="range" id="m1s" min="0" max="100" value="${Math.round(D.sens*100)}"></label><button id="m1on">CHANNEL ON</button><button id="m1t">TOGGLE</button><button id="m1off">CHANNEL OFF</button><button id="m1r">Start over</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#m1i')) return; const u=()=>q('#m1iv').textContent=D.inDbu+' dBu'; u(); q('#m1i').oninput=e=>{D.inDbu=+e.target.value;u();SIM.refresh();}; q('#m1s').oninput=e=>A.sens(+e.target.value/100); q('#m1s').onchange=()=>A.sensLog(); q('#m1on').onclick=()=>A.press('S'); q('#m1t').onclick=()=>A.press('T'); q('#m1off').onclick=()=>A.press('R'); q('#m1r').onclick=()=>A.reset(); }

/* ---------------- lanes ---------------- */
function stateBar(c,X,t0,t1,y,h,f,onC,offC,onL,offL){ const N=400; let prev=null,xs=X(t0); for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, v=f(t); if(prev===null){prev=v;continue;} if(v!==prev||i===N){ const xe=X(t); c.fillStyle=prev?onC:offC; c.globalAlpha=.55; c.fillRect(xs,y+4,xe-xs,h-8); c.globalAlpha=1; if(xe-xs>60){c.fillStyle=SIM.css('--ink');c.font='10px sans-serif';c.fillText(prev?onL:offL,xs+4,y+h/2+3);} xs=xe; prev=v; } } }
function lanes(){ const css=SIM.css; const wave=(c,X,t0,t1,y,h,amp,gate,col)=>{ const span=t1-t0, pw=X(t1)-X(t0); c.strokeStyle=col; if(span*1000>pw/3){ for(let i=0;i<300;i++){ const ta=t0+span*i/300; if(!gate(ta)) continue; c.globalAlpha=.3; c.fillStyle=col; c.fillRect(X(ta),y+h/2-amp*h*0.45,pw/300+1,2*amp*h*0.45);} c.globalAlpha=1; return; } c.beginPath(); for(let i=0;i<=600;i++){ const ta=t0+span*i/600, v=gate(ta)?amp*Math.sin(2*Math.PI*1000*ta):0, yy=y+h/2-v*h*0.45; i?c.lineTo(X(ta),yy):c.moveTo(X(ta),yy);} c.stroke(); };
  const A_=d=>Math.pow(10,(d-24)/40);
  return [
  {label:'Latch inputs S / T / R', h:24, draw(c,X,t0,t1,y,h){ c.font='11px sans-serif'; for(const e of D.ev){ if(e.t<t0||e.t>t1) continue; c.fillStyle=e.k==='S'?css('--accent'):e.k==='R'?css('--bad'):css('--warn'); c.fillRect(X(e.t)-1,y+3,3,h-6); c.fillText(e.k,X(e.t)+4,y+h/2+4);} if(!D.ev.length){ c.fillStyle=css('--ink2'); c.fillText('no presses yet — click S, T or R',X(t0)+6,y+h/2+4);} }},
  {label:'LATCH Q', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,qAt,css('--warn'),css('--ink2'),'Q = 1 channel on','Q = 0'); }},
  {label:'Relay contacts (EXT. CH ON)', h:22, draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,relayAt,css('--accent2'),css('--ink2'),'closed','open'); }},
  {label:'ANNOUNCE INTERCOM out', h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,A_(levels(0).intercom),()=>true,css('--accent')); }},
  {label:'SWITCHED OUTPUT', h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,A_(levels(0).intercom),qAt,css('--accent')); }},
];}

/* ---------------- views ---------------- */
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Pulse CHANNEL ON / TOGGLE / CHANNEL OFF at different playhead times, then play the second back.</div>'; }
function viewSim(m){
  m.innerHTML=`${card('FA8201 functional diagram — live at the playhead', `<div id="dw"></div>${controlsHTML()}`)}
   <div class="grid2"><div>${card('Card front edge', `<div id="fp"></div>`)}</div><div>${card('What happened', `<div id="tr" class="log"></div>`)}${card('State', `<div id="in"></div>`)}</div></div>
   ${card('Timeline — one second', `<canvas id="tl"></canvas><p class="small muted">Relay operate time ${D.relayT*1000} ms ${inf}. Zoom to 5 ms to see the audio.</p>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ const t=SIM.t, lv=levels(t); m.querySelector('#dw').innerHTML=drawingSVG(t); m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML();
    m.querySelector('#in').innerHTML=`<table class="kv"><tr><th>Input</th><td class="mono">${D.inDbu} dBu (drawing: 0 to +8 dBu)</td></tr><tr><th>Sensitivity</th><td class="mono">${sensDb().toFixed(1)} dB ${inf}</td></tr><tr><th>Latch</th><td class="mono">Q = ${qAt(t)?1:0}</td></tr><tr><th>Announce intercom</th><td class="mono">${lv.intercom.toFixed(1)} dBu (always live)</td></tr><tr><th>Switched output</th><td class="mono">${isFinite(lv.sw)?lv.sw.toFixed(1)+' dBu':'muted'}</td></tr><tr><th>External channel-on</th><td class="mono">relay ${relayAt(t)?'closed':'open'} (24 V DC 50 mA)</td></tr><tr><th>Tallies</th><td class="mono">ON ${qAt(t)?'sinking 20 mA':'off'} · OFF ${qAt(t)?'off':'sinking 20 mA'}</td></tr></table>`;
    SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:190}); });
}
let lesson=0;
const LESSONS=[
  {title:'What the M8201 is', body:`<p>The only M8201 document is a 1996|29 <b>functional</b> drawing: an <b>announce channel control module</b>. A balanced programme feed (an announcer's mic line, ${inf}) goes to two outputs: an <b>ANNOUNCE INTERCOM</b> feed that is always live, and a <b>SWITCHED OUTPUT</b> that is only on while the channel is “on”. A latch, set by CHANNEL ON / TOGGLE / CHANNEL OFF inputs, decides — and drives tallies and an external relay output.</p>`, check:()=>true, auto:true},
  {title:'1 · Line up the level', body:`<p>The input may be anywhere from 0 to +8 dBu; both outputs are +4 dBu. Use the <b>FRONT PANEL SENSITIVITY</b> to bring an input of +8 dBu to +4 dBu.</p><p><b>Goal:</b> input +8 dBu, outputs +4 ±0.5 dBu.</p>`, check:()=>D.inDbu===8&&Math.abs(levels(0).intercom-4)<=0.5, hint:'Input slider to 8, sensitivity to about 25 %.'},
  {title:'2 · Turn the channel on', body:`<p>Pulse <b>CHANNEL ON</b> (the S input of the latch). The switched output opens, the ON tally sinks, and the external relay closes a few ms later.</p><p><b>Goal:</b> Q = 1 at the playhead.</p>`, check:()=>qAt(SIM.t+1e-6), hint:'Click S on the diagram or the CHANNEL ON button.'},
  {title:'3 · One button for both', body:`<p>The <b>TOGGLE</b> input (T) flips the latch, so a single push-button can work the channel. Move the playhead later and pulse T.</p><p><b>Goal:</b> at least one TOGGLE recorded.</p>`, check:()=>D.ev.some(e=>e.k==='T'), hint:'Drag the playhead to 0.5 s, then click T.'},
  {title:'4 · Watch the second', body:`<p>Press Play (or scrub). The timeline shows each press, the latch, the relay lagging the latch, and the switched output gating while the intercom feed stays continuous.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — using an announce channel module (from FA8201.DWG)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div></div><div>${card('Front edge', `<div id="fp"></div>`)}${card('What happened', `<div id="tr" class="log"></div>`)}</div></div>${card('Diagram', `<div id="dw"></div>${controlsHTML()}`)}`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#dw').innerHTML=drawingSVG(SIM.t); m.querySelector('#fp').innerHTML=frontSVG(SIM.t); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i;draw();});
    const L=LESSONS[lesson], ok=L.check(); m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#r0').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time',draw);
}
function viewSecond(m){ m.innerHTML=`<div class="grid3">${card('Audio', `<table class="kv"><tr><th>1 kHz cycles</th><td class="mono">1000 on the intercom feed</td></tr><tr><th>On the switched feed</th><td class="mono">${Math.round(1000*onFraction())} (${(onFraction()*100).toFixed(0)} % of the second)</td></tr></table>`)}${card('Control', `<table class="kv"><tr><th>Presses</th><td class="mono">${D.ev.length}</td></tr><tr><th>Latch changes</th><td class="mono">${changes()}</td></tr><tr><th>Relay operations</th><td class="mono">${changes()}</td></tr></table>`)}${card('Tallies', `<table class="kv"><tr><th>ON sink</th><td class="mono">20 mA × ${(onFraction()*1000).toFixed(0)} ms</td></tr><tr><th>OFF sink</th><td class="mono">20 mA × ${((1-onFraction())*1000).toFixed(0)} ms</td></tr></table>`)}</div>${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  SIM.on('time',()=>SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:190})); }
function onFraction(){ let n=0; for(let i=0;i<1000;i++) if(qAt(i/1000)) n++; return n/1000; }
function changes(){ let n=0, p=qAt(0); for(let i=1;i<=1000;i++){ const v=qAt(i/1000); if(v!==p) n++; p=v; } return n; }
const BLOCKS={ in:{x:10,y:40,w:130,h:56,t:'Balanced input',s:['0 to +8 dBu']}, amp:{x:170,y:40,w:150,h:56,t:'Input amplifier',s:['FRONT PANEL SENSITIVITY']}, sw:{x:350,y:40,w:110,h:56,t:'Audio switch',s:['✕, driven by Q']}, sout:{x:490,y:40,w:150,h:56,t:'−6 dB → amp',s:['SWITCHED OUTPUT +4']}, ic:{x:490,y:120,w:150,h:56,t:'−6 dB → amp',s:['ANNOUNCE INTERCOM +4']}, latch:{x:170,y:200,w:150,h:56,t:'LATCH',s:['S on · T toggle · R off']}, drv:{x:350,y:200,w:110,h:56,t:'R + NPN ×2',s:['Q and Q̄']}, out:{x:490,y:200,w:150,h:66,t:'Outputs',s:['relay 24 V 50 mA','tallies 20 mA ×2']} };
const BDESC={ in:'Balanced audio input, 0 to +8 dBu (drawing).', amp:'Gain stage with the front-panel sensitivity control.', sw:'Electronic or relay audio switch (drawn as ✕) controlled by the latch Q line at x = 7.2 in.', sout:'(−6dB) pad then amplifier to the SWITCHED OUTPUT, +4 dBu.', ic:'Taps the signal before the switch (x = 6.4 in): ANNOUNCE INTERCOM is always live.', latch:'S = CHANNEL ON, T = TOGGLE, R = CHANNEL OFF; outputs Q and Q̄.', drv:'RESISTOR + NPN blocks: Q drives the relay coil and the ON tally sink, Q̄ drives the OFF tally sink.', out:'EXTERNAL CHANNEL ON OUTPUT (relay contacts, 24 V DC 50 mA) and CHANNEL ON / CHANNEL OFF TALLY SINKs (20 mA).' };
const WIRES=[['in','amp'],['amp','sw'],['sw','sout'],['amp','ic'],['latch','sw'],['latch','drv'],['drv','out']];
function viewBlock(m){ let sel='latch'; const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 660 280" style="width:100%"><defs><marker id="m1a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y,k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9);return[x+dx*k,y+dy*k];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#m1a)"/>`; });
  for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
  m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b;draw();}); m.querySelector('#bi').innerHTML=`<h3>${BLOCKS[sel].t}</h3><p>${BDESC[sel]}</p>`; };
  m.innerHTML=`<div class="grid2">${card('Block diagram (simplified from FA8201) — click a block', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`; draw(); }
function viewSchem(m){ m.innerHTML=card('FA8201 functional drawing — redrawn from the DWG entities (not a schematic; none exists)', `<div id="dw"></div><h3>Decoded entity census</h3><table class="kv small"><tr><th>Entity</th><th>Count</th><th>Notes</th></tr><tr><td>LINE</td><td class="mono">${ENT.filter(e=>e[0]==='L').length}</td><td>wiring</td></tr><tr><td>TEXT</td><td class="mono">${ENT.filter(e=>e[0]==='T').length}</td><td>all labels, title block</td></tr><tr><td>INSERT</td><td class="mono">${ENT.filter(e=>e[0]==='I').length}</td><td>${Object.entries(BLK).map(([k,v])=>k+' = '+v).join(' · ')}</td></tr><tr><td>CIRCLE / ARC</td><td class="mono">${ENT.filter(e=>e[0]==='C'||e[0]==='A').length}</td><td>relay coil and contacts</td></tr><tr><td>POLYLINE</td><td class="mono">2 sets</td><td>not decoded (latch body / frame)</td></tr></table>`);
  SIM.on('time',()=>{ m.querySelector('#dw').innerHTML=drawingSVG(SIM.t); bindPanel(m); }); }
function viewSoft(m){ m.innerHTML=`<div class="grid2">${card('Control logic: the latch (no software)', `<div id="fsm"></div><table class="kv small"><tr><th>Input</th><th>Q next</th></tr><tr><td>S (CHANNEL ON)</td><td>1</td></tr><tr><td>R (CHANNEL OFF)</td><td>0</td></tr><tr><td>T (TOGGLE)</td><td>not Q</td></tr></table><p class="small muted">The drawing labels the latch inputs S, T, R and outputs Q, Q̄ — a set/reset latch with a toggle input. How simultaneous S and R are resolved is not shown ${inf}.</p>`)}${card('Signal path, stage by stage', `<div id="sp"></div>`)}</div>`;
  SIM.on('time',()=>{ const q=qAt(SIM.t), lv=levels(SIM.t); const node=(x,lbl,on)=>`<circle cx="${x}" cy="70" r="44" fill="${on?'var(--warn)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="66" text-anchor="middle" font-size="13" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text>`;
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 420 150" style="width:100%">${node(100,'OFF (Q=0)',!q)}${node(320,'ON (Q=1)',q)}<path d="M144 55 Q210 15 276 55" fill="none" stroke="var(--ink2)"/><text x="210" y="24" text-anchor="middle" font-size="10.5" fill="var(--ink2)">S or T</text><path d="M276 88 Q210 130 144 88" fill="none" stroke="var(--ink2)"/><text x="210" y="138" text-anchor="middle" font-size="10.5" fill="var(--ink2)">R or T</text></svg>`;
    m.querySelector('#sp').innerHTML=`<table class="kv"><tr><th>Input</th><td class="mono">${D.inDbu} dBu</td></tr><tr><th>After sensitivity</th><td class="mono">${lv.pre.toFixed(1)} dBu</td></tr><tr><th>Branch → intercom</th><td class="mono">−6 dB pad → amp → ${lv.intercom.toFixed(1)} dBu</td></tr><tr><th>Switch</th><td class="mono">${q?'closed':'open'}</td></tr><tr><th>Branch → switched</th><td class="mono">${isFinite(lv.sw)?lv.sw.toFixed(1)+' dBu':'—'}</td></tr></table>`; }); }
function viewNotes(m){ m.innerHTML=card('What the M8201 folder is up to — findings', `<ol>
  <li><b>The function is known after all.</b> The README says “function unknown”. The DWG's text reads <b>ANNOUNCE CHANNEL CONTROL MODULE · FUNCTIONAL · B 8201-01-001 ISS. 1</b>, with every input, output and level printed. “FA8201” is the functional drawing, not a final assembly.</li>
  <li><b>Two copies, one file.</b> <span class="mono">FA8201.DWG</span> and <span class="mono">M8201 - FA8201.DWG</span> are byte-identical (SHA-256 1945d939…, 14 770 bytes, 1996-01-23).</li>
  <li><b>Not an M8201 vs D8201 mix-up.</b> The rear-module guide has a D8201/D8201A (AES), unrelated: this M8201 is an analog control card with a latch, relay and tallies, built for an intercom/announce application.</li>
  <li><b>Two feeds from one input.</b> The intercom feed branches <i>before</i> the switch (at x = 6.4 in on the drawing), so the announcer is always heard on intercom; only the programme feed is switched.</li>
  <li><b>Only a functional drawing survives.</b> No schematic, PCB, BOM, manual or rear-module sheet exists; a termination for it is not in the guide either. The card may never have gone to production ${inf}.</li>
 </ol>`)+card('Assumptions', `<ul class="small"><li>Sensitivity range ±8 dB, the make-up gain after the −6 dB pads, and the relay operate time ${D.relayT*1000} ms are ${inf}.</li><li>The interpretation of INSERT blocks 0, 1, 2 and 6 (terminal, amplifier, attenuator, diode) is ${inf} from their position; 4 and 5 are named RESISTOR and NPN in the DWG.</li><li>The front edge is drawn as a generic 8200-series card ${inf}.</li></ul>`)+card('Sources', `<ul class="small mono"><li>M8201 - #Engineering #MF82/FA8201.DWG (and its identical copy)</li><li>8200 Series Rear Module options… (no M8201 sheet)</li></ul>`); }
SIM.register({
  id:'m8201', name:'M8201 · Announce channel control module (1996|29)', duration:1,
  product:'M8201', year:1996, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/M8201 - #Engineering #MF82',
  summary:'An announce-channel control card known only from its 1996|29 functional drawing: a balanced input feeds an always-live intercom output and a latched, switched programme output, with CHANNEL ON / TOGGLE / OFF inputs, tally sinks and an external relay. The diagram here is decoded straight from the DWG file.',
  highlights:['Diagram decoded from the R12 DWG entities','Latch S / T / R drives the switch, relay and tallies','Intercom feed bypasses the switch','“Function unknown” resolved from the title block'],
  depth:'Hardware model',
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms (relay)'],[0.005,'5 ms (audio)']],
  defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Drawing',render:viewSchem},{id:'software',label:'Control logic',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
