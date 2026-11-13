/* =====================================================================
   M405M — VU monitor panel, 2RU (Ward-Beck Systems, 1995|28, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html) — hardware model

   Sources (folder "#M400 #SERIES - Meter Panels/XXX - M405M - #OBSOLETE #Archive"):
   - M405M.DWG     "M405M VU MONITOR OUTLINE" (AutoCAD R12, drawn at 0.3 scale):
                   19.000 × 3.460 in front panel, 17.375 in body, 7.810 / 10.210 in depth.
                   Front panel art -> assets/m405m-front.svg (converted with QCAD dwg2dwg,
                   cropped to the panel with a small ezdxf script, true inches).
   - 405S016.DWG   "M405M VU MONITOR SCHEMATIC" B 405-02-016 iss 1: A1 SA14-292B,
                   A2 M703C, M1 544WL meter, J1 NL-114B headset, LS1 DC22S, R1 WBS 10-073,
                   SW1 A/B, SW3–SW7 sensitivity, TB1, J2 91206-021, F1 AGC 0.75, +24 V DC.
                   -> assets/m405m-sch-405S016.svg
   - SA14292B.DWG  "SA14-292B VU METER AMPLIFIER SCHEMATIC" B 14-292-02-003 iss 1:
                   U1 LM833N, U2 LM317LZ, every resistor value used below.
                   -> assets/m405m-sch-SA14292B.svg
   - README.TXT    "THIS DIRECTORY WAS PURGED LAST ON JUNE 8, 1995 - SCOTT"
   Sister product: XXX - M405S (M405S.WP6 gives the family's 24 V / +4 dBu figures).
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__m405mActive';
let KEYC='';

/* ---------------- values copied from SA14292B.DWG / 405S016.DWG ---------------- */
const SA = { R3:15e3, R4:15e3, R13:15e3, R14:15e3, R5:270e3, R16:43e3, R17:50e3, R18:22e3, R20:47e3, R22:3.9e3,
  R6:6490, R7:3570, R8:14300, R9:2430, R10:1580, R25:240, R24:3900, R26:22e3, R27:24e3, R28:330 };
const VREG = 1.25*(1+SA.R24/SA.R25);             // LM317LZ: 1.25 × (1 + 3K9/240) = 21.56 V  ("+22V" on the drawing)
const VMID = VREG*SA.R27/(SA.R26+SA.R27);        // R26/R27 divider = 11.25 V ("+11V")
const U1B_GAIN = SA.R20/SA.R18;                  // 47K/22K = 2.136 (+6.6 dB)
const SENS = [-10,0,4,8,10];                     // SW3…SW7, 405S016 strap detail
const SW_OF = {'-10':'SW3','0':'SW4','4':'SW5','8':'SW6','10':'SW7'};
const STRAP = {'-10':'R10 1K58 → “−10”','0':'R6 6K49 → “0”','4':'R7 3K57 → “+4”','8':'R8 14K3 ∥ R9 2K43 → “+8”','10':'R10 1K58 → “+10”'};
const dBu = v=>20*Math.log10(v/0.7746), Vrms = d=>0.7746*Math.pow(10,d/20);
const VU_REF = Vrms(4);                          // 0 VU = +4 dBu across the meter + 3K9 build-out (standard VU, inferred)

/* ---------------- device state ---------------- */
const D = { vsup:24, power:true, input:'A', sens:4, src:{A:{lvl:4,f:1000},B:{lvl:-10,f:400}}, prog:'burst', spk:0.55, headset:false, cal:0.5, log:[] };
function reset(){ Object.assign(D,{vsup:24,power:true,input:'A',sens:4,src:{A:{lvl:4,f:1000},B:{lvl:-10,f:400}},prog:'burst',spk:0.55,headset:false,cal:0.5}); KEYC=''; }

/* ---------------- analog chain ---------------- */
function rail(){ // CR1 1N4003 then LM317LZ; drop-out ~1.7 V (inferred, LM317L data) — 24 V supply leaves only 1.3 V
  if (!D.power) return {vin:0,vreg:0,vmid:0,drop:false};
  const vin=D.vsup-0.7, vreg=Math.min(VREG, vin-1.7); return {vin, vreg, vmid:vreg*SA.R27/(SA.R26+SA.R27), drop: vreg<VREG-0.01};
}
function stages(){
  const s=D.src[D.input], r=rail(), inL=s.lvl;
  const calDb = 20*Math.log10((SA.R16+D.cal*SA.R17)/(SA.R16+0.5*SA.R17));   // R17 50K CAL trim around mid
  const u1bOut0 = dBu(VU_REF);                         // +4 dBu at the meter drive = 0 VU
  const u1aOut0 = u1bOut0 - 20*Math.log10(U1B_GAIN);   // −2.6 dBu at U1A out for 0 VU
  const g1 = (u1aOut0 - D.sens) + calDb;               // strap sets U1A gain so the chosen level reads 0 VU (inferred topology)
  const swing = Math.max(0,(r.vreg-r.vmid)-1.5);       // LM833 output swing on a single rail, ~1.5 V from the rail (inferred)
  const clipDbu = dBu(swing/Math.SQRT2);
  const u1a = inL + g1, u1b = u1a + 20*Math.log10(U1B_GAIN);
  const vu = u1b - u1bOut0;
  const spkAtt = D.spk<=0.001? -99 : 20*Math.log10(D.spk*D.spk*0.98+0.02);      // 10-073 audio-taper pot (inferred law)
  const spkW = r.vreg? Math.min(2.2, 0.5*Math.pow(10,(inL - D.sens + spkAtt)/10)) : 0; // M703C output, ~0.5 W at 0 VU full up (inferred)
  return { inL, g1, u1a, u1b, vu, clipDbu, clip: Math.max(u1a,u1b) > clipDbu, head: clipDbu - u1b + vu*0, spkAtt, spkW, r,
    lampmA: D.power? Math.max(0,D.vsup-3*2.1)/SA.R28*1000 : 0 };   // 3 LEDs in M1 in series with R28 330R (Vf 2.1 V inferred)
}
/* program envelope (Vrms multiplier vs time) for the 1 s */
function env(t){
  if (!D.power) return 0;
  if (D.prog==='tone') return 1;
  if (D.prog==='burst') return (t>=0.2 && t<0.7)? 1 : 0;
  // speech-like: syllables at ~4 Hz with pauses (inferred program model)
  const syl = Math.max(0, Math.sin(2*Math.PI*4.1*t))*Math.max(0,Math.sin(2*Math.PI*0.9*t+0.6));
  return Math.min(1.4, 1.6*syl);
}
/* VU needle: 2nd-order movement, 300 ms to 99 %, ~1 % overshoot (IEC 60268-17 VU, not in the archive: inferred) */
const WN = 13.6, ZETA = 0.82;
let NEEDLE=null;
function needle(){
  const st=stages(), key=[D.vsup,D.power,D.input,D.sens,D.src.A.lvl,D.src.B.lvl,D.prog,D.cal].join('|');
  if (key===KEYC) return NEEDLE; KEYC=key;
  const dt=1e-3, N=1000, out=new Float32Array(N+1), drv=new Float32Array(N+1); let x=0,v=0;
  const g = Math.pow(10, st.vu/20);                       // needle current, 1.0 = 0 VU (100 %)
  const lim = Math.pow(10,(st.clipDbu - (st.u1b - st.vu))/20); // drive cannot exceed U1B clip
  for (let i=0;i<=N;i++){ const u=Math.min(lim, g*env(i*dt)); drv[i]=u; out[i]=x; const a=WN*WN*(u-x)-2*ZETA*WN*v; v+=a*dt; x+=v*dt; if(x<-0.02){x=-0.02;v=0;} if(x>1.6){x=1.6;v=0;} }
  NEEDLE={out,drv}; return NEEDLE;
}
const needleAt = t=>{ const n=needle(); const i=Math.max(0,Math.min(1000,Math.round(t*1000))); return n.out[i]; };
const vuDb = p=> p<=0.001? -Infinity : 20*Math.log10(p);

