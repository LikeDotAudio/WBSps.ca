/* =====================================================================
   D8204C — 110 Ω AES/EBU DA with analog L/R outputs (Ward-Beck, 2006|39)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (#MF8200 #SERIES/…):
   - D8204C - #Master #MF82/D8204C - #Engineering/D8204C - #PCB/D8204C-ISS1.net  (Tango netlist: every
       net name and pin used below — P1 map, PIC16C54 pins, CS8427↔CS4390, DS26LS31C, H1/ALARM)
   - …/d8204c-iss1.bom, d8204c-iss1.pnp  (parts, SMT positions)
   - D8204C-ASSY - #Assembly.pdf  (assembly drawing "D8204C,ISSUE.1 RELEASED 07/06" — used as the board artwork)
   - …/D8204C_FUNCTION.cdr, D8204C Jumper Settings.cdr ("H1 is selectable for no lock alarm or audio out
       of the B2+ termination"), TB8201AP-for-D8204C.cdr  (text recovered in the .md sidecars)
   - 8200 Series Rear Module options…/D8204C - rear module options.cdr (2012) → assets/d8204c-rear-tb8201ap.svg
       (Artwork 2026|59: vectors via its Corel PDF export; TB8201AP pin labels and terminal rows)
   - SIBLING FIRMWARE (no D8204C code exists): D8204A - #Master #MF82/…/v100/v100.asm and
       D8204B - #Master #MF82/…/v101/v200.asm — used to explain what the PIC16C54 most likely did.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- constants ---------------- */
const K = {
  SRC_VPP: 4.0,          // AES3 balanced source 2–7 V p-p — 4 V inferred
  MIN_VPP: 0.2,          // CS8427 receiver sensitivity (datasheet) — inferred for this card
  DB_PER_100M: 10,       // 110 Ω twisted pair at ~3 MHz — inferred
  EQ_DB: 20,             // SW1 PH2AU boost network (R13/C9, R19/C15, like the D8204B) — inferred size
  LOCK_T: 0.02,          // CS8427 PLL — inferred
  PIC_HZ: 2.5e6,         // PIC16C54 RC oscillator R25 4K7 + C58 27p — frequency inferred
  LOOP_CYC: 6000,        // modelled on D8204A v100 MAIN (SPI refreshes + pdelay 5×256×3) — inferred
  CLIP_DBU: 26,          // NE5532 balanced output on ±20 V rails — inferred
};
const TCY = 4/K.PIC_HZ, PASS = K.LOOP_CYC*TCY;
const FS_LIST=[32000,44100,48000,96000];

/* ---------------- state ---------------- */
const D = { plugged:true, len:80, eq:false, fs:48000, prog:-20, rv:[128,128], h1:'audio', tone:1000, lossAt:null, backAt:null, log:[] };
function reset(){ Object.assign(D,{plugged:true,len:80,eq:false,fs:48000,prog:-20,rv:[128,128],h1:'audio',tone:1000,lossAt:null,backAt:null}); }
// RV1/RV2 20K trims in the NE5532 gain stage: 0 dBFS → +12 … +24 dBu (range inferred); centre ≈ +18 dBu (−20 dBFS → −2 dBu)
const refDbu = i => 12 + 12*D.rv[i]/255;

/* ---------------- model ---------------- */
function frontEnd(){
  const loss=K.DB_PER_100M*D.len/100, v=K.SRC_VPP*Math.pow(10,-loss/20);
  const budget=20*Math.log10(K.SRC_VPP/K.MIN_VPP) + (D.eq?K.EQ_DB:0);
  const margin=budget-loss, fsOK=D.fs>=30000&&D.fs<=108000;
  return { loss, v, margin, fsOK, ok: D.plugged && margin>0 && fsOK, conf: margin>0 && margin<4 };
}
const inputAt=t=>D.plugged && !(D.lossAt!==null && t>=D.lossAt && (D.backAt===null||t<D.backAt));
function rxLockAt(t){ const fe=frontEnd(); if(!fe.ok||!inputAt(t)) return false; const since=(D.backAt!==null&&t>=D.backAt)?t-D.backAt:t; return since>=K.LOCK_T; }
const RERR = t=>!rxLockAt(t) || frontEnd().conf;               // CS8427 pin 11 RERR → PIC RB2
const passI = t=>Math.floor(t/PASS);
function fwAt(t){ const i=passI(t); const ts=i*PASS; return { lock: rxLockAt(ts), rerr: RERR(ts), conf: frontEnd().conf && rxLockAt(ts) }; }
function ledsAt(t){ const f=fwAt(t); return { signal:f.lock, error:!f.lock, conf:f.conf, eq:D.eq }; }
const muteAt = t=>!fwAt(t).lock;                                 // RB3 MUTEDAC → CS4390 pins 15/16
const aesOutAt = t=>rxLockAt(t);                                 // CS8427 TXP follows the receiver
function analogOut(i){ const dbu = D.prog + refDbu(i); return { dbu, clip: dbu>K.CLIP_DBU }; }

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>50) D.log.length=50; SIM.refresh(); }
const A = {
  eq(){ act('Press EQ (SW1 PH2AU)', tr=>{ D.eq=!D.eq; tr('SW1 pin 6 (NET00103) switches R13 330R/C9 1000p ‖ R19 110R/C15 220p into U1 EL5263 (same network as the D8204B)'); tr('SW1 pin 5 → NET00016 → EQ LED (R75 330R from +5V): '+(D.eq?'ON':'OFF')); tr(`Margin ${frontEnd().margin.toFixed(1)} dB → ${frontEnd().ok?'locks':'NO LOCK'}`); }); },
  plug(){ act(D.plugged?'Disconnect AES IN at TB8201AP':'Connect AES IN at TB8201AP', tr=>{ D.plugged=!D.plugged; D.lossAt=null; D.backAt=null; tr('P1-2 IN+ → C16 → T1 PE-65612 → U1 → CS8427 RXP/RXN (pins 4/5)'); tr(D.plugged?'CS8427 PLL locks; RERR (pin 11, net RERR → PIC pin 8 RB2) goes low':'RERR goes high: no lock'); }); },
  loss(){ act('Drop input for 150 ms here', tr=>{ D.plugged=true; D.lossAt=SIM.t; D.backAt=Math.min(1,SIM.t+0.15); tr('CS8427 loses lock → RERR high'); tr('PIC (next poll, ≈'+SIM.fmtDur(PASS)+' '+'inferred'+'): RB6 SIGNAL off, RB4 ERROR on, RB3 MUTEDAC high, RB7 → Q1 ALARM'); tr('The four AES outputs come straight off TXP (pin 26) through DS26LS31C: they carry whatever the CS8427 transmits'); }); },
  len(v){ D.len=v; SIM.refresh(); },
  rv(i,v){ D.rv[i]=v; SIM.refresh(); },
  rvLog(i){ act(`Trim ${i?'CHB (RV2)':'CHA (RV1)'} → 0 dBFS = +${refDbu(i).toFixed(1)} dBu`, tr=>{ tr(`RV${i+1} 20K in the ${i?'B':'A'} output stage (NET000${i?'21/69':'07/40'}): analog only, the PIC never reads it`); const o=analogOut(i); tr(`Program ${D.prog} dBFS → ${o.dbu.toFixed(1)} dBu at ${i?'B1/B2':'A1/A2'}${o.clip?' — CLIPS':''}`); }); },
  h1(v){ act('H1 → '+(v==='alarm'?'NO LOCK ALARM':'AUDIO'), tr=>{ D.h1=v; tr('“H1 is selectable for no lock alarm or audio out of the B2+ termination” (D8204C Jumper Settings.cdr)'); tr(v==='alarm'?'B2+ (P1-20) = ALARM: Q1 4401 collector via R36 10R; base from PIC RB7 (pin 13) via R37 4K7':'B2+ = audio via R74 30R from the B output driver'); }); },
  fs(v){ act('Upstream fs '+v/1000+' kHz', tr=>{ D.fs=v; tr(frontEnd().fsOK?'CS8427 locks (30–108 kHz per datasheet; no D8204C spec in the archive)':'out of range'); }); },
  prog(v){ D.prog=v; SIM.refresh(); },
  reset(){ act('Factory defaults', tr=>{ reset(); tr('EQ off, trims centred, H1 = AUDIO'); }); },
};

