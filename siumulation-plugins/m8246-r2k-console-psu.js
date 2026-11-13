/* =====================================================================
   M8246 — R2K console power supply (Ward-Beck Systems, 1999|32, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html) — hardware model

   Sources (folder "#CONSOLES - #OBSOLETE #Archive/XXX - M8246 - R2K CONSOLE PSU #Master #OBSOLETE"):
   - M8246.DWG (1999): front outline 4.98 × 2.15 with one round hole
   - M8246 - #Mechanical #Obsolete/ (2012 redraws, ISS 1):
       M8246M3 POWER SUPPLY FRONT  4.980 × 2.200, .050 alum, Polane T F63B12 textured black, .250 hole at (1.850, .410),
                                   .062 rad notches at 1.181, .580 flange, “SILKSCREEN SEE: M8246M3.CDR”  -> assets/m8246-r2k-console-psu-m3-front.svg
       M8246M1 POWER SUPPLY TOP    9.600 × 5.000, .100 alum, 4 × .125 chamfers, 7 × .130 (B) + 2 × 4-40 (A) -> assets/…-m1-top.svg
       M8246M2 POWER SUPPLY BOTTOM 10.750 × 5.000, .080 alum, 7 × KFE-116-8 inserts                         -> assets/…-m2-bottom.svg
   Elsewhere (#CONSOLES - #OBSOLETE #Archive):
   - M8246/ (1999 originals, M8246M3.CDR / M82463M.CDR silks: “M8246 POWER SUPPLY”, “115/230 VAC”, “AC”, “DC”, caution text)
   - M8246/CHASSIS/MECHLIST.WPD and RADIO/REN2K/MECHLIST.wpd: “M8246 CONSOLE POWER SUPPLY  M8246M1 TOP, M2 BOTTOM, M3 FRONT”
   - RADIO/REN2K/R2KUSPG2.HTM, R2KTYPUS.HTM (1999 price lists): “M8246 Power Supply (1 essential in 12/20/28, 2 for redundancy)”
   - MF250/MF251.PCB (power-supply mounting frame: PSU1/PSU2, +21 / −21 / GND labels), MF250.BAK (EDAC24 PSU sockets)
   - MODULES/R250/R250W1.pdf (R2K DC WIRING, Oct 13 1999) and R250SA1.pdf (POWER ENTRY, Mar 1 1999)
   - XXX - M8245/…Schematic (the ±22 V card the M8246 is inferred to carry)
   Anything not in those files is marked "inferred".
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__m8246Active';

/* ---------------- console configurations (R2KTYPUS.HTM, March 1999) ---------------- */
const CONF = {
  'R2K/8':  {R201:6, R202:1,R203:1,R204:0,R205:0,R206:1,R209:0, blank:3, psu:false, note:'rack-mount 8, no MF251 listed'},
  'R2K/12': {R201:12,R202:1,R203:1,R204:1,R205:0,R206:1,R209:0, blank:0, psu:true},
  'R2K/20': {R201:16,R202:1,R203:1,R204:1,R205:1,R206:1,R209:1, blank:2, psu:true},
  'R2K/28': {R201:20,R202:1,R203:1,R204:1,R205:1,R206:1,R209:1, blank:6, psu:true},
};
/* per-module rail currents in amps [+V analog, −V, logic (also from +V)] — none are in the archive: all inferred from module content */
const LOAD = { R201:[0.045,0.040,0.020], R202:[0.120,0.110,0.010], R203:[0.060,0.055,0.030], R204:[0.060,0.055,0.030], R205:[0.040,0.035,0.025],
  R206:[0.150,0.120,0.060], R209:[0.050,0.045,0.010], meters:[0.080,0,0], clock:[0,0,0.250], DA:[0.090,0.085,0] };
const RVD = 10;                 // R250SA1: “3.75W 10R1” from +V to +VD, “1000\35” reservoir
const VNOM = 22, RO = 0.06;     // M8245 set point (schematic “+22V”); output + 1N5404 slope resistance (inferred)
const LIM = [4.0, 3.0];         // M8245A spec sheet: +21 V @ 4 A, −21 V @ 3 A per unit

/* ---------------- state ---------------- */
const D = { conf:'R2K/20', das:2, chOn:8, unit:[{fit:true,trim:0.0,fail:false},{fit:false,trim:-0.05,fail:false}], failAt:null, failUnit:0, vac:120, log:[] };
function reset(){ Object.assign(D,{conf:'R2K/20',das:2,chOn:8,unit:[{fit:true,trim:0,fail:false},{fit:false,trim:-0.05,fail:false}],failAt:null,failUnit:0,vac:120}); }

function load(){ const c=CONF[D.conf]; let p=0,n=0,d=0;
  for (const k of ['R201','R202','R203','R204','R205','R206','R209']){ p+=c[k]*(LOAD[k][0]+LOAD[k][2]); n+=c[k]*LOAD[k][1]; }   // module logic regulates from +V on each card (inferred)
  const on=Math.min(D.chOn,c.R201); p+=on*0.014;            // CHANNEL ON LEDs / relays (inferred)
  const met = D.conf==='R2K/28'? 4 : 2;  p+=met*LOAD.meters[0]/2;        // R250SA3 meter assemblies (R250W1 page 3)
  d+=LOAD.clock[2]; p+=D.das*LOAD.DA[0]; n+=D.das*LOAD.DA[1];
  return {p:p+d, n, d, vdOnly:d, das:D.das}; }   // +VD is drawn from +V through the 10 Ω resistor
