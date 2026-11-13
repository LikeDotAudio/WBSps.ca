/* =====================================================================
   MF250 — frame for the R2K console power supplies (Ward-Beck Systems, 1998|31–2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html) — hardware model

   Sources (folder "#CONSOLES - #OBSOLETE #Archive/XXX - MF250 - FRAME FOR R2K PSU #Mechanical #Obsolete"):
   - MF250M9 ISS 1 (OUTER BRKT.) .dwg + .pdf (moved to the folder top): .047 CRS 18 ga, 0.324 × 0.866, .162 rad,
       three .089 tap 4-40, QTY 3 per frame, 2:1
   - Not in ERP/ (2012–2013 redraws): M1–M4 ISS 3 support bars (extrusion B9901, clear alodine),
       M5 ISS 2 REAR HOUSING (.059 CRS, 17.090 × 3.425 face)          -> assets/mf250-frame-for-r2k-psu-rear.svg
       M6 inner plate, M7 protective cover, M8 inner bracket, M48 rack-mount power entry cover,
       M10 ISS 1 BLANK P.S.U FRONT PANEL (4.980 × 2.750, .050 alum)   -> assets/mf250-frame-for-r2k-psu-m10-blank.svg
       + LAYOUT files (M5 layout's title block reads "MF8212RM1 ISS.2 JAN.13/06")
   Elsewhere (#CONSOLES - #OBSOLETE #Archive/MF250/): MF251.PCB (Tango, MF251 ISSUE.1, 1999-03-15:
     P1–P6 EDAC307 + J1–J6 CON20SS at 1.000 in, PSU1/PSU2, AC1/AC2, +21/−21/GND labels),
     MF250.BAK (1998 board with EDAC24 PSU sockets and "MF8210.TOP"), MF251.DSN / MF251W1.DSN (fuses, AC1/AC2),
     MF251S1.CDR / RK12PWR.CDR (silk: "MF251 CONSOLE POWER", AC1, AC2, 115/230 VAC, caution),
     RADIO/REN2K/R2KUSPG2.HTM (MF251 Power Supply Mounting Frame, essential in R2K/12/20/28)
   Anything not in those files is marked "inferred".
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__mf250Active';

/* ---------------- geometry (inches) ---------------- */
const RW=17.090, RH=3.425;                                 // MF250M5 rear face
const R_AC=[[1.163,0.92],[3.163,0.92]], R_FUSE=[[2.163,0.93],[4.163,0.93]], R_PWR=[6.273,0.87,1.530,0.985], R_POST=[[7.773,0.92],[8.523,0.92]];
const R_SLOT=k=>11.105+k*1.0;                              // DETAIL D cut-outs, 0.745 × 2.70
const F_SLOT=k=>0.30+k*1.0+0.40;                           // MF251.PCB P1 at x 1300 mils (board edge 995) + 1.000 pitch
const F_BAY=[6.85, 11.96];                                 // PSU1/PSU2 sockets 9960 / 15070 mils → 5.11 in pitch (bay edges inferred)
const BRKT={w:0.324,h:0.866,r:0.162,holes:[0.125,0.525],tab:0.220};

/* ---------------- state ---------------- */
const D = { brackets:3, bay:['unit','blank'], ac:[true,false], fuse:[1.5,1.5], blown:[false,false], vac:120, slots:[true,true,false,false,false,false], console:'R2K/20', pullAt:null, pullBay:0, log:[] };
function reset(){ Object.assign(D,{brackets:3,bay:['unit','blank'],ac:[true,false],fuse:[1.5,1.5],blown:[false,false],vac:120,slots:[true,true,false,false,false,false],console:'R2K/20',pullAt:null,pullBay:0}); }
const CONS={ 'R2K/12':[2.3,1.3], 'R2K/20':[2.6,1.4], 'R2K/28':[3.0,1.6] };   // ±21 V console load in A (inferred, see M8246 plugin)
const DA=[0.09,0.085];                                                         // per 8200-series DA (inferred)
const VB=21.2, EFF=0.8, PF=0.62;                                               // bus after diodes; M8245A efficiency; capacitor-input power factor (inferred)