/* ---------------- actions: each logs the signal path it changes ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  input(k){ act(`Press SW1 “${k}”`, tr=>{ if(D.input===k){ tr(`SW1 is mechanically interlocked: “${k}” is already down, nothing changes (405S016 note 1)`); return; }
    tr(`SW1 releases “${D.input}” and latches “${k}” (mechanically interlocked, 405S016 note 1)`);
    D.input=k; tr(`${k} INPUT TB pins ${k==='A'?'1 (+) 2 (−)':'4 (+) 5 (−)'} → A1 SA14-292B P1-7 / P1-8 (twisted pair) · ${k==='A'?'B':'A'} input now floats`);
    tr(`Level at A1 input ${D.src[k].lvl} dBu → needle target ${stages().vu.toFixed(1)} VU`); }); },
  sens(v){ act(`Press INPUT SENSITIVITY ${v>0?'+':''}${v}`, tr=>{ tr(`${SW_OF[v]} latches; ${SW_OF[D.sens]} pops out (SW3–SW7 mechanically interlocked, 405S016 note 2)`);
    D.sens=v; tr(`Strap connector on A1 now selects ${STRAP[v]} as U1A's gain resistor`);
    const s=stages(); tr(`U1A gain ${s.g1>=0?'+':''}${s.g1.toFixed(1)} dB → U1B ×${U1B_GAIN.toFixed(3)} (+6.6 dB) → R22 3K9 → M1: ${s.vu.toFixed(1)} VU`); }); },
  level(k,d){ act(`Set ${k} source to ${d} dBu`, tr=>{ D.src[k].lvl=d; const s=stages(); tr(`TB ${k}: ${Vrms(d).toFixed(3)} V rms balanced`); if(k===D.input) tr(`M1 target ${s.vu.toFixed(1)} VU${s.clip?' — U1 clips (rail '+s.r.vreg.toFixed(2)+' V)':''}`); else tr(`${k} is not selected on SW1, so the meter does not move`); }); },
  spk(p){ act(`Turn SPEAKER LEVEL to ${Math.round(p*10)}`, tr=>{ D.spk=p; const s=stages(); tr(`R1 WBS 10-073 wiper (A2 pins U, T/V, 8) → M703C gain ${s.spkAtt<-90?'muted':s.spkAtt.toFixed(1)+' dB'}`); tr(`A2 pins 21/Y → LS1 DC22S: ≈ ${s.spkW.toFixed(2)} W ${inf('M703C has no data in the archive')}`); }); },
  headset(){ act(D.headset?'Unplug headset':'Plug in headset', tr=>{ D.headset=!D.headset; tr(`J1 NL-114B ${D.headset?'tip/ring now carry':'no longer carries'} A2 X/W (the same pair as TB1 7/8 OUTPUT MONITOR +4 dBu)`); tr(`Speaker LS1 keeps playing: no switching contact to pins 21/Y is drawn on 405S016 ${inf('drawing')}`); }); },
  power(){ act(D.power?'Remove +24 V':'Apply +24 V to J2', tr=>{ D.power=!D.power; const r=rail();
    tr(D.power? `J2 pin 1 +24 V → F1 AGC 0.75 A → A1 P1-1,2 and A2 pins 1/13/P; pin 5 GND` : 'All rails collapse; M1 lamp LEDs go dark');
    if(D.power) tr(`A1: CR1 1N4003 → U2 LM317LZ (R25 240 / R24 3K9) = ${r.vreg.toFixed(2)} V${r.drop?' — in drop-out, below the 21.56 V design value':''}; R26/R27 → ${r.vmid.toFixed(2)} V mid-rail`); }); },
  prog(p){ act(`Program: ${p}`, tr=>{ D.prog=p; tr(p==='burst'?'Tone on from 200 ms to 700 ms: watch the needle rise (VU spec: 99 % in 300 ms)':p==='tone'?'Steady tone for the whole second':'Speech-like syllables, ~4 per second '+inf('test signal model')); }); },
  cal(v){ act(`Trim R17 CAL to ${Math.round(v*100)} %`, tr=>{ D.cal=v; const s=stages(); tr(`R16 43K + R17 50K CAL set U1A feedback → ${s.vu.toFixed(2)} VU for the current input`); }); },
};

/* ---------------- panel (drawn from M405M.DWG, true inches) ---------------- */
const P = { W:18.98, H:3.467,               // M405M.DWG: 19.000 × 3.460 (+ ears), crop of the front view
  pivot:[5.593,5.333], rScale:4.31,          // scale ARC c=(2.113,1.367) r=1.293 at 0.3 scale
  win:[3.35,0.28,7.85,2.17],
  ab:{A:[2.31,1.03,0.32,0.64],B:[2.31,1.75,0.32,0.65]},
  sens:[8.90,9.59,10.29,10.99,11.69], sensY:1.72,
  knob:[13.11,1.73], jack:[10.30,2.727], grille:[14.19,0.89,2.43,1.69] };