/* units alive at time t */
const alive=(k,t)=> D.unit[k].fit && !D.unit[k].fail && !(D.failAt!=null && k===D.failUnit && t>=D.failAt);
/* diode-OR share: solve bus voltage for one rail */
function share(I, t, rail){
  const us=[0,1].filter(k=>alive(k,t)); if(!us.length) return {v:0, i:[0,0], lim:false};
  const V=k=>VNOM+D.unit[k].trim-0.8;                         // after CR18/CR19 drop
  let set=us.slice(), v=0;
  for (let it=0; it<3; it++){ const g=set.length/RO; v=(set.reduce((a,k)=>a+V(k)/RO,0)-I)/g; set=set.filter(k=>V(k)>v); if(!set.length){ set=[us[0]]; } }
  const i=[0,0]; set.forEach(k=>i[k]=Math.max(0,(V(k)-v)/RO));
  const tot=i[0]+i[1]; if (tot>0) { i[0]*=I/tot; i[1]*=I/tot; }
  let lim=false; [0,1].forEach(k=>{ if(i[k]>LIM[rail]*1.05) lim=true; });
  if (lim && set.length===1){ v = v*LIM[rail]/I; }               // rectangular limit (M8245A spec)
  return {v, i, lim};
}
/* transient after a unit drops out: the bus is held by the other unit through its diode, small dip (inferred 2 ms) */
function railsAt(t){ const L=load();
  const p=share(L.p,t,0), n=share(L.n,t,1);
  let dip=0; if (D.failAt!=null && t>=D.failAt && t<D.failAt+0.02 && D.unit[D.failUnit].fit && !D.unit[D.failUnit].fail){ const other=alive(1-D.failUnit,t); dip = other? 0.35*Math.exp(-(t-D.failAt)/0.002) : 0; }
  const vp=Math.max(0,p.v-dip), vn=Math.max(0,n.v-dip);
  const vd = vp>1? Math.max(0, vp - L.vdOnly*RVD) : 0;
  return {vp, vn, vd, ip:p.i, in_:n.i, lim:p.lim||n.lim, L};
}
const ledOn=(k,t)=> alive(k,t);

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  fit(k){ act(`${D.unit[k].fit?'Remove':'Fit'} M8246 in PSU${k+1}`, tr=>{ D.unit[k].fit=!D.unit[k].fit; D.unit[k].fail=false;
    tr(D.unit[k].fit? `Unit slides into the MF251 frame; its card edge mates PSU${k+1} (H15 pattern on MF251.PCB; EDAC24 on the earlier MF250 board) ${inf('card inside')}` : `PSU${k+1} bay now needs the MF250M10 blank front panel (4.980 × 2.750)`);
    const r=railsAt(SIM.t); tr(`Bus now +${r.vp.toFixed(2)} V / −${r.vn.toFixed(2)} V; shares +V ${r.ip.map(x=>x.toFixed(2)).join(' / ')} A`); }); },
  fail(k){ act(`Unit ${k+1} fails at ${D.failAt.toFixed(2)} s`, tr=>{ D.failUnit=k; tr(`At ${D.failAt.toFixed(3)} s unit ${k+1} stops; its CR18/CR19 diodes reverse-bias, so the other unit carries the whole console`); if(!alive(1-k,D.failAt+0.1)) tr('No second unit is fitted: the console goes dark'); }); },
  repair(){ act('Repair/replace the failed unit', tr=>{ D.failAt=null; D.unit.forEach(u=>u.fail=false); tr('Both fitted units are healthy for the whole second'); }); },
  conf(c){ act(`Console: ${c}`, tr=>{ D.conf=c; const L=load(), C=CONF[c]; tr(`${C.R201} × R201 + R202, R203${C.R204?', R204':''}${C.R205?', R205':''}, R206${C.R209?', R209':''}, ${C.blank} R2KBP blanks (R2KTYPUS.HTM)`); tr(`Estimated load +V ${L.p.toFixed(2)} A (incl. +VD ${L.vdOnly.toFixed(2)} A), −V ${L.n.toFixed(2)} A ${inf('module currents')}`); if(!C.psu) tr('The R2K/8 list has no MF251/M8246: it uses its own rack-mount supply '+inf('price list')); }); },
  das(n){ act(`${n} × 8200-series DA in the MF251 ancillary slots`, tr=>{ D.das=n; tr(`R2K manual: “WBS 8200 series distribution amplifiers may be mounted in the ancillary module slots of the MF251 power supply frame” — P1…P${Math.max(1,n)} EDAC307 + J CON20SS`); tr(`Adds ±${(n*LOAD.DA[0]).toFixed(2)} A ${inf('DA current')}`); }); },
  trim(k,v){ act(`Trim unit ${k+1} V-OUT ${v>=0?'+':''}${v.toFixed(2)} V`, tr=>{ D.unit[k].trim=v; const r=railsAt(SIM.t); tr(`R54 V-OUT on the M8245 card; the higher unit takes most of the current through its 1N5404: ${r.ip.map(x=>x.toFixed(2)).join(' / ')} A`); }); },
  chOn(n){ act(`${n} channels ON`, tr=>{ D.chOn=n; tr(`R201 CHANNEL ON lamps/relays: +${(n*0.014).toFixed(2)} A ${inf('')}`); }); },
  failTime(v){ D.failAt=v; SIM.refresh(); },
};