function powered(k,t){ return D.bay[k]==='unit' && D.ac[k] && !D.blown[k] && !(D.pullAt!=null && k===D.pullBay && t>=D.pullAt); }
function loads(){ const c=CONS[D.console], n=D.slots.filter(x=>x).length; return {p:c[0]+n*DA[0], n:c[1]+n*DA[1], das:n}; }
function state(t){ const L=loads(), on=[0,1].filter(k=>powered(k,t)); const pw=VB*(L.p+L.n);
  const share=[0,0]; on.forEach(k=>share[k]=pw/on.length);
  const lim = on.length===1 && (L.p>4||L.n>3);
  const iin=share.map(p=>p? p/EFF/(D.vac*PF) : 0);
  const loss = share.reduce((a,p)=>a+p*(1/EFF-1),0) + L.das*3.0;           // 3 W per DA (inferred)
  return { L, on, pw, share, iin, lim, bus: on.length? (lim? VB*0.8 : VB) : 0, loss, rise: loss/1.4 };   // 1.4 W/°C natural convection (inferred)
}
/* fuse: slow-blow, opens when current > 2.1 × rating within the second (inferred I²t) */
function fuseCheck(tr){ const s=state(0); [0,1].forEach(k=>{ if(!D.blown[k] && s.iin[k] > 2.1*D.fuse[k]){ D.blown[k]=true; tr&&tr(`F${k+1} (${D.fuse[k]} A SB) opens: ${s.iin[k].toFixed(2)} A rms drawn`); } }); }

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); fuseCheck(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  bay(k){ act(`Bay ${k+1}: ${D.bay[k]==='unit'?'pull the M8246':D.bay[k]==='blank'?'remove the MF250M10 blank':'fit an M8246'}`, tr=>{
    D.bay[k] = D.bay[k]==='unit'?'empty' : D.bay[k]==='blank'?'unit' : 'blank';
    if (D.bay[k]==='unit') tr(`M8246 card edge mates MF251 PSU${k+1} (x ${k?'15070':'9960'} mils); front panel 4.980 wide fills the bay`);
    if (D.bay[k]==='blank') tr('MF250M10 blank P.S.U front panel (4.980 × 2.750, .050 alum) closes the bay');
    if (D.bay[k]==='empty') tr('Bay open: fit a blank to keep airflow and fingers out '+inf('purpose of the blank'));
    const s=state(SIM.t); tr(`Bus ${s.bus.toFixed(1)} V · ${s.on.length} unit(s) carrying ${s.pw.toFixed(0)} W`); }); },
  ac(k){ act(`${D.ac[k]?'Unplug':'Plug in'} AC${k+1}`, tr=>{ D.ac[k]=!D.ac[k]; tr(`AC${k+1} (PAN356 inlet, L · N · CH on MF251) ${D.ac[k]?'live':'dead'} → feeds PSU${k+1} through F${k+1} ${inf('pairing')}`); }); },
  fuse(k){ act(D.blown[k]?`Replace F${k+1}`:`Change F${k+1} to ${D.fuse[k]===1.5?'0.75':'1.5'} A SB`, tr=>{ if(D.blown[k]){ D.blown[k]=false; tr(`New ${D.fuse[k]} A slow-blow fitted`); } else { D.fuse[k]= D.fuse[k]===1.5?0.75:1.5; tr(`Rear silk: “1.5/0.75 A SB 115/230V” — ${D.fuse[k]} A is the ${D.fuse[k]===1.5?'115':'230'} V value`); } }); },
  vac(v){ act(`Mains ${v} V`, tr=>{ D.vac=v; const s=state(SIM.t); tr(`Input current per unit ${s.iin.map(x=>x.toFixed(2)).join(' / ')} A rms (PF ${PF} ${inf('')})`); }); },
  slot(k){ act(`${D.slots[k]?'Remove':'Insert'} DA in slot ${k+1}`, tr=>{ D.slots[k]=!D.slots[k]; tr(`P${k+1} EDAC307 card edge + J${k+1} CON20SS termination (rear cut-out at x ${R_SLOT(5-k).toFixed(3)})`); tr(`Ancillary load now ±${(loads().das*DA[0]).toFixed(2)} A ${inf('DA current')}`); }); },
  cons(c){ act(`Console ${c}`, tr=>{ D.console=c; const L=loads(); tr(`Console + DAs: +${L.p.toFixed(2)} A / −${L.n.toFixed(2)} A at ${VB} V ${inf('module currents')}`); }); },
  brackets(n){ act(`${n} outer brackets fitted`, tr=>{ D.brackets=n; tr(n>=3?'MF250M9 × 3: QTY 3 per frame, each with three 4-40 tapped holes':'Frame is short of brackets: the drawing calls for 3'); }); },
  pull(k){ act(`Hot-pull unit ${k+1} at 0.50 s`, tr=>{ D.pullAt=0.5; D.pullBay=k; tr(`At 0.500 s PSU${k+1} leaves its socket; the other unit's diodes keep the bus up`); if(!powered(1-k,0.6)) tr('No second unit powered: console drops out'); }); },
};

/* ---------------- views of the frame ---------------- */
function frontSVG(t){ const S=48, W=RW, H=RH; const s0=state(t);
  let s=`<svg viewBox="0 0 ${(W+0.2)*S} ${(H+0.2)*S}" style="width:100%;background:#2b2d30;border-radius:6px"><rect x="${0.1*S}" y="${0.1*S}" width="${W*S}" height="${H*S}" fill="#1b1c1e" stroke="#000"/>`;
  D.slots.forEach((on,k)=>{ const x=(0.1+F_SLOT(k)-0.35)*S; s+=`<g data-act="slot" data-k="${k}" style="cursor:pointer"><rect x="${x}" y="${0.25*S}" width="${0.7*S}" height="${(H-0.3)*S}" fill="${on?'#3a3f45':'#151617'}" stroke="#555"/>${on?`<circle cx="${x+0.35*S}" cy="${0.6*S}" r="${0.07*S}" fill="${s0.bus>15?'#3cff5a':'#163a1a'}"/><text x="${x+0.35*S}" y="${(H-0.2)*S}" text-anchor="middle" font-size="${0.16*S}" fill="#ccc">DA</text>`:''}<text x="${x+0.35*S}" y="${0.45*S}" text-anchor="middle" font-size="${0.14*S}" fill="#888">P${k+1}</text><title>Ancillary slot ${k+1} (MF251 P${k+1}/J${k+1}) — click to ${on?'remove':'insert'} a DA</title></g>`; });
  [0,1].forEach(k=>{ const x=(0.1+F_BAY[k])*S, b=D.bay[k];
    s+=`<g data-act="bay" data-k="${k}" style="cursor:pointer">`;
    if (b==='unit'){ s+=`<rect x="${x}" y="${0.6*S}" width="${4.98*S}" height="${2.2*S}" fill="#202123" stroke="#000"/><text x="${x+0.25*S}" y="${1.0*S}" font-size="${0.17*S}" fill="#ddd">M8246 POWER SUPPLY</text><circle cx="${x+1.85*S}" cy="${(0.6+2.2-0.41)*S}" r="${0.125*S}" fill="${powered(k,t)?'#3cff5a':'#163a1a'}"/>`; }
    else if (b==='blank') s+=`<rect x="${x}" y="${0.35*S}" width="${4.98*S}" height="${2.75*S}" fill="#222326" stroke="#000"/><text x="${x+2.49*S}" y="${1.8*S}" text-anchor="middle" font-size="${0.15*S}" fill="#777">MF250M10 blank</text>`;
    else s+=`<rect x="${x}" y="${0.35*S}" width="${4.98*S}" height="${2.75*S}" fill="#0b0b0c" stroke="#666" stroke-dasharray="6 4"/><text x="${x+2.49*S}" y="${1.8*S}" text-anchor="middle" font-size="${0.15*S}" fill="#777">empty bay ${k+1}</text>`;
    s+=`<title>PSU${k+1} bay — click to cycle M8246 / empty / blank</title></g>`; });
  return s+`</svg><div class="small muted">Front: slot and bay positions from MF251.PCB component placement (1.000 in DA pitch, PSU sockets 5.11 in apart); faceplate sizes from M8246M3 and MF250M10. Frame outline taken equal to the rear housing ${inf('')}.</div>`; }