// needle angle (deg) vs current, measured off the converted scale: rest 109.5°, −20 VU 107.1°, 0 VU 84.6°, +3 VU 71.9°
const ANG=[[0,109.5],[0.1,107.1],[1,84.6],[1.413,71.9],[1.6,69.5]];
const ang = p=>{ p=Math.max(0,Math.min(1.6,p)); for(let i=1;i<ANG.length;i++){ const [p0,a0]=ANG[i-1],[p1,a1]=ANG[i]; if(p<=p1) return a0+(a1-a0)*(p-p0)/(p1-p0); } return 69.5; };
function frontSVG(t, hot){
  const S=60, p=needleAt(t), a=ang(p)*Math.PI/180, [px,py]=P.pivot;
  const x2=px+Math.cos(a)*4.55, y2=py-Math.sin(a)*4.55, x1=px+Math.cos(a)*3.25, y1=py-Math.sin(a)*3.25;
  const lit=D.power, st=stages();
  let s=`<svg viewBox="0 0 ${P.W*S} ${P.H*S}" style="width:100%;border-radius:4px;background:#c9c4b4">
   <defs><clipPath id="m4win"><rect x="${P.win[0]*S}" y="${P.win[1]*S}" width="${(P.win[2]-P.win[0])*S}" height="${(P.win[3]-P.win[1])*S}"/></clipPath>
   <radialGradient id="m4lamp" cx="50%" cy="10%" r="90%"><stop offset="0" stop-color="${lit?'#fff3c4':'#d9d4c4'}"/><stop offset="1" stop-color="${lit?'#f2e2a8':'#cfc9b8'}"/></radialGradient></defs>
   <rect x="${P.win[0]*S}" y="${P.win[1]*S}" width="${(P.win[2]-P.win[0])*S}" height="${(P.win[3]-P.win[1])*S}" fill="url(#m4lamp)"/>
   <image href="${ASSET}m405m-front.svg" x="0" y="0" width="${P.W*S}" height="${P.H*S}"/>
   <g clip-path="url(#m4win)"><line x1="${x1*S}" y1="${y1*S}" x2="${x2*S}" y2="${y2*S}" stroke="#111" stroke-width="3"/></g>`;
  // A/B interlocked switches
  for (const k of ['A','B']){ const [x,y,w,h]=P.ab[k], on=D.input===k; s+=`<g data-act="in" data-k="${k}" style="cursor:pointer"><rect x="${x*S}" y="${y*S}" width="${w*S}" height="${h*S}" fill="${on?'#f2efe6':'#8a8576'}" fill-opacity="${on?0.75:0.55}" stroke="${on?'var(--accent)':'#333'}" stroke-width="${on?3:1}"><title>SW1 ${k} input (interlocked)</title></rect></g>`; }
  // sensitivity bank
  SENS.forEach((v,i)=>{ const cx=P.sens[i], on=D.sens===v; s+=`<g data-act="sens" data-v="${v}" style="cursor:pointer"><rect x="${(cx-0.31)*S}" y="${(P.sensY-0.16)*S}" width="${0.62*S}" height="${0.33*S}" fill="${on?'#f2efe6':'#8a8576'}" fill-opacity="${on?0.8:0.45}" stroke="${on?'var(--accent)':'#333'}" stroke-width="${on?3:1}"><title>${SW_OF[v]}: ${v>0?'+':''}${v} dBu</title></rect></g>`; });
  // speaker level knob
  const ka=(-135+270*D.spk)*Math.PI/180, [kx,ky]=P.knob;
  s+=`<g data-act="knob" style="cursor:ns-resize"><circle cx="${kx*S}" cy="${ky*S}" r="${0.22*S}" fill="#1c1c1c" stroke="#000"/><line x1="${kx*S}" y1="${ky*S}" x2="${(kx+Math.sin(ka)*0.2)*S}" y2="${(ky-Math.cos(ka)*0.2)*S}" stroke="#eee" stroke-width="3"/><title>SPEAKER LEVEL (R1 WBS 10-073) — click left half to turn down, right half to turn up</title></g>`;
  // headset jack
  s+=`<g data-act="jack" style="cursor:pointer"><circle cx="${P.jack[0]*S}" cy="${P.jack[1]*S}" r="${0.2*S}" fill="${D.headset?'var(--accent)':'transparent'}" fill-opacity=".35" stroke="${D.headset?'var(--accent)':'transparent'}" stroke-width="3"/>${D.headset?`<rect x="${(P.jack[0]-0.08)*S}" y="${(P.jack[1]-0.08)*S}" width="${0.16*S}" height="${0.75*S}" fill="#222"/>`:''}<title>HEADSET J1 NL-114B — click to plug/unplug</title></g>`;
  // speaker grille glow with level
  const g=P.grille, lv=D.power? Math.min(1, st.spkW*1.5*env(t)) : 0;
  s+=`<rect x="${g[0]*S}" y="${g[1]*S}" width="${g[2]*S}" height="${g[3]*S}" rx="${0.2*S}" fill="var(--accent)" fill-opacity="${(lv*0.35).toFixed(2)}" pointer-events="none"/>`;
  if (st.clip && env(t)>0) s+=`<text x="${P.win[0]*S+8}" y="${P.win[3]*S-8}" font-size="22" fill="var(--bad)" font-weight="700">CLIP</text>`;
  return s+(hot||'')+`</svg>`;
}
function bindPanel(root){
  root.querySelectorAll('[data-act="in"]').forEach(g=>g.onclick=()=>A.input(g.dataset.k));
  root.querySelectorAll('[data-act="sens"]').forEach(g=>g.onclick=()=>A.sens(+g.dataset.v));
  root.querySelectorAll('[data-act="jack"]').forEach(g=>g.onclick=()=>A.headset());
  root.querySelectorAll('[data-act="knob"]').forEach(g=>g.onclick=e=>{ const r=g.getBoundingClientRect(); const up=e.clientX>r.left+r.width/2; A.spk(Math.max(0,Math.min(1,Math.round((D.spk+(up?0.1:-0.1))*10)/10))); });
}
function rearHTML(){ return `<table class="kv small"><tr><th>TB1 (rear terminal strip)</th><td>1 A+ · 2 A− · 3 GND · 4 B+ · 5 B− · 6 GND · 7/8 OUTPUT MONITOR +4 dBu · 9 · 12 chassis</td></tr>
  <tr><th>J2 POWER INPUT 91206-021</th><td>1 = +24 V DC (via F1 AGC 0.75) · 5 = GND <button id="pw">${D.power?'Remove power':'Apply +24 V'}</button></td></tr>
  <tr><th>A1 strap / P1</th><td class="mono">P1-1 supply, 2 lamp +, 3/4 to A2, 5 shield, 7/8 VU input, 9 common, 10 lamp common</td></tr></table>
  <p class="small muted">No rear-panel drawing is in the folder: the strip is listed from 405S016 ${inf('pin order from the schematic, not a drawing')}.</p>`; }