/* ---------------- front panels (M8246M3, to scale) in the MF251 bays ---------------- */
const BAYX=[0, 5.11];                           // MF251.PCB: PSU1 at x 9960, PSU2 at x 15070 mils → 5.11 in apart
function frontSVG(t){
  const S=70, W=10.2, H=2.9; let s=`<svg viewBox="0 0 ${W*S} ${H*S}" style="width:100%;max-width:820px;background:#3a3d40;border-radius:6px">`;
  [0,1].forEach(k=>{ const x0=(0.05+BAYX[k])*S, u=D.unit[k];
    if (u.fit){ const y0=0.35*S, w=4.98*S, h=2.2*S;
      s+=`<g data-act="fit" data-k="${k}" style="cursor:pointer"><path d="M${x0} ${y0} h${w} v${(2.2-1.181-0.062)*S} a${0.062*S} ${0.062*S} 0 0 0 0 ${0.124*S} v${(1.181-0.062)*S} h${-w} v${-(1.181-0.062)*S} a${0.062*S} ${0.062*S} 0 0 0 0 ${-0.124*S} z" fill="#1d1e20" stroke="#000"/>
        <text x="${x0+0.3*S}" y="${y0+0.5*S}" font-size="${0.17*S}" fill="#ddd" font-family="Arial">M8246 POWER SUPPLY</text><text x="${x0+0.3*S}" y="${y0+0.8*S}" font-size="${0.12*S}" fill="#aaa" font-family="Arial">WARD-BECK SYSTEMS · PSU${k+1}</text>
        <text x="${x0+0.3*S}" y="${y0+1.6*S}" font-size="${0.1*S}" fill="#888" font-family="Arial">silk text ${'per M8246M3.CDR'}: inferred layout</text><title>M8246 in PSU${k+1} — click to remove</title></g>
        <circle cx="${x0+1.85*S}" cy="${y0+(2.2-0.41)*S}" r="${0.125*S}" fill="${ledOn(k,t)?'#3cff5a':'#163a1a'}" stroke="#000"><title>.250 hole at (1.850, .410) — DS2 GN “DC” seen through it (inferred)</title></circle>
        ${u.fail||(D.failAt!=null&&k===D.failUnit&&t>=D.failAt)?`<text x="${x0+2.5*S}" y="${y0+1.8*S}" font-size="${0.2*S}" fill="#ff6b5e" font-weight="700">FAILED</text>`:''}`; }
    else s+=`<g data-act="fit" data-k="${k}" style="cursor:pointer"><rect x="${x0}" y="${0.08*S}" width="${4.98*S}" height="${2.75*S}" fill="#26282b" stroke="#000"/><text x="${x0+2.49*S}" y="${1.5*S}" text-anchor="middle" font-size="${0.15*S}" fill="#888">MF250M10 blank P.S.U front panel</text><title>Empty bay — click to fit an M8246</title></g>`; });
  return s+`</svg><div class="small muted">To scale from M8246M3 (4.980 × 2.200) and MF250M10 (4.980 × 2.750); bay spacing 5.11 in from MF251.PCB PSU1/PSU2 positions.</div>`; }
/* chassis top/bottom from M8246M1/M2 */
function chassisSVG(){ const S=42; const top=[[1.25,0.6],[1.25,3.61],[4.99,1.69],[4.99,4.6],[9.28,1.79],[9.28,2.51],[9.28,4.6]], bot=[[1.7,0.6],[1.7,3.51],[5.44,1.69],[5.44,4.6],[9.73,1.79],[9.73,2.51],[9.73,4.6]];
  let s=`<svg viewBox="0 0 ${11.4*S} ${12*S}" style="width:100%;max-width:520px">`;
  s+=`<text x="4" y="14" font-size="12" fill="var(--ink2)">M8246M1 TOP 9.600 × 5.000 (.100 alum)</text><path d="M${0.2*S+0.125*S} ${0.4*S} h${(9.6-0.25)*S} l${0.125*S} ${0.125*S} v${(5-0.25)*S} l${-0.125*S} ${0.125*S} h${-(9.6-0.25)*S} l${-0.125*S} ${-0.125*S} v${-(5-0.25)*S} z" fill="var(--panel2)" stroke="var(--ink)"/>`;
  top.forEach(([x,y])=>s+=`<circle cx="${(0.2+x)*S}" cy="${(0.4+y)*S}" r="${0.065*S*2}" fill="none" stroke="var(--accent2)"/>`); [[0.25,0.75],[0.25,4.25]].forEach(([x,y])=>s+=`<circle cx="${(0.2+x)*S}" cy="${(0.4+y)*S}" r="${0.045*S*2}" fill="var(--warn)"/>`);
  s+=`<rect x="${(0.2+1.0)*S}" y="${(0.4+0.9)*S}" width="${8.6*S}" height="${2.55*S}" fill="none" stroke="var(--accent)" stroke-dasharray="6 4"/><text x="${(0.2+1.1)*S}" y="${(0.4+1.2)*S}" font-size="11" fill="var(--accent)">M8245 card 14-149 (outline ${'inferred'})</text>`;
  s+=`<text x="4" y="${6.2*S}" font-size="12" fill="var(--ink2)">M8246M2 BOTTOM 10.750 × 5.000 (.080 alum, 7 × KFE-116-8)</text><rect x="${0.2*S}" y="${6.4*S}" width="${10.75*S}" height="${5*S}" fill="var(--panel2)" stroke="var(--ink)"/>`;
  bot.forEach(([x,y])=>s+=`<circle cx="${(0.2+x)*S}" cy="${(6.4+y)*S}" r="${0.083*S*2}" fill="var(--accent2)"/>`);
  return s+`</svg>`; }