function rearSVG(t){ const S=48; const s0=state(t);
  let s=`<svg viewBox="0 0 ${RW*S} ${RH*S}" style="width:100%;background:#d9d7d0;border-radius:6px"><rect width="${RW*S}" height="${RH*S}" fill="#2a2b2d"/><rect width="${RW*S}" height="${RH*S}" fill="#fff" opacity=".82"/><image href="${ASSET}mf250-frame-for-r2k-psu-rear.svg" x="0" y="0" width="${RW*S}" height="${RH*S}"/>`;
  R_AC.forEach(([x,y],k)=>{ s+=`<g data-act="ac" data-k="${k}" style="cursor:pointer"><rect x="${(x-0.54)*S}" y="${(y-0.54)*S}" width="${1.08*S}" height="${1.08*S}" fill="${D.ac[k]?'var(--accent)':'#000'}" fill-opacity="${D.ac[k]?0.35:0.12}" stroke="${D.ac[k]?'var(--accent)':'#555'}" stroke-width="2"/><text x="${x*S}" y="${(y+0.75)*S}" text-anchor="middle" font-size="${0.18*S}" fill="#222">AC${k+1}</text><title>AC${k+1} inlet — click to plug/unplug</title></g>`; });
  R_FUSE.forEach(([x,y],k)=>{ s+=`<g data-act="fuse" data-k="${k}" style="cursor:pointer"><circle cx="${x*S}" cy="${y*S}" r="${0.2*S}" fill="${D.blown[k]?'var(--bad)':'var(--accent2)'}" fill-opacity=".45" stroke="#222"/><text x="${x*S}" y="${(y-0.3)*S}" text-anchor="middle" font-size="${0.15*S}" fill="#222">F${k+1} ${D.fuse[k]} A${D.blown[k]?' OPEN':''}</text><title>Fuse holder — click to ${D.blown[k]?'replace':'change rating'}</title></g>`; });
  const [px,py,pw,ph]=R_PWR; s+=`<rect x="${(px-pw/2)*S}" y="${(py-ph/2)*S}" width="${pw*S}" height="${ph*S}" fill="${s0.bus>15?'var(--accent)':'transparent'}" fill-opacity=".25"><title>1.530 × .985 cut-out: console DC cable to R250SA1 POWER ENTRY ${'(inferred)'}</title></rect>`;
  for (let k=0;k<6;k++){ const fk=5-k, on=D.slots[fk]; s+=`<rect x="${(R_SLOT(k)-0.37)*S}" y="${0.36*S}" width="${0.745*S}" height="${2.7*S}" fill="${on?'var(--accent2)':'transparent'}" fill-opacity=".25"><title>Termination cut-out for slot ${fk+1}${on?' (fitted)':''}</title></rect>`; }
  return s+`</svg><div class="small muted">Rear housing face converted from MF250M5 ISS 2 (true inches). Click AC1/AC2 and the fuse holders.</div>`; }
function bracketSVG(){ const S=110, b=BRKT; return `<svg viewBox="0 0 ${5.4*S} ${1.2*S}" style="width:100%;max-width:600px">${[0,1,2].map(i=>{ const x=0.2*S+i*1.0*S, y=0.1*S; const on=i<D.brackets;
   return `<g opacity="${on?1:0.25}"><path d="M${x} ${y} h${b.w*S} v${(b.h-b.r)*S} a${b.r*S} ${b.r*S} 0 0 1 ${-b.w*S} 0 z" fill="var(--panel2)" stroke="var(--ink)"/>${b.holes.map(h=>`<circle cx="${x+b.w/2*S}" cy="${y+(b.h-h)*S}" r="${0.0445*S}" fill="none" stroke="var(--accent2)"/>`).join('')}<rect x="${x+0.086*S}" y="${y}" width="${0.152*S}" height="${0.196*S}" fill="none" stroke="var(--ink2)"/></g>`; }).join('')}
   <text x="${0.2*S}" y="${1.15*S}" font-size="11" fill="var(--ink2)">MF250M9 outer bracket ×3 (0.324 × 0.866, three 4-40 taps) — ${D.brackets} fitted</text></svg>`; }