function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
  <label>Source A <input id="la" type="range" min="-20" max="24" value="${D.src.A.lvl}"> <span id="lav" class="mono"></span></label>
  <label>Source B <input id="lb" type="range" min="-20" max="24" value="${D.src.B.lvl}"> <span id="lbv" class="mono"></span></label>
  <label>Program <select id="pg">${[['burst','Tone burst 200–700 ms'],['tone','Steady tone'],['speech','Speech-like']].map(([v,l])=>`<option value="${v}" ${D.prog===v?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Supply <input id="vs" type="range" min="20" max="35" step="0.5" value="${D.vsup}"> <span id="vsv" class="mono"></span></label>
  <label>R17 CAL <input id="cl" type="range" min="0" max="100" value="${D.cal*100}"></label>
  <button id="rs">Factory state</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#la')) return;
  const u=()=>{ q('#lav').textContent=D.src.A.lvl+' dBu'; q('#lbv').textContent=D.src.B.lvl+' dBu'; }; u();
  q('#la').onchange=e=>A.level('A',+e.target.value); q('#la').oninput=e=>{D.src.A.lvl=+e.target.value;u();};
  q('#lb').onchange=e=>A.level('B',+e.target.value); q('#lb').oninput=e=>{D.src.B.lvl=+e.target.value;u();};
  q('#pg').onchange=e=>A.prog(e.target.value); q('#vsv').textContent=D.vsup+' V'; q('#vs').oninput=e=>{q('#vsv').textContent=e.target.value+' V';}; q('#vs').onchange=e=>act(`Set J2 supply to ${e.target.value} V`, tr=>{ D.vsup=+e.target.value; const r=rail(); tr(`CR1 drop 0.7 V → LM317LZ input ${r.vin.toFixed(2)} V; needs ≈ 1.7 V head-room ${inf('LM317L data')}`); tr(`+22 V rail = ${r.vreg.toFixed(2)} V${r.drop?' (drop-out)':''}; mid-rail ${r.vmid.toFixed(2)} V; clip point moves with it`); }); q('#cl').onchange=e=>A.cal(+e.target.value/100);
  q('#rs').onclick=()=>{ reset(); D.log.length=0; SIM.refresh(); };
  const pw=q('#pw'); if(pw) pw.onclick=()=>A.power(); }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press A/B, a sensitivity button, the knob or the headset jack on the panel.</div>'; }

/* ---------------- timeline lanes ---------------- */
function wave(c,X,t0,t1,y,h,f,amp,col,fn){ const pw=X(t1)-X(t0); c.strokeStyle=col; c.fillStyle=col;
  if ((t1-t0)*f > pw/3){ c.globalAlpha=.3; c.beginPath(); for(let i=0;i<=300;i++){ const tt=t0+(t1-t0)*i/300; const A_=amp*env(tt); c.lineTo(X(tt), y+h/2-A_*h*0.45); } for(let i=300;i>=0;i--){ const tt=t0+(t1-t0)*i/300; c.lineTo(X(tt), y+h/2+amp*env(tt)*h*0.45);} c.fill(); c.globalAlpha=1; return; }
  c.beginPath(); for(let i=0;i<=600;i++){ const tt=t0+(t1-t0)*i/600; const v=fn? fn(tt): amp*env(tt)*Math.sin(2*Math.PI*f*tt); i?c.lineTo(X(tt),y+h/2-v*h*0.45):c.moveTo(X(tt),y+h/2-v*h*0.45);} c.stroke(); }
function lanes(){ const st=stages(), src=D.src[D.input], css=SIM.css, f=src.f, n=needle();
  const clipA = Math.pow(10,(st.clipDbu-st.u1b)/20), norm=v=>Math.max(-1,Math.min(1,v));
  return [
    {label:`Input ${D.input} (${src.lvl} dBu, ${f} Hz)`, h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,f,0.8,css('--accent2')); }},
    {label:`U1A out (${st.u1a.toFixed(1)} dBu)`, h:40, draw(c,X,t0,t1,y,h){ const a=Math.min(1,Math.pow(10,(st.u1a-st.u1b)/20)*0.8*Math.max(1,1)); wave(c,X,t0,t1,y,h,f,a,css('--accent')); }},
    {label:`U1B / meter drive (${st.u1b.toFixed(1)} dBu)`, h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,f,0.8,st.clip?css('--bad'):css('--accent'), tt=>0.8*norm(env(tt)*Math.sin(2*Math.PI*f*tt)/Math.min(1,clipA))*Math.min(1,clipA)); }},
    {label:'Meter current (100 % = 0 VU)', h:44, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--warn'); c.beginPath(); for(let i=0;i<=400;i++){ const tt=t0+(t1-t0)*i/400; const v=n.drv[Math.max(0,Math.min(1000,Math.round(tt*1000)))]; i?c.lineTo(X(tt),y+h-4-Math.min(1.5,v)/1.5*(h-8)):c.moveTo(X(tt),y+h-4-Math.min(1.5,v)/1.5*(h-8)); } c.stroke(); c.fillStyle=css('--ink2'); c.fillRect(X(t0),y+h-4-(1/1.5)*(h-8),X(t1)-X(t0),1); }},
    {label:'Needle position (VU ballistics)', h:50, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--ink'); c.lineWidth=2; c.beginPath(); for(let i=0;i<=500;i++){ const tt=t0+(t1-t0)*i/500; const v=needleAt(tt); i?c.lineTo(X(tt),y+h-4-Math.min(1.5,v)/1.5*(h-8)):c.moveTo(X(tt),y+h-4-Math.min(1.5,v)/1.5*(h-8)); } c.stroke(); c.lineWidth=1; c.fillStyle=css('--ink2'); c.fillRect(X(t0),y+h-4-(1/1.5)*(h-8),X(t1)-X(t0),1); c.font='10px monospace'; c.fillText('0 VU',X(t0)+4,y+h-6-(1/1.5)*(h-8)); }},
    {label:`Speaker LS1 (${st.spkW.toFixed(2)} W)`, h:30, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,f,Math.min(0.9,Math.sqrt(st.spkW)),css('--accent2')); }},
    {label:`M1 lamp (3 LEDs, ${st.lampmA.toFixed(0)} mA)`, h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=D.power?'#e8c34a':css('--grid'); c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); }},
    {label:`Regulated rail U2 (${st.r.vreg.toFixed(2)} V)`, h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=st.r.drop?css('--warn'):css('--accent'); c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); }},
  ]; }

/* ---------------- views ---------------- */
function inspHTML(t){ const st=stages(), p=needleAt(t); return `<table class="kv">
  <tr><th>Needle at playhead</th><td class="mono">${(p*100).toFixed(1)} % · ${isFinite(vuDb(p))?vuDb(p).toFixed(1):'−∞'} VU</td></tr>
  <tr><th>Selected input</th><td class="mono">${D.input} · ${D.src[D.input].lvl} dBu · sensitivity ${D.sens>0?'+':''}${D.sens} dBu (${SW_OF[D.sens]})</td></tr>
  <tr><th>Steady-state reading</th><td class="mono">${st.vu.toFixed(1)} VU ${st.vu>3?'(pinned past +3)':''}</td></tr>
  <tr><th>Headroom to clip</th><td class="mono">${(st.clipDbu-st.u1b).toFixed(1)} dB at U1B ${st.clip?'<b style="color:var(--bad)">CLIPPING</b>':''}</td></tr>
  <tr><th>Rails (A1)</th><td class="mono">${st.r.vreg.toFixed(2)} V / ${st.r.vmid.toFixed(2)} V${st.r.drop?' <span style="color:var(--warn)">LM317L drop-out</span>':''}</td></tr>
  <tr><th>Speaker / headset</th><td class="mono">${st.spkW.toFixed(2)} W · headset ${D.headset?'plugged':'out'}</td></tr></table>`; }
function viewSim(m){
  window[KEY]=false;
  m.innerHTML = card('Front panel at the playhead (drawn from M405M.DWG, to scale) — click the switches, knob and jack', `<div id="fp"></div>${controlsHTML()}`)
   + `<div class="grid2"><div>${card('Rear connections (405S016)', `<div id="rp"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
      <div>${card('What changed in the circuit (last action)', `<div id="trace" class="log"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div></div>`
   + card('Timeline — one second (click to seek)', `<canvas id="tl"></canvas><p class="small muted">The needle follows a second-order movement tuned to the VU standard (300 ms to 99 %, about 1 % overshoot) ${inf('IEC 60268-17; the archive has no meter data sheet')}. Everything upstream of the meter uses the SA14-292B resistor values.</p>`);
  bindControls(m);
  SIM.on('time', ()=>{ const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearHTML(); const pw=m.querySelector('#pw'); if(pw) pw.onclick=()=>A.power();
    m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); });
}

const LESSONS = [
  { title:'1 · Power the panel', body:`<p>The M405M takes <b>+24 V DC</b> on J2 (91206-021): pin 1 positive, pin 5 ground, through F1 (AGC 0.75 A). Apply power with the button under “Rear connections”. The meter lamp (three LEDs in M1) lights.</p>`, check:()=>D.power, hint:'Rear connections → Apply +24 V.' },
  { title:'2 · Pick input A', body:`<p>SW1 is a pair of <b>interlocked</b> push buttons. Only one can be down. Press <b>A</b> on the left of the panel.</p>`, check:()=>D.power&&D.input==='A', hint:'Click the upper of the two tall buttons (A).' },
  { title:'3 · Match the plant level', body:`<p>INPUT SENSITIVITY is five interlocked buttons, SW3–SW7: −10, 0, +4, +8, +10 dBu. Choose the level your plant calls 0 VU. For a +4 dBu plant press <b>+4</b>.</p>`, check:()=>D.sens===4, hint:'Click the third button in the INPUT SENSITIVITY row.' },
  { title:'4 · Line-up tone reads 0 VU', body:`<p>Set Source A to <b>+4 dBu</b> and Program to <b>Steady tone</b>. The needle settles on 0 VU (100 %). If it does not, trim <b>R17 CAL</b> on the SA14-292B card.</p>`, check:()=>D.input==='A'&&D.src.A.lvl===4&&D.prog==='tone'&&Math.abs(stages().vu)<0.3, hint:'Source A slider to +4, Program → Steady tone, CAL near 50 %.' },
  { title:'5 · Check the ballistics', body:`<p>Choose <b>Tone burst</b>. Scrub the playhead from 200 ms to 500 ms. A VU needle should reach 99 % of its final reading about 300 ms after the tone starts, and overshoot by about 1 %. Read it off the “Needle position” lane.</p>`, check:()=>D.prog==='burst'&&SIM.t>0.45&&SIM.t<0.7, hint:'Program → Tone burst, then move the playhead to about 0.5 s.' },
  { title:'6 · Listen', body:`<p>Turn <b>SPEAKER LEVEL</b> up (click the right half of the knob). A2 (M703C) drives LS1, a DC22S speaker. The same amplifier feeds the rear OUTPUT MONITOR pair at +4 dBu.</p>`, check:()=>D.spk>=0.8, hint:'Click the right half of the knob until it reads 8 or more.' },
  { title:'7 · Use the headset', body:`<p>Plug a headset into <b>J1</b>, the NL-114B jack under the sensitivity buttons.</p>`, check:()=>D.headset, hint:'Click the HEADSET jack.' },
  { title:'8 · Switch to B', body:`<p>Press <b>B</b>. Source B is at −10 dBu, so with +4 selected the needle sits 14 dB low. Press <b>−10</b> to bring it back to 0 VU.</p>`, check:()=>D.input==='B'&&D.sens===-10&&D.src.B.lvl===-10, hint:'Press B, then the −10 sensitivity button.' },
  { title:'9 · Find the headroom', body:`<p>Raise Source B until the panel shows <b>CLIP</b>. Then lower the <b>Supply</b> slider below 24 V: the LM317LZ runs out of head-room, the card rail sags and the clip point comes down with it. The Findings tab explains why.</p>`, check:()=>stages().clip, hint:'Drag Source B up towards +8 dBu or more.' },
  { title:'Done', body:`<p>You have used every control on the M405M. The <b>Signal path</b> tab follows the level through each stage, and <b>Schematics</b> has the redrawn circuit next to the original drawings.</p>`, check:()=>true, auto:true },
];
let li=0;
function viewTut(m){
  window[KEY]=false;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — using the M405M (from the drawings; no manual survives)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('The panel', `<div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div>`)}${card('What changed', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#fp').innerHTML=frontSVG(SIM.t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearHTML(); const pw=m.querySelector('#pw'); if(pw) pw.onclick=()=>A.power();
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{ li=+x.dataset.i; draw(); });
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="st">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#st').onclick=()=>{ reset(); D.power=false; D.log.length=0; li=0; SIM.refresh(); }; };
  SIM.on('time', draw);
}
function viewSecond(m){
  window[KEY]=false;
  m.innerHTML = card('One second in slow motion — what the meter and speaker see', `<canvas id="tl"></canvas>`)
   + `<div class="grid2">${card('Meter face at the playhead', `<div id="mf"></div>`)}${card('Time scales in this product', `<table class="kv small">
     <tr><th>Audio</th><td>${D.src[D.input].f} Hz tone: one cycle = ${SIM.fmtDur(1/D.src[D.input].f)}. Zoom to 1 ms to see U1A/U1B waveforms and clipping.</td></tr>
     <tr><th>VU movement</th><td>Natural frequency ${ (WN/2/Math.PI).toFixed(2)} Hz, damping ${ZETA} → 99 % in ≈ 300 ms ${inf('VU standard')}</td></tr>
     <tr><th>Speaker</th><td>DC22S driven by A2 M703C; no logic, so nothing is clocked.</td></tr>
     <tr><th>Lamp</th><td>DC: three LEDs in M1 from +24 V through R28 330 Ω 3.75 W.</td></tr></table>`)}</div>`;
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    const p=needleAt(SIM.t), a=ang(p)*Math.PI/180; let s=`<svg viewBox="0 0 400 200" style="width:100%;max-width:520px;background:#f4ead0;border-radius:6px">`;
    for (const [db,lab] of [[-20,'-20'],[-10,'-10'],[-7,'-7'],[-5,'-5'],[-3,'-3'],[-2,'-2'],[-1,'-1'],[0,'0'],[1,'+1'],[2,'+2'],[3,'+3']]){ const q=Math.pow(10,db/20), aa=ang(q)*Math.PI/180; const x=200+Math.cos(aa)*560-0, y=600-Math.sin(aa)*560; s+=`<line x1="${200+Math.cos(aa)*520}" y1="${600-Math.sin(aa)*520}" x2="${x}" y2="${y}" stroke="${db>0?'#c22':'#222'}" stroke-width="2"/><text x="${200+Math.cos(aa)*575}" y="${600-Math.sin(aa)*575}" font-size="13" text-anchor="middle" fill="${db>0?'#c22':'#222'}">${lab}</text>`; }
    s+=`<line x1="${200+Math.cos(a)*420}" y1="${600-Math.sin(a)*420}" x2="${200+Math.cos(a)*590}" y2="${600-Math.sin(a)*590}" stroke="#111" stroke-width="3"/><text x="10" y="190" font-size="12" fill="#333">${SIM.fmtT(SIM.t)} · ${(p*100).toFixed(1)} %</text></svg>`;
    m.querySelector('#mf').innerHTML=s; });
}
const BLOCKS = {
  tb:{x:10,y:40,w:140,h:70,t:'TB1 inputs A / B',s:['balanced, 1-2-3 / 4-5-6'],d:'Rear terminal strip. A on pins 1/2 (GND 3), B on 4/5 (GND 6). Twisted pairs run to SW1.'},
  sw1:{x:190,y:40,w:120,h:70,t:'SW1 A/B',s:['interlocked pair'],d:'Two mechanically interlocked push buttons (405S016 note 1) pick which pair reaches A1 P1-7/8.'},
  a1:{x:350,y:20,w:170,h:110,t:'A1 SA14-292B',s:['U1A LM833 diff. amp','strap → R6–R10','U1B ×2.14, R22 3K9','U2 LM317LZ 21.6 V'],d:'The standard WBS VU meter amplifier card. U1A is a balanced input stage whose gain resistor is chosen by the sensitivity strap; U1B (47K/22K) drives the meter through R22 3K9 and also feeds A2.'},
  sens:{x:350,y:160,w:170,h:60,t:'SW3–SW7',s:['−10 0 +4 +8 +10'],d:'Five interlocked push buttons wired to the A1 strap connector (405S016 strap detail), replacing the soldered strap of the stand-alone card.'},
  m1:{x:570,y:10,w:130,h:60,t:'M1 544WL',s:['VU meter + 3 LEDs'],d:'Illuminated VU meter. Its lamp is three LEDs in series, fed from +24 V through R28 330 Ω 3.75 W on A1 (P2-1/P2-2).'},
  a2:{x:570,y:100,w:130,h:70,t:'A2 M703C',s:['monitor amplifier','R1 10-073 level'],d:'Monitor amplifier module. Input from A1 P1-3/4 on pins 3/4/5, level pot on 8/U/T,V, speaker on 21/Y, headset and output-monitor pair on X/W.'},
  ls:{x:740,y:80,w:110,h:50,t:'LS1 DC22S',s:['speaker'],d:'Front-panel speaker behind the honeycomb grille.'},
  hs:{x:740,y:150,w:110,h:60,t:'J1 / TB1 7-8',s:['headset NL-114B','OUTPUT MONITOR +4'],d:'The headset jack and the rear output-monitor pair share A2 X/W.'},
  pw:{x:10,y:180,w:140,h:60,t:'J2 +24 V DC',s:['F1 AGC 0.75 A'],d:'External 24 V supply in on J2 pin 1 (GND pin 5).'},
};
const WIRES=[['tb','sw1'],['sw1','a1'],['sens','a1'],['a1','m1'],['a1','a2'],['a2','ls'],['a2','hs'],['pw','a1'],['pw','a2']];
let bsel='a1';
function viewBlock(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 860 250" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.2}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }
/* redrawn sheets */
const R=(x,y,v,lab,vert)=>vert? `<path d="M${x} ${y} v8 l-5 3 l10 5 l-10 5 l10 5 l-10 5 l5 3 v8" fill="none" stroke="var(--ink)"/><text x="${x+9}" y="${y+24}" font-size="10" fill="var(--ink)">${lab} ${v}</text>` : `<path d="M${x} ${y} h8 l3 -5 l5 10 l5 -10 l5 10 l5 -10 l3 5 h8" fill="none" stroke="var(--ink)"/><text x="${x+8}" y="${y-8}" font-size="10" fill="var(--ink)">${lab} ${v}</text>`;
const OP=(x,y,lab)=>`<path d="M${x} ${y-24} v48 l44 -24 z" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+4}" y="${y-8}" font-size="11" fill="var(--ink)">−</text><text x="${x+4}" y="${y+14}" font-size="11" fill="var(--ink)">+</text><text x="${x+8}" y="${y+40}" font-size="10.5" fill="var(--ink2)">${lab}</text>`;
const W_=(d)=>`<path d="${d}" fill="none" stroke="var(--ink)"/>`, N=(x,y,t,a)=>`<text x="${x}" y="${y}" font-size="10.5" fill="var(--accent2)" ${a?'text-anchor="'+a+'"':''}>${t}</text>`;
const SHEETS=[
  {name:'1 · M405M wiring (405S016)', note:'Redrawn from 405S016.DWG (B 405-02-016 iss 1). Part numbers are copied from the drawing.', svg:()=>
    `<rect x="30" y="60" width="90" height="140" fill="none" stroke="var(--ink)"/>${N(40,80,'TB1-1 A+')}${N(40,98,'TB1-2 A−')}${N(40,116,'TB1-3 GND')}${N(40,140,'TB1-4 B+')}${N(40,158,'TB1-5 B−')}${N(40,176,'TB1-6 GND')}
     <rect x="170" y="70" width="70" height="110" fill="none" stroke="var(--ink)" stroke-dasharray="4 3"/><text x="178" y="64" font-size="11" fill="var(--ink)">SW1 A/B</text>${W_('M120 77 H170 M120 95 H170 M120 137 H170 M120 155 H170 M240 100 H300 M240 120 H300')}
     <rect x="300" y="60" width="170" height="150" fill="var(--panel2)" stroke="var(--ink)"/><text x="385" y="90" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">A1 SA14-292B</text><text x="385" y="106" text-anchor="middle" font-size="10" fill="var(--ink2)">VU METER AMPLIFIER</text>
     ${N(305,104,'P1-7')}${N(305,124,'P1-8')}${N(305,200,'P1-5 shield')}${N(430,150,'P1-3','end')}${N(430,168,'P1-4','end')}${N(330,226,'P1-1,2 / 6,9,10')}
     <rect x="330" y="10" width="110" height="34" fill="none" stroke="var(--ink)"/><text x="385" y="31" text-anchor="middle" font-size="11" fill="var(--ink)">M1 544WL (P2-1/2)</text>${W_('M385 44 V60')}
     <rect x="520" y="110" width="150" height="120" fill="var(--panel2)" stroke="var(--ink)"/><text x="595" y="140" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">A2 M703C</text>${W_('M470 150 H520 M470 168 H520')}${N(525,162,'3')}${N(525,180,'4/5')}
     ${R(470,250,'WBS 10-073','R1')}${W_('M520 210 H500 V250')}${N(525,214,'8 · U · T,V')}
     ${W_('M670 130 H700 M670 150 H700 M670 200 H700')}<text x="704" y="134" font-size="10.5" fill="var(--ink)">X/W → J1 NL-114B HEADSET</text><text x="704" y="154" font-size="10.5" fill="var(--ink)">X/W → TB1-7/8 MON. OUT +4</text><text x="704" y="204" font-size="10.5" fill="var(--ink)">21,Y → LS1 DC22S</text>
     <text x="30" y="290" font-size="12" fill="var(--ink)">J2 91206-021: pin 1 → F1 AGC 0.75 → +24 V DC (A1 P1-1,2 · A2 1,13,P) · pin 5 → GND (A1 P1-6,9,10 · A2 10,22,Z) · TB1-12 chassis</text>
     <text x="30" y="320" font-size="12" fill="var(--ink)">Sensitivity strap connector ← SW3 −10 · SW4 0 · SW5 +4 · SW6 +8 · SW7 +10 (interlocked). Last components used: A2, F1, J2, LS1, M1, R1, SW7, TB1.</text>` },
  {name:'2 · SA14-292B input & meter drive', note:'Redrawn from SA14292B.DWG (B 14-292-02-003 iss 1). Values are as drawn; the gain arithmetic in the Signal-path tab is inferred from them.', svg:()=>
    `${N(20,80,'P1-7 VU+')}${N(20,180,'P1-8 VU−')}${W_('M80 76 H120 M80 176 H120')}<text x="96" y="66" font-size="10" fill="var(--ink)">C1 10/25</text><text x="96" y="196" font-size="10" fill="var(--ink)">C2 10/25</text>
     ${R(120,76,'15K','R3')}${R(120,176,'15K','R4')}${W_('M170 76 H260 M170 176 H200 V140 H260')}${R(200,76,'15K','R13')}
     ${R(150,240,'270K','R5')}${R(150,40,'47K','R1/R2')}
     ${OP(260,110,'U1A LM833N')}${W_('M304 110 H360')}${R(240,20,'43K + R17 50K CAL','R16')}${W_('M240 20 V86 M318 20 V110')}
     <text x="20" y="300" font-size="11" fill="var(--ink)">Sensitivity strap (from the − node): R6 6K49 1% “0” · R7 3K57 1% “+4” · R8 14K3 1% “+8” · R9 2K43 1% “+8” · R10 1K58 1% “+10 / −10”</text>
     ${R(360,110,'22K','R18')}${OP(440,110,'U1B LM833N')}${R(420,40,'47K','R20')}${W_('M420 40 V86 M484 40 V110 M484 110 H540')}<text x="380" y="160" font-size="10" fill="var(--ink)">R19 200 + C5 470p</text>
     ${R(540,110,'3K9','R22')}${W_('M590 110 H660')}<text x="665" y="114" font-size="11" fill="var(--ink)">METER DRIVE → M1</text><text x="560" y="150" font-size="10" fill="var(--ink)">C6 10/25 · R21 15K → P1-3 EXTERNAL METER DRIVE · P1-4/6 COMMON</text>
     <text x="20" y="340" font-size="11" fill="var(--ink)">Lamp: P1-2 (+25 V or −25 V) → R28 330 Ω 3.75 W → P2-1 → VU lamps → P2-2 → P1-10 COMMON</text>` },
  {name:'3 · SA14-292B supply', note:'Redrawn from the supply section of SA14292B.DWG. V = 1.25 × (1 + R24/R25) is the standard LM317 equation (inferred, not on the drawing).', svg:()=>
    `${N(20,100,'P1-1 +24…+35 V')}${W_('M110 96 H160')}<text x="120" y="86" font-size="10" fill="var(--ink)">CR1 1N4003</text><rect x="200" y="70" width="120" height="60" fill="var(--panel2)" stroke="var(--ink)"/><text x="260" y="104" text-anchor="middle" font-size="12" fill="var(--ink)">U2 LM317LZ</text>${W_('M160 96 H200 M320 96 H560')}
     ${R(320,96,'240','R25')}${R(260,180,'3K9 (R23 470K)','R24')}${W_('M260 130 V180')}${R(470,96,'22K','R26',true)}${R(470,150,'24K','R27',true)}
     ${N(570,100,'+22 V ('+VREG.toFixed(2)+' V)')}${W_('M470 150 H560')}${N(570,154,'+11 V ('+VMID.toFixed(2)+' V)')}<text x="20" y="260" font-size="11" fill="var(--ink)">C7 22/25 input · C8 10/25 adj · C9 22/25 mid-rail · P1-9 SUPPLY COMMON</text>` },
];
let si=0, orig=false;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematics — redrawn (not the original CAD) · originals alongside', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===si&&!orig?'on':''}" data-i="${k}">${s.name}</button>`).join('')+`<button data-o="1" class="${orig?'on':''}">Original drawings (DWG → SVG)</button>`;
    m.querySelectorAll('#tb button').forEach(b=>b.onclick=()=>{ if(b.dataset.o){orig=true;} else {orig=false; si=+b.dataset.i;} draw(); });
    if (orig){ m.querySelector('#sh').innerHTML=`<div style="background:#fff;border-radius:8px;padding:6px"><img src="${ASSET}m405m-sch-405S016.svg" style="width:100%" alt="405S016"><img src="${ASSET}m405m-sch-SA14292B.svg" style="width:100%" alt="SA14292B"></div>`; m.querySelector('#sn').textContent='405S016.DWG and SA14292B.DWG converted to SVG (QCAD dwg2dwg → DXF → ezdxf). Geometry and text are as drawn in 1995.'; return; }
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 360" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[si].svg()}<text x="850" y="352" text-anchor="end" font-size="10" fill="var(--ink2)">M405M · sheet ${si+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[si].note; };
  draw(); }
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<p class="small muted">The M405M has no software. This tab shows the signal path stage by stage, live, and how each switch changes it.</p><div class="grid2">${card('Signal path, stage by stage (live)', `<div id="sp"></div>`)}${card('Switch logic', `<div id="sw"></div>`)}</div>`
   + card('Levels through the chain at every sensitivity setting', `<div id="tbl"></div>`);
  SIM.on('time', ()=>{ const s=stages(), stg=[['Input '+D.input, s.inL.toFixed(1)+' dBu','TB1 balanced'],['SW1 → A1 P1-7/8', s.inL.toFixed(1)+' dBu','C1/C2 10 µF coupling'],['U1A (strap '+STRAP[D.sens].split(' →')[0]+')', s.u1a.toFixed(1)+' dBu', 'gain '+s.g1.toFixed(1)+' dB '+inf('topology')],['U1B 47K/22K', s.u1b.toFixed(1)+' dBu','+6.6 dB'],['R22 3K9 → M1', s.vu.toFixed(1)+' VU','0 VU = +4 dBu '+inf('VU standard')],['A2 M703C → LS1', s.spkW.toFixed(2)+' W', 'R1 '+(s.spkAtt<-90?'off':s.spkAtt.toFixed(1)+' dB')]];
    let y=20, t=`<svg viewBox="0 0 520 ${stg.length*46+20}" style="width:100%">`; stg.forEach((r,i)=>{ const bad=s.clip&&(i===2||i===3); t+=`<rect x="10" y="${y}" width="500" height="36" rx="6" fill="${bad?'color-mix(in srgb,var(--bad) 20%,transparent)':'var(--panel2)'}" stroke="var(--line)"/><text x="20" y="${y+16}" font-size="12" font-weight="700" fill="var(--ink)">${r[0]}</text><text x="20" y="${y+30}" font-size="10.5" fill="var(--ink2)">${r[2].replace(/<[^>]+>/g,'')}</text><text x="500" y="${y+23}" text-anchor="end" font-size="13" font-family="var(--mono)" fill="var(--ink)">${r[1]}</text>`; y+=46; });
    m.querySelector('#sp').innerHTML=t+'</svg>';
    m.querySelector('#sw').innerHTML=`<svg viewBox="0 0 520 170" style="width:100%">${SENS.map((v,i)=>`<g><rect x="${14+i*100}" y="20" width="84" height="44" rx="6" fill="${D.sens===v?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${56+i*100}" y="40" text-anchor="middle" font-size="12" fill="${D.sens===v?'#fff':'var(--ink)'}">${SW_OF[v]}</text><text x="${56+i*100}" y="56" text-anchor="middle" font-size="11" fill="${D.sens===v?'#fff':'var(--ink2)'}">${v>0?'+':''}${v} dBu</text></g>`).join('')}
      ${['A','B'].map((k,i)=>`<rect x="${14+i*100}" y="100" width="84" height="44" rx="6" fill="${D.input===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${56+i*100}" y="127" text-anchor="middle" font-size="12" fill="${D.input===k?'#fff':'var(--ink)'}">SW1 ${k}</text>`).join('')}
      <text x="230" y="118" font-size="11" fill="var(--ink2)">Both banks are mechanical interlocks:</text><text x="230" y="134" font-size="11" fill="var(--ink2)">pressing one button releases the others.</text></svg>`;
    m.querySelector('#tbl').innerHTML=`<table class="kv"><tr><th>Sensitivity</th><th>U1A gain</th><th>Tone that reads 0 VU</th><th>Clip point (input)</th></tr>${SENS.map(v=>{ const sv=D.sens; D.sens=v; const z=stages(); D.sens=sv; return `<tr><td>${v>0?'+':''}${v} dBu</td><td class="mono">${z.g1.toFixed(1)} dB</td><td class="mono">${v} dBu</td><td class="mono">${(v+z.clipDbu-dBu(VU_REF)).toFixed(1)} dBu</td></tr>`; }).join('')}</table><p class="small muted">Clip point assumes LM833 swing to 1.5 V from each rail of the ${s.r.vreg.toFixed(2)} V supply ${inf('LM833 data, not in archive')}.</p>`; });
}
function viewNotes(m){ window[KEY]=false;
  m.innerHTML=card('Findings — what the M405M folder is up to', `<ol>
   <li><b>The “405S016” file is the M405M schematic.</b> The folder summary calls it a sheet shared with the M405S. Its title block reads “M405M VU MONITOR SCHEMATIC”, B 405-02-016 iss 1. The name is WBS's drawing-number shorthand (405 / S = schematic / 016), not an M405S file.</li>
   <li><b>The 24 V supply starves the card regulator.</b> SA14292B.DWG asks for “SUPPLY VOLTAGE +24V TO +35V DC”. CR1 (1N4003) and an LM317LZ set to 1.25 × (1 + 3K9/240) = 21.56 V leave only about 1.3 V of headroom at 24 V. That is less than the LM317L's drop-out (about 1.7 V ${inf('LM317L data')}), so at exactly 24 V the regulator is right at the edge: any sag in the external supply pulls the “+22 V” rail (and the clip point) down with it. Try the Supply slider: below about 24 V the rail follows the input. The rail is ${rail().vreg.toFixed(2)} V at the current setting.</li>
   <li><b>Two straps are both labelled “+8”.</b> On SA14292B the strap pads read +8, +8, +4, 0 and then +10 / −10 for R10. R8 (14K3) and R9 (2K43) are both marked +8, so one label is probably a leftover. The M405M avoids the question: SW6 (“+8 dBu”) is wired to one pad on 405S016's strap detail.</li>
   <li><b>The lamp resistor is over-rated.</b> R28 is 330 Ω 3.75 W in series with three LEDs (M1 544WL lamps on 405S016). At 24 V that is about ${((24-6.3)/330*1000).toFixed(0)} mA and ${((24-6.3)**2/330).toFixed(2)} W ${inf('LED Vf 2.1 V')}. The 3.75 W part dates from incandescent meter lamps (the card note reads “LAMP RESISTOR”, “+25V or −25V”).</li>
   <li><b>The M405M is a standard card plus a panel.</b> A1 is the stock SA14-292B VU amplifier and A2 an M703C monitor amp module. The M405M drawings only add the panel, the interlocked switch banks and the wiring. “LAST COMPONENTS USED: A2, F1, J2, LS1, M1, R1, SW7, TB1” confirms how small the panel-level BOM was.</li>
   <li><b>M405M.DWG is drawn at 0.3 scale.</b> The 19.000″ panel measures 5.694 drawing units, and the dimension text carries the true values. The plugin rescales the converted front view to true inches.</li>
   <li><b>The folder was purged in 1995.</b> README.TXT: “THIS DIRECTORY WAS PURGED LAST ON JUNE 8, 1995”. Only four drawings survive: no manual, BOM or M703C data. The speaker amplifier and headset behaviour in this model are therefore ${inf('')}.</li></ol>`)
   + card('Assumptions in this model', `<ul class="small"><li>0 VU = +4 dBu at the meter drive behind R22 3K9 (the standard 3.6 kΩ VU build-out) ${inf('VU convention')}.</li><li>U1A gain is set so the chosen sensitivity reads 0 VU; the exact strap network is not traced ${inf('SA14292B layout')}.</li><li>VU ballistics: 2nd order, ζ = ${ZETA}, f<sub>n</sub> = ${(WN/2/Math.PI).toFixed(2)} Hz ${inf('IEC 60268-17')}.</li><li>M703C output power and the R1 taper are illustrative ${inf('no M703C data')}.</li><li>The headset does not mute the speaker ${inf('405S016 shows no switching contact')}.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>#M400 #SERIES - Meter Panels/XXX - M405M - #OBSOLETE #Archive/M405M.DWG · 405S016.DWG · SA14292B.DWG · README.TXT</li><li>…/XXX - M405S - #OBSOLETE #Archive/M405S.WP6 (family: 24 VDC, +4 dBu)</li><li>assets: m405m-front.svg, m405m-sch-405S016.svg, m405m-sch-SA14292B.svg</li></ul>`);
}

SIM.register({
  id:'m405m', product:'M405M', name:'M405M · VU monitor panel, 2RU (1995|28)', year:1995,
  family:'Obsolete products', folder:'#M400 #SERIES - Meter Panels/XXX - M405M - #OBSOLETE #Archive',
  summary:'A 2RU rack panel with one illuminated VU meter, A/B input selection, a five-step input-sensitivity bank and a speaker/headset monitor amplifier. Inside are a stock SA14-292B VU-meter amplifier card and an M703C monitor amp, fed from 24 V DC.',
  highlights:['Front panel drawn from M405M.DWG, to scale','VU needle ballistics frame by frame','SA14-292B gain and headroom from real resistor values','Interlocked switch banks','LM317LZ drop-out finding'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1},{label:'1 tone cycle',period:()=>1/D.src[D.input].f}],
  zooms:[[1,'1 s (whole second)'],[0.4,'400 ms (VU rise)'],[0.05,'50 ms'],[0.005,'5 ms'],[0.002,'2 ms (tone cycles)']],
  defaultZoom:0,
  init(){ KEYC=''; },
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: using the M405M',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Signal path',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