function bindPanel(root){ root.querySelectorAll('[data-act="fit"]').forEach(g=>g.onclick=()=>A.fit(+g.dataset.k)); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
  <label>Console <select id="cf">${Object.keys(CONF).map(k=>`<option ${k===D.conf?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>DAs in MF251 <select id="da">${[0,1,2,3,4,5,6].map(n=>`<option ${n===D.das?'selected':''}>${n}</option>`).join('')}</select></label>
  <label>Channels ON <input id="co" type="range" min="0" max="20" value="${D.chOn}"></label>
  <label>Unit 2 trim <input id="t2" type="range" min="-0.3" max="0.3" step="0.05" value="${D.unit[1].trim}"></label>
  <label>Failure at <input id="fa" type="range" min="0.05" max="0.95" step="0.05" value="${D.failAt??0.5}"></label>
  <button id="f1">Fail unit 1</button><button id="f2">Fail unit 2</button><button id="rp">Repair</button><button id="rs">Factory state</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#cf')) return;
  q('#cf').onchange=e=>A.conf(e.target.value); q('#da').onchange=e=>A.das(+e.target.value); q('#co').onchange=e=>A.chOn(+e.target.value);
  q('#t2').onchange=e=>A.trim(1,+e.target.value); q('#fa').oninput=e=>A.failTime(+e.target.value);
  q('#f1').onclick=()=>{ if(D.failAt==null) D.failAt=0.5; A.fail(0); }; q('#f2').onclick=()=>{ if(D.failAt==null) D.failAt=0.5; A.fail(1); }; q('#rp').onclick=()=>A.repair();
  q('#rs').onclick=()=>{ reset(); D.log.length=0; SIM.refresh(); }; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a bay to fit or remove a unit, or change the console size.</div>'; }

/* ---------------- lanes ---------------- */
function lanes(){ const css=SIM.css;
  const plot=(c,X,t0,t1,y,h,fn,lo,hi,col)=>{ c.strokeStyle=col; c.beginPath(); for(let i=0;i<=500;i++){ const tt=t0+(t1-t0)*i/500, v=fn(tt), yy=y+h-3-(v-lo)/(hi-lo)*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); };
  return [
    {label:`Mains ${D.vac} V 60 Hz (AC1/AC2)`, h:30, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>Math.sin(2*Math.PI*60*tt),-1.1,1.1,css('--accent2')); }},
    {label:'Unit 1: +V current (A)', h:34, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>railsAt(tt).ip[0],0,4.5,css('--accent')); }},
    {label:'Unit 2: +V current (A)', h:34, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>railsAt(tt).ip[1],0,4.5,css('--warn')); }},
    {label:'Bus +V (MF251 “+21”)', h:36, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>railsAt(tt).vp,18,23,css('--accent')); }},
    {label:'Bus −V (MF251 “−21”)', h:36, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>railsAt(tt).vn,18,23,css('--accent2')); }},
    {label:'+VD (10 Ω from +V, R250SA1)', h:30, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>railsAt(tt).vd,14,23,css('--ink')); }},
    {label:'Front LEDs unit 1 / unit 2', h:22, draw(c,X,t0,t1,y,h){ for(let i=0;i<200;i++){ const tt=t0+(t1-t0)*i/200, w=(X(t1)-X(t0))/200+1; c.fillStyle=ledOn(0,tt)?'#2c2':'transparent'; c.fillRect(X(tt),y+3,w,7); c.fillStyle=ledOn(1,tt)?'#2c2':'transparent'; c.fillRect(X(tt),y+12,w,7);} }},
  ]; }

function inspHTML(t){ const r=railsAt(t), L=r.L; return `<table class="kv">
  <tr><th>Console</th><td class="mono">${D.conf} · ${D.das} DA(s) · ${Math.min(D.chOn,CONF[D.conf].R201)} channels ON</td></tr>
  <tr><th>Load ${inf('module currents')}</th><td class="mono">+V ${L.p.toFixed(2)} A (+VD ${L.vdOnly.toFixed(2)} A) · −V ${L.n.toFixed(2)} A · ≈ ${(VNOM*(L.p+L.n)).toFixed(0)} W</td></tr>
  <tr><th>Bus at playhead</th><td class="mono">+${r.vp.toFixed(2)} V / −${r.vn.toFixed(2)} V · +VD ${r.vd.toFixed(2)} V${r.lim?' <b style="color:var(--bad)">LIMIT</b>':''}</td></tr>
  <tr><th>Share +V</th><td class="mono">unit 1 ${r.ip[0].toFixed(2)} A · unit 2 ${r.ip[1].toFixed(2)} A (limit ${LIM[0]} A each)</td></tr>
  <tr><th>Share −V</th><td class="mono">unit 1 ${r.in_[0].toFixed(2)} A · unit 2 ${r.in_[1].toFixed(2)} A (limit ${LIM[1]} A each)</td></tr>
  <tr><th>R250SA1 10 Ω</th><td class="mono">${(L.vdOnly*L.vdOnly*RVD).toFixed(2)} W of 3.75 W</td></tr></table>`; }
function viewSim(m){ window[KEY]=false;
  m.innerHTML=card('Front of the MF251 power frame — two M8246 bays (click a bay)', `<div id="fp"></div>${controlsHTML()}`)
   + `<div class="grid2"><div>${card('State at the playhead', `<div id="insp"></div>`)}${card('Chassis (M8246M1 / M2, to scale)', `<div id="ch"></div>`)}</div>
     <div>${card('What changed (last action)', `<div id="trace" class="log"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div></div>`
   + card('Timeline — one second (click to seek)', `<canvas id="tl"></canvas><p class="small muted">The two units share the bus through their 1N5404 output diodes (CR18/CR19 on the M8245 card). The share model and the 2 ms dip on a failure are ${inf('diode-OR behaviour')}.</p>`);
  bindControls(m); m.querySelector('#ch').innerHTML=chassisSVG();
  SIM.on('time', ()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); });
}
const LESSONS=[
  { title:'1 · Size the console', body:`<p>The 1999 price list fits every R2K/12, /20 and /28 with one MF251 frame and one M8246. Choose <b>R2K/28</b>, the largest.</p>`, check:()=>D.conf==='R2K/28', hint:'Console → R2K/28.' },
  { title:'2 · One unit is essential', body:`<p>Make sure an M8246 sits in <b>PSU1</b>. Its front LED shows through the single .250″ hole in the M8246M3 front panel.</p>`, check:()=>D.unit[0].fit, hint:'Click the left bay if it shows the blank panel.' },
  { title:'3 · Read the rails', body:`<p>The MF251 board labels the bus “+21” and “−21”. The console wiring (R250W1) calls them +V and −V and derives <b>+VD</b> (clock/timer power) through a 10 Ω 3.75 W resistor on the R250SA1 power entry. Check the State table: +VD sits a couple of volts below +V.</p>`, check:()=>railsAt(SIM.t).vd>0, hint:'Fit PSU1 and look at the State table.' },
  { title:'4 · Add ancillary DAs', body:`<p>The manual allows 8200-series DAs in the MF251's ancillary slots. Fit <b>6</b> and watch the share column: one unit must carry it all.</p>`, check:()=>D.das===6, hint:'DAs in MF251 → 6.' },
  { title:'5 · Fit the redundant unit', body:`<p>The price list says “2 for redundancy”. Click the right bay to fit <b>PSU2</b>.</p>`, check:()=>D.unit[0].fit&&D.unit[1].fit, hint:'Click the right bay.' },
  { title:'6 · Balance the pair', body:`<p>With diode-OR sharing, the unit with the higher set point does most of the work. Move <b>Unit 2 trim</b> until the two +V currents are within 0.3 A of each other.</p>`, check:()=>{ const r=railsAt(0.2); return D.unit[1].fit&&Math.abs(r.ip[0]-r.ip[1])<0.3; }, hint:'Unit 2 trim towards 0.00.' },
  { title:'7 · Lose a unit', body:`<p>Press <b>Fail unit 1</b> and scrub past the failure time. The bus dips for a moment and unit 2 picks up everything. The console keeps running.</p>`, check:()=>D.failAt!=null&&D.failUnit===0&&D.unit[1].fit&&SIM.t>D.failAt, hint:'Fail unit 1, then move the playhead past the failure time.' },
  { title:'Done', body:`<p>The M8245 plugin shows what happens inside each unit, and the MF250 plugin shows the frame that holds them.</p>`, check:()=>true, auto:true },
];
let li=0;
function viewTut(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — powering an R2K console (from the price lists and wiring drawings)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('The power frame', `<div id="fp"></div>${controlsHTML()}`)}${card('State', `<div id="insp"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(SIM.t); bindPanel(m.querySelector('#fp')); m.querySelector('#insp').innerHTML=inspHTML(SIM.t);
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{li=+x.dataset.i;draw();});
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="st">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#st').onclick=()=>{ reset(); D.failAt=null; D.log.length=0; li=0; SIM.refresh(); }; };
  SIM.on('time', draw); }
function viewSecond(m){ window[KEY]=false;
  m.innerHTML=card('One second in slow motion — two supplies feeding one console', `<canvas id="tl"></canvas>`)
   + card('What moves in this second', `<table class="kv small"><tr><th>Mains</th><td>60 cycles on AC1/AC2; inside each unit the M8245 PWM runs at 50 kHz (see the M8245 plugin).</td></tr>
     <tr><th>Sharing</th><td>Continuous, set by the two V-OUT trims and the diode slope ${inf('')}.</td></tr>
     <tr><th>Failure</th><td>At the chosen time one unit drops out; its output capacitors and the reverse-biased 1N5404s isolate it within ~2 ms ${inf('')}.</td></tr>
     <tr><th>+VD</th><td>Follows +V minus the 10 Ω drop; the 1000 µF/35 V reservoir smooths clock/timer load steps.</td></tr></table>`);
  SIM.on('time', ()=>SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210})); }
const BLOCKS={
  ac:{x:10,y:30,w:120,h:70,t:'AC1 / AC2',s:['PAN356 inlets on MF251','L · N · CH each'],d:'Two mains inlets on the MF251 board, one per supply bay (inferred pairing), behind the MF250 rear housing cut-outs.'},
  u1:{x:170,y:10,w:150,h:70,t:'M8246 #1 (PSU1)',s:['M8245 card inside','±22 V, 4 A / 3 A'],d:'Essential unit. 4.98 × 2.2 front, 9.6–10.75 in long chassis; carries an M8245-type card (inferred).'},
  u2:{x:170,y:110,w:150,h:70,t:'M8246 #2 (PSU2)',s:['optional, redundancy'],d:'“2 for redundancy” per the 1999 price list. Both feed the bus through their own 1N5404 diodes.'},
  bus:{x:360,y:60,w:140,h:70,t:'MF251 bus',s:['+21 · GND · −21','CHASSIS'],d:'MF251.PCB labels: +21 +21 GND GND GND GND −21 −21 CHASSIS; console side +V −V GROUND.'},
  da:{x:360,y:160,w:140,h:60,t:'Ancillary slots',s:['P1–P6 EDAC307','J1–J6 CON20SS'],d:'Six 8200-series DA positions at 1.000 in pitch on MF251.'},
  sa1:{x:540,y:60,w:140,h:70,t:'R250SA1',s:['POWER ENTRY, 15 pin','+VD via 10 Ω 3.75 W'],d:'Console power entry: +V ANALOG, −V, +V DIGITAL, CHASSIS, analog and digital grounds; 1000/35 reservoir; binding posts.'},
  mb:{x:720,y:20,w:130,h:70,t:'R251 / R252',s:['mother boards'],d:'R250W1 DC wiring: +V −V AGND DGND +VD CHASSIS to each mother board (16/8/12 position).'},
  ck:{x:720,y:120,w:130,h:60,t:'Clock / timer',s:['Torpey clock, R254'],d:'Fed from +VD (“CLOCK TIMER POWER” on R250W1).'},
};
const WIRES=[['ac','u1'],['ac','u2'],['u1','bus'],['u2','bus'],['bus','da'],['bus','sa1'],['sa1','mb'],['sa1','ck']];
let bsel='bus';
function viewBlock(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 860 240" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.2}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }
const T=(x,y,s,c,a,fs)=>`<text x="${x}" y="${y}" font-size="${fs||10.5}" fill="${c||'var(--ink)'}" ${a?'text-anchor="'+a+'"':''}>${s}</text>`, W_=d=>`<path d="${d}" fill="none" stroke="var(--ink)"/>`;
const BX=(x,y,w,h,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/>${T(x+w/2,y+18,t,'var(--ink)','middle',12)}${sub?T(x+w/2,y+34,sub,'var(--ink2)','middle',10):''}`;
const SHEETS=[
  {name:'1 · Unit → MF251 bus', note:'Unit side redrawn from the M8245 schematic outputs (12,N +22V, 11,M COM, 10,L −22V, 1,A/4,D/7,H mains); frame side from MF251.PCB text labels. The pin-to-pin mapping between them is inferred.', svg:()=>
    `${BX(30,40,170,110,'M8246 #1','M8245 card edge')}${BX(30,170,170,110,'M8246 #2','M8245 card edge')}
     ${[0,1].map(k=>{const y=70+k*130; return T(205,y,'12,N +22V (via CR18)','var(--accent2)')+T(205,y+18,'11,M COM','var(--accent2)')+T(205,y+36,'10,L −22V (via CR19)','var(--accent2)')+T(205,y+54,'1,A / 4,D / 7,H AC','var(--accent2)')+W_(`M330 ${y-4} H420 M330 ${y+14} H420 M330 ${y+32} H420`);}).join('')}
     ${BX(420,40,170,240,'MF251 ISSUE 1','PSU1 x9960 · PSU2 x15070')}${T(430,110,'+21 +21')}${T(430,130,'GND ×4')}${T(430,150,'−21 −21')}${T(430,170,'CHASSIS')}${T(430,210,'AC1 / AC2 (PAN356): L N CH')}
     ${W_('M590 120 H660 M590 150 H660')}${T(665,124,'+V −V GROUND → R250SA1','var(--accent2)')}` },
  {name:'2 · R250SA1 power entry', note:'Redrawn from MODULES/R250/R250SA1.pdf (“R2K POWER ENTRY”, March 1 1999). Pin numbering 1–15 is on the drawing; individual pin assignments are not legible in the text layer and are drawn as groups.', svg:()=>
    `${BX(60,50,160,200,'R250SA1','POWER ENTRY 15-pin')}${T(230,80,'+V ANALOG (RED)','var(--accent2)')}${T(230,110,'−V (BLACK)','var(--accent2)')}${T(230,140,'GND / ANALOG GROUND (WHITE)','var(--accent2)')}${T(230,170,'+V DIGITAL (+VD)','var(--accent2)')}${T(230,200,'DIGITAL GROUND','var(--accent2)')}${T(230,230,'CHASSIS (GREEN BINDING POST)','var(--accent2)')}
     ${BX(520,130,170,60,'10R1 3.75 W','+V → +VD')}${BX(520,210,170,50,'1000\\35 RADIAL','reservoir')}${T(520,110,'CLOCK TIMER POWER','var(--ink2)')}` },
  {name:'3 · R250W1 DC wiring', note:'Redrawn from MODULES/R250/R250W1.pdf page 1 (“R2K DC WIRING”, Oct 13 1999). 22 AWG and 16 AWG gauges are on the drawing.', svg:()=>
    `${BX(40,100,150,80,'R250SA1','power entry')}${BX(320,30,170,60,'R251','MOTHER BOARD 16 POS')}${BX(320,110,170,60,'R252-1','MOTHER BOARD 8 POS')}${BX(320,190,170,60,'R252-2','MOTHER BOARD')}${BX(600,40,200,60,'R254 / clock','TIMER DISPLAY · TORPEY')}${BX(600,140,200,60,'R250SA3 ×2–4','METER ASSEMBLIES')}
     ${W_('M190 120 H320 M190 140 H320 M190 160 H320 M250 60 V220 H320 M490 70 H600 M490 170 H600')}${T(200,270,'+V · −V · AGND · DGND · +VD · CHASSIS on every mother board; 16 AWG feeds, 22 AWG branches')}` },
];
let si=0, orig=false;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematics — redrawn (not the original CAD) · 2012 mechanical sheets alongside', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===si&&!orig?'on':''}" data-i="${k}">${s.name}</button>`).join('')+`<button data-o="1" class="${orig?'on':''}">Original sheets M1/M2/M3 (DWG → SVG)</button>`;
    m.querySelectorAll('#tb button').forEach(b=>b.onclick=()=>{ if(b.dataset.o) orig=true; else {orig=false; si=+b.dataset.i;} draw(); });
    if (orig){ m.querySelector('#sh').innerHTML=`<div style="background:#fff;border-radius:8px;padding:6px">${['m3-front','m1-top','m2-bottom'].map(n=>`<img src="${ASSET}m8246-r2k-console-psu-${n}.svg" style="width:100%;max-width:900px;display:block;margin-bottom:8px" alt="${n}">`).join('')}</div>`; m.querySelector('#sn').textContent='M8246M3/M1/M2 ISS 1 (2012 redraws) converted with QCAD dwg2dwg → DXF → SVG. Sheet scale is not 1:1 in drawing units; the dimension text is authoritative.'; return; }
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 300" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[si].svg()}<text x="850" y="292" text-anchor="end" font-size="10" fill="var(--ink2)">M8246 · sheet ${si+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[si].note; };
  draw(); }
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<p class="small muted">No software. This tab shows the power path stage by stage and the redundancy states, live at the playhead.</p><div class="grid2">${card('Power path', `<div id="sp"></div>`)}${card('Redundancy state', `<div id="fsm"></div>`)}</div>`;
  SIM.on('time', ()=>{ const t=SIM.t, r=railsAt(t);
    const st=[['Mains AC1/AC2', D.vac+' V'],['M8245 output (set)', '±'+(VNOM+D.unit[0].trim).toFixed(2)+' / ±'+(VNOM+D.unit[1].trim).toFixed(2)+' V'],['1N5404 diode-OR', '−0.8 V'],['MF251 bus', '+'+r.vp.toFixed(2)+' / −'+r.vn.toFixed(2)+' V'],['R250SA1 10 Ω → +VD', r.vd.toFixed(2)+' V'],['Console modules', (VNOM*(r.L.p+r.L.n)).toFixed(0)+' W '+'(inferred)']];
    let y=10, s=`<svg viewBox="0 0 520 ${st.length*40+20}" style="width:100%">`; st.forEach(x=>{ s+=`<rect x="10" y="${y}" width="500" height="32" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="20" y="${y+21}" font-size="12" fill="var(--ink)">${x[0]}</text><text x="500" y="${y+21}" text-anchor="end" font-size="12.5" font-family="var(--mono)" fill="var(--ink)">${x[1]}</text>`; y+=40; });
    m.querySelector('#sp').innerHTML=s+'</svg>';
    const a0=alive(0,t), a1=alive(1,t); const k= r.lim?'LIMIT': a0&&a1?'SHARE': a0?'PSU1 ONLY': a1?'PSU2 ONLY':'DARK';
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 520 200" style="width:100%">${['SHARE','PSU1 ONLY','PSU2 ONLY','LIMIT','DARK'].map((n,i)=>{ const X=20+(i%3)*165, Y=20+Math.floor(i/3)*80; return `<rect x="${X}" y="${Y}" width="150" height="50" rx="10" fill="${k===n?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${X+75}" y="${Y+30}" text-anchor="middle" font-size="12" fill="${k===n?'#fff':'var(--ink)'}">${n}</text>`; }).join('')}<text x="20" y="190" font-size="10.5" fill="var(--ink2)">A failed unit moves SHARE → single; a single unit above 4 A / 3 A → LIMIT (M8245A ratings).</text></svg>`; });
}
function viewNotes(m){ window[KEY]=false;
  m.innerHTML=card('Findings — what the M8246 folder is up to', `<ol>
   <li><b>Artwork ${SIM.year(2026)}: no usable panel art.</b> The only CorelDRAW files are the 1999 CorelDRAW 5 sheets ${SIM.src('#CONSOLES - #OBSOLETE #Archive/M8246/M8246M3.CDR','M8246/M8246M3.CDR')} (Mar 23 1999), ${SIM.src('#CONSOLES - #OBSOLETE #Archive/M8246/M82463.CDR','M82463.CDR')} and ${SIM.src('#CONSOLES - #OBSOLETE #Archive/M8246/M82463M.CDR','M82463M.CDR')} (Mar 25 1999). Converted (Inkscape/libcdr) they keep only fragments: M8246M3.CDR gives a 1.835 × 1.68″ plate with a Ø0.79″ circle, a 0.44 × 0.28″ and a 0.31 × 0.35″ box and two earth symbols, while all 30-odd text objects decode as garbled double-byte strings stacked off the page (the archive sidecar recovers the words: “M8246 POWER SUPPLY”, “115/230 VAC”, “AC”, “DC”, the caution). That plate is not the 4.980 × 2.200″ M8246M3 front that the 2012 drawing says the silk belongs to, so the front stays drawn to scale from the DWG; M82463M.CDR is a text-only label. The NAB R2k sheets in the batch list are console overview art, not the PSU.</li>
   <li><b>The M8246 is a box, not a circuit.</b> Every M8246 drawing is metalwork: top, bottom and front. No schematic or BOM carries the M8246 number. The 1999 price list sells it as the R2K “Power Supply”. The electronics are therefore inferred to be an M8245 card: same ±22 V, a 24-contact card edge matching MF250.BAK's “EDAC24” PSU sockets, and a top/bottom with 7 mounting points ${inf('')}.</li>
   <li><b>The labels disagree on the voltage.</b> The M8245 schematic says ±22 V, the MF251 frame board says “+21 / −21”, and the M8245A spec sheet says +21 V @ 4 A / −21 V @ 3 A. The ≈ 0.8 V difference is the CR18/CR19 1N5404 redundancy diodes.</li>
   <li><b>One LED, but the silk names two indicators.</b> The M8246M3 front has a single .250″ hole. The M8246M3.CDR silk (1999) still carries “AC”, “DC” and “115/230 VAC” strings plus caution text. Either the silk belongs to an earlier front, or the extra labels sit on the rear ${inf('CDR text')}.</li>
   <li><b>The blank and the unit differ in height.</b> The M8246 front is 2.200″ (+ .580″ flange) and the MF250M10 blank P.S.U front is 2.750″. Both are 4.980″ wide. The blank probably covers the flange as well ${inf('')}.</li>
   <li><b>The 2012 redraws exist only here.</b> The folder README notes the 1999 set lives in #CONSOLES/M8246; the 2012 sheets have new LAYOUT files dated APR.06/01 and NOV.26/99 in their title text, i.e. the redraws copied the original dates.</li>
   <li><b>+VD is a resistor away from +V.</b> R250SA1 derives the digital/clock rail through a 10 Ω 3.75 W resistor and a 1000 µF/35 V capacitor, so +VD falls with clock/timer load (${(load().vdOnly*RVD).toFixed(1)} V drop at the current estimate).</li>
   <li><b>Redundancy depends on trim.</b> With plain diode-OR sharing, a unit set 0.1 V higher carries most of the load. The archive has no current-sharing circuit, so the pair must have been trimmed by hand on R54 ${inf('')}.</li></ol>`)
   + card('Assumptions in this model', `<ul class="small"><li>Module and DA currents (table in code) ${inf('module content')}; they keep an R2K/28 with 6 DAs under one unit's 4 A / 3 A rating.</li><li>Output slope 0.06 Ω per unit; 2 ms bus dip on a failure ${inf('')}.</li><li>AC1 feeds PSU1 and AC2 feeds PSU2 ${inf('MF251 layout')}.</li><li>Front LED = output present ${inf('')}.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>#CONSOLES - #OBSOLETE #Archive/XXX - M8246 - R2K CONSOLE PSU #Master #OBSOLETE/M8246.DWG · M8246 - #Mechanical #Obsolete/M8246M1/M2/M3 ISS 1 + LAYOUT</li><li>…/#CONSOLES - #OBSOLETE #Archive/M8246/*.CDR, CHASSIS/MECHLIST.WPD · RADIO/REN2K/R2KUSPG2.HTM, R2KTYPUS.HTM · MF250/MF251.PCB, MF250.BAK · MODULES/R250/R250W1.pdf, R250SA1.pdf</li><li>…/XXX - M8245 - #Master #OBSOLETE/M8245 Schematic Filtran.pdf · #SERIALBOX #SERIES/SERIALBOXX - #mf100/m8245aspecs.wpd</li><li>assets: m8246-r2k-console-psu-m3-front.svg, -m1-top.svg, -m2-bottom.svg</li></ul>`);
}
SIM.register({
  footnotes: [
    { text: "M8246M3.CDR (Mar 23 1999), the silk the 2012 M8246M3 front drawing points to, holds a 1.835 × 1.68 in plate with a Ø0.79 in circle, two boxes and two earth symbols: it does not match the 4.980 × 2.200 in front it is named after.", src: "#CONSOLES - #OBSOLETE #Archive/M8246/M8246M3.CDR" },
    { text: "All text in the 1999 CorelDRAW 5 silks (M8246M3.CDR, M82463M.CDR) is unreadable to libcdr: the words survive only in the archive sidecar (“M8246 POWER SUPPLY”, “115/230 VAC”, “AC”, “DC”, caution).", src: "#CONSOLES - #OBSOLETE #Archive/M8246/M82463M.CDR" },
    { text: "The same small plate appears a week earlier, about 5 % smaller, in the frame folder's MF250S.CDR (Mar 17 1999).", src: "#CONSOLES - #OBSOLETE #Archive/MF250/MF250S.CDR" },
    { text: "The 2012 M8246M3 front drawing has one .250 in hole at (1.850, .410) while the 1999 silk text names both “AC” and “DC” indicators.", src: "#CONSOLES - #OBSOLETE #Archive/XXX - M8246 - R2K CONSOLE PSU #Master #OBSOLETE/M8246 - #Mechanical #Obsolete/M8246M3 ISS 1 (POWER SUPPLY FRONT).pdf" }
  ],
  id:'m8246-r2k-console-psu', product:'M8246 - R2K CONSOLE PSU', name:'M8246 · R2K console power supply (1999|32)', year:1999,
  family:'Obsolete products', folder:'#CONSOLES - #OBSOLETE #Archive/XXX - M8246 - R2K CONSOLE PSU #Master #OBSOLETE',
  summary:'The plug-in power supply for the R2K radio console: a 4.98 × 2.2 in black-fronted aluminium box that slides into the MF251/MF250 power frame. One is essential and two give redundancy, sharing the ±21 V bus through diodes. Inside is an M8245-type ±22 V switch-mode card (inferred).',
  highlights:['Front, top and bottom drawn to scale from M8246M1/M2/M3','R2K/12, /20, /28 load estimates','Diode-OR sharing and a unit failure in slow motion','+VD derived through R250SA1','Mechanics-only folder: what the box contained'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 mains cycle',period:()=>1/60},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms (failure dip)'],[1/60,'1 mains cycle']],
  defaultZoom:0,
  init(){},
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: powering the R2K',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Power path',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