function bindPanel(root){ root.querySelectorAll('[data-act]').forEach(g=>{ const k=+g.dataset.k; const a=g.dataset.act; g.onclick=()=>A[a](k); }); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
  <label>Mains <select id="mv">${[100,120,230,240].map(v=>`<option ${v===D.vac?'selected':''}>${v}</option>`).join('')}</select> V</label>
  <label>Console <select id="cs">${Object.keys(CONS).map(k=>`<option ${k===D.console?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>Outer brackets <select id="br">${[0,1,2,3].map(n=>`<option ${n===D.brackets?'selected':''}>${n}</option>`).join('')}</select></label>
  <button id="p1">Hot-pull unit 1 @0.5 s</button><button id="p2">Hot-pull unit 2 @0.5 s</button><button id="np">No pull</button><button id="rs">Factory state</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#mv')) return;
  q('#mv').onchange=e=>A.vac(+e.target.value); q('#cs').onchange=e=>A.cons(e.target.value); q('#br').onchange=e=>A.brackets(+e.target.value);
  q('#p1').onclick=()=>A.pull(0); q('#p2').onclick=()=>A.pull(1); q('#np').onclick=()=>{ D.pullAt=null; SIM.refresh(); };
  q('#rs').onclick=()=>{ reset(); D.log.length=0; SIM.refresh(); }; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a bay, a DA slot, an AC inlet or a fuse.</div>'; }

/* ---------------- lanes ---------------- */
function lanes(){ const css=SIM.css, hz=D.vac>200?50:60;
  const plot=(c,X,t0,t1,y,h,fn,lo,hi,col)=>{ c.strokeStyle=col; c.beginPath(); for(let i=0;i<=600;i++){ const tt=t0+(t1-t0)*i/600, v=fn(tt), yy=y+h-3-(v-lo)/(hi-lo)*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); };
  const peaky=(tt,k)=>{ const s=state(tt); if(!s.iin[k]) return 0; const ph=Math.sin(2*Math.PI*hz*tt); return Math.sign(ph)*Math.pow(Math.abs(ph),12)*s.iin[k]*2.8; };  // capacitor-input current pulses (inferred shape)
  return [
    {label:`AC1 input current (F1 ${D.fuse[0]} A)`, h:36, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>peaky(tt,0),-6,6,css('--accent2')); }},
    {label:`AC2 input current (F2 ${D.fuse[1]} A)`, h:36, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>peaky(tt,1),-6,6,css('--warn')); }},
    {label:'PSU1 output (W)', h:30, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>state(tt).share[0],0,160,css('--accent')); }},
    {label:'PSU2 output (W)', h:30, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>state(tt).share[1],0,160,css('--warn')); }},
    {label:'±21 V bus to console (MF251)', h:34, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>state(tt).bus - (D.pullAt!=null&&tt>=D.pullAt&&tt<D.pullAt+0.01? 0.4*Math.exp(-(tt-D.pullAt)/0.002):0),0,24,css('--accent')); }},
    {label:'Ancillary DA slots P1–P6', h:24, draw(c,X,t0,t1,y,h){ D.slots.forEach((on,k)=>{ c.fillStyle=on? css('--accent2') : css('--grid'); c.fillRect(X(t0),y+3+k*3,X(t1)-X(t0),2); }); }},
    {label:'Frame heat (W) — steady', h:22, draw(c,X,t0,t1,y,h){ const s=state((t0+t1)/2); c.fillStyle=s.rise>25?css('--bad'):css('--warn'); c.fillRect(X(t0),y+5,(X(t1)-X(t0))*Math.min(1,s.loss/60),h-10); c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText(`${s.loss.toFixed(1)} W → +${s.rise.toFixed(0)} °C (inferred)`,X(t0)+4,y+h/2+4); }},
  ]; }

function inspHTML(t){ const s=state(t), L=s.L; return `<table class="kv">
  <tr><th>Bays</th><td class="mono">1: ${D.bay[0]} · 2: ${D.bay[1]} · powered ${s.on.map(k=>'PSU'+(k+1)).join(' + ')||'none'}</td></tr>
  <tr><th>Load ${inf('module currents')}</th><td class="mono">${D.console} + ${L.das} DA: +${L.p.toFixed(2)} / −${L.n.toFixed(2)} A · ${s.pw.toFixed(0)} W</td></tr>
  <tr><th>Bus</th><td class="mono">±${s.bus.toFixed(1)} V${s.lim?' <b style="color:var(--bad)">one unit over its 4 A / 3 A rating</b>':''}</td></tr>
  <tr><th>Mains current</th><td class="mono">AC1 ${s.iin[0].toFixed(2)} A · AC2 ${s.iin[1].toFixed(2)} A rms at ${D.vac} V</td></tr>
  <tr><th>Fuses</th><td class="mono">F1 ${D.fuse[0]} A ${D.blown[0]?'OPEN':'ok'} · F2 ${D.fuse[1]} A ${D.blown[1]?'OPEN':'ok'} (rear: 1.5/0.75 A SB 115/230 V)</td></tr>
  <tr><th>Heat</th><td class="mono">${s.loss.toFixed(1)} W in the frame → ≈ +${s.rise.toFixed(0)} °C ${s.rise>25?'(M8245A full spec only to 50 °C ambient)':''}</td></tr>
  <tr><th>Brackets</th><td class="mono">${D.brackets} of 3 MF250M9</td></tr></table>`; }
function viewSim(m){ window[KEY]=false;
  m.innerHTML=card('Front — ancillary DA slots and two PSU bays (click)', `<div id="fp"></div>${controlsHTML()}`)
   + card('Rear housing (MF250M5 ISS 2, to scale) — click AC inlets and fuses', `<div id="rp"></div>`)
   + `<div class="grid2"><div>${card('State at the playhead', `<div id="insp"></div>`)}${card('Outer brackets (MF250M9, to scale)', `<div id="bk"></div>`)}</div>
     <div>${card('What changed (last action)', `<div id="trace" class="log"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div></div>`
   + card('Timeline — one second (click to seek)', `<canvas id="tl"></canvas>`);
  bindControls(m);
  SIM.on('time', ()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp')); m.querySelector('#bk').innerHTML=bracketSVG();
    m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); });
}
const LESSONS=[
  { title:'1 · Fit the outer brackets', body:`<p>MF250M9 says “QTY.: 3 REQ. PER FRAME”. Set Outer brackets to <b>3</b>. Each is a small zinc-plated (or flat-black) 18 ga tab with three 4-40 tapped holes ${inf('where they fix')}.</p>`, check:()=>D.brackets===3, hint:'Outer brackets → 3.' },
  { title:'2 · One supply and one blank', body:`<p>Bay 1 takes an M8246; bay 2 gets the MF250M10 “BLANK P.S.U FRONT PANEL” until a second unit is bought. Set bay 1 = M8246, bay 2 = blank.</p>`, check:()=>D.bay[0]==='unit'&&D.bay[1]==='blank', hint:'Click a bay to cycle M8246 → empty → blank.' },
  { title:'3 · Fuse for your mains', body:`<p>The rear silk reads “1.5/0.75 A SB 115/230V”. On 120 V mains F1 must be <b>1.5 A</b>.</p>`, check:()=>D.vac<200&&D.fuse[0]===1.5&&!D.blown[0], hint:'Mains 120 V; click F1 until it reads 1.5 A.' },
  { title:'4 · Power up', body:`<p>Plug in <b>AC1</b>. The bus comes up at about ±21 V and the M8246 front LED lights.</p>`, check:()=>state(0.1).bus>15, hint:'Click the AC1 inlet on the rear housing.' },
  { title:'5 · Add distribution amps', body:`<p>Insert DAs into all six ancillary slots. Each one also needs its termination in the matching rear cut-out (DETAIL D, 1.000″ pitch).</p>`, check:()=>D.slots.every(x=>x), hint:'Click each empty slot on the front.' },
  { title:'6 · Add redundancy', body:`<p>Replace the blank in bay 2 with a second M8246 and plug <b>AC2</b> into a different mains circuit. The rear caution says to disconnect <b>both</b> AC sources before servicing.</p>`, check:()=>D.bay[1]==='unit'&&D.ac[1], hint:'Cycle bay 2 to M8246, click AC2.' },
  { title:'7 · Lose a supply live', body:`<p>Press <b>Hot-pull unit 1 @0.5 s</b> and scrub across 500 ms. The bus barely moves: unit 2 takes the whole console.</p>`, check:()=>D.pullAt!=null&&D.bay[1]==='unit'&&D.ac[1]&&SIM.t>0.5, hint:'Hot-pull unit 1, then move the playhead past 0.5 s.' },
  { title:'8 · The wrong fuse', body:`<p>Set mains to 120 V and change F2 to <b>0.75 A</b> (the 230 V value), then pull unit 1 so unit 2 carries everything. Watch F2 open.</p>`, check:()=>D.blown[1], hint:'F2 → 0.75 A with only unit 2 powered (unplug AC1 if needed).' },
  { title:'Done', body:`<p>That is the whole frame. The M8246 plugin covers the supplies and console wiring; the M8245 plugin shows the switch-mode card inside each unit.</p>`, check:()=>true, auto:true },
];
let li=0;
function viewTut(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — assembling and commissioning the frame (from the drawings)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('Front / rear', `<div id="fp"></div><div id="rp" style="margin-top:6px"></div>${controlsHTML()}`)}${card('State', `<div id="insp"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(SIM.t); bindPanel(m.querySelector('#fp')); m.querySelector('#rp').innerHTML=rearSVG(SIM.t); bindPanel(m.querySelector('#rp')); m.querySelector('#insp').innerHTML=inspHTML(SIM.t);
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{li=+x.dataset.i;draw();});
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="st">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#st').onclick=()=>{ reset(); D.brackets=0; D.bay=['empty','empty']; D.ac=[false,false]; D.log.length=0; li=0; SIM.refresh(); }; };
  SIM.on('time', draw); }
function viewSecond(m){ window[KEY]=false;
  m.innerHTML=card('One second in slow motion — mains in, ±21 V out', `<canvas id="tl"></canvas>`)
   + card('What happens in a second', `<table class="kv small"><tr><th>Mains</th><td>${D.vac>200?50:60} Hz; each M8245-type supply charges its bulk capacitors only near the crest, so the inlet current comes in short pulses ${inf('capacitor-input shape')}.</td></tr>
     <tr><th>Bus</th><td>DC; a hot-pull dips it for ~2 ms while the remaining unit's diodes take over ${inf('')}.</td></tr>
     <tr><th>Heat</th><td>Thermal time constants are minutes, so the frame temperature is constant over the second: shown as a steady value.</td></tr></table>`);
  SIM.on('time', ()=>SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210})); }
const BLOCKS={
  ac:{x:10,y:40,w:130,h:80,t:'AC1 / AC2',s:['PAN356 inlets','F1/F2 1.5/0.75 A SB'],d:'Two inlets and two fuses on the rear housing (MF250M5 cut-outs at 1.163 / 3.163; fuse holders between them). MF251.DSN: FUSE ×2, CON3.'},
  psu:{x:180,y:30,w:150,h:100,t:'PSU1 / PSU2 bays',s:['M8246 or MF250M10 blank','sockets 9960 / 15070 mils','5.11 in apart'],d:'Two bays for M8246 supplies. Their cards mate the MF251 board (H15 pattern; EDAC24 on the 1998 MF250 board).'},
  bp:{x:370,y:30,w:150,h:100,t:'MF251 board',s:['16.11 × 3.035 in','+21 · GND · −21 · CHASSIS'],d:'Tango board MF251 ISSUE.1 (1999-03-15). Bus labels +21 +21 GND ×4 −21 −21 CHASSIS; AC1/AC2 L N CH.'},
  da:{x:560,y:10,w:150,h:70,t:'Ancillary slots',s:['P1–P6 EDAC307','J1–J6 CON20SS'],d:'Six 8200-series DA card positions at 1.000 in pitch; terminations come out through the rear DETAIL D cut-outs.'},
  out:{x:560,y:110,w:150,h:70,t:'Console DC',s:['1.530 × .985 cut-out','→ R250SA1'],d:'Console power cable to the R250SA1 power entry (+V, −V, +VD, grounds) (cut-out purpose inferred).'},
  mech:{x:740,y:40,w:110,h:110,t:'Metalwork',s:['M1–M4 bars B9901','M5 rear · M6–M8','M9 ×3 · M48'],d:'Extruded support bars (B9901, clear alodine), CRS rear housing, inner plate/cover/bracket, three outer brackets and the rack-mount power-entry cover.'},
};
const WIRES=[['ac','psu'],['psu','bp'],['bp','da'],['bp','out'],['mech','psu']];
let bsel='bp';
function viewBlock(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 860 200" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.2}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }
const T=(x,y,s,c,a,fs)=>`<text x="${x}" y="${y}" font-size="${fs||10.5}" fill="${c||'var(--ink)'}" ${a?'text-anchor="'+a+'"':''}>${s}</text>`;
const SHEETS=[
  {name:'1 · MF251 placement (to scale)', note:'Redrawn from the COMP records in #CONSOLES/MF250/MF251.PCB (mils). Each P is an EDAC307 card-edge socket, each J a CON20SS termination header.', svg:()=>{ const S=0.048, X=v=>20+(v-995)*S, Y=v=>40+(4030-v)*S*1.6; let s=`<rect x="${X(995)}" y="${Y(4030)}" width="${(17105-995)*S}" height="${(4030-995)*S*1.6}" fill="none" stroke="var(--ink)"/>`;
    [[1300,'P1'],[2300,'P2'],[3300,'P3'],[4300,'P4'],[5300,'P5'],[6300,'P6']].forEach(([x,n])=>{ s+=`<rect x="${X(x)-6}" y="${Y(3855)}" width="12" height="${(3855-1170)*S*1.6}" fill="var(--panel2)" stroke="var(--ink)"/>${T(X(x),Y(3950),n,'var(--accent2)','middle')}<rect x="${X(x+600)-3}" y="${Y(3529)}" width="6" height="${(3529-1521)*S*1.6}" fill="var(--ink2)"/>${T(X(x+600),Y(1300),'J'+n.slice(1),'var(--ink2)','middle',9)}`; });
    s+=`<rect x="${X(9960)-40}" y="${Y(2000)}" width="80" height="30" fill="var(--panel2)" stroke="var(--ink)"/>${T(X(9960),Y(2000)+20,'PSU1','var(--ink)','middle')}<rect x="${X(15070)-40}" y="${Y(2000)}" width="80" height="30" fill="var(--panel2)" stroke="var(--ink)"/>${T(X(15070),Y(2000)+20,'PSU2','var(--ink)','middle')}`;
    s+=`<rect x="${X(14900)-18}" y="${Y(2700)}" width="36" height="22" fill="none" stroke="var(--ink)"/>${T(X(14900),Y(2900),'AC1','var(--accent2)','middle')}<rect x="${X(16175)-18}" y="${Y(2700)}" width="36" height="22" fill="none" stroke="var(--ink)"/>${T(X(16175),Y(2900),'AC2','var(--accent2)','middle')}`;
    s+=T(X(8550),Y(1500),'+21 +21 GND GND GND GND −21 −21 CHASSIS','var(--accent2)')+T(X(12050),Y(1100),'WARD-BECK SYSTEMS · MF251,ISSUE.1','var(--ink2)'); return s; } },
  {name:'2 · AC wiring', note:'From MF251.DSN / MF251W1.DSN (OrCAD part list: FUSE ×2, CON3, CON1; nets AC1, AC2, LINE, NEUTRAL, WHITE) and the rear silk. The per-supply pairing of inlet and fuse is inferred.', svg:()=>
    [0,1].map(k=>{ const y=70+k*110; return `<rect x="40" y="${y-25}" width="90" height="60" fill="var(--panel2)" stroke="var(--ink)"/>${T(85,y,'AC'+(k+1),'var(--ink)','middle',12)}${T(85,y+18,'L · N · CH','var(--ink2)','middle')}<path d="M130 ${y-10} H220 M130 ${y+10} H420 M130 ${y+25} H160 V${y+40}" fill="none" stroke="var(--ink)"/><path d="M220 ${y-18} h50 a8 8 0 0 1 0 16 h-50 a8 8 0 0 1 0 -16" fill="none" stroke="var(--ink)"/>${T(245,y-24,'F'+(k+1)+' 1.5/0.75 A SB','var(--ink)','middle')}<path d="M278 ${y-10} H420" fill="none" stroke="var(--ink)"/><rect x="420" y="${y-25}" width="150" height="60" fill="var(--panel2)" stroke="var(--ink)"/>${T(495,y+5,'PSU'+(k+1)+' (M8246)','var(--ink)','middle',12)}${T(170,y+52,'CHASSIS','var(--ink2)')}`; }).join('')
    + T(600,90,'“CAUTION: DISCONNECT BOTH AC POWER SOURCES','var(--warn)') + T(600,108,'BEFORE REPLACING FUSES OR SERVICING”','var(--warn)') + T(600,140,'MF251S1.CDR / RK12PWR.CDR: “MF251 CONSOLE POWER”','var(--ink2)') },
  {name:'3 · MF250 (1998) vs MF251 (1999)', note:'Comparison of the two Tango boards in #CONSOLES/MF250. MF250.BAK keeps the MF8210 DA-frame text layers; MF251 replaces the EDAC24 card-edge PSU sockets with H15 connectors.', svg:()=>
    `<rect x="30" y="40" width="380" height="200" fill="none" stroke="var(--ink)"/>${T(220,62,'MF250.BAK (1998-11-12)','var(--ink)','middle',12)}${T(45,90,'P1–P6 EDAC307 + J1–J6 CON20SS (1.26 in pitch)')}${T(45,112,'PS1A, PS2A, PS1, PS2: EDAC24 card-edge sockets')}${T(45,134,'text “MF8210.TOP / .BOT”, AC2, .TYPE/.REFDES')}${T(45,156,'board 15.81 × 3.26 in')}
     <rect x="450" y="40" width="380" height="200" fill="none" stroke="var(--ink)"/>${T(640,62,'MF251.PCB ISSUE.1 (1999-03-15)','var(--ink)','middle',12)}${T(465,90,'P1–P6 EDAC307 + J1–J6 CON20SS (1.000 in pitch)')}${T(465,112,'PSU1, PSU2: H15 pattern')}${T(465,134,'AC1, AC2: PAN356 · +21/−21/GND/CHASSIS')}${T(465,156,'board 16.11 × 3.035 in')}` },
];
let si=0, orig=false;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematics — redrawn (not the original CAD) · drawing sheets alongside', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===si&&!orig?'on':''}" data-i="${k}">${s.name}</button>`).join('')+`<button data-o="1" class="${orig?'on':''}">Original sheets M5 / M10 (DWG → SVG)</button>`;
    m.querySelectorAll('#tb button').forEach(b=>b.onclick=()=>{ if(b.dataset.o) orig=true; else {orig=false; si=+b.dataset.i;} draw(); });
    if (orig){ m.querySelector('#sh').innerHTML=`<div style="background:#fff;border-radius:8px;padding:6px"><img src="${ASSET}mf250-frame-for-r2k-psu-rear.svg" style="width:100%" alt="MF250M5 rear"><img src="${ASSET}mf250-frame-for-r2k-psu-m10-blank.svg" style="width:100%;max-width:700px" alt="MF250M10"></div>`; m.querySelector('#sn').textContent='MF250M5 ISS 2 rear face (cropped, true inches) and the MF250M10 ISS 1 sheet. Note the template ghost text (PS1 · PS2 · 1.5/0.75 A SB · REFERENCE INPUT) in the top-left of M10.'; return; }
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 300" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[si].svg()}<text x="850" y="292" text-anchor="end" font-size="10" fill="var(--ink2)">MF250/MF251 · sheet ${si+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[si].note; };
  draw(); }
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<p class="small muted">No software. This tab shows the power path stage by stage and the slot map, live.</p><div class="grid2">${card('Power path', `<div id="sp"></div>`)}${card('Slot map (MF251.PCB → rear housing)', `<div id="sm"></div>`)}</div>`;
  SIM.on('time', ()=>{ const t=SIM.t, s=state(t);
    const st=[['Mains', D.vac+' V'],['AC1 / AC2 inlets', (D.ac[0]?'on':'off')+' / '+(D.ac[1]?'on':'off')],['F1 / F2', (D.blown[0]?'OPEN':D.fuse[0]+' A')+' / '+(D.blown[1]?'OPEN':D.fuse[1]+' A')],['Supplies (M8246)', s.on.map(k=>'PSU'+(k+1)).join(' + ')||'none'],['Bus to console', '±'+s.bus.toFixed(1)+' V'],['Load', s.pw.toFixed(0)+' W'],['Heat in frame', s.loss.toFixed(1)+' W']];
    let y=10, h=`<svg viewBox="0 0 520 ${st.length*40+20}" style="width:100%">`; st.forEach(x=>{ h+=`<rect x="10" y="${y}" width="500" height="32" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="20" y="${y+21}" font-size="12" fill="var(--ink)">${x[0]}</text><text x="500" y="${y+21}" text-anchor="end" font-size="12.5" font-family="var(--mono)" fill="var(--ink)">${x[1]}</text>`; y+=40; });
    m.querySelector('#sp').innerHTML=h+'</svg>';
    m.querySelector('#sm').innerHTML=`<table class="kv small"><tr><th>Position</th><th>Front (MF251 mils)</th><th>Rear cut-out (in)</th><th>Fitted</th></tr>${[0,1,2,3,4,5].map(k=>`<tr><td>P${k+1}/J${k+1}</td><td class="mono">${1300+k*1000} / ${1900+k*1000}</td><td class="mono">${R_SLOT(5-k).toFixed(3)} ${inf('mirror')}</td><td>${D.slots[k]?'DA':'—'}</td></tr>`).join('')}
      <tr><td>PSU1</td><td class="mono">9960</td><td class="mono">AC1 1.163 / F1 2.163</td><td>${D.bay[0]}</td></tr><tr><td>PSU2</td><td class="mono">15070</td><td class="mono">AC2 3.163 / F2 4.163</td><td>${D.bay[1]}</td></tr></table>`; });
}
function viewNotes(m){ window[KEY]=false;
  m.innerHTML=card('Findings — what the MF250 folder is up to', `<ol>
   <li><b>Artwork ${SIM.year(2026)}: no usable panel art.</b> The frame's silks are CorelDRAW 5 files from March 1999: ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MF250/MF251S1.CDR','MF250/MF251S1.CDR')} (“MF251 CONSOLE POWER”, AC1, AC2, 115/230 VAC, caution) and ${SIM.src('#CONSOLES - #OBSOLETE #Archive/MF250/MF250S.CDR','MF250/MF250S.CDR')}. libcdr keeps only the two earth symbols, four crosshairs and a few lines of MF251S1, and in MF250S a 1.74 × 1.59″ plate with a Ø0.75″ circle that matches neither the 17.090 × 3.425″ MF250M5 rear nor the 4.980 × 2.750″ MF250M10 blank; every text object decodes as garbled double-byte strings. So the rear stays the MF250M5 ISS 2 drawing and the CDR files are cited only. The NAB R2k sheets in the batch list are console overview art.</li>
   <li><b>MF250 is the metalwork; MF251 is the frame you buy.</b> Every drawing is numbered MF250Mx. The board, the silks (“MF251 CONSOLE POWER”) and the 1999 price list (“MF251 Power Supply Mounting Frame (essential in 12/20/28) $400”) all say MF251 ${inf('naming')}.</li>
   <li><b>The PSU board came from a DA frame.</b> MF250.BAK (1998) still has “MF8210.TOP/BOT” text layers, 1.26 in slot pitch and EDAC24 card-edge PSU sockets. The 1999 MF251.PCB moves to 1.000 in pitch and H15 PSU connectors. So the R2K power frame was adapted from the MF8210 distribution-amplifier frame. That fits the manual's “ancillary module slots” for 8200-series DAs.</li>
   <li><b>Template ghosts on every sheet.</b> Each 2012–2013 redraw (M1–M10, even the support bars) carries tiny text near (5.5, 14.5) spelling “PS1 · PS2 · 1.5/0.75 A SB · 115/230 V · REFERENCE INPUT”: the rear-panel silk of an MF8200-family frame, left in the drawing template. The 1999 originals carry a different ghost: “AMS4 REAR PANEL”, “ABB-M1”, “POD10RER”.</li>
   <li><b>A layout file with the wrong part.</b> “MF250M5 ISS.2 LAYOUT.dwg” has a title block reading “MF8212RM1 ISS.2 JAN.13/06”: it is the flat pattern of another product, saved under the MF250 name.</li>
   <li><b>An impossible date.</b> The MF250M5 revision table reads issue 1 “MODIFIED BY B.H NOV. 31st 1999”. November has 30 days. Issue 2 is dated NOV.2/01: “MOVED FH 4-40 STUD TO MAKE THEM SYMMETRICAL”.</li>
   <li><b>Some rear silk is real.</b> On M5 the ghost aligns with real cut-outs: the fuse holders sit next to “PS1”/“PS2” and “1.5/0.75 A SB 115/230V”, matching a two-supply frame, and the caution says “DISCONNECT BOTH AC POWER SOURCES”. Only “REFERENCE INPUT” has no use on a power frame.</li>
   <li><b>The blank is taller than the supply.</b> MF250M10 is 4.980 × 2.750 and the M8246M3 front is 4.980 × 2.200 (+ .580 flange). Same width, different height.</li>
   <li><b>The bracket drawing was moved.</b> MF250M9 ISS 1 (outer bracket) is the only sheet at the folder top, with both DWG and PDF. Every other sheet sits under “Not in ERP/”, so M9 is probably the one part that was still being ordered.</li></ol>`)
   + card('Assumptions in this model', `<ul class="small"><li>Console and DA currents ${inf('module content')}; PF 0.62 and 80 % efficiency for the inlet current ${inf('capacitor input; M8245A spec')}.</li><li>Fuse opens above 2.1 × its rating within the second ${inf('slow-blow curve')}.</li><li>AC1 → PSU1, AC2 → PSU2; front bay edges from socket positions ${inf('')}.</li><li>Natural-convection 1.4 W/°C and 3 W per DA ${inf('')}.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>#CONSOLES - #OBSOLETE #Archive/XXX - MF250 - FRAME FOR R2K PSU #Mechanical #Obsolete/MF250M9 ISS 1 (OUTER BRKT).pdf/.dwg · Not in ERP/MF250M1–M10, M48 + LAYOUTs</li><li>…/#CONSOLES - #OBSOLETE #Archive/MF250/MF251.PCB, MF250.BAK, MF251.DSN, MF251W1.DSN, MF251S1.CDR · RADIO/REN2K/R2KUSPG2.HTM, RK12PWR.CDR · MODULES/MODSINFO.WPD</li><li>assets: mf250-frame-for-r2k-psu-rear.svg, mf250-frame-for-r2k-psu-m10-blank.svg</li></ul>`);
}
SIM.register({
  footnotes: [
    { text: "MF251S1.CDR (Mar 16 1999) is the rear power silk (“MF251 CONSOLE POWER”, AC1, AC2, 115/230 VAC, caution), but libcdr recovers only its earth symbols and crosshairs; the text exists only in the archive sidecar.", src: "#CONSOLES - #OBSOLETE #Archive/MF250/MF251S1.CDR" },
    { text: "MF250S.CDR (Mar 17 1999) is a 1.74 × 1.59 in plate with a Ø0.75 in circle: the same small plate as M8246M3.CDR, not an MF250 panel.", src: "#CONSOLES - #OBSOLETE #Archive/MF250/MF250S.CDR" },
    { text: "The silks are named MF251 while every metalwork sheet is MF250Mx: the MF251 is the assembled frame with its PCB.", src: "#CONSOLES - #OBSOLETE #Archive/MF250/MF251.PCB" },
    { text: "MF250M5's revision table dates issue 1 “NOV. 31st 1999”, a day that does not exist.", src: "#CONSOLES - #OBSOLETE #Archive/XXX - MF250 - FRAME FOR R2K PSU #Mechanical #Obsolete/Not in ERP/MF250M5 ISS 2 (REAR HOUSING).pdf" }
  ],
  id:'mf250-frame-for-r2k-psu', product:'MF250 - FRAME FOR R2K PSU', name:'MF250 · frame for the R2K console power supplies (1999|32)', year:1999,
  family:'Obsolete products', folder:'#CONSOLES - #OBSOLETE #Archive/XXX - MF250 - FRAME FOR R2K PSU #Mechanical #Obsolete',
  summary:'The rack frame (sold as the MF251) that holds one or two M8246 supplies for the R2K console, plus six ancillary slots for 8200-series DAs. Two AC inlets and fuses on the rear; a blank front for the empty supply bay. The archive copy is the 2012–2013 metalwork redraw set.',
  highlights:['Rear housing converted from MF250M5, to scale','Slots and bays placed from MF251.PCB','Dual AC feed, fuses and hot-pull redundancy','Outer brackets (MF250M9) and blank panel','Template ghosts and a wrong-part layout file'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 mains cycle',period:()=>1/(D.vac>200?50:60)},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[1/30,'2 mains cycles'],[0.01,'10 ms (hot-pull dip)']],
  defaultZoom:0,
  init(){},
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: assembling the frame',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Power path',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