/* ---------------- drawings ---------------- */
// Board artwork: assembly drawing D8204C-ASSY rendered at 150 dpi and rotated (front edge left, P1 right): 1553 × 430 px.
function boardSVG(t){
  const L=ledsAt(t);
  const led=(x,y,on,col,lbl)=>`<g><title>${lbl}</title><circle cx="${x}" cy="${y}" r="13" fill="#0a0b0b"/><circle cx="${x}" cy="${y}" r="9" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#cg)"':''}/></g>`;
  const trim=(i,x,y)=>{ const a=-135+270*D.rv[i]/255; return `<g class="cTrim" data-i="${i}" style="cursor:pointer"><title>${i?'CHB':'CHA'} 20K trim — click to step, scroll to fine-tune (now 0 dBFS = +${refDbu(i).toFixed(1)} dBu)</title><rect x="${x-34}" y="${y-30}" width="68" height="60" fill="#2a4fa0" opacity=".35" stroke="#9cf"/><circle cx="${x+12}" cy="${y}" r="13" fill="#dfe3ea" opacity=".9"/><line x1="${x+12}" y1="${y}" x2="${x+12+11*Math.cos((a-90)*Math.PI/180)}" y2="${y+11*Math.sin((a-90)*Math.PI/180)}" stroke="#000" stroke-width="3.5"/></g>`; };
  const busy=(x,y,w,h,on,col)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" opacity="${on?.35:0}"/>`;
  return `<svg viewBox="0 0 1553 430" style="width:100%;border-radius:6px">
    <defs><filter id="cg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1553" height="430" fill="#1b5e33"/>
    ${busy(1080,40,300,300,aesOutAt(t),'#4cc38a')}${busy(380,60,450,280,!muteAt(t),'#5aa9e6')}
    <image href="${ASSET}d8204c-assy-white.png" width="1553" height="430"/>
    ${led(55,297,L.signal,'#7dff6a','SIGNAL (green) — PIC RB6')}${led(55,312,L.conf,'#ffd84a','CONF (yellow) — PIC RB5')}${led(55,326,L.error,'#ff4a3a','ERROR (red) — PIC RB4')}
    ${led(137,108,L.eq,'#ffd84a','EQ (yellow) — SW1')}
    <g class="cEq" style="cursor:pointer"><title>SW1 PH2AU EQ push switch — click</title><rect x="120" y="40" width="90" height="48" fill="${D.eq?'#e8e8e0':'#8c8c86'}" opacity=".55" stroke="#fff"/></g>
    ${trim(0,339,209)}${trim(1,339,136)}
    <g class="cH1" style="cursor:pointer"><title>H1 — click to swap AUDIO / NO LOCK ALARM on B2+</title><rect x="1410" y="300" width="60" height="30" fill="${D.h1==='alarm'?'#ff4a3a':'#ffd84a'}" opacity=".6" stroke="#fff"/><text x="1440" y="320" text-anchor="middle" font-size="16" fill="#000">${D.h1==='alarm'?'ALM':'AUD'}</text></g>
    <text x="1080" y="30" font-size="18" fill="#cfe">AES path ${aesOutAt(t)?'active':'idle'}</text><text x="380" y="52" font-size="18" fill="#cfe">analog path ${muteAt(t)?'MUTED (MUTEDAC)':'active'}</text>
  </svg>
  <div class="small muted">Board artwork: the 2006|39 assembly drawing <span class="mono">D8204C-ASSY - #Assembly.pdf</span> (“D8204C,ISSUE.1 RELEASED 07/06”), rotated so the front edge is on the left and P1 on the right. LEDs, EQ switch, CHA/CHB trims and H1 are clickable overlays on their drawn positions; the coloured washes show which half of the board is working.</div>`;
}
// TB8201AP pluggable screw terminal, labels from TB8201AP-for-D8204C.cdr / the rear-module guide (two 12-way blocks)
const TB_L=[['SH',''],['AES IN −','in'],['AES IN +','in'],['GND',''],['AES OUT 1 −','a1'],['AES OUT 1 +','a1'],['GND',''],['AES OUT 3 −','a3'],['AES OUT 3 +','a3'],['GND',''],['LEFT OUT 1 −','l1'],['LEFT OUT 1 +','l1'],['GND',''],['LEFT OUT 2 −','l2'],['LEFT OUT 2 +','l2'],['GND',''],['LEFT OUT 2 −','l2b'],['LEFT OUT 2 +','l2b']];
const TB_R=[['AES OUT 2 +','a2'],['AES OUT 2 −','a2'],['GND',''],['AES OUT 4 +','a4'],['AES OUT 4 −','a4'],['GND',''],['RIGHT OUT 1 +','r1'],['RIGHT OUT 1 −','r1'],['GND',''],['RIGHT OUT 2 +','r2'],['RIGHT OUT 2 −','r2'],['GND','']];
// Artwork 2026|59: TB8201AP from the CorelDRAW rear-module guide, cell cropped at 2.5 px per pt (450 × 577.5).
// Terminal rows measured on its vectors: left block x 184 (18 rows), right block x 221 (12 rows).
const RMG_DIR='#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/';
const TB_LY=[232.0,239.8,248.0,261.0,268.5,275.8,284.5,291.3,299.3,307.8,315.1,323.6,331.0,338.8,346.7,358.6,365.9,373.9].map(y=>(y-193)*2.5);
const TB_RY=[260.5,268.4,276.1,284.0,291.8,300.4,307.7,314.4,322.0,331.3,339.2,346.9].map(y=>(y-193)*2.5);
function rearSVG(t){
  if (D.rearList) return rearListSVG(t);
  const live=k=>{ if(k==='in') return D.plugged; if(k[0]==='a') return aesOutAt(t); if(k==='r2') return D.h1==='alarm'? 'alarm' : !muteAt(t); return !muteAt(t); };
  const term=(x,y,[l,k])=>{ const v=k?live(k):false; const col=v==='alarm'?(fwAt(t).lock?'#777':'#ff4a3a'):v?(k==='in'?'var(--accent2)':k[0]==='a'?'var(--led-g)':'#5aa9e6'):'#777';
    return `<g class="${k==='in'?'cIn':''}" style="cursor:${k==='in'?'pointer':'default'}"><title>${l}${k==='in'?' — click to connect/disconnect':''}${k==='l2b'?' (second LEFT OUT 2 pair: netlist A2± on P1-21/22 AND P1-23/24)':''}${k==='r2'&&D.h1==='alarm'&&l.includes('+')?' — now NO LOCK ALARM (H1)':''}</title><rect x="${x-14}" y="${y-9}" width="28" height="18" fill="${k==='in'&&D.plugged?'rgba(58,116,184,.45)':'transparent'}"/>${k?`<circle cx="${x}" cy="${y}" r="5" fill="${col}" stroke="#000" stroke-width="1"/>`:''}</g>`; };
  let s=`<svg viewBox="0 0 450 577.5" style="width:100%;max-width:340px;display:block;border-radius:6px;background:#fbfaf6" role="img" aria-label="TB8201AP rear module (CorelDRAW art)"><image href="${ASSET}d8204c-rear-tb8201ap.svg" width="450" height="577.5"/>`;
  TB_L.forEach((r,i)=>s+=term(184,TB_LY[i],r)); TB_R.forEach((r,i)=>s+=term(221,TB_RY[i],r));
  if (D.h1==='alarm') s+=`<text x="300" y="${TB_RY[9]-14}" font-size="11" fill="#c0392b" font-weight="700">H1: NO LOCK ALARM</text>`;
  return s+`</svg><div class="small muted" style="max-width:340px">CorelDRAW art: ${SIM.src(RMG_DIR+'D8204C - rear module options.cdr','D8204C - rear module options.cdr')} (2012|45), via its Corel PDF ${SIM.src(RMG_DIR+'D8204C - rear module options.pdf','export')}. Dots: green = AES, blue = analog, red = alarm on. LEFT OUT 2 appears twice on the art, and the netlist agrees. <button class="cRearSrc" style="padding:1px 6px">show terminal list</button></div>`;
}
function rearListSVG(t){
  const live=k=>{ if(k==='in') return D.plugged; if(k[0]==='a') return aesOutAt(t); if(k==='r2') return D.h1==='alarm'? 'alarm' : !muteAt(t); return !muteAt(t); };
  const row=(x,y,[l,k])=>{ const v=k?live(k):false; const col=v==='alarm'?(fwAt(t).lock?'#555':'#ff4a3a'):v?(k==='in'?'var(--accent2)':k[0]==='a'?'var(--led-g)':'#5aa9e6'):'#555';
    return `<g class="${k==='in'?'cIn':''}" style="cursor:${k==='in'?'pointer':'default'}"><title>${l}${k==='in'?' — click to connect/disconnect':''}${k==='l2b'?' (second LEFT OUT 2 pair: netlist A2± on P1-21/22 AND P1-23/24)':''}${k==='r2'&&D.h1==='alarm'?' — now NO LOCK ALARM':''}</title><rect x="${x}" y="${y}" width="22" height="16" fill="#2b8a3e" stroke="#0b3"/><circle cx="${x+11}" cy="${y+8}" r="5" fill="#ccc"/><circle cx="${x+30}" cy="${y+8}" r="3.5" fill="${col}"/><text x="${x+38}" y="${y+12}" font-size="10.5" fill="var(--ink)">${k==='r2'&&D.h1==='alarm'&&l.includes('+')?'NO LOCK ALARM':l}</text></g>`; };
  let s=`<svg viewBox="0 0 330 ${TB_L.length*18+40}" style="width:100%;max-width:340px"><text x="0" y="14" font-size="12" font-weight="700" fill="var(--ink)">TB8201AP pluggable screw terminal</text>`;
  TB_L.forEach((r,i)=>s+=row(0,24+i*18,r)); TB_R.forEach((r,i)=>s+=row(170,24+i*18,r));
  return s+`</svg><div class="small muted">Labels as printed on the rear-module guide and <span class="mono">TB8201AP-for-D8204C.cdr</span>. LEFT OUT 2 appears twice on both drawings, and the netlist agrees: A2+ is on P1-22 and P1-24, A2− on P1-21 and P1-23. <button class="cRearSrc" style="padding:1px 6px">show CorelDRAW art</button></div>`;
}
function bindPanel(m){
  m.querySelectorAll('.cEq').forEach(g=>g.onclick=()=>A.eq());
  m.querySelectorAll('.cIn').forEach(g=>g.onclick=()=>A.plug());
  m.querySelectorAll('.cRearSrc').forEach(b=>b.onclick=()=>{ D.rearList=!D.rearList; SIM.refresh(); });
  m.querySelectorAll('.cH1').forEach(g=>g.onclick=()=>A.h1(D.h1==='alarm'?'audio':'alarm'));
  m.querySelectorAll('.cTrim').forEach(g=>{ const i=+g.dataset.i; g.onclick=()=>{ D.rv[i]=(D.rv[i]+32)%256; A.rvLog(i); }; g.onwheel=e=>{ e.preventDefault(); D.rv[i]=Math.max(0,Math.min(255,D.rv[i]+(e.deltaY<0?3:-3))); SIM.refresh(); }; });
}
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
  <label>Cable <input type="range" id="cl" min="0" max="600" step="5" value="${D.len}"> <span id="clv" class="mono"></span></label>
  <label>Program <input type="range" id="pg" min="-40" max="0" value="${D.prog}"> <span id="pgv" class="mono"></span></label>
  <label>CHA <input type="range" id="r0" min="0" max="255" value="${D.rv[0]}"></label><label>CHB <input type="range" id="r1" min="0" max="255" value="${D.rv[1]}"></label>
  <label>fs <select id="fs">${FS_LIST.map(f=>`<option value="${f}" ${f===D.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
  <label>H1 <select id="h1"><option value="audio" ${D.h1==='audio'?'selected':''}>AUDIO on B2+</option><option value="alarm" ${D.h1==='alarm'?'selected':''}>NO LOCK ALARM</option></select></label>
  <button id="eq">EQ</button><button id="ls">Drop input 150 ms here</button><button id="rs">Factory defaults</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#cl')) return; const u=()=>{q('#clv').textContent=D.len+' m'; q('#pgv').textContent=D.prog+' dBFS';}; u();
  q('#cl').oninput=e=>{A.len(+e.target.value);u();}; q('#pg').oninput=e=>{A.prog(+e.target.value);u();};
  [0,1].forEach(i=>{ q('#r'+i).oninput=e=>A.rv(i,+e.target.value); q('#r'+i).onchange=()=>A.rvLog(i); });
  q('#fs').onchange=e=>A.fs(+e.target.value); q('#h1').onchange=e=>A.h1(e.target.value); q('#eq').onclick=()=>A.eq(); q('#ls').onclick=()=>A.loss(); q('#rs').onclick=()=>A.reset(); }

/* ---------------- lanes ---------------- */
function stateBar(c,X,t0,t1,y,h,f,onC,offC,onL,offL){ const N=300; let prev=null,xs=X(t0); for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N, v=f(t); if(prev===null){prev=v;continue;} if(v!==prev||i===N){ const xe=X(t); c.fillStyle=prev?onC:offC; c.globalAlpha=.55; c.fillRect(xs,y+4,xe-xs,h-8); c.globalAlpha=1; if(xe-xs>70){c.fillStyle=SIM.css('--ink');c.font='10px sans-serif';c.fillText(prev?onL:offL,xs+4,y+h/2+3);} xs=xe; prev=v; } } }
function lanes(){ const css=SIM.css; return [
  {label:`AES frames (${D.fs/1000} kHz)`,h:24,draw(c,X,t0,t1,y,h){ if(D.lossAt!==null){c.fillStyle=css('--bad');c.globalAlpha=.25;c.fillRect(X(D.lossAt),y,X(D.backAt)-X(D.lossAt),h);c.globalAlpha=1;} if(!frontEnd().ok){c.fillStyle=css('--bad');c.font='11px sans-serif';c.fillText('no usable input',X(t0)+6,y+h/2+4);return;} SIM.pulses(c,X,t0,t1,y,h,1/D.fs,0,0.5/D.fs,css('--accent2'),'frames'); }},
  {label:'CS8427 lock / RERR',h:22,draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>!RERR(t),css('--accent'),css('--bad'),'locked, RERR low','RERR high'); }},
  {label:'PIC16C54 polls (inferred)',h:22,draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,PASS,0,PASS*0.15,css('--accent2'),'reads of RB2 RERR'); }},
  {label:'MUTEDAC (RB3)',h:22,draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>!muteAt(t),css('--accent'),css('--warn'),'DAC playing','muted'); }},
  {label:'Analog A1 (1 kHz)',h:46,draw(c,X,t0,t1,y,h){ const o=analogOut(0); const A_=Math.min(1,Math.pow(10,(o.dbu-K.CLIP_DBU)/20)); const span=t1-t0, pw=X(t1)-X(t0); c.strokeStyle=css('--accent2');
    if(span*D.tone>pw/3){ for(let i=0;i<300;i++){ const ta=t0+span*i/300; if(muteAt(ta)) continue; c.globalAlpha=.3; c.fillStyle=css('--accent2'); c.fillRect(X(ta),y+h/2-A_*h*0.45,pw/300+1,2*A_*h*0.45); } c.globalAlpha=1; return; }
    c.beginPath(); for(let i=0;i<=600;i++){ const ta=t0+span*i/600; let v=muteAt(ta)?0:A_*Math.sin(2*Math.PI*D.tone*Math.floor(ta*D.fs)/D.fs); if(o.clip) v=Math.max(-1,Math.min(1,v*1.3)); const yy=y+h/2-v*h*0.45; i?c.lineTo(X(ta),yy):c.moveTo(X(ta),yy);} c.stroke(); }},
  {label:'LEDs SIGNAL / ERROR',h:22,draw(c,X,t0,t1,y,h){ stateBar(c,X,t0,t1,y,h,t=>ledsAt(t).signal,'#3fc04a','#d2372b','SIGNAL','ERROR'); }},
];}

/* ---------------- views ---------------- */
function meter(dbu){ const w=Math.max(0,Math.min(1,(dbu+30)/60)); return `<span style="display:inline-block;width:150px;height:10px;background:var(--chip);border:1px solid var(--line);vertical-align:middle"><span style="display:block;height:100%;width:${(w*100).toFixed(1)}%;background:${dbu>K.CLIP_DBU?'var(--bad)':dbu>18?'var(--warn)':'var(--accent)'}"></span></span> <span class="mono">${dbu.toFixed(1)} dBu</span>`; }
function inspector(t){ const fe=frontEnd(), L=ledsAt(t), a=analogOut(0), b=analogOut(1);
  return `<table class="kv"><tr><th>Input</th><td class="mono">${D.plugged?D.len+' m, loss '+fe.loss.toFixed(1)+' dB':'none'} · margin ${fe.margin.toFixed(1)} dB ${fe.ok?'':'<b style="color:var(--bad)">NO LOCK</b>'}</td></tr>
  <tr><th>CS8427</th><td class="mono">${rxLockAt(t)?'locked':'unlocked'} · RERR ${RERR(t)?'high':'low'}</td></tr>
  <tr><th>AES OUT 1–4</th><td class="mono">${aesOutAt(t)?'TXP → DS26LS31C → T3–T6, 110 Ω balanced':'no signal'}</td></tr>
  <tr><th>A1 / A2 (CHA)</th><td>${muteAt(t)?'<span class="mono">muted</span>':meter(a.dbu)}</td></tr><tr><th>B1 / B2 (CHB)</th><td>${muteAt(t)?'<span class="mono">muted</span>':meter(b.dbu)}${D.h1==='alarm'?' <span class="mono">(B2+ = alarm)</span>':''}</td></tr>
  <tr><th>Trims</th><td class="mono">CHA 0 dBFS = +${refDbu(0).toFixed(1)} dBu · CHB +${refDbu(1).toFixed(1)} dBu ${inf}</td></tr>
  <tr><th>LEDs</th><td class="mono">SIGNAL ${L.signal?'●':'○'} · CONF ${L.conf?'●':'○'} · ERROR ${L.error?'●':'○'} · EQ ${L.eq?'●':'○'}</td></tr>
  <tr><th>ALARM (Q1)</th><td class="mono">${fwAt(t).lock?'off':'sinking'}${D.h1==='alarm'?' → on B2+':' (not routed: H1 = audio)'}</td></tr></table>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the EQ switch, the CHA/CHB trims or H1 on the board, or AES IN on the terminal block.</div>'; }
function viewSim(m){
  m.innerHTML=`${card('The board at the playhead (real assembly drawing)', `<div id="bd"></div>${controlsHTML()}`)}
  <div class="grid2"><div>${card('Rear module', `<div id="rp"></div>`)}</div><div>${card('What happened', `<div id="tr" class="log"></div>`)}${card('State at the playhead', `<div id="in"></div>`)}</div></div>
  ${card('Timeline — one second', `<canvas id="tl"></canvas><p class="small muted">No D8204C firmware is in the archive. The PIC16C54 is wired to read CS8427's hardware RERR pin, drive four LEDs, mute the DAC and pull the ALARM transistor (all from the netlist). Its loop timing is ${inf} from the sibling D8204A code at an RC-oscillator rate of ~2.5 MHz: ${SIM.fmtDur(PASS)} per poll.</p>`)}
  ${card('Action log', `<div id="lg" class="log"></div>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ const t=SIM.t; m.querySelector('#bd').innerHTML=boardSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML(); m.querySelector('#in').innerHTML=inspector(t); m.querySelector('#lg').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>'; SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:170}); });
}
let lesson=0;
const LESSONS=[
  {title:'Meet the D8204C', body:`<p>A D8204 variant for <b>110 Ω balanced</b> plants: one AES input, <b>four AES outputs</b>, and a built-in D/A giving <b>LEFT and RIGHT analog outputs</b> (two balanced pairs each). It plugs into an MF82 frame with the <b>TB8201AP</b> pluggable screw-terminal rear module.</p><p class="muted">No manual survives (the #Manual folder is empty); these steps come from the artwork, jumper sheet and netlist.</p>`, check:()=>true, auto:true},
  {title:'1 · Wire the input', body:`<p>Connect the AES feed to <b>AES IN + / − / SH</b> on the TB8201AP. The green SIGNAL LED lights once the CS8427 locks.</p><p><b>Goal:</b> SIGNAL on.</p>`, check:()=>rxLockAt(0.5), hint:'Click AES IN on the terminal block if it is disconnected.'},
  {title:'2 · A long run', body:`<p>Over long cables the eye closes. Press <b>EQ</b> (SW1 on the front edge) to switch in the HF boost; the yellow EQ LED lights.</p><p><b>Goal:</b> lock over 350 m.</p>`, check:()=>D.len>=350&&frontEnd().ok, hint:'Drag Cable to 350 m, then press EQ.'},
  {title:'3 · Line up the analog outputs', body:`<p>The <b>CHA</b> and <b>CHB</b> 20K trims set the analog level. Feed −20 dBFS tone and set each output to <b>+4 dBu</b> (0 dBFS = +24 dBu).</p><p><b>Goal:</b> A and B at +4 dBu ±0.5 with −20 dBFS in.</p>`, check:()=>D.prog===-20&&Math.abs(analogOut(0).dbu-4)<=0.5&&Math.abs(analogOut(1).dbu-4)<=0.5, hint:'Slide CHA and CHB to about 255.'},
  {title:'4 · Use B2+ as an alarm', body:`<p><b>H1</b> chooses what reaches the RIGHT OUT 2 + (B2+) terminal: audio, or the NO LOCK alarm (open collector, Q1).</p><p><b>Goal:</b> H1 = NO LOCK ALARM, then drop the input and see the terminal light red.</p>`, check:()=>D.h1==='alarm'&&D.lossAt!==null, hint:'Click H1 on the board (right end), then “Drop input”.'},
  {title:'Done', body:`<p>See <b>Software</b> for what the PIC16C54 is wired to do, and <b>Findings</b> for the label mix-ups in the artwork.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — installing a D8204C', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div>${card('State', `<div id="in"></div>`)}</div><div>${card('Rear module', `<div id="rp"></div>`)}${card('What happened', `<div id="tr" class="log"></div>`)}</div></div>${card('The board', `<div id="bd"></div>${controlsHTML()}`)}`;
  bindControls(m);
  const draw=()=>{ const t=Math.max(SIM.t,0.5); m.querySelector('#bd').innerHTML=boardSVG(SIM.t); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML(); m.querySelector('#in').innerHTML=inspector(t);
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i;draw();});
    const L=LESSONS[lesson], ok=L.check(); m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#r0').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time',draw);
}
function viewSecond(m){
  m.innerHTML=`<div class="grid3">${card('AES side', `<table class="kv"><tr><th>Frames in/out</th><td class="mono">${D.fs.toLocaleString()}</td></tr><tr><th>Copies</th><td class="mono">4 (one TXP, four DS26LS31C drivers)</td></tr><tr><th>Bit-cell rate</th><td class="mono">${(128*D.fs/1e6).toFixed(3)} Mbaud</td></tr></table>`)}
   ${card('DAC side', `<table class="kv"><tr><th>CS4390 samples</th><td class="mono">${(2*D.fs).toLocaleString()} (L+R)</td></tr><tr><th>Clocks</th><td class="mono">MCLK = CS8427 RMCK, SCLK, LRCK, SDATA</td></tr><tr><th>1 kHz tone</th><td class="mono">${(D.fs/1000).toFixed(1)} samples per cycle</td></tr><tr><th>Outputs</th><td class="mono">A1, A2 (twice), B1, B2</td></tr></table>`)}
   ${card('PIC16C54', `<table class="kv"><tr><th>Clock</th><td class="mono">RC 4K7 / 27p ≈ ${K.PIC_HZ/1e6} MHz ${inf}</td></tr><tr><th>Polls</th><td class="mono">≈${Math.floor(1/PASS)} × ${SIM.fmtDur(PASS)} ${inf}</td></tr><tr><th>Pins used</th><td class="mono">11 of 12 I/O (netlist)</td></tr></table>`)}</div>
   ${card('Zoom: the analog output at the playhead', `<canvas id="z"></canvas>`)}`;
  SIM.on('time',()=>SIM.drawLanes(m.querySelector('#z'),lanes().slice(3),{labelW:170}));
}
const BLOCKS={
  tb:{x:10,y:130,w:120,h:60,t:'TB8201AP',s:['screw terminals','110 Ω balanced'],d:'Pluggable screw-terminal rear module (TB8201AP-D8204C-WIRING.sch in the TB8201AP folder).'},
  in:{x:150,y:130,w:130,h:70,t:'T1 + U1 EL5263',s:['PE-65612','SW1 EQ network'],d:'Input transformer and equaliser; BOM says EL5263IS on an EL2280C footprint.'},
  rx:{x:300,y:130,w:130,h:70,t:'U3 CS8427',s:['RX → TX','RMCK/SCLK/LRCK/SDOUT'],d:'AES3 transceiver (placed on a CS8420 footprint). TXP drives the output buffers; the serial port feeds the DAC.'},
  aes:{x:450,y:60,w:150,h:70,t:'U14 DS26LS31C',s:['4 drivers ← TXP','T3–T6 → OUT1–4'],d:'Quad RS-422 driver; all four inputs tied to CS8427 TXP (NET00104). Each output through a PE-65612 transformer.'},
  dac:{x:450,y:190,w:150,h:70,t:'U7 CS4390',s:['24-bit stereo DAC','MUTEC ← RB3'],d:'Hardware-mode DAC: no control port, so the only thing the PIC can do is mute it (MUTEDAC on pins 15/16).'},
  ana:{x:630,y:190,w:150,h:70,t:'NE5532 ×6',s:['filters, RV1/RV2','balanced 30R outs'],d:'U5/U6/U8/U9 filter and gain (RV1 CHA, RV2 CHB 20K trims), U11/U12 output drivers with 30R build-outs to A1±, A2±, B1±, B2±.'},
  pic:{x:300,y:20,w:130,h:70,t:'U10 PIC16C54',s:['RC osc','LEDs, MUTE, ALARM'],d:'Reads RERR, sets up the CS8427 over 4-wire SPI (SCK RA2, SDO RA3, SDI RA1, CS RA0), drives SIGNAL/CONF/ERROR LEDs, MUTEDAC and ALARM. Code not archived.'},
  out:{x:630,y:60,w:110,h:60,t:'AES OUT 1–4',s:['P1-7…14'],d:'Balanced 110 Ω outputs.'},
};
const WIRES=[['tb','in','IN±'],['in','rx','RXP/N'],['rx','aes','TXP'],['aes','out',''],['rx','dac','I²S'],['dac','ana',''],['pic','rx','SPI, RERR'],['pic','dac','MUTE']];
function blockSVG(sel){ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 800 280" style="width:100%"><defs><marker id="ca" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y,k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9);return[x+dx*k,y+dy*k];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#ca)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
  for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; } return s+'</svg>'; }
function viewBlock(m){ let sel='rx'; m.innerHTML=`<div class="grid2">${card('Block diagram (from the netlist) — click a block', `<div id="bd"></div>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('Signal flow', `<p>One receiver feeds two worlds: the regenerated AES stream is fanned out by a quad line driver to four transformers, and the same chip's serial audio port drives a stereo DAC whose output is filtered, trimmed and buffered into four balanced analog pairs.</p>`)}</div></div>`;
  const draw=()=>{ m.querySelector('#bd').innerHTML=blockSVG(sel); m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b;draw();}); const b=BLOCKS[sel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; }; draw(); }
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length),h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n_],i)=>{const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p}</text>${n_?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${n_}</text>`:''}`;});
  right.forEach(([p,n_],i)=>{const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p}</text>${n_?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${n_}</text>`:''}`;}); return s; }
const SHEETS=[
  {name:'1 · PIC16C54', note:'All pin nets from D8204C-ISS1.net (pin numbers are the 18-pin PIC16C54 package).', svg:()=>chip(340,40,170,'U10 PIC16C54',[['17 RA0','CS2 → U3-2 AD0/CS'],['18 RA1','SDI ← U3-1 CDOUT'],['1 RA2','SCK → U3-28 CCLK'],['2 RA3','SDO → U3-27 CDIN'],['4 MCLR','U13 MC34164 reset'],['16 OSC1','R25 4K7 / C58 27p (RC)'],['14 VDD','+5V'],['5 VSS','GNDD']],[['7 RB1','RESET → U3-9'],['8 RB2','RERR ← U3-11'],['9 RB3','MUTEDAC → U7-15/16'],['10 RB4','R34 → ERROR (red)'],['11 RB5','R33 → CONF (yellow)'],['12 RB6','R32 → SIGNAL (green)'],['13 RB7','R37 → Q1 base → ALARM'],['6 RB0','—']],'no firmware in the archive')},
  {name:'2 · CS8427 and DAC', note:'Receiver/transmitter and DAC nets from the netlist. U3 value CS8427, component name CS8420 (footprint reuse).', svg:()=>chip(170,50,170,'U3 CS8427',[['4 RXP','C10 ← U1'],['5 RXN','C12'],['8 FILT','R23 4K7, C17, C20'],['9 RST','RESET'],['11 RERR','→ PIC RB2']],[['26 TXP','NET00104 → U14 1,7,9,15'],['10 RMCK','MCLK'],['16 OSCLK','SCLK'],['17 OLRCK','LRCK'],['18 SDOUT','SDATA']],'')+chip(560,50,150,'U7 CS4390',[['8 MCLK','MCLK'],['9 SCLK','SCLK'],['7 LRCK','LRCK'],['10 SDATA','SDATA'],['15/16','MUTEDAC']],[['17/18','→ A filter'],['13/14','→ B filter']],'24-bit stereo DAC')},
  {name:'3 · AES output drivers', note:'U14 DS26LS31C quad driver, all inputs on TXP. Outputs through C/T3–T6 PE-65612 to P1.', svg:()=>{ let s=''; [['2','T3','OUT1−/+','P1-7/8'],['6','T4','OUT2−/+','P1-9/10'],['10','T5','OUT3−/+','P1-11/12'],['14','T6','OUT4−/+','P1-13/14']].forEach(([p,tt,n,pp],i)=>{ const y=60+i*80; s+=`<polygon points="160,${y-18} 160,${y+18} 196,${y}" fill="var(--panel2)" stroke="var(--ink)"/><text x="150" y="${y+4}" text-anchor="end" font-size="11" fill="var(--accent2)">TXP →</text><text x="200" y="${y-8}" font-size="10" fill="var(--ink)">U14 pin ${p}</text><line x1="196" y1="${y}" x2="280" y2="${y}" stroke="var(--ink)"/><text x="290" y="${y+4}" font-size="11" fill="var(--ink)">${tt} PE-65612 ⫴</text><line x1="400" y1="${y}" x2="460" y2="${y}" stroke="var(--ink)"/><text x="466" y="${y+4}" font-size="11" fill="var(--accent2)">${n} → ${pp}</text>`; }); return s; }},
  {name:'4 · Edge connector P1', note:'P1 EDAC30\\156 nets from the netlist (1–30 numbering). Pins 3–6 carry no named net.', svg:()=>{ const P=[['1','AES IN − (T1-2)'],['2','IN+ (C16)'],['7/8','OUT1 −/+'],['9/10','OUT2 −/+'],['11/12','OUT3 −/+'],['13/14','OUT4 −/+'],['15/16','B1 −/+'],['17/18','A1 −/+'],['19/20','B2 − / B2+ (H1: audio R74 or ALARM)'],['21/22','A2 −/+'],['23/24','A2 −/+ (again)'],['25/26','V− → F1 → D3 → −VA, 79L05 → −5V'],['27/28','GNDD'],['29/30','V+ → F2 → D4 → +VA; LM2596 → +5V']]; let s=''; P.forEach(([p,n],i)=>{ const y=40+i*26; s+=`<rect x="80" y="${y-12}" width="56" height="18" fill="#d4af37" opacity=".7"/><text x="108" y="${y+1}" text-anchor="middle" font-size="11" fill="#000">${p}</text><line x1="136" y1="${y-3}" x2="190" y2="${y-3}" stroke="var(--ink)"/><text x="196" y="${y+1}" font-size="11.5" fill="var(--accent2)">${n}</text>`; }); return s; }},
];
function viewSchem(m){ let i=0; m.innerHTML=card('Schematic set (redrawn from D8204C-ISS1.net — not the P-CAD drawing)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">Original: <span class="mono">D8204C - #PCB/D8204C-ISS1.sch</span> (P-CAD, 2006|39) and <span class="mono">WORKING/D8204C-ISS2.sch</span>. Blue labels are netlist nets.</p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();}); m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 420" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><text x="840" y="410" text-anchor="end" font-size="10" fill="var(--ink2)">D8204C · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`; m.querySelector('#sn').textContent=SHEETS[i].note; }; draw(); }
function viewSoft(m){
  const steps=[['READ RERR (RB2)','hardware pin, not an SPI register read ('+'inferred'+' from the netlist)'],['REFRESH CS8427 (SPI on RA0–RA3)','as REFRESH8420_1 in D8204A/D8204B: regs 1–6, 9, 17'],['LEDs: SIGNAL RB6 / ERROR RB4 / CONF RB5','as REFRESHSTATUS'],['MUTEDAC RB3, ALARM RB7','mute the CS4390, pull Q1'],['delay','D8204A: pconstant 5 → 5 × 256 × 3 cycles']];
  m.innerHTML=`<div class="grid2">${card('What the PIC16C54 was wired to do (code not archived) — lit step at the playhead', `<div id="fl"></div><p class="small muted">The loop is reconstructed from the sibling D8204A <span class="mono">v100.asm</span> (MAIN: READ_SWITCHES, PROCESS_SWITCHES, REFRESH8420_1/2, READ8420s, REFRESHSTATUS, REFRESH4392, pdelay) minus what the D8204C hardware can't do: there are no DIP switches and the CS4390 has no control port. ${inf}</p>`)}
   ${card('Sibling code that explains the D8204C', `<table class="kv"><tr><th>Sibling</th><th>What it shows</th></tr><tr><td class="mono">D8204B v200.asm</td><td class="small">On no-lock: green off, red on, RC6 open-collector error, CS8420 reg 3 = <span class="mono">11010101</span> (TXOFF). The D8204C's RB7→Q1 ALARM mirrors RC6→Q1.</td></tr><tr><td class="mono">D8204A v100.asm</td><td class="small">CS4392 DAC with a register map: reference level table −20…−10 dBFS (<span class="mono">cs4392reg3_20 … _10</span>) and 16 L/R mix modes (<span class="mono">cs4392reg2_left_right … mute_mute</span>). The D8204C replaced the CS4392 with a CS4390, so these became the CHA/CHB trims and a single mute line.</td></tr><tr><td class="mono">Both</td><td class="small">cs8420reg3def <span class="mono">10010101</span>, reg4 <span class="mono">01001001</span>, reg17 mask <span class="mono">00010000</span> (UNLOCK). The CS8427 shares the CS8420's register map for these.</td></tr></table>`)}</div>
   ${card('Signal path, stage by stage (hardware)', `<table class="kv"><tr><th>Stage</th><th>Part / net</th><th>Level now</th></tr><tr><td>Input</td><td class="mono small">P1-1/2 → T1 → U1 EL5263</td><td class="mono" id="s1"></td></tr><tr><td>Receiver</td><td class="mono small">U3 CS8427</td><td class="mono" id="s2"></td></tr><tr><td>AES out</td><td class="mono small">TXP → U14 → T3–T6</td><td class="mono" id="s3"></td></tr><tr><td>DAC</td><td class="mono small">U7 CS4390</td><td class="mono" id="s4"></td></tr><tr><td>Analog</td><td class="mono small">NE5532 + RV1/RV2 → 30R</td><td class="mono" id="s5"></td></tr></table>`)}`;
  SIM.on('time',()=>{ const t=SIM.t, k=Math.floor(((t%PASS)/PASS)*steps.length); let s=`<svg viewBox="0 0 520 ${steps.length*44+20}" style="width:100%">`; steps.forEach((p,j)=>{ const y=10+j*44; s+=`<rect x="20" y="${y}" width="480" height="36" rx="6" fill="${j===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="30" y="${y+15}" font-size="12" font-family="var(--mono)" fill="${j===k?'#fff':'var(--ink)'}">${p[0]}</text><text x="30" y="${y+30}" font-size="10" fill="${j===k?'#eef':'var(--ink2)'}">${p[1]}</text>`; }); m.querySelector('#fl').innerHTML=s+'</svg>';
    const fe=frontEnd(); m.querySelector('#s1').textContent=fe.v.toFixed(2)+' V p-p, margin '+fe.margin.toFixed(1)+' dB'; m.querySelector('#s2').textContent=rxLockAt(t)?'locked':'unlocked'; m.querySelector('#s3').textContent=aesOutAt(t)?'4 × 110 Ω':'—'; m.querySelector('#s4').textContent=muteAt(t)?'muted':D.prog+' dBFS'; m.querySelector('#s5').textContent=muteAt(t)?'—':'A '+analogOut(0).dbu.toFixed(1)+' / B '+analogOut(1).dbu.toFixed(1)+' dBu'; });
}
function viewNotes(m){
  m.innerHTML=card('What the D8204C is up to — findings', `<ol>
   <li><b>No firmware, but the netlist tells the job.</b> The BOM lists a PIC16C54 (U10) and the folder has no code. The netlist shows exactly what it controls: 4-wire SPI to the CS8427 (RA0–RA3), the RERR pin (RB2), CS8427 RESET (RB1), DAC mute (RB3), three LEDs (RB4–RB6) and the ALARM transistor (RB7). RB0 is unused. It runs on an RC oscillator (R25 4K7, C58 27p) — no crystal.</li>
   <li><b>The rear-module guide calls it the opposite converter.</b> The D8204C sheet's title is “110 Ohm AES/EBU Distribution Amplifier & Analog to AES/EBU Digital Converter”. The hardware is a <b>digital-to-analog</b> path (CS8427 → CS4390 DAC → analog outputs); nothing converts analog to AES.</li>
   <li><b>LEFT OUT 2 twice — and it's real.</b> Both the rear-module guide and <span class="mono">TB8201AP-for-D8204C.cdr</span> print LEFT OUT 2 ± twice. The netlist confirms A2+ on P1-22 <i>and</i> P1-24, A2− on P1-21 and P1-23, so the left channel gets three outputs and the right two (one of which H1 can steal for the alarm).</li>
   <li><b>Part substitutions on old footprints.</b> U3 is valued CS8427 on the CS8420 component; U1 is EL5263IS on the EL2280C component. Cheaper/newer parts dropped onto the D8204B library parts.</li>
   <li><b>The DAC can't be told anything.</b> The sibling D8204A sets reference level and L/R mix in a CS4392's registers. The D8204C's CS4390 is a hardware-mode DAC; the only control left is MUTEDAC, and level moved to the analog trims CHA/CHB.</li>
   <li><b>Sibling bug worth knowing.</b> In D8204A <span class="mono">PROCESS_SWITCHES</span>, <span class="mono">andlw 0x78</span> masks W but then <span class="mono">rrf temp0</span> ×3 rotates a different register, so <span class="mono">analog_type_table</span> indexes on stale data. If the D8204C code was derived from it, the D8204C was spared because it has no switches to read.</li>
   <li><b>H1 is documented.</b> “H1 is selectable for no lock alarm or audio out of the B2+ termination” — the only D8204C jumper.</li>
   <li><b>Artwork 2026|59: rear module now from ${SIM.src(RMG_DIR+'D8204C - rear module options.cdr','D8204C - rear module options.cdr')} (CorelDRAW X3, 2012-01-16).</b> The TB8201AP is its vectors (black plate, white legends) through Corel's own ${SIM.src(RMG_DIR+'D8204C - rear module options.pdf','PDF export')}; every terminal dot sits on its screw. The 2006 ${SIM.src(E+'TB8201AP-for-D8204C.cdr','TB8201AP-for-D8204C.cdr')} is the same page four years earlier. The art shows three separate blocks on the left (3-way input, 12-way, 3-way) and one 12-way block on the right, and the last left block repeats GND / LEFT OUT 2 − / LEFT OUT 2 +.</li>
   <li><b>Files.</b> <span class="mono">#Manual</span> is empty; <span class="mono">#ARCHIVE</span> duplicates the three CDR files; a working ISS2 schematic/PCB exists (2006|39) with no BOM; PnP data was regenerated in 2013|46 and 2015|48.</li>
  </ol>`)+card('Assumptions', `<ul class="small"><li>Cable loss ${K.DB_PER_100M} dB/100 m, source 4 V p-p, EQ +${K.EQ_DB} dB: ${inf}.</li><li>PIC loop ${SIM.fmtDur(PASS)} and its steps: ${inf} from D8204A v100.asm.</li><li>CONF LED meaning (lit when locked but the margin is under 4 dB) ${inf}; the real code may have used CS8427 reg 16 CONF.</li><li>Trim range (0 dBFS = +12…+24 dBu) and clip at +${K.CLIP_DBU} dBu ${inf}.</li></ul>`)
  +card('Sources', `<ul class="small mono"><li>D8204C - #Engineering/D8204C - #PCB/D8204C-ISS1.net · d8204c-iss1.bom · d8204c-iss1.pnp</li><li>D8204C-ASSY - #Assembly.pdf · D8204C_FUNCTION.cdr · D8204C Jumper Settings.cdr · TB8201AP-for-D8204C.cdr</li><li>8200 Series Rear Module options…/D8204C - rear module options.pdf</li><li>D8204A…/v100/v100.asm · D8204B…/v101/v200.asm (siblings)</li></ul>`);
}
SIM.register({
  id:'d8204c', name:'D8204C · 110 Ω AES DA with analog outputs (2006|39)', duration:1,
  product:'D8204C', year:2006, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8204C - #Master #MF82',
  summary:'A 110 Ω AES/EBU distribution card for the TB8201AP screw-terminal module: one input, four transformer-coupled AES outputs, and a CS4390 DAC feeding balanced left/right analog outputs. A PIC16C54 (code not archived) watches the receiver, mutes the DAC and drives the LEDs and alarm.',
  highlights:['Real assembly drawing as the board','AES and analog paths at once','Netlist-exact PIC pin map','H1 alarm on B2+','“Analog to AES” label is backwards'],
  footnotes:[
    {text:'Rear-module art: the TB8201AP is vectors of the 2012 CorelDRAW guide, via its Corel PDF export (libcdr renders the guide’s symbol fonts badly).', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8204C - rear module options.cdr'},
    {text:'The guide titles the card “110 Ohm AES/EBU Distribution Amplifier & Analog to AES/EBU Digital Converter”, but the D8204C converts AES to analog (CS4390 DAC).', src:'#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8204C - rear module options.cdr'},
    {text:'LEFT OUT 2 ± is printed twice on the TB8201AP, on the middle and the bottom left blocks; the netlist confirms A2± on P1-21/22 and P1-23/24.', src:'#MF8200 #SERIES/D8204C - #Master #MF82/D8204C - #Engineering/TB8201AP-for-D8204C.cdr'},
    {text:'D8204C Jumper Settings.cdr: “H1 is selectable for no lock alarm or audio out of the B2+ termination” — the only jumper on the card.', src:'#MF8200 #SERIES/D8204C - #Master #MF82/D8204C - #Engineering/D8204C Jumper Settings.cdr'},
    {text:'The three D8204C CDRs (function diagram, jumper settings, TB8201AP page) are stored again, same dates and sizes, in D8204C - #ARCHIVE.', src:'#MF8200 #SERIES/D8204C - #Master #MF82/D8204C - #Engineering/D8204C - #ARCHIVE/D8204C_FUNCTION.cdr'},
  ],
  depth:'Hardware model',
  stepUnits:[{label:'1 PIC poll (inferred)',period:()=>PASS},{label:'1 AES frame',period:()=>1/D.fs},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s (whole)'],[0.2,'200 ms'],[0.02,'20 ms'],[0.003,'3 ms (3 tone cycles)'],[0.0005,'500 µs'],[4/48000,'4 frames']],
  defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
